#!/usr/bin/env node
'use strict';

// F227's checker for citations into the shipped `.CAS` scripts. The grammar it enforces is
// `Reference docs/CAS citation grammar.md`; this file is its executable statement.
//
// Not the same check as `provenance_audit.js`. That one reads `PROVENANCE[id]` comments in the
// calculator and hashes reviewed excerpts. This one reads every citation-bearing source in the
// repo and resolves it against `Reference docs/Script source/<set>/`.
//
// EXIT CONTRACT. A line-number citation is `deprecated`, not a failure: 433 exist repo-wide and
// 389 of those are in scope here, and F227.3-.6 convert them. The tool is green today and red on
// regression, held by the per-script ceilings in `DEPRECATED_BUDGET` that each of those subtasks
// lowers. Anything the grammar can actually decide is a hard failure now: a malformed locator, an
// anchor that does not resolve, a line number outside the file, a path prefix naming no shipped
// script set, a `@span` nobody audits, or a citation in a source this file does not classify.
// `--strict` zeroes every ceiling and is what F227.6 runs to prove the clean state; when the last
// ceiling reaches 0 on its own, drop the ceilings and the flag together.
//
// Usage:
//   node tools/cas_citation_audit.js             census + gate
//   node tools/cas_citation_audit.js --strict    budget 0: the F227.6 exit
//   node tools/cas_citation_audit.js --list      every citation, one per line
//   node tools/cas_citation_audit.js --list=bad  only the ones that do not resolve

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const scriptSourceRoot = path.join(repoRoot, 'Reference docs', 'Script source');
const DEFAULT_SET = 'Warlord 1.5.12.9';

// One ceiling per script, held at the in-scope counts measured on 2026-09-01, before F227.3 ran.
// Per script rather than in aggregate so that deleting a citation from one file cannot pay for a
// new one in another, and so that each of F227.3-.6 has an explicit exit: set its file to 0. A
// script with no row here has a ceiling of 0, so a line citation into a newly cited script fails.
// When every row is 0 the registered command enforces the clean state on its own and `--strict`
// stops meaning anything; delete both then.
const DEPRECATED_BUDGET = new Map([
  ['UnitCalcPre.CAS', 151],
  ['UnitCalc.CAS', 118],
  ['CreateUnit.CAS', 69],
  ['OLSpell.CAS', 14],
  ['OverlandEndTurn.CAS', 15],
  ['MASTER.CAS', 13],
  ['DisAbil.CAS', 3],
  ['COSpell.CAS', 3],
  ['CombatEndTurn.CAS', 2],
  ['SpellMysticSurge.CAS', 1],
]);
// The grammar document has to show the deprecated form in order to define it, so its own
// examples are resolved like any other citation but do not count against the budget.
const GRAMMAR_DOC = 'Reference docs/CAS citation grammar.md';

// Which sources gate the exit. A citation in an in-scope source must resolve; a citation in an
// out-of-scope source is counted and printed but moves nothing. Out-of-scope is history and
// self-reference, not laxity: `.reviews/` and `.derivations/` are frozen transcripts of a past
// round, `JOURNAL.md` is by contract never authoritative, and `TASKS.md` quotes stale citations
// inside F227's own body as the evidence for the item. Rewriting any of those would falsify the
// record. A citation-bearing file matching neither list is an error, so a new home for citations
// has to be classified before it can hide one.
const IN_SCOPE = ['Calculator/', 'Reference docs/', 'Unit rosters/', 'tests/', 'tools/',
  'CLAUDE.md', 'TESTS.md', 'index.html'];
const OUT_OF_SCOPE = new Map([
  ['.reviews/', 'frozen review transcripts'],
  ['.derivations/', 'frozen derivation transcripts'],
  ['JOURNAL.md', 'working notes; never authoritative'],
  ['TASKS.md', "the backlog quotes stale citations as F227's own evidence"],
  ['PROPOSALS.md', 'pending text the user owns'],
]);
// The scripts are the target of a citation, not a source of one.
const NOT_SCANNED = ['Reference docs/Script source/'];
const SKIP_DIRS = new Set(['.git', 'node_modules', '__pycache__', 'test-results', 'playwright-report']);
const TEXT_EXT = new Set(['.md', '.js', '.mjs', '.cjs', '.json', '.py', '.html', '.htm', '.css',
  '.txt', '.c', '.h', '.pas', '.ini']);

// One regex for all four locators. The path prefix must contain a `/` or `\`, so prose words
// before a bare filename cannot be swallowed into it.
const OFFSET = '(?:[+-]\\d+(?:\\.\\.[+-]\\d+)?)?';
const STMT = '(?: "([^"]*)")?';
const CITATION = new RegExp(
  '((?:[A-Za-z0-9 ._+()-]+[/\\\\])*)([A-Za-z0-9_]+)\\.CAS'
  + '(?:'
  + '(@span:\\d+:[0-9a-f]+)'                                    // span
  + `|(!)([A-Za-z0-9_]+)(!)(${OFFSET})${STMT}${STMT}`           // label anchor
  + `|(~)"([^"]*)"(${OFFSET})${STMT}${STMT}`                    // text anchor
  + '|:(\\d+(?:-\\d+)?(?:,\\d+(?:-\\d+)?)*)'                    // line list
  + ')', 'gi');
// A `.CAS` glued straight to something. If CITATION parsed no locator at that spot, the grammar
// has no form covering it, and staying silent is how a typo becomes an uncheckable claim.
const LOCATOR_START = /([A-Za-z0-9_]+)\.CAS[:!~](?=\S)/gi;
// What may follow a finished locator. A word character, a sign, a bare `-`, or a comma with a
// digit behind it all mean the locator was cut in half rather than completed.
const LOCATOR_TAIL = /^(?:[A-Za-z0-9_+!~-]|,[0-9])/;
// A `:N` / `:N-M` that names no file: attributed to the nearest preceding citation.
const CONTINUATION = /(^|[^\w:/\\.])(:\d+(?:-\d+)?)(?![\d\w-])/g;
// Any `<file>.<ext>:<line>` citation, used only to find a continuation's antecedent.
const ANY_FILE_CITE = /([A-Za-z0-9_.-]+\.(?:CAS|js|c|pas|md|ini|txt|html|py))(?::\d+|[!~])/gi;

const norm = (s) => s.replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- the shipped scripts

function loadScriptSets() {
  const sets = new Map();
  for (const setName of fs.readdirSync(scriptSourceRoot)) {
    const dir = path.join(scriptSourceRoot, setName);
    if (!fs.statSync(dir).isDirectory()) continue;
    const files = new Map();
    for (const name of fs.readdirSync(dir)) {
      if (!/\.CAS$/i.test(name)) continue;
      const raw = fs.readFileSync(path.join(dir, name), 'utf8');
      const lines = raw.split(/\r?\n/);
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
      const labels = new Map();
      lines.forEach((l, i) => {
        const m = /^\s*!([A-Za-z0-9_]+)!\s*$/.exec(l);
        if (!m) return;
        const key = m[1].toUpperCase();
        labels.set(key, (labels.get(key) || []).concat(i + 1));
      });
      files.set(name.toUpperCase(), { name, lines, labels, normLines: lines.map(norm) });
    }
    if (files.size) sets.set(setName, files);
  }
  if (!sets.has(DEFAULT_SET)) throw new Error(`default script set is missing: ${DEFAULT_SET}`);
  return sets;
}

// ---------------------------------------------------------------- the citing sources

function classify(rel) {
  for (const p of NOT_SCANNED) if (rel.startsWith(p)) return { scan: false };
  for (const p of OUT_OF_SCOPE.keys()) if (rel === p || rel.startsWith(p)) return { scan: true, inScope: false };
  for (const p of IN_SCOPE) if (rel === p || rel.startsWith(p)) return { scan: true, inScope: true };
  return { scan: true, inScope: null };  // unclassified: an error if it carries a citation
}

function citingSources() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { walk(abs); continue; }
      const rel = path.relative(repoRoot, abs).split(path.sep).join('/');
      if (!TEXT_EXT.has(path.extname(rel).toLowerCase())) continue;
      const cls = classify(rel);
      if (!cls.scan) continue;
      out.push({ rel, abs, inScope: cls.inScope });
    }
  })(repoRoot);
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

// ---------------------------------------------------------------- resolution

// No prefix means the default set. A prefix is a claim about which set, so it has to name one
// exactly — case-insensitively, since these paths are written on Windows. Anything else is a
// citation nobody can place, and falling back to the default would hide it.
function pickSet(sets, prefix) {
  if (!prefix) return { set: DEFAULT_SET };
  const segs = prefix.replace(/\\/g, '/').split('/').filter(Boolean);
  const last = segs[segs.length - 1] || '';
  for (const name of sets.keys()) if (name.toLowerCase() === last.toLowerCase()) return { set: name };
  return {
    set: null,
    why: `path prefix names no shipped script set: "${last}/" (shipped: ${[...sets.keys()].join(', ')})`,
  };
}

function parseOffset(text) {
  if (!text) return { lo: 0, hi: 0 };
  const [a, b] = text.split('..');
  const lo = parseInt(a, 10);
  const hi = b === undefined ? lo : parseInt(b, 10);
  return { lo, hi, bad: hi < lo };
}

// Resolves an anchor whose landmark sits on `anchorLine`. Returns the resolved {lo, hi} span on
// success and a string reason otherwise. Fail-loud: every rejection names what was expected and
// what was found.
function resolveAnchor(file, anchorLine, offsetText, statements, label) {
  const off = parseOffset(offsetText);
  if (off.bad) return `offset range runs backwards (${offsetText})`;
  const lo = anchorLine + off.lo;
  const hi = anchorLine + off.hi;
  const span = lo === hi ? `line ${lo}` : `lines ${lo}-${hi}`;
  if (lo < 1 || hi > file.lines.length) {
    return `offset leaves the file: ${label} is line ${anchorLine}, so this is ${span}, and `
      + `${file.name} has ${file.lines.length}`;
  }
  // An offset is the one part of an anchor that drift can move silently, so it carries its own
  // evidence: the statement binds the first cited line and a range's second statement binds the
  // last. Without that a `!LABEL!-11` survives an insertion between label and target while
  // pointing somewhere else, which is the failure F227 exists to end.
  const nonzero = off.lo !== 0 || off.hi !== 0;
  if (nonzero && !statements.length) {
    return `an offset needs a statement assertion: write ${label}${offsetText} "<the line it names>"`;
  }
  if (statements.length > (off.lo === off.hi ? 1 : 2)) {
    return 'too many statements: one for a single line, at most one per end of a range';
  }
  for (const [stmt, line] of [[statements[0], lo], [statements[1], hi]]) {
    if (stmt === undefined) continue;
    const want = norm(stmt);
    if (!want) return 'empty statement assertion';
    if (!file.normLines[line - 1].includes(want)) {
      return `statement is not on ${file.name}:${line}, which reads `
        + `"${file.normLines[line - 1].slice(0, 70)}": "${stmt}"`;
    }
  }
  return { lo, hi };
}

function resolve(sets, c) {
  const chosen = pickSet(sets, c.prefix);
  if (!chosen.set) return { kind: 'unresolved', why: chosen.why };
  const files = sets.get(chosen.set);
  const file = files.get((c.file + '.CAS').toUpperCase());
  if (!file) {
    return { kind: 'unresolved', why: `no ${c.file}.CAS in script set "${chosen.set}"` };
  }
  c.setName = chosen.set;
  c.scriptFile = file.name;

  if (c.form === 'span') {
    if (!/^@span:\d+:[0-9a-f]{24}$/.test(c.span)) {
      return { kind: 'malformed', why: `span digest must be 24 hex characters: ${c.span}` };
    }
    if (!c.onProvenanceLine) {
      return { kind: 'malformed', why: 'a @span is resolved only by provenance_audit.js, which reads it '
        + 'only out of a `// PROVENANCE[id]: …` comment; outside one nothing checks it' };
    }
    return { kind: 'delegated' };
  }

  if (c.form === 'label') {
    const at = file.labels.get(c.label.toUpperCase());
    if (!at) {
      return { kind: 'unresolved', why: `${file.name} defines no !${c.label}!` };
    }
    if (at.length > 1) {
      return { kind: 'unresolved', why: `!${c.label}! is defined ${at.length} times in ${file.name} (lines ${at.join(', ')})` };
    }
    const r = resolveAnchor(file, at[0], c.offset, c.statements, `!${c.label}!`);
    return typeof r === 'string' ? { kind: 'unresolved', why: r } : { kind: 'anchor', ...r };
  }

  if (c.form === 'text') {
    const want = norm(c.landmark);
    if (!want) return { kind: 'malformed', why: 'empty text anchor' };
    const hits = [];
    file.normLines.forEach((l, i) => { if (l.includes(want)) hits.push(i + 1); });
    if (hits.length === 0) return { kind: 'unresolved', why: `text not in ${file.name}: "${c.landmark}"` };
    if (hits.length > 1) {
      return { kind: 'unresolved', why: `text anchor is not unique in ${file.name} (${hits.length} lines: ${hits.slice(0, 6).join(', ')}${hits.length > 6 ? '…' : ''}): "${c.landmark}"` };
    }
    const r = resolveAnchor(file, hits[0], c.offset, c.statements, `"${c.landmark}"`);
    return typeof r === 'string' ? { kind: 'unresolved', why: r } : { kind: 'anchor', ...r };
  }

  // line list
  for (const part of c.lines.split(',')) {
    const [a, b] = part.split('-');
    const lo = parseInt(a, 10);
    const hi = b === undefined ? lo : parseInt(b, 10);
    if (lo < 1) return { kind: 'malformed', why: `line 0 does not exist (${part})` };
    if (hi < lo) return { kind: 'malformed', why: `range runs backwards (${part})` };
    if (hi > file.lines.length) {
      return { kind: 'unresolved', why: `line ${hi} is past the end of ${file.name} in "${chosen.set}" (${file.lines.length} lines)` };
    }
  }
  return { kind: 'deprecated' };
}

// ---------------------------------------------------------------- extraction

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

function extract(source) {
  const text = fs.readFileSync(source.abs, 'utf8');
  if (!/\.CAS/i.test(text)) return [];
  const out = [];
  let m;
  CITATION.lastIndex = 0;
  while ((m = CITATION.exec(text))) {
    const [whole, prefix, file, span, bang, label, , labelOff, labelStmt, labelStmt2,
      tilde, landmark, textOff, textStmt, textStmt2, lines] = m;
    const at = m.index;
    const c = {
      source: source.rel, inScope: source.inScope, srcLine: lineOf(text, at), text: whole.trim(),
      prefix: prefix || '', file, locStart: at + (prefix || '').length + file.length + 4,
    };
    if (span) {
      c.form = 'span'; c.span = span;
      // `provenance_audit.js` reads a span only out of a line matching its own comment pattern.
      // Anything looser here would report a span as audited that nothing audits.
      const lineStart = text.lastIndexOf('\n', at) + 1;
      c.onProvenanceLine = /^\s*\/\/\s*PROVENANCE\[[^\]]+\]:\s*\S/.test(text.slice(lineStart, at));
    } else if (bang) {
      c.form = 'label'; c.label = label; c.offset = labelOff;
      c.statements = [labelStmt, labelStmt2].filter((x) => x !== undefined);
    } else if (tilde) {
      c.form = 'text'; c.landmark = landmark; c.offset = textOff;
      c.statements = [textStmt, textStmt2].filter((x) => x !== undefined);
    } else {
      c.form = 'line'; c.lines = lines;
    }
    // Every locator ends where the regex stopped. A comma with a space after it is not a cut
    // list: the grammar allows no spaces inside one, so that comma is prose separating two
    // citations.
    const tail = text.slice(at + whole.length, at + whole.length + 2);
    if (LOCATOR_TAIL.test(tail)) {
      c.malformed = `the locator does not end cleanly: "${whole.trim()}" is followed by "${tail}"`;
    }
    out.push(c);
  }
  const parsed = new Set(out.map((x) => x.locStart));
  let u;
  LOCATOR_START.lastIndex = 0;
  while ((u = LOCATOR_START.exec(text))) {
    if (parsed.has(u.index + u[1].length + 4)) continue;
    out.push({
      source: source.rel, inScope: source.inScope, srcLine: lineOf(text, u.index), form: 'unparsed',
      text: text.slice(u.index, u.index + 48).split(/\s/)[0], prefix: '', file: u[1],
      malformed: 'no locator the grammar defines (Reference docs/CAS citation grammar.md)',
    });
  }
  return out;
}

// Bare `:N` references, attributed to the nearest preceding citation in the same paragraph.
// Heuristic by construction, so it is reported and never gates.
function extractContinuations(source) {
  const text = fs.readFileSync(source.abs, 'utf8');
  if (!/\.CAS/i.test(text)) return [];
  const out = [];
  let lineNo = 0;
  let antecedent = null;
  for (const line of text.split(/\r?\n/)) {
    lineNo++;
    if (!line.trim()) { antecedent = null; continue; }
    const events = [];
    let m;
    ANY_FILE_CITE.lastIndex = 0;
    while ((m = ANY_FILE_CITE.exec(line))) events.push({ at: m.index, cite: m[1] });
    CONTINUATION.lastIndex = 0;
    while ((m = CONTINUATION.exec(line))) events.push({ at: m.index + m[1].length, bare: m[2] });
    events.sort((a, b) => a.at - b.at);
    for (const e of events) {
      if (e.cite) {
        // A bare ref sits inside a full citation's own match; only whole-file cites reset.
        antecedent = e.cite;
      } else if (antecedent && /\.CAS$/i.test(antecedent)
                 && !events.some((f) => f.cite && f.at < e.at && f.at + f.cite.length + 8 > e.at)) {
        out.push({ source: source.rel, srcLine: lineNo, file: antecedent, ref: e.bare });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------- report

function run(argv) {
  const strict = argv.includes('--strict');
  const listArg = argv.find((a) => a === '--list' || a.startsWith('--list='));
  const listMode = listArg ? (listArg.split('=')[1] || 'all') : null;
  const budgetFor = (script) => (strict ? 0 : (DEPRECATED_BUDGET.get(script) || 0));

  const sets = loadScriptSets();
  const sources = citingSources();
  const cites = [];
  const continuations = [];
  const unclassified = new Map();

  for (const s of sources) {
    const found = extract(s);
    if (!found.length) continue;
    if (s.inScope === null) {
      unclassified.set(s.rel, found.length);
      continue;
    }
    for (const c of found) {
      c.result = c.malformed ? { kind: 'malformed', why: c.malformed } : resolve(sets, c);
      cites.push(c);
    }
    continuations.push(...extractContinuations(s));
  }

  const bucket = (k, scope) => cites.filter((c) => c.result.kind === k && (scope === undefined || c.inScope === scope));
  const kinds = ['anchor', 'deprecated', 'delegated', 'unresolved', 'malformed'];
  const failures = cites.filter((c) => c.inScope && (c.result.kind === 'unresolved' || c.result.kind === 'malformed'));

  if (listMode) {
    for (const c of cites) {
      const k = c.result.kind;
      if (listMode === 'bad' && k !== 'unresolved' && k !== 'malformed') continue;
      const tail = c.result.why ? `  <- ${c.result.why}` : (c.result.lo ? `  -> ${c.scriptFile}:${c.result.lo}${c.result.hi !== c.result.lo ? '-' + c.result.hi : ''}` : '');
      console.log(`${k.padEnd(10)} ${c.inScope ? ' ' : '~'} ${c.source}:${c.srcLine}  ${c.text}${tail}`);
    }
    console.log('');
  }

  // Per-script-file census of the budgeted deprecated population: the F227.3-.6 worklist.
  const budgeted = bucket('deprecated', true).filter((c) => c.source !== GRAMMAR_DOC);
  const perScript = new Map();
  for (const c of budgeted) perScript.set(c.scriptFile, (perScript.get(c.scriptFile) || 0) + 1);
  console.log('CAS citation audit — grammar: Reference docs/CAS citation grammar.md');
  console.log(`scanned ${sources.length} sources; script sets: ${[...sets.keys()].join(', ')}\n`);
  const col = (a, b, c) => `${String(a).padEnd(12)}${String(b).padStart(8)}${String(c).padStart(14)}`;
  console.log(col('kind', 'in-scope', 'out-of-scope'));
  for (const k of kinds) console.log(col(k, bucket(k, true).length, bucket(k, false).length));
  console.log(col('TOTAL', cites.filter((c) => c.inScope).length, cites.filter((c) => !c.inScope).length));
  console.log('\ndeprecated line-list citations, in scope and budgeted, by script (count / ceiling):');
  const over = [];
  const scripts = new Set([...perScript.keys(), ...DEPRECATED_BUDGET.keys()]);
  for (const k of [...scripts].sort((a, b) => (perScript.get(b) || 0) - (perScript.get(a) || 0))) {
    const n = perScript.get(k) || 0;
    const b = budgetFor(k);
    if (n > b) over.push([k, n, b]);
    console.log(`  ${String(n).padStart(4)} / ${String(b).padStart(4)}  ${k}${n > b ? '   OVER' : ''}`);
  }
  console.log(`\nbare :N continuations attributed to a CAS antecedent (reported, not gated): ${continuations.length}`);

  let bad = false;
  if (unclassified.size) {
    bad = true;
    console.log('\nFAIL — citation-bearing sources this audit does not classify. Add each to IN_SCOPE');
    console.log('or to OUT_OF_SCOPE with its reason:');
    for (const [f, n] of unclassified) console.log(`  ${f}  (${n} citations)`);
  }
  if (failures.length) {
    bad = true;
    console.log(`\nFAIL — ${failures.length} citation(s) do not resolve against the shipped script set:`);
    for (const c of failures) console.log(`  ${c.source}:${c.srcLine}  ${c.text}\n      ${c.result.why}`);
  }
  const dep = budgeted.length;
  if (over.length) {
    bad = true;
    console.log('\nFAIL — deprecated line-list citations over their ceiling:');
    for (const [k, n, b] of over) console.log(`  ${k}: ${n} > ${b}`);
    console.log('  Write a new citation as a label or text anchor (see the grammar). If an F227');
    console.log("  subtask lowered a script's population, lower its DEPRECATED_BUDGET row to match.");
  }
  if (!bad) {
    console.log(`\nPASS — every in-scope citation resolves; ${dep} deprecated line citations remain,`);
    console.log('  each script at or under its ceiling.');
    if (dep) console.log('  F227.3-.6 convert them; `--strict` zeroes every ceiling: the clean-state exit.');
  }
  return bad ? 1 : 0;
}

if (require.main === module) process.exit(run(process.argv.slice(2)));
// `citingSources` and `extractContinuations` are exported for `tools/build_cas_citation_map.js`
// (F227.2), so the conversion map enumerates the sources this audit gates on, and attributes the
// bare `:N` continuations the grammar says a conversion has to expand, from this file's readers
// rather than from a second copy of them.
module.exports = {
  run, loadScriptSets, citingSources, extract, extractContinuations, resolve, DEPRECATED_BUDGET,
};
