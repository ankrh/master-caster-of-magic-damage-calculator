'use strict';

// Census of comment blocks that state engine behavior with nothing to check them against — the
// measurement behind T8. `npm run provenance` sees a claim only through an adjacent
// `PROVENANCE[id]`/`STAT-FORMULA[id]` anchor, so prose out of anchor range is unchecked by
// construction, and prose that names no source at all cannot even be checked by hand.
//
// T6 measured the same gap on 2026-08-17 but committed no script, so its block definition is
// unrecoverable and its counts are not reproducible. This file fixes one:
//
//   * A **block** is a run of consecutive whole-line comments, broken by any non-comment line.
//     Trailing comments after code are not blocks.
//   * A **citation line** is one the provenance audit itself would read: a comment whose text
//     begins `PROVENANCE[id]:` or `STAT-FORMULA[id]`. A prose sentence that merely mentions an
//     anchor by name is not one — it is a pointer, counted below.
//   * A **prose line** is any other comment line. A block with none is a bare citation and is
//     not counted.
//   * **Multi-line** means two or more prose lines. One-line notes are excluded: a single line
//     rarely carries a derivation, and including them buries the population that does.
//
// Each multi-line block is then one of three:
//
//   * **anchored** — a citation line falls within `WINDOW` lines of it, above its first line or
//     below its last. `npm run provenance` hashes that citation, so the claim is checked.
//   * **pointer** — no anchor in range, but the prose names where the claim lives: a
//     `Reference docs/` path, an anchor id, `SPEC.md`, a `BACKLOG.md` question, or an executable
//     address the root `CLAUDE.md` ranks above prose. A reader can check it; the audit still
//     cannot.
//   * **unsourced** — neither. This count is an upper bound on the real gap: a block that
//     documents the code rather than the engine names no source because it needs none, and no
//     scan can tell those apart from an unsupported engine claim. Reading decides.
//
// Usage:
//   node tools/comment_citation_census.js                    per-file totals
//   node tools/comment_citation_census.js --list             every unsourced block
//   node tools/comment_citation_census.js --list --pointer   every pointer block too
//   node tools/comment_citation_census.js --list stats.js    one source

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const WINDOW = 8;

// A citation the provenance audit reads: the token opens the comment.
const CITATION_LINE = /^\s*(?:\/\/|\*)?\s*(?:PROVENANCE\[[^\]]+\]:|STAT-FORMULA\[[^\]]+\])/;
// A prose pointer: names the home of the claim without being an audited anchor — an evidence
// path, an anchor id, a project document, or a source file the routing table in the root
// `CLAUDE.md` covers (the DOS reconstruction's `.c`, the Caster `.pas`, a `.CAS` script, an
// `.INI` table). `Unit rosters/` counts alongside `Reference docs/`: that routing table names
// both as homes of the version-matched manuals and helptext, and `UNITS.INI` roster data lives
// only there.
//
// A bare executable address is one too, and the strongest of them: the routing table ranks an
// address-backed reconstruction above prose, and an address is checkable in the binary without
// naming the file it was read from. Two notations are cited here — DOS `0x8F881`, whether bare,
// segment-prefixed (`131:0x9A051`) or engine-prefixed (`com1:0x90609`), and Caster/Pascal
// `$005B19D9`, absolute or as a `+0x0BA3C` module offset. Width separates an address from a
// bitmask: every address cited in these sources is 5 or 6 hex digits, while every mask is 4 or
// fewer (`0xff`, `0x0800`) or a zero-padded 8 (`0x00200000`).
const ADDRESS = /\b0x[0-9A-Fa-f]{5,6}\b|\$[0-9A-Fa-f]{6,8}\b/;
const POINTER = new RegExp(
  [/Reference docs\/|Unit rosters\/|SPEC\.md|BACKLOG\.md|PROVENANCE\[|STAT-FORMULA\[|\.(?:pas|CAS|INI|c)\b/.source,
    ADDRESS.source].join('|'));

// The thirteen censused sources: `provenance_audit.js`'s `calculatorFiles`, which owns
// "which sources carry source-authored stat formulas", plus the three that order and classify
// them: `steps.js` (the step runner and version-scope table), `stats_manifests.js` (the per-version
// chains) and `stats_origins.js` (the ability-key origin table). All three are excluded from the
// audit for carrying no formula of their own, but all three state engine behavior in prose, which
// is what this census is about.
const SOURCES = require('./provenance_audit.js').calculatorFiles
  .map((p) => p.replace(/^Calculator\//, ''))
  .concat(['steps.js', 'stats_manifests.js', 'stats_origins.js']);

function scan(file) {
  const lines = fs.readFileSync(path.join(repoRoot, 'Calculator', file), 'utf8').split(/\r?\n/);
  const blocks = [];
  let cur = null;
  let inBlockComment = false;
  const close = () => { if (cur) { blocks.push(cur); cur = null; } };
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    let isComment = false;
    if (inBlockComment) { isComment = true; if (t.includes('*/')) inBlockComment = false; }
    else if (t.startsWith('//')) isComment = true;
    else if (t.startsWith('/*')) { isComment = true; if (!t.includes('*/')) inBlockComment = true; }
    if (!isComment) { close(); continue; }
    if (!cur) cur = { file, start: i + 1, end: i + 1, prose: 0, chars: 0, text: [] };
    cur.end = i + 1;
    cur.chars += lines[i].length + 1;
    cur.text.push(t);
    if (!CITATION_LINE.test(t)) cur.prose++;
  }
  close();
  const kept = blocks.filter((b) => b.prose > 0);
  for (const b of kept) {
    const lo = Math.max(0, b.start - 1 - WINDOW);
    const hi = Math.min(lines.length, b.end + WINDOW);
    b.anchored = lines.slice(lo, hi).some((l) => CITATION_LINE.test(l));
    b.pointer = !b.anchored && POINTER.test(b.text.join('\n'));
    b.first = b.text[0];
  }
  return kept;
}

function main() {
  const args = process.argv.slice(2);
  const list = args.includes('--list');
  const withPointer = args.includes('--pointer');
  const only = args.filter((a) => !a.startsWith('--'));
  const files = only.length ? SOURCES.filter((f) => only.includes(f)) : SOURCES;
  const unknown = only.filter((f) => !SOURCES.includes(f));
  if (unknown.length) throw new Error(`not a censused source: ${unknown.join(', ')}`);

  const rows = [];
  const tot = { blocks: 0, multi: 0, anchored: 0, pointer: 0, unsourced: 0, kb: 0 };
  for (const f of files) {
    const bs = scan(f);
    const m = bs.filter((b) => b.prose >= 2);
    const anchored = m.filter((b) => b.anchored).length;
    const pointer = m.filter((b) => b.pointer).length;
    const un = m.filter((b) => !b.anchored && !b.pointer);
    const kb = un.reduce((a, b) => a + b.chars, 0) / 1024;
    tot.blocks += bs.length; tot.multi += m.length; tot.anchored += anchored;
    tot.pointer += pointer; tot.unsourced += un.length; tot.kb += kb;
    rows.push([f, bs.length, m.length, anchored, pointer, un.length, kb.toFixed(1)]);
    if (list) {
      for (const b of m) {
        if (b.anchored) continue;
        if (b.pointer && !withPointer) continue;
        console.log(`${b.pointer ? 'P' : 'U'} ${f}:${b.start}-${b.end} (${b.prose}) ${b.first.slice(0, 92)}`);
      }
    }
  }
  if (list) console.log('');
  const row = (r) => `${String(r[0]).padEnd(28)} ${String(r[1]).padStart(6)} ${String(r[2]).padStart(6)} `
    + `${String(r[3]).padStart(8)} ${String(r[4]).padStart(7)} ${String(r[5]).padStart(9)} ${String(r[6]).padStart(11)}`;
  console.log(row(['source', 'blocks', 'multi', 'anchored', 'pointer', 'unsourced', 'unsourcedKB']));
  for (const r of rows) console.log(row(r));
  console.log(row(['TOTAL', tot.blocks, tot.multi, tot.anchored, tot.pointer, tot.unsourced, tot.kb.toFixed(1)]));
}

if (require.main === module) main();
module.exports = { scan, SOURCES, WINDOW };
