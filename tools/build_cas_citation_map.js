#!/usr/bin/env node
'use strict';

// F227.2 — the conversion map from a stale `.CAS` line citation to a label/text anchor into the
// shipped script set. F227.3-.6 read this file; they do not re-derive it.
//
// The problem. Several hundred in-scope citations name a line number in a Warlord script — 386
// on 2026-09-01, falling as F227.3-.6 convert them — and the tree has shipped four different
// Warlord script sets. A line number therefore has no meaning on its own:
// `OLSpell.CAS` line 587 names three different statements across 1.5.12.6.2, 1.5.12.7 and
// 1.5.12.9. So the map is keyed per *occurrence* — one entry per citation site, not per
// (file, line) — and each entry records which script set the citation was written against before
// it is re-anchored.
//
// The map never writes a `<script>.CAS` glued to a locator, in either direction. `tools/` is in
// `cas_citation_audit.js`'s IN_SCOPE list, so a map that spelled its inputs that way would double
// the very budget F227 is emptying, and a map that spelled its outputs
// that way would emit them through JSON escaping, where `\"` hides the statement assertion and the
// anchor stops resolving. So an entry carries `script` (a bare filename, which the grammar calls a
// mention and does not audit) beside `citedLines` and `anchor`, and a consumer joins them. A
// self-check over the serialised file halts the build if any locator slips through.
//
// The pipeline, per occurrence:
//   1. attribute  — which script set was on disk when this citation's line number was chosen
//   2. read       — the statement(s) that line names in the attributed set
//   3. map        — where that statement sits in `Warlord 1.5.12.9`, by diff alignment
//   4. anchor     — the enclosing `!LABEL!`, a signed offset, and the quoted statement(s)
//   5. verify     — resolve the emitted anchor through `cas_citation_audit.js`'s own resolver
//
// Classes: `clean` (every viable candidate set lands on the same statement), `ambiguous` (the
// candidate sets disagree and nothing in the record decides which was meant), `unconvertible`
// (the cited statement is not in 1.5.12.9, the line is blank, or the anchor will not resolve).
// An `unconvertible` entry is a finding for F227.3-.6, not something to force.
//
// Fail-loud: a malformed citation, a diff alignment that does not verify, or an emitted anchor
// that the audit's resolver rejects halts with the citation and its source file named.
//
// Usage:
//   node tools/build_cas_citation_map.js              build tools/cas_citation_map.json
//   node tools/build_cas_citation_map.js --list       also print one line per occurrence
//   node tools/build_cas_citation_map.js --class=X    print only that class
//
// An entry is keyed on the citing file and the line the citation sat on when the map was built,
// so rebuild before converting rather than reading a map from an earlier day: the build takes
// under a minute and the sources move.

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const audit = require('./cas_citation_audit.js');

const repoRoot = path.resolve(__dirname, '..');
const SHIPPED = 'Warlord 1.5.12.9';
const GRAMMAR_DOC = 'Reference docs/CAS citation grammar.md';
const OUT = path.join(__dirname, 'cas_citation_map.json');
// This tool and the map it writes are excluded from the citation population they describe. The
// self-check at the end of `main` proves the map carries no locator, but a map left behind by an
// older or failed run would otherwise be read back in as several hundred fresh citations.
const SELF = new Set(['tools/build_cas_citation_map.js', 'tools/cas_citation_map.json']);

const norm = (s) => s.replace(/\s+/g, ' ').trim();
const git = (args) => cp.execFileSync('git', args,
  { cwd: repoRoot, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] }).toString();

function die(msg) {
  console.error(`\nFAIL — ${msg}`);
  process.exit(1);
}

// ------------------------------------------------------------------ the script-set timeline
//
// Which Warlord sets were on disk when, established from git rather than assumed:
//   e17404e 2026-07-29  adds `Warlord 1.5.12.6 (superseded)` (5 scripts) and `Warlord 1.5.12.6.2`
//   b5c97e5 2026-08-04  deletes `Warlord 1.5.12.6 (superseded)`
//   b844423 2026-08-09  adds `Warlord 1.5.12.7`
//   (uncommitted)       `Warlord 1.5.12.9` lands on disk, 1.5.12.6.2 and 1.5.12.7 are deleted from
//                       the working tree but stay tracked at HEAD, which is how this tool reads
//                       them. The landing has no commit, so its timestamp is the set's file mtime.
//
// `1.5.12.6 (superseded)` was named superseded on the day it landed, alongside the full 1.5.12.6.2
// set, so it is carried as a non-preferred candidate: it is reported when it disagrees but does
// not on its own make an occurrence ambiguous.
const OLD_SETS = [
  { name: 'Warlord 1.5.12.6 (superseded)', rev: 'b5c97e5^', preferred: false },
  { name: 'Warlord 1.5.12.6.2', rev: 'HEAD', preferred: true },
  { name: 'Warlord 1.5.12.7', rev: 'HEAD', preferred: true },
];

function shippedSetMtime() {
  const dir = path.join(repoRoot, 'Reference docs', 'Script source', SHIPPED);
  let newest = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.CAS$/i.test(f)) continue;
    newest = Math.max(newest, Math.floor(fs.statSync(path.join(dir, f)).mtimeMs / 1000));
  }
  if (!newest) die(`no .CAS files in "${SHIPPED}" to date the set from`);
  return newest;
}

function commitTime(rev) {
  return parseInt(git(['log', '-1', '--format=%at', rev]).trim(), 10);
}

// Sets live at author-time `t`, newest first. After the 1.5.12.9 landing the working tree holds
// only the shipped set, even though 1.5.12.6.2 and 1.5.12.7 are still tracked at HEAD.
function setsLiveAt(t, epochs) {
  if (t >= epochs.shipped) return [{ name: SHIPPED, preferred: true }];
  const live = [];
  if (t >= epochs.add127) live.push(OLD_SETS[2]);
  live.push(OLD_SETS[1]);
  if (t < epochs.del126) live.push(OLD_SETS[0]);
  return live;
}

// ------------------------------------------------------------------ script contents

const fileCache = new Map();

function scriptOf(setName, scriptFile, sets) {
  const key = `${setName}|${scriptFile.toUpperCase()}`;
  if (fileCache.has(key)) return fileCache.get(key);
  let lines = null;
  if (setName === SHIPPED) {
    const f = sets.get(SHIPPED).get(scriptFile.toUpperCase());
    lines = f ? f.lines : null;
  } else {
    const spec = OLD_SETS.find((s) => s.name === setName);
    const p = `Reference docs/Script source/${setName}/${scriptFile}`;
    try {
      lines = git(['show', `${spec.rev}:${p}`]).split(/\r?\n/);
      if (lines.length && lines[lines.length - 1] === '') lines.pop();
    } catch (e) { lines = null; }
  }
  const rec = lines && { lines, normLines: lines.map(norm) };
  fileCache.set(key, rec);
  return rec;
}

// ------------------------------------------------------------------ old -> new line alignment
//
// `git diff --no-index -U0` between the attributed set's script and the shipped one. Both sides
// are re-emitted with `\n` endings from the same split, so an EOL difference between a blob and a
// working file cannot masquerade as a rewritten line. Every mapped line is asserted to carry
// byte-identical text on both sides before the map is used.

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cas-map-'));
const alignCache = new Map();
let tmpN = 0;

function writeTmp(lines) {
  const p = path.join(tmpDir, `s${tmpN++}.txt`);
  fs.writeFileSync(p, lines.join('\n') + '\n');
  return p;
}

function align(setName, scriptFile, sets) {
  const key = `${setName}|${scriptFile.toUpperCase()}`;
  if (alignCache.has(key)) return alignCache.get(key);
  const oldF = scriptOf(setName, scriptFile, sets);
  const newF = scriptOf(SHIPPED, scriptFile, sets);
  if (!oldF || !newF) { alignCache.set(key, null); return null; }

  let out = '';
  if (setName !== SHIPPED) {
    const a = writeTmp(oldF.lines);
    const b = writeTmp(newF.lines);
    // `core.autocrlf=false` so the temp files, which are written LF-only from the same split as
    // the script contents, are compared as written rather than through the checkout filter.
    try {
      git(['-c', 'core.autocrlf=false', 'diff', '--no-index', '--unified=0', '--no-color',
        '--', a, b]);
    } catch (e) {
      out = e.stdout ? e.stdout.toString() : '';   // git diff exits 1 when files differ
    }
  }

  const hunks = [];
  for (const line of out.split('\n')) {
    const m = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (!m) continue;
    hunks.push({
      a: +m[1], b: m[2] === undefined ? 1 : +m[2],
      c: +m[3], d: m[4] === undefined ? 1 : +m[4],
    });
  }
  hunks.sort((x, y) => x.a - y.a);

  const map = new Array(oldF.lines.length + 1).fill(null);
  const repl = new Map();
  let o = 1, n = 1;
  for (const h of hunks) {
    // Unified-diff convention at -U0: for a pure insertion `-a,0 +c,d`, `a` is the last old line
    // before the insertion; for a pure deletion `-a,b +c,0`, `c` is the last *new* line before the
    // deletion, so the new side resumes at c+1 rather than at c.
    if (h.b === 0) {                        // pure insertion after old line h.a
      while (o <= h.a) { map[o] = n; o++; n++; }
      n += h.d;
    } else {
      while (o < h.a) { map[o] = n; o++; n++; }
      const win = h.d ? [h.c, h.c + h.d - 1] : null;
      for (let i = h.a; i < h.a + h.b; i++) { map[i] = null; repl.set(i, win); }
      o = h.a + h.b; n = h.d ? h.c + h.d : h.c + 1;
    }
  }
  while (o <= oldF.lines.length) { map[o] = n; o++; n++; }

  // Self-check: a mapped line must be byte-identical on both sides, or the alignment is wrong and
  // every anchor derived from it would be wrong too.
  for (let i = 1; i <= oldF.lines.length; i++) {
    if (map[i] === null) continue;
    if (map[i] < 1 || map[i] > newF.lines.length || newF.lines[map[i] - 1] !== oldF.lines[i - 1]) {
      die(`diff alignment is inconsistent for ${scriptFile} (${setName} -> ${SHIPPED}): old line `
        + `${i} maps to new line ${map[i]}, but the text differs`);
    }
  }
  const rec = { map, repl, oldF, newF };
  alignCache.set(key, rec);
  return rec;
}

// ------------------------------------------------------------------ attribution
//
// When was this citation's line number chosen? Two readings, in this order:
//
//   introduction — the oldest revision of the citing file (following renames) whose content
//                  already carries this exact citation string. This is the authoritative reading,
//                  because a line number is chosen once and then carried: a later comment reflow
//                  or an unrelated edit moves the citation's line without re-deriving the number,
//                  and blame would credit that edit instead.
//   blame        — the author-time of the source line, used only when the citation appears in no
//                  committed revision of the file (added in the working tree, or the file itself
//                  is untracked). An uncommitted line has no author-time, so it is dated `now`,
//                  which places it in the shipped set.
//
// The match is anchored on the right so that a citation of line 104 does not match a line carrying
// a citation of line 1045, or of lines 104-110, in the same script.
//
// Known limit, recorded rather than papered over: a citation that was written in one file and
// later moved to another dates from its arrival in the second file, so its attribution can be
// newer than the truth. Each entry carries `introducedIn` so a reader can check.

const blameCache = new Map();

function blameTimes(rel) {
  if (blameCache.has(rel)) return blameCache.get(rel);
  let times = null;
  try {
    const out = git(['blame', '--line-porcelain', '--', rel]);
    times = [];
    let cur = null;
    for (const line of out.split('\n')) {
      const h = /^([0-9a-f]{40}) \d+ (\d+)/.exec(line);
      if (h) { cur = { sha: h[1], ln: +h[2] }; continue; }
      const t = /^author-time (\d+)/.exec(line);
      if (t && cur) { times[cur.ln] = { sha: cur.sha, at: +t[1] }; cur = null; }
    }
  } catch (e) { times = null; }        // untracked file
  blameCache.set(rel, times);
  return times;
}

const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const historyCache = new Map();

// Every committed revision of a file, oldest first, following renames. Contents are read once and
// held, so the per-citation search below is a string scan rather than a git call.
function fileHistory(rel) {
  if (historyCache.has(rel)) return historyCache.get(rel);
  let revs = [];
  try {
    const out = git(['log', '--follow', '--format=@@%H %at', '--name-only', '--', rel]);
    let cur = null;
    for (const line of out.split('\n')) {
      const h = /^@@([0-9a-f]{40}) (\d+)$/.exec(line);
      if (h) { cur = { sha: h[1], at: +h[2] }; continue; }
      if (cur && line.trim() && !cur.path) { cur.path = line.trim(); revs.push(cur); cur = null; }
    }
  } catch (e) { revs = []; }
  revs.reverse();
  for (const r of revs) {
    try { r.text = git(['show', `${r.sha}:${r.path}`]); } catch (e) { r.text = ''; }
  }
  historyCache.set(rel, revs);
  return revs;
}

const introCache = new Map();

function introduction(rel, citationText) {
  const key = `${rel}|${citationText}`;
  if (introCache.has(key)) return introCache.get(key);
  // The boundary rejects a longer line list, not prose: `…:30` must not match `…:301` or
  // `…:30-40` or `…:30,41`, but `…:30,` followed by a space is the audit's own rule for where a
  // citation ends, and rejecting it sent a dozen committed citations to the blame fallback.
  // Bounded on both sides and case-insensitive, matching the audit's own reader: the right
  // boundary rejects a longer line list (`:30` must not match `:301`, `:30-40` or `:30,41`) while
  // still allowing `:30,` followed by a space, which is where the audit says a citation ends; the
  // left boundary stops a citation of one script matching inside a longer filename that ends in
  // the same characters (`UnitCalc` inside `OtherUnitCalc`).
  const re = new RegExp('(?<![A-Za-z0-9_])' + escRe(citationText) + '(?![0-9-])(?!,[0-9])', 'i');
  // The *current* run, not the first appearance ever: `Calculator/stats.js` has a citation that
  // was removed and later written again, and dating it from the first appearance would attribute
  // it to a script set that was gone by the time it was written back. So walk newest to oldest
  // and stop at the first revision that does not carry it.
  const revs = fileHistory(rel);
  let rec = null;
  for (let i = revs.length - 1; i >= 0; i--) {
    if (!re.test(revs[i].text)) break;
    rec = { sha: revs[i].sha.slice(0, 7), at: revs[i].at, path: revs[i].path };
  }
  introCache.set(key, rec);
  return rec;
}

// ------------------------------------------------------------------ anchor construction

// A statement assertion cannot contain `"` (the grammar's own restriction), so cite the longest
// quote-free run of the line. The audit matches by `includes` after whitespace collapse.
function statementFor(text) {
  const t = norm(text);
  if (!t.includes('"')) return t;
  let best = '';
  for (const part of t.split('"')) if (norm(part).length > best.length) best = norm(part);
  return best;
}

function uniqueLabels(sets, scriptFile) {
  const f = sets.get(SHIPPED).get(scriptFile.toUpperCase());
  const out = [];
  for (const [name, at] of f.labels) if (at.length === 1) out.push({ name, line: at[0] });
  return out.sort((a, b) => a.line - b.line);
}

// The enclosing label: the nearest uniquely-defined `!LABEL!` at or before the target. Falls back
// to the nearest following label (a negative offset) when the target precedes every label.
function enclosingLabel(labels, line) {
  let before = null, after = null;
  for (const l of labels) {
    if (l.line <= line) before = l;
    else { after = l; break; }
  }
  return before || after;
}

// For a label-less script (`MASTER.CAS`, `SpellMysticSurge.CAS`) the landmark is the target line's
// own text when that text is unique in the file, and otherwise the nearest line whose text is,
// with the offset carrying the distance.
// A landmark is preferred short, the way the grammar's own example is: `MASTER.CAS` pairs each
// constant with a `: … :` comment that would otherwise run to 150 characters, and these anchors
// are written into prose. So the code before the trailing comment is tried first, and the whole
// line only if that is not unique.
function textLandmark(newF, line) {
  const uniq = (t) => t && newF.normLines.filter((l) => l.includes(t)).length === 1;
  const forms = (n) => {
    const full = statementFor(newF.lines[n - 1]);
    const code = norm(full.split(/\s+:/)[0]);
    return code && code !== full ? [code, full] : [full];
  };
  for (const t of forms(line)) if (uniq(t)) return { text: t, line };
  for (let d = 1; d <= 60; d++) {
    for (const cand of [line - d, line + d]) {
      if (cand < 1 || cand > newF.lines.length) continue;
      for (const t of forms(cand)) if (uniq(t)) return { text: t, line: cand };
    }
  }
  return null;
}

const sign = (n) => (n < 0 ? String(n) : '+' + n);

// Returns the locator alone — `!LABEL!+7 "…"` or `~"…"+7 "…"` — with no filename in front of it,
// for the reason in the header comment. `note` records where a range had to drop its second
// assertion.
function buildAnchor(scriptFile, newLo, newHi, newF, labels) {
  const stmtLo = statementFor(newF.lines[newLo - 1]);
  const stmtHi = statementFor(newF.lines[newHi - 1]);
  const note = [];

  // A range's first statement is mandatory once the offset is nonzero; its second is optional, so
  // a range ending on a blank line still converts, with one end pinned instead of two.
  const tailFor = (lo, hi) => {
    if (lo === hi) return ` "${stmtLo}"`;
    if (stmtHi) return ` "${stmtLo}" "${stmtHi}"`;
    note.push(`${SHIPPED} line ${newHi} of ${scriptFile} is blank, so the range pins its first `
      + 'line only');
    return ` "${stmtLo}"`;
  };
  const blankLo = () => ({
    error: `${SHIPPED} line ${newLo} of ${scriptFile} is blank, so no statement can bind the `
      + 'anchor and the offset would be unchecked',
  });

  if (labels.length) {
    const lab = enclosingLabel(labels, newLo);
    if (!lab) return { error: `${scriptFile} defines no uniquely-named label to anchor on` };
    const lo = newLo - lab.line, hi = newHi - lab.line;
    if (lo === 0 && hi === 0) return { anchor: `!${lab.name}!`, landmarkLine: lab.line, note };
    if (!stmtLo) return blankLo();
    const off = lo === hi ? sign(lo) : `${sign(lo)}..${sign(hi)}`;
    return { anchor: `!${lab.name}!${off}${tailFor(lo, hi)}`, landmarkLine: lab.line, note };
  }

  const lm = textLandmark(newF, newLo);
  if (!lm) {
    return { error: `no unique text landmark within 60 lines of ${SHIPPED} line ${newLo} of ${scriptFile}` };
  }
  const lo = newLo - lm.line, hi = newHi - lm.line;
  if (lo === 0 && hi === 0) return { anchor: `~"${lm.text}"`, landmarkLine: lm.line, note };
  if (!stmtLo) return blankLo();
  const off = lo === hi ? sign(lo) : `${sign(lo)}..${sign(hi)}`;
  return { anchor: `~"${lm.text}"${off}${tailFor(lo, hi)}`, landmarkLine: lm.line, note };
}

// ------------------------------------------------------------------ resolving one cited line

function resolveOldLine(al, L) {
  const { map, repl, oldF, newF } = al;
  if (L < 1 || L > oldF.lines.length) {
    return { status: 'out-of-file', why: `line ${L} is past the end of the attributed set (${oldF.lines.length} lines)` };
  }
  const want = oldF.normLines[L - 1];
  // A blank line that the alignment carries through still has a position, and a range whose last
  // line is blank converts fine because the grammar's second statement is optional. A blank line
  // the alignment does not carry has nothing to search for.
  if (map[L] !== null) {
    return { status: want ? 'exact' : 'exact-blank', newLine: map[L], text: want };
  }
  if (!want) {
    return { status: 'blank-unmapped', why: `line ${L} is blank in the attributed set and the `
      + `alignment does not carry it into ${SHIPPED}`, text: '' };
  }

  const hits = [];
  newF.normLines.forEach((t, i) => { if (t === want) hits.push(i + 1); });
  if (!hits.length) return { status: 'gone', why: `the statement is not in ${SHIPPED}`, text: want };

  // Prefer a hit inside the hunk that replaced the line; otherwise the hit nearest to where the
  // surrounding alignment puts it.
  const win = repl.get(L);
  const inWin = win ? hits.filter((h) => h >= win[0] && h <= win[1]) : [];
  let expect = null;
  for (let d = 1; d < oldF.lines.length && expect === null; d++) {
    if (L - d >= 1 && map[L - d] !== null) expect = map[L - d] + d;
    else if (L + d <= oldF.lines.length && map[L + d] !== null) expect = map[L + d] - d;
  }
  const pool = inWin.length ? inWin : hits;
  const sorted = [...pool].sort((x, y) => Math.abs(x - expect) - Math.abs(y - expect));
  return {
    status: pool.length === 1 ? 'matched' : 'matched-nearest',
    newLine: sorted[0], text: want, alternatives: sorted.slice(0, 6),
  };
}

// The shipped-set neighbourhood of a target, so an occurrence the map cannot convert can be
// re-aimed without opening the script.
function contextAround(newF, parts) {
  const out = [];
  for (const p of parts) {
    const at = (p.lo && p.lo.newLine) || (p.hi && p.hi.newLine);
    if (!at) continue;
    for (let i = Math.max(1, at - 3); i <= Math.min(newF.lines.length, at + 3); i++) {
      out.push(`${i}: ${newF.normLines[i - 1]}`);
    }
  }
  return out.length ? out : null;
}

// ------------------------------------------------------------------ main

function parseRanges(c) {
  return c.lines.split(',').map((part) => {
    const [a, b] = part.split('-');
    const lo = parseInt(a, 10);
    const hi = b === undefined ? lo : parseInt(b, 10);
    if (!(lo >= 1) || !(hi >= lo)) die(`malformed line list "${c.text}" in ${c.source}:${c.srcLine}`);
    return { lo, hi, text: part };
  });
}

function build() {
  const sets = audit.loadScriptSets();
  if (!sets.has(SHIPPED)) die(`the shipped set "${SHIPPED}" is not on disk`);

  const epochs = {
    del126: commitTime('b5c97e5'),
    add127: commitTime('b844423'),
    shipped: shippedSetMtime(),
  };

  // Every in-scope line citation, taken from the audit's own extractor and source classification
  // so that this map covers exactly the population the audit budgets.
  const cites = [];
  for (const s of audit.citingSources()) {
    if (SELF.has(s.rel)) continue;   // the map and this tool are not sources of citations
    for (const c of audit.extract(s)) {
      if (c.form !== 'line' || !s.inScope || s.rel === GRAMMAR_DOC) continue;
      if (c.malformed) die(`${c.malformed} (${c.source}:${c.srcLine})`);
      const r = audit.resolve(sets, c);
      if (r.kind === 'malformed') die(`${r.why} (${c.source}:${c.srcLine})`);
      cites.push(c);
    }
  }

  const labelsCache = new Map();
  const labelsFor = (scriptFile) => {
    if (!labelsCache.has(scriptFile)) {
      labelsCache.set(scriptFile, uniqueLabels(sets, scriptFile));
    }
    return labelsCache.get(scriptFile);
  };

  const entries = [];
  const seen = new Map();
  for (const c of cites) {
    const scriptFile = `${c.file}.CAS`;
    // One id per occurrence. Several citations share a source line often enough — one preset
    // `desc` cites three scripts — that keying `nth` on the citation text would hand them all
    // `#0` and let a consumer indexing by id overwrite two of the three.
    const occ = `${c.source}:${c.srcLine}`;
    const nth = (seen.get(occ) || 0); seen.set(occ, nth + 1);

    // --- attribution
    const bl = blameTimes(c.source);
    const blame = bl && bl[c.srcLine] ? bl[c.srcLine] : null;
    const uncommitted = !blame || /^0+$/.test(blame.sha);
    const pick = introduction(c.source, c.text);
    const at = pick ? pick.at : (uncommitted ? Math.floor(Date.now() / 1000) : blame.at);
    const basis = pick ? `introduced in ${pick.sha} (${pick.path})`
      : (uncommitted ? 'in no committed revision of this file; new in the working tree'
        : `blame: ${blame.sha.slice(0, 7)}`);
    let candidates = setsLiveAt(at, epochs)
      .filter((s) => !!scriptOf(s.name, scriptFile, sets));
    if (!candidates.length) {
      die(`no candidate script set carries ${scriptFile} for ${c.source}:${c.srcLine} "${c.text}"`);
    }

    // --- resolve each range against every set that carries the script, not only the candidates.
    // The candidates decide the answer; the rest are the cross-check that says whether the answer
    // depended on the attribution at all.
    const ranges = parseRanges(c);
    const allSets = [...OLD_SETS, { name: SHIPPED, preferred: true }];
    const perSet = [];
    for (const s of allSets) {
      const al = align(s.name, scriptFile, sets);
      if (!al) continue;
      perSet.push({
        set: s.name,
        preferred: s.preferred,
        candidate: candidates.some((x) => x.name === s.name),
        parts: ranges.map((r) => ({
          cited: r.text,
          lo: resolveOldLine(al, r.lo),
          hi: r.hi === r.lo ? null : resolveOldLine(al, r.hi),
        })),
      });
    }

    const targetKey = (pc) => pc.parts.map((p) => {
      const a = p.lo.newLine || `!${p.lo.status}`;
      const b = p.hi ? (p.hi.newLine || `!${p.hi.status}`) : a;
      return `${a}-${b}`;
    }).join(',');

    // `perSet` follows `allSets`, which is oldest first, so the newest candidate is the last one.
    // A citation written while two sets sat side by side was written against the newer: the mod
    // release is what the reader had open, and the older set is kept only to report against.
    const notes = [];
    let cands = perSet.filter((p) => p.candidate);
    // A citation does not name a blank line, or a line past the end of the file, as its first
    // line — so a candidate that reads one there is not the set it was written against, as long
    // as another candidate does not. This is content narrowing the date window, and it is the
    // only narrowing the map does. It is a heuristic, not a proof: the `unconvertible` entries
    // are stale citations that *do* land on blank lines. It fires only where a sibling candidate
    // reads a statement there, and every occurrence it fires on carries the note below.
    const nonBlank = cands.filter((p) => p.parts.every((x) => !!x.lo.text));
    if (nonBlank.length && nonBlank.length < cands.length) {
      notes.push('narrowed by content: '
        + cands.filter((p) => !nonBlank.includes(p)).map((p) => `"${p.set}"`).join(', ')
        + ' have no statement on the first cited line, which no citation names');
      cands = nonBlank;
    }
    const decisive = cands.filter((p) => p.preferred).length
      ? cands.filter((p) => p.preferred) : cands;
    const chosen = decisive[decisive.length - 1];
    if (cands.some((p) => !p.preferred && targetKey(p) !== targetKey(chosen))) {
      notes.push('the non-preferred "Warlord 1.5.12.6 (superseded)" set disagrees; it was already '
        + 'marked superseded on the day it landed, so it does not decide this occurrence');
    }
    let cls = new Set(decisive.map(targetKey)).size > 1 ? 'ambiguous' : 'clean';

    // Set-independence: would every set the tree has ever shipped give this same answer? Where it
    // would, the attribution carried no weight and cannot be wrong. Where it would not, the entry
    // says so, because that is exactly where an attribution error changes the anchor.
    const others = perSet.filter((p) => p.preferred && targetKey(p) !== targetKey(chosen));
    const setIndependent = others.length === 0;
    if (!setIndependent && cls === 'clean') {
      notes.push('attribution-sensitive: '
        + others.map((p) => `"${p.set}" would give ${targetKey(p)}`).join('; '));
    }

    // --- anchor from the chosen candidate
    const newF = scriptOf(SHIPPED, scriptFile, sets);
    const labels = labelsFor(scriptFile);
    const anchors = [];
    let bad = null;
    for (const p of chosen.parts) {
      const loR = p.lo, hiR = p.hi || p.lo;
      if (!loR.newLine || !hiR.newLine) {
        const why = `${loR.newLine ? hiR.why : loR.why} (${scriptFile} lines ${p.cited}, read `
          + `against "${chosen.set}")`;
        bad = bad || why;
        anchors.push({ citedLines: p.cited, error: why });
        continue;
      }
      const lo = loR.newLine, hi = Math.max(loR.newLine, hiR.newLine);
      if (hiR.newLine < loR.newLine) {
        bad = bad || `the mapped range runs backwards: ${loR.newLine} > ${hiR.newLine}`;
      }
      const a = buildAnchor(scriptFile, lo, hi, newF, labels);
      if (a.error) {
        // Name what the other sets read at the same line. A comma list is two citations under the
        // grammar and its parts can carry line numbers from two different releases, which is what
        // this makes visible.
        const alt = perSet.filter((q) => q !== chosen)
          .map((q) => {
            const m = q.parts.find((x) => x.cited === p.cited);
            return m && m.lo.text
              ? `"${q.set}" starts ${scriptFile} lines ${p.cited} at "${m.lo.text.slice(0, 60)}"`
              : null;
          }).filter(Boolean);
        const why = a.error + (alt.length ? ` — ${alt.join('; ')}` : '');
        bad = bad || why;
        anchors.push({ citedLines: p.cited, error: why });
        continue;
      }
      // The grammar can pin only the ends of a range, so a range whose interior was rewritten
      // still converts — but saying nothing about it would let `setIndependent`, which is also an
      // endpoint statement, read as a claim about the whole block. Count the interior drift.
      const cited = ranges[chosen.parts.indexOf(p)];
      const oldSpan = align(chosen.set, scriptFile, sets).oldF.normLines
        .slice(cited.lo - 1, cited.hi);
      const newSpan = newF.normLines.slice(lo - 1, hi);
      const interiorChanged = oldSpan.length !== newSpan.length
        || oldSpan.some((t, i) => t !== newSpan[i]);
      anchors.push({
        citedLines: p.cited, newLo: lo, newHi: hi, anchor: a.anchor, interiorChanged,
        via: loR.status.startsWith('exact') && hiR.status.startsWith('exact') ? 'alignment'
          : `content match (${loR.status}/${hiR.status})`,
      });
      if (interiorChanged) {
        notes.push(`the range's ends are the same statements in "${chosen.set}" and ${SHIPPED}, but `
          + 'lines inside it were rewritten, so setIndependent speaks for the ends only');
      }
      notes.push(...a.note);
      if (loR.status === 'matched-nearest' || hiR.status === 'matched-nearest') {
        notes.push(`the cited statement is not unique in ${SHIPPED}; the nearest alignment-consistent `
          + `occurrence was taken (alternatives: ${(loR.alternatives || hiR.alternatives).join(', ')})`);
      }
    }
    if (bad) cls = 'unconvertible';
    if (ranges.length > 1 && cls !== 'unconvertible') {
      notes.push('a comma list is two citations under the grammar, so this occurrence emits one '
        + 'anchor per range');
    }

    entries.push({
      // `script` is a bare filename and `citedLines` the locator, deliberately never joined: see
      // the header comment.
      id: `${c.source}:${c.srcLine}#${nth}`,
      source: c.source, sourceLine: c.srcLine,
      script: scriptFile, citedLines: c.lines, prefix: c.prefix || null,
      attribution: {
        set: chosen.set, at: new Date(at * 1000).toISOString().slice(0, 10), basis,
        introducedIn: pick ? pick.sha : null,
        candidates: candidates.map((s) => s.name),
        uncommittedLine: uncommitted,
        setIndependent,
      },
      class: cls,
      reason: bad || null,
      readings: perSet.map((p) => ({
        set: p.set, candidate: p.candidate,
        parts: p.parts.map((x) => ({
          citedLines: x.cited,
          loStatus: x.lo.status, loText: x.lo.text, loNew: x.lo.newLine || null,
          hiStatus: x.hi ? x.hi.status : null, hiText: x.hi ? x.hi.text : null,
          hiNew: x.hi ? (x.hi.newLine || null) : null,
        })),
      })),
      anchors,
      // What sits around the target in the shipped set, so an unconvertible occurrence can be
      // re-aimed by hand without opening the script.
      shippedContext: bad ? contextAround(newF, chosen.parts) : null,
      continuations: [],
      notes,
    });
  }

  // The grammar's own rule: a bare `:N` inherits its file from the nearest preceding citation, and
  // an anchor has no line number for one to continue, so converting a citation obliges expanding
  // every continuation hanging off it. Attach them to the entry that will be converted.
  const contByKey = new Map();
  for (const s of audit.citingSources()) {
    if (!s.inScope || s.rel === GRAMMAR_DOC || SELF.has(s.rel)) continue;
    for (const k of audit.extractContinuations(s)) {
      const key = `${s.rel}|${k.file.toUpperCase()}`;
      (contByKey.get(key) || contByKey.set(key, []).get(key)).push(k);
    }
  }
  // A continuation belongs to the nearest citation of the same script at or above it, which is
  // the audit's own attribution rule; a continuation frequently sits a line or two below its
  // antecedent, so matching on the exact line would miss most of them.
  for (const [key, refs] of contByKey) {
    const [source, script] = key.split('|');
    const own = entries.filter((e) => e.source === source && e.script.toUpperCase() === script)
      .sort((a, b) => a.sourceLine - b.sourceLine);
    if (!own.length) continue;
    for (const k of refs) {
      let host = null;
      for (const e of own) if (e.sourceLine <= k.srcLine) host = e;
      (host || own[0]).continuations.push(`${k.ref} (${source}:${k.srcLine})`);
    }
  }

  return { sets, entries, epochs };
}

// ------------------------------------------------------------------ verification
//
// Every emitted anchor is resolved back through `cas_citation_audit.js` — the same extractor and
// the same resolver the audit gates on — and the resolved span is compared against the lines the
// map says it names. A map whose anchors the audit would reject is worse than no map.

function verify(entries, sets) {
  const lines = [];
  const index = [];
  for (const e of entries) {
    for (let i = 0; i < e.anchors.length; i++) {
      const a = e.anchors[i];
      if (!a.anchor) continue;
      index.push({ e, a });
      // The map stores the locator alone; a citation is that locator behind its file, which is
      // what the audit's extractor reads and what F227.3-.6 will write into the sources.
      lines.push(`${e.prefix || ''}${e.script}${a.anchor}`);
    }
  }
  const p = path.join(tmpDir, 'anchors.md');
  fs.writeFileSync(p, lines.join('\n') + '\n');
  const found = audit.extract({ rel: 'tools/cas_citation_map.json', abs: p, inScope: true });
  const byLine = new Map();
  for (const c of found) if (!byLine.has(c.srcLine)) byLine.set(c.srcLine, c);

  let ok = 0;
  const bad = [];
  index.forEach((rec, i) => {
    const c = byLine.get(i + 1);
    if (!c || c.malformed) {
      bad.push([rec, c ? c.malformed : 'the emitted anchor does not parse as a citation']);
      rec.a.verified = false; return;
    }
    const r = audit.resolve(sets, c);
    if (r.kind !== 'anchor') { bad.push([rec, r.why || r.kind]); rec.a.verified = false; return; }
    if (r.lo !== rec.a.newLo || r.hi !== rec.a.newHi) {
      bad.push([rec, `resolves to ${r.lo}-${r.hi}, but the map names ${rec.a.newLo}-${rec.a.newHi}`]);
      rec.a.verified = false; return;
    }
    rec.a.verified = true; ok++;
  });
  return { ok, bad, total: index.length };
}

// ------------------------------------------------------------------ report

function main(argv) {
  const t0 = Date.now();
  const { sets, entries, epochs } = build();
  const v = verify(entries, sets);

  // A verification failure demotes the occurrence: the map must never advertise an anchor the
  // audit would reject.
  for (const [rec, why] of v.bad) {
    rec.e.class = 'unconvertible';
    rec.e.reason = rec.e.reason || `the emitted anchor does not resolve: ${why}`;
  }

  const counts = { clean: 0, ambiguous: 0, unconvertible: 0 };
  for (const e of entries) counts[e.class]++;

  const out = {
    generated: new Date().toISOString(),
    item: 'F227.2',
    shippedSet: SHIPPED,
    grammar: GRAMMAR_DOC,
    oldSetTimeline: {
      'Warlord 1.5.12.6 (superseded)': `e17404e .. b5c97e5 (${new Date(epochs.del126 * 1000).toISOString().slice(0, 10)}), non-preferred`,
      'Warlord 1.5.12.6.2': `e17404e .. the 1.5.12.9 landing`,
      'Warlord 1.5.12.7': `b844423 (${new Date(epochs.add127 * 1000).toISOString().slice(0, 10)}) .. the 1.5.12.9 landing`,
      [SHIPPED]: `on disk since ${new Date(epochs.shipped * 1000).toISOString().slice(0, 16)} (untracked; dated by file mtime)`,
    },
    counts,
    anchorsEmitted: v.total,
    anchorsVerified: v.ok,
    entries,
  };
  // Self-check before the file lands: `tools/` is in the audit's IN_SCOPE list, so a locator that
  // survived into the serialised map would either add a deprecated citation to the budget F227 is
  // emptying or — through JSON's `\"` — emit an anchor whose statement assertion the audit cannot
  // see. Either way the map would break the check it exists to satisfy.
  const json = JSON.stringify(out, null, 1) + '\n';
  const probe = path.join(tmpDir, 'map-probe.md');
  fs.writeFileSync(probe, json);
  const leaked = audit.extract({ rel: OUT, abs: probe, inScope: true });
  if (leaked.length) {
    die(`the serialised map carries ${leaked.length} locator(s) the audit would read as citations, `
      + `the first being "${leaked[0].text}" — split the filename from the locator`);
  }
  fs.writeFileSync(OUT, json);

  const listArg = argv.find((a) => a === '--list' || a.startsWith('--list='));
  const clsArg = (argv.find((a) => a.startsWith('--class=')) || '').split('=')[1];
  if (listArg || clsArg) {
    for (const e of entries) {
      if (clsArg && e.class !== clsArg) continue;
      console.log(`${e.class.padEnd(14)} ${e.source}:${e.sourceLine}  ${e.script}:${e.citedLines}`
        + `   [${e.attribution.set}]`);
      for (const a of e.anchors) {
        console.log(`     ${a.anchor ? (a.verified ? 'OK  ' : 'BAD ') + a.anchor : 'ERR ' + a.error}`);
      }
      if (e.reason) console.log(`     reason: ${e.reason}`);
      for (const n of e.notes) console.log(`     note: ${n}`);
    }
    console.log('');
  }

  console.log('CAS citation conversion map — F227.2');
  console.log(`wrote ${path.relative(repoRoot, OUT)}  (${entries.length} occurrences, ${((Date.now() - t0) / 1000).toFixed(1)}s)\n`);
  const byScript = new Map();
  for (const e of entries) {
    const r = byScript.get(e.script) || { clean: 0, ambiguous: 0, unconvertible: 0 };
    r[e.class]++; byScript.set(e.script, r);
  }
  console.log(`${'script'.padEnd(22)}${'clean'.padStart(8)}${'ambiguous'.padStart(11)}${'unconvertible'.padStart(15)}`);
  for (const [k, r] of [...byScript].sort((a, b) => (b[1].clean + b[1].ambiguous + b[1].unconvertible) - (a[1].clean + a[1].ambiguous + a[1].unconvertible))) {
    console.log(`${k.padEnd(22)}${String(r.clean).padStart(8)}${String(r.ambiguous).padStart(11)}${String(r.unconvertible).padStart(15)}`);
  }
  console.log(`${'TOTAL'.padEnd(22)}${String(counts.clean).padStart(8)}${String(counts.ambiguous).padStart(11)}${String(counts.unconvertible).padStart(15)}`);
  console.log(`\nanchors emitted ${v.total}; resolve under cas_citation_audit.js's resolver: ${v.ok}`);
  if (v.bad.length) {
    console.log(`\n${v.bad.length} emitted anchor(s) do NOT resolve — each is an unconvertible finding:`);
    for (const [rec, why] of v.bad) {
      console.log(`  ${rec.e.source}:${rec.e.sourceLine}  ${rec.e.script}:${rec.e.citedLines}\n      ${rec.a.anchor}\n      ${why}`);
    }
  }
  const un = entries.filter((e) => e.class === 'unconvertible');
  if (un.length) {
    console.log(`\n${un.length} unconvertible occurrence(s) — findings for F227.3-.6:`);
    for (const e of un) console.log(`  ${e.source}:${e.sourceLine}  ${e.script}:${e.citedLines}  [${e.attribution.set}]\n      ${e.reason}`);
  }
  const am = entries.filter((e) => e.class === 'ambiguous');
  if (am.length) {
    console.log(`\n${am.length} ambiguous occurrence(s) — the candidate sets disagree:`);
    for (const e of am) {
      console.log(`  ${e.source}:${e.sourceLine}  ${e.script}:${e.citedLines}  candidates ${e.attribution.candidates.join(' | ')}`);
      for (const r of e.readings) {
        console.log(`      ${r.set}: ${r.parts.map((p) => `${p.citedLines} -> ${p.loNew || p.loStatus}${p.hiNew ? '-' + p.hiNew : ''} "${(p.loText || '').slice(0, 50)}"`).join(' ; ')}`);
      }
    }
  }
  return 0;
}

if (require.main === module) {
  try { process.exit(main(process.argv.slice(2))); }
  finally { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* best effort */ } }
}
module.exports = { build, verify };
