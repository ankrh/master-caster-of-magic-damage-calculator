// The mirror image of `tools/hidden_control_leak_sweep.js`. Run:
//   node tools/narrow_control_scope_sweep.js [--all]
//
// `SPEC.md`, *Versions*, invariant 4 has two failure directions and only one of them was ever
// swept. The hidden-control sweep probes **out-of-scope** pairs: a control a version hides that
// still moves a number is a leak, and it announces itself as damage appearing where the UI offers
// nothing. The other direction is silent. A gate that is *narrower* than the effect suppresses it
// in a version that has it, and shows up only as an effect quietly doing nothing — no error, no
// visible control, no number to compare against. The census recorded that neither it nor the
// hidden-control sweep can see that direction, and that the mirror sweep did not exist (F158).
//
// This is it. For every calcKey the UI offers, in every version whose UI offers it, the sweep asks
// whether setting the key moves any of the six numbers `resolveCombat` reports. A key that moves
// something in some of its visible versions and nothing in the others is the signal: either the
// engines really differ there, in which case some scope table should say so and be citable, or the
// calculator is suppressing an effect the version has.
//
// Two things it deliberately does NOT report as findings:
//   - a key inert in **every** visible version. That is a shape gap, not a version gate; it is
//     what `tools/preset_vacuity_sweep.js` measures per preset and what the census's standing
//     limitation is about.
//   - a split that a `STEP_VERSION_SCOPES` or `COMBAT_VERSION_SCOPES` entry already covers. Those
//     entries are the cited home for exactly this fact, so a split matching one is settled, not a
//     finding. The check is deliberately loose — any scope entry naming the key — because a key's
//     writes can be split across several ids.
//
// `--all` prints every split, settled ones included. This is a diagnostic, not part of `npm test`.

'use strict';

const vm = require('vm');
const { loadCalculatorContext } = require('./calculator_sources');
const { modernRecordForSharedSlot } = require('./unit_checks/assertions');

const ctx = loadCalculatorContext();
const read = expression => vm.runInContext(expression, ctx);
const VERSIONS = read('ENGINE_VERSIONS');
const deriveUnitStats = read('deriveUnitStats');
const resolveCombat = read('resolveCombat');
const abilityUiDefs = read('abilityUiDefs');
const abilityVersionGated = read('abilityVersionGated');

// The defender carries the shapes the hidden-control sweep never builds, because that is where its
// seven scored-inert leaks were hiding: a Fantastic Death target with Weapon Immunity available,
// reachable by a touch attack, alongside a plain normal one.
const SHAPES = [
  { name: 'melee', over: { atk: 6, rtb: 0, rtbType: 'none', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'missile', over: { atk: 6, rtb: 7, rtbType: 'missile', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'thrown', over: { atk: 6, rtb: 4, rtbType: 'thrown', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'gaze', over: { atk: 6, rtb: 3, rtbType: 'gaze_death', def: 4, res: 6, hp: 4, figs: 4 } },
];

const DEFENDERS = [
  { name: 'normal', over: { unitType: 'normal' } },
  { name: 'fantasticDeath', over: { unitType: 'fantastic_death' } },
  { name: 'hero', over: { unitType: 'hero' } },
];

function baseInput(prefix, version, over) {
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

function digest(version, shape, defender, abilities, side, isRanged) {
  const attacker = baseInput('a', version, shape.over);
  const target = baseInput('b', version,
    { ...shape.over, ...defender.over, modernAttacks: undefined, rtbType: 'none', rtb: 0 });
  (side === 'b' ? target : attacker).abilities = abilities;
  try {
    const result = resolveCombat(deriveUnitStats(attacker), deriveUnitStats(target), {
      isRanged, version, wallOfFire: false, chaosConjunction: false,
    });
    const mean = dist => (dist || []).reduce((sum, p, i) => sum + p * i, 0);
    const round = x => (typeof x === 'number' ? Number(x.toFixed(9)) : x);
    return JSON.stringify([round(mean(result.totalDmgToA)), round(mean(result.totalDmgToB)),
      round(result.aDestroyPct), round(result.bDestroyPct),
      round(result.aAlive), round(result.bAlive)]);
  } catch (error) { return `THREW: ${error.message}`; }
}

function valuesFor(def) {
  if (def.type === 'bool') return [true];
  if (def.type === 'num' || def.type === 'numcheck') return [3];
  if (def.type === 'select' && Array.isArray(def.options)) {
    return def.options.map(option => option[0]).filter(value => value !== 'none' && value !== '');
  }
  return [];
}

function scopedKeys() {
  const named = new Set();
  const add = (table, strip) => {
    for (const key of Object.keys(read(table))) {
      const id = strip ? key.slice(key.indexOf(':') + 1) : key;
      named.add(id.replace(/^resolution:/, '').split(':')[0]);
    }
  };
  add('STEP_VERSION_SCOPES', true);
  add('COMBAT_VERSION_SCOPES', true);
  return named;
}

function run() {
  const byCalcKey = new Map();
  for (const def of abilityUiDefs()) {
    if (!def || !def.key) continue;
    const calcKey = def.calcKey || def.key;
    if (!byCalcKey.has(calcKey)) byCalcKey.set(calcKey, []);
    byCalcKey.get(calcKey).push(def);
  }
  const scoped = scopedKeys();

  let comparisons = 0;
  const splits = [];
  let inertEverywhere = 0;
  let liveEverywhere = 0;
  let visiblePairs = 0;

  for (const [calcKey, defs] of byCalcKey) {
    // A key is offered in a version when *any* control naming it is visible there, the complement
    // of the hidden-control sweep's "every control gated".
    const visible = VERSIONS.filter(version => defs.some(def => !abilityVersionGated(def, version)));
    if (visible.length < 2) continue;
    const values = [];
    for (const def of defs) {
      for (const value of valuesFor(def)) {
        if (!values.some(v => JSON.stringify(v) === JSON.stringify(value))) values.push(value);
      }
    }
    if (!values.length) continue;

    const moves = [];
    for (const version of visible) {
      visiblePairs += 1;
      let moved = false;
      for (const shape of SHAPES) {
        for (const defender of DEFENDERS) {
          for (const side of ['a', 'b']) {
            for (const isRanged of [false, true]) {
              const base = digest(version, shape, defender, {}, side, isRanged);
              for (const value of values) {
                comparisons += 1;
                if (digest(version, shape, defender, { [calcKey]: value }, side, isRanged) !== base) {
                  moved = true;
                }
              }
            }
          }
        }
      }
      if (moved) moves.push(version);
    }

    if (moves.length === 0) { inertEverywhere += 1; continue; }
    if (moves.length === visible.length) { liveEverywhere += 1; continue; }
    splits.push({
      calcKey,
      visible,
      moves,
      silent: visible.filter(version => !moves.includes(version)),
      settled: scoped.has(calcKey),
    });
  }

  const showAll = process.argv.includes('--all');
  const reported = splits.filter(split => showAll || !split.settled);
  console.log(`keys offered in two or more versions: ${liveEverywhere + inertEverywhere + splits.length}`);
  console.log(`(calcKey, version) pairs whose control is visible: ${visiblePairs}`);
  console.log(`exchanges compared: ${comparisons}`);
  console.log(`keys live in every visible version: ${liveEverywhere}`);
  console.log(`keys inert in every visible version (shape gap, not a gate): ${inertEverywhere}`);
  console.log(`keys live in some visible versions and silent in others: ${splits.length}`);
  console.log(`  of those, a scope table already names the key: ${splits.filter(s => s.settled).length}`);
  console.log(`unexplained splits: ${splits.filter(s => !s.settled).length}`);
  for (const split of reported.sort((x, y) => x.calcKey.localeCompare(y.calcKey))) {
    console.log(`  ${split.calcKey}${split.settled ? ' [scoped]' : ''}`);
    console.log(`      moves in: ${split.moves.join(', ')}`);
    console.log(`      silent in: ${split.silent.join(', ')}`);
  }
}

run();
