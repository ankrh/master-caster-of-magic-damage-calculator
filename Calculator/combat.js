// --- Combat Resolution ---
// Pure functions with no DOM dependencies. Depends on engine.js.

// Ability accessors — guard against absent abilities objects.
function hasAbil(ab, key) { return !!(ab && ab[key]); }
function abilVal(ab, key, def) { return (ab && ab[key] != null) ? ab[key] : def; }
function abilDefined(ab, key) { return ab != null && ab[key] != null; }

// Compatibility 10%-100% To-Hit clamp for isolated calculations such as Energy Cannon.
// Ordered unit thresholds and modern common-then-channel normalization live in stats.js.
// PROVENANCE[clampPct]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:20:cb4fa9e7501e8b1aefe9a152 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:26:68e7e2b7c0ba44df6f0af0aa
// STAT-FORMULA[clampPct]
function clampPct(base, mod) {
  return Math.min(1.0, Math.max(0.1, (base + mod) / 100));
}

// CoM2: remaining HP of the wounded top figure in a stack.
// If remHP is an exact multiple of hpPerFig, all figures are at full HP → return hpPerFig.
// STAT-FORMULA[woundedTopFigureHp]
// PROVENANCE[woundedTopFigureHp]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.DamageHandling.pas@span:30:ee8d05c1beac22182b95fbf9 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:14:2f5764024a52fb0aae3ebf95 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:15:910123b625584f9e2f6b856c
function woundedTopFigHP(remHP, hpPerFig) {
  return remHP % hpPerFig || hpPerFig;
}

// Weapon type bonuses: { atk, def, toHit }
// Magical/Mithril/Adamantium: +10% To Hit on eligible melee, missile, boulder, and
// thrown channels. The exact per-engine presence/type gates are applied in stats.js.
// Mithril: +1 atk (melee, missile, boulder, thrown), +1 def
// Adamantium: +2 atk (same types), +2 def
// Dispatch wrapper only: the independently sourced formulas are the material cases below.
function weaponBonus(type) {
  switch (type) {
    // STAT-FORMULA[weaponBonus:magic]
    // PROVENANCE[weaponBonus:magic]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:40:69469f057ab9fbf0bae6bf1c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:5cf2b9b947be869791070ddc | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
    case 'magic':      return { atk: 0, def: 0, toHit: 10 };
    // STAT-FORMULA[weaponBonus:mithril]
    // PROVENANCE[weaponBonus:mithril]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:40:69469f057ab9fbf0bae6bf1c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:5cf2b9b947be869791070ddc | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
    case 'mithril':    return { atk: 1, def: 1, toHit: 10 };
    // STAT-FORMULA[weaponBonus:adamantium]
    // PROVENANCE[weaponBonus:adamantium]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:40:69469f057ab9fbf0bae6bf1c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:5cf2b9b947be869791070ddc | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
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
// PROVENANCE[levelBonusDispatch]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b | Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
// STAT-FORMULA[levelBonusDispatch]
function getLevelBonuses(level, version) {
  const isMoM = version.startsWith('mom_');
  const isWarlord = version.startsWith('com2_warlord');
  if (isMoM) {
    switch (level) {
      // STAT-FORMULA[levelBonuses:mom:regular]
      // PROVENANCE[levelBonuses:mom:regular]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b
      case 'regular':    return { atk: 1, ranged: 1, thrown: 1, def: 0, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:mom:veteran]
      // PROVENANCE[levelBonuses:mom:veteran]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b
      case 'veteran':    return { atk: 1, ranged: 1, thrown: 1, def: 1, res: 2, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:mom:elite]
      // PROVENANCE[levelBonuses:mom:elite]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b
      case 'elite':      return { atk: 2, ranged: 2, thrown: 2, def: 1, res: 3, hp: 1, toHit: 10 };
      // STAT-FORMULA[levelBonuses:mom:ultraElite]
      // PROVENANCE[levelBonuses:mom:ultraElite]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b
      case 'ultra_elite':return { atk: 2, ranged: 2, thrown: 2, def: 2, res: 4, hp: 1, toHit: 20 };
      // STAT-FORMULA[levelBonuses:mom:champion]
      // PROVENANCE[levelBonuses:mom:champion]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b
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
      // PROVENANCE[levelBonuses:warlord:regular]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'regular':    return { atk: 1, ranged: 1, thrown: 0, def: 0, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:veteran]
      // PROVENANCE[levelBonuses:warlord:veteran]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'veteran':    return { atk: 2, ranged: 2, thrown: 1, def: 1, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:elite]
      // PROVENANCE[levelBonuses:warlord:elite]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'elite':      return { atk: 2, ranged: 2, thrown: 1, def: 2, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:ultraElite]
      // PROVENANCE[levelBonuses:warlord:ultraElite]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'ultra_elite':return { atk: 3, ranged: 3, thrown: 2, def: 3, res: 2, hp: 1, toHit: 5 };
      // STAT-FORMULA[levelBonuses:warlord:champion]
      // PROVENANCE[levelBonuses:warlord:champion]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'champion':   return { atk: 4, ranged: 4, thrown: 2, def: 5, res: 3, hp: 1, toHit: 10 };
      default:           return { atk: 0, ranged: 0, thrown: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  } else {
    switch (level) {
      // STAT-FORMULA[levelBonuses:com2:regular]
      // PROVENANCE[levelBonuses:com2:regular]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'regular':    return { atk: 1, ranged: 1, thrown: 0, def: 0, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:veteran]
      // PROVENANCE[levelBonuses:com2:veteran]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'veteran':    return { atk: 2, ranged: 2, thrown: 1, def: 1, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:elite]
      // PROVENANCE[levelBonuses:com2:elite]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'elite':      return { atk: 2, ranged: 2, thrown: 1, def: 2, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:ultraElite]
      // PROVENANCE[levelBonuses:com2:ultraElite]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'ultra_elite':return { atk: 3, ranged: 3, thrown: 1, def: 3, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:champion]
      // PROVENANCE[levelBonuses:com2:champion]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'champion':   return { atk: 3, ranged: 3, thrown: 1, def: 3, res: 2, hp: 2, toHit: 10 };
      default:           return { atk: 0, ranged: 0, thrown: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  }
}

function isMagicalRangedType(rangedType) {
  return rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s'
    || rangedType === 'beam';
}

// PROVENANCE[supremeLightEligibility]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:b1236fda671c45bc369f8550 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:23:b19d1884df8862734b87977a | TABLE=Reference docs/Script source/CoM2 1.05.11 base/RangedType.INI@span:39:8f03d3b4a323d9fa0b89b64d | TABLE=Reference docs/Script source/CoM2 1.05.11 base/RangedType.INI@span:5:cf1a2cb09950084992b45e7f | TABLE=Reference docs/Script source/Warlord 1.5.12.7/RangedType.INI@span:39:8f03d3b4a323d9fa0b89b64d | TABLE=Reference docs/Script source/Warlord 1.5.12.7/RangedType.INI@span:12:e137b286525bf5559c9b2cdb
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
  return isMagicalRangedType(rangedContext.liveRangedType)
    || unitType === 'fantastic_life' || unitType === 'normal_life'
    // The calculator's Caster flag is its representation of a nonzero mana pool.
    || hasAbil(abilities, 'caster')
    || isMagicalRangedType(rangedContext.baseRangedType);
}

// PROVENANCE[survivalInstinctEligibility]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:392fb79051e1dfb503869c27 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:b1ed625810a6547724965296
// STAT-FORMULA[survivalInstinctEligibility]
function survivalInstinctActiveForUnit(abilities, unitType, version) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'survivalInstinct')) return false;
  return !!unitType && unitType.startsWith('fantastic_');
}

// PROVENANCE[landLinkingEligibility]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:233068cc98f57fe5ee4a9d3f | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:df8d58cf51472b304559af37
// STAT-FORMULA[landLinkingEligibility]
function landLinkingActiveForUnit(abilities, unitType, version) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'landLinking')) return false;
  return !!unitType && unitType.startsWith('fantastic_');
}

// PROVENANCE[innerPowerEligibility]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:63976f145f718df520e80186
// STAT-FORMULA[innerPowerEligibility]
function innerPowerActiveForUnit(abilities, version) {
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'innerPower')) return false;
  return hasAbil(abilities, 'fireImmunity') || hasAbil(abilities, 'lightningResist');
}

// PROVENANCE[blazingEyesDoomGaze]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:c4d9140bdc468735df396fa7
// STAT-FORMULA[blazingEyesDoomGaze]
function blazingEyesDoomGazeForUnit(abilities, unitType, version) {
  const baseDoomGaze = abilVal(abilities, 'doomGaze', 0);
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'blazingEyes')) return baseDoomGaze;
  if (unitType !== 'fantastic_chaos') return baseDoomGaze;
  return baseDoomGaze > 0 ? baseDoomGaze + 1 : 3;
}

// PROVENANCE[misleadEligibility]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:29:f8b72704f1366630a616f50f
// STAT-FORMULA[misleadEligibility]
function misleadActiveForUnit(abilities, liveFantastic, version) {
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'mislead')) return false;
  return !liveFantastic;
}

// STAT-FORMULA[destinyEligibility]
// PROVENANCE[destinyEligibility]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:e90777a680ce0ccd0df5ea87
function destinyActiveForUnit(abilities, version) {
  return !!(version && version.startsWith('com2_') && hasAbil(abilities, 'destiny'));
}

// PROVENANCE[legacyUnitTypeConversions]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:30:d4e30893d832cb480ebf32b3 | Reference docs/DOS reconstructed/unitcalc.c@span:24:924a9c7939c2ac5634769450 | Reference docs/DOS reconstructed/unitcalc.c@span:38:e3a2910961158d35a5fab1ec | Reference docs/DOS reconstructed/unitcalc.c@span:19:6f6aeaf7cbc23a280cd7996e | Reference docs/DOS reconstructed/unitcalc.c@span:8:185c85844cf35c344b38d022 | Reference docs/DOS reconstructed/combat.c@span:38:1261faf60c16514c7ab3e276 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:e90777a680ce0ccd0df5ea87 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:39:4e8bdcd399e4740f3cd26f41 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:b7e9d476a7f9ec33bbaca56c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:53a2c4bd769924b58f286c8d | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:23:662a6a49c604798625ed7e49 | Reference docs/Caster binary/Spells.InitializeCombatSpellcasting.pas@span:28:deb5b65ff17f3f2812792a90 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:17:e0211f9ae323b4ad5ba16aa7 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:10:22628deef93aef7a52582f1a | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:e23e1931b3ccaf4ea86bae2e
// STAT-FORMULA[legacyUnitTypeConversions]
function determineEffectiveUnitType(baseUnitType, abilities, version, sourceIdentity = {}) {
  let unitType = baseUnitType || 'normal';
  const ccDefense = !!abilVal(abilities, 'ccDefense', false);
  const ccFireBreath = !!abilVal(abilities, 'ccFireBreath', false);
  const ccFlight = !!abilVal(abilities, 'ccFlight', false);
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  const isWarlord = version && version.startsWith('com2_warlord');
  const destinyActive = destinyActiveForUnit(abilities, version);
  const baseFantastic = typeof sourceIdentity.baseFantastic === 'boolean'
    ? sourceIdentity.baseFantastic : (baseUnitType || '').startsWith('fantastic_');
  const isHero = typeof sourceIdentity.isHero === 'boolean'
    ? sourceIdentity.isHero : baseUnitType === 'hero';

  // Source order is load-bearing. Chaos-Channels Breath runs before Warlord's early
  // UnitCalcPre hook; Fiery Fury and then Sanctify run inside that hook. Destiny and
  // the remaining compiled conversions run afterwards, so their later writes win.
  if (ccFireBreath) unitType = 'fantastic_chaos';
  if (isWarlord && hasAbil(abilities, 'fieryFury') && baseFantastic) {
    unitType = 'fantastic_chaos';
  }
  if (isWarlord && hasAbil(abilities, 'sanctify')) {
    // Sanctify always writes live race Life. Its separate Fantastic write is gated
    // to clergy which are not heroes; the compact token cannot carry a hero realm,
    // so the identity wrapper preserves that one write directly.
    if (hasAbil(abilities, 'clergy') && !isHero) unitType = 'fantastic_life';
    else if (unitType.startsWith('fantastic_')) unitType = 'fantastic_life';
    else if (!isHero) unitType = 'normal_life';
  }
  if (destinyActive) unitType = 'fantastic_life';
  if (ccFlight) unitType = 'fantastic_chaos';
  if (ccDefense) unitType = 'fantastic_chaos';
  // Warlord: Bloodlust no longer turns the unit undead, so it stays its original type.
  if (hasAbil(abilities, 'bloodLust') && !isWarlord) unitType = 'fantastic_death';
  if (hasAbil(abilities, 'blackChannels')) unitType = 'fantastic_death';
  if (hasAbil(abilities, 'undead') || hasAbil(abilities, 'animated')) unitType = 'fantastic_death';
  if (hasAbil(abilities, 'mysticSurge')) unitType = 'fantastic_unaligned';
  if (isCoMPlus && hasAbil(abilities, 'raiseDead')) unitType = 'fantastic_unaligned';

  return unitType;
}

// The realm a unit belongs to. Prefer the live identity because the compact compatibility
// token cannot represent a realm-tagged hero (notably a Sanctified Warlord hero).
// Calculator compatibility projection; not an independent source-authored formula.
function realmOfUnitType(unitType, identity = null) {
  const liveRealm = identity && {
    Life: 'life', Death: 'death', Chaos: 'chaos', Nature: 'nature',
    Sorcery: 'sorcery', Arcane: 'arcane', 'No Heal': 'unaligned',
  }[identity.race];
  if (liveRealm) return liveRealm;
  const us = String(unitType || '');
  if (us.startsWith('fantastic_')) return us.slice('fantastic_'.length);
  if (us.startsWith('normal_')) return us.slice('normal_'.length);
  return null;
}

// True for non-fantastic, non-hero units — plain 'normal' and any realm-tagged
// normal unit such as 'normal_life'. These share normal-unit behaviour for
// Weapon Immunity, Blood Lust targeting, Mislead, etc.
// Calculator compatibility projection; source-owned eligibility stays with each consumer.
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
// CoM 6.08 preserves the $2000 trait on its roster records, but D39's complete resolver shows its
// only $2000 test is dead. Its live (hits - 5) >> 1 floor is instead gated by Destruction $0020,
// so Supernatural deliberately supplies no CoM 6.08 callback.
// PROVENANCE[supernaturalMinimumDamage]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:14:802be6a30fdc261073ab86f3 | Reference docs/DOS reconstructed/combat.c@span:13:b21e0acf44cfeb8be8521eb9 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:17:f435321610de7c4db53837da | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:4:c13764d5e17557e6d5f483a4 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:5:a414079b477c39f4e9b9f6f5 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:5:a414079b477c39f4e9b9f6f5
// STAT-FORMULA[supernaturalMinimumDamage]
function supernaturalMinDamageForHits(hits, version, settings = MODERN_SUPERNATURAL_DEFAULTS) {
  if (hits <= 0 || !version) return 0;
  if (version.startsWith('com2_')) {
    const starts = Number.isFinite(settings.starts) ? settings.starts : 0;
    const ratio = Number.isFinite(settings.ratio) ? settings.ratio : 34;
    return Math.max(0, roundTiesToEven((hits - starts) * ratio / 100));
  }
  return 0;
}

function supernaturalMinDamageFn(abilities, version) {
  if (!(version && version.startsWith('com2_'))) return null;
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
// CoM 1, CoM2, and Warlord exempt heroes entirely.
//
// The DOS half is read off WIZARDS.EXE (see `Reference docs/MoM binary analysis.md`,
// *Ranged distance penalty*): one divisor byte at 0x99BB0 is 3 in MoM 1.31/CP 1.60 and
// 4 in CoM 1; Long Range clamps the step count to 1 only when it is already positive;
// and CoM 1 alone skips the whole block for heroes.
// PROVENANCE[distancePenalty]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:33:22975a3fffd0f231133eb550 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:21:b13db6265b2feaabf81fb261 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:6:791acb631b8f903c2812da35 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:3:fd8ae8fc654e2f8ef8afd276 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:6:791acb631b8f903c2812da35 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:fd8ae8fc654e2f8ef8afd276
// STAT-FORMULA[distancePenalty]
function distancePenalty(distance, rangedType, longRange, version, isHero) {
  if (rangedType !== 'missile' && rangedType !== 'boulder') return 0;
  if (version && version.startsWith('com') && isHero) return 0;
  let penalty = 0;
  if (version && version.startsWith('com2')) {
    if (distance >= 4) penalty = -10 - 3 * (distance - 4);
  } else if (version && version.startsWith('com')) {
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
// `holyBonus:aura`. A step carrying `beforeHolyArmor` runs before Holy Armor's live Defense
// threshold in modern region `c`; `afterWarp` runs after the engine's Warp Creature block
// (SPEC.md, *Warp Creature ordering*).

// `delta` names the stats the effect writes, using the record's own field names, plus two
// that stand for how the engine reaches the secondary-attack slot:
//   rtb     the shared `.ranged` slot of the DOS engines — ranged, Thrown, Breath and both
//           gaze strengths alike, which is why one write reaches all of them
//   ranged  the `unitT.ranged` field of `Caster.exe`, which is *only* the conventional ranged
//           attack: Thrown, Fire Breath, Lightning Breath and the gazes are separate fields
//           there, so a bonus written to `ranged` never reaches them
//   positiveRanged  the same conventional-ranged field, but only while its live value is
//           positive at this exact step
//   rangedOrThrown  Caster.exe's conventional-ranged and Thrown fields, excluding both
//           Breaths and every gaze field
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
    else if (field === 'ranged' || field === 'positiveRanged'
      || field === 'rangedOrThrown') writes.push('rtb');
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
        } else if (field === 'positiveRanged') {
          if ((!slots || slots.ranged) && u.rtb > 0) u.rtb += value;
        } else if (field === 'rangedOrThrown') {
          if (!slots || slots.rangedOrThrown) u.rtb += value;
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
  // Caster.exe tests Holy Armor at +0x07407. These compiled unit-enchantment blocks have
  // already written their stats there; global/combat-global effects and curses have not.
  const beforeHolyArmor = { beforeHolyArmor: true };
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
    // PROVENANCE[holyBonus:aura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:be00bc2f90338549d6e09741
    if (isCoM2) emit('holyBonus:aura', 'e', { atk: hb, def: hb, res: hb, ranged: hb });
    // PROVENANCE[holyBonus]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:355495d2e88ef940a57b8515
    else emit('holyBonus', 'a', isCoMPlus
      ? { atk: hb, def: hb, res: hb, rtb: hb }
      : { atk: hb, def: hb, res: hb });
  }

  // Animate Dead's Animated buff in CoM/CoM2: +1 to every existing attack channel,
  // +1 defense, +10% To Hit, and Weapon Immunity (RecalculateUnits $0059F7D8..$0059FBD0).
  // Weapon Immunity is added in combat flow; the stat bonuses are applied here.
  // Phase c: a spell effect with no CAS implementation.
  if (hasAbil(abilities, 'animated') && isCoMPlus) {
    // PROVENANCE[animated]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:18:c8375636d2d3d88ca4eaae97 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:28:859998a2522c86efb243689d
    emit('animated', 'c', isCoM1
      ? { atk: 1, def: 1, rtb: 1, toHit: 10 }
      : { atk: 1, def: 1, nonGazeRtb: 1, toHit: 10 }, beforeHolyArmor);
  }

  // Resistance to All: +X to resistance.
  // CoM2/Warlord feed it into **aura type 3 in region `e`** — the Prayermaster aura — so it
  // runs after `d` and after the Warps, and competes with Prayermaster by maximum rather than
  // stacking with it (CoM2 analysis, *The aura pass*). MoM and CoM 1 keep phase a: intrinsic
  // ability, no CAS, no aura pass.
  const isModern = !!(version && version.startsWith('com2_'));
  const auraValue = key => Math.max(0, parseInt(abilVal(abilities, key, 0), 10) || 0);

  // Aura type 2: current positive conventional Ranged only.
  const guidingBeaconAura = isModern ? auraValue('guidingBeaconAura') : 0;
  if (guidingBeaconAura > 0) {
    // PROVENANCE[guidingBeaconAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:abd8cf46993fffbdb3811617
    emit('guidingBeaconAura', 'e', { positiveRanged: guidingBeaconAura });
  }

  // Aura type 3 is shared by Resistance to All and Prayermaster. BuildAuraTable keeps the
  // maximum per owner/type, so the two sources compete rather than stack.
  const rta = abilVal(abilities, 'resistanceToAll', 0);
  const prayermasterAura = isModern ? Math.max(rta, auraValue('prayermasterAura')) : 0;
  if (prayermasterAura > 0) {
    // PROVENANCE[resistanceToAll:aura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:77eb7e2f668ac3b092fa3b7d
    emit('resistanceToAll:aura', 'e', { res: prayermasterAura },
      { sourceId: 'prayermasterAura', sourceLabel: 'Prayermaster / Resistance to All' });
  } else if (rta > 0) {
    // PROVENANCE[resistanceToAll]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:355495d2e88ef940a57b8515
    emit('resistanceToAll', 'a', { res: rta });
  }

  const divineBarrierAura = isModern ? auraValue('divineBarrierAura') : 0;
  if (divineBarrierAura > 0) {
    // PROVENANCE[divineBarrierAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:39:df43d1668aa163cfcd4ab77e
    emit('divineBarrierAura', 'e', { def: divineBarrierAura });
  }

  const soulLinkerAura = isModern ? auraValue('soulLinkerAura') : 0;
  if (soulLinkerAura > 0 && identityPredicates.liveFantastic) {
    // PROVENANCE[soulLinkerAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:044e08011083c94abc942c1b
    emit('soulLinkerAura', 'e', { toHit: soulLinkerAura, toBlk: soulLinkerAura });
  }

  const leadershipAura = isModern ? auraValue('leadershipAura') : 0;
  if (leadershipAura > 0 && !identityPredicates.liveFantastic) {
    // PROVENANCE[leadershipAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:1ec384f5af2fc785c3b46a8e
    steps.push(statStep({ id: 'leadershipAura', phase: 'e', writes: ['atk', 'rtb'],
      apply: (u, ctx) => {
        const slots = ctx && ctx.slots;
        if (!slots || slots.melee) u.atk += leadershipAura;
        if ((!slots || slots.ranged) && u.rtb > 0
            && (u.rangedType === 'missile' || u.rangedType === 'boulder')) {
          u.rtb += Math.trunc(leadershipAura / 2);
        }
      } }));
  }

  // Lucky: +10% To Hit, +10% To Block, +1 Resistance.
  // The v1.31 enemy melee penalty (-10% To Hit) is applied in resolveCombat.
  // Permanent and early-hook sources establish the Lucky ability flag. The actual stat write
  // is the compiled `+0x044C7` block in region c and does not stack regardless of flag source.
  if (hasAbil(abilities, 'lucky')) {
    // PROVENANCE[lucky]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:bf74c9101f80f286adb7d2a0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:761ca75657bf39dc15095e55
    // Creation/enchantment sources establish ALucky earlier, but the chance/stat write itself
    // is the compiled Lucky block in region c for every engine.
    emit('lucky', 'c', { res: 1, toHit: 10, toBlk: 10 }, beforeHolyArmor);
  }

  // Lucky Star's aura: while any friendly unit in the combat carries the enchantment, every
  // friendly unit — the enchanted one included — gets phase-b +1 melee/ranged/armor/resistance
  // (UnitCalcPre.CAS:1020,1611-1623). Multiple copies do not stack; the scan counts them but
  // the grant is gated on a non-zero count. The separate Lucky grant at UnitCalcPre.CAS:1147
  // reaches only the enchanted unit, so it is the plain `lucky` control, not this one.
  // The loop-variable bug that confined the aura to the enchanted unit was fixed in 1.5.12.6.2.
  if (version && version.startsWith('com2_warlord') && hasAbil(abilities, 'luckyStar')) {
    // PROVENANCE[luckyStar]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:2cd8ef385c4ba4e42016a04d
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
    // PROVENANCE[highPrayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:25:9e2e521e9eba230ae2bc6977 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:1211c780f887c8558d60d073
    emit('highPrayer', 'c', { atk: 2, def: 2, res: 3, toHit: 10, toBlk: 10 });
    if (hasPrayer && version && version.startsWith('com2_warlord')) {
      // PROVENANCE[prayer:warlordStack]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:cd3b7dd8d55f06aacde8812c
      emit('prayer:warlordStack', 'b', { atk: 1, def: 1, res: 1 });
    }
  } else if (hasPrayer) {
    // PROVENANCE[prayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:19:ff7bdd24b7f56fef70abb02b | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:22:b3cdb6f87df741fb103a6989
    emit('prayer', 'c', { res: 1, toHit: 10, toBlk: 10 });
  }

  // Black Prayer (debuff): -1 all conventional attack strengths, -1 Defense, -2 Resistance.
  // Phase c — curse with no CAS implementation.
  if (hasAbil(abilities, 'blackPrayer')) {
    // PROVENANCE[blackPrayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:17:6726e65e7d4815dc6beb7e5a | Reference docs/DOS reconstructed/unitcalc.c@span:17:7bda7e6636c6c0560ea2ecee | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:57700011d70aa83ec35b9eaa
    emit('blackPrayer', 'c', version && version.startsWith('com2_')
      ? { atk: -1, def: -1, res: -2, nonGazeRtb: -1 }
      : { atk: -1, def: -1, res: -2, rtb: -1 });
  }

  // Reinforce Magic: CoM2 global enchantment. All units gain +2 resistance.
  // The +2 magical ranged attack strength bonus is type-conditional and handled in stats.js.
  // Phase c — global enchantment with no CAS implementation.
  if (hasAbil(abilities, 'reinforceMagic') && version && version.startsWith('com2_')) {
    // PROVENANCE[reinforceMagic]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:c46cf0a067fb9eff1afc4064
    emit('reinforceMagic', 'c', { res: 2 });
  }

  // Inner Power: CoM2 global enchantment. Units with Fire Immunity or Lightning Resist
  // gain +3 to all attack strengths, +2 defense, and +2 resistance. Eligibility is
  // resolved by innerPowerActiveForUnit so the checkbox can remain visible without
  // affecting other units.
  // Phase c: UnitCalcPre.CAS:1743-1749 grants only Mountaineer — the stat bonuses are binary.
  if (hasAbil(abilities, 'innerPower')) {
    // PROVENANCE[innerPower]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:cb6a5d278f05325e495f0d20
    emit('innerPower', 'c', { atk: 3, def: 2, res: 2, rtb: 3 });
  }

  // Mislead/Liability supplies Misfortune aura type 10. The checkbox represents the current
  // unit receiving that aura; its live non-Fantastic gate is resolved by misleadActiveForUnit.
  // The engine applies all four writes atomically in region e after the terminal clamps. Its
  // ranged write tests the persistent conventional-ranged slot, represented by the narrow
  // `ctx.slots.persistentRanged` gate, so Thrown and Breath are unaffected without changing
  // the calculated-channel gate shared by other ability steps.
  if (hasAbil(abilities, 'mislead')) {
    // PROVENANCE[mislead]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:bc3d65175e46c59dd1bcbd1f
    steps.push(statStep({ id: 'mislead', phase: 'e', writes: ['atk', 'def', 'res', 'rtb'],
      apply: (u, ctx) => {
        u.atk -= 1;
        u.def -= 1;
        u.res -= 1;
        if (!ctx || !ctx.slots || ctx.slots.persistentRanged) u.rtb -= 1;
      } }));
  }

  // Stone Skin / Iron Skin: +1 / +5 Defense. Iron Skin supersedes Stone Skin.
  // Both phase c. UnitCalc.CAS:6-9 looks like a Stone Skin implementation but sits inside
  // the file's `Example - ... End of Example` header comment; UnitCalcPre.CAS:456/661 only
  // set the Iron Skin flag. Neither applies a stat.
  if (hasAbil(abilities, 'ironSkin')) {
    // PROVENANCE[ironSkin]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:7157204464b034c8f40530d5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:5:1e9389176cf9e793db19626f
    emit('ironSkin', 'c', { def: 5 }, beforeHolyArmor);
  } else if (hasAbil(abilities, 'stoneSkin')) {
    // PROVENANCE[stoneSkin]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:e6801f056adc81573e92ef9b
    emit('stoneSkin', 'c', { def: 1 }, beforeHolyArmor);
  }

  // Holy Armor: handled in stats.js (version- and stat-conditional).

  // Lionheart: +3 Melee Attack (only if base > 0 — the melee slot gate discards it otherwise),
  // +3 Resistance. RTB bonus (non-magic ranged/thrown only) and HP bonus
  // (version/figs-dependent) are the `lionheart:rangedHp` step in stats.js.
  // Phase c — spell with no CAS implementation.
  if (hasAbil(abilities, 'lionheart')) {
    // PROVENANCE[lionheart]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:0e597d1ff73a00332d952e72 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:87ae0c5af5c55a4b1df9577b
    emit('lionheart', 'c', { atk: 3, res: 3 }, beforeHolyArmor);
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
    // PROVENANCE[flameBlade]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:15:f6e8770f05c1d997df898eec | Reference docs/DOS reconstructed/unitcalc.c@span:13:bf6a11bc7e2e0a1492be8f9a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:43a163f18b24d003ce1baa22 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:3:a6c1282e7bba499b7b5ef5f3 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:d7cdec7c168e641613b36c19
    emit('flameBlade', 'c', { atk: version && version.startsWith('com') ? 3 : 2 }, beforeHolyArmor);
  } else if (hasAbil(abilities, 'metalFires') && !identityPredicates.liveFantastic) {
    // PROVENANCE[metalFires]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:8c88e810ad0fd6705c30bb95
    emit('metalFires', 'c', { atk: 1 }, beforeHolyArmor);
  }

  // Blazing March: CoM/CoM2 combat enchantment. +3 melee attack to all units.
  // The missile bonus (+3, thrown too in Warlord) is type-conditional and handled in stats.js.
  // MODDING.INI confirms all four magnitudes, breath included: BlazingMarchAttackBonus=3,
  // MissileRangedBonus=3, BreathBonus=0 both versions, ThrownBonus 0 (CoM2) / 3 (Warlord).
  // Phase c — no CAS implementation.
  if (hasAbil(abilities, 'blazingMarch')) {
    // PROVENANCE[blazingMarch]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:31:d2ba78de4b00594fb355f0e5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:88f3514b127f13fa92f35d8e | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:4:948215fe7c75f15252145bd4 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:4:2e38314c2c8fd875465a75dd
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
      // PROVENANCE[breakthrough:normal]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:3ca5011dcfb4738952b30067 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:8:06d8d5bae6b5fee3340ddf09 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:8:06d8d5bae6b5fee3340ddf09
      emit('breakthrough:normal', 'c', { atk: 1 });
    }
    // PROVENANCE[breakthrough:noncorporeal]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:fa4543aa4289101fada66dad
    if (nonCorporeal) emit('breakthrough:noncorporeal', 'c', { atk: 1, def: 1 });
    // PROVENANCE[breakthrough:combatSummoned]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:0f491fbb9d925602e7b57300
    if (combatSummoned) emit('breakthrough:combatSummoned', 'c', { atk: 1, def: 1 });
  }

  // Giant Strength: +1 melee attack. +1 thrown bonus is `giantStrength:thrown` in stats.js
  // (thrown only, not missile).
  // Phase c — spell with no CAS implementation. (CreateUnit.CAS:552-554's SGiantStrength is
  // the Natural Selection coal-ore grant, a different effect, handled in stats.js.)
  if (hasAbil(abilities, 'giantStrength')) {
    // PROVENANCE[giantStrength]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:12:d3b7235f7b74f0d7c75b9b2f
    emit('giantStrength', 'c', { atk: 1 }, beforeHolyArmor);
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
    // PROVENANCE[chaosChannels:armor]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:7:bd2b6b86ac7fbcc85505a039 | Reference docs/DOS reconstructed/unitcalc.c@span:13:55dbda9953bbaf8f2f1bb81f | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:490bf1c3cfe8b5827cde324a
    emit('chaosChannels:armor', 'c', { def: (version === 'mom_1.31') ? 6 : 3 }, beforeHolyArmor);
  }

  // Black Channels: +2 melee attack (discarded by the melee slot gate when the unit has none),
  // +1 all ranged/thrown/breath/gaze,
  // +1 defense, +1 resistance, +1 HP per figure. Death realm; MoM only.
  // Phase c — MoM-only enchantment, so there is no CAS to consult.
  if (hasAbil(abilities, 'blackChannels')) {
    // PROVENANCE[blackChannels]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:19:4a92e2a9611b35504558f854
    emit('blackChannels', 'c', { atk: 2, def: 1, res: 1, hp: 1, rtb: 1 }, beforeHolyArmor);
  }

  // Weakness: -2 (MoM) or -3 (CoM/CoM2) melee attack. RTB penalty is type-specific — the
  // `weakness:ranged` and `weakness:breath` steps in stats.js.
  // Phase c for the melee penalty — Warlord's UnitCalc.CAS:309-315 adds only the -3 to
  // fire/lightning breath (phase d, applied in stats.js).
  if (hasAbil(abilities, 'weakness')) {
    // PROVENANCE[weakness]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:28:51bb7b42de5195f9edf69a86 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:e4cfc8d10fb6c6beee42bb6f
    emit('weakness', 'c', { atk: version && version.startsWith('com') ? -3 : -2 });
  }

  // Rust (Warlord): -3 melee attack. The matching -3 to physical ranged (missile/boulder),
  // weapon stripping, thrown removal, and Large Shield removal are handled in stats.js.
  // Phase d — UnitCalc.CAS:492-504.
  if (version && version.startsWith('com2_warlord') && hasAbil(abilities, 'rust')) {
    // PROVENANCE[rust]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:10:98745d26b4fbf74694b1a932
    emit('rust', 'd', { atk: -3 });
  }

  // Mind Storm: DOS: -5 melee, -5 to the shared ranged/Thrown/Breath/Gaze slot,
  // -5 defense, -5 resistance. CoM2/Warlord: -3 melee, -5 conventional ranged and
  // Thrown only, -5 defense, -5 resistance; both Breath fields and all gazes are separate.
  // Phase c: UnitCalcPre.CAS:1221-1223 only mirrors the combat flag to overland.
  if (hasAbil(abilities, 'mindStorm')) {
    // PROVENANCE[mindStorm]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:5aef6d0a81b854a2f8a97a63 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:b93fe4b2bed30f6662144a8f
    emit('mindStorm', 'c', version && version.startsWith('com2')
      ? { atk: -3, def: -5, res: -5, rangedOrThrown: -5 }
      : { atk: version && version.startsWith('com') ? -3 : -5,
        def: -5, res: -5, rtb: -5 });
  }

  // Supreme Light is not built here. The engine writes its three stats as one block whose
  // defence component is a live read of Resistance, so it is one step in stats.js —
  // `supremeLight` in region `e` for CoM2/Warlord, `supremeLight:coM1` after CoM 1's Warp.

  // Survival Instinct: CoM/CoM2 global enchantment. Applies only to fantastic creatures;
  // eligibility is resolved by survivalInstinctActiveForUnit using the effective combat unit type.
  // Phase c — no CAS implementation in either calc file.
  if (hasAbil(abilities, 'survivalInstinct')) {
    // PROVENANCE[survivalInstinct]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:b1ed625810a6547724965296
    emit('survivalInstinct', 'c', { def: 1, res: 2, toHit: 10 });
  }

  // Guardian retort: CoM/CoM2 units gain +1 resistance, +10% To Hit,
  // and +10% To Defend.
  // Region c at +0x0B092 ("Guardian retort while defending a settlement"), not the a the
  // pre-map judgment gave it. UnitCalcPre.CAS:326-328 grants only a hero ability to
  // Marionettes, so Warlord adds nothing and inherits the position. Nothing between a and c
  // reads Resistance, To Hit or To Defend, so this is faithful without being observable.
  if (hasAbil(abilities, 'guardian') && isCoMPlus) {
    // PROVENANCE[guardian]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:db312d02daf8f891ea293893 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:1687b0fe505cf275355adb4e
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
      // PROVENANCE[tactician:heroDynamic]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:17:74a62c399fece2ea93dcbdc3 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:27:69075629fb02a3678e0526aa
      emit(id, 'c', isCoM1
        ? { atk: 2, def: 2, res: 2, rtb: 2 }
        : { atk: 2, def: 2, res: 2, positiveRanged: 2 }, afterWarp);
      if (isWarlord) {
        // PROVENANCE[tactician:warlordClawback]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:15:e1a9888013d858dd0217c1a9
        emit('tactician:warlordClawback', 'b', { atk: -2, def: -1, res: -2, ranged: -2 });
      }
    } else {
      // STAT-FORMULA[tactician:nonheroDynamic]
      // PROVENANCE[tactician:nonheroDynamic]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:17:74a62c399fece2ea93dcbdc3 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:27:69075629fb02a3678e0526aa
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
    // PROVENANCE[favoredTerrain]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:29:8a7eccc577a846564d7742f8
    emit('favoredTerrain', 'd', { def: 1 * mult, toHit: 5 * mult });
  }

  // Land Linking: CoM/CoM2 grants +2 melee, breath, and defense to fantastic units.
  // Breath is handled in stats.js.
  // Phase c: UnitCalcPre.CAS:889 is the separate Nature Link upgrade (+1 resistance),
  // not this bonus.
  if (hasAbil(abilities, 'landLinking')) {
    // PROVENANCE[landLinking]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:3fa8c2fabf80e91cf859f9b0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:df8d58cf51472b304559af37
    emit('landLinking', 'c', { atk: 2, def: 2 }, beforeHolyArmor);
  }

  // Mystic Surge: +2 Defense, -2 Resistance. The unaligned-fantastic conversion is in
  // determineEffectiveUnitType and the -10% To Block in resolveCombat
  // (MODDING.INI MysticSurgeToDefPenalty=10, both versions).
  // Phase c — SpellMysticSurge.CAS sets enchantment flags only; no stat application.
  if (hasAbil(abilities, 'mysticSurge')) {
    // PROVENANCE[mysticSurge]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:8:185c85844cf35c344b38d022 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:de8c9dc3bc0bf7ec94ba9028
    emit('mysticSurge', 'c', { def: 2, res: -2 }, beforeHolyArmor);
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
    // PROVENANCE[armorclad]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:4:f33e8912a11fbfe562941d50
    emit('armorclad', 'base', { def: 6 });
  }

  // Battle Armor is the in-combat regular non-mechanical branch of the
  // Armorclad reform. UnitCalcPre.CAS:1106-1113 applies +3 Defense.
  if (isWarlord && hasAbil(abilities, 'battleArmor')) {
    // PROVENANCE[battleArmor]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:c7c2d7da26a07332de4fa4f3
    emit('battleArmor', 'b', { def: 3 });
  }

  // Magitek Engineering applies in UnitCalcPre.CAS to Power Engine units.
  // The reform grant helper has already derived `magitekEngine` and Large Shield.
  if (isWarlord && hasAbil(abilities, 'magitekEngine')) {
    // PROVENANCE[magitekEngine]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:8:d96a238f19276a8e5adea472
    emit('magitekEngine', 'b', { toBlk: 20 });
  }

  if (isWarlord && hasAbil(abilities, 'artificer') && hasAbil(abilities, 'mechanical')) {
    // PROVENANCE[artificer]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:12:bcf7fbdc48f5aef331e51d9d
    emit('artificer', 'base', { atk: 1, def: 1, res: 2, rtb: 1 });
  }

  // Mechanical Expert (Warlord): an Engineer/Combat Engineer in the stack carries this
  // perk, granting mechanical units +20% To Hit and +10% To Defend.
  // Phase d — UnitCalc.CAS:275-309.
  if (isWarlord && hasAbil(abilities, 'mechanicalExpert') && hasAbil(abilities, 'mechanical')) {
    // PROVENANCE[mechanicalExpert]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:31:5cf138553247cd4344245e09
    emit('mechanicalExpert', 'd', { toHit: 20, toBlk: 10 });
  }

  // Rebuild (Warlord): +2 melee and +2 armor. Mechanical flag, Death/Illusion
  // Immunity, and Armor Piercing are granted in normalizeCombatUnit.
  // The two unit classes are handled by deliberately ISHERO-complementary code, in
  // different phases. Non-heroes: OLSpell.CAS:260-267 writes both stats at index 1
  // (ABase) when the spell is cast, so it is baked into the base stage.
  // Heroes: UnitCalcPre.CAS:682-691 re-applies them at index 0 on every recalc — phase b.
  if (isWarlord && hasAbil(abilities, 'rebuild')) {
    // PROVENANCE[rebuild]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS@span:13:cd5b95676a7928d0fa134508 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:8:ff5769532c07ec8df9389ec0
    emit('rebuild', abilVal(abilities, 'unitType', 'normal') === 'hero' ? 'b' : 'base',
      { atk: 2, def: 2 });
  }

  // Malnourished (Warlord): recruited under a Drought curse — permanent −1 melee, −2 armor.
  // Base stage: CreateUnit.CAS:614-618 writes both at index 1 (ABase).
  if (isWarlord && hasAbil(abilities, 'malnourished')) {
    // PROVENANCE[malnourished]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:5:66825b694152a9b945a1d0b6
    emit('malnourished', 'base', { atk: -1, def: -2 });
  }

  // Spirit Link (Warlord, Conjurer signature): +2 Resistance. OLSpell.CAS writes the bonus
  // permanently to ABase when the spell lands, before the encounter-time pipeline. Its later
  // non-fantastic targeting status is handled at the target-gating sites; the phase-c EncMagic
  // write deliberately survives that phase-d identity change.
  if (isWarlord && hasAbil(abilities, 'spiritLink')) {
    // PROVENANCE[spiritLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS@span:10:33b04c988e4846d5dfe6cfbd
    emit('spiritLink', 'base', { res: 2 });
  }

  // Rally (Warlord, Charismatic retort exclusive combat enchantment): all friendly
  // units gain +2 Resistance until the end of combat.
  // Phase b — UnitCalcPre.CAS:1499-1504 (labelled "Rousing Speech" in the script).
  if (isWarlord && hasAbil(abilities, 'rally')) {
    // PROVENANCE[rally]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:489ddb7eb9cdcfbb11f54431
    emit('rally', 'b', { res: 2 });
  }

  // Dishearten Prophesy (Warlord, Astrologer retort exclusive city curse): garrison
  // units defending the cursed city suffer -2 Resistance in combat. Only the
  // resistance debuff is modeled (the +4 city unrest is outside this calculator).
  // Phase b — UnitCalcPre.CAS:1630-1633.
  if (isWarlord && hasAbil(abilities, 'disheartenProphecy')) {
    // PROVENANCE[disheartenProphecy]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:dff452481f1564630c441f62
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
function exorciseFailProb(defRes, defAbilities, defUnitType, modifier, version) {
  if (hasAbil(defAbilities, 'spiritLink')) return 0;
  if (!String(defUnitType || '').startsWith('fantastic_')) return 0;
  // CoM 6.08's common 0x0800 flag retains the executable-table name Dispel Evil,
  // but the version-specific consumer ignores Spec_Att_Attrib and uses literal -3.
  // Its persistent-unit Spell Lock bit skips the resistance call altogether.
  if (version === 'com_6.08' && hasAbil(defAbilities, 'spellLock')) return 0;
  const basePenalty = version === 'com_6.08' ? 3 : -modifier;
  const penalty = basePenalty + (isCreatedUndeadTarget(defUnitType, defAbilities) ? 3 : 0);
  return fantasticResistKillFailProb(defRes, defAbilities, penalty);
}

// --- Destruction ---
// CoM2 and Warlord only. Each surviving attacking figure makes one resistance-roll
// attempt inside ApplyAttack's figure loop. Any failed attempt assigns 150 to the
// engine's destruction result bucket, which destroys the whole target unit after the
// calculator's remaining-HP cap; repeated failures do not add or multiply that 150.
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

// ApplyDamageSpell adjusts the returned damageT after DamageSpell has selected its category.
// The tests are strictly ordered and mutually exclusive, so one positive record gains exactly
// one point even if more than one field is positive. A wholly non-positive record is unchanged.
// STAT-FORMULA[applyDamageSpellAmplifier]
// PROVENANCE[applyDamageSpellAmplifier]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Spells.DamageSpells.pas@span:10:7409aeb6eaa969da9307bc69 | Reference docs/Caster binary/Combat.AmplifiedDamage.pas@span:26:1f64b59e444155839ce664c8
function applyDamageSpellAmplifier(damageRecord, amplified) {
  const adjusted = {
    normal: damageRecord.normal,
    irrec: damageRecord.irrec,
    undead: damageRecord.undead,
  };
  if (!amplified) return adjusted;
  if (adjusted.normal > 0) adjusted.normal += 1;
  else if (adjusted.irrec > 0) adjusted.irrec += 1;
  else if (adjusted.undead > 0) adjusted.undead += 1;
  return adjusted;
}

// Shared direct-spell damage path for Immolation and Wall of Fire. The modern engine exits
// on Magic Immunity before inspecting Black Sleep. Black Sleep then turns the spell into Doom
// damage. Modern Area iterations use a full HP-per-figure cap. A non-Area spell instead uses the
// ordinary attack spill loop: the wounded top figure supplies the first boundary, and every
// crossed boundary rerolls Defense and reapplies Invulnerability before the remainder continues.
// STAT-FORMULA[damageSpellResolution]
// PROVENANCE[damageSpellResolution]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Spells.DamageSpells.pas@span:8:678a9503cf9c8ef4b13b7642 | Reference docs/Caster binary/Spells.DamageSpells.pas@span:23:c169d74794484ec3c2d57202 | Reference docs/Caster binary/Spells.DamageSpells.pas@span:34:6c7e183574c858090c5884e5 | Reference docs/Caster binary/Spells.DamageSpells.pas@span:10:7409aeb6eaa969da9307bc69 | Reference docs/Caster binary/Combat.AmplifiedDamage.pas@span:26:1f64b59e444155839ce664c8
function calcDamageSpellDist(targetFigs, atkStr, toHit, defStr, toBlock, hp, cap,
  invulnBonus, minDamageFromHits, topFigHP, version, targetAbilities,
  area = true, nonmagic = false, amplified = false) {
  const modern = !!(version && version.startsWith('com2_'));
  if (modern && hasAbil(targetAbilities, 'magicImmunity') && !nonmagic) return [1];
  let dist;
  if (modern && hasAbil(targetAbilities, 'blackSleep')) {
    dist = area
      ? calcDoomDist(targetFigs, Math.min(atkStr, hp), cap)
      : calcDoomDist(1, atkStr, cap);
  } else if (area) {
    const areaTopFigHP = modern ? undefined : topFigHP;
    dist = calcAreaDamageDist(targetFigs, atkStr, toHit, defStr, toBlock, hp, cap,
      invulnBonus, minDamageFromHits, areaTopFigHP);
  } else {
    dist = calcTotalDamageDist(1, atkStr, toHit, defStr, toBlock, hp, cap,
      invulnBonus, 0, false, topFigHP, minDamageFromHits);
  }

  // Wall of Fire routes its DamageSpell result through the normal category. Keep the category
  // adjustment explicit here so this total-damage projection uses ApplyDamageSpell's exact
  // normal -> irrecoverable -> undead priority instead of an equivalent but category-blind shift.
  if (!amplified) return dist;
  const adjusted = new Array(cap + 1).fill(0);
  for (let damage = 0; damage < dist.length; damage++) {
    if (dist[damage] < 1e-15) continue;
    const damageRecord = applyDamageSpellAmplifier(
      { normal: damage, irrec: 0, undead: 0 }, amplified,
    );
    const adjustedDamage = damageRecord.normal + damageRecord.irrec + damageRecord.undead;
    adjusted[Math.min(cap, adjustedDamage)] += dist[damage];
  }
  return adjusted;
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
// PROVENANCE[rageEffectiveAttack]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:13:325ede6460c3b3ea9b78f8a2
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
// PROVENANCE[weaponImmunityEffectiveDefense]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:25:3a05783701e4dc0bb3997f01 | Reference docs/DOS reconstructed/combat.c@span:25:cd4c8b870408c2f3ef541b72 | Reference docs/DOS reconstructed/combat.c@span:9:091e1f3c04458619a8eb1828 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:12:579afca0c054420752f52644 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:64343218ebddfe0d2454f929 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:8c99d740dfd473b21f906b13 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:4c279bb027bcde85badd90e7
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
// PROVENANCE[missileImmunityEffectiveDefense]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:4:7631b0118223ca1089ef4ce6 | Reference docs/DOS reconstructed/combat.c@span:25:cd4c8b870408c2f3ef541b72 | Reference docs/DOS reconstructed/combat.c@span:7:3ca39d47d348cb2363d68c06 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:1:e432b988437369fabb54b4c5
function missileImmunityDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'missileImmunity')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Fire Immunity ---
// Raises defense against Fire Breath and Immolation damage. MoM: 50. CoM/CoM2: 100.
// Applied after armor piercing and weapon immunity.
// STAT-FORMULA[fireImmunityEffectiveDefense]
// PROVENANCE[fireImmunityEffectiveDefense]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:3:88dfe5adc853afc5bfed6290 | Reference docs/DOS reconstructed/combat.c@span:25:cd4c8b870408c2f3ef541b72 | Reference docs/DOS reconstructed/combat.c@span:7:3ca39d47d348cb2363d68c06 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:4803e9b487f6f1a1cb49bdaa
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
// PROVENANCE[righteousnessEffectiveDefense]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/combat.c@span:10:8b80214da56946e4a9fbfbdd | Reference docs/DOS reconstructed/combat.c@span:8:66077c35eb258dac5ab28d94 | Reference docs/DOS reconstructed/combat.c@span:7:3ca39d47d348cb2363d68c06
function righteousnessDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'righteousness')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Magic Immunity (defense) ---
// Raises defense against magic ranged attacks and the DOS Immolation/Wall-of-Fire spell path.
// MoM: defense set to 50. CoM/CoM2: defense set to 100. Modern direct spell damage separately
// exits before rolling; its computed defense value is therefore redundant for Immolation/WoF.
// Applied after other defense modifiers; overrides Fire Immunity and Righteousness if higher.
// STAT-FORMULA[magicImmunityEffectiveDefense]
// PROVENANCE[magicImmunityEffectiveDefense]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:17:7ad26f1791d700f7e217ba27 | Reference docs/DOS reconstructed/combat.c@span:7:3ca39d47d348cb2363d68c06 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:1:70abb44002337f3267802332
function magicImmunityDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'magicImmunity')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Immolation ---
// Immolation strength: 4 in MoM, 10 in CoM/CoM2. The modern DamageSpell path applies
// Chaos Conjunction's exact extended-real 1.34 multiplier and Delphi Trunc conversion
// to spell ID 99. Wall of Fire is spell ID 87 and does not use this helper.
// Delivered as a Fireball effect (spell 96) with an explicit strength override:
// WIZARDS.EXE 0x99D5E pushes 4 in both MoM builds, CoM 1's 0x99D50 pushes 10.
// STAT-FORMULA[immolationStrength]
// PROVENANCE[immolationStrength]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:38:88b87d43f6f27bfce4600ec3 | Reference docs/DOS reconstructed/combat.c@span:9:932433dee123be7e2cfc4a2c | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:6:61977524faa49301ba9b8fa3 | Reference docs/Caster binary/Spells.DamageSpells.pas@span:3:d7f972d281da4e1635757ec7 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:3:5caa7f065c55dac1ccd2d5c1 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:3:5caa7f065c55dac1ccd2d5c1
function immolationStr(version, chaosConjunction = false) {
  const modern = !!(version && version.startsWith('com2_'));
  const base = (version && (version.startsWith('com_') || modern)) ? 10 : 4;
  return modern && chaosConjunction ? Math.trunc(base * 1.34) : base;
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
// Magic Immunity raises defense to 50 in MoM and 100 in CoM 1; modern DamageSpell exits before
// rolling. Fire Immunity and Righteousness also raise defense to 50/100. Large Shield and AP apply.
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
// PROVENANCE[wallOfFireStrength]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:7:ff40688656520f07bf1f3557 | Reference docs/DOS reconstructed/combat.c@span:9:932433dee123be7e2cfc4a2c | Reference docs/DOS reconstructed/spelldat.c@span:30:33d3c975302b2b73b0595bca | TABLE=Reference docs/Script source/CoM2 1.05.11 base/SPELLS.INI@span:12:85344419a06ccdd501b45c67 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/SPELLS.INI@span:17:760d893e17440a46164523c2
function wallOfFireStr(version) {
  if (version && version.startsWith('com2_warlord')) return 12;
  if (version && (version.startsWith('com_') || version.startsWith('com2_'))) return 10;
  return 5;
}

// Wall of Fire To Hit: standard 30% spell To Hit, except Warlord raises it to 60%.
// STAT-FORMULA[wallOfFireToHit]
// PROVENANCE[wallOfFireToHit]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=TABLE=Reference docs/Script source/CoM2 1.05.11 base/SPELLS.INI@span:12:85344419a06ccdd501b45c67 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/SPELLS.INI@span:17:760d893e17440a46164523c2
function wallOfFireToHit(version) {
  return (version && version.startsWith('com2_warlord')) ? 0.6 : 0.3;
}

// Warlord removes Wall of Fire's Area flag, selecting one ordinary spill-capable attack.
// STAT-FORMULA[wallOfFireAreaShape]
// PROVENANCE[wallOfFireAreaShape]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=TABLE=Reference docs/Script source/CoM2 1.05.11 base/SPELLS.INI@span:12:85344419a06ccdd501b45c67 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/SPELLS.INI@span:17:760d893e17440a46164523c2
function wallOfFireSingleFigure(version) {
  return !!(version && version.startsWith('com2_warlord'));
}

// FirewallEffect reads the calculated Teleporting/Merging fields through HasTeleMerge.
// STAT-FORMULA[wallOfFireEligibility]
// PROVENANCE[wallOfFireEligibility]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.CallClosureHelpers.pas@span:6:39bf9c419009b48c27e6c076
function wallOfFireEligible(version, attackerAbilities) {
  return !(version && version.startsWith('com2_')
    && (hasAbil(attackerAbilities, 'teleporting') || hasAbil(attackerAbilities, 'merging')));
}

// The two-card projection treats Card B as the present opposing-owner unit in AmplifiedDamage's
// combat scan. Copies do not stack because this result is Boolean.
// STAT-FORMULA[wallOfFireAmplifierProjection]
// PROVENANCE[wallOfFireAmplifierProjection]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Spells.DamageSpells.pas@span:10:7409aeb6eaa969da9307bc69 | Reference docs/Caster binary/Combat.AmplifiedDamage.pas@span:26:1f64b59e444155839ce664c8
function wallOfFireAmplified(version, opposingAbilities) {
  return !!(version && version.startsWith('com2_warlord_'))
    && hasAbil(opposingAbilities, 'amplifier');
}

// --- Cause Fear ---
// Probability of a single figure failing its fear resistance roll.
// MoM: no resistance modifier. CoM/CoM2: -3 resistance modifier.
// Death Immunity skips the roll outright rather than granting resistance. In CoM2/Warlord,
// this direct gate reads the persistent BaseUnits record; calculated Death Immunity still
// proceeds to the roll. The older engines use their effective ability record here.
// The modern caller has already run GetEffectiveResistance, including Magic Immunity's
// assignment to 100. The older engines still apply their additive Magic-Immunity bonus here;
// Righteousness remains an attack-specific additive bonus in every version.
function fearFailProb(defRes, defAbilities, version, baseDeathImmunity) {
  const isCoM = version && version.startsWith('com');
  const isModern = version && version.startsWith('com2');
  const modifier = isCoM ? -3 : 0;
  const directDeathImmunity = isModern && baseDeathImmunity != null
    ? !!baseDeathImmunity
    : hasAbil(defAbilities, 'deathImmunity');
  if (directDeathImmunity) return 0;
  const bonus = (!isModern && hasAbil(defAbilities, 'magicImmunity') ? 30 : 0)
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

// Convert the combat PMF over active (unfeared) figures into the UI PMF over
// feared figures for the same ApplyAttack call.
function fearedCountDist(activeDist, maxFigs) {
  if (!activeDist) return [1];
  const result = new Array(Math.max(0, maxFigs) + 1).fill(0);
  for (let active = 0; active < activeDist.length; active++) {
    const probability = activeDist[active] || 0;
    if (probability < 1e-15) continue;
    result[Math.max(0, maxFigs - active)] += probability;
  }
  return result;
}

function addWeightedDist(target, source, weight) {
  if (!source || weight < 1e-15) return;
  while (target.length < source.length) target.push(0);
  for (let i = 0; i < source.length; i++) target[i] += weight * (source[i] || 0);
}

function addWeightedFearSamples(target, samples, weight) {
  const actual = samples && samples.length ? samples : [[1]];
  while (target.length < actual.length) target.push([]);
  for (let i = 0; i < actual.length; i++) addWeightedDist(target[i], actual[i], weight);
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
//   destructionFail > 0               → Destruction   (one independent whole-unit-kill
//                                       attempt per surviving attacking figure)
//   lifeStealMod != null              → Life Steal    (uses lifeStealRes)
//   immDist truthy                    → Immolation    (caller pre-computes the area dist)
function usesModernCombatHealing(version) {
  return version === 'com2_1.05.11' || version === 'com2_warlord_1.5.12.7';
}

function usesDosCombatHealing(version) {
  return version === 'mom_1.31' || version === 'mom_cp_1.60.00'
    || version === 'com_6.08';
}

function usesStatefulCombatHealing(version) {
  return usesModernCombatHealing(version) || usesDosCombatHealing(version);
}

// Returns target-capped damage plus the version-appropriate Life Steal marginals.
// Modern `outcomes` retain uncapped raw drain and Combatheal correlation for repeated
// ApplyAttack calls such as Haste; legacy outcomes retain the former capped drain model.
function convolveTouchAttacks(dist, cap, atkFigs, p) {
  const modernCombatHealing = usesModernCombatHealing(p.version);
  const dosCombatHealing = usesDosCombatHealing(p.version);
  const statefulCombatHealing = modernCombatHealing || dosCombatHealing;
  let outcomes = [];
  for (let damage = 0; damage < dist.length; damage++) {
    if (dist[damage] < 1e-15) continue;
    const cappedDamage = Math.min(damage, cap);
    const baseCategory = p.baseDamageCategory || 'normalDamage';
    outcomes.push({ probability: dist[damage], damage: cappedDamage,
      state: statefulCombatHealing && p.sourceState
        ? (dosCombatHealing
          ? normalizeDosCombatHealState(p.sourceState)
          : normalizeCombatHealState(p.sourceState)) : null,
      rawDrain: 0, healedDamage: 0, bonusHpGain: 0, bonusHpBenefit: 0,
      legacyLifeStealBenefit: 0,
      bloodsuckerHealed: 0,
      irrecoverableDamage: baseCategory === 'irrecoverableDamage' ? cappedDamage : 0,
      undeadDamage: baseCategory === 'undeadDamage' ? cappedDamage : 0,
      normalDamage: baseCategory === 'normalDamage' ? cappedDamage : 0 });
  }
  const addDamage = (riderDist, category = 'normalDamage') => {
    if (!riderDist) return;
    const next = [];
    for (const outcome of outcomes) {
      for (let damage = 0; damage < riderDist.length; damage++) {
        const probability = outcome.probability * riderDist[damage];
        if (probability < 1e-15) continue;
        const cappedDamage = Math.min(cap, outcome.damage + damage);
        next.push({ ...outcome, probability, damage: cappedDamage,
          [category]: outcome[category] + cappedDamage - outcome.damage });
      }
    }
    outcomes = next;
  };
  if (atkFigs <= 0) {
    return collapseTouchOutcomes(outcomes, cap, false, statefulCombatHealing);
  }
  if (p.poisonStr > 0 && p.poisonFail > 0) {
    addDamage(calcResistDmgDist(atkFigs * p.poisonStr, p.poisonFail, cap));
  }
  if (p.stoningFail > 0) {
    addDamage(calcFigureKillDmgDist(atkFigs, p.stoningFail, p.targetHP, cap),
      'irrecoverableDamage');
  }
  if (p.deathTouchFail > 0) {
    addDamage(calcFigureKillDmgDist(atkFigs, p.deathTouchFail, p.targetHP, cap));
  }
  if (p.dispelEvilFail > 0) {
    addDamage(calcFigureKillDmgDist(atkFigs, p.dispelEvilFail, p.targetHP, cap),
      'irrecoverableDamage');
  }
  if (p.exorciseFail > 0) {
    addDamage(calcFigureKillDmgDist(atkFigs, p.exorciseFail, p.targetHP, cap),
      'irrecoverableDamage');
  }
  if (p.destructionFail > 0) {
    const anyDestructionFail = 1 - Math.pow(1 - p.destructionFail, atkFigs);
    addDamage(calcUnitKillDmgDist(anyDestructionFail, cap), 'irrecoverableDamage');
  }
  if (p.lifeStealMod != null) {
    const next = [];
    for (const outcome of outcomes) {
      const healPaths = dosCombatHealing && outcome.state
        ? calcDosLifeStealHealOutcomes(atkFigs, p.lifeStealRes, p.lifeStealMod,
          outcome.state)
        : modernCombatHealing && outcome.state
          ? calcLifeStealCombatHealOutcomes(atkFigs, p.lifeStealRes, p.lifeStealMod,
            outcome.state)
        : (statefulCombatHealing
          ? calcLifeStealRawDist(atkFigs, p.lifeStealRes, p.lifeStealMod)
          : calcLifeStealDmgDist(atkFigs, p.lifeStealRes, p.lifeStealMod, cap))
          .map((probability, rawDrain) => ({ probability, rawDrain,
            healedDamage: 0, bonusHpGain: 0, bonusHpBenefit: 0, state: null }));
      for (const heal of healPaths) {
        const probability = outcome.probability * heal.probability;
        if (probability < 1e-15) continue;
        const cappedDamage = Math.min(cap, outcome.damage + heal.rawDrain);
        next.push({ ...outcome, probability, state: heal.state,
          damage: cappedDamage,
          undeadDamage: outcome.undeadDamage + cappedDamage - outcome.damage,
          rawDrain: outcome.rawDrain + heal.rawDrain,
          healedDamage: outcome.healedDamage + heal.healedDamage,
          bonusHpGain: outcome.bonusHpGain + heal.bonusHpGain,
          bonusHpBenefit: outcome.bonusHpBenefit + heal.bonusHpBenefit,
          legacyLifeStealBenefit: outcome.legacyLifeStealBenefit
            + (statefulCombatHealing ? 0 : heal.rawDrain) });
      }
    }
    outcomes = next;
  }
  addDamage(p.immDist);

  // ApplyAttack tests all routed result categories only after the riders above. The shipped
  // Warlord constants are independent inputs to target damage and Combatheal.
  const bloodsucker = p.version === 'com2_warlord_1.5.12.7' && p.bloodsucker
    ? { damage: 2, healing: 2 } : null;
  if (bloodsucker) {
    outcomes = outcomes.map(outcome => {
      if (outcome.damage <= 0) return outcome;
      const healed = outcome.state
        ? combatHealTransition(outcome.state, bloodsucker.healing, false, true)
        : { state: null, healedDamage: 0 };
      return { ...outcome, state: healed.state,
        damage: Math.min(cap, outcome.damage + bloodsucker.damage),
        normalDamage: outcome.normalDamage
          + Math.min(cap - outcome.damage, bloodsucker.damage),
        healedDamage: outcome.healedDamage + healed.healedDamage,
        bloodsuckerHealed: outcome.bloodsuckerHealed + healed.healedDamage };
    });
  }
  return collapseTouchOutcomes(outcomes, cap, p.lifeStealMod != null,
    statefulCombatHealing);
}

function collapseTouchOutcomes(outcomes, cap, hasLifeSteal, modernCombatHealing) {
  const dist = new Array(cap + 1).fill(0);
  for (const outcome of outcomes) dist[outcome.damage] += outcome.probability;
  const lifeStealDist = hasLifeSteal ? outcomeMetricDist(outcomes, 'rawDrain') : null;
  const healedDamageDist = outcomeMetricDist(outcomes, 'healedDamage');
  const bonusHpDist = outcomeMetricDist(outcomes, 'bonusHpGain');
  const bonusHpBenefitDist = outcomeMetricDist(outcomes, 'bonusHpBenefit');
  const bloodsuckerHealDist = outcomeMetricDist(outcomes, 'bloodsuckerHealed');
  return {
    dist, outcomes, lifeStealDist,
    rawDrainEV: expectedDamage(lifeStealDist),
    healedDamageDist, bonusHpDist, bonusHpBenefitDist, bloodsuckerHealDist,
    lifeStealEV: modernCombatHealing
      ? expectedDamage(healedDamageDist) + expectedDamage(bonusHpBenefitDist)
      : expectedDamage(outcomeMetricDist(outcomes, 'legacyLifeStealBenefit')),
    bonusHpEV: expectedDamage(bonusHpDist),
    bloodsuckerHealEV: expectedDamage(bloodsuckerHealDist),
  };
}

function repeatTouchAttack(first, baseDist, cap, atkFigs, spec) {
  const modernCombatHealing = usesModernCombatHealing(spec.version);
  const statefulCombatHealing = usesStatefulCombatHealing(spec.version);
  const outcomes = [];
  for (const prior of first.outcomes) {
    // Legacy Haste self-convolved two identical target-capped attacks. Modern callers of
    // this helper are sequentially dealt channels, so their second ApplyAttack reads the
    // exact remaining target and revised source-healing state. Modern melee is instead
    // expanded in calcMeleeTouchOutcome because its damage remains pending.
    const remaining = statefulCombatHealing ? Math.max(0, cap - prior.damage) : cap;
    const next = convolveTouchAttacks(baseDist, remaining, atkFigs,
      { ...spec, sourceState: statefulCombatHealing ? prior.state : null });
    for (const after of next.outcomes) {
      const probability = prior.probability * after.probability;
      if (probability < 1e-15) continue;
      outcomes.push({ probability, state: after.state,
        damage: Math.min(cap, prior.damage + after.damage),
        irrecoverableDamage: prior.irrecoverableDamage + after.irrecoverableDamage,
        undeadDamage: prior.undeadDamage + after.undeadDamage,
        normalDamage: prior.normalDamage + after.normalDamage,
        rawDrain: statefulCombatHealing
          ? prior.rawDrain + after.rawDrain
          : Math.min(cap, prior.rawDrain + after.rawDrain),
        healedDamage: prior.healedDamage + after.healedDamage,
        bonusHpGain: prior.bonusHpGain + after.bonusHpGain,
        bonusHpBenefit: prior.bonusHpBenefit + after.bonusHpBenefit,
        legacyLifeStealBenefit: prior.legacyLifeStealBenefit
          + after.legacyLifeStealBenefit,
        bloodsuckerHealed: prior.bloodsuckerHealed + after.bloodsuckerHealed });
    }
  }
  return collapseTouchOutcomes(outcomes, cap, spec.lifeStealMod != null,
    statefulCombatHealing);
}

function combineModernRepeatedTouchOutcome(prior, after, probability, cap) {
  return {
    probability,
    state: after.state,
    damage: Math.min(cap, prior.damage + after.damage),
    irrecoverableDamage: prior.irrecoverableDamage + after.irrecoverableDamage,
    undeadDamage: prior.undeadDamage + after.undeadDamage,
    normalDamage: prior.normalDamage + after.normalDamage,
    rawDrain: prior.rawDrain + after.rawDrain,
    healedDamage: prior.healedDamage + after.healedDamage,
    bonusHpGain: prior.bonusHpGain + after.bonusHpGain,
    bonusHpBenefit: prior.bonusHpBenefit + after.bonusHpBenefit,
    legacyLifeStealBenefit: prior.legacyLifeStealBenefit
      + after.legacyLifeStealBenefit,
    bloodsuckerHealed: prior.bloodsuckerHealed + after.bloodsuckerHealed,
  };
}

function sequenceTouchApplyAttacks(steps, cap, sourceState) {
  let paths = [{ probability: 1, state: normalizeCombatHealState(sourceState),
    damage: 0, rawDrain: 0, healedDamage: 0, bonusHpGain: 0,
    bonusHpBenefit: 0, bloodsuckerHealed: 0,
    irrecoverableDamage: 0, undeadDamage: 0, normalDamage: 0 }];
  for (const buildStep of steps) {
    const next = [];
    for (const prior of paths) {
      const remaining = Math.max(0, cap - prior.damage);
      if (remaining <= 0) {
        next.push(prior);
        continue;
      }
      const step = buildStep(remaining, healingStateAlive(prior.state));
      const result = convolveTouchAttacks(step.dist, remaining, step.atkFigs,
        { ...step.spec, sourceState: prior.state });
      for (const after of result.outcomes) {
        const probability = prior.probability * after.probability;
        if (probability < 1e-15) continue;
        next.push({
          probability,
          state: after.state,
          damage: Math.min(cap, prior.damage + after.damage),
          rawDrain: prior.rawDrain + after.rawDrain,
          healedDamage: prior.healedDamage + after.healedDamage,
          bonusHpGain: prior.bonusHpGain + after.bonusHpGain,
          bonusHpBenefit: prior.bonusHpBenefit + after.bonusHpBenefit,
          bloodsuckerHealed: prior.bloodsuckerHealed + after.bloodsuckerHealed,
          irrecoverableDamage: prior.irrecoverableDamage + after.irrecoverableDamage,
          undeadDamage: prior.undeadDamage + after.undeadDamage,
          normalDamage: prior.normalDamage + after.normalDamage,
        });
      }
    }
    paths = next;
  }
  return collapseTouchOutcomes(paths, cap, false, true);
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
                               bloodsucker, version, sourceState,
                               independentFearProbability = null) {
  if (remHP <= 0 || maxFigs <= 0) return { damageDist: [1], lifeStealEV: 0 };
  const result = new Array(remHP + 1).fill(0);
  let lifeStealEV = 0;
  const outcomes = [];
  const firstOutcomes = [];
  const modernDoubleStrike = doubleStrike && usesModernCombatHealing(version);
  const dosHealingDoubleStrike = doubleStrike && usesDosCombatHealing(version)
    && lifeStealMod !== null;
  const statefulDoubleStrike = modernDoubleStrike || dosHealingDoubleStrike;
  const independentModernFear = modernDoubleStrike
    && independentFearProbability !== null;
  const lo = fearDist ? 0 : maxFigs;
  const touchSpec = {
    poisonStr, poisonFail,
    stoningFail, deathTouchFail, dispelEvilFail, exorciseFail, destructionFail, targetHP,
    lifeStealMod, lifeStealRes,
    immDist: immolationDist,
    bloodsucker,
    version,
    sourceState,
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
    let tOut = convolveTouchAttacks(dist, remHP, k, touchSpec);
    if (doubleStrike && !statefulDoubleStrike && k > 0 && atk > 0) {
      tOut = repeatTouchAttack(tOut, dist, remHP, k, touchSpec);
    }
    if (statefulDoubleStrike) {
      for (const outcome of tOut.outcomes) {
        firstOutcomes.push({ ...outcome, probability: pK * outcome.probability,
          fearFailures: maxFigs - k });
      }
      continue;
    }
    dist = tOut.dist;
    lifeStealEV += pK * tOut.lifeStealEV;
    for (const outcome of tOut.outcomes) {
      outcomes.push({ ...outcome, probability: pK * outcome.probability });
    }
    for (let d = 0; d < dist.length; d++) result[d] += pK * dist[d];
  }

  if (statefulDoubleStrike) {
    const repeatedOutcomes = [];
    const repeatFearedDist = [];
    for (const prior of firstOutcomes) {
      // Both modern Hasted melee ApplyAttack calls precede Dealdamage. The second
      // therefore reads the same target snapshot even though it sees the source's
      // exact first-call healing outcome.
      const remaining = remHP;
      const secondMaxFigs = prior.state
        ? healingStateAlive(prior.state) : maxFigs;
      const secondFearDist = independentModernFear
        ? calcFearDist(secondMaxFigs, independentFearProbability) : null;
      const sharedDosFigures = dosHealingDoubleStrike
        ? Math.max(0, secondMaxFigs - prior.fearFailures) : secondMaxFigs;
      addWeightedDist(repeatFearedDist,
        secondFearDist
          ? fearedCountDist(secondFearDist, secondMaxFigs)
          : (() => { const d = []; d[sharedDosFigures] = 1; return d; })(),
        prior.probability);
      const secondLo = secondFearDist ? 0 : sharedDosFigures;
      const secondHi = secondFearDist ? secondMaxFigs : sharedDosFigures;
      for (let k = secondLo; k <= secondHi; k++) {
        const pK = secondFearDist ? secondFearDist[k] : 1;
        if (pK < 1e-15) continue;
        let dist;
        if (k <= 0 || atk <= 0) {
          dist = [1];
        } else if (isDoom) {
          dist = calcDoomDist(k, atk, remaining);
        } else {
          dist = calcTotalDamageDist(k, atk, toHit, def, toBlock, targetHP,
            remaining, defInvulnBonus, blurChance, blurBuggy, defTopFigHP,
            minDamageFromHits);
        }
        const second = convolveTouchAttacks(dist, remaining, k,
          { ...touchSpec, sourceState: prior.state });
        for (const after of second.outcomes) {
          const probability = prior.probability * pK * after.probability;
          if (probability < 1e-15) continue;
          repeatedOutcomes.push(combineModernRepeatedTouchOutcome(
            prior, after, probability, remHP));
        }
      }
    }
    const collapsed = collapseTouchOutcomes(repeatedOutcomes, remHP,
      lifeStealMod != null, true);
    return { ...collapsed, damageDist: collapsed.dist,
      repeatFearedDist: repeatFearedDist.length ? repeatFearedDist : [1] };
  }
  return { damageDist: result, lifeStealEV, outcomes };
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
// The calculator projects that battle state onto tactical defender Card B for one displayed
// exchange; Card A's army-state checkbox becomes relevant only after the cards are swapped.
// v1.31 bug: Illusion Immunity checked on defender instead of attacker.
// Fixed (1.51+/CoM/CoM2): Illusion Immunity checked on attacker.
function getBlurChance(defAbilities, atkAbilities, version, modernTacticalDefenderBlur = false) {
  const isCoM = version && version.startsWith('com');
  const isCoM2 = version && version.startsWith('com2');
  const isWarlord = version && version.startsWith('com2_warlord');
  // CoM2/Warlord read the fixed tactical-defender army state for this calculator exchange.
  // Older engines retain the current target unit's enchantment bit.
  const hasBlur = isCoM2 ? !!modernTacticalDefenderBlur : !!(defAbilities && defAbilities.blur);
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
// MoM 1.31 grants only Death Immunity; CP 1.60 grants all four immunities.
// CoM 1, CoM2, and Warlord grant Death, Cold, and Illusion Immunity, but not Poison.
// MoM grants these off a *race* test rather than the undead flag — the undead block sets
// race = Death, then WIZARDS.EXE 0x8F81A ORs 0x40 (Death only) in 1.31 and 0xD8 (all four)
// in CP 1.60. CoM 1 deletes that gate and ORs 0x58 (Death|Cold|Illusion, no Poison) inside
// the undead block itself (0x8F4C6).
// STAT-FORMULA[undeadImmunityDerivation]
// PROVENANCE[undeadImmunityDerivation]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:b0b100600e12a7776e6f6705 | Reference docs/DOS reconstructed/unitcalc.c@span:7:4f777961fd94cbdfe370ee1c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:f913c873848cd66c2e8a77bf
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
// PROVENANCE[animatedEffectDerivation]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:16:ae07dbabe0a67cb84ddd5b15 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:808c1e69f457f734b2c8e8a8
function applyAnimatedEffects(unit, version) {
  if (!hasAbil(unit.abilities, 'animated')) return unit;
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { weaponImmunity: true }),
  });
}

// Apply immunities from Black Channels.
// In both supported MoM builds it grants Cold, Illusion, Poison, and Death Immunity
// (unlike the Undead attribute, which grants only Death Immunity in v1.31).
// STAT-FORMULA[blackChannelsEffectDerivation]
// PROVENANCE[blackChannelsEffectDerivation]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:20:d70b30ff5120b7a9057ab7e3 | Reference docs/DOS reconstructed/unitcalc.c@span:7:641fa01e4a1f0fb71d4d0402
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
// PROVENANCE[rebuildEffectDerivation]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS@span:14:4bf7fbd36a952469a8d78b9b | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:8:ff5769532c07ec8df9389ec0
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
// PROVENANCE[tacticianAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:20:ad27ec0c811d3a388faf52ab | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:22:89e62a9b6d30ab5269ff1a55
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

// Warlord Fiery Fury (Chaos unit enchantment): when cast on a base-Fantastic creature,
// grants First Strike. (Base non-Fantastic units instead get stat bonuses — handled in stats.js.
// The realm conversion to Chaos is handled in determineEffectiveUnitType.)
// STAT-FORMULA[fieryFuryAbilityDerivation]
// PROVENANCE[fieryFuryAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:14:28f3f207149034b0e805f4b5
function applyFieryFuryEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord')) return unit;
  if (!hasAbil(unit.abilities, 'fieryFury')) return unit;
  const baseFantastic = unit.identity && typeof unit.identity.baseFantastic === 'boolean'
    ? unit.identity.baseFantastic
    : typeof unit.abilities.baseFantastic === 'boolean'
      ? unit.abilities.baseFantastic
      : (unit.unitType || '').startsWith('fantastic_');
  if (!baseFantastic) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { firstStrike: true }),
  });
}

// Warlord Zeal grants First Strike and Negate First Strike. Item power 78 grants the
// same flags earlier in phase b; the ordinary phase-d Zeal block skips that duplicate.
// Both precede Temporal Twist, which can strip the granted flags.
// STAT-FORMULA[zealAbilityDerivation]
// PROVENANCE[zealAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:4:d530a92fb1e7f722142a627e | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:4:31ac70ff5715861521e99085
function applyZealEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'zeal')) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { firstStrike: true, negateFirstStrike: true }),
  });
}

// Warlord Temporal Twist (enemy combat global enchantment): strips First Strike,
// Negate First Strike, and Teleporting from the affected unit. It runs before the
// later Tactician block, which can restore Negate First Strike from Non-Corporeal
// or both strike flags from Favored Terrain, but cannot restore Teleporting's First Strike.
// STAT-FORMULA[temporalTwistAbilityDerivation]
// PROVENANCE[temporalTwistAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:f1f4495ca7b57ea954b01136
function applyTemporalTwistEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'temporalTwist')) return unit;
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
// PROVENANCE[bloodLustAbilityDerivation]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:12:4291d05361823ad272e4e04f | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:e894ef880a35e8ad7d3f714b | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:8:32ea534d834bbcec63f4826a
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
// Its Create Undead grant only routes damage into a post-combat creation category; it does
// not change one-round damage or Blood Sucker triggering, so this calculator omits that flag.
// STAT-FORMULA[vampirismAbilityDerivation]
// PROVENANCE[vampirismAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:13:6359ba6a575e608e160b3466
function applyVampirismEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'vampirism')) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { undead: true, bloodSucker: true }),
  });
}

// Warlord Revenant (Death uncommon unit enchantment): unit becomes undead and gains
// melee Death Touch 0. Immunities follow from the
// granted `undead` flag via applyUndeadImmunities. Death Touch fires per attacking
// figure on melee and Thrown. Regeneration has no bearing on single-combat damage.
// STAT-FORMULA[revenantAbilityDerivation]
// PROVENANCE[revenantAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/COSpell.CAS@span:3:6d47f9da2fa86fd972f40ae4 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:7:76f065dbf8571714ba992fd1
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

  // Energy Cannon's UnitCalc.CAS write targets attack record 3, not the general
  // record. Preserve any independent general Destruction while routing this derived
  // modifier only to conventional ranged ApplyAttack calls.
  if (hasAbil(unit.abilities, 'energyCannon')
      && abilDefined(unit.abilities, 'energyCannonDestruction')) {
    records.ranged.destruction = unit.abilities.energyCannonDestruction;
  }

  return Object.assign({}, unit, { touchFlagRecords: records });
}

// Warlord Angelic Guardians (Life rare global enchantment): in combat, grants or
// improves Exorcise Touch on friendly units. Existing Exorcise is improved on every
// realm: extra -3 (Life) or -2 (all others). A unit without Exorcise receives it when
// its base record is non-Fantastic (value 0) or its current realm is Life (value -1).
// Run after the effective unit type is finalized, so Sanctify's life-realm rewrite is
// already reflected. The extra -3 vs created-undead defenders lives in exorciseFailProb.
// STAT-FORMULA[angelicGuardiansAbilityDerivation]
// PROVENANCE[angelicGuardiansAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:9:f742373b8f5966edd2fa5c3b
function applyAngelicGuardiansEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'angelicGuardians')) return unit;
  const realm = realmOfUnitType(unit.unitType, unit.identity);
  const isLife = realm === 'life';
  const baseFantastic = unit.identity && typeof unit.identity.baseFantastic === 'boolean'
    ? unit.identity.baseFantastic
    : typeof unit.abilities.baseFantastic === 'boolean'
      ? unit.abilities.baseFantastic
      : (unit.unitType || '').startsWith('fantastic_');
  let val;
  if (abilDefined(unit.abilities, 'exorcise')) {
    val = abilVal(unit.abilities, 'exorcise', 0) + (isLife ? -3 : -2);
  } else {
    if (baseFantastic && !isLife) return unit;
    val = isLife ? -1 : 0;
  }
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { exorcise: val }),
  });
}

// PROVENANCE[bloodLustMeleeAttack]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:7:28677485bcd26d6205a27127 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:4:ac0c26ac4b856f2574b214d5
// STAT-FORMULA[bloodLustMeleeAttack]
function bloodLustMeleeAttack(atkUnit, defUnit, attackStrength = atkUnit.atk) {
  // The final calculated unit type already reflects conversions such as Spirit Link.
  const targetIsNormal = defUnit
    && (isNormalUnitType(defUnit.unitType) || defUnit.unitType === 'hero');
  if (!targetIsNormal || !hasAbil(atkUnit.abilities, 'bloodLust')) return attackStrength;
  return attackStrength * 2;
}

// --- Attack-specific stat sequences (Caster.exe: CoM2 and Warlord) ---
// These use the same step type and runner as derivation, but on a scratch copy which
// is discarded after one incoming attack. They therefore never change the displayed
// stat block. Order follows @Units@GetEffectiveResistance and
// @Units@EffectiveDefense; see CoM2 binary analysis, "Resolution-time modifiers".
function attackSpecificStep(id, writes, apply, when) {
  return statStep({
    id,
    phase: 'attackSpecific',
    writes,
    apply,
    ...(when ? { when } : {}),
  });
}

const EFFECTIVE_RESISTANCE_STEPS = [
  // PROVENANCE[effectiveResistance:base]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:7:94e6acc42c67b18404dd8d13
  attackSpecificStep('effectiveResistance:base', ['effectiveResistance'],
    u => { u.effectiveResistance = u.res; }),
  // PROVENANCE[effectiveResistance:charmed]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:7:94e6acc42c67b18404dd8d13
  attackSpecificStep('effectiveResistance:charmed', ['effectiveResistance'],
    u => { u.effectiveResistance = 100; },
    (u, ctx) => ctx.isRoll && (u.isHero || u.unitType === 'hero') && hasAbil(u.abilities, 'charmed')),
  // PROVENANCE[effectiveResistance:magicImmunity]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:52d7a21af8d678318152f8fc
  attackSpecificStep('effectiveResistance:magicImmunity', ['effectiveResistance'],
    u => { u.effectiveResistance = 100; },
    (u, ctx) => ctx.realm !== null && hasAbil(u.abilities, 'magicImmunity')),
  // PROVENANCE[effectiveResistance:resistElements]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:c5d736809b27903ec0e40f87 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:e2dc42fafe0d325d0f39e42c | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:e2dc42fafe0d325d0f39e42c
  attackSpecificStep('effectiveResistance:resistElements', ['effectiveResistance'],
    u => { u.effectiveResistance += 4; },
    (u, ctx) => ctx.realm === 'nature' && hasResistElementsEffect(u.abilities)),
  // PROVENANCE[effectiveResistance:bless]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:3:8da0a27a31fedd3ba0134ffc | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:139a1e53fbfbc5356d693d1d | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:e9ef47259ac28c3d1c61598a
  attackSpecificStep('effectiveResistance:bless', ['effectiveResistance'],
    (u, ctx) => { u.effectiveResistance += ctx.blessBonus; },
    (u, ctx) => (ctx.realm === 'chaos' || ctx.realm === 'death') && hasAbil(u.abilities, 'bless')),
  // PROVENANCE[effectiveResistance:resistMagic]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:144365f7a66eeaa2a77f8a4d | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:9944e135e5c46465171e6e72 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:9944e135e5c46465171e6e72
  attackSpecificStep('effectiveResistance:resistMagic', ['effectiveResistance'],
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
  // None of these steps carries a version predicate: the list is CoM2-only because the
  // `startsWith('com2')` branch of buildResistanceContext is the only path that reaches it.
  // That scope is therefore checkable only here, where the steps enter the sequence.
  if (statStepDebugEnabled()) {
    assertSequenceVersionScope(EFFECTIVE_RESISTANCE_STEPS, version, 'GetEffectiveResistance');
  }
  runStatSteps(EFFECTIVE_RESISTANCE_STEPS, scratch, context);
  return scratch.effectiveResistance;
}

const EFFECTIVE_DEFENSE_STEPS = [
  // PROVENANCE[effectiveDefense:base]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:16:a817f716eaa0bf5bc9a83904
  attackSpecificStep('effectiveDefense:base', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense = u.def + ctx.extraDefense; }),
  // PROVENANCE[effectiveDefense:illusion]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:6:73589286bdb2cf542120a0a1
  attackSpecificStep('effectiveDefense:illusion', ['effectiveDefense'],
    u => { u.effectiveDefense = 0; return HALT; },
    (u, ctx) => ctx.illusion && !hasAbil(u.abilities, 'illusionImmunity')),
  // PROVENANCE[effectiveDefense:largeShield]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:cad06bcca352e1e701c06cfe | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:baa485ae66a250e528069e54 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:baa485ae66a250e528069e54
  attackSpecificStep('effectiveDefense:largeShield', ['effectiveDefense'],
    u => { u.effectiveDefense += 3; },
    (u, ctx) => ctx.isRanged && hasAbil(u.abilities, 'largeShield')),
  // PROVENANCE[effectiveDefense:resistElements]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:69075b87f644f18cbdb1c64a | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:c99051561c61668cea94903d | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:c99051561c61668cea94903d
  attackSpecificStep('effectiveDefense:resistElements', ['effectiveDefense'],
    u => { u.effectiveDefense += 4; },
    (u, ctx) => ctx.elementalEligible && hasResistElementsEffect(u.abilities)),
  // PROVENANCE[effectiveDefense:elementalArmor]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:95c224910389756ff6f69515 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:473b9eac9397f92d8022c2cd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:473b9eac9397f92d8022c2cd
  attackSpecificStep('effectiveDefense:elementalArmor', ['effectiveDefense'],
    u => { u.effectiveDefense += 12; },
    (u, ctx) => ctx.elementalEligible && hasElementalArmorEffect(u.abilities)),
  // PROVENANCE[effectiveDefense:bless]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:4:1aa8579dfe4d99fda5935346 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:db54edb1372f3254301b3b9b | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:aaec01b51dfbddfb4fb45271
  attackSpecificStep('effectiveDefense:bless', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense += ctx.blessBonus; },
    (u, ctx) => ctx.magicImmunityEligible && ctx.spellId > 0
      && (ctx.spellRealm === 'chaos' || ctx.spellRealm === 'death')
      && hasAbil(u.abilities, 'bless')),
  // PROVENANCE[effectiveDefense:armorPiercing]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:4:d2fe7b44d5e48e4e73b98cde
  attackSpecificStep('effectiveDefense:armorPiercing', ['effectiveDefense'],
    u => { u.effectiveDefense = Math.floor(u.effectiveDefense / 2); },
    (u, ctx) => ctx.armorPiercing
      && !(ctx.isLightning && hasAbil(u.abilities, 'lightningResist'))),
  // PROVENANCE[effectiveDefense:immunities]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:6:2f2c6876d3c7d7f5d2533b8b
  attackSpecificStep('effectiveDefense:immunities', ['effectiveDefense'],
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
  // PROVENANCE[effectiveDefense:weaponImmunity]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:64343218ebddfe0d2454f929 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:8c99d740dfd473b21f906b13 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:4c279bb027bcde85badd90e7
  attackSpecificStep('effectiveDefense:weaponImmunity', ['effectiveDefense'],
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
    spellId: Number.isInteger(attack.spellId) ? attack.spellId : 0,
    spellRealm: attack.spellRealm || null,
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
  // Same ungated shape as GetEffectiveResistance above: computeDefenseProfile's non-com2
  // branch is what keeps the DOS engines out, so the check belongs at this call site.
  if (statStepDebugEnabled()) {
    assertSequenceVersionScope(EFFECTIVE_DEFENSE_STEPS, version, 'EffectiveDefense');
  }
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

// Bonus amounts to a unit's resistance vs Stoning. CoM RE +4 (Nature only); in MoM,
// Elemental Armor's +10 wins over Resist Elements' +3 when both are present.
// PROVENANCE[elemResistBonus]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:21:d4c342b397e25bb4de7c2e8e
// STAT-FORMULA[elemResistBonus]
function elemResistBonus(unit, version) {
  if (version === 'com_6.08') return hasResistElementsEffect(unit.abilities) ? 4 : 0;
  if (hasElementalArmorEffect(unit.abilities)) return 10;
  return hasResistElementsEffect(unit.abilities) ? 3 : 0;
}

function computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty, attackType) {
  const aArmorPiercing = hasAbil(attacker.abilities, 'armorPiercing');
  const aIllusion = hasAbil(attacker.abilities, 'illusion');

  const wi = magicranged => hasWeaponImmunityEffect(target.abilities)
    && !modernAttackIsMagic(attacker, target.abilities, magicranged);

  let attack;
  if (attackType === 'melee') {
    attack = {
      spellId: 0,
      vertigoDefPenalty,
      illusion: aIllusion,
      armorPiercing: aArmorPiercing,
      weaponImmunityEligible: wi(false),
    };
  } else if (attackType === 'ranged') {
    const aRangedElem = attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n'
      || attacker.rangedType === 'magic_s' || attacker.rangedType === 'beam';
    attack = {
      spellId: 0,
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      elementalEligible: aRangedElem,
      armorPiercing: aArmorPiercing,
      magicImmunityEligible: aRangedElem,
      isMissile: attacker.rangedType === 'missile',
      righteousnessEligible: attacker.rangedType === 'magic_c',
      weaponImmunityEligible: wi(aRangedElem),
    };
  } else if (attackType === 'thrown') {
    const aThrownElem = attacker.thrownType === 'fire' || attacker.thrownType === 'lightning';
    attack = {
      spellId: 0,
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      elementalEligible: aThrownElem,
      armorPiercing: aArmorPiercing || attacker.thrownType === 'lightning',
      isLightning: attacker.thrownType === 'lightning',
      isFire: attacker.thrownType === 'fire',
      righteousnessEligible: attacker.thrownType === 'fire'
        || attacker.thrownType === 'lightning',
      weaponImmunityEligible: wi(aThrownElem),
    };
  } else if (attackType === 'gaze') {
    attack = {
      spellId: 0,
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      armorPiercing: aArmorPiercing,
      magicImmunityEligible: true,
      weaponImmunityEligible: wi(true),
    };
  } else if (attackType === 'immolation') {
    attack = {
      spellId: 99,
      spellRealm: 'chaos',
      vertigoDefPenalty,
      isRanged: true,
      isFire: true,
      magicImmunityEligible: true,
      righteousnessEligible: true,
    };
  } else {
    throw new Error(`Unknown Caster.exe defense attack type: ${attackType}`);
  }
  // Combat@ApplyAttack supplies City Walls as EffectiveDefense's `extradef`: +3 intact, +1
  // damaged, only when the target is inside and this particular attacker is outside. Card
  // exchange role and army membership do not participate. DamageSpell passes 0 instead.
  if (attackType !== 'immolation' && !(attacker.cityWallBonus > 0)) {
    attack.extraDefense = target.cityWallBonus || 0;
  }
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
// PROVENANCE[dosEffectiveDefenseProfile]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:36:3e1214d9d09f0f4987d21875 | Reference docs/DOS reconstructed/combat.c@span:40:0ac6fd1c15499db045318a64 | Reference docs/DOS reconstructed/combat.c@span:40:6f729d8ce84e732b58d084c0 | Reference docs/DOS reconstructed/combat.c@span:36:cc02fe00e69095b915718ee5 | Reference docs/DOS reconstructed/combat.c@span:19:a16fdca112f4ee20e4440f08 | Reference docs/DOS reconstructed/combat.c@span:39:92665849702ec840ab52d0c4 | Reference docs/DOS reconstructed/combat.c@span:22:e75af0ad84433181ba29fac1
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
  // Caster.exe classifies these flags more widely, but its unit-attack caller passes spell ID 0,
  // so none of those classifications can activate modern Bless Defense.
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
    : hasElementalArmorEffect(target.abilities) ? 10
      : hasResistElementsEffect(target.abilities) ? 3 : 0;
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
  // City Walls is deliberately absent here: BU_Apply_Attack adds it only after the complete
  // Battle_Unit_Defense_Special result, while the separate spell-damage path never adds it.
  const cityWallBonus = target.cityWallBonus > 0 && !(attacker.cityWallBonus > 0)
    ? target.cityWallBonus : 0;
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

  // Illusion zeroes the defense-special result and is negated by Illusion Immunity. DOS then
  // adds an applicable City Walls bonus after that result, so walls alone survive Illusion.
  // The separate immolation/area-fire spell path receives neither Illusion nor City Walls.
  const aIllusion = hasAbil(attacker.abilities, 'illusion');
  const tIllusionImmune = hasAbil(target.abilities, 'illusionImmunity');
  if (aIllusion && !tIllusionImmune) {
    vsMelee = 0;
    vsRanged = 0;
    vsThrown = 0;
    vsGaze = 0;
  }

  // BU_Apply_Attack's inside-target/outside-source block follows the defense-special call.
  // Consequently Armor Piercing and every immunity resolve before this unhalved addition.
  vsMelee += cityWallBonus;
  vsRanged += cityWallBonus;
  vsThrown += cityWallBonus;
  vsGaze += cityWallBonus;

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
// In FS+Haste configurations, a single 'firstStrikeBlock' phase replaces phases 5-8b.
// The legacy engines retain their shared fear sample; modern Caster ApplyAttack calls
// sample Cause Fear independently for First Strike and the Haste strike.

function aliveCount(unit, cumDmgInCombat) {
  return Math.max(0, unit.figs - Math.floor((unit.dmg + cumDmgInCombat) / unit.hp));
}

// Initialise joint state with all probability at (0, 0).
function healingPathKey(path) {
  return [combatHealStateKey(path.aState), combatHealStateKey(path.bState),
    path.aDamageTaken, path.bDamageTaken,
    path.aRawDrain, path.bRawDrain,
    path.aHealedDamage, path.bHealedDamage,
    path.aBonusHpGain, path.bBonusHpGain,
    path.aBonusHpBenefit, path.bBonusHpBenefit,
    path.aBloodsuckerHealed, path.bBloodsuckerHealed].join('|');
}

function addHealingPath(cell, path) {
  const key = healingPathKey(path);
  const previous = cell.get(key);
  if (previous) previous.probability += path.probability;
  else cell.set(key, path);
}

function initialHealingPath(units) {
  return {
    probability: 1,
    aState: combatHealStateFromUnit(units.a),
    bState: combatHealStateFromUnit(units.b),
    aDamageTaken: 0, bDamageTaken: 0,
    aRawDrain: 0, bRawDrain: 0,
    aHealedDamage: 0, bHealedDamage: 0,
    aBonusHpGain: 0, bBonusHpGain: 0,
    aBonusHpBenefit: 0, bBonusHpBenefit: 0,
    aBloodsuckerHealed: 0, bBloodsuckerHealed: 0,
  };
}

function makeJoint2D(aRemHP, bRemHP, healingUnits = null) {
  const j = new Array(aRemHP + 1);
  if (healingUnits) {
    j.healingPaths = true;
    for (let i = 0; i <= aRemHP; i++) {
      j[i] = Array.from({ length: bRemHP + 1 }, () => new Map());
    }
    addHealingPath(j[0][0], initialHealingPath(healingUnits));
  } else {
    for (let i = 0; i <= aRemHP; i++) j[i] = new Array(bRemHP + 1).fill(0);
    j[0][0] = 1;
  }
  return j;
}

// Build an empty joint of the same shape.
function emptyJointLike(joint) {
  const j = new Array(joint.length);
  if (joint.healingPaths) {
    j.healingPaths = true;
    for (let i = 0; i < joint.length; i++) {
      j[i] = Array.from({ length: joint[0].length }, () => new Map());
    }
  } else {
    for (let i = 0; i < joint.length; i++) j[i] = new Array(joint[0].length).fill(0);
  }
  return j;
}

function jointCellProbability(cell) {
  if (!(cell instanceof Map)) return cell;
  let total = 0;
  for (const path of cell.values()) total += path.probability;
  return total;
}

function outcomePaths(out, sourceState) {
  if (out.outcomes) return out.outcomes;
  return out.dist.map((probability, damage) => ({
    probability,
    damage,
    state: sourceState,
    rawDrain: 0,
    healedDamage: 0,
    bonusHpGain: 0,
    bonusHpBenefit: 0,
    bloodsuckerHealed: 0,
    irrecoverableDamage: 0,
    undeadDamage: 0,
    normalDamage: damage,
  }));
}

function applyOutcomeToHealingPath(path, side, outcome) {
  return {
    ...path,
    [side + 'State']: outcome.state || path[side + 'State'],
    [side + 'RawDrain']: path[side + 'RawDrain'] + (outcome.rawDrain || 0),
    [side + 'HealedDamage']: path[side + 'HealedDamage'] + (outcome.healedDamage || 0),
    [side + 'BonusHpGain']: path[side + 'BonusHpGain'] + (outcome.bonusHpGain || 0),
    [side + 'BonusHpBenefit']: path[side + 'BonusHpBenefit'] + (outcome.bonusHpBenefit || 0),
    [side + 'BloodsuckerHealed']: path[side + 'BloodsuckerHealed']
      + (outcome.bloodsuckerHealed || 0),
  };
}

function applyOutcomeDamageToState(state, outcome) {
  const damage = Math.max(0, outcome.damage || 0);
  if (damage <= 0) return state;
  if (state && state.engine === 'dos') {
    const next = normalizeDosCombatHealState(state);
    // BU_ApplyDamage caps each stored DOS category independently at 200, while
    // its front-figure/current-figure calculation still consumes the full sum.
    next.regularDamage = Math.min(200,
      next.regularDamage + Math.max(0, outcome.normalDamage || 0));
    next.irreversibleDamage = Math.min(200,
      next.irreversibleDamage + Math.max(0, outcome.irrecoverableDamage || 0));
    next.undeadDamage = Math.min(200,
      next.undeadDamage + Math.max(0, outcome.undeadDamage || 0));
    const hits = dosCombatHits(next);
    let front = next.frontFigureDamage + damage;
    while (hits > 0 && front >= hits && next.currentFigures > 0) {
      front -= hits;
      next.currentFigures--;
    }
    next.frontFigureDamage = next.currentFigures > 0 ? front : 0;
    return normalizeDosCombatHealState(next);
  }
  const next = normalizeCombatHealState(state);
  next.totalDamage += damage;
  next.irrecoverableDamage += Math.max(0, outcome.irrecoverableDamage || 0);
  next.undeadDamage += Math.max(0, outcome.undeadDamage || 0);
  return normalizeCombatHealState(next);
}

function healingStateAlive(state) {
  return state && state.engine === 'dos'
    ? dosCombatHealLivingFigures(state)
    : Math.max(0, combatHealLivingFigures(state));
}

function healingStateRemainingHp(state) {
  if (state && state.engine === 'dos') return dosCombatHealRemainingHp(state);
  const normalized = normalizeCombatHealState(state);
  return Math.max(0,
    normalized.figures * (normalized.hp + normalized.bonusHp) - normalized.totalDamage);
}

// Stable presentation boundary for the version-specific healing records. The resolver
// keeps DOS Irreversible Damage / Extra Hits and Caster Irrecoverable Damage / Bonus HP
// distinct internally, but callers need one set of comparable post-combat means.
function combatHealingStateMetrics(state) {
  if (state && state.engine === 'dos') {
    const normalized = normalizeDosCombatHealState(state);
    return {
      irreversibleDamage: normalized.irreversibleDamage,
      undeadDamage: normalized.undeadDamage,
      extraHits: normalized.extraHits,
    };
  }
  const normalized = normalizeCombatHealState(state);
  return {
    irreversibleDamage: normalized.irrecoverableDamage,
    undeadDamage: normalized.undeadDamage,
    extraHits: normalized.bonusHp,
  };
}

function initialCombatHealingStateMeans(unit) {
  return combatHealingStateMetrics(combatHealStateFromUnit(unit));
}

function jointCombatHealingStateMeans(joint, side, unit) {
  if (!joint.healingPaths) return initialCombatHealingStateMeans(unit);
  const means = { irreversibleDamage: 0, undeadDamage: 0, extraHits: 0 };
  for (const row of joint) {
    for (const cell of row) {
      for (const path of cell.values()) {
        const metrics = combatHealingStateMetrics(path[side + 'State']);
        means.irreversibleDamage += path.probability * metrics.irreversibleDamage;
        means.undeadDamage += path.probability * metrics.undeadDamage;
        means.extraHits += path.probability * metrics.extraHits;
      }
    }
  }
  return means;
}

function rangedCombatHealingStateMeans(outcomes, sourceUnit, targetUnit) {
  const sourceMeans = { irreversibleDamage: 0, undeadDamage: 0, extraHits: 0 };
  const targetMeans = { irreversibleDamage: 0, undeadDamage: 0, extraHits: 0 };
  const sourceInitial = combatHealStateFromUnit(sourceUnit);
  const targetInitial = combatHealStateFromUnit(targetUnit);
  for (const outcome of outcomes || []) {
    const probability = outcome.probability || 0;
    const sourceMetrics = combatHealingStateMetrics(outcome.state || sourceInitial);
    const targetMetrics = combatHealingStateMetrics(
      applyOutcomeDamageToState(targetInitial, outcome));
    for (const key of Object.keys(sourceMeans)) {
      sourceMeans[key] += probability * sourceMetrics[key];
      targetMeans[key] += probability * targetMetrics[key];
    }
  }
  return { sourceMeans, targetMeans };
}

function dosTopFigureRemainingHp(state) {
  const normalized = normalizeDosCombatHealState(state);
  return dosInt8(dosInt8(dosCombatHits(normalized))
    - dosInt8(normalized.frontFigureDamage));
}

function jointMetricDist(joint, key) {
  if (!joint.healingPaths) return null;
  let max = 0;
  for (const row of joint) {
    for (const cell of row) {
      for (const path of cell.values()) max = Math.max(max, path[key] || 0);
    }
  }
  const dist = new Array(max + 1).fill(0);
  for (const row of joint) {
    for (const cell of row) {
      for (const path of cell.values()) dist[path[key] || 0] += path.probability;
    }
  }
  return dist;
}

function jointCombinedMetricDist(joint, keys) {
  if (!joint.healingPaths) return null;
  let max = 0;
  const valueOf = path => keys.reduce((sum, key) => sum + (path[key] || 0), 0);
  for (const row of joint) {
    for (const cell of row) {
      for (const path of cell.values()) max = Math.max(max, valueOf(path));
    }
  }
  const dist = new Array(max + 1).fill(0);
  for (const row of joint) {
    for (const cell of row) {
      for (const path of cell.values()) dist[valueOf(path)] += path.probability;
    }
  }
  return dist;
}

function jointDestroyedProbability(joint, side, fallbackDist, remainingHp) {
  if (!joint.healingPaths) return pDestroyedFrom(fallbackDist, remainingHp);
  let probability = 0;
  for (const row of joint) {
    for (const cell of row) {
      for (const path of cell.values()) {
        if (healingStateAlive(path[side + 'State']) <= 0) probability += path.probability;
      }
    }
  }
  return probability;
}

function addDistProbability(dist, value, probability) {
  const index = Math.max(0, Math.trunc(Number(value) || 0));
  while (dist.length <= index) dist.push(0);
  dist[index] += probability;
}

function applyDamagePhaseWithHealing(joint, phase, pendingFear, units, targetTotalRemHP) {
  const newJoint = emptyJointLike(joint);
  const marginal = new Array(targetTotalRemHP + 1).fill(0);
  let lifeStealEV = 0;
  for (let cumA = 0; cumA < joint.length; cumA++) {
    for (let cumB = 0; cumB < joint[0].length; cumB++) {
      for (const path of joint[cumA][cumB].values()) {
        const sourceState = path[phase.source + 'State'];
        const targetState = path[phase.target + 'State'];
        const sourceAlive = healingStateAlive(sourceState);
        const targetAlive = healingStateAlive(targetState);
        const targetCum = phase.target === 'a' ? cumA : cumB;
        // The displayed cumulative-damage axis remains capped at the target's
        // initial remaining HP, but an intervening Life Steal can restore real
        // HP or add bonus HP. Later ApplyAttack calls must use that revised
        // capacity, not the already-clipped display coordinate.
        const cap = healingStateRemainingHp(targetState);
        if (cap <= 0) {
          addHealingPath(newJoint[cumA][cumB], { ...path });
          marginal[0] += path.probability;
          continue;
        }
        const fearDist = phase.consumesFear ? pendingFear[phase.source + 'FearDist'] : null;
        const out = phase.compute(sourceAlive, targetAlive, cap, fearDist, { sourceState });
        for (const outcome of outcomePaths(out, sourceState)) {
          const probability = path.probability * outcome.probability;
          if (probability < 1e-15) continue;
          let nextPath = applyOutcomeToHealingPath(path, phase.source, outcome);
          nextPath = { ...nextPath, probability,
            [phase.target + 'DamageTaken']:
              nextPath[phase.target + 'DamageTaken'] + outcome.damage,
            [phase.target + 'State']: applyOutcomeDamageToState(
              nextPath[phase.target + 'State'], outcome) };
          const newTargetCum = Math.min(targetCum + outcome.damage, targetTotalRemHP);
          const newCumA = phase.target === 'a' ? newTargetCum : cumA;
          const newCumB = phase.target === 'b' ? newTargetCum : cumB;
          addHealingPath(newJoint[newCumA][newCumB], nextPath);
          addDistProbability(marginal, outcome.damage, probability);
          lifeStealEV += probability
            * ((outcome.healedDamage || 0) + (outcome.bonusHpBenefit || 0));
        }
      }
    }
  }
  return { joint: newJoint, marginal, lifeStealEV };
}

// Apply a damage phase to a 2D joint state.
//   joint: [aRemHP+1][bRemHP+1] PMF
//   phase: { source, target, compute, consumesFear, ... }
//   pendingFear: { aFearDist, bFearDist }; consumed if phase.consumesFear
//   units: { a, b } unit objects (for figs/dmg/hp)
//   targetTotalRemHP: target's bRemHP / aRemHP (initial-cap on target's cum damage this combat)
// Returns { joint: newJoint, marginal, lifeStealEV }
function applyDamagePhase(joint, phase, pendingFear, units, targetTotalRemHP) {
  if (joint.healingPaths) {
    return applyDamagePhaseWithHealing(joint, phase, pendingFear, units, targetTotalRemHP);
  }
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
      const sourceCumDamage = phase.source === 'a' ? cumA : cumB;
      const out = phase.compute(sourceAlive, targetAlive, cap, fearDist,
        { sourceState: combatHealStateFromUnit(sourceUnit, sourceCumDamage) });
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
function applySimultaneousPairWithHealing(joint, subA, subB, pendingFear, units,
                                          aTotalRemHP, bTotalRemHP) {
  const newJoint = emptyJointLike(joint);
  const marginalA = new Array(aTotalRemHP + 1).fill(0);
  const marginalB = new Array(bTotalRemHP + 1).fill(0);
  const fearSamplesA = [], fearSamplesB = [];
  let lifeStealEV_a = 0, lifeStealEV_b = 0;
  for (let cumA = 0; cumA < joint.length; cumA++) {
    for (let cumB = 0; cumB < joint[0].length; cumB++) {
      for (const path of joint[cumA][cumB].values()) {
        const aAlive = healingStateAlive(path.aState);
        const bAlive = healingStateAlive(path.bState);
        const capB = healingStateRemainingHp(path.bState);
        const fearA = subA.consumesFear ? pendingFear[subA.source + 'FearDist'] : null;
        const fearB = subB.consumesFear ? pendingFear[subB.source + 'FearDist'] : null;
        // PerformMeleeAttack calls the initiating attack (and its Haste repeat) before
        // it calls the counter, although all pending damage is dealt afterwards.  Resolve
        // subB's in-call healing first so the counter sees A's revised HP/bonus-HP state;
        // neither attack may see the other's still-pending damage.
        // PerformMeleeAttack invokes every selected melee slot even when its target
        // was killed by an earlier, already-dealt phase.  The compute closure folds
        // damage to zero at cap 0 while still returning that call's fear metadata.
        const outB = subB.compute(aAlive, bAlive, capB, fearB,
          { sourceState: path.aState });
        addWeightedFearSamples(fearSamplesB, outB.fearSamples, path.probability);
        for (const outcomeB of outcomePaths(outB, path.aState)) {
          if (outcomeB.probability < 1e-15) continue;
          if (path.aState && path.aState.engine === 'dos') {
            // DOS main melee and counterattack execute from one frozen battle-unit
            // snapshot. Each call may revise its own source state internally, but
            // neither call observes the other's healing or still-pending damage.
            const capA = healingStateRemainingHp(path.aState);
            const outA = subA.compute(bAlive, aAlive, capA, fearA,
              { sourceState: path.bState });
            addWeightedFearSamples(fearSamplesA, outA.fearSamples,
              path.probability * outcomeB.probability);
            for (const outcomeA of outcomePaths(outA, path.bState)) {
              const probability = path.probability
                * outcomeB.probability * outcomeA.probability;
              if (probability < 1e-15) continue;
              let nextPath = applyOutcomeToHealingPath(path, 'a', outcomeB);
              nextPath = applyOutcomeToHealingPath(nextPath, 'b', outcomeA);
              nextPath = {
                ...nextPath,
                probability,
                aDamageTaken: nextPath.aDamageTaken + outcomeA.damage,
                bDamageTaken: nextPath.bDamageTaken + outcomeB.damage,
                aState: applyOutcomeDamageToState(nextPath.aState, outcomeA),
                bState: applyOutcomeDamageToState(nextPath.bState, outcomeB),
              };
              const newCumA = Math.min(cumA + outcomeA.damage, aTotalRemHP);
              const newCumB = Math.min(cumB + outcomeB.damage, bTotalRemHP);
              addHealingPath(newJoint[newCumA][newCumB], nextPath);
              addDistProbability(marginalA, outcomeA.damage, probability);
              addDistProbability(marginalB, outcomeB.damage, probability);
              lifeStealEV_a += probability * (outcomeB.healedDamage || 0);
              lifeStealEV_b += probability * (outcomeA.healedDamage || 0);
            }
            continue;
          }
          const counterTargetState = outcomeB.state || path.aState;
          const counterTargetAlive = healingStateAlive(counterTargetState);
          const capA = healingStateRemainingHp(counterTargetState);
          const outA = subA.compute(bAlive, counterTargetAlive, capA, fearA,
            { sourceState: path.bState });
          addWeightedFearSamples(fearSamplesA, outA.fearSamples,
            path.probability * outcomeB.probability);
          for (const outcomeA of outcomePaths(outA, path.bState)) {
            const probability = path.probability
              * outcomeB.probability * outcomeA.probability;
            if (probability < 1e-15) continue;
            let nextPath = applyOutcomeToHealingPath(path, 'a', outcomeB);
            nextPath = applyOutcomeToHealingPath(nextPath, 'b', outcomeA);
            nextPath = {
              ...nextPath,
              probability,
              aDamageTaken: nextPath.aDamageTaken + outcomeA.damage,
              bDamageTaken: nextPath.bDamageTaken + outcomeB.damage,
              aState: applyOutcomeDamageToState(nextPath.aState, outcomeA),
              bState: applyOutcomeDamageToState(nextPath.bState, outcomeB),
            };
            const newCumA = Math.min(cumA + outcomeA.damage, aTotalRemHP);
            const newCumB = Math.min(cumB + outcomeB.damage, bTotalRemHP);
            addHealingPath(newJoint[newCumA][newCumB], nextPath);
            addDistProbability(marginalA, outcomeA.damage, probability);
            addDistProbability(marginalB, outcomeB.damage, probability);
            lifeStealEV_a += probability
              * ((outcomeB.healedDamage || 0) + (outcomeB.bonusHpBenefit || 0));
            lifeStealEV_b += probability
              * ((outcomeA.healedDamage || 0) + (outcomeA.bonusHpBenefit || 0));
          }
        }
      }
    }
  }
  return { joint: newJoint, marginalA, marginalB, lifeStealEV_a, lifeStealEV_b,
    fearSamplesA, fearSamplesB };
}

function applySimultaneousPair(joint, subA, subB, pendingFear, units, aTotalRemHP, bTotalRemHP) {
  if (joint.healingPaths) {
    return applySimultaneousPairWithHealing(joint, subA, subB, pendingFear, units,
      aTotalRemHP, bTotalRemHP);
  }
  const newJoint = emptyJointLike(joint);
  const marginalA = new Array(aTotalRemHP + 1).fill(0);   // damage to A this phase
  const marginalB = new Array(bTotalRemHP + 1).fill(0);   // damage to B this phase
  const fearSamplesA = [], fearSamplesB = [];
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
      const outA = subA.compute(bAlive, aAlive, capA, fearA,
        { sourceState: combatHealStateFromUnit(units.b, cumB) });
      const outB = subB.compute(aAlive, bAlive, capB, fearB,
        { sourceState: combatHealStateFromUnit(units.a, cumA) });
      addWeightedFearSamples(fearSamplesA, outA.fearSamples, p);
      addWeightedFearSamples(fearSamplesB, outB.fearSamples, p);
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
  return { joint: newJoint, marginalA, marginalB, lifeStealEV_a, lifeStealEV_b,
    fearSamplesA, fearSamplesB };
}

// Apply a First-Strike-no-Haste block: per cell, FS strike → counter (sequential),
// or simultaneous melee+counter when CoM1 wounded-top-fig HP rule suppresses FS.
// Returns the post-counter joint plus a "post-FS" snapshot used for A-fear marginalisation.
//   joint:      input joint (post-WoF)
//   computes:   { fsStrike, counter } phase compute closures (each takes (sAlive, tAlive, cap))
//   ctx:        { a, b, aRemHP, bRemHP, isCoM1Only }
// Returns { joint, postFsJoint, fsMarginal, counterMarginal, lifeStealEV_a, lifeStealEV_b }.
function applyFsBlockNoHasteWithHealing(joint, computes, ctx) {
  if (!ctx.isCoM1Only) {
    const pendingFear = { aFearDist: null, bFearDist: null };
    const fsPhase = { source: 'a', target: 'b', consumesFear: false,
      compute: computes.fsStrike };
    const counterPhase = { source: 'b', target: 'a', consumesFear: false,
      compute: computes.counter };
    const fs = applyDamagePhaseWithHealing(joint, fsPhase, pendingFear,
      { a: ctx.a, b: ctx.b }, ctx.bRemHP);
    const counter = applyDamagePhaseWithHealing(fs.joint, counterPhase, pendingFear,
      { a: ctx.a, b: ctx.b }, ctx.aRemHP);
    return {
      joint: counter.joint,
      postFsJoint: fs.joint,
      fsMarginal: fs.marginal,
      counterMarginal: counter.marginal,
      lifeStealEV_a: fs.lifeStealEV,
      lifeStealEV_b: counter.lifeStealEV,
    };
  }

  const newJoint = emptyJointLike(joint);
  const postFsJoint = emptyJointLike(joint);
  const fsMarginal = new Array(ctx.bRemHP + 1).fill(0);
  const counterMarginal = new Array(ctx.aRemHP + 1).fill(0);
  let lifeStealEV_a = 0, lifeStealEV_b = 0;
  for (let cumA = 0; cumA < joint.length; cumA++) {
    for (let cumB = 0; cumB < joint[0].length; cumB++) {
      for (const path of joint[cumA][cumB].values()) {
        const aAlive = healingStateAlive(path.aState);
        const bAlive = healingStateAlive(path.bState);
        const capA = healingStateRemainingHp(path.aState);
        const capB = healingStateRemainingHp(path.bState);
        const fsApplies = dosTopFigureRemainingHp(path.bState) <= 24;
        if (fsApplies) {
          const fsOut = computes.fsStrike(aAlive, bAlive, capB, null,
            { sourceState: path.aState });
          for (const fsOutcome of outcomePaths(fsOut, path.aState)) {
            const pFs = path.probability * fsOutcome.probability;
            if (pFs < 1e-15) continue;
            let postFsPath = applyOutcomeToHealingPath(path, 'a', fsOutcome);
            postFsPath = { ...postFsPath, probability: pFs,
              bDamageTaken: postFsPath.bDamageTaken + fsOutcome.damage,
              bState: applyOutcomeDamageToState(postFsPath.bState, fsOutcome) };
            const newCumB = Math.min(cumB + fsOutcome.damage, ctx.bRemHP);
            addHealingPath(postFsJoint[cumA][newCumB], postFsPath);
            addDistProbability(fsMarginal, fsOutcome.damage, pFs);
            lifeStealEV_a += pFs
              * ((fsOutcome.healedDamage || 0) + (fsOutcome.bonusHpBenefit || 0));

            const bAliveAfterFs = healingStateAlive(postFsPath.bState);
            const counterOut = capA > 0 && bAliveAfterFs > 0
              ? computes.counter(bAliveAfterFs, aAlive, capA, null,
                { sourceState: postFsPath.bState })
              : { dist: [1], lifeStealEV: 0 };
            for (const counterOutcome of outcomePaths(counterOut, postFsPath.bState)) {
              const probability = pFs * counterOutcome.probability;
              if (probability < 1e-15) continue;
              let finalPath = applyOutcomeToHealingPath(postFsPath, 'b', counterOutcome);
              finalPath = { ...finalPath, probability,
                aDamageTaken: finalPath.aDamageTaken + counterOutcome.damage,
                aState: applyOutcomeDamageToState(finalPath.aState, counterOutcome) };
              addHealingPath(
                newJoint[Math.min(cumA + counterOutcome.damage, ctx.aRemHP)][newCumB],
                finalPath,
              );
              addDistProbability(counterMarginal, counterOutcome.damage, probability);
              lifeStealEV_b += probability
                * ((counterOutcome.healedDamage || 0)
                  + (counterOutcome.bonusHpBenefit || 0));
            }
          }
          continue;
        }

        // Suppressed CoM First Strike falls through to a simultaneous main/counter pair.
        const mainOut = computes.fsStrike(aAlive, bAlive, capB, null,
          { sourceState: path.aState });
        const counterOut = capA > 0 && bAlive > 0
          ? computes.counter(bAlive, aAlive, capA, null,
            { sourceState: path.bState })
          : { dist: [1], lifeStealEV: 0 };
        addHealingPath(postFsJoint[cumA][cumB], { ...path });
        for (const mainOutcome of outcomePaths(mainOut, path.aState)) {
          if (mainOutcome.probability < 1e-15) continue;
          for (const counterOutcome of outcomePaths(counterOut, path.bState)) {
            const probability = path.probability * mainOutcome.probability
              * counterOutcome.probability;
            if (probability < 1e-15) continue;
            let finalPath = applyOutcomeToHealingPath(path, 'a', mainOutcome);
            finalPath = applyOutcomeToHealingPath(finalPath, 'b', counterOutcome);
            finalPath = { ...finalPath, probability,
              aDamageTaken: finalPath.aDamageTaken + counterOutcome.damage,
              bDamageTaken: finalPath.bDamageTaken + mainOutcome.damage,
              aState: applyOutcomeDamageToState(finalPath.aState, counterOutcome),
              bState: applyOutcomeDamageToState(finalPath.bState, mainOutcome) };
            addHealingPath(
              newJoint[Math.min(cumA + counterOutcome.damage, ctx.aRemHP)]
                [Math.min(cumB + mainOutcome.damage, ctx.bRemHP)],
              finalPath,
            );
            addDistProbability(fsMarginal, mainOutcome.damage, probability);
            addDistProbability(counterMarginal, counterOutcome.damage, probability);
            lifeStealEV_a += probability
              * ((mainOutcome.healedDamage || 0) + (mainOutcome.bonusHpBenefit || 0));
            lifeStealEV_b += probability
              * ((counterOutcome.healedDamage || 0)
                + (counterOutcome.bonusHpBenefit || 0));
          }
        }
      }
    }
  }
  return { joint: newJoint, postFsJoint, fsMarginal, counterMarginal,
    lifeStealEV_a, lifeStealEV_b };
}

function applyFsBlockNoHaste(joint, computes, ctx) {
  if (joint.healingPaths) return applyFsBlockNoHasteWithHealing(joint, computes, ctx);
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
        const fsOut = computes.fsStrike(aAliveL, bAliveL, capB, null,
          { sourceState: combatHealStateFromUnit(ctx.a, cumA) });
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
          const counterOut = computes.counter(bAliveAfterFS, aAliveL, capA, null,
            { sourceState: combatHealStateFromUnit(ctx.b, newCumB) });
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
        const mOut = computes.fsStrike(aAliveL, bAliveL, capB, null,
          { sourceState: combatHealStateFromUnit(ctx.a, cumA) });
        const cOut = (capA > 0 && bAliveL > 0)
          ? computes.counter(bAliveL, aAliveL, capA, null,
            { sourceState: combatHealStateFromUnit(ctx.b, cumB) })
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
// coupleKa: for the legacy shared-sample path, sample k_a once and use the SAME k_a
// for both FS strike and 2nd strike. Modern callers leave this false because every
// ApplyAttack call samples Cause Fear independently.
// Returns { joint, postFsJoint, fsMarginal, secondMarginal, counterMarginal, lifeStealEV_a, lifeStealEV_b }.
function applyFsBlockHasteCoupledWithHealing(joint, computes, ctx) {
  const newJoint = emptyJointLike(joint);
  const postFsJoint = emptyJointLike(joint);
  const fsMarginal = new Array(ctx.bRemHP + 1).fill(0);
  const secondMarginal = new Array(ctx.bRemHP + 1).fill(0);
  const counterMarginal = new Array(ctx.aRemHP + 1).fill(0);
  let lifeStealEV_a = 0, lifeStealEV_b = 0;
  for (let cumA = 0; cumA < joint.length; cumA++) {
    for (let cumB = 0; cumB < joint[0].length; cumB++) {
      for (const path of joint[cumA][cumB].values()) {
        const fsApplies = !ctx.isCoM1Only || dosTopFigureRemainingHp(path.bState) <= 24;
        if (!fsApplies) {
          // CoM 6.08 falls through to one simultaneous main/counter exchange.
          // Both calls read the frozen pre-exchange records, while each keeps its
          // own in-call Life Steal transition before pending damage is committed.
          const aAlive = healingStateAlive(path.aState);
          const bAlive = healingStateAlive(path.bState);
          const capA = healingStateRemainingHp(path.aState);
          const capB = healingStateRemainingHp(path.bState);
          const mainOut = computes.fsStrike(aAlive, bAlive, capB, null,
            { sourceState: path.aState });
          const counterOut = capA > 0 && bAlive > 0
            ? computes.counter(bAlive, aAlive, capA, null,
              { sourceState: path.bState })
            : { dist: [1], lifeStealEV: 0 };
          addHealingPath(postFsJoint[cumA][cumB], { ...path });
          for (const mainOutcome of outcomePaths(mainOut, path.aState)) {
            if (mainOutcome.probability < 1e-15) continue;
            for (const counterOutcome of outcomePaths(counterOut, path.bState)) {
              const probability = path.probability * mainOutcome.probability
                * counterOutcome.probability;
              if (probability < 1e-15) continue;
              let finalPath = applyOutcomeToHealingPath(path, 'a', mainOutcome);
              finalPath = applyOutcomeToHealingPath(finalPath, 'b', counterOutcome);
              finalPath = {
                ...finalPath,
                probability,
                aDamageTaken: finalPath.aDamageTaken + counterOutcome.damage,
                bDamageTaken: finalPath.bDamageTaken + mainOutcome.damage,
                aState: applyOutcomeDamageToState(finalPath.aState, counterOutcome),
                bState: applyOutcomeDamageToState(finalPath.bState, mainOutcome),
              };
              addHealingPath(
                newJoint[Math.min(cumA + counterOutcome.damage, ctx.aRemHP)]
                  [Math.min(cumB + mainOutcome.damage, ctx.bRemHP)],
                finalPath,
              );
              addDistProbability(fsMarginal, mainOutcome.damage, probability);
              addDistProbability(secondMarginal, 0, probability);
              addDistProbability(counterMarginal, counterOutcome.damage, probability);
              lifeStealEV_a += probability
                * ((mainOutcome.healedDamage || 0) + (mainOutcome.bonusHpBenefit || 0));
              lifeStealEV_b += probability
                * ((counterOutcome.healedDamage || 0)
                  + (counterOutcome.bonusHpBenefit || 0));
            }
          }
          continue;
        }
        const aAlive = healingStateAlive(path.aState);
        const bAlive = healingStateAlive(path.bState);
        const capA = healingStateRemainingHp(path.aState);
        const capB = healingStateRemainingHp(path.bState);
        const fearKDist = calcFearDist(aAlive, ctx.aPFear);
        for (let k = 0; k <= aAlive; k++) {
          const pK = fearKDist[k];
          if (pK < 1e-15) continue;
          const fsOut = computes.aStrikeNoFear(k, bAlive, capB, null,
            { sourceState: path.aState });
          for (const fsOutcome of outcomePaths(fsOut, path.aState)) {
            const pFs = path.probability * pK * fsOutcome.probability;
            if (pFs < 1e-15) continue;
            let postFsPath = applyOutcomeToHealingPath(path, 'a', fsOutcome);
            postFsPath = { ...postFsPath, probability: pFs,
              bDamageTaken: postFsPath.bDamageTaken + fsOutcome.damage,
              bState: applyOutcomeDamageToState(postFsPath.bState, fsOutcome) };
            const newCumB = Math.min(cumB + fsOutcome.damage, ctx.bRemHP);
            addHealingPath(postFsJoint[cumA][newCumB], postFsPath);
            addDistProbability(fsMarginal, fsOutcome.damage, pFs);
            lifeStealEV_a += pFs
              * ((fsOutcome.healedDamage || 0) + (fsOutcome.bonusHpBenefit || 0));

            const bAliveAfterFs = healingStateAlive(postFsPath.bState);
            const capBAfterFs = healingStateRemainingHp(postFsPath.bState);
            const counterOut = capA > 0 && bAliveAfterFs > 0
              ? computes.counter(bAliveAfterFs, aAlive, capA, null,
                { sourceState: postFsPath.bState })
              : { dist: [1], lifeStealEV: 0 };
            const secondOut = k > 0 && capBAfterFs > 0
              ? computes.aStrikeNoFear(k, bAliveAfterFs, capBAfterFs, null,
                { sourceState: postFsPath.aState })
              : { dist: [1], lifeStealEV: 0 };
            for (const counterOutcome of outcomePaths(counterOut, postFsPath.bState)) {
              if (counterOutcome.probability < 1e-15) continue;
              for (const secondOutcome of outcomePaths(secondOut, postFsPath.aState)) {
                const probability = pFs * counterOutcome.probability
                  * secondOutcome.probability;
                if (probability < 1e-15) continue;
                let finalPath = applyOutcomeToHealingPath(postFsPath, 'b', counterOutcome);
                finalPath = applyOutcomeToHealingPath(finalPath, 'a', secondOutcome);
                finalPath = {
                  ...finalPath,
                  probability,
                  aDamageTaken: finalPath.aDamageTaken + counterOutcome.damage,
                  bDamageTaken: finalPath.bDamageTaken + secondOutcome.damage,
                  aState: applyOutcomeDamageToState(finalPath.aState, counterOutcome),
                  bState: applyOutcomeDamageToState(finalPath.bState, secondOutcome),
                };
                const newCumA = Math.min(cumA + counterOutcome.damage, ctx.aRemHP);
                const finalCumB = Math.min(newCumB + secondOutcome.damage, ctx.bRemHP);
                addHealingPath(newJoint[newCumA][finalCumB], finalPath);
                addDistProbability(counterMarginal, counterOutcome.damage, probability);
                addDistProbability(secondMarginal, secondOutcome.damage, probability);
                lifeStealEV_a += probability
                  * ((secondOutcome.healedDamage || 0)
                    + (secondOutcome.bonusHpBenefit || 0));
                lifeStealEV_b += probability
                  * ((counterOutcome.healedDamage || 0)
                    + (counterOutcome.bonusHpBenefit || 0));
              }
            }
          }
        }
      }
    }
  }
  return { joint: newJoint, postFsJoint, fsMarginal, secondMarginal,
    counterMarginal, lifeStealEV_a, lifeStealEV_b };
}

function applyFsBlockHasteWithHealing(joint, computes, ctx) {
  if (ctx.coupleKa || ctx.isCoM1Only) {
    return applyFsBlockHasteCoupledWithHealing(joint, computes, ctx);
  }
  const pendingFear = { aFearDist: null, bFearDist: null };
  const fsPhase = { source: 'a', target: 'b', consumesFear: false,
    compute: computes.fsStrike };
  const counterPhase = { source: 'b', target: 'a', consumesFear: false,
    compute: computes.counter };
  const secondPhase = { source: 'a', target: 'b', consumesFear: false,
    compute: computes.secondStrike };
  const fs = applyDamagePhaseWithHealing(joint, fsPhase, pendingFear,
    { a: ctx.a, b: ctx.b }, ctx.bRemHP);
  const pair = applySimultaneousPairWithHealing(fs.joint, counterPhase, secondPhase,
    pendingFear, { a: ctx.a, b: ctx.b }, ctx.aRemHP, ctx.bRemHP);
  return {
    joint: pair.joint,
    postFsJoint: fs.joint,
    fsMarginal: fs.marginal,
    secondMarginal: pair.marginalB,
    counterMarginal: pair.marginalA,
    lifeStealEV_a: fs.lifeStealEV + pair.lifeStealEV_a,
    lifeStealEV_b: pair.lifeStealEV_b,
  };
}

function applyFsBlockHaste(joint, computes, ctx) {
  if (joint.healingPaths) return applyFsBlockHasteWithHealing(joint, computes, ctx);
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
            const fsOut = computes.aStrikeNoFear(k_a, bAliveL, capB, null,
              { sourceState: combatHealStateFromUnit(ctx.a, cumA) });
            const fsPaths = fsOut.outcomes || fsOut.dist.map((probability, damage) => (
              { probability, damage, state: combatHealStateFromUnit(ctx.a, cumA) }));
            for (const fsPath of fsPaths) {
              const fsDmg = fsPath.damage;
              const pFs = fsPath.probability;
              if (pFs < 1e-15) continue;
              const newCumB = Math.min(cumB + fsDmg, ctx.bRemHP);
              const bAliveAfterFS = aliveCount(ctx.b, newCumB);
              const capBAfterFS = ctx.bRemHP - newCumB;
              fsMarginal[Math.min(fsDmg, ctx.bRemHP)] += p * pK * pFs;
              postFsJoint[cumA][newCumB] += p * pK * pFs;
              const counterOut = (capA > 0 && bAliveAfterFS > 0)
                ? computes.counter(bAliveAfterFS, aAliveL, capA, null,
                  { sourceState: combatHealStateFromUnit(ctx.b, newCumB) })
                : { dist: [1], lifeStealEV: 0 };
              const secondOut = (k_a > 0 && capBAfterFS > 0)
                ? computes.aStrikeNoFear(k_a, bAliveAfterFS, capBAfterFS, null,
                  { sourceState: fsPath.state })
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
          const fsOut = computes.fsStrike(aAliveL, bAliveL, capB, null,
            { sourceState: combatHealStateFromUnit(ctx.a, cumA) });
          const fsPaths = fsOut.outcomes || fsOut.dist.map((probability, damage) => (
            { probability, damage, state: combatHealStateFromUnit(ctx.a, cumA) }));
          for (const fsPath of fsPaths) {
            const fsDmg = fsPath.damage;
            const pFs = fsPath.probability;
            if (pFs < 1e-15) continue;
            const newCumB = Math.min(cumB + fsDmg, ctx.bRemHP);
            const bAliveAfterFS = aliveCount(ctx.b, newCumB);
            const capBAfterFS = ctx.bRemHP - newCumB;
            fsMarginal[Math.min(fsDmg, ctx.bRemHP)] += p * pFs;
            postFsJoint[cumA][newCumB] += p * pFs;
            const counterOut = (capA > 0 && bAliveAfterFS > 0)
              ? computes.counter(bAliveAfterFS, aAliveL, capA, null,
                { sourceState: combatHealStateFromUnit(ctx.b, newCumB) })
              : { dist: [1], lifeStealEV: 0 };
            const secondOut = (aAliveL > 0 && capBAfterFS > 0)
              ? computes.secondStrike(aAliveL, bAliveAfterFS, capBAfterFS, null,
                { sourceState: fsPath.state })
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
        const mOut = computes.fsStrike(aAliveL, bAliveL, capB, null,
          { sourceState: combatHealStateFromUnit(ctx.a, cumA) });
        const cOut = (capA > 0 && bAliveL > 0)
          ? computes.fallthroughCounter(bAliveL, aAliveL, capA, null,
            { sourceState: combatHealStateFromUnit(ctx.b, cumB) })
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
    for (let j = 0; j < row.length; j++) s += jointCellProbability(row[j]);
    out[i] = s;
  }
  return out;
}

function marginalB(joint) {
  const cols = joint[0].length;
  const out = new Array(cols).fill(0);
  for (let i = 0; i < joint.length; i++) {
    const row = joint[i];
    for (let j = 0; j < cols; j++) out[j] += jointCellProbability(row[j]);
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
                      ? exorciseFailProb(otherResM, other.abilities, other.unitType, exorcise, ver) : 0,
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
// DOS BU_ProcessAttack merges its ranged flag record into every non-melee call, including
// Gazes. Modern ApplyAttack attack types 6–8 jump past all six riders, so their routed
// records remain available to other phases but are inert here.
// Returns raw probs plus `*With` booleans gated on the gaze actually being active.
function gazeTouchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison, gazeActive, selfSleep, ver) {
  const modernGazeSkipsRiders = ver === 'com2_1.05.11' || ver === 'com2_warlord_1.5.12.7';
  const touch = touchParams(self, other, otherResM, otherResDeath, otherResStoning, otherResPoison,
    ver, true, touchRecordForPhase(ver, 'gaze'));
  // The modern jump skips exactly the six ApplyAttack riders reconstructed in the frozen
  // evidence. Dispel Evil is a separate calculator effect and retains its prior routing.
  const poisonStr = modernGazeSkipsRiders ? 0 : touch.poisonStr;
  const poisonFail = modernGazeSkipsRiders ? 0 : touch.poisonFail;
  const stoningFail = modernGazeSkipsRiders ? 0 : touch.stoningFail;
  const deathTouchFail = modernGazeSkipsRiders ? 0 : touch.deathTouchFail;
  const dispelEvilFail = touch.dispelEvilFail;
  const exorciseFail = modernGazeSkipsRiders ? 0 : touch.exorciseFail;
  const destructionFail = modernGazeSkipsRiders ? 0 : touch.destructionFail;
  const lifeStealMod = modernGazeSkipsRiders ? null : touch.lifeStealMod;
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
// PROVENANCE[doomAttackStrengthModifiers]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:23:b0c6213a0d9c2c2e5d3f54ec | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:34:935a71829ffc2ed26b56056c | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:30:b0c2bd6060999b364362d31d | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:ede4f7dc06908e75ecaa412b | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:02e6fff5e548271398f1d598 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:9:d4b5090bf579662a98cef0d9 | Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:10:57c912964ac8750b69987067 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:21fdd7af4a50407f32527bbf | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:21fdd7af4a50407f32527bbf
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

// Calculator orchestration over individually classified source-authored transforms. M7 owns
// retiring the remaining transitional transforms; this wrapper is not itself an engine formula.
function normalizeCombatUnit(unit, version) {
  // Derived calculator records carry the raw BaseUnits flag explicitly. Plain resolver callers
  // predate that boundary, so an omitted marker means their supplied Death Immunity is intrinsic.
  const baseDeathImmunity = unit.baseDeathImmunity == null
    ? hasAbil(unit.abilities, 'deathImmunity')
    : !!unit.baseDeathImmunity;
  let normalized = applyBloodLustEffects(unit, version);
  normalized = applyVampirismEffects(normalized, version);
  normalized = applyRevenantEffects(normalized, version);
  normalized = applyAnimatedEffects(normalized, version);
  normalized = applyUndeadImmunities(normalized, version);
  normalized = applyBlackChannelsEffects(normalized);
  normalized = applyRebuildEffects(normalized, version);
  normalized = applyFieryFuryEffects(normalized, version);
  normalized = applyZealEffects(normalized, version);
  normalized = applyTemporalTwistEffects(normalized, version);
  normalized = applyTacticianWarlordEffects(normalized, version);
  normalized = applyDoomUAHalving(normalized, version);
  const carriesExtraHits = usesStatefulCombatHealing(version);
  const extraHitsCap = version === 'com_6.08' || (version && version.startsWith('com2_'))
    ? 90 : 255;
  const modernBonusHp = carriesExtraHits
    ? Math.min(extraHitsCap,
      Math.max(0, Math.trunc(Number(normalized.baseBonusHp) || 0))) : 0;
  const withType = Object.assign({}, normalized, {
    combatVersion: version,
    baseDeathImmunity,
    combatBaseHp: normalized.combatBaseHp || normalized.hp,
    baseBonusHp: modernBonusHp,
    hp: normalized.hp + modernBonusHp,
    noHealing: !!normalized.noHealing
      || hasAbil(normalized.abilities, 'undead')
      || hasAbil(normalized.abilities, 'animated')
      || hasAbil(normalized.abilities, 'mysticSurge'),
    unitType: determineEffectiveUnitType(normalized.unitType, normalized.abilities, version,
      normalized.identity || {
        baseFantastic: normalized.baseFantastic,
        isHero: normalized.isHero,
      }),
  });
  // Angelic Guardians grants/improves Exorcise based on the finalized realm.
  const withGuardians = applyAngelicGuardiansEffects(withType, version);
  return applyWarlordTouchFlagPlacement(withGuardians, version);
}

function combatHealStateFromUnit(unit, additionalDamage = 0) {
  const baseTotal = Math.max(0, Math.trunc(Number(unit.totalDamage ?? unit.dmg) || 0));
  const totalDamage = baseTotal + Math.max(0, Math.trunc(Number(additionalDamage) || 0));
  if (usesDosCombatHealing(unit.combatVersion)) {
    return normalizeDosCombatHealState({
      version: unit.combatVersion,
      figures: unit.figs,
      baseHp: unit.combatBaseHp || unit.hp,
      totalDamage,
      irreversibleDamage: Math.min(baseTotal,
        Math.max(0, Math.trunc(Number(unit.irrecoverableDamage) || 0))),
      undeadDamage: Math.min(baseTotal,
        Math.max(0, Math.trunc(Number(unit.undeadDamage) || 0))),
      extraHits: unit.baseBonusHp,
    });
  }
  return normalizeCombatHealState({
    figures: unit.figs,
    hp: unit.combatBaseHp || unit.hp,
    totalDamage,
    irrecoverableDamage: Math.min(baseTotal,
      Math.max(0, Math.trunc(Number(unit.irrecoverableDamage) || 0))),
    undeadDamage: Math.min(baseTotal,
      Math.max(0, Math.trunc(Number(unit.undeadDamage) || 0))),
    bonusHp: unit.baseBonusHp,
    noHealing: unit.noHealing,
    raceNoHeal: unit.raceNoHeal,
  });
}

// PROVENANCE[pairToHitModifiers]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:1ff32cf14236f60c8659c472 | Reference docs/DOS reconstructed/unitcalc.c@span:40:7a990661f197312ddc553d16 | Reference docs/DOS reconstructed/combat.c@span:20:cb4fa9e7501e8b1aefe9a152 | Reference docs/DOS reconstructed/combat.c@span:28:50bbe6203a794ed0191be832 | Reference docs/DOS reconstructed/combat.c@span:12:0485456526aaa82ac1801b1c | Reference docs/DOS reconstructed/combat.c@span:17:c3f9b1d6c7b49267895ba012 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:11:b08aaa1432383a78ae466dd0
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
  const aVertigo = hasAbil(a.abilities, 'vertigo')
    && !hasAbil(a.abilities, 'illusionImmunity') && !hasAbil(a.abilities, 'magicImmunity');
  const bVertigo = hasAbil(b.abilities, 'vertigo')
    && !hasAbil(b.abilities, 'illusionImmunity') && !hasAbil(b.abilities, 'magicImmunity');

  return {
    isCoM,
    // Persistent Hit/To Defend penalties were already applied by recalculation. Only MoM's
    // separate -1 Defense-die projection remains resolution-time state here.
    aToHitMeleeVert: a.toHitMelee,
    bToHitMeleeVert: b.toHitMelee,
    aToHitRtbVert: a.toHitRtb,
    bToHitRtbVert: b.toHitRtb,
    aVertigoDefPenalty: !isCoM && aVertigo ? 1 : 0,
    bVertigoDefPenalty: !isCoM && bVertigo ? 1 : 0,
    aVertigoBlockPenalty: 0,
    bVertigoBlockPenalty: 0,
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
// PROVENANCE[resolutionResistanceContext]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:34:f8439a410123d6cce14590d2 | Reference docs/DOS reconstructed/combat.c@span:39:dbb4cbc9b3c3b594fa500562 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:21:f4adc7d2f65b9cfc509a10b0 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:18:78623ea798a8f277b575ffcd | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:35:575882ffecd40ed0b3c1ac6f | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:40:6e6d5d731c162207114b446a | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:21:ebeef9a1796d93992d2edd16 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:3:480d9a786f490a899b5cb259 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:0ae9bd687c26c112798c0947
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
// PROVENANCE[resolutionToBlockContext]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:988ef64cd77214c23cb77397 | Reference docs/DOS reconstructed/combat.c@span:22:f1bd863bb2e19d690ca89983 | Reference docs/DOS reconstructed/combat.c@span:17:168e451097f43626bf9c9d57 | Reference docs/DOS reconstructed/combat.c@span:13:ee0ffb0fdc5af4e30c63a285 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:12:08b392da258c1aa5831668e7 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:34f14a18e857be474ba8f10a | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:ede4f7dc06908e75ecaa412b | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:4:2cb725296f6895640edcf211 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:ce6c3e49e9933d68f63f9666 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:ce6c3e49e9933d68f63f9666
function buildToBlockContext(a, b, aVertigoBlockPenalty, bVertigoBlockPenalty, version = null) {
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

  const modernProfile = chance => version && version.startsWith('com2_')
    ? { chance, capDice: 15, cappedChance: 0.30 }
    : chance;
  return {
    bToBlockConventional: modernProfile(bToBlockConventional),
    aToBlockConventional: modernProfile(aToBlockConventional),
    bToBlockVsAAll: modernProfile(bToBlockVsAAll),
    aToBlockVsBAll: modernProfile(aToBlockVsBAll),
    bToBlockVsAMelee: modernProfile(aEW ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll),
    bToBlockVsAThrEW: modernProfile((aEW && a.thrownType === 'thrown') ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll),
    bToBlockVsARangedEW: modernProfile((aEW && a.rangedType === 'missile') ? Math.max(0, bToBlockVsAAll - 0.10) : bToBlockVsAAll),
    aToBlockVsBMelee: modernProfile(bEW ? Math.max(0, aToBlockVsBAll - 0.10) : aToBlockVsBAll),
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
    aAbilities,
    amplifiedDamage,
    version,
  } = params;

  // Wall of Fire damage to A using A's defense profile vs immolation. Touch-free.
  // Warlord makes one non-Area spill-capable attack; all other versions use Area iterations.
  return {
    kind: 'damage',
    source: 'a',
    target: 'a',
    consumesFear: false,
    compute: (_sAlive, tAlive, cap) => {
      if (tAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      const targetFigs = wofSingleFigure ? 1 : tAlive;
      return {
        dist: calcDamageSpellDist(targetFigs, wofStr, wofToHit, aDefForImm, aToBlock,
          aHP, cap, aInvulnBonus, null, woundedTopFigHP(cap, aHP), version, aAbilities,
          !wofSingleFigure, false, amplifiedDamage),
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
    version,
  } = params;

  // Thrown / breath: A->B, fires before melee. Touch attacks fold in. Haste self-convolves.
  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      if (sAlive <= 0 || cap <= 0 || aBlackSleep) return { dist: [1], lifeStealEV: 0 };
      let dist = a.rtb > 0
        ? (aDoomsB ? calcDoomDist(sAlive, a.rtb, cap)
          : calcTotalDamageDist(sAlive, a.rtb, aToHitRtbVert, bDefForThrown, bToBlockVsAThrEW, b.hp, cap, bInvulnBonus, bBlurChance, blurBuggy,
              isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, aMinDamageFromHits))
        : [1];
      const aImmTDist = (aImmWithThrown && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
          bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits,
          woundedTopFigHP(cap, b.hp), version, b.abilities)
        : null;
      const touchSpec = {
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
        sourceState: usesStatefulCombatHealing(version)
          ? (context.sourceState || combatHealStateFromUnit(a)) : null,
        version,
      };
      let t = convolveTouchAttacks(dist, cap, sAlive, touchSpec);
      if (aHaste) t = repeatTouchAttack(t, dist, cap, sAlive, touchSpec);
      return t;
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
    aFearProbability,
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
    version,
  } = params;

  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      const fearD = aFearForCell(sAlive, tAlive);
      // ApplyAttack zeroes Black-Sleeping sources before its Cause Fear loop.
      // A dead target does not suppress the call or that loop; only zero source
      // figures do, so cap=0 still carries a real feared-count sample.
      const firstFearedDist = aBlackSleep ? [1] : fearedCountDist(fearD, sAlive);
      if (sAlive <= 0 || cap <= 0 || (isCoM2 && aBlackSleep)) {
        return { dist: [1], lifeStealEV: 0,
        fearSamples: aHaste
          ? [firstFearedDist, firstFearedDist]
          : [firstFearedDist] };
      }
      if (destroyMechanicalApplies(a, b, aBlackSleep ? 0 : aMeleeAtkVsB)) {
        return { dist: deterministicKillDist(cap), lifeStealEV: 0,
          fearSamples: aHaste ? [firstFearedDist, firstFearedDist] : [firstFearedDist] };
      }
      const aImmMDist = (aImmWithMelee && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
          bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits,
          woundedTopFigHP(cap, b.hp), version, b.abilities)
        : null;
      const o = calcMeleeTouchOutcome(fearD, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
        bDefVsA, bToBlockVsAMelee, b.hp, cap,
        aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aDestructionFailM, aLifeStealModM, bResDeath,
        aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, aHaste,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
        aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'), version,
        usesStatefulCombatHealing(version)
          ? (context.sourceState || combatHealStateFromUnit(a)) : null,
        isCoM2 ? aFearProbability : null);
      return { ...o, dist: o.damageDist,
        fearSamples: aHaste
          ? [firstFearedDist,
            aBlackSleep ? [1] : (o.repeatFearedDist || firstFearedDist)]
          : [firstFearedDist] };
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
    version,
  } = params;

  return {
    kind: 'damage',
    source: 'b',
    target: 'a',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      const fearD = bFearForCell(sAlive);
      const fearedDist = bBlackSleep ? [1] : fearedCountDist(fearD, sAlive);
      if (sAlive <= 0 || cap <= 0 || (isCoM2 && bBlackSleep)) {
        return { dist: [1], lifeStealEV: 0, fearSamples: [fearedDist] };
      }
      if (destroyMechanicalApplies(b, a, bBlackSleep ? 0 : bMeleeAtkVsA)) {
        return { dist: deterministicKillDist(cap), lifeStealEV: 0,
          fearSamples: [fearedDist] };
      }
      const bImmMDist = (bImmWithMelee && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, b.toHitImmolation, aDefForImm,
          aToBlockVsBAll, a.hp, cap, aInvulnBonus, bMinDamageFromHits,
          woundedTopFigHP(cap, a.hp), version, a.abilities)
        : null;
      const o = calcMeleeTouchOutcome(fearD, sAlive, bDoomsA, bBlackSleep ? 0 : applyRage(bMeleeAtkVsA, b, sAlive), bToHitMeleeVert,
        aDefVsB, aToBlockVsBMelee, a.hp, cap,
        bPoisonStrM, bPoisonFailM, bStoningFailM, bDeathTouchFailM, bDispelEvilFailM, bExorciseFailM, bDestructionFailM, bLifeStealModM, aResDeath,
        bImmMDist, aInvulnBonus, aBlurChance, blurBuggy, bCounterHaste,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined,
        bMinDamageFromHits, hasAbil(b.abilities, 'bloodSucker'), version,
        usesStatefulCombatHealing(version)
          ? (context.sourceState || combatHealStateFromUnit(b)) : null);
      return { ...o, dist: o.damageDist, fearSamples: [fearedDist] };
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
    version,
  } = params;

  // All three FS-block strike computes are the same single A→B melee strike
  // (no doubleStrike — the FS block sequences strikes itself); they differ only
  // in which fear distribution applies. `fearFor` maps (sAlive, tAlive) to the
  // fear PMF over A's unfeared count, or null for no fear.
  const makeAStrike = (fearFor) => (sAlive, tAlive, cap, _fearDist, context = {}) => {
    const fearDist = fearFor(sAlive, tAlive);
    const fearedDist = aBlackSleep ? [1] : fearedCountDist(fearDist, sAlive);
    if (sAlive <= 0 || cap <= 0 || (isCoM2 && aBlackSleep)) {
      return { dist: [1], lifeStealEV: 0, fearSamples: [fearedDist] };
    }
    if (destroyMechanicalApplies(a, b, aBlackSleep ? 0 : aMeleeAtkVsB)) {
      return { dist: deterministicKillDist(cap), lifeStealEV: 0,
        fearSamples: [fearedDist] };
    }
    const aImmMDist = (aImmWithMelee && tAlive > 0)
      ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
        bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits,
        woundedTopFigHP(cap, b.hp), version, b.abilities)
      : null;
    const o = calcMeleeTouchOutcome(fearDist, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
      bDefVsA, bToBlockVsAMelee, b.hp, cap,
      aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aDestructionFailM, aLifeStealModM, bResDeath,
      aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, false /* doubleStrike */,
      isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
      aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'), version,
      usesStatefulCombatHealing(version)
        ? (context.sourceState || combatHealStateFromUnit(a)) : null);
    return { ...o, dist: o.damageDist, fearSamples: [fearedDist] };
  };

  return {
    // FS strike: fear is aFearedByB only (no aFearBug — that fires after FS).
    // Used for both no-Haste FS and FS+Haste FS strike.
    fsStrikeCompute: makeAStrike((sAlive) => aFearedByB ? calcFearDist(sAlive, aPFear) : null),
    // Hasted 2nd strike: full A-side fear (aFearForCell, includes aFearBug).
    secondStrikeCompute: makeAStrike((sAlive, tAlive) => aFearForCell(sAlive, tAlive)),
    // No-fear strike: caller passes in k_a as sAlive (fear pre-sampled). Used when
    // Legacy FS+Haste can share one pre-sampled fear count across both strikes.
    aStrikeNoFear: makeAStrike(() => null),
  };
}

function buildAttackerGazePhase(active, params) {
  if (!active) return null;
  const {
    a,
    b,
    aStoningGazeActiveP,
    aDeathGazeActiveP,
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
    version,
  } = params;

  // Attacker gaze A->B. Source = A's surviving figs; target = B.
  return {
    kind: 'damage',
    source: 'a',
    target: 'b',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      if (isCoM2) {
        const steps = [];
        let dispelEvilPending = aDispelEvilWithGaze ? aDispelEvilFailG : 0;
        const nextGazeSpec = (extra = {}) => {
          const spec = { ...commonSpec, dispelEvilFail: dispelEvilPending, ...extra };
          dispelEvilPending = 0;
          return spec;
        };
        const commonSpec = {
          poisonStr: 0, poisonFail: 0, stoningFail: 0, deathTouchFail: 0,
          dispelEvilFail: 0, exorciseFail: 0, destructionFail: 0,
          targetHP: b.hp, lifeStealMod: null, lifeStealRes: bResDeath,
          immDist: null, bloodsucker: hasAbil(a.abilities, 'bloodSucker'), version,
        };
        if (aStoningGazeActiveP) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(a, b, stepAlive, Math.max(0, Math.ceil(remaining / b.hp)),
              remaining, aStoningGazeFailP, 0, 0, bDefForGaze, bInvulnBonus,
              bBlurChance, blurBuggy, woundedTopFigHP(remaining, b.hp), false,
              bToBlockVsAAll, aMinDamageFromHits),
            atkFigs: stepAlive,
            spec: nextGazeSpec({ baseDamageCategory: 'irrecoverableDamage' }),
          }));
        }
        if (aDeathGazeActiveP) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(a, b, stepAlive, Math.max(0, Math.ceil(remaining / b.hp)),
              remaining, 0, aDeathGazeFailP, 0, bDefForGaze, bInvulnBonus,
              bBlurChance, blurBuggy, woundedTopFigHP(remaining, b.hp), false,
              bToBlockVsAAll, aMinDamageFromHits),
            atkFigs: stepAlive,
            spec: nextGazeSpec(),
          }));
        }
        if (aGazeDoomStrP > 0) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(a, b, stepAlive, Math.max(0, Math.ceil(remaining / b.hp)),
              remaining, 0, 0, aGazeDoomStrP, bDefForGaze, bInvulnBonus,
              bBlurChance, blurBuggy, woundedTopFigHP(remaining, b.hp), bBlackSleep,
              bToBlockVsAAll, aMinDamageFromHits),
            atkFigs: 1,
            spec: nextGazeSpec(),
          }));
        }
        return sequenceTouchApplyAttacks(steps, cap,
          context.sourceState || combatHealStateFromUnit(a));
      }
      let dist = buildGazeDist(a, b, sAlive, tAlive, cap, aStoningGazeFailP, aDeathGazeFailP, aGazeDoomStrP, bDefForGaze, bInvulnBonus, bBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, bBlackSleep, bToBlockVsAAll, aMinDamageFromHits);
      const aImmGDist = (aImmWithGaze && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, a.toHitImmolation, bDefForImm,
          bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits,
          woundedTopFigHP(cap, b.hp), version, b.abilities)
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
        sourceState: usesStatefulCombatHealing(version)
          ? (context.sourceState || combatHealStateFromUnit(a)) : null,
        version,
      });
      return t;
    },
  };
}

function buildDefenderGazePhase(active, params) {
  if (!active) return null;
  const {
    a,
    b,
    bStoningGazeActiveP,
    bDeathGazeActiveP,
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
    version,
  } = params;

  // Defender gaze B->A.
  return {
    kind: 'damage',
    source: 'b',
    target: 'a',
    consumesFear: false,
    compute: (sAlive, tAlive, cap, _fearDist, context = {}) => {
      if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
      if (isCoM2) {
        const steps = [];
        let dispelEvilPending = bDispelEvilWithGaze ? bDispelEvilFailG : 0;
        const nextGazeSpec = (extra = {}) => {
          const spec = { ...commonSpec, dispelEvilFail: dispelEvilPending, ...extra };
          dispelEvilPending = 0;
          return spec;
        };
        const commonSpec = {
          poisonStr: 0, poisonFail: 0, stoningFail: 0, deathTouchFail: 0,
          dispelEvilFail: 0, exorciseFail: 0, destructionFail: 0,
          targetHP: a.hp, lifeStealMod: null, lifeStealRes: aResDeath,
          immDist: null, bloodsucker: hasAbil(b.abilities, 'bloodSucker'), version,
        };
        if (bStoningGazeActiveP) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(b, a, stepAlive, Math.max(0, Math.ceil(remaining / a.hp)),
              remaining, bStoningGazeFailP, 0, 0, aDefForGaze, aInvulnBonus,
              aBlurChance, blurBuggy, woundedTopFigHP(remaining, a.hp), false,
              aToBlockVsBAll, bMinDamageFromHits),
            atkFigs: stepAlive,
            spec: nextGazeSpec({ baseDamageCategory: 'irrecoverableDamage' }),
          }));
        }
        if (bDeathGazeActiveP) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(b, a, stepAlive, Math.max(0, Math.ceil(remaining / a.hp)),
              remaining, 0, bDeathGazeFailP, 0, aDefForGaze, aInvulnBonus,
              aBlurChance, blurBuggy, woundedTopFigHP(remaining, a.hp), false,
              aToBlockVsBAll, bMinDamageFromHits),
            atkFigs: stepAlive,
            spec: nextGazeSpec(),
          }));
        }
        if (bGazeDoomStrP > 0) {
          steps.push((remaining, stepAlive) => ({
            dist: buildGazeDist(b, a, stepAlive, Math.max(0, Math.ceil(remaining / a.hp)),
              remaining, 0, 0, bGazeDoomStrP, aDefForGaze, aInvulnBonus,
              aBlurChance, blurBuggy, woundedTopFigHP(remaining, a.hp), aBlackSleep,
              aToBlockVsBAll, bMinDamageFromHits),
            atkFigs: 1,
            spec: nextGazeSpec(),
          }));
        }
        return sequenceTouchApplyAttacks(steps, cap,
          context.sourceState || combatHealStateFromUnit(b));
      }
      let dist = buildGazeDist(b, a, sAlive, tAlive, cap, bStoningGazeFailP, bDeathGazeFailP, bGazeDoomStrP, aDefForGaze, aInvulnBonus, aBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined, aBlackSleep, aToBlockVsBAll, bMinDamageFromHits);
      const bImmGDist = (bImmWithGaze && tAlive > 0)
        ? calcDamageSpellDist(tAlive, immStr, b.toHitImmolation, aDefForImm,
          aToBlockVsBAll, a.hp, cap, aInvulnBonus, bMinDamageFromHits,
          woundedTopFigHP(cap, a.hp), version, a.abilities)
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
        sourceState: usesStatefulCombatHealing(version)
          ? (context.sourceState || combatHealStateFromUnit(b)) : null,
        version,
      });
      return t;
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
//     where toHitMelee/toHitRtb are region-e-clamped decimals (0.1-1.0), while modern
//     toBlock is DefenseRoll's effective probability projection (0.0-1.0)
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
  // CoM2/Warlord fix tactical defender Card B's army-wide Blur for the entire displayed
  // exchange, including B's counterattack. Unit-owned Invisibility and source Illusion
  // Immunity still follow each call's target/source direction. Older engines use the current
  // target unit's Blur, so a counterattack instead reads Card A's checkbox.
  const modernTacticalDefenderBlur = !!(ver && ver.startsWith('com2'))
    && hasAbil(b.abilities, 'blur');
  const bBlurChance = getBlurChance(b.abilities, a.abilities, ver, modernTacticalDefenderBlur);
  const aBlurChance = getBlurChance(a.abilities, b.abilities, ver, modernTacticalDefenderBlur);
  const blurBuggy = ver === 'mom_1.31';

  // First Strike applies when A is voluntarily attacking in melee and B cannot negate it.
  // Ranged attacks never trigger first strike (it only affects melee ordering).
  const hasFirstStrike = !isRanged
    && hasAbil(a.abilities, 'firstStrike')
    && !hasAbil(b.abilities, 'negateFirstStrike');

  // Haste repeats melee, thrown/breath, and (most) ranged attacks. Modern Caster also
  // repeats each initiating gaze and samples Cause Fear inside each melee ApplyAttack.
  // Wall of Fire never repeats. Counter-attacks repeat in MoM but not in CoM/CoM2.
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
  // A Black-Sleeping tactical attacker cannot initiate the represented combat.
  // Keep the calculator boundary unambiguous: no outgoing attack and no incoming
  // Wall of Fire, retaliation, or counterattack are resolved in any version/mode.
  if (aBlackSleep) {
    return {
      phases: null,
      totalDmgToA: [1],
      totalDmgToB: [1],
      aLifeStealDist: null,
      bLifeStealDist: null,
      aPostCombatStateMean: initialCombatHealingStateMeans(a),
      bPostCombatStateMean: initialCombatHealingStateMeans(b),
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
  const bPFear = aFear
    ? fearFailProb(bResDeath, b.abilities, opts.version, b.baseDeathImmunity) : 0; // A's fear on B
  const aPFear = bFear
    ? fearFailProb(aResDeath, a.abilities, opts.version, a.baseDeathImmunity) : 0; // B's fear on A
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
  } = buildToBlockContext(a, b, aVertigoBlockPenalty, bVertigoBlockPenalty, ver);

  // --- Immolation ---
  // Area fire damage: targets each defender figure independently (like fire breath).
  // Strength 4 (MoM) / 10 (CoM/CoM2). Fires like a touch attack with each attack phase.
  // Defense vs immolation is computed in computeDefenseProfile (vsImmolation above).
  const aHasImm = hasAbil(a.abilities, 'immolation');
  const bHasImm = hasAbil(b.abilities, 'immolation');
  const immStr = (aHasImm || bHasImm)
    ? immolationStr(ver, !!opts.chaosConjunction) : 0;

  // --- Wall of Fire ---
  // Area Immolation damage to attacker A during the melee opening. Not in ranged combat.
  // Uses the same defense chain as immolation against A, and the same immunities.
  // FirewallEffect tests the calculated unit record. Both modern builds skip the effect for
  // Teleporting or Merging attackers; the older engines retain their independent behavior.
  const wallOfFireActive = !!opts.wallOfFire && !isRanged
    && wallOfFireEligible(ver, a.abilities);
  const wofStr = wallOfFireActive ? wallOfFireStr(ver) : 0;
  // Wall of Fire is cast at 30% base To Hit (standard spell To Hit, like immolation);
  // Warlord raises this to 60% but limits the strike to a single attacker figure.
  const wofToHit = wallOfFireToHit(ver);
  const wofSingleFigure = wallOfFireSingleFigure(ver);

  // --- Melee phase pipeline ---
  // All non-ranged combat runs through a single joint-state engine. The DOS engines keep
  // Thrown/Breath → attacker gaze → defender gaze → Wall of Fire; Caster.exe uses
  // Wall of Fire → attacker Stoning/Death/Doom → defender Stoning/Death/Doom →
  // Lightning Breath → Fire Breath → Thrown. Fear/First Strike/melee follow either opening.
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
        aPostCombatStateMean: initialCombatHealingStateMeans(a),
        bPostCombatStateMean: initialCombatHealingStateMeans(b),
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

    // DOS BU_ProcessAttack gazes can carry common roster riders; modern gaze types 6-8
    // construct no touch-rider parameters (gazeTouchParams enforces that split).
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
    const aImmWithGaze   = !isCoM2 && aHasImm && aGazeActiveP;
    const bImmWithGaze   = !isCoM2 && bHasImm && bGazeActiveP;
    const aImmWithMelee  = aHasImm && !aBlackSleep && touchAttackFires(a.atk, a.baseAtk, opts.version);
    const bImmWithMelee  = bHasImm && !bBlackSleep && touchAttackFires(b.atk, b.baseAtk, opts.version);

    // Compatibility fallback for an unknown external version. Every supported build
    // uses the correlated state path and derives its displayed marginal from execution.
    let aLifeStealDistP = null;
    {
      const lsRefMod = aLifeStealModM !== null ? aLifeStealModM
                     : aLifeStealModT !== null ? aLifeStealModT
                     : aLifeStealWithGaze ? aLifeStealModG : null;
      if (!usesStatefulCombatHealing(ver) && lsRefMod !== null && aAlive > 0 && bRemHP > 0) {
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
      if (!usesStatefulCombatHealing(ver) && lsRefMod !== null && bAlive > 0 && aRemHP > 0) {
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
      aFearProbability: aFearedByB ? aPFear : null,
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
      version: ver,
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
      version: ver,
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
      aAbilities: a.abilities,
      // Within this two-unit projection, Card B is the opposing owner whose present calculated
      // Amplifier can qualify the spell. Multiple copies remain a single Boolean adjustment.
      amplifiedDamage: wallOfFireAmplified(ver, b.abilities),
      version: ver,
    });

    const aGazeParams = {
      a,
      b,
      aStoningGazeActiveP,
      aDeathGazeActiveP,
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
      version: ver,
    };

    const bGazeParams = {
      a,
      b,
      bStoningGazeActiveP,
      bDeathGazeActiveP,
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
      version: ver,
    };

    // DOS represents its selected gaze as one shared-slot phase. Caster.exe instead makes
    // six separately dealt ApplyAttack calls in fixed Stoning/Death/Doom order. Keeping
    // those as distinct joint phases makes every later call recompute living figures and
    // gives the breakdown the same observable phase boundaries as the engine.
    const aGazePhase = !isCoM2
      ? buildAttackerGazePhase(aGazeActiveP, aGazeParams) : null;
    const bGazePhase = !isCoM2
      ? buildDefenderGazePhase(bGazeActiveP, bGazeParams) : null;
    const modernAttackerGazePhases = [];
    const modernDefenderGazePhases = [];
    if (isCoM2) {
      let aDispelPending = aDispelEvilWithGaze;
      const addAttackerGaze = (kind, active) => {
        if (!active) return;
        const stoning = kind === 'stoning';
        const death = kind === 'death';
        const doom = kind === 'doom';
        const dispelEvil = aDispelPending;
        aDispelPending = false;
        modernAttackerGazePhases.push({
          phase: buildAttackerGazePhase(true, {
            ...aGazeParams,
            aStoningGazeActiveP: stoning,
            aDeathGazeActiveP: death,
            aGazeDoomStrP: doom ? aGazeDoomStrP : 0,
            // Preserve the established one-call Dispel Evil compatibility path: when
            // several modern gazes coexist it attaches only to the first admitted call.
            aDispelEvilWithGaze: dispelEvil,
          }),
          labelParams: {
            stoningGaze: stoning,
            deathGaze: death,
            doomGaze: doom,
            poisonTouch: false,
            stoningTouch: false,
            deathTouch: false,
            dispelEvil,
            exorcise: false,
            destruction: false,
            lifeSteal: false,
            immolation: false,
          },
        });
      };
      addAttackerGaze('stoning', aStoningGazeActiveP);
      addAttackerGaze('death', aDeathGazeActiveP);
      addAttackerGaze('doom', aGazeDoomStrP > 0);

      let bDispelPending = bDispelEvilWithGaze;
      const addDefenderGaze = (kind, active) => {
        if (!active) return;
        const stoning = kind === 'stoning';
        const death = kind === 'death';
        const doom = kind === 'doom';
        const dispelEvil = bDispelPending;
        bDispelPending = false;
        modernDefenderGazePhases.push({
          phase: buildDefenderGazePhase(true, {
            ...bGazeParams,
            bStoningGazeActiveP: stoning,
            bDeathGazeActiveP: death,
            bGazeDoomStrP: doom ? bGazeDoomStrP : 0,
            bDispelEvilWithGaze: dispelEvil,
          }),
          labelParams: {
            stoningGaze: stoning,
            deathGaze: death,
            doomGaze: doom,
            poisonTouch: false,
            stoningTouch: false,
            deathTouch: false,
            dispelEvil,
            exorcise: false,
            destruction: false,
            lifeSteal: false,
            immolation: false,
          },
        });
      };
      addDefenderGaze('stoning', bStoningGazeActiveP);
      addDefenderGaze('death', bDeathGazeActiveP);
      addDefenderGaze('doom', bGazeDoomStrP > 0);
    }

    // Thrown / breath: A→B, fires before melee. DOS has one shared slot; Caster.exe
    // runs each independently-derived channel (`Combat.PerformAttacks.pas` $005B399B..$005B3A9E).
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
          aToHitRtbVert: isCoM2 ? attacker.toHitRtb : aToHitRtbVert,
          bDefForThrown: isCoM2 ? computeCasterDefenseForAttack(b, attacker, ver, bVertigoDefPenalty, 'thrown') : bDefForThrown,
          bToBlockVsAThrEW: isCoM2 ? buildToBlockContext(attacker, b, aVertigoBlockPenalty, bVertigoBlockPenalty, ver).bToBlockVsAThrEW : bToBlockVsAThrEW,
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
          version: ver,
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

    // Run the version-specific opening, then the shared fear/First Strike/melee tail.
    const trackModernHealing = usesStatefulCombatHealing(ver) && (
      aLifeStealModM !== null || bLifeStealModM !== null
      || thrownPhases.some(({ touch }) => touch.lifeStealMod !== null)
      || aLifeStealWithGaze || bLifeStealWithGaze
      || hasAbil(a.abilities, 'bloodSucker') || hasAbil(b.abilities, 'bloodSucker')
      || aStoningGazeActiveP || bStoningGazeActiveP
      || aStoningFailM > 0 || bStoningFailM > 0
      || aDispelEvilFailM > 0 || bDispelEvilFailM > 0
      || aExorciseFailM > 0 || bExorciseFailM > 0
      || aDestructionFailM > 0 || bDestructionFailM > 0
      || thrownPhases.some(({ touch }) => touch.stoningFail > 0
        || touch.dispelEvilFail > 0 || touch.exorciseFail > 0
        || touch.destructionFail > 0)
      || aDispelEvilWithGaze || bDispelEvilWithGaze
      || aExorciseWithGaze || bExorciseWithGaze
      || aDestructionWithGaze || bDestructionWithGaze);
    let joint = makeJoint2D(aRemHP, bRemHP,
      trackModernHealing ? { a, b } : null);
    let lifeStealEV_a = 0, lifeStealEV_b = 0;
    const breakdown = [];   // accumulate phase rows

    const pendingFear = { aFearDist: null, bFearDist: null };

    const applyThrownPhases = () => {
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
          atkDestroyPct: 0,
          defDestroyPct: jointDestroyedProbability(joint, 'b', bMargAtThrown, bRemHP) });
      }
    };

    const applyAttackerGazePhase = (phase, labelParams) => {
      if (!phase) return;
      const r = applyDamagePhase(joint, phase, pendingFear, { a, b }, bRemHP);
      joint = r.joint;
      lifeStealEV_a += r.lifeStealEV;
      const bMargAtAGz = marginalB(joint);
      const aGzLabel = gazePhaseLabel('Attacker', labelParams);
      breakdown.push({ label: aGzLabel,
        atkDist: [1], atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: r.marginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: 0,
        defDestroyPct: jointDestroyedProbability(joint, 'b', bMargAtAGz, bRemHP) });
    };

    const applyDefenderGazePhase = (phase, labelParams) => {
      if (!phase) return;
      const r = applyDamagePhase(joint, phase, pendingFear, { a, b }, aRemHP);
      joint = r.joint;
      lifeStealEV_b += r.lifeStealEV;
      const aMargAtBGz = marginalA(joint);
      const bMargAtBGz = marginalB(joint);
      const bGzLabel = gazePhaseLabel('Defender', labelParams);
      breakdown.push({ label: bGzLabel,
        atkDist: r.marginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: [1], defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: jointDestroyedProbability(joint, 'a', aMargAtBGz, aRemHP),
        defDestroyPct: jointDestroyedProbability(joint, 'b', bMargAtBGz, bRemHP) });
    };

    const applyWallOfFirePhase = () => {
      if (!wofPhase) return;
      const r = applyDamagePhase(joint, wofPhase, pendingFear, { a, b }, aRemHP);
      joint = r.joint;
      const aMargAtWof = marginalA(joint);
      breakdown.push({ label: 'Wall of Fire',
        atkDist: r.marginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: [1], defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: jointDestroyedProbability(joint, 'a', aMargAtWof, aRemHP),
        defDestroyPct: 0 });
    };

    const legacyAttackerGazeLabels = {
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
    };
    const legacyDefenderGazeLabels = {
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
    };

    if (isCoM2) {
      applyWallOfFirePhase();
      for (const gaze of modernAttackerGazePhases) {
        const repeats = aHaste ? 2 : 1;
        for (let repeat = 0; repeat < repeats; repeat++) {
          applyAttackerGazePhase(gaze.phase, gaze.labelParams);
        }
      }
      for (const gaze of modernDefenderGazePhases) {
        applyDefenderGazePhase(gaze.phase, gaze.labelParams);
      }
      applyThrownPhases();
    } else {
      applyThrownPhases();
      applyAttackerGazePhase(aGazePhase, legacyAttackerGazeLabels);
      applyDefenderGazePhase(bGazePhase, legacyDefenderGazeLabels);
      applyWallOfFirePhase();
    }

    // Survivor-distribution helper.
    const computeSurv = (j) => {
      const aSurv = new Array(a.figs + 1).fill(0);
      const bSurv = new Array(b.figs + 1).fill(0);
      for (let cumA = 0; cumA < j.length; cumA++) {
        const bRow = j[cumA];
        for (let cumB = 0; cumB < bRow.length; cumB++) {
          if (j.healingPaths) {
            for (const path of bRow[cumB].values()) {
              if (path.probability < 1e-15) continue;
              aSurv[healingStateAlive(path.aState)] += path.probability;
              bSurv[healingStateAlive(path.bState)] += path.probability;
            }
          } else {
            const p = bRow[cumB];
            if (p < 1e-15) continue;
            aSurv[aliveCount(a, cumA)] += p;
            bSurv[aliveCount(b, cumB)] += p;
          }
        }
      }
      return { aSurv, bSurv };
    };

    // Exact feared-figure marginal for one modern ApplyAttack call at this joint
    // snapshot. PerformMeleeAttack still makes a selected call against a target
    // killed by an earlier dealt phase, so only a zero-figure or Black-Sleeping
    // source suppresses the fear loop.
    const modernFearCallDist = (j, sourceSide, pFear) => {
      const sourceUnit = sourceSide === 'a' ? a : b;
      const result = new Array(sourceUnit.figs + 1).fill(0);
      const sourceBlackSleep = hasAbil(sourceUnit.abilities, 'blackSleep');
      const addPath = (probability, sourceAlive) => {
        if (sourceAlive <= 0 || sourceBlackSleep || pFear <= 0) {
          result[0] += probability;
          return;
        }
        addWeightedDist(result, binomialPMF(sourceAlive, pFear), probability);
      };
      for (let cumA = 0; cumA < j.length; cumA++) {
        for (let cumB = 0; cumB < j[0].length; cumB++) {
          if (j.healingPaths) {
            for (const path of j[cumA][cumB].values()) {
              const sourceState = path[sourceSide + 'State'];
              addPath(path.probability, healingStateAlive(sourceState));
            }
          } else {
            const probability = j[cumA][cumB];
            if (probability < 1e-15) continue;
            const sourceDamage = sourceSide === 'a' ? cumA : cumB;
            addPath(probability, aliveCount(sourceUnit, sourceDamage));
          }
        }
      }
      return result;
    };

    if (hasFirstStrike) {
      // FS path. With Haste: FS strike → (counter + 2nd strike simultaneous).
      // Without Haste: FS strike → counter sequentially.
      // Per-cell CoM1 fallthrough → simultaneous melee+counter (single strike).

      // Step 5: Defender Cause Fear row (B's fear on A only; aFearBug fires after FS).
      if (isCoM2 && (aFear || bFear)) {
        breakdown.push({ label: 'First Strike Cause Fear', mode: 'feared',
          atkDist: modernFearCallDist(joint, 'a', aPFear), defDist: [1] });
      } else {
        const survPre = computeSurv(joint);
        const beforeFear = buildFearPhaseDists(aAlive, bAlive, bPFear, aPFear, aFearedByB, false, false, showFearNoop, survPre.bSurv, survPre.aSurv);
        if (beforeFear) {
          breakdown.push({ label: 'Defender Cause Fear', mode: 'feared',
            atkDist: beforeFear.atkFearedDist, defDist: beforeFear.defFearedDist });
        }
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
        version: ver,
      });

      let fsResult;
      if (aHaste) {
        // Modern ApplyAttack calls sample independently; the DOS engines retain their
        // established First-Strike/Haste coupling. Otherwise no fear roll happens on FS,
        // so coupling is moot — fall through to independent path.
        const coupleKa = !isCoM2 && aFearedByB && aHaste;
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
        atkDestroyPct: jointDestroyedProbability(fsResult.postFsJoint, 'a', aMargPostFS, aRemHP),
        defDestroyPct: jointDestroyedProbability(fsResult.postFsJoint, 'b', bMargPostFS, bRemHP) });

      // Step 7: Attacker Cause Fear row (post-FS; includes A's fear on B and v1.31 self-fear bug).
      if (isCoM2 && (aFear || bFear)) {
        if (aHaste) {
          breakdown.push({ label: 'Haste Cause Fear', mode: 'feared',
            atkDist: modernFearCallDist(fsResult.postFsJoint, 'a', aPFear),
            defDist: [1] });
        }
        breakdown.push({ label: 'Counter Cause Fear', mode: 'feared',
          atkDist: [1],
          defDist: modernFearCallDist(fsResult.postFsJoint, 'b', bPFear) });
      } else {
        const survPostFS = computeSurv(fsResult.postFsJoint);
        const afterFear = buildFearPhaseDists(aAlive, bAlive, bPFear, aPFear, false, aFearBug, bFearedByA, false, survPostFS.bSurv, survPostFS.aSurv);
        if (afterFear) {
          breakdown.push({ label: 'Attacker Cause Fear', mode: 'feared',
            atkDist: afterFear.atkFearedDist, defDist: afterFear.defFearedDist });
        }
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
          atkDestroyPct: jointDestroyedProbability(joint, 'a', totalDmgToAFs, aRemHP),
          defDestroyPct: jointDestroyedProbability(joint, 'b', totalDmgToBFs, bRemHP) });
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
          atkDestroyPct: jointDestroyedProbability(joint, 'a', totalDmgToAFs, aRemHP),
          defDestroyPct: jointDestroyedProbability(joint, 'b', totalDmgToBFs, bRemHP) });
      }
    } else {
      // Non-FS path: emits a single combined Cause Fear row + simultaneous melee+counter.
      const hasDefenderFearP = aFearedByB || aFearBug || showFearNoop;
      if (!isCoM2 && (bFearedByA || hasDefenderFearP)) {
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

      if (isCoM2 && (aFear || bFear)) {
        breakdown.push({ label: 'Main Cause Fear', mode: 'feared',
          atkDist: (pair.fearSamplesB && pair.fearSamplesB[0]) || [1], defDist: [1] });
        if (aHaste) {
          breakdown.push({ label: 'Haste Cause Fear', mode: 'feared',
            atkDist: (pair.fearSamplesB && pair.fearSamplesB[1]) || [1], defDist: [1] });
        }
        breakdown.push({ label: 'Counter Cause Fear', mode: 'feared',
          atkDist: [1], defDist: (pair.fearSamplesA && pair.fearSamplesA[0]) || [1] });
      }

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
          atkDestroyPct: jointDestroyedProbability(joint, 'a', totalDmgToANF, aRemHP),
          defDestroyPct: jointDestroyedProbability(joint, 'b', totalDmgToBNF, bRemHP) });
      }
    }

    const cappedDmgToA = marginalA(joint);
    const cappedDmgToB = marginalB(joint);
    const exactADamageDist = jointMetricDist(joint, 'aDamageTaken');
    const exactBDamageDist = jointMetricDist(joint, 'bDamageTaken');
    const totalDmgToA = exactADamageDist || cappedDmgToA;
    const totalDmgToB = exactBDamageDist || cappedDmgToB;
    const exactARawDist = jointMetricDist(joint, 'aRawDrain');
    const exactBRawDist = jointMetricDist(joint, 'bRawDrain');
    const exactAHealedDist = jointMetricDist(joint, 'aHealedDamage');
    const exactBHealedDist = jointMetricDist(joint, 'bHealedDamage');
    const exactABonusDist = jointMetricDist(joint, 'aBonusHpGain');
    const exactBBonusDist = jointMetricDist(joint, 'bBonusHpGain');
    const exactABenefitDist = jointCombinedMetricDist(joint,
      ['aHealedDamage', 'aBonusHpBenefit']);
    const exactBBenefitDist = jointCombinedMetricDist(joint,
      ['bHealedDamage', 'bBonusHpBenefit']);

    return {
      phases: breakdown.length > 0 ? breakdown : null,
      totalDmgToA, totalDmgToB,
      aDestroyPct: jointDestroyedProbability(joint, 'a', cappedDmgToA, aRemHP),
      bDestroyPct: jointDestroyedProbability(joint, 'b', cappedDmgToB, bRemHP),
      aLifeStealDist: exactARawDist || aLifeStealDistP,
      aLifeStealRawDist: exactARawDist || aLifeStealDistP,
      aLifeStealRawExpected: expectedDamage(exactARawDist || aLifeStealDistP),
      aLifeStealExpected: exactABenefitDist
        ? expectedDamage(exactABenefitDist) : lifeStealEV_a,
      aHealedDamageDist: exactAHealedDist,
      aBonusHpDist: exactABonusDist,
      aAppliedHealingBenefitDist: exactABenefitDist,
      bLifeStealDist: exactBRawDist || bLifeStealDistP,
      bLifeStealRawDist: exactBRawDist || bLifeStealDistP,
      bLifeStealRawExpected: expectedDamage(exactBRawDist || bLifeStealDistP),
      bLifeStealExpected: exactBBenefitDist
        ? expectedDamage(exactBBenefitDist) : lifeStealEV_b,
      bHealedDamageDist: exactBHealedDist,
      bBonusHpDist: exactBBonusDist,
      bAppliedHealingBenefitDist: exactBBenefitDist,
      aPostCombatStateMean: jointCombatHealingStateMeans(joint, 'a', a),
      bPostCombatStateMean: jointCombatHealingStateMeans(joint, 'b', b),
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
        aPostCombatStateMean: initialCombatHealingStateMeans(a),
        bPostCombatStateMean: initialCombatHealingStateMeans(b),
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
      ? buildToBlockContext(rangedAttacker, b, aVertigoBlockPenalty, bVertigoBlockPenalty, ver).bToBlockVsARangedEW
      : bToBlockVsARangedEW;

    // Rage: +1 ranged per figure lost (ranged combat has no counter-attack, so only
    // pre-combat casualties contribute — aAlive is constant through the volley).
    const aRtbRanged = applyRage(rangedAttacker.rtb, rangedAttacker, aAlive);
    let dmgToB = aAlive > 0 && bRemHP > 0 && rangedAttacker.rtb > 0 && !aBlackSleep
      ? (aRangedDoomsB ? calcDoomDist(aAlive, aRtbRanged, bRemHP)
                 : calcTotalDamageDist(aAlive, aRtbRanged,
                     isCoM2 ? rangedAttacker.toHitRtb : aToHitRtbVert,
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
      ? calcDamageSpellDist(bAlive, immStr, a.toHitImmolation, bDefForImm,
        bToBlockVsAAll, b.hp, bRemHP, bInvulnBonus, aMinDamageFromHits,
        woundedTopFigHP(bRemHP, b.hp), ver, b.abilities)
      : null;
    const rangedTouchSpec = {
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
      sourceState: usesStatefulCombatHealing(ver) ? combatHealStateFromUnit(a) : null,
      version: ver,
    };
    let tR = convolveTouchAttacks(dmgToB, bRemHP, aAlive, rangedTouchSpec);

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
      tR = repeatTouchAttack(tR, dmgToB, bRemHP, aAlive, rangedTouchSpec);
    }
    dmgToB = tR.dist;
    const aLifeStealDistR = tR.lifeStealDist;
    const aLifeStealExpectedR = tR.lifeStealEV;
    const rangedStateMeans = rangedCombatHealingStateMeans(tR.outcomes, a, b);

    return {
      phases: null,
      totalDmgToA: [1],
      totalDmgToB: dmgToB,
      aLifeStealDist: aLifeStealDistR,
      aLifeStealRawDist: aLifeStealDistR,
      aLifeStealExpected: aLifeStealExpectedR,
      aLifeStealRawExpected: tR.rawDrainEV,
      aHealedDamageDist: tR.healedDamageDist,
      aBonusHpDist: tR.bonusHpDist,
      aBonusHpExpected: tR.bonusHpEV,
      aBloodsuckerHealDist: tR.bloodsuckerHealDist,
      bLifeStealDist: null,
      bLifeStealExpected: 0,
      aPostCombatStateMean: rangedStateMeans.sourceMeans,
      bPostCombatStateMean: rangedStateMeans.targetMeans,
      aRemHP, aHP: a.hp, aAlive,
      bRemHP, bHP: b.hp, bAlive,
    };

  }
}
