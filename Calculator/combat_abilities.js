// --- Combat Resolution: shared predicates and ability stat steps ---
// Pure functions with no DOM dependencies. Depends on engine.js.
// First of the combat sources; see index.html for the load order.

// --- Combat Resolution ---
// Pure functions with no DOM dependencies. Depends on engine.js.

// Ability accessors — guard against absent abilities objects.
function hasAbil(ab, key) { return !!(ab && ab[key]); }
function abilVal(ab, key, def) { return (ab && ab[key] != null) ? ab[key] : def; }
function abilDefined(ab, key) { return ab != null && ab[key] != null; }

// The write side of the same object. Several controls can name one `calcKey` — a unit's own
// Holy Bonus and the one it receives, Guardian Wind and Hillfort both granting Missile
// Immunity — and how two sources of one effect combine is an engine rule, not marshalling.
//
// Two numeric providers contend by **maximum**, and the winner applies once. The DOS builds
// scan the battlefield keeping a per-player maximum of each provider's shared value byte for
// Holy Bonus and Resistance to All, then the recompute adds that one number; CoM2/Warlord's
// aura table merges a new source into an existing record when tile, owner and type match and
// retains only the higher value, which is the helptext's highest-source-only language.
//
// A boolean is a record flag, so a second grant sets a bit the unit may already carry — the
// same shape as Holy Arms granting Holy Weapon to a unit that may already have it — and the
// two OR rather than stack. The remaining arms are what a single source needs from a fold: a
// `select` keeps whichever source left its default behind, a `numcheck` keeps whichever
// supplied a value (`null` and `0` stay distinct states), and a `signed` number takes the
// later write, its sign being a direction rather than a magnitude to maximize.
// PROVENANCE[abilityCalcKeyMerge]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:19:2479e7f72df0edd5cef33c89 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:3580d32230eb923ea4a5b467 | Reference docs/DOS reconstructed/unitcalc.c@span:5:a4af7b8e027f6d6b80cf20d1
function mergeAbilityCalcValue(def, currentValue, nextValue) {
  if (def.type === 'bool') return !!currentValue || !!nextValue;
  if (def.type === 'select') {
    const defaultValue = def.options && def.options[0] ? def.options[0][0] : 'none';
    return nextValue !== defaultValue ? nextValue : (currentValue === undefined ? defaultValue : currentValue);
  }
  if (def.type === 'numcheck') return nextValue != null ? nextValue : (currentValue === undefined ? null : currentValue);
  if (def.signed) return nextValue || 0;
  return Math.max(currentValue === undefined ? 0 : currentValue, nextValue || 0);
}

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
// The option set of the `#aWeapon`/`#bWeapon` controls and of `MATRIX_WEAPON_OPTIONS`. Membership
// is tested before the switch so `normal` — the loadout's "no material" member — keeps the zero
// row in `default:` while a value outside the set stops the run instead of silently reading as an
// unequipped unit (`SPEC.md`, *Out-of-range values stop the run*).
const WEAPON_MATERIALS = Object.freeze(['normal', 'magic', 'mithril', 'adamantium']);

function weaponBonus(type) {
  if (!WEAPON_MATERIALS.includes(type)) {
    throw new Error(
      `weaponBonus: weapon material '${type}' is not one of ${WEAPON_MATERIALS.join('/')}, `
      + `the option set of the Weapon Type control and of MATRIX_WEAPON_OPTIONS.`);
  }
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
    default:           return { atk: 0, def: 0, toHit: 0 };   // 'normal': no material
  }
}

// The option set of the `#aArmor`/`#bArmor` controls and of `MATRIX_ARMOR_OPTIONS`, kept beside
// the weapon set because the two are one loadout. Armour has no bonus table: the whole of its
// effect is `armor === 'orihalcon'` in `stats.js`, a positive predicate that reads every other
// spelling as an ordinary suit rather than raising. This is the membership test that read is
// guarded by (`SPEC.md`, *Out-of-range values stop the run*).
const ARMOR_MATERIALS = Object.freeze(['normal', 'orihalcon']);

// The six rungs of the experience ladder: the option set of the Unit Level control and of
// `MATRIX_LEVEL_OPTIONS`. Membership is tested before `getLevelBonuses`' switches so `normal` --
// level 1, Recruit -- keeps the zero row in each `default:` arm, while a seventh value stops the
// run instead of being read as an unpromoted unit, which would hide the whole ladder behind a
// plausible number (`SPEC.md`, *Out-of-range values stop the run*).
const LEVEL_LADDER = Object.freeze(
  ['normal', 'regular', 'veteran', 'elite', 'ultra_elite', 'champion']);

// Level bonuses vary by game version.
// CoM2 and Warlord are confirmed against their own Levelbonus.INI `[Normal]` sections — every
// value below matches (see `Reference docs/CoM2 data tables.md`, *Level bonuses*). Level 1
// (`Recruit`) is all zeros, so it maps to 'normal' here and the ladder starts at 'regular'.
// Note this ladder is applied to heroes too, though Levelbonus.INI gives them a separate
// 9-step `[Hero]` table with a different shape — tracked as D27.
//
// The secondary-attack columns are named for the arrays the engine indexes, because it indexes
// four of them independently. `ApplyLevelBonus`'s normal arm reads `NormalMissileRanged` or
// `NormalMagicRanged` by the base ranged type, `NormalThrown`, and `NormalBreath` for both
// breaths (Units.RecalculateUnits.pas:548-571); `@Init@LoadLevelBonusINI` fills all four from
// separate `[Normal]` keys, so a mod can make them disagree even though both shipped
// `Levelbonus.INI` files have MissileRanged/MagicRanged and Thrown/Breath column-identical.
// `ranged`/`thrown` are a different fact and stay: the DOS ladders have no tables at all, and
// those two keys are the cumulative values of their inline increments — MoM's ungated
// `bu->ranged++` steps, and CoM 1's table walk with and without its `ranged_type >= 100`
// skip. `com_6.08` and `com2_1.05.11` share a branch below only because their numbers agree.
// PROVENANCE[levelBonusDispatch]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b | Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
// STAT-FORMULA[levelBonusDispatch]
function getLevelBonuses(level, version) {
  if (!LEVEL_LADDER.includes(level)) {
    throw new Error(
      `getLevelBonuses: experience level '${level}' has no row in the ${version} level table `
      + `(expected one of ${LEVEL_LADDER.join('/')}).`);
  }
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
      case 'regular':    return { atk: 1, ranged: 1, missileRanged: 1, magicRanged: 1, thrown: 0, breath: 0, def: 0, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:veteran]
      // PROVENANCE[levelBonuses:warlord:veteran]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'veteran':    return { atk: 2, ranged: 2, missileRanged: 2, magicRanged: 2, thrown: 1, breath: 1, def: 1, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:elite]
      // PROVENANCE[levelBonuses:warlord:elite]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'elite':      return { atk: 2, ranged: 2, missileRanged: 2, magicRanged: 2, thrown: 1, breath: 1, def: 2, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:warlord:ultraElite]
      // PROVENANCE[levelBonuses:warlord:ultraElite]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'ultra_elite':return { atk: 3, ranged: 3, missileRanged: 3, magicRanged: 3, thrown: 2, breath: 2, def: 3, res: 2, hp: 1, toHit: 5 };
      // STAT-FORMULA[levelBonuses:warlord:champion]
      // PROVENANCE[levelBonuses:warlord:champion]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
      case 'champion':   return { atk: 4, ranged: 4, missileRanged: 4, magicRanged: 4, thrown: 2, breath: 2, def: 5, res: 3, hp: 1, toHit: 10 };
      default:           return { atk: 0, ranged: 0, missileRanged: 0, magicRanged: 0, thrown: 0, breath: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  } else {
    switch (level) {
      // STAT-FORMULA[levelBonuses:com2:regular]
      // PROVENANCE[levelBonuses:com2:regular]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'regular':    return { atk: 1, ranged: 1, missileRanged: 1, magicRanged: 1, thrown: 0, breath: 0, def: 0, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:veteran]
      // PROVENANCE[levelBonuses:com2:veteran]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'veteran':    return { atk: 2, ranged: 2, missileRanged: 2, magicRanged: 2, thrown: 1, breath: 1, def: 1, res: 1, hp: 0, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:elite]
      // PROVENANCE[levelBonuses:com2:elite]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'elite':      return { atk: 2, ranged: 2, missileRanged: 2, magicRanged: 2, thrown: 1, breath: 1, def: 2, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:ultraElite]
      // PROVENANCE[levelBonuses:com2:ultraElite]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'ultra_elite':return { atk: 3, ranged: 3, missileRanged: 3, magicRanged: 3, thrown: 1, breath: 1, def: 3, res: 2, hp: 1, toHit: 0 };
      // STAT-FORMULA[levelBonuses:com2:champion]
      // PROVENANCE[levelBonuses:com2:champion]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8
      case 'champion':   return { atk: 3, ranged: 3, missileRanged: 3, magicRanged: 3, thrown: 1, breath: 1, def: 3, res: 2, hp: 2, toHit: 10 };
      default:           return { atk: 0, ranged: 0, missileRanged: 0, magicRanged: 0, thrown: 0, breath: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  }
}

// `Ismagicalranged` (`Units.RecalculateUnits.pas:2968-2975`) and the DOS engines' shot-type band
// `>= 30` both answer one question: is this projectile a magical one. The two engine families
// spell their tokens differently — the modern rosters carry `magic`/`magic_lightning`, the DOS
// rosters the realm split their `Battle_Unit_Attack_Magic_Realm` table really has — and this
// predicate is called from both paths, so it names both vocabularies.
function isMagicalRangedType(rangedType) {
  return rangedType === 'magic' || rangedType === 'magic_lightning'
    || rangedType === 'magic_c' || rangedType === 'magic_n' || rangedType === 'magic_s';
}

// --- Live slot type reads (M14) ---
//
// The type-list tests the engines' own gates make, asked of the record at the reading step's own
// position rather than of a pair advanced before the walk. A slot's identity — which record field
// it is — is fixed; what stands in that field is sequence state.
//
// `physicalRanged` is the DOS material body's Missile/Boulder pair, `magicalRanged` is
// `Ismagicalranged` (Units.RecalculateUnits.pas:2968-2975), and `breath` is the two independent
// breath fields, which the DOS-shaped shared slot also carries one at a time.
function slotHasPhysicalRanged(u, channel) {
  const rangedType = u[channel.rangedTypeField];
  return rangedType === 'missile' || rangedType === 'boulder';
}

function slotHasMagicalRanged(u, channel) {
  return isMagicalRangedType(u[channel.rangedTypeField]);
}

function slotHasThrown(u, channel) {
  return u[channel.thrownTypeField] === 'thrown';
}

// The two breath elements a thrown-type field can name, beside the magical-ranged vocabulary
// above: the same list decides whether a slot carries a Breath and whether a Thrown attack is
// elemental, so it is one fact about the type token and is named once here.
function isBreathThrownType(thrownType) {
  return thrownType === 'fire' || thrownType === 'lightning';
}

function slotHasBreath(u, channel) {
  return isBreathThrownType(u[channel.thrownTypeField]);
}

// The record's two independent Breath *fields*, which `U.firebreath > 0` and
// `U.lightningbreath > 0` (Units.RecalculateUnits.pas:878-882) test without a type gate because
// each is a field of its own. Which field a modern slot is, is record structure; the DOS-shaped
// shared slot is one value standing for ranged, Thrown, Breath or a gaze, so there it stays a
// live identity read.
function isBreathFieldSlot(u, channel) {
  if (channel.channelKey) {
    return channel.channelKey === 'fireBreath' || channel.channelKey === 'lightningBreath';
  }
  return slotHasBreath(u, channel);
}

// `Caster.exe`'s conventional ranged channel: the `SRanged` field itself in the modern record —
// whatever type stands in it, including while it is typeless — and the DOS-shaped shared slot
// while a conventional ranged type stands in it, since one value stands there for ranged,
// Thrown, Breath or a gaze alike.
function isConventionalRangedSlot(u, channel) {
  if (!channel || !channel.isCoM2) return false;
  return channel.channelKey ? channel.channelKey === 'ranged'
    : u[channel.rangedTypeField] !== 'none';
}

// `Ismagicalranged(rt)` is False for `rt < 1` and otherwise the entry's `Ismagic` byte
// (Units.RecalculateUnits.pas:2968-2975), so every gate the engine writes as
// `not Ismagicalranged(U.rangedtype)` also passes on a unit whose ranged type is zero: `SRanged`
// is a field of the record, present whether or not the unit owns a ranged attack. The modern
// `ranged` channel *is* that field, so those gates admit it while it is still typeless. The
// DOS-shaped shared slot is a different thing — there `'none'` means the one shared value is
// carrying a Thrown, Breath or gaze attack instead — so it keeps the two names the DOS material
// body admits.
function isNonMagicalRangedFieldSlot(u, channel) {
  if (channel.isCoM2 && channel.channelKey === 'ranged') {
    return !isMagicalRangedType(u[channel.rangedTypeField]);
  }
  return slotHasPhysicalRanged(u, channel);
}

// The modern record's three secondary channels other than Thrown: conventional Ranged and the
// two independent Breath fields.
function isModernSecondarySlot(u, channel) {
  if (!channel || !channel.isCoM2) return false;
  if (channel.channelKey) {
    return channel.channelKey === 'ranged' || channel.channelKey === 'fireBreath'
      || channel.channelKey === 'lightningBreath';
  }
  return u[channel.rangedTypeField] !== 'none' || slotHasBreath(u, channel);
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

// `unitType` is the *calculated* record as it stands at `c:survivalInstinct`: both blocks read
// the running unit (`bu->race`, `U.Fantastic`), and the step's own `when` supplies it.
// PROVENANCE[survivalInstinctEligibility]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:392fb79051e1dfb503869c27 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:b1ed625810a6547724965296
// STAT-FORMULA[survivalInstinctEligibility]
function survivalInstinctActiveForUnit(abilities, unitType, version) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'survivalInstinct')) return false;
  return !!unitType && unitType.startsWith('fantastic_');
}

// `unitType` is the *calculated* record as it stands at `c:landLinking`: both blocks read the
// running unit (`bu->race`, `U.Fantastic`), and the step's own `when` supplies it.
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

// The slot rule, in one place: a bonus never conjures a slot the unit does not have, so a write
// is skipped when `ctx.slots` says the slot is dead. That is the aura pass's own gate — "add …
// to melee/ranged when the corresponding base attack exists" — and it is the rule every ability
// write below shares. Blaze of Glory's armor-to-melee transfer is the deliberate exception: it
// is not a bonus, and it is not built here.
//
// `slot` names which of the record's gates the engine's own test corresponds to. These are gate
// names, not field names — several of them reach the same field and differ only in what the
// engine tested before writing it:
//   melee           `B.attack > 0`: the **permanent** record's melee field carrying strength,
//                   which is what every compiled melee-presence test reads
//                   (Units.RecalculateUnits.pas:466, :543, :637, :2530). The base phase settles
//                   that record, so the derivation supplies this one as a predicate over the run
//                   context and it is called rather than read (F133)
//   rtb             every secondary strength field the derivation carries: the DOS engines'
//                   one shared `.ranged` slot, or one per modern attack channel
//   ranged          `Caster.exe`'s narrow `unitT.ranged` — the conventional ranged attack only,
//                   so Thrown, both Breaths and the gazes never take the write
//   rangedField     the record's `U.ranged` field itself, whatever type stands in it, resolved
//                   against the record at the writing step's own position (`isRangedFieldSlot`)
//   rangedOrThrown  Caster.exe's conventional-ranged and Thrown fields, excluding both Breaths
//                   and every gaze field
//   rangedOrBreath  Caster.exe's conventional-ranged and two Breath fields, excluding Thrown and
//                   every gaze field
//   persistentRanged  `B.ranged > 0`: the permanent record's Ranged field carrying strength,
//                   tested without regard to what the calculated record holds
// and three that name the **DOS shared `.ranged` byte** by the test their own block makes on it.
// One byte carries conventional ranged, Thrown, Breath and a gaze there, so each of these writes
// the slot's strength field **and** the record's gaze mirrors of it (`channel.gazeMirrors`) —
// one field, one gate (F135):
//   rangedTyped     `bu->ranged_type != RAT_NONE`, the -1 sentinel and not a strength test, so a
//                   gaze template shipping strength 0 takes the write
//   rangedStrength  `bu->ranged > 0`, the byte's live strength at the block's own position
//   rangedUngated   no gate at all: the write reaches the byte whatever stands in it, and the
//                   region-`e` floor settles the result
// `whereStrength` is an optional extra test on the slot's live strength, for the blocks that
// make one (the aura pass's own `if U.ranged > 0`).
//
// The secondary-attack gates resolve against the derivation's slots (`ctx.channels`), one per
// record strength field: the DOS engines run one, the modern engines one per attack channel.
// Each slot carries its own `slots` gates and its own type fields, so one write lands on every
// field the engine writes and on no other.
//
// The modern record's independent **Doom Gaze field** is deliberately not in that list, and this
// function has no arm for it. It is a view of no attack slot, so no dead-slot abstraction covers
// it and a write reaches it only from a block that names it — of which the recalculation has
// exactly two, each written where its block is rather than through here: Focus Magic's
// `if U.doomgaze > 0 then` ($0059A66D) and Blazing Eyes ($005A1E16), which conjures the field
// where it is absent — `if U.doomgaze = 0` grants 3, otherwise +1. Both are steps of their own in
// `stats_sequence.js` (`c:focusMagic`, `c:blazingEyes`).
// A `doomGazeField` argument therefore falls through to `slotGateAdmits` and throws (F143).
const DOS_SHARED_SLOT_GATES = ['rangedTyped', 'rangedStrength', 'rangedUngated'];

// The channel list a step writes through. A context that names none is a DOS record, whose one
// shared slot stands for ranged, Thrown, Breath and the gazes at once — so the fallback is that
// slot's field triple. Every step that walks channels itself takes the list from here, so the
// DOS shape is stated once rather than re-spelled beside each walk.
function contextChannels(ctx) {
  return (ctx && ctx.channels)
    || [{ strengthField: 'rtb', rangedTypeField: 'rangedType', thrownTypeField: 'thrownType',
      slots: (ctx && ctx.slots) || null }];
}

function addToSlot(u, ctx, slot, value, whereStrength) {
  const slots = (ctx && ctx.slots) || null;
  if (slot === 'melee') {
    if (!slots || slots.melee(ctx)) u.atk += value;
    return;
  }
  const channels = contextChannels(ctx);
  for (const channel of channels) {
    if (!slotGateAdmits(u, channel, slot)) continue;
    if (whereStrength && !whereStrength(u[channel.strengthField])) continue;
    u[channel.strengthField] += value;
    // Only the three shared-byte gates carry the gaze mirrors with them. The modern gates name
    // record fields that hold no gaze, so a write through one of those reaches no gaze.
    if (!DOS_SHARED_SLOT_GATES.includes(slot)) continue;
    for (const mirror of channel.gazeMirrors || []) u[mirror] += value;
  }
}

// The secondary-strength gates, resolved against the record the sequence is mutating rather than
// predicted once before the walk (M14). Only `persistentRanged` is not a live read: it is
// `B.ranged > 0`, a fact of the permanent record, which answers the same at every position and so
// stays on the slot. `rtb` is the general dead-slot abstraction; the three DOS shared-byte gates
// below transcribe one block's own test instead, which is what a gaze record needs because its
// presence is a type fact and its strength may be empty. A slot with no gates at all — a caller that supplied none — admits every
// write, which is the shape the DOS-shaped fallback channel above relies on.
function slotGateAdmits(u, channel, gate) {
  if (gate === 'rangedField') return isRangedFieldSlot(u, channel);
  if (!channel || !channel.slots) return true;
  if (gate === 'persistentRanged') return !!channel.slots.persistentRanged;
  if (gate === 'rtb') return isLiveSlot(u, channel);
  if (gate === 'ranged') return isLiveSlot(u, channel) && u[channel.rangedTypeField] !== 'none';
  // The dead-slot rule's one source-backed exception: neither `Dec(U.ranged, 5)` nor
  // `Dec(U.thrown, 5)` has a positivity or a type gate (Units.RecalculateUnits.pas:2281-2295), so
  // each reaches its field while that field still stands empty and typeless, and the region-`e`
  // clamp settles the result. Being one of those two fields is all this gate asks (F100).
  if (gate === 'rangedOrThrown') return isModernRangedOrThrownSlot(u, channel);
  // `if U.ranged > 0`, `if U.firebreath > 0` and `if U.lightningbreath > 0` — three named record
  // fields, each carrying its own strength test, and Thrown named by none of them
  // (Units.RecalculateUnits.pas:1877-1884). Which field a slot is, is record structure; the
  // per-field strength test is the caller's `whereStrength` (F139).
  if (gate === 'rangedOrBreath') return isModernSecondarySlot(u, channel);
  // The three DOS shared-byte gates, each the test its own block makes on `bu->ranged` (F135).
  // `rangedUngated` has no test: `bu->ranged--` at Black Prayer (131:0x907F0, com1:0x9054A) and
  // `bu->ranged -= 5` at Mind Storm (131:0x9095E, com1:0x906D1) are unconditional stores, and the
  // terminal floor settles what they leave behind.
  if (gate === 'rangedUngated') return true;
  // `bu->ranged > 0` — the live byte, which is CoM 1's Holy Bonus block (com1:0x900E8).
  if (gate === 'rangedStrength') return u[channel.strengthField] > 0;
  if (gate === 'rangedTyped') return dosSharedSlotTyped(u, channel);
  throw new Error(`unknown slot gate ${gate}`);
}

// `bu->ranged_type != RAT_NONE` — Black Channels (131:0x8F437), CoM 1's Animated (com1:0x8F4EB)
// and CoM 1's Tactician hero grant (`> RAT_NONE`, com1:0x90AEC). `RAT_NONE` is the -1 sentinel,
// so **every** type passes, the three gaze types (raw 103/104/105) included, and a Gorgon shipping
// `Gaze(Stoning)` at Ranged 0 takes the write with its strength still empty. The calculator holds
// a gaze type in neither of the slot's two type fields — `GAZE_TYPES` is not in `RANGED_TYPES` or
// `THROWN_TYPES` (`data.js`) — so the record's gaze fact is the third term.
function dosSharedSlotTyped(u, channel) {
  if (!channel) return true;
  return u[channel.rangedTypeField] !== 'none'
    || u[channel.thrownTypeField] !== 'none'
    || (!channel.isCoM2 && channel.gazeType !== 'none');
}

// A slot is **alive** when the record shows an attack standing in it: a type that names one, or
// strength the permanent record supplied. This is the dead-slot rule (SPEC.md, *The step model*)
// asked at the writing step's own position, so a slot a later step fills is dead until that step
// runs and a slot an earlier step created is alive from there on. Strength alone does not settle
// it, because the ungated decrements drive a live field to zero and below and the region-`e`
// clamp settles the result.
function isLiveSlot(u, channel) {
  if (!channel) return true;
  return channel.calcBaseRtb > 0
    || u[channel.strengthField] > 0
    || u[channel.rangedTypeField] !== 'none'
    || u[channel.thrownTypeField] !== 'none';
}

// `Dec(U.thrown, 5)` and its neighbours name the modern record's Ranged and Thrown fields and
// exclude both Breaths (Units.RecalculateUnits.pas:2273-2295). Which field a slot is, is record
// structure for the modern channels; the DOS-shaped shared slot is one value standing for
// conventional ranged, Thrown, Breath or a gaze, so there it is a live identity read.
function isModernRangedOrThrownSlot(u, channel) {
  if (!channel || !channel.isCoM2) return false;
  if (channel.channelKey) {
    return channel.channelKey === 'ranged' || u[channel.rangedTypeField] !== 'none'
      || isThrownFieldSlot(u, channel);
  }
  return u[channel.rangedTypeField] !== 'none' || isThrownFieldSlot(u, channel);
}

// `SThrown` is a field of the record, not an attack the unit owns, so which slot is that field is
// a structural question asked of the record at the reading step's own position. The modern
// `thrown` channel is `SThrown` until an earlier write spends it: Lightning Blade assigns
// `SLightningBreath` and clears `SThrown` (CreateUnit.CAS:294-299), and Focus Magic moves its
// contents into `SRanged` (Units.RecalculateUnits.pas:885-891). Neither leaves `SThrown` behind.
// The DOS-shaped shared slot is one value standing for conventional ranged, Thrown, Breath or a
// gaze, so it is the Thrown field while it carries Thrown or while it stands free — which is what
// the ungated `Dec(U.thrown, …)` writes reach, and what a later grant claims.
function isThrownFieldSlot(u, channel) {
  if (!channel) return false;
  const rangedType = u[channel.rangedTypeField];
  const thrownType = u[channel.thrownTypeField];
  if (channel.channelKey) {
    return channel.channelKey === 'thrown' && rangedType === 'none'
      && thrownType !== 'fire' && thrownType !== 'lightning';
  }
  return rangedType === 'none' && (thrownType === 'thrown' || thrownType === 'none');
}

// `U.ranged` names a **field of the unit record**, not an attack the unit owns, so which slot
// that field is cannot be answered by a type test alone (F96). The modern `ranged` channel is
// `SRanged` whatever type stands in it — including while it is typeless, which is why the
// region-`c` `not Ismagicalranged` writers reach it. The DOS-shaped shared slot is a different
// thing: one value stands for conventional ranged, Thrown, Breath or a gaze there, so it is the
// Ranged field only while it carries a conventional ranged type. The record is read at the
// calling step's own position, so a type write an earlier step made — `d:blazeOfGlory` empties
// the Ranged field and retypes the shared slot — is visible to it.
function isRangedFieldSlot(u, channel) {
  if (!channel) return false;
  if (channel.channelKey === 'ranged') return true;
  const field = channel.rangedTypeField;
  return !!field && u[field] !== 'none';
}

function getAbilityStatSteps(abilities, version, identityPredicates = {}) {
  const steps = [];
  // The record's secondary strength fields, and the two shapes an ability write over them takes:
  // `attackWrites` for a write that reaches the strength fields alone, `rtbWrites` for one that
  // also reaches the two gaze strengths.
  const declared = identityPredicates.strengthFields;
  const attackWrites = declared && declared.length ? [...declared] : ['rtb'];
  const rtbWrites = [...attackWrites, 'gaze', 'doomGaze'];
  const abilityStep = (id, phase, options) => {
    steps.push(statStep({ id, phase, ...options }));
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
  // The hero flag, not the compact unit-type token. Two blocks below branch on hero-ness, and
  // every engine spells that as a hero predicate over the unit record — `U.ishero`
  // (Units.RecalculateUnits.pas:2417), `_UNITS[].Hero_Slot >= 0` (com1:0x90AB4), `ISHERO(U)`
  // (UnitCalcPre.CAS:81, OLSpell.CAS:279) — never as a race or Fantastic test. Reading them off
  // the live token instead made any Fantastic conversion answer the hero question (F187).
  const isHeroUnit = !!identityPredicates.isHero;
  // The two eligibility predicates that read the *calculated* identity. The caller supplies them
  // as functions of the running record, so each is answered where its own block stands (F163).
  const misleadEligibleAt = identityPredicates.misleadEligible || (() => true);
  const survivalInstinctEligibleAt = identityPredicates.survivalInstinctEligible || (() => true);

  // Holy Bonus: +X to melee attack, defense, resistance.
  // CoM v6.05+ and CoM2: also +X to ranged attack.
  //
  // CoM2/Warlord run it as **aura type 1 in region `e`**, after `d` and after the Warps — not
  // in `a`, where the pre-map judgment put it (CoM2 analysis, *The aura pass*).
  // The aura table merges sources by maximum rather than summing them, which the calculator's
  // single numeric input already expresses. Both attack writes are gated on the **permanent**
  // record — `if B.attack > 0` and `if B.ranged > 0` (Units.RecalculateUnits.pas:2530,2535) —
  // and neither tests a type: the ranged half asks only whether the permanent record's Ranged
  // field carries strength, which is the `persistentRanged` gate. It reaches that one field, so
  // a Thrown or Breath attack takes no bonus, and a Ranged field the calculated record has since
  // emptied or retyped still takes it.
  //
  // MoM and CoM 1 keep phase a: intrinsic unit ability, no CAS implementation, and no aura
  // pass in either DOS recompute.
  const hb = abilVal(abilities, 'holyBonus', 0);
  if (hb > 0) {
    const isCoM2 = version && version.startsWith('com2_');
    // PROVENANCE[holyBonus]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:be00bc2f90338549d6e09741 | Reference docs/DOS reconstructed/unitcalc.c@span:24:355495d2e88ef940a57b8515
    if (isCoM2) {
      abilityStep('holyBonus', 'e', { writes: ['atk', 'def', 'res', ...attackWrites],
        apply: (u, ctx) => {
          addToSlot(u, ctx, 'melee', hb); u.def += hb; u.res += hb;
          addToSlot(u, ctx, 'persistentRanged', hb);
        } });
    } else if (isCoMPlus) {
      // CoM 1's ranged half is `if (bu->ranged > 0) bu->ranged += cl` (com1:0x900E8), a live
      // strength test on the one shared byte — so it reaches a gaze only once that byte carries
      // strength. MoM and CP have no ranged half at all (131:0x900C5 writes melee alone).
      abilityStep('holyBonus', 'a', { writes: ['atk', 'def', 'res', ...rtbWrites],
        apply: (u, ctx) => {
          addToSlot(u, ctx, 'melee', hb); u.def += hb; u.res += hb;
          addToSlot(u, ctx, 'rangedStrength', hb);
        } });
    } else {
      abilityStep('holyBonus', 'a', { writes: ['atk', 'def', 'res'],
        apply: (u, ctx) => { addToSlot(u, ctx, 'melee', hb); u.def += hb; u.res += hb; } });
    }
  }

  // Animate Dead's Animated buff in CoM/CoM2: +1 to every existing attack channel,
  // +1 defense, +10% To Hit, and Weapon Immunity (RecalculateUnits $0059F7D8..$0059FBD0).
  // Weapon Immunity is added in combat flow; the stat bonuses are applied here.
  // Phase c: a spell effect with no CAS implementation.
  if (hasAbil(abilities, 'animated') && isCoMPlus) {
    // PROVENANCE[animated]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:18:c8375636d2d3d88ca4eaae97 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:28:859998a2522c86efb243689d
    abilityStep('animated', 'c', { ...beforeHolyArmor,
      writes: ['atk', 'def', ...(isCoM1 ? rtbWrites : attackWrites), 'toHit'],
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'melee', 1); u.def += 1;
        // CoM 1 writes the one shared byte under `if (bu->ranged_type != RAT_NONE)`
        // (com1:0x8F4EB), so the gaze strengths in it move with it and a strength-0 gaze
        // template still takes the +1. The modern block writes ranged, Thrown and both Breaths
        // separately and leaves the independent gaze fields alone.
        if (isCoM1) addToSlot(u, ctx, 'rangedTyped', 1);
        else addToSlot(u, ctx, 'rtb', 1);
        u.toHit += 10;
      } });
  }

  // Resistance to All: +X to resistance.
  // CoM2/Warlord feed it into **aura type 3 in region `e`** — the Prayermaster aura — so it
  // runs after `d` and after the Warps, and competes with Prayermaster by maximum rather than
  // stacking with it (CoM2 analysis, *The aura pass*). MoM and CoM 1 keep phase a: intrinsic
  // ability, no CAS, no aura pass.
  const isModern = !!(version && version.startsWith('com2_'));
  const auraValue = key => Math.max(0, parseInt(abilVal(abilities, key, 0), 10) || 0);

  // Aura type 2: `if U.ranged > 0` (Units.RecalculateUnits.pas:2543) and nothing else — the
  // calculated record's Ranged field carrying strength at this position, with no type test.
  const guidingBeaconAura = isModern ? auraValue('guidingBeaconAura') : 0;
  if (guidingBeaconAura > 0) {
    abilityStep('guidingBeaconAura', 'e', { writes: attackWrites,
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'rangedField', guidingBeaconAura, strength => strength > 0);
      } });
  }

  // Aura type 3 is shared by Resistance to All and Prayermaster. BuildAuraTable keeps the
  // maximum per owner/type, so the two sources compete rather than stack.
  const rta = abilVal(abilities, 'resistanceToAll', 0);
  const prayermasterAura = isModern ? Math.max(rta, auraValue('prayermasterAura')) : 0;
  if (prayermasterAura > 0) {
    // PROVENANCE[resistanceToAll]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:77eb7e2f668ac3b092fa3b7d | Reference docs/DOS reconstructed/unitcalc.c@span:24:355495d2e88ef940a57b8515
    abilityStep('resistanceToAll', 'e', {
      sourceId: 'prayermasterAura', sourceLabel: 'Prayermaster / Resistance to All',
      writes: ['res'], apply: u => { u.res += prayermasterAura; } });
  } else if (rta > 0) {
    abilityStep('resistanceToAll', 'a', { writes: ['res'], apply: u => { u.res += rta; } });
  }

  const divineBarrierAura = isModern ? auraValue('divineBarrierAura') : 0;
  if (divineBarrierAura > 0) {
    abilityStep('divineBarrierAura', 'e', { writes: ['def'],
      apply: u => { u.def += divineBarrierAura; } });
  }

  const soulLinkerAura = isModern ? auraValue('soulLinkerAura') : 0;
  if (soulLinkerAura > 0) {
    // The Fantastic test is the block's own, read where the block stands (F163).
    abilityStep('soulLinkerAura', 'e', { writes: ['toHit', 'toBlk'],
      when: u => !!u.fantastic,
      apply: u => { u.toHit += soulLinkerAura; u.toBlk += soulLinkerAura; } });
  }

  const leadershipAura = isModern ? auraValue('leadershipAura') : 0;
  if (leadershipAura > 0) {
    // PROVENANCE[leadershipAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:1ec384f5af2fc785c3b46a8e
    abilityStep('leadershipAura', 'e', { writes: ['atk', ...attackWrites],
      when: u => !u.fantastic,
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'melee', leadershipAura);
        const slots = ctx && ctx.slots;
        const channels = (ctx && ctx.channels)
          || [{ strengthField: 'rtb', rangedTypeField: 'rangedType', slots }];
        for (const channel of channels) {
          const liveRangedType = u[channel.rangedTypeField];
          // `not Ismagicalranged(U.rangedtype) and (U.ranged > 0)`
          // (Units.RecalculateUnits.pas:2583) is the whole gate: which record field the slot is,
          // that field's live type, and that field's live strength. `not Ismagicalranged` is
          // True for a zero ranged type (:2968-2975), so the type half admits the record's
          // `SRanged` field while it is still typeless; the DOS-shaped shared slot is not that
          // field and keeps the two names it can stand for.
          const nonMagicalRanged = channel.channelKey === 'ranged'
            ? !isMagicalRangedType(liveRangedType)
            : (liveRangedType === 'missile' || liveRangedType === 'boulder');
          if (isRangedFieldSlot(u, channel) && u[channel.strengthField] > 0 && nonMagicalRanged) {
            u[channel.strengthField] += Math.trunc(leadershipAura / 2);
          }
        }
      } });
  }

  // Lucky: +10% To Hit, +10% To Block, +1 Resistance.
  // The v1.31 enemy melee penalty (-10% To Hit) is applied in resolveCombat.
  // Permanent and early-hook sources establish the Lucky ability flag. The actual stat write
  // is the compiled `+0x044C7` block in region c and does not stack regardless of flag source.
  if (hasAbil(abilities, 'lucky')) {
    // PROVENANCE[lucky]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:bf74c9101f80f286adb7d2a0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:761ca75657bf39dc15095e55
    // Creation/enchantment sources establish ALucky earlier, but the chance/stat write itself
    // is the compiled Lucky block in region c for every engine.
    abilityStep('lucky', 'c', { ...beforeHolyArmor, writes: ['res', 'toHit', 'toBlk'],
      apply: u => { u.res += 1; u.toHit += 10; u.toBlk += 10; } });
  }

  // Lucky Star's aura: while any friendly unit in the combat carries the enchantment, every
  // friendly unit — the enchanted one included — gets phase-b +1 melee/ranged/armor/resistance
  // (UnitCalcPre.CAS:1020,1611-1623). Multiple copies do not stack; the scan counts them but
  // the grant is gated on a non-zero count. The separate Lucky grant at UnitCalcPre.CAS:1147
  // reaches only the enchanted unit, so it is the plain `lucky` control, not this one.
  // The 1.5.12.7 script is the fixed army-wide form; `Reference docs/Source discrepancies.md`
  // §10 records the earlier build's enchanted-unit-only bug.
  //
  // The block names four stats and their four bonus mirrors and nothing else: `SAttack`,
  // `SRanged`, `SDefense` and `SResist` (UnitCalcPre.CAS:1614-1621). `SRanged` is the record's
  // conventional-ranged field, written with no test of what stands in it, so the write is the
  // `rangedField` gate ungated; Thrown, both Breaths and `SDoomGaze` are named by no line of the
  // block and take nothing (F139).
  if (version && version.startsWith('com2_warlord') && hasAbil(abilities, 'luckyStar')) {
    // PROVENANCE[luckyStar]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:2cd8ef385c4ba4e42016a04d
    abilityStep('luckyStar', 'b', { writes: ['atk', 'def', 'res', ...attackWrites],
      apply: (u, ctx) => {
        // `SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+1))` (UnitCalcPre.CAS:1614) is reached by
        // a jump over the whole block on `LUCKYSTAR=0` and by no other test, so the melee write
        // has no presence gate to transcribe (F142).
        u.atk += 1; u.def += 1; u.res += 1;
        addToSlot(u, ctx, 'rangedField', 1);
      } });
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
    abilityStep('highPrayer', 'c', { writes: ['atk', 'def', 'res', 'toHit', 'toBlk'],
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'melee', 2); u.def += 2; u.res += 3; u.toHit += 10; u.toBlk += 10;
      } });
    if (hasPrayer && version && version.startsWith('com2_warlord')) {
      // PROVENANCE[prayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:cd3b7dd8d55f06aacde8812c | Reference docs/DOS reconstructed/unitcalc.c@span:19:ff7bdd24b7f56fef70abb02b | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:22:b3cdb6f87df741fb103a6989
      // `SETSTAT(U,SAttack,0,((GetStat(U,SAttack,0))+1))` (UnitCalcPre.CAS:1487) sits under the
      // both-globals test alone and carries no melee-presence gate (F142). The DOS and base-CoM2
      // Prayer blocks are compiled and keep theirs.
      abilityStep('prayer', 'b', { writes: ['atk', 'def', 'res'],
        apply: u => { u.atk += 1; u.def += 1; u.res += 1; } });
    }
  } else if (hasPrayer) {
    abilityStep('prayer', 'c', { writes: ['res', 'toHit', 'toBlk'],
      apply: u => { u.res += 1; u.toHit += 10; u.toBlk += 10; } });
  }

  // Black Prayer (debuff): -1 all conventional attack strengths, -1 Defense, -2 Resistance.
  // Phase c — curse with no CAS implementation.
  if (hasAbil(abilities, 'blackPrayer')) {
    // PROVENANCE[blackPrayer]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:17:6726e65e7d4815dc6beb7e5a | Reference docs/DOS reconstructed/unitcalc.c@span:17:7bda7e6636c6c0560ea2ecee | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:57700011d70aa83ec35b9eaa
    abilityStep('blackPrayer', 'c', {
      writes: ['atk', 'def', 'res', ...(isModern ? attackWrites : rtbWrites)],
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'melee', -1); u.def -= 1; u.res -= 2;
        // `bu->ranged--` is an unconditional store in every DOS build (131:0x907F0, com1:0x9054A)
        // — no strength test and no type test — so it reaches the one shared byte whatever
        // stands in it, gaze strengths included, and the region-`e` floor settles the result.
        // The modern engines hold the gazes in fields of their own that this block never names.
        if (isModern) addToSlot(u, ctx, 'rtb', -1);
        else addToSlot(u, ctx, 'rangedUngated', -1);
      } });
  }

  // Reinforce Magic: CoM2 global enchantment. All units gain +2 resistance.
  // The +2 magical ranged attack strength bonus is type-conditional: the
  // `reinforceMagic:ranged` step in stats_sequence.js.

  // Inner Power: CoM2 global enchantment. Units with Fire Immunity or Lightning Resist
  // gain +3 to all attack strengths, +2 defense, and +2 resistance. Eligibility is
  // resolved by innerPowerActiveForUnit so the checkbox can remain visible without
  // affecting other units.
  // Phase c: UnitCalcPre.CAS:1743-1749 grants only Mountaineer — the stat bonuses are binary.
  //
  // The block writes Resistance and Defense unconditionally and then makes three separate
  // strength tests (Units.RecalculateUnits.pas:1866-1885): melee on the **permanent** record's
  // `B.attack > 0`, which is the `melee` gate, and then `U.ranged`, `U.firebreath` and
  // `U.lightningbreath`, each on its own live `> 0`. Its decode note says in as many words that
  // it does not alter Thrown, and no line names `U.doomgaze`, so neither takes a write (F139).
  if (hasAbil(abilities, 'innerPower')) {
    // PROVENANCE[innerPower]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:cb6a5d278f05325e495f0d20
    abilityStep('innerPower', 'c', { writes: ['atk', 'def', 'res', ...attackWrites],
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'melee', 3); u.def += 2; u.res += 2;
        addToSlot(u, ctx, 'rangedOrBreath', 3, strength => strength > 0);
      } });
  }

  // Mislead/Liability supplies Misfortune aura type 10. The checkbox represents the current
  // unit receiving that aura; its live non-Fantastic gate is resolved by misleadActiveForUnit.
  // The engine applies all four writes atomically in region e after the terminal clamps. Its
  // ranged write is gated on `if B.ranged > 0` (Units.RecalculateUnits.pas:2599) — the
  // permanent record's Ranged field carrying strength, with no type test — which is the
  // `ctx.slots.persistentRanged` gate, so Thrown and Breath are unaffected.
  if (hasAbil(abilities, 'mislead')) {
    // PROVENANCE[mislead]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:bc3d65175e46c59dd1bcbd1f
    abilityStep('mislead', 'e', { writes: ['atk', 'def', 'res', ...attackWrites],
      when: u => misleadEligibleAt(u),
      apply: (u, ctx) => {
        // The melee write has no slot gate here: the engine's four writes are atomic and it
        // tests the persistent ranged slot only.
        u.atk -= 1;
        u.def -= 1;
        u.res -= 1;
        addToSlot(u, ctx, 'persistentRanged', -1);
      } });
  }

  // Stone Skin / Iron Skin: +1 / +5 Defense. Iron Skin supersedes Stone Skin.
  // Both phase c. UnitCalc.CAS:6-9 looks like a Stone Skin implementation but sits inside
  // the file's `Example - ... End of Example` header comment; UnitCalcPre.CAS:456/661 only
  // set the Iron Skin flag. Neither applies a stat.
  if (hasAbil(abilities, 'ironSkin')) {
    // PROVENANCE[ironSkin]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:7157204464b034c8f40530d5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:5:1e9389176cf9e793db19626f
    abilityStep('ironSkin', 'c', { ...beforeHolyArmor, writes: ['def'],
      apply: u => { u.def += 5; } });
  } else if (hasAbil(abilities, 'stoneSkin')) {
    // PROVENANCE[stoneSkin]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:e6801f056adc81573e92ef9b
    abilityStep('stoneSkin', 'c', { ...beforeHolyArmor, writes: ['def'],
      apply: u => { u.def += 1; } });
  }

  // Holy Armor: the `holyArmor` step in stats_sequence.js (version- and stat-conditional).

  // Lionheart: +3 Melee Attack (only if base > 0 — the melee slot gate discards it otherwise),
  // +3 Resistance. RTB bonus (non-magic ranged/thrown only) and HP bonus
  // (version/figs-dependent) are part of the `lionheart` step in stats_sequence.js.
  // Phase c — spell with no CAS implementation.

  // Flame Blade is one write to melee and secondary strength together, so the whole block is
  // the `c:flameBlade` step in stats.js — its strength half needs the per-channel type tests
  // this builder never receives. What stays here is the enchantment Flame Blade supersedes:
  // the engine's Metal Fires block will not fire while `UE_FLAME_BLADE` is set.
  const warlordBlade = version && version.startsWith('com2_warlord')
    && hasAbil(abilities, 'fieryBlade');
  if (!(hasAbil(abilities, 'flameBlade') || warlordBlade)
    && hasAbil(abilities, 'metalFires')) {
    // One compiled block, one step. `unitcalc.c` 131:0x9065F is the whole of Metal Fires, and
    // its `!FANTASTIC && !FLAME_BLADE` branch makes three writes: melee at 0x906C1, the
    // missile/Thrown strength at 0x906FC, and `Weapon_Plus1 = 1` at 0x90723. The first two are
    // this step; the third is not a stat write and sits with `metalFiresActive` in stats.js.
    // The strength test is the engine's own — missile class or Thrown, so boulder, magic ranged
    // and breath take nothing — and it reads the type live at this position, which is where
    // the block stands: far after Flame Blade's at 0x8F56E, not beside it.
    // The block is compiled into MoM 1.31 and CP 1.60 alone, which is `SCOPE_MOM` (`steps.js`).
    // PROVENANCE[metalFires]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:8c88e810ad0fd6705c30bb95
    abilityStep('metalFires', 'c', { ...beforeHolyArmor, writes: ['atk', ...attackWrites],
      when: u => !u.fantastic,
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'melee', 1);
        for (const channel of contextChannels(ctx)) {
          if (u[channel.rangedTypeField] === 'missile'
            || u[channel.thrownTypeField] === 'thrown') {
            u[channel.strengthField] += 1;
          }
        }
      } });
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
    // The executable derives three independent packages from direct predicates, and they are
    // structurally independent: a Noncorporeal combat summon takes the second and the third.
    // The normal package's admission is `(not U.combatsummoned) and (not B.Fantastic)`
    // ($005A376D..$005A3DDE) — the summoned term reads the calculated record, the Fantastic
    // term the **permanent** one, the same `B.` selector as the `B.attack > 0` melee gate
    // inside the package. There is no live-Fantastic term at the block, so a unit converted
    // to Fantastic mid-pipeline (Chaos Channels, Undead, Blood Lust, Spirit Link) keeps the
    // normal package (F179).
    if (!combatSummoned && !baseFantastic) {
      // PROVENANCE[breakthrough:normal]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:3ca5011dcfb4738952b30067 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:8:06d8d5bae6b5fee3340ddf09 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:8:06d8d5bae6b5fee3340ddf09
      abilityStep('breakthrough:normal', 'c', { writes: ['atk'],
        apply: (u, ctx) => { addToSlot(u, ctx, 'melee', 1); } });
    }
    // PROVENANCE[breakthrough:noncorporeal]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:fa4543aa4289101fada66dad
    if (nonCorporeal) {
      abilityStep('breakthrough:noncorporeal', 'c', { writes: ['atk', 'def'],
        apply: (u, ctx) => { addToSlot(u, ctx, 'melee', 1); u.def += 1; } });
    }
    // PROVENANCE[breakthrough:combatSummoned]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:0f491fbb9d925602e7b57300
    if (combatSummoned) {
      abilityStep('breakthrough:combatSummoned', 'c', { writes: ['atk', 'def'],
        apply: (u, ctx) => { addToSlot(u, ctx, 'melee', 1); u.def += 1; } });
    }
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
    const ccArmorDef = version === 'mom_1.31' ? 6 : 3;
    abilityStep('chaosChannels:armor', 'c', { ...beforeHolyArmor, writes: ['def'],
      apply: u => { u.def += ccArmorDef; } });
  }

  // Black Channels: +2 melee attack (discarded by the melee slot gate when the unit has none),
  // +1 all ranged/thrown/breath/gaze,
  // +1 defense, +1 resistance, +1 HP per figure. Death realm; MoM only.
  // Phase c — MoM-only enchantment, so there is no CAS to consult.
  if (hasAbil(abilities, 'blackChannels')) {
    // PROVENANCE[blackChannels]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:19:4a92e2a9611b35504558f854
    abilityStep('blackChannels', 'c', { ...beforeHolyArmor,
      writes: ['atk', 'def', 'res', 'hp', ...rtbWrites],
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'melee', 2); u.def += 1; u.res += 1; u.hp += 1;
        // `if (bu->ranged_type != RAT_NONE) bu->ranged += 1` (131:0x8F437) — the -1 sentinel and
        // not a strength test, so a gaze template shipping strength 0 takes the +1 on the one
        // shared byte.
        addToSlot(u, ctx, 'rangedTyped', 1);
      } });
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
    // `SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)-3))` (UnitCalc.CAS:495) is ungated, while the
    // ranged half three lines down tests `GetStat(U,SRangedType,0)>0 %AND <30` (:499) — the same
    // block gating one channel and not the other, so melee takes the write unconditionally and
    // `e:clamp` floors the result (F142).
    abilityStep('rust', 'd', { writes: ['atk'],
      apply: u => { u.atk -= 3; } });
  }

  // Mind Storm: DOS: -5 melee, -5 to the shared ranged/Thrown/Breath/Gaze slot,
  // -5 defense, -5 resistance. CoM2/Warlord: -3 melee, -5 conventional ranged and
  // Thrown only, -5 defense, -5 resistance; both Breath fields and all gazes are separate.
  // Phase c: UnitCalcPre.CAS:1221-1223 only mirrors the combat flag to overland.
  if (hasAbil(abilities, 'mindStorm')) {
    // PROVENANCE[mindStorm]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:5aef6d0a81b854a2f8a97a63 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:b93fe4b2bed30f6662144a8f
    const mindStormMelee = version && version.startsWith('com') ? -3 : -5;
    abilityStep('mindStorm', 'c', {
      writes: ['atk', 'def', 'res', ...(isModern ? attackWrites : rtbWrites)],
      apply: (u, ctx) => {
        addToSlot(u, ctx, 'melee', mindStormMelee); u.def -= 5; u.res -= 5;
        if (isModern) {
          addToSlot(u, ctx, 'rangedOrThrown', -5);
        } else {
          // `bu->ranged -= 5` is unconditional in both DOS families (131:0x9095E, com1:0x906D1),
          // so it reaches the one shared byte with no strength or type test and the region-`e`
          // floor settles the result.
          addToSlot(u, ctx, 'rangedUngated', -5);
        }
      } });
  }

  // Supreme Light is not built here. The engine writes its three stats as one block whose
  // defence component is a live read of Resistance, so it is one step in stats_sequence.js —
  // `supremeLight` in region `e` for CoM2/Warlord, `supremeLight:coM1` after CoM 1's Warp.

  // Survival Instinct: CoM/CoM2 global enchantment. Applies only to fantastic creatures;
  // eligibility is resolved by survivalInstinctActiveForUnit using the effective combat unit type.
  // Phase c — no CAS implementation in either calc file.
  if (hasAbil(abilities, 'survivalInstinct')) {
    // PROVENANCE[survivalInstinct]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:b1ed625810a6547724965296
    abilityStep('survivalInstinct', 'c', { writes: ['def', 'res', 'toHit'],
      when: u => survivalInstinctEligibleAt(u),
      apply: u => { u.def += 1; u.res += 2; u.toHit += 10; } });
  }

  // Guardian retort: CoM/CoM2 units gain +1 resistance, +10% To Hit,
  // and +10% To Defend.
  // Region c at +0x0B092 ("Guardian retort while defending a settlement"), not the a the
  // pre-map judgment gave it. UnitCalcPre.CAS:326-328 grants only a hero ability to
  // Marionettes, so Warlord adds nothing and inherits the position. Nothing between a and c
  // reads Resistance, To Hit or To Defend, so this is faithful without being observable.
  if (hasAbil(abilities, 'guardian') && isCoMPlus) {
    // PROVENANCE[guardian]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:db312d02daf8f891ea293893 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:1687b0fe505cf275355adb4e
    abilityStep('guardian', 'c', { writes: ['res', 'toHit', 'toBlk'],
      apply: u => { u.res += 1; u.toHit += 10; u.toBlk += 10; } });
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
    if (isHeroUnit) {
      abilityStep('tactician', 'c', { ...afterWarp,
        writes: ['atk', 'def', 'res', ...(isCoM1 ? rtbWrites : attackWrites)],
        apply: (u, ctx) => {
          addToSlot(u, ctx, 'melee', 2); u.def += 2; u.res += 2;
          if (isCoM1) {
            // `if (bu->ranged_type > RAT_NONE) bu->ranged += 2` (com1:0x90AEC) — the sentinel
            // test again, so the one shared byte takes it whatever type stands there.
            addToSlot(u, ctx, 'rangedTyped', 2);
          } else {
            addToSlot(u, ctx, 'ranged', 2, strength => strength > 0);
          }
        } });
      if (isWarlord) {
        // The Warlord clawback `SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)-2))`
        // (UnitCalcPre.CAS:762) is reached under the retort and in-combat tests only and carries
        // no melee-presence gate; the compiled region-`c` grant above keeps `B.attack > 0` (F142).
        abilityStep('tactician', 'b', { writes: ['atk', 'def', 'res', ...attackWrites],
          apply: (u, ctx) => {
            u.atk -= 2; u.def -= 1; u.res -= 2;
            addToSlot(u, ctx, 'ranged', -2);
          } });
      }
    } else {
      abilityStep('tactician', 'c', { ...afterWarp, writes: ['def'],
        apply: u => { u.def += 1; } });
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
    abilityStep('favoredTerrain', 'd', { writes: ['def', 'toHit'],
      apply: u => { u.def += 1 * mult; u.toHit += 5 * mult; } });
  }

  // Land Linking (+2 melee, breath and defense to fantastic units) is one hand-written
  // region-c step in stats_sequence.js: its Breath half needs the per-channel mod this
  // builder never receives. UnitCalcPre.CAS:889 is the separate Nature Link upgrade
  // (+1 resistance), not this bonus.

  // Mystic Surge: +2 Defense, -2 Resistance. The unaligned-fantastic conversion is the separate
  // No Heal normalization block at $005A0420, `c:mysticSurge:race`, which Raise Dead also
  // reaches; the -10% To Block is in resolveCombat (MODDING.INI MysticSurgeToDefPenalty=10,
  // both versions).
  // Phase c — SpellMysticSurge.CAS sets enchantment flags only; no stat application.
  if (hasAbil(abilities, 'mysticSurge')) {
    // PROVENANCE[mysticSurge]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:8:185c85844cf35c344b38d022 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:de8c9dc3bc0bf7ec94ba9028
    abilityStep('mysticSurge', 'c', { ...beforeHolyArmor, writes: ['def', 'res'],
      apply: u => { u.def += 2; u.res -= 2; } });
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
    abilityStep('armorclad', 'base', { writes: ['def'], apply: u => { u.def += 6; } });
  }

  // Battle Armor is the in-combat regular non-mechanical branch of the
  // Armorclad reform. UnitCalcPre.CAS:1106-1113 applies +3 Defense.
  if (isWarlord && hasAbil(abilities, 'battleArmor')) {
    // PROVENANCE[battleArmor]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:c7c2d7da26a07332de4fa4f3
    abilityStep('battleArmor', 'b', { writes: ['def'], apply: u => { u.def += 3; } });
  }

  // Magitek Engineering applies in UnitCalcPre.CAS to Power Engine units.
  // The reform grant helper has already derived `magitekEngine` and Large Shield.
  if (isWarlord && hasAbil(abilities, 'magitekEngine')) {
    // PROVENANCE[magitekEngine]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:8:d96a238f19276a8e5adea472
    abilityStep('magitekEngine', 'b', { writes: ['toBlk'], apply: u => { u.toBlk += 20; } });
  }

  // The Artificer retort's permanent write set is `SAttack`, `SRanged`, `SDefense`, `SResist` and
  // the four movement stats, all on record selector 1 (CreateUnit.CAS:38-47). `SRanged` is the
  // record's conventional-ranged field, written with no test of what stands in it, so the write
  // is the `rangedField` gate ungated; Thrown, both Breaths and `SDoomGaze` are named by no line
  // of the block and take nothing. The movement stats are outside the calculator's record (F139).
  if (isWarlord && hasAbil(abilities, 'artificer') && hasAbil(abilities, 'mechanical')) {
    // PROVENANCE[artificer]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:12:bcf7fbdc48f5aef331e51d9d
    abilityStep('artificer', 'base', { writes: ['atk', 'def', 'res', ...attackWrites],
      apply: (u, ctx) => {
        // `SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1))` (CreateUnit.CAS:40) has no
        // melee-presence gate, and it writes the **permanent** record — so on a unit whose
        // permanent melee was 0 it is what makes `B.attack > 0` true for every later block
        // that asks (F142).
        u.atk += 1; u.def += 1; u.res += 2;
        addToSlot(u, ctx, 'rangedField', 1);
      } });
  }

  // Mechanical Expert (Warlord): an Engineer/Combat Engineer in the stack carries this
  // perk, granting mechanical units +20% To Hit and +10% To Defend.
  // Phase d — UnitCalc.CAS:275-309.
  if (isWarlord && hasAbil(abilities, 'mechanicalExpert') && hasAbil(abilities, 'mechanical')) {
    // PROVENANCE[mechanicalExpert]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:31:5cf138553247cd4344245e09
    abilityStep('mechanicalExpert', 'd', { writes: ['toHit', 'toBlk'],
      apply: u => { u.toHit += 20; u.toBlk += 10; } });
  }

  // Rebuild (Warlord): +2 melee and +2 armor. Mechanical flag, Death/Illusion
  // Immunity, and Armor Piercing are granted in normalizeCombatUnit.
  // The two unit classes are handled by deliberately ISHERO-complementary code, in
  // different phases. Non-heroes: OLSpell.CAS:260-267 writes both stats at index 1
  // (ABase) when the spell is cast, so it is baked into the base stage.
  // Heroes: UnitCalcPre.CAS:682-691 re-applies them at index 0 on every recalc — phase b.
  if (isWarlord && hasAbil(abilities, 'rebuild')) {
    // PROVENANCE[rebuild]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS@span:13:cd5b95676a7928d0fa134508 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:8:ff5769532c07ec8df9389ec0
    // Neither branch gates the melee write: `SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+2))`
    // (UnitCalcPre.CAS:686) for the hero re-application, and
    // `SETSTAT(TU,SAttack,1,GETSTAT(TU,SAttack,1)+2)` (OLSpell.CAS:280) for the permanent
    // non-hero write (F142).
    abilityStep('rebuild', isHeroUnit ? 'b' : 'base',
      { writes: ['atk', 'def'],
        apply: u => { u.atk += 2; u.def += 2; } });
  }

  // Malnourished (Warlord): recruited under a Drought curse — permanent −1 melee, −2 armor.
  // Base stage: CreateUnit.CAS:614-618 writes both at index 1 (ABase).
  if (isWarlord && hasAbil(abilities, 'malnourished')) {
    // PROVENANCE[malnourished]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:5:66825b694152a9b945a1d0b6
    // `SETSTAT(U,SAttack,ABase,(GetStat(U,SAttack,ABase)-1))` (CreateUnit.CAS:616) is ungated;
    // a permanent melee already at 0 goes to -1 here and `e:clamp` floors it (F142).
    abilityStep('malnourished', 'base', { writes: ['atk', 'def'],
      apply: u => { u.atk -= 1; u.def -= 2; } });
  }

  // Spirit Link (Warlord, Conjurer signature): +2 Resistance. OLSpell.CAS writes the bonus
  // permanently to ABase when the spell lands, before the encounter-time pipeline. Its later
  // non-fantastic targeting status is handled at the target-gating sites; the phase-c EncMagic
  // write deliberately survives that phase-d identity change.
  if (isWarlord && hasAbil(abilities, 'spiritLink')) {
    abilityStep('spiritLink', 'base', { writes: ['res'], apply: u => { u.res += 2; } });
  }

  // Rally (Warlord, Charismatic retort exclusive combat enchantment): all friendly
  // units gain +2 Resistance until the end of combat.
  // Phase b — UnitCalcPre.CAS:1499-1504 (labelled "Rousing Speech" in the script).
  if (isWarlord && hasAbil(abilities, 'rally')) {
    // PROVENANCE[rally]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:489ddb7eb9cdcfbb11f54431
    abilityStep('rally', 'b', { writes: ['res'], apply: u => { u.res += 2; } });
  }

  // Dishearten Prophesy (Warlord, Astrologer retort exclusive city curse): garrison
  // units defending the cursed city suffer -2 Resistance in combat. Only the
  // resistance debuff is modeled (the +4 city unrest is outside this calculator).
  // Phase b — UnitCalcPre.CAS:1630-1633.
  if (isWarlord && hasAbil(abilities, 'disheartenProphecy')) {
    // PROVENANCE[disheartenProphecy]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:dff452481f1564630c441f62
    abilityStep('disheartenProphecy', 'b', { writes: ['res'], apply: u => { u.res -= 2; } });
  }

  return steps;
}
