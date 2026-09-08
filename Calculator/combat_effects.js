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
// PROVENANCE[undeadImmunityDerivation]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:b0b100600e12a7776e6f6705 | Reference docs/DOS reconstructed/unitcalc.c@span:7:4f777961fd94cbdfe370ee1c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:f913c873848cd66c2e8a77bf
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
// PROVENANCE[animatedEffectDerivation]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:16:ae07dbabe0a67cb84ddd5b15 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:808c1e69f457f734b2c8e8a8
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
function applyBlackChannelsEffects(unit, version) {
  // Bit 0x00000010 is Black Channels in MoM and Animated in CoM 1, so the immunity grant exists
  // in the two MoM builds only (`COMBAT_VERSION_SCOPES`, `steps.js`). Without the gate a hidden
  // Black Channels control granted Cold/Illusion/Poison/Death Immunity in all three CoM engines.
  if (!combatEffectInVersion('resolution:blackChannelsEffectDerivation', version)) return unit;
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

// Warlord Rebuild (Arcane unit enchantment): the unit gains Death Immunity, Illusion Immunity
// and Armor Piercing, and a non-hero also becomes Mechanical. Stat bonuses are
// applied by getAbilityStatSteps.
// The Mechanical flag is the one write the two branches do not share: `SETSTAT(TU,SCustomAttribute,1,1)`
// (OLSpell.CAS!NOTMARKOFCONQUEROR!+8 "SETSTAT(TU,SCustomAttribute,1,1);") is inside `IF (ISHERO(TU)=0)` and writes the permanent record, while the hero
// branch's `SETSTAT(U,SCustomAttribute,0,1)` (UnitCalcPre.CAS!NOHEROAUGMENT!+5 "SETSTAT(U,SCustomAttribute,0,1);") writes the calculated record,
// which no script line reads for value 1 (F217.3). The other three are written by both branches
// (OLSpell.CAS!NOTMARKOFCONQUEROR!+11..+13 "SETSTAT(TU,AFArmorPiercing,1,1,1);" "SETSTAT(TU,ADeathImmunity,1,1);", UnitCalcPre.CAS!NOHEROAUGMENT!+8..+10 "SETSTAT(U,AFArmorPiercing,0,1,1);" "SETSTAT(U,ADeathImmunity,0,1);") and are ungated here.
// STAT-FORMULA[rebuildEffectDerivation]
// PROVENANCE[rebuildEffectDerivation]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/OLSpell.CAS@span:14:4bf7fbd36a952469a8d78b9b | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:8:ff5769532c07ec8df9389ec0
function applyRebuildEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'rebuild')) return unit;
  const isHero = !!(unit.isHero || unit.unitType === 'hero');
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, {
      ...(isHero ? {} : { mechanical: true }),
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
// PROVENANCE[tacticianAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:20:ad27ec0c811d3a388faf52ab | Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:22:89e62a9b6d30ab5269ff1a55
function applyTacticianWarlordEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'tactician')) return unit;
  const extra = {};
  if (hasAbil(unit.abilities, 'teleporting')) extra.firstStrike = true;
  if (hasNonCorporealEffect(unit.abilities, version)) extra.negateFirstStrike = true;
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
// The realm conversion to Chaos is the ordered identity step `b:fieryFury:race`.)
// This is the second half of that one `IF (BASEFANTASTIC(U))` THEN arm, so it takes the same
// **permanent** record the conversion does: the base unit data as the permanent-record phases leave it,
// Destiny's `B.Fantastic := True` at $0059A390 included (F192). Splitting the two halves across
// two records would give a Destiny unit the Chaos conversion without the First Strike beside it.
// STAT-FORMULA[fieryFuryAbilityDerivation]
// PROVENANCE[fieryFuryAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:14:28f3f207149034b0e805f4b5
function applyFieryFuryEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord')) return unit;
  if (!hasAbil(unit.abilities, 'fieryFury')) return unit;
  // The permanent Fantastic flag, off the pair the derivation publishes from the boundary
  // record. It used to prefer `unit.identity.baseFantastic`; there is no identity object on a
  // derived unit any more (F267.6) and `abilities.baseFantastic` is the same boundary field.
  // The token fallback stays for a caller that hand-builds a combat unit without one.
  const baseFantastic = typeof unit.abilities.baseFantastic === 'boolean'
    ? unit.abilities.baseFantastic
    : (unit.unitType || '').startsWith('fantastic_');
  if (!baseFantastic && !destinyActiveForUnit(unit.abilities, version)) return unit;
  return Object.assign({}, unit, {
    abilities: Object.assign({}, unit.abilities, { firstStrike: true }),
  });
}

// Warlord Zeal grants First Strike and Negate First Strike. Item power 78 grants the
// same flags earlier in phase b; the ordinary phase-d Zeal block skips that duplicate.
// Both precede Temporal Twist, which can strip the granted flags.
// STAT-FORMULA[zealAbilityDerivation]
// PROVENANCE[zealAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:4:d530a92fb1e7f722142a627e | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:4:31ac70ff5715861521e99085
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
// PROVENANCE[temporalTwistAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:5:f1f4495ca7b57ea954b01136
function applyTemporalTwistEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'temporalTwist')) return unit;
  const stripped = Object.assign({}, unit.abilities);
  delete stripped.firstStrike;
  delete stripped.negateFirstStrike;
  delete stripped.teleporting;
  return Object.assign({}, unit, { abilities: stripped });
}

// CoM/CoM2: Blood Lust grants the undead state; the realm write is the ordered identity step
// `c:bloodLust`. Warlord: Bloodlust no longer turns the unit undead
// (only doubled melee vs normals/heroes is retained), so this becomes a no-op.
// STAT-FORMULA[bloodLustAbilityDerivation]
// PROVENANCE[bloodLustAbilityDerivation]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:12:4291d05361823ad272e4e04f | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:e894ef880a35e8ad7d3f714b | Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:8:32ea534d834bbcec63f4826a
function applyBloodLustEffects(unit, version) {
  // Bit 0x00000004 is Berserk in MoM and Blood Lust from CoM 1 on, so the undead grant does not
  // exist in either MoM build (`COMBAT_VERSION_SCOPES`, `steps.js`). Without the gate a hidden
  // Blood Lust control made a MoM unit undead, and with it Death-immune.
  if (!combatEffectInVersion('resolution:bloodLustAbilityDerivation', version)) return unit;
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
// PROVENANCE[vampirismAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:13:6359ba6a575e608e160b3466
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
// PROVENANCE[revenantAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/COSpell.CAS@span:3:6d47f9da2fa86fd972f40ae4 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:7:76f065dbf8571714ba992fd1
function applyRevenantEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'revenant')) return unit;
  return Object.assign({}, unit, {
    // UnitCalcPre.CAS writes the touch value unconditionally, so Revenant replaces
    // an intrinsic stronger Death Touch rather than preserving it.
    abilities: Object.assign({}, unit.abilities, { undead: true, deathTouch: 0 }),
  });
}

// The touch-rider vocabulary, and each rider's engine-version scope. Both facts live in one
// table because a rider the calculator can place is a rider some engine must have: adding a key
// without stating where it exists is what let Dispel Evil — a MoM rider — fire in CoM 1, CoM2 and
// Warlord (F158). `null` is a stated scope, not an absent one: no engine distinguishes that
// rider's presence, and the standing question of asserting the all-version keys is F159's.
// A narrower scope names a `COMBAT_VERSION_SCOPES` id (`steps.js`), which is where the versions
// and their citation live; this table only routes a key to it.
const TOUCH_KEY_SCOPE_IDS = Object.freeze({
  poison: null,
  stoningTouch: null,
  deathTouch: null,
  dispelEvil: 'resolution:dispelEvilTouchRider',
  exorcise: 'resolution:exorciseTouchRider',
  destruction: null,
  lifeSteal: null,
});

// Warlord keeps touch flags in general, melee, and ranged attack records. Unit-card
// and roster abilities are general flags; represented spell effects can relocate or
// overwrite them. Keep that engine detail internal so the card still has one value.
const PLACED_TOUCH_KEYS = Object.freeze(Object.keys(TOUCH_KEY_SCOPE_IDS));

// Whether this engine has the named touch rider at all. Throws on a key the table does not name,
// rather than defaulting to "every version", which is the shape of the defect it closes.
function touchKeyInVersion(key, version) {
  if (!Object.prototype.hasOwnProperty.call(TOUCH_KEY_SCOPE_IDS, key)) {
    throw new Error(`touchKeyInVersion: '${key}' is not a touch rider. `
      + `Add it to TOUCH_KEY_SCOPE_IDS with the versions whose engine carries it.`);
  }
  const id = TOUCH_KEY_SCOPE_IDS[key];
  return id === null || combatEffectInVersion(id, version);
}

const WARLORD_RELOCATED_TOUCH_KEYS = ['stoningTouch', 'deathTouch'];
function applyWarlordTouchFlagPlacement(unit, version) {
  if (!version || !version.startsWith('com2_warlord')) return unit;
  const records = { global: {}, melee: {}, ranged: {} };
  for (const key of PLACED_TOUCH_KEYS) {
    if (!touchKeyInVersion(key, version)) continue;
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
// PROVENANCE[angelicGuardiansAbilityDerivation]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:9:f742373b8f5966edd2fa5c3b
function applyAngelicGuardiansEffects(unit, version) {
  if (!version || !version.startsWith('com2_warlord') || !hasAbil(unit.abilities, 'angelicGuardians')) return unit;
  // The live realm comes from `liveRace`, the record's own `race` as the stat run left it and
  // published for combat resolution — not from the identity object, which no longer carries a
  // live pair (F267.5).
  const realm = realmOfUnitType(unit.unitType, (unit.abilities || {}).liveRace);
  const isLife = realm === 'life';
  // The permanent Fantastic flag, off the pair the derivation publishes from the boundary
  // record. It used to prefer `unit.identity.baseFantastic`; there is no identity object on a
  // derived unit any more (F267.6) and `abilities.baseFantastic` is the same boundary field.
  // The token fallback stays for a caller that hand-builds a combat unit without one.
  const baseFantastic = typeof unit.abilities.baseFantastic === 'boolean'
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

// PROVENANCE[bloodLustMeleeAttack]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/combat.c@span:7:28677485bcd26d6205a27127 | Reference docs/Caster binary/Combat.ApplyAttack.pas@span:4:ac0c26ac4b856f2574b214d5
// STAT-FORMULA[bloodLustMeleeAttack]
function bloodLustMeleeAttack(atkUnit, defUnit, attackStrength = atkUnit.atk) {
  // MoM guards bit 0x00000004 as Berserk and CoM 1 as Blood Lust, so the doubling exists only
  // from CoM 1 on (`COMBAT_VERSION_SCOPES`, `steps.js`). `combatVersion` is written by
  // `normalizeCombatUnit`; a unit that never passed through it is a wiring mistake, not a
  // reason to guess a version.
  if (!combatEffectInVersion('resolution:bloodLustMeleeAttack', atkUnit.combatVersion)) {
    return attackStrength;
  }
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
// `sourceLabel` names the game source of the write for the hover chains F222.5 hangs on the
// rider histograms; without one the chain reads the step id, which for these two sequences
// repeats the routine's name on every line. It is stated only where the id is not already the
// source — the seeding steps, which fold a second term in beside the record value they read.
function attackSpecificStep(id, writes, apply, when, sourceLabel) {
  return statStep({
    id,
    // The chain names each write by the step's own tail: `effectiveResistance:resistMagic`
    // reads as "Resist Magic", not as "Effective Resistance Resist Magic".
    sourceId: id.slice(id.indexOf(':') + 1),
    ...(sourceLabel ? { sourceLabel } : {}),
    phase: 'attackSpecific',
    writes,
    apply,
    ...(when ? { when } : {}),
  });
}

// --- Chains for the two attack-specific sequences (F222.5) ---
//
// A rider histogram's hover chain is a projection of the trace the query it made produced. The
// trace comes out of `runStatSteps` on the same ordered list that computed the figure the roll
// used, so the chain is emitted by the path that computed the value rather than rebuilt from
// the controls afterwards (`CLAUDE.md`, *Input/output contract*). Both are produced by one
// call: a chain that could disagree with the number it explains would be a second reading.
//
// A resistance chain carries the realm its roll named. One target has one effective resistance
// per realm its attacker's riders name — Bless answers Chaos and Death, Resist Elements answers
// Nature, the realm-less Poison roll takes neither — so up to five are simultaneously valid
// inside one attack and the reader cannot tell them apart without it.
function resistanceChainRecord(target, realm, value, trace, baseId) {
  return {
    quantity: 'resistance',
    realm: realm || null,
    trace: projectStatTrace(trace, 'effectiveResistance', target.res, value, { baseId }),
  };
}

function defenseChainRecord(target, value, trace, baseId) {
  return {
    quantity: 'defense',
    realm: null,
    trace: projectStatTrace(trace, 'effectiveDefense', target.def, value, { baseId }),
  };
}

// A one-slot sink. A caller that wants the chain passes an object and reads `.chain` back; a
// caller that passes nothing records no trace and pays nothing, which is what keeps the matrix
// off this path.
function fillDefenseChain(sink, target, value, trace, baseId) {
  if (sink) sink.chain = defenseChainRecord(target, value, trace, baseId);
  return value;
}

const EFFECTIVE_RESISTANCE_STEPS = [
  // PROVENANCE[effectiveResistance:base]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:7:94e6acc42c67b18404dd8d13
  attackSpecificStep('effectiveResistance:base', ['effectiveResistance'],
    u => { u.effectiveResistance = u.res; }),
  // PROVENANCE[effectiveResistance:charmed]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:7:94e6acc42c67b18404dd8d13
  attackSpecificStep('effectiveResistance:charmed', ['effectiveResistance'],
    u => { u.effectiveResistance = 100; },
    (u, ctx) => ctx.isRoll && (u.isHero || u.unitType === 'hero') && hasAbil(u.abilities, 'charmed')),
  // PROVENANCE[effectiveResistance:magicImmunity]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:52d7a21af8d678318152f8fc
  attackSpecificStep('effectiveResistance:magicImmunity', ['effectiveResistance'],
    u => { u.effectiveResistance = 100; },
    (u, ctx) => ctx.realm !== null && hasAbil(u.abilities, 'magicImmunity')),
  // PROVENANCE[effectiveResistance:resistElements]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:c5d736809b27903ec0e40f87 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:e2dc42fafe0d325d0f39e42c | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:e2dc42fafe0d325d0f39e42c
  attackSpecificStep('effectiveResistance:resistElements', ['effectiveResistance'],
    u => { u.effectiveResistance += 4; },
    (u, ctx) => ctx.realm === 'nature' && hasResistElementsEffect(u.abilities)),
  // PROVENANCE[effectiveResistance:bless]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:3:8da0a27a31fedd3ba0134ffc | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:139a1e53fbfbc5356d693d1d | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:e9ef47259ac28c3d1c61598a
  attackSpecificStep('effectiveResistance:bless', ['effectiveResistance'],
    (u, ctx) => { u.effectiveResistance += ctx.blessBonus; },
    (u, ctx) => (ctx.realm === 'chaos' || ctx.realm === 'death') && hasAbil(u.abilities, 'bless')),
  // PROVENANCE[effectiveResistance:resistMagic]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:144365f7a66eeaa2a77f8a4d | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:9944e135e5c46465171e6e72 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:9944e135e5c46465171e6e72
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
  // None of these steps carries a version predicate: the list is CoM2-only because the modern
  // arm of `resistanceQueries` is the only path that reaches it. That scope is therefore
  // checkable only here, where the steps enter the sequence.
  if (statStepDebugEnabled()) {
    assertSequenceVersionScope(EFFECTIVE_RESISTANCE_STEPS, version, 'GetEffectiveResistance');
  }
  runStatSteps(EFFECTIVE_RESISTANCE_STEPS, scratch, context);
  return scratch.effectiveResistance;
}

const EFFECTIVE_DEFENSE_STEPS = [
  // PROVENANCE[effectiveDefense:base]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:16:a817f716eaa0bf5bc9a83904
  // The seed reads the record's Defense and folds in `extradef`, which on this path is City
  // Walls and nothing else (`computeCasterDefenseForAttack` below is its only writer). The
  // chain's base is the record value, so the entry this step contributes is exactly that
  // bonus — which is what the label names. A second `extradef` term would have to be labelled
  // separately rather than inherit this one.
  attackSpecificStep('effectiveDefense:base', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense = u.def + ctx.extraDefense; }, null, 'City Walls'),
  // PROVENANCE[effectiveDefense:illusion]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:6:73589286bdb2cf542120a0a1
  attackSpecificStep('effectiveDefense:illusion', ['effectiveDefense'],
    u => { u.effectiveDefense = 0; return HALT; },
    (u, ctx) => ctx.illusion && !hasAbil(u.abilities, 'illusionImmunity')),
  // PROVENANCE[effectiveDefense:largeShield]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:cad06bcca352e1e701c06cfe | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:baa485ae66a250e528069e54 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:baa485ae66a250e528069e54
  attackSpecificStep('effectiveDefense:largeShield', ['effectiveDefense'],
    u => { u.effectiveDefense += 3; },
    (u, ctx) => ctx.isRanged && hasAbil(u.abilities, 'largeShield')),
  // PROVENANCE[effectiveDefense:resistElements]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:69075b87f644f18cbdb1c64a | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:c99051561c61668cea94903d | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:c99051561c61668cea94903d
  attackSpecificStep('effectiveDefense:resistElements', ['effectiveDefense'],
    u => { u.effectiveDefense += 4; },
    (u, ctx) => ctx.elementalEligible && hasResistElementsEffect(u.abilities)),
  // PROVENANCE[effectiveDefense:elementalArmor]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:95c224910389756ff6f69515 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:473b9eac9397f92d8022c2cd | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:473b9eac9397f92d8022c2cd
  attackSpecificStep('effectiveDefense:elementalArmor', ['effectiveDefense'],
    u => { u.effectiveDefense += 12; },
    (u, ctx) => ctx.elementalEligible && hasElementalArmorEffect(u.abilities)),
  // PROVENANCE[effectiveDefense:bless]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:4:1aa8579dfe4d99fda5935346 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:db54edb1372f3254301b3b9b | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:aaec01b51dfbddfb4fb45271
  attackSpecificStep('effectiveDefense:bless', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense += ctx.blessBonus; },
    (u, ctx) => ctx.magicImmunityEligible && ctx.spellId > 0
      && (ctx.spellRealm === 'chaos' || ctx.spellRealm === 'death')
      && hasAbil(u.abilities, 'bless')),
  // PROVENANCE[effectiveDefense:armorPiercing]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:4:d2fe7b44d5e48e4e73b98cde
  attackSpecificStep('effectiveDefense:armorPiercing', ['effectiveDefense'],
    u => { u.effectiveDefense = Math.floor(u.effectiveDefense / 2); },
    (u, ctx) => ctx.armorPiercing
      && !(ctx.isLightning && hasAbil(u.abilities, 'lightningResist'))),
  // PROVENANCE[effectiveDefense:immunities]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:6:2f2c6876d3c7d7f5d2533b8b
  attackSpecificStep('effectiveDefense:immunities', ['effectiveDefense'],
    (u, ctx) => {
      // The six Caster.exe tests are assignments in this order, and six is the whole of them:
      // `Caster.exe` contains no `Righteousness` symbol or string (0 hits ASCII and UTF-16LE
      // over all 10,584,041 bytes) and no such member in the 62-strong `@Sharedconstants@Enc*`
      // enumeration, and the six assignments run back to back to $00596813 with the Weapon
      // Immunity tail at $0059681A leaving no gap for a seventh. The modern engine's Chaos/Death
      // realm term is `EncBless`: keyed here on `SpellTable[spellid].Realm`
      // (`Combat.ResolutionHelpers.pas:197-200`), and in GetEffectiveResistance on the caller's
      // own realm argument (`:125-126`).
      if (hasAbil(u.abilities, 'fireImmunity') && ctx.fireSpell) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'fireImmunity') && ctx.isFire) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'coldImmunity') && ctx.coldSpell) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'poisonImmunity') && ctx.poisonSpell) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'magicImmunity') && ctx.magicImmunityEligible) u.effectiveDefense = 100;
      if (hasAbil(u.abilities, 'missileImmunity') && ctx.isMissile) u.effectiveDefense = 100;
    }),
  // PROVENANCE[effectiveDefense:weaponImmunity]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:64343218ebddfe0d2454f929 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:8c99d740dfd473b21f906b13 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:4c279bb027bcde85badd90e7
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

// --- Attack-specific stat sequences (WIZARDS.EXE: MoM 1.31, CP 1.60, CoM 1) ---
//
// The DOS engines run the same stage as Caster.exe — two routines keyed by an incoming
// attack, on a scratch copy of the finished record — so they get the same step type, runner,
// authoring syntax and provenance labelling as the two lists above. Only the transcribed
// routine differs. `Combat_Effective_Resistance` is here; `Battle_Unit_Defense_Special`
// follows below.
//
// The DOS resistance routine is **additive throughout**, where Caster.exe's Charmed and Magic
// Immunity assign 100. A DOS unit therefore accumulates every applicable bonus and can finish
// above any one of them, which is why this is its own transcription rather than a variant of
// `EFFECTIVE_RESISTANCE_STEPS`.
//
// The `USA_IMMUNITY_MAGIC` and `UE_RIGHTEOUSNESS` +30 writes are steps here, not consumer-side
// bonuses. Magic Immunity is *also* a skip (SPEC.md, "Immunities skip rolls"), but only at the
// consuming sites that jump past the whole touch/gaze group; Cause Fear reaches the roll and
// takes the bonus, and Righteousness is never a skip in any build. Keeping either write at a
// consumer left it out of the value that consumer hands on, and `Combat_Resistance_Check`
// returns `roll - resistance` — the margin Life Steal spends as drain (F104).
const DOS_RESISTANCE_WRITES = {
  // PROVENANCE[dosEffectiveResistance:base]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:14:bfc0a231fc99e42b7d605b4e
  base: attackSpecificStep('dosEffectiveResistance:base', ['effectiveResistance'],
    u => { u.effectiveResistance = u.res; }),
  // PROVENANCE[dosEffectiveResistance:charmed]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:10:74ef0dc0feb25f1dee8657e4
  charmed: attackSpecificStep('dosEffectiveResistance:charmed', ['effectiveResistance'],
    u => { u.effectiveResistance += 30; },
    u => (u.isHero || u.unitType === 'hero') && hasAbil(u.abilities, 'charmed')),
  // PROVENANCE[dosEffectiveResistance:magicImmunity]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:4:1a301c9fa03a6936a7e8bf35
  magicImmunity: attackSpecificStep('dosEffectiveResistance:magicImmunity', ['effectiveResistance'],
    u => { u.effectiveResistance += 30; },
    (u, ctx) => ctx.realm !== null && hasAbil(u.abilities, 'magicImmunity')),
  // CoM 1 keeps this write but repurposes the `UE_RIGHTEOUSNESS` bit as Shadow Attack, an
  // enchantment the calculator has no control for, so the step is absent from that engine's
  // list below rather than predicated on a name it no longer means there.
  // PROVENANCE[dosEffectiveResistance:righteousness]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/combat.c@span:6:4a90488718a822fc09095678
  righteousness: attackSpecificStep('dosEffectiveResistance:righteousness', ['effectiveResistance'],
    u => { u.effectiveResistance += 30; },
    (u, ctx) => (ctx.realm === 'chaos' || ctx.realm === 'death')
      && hasAbil(u.abilities, 'righteousness')),
  // PROVENANCE[dosEffectiveResistance:elemental]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:22:123b893c305519061ccb5408
  elemental: attackSpecificStep('dosEffectiveResistance:elemental', ['effectiveResistance'],
    (u, ctx) => { u.effectiveResistance += elemResistBonus(u, ctx.version); },
    (u, ctx) => ctx.elementalRealms.includes(ctx.realm)
      && (hasElementalArmorEffect(u.abilities) || hasResistElementsEffect(u.abilities))),
  // PROVENANCE[dosEffectiveResistance:bless]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:11:f46c042d7316f5bcefb5255e
  bless: attackSpecificStep('dosEffectiveResistance:bless', ['effectiveResistance'],
    (u, ctx) => { u.effectiveResistance += ctx.blessBonus; },
    (u, ctx) => (ctx.realm === 'chaos' || ctx.realm === 'death') && hasAbil(u.abilities, 'bless')),
  // PROVENANCE[dosEffectiveResistance:resistMagic]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:9:59769ac406c13cba485cb093
  resistMagic: attackSpecificStep('dosEffectiveResistance:resistMagic', ['effectiveResistance'],
    u => { u.effectiveResistance += 5; },
    (u, ctx) => ctx.realm !== null && hasAbil(u.abilities, 'resistMagic')),
};

// One ordered list per engine, written out in full. The three builds transcribe the same
// address sequence; what separates them is carried as context constants below, in the shape
// `blessBonus` already takes in the Caster.exe lists.
const DOS_RESISTANCE_STEPS = Object.freeze({
  'mom_1.31': [
    DOS_RESISTANCE_WRITES.base,
    DOS_RESISTANCE_WRITES.charmed,
    DOS_RESISTANCE_WRITES.magicImmunity,
    DOS_RESISTANCE_WRITES.righteousness,
    DOS_RESISTANCE_WRITES.elemental,
    DOS_RESISTANCE_WRITES.bless,
    DOS_RESISTANCE_WRITES.resistMagic,
  ],
  'mom_cp_1.60.00': [
    DOS_RESISTANCE_WRITES.base,
    DOS_RESISTANCE_WRITES.charmed,
    DOS_RESISTANCE_WRITES.magicImmunity,
    DOS_RESISTANCE_WRITES.righteousness,
    DOS_RESISTANCE_WRITES.elemental,
    DOS_RESISTANCE_WRITES.bless,
    DOS_RESISTANCE_WRITES.resistMagic,
  ],
  'com_6.08': [
    DOS_RESISTANCE_WRITES.base,
    DOS_RESISTANCE_WRITES.charmed,
    DOS_RESISTANCE_WRITES.magicImmunity,
    DOS_RESISTANCE_WRITES.elemental,
    DOS_RESISTANCE_WRITES.bless,
    DOS_RESISTANCE_WRITES.resistMagic,
  ],
});

// `realm` is null for a realm-less roll (Poison), otherwise one of nature, sorcery, chaos,
// life, death — the calculator's name for the `magic_realm` argument the engine derives from
// the attack's `ranged_type`.
function dosEffectiveResistance(target, version, realm, trace = null) {
  const steps = DOS_RESISTANCE_STEPS[version];
  if (!steps) throw new Error(`no DOS resistance sequence for version ${version}`);
  const scratch = { ...target };
  const context = {
    version,
    realm,
    blessBonus: version === 'com_6.08' ? 5 : 3,
    // CoM 1 replaced the Chaos arm of the elemental gate with a NOP at com1:0x990DC.
    elementalRealms: version === 'com_6.08' ? ['nature'] : ['chaos', 'nature'],
    ...(trace ? { trace } : {}),
  };
  // Same ungated shape as the Caster.exe lists: no step carries a version predicate, so the
  // list's scope is checkable only where the steps enter the sequence.
  if (statStepDebugEnabled()) {
    assertSequenceVersionScope(steps, version, 'Combat_Effective_Resistance');
  }
  runStatSteps(steps, scratch, context);
  return scratch.effectiveResistance;
}

// --- Per-roll resistance queries (F223) ---
//
// No engine computes a unit's resistances up front. Each block that makes a resistance roll
// calls its own query with the realm that roll names — `ResistanceRoll` -> `GetEffectiveResistance` in
// Caster.exe (`Reference docs/Caster binary/Combat.ResolutionHelpers.pas:110`, `:132`),
// `Combat_Resistance_Check` -> `Combat_Effective_Resistance` in the DOS builds
// (`Reference docs/DOS reconstructed/combat.c:2012`, `:2028`). One defender therefore has as
// many effective resistances inside one attack as its attacker has active riders, and they
// differ: Bless answers Chaos and Death, Resist Elements answers Nature, and the realm-less
// Poison roll takes neither. A single accumulated figure cannot hold that, and a realm-by-side
// cross product computed ahead of the riders is not a shape any engine has.
//
// So the query is a step of the roll, not of the unit. Each list below is one engine region in
// that region's own execution order; each step names the realm its roll passes; and a step fires
// only when the engine makes that roll, because outside that there is no call and the field must
// stay absent rather than hold a figure nothing asked for. `ctx.values` carries what the caller
// has already read — `placedTouchValue` for the touch group (`combat_phases.js`), the fear flag
// and the gaze-active flags for the other two — so the gate here is the one the consumer uses,
// and no version test is restated in it.
//
// Two of the three regions are riders: they run inside another attack and modify its outcome.
// The gaze kill rolls are not, and the lists below say so in their names.
//
// The `lifeRider` slot is one rider block with two names: MoM calls its flag Dispel Evil, CoM 1
// and the modern builds call the same slot Exorcise. Which name a build gives it is
// `TOUCH_KEY_SCOPE_IDS`'s fact, carried per key through `touchKeyInVersion`; the query is one
// Life-realm roll either way, so it is one step.
//
// The lists carry no version predicate, exactly as `EFFECTIVE_RESISTANCE_STEPS` does not: each
// is reached only from its own engine family's arm of `resistanceQueries`, and that scope is
// asserted where the steps enter the sequence.
// Which routine a query group's steps call, and what its seeding step is called. Both are
// properties of the engine family whose list is running, and `resistanceQueries` picks the pair
// beside the list, so a modern list can never be run through the DOS routine.
const MODERN_RESISTANCE_QUERY = Object.freeze({
  run: (target, version, realm, trace) => effectiveResistance(target, version, realm, true, trace),
  baseId: 'effectiveResistance:base',
});
const DOS_RESISTANCE_QUERY = Object.freeze({
  run: (target, version, realm, trace) => dosEffectiveResistance(target, version, realm, trace),
  baseId: 'dosEffectiveResistance:base',
});

// One rider's query, made once. The realm is named by the step, the value goes to the field the
// step declares, and the chain — when the caller asked for one — is the projection of the trace
// that same call produced. `ctx.chains` absent means no trace array is built at all, which is
// what keeps the matrix off this path.
function riderResistanceQuery(unit, ctx, field, realm) {
  const trace = ctx.chains ? [] : null;
  const value = ctx.query.run(ctx.target, ctx.version, realm, trace);
  unit[field] = value;
  if (ctx.chains) {
    ctx.chains[field] = resistanceChainRecord(ctx.target, realm, value, trace, ctx.query.baseId);
  }
}

const MODERN_TOUCH_RIDER_RESISTANCE_STEPS = [
  // PROVENANCE[touchRiderResistance:lifeRider]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:14:1af4ce419d8230fdb6439ac3
  attackSpecificStep('touchRiderResistance:lifeRider', ['lifeRiderRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'lifeRiderRes', 'life'); },
    (u, ctx) => ctx.fires && (ctx.values.exorcise != null || !!ctx.values.dispelEvil)),
  // PROVENANCE[touchRiderResistance:stoningTouch]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:cb64b9c258eb87e12d65086d
  attackSpecificStep('touchRiderResistance:stoningTouch', ['stoningTouchRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'stoningTouchRes', 'nature'); },
    (u, ctx) => ctx.fires && ctx.values.stoningTouch != null),
  // PROVENANCE[touchRiderResistance:deathTouch]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:8:aecba60e93b714e0d12f9afb
  attackSpecificStep('touchRiderResistance:deathTouch', ['deathTouchRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'deathTouchRes', 'death'); },
    (u, ctx) => ctx.fires && ctx.values.deathTouch != null),
  // PROVENANCE[touchRiderResistance:lifeSteal]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:12:aeae4f8bac0ada5ec4543886
  attackSpecificStep('touchRiderResistance:lifeSteal', ['lifeStealRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'lifeStealRes', 'death'); },
    (u, ctx) => ctx.fires && ctx.values.lifeSteal != null),
  // PROVENANCE[touchRiderResistance:destruction]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:7:5825574e953531d6ee8f33c4
  attackSpecificStep('touchRiderResistance:destruction', ['destructionRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'destructionRes', 'chaos'); },
    (u, ctx) => ctx.fires && ctx.values.destruction != null),
  // The Poison loop passes realm 0, so no realm-conditional term of `GetEffectiveResistance`
  // reaches it — not Magic Immunity, not Resist Magic, not Bless, not Resist Elements.
  // PROVENANCE[touchRiderResistance:poison]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:17:d81123fcbac38055f6f571f9
  attackSpecificStep('touchRiderResistance:poison', ['poisonRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'poisonRes', null); },
    (u, ctx) => ctx.fires && (ctx.values.poison || 0) > 0),
];

// Cause Fear is its own region: it runs inside the melee arm of `ApplyAttack`, ahead of the
// exchange, and rolls against the unit whose figures it removes — the attacker when the
// defender carries the flag. Realm Death, fixed -3 save.
const MODERN_FEAR_RIDER_RESISTANCE_STEPS = [
  // PROVENANCE[fearRiderResistance:fear]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:15:a1e2224e239b0afed3d8bf61
  attackSpecificStep('fearRiderResistance:fear', ['fearRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'fearRes', 'death'); },
    (u, ctx) => !!ctx.values.fear),
];

// The two gaze kill rolls are a third region, ahead of the rider group and reached instead of it.
// They ride on nothing: `PerformAttacks` deals each kill gaze as its own `ApplyAttack` call, and
// that call's dispatch arm sets `atk := 0` (`Combat.ApplyAttack.pas:314-324`), so the per-figure
// resistance roll is the whole call. Nothing rides on them either — attack types 6..8 jump past
// all six touch-rider blocks.
//
// `ApplyAttack` lays its two blocks out Death before Stoning, but that is not an execution order:
// `at` selects exactly one of them per call, so the order is the caller's. `PerformAttacks` deals
// Stoning then Death, for the attacker group and again for the defender group, which is the order
// both lists carry.
const MODERN_GAZE_KILL_RESISTANCE_STEPS = [
  // PROVENANCE[gazeKillResistance:stoningGaze]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:17:4e9e7df25b0d6fc581dd5439 | Reference docs/Caster binary/Combat.PerformAttacks.pas@span:28:0e3735035ab19290c735634c
  attackSpecificStep('gazeKillResistance:stoningGaze', ['stoningGazeRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'stoningGazeRes', 'nature'); },
    (u, ctx) => !!ctx.values.stoningGaze),
  // PROVENANCE[gazeKillResistance:deathGaze]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ApplyAttack.pas@span:18:ddfd795741a0e9e854b8b031 | Reference docs/Caster binary/Combat.PerformAttacks.pas@span:28:0e3735035ab19290c735634c
  attackSpecificStep('gazeKillResistance:deathGaze', ['deathGazeRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'deathGazeRes', 'death'); },
    (u, ctx) => !!ctx.values.deathGaze),
];

// `BU_ProcessAttack` runs the same six touch riders in the same order, each with its own
// `Combat_Resistance_Check`. The realms match Caster.exe rider for rider.
const DOS_TOUCH_RIDER_RESISTANCE_STEPS = [
  // PROVENANCE[dosTouchRiderResistance:lifeRider]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:24:8ab477152e0455ef995958b5 | Reference docs/DOS reconstructed/combat.c@span:36:bdb2231ea72390a1c3155fd2
  attackSpecificStep('dosTouchRiderResistance:lifeRider', ['lifeRiderRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'lifeRiderRes', 'life'); },
    (u, ctx) => ctx.fires && (ctx.values.exorcise != null || !!ctx.values.dispelEvil)),
  // PROVENANCE[dosTouchRiderResistance:stoningTouch]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:18:be3dda0220c030afd07c091e
  attackSpecificStep('dosTouchRiderResistance:stoningTouch', ['stoningTouchRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'stoningTouchRes', 'nature'); },
    (u, ctx) => ctx.fires && ctx.values.stoningTouch != null),
  // PROVENANCE[dosTouchRiderResistance:deathTouch]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:17:9a6dea6299656c757d809d2c
  attackSpecificStep('dosTouchRiderResistance:deathTouch', ['deathTouchRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'deathTouchRes', 'death'); },
    (u, ctx) => ctx.fires && ctx.values.deathTouch != null),
  // PROVENANCE[dosTouchRiderResistance:lifeSteal]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:23:898b6c294e889a5630a37458
  attackSpecificStep('dosTouchRiderResistance:lifeSteal', ['lifeStealRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'lifeStealRes', 'death'); },
    (u, ctx) => ctx.fires && ctx.values.lifeSteal != null),
  // The Chaos query is live in all three DOS builds even though no DOS rider consumes it today:
  // `destructionFailProb` answers 0 outside `com2_`, but the realm the roll is made in is a
  // property of the rider, not of the engine that happens to run it.
  // PROVENANCE[dosTouchRiderResistance:destruction]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:7:2b8acc05c0fab09086d1bea7
  attackSpecificStep('dosTouchRiderResistance:destruction', ['destructionRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'destructionRes', 'chaos'); },
    (u, ctx) => ctx.fires && ctx.values.destruction != null),
  // MoM and CP push realm 0; CoM 1 pushes -1 for both realm and modifier. Neither is a named
  // realm, and `dosEffectiveResistance` gates its realm-conditional terms on `realm !== null`
  // and on membership of `elementalRealms`, so both builds reduce to the same realm-less query.
  // PROVENANCE[dosTouchRiderResistance:poison]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:24:8533b165e73266ae95fc8853
  attackSpecificStep('dosTouchRiderResistance:poison', ['poisonRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'poisonRes', null); },
    (u, ctx) => ctx.fires && (ctx.values.poison || 0) > 0),
];

const DOS_FEAR_RIDER_RESISTANCE_STEPS = [
  // PROVENANCE[dosFearRiderResistance:fear]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:19:2227bee04b83947e54cfe777
  attackSpecificStep('dosFearRiderResistance:fear', ['fearRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'fearRes', 'death'); },
    (u, ctx) => !!ctx.values.fear),
];

// `BU_ProcessAttack` deals its gaze kill rolls Stoning first, then Death, in one function rather
// than through a caller — the same order the modern list above takes. They are gated on the
// selected attack's `ranged_type` being a gaze, so they are the gaze's own effect here too, not
// riders on it; what does ride a DOS gaze is the touch group, because `BU_ProcessAttack` merges
// its ranged flag record into every non-melee call.
const DOS_GAZE_KILL_RESISTANCE_STEPS = [
  // PROVENANCE[dosGazeKillResistance:stoningGaze]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:23:ba289a70c76622d0c1837f6e
  attackSpecificStep('dosGazeKillResistance:stoningGaze', ['stoningGazeRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'stoningGazeRes', 'nature'); },
    (u, ctx) => !!ctx.values.stoningGaze),
  // PROVENANCE[dosGazeKillResistance:deathGaze]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:23:b67032bc1211a705e54c6871
  attackSpecificStep('dosGazeKillResistance:deathGaze', ['deathGazeRes'],
    (u, ctx) => { riderResistanceQuery(u, ctx, 'deathGazeRes', 'death'); },
    (u, ctx) => !!ctx.values.deathGaze),
];

// One query group, asked of one target. `values` says which of the group's rolls the engine
// makes; `fires` is the group-level gate it puts around the whole block — Caster.exe's
// attack-type jump past the rider group for a gaze, and the per-phase touch-attack gate. A roll
// the engine does not make leaves its field absent: nothing queried it, and no consumer may
// read it.
//
// Two of the three groups are riders — they run inside another attack and modify its outcome.
// `gazeKill` is not: each kill gaze is its own `ApplyAttack` call, dispatched by
// `PerformAttacks` with `atk := 0`, so the per-figure resistance roll is the whole call rather
// than something riding one. It is a group here because it is an ordered region of the engine
// that asks the same query, not because it is a rider.
const RESISTANCE_QUERY_GROUPS = Object.freeze({
  touch: {
    modern: MODERN_TOUCH_RIDER_RESISTANCE_STEPS,
    dos: DOS_TOUCH_RIDER_RESISTANCE_STEPS,
    label: 'touch rider resistance',
  },
  fear: {
    modern: MODERN_FEAR_RIDER_RESISTANCE_STEPS,
    dos: DOS_FEAR_RIDER_RESISTANCE_STEPS,
    label: 'fear rider resistance',
  },
  gazeKill: {
    modern: MODERN_GAZE_KILL_RESISTANCE_STEPS,
    dos: DOS_GAZE_KILL_RESISTANCE_STEPS,
    label: 'gaze kill resistance',
  },
});

// `chains`, when supplied, is filled with one chain record per query the group actually made,
// keyed by the same field the value lands on. It is an out-parameter rather than part of the
// return value because every existing consumer reads the scratch record by field name, and
// because a caller that does not want chains must not pay for the traces.
function resistanceQueries(group, target, version, values, fires = true, chains = null) {
  const entry = RESISTANCE_QUERY_GROUPS[group];
  if (!entry) throw new Error(`resistanceQueries: unknown query group '${group}'`);
  const modern = !!(version && version.startsWith('com2'));
  const steps = modern ? entry.modern : entry.dos;
  const query = modern ? MODERN_RESISTANCE_QUERY : DOS_RESISTANCE_QUERY;
  const scratch = {};
  if (statStepDebugEnabled()) assertSequenceVersionScope(steps, version, entry.label);
  runStatSteps(steps, scratch, { target, version, values, fires, query, chains });
  return scratch;
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

function computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty, attackType,
  chainSink = null) {
  const aArmorPiercing = hasAbil(attacker.abilities, 'armorPiercing');
  const aIllusion = hasAbil(attacker.abilities, 'illusion');

  const wi = magicranged => hasWeaponImmunityEffect(target.abilities, version)
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
    const aRangedElem = attacker.rangedType === 'magic' || attacker.rangedType === 'magic_lightning';
    attack = {
      spellId: 0,
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      elementalEligible: aRangedElem,
      armorPiercing: aArmorPiercing,
      // `islightning := aflags2.armorpiercing or (Units[au].rangedtype = 30)`
      // (`Combat.ApplyAttack.pas:230-231`, `$005B1B9C..$005B1BD9`). Only the id-30 arm is
      // reachable here: `aflags2` on the ranged path is `rangedflags`
      // (`Combat.ApplyAttack.pas:225`), whose `armorpiercing` is written by the hero-item
      // `IPLightning` power alone (`Units.RecalculateUnits.pas:1306`), and hero item powers are
      // not a calculator input. Every Armor Piercing this calculator can carry is the *global*
      // record's — the roster's one `ArmorPiercing=Yes` byte, and every script grant, which write
      // `AFArmorPiercing` with flag selector 1, "Global" (`Scripts.TXT:642-643`;
      // `CreateUnit.CAS!NOTGENERIC!+52 "IF (GetStat(U,AFArmorPiercing,1,1)=0) %AND (GetStat(U,AFDoom,1,1)=0) THEN {"` reads that same global record to ask what the template gave). That
      // record is `attackflags`, which `islightning` does not read, so folding it in here would
      // let Lightning Resist cancel Armor Piercing for missile, boulder and plain magic ranged
      // attacks the engine still halves.
      isLightning: attacker.rangedType === 'magic_lightning',
      magicImmunityEligible: aRangedElem,
      isMissile: attacker.rangedType === 'missile',
      weaponImmunityEligible: wi(aRangedElem),
    };
  } else if (attackType === 'thrown') {
    const aThrownElem = isBreathThrownType(attacker.thrownType);
    attack = {
      spellId: 0,
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      elementalEligible: aThrownElem,
      armorPiercing: aArmorPiercing || attacker.thrownType === 'lightning',
      isLightning: attacker.thrownType === 'lightning',
      isFire: attacker.thrownType === 'fire',
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
  const trace = chainSink ? [] : null;
  return fillDefenseChain(chainSink, target,
    effectiveDefense(target, version, attack, trace), trace, 'effectiveDefense:base');
}

function computeCasterDefenseProfile(target, attacker, version, vertigoDefPenalty, chains = null) {
  const sink = key => (chains ? (chains[key] = {}) : null);
  const defense = (attackType, key) => {
    const slot = sink(key);
    const value = computeCasterDefenseForAttack(target, attacker, version, vertigoDefPenalty,
      attackType, slot);
    if (slot) chains[key] = slot.chain;
    return value;
  };
  return {
    vsMelee: defense('melee', 'vsMelee'),
    vsRanged: defense('ranged', 'vsRanged'),
    vsThrown: defense('thrown', 'vsThrown'),
    vsGaze: defense('gaze', 'vsGaze'),
    vsImmolation: defense('immolation', 'vsImmolation'),
  };
}

// --- Attack-specific defense sequence (WIZARDS.EXE: MoM 1.31, CP 1.60, CoM 1) ---
//
// `Battle_Unit_Defense_Special`, transcribed as ordered steps in the same shape as
// `EFFECTIVE_DEFENSE_STEPS`. The routine carries two values at once: a running `defense`, and
// a `defense_special` marker that later steps replace the running value from. Every immunity
// the engine recognises writes that marker rather than a number, which is why the whole family
// collapses to one constant — 50 in the MoM builds, 100 in CoM 1.
//
// The marker is what makes MoM 1.31's Weapon-Immunity-overwrites-Missile-Immunity bug an
// ordering fact rather than a special case: 1.31 sets the blanket marker before the Weapon
// Immunity one (131:0x9A66E then 0x9A68C), so Weapon Immunity wins; CP 1.60 and CoM 1 set them
// the other way round (160:0x9A66B then 0x9A68C), so the blanket value wins.
//
// What each incoming attack sets is not decided here: `dosDefenseForAttack` below builds the
// per-attack descriptor, exactly as `computeCasterDefenseForAttack` does for Caster.exe.
const DOS_DEFENSE_NONE = 'none';
const DOS_DEFENSE_WEAPON_IMMUNITY = 'weapon';
const DOS_DEFENSE_FULL = 'full';

const DOS_DEFENSE_WRITES = {
  // PROVENANCE[dosEffectiveDefense:base]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:26:23dc90c22f1178554f615524
  // Labelled for the chain by the one term it adds to the record's Defense: the DOS builds
  // subtract Vertigo here rather than in a step of their own (see the write below).
  base: attackSpecificStep('dosEffectiveDefense:base', ['effectiveDefense', 'defenseSpecial'],
    (u, ctx) => {
      // Vertigo writes the battle-unit Defense stat directly in the DOS binaries, so the
      // separate spell-damage path sees it too; it is subtracted from the seed here.
      u.effectiveDefense = Math.max(0, u.def - ctx.vertigoDefPenalty);
      u.defenseSpecial = DOS_DEFENSE_NONE;
    }, null, 'Vertigo'),
  // PROVENANCE[dosEffectiveDefense:illusion]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:8:07e4721467f2127b94284e57
  illusion: attackSpecificStep('dosEffectiveDefense:illusion', ['effectiveDefense'],
    u => { u.effectiveDefense = 0; return HALT; },
    (u, ctx) => ctx.illusion && !hasAbil(u.abilities, 'illusionImmunity')),
  // PROVENANCE[dosEffectiveDefense:largeShield]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:10:57204d1dbc16cbd3fc70afe5
  largeShield: attackSpecificStep('dosEffectiveDefense:largeShield', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense += ctx.largeShieldBonus; },
    (u, ctx) => ctx.isRanged && hasAbil(u.abilities, 'largeShield')),
  // The blanket marker: any immunity bit the attack's `ranged_type` sets that the target also
  // carries. Missile and Fire are the two the mask builder derives from the type; Magic is
  // tested directly by the separate step below, which is how a gaze reaches it at all.
  // PROVENANCE[dosEffectiveDefense:immunityMask]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:4:7631b0118223ca1089ef4ce6 | Reference docs/DOS reconstructed/combat.c@span:3:88dfe5adc853afc5bfed6290 | Reference docs/DOS reconstructed/combat.c@span:25:cd4c8b870408c2f3ef541b72
  immunityMask: attackSpecificStep('dosEffectiveDefense:immunityMask', ['defenseSpecial'],
    u => { u.defenseSpecial = DOS_DEFENSE_FULL; },
    (u, ctx) => ctx.isRanged
      && ((ctx.missileAttack && hasAbil(u.abilities, 'missileImmunity'))
        || (ctx.fireAttack && hasAbil(u.abilities, 'fireImmunity')))),
  // PROVENANCE[dosEffectiveDefense:weaponImmunityMark]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:25:3a05783701e4dc0bb3997f01 | Reference docs/DOS reconstructed/combat.c@span:25:cd4c8b870408c2f3ef541b72
  weaponImmunityMark: attackSpecificStep('dosEffectiveDefense:weaponImmunityMark', ['defenseSpecial'],
    u => { u.defenseSpecial = DOS_DEFENSE_WEAPON_IMMUNITY; },
    (u, ctx) => ctx.weaponImmunityEligible),
  // PROVENANCE[dosEffectiveDefense:magicImmunity]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:17:7ad26f1791d700f7e217ba27
  magicImmunity: attackSpecificStep('dosEffectiveDefense:magicImmunity', ['defenseSpecial'],
    u => { u.defenseSpecial = DOS_DEFENSE_FULL; },
    (u, ctx) => ctx.magicImmunityEligible && hasAbil(u.abilities, 'magicImmunity')),
  // PROVENANCE[dosEffectiveDefense:bless]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:14:4528b739bd15b90fdb0a0e12
  bless: attackSpecificStep('dosEffectiveDefense:bless', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense += ctx.blessBonus; },
    (u, ctx) => ctx.blessEligible && hasAbil(u.abilities, 'bless')),
  // CoM 1 replaces this whole block with an 87-byte NOP field (com1:0x9A6DC..0x9A732) and
  // repurposes the `UE_RIGHTEOUSNESS` bit itself as Shadow Attack, so the step is absent from
  // that engine's list below rather than gated per channel.
  // PROVENANCE[dosEffectiveDefense:righteousness]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/combat.c@span:10:8b80214da56946e4a9fbfbdd | Reference docs/DOS reconstructed/combat.c@span:8:66077c35eb258dac5ab28d94
  righteousness: attackSpecificStep('dosEffectiveDefense:righteousness', ['defenseSpecial'],
    u => { u.defenseSpecial = DOS_DEFENSE_FULL; },
    (u, ctx) => ctx.righteousnessEligible && hasAbil(u.abilities, 'righteousness')),
  // PROVENANCE[dosEffectiveDefense:elemental]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/combat.c@span:30:3fc4cd987afcc5ead9252efc
  elemental: attackSpecificStep('dosEffectiveDefense:elemental', ['effectiveDefense'],
    u => {
      u.effectiveDefense += hasElementalArmorEffect(u.abilities) ? 10
        : hasResistElementsEffect(u.abilities) ? 3 : 0;
    },
    (u, ctx) => ctx.elementalEligible
      && (hasElementalArmorEffect(u.abilities) || hasResistElementsEffect(u.abilities))),
  // CoM 1 splits the MoM else-if into two independent tests, so both bonuses can land.
  // PROVENANCE[dosEffectiveDefense:elementalArmor]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:30:3fc4cd987afcc5ead9252efc
  elementalArmor: attackSpecificStep('dosEffectiveDefense:elementalArmor', ['effectiveDefense'],
    u => { u.effectiveDefense += 12; },
    (u, ctx) => ctx.elementalEligible && hasElementalArmorEffect(u.abilities)),
  // PROVENANCE[dosEffectiveDefense:resistElements]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:30:3fc4cd987afcc5ead9252efc
  resistElements: attackSpecificStep('dosEffectiveDefense:resistElements', ['effectiveDefense'],
    u => { u.effectiveDefense += 4; },
    (u, ctx) => ctx.elementalEligible && hasResistElementsEffect(u.abilities)),
  // Signed division truncating toward zero; Defense is nonnegative at this point.
  // PROVENANCE[dosEffectiveDefense:armorPiercing]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:7:654e34cd21930e64d987422a
  armorPiercing: attackSpecificStep('dosEffectiveDefense:armorPiercing', ['effectiveDefense'],
    u => { u.effectiveDefense = Math.trunc(u.effectiveDefense / 2); },
    (u, ctx) => ctx.armorPiercing),
  // PROVENANCE[dosEffectiveDefense:weaponImmunityFloor]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/combat.c@span:9:091e1f3c04458619a8eb1828
  weaponImmunityFloor: attackSpecificStep('dosEffectiveDefense:weaponImmunityFloor', ['effectiveDefense'],
    u => { u.effectiveDefense = Math.max(u.effectiveDefense, 10); },
    u => u.defenseSpecial === DOS_DEFENSE_WEAPON_IMMUNITY),
  // PROVENANCE[dosEffectiveDefense:weaponImmunityBonus]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:9:091e1f3c04458619a8eb1828
  weaponImmunityBonus: attackSpecificStep('dosEffectiveDefense:weaponImmunityBonus', ['effectiveDefense'],
    u => { u.effectiveDefense += 8; },
    u => u.defenseSpecial === DOS_DEFENSE_WEAPON_IMMUNITY),
  // PROVENANCE[dosEffectiveDefense:defenseSpecial]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:7:3ca39d47d348cb2363d68c06
  defenseSpecial: attackSpecificStep('dosEffectiveDefense:defenseSpecial', ['effectiveDefense'],
    (u, ctx) => { u.effectiveDefense = ctx.defenseSpecialValue; },
    u => u.defenseSpecial === DOS_DEFENSE_FULL),
};

// One ordered list per engine, written out in full. MoM 1.31 differs from the other two in the
// order of the two marker writes; CoM 1 differs in the elemental block, in how the Weapon
// Immunity marker is cashed in, and in having no Righteousness step at all.
const DOS_DEFENSE_STEPS = Object.freeze({
  'mom_1.31': [
    DOS_DEFENSE_WRITES.base,
    DOS_DEFENSE_WRITES.illusion,
    DOS_DEFENSE_WRITES.largeShield,
    DOS_DEFENSE_WRITES.immunityMask,
    DOS_DEFENSE_WRITES.weaponImmunityMark,
    DOS_DEFENSE_WRITES.magicImmunity,
    DOS_DEFENSE_WRITES.bless,
    DOS_DEFENSE_WRITES.righteousness,
    DOS_DEFENSE_WRITES.elemental,
    DOS_DEFENSE_WRITES.armorPiercing,
    DOS_DEFENSE_WRITES.weaponImmunityFloor,
    DOS_DEFENSE_WRITES.defenseSpecial,
  ],
  'mom_cp_1.60.00': [
    DOS_DEFENSE_WRITES.base,
    DOS_DEFENSE_WRITES.illusion,
    DOS_DEFENSE_WRITES.largeShield,
    DOS_DEFENSE_WRITES.weaponImmunityMark,
    DOS_DEFENSE_WRITES.immunityMask,
    DOS_DEFENSE_WRITES.magicImmunity,
    DOS_DEFENSE_WRITES.bless,
    DOS_DEFENSE_WRITES.righteousness,
    DOS_DEFENSE_WRITES.elemental,
    DOS_DEFENSE_WRITES.armorPiercing,
    DOS_DEFENSE_WRITES.weaponImmunityFloor,
    DOS_DEFENSE_WRITES.defenseSpecial,
  ],
  'com_6.08': [
    DOS_DEFENSE_WRITES.base,
    DOS_DEFENSE_WRITES.illusion,
    DOS_DEFENSE_WRITES.largeShield,
    DOS_DEFENSE_WRITES.weaponImmunityMark,
    DOS_DEFENSE_WRITES.immunityMask,
    DOS_DEFENSE_WRITES.magicImmunity,
    DOS_DEFENSE_WRITES.bless,
    DOS_DEFENSE_WRITES.elementalArmor,
    DOS_DEFENSE_WRITES.resistElements,
    DOS_DEFENSE_WRITES.armorPiercing,
    DOS_DEFENSE_WRITES.weaponImmunityBonus,
    DOS_DEFENSE_WRITES.defenseSpecial,
  ],
});

function dosEffectiveDefense(target, version, attack, trace = null) {
  const steps = DOS_DEFENSE_STEPS[version];
  if (!steps) throw new Error(`no DOS defense sequence for version ${version}`);
  const isCoM1 = version === 'com_6.08';
  const scratch = { ...target };
  const context = {
    version,
    vertigoDefPenalty: attack.vertigoDefPenalty || 0,
    isRanged: !!attack.isRanged,
    illusion: !!attack.illusion,
    missileAttack: !!attack.missileAttack,
    fireAttack: !!attack.fireAttack,
    magicImmunityEligible: !!attack.magicImmunityEligible,
    righteousnessEligible: !!attack.righteousnessEligible,
    blessEligible: !!attack.blessEligible,
    elementalEligible: !!attack.elementalEligible,
    armorPiercing: !!attack.armorPiercing,
    weaponImmunityEligible: !!attack.weaponImmunityEligible,
    largeShieldBonus: isCoM1 ? 3 : 2,
    blessBonus: isCoM1 ? 5 : 3,
    defenseSpecialValue: isCoM1 ? 100 : 50,
    ...(trace ? { trace } : {}),
  };
  if (statStepDebugEnabled()) {
    assertSequenceVersionScope(steps, version, 'Battle_Unit_Defense_Special');
  }
  runStatSteps(steps, scratch, context);
  return scratch.effectiveDefense;
}

// The per-attack descriptor: which immunity bits this attack's `ranged_type` sets, which realm
// gates it opens, and which weapon the Weapon Immunity test sees. This is the DOS counterpart
// of `computeCasterDefenseForAttack`, and it is where the calculator's channel model meets the
// engine's single `ranged_type` argument.
//
// Two DOS classifier facts sit behind it. The defence-special realm comes from the attacker's
// `ranged_type` alone (classifier 0x9A79E): boulder/missile (10-29) and Thrown (100) are
// realm-less and never inherit a Chaos/Death attacker's realm, and only melee (type 0) reads
// the attacker's race. CoM 1's Bless arm additionally requires `ranged_type > 39` (com1:0x9A6D3),
// which drops melee, every conventional ranged type and the spell path's own 39, leaving breath
// and gaze. Righteousness is not gated here at all: CoM 1 has no such step, and the enchantment
// bit it would read is Shadow Attack in that build. The immunity mask (0x9921A) admits
// the Weapon bit only for `ranged_type / 10 < 3`, or MoM 1.31's unsatisfiable `== 100` — which
// is why 1.31 alone misses Thrown, and why no build lets Weapon Immunity reach a gaze (103-105).
function dosDefenseForAttack(target, attacker, version, vertigoDefPenalty, attackType,
  chainSink = null) {
  const isCoM1 = version === 'com_6.08';
  const aArmorPiercing = hasAbil(attacker.abilities, 'armorPiercing');
  const aIllusion = hasAbil(attacker.abilities, 'illusion');
  // Spirit Link is Warlord's alone (`PROVENANCE[spiritLink]`, `stats_identity.js`), and every
  // `com2*` version leaves this function by `computeDefenseProfile`'s first branch, so no
  // Spirit Link term belongs here. Warlord strips the fantastic targeting status in the
  // `d:spiritLink` step, before resolution sees the unit at all.
  const aIsDC = attacker.unitType === 'fantastic_death' || attacker.unitType === 'fantastic_chaos';
  // The gaze's own realm, not the attacker's unit type, is what the defence specials key off.
  const aGazeRealm = gazeRealm(attacker.abilities);
  const aGazeDC = aGazeRealm === 'chaos' || aGazeRealm === 'death';
  // Blazing March upgrades melee and missile attacks to magical weapons; Eldritch Weapon
  // upgrades the melee attack only, so a ranged or thrown attack still meets Weapon Immunity.
  // Each carries the version scope of the build whose block makes the write, because this
  // function serves all three DOS engines and the two blocks are in different ones.
  const aBlazingMarch = blazingMarchMagicWeaponForUnit(attacker.abilities, version);
  const aEldritch = eldritchWeaponActiveForUnit(attacker.abilities, version);
  const wi = weapon => weaponImmunityApplies(
    target.abilities, weapon, attacker.unitType, version, attacker.generic);

  let attack;
  if (attackType === 'melee') {
    const weapon = ((aBlazingMarch || aEldritch) && attacker.weapon === 'normal')
      ? 'magic' : attacker.weapon;
    attack = {
      vertigoDefPenalty,
      illusion: aIllusion,
      blessEligible: !isCoM1 && aIsDC,
      armorPiercing: aArmorPiercing,
      weaponImmunityEligible: wi(weapon),
    };
  } else if (attackType === 'ranged') {
    const isMissile = attacker.rangedType === 'missile';
    const isPhysical = isMissile || attacker.rangedType === 'boulder';
    // The DOS realm triple, and only that: shot type 40 has no entry in
    // `Battle_Unit_Attack_Magic_Realm` (131:0x9A7A9) and no DOS build can carry one.
    const isMagical = attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n'
      || attacker.rangedType === 'magic_s';
    const weapon = (aBlazingMarch && isMissile && attacker.weapon === 'normal')
      ? 'magic' : attacker.weapon;
    attack = {
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      blessEligible: attacker.rangedType === 'magic_c' && !isCoM1,
      elementalEligible: isCoM1
        ? isMagical
        : (attacker.rangedType === 'magic_c' || attacker.rangedType === 'magic_n'),
      armorPiercing: aArmorPiercing,
      missileAttack: isMissile,
      magicImmunityEligible: isMagical,
      righteousnessEligible: attacker.rangedType === 'magic_c',
      weaponImmunityEligible: isPhysical && wi(weapon),
    };
  } else if (attackType === 'thrown') {
    const isThrown = attacker.thrownType === 'thrown';
    const isFire = attacker.thrownType === 'fire';
    const isLightning = attacker.thrownType === 'lightning';
    attack = {
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      blessEligible: isFire || isLightning,
      elementalEligible: isFire || isLightning,
      // Lightning Breath carries the Armor Piercing flag unless the target resists lightning.
      armorPiercing: aArmorPiercing
        || (isLightning && !hasAbil(target.abilities, 'lightningResist')),
      fireAttack: isFire,
      magicImmunityEligible: (isFire || isLightning) && !isCoM1,
      righteousnessEligible: isFire || isLightning,
      // MoM 1.31's mask cannot set the Weapon bit for Thrown at all.
      weaponImmunityEligible: isThrown && version !== 'mom_1.31' && wi(attacker.weapon),
    };
  } else if (attackType === 'gaze') {
    attack = {
      vertigoDefPenalty,
      illusion: aIllusion,
      isRanged: true,
      blessEligible: aGazeDC,
      // MoM grants the elemental bonus against Chaos- and Nature-realm gazes (0x9A72D). CoM 1
      // replaced the realm gate with a `ranged_type` range, which is not modelled: no CoM unit
      // carries a hidden gaze component.
      elementalEligible: !isCoM1 && (aGazeRealm === 'nature' || aGazeRealm === 'chaos'),
      armorPiercing: aArmorPiercing,
      magicImmunityEligible: true,
      righteousnessEligible: aGazeDC,
      weaponImmunityEligible: false,
    };
  } else if (attackType === 'immolation') {
    // The DOS spell-damage helper feeds Immolation and Wall of Fire through this routine as a
    // magical ranged type (38 in MoM, 39 in CoM 1), so the elemental bonus applies in all three
    // builds. Armor Piercing attaches to a unit's own attacks only, and neither Illusion nor
    // City Walls reaches the spell path.
    //
    // Bless is the one term the two constants separate: CoM 1's arm needs `ranged_type > 39` and
    // the helper passes exactly 39, so the bonus lands in the MoM builds alone.
    attack = {
      vertigoDefPenalty,
      isRanged: true,
      blessEligible: !isCoM1,
      elementalEligible: true,
      armorPiercing: false,
      fireAttack: true,
      magicImmunityEligible: true,
      righteousnessEligible: true,
      weaponImmunityEligible: false,
    };
  } else {
    throw new Error(`Unknown DOS defense attack type: ${attackType}`);
  }
  const trace = chainSink ? [] : null;
  return fillDefenseChain(chainSink, target,
    dosEffectiveDefense(target, version, attack, trace), trace, 'dosEffectiveDefense:base');
}

// --- Defense Profile ---
// The defender's effective defense against each attack type the attacker can make, for the
// DOS engines; `com2` versions hand off to the Caster.exe profile above. Each entry is one
// `Battle_Unit_Defense_Special` call over the ordered `DOS_DEFENSE_STEPS` list, on a scratch
// copy of the finished record, plus the City Walls bonus its caller adds afterwards.
//   target: defender unit (provides def, abilities, cityWallBonus, weapon, unitType)
//   attacker: attacking unit (provides weapon, unitType, rangedType, thrownType, abilities, generic)
//   vertigoDefPenalty: precomputed Vertigo defense malus on the target (0 in CoM2/Warlord).
// Returns: { vsMelee, vsRanged, vsThrown, vsGaze, vsImmolation }
// PROVENANCE[dosEffectiveDefenseProfile]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:39:92665849702ec840ab52d0c4 | Reference docs/DOS reconstructed/combat.c@span:22:e75af0ad84433181ba29fac1 | Reference docs/DOS reconstructed/combat.c@span:39:87871cadde938ca420e0159a
// STAT-FORMULA[dosEffectiveDefenseProfile]
// `chains`, when supplied, is filled with the hover chain each of the five sequences produced,
// under the same key as its value.
function computeDefenseProfile(target, attacker, version, vertigoDefPenalty, chains = null) {
  if (version && version.startsWith('com2')) {
    return computeCasterDefenseProfile(target, attacker, version, vertigoDefPenalty, chains);
  }

  const defense = (attackType, key) => {
    const slot = chains ? {} : null;
    const value = dosDefenseForAttack(target, attacker, version, vertigoDefPenalty, attackType,
      slot);
    if (slot) chains[key] = slot.chain;
    return value;
  };
  const vsMelee = defense('melee', 'vsMelee');
  const vsRanged = defense('ranged', 'vsRanged');
  const vsThrown = defense('thrown', 'vsThrown');
  const vsGaze = defense('gaze', 'vsGaze');
  const vsImmolation = defense('immolation', 'vsImmolation');

  // BU_Apply_Attack's inside-target/outside-source block follows the defense-special call, so
  // Armor Piercing, every immunity and an unresisted Illusion all resolve before this unhalved
  // addition. The separate spell-damage path never adds it, which is why Immolation is absent.
  const cityWallBonus = target.cityWallBonus > 0 && !(attacker.cityWallBonus > 0)
    ? target.cityWallBonus : 0;
  // The bonus is applied after the sequence has run rather than by a step of it, so the chain
  // takes it as its own final transform. One expression produces both the returned figure and
  // the chain's last line, so the two cannot come to disagree — the same shape
  // `appendProjectedTraceEntry` already serves for the displayed Vertigo penalty (`stats.js`).
  // Caster.exe reaches the same total through `extradef` inside its seed, which is why only the
  // DOS chains need this. Immolation is deliberately absent: the spell path never adds it.
  const walled = (value, key) => {
    const total = value + cityWallBonus;
    const record = chains && chains[key];
    if (record) {
      appendProjectedTraceEntry(record.trace, {
        id: 'dosEffectiveDefense:cityWalls', sourceId: 'cityWalls', sourceLabel: 'City Walls',
        phase: 'attackSpecific', order: 0,
      }, record.trace.result, total);
    }
    return total;
  };
  return {
    vsMelee: walled(vsMelee, 'vsMelee'),
    vsRanged: walled(vsRanged, 'vsRanged'),
    vsThrown: walled(vsThrown, 'vsThrown'),
    vsGaze: walled(vsGaze, 'vsGaze'),
    vsImmolation,
  };
}
