#!/usr/bin/env node
// Diagnostic: which tests are not accounted for, in both directions.
//
// Under the test-list rule, every test is exactly one of two things:
//
//   permanent   — named by an entry in TESTS.md, which is contract tier.
//   scaffolding — carries a header line `scaffolding — delete when <ID> closes`,
//                 naming one live subtask in TASKS.md, and is deleted when that
//                 subtask closes.
//
// Both directions have to hold, and only one of them is about files:
//
//   file -> registry   a test file named by no entry and scheduled by nothing.
//   registry -> file   an entry whose command names a path that is gone, or a
//                      `--only` suite the runner no longer accepts. A stale entry
//                      is worse than a missing one: it reads as coverage.
//   runner -> registry a `--only` suite the runner accepts that no entry names.
//
// It reports. It does not decide. `--strict` exits 1 when anything is unaccounted
// for, which is the form a CI step wants.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const TESTS_MD = path.join(ROOT, 'TESTS.md');
const TASKS_MD = path.join(ROOT, 'TASKS.md');
const RUNNER = path.join(ROOT, 'tools', 'node_unit_checks.js');

// Libraries, not tests: they define no claim of their own and are deleted when
// their last caller is. Named here because nothing in the files says so.
const LIBRARIES = new Set(['tests/helpers.js', 'tools/unit_checks/assertions.js']);

const SCAFFOLD_RE = /scaffolding\s*[-—–]\s*delete when\s+([A-Za-z][\w.]*)\s+closes/i;
const TASK_ID_RE = /\b([A-Z]\d+(?:\.\d+[a-z]?)*)\b/g;

function read(file, what) {
  if (!fs.existsSync(file)) throw new Error(`test_list_audit: ${what} not found at ${file}`);
  return fs.readFileSync(file, 'utf8');
}

function testFiles() {
  const out = [];
  for (const dir of ['tests', 'tools/unit_checks']) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).sort()) {
      if (!name.endsWith('.js')) continue;
      const rel = `${dir}/${name}`;
      if (!LIBRARIES.has(rel)) out.push(rel);
    }
  }
  return out;
}

// The suite names `node_unit_checks.js --only` accepts, read off MIGRATED_SUITES'
// keys. Parsed rather than required: requiring the runner builds the whole
// calculator context, and this tool must stay a second-scale diagnostic.
function runnerSuites() {
  if (!fs.existsSync(RUNNER)) return null;
  const text = fs.readFileSync(RUNNER, 'utf8');
  const start = text.indexOf('const MIGRATED_SUITES = {');
  if (start === -1) {
    throw new Error('test_list_audit: MIGRATED_SUITES not found in tools/node_unit_checks.js; '
      + 'the runner changed shape and this parse must be updated rather than skipped');
  }
  const end = text.indexOf('\n};', start);
  const body = text.slice(start, end);
  return new Set(Array.from(body.matchAll(/^\s*'([\w.-]+)':/gm), (m) => m[1]));
}

// Only `- Command:` blocks name a suite. A path mentioned in an entry's prose is
// commentary — often the note that a file was deleted — and naming one must not
// read as a claim that it exists.
function registryClaims(registry) {
  const lines = registry.split('\n');
  const commands = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^- Commands?:/.test(lines[i])) continue;
    let block = lines[i];
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]); j += 1) block += '\n' + lines[j];
    commands.push(block);
  }
  // A family named in an entry's table row is named as surely as one with its own
  // command: a `| `warlord_abilities` | ... |` row claims that family file. Without
  // this, an aggregate entry could list its contents and still not see them grow,
  // which is the whole point of naming them.
  const tabled = Array.from(
    registry.matchAll(/^\|\s*`([\w.-]+)`(?:\s*\([^)]*\))?\s*\|/gm), (m) => m[1],
  );
  const text = commands.join('\n');
  const paths = new Set(Array.from(text.matchAll(/(?:tests|tools)\/[\w./-]+\.js/g), (m) => m[0]));
  for (const name of tabled) {
    const rel = `tools/unit_checks/${name}.js`;
    if (fs.existsSync(path.join(ROOT, rel))) paths.add(rel);
  }
  const only = new Set(Array.from(text.matchAll(/--only\s+([\w.-]+)/g), (m) => m[1]));
  return { paths, only };
}

function scheduledDeletion(rel) {
  // Header only: a passing mention in a test body cannot schedule a file.
  const header = fs.readFileSync(path.join(ROOT, rel), 'utf8').split('\n').slice(0, 20).join('\n');
  const m = header.match(SCAFFOLD_RE);
  return m ? m[1] : null;
}

function main(argv) {
  const strict = argv.includes('--strict');
  const unknown = argv.filter((a) => a !== '--strict');
  if (unknown.length) {
    throw new Error(`test_list_audit: unrecognised argument ${JSON.stringify(unknown[0])}; `
      + 'the only accepted flag is `--strict`');
  }

  const registry = read(TESTS_MD, 'TESTS.md');
  const tasks = read(TASKS_MD, 'TASKS.md');
  const { paths: named, only } = registryClaims(registry);
  const live = new Set(Array.from(tasks.matchAll(TASK_ID_RE), (m) => m[1]));
  const suites = runnerSuites();

  // Families the runner reaches through the aggregate entry rather than by name.
  const aggregate = new Set();
  if (named.has('tools/node_unit_checks.js') && fs.existsSync(RUNNER)) {
    const text = fs.readFileSync(RUNNER, 'utf8');
    for (const m of text.matchAll(/require\(['"]\.\/unit_checks\/([\w.-]+)['"]\)/g)) {
      aggregate.add(`tools/unit_checks/${m[1].replace(/\.js$/, '')}.js`);
    }
  }

  const permanent = [];
  const hosted = [];
  const scheduled = [];
  const stale = [];
  const unaccounted = [];

  for (const rel of testFiles()) {
    const id = scheduledDeletion(rel);
    if (named.has(rel)) permanent.push({ rel, id });
    else if (id && live.has(id)) scheduled.push({ rel, id });
    else if (id) stale.push({ rel, id });
    else if (aggregate.has(rel)) hosted.push({ rel });
    else unaccounted.push({ rel });
  }

  // registry -> file, and runner -> registry.
  const deadPaths = [...named].filter((p) => !fs.existsSync(path.join(ROOT, p))).sort();
  const deadOnly = suites ? [...only].filter((n) => !suites.has(n)).sort() : [];
  const unnamedSuites = suites ? [...suites].filter((n) => !only.has(n)).sort() : [];

  const L = [];
  L.push(`permanent (named in TESTS.md): ${permanent.length}`);
  L.push(`scaffolding with a live deletion: ${scheduled.length}`);
  for (const e of scheduled) L.push(`  ${e.rel} -> ${e.id}`);
  if (hosted.length) {
    L.push('');
    L.push(`reached only through an aggregate entry, not named individually: ${hosted.length}`);
    for (const e of hosted) L.push(`  ${e.rel}`);
    L.push('  (the list cannot see these grow; name them or fold them)');
  }
  if (stale.length) {
    L.push('');
    L.push(`SCHEDULED AGAINST A CLOSED SUBTASK — delete these: ${stale.length}`);
    for (const e of stale) L.push(`  ${e.rel} -> ${e.id} (not in TASKS.md)`);
  }
  if (unaccounted.length) {
    L.push('');
    L.push(`UNACCOUNTED FOR — neither named in TESTS.md nor scheduled: ${unaccounted.length}`);
    for (const e of unaccounted) L.push(`  ${e.rel}`);
  }
  if (deadPaths.length) {
    L.push('');
    L.push(`REGISTRY NAMES A PATH THAT IS GONE: ${deadPaths.length}`);
    for (const p of deadPaths) L.push(`  ${p}`);
  }
  if (deadOnly.length) {
    L.push('');
    L.push(`REGISTRY NAMES A --only SUITE THE RUNNER REJECTS: ${deadOnly.length}`);
    for (const n of deadOnly) L.push(`  ${n}`);
  }
  if (unnamedSuites.length) {
    L.push('');
    L.push(`runner accepts --only suites no entry names: ${unnamedSuites.length}`);
    for (const n of unnamedSuites) L.push(`  ${n}`);
  }

  // Advisory: a check-shaped script in tools/ that no Command names runs in no
  // verification cycle. Not counted as a problem — tools/ also holds diagnostics,
  // and which is which is a judgment this tool does not make.
  const orphanScripts = fs.readdirSync(path.join(ROOT, 'tools'))
    .filter((n) => /_(check|checks|audit)\.js$/.test(n))
    .map((n) => `tools/${n}`)
    .filter((rel) => !named.has(rel) && rel !== 'tools/test_list_audit.js')
    .sort();
  if (orphanScripts.length) {
    L.push('');
    L.push(`check-shaped scripts in tools/ that no Command names: ${orphanScripts.length}`);
    for (const rel of orphanScripts) L.push(`  ${rel}`);
    L.push('  (advisory: a check nobody runs, or a diagnostic — decide which)');
  }

  const bad = stale.length + unaccounted.length + deadPaths.length + deadOnly.length;
  L.push('');
  L.push(bad === 0 ? 'Every test is accounted for in both directions.' : `${bad} problem(s).`);
  console.log(L.join('\n'));

  const both = permanent.filter((e) => e.id);
  if (both.length) {
    throw new Error('test_list_audit: named in TESTS.md and marked scaffolding at once: '
      + both.map((e) => `${e.rel} (-> ${e.id})`).join(', '));
  }
  return strict && bad > 0 ? 1 : 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));
module.exports = { main };
