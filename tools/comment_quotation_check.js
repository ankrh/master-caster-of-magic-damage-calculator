'use strict';

// Checks that every quotation in a calculator source's comments is a literal substring of a
// file under `Reference docs/` or `Unit rosters/` — the two roots the source routing table in
// the root `CLAUDE.md` names. Two T8 rounds in a row produced quotation errors in both
// directions, which is what this exists to stop:
//
//   * an invented quotation, attributed to a source that does not contain it; and
//   * a *false* accusation of one, from searching `Reference docs/` alone when the string was
//     in the version-matched helptext under `Unit rosters/`.
//
// A block is the same run of consecutive whole-line comments `comment_citation_census.js`
// defines, joined into one line first, so a quotation that wraps across comment lines is still
// tested whole. Three outcomes:
//
//   * EXACT  — found verbatim.
//   * REFLOW — found only after normalizing whitespace, or after stripping HTML tags. The
//     source wraps the sentence, or breaks it across `<span>`s as the manuals do. Genuine, but
//     prefer a shorter span that does not wrap; a reflowed quote is not what the reader will
//     find if they grep for it.
//   * MISSING — found neither way.
//
// **MISSING is a prompt to read the block, not a verdict of fabrication.** The tool cannot tell
// a quotation attributed to a source from the author's own scare-quote, a label, or an elided
// span written with `…` — none of which can match by construction. Decide by reading: if the
// prose says a source said it, MISSING means it did not. Quotations shorter than `MIN` are
// skipped, a short phrase matching everywhere carrying no information.
//
// Usage:
//   node tools/comment_quotation_check.js                  every censused source
//   node tools/comment_quotation_check.js stats.js         one source
//   node tools/comment_quotation_check.js --all            include EXACT lines in the output
//   node tools/comment_quotation_check.js --strict         exit 1 if anything is MISSING
//
// Without `--strict` the exit status is 0: the repository has standing MISSING lines that are
// correct usage, so gating on the raw count would cry wolf. Use `--strict` on a source you have
// just triaged and read.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const ROOTS = ['Reference docs', 'Unit rosters'];
const MIN = 12;
const SOURCES = require('./comment_citation_census.js').SOURCES;

const norm = (s) => s.replace(/\s+/g, ' ');
// The manuals are HTML and break sentences across `<span>` elements mid-clause, so a genuine
// quotation from one is never a literal substring of the file. Strip tags before the loose
// comparison; entity decoding is limited to the few that appear in quoted prose.
const detag = (s) => norm(s
  .replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&rsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"'));

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function loadCorpus() {
  const corpus = [];
  for (const root of ROOTS) {
    const abs = path.join(repoRoot, root);
    if (!fs.existsSync(abs)) continue;
    for (const file of walk(abs)) {
      let text;
      try { text = fs.readFileSync(file, 'utf8'); } catch { continue; }
      const rel = path.relative(repoRoot, file).split(path.sep).join('/');
      corpus.push({ file: rel, text, norm: norm(text), detag: detag(text) });
    }
  }
  return corpus;
}

// The census's block definition, flattened: consecutive whole-line comments, `//` stripped.
function commentBlocks(file) {
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
    if (!cur) cur = { start: i + 1, parts: [] };
    cur.parts.push(t.replace(/^(?:\/\/|\/\*|\*)\s?/, ''));
  }
  close();
  return blocks.map((b) => ({ start: b.start, text: b.parts.join(' ') }));
}

// Straight and typographic pairs alike; a lone apostrophe is not a quotation.
const QUOTED = /"([^"]+)"|\u201C([^\u201D]+)\u201D/g;

function quotations(file) {
  const found = [];
  for (const block of commentBlocks(file)) {
    QUOTED.lastIndex = 0;
    let m;
    while ((m = QUOTED.exec(block.text)) !== null) {
      const q = (m[1] || m[2]).trim();
      if (q.length >= MIN) found.push({ file, line: block.start, quote: q });
    }
  }
  return found;
}

function main() {
  const args = process.argv.slice(2);
  const showAll = args.includes('--all');
  const strict = args.includes('--strict');
  const only = args.filter((a) => !a.startsWith('--'));
  const unknown = only.filter((f) => !SOURCES.includes(f));
  if (unknown.length) throw new Error(`not a censused source: ${unknown.join(', ')}`);
  const files = only.length ? only : SOURCES;

  const corpus = loadCorpus();
  const tally = { EXACT: 0, REFLOW: 0, MISSING: 0 };
  for (const file of files) {
    for (const { line, quote } of quotations(file)) {
      const exact = corpus.find((c) => c.text.includes(quote));
      const loose = exact || corpus.find((c) => c.norm.includes(norm(quote)))
        || corpus.find((c) => c.detag.includes(detag(quote)));
      const verdict = exact ? 'EXACT' : loose ? 'REFLOW' : 'MISSING';
      tally[verdict]++;
      if (verdict === 'EXACT' && !showAll) continue;
      console.log(`${verdict.padEnd(7)} ${file}:${line}  "${quote.slice(0, 88)}"`);
      if (loose) console.log(`        -> ${loose.file}`);
    }
  }
  console.log(`\n${corpus.length} source files searched under ${ROOTS.join(' and ')}`);
  console.log(`${tally.EXACT} exact, ${tally.REFLOW} reflowed, ${tally.MISSING} missing`);
  if (strict && tally.MISSING > 0) process.exitCode = 1;
}

if (require.main === module) main();
module.exports = { quotations, loadCorpus, commentBlocks };
