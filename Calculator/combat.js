// --- Combat Resolution ---
// Pure functions with no DOM dependencies. Depends on engine.js.

// Ability accessors — guard against absent abilities objects.
function hasAbil(ab, key) { return !!(ab && ab[key]); }
function abilVal(ab, key, def) { return (ab && ab[key] != null) ? ab[key] : def; }
function abilDefined(ab, key) { return ab != null && ab[key] != null; }

// Clamp a percentage to 10%-100% (MoM rules: always at least 10%, at most 100%)
// PROVENANCE[clampPct]: UNVERIFIED versions=all; gap=exact per-version implementation clamp range not matched; pointer=Reference docs/DOS reconstructed/unitcalc.c
// STAT-FORMULA[clampPct]
function clampPct(base, mod) {
  return Math.min(1.0, Math.max(0.1, (base + mod) / 100));
}

// CoM2: remaining HP of the wounded top figure in a stack.
// If remHP is an exact multiple of hpPerFig, all figures are at full HP → return hpPerFig.
// STAT-FORMULA[woundedTopFigureHp]
// PROVENANCE[woundedTopFigureHp]: UNVERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; gap=wounded top-figure HP remainder formula lacks an exact implementation range; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
function woundedTopFigHP(remHP, hpPerFig) {
  return remHP % hpPerFig || hpPerFig;
}

// Weapon type bonuses: { atk, def, toHit }
// Magical/Mithril/Adamantium: +10% To Hit (melee, missile, boulder only)
// Mithril: +1 atk (melee, missile, boulder, thrown), +1 def
// Adamantium: +2 atk (same types), +2 def
// PROVENANCE[weaponBonusFunction]: UNVERIFIED versions=all; gap=material dispatch and default behavior are not tied to one exact implementation gate across every engine; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
// STAT-FORMULA[weaponBonusFunction]
function weaponBonus(type) {
  switch (type) {
    // STAT-FORMULA[weaponBonus:magic]
    // PROVENANCE[weaponBonus:magic]: UNVERIFIED versions=all; gap=material gate and To-Hit arithmetic are not fully matched across every engine and runtime table; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    case 'magic':      return { atk: 0, def: 0, toHit: 10 };
    // STAT-FORMULA[weaponBonus:mithril]
    // PROVENANCE[weaponBonus:mithril]: UNVERIFIED versions=all; gap=material gate and attack/defense/To-Hit arithmetic are not fully matched across every engine and runtime table; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    case 'mithril':    return { atk: 1, def: 1, toHit: 10 };
    // STAT-FORMULA[weaponBonus:adamantium]
    // PROVENANCE[weaponBonus:adamantium]: UNVERIFIED versions=all; gap=material gate and attack/defense/To-Hit arithmetic are not fully matched across every engine and runtime table; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    case 'adamantium': return { atk: 2, def: 2, toHit: 10 };
    default:           return { atk: 0, def: 0, toHit: 0 };
  }
}

// Level bonuses vary by game version.
// CoM2 and Warlord are confirmed against their own Levelbonus.INI `[Normal]` sections — every
// value below matches (see `Reference docs/CoM2 data tables.md`, *Level bonuses*). Level 1
// (`Recruit`) is all zeros, so it maps to 'normal' here and the ladder starts at 'regular'.
// Note this ladder is applied to heroes too, though Levelbonus.INI gives them a separate
// 9-step `[Hero]` table with a different shape — tracked as D27.
// PROVENANCE[levelBonusDispatch]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:2553-2590 | Reference docs/DOS reconstructed/unitcalc.c:1570-1609 | Reference docs/DOS reconstructed/unitcalc.c:2593-2631 | TABLE=Reference docs/DOS reconstructed/unitcalc.c:2323-2329 | Reference docs/DOS reconstructed/unitcalc.c:1425-1464 | Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:129-158 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:129-158
// STAT-FORMULA[levelBonusDispatch]
function getLevelBonuses(level, version) {
  const isMoM = version.startsWith('mom_');
  const isWarlord = version.startsWith('com2_warlord');
  if (isMoM) {
    switch (level) {
      // STAT-FORMULA[levelBonuses:mom:regular]
      // PROVENANCE[levelBonuses:mom:regular]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:2553-2590 | Reference docs/DOS reconstructed/unitcalc.c:1570-1609
      case 'regular':    return { atk: 1, ranged: 1, thrown: 1, def: 0, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:mom:veteran]
      // PROVENANCE[levelBonuses:mom:veteran]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:2553-2590 | Reference docs/DOS reconstructed/unitcalc.c:1570-1609
      case 'veteran':    return { atk: 1, ranged: 1, thrown: 1, def: 1, res: 2, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:mom:elite]
      // PROVENANCE[levelBonuses:mom:elite]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:2553-2590 | Reference docs/DOS reconstructed/unitcalc.c:1570-1609
      case 'elite':      return { atk: 2, ranged: 2, thrown: 2, def: 1, res: 3, hp: 1, toHit: 10 };
      // STAT-FORMULA[levelBonuses:mom:ultraElite]
      // PROVENANCE[levelBonuses:mom:ultraElite]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:2553-2590 | Reference docs/DOS reconstructed/unitcalc.c:1570-1609
      case 'ultra_elite':return { atk: 2, ranged: 2, thrown: 2, def: 2, res: 4, hp: 1, toHit: 20 };
      // STAT-FORMULA[levelBonuses:mom:champion]
      // PROVENANCE[levelBonuses:mom:champion]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:2553-2590 | Reference docs/DOS reconstructed/unitcalc.c:1570-1609
      case 'champion':   return { atk: 3, ranged: 3, thrown: 3, def: 2, res: 5, hp: 2, toHit: 30 };
      default:           return { atk: 0, ranged: 0, thrown: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  } else if (isWarlord) {
    // Warlord differs from CoM2 only at Ultra Elite and Champion (regular/veteran/elite
    // match CoM2):
    //   Ultra Elite: +5% to-hit, +1 attack, +1 thrown/breath, +1 armor (vs Elite)
    //   Champion:    +5% to-hit, +1 attack, +2 armor, +1 resistance (vs Ultra Elite)
    // "attack" raises both melee and ranged (lockstep, as in CoM2). The +1 mp/level
    // gains don't affect damage. Champion does NOT gain the +1 hp that CoM2 grants.
    switch (level) {
      // STAT-FORMULA[levelBonuses:warlord:regular]
      // PROVENANCE[levelBonuses:warlord:regular]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:129-158
      case 'regular':    return { atk: 1, ranged: 1, thrown: 0, def: 0, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:veteran]
      // PROVENANCE[levelBonuses:warlord:veteran]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:129-158
      case 'veteran':    return { atk: 2, ranged: 2, thrown: 1, def: 1, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:elite]
      // PROVENANCE[levelBonuses:warlord:elite]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:129-158
      case 'elite':      return { atk: 2, ranged: 2, thrown: 1, def: 2, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:ultraElite]
      // PROVENANCE[levelBonuses:warlord:ultraElite]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:129-158
      case 'ultra_elite':return { atk: 3, ranged: 3, thrown: 2, def: 3, res: 2, hp: 1, toHit: 5 };
      // STAT-FORMULA[levelBonuses:warlord:champion]
      // PROVENANCE[levelBonuses:warlord:champion]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI:129-158
      case 'champion':   return { atk: 4, ranged: 4, thrown: 2, def: 5, res: 3, hp: 1, toHit: 10 };
      default:           return { atk: 0, ranged: 0, thrown: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  } else {
    switch (level) {
      // STAT-FORMULA[levelBonuses:com2:regular]
      // PROVENANCE[levelBonuses:com2:regular]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c:2593-2631 | TABLE=Reference docs/DOS reconstructed/unitcalc.c:2323-2329 | Reference docs/DOS reconstructed/unitcalc.c:1425-1464 | Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:129-158
      case 'regular':    return { atk: 1, ranged: 1, thrown: 0, def: 0, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:veteran]
      // PROVENANCE[levelBonuses:com2:veteran]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c:2593-2631 | TABLE=Reference docs/DOS reconstructed/unitcalc.c:2323-2329 | Reference docs/DOS reconstructed/unitcalc.c:1425-1464 | Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:129-158
      case 'veteran':    return { atk: 2, ranged: 2, thrown: 1, def: 1, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:elite]
      // PROVENANCE[levelBonuses:com2:elite]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c:2593-2631 | TABLE=Reference docs/DOS reconstructed/unitcalc.c:2323-2329 | Reference docs/DOS reconstructed/unitcalc.c:1425-1464 | Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:129-158
      case 'elite':      return { atk: 2, ranged: 2, thrown: 1, def: 2, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:ultraElite]
      // PROVENANCE[levelBonuses:com2:ultraElite]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c:2593-2631 | TABLE=Reference docs/DOS reconstructed/unitcalc.c:2323-2329 | Reference docs/DOS reconstructed/unitcalc.c:1425-1464 | Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:129-158
      case 'ultra_elite':return { atk: 3, ranged: 3, thrown: 1, def: 3, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:champion]
      // PROVENANCE[levelBonuses:com2:champion]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c:2593-2631 | TABLE=Reference docs/DOS reconstructed/unitcalc.c:2323-2329 | Reference docs/DOS reconstructed/unitcalc.c:1425-1464 | Reference docs/Caster binary/Units.RecalculateUnits.pas:483-514 | Reference docs/Caster binary/Units.RecalculateUnits.pas:505-524 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:92-128 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI:129-158
      case 'champion':   return { atk: 3, ranged: 3, thrown: 1, def: 3, res: 2, hp: 2, toHit: 10 };
      default:           return { atk: 0, ranged: 0, thrown: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  }
}

function isMagicalRangedType(rangedType) {
  return rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s';
}

// PROVENANCE[supremeLightEligibility]: UNVERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; gap=CoM1 is reconstructed, but the combined helper still needs the exact applicable compiled-modern gate; pointer=Reference docs/DOS reconstructed/unitcalc.c:3529-3552
// STAT-FORMULA[supremeLightEligibility]
function supremeLightActiveForUnit(abilities, unitType, version, rangedContext = {}) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'supremeLight')) return false;
  if (version === 'com_6.08') {
    return isMagicalRangedType(rangedContext.liveRangedType)
      || unitType === 'fantastic_life' || unitType === 'normal_life'
      // The calculator's Caster flag is its representation of a nonzero mana pool.
      || hasAbil(abilities, 'caster')
      || hasAbil(abilities, 'focusMagic')
      || isMagicalRangedType(rangedContext.baseRangedType);
  }
  return unitType === 'fantastic_life' || hasAbil(abilities, 'caster');
}

// PROVENANCE[survivalInstinctEligibility]: UNVERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; gap=modern eligibility is reconstructed but the applicable CoM 1 implementation gate has not been matched; pointer=Reference docs/DOS reconstructed/unitcalc.c
// STAT-FORMULA[survivalInstinctEligibility]
function survivalInstinctActiveForUnit(abilities, unitType, version) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'survivalInstinct')) return false;
  return !!unitType && unitType.startsWith('fantastic_');
}

// PROVENANCE[landLinkingEligibility]: UNVERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; gap=DOS and compiled-modern gates have not been reconciled to one narrow applicable set; pointer=Reference docs/DOS reconstructed/unitcalc.c
// STAT-FORMULA[landLinkingEligibility]
function landLinkingActiveForUnit(abilities, unitType, version) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'landLinking')) return false;
  return !!unitType && unitType.startsWith('fantastic_');
}

// PROVENANCE[innerPowerEligibility]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1726-1732
// STAT-FORMULA[innerPowerEligibility]
function innerPowerActiveForUnit(abilities, version) {
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'innerPower')) return false;
  return hasAbil(abilities, 'fireImmunity') || hasAbil(abilities, 'lightningResist');
}

// PROVENANCE[blazingEyesDoomGaze]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1750-1761
// STAT-FORMULA[blazingEyesDoomGaze]
function blazingEyesDoomGazeForUnit(abilities, unitType, version) {
  const baseDoomGaze = abilVal(abilities, 'doomGaze', 0);
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'blazingEyes')) return baseDoomGaze;
  if (unitType !== 'fantastic_chaos') return baseDoomGaze;
  return baseDoomGaze > 0 ? baseDoomGaze + 1 : 3;
}

// PROVENANCE[misleadEligibility]: UNVERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; gap=matching aura-type-10 implementation range is not reconstructed; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
// STAT-FORMULA[misleadEligibility]
function misleadActiveForUnit(abilities, unitType, version) {
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'mislead')) return false;
  return isNormalUnitType(unitType) || unitType === 'hero';
}

// STAT-FORMULA[destinyEligibility]
// PROVENANCE[destinyEligibility]: UNVERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; gap=Destiny version/enchantment eligibility lacks an exact implementation gate; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
function destinyActiveForUnit(abilities, version) {
  return !!(version && version.startsWith('com2_') && hasAbil(abilities, 'destiny'));
}

// PROVENANCE[legacyUnitTypeConversions]: UNVERIFIED versions=all; gap=legacy compatibility helper composes multiple version-specific identity writes; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
// STAT-FORMULA[legacyUnitTypeConversions]
function determineEffectiveUnitType(baseUnitType, abilities, version) {
  let unitType = baseUnitType || 'normal';
  const ccDefense = !!abilVal(abilities, 'ccDefense', false);
  const ccFireBreath = !!abilVal(abilities, 'ccFireBreath', false);
  const ccFlight = !!abilVal(abilities, 'ccFlight', false);
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  const isWarlord = version && version.startsWith('com2_warlord');
  const destinyActive = destinyActiveForUnit(abilities, version);

  // Reported CoM2 combat recalculation order: last applicable type rewrite wins.
  if (ccFireBreath) unitType = 'fantastic_chaos';
  if (destinyActive) unitType = 'fantastic_life';
  if (ccFlight) unitType = 'fantastic_chaos';
  if (ccDefense) unitType = 'fantastic_chaos';
  // Warlord: Bloodlust no longer turns the unit undead, so it stays its original type.
  if (hasAbil(abilities, 'bloodLust') && !isWarlord) unitType = 'fantastic_death';
  if (hasAbil(abilities, 'blackChannels')) unitType = 'fantastic_death';
  if (hasAbil(abilities, 'undead') || hasAbil(abilities, 'animated')) unitType = 'fantastic_death';
  if (hasAbil(abilities, 'mysticSurge')) unitType = 'fantastic_unaligned';
  if (isCoMPlus && hasAbil(abilities, 'raiseDead')) unitType = 'fantastic_unaligned';

  // Fiery Fury (Warlord): if cast on a fantastic creature, turns it into a Chaos
  // creature unless it is undead or enchanted with Apotheosis/Sanctify. (Regular
  // units instead get stat bonuses — handled in stats.js.)
  if (isWarlord && hasAbil(abilities, 'fieryFury')
      && (unitType || '').startsWith('fantastic_')
      && unitType !== 'fantastic_death'
      && !hasAbil(abilities, 'sanctify')
      && !hasAbil(abilities, 'apotheosis')) {
    unitType = 'fantastic_chaos';
  }

  // Sanctify (Warlord): during combat a sanctified unit becomes a Life-realm unit.
  // A 'cleric' (clergy) unit turns into a Life *fantastic* creature; any other
  // normal unit becomes a Life-realm *non-fantastic* unit. Both gain +1 from True
  // Light / -1 from Darkness; the fantastic form additionally counts as fantastic
  // for fantastic-gated effects (Weapon Immunity targeting, Dispel Evil, etc.).
  // (The cleric spellcasting-skill bonus is not modelled — unit casting is out of
  // scope for the damage calculator.)
  if (isWarlord && hasAbil(abilities, 'sanctify')) {
    if (hasAbil(abilities, 'clergy')) unitType = 'fantastic_life';
    else if (unitType === 'normal') unitType = 'normal_life';
  }

  return unitType;
}

// The realm a unit belongs to, derived from its (possibly rewritten) unitType.
// Both fantastic_<realm> and normal_<realm> (e.g. the Warlord-only 'normal_life'
// produced by Sanctify) carry a realm; plain 'normal' and 'hero' have none.
// PROVENANCE[realmOfUnitType]: UNVERIFIED versions=all; gap=the compatibility projection from live unit type to realm has no matching narrow implementation range; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
// STAT-FORMULA[realmOfUnitType]
function realmOfUnitType(unitType) {
  const us = String(unitType || '');
  if (us.startsWith('fantastic_')) return us.slice('fantastic_'.length);
  if (us.startsWith('normal_')) return us.slice('normal_'.length);
  return null;
}

// True for non-fantastic, non-hero units — plain 'normal' and any realm-tagged
// normal unit such as 'normal_life'. These share normal-unit behaviour for
// Weapon Immunity, Blood Lust targeting, Mislead, etc.
// PROVENANCE[isNormalUnitType]: UNVERIFIED versions=all; gap=the compatibility normal-unit predicate has no matching narrow implementation range across every consumer; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
// STAT-FORMULA[isNormalUnitType]
function isNormalUnitType(unitType) {
  const us = String(unitType || '');
  return us === 'normal' || us.startsWith('normal_');
}

const MODERN_SUPERNATURAL_DEFAULTS = Object.freeze({ starts: 0, ratio: 34 });

function roundTiesToEven(value) {
  if (!Number.isFinite(value)) return 0;
  const lower = Math.floor(value);
  const fraction = value - lower;
  if (fraction < 0.5) return lower;
  if (fraction > 0.5) return lower + 1;
  return lower % 2 === 0 ? lower : lower + 1;
}

// MODDING.INI supplies SupernaturalStarts and SupernaturalRatio. Caster.exe applies those inputs
// as Round((hits - starts) * ratio / 100.0), where Delphi Round uses ties-to-even. The optional
// settings argument keeps this the moddable formula while the UI uses both shipped tables' 0/34.
// PROVENANCE[supernaturalMinimumDamage]: UNVERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; gap=the modern implementation/table inputs are exact, but the DOS/CoM1 implementation range is not reconstructed here; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
// STAT-FORMULA[supernaturalMinimumDamage]
function supernaturalMinDamageForHits(hits, version, settings = MODERN_SUPERNATURAL_DEFAULTS) {
  if (hits <= 0 || !version) return 0;
  if (version.startsWith('com2_')) {
    const starts = Number.isFinite(settings.starts) ? settings.starts : 0;
    const ratio = Number.isFinite(settings.ratio) ? settings.ratio : 34;
    return Math.max(0, roundTiesToEven((hits - starts) * ratio / 100));
  }
  if (version.startsWith('com_')) {
    return Math.max(0, Math.floor((hits - 5) / 2));
  }
  return 0;
}

function supernaturalMinDamageFn(abilities, version) {
  const hasSupernatural = hasAbil(abilities, 'supernatural');
  const destinyActive = destinyActiveForUnit(abilities, version);
  if (!hasSupernatural && !destinyActive) return null;
  return hits => supernaturalMinDamageForHits(hits, version);
}

// Compute ranged distance penalty for missile/boulder attacks.
// Returns a negative percentage modifier or 0.
// MoM: -10% per full 3 tiles.
// CoM: -10% per full 4 tiles.
// CoM2: -10% at 4 tiles, then -3% per additional tile.
// Long Range caps the penalty at -10% in all versions.
// CoM 1 exempts heroes entirely.
//
// The DOS half is read off WIZARDS.EXE (see `Reference docs/MoM binary analysis.md`,
// *Ranged distance penalty*): one divisor byte at 0x99BB0 is 3 in MoM 1.31/CP 1.60 and
// 4 in CoM 1; Long Range clamps the step count to 1 only when it is already positive;
// and CoM 1 alone skips the whole block for heroes.
// PROVENANCE[distancePenalty]: UNVERIFIED versions=all; gap=combined helper requires both DOS combat reconstruction and compiled-modern ranged-penalty implementation plus table constants; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
// STAT-FORMULA[distancePenalty]
function distancePenalty(distance, rangedType, longRange, version, isHero) {
  if (rangedType !== 'missile' && rangedType !== 'boulder') return 0;
  let penalty = 0;
  if (version && version.startsWith('com2')) {
    if (distance >= 4) penalty = -10 - 3 * (distance - 4);
  } else if (version && version.startsWith('com')) {
    if (isHero) return 0;
    penalty = -10 * Math.floor(distance / 4);
  } else {
    penalty = -10 * Math.floor(distance / 3);
  }
  if (longRange && penalty < -10) penalty = -10;
  return penalty;
}

// --- Ability Stat Modifiers ---
// One ability or enchantment that modifies a stat is one step, declared at the position its
// engine region gives it. Nothing is summed here: `deriveUnitStats` splices these into the
// single stat sequence (SPEC.md, *Stat derivation contract*), so an ordering finding lands as a
// step move rather than as a re-bucketing.
//
// `abilities` is a map of ability key -> value (bool true/false, or number).
// `version` is the game version string (e.g. 'mom_1.31', 'com_6.08', 'com2_1.05.11').
//
// Phase is evidence, not decoration — which region of the engine makes the write:
//   base  raw unit stats plus permanent ABase writes before combat
//   a  precalc, in the binary          — not inspectable; inferred from semantics
//   b  precalc, in UnitCalcPre.CAS     — verifiable by grep
//   c  magic calc, in the binary       — not inspectable; inferred from semantics
//   d  magic calc, in UnitCalc.CAS     — verifiable by grep
// b runs *before* c: a Warlord CAS effect in the early pass lands before base-game spells.
// Base CoM2 and MoM have no b or d (vanilla ships HALT; stubs; MODDING.INI sets
// UnitRecalculateEnabled=0), so their modifiers are all a or c.
//
// The script file *is* the phase — game-fiction wording ("combat enchantment", "trained
// in the city") does not decide it. Each non-obvious attribution below cites the
// file:line in Reference docs/Script source/Warlord 1.5.12.7/ that justifies it.
//
// An effect an engine orders differently is emitted as **two version-exclusive steps** rather
// than one step carrying a version predicate, so the divergence is a position in the list
// instead of a condition inside a step: `supremeLight` / `supremeLight:coM1`, `holyBonus` /
// `holyBonus:aura`. A step carrying `afterWarp` runs in the part of region `c` that follows
// the engine's Warp Creature block (SPEC.md, *Warp Creature ordering*).

// `delta` names the stats the effect writes, using the record's own field names, plus two
// that stand for how the engine reaches the secondary-attack slot:
//   rtb     the shared `.ranged` slot of the DOS engines — ranged, Thrown, Breath and both
//           gaze strengths alike, which is why one write reaches all of them
//   ranged  the `unitT.ranged` field of `Caster.exe`, which is *only* the conventional ranged
//           attack: Thrown, Fire Breath, Lightning Breath and the gazes are separate fields
//           there, so a bonus written to `ranged` never reaches them
//   nonGazeRtb  the selected modern secondary attack except Stoning/Death/Doom Gaze; this
//           represents compiled blocks that write conventional ranged, Thrown and both Breaths
//           separately while leaving the independent gaze fields untouched
//
// A bonus never conjures a slot the unit does not have, so a write is skipped when
// `ctx.slots` says the slot is dead. That is also the aura pass's own gate — "add … to
// melee/ranged when the corresponding base attack exists". Blaze of Glory's armor-to-melee
// transfer is the deliberate exception: it is not a bonus, and it is not built here.
const ABILITY_STEP_RTB_FIELDS = ['rtb', 'gaze', 'doomGaze'];
function abilityStatStep(id, phase, delta, extra) {
  const fields = Object.keys(delta);
  const writes = [];
  for (const field of fields) {
    if (field === 'rtb') writes.push(...ABILITY_STEP_RTB_FIELDS);
    else if (field === 'ranged') writes.push('rtb');
    else if (field === 'nonGazeRtb') writes.push('rtb');
    else writes.push(field);
  }
  return statStep({
    id, phase, writes, delta, ...(extra || {}),
    apply: (u, ctx) => {
      const slots = (ctx && ctx.slots) || null;
      for (const field of fields) {
        const value = delta[field];
        if (field === 'atk') {
          if (!slots || slots.melee) u.atk += value;
        } else if (field === 'rtb') {
          if (!slots || slots.rtb) u.rtb += value;
          if (!slots || slots.gaze) u.gaze += value;
          if (!slots || slots.doomGaze) u.doomGaze += value;
        } else if (field === 'ranged') {
          if (!slots || slots.ranged) u.rtb += value;
        } else if (field === 'nonGazeRtb') {
          if (!slots || slots.rtb) u.rtb += value;
        } else {
          u[field] += value;
        }
      }
    },
  });
}

function getAbilityStatSteps(abilities, version, identityPredicates = {}) {
  const steps = [];
  const emit = (id, phase, delta, extra) => { steps.push(abilityStatStep(id, phase, delta, extra)); };
  // A position *within* region c, not a region of its own: every engine writes some of `c`
  // after its Warp Creature block, and which effects those are is the version divergence.
  // CoM 1 moved Warp to the front (0x907AA), so its Darkness, Supreme Light and Tactician all
  // land here; CoM2/Warlord run Warp late (+0x0BA3C) with only Tactician (+0x0C890) after it.
  const afterWarp = { afterWarp: true };
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  const isCoM1 = !!(version && version.startsWith('com_'));

  // Holy Bonus: +X to melee attack, defense, resistance.
  // CoM v6.05+ and CoM2: also +X to ranged attack.
  //
  // CoM2/Warlord run it as **aura type 1 in region `e`**, after `d` and after the Warps — not
  // in `a`, where the pre-map judgment put it (CoM2 analysis, *The aura pass*).
  // The aura table merges sources by maximum rather than summing them, which the calculator's
  // single numeric input already expresses. Two consequences of the aura block's own wording,
  // "add the aura value to defense and resistance, and to melee/ranged when the corresponding
  // base attack exists": the melee/ranged writes are gated on the base attack existing, which
  // is the slot gate every ability step applies; and it reaches the **ranged** field only, so
  // a Thrown or Breath attack takes no bonus — `ctx.slots.rangedIsConventional`.
  //
  // MoM and CoM 1 keep phase a: intrinsic unit ability, no CAS implementation, and no aura
  // pass in either DOS recompute.
  const hb = abilVal(abilities, 'holyBonus', 0);
  if (hb > 0) {
    const isCoM2 = version && version.startsWith('com2_');
    // PROVENANCE[holyBonus:aura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:2387-2403
    if (isCoM2) emit('holyBonus:aura', 'e', { atk: hb, def: hb, res: hb, ranged: hb });
    // PROVENANCE[holyBonus]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c:2969-2992
    else emit('holyBonus', 'a', isCoMPlus
      ? { atk: hb, def: hb, res: hb, rtb: hb }
      : { atk: hb, def: hb, res: hb });
  }

  // Animate Dead's Animated buff in CoM/CoM2: +1 to every existing attack channel,
  // +1 defense, +10% To Hit, and Weapon Immunity (RecalculateUnits $0059F7D8..$0059FBD0).
  // Weapon Immunity is added in combat flow; the stat bonuses are applied here.
  // Phase c: a spell effect with no CAS implementation.
  if (hasAbil(abilities, 'animated') && isCoMPlus) {
    // PROVENANCE[animated]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:907-924 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1481-1508
    emit('animated', 'c', isCoM1
      ? { atk: 1, def: 1, rtb: 1, toHit: 10 }
      : { atk: 1, def: 1, nonGazeRtb: 1, toHit: 10 });
  }

  // Resistance to All: +X to resistance.
  // CoM2/Warlord feed it into **aura type 3 in region `e`** — the Prayermaster aura — so it
  // runs after `d` and after the Warps, and competes with Prayermaster by maximum rather than
  // stacking with it (CoM2 analysis, *The aura pass*). The calculator carries no Prayermaster control, so only the
  // position is observable today. MoM and CoM 1 keep phase a: intrinsic ability, no CAS, no
  // aura pass.
  const rta = abilVal(abilities, 'resistanceToAll', 0);
  if (rta > 0) {
    // PROVENANCE[resistanceToAll:aura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:2383-2416
    if (version && version.startsWith('com2_')) emit('resistanceToAll:aura', 'e', { res: rta });
    // PROVENANCE[resistanceToAll]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c:2969-2992
    else emit('resistanceToAll', 'a', { res: rta });
  }

  // Lucky: +10% To Hit, +10% To Block, +1 Resistance.
  // The v1.31 enemy melee penalty (-10% To Hit) is applied in resolveCombat.
  // Lucky reaches a unit from sources in three different stages and does not stack, so it
  // is counted once, in the earliest phase that grants it — resolved from the markers
  // set in stats.js rather than by name. An unmarked `lucky` is the unit's own intrinsic
  // ability, which is phase a.
  // The unit's own intrinsic Lucky is `+0x044C7`, in region c — the pre-map judgment put it in
  // a. Nothing between the two regions reads Resistance, To Hit or To Defend, so the move is
  // faithful without being observable.
  if (hasAbil(abilities, 'lucky')) {
    const luckyPhase = hasAbil(abilities, 'luckyPhaseBase')
      ? 'base'
      : ((!hasAbil(abilities, 'luckyPhaseA') && hasAbil(abilities, 'luckyPhaseB')) ? 'b' : 'c');
    // PROVENANCE[lucky]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:2008-2020 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1247-1258
    emit('lucky', luckyPhase, { res: 1, toHit: 10, toBlk: 10 });
  }

  // Lucky Star's aura: while any friendly unit in the combat carries the enchantment, every
  // friendly unit — the enchanted one included — gets phase-b +1 melee/ranged/armor/resistance
  // (UnitCalcPre.CAS:1020,1611-1623). Multiple copies do not stack; the scan counts them but
  // the grant is gated on a non-zero count. The separate Lucky grant at UnitCalcPre.CAS:1147
  // reaches only the enchanted unit, so it is the plain `lucky` control, not this one.
  // The loop-variable bug that confined the aura to the enchanted unit was fixed in 1.5.12.6.2.
  if (version && version.startsWith('com2_warlord') && hasAbil(abilities, 'luckyStar')) {
    // PROVENANCE[luckyStar]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1611-1621
    emit('luckyStar', 'b', { atk: 1, def: 1, res: 1, rtb: 1 });
  }

  // Prayer / High Prayer: combat enchantments.
  // Prayer: +10% To Hit (all attacks except immolation/spells), +10% To Block, +1 Resistance.
  // High Prayer: +2 Melee Atk, +2 Defense, +3 Resistance, +10% To Hit, +10% To Block.
  // CoM2 and earlier: High Prayer supersedes Prayer (not cumulative).
  // Warlord: They stack, but To Hit and To Block do not stack — Prayer's contribution
  // when stacked is only +1 Melee Atk, +1 Defense, +1 Resistance.
  // The v1.31 enemy melee To Hit malus (-10%) is applied in resolveCombat.
  // Phase c for both spells' own effects (no CAS implementation); the Warlord stacking
  // top-up is phase b — UnitCalcPre.CAS:1484-1496, gated on both globals being present.
  // MoM (0x9025C-0x9039D) and CoM 1 (0x9028x-0x9039A) implement both prayers identically,
  // including High Prayer's `jmp` past the Prayer block that makes them non-cumulative,
  // and neither writes `.ranged`. Both blocks sit *before* CoM 1's Warp Creature at
  // 0x9074C, so they take no part in the post-Warp ordering.
  const hasPrayer = hasAbil(abilities, 'prayer');
  const hasHighPrayer = hasAbil(abilities, 'highPrayer');
  if (hasHighPrayer) {
    // PROVENANCE[highPrayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3013-3037 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1895-1910
    emit('highPrayer', 'c', { atk: 2, def: 2, res: 3, toHit: 10, toBlk: 10 });
    if (hasPrayer && version && version.startsWith('com2_warlord')) {
      // PROVENANCE[prayer:warlordStack]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1484-1494
      emit('prayer:warlordStack', 'b', { atk: 1, def: 1, res: 1 });
    }
  } else if (hasPrayer) {
    // PROVENANCE[prayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3040-3058 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1897-1918
    emit('prayer', 'c', { res: 1, toHit: 10, toBlk: 10 });
  }

  // Black Prayer (debuff): -1 all conventional attack strengths, -1 Defense, -2 Resistance.
  // Phase c — curse with no CAS implementation.
  if (hasAbil(abilities, 'blackPrayer')) {
    // PROVENANCE[blackPrayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3189-3205 | Reference docs/DOS reconstructed/unitcalc.c:3304-3320 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2003-2018
    emit('blackPrayer', 'c', version && version.startsWith('com2_')
      ? { atk: -1, def: -1, res: -2, nonGazeRtb: -1 }
      : { atk: -1, def: -1, res: -2, rtb: -1 });
  }

  // Reinforce Magic: CoM2 global enchantment. All units gain +2 resistance.
  // The +2 magical ranged attack strength bonus is type-conditional and handled in stats.js.
  // Phase c — global enchantment with no CAS implementation.
  if (hasAbil(abilities, 'reinforceMagic') && version && version.startsWith('com2_')) {
    // PROVENANCE[reinforceMagic]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1764-1772
    emit('reinforceMagic', 'c', { res: 2 });
  }

  // Inner Power: CoM2 global enchantment. Units with Fire Immunity or Lightning Resist
  // gain +3 to all attack strengths, +2 defense, and +2 resistance. Eligibility is
  // resolved by innerPowerActiveForUnit so the checkbox can remain visible without
  // affecting other units.
  // Phase c: UnitCalcPre.CAS:1743-1749 grants only Mountaineer — the stat bonuses are binary.
  if (hasAbil(abilities, 'innerPower')) {
    // PROVENANCE[innerPower]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1729-1747
    emit('innerPower', 'c', { atk: 3, def: 2, res: 2, rtb: 3 });
  }

  // Mislead applies Misfortune in CoM2. The checkbox represents the current unit being
  // affected by Misfortune; normal units and heroes are eligible, and that gating is in
  // misleadActiveForUnit. The -1 ranged-attack penalty applies only to ranged attacks (not
  // thrown or breath) per the source helptext, so stats.js applies it as misleadRtbMod.
  // Phase c — curse with no CAS implementation.
  if (hasAbil(abilities, 'mislead')) {
    // PROVENANCE[mislead]: VERIFIED versions=com2_1.05.11; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:2453-2470
    emit('mislead', 'c', { atk: -1, def: -1, res: -1 });
  }

  // Stone Skin / Iron Skin: +1 / +5 Defense. Iron Skin supersedes Stone Skin.
  // Both phase c. UnitCalc.CAS:6-9 looks like a Stone Skin implementation but sits inside
  // the file's `Example - ... End of Example` header comment; UnitCalcPre.CAS:456/661 only
  // set the Iron Skin flag. Neither applies a stat.
  if (hasAbil(abilities, 'ironSkin')) {
    // PROVENANCE[ironSkin]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:665-670 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1606-1610
    emit('ironSkin', 'c', { def: 5 });
  } else if (hasAbil(abilities, 'stoneSkin')) {
    // PROVENANCE[stoneSkin]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:665-674
    emit('stoneSkin', 'c', { def: 1 });
  }

  // Holy Armor: handled in stats.js (version- and stat-conditional).

  // Lionheart: +3 Melee Attack (only if base > 0 — the melee slot gate discards it otherwise),
  // +3 Resistance. RTB bonus (non-magic ranged/thrown only) and HP bonus
  // (version/figs-dependent) are the `lionheart:rangedHp` step in stats.js.
  // Phase c — spell with no CAS implementation.
  if (hasAbil(abilities, 'lionheart')) {
    // PROVENANCE[lionheart]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:745-758 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1587-1598
    emit('lionheart', 'c', { atk: 3, res: 3 });
  }

  // Metal Fires / Flame Blade: +1 / +2 (MoM) or +3 (CoM/CoM2/Warlord) melee attack.
  // Flame Blade supersedes Metal Fires.
  // Missile/thrown/breath bonus and weapon upgrade are handled in stats.js (type-conditional).
  // Both phase c: the melee bonus is binary. Warlord keeps three distinct displays:
  // combat-cast Flame Blade, permanent Fiery Blade, and Fiery Fury (whose regular-unit
  // effect grants the permanent Blade package). The latter's extra ranged effects are in
  // stats.js; UnitCalc.CAS:331-333 gives fire breath only to the combat-cast variant.
  const warlordBlade = version && version.startsWith('com2_warlord')
    && (hasAbil(abilities, 'flameBladeWarlord') || hasAbil(abilities, 'fieryBlade'));
  if (hasAbil(abilities, 'flameBlade') || warlordBlade) {
    // PROVENANCE[flameBlade]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:684-698 | Reference docs/DOS reconstructed/unitcalc.c:928-940 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1538-1547 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:524-526 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:524-526
    emit('flameBlade', 'c', { atk: version && version.startsWith('com') ? 3 : 2 });
  } else if (hasAbil(abilities, 'metalFires') && !identityPredicates.liveFantastic) {
    // PROVENANCE[metalFires]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:3269-3292
    emit('metalFires', 'c', { atk: 1 });
  }

  // Blazing March: CoM/CoM2 combat enchantment. +3 melee attack to all units.
  // The missile bonus (+3, thrown too in Warlord) is type-conditional and handled in stats.js.
  // MODDING.INI confirms all four magnitudes, breath included: BlazingMarchAttackBonus=3,
  // MissileRangedBonus=3, BreathBonus=0 both versions, ThrownBonus 0 (CoM2) / 3 (Warlord).
  // Phase c — no CAS implementation.
  if (hasAbil(abilities, 'blazingMarch')) {
    // PROVENANCE[blazingMarch]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3147-3177 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1922-1936 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:536-539 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:536-539
    emit('blazingMarch', 'c', { atk: 3 });
  }

  // Breakthrough: CoM2 combat enchantment resolved via the UI selector.
  // '+1melee' grants +1 melee attack.
  // '+1melee/+1def' grants +1 melee attack and +1 defense.
  const breakthroughVal = version && version.startsWith('com2')
    ? abilVal(abilities, 'breakthrough', 'none')
    : 'none';
  // Phase c: UnitCalcPre.CAS:776-782 only grants the CGBreakthrough combat global via the
  // Chaos Conduit item power — the stat effect itself is binary.
  if (breakthroughVal !== 'none') {
    const baseFantastic = identityPredicates.baseFantastic != null
      ? !!identityPredicates.baseFantastic : !!abilities.baseFantastic;
    const combatSummoned = identityPredicates.combatSummoned != null
      ? !!identityPredicates.combatSummoned : !!abilities.combatSummoned;
    const nonCorporeal = !!abilities.nonCorporeal;
    // The executable derives three independent packages from direct predicates. The normal
    // package excludes base-Fantastic and combat-summoned units; the other two may stack.
    const liveFantastic = identityPredicates.liveFantastic != null
      ? !!identityPredicates.liveFantastic : !!abilities.liveFantastic;
    if (!combatSummoned && !baseFantastic && !liveFantastic) {
      // PROVENANCE[breakthrough:normal]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1949-1964 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:541-548 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:541-548
      emit('breakthrough:normal', 'c', { atk: 1 });
    }
    // PROVENANCE[breakthrough:noncorporeal]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1967-1975
    if (nonCorporeal) emit('breakthrough:noncorporeal', 'c', { atk: 1, def: 1 });
    // PROVENANCE[breakthrough:combatSummoned]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1977-1985
    if (combatSummoned) emit('breakthrough:combatSummoned', 'c', { atk: 1, def: 1 });
  }

  // Giant Strength: +1 melee attack. +1 thrown bonus is `giantStrength:thrown` in stats.js
  // (thrown only, not missile).
  // Phase c — spell with no CAS implementation. (CreateUnit.CAS:552-554's SGiantStrength is
  // the Natural Selection coal-ore grant, a different effect, handled in stats.js.)
  if (hasAbil(abilities, 'giantStrength')) {
    // PROVENANCE[giantStrength]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:699-710
    emit('giantStrength', 'c', { atk: 1 });
  }

  // Chaos Channels (Demon-Skin Armor): +6 Defense in MoM 1.31 (bug: applied twice in combat),
  // +3 Defense in MoM 1.40+/CP 1.60/CoM/CoM2 (Insecticide fix).
  // The constant is +3 in every build (WIZARDS.EXE 0x8F6E2, CoM 1 0x8F741); 1.31's 6 is that
  // +3 applied twice, because BU_Apply_Specials runs once from the battle-unit constructor and
  // again from the stat recompute, and only 1.31 passes it a live mutations byte both times
  // (0x90A1D, nopped to `xor ax,ax` in CP 1.60 and CoM 1). The Fandom wiki's "documented +2"
  // is wrong; its "applied twice" is right.
  // Fire Breath option is handled in stats.js (modifies thrownType/rtb).
  // Phase c: UnitCalcPre.CAS's EncCCArmor references only set or test the flag.
  if (abilVal(abilities, 'ccDefense', false)) {
    // PROVENANCE[chaosChannels:armor]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:725-731 | Reference docs/DOS reconstructed/unitcalc.c:3420-3432 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1449-1456
    emit('chaosChannels:armor', 'c', { def: (version === 'mom_1.31') ? 6 : 3 });
  }

  // Black Channels: +2 melee attack (discarded by the melee slot gate when the unit has none),
  // +1 all ranged/thrown/breath/gaze,
  // +1 defense, +1 resistance, +1 HP per figure. Death realm; MoM only.
  // Phase c — MoM-only enchantment, so there is no CAS to consult.
  if (hasAbil(abilities, 'blackChannels')) {
    // PROVENANCE[blackChannels]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:645-663
    emit('blackChannels', 'c', { atk: 2, def: 1, res: 1, hp: 1, rtb: 1 });
  }

  // Weakness: -2 (MoM) or -3 (CoM/CoM2) melee attack. RTB penalty is type-specific — the
  // `weakness:ranged` and `weakness:breath` steps in stats.js.
  // Phase c for the melee penalty — Warlord's UnitCalc.CAS:309-315 adds only the -3 to
  // fire/lightning breath (phase d, applied in stats.js).
  if (hasAbil(abilities, 'weakness')) {
    // PROVENANCE[weakness]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3365-3392 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2136-2143
    emit('weakness', 'c', { atk: version && version.startsWith('com') ? -3 : -2 });
  }

  // Rust (Warlord): -3 melee attack. The matching -3 to physical ranged (missile/boulder),
  // weapon stripping, thrown removal, and Large Shield removal are handled in stats.js.
  // Phase d — UnitCalc.CAS:492-504.
  if (version && version.startsWith('com2_warlord') && hasAbil(abilities, 'rust')) {
    // PROVENANCE[rust]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:492-501
    emit('rust', 'd', { atk: -3 });
  }

  // Mind Storm: MoM: -5 melee, -5 all ranged/thrown/breath, -5 defense, -5 resistance.
  // CoM2: -3 melee, -5 all ranged/thrown, -5 defense, -5 resistance.
  // Phase c: UnitCalcPre.CAS:1221-1223 only mirrors the combat flag to overland.
  if (hasAbil(abilities, 'mindStorm')) {
    // PROVENANCE[mindStorm]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3396-3416 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2147-2158
    emit('mindStorm', 'c', {
      atk: version && version.startsWith('com') ? -3 : -5,
      def: -5, res: -5, rtb: -5,
    });
  }

  // Supreme Light is not built here. The engine writes its three stats as one block whose
  // defence component is a live read of Resistance, so it is one step in stats.js —
  // `supremeLight` in region `e` for CoM2/Warlord, `supremeLight:coM1` after CoM 1's Warp.

  // Survival Instinct: CoM/CoM2 global enchantment. Applies only to fantastic creatures;
  // eligibility is resolved by survivalInstinctActiveForUnit using the effective combat unit type.
  // Phase c — no CAS implementation in either calc file.
  if (hasAbil(abilities, 'survivalInstinct')) {
    // PROVENANCE[survivalInstinct]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1711-1719
    emit('survivalInstinct', 'c', { def: 1, res: 2, toHit: 10 });
  }

  // Guardian retort: CoM/CoM2 units gain +1 resistance, +10% To Hit,
  // and +10% To Defend.
  // Region c at +0x0B092 ("Guardian retort while defending a settlement"), not the a the
  // pre-map judgment gave it. UnitCalcPre.CAS:326-328 grants only a hero ability to
  // Marionettes, so Warlord adds nothing and inherits the position. Nothing between a and c
  // reads Resistance, To Hit or To Defend, so this is faithful without being observable.
  if (hasAbil(abilities, 'guardian') && isCoMPlus) {
    // PROVENANCE[guardian]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3208-3220 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2092-2105
    emit('guardian', 'c', { res: 1, toHit: 10, toBlk: 10 });
  }

  // Tactician retort:
  // CoM/CoM2: non-hero units gain +1 defense; heroes gain +2 defense, +2 resistance,
  //           and +2 to all attack strengths.
  // Warlord:  all units gain +1 defense (no hero distinction).
  //           Teleporting units also gain First Strike; Non-Corporeal units gain
  //           Negate First Strike — those ability grants are applied in normalizeCombatUnit.
  //
  // Warlord reaches its flat +1 by *subtracting* from the binary's hero grant rather than
  // replacing it: UnitCalcPre.CAS:759-771 takes back -2 atk, -2 ranged, -1 defense and
  // -2 resistance from heroes in combat, which is exactly the CoM2 hero bonus less one
  // point of defense. So the hero case is the binary's grant plus a phase-b clawback. Net
  // values are unchanged either way, but the clawback runs in `b`, *before* the grant it
  // takes back — the one place in the sequence where a step's input is written after it.
  // That falls out of the engine's own split across two files and is left as it is.
  //
  // Both engines write it in the recompute, not the precalc, and both write it late:
  // CoM2/Warlord at +0x0C890, after Warp and Shatter and just before the `UnitCalc` hook;
  // CoM 1 at 0x90AB4-0x90AF6 — guarded on the retort byte `[player*0x4C8 - 0x60CF]` and, for
  // the hero half, on `_UNITS[].Hero_Slot >= 0` — after its own early Warp block. So it is
  // region c in both, and after the Warps in both (CoM2 analysis, *Associating a block with its enchantment*).
  if (hasAbil(abilities, 'tactician') && isCoMPlus) {
    const isWarlord = version && version.startsWith('com2_warlord');
    const id = isCoM1 ? 'tactician:coM1' : 'tactician';
    if (abilVal(abilities, 'unitType', 'normal') === 'hero') {
      // STAT-FORMULA[tactician:heroDynamic]
      // PROVENANCE[tactician:heroDynamic]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3566-3582 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2273-2299
      emit(id, 'c', isCoM1
        ? { atk: 2, def: 2, res: 2, rtb: 2 }
        : { atk: 2, def: 2, res: 2, ranged: 2 }, afterWarp);
      if (isWarlord) {
        // PROVENANCE[tactician:warlordClawback]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:756-770
        emit('tactician:warlordClawback', 'b', { atk: -2, def: -1, res: -2, ranged: -2 });
      }
    } else {
      // STAT-FORMULA[tactician:nonheroDynamic]
      // PROVENANCE[tactician:nonheroDynamic]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3566-3582 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2273-2299
      emit(id, 'c', { def: 1 }, afterWarp);
    }
  }

  // Favored Terrain (Warlord): a unit fighting on its favored combat tile gains
  // +5% To Hit and +1 defense. With the Tactician retort the terrain bonus is
  // doubled (and Tactician also grants First Strike + Negate First Strike — see
  // applyTacticianWarlordEffects).
  // Phase d — UnitCalc.CAS:629-671, with the doubled branch at :646-658.
  if (hasAbil(abilities, 'favoredTerrain') && version && version.startsWith('com2_warlord')) {
    const mult = hasAbil(abilities, 'tactician') ? 2 : 1;
    // PROVENANCE[favoredTerrain]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:629-657
    emit('favoredTerrain', 'd', { def: 1 * mult, toHit: 5 * mult });
  }

  // Land Linking: CoM/CoM2 grants +2 melee, breath, and defense to fantastic units.
  // Breath is handled in stats.js.
  // Phase c: UnitCalcPre.CAS:889 is the separate Nature Link upgrade (+1 resistance),
  // not this bonus.
  if (hasAbil(abilities, 'landLinking')) {
    // PROVENANCE[landLinking]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:981-989 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1615-1630
    emit('landLinking', 'c', { atk: 2, def: 2 });
  }

  // Mystic Surge: +2 Defense, -2 Resistance. The unaligned-fantastic conversion is in
  // determineEffectiveUnitType and the -10% To Block in resolveCombat
  // (MODDING.INI MysticSurgeToDefPenalty=10, both versions).
  // Phase c — SpellMysticSurge.CAS sets enchantment flags only; no stat application.
  if (hasAbil(abilities, 'mysticSurge')) {
    // PROVENANCE[mysticSurge]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:993-1000 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1563-1571
    emit('mysticSurge', 'c', { def: 2, res: -2 });
  }

  // Artificer retort (Warlord): mechanical units gain +1 melee, +1 ranged,
  // +1 armor, +1 resistance. Magic Weapons component handled in stats.js.
  // Rebuild's mechanical conversion is propagated via effectiveAbilities in stats.js.
  // Base stage: CreateUnit.CAS:37-48 writes these at index 1 (ABase) when the unit is
  // built, so they are part of the base before the encounter-time pipeline starts.
  // Resistance is +2, not the +1 the helptext states: manual changelog 1.4.17 cut it to +1
  // but 1.4.22 restored it ("+1 attack, +1 armor and +2 resistance. (from +2,+0,+1)"), and
  // CreateUnit.CAS:40-43 matches 1.4.22 on all four stats. The helptext and the block's own
  // comment were only half-updated. See Reference docs/Source discrepancies.md §6.
  const isWarlord = version && version.startsWith('com2_warlord');
  // Armorclad is a permanent mechanical hull upgrade. CreateUnit.CAS:702-703
  // and OverlandEndTurn.CAS:405-406/428-429 write +6 Defense to ABase.
  if (isWarlord && hasAbil(abilities, 'armorclad')) {
    // PROVENANCE[armorclad]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:700-703
    emit('armorclad', 'base', { def: 6 });
  }

  // Battle Armor is the in-combat regular non-mechanical branch of the
  // Armorclad reform. UnitCalcPre.CAS:1106-1113 applies +3 Defense.
  if (isWarlord && hasAbil(abilities, 'battleArmor')) {
    // PROVENANCE[battleArmor]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1104-1113
    emit('battleArmor', 'b', { def: 3 });
  }

  // Magitek Engineering applies in UnitCalcPre.CAS to Power Engine units.
  // The reform grant helper has already derived `magitekEngine` and Large Shield.
  if (isWarlord && hasAbil(abilities, 'magitekEngine')) {
    // PROVENANCE[magitekEngine]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1051-1058
    emit('magitekEngine', 'b', { toBlk: 20 });
  }

  if (isWarlord && hasAbil(abilities, 'artificer') && hasAbil(abilities, 'mechanical')) {
    // PROVENANCE[artificer]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:37-48
    emit('artificer', 'base', { atk: 1, def: 1, res: 2, rtb: 1 });
  }

  // Mechanical Expert (Warlord): an Engineer/Combat Engineer in the stack carries this
  // perk, granting mechanical units +20% To Hit and +10% To Defend.
  // Phase d — UnitCalc.CAS:275-309.
  if (isWarlord && hasAbil(abilities, 'mechanicalExpert') && hasAbil(abilities, 'mechanical')) {
    // PROVENANCE[mechanicalExpert]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:275-305
    emit('mechanicalExpert', 'd', { toHit: 20, toBlk: 10 });
  }

  // Rebuild (Warlord): +2 melee and +2 armor. Mechanical flag, Death/Illusion
  // Immunity, and Armor Piercing are granted in normalizeCombatUnit.
  // The two unit classes are handled by deliberately ISHERO-complementary code, in
  // different phases. Non-heroes: OLSpell.CAS:260-267 writes both stats at index 1
  // (ABase) when the spell is cast, so it is baked into the base stage.
  // Heroes: UnitCalcPre.CAS:682-691 re-applies them at index 0 on every recalc — phase b.
  if (isWarlord && hasAbil(abilities, 'rebuild')) {
    // PROVENANCE[rebuild]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS:273-285 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:683-690
    emit('rebuild', abilVal(abilities, 'unitType', 'normal') === 'hero' ? 'b' : 'base',
      { atk: 2, def: 2 });
  }

  // Malnourished (Warlord): recruited under a Drought curse — permanent −1 melee, −2 armor.
  // Base stage: CreateUnit.CAS:614-618 writes both at index 1 (ABase).
  if (isWarlord && hasAbil(abilities, 'malnourished')) {
    // PROVENANCE[malnourished]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:614-618
    emit('malnourished', 'base', { atk: -1, def: -2 });
  }

  // Spirit Link (Warlord, Conjurer signature): +2 Resistance. OLSpell.CAS writes the bonus
  // permanently to ABase when the spell lands, before the encounter-time pipeline. Its later
  // non-fantastic targeting status is handled at the target-gating sites; the phase-c EncMagic
  // write deliberately survives that phase-d identity change.
  if (isWarlord && hasAbil(abilities, 'spiritLink')) {
    // PROVENANCE[spiritLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS:181-190
    emit('spiritLink', 'base', { res: 2 });
  }

  // Rally (Warlord, Charismatic retort exclusive combat enchantment): all friendly
  // units gain +2 Resistance until the end of combat.
  // Phase b — UnitCalcPre.CAS:1499-1504 (labelled "Rousing Speech" in the script).
  if (isWarlord && hasAbil(abilities, 'rally')) {
    // PROVENANCE[rally]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1498-1502
    emit('rally', 'b', { res: 2 });
  }

  // Dishearten Prophesy (Warlord, Astrologer retort exclusive city curse): garrison
  // units defending the cursed city suffer -2 Resistance in combat. Only the
  // resistance debuff is modeled (the +4 city unrest is outside this calculator).
  // Phase b — UnitCalcPre.CAS:1630-1633.
  if (isWarlord && hasAbil(abilities, 'disheartenProphecy')) {
    // PROVENANCE[disheartenProphecy]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1625-1634
    emit('disheartenProphecy', 'b', { res: -2 });
  }

  return steps;
}

// --- Poison Touch ---
// Compute probability of failing a single poison resistance roll.
// MoM: d10, success if roll ≤ Resistance. pFail = max(0, (10 - res) / 10).
// CoM: universal -1 save modifier → pFail = max(0, (11 - res) / 10).
// Poison Immunity skips the roll outright rather than granting resistance.
// Magic Immunity does NOT protect from Poison: the effect is dispatched with realm 0,
// and the resistance routine gates Magic Immunity's bonus on realm != 0. The same gate
// excludes Righteousness, Elemental Armor, Resist Elements, Bless and Resist Magic.
function poisonFailProb(defRes, defAbilities, version) {
  const isCoM = version && version.startsWith('com');
  if (hasAbil(defAbilities, 'poisonImmunity')) return 0;
  const penalty = isCoM ? 1 : 0;
  const effectiveRes = defRes - penalty;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Stoning Touch ---
// Compute probability of failing a stoning resistance roll.
// MoM: d10, success if roll ≤ (Resistance + modifier). The stoningTouch value is negative
// (e.g. -3 means a -3 penalty to the target's resistance roll).
// Stoning Immunity and Magic Immunity both skip the roll outright rather than granting
// resistance — Magic Immunity via a gate that jumps past the whole touch/gaze group.
// Righteousness does not apply: the realm is Nature, and Righteousness covers Chaos and Death.
function stoningFailProb(defRes, defAbilities, modifier) {
  if (hasAbil(defAbilities, 'stoningImmunity') || hasAbil(defAbilities, 'magicImmunity')) return 0;
  const effectiveRes = defRes + modifier;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Death Touch ---
// Same kill-roll mechanics as Stoning Touch, but with the Death-realm immunity model:
// Death Immunity and Magic Immunity each skip the roll outright; Righteousness is a real
// +30 resistance bonus (the realm is Death, which Righteousness covers).
// Each attacking figure makes one resistance roll on the target; a failed roll kills
// one defender figure.
function deathTouchFailProb(defRes, defAbilities, modifier) {
  if (hasAbil(defAbilities, 'deathImmunity') || hasAbil(defAbilities, 'magicImmunity')) return 0;
  const bonus = hasAbil(defAbilities, 'righteousness') ? 30 : 0;
  const effectiveRes = defRes + modifier + bonus;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Dispel Evil / Exorcise (shared) ---
// Both are resist-or-banish effects that kill one fantastic figure per attacking
// figure on a failed resist roll, with no defense roll. They share this core: a
// positive `penalty` is the total Resistance reduction on the target. Magic Immunity
// skips the roll outright; a final effective Resistance >= 10 is also immune.
// The realm-targeting and penalty values differ per effect (see callers below).
function fantasticResistKillFailProb(defRes, defAbilities, penalty) {
  if (hasAbil(defAbilities, 'magicImmunity')) return 0;
  const effectiveRes = defRes - penalty;
  if (effectiveRes >= 10) return 0;
  return Math.min(1, Math.max(0, (10 - effectiveRes) / 10));
}

// True for a *created* undead target (Undead/Animate Dead/Revenant), which both
// Dispel Evil and Exorcise hit with an extra penalty — base Death creatures do not
// get this bonus penalty, matching the original MoM Dispel Evil behaviour.
function isCreatedUndeadTarget(defUnitType, defAbilities) {
  return defUnitType === 'fantastic_death'
    && (hasAbil(defAbilities, 'undead') || hasAbil(defAbilities, 'animated'));
}

// --- Dispel Evil ---
// Touch attack. Only affects fantastic_death (created-undead penalty -9, else -4) and
// fantastic_chaos (penalty -4). Other unit types are immune. Spirit Link strips the
// target's fantastic status, so it cannot be affected.
function dispelEvilFailProb(defRes, defAbilities, defUnitType) {
  if (hasAbil(defAbilities, 'spiritLink')) return 0;
  let penalty;
  if (isCreatedUndeadTarget(defUnitType, defAbilities)) {
    penalty = 9;
  } else if (defUnitType === 'fantastic_death' || defUnitType === 'fantastic_chaos') {
    penalty = 4;
  } else {
    return 0;
  }
  return fantasticResistKillFailProb(defRes, defAbilities, penalty);
}

// --- Exorcise (CoM-era successor to Dispel Evil) ---
// Same resist-or-banish mechanic as Dispel Evil, but since CoM it affects fantastic
// creatures of ANY realm (not just Death/Chaos), and uses the ability's own strength
// as the base penalty. `modifier` is the Exorcise strength (e.g. -1 → -1 penalty).
// Created-undead targets suffer an additional -3 (vs Dispel Evil's additional -5).
// Spirit Link strips the target's fantastic status, so it cannot be exorcised.
function exorciseFailProb(defRes, defAbilities, defUnitType, modifier) {
  if (hasAbil(defAbilities, 'spiritLink')) return 0;
  if (!String(defUnitType || '').startsWith('fantastic_')) return 0;
  const penalty = -modifier + (isCreatedUndeadTarget(defUnitType, defAbilities) ? 3 : 0);
  return fantasticResistKillFailProb(defRes, defAbilities, penalty);
}

// --- Destruction ---
// CoM2 and Warlord only ("Ability that causes attacked units to make a resistance roll
// or be disintegrated. Affects the entire unit." — CoM2/Warlord help text, identical in
// both). Two things separate it from Stoning/Death Touch:
//   * ONE roll for the attack, not one per attacking figure ("a resistance roll").
//   * A failed roll destroys the WHOLE unit, not a single figure ("the entire unit").
// Treated as a Chaos-realm attack, so Bless protects: callers pass the Bless-boosted
// resistance (the same `ResDeath` figure the engine uses for Death/Chaos effects).
// Righteousness is deliberately absent — it is MoM-only, and Destruction is CoM2/Warlord-only,
// so the two can never meet; a Righteousness branch here would be dead code.
// Death Immunity and Stoning Immunity do NOT apply — the realm is Chaos, not Death. Magic
// Immunity does: its help text names Doom, Illusion and Poison as the only riders it fails
// to stop on a magical ranged attack, and Destruction is not among them.
// The stored value is a resistance modifier in the same sense as Stoning/Death Touch
// (negative = penalty); the roster ships Destruction=0, i.e. an unmodified roll.
function destructionFailProb(defRes, defAbilities, modifier, version) {
  if (!version || !version.startsWith('com2_')) return 0;
  if (hasAbil(defAbilities, 'magicImmunity')) return 0;
  const effectiveRes = defRes + modifier;
  if (effectiveRes >= 10) return 0;
  return Math.min(1, Math.max(0, (10 - effectiveRes) / 10));
}

// --- Death Gaze ---
// Same roll mechanics as Stoning Gaze. Death Immunity and Magic Immunity each skip the
// roll outright; Righteousness grants +30 resistance (always pushes effective Res ≥ 10).
function deathGazeFailProb(defRes, defAbilities, modifier) {
  if (hasAbil(defAbilities, 'deathImmunity') || hasAbil(defAbilities, 'magicImmunity')) return 0;
  const bonus = hasAbil(defAbilities, 'righteousness') ? 30 : 0;
  const effectiveRes = defRes + modifier + bonus;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Gaze realm ---
// A gaze's damage realm is a property of the single `ranged_type` field, not of the
// attacker's own realm. MoM 1.31 classifies 103 Stoning Gaze -> Nature, 104 Multi/Doom
// Gaze -> Chaos, 105 Death Gaze -> Death (WIZARDS.EXE switch at 0x9A79E; the gaze rows are
// byte-identical in CP 1.60 and CoM 1). Because the stoning kill loop fires on 103 or 104
// and the death loop on 104 or 105, a unit carrying *both* gazes is necessarily type 104 —
// which is also what gives Doom Gaze its automatic damage.
//
// In the DOS versions the flags below are themselves derived from `ranged_type` (see
// `dosSpecialValues`), so this reads the type through them rather than treating them as
// independent inputs: stoning-only is 103, death-only 105, both 104. CoM2 and Warlord keep
// genuinely independent gaze fields, which is why the inference stays flag-shaped here.
function gazeRealm(atkAbilities) {
  const stoning = abilDefined(atkAbilities, 'stoningGaze');
  const death = abilDefined(atkAbilities, 'deathGaze');
  if ((abilVal(atkAbilities, 'doomGaze', 0) || 0) > 0 || (stoning && death)) return 'chaos';
  if (death) return 'death';
  if (stoning) return 'nature';
  return null;
}

// Build the combined gaze damage distribution delivered by `atk` against `def`.
// Includes the hidden physical ranged component, followed by doom gaze (exact damage),
// stoning-kill rolls and death-kill rolls.
// Blur applies only to the hidden physical ranged component, not doom gaze.
//
// The hidden component is rolled **once per attacking figure**: it runs inside
// `BU_ProcessAttack`'s per-figure loop, whose bound is the gazer's own figure count
// (WIZARDS.EXE body 0x99F5A, back-edge 0x9A576, identical in CP 1.60 and CoM 1). The two
// kill loops sit *before* that loop and are bounded by the **defender's** figure count
// (0x99E0C stoning, 0x99EAB death), so they resolve once per attack — hence `defAlive`
// below but `atkAlive` above.
function buildGazeDist(atk, def, atkAlive, defAlive, defRemHP, stoningFail, deathFail, doomStr, defDefStat, defInvulnBonus, blurChance, blurBuggy, defTopFigHP, conventionalAsDoom = false, defToBlockOverride = null, minDamageFromHits = null) {
  if (defAlive <= 0 || defRemHP <= 0) return [1];
  let dist = [1];
  const defStat = (defDefStat != null) ? defDefStat : def.def;
  const defToBlock = (defToBlockOverride != null) ? defToBlockOverride : def.toBlock;
  if (atk.effectiveGazeRanged > 0) {
    const gazeFigs = Math.max(1, atkAlive);
    dist = conventionalAsDoom
      ? calcDoomDist(gazeFigs, atk.effectiveGazeRanged, defRemHP)
      : calcTotalDamageDist(gazeFigs, atk.effectiveGazeRanged, atk.toHitRtb, defStat, defToBlock, def.hp, defRemHP, defInvulnBonus, blurChance, blurBuggy, defTopFigHP, minDamageFromHits);
  }
  // Doom Gaze: exact damage, no rolls, no immunities
  if (doomStr > 0) {
    const doomDist = new Array(Math.min(doomStr, defRemHP) + 1).fill(0);
    doomDist[Math.min(doomStr, defRemHP)] = 1;
    dist = convolveDists(dist, doomDist, defRemHP);
  }
  // Stoning- and death-gaze kill rolls. A figure dies if it fails *either* roll,
  // and can only die once, so the two are combined into a single joint per-figure
  // kill probability rather than convolved independently (which would double-count
  // a figure that fails both — only Chaos Spawn carries both gazes at once).
  if (stoningFail > 0 || deathFail > 0) {
    const jointFail = 1 - (1 - stoningFail) * (1 - deathFail);
    dist = convolveDists(dist, calcFigureKillDmgDist(defAlive, jointFail, def.hp, defRemHP), defRemHP);
  }
  return dist;
}

// Build a deterministic doom damage distribution.
// Doom damage skips attack rolls and defense rolls: total = figs * str, capped at maxDmg.
function calcDoomDist(figs, str, maxDmg) {
  const totalDmg = Math.min(figs * str, maxDmg);
  const dist = new Array(totalDmg + 1).fill(0);
  dist[totalDmg] = 1;
  return dist;
}

// Phase label for a gaze attack given which gaze types are active.
function gazeLabel(stoning, death, doom) {
  const count = (stoning ? 1 : 0) + (death ? 1 : 0) + (doom ? 1 : 0);
  if (count > 1) return 'Gaze Attack';
  if (stoning) return 'Stoning Gaze';
  if (death) return 'Death Gaze';
  if (doom) return 'Doom Gaze';
  return 'Gaze';
}

function appendBreakdownTouchLabels(label, params) {
  const {
    poisonTouch = false,
    stoningTouch = false,
    deathTouch = false,
    dispelEvil = false,
    exorcise = false,
    destruction = false,
    lifeSteal = false,
    immolation = false,
  } = params;
  let out = label;
  if (poisonTouch) out += ' + Poison Touch';
  if (stoningTouch) out += ' + Stoning Touch';
  if (deathTouch) out += ' + Death Touch';
  if (dispelEvil) out += ' + Dispel Evil';
  if (exorcise) out += ' + Exorcise';
  if (destruction) out += ' + Destruction';
  if (lifeSteal) out += ' + Life Steal';
  if (immolation) out += ' + Immolation';
  return out;
}

function thrownPhaseLabel(params) {
  const {
    thrownType,
    hasted,
    poisonTouch,
    stoningTouch,
    deathTouch,
    dispelEvil,
    exorcise,
    destruction,
    lifeSteal,
    immolation,
  } = params;
  let label = thrownType === 'thrown' ? 'Thrown'
            : thrownType === 'fire' ? 'Fire Breath'
            : 'Lightning Breath';
  if (hasted) label = 'Hasted ' + label;
  return appendBreakdownTouchLabels(label, { poisonTouch, stoningTouch, deathTouch, dispelEvil, exorcise, destruction, lifeSteal, immolation });
}

function gazePhaseLabel(side, params) {
  const {
    stoningGaze,
    deathGaze,
    doomGaze,
    poisonTouch,
    stoningTouch,
    deathTouch,
    dispelEvil,
    exorcise,
    destruction,
    lifeSteal,
    immolation,
  } = params;
  return appendBreakdownTouchLabels(side + ' ' + gazeLabel(stoningGaze, deathGaze, doomGaze), {
    poisonTouch,
    stoningTouch,
    deathTouch,
    dispelEvil,
    exorcise,
    destruction,
    lifeSteal,
    immolation,
  });
}

function firstStrikeBreakdownLabel(params) {
  return appendBreakdownTouchLabels('First Strike', params);
}

function secondStrikeCounterBreakdownLabel(params) {
  const { counterHasted, ...touchParams } = params;
  let label = appendBreakdownTouchLabels('Hasted 2nd Strike', touchParams);
  label += counterHasted ? ' + Hasted Counter-attack' : ' + Counter-attack';
  return label;
}

function counterBreakdownLabel(params) {
  const { counterHasted, ...touchParams } = params;
  return appendBreakdownTouchLabels(counterHasted ? 'Hasted Counter-attack' : 'Counter-attack', touchParams);
}

function meleeBreakdownLabel(params) {
  const { hasted, counterHasted, ...touchParams } = params;
  let label = appendBreakdownTouchLabels(hasted ? 'Hasted Melee' : 'Melee', touchParams);
  label += counterHasted ? ' + Hasted Counter-attack' : ' + Counter-attack';
  return label;
}

// --- Life Steal ---
// Compute whether life steal can affect the target, and return the modifier.
// Returns null if immune: Death Immunity and Magic Immunity each skip the roll outright,
// Righteousness grants +30 resistance, and an effective Res ≥ 10 can never fail a save.
// The lifeSteal value is the resistance penalty (e.g. -3 means target's res is penalized by 3).
function lifeStealEffective(defRes, defAbilities, modifier) {
  if (hasAbil(defAbilities, 'deathImmunity') || hasAbil(defAbilities, 'magicImmunity')) return null;
  const bonus = hasAbil(defAbilities, 'righteousness') ? 30 : 0;
  const effRes = defRes + modifier + bonus;
  if (effRes >= 10) return null;
  return modifier;
}

// Check whether BU_ProcessAttack reaches its touch dispatcher for a selected attack call.
// MoM 1.31 returns when that call's live strength is 0. CP 1.60 and CoM 1 patch the
// conditional jump to an unconditional jump, so a call that was already admitted still
// dispatches touches at 0 strength. Modern callers retain their represented base-channel gate.
function touchAttackFires(effectiveAtk, baseAtk, version) {
  if (version === 'mom_1.31') return effectiveAtk > 0;
  if (version === 'mom_cp_1.60.00' || version === 'com_6.08') return true;
  return (baseAtk || 0) > 0;
}

// Check whether a gaze attack fires for a given unit.
// Stoning/Death Gaze are attached to the hidden gaze ranged component (or, for Chaos Spawn,
// the Doom Gaze) and fire only while that hidden attack strength is > 0. In MoM (1.31 and
// 1.60) the hidden attack must be present; in later versions (CoM+) gaze always fires.
// Same effective-vs-base split as touch delivery: MoM 1.31 uses *effective* hidden strength
// (the v1.31 bug suppresses gaze when reduced to 0); MoM 1.60 uses *base* hidden strength
// (so reducing the effective value to 0, e.g. via Black Prayer, no longer disables the gaze).
function gazeAttackFires(effectiveGazeRanged, effectiveDoomGaze, baseGazeRanged, baseDoomGaze, version) {
  if (version === 'mom_1.31') return effectiveGazeRanged > 0 || effectiveDoomGaze > 0;
  if (version === 'mom_cp_1.60.00') return (baseGazeRanged || 0) > 0 || (baseDoomGaze || 0) > 0;
  return true;
}

function hasWeaponImmunityEffect(abilities) {
  return hasAbil(abilities, 'weaponImmunity') || hasAbil(abilities, 'invulnerability')
      || hasAbil(abilities, 'wraithForm') || hasAbil(abilities, 'rulerOfUnderworld');
}

// Caster.exe passes `EncMagic or magicranged` from ApplyAttack to EffectiveDefense.
// King/Ruler of Underworld suppresses only the attacker's ApplyMagicWeapons material grant.
// An independent EncMagic source survives whether it runs before or after that helper. The
// derived unit record keeps those sources separate so this helper mirrors the engine input.
function modernAttackIsMagic(attacker, defAbilities, magicranged) {
  if (magicranged) return true;
  if (hasAbil(defAbilities, 'rulerOfUnderworld')) {
    return !!attacker.encMagicIndependentOfMaterial;
  }
  return !!attacker.encMagic;
}

function weaponImmunityApplies(defAbilities, atkWeapon, atkUnitType, version, atkGeneric) {
  if (!hasWeaponImmunityEffect(defAbilities)) return false;
  // Ruler of Underworld preserves Weapon Immunity against magical/mithril/adamantium
  // weapons, but still only against normal-unit attacks.
  if (atkWeapon !== 'normal' && !hasAbil(defAbilities, 'rulerOfUnderworld')) return false;
  if (!isNormalUnitType(atkUnitType)) return false;
  // MoM 1.31 marks generic hulls as having a magical weapon, so they never set
  // the attack-side Weapon Immunity flag.
  if (version === 'mom_1.31' && atkGeneric) return false;
  return true;
}

// Wraith Form and Ruler of Underworld both grant Non-Corporeal in addition to Weapon Immunity.
function hasNonCorporealEffect(abilities) {
  return hasAbil(abilities, 'nonCorporeal')
      || hasAbil(abilities, 'wraithForm')
      || hasAbil(abilities, 'rulerOfUnderworld');
}

// --- Rage (Warlord) ---
// +1 melee (and +1 ranged, if the unit has a ranged attack) per figure the unit has lost.
// "Figures lost" = original figures − figures currently alive, so it folds in BOTH
// pre-combat casualties (from the Damage field) and casualties taken earlier in this
// combat — the alive count passed in already reflects cumulative in-combat damage.
// Only boosts an attack that already exists (base strength > 0); never creates one.
// STAT-FORMULA[rageEffectiveAttack]
// PROVENANCE[rageEffectiveAttack]: UNVERIFIED versions=all; gap=Rage survivor scaling lacks complete applicable implementation ranges; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
function applyRage(baseAtk, unit, aliveNow) {
  if (baseAtk <= 0 || !hasAbil(unit.abilities, 'rage')) return baseAtk;
  return baseAtk + Math.max(0, unit.figs - aliveNow);
}

// --- Weapon Immunity ---
// Applies Weapon Immunity defense boost after armor piercing.
// MoM: defense raised to minimum 10.  CoM/CoM2: +8 defense.  Warlord: +10 defense.
// Triggers only against Normal units with normal (non-magical) weapons.
// Phase applicability varies by version:
//   Melee: always applies.
//   Thrown: applies in all versions EXCEPT v1.31 (bug: thrown ignores WI).
//   Ranged missile/boulder: always applies (all versions).
//   Magic ranged: never (already magical).
// v1.31 bug: Generic units (Trireme, Galley, Warship, Catapult) bypass WI regardless of attack type.
// STAT-FORMULA[weaponImmunityEffectiveDefense]
// PROVENANCE[weaponImmunityEffectiveDefense]: UNVERIFIED versions=all; gap=combined DOS/modern effective-Defense gate and constants are not fully cited; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
function weaponImmunityDef(baseDef, defAbilities, atkWeapon, atkUnitType, version, atkGeneric) {
  if (!weaponImmunityApplies(defAbilities, atkWeapon, atkUnitType, version, atkGeneric)) return baseDef;
  if (version && version.startsWith('com2_warlord')) {
    return baseDef + 10;
  }
  if (version && version.startsWith('com')) {
    return baseDef + 8;
  }
  return Math.max(baseDef, 10);
}

// --- Missile Immunity ---
// Applies Missile Immunity defense boost. Only triggers against Ranged Missile Attacks.
// MoM: defense set to 50. CoM/CoM2: defense set to 100. Applied after armor piercing and weapon immunity.
// STAT-FORMULA[missileImmunityEffectiveDefense]
// PROVENANCE[missileImmunityEffectiveDefense]: UNVERIFIED versions=all; gap=per-version Missile Immunity effective-Defense formula lacks complete implementation ranges; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
function missileImmunityDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'missileImmunity')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Fire Immunity ---
// Raises defense against Fire Breath and Immolation damage. MoM: 50. CoM/CoM2: 100.
// Applied after armor piercing and weapon immunity.
// STAT-FORMULA[fireImmunityEffectiveDefense]
// PROVENANCE[fireImmunityEffectiveDefense]: UNVERIFIED versions=all; gap=per-version Fire Immunity effective-Defense formula lacks complete implementation ranges; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
function fireImmunityDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'fireImmunity')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Righteousness ---
// Life-realm unit enchantment. Protects against Chaos/Death magic.
// In combat, applies:
//   Defense 50 (MoM) / 100 (CoM/CoM2) vs Chaos-realm Ranged Magical Attack (magic_c), Fire Breath, Lightning Breath
//   Defense 50/100 vs Immolation and Wall of Fire (via magicImmunityDef chain)
//   Defense 50 vs the hidden component of a Chaos- or Death-realm gaze (MoM only)
//   +30 Resistance vs Cause Fear, Life Steal, Death Gaze (always pushes effective Res ≥ 10).
// STAT-FORMULA[righteousnessEffectiveDefense]
// PROVENANCE[righteousnessEffectiveDefense]: UNVERIFIED versions=all; gap=per-version Righteousness effective-Defense formula lacks complete implementation ranges; pointer=Reference docs/DOS reconstructed/combat.c
function righteousnessDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'righteousness')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Magic Immunity (defense) ---
// Raises defense against magic ranged attacks, Immolation, and Wall of Fire.
// MoM: defense set to 50. CoM/CoM2: defense set to 100.
// Applied after other defense modifiers; overrides Fire Immunity and Righteousness if higher.
// STAT-FORMULA[magicImmunityEffectiveDefense]
// PROVENANCE[magicImmunityEffectiveDefense]: UNVERIFIED versions=all; gap=per-version Magic Immunity effective-Defense formula lacks complete implementation ranges; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
function magicImmunityDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'magicImmunity')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Immolation ---
// Immolation strength: 4 in MoM, 10 in CoM/CoM2.
// Delivered as a Fireball effect (spell 96) with an explicit strength override:
// WIZARDS.EXE 0x99D5E pushes 4 in both MoM builds, CoM 1's 0x99D50 pushes 10.
// STAT-FORMULA[immolationStrength]
// PROVENANCE[immolationStrength]: UNVERIFIED versions=all; gap=per-version Immolation strength constants lack complete implementation/table citations; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
function immolationStr(version) {
  if (version && (version.startsWith('com_') || version.startsWith('com2_'))) return 10;
  return 4;
}

// After 1.50 patch (and CoM/CoM2), immolation no longer accompanies ranged attacks.
// Thrown, breath, gaze, and melee still fire in all versions.
function immolationBlocksRanged(version) {
  return version !== 'mom_1.31';
}

// --- Wall of Fire ---
// Wall of Fire: town enchantment. Inflicts a Ranged Magical Immolation Damage
// attack on every attacker figure that melees a unit inside the town.
// Strength 5 in MoM; strength 10 in CoM/CoM2; strength 12 in Warlord.
// Fires once per combat, at Step 3 in the melee sequence: AFTER thrown/breath
// and gaze phases, BEFORE the melee damage + counter-attack.
// Targets only the attacker (A) - the unit passing through the wall.
// Does not fire in ranged combat (attacker shoots from outside the wall).
// Magic Immunity raises defense to 50 (MoM) / 100 (CoM/CoM2). Fire Immunity and
// Righteousness also raise defense to 50/100. Large Shield and AP apply.
// Warlord: hits a single figure at strength 12 instead of every figure at 10.
// Also a Fireball effect (spell 96), but MoM passes no strength override
// (WIZARDS.EXE 0x9EE60) so it inherits Fireball's own SPELLDAT.LBX strength of 5.
// CoM 1 patches that site to push 10 — without it the value would be 12, because
// CoM 1 raised Fireball itself to 12. Fireball carries Att_AREAFLAG in every build,
// which is what makes the attack land on every figure.
// All three CoM2/Warlord values come straight from SPELLS.INI `[87]`: Attack 10 -> 12,
// HitChance absent -> 60, and Area=True dropped in Warlord — the modern engine's spelling of
// Att_AREAFLAG, and the only such removal between the two rosters. CoM2's 30% is the engine
// default rather than a stated value. See `Reference docs/CoM2 data tables.md`, *Wall of Fire*.
// STAT-FORMULA[wallOfFireStrength]
// PROVENANCE[wallOfFireStrength]: UNVERIFIED versions=all; gap=per-version Wall of Fire strength constants lack complete implementation/table citations; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
function wallOfFireStr(version) {
  if (version && version.startsWith('com2_warlord')) return 12;
  if (version && (version.startsWith('com_') || version.startsWith('com2_'))) return 10;
  return 5;
}

// Wall of Fire To Hit: standard 30% spell To Hit, except Warlord raises it to 60%.
function wallOfFireToHit(version) {
  return (version && version.startsWith('com2_warlord')) ? 0.6 : 0.3;
}

// Warlord: Wall of Fire strikes a single attacker figure rather than all of them.
function wallOfFireSingleFigure(version) {
  return !!(version && version.startsWith('com2_warlord'));
}

// --- Cause Fear ---
// Probability of a single figure failing its fear resistance roll.
// MoM: no resistance modifier. CoM/CoM2: -3 resistance modifier.
// Death Immunity skips the roll outright rather than granting resistance.
// Magic Immunity and Righteousness each grant +30 resistance and stack
// (either alone already pushes effective Res ≥ 10).
function fearFailProb(defRes, defAbilities, version) {
  const isCoM = version && version.startsWith('com');
  const modifier = isCoM ? -3 : 0;
  if (hasAbil(defAbilities, 'deathImmunity')) return 0;
  const bonus = (hasAbil(defAbilities, 'magicImmunity') ? 30 : 0)
    + (hasAbil(defAbilities, 'righteousness') ? 30 : 0);
  const effectiveRes = defRes + modifier + bonus;
  if (effectiveRes >= 10) return 0;
  return Math.min(1, Math.max(0, (10 - effectiveRes) / 10));
}

// Marginal fear display distribution when survivor count is uncertain.
// survivorDist[k] = P(k figures alive when fear fires); returns dist[j] = P(j figures feared).
function marginalFearDistFromSurvivors(survivorDist, pFear) {
  const maxFigs = survivorDist.length - 1;
  const result = new Array(maxFigs + 1).fill(0);
  for (let k = 0; k <= maxFigs; k++) {
    const pK = survivorDist[k];
    if (pK < 1e-15) continue;
    if (k === 0 || pFear <= 0) { result[0] += pK; continue; }
    if (pFear >= 1) { result[k] += pK; continue; }
    const bd = binomialPMF(k, pFear);
    for (let j = 0; j < bd.length; j++) result[j] += pK * bd[j];
  }
  return result;
}

// P(total damage in dist >= remHP), i.e. P(unit stack completely destroyed).
function pDestroyedFrom(dist, remHP) {
  let p = 0;
  for (let d = remHP; d < dist.length; d++) p += dist[d] || 0;
  return p;
}

// Distribution of unfeared (active) figures under Cause Fear.
// Returns array where dist[k] = P(k figures are unfeared).
// Uses Binomial(numFigs, 1 - pFear).
function calcFearDist(numFigs, pFear) {
  if (numFigs <= 0) return [1];
  if (pFear <= 0) {
    const d = new Array(numFigs + 1).fill(0);
    d[numFigs] = 1;
    return d;
  }
  if (pFear >= 1) {
    const d = new Array(numFigs + 1).fill(0);
    d[0] = 1;
    return d;
  }
  return binomialPMF(numFigs, 1 - pFear);
}

// v1.31 bug: attacker self-fears based on defender's resistance rolls.
// Defender's figures each roll; each fail fears one attacker figure.
// Returns dist[k] = P(k attacker figures are unfeared).
function calcFearBugDist(atkFigs, defFigs, pFear) {
  if (atkFigs <= 0) return [1];
  if (pFear <= 0 || defFigs <= 0) {
    const d = new Array(atkFigs + 1).fill(0);
    d[atkFigs] = 1;
    return d;
  }
  // Defender fails ~ Binomial(defFigs, pFear)
  const failsPMF = binomialPMF(defFigs, pFear);
  const d = new Array(atkFigs + 1).fill(0);
  for (let f = 0; f <= defFigs; f++) {
    if (failsPMF[f] < 1e-15) continue;
    d[Math.max(atkFigs - f, 0)] += failsPMF[f];
  }
  return d;
}

// Convolve a unit's active touch attacks into `dist`, capped at `cap`.
// Touch attacks (Poison, Stoning, Dispel Evil, Life Steal, Immolation) all scale with
// `atkFigs`. Each touch is active iff its trigger params are set:
//   poisonStr > 0 && poisonFail > 0  → Poison Touch
//   stoningFail > 0                   → Stoning Touch (kills figures, damage = targetHP)
//   deathTouchFail > 0                → Death Touch   (kills figures, damage = targetHP)
//   dispelEvilFail > 0                → Dispel Evil   (kills figures, damage = targetHP)
//   exorciseFail > 0                  → Exorcise      (kills figures, damage = targetHP)
//   destructionFail > 0               → Destruction   (kills the whole unit, damage = cap;
//                                       one roll for the attack, so it does NOT scale with
//                                       atkFigs the way the figure-kill touches do)
//   lifeStealMod != null              → Life Steal    (uses lifeStealRes)
//   immDist truthy                    → Immolation    (caller pre-computes the area dist)
// Returns { dist, lifeStealEV, lifeStealDist }. lifeStealDist is the standalone life-steal
// distribution (or null if life steal not active) — exposed so callers that need to display
// or further transform it (e.g. Haste doubling) don't have to recompute.
// Convolution is commutative, so the chosen order is purely a readability choice.
function convolveTouchAttacks(dist, cap, atkFigs, p) {
  let lifeStealEV = 0;
  let lifeStealDist = null;
  let bloodsuckerHealEV = 0;
  if (atkFigs <= 0) return { dist, lifeStealEV, lifeStealDist, bloodsuckerHealEV };
  // Bloodsucker (Warlord): fires once per phase if the base attack dealt ≥1 damage
  // through armor. The input `dist` here is the post-armor base attack damage (touch
  // attacks haven't been folded in yet), so dist[0] correctly reflects "armor blocked
  // everything". On trigger: +2 damage to target, attacker heals by the same amount.
  // The +2 is capped at the target's remaining HP for the phase, and the heal is
  // capped to the actual extra damage dealt (you can't drain more than you removed),
  // so a +2 clipped to +1 by overkill also heals only 1. Folded into lifeStealEV in
  // the return since both abilities are attacker self-heal — exposed separately as
  // bloodsuckerHealEV so haste self-convolution callers can double it.
  if (p.bloodsucker && dist && dist.length > 0) {
    const pTrigger = 1 - (dist[0] || 0);
    if (pTrigger > 1e-15) {
      const shifted = new Array(cap + 1).fill(0);
      shifted[0] = dist[0] || 0;
      for (let d = 1; d < dist.length; d++) {
        if (dist[d] < 1e-15) continue;
        const actualBS = Math.max(0, Math.min(2, cap - d));
        shifted[d + actualBS] += dist[d];
        bloodsuckerHealEV += dist[d] * actualBS;
      }
      dist = shifted;
    }
  }
  if (p.poisonStr > 0 && p.poisonFail > 0) {
    dist = convolveDists(dist, calcResistDmgDist(atkFigs * p.poisonStr, p.poisonFail, cap), cap);
  }
  if (p.stoningFail > 0) {
    dist = convolveDists(dist, calcFigureKillDmgDist(atkFigs, p.stoningFail, p.targetHP, cap), cap);
  }
  if (p.deathTouchFail > 0) {
    dist = convolveDists(dist, calcFigureKillDmgDist(atkFigs, p.deathTouchFail, p.targetHP, cap), cap);
  }
  if (p.dispelEvilFail > 0) {
    dist = convolveDists(dist, calcFigureKillDmgDist(atkFigs, p.dispelEvilFail, p.targetHP, cap), cap);
  }
  if (p.exorciseFail > 0) {
    dist = convolveDists(dist, calcFigureKillDmgDist(atkFigs, p.exorciseFail, p.targetHP, cap), cap);
  }
  if (p.destructionFail > 0) {
    dist = convolveDists(dist, calcUnitKillDmgDist(p.destructionFail, cap), cap);
  }
  if (p.lifeStealMod != null) {
    lifeStealDist = calcLifeStealDmgDist(atkFigs, p.lifeStealRes, p.lifeStealMod, cap);
    dist = convolveDists(dist, lifeStealDist, cap);
    lifeStealEV = expectedDamage(lifeStealDist);
  }
  if (p.immDist) {
    dist = convolveDists(dist, p.immDist, cap);
  }
  return { dist, lifeStealEV: lifeStealEV + bloodsuckerHealEV, lifeStealDist, bloodsuckerHealEV };
}

// Compute melee + touch-attack damage distribution, weighted over possible
// unfeared figure counts (Cause Fear).
// fearDist: array where fearDist[k] = P(k figures attack), or null if no fear active.
// blurChance/blurBuggy: Blur pre-defense hit negation (0 = no blur; not applied to doom attacks).
function calcMeleeTouchOutcome(fearDist, maxFigs, isDoom, atk, toHit,
                               def, toBlock, targetHP, remHP,
                               poisonStr, poisonFail,
                               stoningFail,
                               deathTouchFail,
                               dispelEvilFail,
                               exorciseFail,
                               destructionFail,
                               lifeStealMod, lifeStealRes,
                               immolationDist, defInvulnBonus,
                               blurChance, blurBuggy,
                               doubleStrike, defTopFigHP,
                               minDamageFromHits,
                               bloodsucker) {
  if (remHP <= 0 || maxFigs <= 0) return { damageDist: [1], lifeStealEV: 0 };
  const result = new Array(remHP + 1).fill(0);
  let lifeStealEV = 0;
  const lo = fearDist ? 0 : maxFigs;
  const touchSpec = {
    poisonStr, poisonFail,
    stoningFail, deathTouchFail, dispelEvilFail, exorciseFail, destructionFail, targetHP,
    lifeStealMod, lifeStealRes,
    immDist: immolationDist,
    bloodsucker,
  };
  for (let k = lo; k <= maxFigs; k++) {
    const pK = fearDist ? fearDist[k] : 1;
    if (pK < 1e-15) continue;
    let dist;
    if (k <= 0 || atk <= 0) {
      dist = [1];
    } else if (isDoom) {
      dist = calcDoomDist(k, atk, remHP);
    } else {
      dist = calcTotalDamageDist(k, atk, toHit, def, toBlock, targetHP, remHP, defInvulnBonus, blurChance, blurBuggy, defTopFigHP, minDamageFromHits);
    }
    const tOut = convolveTouchAttacks(dist, remHP, k, touchSpec);
    dist = tOut.dist;
    lifeStealEV += pK * tOut.lifeStealEV;
    if (doubleStrike && k > 0 && atk > 0) {
      dist = convolveDists(dist, dist, remHP);
      if (lifeStealMod !== null) lifeStealEV += pK * expectedDamage(calcLifeStealDmgDist(k, lifeStealRes, lifeStealMod, remHP));
      // Bloodsucker fires once per strike; haste's second strike is a second trigger check.
      if (bloodsucker) lifeStealEV += pK * tOut.bloodsuckerHealEV;
    }
    for (let d = 0; d < dist.length; d++) result[d] += pK * dist[d];
  }
  return { damageDist: result, lifeStealEV };
}

function repeatDist(dist, times, cap) {
  if (!dist || times <= 0) return null;
  let result = [1];
  for (let i = 0; i < times; i++) {
    result = convolveDists(result, dist, cap);
  }
  return result;
}

function expectedDamage(dist) {
  if (!dist) return 0;
  let ev = 0;
  for (let d = 0; d < dist.length; d++) ev += d * dist[d];
  return ev;
}

// Build feared-count display distributions for the phase breakdown.
// Returns { atkFearedDist, defFearedDist } or null if no fear is active.
// defSurvivorDist / atkSurvivorDist: optional marginal distributions over how many figures
// survive to the fear check (accounts for prior-phase casualties from gaze/thrown/WoF).
// When provided, the fear distribution is correctly marginalised; otherwise initial counts are used.
function buildFearPhaseDists(aFigs, bFigs, bPFear, aPFear, aFearedByB, aFearBug, bFearedByA, showNoop = false,
                              defSurvivorDist = null, atkSurvivorDist = null) {
  if (!aFearedByB && !aFearBug && !bFearedByA) return showNoop ? { atkFearedDist: [1], defFearedDist: [1] } : null;
  // B's feared dist (from A's fear)
  const defFearedDist = bFearedByA && bFigs > 0
    ? (defSurvivorDist ? marginalFearDistFromSurvivors(defSurvivorDist, bPFear) : binomialPMF(bFigs, bPFear))
    : [1];
  // A's feared dist (from B's fear or v1.31 self-fear bug)
  let atkFearedDist;
  if (aFearedByB && aFigs > 0) {
    atkFearedDist = atkSurvivorDist
      ? marginalFearDistFromSurvivors(atkSurvivorDist, aPFear)
      : binomialPMF(aFigs, aPFear);
  } else if (aFearBug && aFigs > 0 && bFigs > 0) {
    // v1.31 bug: B's figures roll, each fail fears one of A's figures
    const failsPMF = binomialPMF(bFigs, bPFear);
    atkFearedDist = new Array(aFigs + 1).fill(0);
    for (let f = 0; f <= bFigs; f++) {
      if (failsPMF[f] < 1e-15) continue;
      atkFearedDist[Math.min(f, aFigs)] += failsPMF[f];
    }
  } else {
    atkFearedDist = [1];
  }
  return { atkFearedDist, defFearedDist };
}

// --- Blur ---
// Returns effective Blur chance (0–1) for attacks against a unit.
// defAbilities: defender's abilities; atkAbilities: attacker's abilities.
// CoM/CoM2: Blur rate 20%, Invisibility also grants 20%; combined cap is 30%.
// Warlord: same as CoM2 but combined cap is 40%.
// MoM: Blur rate 10%.
// The three CoM2/Warlord rates are confirmed by MODDING.INI `[Spells]` — BlurDamageReduction=20,
// InvisibilitydamageReduction=20, BlurInvisibilityTotalReduction=30 (40 in Warlord). R5.2c/k
// establish that Blur is side-wide and selected through turn-relative `CGADEnemy` (F24).
// v1.31 bug: Illusion Immunity checked on defender instead of attacker.
// Fixed (1.51+/CoM/CoM2): Illusion Immunity checked on attacker.
function getBlurChance(defAbilities, atkAbilities, version) {
  const isCoM = version && version.startsWith('com');
  const isWarlord = version && version.startsWith('com2_warlord');
  const hasBlur = !!(defAbilities && defAbilities.blur);
  const hasInvis = !!(defAbilities && defAbilities.invisibility);
  const invisGivesBlur = isCoM;
  const blurRate = isCoM ? 0.2 : 0.1;
  const stackedChance = isWarlord ? 0.4 : 0.3;

  let blurChance = 0;
  if (hasBlur && invisGivesBlur && hasInvis) {
    blurChance = stackedChance;
  } else if (hasBlur) {
    blurChance = blurRate;
  } else if (invisGivesBlur && hasInvis) {
    blurChance = blurRate;
  }
  if (!blurChance) return 0;

  if (version === 'mom_1.31') {
    if (defAbilities && defAbilities.illusionImmunity) return 0;
  } else {
    if (atkAbilities && atkAbilities.illusionImmunity) return 0;
  }
  return blurChance;
}

// Apply immunities granted by the Undead / Animate Dead state.
// v1.31 bug: only Death Immunity actually applies; Cold/Poison/Illusions Immunity are missing.
// Fixed in v1.51 (all four apply). All our non-1.31 versions are v1.51+.
// MoM grants these off a *race* test rather than the undead flag — the undead block sets
// race = Death, then WIZARDS.EXE 0x8F81A ORs 0x40 (Death only) in 1.31 and 0xD8 (all four)
// in CP 1.60. CoM 1 deletes that gate and ORs 0x58 (Death|Cold|Illusion, no Poison) inside
// the undead block itself (0x8F4C6).
// STAT-FORMULA[undeadImmunityDerivation]
// PROVENANCE[undeadImmunityDerivation]: UNVERIFIED versions=all; gap=derived immunity package lacks complete applicable implementation gates/writes; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
function applyUndeadImmunities(unit, version) {
  if (!hasAbil(unit.abilities, 'undead') && !hasAbil(unit.abilities, 'animated')) return unit;
  const extra = { deathImmunity: true };
  if (version !== 'mom_1.31') {
    extra.illusionImmunity = true;
    extra.coldImmunity = true;
  }
  // Poison Immunity from the Undead status: MoM (post-1.31) grants it (base design,
  // restored by the post-1.31 fix). CoM removed it in v5.45 as a balance change
  // ("undead gain Death, Cold and Illusion immunity, but not Poison"), and CoM2 and
  // Warlord inherit the removal. So the undead *status* grants Poison only in MoM;
  // units that carry Poison Immunity as an explicit unit ability keep it regardless.
  if (version && version.startsWith('mom') && version !== 'mom_1.31') {
    extra.poisonImmunity = true;
  }
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, extra),
  });
}

// STAT-FORMULA[animatedEffectDerivation]
// PROVENANCE[animatedEffectDerivation]: UNVERIFIED versions=all; gap=Animated derived stat/ability package lacks complete applicable implementation ranges; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
function applyAnimatedEffects(unit, version) {
  if (!hasAbil(unit.abilities, 'animated')) return unit;
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { weaponImmunity: true }),
  });
}

// Apply immunities from Black Channels.
// Grants Cold, Illusion, Poison, Death immunities in all versions (BC explicitly grants all four,
// unlike the Undead attribute which only grants Death Immunity in v1.31).
// STAT-FORMULA[blackChannelsEffectDerivation]
// PROVENANCE[blackChannelsEffectDerivation]: UNVERIFIED versions=all; gap=Black Channels derived immunity/status package lacks complete applicable implementation ranges; pointer=Reference docs/DOS reconstructed/unitcalc.c
function applyBlackChannelsEffects(unit) {
  if (!hasAbil(unit.abilities, 'blackChannels')) return unit;
  const extra = {
    coldImmunity: true,
    illusionImmunity: true,
    poisonImmunity: true,
    deathImmunity: true,
  };
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, extra),
  });
}

// Warlord Rebuild (Arcane unit enchantment): unit becomes Mechanical and gains
// Death Immunity, Illusion Immunity, and Armor Piercing. Stat bonuses are
// applied by getAbilityStatSteps.
// STAT-FORMULA[rebuildEffectDerivation]
// PROVENANCE[rebuildEffectDerivation]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Rebuild derived type/immunity/armor-piercing package lacks all current implementation ranges; pointer=Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS
function applyRebuildEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'rebuild')) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, {
      mechanical: true,
      deathImmunity: true,
      illusionImmunity: true,
      armorPiercing: true,
    }),
  });
}

// Warlord Tactician retort: teleporting units gain First Strike;
// non-corporeal units (including via Wraith Form / Ruler of Underworld) gain Negate First Strike;
// units on their favored terrain gain both First Strike and Negate First Strike.
// STAT-FORMULA[tacticianAbilityDerivation]
// PROVENANCE[tacticianAbilityDerivation]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Tactician First Strike/Negate First Strike derivation lacks complete current gates; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS
function applyTacticianWarlordEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'tactician')) return unit;
  const extra = {};
  if (hasAbil(unit.abilities, 'teleporting')) extra.firstStrike = true;
  if (hasNonCorporealEffect(unit.abilities)) extra.negateFirstStrike = true;
  // A unit on its favored terrain gains both First Strike and Negate First Strike.
  if (hasAbil(unit.abilities, 'favoredTerrain')) {
    extra.firstStrike = true;
    extra.negateFirstStrike = true;
  }
  if (Object.keys(extra).length === 0) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, extra),
  });
}

// Warlord Fiery Fury (Chaos unit enchantment): when cast on a fantastic creature,
// grants First Strike. (Regular units instead get stat bonuses — handled in stats.js.
// The realm conversion to Chaos is handled in determineEffectiveUnitType.)
// STAT-FORMULA[fieryFuryAbilityDerivation]
// PROVENANCE[fieryFuryAbilityDerivation]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Fiery Fury realm/First Strike/Flame Blade derivation lacks complete current ranges; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS
function applyFieryFuryEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord')) return unit;
  if (!hasAbil(unit.abilities, 'fieryFury')) return unit;
  if (!(unit.unitType || '').startsWith('fantastic_')) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { firstStrike: true }),
  });
}

// Warlord Zeal (Life unit enchantment, cast only by Inquisitors/Grand Inquisitor):
// grants First Strike and Negate First Strike. Applied before Temporal Twist so
// Temporal Twist can strip the granted flags.
// STAT-FORMULA[zealAbilityDerivation]
// PROVENANCE[zealAbilityDerivation]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Zeal derived ability package lacks complete current implementation ranges; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS
function applyZealEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'zeal')) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { firstStrike: true, negateFirstStrike: true }),
  });
}

// Warlord Temporal Twist (enemy combat global enchantment): strips First Strike,
// Negate First Strike, and Teleporting from the affected unit. Applied after the
// Tactician retort so that Tactician-granted First Strike / Negate First Strike
// are removed too.
// STAT-FORMULA[temporalTwistAbilityDerivation]
// PROVENANCE[temporalTwistAbilityDerivation]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Temporal Twist derived ability package lacks complete current implementation ranges; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS
function applyTemporalTwistEffects(unit) {
  if (!hasAbil(unit.abilities, 'temporalTwist')) return unit;
  const stripped = Object.assign({}, unit.abilities);
  delete stripped.firstStrike;
  delete stripped.negateFirstStrike;
  delete stripped.teleporting;
  return Object.assign({}, unit, { abilities: stripped });
}

// CoM/CoM2: Blood Lust grants the undead state; final unit type is resolved by
// determineEffectiveUnitType(). Warlord: Bloodlust no longer turns the unit undead
// (only doubled melee vs normals/heroes is retained), so this becomes a no-op.
// STAT-FORMULA[bloodLustAbilityDerivation]
// PROVENANCE[bloodLustAbilityDerivation]: UNVERIFIED versions=all; gap=Blood Lust derived type/immunity/status package lacks complete applicable ranges; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
function applyBloodLustEffects(unit, version) {
  if (!hasAbil(unit.abilities, 'bloodLust')) return unit;
  if (version && version.startsWith('com2_warlord')) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { undead: true }),
  });
}

// Warlord Vampirism (Death very rare unit enchantment): unit becomes undead and gains
// Blood Sucker. Immunities follow from the granted `undead` flag via applyUndeadImmunities.
// The thrown/breath -> melee strength transfer is applied in deriveUnitStats (stats.js).
// STAT-FORMULA[vampirismAbilityDerivation]
// PROVENANCE[vampirismAbilityDerivation]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Vampirism derived package lacks complete current implementation ranges; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS
function applyVampirismEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'vampirism')) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { undead: true, bloodSucker: true }),
  });
}

// Warlord Revenant (Death uncommon unit enchantment): unit permanently becomes
// undead for the battle and gains melee Death Touch 0. Immunities follow from the
// granted `undead` flag via applyUndeadImmunities. Death Touch fires per attacking
// figure on melee and Thrown. Regeneration has no bearing on single-combat damage.
// STAT-FORMULA[revenantAbilityDerivation]
// PROVENANCE[revenantAbilityDerivation]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Revenant derived package lacks complete current implementation ranges; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS
function applyRevenantEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'revenant')) return unit;
  return Object.assign({}, unit, {
    // UnitCalcPre.CAS writes the touch value unconditionally, so Revenant replaces
    // an intrinsic stronger Death Touch rather than preserving it.
    abilities: Object.assign({}, unit.abilities, { undead: true, deathTouch: 0 }),
  });
}

// Warlord keeps touch flags in general, melee, and ranged attack records. Unit-card
// and roster abilities are general flags; represented spell effects can relocate or
// overwrite them. Keep that engine detail internal so the card still has one value.
const PLACED_TOUCH_KEYS = [
  'poison', 'stoningTouch', 'deathTouch', 'dispelEvil', 'exorcise', 'destruction', 'lifeSteal',
];
const WARLORD_RELOCATED_TOUCH_KEYS = ['stoningTouch', 'deathTouch'];
function applyWarlordTouchFlagPlacement(unit, version) {
  if (!version || !version.startsWith('com2_warlord')) return unit;
  const records = { global: {}, melee: {}, ranged: {} };
  for (const key of PLACED_TOUCH_KEYS) {
    if (abilDefined(unit.abilities, key)) records.global[key] = unit.abilities[key];
  }

  // UnitCalcPre.CAS writes Death Touch 0 to melee and clears the general/ranged
  // copies. This intentionally overwrites any stronger intrinsic Death Touch.
  if (hasAbil(unit.abilities, 'revenant')) {
    delete records.global.deathTouch;
    delete records.ranged.deathTouch;
    records.melee.deathTouch = 0;
  }

  // UnitCalc.CAS saves each existing general touch value, clears general/ranged,
  // and writes the saved value to melee. Thrown shares melee flags in ApplyAttack.
  if (hasAbil(unit.abilities, 'focusMagic')) {
    for (const key of WARLORD_RELOCATED_TOUCH_KEYS) {
      if (records.global[key] == null) continue;
      const value = records.global[key];
      delete records.global[key];
      delete records.ranged[key];
      records.melee[key] = value;
    }
  }

  return Object.assign({}, unit, { touchFlagRecords: records });
}

// Warlord Angelic Guardians (Life rare global enchantment): in combat, grants or
// improves Exorcise Touch on friendly units. Only realm-less units (normal/hero) and
// Life-realm units (Life creatures and Sanctified units) are buffed — fantastic
// creatures of any other realm receive nothing. The tier depends on the realm:
//   - already has Exorcise: extra -3 (life) / -2 (regular) save penalty
//   - no Exorcise: gains it at -1 (life) / -0 (regular)
// Run after the effective unit type is finalized, so Sanctify's life-realm rewrite is
// already reflected. The extra -3 vs created-undead defenders lives in exorciseFailProb.
// STAT-FORMULA[angelicGuardiansAbilityDerivation]
// PROVENANCE[angelicGuardiansAbilityDerivation]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Angelic Guardians derived package lacks complete current implementation ranges; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS
function applyAngelicGuardiansEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'angelicGuardians')) return unit;
  const realm = realmOfUnitType(unit.unitType);
  if (realm !== null && realm !== 'life') return unit;
  const isLife = realm === 'life';
  let val;
  if (abilDefined(unit.abilities, 'exorcise')) {
    val = abilVal(unit.abilities, 'exorcise', 0) + (isLife ? -3 : -2);
  } else {
    val = isLife ? -1 : 0;
  }
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { exorcise: val }),
  });
}

// PROVENANCE[bloodLustMeleeAttack]: UNVERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; gap=the modern melee/Thrown implementation is reconstructed, but the exact applicable CoM1 range remains split; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
// STAT-FORMULA[bloodLustMeleeAttack]
function bloodLustMeleeAttack(atkUnit, defUnit, attackStrength = atkUnit.atk) {
  // Spirit Link makes the target count as a non-fantastic unit for being targeted,
  // so Blood Lust's "double melee vs Normal/Hero" applies to it as well.
  const targetIsNormal = defUnit && (isNormalUnitType(defUnit.unitType) || defUnit.unitType === 'hero'
    || hasAbil(defUnit.abilities, 'spiritLink'));
  if (!targetIsNormal || !hasAbil(atkUnit.abilities, 'bloodLust')) return attackStrength;
  return attackStrength * 2;
}

// --- Resolution-time stat sequences (Caster.exe: CoM2 and Warlord) ---
// These use the same step type and runner as derivation, but on a scratch copy which
// is discarded after one incoming attack. They therefore never change the displayed
// stat block. Order follows @Units@GetEffectiveResistance and
// @Units@EffectiveDefense; see CoM2 binary analysis, "Resolution-time modifiers".
function resolutionStep(id, writes, apply, when) {
  return statStep({
    id,
    phase: 'resolution',
    writes,
    apply,
    ...(when ? { when } : {}),
  });
}

const EFFECTIVE_RESISTANCE_STEPS = [
  // PROVENANCE[effectiveResistance:base]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:110-116
  resolutionStep('effectiveResistance:base', ['effectiveResistance'],
    u => { u.effectiveResistance = u.res; }),
  // PROVENANCE[effectiveResistance:charmed]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:110-116
  resolutionStep('effectiveResistance:charmed', ['effectiveResistance'],
    u => { u.effectiveResistance = 100; },
    (u, ctx) => ctx.isRoll && (u.isHero || u.unitType === 'hero') && hasAbil(u.abilities, 'charmed')),
  // PROVENANCE[effectiveResistance:magicImmunity]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:118-119
  resolutionStep('effectiveResistance:magicImmunity', ['effectiveResistance'],
    u => { u.effectiveResistance = 100; },
    (u, ctx) => ctx.realm !== null && hasAbil(u.abilities, 'magicImmunity')),
  // PROVENANCE[effectiveResistance:resistElements]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:121-122 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:515-515 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:515-515
  resolutionStep('effectiveResistance:resistElements', ['effectiveResistance'],
    u => { u.effectiveResistance += 4; },
    (u, ctx) => ctx.realm === 'nature' && hasResistElementsEffect(u.abilities)),
  // PROVENANCE[effectiveResistance:bless]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:124-126 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:516-516 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:516-516
  resolutionStep('effectiveResistance:bless', ['effectiveResistance'],
    (u, ctx) => { u.effectiveResistance += ctx.blessBonus; },
    (u, ctx) => (ctx.realm === 'chaos' || ctx.realm === 'death') && hasAbil(u.abilities, 'bless')),
  // PROVENANCE[effectiveResistance:resistMagic]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:128-129 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:514-514 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:514-514
  resolutionStep('effectiveResistance:resistMagic', ['effectiveResistance'],
    u => { u.effectiveResistance += 5; },
    (u, ctx) => ctx.realm !== null && hasAbil(u.abilities, 'resistMagic')),
];

// `realm` is null for a realm-less roll (Poison), otherwise one of nature,
// sorcery, chaos, life, death. `isRoll` is false only for callers asking for a
// non-roll resistance value; all combat riders in this calculator pass true.
function effectiveResistance(target, version, realm, isRoll = true, trace = null) {
  const scratch = { ...target };
  const context = {
    version,
    realm,
    isRoll,
    blessBonus: version && version.startsWith('com2_warlord') ? 4 : 5,
    ...(trace ? { trace } : {}),
  };
  runStatSteps(EFFECTIVE_RESISTANCE_STEPS, scratch, context);
  return scratch.effectiveResistance;
}

const EFFECTIVE_DEFENSE_STEPS = [
  // PROVENANCE[effectiveDefense:base]: UNVERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; gap=cited helper establishes defense plus extra defense but not this combined pre-zero clamp and Vertigo subtraction; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
  resolutionStep('effectiveDefense:base', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense = Math.max(0, u.def - ctx.vertigoDefPenalty) + ctx.extraDefense; }),
  // PROVENANCE[effectiveDefense:illusion]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:183-188
  resolutionStep('effectiveDefense:illusion', ['effectiveDefense'],
    u => { u.effectiveDefense = 0; return HALT; },
    (u, ctx) => ctx.illusion && !hasAbil(u.abilities, 'illusionImmunity')),
  // PROVENANCE[effectiveDefense:largeShield]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:191-192 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:888-888 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:888-888
  resolutionStep('effectiveDefense:largeShield', ['effectiveDefense'],
    u => { u.effectiveDefense += 3; },
    (u, ctx) => ctx.isRanged && hasAbil(u.abilities, 'largeShield')),
  // PROVENANCE[effectiveDefense:resistElements]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:193-194 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:518-518 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:518-518
  resolutionStep('effectiveDefense:resistElements', ['effectiveDefense'],
    u => { u.effectiveDefense += 4; },
    (u, ctx) => ctx.elementalEligible && hasResistElementsEffect(u.abilities)),
  // PROVENANCE[effectiveDefense:elementalArmor]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:195-196 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:519-519 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:519-519
  resolutionStep('effectiveDefense:elementalArmor', ['effectiveDefense'],
    u => { u.effectiveDefense += 12; },
    (u, ctx) => ctx.elementalEligible && hasElementalArmorEffect(u.abilities)),
  // PROVENANCE[effectiveDefense:bless]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:197-200 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:520-520 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:520-520
  resolutionStep('effectiveDefense:bless', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense += ctx.blessBonus; },
    (u, ctx) => ctx.blessEligible && hasAbil(u.abilities, 'bless')),
  // PROVENANCE[effectiveDefense:armorPiercing]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:202-205
  resolutionStep('effectiveDefense:armorPiercing', ['effectiveDefense'],
    u => { u.effectiveDefense = Math.floor(u.effectiveDefense / 2); },
    (u, ctx) => ctx.armorPiercing
      && !(ctx.isLightning && hasAbil(u.abilities, 'lightningResist'))),
  // PROVENANCE[effectiveDefense:immunities]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:207-212
  resolutionStep('effectiveDefense:immunities', ['effectiveDefense'],
    (u, ctx) => {
      // The six Caster.exe tests are assignments in this order. Righteousness is MoM-only and
      // unreachable through the modern version-filtered inputs; its defensive low-level branch
      // stays in this replacement step without inventing a second ordering mechanism.
      if (hasAbil(u.abilities, 'fireImmunity') && ctx.fireSpell) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'fireImmunity') && ctx.isFire) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'coldImmunity') && ctx.coldSpell) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'poisonImmunity') && ctx.poisonSpell) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'magicImmunity') && ctx.magicImmunityEligible) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'missileImmunity') && ctx.isMissile) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'righteousness') && ctx.righteousnessEligible) u.effectiveDefense = 100;
    }),
  // PROVENANCE[effectiveDefense:weaponImmunity]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:214-215 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:890-890 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:890-890
  resolutionStep('effectiveDefense:weaponImmunity', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense += ctx.weaponImmunityBonus; },
    (u, ctx) => ctx.weaponImmunityEligible),
];

function effectiveDefense(target, version, attack, trace = null) {
  const scratch = { ...target };
  const context = {
    version,
    vertigoDefPenalty: attack.vertigoDefPenalty || 0,
    extraDefense: attack.extraDefense || 0,
    illusion: !!attack.illusion,
    isRanged: !!attack.isRanged,
    elementalEligible: !!attack.elementalEligible,
    blessEligible: !!attack.blessEligible,
    blessBonus: version && version.startsWith('com2_warlord') ? 7 : 5,
    armorPiercing: !!attack.armorPiercing,
    isLightning: !!attack.isLightning,
    fireSpell: !!attack.fireSpell,
    isFire: !!attack.isFire,
    coldSpell: !!attack.coldSpell,
    poisonSpell: !!attack.poisonSpell,
    magicImmunityEligible: !!attack.magicImmunityEligible,
    isMissile: !!attack.isMissile,
    righteousnessEligible: !!attack.righteousnessEligible,
    weaponImmunityEligible: !!attack.weaponImmunityEligible,
    weaponImmunityBonus: version && version.startsWith('com2_warlord') ? 10 : 8,
    ...(trace ? { trace } : {}),
  };
  runStatSteps(EFFECTIVE_DEFENSE_STEPS, scratch, context);
  return scratch.effectiveDefense;
}

// --- Resistance/Defense bonuses from Elemental Armor / Resist Elements ---
function hasResistElementsEffect(abilities) {
  return hasAbil(abilities, 'resistElements')
    || abilVal(abilities, 'elemArmor', 'none') === 'resistElements';
}

function hasElementalArmorEffect(abilities) {
  return hasAbil(abilities, 'elementalArmor')
    || abilVal(abilities, 'elemArmor', 'none') === 'elementalArmor';
}

// Bonus amounts to a unit's resistance vs Stoning. CoM RE +4 (Nature only); MoM both grant bonus.
// PROVENANCE[elemResistBonus]: UNVERIFIED versions=all; gap=combined helper still needs exact DOS and modern implementation gates plus table constants; pointer=Reference docs/DOS reconstructed/combat.c
// STAT-FORMULA[elemResistBonus]
function elemResistBonus(unit, version) {
  const isCoM = version && version.startsWith('com');
  if (isCoM) return hasResistElementsEffect(unit.abilities) ? 4 : 0;
  return (hasElementalArmorEffect(unit.abilities) ? 10 : 0)
    + (hasResistElementsEffect(unit.abilities) ? 3 : 0);
}

function computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty, attackType) {
  const aArmorPiercing = hasAbil(attacker.abilities, 'armorPiercing');
  const aIllusion = hasAbil(attacker.abilities, 'illusion');

  const wi = magicranged => hasWeaponImmunityEffect(target.abilities)
    && !modernAttackIsMagic(attacker, target.abilities, magicranged);

  let attack;
  if (attackType === 'melee') {
    attack = {
      vertigoDefPenalty,
      illusion: aIllusion,
      armorPiercing: aArmorPiercing,
      weaponImmunityEligible: wi(false),
    };
  } else if (attackType === 'ranged') {
    const aSpiritLink = hasAbil(attacker.abilities, 'spiritLink');
    const aIsDC = !aSpiritLink
      && (attacker.unitType === 'fantastic_death' || attacker.unitType === 'fantastic_chaos');
    const aRangedDC = attacker.rangedType === 'magic_c'
      || ((attacker.rangedType === 'missile' || attacker.rangedType === 'boulder') && aIsDC);
    const aRangedElem = attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n'
      || attacker.rangedType === 'magic_s' || attacker.rangedType === 'beam';
    attack = {
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      elementalEligible: aRangedElem,
      blessEligible: aRangedDC,
      armorPiercing: aArmorPiercing,
      magicImmunityEligible: aRangedElem,
      isMissile: attacker.rangedType === 'missile',
      righteousnessEligible: attacker.rangedType === 'magic_c',
      weaponImmunityEligible: wi(aRangedElem),
    };
  } else if (attackType === 'thrown') {
    const aSpiritLink = hasAbil(attacker.abilities, 'spiritLink');
    const aIsDC = !aSpiritLink
      && (attacker.unitType === 'fantastic_death' || attacker.unitType === 'fantastic_chaos');
    const aThrownDC = attacker.thrownType === 'fire' || attacker.thrownType === 'lightning'
      || (attacker.thrownType === 'thrown' && aIsDC);
    const aThrownElem = attacker.thrownType === 'fire' || attacker.thrownType === 'lightning';
    attack = {
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      elementalEligible: aThrownElem,
      blessEligible: aThrownDC,
      armorPiercing: aArmorPiercing || attacker.thrownType === 'lightning',
      isLightning: attacker.thrownType === 'lightning',
      isFire: attacker.thrownType === 'fire',
      righteousnessEligible: attacker.thrownType === 'fire'
        || attacker.thrownType === 'lightning',
      weaponImmunityEligible: wi(aThrownElem),
    };
  } else if (attackType === 'gaze') {
    const aGazeRealm = gazeRealm(attacker.abilities);
    attack = {
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      blessEligible: aGazeRealm === 'chaos' || aGazeRealm === 'death',
      armorPiercing: aArmorPiercing,
      magicImmunityEligible: true,
      weaponImmunityEligible: wi(true),
    };
  } else if (attackType === 'immolation') {
    attack = {
      vertigoDefPenalty,
      isRanged: true,
      blessEligible: true,
      isFire: true,
      magicImmunityEligible: true,
      righteousnessEligible: true,
    };
  } else {
    throw new Error(`Unknown Caster.exe defense attack type: ${attackType}`);
  }
  // Combat@ApplyAttack supplies City Walls as EffectiveDefense's `extradef`: +3 intact, +1
  // damaged, only for attacks crossing into the walls. The UI's City Walls control already
  // expresses that contextual value for the defending unit. DamageSpell passes 0 instead, so
  // Immolation does not receive it.
  if (attackType !== 'immolation') attack.extraDefense = target.cityWallBonus || 0;
  return effectiveDefense(target, version, attack);
}

function computeCasterDefenseProfile(target, attacker, version, vertigoDefPenalty) {
  return {
    vsMelee: computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty, 'melee'),
    vsRanged: computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty, 'ranged'),
    vsThrown: computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty, 'thrown'),
    vsGaze: computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty, 'gaze'),
    vsImmolation: computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty, 'immolation'),
  };
}

// --- Defense Profile ---
// Compute defender's effective defense vs each attack type from `attacker`.
// Aggregates: Vertigo def penalty, Large Shield, Bless (defense half), Elemental Armor,
// Armor Piercing, Weapon Immunity, Missile Immunity, Righteousness, Magic Immunity,
// Fire Immunity, and Illusion override (final).
//   target: defender unit (provides def, abilities, cityWallBonus, weapon, unitType)
//   attacker: attacking unit (provides weapon, unitType, rangedType, thrownType, abilities, generic)
//   vertigoDefPenalty: precomputed Vertigo defense malus on the target (0 in CoM/CoM2).
// Returns: { vsMelee, vsRanged, vsThrown, vsGaze, vsImmolation }
// PROVENANCE[dosEffectiveDefenseProfile]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; gap=the compatibility profile combines several DOS defense-special blocks whose exact ranges remain to be split; pointer=Reference docs/DOS reconstructed/combat.c
// STAT-FORMULA[dosEffectiveDefenseProfile]
function computeDefenseProfile(target, attacker, version, vertigoDefPenalty) {
  const isCoM = version && version.startsWith('com');
  if (version && version.startsWith('com2')) {
    return computeCasterDefenseProfile(target, attacker, version, vertigoDefPenalty);
  }

  // Bless (defense half) — version-sensitive scope (no melee bonus in CoM/CoM2/Warlord).
  const tBless = hasAbil(target.abilities, 'bless');
  const isWarlord = version && version.startsWith('com2_warlord');
  const isCaster = version && version.startsWith('com2');   // CoM2 + Warlord: Caster.exe
  const isCoM1 = version && version.startsWith('com_');
  const blessBonus = isWarlord ? 7 : (isCoM ? 5 : 3);
  // Spirit Link strips the attacker's fantastic targeting status: enemy Bless gains
  // no bonus against it, so it is treated as a non-Death/Chaos-fantastic attacker.
  const aSpiritLink = hasAbil(attacker.abilities, 'spiritLink');
  const aIsDC = !aSpiritLink && (attacker.unitType === 'fantastic_death' || attacker.unitType === 'fantastic_chaos');
  // The DOS engines derive the defence-special realm from the attacker's `ranged_type`
  // alone (WIZARDS.EXE classifier `0x9A79E`): boulder/missile (10–29) and Thrown (100)
  // are realm-less, so they never inherit a Chaos/Death attacker's realm; only melee
  // (type 0) reads the attacker's race. CoM 1 additionally requires `ranged_type > 39`,
  // which drops melee and every conventional ranged type, leaving breath and gaze.
  // Caster.exe classifies these flags more widely, but no unit attack can activate modern Bless
  // defense because ApplyAttack passes spell ID 0; the calculator mismatch is F34.
  const aThrownDC = attacker.thrownType === 'fire' || attacker.thrownType === 'lightning'
                  || (isCaster && attacker.thrownType === 'thrown' && aIsDC);
  const aRangedDC = isCaster
    ? (attacker.rangedType === 'magic_c'
       || ((attacker.rangedType === 'missile' || attacker.rangedType === 'boulder') && aIsDC))
    : (attacker.rangedType === 'magic_c' && !isCoM1);
  const blessMeleeActive = !isCoM;
  // The gaze's own realm, not the attacker's unit type, is what the defence specials key
  // off (see `gazeRealm`). On the shipped rosters the two coincide, but a hand-entered
  // combination can separate them.
  const aGazeRealm = gazeRealm(attacker.abilities);
  const aGazeDC = aGazeRealm === 'chaos' || aGazeRealm === 'death';
  const blessMelee  = (blessMeleeActive && tBless && aIsDC) ? blessBonus : 0;
  const blessThrown = (tBless && aThrownDC) ? blessBonus : 0;
  const blessRanged = (tBless && aRangedDC) ? blessBonus : 0;
  const blessGaze   = (tBless && aGazeDC)   ? blessBonus : 0;
  const blessImm    = tBless ? blessBonus : 0;

  // Large Shield — applies to all non-melee phases.
  const tLargeShield = hasAbil(target.abilities, 'largeShield');
  const largeShieldBonus = isCoM ? 3 : 2;

  // Elemental Armor / Resist Elements defense bonus and per-phase trigger.
  const elemDefBonus = isCoM
    ? (hasElementalArmorEffect(target.abilities) ? 12 : 0)
      + (hasResistElementsEffect(target.abilities) ? 4 : 0)
    : (hasElementalArmorEffect(target.abilities) ? 10 : 0)
      + (hasResistElementsEffect(target.abilities) ? 3 : 0);
  const aRangedElem = isCoM
    ? (attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n'
      || attacker.rangedType === 'magic_s' || attacker.rangedType === 'beam')
    : (attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n');
  const aThrownElem = attacker.thrownType === 'fire' || attacker.thrownType === 'lightning';
  const elemRanged = aRangedElem ? elemDefBonus : 0;
  const elemThrown = aThrownElem ? elemDefBonus : 0;
  // MoM grants the elemental defence bonus against Chaos- and Nature-realm gazes
  // (WIZARDS.EXE 0x9A72D, the same realm pair as on the resistance side). CoM 1 replaced
  // the realm gate with a `ranged_type` range and is not modelled here — no CoM/CoM2/
  // Warlord unit carries a hidden gaze component. See `CoM2 binary analysis.md`, *Gaze attacks*.
  const elemGaze   = (!isCoM && (aGazeRealm === 'nature' || aGazeRealm === 'chaos'))
    ? elemDefBonus : 0;
  // The DOS spell-damage helper feeds both Immolation and Wall of Fire through the
  // defence-special routine as a magical ranged type (38 in MoM, 39 in CoM 1), so
  // Elemental Armor / Resist Elements applies in all three DOS builds. Caster.exe
  // (CoM2/Warlord) keeps the separate, narrower scope modelled here.
  const elemImm    = !isCaster ? elemDefBonus : 0;

  // Defense bases. Vertigo writes directly to the battle-unit Defense/To-Block stat in
  // the DOS binaries, so spell damage such as Immolation and Wall of Fire sees it too.
  const defBase = Math.max(0, target.def - vertigoDefPenalty);
  const defLS = tLargeShield ? defBase + largeShieldBonus : defBase;

  // Armor Piercing uses DOS signed /2 with truncation toward zero (B5); Defense is
  // nonnegative here. Immolation uses Fireball's own non-AP flags instead.
  // Evidence: Reference docs/DOS reconstructed/B4_B5_B6.evidence.md.
  const aArmorPiercing = hasAbil(attacker.abilities, 'armorPiercing');
  const tLightningResist = hasAbil(target.abilities, 'lightningResist');
  const lightningAP = attacker.thrownType === 'lightning' && !tLightningResist;
  const halve = (n) => Math.trunc(n / 2);
  const defAPMelee   = aArmorPiercing ? halve(defBase + blessMelee)             : (defBase + blessMelee);
  const defAPRanged  = aArmorPiercing ? halve(defLS + blessRanged + elemRanged) : (defLS + blessRanged + elemRanged);
  const defAPGaze    = aArmorPiercing ? halve(defLS + blessGaze + elemGaze)     : (defLS + blessGaze + elemGaze);
  // Immolation Damage is never affected by Armor Piercing (matches MoM and the
  // ADC reference): AP attaches only to the unit's melee/ranged/thrown attacks.
  const defImm       = defLS + blessImm + elemImm;
  const defAPThrown  = (aArmorPiercing || lightningAP)
    ? halve(defLS + blessThrown + elemThrown) : (defLS + blessThrown + elemThrown);

  // Weapon Immunity. Blazing March upgrades melee + missile attacks to magical weapons in CoM/CoM2.
  // Warlord also upgrades thrown attacks.
  const aBlazingMarch = hasAbil(attacker.abilities, 'blazingMarch');
  const isWarlordVersion = version && version.startsWith('com2_warlord');
  // Eldritch Weapon upgrades a normal weapon to magic for Weapon Immunity purposes,
  // but ONLY for the melee attack (MoM Eldritch Weapon page). Its ranged/thrown attacks
  // stay non-magical, so WI still applies to them (handled below via attacker.weapon).
  const aEldritchMelee = hasAbil(attacker.abilities, 'eldritchWeapon');
  const meleeWeaponWI = ((aBlazingMarch || aEldritchMelee) && attacker.weapon === 'normal') ? 'magic' : attacker.weapon;
  const rangedWeaponWI = (aBlazingMarch && attacker.rangedType === 'missile' && attacker.weapon === 'normal')
    ? 'magic' : attacker.weapon;
  const thrownWeaponWI = (aBlazingMarch && isWarlordVersion && attacker.thrownType === 'thrown' && attacker.weapon === 'normal')
    ? 'magic' : attacker.weapon;

  // This compatibility profile serves only the DOS engines; modern Spirit Link and
  // calculated EncMagic are handled by computeCasterDefenseForAttack above.
  const atkWIType = attacker.unitType;
  let vsMelee = weaponImmunityDef(defAPMelee, target.abilities, meleeWeaponWI, atkWIType, version, attacker.generic);
  // Gaze: hidden ranged component. **Weapon Immunity can never reach a gaze.** The
  // immunity-mask builder admits bit 0x100 only when `ranged_type / 10 < 3` or the
  // (unsatisfiable) `ranged_type / 10 == 100`; gaze is 103-105, so it fails both
  // (WIZARDS.EXE 0x9921A, and the six patched bytes at 0x9922C in CP 1.60 / CoM 1 do not
  // change that). This is structural — it does not depend on gaze attackers happening to
  // be fantastic — so no Weapon Immunity term is applied here at all.
  // Magic Immunity does apply, tested directly rather than through the mask (0x9A69E).
  let vsGaze = magicImmunityDef(defAPGaze, target.abilities, version);
  // Righteousness nullifies a Chaos- or Death-realm gaze (0x9A722, realm gate at 0x9A6B7).
  // MoM-only: CoM 1 nops the entire Righteousness block out of this function
  // (0x9A6DC-0x9A732).
  if (!isCoM && aGazeDC) {
    vsGaze = righteousnessDef(vsGaze, target.abilities, version);
  }

  // Ranged: WI applies to physical ranged (missile/boulder); magic ranged is already magical.
  const isPhysRanged = attacker.rangedType === 'missile' || attacker.rangedType === 'boulder';
  let vsRanged = isPhysRanged
    ? weaponImmunityDef(defAPRanged, target.abilities, rangedWeaponWI, atkWIType, version, attacker.generic)
    : defAPRanged;

  // Thrown: WI eligible except v1.31 bug. Breath (fire/lightning) is magical, never triggers WI.
  const thrownWI = attacker.thrownType === 'thrown' && version !== 'mom_1.31';
  let vsThrown = thrownWI
    ? weaponImmunityDef(defAPThrown, target.abilities, thrownWeaponWI, atkWIType, version, attacker.generic)
    : defAPThrown;

  // Missile Immunity (vs missile only). v1.31 bug: WI overwrites MI when both apply.
  const isMissile = attacker.rangedType === 'missile';
  const wiTriggeredOnMissile = isMissile && weaponImmunityApplies(
    target.abilities, rangedWeaponWI, atkWIType, version, attacker.generic);
  if (isMissile && !(version === 'mom_1.31' && wiTriggeredOnMissile)) {
    vsRanged = missileImmunityDef(vsRanged, target.abilities, version);
  }

  // Righteousness vs Chaos magic ranged.
  if (attacker.rangedType === 'magic_c') {
    vsRanged = righteousnessDef(vsRanged, target.abilities, version);
  }
  // Magic Immunity vs all magic ranged.
  if (attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n'
      || attacker.rangedType === 'magic_s' || attacker.rangedType === 'beam') {
    vsRanged = magicImmunityDef(vsRanged, target.abilities, version);
  }

  // Breath: Fire Immunity, Righteousness, Magic Immunity (MoM only — CoM v2.3 removed MI on breath).
  if (attacker.thrownType === 'fire') {
    vsThrown = fireImmunityDef(vsThrown, target.abilities, version);
  }
  if (attacker.thrownType === 'fire' || attacker.thrownType === 'lightning') {
    vsThrown = righteousnessDef(vsThrown, target.abilities, version);
  }
  if ((attacker.thrownType === 'fire' || attacker.thrownType === 'lightning') && !isCoM) {
    vsThrown = magicImmunityDef(vsThrown, target.abilities, version);
  }

  // Immolation defense chain: base (no AP) → Magic Immunity → Fire Immunity → Righteousness.
  let vsImmolation = righteousnessDef(
    fireImmunityDef(
      magicImmunityDef(defImm, target.abilities, version),
      target.abilities, version),
    target.abilities, version);

  // Illusion: sets conventional attack defense to city walls bonus only. Negated by Illusion Immunity.
  // It does not alter immolation/area-fire defense, which is not Illusion Damage.
  const aIllusion = hasAbil(attacker.abilities, 'illusion');
  const tIllusionImmune = hasAbil(target.abilities, 'illusionImmunity');
  if (aIllusion && !tIllusionImmune) {
    const cw = target.cityWallBonus || 0;
    vsMelee = cw;
    vsRanged = cw;
    vsThrown = cw;
    vsGaze = cw;
  }

  return { vsMelee, vsRanged, vsThrown, vsGaze, vsImmolation };
}

// --- Combat Flow Modifiers ---
// Abilities that change *how* combat resolves rather than just stat values.
// These are checked during resolveCombat to alter phase ordering, defense
// effectiveness, damage types, etc.
//
// Categories:
//   Phase ordering:  First Strike, Negate First Strike
//   Defense halving: Armor Piercing, Illusion (defender ignores defense if no Illusion Immunity)
//   Damage immunity: Magic Immunity (vs magic ranged),
//                    Missile Immunity (vs missile/boulder), Weapon Immunity (vs non-magic melee),
//                    Poison Immunity, Stoning Immunity, Cold Immunity, Death Immunity
//   Special attacks: Poison Touch, Life Steal, Stoning Touch/Gaze, Death Gaze, Doom Gaze, Cause Fear
//   Defense bonus:   Large Shield (+2 def vs ranged), Invulnerability
//   Hit bonus:       Lucky (+10% To Hit, +10% To Block, +1 Res; v1.31: enemy melee -10% To Hit), Bless (vs Chaos/Death)
//   Misc:           Haste (double melee attacks), Immolation (extra damage phase)

// --- Combat Phase Pipeline ---
// A phase is { kind, source, target, active, label, compute } where compute is
// (sourceAlive, targetAlive, cap[, fearDist]) -> { dist, lifeStealEV, lifeStealDist? }.
// The engine maintains a 2D joint distribution P(cumDmgA, cumDmgB) and walks the
// phase list, calling each phase's compute for every cell of the joint and folding
// the resulting damage into the appropriate dimension. Per-phase 1D damage marginals
// are accumulated for the breakdown UI.
//
// In FS+Haste configurations, a single 'firstStrikeBlock' phase replaces phases 5-8b
// and internally couples A's First Strike and 2nd strike to the same fear sample k_a
// (one fear roll per round per side, persisting through subsequent same-side attacks).

function aliveCount(unit, cumDmgInCombat) {
  return Math.max(0, unit.figs - Math.floor((unit.dmg + cumDmgInCombat) / unit.hp));
}

// Initialise joint state with all probability at (0, 0).
function makeJoint2D(aRemHP, bRemHP) {
  const j = new Array(aRemHP + 1);
  for (let i = 0; i <= aRemHP; i++) j[i] = new Array(bRemHP + 1).fill(0);
  j[0][0] = 1;
  return j;
}

// Build an empty joint of the same shape.
function emptyJointLike(joint) {
  const j = new Array(joint.length);
  for (let i = 0; i < joint.length; i++) j[i] = new Array(joint[0].length).fill(0);
  return j;
}

// Apply a damage phase to a 2D joint state.
//   joint: [aRemHP+1][bRemHP+1] PMF
//   phase: { source, target, compute, consumesFear, ... }
//   pendingFear: { aFearDist, bFearDist }; consumed if phase.consumesFear
//   units: { a, b } unit objects (for figs/dmg/hp)
//   targetTotalRemHP: target's bRemHP / aRemHP (initial-cap on target's cum damage this combat)
// Returns { joint: newJoint, marginal, lifeStealEV }
function applyDamagePhase(joint, phase, pendingFear, units, targetTotalRemHP) {
  const newJoint = emptyJointLike(joint);
  const marginal = new Array(targetTotalRemHP + 1).fill(0);
  let lifeStealEV = 0;
  const aDim = joint.length, bDim = joint[0].length;
  const sourceUnit = phase.source === 'a' ? units.a : units.b;
  const targetUnit = phase.target === 'a' ? units.a : units.b;
  const fearDist = phase.consumesFear ? pendingFear[phase.source + 'FearDist'] : null;
  for (let cumA = 0; cumA < aDim; cumA++) {
    for (let cumB = 0; cumB < bDim; cumB++) {
      const p = joint[cumA][cumB];
      if (p < 1e-15) continue;
      const sourceAlive = aliveCount(sourceUnit, phase.source === 'a' ? cumA : cumB);
      const targetAlive = aliveCount(targetUnit, phase.target === 'a' ? cumA : cumB);
      const targetCum = phase.target === 'a' ? cumA : cumB;
      const cap = targetTotalRemHP - targetCum;
      if (cap <= 0) {
        // Target already maxed out; no further damage possible.
        // Fold into marginal[0] so it stays a proper PMF summing to 1.
        newJoint[cumA][cumB] += p;
        marginal[0] += p;
        continue;
      }
      const out = phase.compute(sourceAlive, targetAlive, cap, fearDist);
      const dist = out.dist;
      for (let d = 0; d < dist.length; d++) {
        const pp = p * dist[d];
        if (pp < 1e-15) continue;
        const newTargetCum = Math.min(targetCum + d, targetTotalRemHP);
        if (phase.target === 'a') newJoint[newTargetCum][cumB] += pp;
        else newJoint[cumA][newTargetCum] += pp;
        marginal[Math.min(d, targetTotalRemHP)] += pp;
      }
      lifeStealEV += p * (out.lifeStealEV || 0);
    }
  }
  return { joint: newJoint, marginal, lifeStealEV };
}

// Apply a simultaneous pair of damage phases (counter B→A, 2nd-strike A→B) reading
// from a frozen snapshot of the input joint. Both sub-phase outputs are folded into
// one new joint so neither phase sees the other's update on the source dimension.
function applySimultaneousPair(joint, subA, subB, pendingFear, units, aTotalRemHP, bTotalRemHP) {
  const newJoint = emptyJointLike(joint);
  const marginalA = new Array(aTotalRemHP + 1).fill(0);   // damage to A this phase
  const marginalB = new Array(bTotalRemHP + 1).fill(0);   // damage to B this phase
  let lifeStealEV_a = 0, lifeStealEV_b = 0;
  const aDim = joint.length, bDim = joint[0].length;
  const fearA = subA.consumesFear ? pendingFear[subA.source + 'FearDist'] : null;
  const fearB = subB.consumesFear ? pendingFear[subB.source + 'FearDist'] : null;
  for (let cumA = 0; cumA < aDim; cumA++) {
    for (let cumB = 0; cumB < bDim; cumB++) {
      const p = joint[cumA][cumB];
      if (p < 1e-15) continue;
      // Sub A: source=B, target=A (counter)
      const aAlive = aliveCount(units.a, cumA);
      const bAlive = aliveCount(units.b, cumB);
      const capA = aTotalRemHP - cumA;
      const capB = bTotalRemHP - cumB;
      let outA = { dist: [1], lifeStealEV: 0 };
      let outB = { dist: [1], lifeStealEV: 0 };
      if (capA > 0) outA = subA.compute(bAlive, aAlive, capA, fearA);
      if (capB > 0) outB = subB.compute(aAlive, bAlive, capB, fearB);
      lifeStealEV_a += p * (subA.source === 'a' ? (outA.lifeStealEV || 0) : 0)
                    +  p * (subB.source === 'a' ? (outB.lifeStealEV || 0) : 0);
      lifeStealEV_b += p * (subA.source === 'b' ? (outA.lifeStealEV || 0) : 0)
                    +  p * (subB.source === 'b' ? (outB.lifeStealEV || 0) : 0);
      for (let dA = 0; dA < outA.dist.length; dA++) {
        const ppA = outA.dist[dA];
        if (ppA < 1e-15) continue;
        const newCumA = Math.min(cumA + dA, aTotalRemHP);
        for (let dB = 0; dB < outB.dist.length; dB++) {
          const ppB = outB.dist[dB];
          if (ppB < 1e-15) continue;
          const newCumB = Math.min(cumB + dB, bTotalRemHP);
          newJoint[newCumA][newCumB] += p * ppA * ppB;
        }
        marginalA[Math.min(dA, aTotalRemHP)] += p * ppA;
      }
      for (let dB = 0; dB < outB.dist.length; dB++) {
        marginalB[Math.min(dB, bTotalRemHP)] += p * outB.dist[dB];
      }
    }
  }
  return { joint: newJoint, marginalA, marginalB, lifeStealEV_a, lifeStealEV_b };
}

// Apply a First-Strike-no-Haste block: per cell, FS strike → counter (sequential),
// or simultaneous melee+counter when CoM1 wounded-top-fig HP rule suppresses FS.
// Returns the post-counter joint plus a "post-FS" snapshot used for A-fear marginalisation.
//   joint:      input joint (post-WoF)
//   computes:   { fsStrike, counter } phase compute closures (each takes (sAlive, tAlive, cap))
//   ctx:        { a, b, aRemHP, bRemHP, isCoM1Only }
// Returns { joint, postFsJoint, fsMarginal, counterMarginal, lifeStealEV_a, lifeStealEV_b }.
function applyFsBlockNoHaste(joint, computes, ctx) {
  const newJoint = emptyJointLike(joint);
  const postFsJoint = emptyJointLike(joint);
  const fsMarginal = new Array(ctx.bRemHP + 1).fill(0);
  const counterMarginal = new Array(ctx.aRemHP + 1).fill(0);
  let lifeStealEV_a = 0, lifeStealEV_b = 0;
  for (let cumA = 0; cumA < joint.length; cumA++) {
    for (let cumB = 0; cumB < joint[0].length; cumB++) {
      const p = joint[cumA][cumB];
      if (p < 1e-15) continue;
      const aAliveL = aliveCount(ctx.a, cumA);
      const bAliveL = aliveCount(ctx.b, cumB);
      const capA = ctx.aRemHP - cumA;
      const capB = ctx.bRemHP - cumB;
      // CoM 1 reads hits - front_figure_damage directly from the battle-unit record.
      // Damage accumulated earlier in this exchange (for example, Thrown) is still only
      // in the pending damage arrays, so it does not affect the First Strike cutoff.
      const fsApplies = !ctx.isCoM1Only || woundedTopFigHP(ctx.bRemHP, ctx.b.hp) <= 24;
      if (fsApplies) {
        const fsOut = computes.fsStrike(aAliveL, bAliveL, capB);
        for (let fsDmg = 0; fsDmg < fsOut.dist.length; fsDmg++) {
          const pFs = fsOut.dist[fsDmg];
          if (pFs < 1e-15) continue;
          const newCumB = Math.min(cumB + fsDmg, ctx.bRemHP);
          const bAliveAfterFS = aliveCount(ctx.b, newCumB);
          fsMarginal[Math.min(fsDmg, ctx.bRemHP)] += p * pFs;
          postFsJoint[cumA][newCumB] += p * pFs;
          if (capA <= 0 || bAliveAfterFS <= 0) {
            // Counter doesn't fire — fold this mass into the counter marginal at
            // damage=0 so it stays a proper PMF summing to 1.
            newJoint[cumA][newCumB] += p * pFs;
            counterMarginal[0] += p * pFs;
            continue;
          }
          const counterOut = computes.counter(bAliveAfterFS, aAliveL, capA);
          for (let cDmg = 0; cDmg < counterOut.dist.length; cDmg++) {
            const pC = counterOut.dist[cDmg];
            if (pC < 1e-15) continue;
            const newCumA = Math.min(cumA + cDmg, ctx.aRemHP);
            newJoint[newCumA][newCumB] += p * pFs * pC;
            counterMarginal[Math.min(cDmg, ctx.aRemHP)] += p * pFs * pC;
          }
          lifeStealEV_b += p * pFs * counterOut.lifeStealEV;
        }
        lifeStealEV_a += p * fsOut.lifeStealEV;
      } else {
        // CoM1 fallthrough: simultaneous melee+counter (using fsStrike compute, no Haste).
        const mOut = computes.fsStrike(aAliveL, bAliveL, capB);
        const cOut = (capA > 0 && bAliveL > 0)
          ? computes.counter(bAliveL, aAliveL, capA)
          : { dist: [1], lifeStealEV: 0 };
        // Treat post-FS state as unchanged (no FS damage applied to this cell).
        postFsJoint[cumA][cumB] += p;
        for (let m = 0; m < mOut.dist.length; m++) {
          const pM = mOut.dist[m];
          if (pM < 1e-15) continue;
          fsMarginal[Math.min(m, ctx.bRemHP)] += p * pM;
          for (let c = 0; c < cOut.dist.length; c++) {
            const pCv = cOut.dist[c];
            if (pCv < 1e-15) continue;
            newJoint[Math.min(cumA + c, ctx.aRemHP)][Math.min(cumB + m, ctx.bRemHP)] += p * pM * pCv;
          }
        }
        for (let c = 0; c < cOut.dist.length; c++) {
          const pCv = cOut.dist[c];
          if (pCv < 1e-15) continue;
          counterMarginal[Math.min(c, ctx.aRemHP)] += p * pCv;
        }
        lifeStealEV_a += p * mOut.lifeStealEV;
        lifeStealEV_b += p * cOut.lifeStealEV;
      }
    }
  }
  return { joint: newJoint, postFsJoint, fsMarginal, counterMarginal, lifeStealEV_a, lifeStealEV_b };
}

// Apply a First-Strike-with-Haste block: FS strike → (counter + 2nd strike simultaneous).
// CoM1 fallthrough: simultaneous melee+counter (single strike via fsStrike compute, no Haste 2nd).
//   computes:   { fsStrike, secondStrike, aStrikeNoFear, counter, fallthroughCounter }
//   ctx:        { a, b, aRemHP, bRemHP, isCoM1Only, coupleKa, aPFear }
// coupleKa: when true (B has fear on A in non-v1.31), sample k_a once and use the SAME
// k_a for both FS strike and 2nd strike (rules-faithful). Otherwise FS and 2nd strike
// roll fear independently (matching existing behavior in v1.31 and no-fear cases).
// Returns { joint, postFsJoint, fsMarginal, secondMarginal, counterMarginal, lifeStealEV_a, lifeStealEV_b }.
function applyFsBlockHaste(joint, computes, ctx) {
  const newJoint = emptyJointLike(joint);
  const postFsJoint = emptyJointLike(joint);
  const fsMarginal = new Array(ctx.bRemHP + 1).fill(0);
  const secondMarginal = new Array(ctx.bRemHP + 1).fill(0);
  const counterMarginal = new Array(ctx.aRemHP + 1).fill(0);
  let lifeStealEV_a = 0, lifeStealEV_b = 0;
  for (let cumA = 0; cumA < joint.length; cumA++) {
    for (let cumB = 0; cumB < joint[0].length; cumB++) {
      const p = joint[cumA][cumB];
      if (p < 1e-15) continue;
      const aAliveL = aliveCount(ctx.a, cumA);
      const bAliveL = aliveCount(ctx.b, cumB);
      const capA = ctx.aRemHP - cumA;
      const capB = ctx.bRemHP - cumB;
      // As in the no-Haste block, CoM 1 tests the top figure's HP at the start of
      // the exchange, before pending thrown/breath damage is applied.
      const fsApplies = !ctx.isCoM1Only || woundedTopFigHP(ctx.bRemHP, ctx.b.hp) <= 24;
      if (fsApplies) {
        if (ctx.coupleKa) {
          // Coupled: sample k_a once, use same k_a for FS and 2nd strike.
          const fearKDist = calcFearDist(aAliveL, ctx.aPFear);
          for (let k_a = 0; k_a <= aAliveL; k_a++) {
            const pK = fearKDist[k_a];
            if (pK < 1e-15) continue;
            const fsOut = computes.aStrikeNoFear(k_a, bAliveL, capB);
            for (let fsDmg = 0; fsDmg < fsOut.dist.length; fsDmg++) {
              const pFs = fsOut.dist[fsDmg];
              if (pFs < 1e-15) continue;
              const newCumB = Math.min(cumB + fsDmg, ctx.bRemHP);
              const bAliveAfterFS = aliveCount(ctx.b, newCumB);
              const capBAfterFS = ctx.bRemHP - newCumB;
              fsMarginal[Math.min(fsDmg, ctx.bRemHP)] += p * pK * pFs;
              postFsJoint[cumA][newCumB] += p * pK * pFs;
              const counterOut = (capA > 0 && bAliveAfterFS > 0)
                ? computes.counter(bAliveAfterFS, aAliveL, capA)
                : { dist: [1], lifeStealEV: 0 };
              const secondOut = (k_a > 0 && capBAfterFS > 0)
                ? computes.aStrikeNoFear(k_a, bAliveAfterFS, capBAfterFS)
                : { dist: [1], lifeStealEV: 0 };
              for (let cDmg = 0; cDmg < counterOut.dist.length; cDmg++) {
                const pC = counterOut.dist[cDmg];
                if (pC < 1e-15) continue;
                const newCumA = Math.min(cumA + cDmg, ctx.aRemHP);
                counterMarginal[Math.min(cDmg, ctx.aRemHP)] += p * pK * pFs * pC;
                for (let sDmg = 0; sDmg < secondOut.dist.length; sDmg++) {
                  const pS = secondOut.dist[sDmg];
                  if (pS < 1e-15) continue;
                  const newCumBFinal = Math.min(newCumB + sDmg, ctx.bRemHP);
                  newJoint[newCumA][newCumBFinal] += p * pK * pFs * pC * pS;
                }
              }
              for (let sDmg = 0; sDmg < secondOut.dist.length; sDmg++) {
                secondMarginal[Math.min(sDmg, ctx.bRemHP)] += p * pK * pFs * secondOut.dist[sDmg];
              }
              lifeStealEV_a += p * pK * pFs * secondOut.lifeStealEV;
              lifeStealEV_b += p * pK * pFs * counterOut.lifeStealEV;
            }
            lifeStealEV_a += p * pK * fsOut.lifeStealEV;
          }
        } else {
          // Independent (existing behavior, no coupling).
          const fsOut = computes.fsStrike(aAliveL, bAliveL, capB);
          for (let fsDmg = 0; fsDmg < fsOut.dist.length; fsDmg++) {
            const pFs = fsOut.dist[fsDmg];
            if (pFs < 1e-15) continue;
            const newCumB = Math.min(cumB + fsDmg, ctx.bRemHP);
            const bAliveAfterFS = aliveCount(ctx.b, newCumB);
            const capBAfterFS = ctx.bRemHP - newCumB;
            fsMarginal[Math.min(fsDmg, ctx.bRemHP)] += p * pFs;
            postFsJoint[cumA][newCumB] += p * pFs;
            const counterOut = (capA > 0 && bAliveAfterFS > 0)
              ? computes.counter(bAliveAfterFS, aAliveL, capA)
              : { dist: [1], lifeStealEV: 0 };
            const secondOut = (aAliveL > 0 && capBAfterFS > 0)
              ? computes.secondStrike(aAliveL, bAliveAfterFS, capBAfterFS)
              : { dist: [1], lifeStealEV: 0 };
            for (let cDmg = 0; cDmg < counterOut.dist.length; cDmg++) {
              const pC = counterOut.dist[cDmg];
              if (pC < 1e-15) continue;
              const newCumA = Math.min(cumA + cDmg, ctx.aRemHP);
              counterMarginal[Math.min(cDmg, ctx.aRemHP)] += p * pFs * pC;
              for (let sDmg = 0; sDmg < secondOut.dist.length; sDmg++) {
                const pS = secondOut.dist[sDmg];
                if (pS < 1e-15) continue;
                const newCumBFinal = Math.min(newCumB + sDmg, ctx.bRemHP);
                newJoint[newCumA][newCumBFinal] += p * pFs * pC * pS;
              }
            }
            for (let sDmg = 0; sDmg < secondOut.dist.length; sDmg++) {
              secondMarginal[Math.min(sDmg, ctx.bRemHP)] += p * pFs * secondOut.dist[sDmg];
            }
            lifeStealEV_a += p * pFs * secondOut.lifeStealEV;
            lifeStealEV_b += p * pFs * counterOut.lifeStealEV;
          }
          lifeStealEV_a += p * fsOut.lifeStealEV;
        }
      } else {
        // CoM1 fallthrough: simultaneous melee+counter (single strike, no Haste 2nd).
        const mOut = computes.fsStrike(aAliveL, bAliveL, capB);
        const cOut = (capA > 0 && bAliveL > 0)
          ? computes.fallthroughCounter(bAliveL, aAliveL, capA)
          : { dist: [1], lifeStealEV: 0 };
        postFsJoint[cumA][cumB] += p;
        for (let m = 0; m < mOut.dist.length; m++) {
          const pM = mOut.dist[m];
          if (pM < 1e-15) continue;
          fsMarginal[Math.min(m, ctx.bRemHP)] += p * pM;
          for (let c = 0; c < cOut.dist.length; c++) {
            const pCv = cOut.dist[c];
            if (pCv < 1e-15) continue;
            newJoint[Math.min(cumA + c, ctx.aRemHP)][Math.min(cumB + m, ctx.bRemHP)] += p * pM * pCv;
          }
        }
        for (let c = 0; c < cOut.dist.length; c++) {
          counterMarginal[Math.min(c, ctx.aRemHP)] += p * cOut.dist[c];
        }
        lifeStealEV_a += p * mOut.lifeStealEV;
        lifeStealEV_b += p * cOut.lifeStealEV;
      }
    }
  }
  return { joint: newJoint, postFsJoint, fsMarginal, secondMarginal, counterMarginal, lifeStealEV_a, lifeStealEV_b };
}

// Marginalise the joint over the b-dim (returns 1D dist of cumDmgA).
function marginalA(joint) {
  const out = new Array(joint.length).fill(0);
  for (let i = 0; i < joint.length; i++) {
    const row = joint[i];
    let s = 0;
    for (let j = 0; j < row.length; j++) s += row[j];
    out[i] = s;
  }
  return out;
}

function marginalB(joint) {
  const cols = joint[0].length;
  const out = new Array(cols).fill(0);
  for (let i = 0; i < joint.length; i++) {
    const row = joint[i];
    for (let j = 0; j < cols; j++) out[j] += row[j];
  }
  return out;
}

// Touch-attack parameters for `self` striking `other`. Shared by every delivery
// phase (melee, thrown, ranged, gaze) — the caller supplies the phase-specific
// gates:
//   fires:             whether touch attacks deliver at all this phase
//                      (per-phase touchAttackFires / Black Sleep / gaze-active rule)
//   record:            normalized global/melee/ranged flag record for this phase
// `touchFlagRecords` is an internal normalized representation. When present it owns
// placement; record values are already effective calculator values. The ordinary card and
// every DOS roster ability remain common flags and therefore use the ability fallback.
function placedTouchValue(self, key, record) {
  const fallback = abilDefined(self.abilities, key) ? self.abilities[key] : null;
  if (!self.touchFlagRecords) return fallback;
  const records = self.touchFlagRecords;
  const values = [];
  if (records.global && records.global[key] != null) values.push(records.global[key]);
  if (record !== 'global' && records[record] && records[record][key] != null) {
    values.push(records[record][key]);
  }
  if (!values.length) return null;
  if (key === 'poison') return Math.max(...values);
  if (key === 'dispelEvil') return values.some(Boolean);
  // MergeFlags keeps the stronger (more negative) save modifier when a general
  // and channel-specific valued flag are both present.
  return Math.min(...values);
}

function dosChannelTouchModifier(self, key, record, ver) {
  const dos = ver === 'mom_1.31' || ver === 'mom_cp_1.60.00' || ver === 'com_6.08';
  if (!dos || record === 'global' || !self.touchFlagRecords
      || !self.touchFlagRecords[record]
      || self.touchFlagRecords[record][key] == null) return 0;
  if (key === 'stoningTouch') return -1;
  if (key === 'deathTouch') return -3;
  return 0;
}

// DOS has one channel record for every non-melee BU_ProcessAttack call: ordinary ranged,
// Thrown, both Breaths, and all Gazes. Caster has distinct dispatch choices; Warlord Thrown
// deliberately shares its melee record, while Breath and Gaze use only general flags.
function touchRecordForPhase(ver, phase) {
  const dos = ver === 'mom_1.31' || ver === 'mom_cp_1.60.00' || ver === 'com_6.08';
  if (dos) return phase === 'melee' ? 'melee' : 'ranged';
  if (phase === 'melee' || phase === 'ranged') return phase;
  if (phase === 'thrown' && ver && ver.startsWith('com2_warlord')) return 'melee';
  return 'global';
}

function touchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, ver, fires, record = 'global') {
  const poison = placedTouchValue(self, 'poison', record);
  const poisonStr = fires && poison != null ? poison : 0;
  const stoningTouchBase = placedTouchValue(self, 'stoningTouch', record);
  const deathTouchBase = placedTouchValue(self, 'deathTouch', record);
  const stoningTouch = stoningTouchBase == null ? null
    : stoningTouchBase + dosChannelTouchModifier(self, 'stoningTouch', record, ver);
  const deathTouch = deathTouchBase == null ? null
    : deathTouchBase + dosChannelTouchModifier(self, 'deathTouch', record, ver);
  const dispelEvil = placedTouchValue(self, 'dispelEvil', record);
  const exorcise = placedTouchValue(self, 'exorcise', record);
  const destruction = placedTouchValue(self, 'destruction', record);
  const lifeSteal = placedTouchValue(self, 'lifeSteal', record);
  return {
    poisonStr,
    poisonFail:     poisonStr > 0 ? poisonFailProb(otherResPoison, other.abilities, ver) : 0,
    stoningFail:    (fires && stoningTouch != null)
                      ? stoningFailProb(otherResStoning, other.abilities, stoningTouch) : 0,
    deathTouchFail: (fires && deathTouch != null)
                      ? deathTouchFailProb(otherResDeath, other.abilities, deathTouch) : 0,
    dispelEvilFail: (fires && dispelEvil)
                      ? dispelEvilFailProb(otherResM, other.abilities, other.unitType) : 0,
    exorciseFail:   (fires && exorcise != null)
                      ? exorciseFailProb(otherResM, other.abilities, other.unitType, exorcise) : 0,
    // Destruction remains a general touch flag. Warlord's Energy Cannon triggers it
    // from a magical beam, and the roster Magician attacks only at range.
    // otherResDeath (not otherResM): Destruction is Chaos-realm, and that figure is the
    // Bless-boosted resistance the engine uses for Death/Chaos effects.
    destructionFail: (fires && destruction != null)
                      ? destructionFailProb(otherResDeath, other.abilities, destruction, ver) : 0,
    lifeStealMod:   (fires && lifeSteal != null)
                      ? lifeStealEffective(otherResDeath, other.abilities, lifeSteal) : null,
  };
}

// Touch-attack parameters for `self` striking `other` in melee.
function meleeTouchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, ver) {
  return touchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, ver,
    touchAttackFires(self.atk, self.baseAtk, ver), touchRecordForPhase(ver, 'melee'));
}

// Touch-attack parameters for `self` firing alongside its gaze phase against `other`.
// Returns raw probs plus `*With` booleans gated on the gaze actually being active.
function gazeTouchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, gazeActive, selfSleep, ver) {
  const { poisonStr, poisonFail, stoningFail, deathTouchFail, dispelEvilFail, exorciseFail, destructionFail, lifeStealMod }
    = touchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison,
      ver, true, touchRecordForPhase(ver, 'gaze'));
  const active = !selfSleep && gazeActive;
  return {
    poisonStr, poisonFail, stoningFail, deathTouchFail, dispelEvilFail, exorciseFail, destructionFail, lifeStealMod,
    poisonWith:     active && poisonFail > 0,
    stoningWith:    active && stoningFail > 0,
    deathTouchWith: active && deathTouchFail > 0,
    dispelEvilWith: active && dispelEvilFail > 0,
    exorciseWith:   active && exorciseFail > 0,
    destructionWith: active && destructionFail > 0,
    lifeStealWith:  active && lifeStealMod !== null,
  };
}

// Gaze kill-roll probabilities: stoning and death gaze fail chances for `self` vs `other`.
function gazeKillProbs(self, selfStoningActive, selfDeathActive, other, otherResDeath, otherResStoning) {
  return {
    stoningFail: selfStoningActive ? stoningFailProb(otherResStoning, other.abilities, self.abilities.stoningGaze) : 0,
    deathFail:   selfDeathActive   ? deathGazeFailProb(otherResDeath, other.abilities, self.abilities.deathGaze)   : 0,
  };
}

// Doom damage deals exactly 1 damage per 2 points of attack strength (rounded
// down), so affected strengths are halved before their exact-damage phase.
// Intrinsic Doom affects every conventional attack; Warlord Energy Weaponry is
// melee-only and Energy Cannon is ranged-only. Gaze has its own explicit Doom
// strength. Black Sleep's damage→Doom conversion uses full strength.
// PROVENANCE[doomAttackStrengthModifiers]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=exact Energy Weaponry and Doom halves have not been matched to narrow ApplyAttack ranges; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
// STAT-FORMULA[doomAttackStrengthModifiers]
function applyDoomUAHalving(unit, version) {
  const allDoom = hasAbil(unit.abilities, 'doom');
  const meleeDoom = allDoom || hasAbil(unit.abilities, 'energyWeaponry');
  const rangedDoom = allDoom || hasAbil(unit.abilities, 'energyCannon');
  if (!meleeDoom && !rangedDoom) return unit;
  const modernAttacks = unit.modernAttacks && Object.fromEntries(
    Object.entries(unit.modernAttacks).map(([key, channel]) => [key,
      channel && (allDoom || (rangedDoom && key === 'ranged'))
        ? { ...channel, strength: Math.floor((channel.strength || 0) / 2) }
        : channel,
    ]),
  );
  return Object.assign({}, unit, {
    atk: meleeDoom ? Math.floor((unit.atk || 0) / 2) : unit.atk,
    rtb: rangedDoom ? Math.floor((unit.rtb || 0) / 2) : unit.rtb,
    ...(modernAttacks ? { modernAttacks } : {}),
  });
}

// PROVENANCE[normalizeCombatUnit]: UNVERIFIED versions=all; gap=the resolution-boundary record normalization combines multiple engine-specific defaults without one matching implementation range; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
// STAT-FORMULA[normalizeCombatUnit]
function normalizeCombatUnit(unit, version) {
  let normalized = applyBloodLustEffects(unit, version);
  normalized = applyVampirismEffects(normalized, version);
  normalized = applyRevenantEffects(normalized, version);
  normalized = applyUndeadImmunities(normalized, version);
  normalized = applyAnimatedEffects(normalized, version);
  normalized = applyBlackChannelsEffects(normalized);
  normalized = applyRebuildEffects(normalized, version);
  normalized = applyTacticianWarlordEffects(normalized, version);
  normalized = applyZealEffects(normalized, version);
  normalized = applyFieryFuryEffects(normalized, version);
  normalized = applyTemporalTwistEffects(normalized);
  normalized = applyDoomUAHalving(normalized, version);
  const withType = Object.assign({}, normalized, {
    unitType: determineEffectiveUnitType(normalized.unitType, normalized.abilities, version),
  });
  // Angelic Guardians grants/improves Exorcise based on the finalized realm.
  const withGuardians = applyAngelicGuardiansEffects(withType, version);
  return applyWarlordTouchFlagPlacement(withGuardians, version);
}

// PROVENANCE[pairToHitModifiers]: UNVERIFIED versions=all; gap=side-relative Lucky and visibility To-Hit writes need separate exact implementation ranges; pointer=Reference docs/DOS reconstructed/combat.c
// STAT-FORMULA[pairToHitModifiers]
function applyPairToHitModifiers(a, b, version) {
  // Lucky v1.31: defender's Lucky penalizes opponent's melee To Hit by -10%.
  // Prayer / High Prayer v1.31: enemy melee To Hit malus (-10%).
  if (version === 'mom_1.31') {
    if (hasAbil(b.abilities, 'lucky')) {
      a = Object.assign({}, a, { toHitMelee: Math.max(0.1, a.toHitMelee - 0.1) });
    }
    if (hasAbil(a.abilities, 'lucky')) {
      b = Object.assign({}, b, { toHitMelee: Math.max(0.1, b.toHitMelee - 0.1) });
    }

    if (hasAbil(a.abilities, 'prayer') || hasAbil(a.abilities, 'highPrayer')) {
      b = Object.assign({}, b, { toHitMelee: Math.max(0.1, b.toHitMelee - 0.1) });
    }
    if (hasAbil(b.abilities, 'prayer') || hasAbil(b.abilities, 'highPrayer')) {
      a = Object.assign({}, a, { toHitMelee: Math.max(0.1, a.toHitMelee - 0.1) });
    }
  }

  // Invisibility blocks ranged targeting in all versions. In MoM, it also applies
  // a -10% to-hit penalty to conventional attacks unless negated by Illusion Immunity.
  const invisIsCoM = version && version.startsWith('com');
  const aInvisible = hasAbil(a.abilities, 'invisibility');
  const bInvisible = hasAbil(b.abilities, 'invisibility');
  const aCanSeeB = !bInvisible || hasAbil(a.abilities, 'illusionImmunity');
  const bCanSeeA = !aInvisible || hasAbil(b.abilities, 'illusionImmunity');
  if (!aCanSeeB && !invisIsCoM) {
    a = Object.assign({}, a, {
      toHitMelee: Math.max(0.1, a.toHitMelee - 0.1),
      toHitRtb:   Math.max(0.1, a.toHitRtb - 0.1),
    });
  }
  if (!bCanSeeA && !invisIsCoM) {
    b = Object.assign({}, b, {
      toHitMelee: Math.max(0.1, b.toHitMelee - 0.1),
      toHitRtb:   Math.max(0.1, b.toHitRtb - 0.1),
    });
  }

  return { a, b, aCanSeeB, bCanSeeA };
}

function buildVertigoContext(a, b, version) {
  const isCoM = version && version.startsWith('com');
  const isCoM2Vert = version && version.startsWith('com2');
  const aVertigo = hasAbil(a.abilities, 'vertigo');
  const bVertigo = hasAbil(b.abilities, 'vertigo');
  const vertigoHitPenalty = isCoM2Vert ? 0.25 : (isCoM ? 0.3 : 0.2);
  const vertigoBlockPenalty = isCoM2Vert ? 0.07 : (isCoM ? 0.1 : 0);

  return {
    isCoM,
    aToHitMeleeVert: aVertigo ? Math.max(0.1, a.toHitMelee - vertigoHitPenalty) : a.toHitMelee,
    bToHitMeleeVert: bVertigo ? Math.max(0.1, b.toHitMelee - vertigoHitPenalty) : b.toHitMelee,
    aToHitRtbVert: aVertigo ? Math.max(0.1, a.toHitRtb - vertigoHitPenalty) : a.toHitRtb,
    bToHitRtbVert: bVertigo ? Math.max(0.1, b.toHitRtb - vertigoHitPenalty) : b.toHitRtb,
    aVertigoDefPenalty: !isCoM && aVertigo ? 1 : 0,
    bVertigoDefPenalty: !isCoM && bVertigo ? 1 : 0,
    aVertigoBlockPenalty: aVertigo ? vertigoBlockPenalty : 0,
    bVertigoBlockPenalty: bVertigo ? vertigoBlockPenalty : 0,
  };
}

function remainingUnitState(unit) {
  const totalHP = unit.figs * unit.hp;
  return {
    totalHP,
    alive: Math.max(0, unit.figs - Math.floor(unit.dmg / unit.hp)),
    remHP: Math.max(0, totalHP - unit.dmg),
  };
}

// STAT-FORMULA[resolutionResistanceContext]
// PROVENANCE[resolutionResistanceContext]: UNVERIFIED versions=all; gap=side-specific effective Resistance assembly combines multiple engine gates/constants without complete per-version ranges; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
function buildResistanceContext(a, b, version, isCoM) {
  if (version && version.startsWith('com2')) {
    const needsAgainst = source => ({
      magic: hasAbil(source.abilities, 'dispelEvil') || abilDefined(source.abilities, 'exorcise'),
      death: hasAbil(source.abilities, 'fear')
        || abilDefined(source.abilities, 'deathTouch')
        || abilDefined(source.abilities, 'deathGaze')
        || abilDefined(source.abilities, 'destruction')
        || abilDefined(source.abilities, 'lifeSteal'),
      stoning: abilDefined(source.abilities, 'stoningTouch')
        || abilDefined(source.abilities, 'stoningGaze'),
      poison: (abilVal(source.abilities, 'poison', 0) || 0) > 0,
    });
    const aNeeds = needsAgainst(b);
    const bNeeds = needsAgainst(a);
    const resistance = (target, realm, needed) => needed
      ? effectiveResistance(target, version, realm)
      : target.res;
    return {
      bResM: resistance(b, 'life', bNeeds.magic),
      aResM: resistance(a, 'life', aNeeds.magic),
      bResDeath: resistance(b, 'death', bNeeds.death),
      aResDeath: resistance(a, 'death', aNeeds.death),
      bResStoning: resistance(b, 'nature', bNeeds.stoning),
      aResStoning: resistance(a, 'nature', aNeeds.stoning),
      bResPoison: resistance(b, null, bNeeds.poison),
      aResPoison: resistance(a, null, aNeeds.poison),
    };
  }

  // Bless (resistance half): +3 resistance (MoM) or +5 (CoM/CoM2) vs Death-realm resistable
  // effects (Cause Fear, Life Steal, Death Gaze). The defense half is computed elsewhere.
  const bBless = hasAbil(b.abilities, 'bless');
  const aBless = hasAbil(a.abilities, 'bless');
  const isWarlord = version && version.startsWith('com2_warlord');
  const blessBonus = isWarlord ? 4 : (isCoM ? 5 : 3);
  const charmedBonus = unit => (unit.isHero || unit.unitType === 'hero')
    && hasAbil(unit.abilities, 'charmed') ? 30 : 0;
  const bBaseRes = b.res + charmedBonus(b);
  const aBaseRes = a.res + charmedBonus(a);

  // Resist Magic: +5 resistance vs all magical/special effects except Poison.
  const bResM = bBaseRes + (hasAbil(b.abilities, 'resistMagic') ? 5 : 0);
  const aResM = aBaseRes + (hasAbil(a.abilities, 'resistMagic') ? 5 : 0);
  const bResDeath = bResM + (bBless ? blessBonus : 0);
  const aResDeath = aResM + (aBless ? blessBonus : 0);

  return {
    bBless,
    aBless,
    blessBonus,
    bResM,
    aResM,
    bResDeath,
    aResDeath,
    bResStoning: bResM + elemResistBonus(b, version),
    aResStoning: aResM + elemResistBonus(a, version),
    bResPoison: bBaseRes,
    aResPoison: aBaseRes,
  };
}

// Caster.exe keeps conventional ranged, Thrown, Fire Breath and Lightning Breath in
// independent fields.  The UI still exposes the legacy RTB projection (R4), but combat
// must never recover a modern channel from that lossy display value.
function modernAttackUnit(unit, channel) {
  if (!channel) return null;
  const ranged = channel.key === 'ranged';
  return Object.assign({}, unit, {
    rtb: channel.strength,
    baseRtb: channel.baseStrength,
    toHitRtb: channel.toHit,
    rangedType: ranged ? channel.type : 'none',
    thrownType: ranged ? 'none' : channel.type,
  });
}

function modernAttackChannels(unit) {
  if (!unit.modernAttacks) return null;
  return ['lightningBreath', 'fireBreath', 'thrown'].map(key => {
    const attack = unit.modernAttacks[key];
    return attack && attack.strength > 0 ? { key, ...attack } : null;
  }).filter(Boolean);
}

function buildDefenseContext(a, b, version, aVertigoDefPenalty, bVertigoDefPenalty, needed = null) {
  // Aggregates Vertigo def penalty, Large Shield, Bless (defense half), Elemental Armor,
  // Armor Piercing, Weapon/Missile/Magic/Fire Immunity, Righteousness, and Illusion.
  if (version && version.startsWith('com2') && needed) {
    const defense = (target, attacker, penalty, type, active) => active
      ? computeCasterDefenseForAttack(target, attacker, version, penalty, type)
      : 0;
    const bDefVsA = defense(b, a, bVertigoDefPenalty, 'melee', needed.melee);
    const bDefVsARanged = defense(b, a, bVertigoDefPenalty, 'ranged', needed.ranged);
    const bDefForThrown = defense(b, a, bVertigoDefPenalty, 'thrown', needed.thrown);
    const bDefForGaze = defense(b, a, bVertigoDefPenalty, 'gaze', needed.aGaze);
    const bDefForImm = defense(b, a, bVertigoDefPenalty, 'immolation', needed.aImmolation);
    const aDefVsB = defense(a, b, aVertigoDefPenalty, 'melee', needed.counter);
    const aDefForGaze = defense(a, b, aVertigoDefPenalty, 'gaze', needed.bGaze);
    const aDefForImm = defense(a, b, aVertigoDefPenalty, 'immolation', needed.bImmolation);
    return {
      bDefVsA,
      bDefVsARanged,
      bDefForThrown,
      bDefForGaze,
      bDefForImm,
      aDefVsB,
      aDefForGaze,
      aDefForImm,
    };
  }

  const bDefProfile = computeDefenseProfile(b, a, version, bVertigoDefPenalty);
  const aDefProfile = computeDefenseProfile(a, b, version, aVertigoDefPenalty);
  return {
    bDefProfile,
    aDefProfile,
    bDefVsA: bDefProfile.vsMelee,
    bDefVsARanged: bDefProfile.vsRanged,
    bDefForThrown: bDefProfile.vsThrown,
    bDefForGaze: bDefProfile.vsGaze,
    bDefForImm: bDefProfile.vsImmolation,
    aDefVsB: aDefProfile.vsMelee,
    aDefForGaze: aDefProfile.vsGaze,
    aDefForImm: aDefProfile.vsImmolation,
  };
}

// STAT-FORMULA[resolutionToBlockContext]
// PROVENANCE[resolutionToBlockContext]: UNVERIFIED versions=all; gap=side-specific To-Block transformation combines clamp and battlefield penalties without complete per-version ranges; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
function buildToBlockContext(a, b, aVertigoBlockPenalty, bVertigoBlockPenalty) {
  // Eldritch Weapon: -10pp to defender's toBlock on melee, thrown, and missile ranged attacks.
  // Mystic Surge: -10pp to opponent's To Block on all conventional attacks.
  const aEW = hasAbil(a.abilities, 'eldritchWeapon');
  const bEW = hasAbil(b.abilities, 'eldritchWeapon');
  const aMysticSurge = hasAbil(a.abilities, 'mysticSurge');
  const bMysticSurge = hasAbil(b.abilities, 'mysticSurge');
  const bToBlockConventional = Math.max(0, b.toBlock - bVertigoBlockPenalty);
  const aToBlockConventional = Math.max(0, a.toBlock - aVertigoBlockPenalty);
  const bToBlockVsAAll = aMysticSurge ? Math.max(0, bToBlockConventional - 0.10) : bToBlockConventional;
  const aToBlockVsBAll = bMysticSurge ? Math.max(0, aToBlockConventional - 0.10) : aToBlockConventional;

  return {
    bToBlockConventional,
    aToBlockConventional,
    bToBlockVsAAll,
    aToBlockVsBAll,
    bToBlockVsAMelee: aEW ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll,
    bToBlockVsAThrEW: (aEW && a.thrownType === 'thrown') ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll,
    bToBlockVsARangedEW: (aEW && a.rangedType === 'missile') ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll,
    aToBlockVsBMelee: bEW ? Math.max(0, aToBlockVsBAll - 0.10) : aToBlockVsBAll,
  };
}

function buildWallOfFirePhase(active, params) {
  if (!active) return null;
  const {
    wofStr,
    wofToHit,
    wofSingleFigure,
    aDefForImm,
    aToBlock,
    aHP,
    aInvulnBonus,
  } = params;

  // Wall of Fire: area damage to A using A's defense profile vs immolation. Touch-free.
  // Warlord strikes a single figure; all other versions hit every alive figure.
  return {
    kind: 'damage',
    source: 'a',
    target: 'a',
    consumesFear: false,
    compute: (_sAlive, tAlive, cap) => {
      if (tAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      const targetFigs = wofSingleFigure ? 1 : tAlive;
      return {
        dist: calcAreaDamageDist(targetFigs, wofStr, wofToHit, aDefForImm, aToBlock, aHP, cap, aInvulnBonus, null, woundedTopFigHP(cap, aHP)),
        lifeStealEV: 0,
      };
    },
  };
}

function buildThrownPhase(active, params) {
  if (!active) return null;
  const {
    a,
    b,
    aDoomsB,
    aBlackSleep,
    aToHitRtbVert,
    bDefForThrown,
    bToBlockVsAThrEW,
    bInvulnBonus,
    bBlurChance,
    blurBuggy,
    isCoM2,
    aMinDamageFromHits,
    aImmWithThrown,
    immStr,
    bDefForImm,
    bToBlockVsAAll,
    aPoisonStrT,
    aPoisonFailT,
    aStoningFailT,
    aDeathTouchFailT,
    aDispelEvilFailT,
    aExorciseFailT,
    aDestructionFailT,
    aLifeStealModT,
    bResDeath,
    aHaste,
  } = params;

  // Thrown / breath: A->B, fires before melee. Touch attacks fold in. Haste self-convolves.
  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap) => {
      if (sAlive <= 0 || cap <= 0 || aBlackSleep) return { dist: [1], lifeStealEV: 0 };
      let dist = a.rtb > 0
        ? (aDoomsB ? calcDoomDist(sAlive, a.rtb, cap)
          : calcTotalDamageDist(sAlive, a.rtb, aToHitRtbVert, bDefForThrown, bToBlockVsAThrEW, b.hp, cap, bInvulnBonus, bBlurChance, blurBuggy,
              isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, aMinDamageFromHits))
        : [1];
      const aImmTDist = (aImmWithThrown && tAlive > 0)
        ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits, woundedTopFigHP(cap, b.hp))
        : null;
      const t = convolveTouchAttacks(dist, cap, sAlive, {
        poisonStr: aPoisonStrT, poisonFail: aPoisonFailT,
        stoningFail: aStoningFailT,
        deathTouchFail: aDeathTouchFailT,
        dispelEvilFail: aDispelEvilFailT,
        exorciseFail: aExorciseFailT,
        destructionFail: aDestructionFailT,
        targetHP: b.hp,
        lifeStealMod: aLifeStealModT, lifeStealRes: bResDeath,
        immDist: aImmTDist,
        bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
      });
      dist = t.dist;
      let lifeStealEV = t.lifeStealEV;
      if (aHaste) {
        dist = convolveDists(dist, dist, cap);
        lifeStealEV *= 2;
      }
      // (Bloodsucker heal is already inside t.lifeStealEV; haste doubles it via *= 2 above.)
      return { dist, lifeStealEV };
    },
  };
}

// Destroy Mechanical (Warlord, Clockwork Tinmen): melee attack instantly
// destroys a Mechanical defender. Gated on attacker having a usable melee
// strike (atk > 0; sAlive > 0 is checked by callers).
function destroyMechanicalApplies(attacker, defender, atk) {
  return atk > 0
    && hasAbil(attacker.abilities, 'destroyMechanical')
    && hasAbil(defender.abilities, 'mechanical');
}

function deterministicKillDist(cap) {
  const d = new Array(cap + 1).fill(0);
  d[cap] = 1;
  return d;
}

function buildMeleePhase(params) {
  const {
    a,
    b,
    aImmWithMelee,
    immStr,
    bDefForImm,
    bToBlockVsAAll,
    bInvulnBonus,
    aMinDamageFromHits,
    aFearForCell,
    aDoomsB,
    aBlackSleep,
    aMeleeAtkVsB,
    aToHitMeleeVert,
    bDefVsA,
    bToBlockVsAMelee,
    aPoisonStrM,
    aPoisonFailM,
    aStoningFailM,
    aDeathTouchFailM,
    aDispelEvilFailM,
    aExorciseFailM,
    aDestructionFailM,
    aLifeStealModM,
    bResDeath,
    bBlurChance,
    blurBuggy,
    aHaste,
    isCoM2,
  } = params;

  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap) => {
      if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      if (destroyMechanicalApplies(a, b, aBlackSleep ? 0 : aMeleeAtkVsB)) {
        return { dist: deterministicKillDist(cap), lifeStealEV: 0 };
      }
      const aImmMDist = (aImmWithMelee && tAlive > 0)
        ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits, woundedTopFigHP(cap, b.hp))
        : null;
      const fearD = aFearForCell(sAlive, tAlive);
      const o = calcMeleeTouchOutcome(fearD, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
        bDefVsA, bToBlockVsAMelee, b.hp, cap,
        aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aDestructionFailM, aLifeStealModM, bResDeath,
        aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, aHaste,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
        aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'));
      return { dist: o.damageDist, lifeStealEV: o.lifeStealEV };
    },
  };
}

function buildCounterPhase(params) {
  const {
    a,
    b,
    bImmWithMelee,
    immStr,
    aDefForImm,
    aToBlockVsBAll,
    aInvulnBonus,
    bMinDamageFromHits,
    bFearForCell,
    bDoomsA,
    bBlackSleep,
    bMeleeAtkVsA,
    bToHitMeleeVert,
    aDefVsB,
    aToBlockVsBMelee,
    bPoisonStrM,
    bPoisonFailM,
    bStoningFailM,
    bDeathTouchFailM,
    bDispelEvilFailM,
    bExorciseFailM,
    bDestructionFailM,
    bLifeStealModM,
    aResDeath,
    aBlurChance,
    blurBuggy,
    bCounterHaste,
    isCoM2,
  } = params;

  return {
    kind: 'damage',
    source: 'b',
    target: 'a',
    consumesFear: false,
    compute: (sAlive, tAlive, cap) => {
      if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      if (destroyMechanicalApplies(b, a, bBlackSleep ? 0 : bMeleeAtkVsA)) {
        return { dist: deterministicKillDist(cap), lifeStealEV: 0 };
      }
      const bImmMDist = (bImmWithMelee && tAlive > 0)
        ? calcAreaDamageDist(tAlive, immStr, b.toHitImmolation, aDefForImm, aToBlockVsBAll, a.hp, cap, aInvulnBonus, bMinDamageFromHits, woundedTopFigHP(cap, a.hp))
        : null;
      const fearD = bFearForCell(sAlive);
      const o = calcMeleeTouchOutcome(fearD, sAlive, bDoomsA, bBlackSleep ? 0 : applyRage(bMeleeAtkVsA, b, sAlive), bToHitMeleeVert,
        aDefVsB, aToBlockVsBMelee, a.hp, cap,
        bPoisonStrM, bPoisonFailM, bStoningFailM, bDeathTouchFailM, bDispelEvilFailM, bExorciseFailM, bDestructionFailM, bLifeStealModM, aResDeath,
        bImmMDist, aInvulnBonus, aBlurChance, blurBuggy, bCounterHaste,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined,
        bMinDamageFromHits, hasAbil(b.abilities, 'bloodSucker'));
      return { dist: o.damageDist, lifeStealEV: o.lifeStealEV };
    },
  };
}

function buildFirstStrikeComputes(params) {
  const {
    a,
    b,
    aImmWithMelee,
    immStr,
    bDefForImm,
    bToBlockVsAAll,
    bInvulnBonus,
    aMinDamageFromHits,
    aFearedByB,
    aPFear,
    aFearForCell,
    aDoomsB,
    aBlackSleep,
    aMeleeAtkVsB,
    aToHitMeleeVert,
    bDefVsA,
    bToBlockVsAMelee,
    aPoisonStrM,
    aPoisonFailM,
    aStoningFailM,
    aDeathTouchFailM,
    aDispelEvilFailM,
    aExorciseFailM,
    aDestructionFailM,
    aLifeStealModM,
    bResDeath,
    bBlurChance,
    blurBuggy,
    isCoM2,
  } = params;

  // All three FS-block strike computes are the same single A→B melee strike
  // (no doubleStrike — the FS block sequences strikes itself); they differ only
  // in which fear distribution applies. `fearFor` maps (sAlive, tAlive) to the
  // fear PMF over A's unfeared count, or null for no fear.
  const makeAStrike = (fearFor) => (sAlive, tAlive, cap) => {
    if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
    if (destroyMechanicalApplies(a, b, aBlackSleep ? 0 : aMeleeAtkVsB)) {
      return { dist: deterministicKillDist(cap), lifeStealEV: 0 };
    }
    const aImmMDist = (aImmWithMelee && tAlive > 0)
      ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits, woundedTopFigHP(cap, b.hp))
      : null;
    const o = calcMeleeTouchOutcome(fearFor(sAlive, tAlive), sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
      bDefVsA, bToBlockVsAMelee, b.hp, cap,
      aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aDestructionFailM, aLifeStealModM, bResDeath,
      aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, false /* doubleStrike */,
      isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
      aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'));
    return { dist: o.damageDist, lifeStealEV: o.lifeStealEV };
  };

  return {
    // FS strike: fear is aFearedByB only (no aFearBug — that fires after FS).
    // Used for both no-Haste FS and FS+Haste FS strike.
    fsStrikeCompute: makeAStrike((sAlive) => aFearedByB ? calcFearDist(sAlive, aPFear) : null),
    // Hasted 2nd strike: full A-side fear (aFearForCell, includes aFearBug).
    secondStrikeCompute: makeAStrike((sAlive, tAlive) => aFearForCell(sAlive, tAlive)),
    // No-fear strike: caller passes in k_a as sAlive (fear pre-sampled). Used when
    // FS+Haste shares one fear roll across FS and 2nd strike (rules-faithful k_a coupling).
    aStrikeNoFear: makeAStrike(() => null),
  };
}

function buildAttackerGazePhase(active, params) {
  if (!active) return null;
  const {
    a,
    b,
    aStoningGazeFailP,
    aDeathGazeFailP,
    aGazeDoomStrP,
    bDefForGaze,
    bInvulnBonus,
    bBlurChance,
    blurBuggy,
    isCoM2,
    bBlackSleep,
    bToBlockVsAAll,
    aMinDamageFromHits,
    aImmWithGaze,
    immStr,
    bDefForImm,
    aPoisonWithGaze,
    aPoisonStrG_raw,
    aPoisonFailG,
    aStoningWithGaze,
    aStoningFailG,
    aDeathTouchWithGaze,
    aDeathTouchFailG,
    aDispelEvilWithGaze,
    aDispelEvilFailG,
    aExorciseWithGaze,
    aDestructionWithGaze,
    aExorciseFailG,
    aDestructionFailG,
    aLifeStealWithGaze,
    aLifeStealModG,
    bResDeath,
  } = params;

  // Attacker gaze A->B. Source = A's surviving figs; target = B.
  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap) => {
      if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      let dist = buildGazeDist(a, b, sAlive, tAlive, cap, aStoningGazeFailP, aDeathGazeFailP, aGazeDoomStrP, bDefForGaze, bInvulnBonus, bBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, bBlackSleep, bToBlockVsAAll, aMinDamageFromHits);
      const aImmGDist = (aImmWithGaze && tAlive > 0)
        ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits, woundedTopFigHP(cap, b.hp))
        : null;
      const t = convolveTouchAttacks(dist, cap, sAlive, {
        poisonStr: aPoisonWithGaze ? aPoisonStrG_raw : 0, poisonFail: aPoisonFailG,
        stoningFail: aStoningWithGaze ? aStoningFailG : 0,
        deathTouchFail: aDeathTouchWithGaze ? aDeathTouchFailG : 0,
        dispelEvilFail: aDispelEvilWithGaze ? aDispelEvilFailG : 0,
        exorciseFail: aExorciseWithGaze ? aExorciseFailG : 0,
        destructionFail: aDestructionWithGaze ? aDestructionFailG : 0,
        targetHP: b.hp,
        lifeStealMod: aLifeStealWithGaze ? aLifeStealModG : null, lifeStealRes: bResDeath,
        immDist: aImmGDist,
        bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
      });
      return { dist: t.dist, lifeStealEV: t.lifeStealEV };
    },
  };
}

function buildDefenderGazePhase(active, params) {
  if (!active) return null;
  const {
    a,
    b,
    bStoningGazeFailP,
    bDeathGazeFailP,
    bGazeDoomStrP,
    aDefForGaze,
    aInvulnBonus,
    aBlurChance,
    blurBuggy,
    isCoM2,
    aBlackSleep,
    aToBlockVsBAll,
    bMinDamageFromHits,
    bImmWithGaze,
    immStr,
    aDefForImm,
    bPoisonWithGaze,
    bPoisonStrG_raw,
    bPoisonFailG,
    bStoningWithGaze,
    bStoningFailG,
    bDeathTouchWithGaze,
    bDeathTouchFailG,
    bDispelEvilWithGaze,
    bDispelEvilFailG,
    bExorciseWithGaze,
    bDestructionWithGaze,
    bExorciseFailG,
    bDestructionFailG,
    bLifeStealWithGaze,
    bLifeStealModG,
    aResDeath,
  } = params;

  // Defender gaze B->A.
  return {
    kind: 'damage',
    source: 'b',
    target: 'a',
    consumesFear: false,
    compute: (sAlive, tAlive, cap) => {
      if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      let dist = buildGazeDist(b, a, sAlive, tAlive, cap, bStoningGazeFailP, bDeathGazeFailP, bGazeDoomStrP, aDefForGaze, aInvulnBonus, aBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined, aBlackSleep, aToBlockVsBAll, bMinDamageFromHits);
      const bImmGDist = (bImmWithGaze && tAlive > 0)
        ? calcAreaDamageDist(tAlive, immStr, b.toHitImmolation, aDefForImm, aToBlockVsBAll, a.hp, cap, aInvulnBonus, bMinDamageFromHits, woundedTopFigHP(cap, a.hp))
        : null;
      const t = convolveTouchAttacks(dist, cap, sAlive, {
        poisonStr: bPoisonWithGaze ? bPoisonStrG_raw : 0, poisonFail: bPoisonFailG,
        stoningFail: bStoningWithGaze ? bStoningFailG : 0,
        deathTouchFail: bDeathTouchWithGaze ? bDeathTouchFailG : 0,
        dispelEvilFail: bDispelEvilWithGaze ? bDispelEvilFailG : 0,
        exorciseFail: bExorciseWithGaze ? bExorciseFailG : 0,
        destructionFail: bDestructionWithGaze ? bDestructionFailG : 0,
        targetHP: a.hp,
        lifeStealMod: bLifeStealWithGaze ? bLifeStealModG : null, lifeStealRes: aResDeath,
        immDist: bImmGDist,
        bloodsucker: hasAbil(b.abilities, 'bloodSucker'),
      });
      return { dist: t.dist, lifeStealEV: t.lifeStealEV };
    },
  };
}

// Resolve a full combat exchange between attacker and defender.
// All inputs are plain objects — no DOM access.
//
// Parameters:
//   a, b: unit stat objects with fields:
//     { figs, atk, def, res, hp, dmg, rtb, rangedType, thrownType,
//       toHitMelee, toHitRtb, toBlock, abilities }
//     where toHitMelee/toHitRtb/toBlock are already-clamped decimals (0.1-1.0)
//   opts: { isRanged, distance }
//
// Returns:
//   { phases, totalDmgToA, totalDmgToB,
//     aRemHP, aHP, aAlive, bRemHP, bHP, bAlive }
//   phases: array of { label, atkDist, defDist, atkHP, defHP, atkHPper, defHPper, atkFigs, defFigs } or null
function resolveCombat(a, b, opts) {
  const isRanged = opts.isRanged;
  const ver = opts.version;

  a = normalizeCombatUnit(a, ver);
  b = normalizeCombatUnit(b, ver);
  const aMeleeAtkVsB = bloodLustMeleeAttack(a, b);
  const bMeleeAtkVsA = bloodLustMeleeAttack(b, a);
  const aMinDamageFromHits = supernaturalMinDamageFn(a.abilities, ver);
  const bMinDamageFromHits = supernaturalMinDamageFn(b.abilities, ver);

  const toHitContext = applyPairToHitModifiers(a, b, ver);
  a = toHitContext.a;
  b = toHitContext.b;
  const { aCanSeeB } = toHitContext;

  // Vertigo: unit curse that penalizes the affected unit's conventional attacks and defense.
  // MoM:  -20% To Hit and -1 Defense.
  // CoM:  -30% To Hit and -10% To Block (no defense-die penalty).
  // CoM2: -25% To Hit and -7% To Block (no defense-die penalty).
  // Neither Illusion Immunity nor Magic Immunity negates Vertigo — we assume it was cast before those immunities were applied.
  const {
    isCoM,
    aToHitMeleeVert,
    bToHitMeleeVert,
    aToHitRtbVert,
    bToHitRtbVert,
    aVertigoDefPenalty,
    bVertigoDefPenalty,
    aVertigoBlockPenalty,
    bVertigoBlockPenalty,
  } = buildVertigoContext(a, b, ver);

  // Blur: pre-defense hit negation. Applies to melee, counter, ranged, thrown/breath,
  // and gaze hidden ranged component. Does NOT apply to doom damage or special/spell damage.
  // Rate: 10% (MoM), 20% (CoM/CoM2; Invisibility also grants 20%, combined cap 30%).
  // v1.31 bugs: success skips next roll (max 50%) and illusionImmunity checked on wrong unit.
  const bBlurChance = getBlurChance(b.abilities, a.abilities, ver);
  const aBlurChance = getBlurChance(a.abilities, b.abilities, ver);
  const blurBuggy = ver === 'mom_1.31';

  // First Strike applies when A is voluntarily attacking in melee and B cannot negate it.
  // Ranged attacks never trigger first strike (it only affects melee ordering).
  const hasFirstStrike = !isRanged
    && hasAbil(a.abilities, 'firstStrike')
    && !hasAbil(b.abilities, 'negateFirstStrike');

  // Haste: doubles melee, thrown/breath, and (most) ranged attacks. Gaze, Fear, and
  // Wall of Fire do not double. Counter-attacks double in MoM but not in CoM/CoM2.
  const aHaste = hasAbil(a.abilities, 'haste');
  const bHaste = hasAbil(b.abilities, 'haste');
  const isCoMVer = ver && ver.startsWith('com');
  const aCounterHaste = aHaste && !isCoMVer;
  const bCounterHaste = bHaste && !isCoMVer;

  const isCoM2 = opts.version && opts.version.startsWith('com2');
  const isCoM1Only = isCoMVer && !isCoM2;

  // Compute alive figures and remaining HP
  const aState = remainingUnitState(a);
  const bState = remainingUnitState(b);
  const aTotalHP = aState.totalHP;
  const aAlive = aState.alive;
  const aRemHP = aState.remHP;
  const bTotalHP = bState.totalHP;
  const bAlive = bState.alive;
  const bRemHP = bState.remHP;

  // Doom Damage: converts regular melee/ranged/thrown/breath attacks to exact damage (no to-hit, no defense).
  const aDoom = hasAbil(a.abilities, 'doom');
  const bDoom = hasAbil(b.abilities, 'doom');
  // Black Sleep: sleeping unit cannot attack; all incoming conventional damage becomes Doom.
  const aBlackSleep = hasAbil(a.abilities, 'blackSleep');
  const bBlackSleep = hasAbil(b.abilities, 'blackSleep');
  // A Black Slept attacker cannot initiate combat at all.
  // No ranged volley, gaze exchange, Wall of Fire, melee, or counter-attack occurs.
  if (aBlackSleep) {
    return {
      phases: null,
      totalDmgToA: [1],
      totalDmgToB: [1],
      aLifeStealDist: null,
      bLifeStealDist: null,
      aRemHP, aHP: a.hp, aAlive,
      bRemHP, bHP: b.hp, bAlive,
    };
  }
  const aDoomsB = aDoom || bBlackSleep; // A's conventional attacks against B → Doom
  const bDoomsA = bDoom || aBlackSleep; // B's conventional attacks against A → Doom
  const aMeleeDoomsB = aDoomsB || hasAbil(a.abilities, 'energyWeaponry');
  const bMeleeDoomsA = bDoomsA || hasAbil(b.abilities, 'energyWeaponry');
  const aRangedDoomsB = aDoomsB || hasAbil(a.abilities, 'energyCannon');

  // Invulnerability: reduces incoming damage by 2 per defense roll (applies on every fresh
  // defense roll, including overflow chains and multi-figure area damage). Applies to melee,
  // ranged, thrown, breath, immolation, wall of fire, and the gaze physical ranged component.
  // Does NOT apply to resist-based effects (poison, stoning, life steal, death gaze) or Doom.
  const aInvulnBonus = hasAbil(a.abilities, 'invulnerability') ? 2 : 0;
  const bInvulnBonus = hasAbil(b.abilities, 'invulnerability') ? 2 : 0;

  const {
    bResM,
    aResM,
    bResDeath,
    aResDeath,
    bResStoning,
    aResStoning,
    bResPoison,
    aResPoison,
  } = buildResistanceContext(a, b, ver, isCoM);

  // Cause Fear: reduces opponent's effective melee + touch-attack figures.
  // Fires before the melee exchange. MoM has no resistance modifier; CoM/CoM2 is -3.
  // v1.31 bugs: (1) defending Fear doesn't work; (2) attacker's Fear also self-fears attacker.
  const aFear = !isRanged && hasAbil(a.abilities, 'fear');
  const bFear = !isRanged && hasAbil(b.abilities, 'fear');
  const bPFear = aFear ? fearFailProb(bResDeath, b.abilities, opts.version) : 0; // A's fear on B
  const aPFear = bFear ? fearFailProb(aResDeath, a.abilities, opts.version) : 0; // B's fear on A
  // Phase always shows when either unit has Cause Fear; immunity (Death/Magic Immunity)
  // results in 0 feared figures via the skip / +30 resistance bonus in fearFailProb.
  const bFearedByA = aFear; // A can fear B (all versions; immune B shows phase with 0 feared)
  const aFearedByB = bFear && opts.version !== 'mom_1.31'; // B can fear A (not v1.31: bug #1)
  const aFearBug = aFear && opts.version === 'mom_1.31' && bPFear > 0; // v1.31 self-fear bug #2: bypasses immunity
  // B has Cause Fear but v1.31 bug silences it — still show the phase.
  const showFearNoop = bFear && !aFearedByB;
  // Label for simultaneous (non-FS) fear phases: mutual = "Cause Fear", else directional.
  const hasDefenderFear = aFearedByB || aFearBug || showFearNoop;
  const simultaneousFearLabel = hasDefenderFear && bFearedByA ? 'Cause Fear'
    : bFearedByA ? 'Attacker Cause Fear' : 'Defender Cause Fear';

  // Determine if attacker has thrown/breath (melee only). Two version-sensitive conditions:
  //  (1) Melee must enable the non-ranged sequence.
  //      MoM 1.31 needs *effective* melee > 0; every other version needs *base* melee > 0 (so
  //      Weakness reducing effective melee to 0 does not suppress the breath/thrown phase).
  //  (2) The breath/thrown attack must exist: MoM 1.31 needs *effective* strength > 0; every
  //      other version accepts *base OR effective* > 0 (so a granted breath with base 0 fires,
  //      and a breath reduced to 0 effective but with base > 0 still fires).
  // Black Sleep also prevents all outgoing attacks.
  const breathExists = ver === 'mom_1.31' ? a.rtb > 0 : (a.baseRtb > 0 || a.rtb > 0);
  // BU_AttackTarget's admission rule is separate from BU_ProcessAttack's later 1.31-only
  // zero-strength abort. The former keeps the established live/base melee predicate here.
  const legacyMeleeExists = ver === 'mom_1.31' ? a.atk > 0 : (a.baseAtk || 0) > 0;
  const legacyThrown = !isRanged && a.thrownType !== 'none' && breathExists
    && legacyMeleeExists && !aBlackSleep;
  const modernThrown = isCoM2 && !isRanged ? modernAttackChannels(a) : null;
  const hasThrown = modernThrown ? modernThrown.length > 0 : legacyThrown;

  const {
    aToBlockConventional,
    bToBlockVsAAll,
    aToBlockVsBAll,
    bToBlockVsAMelee,
    bToBlockVsAThrEW,
    bToBlockVsARangedEW,
    aToBlockVsBMelee,
  } = buildToBlockContext(a, b, aVertigoBlockPenalty, bVertigoBlockPenalty);

  // --- Immolation ---
  // Area fire damage: targets each defender figure independently (like fire breath).
  // Strength 4 (MoM) / 10 (CoM/CoM2). Fires like a touch attack with each attack phase.
  // Defense vs immolation is computed in computeDefenseProfile (vsImmolation above).
  const aHasImm = hasAbil(a.abilities, 'immolation');
  const bHasImm = hasAbil(b.abilities, 'immolation');
  const immStr = (aHasImm || bHasImm) ? immolationStr(ver) : 0;

  // --- Wall of Fire ---
  // Area Immolation damage to attacker A between gaze and melee. Not in ranged combat.
  // Uses the same defense chain as immolation against A, and the same immunities.
  const wallOfFireActive = !!opts.wallOfFire && !isRanged;
  const wofStr = wallOfFireActive ? wallOfFireStr(ver) : 0;
  // Wall of Fire is cast at 30% base To Hit (standard spell To Hit, like immolation);
  // Warlord raises this to 60% but limits the strike to a single attacker figure.
  const wofToHit = wallOfFireToHit(ver);
  const wofSingleFigure = wallOfFireSingleFigure(ver);

  // --- Melee phase pipeline ---
  // All non-ranged combat runs through a single joint-state engine:
  // thrown → attacker gaze → defender gaze → Wall of Fire → fear → melee/counter.
  // Gaze-active flags (used both by gate and by phase compute below).
  const aGazeDoomStrP = (a.effectiveDoomGaze || 0) > 0 ? a.effectiveDoomGaze : 0;
  const bGazeDoomStrP = (b.effectiveDoomGaze || 0) > 0 ? b.effectiveDoomGaze : 0;
  const gazeFiresAP = gazeAttackFires(a.effectiveGazeRanged, aGazeDoomStrP, a.baseGazeRanged, a.baseDoomGaze, opts.version);
  const gazeFiresBP = gazeAttackFires(b.effectiveGazeRanged, bGazeDoomStrP, b.baseGazeRanged, b.baseDoomGaze, opts.version);
  const aStoningGazeActiveP = abilDefined(a.abilities, 'stoningGaze') && gazeFiresAP;
  const bStoningGazeActiveP = abilDefined(b.abilities, 'stoningGaze') && gazeFiresBP;
  const aDeathGazeActiveP = abilDefined(a.abilities, 'deathGaze') && gazeFiresAP;
  const bDeathGazeActiveP = abilDefined(b.abilities, 'deathGaze') && gazeFiresBP;
  const aGazeRangedActiveP = (a.effectiveGazeRanged || 0) > 0;
  const bGazeRangedActiveP = (b.effectiveGazeRanged || 0) > 0;
  const aGazeActiveP = !aBlackSleep && (aStoningGazeActiveP || aDeathGazeActiveP || aGazeDoomStrP > 0 || aGazeRangedActiveP);
  const bGazeActiveP = !bBlackSleep && (bStoningGazeActiveP || bDeathGazeActiveP || bGazeDoomStrP > 0 || bGazeRangedActiveP);

  // Caster.exe evaluates EffectiveDefense for the incoming attack only. The DOS
  // path keeps its existing aggregate profile, while CoM2/Warlord skip sequences
  // for attack types which cannot fire in this exchange.
  const {
    bDefVsA,
    bDefVsARanged,
    bDefForThrown,
    bDefForGaze,
    bDefForImm,
    aDefVsB,
    aDefForGaze,
    aDefForImm,
  } = buildDefenseContext(a, b, ver, aVertigoDefPenalty, bVertigoDefPenalty, {
    melee: !isRanged,
    ranged: isRanged,
    thrown: hasThrown,
    counter: !isRanged,
    aGaze: !isRanged && aGazeActiveP,
    bGaze: !isRanged && bGazeActiveP,
    aImmolation: !isRanged && aHasImm,
    bImmolation: wallOfFireActive || (!isRanged && bHasImm),
  });

  if (!isRanged) {
    // Guard: can A initiate melee combat at all?
    // MoM 1.31: requires effective atk > 0, effective rtb > 0, or an active gaze.
    // Other versions: uses base (pre-modifier) atk/rtb values; gaze fires regardless of effective value.
    const aCanInitiateMelee = ver === 'mom_1.31'
      ? (a.atk > 0 || a.rtb > 0 || aGazeActiveP)
      : ((a.baseAtk || 0) > 0 || (a.baseRtb || 0) > 0 || aGazeActiveP);
    if (!aCanInitiateMelee) {
      return {
        phases: null,
        totalDmgToA: [1], totalDmgToB: [1],
        aLifeStealDist: null, bLifeStealDist: null,
        aRemHP, aHP: aTotalHP, aAlive,
        bRemHP, bHP: bTotalHP, bAlive,
      };
    }

    // Touch attack params: melee-phase activation.
    const { poisonStr: aPoisonStrM, poisonFail: aPoisonFailM, stoningFail: aStoningFailM, deathTouchFail: aDeathTouchFailM, dispelEvilFail: aDispelEvilFailM, exorciseFail: aExorciseFailM, destructionFail: aDestructionFailM, lifeStealMod: aLifeStealModM }
      = meleeTouchParams(a, b, bResM, bResDeath, bResStoning, bResPoison, opts.version);
    const { poisonStr: bPoisonStrM, poisonFail: bPoisonFailM, stoningFail: bStoningFailM, deathTouchFail: bDeathTouchFailM, dispelEvilFail: bDispelEvilFailM, exorciseFail: bExorciseFailM, destructionFail: bDestructionFailM, lifeStealMod: bLifeStealModM }
      = meleeTouchParams(b, a, aResM, aResDeath, aResStoning, aResPoison, opts.version);

    // Touch attack params: thrown-phase activation (for thrown/breath).
    const aTouchWithThrown = !aBlackSleep && touchAttackFires(a.rtb, a.baseRtb, opts.version);
    const { poisonStr: aPoisonStrT, poisonFail: aPoisonFailT, stoningFail: aStoningFailT, deathTouchFail: aDeathTouchFailT, dispelEvilFail: aDispelEvilFailT, exorciseFail: aExorciseFailT, destructionFail: aDestructionFailT, lifeStealMod: aLifeStealModT }
      = touchParams(a, b, bResM, bResDeath, bResStoning, bResPoison, opts.version,
        aTouchWithThrown, touchRecordForPhase(ver, a.thrownType));
    // Whether Life Steal survives routing and immunity for the thrown-phase
    // display count. Use the routed result so a ranged-record item power is not
    // lost merely because it is absent from the unit's common ability record.
    const aLifeStealOnT = aLifeStealModT !== null;

    // Gaze-phase touch activation (touches fire alongside gaze regardless of melee atk).
    const { poisonStr: aPoisonStrG_raw, poisonFail: aPoisonFailG, stoningFail: aStoningFailG, deathTouchFail: aDeathTouchFailG, dispelEvilFail: aDispelEvilFailG, exorciseFail: aExorciseFailG, destructionFail: aDestructionFailG, lifeStealMod: aLifeStealModG,
            poisonWith: aPoisonWithGaze, stoningWith: aStoningWithGaze, deathTouchWith: aDeathTouchWithGaze, dispelEvilWith: aDispelEvilWithGaze, exorciseWith: aExorciseWithGaze, destructionWith: aDestructionWithGaze, lifeStealWith: aLifeStealWithGaze }
      = gazeTouchParams(a, b, bResM, bResDeath, bResStoning, bResPoison, aGazeActiveP, aBlackSleep, opts.version);
    const { poisonStr: bPoisonStrG_raw, poisonFail: bPoisonFailG, stoningFail: bStoningFailG, deathTouchFail: bDeathTouchFailG, dispelEvilFail: bDispelEvilFailG, exorciseFail: bExorciseFailG, destructionFail: bDestructionFailG, lifeStealMod: bLifeStealModG,
            poisonWith: bPoisonWithGaze, stoningWith: bStoningWithGaze, deathTouchWith: bDeathTouchWithGaze, dispelEvilWith: bDispelEvilWithGaze, exorciseWith: bExorciseWithGaze, destructionWith: bDestructionWithGaze, lifeStealWith: bLifeStealWithGaze }
      = gazeTouchParams(b, a, aResM, aResDeath, aResStoning, aResPoison, bGazeActiveP, bBlackSleep, opts.version);

    // Gaze kill-roll probabilities (needed by buildGazeDist).
    const { stoningFail: aStoningGazeFailP, deathFail: aDeathGazeFailP }
      = gazeKillProbs(a, aStoningGazeActiveP, aDeathGazeActiveP, b, bResDeath, bResStoning);
    const { stoningFail: bStoningGazeFailP, deathFail: bDeathGazeFailP }
      = gazeKillProbs(b, bStoningGazeActiveP, bDeathGazeActiveP, a, aResDeath, aResStoning);

    // Immolation activation per phase.
    const aImmWithThrown = aHasImm && !aBlackSleep && touchAttackFires(a.rtb, a.baseRtb, opts.version);
    const aImmWithGaze   = aHasImm && aGazeActiveP;
    const bImmWithGaze   = bHasImm && bGazeActiveP;
    const aImmWithMelee  = aHasImm && !aBlackSleep && touchAttackFires(a.atk, a.baseAtk, opts.version);
    const bImmWithMelee  = bHasImm && !bBlackSleep && touchAttackFires(b.atk, b.baseAtk, opts.version);

    // Standalone life-steal dists for UI summary. Approximation: count of phases
    // where life-steal fires, convolved (matches existing thrown-branch behavior;
    // EV is computed exactly per-phase below and is the correct displayed value).
    // Approximate life-steal display dist: number of phases × single-firing dist.
    let aLifeStealDistP = null;
    {
      const lsRefMod = aLifeStealModM !== null ? aLifeStealModM
                     : aLifeStealModT !== null ? aLifeStealModT
                     : aLifeStealWithGaze ? aLifeStealModG : null;
      if (lsRefMod !== null && aAlive > 0 && bRemHP > 0) {
        const single = calcLifeStealDmgDist(aAlive, bResDeath, lsRefMod, bRemHP);
        const count = (aLifeStealOnT ? 1 : 0)
                    + (aLifeStealWithGaze ? 1 : 0)
                    + (aLifeStealModM !== null ? 1 : 0);
        aLifeStealDistP = count > 0 ? repeatDist(single, count, bRemHP) : single;
      }
    }
    let bLifeStealDistP = null;
    {
      const lsRefMod = bLifeStealModM !== null ? bLifeStealModM
                     : bLifeStealWithGaze ? bLifeStealModG : null;
      if (lsRefMod !== null && bAlive > 0 && aRemHP > 0) {
        const single = calcLifeStealDmgDist(bAlive, aResDeath, lsRefMod, aRemHP);
        const count = (bLifeStealWithGaze ? 1 : 0)
                    + (bLifeStealModM !== null ? 1 : 0);
        bLifeStealDistP = count > 0 ? repeatDist(single, count, aRemHP) : single;
      }
    }

    // Phase compute closures.
    // Per-cell fear PMF over A's unfeared count. Re-computed per cell because alive
    // counts vary across joint cells. Returns null if A has no incoming fear.
    function aFearForCell(aAliveLocal, bAliveLocal) {
      if (aFearedByB) return calcFearDist(aAliveLocal, aPFear);
      if (aFearBug)   return calcFearBugDist(aAliveLocal, bAliveLocal, bPFear);
      return null;
    }
    function bFearForCell(bAliveLocal) {
      return bFearedByA ? calcFearDist(bAliveLocal, bPFear) : null;
    }

    const meleePhase = buildMeleePhase({
      a,
      b,
      aImmWithMelee,
      immStr,
      bDefForImm,
      bToBlockVsAAll,
      bInvulnBonus,
      aMinDamageFromHits,
      aFearForCell,
      aDoomsB: aMeleeDoomsB,
      aBlackSleep,
      aMeleeAtkVsB,
      aToHitMeleeVert,
      bDefVsA,
      bToBlockVsAMelee,
      aPoisonStrM,
      aPoisonFailM,
      aStoningFailM,
      aDeathTouchFailM,
      aDispelEvilFailM,
      aExorciseFailM,
      aDestructionFailM,
      aLifeStealModM,
      bResDeath,
      bBlurChance,
      blurBuggy,
      aHaste,
      isCoM2,
    });
    const counterPhase = buildCounterPhase({
      a,
      b,
      bImmWithMelee,
      immStr,
      aDefForImm,
      aToBlockVsBAll,
      aInvulnBonus,
      bMinDamageFromHits,
      bFearForCell,
      bDoomsA: bMeleeDoomsA,
      bBlackSleep,
      bMeleeAtkVsA,
      bToHitMeleeVert,
      aDefVsB,
      aToBlockVsBMelee,
      bPoisonStrM,
      bPoisonFailM,
      bStoningFailM,
      bDeathTouchFailM,
      bDispelEvilFailM,
      bExorciseFailM,
      bDestructionFailM,
      bLifeStealModM,
      aResDeath,
      aBlurChance,
      blurBuggy,
      bCounterHaste,
      isCoM2,
    });
    const wofPhase = buildWallOfFirePhase(wallOfFireActive, {
      wofStr,
      wofToHit,
      wofSingleFigure,
      aDefForImm,
      // Wall of Fire has no attacking unit whose Mystic Surge/Eldritch Weapon can
      // modify the roll, but the target's direct Vertigo stat write still applies.
      aToBlock: aToBlockConventional,
      aHP: a.hp,
      aInvulnBonus,
    });

    const aGazePhase = buildAttackerGazePhase(aGazeActiveP, {
      a,
      b,
      aStoningGazeFailP,
      aDeathGazeFailP,
      aGazeDoomStrP,
      bDefForGaze,
      bInvulnBonus,
      bBlurChance,
      blurBuggy,
      isCoM2,
      bBlackSleep,
      bToBlockVsAAll,
      aMinDamageFromHits,
      aImmWithGaze,
      immStr,
      bDefForImm,
      aPoisonWithGaze,
      aPoisonStrG_raw,
      aPoisonFailG,
      aStoningWithGaze,
      aStoningFailG,
      aDeathTouchWithGaze,
      aDeathTouchFailG,
      aDispelEvilWithGaze,
      aDispelEvilFailG,
      aExorciseWithGaze,
      aDestructionWithGaze,
      aExorciseFailG,
      aDestructionFailG,
      aLifeStealWithGaze,
      aLifeStealModG,
      bResDeath,
    });

    const bGazePhase = buildDefenderGazePhase(bGazeActiveP, {
      a,
      b,
      bStoningGazeFailP,
      bDeathGazeFailP,
      bGazeDoomStrP,
      aDefForGaze,
      aInvulnBonus,
      aBlurChance,
      blurBuggy,
      isCoM2,
      aBlackSleep,
      aToBlockVsBAll,
      bMinDamageFromHits,
      bImmWithGaze,
      immStr,
      aDefForImm,
      bPoisonWithGaze,
      bPoisonStrG_raw,
      bPoisonFailG,
      bStoningWithGaze,
      bStoningFailG,
      bDeathTouchWithGaze,
      bDeathTouchFailG,
      bDispelEvilWithGaze,
      bDispelEvilFailG,
      bExorciseWithGaze,
      bDestructionWithGaze,
      bExorciseFailG,
      bDestructionFailG,
      bLifeStealWithGaze,
      bLifeStealModG,
      aResDeath,
    });

    // Thrown / breath: A→B, fires before melee.  DOS has one shared slot; Caster.exe
    // runs each independently-derived channel.  F29 owns their final engine ordering.
    const buildThrown = (attacker, active, type, touchRecord) => {
      const touchActive = active && !aBlackSleep
        && (isCoM2 || touchAttackFires(attacker.rtb, attacker.baseRtb, opts.version));
      const touch = touchParams(attacker, b, bResM, bResDeath, bResStoning, bResPoison,
        opts.version, touchActive, touchRecord);
      return {
        touch,
        phase: buildThrownPhase(active, {
          a: attacker,
          b,
          aDoomsB,
          aBlackSleep,
          aToHitRtbVert: isCoM2 && hasAbil(attacker.abilities, 'vertigo')
            ? Math.max(0.1, attacker.toHitRtb - 0.25) : aToHitRtbVert,
          bDefForThrown: isCoM2 ? computeCasterDefenseForAttack(b, attacker, ver, bVertigoDefPenalty, 'thrown') : bDefForThrown,
          bToBlockVsAThrEW: isCoM2 ? buildToBlockContext(attacker, b, aVertigoBlockPenalty, bVertigoBlockPenalty).bToBlockVsAThrEW : bToBlockVsAThrEW,
          bInvulnBonus,
          bBlurChance,
          blurBuggy,
          isCoM2,
          aMinDamageFromHits,
          aImmWithThrown,
          immStr,
          bDefForImm,
          bToBlockVsAAll,
          aPoisonStrT: touch.poisonStr,
          aPoisonFailT: touch.poisonFail,
          aStoningFailT: touch.stoningFail,
          aDeathTouchFailT: touch.deathTouchFail,
          aDispelEvilFailT: touch.dispelEvilFail,
          aExorciseFailT: touch.exorciseFail,
          aDestructionFailT: touch.destructionFail,
          aLifeStealModT: touch.lifeStealMod,
          bResDeath,
          aHaste,
        }),
      };
    };
    const thrownPhases = modernThrown
      ? modernThrown.map(channel => {
          // Caster.exe admits ApplyAttack types 2 (melee) and 5 (Thrown) to the same Blood
          // Lust doubling block. Fire/Lightning Breath use their own types and stay unchanged.
          const strength = channel.key === 'thrown'
            ? bloodLustMeleeAttack(a, b, channel.strength)
            : channel.strength;
          const attacker = modernAttackUnit(a, { ...channel, strength });
          const built = buildThrown(attacker, true, channel.type,
            touchRecordForPhase(ver, channel.key === 'thrown' ? 'thrown' : channel.type));
          return { attacker, type: channel.type, ...built };
        })
      : [{
          attacker: a,
          type: a.thrownType,
          ...buildThrown(a, legacyThrown, a.thrownType,
            touchRecordForPhase(ver, a.thrownType)),
        }];

    // Run the engine: thrown (if active) → WoF (if active) → simultaneous melee+counter.
    let joint = makeJoint2D(aRemHP, bRemHP);
    let lifeStealEV_a = 0, lifeStealEV_b = 0;
    const breakdown = [];   // accumulate phase rows

    const pendingFear = { aFearDist: null, bFearDist: null };

    for (const { attacker: channelAttacker, type: channelType, phase: thrownPhase, touch } of thrownPhases) {
      if (!thrownPhase) continue;
      const r = applyDamagePhase(joint, thrownPhase, pendingFear, { a: channelAttacker, b }, bRemHP);
      joint = r.joint;
      lifeStealEV_a += r.lifeStealEV;
      const bMargAtThrown = marginalB(joint);
      const thrownLabel = thrownPhaseLabel({
        thrownType: channelType,
        hasted: aHaste && channelAttacker.rtb > 0,
        poisonTouch: touch.poisonFail > 0,
        stoningTouch: touch.stoningFail > 0,
        deathTouch: touch.deathTouchFail > 0,
        dispelEvil: touch.dispelEvilFail > 0,
        exorcise: touch.exorciseFail > 0,
        destruction: touch.destructionFail > 0,
        lifeSteal: touch.lifeStealMod !== null,
        immolation: aImmWithThrown,
      });
      breakdown.push({ label: thrownLabel,
        atkDist: [1], atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: r.marginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: 0, defDestroyPct: pDestroyedFrom(bMargAtThrown, bRemHP) });
    }

    if (aGazePhase) {
      const r = applyDamagePhase(joint, aGazePhase, pendingFear, { a, b }, bRemHP);
      joint = r.joint;
      lifeStealEV_a += r.lifeStealEV;
      const bMargAtAGz = marginalB(joint);
      const aGzLabel = gazePhaseLabel('Attacker', {
        stoningGaze: aStoningGazeActiveP,
        deathGaze: aDeathGazeActiveP,
        doomGaze: aGazeDoomStrP > 0,
        poisonTouch: aPoisonWithGaze,
        stoningTouch: aStoningWithGaze,
        deathTouch: aDeathTouchWithGaze,
        dispelEvil: aDispelEvilWithGaze,
        exorcise: aExorciseWithGaze,
        destruction: aDestructionWithGaze,
        lifeSteal: aLifeStealWithGaze,
        immolation: aImmWithGaze,
      });
      breakdown.push({ label: aGzLabel,
        atkDist: [1], atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: r.marginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: 0, defDestroyPct: pDestroyedFrom(bMargAtAGz, bRemHP) });
    }

    if (bGazePhase) {
      const r = applyDamagePhase(joint, bGazePhase, pendingFear, { a, b }, aRemHP);
      joint = r.joint;
      lifeStealEV_b += r.lifeStealEV;
      const aMargAtBGz = marginalA(joint);
      const bMargAtBGz = marginalB(joint);
      const bGzLabel = gazePhaseLabel('Defender', {
        stoningGaze: bStoningGazeActiveP,
        deathGaze: bDeathGazeActiveP,
        doomGaze: bGazeDoomStrP > 0,
        poisonTouch: bPoisonWithGaze,
        stoningTouch: bStoningWithGaze,
        deathTouch: bDeathTouchWithGaze,
        dispelEvil: bDispelEvilWithGaze,
        exorcise: bExorciseWithGaze,
        destruction: bDestructionWithGaze,
        lifeSteal: bLifeStealWithGaze,
        immolation: bImmWithGaze,
      });
      breakdown.push({ label: bGzLabel,
        atkDist: r.marginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: [1], defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: pDestroyedFrom(aMargAtBGz, aRemHP), defDestroyPct: pDestroyedFrom(bMargAtBGz, bRemHP) });
    }

    if (wofPhase) {
      const r = applyDamagePhase(joint, wofPhase, pendingFear, { a, b }, aRemHP);
      joint = r.joint;
      const aMargAtWof = marginalA(joint);
      breakdown.push({ label: 'Wall of Fire',
        atkDist: r.marginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: [1], defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: pDestroyedFrom(aMargAtWof, aRemHP), defDestroyPct: 0 });
    }

    // Survivor-distribution helper.
    const computeSurv = (j) => {
      const aSurv = new Array(a.figs + 1).fill(0);
      const bSurv = new Array(b.figs + 1).fill(0);
      for (let cumA = 0; cumA < j.length; cumA++) {
        const ak = aliveCount(a, cumA);
        const bRow = j[cumA];
        for (let cumB = 0; cumB < bRow.length; cumB++) {
          const p = bRow[cumB];
          if (p < 1e-15) continue;
          aSurv[ak] += p;
          bSurv[aliveCount(b, cumB)] += p;
        }
      }
      return { aSurv, bSurv };
    };

    if (hasFirstStrike) {
      // FS path. With Haste: FS strike → (counter + 2nd strike simultaneous).
      // Without Haste: FS strike → counter sequentially.
      // Per-cell CoM1 fallthrough → simultaneous melee+counter (single strike).

      // Step 5: Defender Cause Fear row (B's fear on A only; aFearBug fires after FS).
      const survPre = computeSurv(joint);
      const beforeFear = buildFearPhaseDists(aAlive, bAlive, bPFear, aPFear, aFearedByB, false, false, showFearNoop, survPre.bSurv, survPre.aSurv);
      if (beforeFear) {
        breakdown.push({ label: 'Defender Cause Fear', mode: 'feared',
          atkDist: beforeFear.atkFearedDist, defDist: beforeFear.defFearedDist });
      }

      const { fsStrikeCompute, secondStrikeCompute, aStrikeNoFear } = buildFirstStrikeComputes({
        a,
        b,
        aImmWithMelee,
        immStr,
        bDefForImm,
        bToBlockVsAAll,
        bInvulnBonus,
        aMinDamageFromHits,
        aFearedByB,
        aPFear,
        aFearForCell,
        aDoomsB: aMeleeDoomsB,
        aBlackSleep,
        aMeleeAtkVsB,
        aToHitMeleeVert,
        bDefVsA,
        bToBlockVsAMelee,
        aPoisonStrM,
        aPoisonFailM,
        aStoningFailM,
        aDeathTouchFailM,
        aDispelEvilFailM,
        aExorciseFailM,
        aDestructionFailM,
        aLifeStealModM,
        bResDeath,
        bBlurChance,
        blurBuggy,
        isCoM2,
      });

      let fsResult;
      if (aHaste) {
        // Couple k_a across FS and 2nd strike when B has fear on A (and not v1.31, where
        // aFearedByB=false anyway). Otherwise no fear roll happens at all on the FS strike,
        // so coupling is moot — fall through to independent path.
        const coupleKa = aFearedByB && aHaste;
        fsResult = applyFsBlockHaste(joint,
          { fsStrike: fsStrikeCompute, secondStrike: secondStrikeCompute,
            aStrikeNoFear, counter: counterPhase.compute, fallthroughCounter: counterPhase.compute },
          { a, b, aRemHP, bRemHP, isCoM1Only, coupleKa, aPFear });
      } else {
        fsResult = applyFsBlockNoHaste(joint,
          { fsStrike: fsStrikeCompute, counter: counterPhase.compute },
          { a, b, aRemHP, bRemHP, isCoM1Only });
      }
      joint = fsResult.joint;
      lifeStealEV_a += fsResult.lifeStealEV_a;
      lifeStealEV_b += fsResult.lifeStealEV_b;

      // Step 6: First Strike row.
      const aMargPostFS = marginalA(fsResult.postFsJoint);
      const bMargPostFS = marginalB(fsResult.postFsJoint);
      const fsLabel = firstStrikeBreakdownLabel({
        poisonTouch: aPoisonFailM > 0,
        stoningTouch: aStoningFailM > 0,
        deathTouch: aDeathTouchFailM > 0,
        dispelEvil: aDispelEvilFailM > 0,
        exorcise: aExorciseFailM > 0,
        destruction: aDestructionFailM > 0,
        lifeSteal: aLifeStealModM !== null,
        immolation: aImmWithMelee,
      });
      breakdown.push({ label: fsLabel,
        atkDist: [1], atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: fsResult.fsMarginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: pDestroyedFrom(aMargPostFS, aRemHP), defDestroyPct: pDestroyedFrom(bMargPostFS, bRemHP) });

      // Step 7: Attacker Cause Fear row (post-FS; includes A's fear on B and v1.31 self-fear bug).
      const survPostFS = computeSurv(fsResult.postFsJoint);
      const afterFear = buildFearPhaseDists(aAlive, bAlive, bPFear, aPFear, false, aFearBug, bFearedByA, false, survPostFS.bSurv, survPostFS.aSurv);
      if (afterFear) {
        breakdown.push({ label: 'Attacker Cause Fear', mode: 'feared',
          atkDist: afterFear.atkFearedDist, defDist: afterFear.defFearedDist });
      }

      // Step 8: Counter (no-Haste) or 2nd strike + Counter combined (FS+Haste).
      const totalDmgToAFs = marginalA(joint);
      const totalDmgToBFs = marginalB(joint);
      if (aHaste) {
        // Combined "Hasted 2nd Strike + Counter" row.
        const label = secondStrikeCounterBreakdownLabel({
          poisonTouch: aPoisonFailM > 0 || bPoisonFailM > 0,
          stoningTouch: aStoningFailM > 0 || bStoningFailM > 0,
          deathTouch: aDeathTouchFailM > 0 || bDeathTouchFailM > 0,
          dispelEvil: aDispelEvilFailM > 0 || bDispelEvilFailM > 0,
          exorcise: aExorciseFailM > 0 || bExorciseFailM > 0,
          destruction: aDestructionFailM > 0 || bDestructionFailM > 0,
          lifeSteal: aLifeStealModM !== null || bLifeStealModM !== null,
          immolation: aImmWithMelee || bImmWithMelee,
          counterHasted: bCounterHaste,
        });
        breakdown.push({ label,
          atkDist: fsResult.counterMarginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
          defDist: fsResult.secondMarginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
          atkDestroyPct: pDestroyedFrom(totalDmgToAFs, aRemHP), defDestroyPct: pDestroyedFrom(totalDmgToBFs, bRemHP) });
      } else {
        const counterLabel = counterBreakdownLabel({
          counterHasted: bCounterHaste,
          poisonTouch: bPoisonFailM > 0,
          stoningTouch: bStoningFailM > 0,
          deathTouch: bDeathTouchFailM > 0,
          dispelEvil: bDispelEvilFailM > 0,
          exorcise: bExorciseFailM > 0,
          destruction: bDestructionFailM > 0,
          lifeSteal: bLifeStealModM !== null,
          immolation: bImmWithMelee,
        });
        breakdown.push({ label: counterLabel,
          atkDist: fsResult.counterMarginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
          defDist: [1], defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
          atkDestroyPct: pDestroyedFrom(totalDmgToAFs, aRemHP), defDestroyPct: pDestroyedFrom(totalDmgToBFs, bRemHP) });
      }
    } else {
      // Non-FS path: emits a single combined Cause Fear row + simultaneous melee+counter.
      const hasDefenderFearP = aFearedByB || aFearBug || showFearNoop;
      if (bFearedByA || hasDefenderFearP) {
        const surv = computeSurv(joint);
        const fearRow = buildFearPhaseDists(aAlive, bAlive, bPFear, aPFear, aFearedByB, aFearBug, bFearedByA, showFearNoop, surv.bSurv, surv.aSurv);
        if (fearRow) {
          breakdown.push({ label: simultaneousFearLabel, mode: 'feared',
            atkDist: fearRow.atkFearedDist, defDist: fearRow.defFearedDist });
        }
      }

      const pair = applySimultaneousPair(joint, counterPhase, meleePhase, pendingFear, { a, b }, aRemHP, bRemHP);
      joint = pair.joint;
      lifeStealEV_a += pair.lifeStealEV_a;
      lifeStealEV_b += pair.lifeStealEV_b;

      const totalDmgToANF = marginalA(joint);
      const totalDmgToBNF = marginalB(joint);
      // Melee+counter row appears when there's a preceding row OR Haste is in play.
      if (breakdown.length > 0 || aHaste || bCounterHaste) {
        const meleeLabel = meleeBreakdownLabel({
          hasted: aHaste,
          counterHasted: bCounterHaste,
          poisonTouch: aPoisonStrM > 0 || bPoisonStrM > 0,
          stoningTouch: aStoningFailM > 0 || bStoningFailM > 0,
          deathTouch: aDeathTouchFailM > 0 || bDeathTouchFailM > 0,
          dispelEvil: aDispelEvilFailM > 0 || bDispelEvilFailM > 0,
          exorcise: aExorciseFailM > 0 || bExorciseFailM > 0,
          destruction: aDestructionFailM > 0 || bDestructionFailM > 0,
          lifeSteal: aLifeStealModM !== null || bLifeStealModM !== null,
          immolation: aImmWithMelee || bImmWithMelee,
        });
        breakdown.push({ label: meleeLabel,
          atkDist: pair.marginalA, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
          defDist: pair.marginalB, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
          atkDestroyPct: pDestroyedFrom(totalDmgToANF, aRemHP), defDestroyPct: pDestroyedFrom(totalDmgToBNF, bRemHP) });
      }
    }

    const totalDmgToA = marginalA(joint);
    const totalDmgToB = marginalB(joint);

    return {
      phases: breakdown.length > 0 ? breakdown : null,
      totalDmgToA, totalDmgToB,
      aLifeStealDist: aLifeStealDistP,
      aLifeStealExpected: lifeStealEV_a,
      bLifeStealDist: bLifeStealDistP,
      bLifeStealExpected: lifeStealEV_b,
      aRemHP, aHP: a.hp, aAlive,
      bRemHP, bHP: b.hp, bAlive,
    };
  }

  if (isRanged) {
    // --- Ranged: attacker shoots, no counter-attack ---
    // Invisible defender cannot be targeted by ranged attacks (unless attacker has Illusions Immunity).
    if (!aCanSeeB) {
      return {
        phases: null,
        totalDmgToA: [1], totalDmgToB: [1],
        aRemHP, aHP: aTotalHP, aAlive,
        bRemHP, bHP: bTotalHP, bAlive,
      };
    }
    const rangedChannel = isCoM2 && a.modernAttacks && a.modernAttacks.ranged;
    const rangedAttacker = rangedChannel ? modernAttackUnit(a, { key: 'ranged', ...rangedChannel }) : a;
    const rangedDefense = rangedChannel
      ? computeCasterDefenseForAttack(b, rangedAttacker, ver, bVertigoDefPenalty, 'ranged')
      : bDefVsARanged;
    const rangedToBlock = rangedChannel
      ? buildToBlockContext(rangedAttacker, b, aVertigoBlockPenalty, bVertigoBlockPenalty).bToBlockVsARangedEW
      : bToBlockVsARangedEW;

    // Rage: +1 ranged per figure lost (ranged combat has no counter-attack, so only
    // pre-combat casualties contribute — aAlive is constant through the volley).
    const aRtbRanged = applyRage(rangedAttacker.rtb, rangedAttacker, aAlive);
    let dmgToB = aAlive > 0 && bRemHP > 0 && rangedAttacker.rtb > 0 && !aBlackSleep
      ? (aRangedDoomsB ? calcDoomDist(aAlive, aRtbRanged, bRemHP)
                 : calcTotalDamageDist(aAlive, aRtbRanged,
                     hasAbil(rangedAttacker.abilities, 'vertigo') && isCoM2 ? Math.max(0.1, rangedAttacker.toHitRtb - 0.25) : aToHitRtbVert,
                     rangedDefense, rangedToBlock, b.hp, bRemHP, bInvulnBonus, bBlurChance, blurBuggy,
                     isCoM2 ? woundedTopFigHP(bRemHP, b.hp) : undefined, aMinDamageFromHits))
      : [1];

    // Touch attacks accompanying ranged use the general + ranged attack-flag records.
    // Warlord's manual describes a magical-ranged exclusion, but the dispatcher has
    // no blanket type gate; represented spells instead move or clear record values.
    const rangedTouchFires = touchAttackFires(
      rangedAttacker.rtb, rangedAttacker.baseRtb, opts.version);
    const { poisonStr: aPoisonStrR, poisonFail: aPoisonFailR, stoningFail: aStoningFailR, deathTouchFail: aDeathTouchFailR, dispelEvilFail: aDispelEvilFailR, exorciseFail: aExorciseFailR, destructionFail: aDestructionFailR, lifeStealMod: aLifeStealModR }
      = touchParams(rangedAttacker, b, bResM, bResDeath, bResStoning, bResPoison,
        opts.version, rangedTouchFires, touchRecordForPhase(ver, 'ranged'));
    const aImmWithRanged = aHasImm && !immolationBlocksRanged(ver) && rangedTouchFires;
    const aImmDistR = (aImmWithRanged && aAlive > 0 && bAlive > 0 && bRemHP > 0)
      ? calcAreaDamageDist(bAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, bRemHP, bInvulnBonus, aMinDamageFromHits, woundedTopFigHP(bRemHP, b.hp))
      : null;
    const tR = convolveTouchAttacks(dmgToB, bRemHP, aAlive, {
      poisonStr: aPoisonStrR, poisonFail: aPoisonFailR,
      stoningFail: aStoningFailR,
      deathTouchFail: aDeathTouchFailR,
      dispelEvilFail: aDispelEvilFailR,
      exorciseFail: aExorciseFailR,
      destructionFail: aDestructionFailR,
      targetHP: b.hp,
      lifeStealMod: aLifeStealModR, lifeStealRes: bResDeath,
      immDist: aImmDistR,
      bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
    });
    dmgToB = tR.dist;
    let aLifeStealDistR = tR.lifeStealDist;
    let aLifeStealExpectedR = tR.lifeStealEV;

    // Haste doubles ranged attacks, including mana-pool magical ranged from Caster
    // *units* (Djinn, Efreet). The DOS engines require 7 mana in 1.31 or 6 in CP 1.60
    // and spend 3 on the extra shot; resources are outside this one-round damage model,
    // so an available shot is assumed.
    //
    // MoM 1.31 exception, heroes only. Its repeat gate (WIZARDS.EXE 0x99396) tests just
    // Attribs_1 & 0x6000 — the Caster 20/40 unit flags — with no hero test, unlike the
    // routine that charges the *first* shot (0x9B027, `Hero_Slot >= 0 || 0x6000`). A
    // magical-ranged hero therefore falls through to the ammunition branch, and every
    // such hero ships with 0 ammo, so the second shot never fires. CP 1.60 added the
    // missing hero test, which is why this is 1.31-only.
    // Modelled as the common case: 1.31's real gate also ORs in a stale read of
    // battle_units[3].ranged_type, so an unrelated unit can flip the outcome either way.
    // See `Reference docs/MoM binary analysis.md`, *First Strike's 24-HP cutoff and
    // Haste repeats*.
    const momHeroManaRanged = ver === 'mom_1.31'
      && (a.isHero || a.unitType === 'hero')
      && (a.rangedType === 'magic_c' || a.rangedType === 'magic_n' || a.rangedType === 'magic_s');
    // Self-convolving captures both the main ranged damage and all touch + immolation
    // effects folded in above.
    const hasteDoublesRanged = aHaste && rangedAttacker.rtb > 0 && aAlive > 0 && bRemHP > 0
      && !momHeroManaRanged;
    if (hasteDoublesRanged) {
      dmgToB = convolveDists(dmgToB, dmgToB, bRemHP);
      if (aLifeStealDistR) aLifeStealDistR = convolveDists(aLifeStealDistR, aLifeStealDistR, bRemHP);
      aLifeStealExpectedR *= 2;
    }

    return {
      phases: null,
      totalDmgToA: [1],
      totalDmgToB: dmgToB,
      aLifeStealDist: aLifeStealDistR,
      aLifeStealExpected: aLifeStealExpectedR,
      bLifeStealDist: null,
      bLifeStealExpected: 0,
      aRemHP, aHP: a.hp, aAlive,
      bRemHP, bHP: b.hp, bAlive,
    };

  }
}
