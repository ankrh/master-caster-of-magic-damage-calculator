// --- Combat Resolution: shared predicates and ability stat steps ---
// Pure functions with no DOM dependencies. Depends on engine.js.
// First of the combat sources; see index.html for the load order.

// --- Combat Resolution ---
// Pure functions with no DOM dependencies. Depends on engine.js.

// Ability accessors — guard against absent abilities objects.
function hasAbil(ab, key) { return !!(ab && ab[key]); }
function abilVal(ab, key, def) { return (ab && ab[key] != null) ? ab[key] : def; }
function abilDefined(ab, key) { return ab != null && ab[key] != null; }

// Compatibility 10%-100% To-Hit clamp for isolated calculations such as Energy Cannon.
// Ordered unit thresholds and modern common-then-channel normalization are region-e steps
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
// Long Range caps the penalty at -10% in all versions, by clamping the step count to 1 — but
// only when it is already positive.
// CoM 1, CoM2, and Warlord exempt heroes entirely.
// How the DOS divisor and the hero exemption were established:
// `Reference docs/MoM binary analysis.md`, *Ranged distance penalty*.
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
// Phase is evidence, not decoration: which region of the engine makes the write. The phase
// model is SPEC.md, *Phases*; how a step is assigned to one is CLAUDE.md, *Step authoring*.
// Each non-obvious attribution below cites the file:line that justifies it.
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
//
// The secondary-attack names above resolve against the derivation's slots (`ctx.channels`), one
// per record strength field: the DOS engines run one, the modern engines one per attack channel.
// Each slot carries its own `slots` gates and its own type fields, so one write lands on every
// field the engine writes and on no other.
const ABILITY_STEP_GAZE_FIELDS = ['gaze', 'doomGaze'];
const ABILITY_STEP_RTB_NAMES = ['rtb', 'ranged', 'positiveRanged', 'rangedOrThrown', 'nonGazeRtb'];
function abilityStatStep(id, phase, delta, extra, strengthFields) {
  const fields = Object.keys(delta);
  const secondaryFields = strengthFields && strengthFields.length ? strengthFields : ['rtb'];
  const writes = [];
  for (const field of fields) {
    if (field === 'rtb') writes.push(...secondaryFields, ...ABILITY_STEP_GAZE_FIELDS);
    else if (ABILITY_STEP_RTB_NAMES.includes(field)) writes.push(...secondaryFields);
    else writes.push(field);
  }
  return statStep({
    id, phase, writes, delta, ...(extra || {}),
    apply: (u, ctx) => {
      const slots = (ctx && ctx.slots) || null;
      const channels = (ctx && ctx.channels) || null;
      const eachSlot = write => {
        if (!channels) { write('rtb', slots); return; }
        for (const channel of channels) write(channel.strengthField, channel.slots);
      };
      for (const field of fields) {
        const value = delta[field];
        if (field === 'atk') {
          if (!slots || slots.melee) u.atk += value;
        } else if (field === 'rtb') {
          eachSlot((target, gates) => { if (!gates || gates.rtb) u[target] += value; });
          if (!slots || slots.gaze) u.gaze += value;
          if (!slots || slots.doomGaze) u.doomGaze += value;
        } else if (field === 'ranged') {
          eachSlot((target, gates) => { if (!gates || gates.ranged) u[target] += value; });
        } else if (field === 'positiveRanged') {
          eachSlot((target, gates) => {
            if ((!gates || gates.ranged) && u[target] > 0) u[target] += value;
          });
        } else if (field === 'rangedOrThrown') {
          eachSlot((target, gates) => {
            if (!gates || gates.rangedOrThrown) u[target] += value;
          });
        } else if (field === 'nonGazeRtb') {
          eachSlot((target, gates) => { if (!gates || gates.rtb) u[target] += value; });
        } else {
          u[field] += value;
        }
      }
    },
  });
}

function getAbilityStatSteps(abilities, version, identityPredicates = {}) {
  const steps = [];
  const strengthFields = identityPredicates.strengthFields || null;
  const emit = (id, phase, delta, extra) => {
    steps.push(abilityStatStep(id, phase, delta, extra, strengthFields));
  };
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
    // PROVENANCE[holyBonus]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:be00bc2f90338549d6e09741 | Reference docs/DOS reconstructed/unitcalc.c@span:24:355495d2e88ef940a57b8515
    if (isCoM2) emit('holyBonus', 'e', { atk: hb, def: hb, res: hb, ranged: hb });
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
    emit('guidingBeaconAura', 'e', { positiveRanged: guidingBeaconAura });
  }

  // Aura type 3 is shared by Resistance to All and Prayermaster. BuildAuraTable keeps the
  // maximum per owner/type, so the two sources compete rather than stack.
  const rta = abilVal(abilities, 'resistanceToAll', 0);
  const prayermasterAura = isModern ? Math.max(rta, auraValue('prayermasterAura')) : 0;
  if (prayermasterAura > 0) {
    // PROVENANCE[resistanceToAll]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:77eb7e2f668ac3b092fa3b7d | Reference docs/DOS reconstructed/unitcalc.c@span:24:355495d2e88ef940a57b8515
    emit('resistanceToAll', 'e', { res: prayermasterAura },
      { sourceId: 'prayermasterAura', sourceLabel: 'Prayermaster / Resistance to All' });
  } else if (rta > 0) {
    emit('resistanceToAll', 'a', { res: rta });
  }

  const divineBarrierAura = isModern ? auraValue('divineBarrierAura') : 0;
  if (divineBarrierAura > 0) {
    emit('divineBarrierAura', 'e', { def: divineBarrierAura });
  }

  const soulLinkerAura = isModern ? auraValue('soulLinkerAura') : 0;
  if (soulLinkerAura > 0 && identityPredicates.liveFantastic) {
    emit('soulLinkerAura', 'e', { toHit: soulLinkerAura, toBlk: soulLinkerAura });
  }

  const leadershipAura = isModern ? auraValue('leadershipAura') : 0;
  if (leadershipAura > 0 && !identityPredicates.liveFantastic) {
    // PROVENANCE[leadershipAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:1ec384f5af2fc785c3b46a8e
    steps.push(statStep({ id: 'leadershipAura', phase: 'e',
      writes: ['atk', ...(strengthFields || ['rtb'])],
      apply: (u, ctx) => {
        const slots = ctx && ctx.slots;
        if (!slots || slots.melee) u.atk += leadershipAura;
        const channels = (ctx && ctx.channels)
          || [{ strengthField: 'rtb', rangedTypeField: 'rangedType', slots }];
        for (const channel of channels) {
          const gates = channel.slots;
          const liveRangedType = u[channel.rangedTypeField];
          // `not Ismagicalranged(U.rangedtype)` is True for a zero ranged type
          // (Units.RecalculateUnits.pas:2968-2975), so the aura's type half admits the record's
          // `SRanged` field while it is still typeless; `U.ranged > 0` is the engine's other
          // half and is the strength test below. The DOS-shaped shared slot is not that field
          // and keeps the two names it can stand for. The `gates.ranged` slot test is a type
          // test the engine does not make here at all — that is F96, not this breadth.
          const nonMagicalRanged = channel.channelKey === 'ranged'
            ? !isMagicalRangedType(liveRangedType)
            : (liveRangedType === 'missile' || liveRangedType === 'boulder');
          if ((!gates || gates.ranged) && u[channel.strengthField] > 0 && nonMagicalRanged) {
            u[channel.strengthField] += Math.trunc(leadershipAura / 2);
          }
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
  // The 1.5.12.7 script is the fixed army-wide form; `Reference docs/Source discrepancies.md`
  // §10 records the earlier build's enchanted-unit-only bug.
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
      // PROVENANCE[prayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:cd3b7dd8d55f06aacde8812c | Reference docs/DOS reconstructed/unitcalc.c@span:19:ff7bdd24b7f56fef70abb02b | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:22:b3cdb6f87df741fb103a6989
      emit('prayer', 'b', { atk: 1, def: 1, res: 1 });
    }
  } else if (hasPrayer) {
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
  // The +2 magical ranged attack strength bonus is type-conditional: the
  // `reinforceMagic:ranged` step in stats_sequence.js.

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
    steps.push(statStep({ id: 'mislead', phase: 'e',
      writes: ['atk', 'def', 'res', ...(strengthFields || ['rtb'])],
      apply: (u, ctx) => {
        u.atk -= 1;
        u.def -= 1;
        u.res -= 1;
        const channels = (ctx && ctx.channels)
          || [{ strengthField: 'rtb', slots: ctx && ctx.slots }];
        for (const channel of channels) {
          if (!channel.slots || channel.slots.persistentRanged) u[channel.strengthField] -= 1;
        }
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

  // Holy Armor: the `holyArmor` step in stats_sequence.js (version- and stat-conditional).

  // Lionheart: +3 Melee Attack (only if base > 0 — the melee slot gate discards it otherwise),
  // +3 Resistance. RTB bonus (non-magic ranged/thrown only) and HP bonus
  // (version/figs-dependent) are part of the `lionheart` step in stats_sequence.js.
  // Phase c — spell with no CAS implementation.

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
    emit('flameBlade', 'c', { atk: version && version.startsWith('com') ? 3 : 2 }, beforeHolyArmor);
  } else if (hasAbil(abilities, 'metalFires') && !identityPredicates.liveFantastic) {
    // PROVENANCE[metalFires]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:8c88e810ad0fd6705c30bb95
    emit('metalFires', 'c', { atk: 1 }, beforeHolyArmor);
  }

  // Blazing March: CoM/CoM2 combat enchantment. +3 melee attack to all units.
  // The missile bonus (+3, thrown too in Warlord) is type-conditional: the
  // `blazingMarch:ranged` step in stats_sequence.js.
  // MODDING.INI confirms all four magnitudes, breath included: BlazingMarchAttackBonus=3,
  // MissileRangedBonus=3, BreathBonus=0 both versions, ThrownBonus 0 (CoM2) / 3 (Warlord).
  // Phase c — no CAS implementation.

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

  // Giant Strength: +1 melee attack. +1 thrown bonus is `giantStrength:thrown` in
  // stats_sequence.js
  // (thrown only, not missile).
  // Phase c — spell with no CAS implementation. (CreateUnit.CAS:552-554's SGiantStrength is
  // the Natural Selection coal-ore grant, a different effect, stepped in stats_sequence.js.)

  // Chaos Channels (Demon-Skin Armor): +6 Defense in MoM 1.31 (bug: applied twice in combat),
  // +3 Defense in MoM 1.40+/CP 1.60/CoM/CoM2 (Insecticide fix).
  // The constant is +3 in every build; 1.31's 6 is that +3 applied twice. Why, and why the
  // Fandom wiki's "documented +2" is wrong: `Reference docs/MoM binary analysis.md`,
  // *`BU_Apply_Specials` runs twice, and only 1.31 lets mutations apply twice*.
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
  // `c:weakness` and `d:weakness` steps in stats_sequence.js.
  // Phase c for the melee penalty — Warlord's UnitCalc.CAS:309-315 adds only the -3 to
  // fire/lightning breath (phase d, applied in stats_sequence.js).

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
  // defence component is a live read of Resistance, so it is one step in stats_sequence.js —
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
  // One id across all three CoM engines and both unit classes: the hero and non-hero grants are
  // mutually exclusive branches of the same region-`c` write, and the Warlord clawback is the
  // same enchantment writing again in a different region, so the phase carries that distinction.
  // PROVENANCE[tactician]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:17:74a62c399fece2ea93dcbdc3 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:27:69075629fb02a3678e0526aa | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:15:e1a9888013d858dd0217c1a9
  if (hasAbil(abilities, 'tactician') && isCoMPlus) {
    const isWarlord = version && version.startsWith('com2_warlord');
    if (abilVal(abilities, 'unitType', 'normal') === 'hero') {
      emit('tactician', 'c', isCoM1
        ? { atk: 2, def: 2, res: 2, rtb: 2 }
        : { atk: 2, def: 2, res: 2, positiveRanged: 2 }, afterWarp);
      if (isWarlord) {
        emit('tactician', 'b', { atk: -2, def: -1, res: -2, ranged: -2 });
      }
    } else {
      emit('tactician', 'c', { def: 1 }, afterWarp);
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

  // Land Linking (+2 melee, breath and defense to fantastic units) is one hand-written
  // region-c step in stats_sequence.js: its Breath half needs the per-channel mod this
  // builder never receives. UnitCalcPre.CAS:889 is the separate Nature Link upgrade
  // (+1 resistance), not this bonus.

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
  // Resistance is +2, not the +1 the helptext states — the script is right and the helptext is
  // stale. See `Reference docs/Source discrepancies.md` §6.
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
