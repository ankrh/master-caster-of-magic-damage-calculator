'use strict';

// Preset vacuity sweep — the feature-ablation harness for Calculator/BACKLOG.md, F61.
//
// Why it exists: a green PRESETS suite proves the expectations still hold, not that any preset
// still exercises the rule its name claims. Calculator/CLAUDE.md, *Presets* states the real
// standard — "prove the expected result changes when the feature is removed; otherwise the preset
// is not a regression test" — and nothing enforced it. This runs that control for every preset:
// remove one configured feature at a time, re-measure, and record whether the number moved.
//
// It drives the browser, because Calculator/CLAUDE.md fixes runTests() as the only sanctioned way
// to evaluate a preset: applyPreset() drives the real controls and the rendered averages are read
// back out, so the DOM and calcKey layers are inside the measurement. Ablated variants are
// registered under one throwaway PRESETS key and applied through that same path, so an ablation
// run and a suite run differ only in the fixture. Node never reconstructs the calculation.
//
// Server and browser configuration come from playwright.config.js so there is one home for both.
//
// Usage:
//   node tools/preset_vacuity_sweep.js [--out report.json] [--only <substring>] [--limit N]
//                                      [--structural-only] [--no-cap-lift]
//
// The exit code is 0 for a completed sweep; findings are reported, not asserted. This is a
// diagnostic sweep, not a suite: it is deliberately not wired into `npm test`.

const { spawn } = require('child_process');
const fs = require('fs');
const { chromium } = require('@playwright/test');
const playwrightConfig = require('../playwright.config.js');
const { loadPresetContext } = require('./calculator_sources');
const { evalInContext } = require('./unit_checks/assertions');

const BASE_URL = playwrightConfig.use.baseURL;

// --- Shared vocabulary -------------------------------------------------------------------
// camelCase preset keys are the only machine-readable statement of what a preset claims to test,
// so the sweep binds a feature to a preset by tokenising both and looking for the feature's tokens
// as a contiguous run inside the key's. `fireImmunityAfterArmorPiercing` names `fireImmunity` and
// `armorPiercing`; it does not name `illusion`.
function camelTokens(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function containsRun(haystack, needle) {
  if (!needle.length || needle.length > haystack.length) return false;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    let hit = true;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] !== needle[j]) { hit = false; break; }
    }
    if (hit) return true;
  }
  return false;
}

// A preset whose claim is an exclusion ("Fire Immunity does NOT apply to thrown") is expected to be
// ablation-inert: removing the ability changes nothing, and that is the assertion. The sweep cannot
// tell such a preset from a broken one by arithmetic alone, so it separates them by wording and
// reports the two buckets apart instead of pretending the distinction is measured.
const NEGATION_KEY_TOKENS = new Set([
  'no', 'not', 'never', 'none', 'noop', 'unaffected', 'unchanged', 'excludes', 'without',
  'ignores', 'ignored', 'blocks', 'blocked', 'negates', 'immune', 'exempt', 'skips',
]);
const NEGATION_DESC_PATTERNS = [
  /\bdoes\s+not\b/i, /\bno\s+effect\b/i, /\bnot\s+applied\b/i, /\bunchanged\b/i,
  /\bunaffected\b/i, /\bno\s+bonus\b/i, /\bnever\b/i, /\bnot\s+affected\b/i,
];

function looksNegative(key, desc) {
  if (camelTokens(key).some(token => NEGATION_KEY_TOKENS.has(token))) return true;
  return NEGATION_DESC_PATTERNS.some(re => re.test(desc || ''));
}

// --- Structural detectors (no browser) ---------------------------------------------------
// Two vacuity modes leave a mark in the fixture data itself, so they are cheaper to read than to
// measure, and they name the reason where the ablation run only reports "inert".

// Mode 4's group-level symptom. A version-difference subgroup exists to show that two engines
// answer differently; if every member expects the same pair of numbers, the group demonstrates
// nothing about versions whatever the arithmetic does.
function versionDifferenceGroups(presets, tree) {
  const findings = [];
  for (const group of tree) {
    if (!/version differ/i.test(group.name || '')) continue;
    for (const sub of group.subs || []) {
      const members = (sub.keys || []).filter(key => presets[key] && presets[key].expected);
      if (members.length < 2) continue;
      const signature = key => {
        const e = presets[key].expected;
        return `${e.dmgToA == null ? 'null' : e.dmgToA}/${e.dmgToB == null ? 'null' : e.dmgToB}`;
      };
      const distinct = new Set(members.map(signature));
      if (distinct.size === 1) {
        findings.push({ group: group.name, sub: sub.name, keys: members, expectation: [...distinct][0] });
      }
    }
  }
  return findings;
}

// A roster-selected side takes its abilities from the roster; applyPreset reapplies only the
// enchantment-source entries (`applyPresetEnchantments`). Any other ability the preset lists for
// that side is written and then overwritten, so it never reaches the calculation at all.
function rosterShadowedAbilities(presets, enchantmentKeys) {
  const findings = [];
  for (const [key, preset] of Object.entries(presets)) {
    for (const side of ['a', 'b']) {
      if (!preset[`${side}UnitName`]) continue;
      const abilities = (preset[side] && preset[side].abilities) || {};
      const shadowed = Object.keys(abilities).filter(name => !enchantmentKeys.has(name));
      if (shadowed.length) findings.push({ key, side, unit: preset[`${side}UnitName`], shadowed });
    }
  }
  return findings;
}

// Mode 2's structural symptom: an expectation that has reached the defender's whole hit-point
// pool cannot distinguish the true total from any larger one. This is a filter for reading, not a
// verdict — the cap-lift pass below is what measures whether the clip hides the rule.
function expectationsAtHpCap(presets) {
  const findings = [];
  for (const [key, preset] of Object.entries(presets)) {
    if (!preset.expected) continue;
    for (const [side, other] of [['b', 'dmgToB'], ['a', 'dmgToA']]) {
      const unit = preset[side];
      if (!unit || preset[`${side}UnitName`]) continue;      // roster HP is not in the fixture
      const figs = unit.figs == null ? 1 : Number(unit.figs);
      const hp = unit.hp == null ? 1 : Number(unit.hp);
      const pool = figs * hp;
      const expected = preset.expected[other];
      if (expected != null && pool > 0 && expected >= pool - 1e-9) {
        findings.push({ key, side, expected, pool });
      }
    }
  }
  return findings;
}

// --- The in-page ablation harness --------------------------------------------------------
// Everything below the `page.evaluate` boundary runs in the calculator page and may only use page
// globals. It is installed once and then called per preset so progress can be streamed and one
// slow preset cannot time out the whole run.
function installSweep() {
  const PROBE_KEY = '__vacuitySweepProbe__';

  // Defaults a feature is ablated *to*. A value equal to its default is not a feature the preset
  // configured, so it is not a candidate.
  const TOP_DEFAULTS = {
    trueLight: false, darkness: false, wallOfFire: false, warpReality: false,
    chaosConjunction: false, hurricane: false, poxHost: false,
    chaosSurge: 0, nodeAura: 'none', enchLightDark: 'none', cityWalls: 'none',
    eternalNight: undefined,
  };
  const UNIT_FIELD_DEFAULTS = {
    weapon: 'normal', armor: 'normal', level: 'normal', cityWalls: 'none',
    unitType: 'normal', specialUnit: 'none', race: '',
  };
  const IDENTITY_DEFAULTS = { isHero: false, baseFantastic: false, baseRace: '', specialUnit: 'none' };

  const uiDefs = abilityUiDefs();
  const abilityLabels = {};
  const enchantmentKeys = new Set();
  for (const def of uiDefs) {
    if (!abilityLabels[def.key]) abilityLabels[def.key] = def.label || '';
    if (def.source === 'enchantment') enchantmentKeys.add(def.key);
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }

  function resolveVersion(key) {
    return PRESETS[key].version || PRESET_VERSIONS[key] || document.getElementById('gameVersion').value;
  }

  function readAverages() {
    const panels = document.querySelectorAll('.dist-header .avg');
    if (panels.length < 2) throw new Error('vacuity sweep: the result panels are missing');
    return [parseFloat(panels[0].textContent), parseFloat(panels[1].textContent)];
  }

  // Every measurement goes through applyPreset, the same entry point runTests uses.
  function measureKey(key) {
    applyPreset(key);
    return readAverages();
  }

  function measureFixture(fixture) {
    PRESETS[PROBE_KEY] = fixture;
    try {
      applyPreset(PROBE_KEY);
      return readAverages();
    } finally {
      delete PRESETS[PROBE_KEY];
    }
  }

  function moved(before, after) {
    const delta = Math.max(Math.abs(before[0] - after[0]), Math.abs(before[1] - after[1]));
    return { moved: delta > 0.0005, delta: +delta.toFixed(4) };
  }

  // The features a preset configures, each with the terms its preset key could name it by.
  function candidates(key) {
    const preset = PRESETS[key];
    const list = [];
    for (const side of ['a', 'b']) {
      const unit = preset[side];
      if (!unit) continue;
      const roster = !!preset[`${side}UnitName`];
      for (const name of Object.keys(unit.abilities || {})) {
        list.push({
          id: `${side}.ability.${name}`, kind: 'ability', side, name,
          terms: [name, abilityLabels[name] || ''].filter(Boolean),
          // A roster side reapplies only enchantment-source entries, so anything else is inert
          // before a single number is computed.
          rosterShadowed: roster && !enchantmentKeys.has(name),
        });
      }
      for (const field of Object.keys(UNIT_FIELD_DEFAULTS)) {
        const value = unit[field];
        if (value === undefined || value === UNIT_FIELD_DEFAULTS[field]) continue;
        list.push({
          id: `${side}.${field}=${value}`, kind: 'unitField', side, field, value,
          terms: [field, String(value)],
        });
      }
      const identity = unit.identity;
      if (identity && typeof identity === 'object') {
        for (const field of Object.keys(IDENTITY_DEFAULTS)) {
          const value = identity[field];
          if (value === undefined || value === IDENTITY_DEFAULTS[field]) continue;
          list.push({
            id: `${side}.identity.${field}=${value}`, kind: 'identity', side, field, value,
            terms: [field, String(value), value === true ? field : ''].filter(Boolean),
          });
        }
      }
    }
    for (const field of Object.keys(TOP_DEFAULTS)) {
      const value = preset[field];
      if (value === undefined || value === null || value === TOP_DEFAULTS[field]) continue;
      if (field === 'chaosSurge' && !Number(value)) continue;
      list.push({ id: `combat.${field}`, kind: 'combat', field, value, terms: [field, String(value)] });
    }
    return list;
  }

  function ablate(preset, candidate) {
    const fixture = clone(preset);
    if (candidate.kind === 'ability') {
      delete fixture[candidate.side].abilities[candidate.name];
    } else if (candidate.kind === 'unitField') {
      fixture[candidate.side][candidate.field] = UNIT_FIELD_DEFAULTS[candidate.field];
    } else if (candidate.kind === 'identity') {
      fixture[candidate.side].identity[candidate.field] = IDENTITY_DEFAULTS[candidate.field];
    } else {
      delete fixture[candidate.field];
    }
    return fixture;
  }

  // Mode 2's control. Raising both hit-point pools removes the clip without touching any rule; if
  // an inert ablation moves the number once the pool is deep enough to hold the difference, the
  // cap — not the rule — was what made the preset look settled.
  const CAP_LIFT_HP = 900;
  function liftCap(preset) {
    const fixture = clone(preset);
    for (const side of ['a', 'b']) {
      if (!fixture[side] || preset[`${side}UnitName`]) continue;
      fixture[side].hp = CAP_LIFT_HP;
    }
    return fixture;
  }
  function capLiftable(preset) {
    return ['a', 'b'].some(side => preset[side] && !preset[`${side}UnitName`]);
  }

  function sweepPreset(key, options) {
    const preset = PRESETS[key];
    const fixture = clone(preset);
    fixture.version = resolveVersion(key);
    const baseline = measureFixture(fixture);
    const list = candidates(key);
    const results = [];
    for (const candidate of list) {
      const after = measureFixture(ablate(fixture, candidate));
      const verdict = moved(baseline, after);
      results.push({
        ...candidate,
        before: baseline, after, live: verdict.moved, delta: verdict.delta,
      });
    }
    // Mode 5's control, for the presets whose claim is an *ordering*. Ablation cannot remove an
    // ordering, but it can measure whether one could ever be observed: with both effects on, each
    // alone, and neither, the interaction term is
    //   both - onlyA - onlyB + neither.
    // Zero means the two effects compose additively at this measurement point, so no ordering
    // between them changes the number and the preset's claim has no arithmetic consequence — the
    // disjoint-write-set argument the backlog makes for `trueLightSkipsExplosiveChannelsWarlord`,
    // measured instead of read. Non-zero means they interact and the ordering is observable.
    // This is a finding generator, not a proof: a zero interaction at one operating point does not
    // prove the write sets are disjoint everywhere.
    let interactions = null;
    if (options && options.interactions && list.length >= 2 && list.length <= 4) {
      interactions = [];
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const neither = measureFixture(ablate(ablate(fixture, list[i]), list[j]));
          const onlyB = results[i].after;   // list[i] removed
          const onlyA = results[j].after;   // list[j] removed
          const term = [0, 1].map(side =>
            +(baseline[side] - onlyA[side] - onlyB[side] + neither[side]).toFixed(4));
          interactions.push({
            pair: [list[i].id, list[j].id], both: baseline, onlyA, onlyB, neither, term,
            additive: Math.max(Math.abs(term[0]), Math.abs(term[1])) < 0.0005,
          });
        }
      }
    }

    let capLift = null;
    const inert = results.filter(r => !r.live);
    if (options && options.capLift && inert.length && capLiftable(preset)) {
      const lifted = liftCap(fixture);
      const liftedBaseline = measureFixture(lifted);
      capLift = { baseline: liftedBaseline, freed: [] };
      for (const candidate of inert) {
        const after = measureFixture(ablate(lifted, candidate));
        if (moved(liftedBaseline, after).moved) {
          capLift.freed.push({ id: candidate.id, before: liftedBaseline, after });
        }
      }
    }
    return { key, baseline, candidates: results, capLift, interactions };
  }

  // Pass 1 reproduces runTests exactly: applyPreset(key) in PRESETS order, no probe fixtures in
  // between, so a disagreement with `expected` here is a suite failure and not a sweep artefact.
  function measureBaselines(keys) {
    return keys.map(key => ({ key, measured: measureKey(key) }));
  }

  window.__vacuitySweep = { sweepPreset, measureBaselines };
  return Object.keys(PRESETS).length;
}

// --- Server and browser ------------------------------------------------------------------
async function serverIsUp() {
  try {
    const res = await fetch(`${BASE_URL}/index.html`);
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await serverIsUp()) return true;
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  return false;
}

async function startServer() {
  if (await serverIsUp()) return null;
  const child = spawn(playwrightConfig.webServer.command, { shell: true, stdio: 'ignore' });
  if (!await waitForServer(playwrightConfig.webServer.timeout || 15000)) {
    child.kill();
    throw new Error(`preset_vacuity_sweep: no server at ${BASE_URL}`);
  }
  return child;
}

// --- Reporting ---------------------------------------------------------------------------
function classify(key, preset, sweep, liveByVersionFeature, version) {
  const keyTokens = camelTokens(key);
  const negative = looksNegative(key, preset.desc);
  const named = [];
  for (const candidate of sweep.candidates) {
    const isNamed = candidate.terms.some(term => containsRun(keyTokens, camelTokens(term)));
    if (isNamed) named.push(candidate);
  }
  const freed = new Set((sweep.capLift ? sweep.capLift.freed : []).map(entry => entry.id));
  const anyLive = sweep.candidates.some(candidate => candidate.live);
  const namedInert = named.filter(candidate => !candidate.live);
  const buckets = [];

  if (!sweep.candidates.length) buckets.push('no-ablatable-feature');
  else if (!anyLive) buckets.push('every-feature-inert');
  if (named.length === 0 && sweep.candidates.length) buckets.push('name-binds-nothing');

  for (const candidate of namedInert) {
    // A feature that never moves a number in *any* preset of this version is not this preset's
    // accident: the version does not implement it, or hides the control that drives it. That is
    // mode 1, and it holds whether the preset's claim is positive or negative.
    const versionDead = !liveByVersionFeature.get(`${version} ${candidate.kind}:${candidate.name || candidate.field}`);
    if (candidate.rosterShadowed) buckets.push(`roster-shadowed:${candidate.id}`);
    else if (freed.has(candidate.id)) buckets.push(`hp-cap-hides:${candidate.id}`);
    else if (versionDead) buckets.push(`version-dead:${candidate.id}`);
    else if (negative) buckets.push(`negative-claim-inert:${candidate.id}`);
    else buckets.push(`named-feature-inert:${candidate.id}`);
  }
  return { key, version, negative, buckets, named: named.map(c => c.id), candidates: sweep.candidates.length };
}

function parseArgs(argv) {
  const options = {
    out: null, only: null, keys: null, limit: 0,
    structuralOnly: false, capLift: true, interactions: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') options.out = argv[++i];
    else if (arg === '--only') options.only = argv[++i];
    else if (arg === '--keys') options.keys = argv[++i].split(',').map(part => part.trim()).filter(Boolean);
    else if (arg === '--interactions') options.interactions = true;
    else if (arg === '--limit') options.limit = Number(argv[++i]);
    else if (arg === '--structural-only') options.structuralOnly = true;
    else if (arg === '--no-cap-lift') options.capLift = false;
    else throw new Error(`preset_vacuity_sweep: unknown argument ${arg}`);
  }
  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  const context = loadPresetContext();
  const presets = evalInContext(context, 'PRESETS');
  const tree = evalInContext(context, 'TEST_TREE');
  const enchantmentDefs = evalInContext(context, 'ENCHANTMENT_DEFS');
  const enchantmentKeys = new Set(enchantmentDefs.map(def => def.key));

  const groupVersion = {};
  for (const group of tree) {
    for (const sub of group.subs || []) {
      for (const key of sub.keys || []) if (group.version) groupVersion[key] = group.version;
    }
  }

  const structural = {
    versionDifferenceGroupsWithOneExpectation: versionDifferenceGroups(presets, tree),
    rosterShadowedAbilities: rosterShadowedAbilities(presets, enchantmentKeys),
    expectationsAtHpCap: expectationsAtHpCap(presets),
  };

  console.log('--- structural detectors ---');
  console.log(`version-difference subgroups whose members share one expectation: ${structural.versionDifferenceGroupsWithOneExpectation.length}`);
  for (const finding of structural.versionDifferenceGroupsWithOneExpectation) {
    console.log(`  ${finding.group} / ${finding.sub}: ${finding.expectation} for ${finding.keys.join(', ')}`);
  }
  console.log(`roster-selected sides carrying non-enchantment abilities: ${structural.rosterShadowedAbilities.length}`);
  for (const finding of structural.rosterShadowedAbilities) {
    console.log(`  ${finding.key} [${finding.side}=${finding.unit}]: ${finding.shadowed.join(', ')}`);
  }
  console.log(`expectations at or above the target's hit-point pool: ${structural.expectationsAtHpCap.length}`);

  if (options.structuralOnly) {
    if (options.out) fs.writeFileSync(options.out, JSON.stringify({ structural }, null, 2));
    return;
  }

  let keys = Object.keys(presets);
  if (options.keys) {
    const missing = options.keys.filter(key => !presets[key]);
    if (missing.length) throw new Error(`preset_vacuity_sweep: no such preset(s) ${missing.join(', ')}`);
    keys = options.keys;
  }
  if (options.only) keys = keys.filter(key => key.includes(options.only));
  if (options.limit) keys = keys.slice(0, options.limit);

  const server = await startServer();
  const browser = await chromium.launch({
    channel: playwrightConfig.use.channel, headless: playwrightConfig.use.headless !== false,
  });
  const consoleErrors = [];
  let report;
  try {
    const page = await browser.newPage();
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => consoleErrors.push(String(error)));
    await page.route('**://plausible.io/**', route =>
      route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
    await page.goto(`${BASE_URL}/index.html`);
    await page.waitForFunction(() => typeof window.collectState === 'function');
    const total = await page.evaluate(installSweep);

    // Pass 1 — the suite's own numbers, measured the way runTests measures them.
    const baselines = await page.evaluate(list => window.__vacuitySweep.measureBaselines(list), keys);
    const baselineMismatches = [];
    for (const entry of baselines) {
      const expected = presets[entry.key].expected || {};
      const errA = expected.dmgToA == null ? 0 : Math.abs(entry.measured[0] - expected.dmgToA);
      const errB = expected.dmgToB == null ? 0 : Math.abs(entry.measured[1] - expected.dmgToB);
      if (!(errA < 0.002 && errB < 0.002)) {
        baselineMismatches.push({ key: entry.key, measured: entry.measured, expected });
      }
    }

    // Pass 2 — one ablation run per configured feature, plus pass 3's cap-lift control for the
    // ones that came back inert.
    const sweeps = [];
    let done = 0;
    for (const key of keys) {
      sweeps.push(await page.evaluate(
        ([presetKey, opts]) => window.__vacuitySweep.sweepPreset(presetKey, opts),
        [key, { capLift: options.capLift, interactions: options.interactions }]));
      if (++done % 100 === 0) process.stderr.write(`  swept ${done}/${keys.length}\n`);
    }

    // A feature is dead in a version when no preset of that version can make it move a number.
    const liveByVersionFeature = new Map();
    for (const sweep of sweeps) {
      const version = presets[sweep.key].version || groupVersion[sweep.key];
      for (const candidate of sweep.candidates) {
        if (!candidate.live) continue;
        liveByVersionFeature.set(`${version} ${candidate.kind}:${candidate.name || candidate.field}`, true);
      }
    }

    const classified = sweeps.map(sweep => classify(
      sweep.key, presets[sweep.key], sweep, liveByVersionFeature,
      presets[sweep.key].version || groupVersion[sweep.key]));

    report = {
      swept: keys.length, totalPresets: total, structural, baselineMismatches,
      findings: classified.filter(entry => entry.buckets.length),
      sweeps,
    };

    const byBucket = new Map();
    for (const entry of report.findings) {
      for (const bucket of entry.buckets) {
        const name = bucket.split(':')[0];
        if (!byBucket.has(name)) byBucket.set(name, []);
        byBucket.get(name).push(`${entry.key} [${entry.version}] ${bucket.slice(name.length + 1)}`.trim());
      }
    }
    console.log('\n--- ablation sweep ---');
    console.log(`presets swept: ${keys.length} of ${total}`);
    console.log(`baseline disagreements with the stored expectation: ${baselineMismatches.length}`);
    for (const mismatch of baselineMismatches) {
      console.log(`  ${mismatch.key}: measured ${mismatch.measured.join('/')} expected ${mismatch.expected.dmgToA}/${mismatch.expected.dmgToB}`);
    }
    for (const [bucket, entries] of [...byBucket].sort((x, y) => y[1].length - x[1].length)) {
      console.log(`\n${bucket}: ${entries.length}`);
      for (const entry of entries) console.log(`  ${entry}`);
    }
    if (options.interactions) {
      const additive = [];
      for (const sweep of sweeps) {
        for (const pair of sweep.interactions || []) {
          if (pair.additive) additive.push(`${sweep.key}: ${pair.pair.join(' + ')} compose additively (interaction 0)`);
        }
      }
      console.log(`\nadditive feature pairs (no ordering between them can move the number): ${additive.length}`);
      for (const entry of additive) console.log(`  ${entry}`);
    }
    if (consoleErrors.length) {
      console.log(`\npage console errors during the sweep: ${consoleErrors.length}`);
      for (const error of consoleErrors.slice(0, 20)) console.log(`  ${error}`);
    }
  } finally {
    await browser.close();
    if (server) server.kill();
  }

  if (options.out && report) fs.writeFileSync(options.out, JSON.stringify(report, null, 2));
}

main().catch(error => {
  console.error(error.stack || String(error));
  process.exit(1);
});
