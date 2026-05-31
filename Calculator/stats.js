// --- Unit Stat Derivation ---
// Depends on data.js and combat.js helper functions. No DOM dependencies.

// Derive all effective stats for a unit from raw UI state.
// Pure stat logic: no DOM reads or rendering side effects.
function deriveUnitStats(input) {
  function anyNonZero(values) {
    return values.some(v => Math.abs(v || 0) > 1e-9);
  }

  const prefix = input.prefix;
  const version = input.version;
  // Abilities are read before stat derivation because Chaos Channels eligibility can depend on gaze attacks.
  const abilities = input.abilities || {};
  const destinyActive = destinyActiveForUnit(abilities, version);
  const unitTypeRaw = input.unitType;
  const unitTypeVal = determineEffectiveUnitType(unitTypeRaw, abilities, version);
  const loadoutEligible = !String(unitTypeRaw || '').startsWith('fantastic_') && !destinyActive;
  const level = loadoutEligible ? input.level : 'normal';
  const lvl = getLevelBonuses(level, version);
  // Warlord: Rebuild makes the unit Mechanical; Artificer retort then grants
  // Magic Weapons (+10% To Hit, bypass Weapon Immunity) to that unit.
  const isWarlordForArtificer = version === 'com2_warlord_1.5.12.5';
  const effectiveMechanical = !!abilities.mechanical
    || (isWarlordForArtificer && !!abilities.rebuild);
  const artificerMagicWeapon = isWarlordForArtificer
    && !!abilities.artificer && effectiveMechanical;
  // Altar of the Moon (Warlord, Gnoll building): trained units gain Rage and Poison
  // Immunity; ranged units also gain +2 Ranged Attack. The granted abilities are folded
  // into effectiveAbilities below; the ranged bonus is added to the rtb total.
  const altarOfTheMoon = isWarlordForArtificer && !!abilities.altarOfTheMoon;
  // Unit-specific Altar of the Moon grants: Hunters gain Poison 2; Witchdoctors gain
  // Life Steal -1 which replaces their Poison. Applied via effectiveAbilities below.
  const altarHunter = altarOfTheMoon && !!abilities.gnollHunters;
  const altarWitchdoctor = altarOfTheMoon && !!abilities.gnollWitchdoctors;
  const weaponInput = loadoutEligible ? input.weapon : 'normal';
  const weapon = (artificerMagicWeapon && weaponInput === 'normal') ? 'magic' : weaponInput;
  const wpn = weaponBonus(weapon);
  const armor = loadoutEligible ? input.armor : 'normal';

  const rtbTypeRaw = input.rtbType;
  let rangedType = RANGED_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
  let thrownType = THROWN_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';

  const baseDoomGazeWithBlazingEyes = blazingEyesDoomGazeForUnit(abilities, unitTypeVal, version);

  // Chaos Channels (Fire Breath option): version-sensitive strength.
  // MoM: strength 2.
  // CoM/CoM2: strength 4.
  // Fire Breath is not rolled for units that already have a ranged or breath attack.
  // If the unit has Thrown, Fire Breath replaces it.
  // CoM2 exception: Fire Breath can also replace Gaze and Lightning Breath.
  const ccFireBreathAbil = !!abilities.ccFireBreath;
  const hasGazeAttack = (abilities.gazeRanged || 0) > 0
    || abilities.stoningGaze != null
    || abilities.deathGaze != null
    || baseDoomGazeWithBlazingEyes > 0;
  const ccCanOverwriteSpecial = version.startsWith('com2')
    && (thrownType === 'lightning' || hasGazeAttack);
  const ccFireBreathStrength = version.startsWith('com') ? 4 : 2;
  // Warlord: Chaos Channels Fire Breath stacks additively with an existing fire breath.
  // Other versions: replaces the existing fire breath with the CC fire breath strength.
  const ccFireBreathStacksWarlord = version.startsWith('com2_warlord')
    && ccFireBreathAbil && rangedType === 'none' && thrownType === 'fire';
  const ccFireBreathActive = ccFireBreathAbil && rangedType === 'none'
    && (thrownType === 'none' || thrownType === 'thrown' || thrownType === 'fire' || ccCanOverwriteSpecial)
    && !ccFireBreathStacksWarlord;
  if (ccFireBreathActive) {
    thrownType = 'fire';
  }

  // Lightning Blade (Warlord): the Altar of Storm grants its units a witch blade that blasts
  // lightning in combat. If the unit has an innate Thrown attack, its type simply becomes
  // Lightning Breath at the same strength. A unit with no Thrown and no Lightning Breath gains
  // a strength-1 Lightning Breath. The Lightning Breath is innate and gains veterancy level
  // bonuses. (Chaos Channels Fire Breath above takes precedence, so a unit already converted
  // to fire is left as fire.)
  const lightningBladeAbil = version.startsWith('com2_warlord') && !!abilities.lightningBlade;
  // Strength-1 grant case: applies only when the unit has no ranged/thrown/breath attack at
  // all (i.e. melee-only). Existing ranged/fire-breath attacks are left intact rather than
  // being overwritten — the single-rtb model cannot hold both.
  const lightningBladeGrantsBreath = lightningBladeAbil
    && rangedType === 'none' && thrownType === 'none';
  if (lightningBladeAbil && thrownType === 'thrown') {
    thrownType = 'lightning';
  } else if (lightningBladeGrantsBreath) {
    thrownType = 'lightning';
  }

  // Base values from inputs
  const baseFigs = Math.max(1, parseInt(input.figs) || 1);
  const inputBaseAtk = Math.max(0, parseInt(input.atk) || 0);
  const inputBaseRtb = Math.max(0, parseInt(input.rtb) || 0);
  const inputBaseDef = Math.max(0, parseInt(input.def) || 0);
  const inputBaseRes = Math.max(0, parseInt(input.res) || 0);
  const inputBaseHP  = Math.max(1, parseInt(input.hp) || 1);
  let calcBaseAtk = destinyActive ? inputBaseAtk * 2 : inputBaseAtk;
  let calcBaseRtb = destinyActive ? inputBaseRtb * 2 : inputBaseRtb;
  if (ccFireBreathActive) calcBaseRtb = ccFireBreathStrength;
  else if (ccFireBreathStacksWarlord) calcBaseRtb += ccFireBreathStrength;
  // Lightning Blade's strength-1 grant (melee-only units). The Thrown→Lightning conversion
  // keeps the unit's existing Thrown strength, so it needs no adjustment here.
  if (lightningBladeGrantsBreath) calcBaseRtb = 1;
  const calcBaseDef = destinyActive ? inputBaseDef + 4 : inputBaseDef;
  const calcBaseRes = destinyActive ? inputBaseRes + 4 : inputBaseRes;
  const calcBaseHP  = destinyActive ? inputBaseHP * 2 : inputBaseHP;
  const baseToHitMod = parseInt(input.toHitMod) || 0;
  const baseToHitRtbMod = parseInt(input.toHitRtbMod) || 0;
  const baseToBlkMod = parseInt(input.toBlkMod) || 0;

  // Focus Magic: CoM/CoM2-only. In CoM2, magical ranged, doom gaze, and breath get +3.
  // In CoM, doom gaze is not mentioned, so only magical ranged and breath are boosted.
  // Otherwise, thrown/missile (CoM2) or thrown/non-magical ranged (CoM) is converted
  // into Sorcery magical ranged, with a minimum strength of 3. If nothing qualifies,
  // the unit gains strength-3 Sorcery magical ranged.
  const isCoM2 = version.startsWith('com2');
  const focusMagicActive = !!(abilities && abilities.focusMagic) && version.startsWith('com');
  const hasMagicRangedForFocus = calcBaseRtb > 0
    && (rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s');
  const hasBreathForFocus = calcBaseRtb > 0 && (thrownType === 'fire' || thrownType === 'lightning');
  const hasDoomGazeForFocus = isCoM2 && baseDoomGazeWithBlazingEyes > 0;
  const focusMagicBuffsExisting = focusMagicActive
    && (hasMagicRangedForFocus || hasBreathForFocus || hasDoomGazeForFocus);
  if (focusMagicActive && !focusMagicBuffsExisting) {
    const canConvertThrown = calcBaseRtb > 0 && thrownType === 'thrown';
    const canConvertRanged = calcBaseRtb > 0
      && (isCoM2
        ? rangedType === 'missile'
        : (rangedType === 'missile' || rangedType === 'boulder'));
    const convertedStrength = (canConvertThrown || canConvertRanged) ? Math.max(calcBaseRtb, 3) : 3;
    rangedType = 'magic_s';
    thrownType = 'none';
    calcBaseRtb = convertedStrength;
  }

  // Warlord Vampirism: all thrown and breath attacks transfer to melee. Melee gains
  // (thrown/breath strength − 1) and the thrown/breath strength drops to 1 (the residual
  // attack still hits flyers and still triggers Blood Sucker on its own phase). Strength is
  // conserved. Applies only to thrown/breath (thrownType), not magical/missile ranged.
  const vampirismActive = !!(abilities && abilities.vampirism) && version.startsWith('com2_warlord');
  if (vampirismActive && thrownType !== 'none' && calcBaseRtb > 0) {
    calcBaseAtk += Math.max(0, calcBaseRtb - 1);
    calcBaseRtb = 1;
  }

  const rangedGetsWpn = (rangedType === 'missile' || rangedType === 'boulder');
  const thrownGetsWpn = (thrownType === 'thrown');

  // City walls bonus (defender only)
  const cwVal = input.cityWalls;
  const cityWallBonus = (prefix === 'b' && cwVal !== 'none') ? parseInt(cwVal) : 0;

  // Node Aura bonus: +2 atk, +2 rtb, +2 def, +2 res for matching Fantastic units.
  // Effective combat type is resolved through the shared precedence helper.
  const supremeLightEligible = supremeLightActiveForUnit(abilities, unitTypeVal, version);
  const survivalInstinctEligible = survivalInstinctActiveForUnit(abilities, unitTypeVal, version);
  const landLinkingEligible = landLinkingActiveForUnit(abilities, unitTypeVal, version);
  const innerPowerEligible = innerPowerActiveForUnit(abilities, version);
  const misleadEligible = misleadActiveForUnit(abilities, unitTypeVal, version);
  const effectiveAbilities = {
    ...abilities,
    ...(altarOfTheMoon ? { rage: true, poisonImmunity: true } : {}),
    ...(altarHunter ? { poison: 2 } : {}),
    ...(altarWitchdoctor ? { lifeSteal: -1, poison: 0 } : {}),
    unitType: unitTypeVal,
    mechanical: effectiveMechanical,
    doomGaze: baseDoomGazeWithBlazingEyes,
    innerPower: innerPowerEligible ? abilities.innerPower : false,
    mislead: misleadEligible ? abilities.mislead : false,
    supernatural: ((abilities && abilities.supernatural) || destinyActive),
    supremeLight: supremeLightEligible ? abilities.supremeLight : false,
    survivalInstinct: survivalInstinctEligible ? abilities.survivalInstinct : false,
    landLinking: landLinkingEligible ? abilities.landLinking : false,
  };
  const abilMods = getAbilityStatModifiers(effectiveAbilities, version);
  const nodeAuraVal = input.nodeAura;
  const unitRealm = realmOfUnitType(unitTypeVal);
  const nodeAuraActive = unitRealm !== null && nodeAuraVal !== 'none' && unitRealm === nodeAuraVal;
  const nodeBonus = nodeAuraActive ? 2 : 0;
  const chaosSurgeCount = unitRealm === 'chaos'
    ? Math.max(0, parseInt(input.chaosSurge) || 0)
    : 0;
  const chaosSurgeMeleeBonus = chaosSurgeCount > 0
    ? (version.startsWith('mom') ? 2 : 3 + Math.floor(1.5 * (chaosSurgeCount - 1)))
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
  const isCoM2Version = version.startsWith('com2');
  const isWarlord = version.startsWith('com2_warlord');
  const ownEternalNight = !!(abilities && abilities.eternalNight) || !!input.eternalNight;
  const enemyEternalNight = !!input.enemyEternalNight;
  const hasAnyEternalNight = ownEternalNight || enemyEternalNight;
  const hasDarkness = !!input.darkness || legacyLightDarkVal === 'darkness' || hasAnyEternalNight;
  // True Light was removed in CoM 1 & 2, but Warlord re-introduces it as a Life
  // common combat enchantment — so enable it for MoM (non-CoM) and Warlord only.
  const hasTrueLight = (!!input.trueLight || legacyLightDarkVal === 'trueLight') && (!isCoMVersion || isWarlord);
  const darknessAtkDefMagnitude = hasDarkness ? (hasAnyEternalNight && isCoM2Version ? 2 : 1) : 0;
  const darknessResMagnitude = hasDarkness ? 1 : 0;
  const eternalNightEnemyResPenalty = enemyEternalNight && isCoMVersion && unitRealm !== 'death' ? -1 : 0;
  // Warlord Eternal Night: enemy non-Death units "lose 2 range" (poor sight) — treated
  // as firing from 2 tiles further than the actual distance. Applied below in the
  // distance penalty calculation; only affects missile/boulder (no other range falloff).
  const warlordEternalNightDistPenalty = enemyEternalNight && isWarlord && unitRealm !== 'death' ? 2 : 0;
  let darkLightAtkBonus = 0;
  let darkLightDefBonus = 0;
  let darkLightResBonus = eternalNightEnemyResPenalty;
  if (unitRealm === 'death') {
    darkLightAtkBonus += darknessAtkDefMagnitude;
    darkLightDefBonus += darknessAtkDefMagnitude;
    darkLightResBonus += darknessResMagnitude;
    if (hasTrueLight) {
      darkLightAtkBonus -= 1;
      darkLightDefBonus -= 1;
      darkLightResBonus -= 1;
    }
  } else if (unitRealm === 'life') {
    darkLightAtkBonus -= darknessAtkDefMagnitude;
    darkLightDefBonus -= darknessAtkDefMagnitude;
    darkLightResBonus -= darknessResMagnitude;
    if (hasTrueLight) {
      darkLightAtkBonus += 1;
      darkLightDefBonus += 1;
      darkLightResBonus += 1;
    }
  }

  // Effective values (level + weapon + ability + node aura + darkness/light modifiers)
  // Lionheart: version-dependent HP bonus (+3 in MoM; floor(8/figs) in CoM/CoM2).
  // RTB bonus (+3) applies only to non-magical ranged (missile/boulder) and thrown.
  const lionheartActive = !!(abilities && abilities.lionheart);
  const lionheartHpMod = lionheartActive
    ? (version.startsWith('mom') ? 3 : Math.floor(8 / baseFigs))
    : 0;
  const lionheartRtbMod = lionheartActive
    && (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown') ? 3 : 0;
  // Endurance: CoM gives +2 defense; CoM2 instead gives +4 total HP split evenly
  // between figures, with a minimum of +1 HP per figure.
  const enduranceActive = !!(abilities && abilities.endurance);
  const enduranceDefMod = enduranceActive && version.startsWith('com_') ? 2 : 0;
  const enduranceHpMod = enduranceActive && version.startsWith('com2')
    ? Math.max(1, Math.floor(4 / baseFigs))
    : 0;

  // Charm of Life: +1 HP per figure if base HP ≤ 7, else +25% (floor) of base HP.
  const charmOfLifeHpMod = (abilities && abilities.charmOfLife)
    ? (calcBaseHP >= 8 ? Math.floor(calcBaseHP * 0.25) : 1)
    : 0;
  const supremeLightDefMod = supremeLightEligible
    ? Math.floor(Math.max(0, calcBaseRes + lvl.res + abilMods.resMod + nodeBonus + darkLightResBonus) / 3)
    : 0;
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
  const disciplineRtbMod = disciplineActive && levelRank >= 2
    && (rangedType === 'missile' || rangedType === 'boulder') ? 1 : 0;

  // Orihalcon: +1 resistance, +2 magical ranged attack (CoM2 only).
  const orihalconActive = armor === 'orihalcon';
  const orihalconResMod = orihalconActive ? 1 : 0;
  const orihalconRtbMod = orihalconActive
    && (rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s') ? 2 : 0;

  // Wall of Fire (Warlord): the defending side's enchantment grants +1 to all
  // defending normal-unit non-magic attacks, mirroring the original game's Metal
  // Fires. Applies only to the defender (prefix 'b'), only to normal units, and
  // only to melee/missile/thrown (not boulder, magic ranged, or breath), matching
  // the Metal Fires coverage. Like Metal Fires it also upgrades a normal weapon to
  // magic (bypasses Weapon Immunity) — applied to effectiveWeapon below.
  const wofDefenderBonusActive = isWarlord && !!input.wallOfFire
    && prefix === 'b' && isNormalUnitType(unitTypeVal);
  const wofDefenderAtkMod = wofDefenderBonusActive ? 1 : 0;
  const wofDefenderRtbMod = wofDefenderBonusActive
    && (rangedType === 'missile' || thrownType === 'thrown') ? 1 : 0;

  // Metal Fires / Flame Blade: +1/+2 to missile and thrown rtb only (not boulder, magic).
  // Warlord Flame Blade (per in-game helptext): +2 to missile and thrown, +1 to fire breath
  // (no boulder bonus — that belongs to Fiery Fury).
  // Warlord Fiery Fury: +2 to missile, boulder, and thrown for regular units only;
  // bonuses (except boulder) do not stack with Flame Blade.
  // Flame Blade also upgrades the unit's normal weapon to magic (bypasses Weapon Immunity);
  // Fiery Fury does the same for regular units.
  const isWarlordFB = abilities.flameBlade && isWarlord;
  const fbAtkBonus = abilities.flameBlade ? 2 : (abilities.metalFires ? 1 : 0);
  const isFantasticBase = (unitTypeRaw || '').startsWith('fantastic_');
  const ffRegularBonus = isWarlord && !!abilities.fieryFury && !isFantasticBase;
  let fbRtbMod = 0;
  if (isWarlordFB) {
    if (rangedType === 'missile' || thrownType === 'thrown') fbRtbMod = 2;
    else if (thrownType === 'fire') fbRtbMod = 1;
  } else if (fbAtkBonus > 0 && (rangedType === 'missile' || thrownType === 'thrown')) {
    fbRtbMod = fbAtkBonus;
  }
  if (ffRegularBonus) {
    let ffRtb = 0;
    if (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown') ffRtb = 2;
    fbRtbMod = Math.max(fbRtbMod, ffRtb);
  }
  // Fiery Fury melee +3 for regular units; non-cumulative with Flame Blade (combat.js
  // already adds +3 melee for flameBlade in CoM/Warlord via getAbilityStatModifiers).
  const ffMeleeBonus = ffRegularBonus && !abilities.flameBlade ? 3 : 0;

  const atk = calcBaseAtk > 0 ? Math.max(0, calcBaseAtk + lvl.atk + wpn.atk + abilMods.atkMod + disciplineAtkMod + wofDefenderAtkMod + nodeBonus + darkLightAtkBonus + chaosSurgeMeleeBonus + ffMeleeBonus) : 0;
  const defBase = Math.max(0, calcBaseDef + lvl.def + wpn.def + cityWallBonus + abilMods.defMod + enduranceDefMod + disciplineDefMod + supremeLightDefMod + nodeBonus + darkLightDefBonus);
  // Holy Armor: MoM: +2 defense. CoM/CoM2: +2 defense if def ≤ 5; +10% To Block if def > 5.
  const holyArmorActive = !!(abilities && abilities.holyArmor);
  const holyArmorHighDef = holyArmorActive && isCoMVersion && defBase > 5;
  const holyArmorDefBonus = holyArmorActive && !holyArmorHighDef ? 2 : 0;
  const holyArmorToBlkBonus = holyArmorHighDef ? 10 : 0;
  const def = defBase + holyArmorDefBonus;
  // Altar of the Moon: trained units gain +1 Resistance (all units, not just ranged).
  const altarOfTheMoonResMod = altarOfTheMoon ? 1 : 0;
  const res = Math.max(0, calcBaseRes + lvl.res + abilMods.resMod + altarOfTheMoonResMod + orihalconResMod + nodeBonus + darkLightResBonus + chaosSurgeResBonus);
  const hp  = Math.max(1, calcBaseHP + lvl.hp + abilMods.hpMod + lionheartHpMod + enduranceHpMod + charmOfLifeHpMod);

  // Blazing March: +3 to missile only (not boulder, magic ranged, or breath).
  // Warlord also boosts thrown.
  const blazingMarchActive = !!(abilities && abilities.blazingMarch);
  const blazingMarchBoostsThrown = version.startsWith('com2_warlord') && thrownType === 'thrown';
  const blazingMarchRtbMod = blazingMarchActive && (rangedType === 'missile' || blazingMarchBoostsThrown) ? 3 : 0;

  // Chaos Surge: affects Chaos creatures only.
  // MoM: +2 to all attack strengths, but multiple copies do not stack; Chaos Channels'
  // granted Fire Breath is excluded. CoM/CoM2: +2 ranged/breath, no thrown bonus.
  const chaosSurgeBoostsRtb = version.startsWith('mom')
    ? (rangedType !== 'none' || (thrownType !== 'none' && !ccFireBreathActive))
    : (rangedType !== 'none' || thrownType === 'fire' || thrownType === 'lightning');
  const chaosSurgeRtbMod = chaosSurgeRtbBonus > 0 && chaosSurgeBoostsRtb ? chaosSurgeRtbBonus : 0;

  const focusMagicRtbMod = focusMagicBuffsExisting
    && (rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s'
      || thrownType === 'fire' || thrownType === 'lightning') ? 3 : 0;

  // Reinforce Magic: +2 to magical ranged attack strength only.
  const reinforceMagicRtbMod = (abilities && abilities.reinforceMagic)
    && (rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s') ? 2 : 0;

  // Mislead/Misfortune: -1 ranged attack only (not thrown or breath) per source helptext.
  // Eligibility (normal/hero) is handled via effectiveAbilities.mislead.
  const misleadRtbMod = (effectiveAbilities && effectiveAbilities.mislead)
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s') ? -1 : 0;

  // Supreme Light: +2 to ranged attack strength (missile/boulder/magic ranged).
  // Source manuals say "+2 melee and ranged attack" — thrown and breath are not affected.
  const supremeLightRtbMod = supremeLightEligible
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s') ? 2 : 0;

  // Altar of the Moon: +2 to ranged attack strength (missile/boulder/magic ranged only;
  // thrown and breath are not affected), matching the "ranged units" wording.
  const altarOfTheMoonRtbMod = altarOfTheMoon
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s') ? 2 : 0;

  // CoM/CoM2 Land Linking boosts melee and breath only.
  const landLinkingBreathRtbMod = landLinkingEligible && version.startsWith('com')
    && (thrownType === 'fire' || thrownType === 'lightning') ? 2 : 0;

  // Giant Strength: +1 thrown only (not missile/boulder/magic ranged, not breath).
  const gsRtbMod = (abilities.giantStrength && thrownType === 'thrown') ? 1 : 0;

  // Weakness: -2 (MoM) or -3 (CoM/CoM2/Warlord) to missile ranged and thrown.
  // In MoM 1.31, thrown is bugged and NOT reduced (fixed in 1.60+).
  // Warlord: also reduces breath attacks (fire/lightning).
  const weaknessActive = !!(abilities && abilities.weakness);
  const weaknessPenalty = weaknessActive ? (version.startsWith('com') ? 3 : 2) : 0;
  const weaknessRtbMod = weaknessActive
    ? (rangedType === 'missile' ? -weaknessPenalty
      : (thrownType === 'thrown' && version !== 'mom_1.31' ? -weaknessPenalty
      : ((thrownType === 'fire' || thrownType === 'lightning') && version.startsWith('com2_warlord') ? -weaknessPenalty
      : 0)))
    : 0;

  // Holy Weapon: +10% To Hit on melee, missile, and boulder attacks. Also applies to thrown
  // in all versions except MoM 1.31 (bug). Does NOT affect magic ranged, fire/lightning
  // breath, or gaze attacks. Also upgrades normal weapon to magic (bypasses Weapon Immunity).
  const hwActive = !!(abilities && abilities.holyWeapon);
  const hwMeleeToHit = hwActive ? 10 : 0;
  let hwRtbToHit = 0;
  if (hwActive) {
    if (rangedType === 'missile' || rangedType === 'boulder') hwRtbToHit = 10;
    else if (thrownType === 'thrown' && version !== 'mom_1.31') hwRtbToHit = 10;
  }
  const weaponUpgradedByHW = hwActive && weapon === 'normal';
  const wraithFormBypassesWI = weapon === 'normal'
    && version.startsWith('com')
    && !!(abilities && (abilities.wraithForm || abilities.rulerOfUnderworld));
  const eldritchActive = !!(abilities && abilities.eldritchWeapon);
  // Warlord Wall of Fire's defender bonus mirrors Metal Fires, which also upgrades
  // the unit's weapon to magic (bypasses Weapon Immunity) for its non-magic attacks.
  const weaponUpgradedByWoF = wofDefenderBonusActive && weapon === 'normal';
  const effectiveWeapon = (fbAtkBonus > 0 && weapon === 'normal') ? 'magic'
    : (ffRegularBonus && weapon === 'normal') ? 'magic'
    : (weaponUpgradedByHW ? 'magic'
    : (wraithFormBypassesWI ? 'magic'
    : (weaponUpgradedByWoF ? 'magic'
    : ((eldritchActive && weapon === 'normal') ? 'magic' : weapon))));

  // Ranged/Thrown/Breath strength
  let rtbLvl = 0, rtbWpn = 0;
  if (rangedType !== 'none') {
    rtbLvl = calcBaseRtb > 0 ? lvl.ranged : 0;
    rtbWpn = (calcBaseRtb > 0 && rangedGetsWpn) ? wpn.atk : 0;
  } else if (thrownType !== 'none') {
    rtbLvl = lvl.thrown;
    rtbWpn = (calcBaseRtb > 0 && thrownGetsWpn) ? wpn.atk : 0;
  }
  const rtb = calcBaseRtb > 0 ? Math.max(0, calcBaseRtb + rtbLvl + rtbWpn + abilMods.rtbMod + disciplineRtbMod + fbRtbMod + wofDefenderRtbMod + blazingMarchRtbMod + chaosSurgeRtbMod + focusMagicRtbMod + reinforceMagicRtbMod + misleadRtbMod + supremeLightRtbMod + altarOfTheMoonRtbMod + landLinkingBreathRtbMod + orihalconRtbMod + gsRtbMod + lionheartRtbMod + weaknessRtbMod + nodeBonus + darkLightAtkBonus) : 0;

  // Hidden gaze ranged attack: affected by same modifiers as ranged (level, node aura,
  // darkness/light, ability mods) but NOT weapon bonuses. In v1.31, if reduced to 0 the
  // gaze attack does not fire.
  const gazeOverwrittenByCC = ccFireBreathActive && ccCanOverwriteSpecial && hasGazeAttack;
  const baseGazeRanged = gazeOverwrittenByCC ? 0 : ((abilities && abilities.gazeRanged) || 0);
  const effectiveGazeRanged = baseGazeRanged > 0
    ? Math.max(0, baseGazeRanged + lvl.ranged + abilMods.rtbMod + nodeBonus + darkLightAtkBonus)
    : 0;

  // Doom Gaze: delivers exact doom damage. Affected by node aura, darkness/light,
  // and ability modifiers (e.g. Black Prayer), but NOT level or weapon bonuses.
  const baseDoomGaze = gazeOverwrittenByCC ? 0 : (effectiveAbilities.doomGaze || 0);
  const chaosSurgeDoomGazeMod = version.startsWith('mom') ? chaosSurgeRtbBonus : 0;
  const effectiveDoomGaze = baseDoomGaze > 0
    ? Math.max(0, baseDoomGaze + abilMods.rtbMod + (focusMagicBuffsExisting && isCoM2 ? 3 : 0) + nodeBonus + darkLightAtkBonus + chaosSurgeDoomGazeMod)
    : 0;

  const combatAbilitiesBase = combatDisciplineNegatesFirstStrike
    ? { ...effectiveAbilities, negateFirstStrike: true }
    : effectiveAbilities;
  const combatAbilities = gazeOverwrittenByCC
    ? { ...combatAbilitiesBase, gazeRanged: 0, stoningGaze: null, deathGaze: null, doomGaze: 0 }
    : combatAbilitiesBase;

  // To Hit percentage bonuses
  const meleeToHitBonus = lvl.toHit + wpn.toHit + abilMods.toHitMod + hwMeleeToHit;
  const rtbToHitWpn = rangedGetsWpn ? wpn.toHit : 0;

  // Distance penalty (attacker ranged only)
  let rtbDistPenalty = 0;
  if (prefix === 'a' && (rangedType === 'missile' || rangedType === 'boulder') && input.rangedCheck) {
    const dist = Math.max(1, parseInt(input.rangedDist) || 1) + warlordEternalNightDistPenalty;
    rtbDistPenalty = distancePenalty(dist, rangedType, !!(abilities && abilities.longRange), version);
  }

  // Pre-clamped To Hit/Block values for combat (decimals 0.1-1.0)
  let toHitMelee = clampPct(30, baseToHitMod + meleeToHitBonus);
  let toHitRtb = clampPct(30, baseToHitRtbMod + lvl.toHit + rtbToHitWpn + rtbDistPenalty + abilMods.toHitMod + hwRtbToHit);
  let toBlock = clampPct(30, baseToBlkMod + abilMods.toBlkMod + holyArmorToBlkBonus);
  // Immolation To Hit: always base 30%, ignoring all modifiers (it's a spell attack)
  let toHitImmolation = 0.3;

  // Warp Reality: -20% To Hit for non-Chaos units. Chaos Channels exempts a unit.
  // Read from global checkbox here so the penalty is reflected in the red display numbers.
  const warpRealityActive = !!input.warpReality;
  const unitIsChaos = unitTypeVal === 'fantastic_chaos';  // Chaos Channels already folds into unitTypeVal
  if (warpRealityActive && !unitIsChaos) {
    toHitMelee      = Math.max(0.1, toHitMelee - 0.2);
    toHitRtb        = Math.max(0.1, toHitRtb - 0.2);
    toHitImmolation = Math.max(0.1, toHitImmolation - 0.2);
  }

  // Warlord True Light: illusion attacks suffer -10% To Hit, for all units
  // regardless of realm (this clause is Warlord-only; not present in MoM).
  if (isWarlord && hasTrueLight && !!(abilities && abilities.illusion)) {
    toHitMelee = Math.max(0.1, toHitMelee - 0.1);
    toHitRtb   = Math.max(0.1, toHitRtb - 0.1);
  }

  let displayToHitMelee = toHitMelee;
  let displayToHitRtb = toHitRtb;
  let displayToBlock = toBlock;

  // Vertigo: reflect the displayed penalty in the red To Hit / To Block numbers.
  // MoM: -20% To Hit, -1 Defense. CoM/CoM2: -30% To Hit, -1 To Block.
  const vertigoActive = !!(abilities && abilities.vertigo)
    && !(abilities && (abilities.illusionImmunity || abilities.magicImmunity));
  if (vertigoActive) {
    if (version.startsWith('com')) {
      displayToHitMelee = Math.max(0.1, displayToHitMelee - 0.3);
      displayToHitRtb = Math.max(0.1, displayToHitRtb - 0.3);
      displayToBlock = Math.max(0.0, displayToBlock - 0.1);
    } else {
      displayToHitMelee = Math.max(0.1, displayToHitMelee - 0.2);
      displayToHitRtb = Math.max(0.1, displayToHitRtb - 0.2);
    }
  }

  // Berserk: behavior differs by version.
  // MoM/CoM/CoM2: doubles melee attack (applied last, after all other bonuses) and
  // sets defense to 0 absolutely (no other bonus can raise it while Berserk is active).
  // Warlord: Berserk was removed as a wizard spell and reworked into a Troll
  // Medicineman-cast unit buff: +15% To Hit, +1 combat movement (irrelevant here),
  // and -10% To Block. The classic atk-doubling and def-zeroing do not apply.
  const berserkActive = !!(abilities && abilities.berserk);
  const warlordBerserk = berserkActive && isWarlord;
  const classicBerserk = berserkActive && !isWarlord;
  let finalAtk = classicBerserk ? atk * 2 : atk;
  let finalDef = classicBerserk ? 0 : def;
  let finalRtb = rtb;
  let finalRes = res;
  if (warlordBerserk) {
    toHitMelee = Math.min(1.0, toHitMelee + 0.15);
    toHitRtb = Math.min(1.0, toHitRtb + 0.15);
    displayToHitMelee = Math.min(1.0, displayToHitMelee + 0.15);
    displayToHitRtb = Math.min(1.0, displayToHitRtb + 0.15);
    toBlock = Math.max(0.0, toBlock - 0.10);
    displayToBlock = Math.max(0.0, displayToBlock - 0.10);
  }

  // Warp Creature effects (applied after all other bonuses per MoM wiki).
  // Warp Attack: halves melee (all versions) and all ranged/thrown (CoM/CoM2 only).
  // Warp Defense: halves defense (MoM) or reduces to one-third (CoM/CoM2).
  // Warp Resist: sets resistance to 0; Resist Magic +5 still applies in combat.js.
  const isCoMVer = version.startsWith('com');
  if (abilities && abilities.warpAttack) {
    finalAtk = Math.floor(finalAtk / 2);
    if (isCoMVer) finalRtb = Math.floor(finalRtb / 2);
  }
  if (abilities && abilities.warpDefense) {
    finalDef = Math.floor(finalDef / (isCoMVer ? 3 : 2));
  }
  if (abilities && abilities.warpResist) {
    finalRes = 0;
  }

  // Shatter: reduces all attack strengths (melee and ranged/thrown/breath) to 1 for
  // eligible units. CoM2: normal units and heroes only. Warlord: any unit.
  if (abilities && abilities.shatter) {
    const shatterEligible = isWarlord || isNormalUnitType(unitTypeVal) || unitTypeVal === 'hero';
    if (shatterEligible) {
      if (finalAtk > 0) finalAtk = 1;
      if (finalRtb > 0) finalRtb = 1;
    }
  }

  const displayDef = (vertigoActive && !isCoMVer) ? Math.max(0, finalDef - 1) : finalDef;

  const toHitMeleeHasModifiers = anyNonZero([
    baseToHitMod,
    lvl.toHit,
    wpn.toHit,
    abilMods.toHitMod,
    hwMeleeToHit,
    (warpRealityActive && !unitIsChaos) ? -20 : 0,
    vertigoActive ? (version.startsWith('com') ? -30 : -20) : 0,
  ]);
  const toHitRtbHasModifiers = anyNonZero([
    baseToHitRtbMod,
    lvl.toHit,
    rtbToHitWpn,
    rtbDistPenalty,
    abilMods.toHitMod,
    hwRtbToHit,
    (warpRealityActive && !unitIsChaos) ? -20 : 0,
    vertigoActive ? (version.startsWith('com') ? -30 : -20) : 0,
  ]);
  const toBlockHasModifiers = anyNonZero([
    baseToBlkMod,
    abilMods.toBlkMod,
    holyArmorToBlkBonus,
    (vertigoActive && version.startsWith('com')) ? -10 : 0,
  ]);

  return {
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
    rtbToHitWpnBonus: rtbToHitWpn,
    rtbToHitLvlBonus: lvl.toHit,
    rtbDistPenalty,
    toHitMeleeHasModifiers,
    toHitRtbHasModifiers,
    toBlockHasModifiers,
    // Effective values (for calculation)
    figs: baseFigs,
    atk: finalAtk, def: finalDef, res: finalRes, hp, rtb: finalRtb, effectiveGazeRanged, effectiveDoomGaze, baseGazeRanged, baseDoomGaze, weapon: effectiveWeapon, unitType: unitTypeVal, generic: !!input.generic,
    dmg: Math.max(0, parseInt(input.dmg) || 0),
    rangedType, thrownType,
    rangedGetsWpn, thrownGetsWpn,
    cityWallBonus,
    wpn, lvl,
    // Display values (can include modifiers that resolveCombat also applies internally)
    displayDef,
    displayToHitMelee,
    displayToHitRtb,
    displayToBlock,
    // Pre-clamped combat values
    toHitMelee, toHitRtb, toHitImmolation, toBlock,
    // Abilities (for combat flow modifiers)
    abilities: combatAbilities,
  };
}

