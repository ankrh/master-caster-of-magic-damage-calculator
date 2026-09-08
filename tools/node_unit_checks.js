// Scope: asserts on deriveUnitStats and engine/combat HELPERS in isolation
// (stat derivation, buildToBlockContext, phase builders). Run: node tools/node_unit_checks.js
//
// This file still does not evaluate PRESETS, and the caution that kept it that way is worth
// keeping in the form that is now true. What it used to say was: never reconstruct the
// applyPreset → readUnitStats → resolveCombat path in any Node script, because a reconstruction
// skips the DOM/calcKey layer and yields false failures. That was right, and the prohibition has
// not been waived — it has been satisfied by construction (F260.1–F260.8). There is no longer a
// path to reconstruct: `presetToCardState` and `cardStateToDerivationInput`
// (`Calculator/card_state.js`, data-scope="core") are the one translation, and the page runs the
// same two functions — `applyPreset` is `presetToCardState` plus a control writer, `readUnitStats`
// is `deriveUnitStats(cardStateToDerivationInput(collectCardState(p), collectGlobals()))`. That
// the two callers build the same derivation input is measured over the whole corpus by
// `tests/preset-equivalence-gate-f260.8.spec.js`.
//
// So a Node script may evaluate a preset — through those functions and no other way.
// `tools/preset_checks.js` is the one that compares a fixture's numbers (F260.9); the
// `worker_boundary` family runs the same two functions to obtain stats to hand the matrix worker
// and checks no value against an `expected` block (F269.1). Reconstructing the translation a
// second time, here or anywhere, is still prohibited, and so is reading the card off anything but
// a card state.
//
// Which suite carries which claim over the corpus is `TESTS.md`'s to say, and asking there rather
// than restating it here is deliberate: the claim used to have five homes in the code and drifted
// (F260.10).
//
// The suites themselves live one per check family in tools/unit_checks/; this entry point owns
// the manifest checks, the shared calculator context, and the run order.

const fs = require('fs');
const path = require('path');
// index.html's <script> tags are the source manifest; the loader reads them rather than
// restating the file list here.
const {
  calculatorSources, loadCalculatorContext, loadPresetContext, repoRoot,
} = require('./calculator_sources');
const {
  assert, assertEqual, assertionTotal, assertSameKeyList, evalInContext,
} = require('./unit_checks/assertions');
const { runAbilityInputChecks } = require('./unit_checks/ability_inputs');
const { runIdentityChecks } = require('./unit_checks/identity');
const {
  runCrossBoundaryIdentityReadChecks, runLandedCorrectionChecks,
} = require('./unit_checks/identity_record_choice');
const {
  runDeriveUnitStatsChecks, runRangeLevelF33F56Checks,
} = require('./unit_checks/derive_unit_stats');
const { runToBlockChecks, runDerivationStageChecks } = require('./unit_checks/derivation_stages');
const { runWarlordUnitAbilityChecks } = require('./unit_checks/warlord_abilities');
const {
  runPhaseChecks, runRiderHistogramChecks, runRiderChainChecks, runModernRidersF25Checks,
  runHasteGazeFearF30F31Checks, runLifeStealHealingChecks,
} = require('./unit_checks/phases');
const {
  runStatStepChecks, runModifierTraceChecks, runChannelAttributionChecks,
  runSourceOrderF20Checks,
} = require('./unit_checks/step_traces');
const {
  runResolutionStepChecks, runModernWeaponImmunityMappingChecks, runDefenseCapBlessF32F34Checks,
} = require('./unit_checks/resolution_steps');
const {
  runF19Checks, runF23Checks, runF50F51F53Checks, runR9G1eChecks, runF259Checks,
  runPriorityPrerequisitesChecks,
} = require('./unit_checks/backlog_checks');
const { runCanonicalVersionScopeChecks } = require('./unit_checks/version_scope');
const { runHiddenControlGatingChecks } = require('./unit_checks/hidden_control_gating');
const { runAbilityOriginChecks } = require('./unit_checks/ability_origins');
const { runCardStateProjectionChecks } = require('./unit_checks/card_state_projection');
const { runVersionGateDivergenceChecks } = require('./unit_checks/version_gate_divergence');
const { runPresetApplierChecks } = require('./unit_checks/preset_applier');
const { runPhaseOrderF29Checks } = require('./unit_checks/phase_order_f29');
const {
  runDamageSpellF35F37Checks,
} = require('./unit_checks/damage_spell_f35_f37');
const { runExorciseF43Checks } = require('./unit_checks/exorcise_f43');
const { runWorkerBoundaryChecks } = require('./unit_checks/worker_boundary');

// Suites migrated out of Playwright by F268, keyed by the name their `TESTS.md` section still
// carries. Each of these was a `tests/*.spec.js` that used Chrome only as a JavaScript runtime,
// and each keeps its own registry entry, its own tag and its own anchor after the move — a
// migrated check that is folded anonymously into this file's total has quietly become part of
// `node-unit-checks`' `scaffolding` claim, which is the loss F268 exists to prevent.
//
// The registry is what makes each one's `TESTS.md` command runnable on its own:
//
//     node tools/node_unit_checks.js --only phase-order-f29
//
// A later F268 row adds a file under `unit_checks/`, one row here, and updates the suite's
// existing `TESTS.md` section (command changes; tag and anchor travel unchanged).
const MIGRATED_SUITES = {
  'phase-order-f29': runPhaseOrderF29Checks,
  'damage-spell-f35-f37': runDamageSpellF35F37Checks,
  'exorcise-f43': runExorciseF43Checks,
  // F268.4 additions.  These four survived that row's deletion default and live inside an
  // existing `unit_checks/` family rather than in a file of their own — the row's brief asked for
  // a smaller suite, not a relocated one.  They are registered here anyway, because a migrated
  // `regression` suite whose only command is `node tools/node_unit_checks.js` has had its anchor
  // absorbed into the `scaffolding`-tagged `node-unit-checks` entry (F268.1's finding), and that
  // is a loss whether or not the claim keeps a file.
  'source-order-f20': runSourceOrderF20Checks,
  'modern-gaze-riders-f25': runModernRidersF25Checks,
  'range-level-f33-f56': runRangeLevelF33F56Checks,
  'defense-cap-bless-f32-f34': runDefenseCapBlessF32F34Checks,
  // F268.5 additions.  Same pattern as F268.4's: each suite keeps its `TESTS.md` section, its
  // `regression` tag and its anchor, and lives inside an existing `unit_checks/` family rather
  // than a file of its own.  These three are what survived F268.5's mutation pass; that row's
  // fourth spec, `r9-g1c`, left no surviving assertion and is simply gone.
  'priority-prerequisites': runPriorityPrerequisitesChecks,
  'haste-gaze-fear-f30-f31': runHasteGazeFearF30F31Checks,
  'life-steal-healing': runLifeStealHealingChecks,
};

// index.html's <script> tags are the single home for the calculator's file list and load order.
// Reading the manifest already throws on an unclassified tag, a data-worker script the worker
// could not run, and a Calculator/*.js file no tag mentions (tools/calculator_sources.js). These
// assertions cover what parsing alone cannot: that the derived lists stay consistent with each
// other, so no consumer can select a set the page never loads.
function runSourceManifestChecks() {
  const sources = calculatorSources();
  assert(sources.core.length > 0, 'The manifest lists at least one data-scope="core" source');
  assert(sources.page.length > 0, 'The manifest lists at least one data-scope="page" source');
  assert(sources.worker.length > 0, 'The manifest lists at least one data-worker source');
  assertEqual(new Set(sources.all).size, sources.all.length, 'No source is listed twice in index.html');
  assertSameKeyList([...sources.all].sort(), [...sources.core, ...sources.page].sort(),
    'Every listed source is either core or page');
  for (const file of sources.all) {
    assert(fs.existsSync(path.join(repoRoot, ...file.split('/'))), `Manifest source ${file} exists on disk`);
  }
  // Subset and relative order both matter: the worker importScripts in manifest order.
  const workerInCoreOrder = sources.core.filter(file => sources.worker.includes(file));
  assertSameKeyList(sources.worker, workerInCoreOrder,
    'The data-worker sources are core sources, in manifest order');
}

// Calculator/CLAUDE.md, *Presets* requires every preset to appear in TEST_TREE. The two files are
// authored independently — the `presets_*.js` parts by ability family, `test_tree.js` by browser
// grouping — so neither derives the other and a key can fall out of either silently: a preset in no
// group is unreachable from the browser, and a TEST_TREE key naming no preset is skipped without a
// word. This asserts the stated contract in both directions and reports both in one message.
function runPresetGroupingChecks() {
  const context = loadPresetContext();
  const presetKeys = new Set(Object.keys(evalInContext(context, 'PRESETS')));
  const treeKeys = new Set();
  const collect = nodes => {
    for (const node of nodes) {
      for (const key of node.keys || []) treeKeys.add(key);
      if (node.subs) collect(node.subs);
    }
  };
  collect(evalInContext(context, 'TEST_TREE'));
  runLandedCorrectionChecks(presetKeys, treeKeys);
  const ungrouped = [...presetKeys].filter(key => !treeKeys.has(key)).sort();
  const orphaned = [...treeKeys].filter(key => !presetKeys.has(key)).sort();
  assert(ungrouped.length === 0 && orphaned.length === 0,
    'PRESETS and TEST_TREE name the same keys (Calculator/CLAUDE.md, Presets): '
    + `${ungrouped.length} preset(s) in no TEST_TREE group [${ungrouped.join(', ')}]; `
    + `${orphaned.length} TEST_TREE key(s) naming no preset [${orphaned.join(', ')}]`);
}

// `--only <name>` runs exactly one migrated suite, which is what its `TESTS.md` command names.
// An unknown name halts naming the value and the set that was expected rather than running
// nothing and reporting green (`SPEC.md`, *Out-of-range values stop the run*).
// Every argument is consumed and checked, not just the first `--only`. Reading only the first
// occurrence let `--only phase-order-f29 --only bogus` exit green having run one suite, and a
// trailing `--only` with no name be ignored outright (found in the F268.1 review): a run that
// silently does something other than what its command line says is the failure this project
// halts on rather than tolerates.
const SUITE_NAMES = () => Object.keys(MIGRATED_SUITES).join(', ');

function selectedSuite(argv) {
  const names = [];
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] !== '--only') {
      throw new Error(`node_unit_checks: unrecognised argument ${JSON.stringify(argv[index])}; `
        + 'the only accepted flag is `--only <suite>` '
        + `(one of ${SUITE_NAMES()}).`);
    }
    names.push(argv[index + 1]);
    index += 1;
  }
  if (names.length === 0) return null;
  if (names.length > 1) {
    throw new Error('node_unit_checks: --only names more than one suite '
      + `(${names.map(name => JSON.stringify(name)).join(', ')}); it takes exactly one. `
      + 'Run the whole suite with no arguments instead.');
  }
  const [name] = names;
  if (typeof name !== 'string'
    || !Object.prototype.hasOwnProperty.call(MIGRATED_SUITES, name)) {
    throw new Error(`node_unit_checks --only: ${JSON.stringify(name)} is not a migrated suite `
      + `(expected one of ${SUITE_NAMES()}).`);
  }
  return name;
}

function main() {
  const only = selectedSuite(process.argv.slice(2));
  if (only) {
    const ctx = loadCalculatorContext();
    ctx.setStatStepDebug(true);
    MIGRATED_SUITES[only](ctx);
    console.log(JSON.stringify({
      allPassed: true, suite: only, total: assertionTotal(), failures: [],
    }));
    return;
  }
  runSourceManifestChecks();
  // The manifest's other half: what the *worker* can see. This one runs its executed half in a
  // child process, so it is placed with the manifest checks rather than among the suites that
  // share `ctx`.
  runWorkerBoundaryChecks();
  runCrossBoundaryIdentityReadChecks();
  runPresetGroupingChecks();
  const ctx = loadCalculatorContext();
  // Every deriveUnitStats call below runs the step runner's write check (steps.js).
  ctx.setStatStepDebug(true);
  runStatStepChecks(ctx);
  runModifierTraceChecks(ctx);
  runChannelAttributionChecks(ctx);
  runResolutionStepChecks(ctx);
  runModernWeaponImmunityMappingChecks(ctx);
  runIdentityChecks(ctx);
  runAbilityInputChecks(ctx);
  runDeriveUnitStatsChecks(ctx);
  runDerivationStageChecks(ctx);
  runWarlordUnitAbilityChecks(ctx);
  runToBlockChecks(ctx);
  runPhaseChecks(ctx);
  runRiderHistogramChecks(ctx);
  runRiderChainChecks(ctx);
  runF19Checks(ctx);
  runF23Checks(ctx);
  runF50F51F53Checks(ctx);
  runR9G1eChecks(ctx);
  runF259Checks(ctx);
  runCanonicalVersionScopeChecks(ctx);
  runHiddenControlGatingChecks(ctx);
  runCardStateProjectionChecks(ctx);
  runVersionGateDivergenceChecks(ctx);
  // Its own context: the applier reads the fixture corpus, which is `data-scope="page"` data and
  // so lives in `loadPresetContext`'s context rather than the core one every suite above shares.
  runPresetApplierChecks();
  runAbilityOriginChecks(ctx);
  for (const run of Object.values(MIGRATED_SUITES)) run(ctx);
  console.log(JSON.stringify({ allPassed: true, total: assertionTotal(), failures: [] }));
}

try {
  main();
} catch (err) {
  console.error(err.stack || String(err));
  process.exit(1);
}
