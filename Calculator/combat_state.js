// --- Combat Resolution: joint damage state and phase application ---
// The two-sided joint distribution, its combat-healing paths, and the routines that apply a
// damage phase, a simultaneous pair, or a first-strike block to it.

// --- Combat Flow Modifiers ---
// Abilities that change *how* combat resolves rather than just stat values — phase ordering,
// defense effectiveness, damage type, the immunities and the special attacks — are read as
// `resolveCombat` builds the phase list below. No catalogue of them is kept here: a second list
// of what each one does is a second home, and drifts from the code that implements it. Each is
// owned by the `PROVENANCE` citation beside its own reader — phase ordering and the special
// attacks in `combat_phases.js` and `combat_special_attacks.js`, every defense term and immunity
// in the two attack-specific defense sequences in `combat_effects.js`.

// --- Combat Phase Pipeline ---
// A phase is { kind, source, target, active, label, compute } where compute is
// (sourceAlive, targetAlive, cap[, fearDist]) -> { dist, lifeStealEV, lifeStealDist? }.
// The engine maintains a 2D joint distribution P(cumDmgA, cumDmgB) and walks the
// phase list, calling each phase's compute for every cell of the joint and folding
// the resulting damage into the appropriate dimension. Per-phase 1D damage marginals
// are accumulated for the breakdown UI.
//
// In FS+Haste configurations, a single 'firstStrikeBlock' phase replaces phases 5-8b.
// The DOS engines retain their shared fear sample; modern Caster ApplyAttack calls
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
  if (isDosCombatHealState(state)) {
    const next = normalizeDosCombatHealState(state);
    // BU_ApplyDamage saturates each stored DOS category independently at 200, while
    // its front-figure/current-figure calculation still consumes the full sum:
    // `Reference docs/DOS reconstructed/R6.2f.evidence.md`, *BU_ApplyDamage rejects inert
    // inputs before changing any unit state*.
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
  return isDosCombatHealState(state)
    ? dosCombatHealLivingFigures(state)
    : Math.max(0, combatHealLivingFigures(state));
}

function healingStateRemainingHp(state) {
  if (isDosCombatHealState(state)) return dosCombatHealRemainingHp(state);
  const normalized = normalizeCombatHealState(state);
  return Math.max(0,
    normalized.figures * (normalized.hp + normalized.bonusHp) - normalized.totalDamage);
}

// Stable presentation boundary for the version-specific healing records. The resolver
// keeps DOS Irreversible Damage / Extra Hits and Caster Irrecoverable Damage / Bonus HP
// distinct internally, but callers need one set of comparable post-combat means.
function combatHealingStateMetrics(state) {
  if (isDosCombatHealState(state)) {
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
        // it calls the counter, and every such call precedes all three tail Dealdamage
        // calls (`Reference docs/Caster binary/Combat.PerformAttacks.R5.2d.evidence.md`),
        // so all pending damage is dealt afterwards.  Resolve
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
          if (isDosCombatHealState(path.aState)) {
            // DOS main melee and counterattack execute from one frozen battle-unit
            // snapshot: each of BU_AttackTarget's nine strike calls transfers its result
            // into one of the parent's two directional damage arrays rather than into the
            // record (`Reference docs/DOS reconstructed/D39.evidence.md`, *ABI, callers, and
            // output routing*). Each call may revise its own source state internally, but
            // neither observes the other's healing or still-pending damage.
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
      // CoM 1 reads hits - front_figure_damage directly from the battle-unit record, and the
      // timing is load-bearing: damage accumulated earlier in this exchange (Thrown, say) is
      // still only in the pending damage arrays, so it does not affect the First Strike cutoff.
      // `Reference docs/MoM binary analysis.md`, *First Strike's 24-HP cutoff and Haste repeats*.
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
// coupleKa: for the DOS shared-sample path, sample k_a once and use the SAME k_a
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
          // CoM 6.08 falls through to one simultaneous main/counter exchange: Haste repeats
          // the counter-attack in both MoM builds but not in CoM 1 (`Reference docs/MoM binary
          // analysis.md`, *First Strike's 24-HP cutoff and Haste repeats*). Both calls read
          // the frozen pre-exchange records, while each keeps its own in-call Life Steal
          // transition before pending damage is committed.
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
