// Resolution-time steps: the attack-specific sequences and the modern Weapon Immunity
// attack-to-weapon mapping.

'use strict';

const {
  assert, assertEqual, assertClose, assertCloseToPrecision, assertDeepEqual, assertIs,
  baseUnitInput, evalInContext,
} = require('./assertions');

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

  const dosPoisonRes = ctx.resistanceQueries('touch',
    { res: 0, unitType: 'hero', abilities: { charmed: true } },
    'mom_1.31', { poison: 1 }, true).poisonRes;
  assertEqual(dosPoisonRes, 30,
    'DOS Charmed adds 30 Resistance to realm-less rolls for heroes');

  const bothElemental = {
    res: 0,
    unitType: 'normal',
    abilities: { elementalArmor: true, resistElements: true },
  };
  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    const stoningRes = ctx.resistanceQueries('touch', bothElemental, version,
      { stoningTouch: 0 }, true).stoningTouchRes;
    assertEqual(stoningRes, 10,
      `${version}: Elemental Armor supersedes Resist Elements on the resistance path`);
  }
  const comStoningRes = ctx.resistanceQueries('touch', bothElemental, 'com_6.08',
    { stoningTouch: 0 }, true).stoningTouchRes;
  assertEqual(comStoningRes, 4,
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

  // Battle_Unit_Defense_Special carries one `defense_special` marker that the later immunity
  // steps cash in, so which marker a build writes last decides the result. MoM 1.31 sets the
  // blanket marker first (131:0x9A66E) and the Weapon Immunity one after it (0x9A68C), so
  // Weapon Immunity overwrites Missile Immunity; CP 1.60 and CoM 1 write them the other way
  // round (160:0x9A66B then 0x9A68C) and the blanket value survives.
  const missileAttacker = {
    unitType: 'normal', weapon: 'normal', generic: false,
    rangedType: 'missile', thrownType: 'none', abilities: {},
  };
  const bothImmunities = {
    def: 4, unitType: 'normal', abilities: { missileImmunity: true, weaponImmunity: true },
  };
  const missileImmuneOnly = { def: 4, unitType: 'normal', abilities: { missileImmunity: true } };
  const markerCases = [
    ['mom_1.31', 10, 50],
    ['mom_cp_1.60.00', 50, 50],
    ['com_6.08', 100, 100],
  ];
  for (const [version, both, missileOnly] of markerCases) {
    assertEqual(ctx.computeDefenseProfile(bothImmunities, missileAttacker, version, 0).vsRanged,
      both, `${version}: Weapon and Missile Immunity resolve in the order that build writes them`);
    assertEqual(ctx.computeDefenseProfile(missileImmuneOnly, missileAttacker, version, 0).vsRanged,
      missileOnly, `${version}: Missile Immunity alone reaches the defense-special value`);
  }

  // The mask admits the Weapon bit for Thrown only where `ranged_type == RAT_THROWN` is
  // satisfiable, which MoM 1.31's second `/ 10` comparison is not (131:0x99235).
  const thrownAttacker = {
    unitType: 'normal', weapon: 'normal', generic: false,
    rangedType: 'none', thrownType: 'thrown', abilities: {},
  };
  const weaponImmuneOnly = { def: 4, unitType: 'normal', abilities: { weaponImmunity: true } };
  for (const [version, expected] of [['mom_1.31', 4], ['mom_cp_1.60.00', 10], ['com_6.08', 12]]) {
    assertEqual(ctx.computeDefenseProfile(weaponImmuneOnly, thrownAttacker, version, 0).vsThrown,
      expected, `${version}: Thrown reaches Weapon Immunity only where the mask admits it`);
  }

  // Combat_Effective_Resistance adds where GetEffectiveResistance assigns, so a DOS unit
  // accumulates every applicable bonus and can finish above the 100 the modern ceiling sets.
  const dosCharmedHero = {
    res: 70, isHero: true, unitType: 'hero',
    abilities: { charmed: true, resistMagic: true, bless: true },
  };
  const dosResistanceTrace = [];
  assertEqual(ctx.dosEffectiveResistance(dosCharmedHero, 'mom_1.31', 'death', dosResistanceTrace),
    108, 'DOS Charmed adds 30 rather than assigning, so Bless and Resist Magic stack past 100');
  assertEqual(ctx.dosEffectiveResistance(dosCharmedHero, 'com_6.08', 'death'), 110,
    "CoM 1 raises only Bless's contribution, leaving the additive shape intact");
  assertEqual(ctx.dosEffectiveResistance(dosCharmedHero, 'mom_1.31', null), 100,
    'A realm-less DOS roll takes Charmed alone: every other bonus is realm-gated');
  assert(dosResistanceTrace.length > 0,
    'Combat_Effective_Resistance emits an ordered trace, which the inline form could not');
  assert(!Object.prototype.hasOwnProperty.call(dosCharmedHero, 'effectiveResistance'),
    'Combat_Effective_Resistance runs on a discarded scratch copy');

  const dosDefenseScratchTarget = {
    def: 4, unitType: 'normal', abilities: { largeShield: true },
  };
  const dosDefenseTrace = [];
  assertEqual(ctx.dosEffectiveDefense(dosDefenseScratchTarget, 'mom_1.31',
    { isRanged: true, armorPiercing: true }, dosDefenseTrace), 3,
  'Battle_Unit_Defense_Special halves the Large Shield bonus with the base: trunc((4 + 2) / 2)');
  assert(!Object.prototype.hasOwnProperty.call(dosDefenseScratchTarget, 'effectiveDefense')
    && !Object.prototype.hasOwnProperty.call(dosDefenseScratchTarget, 'defenseSpecial'),
  'Battle_Unit_Defense_Special runs on a discarded scratch copy');
  assert(dosDefenseTrace.length > 0,
    'Battle_Unit_Defense_Special emits an ordered trace, which the inline form could not');

  const energyDoom = ctx.applyDoomUAHalving({
    atk: 5,
    rtb: 7,
    abilities: { energyWeaponry: true, energyCannon: true },
    modernAttacks: {
      ranged: { strength: 7 },
      thrown: { strength: 5 },
      fireBreath: { strength: 3 },
    },
  }, 'com2_warlord_1.5.12.9');
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
  const warlord = 'com2_warlord_1.5.12.9';
  const derive = overrides => ctx.deriveUnitStats(baseUnitInput({ version: com2, ...overrides }));
  const deriveWarlord = overrides => ctx.deriveUnitStats(baseUnitInput({ version: warlord, ...overrides }));
  const identity = (version, values) => ctx.createUnitIdentity({ version, ...values });
  // A modern probe states the record's own Ranged channel beside the shared slot the card keeps
  // as its projection (`SPEC.md`, *Attack channels on the card*).
  const rangedProbe = type => ({
    rtb: 2, rtbType: type, modernAttacks: { ranged: { strength: 2, type } },
  });

  const chosen = derive({
    identity: identity(com2, { templateId: 34, isHero: true, baseRace: 'Dwarf',
      baseFantastic: false, specialUnit: 'chosen' }),
  });
  const constructCatapult = derive({
    markedAbilities: { combatSummoned: true },
    identity: identity(com2, { templateId: 37, baseRace: 'Special', baseFantastic: false }),
  });
  const callToArmsPaladins = derive({
    markedAbilities: { combatSummoned: true },
    identity: identity(com2, { templateId: 113, baseRace: 'High Men', baseFantastic: false }),
  });
  assert(chosen.identityTrace.some(t => t.id === 'chosen'),
    'Focused Weapon Immunity coverage reaches the Chosen conversion');
  assert(constructCatapult.identityTrace.some(t => t.id === 'constructCatapult'),
    'Focused Weapon Immunity coverage reaches the Construct Catapult conversion');
  assert(callToArmsPaladins.identityTrace.some(t => t.id === 'callToArmsPaladins'),
    'Focused Weapon Immunity coverage reaches the Call to Arms Paladins conversion');

  const encMagicCases = [
    ['ordinary normal unit', derive({}), false],
    ['magic weapon material', derive({ weapon: 'magic' }), true],
    ['mithril weapon material', derive({ weapon: 'mithril' }), true],
    ['adamantium weapon material', derive({ weapon: 'adamantium' }), true],
    ['hero standing grant', derive({ unitType: 'hero' }), true],
    ['natural Fantastic standing grant', derive({ unitType: 'fantastic_nature' }), true],
    ['Combat Summoned conversion', derive({ markedAbilities: { combatSummoned: true } }), true],
    ['Chosen conversion', chosen, true],
    ['Construct Catapult conversion', constructCatapult, true],
    ['Call to Arms Paladins conversion', callToArmsPaladins, true],
    ['Chaos Channels Fire Breath conversion', derive({ markedAbilities: { ccFireBreath: true } }), true],
    ['Chaos Channels Flight conversion', derive({ markedAbilities: { ccFlight: true } }), true],
    ['Chaos Channels Defense conversion', derive({ markedAbilities: { ccDefense: true } }), true],
    ['Destiny conversion', derive({ markedAbilities: { destiny: true } }), true],
    ['Warlord Apotheosis conversion', deriveWarlord({ markedAbilities: { destiny: true } }), true],
    ['Blood Lust conversion', derive({ markedAbilities: { bloodLust: true } }), true],
    ['Undead conversion', derive({ markedAbilities: { undead: true } }), true],
    ['Animated conversion', derive({ markedAbilities: { animated: true } }), true],
    ['Mystic Surge conversion', derive({ markedAbilities: { mysticSurge: true } }), true],
    ['Raise Dead conversion', derive({ markedAbilities: { raiseDead: true } }), true],
    ['Flame Blade', derive({ markedAbilities: { flameBlade: true } }), true],
    ['Holy Weapon', derive({ markedAbilities: { holyWeapon: true } }), true],
    ['Wraith Form', derive({ markedAbilities: { wraithForm: true } }), true],
    ['Ruler of Underworld', derive({ markedAbilities: { rulerOfUnderworld: true } }), true],
    ['Blazing March', derive({ markedAbilities: { blazingMarch: true } }), true],
    ['Warlord Flame Blade', deriveWarlord({ markedAbilities: { flameBlade: true } }), true],
    // Stated through the control the card offers, not the granted key: since F244.3c the Fiery
    // Blade flag reaches the record only through `training:lavaSmelter:flameBlade`, so a raw
    // `fieryBlade` mark writes nothing and this arm would pass on an empty case.
    ['Warlord Fiery Blade',
      deriveWarlord({ markedAbilities: { lavaSmelterFieryBlade: true } }), true],
    ['Warlord Fiery Fury', deriveWarlord({ markedAbilities: { fieryFury: true } }), true],
    ['Warlord Wall of Fire garrison', deriveWarlord({ markedAbilities: { wallOfFireBoost: true } }), true],
    ['Warlord Artificer Mechanical', deriveWarlord({ innateAbilities: { mechanical: true }, markedAbilities: { artificer: true } }), true],
    ['Warlord Sanctify Clergy', deriveWarlord({ innateAbilities: { clergy: true }, markedAbilities: { sanctify: true } }), true],
    ['Warlord Sanctify non-clergy', deriveWarlord({ markedAbilities: { sanctify: true } }), false],
    ['Warlord Blood Lust without conversion', deriveWarlord({ markedAbilities: { bloodLust: true } }), false],
  ];
  for (const [label, unit, expected] of encMagicCases) {
    assertEqual(unit.encMagic, expected, `${label} maps to calculated EncMagic`);
  }

  const spiritLinked = deriveWarlord({
    unitType: 'fantastic_chaos',
    markedAbilities: { spiritLink: true },
  });
  assertEqual(spiritLinked.abilities.liveFantastic, false,
    'Spirit Link clears calculated Fantastic in phase d');
  assertEqual(spiritLinked.encMagic, true,
    'Spirit Link preserves the EncMagic already granted by the phase-c Fantastic rule');
  assertEqual(spiritLinked.encMagicIndependentOfMaterial, true,
    'Spirit Link EncMagic survives enemy weapon-material suppression');

  const spiritLinkedNormalInput = deriveWarlord({ markedAbilities: { spiritLink: true } });
  assertEqual(spiritLinkedNormalInput.abilities.liveFantastic, false,
    'Spirit Link leaves a calculator-reachable normal input non-fantastic after phase d');
  assertEqual(spiritLinkedNormalInput.encMagic, true,
    'Spirit Link phase b makes even that input Fantastic when the standing EncMagic rule runs');

  const wiTarget = derive({
    prefix: 'b', def: 0, innateAbilities: { weaponImmunity: true },
  });
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, derive({}), com2, 0, 'melee'), 8,
    'Ordinary modern physical melee receives the CoM2 Weapon Immunity bonus');
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, spiritLinked, warlord, 0, 'melee'), 0,
    'Spirit-linked physical melee still bypasses Weapon Immunity through persisted EncMagic');

  const blazingThrown = derive({
    atk: 0, rtb: 2, rtbType: 'thrown',
    modernAttacks: { thrown: { strength: 2, type: 'thrown' } },
    markedAbilities: { blazingMarch: true },
  });
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, blazingThrown, com2, 0, 'thrown'), 0,
    'CoM2 Blazing March EncMagic reaches Thrown even though the strength bonus does not');

  const magicRanged = derive({
    atk: 0, rtb: 2, rtbType: 'magic',
    modernAttacks: { ranged: { strength: 2, type: 'magic' } },
  });
  assertEqual(magicRanged.encMagic, false,
    'Innate magical ranged type does not invent the unit-level EncMagic flag');
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, magicRanged, com2, 0, 'ranged'), 0,
    'ApplyAttack magicranged independently bypasses Weapon Immunity');

  const attackLocalMagicCases = [
    ['Magical ranged', derive(rangedProbe('magic')), 'ranged'],
    ['Magical lightning ranged', derive(rangedProbe('magic_lightning')), 'ranged'],
    ['Warlord beam-energy ranged', deriveWarlord(rangedProbe('magic')), 'ranged'],
    ['Fire Breath', derive({ rtb: 2, rtbType: 'fire',
      modernAttacks: { fireBreath: { strength: 2, type: 'fire' } } }), 'thrown'],
    ['Lightning Breath', derive({ rtb: 2, rtbType: 'lightning',
      modernAttacks: { lightningBreath: { strength: 2, type: 'lightning' } } }), 'thrown'],
    ['Doom Gaze', derive({ innateAbilities: { doomGaze: 2 } }), 'gaze'],
    ['Death Gaze', derive({ innateAbilities: { deathGaze: 0 } }), 'gaze'],
    ['Stoning Gaze', derive({ innateAbilities: { stoningGaze: 0 } }), 'gaze'],
  ];
  for (const [label, attacker, attackType] of attackLocalMagicCases) {
    assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, attacker, com2, 0, attackType), 0,
      `${label} maps to ApplyAttack magicranged and bypasses Weapon Immunity`);
  }

  const attackLocalPhysicalCases = [
    ['physical missile ranged', derive(rangedProbe('missile')), 'ranged'],
    ['physical boulder ranged', derive(rangedProbe('boulder')), 'ranged'],
    ['Thrown', derive({ rtb: 2, rtbType: 'thrown',
      modernAttacks: { thrown: { strength: 2, type: 'thrown' } } }), 'thrown'],
  ];
  for (const [label, attacker, attackType] of attackLocalPhysicalCases) {
    assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, attacker, com2, 0, attackType), 8,
      `${label} leaves ApplyAttack magicranged false and receives Weapon Immunity`);
  }

  // `islightning := aflags2.armorpiercing or (Units[au].rangedtype = 30)` on the ranged path
  // (`Combat.ApplyAttack.pas:230-231`), and its one consumer clears Armor Piercing against a
  // Lightning Resist defender (`Combat.ResolutionHelpers.pas:202-203`). Only the id-30 arm is
  // reachable in this calculator: `aflags2` there is `rangedflags`, written by the hero-item
  // `IPLightning` power alone (`Units.RecalculateUnits.pas:1306`), while every Armor Piercing the
  // calculator models is the global `attackflags` one — the roster's `ArmorPiercing=Yes` byte and
  // the script grants, all `AFArmorPiercing` with selector 1, "Global" (`Scripts.TXT:642-643`).
  // The expected numbers are the engine's: an unhalved 8 against a halved 4.
  const lightningResistTarget = { def: 8, unitType: 'normal', abilities: { lightningResist: true } };
  const plainTarget = { def: 8, unitType: 'normal', abilities: {} };
  const rosterLightningAttackers = [
    // CoM2 [33] Chaos Warrior (Warrax) and Warlord [301] Sky Lantern: `UNITS.INI` RangedType 30
    // with the roster's own Armor Piercing. Both rosters are read for the record, not restated.
    [com2, 'COM2_UNITS_DATA', 33],
    [warlord, 'WARLORD_UNITS_DATA', 301],
  ];
  for (const [version, dataName, templateId] of rosterLightningAttackers) {
    const record = evalInContext(ctx, dataName)[String(templateId)];
    assertEqual(record.ranged_type, 'Magic-lightning',
      `${dataName}[${templateId}] ${record.name} carries the id-30 projectile`);
    assert((record.abilities || []).includes('Armor Piercing'),
      `${dataName}[${templateId}] ${record.name} carries roster Armor Piercing`);
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, figs: record.figures, atk: record.melee, def: record.defense,
      res: record.resist, hp: record.hp, rtb: record.ranged, rtbType: 'magic_lightning',
      modernAttacks: { ranged: { strength: record.ranged, type: 'magic_lightning' } },
      innateAbilities: { armorPiercing: true },
    }));
    assertEqual(ctx.computeCasterDefenseForAttack(lightningResistTarget, attacker, version, 0, 'ranged'), 8,
      `${record.name} id-30 ranged sets islightning, so Lightning Resist clears Armor Piercing`);
    assertEqual(ctx.computeCasterDefenseForAttack(plainTarget, attacker, version, 0, 'ranged'), 4,
      `${record.name} id-30 ranged still halves a defender without Lightning Resist`);
    const magicAttacker = ctx.deriveUnitStats(baseUnitInput({
      version, figs: record.figures, atk: record.melee, def: record.defense,
      res: record.resist, hp: record.hp, rtb: record.ranged, rtbType: 'magic',
      modernAttacks: { ranged: { strength: record.ranged, type: 'magic' } },
      innateAbilities: { armorPiercing: true },
    }));
    assertEqual(ctx.computeCasterDefenseForAttack(lightningResistTarget, magicAttacker, version, 0, 'ranged'), 4,
      `${record.name} retyped to a plain magical projectile leaves islightning false, so Armor Piercing still halves`);
  }

  const rulerTarget = derive({
    prefix: 'b', def: 0, markedAbilities: { rulerOfUnderworld: true },
  });
  for (const material of ['magic', 'mithril', 'adamantium']) {
    assertEqual(ctx.computeCasterDefenseForAttack(
      rulerTarget, derive({ weapon: material }), com2, 0, 'melee'), 8,
      `Enemy Ruler of Underworld suppresses the ${material} ApplyMagicWeapons grant`);
  }
  assertEqual(ctx.computeCasterDefenseForAttack(
    rulerTarget,
    deriveWarlord({ innateAbilities: { mechanical: true }, markedAbilities: { artificer: true } }),
    warlord, 0, 'melee'), 10,
    'Enemy Ruler of Underworld suppresses Artificer\'s derived material grant');
  assertEqual(ctx.computeCasterDefenseForAttack(
    rulerTarget, derive({ markedAbilities: { flameBlade: true } }), com2, 0, 'melee'), 0,
    'A later Flame Blade EncMagic write survives enemy Ruler of Underworld suppression');
  assertEqual(ctx.computeCasterDefenseForAttack(
    rulerTarget, deriveWarlord({ markedAbilities: { wallOfFireBoost: true } }), warlord, 0, 'melee'), 0,
    'The earlier Warlord Wall of Fire EncMagic write also survives material suppression');
}

// --- F34: Bless's Defense bonus reaches a spell and no unit attack ---
//
// Tag: regression.  Anchor: F34.  All that survives of `defense-cap-bless-f32-f34`, which F268.4
// reduced from 216 assertions to these.  It keeps its own `--only bless-spell-only-f34` command
// through `MIGRATED_SUITES`; the file it came from is gone.
//
// **F32 was retired outright as corpus-reachable.**  Its claim was the modern defense-dice split:
// the first 15 dice roll at the uncapped chance and the rest at the capped one.  Three separate
// wrong implementations - `capDice: 30`, no split at all, and a capped chance equal to the
// uncapped one - each fail the same two preset fixtures,
// `weaponImmunityAfterMissileImmunityCoM2` and `lavaSmelterProtectionsStackWarlord`.  **Those two
// are load-bearing for the whole split and are named for other subjects, so a later pass must not
// retire them blind.**  Two fixtures is a thin margin, and F268.4 says so in its report rather
// than papering over it.
//
// **Most of F34 went the same way.**  Letting Bless reach any attack at all fails five fixtures
// (`spiritLinkBlessNoBonusWarlord`, `blessMeleeFromDeathCoM2`, `blessMeleeFromChaosCoM2`,
// `blessMagicRangedNoDefCoM2`, `blessMagicRangedNoDefWarlord`), and disabling its Resistance half
// fails four (`destructionBlessCoM2`, `destructionBlessWarlord`, `blessResistBonusCoM2`,
// `blessResistBonusWarlord`).
//
// **The `spellId > 0` term is the one part nothing else reaches.**  Dropping it alone - so the
// bonus applies to anything `magicImmunityEligible`, which every unit attack channel is - left all
// 1,161 fixtures green on all four moments and all ten damage-category moments, and the other
// 29,664 Node assertions with them.  That term is what makes the bonus spell-only, and it is the
// `EncBless` block's own `spellid > 0` guard at `Caster.exe` `0x5966B8`-`0x596703`.

const F34_MODERN = ['com2_1.05.11', 'com2_warlord_1.5.12.9'];

// [F32-1..F32-5] The modern defense-dice split, at an **ordinary** block probability.
//
// F268.4 first deleted F32 whole, on the strength of three mutations that all failed
// `weaponImmunityAfterMissileImmunityCoM2` and `lavaSmelterProtectionsStackWarlord`.  Its review
// broke that with a fourth: applying the split only when the chance is already 1 --
// `if (chance < 1) return binomialPMF(defStr, chance);` at the head of `defenseBlockPMF` -- moves
// the mean blocks over 20 dice from **10.5 to 12** and is caught by **nothing**: not the corpus,
// not the rest of the Node checks.  Both of those fixtures roll their first 15 dice at 100%, so
// neither exercises the split at an ordinary probability, and the whole claim rested on them.
// Reproduced before restoring.  The lesson recorded in the journal: a fixture that catches three
// mutations of a rule can still be blind to the rule's ordinary case.
function runDefenseSplitF32Checks(ctx) {
  const makeUnit = (version, prefix, overrides = {}) => ctx.deriveUnitStats(baseUnitInput({
    prefix, version, atk: 0, def: 0, res: 10, hp: 100, toBlkMod: 0,
    ...(version.startsWith('com2') ? { hitChance: 70 } : { toHitMod: 70, toHitRtbMod: 70 }),
    ...overrides,
  }));
  const mean = dist => dist.reduce((sum, p, value) => sum + p * value, 0);

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const attacker = makeUnit(version, 'a', {
      rtb: 20, rtbType: 'missile',
      modernAttacks: { ranged: { strength: 20, type: 'missile' } },
    });
    const defender = makeUnit(version, 'b', { def: 20, toBlkMod: 30 });
    const profile = ctx.buildToBlockContext(attacker, defender, 0, 0, version)
      .bToBlockVsARangedEW;

    // The profile the to-block context builds: 60% for the first 15 dice, 30% after.
    assertDeepEqual(profile, { chance: 0.6, capDice: 15, cappedChance: 0.3 },
      `${version}: the modern to-block profile splits after die 15`);
    // 15 x 0.6 + 5 x 0.3.  This is the assertion the review's counter-example needs: it reads the
    // split at an ordinary chance, where the two surviving fixtures read it only at 100%.
    assertCloseToPrecision(mean(ctx.defenseBlockPMF(20, profile)), 10.5, 12,
      `${version}: mean blocks over 20 dice at 60% then 30%`);
    // Exactly 15 dice never reach the cap, so the same profile means a flat 60% there.
    assertCloseToPrecision(mean(ctx.defenseBlockPMF(15, profile)), 9, 12,
      `${version}: mean blocks over 15 dice, none of them capped`);
    // And the distribution is the convolution of two independent binomials — an independent
    // statement of the rule, not a restatement of `defenseBlockPMF`'s own arithmetic.
    const independent = ctx.convolveDists(
      ctx.binomialPMF(15, 0.60), ctx.binomialPMF(5, 0.30), 20);
    const actual = ctx.defenseBlockPMF(20, profile);
    assertIs(actual.length, 21, `${version}: the 20-die block PMF has 21 outcomes`);
    for (let blocked = 0; blocked < actual.length; blocked += 1) {
      assertCloseToPrecision(actual[blocked], independent[blocked], 14,
        `${version}: block PMF at ${blocked} matches the independent convolution`);
    }
  }

  // The DOS control: one flat chance and no cap dice, so 20 dice at 60% mean 12 rather than 10.5.
  // Without it "10.5" could be read as arithmetic rather than as the modern engine's own rule.
  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const chance = ctx.buildToBlockContext(
      makeUnit(version, 'a'), makeUnit(version, 'b', { def: 20, toBlkMod: 30 }), 0, 0, version,
    ).bToBlockVsAMelee;
    assertIs(chance, 0.6, `${version}: the DOS block chance is a bare number, not a profile`);
    assertCloseToPrecision(mean(ctx.defenseBlockPMF(20, chance)), 12, 12,
      `${version}: mean blocks over 20 dice at a flat 60%`);
  }
}

function runBlessSpellOnlyF34Checks(ctx) {
  const target = blessed => ({
    def: 4,
    res: 0,
    unitType: 'normal',
    abilities: blessed ? { bless: true } : {},
    cityWallBonus: 0,
  });
  // One attacker per channel the engine can deal an attack on, because `spellid` is 0 for every
  // one of them and the bonus must reach none.
  const channels = {
    melee: { unitType: 'fantastic_chaos', rangedType: 'none', thrownType: 'none', abilities: {} },
    ranged: { unitType: 'fantastic_chaos', rangedType: 'magic', thrownType: 'none', abilities: {} },
    breath: { unitType: 'fantastic_chaos', rangedType: 'none', thrownType: 'fire', abilities: {} },
    gaze: {
      unitType: 'fantastic_death', rangedType: 'none', thrownType: 'none',
      abilities: { deathGaze: -2 },
    },
  };

  for (const version of F34_MODERN) {
    const defenseBonus = version.startsWith('com2_warlord') ? 7 : 5;

    // [F34-1..F34-4] no unit attack channel sees the Defense bonus
    for (const [name, attacker] of Object.entries(channels)) {
      const attackType = name === 'breath' ? 'thrown' : name;
      assertIs(
        ctx.computeCasterDefenseForAttack(target(true), attacker, version, 0, attackType),
        ctx.computeCasterDefenseForAttack(target(false), attacker, version, 0, attackType),
        `${version} ${name}: Bless does not change the defense against a unit attack`);
    }
    // [F34-5] The control the claim needs: a qualifying spell *does* get the bonus, so "does not
    // change" above is about the channel and not about Bless being inert on this target.
    assertIs(ctx.effectiveDefense(target(true), version, {
      spellId: 99, spellRealm: 'chaos', magicImmunityEligible: true,
    }), 4 + defenseBonus, `${version}: Bless applies against a chaos spell`);
    // [F34-6] and spell id 0 is not a spell - the term the corpus cannot reach.
    assertIs(ctx.effectiveDefense(target(true), version, {
      spellId: 0, spellRealm: 'chaos', magicImmunityEligible: true,
    }), 4, `${version}: Bless does not apply at spell id 0`);
    // [F34-7] The Death realm is the second admitted one and needs a case of its own.  F268.4's
    // review dropped `|| ctx.spellRealm === 'death'` from the gate and **nothing** failed - not
    // the corpus, not the rest of the Node checks - because every fixture carrying the realm gate
    // exercises the Chaos arm.  Reproduced (defense 9 -> 4 in CoM2, 11 -> 4 in Warlord) and
    // restored on that counter-example.
    assertIs(ctx.effectiveDefense(target(true), version, {
      spellId: 1, spellRealm: 'death', magicImmunityEligible: true,
    }), 4 + defenseBonus, `${version}: Bless applies against a death spell too`);
    // [F34-8] and a realm neither arm admits still gets nothing.
    assertIs(ctx.effectiveDefense(target(true), version, {
      spellId: 1, spellRealm: 'life', magicImmunityEligible: true,
    }), 4, `${version}: Bless does not apply against a life spell`);
  }
}

// One entry point, so `--only defense-cap-bless-f32-f34` runs both halves.
function runDefenseCapBlessF32F34Checks(ctx) {
  runDefenseSplitF32Checks(ctx);
  runBlessSpellOnlyF34Checks(ctx);
}

module.exports = {
  runResolutionStepChecks, runModernWeaponImmunityMappingChecks,
  runDefenseCapBlessF32F34Checks,
};
