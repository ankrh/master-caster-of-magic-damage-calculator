// The preset corpus through the page: the shipped page's own rendered moments
// for all 1,161 fixtures, the field-by-field input comparison against the Node
// realm, and the page's own preset harness over the derived control-path sample.
const { test, expect } = require('@playwright/test');
const { expectNoConsoleErrors, openCalculator } = require('./helpers');

// --- from preset-equivalence-gate-f260.8.spec.js ---
const {
  FIELD_WALK_SOURCE, syntheticFixtures,
  presetDerivationInputs, censusUnvariedFields, UNSTATEABLE_FIELDS, loadPresetContext,
  censusIdenticalFieldVectors, explainVectorGroup,
} = require('../tools/preset_derivation_inputs');
// The page's starting version has one Node reader (F260.10); this spec asserts the page agrees.
const { defaultSelectedVersion } = require('../tools/calculator_sources');

// One evaluate per chunk. `applyPreset` recalculates, so the walk is the expensive part of this
// spec; the chunking exists to keep one serialised payload small, not to parallelise anything —
// the presets must be applied in corpus order, because each is applied over the card the previous
// one left.
const CHUNK = 60;

// How many differing presets to report in full. A diff that names one field of one preset cannot
// tell a systematic divergence from a one-off, so every differing field of each is reported.
const MAX_REPORTED_PRESETS = 8;

// The browser half: apply these presets in order and return, per preset, the same flattened field
// maps the Node half returns.
const pageWalk = ({ names, walkSource }) => {
  const flattenFields = new Function(`${walkSource}; return flattenFields;`)();
  const out = {};
  for (const name of names) {
    applyPreset(name);
    const globals = collectGlobals();
    const a = collectCardState('a');
    const b = collectCardState('b');
    // The rendered means, read where `runTests` reads them. `applyPreset` has just recalculated,
    // so this costs nothing here and closes what comparing *inputs* cannot see: everything the
    // page does after building the input — `readUnitStats` handing it to `deriveUnitStats`,
    // `recalculate` wiring the combat arguments, `resolveCombat`, and `renderDistPanel` computing
    // the mean it prints. Node reaches none of that, and a defect in it moves a number while every
    // field of every derivation input still matches (GPT review of F260.10, finding 1: forcing
    // `abilities.longRange = false` inside `readUnitStats` moves `longRangeMissile` 0.900 -> 0.700
    // with the gate's field comparison green).
    const panels = document.querySelectorAll('.dist-header .avg');
    out[name] = {
      version: document.getElementById('gameVersion').value,
      a: JSON.stringify(flattenFields(cardStateToDerivationInput(a, globals))),
      b: JSON.stringify(flattenFields(cardStateToDerivationInput(b, globals))),
      state: JSON.stringify(flattenFields({ a, b, globals })),
      rendered: [parseFloat(panels[0].textContent), parseFloat(panels[1].textContent),
        parseFloat(panels[0].dataset.sd), parseFloat(panels[1].dataset.sd)],
    };
  }
  return out;
};

// The saturating fixtures take a different route into the page, and this is the one deliberate
// weakening in the gate. They state every ability at once, and the page's `recalculate()` renders a
// breakdown row and a rider chain for every one of them: measured, ~65 s per fixture in the
// browser against 414 ms for the same combat in Node with chains asked for, so the whole saturated
// leg through `applyPreset` does not finish. What runs instead is `applyPreset`'s body with its
// last line left off — the version switch, the unit selection, the control writer for both sides,
// the lock and display refresh, the globals writer and the visibility pass — and then the card is
// read back and projected. The step not taken computes the numbers this gate does not read.
//
// The corpus leg runs the full `applyPreset`, 1,161 times. What this leg adds is the values the
// corpus never states.
const pageWriteWalk = ({ names, states, walkSource }) => {
  const flattenFields = new Function(`${walkSource}; return flattenFields;`)();
  const out = {};
  for (const name of names) {
    const applied = states[name];
    const versionSel = document.getElementById('gameVersion');
    if (versionSel.value !== applied.version) {
      versionSel.value = applied.version;
      onVersionChange();
    }
    for (const prefix of ['a', 'b']) {
      const select = document.getElementById(prefix + 'Unit');
      const unitName = applied.rosterNames[prefix];
      select.value = unitName
        ? String(loadUnitDatabase(applied.version).find(u => u.name === unitName).id)
        : 'custom';
      writeCardStateToControls(prefix, applied[prefix], `gate ${name} side ${prefix}`);
      refreshUnitLockDom(prefix);
      syncUnitDisplay(prefix);
    }
    writeGlobalsToControls(applied.globals);
    refreshAbilityFieldVisibility();
    const globals = collectGlobals();
    const a = collectCardState('a');
    const b = collectCardState('b');
    out[name] = {
      version: versionSel.value,
      a: JSON.stringify(flattenFields(cardStateToDerivationInput(a, globals))),
      b: JSON.stringify(flattenFields(cardStateToDerivationInput(b, globals))),
      state: JSON.stringify(flattenFields({ a, b, globals })),
    };
  }
  return out;
};

// Every differing field of every differing preset, in the reporting style
// `tools/derivation_equivalence_diff.js` uses: the case, then the exact field path with both
// values, so a divergence names the stat rather than the file.
function diffCases(expected, actual) {
  const differing = [];
  let fieldDiffs = 0;
  for (const name of Object.keys(expected)) {
    const node = expected[name];
    const page = actual[name];
    if (!page) {
      differing.push({ preset: name, fields: [{ field: '(whole case)', node: 'present', page: 'missing' }] });
      continue;
    }
    const fields = [];
    if (node.version !== page.version) {
      fields.push({ field: 'version', node: node.version, page: page.version });
    }
    for (const part of ['a', 'b', 'state']) {
      if (node[part] === page[part]) continue;
      const nodeFlat = JSON.parse(node[part]);
      const pageFlat = JSON.parse(page[part]);
      for (const field of new Set([...Object.keys(nodeFlat), ...Object.keys(pageFlat)])) {
        if (nodeFlat[field] === pageFlat[field]) continue;
        fields.push({
          field: part === 'state' ? `state.${field}` : `input.${part}.${field}`,
          node: nodeFlat[field] === undefined ? '(absent)' : nodeFlat[field],
          page: pageFlat[field] === undefined ? '(absent)' : pageFlat[field],
        });
      }
    }
    if (fields.length) {
      fieldDiffs += fields.length;
      differing.push({ preset: name, fields });
    }
  }
  return {
    presets: differing.length,
    fieldDiffs,
    reported: differing.slice(0, MAX_REPORTED_PRESETS),
    more: Math.max(0, differing.length - MAX_REPORTED_PRESETS),
  };
}

// The walk both tests run: Node first, then the page over the same names in the same order.
async function runGate(page, { fixtures, names, viaWriter }) {
  // The card the page is actually on before the walk, handed to the Node walk as its starting
  // state. Node cannot know it: a fresh page holds a roster record on both sides
  // (`DEFAULT_UNITS`, `ui_state.js`), not the `presetDefaultCardState` its own comment claims.
  // Whether that choice can change the corpus at all is the third test.
  const base = await page.evaluate(() => ({
    a: collectCardState('a'), b: collectCardState('b'),
  }));
  const built = presetDerivationInputs({ fixtures, names, base });
  if (fixtures) {
    await page.evaluate(installed => { Object.assign(PRESETS, installed); }, fixtures);
  }
  // The corpus the page holds must be the corpus Node read, in the same order: the walk chains, so
  // a page whose PRESETS differed would not merely test fewer fixtures, it would test a different
  // sequence and report the difference as a divergence.
  const pageOrder = await page.evaluate(() => Object.keys(PRESETS));
  const pageVersion = await page.evaluate(() => document.getElementById('gameVersion').value);
  expect(pageVersion, 'the page starts on the version index.html marks selected')
    .toBe(defaultSelectedVersion());

  const actual = {};
  for (let i = 0; i < built.order.length; i += CHUNK) {
    const chunk = built.order.slice(i, i + CHUNK);
    if (viaWriter) {
      const states = {};
      for (const name of chunk) states[name] = built.states[name];
      Object.assign(actual, await page.evaluate(pageWriteWalk, {
        names: chunk, states, walkSource: FIELD_WALK_SOURCE,
      }));
    } else {
      Object.assign(actual, await page.evaluate(pageWalk, {
        names: chunk, walkSource: FIELD_WALK_SOURCE,
      }));
    }
  }
  // The rendered means travel beside the field maps and are lifted out before the field
  // comparison, which knows only about derivation-input fields.
  const rendered = {};
  for (const [name, entry] of Object.entries(actual)) {
    if (entry.rendered) { rendered[name] = entry.rendered; delete entry.rendered; }
  }
  return { built, pageOrder, rendered, diff: diffCases(built.cases, actual) };
}

// The numeric half, over the whole corpus and in the browser. `tools/preset_checks.js` makes the
// same comparison headlessly and `tests/presets.spec.js` makes it over a sample; this is the only
// place the *shipped page's* own number is compared to the fixture's expectation for all 1,161, and
// it is what the F260.10 authority transfer rests on. Tolerance and rounding are `runTests`'.
//
// Two moments per side since F268.3, both read off the same `.avg` element: its text is the mean
// and its `data-sd` is the standard deviation, so a panel cannot contribute one moment from this
// render and the other from the render before it.
const RENDER_TOLERANCE = 0.002;

function expectRenderedMoments(result) {
  const context = loadPresetContext();
  const PRESETS = require('vm').runInContext('PRESETS', context);
  const failures = [];
  let compared = 0;
  for (const [name, [dmgToA, dmgToB, sdToA, sdToB]] of Object.entries(result.rendered)) {
    const expected = (PRESETS[name] || {}).expected;
    if (!expected) continue;
    for (const [field, actual] of [['dmgToA', dmgToA], ['dmgToB', dmgToB],
      ['sdDmgToA', sdToA], ['sdDmgToB', sdToB]]) {
      if (expected[field] == null) continue;
      compared += 1;
      const error = Math.abs(actual - expected[field]);
      if (!(error < RENDER_TOLERANCE)) {
        failures.push(`${name}.${field}: page rendered ${actual}, fixture states `
          + `${expected[field]} (err ${error.toFixed(4)})`);
      }
    }
  }
  // A run that compared nothing passes vacuously, which is the failure mode that looks green.
  // 4,612 for the shipped corpus: a mean and a standard deviation for each of 1,145 attacker and
  // 1,161 defender expectations. The floor is below that because the corpus grows, and far above
  // half of it because a leg that had quietly gone back to comparing only the means would
  // otherwise look green (F268.3).
  expect(compared, 'the gate compared no rendered moment against a fixture expectation')
    .toBeGreaterThan(4000);
  expect(failures.length,
    `${failures.length} rendered moment(s) differ from the fixture's expectation:\n  `
    + failures.slice(0, MAX_REPORTED_PRESETS).join('\n  ')).toBe(0);
}

function expectAgreement(result, { minimum }) {
  const { diff, built } = result;
  expect(Object.keys(built.cases).length,
    'the gate walked the whole corpus, not a prefix of it').toBeGreaterThanOrEqual(minimum);
  const report = diff.reported.map(entry => `${entry.preset}\n`
    + entry.fields.map(f => `    ${f.field}: node ${f.node} -> page ${f.page}`).join('\n'))
    .join('\n  ');
  expect(diff.presets,
    `${diff.presets} preset(s) differ between the Node and the page path `
    + `(${diff.fieldDiffs} field differences)${diff.more ? `, ${diff.more} more not shown` : ''}:\n  `
    + report).toBe(0);
}

test('every shipped preset builds the same derivation input in Node as on the page, and the page renders the mean its fixture states',
  async ({ page }) => {
    test.setTimeout(900_000);
    const errors = await openCalculator(page);
    const result = await runGate(page, {});
    expect(result.pageOrder, 'the page and Node read the same preset corpus, in the same order')
      .toEqual(result.built.order);
    expectAgreement(result, { minimum: 1000 });
    expectRenderedMoments(result);
    expectNoConsoleErrors(errors);
  });

// **The execution model F260.9 will have.** The page applies a preset over the card the previous
// one left; a Node evaluator that parallelises across cores applies each preset over the starting
// card instead. Those are different runs, and `presetToCardState` names four fields a `base` can
// still reach (`modernAttacks` on a custom DOS side, and `level`/`weapon`/`armor` on an unlocked
// roster side whose fixture states none), so the difference is not obviously empty.
//
// It is not empty: 138 of the 1,161 shipped fixtures finish on a different **card state** when
// applied independently. What this asserts is the part that decides whether F260.9 may
// parallelise — that no such difference reaches a **derivation input**, because
// `cardStateToDerivationInput` nulls the modern attack record off the DOS versions, which is where
// every one of them lives. A fixture that made one reach the input would be a fixture whose number
// depends on what was applied before it, and this fails naming it.
//
// This replaces a weaker check. Comparing two *chained* walks with different starting cards, as
// the first version of this spec did, cannot see the difference at all: the first preset overwrites
// it. Measured — seeding `presetDefaultCardState` with a wrong `hp` (probe M4) or a wrong `level`
// (probe M11) left that check green (GPT review of F260.8, finding 1).
test('a preset states the same unit applied on its own as applied after the others',
  async ({ page }) => {
    test.setTimeout(300_000);
    const errors = await openCalculator(page);
    const base = await page.evaluate(() => ({
      a: collectCardState('a'), b: collectCardState('b'),
    }));
    const chained = presetDerivationInputs({ base });
    const independent = presetDerivationInputs({ base, chain: false });

    const inputDiffs = [];
    const stateFields = new Map();
    let differingPresets = 0;
    for (const name of Object.keys(chained.cases)) {
      const one = chained.cases[name];
      const other = independent.cases[name];
      let differs = one.version !== other.version;
      if (differs) inputDiffs.push(`${name}: version ${one.version} -> ${other.version}`);
      for (const part of ['a', 'b', 'state']) {
        if (one[part] === other[part]) continue;
        differs = true;
        const chainedFlat = JSON.parse(one[part]);
        const aloneFlat = JSON.parse(other[part]);
        for (const field of new Set([...Object.keys(chainedFlat), ...Object.keys(aloneFlat)])) {
          if (chainedFlat[field] === aloneFlat[field]) continue;
          if (part === 'state') {
            stateFields.set(field, (stateFields.get(field) || 0) + 1);
          } else if (inputDiffs.length < 40) {
            inputDiffs.push(`${name} input.${part}.${field}: chained ${chainedFlat[field]}`
              + ` -> alone ${aloneFlat[field]}`);
          }
        }
      }
      if (differs) differingPresets += 1;
    }

    // Non-vacuity: the two models really are different runs. If this ever becomes zero the
    // assertion below stops meaning anything and the corpus has changed, not the code.
    expect(differingPresets,
      'the chained and the independent walk must differ somewhere, or this proves nothing')
      .toBeGreaterThan(0);
    // The whole content: no difference reaches a derivation input, so the numbers are the same.
    expect(inputDiffs, `a preset's derivation input depends on what was applied before it:\n  `
      + inputDiffs.join(`\n  `)).toEqual([]);
    // And the card-state differences stay inside the fields `presetDefaultCardState` documents as
    // base-reachable. A fifth field appearing here is a new inheritance, and F260.9 has to know.
    const unexpected = [...stateFields.keys()]
      .filter(field => !/^[ab]\.(modernAttacks\.|level$|weapon$|armor$)/.test(field));
    expect(unexpected,
      'a card-state field outside the four the applier documents as reachable from `base` now '
      + 'depends on what was applied before it').toEqual([]);
    expectNoConsoleErrors(errors);
  });

// The fields the corpus never varies, stated deliberately and driven through both paths. Without
// this the gate would compare a default against a default on 169 of them, and a path that never
// wrote one would look identical to a path that wrote it correctly.
test('the fields no shipped fixture varies agree between Node and the page too', async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await openCalculator(page);
  const fixtures = syntheticFixtures(loadPresetContext());
  const names = Object.keys(fixtures);
  // Nine saturating fixtures per version plus the two defender-roster ones, which is what makes
  // every ability row carry its own vector of values rather than moving with its neighbours.
  expect(names.length, 'the generator states a fixture set for every version').toBeGreaterThan(40);
  const result = await runGate(page, { fixtures, names, viaWriter: true });
  expectAgreement(result, { minimum: names.length });
  expectNoConsoleErrors(errors);
});

// The census is what makes the test above honest: it is measured from what the gate actually
// applies, not from a list of fields somebody remembered to add. A field reported here is one the
// comparison cannot speak for, because both paths hold the same single value throughout — which is
// how `chaosConjunction` survived a suite that walked 1,161 fixtures.
test('no card-state or globals field is compared at one single value', () => {
  const fixtures = syntheticFixtures(loadPresetContext());
  const built = presetDerivationInputs({ fixtures });
  const unvaried = censusUnvariedFields(built.cases);
  const unexplained = unvaried.filter(entry => !UNSTATEABLE_FIELDS[entry.field]);
  expect(unexplained.map(entry => `${entry.field} = ${entry.value}`),
    'each of these fields holds one single value across every preset the gate applies, so the '
    + 'gate compares a default against a default for it. Vary it — a fixture that states it, or a '
    + 'roster record that carries it — or add it to UNSTATEABLE_FIELDS with the reason it cannot '
    + 'be varied.').toEqual([]);
  // Varying each field is necessary and not sufficient: two fields that hold the same value in
  // every case are indistinguishable, so a writer that sends one to the other's control survives.
  // The GPT review of F260.8 found `magitekScience` and `xenopsychology` in exactly that state,
  // and the fix was to give every ability row and every card scalar its own vector of values
  // rather than a shared one. A group that survives is allowed only when its members are
  // projections of one control — the modern mirror, the DOS flag byte, the globals record for a
  // panel-mounted battlefield enchantment, or an ability and the enchantment twin a fixture can
  // only address by their shared key.
  const groups = censusIdenticalFieldVectors(built.cases);
  const unexplainedGroups = groups
    .map(fields => ({ fields, why: explainVectorGroup(fields, UNSTATEABLE_FIELDS) }))
    .filter(entry => entry.why)
    .map(entry => `${entry.fields.join(' == ')} — ${entry.why}`);
  expect(unexplainedGroups, 'fields the gate cannot tell apart').toEqual([]);
  expect(groups.length, 'the census must actually find the structural groups, or it is not running')
    .toBeGreaterThan(5);

  // The other direction is reported rather than asserted: an exemption that has become varied is
  // a stale line to delete, not a regression to fail the gate on.
  const stale = Object.keys(UNSTATEABLE_FIELDS)
    .filter(field => !unvaried.some(entry => entry.field === field));
  if (stale.length) {
    console.log(`UNSTATEABLE_FIELDS lists ${stale.length} field(s) the corpus now varies, `
      + `which can be deleted: ${stale.join(', ')}`);
  }
});

// --- from presets.spec.js ---
const { controlPathSample } = require('../tools/preset_control_path_sample');

test('the control-path sample holds through the real controls', async ({ page }) => {
  test.setTimeout(600_000);
  const sample = controlPathSample();

  // The sample is computed, so its size is not a constant to assert against. What must hold is
  // that it is a sample of a corpus and not of nothing, and that it spans the rule sets: a
  // selector that silently returned one fixture, or five from one version, would look green.
  expect(sample.corpusSize, 'the preset corpus is empty').toBeGreaterThan(1000);
  expect(new Set(sample.names).size, 'the sample names a fixture twice')
    .toBe(sample.names.length);

  // Recomputed **from the returned names**, not read off the summary beside them. Every guard
  // inside the selector runs before it returns, so a `names` trimmed at the return statement
  // satisfies all of them and still reports five versions and seven files (GPT review of F260.10,
  // finding 3, probe R2). This is the check that makes the returned array answer for itself.
  const spread = { versions: new Set(), files: new Set() };
  for (const name of sample.names) {
    const entry = sample.meta[name];
    expect(entry, `the sample returned '${name}' with no version or fixture file`).toBeTruthy();
    spread.versions.add(entry.version);
    spread.files.add(entry.file);
  }
  expect(spread.versions.size,
    `the returned sample spans ${spread.versions.size} game version(s): `
    + `${[...spread.versions].sort().join(', ')}`).toBe(5);
  expect(spread.files.size,
    `the returned sample spans ${spread.files.size} fixture file(s): `
    + `${[...spread.files].sort().join(', ')}`).toBe(7);
  // A sample is a fraction of a corpus, not a handful of it. The floor is deliberately far below
  // today's 236 — it exists to catch collapse, not to pin a number that moves with the corpus.
  expect(sample.names.length,
    `the control-path sample selected ${sample.names.length} of ${sample.corpusSize} fixtures`)
    .toBeGreaterThan(100);

  const errors = await openCalculator(page);

  const result = await page.evaluate(names => runTests(undefined, names), sample.names);

  // A zero-length run passes vacuously, which is the one failure mode that looks green. Every
  // sampled fixture states an `expected` block, so the page must have evaluated all of them —
  // an inequality here means `runTests` skipped one silently.
  expect(result.total, `runTests evaluated ${result.total} of ${sample.names.length} sampled presets`)
    .toBe(sample.names.length);

  // ...and that it compared what those fixtures state. `total` counts fixtures run, which is not
  // the same claim: since F268.3 each stated side is a mean *and* a standard deviation, and a
  // runner that silently stopped comparing one of the two would keep `total` right. The expected
  // count is recomputed from the corpus in a separate evaluate, so the number `runTests` reports
  // answers to something other than itself.
  const statedComparisons = await page.evaluate(names => names.reduce((total, name) => {
    const expected = PRESETS[name].expected;
    return total + (expected.dmgToA != null ? 2 : 0) + (expected.dmgToB != null ? 2 : 0);
  }, 0), sample.names);
  expect(statedComparisons,
    'the sampled fixtures state no expectation to compare').toBeGreaterThan(2 * result.total);
  expect(result.comparisons,
    `runTests compared ${result.comparisons} numbers and the sampled fixtures state `
    + `${statedComparisons}`).toBe(statedComparisons);

  const detail = result.failures
    .map(f => `  ${f.name}: A=${f.dmgToA} (expected ${f.expectedA}, err ${f.errA}), `
            + `B=${f.dmgToB} (expected ${f.expectedB}, err ${f.errB}), `
            + `sdA=${f.sdToA} (expected ${f.expectedSdA}, err ${f.errSdA}), `
            + `sdB=${f.sdToB} (expected ${f.expectedSdB}, err ${f.errSdB})`)
    .join('\n');
  expect(result.allPassed,
    `${result.failures.length}/${result.total} sampled presets failed:\n${detail}`).toBe(true);

  // runTests logs its own failure summary through console.error, so this only adds signal
  // once the assertions above are green: an incidental page error during a preset run.
  expectNoConsoleErrors(errors);
});

// The drawer is the user-facing half of the same harness, and it is the caller that passes no
// filter. A `runTests` that only worked for a named list would break it silently, since nothing
// else calls it that way.
//
// `presetNamesToRun` is the whole of what the filter does, so this asserts the *selection* rather
// than paying minutes to observe it through 1,161 evaluations. Asserting the corpus counts instead
// would not do: with the selection inlined in `runTests`, a fallback returning `[]` made the drawer
// evaluate nothing while `Object.keys(PRESETS).length` stayed right (GPT review of F260.10,
// finding 4).
test('runTests with no filter still selects the whole corpus', async ({ page }) => {
  const sample = controlPathSample();
  const errors = await openCalculator(page);

  const selection = await page.evaluate(sampleNames => ({
    corpus: Object.keys(PRESETS).length,
    withExpectation: Object.values(PRESETS).filter(preset => preset.expected).length,
    unfiltered: presetNamesToRun().length,
    filtered: presetNamesToRun(sampleNames).length,
    // Corpus order, not the caller's: each applyPreset writes over the card the previous left.
    inCorpusOrder: presetNamesToRun(sampleNames.slice().reverse())
      .join() === presetNamesToRun(sampleNames).join(),
  }), sample.names);

  expect(selection.corpus).toBe(sample.corpusSize);
  expect(selection.withExpectation).toBe(sample.sampleableSize);
  expect(selection.unfiltered, 'an unfiltered runTests no longer selects the whole corpus')
    .toBe(sample.sampleableSize);
  expect(selection.filtered, 'a filtered runTests does not select exactly the sample')
    .toBe(sample.names.length);
  expect(selection.inCorpusOrder, 'the filtered selection follows the caller order, not the corpus')
    .toBe(true);

  // The fail-loud path: a name this build does not have must halt rather than shorten the run.
  // `toString` is the case a `name in PRESETS` test lets through — it is an inherited property of
  // every object and is not a shipped preset (same review, finding 5).
  for (const absent of ['thisPresetDoesNotExist', 'toString']) {
    const halted = await page.evaluate(name => {
      try {
        presetNamesToRun([name]);
        return null;
      } catch (error) {
        return String(error.message);
      }
    }, absent);
    expect(halted, `runTests accepted the preset name '${absent}', which this build does not have`)
      .toContain(absent);
  }

  expectNoConsoleErrors(errors);
});

// The browser half of `preset_checks`' `runSelfChecks`, and the reason it exists: Node pins its own
// comparison predicate with literal cases, and none of that reaches `runTests`. Dropping
// `&& errSdA < tolerance && errSdB < tolerance` from `runTests`'s `pass` expression left every
// suite green — the sample only ever runs fixtures that pass, and the counts it checks are counts
// of what the corpus *states*, not of what the predicate can fail on (GPT review of F268.3,
// finding 3).
//
// So this drives the predicate directly: one shipped fixture, cloned under a probe name with one
// number of its expectation moved, four times. `expectNoConsoleErrors` is deliberately absent —
// `runTests` reports its own failures through `console.error`, and three of these four are meant
// to fail.
test('runTests can fail on either spread, not only on the means', async ({ page }) => {
  await openCalculator(page);

  const verdicts = await page.evaluate(() => {
    const source = Object.keys(PRESETS).find(name => PRESETS[name].expected
      && PRESETS[name].expected.dmgToA != null && PRESETS[name].expected.dmgToB != null);
    if (!source) throw new Error('no shipped fixture states both sides');
    const out = { source };
    const probe = (label, move) => {
      const base = PRESETS[source];
      const clone = Object.assign({}, base, { expected: Object.assign({}, base.expected) });
      move(clone.expected);
      PRESETS['__f268_3_probe'] = clone;
      try {
        const result = runTests(undefined, ['__f268_3_probe']);
        out[label] = {
          allPassed: result.allPassed,
          comparisons: result.comparisons,
          failures: result.failures.length,
        };
      } finally {
        delete PRESETS['__f268_3_probe'];
      }
    };
    probe('unmoved', () => {});
    probe('sdDmgToA', expected => { expected.sdDmgToA += 0.5; });
    probe('sdDmgToB', expected => { expected.sdDmgToB += 0.5; });
    probe('dmgToB', expected => { expected.dmgToB += 0.5; });
    return out;
  });

  // The control: the unmodified fixture passes, and it compares four numbers rather than two.
  expect(verdicts.unmoved.allPassed,
    `the unmodified fixture '${verdicts.source}' did not pass`).toBe(true);
  expect(verdicts.unmoved.comparisons,
    'a fixture stating both sides did not compare four numbers').toBe(4);

  // Each moved number, on its own, must fail. `sdDmgToA` and `sdDmgToB` are the two the browser
  // predicate could silently stop reading; `dmgToB` is the pre-existing claim, kept as the control
  // that the probe mechanism itself works.
  for (const field of ['sdDmgToA', 'sdDmgToB', 'dmgToB']) {
    expect(verdicts[field].allPassed,
      `moving ${field} by 0.5 on '${verdicts.source}' still passed runTests`).toBe(false);
    expect(verdicts[field].failures,
      `moving ${field} produced ${verdicts[field].failures} failure(s)`).toBe(1);
  }
});

// F268.7's twin of the test above, over the eight category pairs. The corpus cannot demonstrate
// this claim either, and it has one failure mode the total-damage fields do not: an **absent pair
// is an expectation of zero**, not an absent expectation, and 9,204 of the corpus's 9,288 pairs are
// absent. If the browser stopped comparing an absent pair, 99% of the category coverage would
// vanish and every suite would stay green — so a deleted pair is probed by name, and it is the case
// this test exists for.
//
// The probe runs *behind its source fixture* rather than alone: a clone is in no `TEST_TREE` group,
// so it inherits the page's currently selected version, and the shipped fixtures that state a
// category pair are modern ones whose custom record a DOS version refuses. Running the real
// fixture first puts the page on the right version, exactly as the whole-corpus run does.
test('runTests compares the category pairs a fixture states and the ones it omits', async ({ page }) => {
  await openCalculator(page);

  const verdicts = await page.evaluate(() => {
    const source = Object.keys(PRESETS).find(name => PRESETS[name].expected
      && PRESETS[name].expected.irrDmgToB != null);
    if (!source) throw new Error('no shipped fixture states irrDmgToB');
    const out = { source };
    const probe = (label, move) => {
      const base = PRESETS[source];
      const clone = Object.assign({}, base, { expected: Object.assign({}, base.expected) });
      move(clone.expected);
      PRESETS['__f268_7_probe'] = clone;
      try {
        const result = runTests(undefined, [source, '__f268_7_probe']);
        out[label] = {
          allPassed: result.allPassed,
          categoryComparisons: result.categoryComparisons,
          categoryStated: result.categoryStated,
          failures: result.failures.map(failure => failure.name),
        };
      } finally {
        delete PRESETS['__f268_7_probe'];
      }
    };
    out.statedPairs = Object.keys(PRESETS[source].expected)
      .filter(field => /^(reg|und|irr)Dmg|^bonusHp|^heal/.test(field)).length;
    probe('unmoved', () => {});
    probe('mean', expected => { expected.irrDmgToB += 0.5; });
    probe('spread', expected => { expected.sdIrrDmgToB += 0.5; });
    // Regular damage carries the other absence rule — an unwritten pair asserts that side's
    // published *total*, not zero — so it is probed on its own. This is the field the F268.7
    // review found missing, and the mutation it found (regular damage silently not booked) is
    // exactly a regular pair departing from the total while the total stands still.
    probe('regularAsserted', expected => {
      expected.regDmgToB = (expected.dmgToB || 0) + 0.5;
      expected.sdRegDmgToB = expected.sdDmgToB;
    });
    // The pair deleted outright. The clone still computes 8 irrecoverable damage; with no
    // expectation to compare it against it must be compared against zero and fail.
    probe('deleted', expected => {
      delete expected.irrDmgToB;
      delete expected.sdIrrDmgToB;
    });
    return out;
  });

  expect(verdicts.unmoved.allPassed,
    `the unmodified fixture '${verdicts.source}' and its clone did not pass`).toBe(true);
  // Twenty per fixture whatever the fixture states, because an absent pair is still compared
  // against its default. Five quantities on each of two sides, each a mean and a spread.
  expect(verdicts.unmoved.categoryComparisons,
    'two fixtures did not make forty category comparisons').toBe(40);
  expect(verdicts.unmoved.categoryStated,
    `'${verdicts.source}' and its clone state ${verdicts.statedPairs} pairs each`)
    .toBe(verdicts.statedPairs * 2);
  expect(verdicts.deleted.categoryStated,
    'deleting the clone\'s irrecoverable pair left the stated count unchanged')
    .toBe(verdicts.statedPairs * 2 - 1);
  expect(verdicts.deleted.categoryComparisons,
    'deleting a pair changed the number of comparisons made').toBe(40);

  // Each of the three, on its own, fails — and fails on the clone, never on the shipped fixture.
  for (const label of ['mean', 'spread', 'deleted', 'regularAsserted']) {
    expect(verdicts[label].allPassed,
      `the '${label}' probe still passed runTests`).toBe(false);
    expect(verdicts[label].failures,
      `the '${label}' probe failed the wrong fixture`).toEqual(['__f268_7_probe']);
  }
});
