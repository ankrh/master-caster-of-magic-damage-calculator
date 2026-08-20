// --- Unit Stat Derivation ---
// Depends on data.js and the combat_*.js helper functions. No DOM dependencies.
// The per-version execution chain is in stats_manifests.js, the identity helpers in
// stats_identity.js, and the phase-tagged stat sequence in stats_sequence.js.

// Derive all effective stats for a unit from raw UI state.
// Pure stat logic: no DOM reads or rendering side effects.
function deriveUnitStats(input) {
  const prefix = input.prefix;
  const version = input.version;
  const identity = initializeUnitIdentity(input);
  const baseUnitType = legacyUnitTypeFromIdentity(identity);
  const isHero = !!identity.isHero;
  const isFantasticBase = !!identity.baseFantastic;
  const isCoM1 = version === 'com_6.08';
  // CoM 1 (the DOS build). Kept distinct from `isCoM2` wherever a mechanic is settled for
  // one engine and open for the other — see the Warp Creature block and the gaze ladder.
  const isCoM2 = version.startsWith('com2');
  const suppliedAbilities = { ...(input.abilities || {}) };
  // ApplyAttack's modern Cause Fear setup reads Death Immunity from BaseUnits rather than
  // the recalculated Units record. Preserve the raw/intrinsic bit before buildings, items,
  // enchantments, and unit-state normalization can grant calculated Death Immunity.
  const baseDeathImmunity = !!suppliedAbilities.deathImmunity;
  // Golem's constructor write is intrinsic and must survive direct calculator/Matrix calls,
  // even when the DOM-derived Elements control is not present in the caller's ability map.
  if ((isCoM2 || isCoM1) && identity.specialUnit === 'golem') {
    suppliedAbilities.elemArmor = 'resistElements';
  }
  // Abilities are read before stat derivation because Chaos Channels eligibility can depend on gaze attacks.
  // Lava Smelter folds its granted ability in here so every downstream read sees it.
  // Race-exclusive building enchantments gate on the unit's intrinsic race/name, supplied
  // by the caller from the selected roster unit. Custom (hand-entered) units carry neither,
  // so building buffs are inert on them. The display name may be race-prefixed for some
  // units and not others, so name exceptions match with endsWith (always gated by race).
  const unitRace = identity.race;
  const baseUnitRace = identity.baseRace;
  const unitName = input.name || '';
  const marionetteDerivation = deriveMarionettePackage(
    identity, markIntrinsicLucky(suppliedAbilities), version);
  const marionette = marionetteDerivation.package;
  const abilities = applyMagicImmunityCurseGating(
    applyOutlanderReformGrants(
    applyFortificationGrant(
    applyInsulationGrant(
    applyPillarOfFaithGrant(
    applyDivineProtectionGrant(
      applySanctaBasilicaGrant(
        applyLavaSmelterGrant(marionetteDerivation.abilities, version, baseUnitType),
        version, isHero ? 'hero' : baseUnitType, unitRace, unitName),
      version),
    version),
    version),
    version),
    version, baseUnitType, isHero, marionette && marionette.state === 'owned'));
  const destinyActive = destinyActiveForUnit(abilities, version);
  const identityConversion = applyOrderedIdentityConversions(identity, abilities, version, {
    isHero,
    name: unitName,
  });
  Object.assign(identity, identityConversion.identity);
  const unitTypeRaw = legacyUnitTypeFromLiveIdentity(identity);
  const unitTypeVal = unitTypeRaw;
  const isFantasticLive = !!identity.fantastic;
  const marionetteOwned = !!(marionette && marionette.state === 'owned');
  const marionetteStrayed = !!(marionette && marionette.state === 'strayed');
  const marionetteAttackBonus = marionetteOwned ? marionette.attackBonus : 0;
  const marionetteDefenseBonus = marionetteOwned ? marionette.defenseBonus : 0;
  // Caster.exe's standing Fantastic -> EncMagic write runs in compiled region c. Warlord
  // Spirit Link first asserts Fantastic in UnitCalcPre (phase b), so the standing rule sees
  // it even for a calculator-reachable custom input that was not fantastic beforehand. The
  // late UnitCalc hook (phase d) then clears Fantastic without clearing the derived flag.
  const fantasticAtModernEncMagicRule = isFantasticLive
    || (version.startsWith('com2_warlord') && !!abilities.spiritLink);
  const loadoutEligible = !isFantasticBase && !destinyActive;
  // Spirit Link (Warlord): grants a fantastic creature sentience so it can earn
  // experience levels. It does NOT grant weapon/armor loadout, so only level
  // eligibility is widened — weapon and armor below stay gated on loadoutEligible.
  const levelEligible = loadoutEligible
    || (version.startsWith('com2_warlord') && !!abilities.spiritLink && !destinyActive);
  const level = levelEligible ? input.level : 'normal';
  const lvl = getLevelBonuses(level, version);
  // Warlord: Rebuild makes the unit Mechanical; Artificer retort then grants
  // Magic Weapons (+10% To Hit, bypass Weapon Immunity) to that unit.
  const isWarlord = version.startsWith('com2_warlord');
  const warlordCombatFlameBlade = isWarlord && !!abilities.flameBladeWarlord;
  const effectiveMechanical = !!abilities.mechanical
    || (isWarlord && !!abilities.rebuild);
  const artificerMagicWeapon = isWarlord
    && !!abilities.artificer && effectiveMechanical;
  // Altar of the Moon (Warlord, Gnoll building): Gnoll units trained here gain Rage and
  // Poison Immunity; ranged units also gain +2 Ranged Attack. The granted abilities are
  // folded into effectiveAbilities below; the ranged bonus is added to the rtb total.
  // Gated on the Gnoll race — non-Gnoll units and heroes gain nothing.
  const altarOfTheMoon = isWarlord && !!abilities.altarOfTheMoon
    && baseUnitRace === 'Gnoll' && !isHero;
  // Unit-specific Altar of the Moon grants: Gnoll Hunters gain Poison 2; Gnoll
  // Witchdoctors gain Life Steal -1 which replaces their Poison. Applied via effectiveAbilities below.
  const altarHunter = altarOfTheMoon && unitRace === 'Gnoll' && unitName.endsWith('Hunters');
  const altarWitchdoctor = altarOfTheMoon && unitRace === 'Gnoll' && unitName.endsWith('Witchdoctors');
  // Altar of the Sun (Warlord, Hawkmen building): Hawkmen units trained here gain +1
  // Figure, except Holy Mother who gains +1 Melee instead. Gated on the Hawkmen race —
  // heroes are excluded and gain nothing. Only these unit bonuses are modelled; the
  // defending-city High Prayer buff is not.
  const altarOfTheSunEligible = isWarlord
    && !!abilities.altarOfTheSun && baseUnitRace === 'Hawkmen' && !isHero;
  const altarOfTheSunHolyMother = altarOfTheSunEligible && unitName.endsWith('Holy Mother');
  const altarOfTheSun = altarOfTheSunEligible && !unitName.endsWith('Holy Mother');
  // Dragon Mound (Warlord, Draconian building): Draconian units trained here gain +1 Armor
  // (folded into def below) and, for units that already have a Fire Breath attack, +2 Fire
  // Breath. Like the Military Workshop breath bonus, it boosts an existing fire breath rather
  // than granting one to melee-only units. Gated on the Draconian race — non-Draconian
  // units and heroes gain nothing, matching the in-game race-exclusive building.
  const dragonMound = isWarlord
    && !!abilities.dragonMound && baseUnitRace === 'Draconian' && !isHero;
  // Ludus Agoge (Warlord, Orc building): Orc units trained here gain +1 Attack (melee, folded
  // into atk below), +1 Resistance, and +1 HP. Legionary units gain +1 Movement instead — not
  // modelled here — so they receive no stat bonus. Gated on the Orc race — non-Orc units,
  // Legionaries, and heroes gain nothing, matching the in-game race-exclusive building.
  const ludusAgoge = isWarlord
    && !!abilities.ludusAgoge && baseUnitRace === 'Orc' && !unitName.endsWith('Legionary') && !isHero;
  // Mother Fungus (Warlord, Goblin building): Goblin units trained here gain +2 Attack (melee,
  // folded into atk below), +10% To Defend (folded into toBlock below), and Poison 1 (boosts an
  // existing poison attack, or grants Poison 1 if it has none). The ×2 Spellcharge bonus is not
  // modelled. Gated on the Goblin race — non-Goblin units and heroes gain nothing, matching the
  // in-game race-exclusive building.
  const motherFungus = isWarlord
    && !!abilities.motherFungus && baseUnitRace === 'Goblin' && !isHero;
  // Pool of Repentance (Warlord, Rakhshasa building): Rakhshasa units trained here gain +1 Armor
  // (folded into defBase below) and +1 Resistance (folded into res below). Gated on the Rakhshasa
  // race — non-Rakhshasa units and heroes gain nothing, matching the in-game race-exclusive building.
  const poolOfRepentance = isWarlord
    && !!abilities.poolOfRepentance && baseUnitRace === 'Rakhshasa' && !isHero;
  // Sancta Basilica (Warlord, High Men building): +3 Resistance for every High Men unit trained
  // here (folded into res below). The unit-specific Sanctify / Lucky / Magic Immunity grants are
  // applied earlier via applySanctaBasilicaGrant. Gated on the High Men race; heroes gain nothing.
  const sanctaBasilica = isWarlord
    && !!abilities.sanctaBasilica && baseUnitRace === 'High Men' && !isHero;
  // Rust (Warlord Chaos common combat curse): permanently strips magic/orihalcon weapons
  // (the unit reverts to regular weapons), −3 melee attack (applied in combat_abilities.js), and
  // eliminates thrown attacks and Large Shield for the rest of combat (below).
  // Rust targets an enemy regular (non-fantastic) unit; fantastic creatures are immune.
  const rustActive = version.startsWith('com2_warlord') && !!(abilities && abilities.rust)
    && !isFantasticLive;
  // Zombies are the one fantastic unit affected by weapon quality: a unit raised as
  // Zombies keeps its magic/mithril/adamantium weapons (a known game quirk), so weapon
  // eligibility gets a Zombies exception while armor and level stay fantastic-gated.
  const weaponEligible = loadoutEligible || identity.specialUnit === 'zombies' || unitName === 'Zombies';
  // CoM1's Catapult constructor writes weapon quality 9 only for the combat-summoned
  // Construct Catapult path. That is a direct Magic Weapons write: it gives the Boulder
  // channel +10% To Hit and lets it bypass Weapon Immunity, while an ordinary Catapult
  // remains a normal, non-fantastic siege unit.
  const constructCatapult = isCoM1 && identityConversion.isConstructCatapult;
  const weaponInput = constructCatapult ? 'normal' : (weaponEligible ? input.weapon : 'normal');
  const weaponPreRust = constructCatapult ? 'magic'
    : (artificerMagicWeapon && weaponInput === 'normal') ? 'magic' : weaponInput;
  const weapon = rustActive ? 'normal' : weaponPreRust;
  const wpn = weaponBonus(weapon);
  // Armor quality: CoM/CoM2/Warlord only (doesn't exist in MoM), and unlike
  // weapons, heroes get none either.
  const armorExists = !version.startsWith('mom_');
  const armor = (armorExists && loadoutEligible && !isHero) ? input.armor : 'normal';

  // Military Workshop (Warlord, XuanYuan building): upgrades any normal unit trained,
  // garrisoned in, or fighting from the city — not race-gated, per the "any defending units
  // of the city" + "base normal units" changelog wording. Heroes and fantastic creatures are
  // excluded. Rocketry is an alternative source of the same Blackpowder upgrade.
  // Combat-relevant effects, checked against the 1.5.12.7 scripts:
  //   - Small Physical Ranged (missile) projectiles upgrade to Heavy Physical Ranged (boulder,
  //     gunpowder), bypassing Missile Immunity — applied here so all downstream logic treats
  //     the attack as a boulder (original 1.5.4.1 effect, still in the helptext).
  //   - Physical ranged or thrown attack gains Armor Piercing, unless the unit has a Doom
  //     attack — Armor Piercing is wasted on Doom (it already ignores armor), so it gets +2
  //     ranged/thrown strength instead (patch 1.5.9.5). Folded in below.
  //   - Fire Breath attack: +4 strength (patch 1.5.7.4, up from the original +2).
  //   - +1 Poison: boosts an existing poison attack, or grants Poison 1 if it has none.
  // Military Workshop and Rocketry are alternative causes of the same permanent
  // Blackpowder upgrade. The source scripts grant it only to normal units that
  // actually have physical ranged, Thrown, or Fire Breath.
  const blackpowderSource = isWarlord
    && (!!abilities.militaryWorkshop || !!abilities.rocketry);
  // CreateUnit.CAS makes this permanent training decision before any later combat-time
  // identity conversion. A base-normal unit remains eligible after Chaos Channels/Sanctify,
  // while a base-Fantastic unit does not become eligible merely because Spirit Link clears its
  // live Fantastic flag.
  const baseNormalTrainingUnit = !isHero && !isFantasticBase;

  // Bombs&Grenades can coexist with another ranged/breath attack in the game.
  // The calculator's single RTB slot represents it directly when that slot is
  // empty, and adds it normally when the selected attack is already Thrown.
  const explosiveEligible = isWarlord && !!abilities.explosive
    && (!isFantasticLive || !!abilities.sapiens);
  const bombsGrenades = explosiveEligible
    && ((parseInt(input.atk) || 0) > 0 || !!abilities.flying);

  const baseDoomGazeWithBlazingEyes = blazingEyesDoomGazeForUnit(abilities, unitTypeVal, version);

  // Chaos Channels (Fire Breath option): version-sensitive strength and admission.
  // Apply_Chaos_Channels reads the DOS unit type's signed base ranged value and shared attack
  // type before choosing the mutation. MoM 1.31 admits values <= 3; CP 1.60 and CoM 1 admit
  // only values <= 0. Every DOS build additionally requires type None or Thrown, so Gaze and
  // either Breath type cannot coexist with a Chaos Channels Fire Breath in the shared slot.
  // Once admitted, BU_Apply_Specials assigns strength 2 in both MoM builds and 4 in CoM 1.
  // CoM2/Warlord instead have independent channels and add 4 to Fire Breath.
  const ccFireBreathAbil = !!abilities.ccFireBreath;
  // Chaos Channels *adds* a Fire Breath; it never removes another attack. `Caster.exe`
  // $00599EE8-$00599FA8 writes only `firebreath += 4`, `race := RCChaos` and `Fantastic`,
  // and Warlord's `UnitCalc.CAS:40` touches only `SFireBreath` — neither clears a gaze,
  // thrown or lightning breath. The CoM2 manual says the same in words: it "can still add
  // Fire Breath to units that have Thrown, Gaze or Lightning Breath". So the modern engines,
  // whose attack channels are independent fields, impose no coexistence restriction at all.
  // The DOS engines keep theirs because one shared `.ranged` slot cannot hold two attacks.
  const ccIndependentChannels = isCoM2;
  const ccDosBaseRangedMax = version === 'mom_1.31' ? 3 : 0;
  // `Caster.exe` $00599F3E is `add 4 to U.firebreath`, not an assignment, and it is the same
  // routine for CoM2 and Warlord — there is no version split to model. The DOS engines still
  // assign, because the value lands in the one shared `.ranged` slot rather than a field of
  // its own, which is the same reason they exclude ranged units from the mutation.
  const ccFireBreathStrength = version.startsWith('com') ? 4 : 2;

  // Lightning Blade (Warlord): the Altar of Storm writes Lightning Breath = Thrown + 1, then
  // clears Thrown. Without Thrown it assigns strength 1 even beside another independent attack;
  // with Thrown it preserves that channel's earlier permanent bonuses and adds one. The resulting
  // Lightning Breath is innate and gains veterancy level bonuses.
  const lightningBladeAbil = version.startsWith('com2_warlord') && !!abilities.lightningBlade
    && baseNormalTrainingUnit;

  // Base values from inputs
  const baseFigs = Math.max(1, parseInt(input.figs) || 1);
  const inputBaseAtk = Math.max(0, parseInt(input.atk) || 0);
  const inputBaseRtb = Math.max(0, parseInt(input.rtb) || 0);
  const inputBaseDef = Math.max(0, parseInt(input.def) || 0);
  const inputBaseRes = Math.max(0, parseInt(input.res) || 0);
  const inputBaseHP  = Math.max(1, parseInt(input.hp) || 1);
  // Some permanent/base-record writes execute before the main scratch-record sequence. Keep
  // them as individual trace events at those execution sites: `stat:base` then becomes only a
  // seed of the prepared record, never a catch-all attribution for the sources which prepared it.
  const basePreparationTrace = [];
  let basePreparationOrder = 0;
  const traceBasePreparation = (id, sourceLabel, before, after) => {
    const changes = {};
    for (const field of Object.keys(after)) {
      if (before[field] === after[field]) continue;
      const from = before[field];
      const to = after[field];
      changes[field] = (typeof from === 'number' && typeof to === 'number')
        ? { from, to, delta: to - from }
        : { from, to };
    }
    if (Object.keys(changes).length === 0) return;
    basePreparationTrace.push({
      id,
      source: { id, label: sourceLabel },
      phase: 'base',
      order: basePreparationOrder++,
      changes,
    });
  };

  const calcBaseAtk = inputBaseAtk;
  const calcBaseDef = inputBaseDef;
  const calcBaseRes = inputBaseRes;
  const calcBaseHP = inputBaseHP;
  const baseToHitMod = parseInt(input.toHitMod) || 0;
  const baseToHitRtbMod = parseInt(input.toHitRtbMod) || 0;
  const baseToBlkMod = parseInt(input.toBlkMod) || 0;

  // Focus Magic: CoM/CoM2-only. In CoM2, magical ranged, doom gaze, and breath get +3.
  // In CoM, doom gaze is not mentioned, so only magical ranged and breath are boosted.
  // Otherwise, a thrown or physical ranged (missile/boulder) attack is converted
  // into Sorcery magical ranged, with a minimum strength of 3. If nothing qualifies,
  // the unit gains strength-3 Sorcery magical ranged. (All versions convert boulder:
  // CoM1 lists "missile", Warlord lists "Physical Ranged" — boulder is physical ranged.)
  const focusMagicActive = !!(abilities && abilities.focusMagic) && version.startsWith('com');
  // Warlord Vampirism reads all three independent source fields at one region-d position and
  // truncates their combined total once. Under one walk that is a plain cross-channel read at
  // the step's own position; the four strength fields all stand at their region-d values there.
  const vampirismActive = !!(abilities && abilities.vampirism) && version.startsWith('com2_warlord');
  // Warlord Shadow Strike: adds a Thrown attack at 1 + 1/3 of live melee strength (truncated).
  // A unit that already has a Thrown attack instead gains the same amount. It executes after
  // Colossal Strength and Vampirism, so both earlier live melee writes feed it; the leading +1
  // creates Thrown even at zero melee. Because Thrown is a separate pre-melee
  // phase, per-hit riders (Poison, Life Steal, Blood Sucker) fire on both the thrown and the
  // melee phase — that double trigger falls out naturally from the granted thrown phase.
  const shadowStrikeActive = !!(abilities && abilities.shadowStrike) && version.startsWith('com2_warlord');
  // Warlord Blaze of Glory: the unit's whole Ranged strength is added to the Thrown field and
  // the Ranged field is emptied (Ammo goes with it; the model tracks neither Ammo nor the
  // `SRangedPenalty` bookkeeping write). Breath attacks are not "Ranged" and are untouched.
  // The Armor→Melee transfer, Armor Piercing grant, and First Strike loss are handled below.
  // Blaze of Glory targets a friendly non-hero unit (normal or fantastic); heroes are exempt.
  const blazeOfGloryActive = !!(abilities && abilities.blazeOfGlory)
    && version.startsWith('com2_warlord') && !isHero;

  // Per-card wall position. Combat resolution admits this bonus only when the incoming
  // attacker is outside; card A/B exchange role and persistent army ownership are irrelevant.
  const cwVal = String(input.cityWalls || 'none');
  const cityWallBonus = cwVal === '3' ? 3 : (cwVal === '1' ? 1 : 0);

  const survivalInstinctEligible = survivalInstinctActiveForUnit(abilities, unitTypeVal, version);
  const landLinkingEligible = landLinkingActiveForUnit(abilities, unitTypeVal, version);
  const innerPowerEligible = innerPowerActiveForUnit(abilities, version);
  const misleadEligible = misleadActiveForUnit(abilities, identity.fantastic, version);

  const nodeAuraVal = input.nodeAura;
  const unitRealm = realmOfUnitType(unitTypeVal, identity);
  const nodeAuraActive = unitRealm !== null && nodeAuraVal !== 'none' && unitRealm === nodeAuraVal;
  // `applynodeaura` gates melee on persistent BaseUnits.attack, not on the live subtotal.
  // Its other attack gates read the live conventional Ranged and two Breath fields; Thrown
  // is an independent modern field and is absent from the complete helper body.
  const modernNodeBaseMelee = isCoM2 && calcBaseAtk > 0;
  const darkForceActive = isCoM2 && !!abilities.darkForce;
  // The compiled city/node package requires membership in the defending army. The card prefix
  // instead records who initiates this particular exchange, so the per-unit control carries the
  // army/location eligibility and must work from either card.
  const heavenlyLightActive = isCoM2 && !!abilities.heavenlyLight;
  const badMoonActive = isCoM2 && !!abilities.badMoon && !isFantasticBase;
  const goodMoonActive = isCoM2 && !!abilities.goodMoon && !isFantasticBase;
  const natureConjunctionActive = isCoM2 && !!abilities.natureConjunction
    && isFantasticBase;
  // Spell Ward is region-c logic. In Warlord it therefore reads the current
  // Fantastic flag before region-d Spirit Link can clear that flag.
  const spellWardActive = isCoM2 && fantasticAtModernEncMagicRule
    && abilities.spellWard && abilities.spellWard !== 'none'
    && abilities.spellWard === unitRealm;
  const realmWardActive = isCoM1 && identity.fantastic
    && abilities.realmWard && abilities.realmWard !== 'none'
    && abilities.realmWard === unitRealm;
  const com1AuraValue = key => isCoM1
    ? Math.max(0, parseInt(abilities[key], 10) || 0) : 0;
  const com1GuidingBeaconAura = com1AuraValue('guidingBeaconAura');
  const com1DivineBarrierAura = com1AuraValue('divineBarrierAura');
  const com1SoulLinkerAura = com1AuraValue('soulLinkerAura');
  const chaosSurgeCount = unitRealm === 'chaos'
    ? Math.max(0, parseInt(input.chaosSurge) || 0)
    : 0;
  const chaosSurgeMeleeBonus = chaosSurgeCount > 0
    ? (version.startsWith('mom') ? 2 : 3 + (chaosSurgeCount - 1))
    : 0;
  const chaosSurgeRtbBonus = chaosSurgeCount > 0
    ? (version.startsWith('mom') ? 2 : 1 + chaosSurgeCount)
    : 0;
  const chaosSurgeResBonus = chaosSurgeCount > 0 && version.startsWith('com') ? 1 + chaosSurgeCount : 0;

  // Darkness / True Light: +/- to atk (non-spell), def, res for Death/Life fantastic units.
  // Darkness: +Death, -Life. True Light: +Life, -Death. Both can be active.
  // True Light was removed in CoM 1 & 2; Darkness still exists in all versions.
  // Eternal Night is side-owned but makes Darkness global. CoM2 only doubles that
  // Darkness atk/def swing; CoM keeps the normal Darkness values.
  // Eternal Night also gives enemy non-Death units -1 resistance in CoM/CoM2.
  const legacyLightDarkVal = input.enchLightDark || 'none';
  const isCoMVersion = version.startsWith('com');
  const ownEternalNight = !!(abilities && abilities.eternalNight) || !!input.eternalNight;
  const enemyEternalNight = !!input.enemyEternalNight;
  const hasAnyEternalNight = ownEternalNight || enemyEternalNight;
  // Enemy Eye of Heaven strips this unit's gaze attacks (the opponent gains True Sight).
  const enemyEyeOfHeaven = !!input.enemyEyeOfHeaven;
  const hasDarkness = !!input.darkness || legacyLightDarkVal === 'darkness' || hasAnyEternalNight;
  // True Light was removed in CoM 1 & 2, but Warlord re-introduces it as a Life
  // common combat enchantment — so enable it for MoM (non-CoM) and Warlord only.
  const hasTrueLight = (!!input.trueLight || legacyLightDarkVal === 'trueLight') && (!isCoMVersion || isWarlord);
  // Modern Eternal Night sets the Death-package loop count to two. The Life branch is
  // outside that loop and still executes exactly once; DOS Darkness is never doubled.
  const darknessAtkDefMagnitude = hasDarkness
    ? (hasAnyEternalNight && isCoM2 && unitRealm === 'death' ? 2 : 1)
    : 0;
  const darknessResMagnitude = hasDarkness ? 1 : 0;
  const eternalNightEnemyResPenalty = enemyEternalNight && isCoMVersion && unitRealm !== 'death' ? -1 : 0;
  // Warlord Eternal Night ("Poor Vision"): enemy non-Death units suffer -2 to ranged
  // attack strength (missile/boulder and magic ranged). Thrown and breath are
  // short-range and not affected. (Per helptext: "-2 Ranged Attack power".)
  const warlordEternalNightActive = enemyEternalNight && isWarlord && unitRealm !== 'death';
  let darknessAtkBonus = 0;
  let darknessDefBonus = 0;
  let darknessResBonus = 0;
  if (unitRealm === 'death') {
    darknessAtkBonus += darknessAtkDefMagnitude;
    darknessDefBonus += darknessAtkDefMagnitude;
    darknessResBonus += darknessResMagnitude;
  } else if (unitRealm === 'life') {
    darknessAtkBonus -= darknessAtkDefMagnitude;
    darknessDefBonus -= darknessAtkDefMagnitude;
    darknessResBonus -= darknessResMagnitude;
  }
  let trueLightAtkBonus = 0;
  let trueLightDefBonus = 0;
  let trueLightResBonus = 0;
  if (unitRealm === 'death') {
    trueLightAtkBonus = -1; trueLightDefBonus = -1; trueLightResBonus = -1;
  } else if (unitRealm === 'life') {
    trueLightAtkBonus = 1; trueLightDefBonus = 1; trueLightResBonus = 1;
  }

  // Effective values (level + weapon + ability + node aura + darkness/light modifiers)
  // Lionheart: version-dependent HP bonus (+3 in MoM; floor(8/figs) in CoM/CoM2).
  // RTB bonus (+3) applies to non-magical ranged (missile/boulder) in all versions.
  // Thrown gets the bonus only in MoM; CoM/CoM2/Warlord drop the thrown bonus.
  const lionheartActive = !!(abilities && abilities.lionheart);
  const lionheartHpMod = lionheartActive
    ? (version.startsWith('mom') ? 3 : Math.floor(8 / baseFigs))
    : 0;
  // Endurance: CoM gives +2 defense; CoM2 instead gives +4 total HP split evenly
  // between figures, with a minimum of +1 HP per figure.
  const enduranceActive = !!(abilities && abilities.endurance);
  const enduranceDefMod = enduranceActive && version.startsWith('com_') ? 2 : 0;
  const enduranceHpMod = enduranceActive && version.startsWith('com2')
    ? Math.max(1, Math.floor(4 / baseFigs))
    : 0;

  const charmOfLifeActive = !!(abilities && abilities.charmOfLife);
  const levelRank = ({
    normal: 0,
    regular: 1,
    veteran: 2,
    elite: 3,
    ultra_elite: 4,
    champion: 5,
  })[level] || 0;
  const disciplineVal = version.startsWith('com2') ? ((abilities && abilities.discipline) || 'none') : 'none';
  const disciplineActive = disciplineVal === 'overland' || disciplineVal === 'combat';
  const combatDisciplineNegatesFirstStrike = disciplineVal === 'combat' && levelRank >= 3;
  const disciplineDefMod = disciplineActive ? (levelRank >= 1 ? 2 : 1) : 0;
  const disciplineAtkMod = disciplineActive && levelRank >= 2 ? 1 : 0;
  // Overland Discipline grants +1 movement at Elite+, but movement is not modeled here.

  // Soul Flay (Warlord, Death rare combat curse): irresistible curse on normal units
  // or heroes. Penalises stats by −1 melee, −1 ranged, −2 armor and −2 resistance per
  // experience level of the target. Experience level counts Recruit (the calculator's "normal")
  // as level 1, so the multiplier is levelRank + 1: Recruit −1/−1/−2/−2, Elite −4/−4/−8/−8.
  // Fantastic creatures are not valid targets and take no penalty.
  const soulFlayActive = version.startsWith('com2_warlord')
    && !!(abilities && abilities.soulFlay)
    && !isFantasticBase;
  const soulFlayLevels = levelRank + 1;
  const soulFlayAtkMod = -1 * soulFlayLevels;
  const soulFlayDefMod = -2 * soulFlayLevels;
  const soulFlayResMod = -2 * soulFlayLevels;

  // Plague (Warlord combat curse): inflicted by the Pestilence city curse on defending
  // garrison units, by the Plague Lord unit ability, and by the Plague Lord artifact power.
  // −3 attack, −3 ranged, −3 armor, −6 resistance and −10% To-Hit for the rest of combat, on
  // any affected unit (no fantastic exclusion). The To-Hit penalty is applied below. The
  // script writes `SRanged`, the conventional ranged field, so the penalty lands on the
  // ranged channel only; Warlord's independent Thrown and Breath fields are untouched.
  const plagueActive = version.startsWith('com2_warlord') && !!(abilities && abilities.plague);

  // Pox Host (Warlord global combat debuff): a Goblin Poxbearer unit present on the
  // battlefield spreads Goblin Pox to every unit, with the effect varying by race.
  // Goblin units suffer −1 attack, −1 ranged, −1 armor (no resistance penalty); non-Goblin
  // units suffer −3 attack, −3 ranged, −3 armor, −1 resistance. No To-Hit penalty, unlike
  // Plague. The Warlord manual instead gives −1/−3 resistance; the script's branches settle it,
  // and agree with the in-game helptext (GOBLIN POX spell and POX HOST UA). Read from the
  // global toggle; the unit's race (empty on custom units) determines which branch applies.
  const poxHostActive = version.startsWith('com2_warlord') && !!input.poxHost;
  const poxHostIsGoblin = unitRace === 'Goblin';
  const goblinPoxAtkMod = poxHostIsGoblin ? -1 : -3;
  const goblinPoxDefMod = poxHostIsGoblin ? -1 : -3;
  const goblinPoxResMod = poxHostIsGoblin ? 0 : -1;

  // Great Unbinding (Warlord Sorcery very rare global): debuffs opponent fantastic
  // creatures in combat with −20% To-Hit, −20% To-Defend and −2 Resistance for the
  // rest of battle. Only fantastic creatures are affected (the Confusion half of the
  // spell is not modelled here). The To-Hit/To-Defend penalties are applied in the
  // toHit/toBlock section below; here we handle the −2 Resistance.
  const greatUnbindingActive = version.startsWith('com2_warlord')
    && !!(abilities && abilities.greatUnbinding)
    && isFantasticBase;

  // Natural Selection (Warlord Nature common global): units trained in a city gain
  // bonuses from resources in the city's surroundings. The inputs expose each resource
  // separately on the trained unit:
  //   Coal → +1 melee; Iron → +1 armor; Wild game → +1 ranged attack (+ Forester);
  //   Nightshade → +1 resistance; Power minerals → +N resistance (the numeric input
  //   holds the resistance bonus directly). The Resistance resources are not independent:
  //   Nightshade's later snapshot-based write replaces the Power-mineral bonus.
  // Forester is a terrain/movement perk with no combat effect, so only the +1 ranged
  // attack from Wild game is reflected in the stats.
  const naturalSelectionEligible = isWarlord && !isFantasticBase && !isHero;
  const naturalSelectionCoal = naturalSelectionEligible && !!(abilities && abilities.coal);
  const naturalSelectionIron = naturalSelectionEligible && !!(abilities && abilities.iron);
  const naturalSelectionNightshadeCount = abilities && abilities.nightshade === true
    ? 1 : Math.max(0, parseInt(abilities && abilities.nightshade) || 0);
  const naturalSelectionNightshade = naturalSelectionEligible
    && naturalSelectionNightshadeCount > 0;
  // Nature Link (Warlord rename of Land Linking): grants +1 resistance to any unit
  // (normal or fantastic). The fantastic-only +2 melee/def/breath is handled with Land Linking.
  const natureLinkActive = isWarlord && !!(abilities && abilities.landLinking);
  const naturalSelectionPowerMineralsCount = naturalSelectionEligible
    ? Math.max(0, parseInt(abilities.powerMinerals) || 0)
    : 0;
  const naturalSelectionPowerMinerals = naturalSelectionPowerMineralsCount > 0;

  // Survival Instinct (Warlord addition): newly trained normal units gain a small
  // +3% to +7% To-Defend from gold-producing resources in the city's surroundings.
  // The numeric input holds that To-Defend percentage; applied to normal units only
  // (the fantastic-creature buff is the separate survivalInstinct checkbox).
  const survivalInstinctToBlkBonus = isWarlord && isNormalUnitType(unitTypeVal)
    ? Math.max(0, parseInt(abilities.survivalInstinctToBlock) || 0)
    : 0;

  // Orihalcon: +1 resistance, +2 magical ranged attack (CoM/CoM2).
  const orihalconActive = armor === 'orihalcon';

  // Wall of Fire garrison boost (Warlord): the city enchantment grants +1 to all
  // defending normal-unit non-magic attacks, mirroring the original game's Metal
  // Fires. Modelled as a per-unit enchantment so it can apply to whichever side is
  // the garrison; gated to normal units only. Covers melee, physical ranged
  // (missile/boulder), and thrown — but not magic ranged or breath. Like Metal Fires
  // it also upgrades a normal weapon to magic (bypasses Weapon Immunity) — applied to
  // effectiveWeapon below. (The fire-line damage to attackers crossing the wall is the
  // separate global Wall of Fire toggle, handled in combat_special_attacks.js.)
  const wofDefenderBonusActive = isWarlord && !!(abilities && abilities.wallOfFireBoost)
    && isNormalUnitType(unitTypeVal);

  // Metal Fires / Flame Blade: +1/+2 to missile and thrown rtb only (not boulder, magic).
  // Warlord Flame Blade / Fiery Blade (per in-game helptext): +2 to missile and thrown.
  // Combat-cast Flame Blade's +1 Fire Breath is a separate region-d script write below;
  // neither blade boosts boulder here.
  // Warlord Fiery Fury: +2 to missile, boulder, and thrown for regular units only;
  // bonuses (except boulder) do not stack with Flame Blade.
  // Flame Blade / Fiery Blade also upgrade the unit's normal weapon to magic (bypasses Weapon Immunity);
  // Fiery Fury does the same for regular units.
  const warlordFieryBlade = isWarlord && !!abilities.fieryBlade;
  const hasWarlordBlade = warlordCombatFlameBlade || warlordFieryBlade;
  const nonWarlordFlameBlade = !!abilities.flameBlade && !isWarlord;
  // Metal Fires checks the live Fantastic flag before applying its entire package: melee,
  // missile/Thrown strength, and the magic-weapon upgrade all share this eligibility gate.
  const metalFiresActive = !!abilities.metalFires && !identity.fantastic;
  const fbAtkBonus = (nonWarlordFlameBlade || hasWarlordBlade) ? 2 : (metalFiresActive ? 1 : 0);
  const ffRegularBonus = isWarlord && !!abilities.fieryFury && !isFantasticBase;
  // Fiery Fury melee +3 for regular units; non-cumulative with Flame Blade / Fiery Blade
  // (combat_abilities.js already adds +3 melee for a Warlord blade effect).
  const ffMeleeBonus = ffRegularBonus && !hasWarlordBlade ? 3 : 0;

  // Warlord Colossal Strength: +1 + 40% (rounded down) of Melee, Physical Ranged, and
  // Thrown attack strength. Breath and magic ranged are not "physical ranged" and do not
  // qualify.
  //
  // UnitCalc.CAS:1227-1243 computes `1 + %I(GetStat(U,SAttack,0)*4/10)` from the attack as
  // it stands in phase d — not from the base — so the bonus scales everything phases a-c
  // applied, plus the phase-d terms that precede it in the file: Rust (:500-512), Focus
  // Magic (:83, :515) and Weakness's breath penalty (:317-323). Those are every phase-d
  // term the calculator models. As a step it simply reads `u.atk` / the channel's strength at
  // the end of region `d`, which is that subtotal by construction.
  const colossalStrength = isWarlord && !!(abilities && abilities.colossalStrength);
  // Stats are never negative in the engine, so a subtotal driven below zero scales as zero.
  const colossalScaled = (subtotal) => 1 + Math.floor(0.4 * Math.max(0, subtotal));
  const holyArmorActive = !!(abilities && abilities.holyArmor);
  // Pillar of Faith (Warlord, Life rare city enchantment): +1 Resistance per qualifying
  // building in the training city. The script has no cap; the numeric input holds the count.
  const pillarOfFaithCount = isWarlord && !isFantasticBase && !isHero
    ? Math.max(0, parseInt(abilities.pillarOfFaithRes) || 0)
    : 0;
  const pillarOfFaith = pillarOfFaithCount > 0;
  // Warlord scoring options run in UnitCalcPre.CAS (phase b). Uphill Battle is
  // represented per unit so the caller can mark whichever side is AI-controlled.
  // Gods Play Dices records the already-rolled combat modifier rather than rolling
  // or mixing it into the damage distribution.
  const uphillBattleActive = isWarlord && !!(abilities && abilities.uphillBattle);
  const godsPlayDicesResMod = isWarlord
    ? Math.max(-2, Math.min(2, parseInt(abilities.godsPlayDices) || 0))
    : 0;
  // Berserk: two distinct mechanics, modelled as separate abilities.
  // 'berserk' (MoM Death spell, UI-gated to MoM versions): doubles melee attack
  // (applied last, after all other bonuses) and sets defense to 0 absolutely (no
  // other bonus can raise it while Berserk is active). Removed in CoM/CoM2.
  // 'berserkWarlord' (Warlord Troll Medicineman buff, UI-gated to Warlord): +15% To
  // Hit, +1 combat movement (irrelevant here), and -10% To Block. No atk-doubling
  // and no def-zeroing.
  const classicBerserk = !!(abilities && abilities.berserk) && version.startsWith('mom');
  const warlordBerserk = !!(abilities && abilities.berserkWarlord) && isWarlord;
  // A unit whose base melee strength is 0 has no melee attack at all, so melee bonuses are
  // discarded rather than conjuring one. Blaze of Glory is the exception the model has to
  // allow for: its armor-to-melee transfer lands even on such a unit. The ranged slot has
  // the same gate, widened by Bombs&Grenades, which grants a thrown attack outright.
  // Warlord True Light writes SAttack unconditionally. A matching Life unit therefore gains
  // strength-1 melee even when the persistent attack field was zero; unlike an ordinary
  // attack bonus, this source-backed write creates the live attack.
  const trueLightCreatesMelee = isWarlord && hasTrueLight && trueLightAtkBonus > 0;
  const hasMeleeAttack = calcBaseAtk > 0 || marionetteAttackBonus > 0 || trueLightCreatesMelee;

  // Blazing March: +3 to missile only (not boulder, magic ranged, or breath).
  // Warlord also boosts thrown.
  const blazingMarchActive = !!(abilities && abilities.blazingMarch);

  // Chaos Surge: affects Chaos creatures only.
  // MoM and CoM 1 both write the shared ranged slot unconditionally on attack type, so
  // the bonus reaches missile, boulder, magic ranged, thrown, breath and gaze alike.
  // Chaos Channels' granted Fire Breath is excluded in MoM only: the constructor runs
  // Chaos Surge *before* BU_Apply_Specials, whose CC block then assigns ranged = 2 over
  // the top. CoM 1 swapped that call order, so there the CC breath keeps the bonus.
  // CoM2/Warlord are a separate engine and keep the narrower helptext scope.
  // Reinforce Magic: +2 to magical ranged attack strength only.
  const reinforceMagicActive = !!(abilities && abilities.reinforceMagic);

  // Weakness: -2 (MoM) or -3 (CoM/CoM2/Warlord) to ranged and thrown.
  // Which ranged types are hit differs by engine (WIZARDS.EXE 0x908FC / 0x9067F):
  //   MoM  — missile only (`ranged_type / 10 == 2`, i.e. Bow/Sling). Boulder and magic
  //          ranged are exempt, matching the Fandom page's "Other types of Ranged Attacks
  //          are not affected".
  //   CoM+ — every conventional ranged type (`ranged_type / 10 <= 3`: missile, boulder,
  //          magic), matching "melee, thrown and ranged attack strengths" in the CoM 1
  //          and CoM2 helptext.
  // Thrown is a separate test in both engines (`ranged_type == 100`); in MoM 1.31 that
  // test is written `ranged_type / 10 == 100`, which no int8 can satisfy, so thrown is
  // never reduced there. CP 1.60 nops the divide and the penalty starts applying.
  // Breath and gaze (`ranged_type >= 101`) are exempt in every binary; Warlord adds the
  // breath penalty on top in UnitCalc.CAS:309-315.
  // The three branches are mutually exclusive and fall in different phases: ranged and
  // thrown are binary (phase c), while the Warlord breath penalty is phase d. They are
  // kept as separate terms so each lands in the right accumulator.
  const weaknessActive = !!(abilities && abilities.weakness);
  const weaknessPenalty = weaknessActive ? (isCoMVersion ? 3 : 2) : 0;

  // Holy Weapon: +10% To Hit on melee, missile, and boulder attacks. Also applies to thrown
  // in all versions except MoM 1.31 (bug). Does NOT affect magic ranged, fire/lightning
  // breath, or gaze attacks. Also upgrades normal weapon to magic (bypasses Weapon Immunity).
  const hwActive = !!(abilities && abilities.holyWeapon);
  const hwMeleeToHit = hwActive ? 10 : 0;
  // Rust clears the persistent material flags before recalculation, so Heavenly Light sees the
  // post-Rust base material record rather than the pre-curse UI selection.
  const heavenlyLightMaterialTail = heavenlyLightActive
    && weapon === 'normal' && !isHero && !isFantasticBase;
  const heavenlyLightMeleeToHit = heavenlyLightMaterialTail && inputBaseAtk > 0 ? 10 : 0;
  const heavenlyLightThrownToHit = heavenlyLightMaterialTail ? 10 : 0;
  const outlanderToHitBonus = (abilities.outlanderXenoveterinary ? 10 : 0)
    + (abilities.outlanderRadio ? 10 : 0);
  const outlanderRtbToHitBonus = abilities.outlanderBallisticsTraining ? 20 : 0;
  const uphillBattlePct = uphillBattleActive ? 10 : 0;
  // UnitCalc.CAS:326-328 writes `SToRanged` alone, so the bonus reaches the Ranged channel
  // only and never Thrown or either Breath. No ranged-type test: the script writes the
  // modifier whatever the type, magical ranged included.
  const trueSightRangedToHitBonus = isWarlord
    && !!(abilities.trueSight || abilities.eyeOfHeaven) ? 5 : 0;
  const weaponUpgradedByHW = hwActive && weapon === 'normal';
  const wraithFormBypassesWI = weapon === 'normal'
    && version.startsWith('com')
    && !!(abilities && (abilities.wraithForm || abilities.rulerOfUnderworld));
  // Warlord Wall of Fire's defender bonus mirrors Metal Fires, which also upgrades
  // the unit's weapon to magic (bypasses Weapon Immunity) for its non-magic attacks.
  const weaponUpgradedByWoF = wofDefenderBonusActive && weapon === 'normal';
  // Note: Eldritch Weapon also upgrades a normal weapon to magic, but ONLY for the
  // melee attack (per the MoM Eldritch Weapon page). It is therefore NOT folded into
  // this global weapon type — it is applied to the melee Weapon-Immunity check only
  // (see meleeWeaponWI in combat_effects.js). Its ranged/thrown attacks stay non-magical, so
  // Weapon Immunity still raises the target's defense against them.
  const weaponUpgradedByHeavenlyLight = heavenlyLightActive && weapon === 'normal';
  const effectiveWeapon = (fbAtkBonus > 0 && weapon === 'normal') ? 'magic'
    : (ffRegularBonus && weapon === 'normal') ? 'magic'
    : (weaponUpgradedByHW ? 'magic'
    : (wraithFormBypassesWI ? 'magic'
    : (weaponUpgradedByWoF ? 'magic'
    : (weaponUpgradedByHeavenlyLight ? 'magic'
    : weapon))));

  // ApplyAttack passes `EncMagic or magicranged` to EffectiveDefense. Keep EncMagic as
  // calculated state instead of approximating it later from weapon quality and final unit
  // type. Only the material grant made by ApplyMagicWeapons can be suppressed by an enemy
  // King/Ruler of Underworld. Independent EncMagic writes survive whether they occur before
  // that helper (hero standing and Warlord Wall of Fire) or after it.
  const modernEncMagicFromMaterial = version.startsWith('com2_') && weapon !== 'normal';
  const modernEncMagicIndependentOfMaterial = version.startsWith('com2_')
    && (isHero || fantasticAtModernEncMagicRule
      || nonWarlordFlameBlade || hasWarlordBlade || ffRegularBonus || hwActive
      || !!abilities.wraithForm || !!abilities.rulerOfUnderworld
      || !!abilities.blazingMarch || wofDefenderBonusActive || heavenlyLightActive);
  const modernEncMagic = modernEncMagicFromMaterial || modernEncMagicIndependentOfMaterial;

  // Eye of Heaven is the only effect that switches a gaze off: `UnitCalc.CAS:1483` zeroes
  // `SStoningGaze`/`SDeathGaze`/`SDoomGaze` and nothing else in any source does.
  const gazeDisabled = enemyEyeOfHeaven;
  // A gaze's strength lives in the same `.ranged` slot Chaos Surge writes, so MoM and
  // CoM 1 boost all three DOS gaze types. CoM2/Warlord (separate engine) are left unchanged.
  // Level bonus to a gaze's strength, from the same shared `.ranged` slot. MoM's level
  // routine (0x8F881-0x8FB3E) has no `ranged_type` gate at all, so all DOS gaze types take
  // the full ranged ladder. CoM 1 replaced it with a table loop whose `.ranged` step is
  // skipped for `ranged_type >= 100` — thrown, breath and every gaze — on all rows but
  // Veteran (0x8FA9A-0x8FAAB); that is exactly the ladder's `thrown` column. CoM2 and
  // Warlord instead write none of their three independent gaze fields in ApplyLevelBonus.
  const gazeLvlMod = version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : 0;
  const doomGazeLvlMod = version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : 0;
  // CoM 1's Warp Attack halves the `.ranged` slot with no `ranged_type` test at all
  // (0x90764-0x90772), so it reaches a gaze's strength exactly as it reaches conventional
  // ranged, thrown and breath. Darkness lands after the halving, as it does for the ranged
  // stat below. MoM's Warp Attack touches melee only. CoM2/Warlord's separate gaze fields
  // are untouched by all three compiled Warp blocks (CoM2 analysis, *The Warp blocks*).
  const gazeWarpHalves = isCoM1 && !!(abilities && abilities.warpAttack);

  // Psycho Force and Pneuma Field are the two Magitek effects that read Resistance rather than
  // writing it. Both are region `d` — UnitCalc.CAS:1413-1417 and :1419-1425 — so their gates are
  // resolved here and the reads happen at that position in the sequence below.
  const psychoForceActive = isWarlord && !!(abilities && abilities.psychoForce);
  const pneumaFieldActive = isWarlord && !!(abilities && abilities.pneumaField);
  const warpRealityActive = !!input.warpReality;
  const unitIsChaos = unitTypeVal === 'fantastic_chaos';
  const hurricaneActive = !!input.hurricane;
  const vertigoActive = !!(abilities && abilities.vertigo)
    && !(abilities && (abilities.illusionImmunity || abilities.magicImmunity));
  const vertigoHitPenalty = isCoM2 ? 0.25 : (isCoMVersion ? 0.3 : 0.2);
  const vertigoBlockPenalty = isCoM2 ? 0.07 : (isCoMVersion ? 0.1 : 0);

  // --- One derivation slot per record strength field (F80) ---
  //
  // `Caster.exe` holds Ranged, Thrown, Fire Breath and Lightning Breath as four named fields of
  // one unit record, copies the record once and mutates those fields in place. One walk therefore
  // derives every channel: a slot is one strength field plus the type pair and the secondary To
  // Hit modifier that field is read with (steps.js, STAT_DERIVATION_SLOTS).
  //
  // The `legacy` slot is the DOS engines' shared `.ranged` slot, which carries conventional
  // ranged, Thrown, Breath and both gaze strengths in one value. The modern engines keep it as
  // the card's legacy secondary projection (`result.rtb`), so it is a slot in every version and
  // the four channel slots exist only where the caller supplies `modernAttacks`.
  //
  // Everything below that depends on which attack a write reaches is computed per slot; every
  // other field of the record is written once, from the `legacy` slot's context, which is the
  // record-level answer the exposed `atk`/`def`/`res`/`hp` outputs have always used.
  function buildSlotContext(slot) {
    const fields = STAT_DERIVATION_SLOTS[slot.slotKey];
    const channelKey = slot.channelKey || null;
    const isChannelSlot = slot.slotKey !== 'legacy';
    const rtbTypeRaw = slot.type;
    const inputSlotRtb = Math.max(0, parseInt(slot.strength) || 0);
    let rangedType = RANGED_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
    let thrownType = THROWN_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
    const permanentRangedType = rangedType;
    const permanentThrownType = thrownType;
    const gazeType = GAZE_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
    const marionetteRangedSlot = (marionetteOwned || marionetteStrayed)
      && (!channelKey || channelKey === 'ranged');
    const marionetteOwnsThisRangedSlot = marionetteOwned
      && (!channelKey || channelKey === 'ranged');
    // Marionette writes the conventional ranged type without clearing any independent
    // Thrown/Breath field. Per-channel slots make that distinction exact for modern records.
    if (marionetteRangedSlot) rangedType = marionette.rangedType;

    const modernBaseAttacks = slot.baseAttacks || null;
    const modernBaseHasBlackpowderChannel = modernBaseAttacks && Object.values(modernBaseAttacks)
      .some(attack => attack && attack.strength > 0
        && ['missile', 'boulder', 'thrown', 'fire'].includes(attack.type));
    const modernBaseHasPhysicalBlackpowderChannel = modernBaseAttacks
      && Object.values(modernBaseAttacks).some(attack => attack && attack.strength > 0
        && ['missile', 'boulder', 'thrown'].includes(attack.type));
    const selectedBaseHasBlackpowderChannel = inputSlotRtb > 0
      && (permanentRangedType === 'missile' || permanentRangedType === 'boulder'
        || permanentThrownType === 'thrown' || permanentThrownType === 'fire');
    const selectedBaseHasPhysicalBlackpowderChannel = inputSlotRtb > 0
      && (permanentRangedType === 'missile' || permanentRangedType === 'boulder'
        || permanentThrownType === 'thrown');
    const blackpowderEligibleAttack = modernBaseAttacks
      ? modernBaseHasBlackpowderChannel : selectedBaseHasBlackpowderChannel;
    const blackpowder = blackpowderSource
      && baseNormalTrainingUnit && blackpowderEligibleAttack;
    const blackpowderPhysicalSource = blackpowder && (modernBaseAttacks
      ? modernBaseHasPhysicalBlackpowderChannel : selectedBaseHasPhysicalBlackpowderChannel);
    const blackpowderSelectedPhysicalRanged = blackpowder
      && (permanentRangedType === 'missile' || permanentRangedType === 'boulder');
    const blackpowderSelectedThrown = blackpowder && permanentThrownType === 'thrown';
    const blackpowderSelectedFireBreath = blackpowder && permanentThrownType === 'fire';
    const blackpowderUpgradesToBoulder = blackpowderSelectedPhysicalRanged
      && permanentRangedType === 'missile';

    const calcBaseRtb = inputSlotRtb;
    // CreateUnit.CAS city/resource gates read the permanent unit record before later
    // enchantment-driven channel conversions can create or replace an attack.
    const hasPermanentRangedStat = inputSlotRtb > 0 && RANGED_TYPES.includes(rtbTypeRaw);
    // Alumni of Academy is a permanent +2-figure write made when a unit is trained.
    // Academy is Halfling-only, so the UI condition is race-gated. The script admits
    // Halfling Rocs (type 221, their Fantastic Stable unit) unconditionally; its other
    // branch requires an innate magical ranged attack and rejects Mechanical units.
    const alumniOfAcademy = isWarlord && !!abilities.alumniOfAcademy
      && unitRace === 'Halfling' && !isHero
      && (unitName.endsWith('Rocs')
        || (!abilities.mechanical && inputSlotRtb > 0
          && (rtbTypeRaw === 'magic_c' || rtbTypeRaw === 'magic_n' || rtbTypeRaw === 'magic_s')));

    // --- The running pair, advanced in chain order (F94) ---
    //
    // `rangedType`/`thrownType` are a running pair, not a set of snapshots: each predicate below
    // is written where its own step sits in the execution chain, so it reads the identity the
    // record carries at that point. The flips between them are therefore applied in the order
    // the Warlord chain gives their steps (`stats_manifests.js`) — `base:militaryWorkshop`,
    // `base:lightningBlade:breath`, `base:energyCannon`, `a:chaosChannels:fireBreath`,
    // `b:bombsGrenades` — with the predicates each of those positions feeds interleaved between
    // them. Nothing before a flip may see the identity that flip has not yet written.
    //
    // The seed is what `base:stat:base` writes (`stats_sequence.js`), and `base:stat:base` is the
    // chain's first entry, so it carries the permanent record's identity and nothing else. Every
    // flip below belongs to a later chain entry and is made by that entry's own step.
    const baseSequenceRangedType = rangedType;
    const baseSequenceThrownType = thrownType;

    // `base:militaryWorkshop`: the missile-to-boulder projectile upgrade.
    if (blackpowderUpgradesToBoulder) {
      rangedType = 'boulder';
    }

    // `base:lightningBlade:breath`.
    const lightningBladeOwnsThisSlot = isChannelSlot
      ? channelKey === 'thrown' || channelKey === 'lightningBreath'
      : !slot.baseAttacks && rangedType === 'none';
    // Without a Thrown source the assignment creates strength 1; an existing Lightning Breath is
    // overwritten. The modern record seeds this independent channel beside Ranged/Fire.
    const lightningBladeGrantsBreath = lightningBladeAbil
      && lightningBladeOwnsThisSlot && permanentThrownType !== 'thrown';
    const lightningBladeConvertsThrown = lightningBladeAbil
      && lightningBladeOwnsThisSlot && permanentThrownType === 'thrown';
    if (lightningBladeConvertsThrown || lightningBladeGrantsBreath) {
      thrownType = 'lightning';
    }

    // `base:energyCannon` is a permanent overland conversion to projectile type Beam
    // with ranged Doom damage. The script gates it on persistent Max Ammo > 0, but every
    // shipped Warlord conventional-ranged unit has positive Max Ammo and every Mechanical
    // zero-ammo unit lacks conventional Ranged. The one-round calculator therefore infers
    // that gate from the permanent conventional-ranged snapshot and imports no ammo field.
    // Its +50% write is added to the base phase below, after the earlier permanent ranged
    // writes it reads have been assembled.
    const energyCannon = isWarlord && !!abilities.energyBeamWeapons
      && !!abilities.powerEngine && hasPermanentRangedStat;
    const energyCannonOwnsThisSlot = !isChannelSlot || channelKey === 'ranged';
    if (energyCannon && energyCannonOwnsThisSlot) {
      rangedType = 'beam';
    }

    // `a:chaosChannels:fireBreath`, which the chain places after the three permanent writes above.
    const hasGazeAttack = gazeType !== 'none'
      || abilities.stoningGaze != null
      || abilities.deathGaze != null
      || baseDoomGazeWithBlazingEyes > 0;
    const ccDosBaseRanged = inputSlotRtb;
    const ccDosBreathEligible = (rtbTypeRaw === 'none' || rtbTypeRaw === 'thrown')
      && !hasGazeAttack && ccDosBaseRanged <= ccDosBaseRangedMax;
    const ccFireBreathGranted = ccFireBreathAbil
      && (ccIndependentChannels || ccDosBreathEligible);
    // Only the Fire Breath channel takes the grant; without this the shared-slot write would
    // land in whichever channel this slot derives and overwrite it.
    const ccOwnsThisSlot = !channelKey || channelKey === 'fireBreath';
    const ccFireBreathActive = ccFireBreathGranted
      && (ccIndependentChannels ? rangedType === 'none' : ccDosBreathEligible);
    if (ccFireBreathActive && ccOwnsThisSlot) {
      rangedType = 'none';
      thrownType = 'fire';
    }

    // `b:fieryFury` (`UnitCalcPre.CAS:832-846`) precedes the Bombs & Grenades block
    // (`:1066-1080`) in the same file, so it cannot see the Thrown field that block creates.
    const ffRtbMod = ffRegularBonus
      && (rangedType === 'missile' || rangedType === 'boulder'
        || thrownType === 'thrown') ? 2 : 0;

    // `b:bombsGrenades`. The grant supplies the identity of the field it fills, exactly as the
    // later `d:shadowStrike:thrown` grant does, so no earlier predicate sees a Thrown attack it
    // has not yet created.
    const bombsGrenadesGrantsThrown = bombsGrenades
      && rangedType === 'none' && thrownType === 'none';
    if (bombsGrenadesGrantsThrown) {
      thrownType = 'thrown';
    }
    const bombsGrenadesRtbMod = bombsGrenades && thrownType === 'thrown'
      ? Math.max(0, Math.floor(8 - baseFigs / 2))
      : 0;
    // ApplyLevelBonus dispatches on the channel the record carries at `c:level`, which every
    // chain places ahead of Focus Magic.
    let rtbLvl = 0;
    if (rangedType !== 'none') {
      rtbLvl = calcBaseRtb > 0 ? lvl.ranged : 0;
    } else if (thrownType !== 'none') {
      rtbLvl = lvl.thrown;
    }

    const focusMagicBaseRangedPresent = isChannelSlot
      ? !!slot.baseHasRanged
      : inputSlotRtb > 0 && RANGED_TYPES.includes(rtbTypeRaw);
    const focusMagicRangedBranchOwner = slot.focusOwner || channelKey || null;
    const focusMagicOwnsRangedBranch = !isChannelSlot
      || (!slot.skipFocusBranch && channelKey === focusMagicRangedBranchOwner);
    const preFocusRtbPositive = calcBaseRtb > 0
      || (ccFireBreathActive && ccOwnsThisSlot)
      || marionetteRangedSlot;
    const hasMagicRangedForFocus = preFocusRtbPositive
      && (rangedType === 'magic_c' || rangedType === 'magic_n'
        || rangedType === 'magic_s' || rangedType === 'beam');
    const hasBreathForFocus = preFocusRtbPositive
      && (thrownType === 'fire' || thrownType === 'lightning');
    const hasDoomGazeForFocus = isCoM2 && baseDoomGazeWithBlazingEyes > 0;
    const focusMagicBuffsExisting = focusMagicActive
      && (hasMagicRangedForFocus || hasBreathForFocus || hasDoomGazeForFocus);
    const focusMagicConvertsThrown = focusMagicActive && focusMagicOwnsRangedBranch
      && !focusMagicBaseRangedPresent && (preFocusRtbPositive || bombsGrenades)
      && thrownType === 'thrown';
    const focusMagicConvertsRanged = focusMagicActive && focusMagicOwnsRangedBranch
      && preFocusRtbPositive && (rangedType === 'missile' || rangedType === 'boulder');
    const focusMagicCreatesRanged = focusMagicActive && focusMagicOwnsRangedBranch
      && !focusMagicBaseRangedPresent && !focusMagicConvertsThrown
      && thrownType === 'none';
    if (focusMagicConvertsThrown || focusMagicConvertsRanged || focusMagicCreatesRanged) {
      rangedType = 'magic_s';
      thrownType = 'none';
    }

    // Shadow Strike's grant is not a pre-sequence flip either: it is the positioned region-`d`
    // step `shadowStrike:thrown` (stats_sequence.js), which runs at `UnitCalc.CAS:1262`. This
    // flag says only which field `SThrown += 1 + SAttack/3` reaches — the record's Thrown field,
    // or the DOS-shaped shared slot when it is free — and the step supplies the identity there.
    // Nothing before that line may see a Thrown attack the grant has not yet created.
    const shadowStrikeFillsSlot = shadowStrikeActive && !slot.deferShadowStrike
      && (channelKey === 'thrown'
        || (!isChannelSlot && (thrownType === 'thrown'
          || (thrownType === 'none' && rangedType === 'none'))));

    // `SThrown` is a field of the record, not an attack the unit owns. `Dec(U.thrown, 3)`,
    // `Dec(U.thrown, 5)` (Units.RecalculateUnits.pas:2273-2295) and `Inc(U.hitchancethrown, 10)`
    // (:1803-1809) write it with no positivity and no type gate, so what decides those writes is
    // which record field the slot is — not whether that field currently names an attack, and not
    // whether a later step will fill it. The modern `thrown` channel slot is that field until an
    // earlier write spends it: Lightning Blade assigns `SLightningBreath` and clears `SThrown`
    // (CreateUnit.CAS:294-299), and Focus Magic takes its contents into `SRanged`. Neither leaves
    // `SThrown` behind, so a slot carrying one of those is no longer the Thrown field.
    // The DOS-shaped `legacy` slot is a different thing — one shared value carrying conventional
    // ranged, Thrown, Breath or a gaze — so there the type test is what routes the two halves,
    // and the Shadow Strike grant is what claims the shared slot while it stands free.
    const modernThrownField = channelKey === 'thrown' && rangedType === 'none'
      && thrownType !== 'fire' && thrownType !== 'lightning';
    const thrownFieldSlot = isChannelSlot ? modernThrownField
      : (thrownType === 'thrown' || shadowStrikeFillsSlot);

    // Blaze of Glory's channel transfer is not a pre-sequence flip: it is the positioned
    // region-`d` step `blazeOfGlory` (stats_sequence.js), which runs at
    // `UnitCalc.CAS:1490`. Every predicate before that position therefore still sees the
    // conventional Ranged identity, which is what the engine's earlier writes see.

    // Blackpowder-derived bonuses (see the Military Workshop / Rocketry gate above).
    // Its strength/AP predicates read the permanent source fields and survive later channel
    // conversions. The missile-to-boulder projectile upgrade was already applied above.
    const blackpowderHasRangedOrThrown = blackpowder
      && (blackpowderSelectedPhysicalRanged || blackpowderSelectedThrown);
    // Doom attack: Armor Piercing is wasted (Doom ignores armor), so grant strength instead.
    const blackpowderGrantsAP = blackpowderPhysicalSource
      && !abilities.doom && !abilities.armorPiercing;
    const blackpowderRtbMod = blackpowderHasRangedOrThrown
      && (!!abilities.doom || !!abilities.armorPiercing)
      ? (blackpowderSelectedThrown ? 4 : 2)
      : 0;
    // Fire Breath: +4 strength.
    const blackpowderFireBreathRtbMod = blackpowderSelectedFireBreath ? 4 : 0;
    // +1 Poison, applied on top of any existing poison (including the Gnoll Altar grants below).
    const blackpowderBasePoison = altarHunter ? 2 : (altarWitchdoctor ? 0 : (abilities.poison || 0));
    // Warlord Venom enchantment: +1 Poison (boosting any existing/granted poison, or granting
    // Poison 1 if the unit has none) plus Poison Immunity. The base it boosts mirrors the final
    // poison precedence of the spreads below (last-wins: motherFungus > militaryWorkshop > altars).
    const venom = version.startsWith('com2_warlord') && !!(abilities && abilities.venom);
    const venomBasePoison =
        motherFungus ? (abilities.poison || 0) + 1
      : blackpowder ? blackpowderBasePoison + 1
      : altarWitchdoctor ? 0
      : altarHunter ? 2
      : (abilities.poison || 0);

    // `Ismagicalranged(rt)` is False for `rt < 1` and otherwise the entry's `Ismagic` byte
    // (Units.RecalculateUnits.pas:2968-2975), so every gate the engine writes as
    // `not Ismagicalranged(U.rangedtype)` also passes on a unit whose ranged type is zero:
    // `SRanged` is a field of the record, present whether or not the unit owns a ranged attack.
    // The modern `ranged` channel slot *is* that field, so those gates admit it while it is
    // still typeless. The DOS-shaped `legacy` slot is a different thing — there `'none'` means
    // the one shared value is carrying a Thrown, Breath or gaze attack instead — so it keeps
    // the two names the DOS material body admits.
    const isModernRangedField = isCoM2 && channelKey === 'ranged';
    const nonMagicalRangedField = isModernRangedField
      ? !isMagicalRangedType(rangedType)
      : (rangedType === 'missile' || rangedType === 'boulder');
    const rangedGetsWpn = nonMagicalRangedField;
    const thrownGetsWpn = (thrownType === 'thrown');
    const supremeLightEligible = supremeLightActiveForUnit(abilities, unitTypeVal, version, {
      liveRangedType: rangedType,
      baseRangedType: rtbTypeRaw,
    });

    const modernConventionalRangedChannel = isCoM2 && (channelKey
      ? channelKey === 'ranged' : rangedType !== 'none');
    // The shared `legacy` slot answers this by identity, and the Shadow Strike grant gives it
    // one: `Dec(U.thrown, 5)` and its neighbours carry no positivity or type gate
    // (Units.RecalculateUnits.pas:2273-2295), so a Thrown field this slot will hold is reached
    // by them even while it stands empty, and the region-`e` clamp settles the result. The
    // modern engines name the two record fields directly: the `ranged` channel is `SRanged`,
    // as is a Thrown channel Focus Magic has converted for as long as that move is an identity
    // flip in place (F90), and `modernThrownField` is `SThrown`. Both Breaths stay outside.
    const modernRangedOrThrownChannel = isCoM2 && (channelKey
      ? channelKey === 'ranged' || rangedType !== 'none' || modernThrownField
      : rangedType !== 'none' || thrownType === 'thrown' || shadowStrikeFillsSlot);
    const modernNodeSecondaryChannel = isCoM2 && (channelKey
      ? ['ranged', 'fireBreath', 'lightningBreath'].includes(channelKey)
      : rangedType !== 'none' || ['fire', 'lightning'].includes(thrownType));

    // The modern unit record carries one common To Hit field plus four channel modifiers —
    // `hitchanceranged`, `hitchancethrown`, `hitchancebreath`, `hitchancemelee`
    // (Units.RecalculateUnits.pas:213-218) — and combat reads `hitchance<channel> + hitchance`
    // (Combat.ApplyAttack.pas:224,239,272,291). Fire and Lightning Breath are separate strength
    // fields sharing the one `hitchancebreath` modifier, so the three secondary channel kinds
    // the record distinguishes are Ranged, Thrown and Breath. The DOS engines store one
    // effective threshold per attack instead, so the shared `legacy` slot keeps `toHitRtb`.
    // A Thrown field the Blaze of Glory transfer or the Shadow Strike grant fills is still the
    // record's Thrown field, so it reads `hitchancethrown` — that routing is record structure,
    // not a live type predicate, and the same flag keeps the region-`e` slot clamp from
    // discarding the transfer, exactly as that clamp already does not discard the
    // armor-to-melee transfer beside it.
    const blazeOfGloryFillsSlot = blazeOfGloryActive && channelKey === 'thrown';
    const secondaryHitKind = shadowStrikeFillsSlot ? 'thrown'
      : ['fire', 'lightning'].includes(thrownType) ? 'breath'
        : (thrownType === 'thrown' || blazeOfGloryFillsSlot) ? 'thrown'
          : 'ranged';

    const eternalNightRtbMod = warlordEternalNightActive
      && (rangedType === 'missile' || rangedType === 'boulder'
        || rangedType === 'magic_c' || rangedType === 'magic_n'
        || rangedType === 'magic_s' || rangedType === 'beam') ? -2 : 0;
    const lionheartRtbMod = lionheartActive
      && (nonMagicalRangedField
          || (thrownType === 'thrown' && version.startsWith('mom'))) ? 3 : 0;
    const disciplineRtbMod = disciplineActive && levelRank >= 2
      && nonMagicalRangedField ? 1 : 0;
    // The script writes `SRanged` by the same per-level amount as melee, so the penalty lands
    // on the conventional ranged channel only; Warlord's independent Thrown and Breath fields
    // are untouched.
    const soulFlayRtbMod = soulFlayActive && modernConventionalRangedChannel
      ? -1 * soulFlayLevels : 0;
    const plagueRtbMod = plagueActive && modernConventionalRangedChannel ? -3 : 0;
    // Both branches write `SRanged` by the same amount as melee, so the penalty lands on the
    // conventional ranged channel only; Warlord's independent Thrown and Breath fields are
    // untouched.
    const goblinPoxRtbMod = poxHostActive && modernConventionalRangedChannel
      ? (poxHostIsGoblin ? -1 : -3) : 0;
    const orihalconRtbMod = orihalconActive
      && (rangedType === 'magic_c' || rangedType === 'magic_n'
        || rangedType === 'magic_s' || rangedType === 'beam') ? 2 : 0;
    const wofDefenderRtbMod = wofDefenderBonusActive
      && (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown') ? 1 : 0;
    const ludusAgogeRtbMod = ludusAgoge && hasPermanentRangedStat ? 1 : 0;
    const motherFungusRtbMod = motherFungus && hasPermanentRangedStat ? 2 : 0;
    // Warlord's script adds the Thrown branch the CoM2 binary does not have; the version test
    // is that difference, not a position correction.
    const blazingMarchBoostsThrown = isWarlord && thrownType === 'thrown';
    const blazingMarchRtbMod = blazingMarchActive
      && (rangedType === 'missile' || blazingMarchBoostsThrown) ? 3 : 0;
    // Natural Selection — Wild game snapshots the permanent conventional-ranged field
    // before any later conversion. Read the value at the source step and keep the channel
    // predicate separate so a converted Thrown field cannot stand in for the saved RNG field.
    const naturalSelectionWildGameRangedSlot = isChannelSlot
      ? channelKey === 'ranged'
      : RANGED_TYPES.includes(rtbTypeRaw);
    const naturalSelectionWildGameActive = naturalSelectionEligible
      && !!(abilities && abilities.wildGame) && naturalSelectionWildGameRangedSlot;
    const reinforceMagicRtbMod = reinforceMagicActive
      && (rangedType === 'magic_c' || rangedType === 'magic_n'
        || rangedType === 'magic_s' || rangedType === 'beam') ? 2 : 0;
    // Supreme Light's +2 has no precomputed modifier: its gate is the live `if U.ranged > 0`
    // the `e:supremeLight` step reads at its own position (stats_sequence.js).
    // Altar of the Moon: +2 to ranged attack strength (missile/boulder/magic ranged only;
    // thrown and breath are not affected), matching the "ranged units" wording.
    const altarOfTheMoonRtbMod = altarOfTheMoon && hasPermanentRangedStat ? 2 : 0;
    // CoM/CoM2 Land Linking boosts melee and breath only.
    const landLinkingBreathRtbMod = landLinkingEligible && version.startsWith('com')
      && (thrownType === 'fire' || thrownType === 'lightning') ? 2 : 0;
    // Dragon Mound (Warlord): unconditional +2 to the independent Fire Breath field.
    const dragonMoundRtbMod = dragonMound
      && (channelKey ? channelKey === 'fireBreath' : thrownType === 'fire') ? 2 : 0;
    // Giant Strength: +1 thrown only (not missile/boulder/magic ranged, not breath).
    const gsRtbMod = (abilities.giantStrength && thrownType === 'thrown') ? 1 : 0;
    const weaknessHitsRanged = isCoMVersion ? rangedType !== 'none' : rangedType === 'missile';
    // `Dec(U.thrown, 3)` carries no positivity or type gate (Units.RecalculateUnits.pas:2273-2279),
    // so it reaches the record's Thrown field whether or not anything stands in it; the negative
    // holds until a later grant or transfer adds to it and the region-`e` clamp settles the
    // result. `thrownFieldSlot` is that field, by record structure in the modern engines and by
    // the shared slot's identity in the DOS ones.
    const weaknessRtbModBinary = weaknessActive
      ? (weaknessHitsRanged ? -weaknessPenalty
        : (thrownFieldSlot && version !== 'mom_1.31' ? -weaknessPenalty : 0))
      : 0;
    const weaknessRtbModCas = weaknessActive && weaknessRtbModBinary === 0
      && (thrownType === 'fire' || thrownType === 'lightning') && version.startsWith('com2_warlord')
      ? -weaknessPenalty : 0;
    // Rust (Warlord Chaos common combat curse): -3 to Physical Ranged Attack (missile/boulder),
    // mirroring the -3 melee penalty applied in combat_abilities.js. Magic ranged, fire/lightning
    // breath, and thrown are excluded (thrown is eliminated entirely by the same step).
    const rustRtbMod = (rustActive && (rangedType === 'missile' || rangedType === 'boulder')) ? -3 : 0;
    // Units.RecalculateUnits.pas:1806-1809 writes melee, Thrown and — when the current type is
    // not already magical — Ranged. Breath is untouched.
    const hwRangedToHit = hwActive && nonMagicalRangedField ? 10 : 0;
    // `Inc(U.hitchancethrown, 10)` is unconditional (Units.RecalculateUnits.pas:1803-1809), so
    // the modifier stands on the record's Thrown threshold before any later grant or transfer
    // creates the attack that reads it — as `heavenlyLightThrownToHit` already models for the
    // same material tail, and with the same absence of a gate. Which threshold a slot reads is
    // `secondaryHitKind`, so the DOS shared slot still consults this only while it is carrying
    // Thrown. MoM 1.31 alone omits the write.
    const hwThrownToHit = hwActive && version !== 'mom_1.31' ? 10 : 0;
    // The DOS material body admits Missile, Boulder, and Thrown by type, without a
    // strength test. Caster.exe keeps the same no-strength gate for conventional
    // non-magical ranged, but requires the current independent Thrown field to be
    // positive. Focus Magic has already converted its source channel by this point.
    const rtbToHitWpnRanged = wpn.toHit !== 0 && rangedGetsWpn ? wpn.toHit : 0;
    const rtbToHitWpnThrown = wpn.toHit !== 0 && thrownGetsWpn ? wpn.toHit : 0;
    const rtbToHitWpn = rtbToHitWpnRanged + rtbToHitWpnThrown;
    const heavenlyLightRangedNonmagical = nonMagicalRangedField;
    // Units.RecalculateUnits.pas:1451-1454 writes Ranged (non-magical types only) and Thrown.
    // Breath is untouched.
    const heavenlyLightRangedToHit = heavenlyLightMaterialTail
      && heavenlyLightRangedNonmagical ? 10 : 0;

    // Ranged/Thrown/Breath strength. The modern `ranged` channel answers for `SRanged` even
    // while it is typeless, so the branch is chosen by which record field the slot is, not by
    // whether that field currently names an attack. The `calcBaseRtb > 0` gate below is the
    // engine's missing positive-strength test and belongs to F97, not to this type breadth.
    let rtbWpn = 0;
    if (isModernRangedField || rangedType !== 'none') {
      rtbWpn = (calcBaseRtb > 0 && rangedGetsWpn) ? wpn.atk : 0;
    } else if (thrownType !== 'none') {
      rtbWpn = (calcBaseRtb > 0 && thrownGetsWpn) ? wpn.atk : 0;
    }
    // A channel field carries ranged, thrown AND breath (distinguished by its type pair), so it
    // is also what Explosive's fire-breath doubling scales — that effect has no stat of its own.
    const upgradedExplosive = explosiveEligible && blackpowder;
    const upgradedExplosiveRangedMod = upgradedExplosive && rangedType !== 'none' ? 2 : 0;
    // CreateUnit.CAS applies Energy Cannon after Artificer, Blackpowder,
    // Altar of the Moon, and Natural Selection. The +50% therefore reads those
    // permanent ranged writes, but not later equipment or combat modifiers.
    // Type 104 has no conventional component: Automatic Damage assigns `hits = attack_strength`
    // and jumps past both rolls (0x9A1E6 -> 0x9A204), so the one number is *delivered* rather
    // than rolled. Only 103 and 105 roll it. Counting both would double the gaze.
    const dosGazeStrength = !isCoM2 && gazeType !== 'none' && gazeType !== 'gaze_multiple'
      ? calcBaseRtb : 0;
    const rtbStatActive = calcBaseRtb > 0 || bombsGrenadesRtbMod > 0
      || marionetteRangedSlot || (ccFireBreathActive && ccOwnsThisSlot)
      || focusMagicCreatesRanged || shadowStrikeFillsSlot
      || lightningBladeConvertsThrown || lightningBladeGrantsBreath
      || (warlordCombatFlameBlade && channelKey === 'fireBreath')
      || (dragonMound && channelKey === 'fireBreath');
    const warlordCombatFlameBladeOwnsThis = warlordCombatFlameBlade
      && (channelKey ? channelKey === 'fireBreath' : thrownType === 'fire');

    return {
      slotKey: slot.slotKey, channelKey, isChannelSlot,
      strengthField: fields.strength,
      rangedTypeField: fields.rangedType,
      thrownTypeField: fields.thrownType,
      baseStrength: inputSlotRtb,
      rtbTypeRaw, gazeType,
      rangedType, thrownType, baseSequenceRangedType, baseSequenceThrownType,
      permanentRangedType, permanentThrownType,
      calcBaseRtb, hasPermanentRangedStat, rtbStatActive,
      secondaryHitKind, blazeOfGloryFillsSlot,
      marionetteRangedSlot, marionetteOwnsThisRangedSlot,
      blackpowder, blackpowderGrantsAP, blackpowderBasePoison, venom, venomBasePoison,
      blackpowderRtbMod, blackpowderFireBreathRtbMod, blackpowderUpgradesToBoulder,
      bombsGrenadesGrantsThrown,
      ccFireBreathGranted, ccFireBreathActive, ccOwnsThisSlot,
      lightningBladeGrantsBreath, lightningBladeConvertsThrown,
      alumniOfAcademy, energyCannon, energyCannonOwnsThisSlot,
      focusMagicBuffsExisting, focusMagicConvertsThrown, focusMagicConvertsRanged,
      focusMagicCreatesRanged,
      shadowStrikeFillsSlot, modernThrownField,
      rangedGetsWpn, thrownGetsWpn, supremeLightEligible,
      modernConventionalRangedChannel, modernRangedOrThrownChannel, modernNodeSecondaryChannel,
      eternalNightRtbMod, lionheartRtbMod, disciplineRtbMod, soulFlayRtbMod, plagueRtbMod,
      goblinPoxRtbMod, orihalconRtbMod, wofDefenderRtbMod, ffRtbMod,
      bombsGrenadesRtbMod, ludusAgogeRtbMod, motherFungusRtbMod, blazingMarchRtbMod,
      naturalSelectionWildGameActive, reinforceMagicRtbMod,
      altarOfTheMoonRtbMod, landLinkingBreathRtbMod, dragonMoundRtbMod, gsRtbMod,
      weaknessRtbModBinary, weaknessRtbModCas, rustRtbMod,
      hwRangedToHit, hwThrownToHit, heavenlyLightRangedToHit, heavenlyLightThrownToHit,
      rtbToHitWpnRanged, rtbToHitWpnThrown, rtbToHitWpn,
      rtbLvl, rtbWpn, upgradedExplosive, upgradedExplosiveRangedMod,
      dosGazeStrength, warlordCombatFlameBladeOwnsThis,
    };
  }

  // The `legacy` slot is the DOS engines' shared `.ranged` value and, in the modern engines,
  // the card's legacy secondary projection. It carries the record-level answer for every field
  // that is not one of the four channel strengths.
  const recordContext = buildSlotContext({
    slotKey: 'legacy', channelKey: null,
    strength: input.rtb, type: input.rtbType, baseAttacks: input.modernAttacks || null,
  });

  // The channel slots. Each of these effects is a real engine write with no existence gate, so
  // the field it writes has to exist for the write to land — `SRanged`/`SThrown`/`SFireBreath`
  // are fields of the record, not attacks the unit has to already own. Seeding the field here is
  // what lets the creating step run at its own position inside the one walk.
  const channelSlots = [];
  if (isCoM2 && input.modernAttacks) {
    const modernInputs = { ...input.modernAttacks };
    const baseModernHasRanged = !!(modernInputs.ranged && modernInputs.ranged.strength > 0);
    const baseModernHasThrown = !!(modernInputs.thrown && modernInputs.thrown.strength > 0);
    // Focus reads the calculated Thrown field but the persistent conventional-ranged field.
    // Bombs & Grenades can therefore create the branch owner in phase b even though the
    // permanent Thrown field was empty.
    const focusMagicRangedOwner = baseModernHasRanged ? 'ranged'
      : (baseModernHasThrown || bombsGrenades) ? 'thrown' : 'ranged';
    // `SThrown := SThrown + 1 + SAttack/3` (UnitCalc.CAS:1262-1266) has no existence gate, so
    // the Thrown field has to exist for the positioned grant to land on it. Seeded empty and
    // typeless, exactly as the Blaze of Glory transfer's field is: nothing before
    // `UnitCalc.CAS:1262` may see a Thrown channel the grant has not yet created, and the step
    // itself supplies the identity.
    //
    // `shadowStrikeThrown` is the second accumulator the transitional `shadowThrown` slot
    // carries (steps.js). It exists only where Focus Magic has already claimed the record's
    // Thrown field, and goes when that conversion becomes a real field move; see F90 in
    // BACKLOG.md.
    const splitConvertedThrownForShadow = shadowStrikeActive && focusMagicActive
      && baseModernHasThrown && !baseModernHasRanged;
    if (shadowStrikeActive && (!baseModernHasThrown || splitConvertedThrownForShadow)) {
      const shadowKey = splitConvertedThrownForShadow ? 'shadowStrikeThrown' : 'thrown';
      modernInputs[shadowKey] = { strength: 0, type: 'none' };
    }
    // Bombs & Grenades writes the independent Thrown field regardless of any conventional
    // ranged or Breath field already present. `SETSTAT(U,SThrown,0,…)` (UnitCalcPre.CAS:1071)
    // names the calculated record, so the field is seeded empty and typeless like the Shadow
    // Strike and Blaze of Glory fields below, and `b:bombsGrenades` supplies its identity at
    // its own position rather than the permanent record carrying a region-`b` write.
    if (bombsGrenades && !modernInputs.thrown) {
      modernInputs.thrown = { strength: 0, type: 'none' };
    }
    // Focus Magic always executes its ranged branch. Breath and gaze fields do not prevent
    // creation of ranged 3; only an existing conventional ranged or convertible Thrown does.
    if (focusMagicActive && !baseModernHasRanged && !baseModernHasThrown && !bombsGrenades
      && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: 'none' };
    }
    if ((marionetteOwned || marionetteStrayed) && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: marionette.rangedType };
    }
    // Unconditional: the grant is `firebreath += 4` whatever else the unit carries, so the
    // channel must exist even beside a gaze, a lightning breath or a thrown attack.
    if (recordContext.ccFireBreathGranted && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'none' };
    }
    // UnitCalc.CAS writes `SFireBreath := SFireBreath + 1` without an existence gate, so
    // combat-cast Flame Blade creates a strength-1 Fire Breath on a unit that had none.
    if (warlordCombatFlameBlade && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'fire' };
    }
    // CreateUnit.CAS adds 2 without an existence gate, so the building creates this channel.
    if (dragonMound && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'fire' };
    }
    if (lightningBladeAbil) {
      if (baseModernHasThrown) delete modernInputs.lightningBreath;
      else modernInputs.lightningBreath = { strength: 0, type: 'none' };
    }
    // `SThrown := SThrown + SRanged` (UnitCalc.CAS:1499) has no existence gate either, so the
    // Thrown field has to exist for the positioned transfer to land on it. It is seeded empty
    // and typeless: nothing before `UnitCalc.CAS:1490` may see a Thrown channel that the
    // transfer has not yet created, and the step itself supplies the identity.
    if (blazeOfGloryActive && !modernInputs.thrown) {
      modernInputs.thrown = { strength: 0, type: 'none' };
    }
    // `BLAZETHROWN = GetStat(U,SRanged,0)` (UnitCalc.CAS:1494-1500) reads the Ranged *field*
    // with no type or strength gate, and the region-`c` writes it carries have none either:
    // `not Ismagicalranged(U.rangedtype)` passes on a zero ranged type, so Lionheart (`:1730`),
    // Discipline at level 3 (`:1554`) and the weapon material (`:651`) all land on `SRanged`
    // even where the unit owns no ranged attack. The field therefore has to exist for the
    // transfer to have something to move — the same reason the Thrown field is seeded above.
    if (blazeOfGloryActive && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: 'none' };
    }
    for (const [key, attack] of Object.entries(modernInputs)) {
      const channelKey = key === 'shadowStrikeThrown' ? 'thrown' : key;
      const slotKey = key === 'shadowStrikeThrown' ? 'shadowThrown' : key;
      const seeded = (channelKey === 'ranged' && focusMagicActive)
        || (channelKey === 'ranged' && blazeOfGloryActive)
        || (channelKey === 'ranged' && (marionetteOwned || marionetteStrayed))
        || (channelKey === 'fireBreath' && recordContext.ccFireBreathGranted)
        || (channelKey === 'fireBreath' && warlordCombatFlameBlade)
        || (channelKey === 'fireBreath' && dragonMound)
        || (channelKey === 'lightningBreath' && lightningBladeAbil)
        || key === 'shadowStrikeThrown';
      if (!attack || (attack.strength <= 0 && channelKey !== 'thrown' && !seeded)) continue;
      channelSlots.push({
        slotKey, channelKey,
        strength: attack.strength, type: attack.type, baseAttacks: null,
        baseHasRanged: baseModernHasRanged,
        focusOwner: focusMagicRangedOwner,
        skipFocusBranch: key === 'shadowStrikeThrown',
        deferShadowStrike: splitConvertedThrownForShadow && key === 'thrown',
      });
    }
  }
  const channelContexts = channelSlots.map(buildSlotContext);
  const derivationContexts = [recordContext, ...channelContexts];
  const strengthFields = derivationContexts.map(context => context.strengthField);
  const rangedTypeFields = derivationContexts.map(context => context.rangedTypeField);
  const thrownTypeFields = derivationContexts.map(context => context.thrownTypeField);

  // Each slot reads exactly one secondary To Hit modifier. The modern channels share the three
  // the record stores — `hitchanceranged`, `hitchancethrown` and the one `hitchancebreath` that
  // serves both breath strengths (Units.RecalculateUnits.pas:203-219) — so a gated writer decides
  // each of them once, from the channel's own type rather than from whichever channel the
  // derivation happens to be for. The DOS-shaped `legacy` slot keeps its own `toHitRtb`.
  const SECONDARY_HIT_KINDS = ['ranged', 'thrown', 'breath'];
  const SECONDARY_HIT_FIELD_BY_KIND = {
    ranged: 'toHitRanged', thrown: 'toHitThrown', breath: 'toHitBreath',
  };
  const LEGACY_HIT_FIELD = 'toHitRtb';
  const hasModernChannels = channelContexts.length > 0;
  recordContext.secondaryHitField = LEGACY_HIT_FIELD;
  // `SThrown := SThrown + SRanged` (UnitCalc.CAS:1499) leaves the surviving attack in the
  // record's Thrown field, so it reads `hitchancethrown`. Where that field is free the transfer
  // moves the strength into it and `blazeOfGloryFillsSlot` already routes the target. Where it is
  // not — Lightning Blade having spent the field on `SLightningBreath`, or Focus Magic having
  // taken it into `SRanged` — the step retypes each source slot in place rather than moving the
  // strength out of it, because that conversion is still an identity flip (F90). The attack that
  // survives is `SThrown` in both shapes, so the source slot reads the Thrown threshold too.
  const blazeTransferRetypesSourceSlot = blazeOfGloryActive
    && !channelContexts.some(context => context.modernThrownField);
  for (const context of channelContexts) {
    if (blazeTransferRetypesSourceSlot
      && (context.channelKey === 'ranged' || context.rangedType !== 'none')) {
      context.secondaryHitKind = 'thrown';
    }
    context.secondaryHitField = SECONDARY_HIT_FIELD_BY_KIND[context.secondaryHitKind];
  }
  // What a writer declares is what attributes it to a channel (steps.js, STAT_CHANNEL_FIELDS),
  // so a write the engine makes for Ranged and Thrown alone names those two fields and no others.
  // The record carries all three whenever it has channels, exactly as the engine does, whether or
  // not this unit happens to own an attack of that kind.
  const secondaryHitFieldsFor = kinds => [LEGACY_HIT_FIELD,
    ...(hasModernChannels ? kinds.map(kind => SECONDARY_HIT_FIELD_BY_KIND[kind]) : [])];
  const secondaryHitFields = secondaryHitFieldsFor(SECONDARY_HIT_KINDS);
  const secondaryHitTargets = secondaryHitFields.map(field => ({
    field,
    kind: field === LEGACY_HIT_FIELD ? recordContext.secondaryHitKind
      : SECONDARY_HIT_KINDS.find(kind => SECONDARY_HIT_FIELD_BY_KIND[kind] === field),
    contexts: derivationContexts.filter(context => context.secondaryHitField === field),
  }));

  const effectiveAbilities = {
    ...abilities,
    ...(altarOfTheMoon ? { rage: true, poisonImmunity: true } : {}),
    ...(altarHunter ? { poison: 2 } : {}),
    ...(altarWitchdoctor ? { lifeSteal: -1, poison: 0 } : {}),
    ...(recordContext.blackpowderGrantsAP ? { armorPiercing: true } : {}),
    ...(blazeOfGloryActive ? { armorPiercing: true, firstStrike: false } : {}),
    ...(recordContext.blackpowder ? { poison: recordContext.blackpowderBasePoison + 1 } : {}),
    ...(recordContext.blackpowder ? { blackpowder: true } : {}),
    ...(bombsGrenades ? { wallCrusher: true } : {}),
    ...(recordContext.energyCannon ? { energyCannon: true } : {}),
    ...(motherFungus ? { poison: (abilities.poison || 0) + 1 } : {}),
    ...(recordContext.venom
      ? { poison: recordContext.venomBasePoison + 1, poisonImmunity: true } : {}),
    // Rust on a fantastic creature is inert: drop it so the -3 melee in combat_abilities.js (which
    // can't see unit type) and any downstream reads treat the unit as un-rusted.
    ...((abilities && abilities.rust && !rustActive) ? { rust: false } : {}),
    ...((abilities && (abilities.trueSight || abilities.eyeOfHeaven)) ? { illusionImmunity: true } : {}),
    unitType: unitTypeVal,
    baseRace: identity.baseRace,
    baseFantastic: identity.baseFantastic,
    liveRace: identity.race,
    liveFantastic: identity.fantastic,
    mechanical: effectiveMechanical,
    doomGaze: baseDoomGazeWithBlazingEyes,
    innerPower: innerPowerEligible ? abilities.innerPower : false,
    mislead: misleadEligible ? abilities.mislead : false,
    supernatural: ((abilities && abilities.supernatural) || destinyActive),
    supremeLight: recordContext.supremeLightEligible ? abilities.supremeLight : false,
    survivalInstinct: survivalInstinctEligible ? abilities.survivalInstinct : false,
    landLinking: landLinkingEligible ? abilities.landLinking : false,
  };
  // The ranged subformula remains an internal part of Rust's one atomic engine write; it is not
  // inserted into the execution list as a second step.
  // PROVENANCE[rust:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:10:98745d26b4fbf74694b1a932
  const rustRangedStep = statStep({ id: 'rust:ranged', phase: 'd', writes: strengthFields,
    when: () => rustActive,
    apply: u => {
      for (const context of derivationContexts) u[context.strengthField] += context.rustRtbMod;
    } });
  // One step per ability or enchantment that writes a stat, at the position its engine region
  // gives it (combat_abilities.js, getAbilityStatSteps). Partitioned by phase in one pass so each group
  // can be spliced into the sequence below where that region runs.
  const abilSteps = getAbilityStatSteps(effectiveAbilities, version, {
    baseFantastic: identity.baseFantastic,
    liveFantastic: identity.fantastic,
    combatSummoned: !!effectiveAbilities.combatSummoned,
    strengthFields,
  }).map(step => {
    if (step.id !== 'rust') return step;
    const legacyApply = step.apply;
    return {
      ...step,
      writes: ['atk', ...strengthFields, ...thrownTypeFields],
      when: () => rustActive,
      apply: (u, context) => {
        legacyApply(u, context);
        rustRangedStep.apply(u, context);
        // `SETSTAT(U,SThrown,0,0)` empties the Thrown *strength*; the type clear beside it is
        // this model's stand-in for the field being empty, since Warlord stores no Thrown type.
        // The strength write is load-bearing rather than cosmetic: Blaze of Glory's positioned
        // transfer adds the Ranged field onto whatever stands in Thrown at `UnitCalc.CAS:1490`,
        // and Rust (`:493`) runs first.
        for (const slot of derivationContexts) {
          if (u[slot.thrownTypeField] !== 'thrown') continue;
          u[slot.thrownTypeField] = 'none';
          u[slot.strengthField] = 0;
        }
      },
    };
  });
  // `cAfterWarp` is a second splice point inside region c, for the effects the engine writes
  // after its Warp Creature block — Tactician in every CoM engine, plus Supreme Light in CoM 1.
  const abilByPhase = {
    base: [], a: [], b: [], cBeforeHolyArmor: [], c: [], cAfterWarp: [], d: [], e: [],
  };
  for (const step of abilSteps) {
    const group = step.afterWarp ? 'cAfterWarp'
      : (step.beforeHolyArmor ? 'cBeforeHolyArmor' : step.phase);
    abilByPhase[group].push(step);
  }

  // The two gaze strengths live in the same `.ranged` slot as the DOS `rtb` value, so they are
  // fields of the same record and are written by the same steps — with the narrower set of
  // modifiers a gaze takes: the ability lump, node aura, Darkness/True Light, Chaos Surge and
  // their own level ladder, but no weapon, no per-attack-type ranged bonus, and no Shatter.
  const baseGazeRanged = gazeDisabled ? 0 : recordContext.dosGazeStrength;
  // DOS type 104 uses the shared strength as Doom Gaze damage. The modern engines instead
  // carry an independent Doom Gaze field.
  const baseDoomGaze = gazeDisabled ? 0
    : (!isCoM2 && recordContext.gazeType === 'gaze_multiple'
      ? recordContext.calcBaseRtb : (effectiveAbilities.doomGaze || 0));
  const focusMagicDoomGazeMod = recordContext.focusMagicBuffsExisting && isCoM2 ? 3 : 0;
  const alumniOfAcademy = recordContext.alumniOfAcademy;
  const energyCannon = recordContext.energyCannon;
  const calcBaseRtb = recordContext.calcBaseRtb;
  const rtbStatActive = recordContext.rtbStatActive;
  const hasPermanentRangedStat = recordContext.hasPermanentRangedStat;
  const rangedGetsWpn = recordContext.rangedGetsWpn;
  const supremeLightEligible = recordContext.supremeLightEligible;
  const rtbToHitWpn = recordContext.rtbToHitWpn;
  const existingLifeSteal = effectiveAbilities.lifeSteal;

  // --- Steps spliced into the sequence (R1) at more than one position ---
  // Built here rather than in stats_sequence.js because each reads the locals above; the
  // sequence itself, and what its ordering means, is stats_sequence.js.
  // DOS applies material strength and chance before BU_Apply_Specials (and therefore before
  // CoM 1 Focus Magic). Modern Caster calls ApplyMagicWeapons later in region c. Reuse the same
  // atomic steps at those two version-exclusive splice points.
  //
  // `chance:weapon` and the two To Hit tails below decide each secondary modifier from the
  // channel that reads it: Units.RecalculateUnits.pas:639-662 gates `hitchanceranged` on the
  // current `rangedtype` and `hitchancethrown` on the current Thrown field, and :1451-1454 /
  // :1806-1809 do the same for Heavenly Light's material tail and Holy Weapon. Breath is
  // untouched by all three.
  let appliedRtbToHitWpn = 0;
  const weaponHitWrite = (u, target) => {
    for (const context of target.contexts) {
      if (!isCoM2) {
        if (context.rtbToHitWpn !== 0) return context.rtbToHitWpn;
        continue;
      }
      if (context.thrownGetsWpn && !(u[context.strengthField] > 0)) continue;
      const value = target.kind === 'thrown' ? context.rtbToHitWpnThrown
        : target.kind === 'ranged' ? context.rtbToHitWpnRanged : 0;
      if (value !== 0) return value;
    }
    return 0;
  };
  // PROVENANCE[weapon]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:40:bc81a9f3b6ba3703d596d756 | Reference docs/DOS reconstructed/unitcalc.c@span:15:9b957c6ff1d6ae8d9afca04b | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:40:eae87788c081c49037f75656 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:2cc8f80e45e1482ee9229fd8 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:06ea8c358024e0163de78588 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
  // Both engines gate the whole material block on the material itself: `if EncMagic or
  // EncMithril or EncAdamant` at $00598D91, and `if (quality > 0)` over
  // `mutations & UM_WEAPON_QUALITY_MASK` in every DOS build. Everything inside is the
  // material's own magnitude, so a normal weapon is a block neither engine enters.
  const hasWeaponMaterial = weapon === 'magic' || weapon === 'mithril' || weapon === 'adamantium';
  const weaponStatSteps = [
    statStep({ id: 'weapon', phase: 'c', writes: ['def', 'atk', ...strengthFields],
      when: () => hasWeaponMaterial,
      apply: u => {
        u.def += wpn.def; u.atk += wpn.atk;
        for (const context of derivationContexts) u[context.strengthField] += context.rtbWpn;
      } }),
    // One To-Hit write. The halves keep separate gates because the engine's are separate — melee
    // on a positive melee attack, each secondary slot on its own material write — so they fold
    // into the `apply`. `weaponHitWrite` reads only strength fields, which the melee half does
    // not touch, so evaluating both gates at this one position is what the two steps did.
    // PROVENANCE[chance:weapon]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:c4c0e22bb79483f8e5729dfb | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:40:8365c7617ed27a3bba5164a3 | Reference docs/DOS reconstructed/unitcalc.c@span:34:beda653e161112c68e8cdff3 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:444355c621ef17cc85a05318 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:38:55a524751c4be78ffea17562 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
    statStep({ id: 'chance:weapon', sourceId: 'weapon', sourceLabel: 'Weapon material',
      phase: 'c', writes: ['toHitMelee', ...secondaryHitFieldsFor(['ranged', 'thrown'])],
      when: u => hasWeaponMaterial
        && ((wpn.toHit !== 0 && (isCoM2 ? inputBaseAtk > 0 : u.atk - wpn.atk > 0))
          || secondaryHitTargets.some(target => weaponHitWrite(u, target) !== 0)),
      apply: u => {
        if (wpn.toHit !== 0 && (isCoM2 ? inputBaseAtk > 0 : u.atk - wpn.atk > 0)) {
          u.toHitMelee += wpn.toHit;
        }
        for (const target of secondaryHitTargets) {
          const value = weaponHitWrite(u, target);
          if (value === 0) continue;
          u[target.field] += value;
          if (target.field === recordContext.secondaryHitField) appliedRtbToHitWpn = rtbToHitWpn;
        }
      } }),
  ];

  // CoM 1's Flame Blade write precedes its later Focus Magic conversion/minimum; the other
  // versions keep the established compiled position after it. That version difference is the
  // step's own position in each chain (`stats_manifests.js`), so the gate reads the record's
  // live type pair here rather than a version-selected copy of an earlier one.
  //
  // M4, resolved at R1 stage 9. The two sources fall in different regions — Fiery Fury in `b`
  // (UnitCalcPre.CAS:832-846), the blades in `c` — and do not stack, which the bucket model
  // could only express as a single `Math.max` booked whole to `c`. Two steps carry it now:
  // Fiery Fury writes its own bonus in `b`, and this step adds only the excess, so the total is
  // still the maximum of the two while each lands in its own region. `ffRtbMod` is the amount
  // region `b` actually wrote, which is what the excess has to be measured against.
  // PROVENANCE[flameBlade:ranged]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:15:f6e8770f05c1d997df898eec | Reference docs/DOS reconstructed/unitcalc.c@span:13:bf6a11bc7e2e0a1492be8f9a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:98daf6b1cfd836c4a184f151 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:3:a6c1282e7bba499b7b5ef5f3 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:d7cdec7c168e641613b36c19
  const flameBladeRangedStep = statStep({
    id: 'flameBlade:ranged', phase: 'c', writes: strengthFields,
    when: () => hasWarlordBlade || fbAtkBonus > 0,
    apply: u => {
      for (const context of derivationContexts) {
        const liveRangedType = u[context.rangedTypeField];
        const liveThrownType = u[context.thrownTypeField];
        let bladeRtb = 0;
        if (hasWarlordBlade) {
          if (liveRangedType === 'missile' || liveThrownType === 'thrown') bladeRtb = 2;
        } else if (fbAtkBonus > 0) {
          // MoM Flame Blade / Metal Fires boost missile and thrown; CoM Flame Blade
          // boosts missile only (the CoM helptext drops the thrown bonus — Warlord, handled
          // above, re-adds it). Metal Fires is MoM-only so the CoM gate only affects Flame Blade.
          const fbThrownEligible = !(nonWarlordFlameBlade && isCoMVersion);
          if (liveRangedType === 'missile' || (fbThrownEligible && liveThrownType === 'thrown')) {
            bladeRtb = fbAtkBonus;
          }
        }
        u[context.strengthField] += Math.max(0, bladeRtb - context.ffRtbMod);
      }
    },
  });

  // Warlord True Light is its own UnitCalcPre.CAS block (:1507-1540), after Rally and before
  // Plague. The DOS builds execute their distinct True Light block after Prayer and before
  // Darkness in region c. Keep both as one atomic multi-field write at their engine phase.
  // PROVENANCE[trueLight]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:30:307377331fcb02be6a7a1275
  const makeTrueLightStep = phase => statStep({
    id: 'trueLight', sourceId: 'trueLight', sourceLabel: 'True Light', phase,
    writes: ['res', 'def', 'atk', ...strengthFields, 'gaze', 'doomGaze', 'toHit'],
    when: () => hasTrueLight,
    apply: u => {
      u.res += trueLightResBonus; u.def += trueLightDefBonus;
      u.atk += trueLightAtkBonus;
      for (const context of derivationContexts) {
        if (!isCoM2 || context.modernConventionalRangedChannel) {
          u[context.strengthField] += trueLightAtkBonus;
        }
      }
      if (!isCoM2) {
        u.gaze += trueLightAtkBonus; u.doomGaze += trueLightAtkBonus;
      }
      if (isWarlord && !!abilities.illusion) u.toHit -= 10;
    },
  });
  const warlordTrueLightStep = makeTrueLightStep('b');
  const dosTrueLightStep = makeTrueLightStep('c');

  // The phase sections live in stats_sequence.js, cut at the region boundaries. Every value
  // they read is handed over explicitly, so a section states its own inputs instead of
  // depending on everything this function happens to have in scope.
  const rawStatSteps = buildRawStatSteps({
    abilByPhase, abilities, altarOfTheMoon,
    altarOfTheSun, altarOfTheSunHolyMother, armor, badMoonActive, baseDoomGaze, baseGazeRanged,
    baseToBlkMod, baseToHitMod, baseToHitRtbMod,
    blazeOfGloryActive, bombsGrenades,
    calcBaseAtk, calcBaseDef, calcBaseHP, calcBaseRes,
    ccFireBreathStrength, ccIndependentChannels,
    chaosSurgeCount, chaosSurgeMeleeBonus, chaosSurgeResBonus,
    chaosSurgeRtbBonus, charmOfLifeActive,
    channels: derivationContexts, recordContext, strengthFields, rangedTypeFields,
    thrownTypeFields, secondaryHitTargets, secondaryHitFields, secondaryHitFieldsFor,
    classicBerserk, colossalScaled, colossalStrength, com1DivineBarrierAura,
    com1GuidingBeaconAura, com1SoulLinkerAura, darkForceActive, darknessAtkBonus,
    darknessDefBonus, darknessResBonus, destinyActive, disciplineActive, disciplineAtkMod,
    disciplineDefMod, doomGazeLvlMod, dosTrueLightStep, dragonMound,
    enduranceActive, enduranceDefMod, enduranceHpMod, energyCannon,
    eternalNightEnemyResPenalty, ffMeleeBonus, ffRegularBonus,
    flameBladeRangedStep, focusMagicActive,
    focusMagicDoomGazeMod, gazeLvlMod, gazeWarpHalves, goblinPoxAtkMod,
    goblinPoxDefMod, goblinPoxResMod, godsPlayDicesResMod, goodMoonActive,
    greatUnbindingActive, hasDarkness, hasMeleeAttack,
    hasPermanentRangedStat, heavenlyLightActive, heavenlyLightMeleeToHit,
    heavenlyLightThrownToHit,
    holyArmorActive, hurricaneActive, hwMeleeToHit, identity,
    input, inputBaseAtk,
    isCoM1, isCoM2, isCoMVersion, isWarlord, landLinkingEligible, level, levelRank,
    lionheartHpMod,
    ludusAgoge, lvl,
    marionette, marionetteAttackBonus, marionetteDefenseBonus, marionetteOwned,
    marionetteStrayed,
    modernNodeBaseMelee, motherFungus,
    naturalSelectionCoal, naturalSelectionIron, naturalSelectionNightshade,
    naturalSelectionNightshadeCount, naturalSelectionPowerMinerals,
    naturalSelectionPowerMineralsCount,
    natureConjunctionActive, natureLinkActive, nodeAuraActive,
    orihalconActive, outlanderRtbToHitBonus, pillarOfFaith, pillarOfFaithCount, plagueActive,
    pneumaFieldActive, poolOfRepentance, poxHostActive, psychoForceActive,
    realmWardActive, rtbStatActive, sanctaBasilica,
    soulFlayActive, soulFlayAtkMod, soulFlayDefMod, soulFlayResMod,
    spellWardActive, supremeLightEligible,
    survivalInstinctToBlkBonus, trueSightRangedToHitBonus, unitIsChaos, unitTypeVal,
    uphillBattleActive, vampirismActive,
    version, vertigoActive, vertigoBlockPenalty, vertigoHitPenalty, warlordBerserk,
    warlordCombatFlameBlade, warlordEternalNightActive, warlordTrueLightStep,
    warpRealityActive, weaknessActive, weaponStatSteps, wofDefenderBonusActive,
  });
  // The raw assembly intentionally keeps the implementation fragments close to their formulas.
  // F20 performs one explicit manifest walk here so the executed list is source ordered, every
  // emitted b/c/d step is covered once, and each returned step carries its source position.
  // The canonical version scope (steps.js, STEP_VERSION_SCOPES) is applied first, for every
  // phase alike: this version's sequence is the writes this version's engine makes. That
  // subsumes the Warlord-hook filter this line used to carry — UnitCalcPre/UnitCalc steps are
  // scoped to Warlord, so the DOS and base-CoM2 sequences drop them along with every other
  // region's out-of-scope write.
  const applicableRawStatSteps = filterStepsToVersionScope(rawStatSteps, version);
  const statSteps = orderStatStepsBySource(applicableRawStatSteps, statChain(version));
  // `slots` carries the source-specific attack gates. `melee`, `rtb`, and `ranged` retain the
  // calculated-channel semantics shared by ordinary ability steps. `persistentRanged` is the
  // aura pass's `B.ranged > 0` (Units.RecalculateUnits.pas:2535, :2599): the **permanent**
  // record's Ranged field carrying strength, with no test of what type stands in it and none of
  // what the calculated record now holds. Which slot that field is, is record structure — the
  // modern `ranged` channel is `SRanged`; the DOS-shaped shared slot is the Ranged field only
  // while its permanent type is a conventional ranged one, since one value stands there for
  // ranged, Thrown, Breath or a gaze. `hasPermanentRangedStat` keeps its own narrower job: the
  // `CreateUnit.CAS` city gates, which do read a permanent ranged *type*.
  //
  // `rtb` is the DOS engines' shared `.ranged` slot; `ranged` is `Caster.exe`'s narrower
  // `unitT.ranged` field, which excludes Thrown, both breaths and the two gazes. Each
  // derivation slot carries its own copy, so one write reaches every field the engine writes.
  //
  // `lifeSteal` is on the record because Pneuma Field's `SETSTAT(U,AFLifeSteal,…)` is a write to
  // a unit field at a position, like any other. It is seeded from the effective ability set —
  // the Gnoll Witchdoctor altar grant included — since that is the value standing at region `d`.
  // Identity writes are calculated unit-stat outputs, not UI-control writes. Seed the ordered
  // stat trace with those applied live-field changes so the affected race/fantastic outputs have
  // one trace alongside the numeric stat sequence; no-op identity steps were already omitted by
  // runStatSteps.
  for (const context of derivationContexts) {
    context.slots = {
      melee: hasMeleeAttack, rtb: context.rtbStatActive,
      ranged: context.rtbStatActive && context.rangedType !== 'none',
      // The dead-slot rule's one source-backed exception here: `Dec(U.thrown, 5)` has no
      // positivity gate (Units.RecalculateUnits.pas:2281-2295), so it reaches the record's
      // Thrown field while that field still stands empty.
      rangedOrThrown: context.modernRangedOrThrownChannel
        && (context.rtbStatActive || context.modernThrownField),
      persistentRanged: context.isChannelSlot
        ? (context.channelKey === 'ranged' && context.baseStrength > 0)
        : context.hasPermanentRangedStat,
      gaze: baseGazeRanged > 0, doomGaze: baseDoomGaze > 0,
    };
  }
  const statTrace = [...identityConversion.trace, ...basePreparationTrace];
  for (let traceOrder = 0; traceOrder < statTrace.length; traceOrder++) {
    statTrace[traceOrder].traceOrder = traceOrder;
  }
  const statExecutionLedger = createStatExecutionTraceLedger();
  const statRecord = { res: 0, def: 0, atk: 0, hp: 0, gaze: 0, doomGaze: 0,
    toHit: 30, toHitMelee: 0, toBlk: 30, energyCannonToHit: null,
    lifeSteal: existingLifeSteal };
  for (const context of derivationContexts) {
    statRecord[context.strengthField] = 0;
    statRecord[context.rangedTypeField] = 'none';
    statRecord[context.thrownTypeField] = 'none';
  }
  // Two record shapes: the modern engines separate Ranged, Thrown and Breath modifiers,
  // the DOS engines keep one shared secondary slot. See `secondaryHitTargets` above.
  for (const field of secondaryHitFields) statRecord[field] = 0;
  const statUnit = runStatSteps(statSteps, statRecord,
    { version,
      trace: statTrace,
      executionTrace: statExecutionLedger,
      assertExecutionTraceOrder: true,
      channels: derivationContexts,
      slots: recordContext.slots });
  const hp = statUnit.hp;
  const effectiveGazeRanged = statUnit.gaze;
  const effectiveDoomGaze = statUnit.doomGaze;
  const finalRangedType = statUnit[recordContext.rangedTypeField];
  const finalThrownType = statUnit[recordContext.thrownTypeField];
  // Psycho Force and Pneuma Field are steps in `d` (see the sequence above), so their reads of
  // Resistance happen where the engine takes them. Warp Resist having zeroed Resistance is
  // supplied by construction, since `warpResist` is a step in `c`.
  const pneumaAbilities = pneumaFieldActive
    ? { ...effectiveAbilities, lifeSteal: statUnit.lifeSteal }
    : effectiveAbilities;
  const combatAbilitiesBase = combatDisciplineNegatesFirstStrike
    ? { ...pneumaAbilities, negateFirstStrike: true }
    : pneumaAbilities;
  const shapedGazeAbilities = !isCoM2 && baseDoomGaze > 0
    ? { ...combatAbilitiesBase, doomGaze: effectiveDoomGaze }
    : combatAbilitiesBase;
  let combatAbilities = gazeDisabled
    ? { ...shapedGazeAbilities, stoningGaze: null, deathGaze: null, doomGaze: 0 }
    : shapedGazeAbilities;
  // Rust eliminates Large Shield for the rest of combat.
  if (rustActive && combatAbilities.largeShield) {
    combatAbilities = { ...combatAbilities, largeShield: false };
  }

  // Hierophany (Warlord Life uncommon combat curse): the landed curse strips the target's
  // immunities, Lightning Resist, Negate First Strike, Merging, and Teleporting. The latter two
  // are combat-damage-relevant because FirewallEffect reads their calculated values. The
  // half-Defense penalty is applied in the ordered record above. The calculator models only the
  // landed outcome, so the strip is unconditional when active.
  combatAbilities = applyHierophanyAbilityStrip(combatAbilities, isWarlord);

  // Compatibility breakdowns retained for the card. The authoritative values now come
  // directly from the ordered record above.
  const meleeToHitBonus = statUnit.toHit + statUnit.toHitMelee - 30 - baseToHitMod;

  // Caster.exe does not clamp defendchance during recalculation; Random(100) threshold
  // comparison naturally bounds the effective probability to 0..100.
  let toBlock = Math.max(0, Math.min(1, statUnit.toBlk / 100));
  if (energyCannon) {
    // UnitCalc.CAS:1435-1443 reads the unit's To-Hit + Ranged To-Hit
    // stats, capped at 100. Attack-distance and battlefield penalties are
    // applied later and do not change the permanent Destruction modifier.
    const destructionPenalty = Math.trunc(statUnit.energyCannonToHit / 15);
    // UnitCalc.CAS reads and writes AFDestruction record 3 (ranged). Keep that value
    // separate from a unit's general Destruction so melee and Thrown do not inherit the
    // Energy Cannon rider when combat normalization merges phase-specific flag records.
    const currentDestruction = combatAbilities.energyCannonDestruction;
    const energyDestruction = currentDestruction != null && currentDestruction <= 0
      ? currentDestruction - destructionPenalty
      : -destructionPenalty;
    combatAbilities = { ...combatAbilities, energyCannonDestruction: energyDestruction };
  }
  // Immolation To Hit: always base 30%, ignoring all modifiers (it's a spell attack)
  let toHitImmolation = 0.3;

  // Warp Reality also affects Immolation's separate spell-attack chance. Common unit To Hit
  // is already written on the ordered stat record above.
  if (warpRealityActive && !unitIsChaos) {
    toHitImmolation = Math.max(0.1, toHitImmolation - 0.2);
  }

  // Hurricane (Warlord Nature rare, global): tropical storm affecting both sides.
  // -20% To Hit for ranged/thrown attacks, -30% To Hit for breath attacks.
  // The persistent Hurricane channel write is already on the ordered stat record.

  // Warlord True Light: illusion attacks suffer -10% To Hit, for all units
  // regardless of realm (this clause is Warlord-only; not present in MoM).
  // The persistent True Light common write is already on the ordered stat record.

  // Vertigo: reflect the displayed penalty in the red To Hit / To Block numbers.
  // MoM:  -20% To Hit, -1 Defense (the defense die penalty is applied at `displayDef`).
  // CoM 1: -30% To Hit, -10% To Block.
  // CoM2/Warlord: -25% To Hit, -7% To Block — the compiled block reads -25/-7
  // (`Reference docs/Caster binary/CoM2 binary analysis.md`), not CoM 1's -30/-10.
  // The persistent Vertigo chance writes are already on the ordered stat record.

  // Every persistent stat and chance total is the ordered record's output. The remaining
  // chance work below is limited to later per-attack resolution modifiers.
  const finalAtk = statUnit.atk;
  const finalDef = statUnit.def;
  const finalRtb = statUnit[recordContext.strengthField];
  const finalRes = statUnit.res;
  // Berserk's persistent chance writes are already on the ordered stat record.

  // Conjuring Pact nausea (Warlord Conjurer retort): a non-fantastic unit struck by
  // Conjuring Pact suffers -10% To Hit and -10% To Defend for the rest of combat.
  // Only the normal-unit debuff is modelled here (the fantastic-creature taming
  // branch is out of scope), so gate to Warlord and to normal units.
  // Nausea's persistent chance writes are already on the ordered stat record.

  // Plague (Warlord combat curse): −10% To-Hit on the cursed unit (the −3/−3/−6 stat
  // penalties are folded into atk/def/res above). Goblin Pox carries no To-Hit penalty.
  // Plague's persistent common chance write is already on the ordered stat record.

  // Great Unbinding (Warlord Sorcery very rare global): −20% To-Hit and −20% To-Defend
  // on opponent fantastic creatures for the rest of battle (the −2 Resistance is folded
  // into res above). Only fantastic creatures are affected.
  // Great Unbinding's persistent common chance writes are already on the ordered record.

  const displayDef = (vertigoActive && !isCoMVersion) ? Math.max(0, finalDef - 1) : finalDef;

  // Chance trace. To Hit and To Block already execute on the authoritative ordered `statSteps`
  // record. Project those recorded deltas into a percentage-point resolution trace so every
  // displayed write keeps its source and running before/after value. One field per quantity:
  // the trace and the resolver read the same number, because nothing between recalculation and
  // the roll changes one without the other. One projection per derivation slot: each reads the
  // secondary modifier its own channel reads, which is what lets a single walk answer for the
  // legacy slot and every modern channel alike.
  const chanceFields = { melee: 'toHitMelee', rtb: 'toHitRtb', block: 'toBlock' };
  const allHitFields = [chanceFields.melee, chanceFields.rtb];
  // Distance penalty (attacker ranged only). This is a resolution-time projection, not a
  // recalculation write, so it reads the **finished** record: the projectile type standing in
  // this slot's Ranged field after the whole sequence has run, rather than the value the
  // precomputed pass left behind at `c:focusMagic`. Only the post-`c:focusMagic` type writes can
  // separate the two, and Warlord's `d:blazeOfGlory` is the one that does: it empties the Ranged
  // field and moves its strength onto Thrown (`UnitCalc.CAS:1494-1500`), so the surviving attack
  // is Thrown, fires in the melee engagement, and has no range to be penalised for.
  // This is a *type* read, not the field-identity question `isRangedFieldSlot` answers: the curve
  // itself differs between missile and boulder, and a Ranged field standing typeless is a field
  // with no projectile, so both tests have to come from the same finished type.
  const distancePenaltyFor = context => {
    if (prefix !== 'a' || !input.rangedCheck) return 0;
    const finishedRangedType = statUnit[context.rangedTypeField];
    if (finishedRangedType !== 'missile' && finishedRangedType !== 'boulder') return 0;
    const dist = Math.max(1, parseInt(input.rangedDist) || 1);
    return distancePenalty(dist, finishedRangedType, !!(abilities && abilities.longRange), version,
      isHero);
  };

  function buildChanceProjection(context) {
    const chanceTrace = [];
    const chanceContributions = [];
    let chanceSerial = 0;
    function addChanceContribution(id, source, phase, order, deltas, projectionOf) {
      if (!Object.values(deltas).some(value => value !== 0)) return;
      chanceContributions.push({
        id, source, phase, order, deltas, projectionOf, serial: chanceSerial++,
      });
    }
    function addChanceDelta(id, source, phase, order, fields, value) {
      const deltas = {};
      for (const field of fields) deltas[field] = value;
      addChanceContribution(id, source, phase, order, deltas);
    }

    for (const event of statTrace) {
      const deltas = {};
      const commonHitDelta = event.changes.toHit ? event.changes.toHit.delta : 0;
      const meleeHitDelta = commonHitDelta
        + (event.changes.toHitMelee ? event.changes.toHitMelee.delta : 0);
      const rtbHitDelta = commonHitDelta
        + (event.changes[context.secondaryHitField]
          ? event.changes[context.secondaryHitField].delta : 0);
      deltas[chanceFields.melee] = meleeHitDelta;
      deltas[chanceFields.rtb] = rtbHitDelta;
      if (event.changes.toBlk) deltas[chanceFields.block] = event.changes.toBlk.delta;
      const projectedId = event.id === 'trueLight' ? 'chance:trueLightIllusion'
        : event.id.startsWith('chance:') ? event.id : `chance:${event.id}`;
      // Every entry produced here re-presents a stat write, so it carries that write's canonical
      // scope key rather than claiming one of its own (steps.js, `projectionOf`).
      addChanceContribution(projectedId,
        event.source, event.phase, event.order, deltas, `${event.phase}:${event.id}`);
    }
    // PROVENANCE[chance:distancePenalty]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:28:4d6d2024c9551eae456f2bbf | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:21:b13db6265b2feaabf81fb261 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:6:791acb631b8f903c2812da35 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:6:791acb631b8f903c2812da35
    addChanceDelta('chance:distancePenalty', { id: 'distancePenalty', label: 'Range distance' },
      'attackSpecific', -100, [chanceFields.rtb], distancePenaltyFor(context));

    // Contribution order is the order the writes execute, in every version. A projection
    // re-presents the ordered ledger; it does not re-sequence it.
    // STAT-FORMULA[chance:dynamicProjection]
    // PROVENANCE[chance:dynamicProjection]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:8afd898f274ed76b7474ccfc | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:5d84b2c3857f747269473386 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:013e80fc5cd1dea733651726
    const chanceSteps = chanceContributions.map(item => statStep({
      id: item.id, sourceId: item.source.id, sourceLabel: item.source.label,
      phase: item.phase, writes: Object.keys(item.deltas),
      ...(item.projectionOf ? { projectionOf: item.projectionOf } : {}),
      apply: u => {
        for (const [field, value] of Object.entries(item.deltas)) u[field] += value;
      },
    }));
    chanceSteps.push(
      // AttackRoll floors To Hit at 10, then compares Random(100) directly with the supplied
      // threshold. The late aura pass can raise the already-clamped record above 100, and range
      // penalties are applied after recalculation, so project the actual comparison boundary here.
      // PROVENANCE[chance:attackRollProbabilityBound]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:9:a1152c71125049b18e8745a4
      statStep({ id: 'chance:attackRollProbabilityBound', sourceId: 'attackRoll',
        sourceLabel: 'Attack-roll threshold', phase: 'attackSpecific', writes: allHitFields,
        when: () => isCoM2, apply: u => {
          for (const field of allHitFields) u[field] = Math.max(10, Math.min(100, u[field]));
        } }),
      // DefenseRoll compares Random(100), whose output is 0..99, directly against the
      // signed record value. Project that comparison to the calculator's To-Block probability
      // without pretending Caster.exe wrote a region-e To-Defend clamp.
      // PROVENANCE[chance:toBlockProbabilityBound]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:12:08b392da258c1aa5831668e7
      statStep({ id: 'chance:toBlockProbabilityBound', sourceId: 'defenseRoll',
        sourceLabel: 'Defense-roll threshold', phase: 'attackSpecific', writes: [chanceFields.block],
        when: () => isCoM2, apply: u => {
          u[chanceFields.block] = Math.max(0, Math.min(100, u[chanceFields.block]));
        } }),
    );
    // Most of this sequence is projected from the stat ledger, so its entries inherit their
    // canonical scope from the step they project (steps.js, resolveStepVersionScope).
    const chanceUnit = runStatSteps(filterStepsToVersionScope(chanceSteps, version), {
      toHitMelee: 30, toHitRtb: 30, toBlock: 30,
    }, { version, trace: chanceTrace });
    return { chanceTrace, chanceUnit };
  }

  const recordChance = buildChanceProjection(recordContext);
  const chanceTrace = recordChance.chanceTrace;
  const chanceUnit = recordChance.chanceUnit;
  const rtbDistPenalty = distancePenaltyFor(recordContext);
  // These assignments make the traced execution path authoritative.  Focused tests assert
  // parity with the existing formulas across the full preset suite.
  const toHitMelee = chanceUnit.toHitMelee / 100;
  const toHitRtb = chanceUnit.toHitRtb / 100;
  toBlock = Math.max(0, Math.min(1, chanceUnit.toBlock / 100));

  const figureTrace = [];
  const figureSteps = [
    // PROVENANCE[altarOfTheSun:figures]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:12:08e36e60187df8bc650c42c7
    statStep({ id: 'altarOfTheSun:figures', sourceId: 'altarOfTheSun',
      sourceLabel: 'Altar of the Sun', phase: 'base', writes: ['figs'],
      when: () => altarOfTheSun, apply: u => { u.figs += 1; } }),
    // PROVENANCE[alumniOfAcademy:figures]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:10:848b52c34c24d8642625dae6 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:18:55478fbb88ad8926f0ce7c78
    statStep({ id: 'alumniOfAcademy:figures', sourceId: 'alumniOfAcademy',
      sourceLabel: 'Academy', phase: 'base', writes: ['figs'],
      when: () => alumniOfAcademy, apply: u => { u.figs += 2; } }),
  ];
  const figureUnit = runStatSteps(
    orderStatStepsBySource(filterStepsToVersionScope(figureSteps, version), statChain(version)),
    { figs: baseFigs }, { version, trace: figureTrace });

  const modifierTraces = {
    figures: projectStatTrace(figureTrace, 'figs', baseFigs, figureUnit.figs),
    melee: projectStatTrace(statTrace, 'atk', inputBaseAtk, finalAtk),
    sharedAttack: projectStatTrace(projectTraceToSlot(statTrace, 'legacy'),
      recordContext.strengthField, recordContext.baseStrength, finalRtb),
    defense: projectStatTrace(statTrace, 'def', inputBaseDef, displayDef),
    resistance: projectStatTrace(statTrace, 'res', inputBaseRes, finalRes),
    hits: projectStatTrace(statTrace, 'hp', inputBaseHP, hp),
    gaze: projectStatTrace(statTrace, 'gaze', baseGazeRanged, effectiveGazeRanged),
    doomGaze: projectStatTrace(statTrace, 'doomGaze', baseDoomGaze, effectiveDoomGaze),
    toHitMelee: projectStatTrace(chanceTrace, chanceFields.melee, 30,
      chanceUnit.toHitMelee, { unit: 'percent' }),
    toHitRanged: projectStatTrace(chanceTrace, chanceFields.rtb, 30,
      chanceUnit.toHitRtb, { unit: 'percent' }),
    toBlock: projectStatTrace(chanceTrace, chanceFields.block, 30,
      chanceUnit.toBlock, { unit: 'percent' }),
    race: projectStatTrace(identityConversion.trace, 'race', identity.baseRace, identity.race),
    fantastic: projectStatTrace(identityConversion.trace, 'fantastic',
      identity.baseFantastic, identity.fantastic),
    modernAttacks: {},
  };
  appendProjectedTraceEntry(modifierTraces.defense, {
    id: 'displayDefense:vertigo', sourceId: 'vertigo', sourceLabel: 'Vertigo',
    phase: 'attackSpecific', order: 0,
  }, finalDef, displayDef);

  const toHitMeleeHasModifiers = modifierTraces.toHitMelee.entries.length > 0;
  const toHitRtbHasModifiers = modifierTraces.toHitRanged.entries.length > 0;
  const toBlockHasModifiers = modifierTraces.toBlock.entries.length > 0;

  const totalDamage = Math.max(0, parseInt(input.dmg) || 0);
  const carriesHealingState = true;
  const irrecoverableDamage = carriesHealingState
    ? Math.min(totalDamage, Math.max(0, parseInt(input.irrecoverableDamage) || 0)) : 0;
  const undeadDamage = carriesHealingState
    ? Math.min(totalDamage - irrecoverableDamage,
      Math.max(0, parseInt(input.undeadDamage) || 0)) : 0;
  const extraHitsCap = version === 'com_6.08' || version.startsWith('com2_') ? 90 : 255;
  const baseBonusHp = carriesHealingState
    ? Math.min(extraHitsCap, Math.max(0, parseInt(input.baseBonusHp) || 0)) : 0;
  const carriesModernHealingState = version.startsWith('com2_');
  const noHealing = carriesModernHealingState && (!!input.noHealing
    || hasAbil(combatAbilities, 'undead')
    || hasAbil(combatAbilities, 'animated')
    || hasAbil(combatAbilities, 'mysticSurge'));

  const result = {
    // Base values (for display)
    baseAtk: inputBaseAtk, baseRtb: inputBaseRtb, baseDef: inputBaseDef, baseRes: inputBaseRes, baseHP: inputBaseHP,
    baseToHitMod, baseToHitRtbMod, baseToBlkMod,
    // Bonus breakdown (for display)
    atkBonus: finalAtk - inputBaseAtk,
    rtbBonus: finalRtb - inputBaseRtb,
    defBonus: displayDef - inputBaseDef,
    resBonus: finalRes - inputBaseRes,
    hpBonus: hp - inputBaseHP,
    meleeToHitBonus,
    rtbToHitWpnBonus: appliedRtbToHitWpn,
    rtbToHitLvlBonus: lvl.toHit,
    rtbDistPenalty,
    toHitMeleeHasModifiers,
    toHitRtbHasModifiers,
    toBlockHasModifiers,
    // Effective values (for calculation)
    figs: figureUnit.figs,
    atk: finalAtk, def: finalDef, res: finalRes, hp, rtb: finalRtb, effectiveGazeRanged, effectiveDoomGaze, baseGazeRanged, baseDoomGaze, weapon: effectiveWeapon, unitType: unitTypeVal, isHero, generic: !!input.generic,
    encMagic: modernEncMagic,
    encMagicIndependentOfMaterial: modernEncMagicIndependentOfMaterial,
    baseDeathImmunity,
    identity,
    identityTrace: identityConversion.trace,
    statTrace,
    modifierTraces,
    dmg: totalDamage,
    totalDamage,
    irrecoverableDamage,
    undeadDamage,
    baseBonusHp,
    noHealing,
    rangedType: finalRangedType, thrownType: finalThrownType,
    rangedGetsWpn, thrownGetsWpn: finalThrownType === 'thrown',
    cityWallBonus,
    wpn, lvl,
    // Display value: `resolveCombat` applies the Vertigo Defense die penalty itself, so the
    // card's number and the resolver's input are genuinely two quantities here.
    displayDef,
    toHitMelee, toHitRtb, toHitImmolation, toBlock,
    // Abilities (for combat flow modifiers)
    abilities: combatAbilities,
    // Informational spell/charge and grant package. Spellcasting itself remains outside
    // the one-round damage resolver, but callers and the UI state can inspect the exact choice.
    marionette,
  };
  // Keep the complete structural ledger available to direct callers and focused diagnostics,
  // but out of the enumerable combat payload. Matrix workers clone many derived records and do
  // not consume trace metadata; cloning the complete ledger there would turn a debug contract
  // into a UI performance cost.
  Object.defineProperty(result, 'statExecutionTrace', {
    enumerable: false,
    get: () => statExecutionLedger.materialize(),
  });

  // Modern units have four independent attack fields, all derived by the one walk above. The
  // assembly reads each slot's finished strength, type and To Hit out of that record and
  // projects the shared ledger onto it.
  if (isCoM2 && input.modernAttacks) {
    const channels = {};
    for (const context of channelContexts) {
      const strength = statUnit[context.strengthField];
      if (strength <= 0) continue;
      const slotRangedType = statUnit[context.rangedTypeField];
      const slotThrownType = statUnit[context.thrownTypeField];
      const outputKey = slotRangedType !== 'none' ? 'ranged'
        : slotThrownType === 'thrown' ? 'thrown'
        : slotThrownType === 'fire' ? 'fireBreath'
        : slotThrownType === 'lightning' ? 'lightningBreath'
        : null;
      // Rust can eliminate an existing Thrown field.  A channel with no resolved
      // attack type must not survive merely because it still has a positive stat value.
      if (!outputKey) continue;
      const slotTrace = projectTraceToSlot(statTrace, context.slotKey);
      const slotChance = buildChanceProjection(context);
      const channel = {
        baseStrength: context.baseStrength,
        strength,
        type: slotRangedType !== 'none' ? slotRangedType : slotThrownType,
        toHit: slotChance.chanceUnit.toHitRtb / 100,
        // Preserve the atomic channel execution log as well as its strength projection.
        // Type-only Focus conversions otherwise disappear from every exposed trace.
        statTrace: slotTrace,
        modifierTrace: projectStatTrace(slotTrace, context.strengthField,
          context.baseStrength, strength),
        toHitTrace: projectStatTrace(slotChance.chanceTrace, chanceFields.rtb, 30,
          slotChance.chanceUnit.toHitRtb, { unit: 'percent' }),
      };
      channels[outputKey] = channel;
      result.modifierTraces.modernAttacks[outputKey] = channel.modifierTrace;
    }
    result.modernAttacks = channels;
  }

  return result;
}
