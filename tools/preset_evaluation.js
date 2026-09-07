'use strict';

// One fixture, from the shipped `expected` block's neighbours to the numbers a runner compares.
//
// This is the *only* headless evaluation of the preset corpus. It was carved out of
// `tools/preset_checks.js` by F268.3 because a second consumer arrived — the generator that writes
// the standard deviations into the fixture files (`tools/generate_preset_stdev.js`) — and a
// generator with its own copy of the translation would write values the checker never computes.
// The prohibition F260 satisfied by construction ("never reconstruct the applyPreset ->
// readUnitStats -> resolveCombat path in Node") is satisfied the same way here and for the same
// reason: `presetToCardState` and `cardStateToDerivationInput` are shipped sources, not a
// reconstruction, and this module only calls them.

const {
  loadPresetSourcesIntoRealm,
} = require('./calculator_sources');

// `presetToCardState`'s `origin`, as `applyPreset` passes it for a fixture the repository ships.
const ORIGIN = 'authored';

// The bindings an evaluation needs. A calculator source's top-level `const` lands in the realm's
// *lexical* global scope and never on `globalThis`, exactly as it does for a classic `<script>` in
// the browser — so the bindings are captured by evaluating their names rather than read off the
// global object, which would silently see `undefined` for half of them.
const REALM_BINDINGS = [
  'PRESETS', 'TEST_TREE', 'VERSION_DATA', 'presetVersionsFromTestTree', 'presetToCardState',
  'cardStateToDerivationInput', 'deriveUnitStats', 'resolveCombat', 'setStatStepDebug',
  // The corpus's expectation reader, shared with the page's `runTests` (`Calculator/presets.js`).
  'presetExpectation',
  // The second moment, shared with the page's `renderDistPanel` (`Calculator/engine.js`).
  'distributionStdDev',
  // The per-category and healing quantities (F268.7): the key list the fixture fields follow,
  // and the mean the page's own panel is rendered from.
  'COMBAT_CATEGORY_KEYS', 'expectedDamage',
  // `--compare-base` only; listed here so a rename halts the run rather than one flag.
  'presetDefaultCardState', 'rosterRecordsForVersion', 'applyRosterUnit',
];

// The page reads its two averages out of the rendered panels:
//
//     renderDistPanel   ->  <span class="avg" data-sd="${stdDev.toFixed(3)}">${expected.toFixed(3)}</span>
//     runTests          ->  parseFloat(panels[0].textContent), parseFloat(panels[0].dataset.sd)
//
// so what the tolerance is applied to is each moment rounded to three decimals, not the exact
// value. Rounding here as well is not cosmetic: at 0.002 tolerance a fixture sitting 0.0015 off its
// expectation can pass on one side of the rounding and fail on the other.
function renderedMean(dist) {
  if (!Array.isArray(dist)) {
    throw new Error('renderedMean: the distribution is ' + JSON.stringify(dist)
      + ', which is not the array `resolveCombat` publishes.');
  }
  let expected = 0;
  for (let d = 0; d < dist.length; d++) expected += d * dist[d];
  return parseFloat(expected.toFixed(3));
}

// The spread, through the shipped `distributionStdDev` the page's panel uses. Restating the
// arithmetic here — as `renderedMean` restates the mean, because the page's mean is inline in the
// rendering — would be a second implementation of a claim the corpus is about to assert 2,306
// times, so this one is borrowed from the realm instead.
function renderedStdDev(realm, dist) {
  return parseFloat(realm.distributionStdDev(dist).toFixed(3));
}

// --- The per-category and healing moments (F268.7) --------------------------------------------
//
// Four quantities per side, each read the way the page's post-combat panel is read: a mean and a
// spread off one distribution, each rounded to three decimals exactly as `renderCombatStateSummary`
// writes them into the panel's data attributes. The fixture field names are `presets.js`'; this
// module only supplies the numbers.
//
// The published *mean* (`aPostCombatStateMean`) and these distributions are two separate walks of
// one joint (`combat_state.js`). Three of the four quantities appear in both, so they are compared
// here on every fixture in both runners: two computations of one number that were never checked
// against each other are two chances to be wrong, and this is the cheapest place to spend one.
const CATEGORY_CROSS_CHECKED = ['regularDamage', 'undeadDamage', 'irreversibleDamage',
  'extraHits'];
const CATEGORY_CROSS_CHECK_SLACK = 1e-9;

function renderedCategoryMoments(realm, result, name) {
  const moments = {};
  for (const [side, prefix] of [['A', 'a'], ['B', 'b']]) {
    const dists = result[prefix + 'PostCombatCategoryDists'];
    if (!dists) {
      throw new Error(`renderedCategoryMoments: fixture '${name}' resolved to a combat result `
        + `carrying no \`${prefix}PostCombatCategoryDists\`. Every \`resolveCombat\` return `
        + 'publishes it (`Calculator/combat.js`), so a missing one is a return path that was '
        + 'added without it, and its four category expectations would silently read as absent.');
    }
    const published = result[prefix + 'PostCombatStateMean'] || {};
    const side_moments = {};
    for (const key of realm.COMBAT_CATEGORY_KEYS) {
      const dist = dists[key];
      const mean = realm.expectedDamage(dist);
      if (CATEGORY_CROSS_CHECKED.includes(key)
        && Math.abs(mean - (published[key] || 0)) > CATEGORY_CROSS_CHECK_SLACK) {
        throw new Error(`renderedCategoryMoments: fixture '${name}' side ${side} has `
          + `${key} = ${mean} read off the distribution and ${published[key]} read off `
          + '`'+prefix+'PostCombatStateMean`. Those are two walks of one joint '
          + '(`jointCombatHealingCategoryDists` and `jointCombatHealingStateMeans`), and they '
          + 'are expected to agree to within '+CATEGORY_CROSS_CHECK_SLACK+'.');
      }
      side_moments[key] = {
        mean: parseFloat(mean.toFixed(3)),
        sd: parseFloat(realm.distributionStdDev(dist).toFixed(3)),
      };
    }
    moments[side] = side_moments;
  }
  return moments;
}

// Memoised: the sources may be run into a realm only once. A calculator source's top-level `const`
// would collide with itself on a second load, which is a SyntaxError, not a silent reload.
let preparedRealm = null;

function prepareRealm(startVersion) {
  if (preparedRealm) return preparedRealm;
  loadPresetSourcesIntoRealm();
  let realm;
  try {
    realm = require('vm').runInThisContext(`({ ${REALM_BINDINGS.join(', ')} })`,
      { filename: 'preset evaluation realm bindings' });
  } catch (err) {
    throw new Error('preset_evaluation: the loaded sources do not define every binding an '
      + `evaluation needs (${REALM_BINDINGS.join(', ')}) — ${String((err && err.message) || err)}. `
      + 'The manifest in index.html is the file list this realm was built from; a rename that '
      + 'reached the page and not the manifest would look exactly like this.');
  }
  realm.setStatStepDebug(true);
  const presetVersions = realm.presetVersionsFromTestTree(realm.TEST_TREE);
  if (typeof startVersion !== 'string' || !realm.VERSION_DATA[startVersion]) {
    throw new Error(`preset_evaluation: the start version is ${JSON.stringify(startVersion)}, `
      + `which names none of ${Object.keys(realm.VERSION_DATA).join(', ')}. It comes from `
      + "index.html's <option selected> in the gameVersion select.");
  }
  preparedRealm = { realm, presetVersions };
  return preparedRealm;
}

// One fixture, from the fixture object to the four numbers the page would publish. `realm` is the
// caller's own global, which already holds every calculator source.
function evaluatePreset(realm, name, preset, options) {
  const state = realm.presetToCardState(name, preset, options);
  const a = realm.deriveUnitStats(realm.cardStateToDerivationInput(state.a, state.globals));
  const b = realm.deriveUnitStats(realm.cardStateToDerivationInput(state.b, state.globals));
  // `recalculate()`'s own option list, read off the globals object rather than off the controls
  // the globals were collected from. `riderChains` is on because the card asks for them, so a
  // chain that throws is a failure here exactly as it is a console error there.
  const result = realm.resolveCombat(a, b, {
    isRanged: state.globals.rangedCheck,
    version: state.globals.version,
    wallOfFire: state.globals.wallOfFire,
    chaosConjunction: state.globals.chaosConjunction,
    riderChains: true,
  });
  return {
    state,
    dmgToA: renderedMean(result.totalDmgToA),
    dmgToB: renderedMean(result.totalDmgToB),
    sdToA: renderedStdDev(realm, result.totalDmgToA),
    sdToB: renderedStdDev(realm, result.totalDmgToB),
    categories: renderedCategoryMoments(realm, result, name),
  };
}

module.exports = {
  ORIGIN, REALM_BINDINGS, renderedMean, renderedStdDev, renderedCategoryMoments,
  prepareRealm, evaluatePreset,
};
