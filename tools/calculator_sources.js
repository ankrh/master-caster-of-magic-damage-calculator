'use strict';

// Node reader for the source manifest. The <script src="Calculator/..."> tags in index.html are
// the single home for the calculator's file list and load order; Node has no DOM, so it reads the
// same tags out of the file. This is the pattern tests/helpers.js already uses for the gameVersion
// <option> list, and for the same reason: a hardcoded second copy can only fail in the direction
// that looks fine — miss a file and the suite runs less of the calculator while still reporting
// green. Every throw below exists so a manifest that stopped parsing is loud instead of empty.
//
// Browser consumers do not need this module: ui.js queries the same tags through the DOM.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');

const SCRIPT_TAG = /<script\s+src="(Calculator\/[^"]+)"([^>]*)>/g;

let cached = null;

// The version a fresh page has selected. `index.html`'s `<option selected>` is its single home,
// and this is the single reader of it: a Node caller that needs the page's starting version asks
// here rather than restating `mom_1.31`. (`tests/helpers.js` reads the same select for the
// version *list*, which is a different fact.) A hardcoded copy can only fail in the direction
// that still looks green.
function defaultSelectedVersion() {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const select = /<select id="gameVersion">([\s\S]*?)<\/select>/.exec(html);
  if (!select) {
    throw new Error('defaultSelectedVersion: no <select id="gameVersion"> in index.html');
  }
  const selected = /<option value="([^"]+)"\s+selected>/.exec(select[1]);
  if (!selected) {
    throw new Error('defaultSelectedVersion: no <option ... selected> in the gameVersion select; '
      + 'the starting version is what a Node walk of the corpus has to begin from.');
  }
  return selected[1];
}

function readManifest() {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const entries = [];
  for (const [, file, attributes] of html.matchAll(SCRIPT_TAG)) {
    const scope = /\bdata-scope="([^"]*)"/.exec(attributes);
    if (!scope || (scope[1] !== 'core' && scope[1] !== 'page')) {
      throw new Error(`calculatorSources: ${file} needs data-scope="core" or data-scope="page" in index.html`);
    }
    const worker = /\bdata-worker\b/.test(attributes);
    if (worker && scope[1] !== 'core') {
      throw new Error(`calculatorSources: ${file} is data-worker but not data-scope="core"; the matrix worker has no DOM`);
    }
    entries.push({ file, scope: scope[1], worker });
  }
  if (!entries.length) {
    throw new Error('calculatorSources: no <script src="Calculator/..."> tags in index.html');
  }

  // Every Calculator/*.js is loaded by the page; there is no unlisted-source exemption, so a new
  // file that reaches only some consumers cannot exist.
  const listed = new Set(entries.map(entry => entry.file));
  for (const entry of fs.readdirSync(path.join(repoRoot, 'Calculator'), { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const file = `Calculator/${entry.name}`;
    if (!listed.has(file)) {
      throw new Error(`calculatorSources: ${file} exists but is in no index.html <script> tag`);
    }
  }

  const select = predicate => entries.filter(predicate).map(entry => entry.file);
  return {
    all: entries.map(entry => entry.file),
    core: select(entry => entry.scope === 'core'),
    page: select(entry => entry.scope === 'page'),
    worker: select(entry => entry.worker),
  };
}

// Load order matters, so the lists stay in document order. Cached because several suites read the
// manifest repeatedly and the file cannot change mid-run.
function calculatorSources() {
  if (!cached) cached = readManifest();
  return cached;
}

// `filename` is set so a throw inside a source reports that source.
function runSource(context, file) {
  const absolute = path.join(repoRoot, ...file.split('/'));
  vm.runInContext(fs.readFileSync(absolute, 'utf8'), context, { filename: file });
}

// The headless calculator context every Node suite runs against: the `core` files, in manifest
// order, in one vm context.
function loadCalculatorContext() {
  const context = { console };
  vm.createContext(context);
  for (const file of calculatorSources().core) runSource(context, file);
  return context;
}

// The preset fixtures are data-scope="page" because the page is their only consumer, but they are
// plain data and need no DOM, so the core context can load them. Selected by the names
// Calculator/CLAUDE.md, *Presets* already fixes — the `presets*.js` parts and `test_tree.js` — so a
// new part file added to the manifest is picked up without a second list. This exposes PRESETS and
// TEST_TREE both for key-level checks and, since F260.9, for evaluating a fixture headlessly
// (`tools/preset_checks.js`); the browser's runTests() is no longer the only way to run one. What
// each runner's result is taken to prove is `TESTS.md`'s to state, not this loader's.
const FIXTURE_SOURCE = /^Calculator\/(presets[^/]*|test_tree)\.js$/;

function presetFixtureSources() {
  const fixtures = calculatorSources().page.filter(file => FIXTURE_SOURCE.test(file));
  if (!fixtures.includes('Calculator/test_tree.js') || fixtures.length < 2) {
    throw new Error('presetFixtureSources: index.html lists no preset fixture sources');
  }
  return fixtures;
}

function loadPresetContext() {
  const context = loadCalculatorContext();
  for (const file of presetFixtureSources()) runSource(context, file);
  return context;
}

// The same ordered file list `loadPresetContext` runs, for a consumer that runs the sources in its
// own realm's global scope instead of in a `vm` context — `vm.runInThisContext` rather than
// `vm.runInContext`. A `worker_threads` worker already owns its isolate and its globals, so a
// second global inside it buys no isolation, and it is not free: measured on the shipped corpus
// (F260.9), the whole preset evaluation costs **116.9 s** inside a `vm` context and **21.3 s** in
// the realm's own global, the gap concentrated in the four heaviest fixtures (one alone: 59.1 s
// against 7.6 s). Property lookups on a `vm` context's global proxy do not stay on V8's fast path,
// and the derivation is nothing but such lookups.
//
// The manifest remains the one home for the file list either way; only the execution target
// differs. A caller in the main thread should prefer `loadPresetContext`, whose context is
// disposable — this one permanently populates the caller's own globals.
function presetSourceFiles() {
  return [...calculatorSources().core, ...presetFixtureSources()];
}

function loadPresetSourcesIntoRealm() {
  for (const file of presetSourceFiles()) {
    const absolute = path.join(repoRoot, ...file.split('/'));
    vm.runInThisContext(fs.readFileSync(absolute, 'utf8'), { filename: file });
  }
}

module.exports = {
  calculatorSources, loadCalculatorContext, loadPresetContext, presetSourceFiles,
  presetFixtureSources, loadPresetSourcesIntoRealm, repoRoot, defaultSelectedVersion,
};
