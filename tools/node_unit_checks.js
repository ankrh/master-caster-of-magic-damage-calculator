// Scope: asserts on deriveUnitStats and engine/combat HELPERS in isolation
// (stat derivation, buildToBlockContext, phase builders). Run: node tools/node_unit_checks.js
//
// This is NOT a way to evaluate PRESETS. Never reconstruct the applyPreset →
// readUnitStats → resolveCombat path here or in any Node script — that skips the
// DOM/calcKey layer and yields false failures. Evaluate PRESETS only via runTests()
// in the browser (see CLAUDE.md → Testing with Playwright). Reading preset *keys*
// to check TEST_TREE membership is not evaluation; running a preset is.
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
const { runIdentityChecks } = require('./unit_checks/identity');
const { runDeriveUnitStatsChecks } = require('./unit_checks/derive_unit_stats');
const { runToBlockChecks, runDerivationStageChecks } = require('./unit_checks/derivation_stages');
const { runWarlordUnitAbilityChecks } = require('./unit_checks/warlord_abilities');
const { runPhaseChecks } = require('./unit_checks/phases');
const {
  runStatStepChecks, runModifierTraceChecks, runChannelAttributionChecks,
} = require('./unit_checks/step_traces');
const {
  runResolutionStepChecks, runModernWeaponImmunityMappingChecks,
} = require('./unit_checks/resolution_steps');
const {
  runF19Checks, runF23Checks, runF50F51F53Checks, runR9G1eChecks,
} = require('./unit_checks/backlog_checks');
const { runCanonicalVersionScopeChecks } = require('./unit_checks/version_scope');

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
  const ungrouped = [...presetKeys].filter(key => !treeKeys.has(key)).sort();
  const orphaned = [...treeKeys].filter(key => !presetKeys.has(key)).sort();
  assert(ungrouped.length === 0 && orphaned.length === 0,
    'PRESETS and TEST_TREE name the same keys (Calculator/CLAUDE.md, Presets): '
    + `${ungrouped.length} preset(s) in no TEST_TREE group [${ungrouped.join(', ')}]; `
    + `${orphaned.length} TEST_TREE key(s) naming no preset [${orphaned.join(', ')}]`);
}

function main() {
  runSourceManifestChecks();
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
  runDeriveUnitStatsChecks(ctx);
  runDerivationStageChecks(ctx);
  runWarlordUnitAbilityChecks(ctx);
  runToBlockChecks(ctx);
  runPhaseChecks(ctx);
  runF19Checks(ctx);
  runF23Checks(ctx);
  runF50F51F53Checks(ctx);
  runR9G1eChecks(ctx);
  runCanonicalVersionScopeChecks(ctx);
  console.log(JSON.stringify({ allPassed: true, total: assertionTotal(), failures: [] }));
}

try {
  main();
} catch (err) {
  console.error(err.stack || String(err));
  process.exit(1);
}
