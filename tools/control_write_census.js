// Control-write census (T13, step one). Diagnostic, not part of `npm test`.
//
// For every card control, report which functions write it, then flag SPLIT STATEMENTS: a
// function A that delegates to B where the two write disjoint sets of controls, so the whole
// statement exists only where A runs — and B is reachable on its own. That predicate made F136
// (`HISTORY.md`) fall out without reading the code: `applyUnit` stated nine controls and called
// `resetCardToRosterBase`, which stated seven others, and three call paths reached the second
// alone. The defect is never "B writes fewer fields" (every helper does); it is "B is reachable
// as if it were the whole statement".
//
// Method, and its limits. Controls come from `index.html`; writes come from scanning the
// `Calculator/*.js` sources those script tags list. Three indirections are resolved explicitly
// because the card layer uses them everywhere, and leaving them unresolved would let the census
// report clean by not looking:
//   1. element accessors   — `function identityControl(p, name) { return getElementById(p+name) }`
//                            then `identityControl(prefix, 'BaseHero').value = …`
//   2. local setter arrows — `const set = (suffix, ch) => { …getElementById(prefix+suffix)… }`
//                            then `set('ModernRanged', …)`
//   3. array-literal loops — `for (const f of ['HitMelee', …]) getElementById(prefix+f).value = 0`
//   4. variable bindings   — `const type = getElementById(prefix+'X'); … type.value = …`
// A write whose control name is still not a literal after those is REPORTED, never skipped, and
// a call site holding one is listed as UNJUDGED rather than scored: its control set is a floor,
// not a statement. `applyFullState` restores every saved control through
// `getElementById(<variable>)`, so scoring it would report a fact about this scanner.
// A caller that writes no card control of its own is a pure delegator; the finding resolves
// through it to the call sites that stand for a statement, since asking whether
// `setIdentityControlsFromUnit` states the stat half answers the wrong question.
// Attribution is a brace walk, not a parse, and call edges are name-based, so a function reached
// only through a variable is invisible. Coverage for the finding is therefore tested at DEPTH 1
// — what a call site writes itself plus what it directly calls — because a full transitive
// closure over name-based edges accumulates spurious reach and clears every caller. The lexer
// (`js_lexical_scan.js`, shared with `drift_class_sweep.js`) self-checks for brace/paren balance
// per file and reports desynchronization, and unresolved writes and unwritten controls are
// printed, so a reader can tell coverage from silence.
//
// Usage:
//   node tools/control_write_census.js            inventory + findings
//   node tools/control_write_census.js --full     every control and its writers
//   node tools/control_write_census.js --json     machine-readable
'use strict';

const fs = require('fs');
const path = require('path');
const { calculatorSources } = require('./calculator_sources');
const {
  blank, lexSanity, matchBrace, skipParens, functionBodies, enclosing, lineIndex,
  splitArgs, literalOf,
} = require('./js_lexical_scan');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const INIT_MIN = 4;   // a function writing fewer card controls is a targeted setter, not a statement

// ---------------------------------------------------------------- source and control inventory

function readControls(html) {
  const ids = new Set();
  const re = /<(?:input|select|textarea)\b[^>]*\bid="([A-Za-z0-9_]+)"/g;
  let m;
  while ((m = re.exec(html))) ids.add(m[1]);
  const card = new Set(), global = new Set();
  for (const id of ids) {
    const m2 = /^([ab])([A-Z][A-Za-z0-9_]*)$/.exec(id);
    if (m2 && ids.has((m2[1] === 'a' ? 'b' : 'a') + m2[2])) card.add(m2[2]);
    else global.add(id);
  }
  return { card, global };
}

// ------------------------------------------------------------------------ indirection resolvers

// (1) accessors: a function returning getElementById(<expr involving a param>).
function findAccessors(text, b, lit, bodies) {
  const acc = new Map();
  const reFn = /(?:^|[^\w.$])function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/g;
  const reArrow = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/g;
  const consider = (name, params, bodyText) => {
    if (!/getElementById\s*\(/.test(bodyText)) return;
    if (!/\breturn\b/.test(bodyText) && !/=>\s*document\.getElementById/.test(bodyText)) return;
    if (/\.\s*(?:value|checked)\s*=(?!=)/.test(bodyText)) return;   // that is a setter, not an accessor
    const ps = params.split(',').map(s => s.trim()).filter(Boolean);
    // Take the LAST parameter appearing inside the getElementById argument: in
    // `getElementById(prefix + name)` the suffix is the trailing operand, and picking the first
    // match binds `prefix`, so every call resolves to nothing and the control reads as unwritten.
    let idx = -1;
    ps.forEach((p, k) => { if (new RegExp('getElementById\\s*\\([^)]*\\b' + p + '\\b').test(bodyText)) idx = k; });
    if (idx >= 0) acc.set(name, idx);
  };
  let m;
  while ((m = reFn.exec(b))) {
    const open = b.indexOf('{', m.index + m[0].length - 1);
    consider(m[1], m[2], text.slice(open, matchBrace(b, open)));
  }
  while ((m = reArrow.exec(b))) {
    const arrow = b.indexOf('=>', m.index);
    let end;
    let j = arrow + 2;
    while (j < b.length && /\s/.test(b[j])) j++;
    end = b[j] === '{' ? matchBrace(b, j) : (b.indexOf('\n', j) + 1 || b.length);
    consider(m[1], m[2] || m[3] || '', text.slice(arrow, end));
  }
  return acc;
}

// (2) setter helpers: a function/arrow whose body writes getElementById(<param-derived>).value
function findSetters(text, b, lit) {
  const set = new Map();
  const reArrow = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\(([^)]*)\)|([A-Za-z_$][\w$]*))\s*=>/g;
  let m;
  while ((m = reArrow.exec(b))) {
    const arrow = b.indexOf('=>', m.index);
    let j = arrow + 2;
    while (j < b.length && /\s/.test(b[j])) j++;
    const end = b[j] === '{' ? matchBrace(b, j) : (b.indexOf('\n', j) + 1 || b.length);
    const body = text.slice(arrow, end);
    if (!/getElementById\s*\(/.test(body)) continue;
    if (!/\.\s*(?:value|checked)\s*=(?!=)/.test(body)) continue;
    const ps = (m[2] || m[3] || '').split(',').map(s => s.trim()).filter(Boolean);
    let idx = -1;
    ps.forEach((p, k) => { if (new RegExp('getElementById\\s*\\([^)]*\\b' + p + '\\b').test(body)) idx = k; });
    if (idx >= 0) set.set(m[1], { param: idx, at: m.index });
  }
  return set;
}

// (3) `for (const X of ['A','B'])` — bind the loop variable to its literal members.
function findLoopBindings(text, b, lit) {
  const out = [];
  const re = /for\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s+of\s*\[/g;
  let m;
  while ((m = re.exec(b))) {
    const open = b.indexOf('[', m.index);
    let d = 0, end = open;
    for (let i = open; i < b.length; i++) { if (b[i] === '[') d++; else if (b[i] === ']') { d--; if (!d) { end = i; break; } } }
    const literal = text.slice(open + 1, end);
    const names = [...lit.slice(open + 1, end).matchAll(/['"]([A-Za-z0-9_]+)['"]/g)].map(x => x[1]);
    if (!names.length) continue;
    // scope: the loop body, whether braced or a single statement
    let j = end + 1;
    while (j < b.length && b[j] !== ')') j++;
    j++;
    while (j < b.length && /\s/.test(b[j])) j++;
    const scopeEnd = b[j] === '{' ? matchBrace(b, j) : (b.indexOf('\n', j) + 1 || b.length);
    out.push({ varName: m[1], names, start: m.index, end: scopeEnd });
  }
  return out;
}

// ---------------------------------------------------------------------------------- the scan

function scanFile(src, text, controls, findings) {
  const b = blank(text);                        // comments and string bodies blanked: structure only
  const lit = blank(text, { strings: false });   // comments blanked, literals intact: names
  const desync = lexSanity(src, b);
  if (desync) findings.desync.push(desync);
  const bodies = functionBodies(b);
  const lineOf = lineIndex(text);
  const accessors = findAccessors(text, b, lit, bodies);
  const setters = findSetters(text, b, lit);
  const loops = findLoopBindings(text, b, lit);
  const writes = [];
  const calls = [];

  const push = (raw, at, via) => {
    const name = normalize(raw, controls);
    if (!name) return;
    writes.push({ control: name, fn: enclosing(bodies, at), line: lineOf(at), src, via });
  };

  // direct: getElementById('aFoo' | prefix + 'Foo').value =
  for (const m of lit.matchAll(/getElementById\(\s*(?:[\w$]+\s*\+\s*)?['"]([A-Za-z0-9_]+)['"]\s*\)\s*\.\s*(?:value|checked)\s*=(?!=)/g)) {
    push(m[1], m.index, 'direct');
  }
  // accessor call: identityControl(prefix, 'BaseHero').value =
  for (const [name, paramIdx] of accessors) {
    const re = new RegExp('\\b' + name + '\\(([^()]*)\\)\\s*\\.\\s*(?:value|checked)\\s*=(?!=)', 'g');
    for (const m of lit.matchAll(re)) {
      const args = splitArgs(text.slice(m.index + name.length + 1, m.index + name.length + 1 + m[1].length));
      const lit = literalOf(args[paramIdx]);
      if (lit) push(lit, m.index, 'accessor ' + name);
      else findings.unresolved.push({ src, line: lineOf(m.index), fn: enclosing(bodies, m.index), expr: name + '(' + m[1].trim() + ')' });
    }
  }
  // setter call: set('ModernRanged', …)
  for (const [name, info] of setters) {
    const re = new RegExp('(?:^|[^\\w.$])' + name + '\\(([^()]*)\\)', 'g');
    for (const m of lit.matchAll(re)) {
      if (m.index <= info.at) continue;                       // the declaration itself
      const argStart = m.index + m[0].indexOf('(') + 1;
      const args = splitArgs(text.slice(argStart, argStart + m[1].length));
      const lit = literalOf(args[info.param]);
      if (lit) push(lit, m.index, 'setter ' + name);
      else findings.unresolved.push({ src, line: lineOf(m.index), fn: enclosing(bodies, m.index), expr: name + '(' + m[1].trim() + ')' });
    }
  }
  // (4) element bound to a variable, then written: `const type = getElementById(prefix + 'X');
  //     … type.value = …`. Without this the census calls such a control unwritten, which reads
  //     as a finding when it is only a blind spot.
  const bindRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document\s*\.\s*)?getElementById\(\s*(?:[\w$]+\s*\+\s*)?['"]([A-Za-z0-9_]+)['"]\s*\)/g;
  const accNames = [...accessors.keys()];
  for (const m of lit.matchAll(bindRe)) bindWrite(m[1], m[2], m.index);
  for (const name of accNames) {
    const re = new RegExp('(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*' + name + '\\(([^()]*)\\)', 'g');
    for (const m of lit.matchAll(re)) {
      const argStart = m.index + m[0].indexOf('(') + 1;
      const litArg = literalOf(splitArgs(text.slice(argStart, argStart + m[2].length))[accessors.get(name)]);
      if (litArg) bindWrite(m[1], litArg, m.index);
    }
  }
  function bindWrite(varName, raw, at) {
    const owner = bodies.find(f => at >= f.start && at < f.end);
    const scopeEnd = owner ? owner.end : lit.length;
    const re = new RegExp('\\b' + varName + '\\s*\\.\\s*(?:value|checked)\\s*=(?!=)', 'g');
    const region = lit.slice(at, scopeEnd);
    for (const w of region.matchAll(re)) push(raw, at + w.index, 'binding ' + varName);
  }
  // (5) the same binding shape with a control name this scan cannot reduce to a literal:
  //     `const el = getElementById(id); … el.value = val`, and `[...].forEach(id => …)` over a
  //     computed id. `applyFullState` restores every saved control that way, so leaving the shape
  //     out entirely — neither counted nor reported — let the census read `unresolved writes 0`
  //     while a function that states the whole card appeared to state almost none of it.
  const dynBindRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:document\s*\.\s*)?getElementById\(([^()]*)\)/g;
  for (const m of lit.matchAll(dynBindRe)) {
    if (/['"]/.test(m[2])) continue;                       // resolved above
    const owner = bodies.find(f => m.index >= f.start && m.index < f.end);
    const scopeEnd = owner ? owner.end : lit.length;
    const re = new RegExp('\\b' + m[1] + '\\s*\\.\\s*(?:value|checked)\\s*=(?!=)', 'g');
    for (const w of lit.slice(m.index, scopeEnd).matchAll(re)) {
      findings.unresolved.push({
        src, line: lineOf(m.index + w.index), fn: enclosing(bodies, m.index + w.index),
        expr: m[1] + ' = getElementById(' + m[2].trim() + ')',
      });
    }
  }

  // dynamic: getElementById(prefix + ident).value = — resolve through a loop binding if one covers it
  for (const m of lit.matchAll(/getElementById\(\s*[\w$]+\s*\+\s*([A-Za-z_$][\w$]*)\s*\)\s*\.\s*(?:value|checked)\s*=(?!=)/g)) {
    const v = m[1];
    const loop = loops.find(l => l.varName === v && m.index >= l.start && m.index < l.end);
    if (loop) { for (const n of loop.names) push(n, m.index, 'loop ' + v); }
    else findings.unresolved.push({ src, line: lineOf(m.index), fn: enclosing(bodies, m.index), expr: 'prefix + ' + v });
  }

  // Call edges. Scanned over the whole file, not per function body: the card's level-change
  // handlers are top-level arrows passed to addEventListener, so a per-body walk misses exactly
  // the call sites that matter. `enclosing` returns '(top level)' outside any named function.
  // Top-level calls are grouped by the `addEventListener` registration they sit in, so one
  // handler is one node. Collapsing every top-level call into a single '(top level)' node would
  // give that node the union of everything the page ever calls, and no partial path could show.
  const listeners = [...b.matchAll(/addEventListener\s*\(/g)].map(m => m.index);
  const nodeFor = at => {
    const named = enclosing(bodies, at);
    if (named !== '(top level)') return named;
    let best = null;
    for (const l of listeners) if (l < at && (best === null || l > best)) best = l;
    return best === null ? '(top level ' + src + ')' : '(handler ' + src + ':' + lineOf(best) + ')';
  };
  const KEYWORD = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'typeof', 'function',
    'new', 'delete', 'void', 'in', 'of', 'do', 'else', 'await', 'yield']);
  for (const m of b.matchAll(/(?:^|[^\w.$])([A-Za-z_$][\w$]*)\s*\(/g)) {
    const name = m[1];
    if (KEYWORD.has(name)) continue;
    // a declaration is not a call site
    if (/\bfunction\s*$/.test(b.slice(Math.max(0, m.index - 14), m.index + 1))) continue;
    const from = nodeFor(m.index);
    if (from === name) continue;
    calls.push({ from, to: name, src, line: lineOf(m.index) });
  }
  return { writes, calls };
}

function normalize(raw, controls) {
  if (!raw) return null;
  if (controls.card.has(raw)) return raw;
  const m = /^([ab])([A-Z][A-Za-z0-9_]*)$/.exec(raw);
  if (m && controls.card.has(m[2])) return m[2];
  if (controls.global.has(raw)) return raw;
  return null;
}

// -------------------------------------------------------------------------------------- main

function main() {
  const argv = process.argv.slice(2);
  const wantJson = argv.includes('--json');
  const wantFull = argv.includes('--full');

  const html = fs.readFileSync(INDEX, 'utf8');
  const sources = calculatorSources().all;
  const controls = readControls(html);
  const findings = { unresolved: [], desync: [] };

  let writes = [], calls = [];
  for (const rel of sources) {
    const r = scanFile(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8'), controls, findings);
    writes = writes.concat(r.writes);
    calls = calls.concat(r.calls);
  }

  const direct = new Map();     // fn -> Set(card control)
  const home = new Map();       // fn -> source file
  for (const w of writes) {
    if (!controls.card.has(w.control)) continue;
    if (!direct.has(w.fn)) { direct.set(w.fn, new Set()); home.set(w.fn, w.src); }
    direct.get(w.fn).add(w.control);
  }

  // transitive closure over the name-based call graph, restricted to control-writing functions
  const edges = new Map();
  for (const c of calls) {
    if (!edges.has(c.from)) edges.set(c.from, new Set());
    edges.get(c.from).add(c.to);
  }
  const trans = new Map();
  const resolve = (fn, seen = new Set()) => {
    if (trans.has(fn)) return trans.get(fn);
    if (seen.has(fn)) return new Set();
    seen.add(fn);
    const out = new Set(direct.get(fn) || []);
    for (const callee of (edges.get(fn) || [])) {
      if (callee === fn) continue;
      for (const c of resolve(callee, seen)) out.add(c);
    }
    if (seen.size === 1) trans.set(fn, out);
    return out;
  };
  const allFns = new Set([...direct.keys(), ...edges.keys()]);
  for (const fn of allFns) trans.set(fn, resolve(fn));

  const callersOf = fn => calls.filter(c => c.to === fn && c.from !== fn)
    .map(c => c.from + ' (' + c.src + ':' + c.line + ')');

  // A function that writes no card control of its own is a pure delegator: it shapes arguments
  // and forwards. Testing ITS coverage answers the wrong question — `setIdentityControlsFromUnit`
  // states no stat because stating stats was never its job — so resolve through it to the call
  // sites that actually stand for a statement. A delegator with no caller stays as its own site
  // rather than vanishing, so looking through can never clear a path by losing it.
  const throughDelegators = (fn, seen = new Set()) => {
    if (direct.has(fn) || seen.has(fn)) return [{ fn, via: [...seen] }];
    seen.add(fn);
    const up = calls.filter(c => c.to === fn && c.from !== fn);
    if (!up.length) return [{ fn, via: [...seen] }];
    const out = [];
    for (const c of up) {
      for (const r of throughDelegators(c.from, new Set(seen))) {
        if (!out.some(x => x.fn === r.fn)) out.push({ ...r, at: c.src + ':' + c.line });
      }
    }
    return out;
  };

  const inits = [...direct.keys()]
    .map(fn => ({ fn, src: home.get(fn), direct: direct.get(fn), trans: trans.get(fn) || direct.get(fn) }))
    .filter(f => f.trans.size >= INIT_MIN)
    .sort((a, b) => b.trans.size - a.trans.size);

  // FINDING — split statement. A delegates to B; the two write DISJOINT control sets, so the
  // full statement is their union and exists only where A runs. Any other caller of B that does
  // not itself state A's half produces a partial card. That is F136 exactly, and it generalizes:
  // the defect is not "B writes fewer fields" (every helper does) but "B is reachable as if it
  // were the whole statement".
  // A function holding a write this scan could not resolve cannot be judged either way: its
  // control set is a floor, not a statement. `applyFullState` restores every saved control
  // through `getElementById(<variable>)`, so scoring it against a half it demonstrably writes
  // would be a finding about the scanner. Such call sites are reported separately, as unjudged.
  const opaque = new Set(findings.unresolved.map(u => u.fn));

  const partials = [];
  for (const a of inits) {
    for (const bF of inits) {
      if (a === bF) continue;
      if (!calls.some(c => c.from === a.fn && c.to === bF.fn)) continue;   // A must call B
      if (bF.direct.size < 2 || a.direct.size < 2) continue;
      if ([...a.direct].some(c => bF.direct.has(c))) continue;             // must be disjoint
      const exposed = [];
      const unjudged = [];
      for (const c of calls) {
        if (c.to !== bF.fn || c.from === a.fn || c.from === bF.fn) continue;
        for (const site of throughDelegators(c.from)) {
          if (site.fn === a.fn || site.fn === bF.fn) continue;
          // Coverage is tested at depth 1 — what the caller writes itself, plus what the functions
          // it calls write directly. The full transitive closure is not used here: edges are
          // name-based, so a long chain accumulates spurious reach and silently clears every
          // caller. Depth 1 is what "does this call site state the other half" actually means.
          const callerWrites = new Set(direct.get(site.fn) || []);
          for (const callee of (edges.get(site.fn) || [])) {
            for (const x of (direct.get(callee) || [])) callerWrites.add(x);
          }
          const missing = [...a.direct].filter(x => !callerWrites.has(x));
          if (!missing.length) continue;
          (opaque.has(site.fn) ? unjudged : exposed).push({
            caller: site.fn,
            at: site.at || (c.src + ':' + c.line),
            via: site.via && site.via.length ? site.via.join(' -> ') : null,
            missing: missing.sort(),
          });
        }
      }
      if (!exposed.length && !unjudged.length) continue;
      const dedupe = list => {
        const seen = new Set();
        return list.filter(e => !seen.has(e.caller + e.at) && seen.add(e.caller + e.at));
      };
      partials.push({
        whole: a.fn, part: bF.fn,
        wholeHalf: [...a.direct].sort(), partHalf: [...bF.direct].sort(),
        exposed: dedupe(exposed), unjudged: dedupe(unjudged),
      });
    }
  }
  partials.sort((a, b) => b.exposed.length - a.exposed.length);
  const findingCount = partials.filter(p => p.exposed.length).length;

  const written = new Set(writes.map(w => w.control));
  const unwritten = [...controls.card].filter(c => !written.has(c)).sort();

  const report = {
    sources: sources.length, cardControls: controls.card.size, globalControls: controls.global.size,
    writes: writes.length,
    initializers: inits.map(f => ({ fn: f.fn, src: f.src, direct: f.direct.size, transitive: f.trans.size, callers: callersOf(f.fn) })),
    partials, findingCount, unwritten, unresolved: findings.unresolved, desync: findings.desync,
  };
  if (wantJson) { console.log(JSON.stringify(report, null, 1)); return; }

  const L = console.log;
  L('Control-write census');
  L('  sources censused     ' + report.sources);
  L('  card controls        ' + report.cardControls);
  L('  global controls      ' + report.globalControls);
  L('  resolved writes      ' + report.writes);
  L('  unresolved writes    ' + report.unresolved.length);
  L('  desynchronized files ' + report.desync.length
    + (report.desync.length ? '  ** findings below are unreliable **' : ''));
  for (const d of report.desync) L('     ' + d.src + '  braces ' + d.brace + '  parens ' + d.paren);
  L('');
  L('Initializers (>= ' + INIT_MIN + ' card controls, transitive)');
  L('  direct  total  function                      source');
  for (const f of report.initializers) {
    L('  ' + String(f.direct).padStart(6) + String(f.transitive).padStart(7) + '  ' + f.fn.padEnd(28) + f.src);
  }
  L('');
  L('FINDING — split statement: two functions writing disjoint halves of one card statement,');
  L('          where the second half is reachable on its own.  ' + report.findingCount + ' found.');
  for (const p of partials) {
    L('');
    L('  ' + p.whole + '  states  [' + p.wholeHalf.join(', ') + ']');
    L('  ' + ' '.repeat(p.whole.length) + '  and calls  ' + p.part);
    L('  ' + p.part + '  states  [' + p.partHalf.join(', ') + ']');
    if (p.exposed.length) L('     but is also reached without the first half by:');
    for (const e of p.exposed) {
      L('        ' + e.caller + '  —  ' + e.at
        + (e.via ? '   (through ' + e.via + ')' : ''));
      L('             leaves unstated: ' + e.missing.join(', '));
    }
    if (p.unjudged.length) {
      L('     reached by call sites this scan cannot judge (they hold unresolved writes):');
      for (const e of p.unjudged) {
        L('        ' + e.caller + '  —  ' + e.at + (e.via ? '   (through ' + e.via + ')' : ''));
      }
    }
  }
  L('');
  L('Card controls no source writes: ' + report.unwritten.length + (report.unwritten.length ? '  ' + report.unwritten.join(', ') : ''));
  if (report.unresolved.length) {
    L('Unresolved writes — control name not a literal, NOT counted above:');
    for (const u of report.unresolved) L('  ' + u.src + ':' + u.line + '  in ' + u.fn + '  ->  ' + u.expr);
  }
  L('');
  L('Coverage: call edges are name-based, so a function reached only through a variable or');
  L('property is invisible. The finding tests coverage at depth 1, not through the transitive');
  L('closure, which over-approximates on name-based edges and would clear every caller. Read');
  L('`unresolved writes`, `desynchronized files` and `no source writes` as this census\'s own');
  L('statement of what it could not see.');

  if (wantFull) {
    L('');
    L('Every card control and its writers');
    const byControl = new Map([...controls.card].map(c => [c, new Set()]));
    for (const w of writes) if (byControl.has(w.control)) byControl.get(w.control).add(w.fn);
    for (const c of [...controls.card].sort()) {
      L('  ' + c.padEnd(26) + ([...byControl.get(c)].sort().join(', ') || '(none)'));
    }
  }
}

main();
