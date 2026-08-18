// --- Combat Resolution: special attacks and immunity defenses ---
// Touch and gaze kill probabilities, gaze/damage-spell distributions, phase breakdown
// labels, Life Steal, and the immunity/Immolation/Wall of Fire defense helpers.

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
// Delivered as a Fireball effect (spell 96) with an explicit strength override; how each value
// was established is `Reference docs/MoM binary analysis.md`, *Immolation and Wall of Fire are
// both Fireball*.
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
// Delivered as a Fireball effect (spell 96); Fireball's area flag is what makes the attack land
// on every figure, and Warlord's removal of that flag is what reduces it to one.
// How each strength and To Hit was established: `Reference docs/MoM binary analysis.md`,
// *Immolation and Wall of Fire are both Fireball*; `Reference docs/CoM2 data tables.md`,
// *Wall of Fire*.
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
