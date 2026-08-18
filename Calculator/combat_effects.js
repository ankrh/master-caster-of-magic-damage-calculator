// --- Combat Resolution: Blur, effect appliers and attack-specific sequences ---
// Per-effect writes onto a normalized combat unit, the CoM2/Warlord attack-specific step
// sequences, and the defense profile an incoming attack is resolved against.

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
// MoM grants these off a *race* test rather than the undead flag, which is also how Black
// Channels inherits them there: `Reference docs/MoM binary analysis.md`, *Undead immunities
// are a race gate in MoM, a mutation gate in CoM 1*.
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
// grants First Strike. (Base non-Fantastic units instead get stat bonuses — stepped in stats_sequence.js.
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
