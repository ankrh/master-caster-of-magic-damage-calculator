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
// A case states a **permanent identity** as well as a control set and a unit shape. It did not
// until 2026-08-25: every case was `unitType: 'normal'` with an empty base race, so a gate
// comparing live race to a *mundane* race and every hero branch measured 0 differences however wrong
// they were. F187 moved atk 5->7, def 7->8 and res 4->6 in three versions while this tool
// reported 0 of 15525; a hand probe caught it. `IDENTITIES` and `ROAMING_IDENTITIES` below say
// exactly what the widened list reaches and what it still does not.
//
// Each value in the written map is an **object**, so compare two runs structurally — a `!==` over
// the parsed maps compares references and reports every case as differing.
//
// `enumerateCases(context)` is the case list on its own, exported so a second measurement over the
// same control surface reuses it instead of restating the generator — the seeded draw order is
// what makes two runs comparable, and a copy of it would drift.
//
// **What a 0 here does not cover.** The list is every control *solo* plus seeded 12-control draws,
// so two specific controls are almost never on together. A change that reorders two steps inside
// one phase can therefore read 0 and still move a number: F204 reordered the Warlord `training`
// group and this tool reported 0 of 52440, while a probe holding every training control on at once
// found `abilities.poison` moving in 96 cases. For an intra-phase reordering, saturate the
// controls the reordered steps gate on and diff that instead.
//
// Cost: 52575 derivations, ~26s, up from 15525 and ~10s before the identity axis. It is a
// diagnostic run per item, not part of any suite.

'use strict';

const fs = require('fs');
const vm = require('vm');
const { loadCalculatorContext } = require('./calculator_sources');
const { modernRecordForSharedSlot } = require('./unit_checks/assertions');

let ownContext = null;
function defaultContext() {
  if (!ownContext) ownContext = loadCalculatorContext();
  return ownContext;
}
// The sources declare with `const`, which never lands on the vm global, so every calculator
// binding is read by evaluating its name in the context.
const readFrom = (context, expression) => vm.runInContext(expression, context);

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
  // `chaosSurge` was the one matrix global this list never varied, so every gate reading it
  // measured 0 whatever it did — which is how F178's defect passed this tool at 0 differences.
  // An env carries only top-level inputs, because the combination pass below overwrites
  // `over.abilities`; the conversions this global's gate reads come from that pass (F178).
  { name: 'chaos-surge', over: { chaosSurge: 1 } },
];

// The permanent identity a case states. `initializeUnitIdentity` (`stats_identity.js`) reads
// `input.identity` in preference to the legacy `unitType`/`race` tokens, so a row that names one
// states the whole base record: hero flag, base race, base Fantastic, special unit, and the two
// source ids.
//
// `custom` is the record every case of this tool carried before the axis existed — a raceless,
// non-hero, non-Fantastic custom unit — reproduced through the same legacy tokens, so its names and
// digests are unchanged and an old run still diffs against a new one on those keys. The other two
// rows are the axis F187 showed was missing. They cross the whole list: every solo control, every
// environment, and the *same* seeded combination draws, because the generator is reseeded per
// identity so the three rows differ in the base record and nothing else.
const IDENTITIES = [
  { name: 'custom', over: {} },
  { name: 'race', identity: { isHero: false, baseRace: 'High Men', baseFantastic: false } },
  { name: 'hero', identity: { isHero: true, baseRace: 'High Men', baseFantastic: false } },
];

// A full cross-product over every identity worth stating would cost more than this tool can be
// run interactively for, so the rest of the identity surface is reached through combinations
// only: one extra seeded block per version, drawing its identity from this pool as well as its
// shape, environment and controls. What that buys and what it does not:
//
//   REACHED, in combination cases only — the six race-gated Warlord building grants other than
//   Sancta Basilica (`altarOfTheMoon` needs a Gnoll, `dragonMound` a Draconian, ...), a permanent
//   Fantastic record, a Fantastic hero, every `SPECIAL_UNIT_DEFS` key, and the six templates the
//   identity conversions branch on.
//   NOT REACHED — those extra identities against a *solo* control or a bare environment, so a
//   defect that needs one of them plus exactly one control is only found if the draw happens to
//   pair them. NOT REACHED at all — the unit *name*, which the unit-specific building branches
//   test with `endsWith` (Hunters, Witchdoctors, Holy Mother, Legionary); roster-selected units;
//   and the defending side's identity, since every case derives side `a`.
const ROAMING_IDENTITIES = [
  ...IDENTITIES,
  ...['Gnoll', 'Hawkmen', 'Draconian', 'Orc', 'Goblin', 'Rakhshasa'].map(baseRace => ({
    name: `race:${baseRace}`, identity: { isHero: false, baseRace, baseFantastic: false },
  })),
  { name: 'baseFantastic',
    identity: { isHero: false, baseRace: 'Chaos', baseFantastic: true } },
  { name: 'hero-fantastic',
    identity: { isHero: true, baseRace: 'Death', baseFantastic: true } },
  // `specialUnit` is version-scoped in the UI but not at the identity boundary, so each key is
  // stated in every version and inert where that version has no block for it.
  ...['golem', 'chosen', 'zombies', 'catapult', 'nightGoblins'].map(specialUnit => ({
    name: `special:${specialUnit}`,
    identity: { isHero: false, baseRace: 'High Men', baseFantastic: false, specialUnit },
  })),
  // The template ids the identity conversions branch on: 37 Catapult, 54 and 113 the CoM 1 and
  // base-CoM2 summon branches, 34 Chosen, 81 Golem, 174 Zombies.
  ...[34, 37, 54, 81, 113, 174].map(templateId => ({
    name: `template:${templateId}`,
    identity: { isHero: false, baseRace: 'High Men', baseFantastic: false, templateId },
  })),
  // The Marionette channeler conversion is the one gated on a hero *type* rather than the flag.
  { name: 'heroType:48',
    identity: { isHero: true, baseRace: 'High Men', baseFantastic: false, heroTypeId: 48 } },
];

// Cases in the roaming block, per version. Sized so each pool row is drawn about sixty times per
// version; raising it is the cheapest way to deepen identity coverage if a defect needs it.
const ROAMING_CASES = 1200;

// The base record a row states, resolved for the version under test.
function identityOver(identity, version) {
  if (!identity.identity) return identity.over || {};
  return { identity: { templateId: null, heroTypeId: null, specialUnit: 'none',
    ...identity.identity, version } };
}

// A CoM2/Warlord case states the record that version has: the four named channels, with the
// shared slot beside them as the card's projection (`unit_checks/assertions.js`,
// `modernRecordForSharedSlot`). A case that already names `modernAttacks` keeps its own.
function baseInput(context, version, over) {
  const typed = over.rtbType === MAGICAL_RANGED
    ? { ...over, rtbType: version.startsWith('com2') ? 'magic' : 'magic_s' } : over;
  const resolved = version.startsWith('com2') && !typed.modernAttacks
    ? { ...typed, modernAttacks: modernRecordForSharedSlot(context, typed.rtbType, typed.rtb) }
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
    chaosSurge: 0,
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

// The case list, in the order both the digest and any other measurement over the same control
// surface must walk it. Yields `{ name, version, input }`.
function* enumerateCases(context = defaultContext()) {
  const versions = readFrom(context, 'ENGINE_VERSIONS');
  const abilitySpecs = controlSpecs(readFrom(context, 'ABILITY_DEFS'));
  const enchantSpecs = controlSpecs(readFrom(context, 'ENCHANTMENT_DEFS'));
  // Both lists write the one map, so a shared `calcKey` picked twice keeps the later value
  // rather than being counted in two places, which is what the UI's merge does for the controls
  // that collapse onto one key. The draw order — six abilities, then six enchantments, each a
  // spec index followed by a value index — is what makes two runs comparable, so it is one
  // function rather than a copy in each combination block.
  const drawControls = (random) => {
    const abilities = {};
    const pick = 6;
    for (let n = 0; n < pick; n += 1) {
      const spec = abilitySpecs[Math.floor(random() * abilitySpecs.length)];
      setControl(abilities, spec, spec.values[Math.floor(random() * spec.values.length)]);
    }
    for (let n = 0; n < pick; n += 1) {
      const spec = enchantSpecs[Math.floor(random() * enchantSpecs.length)];
      setControl(abilities, spec, spec.values[Math.floor(random() * spec.values.length)]);
    }
    return abilities;
  };
  for (const version of versions) {
    for (const row of IDENTITIES) {
      const idOver = identityOver(row, version);
      // `custom` carries no tag, so the case names and digests this tool produced before the
      // identity axis existed are unchanged and still diff against a new run.
      const tag = row.name === 'custom' ? '' : `|id:${row.name}`;
      // 1. Every control on its own, over every shape, on the plain environment.
      for (const [kind, specs] of [['abil', abilitySpecs], ['ench', enchantSpecs]]) {
        for (const spec of specs) {
          for (const value of spec.values) {
            for (const shape of SHAPES) {
              const over = { ...shape.over, ...idOver };
              over.abilities = {};
              setControl(over.abilities, spec, value);
              yield { name: `${version}|solo|${kind}|${spec.key}=${value}|${shape.name}${tag}`,
                version, input: baseInput(context, version, over) };
            }
          }
        }
      }
      // 2. Every environment against every shape, no controls.
      for (const env of ENVS) {
        for (const shape of SHAPES) {
          yield { name: `${version}|env|${env.name}|${shape.name}${tag}`, version,
            input: baseInput(context, version, { ...shape.over, ...env.over, ...idOver }) };
        }
      }
      // 3. Seeded combinations: several controls at once, so interaction order is exercised.
      // Reseeded per identity, so the three rows draw the same shape, environment and controls
      // and differ in the base record alone — a controlled comparison rather than three
      // unrelated samples, and `custom|combo|N` is the case that name always meant.
      const random = rng(0x5EED);
      for (let i = 0; i < 900; i += 1) {
        const shape = SHAPES[Math.floor(random() * SHAPES.length)];
        const env = ENVS[Math.floor(random() * ENVS.length)];
        const abilities = drawControls(random);
        yield { name: `${version}|combo|${i}${tag}`, version,
          input: baseInput(context, version,
            { ...shape.over, ...env.over, ...idOver, abilities }) };
      }
    }
    // 4. The roaming-identity block: the rest of the identity surface, in combination only.
    // Its own seed, because it draws an identity between the environment and the controls.
    const roaming = rng(0x1DEA);
    for (let i = 0; i < ROAMING_CASES; i += 1) {
      const shape = SHAPES[Math.floor(roaming() * SHAPES.length)];
      const env = ENVS[Math.floor(roaming() * ENVS.length)];
      const row = ROAMING_IDENTITIES[Math.floor(roaming() * ROAMING_IDENTITIES.length)];
      const abilities = drawControls(roaming);
      yield { name: `${version}|combo-id|${i}|${row.name}`, version,
        input: baseInput(context, version,
          { ...shape.over, ...env.over, ...identityOver(row, version), abilities }) };
    }
  }
}

function run() {
  const context = defaultContext();
  const deriveUnitStats = readFrom(context, 'deriveUnitStats');
  const results = {};
  let cases = 0;
  for (const testCase of enumerateCases(context)) {
    cases += 1;
    try {
      results[testCase.name] = digest(deriveUnitStats(testCase.input));
    } catch (err) {
      results[testCase.name] = { __throw: String(err && err.message) };
    }
  }
  return { cases, results };
}

function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node tools/derivation_equivalence.js <out.json>');
    process.exit(2);
  }
  const { cases, results } = run();
  fs.writeFileSync(out, JSON.stringify(results, null, 0));
  console.log(`wrote ${cases} derivations to ${out}`);
}

if (require.main === module) main();

module.exports = { enumerateCases, digest, run, IDENTITIES, ROAMING_IDENTITIES };
