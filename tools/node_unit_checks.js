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
    ['Life', 'fantastic_life'],
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
    version: 'com2_1.05.11', abilities: { callToArmsPaladins: true },
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 113,
      baseRace: 'High Men', baseFantastic: false }),
  }));
  assertEqual(callToArms.identity.race, 'Life', 'Call to Arms Paladins writes live Life');
  assertEqual(callToArms.identity.fantastic, true, 'Call to Arms Paladins writes live Fantastic');

  const invalidCallToArms = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', name: 'Paladins', abilities: { callToArmsPaladins: true },
    identity: ctx.createCustomUnitIdentity('com2_1.05.11', { baseRace: 'High Men' }),
  }));
  assertEqual(invalidCallToArms.identity.race, 'High Men', 'Call to Arms ignores display names');
  assertEqual(invalidCallToArms.identityTrace.length, 0, 'Invalid Call to Arms is trace-free');

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

  const uncappedPillar = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { pillarOfFaithRes: 10 }, res: 1,
  }));
  assertEqual(uncappedPillar.res, 11,
    'Pillar of Faith uses the executing script building count without an artificial cap');

  const naturalSelectionOverwrite = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { powerMinerals: 2, nightshade: true }, res: 3,
  }));
  assertEqual(naturalSelectionOverwrite.res, 4,
    'Natural Selection Nightshade overwrites the earlier Power-mineral resistance write');

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
  assertEqual(phaseOf({ lucky: true, luckyPhaseBase: true, luckyPhaseA: true }, 'lucky'), 'base',
    'Creation-time Lucky grant uses the base stage, and is not counted again later');
  assertEqual(phaseOf({ lucky: true, luckyPhaseB: true }, 'lucky'), 'b',
    'Lucky Star / Divine Protection grant Lucky in phase b');

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
  assertEqual(tacticianHeroCoM2.delta.ranged, 2,
    'Modern Tactician hero targets conventional Ranged');
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
  assertEqual(energyCannon.abilities.destruction, -2, 'Energy Cannon derives Destruction from 30% ranged To-Hit');

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
    'Displayed To Hit trace keeps recalculation writes before resolution-time Vertigo');

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
  assertEqual(lowBlockZombies.modifierTraces.toBlock.entries.slice(-1)[0].id, 'chance:clamp',
    'The initial To Block clamp records the floor when it changes the running value');

  const cappedPlague = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', toHitMod: -20,
    abilities: { plague: true },
  }));
  const cappedSources = cappedPlague.modifierTraces.toHitMelee.entries.map(t => t.id);
  assert(!cappedSources.includes('chance:plague'),
    'Active Plague at the To Hit floor is omitted as an actual no-op');
  assertEqual(cappedPlague.modifierTraces.toHitMelee.result, 10,
    'Omitting capped Plague preserves the displayed To Hit floor');

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
    assertEqual(trace.entries[0].source.id, sourceId, `${label} owns its permanent shared-attack write`);
    assertEqual(trace.entries[0].from, from, `${label} records the editable running value`);
    assertEqual(trace.entries[0].to, to, `${label} records the prepared running value`);
  }

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
    blessEligible: true,
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
  assertEqual(ctx.effectiveDefense(cityWallTarget, 'com2_1.05.11', {
    extraDefense: cityWallTarget.cityWallBonus,
    armorPiercing: true,
  }), 6,
  'City Walls enters EffectiveDefense before Armor Piercing: floor((9 + 3) / 2)');

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
    abilities: { callToArmsPaladins: true },
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
  console.log(JSON.stringify({ allPassed: true, total: assertionCount, failures: [] }));
}

try {
  main();
} catch (err) {
  console.error(err.stack || String(err));
  process.exit(1);
}
