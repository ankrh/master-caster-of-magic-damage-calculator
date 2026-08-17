// Scope: asserts on deriveUnitStats and engine/combat HELPERS in isolation
// (stat derivation, buildToBlockContext, phase builders). Run: node tools/node_unit_checks.js
//
// This is NOT a way to evaluate PRESETS. Never reconstruct the applyPreset →
// readUnitStats → resolveCombat path here or in any Node script — that skips the
// DOM/calcKey layer and yields false failures. Evaluate PRESETS only via runTests()
// in the browser (see CLAUDE.md → Testing with Playwright).

const fs = require('fs');
const path = require('path');
const vm = require('vm');
// The canonical version-scope checks read PROVENANCE comments through the audit's own parser,
// so the two never disagree about what a comment says.
const { readProvenanceComments } = require('./provenance_audit');

const repoRoot = path.resolve(__dirname, '..');
let assertionCount = 0;

function loadCalculatorContext() {
  const context = { console };
  vm.createContext(context);
  [
    'Calculator/units_mom.js',
    'Calculator/units_com.js',
    'Calculator/units_com2.js',
    'Calculator/units_warlord.js',
    'Calculator/data.js',
    'Calculator/engine.js',
    'Calculator/steps.js',
    'Calculator/combat.js',
    'Calculator/stats.js',
  ].forEach(file => {
    const filePath = path.join(repoRoot, file);
    vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: file });
  });
  return context;
}

// `const`/`let` at the top level of a script are global *lexical* bindings, not properties
// of the context object — later scripts see them, but `ctx.NAME` does not. Reach those
// (HALT, STEP_PHASES, …) through the context's own evaluator.
function evalInContext(context, expression) {
  return vm.runInContext(expression, context);
}

function assert(condition, message) {
  assertionCount += 1;
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  assertionCount += 1;
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertClose(actual, expected, message, epsilon = 1e-12) {
  assertionCount += 1;
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertDistSumsToOne(dist, message) {
  assert(Array.isArray(dist), `${message}: result is not an array`);
  const sum = dist.reduce((acc, p) => acc + p, 0);
  assertClose(sum, 1, `${message}: probability sum`);
}

function baseUnitInput(overrides = {}) {
  return {
    prefix: 'a',
    version: 'com2_1.5',
    abilities: {},
    level: 'normal',
    weapon: 'normal',
    armor: 'none',
    rtbType: 'none',
    unitType: 'normal',
    figs: 1,
    atk: 1,
    rtb: 0,
    def: 1,
    res: 1,
    hp: 1,
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
    ...overrides,
  };
}

function runIdentityChecks(ctx) {
  const rosterSets = [
    ['mom_1.31', evalInContext(ctx, 'MOM_UNITS_DATA')],
    ['com_6.08', evalInContext(ctx, 'COM_UNITS_DATA')],
    ['com2_1.05.11', evalInContext(ctx, 'COM2_UNITS_DATA')],
    ['com2_warlord_1.5.12.7', evalInContext(ctx, 'WARLORD_UNITS_DATA')],
  ];
  for (const [version, data] of rosterSets) {
    for (const unit of Object.values(data)) {
      const label = `${version} template ${unit.templateId} (${unit.name})`;
      assert(Number.isInteger(unit.templateId), `${label}: generator preserves integer templateId`);
      assertEqual(unit.isHero, unit.category === 'Heroes', `${label}: isHero is source-independent of race/fantastic`);
      assertEqual(unit.heroTypeId === null, !unit.isHero, `${label}: only heroes carry heroTypeId`);
      assertEqual(unit.baseRace, unit.race, `${label}: baseRace faithfully carries source race`);
      const fantasticToken = (unit.abilities || []).some(a => a === 'Fantastic' || a === 'Fantastic=1');
      assertEqual(unit.baseFantastic, fantasticToken, `${label}: baseFantastic faithfully carries source bit`);
      assert(!Object.prototype.hasOwnProperty.call(unit, 'chosen'), `${label}: chosen is not persisted`);
      assert(!Object.prototype.hasOwnProperty.call(unit, 'golem'), `${label}: golem is not persisted`);

      const rosterIdentity = ctx.createRosterUnitIdentity(version, unit);
      assertEqual(rosterIdentity.version, version, `${label}: templateId is scoped by active version`);
      assertEqual(rosterIdentity.templateId, unit.templateId, `${label}: identity keeps templateId`);
      assertEqual(rosterIdentity.heroTypeId, unit.heroTypeId, `${label}: identity keeps heroTypeId`);
    }
  }

  const momData = evalInContext(ctx, 'MOM_UNITS_DATA');
  const momDwarf = Object.values(momData).find(unit => unit.templateId === 0);
  const momIdentity = ctx.createRosterUnitIdentity('mom_1.31', momDwarf);
  const cpIdentity = ctx.createRosterUnitIdentity('mom_cp_1.60.00', momDwarf);
  assertEqual(momIdentity.templateId, cpIdentity.templateId,
    'The shared MoM roster preserves the same source template ID');
  assert(momIdentity.version !== cpIdentity.version,
    'The shared MoM source template is scoped independently to each active version');

  const comData = evalInContext(ctx, 'COM_UNITS_DATA');
  const comSupernaturalUnits = Object.values(comData)
    .filter(unit => (unit.abilities || []).includes('Supernatural'))
    .map(unit => unit.name);
  assertEqual(JSON.stringify(comSupernaturalUnits), JSON.stringify([
    'Hydra', 'Great Drake', 'Death Knights', 'Demon Lord', 'Arch Angel',
    'Colossus', 'Gorgons', 'Behemoth', 'Great Wyrm', 'Djinn', 'Sky Drake',
  ]), 'CoM roster imports every executable $2000 Supernatural carrier');

  const customBaseIdentity = ctx.createCustomUnitIdentity('com2_1.05.11', {
    isHero: true,
    baseRace: 'Life',
    baseFantastic: false,
  });
  assertEqual(customBaseIdentity.templateId, null, 'Custom identity has null templateId');
  assertEqual(customBaseIdentity.heroTypeId, null, 'Custom identity has null heroTypeId even for a hero');
  assertEqual(customBaseIdentity.isHero, true, 'Custom identity stores Hero independently');
  assertEqual(customBaseIdentity.baseRace, 'Life', 'Custom identity stores base race independently');
  assertEqual(customBaseIdentity.baseFantastic, false, 'Custom identity stores base Fantastic independently');

  const customInput = baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'hero',
    identity: customBaseIdentity,
  });
  const first = ctx.deriveUnitStats(customInput);
  assertEqual(first.identity.race, 'Life', 'Derivation initializes live race from baseRace');
  assertEqual(first.identity.fantastic, false, 'Derivation initializes live Fantastic from baseFantastic');
  assertEqual(first.identity.isHero, true, 'Derivation retains independent Hero identity');
  assert(!Object.prototype.hasOwnProperty.call(first.identity, 'chosen'), 'Calculated identity does not persist chosen');
  assert(!Object.prototype.hasOwnProperty.call(first.identity, 'golem'), 'Calculated identity does not persist golem');
  assert(!Object.prototype.hasOwnProperty.call(customBaseIdentity, 'race'),
    'Base identity is not mutated with calculated race');
  assert(!Object.prototype.hasOwnProperty.call(customBaseIdentity, 'fantastic'),
    'Base identity is not mutated with calculated Fantastic');

  first.identity.race = 'Chaos';
  first.identity.fantastic = true;
  const second = ctx.deriveUnitStats(customInput);
  assert(first.identity !== second.identity, 'Every deriveUnitStats invocation owns a separate calculated identity record');
  assertEqual(second.identity.race, 'Life', 'A later derivation resets live race from baseRace');
  assertEqual(second.identity.fantastic, false, 'A later derivation resets live Fantastic from baseFantastic');

  const chosen = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 34,
      isHero: true, baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'chosen' }),
  }));
  assertEqual(chosen.identity.race, 'Life', 'Chosen writes live Life');
  assertEqual(chosen.identity.fantastic, true, 'Chosen writes live Fantastic');
  assertEqual(chosen.identityTrace.map(t => t.id).join(','), 'identity:chosen',
    'Identity writes are exposed on the calculated output trace');
  assert(chosen.statTrace.some(t => t.id === 'identity:chosen'),
    'Identity writes are included with affected calculated-stat output trace');

  const orderedRealmAbilities = [
    {},
    { ccDefense: true },
    { ccDefense: true, undead: true },
    { ccDefense: true, undead: true, mysticSurge: true },
    { ccDefense: true, undead: true, mysticSurge: true, sanctify: true, clergy: true },
  ];
  const orderedRealmExpected = [
    ['Life', 'fantastic_life'],
    ['Chaos', 'fantastic_chaos'],
    ['Death', 'fantastic_death'],
    ['No Heal', 'fantastic_unaligned'],
    ['No Heal', 'fantastic_unaligned'],
  ];
  orderedRealmAbilities.forEach((abilities, index) => {
    const unit = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.7',
      identity: ctx.createCustomUnitIdentity('com2_warlord_1.5.12.7', {
        baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'chosen',
      }),
      abilities,
    }));
    assertEqual(unit.identity.race, orderedRealmExpected[index][0],
      `Ordered identity override ${index} writes the expected live race`);
    assertEqual(unit.unitType, orderedRealmExpected[index][1],
      `Ordered identity override ${index} projects the expected compatibility type`);
  });

  const summoned = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { combatSummoned: true },
  }));
  assertEqual(summoned.identity.fantastic, true, 'Combat Summoned writes live Fantastic');

  const construct = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 37,
      baseRace: 'Special', baseFantastic: false }),
  }));
  assertEqual(construct.identity.race, 'Nature', 'Construct Catapult writes live Nature');
  assertEqual(construct.identity.fantastic, true, 'Construct Catapult writes live Fantastic');

  const callToArms = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 113,
      baseRace: 'High Men', baseFantastic: false }),
  }));
  assertEqual(callToArms.identity.race, 'Life', 'Call to Arms Paladins writes live Life');
  assertEqual(callToArms.identity.fantastic, true, 'Call to Arms Paladins writes live Fantastic');

  const invalidCallToArms = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', name: 'Paladins', abilities: { combatSummoned: true },
    identity: ctx.createCustomUnitIdentity('com2_1.05.11', { baseRace: 'High Men' }),
  }));
  assertEqual(invalidCallToArms.identity.race, 'High Men', 'Call to Arms ignores display names');
  assert(!invalidCallToArms.identityTrace.some(t => t.id === 'identity:callToArmsPaladins'),
    'Custom Paladins display name does not infer Call to Arms');

  const com1SummonedOther = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com_6.08', templateId: 150,
      baseRace: 'Troll', baseFantastic: false }),
  }));
  assertEqual(com1SummonedOther.identity.race, 'Troll',
    'CoM1 generic combat summons retain their loaded race');
  assertEqual(com1SummonedOther.identity.fantastic, true,
    'CoM1 generic combat summons become live Fantastic');

  const com1ConstructCatapult = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { combatSummoned: true }, rtb: 9, rtbType: 'boulder',
    identity: ctx.createUnitIdentity({ version: 'com_6.08', templateId: 37,
      baseRace: 'Special', baseFantastic: false, specialUnit: 'none' }),
  }));
  assertEqual(com1ConstructCatapult.identity.race, 'Nature',
    'CoM1 Construct Catapult recognizes source type 37 without a duplicated special-unit token');
  assertEqual(com1ConstructCatapult.identity.fantastic, true,
    'CoM1 Construct Catapult becomes live Fantastic');
  assertEqual(com1ConstructCatapult.weapon, 'magic',
    'CoM1 Construct Catapult source type 37 receives Magic Weapons');

  const com1SummonedCentaurs = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com_6.08', templateId: 54,
      baseRace: 'Beastmen', baseFantastic: false }),
  }));
  assertEqual(com1SummonedCentaurs.identity.race, 'Nature',
    'CoM1 combat-summoned Centaurs become live Nature');
  assertEqual(com1SummonedCentaurs.identity.fantastic, true,
    'CoM1 combat-summoned Centaurs become live Fantastic');

  const com1SummonedPaladins = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com_6.08', templateId: 113,
      baseRace: 'High Men', baseFantastic: false }),
  }));
  assertEqual(com1SummonedPaladins.identity.race, 'Life',
    'CoM1 combat-summoned Paladins become live Life');
  assertEqual(com1SummonedPaladins.identity.fantastic, true,
    'CoM1 combat-summoned Paladins become live Fantastic');

  const zombies = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08',
    identity: ctx.createCustomUnitIdentity('com_6.08', { specialUnit: 'zombies' }),
  }));
  assertClose(zombies.toBlock, 0.2, 'CoM1 Zombies convert toblock=-1 to 20% To Block');
  assertEqual(zombies.statTrace.find(t => t.id === 'identity:zombies:toBlock').changes.toBlk.delta, -10,
    'CoM1 Zombies trace the ten-percentage-point engine step');

  const breakthroughNormal = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { breakthrough: 'meleeDef' }, atk: 2, def: 2,
  }));
  assertEqual(breakthroughNormal.atk, 3, 'Normal Breakthrough derives the melee package');
  assertEqual(breakthroughNormal.def, 2,
    'Exceptional Breakthrough labels cannot override the normal package\'s zero Defense bonus');
  const breakthroughChosen = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { breakthrough: 'meleeDef' }, atk: 2, def: 2,
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 34,
      isHero: true, baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'chosen' }),
  }));
  assert(!breakthroughChosen.statTrace.some(t => t.id === 'breakthrough:normal'),
    'Live-Fantastic Chosen does not receive the normal Breakthrough package');
  const breakthroughSummoned = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { breakthrough: 'melee', combatSummoned: true }, atk: 2, def: 2,
  }));
  assertEqual(breakthroughSummoned.atk, 3, 'Combat Summoned derives Breakthrough attack');
  assertEqual(breakthroughSummoned.def, 3, 'Combat Summoned derives Breakthrough defense');
  const breakthroughNoncorporeal = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { breakthrough: 'melee', nonCorporeal: true }, atk: 2, def: 2,
    identity: ctx.createCustomUnitIdentity('com2_1.05.11', {
      baseRace: 'Sorcery', baseFantastic: true,
    }),
  }));
  assertEqual(breakthroughNoncorporeal.atk, 3, 'Non-Corporeal derives Breakthrough attack');
  assertEqual(breakthroughNoncorporeal.def, 3, 'Non-Corporeal derives Breakthrough defense');
}

function runDeriveUnitStatsChecks(ctx) {
  const modernChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    rtbType: 'missile',
    rtb: 7,
    modernAttacks: {
      ranged: { strength: 7, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
      lightningBreath: { strength: 4, type: 'lightning' },
    },
  }));
  assertEqual(modernChannels.rtb, 7, 'The legacy RTB projection remains unchanged during R3.2');
  assertEqual(modernChannels.modernAttacks.ranged.strength, 7, 'Modern Ranged is derived independently');
  assertEqual(modernChannels.modernAttacks.thrown.strength, 3, 'Modern Thrown is derived independently');
  assertEqual(modernChannels.modernAttacks.fireBreath.strength, 5, 'Modern Fire Breath is derived independently');
  assertEqual(modernChannels.modernAttacks.lightningBreath.strength, 4, 'Modern Lightning Breath is derived independently');

  const modernAttackInput = {
    ranged: { strength: 7, type: 'missile' },
    thrown: { strength: 3, type: 'thrown' },
    fireBreath: { strength: 5, type: 'fire' },
    lightningBreath: { strength: 4, type: 'lightning' },
  };
  const animatedChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { animated: true, doomGaze: 6 },
    modernAttacks: modernAttackInput,
  }));
  assertEqual(animatedChannels.modernAttacks.ranged.strength, 8,
    'Modern Animated writes conventional Ranged');
  assertEqual(animatedChannels.modernAttacks.thrown.strength, 4,
    'Modern Animated writes Thrown');
  assertEqual(animatedChannels.modernAttacks.fireBreath.strength, 6,
    'Modern Animated writes Fire Breath');
  assertEqual(animatedChannels.modernAttacks.lightningBreath.strength, 5,
    'Modern Animated writes Lightning Breath');
  assertEqual(animatedChannels.effectiveDoomGaze, 6,
    'Modern Animated leaves the independent Doom Gaze field unchanged');

  const blackPrayerChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { blackPrayer: true, doomGaze: 6 },
    modernAttacks: modernAttackInput,
  }));
  assertEqual(blackPrayerChannels.modernAttacks.ranged.strength, 6,
    'Modern Black Prayer writes conventional Ranged');
  assertEqual(blackPrayerChannels.modernAttacks.thrown.strength, 2,
    'Modern Black Prayer writes Thrown');
  assertEqual(blackPrayerChannels.modernAttacks.fireBreath.strength, 4,
    'Modern Black Prayer writes Fire Breath');
  assertEqual(blackPrayerChannels.modernAttacks.lightningBreath.strength, 3,
    'Modern Black Prayer writes Lightning Breath');
  assertEqual(blackPrayerChannels.effectiveDoomGaze, 6,
    'Modern Black Prayer leaves the independent Doom Gaze field unchanged');

  const tacticianHeroChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'hero', abilities: { tactician: true, doomGaze: 6 },
    modernAttacks: modernAttackInput,
  }));
  assertEqual(tacticianHeroChannels.modernAttacks.ranged.strength, 9,
    'Modern Tactician hero writes conventional Ranged');
  assertEqual(tacticianHeroChannels.modernAttacks.thrown.strength, 3,
    'Modern Tactician hero leaves Thrown unchanged');
  assertEqual(tacticianHeroChannels.modernAttacks.fireBreath.strength, 5,
    'Modern Tactician hero leaves Fire Breath unchanged');
  assertEqual(tacticianHeroChannels.modernAttacks.lightningBreath.strength, 4,
    'Modern Tactician hero leaves Lightning Breath unchanged');
  assertEqual(tacticianHeroChannels.effectiveDoomGaze, 6,
    'Modern Tactician hero leaves the independent Doom Gaze field unchanged');

  const mindStormChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { mindStorm: true, doomGaze: 6 },
    modernAttacks: {
      ranged: { strength: 7, type: 'missile' },
      thrown: { strength: 6, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
      lightningBreath: { strength: 4, type: 'lightning' },
    },
  }));
  assertEqual(mindStormChannels.modernAttacks.ranged.strength, 2,
    'Modern Mind Storm subtracts 5 from conventional Ranged');
  assertEqual(mindStormChannels.modernAttacks.thrown.strength, 1,
    'Modern Mind Storm subtracts 5 from Thrown');
  assertEqual(mindStormChannels.modernAttacks.fireBreath.strength, 5,
    'Modern Mind Storm leaves Fire Breath unchanged');
  assertEqual(mindStormChannels.modernAttacks.lightningBreath.strength, 4,
    'Modern Mind Storm leaves Lightning Breath unchanged');
  assertEqual(mindStormChannels.effectiveDoomGaze, 6,
    'Modern Mind Storm leaves Doom Gaze unchanged');

  const tacticianReadsLiveRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'hero',
    abilities: { tactician: true, mindStorm: true, warpAttack: true },
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  assertEqual(tacticianReadsLiveRanged.modernAttacks.ranged, undefined,
    'Modern Tactician does not restore Ranged when the post-Warp live field remains negative');

  const trueLightChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'fantastic_life', trueLight: true,
    abilities: { doomGaze: 6 }, modernAttacks: modernAttackInput,
  }));
  assertEqual(trueLightChannels.modernAttacks.ranged.strength, 8,
    'Warlord True Light writes conventional Ranged');
  assertEqual(trueLightChannels.modernAttacks.thrown.strength, 3,
    'Warlord True Light leaves Thrown unchanged');
  assertEqual(trueLightChannels.modernAttacks.fireBreath.strength, 5,
    'Warlord True Light leaves Fire Breath unchanged');
  assertEqual(trueLightChannels.modernAttacks.lightningBreath.strength, 4,
    'Warlord True Light leaves Lightning Breath unchanged');
  assertEqual(trueLightChannels.effectiveDoomGaze, 6,
    'Warlord True Light leaves Doom Gaze unchanged');

  const trueLightCreatesMelee = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'fantastic_life', atk: 0,
    trueLight: true, modernAttacks: {},
  }));
  assertEqual(trueLightCreatesMelee.atk, 1,
    'Warlord True Light preserves its unconditional melee write on a Life unit with zero base melee');

  const nodeAuraChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'fantastic_chaos', nodeAura: 'chaos',
    abilities: { doomGaze: 6 }, modernAttacks: modernAttackInput,
  }));
  assertEqual(nodeAuraChannels.modernAttacks.ranged.strength, 9,
    'Modern node aura writes positive conventional Ranged');
  assertEqual(nodeAuraChannels.modernAttacks.thrown.strength, 3,
    'Modern node aura leaves Thrown unchanged');
  assertEqual(nodeAuraChannels.modernAttacks.fireBreath.strength, 7,
    'Modern node aura writes positive Fire Breath');
  assertEqual(nodeAuraChannels.modernAttacks.lightningBreath.strength, 6,
    'Modern node aura writes positive Lightning Breath');
  assertEqual(nodeAuraChannels.effectiveDoomGaze, 6,
    'Modern node aura leaves Doom Gaze unchanged');

  const nodeAuraDoesNotCreateAttacks = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'fantastic_chaos', atk: 0,
    nodeAura: 'chaos', modernAttacks: {},
  }));
  assertEqual(nodeAuraDoesNotCreateAttacks.atk, 0,
    'Modern node aura does not create melee from zero');
  assertEqual(Object.keys(nodeAuraDoesNotCreateAttacks.modernAttacks).length, 0,
    'Modern node aura does not create any independent secondary attack field from zero');

  const nodeAuraUsesBaseMelee = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'hero', atk: 1, nodeAura: 'chaos',
    identity: { version: 'com2_warlord_1.5.12.7', templateId: null, heroTypeId: null,
      isHero: true, baseRace: 'Chaos', baseFantastic: false, specialUnit: 'none' },
    abilities: { soulFlay: true },
  }));
  assertEqual(nodeAuraUsesBaseMelee.atk, 2,
    'Modern node aura uses positive persistent melee after Soul Flay makes live melee zero');

  const nodeAuraDoesNotUseCreatedMelee = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'hero', atk: 0, nodeAura: 'life',
    identity: { version: 'com2_warlord_1.5.12.7', templateId: null, heroTypeId: null,
      isHero: true, baseRace: 'Life', baseFantastic: false, specialUnit: 'none' },
    trueLight: true,
  }));
  assertEqual(nodeAuraDoesNotUseCreatedMelee.atk, 1,
    'Modern node aura ignores live melee created by True Light when persistent melee is zero');

  const orderedF18 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', unitType: 'hero', nodeAura: 'chaos',
    identity: { version: 'com2_1.05.11', templateId: null, heroTypeId: null,
      isHero: true, baseRace: 'Chaos', baseFantastic: false, specialUnit: 'none' },
    abilities: { tactician: true, mindStorm: true, warpAttack: true },
    modernAttacks: { ranged: { strength: 10, type: 'missile' } },
  }));
  assertEqual(orderedF18.modernAttacks.ranged.strength, 5,
    'Node aura, Mind Storm, Warp, then Tactician produce the source-ordered Ranged result');
  const orderedF18Ids = orderedF18.modernAttacks.ranged.modifierTrace.entries
    .map(entry => entry.source.id);
  assert(orderedF18Ids.indexOf('nodeAura') < orderedF18Ids.indexOf('mindStorm')
      && orderedF18Ids.indexOf('mindStorm') < orderedF18Ids.indexOf('warpAttack')
      && orderedF18Ids.indexOf('warpAttack') < orderedF18Ids.indexOf('tactician'),
  'F18 modifier trace orders node aura, Mind Storm, Warp, and Tactician');

  const flameBladeAfterWarp = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { flameBladeWarlord: true, warpAttack: true },
    modernAttacks: { fireBreath: { strength: 2, type: 'fire' } },
  }));
  assertEqual(flameBladeAfterWarp.modernAttacks.fireBreath.strength, 2,
    'Warlord combat Flame Blade adds Fire Breath after region-c Warp');
  const flameBladeFireIds = flameBladeAfterWarp.modernAttacks.fireBreath.modifierTrace.entries
    .map(entry => entry.source.id);
  assert(flameBladeFireIds.indexOf('warpAttack') < flameBladeFireIds.indexOf('flameBlade'),
    'Warlord combat Flame Blade Fire Breath trace follows Warp in region d');

  const flameBladeCreatesFireBreath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', abilities: { flameBladeWarlord: true },
    modernAttacks: {},
  }));
  assertEqual(flameBladeCreatesFireBreath.modernAttacks.fireBreath.strength, 1,
    'Warlord combat Flame Blade creates strength-1 Fire Breath when the field was zero');
  assert(flameBladeCreatesFireBreath.modernAttacks.fireBreath.modifierTrace.entries
    .some(entry => entry.source.id === 'flameBlade'),
  'Created Flame Blade Fire Breath retains its region-d modifier trace');

  const metalFiresFantastic = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', unitType: 'fantastic_chaos', atk: 2, rtb: 3,
    rtbType: 'missile', abilities: { metalFires: true },
  }));
  assertEqual(metalFiresFantastic.atk, 2,
    'Metal Fires leaves a Fantastic unit\'s melee unchanged');
  assertEqual(metalFiresFantastic.rtb, 3,
    'Metal Fires leaves a Fantastic unit\'s missile/Thrown strength unchanged');
  assertEqual(metalFiresFantastic.weapon, 'normal',
    'Metal Fires leaves a Fantastic unit\'s weapon quality unchanged');

  const modernBlackpowder = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { outlanderWizard: true, rocketry: true, armorPiercing: true },
    rtbType: 'missile',
    rtb: 5,
    modernAttacks: {
      ranged: { strength: 5, type: 'missile' },
      thrown: { strength: 2, type: 'thrown' },
    },
  }));
  assertEqual(modernBlackpowder.modernAttacks.ranged.type, 'boulder',
    'Blackpowder transforms the modern Ranged channel without consuming Thrown');
  assertEqual(modernBlackpowder.modernAttacks.thrown.strength, 6,
    'Blackpowder independently transforms the modern Thrown channel');

  const destiny = ctx.deriveUnitStats(baseUnitInput({
    abilities: { destiny: true },
    level: 'champion',
    rtbType: 'missile',
    figs: 2,
    atk: 3,
    rtb: 2,
    def: 1,
    res: 4,
    hp: 2,
  }));
  assertEqual(destiny.atk, 6, 'Destiny doubles base melee attack and strips level bonuses');
  assertEqual(destiny.rtb, 4, 'Destiny doubles base ranged attack and strips level bonuses');
  assertEqual(destiny.def, 5, 'Destiny adds 4 defense');
  assertEqual(destiny.res, 8, 'Destiny adds 4 resistance');
  assertEqual(destiny.hp, 4, 'Destiny doubles hit points');
  assertEqual(destiny.unitType, 'fantastic_life', 'Destiny changes unit type to fantastic Life');
  assertEqual(destiny.abilities.supernatural, true, 'Destiny grants Supernatural for combat');

  const liveHpCharm = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    abilities: { charmOfLife: true, endurance: true },
    hp: 7,
  }));
  assertEqual(liveHpCharm.hp, 13,
    'Charm of Life reads live HP after Endurance (7 + 4 + trunc(11 / 4))');

  const allEarlierHpCharm = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    abilities: { charmOfLife: true, endurance: true, lionheart: true },
    hp: 7,
  }));
  assertEqual(allEarlierHpCharm.hp, 23,
    'Charm of Life reads live HP after Endurance and Lionheart (7 + 4 + 8 + trunc(19 / 4))');

  const ludusRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', race: 'Orc',
    abilities: { ludusAgoge: true }, rtbType: 'missile', rtb: 5,
  }));
  assertEqual(ludusRanged.rtb, 6,
    'Ludus Agoge preserves the executing script ranged +1 write');

  const motherFungusRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', race: 'Goblin',
    abilities: { motherFungus: true }, rtbType: 'missile', rtb: 5,
  }));
  assertEqual(motherFungusRanged.rtb, 7,
    'Mother Fungus preserves the executing script ranged +2 write');

  const altarMoonBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', race: 'Gnoll',
    abilities: { altarOfTheMoon: true, focusMagic: true }, rtbType: 'none', rtb: 0,
  }));
  assertEqual(altarMoonBeforeFocus.rtb, 3,
    'Altar of the Moon does not treat the later Focus Magic ranged creation as permanent ranged');

  const ludusBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', race: 'Orc',
    abilities: { ludusAgoge: true, focusMagic: true }, rtbType: 'none', rtb: 0,
  }));
  assertEqual(ludusBeforeFocus.rtb, 3,
    'Ludus Agoge does not treat the later Focus Magic ranged creation as permanent ranged');

  const motherFungusBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', race: 'Goblin',
    abilities: { motherFungus: true, focusMagic: true }, rtbType: 'none', rtb: 0,
  }));
  assertEqual(motherFungusBeforeFocus.rtb, 3,
    'Mother Fungus does not treat the later Focus Magic ranged creation as permanent ranged');

  const orihalconBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', armor: 'orihalcon',
    abilities: { focusMagic: true }, rtbType: 'missile', rtb: 2,
  }));
  assertEqual(orihalconBeforeFocus.rtb, 2,
    'Orihalcon tests magical ranged before Warlord Focus Magic converts a missile attack');

  const disciplineBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', level: 'veteran',
    abilities: { discipline: 'overland', focusMagic: true }, rtbType: 'missile', rtb: 1,
  }));
  assertEqual(disciplineBeforeFocus.rtb, 4,
    'Discipline tests physical ranged before Warlord Focus Magic converts it');

  const flameBladeBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { flameBladeWarlord: true, focusMagic: true }, rtbType: 'missile', rtb: 2,
  }));
  assertEqual(flameBladeBeforeFocus.rtb, 4,
    'Warlord Flame Blade tests missile ranged before the later Focus Magic conversion');

  const blazingMarchBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { blazingMarch: true, focusMagic: true }, rtbType: 'missile', rtb: 2,
  }));
  assertEqual(blazingMarchBeforeFocus.rtb, 5,
    'Warlord Blazing March tests missile ranged before the later Focus Magic conversion');

  const fieryFuryBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { fieryFury: true, focusMagic: true }, rtbType: 'missile', rtb: 2,
  }));
  assertEqual(fieryFuryBeforeFocus.rtb, 4,
    'Fiery Fury tests missile ranged before the later Warlord Focus Magic conversion');

  const ludusUsesBaseRace = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', race: 'Orc', atk: 1,
    abilities: { ludusAgoge: true, ccFireBreath: true },
  }));
  assertEqual(ludusUsesBaseRace.atk, 2,
    'Permanent recruitment gates retain base race after Chaos Channels changes live identity');

  const naturalSelectionUsesBaseType = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 1,
    abilities: { coal: true, ccFireBreath: true },
  }));
  assertEqual(naturalSelectionUsesBaseType.atk, 2,
    'Natural Selection retains normal base-unit eligibility after Chaos Channels');

  const pillarUsesBaseType = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', res: 1,
    abilities: { pillarOfFaithRes: 2, ccFireBreath: true },
  }));
  assertEqual(pillarUsesBaseType.res, 3,
    'Pillar of Faith retains normal base-unit eligibility after Chaos Channels');

  const fieryFuryUsesBaseType = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 1,
    abilities: { fieryFury: true, ccFireBreath: true },
  }));
  assertEqual(fieryFuryUsesBaseType.atk, 4,
    'Fiery Fury follows BASEFANTASTIC after Chaos Channels changes live identity');

  const ccMomThrownAtCeiling = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', rtb: 3, rtbType: 'thrown',
    abilities: { ccFireBreath: true },
  }));
  assertEqual(ccMomThrownAtCeiling.rtb, 2,
    'MoM 1.31 Chaos Channels replaces a strength-3 Thrown shared slot with Fire Breath 2');
  assertEqual(ccMomThrownAtCeiling.thrownType, 'fire',
    'MoM 1.31 admits the Fire Breath mutation at its signed ranged ceiling');
  const ccMomTrace = ccMomThrownAtCeiling.statTrace
    .find(step => step.id === 'chaosChannels:fireBreath');
  assertEqual(ccMomTrace.changes.rtb.from, 3,
    'MoM 1.31 Chaos Channels trace starts from the source shared-slot strength');
  assertEqual(ccMomTrace.changes.rtb.to, 2,
    'MoM 1.31 Chaos Channels trace records the replacing Fire Breath write');

  const ccMomAboveCeiling = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', rtb: 4, rtbType: 'thrown',
    abilities: { ccFireBreath: true },
  }));
  assertEqual(ccMomAboveCeiling.rtb, 4,
    'MoM 1.31 rejects a base Thrown strength above its ceiling of 3');
  assertEqual(ccMomAboveCeiling.thrownType, 'thrown',
    'MoM 1.31 leaves an above-ceiling shared Thrown slot intact');

  for (const [version, expectedStrength] of [
    ['mom_cp_1.60.00', 3],
    ['com_6.08', 3],
  ]) {
    const positiveThrown = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 3, rtbType: 'thrown',
      abilities: { ccFireBreath: true },
    }));
    assertEqual(positiveThrown.rtb, expectedStrength,
      `${version}: positive base Thrown strength rejects the Chaos Channels Fire Breath option`);
    assertEqual(positiveThrown.thrownType, 'thrown',
      `${version}: rejected Chaos Channels leaves the shared Thrown type intact`);
  }

  for (const [version, grantedStrength] of [
    ['mom_1.31', 2],
    ['mom_cp_1.60.00', 2],
    ['com_6.08', 4],
  ]) {
    const emptySlot = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 0, rtbType: 'none', abilities: { ccFireBreath: true },
    }));
    assertEqual(emptySlot.rtb, grantedStrength,
      `${version}: an empty DOS shared slot receives the version-specific Fire Breath strength`);
    assertEqual(emptySlot.thrownType, 'fire',
      `${version}: an empty DOS shared slot becomes Fire Breath`);

    const gazeSlot = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 2, rtbType: 'gaze_multiple', abilities: { ccFireBreath: true },
    }));
    assertEqual(gazeSlot.rtb, 2,
      `${version}: a Gaze in the DOS shared slot rejects Chaos Channels Fire Breath`);
    assertEqual(gazeSlot.thrownType, 'none',
      `${version}: a DOS Gaze never gains a second Breath channel`);
    assert(!gazeSlot.statTrace.some(step => step.id === 'chaosChannels:fireBreath'),
      `${version}: rejected shared-slot Fire Breath emits no stat write`);

    const explicitGaze = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 0, rtbType: 'none',
      abilities: { ccFireBreath: true, stoningGaze: -1 },
    }));
    assertEqual(explicitGaze.rtb, 0,
      `${version}: an explicit DOS Gaze control also occupies the shared attack slot`);
    assertEqual(explicitGaze.thrownType, 'none',
      `${version}: explicit DOS Gaze and Chaos Channels Breath cannot coexist`);

    for (const breathType of ['fire', 'lightning']) {
      const existingBreath = ctx.deriveUnitStats(baseUnitInput({
        version, rtb: 2, rtbType: breathType, abilities: { ccFireBreath: true },
      }));
      assertEqual(existingBreath.rtb, 2,
        `${version}: an existing ${breathType} Breath rejects Chaos Channels Fire Breath`);
      assertEqual(existingBreath.thrownType, breathType,
        `${version}: rejected Chaos Channels leaves the existing ${breathType} Breath intact`);
      assert(!existingBreath.statTrace.some(step => step.id === 'chaosChannels:fireBreath'),
        `${version}: a rejected second Breath emits no Chaos Channels stat write`);
    }
  }

  const ccPatchedSignedNegative = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00', rtb: -1, rtbType: 'thrown',
    abilities: { ccFireBreath: true },
  }));
  assertEqual(ccPatchedSignedNegative.rtb, 2,
    'CP 1.60 compares the source shared strength as signed and admits negative Thrown');
  assertEqual(ccPatchedSignedNegative.thrownType, 'fire',
    'CP 1.60 replaces an admitted negative Thrown slot with Fire Breath 2');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const ccModernBesideRanged = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 7, rtbType: 'missile',
      abilities: { ccFireBreath: true, stoningGaze: -3 },
      modernAttacks: {
        ranged: { strength: 7, type: 'missile' },
        thrown: null, fireBreath: null, lightningBreath: null,
      },
    }));
    assertEqual(ccModernBesideRanged.modernAttacks.ranged.strength, 7,
      `${version}: Chaos Channels leaves conventional Ranged unchanged`);
    assertEqual(ccModernBesideRanged.modernAttacks.fireBreath.strength, 4,
      `${version}: Chaos Channels seeds Fire Breath beside conventional Ranged and Gaze`);
    assertEqual(ccModernBesideRanged.abilities.stoningGaze, -3,
      `${version}: Chaos Channels leaves the independent Stoning Gaze unchanged`);
    const ccModernTrace = ccModernBesideRanged.modernAttacks.fireBreath.modifierTrace.entries
      .find(entry => entry.id === 'chaosChannels:fireBreath');
    assertEqual(ccModernTrace.from, 0,
      `${version}: Chaos Channels Fire Breath trace starts at the empty independent channel`);
    assertEqual(ccModernTrace.to, 4,
      `${version}: Chaos Channels Fire Breath trace records the additive grant`);
  }

  const fieryFuryBeforeRaiseDead = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'fantastic_nature',
    identity: {
      version: 'com2_warlord_1.5.12.7', templateId: null, heroTypeId: null,
      isHero: false, baseRace: 'Nature', baseFantastic: true, specialUnit: 'none',
    },
    abilities: { fieryFury: true, raiseDead: true },
  }));
  assertEqual(fieryFuryBeforeRaiseDead.unitType, 'fantastic_unaligned',
    'Raise Dead No-Heal conversion runs after Warlord Fiery Fury identity conversion');

  const fieryFuryBeforeMysticSurge = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'fantastic_nature',
    identity: {
      version: 'com2_warlord_1.5.12.7', templateId: null, heroTypeId: null,
      isHero: false, baseRace: 'Nature', baseFantastic: true, specialUnit: 'none',
    },
    abilities: { fieryFury: true, mysticSurge: true },
  }));
  assertEqual(fieryFuryBeforeMysticSurge.unitType, 'fantastic_unaligned',
    'Mystic Surge No-Heal conversion runs after Warlord Fiery Fury identity conversion');

  const sanctifyRetainsLiveFantastic = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { combatSummoned: true, sanctify: true },
  }));
  assertEqual(sanctifyRetainsLiveFantastic.unitType, 'fantastic_life',
    'Sanctify writes Life without clearing a non-clergy unit already made Fantastic');

  const sanctifyBeforeRaiseDead = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { sanctify: true, clergy: true, raiseDead: true },
  }));
  assertEqual(sanctifyBeforeRaiseDead.unitType, 'fantastic_unaligned',
    'Raise Dead No-Heal conversion runs after Warlord Sanctify identity writes');

  const sanctifiedClergyHero = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'hero', atk: 1, trueLight: true,
    identity: {
      version: 'com2_warlord_1.5.12.7', templateId: null, heroTypeId: null,
      isHero: true, baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
    },
    abilities: { sanctify: true, clergy: true },
  }));
  assertEqual(sanctifiedClergyHero.unitType, 'hero',
    'Sanctify does not apply its clergy Fantastic write to heroes');
  assertEqual(sanctifiedClergyHero.identity.race, 'Life',
    'Sanctify still writes live Life race for heroes');
  assertEqual(sanctifiedClergyHero.identity.fantastic, false,
    'Sanctify leaves a Clergy hero non-Fantastic');
  assertEqual(sanctifiedClergyHero.atk, 2,
    'Sanctified hero live Life race reaches later True Light realm gates');

  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageFn({ supernatural: true }, 'mom_1.31')"), null,
  'MoM Supernatural input produces no minimum-damage callback');
  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageFn({ supernatural: true }, 'com_6.08')"), null,
  'CoM Supernatural produces no minimum-damage callback');
  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageForHits(9, 'com_6.08')"), 0,
  'CoM Supernatural helper has no combat effect');
  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageForHits(25, 'com2_1.05.11')"), 8,
  'Modern Supernatural rounds an 8.5 tie to the even integer 8');
  assertEqual(evalInContext(ctx,
    "supernaturalMinDamageForHits(75, 'com2_1.05.11')"), 26,
  'Modern Supernatural rounds a 25.5 tie to the even integer 26');

  const uncappedPillar = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { pillarOfFaithRes: 10 }, res: 1,
  }));
  assertEqual(uncappedPillar.res, 11,
    'Pillar of Faith uses the executing script building count without an artificial cap');

  const naturalSelectionOverwrite = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { powerMinerals: 2, nightshade: 1 }, res: 3,
  }));
  assertEqual(naturalSelectionOverwrite.res, 4,
    'Natural Selection Nightshade overwrites the earlier Power-mineral resistance write');

  const naturalSelectionCount = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { powerMinerals: 2, nightshade: 3 }, res: 3,
  }));
  assertEqual(naturalSelectionCount.res, 6,
    'Natural Selection adds the full Nightshade count from the saved Resistance snapshot');

  const wildGameDoesNotFollowFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { wildGame: true, focusMagic: true }, rtbType: 'thrown', rtb: 2,
  }));
  assertEqual(wildGameDoesNotFollowFocus.rtb, 2,
    'Wild Game reads the saved conventional-ranged field rather than Focus-converted Thrown');

  const com1FlameBeforeFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { flameBlade: true, focusMagic: true },
    rtbType: 'missile', rtb: 1,
  }));
  assertEqual(com1FlameBeforeFocus.rtb, 3,
    'CoM 1 Flame Blade adds 2 before Focus Magic applies its minimum of 3');
  assertEqual(com1FlameBeforeFocus.statTrace
    .filter(step => ['level', 'weapon', 'flameBlade:ranged', 'focusMagic:conversion'].includes(step.id))
    .map(step => step.id).join(','), 'flameBlade:ranged,focusMagic:conversion',
  'CoM 1 trace preserves Flame Blade before Focus Magic when no other step mutates');

  const com1MaterialOrder = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', weapon: 'mithril', abilities: { focusMagic: true },
    rtbType: 'missile', rtb: 1,
  }));
  assert(com1MaterialOrder.statTrace.findIndex(step => step.id === 'weapon')
      < com1MaterialOrder.statTrace.findIndex(step => step.id === 'focusMagic:conversion'),
    'DOS weapon material executes before CoM 1 Focus Magic');

  const focusMagicLowStrength = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    abilities: { focusMagic: true },
    rtbType: 'missile',
    rtb: 1,
  }));
  assertEqual(focusMagicLowStrength.rangedType, 'magic_s',
    'Modern Focus Magic converts a low-strength physical ranged attack');
  assertEqual(focusMagicLowStrength.rtb, 1,
    'Modern Focus Magic preserves positive conversion strength below 3');

  const warlordFocusBeforeWarp = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { focusMagic: true, warpAttack: true },
    rtbType: 'magic_s',
    rtb: 5,
  }));
  assertEqual(warlordFocusBeforeWarp.rtb, 4,
    'Warlord compiled Focus Magic adds 3 before Warp Attack halves the strength');

  const modernNegativeWarp = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    abilities: { mindStorm: true, warpAttack: true },
    rtbType: 'missile',
    rtb: 2,
  }));
  const modernNegativeWarpEntry = modernNegativeWarp.modifierTraces.sharedAttack.entries
    .find(entry => entry.source.id === 'warpAttack');
  assertEqual(modernNegativeWarpEntry.from, -3,
    'Modern Warp Attack reads the negative odd strength left by Mind Storm');
  assertEqual(modernNegativeWarpEntry.to, -1,
    'Modern Warp Attack uses signed truncate-toward-zero division');

  const beatFiveDefense = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { beatOfSwiftness: true },
    def: 5,
  }));
  assertEqual(beatFiveDefense.def, 5,
    'Beat of Swiftness rounds a 0.5 defense reduction to even');
  const beatTwentyFiveDefense = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { beatOfSwiftness: true },
    def: 25,
  }));
  assertEqual(beatTwentyFiveDefense.def, 23,
    'Beat of Swiftness rounds a 2.5 defense reduction to even');
  const beatHiddenOutsideWarlord = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    abilities: { beatOfSwiftness: true },
    def: 25,
  }));
  assertEqual(beatHiddenOutsideWarlord.def, 25,
    'Beat of Swiftness is inert outside Warlord even when supplied as a raw hidden input');

  const lightningBladeThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { lightningBlade: true },
    rtbType: 'thrown',
    rtb: 4,
  }));
  assertEqual(lightningBladeThrown.thrownType, 'lightning',
    'Lightning Blade converts the represented Thrown channel to Lightning Breath');
  assertEqual(lightningBladeThrown.rtb, 5,
    'Lightning Blade writes Lightning Breath at Thrown + 1 strength');

  // Nature Link (Warlord rename of Land Linking) maps to the landLinking calcKey.
  // Fantastic units get the Land Linking melee/def bonus AND the Warlord +1 resistance.
  const natureLinkFantastic = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { landLinking: true },
    unitType: 'fantastic_nature',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(natureLinkFantastic.atk, 3, 'Nature Link gives fantastic units +2 melee');
  assertEqual(natureLinkFantastic.def, 3, 'Nature Link gives fantastic units +2 defense');
  assertEqual(natureLinkFantastic.res, 2, 'Nature Link gives fantastic units +1 resistance (Warlord)');

  // Normal units get only the +1 resistance, not the fantastic-only melee/def bonus.
  const natureLinkNormal = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { landLinking: true },
    unitType: 'normal',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(natureLinkNormal.atk, 1, 'Nature Link gives normal units no melee bonus');
  assertEqual(natureLinkNormal.def, 1, 'Nature Link gives normal units no defense bonus');
  assertEqual(natureLinkNormal.res, 2, 'Nature Link gives normal units +1 resistance (Warlord)');

  // CoM2 Land Linking grants no resistance bonus, even on fantastic units.
  const landLinkingCoM2 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    abilities: { landLinking: true },
    unitType: 'fantastic_nature',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(landLinkingCoM2.atk, 3, 'Land Linking (CoM2) gives fantastic units +2 melee');
  assertEqual(landLinkingCoM2.res, 1, 'Land Linking (CoM2) grants no resistance bonus');

  const luckyStar = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { luckyStar: true },
    rtbType: 'missile',
    atk: 2, rtb: 2, def: 2, res: 2,
  }));
  assertEqual(luckyStar.atk, 3, 'Lucky Star aura gives every friendly unit +1 melee');
  assertEqual(luckyStar.rtb, 3, 'Lucky Star aura gives every friendly unit +1 ranged');
  assertEqual(luckyStar.def, 3, 'Lucky Star aura gives every friendly unit +1 armor');
  assertEqual(luckyStar.res, 3, 'Lucky Star aura gives +1 resistance and no Lucky resistance');
  assertClose(luckyStar.toHitMelee, 0.3, 'Lucky Star aura does not grant Lucky To-Hit');
  assertClose(luckyStar.toBlock, 0.3, 'Lucky Star aura does not grant Lucky To-Block');

  // Only the enchanted unit gains Lucky, expressed with the ordinary `lucky` control.
  const luckyStarTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { luckyStar: true, lucky: true },
    atk: 2, def: 2, res: 2,
  }));
  assertEqual(luckyStarTarget.res, 4, 'Enchanted unit gets the aura resistance plus Lucky resistance');
  assertClose(luckyStarTarget.toHitMelee, 0.4, 'Enchanted unit gets Lucky To-Hit');
  assertClose(luckyStarTarget.toBlock, 0.4, 'Enchanted unit gets Lucky To-Block');

  // Psycho Force (UnitCalc.CAS:1413-1417) and Pneuma Field (:1419-1425) read the Resistance
  // standing at their own position in region `d`. Region `e`'s aura pass raises Resistance
  // afterwards, so a Holy Bonus aura must not feed either effect. Both are Outlander-soldier
  // reforms, so the inputs are the wizard retort plus the reform, never the derived label.
  const psychoForceInput = overrides => baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    level: 'veteran',
    atk: 1, def: 1, res: 4, hp: 1,
    ...overrides,
  });
  const psychoNoAura = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, psychoConverter: true },
  }));
  const psychoWithAura = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, psychoConverter: true, holyBonus: 2 },
  }));
  // res 4 + Xenopsychology-free base = 5 at region d, veteran rank 2 => trunc(5 * 2 / 2) = 5.
  assertEqual(psychoNoAura.res, 5, 'Baseline resistance for the Psycho Force reads');
  assertEqual(psychoWithAura.res, 7, 'The Holy Bonus aura raises the finished resistance to 7');
  assertClose(psychoNoAura.toBlock, 0.35, 'Psycho Force adds resistance x level / 2 To-Defend');
  assertClose(psychoWithAura.toBlock, 0.35,
    'Psycho Force reads resistance at region d, so the region-e aura does not feed it');
  assertClose(psychoWithAura.toHitMelee, 0.35,
    'and the same pre-aura value drives its To-Hit half');

  const pneumaNoAura = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, pneumaReactor: true },
  }));
  const pneumaWithAura = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, pneumaReactor: true, holyBonus: 2 },
  }));
  assertEqual(pneumaNoAura.abilities.lifeSteal, -2, 'Pneuma Field drains trunc(resistance / 2)');
  assertEqual(pneumaWithAura.abilities.lifeSteal, -2,
    'Pneuma Field reads resistance at region d, so the region-e aura does not deepen the drain');
  const pneumaWarped = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, pneumaReactor: true, warpResist: true },
  }));
  assertEqual(pneumaWarped.abilities.lifeSteal, 0,
    'Warp Resist zeroes resistance in region c, so Pneuma Field drains nothing');

  const trueSight = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { trueSight: true },
    rtbType: 'magic_s',
    rtb: 1,
  }));
  assertEqual(trueSight.abilities.illusionImmunity, true, 'True Sight grants Illusion Immunity');
  assertClose(trueSight.toHitMelee, 0.3, 'True Sight does not boost melee To-Hit');
  assertClose(trueSight.toHitRtb, 0.35, 'True Sight gives +5% ranged To-Hit in Warlord');

  const eyeOfHeavenTrueSight = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { eyeOfHeaven: true },
    rtbType: 'fire',
    rtb: 1,
  }));
  assertClose(eyeOfHeavenTrueSight.toHitRtb, 0.35, 'Eye of Heaven grants the True Sight To-Hit bonus');

  const academyMagicRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { alumniOfAcademy: true },
    race: 'Halfling',
    name: 'Halfling Shamans',
    rtbType: 'magic_n',
    rtb: 3,
    figs: 6,
  }));
  assertEqual(academyMagicRanged.figs, 8, 'Academy gives a Halfling magical-ranged unit +2 figures');

  const academyMechanical = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { alumniOfAcademy: true, mechanical: true },
    race: 'Halfling',
    name: 'Mechanical Shamans',
    rtbType: 'magic_n',
    rtb: 3,
    figs: 6,
  }));
  assertEqual(academyMechanical.figs, 6, 'Academy excludes Mechanical magical-ranged units');

  const academyRocs = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { alumniOfAcademy: true },
    race: 'Halfling',
    name: 'Halfling Rocs',
    figs: 2,
  }));
  assertEqual(academyRocs.figs, 4, 'Academy gives Halfling Rocs +2 figures');

  const academyOtherRace = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { alumniOfAcademy: true },
    race: 'High Men',
    name: 'High Men Magicians',
    rtbType: 'magic_c',
    rtb: 3,
    figs: 4,
  }));
  assertEqual(academyOtherRace.figs, 4, 'Academy is inert outside the Halfling race');

  const innerPower = ctx.deriveUnitStats(baseUnitInput({
    abilities: { innerPower: true, fireImmunity: true },
    rtbType: 'fire',
    rtb: 1,
  }));
  assertEqual(innerPower.atk, 4, 'Inner Power eligible unit gains melee attack');
  assertEqual(innerPower.rtb, 4, 'Inner Power eligible unit gains breath attack');
  assertEqual(innerPower.def, 3, 'Inner Power eligible unit gains defense');
  assertEqual(innerPower.res, 3, 'Inner Power eligible unit gains resistance');
  assertEqual(innerPower.abilities.innerPower, true, 'Inner Power remains active when eligible');

  const ineligibleInnerPower = ctx.deriveUnitStats(baseUnitInput({
    abilities: { innerPower: true },
    rtbType: 'fire',
    rtb: 1,
  }));
  assertEqual(ineligibleInnerPower.atk, 1, 'Inner Power ineligible unit does not gain melee attack');
  assertEqual(ineligibleInnerPower.abilities.innerPower, false, 'Inner Power is disabled for ineligible units');

  const holyWeaponThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00',
    abilities: { holyWeapon: true },
    rtbType: 'thrown',
    rtb: 2,
  }));
  assertEqual(holyWeaponThrown.rtbToHitWpnBonus, 0, 'Holy Weapon thrown to-hit bonus is tracked separately from weapon bonus');
  assertClose(holyWeaponThrown.toHitRtb, 0.4, 'Holy Weapon boosts thrown to-hit outside MoM 1.31');

  const darknessDeath = ctx.deriveUnitStats(baseUnitInput({
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    darkness: true,
  }));
  assertEqual(darknessDeath.atk, 5, 'Darkness gives Death units +1 melee attack');
  assertEqual(darknessDeath.rtb, 3, 'Darkness gives Death units +1 ranged attack');
  assertEqual(darknessDeath.def, 4, 'Darkness gives Death units +1 defense');
  assertEqual(darknessDeath.res, 6, 'Darkness gives Death units +1 resistance');

  const modernDarknessDoesNotBoostGaze = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_death',
    abilities: { doomGaze: 4 },
    darkness: true,
  }));
  assertEqual(modernDarknessDoesNotBoostGaze.abilities.doomGaze, 4,
    'Modern Darkness does not write the separate Doom Gaze field');

  const modernDarknessPositiveGates = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_life',
    atk: 0,
    rtb: 0,
    def: 0,
    res: 0,
    darkness: true,
  }));
  assert(!modernDarknessPositiveGates.statTrace.some(entry => entry.id === 'darkness'),
    'Modern Darkness does not subtract from zero Life attack, defense, or resistance channels');

  const modernChaosSurgeKeepsBaseMeleeGate = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    unitType: 'fantastic_chaos',
    abilities: { blazeOfGlory: true },
    chaosSurge: 1,
    atk: 0,
    def: 4,
  }));
  assertEqual(modernChaosSurgeKeepsBaseMeleeGate.atk, 4,
    'Modern Chaos Surge does not create melee before Blaze of Glory widens the slot');

  const trueLightDeath = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    trueLight: true,
  }));
  assertEqual(trueLightDeath.atk, 3, 'True Light gives Death units -1 melee attack in MoM');
  assertEqual(trueLightDeath.rtb, 1, 'True Light gives Death units -1 ranged attack in MoM');
  assertEqual(trueLightDeath.def, 2, 'True Light gives Death units -1 defense in MoM');
  assertEqual(trueLightDeath.res, 4, 'True Light gives Death units -1 resistance in MoM');

  const bothLightDark = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    trueLight: true,
    darkness: true,
  }));
  assertEqual(bothLightDark.atk, 4, 'True Light and Darkness cancel Death melee attack modifiers');
  assertEqual(bothLightDark.rtb, 2, 'True Light and Darkness cancel Death ranged attack modifiers');
  assertEqual(bothLightDark.def, 3, 'True Light and Darkness cancel Death defense modifiers');
  assertEqual(bothLightDark.res, 5, 'True Light and Darkness cancel Death resistance modifiers');

  const eternalNightDeathMoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    abilities: { eternalNight: true },
  }));
  assertEqual(eternalNightDeathMoM.atk, 5, 'Eternal Night uses normal Darkness melee attack in MoM');
  assertEqual(eternalNightDeathMoM.rtb, 3, 'Eternal Night uses normal Darkness ranged attack in MoM');
  assertEqual(eternalNightDeathMoM.def, 4, 'Eternal Night uses normal Darkness defense in MoM');
  assertEqual(eternalNightDeathMoM.res, 6, 'Eternal Night uses normal Darkness resistance in MoM');

  const enemyEternalNightNormalMoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_cp_1.60.00',
    unitType: 'normal',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightNormalMoM.res, 5, 'Enemy Eternal Night has no extra non-Death resistance penalty in MoM');

  const eternalNightDeath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    eternalNight: true,
  }));
  assertEqual(eternalNightDeath.atk, 6, 'Eternal Night gives Death units +2 melee attack in CoM2');
  assertEqual(eternalNightDeath.rtb, 4, 'Eternal Night gives Death units +2 ranged attack in CoM2');
  assertEqual(eternalNightDeath.def, 5, 'Eternal Night gives Death units +2 defense in CoM2');
  assertEqual(eternalNightDeath.res, 6, 'Eternal Night gives Death units the normal +1 Darkness resistance in CoM2');

  const eternalNightDeathCoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    abilities: { eternalNight: true },
  }));
  assertEqual(eternalNightDeathCoM.atk, 5, 'Eternal Night uses normal Darkness melee attack in CoM');
  assertEqual(eternalNightDeathCoM.rtb, 3, 'Eternal Night uses normal Darkness ranged attack in CoM');
  assertEqual(eternalNightDeathCoM.def, 4, 'Eternal Night uses normal Darkness defense in CoM');
  assertEqual(eternalNightDeathCoM.res, 6, 'Eternal Night uses normal Darkness resistance in CoM');

  const enemyEternalNightNormalCoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08',
    unitType: 'normal',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightNormalCoM.res, 4, 'Enemy Eternal Night gives non-Death normal units -1 resistance in CoM');

  const enemyEternalNightLifeCoM2 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_life',
    atk: 4,
    def: 3,
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightLifeCoM2.atk, 3, 'Enemy Eternal Night applies the Darkness attack penalty once to Life units in CoM2');
  assertEqual(enemyEternalNightLifeCoM2.def, 2, 'Enemy Eternal Night applies the Darkness defense penalty once to Life units in CoM2');
  assertEqual(enemyEternalNightLifeCoM2.res, 3, 'Enemy Eternal Night applies Darkness resistance plus enemy resistance penalty to Life units in CoM2');

  const enemyEternalNightDeathCoM2 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_death',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightDeathCoM2.res, 6, 'Enemy Eternal Night does not apply the extra resistance penalty to Death units');
}

function runToBlockChecks(ctx) {
  const a = {
    toBlock: 0.4,
    abilities: { eldritchWeapon: true, mysticSurge: true },
    thrownType: 'thrown',
    rangedType: 'missile',
  };
  const b = {
    toBlock: 0.5,
    abilities: { eldritchWeapon: true, mysticSurge: true },
    thrownType: 'none',
    rangedType: 'none',
  };
  const result = ctx.buildToBlockContext(a, b, 0.05, 0.07);
  assertClose(result.bToBlockConventional, 0.43, 'Defender conventional block applies Vertigo');
  assertClose(result.bToBlockVsAAll, 0.33, 'Mystic Surge lowers defender block against all conventional attacks');
  assertClose(result.bToBlockVsAMelee, 0.23, 'Eldritch Weapon lowers defender melee block');
  assertClose(result.bToBlockVsAThrEW, 0.23, 'Eldritch Weapon lowers defender thrown block');
  assertClose(result.bToBlockVsARangedEW, 0.23, 'Eldritch Weapon lowers defender missile block');
  assertClose(result.aToBlockConventional, 0.35, 'Attacker conventional block applies Vertigo');
  assertClose(result.aToBlockVsBAll, 0.25, 'Opponent Mystic Surge lowers attacker block');
  assertClose(result.aToBlockVsBMelee, 0.15, 'Opponent Eldritch Weapon lowers attacker melee block');
}

function runDerivationStageChecks(ctx) {
  const version = 'com2_warlord_1.5.12.7';

  // Phase attribution is a step's declared position, so these assert on the emitted step
  // rather than on a bucket total. `null` means the effect emitted no step at all.
  const stepFor = (abilities, id, ver) => {
    const steps = ctx.getAbilityStatSteps(abilities, ver || version);
    const matches = steps.filter(step => step.id === id);
    assert(matches.length <= 1, `getAbilityStatSteps emits at most one '${id}' step`);
    return matches[0] || null;
  };
  const phaseOf = (abilities, id, ver) => {
    const step = stepFor(abilities, id, ver);
    return step ? step.phase : null;
  };

  assertEqual(phaseOf({ lucky: true, luckyPhaseA: true }, 'lucky'), 'c',
    'Intrinsic Lucky is applied in region c, where +0x044C7 puts it');
  assertEqual(phaseOf({ lucky: true, luckyPhaseBase: true, luckyPhaseA: true }, 'lucky'), 'c',
    'Creation-time Lucky establishes the flag before its compiled region-c stat write');
  assertEqual(phaseOf({ lucky: true, luckyPhaseB: true }, 'lucky'), 'c',
    'Lucky Star / Divine Protection establish the flag before the compiled region-c stat write');

  const artificer = stepFor({ artificer: true, mechanical: true }, 'artificer');
  assertEqual(artificer.phase, 'base', 'Artificer ABase writes use the base stage');
  assertEqual(artificer.delta.atk, 1, 'Artificer grants +1 melee');
  // +2, not the +1 the in-game helptext states — CreateUnit.CAS:43 matches manual changelog
  // 1.4.22, which restored the +2 that 1.4.17 had cut. See Source discrepancies.md §6.
  assertEqual(artificer.delta.res, 2, 'Artificer grants +2 resistance, per the script');
  assertEqual(artificer.delta.def, 1, 'Artificer grants +1 armor');
  assertEqual(artificer.delta.rtb, 1, 'Artificer grants +1 ranged');

  assertEqual(phaseOf({ guardian: true }, 'guardian'), 'c',
    'The Guardian retort is region c, where +0x0B092 puts it');
  assertEqual(phaseOf({ rebuild: true, unitType: 'normal' }, 'rebuild'), 'base',
    'Non-hero Rebuild ABase write uses the base stage');
  assertEqual(phaseOf({ rebuild: true, unitType: 'hero' }, 'rebuild'), 'b',
    'Hero Rebuild is reapplied in UnitCalcPre phase b');

  // D23: CoM2/Warlord apply Holy Bonus and Resistance to All as region-`e` stack auras, after
  // `d` and after the Warps. The DOS engines have no aura pass and keep them in `a`.
  const holyBonusCoM2 = stepFor({ holyBonus: 3 }, 'holyBonus:aura');
  assertEqual(holyBonusCoM2.phase, 'e', "CoM2/Warlord run Holy Bonus in region e's aura pass");
  assertEqual(holyBonusCoM2.delta.ranged, 3,
    'The Holy Bonus aura writes the narrow ranged field, not the shared rtb slot');
  assertEqual(holyBonusCoM2.delta.rtb, undefined,
    'so Thrown, Breath and the gazes take no Holy Bonus in CoM2');
  assertEqual(phaseOf({ holyBonus: 3 }, 'holyBonus', 'mom_1.31'), 'a',
    'MoM has no aura pass and keeps Holy Bonus in phase a');
  assertEqual(stepFor({ holyBonus: 3 }, 'holyBonus', 'com_6.08').delta.rtb, 3,
    "CoM 1 writes Holy Bonus to the shared `.ranged` slot, so it reaches Thrown and Breath");
  assertEqual(phaseOf({ resistanceToAll: 2 }, 'resistanceToAll:aura'), 'e',
    'Resistance to All feeds the region-e Prayermaster aura');
  for (const modernVersion of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const misfortune = stepFor({ mislead: true }, 'mislead', modernVersion);
    assertEqual(misfortune.phase, 'e',
      `${modernVersion}: Misfortune is aura type 10 in the region-e aura pass`);
    assertEqual(JSON.stringify(misfortune.writes), JSON.stringify(['atk', 'def', 'res', 'rtb']),
      `${modernVersion}: Misfortune emits one atomic four-stat aura step`);

    const afterClamp = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, atk: 0, def: 0, res: 0,
      rtb: 1, rtbType: 'missile', abilities: { mindStorm: true, mislead: true },
    }));
    assertEqual(afterClamp.atk, -1,
      `${modernVersion}: Misfortune subtracts melee after the terminal zero clamp`);
    assertEqual(afterClamp.def, -1,
      `${modernVersion}: Misfortune subtracts Defense after the terminal zero clamp`);
    assertEqual(afterClamp.res, -1,
      `${modernVersion}: Misfortune subtracts Resistance after the calculator's terminal floor`);
    assertEqual(afterClamp.rtb, -1,
      `${modernVersion}: base Ranged remains eligible when an earlier write and clamp reduce it to zero`);
    const clampIndex = afterClamp.statTrace.findIndex(entry => entry.id === 'clamp');
    const misfortuneIndex = afterClamp.statTrace.findIndex(entry => entry.id === 'mislead');
    assert(clampIndex >= 0 && clampIndex < misfortuneIndex,
      `${modernVersion}: the trace keeps the terminal clamp before Misfortune aura type 10`);

    const beforeSupremeLight = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, atk: 1, def: 1, res: 3,
      rtb: 1, rtbType: 'magic_n', abilities: { mislead: true, supremeLight: true },
    }));
    const supremeIndex = beforeSupremeLight.statTrace
      .findIndex(entry => entry.id === 'supremeLight');
    const preSupremeMisfortuneIndex = beforeSupremeLight.statTrace
      .findIndex(entry => entry.id === 'mislead');
    assert(preSupremeMisfortuneIndex >= 0 && preSupremeMisfortuneIndex < supremeIndex,
      `${modernVersion}: Misfortune remains before Supreme Light in the region-e trace`);
    assertEqual(beforeSupremeLight.def, 0,
      `${modernVersion}: Supreme Light reads Resistance after Misfortune's atomic decrement`);

    const createdRanged = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 0, rtbType: 'none',
      abilities: { focusMagic: true, mislead: true }, modernAttacks: {},
    }));
    assertEqual(createdRanged.modernAttacks.ranged.strength, 3,
      `${modernVersion}: Misfortune does not subtract from Ranged created after the persistent base record`);
    assert(!createdRanged.modernAttacks.ranged.modifierTrace.entries
      .some(entry => entry.id === 'mislead'),
    `${modernVersion}: a created Ranged channel emits no Misfortune ranged trace write`);

    const createdRangedWithHolyBonus = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 0, rtbType: 'none',
      abilities: { focusMagic: true, holyBonus: 2, mislead: true }, modernAttacks: {},
    }));
    assertEqual(createdRangedWithHolyBonus.modernAttacks.ranged.strength, 5,
      `${modernVersion}: F14 preserves other ability steps' calculated-Ranged slot semantics`);
    const createdAuraIds = createdRangedWithHolyBonus.modernAttacks.ranged.modifierTrace.entries
      .map(entry => entry.id);
    assert(createdAuraIds.includes('holyBonus:aura') && !createdAuraIds.includes('mislead'),
      `${modernVersion}: calculated and persistent Ranged gates remain isolated in one aura pass`);

    const hero = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, unitType: 'hero', atk: 2, def: 2, res: 2,
      rtb: 2, rtbType: 'missile', abilities: { mislead: true },
    }));
    assertEqual(hero.atk, 1,
      `${modernVersion}: an eligible live non-Fantastic hero receives Misfortune`);
    assert(hero.statTrace.some(entry => entry.id === 'mislead'),
      `${modernVersion}: an eligible hero emits the atomic Misfortune trace event`);

    const thrown = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 2, rtbType: 'thrown', abilities: { mislead: true },
    }));
    assertEqual(thrown.rtb, 2,
      `${modernVersion}: Misfortune does not subtract from the independent Thrown channel`);

    const fantastic = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, unitType: 'normal', atk: 2, def: 2, res: 2,
      rtb: 2, rtbType: 'missile', abilities: { combatSummoned: true, mislead: true },
    }));
    assertEqual(fantastic.identity.fantastic, true,
      `${modernVersion}: the test subject becomes Fantastic before the aura gate`);
    assertEqual(fantastic.atk, 2,
      `${modernVersion}: Misfortune remains inert on a live Fantastic unit`);
    assert(!fantastic.statTrace.some(entry => entry.id === 'mislead'),
      `${modernVersion}: an ineligible Fantastic unit emits no Misfortune trace event`);
  }
  const linkedMisfortune = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'fantastic_nature', atk: 2, def: 2, res: 2,
    rtb: 2, rtbType: 'missile', abilities: { spiritLink: true, mislead: true },
  }));
  assertEqual(linkedMisfortune.identity.fantastic, false,
    'Warlord Spirit Link clears Fantastic before the Misfortune aura gate');
  assertEqual(linkedMisfortune.atk, 1,
    'A base-Fantastic unit qualifies for Misfortune after Spirit Link makes it live non-Fantastic');
  assertEqual(phaseOf({ spiritLink: true }, 'spiritLink'), 'base',
    'Spirit Link writes +2 Resistance permanently to ABase when cast');

  const animatedModern = stepFor({ animated: true }, 'animated', 'com2_1.05.11');
  assertEqual(animatedModern.delta.nonGazeRtb, 1,
    'Modern Animated targets the conventional Ranged/Thrown/Breath channels');
  assertEqual(animatedModern.delta.rtb, undefined,
    'Modern Animated does not target the independent Gaze fields');
  const blackPrayerModern = stepFor({ blackPrayer: true }, 'blackPrayer', 'com2_1.05.11');
  assertEqual(blackPrayerModern.delta.nonGazeRtb, -1,
    'Modern Black Prayer targets the conventional Ranged/Thrown/Breath channels');
  assertEqual(blackPrayerModern.delta.rtb, undefined,
    'Modern Black Prayer does not target the independent Gaze fields');

  // D24/D25: both engines write Supreme Light and Tactician after their Warp block, and each
  // is emitted as a version-exclusive step rather than as a version predicate.
  assertEqual(phaseOf({ supremeLight: true }, 'supremeLight'), null,
    'Supreme Light is one step in stats.js, not an ability step, outside CoM 1');
  assertEqual(phaseOf({ supremeLight: true }, 'supremeLight:coM1', 'com_6.08'), null,
    "CoM 1's Supreme Light is likewise one step in stats.js");
  const tacticianCoM2 = stepFor({ tactician: true }, 'tactician');
  assertEqual(tacticianCoM2.phase, 'c', 'Tactician is region c (+0x0C890), not a');
  assertEqual(tacticianCoM2.afterWarp, true, 'and it runs after the Warp block');
  const tacticianCoM1 = stepFor({ tactician: true }, 'tactician:coM1', 'com_6.08');
  assertEqual(tacticianCoM1.phase, 'c', "CoM 1's Tactician retort is also region c (0x90AB4)");
  assertEqual(tacticianCoM1.afterWarp, true, 'and also after Warp Creature');
  const tacticianHeroCoM2 = stepFor({ tactician: true, unitType: 'hero' },
    'tactician', 'com2_1.05.11');
  assertEqual(tacticianHeroCoM2.delta.positiveRanged, 2,
    'Modern Tactician hero targets positive live conventional Ranged');
  assertEqual(tacticianHeroCoM2.delta.rtb, undefined,
    'Modern Tactician hero does not target Thrown, Breath, or Gaze');

  const mixedAbilities = {
    artificer: true,
    mechanical: true,
    holyBonus: 2,
    prayer: true,
    rust: true,
    favoredTerrain: true,
  };
  const mixed = ctx.getAbilityStatSteps(mixedAbilities, version);
  const phases = ['base', 'a', 'b', 'c', 'd', 'e'];
  const byPhase = {};
  for (const step of mixed) (byPhase[step.phase] = byPhase[step.phase] || []).push(step);
  assert(Object.keys(byPhase).every(phase => phases.includes(phase)),
    'Every emitted step carries a known phase');
  // Emission is in source order, which is *not* phase order — Artificer is `base` and comes
  // last. Partitioning by phase is therefore the caller's job, not something to be assumed.
  assertEqual(mixed.map(step => step.id).join(','),
    'holyBonus:aura,prayer,rust,favoredTerrain,artificer',
    'Steps are emitted in source order, which the caller partitions by phase');
  assertEqual(mixed.map(step => step.phase).join(','), 'e,c,d,d,base',
    'Emission order is not phase order');
}

function runWarlordUnitAbilityChecks(ctx) {
  const version = 'com2_warlord_1.5.12.7';
  const warlordUnit = (overrides = {}) => baseUnitInput({
    version,
    ...overrides,
    abilities: { outlanderWizard: true, ...(overrides.abilities || {}) },
  });

  const sapiensCount = vm.runInContext(
    "Object.values(WARLORD_UNITS_DATA).filter(u => (u.abilities || []).includes('Sapiens')).length",
    ctx,
  );
  assertEqual(sapiensCount, 31, 'Warlord roster generator emits all 31 Sapiens units');
  // v1.5.12.6.2 added Custom13=14 to Wraiths [170] and Shadow Demons [171], closing the
  // changelog-vs-roster conflict in Source discrepancies.md §5.
  const lateSapiens = vm.runInContext(
    "['Wraiths', 'Shadow Demons'].every(n => Object.values(WARLORD_UNITS_DATA).filter(u => u.name === n).some(u => (u.abilities || []).includes('Sapiens')))",
    ctx,
  );
  assertEqual(lateSapiens, true, 'Wraiths and Shadow Demons are tagged Sapiens');

  const fireGiant = evalInContext(ctx,
    "Object.values(WARLORD_UNITS_DATA).find(u => u.name === 'Fire Giant')");
  assertEqual(fireGiant.hp, 25, 'Warlord 1.5.12.7 Fire Giant HP');
  assertEqual(fireGiant.defense, 8, 'Warlord 1.5.12.7 Fire Giant Armor');
  assertEqual(fireGiant.resist, 9, 'Warlord 1.5.12.7 Fire Giant Resistance');
  assertEqual(fireGiant.to_hit, 20, 'Warlord 1.5.12.7 Fire Giant To-Hit modifier');
  assertEqual(fireGiant.cost, 220, 'Warlord 1.5.12.7 Fire Giant cost');
  assertEqual(fireGiant.upkeep, 6, 'Warlord 1.5.12.7 Fire Giant upkeep');
  assert(fireGiant.abilities.includes('Cold Immunity')
    && fireGiant.abilities.includes('Immolation'),
  'Warlord 1.5.12.7 Fire Giant gains Cold Immunity and Immolation');

  const doomBat = evalInContext(ctx,
    "Object.values(WARLORD_UNITS_DATA).find(u => u.name === 'Doom Bat')");
  assertEqual(doomBat.melee, 12, 'Warlord 1.5.12.7 Doom Bat Melee');
  assertEqual(doomBat.resist, 8, 'Warlord 1.5.12.7 Doom Bat Resistance');
  assertEqual(doomBat.hp, 24, 'Warlord 1.5.12.7 Doom Bat HP');
  assertEqual(doomBat.cost, 150, 'Warlord 1.5.12.7 Doom Bat cost');
  assertEqual(doomBat.upkeep, 3, 'Warlord 1.5.12.7 Doom Bat upkeep');
  assert(doomBat.abilities.includes('First Strike')
    && doomBat.abilities.includes('Cold Immunity'),
  'Warlord 1.5.12.7 Doom Bat gains First Strike and Cold Immunity');

  const wanderer = evalInContext(ctx,
    "Object.values(WARLORD_UNITS_DATA).find(u => u.heroTypeId === 48)");
  assertEqual(wanderer.name, 'Wanderer', 'Warlord hero type 48 is Wanderer');
  const wandererIdentity = ctx.createRosterUnitIdentity(version, wanderer);
  const marionetteUnit = (abilityOverrides = {}, inputOverrides = {}) => warlordUnit({
    name: wanderer.name,
    identity: wandererIdentity,
    unitType: 'hero',
    atk: wanderer.melee,
    rtb: 0,
    rtbType: 'none',
    modernAttacks: {},
    def: wanderer.defense,
    res: wanderer.resist,
    hp: wanderer.hp,
    toHitMod: wanderer.to_hit,
    abilities: {
      channeler: true,
      marionetteBaseSkill: 90,
      marionettePrimary: 'nature',
      ...abilityOverrides,
    },
    ...inputOverrides,
  });
  const ownedMarionette = ctx.deriveUnitStats(marionetteUnit({
    xenoveterinary: true,
    marionetteNatureBooks: 5,
    marionetteSorceryBooks: 5,
    marionetteChaosBooks: 5,
    marionetteLifeBooks: 5,
    marionetteDeathBooks: 5,
  }));
  assertEqual(ownedMarionette.identity.fantastic, true,
    'Channeler turns Wanderer into a live Fantastic unit');
  assertEqual(ownedMarionette.atk, 8, 'Marionette adds floor(Base Skill / 30) melee');
  assertEqual(ownedMarionette.def, 6, 'Marionette adds floor(Base Skill / 50) armor');
  assertEqual(ownedMarionette.modernAttacks.ranged.strength, 3,
    'Marionette creates and boosts its conventional ranged field');
  assertEqual(ownedMarionette.modernAttacks.ranged.type, 'magic_n',
    'Nature-primary Marionette uses Nature magical ranged');
  const focusedMarionette = ctx.deriveUnitStats(marionetteUnit({ focusMagic: true }));
  assertEqual(focusedMarionette.modernAttacks.ranged.strength, 3,
    'Focus Magic overwrites phase-b Marionette ranged when persistent base ranged is empty');
  assertEqual(focusedMarionette.modernAttacks.ranged.type, 'magic_s',
    'Focus Magic empty-base overwrite replaces Marionette ranged with Sorcery');
  assertEqual(ownedMarionette.hp, 15,
    'Channeler Fantastic write makes Wanderer eligible for live-Fantastic Xenoveterinary');
  assertEqual(ownedMarionette.abilities.outlanderXenoveterinary, true,
    'Xenoveterinary derived label is present on a Channeler-owned Marionette');
  assertEqual(ownedMarionette.marionette.spell, 'Web',
    'Unascended Nature Marionette receives Web');
  assertEqual(ownedMarionette.marionette.charges, 3,
    'Unascended Marionette gets 1 + floor(primary books / 2) charges');
  for (const key of [
    'poisonImmunity', 'stoningImmunity', 'largeShield', 'missileImmunity', 'resistMagic',
    'firstStrike', 'fireImmunity', 'lightningResist', 'illusionImmunity', 'lucky',
    'coldImmunity', 'deathImmunity', 'weaponImmunity',
  ]) assertEqual(ownedMarionette.abilities[key], true, `Marionette five-book package grants ${key}`);
  const marionetteTraceIds = ownedMarionette.statTrace.map(step => step.id);
  assert(marionetteTraceIds.indexOf('marionette:stats')
      < marionetteTraceIds.indexOf('outlanderXenoveterinary'),
  'Marionette stat writes precede Xenoveterinary in phase b');

  const strayedMarionette = ctx.deriveUnitStats(marionetteUnit({ channeler: false }));
  assertEqual(strayedMarionette.marionette.state, 'strayed',
    'Wanderer without a current Channeler owner takes the strayed branch');
  assertEqual(strayedMarionette.identity.fantastic, false,
    'Strayed Marionette does not receive the Channeler Fantastic write');
  assertEqual(strayedMarionette.atk, wanderer.melee + 4,
    'Strayed Marionette receives Transmute Equipment and Rebuild melee');
  assertEqual(strayedMarionette.def, wanderer.defense + 4,
    'Strayed Marionette receives Transmute Equipment and Rebuild armor');
  assertEqual(strayedMarionette.res, wanderer.resist + 1,
    'Strayed Marionette receives Transmute Equipment resistance');
  assertEqual(strayedMarionette.rtb, 2,
    'Strayed Marionette receives the unconditional Transmute Equipment ranged-field write');
  assertEqual(strayedMarionette.modernAttacks.ranged.strength, 2,
    'Strayed Transmute Equipment activates Wanderer\'s latent ranged field');
  assertEqual(strayedMarionette.modernAttacks.ranged.type, 'magic_c',
    'Strayed Transmute Equipment retains Wanderer\'s Chaos ranged type 30');
  assertEqual(strayedMarionette.abilities.charmed, true,
    'Strayed Marionette receives persistent Charmed');
  const strayedTraceIds = strayedMarionette.statTrace.map(step => step.id);
  assert(strayedTraceIds.indexOf('marionette:strayedTransmute')
      < strayedTraceIds.indexOf('rebuild'),
  'Strayed Transmute Equipment stats precede Rebuild');
  assertEqual(!!strayedMarionette.abilities.outlanderXenoveterinary, false,
    'Strayed normal Wanderer is not Xenoveterinary-eligible');

  const ascendedSpells = {
    nature: ['Ice Bolt', 'Water Elemental'],
    sorcery: ['Psionic Blast', 'Phantom Beast'],
    chaos: ['Lightning Bolt', 'Fire Elemental'],
    life: ['Exaltation', 'Unicorns'],
    death: ['Syphon Life', 'Werewolves'],
  };
  for (const [realm, spells] of Object.entries(ascendedSpells)) {
    const bookKey = `marionette${realm[0].toUpperCase()}${realm.slice(1)}Books`;
    const ascended = ctx.deriveUnitStats(marionetteUnit({
      marionettePrimary: realm, [bookKey]: 1, marionetteAscension: true,
    }));
    const summoned = ctx.deriveUnitStats(marionetteUnit({
      marionettePrimary: realm, [bookKey]: 1,
      marionetteAscension: true, marionetteConjurer: true,
    }));
    assertEqual(ascended.marionette.spell, spells[0], `${realm} Ascension attack spell`);
    assertEqual(summoned.marionette.spell, spells[1], `${realm} Ascension Conjurer spell`);
    assertEqual(ascended.marionette.charges, 1,
      `${realm} Ascension charges have a minimum of one`);
  }

  const ascNature = ctx.normalizeCombatUnit(ctx.deriveUnitStats(marionetteUnit({
    marionettePrimary: 'nature', marionetteAscension: true,
  })), version);
  assertEqual(ascNature.touchFlagRecords.global.poison, 10,
    'Nature Ascension writes Poison 10 to the general attack record');
  assertEqual(ascNature.touchFlagRecords.global.stoningTouch, -2,
    'Nature Ascension writes Stoning Touch -2 to the general attack record');
  const defenseTarget = ctx.deriveUnitStats(warlordUnit({ def: 8 }));
  const ascSorcery = ctx.deriveUnitStats(marionetteUnit({
    marionettePrimary: 'sorcery', marionetteAscension: true,
  }));
  assertEqual(ctx.computeCasterDefenseForAttack(defenseTarget, ascSorcery, version, 0, 'ranged'), 0,
    'Sorcery Ascension Illusion applies to ranged defense');
  assertEqual(ctx.computeCasterDefenseForAttack(defenseTarget, ascSorcery, version, 0, 'melee'), 0,
    'Sorcery Ascension Illusion is a general attack flag and applies to melee');
  const ascChaos = ctx.deriveUnitStats(marionetteUnit({
    marionettePrimary: 'chaos', marionetteAscension: true,
  }));
  assertEqual(ctx.computeCasterDefenseForAttack(defenseTarget, ascChaos, version, 0, 'ranged'), 4,
    'Chaos Ascension Armor Piercing applies to ranged defense');
  assertEqual(ctx.computeCasterDefenseForAttack(defenseTarget, ascChaos, version, 0, 'melee'), 4,
    'Chaos Ascension Armor Piercing is a general attack flag and applies to melee');
  const ascChaosFive = ctx.normalizeCombatUnit(ctx.deriveUnitStats(marionetteUnit({
    marionettePrimary: 'chaos', marionetteChaosBooks: 5, marionetteAscension: true,
  })), version);
  assertEqual(ascChaosFive.touchFlagRecords.global.destruction, 0,
    'Chaos Ascension at five books writes Destruction 0 to the general attack record');
  const ascLife = ctx.normalizeCombatUnit(ctx.deriveUnitStats(marionetteUnit({
    marionettePrimary: 'life', marionetteAscension: true,
  })), version);
  assertEqual(ascLife.touchFlagRecords.global.exorcise, -4,
    'Life Ascension writes Exorcise -4 to the general attack record');
  assertEqual(ascLife.abilities.bless, true, 'Life Ascension grants Bless');
  const ascDeathFive = ctx.normalizeCombatUnit(ctx.deriveUnitStats(marionetteUnit({
    marionettePrimary: 'death', marionetteDeathBooks: 5, marionetteAscension: true,
  })), version);
  assertEqual(ascDeathFive.abilities.bloodSucker, true,
    'Death Ascension grants Blood Sucker');
  assertEqual(ascDeathFive.touchFlagRecords.global.lifeSteal, -1,
    'Death Ascension at five books writes Life Steal -1 to the general attack record');

  const offVersion = ctx.deriveUnitStats(baseUnitInput({
    ...marionetteUnit().identity,
    version: 'com2_1.05.11',
    identity: { ...wandererIdentity, version: 'com2_1.05.11' },
    unitType: 'hero',
    abilities: { channeler: true, marionetteBaseSkill: 90 },
  }));
  assertEqual(offVersion.marionette, null, 'Marionette package is exact-version scoped');
  assertEqual(offVersion.identity.fantastic, false,
    'Channeler does not transform Wanderer outside Warlord 1.5.12.7');
  for (const otherVersion of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11']) {
    assertEqual(ctx.deriveMarionettePackage(
      { heroTypeId: 48 }, { channeler: true, marionetteBaseSkill: 90 }, otherVersion).package,
    null, `Marionette controls are inert in ${otherVersion}`);
  }
  assertEqual(ctx.deriveMarionettePackage(
    { heroTypeId: 47 }, { channeler: true, marionetteBaseSkill: 90 }, version).package,
  null, 'Marionette controls are inert for every other Warlord hero type');

  const armorclad = ctx.deriveUnitStats(warlordUnit({
    def: 1,
    abilities: { armorcladReform: true, mechanical: true },
  }));
  assertEqual(armorclad.def, 7, 'Armorclad permanently grants +6 Armor');

  const battleArmor = ctx.deriveUnitStats(warlordUnit({
    def: 1,
    abilities: { armorcladReform: true },
  }));
  assertEqual(battleArmor.def, 4, 'Battle Armor grants +3 Armor in combat');

  const blazeWithIronSkin = ctx.deriveUnitStats(warlordUnit({
    atk: 4,
    def: 5,
    abilities: { blazeOfGlory: true, ironSkin: true },
  }));
  assertEqual(blazeWithIronSkin.atk, 14,
    'Blaze of Glory transfers current Armor, including Iron Skin, to melee');
  assertEqual(blazeWithIronSkin.def, 0,
    'Blaze of Glory zeroes current Armor instead of reconstructing enchantment Armor');

  const noOutlanderArmorclad = ctx.deriveUnitStats(baseUnitInput({
    version,
    def: 1,
    abilities: { mechanical: true, armorcladReform: true },
  }));
  assertEqual(noOutlanderArmorclad.def, 1, 'Outlander reforms are inert without an Outlander wizard owner');

  const sapiensReforms = ctx.deriveUnitStats(warlordUnit({
    unitType: 'fantastic_nature',
    res: 1,
    hp: 4,
    rtbType: 'missile',
    rtb: 1,
    abilities: {
      sapiens: true,
      xenopsychology: true,
      radio: true,
      ballisticsTraining: true,
      xenoveterinary: true,
    },
  }));
  assertEqual(sapiensReforms.res, 3, 'Sapiens summons receive Xenopsychology and Radio resistance');
  assertEqual(sapiensReforms.hp, 5, 'Xenoveterinary adds 25% HP to fantastic Sapiens summons');
  assertClose(sapiensReforms.toHitMelee, 0.5, 'Radio and Xenoveterinary each add 10% To-Hit');
  assertClose(sapiensReforms.toHitRtb, 0.7, 'Ballistics Training adds 20% Ranged To-Hit for Sapiens summons');

  const magitekScience = ctx.deriveUnitStats(warlordUnit({
    abilities: { mechanical: true, armorcladReform: true, magitekScience: true },
  }));
  assertEqual(magitekScience.abilities.resistMagic, true, 'Magitek Science grants Resist Magic to Armorclad units');
  const magitekScienceBattleArmor = ctx.deriveUnitStats(warlordUnit({
    abilities: { armorcladReform: true, magitekScience: true },
  }));
  assertEqual(!!magitekScienceBattleArmor.abilities.resistMagic, false,
    'Magitek Science does not grant Resist Magic to Battle Armor units despite the prose claim');

  const militaryDrilling = ctx.deriveUnitStats(warlordUnit({
    level: 'regular',
    def: 1,
    abilities: { militaryDrilling: true },
  }));
  assertEqual(militaryDrilling.abilities.discipline, 'overland', 'Military Drilling gives new non-fantastic units permanent Discipline');
  assertEqual(militaryDrilling.def, 3, 'Military Drilling Discipline applies its Regular +2 Armor bonus');

  const staleDerivedInputs = ctx.deriveUnitStats(warlordUnit({
    def: 1,
    rtbType: 'missile',
    rtb: 3,
    abilities: {
      mechanical: true,
      armorclad: true,
      battleArmor: true,
      blackpowder: true,
      energyCannon: true,
      energyWeaponry: true,
      pneumaField: true,
      powerEngine: true,
      psychoForce: true,
    },
  }));
  assertEqual(staleDerivedInputs.def, 1, 'Derived Armorclad/Battle Armor inputs are ignored');
  assertEqual(staleDerivedInputs.rangedType, 'missile', 'Derived Blackpowder/Energy Cannon inputs are ignored');
  assertEqual(staleDerivedInputs.abilities.powerEngine || false, false, 'Derived Power Engine input is ignored');
  assertEqual(staleDerivedInputs.abilities.lifeSteal == null, true, 'Derived Pneuma Field input is ignored');

  const blackpowderMissile = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 3,
    abilities: { rocketry: true },
  }));
  assertEqual(blackpowderMissile.rangedType, 'boulder', 'Blackpowder converts missile to heavy projectile');
  assertEqual(blackpowderMissile.rtb, 3, 'Blackpowder AP grant does not also add ranged strength');
  assertEqual(blackpowderMissile.abilities.armorPiercing, true, 'Blackpowder grants Armor Piercing');
  assertEqual(blackpowderMissile.abilities.poison, 1, 'Blackpowder grants Poison 1');

  const blackpowderThrownAP = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'thrown',
    rtb: 3,
    abilities: { rocketry: true, armorPiercing: true },
  }));
  assertEqual(blackpowderThrownAP.rtb, 7, 'Blackpowder gives existing-AP Thrown +4 strength');

  const blackpowderFire = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'fire',
    rtb: 3,
    abilities: { rocketry: true },
  }));
  assertEqual(blackpowderFire.rtb, 7, 'Blackpowder gives Fire Breath +4 strength');

  const bombs = ctx.deriveUnitStats(warlordUnit({
    figs: 4,
    rtbType: 'none',
    rtb: 0,
    abilities: { explosive: true },
  }));
  assertEqual(bombs.thrownType, 'thrown', 'Bombs&Grenades grants a Thrown attack');
  assertEqual(bombs.rtb, 6, 'Bombs&Grenades uses floor(8 - max figures / 2)');
  assertEqual(bombs.abilities.wallCrusher, true, 'Bombs&Grenades grants Wall Crusher');

  const bombsAdditive = ctx.deriveUnitStats(warlordUnit({
    figs: 4,
    rtbType: 'thrown',
    rtb: 2,
    abilities: { explosive: true },
  }));
  assertEqual(bombsAdditive.rtb, 8, 'Bombs&Grenades adds to existing Thrown');

  const upgradedRanged = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 3,
    abilities: { rocketry: true, explosive: true },
  }));
  assertEqual(upgradedRanged.rtb, 5, 'Upgraded Explosive gives ranged +2');

  const upgradedFire = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'fire',
    rtb: 3,
    abilities: { rocketry: true, explosive: true },
  }));
  assertEqual(upgradedFire.rtb, 14, 'Explosive doubles Blackpowder-upgraded Fire Breath');

  const upgradedFireBeforeTrueLight = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'fire',
    rtb: 3,
    trueLight: true,
    abilities: { sanctify: true, rocketry: true, explosive: true },
  }));
  assertEqual(upgradedFireBeforeTrueLight.rtb, 14,
    'Warlord True Light leaves the doubled independent Fire Breath channel unchanged');

  const temporalDrive = ctx.deriveUnitStats(warlordUnit({
    def: 4,
    res: 4,
    abilities: {
      mechanical: true,
      sailing: true,
      heatPowerEngine: true,
      temporalEngineering: true,
      mindStorm: true,
    },
  }));
  assertEqual(temporalDrive.abilities.illusionImmunity, true, 'Temporal-Gravity Drive grants Illusion Immunity');
  assertEqual(temporalDrive.def, 4, 'Temporal-Gravity Drive immunity gates Mind Storm defense penalty');
  assertEqual(temporalDrive.res, 4, 'Temporal-Gravity Drive immunity gates Mind Storm resistance penalty');

  const energyCannon = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 5,
    abilities: { mechanical: true, heatPowerEngine: true, energyBeamWeapons: true },
  }));
  assertEqual(energyCannon.rangedType, 'beam', 'Energy Cannon converts ranged projectile to Beam');
  assertEqual(energyCannon.rtb, 7, 'Energy Cannon adds floor(50% base ranged strength)');
  assertEqual(energyCannon.abilities.energyCannonDestruction, -2,
    'Energy Cannon derives ranged-record Destruction from 30% ranged To-Hit');
  assertEqual(energyCannon.abilities.destruction, undefined,
    'Energy Cannon does not leak its derived Destruction into the global touch record');
  const normalizedEnergyCannon = ctx.normalizeCombatUnit(energyCannon, version);
  assertEqual(normalizedEnergyCannon.touchFlagRecords.ranged.destruction, -2,
    'Energy Cannon places derived Destruction on the ranged touch record');
  assertEqual(normalizedEnergyCannon.touchFlagRecords.global.destruction, undefined,
    'Energy Cannon leaves the independent global Destruction channel absent');

  const normalizedEnergyCannonWithGeneral = ctx.normalizeCombatUnit(ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile', rtb: 5,
    abilities: {
      destruction: 0, mechanical: true, heatPowerEngine: true, energyBeamWeapons: true,
    },
  })), version);
  assertEqual(normalizedEnergyCannonWithGeneral.touchFlagRecords.global.destruction, 0,
    'Energy Cannon preserves an independent general Destruction channel');
  assertEqual(normalizedEnergyCannonWithGeneral.touchFlagRecords.ranged.destruction, -2,
    'Energy Cannon keeps its derived ranged Destruction beside independent general Destruction');

  const aimedEnergyCannon = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 5,
    toHitMod: 10,
    toHitRtbMod: 20,
    abilities: { mechanical: true, heatPowerEngine: true, energyBeamWeapons: true },
  }));
  assertEqual(aimedEnergyCannon.abilities.energyCannonDestruction, -3,
    'Energy Cannon snapshots the live 50% common-plus-ranged threshold without double-counting base modifiers');
  const energyThresholdStep = aimedEnergyCannon.statTrace.find(t => t.id === 'chance:energyCannonThreshold');
  assertEqual(energyThresholdStep.changes.energyCannonToHit.to, 50,
    'Energy Cannon records its source-ordered pre-region-e chance snapshot');

  const upgradedEnergyCannon = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 5,
    abilities: {
      heatPowerEngine: true,
      energyBeamWeapons: true,
      rocketry: true,
      armorPiercing: true,
      artificer: true,
      mechanical: true,
    },
  }));
  assertEqual(
    upgradedEnergyCannon.rtb,
    12,
    'Energy Cannon scales earlier permanent Artificer and Blackpowder writes: (5+1+2)+floor(8/2)',
  );

  const noRangedEnergyCannon = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'none', rtb: 0,
    abilities: { mechanical: true, heatPowerEngine: true, energyBeamWeapons: true },
  }));
  assertEqual(!!noRangedEnergyCannon.abilities.energyCannon, false,
    'Energy Cannon inference requires positive permanent conventional Ranged');
  assertEqual(noRangedEnergyCannon.rtb, 0,
    'Energy Cannon does not invent ranged strength without permanent conventional Ranged');

  const dragonMoundCreatesBreath = ctx.deriveUnitStats(warlordUnit({
    identity: {
      version, templateId: null, heroTypeId: null, isHero: false,
      baseRace: 'Draconian', baseFantastic: false, specialUnit: 'none',
    },
    modernAttacks: {}, rtbType: 'none', rtb: 0,
    abilities: { dragonMound: true },
  }));
  assertEqual(dragonMoundCreatesBreath.modernAttacks.fireBreath.strength, 2,
    'Dragon Mound creates independent Fire Breath strength 2 when the field was absent');

  const psychoForce = ctx.deriveUnitStats(warlordUnit({
    level: 'champion',
    res: 4,
    abilities: { psychoConverter: true },
  }));
  assertEqual(psychoForce.res, 7, 'Psycho Force reads current Resistance after level bonus');
  assertClose(psychoForce.toHitMelee, 0.57, 'Psycho Force adds floor(7 * 5 / 2)=17% To-Hit');
  assertClose(psychoForce.toBlock, 0.47, 'Psycho Force adds floor(7 * 5 / 2)=17% To-Defend');

  const pneumaField = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { pneumaReactor: true },
  }));
  assertEqual(pneumaField.abilities.lifeSteal, -2, 'Pneuma Field grants Life Steal from current Resistance');

  const pneumaStacks = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { pneumaReactor: true, lifeSteal: -3 },
  }));
  assertEqual(pneumaStacks.abilities.lifeSteal, -5, 'Pneuma Field stacks with existing negative Life Steal');

  const powerEngine = ctx.deriveUnitStats(warlordUnit({
    abilities: { mechanical: true, heatPowerEngine: true },
  }));
  assertEqual(powerEngine.abilities.powerEngine, true, 'Heat Power Engine derives the Power Engine unit state');

  const magitekEngine = ctx.deriveUnitStats(warlordUnit({
    abilities: { mechanical: true, heatPowerEngine: true, magitekEngineering: true },
  }));
  assertClose(magitekEngine.toBlock, 0.5, 'Magitek Engineering gives Power Engine units +20% To-Defend');
  assertEqual(magitekEngine.abilities.largeShield, true, 'Magitek Engineering gives Power Engine units Large Shield');

  const temporalEngine = ctx.deriveUnitStats(warlordUnit({
    abilities: { mechanical: true, heatPowerEngine: true, temporalEngineering: true },
  }));
  assertEqual(temporalEngine.abilities.haste, true, 'Temporal Engineering gives Power Engine units Haste');

  const ineligibleRocketry = ctx.deriveUnitStats(warlordUnit({
    atk: 3,
    abilities: { rocketry: true },
  }));
  assertEqual(ineligibleRocketry.abilities.poison || 0, 0, 'Rocketry does not grant Blackpowder to a melee-only unit');

  const uphillBattle = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { uphillBattle: true },
  }));
  assertClose(uphillBattle.toHitMelee, 0.4, 'Uphill Battle gives an AI unit +10% To-Hit');
  assertClose(uphillBattle.toBlock, 0.4, 'Uphill Battle gives an AI unit +10% To-Defend');
  assertEqual(uphillBattle.res, 6, 'Uphill Battle gives an AI unit +1 Resistance');

  const godsPlayDices = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { godsPlayDices: -2 },
  }));
  assertEqual(godsPlayDices.res, 3, 'Gods Play Dices applies the fixed per-unit Resistance roll');

  const godsPlayDicesClamped = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { godsPlayDices: 9 },
  }));
  assertEqual(godsPlayDicesClamped.res, 7, 'Gods Play Dices clamps its Resistance roll to +2');

  const scoringOptionsInertOutsideWarlord = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    res: 5,
    abilities: { uphillBattle: true, godsPlayDices: 2 },
  }));
  assertClose(scoringOptionsInertOutsideWarlord.toHitMelee, 0.3, 'Warlord scoring To-Hit is inert outside Warlord');
  assertClose(scoringOptionsInertOutsideWarlord.toBlock, 0.3, 'Warlord scoring To-Defend is inert outside Warlord');
  assertEqual(scoringOptionsInertOutsideWarlord.res, 5, 'Warlord scoring Resistance is inert outside Warlord');
}

function runPhaseChecks(ctx) {
  // F22: Caster.exe doubles only the selected melee/Thrown scratch strength. The
  // finished derived channels remain unchanged, and CoM 1 retains melee-only behavior.
  const bloodLustTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 0, def: 0, hp: 40, unitType: 'normal',
  }));
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 0, def: 0, hp: 10, toHitRtbMod: 70, unitType: 'normal',
      abilities: { bloodLust: true, doomGaze: 4 },
      modernAttacks: {
        thrown: { strength: 3, type: 'thrown' },
        fireBreath: { strength: 3, type: 'fire' },
        lightningBreath: { strength: 3, type: 'lightning' },
      },
    }));
    const result = ctx.resolveCombat(attacker, bloodLustTarget,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
    assertEqual(result.totalDmgToB[16], 1,
      `${version}: Blood Lust doubles only Thrown while both Breaths and Doom Gaze stay undoubled`);
    assertEqual(attacker.modernAttacks.thrown.strength, 3,
      `${version}: Blood Lust does not write the doubled Thrown strength into derived stats`);
    assertEqual(attacker.modernAttacks.fireBreath.strength, 3,
      `${version}: the resolution scratch does not leak into a later channel`);
  }

  const fantasticTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 0, def: 0, hp: 20,
    identity: ctx.createCustomUnitIdentity('com2_1.05.11', {
      isHero: false, baseRace: 'Nature', baseFantastic: true,
    }),
  }));
  const fantasticAttacker = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, def: 0, hp: 10, toHitMod: 70, toHitRtbMod: 70,
    abilities: { bloodLust: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  }));
  const fantasticResult = ctx.resolveCombat(fantasticAttacker, fantasticTarget,
    { version: 'com2_1.05.11', isRanged: false, wallOfFire: false, distance: 1 });
  assertEqual(fantasticResult.totalDmgToB[4], 1,
    'Modern Blood Lust does not double melee or Thrown against a Fantastic defender');

  const com1Attacker = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', atk: 1, rtb: 3, rtbType: 'thrown', def: 0, hp: 10,
    toHitMod: 70, toHitRtbMod: 70, abilities: { bloodLust: true },
  }));
  const com1Target = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', atk: 0, def: 0, hp: 20, unitType: 'normal',
  }));
  const com1Result = ctx.resolveCombat(com1Attacker, com1Target,
    { version: 'com_6.08', isRanged: false, wallOfFire: false, distance: 1 });
  assertEqual(com1Result.totalDmgToB[5], 1,
    'CoM 1 Blood Lust doubles melee but leaves Thrown undoubled');

  for (const type of ['missile', 'magic_c']) {
    const rangedAttacker = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_1.05.11', atk: 0, def: 0, hp: 10, toHitRtbMod: 70,
      abilities: { bloodLust: true },
      modernAttacks: { ranged: { strength: 3, type } },
    }));
    const rangedResult = ctx.resolveCombat(rangedAttacker, bloodLustTarget,
      { version: 'com2_1.05.11', isRanged: true, wallOfFire: false, distance: 1 });
    assertEqual(rangedResult.totalDmgToB[3], 1,
      `Modern Blood Lust does not double ${type === 'missile' ? 'physical' : 'magical'} conventional ranged`);
  }

  // R3.3: Caster.exe's independent attack fields must survive the legacy card's single
  // RTB projection. Three deterministic coexisting channels produce three separate attacks.
  const modernChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, rtb: 0, rtbType: 'none', def: 0, hp: 10,
    toHitRtbMod: 70,
    modernAttacks: {
      thrown: { strength: 1, type: 'thrown' },
      fireBreath: { strength: 1, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));
  const channelTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, rtb: 0, rtbType: 'none', def: 0, hp: 10,
  }));
  const channelCombat = ctx.resolveCombat(modernChannels, channelTarget,
    { version: 'com2_1.05.11', isRanged: false, wallOfFire: false });
  assertClose(channelCombat.totalDmgToB[3], 0.7,
    'Modern Thrown, Fire Breath, and Lightning Breath coexist instead of using the RTB projection');
  assertEqual(channelCombat.phases.filter(p => /Breath|Thrown/.test(p.label)).length, 3,
    'Modern coexistence produces one phase per independent channel');

  // R3.4: cover the complete modern roster boundary, not just a hand-authored fixture.
  // Every source channel must make it through derivation; every non-ranged channel must
  // surface as a melee phase, and a conventional ranged channel must remain selectable.
  const typeMap = { Missile: 'missile', Boulder: 'boulder', 'Magic(C)': 'magic_c', 'Magic(N)': 'magic_n', 'Magic(S)': 'magic_s' };
  const warlordRoster = Object.values(evalInContext(ctx, 'WARLORD_UNITS_DATA'));
  const multiChannelRoster = warlordRoster.filter(unit =>
    ['ranged', 'thrown', 'fire_breath', 'lightning_breath'].filter(key => Number(unit[key]) > 0).length > 1);
  assertEqual(multiChannelRoster.length, 29, 'Warlord roster contains the expected multi-channel units');
  for (const unit of multiChannelRoster) {
    const records = {
      ranged: unit.ranged ? { strength: unit.ranged, type: typeMap[unit.ranged_type] } : null,
      thrown: unit.thrown ? { strength: unit.thrown, type: 'thrown' } : null,
      fireBreath: unit.fire_breath ? { strength: unit.fire_breath, type: 'fire' } : null,
      lightningBreath: unit.lightning_breath ? { strength: unit.lightning_breath, type: 'lightning' } : null,
    };
    const projection = records.ranged || records.thrown || records.fireBreath || records.lightningBreath;
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.7', figs: unit.figures, atk: unit.melee,
      rtb: projection.strength, rtbType: projection.type, def: unit.defense,
      res: unit.resist, hp: unit.hp, toHitRtbMod: 70, modernAttacks: records,
    }));
    const expectedKeys = Object.keys(records).filter(key => records[key]);
    assertEqual(Object.keys(attacker.modernAttacks).length, expectedKeys.length,
      `${unit.name} retains every source attack channel during derivation`);
    const melee = ctx.resolveCombat(attacker, channelTarget,
      { version: 'com2_warlord_1.5.12.7', isRanged: false, wallOfFire: false });
    const expectedMeleeChannels = expectedKeys.filter(key => key !== 'ranged').length;
    assertEqual((melee.phases || []).filter(p => /Breath|Thrown/.test(p.label)).length, expectedMeleeChannels,
      `${unit.name} resolves every non-ranged channel`);
    if (records.ranged) {
      const ranged = ctx.resolveCombat(attacker, channelTarget,
        { version: 'com2_warlord_1.5.12.7', isRanged: true, wallOfFire: false });
      assert(ranged.totalDmgToB.some((p, damage) => damage > 0 && p > 1e-15),
        `${unit.name} resolves its independent conventional ranged channel`);
    }
  }

  // B7: DOS uses the ranged attack-attribute record for every non-melee call. These
  // normalized record-only fixtures isolate placement from the common roster flags.
  const routedDosTouch = ({ version = 'mom_cp_1.60.00', atk = 1, rtb = 0,
                            rtbType = 'none', isRanged = false, record = 'ranged' }) => {
    const dosTouchTarget = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', figs: 1, atk: 0, def: 1, res: 0,
      hp: 10, toBlkMod: 70, abilities: { deathImmunity: true },
    }));
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk, rtb, rtbType, def: 0, hp: 10,
      toHitMod: 70, toHitRtbMod: 70,
    }));
    attacker.touchFlagRecords = {
      global: {}, melee: {}, ranged: {},
    };
    attacker.touchFlagRecords[record].stoningTouch = -10;
    return ctx.resolveCombat(attacker, dosTouchTarget, {
      version, isRanged, wallOfFire: false, distance: 1,
    });
  };
  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    assertEqual(routedDosTouch({ version, record: 'melee' }).totalDmgToB[10], 1,
      `B7 ${version} melee call merges the melee touch record`);
    assertEqual(routedDosTouch({ version, record: 'ranged' }).totalDmgToB[0], 1,
      `B7 ${version} melee call excludes a ranged-only touch record`);
    for (const scenario of [
      { label: 'ordinary ranged', rtb: 1, rtbType: 'missile', isRanged: true },
      { label: 'Thrown', rtb: 1, rtbType: 'thrown' },
      { label: 'Fire Breath', rtb: 1, rtbType: 'fire' },
      { label: 'Lightning Breath', rtb: 1, rtbType: 'lightning' },
      { label: 'Stoning Gaze', rtb: 1, rtbType: 'gaze_stoning' },
      { label: 'Multiple Gaze', rtb: 1, rtbType: 'gaze_multiple' },
      { label: 'Death Gaze', rtb: 1, rtbType: 'gaze_death' },
    ]) {
      const result = routedDosTouch({ version, ...scenario, record: 'ranged' });
      assertEqual(result.totalDmgToB[10], 1,
        `B7 ${version} ${scenario.label} call merges the shared ranged touch record`);
    }
  }

  const dosChannelModifier = key => {
    const version = 'mom_cp_1.60.00';
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 1, def: 0, hp: 10, toHitMod: 70,
    }));
    attacker.touchFlagRecords = { global: {}, melee: {}, ranged: {} };
    attacker.touchFlagRecords.melee[key] = 0;
    const target = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', atk: 0, def: 1, res: 9, hp: 10, toBlkMod: 70,
    }));
    return ctx.resolveCombat(attacker, target,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
  };
  assertClose(dosChannelModifier('stoningTouch').totalDmgToB[10], 0.2,
    'B7 DOS channel-carried Stoning Touch receives an additional -1 save modifier');
  assertClose(dosChannelModifier('deathTouch').totalDmgToB[10], 0.4,
    'B7 DOS channel-carried Death Touch receives an additional -3 save modifier');

  const zeroStrengthThrownTouch = version => {
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 1, rtb: 1, rtbType: 'thrown', def: 0, hp: 10,
      toHitMod: 70, toHitRtbMod: 70,
    }));
    attacker.rtb = 0;
    attacker.touchFlagRecords = { global: {}, melee: {}, ranged: { stoningTouch: -10 } };
    const target = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', atk: 0, def: 1, res: 0, hp: 10, toBlkMod: 70,
    }));
    return ctx.resolveCombat(attacker, target,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
  };
  assertEqual(zeroStrengthThrownTouch('mom_1.31').totalDmgToB[0], 1,
    'B7 MoM 1.31 does not admit a zero-live-strength Thrown call');
  for (const version of ['mom_cp_1.60.00', 'com_6.08']) {
    assertEqual(zeroStrengthThrownTouch(version).totalDmgToB[10], 1,
      `B7 ${version} patched zero-strength Thrown call still dispatches its ranged record`);
  }

  // The zero-strength abort is a distinct 1.31-only dispatcher gate. A gaze can admit
  // combat for a zero-melee attacker; CP then dispatches the common touch on both calls,
  // while 1.31 discards the zero-strength melee call's rider.
  const zeroMeleeGazeTouch = version => {
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 0, rtb: 1, rtbType: 'gaze_death', def: 0, hp: 10,
      toHitRtbMod: 70, abilities: { stoningTouch: -10 },
    }));
    const target = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', figs: 2, atk: 0, def: 1, res: 0, hp: 10,
      toBlkMod: 70, abilities: { deathImmunity: true },
    }));
    return ctx.resolveCombat(attacker, target,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
  };
  assertEqual(zeroMeleeGazeTouch('mom_1.31').totalDmgToB[10], 1,
    'B7 MoM 1.31 zero-strength melee abort leaves only the gaze-carried common touch');
  assertEqual(zeroMeleeGazeTouch('mom_cp_1.60.00').totalDmgToB[20], 1,
    'B7 CP 1.60 patched abort lets the common touch fire on gaze and zero-strength melee');

  assertEqual(ctx.buildWallOfFirePhase(false, {}), null, 'Inactive Wall of Fire phase is null');
  const wallOfFire = ctx.buildWallOfFirePhase(true, {
    wofStr: 1,
    wofToHit: 1,
    aDefForImm: 0,
    aToBlock: 0,
    aHP: 1,
    aInvulnBonus: null,
  });
  const wofResult = wallOfFire.compute(0, 2, 2);
  assertDistSumsToOne(wofResult.dist, 'Wall of Fire distribution');
  assertEqual(wofResult.dist[2], 1, 'Wall of Fire deterministic smoke damage');
  assertEqual(wofResult.lifeStealEV, 0, 'Wall of Fire has no life steal');

  assertEqual(ctx.buildThrownPhase(false, {}), null, 'Inactive thrown phase is null');
  const thrown = ctx.buildThrownPhase(true, {
    a: { rtb: 2, hp: 1, toHitImmolation: 0.3 },
    b: { hp: 3 },
    aDoomsB: true,
    aBlackSleep: false,
    aToHitRtbVert: 0.3,
    bDefForThrown: 0,
    bToBlockVsAThrEW: 0,
    bInvulnBonus: null,
    bBlurChance: 0,
    blurBuggy: false,
    isCoM2: false,
    aMinDamageFromHits: null,
    aImmWithThrown: false,
    immStr: 0,
    bDefForImm: 0,
    bToBlockVsAAll: 0,
    aPoisonStrT: 0,
    aPoisonFailT: 0,
    aStoningFailT: 0,
    aLifeStealModT: null,
    bResDeath: 0,
    aHaste: false,
  });
  const thrownResult = thrown.compute(2, 2, 5);
  assertDistSumsToOne(thrownResult.dist, 'Thrown doom distribution');
  assertEqual(thrownResult.dist[4], 1, 'Thrown doom smoke damage');
  assertEqual(thrownResult.lifeStealEV, 0, 'Thrown doom without touch attacks has no life steal');

  const hastedThrown = ctx.buildThrownPhase(true, {
    a: { rtb: 1, hp: 1, toHitImmolation: 0.3 },
    b: { hp: 3 },
    aDoomsB: true,
    aBlackSleep: false,
    aToHitRtbVert: 0.3,
    bDefForThrown: 0,
    bToBlockVsAThrEW: 0,
    bInvulnBonus: null,
    bBlurChance: 0,
    blurBuggy: false,
    isCoM2: false,
    aMinDamageFromHits: null,
    aImmWithThrown: false,
    immStr: 0,
    bDefForImm: 0,
    bToBlockVsAAll: 0,
    aPoisonStrT: 0,
    aPoisonFailT: 0,
    aStoningFailT: 0,
    aLifeStealModT: null,
    bResDeath: 0,
    aHaste: true,
  });
  const hastedThrownResult = hastedThrown.compute(2, 2, 5);
  assertDistSumsToOne(hastedThrownResult.dist, 'Hasted thrown doom distribution');
  assertEqual(hastedThrownResult.dist[4], 1, 'Hasted thrown self-convolves damage');
}

// The step runner (Calculator/steps.js) — R1's single stat-derivation mechanism.
// Asserted directly rather than only through the stats it will carry, because the
// migration relies on three of its properties: phase order, stable within-phase order,
// and the write check that catches a step writing a field it did not declare.
function runStatStepChecks(ctx) {
  const HALT = evalInContext(ctx, 'HALT');
  const step = (id, phase, writes, apply, extra) =>
    ctx.statStep({ id, phase, writes, apply, ...(extra || {}) });

  // A step reads the field's current value at its own position, so a later halving sees
  // everything the earlier additions wrote — the property the bucket model cannot express.
  const unit = { res: 2 };
  ctx.runStatSteps([
    step('add', 'a', ['res'], u => { u.res += 5; }),
    step('halve', 'c', ['res'], u => { u.res = Math.floor(u.res / 2); }),
  ], unit, { version: 'com2_1.05.11' });
  assertEqual(unit.res, 3, 'A later step reads what earlier steps wrote');

  // List order is execution order; phase only has to be non-decreasing along it.
  let misordered = null;
  try {
    ctx.runStatSteps([
      step('spell', 'c', ['res'], u => { u.res += 1; }),
      step('intrinsic', 'a', ['res'], u => { u.res += 1; }),
    ], { res: 0 }, { validateWrites: true });
  } catch (err) {
    misordered = String(err.message);
  }
  assert(misordered && misordered.includes('is declared after'),
    'A sequence authored out of phase order is rejected');

  const skipped = { res: 0 };
  ctx.runStatSteps([
    step('inactive', 'a', ['res'], u => { u.res += 1; }, { when: () => false }),
    step('active', 'a', ['res'], u => { u.res += 2; }, { when: () => true }),
  ], skipped, {});
  assertEqual(skipped.res, 2, 'A step whose predicate is false does not run');

  const halted = { res: 0, def: 0 };
  ctx.runStatSteps([
    step('bonus', 'a', ['res'], u => { u.res += 1; }),
    step('illusion', 'a', ['def'], () => HALT),
    step('unreached', 'a', ['res'], u => { u.res += 100; }),
  ], halted, {});
  assertEqual(halted.res, 1, 'HALT stops the sequence');

  const base = Object.freeze({ def: 4 });
  const reader = { def: 99 };
  ctx.runStatSteps([
    step('holyArmor', 'c', ['def'], (u, c) => { u.def = c.base.def + 2; }),
  ], reader, { base });
  assertEqual(reader.def, 6, 'A step reads the permanent base record through ctx.base');

  const trace = [];
  ctx.runStatSteps([
    step('silent', 'a', ['res'], () => {}),
    step('warpResist', 'c', ['res'], u => { u.res = 0; }),
  ], { res: 7 }, { trace });
  assertEqual(trace.length, 1, 'Only steps that change a field are traced');
  assertEqual(trace[0].id, 'warpResist', 'Trace names the step');
  assertEqual(trace[0].source.id, 'warpResist', 'Trace identifies the transform source');
  assertEqual(trace[0].changes.res.delta, -7, 'Trace records the delta');

  let undeclared = null;
  try {
    ctx.runStatSteps([
      step('sloppy', 'a', ['res'], u => { u.res += 1; u.def += 1; }),
    ], { res: 0, def: 0 }, { validateWrites: true });
  } catch (err) {
    undeclared = String(err.message);
  }
  assert(undeclared && undeclared.includes('undeclared field def'),
    'validateWrites catches a step writing a field it did not declare');

  let rejected = null;
  try {
    ctx.statStep({ id: 'nowhere', phase: 'z', writes: ['res'], apply: () => {} });
  } catch (err) {
    rejected = String(err.message);
  }
  assert(rejected && rejected.includes('unknown phase'), 'statStep rejects an unknown phase');

  // The sequence is assembled from two places, so a colliding id has to fail rather than
  // quietly make the trace ambiguous.
  let collided = null;
  try {
    ctx.runStatSteps([
      step('lionheart', 'c', ['res'], u => { u.res += 1; }),
      step('lionheart', 'c', ['res'], u => { u.res += 1; }),
    ], { res: 0 }, { validateWrites: true });
  } catch (err) {
    collided = String(err.message);
  }
  assert(collided && collided.includes('declared twice'),
    'A sequence with two steps sharing an id is rejected');
}

function runModifierTraceChecks(ctx) {
  const traced = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    identity: ctx.createCustomUnitIdentity('com2_warlord_1.5.12.7', {
      baseRace: 'High Men', specialUnit: 'chosen',
    }),
    atk: 5,
    rtb: 4,
    rtbType: 'missile',
    def: 6,
    res: 8,
    hp: 7,
    level: 'elite',
    weapon: 'mithril',
    toHitMod: 5,
    abilities: { lucky: true, highPrayer: true, warpAttack: true, vertigo: true },
    modernAttacks: {
      ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 2, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));

  for (const [name, trace] of Object.entries(traced.modifierTraces)) {
    if (name === 'modernAttacks') continue;
    assert(trace && Array.isArray(trace.entries), `${name} exposes a projected modifier trace`);
    let running = trace.base;
    for (const entry of trace.entries) {
      assert(entry.source && typeof entry.source.id === 'string' && entry.source.id.length > 0,
        `${name} trace entry identifies its source`);
      assertEqual(entry.from, running, `${name} trace carries a continuous running before value`);
      running = entry.to;
    }
    assertEqual(running, trace.result, `${name} trace finishes at its displayed result`);
  }

  const meleeSources = traced.modifierTraces.melee.entries.map(entry => entry.source.id);
  assert(meleeSources.indexOf('level') < meleeSources.indexOf('weapon'),
    'Melee trace keeps level before weapon execution order');
  assert(meleeSources.indexOf('weapon') < meleeSources.indexOf('highPrayer'),
    'Melee trace keeps weapon before the later High Prayer write');
  assert(meleeSources.indexOf('highPrayer') < meleeSources.indexOf('warpAttack'),
    'Melee trace keeps High Prayer before Warp Attack');

  const chanceSources = traced.modifierTraces.toHitMelee.entries.map(entry => entry.source.id);
  assertEqual(chanceSources[0], 'baseToHitMelee',
    'To Hit trace starts with the editable base modifier when it is active');
  assert(chanceSources.indexOf('level') < chanceSources.indexOf('weapon'),
    'To Hit trace keeps level before weapon');
  assert(chanceSources.indexOf('weapon') < chanceSources.indexOf('lucky'),
    'To Hit trace keeps weapon before Lucky in this engine sequence');
  assert(chanceSources.indexOf('highPrayer') < chanceSources.indexOf('vertigo'),
    'Displayed To Hit trace keeps High Prayer before the later recalculation-time Vertigo write');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const raisedBeforeHolyArmor = ctx.deriveUnitStats(baseUnitInput({
      version, def: 1,
      abilities: {
        holyArmor: true, discipline: 'overland', animated: true,
        mysticSurge: true, ironSkin: true, landLinking: true,
      },
    }));
    assertEqual(raisedBeforeHolyArmor.def, 12,
      `${version}: every represented earlier Defense writer contributes before Holy Armor`);
    assertClose(raisedBeforeHolyArmor.toBlock, 0.4,
      `${version}: earlier Defense writers can select Holy Armor's To Defend branch`);
    const earlierWriterIds = raisedBeforeHolyArmor.statTrace.map(entry => entry.id);
    const holyArmorIndex = earlierWriterIds.indexOf('holyArmor');
    for (const earlierId of ['discipline', 'animated', 'mysticSurge', 'ironSkin', 'landLinking']) {
      assert(earlierWriterIds.indexOf(earlierId) < holyArmorIndex,
        `${version}: ${earlierId} trace precedes Holy Armor's live Defense read`);
    }

    const raisedAfterHolyArmor = ctx.deriveUnitStats(baseUnitInput({
      version, def: 4, abilities: { holyArmor: true, highPrayer: true },
    }));
    assertEqual(raisedAfterHolyArmor.def, 8,
      `${version}: Holy Armor takes its +2 Defense branch before High Prayer raises Defense`);
    assertClose(raisedAfterHolyArmor.toBlock, 0.4,
      `${version}: later High Prayer cannot change Holy Armor's To Defend outcome`);
    const raisedIds = raisedAfterHolyArmor.statTrace.map(entry => entry.id);
    assert(raisedIds.indexOf('holyArmor') < raisedIds.indexOf('highPrayer'),
      `${version}: Holy Armor trace precedes the later combat-global Defense write`);

    const loweredAfterHolyArmor = ctx.deriveUnitStats(baseUnitInput({
      version, def: 6, abilities: { holyArmor: true, blackPrayer: true },
    }));
    assertEqual(loweredAfterHolyArmor.def, 5,
      `${version}: Holy Armor takes its To Defend branch before Black Prayer lowers Defense`);
    assertClose(loweredAfterHolyArmor.toBlock, 0.4,
      `${version}: later Black Prayer cannot change Holy Armor's To Defend outcome`);
    const loweredIds = loweredAfterHolyArmor.statTrace.map(entry => entry.id);
    assert(loweredIds.indexOf('holyArmor') < loweredIds.indexOf('blackPrayer'),
      `${version}: Holy Armor trace precedes the later curse Defense write`);

    const postThresholdOrder = ctx.deriveUnitStats(baseUnitInput({
      version, def: 6, hp: 8, armor: 'orihalcon', rtb: 2, rtbType: 'magic_n',
      abilities: {
        holyArmor: true, holyWeapon: true, highPrayer: true,
        reinforceMagic: true, charmOfLife: true, weakness: true,
      },
    })).statTrace.map(entry => entry.id);
    assert(postThresholdOrder.indexOf('holyArmor') < postThresholdOrder.indexOf('orihalcon')
        && postThresholdOrder.indexOf('orihalcon')
          < postThresholdOrder.indexOf('chance:holyWeapon:melee')
        && postThresholdOrder.indexOf('chance:holyWeapon:melee')
          < postThresholdOrder.indexOf('highPrayer'),
    `${version}: post-threshold order is Holy Armor, Orihalcon, Holy Weapon, then globals`);
    const representativeLaterIds = ['reinforceMagic:ranged', 'charmOfLife', 'weakness:ranged'];
    let previousLaterIndex = postThresholdOrder.indexOf('chance:holyWeapon:melee');
    for (const laterId of representativeLaterIds) {
      const laterIndex = postThresholdOrder.indexOf(laterId);
      assert(previousLaterIndex < laterIndex,
        `${version}: ${laterId} remains on the ordered post-Holy-Armor side`);
      previousLaterIndex = laterIndex;
    }
    const physicalLaterOrder = ctx.deriveUnitStats(baseUnitInput({
      version, def: 6, hp: 8, rtb: 2, rtbType: 'missile',
      abilities: {
        holyArmor: true, holyWeapon: true,
        charmOfLife: true, blazingMarch: true, weakness: true,
      },
    })).statTrace.map(entry => entry.id);
    assert(physicalLaterOrder.indexOf('chance:holyWeapon:melee')
        < physicalLaterOrder.indexOf('charmOfLife')
        && physicalLaterOrder.indexOf('charmOfLife')
          < physicalLaterOrder.indexOf('blazingMarch:ranged')
        && physicalLaterOrder.indexOf('blazingMarch:ranged')
          < physicalLaterOrder.indexOf('weakness:ranged'),
    `${version}: explicit global, combat-global, and curse pieces follow Holy Weapon in order`);
  }

  assertEqual(traced.modifierTraces.fantastic.entries[0].source.id, 'identity:chosen',
    'Boolean identity trace attributes the live Fantastic write');
  assertEqual(traced.modifierTraces.race.entries[0].source.id, 'identity:chosen',
    'Identity trace attributes the live race write');

  const rangedDistanceTraceUnit = ctx.deriveUnitStats(baseUnitInput({
    prefix: 'a', version: 'com2_1.05.11',
    rtb: 4, rtbType: 'missile', rangedCheck: true, rangedDist: 4,
  }));
  const distanceEntry = rangedDistanceTraceUnit.modifierTraces.toHitRanged.entries
    .find(t => t.id === 'chance:distancePenalty');
  assertEqual(distanceEntry.from, 30,
    'Range trace starts from the current percentage-point value');
  assertEqual(distanceEntry.to, 20,
    'CoM2 range four applies a ten-percentage-point trace penalty');
  assertEqual(rangedDistanceTraceUnit.modifierTraces.toHitRanged.result, 20,
    'Distance-enabled ranged derivation completes at the displayed percentage');

  const lowBlockZombies = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', toBlkMod: -20,
    identity: ctx.createCustomUnitIdentity('com_6.08', { specialUnit: 'zombies' }),
  }));
  assertClose(lowBlockZombies.displayToBlock, 0.1,
    'Negative base To Block plus Zombies retains the production ten-percent floor');
  assertEqual(lowBlockZombies.modifierTraces.toBlock.result, 10,
    'To Block trace uses the same initial ten-percent floor');
  assertEqual(lowBlockZombies.modifierTraces.toBlock.entries.slice(-1)[0].id, 'chance:legacyClamp',
    'The initial To Block clamp records the floor when it changes the running value');

  const cappedPlague = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', toHitMod: -20,
    abilities: { plague: true },
  }));
  const cappedSources = cappedPlague.modifierTraces.toHitMelee.entries.map(t => t.id);
  assert(cappedSources.includes('chance:plague'),
    'Active Plague writes the signed common chance before the region-e floor');
  assert(cappedSources.indexOf('chance:plague') < cappedSources.indexOf('chance:modernClampCommon'),
    'Plague precedes the modern common-Hit clamp in the projected trace');
  assertEqual(cappedPlague.modifierTraces.toHitMelee.result, 10,
    'The later region-e clamp restores the displayed To Hit floor');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const twoStage = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 1, rtbType: 'missile',
      toHitMod: -50, toHitRtbMod: -40, toBlkMod: -40,
    }));
    assertClose(twoStage.toHitMelee, 0.1,
      `${version}: common Hit is clamped to ten percent before channel modifiers`);
    assertClose(twoStage.toHitRtb, 0.2,
      `${version}: the positive ranged channel survives the earlier common-Hit clamp`);
    assertClose(twoStage.toBlock, 0,
      `${version}: modern To Defend is carried on the record without a ten-percent clamp`);
    const signedBlockWrites = twoStage.statTrace.filter(t => t.changes.toBlk);
    assertEqual(signedBlockWrites[signedBlockWrites.length - 1].changes.toBlk.to, -10,
      `${version}: the authoritative modern To Defend record retains its signed value`);
    assertEqual(twoStage.modifierTraces.toBlock.entries.slice(-1)[0].id,
      'chance:toBlockProbabilityBound',
      `${version}: only the DefenseRoll probability projection bounds signed To Defend`);
    const orderedClamp = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 1, rtbType: 'missile', toHitMod: -50, toHitRtbMod: 100,
    }));
    const commonClamp = orderedClamp.statTrace.findIndex(t => t.id === 'chance:modernClampCommon');
    const channelClamp = orderedClamp.statTrace.findIndex(t => t.id === 'chance:clamp');
    assert(commonClamp >= 0 && commonClamp < channelClamp,
      `${version}: the ordered record clamps common Hit before attack-channel Hit`);
  }

  const recoveringBlock = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', toBlkMod: -40,
    abilities: {
      outlanderWizard: true, mechanical: true, heatPowerEngine: true,
      magitekEngineering: true, radio: true,
    },
  }));
  assertClose(recoveringBlock.toBlock, 0.2,
    'Warlord phase-b To Defend bonuses recover from the signed base record without an intermediate floor');
  const recoveringBlockIds = recoveringBlock.statTrace.filter(t => t.changes.toBlk).map(t => t.id);
  assert(recoveringBlockIds.indexOf('magitekEngine') < recoveringBlockIds.indexOf('outlanderRadio'),
    'Warlord To Defend writes retain UnitCalcPre source order');

  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const highLegacy = ctx.deriveUnitStats(baseUnitInput({
      version, toHitMod: 70, abilities: { lucky: true },
    }));
    assertClose(highLegacy.toHitMelee, 1,
      `${version}: legacy terminal normalization clamps the effective common-plus-melee threshold`);
    const lowLegacy = ctx.deriveUnitStats(baseUnitInput({
      version, toHitMod: -20, warpReality: true,
    }));
    assertClose(lowLegacy.toHitMelee, 0.1,
      `${version}: legacy terminal normalization preserves the effective ten-percent floor after common penalties`);
  }

  const tracedDestiny = ctx.deriveUnitStats(baseUnitInput({
    abilities: { destiny: true },
    level: 'champion',
    rtbType: 'missile',
    atk: 3, rtb: 2, def: 1, res: 4, hp: 2,
  }));
  const destinyWrites = [
    ['melee', 3, 6],
    ['sharedAttack', 2, 4],
    ['defense', 1, 5],
    ['resistance', 4, 8],
    ['hits', 2, 4],
  ];
  for (const [field, from, to] of destinyWrites) {
    const trace = tracedDestiny.modifierTraces[field];
    assertEqual(trace.base, from, `Destiny ${field} trace starts at the editable value`);
    assertEqual(trace.entries.length, 1, `Destiny ${field} is one independently attributed write`);
    assertEqual(trace.entries[0].source.id, 'destiny', `Destiny owns the ${field} write`);
    assertEqual(trace.entries[0].source.label, 'Destiny', `Destiny labels the ${field} source`);
    assertEqual(trace.entries[0].from, from, `Destiny ${field} records its running before value`);
    assertEqual(trace.entries[0].to, to, `Destiny ${field} records its running after value`);
    assertEqual(trace.result, to, `Destiny ${field} trace reaches the derived result`);
  }

  const permanentSourceCases = [
    [
      'Chaos Channels', 'chaosChannels:fireBreath',
      baseUnitInput({ version: 'com2_1.05.11', abilities: { ccFireBreath: true } }), 0, 4,
    ],
    [
      'Lightning Blade', 'lightningBlade:breath',
      baseUnitInput({ version: 'com2_warlord_1.5.12.7', abilities: { lightningBlade: true } }), 0, 1,
    ],
    [
      'Focus Magic', 'focusMagic:conversion',
      baseUnitInput({ version: 'com2_1.05.11', abilities: { focusMagic: true } }), 0, 3,
    ],
  ];
  for (const [label, sourceId, input, from, to] of permanentSourceCases) {
    const trace = ctx.deriveUnitStats(input).modifierTraces.sharedAttack;
    assertEqual(trace.entries[0].source.id, sourceId, `${label} owns its ordered shared-attack write`);
    assertEqual(trace.entries[0].from, from, `${label} records the editable running value`);
    assertEqual(trace.entries[0].to, to, `${label} records the ordered running value`);
  }

  const destinyAfterPermanent = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', race: 'Goblin',
    atk: 3, rtb: 2, rtbType: 'missile',
    abilities: { motherFungus: true, destiny: true },
  }));
  assertEqual(destinyAfterPermanent.atk, 10,
    'Destiny doubles melee after the permanent Mother Fungus write');
  assertEqual(destinyAfterPermanent.rtb, 8,
    'Destiny doubles ranged after the permanent Mother Fungus write');
  const destinyOrderedIds = destinyAfterPermanent.statTrace.map(entry => entry.id);
  assert(destinyOrderedIds.indexOf('motherFungus') < destinyOrderedIds.indexOf('destiny'),
    'Destiny follows every permanent base write in the ordered trace');

  const destinyAfterEarlyHook = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 3, rtb: 2, rtbType: 'missile',
    abilities: { luckyStar: true, destiny: true },
  }));
  assertEqual(destinyAfterEarlyHook.atk, 8,
    'Destiny doubles the phase-b Lucky Star melee write at its compiled position');
  assertEqual(destinyAfterEarlyHook.rtb, 6,
    'Destiny doubles the phase-b Lucky Star ranged write at its compiled position');
  const earlyHookIds = destinyAfterEarlyHook.statTrace.map(entry => entry.id);
  assert(earlyHookIds.indexOf('luckyStar') < earlyHookIds.indexOf('destiny'),
    'Destiny follows UnitCalcPre and precedes later phase-c transforms');

  const destinyChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, abilities: { ccFireBreath: true, destiny: true },
    modernAttacks: {},
  }));
  assertEqual(destinyChannels.modernAttacks.fireBreath.strength, 8,
    'Destiny doubles the earlier region-a Chaos Channels Fire Breath write');
  const destinyFireIds = destinyChannels.modernAttacks.fireBreath.modifierTrace.entries
    .map(entry => entry.id);
  assert(destinyFireIds.indexOf('chaosChannels:fireBreath')
      < destinyFireIds.indexOf('destiny'),
  'Chaos Channels Fire Breath precedes Destiny in the modern channel trace');

  const focusCreatedAfterLevel = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', level: 'champion', abilities: { focusMagic: true },
  }));
  assertEqual(focusCreatedAfterLevel.rtb, 3,
    'Focus Magic creates ranged strength after the level ladder, so the new slot gets no level bonus');
  assertEqual(focusCreatedAfterLevel.modifierTraces.sharedAttack.entries[0].phase, 'c',
    'Focus Magic creation is a region-c trace event');

  const baseModernThrown = { thrown: { strength: 2, type: 'thrown' } };
  const leveledThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', level: 'champion', rtb: 2, rtbType: 'thrown',
    modernAttacks: baseModernThrown,
  }));
  const focusedThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', level: 'champion', rtb: 2, rtbType: 'thrown',
    abilities: { focusMagic: true }, modernAttacks: baseModernThrown,
  }));
  assertEqual(focusedThrown.modernAttacks.ranged.strength,
    leveledThrown.modernAttacks.thrown.strength,
    'Focus Magic converts the live post-level Thrown strength without reapplying the level bonus');
  assertEqual(focusedThrown.modernAttacks.ranged.type, 'magic_s',
    'Focus Magic conversion changes the ordered channel type to Sorcery ranged');
  assertEqual(focusedThrown.modernAttacks.thrown, undefined,
    'Focus Magic consumes the original Thrown channel');

  const focusedBreath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { focusMagic: true },
    modernAttacks: { fireBreath: { strength: 2, type: 'fire' } },
  }));
  assertEqual(focusedBreath.modernAttacks.fireBreath.strength, 5,
    'Focus Magic adds three to an existing Fire Breath');
  assertEqual(focusedBreath.modernAttacks.ranged.strength, 3,
    'Focus Magic also executes its independent empty-ranged creation branch beside a Breath');

  const focusedGaze = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { focusMagic: true, doomGaze: 4 },
    modernAttacks: {},
  }));
  assertEqual(focusedGaze.effectiveDoomGaze, 7,
    'Focus Magic adds three to independent Doom Gaze damage');
  assertEqual(focusedGaze.modernAttacks.ranged.strength, 3,
    'Focus Magic executes its independent empty-ranged creation branch beside a Gaze');

  const focusedBombs = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 3,
    abilities: { outlanderWizard: true, explosive: true, focusMagic: true },
    modernAttacks: {},
  }));
  assertEqual(focusedBombs.modernAttacks.ranged.strength, 7,
    'Focus Magic converts the live phase-b Bombs & Grenades Thrown strength');
  assertEqual(focusedBombs.modernAttacks.ranged.type, 'magic_s',
    'Focus Magic converts phase-b-created Thrown to Sorcery ranged');
  assertEqual(focusedBombs.modernAttacks.thrown, undefined,
    'Focus Magic consumes the phase-b-created Thrown channel');
  const focusedBombIds = focusedBombs.modernAttacks.ranged.statTrace.map(entry => entry.id);
  assert(focusedBombIds.indexOf('bombsGrenades')
      < focusedBombIds.indexOf('focusMagic:conversion'),
  'The atomic modern-channel trace records phase-b creation before phase-c conversion');

  const focusedBombsAndBreath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 3,
    abilities: { outlanderWizard: true, explosive: true, focusMagic: true },
    modernAttacks: { fireBreath: { strength: 2, type: 'fire' } },
  }));
  assertEqual(focusedBombsAndBreath.modernAttacks.ranged.strength, 7,
    'Bombs & Grenades creates convertible Thrown beside an existing Breath');
  assertEqual(focusedBombsAndBreath.modernAttacks.fireBreath.strength, 5,
    'Focus Magic independently boosts Breath while converting Bombs & Grenades Thrown');

  const typeOnlyFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { focusMagic: true },
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  const typeOnlyFocusEvent = typeOnlyFocus.modernAttacks.ranged.statTrace
    .find(entry => entry.id === 'focusMagic:conversion');
  assert(typeOnlyFocusEvent && typeOnlyFocusEvent.phase === 'c'
      && typeOnlyFocusEvent.changes.rangedType,
  'A strength-preserving Focus type conversion remains visible as a phase-c channel event');

  const tracedVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { vampirism: true },
    atk: 3, rtb: 5, rtbType: 'thrown',
  }));
  for (const [field, from, to] of [['melee', 3, 5], ['sharedAttack', 5, 1]]) {
    const entry = tracedVampirism.modifierTraces[field].entries[0];
    assertEqual(entry.source.id, 'vampirism:transfer', `Vampirism owns its ${field} transfer`);
    assertEqual(entry.from, from, `Vampirism ${field} records its running before value`);
    assertEqual(entry.to, to, `Vampirism ${field} records its running after value`);
  }

  const simultaneousVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { vampirism: true },
    atk: 3, rtb: 1, rtbType: 'thrown',
    modernAttacks: {
      thrown: { strength: 1, type: 'thrown' },
      fireBreath: { strength: 1, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));
  assertEqual(simultaneousVampirism.atk, 4,
    'Vampirism truncates the combined three-channel half after aggregation');
  for (const key of ['thrown', 'fireBreath', 'lightningBreath']) {
    assertEqual(simultaneousVampirism.modernAttacks[key].strength, 1,
      `Vampirism retains positive ${key} at strength 1`);
  }

  const orderedVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { colossalStrength: true, vampirism: true, shadowStrike: true },
    atk: 4, rtb: 3, rtbType: 'thrown',
    modernAttacks: {
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));
  assertEqual(orderedVampirism.atk, 11,
    'Vampirism aggregates source strengths after Colossal Strength');
  assertEqual(orderedVampirism.modernAttacks.thrown.strength, 5,
    'Shadow Strike adds to Thrown after Vampirism resets it to 1');
  assertEqual(orderedVampirism.modernAttacks.fireBreath.strength, 1,
    'Vampirism independently resets positive Fire Breath');
  assertEqual(orderedVampirism.modernAttacks.lightningBreath.strength, 1,
    'Vampirism independently resets positive Lightning Breath');
  const vampirismMeleeEntry = orderedVampirism.modifierTraces.melee.entries
    .find(entry => entry.source.id === 'vampirism:transfer');
  assert(vampirismMeleeEntry && vampirismMeleeEntry.phase === 'd'
      && vampirismMeleeEntry.from === 6 && vampirismMeleeEntry.to === 11,
  'Vampirism records one coordinated region-d melee transfer');
  const thrownOrder = orderedVampirism.modernAttacks.thrown.modifierTrace.entries
    .map(entry => entry.source.id);
  assert(thrownOrder.indexOf('colossalStrength') < thrownOrder.indexOf('vampirism:transfer')
      && thrownOrder.indexOf('vampirism:transfer') < thrownOrder.indexOf('shadowStrike:thrown'),
  'Thrown trace orders Colossal Strength, Vampirism reset, then Shadow Strike');

  const focusedCoexistingVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 3, rtb: 4, rtbType: 'missile',
    abilities: { focusMagic: true, vampirism: true },
    modernAttacks: {
      ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 2, type: 'fire' },
      lightningBreath: { strength: 2, type: 'lightning' },
    },
  }));
  assertEqual(focusedCoexistingVampirism.atk, 9,
    'Vampirism reads Focus-boosted Breaths and the coexisting unconverted Thrown channel');
  assertEqual(focusedCoexistingVampirism.modernAttacks.ranged.strength, 4,
    'Vampirism does not consume or reset conventional ranged beside its three sources');
  assertEqual(focusedCoexistingVampirism.modernAttacks.ranged.type, 'magic_s',
    'Focus Magic owns conventional ranged when ranged and Thrown coexist');
  for (const key of ['thrown', 'fireBreath', 'lightningBreath']) {
    assertEqual(focusedCoexistingVampirism.modernAttacks[key].strength, 1,
      `Vampirism resets Focus interaction source ${key} independently`);
  }
  assert(!focusedCoexistingVampirism.modifierTraces.modernAttacks.ranged.entries
    .some(entry => entry.source.id === 'vampirism:transfer'),
  'Conventional ranged strength trace does not claim a Vampirism write');
  assert(!Object.keys(focusedCoexistingVampirism)
    .some(key => key.includes('vampirismSource')),
  'Vampirism probe fields do not leak into the public derived result');

  const createdVampirismSources = [
    ['Bombs & Grenades', { outlanderWizard: true, explosive: true }, {}, 6, 'thrown'],
    ['Chaos Channels', { ccFireBreath: true }, {}, 5, 'fireBreath'],
    ['Lightning Blade', { lightningBlade: true },
      { thrown: { strength: 4, type: 'thrown' } }, 5, 'lightningBreath'],
  ];
  for (const [label, sourceAbilities, modernAttacks, expectedMelee, outputKey]
    of createdVampirismSources) {
    const created = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.7', atk: 3,
      rtb: outputKey === 'lightningBreath' ? 4 : 0,
      rtbType: outputKey === 'lightningBreath' ? 'thrown' : 'none',
      abilities: { vampirism: true, ...sourceAbilities }, modernAttacks,
    }));
    assertEqual(created.atk, expectedMelee,
      `Vampirism includes the ${label} source at its region-d read`);
    assertEqual(created.modernAttacks[outputKey].strength, 1,
      `Vampirism resets the ${label} source independently`);
  }

  for (const otherVersion of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11']) {
    const inert = ctx.deriveUnitStats(baseUnitInput({
      version: otherVersion, atk: 3, rtb: 3, rtbType: 'thrown',
      abilities: { vampirism: true },
      modernAttacks: otherVersion.startsWith('com2')
        ? { thrown: { strength: 3, type: 'thrown' } } : undefined,
    }));
    assertEqual(inert.atk, 3, `Vampirism transfer is inert in ${otherVersion}`);
    assertEqual(inert.rtb, 3, `Vampirism reset is inert in ${otherVersion}`);
  }

  const shadowStrikeGrant = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { shadowStrike: true },
    atk: 6, rtb: 0, rtbType: 'none',
    modernAttacks: {},
  }));
  const grantedThrown = shadowStrikeGrant.modernAttacks.thrown;
  assertEqual(grantedThrown.baseStrength, 0,
    'Shadow Strike-created modern Thrown retains its editable zero base');
  assertEqual(grantedThrown.modifierTrace.base, 0,
    'Shadow Strike-created modern Thrown trace starts from zero');
  assertEqual(grantedThrown.modifierTrace.entries.length, 1,
    'Shadow Strike-created modern Thrown has one applied grant entry');
  assertEqual(grantedThrown.modifierTrace.entries[0].source.id, 'shadowStrike:thrown',
    'Shadow Strike owns the created modern Thrown grant');
  assertEqual(grantedThrown.modifierTrace.entries[0].source.label, 'Shadow Strike',
    'Created modern Thrown identifies Shadow Strike to presentation');
  assertEqual(grantedThrown.modifierTrace.entries[0].from, 0,
    'Shadow Strike grant records zero as its running before value');
  assertEqual(grantedThrown.modifierTrace.entries[0].to, 3,
    'Shadow Strike grant records the created strength as its running after value');
  assertEqual(grantedThrown.modifierTrace.result, grantedThrown.strength,
    'Shadow Strike-created modern Thrown trace reaches channel strength');

  const colossalShadow = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 9,
    abilities: { colossalStrength: true, shadowStrike: true }, modernAttacks: {},
  }));
  assertEqual(colossalShadow.atk, 13,
    'Colossal Strength raises melee before Shadow Strike reads it');
  assertEqual(colossalShadow.modernAttacks.thrown.strength, 5,
    'Shadow Strike derives Thrown from the live post-Colossal melee strength');
  const colossalShadowIds = colossalShadow.modernAttacks.thrown.modifierTrace.entries
    .map(entry => entry.id);
  assert(colossalShadowIds.indexOf('colossalStrength')
      < colossalShadowIds.indexOf('shadowStrike:thrown'),
  'Shadow Strike follows Colossal Strength in the phase-d channel trace');

  const focusAndShadow = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 9, rtb: 4, rtbType: 'thrown',
    abilities: { focusMagic: true, shadowStrike: true },
    modernAttacks: { thrown: { strength: 4, type: 'thrown' } },
  }));
  assertEqual(focusAndShadow.modernAttacks.ranged.strength, 4,
    'Focus Magic converts the original Thrown channel at its live strength');
  assertEqual(focusAndShadow.modernAttacks.ranged.type, 'magic_s',
    'The converted original channel is Sorcery ranged');
  assertEqual(focusAndShadow.modernAttacks.thrown.strength, 4,
    'Later Shadow Strike recreates an independent Thrown channel');

  for (const key of ['ranged', 'thrown', 'fireBreath', 'lightningBreath']) {
    const channel = traced.modernAttacks[key];
    assert(channel && channel.modifierTrace,
      `Modern ${key} keeps its independent strength trace`);
    assertEqual(channel.modifierTrace.base, channel.baseStrength,
      `Modern ${key} trace starts at that channel's own editable base`);
    assertEqual(channel.modifierTrace.result, channel.strength,
      `Modern ${key} trace finishes at that channel's own result`);
  }

  const inert = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    atk: 4,
    abilities: { highPrayer: false, warpAttack: false, holyBonus: 0 },
  }));
  const inertSources = inert.modifierTraces.melee.entries.map(entry => entry.source.id);
  assert(!inertSources.includes('highPrayer') && !inertSources.includes('warpAttack')
      && !inertSources.includes('holyBonus'),
    'Inactive and zero-valued inputs are omitted instead of producing no-op trace entries');
}

function runResolutionStepChecks(ctx) {
  const defenseTarget = {
    def: 4,
    unitType: 'normal',
    abilities: {
      largeShield: true,
      elemArmor: 'resistElements',
      bless: true,
      missileImmunity: true,
      weaponImmunity: true,
    },
  };
  const defenseTrace = [];
  const effectiveDef = ctx.effectiveDefense(defenseTarget, 'com2_1.05.11', {
    isRanged: true,
    elementalEligible: true,
    spellId: 99,
    spellRealm: 'chaos',
    magicImmunityEligible: true,
    armorPiercing: true,
    isMissile: true,
    weaponImmunityEligible: true,
  }, defenseTrace);
  // (4 base + 3 shield + 4 Resist Elements + 5 Bless) / 2 = 8;
  // Missile Immunity replaces that with 100, then Weapon Immunity adds 8.
  assertEqual(effectiveDef, 108,
    'EffectiveDefense preserves assignment-before-final-Weapon-Immunity ordering');
  assertEqual(defenseTrace.map(entry => entry.id).join(','),
    [
      'effectiveDefense:base',
      'effectiveDefense:largeShield',
      'effectiveDefense:resistElements',
      'effectiveDefense:bless',
      'effectiveDefense:armorPiercing',
      'effectiveDefense:immunities',
      'effectiveDefense:weaponImmunity',
    ].join(','),
    'EffectiveDefense trace follows the decoded execution order');
  assert(!Object.prototype.hasOwnProperty.call(defenseTarget, 'effectiveDefense'),
    'EffectiveDefense runs on a discarded scratch copy');

  const cityWallTarget = ctx.deriveUnitStats(baseUnitInput({
    prefix: 'b',
    version: 'com2_1.05.11',
    def: 9,
    cityWalls: '3',
  }));
  assertEqual(cityWallTarget.def, 9,
    'City Walls is not included in the finished CoM2 unit Defense stat');
  const attackerCardCityWallTarget = ctx.deriveUnitStats(baseUnitInput({
    prefix: 'a',
    version: 'com2_1.05.11',
    def: 9,
    cityWalls: '3',
  }));
  assertEqual(attackerCardCityWallTarget.cityWallBonus, 3,
    'City Walls position is card-independent so an inside card-A unit can use it on a counterattack');
  assertEqual(ctx.effectiveDefense(cityWallTarget, 'com2_1.05.11', {
    extraDefense: cityWallTarget.cityWallBonus,
    armorPiercing: true,
  }), 6,
  'City Walls enters EffectiveDefense before Armor Piercing: floor((9 + 3) / 2)');

  const dosWallTarget = {
    def: 9, cityWallBonus: 3, unitType: 'normal', abilities: {},
  };
  const dosOutsideArmorPiercing = {
    cityWallBonus: 0, weapon: 'normal', unitType: 'normal', generic: false,
    rangedType: 'none', thrownType: 'none', abilities: { armorPiercing: true },
  };
  const dosOutsideIllusion = {
    ...dosOutsideArmorPiercing,
    abilities: { illusion: true },
  };
  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const armorPiercingWall = ctx.computeDefenseProfile(
      dosWallTarget, dosOutsideArmorPiercing, version, 0);
    assertEqual(armorPiercingWall.vsMelee, 7,
      `${version}: DOS City Walls adds after Armor Piercing: trunc(9 / 2) + 3`);
    assertEqual(armorPiercingWall.vsImmolation, 9,
      `${version}: DOS City Walls does not enter Immolation or Wall of Fire spell defense`);
    const illusionWall = ctx.computeDefenseProfile(
      dosWallTarget, dosOutsideIllusion, version, 0);
    assertEqual(illusionWall.vsMelee, 3,
      `${version}: DOS City Walls adds after Illusion zeroes defense-special output`);
    assertEqual(illusionWall.vsImmolation, 9,
      `${version}: DOS spell defense remains independent of Illusion and City Walls`);
  }

  assertEqual(ctx.effectiveDefense({
    def: 4,
    unitType: 'normal',
    abilities: {},
  }, 'com2_1.05.11', { vertigoDefPenalty: 1 }), 4,
  'Modern EffectiveDefense copies finished Defense without an additional Vertigo subtraction');

  const illusionDef = ctx.effectiveDefense({
    def: 9,
    unitType: 'normal',
    abilities: { missileImmunity: true, weaponImmunity: true },
  }, 'com2_1.05.11', {
    illusion: true,
    isRanged: true,
    isMissile: true,
    weaponImmunityEligible: true,
  });
  assertEqual(illusionDef, 0,
    'Illusion halts EffectiveDefense before later immunities and bonuses');

  const resistanceTarget = {
    res: 3,
    unitType: 'hero',
    abilities: {
      charmed: true,
      magicImmunity: true,
      bless: true,
      resistMagic: true,
    },
  };
  const resistanceTrace = [];
  const effectiveRes = ctx.effectiveResistance(
    resistanceTarget, 'com2_1.05.11', 'death', true, resistanceTrace);
  assertEqual(effectiveRes, 110,
    'Charmed/Magic Immunity assignments precede Bless and Resist Magic additions');
  assertEqual(resistanceTrace.map(entry => entry.id).join(','),
    [
      'effectiveResistance:base',
      'effectiveResistance:charmed',
      'effectiveResistance:bless',
      'effectiveResistance:resistMagic',
    ].join(','),
    'EffectiveResistance trace follows the decoded execution order');
  assertEqual(resistanceTarget.res, 3,
    'EffectiveResistance does not write back to displayed Resistance');
  assertEqual(ctx.effectiveResistance(resistanceTarget, 'com2_1.05.11', null), 100,
    'Charmed applies to realm-less resistance rolls such as Poison');
  assertEqual(ctx.effectiveResistance(resistanceTarget, 'com2_1.05.11', null, false), 3,
    'Charmed is inert when GetEffectiveResistance is not serving a roll');

  const legacyResistance = ctx.buildResistanceContext(
    { res: 0, unitType: 'normal', abilities: {} },
    { res: 0, unitType: 'hero', abilities: { charmed: true } },
    'mom_1.31',
    false);
  assertEqual(legacyResistance.bResPoison, 30,
    'Legacy Charmed adds 30 Resistance to realm-less rolls for heroes');

  const bothElemental = {
    res: 0,
    unitType: 'normal',
    abilities: { elementalArmor: true, resistElements: true },
  };
  const plainResistanceSource = { res: 0, unitType: 'normal', abilities: {} };
  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    const context = ctx.buildResistanceContext(
      plainResistanceSource, bothElemental, version, false);
    assertEqual(context.bResStoning, 10,
      `${version}: Elemental Armor supersedes Resist Elements on the resistance path`);
  }
  const comResistance = ctx.buildResistanceContext(
    plainResistanceSource, bothElemental, 'com_6.08', true);
  assertEqual(comResistance.bResStoning, 4,
    'CoM 1 resistance ignores Elemental Armor and retains Resist Elements +4');

  const elementalDefenseTarget = {
    def: 4,
    unitType: 'normal',
    abilities: { elementalArmor: true, resistElements: true },
  };
  const natureRangedAttacker = {
    unitType: 'normal',
    weapon: 'normal',
    rangedType: 'magic_n',
    thrownType: 'none',
    abilities: {},
  };
  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    assertEqual(ctx.computeDefenseProfile(
      elementalDefenseTarget, natureRangedAttacker, version, 0).vsRanged, 14,
    `${version}: Elemental Armor supersedes Resist Elements on the defense path`);
  }
  assertEqual(ctx.computeDefenseProfile(
    elementalDefenseTarget, natureRangedAttacker, 'com_6.08', 0).vsRanged, 20,
  'CoM 1 independently stacks Elemental Armor +12 and Resist Elements +4 on defense');

  const energyDoom = ctx.applyDoomUAHalving({
    atk: 5,
    rtb: 7,
    abilities: { energyWeaponry: true, energyCannon: true },
    modernAttacks: {
      ranged: { strength: 7 },
      thrown: { strength: 5 },
      fireBreath: { strength: 3 },
    },
  }, 'com2_warlord_1.5.12.7');
  assertEqual(energyDoom.atk, 2,
    'Warlord Energy Weaponry applies configured 50% Doom damage to odd melee strength');
  assertEqual(energyDoom.rtb, 3,
    'Warlord Energy Cannon applies configured 50% Doom damage to odd ranged projection');
  assertEqual(energyDoom.modernAttacks.ranged.strength, 3,
    'Warlord Energy Cannon applies configured 50% Doom damage to independent Ranged');
  assertEqual(energyDoom.modernAttacks.thrown.strength, 5,
    'Warlord Energy Weaponry does not convert independent Thrown to Doom');
  assertEqual(energyDoom.modernAttacks.fireBreath.strength, 3,
    'Warlord Energy Weaponry does not convert independent Breath to Doom');

  const paired = ctx.applyPairToHitModifiers(
    { toHitMelee: 0.5, toHitRtb: 0.5, abilities: { prayer: true } },
    { toHitMelee: 0.5, toHitRtb: 0.5, abilities: { lucky: true, invisibility: true } },
    'mom_1.31');
  assertClose(paired.a.toHitMelee, 0.3,
    'MoM 1.31 combines defender Lucky and Invisibility melee To-Hit penalties');
  assertClose(paired.a.toHitRtb, 0.4,
    'MoM 1.31 Invisibility applies to the shared secondary-attack To-Hit channel');
  assertClose(paired.b.toHitMelee, 0.4,
    'MoM 1.31 opposing Prayer applies the defender To-Block melee quirk');
  assertEqual(paired.aCanSeeB, false,
    'An attacker without Illusion Immunity cannot target an Invisible defender at range');
}

function runModernWeaponImmunityMappingChecks(ctx) {
  const com2 = 'com2_1.05.11';
  const warlord = 'com2_warlord_1.5.12.7';
  const derive = overrides => ctx.deriveUnitStats(baseUnitInput({ version: com2, ...overrides }));
  const deriveWarlord = overrides => ctx.deriveUnitStats(baseUnitInput({ version: warlord, ...overrides }));
  const identity = (version, values) => ctx.createUnitIdentity({ version, ...values });

  const chosen = derive({
    identity: identity(com2, { templateId: 34, isHero: true, baseRace: 'Dwarf',
      baseFantastic: false, specialUnit: 'chosen' }),
  });
  const constructCatapult = derive({
    abilities: { combatSummoned: true },
    identity: identity(com2, { templateId: 37, baseRace: 'Special', baseFantastic: false }),
  });
  const callToArmsPaladins = derive({
    abilities: { combatSummoned: true },
    identity: identity(com2, { templateId: 113, baseRace: 'High Men', baseFantastic: false }),
  });
  assert(chosen.identityTrace.some(t => t.id === 'identity:chosen'),
    'Focused Weapon Immunity coverage reaches the Chosen conversion');
  assert(constructCatapult.identityTrace.some(t => t.id === 'identity:constructCatapult'),
    'Focused Weapon Immunity coverage reaches the Construct Catapult conversion');
  assert(callToArmsPaladins.identityTrace.some(t => t.id === 'identity:callToArmsPaladins'),
    'Focused Weapon Immunity coverage reaches the Call to Arms Paladins conversion');

  const encMagicCases = [
    ['ordinary normal unit', derive({}), false],
    ['magic weapon material', derive({ weapon: 'magic' }), true],
    ['mithril weapon material', derive({ weapon: 'mithril' }), true],
    ['adamantium weapon material', derive({ weapon: 'adamantium' }), true],
    ['hero standing grant', derive({ unitType: 'hero' }), true],
    ['natural Fantastic standing grant', derive({ unitType: 'fantastic_nature' }), true],
    ['Combat Summoned conversion', derive({ abilities: { combatSummoned: true } }), true],
    ['Chosen conversion', chosen, true],
    ['Construct Catapult conversion', constructCatapult, true],
    ['Call to Arms Paladins conversion', callToArmsPaladins, true],
    ['Chaos Channels Fire Breath conversion', derive({ abilities: { ccFireBreath: true } }), true],
    ['Chaos Channels Flight conversion', derive({ abilities: { ccFlight: true } }), true],
    ['Chaos Channels Defense conversion', derive({ abilities: { ccDefense: true } }), true],
    ['Destiny conversion', derive({ abilities: { destiny: true } }), true],
    ['Warlord Apotheosis conversion', deriveWarlord({ abilities: { destiny: true } }), true],
    ['Blood Lust conversion', derive({ abilities: { bloodLust: true } }), true],
    ['Undead conversion', derive({ abilities: { undead: true } }), true],
    ['Animated conversion', derive({ abilities: { animated: true } }), true],
    ['Mystic Surge conversion', derive({ abilities: { mysticSurge: true } }), true],
    ['Raise Dead conversion', derive({ abilities: { raiseDead: true } }), true],
    ['Flame Blade', derive({ abilities: { flameBlade: true } }), true],
    ['Holy Weapon', derive({ abilities: { holyWeapon: true } }), true],
    ['Wraith Form', derive({ abilities: { wraithForm: true } }), true],
    ['Ruler of Underworld', derive({ abilities: { rulerOfUnderworld: true } }), true],
    ['Blazing March', derive({ abilities: { blazingMarch: true } }), true],
    ['Warlord Flame Blade', deriveWarlord({ abilities: { flameBladeWarlord: true } }), true],
    ['Warlord Fiery Blade', deriveWarlord({ abilities: { fieryBlade: true } }), true],
    ['Warlord Fiery Fury', deriveWarlord({ abilities: { fieryFury: true } }), true],
    ['Warlord Wall of Fire garrison', deriveWarlord({ abilities: { wallOfFireBoost: true } }), true],
    ['Warlord Artificer Mechanical', deriveWarlord({ abilities: { artificer: true, mechanical: true } }), true],
    ['Warlord Sanctify Clergy', deriveWarlord({ abilities: { sanctify: true, clergy: true } }), true],
    ['Warlord Sanctify non-clergy', deriveWarlord({ abilities: { sanctify: true } }), false],
    ['Warlord Blood Lust without conversion', deriveWarlord({ abilities: { bloodLust: true } }), false],
  ];
  for (const [label, unit, expected] of encMagicCases) {
    assertEqual(unit.encMagic, expected, `${label} maps to calculated EncMagic`);
  }

  const spiritLinked = deriveWarlord({
    unitType: 'fantastic_chaos',
    abilities: { spiritLink: true },
  });
  assertEqual(spiritLinked.identity.fantastic, false,
    'Spirit Link clears calculated Fantastic in phase d');
  assertEqual(spiritLinked.encMagic, true,
    'Spirit Link preserves the EncMagic already granted by the phase-c Fantastic rule');
  assertEqual(spiritLinked.encMagicIndependentOfMaterial, true,
    'Spirit Link EncMagic survives enemy weapon-material suppression');

  const spiritLinkedNormalInput = deriveWarlord({ abilities: { spiritLink: true } });
  assertEqual(spiritLinkedNormalInput.identity.fantastic, false,
    'Spirit Link leaves a calculator-reachable normal input non-fantastic after phase d');
  assertEqual(spiritLinkedNormalInput.encMagic, true,
    'Spirit Link phase b makes even that input Fantastic when the standing EncMagic rule runs');

  const wiTarget = derive({
    prefix: 'b', def: 0, abilities: { weaponImmunity: true },
  });
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, derive({}), com2, 0, 'melee'), 8,
    'Ordinary modern physical melee receives the CoM2 Weapon Immunity bonus');
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, spiritLinked, warlord, 0, 'melee'), 0,
    'Spirit-linked physical melee still bypasses Weapon Immunity through persisted EncMagic');

  const blazingThrown = derive({
    atk: 0, rtb: 2, rtbType: 'thrown', abilities: { blazingMarch: true },
  });
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, blazingThrown, com2, 0, 'thrown'), 0,
    'CoM2 Blazing March EncMagic reaches Thrown even though the strength bonus does not');

  const magicRanged = derive({
    atk: 0, rtb: 2, rtbType: 'magic_c',
  });
  assertEqual(magicRanged.encMagic, false,
    'Innate magical ranged type does not invent the unit-level EncMagic flag');
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, magicRanged, com2, 0, 'ranged'), 0,
    'ApplyAttack magicranged independently bypasses Weapon Immunity');

  const attackLocalMagicCases = [
    ['Nature magical ranged', derive({ rtb: 2, rtbType: 'magic_n' }), 'ranged'],
    ['Sorcery magical ranged', derive({ rtb: 2, rtbType: 'magic_s' }), 'ranged'],
    ['Warlord Beam ranged', deriveWarlord({ rtb: 2, rtbType: 'beam' }), 'ranged'],
    ['Fire Breath', derive({ rtb: 2, rtbType: 'fire' }), 'thrown'],
    ['Lightning Breath', derive({ rtb: 2, rtbType: 'lightning' }), 'thrown'],
    ['Doom Gaze', derive({ abilities: { doomGaze: 2 } }), 'gaze'],
    ['Death Gaze', derive({ abilities: { deathGaze: 0 } }), 'gaze'],
    ['Stoning Gaze', derive({ abilities: { stoningGaze: 0 } }), 'gaze'],
  ];
  for (const [label, attacker, attackType] of attackLocalMagicCases) {
    assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, attacker, com2, 0, attackType), 0,
      `${label} maps to ApplyAttack magicranged and bypasses Weapon Immunity`);
  }

  const attackLocalPhysicalCases = [
    ['physical missile ranged', derive({ rtb: 2, rtbType: 'missile' }), 'ranged'],
    ['physical boulder ranged', derive({ rtb: 2, rtbType: 'boulder' }), 'ranged'],
    ['Thrown', derive({ rtb: 2, rtbType: 'thrown' }), 'thrown'],
  ];
  for (const [label, attacker, attackType] of attackLocalPhysicalCases) {
    assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, attacker, com2, 0, attackType), 8,
      `${label} leaves ApplyAttack magicranged false and receives Weapon Immunity`);
  }

  const rulerTarget = derive({
    prefix: 'b', def: 0, abilities: { rulerOfUnderworld: true },
  });
  for (const material of ['magic', 'mithril', 'adamantium']) {
    assertEqual(ctx.computeCasterDefenseForAttack(
      rulerTarget, derive({ weapon: material }), com2, 0, 'melee'), 8,
      `Enemy Ruler of Underworld suppresses the ${material} ApplyMagicWeapons grant`);
  }
  assertEqual(ctx.computeCasterDefenseForAttack(
    rulerTarget,
    deriveWarlord({ abilities: { artificer: true, mechanical: true } }),
    warlord, 0, 'melee'), 10,
    'Enemy Ruler of Underworld suppresses Artificer\'s derived material grant');
  assertEqual(ctx.computeCasterDefenseForAttack(
    rulerTarget, derive({ abilities: { flameBlade: true } }), com2, 0, 'melee'), 0,
    'A later Flame Blade EncMagic write survives enemy Ruler of Underworld suppression');
  assertEqual(ctx.computeCasterDefenseForAttack(
    rulerTarget, deriveWarlord({ abilities: { wallOfFireBoost: true } }), warlord, 0, 'melee'), 0,
    'The earlier Warlord Wall of Fire EncMagic write also survives material suppression');
}

function runF19Checks(ctx) {
  const modern = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', ...overrides,
  }));
  const warlord = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', ...overrides,
  }));

  const darkForce = modern({ abilities: { darkForce: true } });
  assertClose(darkForce.toHitMelee, 0.4, 'F19 Dark Force adds 10 percentage points To Hit');
  assertClose(darkForce.toBlock, 0.4, 'F19 Dark Force adds 10 percentage points To Block');

  const heavenly = modern({
    prefix: 'b', atk: 2, def: 3, res: 4,
    abilities: { heavenlyLight: true },
    modernAttacks: {
      ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
    },
  });
  assertEqual(heavenly.atk, 3, 'F19 Heavenly Light adds one to base-present melee');
  assertEqual(heavenly.def, 4, 'F19 Heavenly Light adds one Defense');
  assertEqual(heavenly.res, 5, 'F19 Heavenly Light adds one Resistance');
  assertEqual(heavenly.modernAttacks.ranged.strength, 4,
    'F19 Heavenly Light adds one to current conventional Ranged');
  assertEqual(heavenly.modernAttacks.thrown.strength, 4,
    'F19 Heavenly Light leaves independent Thrown strength unchanged');
  assertEqual(heavenly.modernAttacks.fireBreath.strength, 5,
    'F19 Heavenly Light leaves independent Breath strength unchanged');
  assertClose(heavenly.modernAttacks.ranged.toHit, 0.4,
    'F19 Heavenly Light grants the non-material Ranged To-Hit tail');
  assertClose(heavenly.modernAttacks.thrown.toHit, 0.4,
    'F19 Heavenly Light grants the non-material Thrown To-Hit tail');
  assertClose(heavenly.modernAttacks.fireBreath.toHit, 0.3,
    'F19 Heavenly Light does not grant its material tail to Breath');
  assertEqual(heavenly.encMagicIndependentOfMaterial, true,
    'F19 Heavenly Light grants independent EncMagic');
  const attackerHeavenly = modern({
    prefix: 'a', atk: 2, def: 3, res: 4, abilities: { heavenlyLight: true },
    modernAttacks: {
      ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
    },
  });
  assertEqual(attackerHeavenly.atk, 3,
    'F19 a defending-army unit keeps Heavenly Light when it initiates from the Attacker card');
  assertEqual(attackerHeavenly.def, 4,
    'F19 Heavenly Light army-side eligibility is independent of the attack-exchange card');
  assertEqual(attackerHeavenly.res, heavenly.res,
    'F19 Attacker-card Heavenly Light keeps the defending-army Resistance package');
  assertEqual(attackerHeavenly.modernAttacks.ranged.strength,
    heavenly.modernAttacks.ranged.strength,
    'F19 Attacker-card Heavenly Light keeps the conventional-Ranged package');
  assertClose(attackerHeavenly.modernAttacks.ranged.toHit,
    heavenly.modernAttacks.ranged.toHit,
    'F19 Attacker-card Heavenly Light keeps the physical-ranged To-Hit tail');
  assertClose(attackerHeavenly.modernAttacks.thrown.toHit,
    heavenly.modernAttacks.thrown.toHit,
    'F19 Attacker-card Heavenly Light keeps the Thrown To-Hit tail');
  assertEqual(attackerHeavenly.encMagicIndependentOfMaterial,
    heavenly.encMagicIndependentOfMaterial,
    'F19 Attacker-card Heavenly Light keeps the independent EncMagic grant');
  const rustedIntoNormalMaterial = warlord({
    prefix: 'b', weapon: 'mithril', abilities: { heavenlyLight: true, rust: true },
    modernAttacks: { ranged: { strength: 4, type: 'missile' } },
  });
  assertClose(rustedIntoNormalMaterial.modernAttacks.ranged.toHit, 0.4,
    'F19 Heavenly Light reads the still-current base material after Rust strips Mithril');

  const moons = modern({
    atk: 2, def: 3, res: 6,
    abilities: { badMoon: true, goodMoon: true },
    modernAttacks: {
      ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
    },
  });
  assertEqual(moons.atk, 3, 'F19 Good Moon raises positive current melee');
  assertEqual(moons.def, 4, 'F19 Good Moon raises Defense');
  assertEqual(moons.res, 3, 'F19 Bad Moon lowers base-normal Resistance by three');
  assertEqual(moons.modernAttacks.ranged.strength, 4,
    'F19 Good Moon raises current conventional Ranged');
  assertEqual(moons.modernAttacks.thrown.strength, 4,
    'F19 Good Moon leaves Thrown unchanged');

  const conjunction = modern({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    atk: 2, def: 3, res: 4,
    abilities: { natureConjunction: true, goodMoon: true, badMoon: true },
    modernAttacks: {
      ranged: { strength: 3, type: 'magic_n' },
      fireBreath: { strength: 4, type: 'fire' },
    },
  });
  assertEqual(conjunction.atk, 4, 'F19 Nature Conjunction raises base-Fantastic melee');
  assertEqual(conjunction.def, 5, 'F19 Nature Conjunction raises base-Fantastic Defense');
  assertEqual(conjunction.res, 6, 'F19 Nature Conjunction raises base-Fantastic Resistance');
  assertEqual(conjunction.modernAttacks.ranged.strength, 5,
    'F19 Nature Conjunction raises conventional Ranged');
  assertEqual(conjunction.modernAttacks.fireBreath.strength, 4,
    'F19 Nature Conjunction leaves Breath unchanged');

  const warded = modern({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, abilities: { spellWard: 'chaos' },
  });
  assertEqual(warded.def, 3, 'F19 matching Spell Ward removes three Defense');
  assertEqual(warded.res, 4, 'F19 matching Spell Ward removes three Resistance');
  assertClose(warded.toHitMelee, 0.1, 'F19 matching Spell Ward removes 20 percentage points To Hit');
  const wrongWard = modern({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, abilities: { spellWard: 'nature' },
  });
  assertEqual(wrongWard.def, 6, 'F19 nonmatching Spell Ward is inert');

  const auraMaximum = modern({
    res: 1, def: 2, abilities: {
      resistanceToAll: 4, prayermasterAura: 6, divineBarrierAura: 3,
    },
  });
  assertEqual(auraMaximum.res, 7,
    'F19 Prayermaster competes with Resistance to All by maximum rather than stacking');
  assertEqual(auraMaximum.def, 5, 'F19 Divine Barrier adds its entered aura value');
  const soulLinked = modern({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    abilities: { soulLinkerAura: 5 },
  });
  assertClose(soulLinked.toHitMelee, 0.35, 'F19 Soul Linker raises Fantastic To Hit');
  assertClose(soulLinked.toBlock, 0.35, 'F19 Soul Linker raises Fantastic To Block');
  const cappedSoulLinker = modern({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    toHitMod: 70, abilities: { soulLinkerAura: 99 },
  });
  assertClose(cappedSoulLinker.toHitMelee, 1,
    'F19 late Soul Linker To Hit observes AttackRoll\'s natural 100% probability bound');
  const cappedSoulLinkerTraceIds = cappedSoulLinker.modifierTraces.toHitMelee.entries
    .map(entry => entry.id);
  assert(cappedSoulLinkerTraceIds.indexOf('chance:soulLinkerAura')
      < cappedSoulLinkerTraceIds.indexOf('chance:attackRollProbabilityBound'),
  'F19 chance trace attributes Soul Linker before the resolution probability bound');

  const auraChannels = modern({
    atk: 2, abilities: { guidingBeaconAura: 4, leadershipAura: 5 },
    modernAttacks: {
      ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
    },
  });
  assertEqual(auraChannels.atk, 7, 'F19 Leadership adds its full value to base-present melee');
  assertEqual(auraChannels.modernAttacks.ranged.strength, 9,
    'F19 Guiding Beacon and half Leadership stack on physical conventional Ranged');
  assertEqual(auraChannels.modernAttacks.thrown.strength, 4,
    'F19 modern auras leave Thrown unchanged');
  assertEqual(auraChannels.modernAttacks.fireBreath.strength, 5,
    'F19 modern auras leave Breath unchanged');
  const magicalLeadership = modern({
    abilities: { leadershipAura: 5 },
    modernAttacks: { ranged: { strength: 3, type: 'magic_s' } },
  });
  assertEqual(magicalLeadership.modernAttacks.ranged.strength, 3,
    'F19 Leadership excludes magical conventional Ranged');

  const baseNormalMadeFantastic = modern({
    baseFantastic: false, baseRace: null, unitType: 'normal',
    abilities: {
      destiny: true, badMoon: true, goodMoon: true, natureConjunction: true,
      spellWard: 'life', soulLinkerAura: 5, leadershipAura: 7,
    },
  });
  const baseNormalMadeFantasticIds = baseNormalMadeFantastic.statTrace.map(event => event.id);
  for (const expectedId of ['badMoon', 'goodMoon', 'spellWard', 'soulLinkerAura']) {
    assert(baseNormalMadeFantasticIds.includes(expectedId),
      `F19 ${expectedId} observes its required base/live predicate after Destiny`);
  }
  for (const excludedId of ['natureConjunction', 'leadershipAura']) {
    assert(!baseNormalMadeFantasticIds.includes(excludedId),
      `F19 ${excludedId} rejects the opposite base/live predicate after Destiny`);
  }

  const baseFantasticMadeNormal = warlord({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    abilities: {
      spiritLink: true, badMoon: true, goodMoon: true, natureConjunction: true,
      spellWard: 'nature', soulLinkerAura: 5, leadershipAura: 4,
    },
  });
  const baseFantasticMadeNormalIds = baseFantasticMadeNormal.statTrace.map(event => event.id);
  for (const expectedId of ['natureConjunction', 'spellWard', 'leadershipAura']) {
    assert(baseFantasticMadeNormalIds.includes(expectedId),
      `F19 ${expectedId} observes its required base/live predicate after Spirit Link`);
  }
  for (const excludedId of ['badMoon', 'goodMoon', 'soulLinkerAura']) {
    assert(!baseFantasticMadeNormalIds.includes(excludedId),
      `F19 ${excludedId} rejects the opposite base/live predicate after Spirit Link`);
  }

  const createdBesideRanged = warlord({
    abilities: { lightningBlade: true },
    modernAttacks: { ranged: { strength: 4, type: 'missile' } },
  });
  assertEqual(createdBesideRanged.modernAttacks.ranged.strength, 4,
    'F19 Lightning Blade preserves coexisting conventional Ranged');
  assertEqual(createdBesideRanged.modernAttacks.lightningBreath.strength, 1,
    'F19 Lightning Blade creates strength-one Breath beside Ranged');
  const overwrittenLightning = warlord({
    abilities: { lightningBlade: true },
    modernAttacks: { lightningBreath: { strength: 7, type: 'lightning' } },
  });
  assertEqual(overwrittenLightning.modernAttacks.lightningBreath.strength, 1,
    'F19 Lightning Blade assignment overwrites existing Breath when Thrown is absent');

  const workshopChannels = warlord({
    abilities: { militaryWorkshop: true, armorPiercing: true },
    modernAttacks: {
      ranged: { strength: 2, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 4, type: 'fire' },
    },
  });
  assertEqual(workshopChannels.modernAttacks.ranged.type, 'boulder',
    'F19 Military Workshop upgrades the base missile channel');
  assertEqual(workshopChannels.modernAttacks.ranged.strength, 4,
    'F19 Military Workshop adds two to existing-AP physical Ranged');
  assertEqual(workshopChannels.modernAttacks.thrown.strength, 7,
    'F19 Military Workshop adds four to existing-AP Thrown independently');
  assertEqual(workshopChannels.modernAttacks.fireBreath.strength, 8,
    'F19 Military Workshop adds four to Fire Breath independently');
  assertEqual(workshopChannels.abilities.poison, 1,
    'F19 Military Workshop grants Poison from any eligible modern channel');

  const workshopLightning = warlord({
    abilities: { militaryWorkshop: true, lightningBlade: true, armorPiercing: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(workshopLightning.modernAttacks.lightningBreath.strength, 8,
    'F19 Lightning Blade reads Workshop-upgraded permanent Thrown: 3 + 4 + 1');
  assertEqual(workshopLightning.modernAttacks.thrown, undefined,
    'F19 Lightning Blade clears the upgraded Thrown source');

  const baseNormalConvertedFantastic = warlord({
    abilities: { militaryWorkshop: true, lightningBlade: true, ccDefense: true,
      armorPiercing: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(baseNormalConvertedFantastic.identity.fantastic, true,
    'F19 base-normal training regression reaches a later live-Fantastic conversion');
  assertEqual(baseNormalConvertedFantastic.modernAttacks.lightningBreath.strength, 8,
    'F19 permanent Workshop and Lightning Blade gates use base-normal identity');
  assertEqual(baseNormalConvertedFantastic.abilities.poison, 1,
    'F19 base-normal unit keeps the permanent Workshop poison after conversion');

  const baseFantasticClearedLive = warlord({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    abilities: { militaryWorkshop: true, lightningBlade: true, spiritLink: true,
      armorPiercing: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(baseFantasticClearedLive.identity.fantastic, false,
    'F19 base-Fantastic training regression reaches a later live-normal conversion');
  assertEqual(baseFantasticClearedLive.modernAttacks.thrown.strength, 3,
    'F19 live-normal conversion does not retroactively admit permanent training writes');
  assertEqual(baseFantasticClearedLive.modernAttacks.lightningBreath, undefined,
    'F19 base-Fantastic unit does not gain Lightning Blade after Spirit Link');
  assertEqual(baseFantasticClearedLive.abilities.poison || 0, 0,
    'F19 base-Fantastic unit does not gain Workshop poison after Spirit Link');

  const warlordPermanentControlsInBaseCoM2 = modern({
    abilities: { militaryWorkshop: true, rocketry: true, lightningBlade: true,
      armorPiercing: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(warlordPermanentControlsInBaseCoM2.modernAttacks.thrown.strength, 3,
    'F19 Warlord permanent-channel controls are inert in base CoM2');
  assertEqual(warlordPermanentControlsInBaseCoM2.modernAttacks.lightningBreath, undefined,
    'F19 Warlord Lightning Blade cannot create a base-CoM2 channel');
  assertEqual(warlordPermanentControlsInBaseCoM2.abilities.poison || 0, 0,
    'F19 Warlord Workshop/Rocketry cannot grant base-CoM2 Poison');

  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    const inert = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 2, def: 3, res: 4,
      abilities: {
        darkForce: true, heavenlyLight: true, badMoon: true, goodMoon: true,
        natureConjunction: true, spellWard: 'life', guidingBeaconAura: 5,
        prayermasterAura: 5, divineBarrierAura: 5, soulLinkerAura: 5,
        leadershipAura: 5,
      },
    }));
    assertEqual(inert.atk, 2, `F19 modern controls are inert in ${version} melee`);
    assertEqual(inert.def, 3, `F19 modern controls are inert in ${version} Defense`);
    assertEqual(inert.res, 4, `F19 modern controls are inert in ${version} Resistance`);
  }
  const inertInCoM1 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', atk: 2, def: 3, res: 4,
    abilities: {
      darkForce: true, heavenlyLight: true, badMoon: true, goodMoon: true,
      natureConjunction: true, spellWard: 'life', prayermasterAura: 5,
      leadershipAura: 5,
    },
  }));
  assertEqual(inertInCoM1.atk, 2, 'F19 modern-only controls are inert in CoM 1 melee');
  assertEqual(inertInCoM1.def, 3, 'F19 modern-only controls are inert in CoM 1 Defense');
  assertEqual(inertInCoM1.res, 4, 'F19 modern-only controls are inert in CoM 1 Resistance');
}

function runF23Checks(ctx) {
  const abilityDefs = evalInContext(ctx, 'ABILITY_DEFS');
  const enchantmentDefs = evalInContext(ctx, 'ENCHANTMENT_DEFS');
  const causeFearTooltip = abilityDefs.find(def => def.label === 'Cause Fear').tooltip;
  const cloakOfFearTooltip = enchantmentDefs.find(def => def.label === 'Cloak of Fear').tooltip;
  const deathImmunityTooltip = abilityDefs.find(def => def.label === 'Death Immunity').tooltip;
  for (const [label, tooltip] of [
    ['Cause Fear', causeFearTooltip],
    ['Cloak of Fear', cloakOfFearTooltip],
  ]) {
    assert(tooltip.includes('Opponents with Magic Immunity or Righteousness are unaffected.'),
      `F23 ${label} keeps universal blockers separate from versioned Death Immunity`);
    assert(tooltip.includes('MoM 1.31 & 1.60: Death Immunity skips the roll;'),
      `F23 ${label} retains the DOS Death-Immunity skip`);
    assert(tooltip.includes('CoM 1: Death Immunity skips the −3 roll.'),
      `F23 ${label} retains the CoM 1 Death-Immunity skip`);
    assert(tooltip.includes('CoM 2: Intrinsic/base Death Immunity skips the −3 roll;'),
      `F23 ${label} documents the CoM2 base-record gate`);
    assert(tooltip.includes('Warlord: Intrinsic/base Death Immunity skips the −3 roll;'),
      `F23 ${label} documents the Warlord base-record gate`);
    assert(tooltip.includes('recalculation-only Death Immunity still rolls.'),
      `F23 ${label} documents recalculation-only grants`);
    for (const line of tooltip.split('\n')) {
      assert(line.length <= 75, `F23 ${label} tooltip line exceeds 75 characters: ${line}`);
    }
  }
  for (const token of [
    'MoM 1.31 & 1.60: Also skips Cause Fear rolls.',
    'CoM 1: Also skips Cause Fear rolls.',
    'CoM 2: Cause Fear checks intrinsic/base Death Immunity;',
    'Warlord: Cause Fear checks intrinsic/base Death Immunity;',
    'recalculation-only grants do not skip its roll.',
  ]) {
    assert(deathImmunityTooltip.includes(token),
      `F23 Death Immunity tooltip includes ${token}`);
  }
  for (const line of deathImmunityTooltip.split('\n')) {
    assert(line.length <= 75,
      `F23 Death Immunity tooltip line exceeds 75 characters: ${line}`);
  }

  const fearPhaseChance = (feared, fearSource, version) => {
    const result = ctx.resolveCombat(feared, fearSource,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
    const fearPhase = result.phases.find(phase => phase.mode === 'feared');
    assert(fearPhase, `${version}: defender Cause Fear phase is present`);
    return fearPhase.atkDist[1] || 0;
  };
  const fearedChance = (version, abilities) => {
    const feared = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'a', figs: 1, atk: 5, def: 0, res: 5, hp: 10,
      toHitMod: 70, abilities,
    }));
    const fearSource = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', figs: 1, atk: 1, def: 0, res: 5, hp: 20,
      abilities: { fear: true },
    }));
    return { feared, fearSource, chance: fearPhaseChance(feared, fearSource, version) };
  };

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const intrinsic = fearedChance(version, { deathImmunity: true });
    assertEqual(intrinsic.feared.baseDeathImmunity, true,
      `F23 ${version} preserves intrinsic Death Immunity on the base record`);
    assertClose(intrinsic.chance, 0,
      `F23 ${version} intrinsic Death Immunity skips Cause Fear`);

    const bloodLust = fearedChance(version, { bloodLust: true });
    assertEqual(bloodLust.feared.baseDeathImmunity, false,
      `F23 ${version} Blood Lust does not rewrite base Death Immunity`);
    assertClose(bloodLust.chance, 0.8,
      `F23 ${version} Blood Lust-derived Death Immunity still rolls against Cause Fear`);

    const magicImmune = fearedChance(version, { magicImmunity: true });
    assertEqual(magicImmune.feared.baseDeathImmunity, false,
      `F23 ${version} Magic Immunity remains distinct from base Death Immunity`);
    assertEqual(ctx.effectiveResistance(magicImmune.feared, version, 'death'), 100,
      `F23 ${version} Magic Immunity assigns effective Death resistance to 100`);
    assertClose(ctx.fearFailProb(5, magicImmune.feared.abilities, version, false), 0.8,
      `F23 ${version} fear helper does not replace the modern effective-resistance path`);
    assertClose(magicImmune.chance, 0,
      `F23 ${version} Magic Immunity still blocks Cause Fear through effective resistance`);

    const transported = JSON.parse(JSON.stringify(bloodLust.feared));
    const transportedSource = JSON.parse(JSON.stringify(bloodLust.fearSource));
    assertEqual(transported.baseDeathImmunity, false,
      `F23 ${version} Matrix-style structured transport preserves base Death Immunity`);
    assertClose(fearPhaseChance(transported, transportedSource, version), 0.8,
      `F23 ${version} Matrix-style resolver path keeps calculated Death Immunity rollable`);

    const directIntrinsic = { ...intrinsic.feared };
    delete directIntrinsic.baseDeathImmunity;
    assertClose(fearPhaseChance(directIntrinsic, intrinsic.fearSource, version), 0,
      `F23 ${version} direct resolver callers treat supplied Death Immunity as intrinsic`);
    const directBloodLust = { ...bloodLust.feared };
    delete directBloodLust.baseDeathImmunity;
    assertClose(fearPhaseChance(directBloodLust, bloodLust.fearSource, version), 0.8,
      `F23 ${version} direct resolver normalization captures base immunity before Blood Lust`);
  }

  const animated = fearedChance('com2_1.05.11', { animated: true });
  assertClose(animated.chance, 0.8,
    'F23 CoM2 Animated-derived Death Immunity still rolls against Cause Fear');

  const rebuild = fearedChance('com2_warlord_1.5.12.7', { rebuild: true });
  assertClose(rebuild.chance, 0.8,
    'F23 Warlord Rebuild-derived Death Immunity still rolls against Cause Fear');

  const divineProtection = fearedChance('com2_warlord_1.5.12.7', {
    divineProtection: true,
  });
  assertEqual(divineProtection.feared.abilities.deathImmunity, true,
    'F23 Warlord Divine Protection still grants calculated Death Immunity');
  assertEqual(divineProtection.feared.baseDeathImmunity, false,
    'F23 Warlord Divine Protection does not rewrite base Death Immunity');
  assertClose(divineProtection.chance, 0.7,
    'F23 Warlord Divine Protection-derived Death Immunity still rolls with Lucky resistance');

  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const normalizedUndead = ctx.normalizeCombatUnit({
      abilities: { undead: true }, unitType: 'normal', identity: { baseFantastic: false },
    }, version);
    assertEqual(normalizedUndead.abilities.deathImmunity, true,
      `F23 ${version} compatibility normalization still derives Undead Death Immunity`);
    assertClose(ctx.fearFailProb(5, normalizedUndead.abilities, version, false), 0,
      `F23 ${version} Cause Fear still uses effective Death Immunity`);
  }
}

function runF50F51F53Checks(ctx) {
  const derive = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', ...overrides,
  }));

  const beaconRanged = derive({
    rtb: 3, rtbType: 'missile', abilities: { guidingBeaconAura: 5 },
  });
  assertEqual(beaconRanged.rtb, 8,
    'F50 CoM 1 Guiding Beacon adds its side maximum to conventional Ranged');
  for (const rtbType of ['boulder', 'magic_c', 'magic_n', 'magic_s', 'beam']) {
    const eligible = derive({
      rtb: 3, rtbType, abilities: { guidingBeaconAura: 5 },
    });
    assertEqual(eligible.rtb, 8,
      `F50 CoM 1 Guiding Beacon includes ${rtbType}`);
  }
  for (const rtbType of ['thrown', 'fire', 'lightning', 'gaze_stoning', 'gaze_death']) {
    const excluded = derive({
      rtb: 3, rtbType, abilities: { guidingBeaconAura: 5 },
    });
    assertEqual(excluded.rtb, 3,
      `F50 CoM 1 Guiding Beacon excludes ${rtbType}`);
  }

  const barrier = derive({ def: 2, abilities: { divineBarrierAura: 5 } });
  assertEqual(barrier.def, 7,
    'F50 CoM 1 Divine Barrier adds its side maximum without a unit gate');
  const linked = derive({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    abilities: { soulLinkerAura: 5 },
  });
  assertClose(linked.toHitMelee, 0.33,
    'F50 CoM 1 Soul Linker gives ceil(value / 2) To Hit');
  assertClose(linked.toBlock, 0.32,
    'F50 CoM 1 Soul Linker gives floor(value / 2) To Block');
  const unlinkedNormal = derive({ abilities: { soulLinkerAura: 5 } });
  assertClose(unlinkedNormal.toHitMelee, 0.3,
    'F50 CoM 1 Soul Linker rejects non-Fantastic units');
  assertClose(unlinkedNormal.toBlock, 0.3,
    'F50 CoM 1 Soul Linker leaves non-Fantastic To Block unchanged');

  const orderedAuras = derive({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    rtb: 4, rtbType: 'missile', def: 8, nodeAura: 'nature',
    abilities: {
      guidingBeaconAura: 3, divineBarrierAura: 4, soulLinkerAura: 5,
      mindStorm: true, warpAttack: true, warpDefense: true,
    },
  });
  const orderedIds = orderedAuras.statTrace.map(event => event.id);
  for (const [earlier, later] of [
    ['nodeAura', 'guidingBeaconAura:coM1'],
    ['guidingBeaconAura:coM1', 'divineBarrierAura:coM1'],
    ['divineBarrierAura:coM1', 'soulLinkerAura:coM1'],
    ['soulLinkerAura:coM1', 'mindStorm'],
    ['mindStorm', 'warpAttack'],
    ['warpAttack', 'warpDefense'],
  ]) {
    assert(orderedIds.indexOf(earlier) >= 0 && orderedIds.indexOf(earlier) < orderedIds.indexOf(later),
      `F50 CoM 1 source order keeps ${earlier} before ${later}`);
  }

  const warded = derive({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, abilities: { realmWard: 'chaos' },
  });
  assertEqual(warded.def, 3, 'F51 matching CoM 1 Realm Ward removes three Defense');
  assertEqual(warded.res, 4, 'F51 matching CoM 1 Realm Ward removes three Resistance');
  assertClose(warded.toHitMelee, 0.1,
    'F51 matching CoM 1 Realm Ward removes 20 percentage points To Hit');
  const wrongWard = derive({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, abilities: { realmWard: 'nature' },
  });
  assertEqual(wrongWard.def, 6, 'F51 nonmatching CoM 1 Realm Ward is inert');
  const normalWard = derive({ def: 6, res: 7, abilities: { realmWard: 'chaos' } });
  assertEqual(normalWard.def, 6, 'F51 CoM 1 Realm Ward rejects non-Fantastic units');
  for (const realm of ['nature', 'sorcery', 'chaos', 'life', 'death']) {
    const matchingWard = derive({
      baseFantastic: true,
      baseRace: realm[0].toUpperCase() + realm.slice(1),
      unitType: `fantastic_${realm}`,
      def: 6, res: 7, abilities: { realmWard: realm },
    });
    assertEqual(matchingWard.def, 3,
      `F51 CoM 1 ${realm} Realm Ward maps to its matching Fantastic realm`);
  }

  const wardOrder = derive({
    isHero: true, baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    def: 6, res: 9, abilities: {
      supremeLight: true, realmWard: 'life', tactician: true,
    },
  });
  const wardOrderIds = wardOrder.statTrace.map(event => event.id);
  assert(wardOrderIds.indexOf('supremeLight:coM1') < wardOrderIds.indexOf('realmWard')
      && wardOrderIds.indexOf('realmWard') < wardOrderIds.indexOf('tactician:coM1'),
  'F51 CoM 1 Realm Ward stays between Supreme Light and Tactician');

  const warpedBeforeSupremeLight = derive({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    def: 1, res: 20,
    abilities: { mindStorm: true, warpDefense: true, supremeLight: true },
  });
  assertEqual(warpedBeforeSupremeLight.def, 4,
    'F53 CoM 1 signed -4 / 3 truncates to -1 before Supreme Light adds 5');
  const warpedBeforeTactician = derive({
    isHero: true, unitType: 'hero', def: 1,
    abilities: { mindStorm: true, warpDefense: true, tactician: true },
  });
  assertEqual(warpedBeforeTactician.def, 1,
    'F53 CoM 1 signed -4 / 3 truncates to -1 before hero Tactician adds 2');
  const warpTraceIds = warpedBeforeTactician.statTrace.map(event => event.id);
  assert(warpTraceIds.indexOf('mindStorm') < warpTraceIds.indexOf('warpDefense')
      && warpTraceIds.indexOf('warpDefense') < warpTraceIds.indexOf('tactician:coM1'),
  'F53 CoM 1 trace preserves negative pre-Warp Defense and later Tactician ordering');

  for (const version of [
    'mom_1.31', 'mom_cp_1.60.00', 'com2_1.05.11', 'com2_warlord_1.5.12.7',
  ]) {
    const inert = ctx.deriveUnitStats(baseUnitInput({
      version, baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
      rtb: 3, rtbType: 'missile', def: 6, res: 7,
      abilities: {
        realmWard: 'chaos', guidingBeaconAura: 0,
        divineBarrierAura: 0, soulLinkerAura: 0,
      },
    }));
    assertEqual(inert.def, 6, `F51 Realm Ward is inert in ${version}`);
    assertEqual(inert.res, 7, `F51 Realm Ward leaves Resistance unchanged in ${version}`);
    assertClose(inert.toHitMelee, 0.3, `F51 Realm Ward leaves To Hit unchanged in ${version}`);
  }
  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    const inertAuras = ctx.deriveUnitStats(baseUnitInput({
      version, baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
      rtb: 3, rtbType: 'missile', def: 6,
      abilities: {
        guidingBeaconAura: 5, divineBarrierAura: 5, soulLinkerAura: 5,
      },
    }));
    assertEqual(inertAuras.rtb, 3, `F50 side maxima are inert in ${version} Ranged`);
    assertEqual(inertAuras.def, 6, `F50 side maxima are inert in ${version} Defense`);
    assertClose(inertAuras.toHitMelee, 0.3, `F50 side maxima are inert in ${version} To Hit`);
    assertClose(inertAuras.toBlock, 0.3, `F50 side maxima are inert in ${version} To Block`);
  }
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const unchangedModern = ctx.deriveUnitStats(baseUnitInput({
      version, baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
      rtb: 3, rtbType: 'missile', def: 6,
      abilities: {
        guidingBeaconAura: 5, divineBarrierAura: 5, soulLinkerAura: 5,
      },
    }));
    assertEqual(unchangedModern.rtb, 8, `F50 modern Guiding Beacon remains full-value in ${version}`);
    assertEqual(unchangedModern.def, 11, `F50 modern Divine Barrier remains full-value in ${version}`);
    assertClose(unchangedModern.toHitMelee, 0.35,
      `F50 modern Soul Linker remains full-value To Hit in ${version}`);
    assertClose(unchangedModern.toBlock, 0.35,
      `F50 modern Soul Linker remains full-value To Block in ${version}`);
  }

  const unchangedWarpCases = [
    ['mom_1.31', 9, 4],
    ['mom_cp_1.60.00', 9, 4],
    ['com2_1.05.11', 9, 3],
    ['com2_warlord_1.5.12.7', 9, 3],
  ];
  for (const [version, defense, expected] of unchangedWarpCases) {
    const warped = ctx.deriveUnitStats(baseUnitInput({
      version, def: defense, abilities: { warpDefense: true },
    }));
    assertEqual(warped.def, expected, `F53 unchanged positive Warp Defense in ${version}`);
  }
}

function runR9G1eChecks(ctx) {
  const versions = [
    'mom_1.31', 'mom_cp_1.60.00', 'com_6.08',
    'com2_1.05.11', 'com2_warlord_1.5.12.7',
  ];
  const materials = ['magic', 'mithril', 'adamantium'];
  for (const version of versions) {
    for (const weapon of materials) {
      const melee = ctx.deriveUnitStats(baseUnitInput({ version, weapon, atk: 2 }));
      assertClose(melee.toHitMelee, 0.4,
        `R9-G1e ${version} ${weapon} material adds 10% to positive melee`);
      const noMelee = ctx.deriveUnitStats(baseUnitInput({ version, weapon, atk: 0 }));
      assertClose(noMelee.toHitMelee, 0.3,
        `R9-G1e ${version} ${weapon} material does not create a melee chance channel`);

      for (const rtbType of ['missile', 'boulder', 'thrown']) {
        const physical = ctx.deriveUnitStats(baseUnitInput({
          version, weapon, rtb: 2, rtbType,
        }));
        assertClose(physical.toHitRtb, 0.4,
          `R9-G1e ${version} ${weapon} material adds 10% to ${rtbType}`);
        assert(physical.modifierTraces.toHitRanged.entries
          .some(entry => entry.source.id === 'weapon'),
        `R9-G1e ${version} ${weapon} ${rtbType} trace attributes the material write`);
      }

      for (const rtbType of ['magic_c', 'fire', 'lightning', 'stoning_gaze']) {
        const excluded = ctx.deriveUnitStats(baseUnitInput({
          version, weapon, rtb: 2, rtbType,
        }));
        assertClose(excluded.toHitRtb, 0.3,
          `R9-G1e ${version} ${weapon} material excludes ${rtbType}`);
      }
    }
  }

  const dosZeroThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', weapon: 'mithril', rtb: 0, rtbType: 'thrown',
  }));
  assertClose(dosZeroThrown.toHitRtb, 0.4,
    'R9-G1e DOS material Thrown gate is type-only even at zero strength');
  const modernZeroThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', weapon: 'mithril', rtb: 0, rtbType: 'thrown',
  }));
  assertClose(modernZeroThrown.toHitRtb, 0.3,
    'R9-G1e modern material Thrown gate requires positive current strength');
  assertEqual(modernZeroThrown.rtbToHitWpnBonus, 0,
    'R9-G1e modern zero-strength Thrown reports no applied material bonus');
  const modernZeroRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', weapon: 'mithril', rtb: 0, rtbType: 'missile',
  }));
  assertClose(modernZeroRanged.toHitRtb, 0.4,
    'R9-G1e modern non-magical Ranged material gate has no strength test');
  const createdModernThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', weapon: 'mithril', atk: 1,
    rtb: 0, rtbType: 'none', abilities: { outlanderWizard: true, explosive: true },
  }));
  assertClose(createdModernThrown.toHitRtb, 0.4,
    'R9-G1e modern material gate reads a Thrown field created before ApplyMagicWeapons');
  const trueLightCreatedMelee = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', weapon: 'mithril', atk: 0,
    identity: ctx.createUnitIdentity({
      version: 'com2_warlord_1.5.12.7', baseRace: 'Life', baseFantastic: false,
    }),
    trueLight: true,
  }));
  assert(trueLightCreatedMelee.statTrace.some(event => event.id === 'trueLight'
      && event.changes.atk && event.changes.atk.from === 0 && event.changes.atk.to === 1),
  'R9-G1e Warlord True Light creates live melee before ApplyMagicWeapons');
  assertClose(trueLightCreatedMelee.toHitMelee, 0.3,
    'R9-G1e modern material melee gate still reads the zero persistent/base channel');

  const comFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', weapon: 'mithril', rtb: 2, rtbType: 'missile',
    abilities: { focusMagic: true },
  }));
  assertClose(comFocus.toHitRtb, 0.3,
    'R9-G1e CoM 1 Focus Magic suppresses the material shared-slot To-Hit write');
  const modernFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', weapon: 'mithril', rtb: 2, rtbType: 'missile',
    abilities: { focusMagic: true },
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  assertClose(modernFocus.modernAttacks.ranged.toHit, 0.3,
    'R9-G1e modern Focus conversion is magical before ApplyMagicWeapons');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const thrownAttacker = ctx.deriveUnitStats(baseUnitInput({
      version, weapon: 'magic', atk: 1, def: 0, hp: 10,
      modernAttacks: { thrown: { strength: 1, type: 'thrown' } },
    }));
    assertClose(thrownAttacker.modernAttacks.thrown.toHit, 0.4,
      `R9-G1e ${version} writes the material bonus to the independent Thrown channel`);
    const target = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', atk: 0, def: 0, hp: 10,
    }));
    const thrownResult = ctx.resolveCombat(thrownAttacker, target,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
    assertClose(thrownResult.totalDmgToB[0], 0.36,
      `R9-G1e ${version} combat consumes both 40% material melee and Thrown chances`);
    assertClose(thrownResult.totalDmgToB[1], 0.48,
      `R9-G1e ${version} combat combines the material melee and Thrown channels`);
    assertClose(thrownResult.totalDmgToB[2], 0.16,
      `R9-G1e ${version} combat retains independent material melee and Thrown hits`);

    const rangedAttacker = ctx.deriveUnitStats(baseUnitInput({
      version, weapon: 'magic', atk: 0, def: 0, hp: 10,
      modernAttacks: { ranged: { strength: 1, type: 'missile' } },
    }));
    assertClose(rangedAttacker.modernAttacks.ranged.toHit, 0.4,
      `R9-G1e ${version} writes the material bonus to the independent Ranged channel`);
    const rangedResult = ctx.resolveCombat(rangedAttacker, target,
      { version, isRanged: true, wallOfFire: false, distance: 1 });
    assertClose(rangedResult.totalDmgToB[0], 0.6,
      `R9-G1e ${version} combat consumes the 40% material Ranged miss chance`);
    assertClose(rangedResult.totalDmgToB[1], 0.4,
      `R9-G1e ${version} combat consumes the 40% material Ranged hit chance`);
  }
}

// --- M9 stage 1: the canonical engine-version scope ---
//
// `Calculator/steps.js` STEP_VERSION_SCOPES is the single home for which engines make a
// derivation write at all. Stage 1 classifies and validates only: nothing filters a sequence
// yet, so every version's arithmetic is unchanged. These checks are what make the
// classification a claim rather than a comment.
//
// Three inventories per version, each asserted for exact equality so it can neither grow
// silently nor rot once stage 2 shrinks it:
//   members        composed into the sequence although this engine has no such write. Stage 2
//                  filters these; in region `c` they are the manifest entries parked behind a
//                  false predicate, and the execution ledger records a `skipped` visit for a
//                  branch the binary does not contain.
//   predicateTrue  the complement assertion's violations: out of scope, yet `when` still says
//                  yes. This is the backlog's "a step excluded for a version must never
//                  evaluate its predicate true there", enumerated rather than enforced,
//                  because enforcing it in stage 1 would not be behavior-neutral.
//   changed        the subset that also writes a field, so stage 2's filter would change a
//                  displayed number for these inputs. Each of the ten is an enchantment whose
//                  own UI control is hidden in that version (data.js `subgroup`), so the state
//                  is not reachable through the UI — but it is reachable programmatically, and
//                  stage 2 has to justify each removal rather than assume it is inert.
const STAGE2_SCOPE_EXCEPTIONS = {
  'mom_1.31': {
    members: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother',
      'base:chance:survivalInstinctToBlock', 'base:dragonMound', 'base:energyCannon',
      'base:identity:zombies:toBlock', 'base:lightningBlade:breath', 'base:ludusAgoge',
      'base:militaryWorkshop', 'base:motherFungus', 'base:naturalSelection:coal',
      'base:naturalSelection:iron', 'base:naturalSelection:nightshade',
      'base:naturalSelection:powerMinerals', 'base:naturalSelection:wildGame',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:badMoon',
      'c:blazingMarch', 'c:blazingMarch:ranged', 'c:chance:heavenlyLight:melee',
      'c:chance:heavenlyLight:rtb', 'c:darkForce', 'c:darkness:coM1', 'c:destiny',
      'c:discipline', 'c:divineBarrierAura:coM1', 'c:endurance',
      'c:eternalNight:enemyResistance', 'c:eternalNight:enemyResistance:coM1', 'c:focusMagic',
      'c:focusMagic:conversion', 'c:goodMoon', 'c:guidingBeaconAura:coM1', 'c:heavenlyLight',
      'c:landLinking:breath', 'c:mysticSurge', 'c:natureConjunction', 'c:orihalcon',
      'c:realmWard', 'c:reinforceMagic:ranged', 'c:soulLinkerAura:coM1', 'c:spellWard',
      'c:supremeLight:coM1', 'e:chance:clamp', 'e:chance:modernClampCommon', 'e:supremeLight',
    ],
    predicateTrue: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother', 'base:dragonMound',
      'base:ludusAgoge', 'base:militaryWorkshop', 'base:motherFungus',
      'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:blazingMarch',
      'c:blazingMarch:ranged', 'c:discipline', 'c:endurance', 'c:landLinking:breath',
      'c:mysticSurge', 'c:orihalcon', 'c:reinforceMagic:ranged',
    ],
    changed: ['c:blazingMarch', 'c:mysticSurge'],
  },
  'mom_cp_1.60.00': {
    members: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother',
      'base:chance:survivalInstinctToBlock', 'base:dragonMound', 'base:energyCannon',
      'base:identity:zombies:toBlock', 'base:lightningBlade:breath', 'base:ludusAgoge',
      'base:militaryWorkshop', 'base:motherFungus', 'base:naturalSelection:coal',
      'base:naturalSelection:iron', 'base:naturalSelection:nightshade',
      'base:naturalSelection:powerMinerals', 'base:naturalSelection:wildGame',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:badMoon',
      'c:blazingMarch', 'c:blazingMarch:ranged', 'c:chance:heavenlyLight:melee',
      'c:chance:heavenlyLight:rtb', 'c:darkForce', 'c:darkness:coM1', 'c:destiny',
      'c:discipline', 'c:divineBarrierAura:coM1', 'c:endurance',
      'c:eternalNight:enemyResistance', 'c:eternalNight:enemyResistance:coM1', 'c:focusMagic',
      'c:focusMagic:conversion', 'c:goodMoon', 'c:guidingBeaconAura:coM1', 'c:heavenlyLight',
      'c:landLinking:breath', 'c:mysticSurge', 'c:natureConjunction', 'c:orihalcon',
      'c:realmWard', 'c:reinforceMagic:ranged', 'c:soulLinkerAura:coM1', 'c:spellWard',
      'c:supremeLight:coM1', 'e:chance:clamp', 'e:chance:modernClampCommon', 'e:supremeLight',
    ],
    predicateTrue: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother', 'base:dragonMound',
      'base:ludusAgoge', 'base:militaryWorkshop', 'base:motherFungus',
      'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:blazingMarch',
      'c:blazingMarch:ranged', 'c:discipline', 'c:endurance', 'c:landLinking:breath',
      'c:mysticSurge', 'c:orihalcon', 'c:reinforceMagic:ranged',
    ],
    changed: ['c:blazingMarch', 'c:mysticSurge'],
  },
  'com_6.08': {
    members: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother',
      'base:chance:survivalInstinctToBlock', 'base:dragonMound', 'base:energyCannon',
      'base:lightningBlade:breath', 'base:ludusAgoge', 'base:militaryWorkshop',
      'base:motherFungus', 'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:naturalSelection:wildGame', 'base:pillarOfFaith', 'base:poolOfRepentance',
      'base:sanctaBasilica', 'c:badMoon', 'c:berserk', 'c:blackChannels',
      'c:chance:heavenlyLight:melee', 'c:chance:heavenlyLight:rtb', 'c:darkForce', 'c:darkness',
      'c:destiny', 'c:discipline', 'c:eternalNight:enemyResistance', 'c:giantStrength',
      'c:giantStrength:thrown', 'c:goodMoon', 'c:heavenlyLight', 'c:metalFires',
      'c:natureConjunction', 'c:reinforceMagic:ranged', 'c:spellWard', 'c:stoneSkin',
      'e:chance:clamp', 'e:chance:modernClampCommon', 'e:supremeLight',
    ],
    predicateTrue: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother', 'base:dragonMound',
      'base:ludusAgoge', 'base:militaryWorkshop', 'base:motherFungus',
      'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:blackChannels',
      'c:discipline', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:reinforceMagic:ranged', 'c:stoneSkin',
    ],
    changed: [
      'c:blackChannels', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:reinforceMagic:ranged', 'c:stoneSkin',
    ],
  },
  'com2_1.05.11': {
    members: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother',
      'base:chance:survivalInstinctToBlock', 'base:dragonMound', 'base:energyCannon',
      'base:identity:zombies:toBlock', 'base:lightningBlade:breath', 'base:ludusAgoge',
      'base:militaryWorkshop', 'base:motherFungus', 'base:naturalSelection:coal',
      'base:naturalSelection:iron', 'base:naturalSelection:nightshade',
      'base:naturalSelection:powerMinerals', 'base:naturalSelection:wildGame',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:berserk',
      'c:blackChannels', 'c:darkness:coM1', 'c:divineBarrierAura:coM1',
      'c:eternalNight:enemyResistance:coM1', 'c:giantStrength', 'c:giantStrength:thrown',
      'c:guidingBeaconAura:coM1', 'c:metalFires', 'c:realmWard', 'c:soulLinkerAura:coM1',
      'c:stoneSkin', 'c:supremeLight:coM1', 'e:chance:legacyClamp',
    ],
    predicateTrue: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother', 'base:dragonMound',
      'base:ludusAgoge', 'base:militaryWorkshop', 'base:motherFungus',
      'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:blackChannels',
      'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires', 'c:stoneSkin',
    ],
    changed: [
      'c:blackChannels', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:stoneSkin',
    ],
  },
  'com2_warlord_1.5.12.7': {
    members: [
      'base:identity:zombies:toBlock', 'c:berserk', 'c:blackChannels', 'c:darkness:coM1',
      'c:divineBarrierAura:coM1', 'c:eternalNight:enemyResistance:coM1', 'c:giantStrength',
      'c:giantStrength:thrown', 'c:guidingBeaconAura:coM1', 'c:metalFires', 'c:realmWard',
      'c:soulLinkerAura:coM1', 'c:stoneSkin', 'c:supremeLight:coM1', 'e:chance:legacyClamp',
    ],
    predicateTrue: [
      'c:blackChannels', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:stoneSkin',
    ],
    changed: [
      'c:blackChannels', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:stoneSkin',
    ],
  },
};

// The canonical scope is initialised from PROVENANCE `versions=` and the two are asserted to
// agree, so neither can drift. Where the canonical scope is *wider*, the write demonstrably
// runs in a build whose sources the formula's citations do not cover; that is an evidence gap
// in the citation, not a scope error, and each one is listed here with its reason so a new gap
// cannot appear silently. `tactician` is emitted under a version-chosen id whose PROVENANCE
// lives on the tactician:*Dynamic formulas, so it has no comment of its own.
const SCOPE_PROVENANCE_GAPS = {
  trueLight: ['mom_1.31', 'mom_cp_1.60.00'],
  nodeAura: ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'],
  survivalInstinct: ['com_6.08'],
};
const SCOPE_IDS_WITHOUT_PROVENANCE = ['tactician', 'tactician:coM1'];

// Ability/enchantment values to probe, taken from the definition tables so a new control is
// swept without editing this file. Mutually exclusive effects (Iron Skin supersedes Stone
// Skin, Flame Blade supersedes Metal Fires) are why each key is also probed on its own.
function abilityScopeProbeValues(ctx) {
  const defs = [...evalInContext(ctx, 'ABILITY_DEFS'), ...evalInContext(ctx, 'ENCHANTMENT_DEFS')];
  const values = new Map();
  for (const def of defs) {
    const key = def.calcKey || def.key;
    if (!values.has(key)) values.set(key, new Set());
    const bucket = values.get(key);
    if (def.type === 'bool') bucket.add(true);
    else if (def.type === 'num' || def.type === 'numcheck') bucket.add(3);
    else if (def.type === 'select') {
      for (const option of def.options || []) {
        const value = Array.isArray(option) ? option[0] : option;
        if (value !== 'none') bucket.add(value);
      }
    }
  }
  return [...values].map(([key, set]) => [key, [...set]]);
}

// Every `phase:id` the calculator's sources actually construct a step for. The sweep proves a
// scope row is live by observing the step run; a row the sweep cannot reach has no such proof,
// and listing it as an exception would otherwise exempt it from criterion 9 entirely — a deleted
// step would keep its stale row forever. Scanning the construction sites gives those rows the
// same existence proof by other means. A form this misses fails the assertion loudly rather than
// passing vacuously, because the key it could not find simply is not in the returned set.
function constructibleStepKeys() {
  const keys = new Set();
  const phases = 'base|a|b|c|d|e|attackSpecific';
  for (const file of ['Calculator/stats.js', 'Calculator/combat.js']) {
    const text = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
    // statStep({ id: 'x', … phase: 'p', … }) — the two fields need not share a line, so the
    // search window has to end at the next construction site. Without that bound a step whose
    // phase is a variable rather than a literal (`makeTrueLightStep`'s `phase,`) would silently
    // adopt the next step's phase and invent a key that no step has.
    for (const match of text.matchAll(/statStep\(\{\s*id:\s*'([^']+)'/g)) {
      const next = text.indexOf('statStep({', match.index + match[0].length);
      const end = Math.min(next === -1 ? text.length : next, match.index + 600);
      const phase = new RegExp(`phase:\\s*'(${phases})'`).exec(text.slice(match.index, end));
      if (phase) keys.add(`${phase[1]}:${match[1]}`);
    }
    // attackSpecificStep(id, …) hard-codes phase 'attackSpecific' in its own body.
    for (const match of text.matchAll(/attackSpecificStep\(\s*'([^']+)'/g)) {
      keys.add(`attackSpecific:${match[1]}`);
    }
    // emit(id, phase, …) and abilityStatStep(id, phase, …) take the phase positionally.
    for (const match of text.matchAll(
      new RegExp(`(?:emit|abilityStatStep)\\(\\s*'([^']+)',\\s*'(${phases})'`, 'g'))) {
      keys.add(`${match[2]}:${match[1]}`);
    }
    // addChanceDelta(id, source, phase, …) — the source object's own strings are never phases.
    for (const match of text.matchAll(/addChanceDelta\(\s*'([^']+)'/g)) {
      const call = text.slice(match.index, match.index + 400);
      const phase = new RegExp(`'(${phases})'`).exec(call.slice(match[0].length));
      if (phase) keys.add(`${phase[1]}:${match[1]}`);
    }
  }
  return keys;
}

function assertSameKeyList(actual, expected, message) {
  const actualText = actual.join(', ');
  const expectedText = expected.join(', ');
  assertionCount += 1;
  if (actualText !== expectedText) {
    const added = actual.filter(key => !expected.includes(key));
    const removed = expected.filter(key => !actual.includes(key));
    throw new Error(`${message}:${added.length ? ` unexpected [${added.join(', ')}]` : ''}`
      + `${removed.length ? ` no longer present [${removed.join(', ')}]` : ''}`);
  }
}

function runCanonicalVersionScopeChecks(ctx) {
  const engineVersions = evalInContext(ctx, 'ENGINE_VERSIONS');
  const scopes = evalInContext(ctx, 'STEP_VERSION_SCOPES');
  const resolveScope = evalInContext(ctx, 'resolveStepVersionScope');
  const sequenceViolations = evalInContext(ctx, 'sequenceVersionScopeViolations');
  const assertSequenceScope = evalInContext(ctx, 'assertSequenceVersionScope');
  const phaseRank = evalInContext(ctx, 'STEP_PHASE_RANK');

  assertEqual(engineVersions.length, 5, 'The canonical scope covers exactly five calculator versions');
  for (const version of Object.keys(STAGE2_SCOPE_EXCEPTIONS)) {
    assert(engineVersions.includes(version),
      `Stage-2 exception inventory names a real calculator version (${version})`);
  }
  assertEqual(Object.keys(STAGE2_SCOPE_EXCEPTIONS).length, engineVersions.length,
    'Every calculator version has a stage-2 exception inventory');

  // --- 1. the registry itself ---
  const scopeKeys = Object.keys(scopes);
  assert(scopeKeys.length > 0, 'The canonical version-scope registry is populated');
  for (const key of scopeKeys) {
    const phase = key.slice(0, key.indexOf(':'));
    assert(Object.prototype.hasOwnProperty.call(phaseRank, phase),
      `Version-scope key ${key} names a real step phase`);
    const scope = scopes[key];
    assert(Array.isArray(scope) && scope.length > 0,
      `Version-scope entry ${key} names at least one version`);
    assert(Object.isFrozen(scope), `Version-scope entry ${key} is frozen`);
    assertEqual(new Set(scope).size, scope.length,
      `Version-scope entry ${key} lists no version twice`);
    for (const version of scope) {
      assert(engineVersions.includes(version),
        `Version-scope entry ${key} names a real calculator version (${version})`);
    }
    // A scope is an exact version set: "DOS", "modern" or "all" as a bare label is not one.
    const ordered = engineVersions.filter(version => scope.includes(version));
    assertEqual(scope.join(','), ordered.join(','),
      `Version-scope entry ${key} lists its versions in engine order`);
  }

  // --- 2. the projected To-Hit/To-Block ledger inherits, rather than duplicates, a scope ---
  assertEqual(resolveScope('c', 'chance:lucky'), resolveScope('c', 'lucky'),
    'A projected chance step inherits the scope of the step it projects');
  assertEqual(resolveScope('b', 'chance:trueLightIllusion'), resolveScope('b', 'trueLight'),
    "True Light's Illusion projection inherits the Warlord region-b scope");
  assertEqual(resolveScope('c', 'nope:missing'), null,
    'An unclassified step resolves no scope rather than defaulting to every version');

  // --- 3. the relationship to PROVENANCE versions= ---
  const provenanceVersions = new Map();
  for (const file of ['Calculator/stats.js', 'Calculator/combat.js']) {
    const lines = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8').split(/\r?\n/);
    for (const comment of readProvenanceComments(file, lines)) {
      const match = /^(?:VERIFIED|UNVERIFIED)\s+versions=([^;]+);/.exec(comment.body);
      if (match) {
        provenanceVersions.set(comment.id,
          match[1].split(',').map(value => value.trim()).filter(Boolean));
      }
    }
  }
  const scopeUnionById = new Map();
  for (const key of scopeKeys) {
    const id = key.slice(key.indexOf(':') + 1);
    if (!scopeUnionById.has(id)) scopeUnionById.set(id, new Set());
    for (const version of scopes[key]) scopeUnionById.get(id).add(version);
  }
  const observedGaps = {};
  const observedMissingProvenance = [];
  for (const [id, union] of scopeUnionById) {
    const provenance = provenanceVersions.get(id);
    if (!provenance) { observedMissingProvenance.push(id); continue; }
    // An id may be written by more than one step object when two engines make the same effect
    // from different regions, so the reviewed versions must fall inside the union.
    for (const version of provenance) {
      assert(union.has(version),
        `PROVENANCE[${id}] claims ${version}, which the canonical scope excludes`);
    }
    const wider = [...union].filter(version => !provenance.includes(version));
    if (wider.length > 0) observedGaps[id] = wider.sort();
  }
  assertSameKeyList(observedMissingProvenance.sort(), [...SCOPE_IDS_WITHOUT_PROVENANCE].sort(),
    'Only the version-chosen tactician ids lack a PROVENANCE comment of their own');
  assertSameKeyList(Object.keys(observedGaps).sort(), Object.keys(SCOPE_PROVENANCE_GAPS).sort(),
    'The recorded evidence-coverage gaps are exactly the formulas whose scope exceeds their citations');
  for (const [id, versions] of Object.entries(observedGaps)) {
    assertEqual(versions.join(','), [...SCOPE_PROVENANCE_GAPS[id]].sort().join(','),
      `Evidence-coverage gap for ${id} covers the recorded versions`);
  }

  // --- 4. scope at the call site, where no per-step predicate can see it ---
  // All six GetEffectiveResistance steps and all nine EffectiveDefense steps are ungated: the
  // lists are CoM2-only because buildResistanceContext / computeDefenseProfile only reach them
  // from their `startsWith('com2')` branch. Checking membership here is the only way to see it.
  const resistanceSteps = evalInContext(ctx, 'EFFECTIVE_RESISTANCE_STEPS');
  const defenseSteps = evalInContext(ctx, 'EFFECTIVE_DEFENSE_STEPS');
  for (const [label, steps] of [['GetEffectiveResistance', resistanceSteps],
    ['EffectiveDefense', defenseSteps]]) {
    for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
      assertEqual(sequenceViolations(steps, version).length, 0,
        `${label} runs entirely inside its version scope in ${version}`);
    }
    for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
      assertEqual(sequenceViolations(steps, version).length, steps.length,
        `${label} is out of scope for every step in ${version}`);
      let threw = false;
      try { assertSequenceScope(steps, version, label); } catch (error) { threw = true; }
      assert(threw, `${label} entering a sequence under ${version} is caught at the call site`);
    }
  }
  // The DOS engines must not reach those lists at all. effectiveResistance/effectiveDefense
  // assert their own scope while the step-debug switch is on, which it is for this whole run,
  // so every resolveCombat call in these checks has already exercised that guard.
  const dosTarget = ctx.deriveUnitStats(baseUnitInput({ version: 'mom_1.31', res: 8, def: 4 }));
  assertEqual(ctx.effectiveResistance(dosTarget, 'com2_1.05.11', 'chaos'), 8,
    'GetEffectiveResistance still runs for a modern version with the call-site check active');
  let dosThrew = false;
  try { ctx.effectiveResistance(dosTarget, 'mom_1.31', 'chaos'); } catch (error) { dosThrew = true; }
  assert(dosThrew, 'Calling GetEffectiveResistance with a DOS version is caught by the call-site check');

  // --- 5. the sweep: membership, the complement assertion, and inertness ---
  const probes = abilityScopeProbeValues(ctx);
  const everyAbility = {};
  for (const [key, values] of probes) everyAbility[key] = values[0];
  const unitTypes = ['normal', 'hero', 'fantastic_life', 'fantastic_death', 'fantastic_chaos',
    'fantastic_nature', 'fantastic_sorcery', 'fantastic_arcane'];
  const rtbTypes = ['none', 'ranged', 'thrown', 'fire', 'lightning', 'stoning', 'death', 'doom',
    'boulder', 'magic'];
  const globals = [{}, { trueLight: true }, { darkness: true }, { warpReality: true },
    { enemyEternalNight: true, eternalNight: true }, { hurricane: true },
    { cityWalls: 'normal' }, { nodeAura: 'chaos' }, { chaosSurge: true }, { poxHost: true },
    { rangedCheck: true, rangedDist: 5 }];

  const visitedKeys = new Set();
  for (const version of engineVersions) {
    const members = new Set();
    const predicateTrue = new Set();
    const changed = new Set();
    const record = input => {
      const result = ctx.deriveUnitStats(input);
      // Coverage is a throw rather than a counted assertion: it runs once per visited step per
      // derivation, and counting it would bury every other assertion in the suite.
      const scopeOf = event => {
        const scope = resolveScope(event.phase, event.id);
        if (!scope) {
          throw new Error(`step ${event.phase}:${event.id} has no canonical version scope`);
        }
        return scope;
      };
      for (const event of result.statExecutionTrace) {
        visitedKeys.add(`${event.phase}:${event.id}`);
        if (scopeOf(event).includes(version)) continue;
        const key = `${event.phase}:${event.id}`;
        members.add(key);
        if (event.status === 'applied') predicateTrue.add(key);
      }
      for (const event of [...(result.statTrace || []), ...(result.identityTrace || [])]) {
        visitedKeys.add(`${event.phase}:${event.id}`);
        if (!scopeOf(event).includes(version)) changed.add(`${event.phase}:${event.id}`);
      }
      // deriveUnitStats runs four sequences, not one. The stat sequence's complete ledger is
      // read above; the figure sequence and the To-Hit/To-Block ledger keep their own traces,
      // which the result exposes only as projections. Read those too, so `changed` means "no
      // out-of-scope step writes anything this version displays" rather than "none writes a
      // stat". Both sequences are composed unconditionally, so each does carry out-of-scope
      // members outside its scope — `base:altarOfTheSun:figures` and
      // `base:alumniOfAcademy:figures` (Warlord) in every other version, and the two
      // `attackSpecific:chance:*ProbabilityBound` steps (modern) in the DOS builds. None of
      // them fires there, which is what these lists assert rather than assume.
      const projections = result.modifierTraces || {};
      for (const name of ['figures', 'toHitMelee', 'toHitRanged', 'toBlock']) {
        for (const event of (projections[name] && projections[name].entries) || []) {
          visitedKeys.add(`${event.phase}:${event.id}`);
          if (!scopeOf(event).includes(version)) changed.add(`${event.phase}:${event.id}`);
        }
      }
    };
    for (const globalState of globals) {
      for (const unitType of unitTypes) {
        for (const rtbType of rtbTypes) {
          // `orihalcon` is the armor control's only non-normal value; passing a weapon quality
          // such as `magic` here would name the armor axis without exercising it.
          record(baseUnitInput({ ...globalState, version, abilities: { ...everyAbility },
            unitType, rtbType, level: 'elite', weapon: 'magic', armor: 'orihalcon', dmg: 2 }));
        }
      }
    }
    for (const [key, values] of probes) {
      for (const value of values) {
        record(baseUnitInput({ version, abilities: { [key]: value },
          unitType: 'normal', rtbType: 'ranged', level: 'elite' }));
        record(baseUnitInput({ version, abilities: { [key]: value },
          unitType: 'fantastic_chaos', rtbType: 'thrown', level: 'elite' }));
      }
    }
    const expected = STAGE2_SCOPE_EXCEPTIONS[version];
    assertSameKeyList([...members].sort(), expected.members,
      `${version} composes exactly the recorded out-of-scope steps (stage 2 filters these)`);
    assertSameKeyList([...predicateTrue].sort(), expected.predicateTrue,
      `${version} has exactly the recorded complement-assertion violations`);
    assertSameKeyList([...changed].sort(), expected.changed,
      `${version} has exactly the recorded out-of-scope steps that still write a field`);
    // The partition has to hold in both directions, or the inventories describe nothing.
    for (const key of expected.predicateTrue) {
      assert(expected.members.includes(key),
        `${version} complement violation ${key} is also a recorded sequence member`);
    }
    for (const key of expected.changed) {
      assert(expected.predicateTrue.includes(key),
        `${version} out-of-scope writer ${key} also has a true predicate`);
    }
  }

  // --- 6. no orphan entries: a registry row for a step that no longer exists would rot ---
  // The sweep observes steps through what deriveUnitStats exposes, which is the stat sequence's
  // complete execution ledger plus two sparse traces. Everything it cannot see that way is
  // listed here with the reason, so an entry can never go unexplained.
  const unreachedByTheSweep = [
    // The attack-specific routines run on a scratch copy from resolveCombat, not from
    // deriveUnitStats; section 4 above checks their membership directly instead.
    ...resistanceSteps.map(step => `attackSpecific:${step.id}`),
    ...defenseSteps.map(step => `attackSpecific:${step.id}`),
    // The figure sequence is read through its projection above, but a projection carries only
    // the steps that changed `figs`, and neither Warlord building's race/name prerequisite is
    // built by the swept template-less custom unit.
    'base:altarOfTheSun:figures', 'base:alumniOfAcademy:figures',
    // Identity conversions appear only in the sparse identity trace, so they are invisible
    // here unless they change race/Fantastic for the swept template-less custom unit.
    'a:identity:callToArmsPaladins', 'a:identity:chosen', 'a:identity:constructCatapult',
    'b:identity:marionetteChanneler', 'base:identity:com1ConstructCatapult',
    'base:identity:zombies',
    // Writes behind a prerequisite the sweep does not build: the Outlander armorclad reform,
    // and the Rust ranged half, which is merged into the `rust` ability step's apply().
    'b:battleArmor', 'd:rust:ranged',
  ].sort();
  const orphans = scopeKeys.filter(key => !visitedKeys.has(key)).sort();
  assertSameKeyList(orphans, unreachedByTheSweep,
    'Every canonical scope entry names a step the derivation sweep composes, or a listed exception');
  // Exact equality above already catches a *stale* exception — a listed key the sweep starts
  // reaching drops out of `orphans` and the lists disagree. It cannot catch a *deleted* step:
  // its row stays, stays unobserved, stays listed, and keeps classifying nothing. Give every
  // exempted row the existence proof the sweep gives the other 179.
  const constructible = constructibleStepKeys();
  for (const key of unreachedByTheSweep) {
    assert(constructible.has(key),
      `Scope entry ${key} is exempt from the sweep, so its step must still be constructed in source`);
  }
}

function main() {
  const ctx = loadCalculatorContext();
  // Every deriveUnitStats call below runs the step runner's write check (steps.js).
  ctx.setStatStepDebug(true);
  runStatStepChecks(ctx);
  runModifierTraceChecks(ctx);
  runResolutionStepChecks(ctx);
  runModernWeaponImmunityMappingChecks(ctx);
  runIdentityChecks(ctx);
  runDeriveUnitStatsChecks(ctx);
  runDerivationStageChecks(ctx);
  runWarlordUnitAbilityChecks(ctx);
  runToBlockChecks(ctx);
  runPhaseChecks(ctx);
  runF19Checks(ctx);
  runF23Checks(ctx);
  runF50F51F53Checks(ctx);
  runR9G1eChecks(ctx);
  runCanonicalVersionScopeChecks(ctx);
  console.log(JSON.stringify({ allPassed: true, total: assertionCount, failures: [] }));
}

try {
  main();
} catch (err) {
  console.error(err.stack || String(err));
  process.exit(1);
}
