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
//     toBlock is DefenseRoll's effective probability projection (0.0-1.0). The 10-100
//     clamp is `PROVENANCE[clampPct]` (`combat_abilities.js`); the To Block projection is
//     `PROVENANCE[resolutionToBlockContext]` (`combat_phases.js`).
//   opts: { isRanged, distance }
//
// Returns:
//   { phases, totalDmgToA, totalDmgToB,
//     aRemHP, aHP, aAlive, bRemHP, bHP, bAlive }
//   phases: array of { label, atkDist, defDist, atkHP, defHP, atkHPper, defHPper, atkFigs, defFigs } or null
function resolveCombat(a, b, opts) {
  const isRanged = opts.isRanged;
  const ver = opts.version;
  // The rider histograms' hover chains are collected by the queries that compute the figures,
  // so they cost a trace array per query and are asked for only by the caller that renders
  // them. The matrix draws no histogram and does not ask (`Calculator/ui_matrix.js`).
  const wantChains = !!opts.riderChains;

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
  // Ranged attacks never trigger first strike: every build's gate lives inside the melee
  // routine alone — `BU_AttackTarget` `0x9969C`-`0x996BC` and modern `PerformMeleeAttack`
  // `$005B3AA0..$005B3B46` (`Reference docs/MoM binary analysis.md`, *First Strike's 24-HP
  // cutoff and Haste repeats*; `Reference docs/Caster binary/CoM2 binary - combat flow.md`,
  // *Ranged and melee attack dispatch*).
  // Two further gates are deliberately not here. CoM 1 alone also suppresses First Strike when
  // the defender's top figure has 25+ HP remaining; that depends on the joint state, so it is
  // applied per cell as `isCoM1Only` in `combat_state.js`, not as a whole-exchange flag. The
  // modern `HpPerFigure(du) - TopFigureDamage(du) <= FirstStrikeCap` test is inert with shipped
  // data — both CoM2 and Warlord set `FirstStrikeCap` to 999 — and the calculator has no control
  // for the key, so it is not represented.
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
  // A Black-Sleeping attacker lands no outgoing attack. That half is the engine's: modern
  // `ApplyAttack` zeroes the attacker's figure count on the flag at `$005B19C4` and the
  // `figs <= 0` test at `$005B19D9` then returns the empty result (`Reference docs/Caster
  // binary/Combat.ApplyAttack.pas`); the DOS counterattack is likewise gated on the acting
  // unit's Black Sleep at `131:0x9975E` (`Reference docs/DOS reconstructed/combat.c`).
  // Suppressing the *incoming* Wall of Fire, retaliation and counterattack as well is the
  // calculator's own boundary, not a gate any build has: a sleeping unit is never selected to
  // attack, so the engine has no such exchange to resolve, and returning an empty one keeps
  // the projection unambiguous in every version and mode.
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

  // Cause Fear: reduces opponent's effective melee + touch-attack figures.
  // Fires before the melee exchange. MoM has no resistance modifier; CoM/CoM2 is -3.
  // v1.31 bugs: (1) defending Fear doesn't work; (2) attacker's Fear also self-fears attacker.
  // Both bugs are the caller's argument order and both are confined to 1.31:
  // `Reference docs/MoM binary analysis.md`, *Cause Fear direction and resistance modifier*.
  const aFear = !isRanged && hasAbil(a.abilities, 'fear');
  const bFear = !isRanged && hasAbil(b.abilities, 'fear');
  // Each direction asks its own Death-realm query, at the rider that makes it
  // (`fearRiderResistance:fear`, `combat_effects.js`).
  const bResFear = resistanceQueries('fear', b, ver, { fear: aFear }).fearRes;
  const aResFear = resistanceQueries('fear', a, ver, { fear: bFear }).fearRes;
  const bPFear = aFear
    ? fearFailProb(bResFear, b.abilities, opts.version, b.baseDeathImmunity) : 0; // A's fear on B
  const aPFear = bFear
    ? fearFailProb(aResFear, a.abilities, opts.version, a.baseDeathImmunity) : 0; // B's fear on A
  // Phase always shows when either unit has Cause Fear; an immune defender shows it with 0
  // feared figures. The two immunities reach that zero by different routes, and only one of
  // them is in `fearFailProb`: Death Immunity is its early return, while Magic Immunity is
  // never tested there at all. Magic Immunity arrives already folded into `aResFear`/
  // `bResFear` by the resistance transform — `+30` in the DOS builds
  // (`PROVENANCE[dosEffectiveResistance:magicImmunity]`) and an assignment to 100 in the modern
  // ones (`PROVENANCE[effectiveResistance:magicImmunity]`, both `combat_effects.js`) — which
  // clears `fearFailProb`'s `>= 10` threshold. That split is the rule in `SPEC.md`,
  // *Combat resolution contract*: an immunity the engine enforces inside its resistance
  // transform is a step of that transform, never an addition at the consumer.
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
  // Strength 4 (MoM) / 10 (CoM/CoM2) — `PROVENANCE[immolationStrength]`, and the per-phase
  // admission is `PROVENANCE[touchDispatcherAdmission]`, both `combat_special_attacks.js`.
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
  // Warlord raises this to 60% but limits the strike to a single attacker figure. Both halves
  // are read from the version's `SPELLS.INI` record: `PROVENANCE[wallOfFireToHit]` and
  // `PROVENANCE[wallOfFireAreaShape]` (`combat_special_attacks.js`).
  const wofToHit = wallOfFireToHit(ver);
  const wofSingleFigure = wallOfFireSingleFigure(ver);

  // --- Melee phase pipeline ---
  // All non-ranged combat runs through a single joint-state engine. Both orderings, and the
  // rule that each opening phase is dealt before the next reads living figures, are stated once
  // in `SPEC.md`, *Combat resolution contract*; the modern order is transcribed from
  // `PerformMeleeAttack` `$005B35C3..$005B3BEE` (`Reference docs/Caster binary/CoM2 binary -
  // combat flow.md`, *Ranged and melee attack dispatch*), the DOS order from `BU_AttackTarget`
  // (`Reference docs/DOS reconstructed/combat.c`). This file implements them at the version
  // branch below; do not restate the sequence here.
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

  // Caster.exe evaluates EffectiveDefense for the incoming attack only — the per-attack
  // scratch-copy transform specified in `SPEC.md`, *Attack-specific sequences*, whose steps
  // are the `PROVENANCE[effectiveDefense:*]` list in `combat_effects.js`. The DOS path keeps
  // its existing aggregate profile (`PROVENANCE[dosEffectiveDefenseProfile]`, same file),
  // while CoM2/Warlord skip sequences for attack types which cannot fire in this exchange.
  const {
    bDefVsA,
    bDefVsARanged,
    bDefForThrown,
    bDefForGaze,
    bDefForImm,
    aDefVsB,
    aDefForGaze,
    aDefForImm,
    defChains,
  } = buildDefenseContext(a, b, ver, aVertigoDefPenalty, bVertigoDefPenalty, {
    melee: !isRanged,
    ranged: isRanged,
    thrown: hasThrown,
    counter: !isRanged,
    aGaze: !isRanged && aGazeActiveP,
    bGaze: !isRanged && bGazeActiveP,
    aImmolation: !isRanged && aHasImm,
    bImmolation: wallOfFireActive || (!isRanged && bHasImm),
  }, wantChains);

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
    // it. The same section also settles which record such a test would read: there is no base
    // attack strength at combat time — `.melee`/`.ranged` hold the live, already-debuffed values
    // — so neither a permanent record nor the card's `atk` input belongs in a melee gate here.

    // Touch attack params: melee-phase activation.
    const { poisonStr: aPoisonStrM, poisonFail: aPoisonFailM, stoningFail: aStoningFailM, deathTouchFail: aDeathTouchFailM, dispelEvilFail: aDispelEvilFailM, exorciseFail: aExorciseFailM, destructionFail: aDestructionFailM, lifeStealMod: aLifeStealModM, lifeStealRes: aLifeStealResM, placed: aTouchPlacedM, chains: aTouchChainsM }
      = touchParams(a, b, opts.version, touchAttackFires(a.atk, opts.version), touchRecordForPhase(ver, 'melee'), wantChains);
    const { poisonStr: bPoisonStrM, poisonFail: bPoisonFailM, stoningFail: bStoningFailM, deathTouchFail: bDeathTouchFailM, dispelEvilFail: bDispelEvilFailM, exorciseFail: bExorciseFailM, destructionFail: bDestructionFailM, lifeStealMod: bLifeStealModM, lifeStealRes: bLifeStealResM, placed: bTouchPlacedM, chains: bTouchChainsM }
      = touchParams(b, a, opts.version, touchAttackFires(b.atk, opts.version), touchRecordForPhase(ver, 'melee'), wantChains);

    // DOS BU_ProcessAttack gazes can carry common roster riders; modern ApplyAttack attack
    // types 6-8 jump past all six rider blocks, so no touch-rider parameters are constructed.
    // `gazeTouchParams` (`combat_phases.js`) enforces the split and carries the reading of the
    // unsigned two-step range idiom that admits exactly those types:
    // `Reference docs/Caster binary/Combat.ApplyAttack.R5.2c.evidence.md`.
    const { poisonStr: aPoisonStrG_raw, poisonFail: aPoisonFailG, stoningFail: aStoningFailG, deathTouchFail: aDeathTouchFailG, dispelEvilFail: aDispelEvilFailG, exorciseFail: aExorciseFailG, destructionFail: aDestructionFailG, lifeStealMod: aLifeStealModG,
            poisonWith: aPoisonWithGaze, stoningWith: aStoningWithGaze, deathTouchWith: aDeathTouchWithGaze, dispelEvilWith: aDispelEvilWithGaze, exorciseWith: aExorciseWithGaze, destructionWith: aDestructionWithGaze, lifeStealWith: aLifeStealWithGaze, lifeStealRes: aLifeStealResG, placed: aTouchPlacedG, chains: aTouchChainsG }
      = gazeTouchParams(a, b, aGazeActiveP, aBlackSleep, opts.version, wantChains);
    const { poisonStr: bPoisonStrG_raw, poisonFail: bPoisonFailG, stoningFail: bStoningFailG, deathTouchFail: bDeathTouchFailG, dispelEvilFail: bDispelEvilFailG, exorciseFail: bExorciseFailG, destructionFail: bDestructionFailG, lifeStealMod: bLifeStealModG,
            poisonWith: bPoisonWithGaze, stoningWith: bStoningWithGaze, deathTouchWith: bDeathTouchWithGaze, dispelEvilWith: bDispelEvilWithGaze, exorciseWith: bExorciseWithGaze, destructionWith: bDestructionWithGaze, lifeStealWith: bLifeStealWithGaze, lifeStealRes: bLifeStealResG, placed: bTouchPlacedG, chains: bTouchChainsG }
      = gazeTouchParams(b, a, bGazeActiveP, bBlackSleep, opts.version, wantChains);

    // Gaze kill-roll probabilities (needed by buildGazeDist).
    const { stoningFail: aStoningGazeFailP, deathFail: aDeathGazeFailP,
            chains: aGazeKillChains }
      = gazeKillProbs(a, aStoningGazeActiveP, aDeathGazeActiveP, b, ver, wantChains);
    const { stoningFail: bStoningGazeFailP, deathFail: bDeathGazeFailP,
            chains: bGazeKillChains }
      = gazeKillProbs(b, bStoningGazeActiveP, bDeathGazeActiveP, a, ver, wantChains);

    // Immolation activation per phase.
    const aImmWithThrown = aHasImm && !aBlackSleep && immolationFiresInPhase(ver, 'thrown')
      && touchAttackFires(a.rtb, opts.version);
    const aImmWithGaze   = immolationFiresInPhase(ver, 'gaze') && aHasImm && aGazeActiveP;
    const bImmWithGaze   = immolationFiresInPhase(ver, 'gaze') && bHasImm && bGazeActiveP;
    const aImmWithMelee  = aHasImm && !aBlackSleep && touchAttackFires(a.atk, opts.version);
    const bImmWithMelee  = bHasImm && !bBlackSleep && touchAttackFires(b.atk, opts.version);

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
      lifeStealRes: aLifeStealResM,
      aTouchPlacedM,
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
      lifeStealRes: bLifeStealResM,
      bTouchPlacedM,
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
      // Wall of Fire has no attacking unit whose Mystic Surge/Eldritch Weapon can modify the
      // roll — those are attacker-sourced To Block adjustments in
      // `PROVENANCE[resolutionToBlockContext]` (`combat_phases.js`) — but the target's direct
      // Vertigo stat write still applies, recalculation having already made it
      // (`Reference docs/MoM binary analysis.md`, *Combat-effect stat writes*).
      aToBlock: aToBlockConventional,
      aHP: a.hp,
      aInvulnBonus,
      aAbilities: a.abilities,
      // Within this two-unit projection, Card B is the opposing owner whose present calculated
      // Amplifier can qualify the spell. Multiple copies remain a single Boolean adjustment.
      // The qualification and its Boolean shape are `PROVENANCE[wallOfFireAmplifierProjection]`
      // (`combat_special_attacks.js`), which also owns the projection itself: the engine scans
      // the whole combat for an opposing-owner Amplifier, and Card B stands in for that scan.
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
      aTouchPlacedG,
      aExorciseFailG,
      aDestructionFailG,
      aLifeStealWithGaze,
      aLifeStealModG,
      lifeStealRes: aLifeStealResG,
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
      bTouchPlacedG,
      bExorciseFailG,
      bDestructionFailG,
      bLifeStealWithGaze,
      bLifeStealModG,
      lifeStealRes: bLifeStealResG,
      version: ver,
    };

    // DOS represents its selected gaze as one shared-slot phase — the type contention is
    // `PROVENANCE[dosGazeTypeContention]` and the slot itself `PROVENANCE[dosSharedSpecialByte]`
    // (`combat_special_attacks.js`). Caster.exe instead makes six separately dealt ApplyAttack
    // calls in fixed Stoning/Death/Doom order, attacker group then defender group
    // (`$005B377B..$005B3996`, `Reference docs/Caster binary/CoM2 binary - combat flow.md`).
    // Keeping those as distinct joint phases makes every later call recompute living figures and
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
            // Structural only, and inert on this branch: `dispelEvilTouchRider` is scoped to
            // the two MoM builds, so `touchKeyInVersion` already zeroes the rider in the only
            // versions that reach here. No engine claim to source.
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
      const touch = touchParams(attacker, b, opts.version, touchActive, touchRecord, wantChains);
      // Caster.exe scores each derived channel against its own EffectiveDefense call, so the
      // chain a modern Thrown/Breath row shows is that call's, not the shared context entry.
      const thrownDefSink = isCoM2 && wantChains ? {} : null;
      const thrownDef = isCoM2
        ? computeCasterDefenseForAttack(b, attacker, ver, bVertigoDefPenalty, 'thrown',
          thrownDefSink)
        : bDefForThrown;
      return {
        touch,
        thrownDefChain: isCoM2
          ? (thrownDefSink ? thrownDefSink.chain : null)
          : defChains.bDefForThrown,
        phase: buildThrownPhase(active, {
          a: attacker,
          b,
          aDoomsB,
          aBlackSleep,
          aToHitRtbVert: isCoM2 ? attacker.toHitRtb : aToHitRtbVert,
          bDefForThrown: thrownDef,
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
          lifeStealRes: touch.lifeStealRes,
          aTouchPlacedT: touch.placed,
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
    const trackModernHealing = (
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
      || aDestructionWithGaze || bDestructionWithGaze
      // A DOS gaze carries the touch group, so a Stoning Touch placed on the ranged record
      // reaches the irrecoverable bucket without any melee or thrown placement to announce it
      // (`BU_ProcessAttack` merges the ranged flag record into every non-melee call). Without
      // this term the joint carries no per-path damage state for that exchange and the
      // post-combat composition reports the wound as wholly regular.
      || aStoningWithGaze || bStoningWithGaze);
    let joint = makeJoint2D(aRemHP, bRemHP,
      trackModernHealing ? { a, b } : null);
    let lifeStealEV_a = 0, lifeStealEV_b = 0;
    const breakdown = [];   // accumulate phase rows

    const pendingFear = { aFearDist: null, bFearDist: null };

    const applyThrownPhases = () => {
      for (const { attacker: channelAttacker, type: channelType, phase: thrownPhase, touch,
        thrownDefChain } of thrownPhases) {
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
          attackLabels: { def: thrownAttackName(channelType, aHaste && channelAttacker.rtb > 0) },
          riders: phaseRiderRows(r, 'def', 'atk',
            rowRiderChains(touch.chains, aDoomsB ? null : thrownDefChain, bImmChain)),
          defDestroyPct: jointDestroyedProbability(joint, 'b', bMargAtThrown, bRemHP) });
      }
    };

    // A modern gaze row is one `ApplyAttack` call and names one kill roll; a DOS row names
    // both when the unit has both. The row's own label flags are the activity gate the phase
    // was built from, so reading them here cannot show a chain for a roll this row's call did
    // not make.
    const gazeKillChainsForRow = (chains, labelParams) => [
      labelParams.stoningGaze ? chains.stoningGaze : null,
      labelParams.deathGaze ? chains.deathGaze : null,
    ];

    // Only a gaze's conventional component is scored against Defense, and the target's Black
    // Sleep turns that component into Doom damage — for the whole DOS row, whose builder passes
    // the flag down once, and among the modern rows for the Doom Gaze call alone, which is the
    // only modern gaze step that passes it (`combat_phases.js`, the gaze phase builders).
    // `gazeConsultsDefense` (`combat_special_attacks.js`) is the rule itself.
    const gazeDefenseChainForRow = (gazer, targetSleep, chain, labelParams) =>
      (gazeConsultsDefense(gazer, targetSleep && (!isCoM2 || !!labelParams.doomGaze))
        ? chain : null);

    // Immolation is a spell cast: the modern engine returns before reading Defense on Magic
    // Immunity, and Black Sleep turns it into Doom damage, so neither arm was scored against
    // one (`damageSpellConsultsDefense`, `combat_special_attacks.js`).
    const bImmChain = damageSpellConsultsDefense(ver, b.abilities)
      ? defChains.bDefForImm : null;
    const aImmChain = damageSpellConsultsDefense(ver, a.abilities)
      ? defChains.aDefForImm : null;

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
        attackLabels: { def: gazeLabel(labelParams.stoningGaze, labelParams.deathGaze, labelParams.doomGaze) },
        riders: phaseRiderRows(r, 'def', 'atk',
          rowRiderChains(aTouchChainsG,
            gazeDefenseChainForRow(a, bBlackSleep, defChains.bDefForGaze, labelParams),
            bImmChain, gazeKillChainsForRow(aGazeKillChains, labelParams))),
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
        attackLabels: { atk: gazeLabel(labelParams.stoningGaze, labelParams.deathGaze, labelParams.doomGaze) },
        riders: phaseRiderRows(r, 'atk', 'def',
          rowRiderChains(bTouchChainsG,
            gazeDefenseChainForRow(b, aBlackSleep, defChains.aDefForGaze, labelParams),
            aImmChain, gazeKillChainsForRow(bGazeKillChains, labelParams))),
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
        // Wall of Fire is not an `ApplyAttack` call, so it places no riders and `phaseRiderRows`
        // returns an empty array; the name is stated anyway so the row cannot be the one that
        // has a `melee` slot and nothing to call it.
        attackLabels: { atk: 'Wall of Fire' },
        riders: phaseRiderRows(r, 'atk', 'def'),
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

    // Exact feared-figure marginal for one modern ApplyAttack call at this joint snapshot.
    // Cause Fear lives inside `ApplyAttack`, so each call samples it independently, and
    // `PerformMeleeAttack` still makes a selected call against a target killed by an earlier
    // dealt phase: the only early return ahead of the fear loop is the `figs <= 0` test at
    // `$005B19D9`, which a zero-figure or Black-Sleeping source trips (`Reference docs/Caster
    // binary/Combat.ApplyAttack.pas`; `Reference docs/Caster binary/CoM2 binary - combat
    // flow.md`, *Ranged and melee attack dispatch*). The per-call presentation this feeds is
    // `SPEC.md`, *Combat resolution contract*, Fear presentation.
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
      // Per-cell CoM1 fallthrough → simultaneous melee+counter (single strike): CoM 1 alone
      // suppresses First Strike once the defender's top figure holds 25+ HP, read from the
      // record rather than from pending same-exchange damage (`Reference docs/MoM binary
      // analysis.md`, *First Strike's 24-HP cutoff and Haste repeats*), which is why the test
      // is per joint cell in `combat_state.js` and not a whole-exchange flag.
      // The row order these emit is `SPEC.md`, *Combat resolution contract*.

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
        lifeStealRes: aLifeStealResM,
        aTouchPlacedM,
        bBlurChance,
        blurBuggy,
        isCoM2,
        version: ver,
      });

      let fsResult;
      if (aHaste) {
        // Modern ApplyAttack calls sample independently — each attacker strike is its own
        // call and Cause Fear is inside it, so the two Hasted melee strikes make independent
        // Fear samples (`Reference docs/Caster binary/CoM2 binary - combat flow.md`, *Ranged
        // and melee attack dispatch*, `$005B3B48..$005B3BEE`). The DOS engines retain their
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
        attackLabels: { def: FIRST_STRIKE_ATTACK_NAME },
        riders: phaseRiderRows(fsResult.fsRiders, 'def', 'atk',
          rowRiderChains(aTouchChainsM, aMeleeDoomsB ? null : defChains.bDefVsA, bImmChain)),
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
          attackLabels: { def: secondStrikeAttackName(true), atk: counterAttackName(bCounterHaste) },
          riders: [...phaseRiderRows(fsResult.secondRiders, 'def', 'atk',
            rowRiderChains(aTouchChainsM, aMeleeDoomsB ? null : defChains.bDefVsA, bImmChain)),
          ...phaseRiderRows(fsResult.counterRiders, 'atk', 'def',
            rowRiderChains(bTouchChainsM, bMeleeDoomsA ? null : defChains.aDefVsB,
              aImmChain))],
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
          attackLabels: { atk: counterAttackName(bCounterHaste) },
          riders: phaseRiderRows(fsResult.counterRiders, 'atk', 'def',
            rowRiderChains(bTouchChainsM, bMeleeDoomsA ? null : defChains.aDefVsB, aImmChain)),
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
      // A Doom slot is not scored against Defense at all (`calcDoomDist`), so its base-roll
      // histogram carries no defense chain rather than one that explained nothing.
      const meleeRiderRows = [...phaseRiderRows(pair.ridersB, 'def', 'atk',
        rowRiderChains(aTouchChainsM, aMeleeDoomsB ? null : defChains.bDefVsA, bImmChain)),
      ...phaseRiderRows(pair.ridersA, 'atk', 'def',
        rowRiderChains(bTouchChainsM, bMeleeDoomsA ? null : defChains.aDefVsB, aImmChain))];
      // Melee+counter row appears when there's a preceding row, Haste is in play, or a rider
      // fired inside the exchange. A row carrying nothing but the two base-roll slots repeats
      // the totals the page already shows; a row carrying a rider does not, and that rider's
      // histogram has nowhere else to go (`CLAUDE.md`, *Input/output contract*) — a plain
      // unhasted melee is exactly the exchange that otherwise emits no phase row at all.
      const meleeCarriesRider = meleeRiderRows.some(rider => rider.key !== 'melee');
      if (breakdown.length > 0 || aHaste || bCounterHaste || meleeCarriesRider) {
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
          attackLabels: { def: meleeAttackName(aHaste), atk: counterAttackName(bCounterHaste) },
          riders: meleeRiderRows,
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
      aLifeStealDist: exactARawDist,
      aLifeStealRawDist: exactARawDist,
      aLifeStealRawExpected: expectedDamage(exactARawDist),
      aLifeStealExpected: exactABenefitDist
        ? expectedDamage(exactABenefitDist) : lifeStealEV_a,
      aHealedDamageDist: exactAHealedDist,
      aBonusHpDist: exactABonusDist,
      aAppliedHealingBenefitDist: exactABenefitDist,
      bLifeStealDist: exactBRawDist,
      bLifeStealRawDist: exactBRawDist,
      bLifeStealRawExpected: expectedDamage(exactBRawDist),
      bLifeStealExpected: exactBBenefitDist
        ? expectedDamage(exactBBenefitDist) : lifeStealEV_b,
      bHealedDamageDist: exactBHealedDist,
      bBonusHpDist: exactBBonusDist,
      bAppliedHealingBenefitDist: exactBBenefitDist,
      aPostCombatStateMean: jointCombatHealingStateMeans(joint, 'a', a,
        expectedDamage(totalDmgToA)),
      bPostCombatStateMean: jointCombatHealingStateMeans(joint, 'b', b,
        expectedDamage(totalDmgToB)),
      aRemHP, aHP: a.hp, aAlive,
      bRemHP, bHP: b.hp, bAlive,
    };
  }

  if (isRanged) {
    // --- Ranged: attacker shoots, no counter-attack ---
    // Invisible defender cannot be targeted by ranged attacks (unless attacker has Illusions
    // Immunity). This eligibility check is separate from, and earlier than, MoM's To Hit
    // penalty for the same state; both are `PROVENANCE[pairToHitModifiers]`
    // (`combat_phases.js`), which computes the `aCanSeeB` this reads.
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
    const rangedDefSink = rangedChannel && wantChains ? {} : null;
    const rangedDefense = rangedChannel
      ? computeCasterDefenseForAttack(b, rangedAttacker, ver, bVertigoDefPenalty, 'ranged',
        rangedDefSink)
      : bDefVsARanged;
    const rangedDefChain = rangedChannel
      ? (rangedDefSink ? rangedDefSink.chain : null)
      : defChains.bDefVsARanged;
    const rangedToBlock = rangedChannel
      ? buildToBlockContext(rangedAttacker, b, aVertigoBlockPenalty, bVertigoBlockPenalty, ver).bToBlockVsARangedEW
      : bToBlockVsARangedEW;

    // Rage: +1 ranged per figure lost — `PROVENANCE[rageEffectiveAttack]`
    // (`combat_special_attacks.js`), Warlord only. Ranged combat has no counter-attack, so only
    // pre-combat casualties contribute and aAlive is constant through the volley.
    const aRtbRanged = applyRage(rangedAttacker.rtb, rangedAttacker, aAlive);
    let dmgToB = aAlive > 0 && bRemHP > 0 && rangedAttacker.rtb > 0 && !aBlackSleep
      ? (aRangedDoomsB ? calcDoomDist(aAlive, aRtbRanged)
                 : calcTotalDamageDist(aAlive, aRtbRanged,
                     isCoM2 ? rangedAttacker.toHitRtb : aToHitRtbVert,
                     rangedDefense, rangedToBlock, b.hp, bInvulnBonus, bBlurChance, blurBuggy,
                     isCoM2 ? woundedTopFigHP(bRemHP, b.hp) : undefined, aMinDamageFromHits))
      : [1];

    // Touch attacks accompanying ranged use the general + ranged attack-flag records.
    // Warlord's manual describes a magical-ranged exclusion, but the dispatcher has
    // no blanket type gate; represented spells instead move or clear record values.
    // The conflict is recorded in `Reference docs/Source discrepancies.md` §14.
    const rangedTouchFires = touchAttackFires(rangedAttacker.rtb, opts.version);
    const { poisonStr: aPoisonStrR, poisonFail: aPoisonFailR, stoningFail: aStoningFailR, deathTouchFail: aDeathTouchFailR, dispelEvilFail: aDispelEvilFailR, exorciseFail: aExorciseFailR, destructionFail: aDestructionFailR, lifeStealMod: aLifeStealModR, lifeStealRes: aLifeStealResR, placed: aTouchPlacedR, chains: aTouchChainsR }
      = touchParams(rangedAttacker, b, opts.version, rangedTouchFires,
        touchRecordForPhase(ver, 'ranged'), wantChains);
    const aImmWithRanged = aHasImm && immolationFiresInPhase(ver, 'ranged') && rangedTouchFires;
    const aImmDistR = (aImmWithRanged && aAlive > 0 && bAlive > 0 && bRemHP > 0)
      ? calcDamageSpellDist(bAlive, immStr, a.toHitImmolation, bDefForImm,
        bToBlockVsAAll, b.hp, bInvulnBonus, aMinDamageFromHits,
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
      lifeStealMod: aLifeStealModR, lifeStealRes: aLifeStealResR,
      placed: aTouchPlacedR,
      immDist: aImmDistR,
      bloodsucker: hasAbil(a.abilities, 'bloodSucker'),
      sourceState: combatHealStateFromUnit(a),
      version: ver,
    };
    let tR = convolveTouchAttacks(dmgToB, aAlive, rangedTouchSpec);

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
      tR = repeatTouchAttack(tR, dmgToB, aAlive, rangedTouchSpec);
    }
    // The volley has no joint traversal to clip its published total, so it clips here, at the
    // same boundary and against the same figure: the HP B had entering the volley.
    dmgToB = clipDistAtRemainingHp(tR.dist, bRemHP);
    const aLifeStealDistR = tR.lifeStealDist;
    const aLifeStealExpectedR = tR.lifeStealEV;
    const rangedStateMeans = rangedCombatHealingStateMeans(tR.outcomes, a, b);

    return {
      phases: null,
      // The ranged volley resolves without a joint, so its rider marginals are read straight
      // off the same outcome accumulators the joint traversal would have walked. `attackLabels`
      // names the `melee` base-roll slot for the UI, the same way a breakdown row does.
      // Same two spell-path arms as the melee rows above: an Immolation the engine returns
      // from, or turns into Doom damage, was scored against no Defense.
      riders: phaseRiderRows(touchOutcomeRiders(tR), 'def', 'atk',
        rowRiderChains(aTouchChainsR, aRangedDoomsB ? null : rangedDefChain,
          damageSpellConsultsDefense(ver, b.abilities) ? defChains.bDefForImm : null)),
      attackLabels: { def: hasteDoublesRanged ? 'Hasted Ranged' : 'Ranged' },
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
