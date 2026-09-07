// --- Combat Resolution: Cause Fear and touch-attack distributions ---
// Fear resistance and its distributions, the combat-healing mode predicates, and the
// convolution machinery that turns repeated touch attacks into outcome distributions.

// --- Cause Fear ---
// Probability of a single figure failing its fear resistance roll. The DOS side — the save
// modifier each build pushes, the Death Immunity rejection, and why Magic Immunity nullifies
// fear as a resistance bonus rather than as a skip — is `Reference docs/MoM binary analysis.md`,
// *Cause Fear direction and resistance modifier*. CoM2/Warlord differ in reading the persistent
// BaseUnits record for the Death Immunity gate; calculated Death Immunity still proceeds to the
// roll, where the older engines use their effective ability record.
// `defRes` arrives carrying every resistance write its version's engine makes — the modern
// caller has run GetEffectiveResistance, the DOS caller Combat_Effective_Resistance — so this
// function adds only the save modifier. Cause Fear is the one consumer that reaches the roll
// with a magic-immune target, which is why that bonus decides it where the touch and gaze
// group's outright skips never fire.
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

// v1.31 bug: attacker self-fears based on defender's resistance rolls. Defender's figures each
// roll; each fail fears one attacker figure. Returns dist[k] = P(k attacker figures unfeared).
// The bug is the caller's argument order, not the helper's, and CP 1.60 fixes it by swapping the
// two pushes: `Reference docs/MoM binary analysis.md`, *Cause Fear direction and resistance
// modifier*.
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

// Convolve a unit's active touch attacks into `dist`. Nothing is truncated: `ApplyAttack`
// accumulates three unbounded buckets and `Dealdamage` sums them (`CLAUDE.md`, *Architecture*).
// The target's remaining HP is not an argument: every place this call reads it — the wounded
// top figure, the living-figure count — is resolved by the caller that builds `dist`.
// Touch attacks (Poison, Stoning, Dispel Evil, Life Steal, Immolation) all scale with
// `atkFigs`. Each touch is active iff its trigger params are set:
//   poisonStr > 0 && poisonFail > 0  → Poison Touch
//   stoningFail > 0                   → Stoning Touch (kills figures, damage = targetHP)
//   deathTouchFail > 0                → Death Touch   (kills figures, damage = targetHP)
//   dispelEvilFail > 0                → Dispel Evil   (kills figures, damage = targetHP)
//   exorciseFail > 0                  → Exorcise      (kills figures, damage = targetHP)
//   destructionFail > 0               → Destruction   (one resistance attempt per surviving
//                                       attacking figure; a success assigns a flat 150 to the
//                                       irrecoverable bucket, discarding what the other
//                                       irrecoverable riders had already put there)
//   lifeStealMod != null              → Life Steal    (uses lifeStealRes)
//   immDist truthy                    → Immolation    (caller pre-computes the area dist)
// The three healing categories an outcome can carry, named so a read of the field can be
// checked against them.
const DAMAGE_CATEGORIES = Object.freeze(
  ['normalDamage', 'undeadDamage', 'irrecoverableDamage']);

// The riders that write HP into one of `ApplyAttack`'s three damage buckets. Each key is one
// histogram in that phase's row (`CLAUDE.md`, *Input/output contract*), plotted in HP on one
// shared axis. `melee` is the ordinary attack roll — the `TotalDamage` local the loop deposits
// once it closes, and in a gaze phase the gaze's own damage, which occupies the same slot.
//
// This is the list's *display* order, not an execution order, and it is not the order
// `convolveTouchAttacks` computes them in either. It follows the modern layout: Immolation,
// which is dealt before the per-figure loop (`Combat.ApplyAttack.pas:378`; DOS `combat.c:4353`),
// then the six blocks the loop runs, in the order it runs them, then the ordinary roll's slot
// and Bloodsucker, which is dealt once after the loop closes (`:631`). Only the six middle
// entries are an engine order, and only the six are the same order in both families — the DOS
// builds generate conventional damage before entering Poison (`combat.c:4733`, `:4892`) where
// Caster runs Poison before its own roll. Nothing reads the order as a computation order:
// the buckets are additive, and Destruction's assignment — the one write that is order-sensitive
// — is resolved as a joint inside `convolveTouchAttacks` rather than by list position.
//
// `stoningGaze` is DOS-only and is not one of the six: it is the gaze call's own stoning kill
// loop, which runs before the per-figure loop and is the one part of a DOS gaze that writes
// `local_damage[2]` (`combat.c:4419`; F225.2). It sits beside Immolation because both are dealt
// before that loop opens. A modern gaze is its own `ApplyAttack` call whose whole record is the
// irrecoverable bucket, so it places no rider at all and this key never appears there.
const TOUCH_RIDER_KEYS = Object.freeze([
  'immolation', 'stoningGaze', 'exorcise', 'dispelEvil', 'stoningTouch', 'deathTouch',
  'lifeSteal', 'destruction', 'poison', 'melee', 'bloodsucker',
]);

// Source-side rider quantities. Life Steal's healing is not a second view of its drain — the
// engine keeps it in `Combatheal`, not in `field_04` — so it is its own histogram on a
// source-HP axis.
const SOURCE_RIDER_KEYS = Object.freeze(['lifeStealHeal', 'bloodsuckerHeal']);

function addRiderValue(riders, key, amount) {
  const next = { ...riders };
  next[key] = (next[key] || 0) + amount;
  return next;
}

function usesModernCombatHealing(version) {
  return version === 'com2_1.05.11' || version === 'com2_warlord_1.5.12.9';
}

function usesDosCombatHealing(version) {
  return version === 'mom_1.31' || version === 'mom_cp_1.60.00'
    || version === 'com_6.08';
}

// Which riders this call places, independent of whether they can land. A rider a version does
// not have, or that this phase's attack record does not carry, emits no key at all; a placed
// rider whose resistance roll cannot succeed still emits, with all its mass at 0 (`CLAUDE.md`,
// *Input/output contract*). `p.placed` is the placement gate `touchParams` already evaluated,
// which is what keeps INV-2: a rider a version does not have is never placed. Every production
// call site now passes `placed`, the DOS gaze map included (F222.3 exercised it); the value test
// beside it is what keeps a hand-built spec that supplies no map from dropping a rider that is
// demonstrably firing.
function touchRidersPresent(p, bloodsuckerActive) {
  const placed = p.placed || null;
  const isPlaced = (key, firing) => (placed ? placed[key] === true : false) || !!firing;
  return {
    melee: true,
    immolation: !!p.immDist,
    // The DOS gaze's stoning kill arrives as a prebuilt distribution rather than as a failure
    // probability, because its rolls are counted over the *defender's* figures and not over
    // `atkFigs` (0x99E07 re-reads `es:[bx+0xd]`). Supplying it is the placement: a gaze that
    // runs the loop but can never fail a roll supplies `[1]` and draws all its mass at 0.
    stoningGaze: isPlaced('stoningGaze', !!p.stoningGazeDist),
    exorcise: isPlaced('exorcise', p.exorciseFail > 0),
    dispelEvil: isPlaced('dispelEvil', p.dispelEvilFail > 0),
    stoningTouch: isPlaced('stoningTouch', p.stoningFail > 0),
    deathTouch: isPlaced('deathTouch', p.deathTouchFail > 0),
    lifeSteal: isPlaced('lifeSteal', p.lifeStealMod != null),
    destruction: isPlaced('destruction', p.destructionFail > 0),
    poison: isPlaced('poison', p.poisonStr > 0 && p.poisonFail > 0),
    bloodsucker: !!bloodsuckerActive,
  };
}

// Returns uncapped damage plus the version-appropriate Life Steal marginals.
// `outcomes` retain uncapped raw drain, the Combatheal correlation that repeated ApplyAttack
// calls such as Haste read, and one uncapped HP accumulator per placed rider.
function convolveTouchAttacks(dist, atkFigs, p) {
  const dosCombatHealing = usesDosCombatHealing(p.version);
  // ApplyAttack tests Bloodsucker only after the riders below, then adds its damage to the
  // result and passes its healing separately to Combatheal — `Reference docs/Caster binary/
  // Combat.ApplyAttack.R5.2c.evidence.md`, the `$005B3216..$005B327B` block. The two shipped
  // magnitudes are independent INI inputs, `BloodsuckerDamage` and `BloodsuckerHealing`
  // (`Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI`).
  const bloodsucker = p.version === 'com2_warlord_1.5.12.9' && p.bloodsucker
    ? { damage: 2, healing: 2 } : null;
  const present = touchRidersPresent(p, bloodsucker);
  const zeroRiders = {};
  for (const key of TOUCH_RIDER_KEYS) if (present[key]) zeroRiders[key] = 0;
  const zeroSourceRiders = {};
  if (present.lifeSteal) zeroSourceRiders.lifeStealHeal = 0;
  if (present.bloodsucker) zeroSourceRiders.bloodsuckerHeal = 0;
  let outcomes = [];
  for (let damage = 0; damage < dist.length; damage++) {
    if (dist[damage] < 1e-15) continue;
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
    outcomes.push({ probability: dist[damage], damage,
      state: p.sourceState
        ? (dosCombatHealing
          ? normalizeDosCombatHealState(p.sourceState)
          : normalizeCombatHealState(p.sourceState)) : null,
      rawDrain: 0, healedDamage: 0, bonusHpGain: 0, bonusHpBenefit: 0,
      bloodsuckerHealed: 0,
      irrecoverableDamage: baseCategory === 'irrecoverableDamage' ? damage : 0,
      undeadDamage: baseCategory === 'undeadDamage' ? damage : 0,
      normalDamage: baseCategory === 'normalDamage' ? damage : 0,
      riders: { ...zeroRiders, melee: damage },
      sourceRiders: zeroSourceRiders });
  }
  const addDamage = (riderDist, category, riderKey) => {
    if (!riderDist) return;
    const next = [];
    for (const outcome of outcomes) {
      for (let damage = 0; damage < riderDist.length; damage++) {
        const probability = outcome.probability * riderDist[damage];
        if (probability < 1e-15) continue;
        next.push({ ...outcome, probability, damage: outcome.damage + damage,
          [category]: outcome[category] + damage,
          riders: addRiderValue(outcome.riders, riderKey, damage) });
      }
    }
    outcomes = next;
  };
  // The DOS gaze's stoning kill loop, ahead of the `atkFigs` gate because it is not bounded by
  // the attacker's figures at all: it runs `0 .. Cur_Figures-1` over the *defender's* count
  // before `BU_ProcessAttack` opens its per-attacker-figure loop. Its `hits` go to
  // `local_damage[2]` (`combat.c:4419`), which is why it is a rider with its own bucket rather
  // than part of the base distribution the death loop and the doom component share (F225.2).
  addDamage(p.stoningGazeDist, 'irrecoverableDamage', 'stoningGaze');
  if (atkFigs <= 0) {
    return collapseTouchOutcomes(outcomes, false, present);
  }
  if (p.poisonStr > 0 && p.poisonFail > 0) {
    addDamage(calcResistDmgDist(atkFigs * p.poisonStr, p.poisonFail),
      'normalDamage', 'poison');
  }
  // Exorcise / Dispel Evil, Stoning Touch and Destruction all write `Result.field_00`, and
  // Destruction writes it by assignment rather than by `Inc`, so when it is placed the three
  // resolve as one joint over the per-figure loop instead of as independent addends.
  if (p.destructionFail > 0) {
    const irrecoverableKeys = [];
    const irrecoverableProbs = [];
    if (p.exorciseFail > 0) {
      irrecoverableKeys.push('exorcise'); irrecoverableProbs.push(p.exorciseFail);
    }
    if (p.dispelEvilFail > 0) {
      irrecoverableKeys.push('dispelEvil'); irrecoverableProbs.push(p.dispelEvilFail);
    }
    if (p.stoningFail > 0) {
      irrecoverableKeys.push('stoningTouch'); irrecoverableProbs.push(p.stoningFail);
    }
    const joint = calcIrrecoverableRiderOutcomes(atkFigs, irrecoverableKeys,
      irrecoverableProbs, p.destructionFail, p.targetHP);
    const next = [];
    for (const outcome of outcomes) {
      for (const entry of joint) {
        const probability = outcome.probability * entry.probability;
        if (probability < 1e-15) continue;
        let total = 0;
        let riders = outcome.riders;
        for (const key of Object.keys(entry.values)) {
          total += entry.values[key];
          riders = addRiderValue(riders, key, entry.values[key]);
        }
        next.push({ ...outcome, probability, damage: outcome.damage + total,
          irrecoverableDamage: outcome.irrecoverableDamage + total, riders });
      }
    }
    outcomes = next;
  } else {
    if (p.stoningFail > 0) {
      addDamage(calcFigureKillDmgDist(atkFigs, p.stoningFail, p.targetHP),
        'irrecoverableDamage', 'stoningTouch');
    }
    if (p.dispelEvilFail > 0) {
      addDamage(calcFigureKillDmgDist(atkFigs, p.dispelEvilFail, p.targetHP),
        'irrecoverableDamage', 'dispelEvil');
    }
    if (p.exorciseFail > 0) {
      addDamage(calcFigureKillDmgDist(atkFigs, p.exorciseFail, p.targetHP),
        'irrecoverableDamage', 'exorcise');
    }
  }
  if (p.deathTouchFail > 0) {
    addDamage(calcFigureKillDmgDist(atkFigs, p.deathTouchFail, p.targetHP),
      'normalDamage', 'deathTouch');
  }
  if (p.lifeStealMod != null) {
    const next = [];
    for (const outcome of outcomes) {
      const healPaths = dosCombatHealing
        ? calcDosLifeStealHealOutcomes(atkFigs, p.lifeStealRes, p.lifeStealMod,
          outcome.state)
        : calcLifeStealCombatHealOutcomes(atkFigs, p.lifeStealRes, p.lifeStealMod,
          outcome.state);
      for (const heal of healPaths) {
        const probability = outcome.probability * heal.probability;
        if (probability < 1e-15) continue;
        next.push({ ...outcome, probability, state: heal.state,
          damage: outcome.damage + heal.rawDrain,
          undeadDamage: outcome.undeadDamage + heal.rawDrain,
          rawDrain: outcome.rawDrain + heal.rawDrain,
          healedDamage: outcome.healedDamage + heal.healedDamage,
          bonusHpGain: outcome.bonusHpGain + heal.bonusHpGain,
          bonusHpBenefit: outcome.bonusHpBenefit + heal.bonusHpBenefit,
          riders: addRiderValue(outcome.riders, 'lifeSteal', heal.rawDrain),
          sourceRiders: addRiderValue(outcome.sourceRiders, 'lifeStealHeal',
            heal.healedDamage + heal.bonusHpBenefit) });
      }
    }
    outcomes = next;
  }
  addDamage(p.immDist, 'normalDamage', 'immolation');

  if (bloodsucker) {
    outcomes = outcomes.map(outcome => {
      if (outcome.damage <= 0) return outcome;
      const healed = outcome.state
        ? combatHealTransition(outcome.state, bloodsucker.healing, false, true)
        : { state: null, healedDamage: 0 };
      return { ...outcome, state: healed.state,
        damage: outcome.damage + bloodsucker.damage,
        normalDamage: outcome.normalDamage + bloodsucker.damage,
        healedDamage: outcome.healedDamage + healed.healedDamage,
        bloodsuckerHealed: outcome.bloodsuckerHealed + healed.healedDamage,
        riders: addRiderValue(outcome.riders, 'bloodsucker', bloodsucker.damage),
        sourceRiders: addRiderValue(outcome.sourceRiders, 'bloodsuckerHeal',
          healed.healedDamage) };
    });
  }
  return collapseTouchOutcomes(outcomes, p.lifeStealMod != null, present);
}

// The keys a phase row draws, in engine order, from the presence map `convolveTouchAttacks`
// built. Presence is emitted separately from value, so an omitted rider reads as "this matchup
// does not have it" rather than as "it rolled zero".
function ridersPresentList(present) {
  if (!present) return [];
  return TOUCH_RIDER_KEYS.filter(key => present[key]);
}

function sourceRidersPresentList(present) {
  if (!present) return [];
  const keys = [];
  if (present.lifeSteal) keys.push('lifeStealHeal');
  if (present.bloodsucker) keys.push('bloodsuckerHeal');
  return keys;
}

// The rider marginals of a standalone `convolveTouchAttacks` result — the ranged volley, which
// resolves without a joint. Same read as the joint traversal makes, over the same accumulators.
function outcomeRiderDists(outcomes, present, field) {
  const dists = {};
  for (const key of present) {
    const dist = [0];
    for (const outcome of outcomes) {
      const riders = outcome[field];
      addDistProbability(dist, riders ? (riders[key] || 0) : 0, outcome.probability);
    }
    dists[key] = dist;
  }
  return { present, dists };
}

function touchOutcomeRiders(result) {
  return {
    targetRiders: outcomeRiderDists(result.outcomes, result.ridersPresent || [], 'riders'),
    sourceRiders: outcomeRiderDists(result.outcomes, result.sourceRidersPresent || [],
      'sourceRiders'),
  };
}

function unionRidersPresent(first, second) {
  const seen = new Set([...(first || []), ...(second || [])]);
  return TOUCH_RIDER_KEYS.filter(key => seen.has(key));
}

function unionSourceRidersPresent(first, second) {
  const seen = new Set([...(first || []), ...(second || [])]);
  return SOURCE_RIDER_KEYS.filter(key => seen.has(key));
}

// Merge two outcomes' rider accumulators. Both sides carry the same key set when they came from
// the same spec; the union is what a sequence of differently-gated calls needs.
function mergeRiderMaps(first, second) {
  if (!first) return second || {};
  if (!second) return first;
  const merged = { ...first };
  for (const key of Object.keys(second)) merged[key] = (merged[key] || 0) + second[key];
  return merged;
}

// Every engine version runs stateful combat healing — `usesModernCombatHealing` and
// `usesDosCombatHealing` partition `ENGINE_VERSIONS` (`steps.js`) — so the Life Steal benefit is
// always the healed damage plus the bonus-HP benefit the Combatheal transition recorded.
// The damage axis is sized from the outcomes themselves: overkill is displayed, not clipped.
function collapseTouchOutcomes(outcomes, hasLifeSteal, present) {
  let maxDamage = 0;
  for (const outcome of outcomes) maxDamage = Math.max(maxDamage, outcome.damage || 0);
  const dist = new Array(maxDamage + 1).fill(0);
  for (const outcome of outcomes) dist[outcome.damage] += outcome.probability;
  const lifeStealDist = hasLifeSteal ? outcomeMetricDist(outcomes, 'rawDrain') : null;
  const healedDamageDist = outcomeMetricDist(outcomes, 'healedDamage');
  const bonusHpDist = outcomeMetricDist(outcomes, 'bonusHpGain');
  const bonusHpBenefitDist = outcomeMetricDist(outcomes, 'bonusHpBenefit');
  const bloodsuckerHealDist = outcomeMetricDist(outcomes, 'bloodsuckerHealed');
  return {
    dist, outcomes, lifeStealDist,
    ridersPresent: ridersPresentList(present),
    sourceRidersPresent: sourceRidersPresentList(present),
    rawDrainEV: expectedDamage(lifeStealDist),
    healedDamageDist, bonusHpDist, bonusHpBenefitDist, bloodsuckerHealDist,
    lifeStealEV: expectedDamage(healedDamageDist) + expectedDamage(bonusHpBenefitDist),
    bonusHpEV: expectedDamage(bonusHpDist),
    bloodsuckerHealEV: expectedDamage(bloodsuckerHealDist),
  };
}

function repeatTouchAttack(first, baseDist, atkFigs, spec) {
  const outcomes = [];
  let ridersPresent = first.ridersPresent || [];
  let sourceRidersPresent = first.sourceRidersPresent || [];
  for (const prior of first.outcomes) {
    // Callers of this helper are sequentially dealt channels, so their second ApplyAttack
    // reads the exact remaining target and revised source-healing state. Modern melee is
    // instead expanded in calcMeleeTouchOutcome, because its damage stays pending until the
    // tail `Dealdamage` calls that every `ApplyAttack` precedes (`Reference docs/Caster
    // binary/Combat.PerformAttacks.R5.2d.evidence.md`).
    const next = convolveTouchAttacks(baseDist, atkFigs,
      { ...spec, sourceState: prior.state });
    ridersPresent = unionRidersPresent(ridersPresent, next.ridersPresent);
    sourceRidersPresent = unionSourceRidersPresent(sourceRidersPresent,
      next.sourceRidersPresent);
    for (const after of next.outcomes) {
      const probability = prior.probability * after.probability;
      if (probability < 1e-15) continue;
      outcomes.push({ probability, state: after.state,
        damage: prior.damage + after.damage,
        irrecoverableDamage: prior.irrecoverableDamage + after.irrecoverableDamage,
        undeadDamage: prior.undeadDamage + after.undeadDamage,
        normalDamage: prior.normalDamage + after.normalDamage,
        rawDrain: prior.rawDrain + after.rawDrain,
        healedDamage: prior.healedDamage + after.healedDamage,
        bonusHpGain: prior.bonusHpGain + after.bonusHpGain,
        bonusHpBenefit: prior.bonusHpBenefit + after.bonusHpBenefit,
        bloodsuckerHealed: prior.bloodsuckerHealed + after.bloodsuckerHealed,
        riders: mergeRiderMaps(prior.riders, after.riders),
        sourceRiders: mergeRiderMaps(prior.sourceRiders, after.sourceRiders) });
    }
  }
  const collapsed = collapseTouchOutcomes(outcomes, spec.lifeStealMod != null, null);
  return { ...collapsed, ridersPresent, sourceRidersPresent };
}

function combineModernRepeatedTouchOutcome(prior, after, probability) {
  return {
    probability,
    state: after.state,
    damage: prior.damage + after.damage,
    irrecoverableDamage: prior.irrecoverableDamage + after.irrecoverableDamage,
    undeadDamage: prior.undeadDamage + after.undeadDamage,
    normalDamage: prior.normalDamage + after.normalDamage,
    rawDrain: prior.rawDrain + after.rawDrain,
    healedDamage: prior.healedDamage + after.healedDamage,
    bonusHpGain: prior.bonusHpGain + after.bonusHpGain,
    bonusHpBenefit: prior.bonusHpBenefit + after.bonusHpBenefit,
    bloodsuckerHealed: prior.bloodsuckerHealed + after.bloodsuckerHealed,
    riders: mergeRiderMaps(prior.riders, after.riders),
    sourceRiders: mergeRiderMaps(prior.sourceRiders, after.sourceRiders),
  };
}

function sequenceTouchApplyAttacks(steps, remHP, sourceState) {
  let paths = [{ probability: 1, state: normalizeCombatHealState(sourceState),
    damage: 0, rawDrain: 0, healedDamage: 0, bonusHpGain: 0,
    bonusHpBenefit: 0, bloodsuckerHealed: 0,
    irrecoverableDamage: 0, undeadDamage: 0, normalDamage: 0,
    riders: {}, sourceRiders: {} }];
  let ridersPresent = [];
  let sourceRidersPresent = [];
  for (const buildStep of steps) {
    const next = [];
    for (const prior of paths) {
      // The dead-target gate, not a clamp: `ApplyAttack` is not called again once the target
      // has no remaining HP, which is the engine's own zero-figure exit.
      const remaining = Math.max(0, remHP - prior.damage);
      if (remaining <= 0) {
        next.push(prior);
        continue;
      }
      const step = buildStep(remaining, healingStateAlive(prior.state));
      const result = convolveTouchAttacks(step.dist, step.atkFigs,
        { ...step.spec, sourceState: prior.state });
      ridersPresent = unionRidersPresent(ridersPresent, result.ridersPresent);
      sourceRidersPresent = unionSourceRidersPresent(sourceRidersPresent,
        result.sourceRidersPresent);
      for (const after of result.outcomes) {
        const probability = prior.probability * after.probability;
        if (probability < 1e-15) continue;
        next.push({
          probability,
          state: after.state,
          damage: prior.damage + after.damage,
          rawDrain: prior.rawDrain + after.rawDrain,
          healedDamage: prior.healedDamage + after.healedDamage,
          bonusHpGain: prior.bonusHpGain + after.bonusHpGain,
          bonusHpBenefit: prior.bonusHpBenefit + after.bonusHpBenefit,
          bloodsuckerHealed: prior.bloodsuckerHealed + after.bloodsuckerHealed,
          irrecoverableDamage: prior.irrecoverableDamage + after.irrecoverableDamage,
          undeadDamage: prior.undeadDamage + after.undeadDamage,
          normalDamage: prior.normalDamage + after.normalDamage,
          riders: mergeRiderMaps(prior.riders, after.riders),
          sourceRiders: mergeRiderMaps(prior.sourceRiders, after.sourceRiders),
        });
      }
    }
    paths = next;
  }
  const collapsed = collapseTouchOutcomes(paths, false, null);
  return { ...collapsed, ridersPresent, sourceRidersPresent };
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
                               independentFearProbability = null,
                               touchPlaced = null) {
  if (remHP <= 0 || maxFigs <= 0) return { damageDist: [1], lifeStealEV: 0 };
  const result = [0];
  let lifeStealEV = 0;
  let ridersPresent = [];
  let sourceRidersPresent = [];
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
    placed: touchPlaced,
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
      dist = calcDoomDist(k, atk);
    } else {
      dist = calcTotalDamageDist(k, atk, toHit, def, toBlock, targetHP, defInvulnBonus, blurChance, blurBuggy, defTopFigHP, minDamageFromHits);
    }
    let tOut = convolveTouchAttacks(dist, k, touchSpec);
    if (doubleStrike && !statefulDoubleStrike && k > 0 && atk > 0) {
      tOut = repeatTouchAttack(tOut, dist, k, touchSpec);
    }
    ridersPresent = unionRidersPresent(ridersPresent, tOut.ridersPresent);
    sourceRidersPresent = unionSourceRidersPresent(sourceRidersPresent,
      tOut.sourceRidersPresent);
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
    for (let d = 0; d < dist.length; d++) addDistProbability(result, d, pK * dist[d]);
  }

  if (statefulDoubleStrike) {
    const repeatedOutcomes = [];
    const repeatFearedDist = [];
    for (const prior of firstOutcomes) {
      // Both modern Hasted melee ApplyAttack calls precede all three tail Dealdamage calls
      // (`Reference docs/Caster binary/Combat.PerformAttacks.R5.2d.evidence.md`). The second
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
          dist = calcDoomDist(k, atk);
        } else {
          dist = calcTotalDamageDist(k, atk, toHit, def, toBlock, targetHP,
            defInvulnBonus, blurChance, blurBuggy, defTopFigHP,
            minDamageFromHits);
        }
        const second = convolveTouchAttacks(dist, k,
          { ...touchSpec, sourceState: prior.state });
        ridersPresent = unionRidersPresent(ridersPresent, second.ridersPresent);
        sourceRidersPresent = unionSourceRidersPresent(sourceRidersPresent,
          second.sourceRidersPresent);
        for (const after of second.outcomes) {
          const probability = prior.probability * pK * after.probability;
          if (probability < 1e-15) continue;
          repeatedOutcomes.push(combineModernRepeatedTouchOutcome(
            prior, after, probability));
        }
      }
    }
    const collapsed = collapseTouchOutcomes(repeatedOutcomes,
      lifeStealMod != null, null);
    return { ...collapsed, damageDist: collapsed.dist,
      ridersPresent, sourceRidersPresent,
      repeatFearedDist: repeatFearedDist.length ? repeatFearedDist : [1] };
  }
  return { damageDist: result, lifeStealEV, outcomes,
    ridersPresent, sourceRidersPresent };
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
