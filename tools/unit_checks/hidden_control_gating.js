// SPEC.md invariant 4, as a standing check: a control hidden for the active version cannot
// affect the result. `tests/version-gating.spec.js` asserts the UI half; this asserts the
// derivation half, which no suite covered before (F130).
//
// The first half is the derive tier of `tools/hidden_control_leak_sweep.js` — the same hidden
// (calcKey, version) pairs over the same shapes, comparing the derived stat record minus the
// `abilities` echo. The sweep's combat tier stays out of the suite at ~50s; this tier is ~8s.
// The second half adds the one **combat** shape neither sweep builds (F168), for a cost too
// small to measure: it is one exchange per pair rather than the sweep's dozens.
//
// No preset can reach these inputs, because `updateTypeVisibility` clears a version-gated
// control before anything reads it. That is why the regression evidence here is a sweep rather
// than a fixture: a preset asserting one of these would pass before and after any fix.

'use strict';

const vm = require('vm');
const { assert, assertSameKeyList, modernRecordForSharedSlot,
  seedRefusesKeyIn } = require('./assertions');

// Derived-stat leaks that exist today, each with the read that causes it. This list is the
// worklist, not an exemption: an entry leaves when its read is gated, and the check fails if a
// new one appears.
//
// Empty since F130 gated `wraithFormBypassesWI` (`stats.js`), whose single
// `version.startsWith('com')` test covered two keys of different scope — `wraithForm` is
// genuinely all-versions, Ruler of Underworld is Caster.exe only — and so let CoM 1 upgrade a
// normal weapon to magic. Keep it empty: an addition here needs a stated reason.
const KNOWN_DERIVED_LEAKS = [];

// The same worklist for the one **combat** shape below. Empty since F168 deleted the two
// defender-side `spiritLink` reads in `dispelEvilFailProb` and `exorciseFailProb`.
const KNOWN_TOUCH_RIDER_LEAKS = [];

const MAGICAL_RANGED = '@magical';

// The marker a probe returns when `seedNonStatRecordFields` refuses the input outright (F253.1).
const SEED_REFUSAL = '@seedRefusedTheKey';

const SHAPES = [
  { name: 'bare', over: { atk: 6, rtb: 0, rtbType: 'none', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'missile', over: { atk: 6, rtb: 7, rtbType: 'missile', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'boulder', over: { atk: 6, rtb: 6, rtbType: 'boulder', def: 4, res: 6, hp: 4, figs: 4 } },
  { name: 'thrown', over: { atk: 6, rtb: 4, rtbType: 'thrown', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'fire', over: { atk: 6, rtb: 5, rtbType: 'fire', def: 4, res: 6, hp: 4, figs: 4 } },
  { name: 'lightning', over: { atk: 6, rtb: 5, rtbType: 'lightning', def: 4, res: 6, hp: 4, figs: 4 } },
  { name: 'magical', over: { atk: 6, rtb: 8, rtbType: MAGICAL_RANGED, def: 4, res: 6, hp: 4, figs: 2 } },
];

const IDENTITIES = [
  { name: 'normal', over: { unitType: 'normal' } },
  { name: 'fantastic', over: { unitType: 'fantastic' } },
  { name: 'hero', over: { unitType: 'hero' } },
];

const IDENTITY_KEYS = new Set([
  'statTrace', 'identityTrace', 'modifierTraces', 'statExecutionTrace', 'traceOrder',
]);

function digest(value) {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'number' && !Number.isInteger(value)
      ? Number(value.toFixed(6)) : value;
  }
  if (Array.isArray(value)) return value.map(digest);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (IDENTITY_KEYS.has(key)) continue;
    out[key] = digest(value[key]);
  }
  return out;
}

// The sweep's axis is (control, version, identity, shape), so each shape has to be stated in the
// record the version really has: the DOS shared slot, or — for CoM2/Warlord — the same attack on
// the modern record's own channel, with the shared slot kept as the card's projection of it
// (`assertions.js`, `modernRecordForSharedSlot`).
function baseInput(ctx, version, over) {
  const typed = over.rtbType === MAGICAL_RANGED
    ? { ...over, rtbType: version.startsWith('com2') ? 'magic' : 'magic_s' } : over;
  const resolved = version.startsWith('com2')
    ? { ...typed, modernAttacks: modernRecordForSharedSlot(ctx, typed.rtbType, typed.rtb) }
    : typed;
  return {
    prefix: 'a', version, abilities: {}, level: 'normal', weapon: 'normal', armor: 'normal',
    rtbType: 'none', unitType: 'normal', figs: 6, atk: 6, rtb: 0, def: 4, res: 6, hp: 4, dmg: 0,
    toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0, cityWalls: 'none', nodeAura: 'none',
    trueLight: false, darkness: false, enemyEternalNight: false, rangedCheck: false,
    rangedDist: 1, warpReality: false, chaosChannels: 'none',
    ...resolved,
  };
}

function valuesFor(def) {
  if (def.type === 'bool') return [true];
  if (def.type === 'num' || def.type === 'numcheck') return [3];
  if (def.type === 'select' && Array.isArray(def.options)) {
    return def.options.map(option => option[0]).filter(value => value !== 'none' && value !== '');
  }
  return [];
}

function runHiddenControlGatingChecks(ctx) {
  // `abilityVersionGated` (`ability_gating.js`, data-scope="core") is the single home for "does
  // this control exist in this version", and the context already carries it. Re-deriving the rule
  // here would let the two drift.
  const read = expression => vm.runInContext(expression, ctx);
  const versions = read('ENGINE_VERSIONS');
  const deriveUnitStats = read('deriveUnitStats');
  const abilityUiDefs = read('abilityUiDefs');
  const abilityVersionGated = read('abilityVersionGated');
  // A key this version's origin table cannot hear — no row at all (F253.1), or rows every one of
  // which is admitted by a different input key (F253.2) — is refused outright by
  // `seedNonStatRecordFields` rather than erased, so the probe below throws instead of returning a record. That
  // is invariant 4 discharged at the input boundary — the strongest form of "cannot move a number"
  // — and it is counted rather than read as a leak. The expected set is computed off the origin
  // table, so a key that stops being refused, or starts being refused where the table still gives
  // it a row, fails here.
  const refusedBySeed = (calcKey, version) => seedRefusesKeyIn(ctx, calcKey, version);

  const byCalcKey = new Map();
  for (const def of abilityUiDefs()) {
    if (!def || !def.key) continue;
    const calcKey = def.calcKey || def.key;
    if (!byCalcKey.has(calcKey)) byCalcKey.set(calcKey, []);
    byCalcKey.get(calcKey).push(def);
  }

  // The unmodified derivation depends only on (version, identity, shape), not on which key is
  // being probed, so it is computed once per combination rather than once per pair — the same
  // 21 baselines were being recomputed for all 485 pairs.
  const baselines = new Map();
  const found = [];
  const refused = [];
  const expectedRefusals = [];
  let pairs = 0;
  for (const version of versions) {
    for (const [calcKey, defs] of byCalcKey) {
      // A calcKey counts as hidden only when every control naming it is gated: several controls
      // map to one key, and a key one visible control owns is a real input.
      if (!defs.every(def => abilityVersionGated(def, version))) continue;
      const values = [];
      for (const def of defs) {
        for (const value of valuesFor(def)) {
          if (!values.some(v => JSON.stringify(v) === JSON.stringify(value))) values.push(value);
        }
      }
      if (!values.length) continue;
      pairs += 1;
      if (refusedBySeed(calcKey, version)) expectedRefusals.push(`${version}|${calcKey}`);

      let leaks = false;
      let seedRefused = false;
      for (const identity of IDENTITIES) {
        for (const shape of SHAPES) {
          if (leaks) break;
          const over = { ...shape.over, ...identity.over };
          const derive = abilities => {
            try {
              const { abilities: echo, ...rest } = deriveUnitStats(
                Object.assign(baseInput(ctx, version, over), { abilities }));
              return JSON.stringify(digest(rest));
            } catch (err) {
              return /no row in that version at all|admitted by a different input key/.test(err.message)
                ? SEED_REFUSAL : 'THREW: ' + err.message;
            }
          };
          const baselineKey = `${version}|${identity.name}|${shape.name}`;
          if (!baselines.has(baselineKey)) baselines.set(baselineKey, derive({}));
          const base = baselines.get(baselineKey);
          for (const value of values) {
            const probed = derive({ [calcKey]: value });
            if (probed === SEED_REFUSAL) { seedRefused = true; continue; }
            if (probed !== base) { leaks = true; break; }
          }
        }
      }
      if (leaks) found.push(`${version}|${calcKey}`);
      if (seedRefused) refused.push(`${version}|${calcKey}`);
    }
  }

  assert(pairs > 0, 'The hidden-control gating sweep found hidden (calcKey, version) pairs to probe');
  assertSameKeyList(refused.sort(), expectedRefusals.sort(),
    'The hidden (calcKey, version) pairs the record seed refuses outright are exactly those the '
    + 'origin table gives no row in that version (F253.1). A pair on one list and not the other '
    + 'means the halt and the table disagree about what this version can carry');
  assertSameKeyList(found.sort(), [...KNOWN_DERIVED_LEAKS].sort(),
    'Version-hidden controls moving a derived stat match the declared worklist '
    + '(SPEC.md, Versions, invariant 4). A new entry is a regression; a missing one means a '
    + 'gate landed and its KNOWN_DERIVED_LEAKS entry should be deleted');

  // --- The one shape neither sweep builds (F168) ---
  //
  // Every shape above and in `hidden_control_leak_sweep.js` gives both units a conventional
  // attack and leaves the defender `normal`/`fantastic`/`hero` with no realm, so no probe ever
  // put a **resist-or-banish touch rider** in front of a **Fantastic defender**. That is the
  // blind spot that hid `dispelEvil`, `exorcise` and then the two defender-side `spiritLink`
  // reads, each found by hand rather than by a sweep (`Version gating census.md`). This adds the
  // shape, and probes the hidden key on the **defender**, which is the side these riders read.
  //
  // The attacker carries both rider names at once; `touchKeyInVersion` (`combat_effects.js`)
  // decides which the engine has, so this does not restate `TOUCH_KEY_SCOPE_IDS`.
  const resolveCombat = read('resolveCombat');
  const mean = dist => (dist || []).reduce((sum, p, i) => sum + p * i, 0);
  const touchFound = [];
  for (const version of versions) {
    const modern = version.startsWith('com2');
    // Each side states its own version's To Hit record and only that one: `deriveUnitStats`
    // halts on a non-zero field the active record has not got.
    const toHit = modern ? { hitChance: 100 } : { toHitMod: 70 };
    const unit = (prefix, over) => Object.assign(baseInput(ctx, version, {
      rtbType: 'none', rtb: 0, figs: 1, atk: 1, def: 0, res: 3, hp: 12,
      toBlkMod: 70, ...toHit, ...over,
    }), { prefix });
    // The attacker never carries the probed key, so it is derived once per version.
    // Both rider names, minus any the version's origin table cannot carry — stating `exorcise` in
    // a MoM build is a halt since F253.1, not a key `touchKeyInVersion` declines to place.
    const attackerRiders = { dispelEvil: true,
      ...(refusedBySeed('exorcise', version) ? {} : { exorcise: -4 }) };
    const a = deriveUnitStats(unit('a', {
      unitType: 'normal', res: 6, abilities: attackerRiders,
    }));
    const exchange = defenderAbilities => {
      try {
        const b = deriveUnitStats(unit('b', {
          unitType: 'fantastic_death', abilities: defenderAbilities,
        }));
        const result = resolveCombat(a, b,
          { isRanged: false, version, wallOfFire: false, chaosConjunction: false });
        return JSON.stringify([Number(mean(result.totalDmgToB).toFixed(9)),
          Number((result.bDestroyPct || 0).toFixed(9))]);
      } catch (err) {
        return /no row in that version at all|admitted by a different input key/.test(err.message)
          ? SEED_REFUSAL : 'THREW: ' + err.message;
      }
    };
    const baseline = exchange({});
    for (const [calcKey, defs] of byCalcKey) {
      if (!defs.every(def => abilityVersionGated(def, version))) continue;
      for (const def of defs) {
        for (const value of valuesFor(def)) {
          const probed = exchange({ [calcKey]: value });
          // A refused key moved nothing, by construction: the derivation would not run at all.
          if (probed !== SEED_REFUSAL && probed !== baseline) {
            touchFound.push(`${version}|${calcKey}`);
          }
        }
      }
    }
  }
  assertSameKeyList([...new Set(touchFound)].sort(), [...KNOWN_TOUCH_RIDER_LEAKS].sort(),
    'Version-hidden controls on a Fantastic defender move nothing against an attacker carrying '
    + 'Dispel Evil / Exorcise (SPEC.md, Versions, invariant 4)');
}

module.exports = { runHiddenControlGatingChecks };
