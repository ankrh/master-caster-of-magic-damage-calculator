// --- Probability Engine ---
// Pure math functions with no DOM dependencies.

function binomCoeff(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 0; i < k; i++) result = result * (n - i) / (i + 1);
  return result;
}

function binomialPMF(n, p) {
  const pmf = new Array(n + 1);
  for (let k = 0; k <= n; k++)
    pmf[k] = binomCoeff(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
  return pmf;
}

// Build the exact block-count PMF for one defense roll. Most engines roll every
// defense die at the same chance. Caster.exe profiles instead carry the shipped
// post-cap rule: dice after capDice use cappedChance.
function defenseBlockPMF(defStr, toBlock) {
  const probability = chance => Math.min(1, Math.max(0, Number(chance) || 0));
  if (!toBlock || typeof toBlock !== 'object') return binomialPMF(defStr, probability(toBlock));
  // DefenseRoll compares Random(100) directly with To Defend. Values above 100
  // therefore block with certainty; values at or below zero never block.
  const chance = probability(toBlock.chance);
  const capDice = Math.max(0, Math.min(defStr, toBlock.capDice));
  const cappedDice = defStr - capDice;
  const ordinary = binomialPMF(capDice, chance);
  if (cappedDice <= 0) return ordinary;
  const capped = binomialPMF(cappedDice,
    Math.min(chance, probability(toBlock.cappedChance)));
  const combined = new Array(defStr + 1).fill(0);
  for (let i = 0; i < ordinary.length; i++) {
    for (let j = 0; j < capped.length; j++) {
      combined[i + j] += ordinary[i] * capped[j];
    }
  }
  return combined;
}

// Compute distribution of surviving hits after Blur filtering.
// h: number of initial hits; blurChance: probability each hit is negated (0.1 or 0.2).
// buggy (v1.31): on success, skip next roll — at most ceil(h / 2) hits are blocked.
// Returns array where dist[s] = P(exactly s hits survive).
function blurSurvivingDist(h, blurChance, buggy) {
  if (!blurChance || h === 0) {
    const d = new Array(h + 1).fill(0); d[h] = 1; return d;
  }
  if (!buggy) {
    return binomialPMF(h, 1 - blurChance);
  }
  // v1.31 bug: success skips next roll. DP on number of hits negated.
  // negated(h) = blurChance * addOne(negated(h-2)) + (1-blurChance) * negated(h-1)
  let prev2 = [1]; // negated(0)
  if (h === 1) return [blurChance, 1 - blurChance]; // [0 survive, 1 survive]
  let prev1 = [1 - blurChance, blurChance]; // negated(1)
  for (let i = 2; i <= h; i++) {
    const newF = new Array(i + 1).fill(0);
    for (let n = 0; n < prev2.length; n++) {
      if (prev2[n] < 1e-15) continue;
      newF[n + 1] += blurChance * prev2[n];
    }
    for (let n = 0; n < prev1.length; n++) {
      if (prev1[n] < 1e-15) continue;
      newF[n] += (1 - blurChance) * prev1[n];
    }
    prev2 = prev1;
    prev1 = newF;
  }
  // prev1 = negated distribution for h hits; convert to surviving
  const survivingDist = new Array(h + 1).fill(0);
  for (let neg = 0; neg < prev1.length; neg++) {
    if (prev1[neg] < 1e-15) continue;
    survivingDist[h - neg] += prev1[neg];
  }
  return survivingDist;
}

function remapDistByMinDamage(dist, minDamage) {
  if (!minDamage) return dist;
  const remapped = new Array(dist.length).fill(0);
  for (let d = 0; d < dist.length; d++) {
    if (dist[d] < 1e-15) continue;
    remapped[Math.min(Math.max(d, minDamage), dist.length - 1)] += dist[d];
  }
  return remapped;
}

// Compute damage distribution for a single figure's attack against a multi-figure target.
// Returns an array where dist[d] = probability of dealing exactly d damage.
// Handles overflow: when a hit kills a figure (damage >= hp), excess hits roll
// against the next figure with fresh defense rolls.
// invulnBonus: Invulnerability reduces incoming damage by this amount per defense roll,
// triggering again on every chained figure's fresh defense roll (default 0).
// blurChance/blurBuggy: Blur pre-defense hit negation (0 = no blur).
// topFigHP: CoM2 only — remaining HP of the wounded top figure. When set and < hp,
// the rollover triggers at topFigHP instead of hp for the first figure only;
// subsequent overflow figures still use full hp.
// minDamageFromHits: optional callback that maps the pre-defense hit count to a minimum
// total damage floor for this single attack (used by Supernatural).
function singleAttackDmgDist(atkStr, toHit, defStr, toBlock, hp, invulnBonus, blurChance, blurBuggy, topFigHP, minDamageFromHits) {
  const hitsPMF = binomialPMF(atkStr, toHit);
  const blocksPMF = defenseBlockPMF(defStr, toBlock);
  const inv = invulnBonus || 0;

  const chainDmg = new Array(atkStr + 1);
  chainDmg[0] = [1];

  for (let e = 1; e <= atkStr; e++) {
    chainDmg[e] = new Array(e + 1).fill(0);
    for (let b = 0; b <= defStr; b++) {
      const net = Math.max(e - b - inv, 0);
      if (net < hp) {
        chainDmg[e][net] += blocksPMF[b];
      } else {
        const excess = net - hp;
        const sub = chainDmg[excess];
        for (let d = 0; d < sub.length; d++) {
          if (sub[d] < 1e-15) continue;
          chainDmg[e][hp + d] += blocksPMF[b] * sub[d];
        }
      }
    }
  }

  // CoM2: if the top figure is wounded (topFigHP < hp), build a first-figure array
  // that uses topFigHP as the rollover threshold; overflow chains into full-HP figures.
  let topDmg = chainDmg;
  if (topFigHP != null && topFigHP < hp) {
    topDmg = new Array(atkStr + 1);
    topDmg[0] = [1];
    for (let e = 1; e <= atkStr; e++) {
      topDmg[e] = new Array(e + 1).fill(0);
      for (let b = 0; b <= defStr; b++) {
        const net = Math.max(e - b - inv, 0);
        if (net < topFigHP) {
          topDmg[e][net] += blocksPMF[b];
        } else {
          const excess = net - topFigHP;
          const sub = chainDmg[excess];
          for (let d = 0; d < sub.length; d++) {
            if (sub[d] < 1e-15) continue;
            topDmg[e][topFigHP + d] += blocksPMF[b] * sub[d];
          }
        }
      }
    }
  }

  const dist = new Array(atkStr + 1).fill(0);
  if (!blurChance) {
    for (let h = 0; h <= atkStr; h++) {
      if (hitsPMF[h] < 1e-15) continue;
      const sub = remapDistByMinDamage(topDmg[h], minDamageFromHits ? minDamageFromHits(h) : 0);
      for (let d = 0; d < sub.length; d++) {
        if (sub[d] < 1e-15) continue;
        dist[d] += hitsPMF[h] * sub[d];
      }
    }
  } else {
    for (let h = 0; h <= atkStr; h++) {
      if (hitsPMF[h] < 1e-15) continue;
      const bFilter = blurSurvivingDist(h, blurChance, blurBuggy);
      const minDamage = minDamageFromHits ? minDamageFromHits(h) : 0;
      for (let s = 0; s < bFilter.length; s++) {
        if (bFilter[s] < 1e-15) continue;
        const sub = remapDistByMinDamage(topDmg[s], minDamage);
        for (let d = 0; d < sub.length; d++) {
          if (sub[d] < 1e-15) continue;
          dist[d] += hitsPMF[h] * bFilter[s] * sub[d];
        }
      }
    }
  }
  return dist;
}

// Convolve two damage distributions, capping total damage at `cap`.
function convolveDists(a, b, cap) {
  const result = new Array(cap + 1).fill(0);
  for (let i = 0; i < a.length; i++) {
    if (a[i] < 1e-15) continue;
    for (let j = 0; j < b.length; j++) {
      if (b[j] < 1e-15) continue;
      result[Math.min(i + j, cap)] += a[i] * b[j];
    }
  }
  return result;
}

// Compute total damage distribution for `atkFigs` figures each attacking with
// `atkStr` strength. Uses exponentiation-by-squaring for efficiency.
// blurChance/blurBuggy: Blur pre-defense hit negation passed to singleAttackDmgDist.
// topFigHP: CoM2 wounded-top-figure rollover threshold (see singleAttackDmgDist).
// minDamageFromHits: optional callback passed through to singleAttackDmgDist.
function calcTotalDamageDist(atkFigs, atkStr, toHit, defStr, toBlock, hp, cap, invulnBonus, blurChance, blurBuggy, topFigHP, minDamageFromHits) {
  const single = singleAttackDmgDist(atkStr, toHit, defStr, toBlock, hp, invulnBonus, blurChance, blurBuggy, topFigHP, minDamageFromHits);

  let result = [1];
  let base = single;
  let n = atkFigs;
  while (n > 0) {
    if (n & 1) result = convolveDists(result, base, cap);
    n >>= 1;
    if (n > 0) base = convolveDists(base, base, cap);
  }
  return result;
}

// Per-figure damage distribution for area damage (no overflow between figures).
// Each target figure independently takes min(hp, max(0, hits - blocks)) damage.
// Unlike singleAttackDmgDist, excess damage beyond hp is lost (not carried to the next figure).
// minDamageFromHits: optional callback that maps the pre-defense hit count to a minimum
// per-target damage floor (still capped by hp).
function areaPerFigureDmgDist(atkStr, toHit, defStr, toBlock, hp, invulnBonus, minDamageFromHits) {
  const hitsPMF = binomialPMF(atkStr, toHit);
  const blocksPMF = defenseBlockPMF(defStr, toBlock);
  const inv = invulnBonus || 0;
  const maxDmg = Math.min(atkStr, hp);
  const dist = new Array(maxDmg + 1).fill(0);
  for (let h = 0; h <= atkStr; h++) {
    if (hitsPMF[h] < 1e-15) continue;
    const minDamage = minDamageFromHits ? minDamageFromHits(h) : 0;
    for (let b = 0; b <= defStr; b++) {
      if (blocksPMF[b] < 1e-15) continue;
      dist[Math.min(hp, Math.max(Math.max(0, h - b - inv), minDamage))] += hitsPMF[h] * blocksPMF[b];
    }
  }
  return dist;
}

// Compute area damage distribution: each of `targetFigs` figures independently
// takes damage from an attack of strength `atkStr`. No overflow between figures.
// Used for Immolation, Fireball, and other area-damage effects.
// topFigHP (optional): remaining HP of the wounded top figure. When supplied and
// less than `hp`, exactly one figure is capped at topFigHP (it cannot take more
// than its current HP) and the remaining targetFigs-1 figures are capped at full hp.
function calcAreaDamageDist(targetFigs, atkStr, toHit, defStr, toBlock, hp, cap, invulnBonus, minDamageFromHits, topFigHP) {
  if (targetFigs <= 0 || atkStr <= 0) return [1];
  const single = areaPerFigureDmgDist(atkStr, toHit, defStr, toBlock, hp, invulnBonus, minDamageFromHits);
  // Number of full-HP figures: all but the wounded top one when topFigHP applies.
  const useTopCap = typeof topFigHP === 'number' && topFigHP < hp;
  let result = useTopCap
    ? areaPerFigureDmgDist(atkStr, toHit, defStr, toBlock, topFigHP, invulnBonus, minDamageFromHits)
    : [1];
  let base = single;
  let n = useTopCap ? targetFigs - 1 : targetFigs;
  while (n > 0) {
    if (n & 1) result = convolveDists(result, base, cap);
    n >>= 1;
    if (n > 0) base = convolveDists(base, base, cap);
  }
  // When useTopCap and targetFigs===1, the loop body never runs; cap `result` at `cap`.
  if (useTopCap && result.length > cap + 1) result = result.slice(0, cap + 1);
  return result;
}

// Compute resistance-based damage distribution (for Poison Touch, etc.).
// Each roll is an independent Bernoulli trial: fail → 1 damage.
// numRolls: total resistance rolls (attacking figures × strength per figure)
// pFail: probability of failing each roll (0 to 1)
// cap: maximum possible damage (target's remaining HP)
function calcResistDmgDist(numRolls, pFail, cap) {
  if (numRolls <= 0 || pFail <= 0) return [1];
  const pmf = binomialPMF(numRolls, Math.min(pFail, 1));
  const maxD = Math.min(numRolls, cap);
  const dist = new Array(maxD + 1).fill(0);
  for (let d = 0; d <= numRolls; d++) {
    dist[Math.min(d, maxD)] += pmf[d];
  }
  return dist;
}

// Compute life-steal damage distribution.
// Each attacking figure forces a single d10 roll on the target.
// effective_res = defRes + modifier (modifier is typically negative).
// If roll > effective_res: damage = roll - effective_res.
// If roll ≤ effective_res: no damage.
// Blocked by Death Immunity, Magic Immunity, effective_res ≥ 10 (checked by caller).
// Returns damage distribution array where dist[d] = P(exactly d total damage).
function calcLifeStealDmgDist(numFigs, defRes, modifier, cap) {
  if (numFigs <= 0) return [1];
  const effRes = defRes + modifier;
  if (effRes >= 10) return [1];

  // Single figure distribution:
  // - for effRes >= 0: P(0) = effRes/10, P(d) = 1/10 for d=1..(10-effRes)
  // - for effRes < 0: every d10 roll deals damage in the range (1-effRes)..(10-effRes)
  const minSingleDmg = Math.max(1 - effRes, 1);
  const maxSingleDmg = 10 - effRes;  // could be >10 if effRes < 0
  const single = new Array(maxSingleDmg + 1).fill(0);
  single[0] = Math.max(0, effRes) / 10;
  for (let d = minSingleDmg; d <= maxSingleDmg; d++) {
    single[d] = 1 / 10;
  }

  // Convolve across all attacking figures
  let result = [1];
  let base = single;
  let n = numFigs;
  while (n > 0) {
    if (n & 1) result = convolveDists(result, base, cap);
    n >>= 1;
    if (n > 0) base = convolveDists(base, base, cap);
  }
  return result;
}

// Modern Caster keeps the resistance-roll magnitude separate from the target's
// remaining HP. This wrapper deliberately uses the mathematical maximum rather
// than a target cap; callers may project it into a capped damage PMF afterwards.
function calcLifeStealRawDist(numFigs, defRes, modifier) {
  const effRes = defRes + modifier;
  const maxPerFigure = Math.max(0, 10 - effRes);
  return calcLifeStealDmgDist(numFigs, defRes, modifier,
    Math.max(0, numFigs) * maxPerFigure);
}

function clampDamageDist(dist, cap) {
  const out = new Array(Math.max(0, cap) + 1).fill(0);
  for (let value = 0; value < dist.length; value++) {
    if (dist[value] < 1e-15) continue;
    out[Math.min(value, cap)] += dist[value];
  }
  return out;
}

// Persistent Combatheal state used by the modern Life Steal/Bloodsucker model.
// `hp` excludes base bonus HP; HpPerFigure is hp + bonusHp.
function normalizeCombatHealState(state) {
  const totalDamage = Math.max(0, Math.trunc(Number(state.totalDamage) || 0));
  const irrecoverableDamage = Math.min(totalDamage,
    Math.max(0, Math.trunc(Number(state.irrecoverableDamage) || 0)));
  const undeadDamage = Math.min(totalDamage - irrecoverableDamage,
    Math.max(0, Math.trunc(Number(state.undeadDamage) || 0)));
  return {
    figures: Math.max(1, Math.trunc(Number(state.figures) || 1)),
    hp: Math.max(1, Math.trunc(Number(state.hp) || 1)),
    totalDamage,
    irrecoverableDamage,
    undeadDamage,
    bonusHp: Math.min(90, Math.max(0, Math.trunc(Number(state.bonusHp) || 0))),
    noHealing: !!state.noHealing,
    raceNoHeal: !!state.raceNoHeal,
  };
}

function combatHealLivingFigures(state) {
  const hpPerFigure = state.hp + state.bonusHp;
  return state.figures - Math.trunc(state.totalDamage / hpPerFigure);
}

// Exact source-shaped projection of Combatheal(u, amount, overheal, isregen).
// Returns the revised persistent state plus the two user-visible benefits:
// recoverable damage removed and base bonus HP gained per living figure.
function combatHealTransition(inputState, requestedAmount, overheal, isregen) {
  const state = normalizeCombatHealState(inputState);
  let amount = Math.max(0, Math.trunc(Number(requestedAmount) || 0));
  const healable = state.totalDamage - state.irrecoverableDamage;
  if (!overheal && healable < amount) amount = healable;

  let healedDamage = 0;
  const canHealNaturally = !state.noHealing && !state.raceNoHeal;
  if (canHealNaturally || isregen || overheal) {
    const normalDamage = healable - state.undeadDamage;
    const normalHeal = Math.min(normalDamage, amount);
    state.totalDamage -= normalHeal;
    amount -= normalHeal;
    healedDamage += normalHeal;

    const undeadHeal = Math.min(state.undeadDamage, amount);
    state.totalDamage -= undeadHeal;
    state.undeadDamage -= undeadHeal;
    amount -= undeadHeal;
    healedDamage += undeadHeal;
  }

  let bonusHpGain = 0;
  let bonusHpBenefit = 0;
  if (overheal) {
    const livingFigures = combatHealLivingFigures(state);
    // ApplyAttack can call Life Steal only for a living attacker. Keep the helper
    // total for defensive direct callers without inventing a division-by-zero result.
    if (livingFigures > 0) {
      const deadFigures = state.figures - livingFigures;
      bonusHpGain = Math.trunc(amount / livingFigures);
      if (state.bonusHp + bonusHpGain > 90) bonusHpGain = 90 - state.bonusHp;
      state.bonusHp += bonusHpGain;
      bonusHpBenefit = bonusHpGain * livingFigures;
      const deadAdjustment = bonusHpGain * deadFigures;
      if (!canHealNaturally) state.irrecoverableDamage += deadAdjustment;
      state.totalDamage += deadAdjustment;
    }
  }

  return { state, healedDamage, bonusHpGain, bonusHpBenefit };
}

function combatHealStateKey(state) {
  if (state && state.engine === 'dos') {
    return ['dos', state.version, state.figures, state.baseHp, state.extraHits,
      state.currentFigures, state.frontFigureDamage, state.regularDamage,
      state.undeadDamage, state.irreversibleDamage].join(',');
  }
  return [state.figures, state.hp, state.totalDamage, state.irrecoverableDamage,
    state.undeadDamage, state.bonusHp, state.noHealing ? 1 : 0,
    state.raceNoHeal ? 1 : 0].join(',');
}

function dosUint8(value) {
  return Math.trunc(Number(value) || 0) & 0xff;
}

function dosInt8(value) {
  const byte = dosUint8(value);
  return byte >= 0x80 ? byte - 0x100 : byte;
}

function dosInt16(value) {
  const word = Math.trunc(Number(value) || 0) & 0xffff;
  return word >= 0x8000 ? word - 0x10000 : word;
}

function dosCombatHits(state) {
  return dosUint8(state.baseHp + state.extraHits);
}

function normalizeDosCombatHealState(input) {
  // The version selects the Extra Hits ceiling (CoM 1's 90 against the two MoM builds' 255),
  // so it is a stat input, not a label. Every caller reaches here through
  // `usesDosCombatHealing(version)` or re-normalizes a record that already carries one.
  const version = input.version;
  if (!ENGINE_VERSIONS.includes(version)) {
    throw new Error(
      `normalizeDosCombatHealState: version '${version}' is not one of `
      + `${ENGINE_VERSIONS.join(', ')}; the Extra Hits ceiling cannot be chosen without it.`);
  }
  const figures = Math.min(255, Math.max(1, Math.trunc(Number(input.figures) || 1)));
  const baseHp = Math.max(1, Math.trunc(Number(input.baseHp ?? input.hp) || 1));
  const extraCap = version === 'com_6.08' ? 90 : 255;
  const extraHits = Math.min(extraCap,
    Math.max(0, Math.trunc(Number(input.extraHits ?? input.bonusHp) || 0)));
  const hits = dosCombatHits({ baseHp, extraHits });
  const suppliedCategoryTotal = input.regularDamage == null ? null
    : Math.min(255, Math.max(0, Math.trunc(Number(input.regularDamage) || 0)))
      + Math.min(255, Math.max(0, Math.trunc(Number(input.undeadDamage) || 0)))
      + Math.min(255, Math.max(0, Math.trunc(Number(input.irreversibleDamage) || 0)));
  const totalDamage = suppliedCategoryTotal == null
    ? Math.max(0, Math.trunc(Number(input.totalDamage) || 0))
    : suppliedCategoryTotal;
  const irreversibleDamage = Math.min(255, totalDamage,
    Math.max(0, Math.trunc(Number(input.irreversibleDamage
      ?? input.irrecoverableDamage) || 0)));
  const undeadDamage = Math.min(255, totalDamage - irreversibleDamage,
    Math.max(0, Math.trunc(Number(input.undeadDamage) || 0)));
  const regularDamage = input.regularDamage == null
    ? Math.min(255, totalDamage - irreversibleDamage - undeadDamage)
    : Math.min(255, Math.max(0, Math.trunc(Number(input.regularDamage) || 0)));
  const currentFigures = input.currentFigures == null
    ? Math.max(0, figures - (hits > 0 ? Math.floor(totalDamage / hits) : figures))
    : Math.min(255, Math.max(0, Math.trunc(Number(input.currentFigures) || 0)));
  const frontFigureDamage = input.frontFigureDamage == null
    ? (currentFigures > 0 && hits > 0 ? dosUint8(totalDamage % hits) : 0)
    : dosUint8(input.frontFigureDamage);
  return { engine: 'dos', version, figures, baseHp, extraHits,
    currentFigures, frontFigureDamage, regularDamage, undeadDamage,
    irreversibleDamage };
}

function dosCombatHealLivingFigures(state) {
  return normalizeDosCombatHealState(state).currentFigures;
}

function dosCombatHealRemainingHp(state) {
  const s = normalizeDosCombatHealState(state);
  return Math.max(0, s.currentFigures * dosCombatHits(s)
    - s.frontFigureDamage);
}

function dosLifeStealHealTransition(inputState, requestedAmount) {
  const state = normalizeDosCombatHealState(inputState);
  const oldRemaining = dosCombatHealRemainingHp(state);
  const oldExtraHits = state.extraHits;
  const healing = Math.max(0, Math.trunc(Number(requestedAmount) || 0));

  let remainder = healing;
  const regular = Math.min(state.regularDamage, remainder);
  state.regularDamage -= regular;
  remainder -= regular;
  const undeath = Math.min(state.undeadDamage, remainder);
  state.undeadDamage -= undeath;

  // Battle_Unit_Heal subtracts the low byte and tests the stored byte as signed.
  let storedFront = ((state.frontFigureDamage - (healing & 0xff)) & 0xff);
  if (storedFront >= 0x80) storedFront -= 0x100;
  state.frontFigureDamage = storedFront < 0 ? 0 : storedFront;
  // The local is initialized to zero and is populated only by the signed-negative
  // front-damage arm. A nonnegative byte stays in the record but cannot create
  // MoM 1.31 Extra Hits merely because its value exceeds Max Figures.
  let top = storedFront < 0 ? storedFront : 0;
  const hits = dosCombatHits(state);
  const signedHits = dosInt8(hits);
  const irreversibleFigures = state.version === 'mom_cp_1.60.00'
    ? (hits > 0 ? Math.floor(dosUint8(state.irreversibleDamage) / hits) : 0) : 0;
  const effectiveMax = dosUint8(state.figures - irreversibleFigures);
  while (top < 0) {
    const canRestore = state.version === 'mom_cp_1.60.00'
      ? dosInt8(effectiveMax) > dosInt8(state.currentFigures)
      : dosInt8(state.figures) > dosInt8(state.currentFigures);
    if (!canRestore) break;
    state.currentFigures = dosUint8(state.currentFigures + 1);
    top += signedHits;
  }
  if (top > 0) {
    state.frontFigureDamage = top & 0xff;
    if (state.version !== 'mom_1.31') top &= 0xff00;
  }
  top = Math.abs(top);

  let extraHitsGain = 0;
  if (state.version === 'mom_cp_1.60.00') {
    const signedEffectiveMax = dosInt8(effectiveMax);
    const signedTopLow = dosInt8(top);
    if (signedEffectiveMax <= signedTopLow && effectiveMax !== 0) {
      extraHitsGain = Math.floor(top / effectiveMax) & 0xff;
      state.extraHits = (state.extraHits + extraHitsGain) & 0xff;
      let irreversible = (extraHitsGain * irreversibleFigures
        + dosUint8(state.irreversibleDamage)) & 0xffff;
      if (dosInt16(irreversible) > 200) irreversible = (irreversible & 0xff00) | 200;
      state.irreversibleDamage = irreversible & 0xff;
    }
  } else if (dosInt8(state.figures) <= top && dosInt8(state.figures) !== 0) {
    extraHitsGain = Math.trunc(top / dosInt8(state.figures));
    if (state.version === 'com_6.08') {
      state.extraHits = Math.min(90, state.extraHits + extraHitsGain);
      extraHitsGain = state.extraHits - oldExtraHits;
    } else {
      state.extraHits = (state.extraHits + extraHitsGain) & 0xff;
    }
  }

  const normalized = normalizeDosCombatHealState(state);
  return {
    state: normalized,
    healedDamage: Math.max(0, dosCombatHealRemainingHp(normalized) - oldRemaining),
    bonusHpGain: Math.max(0, extraHitsGain),
    bonusHpBenefit: 0,
  };
}

function calcDosLifeStealHealOutcomes(numFigs, defRes, modifier, inputState) {
  let paths = new Map();
  const initial = normalizeDosCombatHealState(inputState);
  paths.set(`${combatHealStateKey(initial)}|0|0|0`, {
    probability: 1, state: initial, rawDrain: 0, healedDamage: 0,
    bonusHpGain: 0, bonusHpBenefit: 0,
  });
  const effRes = defRes + modifier;
  for (let figure = 0; figure < Math.max(0, numFigs); figure++) {
    const next = new Map();
    for (const path of paths.values()) {
      for (let roll = 1; roll <= 10; roll++) {
        const raw = Math.max(0, roll - effRes);
        const healed = dosLifeStealHealTransition(path.state, raw);
        const value = {
          probability: path.probability / 10,
          state: healed.state,
          rawDrain: path.rawDrain + raw,
          healedDamage: path.healedDamage + healed.healedDamage,
          bonusHpGain: path.bonusHpGain + healed.bonusHpGain,
          bonusHpBenefit: 0,
        };
        const key = `${combatHealStateKey(value.state)}|${value.rawDrain}|${value.healedDamage}|${value.bonusHpGain}`;
        const old = next.get(key);
        if (old) old.probability += value.probability;
        else next.set(key, value);
      }
    }
    paths = next;
  }
  return [...paths.values()];
}

// One Combatheal call is made immediately for every eligible modern Life Steal
// resistance roll. Preserve the roll order so integer overheal conversion and the
// 90-point base-bonus cap are exact rather than applying Combatheal once to an EV/sum.
function calcLifeStealCombatHealOutcomes(numFigs, defRes, modifier, inputState) {
  let paths = new Map();
  const initial = normalizeCombatHealState(inputState);
  paths.set(`${combatHealStateKey(initial)}|0|0|0`, {
    probability: 1, state: initial, rawDrain: 0, healedDamage: 0,
    bonusHpGain: 0, bonusHpBenefit: 0,
  });
  const effRes = defRes + modifier;
  for (let figure = 0; figure < Math.max(0, numFigs); figure++) {
    const next = new Map();
    for (const path of paths.values()) {
      for (let roll = 1; roll <= 10; roll++) {
        const raw = Math.max(0, roll - effRes);
        const healed = combatHealTransition(path.state, raw, true, false);
        const value = {
          probability: path.probability / 10,
          state: healed.state,
          rawDrain: path.rawDrain + raw,
          healedDamage: path.healedDamage + healed.healedDamage,
          bonusHpGain: path.bonusHpGain + healed.bonusHpGain,
          bonusHpBenefit: path.bonusHpBenefit + healed.bonusHpBenefit,
        };
        const key = `${combatHealStateKey(value.state)}|${value.rawDrain}|${value.healedDamage}|${value.bonusHpGain}|${value.bonusHpBenefit}`;
        const old = next.get(key);
        if (old) old.probability += value.probability;
        else next.set(key, value);
      }
    }
    paths = next;
  }
  return [...paths.values()];
}

function outcomeMetricDist(outcomes, key) {
  let max = 0;
  for (const outcome of outcomes) max = Math.max(max, outcome[key] || 0);
  const dist = new Array(max + 1).fill(0);
  for (const outcome of outcomes) dist[outcome[key] || 0] += outcome.probability;
  return dist;
}

// Compute figure-kill damage distribution (for Stoning Touch, etc.).
// Each roll is an independent Bernoulli trial: fail → one figure killed (= defHP damage).
// numRolls: number of resistance rolls (one per attacking figure)
// pFail: probability of failing each roll (0 to 1)
// defHP: HP per defending figure (damage per kill)
// cap: maximum possible damage (target's remaining HP)
function calcFigureKillDmgDist(numRolls, pFail, defHP, cap) {
  if (numRolls <= 0 || pFail <= 0) return [1];
  const pmf = binomialPMF(numRolls, Math.min(pFail, 1));
  const dist = new Array(cap + 1).fill(0);
  for (let k = 0; k <= numRolls; k++) {
    const dmg = Math.min(k * defHP, cap);
    dist[dmg] += pmf[k];
  }
  return dist;
}

// Compute a whole-unit kill damage distribution (for Destruction).
// Destruction's caller combines the independent per-attacker-figure resistance attempts
// into the probability that at least one fails. A failure disintegrates the entire target,
// so the damage is its whole remaining HP rather than one figure's HP.
// pFail: probability that the whole-unit kill occurs (0 to 1)
// cap: target's remaining HP (the damage dealt when the roll fails)
function calcUnitKillDmgDist(pFail, cap) {
  if (pFail <= 0 || cap <= 0) return [1];
  const p = Math.min(pFail, 1);
  const dist = new Array(cap + 1).fill(0);
  dist[0] = 1 - p;
  dist[cap] = p;
  return dist;
}
