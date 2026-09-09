#!/usr/bin/env node
// One hash over every file the test suites read, so a suite that has already passed on this exact
// tree need not run again.
//
// **Fails closed.** Every uncertainty makes this print nothing and exit non-zero, which the caller
// must treat as "run the suite". A wrong fingerprint would be a false green, and this repository has
// spent real subtasks on instruments that reported zero because they were blind (F259.1, F267.4);
// this one is not allowed to join them.
//
// What is excluded, and why each exclusion is safe:
//
//   tmp/            scratchpad. `tools/cas_citation_audit.js` OUT_OF_SCOPE.
//   .reviews/       review artifacts. Same.
//   .derivations/   derivation artifacts. Same.
//   TASKS.md        OUT_OF_SCOPE in the citation audit, and read by no script `npm test` runs.
//   JOURNAL.md      the same.
//   PROPOSALS.md    the same.
//   .claude/        harness settings; no suite reads them.
//   node_modules/   Playwright's own tree; `package-lock.json` pins it and is *not* excluded.
//
// `tools/test_list_audit.js` does read `TASKS.md`, but it is not in the `npm test` chain
// (`citations && preset_checks && node_unit_checks`), so excluding `TASKS.md` cannot hide a failure
// from the suites this gate governs. If that ever changes, drop the exclusion.

'use strict';

const { execFileSync } = require('child_process');
const crypto = require('crypto');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const EXCLUDED_PREFIXES = ['tmp/', '.reviews/', '.derivations/', '.claude/', 'node_modules/'];
const EXCLUDED_FILES = new Set(['TASKS.md', 'JOURNAL.md', 'PROPOSALS.md']);

function fail(why) {
  process.stderr.write(`suite_fingerprint: ${why}\n`);
  process.exit(1);
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
}

function excluded(rel) {
  if (EXCLUDED_FILES.has(rel)) return true;
  return EXCLUDED_PREFIXES.some(p => rel === p.slice(0, -1) || rel.startsWith(p));
}

function main() {
  let tracked;
  let untracked;
  try {
    // `-s` gives "<mode> <type> <objectname>\t<path>" for the *index*, so a staged-but-unwritten
    // change is not mistaken for the working tree. The working tree is covered below.
    tracked = git(['ls-files', '-s', '-z']).split('\0').filter(Boolean);
    untracked = git(['ls-files', '-o', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  } catch (e) {
    fail(`git is unavailable or this is not a work tree (${e.message.split('\n')[0]})`);
  }

  const entries = [];

  for (const line of tracked) {
    const tab = line.indexOf('\t');
    if (tab < 0) fail(`cannot parse a git ls-files record: ${JSON.stringify(line.slice(0, 80))}`);
    const rel = line.slice(tab + 1);
    if (excluded(rel)) continue;
    entries.push(rel);
  }
  for (const rel of untracked) {
    if (excluded(rel)) continue;
    entries.push(rel);
  }

  if (!entries.length) fail('no files to hash, which cannot be right');

  // Hash the *working tree*, not the index: a suite runs against the files on disk. `git
  // hash-object` gives us git's own blob hashing over a path list, in one process.
  let hashes;
  try {
    hashes = execFileSync('git', ['hash-object', '--stdin-paths'], {
      cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28,
      input: entries.join('\n') + '\n',
    }).split('\n').filter(Boolean);
  } catch (e) {
    fail(`hashing failed, so the tree state is unknown (${e.message.split('\n')[0]})`);
  }

  if (hashes.length !== entries.length) {
    fail(`hashed ${hashes.length} of ${entries.length} paths; refusing to guess the rest`);
  }

  const sorted = entries
    .map((rel, i) => `${hashes[i]} ${rel}`)
    .sort();

  const digest = crypto.createHash('sha256').update(sorted.join('\n')).digest('hex');
  process.stdout.write(`${digest}\n`);
}

if (require.main === module) main();
module.exports = { EXCLUDED_PREFIXES, EXCLUDED_FILES };
