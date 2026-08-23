// --- Unit Stat Derivation: the stat sequence (R1) ---
// One function per engine region, in execution order. `deriveUnitStats` (stats.js) computes the
// modifiers and hands them over as one context object.
//
// One phase-tagged list over one mutable record — `res`, `def`, `atk`, the record's secondary
// attack strengths, `hp` and the two gaze strengths, which share the DOS engines' `.ranged` slot.
// Not a list per stat: an effect the engine makes as a single write to several stats — Darkness,
// Blaze of Glory, Warp — is one step here too, instead of being shredded across five places and
// reassembled by a comment. See SPEC.md, *Stat derivation contract*.
//
// `ctx.channels` is the derivation's slots (stats.js, `buildSlotContext`): one for the DOS
// engines' shared `.ranged` value, and one more per modern attack channel, because `Caster.exe`
// holds Ranged, Thrown, Fire Breath and Lightning Breath as four named fields of one record and
// mutates them in place. A step that writes a secondary attack names every slot field it may
// write and applies each slot's own modifier, so one walk derives every channel and a
// cross-channel write has a position of its own.
//
// List order *is* execution order. Phase is the evidence for a step's position: which
// region of the engine makes that write (steps.js, STEP_PHASES).
//
// Positions come from the region maps in *CoM2 analysis*, *Unit stat recalculation* and
// *Resolution-time modifiers*, and from *MoM analysis*, *Warp Creature runs early*, for the
// two DOS engines. Where the engines order an effect differently it appears twice, as
// version-exclusive steps — that keeps both the runner and the list trivial and makes the
// divergence visible instead of hidden in a condition. Where a position is deduced rather than
// read, the deduction is marked on the chain entry that carries it (stats_manifests.js,
// `provisional`), not on the step.
//
// Within a region, order only has consequences where a step *reads* — the scaling effects
// (Xenoveterinary, Upgraded Explosive, Colossal Strength, Energy Cannon, Blaze of Glory,
// Supreme Light) and the Warps. Those are placed exactly; purely additive neighbours are in
// the order their evidence lists them.

// `base`: the raw stats, and the writes the engines make permanently before the encounter.
function baseStatSteps(ctx) {
  const {
    abilities, abilByPhase, altarOfTheMoon, altarOfTheSunHolyMother, baseDoomGaze, baseGazeRanged,
    baseHitChance, baseHitMelee, modernSecondaryHitMod, secondaryHitTargets,
    baseToBlkMod, baseToHitMod, baseToHitRtbMod, calcBaseAtk, calcBaseDef, calcBaseHP,
    calcBaseRes, channels, dragonMound, identity, isCoM1, isCoM2, lightningBladeSlots,
    ludusAgoge, motherFungus,
    naturalSelectionCoal, naturalSelectionIron, naturalSelectionNightshade,
    naturalSelectionNightshadeCount, naturalSelectionPowerMinerals,
    naturalSelectionPowerMineralsCount, pillarOfFaith, pillarOfFaithCount, poolOfRepentance,
    rangedTypeFields, sanctaBasilica, secondaryHitFields, strengthFields,
    survivalInstinctToBlkBonus, thrownTypeFields,
  } = ctx;
  return [
    // PROVENANCE[stat:base]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:bbaf5fb67bb1734c03725bf1 | Reference docs/DOS reconstructed/unitcalc.c@span:38:e0f87a5a92f98f34754862e7 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:28:37555b7dcbc4b5de6fb91420
    statStep({ id: 'stat:base', phase: 'base',
      writes: ['res', 'def', 'atk', ...strengthFields, 'hp', 'gaze', 'doomGaze',
        ...rangedTypeFields, ...thrownTypeFields],
      apply: u => {
        u.res = calcBaseRes; u.def = calcBaseDef; u.atk = calcBaseAtk;
        u.hp = calcBaseHP; u.gaze = baseGazeRanged; u.doomGaze = baseDoomGaze;
        for (const c of channels) {
          u[c.strengthField] = c.calcBaseRtb;
          u[c.rangedTypeField] = c.baseSequenceRangedType;
          u[c.thrownTypeField] = c.baseSequenceThrownType;
        }
      } }),
    // The modern record's common `hitchance` has no DOS counterpart: the DOS record stores one
    // threshold per attack and nothing above them, so this seed is modern-only and the DOS melee
    // threshold is part of `base:baseThresholds` below. That difference in cited versions is why
    // this stays a step of its own: a scope row is per `phase:id`, so a field the DOS record does
    // not have cannot ride along inside a five-version step.
    // PROVENANCE[baseHitChance]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:6fe92f163cbb9aea88131c8e
    statStep({ id: 'baseHitChance', sourceId: 'baseHitChance',
      sourceLabel: 'Base To Hit', phase: 'base', writes: ['toHit'],
      when: () => baseHitChance !== 0,
      apply: u => { u.toHit += baseHitChance; } }),
    // The record's stored per-attack To-Hit thresholds and its To Block are one cited block,
    // seeded together: one citation, one chain position, and `writes` names the fields it
    // reaches (SPEC.md, *The step model*).
    // One card modifier per secondary threshold the record has: three in the modern engines,
    // one shared value in the DOS engines. The modern branch writes each per-kind field its own
    // card value and the DOS-shaped compatibility slot the modifier of whatever kind stands in
    // it, which is the same `kindAt` question every other writer of that slot asks.
    // PROVENANCE[baseThresholds]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:68be766c4016b25fd0a44be4 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:6fe92f163cbb9aea88131c8e
    statStep({ id: 'baseThresholds', sourceId: 'baseThresholds',
      sourceLabel: 'Base To Hit / To Block', phase: 'base',
      writes: ['toHitMelee', ...secondaryHitFields, 'toBlk'],
      when: () => (isCoM2 ? baseHitMelee : baseToHitMod) !== 0
        || (isCoM2
          ? Object.values(modernSecondaryHitMod).some(value => value !== 0)
          : baseToHitRtbMod !== 0)
        || baseToBlkMod !== 0,
      apply: u => {
        u.toHitMelee += isCoM2 ? baseHitMelee : baseToHitMod;
        if (isCoM2) {
          for (const target of secondaryHitTargets) {
            u[target.field] += modernSecondaryHitMod[target.kindAt(u)];
          }
        } else {
          for (const field of secondaryHitFields) u[field] += baseToHitRtbMod;
        }
        u.toBlk += baseToBlkMod;
      } }),
    // CoM1's Zombies constructor starts the live To Block field at -1. This is an
    // identity-sourced write, but it belongs on the calculated stat sequence so its
    // effect is attributed to To Block rather than to the Special unit control.
    // PROVENANCE[zombies:toBlock]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:4228875943f7a7458e2af96e
    statStep({ id: 'zombies:toBlock', sourceId: 'zombies', sourceLabel: 'Zombies',
      phase: 'base', writes: ['toBlk'],
      when: () => isCoM1 && identity.specialUnit === 'zombies',
      // The DOS constructor stores a signed D10 threshold step. The calculator's accumulator
      // is percentage points, so one engine step is ten percentage points.
      apply: u => { u.toBlk -= 10; } }),
    ...abilByPhase.base,
    // PROVENANCE[altarOfTheMoon]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:10:6f667006e3c7a79f7c8a4862
    // The Resistance point reaches every trained unit, not only a ranged one; the ranged
    // half carries its own slot gate.
    statStep({ id: 'altarOfTheMoon', phase: 'base', writes: ['res', ...strengthFields],
      when: () => altarOfTheMoon,
      apply: u => {
        u.res += 1;
        for (const c of channels) {
          if (c.hasPermanentRangedStat) u[c.strengthField] += 2;
        }
      } }),
    // PROVENANCE[militaryWorkshop]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:24:ab44f1ca0fc9eab7723b232b
    // The missile-to-boulder projectile upgrade is made here, at the block's own position,
    // rather than seeded into the base record: `base:stat:base` is the chain's first entry and
    // carries the permanent identity alone.
    statStep({ id: 'militaryWorkshop', phase: 'base',
      writes: [...strengthFields, ...rangedTypeFields],
      when: () => channels.some(c => c.blackpowder),
      apply: u => {
        // Doom or Armor Piercing means the block grants strength instead of the piercing flag:
        // +4 on Thrown, +2 on a physical ranged attack. Fire Breath takes +4 either way. All
        // three read the permanent record's channel, which is what the script's gates read.
        const grantsStrength = !!abilities.doom || !!abilities.armorPiercing;
        for (const c of channels) {
          if (!c.blackpowder) continue;
          if (grantsStrength && c.blackpowderSelectedThrown) u[c.strengthField] += 4;
          else if (grantsStrength && c.blackpowderSelectedPhysicalRanged) u[c.strengthField] += 2;
          if (c.blackpowderSelectedFireBreath) u[c.strengthField] += 4;
          if (c.blackpowderUpgradesToBoulder) u[c.rangedTypeField] = 'boulder';
        }
      } }),
    // Lightning Blade follows Military Workshop in CreateUnit.CAS. It assigns rather than adds
    // when no Thrown source exists, so an older Lightning Breath is replaced by strength 1.
    // PROVENANCE[lightningBlade:breath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:6:81632d425b80bc83dc627d23
    statStep({ id: 'lightningBlade:breath', sourceLabel: 'Lightning Blade', phase: 'base',
      writes: [...strengthFields, ...rangedTypeFields, ...thrownTypeFields],
      when: u => lightningBladeSlots.some(({ target, source }) =>
        target !== source || u[target.rangedTypeField] === 'none'),
      apply: u => {
        // A move out of the record's Thrown field, so an existing Lightning Breath is replaced
        // and the emptied Thrown field stays the Thrown field for the writes that reach it
        // later. The DOS-shaped shared slot is both ends at once, so there the write is made in
        // place, and only what stands in the slot as *Thrown* is what the assignment reads.
        for (const { target, source } of lightningBladeSlots) {
          const inPlace = target === source;
          if (inPlace && u[target.rangedTypeField] !== 'none') continue;
          const moved = inPlace
            ? (slotHasThrown(u, source) ? u[source.strengthField] : 0)
            : u[source.strengthField];
          u[target.strengthField] = moved + 1;
          u[target.rangedTypeField] = 'none';
          u[target.thrownTypeField] = 'lightning';
          if (!inPlace) {
            u[source.strengthField] = 0;
            u[source.thrownTypeField] = 'none';
          }
        }
      } }),
    // PROVENANCE[poolOfRepentance]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:6:3e9df07e383cb9fc3cb6ec88
    statStep({ id: 'poolOfRepentance', phase: 'base', writes: ['res', 'def'],
      when: () => poolOfRepentance,
      apply: u => { u.res += 1; u.def += 1; } }),
    // Dragon Mound follows Pool of Repentance and precedes Agoge in CreateUnit.CAS.
    // PROVENANCE[dragonMound]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:071c420ab03821e688a6e290
    statStep({ id: 'dragonMound', phase: 'base', writes: ['def', ...strengthFields],
      when: () => dragonMound,
      apply: u => {
        u.def += 1;
        // Unconditional +2 to the independent Fire Breath field; the DOS-shaped shared slot is
        // that field while it carries a fire breath, read here at the block's own position.
        for (const c of channels) {
          if (c.channelKey ? c.channelKey === 'fireBreath' : u[c.thrownTypeField] === 'fire') {
            u[c.strengthField] += 2;
          }
        }
      } }),
    // The executing script also adds +1 to an existing ranged-strength field, despite
    // that write being omitted from Ludus Agoge's prose description.
    // PROVENANCE[ludusAgoge]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:16:74a31ea6126eaa0915ee33a2
    statStep({ id: 'ludusAgoge', phase: 'base', writes: ['res', 'atk', ...strengthFields, 'hp'],
      when: () => ludusAgoge,
      apply: u => {
        u.res += 1; u.atk += 1;
        for (const c of channels) {
          if (c.hasPermanentRangedStat) u[c.strengthField] += 1;
        }
        u.hp += 1;
      } }),
    // PROVENANCE[motherFungus]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:13:5feb79a87ed503bfc3388e6a
    statStep({ id: 'motherFungus', sourceId: 'motherFungus', sourceLabel: 'Mother Fungus',
      phase: 'base', writes: ['atk', ...strengthFields, 'toBlk'],
      when: () => motherFungus,
      apply: u => {
        u.atk += 2;
        for (const c of channels) {
          if (c.hasPermanentRangedStat) u[c.strengthField] += 2;
        }
        u.toBlk += 10;
      } }),
    // PROVENANCE[altarOfTheSun:holyMother]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:12:08e36e60187df8bc650c42c7
    statStep({ id: 'altarOfTheSun:holyMother', phase: 'base', writes: ['atk'],
      when: () => altarOfTheSunHolyMother, apply: u => { u.atk += 1; } }),
    // PROVENANCE[sanctaBasilica]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:4:39fc91fc980453890ebc8f7f
    statStep({ id: 'sanctaBasilica', phase: 'base', writes: ['res'],
      when: () => sanctaBasilica, apply: u => { u.res += 3; } }),
    // PROVENANCE[naturalSelection:powerMinerals]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:11:6612cf82e93af571954fbfad
    statStep({ id: 'naturalSelection:powerMinerals', phase: 'base', writes: ['res'],
      when: () => naturalSelectionPowerMinerals,
      apply: u => { u.res += naturalSelectionPowerMineralsCount; } }),
    // CreateUnit.CAS snapshots Resistance before either resource write, then processes
    // Nightshade second. When both are present, Nightshade replaces the Power-mineral bonus.
    // PROVENANCE[naturalSelection:nightshade]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:18:448497300397f81837f9b5ab
    statStep({ id: 'naturalSelection:nightshade', phase: 'base', writes: ['res'],
      when: () => naturalSelectionNightshade,
      apply: u => {
        u.res += naturalSelectionNightshadeCount - naturalSelectionPowerMineralsCount;
      } }),
    // Wild Game uses the ranged snapshot taken beside the Resistance snapshot above.
    // PROVENANCE[naturalSelection:wildGame]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:18:448497300397f81837f9b5ab
    statStep({ id: 'naturalSelection:wildGame', phase: 'base', writes: strengthFields,
      when: () => channels.some(c => c.naturalSelectionWildGameActive && c.hasPermanentRangedStat),
      apply: u => {
        for (const c of channels) {
          if (c.naturalSelectionWildGameActive && c.hasPermanentRangedStat) u[c.strengthField] += 1;
        }
      } }),
    // PROVENANCE[naturalSelection:coal]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:26:cef191739c3f088137ea1ffc
    statStep({ id: 'naturalSelection:coal', phase: 'base', writes: ['atk'],
      when: () => naturalSelectionCoal, apply: u => { u.atk += 1; } }),
    // PROVENANCE[naturalSelection:iron]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:30:b83cb1d01140dbc56424aff9
    statStep({ id: 'naturalSelection:iron', phase: 'base', writes: ['def'],
      when: () => naturalSelectionIron, apply: u => { u.def += 1; } }),
    // PROVENANCE[pillarOfFaith]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:19:80527272b0e3dd1465419cc8
    statStep({ id: 'pillarOfFaith', phase: 'base', writes: ['res'],
      when: () => pillarOfFaith, apply: u => { u.res += pillarOfFaithCount; } }),
    // Energy Cannon is the last represented CreateUnit.CAS ranged-strength write, so its
    // +50% reads every earlier permanent ranged contribution in this sequence.
    // PROVENANCE[energyCannon]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:40a6858a207fd2460b6df58e
    statStep({ id: 'energyCannon', phase: 'base',
      writes: [...strengthFields, ...rangedTypeFields],
      when: () => channels.some(c => c.energyCannon && c.energyCannonOwnsThisSlot),
      apply: u => {
        for (const c of channels) {
          if (!c.energyCannon || !c.energyCannonOwnsThisSlot) continue;
          u[c.strengthField] += Math.floor(Math.max(0, u[c.strengthField]) / 2);
          // `RangedType=40`, Warlord's beam energy: `IsMagic=Yes` and nothing else
          // (`RangedType.INI [40]`), which is the whole of what the modern engine reads.
          u[c.rangedTypeField] = 'magic';
        }
      } }),
    // PROVENANCE[survivalInstinctToBlock]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:fafe4abfecfd17491cbdbc10
    statStep({ id: 'survivalInstinctToBlock', sourceId: 'survivalInstinctToBlock',
      sourceLabel: 'Survival Instinct', phase: 'base', writes: ['toBlk'],
      when: () => survivalInstinctToBlkBonus !== 0,
      apply: u => { u.toBlk += survivalInstinctToBlkBonus; } }),
  ];
}

// The Chaos Channels fire-breath strength write, built once for the two regions that make it.
// `Caster.exe` adds 4 to its independent Fire Breath field at $00599EE8, ahead of the
// UnitCalcPre hook, so the modern builds make it in region `a`. The DOS engines assign their
// shared secondary slot instead, inside `BU_Apply_Specials` at 131:0x8F720 / com1:0x8F474 —
// one block past the demon wings in both, and so after everything the MoM constructor wrote
// before it — so their write is region `c` at that address (F103). The admission gate is
// checked before either; whether the slot is free is the step's own live read.
// PROVENANCE[chaosChannels:fireBreath]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:b9b73d98478711f2be56c0a9 | Reference docs/DOS reconstructed/unitcalc.c@span:7:8ee2be8fe3596d5bdc7acc0a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:c39e26f9ccd713b815403313
function chaosChannelsFireBreathStep(ctx, phase) {
  return statStep({ id: 'chaosChannels:fireBreath', sourceId: 'chaosChannels:fireBreath',
    sourceLabel: 'Chaos Channels', phase, ...chaosChannelsFireBreathWrite(ctx) });
}

// The block's declared writes, admission gate and write, stated once because MoM 1.31 executes
// the same block from two call sites (`c:chaosChannels:fireBreath:recompute` below).
function chaosChannelsFireBreathWrite(ctx) {
  const {
    ccFireBreathStrength, ccGrantsThisSlot, ccIndependentChannels, channels,
    rangedTypeFields, strengthFields, thrownTypeFields,
  } = ctx;
  return {
    writes: [...strengthFields, ...rangedTypeFields, ...thrownTypeFields],
    when: u => channels.some(c => ccGrantsThisSlot(u, c)),
    apply: u => {
      for (const c of channels) {
        if (!ccGrantsThisSlot(u, c)) continue;
        u[c.strengthField] = ccIndependentChannels
          ? u[c.strengthField] + ccFireBreathStrength : ccFireBreathStrength;
        u[c.rangedTypeField] = 'none';
        u[c.thrownTypeField] = 'fire';
      }
    },
  };
}

// `a`: precalc, in the binary.
function precalcBinaryStatSteps(ctx) {
  return [
    // Region `a` is narrow: the modern Chaos Channels Fire Breath write is its represented
    // strength write; its other represented writes are identity/flags. City Walls is not here:
    // ApplyAttack passes it as EffectiveDefense's
    // per-attack `extradef` argument after the finished region-e record is read.
    ...ctx.abilByPhase.a,
    chaosChannelsFireBreathStep(ctx, 'a'),
  ];
}

// `b`: precalc, in UnitCalcPre.CAS (Warlord only).
function precalcScriptStatSteps(ctx) {
  const {
    abilByPhase, abilities, baseFigs, bombsGrenades, channels, ffMeleeBonus, ffRegularBonus,
    fieryFuryRtbWrite, goblinPoxAtkMod, goblinPoxDefMod, goblinPoxResMod, godsPlayDicesResMod,
    greatUnbindingActive, isWarlord,
    marionette, marionetteAttackBonus, marionetteDefenseBonus, marionetteOwned,
    marionetteStrayed, natureLinkActive, outlanderRtbToHitBonus,
    plagueActive, poxHostActive, poxHostIsGoblin, rangedTypeFields, secondaryHitFields,
    soulFlayActive, soulFlayAtkMod, soulFlayDefMod, soulFlayLevels, soulFlayResMod,
    strengthFields, thrownTypeFields, unitTypeVal,
    uphillBattleActive, warlordEternalNightActive, warlordTrueLightStep,
    wofDefenderBonusActive,
  } = ctx;
  return [
    // Marionette's stat writes precede the later Outlander research block. This order is
    // observable because its Fantastic write makes Wanderer eligible for Xenoveterinary.
    // PROVENANCE[marionette:stats]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913
    statStep({ id: 'marionette:stats', sourceId: 'marionetteChanneler',
      sourceLabel: 'Marionette (Channeler)', phase: 'b',
      writes: ['atk', ...strengthFields, 'def'],
      when: () => marionetteOwned,
      apply: u => {
        u.atk += marionetteAttackBonus;
        for (const c of channels) {
          if (c.marionetteOwnsThisRangedSlot) u[c.strengthField] += marionetteAttackBonus;
        }
        u.def += marionetteDefenseBonus;
      } }),
    // The realm retype follows the attack writes in the same block, one arm per primary realm.
    // Every arm is `SETSTAT(U,SRangedType,0,…)` — record selector `0`, the **calculated**
    // record — so this is a region-`b` write at its own position, not part of the permanent
    // record that the `base` and `a` regions and `c:level`'s `BaseUnits[i].rangedtype` gate
    // read; Wanderer's permanent Chaos type is its roster record's own (F107). All five ids are
    // `IsMagic=Yes` and carry nothing else the modern engine reads, so all five arms write the
    // one modern token.
    // PROVENANCE[marionette:rangedType]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:3:82379f8ff60b109851bbd5b7 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:3:febf06298a828b2584eed37d | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:3:bb8bbb1a6e2c70031e61f6ab | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:3:962023c71d4fb00d0451568f | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:3:1fbcb6160390109ce2cb43d6 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:558b5f33e065f62accd1690c
    statStep({ id: 'marionette:rangedType', sourceId: 'marionetteChanneler',
      sourceLabel: 'Marionette (Channeler)', phase: 'b', writes: rangedTypeFields,
      when: () => marionetteOwned,
      apply: u => {
        for (const c of channels) {
          if (c.marionetteOwnsThisRangedSlot) u[c.rangedTypeField] = marionette.rangedType;
        }
      } }),
    // The ascension block's own retype, a second `SETSTAT(U,SRangedType,0,…)` at a second
    // position: the five realm arms above are `UnitCalcPre.CAS:104-176`, the twenty book-grant
    // blocks follow, and only then does the ascension branch write `SRangedType = 30` for a
    // Chaos primary (`:272`), beside the Wall Crusher and Armor Piercing grants the package
    // already carries. Id 30 is the lightning-bolt projectile and a token of its own, so this
    // is a write the primary arm's value does not stand in for. Nothing modelled writes a
    // projectile type between the two, which is why they are adjacent on the chain.
    // PROVENANCE[marionette:ascensionRangedType]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:7452b4dcbe1df6aa43cdb7a0
    statStep({ id: 'marionette:ascensionRangedType', sourceId: 'marionetteChanneler',
      sourceLabel: 'Marionette (Channeler)', phase: 'b', writes: rangedTypeFields,
      when: () => marionetteOwned && !!marionette.ascensionRangedType,
      apply: u => {
        for (const c of channels) {
          if (c.marionetteOwnsThisRangedSlot) {
            u[c.rangedTypeField] = marionette.ascensionRangedType;
          }
        }
      } }),
    // The strayed branch first grants Transmute Equipment; its hero augmentation block later
    // in this same hook runs before Rebuild and the Outlander research block.
    // PROVENANCE[marionette:strayedTransmute]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:e36dada50542233ab9fda915
    statStep({ id: 'marionette:strayedTransmute', sourceId: 'marionetteStrayed',
      sourceLabel: 'Marionette (strayed): Transmute Equipment', phase: 'b',
      writes: ['atk', ...strengthFields, 'def', 'res'], when: () => marionetteStrayed,
      apply: u => {
        u.atk += 2;
        for (const c of channels) {
          if (c.marionetteRangedSlot) u[c.strengthField] += 2;
        }
        u.def += 2;
        u.res += 1;
      } }),
    // Rebuild's hero block immediately follows Transmute Equipment and precedes
    // Xenoveterinary in UnitCalcPre.CAS.
    ...abilByPhase.b.filter(step => step.id === 'rebuild'),
    // Warlord removes the compiled CoM2 hero package here, at UnitCalcPre.CAS:759-769,
    // before Fiery Fury and the later Outlander/True Light blocks. The compiled grant remains
    // at the end of region c, after Warp and Shatter.
    ...abilByPhase.b.filter(step => step.id === 'tactician'),
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
      && step.id !== 'tactician'),
    // The Outlander channel/common writes follow the script's own sequence:
    // Magitek Engine (ability step above), Ballistics, Xenopsychology, then Radio.
    // PROVENANCE[outlanderBallisticsTraining]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:8:ba5b3ebcb89e99e403fbbac4
    statStep({ id: 'outlanderBallisticsTraining',
      sourceId: 'outlanderBallisticsTraining', sourceLabel: 'Ballistics Training',
      phase: 'b', writes: secondaryHitFields,
      when: () => outlanderRtbToHitBonus !== 0,
      apply: u => {
        for (const field of secondaryHitFields) u[field] += outlanderRtbToHitBonus;
      } }),
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
    // PROVENANCE[nausea]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:c7ec21b771edb6cb9bd17645
    statStep({ id: 'nausea', sourceId: 'nausea', sourceLabel: 'Conjuring Pact nausea',
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
    // model merged into one `Math.max` term — see the M4 note at `flameBladeStep`.
    // PROVENANCE[fieryFury]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:15:124bc19c147f5de83f487583 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:551d408ad4d5ae821c5eaf58 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:d7cdec7c168e641613b36c19
    statStep({ id: 'fieryFury', phase: 'b', writes: ['atk', ...strengthFields],
      when: () => ffRegularBonus,
      apply: u => {
        u.atk += ffMeleeBonus;
        // The block precedes Bombs & Grenades (`:1066-1080`) in the same file, so the Thrown
        // field that block creates is not yet there to be read.
        for (const c of channels) u[c.strengthField] += fieryFuryRtbWrite(u, c);
      } }),
    // PROVENANCE[wallOfFire:garrison]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:15:a221a36b384a9457291e5a8a
    statStep({ id: 'wallOfFire:garrison', phase: 'b', writes: ['atk', ...strengthFields],
      when: () => wofDefenderBonusActive,
      apply: u => {
        u.atk += 1;
        for (const c of channels) {
          if (slotHasPhysicalRanged(u, c) || slotHasThrown(u, c)) u[c.strengthField] += 1;
        }
      } }),
    // PROVENANCE[eternalNight:poorVision]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:714df04471d1c63eb32e3964
    statStep({ id: 'eternalNight:poorVision', phase: 'b', writes: strengthFields,
      when: () => warlordEternalNightActive,
      apply: u => {
        for (const c of channels) {
          if (slotHasPhysicalRanged(u, c) || slotHasMagicalRanged(u, c)) u[c.strengthField] -= 2;
        }
      } }),
    // PROVENANCE[bombsGrenades]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:7:99e85b5dc6de1ad3f95908c1
    // `SETSTAT(U,SThrown,0,…)` writes the calculated record, not the permanent one, so the
    // Thrown field this creates does not exist before this position. The step supplies its
    // identity here — as `d:shadowStrike:thrown` does for the same field — instead of the base
    // seed carrying a region-`b` write from the chain's first entry.
    //
    // One write to one field: `SThrown`. Which slot is that field is a structural question
    // `isThrownFieldSlot` answers, so the grant does not spill into a slot that merely stands
    // empty and typeless here — the `SRanged` field the Blaze of Glory transfer and the Focus
    // Magic branch need standing by for their own writes is exactly that (F101).
    statStep({ id: 'bombsGrenades', phase: 'b',
      writes: [...strengthFields, ...thrownTypeFields],
      when: () => bombsGrenades,
      apply: u => {
        const grant = Math.max(0, Math.floor(8 - baseFigs / 2));
        for (const c of channels) {
          if (isThrownFieldSlot(u, c)) u[c.thrownTypeField] = 'thrown';
          if (slotHasThrown(u, c)) u[c.strengthField] += grant;
        }
      } }),
    // PROVENANCE[upgradedExplosive:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:4:716e4812acd6432198553e28
    statStep({ id: 'upgradedExplosive:ranged', phase: 'b', writes: strengthFields,
      when: u => channels.some(c => c.upgradedExplosive && u[c.rangedTypeField] !== 'none'),
      apply: u => {
        for (const c of channels) {
          if (c.upgradedExplosive && u[c.rangedTypeField] !== 'none') u[c.strengthField] += 2;
        }
      } }),
    // The Fire Breath write is part of the same UnitCalcPre block as the ranged write.
    // Later phase-b effects such as True Light must see, but must not be included in,
    // this doubled subtotal.
    // PROVENANCE[upgradedExplosive:fireBreath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:4:716e4812acd6432198553e28
    statStep({ id: 'upgradedExplosive:fireBreath', phase: 'b', writes: strengthFields,
      when: u => channels.some(c => c.upgradedExplosive && u[c.thrownTypeField] === 'fire'),
      apply: u => {
        for (const c of channels) {
          if (c.upgradedExplosive && u[c.thrownTypeField] === 'fire') {
            u[c.strengthField] += Math.max(0, u[c.strengthField]);
          }
        }
      } }),
    // PROVENANCE[soulFlay]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:13:1a0ee111433e436b3c5da065
    statStep({ id: 'soulFlay', phase: 'b', writes: ['res', 'def', 'atk', ...strengthFields],
      when: () => soulFlayActive,
      apply: u => {
        u.res += soulFlayResMod; u.def += soulFlayDefMod; u.atk += soulFlayAtkMod;
        // The script writes `SRanged` by the same per-level amount as melee, so the penalty
        // lands on the conventional ranged channel only; Warlord's independent Thrown and
        // Breath fields are untouched.
        for (const c of channels) {
          if (isConventionalRangedSlot(u, c)) u[c.strengthField] -= soulFlayLevels;
        }
      } }),
    // PROVENANCE[goblinPox]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:19:4d062d7899f6c61a2403d4a4
    statStep({ id: 'goblinPox', phase: 'b', writes: ['res', 'def', 'atk', ...strengthFields],
      when: () => poxHostActive,
      apply: u => {
        u.res += goblinPoxResMod; u.def += goblinPoxDefMod; u.atk += goblinPoxAtkMod;
        // Both branches write `SRanged` by the same amount as melee, so the penalty lands on
        // the conventional ranged channel only.
        for (const c of channels) {
          if (isConventionalRangedSlot(u, c)) u[c.strengthField] -= poxHostIsGoblin ? 1 : 3;
        }
      } }),
    // PROVENANCE[greatUnbinding]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:17:51f2e6d3d15bd989ebfff7cd
    statStep({ id: 'greatUnbinding', sourceId: 'greatUnbinding', sourceLabel: 'Great Unbinding',
      phase: 'b', writes: ['res', 'toHit', 'toBlk'],
      when: () => greatUnbindingActive,
      apply: u => { u.res -= 2; u.toHit -= 20; u.toBlk -= 20; } }),
    // PROVENANCE[natureLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:8d549c3c9d2b586869606d77
    statStep({ id: 'natureLink', phase: 'b', writes: ['res'],
      when: () => natureLinkActive, apply: u => { u.res += 1; } }),
    ...(isWarlord ? [warlordTrueLightStep] : []),
    // PROVENANCE[plague]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:52017a20d7efd62a9584c02a
    statStep({ id: 'plague', sourceId: 'plague', sourceLabel: 'Plague',
      phase: 'b', writes: ['res', 'def', 'atk', ...strengthFields, 'toHit'],
      when: () => plagueActive,
      apply: u => {
        u.res -= 6; u.def -= 3; u.atk -= 3;
        for (const c of channels) {
          if (isConventionalRangedSlot(u, c)) u[c.strengthField] -= 3;
        }
        u.toHit -= 10;
      } }),
    // Xenopsychology and Radio are +1 Resistance each; the rest of what they grant is To Hit
    // and To Defend, which are not in the sequence yet.
    // PROVENANCE[godsPlayDices]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:14:34909b07ee2554c5452c485b
    statStep({ id: 'godsPlayDices', phase: 'b', writes: ['res'],
      // UnitCalcPre.CAS:1699-1714 tests four separate EncDICE flags, each writing its own
      // ±1 or ±2; the calculator's one signed control is which of them is set, and zero is
      // none of them.
      when: () => godsPlayDicesResMod !== 0,
      apply: u => { u.res += godsPlayDicesResMod; } }),
  ];
}

// `c`: magic calc, in the binary, including the Warp Creature block.
function magicCalcBinaryStatSteps(ctx) {
  const {
    abilByPhase, abilities, badMoonActive, channels,
    chaosSurgeCount, chaosSurgeMeleeBonus, chaosSurgeResBonus, chaosSurgeRtbBonus,
    charmOfLifeActive, classicBerserk, com1DivineBarrierAura, com1SoulLinkerAura,
    com1GuidingBeaconAura, darkForceActive, darknessAtkBonus, darknessDefBonus, darknessResBonus,
    destinyActive, disciplineActive, disciplineAtkMod, disciplineDefMod, doomGazeLvlMod,
    dosTrueLightStep, enduranceActive, enduranceDefMod, enduranceHpMod,
    eternalNightEnemyResPenalty, flameBladeStep,
    focusMagicActive, focusMagicBranchSlots, gazeLvlMod, gazeWarpHalves,
    goodMoonActive,
    hasDarkness, hasMeleeAttackAt, heavenlyLightActive, heavenlyLightHitPick,
    heavenlyLightMeleeToHitAt, holyArmorActive, holyWeaponHitPick, hwMeleeToHit,
    landLinkingEligible,
    identity, inputBaseAtk, isCoM1, isCoM2,
    isCoMVersion, isWarlord, levelRank, lionheartHpMod, lvl,
    natureConjunctionActive, nodeAuraActive, orihalconActive,
    rangedTypeFields, realmWardActive, secondaryHitTargets, secondaryHitFields, spellWardActive,
    recordContext, secondaryHitFieldsFor, strengthFields, supremeLightEligibleAt,
    thrownTypeFields, unitIsChaos, unitTypeVal, version,
    vertigoActive, vertigoBlockPenalty, vertigoHitPenalty, warpRealityActive, weaknessBinaryHits,
    weaknessPenalty, weaponStatSteps,
  } = ctx;
  // A gated secondary To Hit write is decided by the channel that reads the modifier — the
  // record's own `rangedtype` and Thrown field (Units.RecalculateUnits.pas:639-662, :1451-1454,
  // :1806-1809) — not by whichever channel a derivation happens to be for. Slots that share a
  // modifier share the decision, which is what one `hitchancebreath` for two breath strengths
  // means; Breath is untouched by all three of these writers.
  const hitTargetValue = (u, target, pick) => {
    const kind = target.kindAt(u);
    for (const context of target.contexts) {
      const value = pick(u, context, kind);
      if (value) return value;
    }
    return 0;
  };
  return [
    // Destiny's persistent identity/storage writes occur here, after UnitCalcPre, and its
    // calculated-record package immediately follows. Every permanent base write plus regions
    // a and b therefore feeds the six multipliers; level and Focus Magic remain later.
    // PROVENANCE[destiny]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:e90777a680ce0ccd0df5ea87
    statStep({ id: 'destiny', sourceLabel: 'Destiny', phase: 'c',
      writes: ['atk', ...strengthFields, 'def', 'res', 'hp'], when: () => destinyActive,
      apply: u => {
        u.atk *= 2;
        for (const c of channels) u[c.strengthField] *= 2;
        u.def += 4; u.res += 4; u.hp *= 2;
      } }),
    // The normal-unit level ladder is `@Units@ApplyLevelBonus` at +0x00D16, near the head of
    // modern region c and right after Destiny's permanent transformation. DOS calls its ladder
    // in the battle-unit constructor before the material block and BU_Apply_Specials. The helper
    // and runtime-table spans below cover every represented gate and cumulative value; separate
    // hero progression remains outside this step's supported scope.
    // PROVENANCE[level]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:11:3ebd099afdc1a9ba314313f2 | Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b | Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:ca745a122a23d618ddef5f78 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
    statStep({ id: 'level', phase: 'c',
      writes: ['res', 'def', 'atk', ...strengthFields, 'hp', 'toHit',
        ...(!isCoM2 ? ['gaze', 'doomGaze'] : [])],
      // `runCtx`, not `ctx`: the enclosing name is this file's derivation context, while the
      // runner passes the sequence context that carries the permanent record.
      apply: (u, runCtx) => {
        u.res += lvl.res; u.def += lvl.def;
        // The ladder's melee step carries a presence gate in both engine families, and each
        // reads a different record. Modern: `if BaseUnits[i].attack > 0` — the **permanent**
        // record ($00598754..$005987F7, Units.RecalculateUnits.pas:543). DOS: `if (bu->melee > 0)
        // bu->melee++` at every step of both ladders (131:0x8FA8E and the four steps around it),
        // a **live** read of the battle unit being built. Until F142 neither was written here:
        // the write was unconditional and the calculator's terminal melee zeroing swallowed it
        // for a melee-less unit. With that pass retired the gates have to be the engine's own.
        if (isCoM2 ? hasMeleeAttackAt(runCtx) : u.atk > 0) u.atk += lvl.atk;
        // The modern arm makes four independent secondary writes, each indexing a table of its
        // own. The normal path gates all four on the **permanent** record —
        // `BaseUnits[i].rangedtype > 0` selecting NormalMagicRanged or NormalMissileRanged by
        // `Ismagicalranged` of that same base type, `BaseUnits[i].thrown > 0` selecting
        // NormalThrown, and `.firebreath > 0` / `.lightningbreath > 0` both selecting
        // NormalBreath (Units.RecalculateUnits.pas:548-571). The hero path keeps the base ranged
        // gate and its base-type table selection, but tests the **calculated** Thrown and both
        // Breaths instead (:509-530); it is `BaseUnits[i].ishero` that picks the path, which is
        // the base identity flag. The hero *tables* are a separate nine-step progression and
        // remain outside this step's supported scope (D27/F41), so both paths read the same
        // `[Normal]` values here.
        //
        // One slot is one record field, so which of the four writes can reach it is decided by
        // the identity that field carries in the record being read, and the arms are exclusive
        // for that reason rather than the engine's — there `ranged`, `thrown`, `firebreath` and
        // `lightningbreath` are four separate fields and cannot collide.
        //
        // The DOS engines run a different routine and keep their own arm: MoM increments the
        // shared `.ranged` slot with no ranged-type test at all, and CoM 1's table walk skips the
        // ranged step for `ranged_type >= 100` on every row but Veteran (unitcalc.c,
        // `BU_Apply_Level_Bonus`) — which is what `lvl.ranged` and `lvl.thrown` are the
        // cumulative values of. Both DOS gaze strengths are handled by the `gazeLvlMod` pair
        // below, so this arm covers conventional ranged, Thrown and Breath alone.
        const base = runCtx.base;
        // The DOS ladder's ranged step reads the one shared byte before writing it. Captured
        // ahead of the arm above because the engine tests and increments the same field step by
        // step; for a gaze record that arm is inert either way, since neither of the slot's two
        // type fields carries a gaze type.
        const dosSharedSlotStrength = isCoM2 ? 0 : u[channels[0].strengthField];
        for (const c of channels) {
          if (!isCoM2) {
            if (u[c.rangedTypeField] !== 'none') {
              if (c.calcBaseRtb > 0) u[c.strengthField] += lvl.ranged;
            } else if (u[c.thrownTypeField] !== 'none') {
              u[c.strengthField] += lvl.thrown;
            }
            continue;
          }
          const baseRangedType = base[c.rangedTypeField];
          // The Thrown and Breath gates are positive-strength tests on a field with no type of
          // its own; the slot's type pair is what says which of the three fields it is.
          const gatedType = identity.isHero ? u[c.thrownTypeField] : base[c.thrownTypeField];
          const gatedStrength = identity.isHero ? u[c.strengthField] : base[c.strengthField];
          if (baseRangedType !== 'none') {
            u[c.strengthField] += isMagicalRangedType(baseRangedType)
              ? lvl.magicRanged : lvl.missileRanged;
          } else if (gatedStrength > 0 && gatedType === 'thrown') {
            u[c.strengthField] += lvl.thrown;
          } else if (gatedStrength > 0 && (gatedType === 'fire' || gatedType === 'lightning')) {
            u[c.strengthField] += lvl.breath;
          }
        }
        u.hp += lvl.hp;
        // The gaze strengths are views of that same byte, so they take the ladder through the
        // ladder's own gate on it, not ungated (F135). Every ranged step in both MoM ladders is
        // `if (bu->ranged > 0) bu->ranged++` — 131:0x8FA8E, 0x8FAD4, 0x8FB21 on the six-step
        // normal ladder and 0x8F8FB, 0x8F935, 0x8F961, 0x8F994, 0x8F9C7 on the nine-step hero
        // one — and CoM 1's table walk `continue`s the `dx == 1` field when the byte is `<= 0`
        // (com1:0x8FAB2). So a gaze template shipping strength 0 takes no ladder step at all;
        // this corrects the expectation F122 recorded from the absence of a *type* gate.
        if (!isCoM2 && dosSharedSlotStrength > 0) {
          u.gaze += gazeLvlMod; u.doomGaze += doomGazeLvlMod;
        }
        u.toHit += lvl.toHit;
      } }),
    ...(!isCoM2 ? weaponStatSteps : []),
    ...(isCoM1 ? [flameBladeStep] : []),
    // Focus Magic is +0x00D3F, immediately after the level ladder, so CoM2 and Warlord write its
    // attack-strength package before the Warps. Warlord's later CAS block moves touch riders but
    // makes no attack-strength write. CoM 1 executes Focus Magic in BU_Apply_Specials, after the
    // constructor's material block and after Flame Blade's ranged addition.
    // One compiled block, so one step. The two engines shape it differently and each arm below
    // is its own engine's, not a predicate over a shared body.
    //
    // Modern: three independent positive-strength tests on the calculated record — `U.doomgaze`,
    // `U.firebreath`, `U.lightningbreath`, each `+3` — and then **exactly one** of four ranged
    // arms, every one of them gated on the **permanent** record through `ctx.base`
    // (Units.RecalculateUnits.pas:874-909). The magical-ranged `+3` is the fourth arm, not a
    // fourth strength test: it runs only where `B.ranged <> 0` and `B.rangedtype` is magical, and
    // it has no live-strength test of its own, so a magical ranged attack an earlier region drove
    // to or below zero still takes it.
    //
    // CoM 1 runs a different block: no Doom Gaze or Breath clause at all, and one three-way
    // branch over the shared slot (`unitcalc.c`, com1:0x8F7E6-0x8F84C). Arm 1 tests the **unit
    // type's** ranged type (com1:0x8F804) for `>= 30 and <> 100`, which admits magical ranged,
    // both breaths and all three gazes, and makes no strength test; arm 2 is the same `+3` for a
    // live type above Thrown, whose reachable CoM 1 producer is the ungated Chaos Channels
    // fire-breath write (com1:0x8F47C); arm 3 retypes the slot to shot type 34 — "Shot type 22h
    // (from Focus Magic) is now Sorcery type", per the CoM 1 manual's changelog — and floors at 3.
    //
    // `if (bu->ammo > 0)` (com1:0x8F7FB) wraps all three arms and is not modelled, because it can
    // never be closed for an enchanted unit: the battle-unit setup floors `bu->ammo` at 4 for any
    // unit carrying the persistent Focus Magic bit (com1:0x8EB87-0x8EB9F, CoM 1 only; absent from
    // both MoM builds) and then calls the constructor at com1:0x8EC99, which writes no ammunition
    // of its own. Ammunition is therefore not an input (`SPEC.md`, *Deliberate deviations*) and
    // needs no inferred stand-in. One residual: that floor reads the **persistent** enchantment
    // word, so a mid-combat cast would leave ammo alone — outside the one-round model, not a
    // deviation from it. `R6.1a.evidence.md`, *FocusMagic's `ammo > 0` gate is vacuous*, owns the
    // decode and the two places the CoM 1 prose disagrees with the binary.
    // PROVENANCE[focusMagic]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:18:84c8baeb7a2f577dca38e056 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:38:5036ba273068428523d6008e | Reference docs/DOS reconstructed/unitcalc.c@span:20:fa0079de675211a02db49173 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:39:afc551599f5229a3bbe362bb
    statStep({ id: 'focusMagic', phase: 'c',
      writes: [...strengthFields, 'doomGaze', ...(isCoM1 ? ['gaze'] : []),
        ...rangedTypeFields, ...thrownTypeFields],
      when: () => focusMagicActive,
      // `runCtx`, not `ctx`: the enclosing name is this file's derivation context, while the
      // runner passes the sequence context that carries the permanent record.
      apply: (u, runCtx) => {
        if (!isCoM2) {
          for (const { target } of focusMagicBranchSlots) {
            // Arm 1 reads the permanent template pair, which is where a gaze shows: no step
            // writes a gaze type into the live slot, so the live read below is the two breaths.
            const baseType = target.rtbTypeRaw;
            const permanentAboveThrown = isMagicalRangedType(baseType)
              || baseType === 'fire' || baseType === 'lightning'
              || GAZE_TYPES.includes(baseType);
            if (permanentAboveThrown || slotHasBreath(u, target)) {
              u[target.strengthField] += 3;                          // com1:0x8F82D
              // The one engine field the calculator splits: the shared slot also carries the
              // gaze strength, mirrored into `gaze`/`doomGaze` (`stats.js`, `dosGazeStrength`).
              if (baseType === 'gaze_stoning' || baseType === 'gaze_death') u.gaze += 3;
              if (baseType === 'gaze_multiple') u.doomGaze += 3;
              continue;
            }
            u[target.rangedTypeField] = 'magic_s';                   // com1:0x8F840, shot type 34
            u[target.thrownTypeField] = 'none';
            // A floor, not an assignment: a typeless slot already above 3 keeps what it holds.
            if (u[target.strengthField] < 3) u[target.strengthField] = 3; // com1:0x8F845/0x8F84C
          }
          return;
        }
        // The three independent tests, in executable order.
        if (u.doomGaze > 0) u.doomGaze += 3;
        for (const c of channels) {
          if (isBreathFieldSlot(u, c) && u[c.strengthField] > 0) u[c.strengthField] += 3;
        }
        // The four-way ranged branch. `U.ranged := U.thrown; U.thrown := 0`
        // (Units.RecalculateUnits.pas:885-891) is a **move** between two fields of the modern
        // record, which is what leaves the Thrown field free for the Shadow Strike grant at
        // `UnitCalc.CAS:1262`. The DOS-shaped shared slot is both ends at once, so there the
        // move is a retype in place, its `B.ranged` read needs the permanent type pair to say
        // the one value is a conventional ranged attack at all, and it cannot hold a created
        // ranged attack beside a Breath already standing in it — the modern record's own Ranged
        // field is separate and always takes that write.
        //
        // Each arm's `U.rangedtype := 34` is `RangedType.INI [34]`, `IsMagic=Yes` with no other
        // classification the modern engine reads, so the modern token is `magic`. CoM 1's arm
        // above writes `magic_s` for the same id 34, because its
        // `Battle_Unit_Attack_Magic_Realm` really does make it Sorcery (com1:0x8F840; the CoM 1
        // manual changelog: "Shot type 22h is now Sorcery type").
        const base = runCtx.base;
        for (const { target, source } of focusMagicBranchSlots) {
          const inPlace = target === source;
          const baseRangedAbsent = !(base[target.strengthField] > 0
            && (!!target.channelKey || base[target.rangedTypeField] !== 'none'));
          const thrownStrength = !source ? 0
            : inPlace ? (slotHasThrown(u, source) ? u[source.strengthField] : 0)
              : u[source.strengthField];
          if (baseRangedAbsent && thrownStrength > 0) {
            if (!inPlace) {
              u[target.strengthField] = thrownStrength;
              u[source.strengthField] = 0;
              u[source.thrownTypeField] = 'none';
            }
            u[target.rangedTypeField] = 'magic';
            u[target.thrownTypeField] = 'none';
          } else if (baseRangedAbsent) {
            if (inPlace && slotHasBreath(u, target)) continue;
            u[target.strengthField] = 3;
            u[target.rangedTypeField] = 'magic';
            u[target.thrownTypeField] = 'none';
          } else if (!isMagicalRangedType(base[target.rangedTypeField])) {
            u[target.rangedTypeField] = 'magic';
          } else {
            u[target.strengthField] += 3;
          }
        }
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
    //
    // CoM 1 keeps its own Heavenly Light block in the space MoM used for True Light, entered at
    // com1:0x905BB from the relocated aura tail. It gates on the defending side plus a non-zero
    // `city_enchantments` byte and takes no node path. Its attack gates are both live and neither
    // carries a type test — `if (bu->ranged > 0)` writes the DOS shared slot whatever stands in
    // it, so a Thrown, Breath or gaze attack is raised exactly as a conventional ranged one is.
    // PROVENANCE[heavenlyLight]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:28:e751e4e796518f15a4a77481 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:e405a407e722dce9ad79aea3
    statStep({ id: 'heavenlyLight', phase: 'c',
      writes: ['def', 'res', 'atk', ...strengthFields,
        ...(isCoM1 ? ['gaze', 'doomGaze'] : [])],
      when: () => heavenlyLightActive,
      apply: u => {
        u.def += 1; u.res += 1;
        if (isCoM1) {
          if (u.atk > 0) u.atk += 1;
          for (const c of channels) {
            if (u[c.strengthField] > 0) u[c.strengthField] += 1;
          }
          if (u.gaze > 0) u.gaze += 1;
          if (u.doomGaze > 0) u.doomGaze += 1;
          return;
        }
        if (inputBaseAtk > 0) u.atk += 1;
        for (const c of channels) {
          if (isConventionalRangedSlot(u, c) && u[c.strengthField] > 0) u[c.strengthField] += 1;
        }
      } }),
    // One To-Hit write reaching melee and the secondary slots. Each half keeps its own gate,
    // both read from values fixed before this step, so they fold into the `apply`. CoM 1 makes
    // the same two writes from *inside* the strength gates above, so its halves read the live
    // melee and the live slot strength; the material condition both share is
    // `heavenlyLightMaterialTail` (stats.js). Reading those fields one step later is the same
    // test: the gate above only increments where the value was already positive, so a field is
    // positive after that step exactly when it was positive before it.
    // PROVENANCE[heavenlyLight:toHit]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:18:74dcaa7c7c6760a9196277c6 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:ca247f52483258db47263f1f
    statStep({ id: 'heavenlyLight:toHit', sourceId: 'heavenlyLight',
      sourceLabel: isCoM1 ? 'Heavenly Light' : 'Heavenly Light / Guardian node', phase: 'c',
      writes: ['toHitMelee', ...secondaryHitFieldsFor(['ranged', 'thrown'])],
      when: u => heavenlyLightMeleeToHitAt(u) !== 0
        || secondaryHitTargets.some(target =>
          hitTargetValue(u, target, heavenlyLightHitPick) !== 0),
      apply: u => {
        const meleeToHit = heavenlyLightMeleeToHitAt(u);
        if (meleeToHit !== 0) u.toHitMelee += meleeToHit;
        for (const target of secondaryHitTargets) {
          u[target.field] += hitTargetValue(u, target, heavenlyLightHitPick);
        }
      } }),
    ...(isCoM2 ? weaponStatSteps : []),
    ...abilByPhase.cBeforeHolyArmor,
    // The DOS half of the Chaos Channels fire-breath write, beside the demon-skin armor and
    // demon-wings blocks it shares `BU_Apply_Specials` with. Its modern counterpart is the
    // region-`a` step; the canonical version scope keeps exactly one of the two per version.
    chaosChannelsFireBreathStep(ctx, 'c'),
    // PROVENANCE[endurance]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:f1faba1a3ffce4883dce32c1 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:61c518b9d5be7ff83193cb0c | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:746a48490cec4055321bc210 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:746a48490cec4055321bc210
    statStep({ id: 'endurance', phase: 'c', writes: ['def', 'hp'],
      when: () => enduranceActive,
      apply: u => { u.def += enduranceDefMod; u.hp += enduranceHpMod; } }),
    // PROVENANCE[discipline]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:445349dde257497d94440bc9
    statStep({ id: 'discipline', phase: 'c', writes: ['def', 'atk', ...strengthFields],
      when: () => disciplineActive,
      apply: u => {
        u.def += disciplineDefMod; u.atk += disciplineAtkMod;
        if (levelRank >= 2) {
          for (const c of channels) {
            if (isNonMagicalRangedFieldSlot(u, c)) u[c.strengthField] += 1;
          }
        }
      } }),
    // Each of these is one enchantment's whole region-c write, hand-written here rather than
    // emitted from `getAbilityStatSteps` because its attack-strength half reads a per-channel
    // mod that builder never receives.
    ...(!isCoM1 ? [flameBladeStep] : []),
    // One write: the flat melee/defence package and the Breath addition the same block makes.
    // CoM/CoM2 Land Linking boosts melee and breath only.
    // PROVENANCE[landLinking]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:3fa8c2fabf80e91cf859f9b0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:df8d58cf51472b304559af37
    statStep({ id: 'landLinking', phase: 'c', writes: ['atk', 'def', ...strengthFields],
      when: () => landLinkingEligible,
      apply: (u, runCtx) => {
        if (hasMeleeAttackAt(runCtx)) u.atk += 2;
        u.def += 2;
        if (version.startsWith('com')) {
          for (const c of channels) {
            if (slotHasBreath(u, c)) u[c.strengthField] += 2;
          }
        }
      } }),
    // PROVENANCE[giantStrength]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:12:d3b7235f7b74f0d7c75b9b2f | Reference docs/DOS reconstructed/unitcalc.c@span:10:89de343d2e17866257ac560a
    statStep({ id: 'giantStrength', phase: 'c', writes: ['atk', ...strengthFields],
      when: () => !!(abilities && abilities.giantStrength),
      apply: (u, runCtx) => {
        if (hasMeleeAttackAt(runCtx)) u.atk += 1;
        // +1 Thrown only: not missile/boulder/magic ranged, and not breath.
        for (const c of channels) {
          if (slotHasThrown(u, c)) u[c.strengthField] += 1;
        }
      } }),
    // PROVENANCE[lionheart]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:0e597d1ff73a00332d952e72 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:87ae0c5af5c55a4b1df9577b | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:828f58debc909e639ff119f0
    statStep({ id: 'lionheart', phase: 'c', writes: ['atk', 'res', ...strengthFields, 'hp'],
      when: () => !!(abilities && abilities.lionheart),
      apply: (u, runCtx) => {
        if (hasMeleeAttackAt(runCtx)) u.atk += 3;
        u.res += 3;
        for (const c of channels) {
          if (isNonMagicalRangedFieldSlot(u, c)
            || (slotHasThrown(u, c) && version.startsWith('mom'))) u[c.strengthField] += 3;
        }
        u.hp += lionheartHpMod;
      } }),
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
    statStep({ id: 'orihalcon', phase: 'c', writes: ['res', ...strengthFields],
      when: () => orihalconActive,
      apply: u => {
        u.res += 1;
        for (const c of channels) {
          if (slotHasMagicalRanged(u, c)) u[c.strengthField] += 2;
        }
      } }),
    // One To-Hit write reaching melee and the secondary slots. Each half keeps its own gate —
    // melee on the enchantment alone, each secondary slot on the channel that reads the
    // modifier — and neither reads a field the other writes, so they fold into one `apply`.
    // PROVENANCE[holyWeapon]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:f35bf69e3356d00f90e013ed | Reference docs/DOS reconstructed/unitcalc.c@span:14:057c7ba8762bb65c4a011e69 | Reference docs/DOS reconstructed/unitcalc.c@span:12:1acacb263828739ad9aeab50 | Reference docs/DOS reconstructed/combat.c@span:11:be24e47e7e5719d3e16efdf5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:aeee04e431949f9a5f171311
    statStep({ id: 'holyWeapon', sourceId: 'holyWeapon',
      sourceLabel: 'Holy Weapon', phase: 'c',
      writes: ['toHitMelee', ...secondaryHitFieldsFor(['ranged', 'thrown'])],
      when: u => hwMeleeToHit !== 0
        || secondaryHitTargets.some(target =>
          hitTargetValue(u, target, holyWeaponHitPick) !== 0),
      apply: u => {
        if (hwMeleeToHit !== 0) u.toHitMelee += hwMeleeToHit;
        for (const target of secondaryHitTargets) {
          u[target.field] += hitTargetValue(u, target, holyWeaponHitPick);
        }
      } }),
    // Global enchantments, combat globals, and curses execute after Holy Armor's live
    // Defense test. Their ability steps must not participate in its > 5 branch decision.
    ...abilByPhase.c.filter(step => step.id !== 'mindStorm'),
    ...(!isWarlord && !isCoM2 && !isCoM1 ? [dosTrueLightStep] : []),
    // These hand-written steps and live reads are also later region-c sites. Keep their source
    // order at this boundary; F20 owns exhaustive ordering against the remaining ability spread.
    // PROVENANCE[reinforceMagic]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:c46cf0a067fb9eff1afc4064
    statStep({ id: 'reinforceMagic', phase: 'c', writes: ['res', ...strengthFields],
      when: () => !!(abilities && abilities.reinforceMagic),
      apply: u => {
        u.res += 2;
        for (const c of channels) {
          if (slotHasMagicalRanged(u, c)) u[c.strengthField] += 2;
        }
      } }),
    // Charm of Life reads live HP after every earlier HP writer, including Lionheart and Endurance.
    // PROVENANCE[charmOfLife]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:bac4e9b3eab5dcd73146e126 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:95fe4413d7ef9ab38400cfb7
    statStep({ id: 'charmOfLife', phase: 'c', writes: ['hp'],
      when: () => charmOfLifeActive,
      apply: u => { u.hp += Math.max(1, Math.trunc(u.hp / 4)); } }),
    // PROVENANCE[blazingMarch]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:31:d2ba78de4b00594fb355f0e5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:88f3514b127f13fa92f35d8e | Reference docs/DOS reconstructed/unitcalc.c@span:26:19d9b3041c4cba25ac05eebb | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:22:dc7d9d2e0bc077c6e02314a1 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:4:948215fe7c75f15252145bd4 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:4:2e38314c2c8fd875465a75dd
    statStep({ id: 'blazingMarch', phase: 'c', writes: ['atk', ...strengthFields],
      when: () => !!(abilities && abilities.blazingMarch),
      apply: (u, runCtx) => {
        if (hasMeleeAttackAt(runCtx)) u.atk += 3;
        // Warlord's script adds the Thrown branch the CoM2 binary does not have; the version
        // test is that difference, not a position correction.
        for (const c of channels) {
          if (u[c.rangedTypeField] === 'missile' || (isWarlord && slotHasThrown(u, c))) {
            u[c.strengthField] += 3;
          }
        }
      } }),
    // The melee penalty is -3 in every CoM engine and -2 in MoM; the attack-strength half
    // chooses its own branch and carries the same magnitude.
    // PROVENANCE[weakness]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:28:51bb7b42de5195f9edf69a86 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:e4cfc8d10fb6c6beee42bb6f | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:a64ed4008bd0ec13a817f841
    statStep({ id: 'weakness', phase: 'c', writes: ['atk', ...strengthFields],
      when: () => !!(abilities && abilities.weakness),
      apply: (u, runCtx) => {
        if (hasMeleeAttackAt(runCtx)) u.atk += version.startsWith('com') ? -3 : -2;
        for (const c of channels) {
          if (weaknessBinaryHits(u, c)) u[c.strengthField] -= weaknessPenalty;
        }
      } }),
    // The DOS block tests only `> 0` per slot: `unitcalc.c` 131:0x8F155 adds 2 to the shared
    // slot with no mutation test of any kind. A Chaos Channels fire breath is nevertheless
    // excluded in both MoM builds, by order alone — the fire-breath block *assigns* that slot
    // at 0x8F720, after the constructor's Chaos Surge at 0x8F113, discarding this bonus. CoM 1
    // calls `BU_Apply_Specials` first (com1:0x8F0E8), so there the bonus lands on top and keeps.
    // PROVENANCE[chaosSurge]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:8aac79f44ffe2fbae619cb5d | Reference docs/DOS reconstructed/unitcalc.c@span:28:ef6419306ce4c0b275103ee1 | Reference docs/DOS reconstructed/unitcalc.c@span:29:0f32c183c37c88a243ddb6cf | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:29:bc81b31ab5f15a3717465711
    statStep({ id: 'chaosSurge', phase: 'c',
      writes: ['res', 'atk', ...strengthFields, 'gaze', 'doomGaze'],
      when: () => chaosSurgeCount > 0,
      apply: (u, runCtx) => {
        u.res += chaosSurgeResBonus;
        if ((isCoM2 && hasMeleeAttackAt(runCtx)) || (!isCoM2 && u.atk > 0))
          u.atk += chaosSurgeMeleeBonus;
        for (const c of channels) {
          if (isCoM2) {
            if (u[c.rangedTypeField] !== 'none'
                || (slotHasBreath(u, c) && u[c.strengthField] > 0))
              u[c.strengthField] += chaosSurgeRtbBonus;
          } else if (u[c.strengthField] > 0) {
            u[c.strengthField] += chaosSurgeRtbBonus;
          }
        }
        if (!isCoM2) {
          if (u.gaze > 0) u.gaze += chaosSurgeRtbBonus;
          if (u.doomGaze > 0) u.doomGaze += chaosSurgeRtbBonus;
        }
      } }),
    // Berserk doubles melee and sets defence to 0 absolutely. MoM-only. Its position is
    // transcribed, not deduced: 131:0x8F832 is the last block of the unit-enchantment routine,
    // so the doubling takes every enchantment melee contribution above it and none of the
    // combat-enchantment blocks that follow. High Prayer's melee +2 is 131:0x902CF, after the
    // shift at 131:0x8F860.
    // PROVENANCE[berserk]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:086abf5cb60f1b58a36ab85f
    statStep({ id: 'berserk', phase: 'c', writes: ['def', 'atk'],
      when: () => classicBerserk, apply: u => { u.def = 0; u.atk *= 2; } }),

    // CoM2/Warlord's Eternal Night resistance write (+0x089A8/+0x0A8A2) precedes the
    // compiled Darkness block (+0x0A8DA/+0x0A90F). Both are before the Warps. CoM 1 instead
    // writes its Eternal Night penalty after Tactician, below.
    // CoM 1 makes the same write, but as the final stat write before its terminal clamp
    // (0x90B31) rather than before the Darkness block; each version's chain places it.
    // PROVENANCE[eternalNight:enemyResistance]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:3810e1c47b8eb421a7ebb24f | Reference docs/DOS reconstructed/unitcalc.c@span:17:72658795c2f8899328df83db
    statStep({ id: 'eternalNight:enemyResistance', phase: 'c', writes: ['res'],
      when: () => eternalNightEnemyResPenalty !== 0,
      apply: u => { u.res += eternalNightEnemyResPenalty; } }),
    // The DOS recompute writes the same +2 package near the head of region c. Caster.exe
    // dispatches its native node aura after the global-enchantment block and before the Moon
    // events/combat globals. The melee gate reads persistent BaseUnits.attack — `ctx.base`, the
    // record the `base` phase leaves, not the card's input (F133); conventional Ranged and both
    // Breath gates read their current fields. Thrown and every Gaze are absent.
    // PROVENANCE[nodeAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:31:548c2c98c01394a296fa188a
    statStep({ id: 'nodeAura', phase: 'c',
      writes: ['res', 'def', 'atk', ...strengthFields, 'gaze', 'doomGaze'],
      when: () => nodeAuraActive,
      apply: (u, runCtx) => {
        u.res += 2; u.def += 2;
        if (!isCoM2) {
          u.atk += 2;
          for (const c of channels) {
            if (u[c.strengthField] > 0) u[c.strengthField] += 2;
          }
          if (u.gaze > 0) u.gaze += 2;
          if (u.doomGaze > 0) u.doomGaze += 2;
        } else {
          if (runCtx.base.atk > 0) u.atk += 2;
          for (const c of channels) {
            if (isModernSecondarySlot(u, c) && u[c.strengthField] > 0) u[c.strengthField] += 2;
          }
        }
      } }),
    // CoM 1 jumps to this relocated side-maximum tail after its node/Guardian package and
    // returns before Heavenly Light and the curse/Warp tail. Unlike the modern aura pass, these
    // writes therefore remain visible to later reductions and the terminal clamp.
    // PROVENANCE[guidingBeaconAura]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:438880febda217f547fcb0e5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:abd8cf46993fffbdb3811617
    statStep({ id: 'guidingBeaconAura', sourceId: 'guidingBeaconAura',
      sourceLabel: 'Guiding Beacon aura', phase: 'c', writes: strengthFields,
      when: () => com1GuidingBeaconAura > 0,
      apply: u => {
        for (const c of channels) {
          if (u[c.rangedTypeField] === 'missile' || u[c.rangedTypeField] === 'boulder'
              || isMagicalRangedType(u[c.rangedTypeField])) {
            u[c.strengthField] += com1GuidingBeaconAura;
          }
        }
      } }),
    // PROVENANCE[divineBarrierAura]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:12:d15683dae66a031390912a26 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:39:df43d1668aa163cfcd4ab77e
    statStep({ id: 'divineBarrierAura', sourceId: 'divineBarrierAura',
      sourceLabel: 'Divine Barrier aura', phase: 'c', writes: ['def'],
      when: () => com1DivineBarrierAura > 0,
      apply: u => { u.def += com1DivineBarrierAura; } }),
    // PROVENANCE[soulLinkerAura]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:ddbd60d42c3858e92689d2e8 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:044e08011083c94abc942c1b
    statStep({ id: 'soulLinkerAura', sourceId: 'soulLinkerAura',
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
    statStep({ id: 'goodMoon', phase: 'c', writes: ['def', 'atk', ...strengthFields],
      when: () => goodMoonActive,
      apply: u => {
        u.def += 1;
        if (u.atk > 0) u.atk += 1;
        for (const c of channels) {
          if (isConventionalRangedSlot(u, c) && u[c.strengthField] > 0) u[c.strengthField] += 1;
        }
      } }),
    // PROVENANCE[natureConjunction]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:4c6f881ef1f956f17e1bd803
    statStep({ id: 'natureConjunction', phase: 'c',
      writes: ['res', 'def', 'atk', ...strengthFields],
      when: () => natureConjunctionActive,
      apply: u => {
        u.res += 2; u.def += 2;
        if (u.atk > 0) u.atk += 2;
        for (const c of channels) {
          if (isConventionalRangedSlot(u, c) && u[c.strengthField] > 0) u[c.strengthField] += 2;
        }
      } }),
    // PROVENANCE[darkness]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:30:a43a4b9b9c796ff5baa3e070 | Reference docs/DOS reconstructed/unitcalc.c@span:30:a6f103fc8632f6d1513712c0 | Reference docs/DOS reconstructed/unitcalc.c@span:8:7e6d93372e0de3d445a9db2b | Reference docs/DOS reconstructed/unitcalc.c@span:12:750dc4f6540b4d84533b2557 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:29:18f99324928d11bffe6f2858 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:e289006c649dcfb1c6e9a280
    // CoM 1 writes Darkness after its Warp block (0x9084C) rather than before, so its position
    // differs; each version's chain places it. The arithmetic differs too: CoM 1 lands the full
    // value on the reduced stat and touches both gazes, where CoM2 gates every field on being
    // positive and MoM gates only the attack fields.
    statStep({ id: 'darkness', phase: 'c',
      writes: ['res', 'def', 'atk', ...strengthFields, 'gaze', 'doomGaze'],
      when: () => hasDarkness,
      apply: u => {
        if (isCoM2) {
          if (darknessResBonus > 0 || u.res > 0) u.res += darknessResBonus;
          if (darknessDefBonus > 0 || u.def > 0) u.def += darknessDefBonus;
          if (u.atk > 0) u.atk += darknessAtkBonus;
          for (const c of channels) {
            if (u[c.strengthField] > 0) u[c.strengthField] += darknessAtkBonus;
          }
        } else {
          u.res += darknessResBonus;
          u.def += darknessDefBonus;
          if (darknessAtkBonus < 0 || u.atk > 0) u.atk += darknessAtkBonus;
          for (const c of channels) {
            if (darknessAtkBonus < 0 || u[c.strengthField] > 0) {
              u[c.strengthField] += darknessAtkBonus;
            }
          }
          if (darknessAtkBonus < 0 || u.gaze > 0) u.gaze += darknessAtkBonus;
          if (darknessAtkBonus < 0 || u.doomGaze > 0) u.doomGaze += darknessAtkBonus;
        }
      } }),

    // Warp Reality and Vertigo are recalculation writes, not resolution-time projections.
    // Their signed common Hit/To Defend values must therefore reach the region-e clamp in order.
    // PROVENANCE[warpReality]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:e5f3d5a32258982e16c67cb1 | Reference docs/DOS reconstructed/unitcalc.c@span:5:b56d82758c8a1388b292e2a1 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:5536c22c25f21fbaeed04a18
    statStep({ id: 'warpReality', sourceId: 'warpReality', sourceLabel: 'Warp Reality',
      phase: 'c', writes: ['toHit'], when: () => warpRealityActive && !unitIsChaos,
      apply: u => { u.toHit -= 20; } }),
    // PROVENANCE[vertigo]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:988ef64cd77214c23cb77397 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:a8adaeabe8e52ff5c76f42d2
    statStep({ id: 'vertigo', sourceId: 'vertigo', sourceLabel: 'Vertigo',
      phase: 'c', writes: ['toHit', 'toBlk'], when: () => vertigoActive,
      apply: u => {
        u.toHit -= vertigoHitPenalty * 100;
        u.toBlk -= vertigoBlockPenalty * 100;
      } }),
    // Mind Storm follows Vertigo and Weakness in the direct-curse tail and immediately
    // precedes the three Warp Creature variants. Its modern secondary write is limited to
    // conventional Ranged and Thrown by the source-shaped ability step.
    ...abilByPhase.c.filter(step => step.id === 'mindStorm'),

    // `BU_Apply_Specials` has two callers — the battle-unit constructor (131:0x8F2A2) and the
    // stat recompute (131:0x90A1D, immediately before Warp Creature at 0x90A2E). The second
    // call filters its enchantment argument to what the battle unit gained during combat, but
    // MoM 1.31 alone passes the mutations byte whole at both sites (CP 1.60 and CoM 1 pass 0),
    // so its three Chaos Channels blocks run a second time here. Only the fire-breath block is
    // observable twice: it *assigns* the shared slot, discarding every write that reached the
    // slot since the constructor's call. Exhaustively, for a unit the block admits — race
    // Chaos, `ranged_type` fire breath — those are the Chaos node aura (0x8FF97), Black Prayer
    // (0x907F0) and Mind Storm (0x9095E). The recompute's other slot writes are excluded by
    // their own gates: leadership and Weakness by race/class, True Light and Darkness by the
    // Life/Death race tests, Metal Fires by its missile-or-Thrown type test. The demon-wings
    // block re-runs as an idempotent flag OR, and the demon-skin armor block as a second `+3`
    // that `c:chaosChannels:armor` folds — see SPEC.md, *Deliberate deviations*.
    // PROVENANCE[chaosChannels:fireBreath:recompute]: VERIFIED versions=mom_1.31; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:405d890bc10f4abe231fc88a | Reference docs/DOS reconstructed/unitcalc.c@span:6:b9b73d98478711f2be56c0a9
    statStep({ id: 'chaosChannels:fireBreath:recompute',
      sourceId: 'chaosChannels:fireBreath', sourceLabel: 'Chaos Channels', phase: 'c',
      ...chaosChannelsFireBreathWrite(ctx) }),

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
      writes: ['atk', ...strengthFields, 'gaze', 'doomGaze'],
      when: () => !!(abilities && abilities.warpAttack),
      apply: u => {
        u.atk = isCoM2 ? Math.trunc(u.atk / 2) : Math.floor(u.atk / 2);
        if (isCoMVersion) {
          for (const c of channels) {
            u[c.strengthField] = isCoM2
              ? Math.trunc(u[c.strengthField] / 2) : Math.floor(u[c.strengthField] / 2);
          }
        }
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
    statStep({ id: 'shatter', phase: 'c', writes: ['atk', ...strengthFields],
      when: () => !!(abilities && abilities.shatter)
        && (isWarlord || isNormalUnitType(unitTypeVal) || unitTypeVal === 'hero'),
      apply: u => {
        if (u.atk > 0) u.atk = 1;
        for (const c of channels) {
          if (u[c.strengthField] > 0) u[c.strengthField] = 1;
        }
      } }),

    // --- c, after the Warp block ---
    // CoM 1 only: Darkness at 0x9084C, then Supreme Light at 0x90992. Both land at full value
    // on the reduced stat. Eternal Night is deliberately not folded in: it is after Tactician.
    // Q7, closed: `defense += resistance / 3` is a **live** read of the record, taken where the
    // engine takes it — after Warp Resist and Darkness, before Tactician (0x90992-0x90A53).
    // PROVENANCE[supremeLight]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:b1236fda671c45bc369f8550 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:21:57c5217db1d984c019548cee
    statStep({ id: 'supremeLight', phase: 'c', writes: ['def', 'atk', ...strengthFields],
      when: u => isCoM1 && supremeLightEligibleAt(u, recordContext),
      apply: u => {
        u.def += Math.trunc(u.res / 3);
        u.atk += 2;
        for (const c of channels) {
          if (u[c.strengthField] > 0) u[c.strengthField] += 2;
        }
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
  ];
}

// Heavenly Light's material tail writes Ranged only when the current type is not magical, and
// Thrown unconditionally; Holy Weapon does the same. Both leave Breath alone.
// Both write Ranged — non-magical types only — and Thrown, and leave Breath untouched
// (Units.RecalculateUnits.pas:1451-1454 and :1806-1809). A slot's ranged and thrown types are
// mutually exclusive, so picking by kind gives the DOS shared slot exactly the half its own live
// type admits. `Inc(U.hitchancethrown, 10)` carries no gate at all, so the Thrown half stands on
// the record's Thrown threshold before any later grant creates the attack that reads it;
// MoM 1.31 alone omits Holy Weapon's write.
function makeSecondaryHitPick(active, thrownValue) {
  return (u, context, kind) => {
    if (!active) return 0;
    if (kind === 'ranged') return isNonMagicalRangedFieldSlot(u, context) ? 10 : 0;
    if (kind === 'thrown') return thrownValue;
    return 0;
  };
}

// `d`: magic calc, in UnitCalc.CAS (Warlord only).
function magicCalcScriptStatSteps(ctx) {
  const {
    abilByPhase, abilities, blazeOfGloryActive, channels, colossalScaled,
    colossalStrength, energyCannon,
    hurricaneActive, isWarlord, levelRank,
    pneumaFieldActive, psychoForceActive, rangedTypeFields, recordContext, secondaryHitFieldsFor,
    secondaryHitTargets, secondaryHitFields, strengthFields, thrownTypeFields,
    shadowStrikeActive, trueSightRangedToHitBonus, vampirismActive,
    warlordBerserk, warlordCombatFlameBlade, warlordFlameBladeOwnsSlot,
    weaknessActive, weaknessBinaryHits, weaknessPenalty,
  } = ctx;
  const vampirismSources = channels.filter(c => c.slotKey !== 'legacy').length > 0
    ? channels.filter(c => c.slotKey !== 'legacy')
    : channels;
  const vampirismSourceValue = (u, c) =>
    (u[c.strengthField] > 0 && ['thrown', 'fire', 'lightning'].includes(u[c.thrownTypeField]))
      ? u[c.strengthField] : 0;
  return [
    // UnitCalc.CAS line order is load-bearing for the chance record. Mechanical Expert is
    // the first represented phase-d chance writer.
    ...abilByPhase.d.filter(step => step.id === 'mechanicalExpert'),
    statStep({ id: 'weakness', phase: 'd', writes: strengthFields,
      when: () => weaknessActive,
      apply: u => {
        // Warlord's script half, which reaches the two Breath fields the compiled block leaves
        // alone — and only where that block made no write to this slot.
        for (const c of channels) {
          if (!weaknessBinaryHits(u, c) && slotHasBreath(u, c)) u[c.strengthField] -= weaknessPenalty;
        }
      } }),
    // PROVENANCE[trueSight]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:4e6f968fae0403b40874b647
    statStep({ id: 'trueSight', sourceId: 'trueSight', sourceLabel: 'True Sight',
      phase: 'd', writes: secondaryHitFieldsFor(['ranged']), when: () => trueSightRangedToHitBonus !== 0,
      apply: u => {
        for (const target of secondaryHitTargets) {
          if (target.kindAt(u) === 'ranged') u[target.field] += trueSightRangedToHitBonus;
        }
      } }),
    // Combat-cast Flame Blade's script-only point is Fire Breath, not the selected shared
    // secondary channel. It executes after True Sight and before Berserk, so Warp (region c)
    // cannot halve it and Colossal Strength (later in d) does not scale it. One id, two
    // regions, one citation: `PROVENANCE[flameBlade]` (stats.js) covers this write too.
    statStep({ id: 'flameBlade', sourceId: 'flameBlade',
      sourceLabel: 'Flame Blade', phase: 'd', writes: strengthFields,
      when: u => warlordCombatFlameBlade
        && channels.some(c => warlordFlameBladeOwnsSlot(u, c)),
      apply: u => {
        for (const c of channels) {
          if (warlordFlameBladeOwnsSlot(u, c)) u[c.strengthField] += 1;
        }
      } }),
    // PROVENANCE[berserkWarlord]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:6:1f86b30d6505c657da0d1205
    statStep({ id: 'berserkWarlord', sourceId: 'berserkWarlord', sourceLabel: 'Berserk',
      phase: 'd', writes: ['toHit', 'toBlk'], when: () => warlordBerserk,
      apply: u => { u.toHit += 15; u.toBlk -= 10; } }),
    ...abilByPhase.d.filter(step => step.id === 'rust'),
    // Hurricane writes all three secondary channel modifiers, at HURRICANESTR 2: −10 per
    // strength on Ranged and Thrown, −15 per strength on Breath.
    // PROVENANCE[hurricane]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:16:06e78c928483b8a3e5c56c68
    statStep({ id: 'hurricane', sourceId: 'hurricane', sourceLabel: 'Hurricane',
      phase: 'd', writes: secondaryHitFields,
      when: () => hurricaneActive,
      apply: u => {
        // HURRICANESTR is 2 for a normally cast Hurricane: the script seeds 1 and adds 1 for
        // the cast level, which is the case its own comment at UnitCalc.CAS:558 states.
        for (const target of secondaryHitTargets) {
          u[target.field] -= target.kindAt(u) === 'breath' ? 30 : 20;
        }
      } }),
    // Favored Terrain is later in the same script, after Hurricane.
    ...abilByPhase.d.filter(step => step.id === 'favoredTerrain'),
    // Colossal Strength scales the attack as it stands at its own position in `d`
    // (UnitCalc.CAS:1227-1243 reads GetStat there), so everything before it in the file
    // scales and everything after does not. Under the buckets its input was a named subtotal;
    // here it is just `u.atk`.
    // PROVENANCE[colossalStrength]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:14:0df535b06a7a126d328bccbb
    statStep({ id: 'colossalStrength', phase: 'd', writes: ['atk', ...strengthFields],
      when: () => colossalStrength,
      apply: u => {
        // `SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+CSM))` (UnitCalc.CAS:1233) carries no
        // melee-presence test, while the two lines under it gate their own channels
        // (`SRangedType>0 %AND <30` at :1235, `SThrown>0` at :1239) — so the block's silence on
        // melee is deliberate, not an omission (F142).
        u.atk += colossalScaled(u.atk);
        for (const c of channels) {
          const physicalSecondary = u[c.rangedTypeField] === 'missile'
            || u[c.rangedTypeField] === 'boulder' || u[c.thrownTypeField] === 'thrown';
          if (u[c.strengthField] > 0 && physicalSecondary) {
            u[c.strengthField] += colossalScaled(u[c.strengthField]);
          }
        }
      } }),
    // The script snapshots Thrown / 2 and (Fire + Lightning) / 2, truncates their combined
    // total once, adds it to melee, then resets each positive source field independently. One
    // walk reads all three fields at this position directly — the cross-channel read F80 exists
    // to make expressible.
    // PROVENANCE[vampirism:transfer]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:14:c5d3faadcc9d84865b5f1463
    statStep({ id: 'vampirism:transfer', sourceId: 'vampirism:transfer',
      sourceLabel: 'Vampirism', phase: 'd',
      writes: ['atk', ...strengthFields],
      when: u => vampirismActive
        && channels.some(c => vampirismSourceValue(u, c) > 0),
      apply: u => {
        let source = 0;
        for (const c of vampirismSources) source += vampirismSourceValue(u, c);
        u.atk += Math.trunc(source / 2);
        for (const c of channels) {
          if (vampirismSourceValue(u, c) > 0) u[c.strengthField] = 1;
        }
      } }),
    // Shadow Strike follows both Colossal Strength and Vampirism, and therefore reads their
    // live melee result. `SThrown := SThrown + STRIKE` has no existence gate, so the grant is
    // an addition to the record's Thrown field whether or not the unit owns a Thrown attack:
    // the leading `+1` creates one at zero melee. The field is seeded empty and typeless where
    // the unit has none, and this step supplies the identity, so no predicate before
    // `UnitCalc.CAS:1262` sees a Thrown attack the grant has not yet made. It writes the
    // independent Thrown field even when another modern attack exists; the record's separate
    // fields preserve that channel separation.
    // PROVENANCE[shadowStrike:thrown]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:1a3b77e0b9b6ad575bde5d74
    statStep({ id: 'shadowStrike:thrown', sourceId: 'shadowStrike:thrown',
      sourceLabel: 'Shadow Strike', phase: 'd',
      writes: [...strengthFields, ...rangedTypeFields, ...thrownTypeFields],
      when: u => shadowStrikeActive && channels.some(c => isThrownFieldSlot(u, c)),
      apply: u => {
        for (const c of channels) {
          if (!isThrownFieldSlot(u, c)) continue;
          u[c.strengthField] += 1 + Math.trunc(u.atk / 3);
          u[c.rangedTypeField] = 'none';
          u[c.thrownTypeField] = 'thrown';
        }
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
    // PROVENANCE[energyCannonThreshold]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:9:415a610fbab04f989880d02e
    statStep({ id: 'energyCannonThreshold', sourceId: 'energyCannon',
      sourceLabel: 'Energy Cannon', phase: 'd', writes: ['energyCannonToHit'],
      when: () => energyCannon,
      apply: u => {
        u.energyCannonToHit = Math.min(100, u.toHit + u[recordContext.secondaryHitField]);
      } }),
    // The three effects that close `UnitCalc.CAS`, in its own line order: Blaze of Glory
    // (:1490), Beat of Swiftness (:1509), Hierophany (:1555). All three follow Colossal
    // Strength, and — now that the Warps are in `c` — all three follow those too.
    //
    // Blaze of Glory reads the unit's current Armor, adds that whole value to melee, then
    // subtracts the same value from Defense. The result at this position is exactly zero,
    // including Armor granted by enchantments; later region-e auras can still add Defense.
    // The same block's second transfer, `SThrown := SThrown + SRanged` followed by
    // `SRanged := SRanged - SRanged`, made here at its own position rather than as a
    // pre-sequence flip, so every earlier predicate still reads the conventional Ranged
    // identity the engine's earlier writes see. It moves the strength standing in the Ranged
    // field at this line — whatever region b, c and the earlier part of d left there — onto
    // the Thrown field, and empties Ranged.
    //
    // Two record shapes reach this step. Where the caller supplied modern channels, Ranged and
    // Thrown are separate fields — and both are always there to move between, because Focus
    // Magic and Lightning Blade move out of the Thrown field rather than spending it (F90) — so
    // the move is a real addition. Where it did not, the
    // DOS-shaped `legacy` slot carries one shared secondary value, so the same transfer is
    // expressed by the channel identity alone; the strength is already in the only field there
    // is. The engine writes no ranged *type* here (`UnitCalc.CAS` never assigns `SRangedType,0`)
    // — what retires the emptied Ranged attack there is `SETSTAT(U,SAmmo,0,0)` two lines later
    // (`:1502`), which the calculator does not model, so clearing the type is this model's
    // stand-in for that and keeps later region-`e` ranged writes off the emptied field.
    // PROVENANCE[blazeOfGlory]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:12:e27e857d1cda6919711e5456
    statStep({ id: 'blazeOfGlory', phase: 'd',
      writes: ['def', 'atk', ...strengthFields, ...rangedTypeFields, ...thrownTypeFields],
      when: () => blazeOfGloryActive,
      apply: u => {
        u.atk += u.def;
        u.def = 0;
        // `GetStat(U,SRanged,0)` names the record's Ranged field, not an attack the unit owns,
        // so the transfer takes whatever stands in that field — including the strength the
        // region-`c` blocks gated on `not Ismagicalranged` put there while it is typeless.
        // Which slot that field is has one home, `isRangedFieldSlot` (combat_abilities.js).
        const sources = channels.filter(c => c.isChannelSlot && isRangedFieldSlot(u, c));
        // The record's Thrown field: a Thrown channel that is neither a Ranged source itself
        // nor spent on a Breath — Lightning Blade converts the Thrown field into Lightning
        // Breath before this line, and that breath is not what `SThrown` names any more.
        const thrownField = channels.find(c => c.isChannelSlot && c.channelKey === 'thrown'
          && u[c.rangedTypeField] === 'none'
          && (u[c.thrownTypeField] === 'thrown' || u[c.thrownTypeField] === 'none'));
        for (const c of sources) {
          if (thrownField) {
            u[thrownField.strengthField] += u[c.strengthField];
            u[c.strengthField] = 0;
          } else {
            u[c.thrownTypeField] = 'thrown';
          }
          u[c.rangedTypeField] = 'none';
        }
        if (thrownField && sources.length) u[thrownField.thrownTypeField] = 'thrown';
        for (const c of channels) {
          if (c.isChannelSlot || !isRangedFieldSlot(u, c)) continue;
          u[c.rangedTypeField] = 'none';
          u[c.thrownTypeField] = 'thrown';
        }
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
    abilByPhase, channels, hasDoomGazeSlot, hasGazeRangedSlot,
    hasMeleeAttackAt,
    isCoM1, isCoM2, recordContext, secondaryHitFields, strengthFields, supremeLightEligibleAt,
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
    // The **secondary** slot zeroing below is the calculator's, not the engine's: a slot no
    // write ever reached is discarded rather than conjuring an attack, and which slots a record
    // carries is a type fact (F122, F135). Melee has no such pass — it is floored like the
    // engine floors it, and its presence question is asked per write instead (F142).
    // Caster.exe clamps the common Hit field first, then clamps each attack-specific
    // modifier against that normalized common value. Keeping these as two steps makes the
    // load-bearing order visible and preserves the channel modifier stored by the engine.
    // PROVENANCE[modernClampCommon]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:7ab1bb7e18b0870f20ec5ada
    statStep({ id: 'modernClampCommon', sourceId: 'statClamp',
      sourceLabel: 'Stat clamp', phase: 'e', writes: ['toHit'],
      when: () => isCoM2,
      apply: u => { u.toHit = Math.max(10, Math.min(100, u.toHit)); } }),
    // DOS stores one effective threshold per attack and clamps those final thresholds
    // directly. Its To Block floor remains 10%; modern defendchance has no region-e clamp.
    // PROVENANCE[dosClamp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:20:cb4fa9e7501e8b1aefe9a152 | Reference docs/DOS reconstructed/combat.c@span:21:f6ae6f3564fbf6300c289918
    statStep({ id: 'dosClamp', sourceId: 'statClamp', sourceLabel: 'Stat clamp',
      phase: 'e', writes: ['toHitMelee', ...secondaryHitFields, 'toBlk'], when: () => !isCoM2,
      apply: u => {
        u.toHitMelee = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitMelee));
        for (const field of secondaryHitFields) {
          u[field] = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u[field]));
        }
        u.toBlk = Math.max(10, Math.min(100, u.toBlk));
      } }),
    // The recompute's final floor, over the stat record and — in the modern engines only — the
    // per-attack To Hit offsets. The two touch disjoint fields, so the modern half is a branch
    // inside one step rather than a second id: this step is `SCOPE_ALL` and the To Hit clamp
    // has no DOS counterpart, which `e:dosClamp` above covers instead.
    // PROVENANCE[clamp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:264ed04fa725139a19a9de7d | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:f42794b5fb78038c35722afa | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:7ab1bb7e18b0870f20ec5ada
    statStep({ id: 'clamp', phase: 'e',
      writes: ['res', 'def', 'atk', ...strengthFields, 'hp', 'gaze', 'doomGaze',
        'toHitMelee', ...secondaryHitFields],
      apply: u => {
        if (isCoM2) {
          const floor = 10 - u.toHit;
          const ceiling = 100 - u.toHit;
          u.toHitMelee = Math.max(floor, Math.min(ceiling, u.toHitMelee));
          for (const field of secondaryHitFields) {
            u[field] = Math.max(floor, Math.min(ceiling, u[field]));
          }
        }
        u.res = Math.max(0, u.res);
        u.def = Math.max(0, u.def);
        // `if U.attack < 0 then U.attack := 0` (Units.RecalculateUnits.pas:2483) — a floor and
        // nothing more. The calculator used to zero melee here for a unit whose permanent melee
        // was 0, which no engine line does; whether a melee bonus lands is settled per write by
        // the writing block's own gate, so anything still standing here was written by a block
        // entitled to write it (F142).
        u.atk = Math.max(0, u.atk);
        // The slot is read at the clamp's own position, so a slot an earlier step created or
        // filled — Chaos Channels, Focus Magic, the Shadow Strike grant, the Blaze of Glory
        // transfer — is alive here and keeps what it holds, while one nothing ever reached is
        // discarded rather than conjuring an attack.
        for (const c of channels) {
          u[c.strengthField] = isLiveSlot(u, c) ? Math.max(0, u[c.strengthField]) : 0;
        }
        u.hp = Math.max(1, u.hp);
        // The DOS gaze strengths are two views of the one `.ranged` byte the line above floors,
        // so they take the same floor and no zero test of their own: `if (bu->ranged < 0)
        // bu->ranged = 0` is ungated (131:0x90B2F 160:= com1:0x90B54), and the delivery path
        // reads that same byte — `attack_strength = bu->ranged` (combat.c 131:0x99B0B), which
        // type 104 and the automatic-damage arm at 0x9A1E6 hand over whole. What the mirrors do
        // ask is whether a gaze stands in the record at all, and that is a **type** fact
        // (`hasGazeRangedSlot`/`hasDoomGazeSlot`, stats.js): a strength-0 gaze template an
        // earlier step raised keeps what it holds, exactly as the slot beside it does (F122).
        u.gaze = hasGazeRangedSlot ? Math.max(0, u.gaze) : 0;
        u.doomGaze = hasDoomGazeSlot ? Math.max(0, u.doomGaze) : 0;
      } }),
    // The aura pass: Holy Bonus (type 1), Resistance to All (type 3), and Misfortune (type 10).
    ...abilByPhase.e,
    // Q7, closed: Supreme Light is the last stat write the recompute makes, and its defence
    // component is a **live** read of Resistance — after Warp Resist, after `d`, and after the
    // aura pass, which is why the CoM2 manual's changelog says it is "applied last, after
    // Resistance To All, Holy Bonus, and Prayermaster". The melee write is gated on the
    // permanent record (`if B.attack > 0`), and the ranged one on the calculated record —
    // `if U.ranged > 0` (Units.RecalculateUnits.pas:2632), whose own comment marks that
    // difference. Neither tests a type, so the ranged half asks only which record field the
    // slot is and what strength stands in it *here*, after `d:blazeOfGlory` has emptied the
    // Ranged field and after the region-`e` clamp has zeroed a spent one.
    statStep({ id: 'supremeLight', phase: 'e', writes: ['def', 'atk', ...strengthFields],
      when: u => !isCoM1
        && (supremeLightEligibleAt(u, recordContext)
          || channels.some(c => supremeLightEligibleAt(u, c))),
      apply: (u, runCtx) => {
        if (supremeLightEligibleAt(u, recordContext)) {
          u.def += Math.floor(Math.max(0, u.res) / 3);
          if (hasMeleeAttackAt(runCtx)) u.atk += 2;
        }
        for (const c of channels) {
          if (supremeLightEligibleAt(u, c) && isRangedFieldSlot(u, c)
            && u[c.strengthField] > 0) {
            u[c.strengthField] += 2;
          }
        }
      } }),
  ];
}

// Every step this version might make, in region order. `deriveUnitStats` filters the list by
// canonical version scope and then walks the version's execution chain over the result, so the
// order here is an authoring convenience, not the execution order.
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
