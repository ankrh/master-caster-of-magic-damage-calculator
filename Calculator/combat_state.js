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
//
// The three damage categories partition the record's total, which is why `regularDamage` is
// derived on the modern side rather than stored: `normalizeCombatHealState` already clamps
// irrecoverable to the total and undead to what is left, so the remainder is the normal
// damage `Combatheal` computes as `Totaldamage - Irrecoverabledamage - Undeaddamage`
// (`Combat.DamageHandling.pas:80,84`). The DOS record stores its own regular byte.
function combatHealingStateMetrics(state) {
  if (isDosCombatHealState(state)) {
    const normalized = normalizeDosCombatHealState(state);
    return {
      irreversibleDamage: normalized.irreversibleDamage,
      undeadDamage: normalized.undeadDamage,
      regularDamage: normalized.regularDamage,
      extraHits: normalized.extraHits,
    };
  }
  const normalized = normalizeCombatHealState(state);
  return {
    irreversibleDamage: normalized.irrecoverableDamage,
    undeadDamage: normalized.undeadDamage,
    regularDamage: Math.max(0, normalized.totalDamage
      - normalized.irrecoverableDamage - normalized.undeadDamage),
    extraHits: normalized.bonusHp,
  };
}

function initialCombatHealingStateMeans(unit) {
  return combatHealingStateMetrics(combatHealStateFromUnit(unit));
}

// `meanDamageTaken` is only read when the joint carries no healing paths, and it is booked as
// regular damage. That rests on `trackModernHealing` (`combat.js`) naming every rider that can
// write a non-normal category, which is checked by `runRiderHistogramChecks` rather than
// asserted here — a missed rider does not fail, it silently reports a partly permanent wound
// as wholly regular.
//
// One category escapes it and is a known gap rather than an oversight: Create Undead routes the
// whole ordinary attack roll into the undead bucket
// (`Combat.ApplyAttack.pas:624`, `$005B31FA`), and the calculator omits the flag entirely
// (`applyVampirismEffects`, `combat_effects.js`) on the reasoning that it moved no displayed
// number. This readout is that number, so the omission is now visible and wants a ruling.
//
// The value is the published (capped) mean, while the composition's denominator is the
// accumulated categories. The two differ only when the target starts with non-regular damage,
// which no control exposes (`CLAUDE.md`, *Deliberate deviations*), so no reachable state
// weights them against each other.
function jointCombatHealingStateMeans(joint, side, unit, meanDamageTaken = 0) {
  if (!joint.healingPaths) {
    const initial = initialCombatHealingStateMeans(unit);
    return { ...initial,
      regularDamage: initial.regularDamage + Math.max(0, meanDamageTaken) };
  }
  const means = { irreversibleDamage: 0, undeadDamage: 0, regularDamage: 0, extraHits: 0 };
  for (const row of joint) {
    for (const cell of row) {
      for (const path of cell.values()) {
        const metrics = combatHealingStateMetrics(path[side + 'State']);
        for (const key of Object.keys(means)) {
          means[key] += path.probability * metrics[key];
        }
      }
    }
  }
  return means;
}

// --- The categories as distributions ----------------------------------------------------------
//
// `jointCombatHealingStateMeans` above publishes the *means* the card's composition panel renders.
// The preset corpus asserts four of those quantities as well (F268.7), and an assertion wants a
// second moment, which a mean cannot supply — so the same per-path record is also read here as a
// distribution. The two readings are separate walks of one joint, and the preset runners pin them
// equal on every fixture (`tools/preset_evaluation.js`) rather than trusting that they agree.
//
// **`regularDamage` is one of them, and the first version of this list left it out.** The reasoning
// for leaving it out was that it is the residue of the other two against the record's total, so a
// change to it would move `undeadDamage` or `irreversibleDamage` in the same cell. That reasoning
// was checked by mutating the *other two* and never by mutating regular damage itself, and it is
// false: the DOS record **stores** its regular byte rather than deriving it, and the front-figure
// and current-figure arithmetic below consumes the full damage sum regardless — so dropping the
// regular booking in `applyOutcomeDamageToState` moves 161 fixture-sides while leaving remaining HP,
// both totals and both spreads exactly where they were (F268.7 GPT review, finding 1, reproduced).
// The four other quantities are certainly zero in an exchange that books nothing to them; regular
// damage is the bucket everything else falls into, so its default is the total rather than zero,
// and `jointCombatHealingCategoryDists` supplies that default explicitly.
const COMBAT_CATEGORY_KEYS = ['regularDamage', 'undeadDamage', 'irreversibleDamage',
  'extraHits', 'healedDamage'];

// The four whose value is certainly zero when nothing books to them. `regularDamage` is not among
// them and never takes the deterministic default alone.
const COMBAT_CATEGORY_ZERO_DEFAULT_KEYS = COMBAT_CATEGORY_KEYS.filter(
  key => key !== 'regularDamage');

// The same distribution with every outcome moved up by a fixed whole number of points. Used for the
// one quantity whose untracked default is not zero.
function shiftDistBy(dist, offset, where) {
  if (!Array.isArray(dist)) {
    throw new Error(`shiftDistBy: ${where} was handed ${JSON.stringify(dist)}, which is not the `
      + 'array a damage distribution is.');
  }
  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error(`shiftDistBy: ${where} was handed an offset of ${String(offset)}, which is not `
      + 'a whole number at or above zero.');
  }
  if (offset === 0) return dist.slice();
  const shifted = new Array(dist.length + offset).fill(0);
  for (let value = 0; value < dist.length; value++) shifted[value + offset] = dist[value];
  return shifted;
}

// Healing accumulated along a path or an outcome, validated *before* anything defaults or clamps
// it. `Math.max(0, value || 0)` was the first version and it is not a read, it is a repair: a
// negative healing amount, a `NaN` from an arithmetic slip upstream, or a string all became a
// clean 0, which the corpus then compared against an absent pair and passed (F268.7 GPT review,
// finding 3). Only a genuinely missing value defaults; anything else present and wrong halts.
function healedDamageOf(carrier, key, where) {
  const value = carrier[key];
  if (value === undefined || value === null) return 0;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`healedDamageOf: ${where} carries ${key} = ${String(value)}, which is not a `
      + 'whole number of hit points at or above zero. Healing is accumulated in whole points, so '
      + 'a fractional, negative or non-numeric one is an upstream arithmetic fault and is not '
      + 'quietly read as "healed nothing".');
  }
  return value;
}

// A quantity that is certain: the record stands where the unit entered, with probability 1. The
// values come off a normalized combat-healing record, so they are whole points; a fractional one
// means a *mean* has been handed to a function whose whole job is to say "this value is certain",
// and the run stops rather than publish a distribution over a number nobody computed.
function deterministicCombatCategoryDists(values, where) {
  const dists = {};
  for (const key of COMBAT_CATEGORY_KEYS) {
    const value = values[key] === undefined ? 0 : values[key];
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`deterministicCombatCategoryDists: ${where} states ${key} = ${String(value)}`
        + ', which is not a whole number at or above zero. A combat-healing record holds whole '
        + 'points, so a fractional one is a mean that has been mistaken for a certainty.');
    }
    const dist = new Array(value + 1).fill(0);
    dist[value] = 1;
    dists[key] = dist;
  }
  return dists;
}

function combatCategoryDistsFromWeights(weights, where) {
  const dists = {};
  for (const key of COMBAT_CATEGORY_KEYS) {
    const buckets = weights[key];
    let max = 0;
    for (const value of buckets.keys()) {
      if (!Number.isInteger(value) || value < 0) {
        throw new Error(`combatCategoryDistsFromWeights: ${where} reached ${key} = `
          + `${String(value)}, which is not a whole number at or above zero.`);
      }
      if (value > max) max = value;
    }
    const dist = new Array(max + 1).fill(0);
    for (const [value, probability] of buckets) dist[value] += probability;
    dists[key] = dist;
  }
  return dists;
}

// The four quantities over the joint, for one side. Mirrors `jointCombatHealingStateMeans`'
// traversal exactly, including its fallback: an exchange whose riders can write no non-regular
// category and do no healing carries no per-path record at all, and in that case all four stand
// certainly at the values the unit entered with — which is zero for every one of them on a card
// that exposes no non-regular starting damage (`CLAUDE.md`, *Deliberate deviations*).
// `totalDist` is the exchange's published damage distribution for this side, and it is only read
// when the joint carries no per-path record: with no rider able to book a non-regular category,
// every point of damage the side took is regular damage, standing on top of whatever regular damage
// it entered with. That is the same quantity `jointCombatHealingStateMeans` reports in the same
// case (`initial.regularDamage + meanDamageTaken`), here as a distribution rather than as its mean.
function jointCombatHealingCategoryDists(joint, side, unit, totalDist) {
  if (!joint.healingPaths) {
    const initial = initialCombatHealingStateMeans(unit);
    const dists = deterministicCombatCategoryDists(
      { ...initial, regularDamage: 0, healedDamage: 0 },
      `the exchange for side '${side}', which tracks no per-path healing record,`);
    dists.regularDamage = shiftDistBy(totalDist, initial.regularDamage,
      `the untracked regular damage for side '${side}'`);
    return dists;
  }
  const weights = {};
  for (const key of COMBAT_CATEGORY_KEYS) weights[key] = new Map();
  const add = (key, value, probability) => {
    weights[key].set(value, (weights[key].get(value) || 0) + probability);
  };
  for (const row of joint) {
    for (const cell of row) {
      for (const path of cell.values()) {
        const metrics = combatHealingStateMetrics(path[side + 'State']);
        add('regularDamage', metrics.regularDamage, path.probability);
        add('undeadDamage', metrics.undeadDamage, path.probability);
        add('irreversibleDamage', metrics.irreversibleDamage, path.probability);
        add('extraHits', metrics.extraHits, path.probability);
        add('healedDamage', healedDamageOf(path, side + 'HealedDamage',
          `a joint path for side '${side}'`), path.probability);
      }
    }
  }
  return combatCategoryDistsFromWeights(weights, `the joint for side '${side}'`);
}

// The volley's twin of the above, over the outcome list a ranged exchange resolves through instead
// of a joint. The target heals nothing here — an outcome carries the *source*'s healing — so its
// `healedDamage` is a certain zero rather than an omission.
function rangedCombatHealingCategoryDists(outcomes, sourceUnit, targetUnit) {
  const sourceWeights = {};
  const targetWeights = {};
  for (const key of COMBAT_CATEGORY_KEYS) {
    sourceWeights[key] = new Map();
    targetWeights[key] = new Map();
  }
  const sourceInitial = combatHealStateFromUnit(sourceUnit);
  const targetInitial = combatHealStateFromUnit(targetUnit);
  const add = (bucketSet, key, value, probability) => {
    bucketSet[key].set(value, (bucketSet[key].get(value) || 0) + probability);
  };
  for (const outcome of outcomes || []) {
    const probability = outcome.probability || 0;
    const sourceMetrics = combatHealingStateMetrics(outcome.state || sourceInitial);
    const targetMetrics = combatHealingStateMetrics(
      applyOutcomeDamageToState(targetInitial, outcome));
    add(sourceWeights, 'regularDamage', sourceMetrics.regularDamage, probability);
    add(sourceWeights, 'undeadDamage', sourceMetrics.undeadDamage, probability);
    add(sourceWeights, 'irreversibleDamage', sourceMetrics.irreversibleDamage, probability);
    add(sourceWeights, 'extraHits', sourceMetrics.extraHits, probability);
    add(sourceWeights, 'healedDamage',
      healedDamageOf(outcome, 'healedDamage', "a ranged volley's source outcome"), probability);
    add(targetWeights, 'regularDamage', targetMetrics.regularDamage, probability);
    add(targetWeights, 'undeadDamage', targetMetrics.undeadDamage, probability);
    add(targetWeights, 'irreversibleDamage', targetMetrics.irreversibleDamage, probability);
    add(targetWeights, 'extraHits', targetMetrics.extraHits, probability);
    add(targetWeights, 'healedDamage', 0, probability);
  }
  return {
    sourceDists: combatCategoryDistsFromWeights(sourceWeights, 'the ranged volley\'s source'),
    targetDists: combatCategoryDistsFromWeights(targetWeights, 'the ranged volley\'s target'),
  };
}

function rangedCombatHealingStateMeans(outcomes, sourceUnit, targetUnit) {
  const sourceMeans = { irreversibleDamage: 0, undeadDamage: 0, regularDamage: 0,
    extraHits: 0 };
  const targetMeans = { irreversibleDamage: 0, undeadDamage: 0, regularDamage: 0,
    extraHits: 0 };
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

// Damage is not truncated *inside* a phase — the rider accumulators, the three category
// accumulators and the healing state all carry the engine's uncapped figures, which is what makes
// per-rider attribution order-independent (`CLAUDE.md`, *Architecture*). What a phase publishes is
// capped: a phase-total histogram, and the cumulative total built from it, must not run past the
// HP the target had entering the phase, because no reader can act on damage the unit cannot take.
// So the clip lands here, on the way out, and nowhere earlier.
function shownDamage(damage, cap) {
  return Math.min(Math.max(0, damage || 0), Math.max(0, cap || 0));
}

// Fold every bin past `remHP` into `remHP` itself. Used where a total is published without
// having passed through the joint traversal that would already have clipped it.
function clipDistAtRemainingHp(dist, remHP) {
  if (!dist || dist.length - 1 <= remHP) return dist;
  const clipped = dist.slice(0, remHP + 1);
  for (let d = remHP + 1; d < dist.length; d++) clipped[remHP] += dist[d];
  return clipped;
}

function addDistProbability(dist, value, probability) {
  const index = Math.max(0, Math.trunc(Number(value) || 0));
  while (dist.length <= index) dist.push(0);
  dist[index] += probability;
}

// --- Per-rider phase marginals ---
// A rider histogram is a marginal read of the joint, never a distribution computed on its own
// and convolved back in (`CLAUDE.md`, *Input/output contract*). Each outcome path already
// carries one uncapped HP accumulator per rider (`convolveTouchAttacks`), so the marginal is
// accumulated in the same traversal, and weighted by the same probability, that the phase's
// total-damage `marginal` uses. Presence is carried separately from value: a rider the matchup
// does not place emits no key, while a placed rider that cannot land emits with all mass at 0.
function newRiderTally() {
  return { targetPresent: [], sourcePresent: [], target: new Map(), source: new Map() };
}

function addRiderMap(map, riders, probability) {
  if (!riders) return;
  for (const key of Object.keys(riders)) {
    let dist = map.get(key);
    if (!dist) { dist = [0]; map.set(key, dist); }
    addDistProbability(dist, riders[key], probability);
  }
}

// Record what one phase output places, before any of its outcomes are walked, so a rider that
// is gated on but landed with probability zero still gets a key.
function tallyRiderPresence(tally, out) {
  if (!tally || !out) return;
  tally.targetPresent = unionRidersPresent(tally.targetPresent, out.ridersPresent);
  tally.sourcePresent = unionSourceRidersPresent(tally.sourcePresent, out.sourceRidersPresent);
}

function tallyRiderOutcome(tally, outcome, probability) {
  if (!tally || !outcome) return;
  addRiderMap(tally.target, outcome.riders, probability);
  addRiderMap(tally.source, outcome.sourceRiders, probability);
}

// Walk a phase output's outcomes for their rider values alone, for the blocks that fold the
// output through its `dist` rather than through `outcomePaths`.
function tallyRiderOut(tally, out, weight) {
  if (!tally || !out) return;
  tallyRiderPresence(tally, out);
  if (!out.outcomes) return;
  for (const outcome of out.outcomes) {
    tallyRiderOutcome(tally, outcome, weight * outcome.probability);
  }
}

// INV-1: a path that skipped the phase entirely carries no rider accumulator, so its mass is
// folded in at 0 rather than dropped.
function finishRiderTally(tally) {
  const build = (present, map) => {
    const dists = {};
    for (const key of present) {
      const dist = map.get(key) || [0];
      let total = 0;
      for (const value of dist) total += value;
      if (1 - total > 1e-12) dist[0] += 1 - total;
      dists[key] = dist;
    }
    return { present, dists };
  };
  return {
    targetRiders: build(tally.targetPresent, tally.target),
    sourceRiders: build(tally.sourcePresent, tally.source),
  };
}

// One breakdown row's rider records, in engine order. `side` names the panel column the
// histogram belongs under and `quantity` its axis: `targetHp` is the shared HP axis every
// damage rider plots on, `sourceHp` is the separate axis Life Steal's healing needs
// (`CLAUDE.md`, *Input/output contract*). Figures killed is derived from `targetHp`, not
// emitted. A row is emitted per placed rider and for no other, so an absent panel means the
// matchup does not place that rider rather than that it rolled zero.
//
// `chains` is this direction's rider id -> chain records map, built by the queries that
// computed the figures the rolls used (`touchParams` / `gazeKillProbs` / `buildDefenseContext`,
// `combat_phases.js`). It is attached rather than looked up later so the histogram and its
// explanation come out of one traversal; a direction whose caller asked for no chains leaves
// the field absent on every row.
function phaseRiderRows(riders, targetSide, sourceSide, chains = null) {
  if (!riders) return [];
  const rows = [];
  // Every chain on this row is about the same unit: the one the rolls are made against and
  // the one whose Defense the attack is scored against, which is this direction's target. That
  // is `side` for most riders but not for Life Steal's healing, whose histogram is plotted on
  // the source, so the subject is stated rather than inferred from the panel column.
  const withChain = row => {
    const record = chains && chains[row.key];
    return record && record.length
      ? { ...row, chains: record, chainSubject: targetSide } : row;
  };
  for (const key of riders.targetRiders.present) {
    rows.push(withChain({ key, side: targetSide, quantity: 'targetHp',
      dist: riders.targetRiders.dists[key] }));
  }
  for (const key of riders.sourceRiders.present) {
    rows.push(withChain({ key, side: sourceSide, quantity: 'sourceHp',
      dist: riders.sourceRiders.dists[key] }));
  }
  return rows;
}

function applyDamagePhaseWithHealing(joint, phase, pendingFear, units, targetTotalRemHP) {
  const newJoint = emptyJointLike(joint);
  const marginal = [0];
  const riderTally = newRiderTally();
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
        tallyRiderPresence(riderTally, out);
        for (const outcome of outcomePaths(out, sourceState)) {
          const probability = path.probability * outcome.probability;
          if (probability < 1e-15) continue;
          tallyRiderOutcome(riderTally, outcome, probability);
          const shown = shownDamage(outcome.damage, cap);
          let nextPath = applyOutcomeToHealingPath(path, phase.source, outcome);
          nextPath = { ...nextPath, probability,
            [phase.target + 'DamageTaken']:
              nextPath[phase.target + 'DamageTaken'] + shown,
            [phase.target + 'State']: applyOutcomeDamageToState(
              nextPath[phase.target + 'State'], outcome) };
          const newTargetCum = Math.min(targetCum + shown, targetTotalRemHP);
          const newCumA = phase.target === 'a' ? newTargetCum : cumA;
          const newCumB = phase.target === 'b' ? newTargetCum : cumB;
          addHealingPath(newJoint[newCumA][newCumB], nextPath);
          addDistProbability(marginal, shown, probability);
          lifeStealEV += probability
            * ((outcome.healedDamage || 0) + (outcome.bonusHpBenefit || 0));
        }
      }
    }
  }
  return { joint: newJoint, marginal, lifeStealEV, ...finishRiderTally(riderTally) };
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
  const marginal = [0];
  const riderTally = newRiderTally();
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
      tallyRiderOut(riderTally, out, p);
      const dist = out.dist;
      for (let d = 0; d < dist.length; d++) {
        const pp = p * dist[d];
        if (pp < 1e-15) continue;
        const shown = shownDamage(d, cap);
        const newTargetCum = Math.min(targetCum + shown, targetTotalRemHP);
        if (phase.target === 'a') newJoint[newTargetCum][cumB] += pp;
        else newJoint[cumA][newTargetCum] += pp;
        addDistProbability(marginal, shown, pp);
      }
      lifeStealEV += p * (out.lifeStealEV || 0);
    }
  }
  return { joint: newJoint, marginal, lifeStealEV, ...finishRiderTally(riderTally) };
}

// Apply a simultaneous pair of damage phases (counter B→A, 2nd-strike A→B) reading
// from a frozen snapshot of the input joint. Both sub-phase outputs are folded into
// one new joint so neither phase sees the other's update on the source dimension.
function applySimultaneousPairWithHealing(joint, subA, subB, pendingFear, units,
                                          aTotalRemHP, bTotalRemHP) {
  const newJoint = emptyJointLike(joint);
  const marginalA = [0];
  const marginalB = [0];
  const riderTallyA = newRiderTally();
  const riderTallyB = newRiderTally();
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
        tallyRiderPresence(riderTallyB, outB);
        for (const outcomeB of outcomePaths(outB, path.aState)) {
          if (outcomeB.probability < 1e-15) continue;
          tallyRiderOutcome(riderTallyB, outcomeB,
            path.probability * outcomeB.probability);
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
            tallyRiderPresence(riderTallyA, outA);
            for (const outcomeA of outcomePaths(outA, path.bState)) {
              const probability = path.probability
                * outcomeB.probability * outcomeA.probability;
              if (probability < 1e-15) continue;
              tallyRiderOutcome(riderTallyA, outcomeA, probability);
              const shownA = shownDamage(outcomeA.damage, capA);
              const shownB = shownDamage(outcomeB.damage, capB);
              let nextPath = applyOutcomeToHealingPath(path, 'a', outcomeB);
              nextPath = applyOutcomeToHealingPath(nextPath, 'b', outcomeA);
              nextPath = {
                ...nextPath,
                probability,
                aDamageTaken: nextPath.aDamageTaken + shownA,
                bDamageTaken: nextPath.bDamageTaken + shownB,
                aState: applyOutcomeDamageToState(nextPath.aState, outcomeA),
                bState: applyOutcomeDamageToState(nextPath.bState, outcomeB),
              };
              const newCumA = Math.min(cumA + shownA, aTotalRemHP);
              const newCumB = Math.min(cumB + shownB, bTotalRemHP);
              addHealingPath(newJoint[newCumA][newCumB], nextPath);
              addDistProbability(marginalA, shownA, probability);
              addDistProbability(marginalB, shownB, probability);
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
          tallyRiderPresence(riderTallyA, outA);
          for (const outcomeA of outcomePaths(outA, path.bState)) {
            const probability = path.probability
              * outcomeB.probability * outcomeA.probability;
            if (probability < 1e-15) continue;
            tallyRiderOutcome(riderTallyA, outcomeA, probability);
            const shownA = shownDamage(outcomeA.damage, capA);
            const shownB = shownDamage(outcomeB.damage, capB);
            let nextPath = applyOutcomeToHealingPath(path, 'a', outcomeB);
            nextPath = applyOutcomeToHealingPath(nextPath, 'b', outcomeA);
            nextPath = {
              ...nextPath,
              probability,
              aDamageTaken: nextPath.aDamageTaken + shownA,
              bDamageTaken: nextPath.bDamageTaken + shownB,
              aState: applyOutcomeDamageToState(nextPath.aState, outcomeA),
              bState: applyOutcomeDamageToState(nextPath.bState, outcomeB),
            };
            const newCumA = Math.min(cumA + shownA, aTotalRemHP);
            const newCumB = Math.min(cumB + shownB, bTotalRemHP);
            addHealingPath(newJoint[newCumA][newCumB], nextPath);
            addDistProbability(marginalA, shownA, probability);
            addDistProbability(marginalB, shownB, probability);
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
    fearSamplesA, fearSamplesB,
    ridersA: finishRiderTally(riderTallyA), ridersB: finishRiderTally(riderTallyB) };
}

function applySimultaneousPair(joint, subA, subB, pendingFear, units, aTotalRemHP, bTotalRemHP) {
  if (joint.healingPaths) {
    return applySimultaneousPairWithHealing(joint, subA, subB, pendingFear, units,
      aTotalRemHP, bTotalRemHP);
  }
  const newJoint = emptyJointLike(joint);
  const marginalA = [0];   // damage to A this phase
  const marginalB = [0];   // damage to B this phase
  const riderTallyA = newRiderTally();
  const riderTallyB = newRiderTally();
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
      tallyRiderOut(riderTallyA, outA, p);
      tallyRiderOut(riderTallyB, outB, p);
      lifeStealEV_a += p * (subA.source === 'a' ? (outA.lifeStealEV || 0) : 0)
                    +  p * (subB.source === 'a' ? (outB.lifeStealEV || 0) : 0);
      lifeStealEV_b += p * (subA.source === 'b' ? (outA.lifeStealEV || 0) : 0)
                    +  p * (subB.source === 'b' ? (outB.lifeStealEV || 0) : 0);
      for (let dA = 0; dA < outA.dist.length; dA++) {
        const ppA = outA.dist[dA];
        if (ppA < 1e-15) continue;
        const shownA = shownDamage(dA, capA);
        const newCumA = Math.min(cumA + shownA, aTotalRemHP);
        for (let dB = 0; dB < outB.dist.length; dB++) {
          const ppB = outB.dist[dB];
          if (ppB < 1e-15) continue;
          const newCumB = Math.min(cumB + shownDamage(dB, capB), bTotalRemHP);
          newJoint[newCumA][newCumB] += p * ppA * ppB;
        }
        addDistProbability(marginalA, shownA, p * ppA);
      }
      for (let dB = 0; dB < outB.dist.length; dB++) {
        addDistProbability(marginalB, shownDamage(dB, capB), p * outB.dist[dB]);
      }
    }
  }
  return { joint: newJoint, marginalA, marginalB, lifeStealEV_a, lifeStealEV_b,
    fearSamplesA, fearSamplesB,
    ridersA: finishRiderTally(riderTallyA), ridersB: finishRiderTally(riderTallyB) };
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
      fsRiders: { targetRiders: fs.targetRiders, sourceRiders: fs.sourceRiders },
      counterRiders: {
        targetRiders: counter.targetRiders, sourceRiders: counter.sourceRiders },
    };
  }

  const newJoint = emptyJointLike(joint);
  const postFsJoint = emptyJointLike(joint);
  const fsMarginal = [0];
  const counterMarginal = [0];
  const fsTally = newRiderTally();
  const counterTally = newRiderTally();
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
          tallyRiderPresence(fsTally, fsOut);
          for (const fsOutcome of outcomePaths(fsOut, path.aState)) {
            const pFs = path.probability * fsOutcome.probability;
            if (pFs < 1e-15) continue;
            tallyRiderOutcome(fsTally, fsOutcome, pFs);
            let postFsPath = applyOutcomeToHealingPath(path, 'a', fsOutcome);
            postFsPath = { ...postFsPath, probability: pFs,
              bDamageTaken: postFsPath.bDamageTaken + shownDamage(fsOutcome.damage, capB),
              bState: applyOutcomeDamageToState(postFsPath.bState, fsOutcome) };
            const newCumB = Math.min(cumB + shownDamage(fsOutcome.damage, capB), ctx.bRemHP);
            addHealingPath(postFsJoint[cumA][newCumB], postFsPath);
            addDistProbability(fsMarginal, shownDamage(fsOutcome.damage, capB), pFs);
            lifeStealEV_a += pFs
              * ((fsOutcome.healedDamage || 0) + (fsOutcome.bonusHpBenefit || 0));

            const bAliveAfterFs = healingStateAlive(postFsPath.bState);
            // A's own First Strike may have healed it (Life Steal, Bloodsucker), and the
            // counter lands after that heal — `Combatheal` runs inside the strike's own
            // `ApplyAttack` (`Combat.ApplyAttack.pas:511`; DOS `combat.c:4672`, before the
            // counter call at `:3992`). So the counter reads the revised capacity, the way
            // `applySimultaneousPairWithHealing` reads its counter target's revised state.
            const capAAfterFs = healingStateRemainingHp(postFsPath.aState);
            const aAliveAfterFs = healingStateAlive(postFsPath.aState);
            const counterOut = capAAfterFs > 0 && bAliveAfterFs > 0
              ? computes.counter(bAliveAfterFs, aAliveAfterFs, capAAfterFs, null,
                { sourceState: postFsPath.bState })
              : { dist: [1], lifeStealEV: 0 };
            tallyRiderPresence(counterTally, counterOut);
            for (const counterOutcome of outcomePaths(counterOut, postFsPath.bState)) {
              const probability = pFs * counterOutcome.probability;
              if (probability < 1e-15) continue;
              tallyRiderOutcome(counterTally, counterOutcome, probability);
              let finalPath = applyOutcomeToHealingPath(postFsPath, 'b', counterOutcome);
              finalPath = { ...finalPath, probability,
                aDamageTaken: finalPath.aDamageTaken
                  + shownDamage(counterOutcome.damage, capAAfterFs),
                aState: applyOutcomeDamageToState(finalPath.aState, counterOutcome) };
              addHealingPath(
                newJoint[Math.min(cumA + shownDamage(counterOutcome.damage, capAAfterFs),
                  ctx.aRemHP)][newCumB],
                finalPath,
              );
              addDistProbability(counterMarginal,
                shownDamage(counterOutcome.damage, capAAfterFs), probability);
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
        tallyRiderPresence(fsTally, mainOut);
        tallyRiderPresence(counterTally, counterOut);
        for (const mainOutcome of outcomePaths(mainOut, path.aState)) {
          if (mainOutcome.probability < 1e-15) continue;
          tallyRiderOutcome(fsTally, mainOutcome,
            path.probability * mainOutcome.probability);
          for (const counterOutcome of outcomePaths(counterOut, path.bState)) {
            const probability = path.probability * mainOutcome.probability
              * counterOutcome.probability;
            if (probability < 1e-15) continue;
            tallyRiderOutcome(counterTally, counterOutcome, probability);
            let finalPath = applyOutcomeToHealingPath(path, 'a', mainOutcome);
            finalPath = applyOutcomeToHealingPath(finalPath, 'b', counterOutcome);
            finalPath = { ...finalPath, probability,
              aDamageTaken: finalPath.aDamageTaken + shownDamage(counterOutcome.damage, capA),
              bDamageTaken: finalPath.bDamageTaken + shownDamage(mainOutcome.damage, capB),
              aState: applyOutcomeDamageToState(finalPath.aState, counterOutcome),
              bState: applyOutcomeDamageToState(finalPath.bState, mainOutcome) };
            addHealingPath(
              newJoint[Math.min(cumA + shownDamage(counterOutcome.damage, capA), ctx.aRemHP)]
                [Math.min(cumB + shownDamage(mainOutcome.damage, capB), ctx.bRemHP)],
              finalPath,
            );
            addDistProbability(fsMarginal, shownDamage(mainOutcome.damage, capB), probability);
            addDistProbability(counterMarginal, shownDamage(counterOutcome.damage, capA), probability);
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
    lifeStealEV_a, lifeStealEV_b,
    fsRiders: finishRiderTally(fsTally), counterRiders: finishRiderTally(counterTally) };
}

function applyFsBlockNoHaste(joint, computes, ctx) {
  if (joint.healingPaths) return applyFsBlockNoHasteWithHealing(joint, computes, ctx);
  const newJoint = emptyJointLike(joint);
  const postFsJoint = emptyJointLike(joint);
  const fsMarginal = [0];
  const counterMarginal = [0];
  const fsTally = newRiderTally();
  const counterTally = newRiderTally();
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
        tallyRiderOut(fsTally, fsOut, p);
        for (let fsDmg = 0; fsDmg < fsOut.dist.length; fsDmg++) {
          const pFs = fsOut.dist[fsDmg];
          if (pFs < 1e-15) continue;
          const newCumB = Math.min(cumB + shownDamage(fsDmg, capB), ctx.bRemHP);
          const bAliveAfterFS = aliveCount(ctx.b, newCumB);
          addDistProbability(fsMarginal, shownDamage(fsDmg, capB), p * pFs);
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
          tallyRiderOut(counterTally, counterOut, p * pFs);
          for (let cDmg = 0; cDmg < counterOut.dist.length; cDmg++) {
            const pC = counterOut.dist[cDmg];
            if (pC < 1e-15) continue;
            const newCumA = Math.min(cumA + shownDamage(cDmg, capA), ctx.aRemHP);
            newJoint[newCumA][newCumB] += p * pFs * pC;
            addDistProbability(counterMarginal, shownDamage(cDmg, capA), p * pFs * pC);
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
        tallyRiderOut(fsTally, mOut, p);
        tallyRiderOut(counterTally, cOut, p);
        for (let m = 0; m < mOut.dist.length; m++) {
          const pM = mOut.dist[m];
          if (pM < 1e-15) continue;
          addDistProbability(fsMarginal, shownDamage(m, capB), p * pM);
          for (let c = 0; c < cOut.dist.length; c++) {
            const pCv = cOut.dist[c];
            if (pCv < 1e-15) continue;
            newJoint[Math.min(cumA + shownDamage(c, capA), ctx.aRemHP)][Math.min(cumB + shownDamage(m, capB), ctx.bRemHP)] += p * pM * pCv;
          }
        }
        for (let c = 0; c < cOut.dist.length; c++) {
          const pCv = cOut.dist[c];
          if (pCv < 1e-15) continue;
          addDistProbability(counterMarginal, shownDamage(c, capA), p * pCv);
        }
        lifeStealEV_a += p * mOut.lifeStealEV;
        lifeStealEV_b += p * cOut.lifeStealEV;
      }
    }
  }
  return { joint: newJoint, postFsJoint, fsMarginal, counterMarginal, lifeStealEV_a, lifeStealEV_b,
    fsRiders: finishRiderTally(fsTally), counterRiders: finishRiderTally(counterTally) };
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
  const fsMarginal = [0];
  const secondMarginal = [0];
  const counterMarginal = [0];
  const fsTally = newRiderTally();
  const secondTally = newRiderTally();
  const counterTally = newRiderTally();
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
          tallyRiderPresence(fsTally, mainOut);
          tallyRiderPresence(counterTally, counterOut);
          for (const mainOutcome of outcomePaths(mainOut, path.aState)) {
            if (mainOutcome.probability < 1e-15) continue;
            tallyRiderOutcome(fsTally, mainOutcome,
              path.probability * mainOutcome.probability);
            for (const counterOutcome of outcomePaths(counterOut, path.bState)) {
              const probability = path.probability * mainOutcome.probability
                * counterOutcome.probability;
              if (probability < 1e-15) continue;
              tallyRiderOutcome(counterTally, counterOutcome, probability);
              let finalPath = applyOutcomeToHealingPath(path, 'a', mainOutcome);
              finalPath = applyOutcomeToHealingPath(finalPath, 'b', counterOutcome);
              finalPath = {
                ...finalPath,
                probability,
                aDamageTaken: finalPath.aDamageTaken + shownDamage(counterOutcome.damage, capA),
                bDamageTaken: finalPath.bDamageTaken + shownDamage(mainOutcome.damage, capB),
                aState: applyOutcomeDamageToState(finalPath.aState, counterOutcome),
                bState: applyOutcomeDamageToState(finalPath.bState, mainOutcome),
              };
              addHealingPath(
                newJoint[Math.min(cumA + shownDamage(counterOutcome.damage, capA), ctx.aRemHP)]
                  [Math.min(cumB + shownDamage(mainOutcome.damage, capB), ctx.bRemHP)],
                finalPath,
              );
              addDistProbability(fsMarginal, shownDamage(mainOutcome.damage, capB), probability);
              addDistProbability(secondMarginal, 0, probability);
              addDistProbability(counterMarginal, shownDamage(counterOutcome.damage, capA), probability);
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
          tallyRiderPresence(fsTally, fsOut);
          for (const fsOutcome of outcomePaths(fsOut, path.aState)) {
            const pFs = path.probability * pK * fsOutcome.probability;
            if (pFs < 1e-15) continue;
            tallyRiderOutcome(fsTally, fsOutcome, pFs);
            let postFsPath = applyOutcomeToHealingPath(path, 'a', fsOutcome);
            postFsPath = { ...postFsPath, probability: pFs,
              bDamageTaken: postFsPath.bDamageTaken + shownDamage(fsOutcome.damage, capB),
              bState: applyOutcomeDamageToState(postFsPath.bState, fsOutcome) };
            const newCumB = Math.min(cumB + shownDamage(fsOutcome.damage, capB), ctx.bRemHP);
            addHealingPath(postFsJoint[cumA][newCumB], postFsPath);
            addDistProbability(fsMarginal, shownDamage(fsOutcome.damage, capB), pFs);
            lifeStealEV_a += pFs
              * ((fsOutcome.healedDamage || 0) + (fsOutcome.bonusHpBenefit || 0));

            const bAliveAfterFs = healingStateAlive(postFsPath.bState);
            const capBAfterFs = healingStateRemainingHp(postFsPath.bState);
            // As above: the strike's own heal lands before the counter, so A's capacity here
            // is the revised one, not the one it entered the block with.
            const capAAfterFs = healingStateRemainingHp(postFsPath.aState);
            const aAliveAfterFs = healingStateAlive(postFsPath.aState);
            const counterOut = capAAfterFs > 0 && bAliveAfterFs > 0
              ? computes.counter(bAliveAfterFs, aAliveAfterFs, capAAfterFs, null,
                { sourceState: postFsPath.bState })
              : { dist: [1], lifeStealEV: 0 };
            const secondOut = k > 0 && capBAfterFs > 0
              ? computes.aStrikeNoFear(k, bAliveAfterFs, capBAfterFs, null,
                { sourceState: postFsPath.aState })
              : { dist: [1], lifeStealEV: 0 };
            tallyRiderPresence(counterTally, counterOut);
            tallyRiderPresence(secondTally, secondOut);
            for (const counterOutcome of outcomePaths(counterOut, postFsPath.bState)) {
              if (counterOutcome.probability < 1e-15) continue;
              tallyRiderOutcome(counterTally, counterOutcome,
                pFs * counterOutcome.probability);
              for (const secondOutcome of outcomePaths(secondOut, postFsPath.aState)) {
                const probability = pFs * counterOutcome.probability
                  * secondOutcome.probability;
                if (probability < 1e-15) continue;
                tallyRiderOutcome(secondTally, secondOutcome, probability);
                let finalPath = applyOutcomeToHealingPath(postFsPath, 'b', counterOutcome);
                finalPath = applyOutcomeToHealingPath(finalPath, 'a', secondOutcome);
                finalPath = {
                  ...finalPath,
                  probability,
                  aDamageTaken: finalPath.aDamageTaken
                    + shownDamage(counterOutcome.damage, capAAfterFs),
                  bDamageTaken: finalPath.bDamageTaken
                    + shownDamage(secondOutcome.damage, capBAfterFs),
                  aState: applyOutcomeDamageToState(finalPath.aState, counterOutcome),
                  bState: applyOutcomeDamageToState(finalPath.bState, secondOutcome),
                };
                const newCumA = Math.min(
                  cumA + shownDamage(counterOutcome.damage, capAAfterFs), ctx.aRemHP);
                const finalCumB = Math.min(
                  newCumB + shownDamage(secondOutcome.damage, capBAfterFs), ctx.bRemHP);
                addHealingPath(newJoint[newCumA][finalCumB], finalPath);
                addDistProbability(counterMarginal,
                  shownDamage(counterOutcome.damage, capAAfterFs), probability);
                addDistProbability(secondMarginal, shownDamage(secondOutcome.damage, capBAfterFs), probability);
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
    counterMarginal, lifeStealEV_a, lifeStealEV_b,
    fsRiders: finishRiderTally(fsTally),
    secondRiders: finishRiderTally(secondTally),
    counterRiders: finishRiderTally(counterTally) };
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
    fsRiders: { targetRiders: fs.targetRiders, sourceRiders: fs.sourceRiders },
    secondRiders: pair.ridersB,
    counterRiders: pair.ridersA,
  };
}

function applyFsBlockHaste(joint, computes, ctx) {
  if (joint.healingPaths) return applyFsBlockHasteWithHealing(joint, computes, ctx);
  const newJoint = emptyJointLike(joint);
  const postFsJoint = emptyJointLike(joint);
  const fsMarginal = [0];
  const secondMarginal = [0];
  const counterMarginal = [0];
  const fsTally = newRiderTally();
  const secondTally = newRiderTally();
  const counterTally = newRiderTally();
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
            tallyRiderOut(fsTally, fsOut, p * pK);
            const fsPaths = fsOut.outcomes || fsOut.dist.map((probability, damage) => (
              { probability, damage, state: combatHealStateFromUnit(ctx.a, cumA) }));
            for (const fsPath of fsPaths) {
              const fsDmg = fsPath.damage;
              const pFs = fsPath.probability;
              if (pFs < 1e-15) continue;
              const newCumB = Math.min(cumB + shownDamage(fsDmg, capB), ctx.bRemHP);
              const bAliveAfterFS = aliveCount(ctx.b, newCumB);
              const capBAfterFS = ctx.bRemHP - newCumB;
              addDistProbability(fsMarginal, shownDamage(fsDmg, capB), p * pK * pFs);
              postFsJoint[cumA][newCumB] += p * pK * pFs;
              const counterOut = (capA > 0 && bAliveAfterFS > 0)
                ? computes.counter(bAliveAfterFS, aAliveL, capA, null,
                  { sourceState: combatHealStateFromUnit(ctx.b, newCumB) })
                : { dist: [1], lifeStealEV: 0 };
              const secondOut = (k_a > 0 && capBAfterFS > 0)
                ? computes.aStrikeNoFear(k_a, bAliveAfterFS, capBAfterFS, null,
                  { sourceState: fsPath.state })
                : { dist: [1], lifeStealEV: 0 };
              tallyRiderOut(counterTally, counterOut, p * pK * pFs);
              tallyRiderOut(secondTally, secondOut, p * pK * pFs);
              for (let cDmg = 0; cDmg < counterOut.dist.length; cDmg++) {
                const pC = counterOut.dist[cDmg];
                if (pC < 1e-15) continue;
                const newCumA = Math.min(cumA + shownDamage(cDmg, capA), ctx.aRemHP);
                addDistProbability(counterMarginal, shownDamage(cDmg, capA), p * pK * pFs * pC);
                for (let sDmg = 0; sDmg < secondOut.dist.length; sDmg++) {
                  const pS = secondOut.dist[sDmg];
                  if (pS < 1e-15) continue;
                  const newCumBFinal = Math.min(newCumB + shownDamage(sDmg, capBAfterFS),
                  ctx.bRemHP);
                  newJoint[newCumA][newCumBFinal] += p * pK * pFs * pC * pS;
                }
              }
              for (let sDmg = 0; sDmg < secondOut.dist.length; sDmg++) {
                addDistProbability(secondMarginal, shownDamage(sDmg, capBAfterFS),
                  p * pK * pFs * secondOut.dist[sDmg]);
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
          tallyRiderOut(fsTally, fsOut, p);
          const fsPaths = fsOut.outcomes || fsOut.dist.map((probability, damage) => (
            { probability, damage, state: combatHealStateFromUnit(ctx.a, cumA) }));
          for (const fsPath of fsPaths) {
            const fsDmg = fsPath.damage;
            const pFs = fsPath.probability;
            if (pFs < 1e-15) continue;
            const newCumB = Math.min(cumB + shownDamage(fsDmg, capB), ctx.bRemHP);
            const bAliveAfterFS = aliveCount(ctx.b, newCumB);
            const capBAfterFS = ctx.bRemHP - newCumB;
            addDistProbability(fsMarginal, shownDamage(fsDmg, capB), p * pFs);
            postFsJoint[cumA][newCumB] += p * pFs;
            const counterOut = (capA > 0 && bAliveAfterFS > 0)
              ? computes.counter(bAliveAfterFS, aAliveL, capA, null,
                { sourceState: combatHealStateFromUnit(ctx.b, newCumB) })
              : { dist: [1], lifeStealEV: 0 };
            const secondOut = (aAliveL > 0 && capBAfterFS > 0)
              ? computes.secondStrike(aAliveL, bAliveAfterFS, capBAfterFS, null,
                { sourceState: fsPath.state })
              : { dist: [1], lifeStealEV: 0 };
            tallyRiderOut(counterTally, counterOut, p * pFs);
            tallyRiderOut(secondTally, secondOut, p * pFs);
            for (let cDmg = 0; cDmg < counterOut.dist.length; cDmg++) {
              const pC = counterOut.dist[cDmg];
              if (pC < 1e-15) continue;
              const newCumA = Math.min(cumA + shownDamage(cDmg, capA), ctx.aRemHP);
              addDistProbability(counterMarginal, shownDamage(cDmg, capA), p * pFs * pC);
              for (let sDmg = 0; sDmg < secondOut.dist.length; sDmg++) {
                const pS = secondOut.dist[sDmg];
                if (pS < 1e-15) continue;
                const newCumBFinal = Math.min(newCumB + shownDamage(sDmg, capBAfterFS),
                  ctx.bRemHP);
                newJoint[newCumA][newCumBFinal] += p * pFs * pC * pS;
              }
            }
            for (let sDmg = 0; sDmg < secondOut.dist.length; sDmg++) {
              addDistProbability(secondMarginal, shownDamage(sDmg, capBAfterFS), p * pFs * secondOut.dist[sDmg]);
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
        // The Haste repeat does not happen on this arm, but its mass still belongs to the
        // row it publishes: folded in at damage 0 so `secondMarginal` stays a proper PMF
        // (INV-1), the same way the healing arm does and the way a phase folds in a cell
        // whose target is already dead.
        addDistProbability(secondMarginal, 0, p);
        tallyRiderOut(fsTally, mOut, p);
        tallyRiderOut(counterTally, cOut, p);
        for (let m = 0; m < mOut.dist.length; m++) {
          const pM = mOut.dist[m];
          if (pM < 1e-15) continue;
          addDistProbability(fsMarginal, shownDamage(m, capB), p * pM);
          for (let c = 0; c < cOut.dist.length; c++) {
            const pCv = cOut.dist[c];
            if (pCv < 1e-15) continue;
            newJoint[Math.min(cumA + shownDamage(c, capA), ctx.aRemHP)][Math.min(cumB + shownDamage(m, capB), ctx.bRemHP)] += p * pM * pCv;
          }
        }
        for (let c = 0; c < cOut.dist.length; c++) {
          addDistProbability(counterMarginal, shownDamage(c, capA), p * cOut.dist[c]);
        }
        lifeStealEV_a += p * mOut.lifeStealEV;
        lifeStealEV_b += p * cOut.lifeStealEV;
      }
    }
  }
  return { joint: newJoint, postFsJoint, fsMarginal, secondMarginal, counterMarginal, lifeStealEV_a, lifeStealEV_b,
    fsRiders: finishRiderTally(fsTally),
    secondRiders: finishRiderTally(secondTally),
    counterRiders: finishRiderTally(counterTally) };
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
