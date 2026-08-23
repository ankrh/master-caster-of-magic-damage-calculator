// --- Combat Resolution: resolveCombat ---
// The phase pipeline itself. Loaded last of the combat sources; every helper it calls lives
// in the combat_*.js files listed before it in index.html.

// Resolve a full combat exchange between attacker and defender.
// All inputs are plain objects — no DOM access.
//
// Parameters:
//   a, b: unit stat objects with fields:
//     { figs, atk, def, res, hp, dmg, rtb, rangedType, thrownType,
//       toHitMelee, toHitRtb, toBlock, abilities }
//     where toHitMelee/toHitRtb are region-e-clamped decimals (0.1-1.0), while modern
//     toBlock is DefenseRoll's effective probability projection (0.0-1.0)
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
  // The DOS pair is `Reference docs/MoM binary analysis.md`, *Combat-effect stat writes*, where
  // the defensive half is a live-stat write; the modern pair is `Reference docs/Caster binary/
  // CoM2 binary - unit recalculation.md`, the `+0x0B4D6` row.
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
  // and gaze hidden ranged component. Does NOT apply to doom damage or special/spell damage —
  // the DOS automatic-damage arm jumps past blur, the defense roll and Invulnerability together
  // (`Reference docs/MoM binary analysis.md`, *Blur*; modern equivalent in `Reference docs/
  // Caster binary/CoM2 binary - combat flow.md`).
  // CoM2/Warlord fix tactical defender Card B's army-wide Blur for the entire displayed
  // exchange, including B's counterattack. Unit-owned Invisibility and source Illusion
  // Immunity still follow each call's target/source direction. Older engines use the current
  // target unit's Blur, so a counterattack instead reads Card A's checkbox.
  const modernTacticalDefenderBlur = !!(ver && ver.startsWith('com2'))
    && hasAbil(b.abilities, 'blur');
  const bBlurChance = getBlurChance(b.abilities, a.abilities, ver, modernTacticalDefenderBlur);
  const aBlurChance = getBlurChance(a.abilities, b.abilities, ver, modernTacticalDefenderBlur);
  const blurBuggy = ver === 'mom_1.31';

  // First Strike applies when A is voluntarily attacking in melee and B cannot negate it.
  // Ranged attacks never trigger first strike (it only affects melee ordering).
  const hasFirstStrike = !isRanged
    && hasAbil(a.abilities, 'firstStrike')
    && !hasAbil(b.abilities, 'negateFirstStrike');

  // Haste repeats melee, thrown/breath, and (most) ranged attacks. Modern Caster also
  // repeats each initiating gaze and samples Cause Fear inside each melee ApplyAttack.
  // Wall of Fire never repeats. Counter-attacks repeat in MoM but not in CoM/CoM2:
  // `Reference docs/MoM binary analysis.md`, *First Strike's 24-HP cutoff and Haste repeats*.
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
  // A Black-Sleeping tactical attacker cannot initiate the represented combat.
  // Keep the calculator boundary unambiguous: no outgoing attack and no incoming
  // Wall of Fire, retaliation, or counterattack are resolved in any version/mode.
  if (aBlackSleep) {
    return {
      phases: null,
      totalDmgToA: [1],
      totalDmgToB: [1],
      aLifeStealDist: null,
      bLifeStealDist: null,
      aPostCombatStateMean: initialCombatHealingStateMeans(a),
      bPostCombatStateMean: initialCombatHealingStateMeans(b),
      aRemHP, aHP: a.hp, aAlive,
      bRemHP, bHP: b.hp, bAlive,
    };
  }
  const aDoomsB = aDoom || bBlackSleep; // A's conventional attacks against B → Doom
  const bDoomsA = bDoom || aBlackSleep; // B's conventional attacks against A → Doom
  const aMeleeDoomsB = aDoomsB || hasAbil(a.abilities, 'energyWeaponry');
  const bMeleeDoomsA = bDoomsA || hasAbil(b.abilities, 'energyWeaponry');
  const aRangedDoomsB = aDoomsB || hasAbil(a.abilities, 'energyCannon');

  // Invulnerability: reduces incoming damage by 2 per defense roll (applies on every fresh
  // defense roll, including overflow chains and multi-figure area damage). Applies to melee,
  // ranged, thrown, breath, immolation, wall of fire, and the gaze physical ranged component.
  // Does NOT apply to resist-based effects (poison, stoning, life steal, death gaze) or Doom.
  // `Reference docs/MoM binary analysis.md` for the DOS subtraction after each defense roll and
  // the automatic-damage skip; `Reference docs/Caster binary/CoM2 binary - combat flow.md` for
  // the modern per-figure repeat. The 2 is hard-coded in the DOS builds but a loaded constant in
  // the modern ones — `InvulnerabilityDamagereduction`, 2 in both shipped `MODDING.INI` files.
  const aInvulnBonus = hasAbil(a.abilities, 'invulnerability') ? 2 : 0;
  const bInvulnBonus = hasAbil(b.abilities, 'invulnerability') ? 2 : 0;

  const {
    bResM,
    aResM,
    bResDeath,
    aResDeath,
    bResStoning,
    aResStoning,
    bResPoison,
    aResPoison,
  } = buildResistanceContext(a, b, ver);

  // Cause Fear: reduces opponent's effective melee + touch-attack figures.
  // Fires before the melee exchange. MoM has no resistance modifier; CoM/CoM2 is -3.
  // v1.31 bugs: (1) defending Fear doesn't work; (2) attacker's Fear also self-fears attacker.
  // Both bugs are the caller's argument order and both are confined to 1.31:
  // `Reference docs/MoM binary analysis.md`, *Cause Fear direction and resistance modifier*.
  const aFear = !isRanged && hasAbil(a.abilities, 'fear');
  const bFear = !isRanged && hasAbil(b.abilities, 'fear');
  const bPFear = aFear
    ? fearFailProb(bResDeath, b.abilities, opts.version, b.baseDeathImmunity) : 0; // A's fear on B
  const aPFear = bFear
    ? fearFailProb(aResDeath, a.abilities, opts.version, a.baseDeathImmunity) : 0; // B's fear on A
  // Phase always shows when either unit has Cause Fear; immunity (Death/Magic Immunity)
  // results in 0 feared figures via the skip / +30 resistance bonus in fearFailProb.
  const bFearedByA = aFear; // A can fear B (all versions; immune B shows phase with 0 feared)
  const aFearedByB = bFear && opts.version !== 'mom_1.31'; // B can fear A (not v1.31: bug #1)
  const aFearBug = aFear && opts.version === 'mom_1.31' && bPFear > 0; // v1.31 self-fear bug #2: bypasses immunity
  // B has Cause Fear but v1.31 bug silences it — still show the phase.
  const showFearNoop = bFear && !aFearedByB;
  // Label for simultaneous (non-FS) fear phases: mutual = "Cause Fear", else directional.
  const hasDefenderFear = aFearedByB || aFearBug || showFearNoop;
  const simultaneousFearLabel = hasDefenderFear && bFearedByA ? 'Cause Fear'
    : bFearedByA ? 'Attacker Cause Fear' : 'Defender Cause Fear';

  // Determine if attacker has thrown/breath (melee only). One version-sensitive condition:
  // the breath/thrown attack must exist. MoM 1.31 needs *effective* strength > 0; every other
  // version accepts *base OR effective* > 0 (so a granted breath with base 0 fires, and a breath
  // reduced to 0 effective but with base > 0 still fires).
  //
  // Melee strength does NOT gate the rider, in any of the three builds. `BU_AttackTarget` admits
  // it on attack type alone (`ranged_type >= RAT_THROWN`, `DOS reconstructed/combat.c:2605`), its
  // melee entry carries no strength gate (`MoM binary analysis.md`, *phase gates in the caller*),
  // and the routine's sole call site is unconditional — it selects ranged-versus-melee mode, not
  // whether to engage (`DOS reconstructed/R6.2a.evidence.md`, *Call-site admission*). So a
  // zero-melee attacker still throws. Whether the game's own UI offers that attack is a
  // command-layer question above this routine and deliberately not modelled: the calculator
  // computes the exchange it is given.
  // Black Sleep also prevents all outgoing attacks.
  const breathExists = ver === 'mom_1.31' ? a.rtb > 0 : (a.baseRtb > 0 || a.rtb > 0);
  const dosThrown = !isRanged && a.thrownType !== 'none' && breathExists && !aBlackSleep;
  const modernThrown = isCoM2 && !isRanged ? modernAttackChannels(a) : null;
  const hasThrown = modernThrown ? modernThrown.length > 0 : dosThrown;

  const {
    aToBlockConventional,
    bToBlockVsAAll,
    aToBlockVsBAll,
    bToBlockVsAMelee,
    bToBlockVsAThrEW,
    bToBlockVsARangedEW,
    aToBlockVsBMelee,
  } = buildToBlockContext(a, b, aVertigoBlockPenalty, bVertigoBlockPenalty, ver);

  // --- Immolation ---
  // Area fire damage: targets each defender figure independently (like fire breath).
  // Strength 4 (MoM) / 10 (CoM/CoM2). Fires like a touch attack with each attack phase.
  // Defense vs immolation is computed in computeDefenseProfile (vsImmolation above).
  const aHasImm = hasAbil(a.abilities, 'immolation');
  const bHasImm = hasAbil(b.abilities, 'immolation');
  const immStr = (aHasImm || bHasImm)
    ? immolationStr(ver, !!opts.chaosConjunction) : 0;

  // --- Wall of Fire ---
  // Area Immolation damage to attacker A during the melee opening. Not in ranged combat.
  // Uses the same defense chain as immolation against A, and the same immunities.
  // FirewallEffect tests the calculated unit record. Both modern builds skip the effect for
  // Teleporting or Merging attackers; the older engines retain their independent behavior.
  // Strength, To Hit, area shape and this eligibility gate are the four `PROVENANCE[wallOfFire*]`
  // anchors in `combat_special_attacks.js`.
  const wallOfFireActive = !!opts.wallOfFire && !isRanged
    && wallOfFireEligible(ver, a.abilities);
  const wofStr = wallOfFireActive ? wallOfFireStr(ver) : 0;
  // Wall of Fire is cast at 30% base To Hit (standard spell To Hit, like immolation);
  // Warlord raises this to 60% but limits the strike to a single attacker figure.
  const wofToHit = wallOfFireToHit(ver);
  const wofSingleFigure = wallOfFireSingleFigure(ver);

  // --- Melee phase pipeline ---
  // All non-ranged combat runs through a single joint-state engine. The DOS engines keep
  // Thrown/Breath → attacker gaze → defender gaze → Wall of Fire; Caster.exe uses
  // Wall of Fire → attacker Stoning/Death/Doom → defender Stoning/Death/Doom →
  // Lightning Breath → Fire Breath → Thrown. Fear/First Strike/melee follow either opening.
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

  // Caster.exe evaluates EffectiveDefense for the incoming attack only. The DOS
  // path keeps its existing aggregate profile, while CoM2/Warlord skip sequences
  // for attack types which cannot fire in this exchange.
  const {
    bDefVsA,
    bDefVsARanged,
    bDefForThrown,
    bDefForGaze,
    bDefForImm,
    aDefVsB,
    aDefForGaze,
    aDefForImm,
  } = buildDefenseContext(a, b, ver, aVertigoDefPenalty, bVertigoDefPenalty, {
    melee: !isRanged,
    ranged: isRanged,
    thrown: hasThrown,
    counter: !isRanged,
    aGaze: !isRanged && aGazeActiveP,
    bGaze: !isRanged && bGazeActiveP,
    aImmolation: !isRanged && aHasImm,
    bImmolation: wallOfFireActive || (!isRanged && bHasImm),
  });

  if (!isRanged) {
    // There is deliberately no melee-initiation guard here: no build admits or refuses the
    // exchange on the initiating card's attack strength, so a zero-melee attacker still engages
    // and still gets counterattacked.
    //   - DOS: `BU_AttackTarget`'s melee entry has "no strength gate in any build"
    //     (`Reference docs/MoM binary analysis.md`, *The zero-attack-strength abort, and what it
    //     takes down with it*, the `BU_AttackTarget` gate table). Its sole call site is
    //     unconditional, and the melee strength it reads at `0x9AE4B` only picks the
    //     ranged-versus-melee mode (`DOS reconstructed/R6.2a.evidence.md`, *Call-site
    //     admission*). In the body, the ordinary melee dispatch (`131:0x99939`) is reached with
    //     no strength test and the counterattack (`131:0x99823`) is gated only on defender Black
    //     Sleep (`131:0x9975E`) and `Figs > 0` (`131:0x99803`) — `DOS reconstructed/combat.c`,
    //     `BU_AttackTarget`.
    //   - Modern: `PerformMeleeAttack` calls the main melee `ApplyAttack(au, du, ATmelee, …)` at
    //     `$005B3B4B` and the counterattack `ApplyAttack(du, au, ATmelee, …, counter=True)` at
    //     `$005B3B93` unconditionally, and `ApplyAttack` leaves early only on `figs <= 0`
    //     (`$005B19D9`) — `Caster binary/Combat.PerformAttacks.pas`,
    //     `Caster binary/Combat.ApplyAttack.pas`.
    // The only real melee-strength test in any build is MoM 1.31's `BU_ProcessAttack` abort at
    // `0x99ED2`, which discards a single attack call whose strength is 0 and which CP 1.60 and
    // CoM 1 patch (`7F` -> `EB`) to an unconditional jump; it is per call, never per exchange,
    // so it cannot withhold the defender's counterattack, and `touchAttackFires` already carries
    // it. The same section also settles which record such a test would read: "There is no 'base'
    // attack strength at combat time" — `.melee`/`.ranged` hold the live, already-debuffed values
    // — so neither a permanent record nor the card's `atk` input belongs in a melee gate here.

    // Touch attack params: melee-phase activation.
    const { poisonStr: aPoisonStrM, poisonFail: aPoisonFailM, stoningFail: aStoningFailM, deathTouchFail: aDeathTouchFailM, dispelEvilFail: aDispelEvilFailM, exorciseFail: aExorciseFailM, destructionFail: aDestructionFailM, lifeStealMod: aLifeStealModM }
      = meleeTouchParams(a, b, bResM, bResDeath, bResStoning, bResPoison, opts.version);
    const { poisonStr: bPoisonStrM, poisonFail: bPoisonFailM, stoningFail: bStoningFailM, deathTouchFail: bDeathTouchFailM, dispelEvilFail: bDispelEvilFailM, exorciseFail: bExorciseFailM, destructionFail: bDestructionFailM, lifeStealMod: bLifeStealModM }
      = meleeTouchParams(b, a, aResM, aResDeath, aResStoning, aResPoison, opts.version);

    // Touch attack params: thrown-phase activation (for thrown/breath).
    const aTouchWithThrown = !aBlackSleep && touchAttackFires(a.rtb, opts.version);
    const { poisonStr: aPoisonStrT, poisonFail: aPoisonFailT, stoningFail: aStoningFailT, deathTouchFail: aDeathTouchFailT, dispelEvilFail: aDispelEvilFailT, exorciseFail: aExorciseFailT, destructionFail: aDestructionFailT, lifeStealMod: aLifeStealModT }
      = touchParams(a, b, bResM, bResDeath, bResStoning, bResPoison, opts.version,
        aTouchWithThrown, touchRecordForPhase(ver, a.thrownType));
    // Whether Life Steal survives routing and immunity for the thrown-phase
    // display count. Use the routed result so a ranged-record item power is not
    // lost merely because it is absent from the unit's common ability record.
    const aLifeStealOnT = aLifeStealModT !== null;

    // DOS BU_ProcessAttack gazes can carry common roster riders; modern ApplyAttack attack
    // types 6-8 jump past all six rider blocks, so no touch-rider parameters are constructed
    // (`gazeTouchParams`, `combat_phases.js`, which carries the citation and enforces the split).
    const { poisonStr: aPoisonStrG_raw, poisonFail: aPoisonFailG, stoningFail: aStoningFailG, deathTouchFail: aDeathTouchFailG, dispelEvilFail: aDispelEvilFailG, exorciseFail: aExorciseFailG, destructionFail: aDestructionFailG, lifeStealMod: aLifeStealModG,
            poisonWith: aPoisonWithGaze, stoningWith: aStoningWithGaze, deathTouchWith: aDeathTouchWithGaze, dispelEvilWith: aDispelEvilWithGaze, exorciseWith: aExorciseWithGaze, destructionWith: aDestructionWithGaze, lifeStealWith: aLifeStealWithGaze }
      = gazeTouchParams(a, b, bResM, bResDeath, bResStoning, bResPoison, aGazeActiveP, aBlackSleep, opts.version);
    const { poisonStr: bPoisonStrG_raw, poisonFail: bPoisonFailG, stoningFail: bStoningFailG, deathTouchFail: bDeathTouchFailG, dispelEvilFail: bDispelEvilFailG, exorciseFail: bExorciseFailG, destructionFail: bDestructionFailG, lifeStealMod: bLifeStealModG,
            poisonWith: bPoisonWithGaze, stoningWith: bStoningWithGaze, deathTouchWith: bDeathTouchWithGaze, dispelEvilWith: bDispelEvilWithGaze, exorciseWith: bExorciseWithGaze, destructionWith: bDestructionWithGaze, lifeStealWith: bLifeStealWithGaze }
      = gazeTouchParams(b, a, aResM, aResDeath, aResStoning, aResPoison, bGazeActiveP, bBlackSleep, opts.version);

    // Gaze kill-roll probabilities (needed by buildGazeDist).
    const { stoningFail: aStoningGazeFailP, deathFail: aDeathGazeFailP }
      = gazeKillProbs(a, aStoningGazeActiveP, aDeathGazeActiveP, b, bResDeath, bResStoning);
    const { stoningFail: bStoningGazeFailP, deathFail: bDeathGazeFailP }
      = gazeKillProbs(b, bStoningGazeActiveP, bDeathGazeActiveP, a, aResDeath, aResStoning);

    // Immolation activation per phase.
    const aImmWithThrown = aHasImm && !aBlackSleep && immolationFiresInPhase(ver, 'thrown')
      && touchAttackFires(a.rtb, opts.version);
    const aImmWithGaze   = immolationFiresInPhase(ver, 'gaze') && aHasImm && aGazeActiveP;
    const bImmWithGaze   = immolationFiresInPhase(ver, 'gaze') && bHasImm && bGazeActiveP;
    const aImmWithMelee  = aHasImm && !aBlackSleep && touchAttackFires(a.atk, opts.version);
    const bImmWithMelee  = bHasImm && !bBlackSleep && touchAttackFires(b.atk, opts.version);

    // Compatibility fallback for an unknown external version. Every supported build
    // uses the correlated state path and derives its displayed marginal from execution.
    let aLifeStealDistP = null;
    {
      const lsRefMod = aLifeStealModM !== null ? aLifeStealModM
                     : aLifeStealModT !== null ? aLifeStealModT
                     : aLifeStealWithGaze ? aLifeStealModG : null;
      if (!usesStatefulCombatHealing(ver) && lsRefMod !== null && aAlive > 0 && bRemHP > 0) {
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
      if (!usesStatefulCombatHealing(ver) && lsRefMod !== null && bAlive > 0 && aRemHP > 0) {
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
      aFearProbability: aFearedByB ? aPFear : null,
      aDoomsB: aMeleeDoomsB,
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
      aDestructionFailM,
      aLifeStealModM,
      bResDeath,
      bBlurChance,
      blurBuggy,
      aHaste,
      isCoM2,
      version: ver,
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
      bDoomsA: bMeleeDoomsA,
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
      bDestructionFailM,
      bLifeStealModM,
      aResDeath,
      aBlurChance,
      blurBuggy,
      bCounterHaste,
      isCoM2,
      version: ver,
    });
    const wofPhase = buildWallOfFirePhase(wallOfFireActive, {
      wofStr,
      wofToHit,
      wofSingleFigure,
      aDefForImm,
      // Wall of Fire has no attacking unit whose Mystic Surge/Eldritch Weapon can
      // modify the roll, but the target's direct Vertigo stat write still applies.
      aToBlock: aToBlockConventional,
      aHP: a.hp,
      aInvulnBonus,
      aAbilities: a.abilities,
      // Within this two-unit projection, Card B is the opposing owner whose present calculated
      // Amplifier can qualify the spell. Multiple copies remain a single Boolean adjustment.
      amplifiedDamage: wallOfFireAmplified(ver, b.abilities),
      version: ver,
    });

    const aGazeParams = {
      a,
      b,
      aStoningGazeActiveP,
      aDeathGazeActiveP,
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
      aDestructionWithGaze,
      aExorciseFailG,
      aDestructionFailG,
      aLifeStealWithGaze,
      aLifeStealModG,
      bResDeath,
      version: ver,
    };

    const bGazeParams = {
      a,
      b,
      bStoningGazeActiveP,
      bDeathGazeActiveP,
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
      bDestructionWithGaze,
      bExorciseFailG,
      bDestructionFailG,
      bLifeStealWithGaze,
      bLifeStealModG,
      aResDeath,
      version: ver,
    };

    // DOS represents its selected gaze as one shared-slot phase. Caster.exe instead makes
    // six separately dealt ApplyAttack calls in fixed Stoning/Death/Doom order. Keeping
    // those as distinct joint phases makes every later call recompute living figures and
    // gives the breakdown the same observable phase boundaries as the engine.
    const aGazePhase = !isCoM2
      ? buildAttackerGazePhase(aGazeActiveP, aGazeParams) : null;
    const bGazePhase = !isCoM2
      ? buildDefenderGazePhase(bGazeActiveP, bGazeParams) : null;
    const modernAttackerGazePhases = [];
    const modernDefenderGazePhases = [];
    if (isCoM2) {
      let aDispelPending = aDispelEvilWithGaze;
      const addAttackerGaze = (kind, active) => {
        if (!active) return;
        const stoning = kind === 'stoning';
        const death = kind === 'death';
        const doom = kind === 'doom';
        const dispelEvil = aDispelPending;
        aDispelPending = false;
        modernAttackerGazePhases.push({
          phase: buildAttackerGazePhase(true, {
            ...aGazeParams,
            aStoningGazeActiveP: stoning,
            aDeathGazeActiveP: death,
            aGazeDoomStrP: doom ? aGazeDoomStrP : 0,
            // Preserve the established one-call Dispel Evil compatibility path: when
            // several modern gazes coexist it attaches only to the first admitted call.
            aDispelEvilWithGaze: dispelEvil,
          }),
          labelParams: {
            stoningGaze: stoning,
            deathGaze: death,
            doomGaze: doom,
            poisonTouch: false,
            stoningTouch: false,
            deathTouch: false,
            dispelEvil,
            exorcise: false,
            destruction: false,
            lifeSteal: false,
            immolation: false,
          },
        });
      };
      addAttackerGaze('stoning', aStoningGazeActiveP);
      addAttackerGaze('death', aDeathGazeActiveP);
      addAttackerGaze('doom', aGazeDoomStrP > 0);

      let bDispelPending = bDispelEvilWithGaze;
      const addDefenderGaze = (kind, active) => {
        if (!active) return;
        const stoning = kind === 'stoning';
        const death = kind === 'death';
        const doom = kind === 'doom';
        const dispelEvil = bDispelPending;
        bDispelPending = false;
        modernDefenderGazePhases.push({
          phase: buildDefenderGazePhase(true, {
            ...bGazeParams,
            bStoningGazeActiveP: stoning,
            bDeathGazeActiveP: death,
            bGazeDoomStrP: doom ? bGazeDoomStrP : 0,
            bDispelEvilWithGaze: dispelEvil,
          }),
          labelParams: {
            stoningGaze: stoning,
            deathGaze: death,
            doomGaze: doom,
            poisonTouch: false,
            stoningTouch: false,
            deathTouch: false,
            dispelEvil,
            exorcise: false,
            destruction: false,
            lifeSteal: false,
            immolation: false,
          },
        });
      };
      addDefenderGaze('stoning', bStoningGazeActiveP);
      addDefenderGaze('death', bDeathGazeActiveP);
      addDefenderGaze('doom', bGazeDoomStrP > 0);
    }

    // Thrown / breath: A→B, fires before melee. DOS has one shared slot; Caster.exe
    // runs each independently-derived channel (`Combat.PerformAttacks.pas` $005B399B..$005B3A9E).
    const buildThrown = (attacker, active, type, touchRecord) => {
      const touchActive = active && !aBlackSleep
        && touchAttackFires(attacker.rtb, opts.version);
      const touch = touchParams(attacker, b, bResM, bResDeath, bResStoning, bResPoison,
        opts.version, touchActive, touchRecord);
      return {
        touch,
        phase: buildThrownPhase(active, {
          a: attacker,
          b,
          aDoomsB,
          aBlackSleep,
          aToHitRtbVert: isCoM2 ? attacker.toHitRtb : aToHitRtbVert,
          bDefForThrown: isCoM2 ? computeCasterDefenseForAttack(b, attacker, ver, bVertigoDefPenalty, 'thrown') : bDefForThrown,
          bToBlockVsAThrEW: isCoM2 ? buildToBlockContext(attacker, b, aVertigoBlockPenalty, bVertigoBlockPenalty, ver).bToBlockVsAThrEW : bToBlockVsAThrEW,
          bInvulnBonus,
          bBlurChance,
          blurBuggy,
          isCoM2,
          aMinDamageFromHits,
          aImmWithThrown,
          immStr,
          bDefForImm,
          bToBlockVsAAll,
          aPoisonStrT: touch.poisonStr,
          aPoisonFailT: touch.poisonFail,
          aStoningFailT: touch.stoningFail,
          aDeathTouchFailT: touch.deathTouchFail,
          aDispelEvilFailT: touch.dispelEvilFail,
          aExorciseFailT: touch.exorciseFail,
          aDestructionFailT: touch.destructionFail,
          aLifeStealModT: touch.lifeStealMod,
          bResDeath,
          aHaste,
          version: ver,
        }),
      };
    };
    const thrownPhases = modernThrown
      ? modernThrown.map(channel => {
          // Caster.exe admits ApplyAttack types 2 (melee) and 5 (Thrown) to the same Blood
          // Lust doubling block (`Reference docs/Caster binary/CoM2 binary - combat flow.md`,
          // `0x5B214E..0x5B21BA`). Fire/Lightning Breath use their own types and stay unchanged.
          const strength = channel.key === 'thrown'
            ? bloodLustMeleeAttack(a, b, channel.strength)
            : channel.strength;
          const attacker = modernAttackUnit(a, { ...channel, strength });
          const built = buildThrown(attacker, true, channel.type,
            touchRecordForPhase(ver, channel.key === 'thrown' ? 'thrown' : channel.type));
          return { attacker, type: channel.type, ...built };
        })
      : [{
          attacker: a,
          type: a.thrownType,
          ...buildThrown(a, dosThrown, a.thrownType,
            touchRecordForPhase(ver, a.thrownType)),
        }];

    // Run the version-specific opening, then the shared fear/First Strike/melee tail.
    const trackModernHealing = usesStatefulCombatHealing(ver) && (
      aLifeStealModM !== null || bLifeStealModM !== null
      || thrownPhases.some(({ touch }) => touch.lifeStealMod !== null)
      || aLifeStealWithGaze || bLifeStealWithGaze
      || hasAbil(a.abilities, 'bloodSucker') || hasAbil(b.abilities, 'bloodSucker')
      || aStoningGazeActiveP || bStoningGazeActiveP
      || aStoningFailM > 0 || bStoningFailM > 0
      || aDispelEvilFailM > 0 || bDispelEvilFailM > 0
      || aExorciseFailM > 0 || bExorciseFailM > 0
      || aDestructionFailM > 0 || bDestructionFailM > 0
      || thrownPhases.some(({ touch }) => touch.stoningFail > 0
        || touch.dispelEvilFail > 0 || touch.exorciseFail > 0
        || touch.destructionFail > 0)
      || aDispelEvilWithGaze || bDispelEvilWithGaze
      || aExorciseWithGaze || bExorciseWithGaze
      || aDestructionWithGaze || bDestructionWithGaze);
    let joint = makeJoint2D(aRemHP, bRemHP,
      trackModernHealing ? { a, b } : null);
    let lifeStealEV_a = 0, lifeStealEV_b = 0;
    const breakdown = [];   // accumulate phase rows

    const pendingFear = { aFearDist: null, bFearDist: null };

    const applyThrownPhases = () => {
      for (const { attacker: channelAttacker, type: channelType, phase: thrownPhase, touch } of thrownPhases) {
        if (!thrownPhase) continue;
        const r = applyDamagePhase(joint, thrownPhase, pendingFear, { a: channelAttacker, b }, bRemHP);
        joint = r.joint;
        lifeStealEV_a += r.lifeStealEV;
        const bMargAtThrown = marginalB(joint);
        const thrownLabel = thrownPhaseLabel({
          thrownType: channelType,
          hasted: aHaste && channelAttacker.rtb > 0,
          poisonTouch: touch.poisonFail > 0,
          stoningTouch: touch.stoningFail > 0,
          deathTouch: touch.deathTouchFail > 0,
          dispelEvil: touch.dispelEvilFail > 0,
          exorcise: touch.exorciseFail > 0,
          destruction: touch.destructionFail > 0,
          lifeSteal: touch.lifeStealMod !== null,
          immolation: aImmWithThrown,
        });
        breakdown.push({ label: thrownLabel,
          atkDist: [1], atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
          defDist: r.marginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
          atkDestroyPct: 0,
          defDestroyPct: jointDestroyedProbability(joint, 'b', bMargAtThrown, bRemHP) });
      }
    };

    const applyAttackerGazePhase = (phase, labelParams) => {
      if (!phase) return;
      const r = applyDamagePhase(joint, phase, pendingFear, { a, b }, bRemHP);
      joint = r.joint;
      lifeStealEV_a += r.lifeStealEV;
      const bMargAtAGz = marginalB(joint);
      const aGzLabel = gazePhaseLabel('Attacker', labelParams);
      breakdown.push({ label: aGzLabel,
        atkDist: [1], atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: r.marginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: 0,
        defDestroyPct: jointDestroyedProbability(joint, 'b', bMargAtAGz, bRemHP) });
    };

    const applyDefenderGazePhase = (phase, labelParams) => {
      if (!phase) return;
      const r = applyDamagePhase(joint, phase, pendingFear, { a, b }, aRemHP);
      joint = r.joint;
      lifeStealEV_b += r.lifeStealEV;
      const aMargAtBGz = marginalA(joint);
      const bMargAtBGz = marginalB(joint);
      const bGzLabel = gazePhaseLabel('Defender', labelParams);
      breakdown.push({ label: bGzLabel,
        atkDist: r.marginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: [1], defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: jointDestroyedProbability(joint, 'a', aMargAtBGz, aRemHP),
        defDestroyPct: jointDestroyedProbability(joint, 'b', bMargAtBGz, bRemHP) });
    };

    const applyWallOfFirePhase = () => {
      if (!wofPhase) return;
      const r = applyDamagePhase(joint, wofPhase, pendingFear, { a, b }, aRemHP);
      joint = r.joint;
      const aMargAtWof = marginalA(joint);
      breakdown.push({ label: 'Wall of Fire',
        atkDist: r.marginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: [1], defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: jointDestroyedProbability(joint, 'a', aMargAtWof, aRemHP),
        defDestroyPct: 0 });
    };

    const dosAttackerGazeLabels = {
      stoningGaze: aStoningGazeActiveP,
      deathGaze: aDeathGazeActiveP,
      doomGaze: aGazeDoomStrP > 0,
      poisonTouch: aPoisonWithGaze,
      stoningTouch: aStoningWithGaze,
      deathTouch: aDeathTouchWithGaze,
      dispelEvil: aDispelEvilWithGaze,
      exorcise: aExorciseWithGaze,
      destruction: aDestructionWithGaze,
      lifeSteal: aLifeStealWithGaze,
      immolation: aImmWithGaze,
    };
    const dosDefenderGazeLabels = {
      stoningGaze: bStoningGazeActiveP,
      deathGaze: bDeathGazeActiveP,
      doomGaze: bGazeDoomStrP > 0,
      poisonTouch: bPoisonWithGaze,
      stoningTouch: bStoningWithGaze,
      deathTouch: bDeathTouchWithGaze,
      dispelEvil: bDispelEvilWithGaze,
      exorcise: bExorciseWithGaze,
      destruction: bDestructionWithGaze,
      lifeSteal: bLifeStealWithGaze,
      immolation: bImmWithGaze,
    };

    if (isCoM2) {
      applyWallOfFirePhase();
      for (const gaze of modernAttackerGazePhases) {
        const repeats = aHaste ? 2 : 1;
        for (let repeat = 0; repeat < repeats; repeat++) {
          applyAttackerGazePhase(gaze.phase, gaze.labelParams);
        }
      }
      for (const gaze of modernDefenderGazePhases) {
        applyDefenderGazePhase(gaze.phase, gaze.labelParams);
      }
      applyThrownPhases();
    } else {
      applyThrownPhases();
      applyAttackerGazePhase(aGazePhase, dosAttackerGazeLabels);
      applyDefenderGazePhase(bGazePhase, dosDefenderGazeLabels);
      applyWallOfFirePhase();
    }

    // Survivor-distribution helper.
    const computeSurv = (j) => {
      const aSurv = new Array(a.figs + 1).fill(0);
      const bSurv = new Array(b.figs + 1).fill(0);
      for (let cumA = 0; cumA < j.length; cumA++) {
        const bRow = j[cumA];
        for (let cumB = 0; cumB < bRow.length; cumB++) {
          if (j.healingPaths) {
            for (const path of bRow[cumB].values()) {
              if (path.probability < 1e-15) continue;
              aSurv[healingStateAlive(path.aState)] += path.probability;
              bSurv[healingStateAlive(path.bState)] += path.probability;
            }
          } else {
            const p = bRow[cumB];
            if (p < 1e-15) continue;
            aSurv[aliveCount(a, cumA)] += p;
            bSurv[aliveCount(b, cumB)] += p;
          }
        }
      }
      return { aSurv, bSurv };
    };

    // Exact feared-figure marginal for one modern ApplyAttack call at this joint
    // snapshot. PerformMeleeAttack still makes a selected call against a target
    // killed by an earlier dealt phase, so only a zero-figure or Black-Sleeping
    // source suppresses the fear loop.
    const modernFearCallDist = (j, sourceSide, pFear) => {
      const sourceUnit = sourceSide === 'a' ? a : b;
      const result = new Array(sourceUnit.figs + 1).fill(0);
      const sourceBlackSleep = hasAbil(sourceUnit.abilities, 'blackSleep');
      const addPath = (probability, sourceAlive) => {
        if (sourceAlive <= 0 || sourceBlackSleep || pFear <= 0) {
          result[0] += probability;
          return;
        }
        addWeightedDist(result, binomialPMF(sourceAlive, pFear), probability);
      };
      for (let cumA = 0; cumA < j.length; cumA++) {
        for (let cumB = 0; cumB < j[0].length; cumB++) {
          if (j.healingPaths) {
            for (const path of j[cumA][cumB].values()) {
              const sourceState = path[sourceSide + 'State'];
              addPath(path.probability, healingStateAlive(sourceState));
            }
          } else {
            const probability = j[cumA][cumB];
            if (probability < 1e-15) continue;
            const sourceDamage = sourceSide === 'a' ? cumA : cumB;
            addPath(probability, aliveCount(sourceUnit, sourceDamage));
          }
        }
      }
      return result;
    };

    if (hasFirstStrike) {
      // FS path. With Haste: FS strike → (counter + 2nd strike simultaneous).
      // Without Haste: FS strike → counter sequentially.
      // Per-cell CoM1 fallthrough → simultaneous melee+counter (single strike).

      // Step 5: Defender Cause Fear row (B's fear on A only; aFearBug fires after FS).
      if (isCoM2 && (aFear || bFear)) {
        breakdown.push({ label: 'First Strike Cause Fear', mode: 'feared',
          atkDist: modernFearCallDist(joint, 'a', aPFear), defDist: [1] });
      } else {
        const survPre = computeSurv(joint);
        const beforeFear = buildFearPhaseDists(aAlive, bAlive, bPFear, aPFear, aFearedByB, false, false, showFearNoop, survPre.bSurv, survPre.aSurv);
        if (beforeFear) {
          breakdown.push({ label: 'Defender Cause Fear', mode: 'feared',
            atkDist: beforeFear.atkFearedDist, defDist: beforeFear.defFearedDist });
        }
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
        aDoomsB: aMeleeDoomsB,
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
        aDestructionFailM,
        aLifeStealModM,
        bResDeath,
        bBlurChance,
        blurBuggy,
        isCoM2,
        version: ver,
      });

      let fsResult;
      if (aHaste) {
        // Modern ApplyAttack calls sample independently; the DOS engines retain their
        // established First-Strike/Haste coupling. Otherwise no fear roll happens on FS,
        // so coupling is moot — fall through to independent path.
        const coupleKa = !isCoM2 && aFearedByB && aHaste;
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
        destruction: aDestructionFailM > 0,
        lifeSteal: aLifeStealModM !== null,
        immolation: aImmWithMelee,
      });
      breakdown.push({ label: fsLabel,
        atkDist: [1], atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
        defDist: fsResult.fsMarginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
        atkDestroyPct: jointDestroyedProbability(fsResult.postFsJoint, 'a', aMargPostFS, aRemHP),
        defDestroyPct: jointDestroyedProbability(fsResult.postFsJoint, 'b', bMargPostFS, bRemHP) });

      // Step 7: Attacker Cause Fear row (post-FS; includes A's fear on B and v1.31 self-fear bug).
      if (isCoM2 && (aFear || bFear)) {
        if (aHaste) {
          breakdown.push({ label: 'Haste Cause Fear', mode: 'feared',
            atkDist: modernFearCallDist(fsResult.postFsJoint, 'a', aPFear),
            defDist: [1] });
        }
        breakdown.push({ label: 'Counter Cause Fear', mode: 'feared',
          atkDist: [1],
          defDist: modernFearCallDist(fsResult.postFsJoint, 'b', bPFear) });
      } else {
        const survPostFS = computeSurv(fsResult.postFsJoint);
        const afterFear = buildFearPhaseDists(aAlive, bAlive, bPFear, aPFear, false, aFearBug, bFearedByA, false, survPostFS.bSurv, survPostFS.aSurv);
        if (afterFear) {
          breakdown.push({ label: 'Attacker Cause Fear', mode: 'feared',
            atkDist: afterFear.atkFearedDist, defDist: afterFear.defFearedDist });
        }
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
          destruction: aDestructionFailM > 0 || bDestructionFailM > 0,
          lifeSteal: aLifeStealModM !== null || bLifeStealModM !== null,
          immolation: aImmWithMelee || bImmWithMelee,
          counterHasted: bCounterHaste,
        });
        breakdown.push({ label,
          atkDist: fsResult.counterMarginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
          defDist: fsResult.secondMarginal, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
          atkDestroyPct: jointDestroyedProbability(joint, 'a', totalDmgToAFs, aRemHP),
          defDestroyPct: jointDestroyedProbability(joint, 'b', totalDmgToBFs, bRemHP) });
      } else {
        const counterLabel = counterBreakdownLabel({
          counterHasted: bCounterHaste,
          poisonTouch: bPoisonFailM > 0,
          stoningTouch: bStoningFailM > 0,
          deathTouch: bDeathTouchFailM > 0,
          dispelEvil: bDispelEvilFailM > 0,
          exorcise: bExorciseFailM > 0,
          destruction: bDestructionFailM > 0,
          lifeSteal: bLifeStealModM !== null,
          immolation: bImmWithMelee,
        });
        breakdown.push({ label: counterLabel,
          atkDist: fsResult.counterMarginal, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
          defDist: [1], defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
          atkDestroyPct: jointDestroyedProbability(joint, 'a', totalDmgToAFs, aRemHP),
          defDestroyPct: jointDestroyedProbability(joint, 'b', totalDmgToBFs, bRemHP) });
      }
    } else {
      // Non-FS path: emits a single combined Cause Fear row + simultaneous melee+counter.
      const hasDefenderFearP = aFearedByB || aFearBug || showFearNoop;
      if (!isCoM2 && (bFearedByA || hasDefenderFearP)) {
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

      if (isCoM2 && (aFear || bFear)) {
        breakdown.push({ label: 'Main Cause Fear', mode: 'feared',
          atkDist: (pair.fearSamplesB && pair.fearSamplesB[0]) || [1], defDist: [1] });
        if (aHaste) {
          breakdown.push({ label: 'Haste Cause Fear', mode: 'feared',
            atkDist: (pair.fearSamplesB && pair.fearSamplesB[1]) || [1], defDist: [1] });
        }
        breakdown.push({ label: 'Counter Cause Fear', mode: 'feared',
          atkDist: [1], defDist: (pair.fearSamplesA && pair.fearSamplesA[0]) || [1] });
      }

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
          destruction: aDestructionFailM > 0 || bDestructionFailM > 0,
          lifeSteal: aLifeStealModM !== null || bLifeStealModM !== null,
          immolation: aImmWithMelee || bImmWithMelee,
        });
        breakdown.push({ label: meleeLabel,
          atkDist: pair.marginalA, atkHP: aRemHP, atkHPper: a.hp, atkFigs: aAlive,
          defDist: pair.marginalB, defHP: bRemHP, defHPper: b.hp, defFigs: bAlive,
          atkDestroyPct: jointDestroyedProbability(joint, 'a', totalDmgToANF, aRemHP),
          defDestroyPct: jointDestroyedProbability(joint, 'b', totalDmgToBNF, bRemHP) });
      }
    }

    const cappedDmgToA = marginalA(joint);
    const cappedDmgToB = marginalB(joint);
    const exactADamageDist = jointMetricDist(joint, 'aDamageTaken');
    const exactBDamageDist = jointMetricDist(joint, 'bDamageTaken');
    const totalDmgToA = exactADamageDist || cappedDmgToA;
    const totalDmgToB = exactBDamageDist || cappedDmgToB;
    const exactARawDist = jointMetricDist(joint, 'aRawDrain');
    const exactBRawDist = jointMetricDist(joint, 'bRawDrain');
    const exactAHealedDist = jointMetricDist(joint, 'aHealedDamage');
    const exactBHealedDist = jointMetricDist(joint, 'bHealedDamage');
    const exactABonusDist = jointMetricDist(joint, 'aBonusHpGain');
    const exactBBonusDist = jointMetricDist(joint, 'bBonusHpGain');
    const exactABenefitDist = jointCombinedMetricDist(joint,
      ['aHealedDamage', 'aBonusHpBenefit']);
    const exactBBenefitDist = jointCombinedMetricDist(joint,
      ['bHealedDamage', 'bBonusHpBenefit']);

    return {
      phases: breakdown.length > 0 ? breakdown : null,
      totalDmgToA, totalDmgToB,
      aDestroyPct: jointDestroyedProbability(joint, 'a', cappedDmgToA, aRemHP),
      bDestroyPct: jointDestroyedProbability(joint, 'b', cappedDmgToB, bRemHP),
      aLifeStealDist: exactARawDist || aLifeStealDistP,
      aLifeStealRawDist: exactARawDist || aLifeStealDistP,
      aLifeStealRawExpected: expectedDamage(exactARawDist || aLifeStealDistP),
      aLifeStealExpected: exactABenefitDist
        ? expectedDamage(exactABenefitDist) : lifeStealEV_a,
      aHealedDamageDist: exactAHealedDist,
      aBonusHpDist: exactABonusDist,
      aAppliedHealingBenefitDist: exactABenefitDist,
      bLifeStealDist: exactBRawDist || bLifeStealDistP,
      bLifeStealRawDist: exactBRawDist || bLifeStealDistP,
      bLifeStealRawExpected: expectedDamage(exactBRawDist || bLifeStealDistP),
      bLifeStealExpected: exactBBenefitDist
        ? expectedDamage(exactBBenefitDist) : lifeStealEV_b,
      bHealedDamageDist: exactBHealedDist,
      bBonusHpDist: exactBBonusDist,
      bAppliedHealingBenefitDist: exactBBenefitDist,
      aPostCombatStateMean: jointCombatHealingStateMeans(joint, 'a', a),
      bPostCombatStateMean: jointCombatHealingStateMeans(joint, 'b', b),
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
        aPostCombatStateMean: initialCombatHealingStateMeans(a),
        bPostCombatStateMean: initialCombatHealingStateMeans(b),
        aRemHP, aHP: aTotalHP, aAlive,
        bRemHP, bHP: bTotalHP, bAlive,
      };
    }
    // A modern attacker always carries the record, so the volley reads the Ranged channel rather
    // than the DOS-shaped shared slot (`SPEC.md`, *Attack channels on the card*).
    const rangedChannel = isCoM2 && a.modernAttacks.ranged;
    const rangedAttacker = rangedChannel ? modernAttackUnit(a, { key: 'ranged', ...rangedChannel }) : a;
    const rangedDefense = rangedChannel
      ? computeCasterDefenseForAttack(b, rangedAttacker, ver, bVertigoDefPenalty, 'ranged')
      : bDefVsARanged;
    const rangedToBlock = rangedChannel
      ? buildToBlockContext(rangedAttacker, b, aVertigoBlockPenalty, bVertigoBlockPenalty, ver).bToBlockVsARangedEW
      : bToBlockVsARangedEW;

    // Rage: +1 ranged per figure lost (ranged combat has no counter-attack, so only
    // pre-combat casualties contribute — aAlive is constant through the volley).
    const aRtbRanged = applyRage(rangedAttacker.rtb, rangedAttacker, aAlive);
    let dmgToB = aAlive > 0 && bRemHP > 0 && rangedAttacker.rtb > 0 && !aBlackSleep
      ? (aRangedDoomsB ? calcDoomDist(aAlive, aRtbRanged, bRemHP)
                 : calcTotalDamageDist(aAlive, aRtbRanged,
                     isCoM2 ? rangedAttacker.toHitRtb : aToHitRtbVert,
                     rangedDefense, rangedToBlock, b.hp, bRemHP, bInvulnBonus, bBlurChance, blurBuggy,
                     isCoM2 ? woundedTopFigHP(bRemHP, b.hp) : undefined, aMinDamageFromHits))
      : [1];

    // Touch attacks accompanying ranged use the general + ranged attack-flag records.
    // Warlord's manual describes a magical-ranged exclusion, but the dispatcher has
    // no blanket type gate; represented spells instead move or clear record values.
    // The conflict is recorded in `Reference docs/Source discrepancies.md` §14.
    const rangedTouchFires = touchAttackFires(rangedAttacker.rtb, opts.version);
    const { poisonStr: aPoisonStrR, poisonFail: aPoisonFailR, stoningFail: aStoningFailR, deathTouchFail: aDeathTouchFailR, dispelEvilFail: aDispelEvilFailR, exorciseFail: aExorciseFailR, destructionFail: aDestructionFailR, lifeStealMod: aLifeStealModR }
      = touchParams(rangedAttacker, b, bResM, bResDeath, bResStoning, bResPoison,
        opts.version, rangedTouchFires, touchRecordForPhase(ver, 'ranged'));
    const aImmWithRanged = aHasImm && immolationFiresInPhase(ver, 'ranged') && rangedTouchFires;
    const aImmDistR = (aImmWithRanged && aAlive > 0 && bAlive > 0 && bRemHP > 0)
      ? calcDamageSpellDist(bAlive, immStr, a.toHitImmolation, bDefForImm,
        bToBlockVsAAll, b.hp, bRemHP, bInvulnBonus, aMinDamageFromHits,
        woundedTopFigHP(bRemHP, b.hp), ver, b.abilities)
      : null;
    const rangedTouchSpec = {
      poisonStr: aPoisonStrR, poisonFail: aPoisonFailR,
      stoningFail: aStoningFailR,
      deathTouchFail: aDeathTouchFailR,
      dispelEvilFail: aDispelEvilFailR,
      exorciseFail: aExorciseFailR,
      destructionFail: aDestructionFailR,
      targetHP: b.hp,
      lifeStealMod: aLifeStealModR, lifeStealRes: bResDeath,
      immDist: aImmDistR,
      bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
      sourceState: usesStatefulCombatHealing(ver) ? combatHealStateFromUnit(a) : null,
      version: ver,
    };
    let tR = convolveTouchAttacks(dmgToB, bRemHP, aAlive, rangedTouchSpec);

    // Haste doubles ranged attacks, including mana-pool magical ranged from Caster
    // *units* (Djinn, Efreet). The DOS engines require 7 mana in 1.31 or 6 in CP 1.60
    // and spend 3 on the extra shot; resources are outside this one-round damage model,
    // so an available shot is assumed.
    //
    // MoM 1.31 exception, heroes only. Its repeat gate (WIZARDS.EXE 0x99396) tests just
    // Attribs_1 & 0x6000 — the Caster 20/40 unit flags — with no hero test, unlike the
    // routine that charges the *first* shot (0x9B027, `Hero_Slot >= 0 || 0x6000`). A
    // magical-ranged hero therefore falls through to the ammunition branch, and every
    // such hero ships with 0 ammo, so the second shot never fires. CP 1.60 added the
    // missing hero test, which is why this is 1.31-only.
    // Modelled as the common case: 1.31's real gate also ORs in a stale read of
    // battle_units[3].ranged_type, so an unrelated unit can flip the outcome either way.
    // See `Reference docs/MoM binary analysis.md`, *First Strike's 24-HP cutoff and
    // Haste repeats*.
    const momHeroManaRanged = ver === 'mom_1.31'
      && (a.isHero || a.unitType === 'hero')
      && (a.rangedType === 'magic_c' || a.rangedType === 'magic_n' || a.rangedType === 'magic_s');
    // Self-convolving captures both the main ranged damage and all touch + immolation
    // effects folded in above.
    const hasteDoublesRanged = aHaste && rangedAttacker.rtb > 0 && aAlive > 0 && bRemHP > 0
      && !momHeroManaRanged;
    if (hasteDoublesRanged) {
      tR = repeatTouchAttack(tR, dmgToB, bRemHP, aAlive, rangedTouchSpec);
    }
    dmgToB = tR.dist;
    const aLifeStealDistR = tR.lifeStealDist;
    const aLifeStealExpectedR = tR.lifeStealEV;
    const rangedStateMeans = rangedCombatHealingStateMeans(tR.outcomes, a, b);

    return {
      phases: null,
      totalDmgToA: [1],
      totalDmgToB: dmgToB,
      aLifeStealDist: aLifeStealDistR,
      aLifeStealRawDist: aLifeStealDistR,
      aLifeStealExpected: aLifeStealExpectedR,
      aLifeStealRawExpected: tR.rawDrainEV,
      aHealedDamageDist: tR.healedDamageDist,
      aBonusHpDist: tR.bonusHpDist,
      aBonusHpExpected: tR.bonusHpEV,
      aBloodsuckerHealDist: tR.bloodsuckerHealDist,
      bLifeStealDist: null,
      bLifeStealExpected: 0,
      aPostCombatStateMean: rangedStateMeans.sourceMeans,
      bPostCombatStateMean: rangedStateMeans.targetMeans,
      aRemHP, aHP: a.hp, aAlive,
      bRemHP, bHP: b.hp, bAlive,
    };

  }
}
