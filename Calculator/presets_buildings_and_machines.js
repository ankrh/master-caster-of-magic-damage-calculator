// Numeric presets. Hillfort through Rage, the race-gated city buildings and their recruitment
// grants, and the mechanical-unit abilities (Artificer, Mechanical Expert, Rebuild).
definePresets({
  // --- Hillfort ---
  hillfortMissileWarlord: {
    desc: 'Hillfort Missile Immunity (Warlord): missile 3 (100% hit) vs def 2 raised to 50 → 0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:3, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp: 10 },
    b: { def: 2, toBlkMod: 70, hp: 10, abilities: { hillfort: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  hillfortMeleeUnaffectedWarlord: {
    desc: 'Hillfort does NOT protect vs melee: atk 3 (100% hit) vs def 2 (100% block) → 1',
    version: V_WARLORD,
    a: { atk: 3, hitChance:70, hp: 10 },
    b: { atk: 0, def: 2, toBlkMod: 70, hp: 10, abilities: { hillfort: true } },
    expected: { dmgToA: 0, dmgToB: 1 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Hillfort does not reach a melee attack, so the only feature the fixture adds cannot move the number.',
      'b.ability.hillfort':
        'Keep, and the absence is the rule under test. Hillfort is Missile Immunity under another name (`calcKey: \'missileImmunity\'`, enchantments.js:138, resolved at ui_abilities.js:21), and the immunity write at combat_effects.js:470 is gated on `ctx.isMissile`, which only the ranged arm of computeCasterDefenseForAttack sets (combat_effects.js:681). The melee arm builds no such field at all (combat_effects.js:650-657), so def 2 stands and 3 - 2 = 1. hillfortMissileWarlord is the positive arm at 0 against this 1; it is not a one-value sibling, since it also swaps the melee attack for a missile one and sets rangedCheck and rangedDist.',
    },
  },

  // --- Planewalking ---
  planewalkingTacticianFirstStrikeWarlord: {
    desc: 'Planewalking grants Teleporting: Tactician + Planewalking unit gains First Strike — kills B before B can counter',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { tactician: true, planewalking: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },

  // --- Temporal Twist ---
  temporalTwistStripsFirstStrikeWarlord: {
    desc: 'Temporal Twist strips First Strike: A loses FS, so B retaliates simultaneously (dmgToA=5)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { firstStrike: true, temporalTwist: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 5.000, dmgToB: 10.000 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep. Inert as a consequence of the assertion: applyTemporalTwistEffects deletes `firstStrike` outright (combat_effects.js:191), so with the Twist on there is no flag left for the melee gate to read (combat.js:85-87) and removing it from the fixture as well changes nothing. a.ability.temporalTwist is the live half - ablating it lets the First Strike stand, A kills B before the counter, and dmgToA goes from 5.000 to 0.',
    },
  },
  temporalTwistStripsNegateFirstStrikeWarlord: {
    desc: "Temporal Twist strips Negate First Strike: B loses NFS, so A's First Strike kills B before counter (dmgToA=0)",
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, hitChance:70, hp:10, abilities: { negateFirstStrike: true, temporalTwist: true } },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'b.ability.negateFirstStrike':
        'Keep, and the absence is the rule under test: applyTemporalTwistEffects deletes `negateFirstStrike` (combat_effects.js:192) before the melee gate reads it (combat.js:85-87), so B enters the exchange without the flag and removing it from the fixture changes nothing. a.ability.firstStrike and b.ability.temporalTwist are both live here. version-dead is literally true and uninformative. No Warlord fixture *configures* the ability directly - the only other preset that does is `negateFirstStrike` in presets_ranged_and_haste.js:1078, which sits in the artificial MoM 1.31 group (test_tree.js:5-8, 36). Its effect is asserted in Warlord all the same, through the grants that write the flag: tacticianNonCorporealNegateFirstStrikeWarlord, tacticianWraithFormNegateFirstStrikeWarlord, tacticianRulerNegateFirstStrikeWarlord and favoredTerrainTacticianNegateFirstStrikeWarlord (presets_immunities_and_abilities.js:1271-1334), plus temporalTwistTacticianRestoresNonCorporealNegateWarlord and zealGrantsNegateFirstStrikeWarlord in this file.',
    },
  },
  temporalTwistStripsTeleportingWarlord: {
    desc: 'Temporal Twist strips Teleporting: Tactician no longer grants First Strike, so B retaliates. 5 hits vs 1 shield (Tactician +1 def) at 100% block → 4 dmg',
    version: V_WARLORD,
    a: { atk:10, def:0, hitChance:70, toBlkMod:70, hp:10, abilities: { tactician: true, teleporting: true, temporalTwist: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 4.000, dmgToB: 10.000 },
    vacuity: {
      'a.ability.teleporting':
        'Keep, and the absence is the rule under test: applyTemporalTwistEffects deletes `teleporting` (combat_effects.js:193), and normalizeCombatUnit runs the strip before the Tactician block (combat_phases.js:194-195), so Tactician\'s teleporting arm at combat_effects.js:134 finds nothing and grants no First Strike. A carrying the flag or not carrying it therefore reach the same exchange. a.ability.temporalTwist is live here. planewalkingTacticianFirstStrikeWarlord runs the same Tactician grant with Teleporting intact and pins dmgToA 0 against this 4.000; it is not a one-value sibling - it reaches Teleporting through Planewalking and sets no def or toBlkMod.',
    },
  },
  temporalTwistTacticianRestoresNonCorporealNegateWarlord: {
    desc: 'Temporal Twist clears Negate First Strike before the later Tactician step restores it from Non-Corporeal, so B survives A\'s First Strike and retaliates for 5. B\'s own Tactician also gives it +1 Defense (Units.RecalculateUnits.pas:2409-2435 grants non-heroes exactly +1), rolled here at 100% block, so A\'s 10 hits deal 9. B\'s 9 HP is load-bearing: at 10 the control that drops Non-Corporeal leaves B alive and countering too, and side A would not move.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, hitChance:70, hp:9, toBlkMod:70, abilities: { tactician: true, nonCorporeal: true, temporalTwist: true } },
    expected: { dmgToA: 5.000, dmgToB: 9.000 },
    vacuity: {
      'b.ability.temporalTwist':
        'Keep, and the absence is the rule under test: the strip is inert precisely because the later block restores what it took, and that is the ordering claim. normalizeCombatUnit runs applyTemporalTwistEffects and then applyTacticianWarlordEffects (combat_phases.js:194-195), so the delete at combat_effects.js:192 is followed by the non-corporeal arm rewriting `negateFirstStrike` at combat_effects.js:135 and B ends the derivation with the flag either way. Swap the two and B loses it: A\'s First Strike takes B\'s 9 HP before the counter and dmgToA becomes 0 rather than 5.000. The fixture\'s other three candidates - b.tactician, b.nonCorporeal and a.firstStrike - are all live.',
    },
  },
  temporalTwistTacticianRestoresFavoredTerrainStrikesWarlord: {
    desc: 'Temporal Twist clears strike flags before the later Tactician Favored Terrain branch restores both; A kills B by First Strike and takes no counter damage.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { tactician: true, favoredTerrain: true, temporalTwist: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.temporalTwist':
        'Keep, and the absence is the rule under test: the strip is inert precisely because the later block restores what it took, and that is the ordering claim. normalizeCombatUnit runs applyTemporalTwistEffects and then applyTacticianWarlordEffects (combat_phases.js:194-195), so the deletes at combat_effects.js:191-192 are followed by the favored-terrain arm rewriting both strike flags at combat_effects.js:137-140 and A keeps First Strike either way. Swap the two and A loses it, B survives to counter, and dmgToA becomes 5 rather than 0. a.ability.tactician and a.ability.favoredTerrain are both live here.',
    },
  },

  // --- Zeal ---
  zealGrantsFirstStrikeWarlord: {
    desc: 'Zeal grants First Strike: A kills B (10hp) before B can counter — dmgToA=0',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { zeal: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  zealGrantsNegateFirstStrikeWarlord: {
    desc: "Zeal grants Negate First Strike: B's Zeal cancels A's First Strike → simultaneous trade (dmgToA=5)",
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, hitChance:70, hp:10, abilities: { zeal: true } },
    expected: { dmgToA: 5.000, dmgToB: 10.000 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep. Inert as a consequence of the assertion: B\'s Zeal grants Negate First Strike (combat_effects.js:178), the melee gate is `aFirstStrike && !bNegateFirstStrike` (combat.js:85-87), and a negated First Strike yields the same simultaneous exchange as no First Strike at all - so removing it changes nothing. The same shape is already declared on `negateFirstStrike` in presets_ranged_and_haste.js:1083-1085. b.ability.zeal is the live half: ablating it lets A\'s First Strike stand and dmgToA goes to 0. That delta is attributable to the Negate alone - the gate reads no `firstStrike` on the defender, so Zeal\'s other grant cannot be what moves the number here, and zealGrantsFirstStrikeWarlord pins that other grant separately.',
    },
  },
  zealStrippedByTemporalTwistWarlord: {
    desc: 'Temporal Twist strips Zeal-granted First Strike: A loses FS, B retaliates simultaneously (dmgToA=5)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { zeal: true, temporalTwist: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 5.000, dmgToB: 10.000 },
    vacuity: {
      'a.ability.zeal':
        'Keep, and the absence is the rule under test: the grant happens and is then taken away, which is an ordering claim. normalizeCombatUnit runs applyZealEffects before applyTemporalTwistEffects (combat_phases.js:193-194), and the strip deletes exactly the two flags Zeal writes (combat_effects.js:178 against 191-192), so A ends with neither and dropping Zeal from the fixture changes nothing. a.ability.temporalTwist is the live half, and zealGrantsFirstStrikeWarlord differs only in a.abilities.temporalTwist and pins dmgToA 0 against this 5.000.',
    },
  },

  // --- Rage ---
  rageMeleePreCombatLossWarlord: {
    desc: 'Rage (Warlord) melee, pre-combat losses: 6-fig unit at 3 dmg (hp 1) → 3 figs alive, 3 lost → +3 melee. atk 1+3=4, 3 figs × 4 at 100% hit vs def 0 → 12 dmg',
    version: V_WARLORD,
    a: { figs:6, atk:1, hitChance:70, hp:1, dmg:3, abilities: { rage: true } },
    b: { atk:0, def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 12.000 },
  },
  rageRangedPreCombatLossWarlord: {
    desc: 'Rage (Warlord) ranged, pre-combat losses: 6-fig unit at 3 dmg (hp 1) → 3 figs alive, 3 lost → +3 ranged. rtb 1+3=4, 3 figs × 4 at 100% hit vs def 0 → 12 dmg',
    version: V_WARLORD,
    a: { figs:6, modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:1, dmg:3, abilities: { rage: true } },
    b: { atk:0, def:0, hp:30 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 12.000 },
  },
  rageDynamicCounterFirstStrikeWarlord: {
    desc: 'Rage (Warlord) dynamic in-combat loss: A first-strikes for 3 (atk 3, 100% hit, def 0), killing 3 of B’s 6 figs (hp 1). B counters with 3 figs at atk 1 +3 Rage =4 → 12 dmg to A. Counter Rage reflects figures lost this combat.',
    version: V_WARLORD,
    a: { atk:3, hitChance:70, def:0, hp:20, abilities: { firstStrike: true } },
    b: { figs:6, atk:1, hitChance:70, def:0, hp:1, abilities: { rage: true } },
    expected: { dmgToA: 12.000, dmgToB: 3.000 },
  },

  // --- Altar of the Moon ---
  altarOfTheMoonRangedWarlord: {
    desc: 'Altar of the Moon (Warlord): ranged unit gains +2 Ranged Attack. rtb 1+2=3, 100% hit vs def 0 → 3 dmg (single full-health fig → Rage adds 0)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, race:'Gnoll', abilities: { altarOfTheMoon: true } },
    b: { atk:0, def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  altarOfTheMoonRageWarlord: {
    desc: 'Altar of the Moon (Warlord): grants Rage. 6-fig unit at 3 dmg (hp 1) → 3 figs alive, 3 lost → +3 melee. atk 1+3=4, 3 figs × 4 at 100% hit vs def 0 → 12 dmg',
    version: V_WARLORD,
    a: { figs:6, atk:1, hitChance:70, hp:1, dmg:3, race:'Gnoll', abilities: { altarOfTheMoon: true } },
    b: { atk:0, def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 12.000 },
  },
  altarOfTheMoonPoisonImmunityWarlord: {
    desc: 'Altar of the Moon (Warlord): grants Poison Immunity. Defender immune → poison 4 negated; melee atk 1 vs def 1 at 100% block → 0 dmg (without Altar, poison would deal ~2.4)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 4 } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:10, race:'Gnoll', abilities: { altarOfTheMoon: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.poison':
        'Keep. Inert as a consequence of the assertion: `training:altarOfTheMoon` writes poisonImmunity (stats_sequence.js:135-141, from `SETSTAT(U,APoisonImmunity,1,1)` at CreateUnit.CAS!NOALTAROFTHESUN!+8 "SETSTAT(U,APoisonImmunity,1,1);"), and poisonFailProb returns 0 outright for an immune defender rather than modifying the roll (combat_special_attacks.js:13-19), so the poison strength has no roll left to size. b.ability.altarOfTheMoon is the live half - ablating it removes the immunity and the poison lands.',
    },
  },
  altarOfTheMoonResistanceWarlord: {
    desc: 'Altar of the Moon (Warlord): +1 Resistance. Defender res 4 +1 = 5; incoming Life Steal −3 → effective res 2 → E = sum(1..8)/10 = 3.6 (without the +1, res 4 → eff 1 → 4.5)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { atk:0, def:1, toBlkMod:70, res:4, hp:30, race:'Gnoll', abilities: { altarOfTheMoon: true } },
    expected: { dmgToA: 0, dmgToB: 3.600 },
  },
  altarOfTheMoonNonGnollWarlord: {
    desc: 'Altar of the Moon (Warlord): a non-Gnoll unit gets no bonus. Ranged rtb 1 (100% hit) vs def 0 → 1 dmg (a Gnoll would gain +2 Ranged → 3)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { altarOfTheMoon: true } },
    b: { atk:0, def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Altar\'s writes do not reach a non-Gnoll unit, so the only feature the fixture adds cannot move the number.',
      'a.ability.altarOfTheMoon':
        'Keep, and the absence is the rule under test: eligibility carries `baseUnitRace === \'Gnoll\'` (stats.js:164-165). That race term is the calculator\'s own, and stats.js:159-163 is where it is stated - the Altar is the Gnoll city\'s race-exclusive building, so only Gnolls are trained under it. The script gates on the city instead and has no race test of its own: CreateUnit.CAS!NOALTAROFTHESUN!+3 "IF (ISBUILT(C,BAltarOfTheMoon)=0) THEN { GOTO" reads `ISBUILT(C,BAltarOfTheMoon)`, which presupposes a Gnoll city, and the writes at CreateUnit.CAS!NOALTAROFTHESUN!+5..+10 "SETSTAT(U,SMultiLabel,1,8);" "SETSTAT(U,SRanged,1,(GetStat(U,SRanged,1)+2));" are then unconditional apart from the `SRanged>0` test on the +2. The calculator has no city, so it asks the unit. With the race term false the whole `training:altarOfTheMoon` step is skipped and its +2 to every permanent ranged slot (stats_sequence.js:135-144) never lands. altarOfTheMoonRangedWarlord differs only in a.race and pins 3.000 against this 1.000.',
    },
  },
  altarOfTheMoonHunterPoisonWarlord: {
    desc: 'Altar of the Moon (Warlord): G. Hunters gain Poison 2. Melee atk 1 vs def 1 at 100% block → 0; Poison 2 (1 fig) vs res 5 (CoM2 −1 → eff 4, pFail 0.6) → E = 2 × 0.6 = 1.2 (without the Hunters tag, Altar grants no Poison → 0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, race:'Gnoll', name:'Gnoll Hunters', abilities: { altarOfTheMoon: true } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.200 },
  },
  altarOfTheMoonWitchdoctorLifeStealWarlord: {
    desc: 'Altar of the Moon (Warlord): G. Witchdoctors gain Life Steal −1 replacing Poison. Base Poison 2 is removed; melee atk 1 vs def 1 at 100% block → 0; Life Steal −1 vs res 5 (eff 4) → E = sum(1..6)/10 = 2.1 (without the interaction, base Poison 2 would deal 1.2 instead)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, race:'Gnoll', name:'Witchdoctors', abilities: { altarOfTheMoon: true, poison: 2 } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:20 },
    expected: { dmgToA: 0, dmgToB: 2.100 },
  },

  // --- Altar of the Sun ---
  altarOfTheSunFigureWarlord: {
    desc: 'Altar of the Sun (Warlord): a Hawkman gains +1 Figure. 2-fig attacker → 3 figs; atk 2 × 3 figs at 100% hit vs def 0 → 6 dmg (without the Altar, 2 figs → 4)',
    version: V_WARLORD,
    a: { figs:2, atk:2, hitChance:70, hp:5, race:'Hawkmen', abilities: { altarOfTheSun: true } },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  altarOfTheSunNonHawkmanWarlord: {
    desc: 'Altar of the Sun (Warlord): no Hawkman tag → no figure bonus. 2-fig attacker stays at 2 figs; atk 2 × 2 figs at 100% hit vs def 0 → 4 dmg (a Hawkman would get 6)',
    version: V_WARLORD,
    a: { figs:2, atk:2, hitChance:70, hp:5, abilities: { altarOfTheSun: true } },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Altar\'s figure bonus does not reach a non-Hawkmen unit, so the only feature the fixture adds cannot move the number.',
      'a.ability.altarOfTheSun':
        'Keep, and the absence is the rule under test: eligibility carries `baseUnitRace === \'Hawkmen\'` (stats.js:178-179). That race term is the calculator\'s own, and stats.js:173-177 is where it is stated - the Altar is the Hawkmen city\'s race-exclusive building, so only Hawkmen are trained under it. The script gates on the city instead and has no race test of its own: CreateUnit.CAS!NOAGOGE!+3 "IF (ISBUILT(C,BAltarOfTheSun)=0) THEN { GOTO" reads `ISBUILT(C,BAltarOfTheSun)`, which presupposes a Hawkmen city, and the branches at CreateUnit.CAS!NOAGOGE!+6..+12 "IF (GetStat(U,STypeID,1)=323) THEN {" "}" then key on unit type alone - `STypeID=323` for the Holy Mother\'s +1 attack, `STypeID<>44` for the +1 figure. The calculator has no city, so it asks the unit. With the race term false the `altarOfTheSun:figures` step never fires (stats.js:2493-2495) and the attacker stays at 2 figures. altarOfTheSunFigureWarlord differs only in a.race and pins 6.000 against this 4.000.',
    },
  },
  altarOfTheSunHolyMotherMeleeWarlord: {
    desc: 'Altar of the Sun (Warlord): Holy Mother gains +1 Melee instead of a figure. 1-fig attacker stays at 1 fig; atk 2+1 × 1 fig at 100% hit vs def 0 → 3 dmg (without the Altar, atk 2 → 2)',
    version: V_WARLORD,
    a: { figs:1, atk:2, hitChance:70, hp:5, race:'Hawkmen', name:'Holy Mother', abilities: { altarOfTheSun: true } },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  altarOfTheSunHeroExcludedWarlord: {
    desc: 'Altar of the Sun (Warlord): a Hawkman hero is excluded → no figure bonus. 1-fig attacker stays at 1 fig; atk 2 × 1 fig at 100% hit vs def 0 → 2 dmg (a non-hero Hawkman would gain +1 Figure → 4)',
    version: V_WARLORD,
    a: { figs:1, atk:2, hitChance:70, hp:5, unitType:'hero', race:'Hawkmen', abilities: { altarOfTheSun: true } },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.ability.altarOfTheSun':
        'Keep, and the absence is the rule under test: the hero term of the same eligibility expression (`&& !isHero`, stats.js:178-179) closes the building to a Hawkmen hero, so the `altarOfTheSun:figures` step never fires (stats.js:2493-2495) and the flag moves nothing. a.unitType=hero is the live half - dropping the hero marker lets the +1 figure land and doubles the melee total from 2.000 to 4. No one-value sibling exists: altarOfTheSunFigureWarlord also differs in a.figs, and altarOfTheSunHolyMotherMeleeWarlord in a.name.',
    },
  },

  // --- Alumni of Academy ---
  alumniOfAcademyMagicRangedWarlord: {
    desc: 'Academy (Warlord): a 6-figure Halfling magical-ranged unit gains a flat +2 figures. 1 ranged × 8 figs at 100% hit vs def 0 → 8 dmg (without Academy, 6)',
    version: V_WARLORD,
    a: { figs:6, modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:2, race:'Halfling', name:'Halfling Shamans', abilities: { alumniOfAcademy: true } },
    b: { atk:0, def:0, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  alumniOfAcademyMechanicalExcludedWarlord: {
    desc: 'Academy (Warlord): Mechanical excludes the magical-ranged branch. 1 ranged × 6 figs at 100% hit vs def 0 → 6 dmg (a non-Mechanical unit would deal 8)',
    version: V_WARLORD,
    a: { figs:6, modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:2, race:'Halfling', name:'Mechanical Shamans', abilities: { alumniOfAcademy: true, mechanical: true } },
    b: { atk:0, def:0, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'a.ability.alumniOfAcademy':
        'Keep, and the absence is the rule under test: the magical-ranged branch of the Academy gate carries `!abilities.mechanical` (stats.js:1497-1501), which is the calculator\'s reading of `GetStat(U,SCustomAttribute,1)<>1` at CreateUnit.CAS!NOMOTHERFUNGUS!+7 "%AND (GetStat(U,SCustomAttribute,1)<>1) )", and the unit does not end in \'Rocs\' so it cannot take the other branch either. The `alumniOfAcademy:figures` step therefore never fires (stats.js:2497-2499) and the flag moves nothing. a.ability.mechanical is the live half - ablating it lets the +2 figures land, which is alumniOfAcademyMagicRangedWarlord\'s 8.000 against this 6.000. Those two are not one-value siblings: they also differ in a.name, which this gate reads only as `endsWith(\'Rocs\')`.',
    },
  },
  alumniOfAcademyLightningBoltWarlord: {
    desc: 'Academy (Warlord): the gate is `GetStat(U,SRangedType,1)>29` (CreateUnit.CAS!NOMOTHERFUNGUS!+4..+6 "IF (GetStat(U,STypeID,1)=221)" "%AND (GetStat(U,SRangedType,1)>29)") — the whole magical band, not an enumeration of realms — so the id-30 lightning-bolt projectile is inside it exactly as any other magical id is. 1 ranged × 8 figs at 100% hit vs def 0 → 8 dmg (without Academy, 6). Missile Immunity on the target is the control that the projectile is classed magical rather than physical: it blocks nothing here.',
    version: V_WARLORD,
    a: { figs:6, modernAttacks: { ranged: { strength:1, type:'magic_lightning' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:2, race:'Halfling', name:'Halfling Stormcallers', abilities: { alumniOfAcademy: true } },
    b: { atk:0, def:0, hp:20, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  alumniOfAcademyRocsWarlord: {
    desc: 'Academy (Warlord): Halfling Rocs qualify as the Fantastic Stable unit. 1 melee × (2+2) figs at 100% hit vs def 0 → 4 dmg (without Academy, 2)',
    version: V_WARLORD,
    a: { figs:2, atk:1, hitChance:70, hp:5, race:'Halfling', name:'Halfling Rocs', abilities: { alumniOfAcademy: true } },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  alumniOfAcademyNonHalflingExcludedWarlord: {
    desc: 'Academy (Warlord): non-Halfling magical-ranged units cannot use the racial building. 1 ranged × 4 figs at 100% hit vs def 0 → 4 dmg (a Halfling would deal 6)',
    version: V_WARLORD,
    a: { figs:4, modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:2, race:'High Men', name:'High Men Magicians', abilities: { alumniOfAcademy: true } },
    b: { atk:0, def:0, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Academy is closed to a non-Halfling unit, so neither the Academy flag nor the race the fixture gives it can move the number.',
      'a.ability.alumniOfAcademy':
        'Keep, and the absence is the rule under test: the gate is race-first, `baseUnitRace === \'Halfling\'` (stats.js:1497-1498). That race term is the calculator\'s own - the Academy is the Halfling city\'s race-exclusive building, so only Halflings are trained under it. The script gates on the city instead and has no race test of its own: CreateUnit.CAS!NOMOTHERFUNGUS!+3 "IF (ISBUILT(C,BAcademy)=0) THEN { GOTO" reads `ISBUILT(C,BAcademy)`, which presupposes a Halfling city, and the condition at CreateUnit.CAS!NOMOTHERFUNGUS!+4..+7 "IF (GetStat(U,STypeID,1)=221)" "%AND (GetStat(U,SCustomAttribute,1)<>1) )" is then unit-level only - `STypeID=221` for the Rocs, or `SRanged>0` and `SRangedType>29` and `SCustomAttribute<>1` for the magical-ranged branch. The calculator has no city, so it asks the unit. With the race term false a High Men magical-ranged unit reaches neither branch and the `alumniOfAcademy:figures` step never fires (stats.js:2497-2499). alumniOfAcademyMagicRangedWarlord is the Halfling arm of that same magical-ranged branch, 6 figures carried to 8; it is not a one-value sibling, since it also differs in a.figs and a.name.',
    },
  },

  // --- Dragon Mound ---
  dragonMoundFireBreathWarlord: {
    desc: 'Dragon Mound (Warlord): a Draconian unit with Fire Breath gains +2. Melee 1 vs def 1 (100% block) → 0; breath 2+2=4 (100% hit) vs def 1 (100% block) → 4−1 = 3 (without Dragon Mound, breath 2 → 2−1 = 1)',
    version: V_WARLORD,
    a: { figs:1, atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:2, type:'fire' } }, hp:10, race:'Draconian', abilities: { dragonMound: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  dragonMoundArmorWarlord: {
    desc: 'Dragon Mound (Warlord): a Draconian unit gains +1 Armor. atk 5 (100% hit) vs def 0 + Dragon Mound → 1 shield at 100% block → 4 dmg (without Dragon Mound, def 0 → 5)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, race:'Draconian', abilities: { dragonMound: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  dragonMoundHeroExcludedWarlord: {
    desc: 'Dragon Mound (Warlord): a Draconian hero is excluded — no +1 Armor. atk 5 (100% hit) vs def 0 → 5 dmg (a non-hero Draconian would gain +1 Armor → 1 shield at 100% block → 4 dmg)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, unitType:'hero', race:'Draconian', abilities: { dragonMound: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.ability.dragonMound':
        'Keep, and the absence is the rule under test: the `!isHero` term of the eligibility expression (stats.js:188-189) closes Dragon Mound to a Draconian hero, so the `training:dragonMound` step never fires (stats_sequence.js:222) and the +1 Defense at stats_sequence.js:224 never lands. That hero term is the calculator\'s own, and stats.js:182-187 is where it is stated. The script carries no unit-level hero test anywhere in the unique-building region: CreateUnit.CAS!NOBARAY!+36 "IF (ISBUILT(C,BDragonMound)=0) THEN { GOTO" gates on `ISBUILT(C,BDragonMound)`, `RACE` in that file is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);") rather than the unit\'s race, and the writes at CreateUnit.CAS!NOBARAY!+39..+40 "SETSTAT(U,SDefense,1,(GETSTAT(U,SDefense,1)+1)" "SETSTAT(U,SFireBreath,1,(GETSTAT(U,SFireBreath,1)+2)" are unconditional apart from the `AFlying` movement branch at CreateUnit.CAS!NOBARAY!+41 "IF (GETSTAT(U,AFlying,1)>0) THEN {". The calculator has no city, so it asks the unit. b.unitType=hero is the live half, and dragonMoundArmorWarlord differs only in b.unitType and pins 4.000 against this 5.000.',
    },
  },
  dragonMoundNonDraconianWarlord: {
    desc: 'Dragon Mound (Warlord): no Draconian tag → no bonus. Breath 2 (100% hit) vs def 0 → 2; melee 1 vs def 0 → 1; total 3 (a Draconian would get +2 breath and +1 armor → breath 4, but here def 0 means armor is moot; the point is breath stays 2)',
    version: V_WARLORD,
    a: { figs:1, atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:2, type:'fire' } }, hp:10, abilities: { dragonMound: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Dragon Mound\'s writes do not reach a non-Draconian unit, so the only feature the fixture adds cannot move the number.',
      'a.ability.dragonMound':
        'Keep, and the absence is the rule under test: eligibility carries `baseUnitRace === \'Draconian\'` (stats.js:188-189). That race term is the calculator\'s own, and stats.js:182-187 is where it is stated - the Mound is the Draconian city\'s race-exclusive building, so only Draconians are trained under it. The script gates on the city instead and has no race test of its own: CreateUnit.CAS!NOBARAY!+36 "IF (ISBUILT(C,BDragonMound)=0) THEN { GOTO" reads `ISBUILT(C,BDragonMound)`, `RACE` there is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"), and the writes at CreateUnit.CAS!NOBARAY!+39..+40 "SETSTAT(U,SDefense,1,(GETSTAT(U,SDefense,1)+1)" "SETSTAT(U,SFireBreath,1,(GETSTAT(U,SFireBreath,1)+2)" are unconditional apart from the `AFlying` movement branch at CreateUnit.CAS!NOBARAY!+41 "IF (GETSTAT(U,AFlying,1)>0) THEN {". The calculator has no city, so it asks the unit. With the race term false the `training:dragonMound` step is skipped (stats_sequence.js:222), so neither the +1 Defense (:224) nor the +2 to the fire-breath channel (:227-231) lands. dragonMoundFireBreathWarlord is the Draconian arm of the same writes but is not a numeric contrast to this fixture: it also raises b.def to 1 and reaches the same 3.000 by a different route, breath 2+2 = 4 less one shield with the melee 1 fully blocked.',
    },
  },
  dragonMoundThrownNotBoostedWarlord: {
    desc: 'Dragon Mound (Warlord): the +2 creates Fire Breath and does not boost existing Thrown. Melee 1 vs def 1 (100% block) → 0; unboosted Thrown 2 and created Fire Breath 2 each deal 1 → total 2',
    version: V_WARLORD,
    a: { figs:1, atk:1, hitChance:70, modernAttacks: { thrown: { strength:2, type:'thrown' } }, hp:10, race:'Draconian', abilities: { dragonMound: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },

  // --- Lava Smelter ---
  // Each mineral pair records an independent permanent grant carried by a new Dwarf unit or by
  // an existing non-fantastic unit after Upgrade & Retrain.
  lavaSmelterWeaponImmunityWarlord: {
    desc: 'Lava Smelter (Warlord): a Dwarf unit gains Weapon Immunity. Normal melee atk 10 (100% hit) vs def 0 → WI +10 = 10, 100% block → all blocked → 0 (without the grant, def 0 → 10 dmg)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, race:'Dwarf', abilities: { lavaSmelterWeaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  lavaSmelterMissileImmunityWarlord: {
    desc: 'Lava Smelter (Warlord): a Dwarf unit gains Missile Immunity. Missile rtb 10 (100% hit) vs def 0 → MI raises def to 100, 100% block → all blocked → 0 (without the grant, def 0 → 10 dmg)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, race:'Dwarf', abilities: { lavaSmelterMissileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  lavaSmelterResistElemWarlord: {
    desc: 'Lava Smelter (Warlord): a Dwarf unit gains Resist Elements. Magic ranged rtb 6 (100% hit) vs def 0 → +4 = 4, 100% block → 2 dmg (without the grant, def 0 → 6 dmg)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:6, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, race:'Dwarf', abilities: { lavaSmelterResistElements: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  lavaSmelterElementalArmorWarlord: {
    desc: 'Lava Smelter (Warlord): a Dwarf unit gains Elemental Armor. Magic ranged rtb 10 (100% hit) vs def 0 → +12 = 12, 100% block → all blocked → 0 (without the grant, def 0 → 10 dmg)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, race:'Dwarf', abilities: { lavaSmelterElementalArmor: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  lavaSmelterFlameBladeWarlord: {
    desc: 'Lava Smelter (Warlord): a Dwarf unit gains Fiery Blade. Melee 1+3 = 4, weapon upgraded to magic so it bypasses the target Weapon Immunity → def 0, 100% block of 0 shields → 4 dmg (without the grant, melee 1 vs WI def 10 → 0 dmg)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, race:'Dwarf', abilities: { lavaSmelterFieryBlade: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  lavaSmelterUpgradeRetrainNonDwarfWarlord: {
    desc: 'Lava Smelter + Upgrade & Retrain (Warlord): an existing non-Dwarf unit can carry Weapon Immunity. Normal melee atk 10 (100% hit) vs WI +10 defense, 100% block → 0 dmg',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { lavaSmelterWeaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'name-binds-nothing':
        'Keep, and the absence is the rule under test. The key names the retrain path and the absence of a race, and an absent field is not a candidate: b carries no `race` at all, which is the assertion itself. So containsRun looks for \'lava smelter weapon immunity\' and \'lava smelter weapon imm\' against \'lava smelter upgrade retrain non dwarf warlord\' and finds neither, while the one candidate the fixture does have, b.ability.lavaSmelterWeaponImmunity, is live. The gate under test is applyLavaSmelterGrant (stats_identity.js:501-502), which tests only the version and `unitType.startsWith(\'fantastic_\')` and carries no race term. The retrain path agrees: OverlandEndTurn.CAS!NOOUTLANDERWEAPON!+2 "IF (BUILDINGSOWNED(W,BLavaSmelter,0)=0) THEN { GOTO" gates on `BUILDINGSOWNED(W,BLavaSmelter,0)`, a wizard-level ownership test rather than the unit\'s own city, and the Weapon Immunity write at OverlandEndTurn.CAS!NOOUTLANDERWEAPON!+6 "IF (OWNMITHRIL>0) %AND (OWNADAMANTIUM>0) THEN { SETSTAT(U,AWeaponImmunity,1,1); }" asks only for Mithril and Adamantium. lavaSmelterWeaponImmunityWarlord differs only in b.race and expects the same 0; that pair is what a race term added here would break.',
    },
  },
  lavaSmelterUpgradeRetrainHeroWarlord: {
    desc: 'Lava Smelter + Upgrade & Retrain (Warlord): an existing hero can carry Weapon Immunity. Normal melee atk 10 (100% hit) vs WI +10 defense, 100% block → 0 dmg',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, unitType:'hero', abilities: { lavaSmelterWeaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'b.unitType=hero':
        'Keep, and the absence is the rule under test: the claim is that the Lava Smelter grants are *not* closed to heroes, so the hero marker is expected to move nothing. applyLavaSmelterGrant tests only the version and `unitType.startsWith(\'fantastic_\')` (stats_identity.js:501-502) - there is no hero term to remove - so a hero carries Weapon Immunity exactly as any other retrained unit does. The retrain path agrees: OverlandEndTurn.CAS!NOMAGITEKSCI!+2 "IF (BASEFANTASTIC(U)>0) THEN { GOTO" skips the block on `BASEFANTASTIC(U)` alone, and no `ISHERO` test stands between that block\'s gate at OverlandEndTurn.CAS!SKIPCHAOSEMBRACE!+8 "IF (SPELLSTATE(W,STObsolescenceRearmament)<>2) THEN { GOTO" and the mineral grants at OverlandEndTurn.CAS!NOOUTLANDERWEAPON!+2..+24 "IF (BUILDINGSOWNED(W,BLavaSmelter,0)=0) THEN { GOTO" "IF (OWNADAMANTIUM>0) %AND (OWNORIHALCON>0) THEN { SETENCHANTMENTFLAG(U,EncElementalArmor,1,1); }"; the file\'s only `ISHERO` gate, OverlandEndTurn.CAS!NOLOGISTIC!+17 "IF ISHERO(U) %OR BASEFANTASTIC(U) THEN { GOTO", belongs to the separate Military Workshop / Caravanserai garrison upgrade that ends at OverlandEndTurn.CAS!CANTUPGRADE!. Ablating the marker assigns `unitType: \'normal\'` (tools/preset_vacuity_sweep.js:204, written at :300), which semantically matches lavaSmelterUpgradeRetrainNonDwarfWarlord rather than reproducing it: that fixture omits the field, and setUnit merges an omitted `unitType` to the same \'normal\' (UNIT_DEFAULTS, data.js:110, spread at ui_state.js:362). It expects the same 0. b.ability.lavaSmelterWeaponImmunity is the live half, and lavaSmelterFantasticExcludedWarlord differs only in b.unitType and pins 10.000 against this 0.',
    },
  },
  lavaSmelterFantasticExcludedWarlord: {
    desc: 'Lava Smelter + Upgrade & Retrain (Warlord): fantastic creatures are excluded. Normal melee atk 10 (100% hit) vs def 0 → 10 dmg',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, unitType:'fantastic_chaos', abilities: { lavaSmelterWeaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A tokenisation artefact - containsRun looks for \'unit type\' and \'fantastic chaos\' and the key says \'lava smelter fantastic excluded warlord\', so the class name in the key cannot span the concrete realm value the fixture has to pick for the control. The feature the key means is live all the same: b.unitType=fantastic_chaos is what applyLavaSmelterGrant refuses on (`unitType.startsWith(\'fantastic_\')`, stats_identity.js:502), the calculator\'s reading of `IF (BASEFANTASTIC(U)>0) THEN { GOTO "NOOUTLANDERUPGRADE"; }` at OverlandEndTurn.CAS!NOMAGITEKSCI!+2 "IF (BASEFANTASTIC(U)>0) THEN { GOTO", which sits upstream of the mineral grants at OverlandEndTurn.CAS!NOOUTLANDERWEAPON!+2..+24 "IF (BUILDINGSOWNED(W,BLavaSmelter,0)=0) THEN { GOTO" "IF (OWNADAMANTIUM>0) %AND (OWNORIHALCON>0) THEN { SETENCHANTMENTFLAG(U,EncElementalArmor,1,1); }". Ablating it assigns `unitType: \'normal\'` (tools/preset_vacuity_sweep.js:204, written at :300), which semantically matches lavaSmelterUpgradeRetrainNonDwarfWarlord rather than reproducing it: that fixture omits the field, and setUnit merges an omitted `unitType` to the same \'normal\' (UNIT_DEFAULTS, data.js:110, spread at ui_state.js:362). It expects 0 against this 10.000. The other candidate, b.ability.lavaSmelterWeaponImmunity, is inert here by that same refusal, but the key does not name it so it raises no finding of its own.',
    },
  },
  lavaSmelterProtectionsStackWarlord: {
    desc: 'Lava Smelter (Warlord): Resist Elements and Elemental Armor stack as two independent Inc writes (Combat.ResolutionHelpers.pas:191-195). Magic ranged 20 meets 4 + 12 = 16 Defense, but DefenseRoll (:159-171) rolls only dice 1-15 at the rolled chance and caps the rest at 30% (ToDefendCap 15, ToDefendCappedValue 30), so 15 × 1.0 + 1 × 0.3 = 15.3 is blocked → 4.7. The cap makes a cap-free re-size impossible here, since 4 + 12 always exceeds 15. Elemental Armor alone deals 8.0, Resist Elements alone 16.0.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:20, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:30, abilities: {
      lavaSmelterResistElements: true,
      lavaSmelterElementalArmor: true,
    } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.700 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A tokenisation artefact - containsRun looks for \'lava smelter resist elements\' / \'lava smelter resist elem\' and \'lava smelter elemental armor\' / \'lava smelter elem armor\', and the key says \'lava smelter protections stack warlord\'. The key names the interaction rather than either operand, and the sweep binds one candidate at a time, so a stacking claim can have no single named candidate. Both operands are live: they are two separate writes to effectiveDefense with independent gates, +4 at combat_effects.js:438-440 and +12 at :442-444, so ablating either leaves the other\'s write standing. This is the only fixture in the preset set that puts both effects on one unit - every other carrier is either a single lavaSmelter flag or the legacy single-valued `elemArmor` selector.',
    },
  },

  // --- Lightning Blade ---
  lightningBladeConvertsThrownWarlord: {
    desc: 'Lightning Blade (Warlord): innate Thrown 4 becomes Lightning Breath 5 (Thrown +1, Armor Piercing). Melee atk 1 vs def 4 (100% block) → 0; breath 5 with AP halves def 4→2 → 5−2 = 3 (without conversion, plain thrown 4 vs def 4 → 0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:4, type:'thrown' } }, hp:10, abilities: { lightningBlade: true } },
    b: { atk:0, def:4, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  lightningBladeGrantsBreathWarlord: {
    desc: 'Lightning Blade (Warlord): melee-only unit gains a strength-1 Lightning Breath (Armor Piercing). Melee atk 2 vs def 1 (100% block) → 1; granted breath 1 with AP halves def 1→0 → 1; total 2 (without the grant, only melee → 1)',
    version: V_WARLORD,
    a: { atk:2, hitChance:70, hp:10, abilities: { lightningBlade: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },

  // --- Ludus Agoge ---
  // Orc-race building. Trained Orc units gain +1 Attack, +1 existing ranged,
  // +1 Resistance, and +1 HP.
  // Legionaries gain +1 Movement instead (not modelled) and heroes are excluded.
  ludusAgogeAttackWarlord: {
    desc: 'Ludus Agoge (Warlord): an Orc unit gains +1 Attack. Melee 4+1 = 5 (100% hit) vs def 1 (100% block) → 5−1 = 4 (without the grant, melee 4 → 3)',
    version: V_WARLORD,
    a: { atk:4, hitChance:70, hp:10, race:'Orc', abilities: { ludusAgoge: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  ludusAgogeResistanceWarlord: {
    desc: 'Ludus Agoge (Warlord): an Orc unit gains +1 Resistance. Death Gaze vs res 9+1 = 10 → P(die) = 0 → 0 dmg (without the grant, res 9 → P = 0.1 × 10 HP = 1.0 dmg). The resistance grant is isolated here: at P = 0 no figure dies, so the +1 HP grant cannot affect the result. The grant also writes +1 melee at ABase, so the Orc counterattacks for 1 at 30% To Hit → dmgToA 0.3 (F133)',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:9, hp:10, race:'Orc', abilities: { ludusAgoge: true } },
    expected: { dmgToA: 0.300, dmgToB: 0 },
  },
  ludusAgogeHpWarlord: {
    desc: 'Ludus Agoge (Warlord): an Orc unit gains +1 HP. Melee 10 (100% hit) vs def 0 → 10 raw, capped at the defender total HP 5+1 = 6 → 6 dmg (without the grant, HP 5 caps it at 5). The grant also writes +1 melee at ABase, so the Orc counterattacks for 1 at 30% To Hit → dmgToA 0.3 (F133)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:30 },
    b: { atk:0, def:0, toBlkMod:70, hp:5, race:'Orc', abilities: { ludusAgoge: true } },
    expected: { dmgToA: 0.300, dmgToB: 6.000 },
  },
  ludusAgogeNonOrcWarlord: {
    desc: 'Ludus Agoge (Warlord): a non-Orc unit gets no bonus. Melee 4 (100% hit) vs def 1 (100% block) → 3 (an Orc would gain +1 Attack → 4)',
    version: V_WARLORD,
    a: { atk:4, hitChance:70, hp:10, abilities: { ludusAgoge: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Agoge\'s writes do not reach a non-Orc unit, so the only feature the fixture adds cannot move the number.',
      'a.ability.ludusAgoge':
        'Keep, and the absence is the rule under test: eligibility carries `baseUnitRace === \'Orc\'` (stats.js:196-197). That race term is the calculator\'s own, and stats.js:190-195 is where it is stated - the Agoge is the Orc city\'s race-exclusive building, so only Orcs are trained under it. The script gates on the city instead and has no race test of its own: CreateUnit.CAS!NODRAGONMOUND!+3 "IF (ISBUILT(C,BAgoge)=0) THEN { GOTO" reads `ISBUILT(C,BAgoge)=0`, `RACE` there is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"), the branch at CreateUnit.CAS!NODRAGONMOUND!+6 "IF (GetStat(U,STypeID,1)=139) THEN {" keys on `STypeID` alone, and the stat writes at CreateUnit.CAS!NODRAGONMOUND!+13..+16 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,1)+1));" "IF (GETSTAT(U,SRanged,1)>0) THEN { SETSTAT(U,SRanged,1,(GetStat(U,SRanged,1)+1)); }" ask only `SRanged>0` for the ranged half. The calculator has no city, so it asks the unit. With the race term false the `training:ludusAgoge` step is skipped (stats_sequence.js:237) and the +1 Attack at :239 never lands. ludusAgogeAttackWarlord differs only in a.race and pins 4.000 against this 3.000.',
    },
  },
  ludusAgogeLegionaryExcludedWarlord: {
    desc: 'Ludus Agoge (Warlord): a Legionary gains +1 Movement instead (not modelled), so no stat bonus. Melee 4 (100% hit) vs def 1 (100% block) → 3 (a non-Legionary Orc would gain +1 Attack → 4)',
    version: V_WARLORD,
    a: { atk:4, hitChance:70, hp:10, race:'Orc', name:'Orc Legionary', abilities: { ludusAgoge: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that a Legionary takes the movement branch instead of the stat branch, so neither the building flag nor the Orc race the fixture gives it can move the number.',
      'a.ability.ludusAgoge':
        'Keep, and the absence is the rule under test. Unlike the race and hero terms next to it, this exclusion is the script\'s own: `GetStat(U,STypeID,1)=139` at CreateUnit.CAS!NODRAGONMOUND!+6 "IF (GetStat(U,STypeID,1)=139) THEN {" sends the unit into the movement writes at CreateUnit.CAS!NODRAGONMOUND!+7..+10 "SETSTAT(U,SOLMaxMoves,1,(GetStat(U,SOLMaxMoves,1)+2));" "SETSTAT(U,SCombatMovesLeft,1,(GetStat(U,SCombatMovesLeft,1)+2));" and out at CreateUnit.CAS!NODRAGONMOUND!+11 "GOTO", so the ELSE at CreateUnit.CAS!NODRAGONMOUND!+12..+17 "} ELSE {" "GOTO" carrying +1 Attack, +1 Resistance, +1 HP and the conditional +1 ranged is never reached. Type 139 is `Name=Legionary` (`Unit rosters/Warlord mod unit data/UNITS.INI`:3876-3878), which the calculator reads as `!unitName.endsWith(\'Legionary\')` (stats.js:196-197). Movement is out of scope (CLAUDE.md, *Out of scope*), so that branch models as no stat write at all and the `training:ludusAgoge` step is skipped entirely (stats_sequence.js:237). ludusAgogeAttackWarlord differs only in a.name and pins 4.000 against this 3.000.',
    },
  },
  ludusAgogeHeroExcludedWarlord: {
    desc: 'Ludus Agoge (Warlord): an Orc hero is excluded — no bonus. Melee 4 (100% hit) vs def 1 (100% block) → 3 (a non-hero Orc would gain +1 Attack → 4)',
    version: V_WARLORD,
    a: { atk:4, hitChance:70, unitType:'hero', hp:10, race:'Orc', abilities: { ludusAgoge: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.ludusAgoge':
        'Keep, and the absence is the rule under test: the `!isHero` term of the same eligibility expression (stats.js:196-197) closes the Agoge to an Orc hero, so the `training:ludusAgoge` step never fires (stats_sequence.js:237) and the +1 Attack at :239 never lands. That hero term is the calculator\'s own, stated at stats.js:190-195; CreateUnit.CAS carries no unit-level hero test in the unique-building region, and `RACE` there is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"), the city\'s race rather than the unit\'s. a.unitType=hero is the live half, and ludusAgogeAttackWarlord differs only in a.unitType and pins 4.000 against this 3.000.',
    },
  },

  // --- Mother Fungus ---
  // Goblin building. Trained Goblin units gain +2 Attack, +2 existing ranged,
  // +10% To Defend, and Poison 1
  // (heroes excluded; the ×2 Spellcharge bonus is not modelled). Attack and To-Defend cases
  // give the defender Poison Immunity so the always-on Poison 1 grant does not contaminate the
  // effect under test.
  motherFungusAttackWarlord: {
    desc: 'Mother Fungus (Warlord): a Goblin unit gains +2 Attack. Melee 4+2 = 6 (100% hit) vs def 1 (100% block) → 6−1 = 5 (without the grant, melee 4 → 3). Defender is Poison-Immune to isolate from the +1 Poison grant',
    version: V_WARLORD,
    a: { atk:4, hitChance:70, hp:10, race:'Goblin', abilities: { motherFungus: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30, abilities: { poisonImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  motherFungusToDefendWarlord: {
    desc: 'Mother Fungus (Warlord): a Goblin unit gains +10% To Defend. Boulder 10 (100% hit) vs a Goblin defender, def 5, base 30%+10% = 40% block → 10 − 5×0.4 = 8.0 (without the grant, 30% block → 10 − 5×0.3 = 8.5). Ranged so no melee counter; the defender Attack/Poison grants only affect the (absent) counterattack',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20 },
    b: { atk:0, def:5, toBlkMod:0, res:20, hp:20, race:'Goblin', abilities: { motherFungus: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  motherFungusPoisonWarlord: {
    desc: 'Mother Fungus (Warlord): a melee-only Goblin unit with no poison gains Poison 1. Melee 1+2 = 3 (100% hit) vs def 3 (100% block) → 0 physical, but Poison 1 lands (res 1, CoM2 fail = (11−1)/10 = 1.0) → 1.0 poison damage (without the grant, melee 1 vs def 3 → 0 physical and no poison → 0). The +2 Attack is fully absorbed by the 100%-block def 3 so only the poison grant surfaces',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, race:'Goblin', abilities: { motherFungus: true } },
    b: { atk:0, def:3, toBlkMod:70, res:1, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  militaryWorkshopAndMotherFungusPoisonStackWarlord: {
    desc: 'Military Workshop x Mother Fungus (Warlord): the two poison grants stack. Both blocks make the same `<>100` increment on the permanent AFPoison field — `CreateUnit.CAS!NOTGENERIC!+47 "IF (GetStat(U,AFPoison,1,1)<>100) THEN { SETSTAT(U,AFPoison,1,(GetStat(U,AFPoison,1,1))+1,1); } ELSE { SETSTAT(U,AFPoison,1,1,1); }"` and `CreateUnit.CAS!NOBASILICA!+14 "IF (GetStat(U,AFPoison,1,1)<>100) THEN {"` — each reading the value it raises, so a Goblin unit with both takes Poison 2, not 1. Boulder 1+2 = 3 (100% hit) vs def 8 halved to 4 by the Workshop’s Armor Piercing (100% block) → 0 physical, so only the poison shows: 2 x (11−5)/10 = 1.2 (with one grant overwriting the other, Poison 1 → 0.6)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20, race:'Goblin', abilities: { militaryWorkshop: true, motherFungus: true } },
    b: { atk:0, def:8, toBlkMod:70, res:5, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.200 },
  },
  motherFungusNonGoblinWarlord: {
    desc: 'Mother Fungus (Warlord): a non-Goblin unit gets no bonus. Melee 4 (100% hit) vs def 1 (100% block) → 3 (a Goblin would gain +2 Attack → 5). No poison grant applies, so the defender needs no Poison Immunity',
    version: V_WARLORD,
    a: { atk:4, hitChance:70, hp:10, abilities: { motherFungus: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Mother Fungus\'s writes do not reach a non-Goblin unit, so the only feature the fixture adds cannot move the number.',
      'a.ability.motherFungus':
        'Keep, and the absence is the rule under test: eligibility carries `baseUnitRace === \'Goblin\'` (stats.js:204-205). That race term is the calculator\'s own, and stats.js:198-203 is where it is stated - the Fungus is the Goblin city\'s race-exclusive building, so only Goblins are trained under it. The script gates on the city instead and has no race test of its own: CreateUnit.CAS!NOBASILICA!+3 "IF (ISBUILT(C,BMotherFungus)=0) THEN { GOTO" reads `ISBUILT(C,BMotherFungus)=0`, `RACE` there is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"), and the writes at CreateUnit.CAS!NOBASILICA!+6..+14 "SETSTAT(U,SToDefend,1,(GETSTAT(U,SToDefend,1)+10)" "IF (GetStat(U,AFPoison,1,1)<>100) THEN {" are unconditional apart from the `SRanged>0`, `SSpellCharges>0` and `AFPoison<>100` tests at CreateUnit.CAS!NOBASILICA!+8 "IF (GetStat(U,SRanged,1)>0) THEN {", CreateUnit.CAS!NOBASILICA!+11 "IF (GetStat(U,SSpellCharges,1)>0) THEN {" and CreateUnit.CAS!NOBASILICA!+14 "IF (GetStat(U,AFPoison,1,1)<>100) THEN {". The calculator has no city, so it asks the unit. With the race term false the `training:motherFungus` step is skipped (stats_sequence.js:248), so neither the +2 Attack (:250), the +10% To Defend (:254) nor the Poison increment (:257) lands - which is why this fixture, unlike the Goblin arm, needs no Poison Immunity on the defender. motherFungusAttackWarlord is that Goblin arm at 5.000 against this 3.000; it is not a one-value sibling, since it also gives b poisonImmunity to keep the always-on poison grant out of its total.',
    },
  },
  motherFungusHeroExcludedWarlord: {
    desc: 'Mother Fungus (Warlord): a Goblin hero is excluded — no Attack and no Poison grant. Melee 4 (100% hit) vs def 1 (100% block) → 3 (a non-hero Goblin would deal 5 plus poison). No Poison Immunity on the defender, so an erroneous poison grant would also surface',
    version: V_WARLORD,
    a: { atk:4, hitChance:70, unitType:'hero', hp:10, race:'Goblin', abilities: { motherFungus: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.motherFungus':
        'Keep, and the absence is the rule under test: the `!isHero` term of the same eligibility expression (stats.js:204-205) closes the building to a Goblin hero, so the `training:motherFungus` step never fires (stats_sequence.js:248) and neither the +2 Attack (:250) nor the Poison increment (:257) lands. The defender deliberately carries no Poison Immunity, so an erroneous poison grant would surface in the total rather than be absorbed. That hero term is the calculator\'s own, stated at stats.js:198-203; CreateUnit.CAS carries no unit-level hero test in the unique-building region, and `RACE` there is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"). a.unitType=hero is the live half. motherFungusAttackWarlord is the non-hero arm at 5.000 against this 3.000; it is not a one-value sibling, since it also gives b poisonImmunity.',
    },
  },

  // --- Pool of Repentance ---
  // Rakhshasa building. Units trained here gain +1 Armor and +1 Resistance. Race-gated to
  // Rakhshasa; heroes excluded.
  poolOfRepentanceArmorWarlord: {
    desc: 'Pool of Repentance (Warlord): a Rakhshasa unit gains +1 Armor. atk 5 (100% hit) vs def 0 + Pool → 1 shield at 100% block → 4 dmg (without the grant, def 0 → 5)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, race:'Rakhshasa', abilities: { poolOfRepentance: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  poolOfRepentanceResistanceWarlord: {
    desc: 'Pool of Repentance (Warlord): a Rakhshasa unit gains +1 Resistance. Death Gaze vs res 9+1 = 10 → P(die) = 0 → 0 dmg (without the grant, res 9 → P = 0.1 × 10 HP = 1.0 dmg)',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:9, hp:10, race:'Rakhshasa', abilities: { poolOfRepentance: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  poolOfRepentanceNonRakhshasaWarlord: {
    desc: 'Pool of Repentance (Warlord): a non-Rakhshasa unit gets no bonus. atk 5 (100% hit) vs def 0 → 5 dmg (a Rakhshasa would gain +1 Armor → 1 shield at 100% block → 4 dmg)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { poolOfRepentance: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Pool\'s writes do not reach a non-Rakhshasa unit, so the only feature the fixture adds cannot move the number.',
      'b.ability.poolOfRepentance':
        'Keep, and the absence is the rule under test: eligibility carries `baseUnitRace === \'Rakhshasa\'` (stats.js:210-211). That race term is the calculator\'s own, and stats.js:206-209 is where it is stated - the Pool is the Rakhshasa city\'s race-exclusive building, so only Rakhshasa are trained under it. The script gates on the city instead and has no race test of its own: CreateUnit.CAS!NOBARAY!+28 "IF ISBUILT(C,BPoolOfRepentance) THEN {" reads `ISBUILT(C,BPoolOfRepentance)`, `RACE` there is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"), and the two writes at CreateUnit.CAS!NOBARAY!+30..+31 "SETSTAT(U,SDefense,1,(GETSTAT(U,SDefense,1)+1)" "SETSTAT(U,SResist,1,(GETSTAT(U,SResist,1)+1)" are unconditional. The calculator has no city, so it asks the unit. With the race term false the `training:poolOfRepentance` step is skipped (stats_sequence.js:217) and the `u.def += 1` at :218 never lands. poolOfRepentanceArmorWarlord differs only in b.race and pins 4.000 against this 5.000.',
    },
  },
  poolOfRepentanceHeroExcludedWarlord: {
    desc: 'Pool of Repentance (Warlord): a Rakhshasa hero is excluded — no +1 Armor. atk 5 (100% hit) vs def 0 → 5 dmg (a non-hero Rakhshasa would gain +1 Armor → 4 dmg)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, unitType:'hero', race:'Rakhshasa', abilities: { poolOfRepentance: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.ability.poolOfRepentance':
        'Keep, and the absence is the rule under test: the `!isHero` term of the same eligibility expression (stats.js:210-211) closes the Pool to a Rakhshasa hero, so the `training:poolOfRepentance` step never fires (stats_sequence.js:217) and the `u.def += 1` at :218 never lands. That hero term is the calculator\'s own, stated at stats.js:206-209; CreateUnit.CAS carries no unit-level hero test in the unique-building region, and `RACE` there is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"), the city\'s race rather than the unit\'s. b.unitType=hero is the live half, and poolOfRepentanceArmorWarlord differs only in b.unitType and pins 4.000 against this 5.000.',
    },
  },

  // --- Sancta Basilica ---
  // High Men building. Every High Men unit trained gains +3 Resistance. Clergy (unit tag),
  // Crusaders, and Paladins (by name) also gain Sanctify; Crusaders also gain Lucky; Paladins
  // also gain Magic Immunity. Improved Exorcise and the defending-city True Light are not modelled.
  // Race-gated to High Men; heroes excluded.
  sanctaBasilicaResistanceWarlord: {
    desc: 'Sancta Basilica (Warlord): a plain High Men unit gains +3 Resistance. Death Gaze vs res 7+3 = 10 → P(die) = 0 → 0 dmg (without the grant, res 7 → P = 0.3 × 10 HP = 3.0 dmg). No name/Clergy match, so no Sanctify/Lucky/Magic Immunity contaminates the Death Gaze',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:7, hp:10, race:'High Men', abilities: { sanctaBasilica: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  sanctaBasilicaCrusaderLuckyWarlord: {
    desc: 'Sancta Basilica (Warlord): a High Men Crusader gains Lucky (+10% To Block). Boulder 10 (100% hit) vs def 5, base 30%+10% = 40% block → 10 − 5×0.4 = 8.0 (without Lucky, 30% block → 8.5). Ranged so no melee counter',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20 },
    b: { atk:0, def:5, toBlkMod:0, hp:20, race:'High Men', name:'Crusaders', abilities: { sanctaBasilica: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  sanctaBasilicaPaladinMagicImmunityWarlord: {
    desc: 'Sancta Basilica (Warlord): a High Men Paladin gains Magic Immunity, which blocks Death Gaze entirely → 0 dmg (without the grant, res 1+3 = 4 → P = 0.6 × 10 HP = 6.0 dmg)',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:1, hp:10, race:'High Men', name:'Paladins', abilities: { sanctaBasilica: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  sanctaBasilicaClergySanctifyWarlord: {
    desc: 'Sancta Basilica (Warlord): a High Men Clergy attacker gains Sanctify and becomes Life FANTASTIC, so the defender\'s Weapon Immunity does not apply (attacker not normal). atk 6 (100% hit) vs def 2 (100% block) → 6−2 = 4 (without Sanctify the attacker stays normal, Weapon Immunity adds +10 def → 12 → 0 dmg)',
    version: V_WARLORD,
    a: { figs:1, atk:6, hp:10, hitChance:70, weapon:'normal', unitType:'normal', race:'High Men', name:'High Men Monks', abilities: { sanctaBasilica: true, clergy: true } },
    b: { figs:1, atk:0, def:2, hp:10, toBlkMod:70, unitType:'normal', abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  sanctaBasilicaNonHighMenWarlord: {
    desc: 'Sancta Basilica (Warlord): a non-High Men unit gets no bonus. Death Gaze vs res 7 → P = 0.3 × 10 HP = 3.0 dmg (a High Men unit would gain +3 Resistance → res 10 → 0 dmg)',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:7, hp:10, abilities: { sanctaBasilica: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'b.ability.sanctaBasilica':
        'Keep, and the absence is the rule under test: eligibility carries `baseUnitRace === \'High Men\'` (stats.js:219). That race term is the calculator\'s own, and stats.js:212-217 is where it is stated - the Basilica is the High Men city\'s race-exclusive building, so only High Men are trained under it. The script gates on the city instead, and the Basilica block carries no unit-race test of its own: CreateUnit.CAS!NOFROSTCLUB!+3 "IF (ISBUILT(C,BBasilica)=0) THEN { GOTO" reads `ISBUILT(C,BBasilica)=0`, `RACE` there is `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"), the +3 Resistance at CreateUnit.CAS!NOFROSTCLUB!+5 "SETSTAT(U,SResist,1,(GetStat(U,SResist,1)+3));" is unconditional, and the four branches under it (CreateUnit.CAS!NOFROSTCLUB!+6..+27 "IF (GetStat(U,STypeID,1)=108) THEN {" "}") key on `STypeID` alone. That negative is block-level, not file-level: CreateUnit.CAS!NOLOGISTIC!+50 "IF (GETSTAT(U,SRace,1)<>RCGeneric) %OR (GETSTAT(U,STypeID,1)=44) THEN { GOTO" does test the unit\'s own `SRace`, in the separate generic-to-racial conversion. The calculator has no city, so it asks the unit. With the race term false the `training:sanctaBasilica` step is skipped (stats_sequence.js:263) and the `u.res += 3` at :264 never lands. applySanctaBasilicaGrant refuses on the same term (stats_identity.js:569-570), so the Sanctify / Lucky / Magic Immunity half is never reached and its KNOWN DEFECT note (stats_identity.js:557-567) is out of scope here. a.ability.deathGaze is the live half - it is the probe the Resistance is read through. sanctaBasilicaResistanceWarlord differs only by carrying `race:\'High Men\'` on b and pins 0 against this 3.000.',
    },
  },
  sanctaBasilicaHeroExcludedWarlord: {
    desc: 'Sancta Basilica (Warlord): a High Men hero is excluded — no +3 Resistance. Death Gaze vs res 7 → P = 0.3 × 10 HP = 3.0 dmg (a non-hero High Men unit would reach res 10 → 0 dmg)',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:7, hp:10, unitType:'hero', race:'High Men', abilities: { sanctaBasilica: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'b.ability.sanctaBasilica':
        'Keep, and the absence is the rule under test: the `!isHero` term of the same eligibility expression (stats.js:219) closes the Basilica to a High Men hero, so the `training:sanctaBasilica` step never fires (stats_sequence.js:263) and the `u.res += 3` at :264 never lands; applySanctaBasilicaGrant refuses on the same term (stats_identity.js:570). That hero term is the calculator\'s own, stated at stats.js:212-217. CreateUnit.CAS contains no `ISHERO` at all - a file-wide negative, checked case-insensitively over the whole file - so there is no unit-level hero test to model. The race side is a block-level negative and is claimed only as one: the Basilica block gates on `ISBUILT(C,BBasilica)=0` (CreateUnit.CAS!NOFROSTCLUB!+3 "IF (ISBUILT(C,BBasilica)=0) THEN { GOTO"), writes +3 Resistance unconditionally (CreateUnit.CAS!NOFROSTCLUB!+5 "SETSTAT(U,SResist,1,(GetStat(U,SResist,1)+3));"), and branches on `STypeID` alone (CreateUnit.CAS!NOFROSTCLUB!+6..+27 "IF (GetStat(U,STypeID,1)=108) THEN {" "}"), with `RACE` in that file being `CITYRACE(C)` (CreateUnit.CAS!NOTLINK!-20 "RACE=CITYRACE(C);"), the city\'s race rather than the unit\'s. The file does read the unit\'s own race elsewhere - `GETSTAT(U,SRace,1)` at CreateUnit.CAS!NOLOGISTIC!+50 "IF (GETSTAT(U,SRace,1)<>RCGeneric) %OR (GETSTAT(U,STypeID,1)=44) THEN { GOTO", in the generic-to-racial conversion - but not in this block. b.unitType=hero is the live half - dropping the hero marker lets the +3 land, res 7 reaches 10 and the Death Gaze scores nothing. sanctaBasilicaResistanceWarlord differs only by not carrying `unitType:\'hero\'` on b and pins 0 against this 3.000.',
    },
  },

  // --- Military Workshop ---
  // XuanYuan building. Upgrades any normal unit (heroes/fantastic excluded), not race-gated.
  // Physical ranged/thrown → Armor Piercing (or +2 strength if Doom); Fire Breath +4; small
  // physical projectiles → heavy (boulder, bypassing Missile Immunity); +1 Poison.
  // The non-poison cases give the defender Poison Immunity so the always-on +1 Poison grant
  // does not contaminate the effect under test.
  militaryWorkshopArmorPiercingWarlord: {
    desc: 'Military Workshop (Warlord): a physical-ranged unit gains Armor Piercing. Boulder 10 (100% hit) vs def 8 (100% block) → AP halves def to 4 → 10−4 = 6 (without the grant, def 8 → 2). Defender is Poison-Immune to isolate from the +1 Poison grant',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20, abilities: { militaryWorkshop: true } },
    b: { atk:0, def:8, toBlkMod:70, hp:20, abilities: { poisonImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  militaryWorkshopDoomGetsStrengthNotAPWarlord: {
    desc: 'Military Workshop (Warlord): a Doom-attack unit gets +2 strength instead of Armor Piercing (Doom already ignores armor). Boulder Doom 5+2 = 7 strength → CoM Doom deals floor(7/2) = 3, def 8 ignored (without the grant, floor(5/2) = 2). Defender Poison-Immune',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:5, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20, abilities: { doom: true, militaryWorkshop: true } },
    b: { atk:0, def:8, toBlkMod:70, hp:20, abilities: { poisonImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  militaryWorkshopFireBreathWarlord: {
    desc: 'Military Workshop (Warlord): a Fire Breath unit gains +4 breath strength. Fire breath 6+4 = 10 (100% hit) vs def 3 (100% block) → 10−3 = 7 (without the grant, 6 → 3). Defender Poison-Immune to isolate the breath bonus',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { fireBreath: { strength:6, type:'fire' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20, abilities: { militaryWorkshop: true } },
    b: { atk:0, def:3, toBlkMod:70, hp:20, abilities: { poisonImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  militaryWorkshopProjectileUpgradeWarlord: {
    desc: 'Military Workshop (Warlord): a small physical (missile) projectile upgrades to heavy (boulder), bypassing Missile Immunity. Missile 10 vs a Missile-Immune defender → without the grant, def raised to 100 → all blocked → 0. With the grant the boulder ignores Missile Immunity → def 0 → 10 damage. Defender also Poison-Immune',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:20, abilities: { militaryWorkshop: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:20, abilities: { missileImmunity: true, poisonImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  militaryWorkshopMeleeOnlyExcludedWarlord: {
    desc: 'Military Workshop (Warlord): a melee-only unit is ineligible for Blackpowder. Melee 1 is fully blocked and no Poison is granted → 0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { militaryWorkshop: true } },
    b: { atk:0, def:1, toBlkMod:70, res:1, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Blackpowder upgrade does not reach a melee-only unit, so the only feature the fixture adds cannot move the number.',
      'a.ability.militaryWorkshop':
        'Keep, and the absence is the rule under test. Unlike the hero term beside it, this exclusion is the script\'s own: the Workshop block\'s inner gate is `(SRanged>0 %AND SRangedType<30) %OR SThrown>0 %OR SFireBreath>0` (CreateUnit.CAS!NOTGENERIC!+42..+44 "IF ( (GetStat(U,SRanged,1)>0) %AND (GetStat(U,SRangedType,1)<30) )" "%OR (GetStat(U,SFireBreath,1)>0)"), so a unit with none of the three reaches neither the `SBlackpowderUpgrade` write at CreateUnit.CAS!NOTGENERIC!+46 "SETSTAT(U,SBlackpowderUpgrade,1,1);" nor the `AFPoison` increment at CreateUnit.CAS!NOTGENERIC!+47 "IF (GetStat(U,AFPoison,1,1)<>100) THEN {". The calculator carries it as `blackpowderEligibleAttack` (stats.js:1175-1176), a term of `blackpowder` (stats.js:1183-1184); A states no `modernAttacks` at all, so no channel is marked and `training:militaryWorkshop`\'s `when` is false (stats_sequence.js:157). The poison half is asserted too: the defender is deliberately left at res 1 with no Poison Immunity, where an erroneous +1 Poison grant would score a full 1.0 (poisonFailProb, combat_special_attacks.js:19) instead of this 0. militaryWorkshopArmorPiercingWarlord is the eligible arm at 6.000, but it is not a numeric contrast to this fixture: it swaps the melee attack for a boulder and gives b def 8 and Poison Immunity.',
    },
  },
  militaryWorkshopHeroExcludedWarlord: {
    desc: 'Military Workshop (Warlord): a hero is excluded — no Armor Piercing and no +1 Poison. Boulder 10 (100% hit) vs def 8 (100% block) → 10−8 = 2 (a normal unit would deal 6 plus poison). No Poison Immunity on the defender, so an erroneous poison grant would also surface',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, unitType:'hero', hp:20, abilities: { militaryWorkshop: true } },
    b: { atk:0, def:8, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.ability.militaryWorkshop':
        'Keep, and the absence is the rule under test: `baseNormalTrainingUnit` is `!isHero && !isFantasticBase` (stats.js:320) and it is a term of `blackpowder` (stats.js:1183-1184), so on a hero no channel is marked, `training:militaryWorkshop`\'s `when` is false (stats_sequence.js:157), and neither the Armor Piercing grant nor the `<>100` poison increment lands. That hero term is the calculator\'s own, stated at stats.js:299-305 from the changelog\'s "base normal units" wording (`Reference docs/Warlord manual v1.5.12.9.html`). The script makes no hero test: CreateUnit.CAS contains no `ISHERO` anywhere, checked case-insensitively over the whole file. Its Workshop block gates only on the city or Rocketry (CreateUnit.CAS!NOTGENERIC!+38..+40 "IF (ISBUILT(C,BMilitaryWorkshop)=0)" "THEN { GOTO") and then on the attack-presence test at CreateUnit.CAS!NOTGENERIC!+42..+44 "IF ( (GetStat(U,SRanged,1)>0) %AND (GetStat(U,SRangedType,1)<30) )" "%OR (GetStat(U,SFireBreath,1)>0)", and carries no unit-race term either - a block-level negative, since the file does test the unit\'s own `SRace` at CreateUnit.CAS!NOLOGISTIC!+50 "IF (GETSTAT(U,SRace,1)<>RCGeneric) %OR (GETSTAT(U,STypeID,1)=44) THEN { GOTO", in the generic-to-racial conversion. a.unitType=hero is the live half. The defender deliberately carries no Poison Immunity, so an erroneous poison grant would surface in the total rather than be absorbed. militaryWorkshopArmorPiercingWarlord is the normal-unit arm at 6.000 against this 2.000; it is not a one-value sibling, since it also gives b Poison Immunity.',
    },
  },

  // --- Venom (Warlord enchantment) ---
  venomGrantsPoisonWarlord: {
    desc: 'Venom (Warlord): a unit with no poison gains Poison 1. Melee 1 (100% hit) vs def 1 (100% block) → 0 physical, but Poison 1 lands (res 1, CoM2 fail = (11−1)/10 = 1.0) → 1.0 poison damage (without the grant, no poison → 0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { venom: true } },
    b: { atk:0, def:1, toBlkMod:70, res:1, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  venomBoostsExistingPoisonWarlord: {
    desc: 'Venom (Warlord): +1 Poison boosts an existing attack. Poison 2 → 3 vs res 5 (CoM2 fail = (11−5)/10 = 0.6) → 3 × 0.6 = 1.8 poison. Melee 1 vs def 1 (100% block) → 0 physical (without the grant, Poison 2 → 1.2)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { venom: true, poison: 2 } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.800 },
  },
  venomGrantsPoisonImmunityWarlord: {
    desc: 'Venom (Warlord): grants Poison Immunity. A Venom defender is immune → attacker Poison 4 negated → 0; melee 1 vs def 1 (100% block) → 0 (without immunity, Poison 4 vs res 5 → 4 × 0.6 = 2.4). '
        + 'The subject is that dmgToB stays 0; dmgToA is the Poison 1 Venom also grants the defender, riding its '
        + 'unconditional counterattack at melee 0 against Res 0 for 1.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 4 } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:10, abilities: { venom: true } },
    expected: { dmgToA: 1.000, dmgToB: 0.000 },
    vacuity: {
      'a.ability.poison':
        'Keep. Inert as a consequence of the assertion: `d:venom` writes `u.poisonImmunity = true` (stats_sequence.js:1491), and poisonFailProb returns 0 outright for an immune defender rather than modifying the roll (combat_special_attacks.js:15), so the attacker\'s poison strength has no roll left to size and any value of it reaches the same 0. b.ability.venom is the live half - ablating it removes the immunity and the poison lands. dmgToA is untouched by this ablation: the 1.000 is the Poison 1 the same step grants B (stats_sequence.js:1492), riding B\'s counterattack.',
    },
  },

  // --- Artificer ---
  artificerMechanicalMeleeWarlord: {
    desc: 'Artificer (Warlord): mechanical unit gets +1 melee. atk 1 → 2, 100% hit vs 0 def → 2 dmg',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { artificer: true, mechanical: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  artificerMechanicalRangedWarlord: {
    desc: 'Artificer (Warlord): mechanical unit gets +1 ranged. missile 1 → 2, 100% hit → 2 dmg',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { artificer: true, mechanical: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  artificerMechanicalDefenseWarlord: {
    desc: 'Artificer (Warlord): mechanical unit gets +1 armor. 5 atk vs 0 def + Artificer → 1 shield at 100% block → 4 dmg. B\'s counterattack is the F142 rule: CreateUnit.CAS!NOLOGISTIC!+10 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1));" gates its `SAttack` write on nothing, so B\'s permanent melee 0 becomes 1, and the retort\'s Magic Weapons grant puts it at 30+10 = 40% → 0.4',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { artificer: true, mechanical: true } },
    expected: { dmgToA: 0.400, dmgToB: 4.000 },
  },
  artificerMechanicalResistanceWarlord: {
    desc: 'Artificer (Warlord): mechanical unit gets +2 resistance — CreateUnit.CAS!NOLOGISTIC!+13 "SETSTAT(U,SResist,1,(GetStat(U,SResist,1)+2));", matching manual changelog 1.4.22 and the shipped helptext (Source discrepancies.md §6). Death Gaze vs res 5 → res 7 → pFail (10−7)/10 = 0.3 → 1 fig × 10 hp × 0.3 = 3 dmg (at +1 it would be res 6 → 4 dmg)',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, abilities: { artificer: true, mechanical: true } },
    // B's counterattack is the F142 rule (see artificerMechanicalDefenseWarlord): melee 1 at
    // 40% = 0.4, surviving the gaze 70% of the time → 0.28.
    expected: { dmgToA: 0.280, dmgToB: 3.000 },
  },
  artificerMagicWeaponBypassesWIWarlord: {
    desc: 'Artificer (Warlord): mechanical attacker gets Magic Weapons → bypasses defender Weapon Immunity. atk 5 (+1 Artificer = 6, +10% to-hit from magic) vs 0 def + WI → WI bypassed, 6 dmg',
    version: V_WARLORD,
    a: { atk:5, hitChance:60, hp:10, abilities: { artificer: true, mechanical: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  artificerNoBonusForNonMechanicalWarlord: {
    desc: 'Artificer (Warlord): non-mechanical unit gets no bonus. atk 1, 100% hit vs 0 def → 1 dmg (not 2)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { artificer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Artificer retort reaches no non-Mechanical unit, so the only feature the fixture adds cannot move the number.',
      'a.ability.artificer':
        'Keep, and the absence is the rule under test: `training:artificer` is gated on the Mechanical flag standing in the record at its own rank, `when: u => !!u.mechanical` (combat_abilities.js:1299), the calculator\'s reading of `GetStat(U,SCustomAttribute,1)=1` at CreateUnit.CAS!NOLOGISTIC!+8 "IF RETORT(W,Artificer) %AND (GetStat(U,SCustomAttribute,1)=1) THEN {". With no Mechanical the step never fires, so the `u.atk += 1; u.def += 1; u.res += 2;` at combat_abilities.js:1304 and the +1 ranged at :1305 all stay away. Its Magic Weapons half is the same step\'s first write, `if (u.weaponMaterial === \'normal\') u.weaponMaterial = \'magic\'`, so the closed gate withholds that too and the weapon stays normal, the attack keeping its base To Hit. artificerMechanicalMeleeWarlord differs only in a.abilities.mechanical and pins 2.000 against this 1.000.',
    },
  },
  artificerSkipsThrownAndBreathWarlord: {
    desc: 'Exclusion the engine makes: the Artificer retort names four stats and the four movement fields, and `SRanged` is the only attack among them (CreateUnit.CAS!NOLOGISTIC!+8..+17 "IF RETORT(W,Artificer) %AND (GetStat(U,SCustomAttribute,1)=1) THEN {" "SETSTAT(U,SCombatMovesLeft,1,(GetStat(U,SCombatMovesLeft,1)+2));"). Thrown 3 and Fire Breath 5 both stay put — 3 + 5 = 8.000 at 100% hit vs def 0. The +0.4 on top is the melee the retort does create (F142): `SAttack` at CreateUnit.CAS!NOLOGISTIC!+10 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1));" is ungated, so permanent melee 0 becomes 1, at 30+10 = 40% with the Magic Weapons grant. A grant reaching every channel, as this block made before F139, gives 4 + 6 + 0.4 = 10.400.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' } },
    hitRanged:70, hitThrown:70, hitBreath:70, hp:10,
    abilities: { artificer: true, mechanical: true } },
    b: { def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 8.400 },
  },
  artificerDoomGazeUnchangedWarlord: {
    desc: 'Exclusion the engine makes: `SDoomGaze` (MASTER.CAS~"SDoomGaze=57;") is an independent record field that the Artificer block never names, and the only script write to it is a zeroing in UnitCalc.CAS!IMMUNETOROT!+11 "SETSTAT(U,SDoomGaze,0,0);". Doom Gaze 5 still deals 5.000; the +0.4 beside it is the melee the retort does create (F142, CreateUnit.CAS!NOLOGISTIC!+10 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1));" ungated, 40% with Magic Weapons). The pre-F139 write gave 6.000 + 0.4.',
    version: V_WARLORD,
    a: { atk:0, hp:10, abilities: { artificer: true, mechanical: true, doomGaze: 5 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.400 },
  },

  // --- Mechanical Expert ---
  mechanicalExpertToHitWarlord: {
    desc: 'Mechanical Expert (Warlord): mechanical attacker gets +20% To Hit. 10 atk at 30%+20%=50% vs 0 def → 5 dmg (not 3)',
    version: V_WARLORD,
    a: { atk:10, hp:10, abilities: { mechanicalExpert: true, mechanical: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  mechanicalExpertToDefendWarlord: {
    desc: 'Mechanical Expert (Warlord): mechanical defender gets +10% To Defend. 10 hits vs 10 def at 30%+10%=40% block → 4 blocks → 6 dmg (not 7)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:20 },
    b: { def:10, hp:20, abilities: { mechanicalExpert: true, mechanical: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  mechanicalExpertNoBonusForNonMechanicalWarlord: {
    desc: 'Mechanical Expert (Warlord): non-mechanical unit gets no bonus. 10 atk at base 30% vs 0 def → 3 dmg (not 5)',
    version: V_WARLORD,
    a: { atk:10, hp:10, abilities: { mechanicalExpert: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Mechanical Expert reaches no non-Mechanical unit, so the only feature the fixture adds cannot move the number.',
      'a.ability.mechanicalExpert':
        'Keep, and the absence is the rule under test: `d:mechanicalExpert` is gated on the Mechanical flag in the record, `when: u => !!u.mechanical` (combat_abilities.js:1322), so with no Mechanical the `u.toHit += 20; u.toBlk += 10;` at :1323 never runs and the attack keeps the base 30% To Hit. mechanicalExpertToHitWarlord differs only in a.abilities.mechanical and pins 5.000 against this 3.000.',
    },
  },
  mechanicalExpertRebuildMakesMechanicalWarlord: {
    desc: 'Rebuild + Mechanical Expert (Warlord): Rebuild makes the unit mechanical, so +20% To Hit applies. atk 10 + Rebuild(+2) = 12 at 50% vs 0 def → 6 dmg',
    version: V_WARLORD,
    a: { atk:10, hp:10, abilities: { rebuild: true, mechanicalExpert: true } },
    b: { def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  mechanicalExpertRebuildHeroNoBonusWarlord: {
    desc: 'Rebuild + Mechanical Expert on a hero (Warlord): no To Hit bonus. Rebuild\'s two branches write different records — the non-hero branch writes the permanent Mechanical flag, `SETSTAT(TU,SCustomAttribute,1,1)` (OLSpell.CAS!NOTMARKOFCONQUEROR!+8 "SETSTAT(TU,SCustomAttribute,1,1);", inside `IF (ISHERO(TU)=0)` at OLSpell.CAS!NOTMARKOFCONQUEROR!+7 "IF (ISHERO(TU)=0) THEN {"), while the hero branch writes the calculated one, `SETSTAT(U,SCustomAttribute,0,1)` (UnitCalcPre.CAS!NOHEROAUGMENT!+5 "SETSTAT(U,SCustomAttribute,0,1);"). Mechanical Expert gates on the permanent record, `IF (GETSTAT(U,SCustomAttribute,1)<>1)` (UnitCalc.CAS!NOTGOBLINCOUNT!+3 "IF (GETSTAT(U,SCustomAttribute,1)<>1) THEN { GOTO"), and no script line reads selector 0 for value 1 at all, so the hero write reaches nothing. atk 10 + Rebuild(+2) = 12 at the base 30% vs 0 def → 3.6 dmg, against the 6.000 mechanicalExpertRebuildMakesMechanicalWarlord takes on the same package without the hero marker (F217.3).',
    version: V_WARLORD,
    a: { atk:10, hp:10, unitType:'hero', abilities: { rebuild: true, mechanicalExpert: true } },
    b: { def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.600 },
    vacuity: {
      'a.ability.mechanicalExpert':
        'Keep, and the absence is the rule under test: the claim is exactly that Mechanical Expert does not reach a Rebuilt hero. `d:mechanicalExpert` is gated on the permanent Mechanical flag standing in the record, `when: u => !!u.mechanical` (combat_abilities.js), and `b:rebuild`\'s hero branch writes no such flag, so the `u.toHit += 20; u.toBlk += 10;` never runs and the attack keeps the base 30% To Hit. a.unitType=hero and a.ability.rebuild are both live: rebuild supplies the +2 melee that makes the total 3.600 rather than 3, and dropping the hero marker is exactly mechanicalExpertRebuildMakesMechanicalWarlord, which pins 6.000 against this 3.600.',
    },
  },

  // --- Rebuild ---
  rebuildMeleeWarlord: {
    desc: 'Rebuild (Warlord): +2 melee. atk 1 → 3, 100% hit vs 0 def → 3 dmg',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { rebuild: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  rebuildArmorWarlord: {
    desc: 'Rebuild (Warlord): +2 armor. 5 atk vs 0 def + Rebuild → 2 shields at 100% block → 3 dmg. B\'s counterattack is the F142 rule: OLSpell.CAS!NOTMARKOFCONQUEROR!+9 "SETSTAT(TU,SAttack,1,GETSTAT(TU,SAttack,1)+2);" gates its `SAttack` write on nothing, so B\'s permanent melee 0 becomes 2, at the base 30% → 0.6',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { rebuild: true } },
    expected: { dmgToA: 0.600, dmgToB: 3.000 },
  },
  rebuildHeroCcDefenseLionheartWarlord: {
    desc: 'Rebuild (Warlord): the phase split is `ISHERO`, not unit type. A hero is re-applied at `b` (UnitCalcPre.CAS!NOHEROAUGMENT!+2..+10 ": Hero augmentation effect of Rebuild spell :" "SETSTAT(U,ADeathImmunity,0,1);", inside the hero region opened at UnitCalcPre.CAS!NOVAMPIRISM!+3 "IF ( ISHERO(U) = 0 ) THEN { GOTO"); a non-hero was written permanently when the spell landed (OLSpell.CAS!NOTMARKOFCONQUEROR!+9 "SETSTAT(TU,SAttack,1,GETSTAT(TU,SAttack,1)+2);"), which is the `buffs` phase. Only the permanent write reaches the permanent record Lionheart\'s melee gate reads, so a Chaos-Channelled hero with permanent melee 0 takes Rebuild\'s +2 alone → 2 dmg. While the phase was chosen off the live unit-type token the hero took the non-hero base write, and Lionheart then added 3 more, for 5 dmg (F187).',
    version: V_WARLORD,
    a: { atk:0, hitChance:70, hp:10, unitType: 'hero', abilities: { rebuild: true, ccDefense: true, lionheart: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.ability.lionheart':
        'Keep, and the absence is the rule under test: Lionheart is the probe the phase choice is read through, and its melee arm is `if (hasMeleeAttackAt(runCtx)) u.atk += 3` (stats_sequence.js:1044) over the permanent record - `runCtx.base.atk > 0` (stats.js:977), the record `a:baseCopy` publishes at the head of region `a` (stats_sequence.js, precalcBinaryStatSteps). Rebuild on a hero is a phase-`b` step (`isHeroUnit ? \'b\' : \'cast\'`, combat_abilities.js:1355), so its `u.atk += 2` (:1358) never reaches that record, the base melee stays 0 and the arm is closed. Its other writes cannot surface here either: nothing rolls against A\'s Resistance, A states no ranged or thrown channel, and B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103) so A\'s hit points are never scored against. Take the base branch instead, as the retired unit-type phase choice did, and the arm opens for +3 and the total goes from 2.000 to 5. a.ability.rebuild and a.unitType=hero are both live.',
      'a.ability.ccDefense':
        'Keep, and the absence is the rule under test: the claim is that the phase split reads hero-ness and not the live unit-type token, so Chaos Channels is expected to move nothing. Its two writes are the +3 Defense at combat_abilities.js:1072, which nothing scores against because B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103), and the conversion to a fantastic Chaos creature at stats_identity.js:350 - the token under test. The phase choice reads `isHeroUnit`, `!!identityPredicates.isHero` (combat_abilities.js:677, argued at :672-676), supplied once as `!!identity.isHero` (stats.js:1603) because no conversion writes that flag (stats.js:1600-1602). So the hero keeps the phase-`b` re-application whether or not it is Chaos-Channelled. a.ability.lionheart is the detector that would report a regression here.',
    },
  },
  rebuildArmorPiercingWarlord: {
    desc: 'Rebuild (Warlord): grants Armor Piercing. Missile rtb 2 100% hit vs def 3 100% block → AP halves def to 1 → 1 dmg (Rebuild +2 melee does not affect ranged attack)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { rebuild: true } },
    b: { def:3, toBlkMod:70, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  colossalStrengthMeleeWarlord: {
    desc: 'Colossal Strength (Warlord): +1 + 40% of base melee. Base atk 10 → +1+floor(0.4×10)=+5 → 15. 1 fig, 100% hit, def 2 fully blocks 2 → E[dmg] = 13 (without Colossal Strength, 10 − 2 = 8)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { colossalStrength: true } },
    b: { def:2, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 13 },
  },
  colossalStrengthPhysicalRangedWarlord: {
    desc: 'Colossal Strength (Warlord): physical ranged gains +1 + 40% of base. Base missile 10 → 15. 100% hit, def 2 blocks 2 → E[dmg] = 13 (without Colossal Strength, 10 − 2 = 8)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { colossalStrength: true } },
    b: { def:2, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 13 },
  },
  colossalStrengthThrownWarlord: {
    desc: 'Colossal Strength (Warlord): thrown gains +1 + 40% of base. Base thrown 10 → 15. 100% hit, def 2 blocks 2 → E[dmg] = 13 (without Colossal Strength, 10 − 2 = 8)',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { thrown: { strength:10, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { colossalStrength: true } },
    b: { def:2, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 13 },
  },
  colossalStrengthMagicRangedNoBonusWarlord: {
    desc: 'Colossal Strength (Warlord): magic ranged is not physical ranged, so it gets no bonus. Base magic 10, 100% hit, def 2 blocks 2 → E[dmg] = 8 (unchanged by Colossal Strength)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { colossalStrength: true } },
    b: { def:2, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Colossal Strength does not reach a magical ranged attack, so the only feature the fixture adds cannot move the number.',
      'a.ability.colossalStrength':
        'Keep, and the absence is the rule under test: the block\'s secondary arm admits physical channels only - `physicalSecondary` is missile, boulder or thrown (stats_sequence.js:1583-1584), the calculator\'s reading of the script\'s own `SRangedType>0 %AND <30` gate at UnitCalc.CAS!NOCOMBAT!+12 "IF (GetStat(U,SRangedType,0)>0) %AND (GetStat(U,SRangedType,0)<30) THEN {" and the `SThrown>0` gate at UnitCalc.CAS!NOCOMBAT!+16 "IF (GetStat(U,SThrown,0)>0) THEN {" - so a `magic` ranged type fails it and the `u[c.strengthField] += colossalScaled(...)` at stats_sequence.js:1586 never runs. The melee line above it is ungated (stats_sequence.js:1581, from `SETSTAT(U,SAttack,0,…+CSM)` at UnitCalc.CAS!NOCOMBAT!+10 "SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+CSM));") and does raise A\'s melee from 0 to 1, but one point of melee cannot pass the defender\'s 2 Defense at full block, so it reaches no total either. colossalStrengthPhysicalRangedWarlord differs only in the ranged `type` - `missile` against this `magic` - and pins 13 against this 8.',
    },
  },
  colossalStrengthScalesBuffedMeleeWarlord: {
    desc: 'Colossal Strength (Warlord) scales CURRENT melee, not base (UnitCalc.CAS!NOCOMBAT!+4..+20 ", +40% melee and non-magic range attack :" "!NOCOLOSSALSTRENGTH!" reads GetStat(U,SAttack,0) in phase d). Base atk 10 + Lionheart +3 = 13 → +1+floor(0.4×13)=+6 → 19. 100% hit, def 2 blocks 2 → E[dmg] = 17 (if it scaled base instead: 10+3+5 = 18 → 16)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { colossalStrength: true, lionheart: true } },
    b: { def:2, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 17 },
  },
  colossalStrengthScalesAfterRustWarlord: {
    desc: 'Colossal Strength (Warlord) is applied after Rust within phase d — Rust is UnitCalc.CAS!NOTCITY!+10..+22 "unit loses 1/2 of melee/physical range/thrown strength :" "!NOTRUST!", Colossal UnitCalc.CAS!NOCOMBAT!+4 ", +40% melee and non-magic range attack :", so Colossal scales the already-reduced melee. Base atk 10 − 3 = 7 → +1+floor(0.4×7)=+3 → 10. 100% hit, def 2 blocks 2 → E[dmg] = 8 (if Colossal scaled base instead: 10−3+5 = 12 → 10)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { colossalStrength: true, rust: true } },
    b: { def:2, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 8 },
  },
  colossalStrengthScalesBuffedRangedWarlord: {
    desc: 'Colossal Strength (Warlord) scales current physical ranged, not base. Base missile 10 + Lionheart +3 (non-magic ranged) = 13 → +1+floor(0.4×13)=+6 → 19. 100% hit, def 2 blocks 2 → E[dmg] = 17 (if it scaled base instead: 10+3+5 = 18 → 16)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { colossalStrength: true, lionheart: true } },
    b: { def:2, toBlkMod:70, hp:30 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 17 },
  },
  rustMeleePenaltyWarlord: {
    desc: 'Rust (Warlord): −3 melee attack. Base atk 10 → 7, 1 fig, 100% hit, def 0 → E[dmg] = 7 (without Rust, 10)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { rust: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 7 },
  },
  rustPhysicalRangedPenaltyWarlord: {
    desc: 'Rust (Warlord): −3 to physical ranged (missile). Missile 10 → 7, 100% hit, def 0 → E[dmg] = 7 (without Rust, 10)',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { ranged: { strength:10, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { rust: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7 },
  },
  rustBoulderRangedPenaltyWarlord: {
    desc: 'Rust (Warlord): −3 to physical ranged (boulder). Boulder 10 → 7, 100% hit, def 0 → E[dmg] = 7 (without Rust, 10)',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { ranged: { strength:10, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { rust: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7 },
  },
  rustStripsMagicWeaponWarlord: {
    desc: 'Rust (Warlord): strips magic weapon → reverts to regular, so Weapon Immunity is no longer bypassed. Magic atk 10 vs WI (def 0→10), with Rust melee 10−3=7 fully blocked → E[dmg] = 0 (without Rust, magic bypasses WI → 10)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, weapon: 'magic', abilities: { rust: true } },
    b: { def:0, toBlkMod:70, hp:20, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.weapon=magic':
        'Keep, and the absence is the rule under test: the material the calculation uses is the record\'s `weaponMaterial`, which `debuffs:rust:material` clears to \'normal\' whenever Rust has landed (stats_sequence.js), so with Rust standing the magic weapon is already gone and stating it on the card or not reaches the same material - which is what the fixture asserts. Ablating it assigns `weapon: \'normal\'` (tools/preset_vacuity_sweep.js:203, written at :300), exactly what the strip leaves. a.ability.rust is the live half: ablating it lets `magic` stand, and with it the Weapon Immunity bypass, so the number moves off 0.',
    },
  },
  rustEliminatesThrownWarlord: {
    desc: 'Rust (Warlord): thrown attack eliminated. Thrown 10 (no melee), 100% hit, def 0 → with Rust no thrown phase → E[dmg] = 0 (without Rust, thrown lands → 10)',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { thrown: { strength:10, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { rust: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  rustEliminatesLargeShieldWarlord: {
    desc: 'Rust (Warlord): Large Shield eliminated on the cursed defender. Missile 10 vs def 0; Large Shield would add +3 vs ranged → with Rust shield gone, def 0 → E[dmg] = 10 (without Rust, def 3 → 7)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20, abilities: { rust: true, largeShield: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 10 },
    vacuity: {
      'b.ability.largeShield':
        'Keep, and the absence is the rule under test: `d:rust` clears the flag with `u.largeShield = false` (stats.js:1622), the calculator\'s reading of `SETSTAT(U,ALargeShield,0,0)` at UnitCalc.CAS!NOTCITY!+16 "SETSTAT(U,ALargeShield,0,0);". The ranged Defense bonus is read from the calculated abilities at combat_effects.js:436, which by then sees no Large Shield, so the `u.effectiveDefense += 3` at :435 never fires and stating the ability or not reaches the same Defense. b.ability.rust is the live half. The clear is positioned rather than final, which is a separate claim held elsewhere: fortificationRestoresRustedLargeShieldWarlord (presets_immunities_and_abilities.js) is the fixture where a later block reads what the clear left and grants Large Shield back.',
    },
  },
  rustFantasticUnaffectedWarlord: {
    desc: 'Rust targets a regular (non-fantastic) unit, so a fantastic creature is unaffected: no −3 melee. Fantastic atk 10 → stays 10, 1 fig, 100% hit, def 0 → 10 (if wrongly applied, 7).',
    version: V_WARLORD,
    a: { unitType:'fantastic_chaos', atk:10, hitChance:70, hp:10, abilities: { rust: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10 },
    vacuity: {
      'a.ability.rust':
        'Keep, and the absence is the rule under test: `rustActive` carries `!finishedIdentity.fantastic` (stats.js:246-247), so on a fantastic creature the curse is inactive and every half of it closes at once - the -3 melee (combat_abilities.js:1107, from `SETSTAT(U,SAttack,0,…-3)` at UnitCalc.CAS!NOTCITY!+13 "SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)-3));"), the weapon strip (stats.js:276), the Large Shield clear (stats.js:1622) and the Thrown clear (stats.js:1628-1632). The exclusion is a targeting restriction read at the finished record rather than at the step\'s own rank, which stats.js:227-245 states and the script supports: its Rust block is gated on `GETENCHANTMENTFLAG(U,EncRust,0)` alone (UnitCalc.CAS!NOTCITY!+11 "IF (GETENCHANTMENTFLAG(U,EncRust,0)=0) THEN { GOTO") and makes no Fantastic test of either record. a.unitType=fantastic_chaos is the live half. rustMeleePenaltyWarlord is this fixture without that field and pins 7 against this 10; ablation assigns `unitType: \'normal\'` (tools/preset_vacuity_sweep.js:204, written at :300), which semantically matches it rather than reproducing it, since that fixture omits the field and setUnit merges an omitted `unitType` to the same \'normal\' (UNIT_DEFAULTS, data.js:110, spread at ui_state.js:362). rustAppliesToSpiritLinkedFantasticWarlord adds only `spiritLink` to a.abilities and reaches 7 by clearing the Fantastic flag that targeting read sees.',
    },
  },
  rustAppliesToSpiritLinkedFantasticWarlord: {
    desc: 'Rust’s "regular unit" exclusion is a targeting restriction, and targeting reads the record the recalculation leaves: Spirit Link clears Fantastic at the tail of UnitCalc.CAS (UnitCalc.CAS!NOTICEAGE!+2..+3 ": Effect of Sentience, enchanted fantastic unit could not be targeted by fantastic-only spell and gain +2 resistance :" "IF GETENCHANTMENTFLAG(U,EncSpiritLink,1) THEN { SETSTAT(U,AFantastic,0,0); }") precisely so the unit "could not be targeted by fantastic-only spell", so a spirit-linked Chaos creature is a legal Rust target and takes the −3. Base atk 10 → 7, 100% hit, def 0 → 7 (without Rust, 10; reading the record at `d:rust` instead — chain #129, ahead of `d:spiritLink` #135 — would see Fantastic and give 10).',
    version: V_WARLORD,
    a: { unitType:'fantastic_chaos', atk:10, hitChance:70, hp:10, abilities: { rust: true, spiritLink: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 7 },
  },
  divineProtectionLuckyToHitWarlord: {
    desc: 'Divine Protection (Warlord): grants Lucky. 1 atk, base 30% + Lucky +10% = 40% hit vs 0 def → E[dmg] = 0.4 (without Divine Protection, 30% → 0.3)',
    version: V_WARLORD,
    a: { atk:1, hp:10, abilities: { divineProtection: true } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.4 },
  },
  divineProtectionLuckyResistanceWarlord: {
    desc: 'Divine Protection (Warlord): grants Lucky +1 Resistance. Poison 6 vs base res 5 + Lucky +1 = res 6, CoM −1 poison penalty → effective 5, pFail 50%, E[dmg] = 3.0 (without grant, res 5 −1 = 4 → pFail 60% → 3.6)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 6 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { divineProtection: true } },
    expected: { dmgToA: 0, dmgToB: 3.0 },
  },
  divineProtectionDeathImmunityWarlord: {
    desc: 'Divine Protection (Warlord): grants Death Immunity. Death Gaze vs res 5 + Death Immunity → fully blocked, 0 dmg (without grant, res 5 → P(die) 0.3 × 10 HP = 3.0)',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, abilities: { divineProtection: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  luckyStarAuraMeleeWarlord: {
    desc: 'Lucky Star aura (Warlord): +1 melee to a friendly unit that is not itself enchanted, and no Lucky. (1+1) atk at base 30% To-Hit vs def 0 → E[dmg] = 0.6 (without the aura, 0.3; if it also granted Lucky, 0.8)',
    version: V_WARLORD,
    a: { atk:1, hp:10, abilities: { luckyStar: true } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.6 },
  },
  luckyStarCreatesMeleeWarlord: {
    desc: 'F142: a script melee write carries no presence gate, so it creates the attack. `SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+1))` (UnitCalcPre.CAS!NOTGUARDIAN!+5 "SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+1));") is reached on `LUCKYSTAR<>0` and no other test, and the recompute\'s melee tail is a floor, not a zeroing (Units.RecalculateUnits.pas:2483). Permanent melee 0 → 1 at base 30% vs def 0 → E[dmg] = 0.3. Under the retired dead-slot rule the bonus was discarded and this was 0.000.',
    version: V_WARLORD,
    a: { atk:0, hp:10, abilities: { luckyStar: true } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.300 },
  },
  luckyStarCreatedMeleeSkipsCompiledAuraWarlord: {
    desc: 'F142, the other half: melee a script write created does not open the compiled blocks, because their gate reads the permanent record and the script wrote the calculated one. Holy Bonus 3 is `if B.attack > 0` (Units.RecalculateUnits.pas:2530) and `B.attack` is still 0, so it adds nothing to melee — 1 atk at 30% → 0.300. Implementing the ungated script write by widening the melee predicate instead, the shape F142 removed from True Light and Marionette, would open every compiled block in the same run and give 1+3 = 4 atk → 1.200. Holy Bonus still reaches Resistance (5+1+3 = 9) and Defense (0+1+3 = 4), which carry no such gate.',
    version: V_WARLORD,
    a: { atk:0, hp:10, abilities: { luckyStar: true, holyBonus: 3 } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.300 },
  },
  luckyStarEnchantedUnitWarlord: {
    desc: 'Lucky Star (Warlord) on its enchanted unit: the aura plus the Lucky grant, which is the separate Lucky control. (1+1) atk at base 30% + Lucky 10% To-Hit vs def 0 → E[dmg] = 0.8',
    version: V_WARLORD,
    a: { atk:1, hp:10, abilities: { luckyStar: true, lucky: true } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.8 },
  },
  luckyStarAuraResistanceWarlord: {
    desc: 'Lucky Star aura (Warlord): +1 Resistance without Lucky. Poison 6 vs base res 5+1 = 6, CoM −1 poison penalty → effective 5, pFail 50%, E[dmg] = 3.0 (with Lucky as well it would be res 7 → 2.4)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 6 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { luckyStar: true } },
    // B's counterattack is the F142 rule: the aura's `SAttack` write (UnitCalcPre.CAS!NOTGUARDIAN!+5 "SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+1));") is
    // ungated, so B's permanent melee 0 becomes 1, at the base 30% → 0.3.
    expected: { dmgToA: 0.300, dmgToB: 3.0 },
  },
  luckyStarAuraArmorWarlord: {
    desc: 'Lucky Star aura (Warlord): defender gains +1 Armor. 3 atk at 100% hit vs base def 1+1 at 100% block → 1 dmg (without the aura bonus, 2). B\'s 0.3 counterattack is the F142 rule: the aura\'s `SAttack` write (UnitCalcPre.CAS!NOTGUARDIAN!+5 "SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+1));") is ungated, so B\'s stated melee 0 becomes 1, at the base 30%',
    version: V_WARLORD,
    a: { atk:3, hitChance:70, hp:10 },
    b: { atk:0, def:1, toBlkMod:70, hp:10, abilities: { luckyStar: true } },
    expected: { dmgToA: 0.300, dmgToB: 1.0 },
  },
  luckyStarAuraRangedWarlord: {
    desc: 'Lucky Star aura (Warlord): the block\'s one attack-channel write is `SETSTAT(U,SRanged,0,…+1)` (UnitCalcPre.CAS!NOTGUARDIAN!+7 "SETSTAT(U,SRanged,0,(GetStat(U,SRanged,0)+1));"), the conventional-ranged field. missile 2 → 3 at 100% hit vs def 0 → 3.000; without the enchantment, 2.000.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { luckyStar: true } },
    b: { def:0, hp:30 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  luckyStarAuraSkipsThrownAndBreathWarlord: {
    desc: 'Exclusion the engine makes: the Lucky Star aura writes `SAttack`, `SRanged`, `SDefense`, `SResist` and their four bonus mirrors and nothing else (UnitCalcPre.CAS!NOTGUARDIAN!+5..+12 "SETSTAT(U,SAttack,0,(GetStat(U,SAttack,0)+1));" "SETSTAT(U,SResistBuff,0,(GetStat(U,SResistBuff,0)+1));"), so Thrown 3 and Fire Breath 5 both stay put — 3 + 5 = 8.000 at 100% hit vs def 0. The +0.3 on top is the `SAttack` write itself, which is ungated (F142): melee 0 becomes 1 at the base 30%. A grant reaching every channel, as this block made before F139, gives 4 + 6 + 0.3 = 10.300.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' } },
    hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { luckyStar: true } },
    b: { def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 8.300 },
  },
  luckyStarDoomGazeUnchangedWarlord: {
    desc: 'Exclusion the engine makes: `SDoomGaze` (MASTER.CAS~"SDoomGaze=57;") is an independent record field that the Lucky Star block never names, and the only script write to it is a zeroing in UnitCalc.CAS!IMMUNETOROT!+11 "SETSTAT(U,SDoomGaze,0,0);". Doom Gaze 5 still deals 5.000; the +0.3 beside it is the block\'s ungated `SAttack` write (F142), melee 0 becoming 1 at the base 30%. The pre-F139 write gave 6.000 + 0.3.',
    version: V_WARLORD,
    a: { atk:0, hp:10, abilities: { luckyStar: true, doomGaze: 5 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.300 },
  },
  rallyResistanceWarlord: {
    desc: 'Rally (Warlord): grants +2 Resistance. Poison 7 vs base res 5 + Rally +2 = res 7, CoM −1 poison penalty → effective 6, pFail 40%, E[dmg] = 2.8 (without Rally, res 5 −1 = 4 → pFail 60% → 4.2)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 7 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { rally: true } },
    expected: { dmgToA: 0, dmgToB: 2.8 },
  },
  disheartenProphecyResistanceWarlord: {
    desc: 'Dishearten Prophesy (Warlord): garrison suffers −2 Resistance. Poison 7 vs base res 7 − Dishearten 2 = res 5, CoM −1 poison penalty → effective 4, pFail 60%, E[dmg] = 4.2 (without Dishearten, res 7 −1 = 6 → pFail 40% → 2.8)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 7 } },
    b: { def:1, toBlkMod:70, res:7, hp:10, abilities: { disheartenProphecy: true } },
    expected: { dmgToA: 0, dmgToB: 4.2 },
  },
  insulationFireImmunityWarlord: {
    desc: 'Insulation (Warlord): grants Fire Immunity. Fire Breath 5 (100% hit) vs Insulation def → blocked (FI def 50); melee 5 (100% hit) vs def 2 → 3 dmg (without Insulation, breath 5 vs def 2 = 3 + melee 3 = 6)',
    version: V_WARLORD,
    a: { atk:5, modernAttacks: { fireBreath: { strength:5, type:'fire' } }, hitChance:70, hp:10 },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { insulation: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  insulationLightningResistWarlord: {
    desc: 'Insulation (Warlord): grants Lightning Resist, cancelling Lightning Breath AP. Breath 2 (100% hit) vs def 2 (100% block) → AP cancelled, 2−2 = 0 (without Insulation, lightning is AP → def 2 halved to 1, 2−1 = 1)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { lightningBreath: { strength:2, type:'lightning' } }, hp:10 },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { insulation: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  insulationEnablesInnerPowerWarlord: {
    desc: 'Insulation (Warlord) makes a unit Inner Power eligible. Inner Power\'s own test is `(U.Fireimmunity or U.lightningresist)` on the **calculated** record at $005A1957 — "current Fire Immunity or Lightning Resistance", its decode note — and `b:insulation` (`UnitCalcPre.CAS!NOFIERYFURY!+4..+8 "IF (GetEnchantmentFlag(U,EncInsulation,0)>0) %AND (GETITEMPOWER(U,37)=0) THEN {" "}"`) writes both flags in the earlier region, so `c:innerPower` sees them and grants +3 melee: atk 1 becomes 4 → 4 dmg. Without Insulation the unit is ineligible and deals 1 (F200).',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { innerPower: true, insulation: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  rebuildDeathImmunityWarlord: {
    desc: 'Rebuild (Warlord): grants Death Immunity. Death Gaze vs res 5 + Death Immunity → fully blocked, 0 dmg. B\'s 0.6 counterattack is the F142 rule (see rebuildArmorWarlord): permanent melee 0 becomes 2 at 30%',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, abilities: { rebuild: true } },
    expected: { dmgToA: 0.600, dmgToB: 0 },
  },
  rebuildIllusionImmunityWarlord: {
    desc: 'Rebuild (Warlord): grants Illusion Immunity. Illusion attack vs def 6 + Rebuild → def stays 6 (not 0), 0 dmg. B\'s 0.6 counterattack is the F142 rule (see rebuildArmorWarlord): permanent melee 0 becomes 2 at 30%',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { illusion: true } },
    b: { def:6, toBlkMod:70, hp:10, abilities: { rebuild: true } },
    expected: { dmgToA: 0.600, dmgToB: 0 },
    vacuity: {
      'a.ability.illusion':
        'Keep, and the absence is the rule under test: the illusion write is `u.effectiveDefense = 0` (combat_effects.js:431), gated on `ctx.illusion && !hasAbil(u.abilities, \'illusionImmunity\')` (:432), and applyRebuildEffects hands the defender `illusionImmunity: true` (combat_effects.js:120). With the immunity standing the gate is closed, so the attack is scored against the defender\'s full Defense exactly as an ordinary one would be and removing it from the fixture changes nothing. b.ability.rebuild is the live half, and it moves both numbers: the immunity goes with it and the Defense collapses to 0, while B also loses the ungated `u.atk += 2` (combat_abilities.js:1359) that its 0.600 counterattack is made of.',
    },
  },
  rebuildMechanicalTooLateForArtificerWarlord: {
    desc: 'Exclusion the engine makes, by rank: Rebuild writes Mechanical (`SCustomAttribute` 1) permanently at OLSpell.CAS!NOTMARKOFCONQUEROR!+8 "SETSTAT(TU,SCustomAttribute,1,1);" when the spell is cast, but the Artificer retort reads that same permanent flag at CreateUnit.CAS!NOLOGISTIC!+8 "IF RETORT(W,Artificer) %AND (GetStat(U,SCustomAttribute,1)=1) THEN {", which runs once when the city builds the unit — and Rebuild is cast on a unit that already exists, so the retort never sees it. atk 1 + Rebuild(+2) = 3, 100% hit vs 0 def → 3 dmg; the retort\'s +1 melee and its Magic Weapons grant both stay away (they would give 4). Later readers do see the write: `mechanicalExpertRebuildMakesMechanicalWarlord` is the same unit taking Mechanical Expert\'s +20% To Hit from region d. The engine displays the retort\'s ability lines on a Rebuilt unit anyway — DisAbil.CAS!NOLOGISTIC!+3 "IF RETORT(W,Artificer) %AND (GetStat(U,SCustomAttribute,1)=1) THEN {" and DisAbil.CAS!NOLOGISTIC!+9 "%OR ( (RETORT(W,Artificer)) %AND (GetStat(U,SCustomAttribute,1)=1) )" recompute them from the base record every draw — which is display and AI only.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { rebuild: true, artificer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.artificer':
        'Keep, and the absence is the rule under test - the claim is exactly that the retort cannot see the flag Rebuild writes. `training:artificer` reads the record at its own rank (`when: u => !!u.mechanical`, combat_abilities.js:1299), from `GetStat(U,SCustomAttribute,1)=1` at CreateUnit.CAS!NOLOGISTIC!+8 "IF RETORT(W,Artificer) %AND (GetStat(U,SCustomAttribute,1)=1) THEN {", and the chain places `training:artificer` among the training-time writes (stats_manifests.js:243) while `buffs:rebuild`, whose apply sets `u.mechanical = true` (combat_abilities.js:1359), is cast-time and strictly later (stats_manifests.js:254). The gate therefore reads false and the retort\'s `u.atk += 1; u.def += 1; u.res += 2;` (:1305) and +1 ranged (:1306) all stay away. Its Magic Weapons half is the same step\'s first write, so it is withheld by that same gate and not by a second one. a.ability.rebuild is the live half. mechanicalExpertRebuildMakesMechanicalWarlord is the later reader that does see the write, four regions on.',
    },
  },
});
