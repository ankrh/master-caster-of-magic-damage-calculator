// Resolution-time steps: the attack-specific sequences and the modern Weapon Immunity
// attack-to-weapon mapping.

'use strict';

const { assert, assertEqual, assertClose, baseUnitInput, evalInContext } = require('./assertions');

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

  const dosResistance = ctx.buildResistanceContext(
    { res: 0, unitType: 'normal', abilities: {} },
    { res: 0, unitType: 'hero', abilities: { charmed: true } },
    'mom_1.31');
  assertEqual(dosResistance.bResPoison, 30,
    'DOS Charmed adds 30 Resistance to realm-less rolls for heroes');

  const bothElemental = {
    res: 0,
    unitType: 'normal',
    abilities: { elementalArmor: true, resistElements: true },
  };
  const plainResistanceSource = { res: 0, unitType: 'normal', abilities: {} };
  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    const context = ctx.buildResistanceContext(
      plainResistanceSource, bothElemental, version);
    assertEqual(context.bResStoning, 10,
      `${version}: Elemental Armor supersedes Resist Elements on the resistance path`);
  }
  const comResistance = ctx.buildResistanceContext(
    plainResistanceSource, bothElemental, 'com_6.08');
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
    ['Warlord Flame Blade', deriveWarlord({ abilities: { flameBlade: true } }), true],
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
    atk: 0, rtb: 2, rtbType: 'magic',
  });
  assertEqual(magicRanged.encMagic, false,
    'Innate magical ranged type does not invent the unit-level EncMagic flag');
  assertEqual(ctx.computeCasterDefenseForAttack(wiTarget, magicRanged, com2, 0, 'ranged'), 0,
    'ApplyAttack magicranged independently bypasses Weapon Immunity');

  const attackLocalMagicCases = [
    ['Magical ranged', derive({ rtb: 2, rtbType: 'magic' }), 'ranged'],
    ['Magical lightning ranged', derive({ rtb: 2, rtbType: 'magic_lightning' }), 'ranged'],
    ['Warlord beam-energy ranged', deriveWarlord({ rtb: 2, rtbType: 'magic' }), 'ranged'],
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
      abilities: { armorPiercing: true },
    }));
    assertEqual(ctx.computeCasterDefenseForAttack(lightningResistTarget, attacker, version, 0, 'ranged'), 8,
      `${record.name} id-30 ranged sets islightning, so Lightning Resist clears Armor Piercing`);
    assertEqual(ctx.computeCasterDefenseForAttack(plainTarget, attacker, version, 0, 'ranged'), 4,
      `${record.name} id-30 ranged still halves a defender without Lightning Resist`);
    const magicAttacker = ctx.deriveUnitStats(baseUnitInput({
      version, figs: record.figures, atk: record.melee, def: record.defense,
      res: record.resist, hp: record.hp, rtb: record.ranged, rtbType: 'magic',
      abilities: { armorPiercing: true },
    }));
    assertEqual(ctx.computeCasterDefenseForAttack(lightningResistTarget, magicAttacker, version, 0, 'ranged'), 4,
      `${record.name} retyped to a plain magical projectile leaves islightning false, so Armor Piercing still halves`);
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

module.exports = { runResolutionStepChecks, runModernWeaponImmunityMappingChecks };
