// Census of version-hidden controls that still move a number. Run:
//   node tools/hidden_control_leak_sweep.js [--derive-only]
//
// `SPEC.md`, *Versions*: "Abilities and enchantments not present in a version must be hidden
// from the UI and inert in the result. A hidden control must never influence a computation."
// The UI half is asserted by `tests/version-gating.spec.js`, which also clears a version-gated
// control's value, so no preset and no page interaction can reach one. `deriveUnitStats` and
// `resolveCombat` are the paths that can — presets are the browser's only entry, but the two
// functions take an `abilities` map directly — and nothing checks that half, which is what this
// sweep measures (F118).
//
// A `calcKey` counts as hidden in a version only when **every** control naming it is gated
// there: several controls map to one key, and a key one visible control owns is a real input.
//
// Two tiers, because they fail differently. **derive** compares the derived stat record, minus
// the `abilities` echo — a derivation is handed that map and returns it, so the echo differs for
// every hidden key by construction and says nothing. **combat** compares what `resolveCombat`
// produces, which catches a combat-side read of the echo that writes no stat.
//
// This is a diagnostic, not part of `npm test`: the combat tier alone is ~50s.

'use strict';

const vm = require('vm');
const { loadCalculatorContext } = require('./calculator_sources');
const { modernRecordForSharedSlot } = require('./unit_checks/assertions');

// `abilityVersionGated` is the single home for "does this def exist in this version"
// (`ability_gating.js`, data-scope="core"), and re-deriving the rule here would let the two drift.
const ctx = loadCalculatorContext();

const read = expression => vm.runInContext(expression, ctx);
const VERSIONS = read('ENGINE_VERSIONS');
const deriveUnitStats = read('deriveUnitStats');
const resolveCombat = read('resolveCombat');
const abilityUiDefs = read('abilityUiDefs');
const abilityVersionGated = read('abilityVersionGated');

// Resolved per version in `baseInput`: the two engine families spell the magical projectile
// class differently, and a shape naming the other family's token exercises no magical branch.
const MAGICAL_RANGED = '@magical';

const SHAPES = [
  { name: 'bare', over: { atk: 6, rtb: 0, rtbType: 'none', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'missile', over: { atk: 6, rtb: 7, rtbType: 'missile', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'boulder', over: { atk: 6, rtb: 6, rtbType: 'boulder', def: 4, res: 6, hp: 4, figs: 4 } },
  { name: 'thrown', over: { atk: 6, rtb: 4, rtbType: 'thrown', def: 4, res: 6, hp: 4, figs: 6 } },
  { name: 'fire', over: { atk: 6, rtb: 5, rtbType: 'fire', def: 4, res: 6, hp: 4, figs: 4 } },
  { name: 'lightning', over: { atk: 6, rtb: 5, rtbType: 'lightning', def: 4, res: 6, hp: 4, figs: 4 } },
  { name: 'magical', over: { atk: 6, rtb: 8, rtbType: MAGICAL_RANGED, def: 4, res: 6, hp: 4, figs: 2 } },
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

// Several hidden effects reach only one of the three, so the derive tier sweeps all three.
const IDENTITIES = [
  { name: 'normal', over: { unitType: 'normal' } },
  { name: 'fantastic', over: { unitType: 'fantastic' } },
  { name: 'hero', over: { unitType: 'hero' } },
];

// A CoM2/Warlord shape states the record that version has: the four named channels, with the
// shared slot beside them as the card's projection (`unit_checks/assertions.js`,
// `modernRecordForSharedSlot`). A shape that already names `modernAttacks` keeps its own.
function baseInput(prefix, version, over) {
  const typed = over.rtbType === MAGICAL_RANGED
    ? { ...over, rtbType: version.startsWith('com2') ? 'magic' : 'magic_s' } : over;
  const resolved = version.startsWith('com2') && !typed.modernAttacks
    ? { ...typed, modernAttacks: modernRecordForSharedSlot(ctx, typed.rtbType, typed.rtb) }
    : typed;
  return {
    prefix, version, abilities: {}, level: 'normal', weapon: 'normal', armor: 'normal',
    rtbType: 'none', unitType: 'normal', figs: 6, atk: 6, rtb: 0, def: 4, res: 6, hp: 4, dmg: 0,
    toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0, cityWalls: 'none', nodeAura: 'none',
    trueLight: false, darkness: false, enemyEternalNight: false, rangedCheck: false,
    rangedDist: 1, warpReality: false, chaosChannels: 'none',
    ...resolved,
  };
}

// Step identity moves whenever a step is merged or renamed, so the digest is derived values
// only — the same exclusion `tools/derivation_equivalence.js` makes, for the same reason.
const IDENTITY_KEYS = new Set([
  'statTrace', 'identityTrace', 'modifierTraces', 'statExecutionTrace', 'traceOrder',
]);

function digest(value) {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'number' && !Number.isInteger(value)
      ? Number(value.toFixed(6)) : value;
  }
  if (Array.isArray(value)) return value.map(digest);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (IDENTITY_KEYS.has(key)) continue;
    out[key] = digest(value[key]);
  }
  return out;
}

function deriveDigest(version, over, abilities) {
  const input = baseInput('a', version, over);
  input.abilities = abilities;
  try {
    const { abilities: echo, ...rest } = deriveUnitStats(input);
    return JSON.stringify(digest(rest));
  } catch (err) { return 'THREW: ' + err.message; }
}

// One exchange against a plain opponent of the same shape with no secondary attack, melee and
// ranged, so a hidden control reaching either resolution path shows up.
//
// The key is probed on **both** sides, one at a time. Probing the attacker alone missed every
// effect whose only observable is on the unit being attacked: `rage` scales with figures already
// lost, and in these shapes it is the counter-attacking defender that loses figures first, so a
// Warlord-only control moved four versions' numbers without this sweep reporting it (F130).
function combatDigest(version, over, abilities, isRanged, side) {
  const attacker = baseInput('a', version, over);
  const defender = baseInput('b', version,
    { ...over, modernAttacks: undefined, rtbType: 'none', rtb: 0 });
  (side === 'b' ? defender : attacker).abilities = abilities;
  try {
    const a = deriveUnitStats(attacker);
    const b = deriveUnitStats(defender);
    const result = resolveCombat(a, b, {
      isRanged, version, wallOfFire: false, chaosConjunction: false,
    });
    const mean = dist => (dist || []).reduce((sum, p, i) => sum + p * i, 0);
    const round = x => (typeof x === 'number' ? Number(x.toFixed(9)) : x);
    return JSON.stringify([round(mean(result.totalDmgToA)), round(mean(result.totalDmgToB)),
      round(result.aDestroyPct), round(result.bDestroyPct),
      round(result.aAlive), round(result.bAlive)]);
  } catch (err) { return 'THREW: ' + err.message; }
}

function valuesFor(def) {
  if (def.type === 'bool') return [true];
  if (def.type === 'num' || def.type === 'numcheck') return [3];
  if (def.type === 'select' && Array.isArray(def.options)) {
    return def.options.map(option => option[0]).filter(value => value !== 'none' && value !== '');
  }
  return [];
}

function hiddenPairs() {
  const byCalcKey = new Map();
  for (const def of abilityUiDefs()) {
    if (!def || !def.key) continue;
    const calcKey = def.calcKey || def.key;
    if (!byCalcKey.has(calcKey)) byCalcKey.set(calcKey, []);
    byCalcKey.get(calcKey).push(def);
  }
  const pairs = [];
  for (const version of VERSIONS) {
    for (const [calcKey, defs] of byCalcKey) {
      if (!defs.every(def => abilityVersionGated(def, version))) continue;
      const values = [];
      for (const def of defs) {
        for (const value of valuesFor(def)) {
          if (!values.some(v => JSON.stringify(v) === JSON.stringify(value))) values.push(value);
        }
      }
      pairs.push({ version, calcKey, values, controls: defs.map(d => `${d.source}:${d.key}`) });
    }
  }
  return pairs;
}

function run() {
  const deriveOnly = process.argv.includes('--derive-only');
  const pairs = hiddenPairs();
  const derived = [];
  const resolved = [];
  let deriveCases = 0;
  let combatCases = 0;

  for (const pair of pairs) {
    let hitDerive = null;
    for (const identity of IDENTITIES) {
      for (const shape of SHAPES) {
        const over = { ...shape.over, ...identity.over };
        const base = deriveDigest(pair.version, over, {});
        for (const value of pair.values) {
          deriveCases += 1;
          if (deriveDigest(pair.version, over, { [pair.calcKey]: value }) !== base) {
            hitDerive = hitDerive || { ...pair, value, where: `${shape.name}/${identity.name}` };
          }
        }
      }
    }
    if (hitDerive) derived.push(hitDerive);
    if (deriveOnly) continue;
    let hitCombat = null;
    for (const shape of SHAPES) {
      for (const isRanged of [false, true]) {
        for (const side of ['a', 'b']) {
          const base = combatDigest(pair.version, shape.over, {}, isRanged, side);
          for (const value of pair.values) {
            combatCases += 1;
            const got = combatDigest(pair.version, shape.over, { [pair.calcKey]: value }, isRanged, side);
            if (got !== base) {
              hitCombat = hitCombat || {
                ...pair, value, base, got,
                where: `${shape.name}/${isRanged ? 'ranged' : 'melee'}/${side}`,
              };
            }
          }
        }
      }
    }
    if (hitCombat) resolved.push(hitCombat);
  }

  const line = leak => `  ${leak.version}  ${leak.calcKey}=${JSON.stringify(leak.value)}`
    + `  [${leak.where}]  controls=${leak.controls.join(',')}`;
  console.log(`hidden (calcKey, version) pairs: ${pairs.length}`);
  console.log(`derivations compared: ${deriveCases}`);
  console.log(`pairs moving a derived stat: ${derived.length}`);
  derived.forEach(leak => console.log(line(leak)));
  if (deriveOnly) return;
  console.log(`exchanges compared: ${combatCases}`);
  console.log(`pairs moving a resolveCombat number: ${resolved.length}`);
  resolved.forEach(leak => {
    console.log(line(leak));
    console.log(`      base=${leak.base}`);
    console.log(`      got =${leak.got}`);
  });
}

run();
