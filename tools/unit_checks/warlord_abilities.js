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
  // `UNITS.INI [362]` states `RangedType=30` with `Ranged=0`, and `RangedType.INI [30]` is
  // `IsMagic=Yes` and nothing else -- the modern engine attaches no realm to a projectile, so
  // id 30 is the lightning-bolt token. The Wanderer's permanent ranged type therefore has a
  // roster home rather than being projected by the Marionette package (F107), and the fixture
  // below states the record the roster ships instead of an empty one.
  assertEqual(wanderer.ranged, undefined, 'Wanderer roster record states no ranged strength');
  assertEqual(wanderer.ranged_type, 'Magic-lightning',
    'Wanderer roster record carries UNITS.INI RangedType=30 at zero strength');
  const wandererRangedType = evalInContext(ctx,
    `RANGED_TYPE_NORMALIZE[${JSON.stringify(wanderer.ranged_type)}]`);
  assertEqual(wandererRangedType, 'magic_lightning', 'RangedType 30 is the lightning-bolt magical projectile');
  const wandererIdentity = ctx.createRosterUnitIdentity(version, wanderer);
  const marionetteUnit = (abilityOverrides = {}, inputOverrides = {}) => warlordUnit({
    name: wanderer.name,
    identity: wandererIdentity,
    unitType: 'hero',
    atk: wanderer.melee,
    rtb: 0,
    rtbType: wandererRangedType,
    modernAttacks: { ranged: { strength: 0, type: wandererRangedType } },
    def: wanderer.defense,
    res: wanderer.resist,
    hp: wanderer.hp,
    hitChance: wanderer.to_hit,
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
  assertEqual(ownedMarionette.modernAttacks.ranged.type, 'magic',
    'Nature-primary Marionette retypes the projectile to id 37, the plain magical token');
  const focusedMarionette = ctx.deriveUnitStats(marionetteUnit({ focusMagic: true }));
  assertEqual(focusedMarionette.modernAttacks.ranged.strength, 3,
    'Focus Magic overwrites phase-b Marionette ranged when persistent base ranged is empty');
  assertEqual(focusedMarionette.modernAttacks.ranged.type, 'magic',
    'Focus Magic empty-base overwrite replaces the Marionette retype with shot type 34');
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
  assertEqual(strayedMarionette.modernAttacks.ranged.type, 'magic_lightning',
    'Strayed Transmute Equipment retains Wanderer\'s roster ranged type 30');
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

  // The same block's channel write is `SThrown := SThrown + SRanged`, so a unit carrying both
  // fields finishes with one Thrown attack at the summed strength. The preset fixture format
  // maps a scenario onto a single modern channel, so the two-channel case is asserted here.
  const blazeChannels = (attacks, abilities) => ctx.deriveUnitStats(warlordUnit({
    atk: 1, def: 0, modernAttacks: attacks, abilities,
  })).modernAttacks;

  const blazeRangedOnly = blazeChannels(
    { ranged: { strength: 6, type: 'missile' } }, { blazeOfGlory: true });
  assert(!blazeRangedOnly.ranged, 'Blaze of Glory empties the conventional Ranged field');
  assertEqual(blazeRangedOnly.thrown.strength, 6,
    'A lone Ranged channel arrives whole on the Thrown field');

  const blazeBothChannels = blazeChannels(
    { ranged: { strength: 6, type: 'missile' }, thrown: { strength: 2, type: 'thrown' } },
    { blazeOfGlory: true });
  assert(!blazeBothChannels.ranged, 'Blaze of Glory empties Ranged beside an existing Thrown');
  assertEqual(blazeBothChannels.thrown.strength, 8,
    'Blaze of Glory adds the Ranged strength to an existing Thrown attack');
  assertEqual(blazeBothChannels.thrown.modifierTrace.result, 8,
    'The merged Thrown strength stays reachable through its own modifier trace');

  // The transfer stands at `UnitCalc.CAS:1490`, so every earlier region-d write sees the
  // conventional Ranged identity it is written against. Rust (`:493-503`) takes its −3 off the
  // missile field and empties Thrown before the transfer moves what is left.
  const blazeAfterRust = ctx.deriveUnitStats(warlordUnit({
    atk: 3, def: 0,
    modernAttacks: { ranged: { strength: 6, type: 'missile' }, thrown: { strength: 2, type: 'thrown' } },
    abilities: { blazeOfGlory: true, rust: true },
  })).modernAttacks;
  assertEqual(blazeAfterRust.thrown.strength, 3,
    'Rust reaches the missile field before Blaze of Glory moves it to Thrown');
  assert(!blazeAfterRust.ranged, 'Rust and Blaze of Glory together leave no Ranged channel');

  // Mind Storm's `Dec(U.ranged, 5)` and `Dec(U.thrown, 5)` carry no positivity and no type gate
  // (Units.RecalculateUnits.pas:2281-2295), so both record fields hold the penalty before the
  // transfer at `UnitCalc.CAS:1499` adds one into the other. Missile 6 arrives as 1 on a Thrown
  // field already standing at −5, so the recompute's floor leaves no attack at all; missile 12
  // arrives as 7 and finishes at 2.
  const mindStormBlaze = attacks => ctx.deriveUnitStats(warlordUnit({
    atk: 3, def: 0, modernAttacks: attacks,
    abilities: { blazeOfGlory: true, mindStorm: true },
  })).modernAttacks;
  assert(!mindStormBlaze({ ranged: { strength: 6, type: 'missile' } }).thrown,
    'Mind Storm reaches the empty Thrown field, so a missile 6 does not survive the transfer');
  assertEqual(mindStormBlaze({ ranged: { strength: 12, type: 'missile' } }).thrown.strength, 2,
    'Both Mind Storm writes land before Blaze of Glory sums the two fields');

  // The same block leaves both Breath fields untouched, and Lightning Blade has already moved
  // the Thrown strength into `SLightningBreath` and cleared `SThrown` (CreateUnit.CAS:294-299),
  // so the breath keeps its whole thrown+1.
  const mindStormLightningBlade = ctx.deriveUnitStats(warlordUnit({
    atk: 3, def: 0, modernAttacks: { thrown: { strength: 4, type: 'thrown' } },
    abilities: { lightningBlade: true, mindStorm: true },
  })).modernAttacks;
  assertEqual(mindStormLightningBlade.lightningBreath.strength, 5,
    'Mind Storm leaves the Lightning Blade breath alone once it is no longer the Thrown field');

  // The attack the transfer leaves behind is `SThrown` whichever field ends up holding it, and
  // combat reads `hitchancethrown + hitchance` for it (Combat.ApplyAttack.pas:239). Holy Weapon's
  // unconditional `Inc(U.hitchancethrown, 10)` (Units.RecalculateUnits.pas:1803-1809) therefore
  // reaches it, while True Sight's `SToRanged` +5 (UnitCalc.CAS:326-328) and Holy Weapon's own
  // ranged arm — skipped here by `Ismagicalranged` — do not. Lightning Blade has spent the
  // record's Thrown field, so this is the shape where the strength stays in the Ranged slot.
  const blazeThrownThreshold = abilities => ctx.deriveUnitStats(warlordUnit({
    atk: 1, def: 0,
    modernAttacks: { ranged: { strength: 6, type: 'magic' }, thrown: { strength: 4, type: 'thrown' } },
    abilities,
  })).modernAttacks;
  const blazeAfterLightningBlade = blazeThrownThreshold({
    lightningBlade: true, blazeOfGlory: true, trueSight: true, holyWeapon: true });
  assertEqual(blazeAfterLightningBlade.thrown.toHit, 0.4,
    'A Blaze of Glory attack the Thrown field could not take still reads the Thrown threshold');
  assertEqual(blazeThrownThreshold({
    blazeOfGlory: true, trueSight: true, holyWeapon: true }).thrown.toHit, 0.4,
  'The same threshold applies where the Thrown field was free to take the transfer');
  assertEqual(blazeThrownThreshold({
    lightningBlade: true, trueSight: true, holyWeapon: true }).ranged.toHit, 0.35,
  'Without the transfer the magical Ranged attack keeps its own True Sight threshold');

  // Shadow Strike's `SThrown := SThrown + 1 + SAttack/3` (UnitCalc.CAS:1262-1266) stands at its
  // own region-`d` position, before the transfer at `:1490`: melee 3 grants 1 + 3/3 = 2 onto the
  // Thrown field's 2, and Blaze of Glory then moves the missile 6 onto the 4 standing there.
  const shadowAndBlaze = ctx.deriveUnitStats(warlordUnit({
    atk: 3, def: 0,
    modernAttacks: { ranged: { strength: 6, type: 'missile' }, thrown: { strength: 2, type: 'thrown' } },
    abilities: { shadowStrike: true, blazeOfGlory: true },
  })).modernAttacks;
  assertEqual(shadowAndBlaze.thrown.strength, 10,
    'Shadow Strike adds to the Thrown field before Blaze of Glory transfers the Ranged one');
  assert(!shadowAndBlaze.ranged, 'Blaze of Glory still empties Ranged beside the Shadow Strike grant');

  const shadowBesideRanged = ctx.deriveUnitStats(warlordUnit({
    atk: 3, def: 0,
    modernAttacks: { ranged: { strength: 6, type: 'missile' } },
    abilities: { shadowStrike: true },
  })).modernAttacks;
  assertEqual(shadowBesideRanged.ranged.strength, 6,
    'The Shadow Strike grant leaves a conventional Ranged attack alone');
  assertEqual(shadowBesideRanged.thrown.strength, 2,
    'The grant creates the record Thrown field beside an existing Ranged attack');

  // The created field is empty when the level ladder (`BaseUnits.thrown > 0`,
  // Units.RecalculateUnits.pas:562-564) and the magic-weapon branch (`Units.thrown > 0`, :660-663)
  // read it, so neither reaches the attack Shadow Strike makes afterwards: the grant is
  // 1 + 9/3 off the champion-and-adamantium melee alone, and the Thrown threshold carries the
  // champion To Hit ladder without the weapon's +10.
  const shadowChampionAdamant = ctx.deriveUnitStats(warlordUnit({
    atk: 3, def: 0, level: 'champion', weapon: 'adamantium',
    modernAttacks: {}, abilities: { shadowStrike: true },
  })).modernAttacks;
  assertEqual(shadowChampionAdamant.thrown.strength, 4,
    'Neither the level ladder nor the weapon strength reaches the Shadow Strike grant');
  assertEqual(shadowChampionAdamant.thrown.toHit, 0.4,
    'The created Thrown reads the record threshold without the magic-weapon To Hit');

  const noBlazeBothChannels = blazeChannels(
    { ranged: { strength: 6, type: 'missile' }, thrown: { strength: 2, type: 'thrown' } }, {});
  assertEqual(noBlazeBothChannels.ranged.strength, 6,
    'Without Blaze of Glory the two channels stay independent');
  assertEqual(noBlazeBothChannels.thrown.strength, 2,
    'Without Blaze of Glory the Thrown field keeps its own strength');

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

  // Energy Cannon reads and writes the record's Ranged field, which in `Caster.exe` is
  // `SRanged` — the modern record's `ranged` channel — so the fixture states that channel and
  // the assertions read it (F127).
  const energyCannon = ctx.deriveUnitStats(warlordUnit({
    modernAttacks: { ranged: { strength: 5, type: 'missile' } },
    abilities: { mechanical: true, heatPowerEngine: true, energyBeamWeapons: true },
  }));
  assertEqual(energyCannon.modernAttacks.ranged.type, 'magic', 'Energy Cannon converts the projectile to id 40, beam energy');
  assertEqual(energyCannon.modernAttacks.ranged.strength, 7, 'Energy Cannon adds floor(50% base ranged strength)');
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
    modernAttacks: { ranged: { strength: 5, type: 'missile' } },
    abilities: {
      destruction: 0, mechanical: true, heatPowerEngine: true, energyBeamWeapons: true,
    },
  })), version);
  assertEqual(normalizedEnergyCannonWithGeneral.touchFlagRecords.global.destruction, 0,
    'Energy Cannon preserves an independent general Destruction channel');
  assertEqual(normalizedEnergyCannonWithGeneral.touchFlagRecords.ranged.destruction, -2,
    'Energy Cannon keeps its derived ranged Destruction beside independent general Destruction');

  const aimedEnergyCannon = ctx.deriveUnitStats(warlordUnit({
    modernAttacks: { ranged: { strength: 5, type: 'missile' } },
    hitChance: 10,
    hitRanged: 10, hitThrown: 10, hitBreath: 10,
    abilities: { mechanical: true, heatPowerEngine: true, energyBeamWeapons: true },
  }));
  assertEqual(aimedEnergyCannon.abilities.energyCannonDestruction, -3,
    'Energy Cannon snapshots the live 50% common-plus-ranged threshold without double-counting base modifiers');
  const energyThresholdStep = aimedEnergyCannon.statTrace.find(t => t.id === 'energyCannonThreshold');
  assertEqual(energyThresholdStep.changes.energyCannonToHit.to, 50,
    'Energy Cannon records its source-ordered pre-region-e chance snapshot');

  const upgradedEnergyCannon = ctx.deriveUnitStats(warlordUnit({
    modernAttacks: { ranged: { strength: 5, type: 'missile' } },
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
    upgradedEnergyCannon.modernAttacks.ranged.strength,
    12,
    'Energy Cannon scales earlier permanent Artificer and Blackpowder writes: (5+1+2)+floor(8/2)',
  );

  const noRangedEnergyCannon = ctx.deriveUnitStats(warlordUnit({
    modernAttacks: { ranged: null, thrown: null, fireBreath: null, lightningBreath: null },
    abilities: { mechanical: true, heatPowerEngine: true, energyBeamWeapons: true },
  }));
  assertEqual(!!noRangedEnergyCannon.abilities.energyCannon, false,
    'Energy Cannon inference requires positive permanent conventional Ranged');
  assertEqual(noRangedEnergyCannon.modernAttacks.ranged, undefined,
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

  // The modern record separates Ranged, Thrown and Breath To Hit modifiers, and Hurricane is
  // the effect that tells them apart: UnitCalc.CAS:569-571 subtracts 10 x HURRICANESTR from
  // SToRanged and SToThrown but 15 x HURRICANESTR from SToBreath, and HURRICANESTR is 2 for a
  // normally cast Hurricane. Read all three off one unit, so a penalty landing on the wrong
  // field cannot pass by being right for the channel that happens to be derived.
  const hurricaneChannels = ctx.deriveUnitStats(warlordUnit({
    atk: 2, hitRanged: 70, hitThrown: 70, hitBreath: 70, hurricane: true,
    modernAttacks: {
      ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 4, type: 'fire' },
    },
  }));
  assertClose(hurricaneChannels.modernAttacks.ranged.toHit, 0.8,
    'Hurricane takes 20 points off the Ranged To-Hit modifier');
  assertClose(hurricaneChannels.modernAttacks.thrown.toHit, 0.8,
    'Hurricane takes 20 points off the Thrown To-Hit modifier');
  assertClose(hurricaneChannels.modernAttacks.fireBreath.toHit, 0.7,
    'Hurricane takes 30 points off the shared Breath To-Hit modifier');
  assertClose(hurricaneChannels.toHitMelee, 0.3,
    'Hurricane leaves the melee To-Hit modifier alone');

  const hurricaneLightningBreath = ctx.deriveUnitStats(warlordUnit({
    atk: 2, hitRanged: 70, hitThrown: 70, hitBreath: 70, hurricane: true,
    modernAttacks: {
      ranged: { strength: 4, type: 'missile' },
      lightningBreath: { strength: 4, type: 'lightning' },
    },
  }));
  assertClose(hurricaneLightningBreath.modernAttacks.lightningBreath.toHit, 0.7,
    'Fire and Lightning Breath share one Breath To-Hit modifier');

  // Heavenly Light writes `hitchancethrown` unconditionally (Units.RecalculateUnits.pas:1451-1454),
  // but Lightning Blade leaves the unit carrying a Lightning Breath, and the resolver reads
  // `hitchancebreath` for a breath attack (Combat.ApplyAttack.pas:272). The +10 lands on a field
  // nothing reads, so the surviving channel keeps the base 30%.
  const lightningBladeHeavenlyLight = ctx.deriveUnitStats(warlordUnit({
    atk: 1, rtbType: 'thrown', rtb: 4,
    modernAttacks: { thrown: { strength: 4, type: 'thrown' } },
    abilities: { lightningBlade: true, heavenlyLight: true },
  }));
  assertClose(lightningBladeHeavenlyLight.modernAttacks.lightningBreath.toHit, 0.3,
    'Heavenly Light writes the Thrown To-Hit field, which a Lightning Breath channel does not read');

  // True Sight writes `SToRanged` with no presence gate (UnitCalc.CAS:326-328), so the record
  // holds the modifier even on a unit with no secondary attack to spend it on.
  const trueSightNoSecondary = ctx.deriveUnitStats(warlordUnit({
    atk: 1, rtbType: 'none', rtb: 0, modernAttacks: {},
    abilities: { trueSight: true },
  }));
  assertClose(trueSightNoSecondary.toHitRtb, 0.35,
    'True Sight writes the Ranged To-Hit modifier without a ranged-presence gate');

  const scoringOptionsInertOutsideWarlord = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    res: 5,
    abilities: { uphillBattle: true, godsPlayDices: 2 },
  }));
  assertClose(scoringOptionsInertOutsideWarlord.toHitMelee, 0.3, 'Warlord scoring To-Hit is inert outside Warlord');
  assertClose(scoringOptionsInertOutsideWarlord.toBlock, 0.3, 'Warlord scoring To-Defend is inert outside Warlord');
  assertEqual(scoringOptionsInertOutsideWarlord.res, 5, 'Warlord scoring Resistance is inert outside Warlord');

  // RangedType.INI classifies by flag, not by id range: 12/13/14 carry neither `IsMagic` nor
  // `IsMissile` under `StatIcon=2`, which is the boulder class ids 10 and 11 already hold, and
  // 22 carries `IsMissile=Yes`. `Ismissileranged` reads that flag directly
  // (Combat.AttackAndWallHelpers.pas:181), so a boulder must not reach Missile Immunity,
  // Blazing March's magic-weapon grant or Elven Wind. Expectations come from the table.
  const rangedClassByName = vm.runInContext(
    "JSON.stringify(Object.fromEntries(['Stone Giant','Colossus','Lesser Gaia Lord',"
    + "'Great Gaia Lord','Goblin Midget Submarine','Arquebusiers','Musketeers'].map("
    + "n => [n, (Object.values(WARLORD_UNITS_DATA).find(u => u.name === n) || {}).ranged_type])))",
    ctx,
  );
  const rangedClass = JSON.parse(rangedClassByName);
  for (const name of ['Stone Giant', 'Colossus', 'Lesser Gaia Lord', 'Great Gaia Lord',
    'Goblin Midget Submarine']) {
    assertEqual(rangedClass[name], 'Boulder',
      `${name} carries a RangedType.INI id with no IsMissile flag, so it is boulder-class`);
  }
  for (const name of ['Arquebusiers', 'Musketeers']) {
    assertEqual(rangedClass[name], 'Missile',
      `${name} carries RangedType 22, which the table marks IsMissile=Yes`);
  }
}

module.exports = { runWarlordUnitAbilityChecks };
