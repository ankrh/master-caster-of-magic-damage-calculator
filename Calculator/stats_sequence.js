// --- Unit Stat Derivation: the stat sequence (R1) ---
// One function per engine region, in execution order. `deriveUnitStats` (stats.js) computes the
// modifiers and hands them over as one context object.
//
// One phase-tagged list over one mutable record — `res`, `def`, `atk`, `rtb`, `hp` and the
// two gaze strengths, which share the engine's `.ranged` slot with `rtb`. Not a list per
// stat: an effect the engine makes as a single write to several stats — Darkness, Blaze of
// Glory, Warp — is one step here too, instead of being shredded across five places and
// reassembled by a comment. See SPEC.md, *Stat derivation contract*.
//
// List order *is* execution order. Phase is the evidence for a step's position: which
// region of the engine makes that write (steps.js, STEP_PHASES).
//
// Positions come from the region maps in *CoM2 analysis*, *Unit stat recalculation* and
// *Resolution-time modifiers*, and from *MoM analysis*, *Warp Creature runs early*, for the
// two DOS engines. Where the engines order an effect differently it appears twice, as
// version-exclusive steps — that keeps both the runner and the list trivial and makes the
// divergence visible instead of hidden in a condition. A step whose position is deduced
// rather than read is marked `provisional`, and says from what.
//
// Within a region, order only has consequences where a step *reads* — the scaling effects
// (Xenoveterinary, Upgraded Explosive, Colossal Strength, Energy Cannon, Blaze of Glory,
// Supreme Light) and the Warps. Those are placed exactly; purely additive neighbours are in
// the order their evidence lists them.

// `base`: the raw stats, and the writes the engines make permanently before the encounter.
function baseStatSteps(ctx) {
  const {
    abilByPhase, altarOfTheMoon, altarOfTheMoonResMod, altarOfTheMoonRtbMod, altarOfTheSun,
    altarOfTheSunMeleeMod, baseDoomGaze, baseGazeRanged, baseSequenceRangedType,
    baseSequenceThrownType, baseToBlkMod, baseToHitMod, baseToHitRtbMod,
    blackpowderFireBreathRtbMod, blackpowderRtbMod, calcBaseAtk, calcBaseDef, calcBaseHP,
    calcBaseRes, calcBaseRtb, dragonMound, dragonMoundDefMod, dragonMoundRtbMod, energyCannon,
    energyCannonOwnsThisPass, hasPermanentRangedStat, identity, isCoM1, isCoM2,
    lightningBladeConvertsThrown, lightningBladeGrantsBreath, ludusAgoge, ludusAgogeAtkMod,
    ludusAgogeHpMod, ludusAgogeResMod, ludusAgogeRtbMod, motherFungus, motherFungusAtkMod,
    motherFungusRtbMod, naturalSelectionCoalMod, naturalSelectionIronMod,
    naturalSelectionNightshadeMod, naturalSelectionPowerMineralsMod,
    naturalSelectionWildGameActive, pillarOfFaithResMod, poolOfRepentance, poolOfRepentanceDefMod,
    poolOfRepentanceResMod, rangedType, sanctaBasilica, sanctaBasilicaResMod,
    survivalInstinctToBlkBonus, thrownType,
  } = ctx;
  return [
    // PROVENANCE[stat:base]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:bbaf5fb67bb1734c03725bf1 | Reference docs/DOS reconstructed/unitcalc.c@span:38:e0f87a5a92f98f34754862e7 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:28:37555b7dcbc4b5de6fb91420
    statStep({ id: 'stat:base', phase: 'base',
      writes: ['res', 'def', 'atk', 'rtb', 'hp', 'gaze', 'doomGaze',
        'rangedType', 'thrownType'],
      apply: u => {
        u.res = calcBaseRes; u.def = calcBaseDef; u.atk = calcBaseAtk; u.rtb = calcBaseRtb;
        u.hp = calcBaseHP; u.gaze = baseGazeRanged; u.doomGaze = baseDoomGaze;
        u.rangedType = baseSequenceRangedType; u.thrownType = baseSequenceThrownType;
      } }),
    // PROVENANCE[chance:baseMelee]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:68be766c4016b25fd0a44be4 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:6fe92f163cbb9aea88131c8e
    statStep({ id: 'chance:baseMelee', sourceId: 'baseToHitMelee',
      sourceLabel: 'Base melee To Hit', phase: 'base', writes: ['toHit', 'toHitMelee'],
      when: () => baseToHitMod !== 0,
      apply: u => {
        if (isCoM2) u.toHit += baseToHitMod;
        else u.toHitMelee += baseToHitMod;
      } }),
    // PROVENANCE[chance:baseRtb]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:68be766c4016b25fd0a44be4 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:6fe92f163cbb9aea88131c8e
    statStep({ id: 'chance:baseRtb', sourceId: 'baseToHitRtb',
      sourceLabel: 'Base ranged/Thrown/Breath To Hit', phase: 'base',
      writes: ['toHitRtb'],
      when: () => baseToHitRtbMod !== (isCoM2 ? baseToHitMod : 0),
      apply: u => { u.toHitRtb += baseToHitRtbMod - (isCoM2 ? baseToHitMod : 0); } }),
    // PROVENANCE[chance:baseBlock]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:68be766c4016b25fd0a44be4 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:6fe92f163cbb9aea88131c8e
    statStep({ id: 'chance:baseBlock', sourceId: 'baseToBlock',
      sourceLabel: 'Base To Block', phase: 'base', writes: ['toBlk'],
      when: () => baseToBlkMod !== 0,
      apply: u => { u.toBlk += baseToBlkMod; } }),
    // CoM1's Zombies constructor starts the live To Block field at -1. This is an
    // identity-sourced write, but it belongs on the calculated stat sequence so its
    // effect is attributed to To Block rather than to the Special unit control.
    // PROVENANCE[identity:zombies:toBlock]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:4228875943f7a7458e2af96e
    statStep({ id: 'identity:zombies:toBlock', sourceId: 'zombies', sourceLabel: 'Zombies',
      phase: 'base', writes: ['toBlk'],
      when: () => isCoM1 && identity.specialUnit === 'zombies',
      // The DOS constructor stores a signed D10 threshold step. The calculator's accumulator
      // is percentage points, so one engine step is ten percentage points.
      apply: u => { u.toBlk -= 10; } }),
    ...abilByPhase.base,
    // PROVENANCE[altarOfTheMoon]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:10:6f667006e3c7a79f7c8a4862
    statStep({ id: 'altarOfTheMoon', phase: 'base', writes: ['res', 'rtb'],
      apply: u => { u.res += altarOfTheMoonResMod; u.rtb += altarOfTheMoonRtbMod; } }),
    // PROVENANCE[militaryWorkshop]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:24:ab44f1ca0fc9eab7723b232b
    statStep({ id: 'militaryWorkshop', phase: 'base', writes: ['rtb'],
      apply: u => { u.rtb += blackpowderRtbMod + blackpowderFireBreathRtbMod; } }),
    // Lightning Blade follows Military Workshop in CreateUnit.CAS. It assigns rather than adds
    // when no Thrown source exists, so an older Lightning Breath is replaced by strength 1.
    // PROVENANCE[lightningBlade:breath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:6:81632d425b80bc83dc627d23
    statStep({ id: 'lightningBlade:breath', sourceLabel: 'Lightning Blade', phase: 'base',
      writes: ['rtb', 'rangedType', 'thrownType'],
      when: () => lightningBladeConvertsThrown || lightningBladeGrantsBreath,
      apply: u => {
        u.rtb = lightningBladeConvertsThrown ? u.rtb + 1 : 1;
        u.rangedType = 'none';
        u.thrownType = 'lightning';
      } }),
    // PROVENANCE[poolOfRepentance]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:6:3e9df07e383cb9fc3cb6ec88
    statStep({ id: 'poolOfRepentance', phase: 'base', writes: ['res', 'def'],
      apply: u => { u.res += poolOfRepentanceResMod; u.def += poolOfRepentanceDefMod; } }),
    // Dragon Mound follows Pool of Repentance and precedes Agoge in CreateUnit.CAS.
    // PROVENANCE[dragonMound]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:071c420ab03821e688a6e290
    statStep({ id: 'dragonMound', phase: 'base', writes: ['def', 'rtb'],
      apply: u => { u.def += dragonMoundDefMod; u.rtb += dragonMoundRtbMod; } }),
    // The executing script also adds +1 to an existing ranged-strength field, despite
    // that write being omitted from Ludus Agoge's prose description.
    // PROVENANCE[ludusAgoge]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:16:74a31ea6126eaa0915ee33a2
    statStep({ id: 'ludusAgoge', phase: 'base', writes: ['res', 'atk', 'rtb', 'hp'],
      apply: u => {
        u.res += ludusAgogeResMod; u.atk += ludusAgogeAtkMod;
        u.rtb += ludusAgogeRtbMod; u.hp += ludusAgogeHpMod;
      } }),
    // PROVENANCE[motherFungus]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:13:5feb79a87ed503bfc3388e6a
    statStep({ id: 'motherFungus', sourceId: 'motherFungus', sourceLabel: 'Mother Fungus',
      phase: 'base', writes: ['atk', 'rtb', 'toBlk'],
      apply: u => {
        u.atk += motherFungusAtkMod; u.rtb += motherFungusRtbMod;
        u.toBlk += motherFungus ? 10 : 0;
      } }),
    // PROVENANCE[altarOfTheSun:holyMother]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:12:08e36e60187df8bc650c42c7
    statStep({ id: 'altarOfTheSun:holyMother', phase: 'base', writes: ['atk'],
      apply: u => { u.atk += altarOfTheSunMeleeMod; } }),
    // PROVENANCE[sanctaBasilica]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:4:39fc91fc980453890ebc8f7f
    statStep({ id: 'sanctaBasilica', phase: 'base', writes: ['res'],
      apply: u => { u.res += sanctaBasilicaResMod; } }),
    // PROVENANCE[naturalSelection:powerMinerals]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:11:6612cf82e93af571954fbfad
    statStep({ id: 'naturalSelection:powerMinerals', phase: 'base', writes: ['res'],
      apply: u => { u.res += naturalSelectionPowerMineralsMod; } }),
    // CreateUnit.CAS snapshots Resistance before either resource write, then processes
    // Nightshade second. When both are present, Nightshade replaces the Power-mineral bonus.
    // PROVENANCE[naturalSelection:nightshade]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:18:448497300397f81837f9b5ab
    statStep({ id: 'naturalSelection:nightshade', phase: 'base', writes: ['res'],
      apply: u => {
        if (naturalSelectionNightshadeMod) {
          u.res += naturalSelectionNightshadeMod - naturalSelectionPowerMineralsMod;
        }
      } }),
    // Wild Game uses the ranged snapshot taken beside the Resistance snapshot above.
    // PROVENANCE[naturalSelection:wildGame]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:18:448497300397f81837f9b5ab
    statStep({ id: 'naturalSelection:wildGame', phase: 'base', writes: ['rtb'],
      when: () => naturalSelectionWildGameActive && hasPermanentRangedStat,
      apply: u => { u.rtb += 1; } }),
    // PROVENANCE[naturalSelection:coal]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:26:cef191739c3f088137ea1ffc
    statStep({ id: 'naturalSelection:coal', phase: 'base', writes: ['atk'],
      apply: u => { u.atk += naturalSelectionCoalMod; } }),
    // PROVENANCE[naturalSelection:iron]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:30:b83cb1d01140dbc56424aff9
    statStep({ id: 'naturalSelection:iron', phase: 'base', writes: ['def'],
      apply: u => { u.def += naturalSelectionIronMod; } }),
    // PROVENANCE[pillarOfFaith]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:19:80527272b0e3dd1465419cc8
    statStep({ id: 'pillarOfFaith', phase: 'base', writes: ['res'],
      apply: u => { u.res += pillarOfFaithResMod; } }),
    // Energy Cannon is the last represented CreateUnit.CAS ranged-strength write, so its
    // +50% reads every earlier permanent ranged contribution in this sequence.
    // PROVENANCE[energyCannon]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:40a6858a207fd2460b6df58e
    statStep({ id: 'energyCannon', phase: 'base', writes: ['rtb', 'rangedType'],
      when: () => energyCannon && energyCannonOwnsThisPass,
      apply: u => {
        u.rtb += Math.floor(Math.max(0, u.rtb) / 2);
        u.rangedType = 'beam';
      } }),
    // PROVENANCE[chance:survivalInstinctToBlock]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:fafe4abfecfd17491cbdbc10
    statStep({ id: 'chance:survivalInstinctToBlock', sourceId: 'survivalInstinctToBlock',
      sourceLabel: 'Survival Instinct', phase: 'base', writes: ['toBlk'],
      when: () => survivalInstinctToBlkBonus !== 0,
      apply: u => { u.toBlk += survivalInstinctToBlkBonus; } }),
  ];
}

// `a`: precalc, in the binary.
function precalcBinaryStatSteps(ctx) {
  const {
    abilByPhase, ccFireBreathActive, ccFireBreathStrength, ccIndependentChannels, ccOwnsThisPass,
    identity, rangedType, thrownType, version,
  } = ctx;
  return [
    // Region `a` is narrow: Chaos Channels Fire Breath is its represented strength write;
    // its other represented writes are identity/flags. City Walls is not here: ApplyAttack
    // passes it as EffectiveDefense's
    // per-attack `extradef` argument after the finished region-e record is read.
    ...abilByPhase.a,
    // `Caster.exe` adds 4 to its independent Fire Breath field. The DOS engines assign their
    // shared secondary slot instead, after checking the version-specific admission gate.
    // PROVENANCE[chaosChannels:fireBreath]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:b9b73d98478711f2be56c0a9 | Reference docs/DOS reconstructed/unitcalc.c@span:7:8ee2be8fe3596d5bdc7acc0a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:c39e26f9ccd713b815403313
    statStep({ id: 'chaosChannels:fireBreath', sourceId: 'chaosChannels:fireBreath',
      sourceLabel: 'Chaos Channels', phase: 'a',
      writes: ['rtb', 'rangedType', 'thrownType'],
      when: () => ccFireBreathActive && ccOwnsThisPass,
      apply: u => {
        u.rtb = ccIndependentChannels ? u.rtb + ccFireBreathStrength : ccFireBreathStrength;
        u.rangedType = 'none'; u.thrownType = 'fire';
      } }),
  ];
}

// `b`: precalc, in UnitCalcPre.CAS (Warlord only).
function precalcScriptStatSteps(ctx) {
  const {
    abilByPhase, abilities, bombsGrenades, bombsGrenadesRtbMod, eternalNightRtbMod, fbBladeRtb,
    ffMeleeBonus, ffRtbMod, goblinPoxAtkMod, goblinPoxDefMod, goblinPoxResMod,
    godsPlayDicesResMod, greatUnbindingActive, greatUnbindingResMod, isWarlord, marionette,
    marionetteAttackBonus, marionetteDefenseBonus, marionetteOwned, marionetteOwnsThisRangedPass,
    marionetteRangedPass, marionetteStrayed, natureLinkResMod, outlanderRtbToHitBonus,
    plagueActive, plagueAtkMod, plagueDefMod, plagueResMod, soulFlayAtkMod, soulFlayDefMod,
    soulFlayResMod, thrownType, unitTypeVal, upgradedExplosive, upgradedExplosiveRangedMod,
    uphillBattleActive, warlordTrueLightStep, wofDefenderAtkMod, wofDefenderRtbMod,
  } = ctx;
  return [
    // Marionette's stat writes precede the later Outlander research block. This order is
    // observable because its Fantastic write makes Wanderer eligible for Xenoveterinary.
    // PROVENANCE[marionette:stats]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913
    statStep({ id: 'marionette:stats', sourceId: 'marionetteChanneler',
      sourceLabel: 'Marionette (Channeler)', phase: 'b', writes: ['atk', 'rtb', 'def'],
      when: () => marionetteOwned,
      apply: u => {
        u.atk += marionetteAttackBonus;
        if (marionetteOwnsThisRangedPass) u.rtb += marionetteAttackBonus;
        u.def += marionetteDefenseBonus;
      } }),
    // The strayed branch first grants Transmute Equipment; its hero augmentation block later
    // in this same hook runs before Rebuild and the Outlander research block.
    // PROVENANCE[marionette:strayedTransmute]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:e36dada50542233ab9fda915
    statStep({ id: 'marionette:strayedTransmute', sourceId: 'marionetteStrayed',
      sourceLabel: 'Marionette (strayed): Transmute Equipment', phase: 'b',
      writes: ['atk', 'rtb', 'def', 'res'], when: () => marionetteStrayed,
      apply: u => {
        u.atk += 2;
        if (marionetteRangedPass) u.rtb += 2;
        u.def += 2;
        u.res += 1;
      } }),
    // Rebuild's hero block immediately follows Transmute Equipment and precedes
    // Xenoveterinary in UnitCalcPre.CAS.
    ...abilByPhase.b.filter(step => step.id === 'rebuild'),
    // Warlord removes the compiled CoM2 hero package here, at UnitCalcPre.CAS:759-769,
    // before Fiery Fury and the later Outlander/True Light blocks. The compiled grant remains
    // at the end of region c, after Warp and Shatter.
    ...abilByPhase.b.filter(step => step.id === 'tactician:warlordClawback'),
    // Xenoveterinary's +25% (minimum +1) reads SHP at the head of the early pass
    // (UnitCalcPre.CAS:1038-1049), so it precedes every other phase-b HP write and does not
    // compound Lionheart, Endurance or Charm of Life, which are `c`.
    // PROVENANCE[outlanderXenoveterinary]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:8b96540daf4a2128b20b0aeb
    statStep({ id: 'outlanderXenoveterinary', sourceId: 'outlanderXenoveterinary',
      sourceLabel: 'Xenoveterinary', phase: 'b', writes: ['hp', 'toHit'],
      when: () => !!abilities.outlanderXenoveterinary,
      apply: u => {
        u.hp += Math.max(1, Math.floor(Math.max(0, u.hp) / 4));
        u.toHit += 10;
      } }),
    ...abilByPhase.b.filter(step => step.id !== 'rebuild'
      && step.id !== 'tactician:warlordClawback'),
    // The Outlander channel/common writes follow the script's own sequence:
    // Magitek Engine (ability step above), Ballistics, Xenopsychology, then Radio.
    // PROVENANCE[chance:outlanderBallisticsTraining]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:8:ba5b3ebcb89e99e403fbbac4
    statStep({ id: 'chance:outlanderBallisticsTraining',
      sourceId: 'outlanderBallisticsTraining', sourceLabel: 'Ballistics Training',
      phase: 'b', writes: ['toHitRtb'],
      when: () => outlanderRtbToHitBonus !== 0,
      apply: u => { u.toHitRtb += outlanderRtbToHitBonus; } }),
    // PROVENANCE[outlanderXenopsychology]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:3:60edcb4df0146e08c59fd67d
    statStep({ id: 'outlanderXenopsychology', phase: 'b', writes: ['res'],
      when: () => !!abilities.outlanderXenopsychology, apply: u => { u.res += 1; } }),
    // PROVENANCE[outlanderRadio]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:183cd9022f9df0e2b6d9514f
    statStep({ id: 'outlanderRadio', sourceId: 'outlanderRadio', sourceLabel: 'Radio',
      phase: 'b', writes: ['res', 'toHit', 'toBlk'],
      when: () => !!abilities.outlanderRadio, apply: u => {
        u.res += 1; u.toHit += 10; u.toBlk += 10;
      } }),
    // Conjuring Pact and Uphill Battle immediately follow the Outlander block.
    // PROVENANCE[chance:nausea]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:c7ec21b771edb6cb9bd17645
    statStep({ id: 'chance:nausea', sourceId: 'nausea', sourceLabel: 'Conjuring Pact nausea',
      phase: 'b', writes: ['toHit', 'toBlk'],
      when: () => isWarlord && !!abilities.nausea && isNormalUnitType(unitTypeVal),
      apply: u => { u.toHit -= 10; u.toBlk -= 10; } }),
    // PROVENANCE[uphillBattle]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:233a5a25490ae7a59c17106e
    statStep({ id: 'uphillBattle', sourceId: 'uphillBattle', sourceLabel: 'Uphill Battle',
      phase: 'b', writes: ['res', 'toHit', 'toBlk'],
      when: () => uphillBattleActive, apply: u => {
        u.res += 1; u.toHit += 10; u.toBlk += 10;
      } }),
    // Fiery Fury: melee at UnitCalcPre.CAS:832-846, and the ranged half of what the bucket
    // model merged into one `Math.max` term — see the M4 note at `fbBladeRtb`.
    // PROVENANCE[fieryFury]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:15:124bc19c147f5de83f487583 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:551d408ad4d5ae821c5eaf58 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:d7cdec7c168e641613b36c19
    statStep({ id: 'fieryFury', phase: 'b', writes: ['atk', 'rtb'],
      apply: u => { u.atk += ffMeleeBonus; u.rtb += ffRtbMod; } }),
    // PROVENANCE[wallOfFire:garrison]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:15:a221a36b384a9457291e5a8a
    statStep({ id: 'wallOfFire:garrison', phase: 'b', writes: ['atk', 'rtb'],
      apply: u => { u.atk += wofDefenderAtkMod; u.rtb += wofDefenderRtbMod; } }),
    // PROVENANCE[eternalNight:poorVision]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:714df04471d1c63eb32e3964
    statStep({ id: 'eternalNight:poorVision', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += eternalNightRtbMod; } }),
    // PROVENANCE[bombsGrenades]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:7:99e85b5dc6de1ad3f95908c1
    statStep({ id: 'bombsGrenades', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += bombsGrenadesRtbMod; } }),
    // PROVENANCE[upgradedExplosive:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:4:716e4812acd6432198553e28
    statStep({ id: 'upgradedExplosive:ranged', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += upgradedExplosiveRangedMod; } }),
    // The Fire Breath write is part of the same UnitCalcPre block as the ranged write.
    // Later phase-b effects such as True Light must see, but must not be included in,
    // this doubled subtotal.
    // PROVENANCE[upgradedExplosive:fireBreath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:4:716e4812acd6432198553e28
    statStep({ id: 'upgradedExplosive:fireBreath', phase: 'b', writes: ['rtb'],
      when: () => upgradedExplosive && thrownType === 'fire',
      apply: u => { u.rtb += Math.max(0, u.rtb); } }),
    // PROVENANCE[soulFlay]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:13:1a0ee111433e436b3c5da065
    statStep({ id: 'soulFlay', phase: 'b', writes: ['res', 'def', 'atk'],
      apply: u => {
        u.res += soulFlayResMod; u.def += soulFlayDefMod; u.atk += soulFlayAtkMod;
      } }),
    // PROVENANCE[goblinPox]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:19:4d062d7899f6c61a2403d4a4
    statStep({ id: 'goblinPox', phase: 'b', writes: ['res', 'def', 'atk'],
      apply: u => {
        u.res += goblinPoxResMod; u.def += goblinPoxDefMod; u.atk += goblinPoxAtkMod;
      } }),
    // PROVENANCE[greatUnbinding]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:17:51f2e6d3d15bd989ebfff7cd
    statStep({ id: 'greatUnbinding', sourceId: 'greatUnbinding', sourceLabel: 'Great Unbinding',
      phase: 'b', writes: ['res', 'toHit', 'toBlk'],
      apply: u => {
        u.res += greatUnbindingResMod;
        if (greatUnbindingActive) { u.toHit -= 20; u.toBlk -= 20; }
      } }),
    // PROVENANCE[natureLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:8d549c3c9d2b586869606d77
    statStep({ id: 'natureLink', phase: 'b', writes: ['res'],
      apply: u => { u.res += natureLinkResMod; } }),
    ...(isWarlord ? [warlordTrueLightStep] : []),
    // PROVENANCE[plague]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:52017a20d7efd62a9584c02a
    statStep({ id: 'plague', sourceId: 'plague', sourceLabel: 'Plague',
      phase: 'b', writes: ['res', 'def', 'atk', 'toHit'],
      apply: u => {
        u.res += plagueResMod; u.def += plagueDefMod; u.atk += plagueAtkMod;
        if (plagueActive) u.toHit -= 10;
      } }),
    // Xenopsychology and Radio are +1 Resistance each; the rest of what they grant is To Hit
    // and To Defend, which are not in the sequence yet.
    // PROVENANCE[godsPlayDices]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:14:34909b07ee2554c5452c485b
    statStep({ id: 'godsPlayDices', phase: 'b', writes: ['res'],
      apply: u => { u.res += godsPlayDicesResMod; } }),
  ];
}

// `c`: magic calc, in the binary, including the Warp Creature block.
function magicCalcBinaryStatSteps(ctx) {
  const {
    abilByPhase, abilities, armor, badMoonActive, blazingMarchRtbMod, ccFireBreathActive,
    chaosSurgeMeleeBonus, chaosSurgeResBonus, chaosSurgeRtbBonus, charmOfLifeActive,
    classicBerserk, com1DivineBarrierAura, com1GuidingBeaconAura, com1SoulLinkerAura,
    darkForceActive, darknessAtkBonus, darknessDefBonus, darknessResBonus, destinyActive,
    disciplineAtkMod, disciplineDefMod, disciplineRtbMod, doomGazeLvlMod, dosTrueLightStep,
    enduranceDefMod, enduranceHpMod, eternalNightEnemyResPenalty, flameBladeRangedStep,
    focusMagicActive, focusMagicConvertsRanged, focusMagicConvertsThrown, focusMagicCreatesRanged,
    focusMagicDoomGazeMod, gazeLvlMod, gazeWarpHalves, goodMoonActive, gsRtbMod, hasDarkness,
    hasMeleeAttack, heavenlyLightActive, heavenlyLightMeleeToHit, heavenlyLightRtbToHit,
    holyArmorActive, hwMeleeToHit, hwRtbToHit, identity, inputBaseAtk, isCoM1, isCoM2,
    isCoMVersion, isWarlord, landLinkingBreathRtbMod, level, lionheartHpMod, lionheartRtbMod, lvl,
    modernConventionalRangedPass, modernNodeBaseMeleePass, modernNodeSecondaryPass,
    natureConjunctionActive, nodeAuraActive, orihalconResMod, orihalconRtbMod, rangedType,
    realmWardActive, reinforceMagicRtbMod, rtbLvl, spellWardActive, supremeLightEligible,
    thrownType, unitIsChaos, unitTypeVal, version, vertigoActive, vertigoBlockPenalty,
    vertigoHitPenalty, warpRealityActive, weaknessRtbModBinary, weaponStatSteps,
  } = ctx;
  return [
    // Destiny's persistent identity/storage writes occur here, after UnitCalcPre, and its
    // calculated-record package immediately follows. Every permanent base write plus regions
    // a and b therefore feeds the six multipliers; level and Focus Magic remain later.
    // PROVENANCE[destiny]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:e90777a680ce0ccd0df5ea87
    statStep({ id: 'destiny', sourceLabel: 'Destiny', phase: 'c',
      writes: ['atk', 'rtb', 'def', 'res', 'hp'], when: () => destinyActive,
      apply: u => {
        u.atk *= 2; u.rtb *= 2; u.def += 4; u.res += 4; u.hp *= 2;
      } }),
    // The normal-unit level ladder is `@Units@ApplyLevelBonus` at +0x00D16, near the head of
    // modern region c and right after Destiny's permanent transformation. DOS calls its ladder
    // in the battle-unit constructor before the material block and BU_Apply_Specials. The helper
    // and runtime-table spans below cover every represented gate and cumulative value; separate
    // hero progression remains outside this step's supported scope.
    // PROVENANCE[level]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:11:3ebd099afdc1a9ba314313f2 | Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b | Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:ca745a122a23d618ddef5f78 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
    statStep({ id: 'level', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'hp', 'toHit',
        ...(!isCoM2 ? ['gaze', 'doomGaze'] : [])],
      apply: u => {
        u.res += lvl.res; u.def += lvl.def; u.atk += lvl.atk; u.rtb += rtbLvl; u.hp += lvl.hp;
        if (!isCoM2) {
          u.gaze += gazeLvlMod; u.doomGaze += doomGazeLvlMod;
        }
        u.toHit += lvl.toHit;
      } }),
    ...(!isCoM2 ? weaponStatSteps : []),
    ...(isCoM1 ? [flameBladeRangedStep] : []),
    // Focus Magic is +0x00D3F, immediately after the level ladder, so CoM2 and Warlord write its
    // attack-strength package before the Warps. Warlord's later CAS block moves touch riders but
    // makes no attack-strength write. CoM 1 executes Focus Magic in BU_Apply_Specials, after the
    // constructor's material block and after Flame Blade's ranged addition.
    // PROVENANCE[focusMagic]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:18:84c8baeb7a2f577dca38e056 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:38:5036ba273068428523d6008e
    statStep({ id: 'focusMagic', phase: 'c', writes: ['rtb', 'doomGaze'],
      when: () => focusMagicActive,
      apply: u => {
        const magicalRanged = u.rangedType === 'magic_c' || u.rangedType === 'magic_n'
          || u.rangedType === 'magic_s' || u.rangedType === 'beam';
        const breath = u.thrownType === 'fire' || u.thrownType === 'lightning';
        if (u.rtb > 0 && (magicalRanged || breath)) u.rtb += 3;
        u.doomGaze += focusMagicDoomGazeMod;
      } }),
    // The ranged branch follows the independent Doom/Breath additions in the same compiled
    // block. It reads the live post-level strength: physical ranged only changes type, Thrown
    // moves to conventional ranged at its current strength, and an empty ranged record gets 3.
    // PROVENANCE[focusMagic:conversion]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:20:fa0079de675211a02db49173 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:39:afc551599f5229a3bbe362bb
    statStep({ id: 'focusMagic:conversion', sourceId: 'focusMagic:conversion',
      sourceLabel: 'Focus Magic', phase: 'c',
      writes: ['rtb', 'rangedType', 'thrownType'],
      when: () => focusMagicConvertsThrown || focusMagicConvertsRanged
        || focusMagicCreatesRanged,
      apply: u => {
        if (focusMagicCreatesRanged) u.rtb = 3;
        else if (version === 'com_6.08') u.rtb = Math.max(u.rtb, 3);
        u.rangedType = 'magic_s';
        u.thrownType = 'none';
      } }),
    // Weapon material is `@Units@ApplyMagicWeapons` at +0x04B90, after the equipment loop —
    // also D25, also region c.
    // Dark Force precedes the defending-city/node package and ApplyMagicWeapons.
    // PROVENANCE[darkForce]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:b1b6be9c34cd3728a4158aad
    statStep({ id: 'darkForce', phase: 'c', writes: ['toHit', 'toBlk'],
      when: () => darkForceActive,
      apply: u => { u.toHit += 10; u.toBlk += 10; } }),
    // Heavenly Light and the friendly Guardian-node path share one compiled package. The
    // attack gates intentionally differ: persistent/base melee and current conventional Ranged.
    // PROVENANCE[heavenlyLight]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:e405a407e722dce9ad79aea3
    statStep({ id: 'heavenlyLight', phase: 'c', writes: ['def', 'res', 'atk', 'rtb'],
      when: () => heavenlyLightActive,
      apply: u => {
        u.def += 1; u.res += 1;
        if (inputBaseAtk > 0) u.atk += 1;
        if (modernConventionalRangedPass && u.rtb > 0) u.rtb += 1;
      } }),
    // PROVENANCE[chance:heavenlyLight:melee]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:ca247f52483258db47263f1f
    statStep({ id: 'chance:heavenlyLight:melee', sourceId: 'heavenlyLight',
      sourceLabel: 'Heavenly Light / Guardian node', phase: 'c', writes: ['toHitMelee'],
      when: () => heavenlyLightMeleeToHit !== 0,
      apply: u => { u.toHitMelee += heavenlyLightMeleeToHit; } }),
    // PROVENANCE[chance:heavenlyLight:rtb]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:ca247f52483258db47263f1f
    statStep({ id: 'chance:heavenlyLight:rtb', sourceId: 'heavenlyLight',
      sourceLabel: 'Heavenly Light / Guardian node', phase: 'c', writes: ['toHitRtb'],
      when: () => heavenlyLightRtbToHit !== 0,
      apply: u => { u.toHitRtb += heavenlyLightRtbToHit; } }),
    ...(isCoM2 ? weaponStatSteps : []),
    ...abilByPhase.cBeforeHolyArmor,
    // PROVENANCE[endurance]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:f1faba1a3ffce4883dce32c1 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:61c518b9d5be7ff83193cb0c | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:746a48490cec4055321bc210 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:746a48490cec4055321bc210
    statStep({ id: 'endurance', phase: 'c', writes: ['def', 'hp'],
      apply: u => { u.def += enduranceDefMod; u.hp += enduranceHpMod; } }),
    // PROVENANCE[discipline]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:445349dde257497d94440bc9
    statStep({ id: 'discipline', phase: 'c', writes: ['def', 'atk', 'rtb'],
      apply: u => {
        u.def += disciplineDefMod; u.atk += disciplineAtkMod; u.rtb += disciplineRtbMod;
      } }),
    // Each of these carries the type-conditional half of an effect whose flat half is an
    // ability step above — hence the `:<what it writes>` suffix on the shared name.
    ...(!isCoM1 ? [flameBladeRangedStep] : []),
    // PROVENANCE[landLinking:breath]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:3fa8c2fabf80e91cf859f9b0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:df8d58cf51472b304559af37
    statStep({ id: 'landLinking:breath', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += landLinkingBreathRtbMod; } }),
    // PROVENANCE[giantStrength:thrown]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:89de343d2e17866257ac560a
    statStep({ id: 'giantStrength:thrown', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += gsRtbMod; } }),
    // PROVENANCE[lionheart:rangedHp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:0e597d1ff73a00332d952e72 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:828f58debc909e639ff119f0
    statStep({ id: 'lionheart:rangedHp', phase: 'c', writes: ['rtb', 'hp'],
      apply: u => { u.rtb += lionheartRtbMod; u.hp += lionheartHpMod; } }),
    // Holy Armor writes defence *or* To Block: MoM always +2 defence, CoM/CoM2 +2 defence at
    // 5 armor or less and +10% To Block above it. The threshold reads the defence standing at
    // this position — under the buckets that needed a named subtotal (`defBase`); here it is
    // just the field's current value. +0x07407, so it is ahead of the node aura and of every
    // curse, and its threshold does not see them.
    // PROVENANCE[holyArmor]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:4:6281d5747830e7e40ac6cf0b | Reference docs/DOS reconstructed/unitcalc.c@span:7:b231f176981bd4242bc56846 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:45297c88e316d31043568fb9
    statStep({ id: 'holyArmor', phase: 'c',
      writes: ['def', 'toBlk'],
      when: () => holyArmorActive,
      apply: u => {
        if (isCoMVersion && u.def > 5) u.toBlk += 10;
        else u.def += 2;
      } }),
    // PROVENANCE[orihalcon]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:edcd009b70fbdd75f5a2cbd5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:ceaf7256e4e54cba7caba1c2
    statStep({ id: 'orihalcon', phase: 'c', writes: ['res', 'rtb'],
      apply: u => { u.res += orihalconResMod; u.rtb += orihalconRtbMod; } }),
    // PROVENANCE[chance:holyWeapon:melee]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:f35bf69e3356d00f90e013ed | Reference docs/DOS reconstructed/unitcalc.c@span:14:057c7ba8762bb65c4a011e69 | Reference docs/DOS reconstructed/unitcalc.c@span:12:1acacb263828739ad9aeab50 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:aeee04e431949f9a5f171311
    statStep({ id: 'chance:holyWeapon:melee', sourceId: 'holyWeapon',
      sourceLabel: 'Holy Weapon', phase: 'c', writes: ['toHitMelee'],
      when: () => hwMeleeToHit !== 0,
      apply: u => { u.toHitMelee += hwMeleeToHit; } }),
    // PROVENANCE[chance:holyWeapon:rtb]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:f35bf69e3356d00f90e013ed | Reference docs/DOS reconstructed/unitcalc.c@span:14:057c7ba8762bb65c4a011e69 | Reference docs/DOS reconstructed/unitcalc.c@span:12:1acacb263828739ad9aeab50 | Reference docs/DOS reconstructed/combat.c@span:11:be24e47e7e5719d3e16efdf5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:aeee04e431949f9a5f171311
    statStep({ id: 'chance:holyWeapon:rtb', sourceId: 'holyWeapon',
      sourceLabel: 'Holy Weapon', phase: 'c', writes: ['toHitRtb'],
      when: () => hwRtbToHit !== 0,
      apply: u => { u.toHitRtb += hwRtbToHit; } }),
    // Global enchantments, combat globals, and curses execute after Holy Armor's live
    // Defense test. Their ability steps must not participate in its > 5 branch decision.
    ...abilByPhase.c.filter(step => step.id !== 'mindStorm'),
    ...(!isWarlord && !isCoM2 && !isCoM1 ? [dosTrueLightStep] : []),
    // These explicit halves and live reads are also later region-c sites. Keep their source
    // order at this boundary; F20 owns exhaustive ordering against the remaining ability spread.
    // PROVENANCE[reinforceMagic:ranged]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:c46cf0a067fb9eff1afc4064
    statStep({ id: 'reinforceMagic:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += reinforceMagicRtbMod; } }),
    // Charm of Life reads live HP after every earlier HP writer, including Lionheart and Endurance.
    // PROVENANCE[charmOfLife]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:bac4e9b3eab5dcd73146e126 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:95fe4413d7ef9ab38400cfb7
    statStep({ id: 'charmOfLife', phase: 'c', writes: ['hp'],
      when: () => charmOfLifeActive,
      apply: u => { u.hp += Math.max(1, Math.trunc(u.hp / 4)); } }),
    // PROVENANCE[blazingMarch:ranged]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:26:19d9b3041c4cba25ac05eebb | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:22:dc7d9d2e0bc077c6e02314a1 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:4:948215fe7c75f15252145bd4 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:4:2e38314c2c8fd875465a75dd
    statStep({ id: 'blazingMarch:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += blazingMarchRtbMod; } }),
    // PROVENANCE[weakness:ranged]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:28:51bb7b42de5195f9edf69a86 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:e4cfc8d10fb6c6beee42bb6f
    statStep({ id: 'weakness:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += weaknessRtbModBinary; } }),
    // PROVENANCE[chaosSurge]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:8aac79f44ffe2fbae619cb5d | Reference docs/DOS reconstructed/unitcalc.c@span:28:ef6419306ce4c0b275103ee1 | Reference docs/DOS reconstructed/unitcalc.c@span:29:0f32c183c37c88a243ddb6cf | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:29:bc81b31ab5f15a3717465711
    statStep({ id: 'chaosSurge', phase: 'c',
      writes: ['res', 'atk', 'rtb', 'gaze', 'doomGaze'],
      apply: u => {
        u.res += chaosSurgeResBonus;
        if ((isCoM2 && hasMeleeAttack) || (!isCoM2 && u.atk > 0))
          u.atk += chaosSurgeMeleeBonus;
        if (isCoM2) {
          if (rangedType !== 'none'
              || ((thrownType === 'fire' || thrownType === 'lightning') && u.rtb > 0))
            u.rtb += chaosSurgeRtbBonus;
        } else if (u.rtb > 0 && !(ccFireBreathActive && version.startsWith('mom'))) {
          u.rtb += chaosSurgeRtbBonus;
        }
        if (!isCoM2) {
          if (u.gaze > 0) u.gaze += chaosSurgeRtbBonus;
          if (u.doomGaze > 0) u.doomGaze += chaosSurgeRtbBonus;
        }
      } }),
    // Berserk doubles melee and sets defence to 0 absolutely. MoM-only, and MoM's recompute
    // has not been decoded here, so the position is deduced: last thing before the Warps,
    // which is where the pre-R1 model effectively had it.
    // PROVENANCE[berserk]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:086abf5cb60f1b58a36ab85f
    statStep({ id: 'berserk', phase: 'c', writes: ['def', 'atk'], provisional: true,
      when: () => classicBerserk, apply: u => { u.def = 0; u.atk *= 2; } }),

    // CoM2/Warlord's Eternal Night resistance write (+0x089A8/+0x0A8A2) precedes the
    // compiled Darkness block (+0x0A8DA/+0x0A90F). Both are before the Warps. CoM 1 instead
    // writes its Eternal Night penalty after Tactician, below.
    // PROVENANCE[eternalNight:enemyResistance]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:3810e1c47b8eb421a7ebb24f
    statStep({ id: 'eternalNight:enemyResistance', phase: 'c', writes: ['res'],
      when: () => !isCoM1 && eternalNightEnemyResPenalty !== 0,
      apply: u => { u.res += eternalNightEnemyResPenalty; } }),
    // The DOS recompute writes the same +2 package near the head of region c. Caster.exe
    // dispatches its native node aura after the global-enchantment block and before the Moon
    // events/combat globals. The melee gate reads persistent BaseUnits.attack; conventional
    // Ranged and both Breath gates read their current fields. Thrown and every Gaze are absent.
    // PROVENANCE[nodeAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:31:548c2c98c01394a296fa188a
    statStep({ id: 'nodeAura', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => nodeAuraActive,
      apply: u => {
        u.res += 2; u.def += 2;
        if (!isCoM2) {
          u.atk += 2;
          if (u.rtb > 0) u.rtb += 2;
          if (u.gaze > 0) u.gaze += 2;
          if (u.doomGaze > 0) u.doomGaze += 2;
        } else {
          if (modernNodeBaseMeleePass) u.atk += 2;
          if (modernNodeSecondaryPass && u.rtb > 0) u.rtb += 2;
        }
      } }),
    // CoM 1 jumps to this relocated side-maximum tail after its node/Guardian package and
    // returns before Heavenly Light and the curse/Warp tail. Unlike the modern aura pass, these
    // writes therefore remain visible to later reductions and the terminal clamp.
    // PROVENANCE[guidingBeaconAura:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:438880febda217f547fcb0e5
    statStep({ id: 'guidingBeaconAura:coM1', sourceId: 'guidingBeaconAura',
      sourceLabel: 'Guiding Beacon aura', phase: 'c', writes: ['rtb'],
      when: () => com1GuidingBeaconAura > 0,
      apply: u => {
        if (u.rangedType === 'missile' || u.rangedType === 'boulder'
            || isMagicalRangedType(u.rangedType)) u.rtb += com1GuidingBeaconAura;
      } }),
    // PROVENANCE[divineBarrierAura:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:12:d15683dae66a031390912a26
    statStep({ id: 'divineBarrierAura:coM1', sourceId: 'divineBarrierAura',
      sourceLabel: 'Divine Barrier aura', phase: 'c', writes: ['def'],
      when: () => com1DivineBarrierAura > 0,
      apply: u => { u.def += com1DivineBarrierAura; } }),
    // PROVENANCE[soulLinkerAura:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:ddbd60d42c3858e92689d2e8
    statStep({ id: 'soulLinkerAura:coM1', sourceId: 'soulLinkerAura',
      sourceLabel: 'Soul Linker aura', phase: 'c', writes: ['toHit', 'toBlk'],
      when: () => com1SoulLinkerAura > 0 && identity.fantastic,
      apply: u => {
        u.toHit += Math.ceil(com1SoulLinkerAura / 2);
        u.toBlk += Math.floor(com1SoulLinkerAura / 2);
      } }),
    // The three astronomical events follow the native node aura and read base Fantastic while
    // testing attack channels on their current values.
    // PROVENANCE[badMoon]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:b777912e0cccc18e4cbd7c0a
    statStep({ id: 'badMoon', phase: 'c', writes: ['res'],
      when: () => badMoonActive, apply: u => { u.res -= 3; } }),
    // PROVENANCE[goodMoon]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:f594baaf8096788dd3657cd6
    statStep({ id: 'goodMoon', phase: 'c', writes: ['def', 'atk', 'rtb'],
      when: () => goodMoonActive,
      apply: u => {
        u.def += 1;
        if (u.atk > 0) u.atk += 1;
        if (modernConventionalRangedPass && u.rtb > 0) u.rtb += 1;
      } }),
    // PROVENANCE[natureConjunction]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:4c6f881ef1f956f17e1bd803
    statStep({ id: 'natureConjunction', phase: 'c', writes: ['res', 'def', 'atk', 'rtb'],
      when: () => natureConjunctionActive,
      apply: u => {
        u.res += 2; u.def += 2;
        if (u.atk > 0) u.atk += 2;
        if (modernConventionalRangedPass && u.rtb > 0) u.rtb += 2;
      } }),
    // PROVENANCE[darkness]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:30:a43a4b9b9c796ff5baa3e070 | Reference docs/DOS reconstructed/unitcalc.c@span:30:a6f103fc8632f6d1513712c0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:29:18f99324928d11bffe6f2858 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:e289006c649dcfb1c6e9a280
    statStep({ id: 'darkness', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => !isCoM1 && hasDarkness,
      apply: u => {
        if (isCoM2) {
          if (darknessResBonus > 0 || u.res > 0) u.res += darknessResBonus;
          if (darknessDefBonus > 0 || u.def > 0) u.def += darknessDefBonus;
          if (u.atk > 0) u.atk += darknessAtkBonus;
          if (u.rtb > 0) u.rtb += darknessAtkBonus;
        } else {
          u.res += darknessResBonus;
          u.def += darknessDefBonus;
          if (darknessAtkBonus < 0 || u.atk > 0) u.atk += darknessAtkBonus;
          if (darknessAtkBonus < 0 || u.rtb > 0) u.rtb += darknessAtkBonus;
          if (darknessAtkBonus < 0 || u.gaze > 0) u.gaze += darknessAtkBonus;
          if (darknessAtkBonus < 0 || u.doomGaze > 0) u.doomGaze += darknessAtkBonus;
        }
      } }),

    // Warp Reality and Vertigo are recalculation writes, not resolution-time projections.
    // Their signed common Hit/To Defend values must therefore reach the region-e clamp in order.
    // PROVENANCE[chance:warpReality]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:e5f3d5a32258982e16c67cb1 | Reference docs/DOS reconstructed/unitcalc.c@span:5:b56d82758c8a1388b292e2a1 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:5536c22c25f21fbaeed04a18
    statStep({ id: 'chance:warpReality', sourceId: 'warpReality', sourceLabel: 'Warp Reality',
      phase: 'c', writes: ['toHit'], when: () => warpRealityActive && !unitIsChaos,
      apply: u => { u.toHit -= 20; } }),
    // PROVENANCE[chance:vertigo]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:988ef64cd77214c23cb77397 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:a8adaeabe8e52ff5c76f42d2
    statStep({ id: 'chance:vertigo', sourceId: 'vertigo', sourceLabel: 'Vertigo',
      phase: 'c', writes: ['toHit', 'toBlk'], when: () => vertigoActive,
      apply: u => {
        u.toHit -= vertigoHitPenalty * 100;
        u.toBlk -= vertigoBlockPenalty * 100;
      } }),
    // Mind Storm follows Vertigo and Weakness in the direct-curse tail and immediately
    // precedes the three Warp Creature variants. Its modern secondary write is limited to
    // conventional Ranged and Thrown by the source-shaped ability step.
    ...abilByPhase.c.filter(step => step.id === 'mindStorm'),

    // --- The Warp Creature block, and Shatter immediately after it ---
    // D22. Every engine runs these inside the recompute, in the order Attack → Defense →
    // Resist → Shatter, and every engine keeps writing stats afterwards — so what an engine
    // writes *after* them is the whole of the divergence, and one position serves all three:
    //   MoM 1.31 / CP 1.60  0x90A63-0x90AC9, then Shatter, then the terminal clamp
    //   CoM 1               0x9074C-0x90795, then Shatter 0x907DC, then Darkness, Supreme
    //                       Light, Tactician and Eternal Night — the `afterWarp` splice below
    //   CoM2 / Warlord      +0x0BA3C-+0x0BDF7, then Shatter +0x0BF62, then Tactician
    //                       +0x0C890, then the whole of `d` and the whole of `e`
    // Nothing between the previous step and here is one of CoM 1's post-Warp writes, which is
    // what lets its early Warp and MoM's late one share a position.
    // PROVENANCE[warpAttack]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:94df6310cdbc37d8f35f6897 | Reference docs/DOS reconstructed/unitcalc.c@span:10:7afd072fad52d77073116162 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:feb1881464c0e2f5a90f9f97
    statStep({ id: 'warpAttack', phase: 'c',
      writes: ['atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => !!(abilities && abilities.warpAttack),
      apply: u => {
        u.atk = isCoM2 ? Math.trunc(u.atk / 2) : Math.floor(u.atk / 2);
        if (isCoMVersion)
          u.rtb = isCoM2 ? Math.trunc(u.rtb / 2) : Math.floor(u.rtb / 2);
        // gazeWarpHalves: CoM 1 only — 0x90764-0x90772 has no ranged_type test, so the
        // halving reaches a gaze. MoM's Warp Attack touches melee only, and CoM2's leaves
        // the gaze fields alone (they are separate fields in `Caster.exe`).
        if (gazeWarpHalves) {
          u.gaze = Math.floor(u.gaze / 2);
          u.doomGaze = Math.floor(u.doomGaze / 2);
        }
      } }),
    // PROVENANCE[warpDefense]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:20:4ade353524404839658c2a92 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:5:f4bf3085892f0c76764a91bc
    statStep({ id: 'warpDefense', phase: 'c', writes: ['def'],
      when: () => !!(abilities && abilities.warpDefense),
      apply: u => {
        u.def = isCoM1 ? Math.trunc(u.def / 3)
          : Math.floor(u.def / (isCoMVersion ? 3 : 2));
      } }),
    // PROVENANCE[warpResist]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:4:af84302cc4211baa873b72e0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:5:a15539b1a7a69de6c7548391
    statStep({ id: 'warpResist', phase: 'c', writes: ['res'],
      when: () => !!(abilities && abilities.warpResist), apply: u => { u.res = 0; } }),
    // Shatter reduces every attack strength to 1. CoM2: normal units and heroes only;
    // Warlord: any unit.
    // PROVENANCE[shatter]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:23:9d5c1cf547d632005ddeebe5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:b34c35cb9bf68bf3402e6d27
    statStep({ id: 'shatter', phase: 'c', writes: ['atk', 'rtb'],
      when: () => !!(abilities && abilities.shatter)
        && (isWarlord || isNormalUnitType(unitTypeVal) || unitTypeVal === 'hero'),
      apply: u => { if (u.atk > 0) u.atk = 1; if (u.rtb > 0) u.rtb = 1; } }),

    // --- c, after the Warp block ---
    // CoM 1 only: Darkness at 0x9084C, then Supreme Light at 0x90992. Both land at full value
    // on the reduced stat. Eternal Night is deliberately not folded in: it is after Tactician.
    // PROVENANCE[darkness:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:8:7e6d93372e0de3d445a9db2b | Reference docs/DOS reconstructed/unitcalc.c@span:12:750dc4f6540b4d84533b2557
    statStep({ id: 'darkness:coM1', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => isCoM1 && hasDarkness,
      apply: u => {
        u.res += darknessResBonus;
        u.def += darknessDefBonus;
        if (darknessAtkBonus < 0 || u.atk > 0) u.atk += darknessAtkBonus;
        if (darknessAtkBonus < 0 || u.rtb > 0) u.rtb += darknessAtkBonus;
        if (darknessAtkBonus < 0 || u.gaze > 0) u.gaze += darknessAtkBonus;
        if (darknessAtkBonus < 0 || u.doomGaze > 0) u.doomGaze += darknessAtkBonus;
      } }),
    // Q7, closed: `defense += resistance / 3` is a **live** read of the record, taken where the
    // engine takes it — after Warp Resist and Darkness, before Tactician (0x90992-0x90A53).
    // PROVENANCE[supremeLight:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:b1236fda671c45bc369f8550
    statStep({ id: 'supremeLight:coM1', phase: 'c', writes: ['def', 'atk', 'rtb'],
      when: () => isCoM1 && supremeLightEligible,
      apply: u => {
        u.def += Math.trunc(u.res / 3);
        u.atk += 2;
        if (u.rtb > 0) u.rtb += 2;
      } }),
    // PROVENANCE[realmWard]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:5cd2715b00a3b65a8943c24e
    statStep({ id: 'realmWard', phase: 'c', writes: ['toHit', 'def', 'res'],
      when: () => realmWardActive,
      apply: u => { u.toHit -= 20; u.def -= 3; u.res -= 3; } }),
    // Spell Ward follows Terror and the Warp/Shatter tail, before Tactician.
    // PROVENANCE[spellWard]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:23:f2d06ed57305602954b1a140
    statStep({ id: 'spellWard', phase: 'c', writes: ['toHit', 'def', 'res'],
      when: () => spellWardActive,
      apply: u => { u.toHit -= 20; u.def -= 3; u.res -= 3; } }),
    // Tactician, for every CoM engine: CoM 1 at 0x90AB4, CoM2/Warlord at +0x0C890.
    ...abilByPhase.cAfterWarp,
    // CoM 1's Eternal Night resistance penalty is the final stat write before the terminal
    // clamp (0x90B31): after Darkness, Supreme Light's live read, and Tactician.
    // PROVENANCE[eternalNight:enemyResistance:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:17:72658795c2f8899328df83db
    statStep({ id: 'eternalNight:enemyResistance:coM1', phase: 'c', writes: ['res'],
      when: () => isCoM1 && eternalNightEnemyResPenalty !== 0,
      apply: u => { u.res += eternalNightEnemyResPenalty; } }),
  ];
}

// `d`: magic calc, in UnitCalc.CAS (Warlord only).
function magicCalcScriptStatSteps(ctx) {
  const {
    abilByPhase, abilities, blazeOfGloryActive, colossalScaled, colossalStrength, energyCannon,
    hasMeleeAttack, hurricaneActive, hurricaneRtbPenalty, input, isWarlord, levelRank,
    modernChannelKey, pneumaFieldActive, psychoForceActive, rangedType, shadowStrikeApplies,
    thrownType, trueSightRtbToHitBonus, vampirismActive, vampirismAggregateTransfer,
    warlordBerserk, warlordCombatFlameBlade, weaknessRtbModCas,
  } = ctx;
  return [
    // UnitCalc.CAS line order is load-bearing for the chance record. Mechanical Expert is
    // the first represented phase-d chance writer.
    ...abilByPhase.d.filter(step => step.id === 'mechanicalExpert'),
    // PROVENANCE[weakness:breath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:a64ed4008bd0ec13a817f841
    statStep({ id: 'weakness:breath', phase: 'd', writes: ['rtb'],
      apply: u => { u.rtb += weaknessRtbModCas; } }),
    // PROVENANCE[chance:trueSight:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:4e6f968fae0403b40874b647
    statStep({ id: 'chance:trueSight:ranged', sourceId: 'trueSight', sourceLabel: 'True Sight',
      phase: 'd', writes: ['toHitRtb'], when: () => trueSightRtbToHitBonus !== 0,
      apply: u => { u.toHitRtb += trueSightRtbToHitBonus; } }),
    // Combat-cast Flame Blade's script-only point is Fire Breath, not the selected shared
    // secondary channel. It executes after True Sight and before Berserk, so Warp (region c)
    // cannot halve it and Colossal Strength (later in d) does not scale it.
    // PROVENANCE[flameBlade:fireBreath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:4:549122cfd5e672f77f13100e
    statStep({ id: 'flameBlade:fireBreath', sourceId: 'flameBlade',
      sourceLabel: 'Flame Blade', phase: 'd', writes: ['rtb'],
      when: () => warlordCombatFlameBlade
        && (modernChannelKey ? modernChannelKey === 'fireBreath' : thrownType === 'fire'),
      apply: u => { u.rtb += 1; } }),
    // PROVENANCE[chance:berserkWarlord]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:6:1f86b30d6505c657da0d1205
    statStep({ id: 'chance:berserkWarlord', sourceId: 'berserkWarlord', sourceLabel: 'Berserk',
      phase: 'd', writes: ['toHit', 'toBlk'], when: () => warlordBerserk,
      apply: u => { u.toHit += 15; u.toBlk -= 10; } }),
    ...abilByPhase.d.filter(step => step.id === 'rust'),
    // Hurricane writes the selected modern channel modifier. The card's compatibility pass
    // represents exactly one ranged/Thrown/Breath channel at a time.
    // PROVENANCE[chance:hurricane]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:16:06e78c928483b8a3e5c56c68
    statStep({ id: 'chance:hurricane', sourceId: 'hurricane', sourceLabel: 'Hurricane',
      phase: 'd', writes: ['toHitRtb'], when: () => hurricaneActive,
      apply: u => { u.toHitRtb -= hurricaneRtbPenalty * 100; } }),
    // Favored Terrain is later in the same script, after Hurricane.
    ...abilByPhase.d.filter(step => step.id === 'favoredTerrain'),
    // Colossal Strength scales the attack as it stands at its own position in `d`
    // (UnitCalc.CAS:1227-1243 reads GetStat there), so everything before it in the file
    // scales and everything after does not. Under the buckets its input was a named subtotal;
    // here it is just `u.atk`.
    // PROVENANCE[colossalStrength]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:14:0df535b06a7a126d328bccbb
    statStep({ id: 'colossalStrength', phase: 'd', writes: ['atk', 'rtb'],
      when: () => colossalStrength,
      apply: u => {
        if (hasMeleeAttack) u.atk += colossalScaled(u.atk);
        const physicalSecondary = u.rangedType === 'missile' || u.rangedType === 'boulder'
          || u.thrownType === 'thrown';
        if (u.rtb > 0 && physicalSecondary) u.rtb += colossalScaled(u.rtb);
      } }),
    // The script snapshots Thrown / 2 and (Fire + Lightning) / 2, truncates their combined
    // total once, adds it to melee, then resets each positive source field independently.
    // A probe captures the source value at this exact position without executing the writes.
    // PROVENANCE[vampirism:transfer]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:14:c5d3faadcc9d84865b5f1463
    statStep({ id: 'vampirism:transfer', sourceId: 'vampirism:transfer',
      sourceLabel: 'Vampirism', phase: 'd',
      writes: ['atk', 'rtb', 'vampirismSourceStrength'],
      when: u => vampirismActive && (input._vampirismProbe
        || vampirismAggregateTransfer != null
        || (u.rtb > 0 && ['thrown', 'fire', 'lightning'].includes(u.thrownType))),
      apply: u => {
        const source = u.rtb > 0 && ['thrown', 'fire', 'lightning'].includes(u.thrownType)
          ? u.rtb : 0;
        if (input._vampirismProbe) {
          u.vampirismSourceStrength = source;
          return;
        }
        u.atk += vampirismAggregateTransfer == null
          ? Math.trunc(source / 2) : vampirismAggregateTransfer;
        if (source > 0) u.rtb = 1;
      } }),
    // Shadow Strike follows both Colossal Strength and Vampirism, and therefore reads their
    // live melee result. It writes the independent Thrown field even when another modern
    // attack exists; child passes preserve that channel separation.
    // PROVENANCE[shadowStrike:thrown]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:1a3b77e0b9b6ad575bde5d74
    statStep({ id: 'shadowStrike:thrown', sourceId: 'shadowStrike:thrown',
      sourceLabel: 'Shadow Strike', phase: 'd',
      writes: ['rtb', 'rangedType', 'thrownType'], when: () => shadowStrikeApplies,
      apply: u => {
        u.rtb += 1 + Math.trunc(u.atk / 3);
        u.rangedType = 'none';
        u.thrownType = 'thrown';
      } }),
    // Psycho Force (UnitCalc.CAS:1413-1417) and Pneuma Field (:1419-1425) both *read*
    // `GETSTAT(U,SResist,0)` — the Resistance standing at their own position in `d`. That is
    // before region `e`, so neither sees the aura pass: a Holy Bonus or Resistance to All aura
    // raises Resistance afterwards and must not feed either effect. Reading the finished record
    // instead — which is what the pre-step code did — over-applied both whenever an aura was
    // present. `%I` is the integer part, so the division truncates toward zero rather than
    // flooring, which is visible only when a curse has driven Resistance negative.
    // PROVENANCE[psychoForce]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:4:f3235558e9ec7dbd4427844b
    statStep({ id: 'psychoForce', sourceId: 'psychoForce', sourceLabel: 'Psycho Force',
      phase: 'd', writes: ['toHit', 'toBlk'],
      when: () => psychoForceActive,
      apply: u => {
        const psyche = Math.trunc(u.res * levelRank / 2);
        u.toHit += psyche;
        u.toBlk += psyche;
      } }),
    // PROVENANCE[pneumaField]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:7:7f0a838eb82f6cc67584d242
    statStep({ id: 'pneumaField', phase: 'd', writes: ['lifeSteal'],
      when: () => pneumaFieldActive,
      apply: u => {
        const drain = Math.trunc(u.res / 2);
        u.lifeSteal = (u.lifeSteal != null && u.lifeSteal <= 0) ? u.lifeSteal - drain : -drain;
      } }),
    // Energy Cannon reads the live common-plus-ranged threshold here, before region e, and
    // caps only its upper bound. Preserve that snapshot on the same ordered record.
    // PROVENANCE[chance:energyCannonThreshold]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:9:415a610fbab04f989880d02e
    statStep({ id: 'chance:energyCannonThreshold', sourceId: 'energyCannon',
      sourceLabel: 'Energy Cannon', phase: 'd', writes: ['energyCannonToHit'],
      when: () => energyCannon,
      apply: u => { u.energyCannonToHit = Math.min(100, u.toHit + u.toHitRtb); } }),
    // The three effects that close `UnitCalc.CAS`, in its own line order: Blaze of Glory
    // (:1490), Beat of Swiftness (:1509), Hierophany (:1555). All three follow Colossal
    // Strength, and — now that the Warps are in `c` — all three follow those too.
    //
    // Blaze of Glory reads the unit's current Armor, adds that whole value to melee, then
    // subtracts the same value from Defense. The result at this position is exactly zero,
    // including Armor granted by enchantments; later region-e auras can still add Defense.
    // PROVENANCE[blazeOfGlory]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:12:e27e857d1cda6919711e5456
    statStep({ id: 'blazeOfGlory', phase: 'd', writes: ['def', 'atk'],
      when: () => blazeOfGloryActive,
      apply: u => {
        u.atk += u.def;
        u.def = 0;
      } }),
    // PROVENANCE[beatOfSwiftness]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:6:7f8a22e8f9456e94a223b150
    statStep({ id: 'beatOfSwiftness', phase: 'd', writes: ['def'],
      when: () => isWarlord && !!(abilities && abilities.beatOfSwiftness),
      apply: u => { u.def -= roundTiesToEven(u.def / 10); } }),
    // PROVENANCE[hierophany]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:8:d2bbbf57ed3ded3bf92652f9
    statStep({ id: 'hierophany', phase: 'd', writes: ['def'],
      when: () => isWarlord && !!(abilities && abilities.hierophany),
      apply: u => { u.def = Math.floor(u.def * 0.5); } }),
  ];
}

// `e`: the binary's post-hook tail.
function postHookStatSteps(ctx) {
  const {
    abilByPhase, armor, baseDoomGaze, baseGazeRanged, blazeOfGloryActive, hasMeleeAttack, isCoM1,
    isCoM2, rtbStatActive, supremeLightEligible, supremeLightRtbMod,
  } = ctx;
  return [
    // The engine clamps here and nowhere else (+0x0CCBC), after `d` and *before* the aura pass
    // and Supreme Light — so those writes are not clamped afterwards. Misfortune aura type 10
    // can therefore leave melee, Defense, Resistance, or conventional Ranged at -1. The engine
    // clamps Defense, melee, ranged, Thrown and both breaths to at least 0 here; it does not
    // clamp Resistance, and neither does MoM's terminal clamp at
    // 0x90B41-0x90B75. The calculator keeps its own non-negative Resistance convention for the
    // resistance rolls, and its own floor of 1 HP.
    //
    // The slot zeroing is the calculator's, not the engine's: a unit with no base melee attack
    // has none, so bonuses that landed on the empty slot are discarded rather than conjuring
    // one. Blaze of Glory is the exception — its armor-to-melee transfer *does* give a
    // melee-less unit a melee attack, so it widens the slot rather than being discarded by it.
    // Caster.exe clamps the common Hit field first, then clamps each attack-specific
    // modifier against that normalized common value. Keeping these as two steps makes the
    // load-bearing order visible and preserves the channel modifier stored by the engine.
    // PROVENANCE[chance:modernClampCommon]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:7ab1bb7e18b0870f20ec5ada
    statStep({ id: 'chance:modernClampCommon', sourceId: 'statClamp',
      sourceLabel: 'Stat clamp', phase: 'e', writes: ['toHit'],
      when: () => isCoM2,
      apply: u => { u.toHit = Math.max(10, Math.min(100, u.toHit)); } }),
    // PROVENANCE[chance:clamp]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:7ab1bb7e18b0870f20ec5ada
    statStep({ id: 'chance:clamp', sourceId: 'statClamp', sourceLabel: 'Stat clamp',
      phase: 'e', writes: ['toHitMelee', 'toHitRtb'], when: () => isCoM2,
      apply: u => {
        u.toHitMelee = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitMelee));
        u.toHitRtb = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitRtb));
      } }),
    // DOS stores one effective threshold per attack and clamps those final thresholds
    // directly. Its To Block floor remains 10%; modern defendchance has no region-e clamp.
    // PROVENANCE[chance:legacyClamp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:20:cb4fa9e7501e8b1aefe9a152 | Reference docs/DOS reconstructed/combat.c@span:21:f6ae6f3564fbf6300c289918
    statStep({ id: 'chance:legacyClamp', sourceId: 'statClamp', sourceLabel: 'Stat clamp',
      phase: 'e', writes: ['toHitMelee', 'toHitRtb', 'toBlk'], when: () => !isCoM2,
      apply: u => {
        u.toHitMelee = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitMelee));
        u.toHitRtb = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitRtb));
        u.toBlk = Math.max(10, Math.min(100, u.toBlk));
      } }),
    // PROVENANCE[clamp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:264ed04fa725139a19a9de7d | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:f42794b5fb78038c35722afa
    statStep({ id: 'clamp', phase: 'e',
      writes: ['res', 'def', 'atk', 'rtb', 'hp', 'gaze', 'doomGaze'],
      apply: u => {
        u.res = Math.max(0, u.res);
        u.def = Math.max(0, u.def);
        u.atk = (hasMeleeAttack || blazeOfGloryActive || (isCoM1 && supremeLightEligible))
          ? Math.max(0, u.atk) : 0;
        u.rtb = rtbStatActive ? Math.max(0, u.rtb) : 0;
        u.hp = Math.max(1, u.hp);
        u.gaze = baseGazeRanged > 0 ? Math.max(0, u.gaze) : 0;
        u.doomGaze = baseDoomGaze > 0 ? Math.max(0, u.doomGaze) : 0;
      } }),
    // The aura pass: Holy Bonus (type 1), Resistance to All (type 3), and Misfortune (type 10).
    ...abilByPhase.e,
    // Q7, closed: Supreme Light is the last stat write the recompute makes, and its defence
    // component is a **live** read of Resistance — after Warp Resist, after `d`, and after the
    // aura pass, which is why the CoM2 manual's changelog says it is "applied last, after
    // Resistance To All, Holy Bonus, and Prayermaster". The melee and ranged additions are
    // each gated on that base attack existing (D24; CoM2 analysis, *Supreme Light*).
    // PROVENANCE[supremeLight]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:21:57c5217db1d984c019548cee
    statStep({ id: 'supremeLight', phase: 'e', writes: ['def', 'atk', 'rtb'],
      when: () => !isCoM1 && supremeLightEligible,
      apply: u => {
        u.def += Math.floor(Math.max(0, u.res) / 3);
        if (hasMeleeAttack) u.atk += 2;
        if (rtbStatActive) u.rtb += supremeLightRtbMod;
      } }),
  ];
}

// The single ordered list, in region order. `deriveUnitStats` filters the Warlord-only script
// regions and then walks the F20 source manifests over the result.
function buildRawStatSteps(ctx) {
  return [
    ...baseStatSteps(ctx),
    ...precalcBinaryStatSteps(ctx),
    ...precalcScriptStatSteps(ctx),
    ...magicCalcBinaryStatSteps(ctx),
    ...magicCalcScriptStatSteps(ctx),
    ...postHookStatSteps(ctx),
  ];
}
