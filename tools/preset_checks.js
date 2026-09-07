'use strict';

// Every shipped preset, evaluated headlessly. Run: `node tools/preset_checks.js`
//
// This is the Node twin of the browser's `runTests()` (`Calculator/ui_state.js`), which
// `tests/preset-equivalence-gate.spec.js` drives. It checks the same claim over the same corpus with the same
// tolerance: for each fixture that states an `expected` block, the mean **and the standard
// deviation** of the total damage distribution to each side, each rounded the way the page renders
// it, are within 0.002 of the stated numbers. The evaluation both runners share lives in
// `tools/preset_evaluation.js`.
//
// ## Why a Node script may do this now
//
// `tools/node_unit_checks.js` used to carry a standing prohibition: never reconstruct the
// `applyPreset` -> `readUnitStats` -> `resolveCombat` path in Node, because a reconstruction skips
// the DOM/calcKey layer and yields false failures. That prohibition was right, and it is not being
// waived here — it has been **satisfied by construction**, by F260.1 to F260.8:
//
//   * There is no reconstruction left to get wrong. `presetToCardState` and
//     `cardStateToDerivationInput` (`Calculator/card_state.js`, `data-scope="core"`) *are* the
//     translation, and the page runs them too: `applyPreset` (`ui_state.js`) is
//     `presetToCardState` plus a control writer, and `readUnitStats` (`ui_card.js`) is literally
//     `deriveUnitStats(cardStateToDerivationInput(collectCardState(p), collectGlobals()))`. One
//     translation, two callers — not two translations.
//   * That the two callers really do build the same input is measured, not assumed:
//     `tests/preset-equivalence-gate-f260.8.spec.js` compares the Node derivation input against
//     the page's, field by field, for every fixture in the corpus.
//
// What this suite therefore still cannot speak for is what both realms share: a wrong rule *inside*
// `card_state.js` moves both sides equally, so the gate's field comparison would not notice it —
// the fixtures' own `expected` blocks are what stands against that, and they are authored
// independently of the code. Which suite carries which claim is `TESTS.md`'s to state, section
// *The preset corpus*; it is not restated here.
//
// ## Execution model
//
// Each preset is applied **independently**, over the applier's own starting card rather than over
// the previous fixture's finished one, which is what lets the corpus be split across cores.
// F260.8's report measured what that costs: 138 of the 1,161 fixtures end on a different card
// state, every difference being `modernAttacks` on a custom side under a DOS version, which
// `cardStateToDerivationInput` nulls off those versions — so **no difference reaches a derivation
// input**. `tests/preset-equivalence-gate-f260.8.spec.js` test 2 is the standing guard on that and
// fails naming the fixture and field if a fifth field ever becomes base-reachable. `--chained`
// below re-runs the corpus the page's way, so the claim is re-checkable here in ~20 s.
//
// Independent application also removes the ordering question grouping would otherwise raise: a
// worker starts clean, every fixture starts from the same card and the declared start version, and
// the order the queue happens to hand them out cannot change a number. Measured: the corpus walked
// forwards and then backwards in one realm gives identical averages for all 1,157 fixtures outside
// the four heavy ones. Fixtures are dispatched one at a time to whichever worker is free, so those
// four (7.6 s, 4.8 s, 1.1 s, 1.0 s of a 21.3 s serial total) do not have to land in the same shard.
//
// **What independent application costs in coverage**, since it is not free: under it, every fixture
// is handed `startVersion`, so the TEST_TREE group-version map becomes invisible — dropping it
// changes no number here, while the page (which chains, and whose fallback is the *currently
// selected* version) breaks at the 19th fixture, `thrownBasic` inheriting CoM2 from
// `distPenaltyCoM2_16` and halting on the modern record. The map is still passed, and `--chained`
// and `--compare-chained` still run the model that needs it (F260.9 review, finding 4).

const os = require('os');
const path = require('path');
const {
  Worker, isMainThread, parentPort, workerData,
} = require('worker_threads');
const {
  loadPresetContext, defaultSelectedVersion,
} = require('./calculator_sources');
// The evaluation itself lives next door, because the standard-deviation generator
// (`tools/generate_preset_stdev.js`) is a second caller and a generator with its own copy of the
// translation would write values this runner never computes (F268.3).
const {
  ORIGIN, REALM_BINDINGS, renderedMean, prepareRealm, evaluatePreset,
} = require('./preset_evaluation');

// `runTests(tolerance)`'s default, restated here because a Node run cannot call it: this script and
// the browser runner have to agree on the number or they are not checking the same claim.
const TOLERANCE = 0.002;

// The exit-status probe: an internal mode that runs one synthetic fixture with an expectation no
// combat can meet, so the self-check can observe what a failing run actually returns to a shell.
const SELF_FAIL_FLAG = '--self-fail-probe';
const SELF_FAIL_NAME = '__selfFailProbe';
const SELF_FAIL_FIXTURE = {
  expected: { dmgToA: -999, sdDmgToA: 0, dmgToB: -999, sdDmgToB: 0 },
};

// --- The comparison ---------------------------------------------------------------------------

// `runTests`' own comparison, restated field for field so a failure reads the same in both runners.
// What is *not* restated is the reading of the `expected` block: `presetExpectation`
// (`Calculator/presets.js`) is a shipped source both runners call, so the block's shape — which
// fields it carries, and that a mean and its standard deviation are stated together or not at all —
// cannot mean one thing here and another on the page (F268.3).
//
// Four numbers per fixture, not two. The mean is blind to every change that moves a distribution
// while leaving its first moment alone, which is what several bespoke browser suites were built to
// catch; the standard deviation is what makes those claims the corpus's rather than theirs. It is
// **generated from the current implementation** (`tools/generate_preset_stdev.js`), so it detects
// change and never correctness — `TESTS.md` states that where the corpus's claims are stated, and
// it is the reason the means were not regenerated with it.
//
// Two departures from the browser's version, both deliberate and both in the direction of noticing
// more:
//
//  1. A fixture with no `expected` block is *evaluated* and then reported as unchecked rather than
//     skipped: the browser's `continue` hides it, and a corpus quietly losing its expectations is
//     the failure mode that looks green.
//  2. `checked` counts **numeric comparisons made**, not expectation blocks present. `runTests`
//     treats any truthy `expected` as a test, so `expected: {}` and
//     `expected: { dmgToA: null, dmgToB: null }` both pass while comparing nothing (F260.9 review,
//     finding 2). A one-sided expectation is legitimate and common (16 shipped fixtures state no
//     `dmgToA`), so the unit counted is the number, not the fixture: `comparisons` is what each
//     side actually compared, a fixture is `checked` when it compared anything, and the run halts
//     if the corpus makes no comparison at all.
function judge(name, preset, evaluated, error, readExpectation) {
  if (error) {
    return {
      name, pass: false, checked: true, comparedA: false, comparedB: false, comparisons: 0, error,
      dmgToA: null, expectedA: null, errA: null,
      dmgToB: null, expectedB: null, errB: null,
      sdToA: null, expectedSdA: null, errSdA: null,
      sdToB: null, expectedSdB: null, errSdB: null,
      hasExpectedBlock: Boolean(preset && preset.expected),
      categoryComparisons: 0, categoryStated: 0, categoryStatedFields: [], categoryFailures: [],
    };
  }
  const expected = readExpectation(name, preset);
  const { comparedA, comparedB } = expected;
  // A fixture with no `expected` property asserts nothing, categories included: comparing its
  // sixteen against a default would be inventing an expectation nobody wrote. A fixture whose
  // block is present but empty is a different thing entirely and is caught by the corpus-shape
  // guard in `report`, which now asks it of every fixture that has a block rather than only of
  // those that compared a total (GPT review of F268.7, finding 2).
  const hasExpectedBlock = Boolean(preset && preset.expected);
  const errA = comparedA ? Math.abs(evaluated.dmgToA - expected.dmgToA) : 0;
  const errB = comparedB ? Math.abs(evaluated.dmgToB - expected.dmgToB) : 0;
  const errSdA = comparedA ? Math.abs(evaluated.sdToA - expected.sdDmgToA) : 0;
  const errSdB = comparedB ? Math.abs(evaluated.sdToB - expected.sdDmgToB) : 0;
  // The category and healing claims (F268.7). Sixteen numbers per fixture, and an *absent* pair is
  // an expectation of zero rather than an absent expectation — `presetExpectation` is what turns
  // one into the other, so the browser and this runner cannot disagree about which pairs a fixture
  // asserts. They are counted apart from `comparisons` because all but 168 of them are `0 == 0`
  // across the whole corpus, and folding them in would replace one honest count with a much larger
  // flattering one.
  const categoryFailures = [];
  for (const claim of hasExpectedBlock ? Object.values(expected.categories) : []) {
    const observed = evaluated.categories[claim.side][claim.metric];
    const errMean = Math.abs(observed.mean - claim.mean);
    const errSd = Math.abs(observed.sd - claim.sd);
    if (!(errMean < TOLERANCE) || !(errSd < TOLERANCE)) {
      categoryFailures.push(`${claim.meanField}=${observed.mean} (expected ${claim.mean}), `
        + `${claim.sdField}=${observed.sd} (expected ${claim.sd})`);
    }
  }
  return {
    name,
    pass: errA < TOLERANCE && errB < TOLERANCE && errSdA < TOLERANCE && errSdB < TOLERANCE
      && categoryFailures.length === 0,
    checked: comparedA || comparedB,
    comparedA,
    comparedB,
    comparisons: expected.comparisons,
    error: null,
    dmgToA: evaluated.dmgToA, expectedA: expected.dmgToA, errA: +errA.toFixed(4),
    dmgToB: evaluated.dmgToB, expectedB: expected.dmgToB, errB: +errB.toFixed(4),
    sdToA: evaluated.sdToA, expectedSdA: expected.sdDmgToA, errSdA: +errSdA.toFixed(4),
    sdToB: evaluated.sdToB, expectedSdB: expected.sdDmgToB, errSdB: +errSdB.toFixed(4),
    hasExpectedBlock,
    categoryComparisons: hasExpectedBlock ? expected.categoryComparisons : 0,
    categoryStated: hasExpectedBlock ? expected.categoryStated : 0,
    categoryStatedFields: hasExpectedBlock ? expected.categoryStatedFields : [],
    categoryFailures,
  };
}

// --- Worker side -----------------------------------------------------------------------------

function runWorker() {
  const { startVersion } = workerData;
  const { realm, presetVersions } = prepareRealm(startVersion);
  parentPort.on('message', message => {
    if (message.done) { parentPort.close(); return; }
    const name = message.name;
    const preset = realm.PRESETS[name];
    if (!preset) {
      throw new Error(`preset_checks: the main thread handed out '${name}', which is not a key of `
        + 'PRESETS in this worker. The two realms loaded different fixture sources.');
    }
    let evaluated = null;
    let error = null;
    const started = Date.now();
    try {
      evaluated = evaluatePreset(realm, name, preset, {
        origin: ORIGIN, version: startVersion, presetVersions,
      });
    } catch (err) {
      error = String((err && err.message) || err);
    }
    parentPort.postMessage({
      result: judge(name, preset, evaluated, error, realm.presetExpectation),
      ms: Date.now() - started,
    });
  });
  parentPort.postMessage({ ready: true, corpusSize: Object.keys(realm.PRESETS).length });
}

// --- Main thread -----------------------------------------------------------------------------

function parseArgs(argv) {
  const options = {
    serial: false, workers: null, chained: false, json: false, slowest: 0, compareChained: false,
    selfFailProbe: false, compareBase: false,
  };
  for (const arg of argv) {
    const [flag, value] = arg.split('=');
    switch (flag) {
      case '--serial': options.serial = true; break;
      case SELF_FAIL_FLAG: options.selfFailProbe = true; options.serial = true; break;
      case '--chained': options.chained = true; options.serial = true; break;
      case '--compare-chained': options.compareChained = true; options.serial = true; break;
      case '--compare-base': options.compareBase = true; options.serial = true; break;
      case '--json': options.json = true; break;
      case '--workers': options.workers = Number(value); break;
      case '--slowest': options.slowest = Number(value || 10); break;
      default:
        throw new Error(`preset_checks: '${arg}' is not one of --serial, --chained, `
          + '--compare-chained, --compare-base, --json, --workers=N, --slowest[=N].');
    }
  }
  if (options.workers !== null && (!Number.isInteger(options.workers) || options.workers < 1)) {
    throw new Error(`preset_checks: --workers=${options.workers} is not a positive integer.`);
  }
  return options;
}

// The corpus. Read through a throwaway `vm` context so the main thread's own globals stay clean;
// the context is handed back because the self-checks below need a realm and this one is already
// paid for (~50 ms, and they run three fixtures between them).
function readCorpus() {
  const context = loadPresetContext();
  const vm = require('vm');
  const names = vm.runInContext('Object.keys(PRESETS)', context);
  if (!Array.isArray(names) || names.length === 0) {
    throw new Error('preset_checks: PRESETS is empty, so a run would pass vacuously.');
  }
  const unique = new Set(names);
  if (unique.size !== names.length) {
    throw new Error(`preset_checks: the corpus list holds ${names.length} entries but only `
      + `${unique.size} distinct names, so some fixture is evaluated twice in place of another.`);
  }
  // Counting fixtures against `PRESETS` alone cannot see a whole fixture *file* dropped from the
  // manifest selector: both the main thread and the workers read the same selector, so both would
  // agree on the short corpus and report it green (F260.9 review, finding 1 — measured by removing
  // `presets_curses_and_undead.js`, which reported `total: 985` and passed). `TEST_TREE` is the
  // independent enumeration: it is authored by browser grouping rather than by ability family,
  // derives from neither, and `tools/node_unit_checks.js` (`runPresetGroupingChecks`) already
  // requires the two to name the same keys. Comparing against it needs no hardcoded count.
  const treeKeys = vm.runInContext(`(() => {
    const keys = new Set();
    const walk = nodes => {
      for (const node of nodes || []) {
        for (const key of node.keys || []) keys.add(key);
        if (node.subs) walk(node.subs);
      }
    };
    walk(TEST_TREE);
    return [...keys];
  })()`, context);
  const missing = treeKeys.filter(key => !unique.has(key));
  const extra = names.filter(name => !treeKeys.includes(name));
  if (missing.length || extra.length) {
    throw new Error(`preset_checks: the corpus and TEST_TREE name different fixtures — `
      + `${missing.length} TEST_TREE key(s) missing from PRESETS [${missing.slice(0, 8).join(', ')}]`
      + `, ${extra.length} preset(s) in no TEST_TREE group [${extra.slice(0, 8).join(', ')}]. A `
      + 'fixture source missing from the manifest looks exactly like this, and it would otherwise '
      + 'shorten the run rather than fail it.');
  }
  return { names, context };
}

// Three properties of this runner that the shipped corpus cannot demonstrate, asserted directly so
// they are not merely believed. Each was a surviving mutation probe before it was written (F260.9):
// the corpus has no fixture near the rounding boundary, none that halts, and none that fails, so
// the rounding, the halt path and the comparison itself could all be removed without a red run.
//
// They cost three evaluations and they run on every invocation, because a check that has to be
// remembered separately is the one that stops being run.
function runSelfChecks(context) {
  const vm = require('vm');
  const realm = vm.runInContext(`({ ${REALM_BINDINGS.join(', ')} })`, context,
    { filename: 'preset_checks self-check bindings' });

  // 1. The mean is rounded the way the page renders it. `dist` has mean 1/3.
  const rounded = renderedMean(realm, [2 / 3, 1 / 3]);
  if (rounded !== 0.333) {
    throw new Error(`preset_checks self-check: renderedMean returned ${rounded} for a `
      + 'distribution with mean 1/3, where the page would display 0.333. The browser compares the '
      + 'rendered figure, so this runner has to round the same way.');
  }

  // 2. A fixture that halts is reported as a failure, not as a pass. The halt is a real one:
  // `presetToCardState` refuses a roster name the version's roster does not carry.
  const halting = { aUnitName: '  no such unit', expected: { dmgToA: 0, sdDmgToA: 0, dmgToB: 0, sdDmgToB: 0 } };
  let evaluated = null;
  let error = null;
  try {
    evaluated = evaluatePreset(realm, '__selfCheckHalt', halting,
      { origin: ORIGIN, version: 'mom_1.31' });
  } catch (err) {
    error = String((err && err.message) || err);
  }
  if (!error) {
    throw new Error('preset_checks self-check: a fixture naming a roster unit no roster carries '
      + 'did not halt, so the halt path this runner reports through is not reachable.');
  }
  const halted = judge('__selfCheckHalt', halting, evaluated, error, realm.presetExpectation);
  if (halted.pass !== false || !halted.error) {
    throw new Error('preset_checks self-check: a fixture that threw was judged '
      + `${JSON.stringify(halted)}, which does not report a failure.`);
  }

  // 3. The comparison contract, stated in **literals** rather than in terms of `TOLERANCE`. The
  // first version of this check derived its cases from the constant it was testing, so doubling
  // the tolerance moved the cases with it and survived; so did `<` becoming `<=`, dropping
  // `Math.abs`, and dropping the defender side entirely (F260.9 review, finding 3). The cases
  // below pin the number, both sides, both signs, and the boundary itself.
  if (TOLERANCE !== 0.002) {
    throw new Error(`preset_checks self-check: the tolerance is ${TOLERANCE}, and `
      + "`runTests(tolerance)`'s default (`Calculator/ui_state.js`) is 0.002. The two runners "
      + 'are not checking the same claim unless they agree on it.');
  }
  // Four numbers now, not two: F268.3 gave each side a standard deviation, and the whole value of
  // the field is that it can fail on its own. Every case below moves exactly one of the four and
  // holds the other three at their expectation, so a comparison dropped for one moment on one side
  // is a case that flips rather than a run that stays green.
  const zero = { dmgToA: 0, sdDmgToA: 0, dmgToB: 0, sdDmgToB: 0 };
  // Every synthetic evaluation needs the category block a real one carries, because `judge`
  // compares sixteen of its numbers against zero whether or not a fixture states any of them.
  // `overrides` is `{ 'B.irreversibleDamage': { mean, sd } }`-shaped.
  const evaluatedCategories = (overrides = {}) => {
    const categories = { A: {}, B: {} };
    for (const side of ['A', 'B']) {
      for (const metric of realm.COMBAT_CATEGORY_KEYS) {
        categories[side][metric] = overrides[`${side}.${metric}`] || { mean: 0, sd: 0 };
      }
    }
    return categories;
  };
  const at = (field, value) => {
    const evaluatedCase = { dmgToA: 0, dmgToB: 0, sdToA: 0, sdToB: 0,
      categories: evaluatedCategories() };
    evaluatedCase[field] = value;
    return evaluatedCase;
  };
  const cases = [];
  for (const field of ['dmgToA', 'dmgToB', 'sdToA', 'sdToB']) {
    cases.push([`inside, ${field}`, zero, at(field, 0.001), true]);
    cases.push([`outside, ${field}`, zero, at(field, 0.003), false]);
    // A standard deviation is never negative, so only the two means carry the sign cases; the
    // spread's own sign is refused by `presetExpectation` before a comparison is reached.
    if (field.startsWith('dmg')) {
      cases.push([`inside, ${field} negative`, zero, at(field, -0.001), true]);
      cases.push([`outside, ${field} negative`, zero, at(field, -0.003), false]);
    }
    // The comparison is strict `<`, so a fixture exactly on the boundary fails, on every moment.
    cases.push([`on the boundary, ${field}`, zero, at(field, 0.002), false]);
  }
  for (const [label, expectation, evaluatedCase, verdict] of cases) {
    const judged = judge('__selfCheck', { expected: expectation }, evaluatedCase, null,
      realm.presetExpectation);
    if (judged.pass !== verdict) {
      throw new Error(`preset_checks self-check: the case '${label}' `
        + `(${JSON.stringify(evaluatedCase)} against ${JSON.stringify(expectation)}) was judged `
        + `pass=${judged.pass}, and the browser's comparison gives ${verdict}.`);
    }
  }

  // An expectation block that states no number is not a check, and must not be counted as one.
  const evaluatedNines = { dmgToA: 999, dmgToB: 999, sdToA: 999, sdToB: 999,
    categories: evaluatedCategories() };
  for (const empty of [{}, { dmgToA: null, sdDmgToA: null, dmgToB: null, sdDmgToB: null }]) {
    const judged = judge('__selfCheckEmpty', { expected: empty }, evaluatedNines, null,
      realm.presetExpectation);
    if (judged.checked !== false || judged.comparedA || judged.comparedB
      || judged.comparisons !== 0) {
      throw new Error(`preset_checks self-check: an expectation block ${JSON.stringify(empty)} was `
        + `judged ${JSON.stringify(judged)}, which counts as a check while comparing nothing.`);
    }
  }
  // A one-sided expectation is a real check on the side it states, and on no other — and it is
  // two numbers, not one.
  const oneSided = judge('__selfCheckOneSided', { expected: { dmgToB: 0, sdDmgToB: 0 } },
    { dmgToA: 999, dmgToB: 0, sdToA: 999, sdToB: 0, categories: evaluatedCategories() }, null,
    realm.presetExpectation);
  if (!oneSided.checked || oneSided.comparedA || !oneSided.comparedB || !oneSided.pass
    || oneSided.comparisons !== 2) {
    throw new Error('preset_checks self-check: a fixture stating only `dmgToB` was judged '
      + `${JSON.stringify(oneSided)}; it is expected to compare the defender's two moments and `
      + "neither of the attacker's.");
  }
  // A fixture stating both sides compares four numbers. Without this the count could be halved by
  // dropping either moment and the run would still report a number that looks like a count.
  const bothSides = judge('__selfCheckBothSides', { expected: zero },
    { dmgToA: 0, dmgToB: 0, sdToA: 0, sdToB: 0, categories: evaluatedCategories() }, null,
    realm.presetExpectation);
  if (bothSides.comparisons !== 4) {
    throw new Error('preset_checks self-check: a fixture stating both sides reported '
      + `${bothSides.comparisons} comparisons, and it makes four — two means and two spreads.`);
  }

  // 3b. The category claims (F268.7), pinned the same way and for the same reason: the corpus has
  // no fixture that fails one, so every part of the comparison could be deleted without a red run.
  // Each case moves exactly one of the sixteen numbers and holds the other fifteen.
  if (bothSides.categoryComparisons !== 20) {
    throw new Error('preset_checks self-check: a fixture reported '
      + `${bothSides.categoryComparisons} category comparisons and it makes twenty — five `
      + 'quantities on each of two sides, each a mean and a spread. An absent pair is compared '
      + 'against its default, so the count does not depend on what the fixture states.');
  }
  if (bothSides.categoryStated !== 0 || bothSides.categoryFailures.length !== 0) {
    throw new Error('preset_checks self-check: a fixture stating no category pair against an '
      + `evaluation whose categories are all zero was judged ${JSON.stringify(bothSides)}.`);
  }
  // (a) An absent pair is an expectation of **zero**, not an absent expectation. This is the whole
  // of what the 9,204 unwritten pairs buy, and without it they buy nothing.
  const silent = judge('__selfCheckCategorySilence', { expected: zero },
    { dmgToA: 0, dmgToB: 0, sdToA: 0, sdToB: 0,
      categories: evaluatedCategories({ 'B.undeadDamage': { mean: 0.5, sd: 0 } }) },
    null, realm.presetExpectation);
  if (silent.pass !== false || silent.categoryFailures.length !== 1) {
    throw new Error('preset_checks self-check: an evaluation booking 0.5 undead damage to the '
      + `defender against a fixture that states no \`undDmgToB\` was judged pass=${silent.pass}. `
      + 'An unwritten pair has to be compared against zero, or the corpus asserts nothing at all '
      + 'about the categories no fixture happens to mention.');
  }
  // (b) A stated pair fails on either moment alone, on either side, for every quantity.
  for (const side of ['A', 'B']) {
    for (const [field, sdField, metric] of [
      ['regDmgTo', 'sdRegDmgTo', 'regularDamage'],
      ['undDmgTo', 'sdUndDmgTo', 'undeadDamage'],
      ['irrDmgTo', 'sdIrrDmgTo', 'irreversibleDamage'],
      ['bonusHpTo', 'sdBonusHpTo', 'extraHits'],
      ['healTo', 'sdHealTo', 'healedDamage'],
    ]) {
      const expectation = { ...zero, [field + side]: 3, [sdField + side]: 1 };
      const exact = { 'A.x': null };
      delete exact['A.x'];
      const hit = { mean: 3, sd: 1 };
      const good = judge('__selfCheckCategoryHit', { expected: expectation },
        { dmgToA: 0, dmgToB: 0, sdToA: 0, sdToB: 0,
          categories: evaluatedCategories({ [`${side}.${metric}`]: hit }) },
        null, realm.presetExpectation);
      if (!good.pass || good.categoryStated !== 1) {
        throw new Error(`preset_checks self-check: ${field}${side} stated as 3/1 against an `
          + `evaluation of 3/1 was judged ${JSON.stringify(good)}.`);
      }
      for (const wrong of [{ mean: 3.003, sd: 1 }, { mean: 3, sd: 1.003 }]) {
        const bad = judge('__selfCheckCategoryMiss', { expected: expectation },
          { dmgToA: 0, dmgToB: 0, sdToA: 0, sdToB: 0,
            categories: evaluatedCategories({ [`${side}.${metric}`]: wrong }) },
          null, realm.presetExpectation);
        if (bad.pass !== false) {
          throw new Error(`preset_checks self-check: ${field}${side} stated as 3/1 against an `
            + `evaluation of ${wrong.mean}/${wrong.sd} passed, so one of that pair's two `
            + 'comparisons is not being made.');
        }
      }
    }
  }
  // The pairing rule, which is what makes a deleted standard deviation loud rather than a
  // comparison quietly halved. Both directions, because either half can be the one dropped.
  for (const lopsided of [{ dmgToB: 0 }, { sdDmgToB: 0 }, { dmgToA: 0, dmgToB: 0, sdDmgToB: 0 }]) {
    let halted = null;
    try {
      judge('__selfCheckLopsided', { expected: lopsided }, evaluatedNines, null,
        realm.presetExpectation);
    } catch (err) {
      halted = String((err && err.message) || err);
    }
    if (!halted) {
      throw new Error('preset_checks self-check: the expectation block '
        + `${JSON.stringify(lopsided)} states a mean without its standard deviation, or the other `
        + 'way round, and was accepted. A corpus can then lose half its comparisons silently.');
    }
  }
  // And a misspelled field is an expectation nothing would compare.
  let misspelled = null;
  try {
    judge('__selfCheckMisspelled', { expected: { dmgToB: 0, sdDmgB: 0 } }, evaluatedNines, null,
      realm.presetExpectation);
  } catch (err) {
    misspelled = String((err && err.message) || err);
  }
  if (!misspelled) {
    throw new Error('preset_checks self-check: an `expected` block carrying `sdDmgB` was accepted, '
      + 'so a misspelled field is an expectation nothing compares.');
  }

  // 4. A failing run leaves a non-zero exit status. Nothing above reaches that: `report` sets
  // `process.exitCode`, and removing that line prints `allPassed:false` and still exits 0, which
  // every CI runner reads as green (F260.9 review, finding 3). The only honest way to check it is
  // to run the command and look at what it returns, so this spawns one — over a single synthetic
  // fixture with an impossible expectation, which costs one source load.
  const probe = require('child_process').spawnSync(process.execPath,
    [__filename, SELF_FAIL_FLAG], { cwd: __dirname, encoding: 'utf8', timeout: 120000 });
  if (probe.error) {
    throw new Error('preset_checks self-check: could not run the exit-status probe - '
      + String(probe.error.message || probe.error));
  }
  if (probe.status !== 1 || !/presets FAILED/.test(probe.stderr || '')) {
    throw new Error('preset_checks self-check: a run whose only fixture misses its expectation '
      + `exited ${probe.status} and said ${JSON.stringify((probe.stderr || '').slice(0, 200))}. A `
      + 'failing run has to exit 1 and name the failure, or nothing downstream sees it as a '
      + 'failure at all.');
  }
}

// Runs one impossible fixture through the ordinary serial path and `report`, so the exit status the
// self-check reads is produced by the same code a real run uses rather than by a re-implementation.
function runSelfFailProbe(startVersion, options) {
  const { realm } = prepareRealm(startVersion);
  realm.PRESETS[SELF_FAIL_NAME] = SELF_FAIL_FIXTURE;
  const names = [SELF_FAIL_NAME];
  const started = Date.now();
  const { results, timings } = runSerial(names, startVersion, false, { wholeCorpus: false });
  report(names, results, timings, options, Date.now() - started, 1, false);
  // Deliberately no assertion here on `process.exitCode`. The point of this mode is to let the
  // *parent* observe what the process returns, and a throw in here would exit 1 for a reason other
  // than `report` having set the status - which is exactly the mutation the probe exists to catch,
  // and which it survived while this function guarded itself (F260.9, sweep 3 probe N4).
}

// The same guard the parallel path applies on a worker's first message, for the serial path.
function assertCorpusIsWhole(names, corpusSize) {
  if (corpusSize !== names.length) {
    throw new Error(`preset_checks: the corpus list holds ${names.length} fixtures and PRESETS `
      + `holds ${corpusSize}. A run covers the list, so a shorter list checks less and still `
      + 'passes.');
  }
}

// Chained evaluation: the page's model, one fixture over the previous fixture's finished card,
// which cannot be split across cores. Kept as a flag rather than as the default because it is the
// thing the parallel model has to be checked *against*, and because F260.8's gate already asserts
// the two agree on every derivation input.
function runSerial(names, startVersion, chained, { wholeCorpus = true, startBase = null } = {}) {
  const { realm, presetVersions } = prepareRealm(startVersion);
  if (wholeCorpus) assertCorpusIsWhole(names, Object.keys(realm.PRESETS).length);
  const results = [];
  const timings = [];
  let version = startVersion;
  let base = startBase;
  for (const name of names) {
    const preset = realm.PRESETS[name];
    let evaluated = null;
    let error = null;
    const started = Date.now();
    try {
      evaluated = evaluatePreset(realm, name, preset, {
        origin: ORIGIN, version, presetVersions, base,
      });
    } catch (err) {
      error = String((err && err.message) || err);
    }
    timings.push({ name, ms: Date.now() - started });
    results.push(judge(name, preset, evaluated, error, realm.presetExpectation));
    if (chained && evaluated) {
      version = evaluated.state.version;
      base = { a: evaluated.state.a, b: evaluated.state.b };
    }
  }
  return { results, timings };
}

// Dispatch one fixture at a time to whichever worker is idle. Static shards would be simpler and
// worse: the corpus is dominated by four fixtures, so a shard holding two of them decides the wall
// clock on its own.
function runParallel(names, startVersion, workerCount) {
  return new Promise((resolve, reject) => {
    const results = [];
    const timings = [];
    let next = 0;
    let live = workerCount;
    let settled = false;
    const fail = err => {
      if (settled) return;
      settled = true;
      reject(err instanceof Error ? err : new Error(String(err)));
    };
    const workers = [];
    const hand = worker => {
      if (next >= names.length) { worker.postMessage({ done: true }); return; }
      worker.postMessage({ name: names[next++] });
    };
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(__filename, { workerData: { startVersion } });
      workers.push(worker);
      worker.on('message', message => {
        if (message.ready) {
          // The main thread's corpus list and the worker's `PRESETS` come from two loads of the
          // same manifest, and only the list decides how many fixtures get evaluated. A run over
          // a truncated list would report `allPassed` on everything it looked at, which is the
          // failure mode that reads as green — so the two counts are compared rather than trusted.
          if (message.corpusSize !== names.length) {
            fail(new Error(`preset_checks: the main thread listed ${names.length} fixtures and a `
              + `worker's PRESETS holds ${message.corpusSize}. The corpus a run covers is the `
              + 'list, so a shorter list would simply check less and still pass.'));
            return;
          }
          hand(worker);
          return;
        }
        results.push(message.result);
        timings.push({ name: message.result.name, ms: message.ms });
        hand(worker);
      });
      // A worker that throws while loading the sources, or while evaluating, takes the run down.
      // Silently finishing with fewer fixtures than the corpus has is the failure that looks green.
      worker.on('error', err => fail(err));
      worker.on('exit', code => {
        if (code !== 0) { fail(new Error(`preset_checks: a worker exited with code ${code}.`)); return; }
        live -= 1;
        if (live === 0 && !settled) {
          settled = true;
          if (results.length !== names.length) {
            reject(new Error(`preset_checks: the workers returned ${results.length} results for `
              + `${names.length} fixtures, so the corpus was not fully evaluated.`));
            return;
          }
          resolve({ results, timings });
        }
      });
    }
    if (workerCount === 0) fail(new Error('preset_checks: no workers were started.'));
  });
}

// `wholeCorpus` is false in exactly one place: the exit-status probe below, which reports over one
// synthetic fixture on purpose. The corpus-shape guards state facts about the shipped corpus and
// have nothing to say about a one-fixture run, so they are asked only of a run that covered it.
// Every other caller passes the whole list, and a list that has quietly become shorter is what
// `assertCorpusIsWhole` and the worker corpus-size comparison already stand against.
function report(names, results, timings, options, elapsedMs, workerCount, wholeCorpus = true) {
  if (new Set(results.map(result => result.name)).size !== results.length) {
    throw new Error(`preset_checks: ${results.length} results came back under `
      + `${new Set(results.map(result => result.name)).size} distinct names, so a fixture was `
      + 'evaluated more than once and another not at all.');
  }
  const byName = new Map(results.map(result => [result.name, result]));
  const ordered = names.map(name => {
    const result = byName.get(name);
    if (!result) {
      throw new Error(`preset_checks: no result came back for '${name}'.`);
    }
    return result;
  });

  const checked = ordered.filter(result => result.checked);
  const unchecked = ordered.filter(result => !result.checked);
  // Every result, not only the `checked` ones. `checked` means "this fixture compared a total", and
  // a fixture can compare no total and still make — and fail — sixteen category comparisons. The
  // first version filtered failures by `checked`, so an `expected: {}` block was enough to make a
  // fixture fail its categories and be dropped from the verdict, leaving `allPassed: true` and
  // every shape literal untouched (GPT review of F268.7, finding 2, reproduced).
  const failures = ordered.filter(result => !result.pass);
  const allPassed = failures.length === 0;
  // Fixtures that state a block. The shape guards below are asked of these rather than of `checked`
  // for the same reason: `expected: {}` states a block, compares no total, and must not therefore
  // escape the rule that every fixture stating a block states the defender side.
  const withBlock = ordered.filter(result => result.hasExpectedBlock);

  // `tests/preset-equivalence-gate.spec.js`'s vacuity guard, sharpened: a zero-length run is the one failure mode
  // that reads as green, and so is a run in which every `expected` block is present but empty.
  //
  // The unit is the **number compared**, so the field F268.3 added is visible in it: a corpus that
  // states 1,145 attacker means and 1,161 defender means made 2,306 comparisons before the spreads
  // and makes 4,612 with them, and a spread quietly dropped from the fixture files halves the
  // count where it does not simply halt.
  const comparisons = ordered.reduce((total, result) => total + (result.comparisons || 0), 0);
  if (checked.length === 0 || comparisons === 0) {
    throw new Error(`preset_checks: ${ordered.length} fixtures were evaluated and `
      + `${comparisons} numeric comparisons were made, so this run checked nothing while `
      + 'reporting a pass. An `expected` block stating no mean is not a check.');
  }
  // The count alone does not make a reduction loud, because the count is derived from the very
  // expectations that would have been deleted: removing a fixture's whole attacker side (both its
  // mean and its spread together, which the pairing rule permits) took the corpus from 4,612
  // comparisons to 4,610 and reported a pass (GPT review of F268.3, finding 1). So the *shape* of
  // the corpus is pinned here, independently of what the fixtures happen to say:
  //
  //   * every checked fixture states the defender side. All 1,161 do, and a fixture that computes
  //     no damage to the defender still states `dmgToB: 0`;
  //   * at most 16 fixtures omit the attacker side, which is the number that omit it today.
  //
  // Both are corpus facts a new fixture must respect or change deliberately, and either edit halts
  // rather than quietly shortening the run. Raising the ceiling is a decision; hitting it is not.
  // The same lesson applied to the category fields (F268.7). Their comparison count cannot be a
  // guard either: sixteen numbers are compared per fixture whether or not a fixture states any of
  // them, so deleting every category pair in the corpus leaves the count at exactly what it was and
  // turns 168 real assertions into 168 assertions that zero is zero. What is pinned instead is how
  // many fixtures *state* each field, as literals — the shipped counts, measured 2026-09-06 over
  // the whole corpus. A pair deleted from a fixture drops one of these below its floor and halts;
  // a pair that legitimately disappears because the implementation changed is a decision to lower a
  // number here, not something that happens quietly.
  //
  // A floor of 0 is not a guard and does not pretend to be one: those four quantities are zero in
  // every shipped fixture, so there is nothing for a floor to hold. It is written out rather than
  // omitted so that a field whose floor becomes reachable is a line to change, not a line to add.
  const CATEGORY_STATED_FLOOR = {
    regDmgToA: 6, undDmgToA: 0, irrDmgToA: 1, bonusHpToA: 9, healToA: 6,
    regDmgToB: 73, undDmgToB: 9, irrDmgToB: 59, bonusHpToB: 0, healToB: 0,
  };
  const CATEGORY_STATED_TOTAL_FLOOR = 163;
  const statedByField = new Map(Object.keys(CATEGORY_STATED_FLOOR).map(field => [field, 0]));
  for (const result of withBlock) {
    for (const field of result.categoryStatedFields || []) {
      if (!statedByField.has(field)) {
        throw new Error(`preset_checks: fixture '${result.name}' states the category field `
          + `'${field}', which is not one of ${[...statedByField.keys()].join(', ')}. The floors `
          + 'below name every field this corpus has, so a new one is a floor to add.');
      }
      statedByField.set(field, statedByField.get(field) + 1);
    }
  }
  const shortfalls = !wholeCorpus ? [] : [...statedByField.entries()]
    .filter(([field, count]) => count < CATEGORY_STATED_FLOOR[field])
    .map(([field, count]) => `${field} ${count} < ${CATEGORY_STATED_FLOOR[field]}`);
  if (shortfalls.length) {
    throw new Error(`preset_checks: ${shortfalls.length} category field(s) are stated by fewer `
      + `fixtures than the shipped corpus states them [${shortfalls.join(', ')}]. A pair deleted `
      + 'from a fixture text costs the run nothing it can see — the comparison is still made, '
      + 'against zero — so the count is pinned here rather than derived from the fixtures it is '
      + 'checking.');
  }
  const categoryStated = withBlock.reduce(
    (total, result) => total + (result.categoryStated || 0), 0);
  if (wholeCorpus && categoryStated < CATEGORY_STATED_TOTAL_FLOOR) {
    throw new Error(`preset_checks: ${categoryStated} category pairs are stated across the corpus `
      + `and the shipped corpus states ${CATEGORY_STATED_TOTAL_FLOOR}. Every unstated pair is `
      + 'still compared, against zero, so a wholesale deletion would otherwise be invisible.');
  }
  const categoryComparisons = ordered.reduce(
    (total, result) => total + (result.categoryComparisons || 0), 0);

  const ATTACKER_SILENT_CEILING = 16;
  const noDefender = withBlock.filter(result => !result.comparedB).map(result => result.name);
  if (noDefender.length) {
    throw new Error(`preset_checks: ${noDefender.length} fixture(s) state no \`dmgToB\` `
      + `[${noDefender.slice(0, 8).join(', ')}]. Every fixture in this corpus states the defender `
      + 'side, so a missing one is a comparison deleted rather than a fixture that had none.');
  }
  const noAttacker = withBlock.filter(result => !result.comparedA).map(result => result.name);
  if (noAttacker.length > ATTACKER_SILENT_CEILING) {
    throw new Error(`preset_checks: ${noAttacker.length} fixtures state no \`dmgToA\`, and at most `
      + `${ATTACKER_SILENT_CEILING} do in the shipped corpus [${noAttacker.slice(0, 8).join(', ')}]`
      + '. Deleting an attacker expectation lowers the comparison count without failing anything, '
      + 'so the ceiling is pinned here rather than derived from the fixtures it is checking.');
  }

  const detail = failures.map(f => (f.error
    ? `  ${f.name}: threw — ${f.error}`
    : `  ${f.name}: A=${f.dmgToA} (expected ${f.expectedA}, err ${f.errA}), `
      + `B=${f.dmgToB} (expected ${f.expectedB}, err ${f.errB}), `
      + `sdA=${f.sdToA} (expected ${f.expectedSdA}, err ${f.errSdA}), `
      + `sdB=${f.sdToB} (expected ${f.expectedSdB}, err ${f.errSdB})`
      + (f.categoryFailures && f.categoryFailures.length
        ? `; ${f.categoryFailures.join('; ')}` : ''))).join('\n');

  if (options.slowest > 0) {
    const slowest = [...timings].sort((x, y) => y.ms - x.ms).slice(0, options.slowest);
    console.error(`slowest ${slowest.length}: `
      + slowest.map(entry => `${entry.name} ${entry.ms}ms`).join(', '));
  }
  if (unchecked.length) {
    console.error(`${unchecked.length} fixture(s) state no \`expected\` block and were evaluated `
      + `but not checked: ${unchecked.map(result => result.name).join(', ')}`);
  }

  const summary = {
    allPassed,
    total: checked.length,
    comparisons,
    categoryComparisons,
    categoryStated,
    evaluated: ordered.length,
    unchecked: unchecked.map(result => result.name),
    elapsedMs,
    mode: options.compareChained ? 'serial-compare-chained'
      : options.compareBase ? 'serial-compare-base'
        : options.chained ? 'serial-chained'
          : options.serial ? 'serial' : `parallel-${workerCount}`,
    failures: failures.map(f => ({
      name: f.name, dmgToA: f.dmgToA, expectedA: f.expectedA, errA: f.errA,
      dmgToB: f.dmgToB, expectedB: f.expectedB, errB: f.errB,
      sdToA: f.sdToA, expectedSdA: f.expectedSdA, errSdA: f.errSdA,
      sdToB: f.sdToB, expectedSdB: f.expectedSdB, errSdB: f.errSdB, error: f.error,
    })),
  };

  if (options.json) {
    console.log(JSON.stringify(summary));
  } else {
    console.log(JSON.stringify({
      allPassed, total: summary.total, comparisons, categoryComparisons, categoryStated,
      evaluated: summary.evaluated, elapsedMs, mode: summary.mode, failures: summary.failures,
    }));
  }
  if (!allPassed) {
    console.error(`${failures.length}/${checked.length} presets FAILED:\n${detail}`);
    process.exitCode = 1;
  }
  return allPassed;
}

// Two walks of the corpus, compared fixture by fixture on the two numbers each publishes. Both
// walks share one realm, so a difference cannot come from a different load — and, for the same
// reason, this could not see a cache that keyed on the fixture name alone and served the first
// walk's answer to the second. No such cache exists in the sources today (the roster helper builds
// its list per call, `Calculator/card_state.js:1365`), which is what makes the comparison worth
// anything.
function compareWalks(flag, names, first, second, describe) {
  const byName = new Map(second.map(result => [result.name, result]));
  const differences = [];
  for (const result of first) {
    const other = byName.get(result.name);
    if (!other) {
      throw new Error(`preset_checks: '${result.name}' came back from one walk and not the other.`);
    }
    // All four moments, not the two means: the claim the two walks are compared on is that they
    // publish the same distributions, and two walks agreeing on a mean while disagreeing on a
    // spread is exactly the divergence F268.3 added the field to see.
    if (result.dmgToA !== other.dmgToA || result.dmgToB !== other.dmgToB
      || result.sdToA !== other.sdToA || result.sdToB !== other.sdToB
      || result.error !== other.error) {
      differences.push(`  ${result.name}: ${describe[0]} A=${result.dmgToA} B=${result.dmgToB} `
        + `sdA=${result.sdToA} sdB=${result.sdToB}`
        + `${result.error ? ' threw ' + result.error : ''} | ${describe[1]} A=${other.dmgToA} `
        + `B=${other.dmgToB} sdA=${other.sdToA} sdB=${other.sdToB}`
        + `${other.error ? ' threw ' + other.error : ''}`);
    }
  }
  if (differences.length) {
    throw new Error(`preset_checks ${flag}: ${differences.length}/${names.length} fixtures give `
      + `different numbers ${describe[0]} than ${describe[1]}:\n`
      + differences.slice(0, 20).join('\n'));
  }
  console.log(JSON.stringify({ comparison: flag, total: names.length, differences: 0 }));
  return first;
}

// The parallelisation licence, re-checked on the numbers rather than on the derivation inputs.
// F260.8's gate proves the independent and the chained walk build the same *input* for every
// fixture, which is the sharper claim; this is the blunter one the user actually reads — that the
// two produce the same two averages. Blunter because rounding to three decimals can absorb a small
// input difference, so this passing does not re-prove the gate. It is the property the split needs,
// stated where the split is made.
function compareChained(names, startVersion) {
  return compareWalks('--compare-chained', names,
    runSerial(names, startVersion, false).results,
    runSerial(names, startVersion, true).results,
    ['applied independently', 'applied one over the next']);
}

// The other claim `presetDefaultCardState` rests on: that it does not matter which of the two
// starting cards the corpus is walked from. This runner takes the applier's default `base`, and it
// is the first caller that does — every page caller passes its own. F260.8's gate does not settle
// this (it hands the page's card to both of its walks), so it is measured here instead of cited.
function compareBase(names, startVersion) {
  const { realm } = prepareRealm(startVersion);
  // The card `resetCalculatorState` actually leaves: the field defaults, and then `selectDefaultUnit`
  // on `DEFAULT_UNITS` (`ui_state.js`) — Hell Hounds and War Bears.
  const PAGE_DEFAULT_UNITS = { a: 'Hell Hounds', b: 'War Bears' };
  const pageBase = {};
  for (const prefix of ['a', 'b']) {
    const record = realm.rosterRecordsForVersion(startVersion)
      .find(unit => unit.name === PAGE_DEFAULT_UNITS[prefix]);
    if (!record) {
      throw new Error(`preset_checks --compare-base: the ${startVersion} roster carries no `
        + `'${PAGE_DEFAULT_UNITS[prefix]}', which is what DEFAULT_UNITS (\`ui_state.js\`) selects `
        + `for side ${prefix} on a fresh page.`);
    }
    pageBase[prefix] = realm.applyRosterUnit(
      realm.presetDefaultCardState(prefix, startVersion), record, startVersion);
  }
  return compareWalks('--compare-base', names,
    runSerial(names, startVersion, false).results,
    runSerial(names, startVersion, false, { startBase: pageBase }).results,
    ['from the applier default card', "from the page's own starting card"]);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const startVersion = defaultSelectedVersion();
  if (options.selfFailProbe) {
    runSelfFailProbe(startVersion, options);
    return;
  }
  const { names, context } = readCorpus();
  runSelfChecks(context);
  if (options.compareChained || options.compareBase) {
    const started = Date.now();
    const results = options.compareChained
      ? compareChained(names, startVersion)
      : compareBase(names, startVersion);
    report(names, results, results.map(r => ({ name: r.name, ms: 0 })), options,
      Date.now() - started, 1);
    return;
  }
  const workerCount = options.serial
    ? 1
    : Math.max(1, Math.min(options.workers || os.availableParallelism(), names.length));

  const started = Date.now();
  const { results, timings } = options.serial
    ? runSerial(names, startVersion, options.chained)
    : await runParallel(names, startVersion, workerCount);
  report(names, results, timings, options, Date.now() - started, workerCount);
}

if (isMainThread) {
  main().catch(err => {
    console.error(err.stack || String(err));
    process.exit(1);
  });
} else {
  runWorker();
}

module.exports = { TOLERANCE };
