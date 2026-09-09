#!/usr/bin/env node
// Hook gate: refuse a suite run the tree has already passed, and record the passes.
//
//   node tools/suite_gate.js pre    PreToolUse  on Bash — denies a redundant run
//   node tools/suite_gate.js post   PostToolUse on Bash — records a demonstrated pass
//
// Why this exists: nothing told an agent when a suite run was *unnecessary*, so the suite got run
// after edits no suite reads and again on trees nobody had touched since the last green. Prose did
// not fix it — `CLAUDE.md` already says suite count is a cost. This does, by denying the call.
//
// **Both directions fail open toward running the suite.** Any doubt — unparseable input, no
// fingerprint, an unrecognised command, a ledger it cannot read — and `pre` allows the run. A
// wrongly *denied* run is a false green, which is the failure this repository has spent whole
// subtasks on (F259.1's refusing corpus, F267.4's throwing probe). A wrongly *allowed* run only
// costs time.
//
// `post` records only on positive evidence of a pass: the suite's own success markers in the tool
// output. A command that merely exited without them records nothing.
//
// Escape hatch: `CLAUDE_FORCE_SUITE=1` in the environment allows any run. It is for the user. An
// agent that believes it needs a run the gate denied should say so and why, not set the variable.

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = path.join(ROOT, 'tmp', '.last-green.json');

// Which suite a command runs, and what each suite subsumes. `test:all` is `npm test` plus
// Playwright, and `npm test` starts with `npm run citations`, so a pass of the wider one is a pass
// of the narrower.
const SUITES = ['citations', 'test', 'test:all'];
const SUBSUMES = { 'test:all': ['test:all', 'test', 'citations'], test: ['test', 'citations'], citations: ['citations'] };

// Positive evidence that each suite passed, all of which must appear in the tool output.
const PASS_MARKERS = {
  citations: ['Provenance audit passed'],
  test: ['"allPassed":true'],
  'test:all': ['"allPassed":true', 'passed'],
};

function suiteOf(command) {
  const c = String(command || '').trim();
  // Only a bare invocation counts. Anything chained, redirected or piped is left alone: the gate
  // cannot tell what else such a line does.
  if (/[;&|><]/.test(c)) return null;
  if (/^npm\s+run\s+test:all\s*$/.test(c)) return 'test:all';
  if (/^npm\s+(run\s+)?test\s*$/.test(c)) return 'test';
  if (/^npm\s+run\s+citations\s*$/.test(c)) return 'citations';
  return null;
}

function fingerprint() {
  try {
    const out = execFileSync(process.execPath, [path.join(ROOT, 'tools', 'suite_fingerprint.js')],
      { cwd: ROOT, encoding: 'utf8' }).trim();
    return /^[0-9a-f]{64}$/.test(out) ? out : null;
  } catch (e) {
    return null;
  }
}

function readLedger() {
  try {
    const raw = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
    return (raw && typeof raw === 'object' && raw.fingerprint && Array.isArray(raw.passed)) ? raw : null;
  } catch (e) {
    return null;
  }
}

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch (e) {
    return null;
  }
}

function stringLeaves(value, out) {
  const acc = out || [];
  if (typeof value === 'string') acc.push(value);
  else if (Array.isArray(value)) for (const v of value) stringLeaves(v, acc);
  else if (value && typeof value === 'object') for (const v of Object.values(value)) stringLeaves(v, acc);
  return acc;
}

function allow() { process.exit(0); }

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
  process.exit(0);
}

function pre(input) {
  if (process.env.CLAUDE_FORCE_SUITE === '1') allow();
  const suite = suiteOf(input && input.tool_input && input.tool_input.command);
  if (!suite) allow();

  const fp = fingerprint();
  if (!fp) allow();                       // tree state unknown -> let it run

  const ledger = readLedger();
  if (!ledger || ledger.fingerprint !== fp) allow();

  const covered = ledger.passed.some(p => (SUBSUMES[p] || []).includes(suite));
  if (!covered) allow();

  deny(`\`${suite}\` already passed on this exact tree (fingerprint ${fp.slice(0, 12)}, recorded `
    + `${ledger.at || 'earlier'}${ledger.by ? ` by ${ledger.by}` : ''}). Nothing the suites read has `
    + `changed since — tmp/, .reviews/, .derivations/, TASKS.md, JOURNAL.md and PROPOSALS.md are read `
    + `by no suite, so editing them cannot make a rerun meaningful.\n\n`
    + `Take the recorded pass. If you believe a rerun is genuinely needed, say so to the user and why `
    + `— do not set CLAUDE_FORCE_SUITE yourself.`);
}

function post(input) {
  const suite = suiteOf(input && input.tool_input && input.tool_input.command);
  if (!suite) allow();

  // Positive evidence only. Every string leaf of the response is searched, so this survives the
  // response shape changing — and must NOT go through JSON.stringify, which escapes the quotes in
  // markers like `"allPassed":true` and would silently never match.
  const text = stringLeaves(input.tool_response).join('\n');
  if (!PASS_MARKERS[suite].every(m => text.includes(m))) allow();

  const fp = fingerprint();
  if (!fp) allow();

  const prior = readLedger();
  const passed = (prior && prior.fingerprint === fp && Array.isArray(prior.passed)) ? prior.passed.slice() : [];
  if (!passed.includes(suite)) passed.push(suite);

  try {
    fs.mkdirSync(path.dirname(LEDGER), { recursive: true });
    fs.writeFileSync(LEDGER, JSON.stringify({
      fingerprint: fp,
      passed: passed.filter(s => SUITES.includes(s)),
      at: new Date().toISOString(),
      by: 'suite_gate',
    }, null, 2) + '\n');
  } catch (e) {
    // Recording is a convenience; failing to record only costs a rerun.
  }
  allow();
}

function main() {
  const mode = process.argv[2];
  const input = readStdin();
  if (!input) allow();                    // unreadable payload -> never block
  if (mode === 'pre') return pre(input);
  if (mode === 'post') return post(input);
  allow();
}

main();
