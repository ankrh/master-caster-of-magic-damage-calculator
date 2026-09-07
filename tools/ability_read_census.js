// Census of ability/enchantment reads in the computation layer. Run:
//   node tools/ability_read_census.js [--sites] [--keys]
//
// `SPEC.md`, *Versions*, invariant 4 requires an effect a version lacks to be inert in the result.
// `tests/version-gating.spec.js` asserts the UI half and `tools/hidden_control_leak_sweep.js`
// probes the result half one control at a time. This tool measures the third thing neither can
// see: **which read sites exist, and which ability key each one actually reads**, so a later round
// can ask of every site whether its key's scope is stated somewhere.
//
// Two rounds of the census (F130, F157) rebuilt this instrumentation ad hoc and threw it away, so
// their site counts could not be re-derived. It is checked in from F158 on.
//
// Method. Syntax alone cannot answer the gating question — most gating here is transitive, through
// a caller guard or through `filterStepsToVersionScope` — so the sites are found lexically and then
// **executed**: each read is rewritten to `__REC(idx, <key expression>, <original expression>)` and
// the transformed sources are loaded into a vm context. `__REC` records the key its call actually
// received, which is the point:
//
//   Three sites take their key from a variable (`placedTouchValue`, `applyWarlordTouchFlagPlacement`
//   and the region-`e` aura values). A source scan can attribute them to no key at all, so the two
//   earlier rounds counted them in the site total and listed them in no group — and one of them was
//   leaking the whole time (F158, Dispel Evil in CoM 1, CoM2 and Warlord). Recording the key at
//   call time attributes them like any other site.
//
// Limitation, and it is the same one the census document states: a site fires only if some shape
// reaches it. "Never fires" here means "not under these shapes", never "unreachable".

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { blank, lexSanity, matchPair } = require('./js_lexical_scan');
const { calculatorSources, repoRoot } = require('./calculator_sources');
const { modernRecordForSharedSlot } = require('./unit_checks/assertions');

// The computation layer the census covers, in manifest order. Named by pattern rather than listed,
// so a new `combat_*.js` source joins the census without a second file list to update.
const CENSUS_FILE = /^Calculator\/(combat.*|stats|stats_identity|stats_sequence)\.js$/;

const ACCESSORS = new Set(['hasAbil', 'abilVal', 'abilDefined']);

// Top-level argument extents inside `(...)`, as offsets into the same text. `splitArgs` returns
// trimmed strings, which cannot be located again once `blank` has emptied the string literals
// they contain, so the offsets are kept instead of the text.
function argumentSpans(masked, from, to) {
  const spans = [];
  let depth = 0;
  let start = from;
  for (let i = from; i < to; i++) {
    const ch = masked[i];
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) { spans.push({ start, end: i }); start = i + 1; }
  }
  spans.push({ start, end: to });
  return spans.map(span => {
    let { start: s, end: e } = span;
    while (s < e && /\s/.test(masked[s])) s++;
    while (e > s && /\s/.test(masked[e - 1])) e--;
    return { start: s, end: e };
  });
}

// `hasAbil(ab, key)` and friends take the key second; `X.abilities.name` and a bare
// `abilities.name` carry it in the member name. Those are the four forms the F130 census counted,
// and the site total is only comparable across rounds while they stay the same four.
function findSites(file, text) {
  const masked = blank(text);
  const sites = [];
  const identifier = /[A-Za-z_$][\w$]*/y;

  const wordAt = index => {
    identifier.lastIndex = index;
    const match = identifier.exec(masked);
    return match && match.index === index ? match[0] : null;
  };

  for (let i = 0; i < masked.length; i++) {
    if (!/[A-Za-z_$]/.test(masked[i])) continue;
    if (i > 0 && /[\w$.]/.test(masked[i - 1])) continue;
    const word = wordAt(i);
    if (!word) continue;

    if (ACCESSORS.has(word)) {
      let j = i + word.length;
      while (j < masked.length && /\s/.test(masked[j])) j++;
      if (masked[j] !== '(') { i += word.length - 1; continue; }
      const past = matchPair(masked, j, '(', ')');
      // A declaration is not a read.
      if (/\bfunction\s+$/.test(masked.slice(Math.max(0, i - 12), i))) { i = past - 1; continue; }
      const span = argumentSpans(masked, j + 1, past - 1);
      if (span.length < 2) throw new Error(`${file}: ${word}() with ${span.length} arguments`);
      sites.push({
        file,
        form: word,
        start: i,
        end: past,
        // Read out of the *original* text: `blank` preserves offsets but empties string bodies,
        // so the masked copy cannot supply a literal key.
        keyExpression: text.slice(span[1].start, span[1].end),
      });
      i = past - 1;
      continue;
    }

    if (word === 'abilities') {
      const memberStart = i + word.length;
      if (masked[memberStart] !== '.') { i += word.length - 1; continue; }
      const member = wordAt(memberStart + 1);
      if (!member) { i += word.length - 1; continue; }
      let end = memberStart + 1 + member.length;
      // Skip writes and deletes: `unit.abilities.undead = true` is not a read, and wrapping it
      // would not parse.
      let after = end;
      while (after < masked.length && /\s/.test(masked[after])) after++;
      const isWrite = (masked[after] === '=' && masked[after + 1] !== '=')
        || masked.slice(after, after + 2) === '++' || masked.slice(after, after + 2) === '--';
      const owner = /([\w$]+\.)?$/.exec(masked.slice(0, i))[0];
      const start = i - owner.length;
      const isDelete = /\bdelete\s+$/.test(masked.slice(Math.max(0, start - 10), start));
      if (isWrite || isDelete) { i = end - 1; continue; }
      sites.push({ file, form: 'member', start, end, keyExpression: `'${member}'` });
      i = end - 1;
      continue;
    }

    i += word.length - 1;
  }
  return sites;
}

function instrument(text, sites, baseIndex) {
  let out = '';
  let cursor = 0;
  sites.forEach((site, offset) => {
    out += text.slice(cursor, site.start);
    out += `__REC(${baseIndex + offset}, ${site.keyExpression}, ${text.slice(site.start, site.end)})`;
    cursor = site.end;
  });
  return out + text.slice(cursor);
}

// --- execution ---------------------------------------------------------------------------------

const SHAPES = [
  { name: 'bare', over: { atk: 6, rtb: 0, rtbType: 'none', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'missile', over: { atk: 6, rtb: 7, rtbType: 'missile', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'thrown', over: { atk: 6, rtb: 4, rtbType: 'thrown', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'fire', over: { atk: 6, rtb: 5, rtbType: 'fire', def: 4, res: 6, hp: 4, figs: 4 } },
  { name: 'gazeDeath', over: { atk: 6, rtb: 3, rtbType: 'gaze_death', def: 4, res: 6, hp: 4, figs: 4 } },
  {
    name: 'channels',
    over: {
      atk: 9, rtb: 7, rtbType: 'missile', def: 5, res: 7, hp: 4, figs: 6,
      modernAttacks: {
        ranged: { strength: 7, type: 'missile' },
        thrown: { strength: 4, type: 'thrown' },
        fireBreath: { strength: 5, type: 'fire' },
        lightningBreath: { strength: 3, type: 'lightning' },
      },
    },
  },
];

const UNIT_TYPES = ['normal', 'hero', 'fantastic_death', 'fantastic_chaos', 'fantastic_life'];

function baseInput(ctx, prefix, version, over) {
  const resolved = version.startsWith('com2') && !over.modernAttacks
    ? { ...over, modernAttacks: modernRecordForSharedSlot(ctx, over.rtbType, over.rtb) }
    : over;
  const toHit = version.startsWith('com2')
    ? { hitChance: 70, hitMelee: 0, hitRanged: 0, hitThrown: 0, hitBreath: 0 }
    : { toHitMod: 70, toHitRtbMod: 70 };
  return {
    prefix, version, abilities: {}, level: 'normal', weapon: 'normal', armor: 'normal',
    rtbType: 'none', unitType: 'normal', figs: 6, atk: 6, rtb: 0, def: 4, res: 6, hp: 4, dmg: 0,
    toBlkMod: 70, cityWalls: 'none', nodeAura: 'none', trueLight: false, darkness: false,
    enemyEternalNight: false, rangedCheck: false, rangedDist: 1, warpReality: false,
    chaosChannels: 'none', ...toHit, ...resolved,
  };
}

// Every ability the UI can author, at a probe value, minus the ones that make a shape throw. The
// point is breadth of *reads*, not a meaningful unit: a key that reaches no read contributes
// nothing, and one that throws is dropped rather than silently narrowing the sweep.
function probeAbilities(ctx, read, version) {
  const defs = read('abilityUiDefs')();
  const candidate = {};
  for (const def of defs) {
    const key = def.calcKey || def.key;
    if (def.type === 'bool') candidate[key] = true;
    else if (def.type === 'num' || def.type === 'numcheck') candidate[key] = 2;
    else if (def.type === 'select' && Array.isArray(def.options)) {
      const option = def.options.map(o => o[0]).find(v => v !== 'none' && v !== '');
      if (option !== undefined) candidate[key] = option;
    }
  }
  const deriveUnitStats = read('deriveUnitStats');
  const accepted = {};
  for (const [key, value] of Object.entries(candidate)) {
    const trial = { ...accepted, [key]: value };
    try {
      deriveUnitStats(baseInput(ctx, 'a', version, { ...SHAPES[0].over, abilities: trial }));
      accepted[key] = value;
    } catch (error) { /* out of range for this version: leave it out */ }
  }
  return accepted;
}

function run() {
  const files = calculatorSources().core.filter(file => CENSUS_FILE.test(file));
  if (!files.length) throw new Error('ability_read_census: the manifest lists no census sources');

  const sites = [];
  const transformed = new Map();
  for (const file of files) {
    const text = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
    const sanity = lexSanity(file, blank(text));
    if (sanity) {
      throw new Error(`ability_read_census: ${file} did not lex cleanly `
        + `(brace ${sanity.brace}, paren ${sanity.paren})`);
    }
    const fileSites = findSites(file, text);
    transformed.set(file, instrument(text, fileSites, sites.length));
    fileSites.forEach(site => sites.push(site));
  }

  const seen = sites.map(() => new Set());
  const context = { console, __REC: (idx, key, value) => { seen[idx].add(String(key)); return value; } };
  vm.createContext(context);
  for (const file of calculatorSources().core) {
    const source = transformed.has(file)
      ? transformed.get(file)
      : fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
    vm.runInContext(source, context, { filename: file });
  }
  const read = expression => vm.runInContext(expression, context);
  const deriveUnitStats = read('deriveUnitStats');
  const resolveCombat = read('resolveCombat');

  let derivations = 0;
  let exchanges = 0;
  for (const version of read('ENGINE_VERSIONS')) {
    const rich = probeAbilities(context, read, version);
    for (const shape of SHAPES) {
      for (const unitType of UNIT_TYPES) {
        for (const abilities of [{}, rich]) {
          const over = { ...shape.over, unitType, abilities };
          let a;
          let b;
          try {
            a = deriveUnitStats(baseInput(context, 'a', version, over));
            b = deriveUnitStats(baseInput(context, 'b', version,
              { ...over, modernAttacks: undefined, rtbType: 'none', rtb: 0 }));
            derivations += 2;
          } catch (error) { continue; }
          for (const isRanged of [false, true]) {
            try {
              resolveCombat(a, b, { version, isRanged, wallOfFire: true, chaosConjunction: true });
              exchanges += 1;
            } catch (error) { /* shape the engine refuses; the derivations still counted */ }
          }
        }
      }
    }
  }

  // A site's key is *static* when its key expression is a string literal — that is all a source
  // scan can attribute. Everything else needs the runtime record.
  const staticKey = site => (/^'[^']*'$/.test(site.keyExpression) ? site.keyExpression.slice(1, -1) : null);
  const dynamic = sites.filter(site => staticKey(site) === null);
  const dynamicAttributed = dynamic.filter((site, index) => seen[sites.indexOf(site)].size > 0);
  const unattributed = sites.filter((site, index) => staticKey(site) === null && seen[index].size === 0);
  const neverFired = sites.filter((site, index) => seen[index].size === 0);
  const keys = new Set();
  sites.forEach((site, index) => {
    const constant = staticKey(site);
    if (constant) keys.add(constant);
    seen[index].forEach(key => keys.add(key));
  });

  console.log(`census sources: ${files.length} (${files.join(', ')})`);
  console.log(`read sites: ${sites.length}`);
  console.log(`derivations: ${derivations}, exchanges: ${exchanges}`);
  console.log(`sites a source scan can attribute (literal key): ${sites.length - dynamic.length}`);
  console.log(`sites taking their key from a variable: ${dynamic.length}`);
  console.log(`  of those, attributed at runtime: ${dynamicAttributed.length}`);
  console.log(`sites attributed to no key at all: ${unattributed.length}`);
  console.log(`sites no shape reached: ${neverFired.length}`);
  console.log(`distinct keys read: ${keys.size}`);

  if (process.argv.includes('--sites')) {
    const lineOf = (file, offset) => {
      const text = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
      return text.slice(0, offset).split(/\r?\n/).length;
    };
    for (const site of dynamic) {
      const index = sites.indexOf(site);
      console.log(`  ${site.file}:${lineOf(site.file, site.start)}  ${site.form}(${site.keyExpression})`
        + `  ->  ${[...seen[index]].sort().join(', ') || '(no shape reached it)'}`);
    }
  }
  if (process.argv.includes('--keys')) {
    for (const key of [...keys].sort()) console.log(`  ${key}`);
  }
}

if (require.main === module) run();

// `findSites` is exported so the site definition can be replayed against an older revision of a
// source: comparing this round's total with a previous round's is only meaningful when the same
// definition produced both.
module.exports = { findSites, CENSUS_FILE };
