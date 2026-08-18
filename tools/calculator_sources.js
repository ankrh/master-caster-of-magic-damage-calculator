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

// The headless calculator context every Node suite runs against: the `core` files, in manifest
// order, in one vm context. `filename` is set so a throw inside a source reports that source.
function loadCalculatorContext() {
  const context = { console };
  vm.createContext(context);
  for (const file of calculatorSources().core) {
    const absolute = path.join(repoRoot, ...file.split('/'));
    vm.runInContext(fs.readFileSync(absolute, 'utf8'), context, { filename: file });
  }
  return context;
}

module.exports = { calculatorSources, loadCalculatorContext, repoRoot };
