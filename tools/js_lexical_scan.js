'use strict';

// Shared lexical scaffold for the source-drift diagnostics (`control_write_census.js`,
// `drift_class_sweep.js`). One home for the brace walk, so a scan that desynchronizes is fixed
// once rather than in each sweep — five private copies of a lexer is the same "one fact, more
// than one home" shape those sweeps exist to measure.
//
// This is a lexer, not a parser. It blanks comments and string bodies so brace and paren walks
// are not shifted by their contents, then attributes positions to the innermost enclosing named
// function. Call edges elsewhere are name-based. Every consumer must report what it could not
// see; `lexSanity` exists so a desynchronized file is loud instead of silently clean.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');

// Keywords that cannot end an expression, so a `/` after one starts a regex literal, never a
// division. Without `return` here, `return /[",\r\n]/.test(x)` in ui_matrix.js silently blanks
// the rest of the file up to the next quote.
const REGEX_PRECEDING_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'case', 'do', 'else', 'yield', 'await',
  'new', 'delete', 'void', 'throw',
]);

// Blank comments, strings and template literals. Offsets are preserved: the blanked text is the
// same length as the original, so an index into it indexes the source too.
// `opts.strings === false` keeps literal bodies intact, for scans that need the names inside them.
function blank(text, opts) {
  const wipeStrings = !opts || opts.strings !== false;
  const out = text.split('');
  let i = 0;
  const N = text.length;
  const wipe = (a, b) => { for (let k = a; k < b && k < N; k++) if (out[k] !== '\n') out[k] = ' '; };
  while (i < N) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') { const s = i; while (i < N && text[i] !== '\n') i++; wipe(s, i); continue; }
    if (c === '/' && text[i + 1] === '*') {
      const s = i; i += 2;
      while (i < N && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i = Math.min(i + 2, N); wipe(s, i); continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      const q = c, s = i; i++;
      while (i < N) { if (text[i] === '\\') { i += 2; continue; } if (text[i] === q) { i++; break; } i++; }
      if (wipeStrings) wipe(s + 1, i - 1);
      continue;
    }
    // Regex literal. `/[",\r\n]/` in ui_matrix.js contains a quote; treating it as a string start
    // blanks everything to the next quote, which is how a scan reports clean by not looking —
    // and it does so without unbalancing the braces, so `lexSanity` cannot catch it either.
    // A `/` opens a regex when the previous significant token cannot END an expression. A word
    // character is not enough to decide that: `return /[",\r\n]/.test(x)` ends in `n`, so a bare
    // character test reads that regex as a division and loses the rest of the file.
    if (c === '/') {
      let k = i - 1;
      while (k >= 0 && /\s/.test(text[k])) k--;
      const prev = k >= 0 ? text[k] : '';
      let word = '';
      if (/[\w$]/.test(prev)) {
        let w = k;
        while (w >= 0 && /[\w$]/.test(text[w])) w--;
        word = text.slice(w + 1, k + 1);
      }
      if (!/[\w$)\]]/.test(prev) || REGEX_PRECEDING_KEYWORDS.has(word)) {
        const s = i; i++;
        let inClass = false;
        while (i < N) {
          if (text[i] === '\\') { i += 2; continue; }
          if (text[i] === '[') inClass = true;
          else if (text[i] === ']') inClass = false;
          else if (text[i] === '/' && !inClass) { i++; break; }
          else if (text[i] === '\n') break;          // not a regex after all
          i++;
        }
        wipe(s + 1, i - 1);
        continue;
      }
    }
    i++;
  }
  return out.join('');
}

// Self-check: after blanking, braces and parens must balance. An unbalanced file means the lexer
// desynchronized and every finding downstream of that point is unreliable — report it rather than
// letting the scan look clean. Returns null when balanced.
function lexSanity(src, b) {
  let brace = 0, paren = 0;
  for (const ch of b) {
    if (ch === '{') brace++; else if (ch === '}') brace--;
    else if (ch === '(') paren++; else if (ch === ')') paren--;
  }
  return (brace === 0 && paren === 0) ? null : { src, brace, paren };
}

// Index just past the delimiter matching the one at `from`.
function matchPair(b, from, open, close) {
  let d = 0;
  for (let i = from; i < b.length; i++) {
    if (b[i] === open) d++;
    else if (b[i] === close) { d--; if (d === 0) return i + 1; }
  }
  return b.length;
}
const matchBrace = (b, from) => matchPair(b, from, '{', '}');
const skipParens = (b, from) => matchPair(b, from, '(', ')');

// Named `function` declarations and expressions, with their parameter text and body extents.
function functionBodies(b) {
  const bodies = [];
  const re = /(?:^|[^\w.$])function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let m;
  while ((m = re.exec(b))) {
    const openParen = b.indexOf('(', m.index + m[0].length - 1);
    const afterParams = skipParens(b, openParen);
    let i = afterParams;
    while (i < b.length && /\s/.test(b[i])) i++;
    if (b[i] !== '{') continue;
    bodies.push({
      name: m[1],
      params: b.slice(openParen + 1, afterParams - 1),
      start: i,
      end: matchBrace(b, i),
    });
  }
  return bodies;
}

// The innermost named function containing `at`, or null.
function enclosingBody(bodies, at) {
  let best = null;
  for (const f of bodies) {
    if (at >= f.start && at < f.end) {
      if (!best || (f.end - f.start) < (best.end - best.start)) best = f;
    }
  }
  return best;
}
function enclosing(bodies, at) {
  const f = enclosingBody(bodies, at);
  return f ? f.name : '(top level)';
}

// at -> 1-based line number.
function lineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return at => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= at) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

// Split an argument or object-literal body at depth-0 commas.
function splitArgs(s) {
  const out = []; let d = 0, cur = '';
  for (const ch of s) {
    if (ch === '(' || ch === '[' || ch === '{') d++;
    if (ch === ')' || ch === ']' || ch === '}') d--;
    if (ch === ',' && d === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(x => x.trim());
}

// The bare word of a single-quoted or double-quoted string argument, else null.
function literalOf(arg) {
  if (!arg) return null;
  const m = /^['"]([A-Za-z0-9_]+)['"]$/.exec(arg.trim());
  return m ? m[1] : null;
}

// Read one calculator source and pre-compute both blanked views plus the position helpers.
function scanSource(rel) {
  const text = fs.readFileSync(path.join(repoRoot, ...rel.split('/')), 'utf8');
  const b = blank(text);                          // structure only
  const lit = blank(text, { strings: false });    // comments blanked, literal bodies intact
  return {
    src: rel, text, b, lit,
    bodies: functionBodies(b),
    lineOf: lineIndex(text),
    desync: lexSanity(rel, b),
  };
}

module.exports = {
  repoRoot, blank, lexSanity, matchPair, matchBrace, skipParens,
  functionBodies, enclosing, enclosingBody, lineIndex, splitArgs, literalOf, scanSource,
};
