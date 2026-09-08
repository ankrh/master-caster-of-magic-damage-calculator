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
// **What the run says about itself.** Every run prints, and writes into the digest under
// `__scope`, the input surface it actually ranged over: which top-level fields it stated more than
// one value for, which it held, which boundary fields it states nowhere and why, and which record
// ability keys no control can reach (F259.1). Two guards stop a zero the corpus cannot support —
// `assertCorpusCanSpeak` on the refusal share, `assertBoundaryFieldsAccountedFor` on a boundary
// field that is neither varied nor declared unvaried (F259.2).
//
// Cost: ~63000 derivations, ~32s. It is a diagnostic run per item, not part of any suite.

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
// `destiny`, ...), and `abilityUiDefs()` (`ability_gating.js`) is what establishes that the
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

// The Outlander reform spells are owned by an Outlander wizard: every read of one of these
// research states carries an explicit `outlanderWizard` term (`deriveOutlanderReformRecord`'s
// `research` helper and the `reform` fields it feeds, `stats_identity.js`, F244.3d), so a case
// that sets one alone exercises nothing. Pair them.
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

// The permanent identity a case states. `unitIdentityRecordSeed` (`stats_identity.js`) reads
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

// --- The top-level boundary fields (F259.2) ---
//
// F259.1 measured what the four blocks above never state: seventeen fields the card path hands
// `deriveUnitStats` and this run did not, plus six it stated at one value. This is the answer to
// that measurement, and it is a decision per field, in one of three shapes:
//
//   `values`      the run states these as well as the default, so the field is varied;
//   `notVaried`   the run states the field nowhere, and this says why;
//   `heldReason`  the run states the field at one value on purpose, and this says why.
//
// A boundary field that is on none of them halts the run, and so does a *held* top-level field
// with no stated reason (`assertBoundaryFieldsAccountedFor`) — "stated at one value and nobody
// said why" is the state F259.1 had to measure by hand, and it cannot be reached again in silence.
//
// `versions` is not stated here. A field is stated only in the versions whose boundary emits it,
// read from `boundaryFieldVersions`, because the To-Hit halves are two record shapes and stating
// the other family's field is a halt (`stats.js`, `foreignHitInputs`). That is the same
// version-scoping the control list does *not* do, which is why 20% of this corpus refuses.
//
// The values are the non-default statement: the base input already carries the default, so each
// entry adds the second (and where a gate has more, the further) value.
const BOUNDARY_FIELD_PLAN = {
  // Read at `stats.js` `enemyEyeOfHeaven` — Warlord's gaze zeroing. The field F259's body names.
  enemyEyeOfHeaven: { values: [true] },
  // Read at `stats.js` `hurricaneActive` and `poxHostActive`.
  hurricane: { values: [true] },
  poxHost: { values: [true] },
  // Read as `input.generic`, and carried into the result the digest compares.
  generic: { values: [true] },
  // The starting healing state. Two of these are clamped to the damage they are taken out of
  // (`stats.js`: `Math.min(totalDamage, ...)`), so a case stating one against the default `dmg` 0
  // is inert — measured, not assumed: it moved 0 of 30 cases before `with` existed. `with` is the
  // rest of the statement a field needs before it can reach a reader.
  dmg: { values: [5] },
  irrecoverableDamage: { values: [2], with: { dmg: 5 } },
  undeadDamage: { values: [2], with: { dmg: 5 } },
  baseBonusHp: { values: [4] },
  noHealing: { values: [true] },
  // The two To-Hit record shapes. Version-scoped by the boundary, as above.
  toHitMod: { values: [2] },
  toHitRtbMod: { values: [2] },
  toBlkMod: { values: [2] },
  hitChance: { values: [20] },
  hitMelee: { values: [10] },
  hitRanged: { values: [10] },
  hitThrown: { values: [10] },
  hitBreath: { values: [10] },
  // The side the case derives. It is an arithmetic gate, not just a label: `distancePenaltyFor`
  // returns 0 for any side but `a` (`stats.js`), so side `b` loses the ranged distance penalty.
  // Its companions are what that gate also reads — a bare case moved 0 of 30 and read as inert,
  // which is how this field nearly entered the plan as "held, reason: names the side in halt
  // messages" (GPT review, finding 1).
  prefix: { values: ['b'], with: { rangedCheck: true, rangedDist: 3 } },
  // The unit name, whose values are read out of the source rather than listed (see
  // `nameGateValues`). Filled in below.
  name: { values: null },
  // The legacy identity token. Not a boundary field at all — `cardStateToDerivationInput` states
  // `identity`, whose seven sub-fields this run does vary — and it survives only so the case names
  // and digests from before the identity axis still diff (see `IDENTITIES`).
  unitType: { heldReason: 'superseded by the `identity` record, which is what the boundary states '
    + 'and what the identity axis varies; the token is kept so pre-2026-08-25 digests still diff.' },
  // Declared unvaried, with the reason. Stating a field no reader takes would be coverage the run
  // does not have — the `chaosChannels` pathology this same scope block reports (F182).
  wallOfFire: { notVaried: 'no `deriveUnitStats` read exists: `combat.js` takes it as an attack '
    + 'option (`opts.wallOfFire`), and this digest ranges over the stat derivation only. A zero '
    + 'here says nothing about Wall of Fire, and stating the field would not change that.' },
};

// The two ability halves the boundary states instead of a merged map (F252.1). They are not in the
// plan above because they are not a value to vary but a *shape*: the `halves` blocks below state
// them, and `baseInput` drops `abilities` when they do, because stating both halts.
const ABILITY_HALF_FIELDS = ['innateAbilities', 'markedAbilities'];

// The unit names the derivation branches on, read out of `Calculator/stats.js` rather than listed:
// every gate is `unitName.endsWith('<name>')`, and a hand list would silently stop covering a gate
// added later. The roaming block's own comment records the name axis as NOT REACHED at all, so
// this is where it enters.
// Every call is found first, then read: a call this reader cannot parse is a halt rather than a
// gate it skips while the four it does parse keep the run looking healthy (GPT review, finding 3).
// Both quote styles and whitespace inside the call are read; a name carrying an escaped quote, or
// any non-literal argument, is refused rather than guessed at. Separate from `nameGateValues` so
// the check can feed it a source it wrote, which the real file cannot be.
function parseNameGateCalls(source) {
  const calls = [...source.matchAll(/unitName\s*\.\s*endsWith\s*\(([^)]*)\)/g)];
  const names = [];
  for (const call of calls) {
    const literal = /^\s*'([^']*)'\s*$/.exec(call[1])
      || /^\s*"([^"]*)"\s*$/.exec(call[1]);
    if (!literal) {
      throw new Error('derivation_equivalence: Calculator/stats.js gates on the unit name with '
        + `\`unitName.endsWith(${call[1].trim()})\`, which this reader cannot read as a string `
        + 'literal, so the name axis would silently not cover it. Extend `nameGateValues` to that '
        + 'form rather than leaving the gate uncovered.');
    }
    names.push(literal[1]);
  }
  return [...new Set(names)].sort();
}

let nameGateCache = null;
function nameGateValues() {
  if (nameGateCache) return nameGateCache;
  const source = fs.readFileSync(
    require('path').join(__dirname, '..', 'Calculator', 'stats.js'), 'utf8');
  const unique = parseNameGateCalls(source);
  if (!unique.length) {
    throw new Error('derivation_equivalence: no `unitName.endsWith(...)` gate is in '
      + 'Calculator/stats.js, so the name axis has nothing to range over. Either the gates moved '
      + 'or this reader did; a run that quietly states no name is what F259 exists to end.');
  }
  nameGateCache = unique;
  return unique;
}

// What each name gate also needs before it can fire: the race the block compares and the control
// that opens it. Coverage, not denominator — a name paired with the wrong race simply exercises
// the `false` arm — but an *unpaired* name halts, so a gate added to `stats.js` is a halt here
// rather than a name stated against a race that can never admit it.
const NAME_GATE_PAIRINGS = {
  Hunters: { baseRace: 'Gnoll', control: 'altarOfTheMoon' },
  Witchdoctors: { baseRace: 'Gnoll', control: 'altarOfTheMoon' },
  'Holy Mother': { baseRace: 'Hawkmen', control: 'altarOfTheSun' },
  Legionary: { baseRace: 'Orc', control: 'ludusAgoge' },
  Rocs: { baseRace: 'Halfling', control: 'alumniOfAcademy' },
};

// Cases in the two seeded blocks the boundary axis adds, per version.
const BOUNDARY_COMBO_CASES = 900;
const HALVES_COMBO_CASES = 600;

// A value as a case name spells it.
function valueTag(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

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
    // The To-Hit record the version has, and only that one — the same split
    // `cardStateToDerivationInput` makes. Stating the other family's fields was harmless only
    // because they were zero; a case that varies them has to be in the right family or it halts
    // (`stats.js`, `foreignHitInputs`).
    ...(version.startsWith('com2')
      ? { hitChance: 0, hitMelee: 0, hitRanged: 0, hitThrown: 0, hitBreath: 0 }
      : { toHitMod: 0, toHitRtbMod: 0 }),
    toBlkMod: 0,
    // The boundary fields blocks 5 and 6 vary (F259.2), at the value the default card states.
    // They are defaulted here rather than left absent so the scope block's varied/held split is
    // honest: a field only the boundary block mentions would otherwise be reported as *held* at
    // the one value that block gave it, when in fact every other case states nothing at all.
    name: '',
    generic: false,
    enemyEyeOfHeaven: false,
    hurricane: false,
    poxHost: false,
    irrecoverableDamage: 0,
    undeadDamage: 0,
    baseBonusHp: 0,
    noHealing: false,
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

// The values the plan states for one field. `name` resolves from the source-read gate list, so the
// plan carries no copy of it.
function boundaryPlanValues(field) {
  const entry = BOUNDARY_FIELD_PLAN[field];
  if (!entry || entry.notVaried || entry.heldReason) return [];
  return field === 'name' ? nameGateValues() : entry.values;
}

// The rest of the statement a value needs before a reader can take it — `dmg` for the two damage
// categories clamped to it. Empty for every field that reads on its own.
function boundaryPlanCompanions(field) {
  return (BOUNDARY_FIELD_PLAN[field] || {}).with || {};
}

// One case's input, in the shape the card boundary uses for abilities: the two halves rather than
// the merged map. `deriveUnitStats` halts on an input stating both, so the merged default the base
// input carries is dropped here (`stats.js`, `statesHalves`).
function halvesInput(context, version, over) {
  const input = baseInput(context, version, over);
  if (ABILITY_HALF_FIELDS.some(field => input[field] !== undefined)) delete input.abilities;
  return input;
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
  // The shipped boundary, per version: which top-level fields exist, and where. Blocks 5 and 6
  // state a field only in the versions that carry it (F259.2).
  const boundary = boundaryFieldVersions(context);
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
    // 5. The boundary block (F259.2): the top-level fields blocks 1–4 never state, or state at one
    // value. Each is stated in the versions whose boundary emits it, so this axis adds no
    // version-scope refusals — unlike the control list, which states every control in every
    // version and is where the corpus's refusals come from.
    const boundaryFields = [...boundary.keys()].filter(field => boundaryPlanValues(field).length);
    for (const field of boundaryFields) {
      if (!boundary.get(field).includes(version)) continue;
      for (const value of boundaryPlanValues(field)) {
        // A name gate needs the race and the control its block reads, or the case exercises the
        // false arm only. Every other field is read on its own.
        const pairing = field === 'name' ? NAME_GATE_PAIRINGS[value] : null;
        if (field === 'name' && !pairing) {
          throw new Error(`derivation_equivalence: Calculator/stats.js gates on the unit name `
            + `${JSON.stringify(value)} and NAME_GATE_PAIRINGS says nothing about which race and `
            + 'control open that block, so a case stating the name would exercise its false arm '
            + 'only. Pair it rather than letting the name axis look covered.');
        }
        // A paired case states the race its gate reads, so the identity is the pairing's and the
        // row loop would emit the same input three times under three labels, one of them
        // `id:hero` on a non-hero (GPT review, finding 4).
        const rows = pairing
          ? [{ name: `race:${pairing.baseRace}`,
            identity: { isHero: false, baseRace: pairing.baseRace, baseFantastic: false } }]
          : IDENTITIES;
        for (const row of rows) {
          for (const shape of [SHAPES[0], SHAPES[SHAPES.length - 2]]) {
            const over = { ...shape.over, ...identityOver(row, version),
              ...boundaryPlanCompanions(field), [field]: value };
            over.abilities = pairing ? { [pairing.control]: true } : {};
            yield { name: `${version}|bnd|${field}=${valueTag(value)}|${shape.name}|id:${row.name}`,
              version, input: baseInput(context, version, over) };
          }
        }
      }
    }
    // 6. The boundary fields against everything else: its own seed, drawing a shape, an
    // environment, a roaming identity, a control set, and a value for **every** planned field the
    // version's boundary carries. This is where a boundary field meets a control, which the block
    // above holds still on purpose.
    const bnd = rng(0xB0DE);
    // What the input carries before a case states anything, so a companion value knows whether the
    // draw has already spoken for its field.
    const baseline = baseInput(context, version, {});
    for (let i = 0; i < BOUNDARY_COMBO_CASES; i += 1) {
      const shape = SHAPES[Math.floor(bnd() * SHAPES.length)];
      const env = ENVS[Math.floor(bnd() * ENVS.length)];
      const row = ROAMING_IDENTITIES[Math.floor(bnd() * ROAMING_IDENTITIES.length)];
      const abilities = drawControls(bnd);
      const over = { ...shape.over, ...env.over, ...identityOver(row, version), abilities };
      for (const field of boundaryFields) {
        if (!boundary.get(field).includes(version)) continue;
        // The default is in the pool, so a field is off in about as many cases as it is on and
        // the block is not one saturated state repeated.
        const pool = [undefined, ...boundaryPlanValues(field)];
        const value = pool[Math.floor(bnd() * pool.length)];
        if (value === undefined) continue;
        // A companion is stated only where the field itself is, and never over a value this case
        // already drew for that companion.
        for (const [companion, companionValue] of Object.entries(boundaryPlanCompanions(field))) {
          if (over[companion] === undefined || over[companion] === baseline[companion]) {
            over[companion] = companionValue;
          }
        }
        over[field] = value;
      }
      yield { name: `${version}|bnd-combo|${i}|${row.name}`, version,
        input: baseInput(context, version, over) };
    }
    // 7. The ability boundary's own shape: `innateAbilities` and `markedAbilities` rather than the
    // merged `abilities` map (F252.1). Blocks 1–4 state the merged map, which `deriveUnitStats`
    // splits by def source — so the halves path itself, and any state where a half disagrees with
    // that split, was unreachable from here. The card-faithful half first: an ability control is
    // what the unit was built with, an enchantment control is what the card marked.
    for (const [kind, specs, half] of [['abil', abilitySpecs, 'innateAbilities'],
      ['ench', enchantSpecs, 'markedAbilities']]) {
      for (const spec of specs) {
        const value = spec.values[0];
        for (const row of [IDENTITIES[0], IDENTITIES[1]]) {
          const halves = { innateAbilities: {}, markedAbilities: {} };
          setControl(halves[half], spec, value);
          if (halves.markedAbilities.outlanderWizard !== undefined) {
            // The reform's owner is a state the unit has, not a cast on it.
            delete halves.markedAbilities.outlanderWizard;
            halves.innateAbilities.outlanderWizard = true;
          }
          yield { name: `${version}|halves|${kind}|${spec.key}=${value}|id:${row.name}`, version,
            input: halvesInput(context, version,
              { ...SHAPES[0].over, ...identityOver(row, version), ...halves }) };
        }
      }
    }
    // 8. The same control in the *other* half. The merged map cannot express this at all — its
    // split is a function of the def lists — and the halves are not symmetric: the provided /
    // received pair reaches its step through the marked half alone
    // (`ability_gating.js`, `receivedAbilityValues`).
    for (const [kind, specs, half] of [['abil', abilitySpecs, 'markedAbilities'],
      ['ench', enchantSpecs, 'innateAbilities']]) {
      for (const spec of specs) {
        const value = spec.values[0];
        const halves = { innateAbilities: {}, markedAbilities: {} };
        setControl(halves[half], spec, value);
        if (halves.markedAbilities.outlanderWizard !== undefined) {
          delete halves.markedAbilities.outlanderWizard;
          halves.innateAbilities.outlanderWizard = true;
        }
        yield { name: `${version}|halves-swap|${kind}|${spec.key}=${value}`, version,
          input: halvesInput(context, version,
            { ...SHAPES[0].over, ...halves }) };
      }
    }
    // 9. Several controls at once in the boundary's shape: six abilities into the half the unit
    // was built with, six enchantments into the half the card marked. The cross-half statement is
    // block 8's job and is deliberately not repeated here — a random split refuses in seven cases
    // of eight, because a marked key with no positioned cast step halts (F252's unfinished half),
    // and a block that is 87% refusals buys interaction coverage it cannot report.
    const split = rng(0x5A11);
    for (let i = 0; i < HALVES_COMBO_CASES; i += 1) {
      const shape = SHAPES[Math.floor(split() * SHAPES.length)];
      const env = ENVS[Math.floor(split() * ENVS.length)];
      const row = ROAMING_IDENTITIES[Math.floor(split() * ROAMING_IDENTITIES.length)];
      const halves = { innateAbilities: {}, markedAbilities: {} };
      for (const [specs, half] of [[abilitySpecs, 'innateAbilities'],
        [enchantSpecs, 'markedAbilities']]) {
        for (let n = 0; n < 6; n += 1) {
          const spec = specs[Math.floor(split() * specs.length)];
          setControl(halves[half], spec, spec.values[Math.floor(split() * spec.values.length)]);
        }
      }
      // `setControl`'s owner flag is a state the unit has, never a cast on it.
      if (halves.markedAbilities.outlanderWizard !== undefined) {
        delete halves.markedAbilities.outlanderWizard;
        halves.innateAbilities.outlanderWizard = true;
      }
      yield { name: `${version}|halves-combo|${i}|${row.name}`, version,
        input: halvesInput(context, version,
          { ...shape.over, ...env.over, ...identityOver(row, version), ...halves }) };
    }
  }
}

// --- What this run varies, and what it holds still (F259.1) ---
//
// A zero here means "none of the cases I enumerated moved", and those cases are a slice of the
// derivation's input surface, never the whole of it. Reading a zero as "nothing moved" is how
// F204's intra-phase reordering, F244.3i's card/record disagreement and F253.2's control-free
// record keys each passed this tool at 0 while a hand probe found the movement. So every run
// states its own scope, and the statement is **derived from the cases the run actually
// enumerates** — a hand-kept list drifts, and a drifted scope note is worse than none.
//
// The denominator is the shipped input boundary: `cardStateToDerivationInput` (`card_state.js`)
// is the object the page hands `deriveUnitStats`, so its own field list is what a field can be
// missing *from*. It is read per version, because the two engine families state different
// To-Hit records.

const SCOPE_SAMPLE_LIMIT = 8;
const SCOPE_DISTINCT_CAP = 2048;

// The refusal share this corpus may carry before a run is refused outright. A case whose
// derivation throws digests to its message, which is a constant: it compares equal to itself on
// any tree, so a corpus that is throwing everywhere reports 0 differences whatever changed.
// F267.4's probe did exactly that and read 0 three times running. The budget is well above the
// share this corpus carries today (10,500 of 52,440, 20.0% on 2026-09-08 — every one of them
// F253.1's version-scope refusal, because the case list states each control in every version)
// and well below a collapse, so a jump toward a constant corpus halts instead of reporting a
// zero. `tools/derivation_equivalence_diff.js` applies the same budget to the files it reads.
const REFUSAL_SHARE_BUDGET = 0.35;

// The fields the shipped boundary produces, per version: `field -> [versions]`. Every binding is
// read out of the loaded sources, so a rename halts the run rather than shrinking the denominator
// in silence.
//
// This is the **default card's** projection, side a, one per version — the boundary's shape is
// conditional on the version and could in principle be conditional on the card too, so a field
// only a roster selection, a non-default state or side b emits would not appear here and would go
// unlisted rather than being reported as unstated. Nothing enforces that today, and F259.2's halt
// inherits the limit exactly: it refuses a field this census found and the cases do not state, and
// it cannot refuse a field the census never found. The review that measured it added a side-`b`-only
// field and watched both the census and the halt pass.
function boundaryFieldVersions(context) {
  const versions = readFrom(context, 'ENGINE_VERSIONS');
  const defaultCardState = readFrom(context, 'presetDefaultCardState');
  const globalsFor = readFrom(context, 'presetGlobals');
  const project = readFrom(context, 'cardStateToDerivationInput');
  for (const [name, binding] of [['presetDefaultCardState', defaultCardState],
    ['presetGlobals', globalsFor], ['cardStateToDerivationInput', project]]) {
    if (typeof binding !== 'function') {
      throw new Error(`derivation_equivalence: the loaded sources define no ${name}, so this run `
        + 'cannot say which input fields it fails to state. The manifest in index.html is the '
        + 'file list the realm was built from.');
    }
  }
  const fields = new Map();
  for (const version of versions) {
    const states = { a: defaultCardState('a', version), b: defaultCardState('b', version) };
    const input = project(states.a, globalsFor({}, version, states));
    for (const field of Object.keys(input)) {
      if (!fields.has(field)) fields.set(field, []);
      fields.get(field).push(version);
    }
  }
  return fields;
}

// A value as the observation counts it: object keys sorted, so two maps stating the same thing
// are one value however they were built, and `undefined` kept apart from `null`, because a field
// stated as null is a statement and a field not stated at all is not.
function canonicalValue(value) {
  if (value === undefined) return '__undefined';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalValue).join(',')}]`;
  return `{${Object.keys(value).sort()
    .map(key => `${JSON.stringify(key)}:${canonicalValue(value[key])}`).join(',')}}`;
}

// One observed field: how many distinct values the run stated for it, and a few of them. The
// distinct set is capped, because a whole-map field (`abilities`, `identity`) takes a different
// value in nearly every case and counting it exactly would cost more memory than the digest; past
// the cap the count is reported as a floor rather than silently becoming an occurrence count.
//
// What is counted is the **raw value each case stated**, before the derivation reads it. A field
// counted here as varied is a field this run passed more than one value for — not a claim that
// anything consumed it, and not a claim that its gate was exercised. `chaosChannels` is the
// standing example: two values are stated and no reader takes the top-level field at all (F182).
function observeInto(map, key, value) {
  let seen = map.get(key);
  if (!seen) {
    seen = { values: new Set(), samples: [], overflow: false };
    map.set(key, seen);
  }
  if (seen.overflow) return;
  const rendered = canonicalValue(value);
  if (seen.values.has(rendered)) return;
  seen.values.add(rendered);
  if (seen.samples.length < SCOPE_SAMPLE_LIMIT) seen.samples.push(rendered);
  if (seen.values.size >= SCOPE_DISTINCT_CAP) seen.overflow = true;
}

// The observation as the scope block carries it: a count, whether that count is a floor, and the
// first few values.
function observedRow(field, seen) {
  return { field, distinct: seen.values.size, atLeast: seen.overflow, samples: seen.samples };
}

// The collector every case passes through. Nothing here is optional or flagged on: the run has no
// path that produces a digest without also producing the statement of what it ranged over.
function scopeCollector(context) {
  const topLevel = new Map();
  const identity = new Map();
  const abilityValues = new Map();
  const versions = new Set();
  const perVersionCases = new Map();
  const refusalsByVersion = new Map();
  const refusalMessages = new Set();
  let cases = 0;
  let refusals = 0;
  return {
    case(testCase) {
      cases += 1;
      versions.add(testCase.version);
      perVersionCases.set(testCase.version, (perVersionCases.get(testCase.version) || 0) + 1);
      const input = testCase.input;
      for (const field of Object.keys(input)) observeInto(topLevel, field, input[field]);
      if (input.identity && typeof input.identity === 'object') {
        for (const field of Object.keys(input.identity)) {
          observeInto(identity, field, input.identity[field]);
        }
      }
      // The ability map is the axis this tool is richest in and the one whose *absences* have
      // bitten hardest, so the keys it states are collected by name rather than as one blob.
      // This reads the merged `abilities` map the case list builds; the shipped boundary splits
      // it into `innateAbilities` and `markedAbilities` (F252.1), and a case list that moves to
      // the two halves has to move this read with it or the key census silently empties.
      // Both shapes are read, because the case list states each of them in its own blocks: the
      // merged map in blocks 1–4 and the two boundary halves in blocks 7–9 (F259.2). Reading the
      // merged map alone would have emptied this census the moment a block moved to the halves.
      for (const field of ['abilities', ...ABILITY_HALF_FIELDS]) {
        const map = input[field];
        if (!map || typeof map !== 'object') continue;
        for (const key of Object.keys(map)) observeInto(abilityValues, key, map[key]);
      }
    },
    refusal(version, message) {
      refusals += 1;
      refusalsByVersion.set(version, (refusalsByVersion.get(version) || 0) + 1);
      refusalMessages.add(message);
    },
    report() {
      const boundary = boundaryFieldVersions(context);
      const stated = new Set(topLevel.keys());
      const varied = [];
      const held = [];
      for (const [field, seen] of [...topLevel.entries()].sort()) {
        if (seen.values.size > 1) {
          varied.push(observedRow(field, seen));
          continue;
        }
        // A field stated at one value carries the reason it is held, or it is unaccounted for and
        // `assertBoundaryFieldsAccountedFor` refuses the run (F259.2).
        held.push({ ...observedRow(field, seen),
          reason: (BOUNDARY_FIELD_PLAN[field] || {}).heldReason || null });
      }
      const blind = [...boundary.entries()]
        .filter(([field]) => !stated.has(field))
        .map(([field, inVersions]) => ({ field, versions: inVersions }))
        .sort((x, y) => (x.field < y.field ? -1 : 1));
      const offBoundary = [...stated].filter(field => !boundary.has(field)).sort();
      const identityRows = [...identity.entries()].sort()
        .map(([field, seen]) => observedRow(field, seen));
      // The record's own ability keys, from the origin table rather than from the control lists:
      // a key with no control is a key this tool can never state (F253.2 — all 21 of its refusal
      // keys were invisible here, and it had to narrow a different row to prove the tool bites).
      const originKeys = Object.keys(readFrom(context, 'ABILITY_KEY_ORIGINS'));
      const abilityKeysStated = [...abilityValues.keys()].sort();
      const abilityKeysNeverStated = originKeys.filter(key => !abilityValues.has(key)).sort();
      const comparable = cases - refusals;
      return {
        tool: 'derivation_equivalence',
        scopeStatement: 'F259.1',
        // Read the counts below as *what this run stated*, never as what it exercised. The
        // qualification travels in the digest because the printed text does not.
        reading: 'Each count is of raw input values this run stated, before any reader saw them. '
          + 'A field reported as varied was passed more than one value; that is not a claim that '
          + 'a reader consumed it or that its gate was exercised, and a field reported as held is '
          + 'a field whose change this run never tests. The boundary list is the default card\'s '
          + 'projection per version (side a).',
        cases,
        comparable,
        refusals,
        distinctRefusalMessages: refusalMessages.size,
        refusalShare: cases ? Number((refusals / cases).toFixed(4)) : 0,
        refusalShareBudget: REFUSAL_SHARE_BUDGET,
        versions: [...versions],
        casesPerVersion: Object.fromEntries(perVersionCases),
        refusalsPerVersion: Object.fromEntries(refusalsByVersion),
        topLevelVaried: varied,
        topLevelHeld: held,
        boundaryFieldsNeverStated: blind,
        // The half of the blind list that is a decision rather than an oversight (F259.2): the
        // field is not stated, and the plan says why. `assertBoundaryFieldsAccountedFor` refuses a
        // blind field that is on neither list.
        boundaryFieldsDeclaredUnvaried: blind
          .filter(row => (BOUNDARY_FIELD_PLAN[row.field] || {}).notVaried)
          .map(row => ({ field: row.field, versions: row.versions,
            reason: BOUNDARY_FIELD_PLAN[row.field].notVaried })),
        statedFieldsNotAtBoundary: offBoundary,
        identityVaried: identityRows.filter(row => row.distinct > 1),
        identityHeld: identityRows.filter(row => row.distinct <= 1),
        abilityKeysStated,
        abilityKeysNeverStated,
        abilityKeyOriginRows: originKeys.length,
        digestExcludes: [...IDENTITY_KEYS].sort(),
      };
    },
  };
}

function sampleText(seen) {
  return seen.samples.map(s => (s.length > 60 ? `${s.slice(0, 57)}...` : s)).join(' ')
    + (seen.samples.length < seen.distinct ? ' ...' : '');
}

// The human half of the same object. Printed on every run, after the line that says how many
// derivations were written, so a report quoting the count quotes the scope with it.
function formatScope(scope) {
  const lines = [];
  lines.push('scope of this run (F259.1) — a zero from this digest ranges over exactly this:');
  lines.push(`  cases: ${scope.cases} — ${scope.comparable} comparable, ${scope.refusals} `
    + `refusing (${(scope.refusalShare * 100).toFixed(1)}%, `
    + `${scope.distinctRefusalMessages} distinct messages). A refusing case digests to its `
    + 'message, which is a constant: it cannot show a value moving.');
  lines.push(`  versions varied (${scope.versions.length}): ${scope.versions.join(', ')}`);
  lines.push(`  top-level input fields this run STATED MORE THAN ONE VALUE FOR `
    + `(${scope.topLevelVaried.length}) — stated, not necessarily consumed or gate-exercised:`);
  for (const row of scope.topLevelVaried) {
    lines.push(`    ${row.field} — ${row.atLeast ? 'at least ' : ''}${row.distinct} distinct: `
      + sampleText(row));
  }
  lines.push(`  top-level input fields HELD at one value (${scope.topLevelHeld.length}) — `
    + 'this run never tests changing these, so a zero says nothing about a change that reads one. '
    + 'Each carries the reason it is held; a held field with none halts the run (F259.2):');
  for (const row of scope.topLevelHeld) {
    lines.push(`    ${row.field} = ${sampleText(row)} — ${row.reason || 'NO REASON STATED'}`);
  }
  lines.push(`  boundary fields this run NEVER states (${scope.boundaryFieldsNeverStated.length})`
    + ' — the card path hands `deriveUnitStats` these and this run does not, so a zero says'
    + ' nothing about them:');
  for (const row of scope.boundaryFieldsNeverStated) {
    lines.push(`    ${row.field} (boundary in ${row.versions.length} of `
      + `${scope.versions.length} versions)`);
  }
  lines.push('  of those, DECLARED unvaried with a reason '
    + `(${scope.boundaryFieldsDeclaredUnvaried.length}) — a field on neither list halts the run `
    + '(F259.2). That guarantee reaches only as far as the denominator: the boundary above is the '
    + 'DEFAULT card projected for side a, so a field only a roster selection, a non-default state '
    + 'or side b emits is not discovered here and is not covered by the halt:');
  for (const row of scope.boundaryFieldsDeclaredUnvaried) {
    lines.push(`    ${row.field}: ${row.reason}`);
  }
  lines.push('  fields this run states that the card boundary does not '
    + `(${scope.statedFieldsNotAtBoundary.length}) — a legacy input shape, so a case here is not `
    + 'a card the page can produce, and one of these may reach no reader at all (F182: stating '
    + `\`chaosChannels\` moves nothing in any version): `
    + `${scope.statedFieldsNotAtBoundary.join(', ') || 'none'}`);
  lines.push(`  identity sub-fields VARIED (${scope.identityVaried.length}): `
    + `${scope.identityVaried.map(r => `${r.field}[${r.atLeast ? '>=' : ''}${r.distinct}]`)
      .join(', ') || 'none'}`);
  lines.push(`  identity sub-fields HELD (${scope.identityHeld.length}): `
    + `${scope.identityHeld.map(r => `${r.field}=${sampleText(r)}`).join(', ') || 'none'}`);
  lines.push(`  ability map: ${scope.abilityKeysStated.length} keys stated; `
    + `${scope.abilityKeysNeverStated.length} of the ${scope.abilityKeyOriginRows} keys the origin `
    + 'table carries are never stated here (a record key with no control cannot be reached by '
    + 'this case list at all):');
  lines.push(`    never stated: ${scope.abilityKeysNeverStated.join(', ') || 'none'}`);
  lines.push(`  digest excludes (step identity, not arithmetic): ${scope.digestExcludes.join(', ')}`);
  return lines.join('\n');
}

// The census a digest supports on its own: a case that refused carries `__throw`, whatever its
// message says — an empty message is still a refusal, and testing the message for truthiness
// counted `throw new Error()` as a comparable case. The version is the case name's first field,
// which is how `enumerateCases` builds every name.
function isRefusal(entry) {
  return !!entry && typeof entry === 'object'
    && Object.prototype.hasOwnProperty.call(entry, '__throw');
}

function refusalCensus(cases) {
  const casesPerVersion = {};
  const refusalsPerVersion = {};
  const messages = new Set();
  let total = 0;
  let refusals = 0;
  for (const name of Object.keys(cases)) {
    const version = name.split('|')[0];
    total += 1;
    casesPerVersion[version] = (casesPerVersion[version] || 0) + 1;
    if (!refusalsPerVersion[version]) refusalsPerVersion[version] = 0;
    if (!isRefusal(cases[name])) continue;
    refusals += 1;
    refusalsPerVersion[version] += 1;
    messages.add(String(cases[name].__throw));
  }
  return {
    cases: total, refusals, comparable: total - refusals,
    distinctRefusalMessages: messages.size,
    versions: Object.keys(casesPerVersion), casesPerVersion, refusalsPerVersion,
  };
}

// The guard. A corpus that is mostly refusing is close to a constant, and a constant compares
// equal to any tree — so the run stops before it can hand anyone a zero. It is a halt rather than
// a warning because a warning printed above a "0 differing cases" line is exactly what the
// readers in this run's reports scrolled past.
function assertCorpusCanSpeak(scope, label = 'derivation_equivalence') {
  if (!scope.cases || !scope.versions.length) {
    throw new Error(`${label}: the corpus holds ${scope.cases || 0} cases in `
      + `${scope.versions.length} versions, so there is nothing for a zero to range over.`);
  }
  const emptyVersions = scope.versions.filter(version =>
    (scope.casesPerVersion[version] || 0) === (scope.refusalsPerVersion[version] || 0));
  if (emptyVersions.length) {
    throw new Error(`${label}: every case in `
      + `${emptyVersions.join(', ')} refuses, so that version's digest is a constant and would `
      + 'compare equal to any tree. Fix the corpus rather than reading its zero.');
  }
  // The exact ratio, not the rounded one the scope block reports: 7,001 of 20,000 rounds to the
  // budget and would have been admitted by it.
  const share = scope.refusals / scope.cases;
  if (share > REFUSAL_SHARE_BUDGET) {
    throw new Error(`${label}: ${scope.refusals} of ${scope.cases} cases `
      + `(${(share * 100).toFixed(1)}%) throw, above the `
      + `${(REFUSAL_SHARE_BUDGET * 100).toFixed(0)}% budget. A throwing case digests to its `
      + 'message and compares equal to itself on any tree, so this corpus cannot support a zero. '
      + `Distinct messages: ${scope.distinctRefusalMessages}.`);
  }
}

// The second guard (F259.2). A boundary field the run does not state is admissible — `wallOfFire`
// is one, because no `deriveUnitStats` read exists for it — but only as a stated decision. A field
// that is simply missing halts, so adding one to `cardStateToDerivationInput` cannot quietly widen
// the blind list that F259.1 had to measure by hand.
function assertBoundaryFieldsAccountedFor(scope, label = 'derivation_equivalence') {
  const unexplainedHeld = (scope.topLevelHeld || []).filter(row => !row.reason).map(row => row.field);
  if (unexplainedHeld.length) {
    throw new Error(`${label}: this run states ${unexplainedHeld.join(', ')} at one value and says `
      + 'nothing about why, so a zero covering that field looks like coverage and is not. Give the '
      + 'field values in BOUNDARY_FIELD_PLAN or a `heldReason` there (F259.2).');
  }
  const declared = new Set(scope.boundaryFieldsDeclaredUnvaried.map(row => row.field));
  const unaccounted = scope.boundaryFieldsNeverStated
    .map(row => row.field).filter(field => !declared.has(field));
  if (unaccounted.length) {
    throw new Error(`${label}: the card boundary hands \`deriveUnitStats\` `
      + `${unaccounted.join(', ')} and this run states ${unaccounted.length === 1 ? 'it' : 'them'} `
      + 'nowhere, so a zero cannot speak for that gate. Either vary the field in '
      + 'BOUNDARY_FIELD_PLAN or declare it unvaried there with the reason (F259.2). This halt sees '
      + 'the default card projected for side a; a field only another card state emits reaches it '
      + 'no more than it reached the census.');
  }
}

function run() {
  const context = defaultContext();
  const deriveUnitStats = readFrom(context, 'deriveUnitStats');
  const collector = scopeCollector(context);
  const results = {};
  let cases = 0;
  for (const testCase of enumerateCases(context)) {
    cases += 1;
    collector.case(testCase);
    try {
      results[testCase.name] = digest(deriveUnitStats(testCase.input));
    } catch (err) {
      const message = String(err && err.message);
      results[testCase.name] = { __throw: message };
      collector.refusal(testCase.version, message);
    }
  }
  const scope = collector.report();
  assertCorpusCanSpeak(scope);
  assertBoundaryFieldsAccountedFor(scope);
  return { cases, results, scope };
}

function main() {
  const out = process.argv[2];
  if (!out) {
    console.error('usage: node tools/derivation_equivalence.js <out.json>');
    process.exit(2);
  }
  const { cases, results, scope } = run();
  // The scope travels *in* the digest file under a reserved key no case name can collide with
  // (every case name carries a '|'), so a digest read later still says what it ranged over and
  // the diff can state the population its own zero covers.
  fs.writeFileSync(out, JSON.stringify({ __scope: scope, ...results }, null, 0));
  console.log(`wrote ${cases} derivations to ${out}`);
  console.log(formatScope(scope));
}

if (require.main === module) main();

module.exports = { enumerateCases, digest, run, formatScope, scopeCollector, canonicalValue,
  assertCorpusCanSpeak, assertBoundaryFieldsAccountedFor, refusalCensus, isRefusal,
  boundaryFieldVersions, boundaryPlanValues, nameGateValues, parseNameGateCalls,
  IDENTITIES, ROAMING_IDENTITIES,
  BOUNDARY_FIELD_PLAN, NAME_GATE_PAIRINGS, ABILITY_HALF_FIELDS, REFUSAL_SHARE_BUDGET };
