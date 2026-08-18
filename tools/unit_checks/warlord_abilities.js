// Warlord roster and ability checks: the script-granted packages and the unit-specific
// building grants that only the 1.5.12.7 scripts make.

'use strict';

const vm = require('vm');
const { evalInContext, assert, assertEqual, assertClose, baseUnitInput } = require('./assertions');

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

module.exports = { runWarlordUnitAbilityChecks };
