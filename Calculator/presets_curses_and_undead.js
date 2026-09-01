// Numeric presets. Righteousness and the Death curses (Black Sleep through Vertigo) with the
// melee-exchange admission fixtures beside them, Undead and Animate Dead, Lionheart and Dispel
// Evil, the Warlord Outlander abilities, and the derivation order.
definePresets({
  // --- Righteousness ---
  righteousnessMagicChaos: {
    desc: 'Righteousness vs magic_c ranged: def→50 @100% block, 3 rtb @100% hit all blocked',
    a: { rtbType:'magic_c', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:2, toBlkMod:70, hp:10, abilities: { righteousness: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  righteousnessMagicNatureNotBlocked: {
    desc: 'Righteousness does NOT block magic_n ranged: 3 rtb @100% hit vs def 2 @100% block → 1 dmg',
    a: { rtbType:'magic_n', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:2, toBlkMod:70, hp:10, abilities: { righteousness: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Righteousness does not reach this realm, so the only feature the fixture adds cannot move the number.',
      'b.ability.righteousness':
        'Keep, and the absence is the rule under test: the Defense-50 write is realm-gated and Nature is outside it. righteousnessMagicChaos differs only in a.rtbType magic_n -> magic_c and pins 0 against this 1.000.',
    },
  },
  righteousnessFireBreath: {
    desc: 'Righteousness vs Fire Breath: def→50 blocks breath; melee 5 @100% vs def 2 @100% = 3',
    a: { atk:5, rtbType:'fire', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  righteousnessLightningBreath: {
    desc: 'Righteousness vs Lightning Breath: AP halves def then →50; melee 5 @100% vs def 2 @100% = 3',
    a: { atk:5, rtbType:'lightning', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  righteousnessPhysicalThrownNotBlocked: {
    desc: 'Righteousness does NOT block physical Thrown: 5 thrown @100% vs def 2 @100% = 3 + melee 3 = 6',
    a: { atk:5, rtbType:'thrown', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Righteousness does not reach a physical Thrown attack, so the only feature the fixture adds cannot move the number.',
      'b.ability.righteousness':
        'Keep, and the absence is the rule under test: the block is realm-gated and plain Thrown carries no realm. righteousnessFireBreath and righteousnessLightningBreath differ only in a.rtbType and pin 3.000 against this 6.000, the difference being the whole thrown 3 this fixture still delivers.',
    },
  },
  righteousnessMissileNotBlocked: {
    desc: 'Righteousness does NOT block missile ranged: 3 rtb @100% hit vs def 2 @100% block → 1 dmg',
    a: { rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:2, toBlkMod:70, hp:10, abilities: { righteousness: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Righteousness does not reach a missile, so the only feature the fixture adds cannot move the number.',
      'b.ability.righteousness':
        'Keep, and the absence is the rule under test: the block is realm-gated and a missile carries no realm. righteousnessMagicChaos differs only in a.rtbType missile -> magic_c and pins 0 against this 1.000.',
    },
  },
  righteousnessCauseFear: {
    desc: 'Righteousness vs Cause Fear: fear blocked, both do 5 dmg normally',
    a: { atk:5, toHitMod:70, hp:10, abilities: { fear: true } },
    b: { atk:5, toHitMod:70, hp:10, def:0, abilities: { righteousness: true } },
    expected: { dmgToA: 5.000, dmgToB: 5.000 },
    vacuity: {
      'a.ability.fear':
        'Keep. Inert as a consequence of the assertion: Righteousness blocks the fear roll, so with it on the attacker\'s Cause Fear has no effect left to remove and both sides trade their full 5. Righteousness is the live half at delta 5 - ablating it lets the fear land and both totals fall to 0.',
    },
  },
  righteousnessLifeSteal: {
    desc: 'Righteousness vs Life Steal −3: blocked (+30 Res), melee 1 @100% vs def 1 @100% = 0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:20, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.lifeSteal':
        'Keep. Inert as a consequence of the assertion: the +30 Resistance puts the drain out of reach, so its modifier cannot move an already-zero result. Righteousness is the live half at delta 3.6, which is lifeStealBasic\'s number.',
    },
  },
  righteousnessLifeStealDrain: {
    desc: 'Righteousness vs Life Steal −30: the +30 is inside the resistance the drain is a margin over, so Res 5 → 35 − 30 = 5 drains 1.500, not the 30.500 an unbonused −25 would',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -30 } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:60, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 1.500 },
  },
  righteousnessLifeStealDrain160: {
    desc: 'MoM 1.60 makes the same Righteousness write as 1.31: Life Steal −30 vs Res 5 drains 1.500',
    version: V_MOM_CP,
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -30 } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:60, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 1.500 },
  },
  righteousnessDeathGaze: {
    desc: 'Righteousness vs Death Gaze −3: kill roll blocked by +30 res, AND the hidden physical component blocked too — Righteousness sets defence 50 against a Chaos/Death-realm gaze in MoM. Total 0 (would be ~8 without it)',
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { res:5, hp:10, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 0.000 },
    vacuity: {
      'a.ability.deathGaze':
        'Keep. Inert as a consequence of the assertion, and of both halves of it: the +30 Resistance closes the kill roll and the Defense-50 write against a Death-realm gaze takes the hidden physical component too, so nothing is left for the gaze modifier to size. Righteousness is live at delta 8.06.',
    },
  },
  righteousnessStoningGazeNotBlocked: {
    desc: 'Righteousness does NOT block Stoning Gaze (Nature realm): same behavior as baseline',
    a: { rtbType:'gaze_stoning', rtb:1, hp:10, abilities: { stoningGaze: -3 } },
    b: { res:5, hp:10, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 8.060 },
    vacuity: {
      'b.ability.righteousness':
        'Keep, and the absence is the rule under test: a Stoning Gaze is Nature realm, outside the Chaos/Death gate that righteousnessDeathGaze measures. stoningGazeBasic differs only in this ability and pins the same 8.060, which is the control; the gaze half is live.',
    },
  },

  // --- Black Sleep ---
  blackSleepIncomingMelee: {
    desc: 'Black Sleep: 5 figs atk 2 vs sleeping 0 def — Doom: 5×2=10 exact dmg, no to-hit or def rolls',
    a: { figs:5, atk:2, hp:10 },
    b: { def:0, hp:10, abilities: { blackSleep: true } },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  blackSleepIgnoresDef: {
    desc: 'Black Sleep: 1 fig atk 5 vs sleeping def 5 — Doom ignores defense → exact 5 dmg',
    a: { atk:5, toHitMod:70, hp:10 },
    b: { def:5, hp:10, abilities: { blackSleep: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blackSleepIncomingRanged: {
    desc: 'Black Sleep: 3 figs missile rtb 3 vs sleeping 0 def — Doom: 3×3=9 exact dmg, no to-hit roll',
    a: { figs:3, rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:0, hp:10, abilities: { blackSleep: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 9.000 },
  },
  blackSleepIncomingGazeRanged: {
    desc: 'Black Sleep: hidden gaze ranged uses doom-style exact damage against sleeping targets, so shared gaze strength 1 always deals 1',
    a: { rtbType:'gaze_stoning', rtb:1, hp:10, abilities: {  } },
    b: { def:9, hp:10, abilities: { stoningImmunity: true, blackSleep: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  blackSleepCannotAttack: {
    desc: 'Black Sleep: sleeping unit cannot attack — A melee 5 hits B for 5 Doom, B counter 0 (sleeping)',
    a: { atk:5, toHitMod:70, hp:10 },
    b: { atk:5, def:0, hp:10, abilities: { blackSleep: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blackSleepAttackerCannotInitiateMelee: {
    desc: 'Black Sleep on attacker: melee combat never starts — both sides take 0 damage',
    a: { atk:5, toHitMod:70, hp:10, abilities: { blackSleep: true } },
    b: { atk:5, def:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  blackSleepAttackerCannotInitiateRanged: {
    desc: 'Black Sleep on attacker: ranged combat never starts — both sides take 0 damage',
    a: { figs:3, rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10, abilities: { blackSleep: true } },
    b: { def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  blackSleepIgnoresMissileImmunity: {
    desc: 'Black Sleep vs Missile Immunity: Doom bypasses immunity — 4 figs missile rtb 2 → exact 8 dmg',
    a: { figs:4, rtbType:'missile', rtb:2, toHitRtbMod:70, hp:10 },
    b: { def:0, hp:10, abilities: { blackSleep: true, missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
    vacuity: {
      'b.ability.missileImmunity':
        'Keep, and the absence is the rule under test: doom-style damage is assigned rather than rolled, so Missile Immunity has no roll to close against it. Black Sleep is the live half at delta 8 - ablating it lets the immunity bite and the total falls to 0.',
    },
  },

  // --- Melee-exchange admission (the contrast to Black Sleep's refusal above) ---
  // Attack strength admits nothing: `BU_AttackTarget`'s melee entry has no strength gate in any
  // DOS build and `PerformMeleeAttack` calls both the melee attack and the counterattack
  // unconditionally, so a card with no melee, no shared secondary and no gaze still engages and
  // still takes the counterattack. Baseline scenarios: they configure no ability to ablate, and
  // the number under test is the counterattack that arrives at all.
  zeroMeleeAttackerStillCounteredMoM131: {
    desc: 'Zero-strength melee attacker (MoM 1.31): the exchange is still admitted, so the defender counterattacks for 3 (1 fig, 100% hit) vs def 0 → dmgToA 3.0, while the attacker deals 0 (a whole-exchange strength guard would make both 0.0)',
    version: V_MOM_131,
    a: { atk:0, hp:20 },
    b: { atk:3, def:0, toHitMod:70, hp:20 },
    expected: { dmgToA: 3.000, dmgToB: 0.000 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. A baseline scenario by design, as the block comment above it says: the discriminator is a.atk 0, which candidates() does not enumerate, and the number under test is that the counterattack arrives at all. A whole-exchange strength guard would make both sides 0.0.',
    },
  },
  zeroMeleeAttackerStillCounteredMoM160: {
    desc: 'The same in MoM CP 1.60, which patches BU_ProcessAttack’s own zero-strength abort out entirely (0x99ED2, 7F→EB): dmgToA 3.0, dmgToB 0.0',
    version: V_MOM_CP,
    a: { atk:0, hp:20 },
    b: { atk:3, def:0, toHitMod:70, hp:20 },
    expected: { dmgToA: 3.000, dmgToB: 0.000 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The same baseline scenario in CP 1.60, which patches BU_ProcessAttack\'s own zero-strength abort out entirely (0x99ED2, 7F->EB); the discriminator is a.atk 0 together with the version, neither of which candidates() enumerates.',
    },
  },
  zeroMeleeAttackerStillCounteredCoM: {
    desc: 'The same in CoM 1 6.08, which carries CP 1.60’s patched abort: dmgToA 3.0, dmgToB 0.0',
    version: V_COM,
    a: { atk:0, hp:20 },
    b: { atk:3, def:0, toHitMod:70, hp:20 },
    expected: { dmgToA: 3.000, dmgToB: 0.000 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The same baseline scenario in CoM 1, which carries CP 1.60\'s patched abort; the discriminator is a.atk 0 together with the version, neither of which candidates() enumerates.',
    },
  },
  zeroMeleeAttackerStillCounteredCoM2: {
    desc: 'The same in CoM2 1.05.11, where ApplyAttack leaves early only on figs <= 0 and PerformMeleeAttack’s counterattack call is unconditional: dmgToA 3.0, dmgToB 0.0',
    version: V_COM2,
    a: { atk:0, hp:20 },
    b: { atk:3, def:0, hitChance:70, hp:20 },
    expected: { dmgToA: 3.000, dmgToB: 0.000 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The same baseline scenario in CoM2, where ApplyAttack leaves early only on figs <= 0 and PerformMeleeAttack\'s counterattack call is unconditional; the discriminator is a.atk 0 together with the version, neither of which candidates() enumerates.',
    },
  },

  // --- CoM 1 side maxima and Realm Ward ---
  guidingBeaconAuraCoM: {
    desc: 'CoM 1 Guiding Beacon side maximum adds 5 to conventional Ranged: 3 becomes 8.',
    version: V_COM,
    a: { atk:0, rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10, abilities: { guidingBeaconAura:5 } },
    b: { atk:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8 },
  },
  guidingBeaconExcludesThrownCoM: {
    desc: 'CoM 1 Guiding Beacon requires conventional ranged type; Thrown 3 stays 3.',
    version: V_COM,
    a: { atk:0, rtbType:'thrown', rtb:3, toHitRtbMod:70, hp:10, abilities: { guidingBeaconAura:5 } },
    b: { atk:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 3 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the aura does not reach a Thrown attack, so the only feature the fixture adds cannot move the number.',
      'name-binds-nothing':
        'Keep, and the absence is the rule under test. A tokenisation artefact as well - containsRun looks for \'guiding beacon aura\' and the key says \'guiding beacon excludes thrown\'. The discriminator is the attack type: guidingBeaconAuraCoM runs the same aura on a missile and pins 8 against this 3. It is not a one-value sibling - it also sets rangedCheck and rangedDist, which the thrown path does not use.',
    },
  },
  divineBarrierAuraCoM: {
    desc: 'CoM 1 Divine Barrier side maximum adds 5 Defense: 8 certain hits against 7 certain blocks deal 1.',
    version: V_COM,
    a: { atk:8, toHitMod:70, hp:10 },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { divineBarrierAura:5 } },
    expected: { dmgToA: 0, dmgToB: 1 },
  },
  soulLinkerAuraToHitCoM: {
    desc: 'CoM 1 Soul Linker value 5 gives a Fantastic unit ceil(5/2)=3 To Hit points: 10 dice at 33% deal 3.3 mean damage.',
    version: V_COM,
    a: { atk:10, hp:10, unitType:'fantastic_life', abilities: { soulLinkerAura:5 } },
    b: { atk:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.3 },
  },
  soulLinkerAuraToBlockCoM: {
    desc: 'CoM 1 Soul Linker value 5 gives a Fantastic unit floor(5/2)=2 To Block points: one shield blocks at 32%, leaving 9.68 mean damage.',
    version: V_COM,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { atk:0, def:1, hp:10, unitType:'fantastic_life', abilities: { soulLinkerAura:5 } },
    expected: { dmgToA: 0, dmgToB: 9.68 },
  },
  realmWardCoM: {
    desc: 'CoM 1 matching Chaos Realm Ward removes 3 Defense: 8 certain hits against 3 certain blocks deal 5.',
    version: V_COM,
    a: { atk:8, toHitMod:70, hp:10 },
    b: { atk:0, def:6, res:7, toBlkMod:70, hp:10, unitType:'fantastic_chaos', abilities: { realmWard:'chaos' } },
    expected: { dmgToA: 0, dmgToB: 5 },
  },

  // --- CoM 2 Spell Ward ---
  spellWardFantasticCoM2: {
    desc: 'CoM2 matching Chaos Spell Ward removes 3 Defense through the IsChaosUnit arm of the block at Units.RecalculateUnits.pas $005A5D36: def 6 becomes 3, so 8 certain hits against 3 certain blocks deal 5.',
    version: V_COM2,
    a: { atk:8, hitChance:70, hp:10 },
    b: { atk:0, def:6, res:7, toBlkMod:70, hp:10, unitType:'fantastic_chaos', abilities: { spellWard:'chaos' } },
    expected: { dmgToA: 0, dmgToB: 5 },
  },
  spellWardNonFantasticCoM2: {
    desc: 'Spell Ward reaches a non-Fantastic unit of the ward realm: the block at $005A5D36 is a settlement guard over five realm arms and nothing else, and Q31 shows IsChaosUnit is `(race = RCChaos) or (ChaosChannel and EncUndead)` with no Fantastic term. Chaos-race non-Fantastic def 6 becomes 3, so 8 certain hits against 3 certain blocks deal 5.',
    version: V_COM2,
    a: { atk:8, hitChance:70, hp:10 },
    b: { atk:0, def:6, res:7, toBlkMod:70, hp:10, identity: { baseFantastic:false, baseRace:'Chaos' }, abilities: { spellWard:'chaos' } },
    expected: { dmgToA: 0, dmgToB: 5 },
  },
  spellWardWrongRealmCoM2: {
    desc: 'Spell Ward is a realm test and nothing else: a Nature ward leaves the same Chaos Fantastic unit at Defense 6, so 8 certain hits against 6 certain blocks deal 2.',
    version: V_COM2,
    a: { atk:8, hitChance:70, hp:10 },
    b: { atk:0, def:6, res:7, toBlkMod:70, hp:10, unitType:'fantastic_chaos', abilities: { spellWard:'nature' } },
    expected: { dmgToA: 0, dmgToB: 2 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the assertion is that a ward of the wrong realm charges nothing, and every ablation available also charges nothing - dropping the ward leaves no ward, and dropping the Chaos realm leaves a unit no ward arm names.',
      'b.ability.spellWard':
        'Keep, and the absence is the rule under test: the block at $005A5D36 pairs each realm arm with its own city byte, so a Nature ward never reaches a Chaos unit. spellWardFantasticCoM2 differs only in spellWard nature -> chaos and pins 5.000 against this 2.000.',
    },
  },

  // --- Warp Creature ---
  warpAttackMelee: {
    desc: 'Warp Attack melee: atk 6 → floor(6/2)=3, 100% hit vs 0 def → 3 dmg',
    a: { atk:6, toHitMod:70, hp:10, abilities: { warpAttack: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  warpAttackNotRangedMoM: {
    desc: 'Warp Attack: missile rtb NOT halved in MoM — rtb 5 unchanged, 100% hit → 5 dmg',
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, abilities: { warpAttack: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Warp Attack does not reach the ranged slot in MoM, so the only feature the fixture adds cannot move the number.',
      'a.ability.warpAttack':
        'Keep, and the absence is the rule under test: MoM halves melee only. warpAttackHalvedCoM runs the same card in CoM 1, which halves the missile too, and pins 2.000 against this 5.000.',
    },
  },
  warpAttackHalvedCoM: {
    desc: 'Warp Attack CoM: missile rtb 5 → floor(5/2)=2, 100% hit → 2 dmg',
    version: V_COM,
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, abilities: { warpAttack: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  warpDefenseHalfMoM: {
    desc: 'Warp Defense MoM: def 9 → floor(9/2)=4, atk 5 100% hit 100% block → 5−4=1 dmg',
    a: { atk:5, toHitMod:70, hp:10 },
    b: { def:9, toBlkMod:70, hp:10, abilities: { warpDefense: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  warpDefenseThirdCoM: {
    desc: 'Warp Defense CoM: def 9 → floor(9/3)=3, atk 5 100% hit 100% block → 5−3=2 dmg',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10 },
    b: { def:9, toBlkMod:70, hp:10, abilities: { warpDefense: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  warpResistSetsToZero: {
    desc: 'Warp Resist: res 5 → 0, stoningTouch 0 → pFail 100%, E[dmg]=10.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: 0 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { warpResist: true } },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  warpResistMagicSurvives: {
    desc: 'Warp Resist + Resist Magic: res zeroed but RM +5 survives → res=5, pFail=50%, E[dmg]=5.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: 0 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { warpResist: true, resistMagic: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  warpAttackBeforeSupremeLightCoM: {
    desc: 'CoM 1 runs Warp Creature early in the recompute (0x9074C) and Supreme Light late (0x90992), so melee 5 halves to 2 and then gains +2 = 4. Adding first would give floor(7/2)=3.',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10, unitType:'fantastic_life', abilities: { supremeLight: true, warpAttack: true } },
    b: { def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  warpAttackHalvesGazeCoM: {
    desc: 'CoM 1 Warp Attack halves the shared .ranged slot with no ranged_type test (0x90764), so a hidden gaze of 5 fires at floor(5/2)=2.',
    version: V_COM,
    a: { rtbType:'gaze_stoning', rtb:5, atk:0, hp:10, toHitRtbMod:70, unitType:'normal', abilities: { warpAttack: true } },
    b: { atk:0, def:0, hp:20, abilities: { stoningImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 2 },
  },
  warpAttackBeforeTacticianCoM: {
    desc: 'CoM 1 writes the Tactician retort at 0x90AB4-0x90AF6, after the Warp Creature block: a hero\'s melee 5 halves to 2 and then gains Tactician\'s +2 = 4. Adding first would give floor(7/2)=3.',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10, unitType:'hero', abilities: { tactician: true, warpAttack: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  shatterBeforeSupremeLightCoM: {
    desc: 'CoM 1 caps a Shattered attack at 1 (0x907DC) and only then adds Supreme Light (0x90A2C), so melee 5 ends at 1+2=3, not 1. Nothing here involves Warp — it is the same post-Warp tail, applied in recompute order.',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10, abilities: { caster: true, supremeLight: true, shatter: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  warpDarknessOrderMoM: {
    desc: 'MoM runs Warp Creature last in the recompute (0x90A63), so Darkness\'s +1 on a Death creature is already in the melee it halves: floor((4+1)/2)=2.',
    version: V_MOM_131,
    darkness: true,
    a: { atk:4, toHitMod:70, hp:10, unitType:'fantastic_death', abilities: { warpAttack: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'combat.darkness':
        'Keep. Inert through arithmetic parity, not through absence: floor((4+1)/2) and floor(4/2) are both 2, so at an even melee the +1 cannot show. Measured: the same card at atk 5 gives 3 with Darkness and 2 without, so Darkness does reach a MoM Death creature and Warp does halve it afterwards. The fixture\'s live claim is the version ordering - warpAttack is live at delta 3, and warpDarknessOrderCoM pins 3.000 against this 2.000. The two jobs cannot share one card: the version contrast needs an even melee and an observable +1 needs an odd one, and at atk 5 both versions measure 3.',
    },
  },
  warpDarknessOrderCoM: {
    desc: 'CoM 1 moved Warp Creature to 0x9074C, ahead of Darkness at 0x908ED: floor(4/2)+1=3.',
    version: V_COM,
    darkness: true,
    a: { atk:4, toHitMod:70, hp:10, unitType:'fantastic_death', abilities: { warpAttack: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  gazeLevelLadderMoM: {
    desc: 'MoM\'s level routine has no ranged_type gate, so a Champion gaze takes the full ranged ladder: 5+3=8.',
    version: V_MOM_131,
    a: { rtbType:'gaze_stoning', rtb:5, atk:0, hp:10, toHitRtbMod:70, level:'champion', abilities: {  } },
    b: { atk:0, def:0, hp:20, abilities: { stoningImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 8 },
  },
  gazeLevelLadderCoM: {
    desc: 'CoM 1 skips the .ranged level step for ranged_type >= 100 on every row but Veteran (0x8FA9A), so a Champion gaze gains only +1: 5+1=6.',
    version: V_COM,
    a: { rtbType:'gaze_stoning', rtb:5, atk:0, hp:10, toHitRtbMod:70, level:'champion', abilities: {  } },
    b: { atk:0, def:0, hp:20, abilities: { stoningImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 6 },
  },
  doomGazeLevelLadderMoM: {
    desc: 'Doom Gaze strength is the same .ranged slot, so MoM\'s Champion ladder reaches it too: 4+3=7.',
    version: V_MOM_131,
    a: { rtbType:'gaze_multiple', rtb:4, hp:10, level:'champion' },
    b: { def:10, res:10, hp:10 },
    expected: { dmgToA: 0, dmgToB: 7 },
  },
  doomGazeLevelLadderCoM: {
    desc: 'CoM 1 gives the same Doom Gaze only the Veteran step: 4+1=5.',
    version: V_COM,
    a: { rtbType:'gaze_multiple', rtb:4, hp:10, level:'champion' },
    b: { def:10, res:10, hp:10 },
    expected: { dmgToA: 0, dmgToB: 5 },
  },
  warpDefenseBeforeSupremeLightCoM: {
    desc: 'CoM 1 Warp Defense (0x90776) runs before Supreme Light (0x90A4F): armor 9 → floor(9/3)=3, then + floor(res 9/3)=3 → 6. Atk 8 at 100% hit/block → 8−6=2. Adding first would give floor(12/3)=4 and 4 damage.',
    version: V_COM,
    a: { atk:8, toHitMod:70, hp:10 },
    b: { def:9, res:9, toBlkMod:70, hp:10, unitType:'fantastic_life', abilities: { warpDefense: true, supremeLight: true } },
    expected: { dmgToA: 0.600, dmgToB: 2.000 },
  },

  // --- Weakness ---
  weaknessMeleePenalty: {
    desc: 'Weakness melee: 5 atk − 2 = 3, 100% hit vs 0 def → 3 dmg',
    a: { atk:5, toHitMod:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  weaknessMissileRangedPenalty: {
    desc: 'Weakness missile ranged: 5 rtb − 2 = 3, 100% hit vs 0 def → 3 dmg',
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  weaknessThrownNotAffected131: {
    desc: 'Weakness thrown (MoM 1.31 bug): thrown 5 NOT reduced, melee 5 − 2 = 3 → total 8 dmg',
    a: { atk:5, rtbType:'thrown', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { weakness: true } },
    b: { atk:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  weaknessThrownFixed160: {
    desc: 'Weakness thrown (MoM 1.60 fixed): thrown 5 − 2 = 3, melee 5 − 2 = 3 → total 6 dmg',
    version: V_MOM_CP,
    a: { atk:5, rtbType:'thrown', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { weakness: true } },
    b: { atk:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  weaknessMeleePenaltyMoM: {
    desc: 'Weakness melee MoM: 5 atk − 2 = 3, 100% hit vs 0 def → 3 dmg',
    version: V_MOM_131,
    a: { atk:5, toHitMod:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  weaknessMeleePenaltyCoM2: {
    desc: 'Weakness melee CoM2: 5 atk − 3 = 2, 100% hit vs 0 def → 2 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  weaknessBoulderNotAffected: {
    desc: 'Weakness boulder: boulder rtb NOT reduced (only missile affected) — 5 rtb 100% vs 0 def → 5 dmg',
    a: { rtbType:'boulder', rtb:5, toHitRtbMod:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  weaknessBoulderNotAffectedMoM: {
    desc: 'Weakness boulder MoM: only missile is affected — 5 rtb 100% vs 0 def → 5 dmg',
    version: V_MOM_131,
    a: { rtbType:'boulder', rtb:5, toHitRtbMod:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Weakness does not reach a boulder in MoM, so the only feature the fixture adds cannot move the number.',
      'a.ability.weakness':
        'Keep, and the absence is the rule under test: MoM\'s penalty reaches missile only. weaknessBoulderPenaltyCoM runs the same card in CoM 1, where every ranged type is affected, and pins 2.000 against this 5.000. Note weaknessBoulderNotAffected is a byte-identical fixture at the same resolved version, filed under the artificial MoM group; this is the copy with the version-contrast job.',
    },
  },
  weaknessBoulderPenaltyCoM: {
    desc: 'Weakness boulder CoM 1: every ranged type is affected — 5 rtb − 3 = 2, 100% vs 0 def → 2 dmg',
    version: V_COM,
    a: { rtbType:'boulder', rtb:5, toHitRtbMod:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  weaknessMagicRangedNotAffectedMoM: {
    desc: 'Weakness magic ranged MoM: only missile is affected — 5 rtb 100% vs 0 def → 5 dmg',
    version: V_MOM_131,
    a: { rtbType:'magic_c', rtb:5, toHitRtbMod:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Weakness does not reach a magical ranged attack in MoM, so the only feature the fixture adds cannot move the number.',
      'a.ability.weakness':
        'Keep, and the absence is the rule under test: MoM\'s penalty reaches missile only. weaknessMagicRangedPenaltyCoM runs the same card in CoM 1 and pins 2.000 against this 5.000.',
    },
  },
  weaknessMagicRangedPenaltyCoM: {
    desc: 'Weakness magic ranged CoM 1: every ranged type is affected — 5 rtb − 3 = 2, 100% vs 0 def → 2 dmg',
    version: V_COM,
    a: { rtbType:'magic_c', rtb:5, toHitRtbMod:70, hp:10, abilities: { weakness: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  weaknessBreathNotAffectedCoM2: {
    desc: 'Weakness breath (CoM2): base melee 1 reduced to 0 by Weakness (−3) still initiates the sequence; fire breath 5 NOT reduced — 5 rtb 100% vs 0 def → 5 dmg (breath would not fire if base melee were 0)',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:5, type:'fire' } }, hp:10, abilities: { weakness: true } },
    b: { def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  weaknessBreathPenaltyWarlord: {
    desc: 'Weakness breath (Warlord): base melee 1 reduced to 0 by Weakness (−3) still initiates the sequence; fire breath 5 − 3 = 2 — 2 rtb 100% vs 0 def → 2 dmg',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:5, type:'fire' } }, hp:10, abilities: { weakness: true } },
    b: { def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },

  // --- Mind Storm ---
  mindStormMeleePenaltyMoM: {
    desc: 'Mind Storm MoM: 8 atk − 5 = 3, 100% hit vs 0 def → 3 dmg',
    a: { atk:8, toHitMod:70, hp:10, abilities: { mindStorm: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  mindStormRangedPenaltyMoM: {
    desc: 'Mind Storm MoM ranged: 8 rtb − 5 = 3, 100% hit vs 0 def → 3 dmg',
    a: { rtbType:'missile', rtb:8, toHitRtbMod:70, hp:10, abilities: { mindStorm: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  mindStormDefPenaltyMoM: {
    desc: 'Mind Storm MoM: -5 def. Defender 6 def reduced to 1, so 1 guaranteed hit vs 1 die at 70% block → 0.3 dmg',
    a: { atk:1, toHitMod:70, hp:10 },
    b: { def:6, toBlkMod:40, hp:10, abilities: { mindStorm: true } },
    expected: { dmgToA: 0, dmgToB: 0.300 },
  },
  mindStormMeleePenaltyCoM2: {
    desc: 'Mind Storm CoM2: 8 atk − 3 = 5, 100% hit vs 0 def → 5 dmg',
    version: V_COM2,
    a: { atk:8, hitChance:70, hp:10, abilities: { mindStorm: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },

  // --- Vertigo ---
  vertigoMeleeHitMoM: {
    desc: 'MoM Vertigo: -20% to hit on melee. Base 50% hit becomes 30%, so 1 atk vs 0 def → 0.3 dmg',
    version: V_MOM_131,
    a: { atk:1, toHitMod:20, hp:10, abilities: { vertigo: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.300 },
  },
  vertigoMeleeHitCoM2: {
    desc: 'CoM2 Vertigo: -25% to hit on melee. Base 50% hit becomes 25%, so 1 atk vs 0 def → 0.25 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:20, hp:10, abilities: { vertigo: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.250 },
  },
  vertigoMeleeHitCoM: {
    desc: 'CoM Vertigo: -30% to hit on melee. Base 50% hit becomes 20%, so 1 atk vs 0 def → 0.2 dmg',
    version: V_COM,
    a: { atk:1, toHitMod:20, hp:10, abilities: { vertigo: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.200 },
  },
  vertigoRangedHitMoM: {
    desc: 'MoM Vertigo: -20% To Hit on ranged attacks. Both To Hit fields are lifted by 20, putting the common hitchance field at 50 so the penalty is subtracted above the 10% floor the modern clamp applies to that field before the per-channel sum (Units.RecalculateUnits.pas:2456-2480): 50 - 20 = 30, so missile 1 vs 0 def → 0.3 dmg. Left at the default 30 the floor absorbs every version\'s penalty and MoM, CoM2 and CoM 1 all print 0.3. Probability is the subject here, so the +70% determinism convention deliberately does not apply.',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:1, toHitMod:20, toHitRtbMod:20, hp:10, abilities: { vertigo: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.300 },
  },
  vertigoRangedHitCoM2: {
    desc: 'CoM2 Vertigo: -25% To Hit on ranged attacks. Both To Hit fields are lifted by 20, putting the common hitchance field at 50 so the penalty is subtracted above the 10% floor the modern clamp applies to that field before the per-channel sum (Units.RecalculateUnits.pas:2456-2480): 50 - 25 = 25, so missile 1 vs 0 def → 0.25 dmg; without Vertigo the same shot deals 0.5. Left at the default 30 the floor absorbs MoM\'s -20, CoM2\'s -25 and CoM 1\'s -30 alike and all three print 0.3. Probability is the subject here, so the +70% determinism convention deliberately does not apply.',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitChance:20, hp:10, abilities: { vertigo: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.250 },
  },
  vertigoRangedHitCoM: {
    desc: 'CoM Vertigo: -30% To Hit on ranged attacks. Both To Hit fields are lifted by 20, putting the common hitchance field at 50 so the penalty is subtracted above the 10% floor the modern clamp applies to that field before the per-channel sum (Units.RecalculateUnits.pas:2456-2480): 50 - 30 = 20, so missile 1 vs 0 def → 0.2 dmg. Left at the default 30 the floor absorbs every version\'s penalty and MoM, CoM2 and CoM 1 all print 0.3. Probability is the subject here, so the +70% determinism convention deliberately does not apply.',
    version: V_COM,
    a: { rtbType:'missile', rtb:1, toHitMod:20, toHitRtbMod:20, hp:10, abilities: { vertigo: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.200 },
  },
  vertigoDefenseMoM: {
    desc: 'MoM Vertigo: -1 defense. Defender 1 def with 100% block loses the die entirely, so 1 guaranteed hit deals 1 dmg',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:10, abilities: { vertigo: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  vertigoDefenseCoM2: {
    desc: 'CoM2 Vertigo: -7% to block, not defense. Defender keeps 1 die but blocks at 93%, so 1 guaranteed hit deals 0.07 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:10, abilities: { vertigo: true } },
    expected: { dmgToA: 0, dmgToB: 0.070 },
  },
  vertigoDefenseCoM: {
    desc: 'CoM Vertigo: -1 to defend, not defense. Defender keeps 1 die but blocks at 90%, so 1 guaranteed hit deals 0.1 dmg',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:10, abilities: { vertigo: true } },
    expected: { dmgToA: 0, dmgToB: 0.100 },
  },
  vertigoImmolationDefenseMoM: {
    desc: 'MoM Vertigo directly reduces defense against Immolation: melee 1 + Immolation 4 at 30% To Hit vs 0 defense = 2.2 dmg',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { def:1, toBlkMod:70, hp:20, abilities: { vertigo: true } },
    expected: { dmgToA: 0, dmgToB: 2.200 },
  },
  vertigoWallOfFireDefenseMoM: {
    desc: 'MoM Vertigo directly reduces defense against Wall of Fire: strength 5 at 30% To Hit vs 0 defense = 1.5 dmg',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, def:1, toBlkMod:70, hp:20, abilities: { vertigo: true } },
    b: { def:1, toBlkMod:70, hp:20 },
    wallOfFire: true,
    expected: { dmgToA: 1.500, dmgToB: 0 },
  },
  vertigoWallOfFireDefenseCoM: {
    desc: 'CoM Vertigo directly reduces Wall of Fire To Block to 90%: strength 10 at 30% To Hit vs 1 defense = 2.125 dmg',
    version: V_COM,
    a: { atk:1, toHitMod:70, def:1, toBlkMod:70, hp:20, abilities: { vertigo: true } },
    b: { def:1, toBlkMod:70, hp:20 },
    wallOfFire: true,
    expected: { dmgToA: 2.125, dmgToB: 0 },
  },

  // --- Undead ---
  chaosSurgeReachesChaosChannelsUndeadCoM2: {
    desc: 'Chaos Surge (CoM2) still pays a Chaos-Channelled unit that a later Undead conversion re-tagged Death. The block gates on `IsChaosUnit(i)` at $005A1274, and the helper is `(race = RCChaos) or (ChaosChannel(u) and EncUndead)` at $00594FE4, so the Chaos realm `c:chaosChannels:armor:race` wrote and `c:undead` then overwrote is recovered by the second arm. One copy is +3 melee in CoM2: atk 5 -> 8, 100% To Hit against Defense 0 -> 8.000. Reading the scalar realm alone sees Death, the surge pays nothing, and the card deals 5.000.',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10, abilities: { ccDefense: true, undead: true } },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
    vacuity: {
      'a.ability.undead':
        'Keep, and the absence is the rule under test: the claim is that the Undead conversion does not cost this unit the surge, so ablating Undead has to leave the same 8.000 - it removes the very overwrite the recovery arm exists to undo. Both other features are live at delta 3: without a.ability.ccDefense there is no Chaos realm to recover, and without combat.chaosSurge there is no bonus.',
    },
  },
  undeadBypassesWeaponImmunity: {
    desc: 'Undead normal unit bypasses defender WI: unitType overridden to fantastic_death, WI does not trigger — 5 atk 100% vs def 2 → 4.4',
    version: V_MOM_CP,
    a: { atk:5, toHitMod:70, hp:10, unitType:'normal', abilities: { undead: true } },
    b: { def:2, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 4.400 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: Undead overrides the attacker\'s type to fantastic_death, and a Fantastic attacker is outside Weapon Immunity, so the immunity never triggers. Undead is the live half at delta 2.34 - ablating it restores the immunity and the total falls to 2.06.',
    },
  },
  undeadTriggersBless: {
    desc: 'Undead normal unit treated as Death unit: Bless gives blessed defender +3 def — 5 atk 100% vs def 2+3=5 → 3.5',
    version: V_MOM_CP,
    a: { atk:5, toHitMod:70, hp:10, unitType:'normal', abilities: { undead: true } },
    b: { def:2, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 3.500 },
  },
  undeadDeathImmunity131: {
    desc: 'Undead grants Death Immunity (v1.31): Death Gaze blocked, only physical gaze hits (0.3)',
    version: V_MOM_131,
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { res:5, hp:10, abilities: { undead: true } },
    expected: { dmgToA: 0, dmgToB: 0.300 },
  },
  undeadPoisonImmunityPatched: {
    desc: 'Undead grants Poison Immunity (patched): Poison blocked, only physical 1 atk hits',
    version: V_MOM_CP,
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 3 } },
    b: { def:0, res:5, hp:10, abilities: { undead: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'a.ability.poison':
        'Keep. Inert as a consequence of the assertion: the patched Undead grants Poison Immunity, so the poison strength cannot move a result the immunity has already emptied. Undead is the live half at delta 1.5, and undeadPoisonNotImmune131 is the unpatched 1.31 arm at 2.500.',
    },
  },
  undeadIllusionImmunityPatched: {
    desc: 'Undead grants Illusion Immunity (patched): armor not bypassed, 5 atk 100% vs def 6 30% → 3.201',
    version: V_MOM_CP,
    a: { atk:5, toHitMod:70, hp:10, abilities: { illusion: true } },
    b: { def:6, hp:10, abilities: { undead: true } },
    expected: { dmgToA: 0, dmgToB: 3.201 },
    vacuity: {
      'a.ability.illusion':
        'Keep. Inert as a consequence of the assertion: the patched Undead grants Illusion Immunity, so armor is not bypassed and the attacker\'s Illusion has nothing left to do. Undead is the live half at delta 1.799, and undeadIllusionNotImmune131 is the unpatched 1.31 arm at 5.000. version-dead is literally true and uninformative: this is the only mom_cp_1.60.00 preset that configures illusion at all, so CP\'s positive Illusion behaviour is unasserted.',
    },
  },
  undeadPoisonNotImmune131: {
    desc: 'Undead v1.31 bug: no Poison Immunity — poison 3 vs res 5, 1 atk → 1+1.5=2.5 dmg',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 3 } },
    b: { def:0, res:5, hp:10, abilities: { undead: true } },
    expected: { dmgToA: 0, dmgToB: 2.500 },
    vacuity: {
      'b.ability.undead':
        'Keep, and the absence is the rule under test: 1.31 grants no Poison Immunity with Undead, so the status changes nothing here. The poison half is live at delta 1.5, and undeadPoisonImmunityPatched is the patched CP arm at 1.000.',
    },
  },
  undeadIllusionNotImmune131: {
    desc: 'Undead v1.31 bug: no Illusion Immunity — illusion sets def to 0, 5 atk 100% → 5 dmg',
    version: V_MOM_131,
    a: { atk:5, toHitMod:70, hp:10, abilities: { illusion: true } },
    b: { def:6, hp:10, abilities: { undead: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.ability.undead':
        'Keep, and the absence is the rule under test: 1.31 grants no Illusion Immunity with Undead, so Illusion still sets Defense to 0 and the status changes nothing. The illusion half is live at delta 1.799, and undeadIllusionImmunityPatched is the patched CP arm at 3.201.',
    },
  },
  undeadNoPoisonImmunityCoM2: {
    desc: 'Undead status grants no Poison Immunity in CoM2 (CoM v5.45 removed it): poison 3 (−1 CoM save) vs res 5 → 3×0.6=1.8, + physical 1 atk 100% vs def 0 → 1.0, total 2.8. If undead still granted Poison Immunity this would be just 1.0.',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 3 } },
    b: { def:0, res:5, hp:10, abilities: { undead: true } },
    expected: { dmgToA: 0, dmgToB: 2.800 },
    vacuity: {
      'b.ability.undead':
        'Keep, and the absence is the rule under test: CoM v5.45 removed the grant, so Undead status confers no Poison Immunity in CoM2 and the poison lands in full. The poison half is live at delta 1.8. version-dead holds across the version: all three com2_1.05.11 presets that configure undead - this one, raiseDeadOverridesUndeadCoM2 and mysticSurgeOverridesUndeadCoM2 - are absence or override claims, so the key moves no number anywhere in CoM2.',
    },
  },

  // --- Animate Dead ---
  animatedBypassesWeaponImmunityCoM: {
    desc: 'Animated normal unit in CoM becomes fantastic_death and gains +1 attack: 5 atk → 6 vs def 2 with defender Weapon Immunity bypassed → 5.4',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10, unitType:'normal', abilities: { animated: true } },
    b: { def:2, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 5.400 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: Animated makes the attacker fantastic_death, and a Fantastic attacker is outside Weapon Immunity. Animated is the live half at delta 3.34, carrying both the bypass and its +1 attack. version-dead is literally true and uninformative: the only other com_6.08 preset that configures weaponImmunity, heavenlyLightMagicWeaponCoM, is also an absence claim, so CoM 1\'s positive Weapon Immunity behaviour is unasserted.',
    },
  },
  animatedAttackAndToHitCoM: {
    desc: 'Animated grants +1 attack and +10% To Hit in CoM: 1 atk at +20% base becomes 2 atk at 60% vs 0 def → 1.2',
    version: V_COM,
    a: { atk:1, toHitMod:20, hp:10, unitType:'normal', abilities: { animated: true } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.200 },
  },
  animatedGrantsWeaponImmunityCoM: {
    desc: 'Animated grants Weapon Immunity in CoM: normal 1-attack attacker only deals damage if all 9 defense dice fail → 0.040',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, unitType:'normal' },
    b: { def:0, hp:10, abilities: { animated: true } },
    expected: { dmgToA: 0, dmgToB: 0.040 },
  },
  animatedBreathBonusCoM2: {
    desc: 'Animated grants +1 thrown strength in CoM2: 1 thrown → 2, 100% hit vs 0 def → 2.0, against 1.0 without it. Base melee is 0 so the thrown channel is measured alone, and the defender holds 10 hit points: at the earlier 1 melee against a 2 HP defender the pool clipped 3 to 2 and printed the same 2.0 with the bonus removed.',
    version: V_COM2,
    a: { atk:0, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hitChance:70, hp:10, abilities: { animated: true } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  warpDefenseSignedBeforeSupremeLightCoM: {
    desc: 'CoM 1 Mind Storm makes Defense -4; Warp Defense truncates -4/3 to -1 before Supreme Light adds 5, ending at 4. Supreme Light\'s melee write is unconditional where its ranged write is positivity-gated (R6.1d evidence, 0x90A29..0x90A5C), so B\'s deliberately 0 melee becomes 2 and counters for 0.6 at the default 30% To Hit — the same 0.600 the sibling warpDefenseBeforeSupremeLightCoM asserts.',
    version: V_COM,
    a: { atk:8, toHitMod:70, hp:10 },
    b: { atk:0, def:1, res:20, toBlkMod:70, hp:10, unitType:'fantastic_life', abilities: { mindStorm:true, warpDefense:true, supremeLight:true } },
    expected: { dmgToA: 0.600, dmgToB: 4 },
  },
  warpDefenseSignedBeforeTacticianCoM: {
    desc: 'CoM 1 Mind Storm makes Defense -4; Warp Defense truncates -4/3 to -1 before hero Tactician adds 2, ending at 1.',
    version: V_COM,
    a: { atk:3, toHitMod:70, hp:10 },
    b: { atk:0, def:1, toBlkMod:70, hp:10, unitType:'hero', abilities: { mindStorm:true, warpDefense:true, tactician:true } },
    expected: { dmgToA: 0, dmgToB: 2 },
  },
  animatedDoomGazeUnchangedCoM2: {
    desc: 'Animated (CoM2) boosts ordinary secondary attacks but not independent Gaze fields: Doom Gaze 5 stays 5.',
    version: V_COM2,
    a: { atk:0, hp:10, abilities: { animated: true, doomGaze: 5 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'a.ability.animated':
        'Keep, and the absence is the rule under test: CoM2\'s Animated boosts ordinary secondary attacks but not the independent Gaze fields, so Doom Gaze 5 stays 5. The gaze half is live at delta 5, and animatedAttackAndToHitCoM shows the boost is otherwise real.',
    },
  },
  exorciseAnimatedCoM2: {
    desc: 'Exorcise −4 vs Animated res:7 in CoM2: Animated makes the target a created-undead fantastic Death unit, so the extra −3 applies and effective Resistance 0 always fails, while Animated weapon immunity reduces the 1 physical chip to 0.04 → 10.04',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: -4 } },
    b: { figs:2, def:0, res:7, hp:10, abilities: { animated: true } },
    expected: { dmgToA: 0, dmgToB: 10.040 },
  },

  // --- Blazing March ---
  blazingMarchMeleeCoM2: {
    desc: 'Blazing March +3 melee in CoM2: base 2 atk → 5, 100% hit vs 0 def → 5.0',
    version: V_COM2,
    a: { atk:2, hitChance:70, hp:10, abilities: { blazingMarch: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blazingMarchMissileIgnoresWICoM2: {
    desc: 'Blazing March +3 missile and magical weapons in CoM2: missile 2 → 5, Weapon Immunity does not apply, defender still blocks 2 → 3.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { blazingMarch: true } },
    b: { def:2, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blazingMarchFlameBladeStacksCoM2: {
    desc: 'Blazing March stacks with Flame Blade in CoM2: missile 1 +3 +2 = 6 → 6.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { blazingMarch: true, flameBlade: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  blazingMarchThrownWarlord: {
    desc: 'Blazing March +3 thrown in Warlord: thrown 2 → 5, 100% hit vs 0 def → 5.0 (defender dies on thrown, no melee)',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { thrown: { strength:2, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { blazingMarch: true } },
    b: { hp:5 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blazingMarchThrownIgnoresWIWarlord: {
    desc: 'Blazing March in Warlord upgrades thrown to magical: thrown 2 +3 = 5, Weapon Immunity does not apply, defender still blocks 2 → 3.0',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { thrown: { strength:2, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { blazingMarch: true } },
    b: { def:2, toBlkMod:70, hp:3, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blazingMarchThrownNotBoostedCoM2: {
    desc: 'Blazing March does not boost CoM2 Thrown strength, but its unit-wide EncMagic still bypasses Weapon Immunity: thrown 2 → 2 damage.',
    version: V_COM2,
    a: { atk:1, modernAttacks: { thrown: { strength:2, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { blazingMarch: true } },
    b: { def:0, toBlkMod:70, hp:2, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },

  // --- Lionheart ---
  lionheartMeleeAtk: {
    desc: 'Lionheart +3 melee: atk 5+3=8, 100% hit, def 0 → 8.0',
    a: { atk:5, toHitMod:70, hp:10, abilities: { lionheart: true } },
    b: { def:0, hp:100 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  lionheartRes: {
    desc: 'Lionheart +3 res: res 7+3=10 vs stoningTouch 0 → immune (pFail 0) → 1.0 (physical only)',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: 0 } },
    b: { figs:2, def:0, res:7, hp:5, abilities: { lionheart: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  lionheartHpMoM: {
    desc: 'Lionheart +3 HP in MoM: stoningTouch -7 overcomes res, hp 2+3=5 → kill=5hp → 1+5=6.0',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { figs:2, def:0, res:0, hp:2, abilities: { lionheart: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  lionheartHpCoM2: {
    desc: 'Lionheart floor(8/2)=4 HP in CoM: stoningTouch -7, hp 2+4=6 → kill=6hp → 1+6=7.0',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { figs:2, def:0, res:0, hp:2, abilities: { lionheart: true } },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  charmOfLifeHpLow: {
    desc: 'Charm of Life +1 HP (base ≤ 7): hp 4→5; 6 hits − 1 block = 5 net kills fig1 exactly, no overflow → 5.0. Without charm (hp=4) overflow of 1 would be blocked by fig2 → 4.0.',
    a: { atk:6, toHitMod:70, hp:10 },
    b: { figs:2, def:1, toBlkMod:70, hp:4, abilities: { charmOfLife: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  charmOfLifeHpHigh: {
    desc: 'Charm of Life +25% HP (base ≥ 8): hp 8+floor(8×0.25)=10; 12 hits − 2 blocks = 10 net kills fig1 exactly, no overflow → 10.0. Without charm (hp=8) overflow of 2 would be blocked by fig2 → 8.0.',
    a: { atk:12, toHitMod:70, hp:10 },
    b: { figs:2, def:2, toBlkMod:70, hp:8, abilities: { charmOfLife: true } },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  charmOfLifeReadsLiveHpCoM2: {
    desc: 'Charm of Life reads live HP after Endurance: hp 7+4=11, then +floor(11×0.25)=2 → 13 HP.',
    version: V_COM2,
    a: { atk:13, hitChance:70, hp:20 },
    b: { def:0, toBlkMod:70, hp:7, abilities: { endurance: true, charmOfLife: true } },
    expected: { dmgToA: 0, dmgToB: 13.000 },
  },
  lionheartMissileBonus: {
    desc: 'Lionheart +3 missile rtb: rtb 3+3=6, 100% hit → 6.0',
    a: { rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10, abilities: { lionheart: true } },
    b: { def:0, hp:100 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  lionheartBoulderBonus: {
    desc: 'Lionheart +3 boulder rtb: rtb 3+3=6, 100% hit → 6.0',
    a: { rtbType:'boulder', rtb:3, toHitRtbMod:70, hp:10, abilities: { lionheart: true } },
    b: { def:0, hp:100 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  lionheartNoMagicRangedBonus: {
    desc: 'Lionheart does not boost magic ranged: magic_c rtb 3 stays 3 → 3.0',
    a: { rtbType:'magic_c', rtb:3, toHitRtbMod:70, hp:10, abilities: { lionheart: true } },
    b: { def:0, hp:100 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Lionheart does not reach a magical ranged attack, so the only feature the fixture adds cannot move the number.',
      'a.ability.lionheart':
        'Keep, and the absence is the rule under test: the +3 goes to the physical ranged types only. lionheartBoulderBonus and lionheartMissileBonus differ only in a.rtbType and pin 6.000 against this 3.000.',
    },
  },
  lionheartThrownBonus: {
    desc: 'Lionheart +3 thrown and +3 melee: thrown 3+3=6 + melee 1+3=4 → 10.0',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:3, toHitRtbMod:70, hp:10, abilities: { lionheart: true } },
    b: { def:0, hp:100 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  lionheartThrownMoM: {
    desc: 'Lionheart boosts thrown in MoM: thrown 3+3=6 + melee 1+3=4 → 10.0',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:3, toHitRtbMod:70, hp:10, abilities: { lionheart: true } },
    b: { def:0, hp:100 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  lionheartThrownCoM2: {
    desc: 'Lionheart does not boost thrown in CoM2: thrown stays 3 + melee 1+3=4 → 7.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:3, type:'thrown' } }, hp:10, abilities: { lionheart: true } },
    b: { def:0, hp:100 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },

  // --- Dispel Evil ---
  dispelEvilBasicDC: {
    desc: 'Dispel Evil vs fantastic_death res:5 — pFail=0.9, 1 roll → E[dispel]=9, E[phys]=1 → 10.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:0, res:5, hp:10, unitType: 'fantastic_death' },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  dispelEvilUndead: {
    desc: 'Dispel Evil vs undead res:7 — -9 penalty, pFail=1.0 → E[dispel]=10, E[phys]=1 → 11.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:0, res:7, hp:10, abilities: { undead: true } },
    expected: { dmgToA: 0, dmgToB: 11.000 },
  },
  dispelEvilNormalImmune: {
    desc: 'Dispel Evil vs normal unit — no valid target type, dispel has no effect → 1.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:0, res:5, hp:10, unitType: 'normal' },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that a normal unit is not a valid target, so the only feature the fixture adds cannot move the physical 1.0.',
      'a.ability.dispelEvil':
        'Keep, and the absence is the rule under test: the dispel reaches Death and Chaos targets only. dispelEvilChaosChanneled runs the same normal unit with Chaos Channels and pins 10.000, which shows what a valid target costs.',
    },
  },
  dispelEvilMagicImmune: {
    desc: 'Dispel Evil vs magic immune fantastic_death — Magic Immunity blocks dispel → 1.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:0, res:5, hp:10, unitType: 'fantastic_death', abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'a.ability.dispelEvil':
        'Keep. Inert as a consequence of the assertion: Magic Immunity blocks the dispel, so its own presence cannot move a result the immunity has already emptied. Magic Immunity is the live half at delta 9 - ablating it lets the dispel land for 10.',
    },
  },
  dispelEvilHighRes: {
    desc: 'Dispel Evil vs fantastic_death res:14 — effectiveRes=10, immune → 1.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:0, res:14, hp:10, unitType: 'fantastic_death' },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: Res 14 against the -4 penalty leaves effective Res 10, which no roll can beat, so only the physical 1.0 remains.',
      'a.ability.dispelEvil':
        'Keep. The discriminator is b.res, which candidates() does not enumerate: dispelEvilChaos runs the same fantastic target at res 5 and pins 10.000. The absence is the subject.',
    },
  },
  dispelEvilChaosChanneled: {
    desc: 'Dispel Evil vs Chaos Channeled (fire breath) normal res:5 — pFail=0.9 → 10.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:0, res:5, hp:10, unitType: 'normal', abilities: { ccFireBreath: true } },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  dispelEvilChaos: {
    desc: 'Dispel Evil vs fantastic_chaos res:5 — pFail=0.9 → 10.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:0, res:5, hp:10, unitType: 'fantastic_chaos' },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  dispelEvilMultiFig: {
    desc: 'Dispel Evil 2-fig attacker vs 4-fig fantastic_death res:5 — 2 rolls pFail=0.9 → E[dispel]=18, E[phys]=2 → 20.0',
    a: { figs:2, atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:4, def:0, res:5, hp:10, unitType: 'fantastic_death' },
    expected: { dmgToA: 0, dmgToB: 20.000 },
  },
  dispelEvilThrown: {
    desc: 'Dispel Evil on thrown vs 2-fig fantastic_death res:5 — both phys blocked, dispel fires on thrown AND melee, pFail=0.9 each → E[kills]=1.8 × 5 hp = 9.0',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:1, toBlkMod:70, res:5, hp:5, unitType: 'fantastic_death' },
    expected: { dmgToA: 0, dmgToB: 9.000 },
  },
  dispelEvilRanged: {
    desc: 'Dispel Evil on ranged missile vs fantastic_death res:5 — missile fully blocked (def 1 + 100% block), dispel pFail=0.9 → 9.0',
    a: { atk:0, rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType: 'fantastic_death' },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 9.000 },
  },

  // --- Warlord v1.5.12.7 Outlander-derived unit abilities ---
  armorcladArmorWarlord: {
    desc: 'Armorclad reform on predefined mechanical Catapult: Armor 4+6=10; atk 10 at 100% hit vs the Catapult\'s 30% block deals 7.0.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    bUnitName: 'Catapult',
    b: { abilities: { outlanderWizard: true, armorcladReform: true } },
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'outlander wizard\' and \'armorclad reform\' and the key says \'armorclad armor warlord\'. Both features are live at delta 1.8, and the roster record the key relies on, the Catapult\'s mechanical Armor 4, is reached through bUnitName, which candidates() does not enumerate.',
    },
  },
  battleArmorWarlord: {
    desc: 'Armorclad reform derives Battle Armor for a non-mechanical regular unit: Armor 1+3=4; atk 10 deals 6.0.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:20, abilities: { outlanderWizard: true, armorcladReform: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'outlander wizard\' and \'armorclad reform\' and the key says \'battle armor warlord\'. Both features are live at delta 3, and battleArmorSkipsApotheosisPermanentFantasticWarlord is the paired exclusion that names this fixture as its control.',
    },
  },
  battleArmorSkipsApotheosisPermanentFantasticWarlord: {
    desc: 'The +3 branch is closed twice by `BASEFANTASTIC(U)`: once at UnitCalcPre.CAS:1104, which skips the whole combat-Outlander tail, and again inside its own test at :1110. Both read the permanent record, and Apotheosis writes `B.Fantastic := True` at $0059A390, so a unit given Apotheosis takes no Battle Armor. Negative claim, and the absence is the rule under test: Armor 1 + Apotheosis 4 = 5, and atk 10 at 100% hit against a 100% block chance deals 10 - 5 = 5.0. Reading the training-time flag instead added the +3 for Armor 8 and 2.0; the sibling battleArmorWarlord without Apotheosis shows the +3 is otherwise live.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:60,
      abilities: { outlanderWizard: true, armorcladReform: true, apotheosis: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blackpowderMissileWarlord: {
    desc: 'Rocketry derives Blackpowder: missile becomes heavy and gains AP; rtb 4 vs def 2 deals 3 physical, Poison 1 adds 1 → 4.0.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:4, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { outlanderWizard: true, rocketry: true } },
    b: { def:2, toBlkMod:70, hp:20, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A tokenisation artefact - containsRun looks for \'outlander wizard\' and \'rocketry\' and the key says \'blackpowder missile warlord\'. Both are live at delta 4. b.abilities.missileImmunity is inert on purpose and is the fixture\'s second claim: Blackpowder makes the missile heavy, and a heavy missile is outside Missile Immunity, so the defender\'s immunity never bites.',
    },
  },
  bombsGrenadesWarlord: {
    desc: 'Explosive derives Bombs&Grenades for a 4-figure melee unit: Thrown 6 plus melee 1 at 100% hit = 28.0.',
    version: V_WARLORD,
    a: { figs:4, atk:1, hitChance:70, hp:10, abilities: { outlanderWizard: true, explosive: true } },
    b: { def:0, toBlkMod:70, hp:50 },
    expected: { dmgToA: 0, dmgToB: 28.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'outlander wizard\' and \'explosive\' and the key says \'bombs grenades warlord\'. Both features are live at delta 24, and bombsGrenadesAfterCombatConversionWarlord names this fixture as its control.',
    },
  },
  bombsGrenadesAfterFieryFuryWarlord: {
    desc: 'Fiery Fury (UnitCalcPre.CAS:832-846) runs before the Bombs&Grenades block (:1066-1080) in the same file, so it cannot see the Thrown field that block creates. 4-figure melee 1 unit: Fiery Fury gives +3 melee only (atk 4), Bombs&Grenades then grants Thrown floor(8 - 4/2) = 6, and 4 figures at 100% hit against 0 Defense deal (4 + 6) x 4 = 40.0. Reading the pair after the grant instead gave Fiery Fury its +2 Thrown as well, for Thrown 8 and 48.0; dropping Fiery Fury leaves the sibling bombsGrenadesWarlord fixture at 28.0, so the melee half is still live.',
    version: V_WARLORD,
    a: { figs:4, atk:1, hitChance:70, hp:10, abilities: { outlanderWizard: true, explosive: true, fieryFury: true } },
    b: { def:0, toBlkMod:70, hp:50 },
    expected: { dmgToA: 0, dmgToB: 40.000 },
  },
  bombsGrenadesAfterCombatConversionWarlord: {
    desc: 'The enclosing gate is `IF (BASEFANTASTIC(U)>0) %AND (GETSTAT(U,SMultiLabel,1)<>14) THEN { GOTO "NOTSAPIENS"; }` (UnitCalcPre.CAS:1062-1064) — both terms read the permanent record, as the sibling grants under the same label already do (firstFourEligible, stats_identity.js). Raise Dead makes the unit fantastic during combat and the grant still lands: Thrown 6 plus melee 1 over 4 figures at 100% hit = 28.0, the same as the sibling bombsGrenadesWarlord. Reading the combat-converted identity instead withheld the whole Thrown channel and left melee alone at 4.0.',
    version: V_WARLORD,
    a: { figs:4, atk:1, hitChance:70, hp:10,
      abilities: { outlanderWizard: true, explosive: true, raiseDead: true } },
    b: { def:0, toBlkMod:70, hp:50 },
    expected: { dmgToA: 0, dmgToB: 28.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A tokenisation artefact for the two live features, both at delta 24. a.abilities.raiseDead is inert on purpose and is the fixture\'s whole claim: the NOTSAPIENS gate reads the permanent record, so Raise Dead making the unit Fantastic during combat does not close it and the grant still lands at bombsGrenadesWarlord\'s 28.0. Reading the combat-converted identity instead withheld the Thrown channel for 4.0.',
    },
  },
  bombsGrenadesReadsPermanentMeleeAfterRebuildWarlord: {
    desc: 'The write gate is `IF (GETSTAT(U,SAttack,1)>0) %OR (GETSTAT(U,AFlying,1)>0)` (UnitCalcPre.CAS:1068-1069). Record selector 1 is the base unit (CAS reference, Scripts.TXT:270), so the melee term is the permanent record the `base` phase leaves, not the card\'s input: Rebuild writes `SETSTAT(TU,SAttack,1,…+2)` permanently at OLSpell.CAS:588, before region `b` runs. A 4-figure unit with roster melee 0 therefore reaches the grant — melee 2 and Thrown floor(8 - 4/2) = 6 over 4 figures at 100% hit against 0 Defense = (2 + 6) x 4 = 32.0. Reading the card\'s melee input instead withheld the whole Thrown channel and left Rebuild\'s melee alone at 8.0; dropping Rebuild leaves 0.0, since the unit then has neither melee nor the grant.',
    version: V_WARLORD,
    a: { figs:4, atk:0, hitChance:70, hp:10,
      abilities: { outlanderWizard: true, explosive: true, rebuild: true } },
    b: { def:0, toBlkMod:70, hp:50 },
    expected: { dmgToA: 0, dmgToB: 32.000 },
  },
  bombsGrenadesSkipsApotheosisPermanentFantasticWarlord: {
    desc: 'The `NOTSAPIENS` gate reads `BASEFANTASTIC(U)`, which is the base unit data "before applying continuous effects such as buffs or curses" (CAS reference, Scripts.TXT:286) — the permanent record, and Apotheosis writes `B.Fantastic := True` at $0059A390, which persists into BaseUnits and every later recalculation. So a unit given Apotheosis is Fantastic to this gate and loses the whole grant. Negative claim, and the absence is the rule under test: melee 1 doubled by Apotheosis is 2 over 4 figures at 100% hit vs def 0 → 8.0. Reading the training-time flag instead granted Thrown 6, which Apotheosis then doubled to 12, for (2 + 12) x 4 = 56.0. The `SMultiLabel = 14` (Sapiens) arm is the exemption that keeps the grant open for a base-Fantastic unit and is unaffected.',
    version: V_WARLORD,
    a: { figs:4, atk:1, hitChance:70, hp:10,
      abilities: { outlanderWizard: true, explosive: true, apotheosis: true } },
    b: { def:0, toBlkMod:70, hp:60 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  upgradedExplosiveFireWarlord: {
    desc: 'Rocketry + Explosive derives Upgraded Explosive: the Blackpowder branch (UnitCalcPre.CAS:1074-1077) doubles Fire Breath 3+4 to 14, and Blackpowder Poison rides both that call and the unconditional melee call for 16.0. Base melee 0 keeps the separate Explosive Thrown grant at :1066-1080 shut — that one is gated on base melee > 0 or Flying — so the doubling is measured alone. Dropping Explosive leaves 9.0; dropping Rocketry leaves 3.0. The earlier 20.0 reading was the 20 HP defender capping a 25.0 total that included the Thrown channel, not a measurement of the doubling.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { fireBreath: { strength:3, type:'fire' } }, hitChance:70, hp:10, abilities: { outlanderWizard: true, rocketry: true, explosive: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 16.000 },
  },
  trueLightSkipsExplosiveChannelsWarlord: {
    desc: 'True Light\'s Life branch (UnitCalcPre.CAS:1518-1547) writes only SAttack, SRanged, SDefense and SResist (plus a To Hit penalty for illusion attacks), never breath or thrown, so neither channel Explosive produced can be touched by it and no ordering between the two can change a number. Sanctify makes this normal unit Life; Fire Breath 3+4 doubles to 14, Explosive adds Thrown %I(8 - figures/2) = 7, melee is 1 + True Light 1 = 2, and Blackpowder Poison rides all three attacks: 26.0. A True Light that also wrote breath and thrown would deal 28.0. Dropping Explosive leaves 11.0.',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { fireBreath: { strength:3, type:'fire' } }, hitChance:70, hp:10,
      abilities: { outlanderWizard: true, sanctify: true, rocketry: true, explosive: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    trueLight: true,
    expected: { dmgToA: 0, dmgToB: 26.000 },
  },
  energyWeaponryMeleeWarlord: {
    desc: 'Energy Beam Weapons derives Energy Weaponry for a regular unit: melee 5 becomes exact Doom 2 through def 10.',
    version: V_WARLORD,
    a: { atk:5, hp:10, abilities: { outlanderWizard: true, energyBeamWeapons: true } },
    b: { def:10, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'outlander wizard\' and \'energy beam weapons\' and the key says \'energy weaponry melee warlord\'. Both features are live at delta 2.',
    },
  },
  energyWeaponrySkipsApotheosisPermanentFantasticWarlord: {
    desc: 'The Outlander-soldier gate is `IF (GETENCHANTMENTFLAG(U,EncArmorClad,0)=0) %AND (GetStat(U,SCustomAttribute,1)=1) %OR (BASEFANTASTIC(U)>0) THEN { GOTO "NOTOUTLANDERSOLDIER"; }` (UnitCalc.CAS:1398-1400), whose last term is the permanent record that Apotheosis writes. Negative claim, and the absence is the rule under test: melee 10 doubled by Apotheosis is 20, and at 100% hit against Armor 5 with a 100% block chance that is 15.0, above Supernatural\'s round(20 x 0.34) = 7 floor. Reading the training-time flag instead gave the unit Energy Weaponry, whose exact Doom ignores Armor entirely and caps the attack at floor(20/2) = 10.0; the sibling energyWeaponryMeleeWarlord without Apotheosis shows the Doom conversion is otherwise live.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10,
      abilities: { outlanderWizard: true, energyBeamWeapons: true, apotheosis: true } },
    b: { def:5, toBlkMod:70, hp:60 },
    expected: { dmgToA: 0, dmgToB: 15.000 },
  },
  energyWeaponryRangedUnaffectedWarlord: {
    desc: 'Energy Weaponry is melee-only: ranged 5 remains conventional and deals 5 at 100% hit vs def 0.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:5, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { outlanderWizard: true, energyBeamWeapons: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the derivation is melee-only, so neither the reform nor its source can reach this card\'s ranged attack.',
      'name-binds-nothing':
        'Keep, and the absence is the rule under test. A tokenisation artefact as well - containsRun looks for \'energy beam weapons\' and the key says \'energy weaponry ranged unaffected\'. energyWeaponryMeleeWarlord is the positive arm, where the same pair is live at delta 2.',
    },
  },
  energyCannonDoomWarlord: {
    desc: 'Energy Cannon: ranged 5 gains floor(50%)=2, then Beam Doom deals floor(7/2)=3; Magic Immunity blocks Destruction but not Beam Doom.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:5, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { outlanderWizard: true, mechanical: true, heatPowerEngine: true, energyBeamWeapons: true } },
    b: { def:20, toBlkMod:70, res:5, hp:20, abilities: { magicImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for each of the four attacker abilities and the key says \'energy cannon doom warlord\'. All five features are live: the four attacker abilities at delta 3, and b.abilities.magicImmunity at delta 17, which is the fixture\'s second claim - Magic Immunity blocks Destruction but not Beam Doom.',
    },
  },
  energyCannonDestructionWarlord: {
    desc: 'Energy Cannon at 30% Ranged To-Hit grants Destruction -2. Beam strength 1 halves to 0; Res 5→3 gives a 70% whole-unit kill, and the engine\'s flat 150 clips at the 10 HP pool for 7.0 EV.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hp:10, abilities: { outlanderWizard: true, mechanical: true, heatPowerEngine: true, energyBeamWeapons: true } },
    b: { def:20, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for each of the four abilities and the key says \'energy cannon destruction warlord\'. All four are live at delta 7.',
    },
  },
  psychoForceWarlord: {
    desc: 'Psycho Converter derives Psycho Force: Champion current Res 7 × Level 5 / 2 = 17%; atk 5 at 57% → 2.85.',
    version: V_WARLORD,
    a: { atk:1, level:'champion', res:4, hp:10, abilities: { outlanderWizard: true, psychoConverter: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 2.850 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'outlander wizard\' and \'psycho converter\' and the key says \'psycho force warlord\'. All three features are live: the reform pair at delta 0.85 and a.level=champion at delta 2.55, the level being half the derived To Hit formula.',
    },
  },
  pneumaFieldWarlord: {
    desc: 'Pneuma Reactor derives Pneuma Field at current Res 5: blocked physical attack plus Life Steal -2 deals 2.8 EV.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, res:5, hp:10, abilities: { outlanderWizard: true, pneumaReactor: true } },
    b: { def:1, toBlkMod:70, res:5, hp:20 },
    expected: { dmgToA: 0, dmgToB: 2.800 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'outlander wizard\' and \'pneuma reactor\' and the key says \'pneuma field warlord\'. Both features are live at delta 2.8.',
    },
  },
  magitekEngineeringWarlord: {
    desc: 'Heat Power Engine + Magitek Engineering gives a mechanical defender +20% To-Defend: atk 10 at 100% hit vs 50% block deals 5.0.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:10, hp:20, abilities: { outlanderWizard: true, mechanical: true, heatPowerEngine: true, magitekEngineering: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  radioSkipsApotheosisPermanentFantasticWarlord: {
    desc: 'Radio, Xenopsychology and Ballistics Training sit under the same `NOTSAPIENS` gate as Bombs&Grenades — `IF (BASEFANTASTIC(U)>0) %AND (GETSTAT(U,SMultiLabel,1)<>14) THEN { GOTO "NOTSAPIENS"; }` (UnitCalcPre.CAS:1062-1064) — and both terms read the permanent record, which Apotheosis writes at $0059A390. Negative claim, and the absence is the rule under test: melee 10 doubled by Apotheosis is 20 at the bare 30% To Hit, for 6.0. Reading the training-time flag instead granted Radio\'s +10% To Hit for 40% and 8.0; the sibling radioToHitWarlord without Apotheosis shows the +10% is otherwise live.',
    version: V_WARLORD,
    a: { atk:10, hp:10, abilities: { outlanderWizard: true, radio: true, apotheosis: true } },
    b: { def:0, toBlkMod:70, hp:60 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'a.ability.radio':
        'Keep, and the absence is the rule under test: the NOTSAPIENS gate reads the permanent record, which Apotheosis writes, so the unit is Fantastic to the gate and takes no Radio. a.abilities.outlanderWizard is inert for the same reason and by the same claim. Apotheosis is the live half at delta 2, and radioToHitWarlord shows the +10% To Hit is otherwise live.',
    },
  },
  radioToHitWarlord: {
    desc: 'Radio gives a regular unit +10% To Hit (UnitCalcPre.CAS:1096-1101, which also writes +10% To Defend and +1 Resistance): melee 10 at the bare 30% plus 10% is 4.0 against 3.0 without the reform.',
    version: V_WARLORD,
    a: { atk:10, hp:10, abilities: { outlanderWizard: true, radio: true } },
    b: { def:0, toBlkMod:70, hp:60 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  ballisticsTrainingRangedWarlord: {
    desc: 'Ballistics Training gives Ranged +10% To Hit (UnitCalcPre.CAS:1082-1088, where 1.5.12.8 cut `SToRanged` from +20 to +10): missile 1 at the bare 30% plus 10% is 0.4 against 0.3 without the reform.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hp:10,
      abilities: { outlanderWizard: true, ballisticsTraining: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },
  ballisticsTrainingThrownWarlord: {
    desc: 'The same block leaves `SToThrown` at +20 (UnitCalcPre.CAS:1082-1088), so the three channels no longer share one amount: Thrown 1 at the bare 30% plus 20% is 0.5, against the 0.4 its sibling ballisticsTrainingRangedWarlord gets on Ranged.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hp:10,
      abilities: { outlanderWizard: true, ballisticsTraining: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.500 },
  },
  militaryDrillingSkipsApotheosisPermanentFantasticWarlord: {
    desc: 'Military Drilling\'s permanent Discipline is written under `IF (BASEFANTASTIC(U)>0) THEN { GOTO "NOOUTLANDERUPGRADE"; }` (OverlandEndTurn.CAS:446), the permanent record Apotheosis writes. Negative claim, and the absence is the rule under test: Armor 1 + Apotheosis 4 = 5, and atk 10 at 100% hit against a 100% block chance deals 10 - 5 = 5.0. Reading the training-time flag instead granted Discipline for Armor 6 and 4.0; the sibling militaryDrillingDefenseWarlord without Apotheosis shows the Discipline armor is otherwise live.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:60,
      abilities: { outlanderWizard: true, militaryDrilling: true, apotheosis: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.ability.militaryDrilling':
        'Keep, and the absence is the rule under test: Military Drilling\'s permanent Discipline is written under a BASEFANTASTIC gate on the permanent record, which Apotheosis writes, so the grant is closed. b.abilities.outlanderWizard is inert for the same reason and by the same claim. Apotheosis is the live half at delta 3, and militaryDrillingDefenseWarlord shows the Discipline armor is otherwise live.',
    },
  },
  militaryDrillingDefenseWarlord: {
    desc: 'Military Drilling grants a non-fantastic unit permanent Discipline, whose Normal-level armor bonus is +1: Armor 1+1 = 2, and atk 10 at 100% hit against a 100% block chance deals 8.0 against the 9.0 the same unit takes without the reform.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:60,
      abilities: { outlanderWizard: true, militaryDrilling: true } },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  xenoveterinaryReadsFantasticAtItsOwnBlockWarlord: {
    desc: 'Xenoveterinary is the one live-Fantastic gate in the Outlander block: `IF FANTASTIC(U)` (UnitCalcPre.CAS:1040) reads the calculated record at its own position, where the four gates around it read `BASEFANTASTIC(U)`. Spirit Link asserts the calculated flag at the head of region b (`SETSTAT(U,AFantastic,0,1)`, :30) and clears it only at the tail of UnitCalc.CAS, so a spirit-linked regular unit is Fantastic here and takes the +10% To Hit: melee 10 at 30% + 10% is 4.0. Reading the training-time flag instead withheld it for 3.0; dropping Spirit Link leaves 3.0 as well, so both named features are live.',
    version: V_WARLORD,
    a: { atk:10, hp:10,
      abilities: { outlanderWizard: true, xenoveterinary: true, spiritLink: true } },
    b: { def:0, toBlkMod:70, hp:60 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  temporalEngineeringHasteWarlord: {
    desc: 'Heat Power Engine + Temporal Engineering gives a mechanical unit Haste: melee 3 strikes twice for 6.0.',
    version: V_WARLORD,
    a: { atk:3, hitChance:70, hp:10, abilities: { outlanderWizard: true, mechanical: true, heatPowerEngine: true, temporalEngineering: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  temporalGravityDriveWarlord: {
    desc: 'A Sailing mechanical unit with Heat Power Engine + Temporal Engineering derives Temporal-Gravity Drive and Illusion Immunity.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { illusion: true } },
    b: { def:10, toBlkMod:70, hp:20, abilities: { outlanderWizard: true, mechanical: true, sailing: true, heatPowerEngine: true, temporalEngineering: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A tokenisation artefact for the five defender abilities, all live at delta 10. a.abilities.illusion is inert on purpose and is half the fixture\'s claim: the derived Temporal-Gravity Drive carries Illusion Immunity, so the attacker\'s Illusion does not bypass the 10 Defense and nothing gets through.',
    },
  },
  uphillBattleToHitWarlord: {
    desc: 'Uphill Battle on an AI attacker: 90% base To-Hit + 10% = 100%; melee 10 vs no armor deals 10.0 (without the option: 9.0).',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:60, def:1, toBlkMod:70, hp:20, abilities: { uphillBattle: true } },
    b: { figs:1, atk:0, def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  uphillBattleResistanceWarlord: {
    desc: 'Uphill Battle on an AI defender: Resistance 12 + 1 makes Death Touch −3 ineffective (without the option: 10% kill chance, 1.0 expected damage).',
    version: V_WARLORD,
    a: { figs:1, atk:1, hitChance:70, def:1, toBlkMod:70, hp:20, abilities: { deathTouch: -3 } },
    b: { figs:1, atk:0, def:1, toBlkMod:70, res:12, hp:10, abilities: { uphillBattle: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  godsPlayDicesResistanceWarlord: {
    desc: 'Gods Play Dices fixed −2 result: Resistance 13 becomes 11; Death Touch −3 then has a 20% kill chance against a 10 HP figure, for 2.0 expected damage.',
    version: V_WARLORD,
    a: { figs:1, atk:1, hitChance:70, def:1, toBlkMod:70, hp:20, abilities: { deathTouch: -3 } },
    b: { figs:1, atk:0, def:1, toBlkMod:70, res:13, hp:10, abilities: { godsPlayDices: -2 } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },

  // --- Stat derivation order (R1 stage 10) ---
  // Each of these pins a step's position rather than its magnitude, so each is written so that
  // the *previous* ordering gives a different number — the value in parentheses.
  warpBeforeColossalStrengthWarlord: {
    desc: 'Warp Attack runs mid-region c (+0x0BA3C) and Colossal Strength in UnitCalc.CAS, so the halving comes first and Colossal scales the halved value: 10 → 5 → 5+1+floor(0.4×5) = 8 → 8 − 2 def = 6 (scaling first and halving after gives 5).',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:20, abilities: { warpAttack: true, colossalStrength: true } },
    b: { figs:1, atk:0, def:2, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  holyBonusAfterWarpCoM2: {
    desc: 'Holy Bonus is a region-e stack aura, so it lands after Warp Attack and is not halved: 10 → 5 → +4 = 9 → 9 − 2 def = 7 (applied before Warp it would give 5).',
    version: V_COM2,
    a: { figs:1, atk:10, hitChance:70, hp:20, abilities: { holyBonus: 4, warpAttack: true } },
    b: { figs:1, atk:0, def:2, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  holyBonusSkipsThrownCoM2: {
    desc: 'The Holy Bonus aura writes Caster.exe\'s narrow ranged field, so a Thrown attack takes none of it. Melee 1 + 4 = 5 is fully blocked by 5 defense; thrown stays 6 for 6 − 5 = 1 (writing the shared ranged slot would make it 10, for 5).',
    version: V_COM2,
    a: { figs:1, atk:1, modernAttacks: { thrown: { strength:6, type:'thrown' } }, hitChance:70, hp:20,
      abilities: { holyBonus: 4 } },
    b: { figs:1, atk:0, def:5, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction on both halves: the aura\'s melee +4 lands but is swallowed by the 5 Defense that already blocks the melee 1, and its thrown half does not exist, so the number cannot move.',
      'a.ability.holyBonus':
        'Keep, and the absence is the rule under test: the aura writes Caster.exe\'s narrow ranged field, which a Thrown attack is not. Writing the shared ranged slot instead would take the thrown to 10 and the total to 5.',
    },
  },
  holyBonusReachesThrownCoM1: {
    desc: 'CoM 1 writes Holy Bonus to the one shared `.ranged` slot of the DOS engines, so the same Thrown attack the CoM2 aura skips does take it. Melee 1 + 4 = 5 is fully blocked by 5 defense; thrown 6 + 4 = 10 for 10 − 5 = 5 (writing the narrow CoM2 ranged field would leave the thrown at 6, for 1).',
    version: V_COM,
    a: { figs:1, atk:1, rtbType:'thrown', rtb:6, toHitMod:70, toHitRtbMod:70, hp:20,
      abilities: { holyBonus: 4 } },
    b: { figs:1, atk:0, def:5, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  holyBonusReachesMissileCoM2: {
    desc: 'Control for the Thrown case: a conventional ranged attack does take the Holy Bonus aura. Missile 6 + 4 = 10 − 2 def = 8.',
    version: V_COM2,
    a: { figs:1, atk:0, modernAttacks: { ranged: { strength:6, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20, abilities: { holyBonus: 4 } },
    b: { figs:1, atk:0, def:2, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  supremeLightReadsWarpedResistanceCoM2: {
    desc: 'Supreme Light is the last write of region e and reads Resistance live, so Warp Resist having zeroed it leaves defense += floor(0/3) = 0: missile 8 − 3 def = 5 (reading the unwarped Resistance 12 would give 1).',
    version: V_COM2,
    a: { figs:1, atk:0, modernAttacks: { ranged: { strength:8, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20 },
    b: { figs:1, atk:0, def:3, res:12, toBlkMod:70, hp:20, unitType:'fantastic_life',
      abilities: { supremeLight: true, warpResist: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.ability.supremeLight':
        'Keep, and the absence is the rule under test: Supreme Light is the last write of region e and reads Resistance live, so with Warp Resist having zeroed it the bonus is defense += floor(0/3) = 0 and adds nothing. b.unitType=fantastic_life is inert for the same reason - it is the eligibility term for a bonus that computes to zero. Warp Resist is the live half at delta 4; reading the unwarped Resistance 12 instead would give 1.',
    },
  },
  supremeLightUnwarpedResistanceCoM2: {
    desc: 'Control for the Warp Resist case: with Resistance intact at 12, Supreme Light adds floor(12/3) = 4 defense. Missile 8 − 7 def = 1.',
    version: V_COM2,
    a: { figs:1, atk:0, modernAttacks: { ranged: { strength:8, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20 },
    b: { figs:1, atk:0, def:3, res:12, toBlkMod:70, hp:20, unitType:'fantastic_life',
      abilities: { supremeLight: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  holyBonusSkipsFocusCreatedRangedCoM2: {
    desc: 'The Holy Bonus aura tests the permanent record, `if B.ranged > 0` (Units.RecalculateUnits.pas:2535), so the conventional Ranged attack Focus Magic creates during the recompute takes none of it: magic ranged 3 − 2 defense = 1 (gating on the calculated slot instead adds the aura\'s 4, for 5). Focus Magic is the live half — without it the unit has no ranged attack at all.',
    version: V_COM2,
    a: { figs:1, atk:0, hitRanged:70, hitThrown:70, hitBreath:70, hp:20,
      abilities: { focusMagic: true, holyBonus: 4 } },
    b: { figs:1, atk:0, def:2, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'a.ability.holyBonus':
        'Keep, and the absence is the rule under test: the aura tests the permanent record, `if B.ranged > 0` (Units.RecalculateUnits.pas:2535), so the conventional Ranged attack Focus Magic creates during the recompute takes none of it. Gating on the calculated slot instead adds the aura\'s 4, for 5. Focus Magic is the live half at delta 1 - without it the unit has no ranged attack at all.',
    },
  },
  supremeLightSkipsZeroedRangedCoM2: {
    desc: 'Supreme Light\'s ranged half is a live strength test, `if U.ranged > 0` (:2632), not a type test, so a magic ranged 5 that Mind Storm\'s −5 and the region-e clamp have left at zero takes no +2 and the attack stays gone: 0 damage (the six-name type test it replaced added 2 to the emptied field, for 2). The absence is the rule under test. Mind Storm is the live half — without it the same unit deals 5 + 2 = 7, which is `supremeLightCasterRangedCoM2`\'s claim at another size.',
    version: V_COM2,
    a: { figs:1, atk:0, modernAttacks: { ranged: { strength:5, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20,
      abilities: { supremeLight: true, mindStorm: true } },
    b: { figs:1, atk:0, def:0, toBlkMod:70, hp:20 },
    // The tick is the measuring instrument: the emptied Ranged field carries no conventional
    // ranged attack, so the page withdraws ranged mode and the exchange is melee for 0. Let the
    // +2 land on the emptied field and the withdrawal stops — the control is kept, the volley
    // fires and the number is 2, which is the regression this fixture exists to catch.
    rangedCheck: true, rangedDist: 1, rangedModeWithdrawn: true,
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.supremeLight':
        'Keep, and the absence is the rule under test: the ranged half is a live strength test, `if U.ranged > 0` (:2632), not a type test, so a magic ranged that Mind Storm and the region-e clamp have left at zero takes no +2 and the attack stays gone. The six-name type test it replaced added 2 to the emptied field, for 2. Mind Storm is the live half at delta 7.',
    },
  },
  guidingBeaconSkipsBlazedRangedWarlord: {
    desc: 'Guiding Beacon reads `U.ranged` where the aura runs (:2543), after region d, so Blaze of Glory having emptied the Ranged field leaves it nothing to add to: Focus Magic takes the Thrown 4 into conventional Ranged, Blaze of Glory moves it back onto the Thrown field, and the surviving Thrown 4 against the 2 defense its Armor Piercing halves to 1 gives 3 (reading the pre-sequence type instead applies the aura\'s +3, for 6).',
    version: V_WARLORD,
    a: { figs:1, atk:0, modernAttacks: { thrown: { strength:4, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20,
      abilities: { focusMagic: true, blazeOfGlory: true, guidingBeaconAura: 3 } },
    b: { figs:1, atk:0, def:2, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep, and the absence is the rule under test. A tokenisation artefact as well - containsRun looks for \'guiding beacon aura\' and the key says \'guiding beacon skips blazed ranged\'. The aura reads U.ranged where it runs (:2543), after region d, so Blaze of Glory having emptied the Ranged field leaves it nothing to add to. a.abilities.focusMagic is inert for the composed reason the desc gives: it moves the Thrown 4 into conventional Ranged and Blaze of Glory moves it back, so the pair is a round trip. Blaze of Glory is the live half at delta 3; reading the pre-sequence type applies the aura\'s +3, for 6.',
    },
  },
  supremeLightSkipsBlazedRangedWarlord: {
    desc: 'The same emptied Ranged field for Supreme Light: its +2 is gated on the live `U.ranged > 0` at the end of region e, so after Blaze of Glory has moved the Focus-converted attack onto the Thrown field the bonus is not made — Thrown 4 against the 2 defense Blaze of Glory\'s Armor Piercing halves to 1 gives 3 (a precomputed type test still sees the conventional Ranged identity and adds 2, for 5).',
    version: V_WARLORD,
    a: { figs:1, atk:0, modernAttacks: { thrown: { strength:4, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20,
      abilities: { focusMagic: true, blazeOfGlory: true, supremeLight: true } },
    b: { figs:1, atk:0, def:2, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.supremeLight':
        'Keep, and the absence is the rule under test: the +2 is gated on the live `U.ranged > 0` at the end of region e, and Blaze of Glory has moved the Focus-converted attack onto the Thrown field, so the bonus is not made. A precomputed type test still sees the conventional Ranged identity and adds 2, for 5. a.abilities.focusMagic is inert as the same round trip guidingBeaconSkipsBlazedRangedWarlord describes; Blaze of Glory is the live half at delta 3. version-dead is literally true and uninformative: this is the only Warlord preset that configures supremeLight at all, so Warlord\'s positive Supreme Light behaviour is unasserted.',
    },
  },
  levelBonusAfterUpgradedExplosiveWarlord: {
    desc: 'The level ladder is @Units@ApplyLevelBonus in region c, so Upgraded Explosive\'s end-of-region-b doubling cannot see it: fire breath 4 + 4 workshop = 8, doubled to 16, then +2 champion = 18. Base melee 0 keeps Explosive\'s independent Thrown grant (UnitCalcPre.CAS:1066-1080, gated on base melee > 0 or Flying) shut, so only the breath is in play; the 0 + 4 champion melee is fully blocked by 5 defense, leaving 18 − 5 = 13 (doubling the levelled value would make the breath 20, for 15). At level normal the same unit deals 11. The defender is Poison Immune so the Military Workshop poison rider does not add to the total.',
    version: V_WARLORD,
    a: { figs:1, atk:0, modernAttacks: { fireBreath: { strength:4, type:'fire' } }, level:'champion', hitChance:70, hp:20,
      abilities: { outlanderWizard: true, explosive: true, militaryWorkshop: true } },
    b: { figs:1, atk:0, def:5, toBlkMod:70, hp:30, abilities: { poisonImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 13.000 },
  },
  holyArmorThresholdBeforeNodeAuraCoM2: {
    desc: 'Holy Armor is +0x07407, ahead of the node aura, so its "armor above 5" test sees 4 and takes the +2 defense branch: 4 + 2 + 2 node = 8 → 12 atk − 8 = 4 (testing after the node aura would take the To Block branch and leave defense at 6).',
    version: V_COM2,
    a: { figs:1, atk:12, hitChance:70, hp:20 },
    b: { figs:1, atk:0, def:4, toBlkMod:70, hp:20, unitType:'fantastic_chaos',
      abilities: { holyArmor: true } },
    nodeAura: 'chaos',
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  eternalNightAfterSupremeLightCoM1: {
    desc: 'CoM 1 Eternal Night applies after Supreme Light: its Darkness side first makes Life res 10 → 9, Supreme Light reads 9 for +3 defense, then Eternal Night applies its separate −1 resistance. Missile 8 vs final defense 5 deals 3; merging the penalty into Darkness would make Supreme Light read 8 and deal 4.',
    version: V_COM,
    a: { figs:1, atk:0, rtbType:'missile', rtb:8, toHitRtbMod:70, hp:20,
      abilities: { eternalNight: true } },
    b: { figs:1, atk:0, def:3, res:10, toBlkMod:70, hp:20, unitType:'fantastic_life',
      abilities: { supremeLight: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
});
