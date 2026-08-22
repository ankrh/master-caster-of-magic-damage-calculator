'use strict';

// Drift-class sweep (T13, step two). Diagnostic, not part of `npm test`.
//
// `control_write_census.js` measures one drift class — a card statement split across two
// functions. This measures the other classes T13 named, each modelled on a defect already found
// by hand, so a class that is empty is empty *by measurement* rather than by nobody looking:
//
//   predicates   one fact re-derived over a different receiver              (F132's shape)
//   readers      one record decoded independently by two paths             (F121's shape)
//   enums        a vocabulary member nothing can produce                   (F128's shape)
//   writeonly    a value the derivation produces that nothing consumes     (F128's mirror)
//
// Every mode prints what it could not see. The scans are lexical, not semantic: a name reached
// only through a computed key or a bracket access is invisible to them, so a count of 0 means
// "0 on this axis", never "none exist". Triage is still a human step — `predicates` in particular
// reports co-located repetition beside genuine second homes, and only reading them separates the
// two.
//
// Usage:
//   node tools/drift_class_sweep.js               every mode
//   node tools/drift_class_sweep.js predicates    one mode
//   node tools/drift_class_sweep.js --json

const fs = require('fs');
const path = require('path');
const { calculatorSources } = require('./calculator_sources');
const {
  repoRoot, blank, matchPair, functionBodies, enclosing, enclosingBody, lineIndex, scanSource,
} = require('./js_lexical_scan');

const MODES = ['predicates', 'readers', 'enums', 'writeonly'];

function sources() {
  return calculatorSources().all.filter(f => !/^Calculator\/units_/.test(f));
}
function readAll(files) {
  return files.map(f => scanSource(f));
}

// ------------------------------------------------------------------- predicates (F132's shape)

// F132's three copies differ only in the receiver — `a`, `aStats`, `info.stats` — so the
// normalizer strips the member-access root shared by every access and leaves property names,
// string literals and local names verbatim. Two predicates differing in THOSE are two different
// facts, not two copies of one; abstracting them collapses unrelated version tests together.
function stripReceiver(expr) {
  let s = expr.replace(/\s+/g, ' ').trim();
  for (let guard = 0; guard < 6; guard++) {
    const chains = [...s.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\.\s*(?=[A-Za-z_$])/g)];
    if (chains.length < 2) break;
    const root = chains[0][1];
    if (!chains.every(c => c[1] === root)) break;
    const before = s;
    s = s.replace(new RegExp('(?<![.\\w$])' + root + '\\s*\\.\\s*', 'g'), '');
    if (s === before) break;
  }
  return s.replace(/\s+/g, ' ').trim();
}

function predicates(scans) {
  const groups = new Map();
  for (const sc of scans) {
    const { src, text, b, bodies, lineOf } = sc;
    const push = (raw, at) => {
      const e = raw.trim().replace(/;$/, '').trim();
      if (e.length < 30 || e.length > 400) return;
      if ((e.match(/&&|\|\||[!<>=]==?|[<>]/g) || []).length < 2) return;  // not a compound test
      const key = stripReceiver(e);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push({ src, line: lineOf(at), fn: enclosing(bodies, at), raw: e.replace(/\s+/g, ' ') });
    };
    for (const m of b.matchAll(/(?:^|[^\w.$])if\s*\(/g)) {
      const open = b.indexOf('(', m.index + m[0].length - 1);
      push(text.slice(open + 1, matchPair(b, open, '(', ')') - 1), open);
    }
    for (const m of b.matchAll(/(?:^|[^\w.$])(?:return|(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=)\s/g)) {
      const start = m.index + m[0].length;
      let i = start, d = 0;
      while (i < b.length) {
        const c = b[i];
        if ('([{'.includes(c)) d++;
        else if (')]}'.includes(c)) { if (d === 0) break; d--; }
        else if (c === ';' && d === 0) break;
        i++;
      }
      push(text.slice(start, i), start);
    }
  }
  const dup = [...groups.entries()]
    .filter(([, v]) => new Set(v.map(x => x.src + ':' + x.fn)).size >= 2)
    .map(([key, v]) => ({ key, files: new Set(v.map(x => x.src)).size, sites: v }))
    .sort((a, b) => b.sites.length - a.sites.length);
  return { candidates: groups.size, findings: dup };
}

// ---------------------------------------------------------------------- readers (F121's shape)

// Axis 1 — call sites building the same callee's argument record should state the same keys.
function literalKeys(raw) {
  const b = blank(raw);
  const keys = new Map();
  const add = (k, cond) => { if (!keys.has(k) || cond === 'always') keys.set(k, cond); };
  const split = s => {
    const out = []; let d = 0, start = 0;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if ('([{'.includes(c)) d++;
      else if (')]}'.includes(c)) d--;
      else if (c === ',' && d === 0) { out.push([start, i]); start = i + 1; }
    }
    out.push([start, s.length]);
    return out;
  };
  const scan = (t, from, to, cond) => {
    for (const [s, e] of split(t.slice(from, to))) {
      const el = t.slice(from + s, from + e).trim();
      if (!el) continue;
      const kv = /^([A-Za-z_$][\w$]*)\s*:/.exec(el);
      if (kv) { add(kv[1], cond); continue; }
      const sh = /^([A-Za-z_$][\w$]*)$/.exec(el);
      if (sh) { add(sh[1], cond); continue; }
      if (el.startsWith('...')) {
        let i = 0;
        while (i < el.length) {
          if (el[i] === '{') { const end = matchPair(el, i, '{', '}'); scan(el, i + 1, end - 1, 'conditional'); i = end; continue; }
          i++;
        }
      }
    }
  };
  scan(b, 0, b.length, 'always');
  return keys;
}

// Axis 2 — a roster record's field decoded in more than one function. The receiver must be a
// parameter of the enclosing function, so a local holding an unrelated object is not counted;
// that also means a decode through a local (`const unit = units.find(…)`) is INVISIBLE here.
function rosterFields() {
  const fields = new Set();
  for (const f of fs.readdirSync(path.join(repoRoot, 'Calculator'))) {
    if (!/^units_.*\.js$/.test(f)) continue;
    const t = fs.readFileSync(path.join(repoRoot, 'Calculator', f), 'utf8');
    for (const m of t.matchAll(/"([a-z_][a-z0-9_]*)"\s*:/gi)) fields.add(m[1]);
  }
  return fields;
}

function readers(scans, callees) {
  // axis 1
  const argParity = [];
  for (const callee of callees) {
    const sites = [];
    for (const sc of scans) {
      const re = new RegExp('(?:^|[^\\w.$])' + callee + '\\s*\\(\\s*\\{', 'g');
      for (const m of sc.b.matchAll(re)) {
        const brace = sc.b.indexOf('{', m.index + m[0].length - 2);
        const end = matchPair(sc.b, brace, '{', '}');
        sites.push({
          src: sc.src, line: sc.lineOf(brace), fn: enclosing(sc.bodies, brace),
          keys: literalKeys(sc.text.slice(brace + 1, end - 1)),
        });
      }
    }
    if (!sites.length) continue;
    const all = new Set();
    for (const s of sites) for (const k of s.keys.keys()) all.add(k);
    const divergent = [...all].filter(k => sites.some(s => !s.keys.has(k))).sort()
      .map(k => ({
        key: k,
        stated: sites.filter(s => s.keys.has(k)).map(s => s.fn + (s.keys.get(k) === 'conditional' ? '*' : '')),
        omitted: sites.filter(s => !s.keys.has(k)).map(s => s.fn),
      }));
    argParity.push({ callee, sites, keys: all.size, divergent });
  }

  // axis 2
  const fields = rosterFields();
  const RECV = /\b(unit|u|rec|record|item|candidate)\s*\.\s*([a-z_][a-z0-9_]*)\b/gi;
  const byField = new Map();
  for (const sc of scans) {
    for (const m of sc.b.matchAll(RECV)) {
      if (!fields.has(m[2])) continue;
      const fn = enclosingBody(sc.bodies, m.index);
      if (!fn || !new RegExp('\\b' + m[1] + '\\b').test(fn.params)) continue;
      if (!byField.has(m[2])) byField.set(m[2], new Map());
      if (!byField.get(m[2]).has(fn.name)) byField.get(m[2]).set(fn.name, sc.src + ':' + sc.lineOf(m.index));
    }
  }
  const multi = [...byField.entries()].filter(([, v]) => v.size >= 2)
    .map(([field, v]) => ({ field, readers: [...v.entries()].map(([fn, at]) => ({ fn, at })) }))
    .sort((a, b) => b.readers.length - a.readers.length);
  return {
    argParity,
    roster: { vocabulary: fields.size, read: byField.size, multi },
  };
}

// -------------------------------------------------------------------------- enums (F128's shape)

function enums(scans) {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const allText = scans.map(s => s.text).join('\n');
  const rosterText = fs.readdirSync(path.join(repoRoot, 'Calculator'))
    .filter(n => /^units_.*\.js$/.test(n))
    .map(n => fs.readFileSync(path.join(repoRoot, 'Calculator', n), 'utf8')).join('\n');
  const css = fs.existsSync(path.join(repoRoot, 'Calculator', 'style.css'))
    ? fs.readFileSync(path.join(repoRoot, 'Calculator', 'style.css'), 'utf8') : '';
  const esc = v => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // axis 1 — an <option> the page offers that no source names
  const offered = [];
  for (const [, id, body] of html.matchAll(/<select\b[^>]*\bid="([A-Za-z0-9_]+)"[^>]*>([\s\S]*?)<\/select>/g)) {
    for (const om of body.matchAll(/<option\b[^>]*\bvalue="([^"]*)"/g)) {
      if (om[1] === '') continue;
      offered.push({ select: id, value: om[1] });
    }
  }
  const deadOptions = offered.filter(o => !new RegExp("['\"]" + esc(o.value) + "['\"]").test(allText));

  // axis 2 — a flat string vocabulary member named nowhere but its own declaration. Sources,
  // index.html, the generated rosters and the stylesheet are all searched: a category comes from
  // roster data and a panel class from CSS, and missing either reports a live member as dead.
  const vocabs = [];
  for (const sc of scans) {
    const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:Object\.freeze\(\s*)?\[/g;
    let m;
    while ((m = re.exec(sc.b))) {
      const open = sc.b.indexOf('[', m.index + m[0].length - 1);
      let d = 0, end = open;
      for (let i = open; i < sc.b.length; i++) { if (sc.b[i] === '[') d++; else if (sc.b[i] === ']') { d--; if (!d) { end = i; break; } } }
      const inner = sc.text.slice(open + 1, end);
      if (/[{[]/.test(blank(inner))) continue;
      const members = [...inner.matchAll(/'([^'\\]+)'|"([^"\\]+)"/g)].map(x => x[1] || x[2]);
      if (members.length < 2) continue;
      // An array of markup fragments is a builder, not a vocabulary; every fragment is unique by
      // construction, so counting them reports the shape of `parts.push(…)` and nothing else.
      if (members.some(x => x.includes('<'))) continue;
      if (members.length !== inner.split(',').filter(x => x.trim()).length) continue;
      vocabs.push({ src: sc.src, line: sc.lineOf(open), name: m[1], members });
    }
  }
  let memberCount = 0;
  const deadMembers = [];
  for (const v of vocabs) {
    for (const mem of v.members) {
      memberCount++;
      const lit = new RegExp("['\"]" + esc(mem) + "['\"]", 'g');
      const occurrences = (allText.match(lit) || []).length;
      // a bare identifier elsewhere (`abilities.blackpowder`) is a live use of the same name
      const bare = new RegExp('(?<![\'"\\w$])' + esc(mem) + '(?![\'"\\w$])');
      const elsewhere = occurrences > 1
        || lit.test(rosterText) || new RegExp('"' + esc(mem) + '"').test(html)
        || css.includes(mem) || bare.test(allText);
      if (!elsewhere) deadMembers.push({ vocab: v, member: mem });
    }
  }
  return {
    options: { offered: offered.length, dead: deadOptions },
    vocabularies: { declarations: vocabs.length, members: memberCount, dead: deadMembers },
  };
}

// ------------------------------------------------------------ writeonly (the mirror of F128)

// A name written onto the abilities map and named nowhere else in the repository. Counted over
// the whole repo, not just Calculator/, because the Node checks and Playwright suites read
// derived flags by name (`luckyPhaseA` lives only in tools/unit_checks).
function writeonly(scans) {
  const candidates = new Map();
  for (const sc of scans) {
    if (/^Calculator\/(presets_|test_tree)/.test(sc.src)) continue;
    const add = (name, at) => {
      if (!candidates.has(name)) candidates.set(name, []);
      candidates.get(name).push({ src: sc.src, line: sc.lineOf(at) });
    };
    for (const m of sc.b.matchAll(/\b(?:abilities|abil|stripped|fundamentalAbilities|out|u)\s*\.\s*([A-Za-z_$][\w$]*)\s*=(?!=)/g)) add(m[1], m.index);
    for (const m of sc.b.matchAll(/\.\.\.\s*(?:abilities|abil|unit\.abilities|stripped|fundamentalAbilities)\b/g)) {
      let d = 1, i = m.index;
      while (i > 0 && d > 0) { const c = sc.b[i]; if (c === '}') d++; else if (c === '{') d--; i--; }
      const open = i + 1;
      let dd = 0, end = open;
      for (let k = open; k < sc.b.length; k++) { if (sc.b[k] === '{') dd++; else if (sc.b[k] === '}') { dd--; if (!dd) { end = k; break; } } }
      let dep = 0;
      for (let k = open + 1; k < end; k++) {
        const c = sc.b[k];
        if ('([{'.includes(c)) { dep++; continue; }
        if (')]}'.includes(c)) { dep--; continue; }
        if (dep !== 0) continue;
        const km = /^([A-Za-z_$][\w$]*)\s*:/.exec(sc.b.slice(k, k + 40));
        if (km && !/[\w$.]/.test(sc.b[k - 1] || ' ')) { add(km[1], k); k += km[0].length - 1; }
      }
    }
  }
  const haystack = repoJsAndTests();
  const findings = [];
  for (const [name, sites] of candidates) {
    if (name.length < 4) continue;
    const occ = (haystack.match(new RegExp('\\b' + name + '\\b', 'g')) || []).length;
    if (occ <= sites.length) findings.push({ name, occurrences: occ, sites });
  }
  findings.sort((a, b) => a.name.localeCompare(b.name));
  return { candidates: candidates.size, findings };
}

// Code only, with comments stripped. `Reference docs/` is excluded because the Warlord manuals
// are prose that happens to contain ordinary English words, and comments are blanked because a
// comment is not a reader — including this sweep's own, which names every flag it analyses.
// Both masks hide a value nothing consumes behind a sentence about it. String literals are kept:
// a fixture key or a lookup name in a literal IS a reader.
function repoJsAndTests() {
  const parts = [blank(fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8'), { strings: false })];
  const walk = dir => {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (/\.(js|mjs|cjs)$/.test(e.name)) parts.push(blank(fs.readFileSync(p, 'utf8'), { strings: false }));
    }
  };
  for (const dir of ['Calculator', 'tools', 'tests']) walk(path.join(repoRoot, dir));
  return parts.join('\n');
}

// ---------------------------------------------------------------------------------- reporting

function main() {
  const argv = process.argv.slice(2);
  const wantJson = argv.includes('--json');
  const picked = argv.filter(a => MODES.includes(a));
  const run = picked.length ? picked : MODES;

  const files = sources();
  const scans = readAll(files);
  const desync = scans.map(s => s.desync).filter(Boolean);

  const out = { sources: files.length, desync };
  if (run.includes('predicates')) out.predicates = predicates(scans);
  if (run.includes('readers')) out.readers = readers(scans, ['deriveUnitStats']);
  if (run.includes('enums')) out.enums = enums(scans);
  if (run.includes('writeonly')) out.writeonly = writeonly(scans);

  if (wantJson) { console.log(JSON.stringify(out, null, 1)); return; }

  const L = console.log;
  L('Drift-class sweep — ' + out.sources + ' sources, ' + desync.length + ' desynchronized'
    + (desync.length ? '  ** findings below are unreliable **' : ''));
  for (const d of desync) L('   ' + d.src + '  braces ' + d.brace + '  parens ' + d.paren);

  if (out.predicates) {
    const p = out.predicates;
    L('');
    L('PREDICATES — one fact written in >= 2 distinct functions (F132\'s shape).  '
      + p.findings.length + ' found, from ' + p.candidates + ' compound tests.');
    for (const f of p.findings) {
      L('');
      L('  ' + f.sites.length + 'x across ' + f.files + ' file' + (f.files === 1 ? '' : 's') + ':  ' + f.key.slice(0, 150));
      for (const s of f.sites) L('        ' + s.src + ':' + s.line + '  ' + s.fn);
    }
  }

  if (out.readers) {
    L('');
    for (const a of out.readers.argParity) {
      L('READERS/args — ' + a.callee + ': ' + a.sites.length + ' object-literal call sites, '
        + a.keys + ' distinct keys, ' + a.divergent.length + ' stated by some and not others.');
      for (const s of a.sites) L('        ' + s.src + ':' + s.line + '  ' + s.fn + '  (' + s.keys.size + ' keys)');
      for (const d of a.divergent) {
        L('   ' + d.key.padEnd(20) + ' stated by ' + d.stated.join(', ') + '  |  omitted by ' + d.omitted.join(', '));
      }
      L('   (* = stated only inside a conditional spread)');
    }
    const r = out.readers.roster;
    L('');
    L('READERS/roster — roster-record fields decoded by more than one function (F121\'s shape).  '
      + r.multi.length + ' of ' + r.read + ' fields read at all, from a ' + r.vocabulary + '-field record.');
    for (const f of r.multi) {
      L('  ' + f.field.padEnd(20) + f.readers.length + ' readers');
      for (const x of f.readers) L('        ' + x.fn.padEnd(30) + x.at);
    }
    L('  Only a receiver that is a PARAMETER of its function is counted, so a decode through a');
    L('  local (`const unit = units.find(…)`) is invisible here; read this as a floor.');
  }

  if (out.enums) {
    const e = out.enums;
    L('');
    L('ENUMS/options — <option> values the page offers: ' + e.options.offered
      + '; named by no source: ' + e.options.dead.length + '.');
    for (const d of e.options.dead) L('        #' + d.select + '  value="' + d.value + '"');
    L('ENUMS/vocabularies — flat string lists: ' + e.vocabularies.declarations + ' declarations, '
      + e.vocabularies.members + ' members; named nowhere but their own declaration: '
      + e.vocabularies.dead.length + '.');
    for (const d of e.vocabularies.dead) {
      L('        ' + d.vocab.src + ':' + d.vocab.line + '  ' + d.vocab.name + '  ->  \'' + d.member + '\'');
    }
  }

  if (out.writeonly) {
    const w = out.writeonly;
    L('');
    L('WRITEONLY — names written onto an abilities map: ' + w.candidates
      + '; written and named nowhere else in the repository: ' + w.findings.length + '.');
    for (const f of w.findings) {
      L('        ' + f.name.padEnd(24) + f.occurrences + ' occurrence(s), all writes:  '
        + f.sites.map(s => s.src + ':' + s.line).join(', '));
    }
  }

  L('');
  L('Coverage: these scans are lexical. A name reached through a computed key, a bracket access');
  L('or a property chain this scan does not model is invisible to them, so a count of 0 is 0 on');
  L('that axis and never a proof of absence. `desynchronized` is the sweep\'s own statement of');
  L('where its brace walk lost the file.');
}

main();
