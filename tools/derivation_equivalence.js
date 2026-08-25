// Arithmetic-equivalence digest for deriveUnitStats. Run:
//   node tools/derivation_equivalence.js <out.json>
//
// Why this exists: a change that is meant to move only step *identity* — a merge, a rename —
// has to prove it moved no number, in every version, across the whole control surface. The
// step trace is expected to differ across such a change, so the digest deliberately excludes
// it and covers derived values only.
//
// The case list is generated from ABILITY_DEFS/ENCHANTMENT_DEFS rather than written out, so a
// control added later is covered without editing this file. Combination cases use a seeded
// generator: the same seed yields the same cases on both sides of a comparison.
//
// Each value in the written map is an **object**, so compare two runs structurally — a `!==` over
// the parsed maps compares references and reports every case as differing.

'use strict';

const fs = require('fs');
const vm = require('vm');
const { loadCalculatorContext } = require('./calculator_sources');
const { modernRecordForSharedSlot } = require('./unit_checks/assertions');

const ctx = loadCalculatorContext();
// The sources declare with `const`, which never lands on the vm global, so every calculator
// binding is read by evaluating its name in the context.
const read = expression => vm.runInContext(expression, ctx);

const VERSIONS = read('ENGINE_VERSIONS');
const deriveUnitStats = read('deriveUnitStats');

// Deterministic 32-bit PRNG (mulberry32). Seeded per run so both sides enumerate identically.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The control surface, read from the definitions rather than restated.
//
// `key` names the control and so names the case; `calcKey` is what `deriveUnitStats` reads.
// The two differ on eight enchantments (`natureLink` -> `landLinking`, `apotheosis` ->
// `destiny`, ...), and `abilityUiDefs()` (`ui_abilities.js`) is what establishes that the
// derivation sees the `calcKey`. Both defs lists reach the derivation the same way — the UI
// merges them into one `abilities` map — so a spec never names a top-level input field.
function controlSpecs(defs) {
  const specs = [];
  for (const def of defs) {
    if (!def || !def.key) continue;
    const calcKey = def.calcKey || def.key;
    if (def.type === 'bool') specs.push({ key: def.key, calcKey, values: [true] });
    else if (def.type === 'num') specs.push({ key: def.key, calcKey, values: [3] });
    else if (def.type === 'numcheck') specs.push({ key: def.key, calcKey, values: [3] });
    else if (def.type === 'select' && Array.isArray(def.options)) {
      specs.push({ key: def.key, calcKey,
        values: def.options.map(o => o[0]).filter(v => v !== 'none') });
    }
  }
  return specs;
}

// The Outlander reform spells are owned by an Outlander wizard: `applyOutlanderReformGrants`
// (`stats_identity.js`) deletes every one of them from the effective ability set when
// `outlanderWizard` is absent, so a case that sets one alone exercises nothing. Pair them.
const OUTLANDER_REFORMS = new Set([
  'armorcladReform', 'ballisticsTraining', 'energyBeamWeapons', 'explosive',
  'heatPowerEngine', 'magitekEngineering', 'magitekScience', 'militaryDrilling',
  'pneumaReactor', 'psychoConverter', 'radio', 'rocketry', 'temporalEngineering',
  'xenopsychology', 'xenoveterinary',
]);

// One control into the map the derivation reads, with its owner where it has one.
function setControl(abilities, spec, value) {
  abilities[spec.calcKey] = value;
  if (OUTLANDER_REFORMS.has(spec.calcKey)) abilities.outlanderWizard = true;
}

const abilitySpecs = controlSpecs(read('ABILITY_DEFS'));
const enchantSpecs = controlSpecs(read('ENCHANTMENT_DEFS'));

// Unit shapes: the attack-channel configuration is what most type predicates read, so the
// spread covers an empty secondary slot, each conventional type, and a full modern channel set.
// A version-resolved placeholder: `magic` in CoM2/Warlord, `magic_s` in the DOS builds.
const MAGICAL_RANGED = '@magical';

const SHAPES = [
  { name: 'bare', over: { atk: 5, rtb: 0, rtbType: 'none', def: 4, res: 6, hp: 3, figs: 6 } },
  { name: 'missile', over: { atk: 5, rtb: 7, rtbType: 'missile', def: 4, res: 6, hp: 3, figs: 6 } },
  { name: 'boulder', over: { atk: 5, rtb: 6, rtbType: 'boulder', def: 4, res: 6, hp: 3, figs: 4 } },
  { name: 'thrown', over: { atk: 5, rtb: 4, rtbType: 'thrown', def: 4, res: 6, hp: 3, figs: 6 } },
  { name: 'fire', over: { atk: 5, rtb: 5, rtbType: 'fire', def: 4, res: 6, hp: 3, figs: 2 } },
  { name: 'lightning', over: { atk: 5, rtb: 5, rtbType: 'lightning', def: 4, res: 6, hp: 3, figs: 2 } },
  // Resolved per version in baseInput(): the two engine families spell the magical class
  // differently, and a shape naming the other family's token exercises no magical branch
  // at all. The shape count is fixed, so the seeded pass below keeps its selection.
  { name: 'magical', over: { atk: 5, rtb: 8, rtbType: MAGICAL_RANGED, def: 4, res: 6, hp: 3, figs: 1 } },
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
  {
    name: 'channels-thrown-only',
    over: {
      atk: 9, rtb: 0, rtbType: 'none', def: 5, res: 7, hp: 4, figs: 6,
      modernAttacks: { thrown: { strength: 4, type: 'thrown' } },
    },
  },
];

// Non-control inputs that gate whole regions. Kept small and explicit: the cross-product is
// already large, and these are the ones that select a different chain path.
const ENVS = [
  { name: 'plain', over: {} },
  { name: 'level', over: { level: 'elite' } },
  // `orihalcon` is the Armor Type control's only non-normal value, so it is what makes `gear`
  // an armour env at all. This carried `'plate'` and the row below `'none'`, neither an option
  // of that control, so both read as an ordinary suit and the axis was never exercised (F117).
  { name: 'gear', over: { weapon: 'mithril', armor: 'orihalcon' } },
  { name: 'adamantium', over: { weapon: 'adamantium', armor: 'normal' } },
  { name: 'node-dark', over: { nodeAura: 'chaos', darkness: true } },
  { name: 'truelight-warp', over: { trueLight: true, warpReality: true } },
  { name: 'enemy-night', over: { enemyEternalNight: true } },
  // `'3'` is the intact-wall position. This carried `'stone'`, which names no City walls
  // option, so the env produced bonus 0 and never exercised the axis (F113).
  { name: 'walls-ranged', over: { cityWalls: '3', rangedCheck: true, rangedDist: 3 } },
  { name: 'chaos-channels', over: { chaosChannels: 'demonWings' } },
];

// A CoM2/Warlord case states the record that version has: the four named channels, with the
// shared slot beside them as the card's projection (`unit_checks/assertions.js`,
// `modernRecordForSharedSlot`). A case that already names `modernAttacks` keeps its own.
function baseInput(version, over) {
  const typed = over.rtbType === MAGICAL_RANGED
    ? { ...over, rtbType: version.startsWith('com2') ? 'magic' : 'magic_s' } : over;
  const resolved = version.startsWith('com2') && !typed.modernAttacks
    ? { ...typed, modernAttacks: modernRecordForSharedSlot(ctx, typed.rtbType, typed.rtb) }
    : typed;
  return {
    prefix: 'a',
    version,
    abilities: {},
    level: 'normal',
    weapon: 'normal',
    armor: 'normal',
    rtbType: 'none',
    unitType: 'normal',
    figs: 6,
    atk: 5,
    rtb: 0,
    def: 4,
    res: 6,
    hp: 3,
    dmg: 0,
    toHitMod: 0,
    toHitRtbMod: 0,
    toBlkMod: 0,
    cityWalls: 'none',
    nodeAura: 'none',
    trueLight: false,
    darkness: false,
    enemyEternalNight: false,
    rangedCheck: false,
    rangedDist: 1,
    warpReality: false,
    chaosChannels: 'none',
    ...resolved,
  };
}

// The digest is derived values only. `steps`, `trace` and any modifier ledger are identity, not
// arithmetic, and a merge or rename is expected to move them.
// A merge turns two trace entries into one and a rename relabels them, so these carry step
// identity and cannot be compared entry-by-entry across such a change. The final derived values
// below are the arithmetic claim.
const IDENTITY_KEYS = new Set([
  'statTrace', 'identityTrace', 'modifierTraces', 'modifierTrace', 'toHitTrace', 'traceOrder',
  'steps', 'trace', 'events', 'modifiers', 'modifierChain', 'stepTrace', 'ledger', 'chain',
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

function run() {
  const results = {};
  let cases = 0;
  const record = (name, input) => {
    let derived;
    try {
      derived = deriveUnitStats(input);
    } catch (err) {
      results[name] = { __throw: String(err && err.message) };
      cases += 1;
      return;
    }
    results[name] = digest(derived);
    cases += 1;
  };

  for (const version of VERSIONS) {
    // 1. Every control on its own, over every shape, on the plain environment.
    for (const [kind, specs] of [['abil', abilitySpecs], ['ench', enchantSpecs]]) {
      for (const spec of specs) {
        for (const value of spec.values) {
          for (const shape of SHAPES) {
            const over = { ...shape.over };
            over.abilities = {};
            setControl(over.abilities, spec, value);
            record(`${version}|solo|${kind}|${spec.key}=${value}|${shape.name}`,
              baseInput(version, over));
          }
        }
      }
    }
    // 2. Every environment against every shape, no controls.
    for (const env of ENVS) {
      for (const shape of SHAPES) {
        record(`${version}|env|${env.name}|${shape.name}`,
          baseInput(version, { ...shape.over, ...env.over }));
      }
    }
    // 3. Seeded combinations: several controls at once, so interaction order is exercised.
    const random = rng(0x5EED);
    for (let i = 0; i < 900; i += 1) {
      const shape = SHAPES[Math.floor(random() * SHAPES.length)];
      const env = ENVS[Math.floor(random() * ENVS.length)];
      const abilities = {};
      const over = { ...shape.over, ...env.over };
      const pick = 6;
      // Both lists write the one map, so a shared `calcKey` picked twice keeps the later
      // value rather than being counted in two places, which is what the UI's merge does
      // for the controls that collapse onto one key.
      for (let n = 0; n < pick; n += 1) {
        const spec = abilitySpecs[Math.floor(random() * abilitySpecs.length)];
        setControl(abilities, spec, spec.values[Math.floor(random() * spec.values.length)]);
      }
      for (let n = 0; n < pick; n += 1) {
        const spec = enchantSpecs[Math.floor(random() * enchantSpecs.length)];
        setControl(abilities, spec, spec.values[Math.floor(random() * spec.values.length)]);
      }
      over.abilities = abilities;
      record(`${version}|combo|${i}`, baseInput(version, over));
    }
  }
  return { cases, results };
}

const out = process.argv[2];
if (!out) {
  console.error('usage: node tools/derivation_equivalence.js <out.json>');
  process.exit(2);
}
const { cases, results } = run();
fs.writeFileSync(out, JSON.stringify(results, null, 0));
console.log(`wrote ${cases} derivations to ${out}`);
