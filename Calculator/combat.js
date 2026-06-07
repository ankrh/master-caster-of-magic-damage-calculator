// --- Combat Resolution ---
// Pure functions with no DOM dependencies. Depends on engine.js.

// Ability accessors — guard against absent abilities objects.
function hasAbil(ab, key) { return !!(ab && ab[key]); }
function abilVal(ab, key, def) { return (ab && ab[key] != null) ? ab[key] : def; }
function abilDefined(ab, key) { return ab != null && ab[key] != null; }

// Clamp a percentage to 10%-100% (MoM rules: always at least 10%, at most 100%)
function clampPct(base, mod) {
  return Math.min(1.0, Math.max(0.1, (base + mod) / 100));
}

// CoM2: remaining HP of the wounded top figure in a stack.
// If remHP is an exact multiple of hpPerFig, all figures are at full HP → return hpPerFig.
function woundedTopFigHP(remHP, hpPerFig) {
  return remHP % hpPerFig || hpPerFig;
}

// Weapon type bonuses: { atk, def, toHit }
// Magical/Mithril/Adamantium: +10% To Hit (melee, missile, boulder only)
// Mithril: +1 atk (melee, missile, boulder, thrown), +1 def
// Adamantium: +2 atk (same types), +2 def
function weaponBonus(type) {
  switch (type) {
    case 'magic':      return { atk: 0, def: 0, toHit: 10 };
    case 'mithril':    return { atk: 1, def: 1, toHit: 10 };
    case 'adamantium': return { atk: 2, def: 2, toHit: 10 };
    default:           return { atk: 0, def: 0, toHit: 0 };
  }
}

// Level bonuses vary by game version
function getLevelBonuses(level, version) {
  const isMoM = version.startsWith('mom_');
  const isWarlord = version.startsWith('com2_warlord');
  if (isMoM) {
    switch (level) {
      case 'regular':    return { atk: 1, ranged: 1, thrown: 1, def: 0, res: 1, hp: 0, toHit: 0 };
      case 'veteran':    return { atk: 1, ranged: 1, thrown: 1, def: 1, res: 2, hp: 0, toHit: 0 };
      case 'elite':      return { atk: 2, ranged: 2, thrown: 2, def: 1, res: 3, hp: 1, toHit: 10 };
      case 'ultra_elite':return { atk: 2, ranged: 2, thrown: 2, def: 2, res: 4, hp: 1, toHit: 20 };
      case 'champion':   return { atk: 3, ranged: 3, thrown: 3, def: 2, res: 5, hp: 2, toHit: 30 };
      default:           return { atk: 0, ranged: 0, thrown: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  } else if (isWarlord) {
    // Warlord differs from CoM2 only at Ultra Elite and Champion (regular/veteran/elite
    // match CoM2). See "Reference docs/Warlord mechanic changes.md":
    //   Ultra Elite: +5% to-hit, +1 attack, +1 thrown/breath, +1 armor (vs Elite)
    //   Champion:    +5% to-hit, +1 attack, +2 armor, +1 resistance (vs Ultra Elite)
    // "attack" raises both melee and ranged (lockstep, as in CoM2). The +1 mp/level
    // gains don't affect damage. Champion does NOT gain the +1 hp that CoM2 grants.
    switch (level) {
      case 'regular':    return { atk: 1, ranged: 1, thrown: 0, def: 0, res: 1, hp: 0, toHit: 0 };
      case 'veteran':    return { atk: 2, ranged: 2, thrown: 1, def: 1, res: 1, hp: 0, toHit: 0 };
      case 'elite':      return { atk: 2, ranged: 2, thrown: 1, def: 2, res: 2, hp: 1, toHit: 0 };
      case 'ultra_elite':return { atk: 3, ranged: 3, thrown: 2, def: 3, res: 2, hp: 1, toHit: 5 };
      case 'champion':   return { atk: 4, ranged: 4, thrown: 2, def: 5, res: 3, hp: 1, toHit: 10 };
      default:           return { atk: 0, ranged: 0, thrown: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  } else {
    switch (level) {
      case 'regular':    return { atk: 1, ranged: 1, thrown: 0, def: 0, res: 1, hp: 0, toHit: 0 };
      case 'veteran':    return { atk: 2, ranged: 2, thrown: 1, def: 1, res: 1, hp: 0, toHit: 0 };
      case 'elite':      return { atk: 2, ranged: 2, thrown: 1, def: 2, res: 2, hp: 1, toHit: 0 };
      case 'ultra_elite':return { atk: 3, ranged: 3, thrown: 1, def: 3, res: 2, hp: 1, toHit: 0 };
      case 'champion':   return { atk: 3, ranged: 3, thrown: 1, def: 3, res: 2, hp: 2, toHit: 10 };
      default:           return { atk: 0, ranged: 0, thrown: 0, def: 0, res: 0, hp: 0, toHit: 0 };
    }
  }
}

function supremeLightActiveForUnit(abilities, unitType, version) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'supremeLight')) return false;
  return unitType === 'fantastic_life' || hasAbil(abilities, 'caster');
}

function survivalInstinctActiveForUnit(abilities, unitType, version) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'survivalInstinct')) return false;
  return !!unitType && unitType.startsWith('fantastic_');
}

function landLinkingActiveForUnit(abilities, unitType, version) {
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));
  if (!isCoMPlus || !hasAbil(abilities, 'landLinking')) return false;
  return !!unitType && unitType.startsWith('fantastic_');
}

function innerPowerActiveForUnit(abilities, version) {
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'innerPower')) return false;
  return hasAbil(abilities, 'fireImmunity') || hasAbil(abilities, 'lightningResist');
}

function blazingEyesDoomGazeForUnit(abilities, unitType, version) {
  const baseDoomGaze = abilVal(abilities, 'doomGaze', 0);
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'blazingEyes')) return baseDoomGaze;
  if (unitType !== 'fantastic_chaos') return baseDoomGaze;
  return baseDoomGaze > 0 ? baseDoomGaze + 1 : 3;
}

function misleadActiveForUnit(abilities, unitType, version) {
  if (!version || !version.startsWith('com2_') || !hasAbil(abilities, 'mislead')) return false;
  return isNormalUnitType(unitType) || unitType === 'hero';
}

function destinyActiveForUnit(abilities, version) {
  return !!(version && version.startsWith('com2_') && hasAbil(abilities, 'destiny'));
}

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
function realmOfUnitType(unitType) {
  const us = String(unitType || '');
  if (us.startsWith('fantastic_')) return us.slice('fantastic_'.length);
  if (us.startsWith('normal_')) return us.slice('normal_'.length);
  return null;
}

// True for non-fantastic, non-hero units — plain 'normal' and any realm-tagged
// normal unit such as 'normal_life'. These share normal-unit behaviour for
// Weapon Immunity, Blood Lust targeting, Mislead, etc.
function isNormalUnitType(unitType) {
  const us = String(unitType || '');
  return us === 'normal' || us.startsWith('normal_');
}

function supernaturalMinDamageForHits(hits, version) {
  if (hits <= 0 || !version) return 0;
  if (version.startsWith('com2_')) {
    return Math.round(hits / 3);
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
// MoM: tiered at 3/6/9 tiles (-10/-20/-30%).
// CoM: tiered at 4/8/12 tiles (-10/-20/-30%).
// CoM2: -10% at 4 tiles, then -3% per additional tile.
// Long Range caps the penalty at -10% in all versions.
function distancePenalty(distance, rangedType, longRange, version) {
  if (rangedType !== 'missile' && rangedType !== 'boulder') return 0;
  let penalty = 0;
  if (version && version.startsWith('com2')) {
    if (distance >= 4) penalty = -10 - 3 * (distance - 4);
  } else if (version && version.startsWith('com')) {
    if (distance >= 12) penalty = -30;
    else if (distance >= 8) penalty = -20;
    else if (distance >= 4) penalty = -10;
  } else {
    if (distance >= 9) penalty = -30;
    else if (distance >= 6) penalty = -20;
    else if (distance >= 3) penalty = -10;
  }
  if (longRange && penalty < -10) penalty = -10;
  return penalty;
}

// --- Ability Stat Modifiers ---
// Apply ability/enchantment effects that modify base stats.
// Called after level/weapon bonuses are computed.
// `abilities` is a map of ability key -> value (bool true/false, or number).
// `version` is the game version string (e.g. 'mom_1.31', 'com_6.08', 'com2_1.05.11').
// Returns { atkMod, defMod, resMod, hpMod, toHitMod, toBlkMod, rtbMod } — additive modifiers.
function getAbilityStatModifiers(abilities, version) {
  let atkMod = 0, defMod = 0, resMod = 0, hpMod = 0, toHitMod = 0, toBlkMod = 0, rtbMod = 0;
  const isCoMPlus = version && (version.startsWith('com_') || version.startsWith('com2_'));

  // Holy Bonus: +X to melee attack, defense, resistance.
  // CoM v6.05+ and CoM2: also +X to ranged/thrown/breath attack.
  const hb = abilVal(abilities, 'holyBonus', 0);
  if (hb > 0) {
    atkMod += hb;
    defMod += hb;
    resMod += hb;
    if (isCoMPlus) {
      rtbMod += hb;
    }
  }

  // Animate Dead's Animated buff in CoM/CoM2: +1 attack, +1 defense, +10% To Hit,
  // weapon immunity. A later CoM2 fix notes the +1 should also apply to thrown/breath.
  // Weapon Immunity is added in combat flow; the stat bonuses are applied here.
  if (hasAbil(abilities, 'animated') && isCoMPlus) {
    atkMod += 1;
    defMod += 1;
    toHitMod += 10;
    rtbMod += 1;
  }

  // Resistance to All: +X to resistance.
  const rta = abilVal(abilities, 'resistanceToAll', 0);
  if (rta > 0) {
    resMod += rta;
  }

  // Lucky: +10% To Hit, +10% To Block, +1 Resistance.
  // The v1.31 enemy melee penalty (-10% To Hit) is applied in resolveCombat.
  if (hasAbil(abilities, 'lucky')) {
    toHitMod += 10;
    toBlkMod += 10;
    resMod += 1;
  }

  // Prayer / High Prayer: combat enchantments.
  // Prayer: +10% To Hit (all attacks except immolation/spells), +10% To Block, +1 Resistance.
  // High Prayer: +2 Melee Atk, +2 Defense, +3 Resistance, +10% To Hit, +10% To Block.
  // CoM2 and earlier: High Prayer supersedes Prayer (not cumulative).
  // Warlord: They stack, but To Hit and To Block do not stack — Prayer's contribution
  // when stacked is only +1 Melee Atk, +1 Defense, +1 Resistance.
  // The v1.31 enemy melee To Hit malus (-10%) is applied in resolveCombat.
  const hasPrayer = hasAbil(abilities, 'prayer');
  const hasHighPrayer = hasAbil(abilities, 'highPrayer');
  if (hasHighPrayer) {
    atkMod += 2;
    defMod += 2;
    resMod += 3;
    toHitMod += 10;
    toBlkMod += 10;
    if (hasPrayer && version && version.startsWith('com2_warlord')) {
      atkMod += 1;
      defMod += 1;
      resMod += 1;
    }
  } else if (hasPrayer) {
    resMod += 1;
    toHitMod += 10;
    toBlkMod += 10;
  }

  // Black Prayer (debuff): -1 all conventional attack strengths, -1 Defense, -2 Resistance.
  if (hasAbil(abilities, 'blackPrayer')) {
    atkMod -= 1;
    rtbMod -= 1;
    defMod -= 1;
    resMod -= 2;
  }

  // Reinforce Magic: CoM2 global enchantment. All units gain +2 resistance.
  // The +2 magical ranged attack strength bonus is type-conditional and handled in ui.js.
  if (hasAbil(abilities, 'reinforceMagic') && version && version.startsWith('com2_')) {
    resMod += 2;
  }

  // Inner Power: CoM2 global enchantment. Units with Fire Immunity or Lightning Resist
  // gain +3 to all attack strengths, +2 defense, and +2 resistance. Eligibility is
  // resolved in ui.js so the checkbox can remain visible without affecting other units.
  if (hasAbil(abilities, 'innerPower')) {
    atkMod += 3;
    rtbMod += 3;
    defMod += 2;
    resMod += 2;
  }

  // Mislead applies Misfortune in CoM2. The checkbox represents the current unit being
  // affected by Misfortune; normal units and heroes are eligible, and that gating is handled in ui.js.
  // The -1 ranged-attack penalty applies only to ranged attacks (not thrown or breath) per the
  // source helptext, so it is applied conditionally in ui.js as misleadRtbMod.
  if (hasAbil(abilities, 'mislead')) {
    atkMod -= 1;
    defMod -= 1;
    resMod -= 1;
  }

  // Stone Skin / Iron Skin: +1 / +5 Defense. Iron Skin supersedes Stone Skin.
  if (hasAbil(abilities, 'ironSkin')) {
    defMod += 5;
  } else if (hasAbil(abilities, 'stoneSkin')) {
    defMod += 1;
  }

  // Holy Armor: handled in ui.js (version- and stat-conditional).

  // Lionheart: +3 Melee Attack (only if base > 0 — guarded in ui.js), +3 Resistance.
  // RTB bonus (non-magic ranged/thrown only) and HP bonus (version/figs-dependent) in ui.js.
  if (hasAbil(abilities, 'lionheart')) {
    atkMod += 3;
    resMod += 3;
  }

  // Metal Fires / Flame Blade: +1 / +2 (MoM) or +3 (CoM/CoM2/Warlord) melee attack.
  // Flame Blade supersedes Metal Fires.
  // Missile/thrown/breath bonus and weapon upgrade are handled in stats.js (type-conditional).
  if (hasAbil(abilities, 'flameBlade')) {
    atkMod += version && version.startsWith('com') ? 3 : 2;
  } else if (hasAbil(abilities, 'metalFires')) {
    atkMod += 1;
  }

  // Blazing March: CoM/CoM2 combat enchantment. +3 melee attack to all units.
  // Missile/fire/lightning breath bonus is handled in ui.js (type-conditional).
  if (hasAbil(abilities, 'blazingMarch')) {
    atkMod += 3;
  }

  // Breakthrough: CoM2 combat enchantment resolved via the UI selector.
  // '+1melee' grants +1 melee attack.
  // '+1melee/+1def' grants +1 melee attack and +1 defense.
  const breakthroughVal = version && version.startsWith('com2')
    ? abilVal(abilities, 'breakthrough', 'none')
    : 'none';
  if (breakthroughVal === 'melee' || breakthroughVal === 'meleeDef') {
    atkMod += 1;
  }
  if (breakthroughVal === 'meleeDef') {
    defMod += 1;
  }

  // Giant Strength: +1 melee attack. +1 thrown bonus handled in ui.js (thrown only, not missile).
  if (hasAbil(abilities, 'giantStrength')) {
    atkMod += 1;
  }

  // Chaos Channels (Demon-Skin Armor): +6 Defense in MoM 1.31 (bug: applied twice in combat),
  // +3 Defense in MoM 1.40+/CP 1.60/CoM/CoM2 (Insecticide fix).
  // Fire Breath option is handled in stats.js (modifies thrownType/rtb).
  if (abilVal(abilities, 'ccDefense', false)) {
    defMod += (version === 'mom_1.31') ? 6 : 3;
  }

  // Black Channels: +2 melee attack (gated on baseAtk > 0 in ui.js), +1 all ranged/thrown/breath/gaze,
  // +1 defense, +1 resistance, +1 HP per figure. Death realm; MoM only.
  if (hasAbil(abilities, 'blackChannels')) {
    atkMod += 2;
    rtbMod += 1;
    defMod += 1;
    resMod += 1;
    hpMod += 1;
  }

  // Weakness: -2 (MoM) or -3 (CoM/CoM2) melee attack. RTB penalty is type-specific, applied in ui.js.
  if (hasAbil(abilities, 'weakness')) {
    const isCoM = version && version.startsWith('com');
    atkMod -= isCoM ? 3 : 2;
  }

  // Rust (Warlord): -3 melee attack. The matching -3 to physical ranged (missile/boulder),
  // weapon stripping, thrown removal, and Large Shield removal are handled in stats.js.
  if (version && version.startsWith('com2_warlord') && hasAbil(abilities, 'rust')) {
    atkMod -= 3;
  }

  // Mind Storm: MoM: -5 melee, -5 all ranged/thrown/breath, -5 defense, -5 resistance.
  // CoM2: -3 melee, -5 all ranged/thrown, -5 defense, -5 resistance.
  if (hasAbil(abilities, 'mindStorm')) {
    const isCoM = version && version.startsWith('com');
    atkMod -= isCoM ? 3 : 5;
    rtbMod -= 5;
    defMod -= 5;
    resMod -= 5;
  }

  // Supreme Light: CoM/CoM2 combat enchantment. Applies only to Life creatures and
  // Caster units; the defense-from-resistance component is handled in ui.js because
  // it depends on the effective resistance after other modifiers are applied.
  // The +2 ranged-attack bonus is type-conditional (ranged only — not thrown/breath)
  // and handled in ui.js.
  if (hasAbil(abilities, 'supremeLight')) {
    atkMod += 2;
  }

  // Survival Instinct: CoM/CoM2 global enchantment. Applies only to fantastic creatures;
  // eligibility is resolved in ui.js using the effective combat unit type.
  if (hasAbil(abilities, 'survivalInstinct')) {
    defMod += 1;
    resMod += 2;
    toHitMod += 10;
  }

  // Guardian retort: CoM/CoM2 units gain +1 resistance, +10% To Hit,
  // and +10% To Defend.
  if (hasAbil(abilities, 'guardian') && isCoMPlus) {
    resMod += 1;
    toHitMod += 10;
    toBlkMod += 10;
  }

  // Tactician retort:
  // CoM/CoM2: non-hero units gain +1 defense; heroes gain +2 defense, +2 resistance,
  //           and +2 to all attack strengths.
  // Warlord:  all units gain +1 defense (no hero distinction).
  //           Teleporting units also gain First Strike; Non-Corporeal units gain
  //           Negate First Strike — those ability grants are applied in normalizeCombatUnit.
  if (hasAbil(abilities, 'tactician') && isCoMPlus) {
    const isWarlord = version && version.startsWith('com2_warlord');
    if (isWarlord || abilVal(abilities, 'unitType', 'normal') !== 'hero') {
      defMod += 1;
    } else {
      atkMod += 2;
      rtbMod += 2;
      defMod += 2;
      resMod += 2;
    }
  }

  // Favored Terrain (Warlord): a unit fighting on its favored combat tile gains
  // +5% To Hit and +1 defense. With the Tactician retort the terrain bonus is
  // doubled (and Tactician also grants First Strike + Negate First Strike — see
  // applyTacticianWarlordEffects).
  if (hasAbil(abilities, 'favoredTerrain') && version && version.startsWith('com2_warlord')) {
    const mult = hasAbil(abilities, 'tactician') ? 2 : 1;
    toHitMod += 5 * mult;
    defMod += 1 * mult;
  }

  // Land Linking: CoM/CoM2 grants +2 melee, breath, and defense to fantastic units.
  // Breath is handled in stats.js.
  if (hasAbil(abilities, 'landLinking')) {
    atkMod += 2;
    defMod += 2;
  }

  // Mystic Surge: +2 Defense, -2 Resistance. The unaligned-fantastic conversion and
  // -10% To Block are applied in ui.js / resolveCombat.
  if (hasAbil(abilities, 'mysticSurge')) {
    defMod += 2;
    resMod -= 2;
  }

  // Artificer retort (Warlord): mechanical units gain +1 melee, +1 ranged,
  // +1 armor, +1 resistance. Magic Weapons component handled in stats.js.
  // Rebuild's mechanical conversion is propagated via effectiveAbilities in stats.js.
  const isWarlord = version && version.startsWith('com2_warlord');
  if (isWarlord && hasAbil(abilities, 'artificer') && hasAbil(abilities, 'mechanical')) {
    atkMod += 1;
    rtbMod += 1;
    defMod += 1;
    resMod += 1;
  }

  // Mechanical Expert (Warlord): an Engineer/Combat Engineer in the stack carries this
  // perk, granting mechanical units +20% To Hit and +10% To Defend.
  if (isWarlord && hasAbil(abilities, 'mechanicalExpert') && hasAbil(abilities, 'mechanical')) {
    toHitMod += 20;
    toBlkMod += 10;
  }

  // Rebuild (Warlord): +2 melee and +2 armor. Mechanical flag, Death/Illusion
  // Immunity, and Armor Piercing are granted in normalizeCombatUnit.
  if (isWarlord && hasAbil(abilities, 'rebuild')) {
    atkMod += 2;
    defMod += 2;
  }

  // Malnourished (Warlord): recruited under a Drought curse — permanent −1 melee, −2 armor.
  if (isWarlord && hasAbil(abilities, 'malnourished')) {
    atkMod -= 1;
    defMod -= 2;
  }

  // Spirit Link (Warlord, Conjurer signature): +2 Resistance. The non-fantastic
  // targeting status (Dispel Evil immunity, no enemy Bless bonus, Weapon Immunity
  // now stops its attacks) is handled at the target-gating sites; fantastic-only
  // bonuses are retained because the unit keeps its fantastic_<realm> type.
  if (isWarlord && hasAbil(abilities, 'spiritLink')) {
    resMod += 2;
  }

  // Rally (Warlord, Charismatic retort exclusive combat enchantment): all friendly
  // units gain +2 Resistance until the end of combat.
  if (isWarlord && hasAbil(abilities, 'rally')) {
    resMod += 2;
  }

  // Dishearten Prophesy (Warlord, Astrologer retort exclusive city curse): garrison
  // units defending the cursed city suffer -2 Resistance in combat. Only the
  // resistance debuff is modeled (the +4 city unrest is outside this calculator).
  if (isWarlord && hasAbil(abilities, 'disheartenProphecy')) {
    resMod -= 2;
  }

  return { atkMod, defMod, resMod, hpMod, toHitMod, toBlkMod, rtbMod };
}

// --- Poison Touch ---
// Compute probability of failing a single poison resistance roll.
// MoM: d10, success if roll ≤ Resistance. pFail = max(0, (10 - res) / 10).
// CoM2: universal -1 save modifier → pFail = max(0, (11 - res) / 10).
// Returns 0 if target is immune (Poison Immunity grants +50/+100 resistance, effective resistance ≥ 10).
// Magic Immunity does NOT protect from Poison — it is not a magical effect.
function poisonFailProb(defRes, defAbilities, version) {
  const isCoM = version && version.startsWith('com');
  const immuneBonus = hasAbil(defAbilities, 'poisonImmunity') ? (isCoM ? 100 : 50) : 0;
  const penalty = isCoM ? 1 : 0;
  const effectiveRes = defRes - penalty + immuneBonus;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Stoning Touch ---
// Compute probability of failing a stoning resistance roll.
// MoM: d10, success if roll ≤ (Resistance + modifier). The stoningTouch value is negative
// (e.g. -3 means a -3 penalty to the target's resistance roll).
// Returns 0 if target is immune (Stoning/Magic Immunity grants +50/+100 resistance, effective resistance ≥ 10).
function stoningFailProb(defRes, defAbilities, modifier, version) {
  const isCoM = version && version.startsWith('com');
  const immuneBonus = (hasAbil(defAbilities, 'stoningImmunity') || hasAbil(defAbilities, 'magicImmunity')) ? (isCoM ? 100 : 50) : 0;
  const effectiveRes = defRes + modifier + immuneBonus;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Death Touch ---
// Same kill-roll mechanics as Stoning Touch, but with the Death-realm immunity model:
// Death Immunity or Magic Immunity grant +50/+100 res (MoM/CoM), Righteousness +30.
// Each attacking figure makes one resistance roll on the target; a failed roll kills
// one defender figure.
function deathTouchFailProb(defRes, defAbilities, modifier, version) {
  const isCoM = version && version.startsWith('com');
  let bonus = 0;
  if (hasAbil(defAbilities, 'deathImmunity') || hasAbil(defAbilities, 'magicImmunity')) bonus = isCoM ? 100 : 50;
  else if (hasAbil(defAbilities, 'righteousness')) bonus = 30;
  const effectiveRes = defRes + modifier + bonus;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// --- Dispel Evil / Exorcise (shared) ---
// Both are resist-or-banish effects that kill one fantastic figure per attacking
// figure on a failed resist roll, with no defense roll. They share this core: a
// positive `penalty` is the total Resistance reduction on the target. Magic Immunity
// grants +50/+100 effective resistance; a final effective Resistance >= 10 is immune.
// The realm-targeting and penalty values differ per effect (see callers below).
function fantasticResistKillFailProb(defRes, defAbilities, penalty, version) {
  const isCoM = version && version.startsWith('com');
  const immuneBonus = hasAbil(defAbilities, 'magicImmunity') ? (isCoM ? 100 : 50) : 0;
  const effectiveRes = defRes - penalty + immuneBonus;
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
function dispelEvilFailProb(defRes, defAbilities, defUnitType, version) {
  if (hasAbil(defAbilities, 'spiritLink')) return 0;
  let penalty;
  if (isCreatedUndeadTarget(defUnitType, defAbilities)) {
    penalty = 9;
  } else if (defUnitType === 'fantastic_death' || defUnitType === 'fantastic_chaos') {
    penalty = 4;
  } else {
    return 0;
  }
  return fantasticResistKillFailProb(defRes, defAbilities, penalty, version);
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
  const penalty = -modifier + (isCreatedUndeadTarget(defUnitType, defAbilities) ? 3 : 0);
  return fantasticResistKillFailProb(defRes, defAbilities, penalty, version);
}

// --- Death Gaze ---
// Same roll mechanics as Stoning Gaze. Death/Magic Immunity grants +50/+100 resistance.
// Righteousness grants +30 resistance (always pushes effective Res ≥ 10).
function deathGazeFailProb(defRes, defAbilities, modifier, version) {
  const isCoM = version && version.startsWith('com');
  let bonus = 0;
  if (hasAbil(defAbilities, 'deathImmunity') || hasAbil(defAbilities, 'magicImmunity')) bonus = isCoM ? 100 : 50;
  else if (hasAbil(defAbilities, 'righteousness')) bonus = 30;
  const effectiveRes = defRes + modifier + bonus;
  if (effectiveRes >= 10) return 0;
  return Math.max(0, (10 - effectiveRes) / 10);
}

// Build the combined gaze damage distribution delivered by `atk` against `def`.
// Includes (at most once) the hidden physical ranged component, followed by
// doom gaze (exact damage), stoning-kill rolls and death-kill rolls.
// Blur applies only to the hidden physical ranged component, not doom gaze.
function buildGazeDist(atk, def, defAlive, defRemHP, stoningFail, deathFail, doomStr, defDefStat, defInvulnBonus, blurChance, blurBuggy, defTopFigHP, conventionalAsDoom = false, defToBlockOverride = null, minDamageFromHits = null) {
  if (defAlive <= 0 || defRemHP <= 0) return [1];
  let dist = [1];
  const defStat = (defDefStat != null) ? defDefStat : def.def;
  const defToBlock = (defToBlockOverride != null) ? defToBlockOverride : def.toBlock;
  if (atk.effectiveGazeRanged > 0) {
    dist = conventionalAsDoom
      ? calcDoomDist(1, atk.effectiveGazeRanged, defRemHP)
      : calcTotalDamageDist(1, atk.effectiveGazeRanged, atk.toHitRtb, defStat, defToBlock, def.hp, defRemHP, defInvulnBonus, blurChance, blurBuggy, defTopFigHP, minDamageFromHits);
  }
  // Doom Gaze: exact damage, no rolls, no immunities
  if (doomStr > 0) {
    const doomDist = new Array(Math.min(doomStr, defRemHP) + 1).fill(0);
    doomDist[Math.min(doomStr, defRemHP)] = 1;
    dist = convolveDists(dist, doomDist, defRemHP);
  }
  if (stoningFail > 0) {
    dist = convolveDists(dist, calcFigureKillDmgDist(defAlive, stoningFail, def.hp, defRemHP), defRemHP);
  }
  if (deathFail > 0) {
    dist = convolveDists(dist, calcFigureKillDmgDist(defAlive, deathFail, def.hp, defRemHP), defRemHP);
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
    lifeSteal = false,
    immolation = false,
  } = params;
  let out = label;
  if (poisonTouch) out += ' + Poison Touch';
  if (stoningTouch) out += ' + Stoning Touch';
  if (deathTouch) out += ' + Death Touch';
  if (dispelEvil) out += ' + Dispel Evil';
  if (exorcise) out += ' + Exorcise';
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
    lifeSteal,
    immolation,
  } = params;
  let label = thrownType === 'thrown' ? 'Thrown'
            : thrownType === 'fire' ? 'Fire Breath'
            : 'Lightning Breath';
  if (hasted) label = 'Hasted ' + label;
  return appendBreakdownTouchLabels(label, { poisonTouch, stoningTouch, deathTouch, dispelEvil, exorcise, lifeSteal, immolation });
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
    lifeSteal,
    immolation,
  } = params;
  return appendBreakdownTouchLabels(side + ' ' + gazeLabel(stoningGaze, deathGaze, doomGaze), {
    poisonTouch,
    stoningTouch,
    deathTouch,
    dispelEvil,
    exorcise,
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
// Returns null if immune (Death/Magic Immunity +50/+100 res, or Righteousness +30 res, or effective Res ≥ 10).
// The lifeSteal value is the resistance penalty (e.g. -3 means target's res is penalized by 3).
function lifeStealEffective(defRes, defAbilities, modifier, version) {
  const isCoM = version && version.startsWith('com');
  let bonus = 0;
  if (hasAbil(defAbilities, 'deathImmunity') || hasAbil(defAbilities, 'magicImmunity')) bonus = isCoM ? 100 : 50;
  else if (hasAbil(defAbilities, 'righteousness')) bonus = 30;
  const effRes = defRes + modifier + bonus;
  if (effRes >= 10) return null;
  return modifier;
}

// Check whether touch attacks fire for a given attack phase.
// v1.31 bug: touch attacks don't fire if the effective attack value is 0.
// Other versions: only skip if the base (pre-modifier) attack value is 0.
function touchAttackFires(effectiveAtk, baseAtk, version) {
  if (version === 'mom_1.31') return effectiveAtk > 0;
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
function weaponImmunityDef(baseDef, defAbilities, atkWeapon, atkUnitType, version, atkGeneric) {
  if (!hasWeaponImmunityEffect(defAbilities)) return baseDef;
  // Ruler of Underworld preserves Weapon Immunity against magical/mithril/adamantium
  // weapons, but still only against normal-unit attacks.
  const weaponBypasses = atkWeapon !== 'normal' && !hasAbil(defAbilities, 'rulerOfUnderworld');
  if (weaponBypasses) return baseDef;
  if (!isNormalUnitType(atkUnitType)) return baseDef;
  if (version === 'mom_1.31' && atkGeneric) return baseDef;
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
function missileImmunityDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'missileImmunity')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Fire Immunity ---
// Raises defense against Fire Breath and Immolation damage. MoM: 50. CoM/CoM2: 100.
// Applied after armor piercing and weapon immunity.
function fireImmunityDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'fireImmunity')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Righteousness ---
// Life-realm unit enchantment. Protects against Chaos/Death magic.
// In combat, applies:
//   Defense 50 (MoM) / 100 (CoM/CoM2) vs Chaos-realm Ranged Magical Attack (magic_c), Fire Breath, Lightning Breath
//   Defense 50/100 vs Immolation and Wall of Fire (via magicImmunityDef chain)
//   +30 Resistance vs Cause Fear, Life Steal, Death Gaze (always pushes effective Res ≥ 10).
function righteousnessDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'righteousness')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Magic Immunity (defense) ---
// Raises defense against magic ranged attacks, Immolation, and Wall of Fire.
// MoM: defense set to 50. CoM/CoM2: defense set to 100.
// Applied after other defense modifiers; overrides Fire Immunity and Righteousness if higher.
function magicImmunityDef(baseDef, defAbilities, version) {
  if (!hasAbil(defAbilities, 'magicImmunity')) return baseDef;
  return (version && version.startsWith('com')) ? 100 : 50;
}

// --- Immolation ---
// Immolation strength: 4 in MoM, 10 in CoM/CoM2.
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
// Death/Magic Immunity grants +50/+100 resistance.
// Righteousness grants +30 resistance (always pushes effective Res ≥ 10).
function fearFailProb(defRes, defAbilities, version) {
  const isCoM = version && version.startsWith('com');
  const modifier = isCoM ? -3 : 0;
  let bonus = 0;
  if (hasAbil(defAbilities, 'deathImmunity') || hasAbil(defAbilities, 'magicImmunity')) bonus = isCoM ? 100 : 50;
  else if (hasAbil(defAbilities, 'righteousness')) bonus = 30;
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
function calcMeleeTouchDmg(fearDist, maxFigs, isDoom, atk, toHit,
                            def, toBlock, targetHP, remHP,
                            poisonStr, poisonFail,
                            stoningFail,
                            deathTouchFail,
                            dispelEvilFail,
                            exorciseFail,
                            lifeStealMod, lifeStealRes,
                            immolationDist, defInvulnBonus,
                            blurChance, blurBuggy,
                            doubleStrike, defTopFigHP,
                            minDamageFromHits) {
  return calcMeleeTouchOutcome(
    fearDist, maxFigs, isDoom, atk, toHit,
    def, toBlock, targetHP, remHP,
    poisonStr, poisonFail,
    stoningFail,
    deathTouchFail,
    dispelEvilFail,
    exorciseFail,
    lifeStealMod, lifeStealRes,
    immolationDist, defInvulnBonus,
    blurChance, blurBuggy,
    doubleStrike, defTopFigHP,
    minDamageFromHits
  ).damageDist;
}

function calcMeleeTouchOutcome(fearDist, maxFigs, isDoom, atk, toHit,
                               def, toBlock, targetHP, remHP,
                               poisonStr, poisonFail,
                               stoningFail,
                               deathTouchFail,
                               dispelEvilFail,
                               exorciseFail,
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
    stoningFail, deathTouchFail, dispelEvilFail, exorciseFail, targetHP,
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

function applyAnimatedEffects(unit, version) {
  if (!hasAbil(unit.abilities, 'animated')) return unit;
  const isCoMPlus = version !== 'mom_1.31' && version !== 'mom_1.60';
  if (!isCoMPlus) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { weaponImmunity: true }),
  });
}

// Apply immunities from Black Channels.
// Grants Cold, Illusion, Poison, Death immunities in all versions (BC explicitly grants all four,
// unlike the Undead attribute which only grants Death Immunity in v1.31).
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
// applied in getAbilityStatModifiers.
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
function applyVampirismEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'vampirism')) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { undead: true, bloodSucker: true }),
  });
}

// Warlord Revenant (Death uncommon unit enchantment): unit permanently becomes
// undead for the battle and gains melee Death Touch 0. Immunities follow from the
// granted `undead` flag via applyUndeadImmunities. Death Touch fires per attacking
// figure on melee (and is blocked on ranged attacks by the Warlord touch-dispatch
// rule). Regeneration has no bearing on single-combat damage.
function applyRevenantEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'revenant')) return unit;
  const extra = { undead: true };
  // Don't override an existing (stronger) Death Touch the unit already carries.
  if (!abilDefined(unit.abilities, 'deathTouch')) extra.deathTouch = 0;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, extra),
  });
}

// Warlord Angelic Guardians (Life rare global enchantment): in combat, grants or
// improves Exorcise Touch on friendly units. Only realm-less units (normal/hero) and
// Life-realm units (Life creatures and Sanctified units) are buffed — fantastic
// creatures of any other realm receive nothing. The tier depends on the realm:
//   - already has Exorcise: extra -3 (life) / -2 (regular) save penalty
//   - no Exorcise: gains it at -1 (life) / -0 (regular)
// Run after the effective unit type is finalized, so Sanctify's life-realm rewrite is
// already reflected. The extra -3 vs created-undead defenders lives in exorciseFailProb.
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

function bloodLustMeleeAttack(atkUnit, defUnit) {
  // Spirit Link makes the target count as a non-fantastic unit for being targeted,
  // so Blood Lust's "double melee vs Normal/Hero" applies to it as well.
  const targetIsNormal = defUnit && (isNormalUnitType(defUnit.unitType) || defUnit.unitType === 'hero'
    || hasAbil(defUnit.abilities, 'spiritLink'));
  if (!targetIsNormal || !hasAbil(atkUnit.abilities, 'bloodLust')) return atkUnit.atk;
  return atkUnit.atk * 2;
}

// --- Resistance/Defense bonuses from Elemental Armor / Resist Elements ---
// Bonus amounts to a unit's resistance vs Stoning. CoM RE +4 (Nature only); MoM both grant bonus.
function elemResistBonus(unit, version) {
  const elemVal = abilVal(unit.abilities, 'elemArmor', 'none');
  const isCoM = version && version.startsWith('com');
  if (isCoM) return elemVal === 'resistElements' ? 4 : 0;
  return elemVal === 'elementalArmor' ? 10 : elemVal === 'resistElements' ? 3 : 0;
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
function computeDefenseProfile(target, attacker, version, vertigoDefPenalty) {
  const isCoM = version && version.startsWith('com');

  // Bless (defense half) — version-sensitive scope (no melee bonus in CoM/CoM2/Warlord).
  const tBless = hasAbil(target.abilities, 'bless');
  const isWarlord = version && version.startsWith('com2_warlord');
  const blessBonus = isWarlord ? 7 : (isCoM ? 5 : 3);
  // Spirit Link strips the attacker's fantastic targeting status: enemy Bless gains
  // no bonus against it, so it is treated as a non-Death/Chaos-fantastic attacker.
  const aSpiritLink = hasAbil(attacker.abilities, 'spiritLink');
  const aIsDC = !aSpiritLink && (attacker.unitType === 'fantastic_death' || attacker.unitType === 'fantastic_chaos');
  const aThrownDC = attacker.thrownType === 'fire' || attacker.thrownType === 'lightning'
                  || (attacker.thrownType === 'thrown' && aIsDC);
  const aRangedDC = attacker.rangedType === 'magic_c'
                  || ((attacker.rangedType === 'missile' || attacker.rangedType === 'boulder') && aIsDC);
  const blessMeleeActive = !isCoM;
  const blessMelee  = (blessMeleeActive && tBless && aIsDC) ? blessBonus : 0;
  const blessThrown = (tBless && aThrownDC) ? blessBonus : 0;
  const blessRanged = (tBless && aRangedDC) ? blessBonus : 0;
  const blessGaze   = (tBless && aIsDC)     ? blessBonus : 0;
  const blessImm    = tBless ? blessBonus : 0;

  // Large Shield — applies to all non-melee phases.
  const tLargeShield = hasAbil(target.abilities, 'largeShield');
  const largeShieldBonus = isCoM ? 3 : 2;

  // Elemental Armor / Resist Elements defense bonus and per-phase trigger.
  const tElemVal = abilVal(target.abilities, 'elemArmor', 'none');
  const elemDefBonus = isCoM
    ? (tElemVal === 'elementalArmor' ? 12 : tElemVal === 'resistElements' ? 4 : 0)
    : (tElemVal === 'elementalArmor' ? 10 : tElemVal === 'resistElements' ? 3 : 0);
  const aRangedElem = isCoM
    ? (attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n' || attacker.rangedType === 'magic_s')
    : (attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n');
  const aThrownElem = attacker.thrownType === 'fire' || attacker.thrownType === 'lightning';
  const aStoningGazeOnly = abilDefined(attacker.abilities, 'stoningGaze')
                       && !abilDefined(attacker.abilities, 'deathGaze');
  const elemRanged = aRangedElem ? elemDefBonus : 0;
  const elemThrown = aThrownElem ? elemDefBonus : 0;
  const elemGaze   = (!isCoM && aStoningGazeOnly) ? elemDefBonus : 0;
  // Immolation is fire/Chaos-realm — elem bonus applies in MoM but not CoM (not "magical ranged").
  const elemImm    = !isCoM ? elemDefBonus : 0;

  // Defense bases. Note: immolation deliberately uses pre-Vertigo `target.def` (Vertigo's
  // defense penalty applies to conventional attacks, not immolation).
  const defBase = Math.max(0, target.def - vertigoDefPenalty);
  const defLS = tLargeShield ? defBase + largeShieldBonus : defBase;
  const defLSNoVert = tLargeShield ? target.def + largeShieldBonus : target.def;

  // Armor Piercing (and intrinsic Lightning Breath AP, cancelled by Lightning Resist).
  const aArmorPiercing = hasAbil(attacker.abilities, 'armorPiercing');
  const tLightningResist = hasAbil(target.abilities, 'lightningResist');
  const lightningAP = attacker.thrownType === 'lightning' && !tLightningResist;
  const halve = (n) => Math.floor(n / 2);
  const defAPMelee   = aArmorPiercing ? halve(defBase + blessMelee)             : (defBase + blessMelee);
  const defAPRanged  = aArmorPiercing ? halve(defLS + blessRanged + elemRanged) : (defLS + blessRanged + elemRanged);
  const defAPGaze    = aArmorPiercing ? halve(defLS + blessGaze + elemGaze)     : (defLS + blessGaze + elemGaze);
  const defAPImm     = aArmorPiercing ? halve(defLSNoVert + blessImm + elemImm) : (defLSNoVert + blessImm + elemImm);
  const defAPThrown  = (aArmorPiercing || lightningAP)
    ? halve(defLS + blessThrown + elemThrown) : (defLS + blessThrown + elemThrown);

  // Weapon Immunity. Blazing March upgrades melee + missile attacks to magical weapons in CoM/CoM2.
  // Warlord also upgrades thrown attacks.
  const aBlazingMarch = hasAbil(attacker.abilities, 'blazingMarch');
  const isWarlordVersion = version && version.startsWith('com2_warlord');
  const meleeWeaponWI = (aBlazingMarch && attacker.weapon === 'normal') ? 'magic' : attacker.weapon;
  const rangedWeaponWI = (aBlazingMarch && attacker.rangedType === 'missile' && attacker.weapon === 'normal')
    ? 'magic' : attacker.weapon;
  const thrownWeaponWI = (aBlazingMarch && isWarlordVersion && attacker.thrownType === 'thrown' && attacker.weapon === 'normal')
    ? 'magic' : attacker.weapon;

  // Spirit Link: the attacker no longer counts as fantastic for Weapon Immunity, so
  // its physical (non-magical) attacks are stopped by WI like a normal unit's. Gaze
  // stays magical regardless, so it keeps using the real fantastic type below.
  const atkWIType = aSpiritLink ? 'normal' : attacker.unitType;
  let vsMelee = weaponImmunityDef(defAPMelee, target.abilities, meleeWeaponWI, atkWIType, version, attacker.generic);
  // Gaze: hidden ranged component — gaze attackers are always fantastic so WI never triggers,
  // but Magic Immunity applies (it's a magical ranged attack).
  let vsGaze = magicImmunityDef(
    weaponImmunityDef(defAPGaze, target.abilities, attacker.weapon, attacker.unitType, version, attacker.generic),
    target.abilities, version);

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
  const wiTriggeredOnMissile = isMissile && hasAbil(target.abilities, 'weaponImmunity')
    && rangedWeaponWI === 'normal' && isNormalUnitType(atkWIType);
  if (isMissile && !(version === 'mom_1.31' && wiTriggeredOnMissile)) {
    vsRanged = missileImmunityDef(vsRanged, target.abilities, version);
  }

  // Righteousness vs Chaos magic ranged.
  if (attacker.rangedType === 'magic_c') {
    vsRanged = righteousnessDef(vsRanged, target.abilities, version);
  }
  // Magic Immunity vs all magic ranged.
  if (attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n' || attacker.rangedType === 'magic_s') {
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

  // Immolation defense chain: AP-applied base → Magic Immunity → Fire Immunity → Righteousness.
  let vsImmolation = righteousnessDef(
    fireImmunityDef(
      magicImmunityDef(defAPImm, target.abilities, version),
      target.abilities, version),
    target.abilities, version);

  // Illusion: sets defense to city walls bonus only on every phase. Negated by Illusion Immunity.
  const aIllusion = hasAbil(attacker.abilities, 'illusion');
  const tIllusionImmune = hasAbil(target.abilities, 'illusionImmunity');
  if (aIllusion && !tIllusionImmune) {
    const cw = target.cityWallBonus || 0;
    vsMelee = cw;
    vsRanged = cw;
    vsThrown = cw;
    vsGaze = cw;
    vsImmolation = cw;
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
      const fsApplies = !ctx.isCoM1Only || woundedTopFigHP(capB, ctx.b.hp) <= 24;
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
      const fsApplies = !ctx.isCoM1Only || woundedTopFigHP(capB, ctx.b.hp) <= 24;
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

// Touch-attack parameters for `self` striking `other` in melee.
function meleeTouchParams(self, other, otherResM, otherResDeath, otherResStoning, ver) {
  const fires = touchAttackFires(self.atk, self.baseAtk, ver);
  const poisonStr = fires ? abilVal(self.abilities, 'poison', 0) : 0;
  return {
    poisonStr,
    poisonFail:     poisonStr > 0 ? poisonFailProb(other.res, other.abilities, ver) : 0,
    stoningFail:    (fires && abilDefined(self.abilities, 'stoningTouch'))
                      ? stoningFailProb(otherResStoning, other.abilities, self.abilities.stoningTouch, ver) : 0,
    deathTouchFail: (fires && abilDefined(self.abilities, 'deathTouch'))
                      ? deathTouchFailProb(otherResDeath, other.abilities, self.abilities.deathTouch, ver) : 0,
    dispelEvilFail: (fires && hasAbil(self.abilities, 'dispelEvil'))
                      ? dispelEvilFailProb(otherResM, other.abilities, other.unitType, ver) : 0,
    exorciseFail:   (fires && abilDefined(self.abilities, 'exorcise'))
                      ? exorciseFailProb(otherResM, other.abilities, other.unitType, self.abilities.exorcise, ver) : 0,
    lifeStealMod:   (fires && abilDefined(self.abilities, 'lifeSteal'))
                      ? lifeStealEffective(otherResDeath, other.abilities, self.abilities.lifeSteal, ver) : null,
  };
}

// Touch-attack parameters for `self` firing alongside its gaze phase against `other`.
// Returns raw probs plus `*With` booleans gated on the gaze actually being active.
function gazeTouchParams(self, other, otherResM, otherResDeath, otherResStoning, gazeActive, selfSleep, ver) {
  const poisonStr  = abilVal(self.abilities, 'poison', 0);
  const poisonFail = poisonStr > 0 ? poisonFailProb(other.res, other.abilities, ver) : 0;
  const stoningFail = abilDefined(self.abilities, 'stoningTouch')
    ? stoningFailProb(otherResStoning, other.abilities, self.abilities.stoningTouch, ver) : 0;
  const deathTouchFail = abilDefined(self.abilities, 'deathTouch')
    ? deathTouchFailProb(otherResDeath, other.abilities, self.abilities.deathTouch, ver) : 0;
  const dispelEvilFail = hasAbil(self.abilities, 'dispelEvil')
    ? dispelEvilFailProb(otherResM, other.abilities, other.unitType, ver) : 0;
  const exorciseFail = abilDefined(self.abilities, 'exorcise')
    ? exorciseFailProb(otherResM, other.abilities, other.unitType, self.abilities.exorcise, ver) : 0;
  const lifeStealMod = abilDefined(self.abilities, 'lifeSteal')
    ? lifeStealEffective(otherResDeath, other.abilities, self.abilities.lifeSteal, ver) : null;
  const active = !selfSleep && gazeActive;
  return {
    poisonStr, poisonFail, stoningFail, deathTouchFail, dispelEvilFail, exorciseFail, lifeStealMod,
    poisonWith:     active && poisonFail > 0,
    stoningWith:    active && stoningFail > 0,
    deathTouchWith: active && deathTouchFail > 0,
    dispelEvilWith: active && dispelEvilFail > 0,
    exorciseWith:   active && exorciseFail > 0,
    lifeStealWith:  active && lifeStealMod !== null,
  };
}

// Gaze kill-roll probabilities: stoning and death gaze fail chances for `self` vs `other`.
function gazeKillProbs(self, selfStoningActive, selfDeathActive, other, otherResDeath, otherResStoning, ver) {
  return {
    stoningFail: selfStoningActive ? stoningFailProb(otherResStoning, other.abilities, self.abilities.stoningGaze, ver) : 0,
    deathFail:   selfDeathActive   ? deathGazeFailProb(otherResDeath, other.abilities, self.abilities.deathGaze, ver)   : 0,
  };
}

// Doom UA: a unit with the intrinsic Doom ability deals exactly 1 damage per 2 points
// of attack strength (rounded down), so its melee and ranged/thrown/breath strengths are
// halved up front (they are then delivered as exact Doom damage downstream). This applies
// in every version: in MoM the only unit-level Doom attack is the hero "Chaos" weapon,
// which likewise halves the attack strength (rounded down). Gaze (Doom Gaze) carries its
// own explicit strength and is unaffected. Black Sleep's damage→Doom conversion uses the
// attacker's full strength and is handled separately — a Black-Slept unit's attacker has
// no Doom UA, so its strengths are not halved here.
function applyDoomUAHalving(unit, version) {
  if (!hasAbil(unit.abilities, 'doom')) return unit;
  return Object.assign({}, unit, {
    atk: Math.floor((unit.atk || 0) / 2),
    rtb: Math.floor((unit.rtb || 0) / 2),
  });
}

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
  return applyAngelicGuardiansEffects(withType, version);
}

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

function buildResistanceContext(a, b, version, isCoM) {
  // Bless (resistance half): +3 resistance (MoM) or +5 (CoM/CoM2) vs Death-realm resistable
  // effects (Cause Fear, Life Steal, Death Gaze). The defense half is computed elsewhere.
  const bBless = hasAbil(b.abilities, 'bless');
  const aBless = hasAbil(a.abilities, 'bless');
  const isWarlord = version && version.startsWith('com2_warlord');
  const blessBonus = isWarlord ? 4 : (isCoM ? 5 : 3);

  // Resist Magic: +5 resistance vs all magical/special effects except Poison.
  const bResM = b.res + (hasAbil(b.abilities, 'resistMagic') ? 5 : 0);
  const aResM = a.res + (hasAbil(a.abilities, 'resistMagic') ? 5 : 0);
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
  };
}

function buildDefenseContext(a, b, version, aVertigoDefPenalty, bVertigoDefPenalty) {
  // Aggregates Vertigo def penalty, Large Shield, Bless (defense half), Elemental Armor,
  // Armor Piercing, Weapon/Missile/Magic/Fire Immunity, Righteousness, and Illusion.
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
        dist: calcAreaDamageDist(targetFigs, wofStr, wofToHit, aDefForImm, aToBlock, aHP, cap, aInvulnBonus, null),
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
      if (sAlive <= 0 || cap <= 0 || a.rtb <= 0 || aBlackSleep) return { dist: [1], lifeStealEV: 0 };
      let dist = aDoomsB ? calcDoomDist(sAlive, a.rtb, cap)
                : calcTotalDamageDist(sAlive, a.rtb, aToHitRtbVert, bDefForThrown, bToBlockVsAThrEW, b.hp, cap, bInvulnBonus, bBlurChance, blurBuggy,
                    isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, aMinDamageFromHits);
      const aImmTDist = (aImmWithThrown && tAlive > 0)
        ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits)
        : null;
      const t = convolveTouchAttacks(dist, cap, sAlive, {
        poisonStr: aPoisonStrT, poisonFail: aPoisonFailT,
        stoningFail: aStoningFailT,
        deathTouchFail: aDeathTouchFailT,
        dispelEvilFail: aDispelEvilFailT,
        exorciseFail: aExorciseFailT,
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
        ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits)
        : null;
      const fearD = aFearForCell(sAlive, tAlive);
      const o = calcMeleeTouchOutcome(fearD, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
        bDefVsA, bToBlockVsAMelee, b.hp, cap,
        aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aLifeStealModM, bResDeath,
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
        ? calcAreaDamageDist(tAlive, immStr, b.toHitImmolation, aDefForImm, aToBlockVsBAll, a.hp, cap, aInvulnBonus, bMinDamageFromHits)
        : null;
      const fearD = bFearForCell(sAlive);
      const o = calcMeleeTouchOutcome(fearD, sAlive, bDoomsA, bBlackSleep ? 0 : applyRage(bMeleeAtkVsA, b, sAlive), bToHitMeleeVert,
        aDefVsB, aToBlockVsBMelee, a.hp, cap,
        bPoisonStrM, bPoisonFailM, bStoningFailM, bDeathTouchFailM, bDispelEvilFailM, bExorciseFailM, bLifeStealModM, aResDeath,
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
    aLifeStealModM,
    bResDeath,
    bBlurChance,
    blurBuggy,
    isCoM2,
  } = params;

  // FS strike compute: like meleePhase but fear is aFearedByB only (no aFearBug)
  // and no doubleStrike. Used for both no-Haste FS and FS+Haste FS strike.
  const fsStrikeCompute = (sAlive, tAlive, cap) => {
    if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
    if (destroyMechanicalApplies(a, b, aBlackSleep ? 0 : aMeleeAtkVsB)) {
      return { dist: deterministicKillDist(cap), lifeStealEV: 0 };
    }
    const aImmMDist = (aImmWithMelee && tAlive > 0)
      ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits)
      : null;
    const fearD = aFearedByB ? calcFearDist(sAlive, aPFear) : null;
    const o = calcMeleeTouchOutcome(fearD, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
      bDefVsA, bToBlockVsAMelee, b.hp, cap,
      aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aLifeStealModM, bResDeath,
      aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, false /* doubleStrike */,
      isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
      aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'));
    return { dist: o.damageDist, lifeStealEV: o.lifeStealEV };
  };

  // Hasted 2nd strike compute: full A-side fear (aFearForCell, includes aFearBug),
  // but doubleStrike=false (this IS the 2nd of the two Hasted strikes).
  const secondStrikeCompute = (sAlive, tAlive, cap) => {
    if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
    if (destroyMechanicalApplies(a, b, aBlackSleep ? 0 : aMeleeAtkVsB)) {
      return { dist: deterministicKillDist(cap), lifeStealEV: 0 };
    }
    const aImmMDist = (aImmWithMelee && tAlive > 0)
      ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits)
      : null;
    const fearD = aFearForCell(sAlive, tAlive);
    const o = calcMeleeTouchOutcome(fearD, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
      bDefVsA, bToBlockVsAMelee, b.hp, cap,
      aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aLifeStealModM, bResDeath,
      aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, false /* doubleStrike */,
      isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
      aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'));
    return { dist: o.damageDist, lifeStealEV: o.lifeStealEV };
  };

  // No-fear strike: caller passes in k_a as sAlive (fear pre-sampled). Used when
  // FS+Haste shares one fear roll across FS and 2nd strike (rules-faithful k_a coupling).
  const aStrikeNoFear = (sAlive, tAlive, cap) => {
    if (sAlive <= 0 || cap <= 0) return { dist: [1], lifeStealEV: 0 };
    if (destroyMechanicalApplies(a, b, aBlackSleep ? 0 : aMeleeAtkVsB)) {
      return { dist: deterministicKillDist(cap), lifeStealEV: 0 };
    }
    const aImmMDist = (aImmWithMelee && tAlive > 0)
      ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits)
      : null;
    const o = calcMeleeTouchOutcome(null /* fearDist */, sAlive, aDoomsB, aBlackSleep ? 0 : applyRage(aMeleeAtkVsB, a, sAlive), aToHitMeleeVert,
      bDefVsA, bToBlockVsAMelee, b.hp, cap,
      aPoisonStrM, aPoisonFailM, aStoningFailM, aDeathTouchFailM, aDispelEvilFailM, aExorciseFailM, aLifeStealModM, bResDeath,
      aImmMDist, bInvulnBonus, bBlurChance, blurBuggy, false /* doubleStrike */,
      isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined,
      aMinDamageFromHits, hasAbil(a.abilities, 'bloodSucker'));
    return { dist: o.damageDist, lifeStealEV: o.lifeStealEV };
  };

  return { fsStrikeCompute, secondStrikeCompute, aStrikeNoFear };
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
    aExorciseFailG,
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
      let dist = buildGazeDist(a, b, tAlive, cap, aStoningGazeFailP, aDeathGazeFailP, aGazeDoomStrP, bDefForGaze, bInvulnBonus, bBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined, bBlackSleep, bToBlockVsAAll, aMinDamageFromHits);
      const aImmGDist = (aImmWithGaze && tAlive > 0)
        ? calcAreaDamageDist(tAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, cap, bInvulnBonus, aMinDamageFromHits)
        : null;
      const t = convolveTouchAttacks(dist, cap, sAlive, {
        poisonStr: aPoisonWithGaze ? aPoisonStrG_raw : 0, poisonFail: aPoisonFailG,
        stoningFail: aStoningWithGaze ? aStoningFailG : 0,
        deathTouchFail: aDeathTouchWithGaze ? aDeathTouchFailG : 0,
        dispelEvilFail: aDispelEvilWithGaze ? aDispelEvilFailG : 0,
        exorciseFail: aExorciseWithGaze ? aExorciseFailG : 0,
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
    bExorciseFailG,
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
      let dist = buildGazeDist(b, a, tAlive, cap, bStoningGazeFailP, bDeathGazeFailP, bGazeDoomStrP, aDefForGaze, aInvulnBonus, aBlurChance, blurBuggy,
        isCoM2 ? woundedTopFigHP(cap, a.hp) : undefined, aBlackSleep, aToBlockVsBAll, bMinDamageFromHits);
      const bImmGDist = (bImmWithGaze && tAlive > 0)
        ? calcAreaDamageDist(tAlive, immStr, b.toHitImmolation, aDefForImm, aToBlockVsBAll, a.hp, cap, aInvulnBonus, bMinDamageFromHits)
        : null;
      const t = convolveTouchAttacks(dist, cap, sAlive, {
        poisonStr: bPoisonWithGaze ? bPoisonStrG_raw : 0, poisonFail: bPoisonFailG,
        stoningFail: bStoningWithGaze ? bStoningFailG : 0,
        deathTouchFail: bDeathTouchWithGaze ? bDeathTouchFailG : 0,
        dispelEvilFail: bDispelEvilWithGaze ? bDispelEvilFailG : 0,
        exorciseFail: bExorciseWithGaze ? bExorciseFailG : 0,
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
  } = buildResistanceContext(a, b, ver, isCoM);

  // Cause Fear: reduces opponent's effective melee + touch-attack figures.
  // Fires before the melee exchange. MoM has no resistance modifier; CoM/CoM2 is -3.
  // v1.31 bugs: (1) defending Fear doesn't work; (2) attacker's Fear also self-fears attacker.
  const aFear = !isRanged && hasAbil(a.abilities, 'fear');
  const bFear = !isRanged && hasAbil(b.abilities, 'fear');
  const bPFear = aFear ? fearFailProb(bResDeath, b.abilities, opts.version) : 0; // A's fear on B
  const aPFear = bFear ? fearFailProb(aResDeath, a.abilities, opts.version) : 0; // B's fear on A
  // Phase always shows when either unit has Cause Fear; immunity (Death/Magic Immunity)
  // results in 0 feared figures via the +50/+100 resistance bonus in fearFailProb.
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
  //  (1) Melee must enable the non-ranged sequence — same rule as touch delivery
  //      (touchAttackFires): MoM 1.31 needs *effective* melee > 0 (the v1.31 bug suppresses
  //      delivery at 0 effective strength); every other version needs *base* melee > 0 (so
  //      Weakness reducing effective melee to 0 does not suppress the breath/thrown phase).
  //  (2) The breath/thrown attack must exist: MoM 1.31 needs *effective* strength > 0; every
  //      other version accepts *base OR effective* > 0 (so a granted breath with base 0 fires,
  //      and a breath reduced to 0 effective but with base > 0 still fires).
  // Black Sleep also prevents all outgoing attacks.
  const breathExists = ver === 'mom_1.31' ? a.rtb > 0 : (a.baseRtb > 0 || a.rtb > 0);
  const hasThrown = !isRanged && a.thrownType !== 'none' && breathExists
    && touchAttackFires(a.atk, a.baseAtk, ver) && !aBlackSleep;

  // Defense profiles: defender's effective defense vs each attack type from the opponent.
  const {
    bDefVsA,
    bDefVsARanged,
    bDefForThrown,
    bDefForGaze,
    bDefForImm,
    aDefVsB,
    aDefForGaze,
    aDefForImm,
  } = buildDefenseContext(a, b, ver, aVertigoDefPenalty, bVertigoDefPenalty);

  const {
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

  // --- New phase pipeline (under construction) ---
  // Replaces the thrown+melee and melee-only branches with a single joint-state engine.
  // Gating widens as we add phases.
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
  const pipelineEligible = !isRanged;

  if (pipelineEligible) {
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

    // Touch attack params: melee-phase activation only (gaze/thrown to be added later).
    const { poisonStr: aPoisonStrM, poisonFail: aPoisonFailM, stoningFail: aStoningFailM, deathTouchFail: aDeathTouchFailM, dispelEvilFail: aDispelEvilFailM, exorciseFail: aExorciseFailM, lifeStealMod: aLifeStealModM }
      = meleeTouchParams(a, b, bResM, bResDeath, bResStoning, opts.version);
    const { poisonStr: bPoisonStrM, poisonFail: bPoisonFailM, stoningFail: bStoningFailM, deathTouchFail: bDeathTouchFailM, dispelEvilFail: bDispelEvilFailM, exorciseFail: bExorciseFailM, lifeStealMod: bLifeStealModM }
      = meleeTouchParams(b, a, aResM, aResDeath, aResStoning, opts.version);

    // Touch attack params: thrown-phase activation (for thrown/breath).
    const aTouchWithThrown = !aBlackSleep && touchAttackFires(a.rtb, a.baseRtb, opts.version);
    const aPoisonStrT = aTouchWithThrown ? abilVal(a.abilities, 'poison', 0) : 0;
    const aPoisonFailT = aPoisonStrT > 0 ? poisonFailProb(b.res, b.abilities, opts.version) : 0;
    const aStoningOnT = aTouchWithThrown && abilDefined(a.abilities, 'stoningTouch');
    const aStoningFailT = aStoningOnT ? stoningFailProb(bResStoning, b.abilities, a.abilities.stoningTouch, opts.version) : 0;
    const aDeathTouchOnT = aTouchWithThrown && abilDefined(a.abilities, 'deathTouch');
    const aDeathTouchFailT = aDeathTouchOnT ? deathTouchFailProb(bResDeath, b.abilities, a.abilities.deathTouch, opts.version) : 0;
    const aDispelEvilOnT = aTouchWithThrown && hasAbil(a.abilities, 'dispelEvil');
    const aDispelEvilFailT = aDispelEvilOnT ? dispelEvilFailProb(bResM, b.abilities, b.unitType, opts.version) : 0;
    const aExorciseOnT = aTouchWithThrown && abilDefined(a.abilities, 'exorcise');
    const aExorciseFailT = aExorciseOnT ? exorciseFailProb(bResM, b.abilities, b.unitType, a.abilities.exorcise, opts.version) : 0;
    const aLifeStealOnT = aTouchWithThrown && abilDefined(a.abilities, 'lifeSteal');
    const aLifeStealModT = aLifeStealOnT ? lifeStealEffective(bResDeath, b.abilities, a.abilities.lifeSteal, opts.version) : null;

    // Gaze-phase touch activation (touches fire alongside gaze regardless of melee atk).
    const { poisonStr: aPoisonStrG_raw, poisonFail: aPoisonFailG, stoningFail: aStoningFailG, deathTouchFail: aDeathTouchFailG, dispelEvilFail: aDispelEvilFailG, exorciseFail: aExorciseFailG, lifeStealMod: aLifeStealModG,
            poisonWith: aPoisonWithGaze, stoningWith: aStoningWithGaze, deathTouchWith: aDeathTouchWithGaze, dispelEvilWith: aDispelEvilWithGaze, exorciseWith: aExorciseWithGaze, lifeStealWith: aLifeStealWithGaze }
      = gazeTouchParams(a, b, bResM, bResDeath, bResStoning, aGazeActiveP, aBlackSleep, opts.version);
    const { poisonStr: bPoisonStrG_raw, poisonFail: bPoisonFailG, stoningFail: bStoningFailG, deathTouchFail: bDeathTouchFailG, dispelEvilFail: bDispelEvilFailG, exorciseFail: bExorciseFailG, lifeStealMod: bLifeStealModG,
            poisonWith: bPoisonWithGaze, stoningWith: bStoningWithGaze, deathTouchWith: bDeathTouchWithGaze, dispelEvilWith: bDispelEvilWithGaze, exorciseWith: bExorciseWithGaze, lifeStealWith: bLifeStealWithGaze }
      = gazeTouchParams(b, a, aResM, aResDeath, aResStoning, bGazeActiveP, bBlackSleep, opts.version);

    // Gaze kill-roll probabilities (needed by buildGazeDist).
    const { stoningFail: aStoningGazeFailP, deathFail: aDeathGazeFailP }
      = gazeKillProbs(a, aStoningGazeActiveP, aDeathGazeActiveP, b, bResDeath, bResStoning, opts.version);
    const { stoningFail: bStoningGazeFailP, deathFail: bDeathGazeFailP }
      = gazeKillProbs(b, bStoningGazeActiveP, bDeathGazeActiveP, a, aResDeath, aResStoning, opts.version);

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
      aToBlock: a.toBlock,
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
      aExorciseFailG,
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
      bExorciseFailG,
      bLifeStealWithGaze,
      bLifeStealModG,
      aResDeath,
    });

    // Thrown / breath: A→B, fires before melee. Touch attacks fold in. Haste self-convolves.
    const thrownPhase = buildThrownPhase(hasThrown, {
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
      aLifeStealModT,
      bResDeath,
      aHaste,
    });

    // Run the engine: thrown (if active) → WoF (if active) → simultaneous melee+counter.
    let joint = makeJoint2D(aRemHP, bRemHP);
    let lifeStealEV_a = 0, lifeStealEV_b = 0;
    const breakdown = [];   // accumulate phase rows

    const pendingFear = { aFearDist: null, bFearDist: null };

    if (thrownPhase) {
      const r = applyDamagePhase(joint, thrownPhase, pendingFear, { a, b }, bRemHP);
      joint = r.joint;
      lifeStealEV_a += r.lifeStealEV;
      const bMargAtThrown = marginalB(joint);
      const thrownLabel = thrownPhaseLabel({
        thrownType: a.thrownType,
        hasted: aHaste && a.rtb > 0,
        poisonTouch: aPoisonFailT > 0,
        stoningTouch: aStoningFailT > 0,
        deathTouch: aDeathTouchFailT > 0,
        dispelEvil: aDispelEvilFailT > 0,
        exorcise: aExorciseFailT > 0,
        lifeSteal: aLifeStealModT !== null,
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
    // Rage: +1 ranged per figure lost (ranged combat has no counter-attack, so only
    // pre-combat casualties contribute — aAlive is constant through the volley).
    const aRtbRanged = applyRage(a.rtb, a, aAlive);
    let dmgToB = aAlive > 0 && bRemHP > 0 && a.rtb > 0 && !aBlackSleep
      ? (aDoomsB ? calcDoomDist(aAlive, aRtbRanged, bRemHP)
                 : calcTotalDamageDist(aAlive, aRtbRanged, aToHitRtbVert, bDefVsARanged, bToBlockVsARangedEW, b.hp, bRemHP, bInvulnBonus, bBlurChance, blurBuggy,
                     isCoM2 ? woundedTopFigHP(bRemHP, b.hp) : undefined, aMinDamageFromHits))
      : [1];

    // Touch attacks accompanying ranged: Poison, Stoning, Death Touch, Dispel Evil,
    // Life Steal, Immolation (MoM only). Warlord removes Stoning Touch and Death Touch
    // from ranged (physical and magical) per the Warlord manual.
    const rangedTouchFires = touchAttackFires(a.rtb, a.baseRtb, opts.version);
    const warlordRangedTouchBlocked = ver && ver.startsWith('com2_warlord');
    const aPoisonStrR = rangedTouchFires ? abilVal(a.abilities, 'poison', 0) : 0;
    const aPoisonFailR = aPoisonStrR > 0 ? poisonFailProb(b.res, b.abilities, opts.version) : 0;
    const aStoningFailR = (rangedTouchFires && !warlordRangedTouchBlocked && abilDefined(a.abilities, 'stoningTouch'))
      ? stoningFailProb(bResStoning, b.abilities, a.abilities.stoningTouch, opts.version) : 0;
    const aDeathTouchFailR = (rangedTouchFires && !warlordRangedTouchBlocked && abilDefined(a.abilities, 'deathTouch'))
      ? deathTouchFailProb(bResDeath, b.abilities, a.abilities.deathTouch, opts.version) : 0;
    const aDispelEvilFailR = (rangedTouchFires && hasAbil(a.abilities, 'dispelEvil'))
      ? dispelEvilFailProb(bResM, b.abilities, b.unitType, opts.version) : 0;
    const aExorciseFailR = (rangedTouchFires && abilDefined(a.abilities, 'exorcise'))
      ? exorciseFailProb(bResM, b.abilities, b.unitType, a.abilities.exorcise, opts.version) : 0;
    const aLifeStealModR = (rangedTouchFires && abilDefined(a.abilities, 'lifeSteal'))
      ? lifeStealEffective(bResDeath, b.abilities, a.abilities.lifeSteal, opts.version) : null;
    const aImmWithRanged = aHasImm && !immolationBlocksRanged(ver) && rangedTouchFires;
    const aImmDistR = (aImmWithRanged && aAlive > 0 && bAlive > 0 && bRemHP > 0)
      ? calcAreaDamageDist(bAlive, immStr, a.toHitImmolation, bDefForImm, bToBlockVsAAll, b.hp, bRemHP, bInvulnBonus, aMinDamageFromHits)
      : null;
    const tR = convolveTouchAttacks(dmgToB, bRemHP, aAlive, {
      poisonStr: aPoisonStrR, poisonFail: aPoisonFailR,
      stoningFail: aStoningFailR,
      deathTouchFail: aDeathTouchFailR,
      dispelEvilFail: aDispelEvilFailR,
      exorciseFail: aExorciseFailR,
      targetHP: b.hp,
      lifeStealMod: aLifeStealModR, lifeStealRes: bResDeath,
      immDist: aImmDistR,
      bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
    });
    dmgToB = tR.dist;
    let aLifeStealDistR = tR.lifeStealDist;
    let aLifeStealExpectedR = tR.lifeStealEV;

    // Haste doubles ranged attacks, EXCEPT mana-pool magic ranged in MoM (Caster ability
    // skips doubling). In CoM/CoM2, ranged never spends mana so Caster does not suppress
    // doubling. Self-convolving captures both the main ranged damage and all touch + immolation
    // effects folded in above.
    const aIsMagicRangedR = a.rangedType === 'magic_c' || a.rangedType === 'magic_n' || a.rangedType === 'magic_s';
    const aCasterR = hasAbil(a.abilities, 'caster');
    const hasteDoublesRanged = aHaste && a.rtb > 0 && aAlive > 0 && bRemHP > 0
      && !(!isCoMVer && aIsMagicRangedR && aCasterR);
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
