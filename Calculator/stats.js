// --- Unit Stat Derivation ---
// Depends on data.js and combat.js helper functions. No DOM dependencies.

// Lava Smelter (Warlord, Dwarf-race building): a selected mineral combo grants one
// permanent ability to Dwarf-race units (heroes excluded). Returns the ability set with the grant merged
// in (a new object), or the original set unchanged when it does not apply. Merging up-front
// — rather than into effectiveAbilities — lets the Flame Blade grant reach the weapon-upgrade
// and stat-bonus logic, which read the raw ability set. The Wall-of-Fire siege effect is not
// modelled here (it has its own global toggle).
function applyLavaSmelterGrant(abilities, version, unitType, race) {
  if (!version || !version.startsWith('com2_warlord') || race !== 'Dwarf' || unitType === 'hero') return abilities;
  switch (abilities.lavaSmelter || 'none') {
    case 'weaponImmunity':  return { ...abilities, weaponImmunity: true };
    case 'missileImmunity': return { ...abilities, missileImmunity: true };
    case 'flameBlade':      return { ...abilities, flameBlade: true };
    case 'resistElem':
    case 'elementalArmor': {
      // Both the manual Elements selector and this grant share the elemArmor key; keep the
      // stronger of the two so the smelter never downgrades an explicit Elemental Armor.
      const rank = { none: 0, resistElements: 1, elementalArmor: 2 };
      const grant = abilities.lavaSmelter === 'elementalArmor' ? 'elementalArmor' : 'resistElements';
      const current = abilities.elemArmor || 'none';
      return { ...abilities, elemArmor: (rank[current] || 0) >= rank[grant] ? current : grant };
    }
    default: return abilities;
  }
}

// Sancta Basilica (Warlord, High Men building): every High Men unit trained here gains +3
// Resistance (added in deriveUnitStats). Clergy (matched by the Clergy unit tag), Crusaders,
// and Paladins (matched by name) additionally receive Sanctify; Crusaders also gain Lucky and
// Paladins also gain Magic Immunity. Those three grants are folded in here so every downstream
// read sees them — Sanctify drives the Life-realm unit-type conversion, Lucky feeds the ability
// stat modifiers, and Magic Immunity feeds the combat immunity checks. The improved Exorcise
// grant (Clergy) and the True Light city enchantment (defending) are not modelled. Gated on the
// High Men race; heroes gain nothing.
function applySanctaBasilicaGrant(abilities, version, unitType, race, name) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.sanctaBasilica
      || race !== 'High Men' || unitType === 'hero') return abilities;
  const isCrusader = (name || '').endsWith('Crusaders');
  const isPaladin = (name || '').endsWith('Paladins');
  const isClergy = !!abilities.clergy;
  if (!isCrusader && !isPaladin && !isClergy) return abilities;
  return {
    ...abilities,
    sanctify: true,
    ...(isCrusader ? { lucky: true } : {}),
    ...(isPaladin ? { magicImmunity: true } : {}),
  };
}

// Magic Immunity hard-blocks a set of magic-based curses: the immunity grants such
// overwhelming effective resistance/defense that these curses simply never take hold,
// so the calculator strips them here before any downstream read (display stats,
// effectiveAbilities, and the combatAbilities passed to resolveCombat all derive from
// this object). Mind Storm and Vertigo are additionally blocked by Illusion Immunity,
// including the Illusion Immunity granted by Eye of Heaven.
// Curses that bypass Magic Immunity per the source are NOT gated: Black Prayer (on the
// MoM bypass list), Hierophany ("Cannot be blocked by … Magic Immunity"), and Eternal
// Night's Darkness malus (Darkness is on the MoM bypass list).
// Mislead/Liability are deliberately absent: the spell's resist roll and Death/Illusion
// "no effect" clause gate only the single targeted unit, but the Misfortune/Jinx debuff
// then spreads to every normal unit in the army with no per-unit immunity check — so a
// unit suffering the debuff is not protected by any immunity.
const MAGIC_IMMUNITY_GATED_CURSES = [
  'weakness', 'blackSleep', 'shatter', 'vertigo',
  'warpAttack', 'warpDefense', 'warpResist', 'nausea', 'temporalTwist', 'mindStorm',
];
const ILLUSION_IMMUNITY_GATED_CURSES = ['mindStorm', 'vertigo'];
function applyMagicImmunityCurseGating(abilities) {
  const magicImmune = !!abilities.magicImmunity;
  const illusionImmune = !!(abilities.illusionImmunity || abilities.eyeOfHeaven);
  const illusionHasCurse = illusionImmune
    && ILLUSION_IMMUNITY_GATED_CURSES.some(k => abilities[k]);
  if (!magicImmune && !illusionHasCurse) return abilities;
  const gated = { ...abilities };
  if (magicImmune) {
    for (const key of MAGIC_IMMUNITY_GATED_CURSES) {
      if (gated[key]) delete gated[key];
    }
  }
  if (illusionImmune) {
    for (const key of ILLUSION_IMMUNITY_GATED_CURSES) {
      if (gated[key]) delete gated[key];
    }
  }
  return gated;
}

// Divine Protection (Warlord, Life unit enchantment): grants Lucky and Death Immunity.
// Folded into effective abilities here so every downstream read sees them — Lucky feeds the
// ability stat modifiers (+10% To Hit, +10% To Block, +1 Resistance) and Death Immunity feeds
// the combat immunity checks (Death Gaze/Touch, Life Stealing, Cause Fear).
function applyDivineProtectionGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.divineProtection) return abilities;
  return { ...abilities, lucky: true, deathImmunity: true };
}

// Lucky Star (Warlord, Arcane combat enchantment, Astrologer retort exclusive): grants Lucky to
// the target unit for the battle. Folded into effective abilities here so the Lucky stat modifiers
// (+10% To Hit, +10% To Block, +1 Resistance) feed every downstream read.
function applyLuckyStarGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.luckyStar) return abilities;
  return { ...abilities, lucky: true };
}

// Pillar of Faith (Warlord, Life rare city enchantment): units trained in the city have a
// 20% chance to gain Lucky. The calculator models the landed outcome, so the pillarOfFaithLucky
// toggle folds Lucky in directly (its +10% To Hit / +10% To Block / +1 Resistance flow through
// the ability stat modifiers). The separate +Resistance per Religious Building is applied to
// res in deriveUnitStats.
function applyPillarOfFaithGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.pillarOfFaithLucky) return abilities;
  return { ...abilities, lucky: true };
}

// Fortification (Warlord, city building): all defending units inside the city walls gain a
// Large Shield effect. If the unit already has Large Shield, it receives Missile Immunity
// instead (helptext: "If the friendly unit already has Large Shield ability, the unit receives
// Missile Immunity bonus instead"). Folded in here so the largeShield/missileImmunity defense
// bonuses flow through every downstream combat read.
function applyFortificationGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.fortification) return abilities;
  return abilities.largeShield
    ? { ...abilities, missileImmunity: true }
    : { ...abilities, largeShield: true };
}

// Insulation (Warlord, Chaos unit enchantment): grants Fire Immunity, Cold Immunity, and
// Lightning Resist. Folded into effective abilities here so the combat immunity checks
// (fire breath/immolation/wall of fire defense, cold attacks, and the lightning AP negation)
// all see them.
function applyInsulationGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.insulation) return abilities;
  return { ...abilities, fireImmunity: true, coldImmunity: true, lightningResist: true };
}

// Derive all effective stats for a unit from raw UI state.
// Pure stat logic: no DOM reads or rendering side effects.
function deriveUnitStats(input) {
  function anyNonZero(values) {
    return values.some(v => Math.abs(v || 0) > 1e-9);
  }

  const prefix = input.prefix;
  const version = input.version;
  // Abilities are read before stat derivation because Chaos Channels eligibility can depend on gaze attacks.
  // Lava Smelter folds its granted ability in here so every downstream read sees it.
  // Race-exclusive building enchantments gate on the unit's intrinsic race/name, supplied
  // by the caller from the selected roster unit. Custom (hand-entered) units carry neither,
  // so building buffs are inert on them. The display name may be race-prefixed for some
  // units and not others, so name exceptions match with endsWith (always gated by race).
  const unitRace = input.race || '';
  const unitName = input.name || '';
  const abilities = applyMagicImmunityCurseGating(
    applyFortificationGrant(
    applyInsulationGrant(
    applyPillarOfFaithGrant(
    applyLuckyStarGrant(
    applyDivineProtectionGrant(
      applySanctaBasilicaGrant(
        applyLavaSmelterGrant(input.abilities || {}, version, input.unitType, unitRace),
        version, input.unitType, unitRace, unitName),
      version),
    version),
    version),
    version),
    version));
  const destinyActive = destinyActiveForUnit(abilities, version);
  const unitTypeRaw = input.unitType;
  const unitTypeVal = determineEffectiveUnitType(unitTypeRaw, abilities, version);
  const loadoutEligible = !String(unitTypeRaw || '').startsWith('fantastic_') && !destinyActive;
  // Spirit Link (Warlord): grants a fantastic creature sentience so it can earn
  // experience levels. It does NOT grant weapon/armor loadout, so only level
  // eligibility is widened — weapon and armor below stay gated on loadoutEligible.
  const levelEligible = loadoutEligible
    || (version.startsWith('com2_warlord') && !!abilities.spiritLink && !destinyActive);
  const level = levelEligible ? input.level : 'normal';
  const lvl = getLevelBonuses(level, version);
  // Warlord: Rebuild makes the unit Mechanical; Artificer retort then grants
  // Magic Weapons (+10% To Hit, bypass Weapon Immunity) to that unit.
  const isWarlordForArtificer = version === 'com2_warlord_1.5.12.5';
  const effectiveMechanical = !!abilities.mechanical
    || (isWarlordForArtificer && !!abilities.rebuild);
  const artificerMagicWeapon = isWarlordForArtificer
    && !!abilities.artificer && effectiveMechanical;
  // Altar of the Moon (Warlord, Gnoll building): Gnoll units trained here gain Rage and
  // Poison Immunity; ranged units also gain +2 Ranged Attack. The granted abilities are
  // folded into effectiveAbilities below; the ranged bonus is added to the rtb total.
  // Gated on the Gnoll race — non-Gnoll units and heroes gain nothing.
  const altarOfTheMoon = isWarlordForArtificer && !!abilities.altarOfTheMoon
    && unitRace === 'Gnoll' && unitTypeRaw !== 'hero';
  // Unit-specific Altar of the Moon grants: Gnoll Hunters gain Poison 2; Gnoll
  // Witchdoctors gain Life Steal -1 which replaces their Poison. Applied via effectiveAbilities below.
  const altarHunter = altarOfTheMoon && unitRace === 'Gnoll' && unitName.endsWith('Hunters');
  const altarWitchdoctor = altarOfTheMoon && unitRace === 'Gnoll' && unitName.endsWith('Witchdoctors');
  // Altar of the Sun (Warlord, Hawkmen building): Hawkmen units trained here gain +1
  // Figure, except Holy Mother who gains +1 Melee instead. Gated on the Hawkmen race —
  // heroes are excluded and gain nothing. Only these unit bonuses are modelled; the
  // defending-city High Prayer buff is not.
  const altarOfTheSunEligible = isWarlordForArtificer
    && !!abilities.altarOfTheSun && unitRace === 'Hawkmen' && unitTypeRaw !== 'hero';
  const altarOfTheSunHolyMother = altarOfTheSunEligible && unitName.endsWith('Holy Mother');
  const altarOfTheSun = altarOfTheSunEligible && !unitName.endsWith('Holy Mother');
  // Dragon Mound (Warlord, Draconian building): Draconian units trained here gain +1 Armor
  // (folded into def below) and, for units that already have a Fire Breath attack, +2 Fire
  // Breath. Like the Military Workshop breath bonus, it boosts an existing fire breath rather
  // than granting one to melee-only units. Gated on the Draconian race — non-Draconian
  // units and heroes gain nothing, matching the in-game race-exclusive building.
  const dragonMound = isWarlordForArtificer
    && !!abilities.dragonMound && unitRace === 'Draconian' && unitTypeRaw !== 'hero';
  // Ludus Agoge (Warlord, Orc building): Orc units trained here gain +1 Attack (melee, folded
  // into atk below), +1 Resistance, and +1 HP. Legionary units gain +1 Movement instead — not
  // modelled here — so they receive no stat bonus. Gated on the Orc race — non-Orc units,
  // Legionaries, and heroes gain nothing, matching the in-game race-exclusive building.
  const ludusAgoge = isWarlordForArtificer
    && !!abilities.ludusAgoge && unitRace === 'Orc' && !unitName.endsWith('Legionary') && unitTypeRaw !== 'hero';
  // Mother Fungus (Warlord, Goblin building): Goblin units trained here gain +2 Attack (melee,
  // folded into atk below), +10% To Defend (folded into toBlock below), and Poison 1 (boosts an
  // existing poison attack, or grants Poison 1 if it has none). The ×2 Spellcharge bonus is not
  // modelled. Gated on the Goblin race — non-Goblin units and heroes gain nothing, matching the
  // in-game race-exclusive building.
  const motherFungus = isWarlordForArtificer
    && !!abilities.motherFungus && unitRace === 'Goblin' && unitTypeRaw !== 'hero';
  // Pool of Repentance (Warlord, Rakhshasa building): Rakhshasa units trained here gain +1 Armor
  // (folded into defBase below) and +1 Resistance (folded into res below). Gated on the Rakhshasa
  // race — non-Rakhshasa units and heroes gain nothing, matching the in-game race-exclusive building.
  const poolOfRepentance = isWarlordForArtificer
    && !!abilities.poolOfRepentance && unitRace === 'Rakhshasa' && unitTypeRaw !== 'hero';
  // Sancta Basilica (Warlord, High Men building): +3 Resistance for every High Men unit trained
  // here (folded into res below). The unit-specific Sanctify / Lucky / Magic Immunity grants are
  // applied earlier via applySanctaBasilicaGrant. Gated on the High Men race; heroes gain nothing.
  const sanctaBasilica = isWarlordForArtificer
    && !!abilities.sanctaBasilica && unitRace === 'High Men' && unitTypeRaw !== 'hero';
  // Rust (Warlord Chaos common combat curse): permanently strips magic/orihalcon weapons
  // (the unit reverts to regular weapons), −3 melee attack (applied in combat.js), and
  // eliminates thrown attacks and Large Shield for the rest of combat (below).
  // Rust targets an enemy regular (non-fantastic) unit; fantastic creatures are immune.
  const rustActive = version.startsWith('com2_warlord') && !!(abilities && abilities.rust)
    && !String(unitTypeRaw || '').startsWith('fantastic_');
  const weaponInput = loadoutEligible ? input.weapon : 'normal';
  const weaponPreRust = (artificerMagicWeapon && weaponInput === 'normal') ? 'magic' : weaponInput;
  const weapon = rustActive ? 'normal' : weaponPreRust;
  const wpn = weaponBonus(weapon);
  const armor = loadoutEligible ? input.armor : 'normal';

  const rtbTypeRaw = input.rtbType;
  let rangedType = RANGED_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
  let thrownType = THROWN_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
  // Rust eliminates thrown attacks (only the 'thrown' type — not fire/lightning breath).
  if (rustActive && thrownType === 'thrown') thrownType = 'none';

  // Military Workshop (Warlord, XuanYuan building): upgrades any normal unit trained,
  // garrisoned in, or fighting from the city — not race-gated, per the "any defending units
  // of the city" + "base normal units" changelog wording. Heroes and fantastic creatures are
  // excluded. Combat-relevant effects, reconciled to the latest patch (1.5.12.5):
  //   - Small Physical Ranged (missile) projectiles upgrade to Heavy Physical Ranged (boulder,
  //     gunpowder), bypassing Missile Immunity — applied here so all downstream logic treats
  //     the attack as a boulder (original 1.5.4.1 effect, still in the helptext).
  //   - Physical ranged or thrown attack gains Armor Piercing, unless the unit has a Doom
  //     attack — Armor Piercing is wasted on Doom (it already ignores armor), so it gets +2
  //     ranged/thrown strength instead (patch 1.5.9.5). Folded in below.
  //   - Fire Breath attack: +4 strength (patch 1.5.7.4, up from the original +2).
  //   - +1 Poison: boosts an existing poison attack, or grants Poison 1 if it has none.
  const militaryWorkshop = version.startsWith('com2_warlord')
    && !!abilities.militaryWorkshop && isNormalUnitType(unitTypeVal);
  if (militaryWorkshop && rangedType === 'missile') {
    rangedType = 'boulder';
  }

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
  const lightningBladeAbil = version.startsWith('com2_warlord') && !!abilities.lightningBlade
    && isNormalUnitType(unitTypeVal);
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
  // Otherwise, a thrown or physical ranged (missile/boulder) attack is converted
  // into Sorcery magical ranged, with a minimum strength of 3. If nothing qualifies,
  // the unit gains strength-3 Sorcery magical ranged. (All versions convert boulder:
  // CoM1 lists "missile", Warlord lists "Physical Ranged" — boulder is physical ranged.)
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
      && (rangedType === 'missile' || rangedType === 'boulder');
    const convertedStrength = (canConvertThrown || canConvertRanged) ? Math.max(calcBaseRtb, 3) : 3;
    rangedType = 'magic_s';
    thrownType = 'none';
    calcBaseRtb = convertedStrength;
  }

  // Warlord Vampirism: all thrown and breath attacks transfer to melee. Melee gains
  // (thrown/breath strength − 1) and the thrown/breath strength drops to 1 (the residual
  // attack still hits flyers and still triggers Blood Sucker on its own phase). Strength is
  // conserved. Per the Warlord manual (melee += strength − 1); the in-game helptext instead
  // transfers half ("Half of its Thrown and Breath Attacks strength is transferred to
  // melee") — a source disagreement the developer resolved in favour of the manual. Applies
  // only to thrown/breath (thrownType), not magical/missile ranged.
  const vampirismActive = !!(abilities && abilities.vampirism) && version.startsWith('com2_warlord');
  if (vampirismActive && thrownType !== 'none' && calcBaseRtb > 0) {
    calcBaseAtk += Math.max(0, calcBaseRtb - 1);
    calcBaseRtb = 1;
  }

  // Warlord Shadow Strike: adds a Thrown attack at 1 + 1/3 of base melee strength (rounded down).
  // A unit that already has a Thrown attack instead gains 1 + 1/3 of base melee as additional
  // Thrown strength. Calculated from the base attack value, mirroring Colossal Strength's
  // "1 + fraction, resolve at the end of unit calculation" convention — the leading +1 keeps a
  // low-melee unit from being granted a strength-0 thrown. Because Thrown is a separate pre-melee
  // phase, per-hit riders (Poison, Life Steal, Blood Sucker) fire on both the thrown and the
  // melee phase — that double trigger falls out naturally from the granted thrown phase.
  // The single-rtb model can't hold a second attack, so units that already carry a missile,
  // magic ranged, or breath attack keep that attack and gain no thrown here.
  const shadowStrikeActive = !!(abilities && abilities.shadowStrike) && version.startsWith('com2_warlord');
  const shadowStrikeBonus = shadowStrikeActive && calcBaseAtk > 0 ? 1 + Math.floor(calcBaseAtk / 3) : 0;
  // Strength of a freshly granted thrown (melee-only unit). Folded into the reported baseRtb so
  // touch dispatch (touchAttackFires checks baseRtb > 0) treats the granted thrown as a real
  // base thrown and fires Poison / Life Steal / Blood Sucker on its phase. The boost-existing
  // case needs no such bump — that unit already has baseRtb > 0.
  let shadowStrikeGrantedBaseRtb = 0;
  if (shadowStrikeBonus > 0) {
    if (thrownType === 'thrown') {
      calcBaseRtb += shadowStrikeBonus;
    } else if (thrownType === 'none' && rangedType === 'none') {
      thrownType = 'thrown';
      calcBaseRtb = shadowStrikeBonus;
      shadowStrikeGrantedBaseRtb = shadowStrikeBonus;
    }
  }

  // Warlord Blaze of Glory: the unit's Ranged attack (missile/boulder/magic) becomes a Thrown
  // attack of the same strength (it loses the Ranged attack and Ammo, neither of which the model
  // tracks separately). Breath and existing thrown attacks are not "Ranged" and are untouched.
  // The Armor→Melee transfer, Armor Piercing grant, and First Strike loss are handled below.
  // Blaze of Glory targets a friendly non-hero unit (normal or fantastic); heroes are exempt.
  const blazeOfGloryActive = !!(abilities && abilities.blazeOfGlory)
    && version.startsWith('com2_warlord') && unitTypeRaw !== 'hero';
  if (blazeOfGloryActive && calcBaseRtb > 0
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s')) {
    rangedType = 'none';
    thrownType = 'thrown';
  }

  // Military Workshop derived bonuses (see the gate above). Evaluated here, after the
  // ranged/thrown type conversions (Chaos Channels, Focus Magic, Vampirism), so they read the
  // final attack type — e.g. a missile converted to magic by Focus Magic no longer qualifies
  // as physical ranged. The missile→boulder projectile upgrade was already applied above.
  const militaryWorkshopHasRangedOrThrown = militaryWorkshop && calcBaseRtb > 0
    && (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown');
  // Doom attack: Armor Piercing is wasted (Doom ignores armor), so grant +2 strength instead.
  const militaryWorkshopGrantsAP = militaryWorkshopHasRangedOrThrown
    && !abilities.doom && !abilities.armorPiercing;
  const militaryWorkshopRtbMod = militaryWorkshopHasRangedOrThrown && !!abilities.doom ? 2 : 0;
  // Fire Breath: +4 strength.
  const militaryWorkshopFireBreathRtbMod = militaryWorkshop && calcBaseRtb > 0 && thrownType === 'fire' ? 4 : 0;
  // +1 Poison, applied on top of any existing poison (including the Gnoll Altar grants below).
  const militaryWorkshopBasePoison = altarHunter ? 2 : (altarWitchdoctor ? 0 : (abilities.poison || 0));

  // Warlord Venom enchantment: +1 Poison (boosting any existing/granted poison, or granting
  // Poison 1 if the unit has none) plus Poison Immunity. The base it boosts mirrors the final
  // poison precedence of the spreads below (last-wins: motherFungus > militaryWorkshop > altars).
  const venom = version.startsWith('com2_warlord') && !!(abilities && abilities.venom);
  const venomBasePoison =
      motherFungus ? (abilities.poison || 0) + 1
    : militaryWorkshop ? militaryWorkshopBasePoison + 1
    : altarWitchdoctor ? 0
    : altarHunter ? 2
    : (abilities.poison || 0);

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
    ...(militaryWorkshopGrantsAP ? { armorPiercing: true } : {}),
    ...(blazeOfGloryActive ? { armorPiercing: true, firstStrike: false } : {}),
    ...(militaryWorkshop ? { poison: militaryWorkshopBasePoison + 1 } : {}),
    ...(motherFungus ? { poison: (abilities.poison || 0) + 1 } : {}),
    ...(venom ? { poison: venomBasePoison + 1, poisonImmunity: true } : {}),
    // Rust on a fantastic creature is inert: drop it so the -3 melee in combat.js (which
    // can't see unit type) and any downstream reads treat the unit as un-rusted.
    ...((abilities && abilities.rust && !rustActive) ? { rust: false } : {}),
    ...((abilities && abilities.eyeOfHeaven) ? { illusionImmunity: true } : {}),
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
  const isCoM2Version = version.startsWith('com2');
  const isWarlord = version.startsWith('com2_warlord');
  const ownEternalNight = !!(abilities && abilities.eternalNight) || !!input.eternalNight;
  const enemyEternalNight = !!input.enemyEternalNight;
  const hasAnyEternalNight = ownEternalNight || enemyEternalNight;
  // Enemy Eye of Heaven strips this unit's gaze attacks (the opponent gains True Sight).
  const enemyEyeOfHeaven = !!input.enemyEyeOfHeaven;
  const hasDarkness = !!input.darkness || legacyLightDarkVal === 'darkness' || hasAnyEternalNight;
  // True Light was removed in CoM 1 & 2, but Warlord re-introduces it as a Life
  // common combat enchantment — so enable it for MoM (non-CoM) and Warlord only.
  const hasTrueLight = (!!input.trueLight || legacyLightDarkVal === 'trueLight') && (!isCoMVersion || isWarlord);
  const darknessAtkDefMagnitude = hasDarkness ? (hasAnyEternalNight && isCoM2Version ? 2 : 1) : 0;
  const darknessResMagnitude = hasDarkness ? 1 : 0;
  const eternalNightEnemyResPenalty = enemyEternalNight && isCoMVersion && unitRealm !== 'death' ? -1 : 0;
  // Warlord Eternal Night ("Poor Vision"): enemy non-Death units suffer -2 to ranged
  // attack strength (missile/boulder and magic ranged). Thrown and breath are
  // short-range and not affected. (Per helptext: "-2 Ranged Attack power".)
  const warlordEternalNightActive = enemyEternalNight && isWarlord && unitRealm !== 'death';
  const eternalNightRtbMod = warlordEternalNightActive
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s') ? -2 : 0;
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
  // RTB bonus (+3) applies to non-magical ranged (missile/boulder) in all versions.
  // Thrown gets the bonus only in MoM; CoM/CoM2/Warlord drop the thrown bonus.
  const lionheartActive = !!(abilities && abilities.lionheart);
  const lionheartHpMod = lionheartActive
    ? (version.startsWith('mom') ? 3 : Math.floor(8 / baseFigs))
    : 0;
  const lionheartRtbMod = lionheartActive
    && (rangedType === 'missile' || rangedType === 'boulder'
        || (thrownType === 'thrown' && version.startsWith('mom'))) ? 3 : 0;
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

  // Soul Flay (Warlord, Death rare combat curse): irresistible curse on normal units
  // or heroes. Penalises stats by −1 melee, −2 armor and −2 resistance per experience
  // level of the target. Experience level counts Recruit (the calculator's "normal") as
  // level 1, so the multiplier is levelRank + 1: Recruit −1/−2/−2, Elite −4/−8/−8.
  // Fantastic creatures are not valid targets and take no penalty.
  const soulFlayActive = version.startsWith('com2_warlord')
    && !!(abilities && abilities.soulFlay)
    && !String(unitTypeRaw || '').startsWith('fantastic_');
  const soulFlayLevels = soulFlayActive ? levelRank + 1 : 0;
  const soulFlayAtkMod = -1 * soulFlayLevels;
  const soulFlayDefMod = -2 * soulFlayLevels;
  const soulFlayResMod = -2 * soulFlayLevels;

  // Plague (Warlord combat curse): inflicted by the Pestilence city curse on defending
  // garrison units, by the Plague Lord unit ability, and by the Plague Lord artifact power.
  // −3 attack, −3 armor, −6 resistance and −10% To-Hit for the rest of combat, on any
  // affected unit (no fantastic exclusion). The To-Hit penalty is applied below.
  const plagueActive = version.startsWith('com2_warlord') && !!(abilities && abilities.plague);
  const plagueAtkMod = plagueActive ? -3 : 0;
  const plagueDefMod = plagueActive ? -3 : 0;
  const plagueResMod = plagueActive ? -6 : 0;

  // Pox Host (Warlord global combat debuff): a Goblin Poxbearer unit present on the
  // battlefield spreads Goblin Pox to every unit, with the effect varying by race.
  // Goblin units suffer −1 attack, −1 armor (no resistance penalty); non-Goblin units
  // suffer −3 attack, −3 armor, −1 resistance. No To-Hit penalty, unlike Plague. Per the
  // in-game helptext (GOBLIN POX spell and POX HOST UA), which lists no Goblin resistance
  // penalty and only −1 resistance for non-Goblins; the Warlord manual instead gives
  // −1/−3 resistance — a source disagreement resolved in favour of the helptext. Read from
  // the global toggle; the unit's race (empty on custom units) determines which branch applies.
  const poxHostActive = version.startsWith('com2_warlord') && !!input.poxHost;
  const poxHostIsGoblin = unitRace === 'Goblin';
  const goblinPoxAtkMod = poxHostActive ? (poxHostIsGoblin ? -1 : -3) : 0;
  const goblinPoxDefMod = poxHostActive ? (poxHostIsGoblin ? -1 : -3) : 0;
  const goblinPoxResMod = poxHostActive ? (poxHostIsGoblin ? 0 : -1) : 0;

  // Great Unbinding (Warlord Sorcery very rare global): debuffs opponent fantastic
  // creatures in combat with −20% To-Hit, −20% To-Defend and −2 Resistance for the
  // rest of battle. Only fantastic creatures are affected (the Confusion half of the
  // spell is not modelled here). The To-Hit/To-Defend penalties are applied in the
  // toHit/toBlock section below; here we handle the −2 Resistance.
  const greatUnbindingActive = version.startsWith('com2_warlord')
    && !!(abilities && abilities.greatUnbinding)
    && String(unitTypeRaw || '').startsWith('fantastic_');
  const greatUnbindingResMod = greatUnbindingActive ? -2 : 0;

  // Natural Selection (Warlord Nature common global): units trained in a city gain
  // bonuses from resources in the city's surroundings. Each resource is an independent
  // toggle on the trained unit:
  //   Coal → +1 melee; Iron → +1 armor; Wild game → +1 ranged attack (+ Forester);
  //   Nightshade → +1 resistance; Power minerals → +N resistance (the numeric input
  //   holds the resistance bonus directly).
  // Forester is a terrain/movement perk with no combat effect, so only the +1 ranged
  // attack from Wild game is reflected in the stats.
  const naturalSelectionCoalMod = isWarlord && !!(abilities && abilities.coal) ? 1 : 0;
  const naturalSelectionIronMod = isWarlord && !!(abilities && abilities.iron) ? 1 : 0;
  const naturalSelectionNightshadeMod = isWarlord && !!(abilities && abilities.nightshade) ? 1 : 0;
  // Nature Link (Warlord rename of Land Linking): grants +1 resistance to any unit
  // (normal or fantastic). The fantastic-only +2 melee/def/breath is handled with Land Linking.
  const natureLinkResMod = isWarlord && !!(abilities && abilities.landLinking) ? 1 : 0;
  const naturalSelectionPowerMineralsMod = isWarlord && isNormalUnitType(unitTypeVal)
    ? Math.max(0, parseInt(abilities.powerMinerals) || 0)
    : 0;

  // Survival Instinct (Warlord addition): newly trained normal units gain a small
  // +3% to +7% To-Defend from gold-producing resources in the city's surroundings.
  // The numeric input holds that To-Defend percentage; applied to normal units only
  // (the fantastic-creature buff is the separate survivalInstinct checkbox).
  const survivalInstinctToBlkBonus = isWarlord && isNormalUnitType(unitTypeVal)
    ? Math.max(0, parseInt(abilities.survivalInstinctToBlock) || 0)
    : 0;

  // Orihalcon: +1 resistance, +2 magical ranged attack (CoM2 only).
  const orihalconActive = armor === 'orihalcon';
  const orihalconResMod = orihalconActive ? 1 : 0;
  const orihalconRtbMod = orihalconActive
    && (rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s') ? 2 : 0;

  // Wall of Fire garrison boost (Warlord): the city enchantment grants +1 to all
  // defending normal-unit non-magic attacks, mirroring the original game's Metal
  // Fires. Modelled as a per-unit enchantment so it can apply to whichever side is
  // the garrison; gated to normal units only. Covers melee, physical ranged
  // (missile/boulder), and thrown — but not magic ranged or breath. Like Metal Fires
  // it also upgrades a normal weapon to magic (bypasses Weapon Immunity) — applied to
  // effectiveWeapon below. (The fire-line damage to attackers crossing the wall is the
  // separate global Wall of Fire toggle, handled in combat.js.)
  const wofDefenderBonusActive = isWarlord && !!(abilities && abilities.wallOfFireBoost)
    && isNormalUnitType(unitTypeVal);
  const wofDefenderAtkMod = wofDefenderBonusActive ? 1 : 0;
  const wofDefenderRtbMod = wofDefenderBonusActive
    && (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown') ? 1 : 0;

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
  } else if (fbAtkBonus > 0) {
    // MoM Flame Blade / Metal Fires boost missile and thrown; CoM Flame Blade
    // boosts missile only (the CoM helptext drops the thrown bonus — Warlord, handled
    // above, re-adds it). Metal Fires is MoM-only so the CoM gate only affects Flame Blade.
    const fbThrownEligible = !(abilities.flameBlade && isCoMVersion);
    if (rangedType === 'missile' || (fbThrownEligible && thrownType === 'thrown')) {
      fbRtbMod = fbAtkBonus;
    }
  }
  if (ffRegularBonus) {
    let ffRtb = 0;
    if (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown') ffRtb = 2;
    fbRtbMod = Math.max(fbRtbMod, ffRtb);
  }
  // Fiery Fury melee +3 for regular units; non-cumulative with Flame Blade (combat.js
  // already adds +3 melee for flameBlade in CoM/Warlord via getAbilityStatModifiers).
  const ffMeleeBonus = ffRegularBonus && !abilities.flameBlade ? 3 : 0;

  const ludusAgogeAtkMod = ludusAgoge ? 1 : 0;
  const motherFungusAtkMod = motherFungus ? 2 : 0;
  const altarOfTheSunMeleeMod = altarOfTheSunHolyMother ? 1 : 0;
  // Warlord Colossal Strength: +1 + 40% (rounded down) of base Melee, Physical Ranged, and
  // Thrown attack strength. Calculated from base attack values; resolves at the end of unit
  // calculation. Melee bonus below; the Physical-Ranged/Thrown bonus is applied to rtb.
  // Breath and magic ranged are not "physical ranged" and do not qualify.
  const colossalStrength = isWarlord && !!(abilities && abilities.colossalStrength);
  const colossalMeleeMod = colossalStrength && calcBaseAtk > 0 ? 1 + Math.floor(0.4 * calcBaseAtk) : 0;
  const colossalRtbApplies = colossalStrength && calcBaseRtb > 0
    && (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown');
  const colossalRtbMod = colossalRtbApplies ? 1 + Math.floor(0.4 * calcBaseRtb) : 0;
  const atk = calcBaseAtk > 0 ? Math.max(0, calcBaseAtk + lvl.atk + wpn.atk + abilMods.atkMod + disciplineAtkMod + wofDefenderAtkMod + ludusAgogeAtkMod + motherFungusAtkMod + altarOfTheSunMeleeMod + colossalMeleeMod + nodeBonus + darkLightAtkBonus + chaosSurgeMeleeBonus + ffMeleeBonus + soulFlayAtkMod + plagueAtkMod + goblinPoxAtkMod + naturalSelectionCoalMod) : 0;
  const dragonMoundDefMod = dragonMound ? 1 : 0;
  const poolOfRepentanceDefMod = poolOfRepentance ? 1 : 0;
  const defBase = Math.max(0, calcBaseDef + lvl.def + wpn.def + cityWallBonus + abilMods.defMod + enduranceDefMod + disciplineDefMod + supremeLightDefMod + dragonMoundDefMod + poolOfRepentanceDefMod + nodeBonus + darkLightDefBonus + soulFlayDefMod + plagueDefMod + goblinPoxDefMod + naturalSelectionIronMod);
  // Holy Armor: MoM: +2 defense. CoM/CoM2: +2 defense if def ≤ 5; +10% To Block if def > 5.
  const holyArmorActive = !!(abilities && abilities.holyArmor);
  const holyArmorHighDef = holyArmorActive && isCoMVersion && defBase > 5;
  const holyArmorDefBonus = holyArmorActive && !holyArmorHighDef ? 2 : 0;
  const holyArmorToBlkBonus = holyArmorHighDef ? 10 : 0;
  const def = defBase + holyArmorDefBonus;
  // Blaze of Glory: Melee gains the unit's full current Armor, and the unit loses all of its
  // base Armor — only Armor granted by other enchantments remains. Sum the enchantment-derived
  // defense contributions to find the surviving Armor; the rest (base + level + weapon + city
  // walls) is what transfers away. The melee gain is folded into finalAtk below so it behaves
  // like normal melee under Haste/Shatter/Warp.
  const blazeEnchantArmor = blazeOfGloryActive
    ? Math.max(0, abilMods.defMod + enduranceDefMod + disciplineDefMod + supremeLightDefMod
        + dragonMoundDefMod + poolOfRepentanceDefMod + nodeBonus + darkLightDefBonus + holyArmorDefBonus)
    : 0;
  const blazeMeleeBonus = blazeOfGloryActive ? def : 0;
  // Altar of the Moon: trained units gain +1 Resistance (all units, not just ranged).
  const altarOfTheMoonResMod = altarOfTheMoon ? 1 : 0;
  const ludusAgogeResMod = ludusAgoge ? 1 : 0;
  const poolOfRepentanceResMod = poolOfRepentance ? 1 : 0;
  const sanctaBasilicaResMod = sanctaBasilica ? 3 : 0;
  // Pillar of Faith (Warlord, Life rare city enchantment): +1 Resistance per Religious Building
  // in the training city, capped at +8. The numeric input holds the building count.
  const pillarOfFaithResMod = isWarlord && isNormalUnitType(unitTypeVal)
    ? Math.min(8, Math.max(0, parseInt(abilities.pillarOfFaithRes) || 0))
    : 0;
  const res = Math.max(0, calcBaseRes + lvl.res + abilMods.resMod + altarOfTheMoonResMod + ludusAgogeResMod + poolOfRepentanceResMod + sanctaBasilicaResMod + pillarOfFaithResMod + orihalconResMod + nodeBonus + darkLightResBonus + chaosSurgeResBonus + soulFlayResMod + plagueResMod + goblinPoxResMod + greatUnbindingResMod + naturalSelectionNightshadeMod + naturalSelectionPowerMineralsMod + natureLinkResMod);
  const ludusAgogeHpMod = ludusAgoge ? 1 : 0;
  const hp  = Math.max(1, calcBaseHP + lvl.hp + abilMods.hpMod + lionheartHpMod + enduranceHpMod + charmOfLifeHpMod + ludusAgogeHpMod);

  // Blazing March: +3 to missile only (not boulder, magic ranged, or breath).
  // Warlord also boosts thrown.
  const blazingMarchActive = !!(abilities && abilities.blazingMarch);
  const blazingMarchBoostsThrown = version.startsWith('com2_warlord') && thrownType === 'thrown';
  const blazingMarchRtbMod = blazingMarchActive && (rangedType === 'missile' || blazingMarchBoostsThrown) ? 3 : 0;

  // Natural Selection — Wild game: +1 ranged attack on physical ranged (missile/boulder)
  // and magic ranged. Thrown and breath are not "ranged attacks" for this bonus.
  const naturalSelectionWildGameRtbMod = isWarlord && !!(abilities && abilities.wildGame)
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s') ? 1 : 0;

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

  // Dragon Mound (Warlord): +2 to an existing fire breath attack.
  const dragonMoundRtbMod = dragonMound && thrownType === 'fire' ? 2 : 0;

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

  // Rust (Warlord Chaos common combat curse): -3 to Physical Ranged Attack (missile/boulder),
  // mirroring the -3 melee penalty applied in combat.js. Magic ranged, fire/lightning breath,
  // and thrown are excluded (thrown is eliminated entirely above).
  const rustRtbMod = (rustActive && (rangedType === 'missile' || rangedType === 'boulder')) ? -3 : 0;

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
  const rtb = calcBaseRtb > 0 ? Math.max(0, calcBaseRtb + rtbLvl + rtbWpn + abilMods.rtbMod + disciplineRtbMod + fbRtbMod + wofDefenderRtbMod + blazingMarchRtbMod + naturalSelectionWildGameRtbMod + chaosSurgeRtbMod + focusMagicRtbMod + reinforceMagicRtbMod + misleadRtbMod + supremeLightRtbMod + altarOfTheMoonRtbMod + landLinkingBreathRtbMod + dragonMoundRtbMod + militaryWorkshopRtbMod + militaryWorkshopFireBreathRtbMod + orihalconRtbMod + gsRtbMod + lionheartRtbMod + weaknessRtbMod + rustRtbMod + colossalRtbMod + eternalNightRtbMod + nodeBonus + darkLightAtkBonus) : 0;

  // Hidden gaze ranged attack: affected by same modifiers as ranged (level, node aura,
  // darkness/light, ability mods) but NOT weapon bonuses. In v1.31, if reduced to 0 the
  // gaze attack does not fire.
  const gazeOverwrittenByCC = ccFireBreathActive && ccCanOverwriteSpecial && hasGazeAttack;
  const gazeDisabled = gazeOverwrittenByCC || enemyEyeOfHeaven;
  const baseGazeRanged = gazeDisabled ? 0 : ((abilities && abilities.gazeRanged) || 0);
  const effectiveGazeRanged = baseGazeRanged > 0
    ? Math.max(0, baseGazeRanged + lvl.ranged + abilMods.rtbMod + nodeBonus + darkLightAtkBonus)
    : 0;

  // Doom Gaze: delivers exact doom damage. Affected by node aura, darkness/light,
  // and ability modifiers (e.g. Black Prayer), but NOT level or weapon bonuses.
  const baseDoomGaze = gazeDisabled ? 0 : (effectiveAbilities.doomGaze || 0);
  const chaosSurgeDoomGazeMod = version.startsWith('mom') ? chaosSurgeRtbBonus : 0;
  const effectiveDoomGaze = baseDoomGaze > 0
    ? Math.max(0, baseDoomGaze + abilMods.rtbMod + (focusMagicBuffsExisting && isCoM2 ? 3 : 0) + nodeBonus + darkLightAtkBonus + chaosSurgeDoomGazeMod)
    : 0;

  const combatAbilitiesBase = combatDisciplineNegatesFirstStrike
    ? { ...effectiveAbilities, negateFirstStrike: true }
    : effectiveAbilities;
  let combatAbilities = gazeDisabled
    ? { ...combatAbilitiesBase, gazeRanged: 0, stoningGaze: null, deathGaze: null, doomGaze: 0 }
    : combatAbilitiesBase;
  // Rust eliminates Large Shield for the rest of combat.
  if (rustActive && combatAbilities.largeShield) {
    combatAbilities = { ...combatAbilities, largeShield: false };
  }
  // Hierophany (Warlord Life uncommon combat curse): the landed curse strips the target's
  // immunities, Lightning Resist, and Negate First Strike (mobility perks are not combat-
  // damage-relevant here). The half-Defense penalty is applied to finalDef below. The
  // calculator models only the landed outcome, so the strip is unconditional when active.
  if (isWarlord && combatAbilities.hierophany) {
    combatAbilities = {
      ...combatAbilities,
      weaponImmunity: false,
      missileImmunity: false,
      magicImmunity: false,
      deathImmunity: false,
      fireImmunity: false,
      coldImmunity: false,
      illusionImmunity: false,
      poisonImmunity: false,
      stoningImmunity: false,
      lightningResist: false,
      negateFirstStrike: false,
    };
  }

  // To Hit percentage bonuses
  const meleeToHitBonus = lvl.toHit + wpn.toHit + abilMods.toHitMod + hwMeleeToHit;
  const rtbToHitWpn = rangedGetsWpn ? wpn.toHit : 0;

  // Distance penalty (attacker ranged only)
  let rtbDistPenalty = 0;
  if (prefix === 'a' && (rangedType === 'missile' || rangedType === 'boulder') && input.rangedCheck) {
    const dist = Math.max(1, parseInt(input.rangedDist) || 1);
    rtbDistPenalty = distancePenalty(dist, rangedType, !!(abilities && abilities.longRange), version);
  }

  // Pre-clamped To Hit/Block values for combat (decimals 0.1-1.0)
  let toHitMelee = clampPct(30, baseToHitMod + meleeToHitBonus);
  let toHitRtb = clampPct(30, baseToHitRtbMod + lvl.toHit + rtbToHitWpn + rtbDistPenalty + abilMods.toHitMod + hwRtbToHit);
  const motherFungusToBlkBonus = motherFungus ? 10 : 0;
  let toBlock = clampPct(30, baseToBlkMod + abilMods.toBlkMod + holyArmorToBlkBonus + motherFungusToBlkBonus + survivalInstinctToBlkBonus);
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

  // Hurricane (Warlord Nature rare, global): tropical storm affecting both sides.
  // -20% To Hit for ranged/thrown attacks, -30% To Hit for breath attacks.
  // Breath is identified by thrownType fire/lightning; that is the only case toHitRtb
  // represents a breath attack (ranged attacks are never breath). Melee is unaffected.
  const hurricaneActive = !!input.hurricane;
  const hurricaneRtbPenalty = (thrownType === 'fire' || thrownType === 'lightning') ? 0.3 : 0.2;
  if (hurricaneActive) {
    toHitRtb = Math.max(0.1, toHitRtb - hurricaneRtbPenalty);
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

  // Berserk: two distinct mechanics, modelled as separate abilities.
  // 'berserk' (MoM Death spell, UI-gated to MoM versions): doubles melee attack
  // (applied last, after all other bonuses) and sets defense to 0 absolutely (no
  // other bonus can raise it while Berserk is active). Removed in CoM/CoM2.
  // 'berserkWarlord' (Warlord Troll Medicineman buff, UI-gated to Warlord): +15% To
  // Hit, +1 combat movement (irrelevant here), and -10% To Block. No atk-doubling
  // and no def-zeroing.
  const classicBerserk = !!(abilities && abilities.berserk) && version.startsWith('mom');
  const warlordBerserk = !!(abilities && abilities.berserkWarlord) && isWarlord;
  let finalAtk = (classicBerserk ? atk * 2 : atk) + blazeMeleeBonus;
  let finalDef = blazeOfGloryActive ? blazeEnchantArmor : (classicBerserk ? 0 : def);
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

  // Conjuring Pact nausea (Warlord Conjurer retort): a non-fantastic unit struck by
  // Conjuring Pact suffers -10% To Hit and -10% To Defend for the rest of combat.
  // Only the normal-unit debuff is modelled here (the fantastic-creature taming
  // branch is out of scope), so gate to Warlord and to normal units.
  if (isWarlord && abilities && abilities.nausea && isNormalUnitType(unitTypeVal)) {
    toHitMelee = Math.max(0.1, toHitMelee - 0.1);
    toHitRtb = Math.max(0.1, toHitRtb - 0.1);
    displayToHitMelee = Math.max(0.1, displayToHitMelee - 0.1);
    displayToHitRtb = Math.max(0.1, displayToHitRtb - 0.1);
    toBlock = Math.max(0.0, toBlock - 0.1);
    displayToBlock = Math.max(0.0, displayToBlock - 0.1);
  }

  // Plague (Warlord combat curse): −10% To-Hit on the cursed unit (the −3/−3/−6 stat
  // penalties are folded into atk/def/res above). Goblin Pox carries no To-Hit penalty.
  if (plagueActive) {
    toHitMelee = Math.max(0.1, toHitMelee - 0.1);
    toHitRtb = Math.max(0.1, toHitRtb - 0.1);
    displayToHitMelee = Math.max(0.1, displayToHitMelee - 0.1);
    displayToHitRtb = Math.max(0.1, displayToHitRtb - 0.1);
  }

  // Great Unbinding (Warlord Sorcery very rare global): −20% To-Hit and −20% To-Defend
  // on opponent fantastic creatures for the rest of battle (the −2 Resistance is folded
  // into res above). Only fantastic creatures are affected.
  if (greatUnbindingActive) {
    toHitMelee = Math.max(0.1, toHitMelee - 0.2);
    toHitRtb = Math.max(0.1, toHitRtb - 0.2);
    displayToHitMelee = Math.max(0.1, displayToHitMelee - 0.2);
    displayToHitRtb = Math.max(0.1, displayToHitRtb - 0.2);
    toBlock = Math.max(0.0, toBlock - 0.2);
    displayToBlock = Math.max(0.0, displayToBlock - 0.2);
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

  // Beat of Swiftness (Warlord Chaos rare combat enchantment): friendly units lose
  // 10% of their Armor as a penalty for the movement boost. Only the armor part is
  // modelled (combat movement is out of scope for the calculator).
  if (abilities && abilities.beatOfSwiftness) {
    finalDef = Math.floor(finalDef * 0.9);
  }

  // Hierophany (Warlord Life uncommon combat curse): the landed curse removes half the
  // target's Defense (its immunities, Lightning Resist, and Negate First Strike are stripped
  // from combatAbilities above).
  if (isWarlord && abilities && abilities.hierophany) {
    finalDef = Math.floor(finalDef * 0.5);
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
    plagueActive ? -10 : 0,
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
    hurricaneActive ? -(hurricaneRtbPenalty * 100) : 0,
    plagueActive ? -10 : 0,
  ]);
  const toBlockHasModifiers = anyNonZero([
    baseToBlkMod,
    abilMods.toBlkMod,
    holyArmorToBlkBonus,
    motherFungusToBlkBonus,
    (vertigoActive && version.startsWith('com')) ? -10 : 0,
  ]);

  return {
    // Base values (for display)
    baseAtk: inputBaseAtk, baseRtb: inputBaseRtb + shadowStrikeGrantedBaseRtb, baseDef: inputBaseDef, baseRes: inputBaseRes, baseHP: inputBaseHP,
    baseToHitMod, baseToHitRtbMod, baseToBlkMod,
    // Bonus breakdown (for display)
    atkBonus: finalAtk - inputBaseAtk,
    rtbBonus: finalRtb - inputBaseRtb - shadowStrikeGrantedBaseRtb,
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
    figs: baseFigs + (altarOfTheSun ? 1 : 0),
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

