// --- Combat Resolution: Cause Fear and touch-attack distributions ---
// Fear resistance and its distributions, the combat-healing mode predicates, and the
// convolution machinery that turns repeated touch attacks into outcome distributions.

// --- Cause Fear ---
// Probability of a single figure failing its fear resistance roll.
// MoM: no resistance modifier. CoM/CoM2: -3 resistance modifier.
// Death Immunity skips the roll outright rather than granting resistance. In CoM2/Warlord,
// this direct gate reads the persistent BaseUnits record; calculated Death Immunity still
// proceeds to the roll. The older engines use their effective ability record here.
// `defRes` already carries every resistance write its version's engine makes: the modern caller
// has run GetEffectiveResistance, including Magic Immunity's assignment to 100, and the DOS
// caller has run Combat_Effective_Resistance, whose Magic Immunity and Righteousness +30 are
// steps of that transform. Cause Fear is the one consumer that reaches the roll with a
// magic-immune target, so the bonus decides it where the touch/gaze group's skips never fire.
function fearFailProb(defRes, defAbilities, version, baseDeathImmunity) {
  const isCoM = version && version.startsWith('com');
  const isModern = version && version.startsWith('com2');
  const modifier = isCoM ? -3 : 0;
  const directDeathImmunity = isModern && baseDeathImmunity != null
    ? !!baseDeathImmunity
    : hasAbil(defAbilities, 'deathImmunity');
  if (directDeathImmunity) return 0;
  const effectiveRes = defRes + modifier;
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
// The three healing categories an outcome can carry, named so a read of the field can be
// checked against them.
const DAMAGE_CATEGORIES = Object.freeze(
  ['normalDamage', 'undeadDamage', 'irrecoverableDamage']);

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
    // An attack that names no category deals normal damage; the two gaze specs that name one
    // name `irrecoverableDamage`. A fourth spelling would silently become normal damage and
    // heal off (`SPEC.md`, *Out-of-range values stop the run*).
    const baseCategory = p.baseDamageCategory === undefined || p.baseDamageCategory === null
      ? 'normalDamage' : p.baseDamageCategory;
    if (!DAMAGE_CATEGORIES.includes(baseCategory)) {
      throw new Error(
        `convolveTouchAttacks: damage category '${baseCategory}' is not one of `
        + `${DAMAGE_CATEGORIES.join('/')}.`);
    }
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
