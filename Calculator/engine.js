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

// Compute distribution of surviving hits after Blur filtering.
// h: number of initial hits; blurChance: probability each hit is negated (0.1 or 0.2).
// buggy (v1.31): on success, skip next roll — max 50% blocked regardless of luck.
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
  const blocksPMF = binomialPMF(defStr, toBlock);
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
  const blocksPMF = binomialPMF(defStr, toBlock);
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
