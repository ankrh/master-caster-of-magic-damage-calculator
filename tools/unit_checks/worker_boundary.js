'use strict';

// The matrix worker's source boundary.
//
// Node loads the whole `index.html` manifest; the matrix worker `importScripts` only the nine
// `data-worker` sources and then runs `MATRIX_WORKER_HANDLER` (`Calculator/ui_matrix.js`). So a
// relocation from one *core* file to another core file — moving no number, touching no page
// source — can leave every Node suite and every fixture green while the worker throws a
// `ReferenceError` on the first matchup. That is not hypothetical: F268.6 moved `convolveDists`
// from `engine.js` to `data.js` and measured exactly that.
//
// This family makes that class fail mechanically, in the only context that can see it — one
// holding the nine sources and nothing else:
//
//   1. *Executed.* The nine sources are loaded alone into a realm of their own, the handler is
//      driven exactly as the worker drives it — `self.onmessage`, one attacker row against many
//      defenders, the message structured-cloned as `postMessage` clones it — over roster matchups
//      in every version and both matrix modes, and over preset-derived matchups whose enchantments
//      reach the combat paths a bare roster record never does.
//   2. *Static.* No `data-worker` source may name a binding that the worker realm does not have,
//      except where `DERIVATION_ONLY_REFERENCES` declares one and says why. This reaches code the
//      sample does not execute, which is most of what a relocation could hit.
//
// The binding inventory the static half searches for is **measured, not parsed**: a name belongs
// to it when the full core context defines it and the worker realm does not. That is the property
// itself rather than an approximation of it, and it is what the probe returns to the parent.
//
// **What this can fail is resolution** — a symbol the worker cannot see, or a source that cannot
// run without its non-worker neighbours. Two things it deliberately does not do:
//
//   - It does not compare ratios against the main thread and is no second opinion on any number;
//     the corpus and the page's equivalence gate own those.
//   - It does not witness the handler's own ratio arithmetic (`ui_matrix.js`, inside
//     `MATRIX_WORKER_HANDLER`), and after checking, *nothing* does: the corpus never reaches the
//     handler and the matrix suite asserts its drawers and property list. A witness for that
//     belongs in the matrix suite, not here.
//
// The lexical limits are stated where they bite (`stripNonCode`), and the executed half's realm is
// a Node realm rather than a `DedicatedWorkerGlobalScope`, so this is a calculation-boundary check
// and not browser-worker equivalence.
//
// The executed half runs in a child process. Loading the nine sources with `runInThisContext` is
// what makes the isolation real *and* affordable — inside a `vm` context the same sample costs
// about ten times as much (the F260.9 measurement, for the same reason) — but it permanently
// populates the realm it runs in, so it gets a realm of its own rather than the runner's.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');
const {
  calculatorSources, repoRoot, loadCalculatorContext, loadPresetContext,
} = require('../calculator_sources');
const { assert, assertEqual, assertSameKeyList } = require('./assertions');

const PROBE_FLAG = '--worker-boundary-probe';

// The sample. Both strides are deterministic and span every version; neither is a claim about
// which units matter, only about reaching enough of the worker's code that a missing symbol shows
// up. The preset stride is what carries the enchantment configurations, and it is worth much more
// than matchup count: measured on the worker realm's own global functions, the preset stride
// reaches 216 of them and a roster grid twenty times its size reaches 203.
const ROSTER_STRIDE = 40;
const PRESET_STRIDE = 8;

// Breadth floors. The exact selection is what the probe must complete — see `presetSelected` /
// `rosterSelected`, which are compared for equality — and these only say that a sample which
// shrank to a handful stops being a sample at all.
const MIN_ROSTER_CELLS = 200;
const MIN_PRESET_CASES = 100;

// A `data-worker` source may name a binding the worker realm does not have, where the reference is
// unreachable in the worker. `combat_abilities.js` is imported by the worker for its combat
// helpers, but it also composes this version's stat steps, and a step's `when` callback runs only
// inside `deriveUnitStats` — which the worker never calls, because it is handed finished stats.
//
// `occurrences` is what keeps the exemption from covering the whole file: a second mention of the
// same name, in a place that might well be reachable, fails until it is declared here too.
const DERIVATION_ONLY_REFERENCES = {
  'Calculator/combat_abilities.js': {
    // `abilityStep('battleArmor', 'b', { when: (u, ctx) => outlanderBattleArmorAt(...) })`
    outlanderBattleArmorAt: {
      occurrences: 1,
      why: 'a region-b stat step\'s `when`, run only by deriveUnitStats',
    },
  },
};

function readSource(file) {
  return fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
}

// --- The lexical scan -------------------------------------------------------------------------
//
// Comments, string and template literals and regular expressions out; the code that remains is
// what a reference search may look at, because a comment naming `deriveUnitStats` is not a call.
// Template interpolations are kept — they hold real code — inside a comma expression, so the
// result is still parseable, which the scan then checks by compiling it.
//
// **This is a lexical scan, not a parse**, and the project ships no parser (no build step, no
// runtime dependencies). What it therefore cannot see, and what the executed half is the guard
// for: a name reached only through `this`, a computed member, `eval`, or a string handed to
// `Function`. What it *does* handle, because each was a real miss found in review: a literal
// nested inside a template interpolation, a spread's three dots, and a regular expression opening
// after a keyword. Those three are pinned by `STRIPPER_CASES` below.
const BACKSLASH = '\\';

// A `/` after one of these starts a regular expression, not a division.
const REGEX_AFTER_KEYWORD = /(?:^|[^\w$])(return|typeof|instanceof|in|of|case|new|delete|void|do|else|yield|await|throw)$/;

function stripNonCode(source) {
  let out = '';
  let index = 0;
  const end = source.length;
  // Nested code regions inside template interpolations. Each frame counts the `{` depth so an
  // object literal's `}` does not close the interpolation.
  const templates = [];
  const atRegexPosition = () => {
    const trimmed = out.replace(/\s+$/, '');
    if (!trimmed) return true;
    const last = trimmed[trimmed.length - 1];
    if (/[\w$]/.test(last)) return REGEX_AFTER_KEYWORD.test(trimmed);
    return !/[)\]]/.test(last);
  };
  while (index < end) {
    const char = source[index];
    const frame = templates.length ? templates[templates.length - 1] : null;

    if (frame && frame.inTemplate) {
      // Inside the literal part of a template: only `\`, `${` and the closing backtick matter.
      if (char === BACKSLASH) { index += 2; continue; }
      if (char === '`') { templates.pop(); out += ', 0) '; index += 1; continue; }
      if (char === '$' && source[index + 1] === '{') {
        frame.inTemplate = false;
        frame.depth = 0;
        out += ', (';
        index += 2;
        continue;
      }
      index += 1;
      continue;
    }

    if (char === '/' && source[index + 1] === '/') {
      while (index < end && source[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && source[index + 1] === '*') {
      index += 2;
      while (index < end && !(source[index] === '*' && source[index + 1] === '/')) index += 1;
      index += 2;
      out += ' ';
      continue;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      index += 1;
      while (index < end && source[index] !== quote) {
        if (source[index] === BACKSLASH) index += 1;
        index += 1;
      }
      index += 1;
      out += ' 0 ';
      continue;
    }
    if (char === '`') {
      templates.push({ inTemplate: true, depth: 0 });
      out += ' (0';
      index += 1;
      continue;
    }
    if (frame && !frame.inTemplate) {
      // A code region opened by `${`: its own braces are counted so the closing one is found.
      if (char === '{') { frame.depth += 1; out += char; index += 1; continue; }
      if (char === '}') {
        if (frame.depth === 0) { frame.inTemplate = true; out += ')'; index += 1; continue; }
        frame.depth -= 1;
        out += char;
        index += 1;
        continue;
      }
    }
    if (char === '/' && atRegexPosition()) {
      let scan = index + 1;
      let inClass = false;
      let closed = false;
      while (scan < end) {
        const inner = source[scan];
        if (inner === BACKSLASH) { scan += 2; continue; }
        if (inner === '\n') break;
        if (inner === '[') inClass = true;
        else if (inner === ']') inClass = false;
        else if (inner === '/' && !inClass) { closed = true; break; }
        scan += 1;
      }
      if (closed) {
        index = scan + 1;
        while (index < end && /[a-z]/.test(source[index])) index += 1;
        out += ' 0 ';
        continue;
      }
    }
    out += char;
    index += 1;
  }
  return out;
}

// Free identifiers: what is left once property reads are removed. The spread's three dots go
// first, or `[...convolveDists()]` would read as a property access and erase the call.
function freeIdentifierText(source) {
  return stripNonCode(source).replace(/\.\.\./g, ' ').replace(/\.\s*[A-Za-z_$][\w$]*/g, '.');
}

function namesFreely(code, name) {
  return new RegExp(`(?<![\\w$])${name}(?![\\w$])`).test(code);
}

function countsFreely(code, name) {
  return (code.match(new RegExp(`(?<![\\w$])${name}(?![\\w$])`, 'g')) || []).length;
}

// The three misses review found, plus the two ordinary cases, as inputs rather than as prose. A
// scan that stops handling one of them fails here rather than going quiet over the real sources.
const STRIPPER_CASES = [
  { code: 'const s = `${"}" + convolveDists() + "{"}`;', names: true,
    why: 'a string literal inside a template interpolation does not end the interpolation' },
  { code: 'const s = [...convolveDists()];', names: true,
    why: 'a spread is not a property access' },
  { code: 'return /convolveDists/.test("x");', names: false,
    why: 'a regular expression after `return` is a literal, not a division' },
  { code: 'const s = "convolveDists"; // convolveDists\n', names: false,
    why: 'a string and a comment name nothing' },
  { code: 'const s = result.convolveDists;', names: false,
    why: 'a property read names no binding' },
];

function runStripperChecks() {
  for (const probe of STRIPPER_CASES) {
    const found = namesFreely(freeIdentifierText(probe.code), 'convolveDists');
    assert(found === probe.names,
      `The reference scan reads ${JSON.stringify(probe.code)} as ${probe.names ? '' : 'not '}`
      + `naming convolveDists (${probe.why})`);
  }
}

// --- 1. The static half ------------------------------------------------------------------------

function runWorkerScopeReferenceChecks(bindings) {
  const sources = calculatorSources();
  runStripperChecks();
  assert(bindings.length > 100,
    `The probe measured the bindings the worker realm lacks (${bindings.length})`);
  const findings = [];
  for (const file of sources.worker) {
    const stripped = stripNonCode(readSource(file));
    // The stripper's own check over the real source. Output that no longer parses has eaten code,
    // and a reference search over it would come back clean for the wrong reason.
    try {
      new vm.Script(stripped, { filename: `${file} (stripped)` });
    } catch (err) {
      throw new Error('worker_boundary: the comment/literal scan produced unparseable code for '
        + `${file} (${err.message}). The reference search below reads that output, so a silent `
        + 'pass would mean nothing.');
    }
    const code = freeIdentifierText(readSource(file));
    const declared = DERIVATION_ONLY_REFERENCES[file] || {};
    for (const [name, owner] of bindings) {
      const uses = countsFreely(code, name);
      if (!uses) continue;
      const exemption = Object.prototype.hasOwnProperty.call(declared, name) ? declared[name] : null;
      if (exemption && uses === exemption.occurrences) continue;
      findings.push(exemption
        ? `${file} names \`${name}\` ${uses} time(s), and only ${exemption.occurrences} `
          + `is declared derivation-only (${exemption.why})`
        : `${file} names \`${name}\`, which the worker realm does not have (${owner})`);
    }
  }
  assert(findings.length === 0,
    'Every name a data-worker source uses is a name the worker realm has, or is declared in '
    + `DERIVATION_ONLY_REFERENCES as unreachable there: ${findings.join('; ')}`);

  // The declarations are checked in the other direction too: an entry that no longer describes a
  // real reference is a stale exemption, and the next relocation would pass under it.
  const bindingNames = new Set(bindings.map(([name]) => name));
  for (const [file, names] of Object.entries(DERIVATION_ONLY_REFERENCES)) {
    assert(sources.worker.includes(file),
      `DERIVATION_ONLY_REFERENCES names ${file}, which is not a data-worker source`);
    const code = freeIdentifierText(readSource(file));
    for (const [name, exemption] of Object.entries(names)) {
      assertEqual(countsFreely(code, name), exemption.occurrences,
        `DERIVATION_ONLY_REFERENCES exempts ${exemption.occurrences} use(s) of \`${name}\` in ${file}`);
      assert(bindingNames.has(name),
        `DERIVATION_ONLY_REFERENCES exempts \`${name}\`, which the worker realm already has`);
    }
  }
}

// --- 2. The executed half ----------------------------------------------------------------------

// The handler is source text inside a page source, so it is read the way the page builds the blob
// — the text, not the file — and the worker's own `importScripts` list is the manifest.
function matrixWorkerHandlerSource() {
  const uiMatrix = readSource('Calculator/ui_matrix.js');
  const match = /\nconst MATRIX_WORKER_HANDLER = `([\s\S]*?)`;\n/.exec(uiMatrix);
  if (!match) {
    throw new Error('worker_boundary: Calculator/ui_matrix.js declares no `MATRIX_WORKER_HANDLER` '
      + 'template literal. That text is what the matrix worker runs, and this check has nothing to '
      + 'drive without it.');
  }
  if (!/self\.onmessage\s*=/.test(match[1])) {
    throw new Error('worker_boundary: MATRIX_WORKER_HANDLER sets no `self.onmessage`, so the '
      + 'worker entry point this check drives is not there.');
  }
  return match[1];
}

// Every binding the full core context has and the worker realm has not. Measured rather than
// parsed: the candidate names are every identifier-shaped token in the core sources — over-broad
// on purpose — and the two `typeof` probes decide membership exactly. A declaration this file
// failed to recognise cannot go missing from the set, which is what a regex inventory could not
// promise (F269.1 review, finding 3).
function measureNonWorkerBindings(coreContext) {
  const sources = calculatorSources();
  const candidates = new Set();
  for (const file of sources.core) {
    for (const [token] of readSource(file).matchAll(/[A-Za-z_$][\w$]*/g)) candidates.add(token);
  }
  const declaredBy = new Map();
  for (const file of sources.core) {
    if (sources.worker.includes(file)) continue;
    const code = readSource(file);
    for (const [, name] of code.matchAll(/(?:^|[,;{}\s])(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (!declaredBy.has(name)) declaredBy.set(name, file);
    }
  }
  const bindings = [];
  for (const name of candidates) {
    let inCore;
    try { inCore = vm.runInContext(`typeof ${name}`, coreContext); } catch (err) { continue; }
    if (inCore === 'undefined') continue;
    let inWorker;
    try { inWorker = vm.runInThisContext(`typeof ${name}`); } catch (err) { continue; }
    if (inWorker !== 'undefined') continue;
    bindings.push([name, declaredBy.get(name) || 'a non-worker core source']);
  }
  if (!bindings.length) {
    throw new Error('worker_boundary probe: the worker realm is missing none of the core '
      + 'context\'s bindings, which cannot be true — it holds nine of twenty-three sources. The '
      + 'measurement has stopped measuring.');
  }
  return bindings;
}

function runWorkerBoundaryProbe() {
  const sources = calculatorSources();
  const summary = {
    workerSources: sources.worker.length,
    versions: [],
    modes: [],
    rosterSelected: 0,
    rosterRows: 0,
    rosterCells: 0,
    presetSelected: 0,
    presetCases: 0,
    nonDegenerateRatios: 0,
    bindings: [],
  };

  // The stats the handler is given are built in a `vm` context holding the whole core manifest
  // plus the fixture corpus — the derivation is the card's own path (`applyRosterUnit` /
  // `presetToCardState` -> `cardStateToDerivationInput` -> `deriveUnitStats`), never
  // reconstructed here.
  const ctx = loadPresetContext();
  const evaluate = expression => vm.runInContext(expression, ctx);

  // The worker's realm: the nine sources, in manifest order, and nothing else.
  for (const file of sources.worker) {
    vm.runInThisContext(readSource(file), { filename: file });
  }
  globalThis.self = { postMessage(message) { globalThis.self.last = message; } };
  vm.runInThisContext(matrixWorkerHandlerSource(), { filename: 'MATRIX_WORKER_HANDLER' });

  // Isolation, measured rather than assumed. Without this the executed half could be passing
  // because something loaded more than the worker does. The measurement asks a *core-only*
  // context, not the one the derivation runs in: what the worker lacks is a statement about the
  // manifest's core sources, and the fixture corpus loaded on top of them is not part of it.
  summary.bindings = measureNonWorkerBindings(loadCalculatorContext());

  const runRow = (label, attackerStats, allDefenderStats, opts) => {
    // `postMessage` hands the worker a structured clone, so the handler is given one too: a value
    // the real worker could not receive should fail here rather than work in Node only.
    const message = structuredClone({ attackerStats, allDefenderStats, opts, rowIndex: 0 });
    globalThis.self.last = null;
    try {
      globalThis.self.onmessage({ data: message });
    } catch (err) {
      err.message = `${label}: ${err.message}`;
      throw err;
    }
    if (!globalThis.self.last) {
      throw new Error(`worker_boundary probe: ${label}: the handler posted no message back.`);
    }
    const { ratios } = globalThis.self.last;
    if (!Array.isArray(ratios) || ratios.length !== allDefenderStats.length) {
      throw new Error(`worker_boundary probe: ${label}: the handler answered `
        + `${JSON.stringify(ratios)} for ${allDefenderStats.length} defender(s).`);
    }
    for (const ratio of ratios) {
      if (typeof ratio !== 'number' || Number.isNaN(ratio)) {
        throw new Error(`worker_boundary probe: ${label}: the handler answered `
          + `${JSON.stringify(ratio)}, which is not a ratio.`);
      }
      if (ratio !== 0 && ratio !== 1) summary.nonDegenerateRatios += 1;
    }
    return ratios.length;
  };

  // (a) The roster grid, in every version and both matrix modes. This is the shape the matrix
  //     actually posts: one attacker row against every defender at once.
  const statsForRosterUnit = (version, prefix, unitName, ranged) => {
    ctx.__workerBoundary = { version, prefix, unitName, ranged };
    return evaluate(`(function () {
      const { version, prefix, unitName, ranged } = __workerBoundary;
      const unit = rosterRecordsForVersion(version).find(record => record.name === unitName);
      if (!unit) throw new Error('worker_boundary probe: no roster record named ' + unitName);
      const states = { a: presetDefaultCardState('a', version), b: presetDefaultCardState('b', version) };
      states[prefix] = applyVersionGating(
        applyRosterUnit(states[prefix], unit, version), version, abilityVersionGated);
      const globals = applyGlobalVersionGating(presetGlobals({ rangedCheck: ranged }, version, states));
      return deriveUnitStats(cardStateToDerivationInput(states[prefix], globals));
    })()`);
  };
  for (const version of evaluate('Object.keys(VERSION_DATA)')) {
    summary.versions.push(version);
    ctx.__workerBoundary = { version };
    const names = evaluate('rosterRecordsForVersion(__workerBoundary.version).map(record => record.name)')
      .filter((_, index) => index % ROSTER_STRIDE === 0);
    for (const ranged of [false, true]) {
      const mode = ranged ? 'ranged' : 'melee';
      if (!summary.modes.includes(mode)) summary.modes.push(mode);
      summary.rosterSelected += names.length;
      const attackers = names.map(name => statsForRosterUnit(version, 'a', name, ranged));
      const defenders = names.map(name => statsForRosterUnit(version, 'b', name, ranged));
      // `matrixCombatOptions`' shape. The two battlefield options are on, because they gate
      // combat code the worker would otherwise never reach.
      const opts = { isRanged: ranged, version, wallOfFire: true, chaosConjunction: true };
      for (const [index, attackerStats] of attackers.entries()) {
        summary.rosterCells += runRow(`${version} ${mode} row ${names[index]}`,
          attackerStats, defenders, opts);
        summary.rosterRows += 1;
      }
    }
  }

  // (b) The preset corpus, strided. A roster record carries no enchantments, so this is what puts
  //     riders, fear, life steal and the damage spells in front of the worker. A fixture whose
  //     version cannot be resolved halts naming it: silently skipping one is how the first cut of
  //     this check lost 35 of its 146 selected cases (F269.1 review, finding 1).
  ctx.__workerBoundary = { stride: PRESET_STRIDE };
  const cases = evaluate(`(function () {
    const versions = presetVersionsFromTestTree(TEST_TREE);
    const built = [];
    for (const [index, name] of Object.keys(PRESETS).entries()) {
      if (index % __workerBoundary.stride !== 0) continue;
      const preset = PRESETS[name];
      const version = preset.version || versions[name];
      if (!version) {
        throw new Error('worker_boundary probe: preset ' + name + ' states no version and no '
          + 'TEST_TREE group gives it one, so the sample cannot include it.');
      }
      const states = presetToCardState(name, preset, { presetVersions: versions });
      built.push({
        name,
        opts: {
          isRanged: !!states.globals.rangedCheck,
          version,
          wallOfFire: !!states.globals.wallOfFire,
          chaosConjunction: !!states.globals.chaosConjunction,
        },
        attacker: deriveUnitStats(cardStateToDerivationInput(states.a, states.globals)),
        defender: deriveUnitStats(cardStateToDerivationInput(states.b, states.globals)),
      });
    }
    return { built, selected: Object.keys(PRESETS).filter((_, i) => i % __workerBoundary.stride === 0).length };
  })()`);
  summary.presetSelected = cases.selected;
  for (const fixture of cases.built) {
    runRow(`preset ${fixture.name}`, fixture.attacker, [fixture.defender], fixture.opts);
    summary.presetCases += 1;
  }

  if (summary.presetCases !== summary.presetSelected
    || summary.rosterRows !== summary.rosterSelected) {
    throw new Error(`worker_boundary probe: it selected ${summary.presetSelected} preset(s) and `
      + `${summary.rosterSelected} roster row(s) but ran ${summary.presetCases} and `
      + `${summary.rosterRows}. A selection that is not completed is a check that stopped looking.`);
  }
  return summary;
}

function runWorkerBoundaryChecks() {
  const probe = spawnSync(process.execPath, [__filename, PROBE_FLAG],
    { cwd: __dirname, encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024 });
  if (probe.error) {
    throw new Error(`worker_boundary: could not run the worker-realm probe - ${probe.error.message}`);
  }
  assert(probe.status === 0,
    'The nine data-worker sources load alone and the matrix handler resolves every symbol it '
    + `reaches (probe exited ${probe.status}); the first lines of what it said: `
    + `${(probe.stderr || '').trim().split('\n').slice(0, 12).join(' | ')}`);
  let summary;
  try {
    summary = JSON.parse((probe.stdout || '').trim().split('\n').pop());
  } catch (err) {
    throw new Error('worker_boundary: the probe exited 0 without a summary line, so nothing says '
      + `what it ran. stdout was ${JSON.stringify((probe.stdout || '').slice(-400))}`);
  }
  assertEqual(summary.workerSources, calculatorSources().worker.length,
    'The probe imported the manifest\'s data-worker sources');
  // The version list is the data's, not a number restated here.
  const versions = vm.runInContext('Object.keys(VERSION_DATA)', loadCalculatorContext());
  assertSameKeyList(summary.versions, versions, 'The probe covered every game version');
  assertSameKeyList(summary.modes, ['melee', 'ranged'], 'The probe covered both matrix modes');
  assertEqual(summary.presetCases, summary.presetSelected,
    'The probe ran every preset its stride selected');
  assertEqual(summary.rosterRows, summary.rosterSelected,
    'The probe ran every roster row its stride selected');
  assert(summary.rosterCells >= MIN_ROSTER_CELLS && summary.presetCases >= MIN_PRESET_CASES,
    `The sample kept its breadth (${summary.rosterCells} roster cells, `
    + `${summary.presetCases} preset cases)`);
  assert(summary.nonDegenerateRatios > 0,
    'The handler computed real ratios rather than answering 0 or 1 to everything, which is what a '
    + `run that resolved combat into nothing would look like (${summary.nonDegenerateRatios})`);

  runWorkerScopeReferenceChecks(summary.bindings);
}

module.exports = { runWorkerBoundaryChecks };

if (require.main === module) {
  if (process.argv[2] !== PROBE_FLAG) {
    console.error(`worker_boundary: run this through tools/node_unit_checks.js, or with ${PROBE_FLAG} `
      + 'to run the worker-realm probe alone.');
    process.exit(1);
  }
  try {
    console.log(JSON.stringify(runWorkerBoundaryProbe()));
  } catch (err) {
    console.error(err.stack || String(err));
    process.exit(1);
  }
}
