// Numeric presets. The predefined-unit matchups, the fire effects (Immolation, Wall of Fire,
// Warp Reality), Bless and the elemental protections, and the prayers.
definePresets({
  // --- Predefined-unit Tests ---
  predefBarbSwordsVsSpears: {
    desc: 'Barbarian Swordsmen vs Barbarian Spearmen: basic normal-vs-normal melee',
    aUnitName: 'Barbarian Swordsmen',
    bUnitName: 'Barbarian Spearmen',
    expected: { dmgToA: 1.046, dmgToB: 3.760 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. A roster-integration fixture: everything under test comes through aUnitName and bUnitName, which candidates() does not reach. Both records are asserted, so it is red if either roster entry drifts.',
    },
  },
  predefLongbowmenVsOrcSpears: {
    desc: 'Longbowmen vs Orc Spearmen: ranged missile matchup at range 1',
    aUnitName: 'Longbowmen',
    bUnitName: 'Orc Spearmen',
    rangedCheck: true,
    rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.929 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. A roster-integration fixture on the ranged path: everything under test comes through aUnitName and bUnitName, which candidates() does not reach.',
    },
  },
  predefWarBearsVsDwarvenHalberdiers: {
    desc: 'War Bears vs Dwarven Halberdiers: Nature fantastic vs tough normal infantry',
    aUnitName: 'War Bears',
    bUnitName: 'Dwarven Halberdiers',
    expected: { dmgToA: 3.740, dmgToB: 2.606 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. A roster-integration fixture pairing a Nature fantastic record against tough normal infantry; everything under test comes through aUnitName and bUnitName, which candidates() does not reach.',
    },
  },
  predefGreatDrakeVsHydra: {
    desc: 'Great Drake vs Hydra: fantastic vs fantastic, breath and multi-attack',
    aUnitName: 'Great Drake',
    bUnitName: 'Hydra',
    expected: { dmgToA: 3.726, dmgToB: 31.170 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. A roster-integration fixture on the fantastic-versus-fantastic path, breath and multi-attack included; everything under test comes through aUnitName and bUnitName, which candidates() does not reach.',
    },
  },
  predefDeathKnightsVsPaladins: {
    desc: 'Death Knights vs Ultra Elite Paladins: Death fantastic (life steal) vs strong normal unit',
    aUnitName: 'Death Knights',
    bUnitName: 'Paladins',
    b: { level: 'ultra_elite', weapon: 'adamantium' },
    expected: { dmgToA: 7.649, dmgToB: 14.842 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A tokenisation artefact - containsRun looks for \'weapon adamantium\' and \'level ultra elite\' and the key names the two units. Both are live, at delta 5.499 and 6.058, and the rest of the fixture comes through aUnitName and bUnitName.',
    },
  },
  predefChaosSpawnVsUnicorns: {
    desc: 'Chaos Spawn vs Unicorns (MoM 1.60): multi-gaze + poison vs resistance-to-all, poison immunity',
    version: V_MOM_CP,
    aUnitName: 'Chaos Spawn',
    bUnitName: 'Unicorns',
    // F45: the Unicorns' Resistance to All never matched its def, so this preset was scored
    // with 0 instead of +2 despite naming the ability. At resistance 9 rather than 7, against
    // the gaze's −4, the destroyed share falls from 68.6% to 31.6% and the surviving figures
    // retaliate. Unticking the Res. to all consumer still reproduces the old 0.260 / 23.129.
    expected: { dmgToA: 0.929, dmgToB: 20.805 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. A roster-integration fixture and F45\'s regression: everything under test comes through aUnitName and bUnitName, which candidates() does not reach. The comment in the fixture records the number the defect produced - unticking the Resistance to All consumer still reproduces 0.260 / 23.129.',
    },
  },

  // F47: roster-wiring coverage. These assert that the roster's Illusion token reaches the
  // ability, which F46 showed nothing else tested — the mechanic itself already worked, so a
  // custom-stat preset would pass with the token broken. Only dmgToB is asserted: Illusion
  // zeroes the defender's defense, so every landed hit lands in full and the mean is exactly
  // figures x melee x to-hit, independent of the defender's stats. Retaliation is not part of
  // the mechanic and is deliberately left unasserted.
  predefPhantomWarriorsVsPaladins: {
    desc: 'Phantom Warriors vs Paladins (MoM 1.31): roster Illusion zeroes defense → 6 figs x 3 melee x 30% = 5.400 (1.129 if the roster token fails to match)',
    aUnitName: 'Phantom Warriors',
    bUnitName: 'Paladins',
    expected: { dmgToB: 5.400 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. F47\'s roster-wiring coverage: the claim is that the roster\'s Illusion token reaches the ability, which nothing else tested because a custom-stat preset passes with the token broken. The discriminator is aUnitName, which candidates() does not reach; a failed match gives 1.129 against this 5.400.',
    },
  },
  predefPhantomWarriorsVsGreatDrakeCoM: {
    desc: 'Phantom Warriors vs Great Drake (CoM): roster Illusion zeroes defense 11 → 7 figs x 3 melee x 30% = 6.300 (0.321 if the roster token fails to match)',
    version: V_COM,
    aUnitName: 'Phantom Warriors',
    bUnitName: 'Great Drake',
    expected: { dmgToB: 6.300 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The CoM 1 arm of F47\'s roster-wiring coverage; the discriminator is aUnitName together with the version, neither of which candidates() reaches. A failed token match gives 0.321 against this 6.300.',
    },
  },

  // --- Immolation ---
  immolationMelee: {
    desc: 'Immolation melee: 1atk 100% hit + immolation(4) 30% hit vs 1fig 0def 10HP → 1 + 1.2 = 2.2',
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:10 },
    expected: { dmgToB: 2.200 },
  },
  immolationMoMStrength: {
    desc: 'Immolation Strength (MoM 1.31): strength 4 — 1atk 100% + imm(4)@30% vs 0def 20HP → 1 + 1.2 = 2.2',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:20 },
    expected: { dmgToB: 2.200 },
  },
  immolationAreaMultiFig: {
    desc: 'Immolation area vs 4fig 1HP 0def: imm(4)@30% per fig capped at 1HP each + melee 1',
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { figs:4, def:0, hp:1 },
    expected: { dmgToB: 3.706 },
  },
  immolationNoOverflow: {
    desc: 'Immolation no overflow: vs 2fig 2HP 0def, imm(4)@30% per fig capped at 2HP + melee 1',
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { figs:2, def:0, hp:2 },
    expected: { dmgToB: 3.095 },
  },
  immolationMagicImmunity: {
    desc: 'Immolation blocked by Magic Immunity: melee 1 only, immolation does 0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToB: 1.000 },
    vacuity: {
      'a.ability.immolation':
        'Keep. Inert as a consequence of the assertion: Magic Immunity blocks the immolation outright, so its strength cannot move a result the immunity has already emptied down to the melee 1. Magic Immunity is the live half at delta 1.2, which is immolationMelee\'s immolation share.',
    },
  },
  immolationRighteousness: {
    desc: 'Immolation vs Righteousness: def→50, str 4 @30% all blocked → melee 1 only',
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:10, abilities: { righteousness: true } },
    expected: { dmgToB: 1.000 },
    vacuity: {
      'a.ability.immolation':
        'Keep. Inert as a consequence of the assertion: Righteousness raises Defense to 50 and every immolation point is blocked, so its strength cannot move the melee 1 that is left. Righteousness is the live half at delta 1.2.',
    },
  },
  immolationFireImmunity: {
    desc: 'Immolation vs Fire Immunity: def raised to 50, str 4 @ 30% all blocked → melee only',
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:10, abilities: { fireImmunity: true } },
    expected: { dmgToB: 1.000 },
    vacuity: {
      'a.ability.immolation':
        'Keep. Inert as a consequence of the assertion: Fire Immunity raises Defense to 50 against the fire and every immolation point is blocked. Fire Immunity is the live half at delta 1.2.',
    },
  },
  immolationArmorPiercingIgnored: {
    desc: 'Armor Piercing does NOT halve immolation defense: LS gives imm def 2 (not 1). '
        + 'Melee 1@100% (melee def 0) + imm(4)@30% vs def 2 (LS), 100% block → 1 + 0.0918 = 1.0918',
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true, armorPiercing: true } },
    b: { def:0, toBlkMod:70, hp:20, abilities: { largeShield: true } },
    expected: { dmgToB: 1.0918 },
    vacuity: {
      'a.ability.armorPiercing':
        'Keep, and the absence is the rule under test: Armor Piercing does not reach the Defense the immolation is scored against, so Large Shield\'s 2 stays 2 rather than halving to 1. Both other features are live - immolation at delta 0.092 and largeShield at delta 1.108.',
    },
  },
  immolationBothSides: {
    desc: 'Both have immolation: A(1fig 1atk) + imm@30% vs B(4fig 1atk 0def 2HP) + imm@30%',
    a: { atk:1, toHitMod:70, def:0, hp:10, abilities: { immolation: true } },
    b: { figs:4, atk:1, toHitMod:70, def:0, hp:2, abilities: { immolation: true } },
    expected: { dmgToA: 5.200, dmgToB: 5.418 },
  },
  immolationNotRangedCoM: {
    desc: 'Immolation + Ranged (CoM): does NOT fire with ranged → missile only (5 100% hit, 0 def = 5 dmg)',
    version: V_COM,
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that immolation does not fire on the ranged path in CoM, so the only feature the fixture adds cannot move the missile 5.',
      'a.ability.immolation':
        'Keep, and the absence is the rule under test. immolationRangedMoM runs the same card in MoM 1.31, where it does fire, and pins 6.200 against this 5.000; immolationNotRangedPatched is the CP 1.60 arm that adopts CoM\'s behaviour.',
    },
  },
  immolationRangedMoM: {
    desc: 'Immolation + Ranged (MoM 1.31): fires with ranged → missile 5@100% + imm(4)@30% vs 0def = 5 + 1.2 = 6.2',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToB: 6.200 },
  },
  immolationWithThrown: {
    desc: 'Immolation + Thrown (MoM 1.31): fires in thrown+melee → thrown 3@100% + imm@30% + melee 1@100% + imm@30% = 6.4',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:3, toHitRtbMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:20 },
    expected: { dmgToB: 6.400 },
  },
  immolationNotThrownCoM2: {
    desc: 'Immolation is melee-only in CoM2: ApplyAttack runs it under `at = ATmelee`, so the Thrown call '
        + 'carries none — thrown 3@100% + melee 1@100% + one immolation(10)@30% = 7.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:3, type:'thrown' } }, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  immolationCoMStrength10: {
    desc: 'Immolation Strength (CoM): strength 10 — 1atk 100% + imm(10)@30% vs 0def 20HP → 1 + 3 = 4',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:20 },
    expected: { dmgToB: 4.000 },
  },
  elemArmorImmolationCoM: {
    desc: 'CoM 1 Elemental Armor covers Immolation: melee 1 is blocked by base def 1; immolation str 10 is fully blocked by def 1+12 at 100% To Block → 0',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { def:1, toBlkMod:70, hp:20, abilities: { elemArmor: 'elementalArmor' } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.immolation':
        'Keep. Inert as a consequence of the assertion: CoM 1\'s Elemental Armor covers immolation, and def 1 + 12 at a 100% To Block blocks all ten points, so the strength cannot move a zero. Elemental Armor is the live half at delta 2.028.',
    },
  },
  immolationAtkZeroNoFire: {
    desc: 'Immolation does not fire when melee atk=0 (touchAttackFires check)',
    a: { atk:0, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:10 },
    expected: { dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: with no melee attack there is no touch attack to carry the immolation, so the only feature the fixture adds cannot move the zero.',
      'a.ability.immolation':
        'Keep, and the absence is the rule under test. The discriminator is a.atk 0, which candidates() does not enumerate: immolationMelee is the nearest positive arm at 2.200, though not a one-value sibling - it also sets toHitMod.',
    },
  },
  immolationNotRangedPatched: {
    desc: 'Immolation + Ranged (MoM CP 1.60): fix — does NOT fire with ranged → missile only (5@100%, 0def = 5)',
    version: V_MOM_CP,
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, abilities: { immolation: true } },
    b: { def:0, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CP 1.60 patched the ranged firing out, so the only feature the fixture adds cannot move the missile 5.',
      'a.ability.immolation':
        'Keep, and the absence is the rule under test. immolationRangedMoM runs the same card in 1.31, before the fix, and pins 6.200 against this 5.000.',
    },
  },


  // --- Wall of Fire ---
  wallOfFireBasic: {
    desc: 'Wall of Fire basic (MoM str 5): 1 atk 100% hit vs 0 def — melee 1, WoF 5@30% vs 0def → 1.5 dmg to A',
    a: { atk:1, toHitMod:70, def:0, hp:10 },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 1.500, dmgToB: 1.000 },
  },
  wallOfFireMultiFig: {
    desc: 'Wall of Fire area: 4 figs 1hp — each fig binomial(5,0.3) capped at 1hp → 4×(1-0.7^5) = 3.3277',
    a: { figs:4, atk:1, toHitMod:70, def:0, hp:1 },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 3.3277, dmgToB: 0.6723 },
  },
  wallOfFireMagicImmunity: {
    desc: 'Wall of Fire blocked by Magic Immunity: melee 1 to B, WoF does 0 to A',
    a: { atk:1, toHitMod:70, def:0, hp:10, abilities: { magicImmunity: true } },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'combat.wallOfFire':
        'Keep. Inert as a consequence of the assertion: the attacker\'s Magic Immunity blocks the wall outright, so the wall\'s presence cannot move a dmgToA of zero. Magic Immunity is the live half at delta 1.5, which is wallOfFireBasic\'s number.',
    },
  },
  wallOfFireRighteousness: {
    desc: 'Wall of Fire vs Righteousness: def→50, str 5 @30% all blocked → 0 to A, melee 1 to B',
    a: { atk:1, toHitMod:70, def:0, hp:10, abilities: { righteousness: true } },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'combat.wallOfFire':
        'Keep. Inert as a consequence of the assertion: Righteousness raises the attacker\'s Defense to 50 and every wall point is blocked. Righteousness is the live half at delta 1.5.',
    },
  },
  wallOfFireFireImmunity: {
    desc: 'Wall of Fire vs Fire Immunity: def raised to 50, str 5 @ 30% all blocked → 0 to A',
    a: { atk:1, toHitMod:70, def:0, hp:10, abilities: { fireImmunity: true } },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'combat.wallOfFire':
        'Keep. Inert as a consequence of the assertion: Fire Immunity raises the attacker\'s Defense to 50 against the fire and every wall point is blocked. Fire Immunity is the live half at delta 1.5.',
    },
  },
  wallOfFireNotRanged: {
    desc: 'Wall of Fire does NOT fire during ranged attack (attacker does not pass through)',
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, def:0, hp:10 },
    b: { atk:0, def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    wallOfFire: true,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: a ranged attacker does not pass through the wall, so the wall has no effect available for the fixture to remove.',
      'combat.wallOfFire':
        'Keep, and the absence is the rule under test. The discriminator is a.rtbType, which candidates() does not enumerate: wallOfFireBasic is the melee card with the same wall and pins dmgToA 1.500.',
    },
  },
  wallOfFireCoM2Strength: {
    desc: 'Wall of Fire CoM2 strength 10: str 10 @ 30% vs 0 def → mean 3.0 dmg to A',
    version: V_COM2,
    a: { atk:1, hitChance:70, def:0, hp:20 },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 3.000, dmgToB: 1.000 },
  },
  wallOfFireCoMStrength: {
    desc: 'Wall of Fire CoM 6.08 strength 10: str 10 @ 30% vs 0 def → mean 3.0 dmg to A',
    version: V_COM,
    a: { atk:1, toHitMod:70, def:0, hp:20 },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 3.000, dmgToB: 1.000 },
  },
  resistElementsWallOfFireCoM: {
    desc: 'CoM 1 Resist Elements covers Wall of Fire: str 10 is fully blocked by def 6+4 at 100% To Block; melee 1 is blocked by defender def 1 → 0',
    version: V_COM,
    a: { atk:1, toHitMod:70, def:6, toBlkMod:70, hp:20, abilities: { elemArmor: 'resistElements' } },
    b: { atk:0, def:1, toBlkMod:70, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'combat.wallOfFire':
        'Keep. Inert as a consequence of the assertion: CoM 1\'s Resist Elements covers the wall, and def 6 + 4 at a 100% To Block stops all ten points, so the wall\'s presence cannot move a zero. Resist Elements is the live half at delta 0.012, the residue being the melee the defender\'s own def 1 otherwise blocks.',
    },
  },
  wallOfFireWarlordStrength: {
    desc: 'Wall of Fire Warlord: single figure str 12 @ 60% vs 0 def → mean 7.2 dmg to A',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, def:0, hp:20 },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 7.200, dmgToB: 1.000 },
  },
  wallOfFireWarlordSingleFigure: {
    desc: 'Wall of Fire Warlord strikes ONE figure: 4 figs hp20 — str 12 @ 60% on a single fig → 7.2 to A (not 4×). Melee 4×1 to B.',
    version: V_WARLORD,
    a: { figs:4, atk:1, hitChance:70, def:0, hp:20 },
    b: { atk:0, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 7.200, dmgToB: 4.000 },
  },
  wallOfFireWarlordDefenderMetalFires: {
    desc: 'Wall of Fire garrison boost grants defender +1 non-magic attack (Metal Fires): B melee counter 5→6 vs 0 def; WoF fire 7.2 + counter 6 = 13.2 to A',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, def:0, hp:100 },
    b: { atk:5, hitChance:70, def:0, hp:10, abilities: { wallOfFireBoost: true } },
    wallOfFire: true,
    expected: { dmgToA: 13.200, dmgToB: 1.000 },
  },
  wallOfFireWarlordDefenderMagicWeapon: {
    desc: 'Wall of Fire garrison boost grants defender magic weapons (Metal Fires): B counter (atk 5+1) bypasses A Weapon Immunity (def 0+10 → 0). WoF fire 7.2 + counter 6 = 13.2 to A (0 without bypass)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, def:0, toBlkMod:70, hp:100, abilities: { weaponImmunity: true } },
    b: { atk:5, hitChance:70, def:0, hp:10, abilities: { wallOfFireBoost: true } },
    wallOfFire: true,
    expected: { dmgToA: 13.200, dmgToB: 1.000 },
  },
  wallOfFireWarlordBoostOnAttacker: {
    desc: 'Garrison boost is per-unit and side-independent: boost on attacker A (no fire line). A melee 5→6 vs B def 0 → 6.0 to B (5.0 without the boost)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, def:0, hp:10, abilities: { wallOfFireBoost: true } },
    b: { atk:0, toBlkMod:70, def:0, hp:20 },
    expected: { dmgToA: 0.000, dmgToB: 6.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'wall of fire boost\' and the key says \'wall of fire warlord boost\'. The feature is live at delta 1, and the claim is that the garrison bonus is per-unit and side-independent, so it lands on an attacker with no fire line at all.',
    },
  },
  wallOfFireWarlordBoostAfterCombatConversion: {
    desc: 'The block skips on `IF (BASEFANTASTIC(U)>0)` (UnitCalcPre.CAS:1638) — the permanent record — so a combat conversion cannot withdraw the garrison bonus. Raise Dead makes A an unaligned fantastic creature during combat and the +1 melee stands: 5 -> 6 vs B def 0 gives 6.0, the same as the sibling wallOfFireWarlordBoostOnAttacker. Gating on the converted identity instead dropped the bonus and left 5.0.',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, def:0, hp:10,
      abilities: { wallOfFireBoost: true, raiseDead: true } },
    b: { atk:0, toBlkMod:70, def:0, hp:20 },
    expected: { dmgToA: 0.000, dmgToB: 6.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. The same tokenisation artefact; the boost is live at delta 1. a.abilities.raiseDead is inert on purpose and is the fixture\'s claim: the block skips on BASEFANTASTIC(U) (UnitCalcPre.CAS:1638), the permanent record, so a combat conversion cannot withdraw the bonus and the total stays at wallOfFireWarlordBoostOnAttacker\'s 6.0. Gating on the converted identity instead dropped it to 5.0.',
    },
  },
  wallOfFireGarrisonSkipsApotheosisPermanentFantasticWarlord: {
    desc: 'The garrison block skips on `IF (BASEFANTASTIC(U)>0)` (UnitCalcPre.CAS:1638), the permanent record, and Apotheosis writes `B.Fantastic := True` at $0059A390 into BaseUnits, where every later recalculation reads it. So the enchanted unit is Fantastic to this gate and takes no garrison bonus. Negative claim, the absence being the rule under test: melee 5 doubled by Apotheosis is 10 at 100% hit vs def 0 → 10.0. Reading the training-time flag instead added the +1 before the doubling, for 12.0; the sibling wallOfFireWarlordBoostOnAttacker without Apotheosis still measures the +1 at 6.0.',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, def:0, hp:10,
      abilities: { wallOfFireBoost: true, apotheosis: true } },
    b: { atk:0, toBlkMod:70, def:0, hp:30 },
    expected: { dmgToA: 0.000, dmgToB: 10.000 },
    vacuity: {
      'a.ability.wallOfFireBoost':
        'Keep, and the absence is the rule under test: Apotheosis writes B.Fantastic into the permanent record the garrison gate at UnitCalcPre.CAS:1638 reads, so the unit is Fantastic to that gate and takes no bonus. Apotheosis is the live half at delta 4; reading the training-time flag instead added the +1 before the doubling, for 12.0, and wallOfFireWarlordBoostOnAttacker measures the +1 without Apotheosis at 6.0.',
    },
  },
  wallOfFireGarrisonReachesHeroWarlord: {
    desc: 'The garrison block skips only on `IF (BASEFANTASTIC(U)>0)` (UnitCalcPre.CAS:1638) and has no hero arm of its own, so a hero takes the +1 melee like any other non-Fantastic unit: 5 -> 6 at 100% hit vs def 0 gives 6.0, the same as the sibling wallOfFireWarlordBoostOnAttacker on a normal identity. The gate used to carry a `!isHero` term taken from the helptext\'s "regular units" — prose, which the script outranks — and left 5.0 (F175).',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, def:0, hp:10, unitType:'hero',
      abilities: { wallOfFireBoost: true } },
    b: { atk:0, toBlkMod:70, def:0, hp:20 },
    expected: { dmgToA: 0.000, dmgToB: 6.000 },
    vacuity: {
      'a.unitType=hero':
        'Keep, and the inertness is the claim: the sweep ablates unitType to \'normal\' (UNIT_FIELD_DEFAULTS, tools/preset_vacuity_sweep.js:204), and \'normal\' is precisely the identity a hero is asserted to answer alike. The block\'s only eligibility test is BASEFANTASTIC(U) (UnitCalcPre.CAS:1638), so the gate is `!permanentFantastic` (stats.js:868) and admits both; no ablation between the two can move a number. a.ability.wallOfFireBoost is the live half at delta 1, and wallOfFireWarlordBoostOnAttacker pins the same 6.000 on the normal identity.',
    },
  },
  wallOfFireWarlordBoostBoulder: {
    desc: 'Garrison boost now covers boulder physical ranged: A boulder 5→6 @100% vs B def 0 → 6.0 to B (5.0 without boulder coverage)',
    version: V_WARLORD,
    rangedCheck: true, rangedDist: 1,
    a: { modernAttacks: { ranged: { strength:5, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, def:0, hp:10, abilities: { wallOfFireBoost: true } },
    b: { atk:0, toBlkMod:70, def:0, hp:20 },
    expected: { dmgToA: 0.000, dmgToB: 6.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. The same tokenisation artefact; the feature is live at delta 1. The claim is the boulder coverage, and the discriminator for that is the modernAttacks ranged type, which candidates() does not enumerate.',
    },
  },
  wallOfFireWarlordFireLineNoBoost: {
    desc: 'Split: fire-line global alone does NOT grant the garrison boost. B has no boost → counter stays 5; WoF fire 7.2 + counter 5 = 12.2 to A (13.2 if the fire line still boosted)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, def:0, hp:100 },
    b: { atk:5, hitChance:70, def:0, hp:10 },
    wallOfFire: true,
    expected: { dmgToA: 12.200, dmgToB: 1.000 },
  },
  // --- Magic Immunity vs Breath (version difference) ---
  magicImmunityFireBreathMoM: {
    desc: 'Magic Immunity vs Fire Breath (MoM): MI sets def to 50 — fire breath 4 blocked; melee atk 1 vs def 0 = 1 dmg',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, rtbType:'fire', rtb:4, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  magicImmunityFireBreathCoM: {
    desc: 'Magic Immunity vs Fire Breath (CoM): MI no longer blocks breath (CoM v2.3) — fire breath 4 + melee 1 = 5 dmg',
    version: V_COM,
    a: { atk:1, toHitMod:70, rtbType:'fire', rtb:4, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CoM v2.3 stopped Magic Immunity blocking breath, so the only feature the fixture adds cannot move the 5.',
      'b.ability.magicImmunity':
        'Keep, and the absence is the rule under test. The MoM arm is elsewhere in the suite, where the same immunity does block a fire breath. version-dead is literally true and uninformative: this is the only com_6.08 preset that configures magicImmunity at all, so CoM 1\'s positive Magic Immunity behaviour is unasserted.',
    },
  },

  wallOfFireAfterThrown: {
    desc: 'WoF sequence: thrown fires at full A count (4×1=4), then WoF kills ~3.33 A figs, melee uses survivors (~0.67) → 4.672',
    a: { figs:4, atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, def:0, hp:1 },
    b: { atk:0, def:0, hp:20 },
    wallOfFire: true,
    expected: { dmgToA: 3.328, dmgToB: 4.672 },
  },
  wallOfFireAfterGazeCounter: {
    desc: 'WoF sequence: B gaze 3 overflow kills 1 of 2 A figs (2hp each), WoF targets 1 survivor (1hp) → 3.832 to A, 0.168 to B',
    a: { figs:2, atk:1, toHitMod:70, def:0, hp:2, abilities: { stoningImmunity: true } },
    b: { rtbType:'gaze_stoning', rtb:3, atk:0, def:0, hp:20, toHitRtbMod:70, abilities: {  } },
    wallOfFire: true,
    expected: { dmgToA: 3.832, dmgToB: 0.168 },
  },
  wallOfFireAfterThrownAndGaze: {
    desc: 'WoF sequence: thrown (2×1=2 to B), B gaze overflow (3 kills 1 A fig), WoF on 1 survivor, melee → 3.832 to A, 2.168 to B',
    a: { figs:2, atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, def:0, hp:2, abilities: { stoningImmunity: true } },
    b: { rtbType:'gaze_stoning', rtb:3, atk:0, def:0, hp:20, toHitRtbMod:70, abilities: {  } },
    wallOfFire: true,
    expected: { dmgToA: 3.832, dmgToB: 2.168 },
  },
  wallOfFireBilateralGaze: {
    desc: 'WoF with bilateral gaze: A gaze (2 to B) → B gaze (2 to A) → WoF (1.5 to A) → melee 1 + counter 1',
    a: { rtbType:'gaze_stoning', rtb:2, atk:1, toHitMod:70, def:0, hp:10, toHitRtbMod:70, abilities: { stoningImmunity: true } },
    b: { rtbType:'gaze_stoning', rtb:2, atk:1, toHitMod:70, def:0, hp:10, toHitRtbMod:70, abilities: { stoningImmunity: true } },
    wallOfFire: true,
    expected: { dmgToA: 4.500, dmgToB: 3.000 },
  },

  // --- Warp Reality ---
  warpRealityBasic: {
    desc: 'Warp Reality: non-chaos A gets -20% to hit (30%→10%), 1 atk vs 0 def → 0.1 dmg',
    a: { atk:1, hp:10 },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.100 },
  },
  warpRealityChaosExempt: {
    desc: 'Warp Reality: Chaos Fantastic A is exempt (30% to hit unchanged), 1 atk vs 0 def → 0.3 dmg',
    a: { atk:1, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'combat.warpReality':
        'Keep, and the absence is the rule under test: a Chaos Fantastic attacker is exempt, so the -20% is never charged and the 30% To Hit stands. The realm is the live half at delta 0.2 - ablating it drops the attacker out of the exemption and the total falls to 0.100.',
    },
  },
  warpRealityChaosChannelsExempt: {
    desc: 'Warp Reality: Chaos Channels unit is exempt (counts as Chaos), 1 atk vs 0 def → 0.3 dmg',
    a: { atk:1, hp:10, abilities: { ccDefense: true } },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'combat.warpReality':
        'Keep, and the absence is the rule under test: Chaos Channels counts as Chaos for the exemption, so the -20% is never charged. Chaos Channels is the live half at delta 0.2, and warpRealityChaosExempt is the base-realm arm of the same claim.',
    },
  },
  warpRealityMagicImmunityNotExempt: {
    desc: 'Warp Reality bypasses Magic Immunity: non-chaos A with MagicImm still gets -20% to hit → 0.1 dmg',
    a: { atk:1, hp:10, abilities: { magicImmunity: true } },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.100 },
    vacuity: {
      'a.ability.magicImmunity':
        'Keep, and the absence is the rule under test: the exemption is realm-based, not immunity-based, so Magic Immunity does not buy out of the -20%. Warp Reality is the live half at delta 0.2, and warpRealityChaosExempt is the same card with a realm that does exempt, at 0.300.',
    },
  },
  warpRealityBothSides: {
    desc: 'Warp Reality penalizes both sides: A 1 atk 10%, B 1 atk 10% → 0.1 dmg each',
    a: { atk:1, hp:10 },
    b: { atk:1, hp:10 },
    warpReality: true,
    expected: { dmgToA: 0.100, dmgToB: 0.100 },
  },
  warpRealityFloorAt10: {
    desc: 'Warp Reality floors at 10%: A starts at 10% (toHitMod -20), WR -20% → still 10% → 0.1 dmg',
    a: { atk:1, toHitMod:-20, hp:10 },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.100 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the attacker already stands at the 10% floor, so the -20% has nowhere to take it and nothing the fixture configures can move the number.',
      'combat.warpReality':
        'Keep, and the absence is the rule under test. The discriminator is a.toHitMod -20, which candidates() does not enumerate: warpRealityMagicImmunityNotExempt is the same non-exempt attacker at the default To Hit and pins 0.100 from 0.300, the full -20%.',
    },
  },
  warpRealityChaosExemptAtBlockWarlord: {
    desc: 'Warp Reality reads its Chaos exemption at its own block, not against the record the recalculation leaves. Spirit Link asserts Fantastic at region b (UnitCalcPre.CAS:25-28) and clears it again at region d (UnitCalc.CAS:1305-1306), and `c:warpReality` is #111 of the Warlord chain against `d:spiritLink` #135 — so a spirit-linked Chaos creature is still Chaos where the block stands and keeps its 30% to hit: 1 atk vs 0 def → 0.3. Reading the record the recalculation leaves instead sees normal_chaos, applies the -20% and gives 0.1.',
    version: V_WARLORD,
    a: { atk:1, hp:10, unitType:'fantastic_chaos', abilities: { spiritLink: true } },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'combat.warpReality':
        'Keep, and the absence is the rule under test: the exemption holds, so the -20% is never charged. The claim is positional - c:warpReality is #111 of the Warlord chain against d:spiritLink #135, so the block reads a still-Chaos record even though the recalculation later leaves normal_chaos. The realm is the live half at delta 0.2, and a.abilities.spiritLink is inert exactly because its clearing of Fantastic comes too late to be seen. Reading the record the recalculation leaves gives 0.100. version-dead holds across Warlord - the only two presets configuring warpReality are this one and warpRealityChaosExemptAtBlockImmolationWarlord, both exemption claims. TASKS F190 is open against the second consumer those two exercise.',
    },
  },
  warpRealityChaosExemptAtBlockImmolationWarlord: {
    desc: 'The same positional read at Warp Reality’s second consumer, the separate Immolation spell-attack chance. The attacker has no melee strength, so the only damage is Immolation 10 at its own To Hit: exempt → 30% → 3.0, against 1.0 if the exemption is taken from the record the recalculation leaves and the -20% applies. Paired with warpRealityChaosExemptAtBlockWarlord because the two consumers are separate expressions.',
    version: V_WARLORD,
    a: { atk:0, hp:10, unitType:'fantastic_chaos', abilities: { spiritLink: true, immolation: true } },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'combat.warpReality':
        'Keep, and the absence is the rule under test, at Warp Reality\'s second consumer: the separate Immolation spell-attack chance. The attacker has no melee strength, so the exempt 30% on Immolation 10 is the whole 3.0; taking the exemption from the record the recalculation leaves gives 1.0. Immolation is live at delta 3 and the realm at delta 2. Paired with warpRealityChaosExemptAtBlockWarlord because the two consumers are separate expressions. a.abilities.spiritLink is inert for the same positional reason. Note TASKS F190 is open on whether this second consumer, the unsourced Immolation To Hit arm, survives at all; if it goes, this fixture goes with it.',
    },
  },
  warpRealityRanged: {
    desc: 'Warp Reality vs ranged: missile 1 atk, 30%→10% to hit vs 0 def → 0.1 dmg',
    a: { rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.100 },
  },

  hurricaneRanged: {
    desc: 'Hurricane: missile 1 atk gets -20% to hit (30%→10%) vs 0 def → 0.1 dmg',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    hurricane: true,
    expected: { dmgToA: 0, dmgToB: 0.100 },
  },
  hurricaneBreath: {
    desc: 'Hurricane: fire breath 1 atk gets -30% to hit (30%→10%, floored) vs 0 def → 0.1 dmg. Without Hurricane breath would hit at 30% → 0.3, so the breath-specific penalty is exercised.',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { fireBreath: { strength:1, type:'fire' } }, hp:10 },
    b: { hp:10 },
    rangedCheck: false,
    hurricane: true,
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },
  hurricaneMeleeUnaffected: {
    desc: 'Hurricane does not touch melee: 1 atk stays at 30% to hit vs 0 def → 0.3 dmg',
    version: V_WARLORD,
    a: { atk:1, hp:10 },
    b: { hp:10 },
    hurricane: true,
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Hurricane does not reach melee, so the only feature the fixture adds cannot move the 0.300.',
      'combat.hurricane':
        'Keep, and the absence is the rule under test. hurricaneRanged and hurricaneBreath are the positive arms on the channels it does reach.',
    },
  },
  hurricanePenaltySizeRanged: {
    desc: 'Hurricane’s ranged penalty is 20 points, not 30: missile 2 at 100% to hit drops to 80% → 1.6 dmg. Paired with hurricanePenaltySizeBreath, which starts from the same 100% and lands on 70%. The 30%-base presets above cannot tell the two penalties apart because both floor at 10%. Without Hurricane this is 2.0.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    hurricane: true,
    expected: { dmgToA: 0, dmgToB: 1.600 },
  },
  hurricanePenaltySizeBreath: {
    desc: 'Hurricane’s breath penalty is 30 points: fire breath 2 at 100% to hit drops to 70% → 1.4, plus 1 melee at an untouched 30% → 1.7 dmg. Paired with hurricanePenaltySizeRanged: same base, 10 points further down because Fire and Lightning Breath read the separate breath modifier. Without Hurricane this is 2.3.',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { fireBreath: { strength:2, type:'fire' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { hp:10 },
    rangedCheck: false,
    hurricane: true,
    expected: { dmgToA: 0, dmgToB: 1.700 },
  },

  ccFireBreathOverridesDestinyCoM2: {
    desc: 'Realm precedence (CoM2): Destiny writes the *permanent* record — `B.race := 19; B.Fantastic := True` at $0059A390 — not the calculated one, so it stands before this recalculation rather than inside region c, and the Chaos Channels Fire Breath realm write at $00599EE8 lands after it. The finished realm is therefore Chaos, Warp Reality exempts the unit, and the doubled channels keep their To Hit → 1.403 dmg. Destiny still doubles more than melee and HP: fire breath ($0059A51F), lightning breath ($0059A559) and thrown ($0059A593) too, so the Chaos Channels breath 4 doubles to 8. Dropping Destiny gives 0.300; treating its realm write as a region-c write of the calculated record gives 0.387.',
    version: V_COM2,
    a: { atk:1, hp:10, abilities: { destiny: true, ccFireBreath: true } },
    b: { hp:10, abilities: { fireImmunity: true } },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 1.403 },
  },
  ccDefenseOverridesDestinyCoM2: {
    desc: 'Type precedence (CoM2): Chaos Channels Defense is applied after Destiny, so final type is Chaos. Destiny still doubles melee to 2, and Warp Reality is ignored → 0.6 dmg',
    version: V_COM2,
    a: { atk:1, hp:10, abilities: { destiny: true, ccDefense: true } },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.600 },
  },
  ccFlightOverridesDestinyCoM2: {
    desc: 'Type precedence (CoM2): Chaos Channels Flight is applied after Destiny, so final type is Chaos. Destiny still doubles melee to 2, and Warp Reality is ignored → 0.6 dmg',
    version: V_COM2,
    a: { atk:1, hp:10, abilities: { destiny: true, ccFlight: true } },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.600 },
  },
  bloodLustOverridesCCDefenseCoM2: {
    desc: 'Type precedence (CoM2): Chaos Channels Armor/Defense is applied before Blood Lust, so final type is Death; Blood Lust still doubles melee against the normal target, and Warp Reality penalizes that doubled attack → 0.2 dmg',
    version: V_COM2,
    a: { atk:1, hp:10, abilities: { bloodLust: true, ccDefense: true } },
    b: { hp:10 },
    warpReality: true,
    expected: { dmgToA: 0, dmgToB: 0.200 },
    vacuity: {
      'a.ability.ccDefense':
        'Keep, and the absence is the rule under test: CoM2 applies Chaos Channels Armor before Blood Lust, so Blood Lust wins the type and the unit ends Death rather than Chaos - which is what puts it inside Warp Reality\'s penalty. Both other features are live: bloodLust at delta 0.1 for the doubled melee, warpReality at delta 0.4 for the penalty that doubling then takes.',
    },
  },
  ccDefenseOverridesBlackChannelsMoM: {
    desc: 'Type precedence (MoM 1.31): BU_Apply_Specials writes Black Channels\' Death realm at 0x8F4A1 and demon-skin armor\'s Chaos realm at 0x8F6FE, so the later Chaos write wins and Darkness gives the defender nothing. Defence 2 + Black Channels 1 + armor 3 twice = 9; 12 certain hits against 9 certain blocks deal 3 (Death would take Darkness\' +1 and leave 2).',
    version: V_MOM_131,
    darkness: true,
    a: { atk:12, toHitMod:70, hp:10 },
    b: { atk:0, def:2, res:5, toBlkMod:70, hp:10, abilities: { blackChannels: true, ccDefense: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  ccDefenseOverridesUndeadCoM1: {
    desc: 'Type precedence (CoM 1): the same two blocks are reordered — Undead\'s Death realm at com1:0x8F4BC, demon-skin armor\'s Chaos realm at com1:0x8F757 — so Chaos still wins and Darkness gives nothing. Defence 2 + armor 3 = 5; 12 certain hits against 5 certain blocks deal 7 (Death would take Darkness\' +1 and leave 6).',
    version: V_COM,
    darkness: true,
    a: { atk:12, toHitMod:70, hp:10 },
    b: { atk:0, def:2, res:5, toBlkMod:70, hp:10, abilities: { undead: true, ccDefense: true } },
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'b.ability.undead':
        'Keep, and the absence is the rule under test: CoM 1 orders Undead\'s Death realm at com1:0x8F4BC before demon-skin armor\'s Chaos realm at com1:0x8F757, so Chaos wins and the unit is not Death. combat.darkness is inert for the same reason and by the same claim - a Death unit would take its +1 and leave 6 instead of 7. Chaos Channels is the live half at delta 2.',
    },
  },
  raiseDeadOverridesUndeadCoM2: {
    desc: 'Type precedence (CoM2): Raise Dead makes the unit unaligned fantastic, overriding Undead, so Exorcise −4 still reaches it but loses the created-undead −3: res 7 stays at effective 3, pFail=0.7, E[banish]=7 plus 1 physical → 8.0 (11.0 without Raise Dead)',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: -4 } },
    b: { figs:2, def:0, res:7, hp:10, abilities: { undead: true, raiseDead: true } },
    expected: { dmgToA: 0, dmgToB: 8.000 },
    vacuity: {
      'b.ability.undead':
        'Keep, and the absence is the rule under test: Raise Dead makes the unit unaligned fantastic, overriding Undead, so Exorcise loses the created-undead -3 and the Undead status contributes nothing. Both other features are live - exorcise at delta 7 and raiseDead at delta 3, the latter being the 11.0 the same card reaches without the override.',
    },
  },
  raiseDeadDoesNotOverrideUndeadMoM: {
    desc: 'Type precedence (MoM): Raise Dead does not make the unit unaligned fantastic, so Undead still gives Dispel Evil the -9 penalty → 11.0 damage',
    version: V_MOM_CP,
    a: { atk:1, toHitMod:70, hp:10, abilities: { dispelEvil: true } },
    b: { figs:2, def:0, res:7, hp:10, abilities: { undead: true, raiseDead: true } },
    expected: { dmgToA: 0, dmgToB: 11.000 },
    vacuity: {
      'b.ability.raiseDead':
        'Keep, and the absence is the rule under test: MoM\'s Raise Dead does not make the unit unaligned fantastic, so Undead survives and still gives Dispel Evil its -9. Both other features are live at delta 10, and raiseDeadOverridesUndeadCoM2 is the CoM2 arm where the override does happen.',
    },
  },
  mysticSurgeOverridesUndeadCoM2: {
    desc: 'Type precedence (CoM2): Mystic Surge makes the unit unaligned fantastic, overriding Undead, so Exorcise −4 loses the created-undead −3; its own −2 resistance leaves res 7 at effective 1, pFail=0.9, and its +2 defense cuts the physical hit to 0.49 → 9.49 (11.0 without Mystic Surge)',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: -4 } },
    b: { figs:2, def:0, res:7, hp:10, abilities: { undead: true, mysticSurge: true } },
    expected: { dmgToA: 0, dmgToB: 9.490 },
    vacuity: {
      'b.ability.undead':
        'Keep, and the absence is the rule under test: Mystic Surge makes the unit unaligned fantastic, overriding Undead, so Exorcise loses the created-undead -3. Both other features are live - exorcise at delta 9 and mysticSurge at delta 1.51, the latter being the 11.0 the same card reaches without the override.',
    },
  },

  // --- Bless ---
  blessMeleeFromDeath: {
    desc: 'Bless +3 def vs Death Fantastic melee: 5 atk 100% hit, def 0+3=3, 100% block → 5−3=2 dmg',
    a: { atk:5, toHitMod:70, hp:10, unitType:'fantastic_death' },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  blessMeleeFromChaos: {
    desc: 'Bless +3 def vs Chaos Fantastic melee: 5 atk 100% hit, def 0+3=3, 100% block → 5−3=2 dmg',
    a: { atk:5, toHitMod:70, hp:10, unitType:'fantastic_chaos' },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  blessMeleeFromDeathCoM2: {
    desc: 'CoM2 Bless does NOT apply vs Death Fantastic melee: 5 atk 100% hit, def 0, 100% block → 5 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10, unitType:'fantastic_death' },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CoM2\'s Bless does not reach a melee attack whatever the attacker\'s realm, so neither the realm nor the Bless can move the 5.',
      'b.ability.bless':
        'Keep, and the absence is the rule under test: CoM2\'s Bless defense arm is gated on a spell attack (effectiveDefense:bless requires ctx.spellId > 0), which a melee attack is not. blessResistBonusCoM2 and destructionBlessCoM2 are the live CoM2 arms, at delta 5 and 20.',
    },
  },
  blessMeleeFromChaosCoM2: {
    desc: 'CoM2 Bless does NOT apply vs Chaos Fantastic melee: 5 atk 100% hit, def 0, 100% block → 5 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10, unitType:'fantastic_chaos' },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CoM2\'s Bless does not reach a melee attack whatever the attacker\'s realm, so neither the realm nor the Bless can move the 5.',
      'b.ability.bless':
        'Keep, and the absence is the rule under test, and the Chaos half of the realm pair blessMeleeFromDeathCoM2 opens: both realms the spell-attack arm would admit are refused on the melee path. blessResistBonusCoM2 and destructionBlessCoM2 are the live CoM2 arms.',
    },
  },
  blessMeleeFromNormal: {
    desc: 'Bless does NOT apply vs Normal unit melee: 5 atk 100% hit, def 0, 100% block → 5 dmg',
    a: { atk:5, toHitMod:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Bless does not reach a melee attack, so the only feature the fixture adds cannot move the 5.',
      'b.ability.bless':
        'Keep, and the absence is the rule under test: the defense arm is realm-gated and a normal attacker\'s melee carries no realm. blessMeleeFromDeathCoM2 and blessMeleeFromChaosCoM2 close the other two realms in CoM2.',
    },
  },
  blessFireBreathAlwaysChaos: {
    desc: 'Bless +3 def vs Fire Breath (always Chaos) even from Normal unit: breath 5−3=2, melee 1−0=1 (bless n/a) → 3 dmg',
    a: { atk:1, rtbType:'fire', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blessLightningBreathAlwaysChaos: {
    desc: 'Bless +3 def vs Lightning Breath (always Chaos) — intrinsic AP halves bless: breath def floor((0+3)/2)=1, 5−1=4, melee 1−0=1 → 5 dmg',
    a: { atk:1, rtbType:'lightning', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blessMagicChaosRanged: {
    desc: 'Bless +3 def vs Chaos Magic ranged (always Chaos): 5 hits vs def 0+3=3 → 2 dmg',
    a: { rtbType:'magic_c', rtb:5, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  blessMissileFromDeathNoBonus: {
    desc: 'Bless does NOT apply vs Missile from a Death Fantastic: a missile is realm-less (ranged_type 20−29), so it never inherits the attacker\'s Death realm. 5 hits vs def 0 → 5 dmg (would be 2 if the realm carried over)',
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, unitType:'fantastic_death' },
    b: { def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the missile never inherits the attacker\'s realm, so neither the realm nor the Bless can move the 5.',
      'b.ability.bless':
        'Keep, and the absence is the rule under test: a missile is realm-less (ranged_type 20-29), so a Death Fantastic firing one produces no realm for Bless to match. a.unitType=fantastic_death is inert for the same reason and is the other half of that claim; the realm carrying over would give 2.',
    },
  },
  blessThrownFromChaosNoBonus: {
    desc: 'Bless does NOT apply vs plain Thrown from a Chaos Fantastic: Thrown is realm-less (ranged_type 100), unlike the attacker\'s melee. Thrown 5 − 0 = 5; melee 1 vs def 0+3=3 → 0. Total 5 dmg (would be 2 if the realm carried over)',
    a: { atk:1, rtbType:'thrown', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10, unitType:'fantastic_chaos' },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blessArmorPiercingHalves: {
    desc: 'Bless + Armor Piercing: pre-AP def 3+3=6, AP halves to 3, 7 atk → 7−3=4 dmg (without bless would be 6)',
    a: { atk:7, toHitMod:70, hp:10, unitType:'fantastic_chaos', abilities: { armorPiercing: true } },
    b: { atk:0, def:3, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  blessCauseFear: {
    desc: 'Bless +3 res vs Cause Fear (v1.31 self-fear bug fires even for immune A): B res 5+3=8, pFear=0.2; bug: E[A self-feared]=0.2 → E[A figs]=3.8 → dmgToB=11.4; E[B unfeared]=0.8 → dmgToA=2.4',
    a: { figs:4, atk:3, toHitMod:70, hp:10, abilities: { fear: true, deathImmunity: true } },
    b: { atk:3, toHitMod:70, hp:100, def:0, res:5, abilities: { bless: true } },
    expected: { dmgToA: 2.400, dmgToB: 11.400 },
  },
  blessCauseFearImmune: {
    desc: 'Bless +3 res → effective res 10 immune to Fear (no self-fear bug: bPFear=0): B res 7+3=10, not feared, full counter 1×3=3',
    a: { figs:4, atk:3, toHitMod:70, hp:10, abilities: { fear: true, deathImmunity: true } },
    b: { atk:3, toHitMod:70, hp:100, def:0, res:7, abilities: { bless: true } },
    expected: { dmgToA: 3.000, dmgToB: 12.000 },
    vacuity: {
      'a.ability.fear':
        'Keep. Inert as a consequence of the assertion: Bless takes B\'s Resistance from 7 to an effective 10, which no fear roll can beat, so the attacker\'s Cause Fear has no effect left to remove. a.abilities.deathImmunity is inert for the same reason. Bless is the live half at delta 0.9, and the fixture\'s second claim is dmgToA 3.000 - the full counter, so there is no self-fear.',
    },
  },
  blessLifeSteal: {
    desc: 'Bless +3 res vs Life Steal −3: effRes=5+3−3=5, E[dmg]=sum(1..5)/10=1.5',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { atk:0, def:1, toBlkMod:70, res:5, hp:20, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 1.500 },
  },
  blessDeathGaze: {
    desc: 'Bless vs Death Gaze −3 (hidden ranged 1 so gaze fires in v1.31): +3 res → effRes=5+3−3=5, fail=0.5 → 5.0 death. Bless also grants +3 def against the gaze itself, since a Death Gaze is Death-realm regardless of the attacker\'s unit type, so the hidden 1 adds 0.5×0.3×0.7³=0.051',
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { atk:0, def:0, res:5, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 5.051 },
  },
  blessBreathBonusMoM: {
    desc: 'MoM Bless +3 def vs Chaos magic ranged: 7 hits − 3 bless = 4 dmg',
    version: V_MOM_131,
    a: { rtbType:'magic_c', rtb:7, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  blessBreathBonusCoM: {
    desc: 'CoM 1 Bless gives NO def bonus vs Chaos magical ranged: its defense half needs ranged_type > 39, which excludes every conventional ranged type. 7 hits − 0 = 7 dmg (4 in MoM)',
    version: V_COM,
    a: { rtbType:'magic_c', rtb:7, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CoM 1\'s Bless defense half cannot see a conventional ranged type, so the only feature the fixture adds cannot move the 7.',
      'b.ability.bless':
        'Keep, and the absence is the rule under test: the arm needs ranged_type > 39, which excludes every conventional ranged type. The MoM arm of the same card blocks 3.',
    },
  },
  blessBreathBonusCoM2: {
    desc: 'CoM2 Bless gives NO def bonus vs a magical ranged unit attack: its defense half is gated on a positive spell ID and ApplyAttack passes 0 for every unit channel. 7 hits − 0 = 7 dmg (MoM blocks 3, and a +5 here would leave 2)',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:7, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CoM2\'s Bless defense half is closed for every unit attack channel, so the only feature the fixture adds cannot move the 7.',
      'b.ability.bless':
        'Keep, and the absence is the rule under test: the arm is gated on a positive spell ID and ApplyAttack passes 0 for every unit channel. MoM blocks 3 on the same card, and a +5 here would leave 2. blessResistBonusCoM2 and destructionBlessCoM2 are the live CoM2 arms, so the key is not dead in this version.',
    },
  },
  blessResistBonusMoM: {
    desc: 'MoM Bless vs Death Gaze −3: +3 res → effRes=5+3−3=5, pFail=0.5 → 5.0 death; +3 def vs the Death-realm gaze → physical 0.5×0.3×0.7³=0.051 = 5.051',
    version: V_MOM_131,
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { atk:0, def:0, res:5, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 5.051 },
  },
  blessResistBonusCoM2: {
    desc: 'CoM2 Bless +5 res vs Death Gaze −3: effRes=5+5−3=7, pFail=0.3 → 3.0. No hidden gaze strength: CoM2 stores stoning/death/doom gaze as three independent stats with no attack-strength slot, and the gaze fires without one.',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: -3 } },
    b: { atk:0, def:0, res:5, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blessBreathBonusWarlord: {
    desc: 'Warlord Bless gives NO def bonus vs a magical ranged unit attack: the same positive-spell-ID gate excludes every ApplyAttack unit channel. 7 hits − 0 = 7 dmg (a +7 here would leave 0)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:7, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Warlord\'s Bless defense half is closed for every unit attack channel, so the only feature the fixture adds cannot move the 7.',
      'b.ability.bless':
        'Keep, and the absence is the rule under test: the same positive-spell-ID gate excludes every ApplyAttack unit channel. A +7 here would leave 0.',
    },
  },
  blessFireBreathDefMoM: {
    desc: 'MoM Bless +3 def vs Fire Breath from a Normal unit: breath 7 − 3 = 4, melee 1 − 0 = 1 (bless n/a) → 5 dmg',
    version: V_MOM_131,
    a: { atk:1, rtbType:'fire', rtb:7, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blessFireBreathDefCoM: {
    desc: 'CoM 1 Bless +5 def vs Fire Breath: breath is ranged_type 101, the one attack class its defense half still covers. Breath 7 − 5 = 2, melee 1 − 0 = 1 → 3 dmg (5 in MoM)',
    version: V_COM,
    a: { atk:1, rtbType:'fire', rtb:7, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blessImmolationDefMoM: {
    desc: 'MoM Bless +3 def vs Immolation: the spell path enters the defense routine as ranged_type 38 and MoM puts no type gate on the Bless arm, so immolation def 1+3=4 blocks all 4 strength at 100% block. Melee 3 − 1 = 2 → 2 dmg (2.440 without Bless)',
    version: V_MOM_131,
    a: { atk:3, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:20, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.ability.immolation':
        'Keep. Inert as a consequence of the assertion: Bless takes the immolation Defense to 1 + 3 = 4, which blocks all four points of strength at a 100% To Block, so the immolation\'s own presence cannot move the melee 2 that is left. Bless is the live half at delta 0.44, and blessImmolationDefCoM is the CoM 1 arm where the bonus is not made at all.',
    },
  },
  blessImmolationDefCoM: {
    desc: 'CoM 1 Bless gives NO def bonus vs Immolation — a channel exclusion, not an inert fixture: CoM 1 gates the Bless arm on ranged_type > 39 and the spell-damage helper passes exactly 39. Immolation def stays 1 vs strength 10 at 100% block → 2.028, plus melee 3 − 1 = 2 → 4.028 (a +5 here would leave 2.012)',
    version: V_COM,
    a: { atk:3, toHitMod:70, hp:10, abilities: { immolation: true } },
    b: { atk:0, def:1, toBlkMod:70, hp:20, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 4.028 },
    vacuity: {
      'b.ability.bless':
        'Keep, and the absence is the rule under test - a channel exclusion, not an inert fixture: CoM 1 gates the Bless arm on ranged_type > 39 and the spell-damage helper passes exactly 39. Immolation is the live half at delta 2.028, and blessImmolationDefMoM is the MoM arm where the +3 does land, at 2.000 against this 4.028.',
    },
  },
  blessResistBonusWarlord: {
    desc: 'Warlord Bless +4 res vs Death Gaze −3: effRes=5+4−3=6, pFail=0.4 → 4.0. Bless\'s +7 Defense half does not touch gaze (HELP.TXT: fire/lightning and Chaos/Death damage spells only), and Warlord has no hidden gaze strength stat.',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: -3 } },
    b: { atk:0, def:0, res:5, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },

  // --- Elemental Armor / Resist Elements ---
  elemArmorMagicCRanged: {
    desc: 'Elemental Armor +10 def vs Chaos magic ranged: 10 hits vs def 0+10=10, 100% block → 0 dmg',
    a: { rtbType:'magic_c', rtb:10, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'elementalArmor' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  elemArmorMagicNRanged: {
    desc: 'Elemental Armor +10 def vs Nature magic ranged: 10 hits vs def 0+10=10, 100% block → 0 dmg',
    a: { rtbType:'magic_n', rtb:10, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'elementalArmor' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  elemArmorNotVsMagicS: {
    desc: 'Elemental Armor does NOT apply to Sorcery ranged: 5 hits vs def 0, 0 blocks → 5 dmg',
    a: { rtbType:'magic_s', rtb:5, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'elementalArmor' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Elemental Armor does not cover the Sorcery realm, so the only feature the fixture adds cannot move the 5.',
      'b.ability.elemArmor':
        'Keep, and the absence is the rule under test: the cover is realm-gated and Sorcery is outside it. elemArmorImmolationCoM is a live arm of the same ability elsewhere in the suite.',
    },
  },
  elemArmorNotMelee: {
    desc: 'Elemental Armor does NOT apply to melee: 10 hits vs def 0, no bonus → 10 dmg',
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'elementalArmor' } },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Elemental Armor does not reach melee at all, so the only feature the fixture adds cannot move the 10.',
      'b.ability.elemArmor':
        'Keep, and the absence is the rule under test: the cover is for elemental attack channels, and melee is not one. The discriminator is a.atk against the ranged siblings\' rtbType, which candidates() does not enumerate.',
    },
  },
  elemArmorFireBreath: {
    desc: 'Elemental Armor +10 def vs Fire Breath: 5 breath hits vs 10 def 100% block = 0; melee 1 hit vs 0 def = 1 total',
    a: { atk:1, rtbType:'fire', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'elementalArmor' } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  elemArmorLightningBreath: {
    desc: 'Elemental Armor +10 def vs Lightning Breath (intrinsic AP halves): floor((0+10)/2)=5 def, 10 hits − 5 blocks = 5 breath; melee 1 = 6 total',
    a: { atk:1, rtbType:'lightning', rtb:10, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20, abilities: { elemArmor: 'elementalArmor' } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  resistElementsMagicC: {
    desc: 'Resist Elements +3 def vs Chaos magic ranged: 5 hits vs def 0+3=3, 100% block → 2 dmg',
    a: { rtbType:'magic_c', rtb:5, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'resistElements' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  elemArmorNotCumulative: {
    desc: 'Elemental Armor supersedes Resist Elements: 15 hits vs def max(10,3)=10 → 5 dmg (not 2 if they stacked to 13)',
    a: { rtbType:'magic_c', rtb:15, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20, abilities: { elemArmor: 'elementalArmor' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  resistElementsNotVsMagicSMoM: {
    desc: 'MoM Resist Elements does NOT apply to Sorcery ranged: 5 hits vs def 0 → 5 dmg',
    a: { rtbType:'magic_s', rtb:5, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'resistElements' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Resist Elements does not cover the Sorcery realm, so the only feature the fixture adds cannot move the 5.',
      'b.ability.elemArmor':
        'Keep, and the absence is the rule under test, and the Resist Elements twin of elemArmorNotVsMagicS: the weaker protection is gated the same way. resistElementsWallOfFireCoM is a live arm of the same value elsewhere in the suite.',
    },
  },
  resistElementsFireBreathMoM: {
    desc: 'MoM Resist Elements +3 def vs Fire Breath: 5 breath vs def 3 → 2 dmg + 1 melee = 3 total',
    a: { atk:1, rtbType:'fire', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'resistElements' } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  resistElementsFireBreathCoM2: {
    desc: 'CoM2 Resist Elements +4 def vs Fire Breath: 5 breath vs def 4 → 1 dmg + 1 melee = 2 total',
    version: V_COM2,
    a: { atk:1, modernAttacks: { fireBreath: { strength:5, type:'fire' } }, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'resistElements' } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  resistElementsMagicRangedCoM2: {
    desc: 'CoM2 Resist Elements +4 def vs magic ranged: 5 hits vs def 4 → 1 dmg. The modern engine attaches no realm to a projectile, so this one case is the CoM2 endpoint of both MoM contrasts beside it: +4 against `resistElementsMagicC`\'s +3, and applying at all where `resistElementsNotVsMagicSMoM`\'s Sorcery arm is excluded.',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:5, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'resistElements' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  elemArmorMagicRangedCoM2: {
    desc: 'CoM2 Elemental Armor +12 def vs magic ranged: 5 hits vs def 12 → 0 dmg, where MoM\'s `elemArmorNotVsMagicS` takes nothing on the Sorcery realm its table has and the modern engine does not.',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:5, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { elemArmor: 'elementalArmor' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  // --- Eldritch Weapon ---
  eldritchWeaponMelee: {
    desc: 'Eldritch Weapon melee: toBlock 30% → 20% (1 shield, 20% block) → E[dmg]=0.800',
    a: { atk:1, toHitMod:70, hp:10, abilities: { eldritchWeapon: true } },
    b: { def:1, hp:10 },
    version: V_MOM_131,
    expected: { dmgToA: 0, dmgToB: 0.800 },
  },
  eldritchWeaponRangedMissile: {
    desc: 'Eldritch Weapon missile ranged: toBlock 30% → 20% (1 shield, 20% block) → E[dmg]=0.800',
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10, abilities: { eldritchWeapon: true } },
    b: { def:1, hp:10 },
    version: V_MOM_131,
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.800 },
  },
  eldritchWeaponWeaponUpgrade: {
    desc: 'Eldritch Weapon upgrades normal→magic: bypasses WI (def stays 5 not 10) + toBlock 20% → E[dmg]=4.000',
    a: { atk:5, toHitMod:70, hp:10, abilities: { eldritchWeapon: true } },
    b: { def:5, hp:10, abilities: { weaponImmunity: true } },
    version: V_MOM_131,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  eldritchWeaponRangedKeepsWI: {
    // Eldritch's magic-weapon upgrade is melee-only (MoM Eldritch Weapon page), so a bow
    // attack does NOT bypass Weapon Immunity: defense is raised 5→10. The -10% To Block
    // still applies (30%→20%). 5 hits vs 10 shields @20% block → E[dmg]≈3.007.
    // If Eldritch wrongly upgraded the ranged weapon (the old bug), WI would be bypassed
    // (def stays 5) and E[dmg] would be 4.000 instead.
    desc: 'Eldritch Weapon ranged does NOT bypass WI: def 5→10 (WI applies) + toBlock 20% → E[dmg]≈3.007',
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, abilities: { eldritchWeapon: true } },
    b: { def:5, hp:10, abilities: { weaponImmunity: true } },
    version: V_MOM_131,
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.007 },
  },

  // --- Giant Strength ---
  giantStrengthMelee: {
    desc: 'Giant Strength +1 melee: base 1 atk + GS → 2 atk, 100% hit vs 0 def → E[dmg]=2.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { giantStrength: true } },
    b: { hp:10 },
    version: V_MOM_131,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  giantStrengthThrown: {
    desc: 'Giant Strength +1 thrown: atk 1+1=2, thrown 1+1=2, 100% hit vs 0 def → E[dmg]=4.0 (thrown+melee)',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10, abilities: { giantStrength: true } },
    b: { hp:10 },
    version: V_MOM_131,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  giantStrengthNotMissile: {
    desc: 'Giant Strength does NOT boost missile ranged: base 1 + GS → still 1 rtb → E[dmg]=1.0',
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10, abilities: { giantStrength: true } },
    b: { hp:10 },
    version: V_MOM_131,
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Giant Strength does not reach the missile slot, so the only feature the fixture adds cannot move the 1.',
      'a.ability.giantStrength':
        'Keep, and the absence is the rule under test: the bonus goes to melee only. The discriminator is a.rtbType, which candidates() does not enumerate.',
    },
  },

  // --- Prayer ---
  prayerToHit: {
    desc: 'Prayer To Hit: 1 atk, base 30% + Prayer +10% = 40% hit vs 0 def → 0.4',
    a: { atk:1, hp:10, abilities: { prayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },
  prayerToHitRanged: {
    desc: 'Prayer To Hit Ranged: missile 1 atk, base 30% + Prayer +10% = 40% hit vs 0 def → 0.4',
    a: { rtbType:'missile', rtb:1, hp:10, abilities: { prayer: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },
  prayerToBlock: {
    desc: 'Prayer To Block: 1 atk 90% hit (v1.31 Prayer penalty) vs def 1, 40% block → 0.9×0.6 = 0.54',
    a: { atk:1, toHitMod:70, hp:10 },
    b: { def:1, hp:10, abilities: { prayer: true } },
    expected: { dmgToA: 0, dmgToB: 0.540 },
  },
  prayerResistance: {
    desc: 'Prayer Resistance: Poison 4 vs base res 5 + Prayer +1 = res 6, pFail 40%, E[dmg] = 1.6',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { prayer: true } },
    expected: { dmgToA: 0, dmgToB: 1.600 },
  },
  prayerEnemyMeleePenalty131: {
    desc: 'Prayer Enemy Melee Penalty (MoM 1.31): bug — B Prayer, A melee 30% → 20%. 1 atk vs 0 def → 0.2',
    version: V_MOM_131,
    a: { atk:1, hp:10 },
    b: { hp:10, abilities: { prayer: true } },
    expected: { dmgToA: 0, dmgToB: 0.200 },
  },
  prayerEnemyPenaltyNotRanged131: {
    desc: 'Prayer Enemy Ranged Penalty (MoM 1.31): enemy penalty does NOT apply to ranged. Missile 1 atk 30% → still 0.3',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10, abilities: { prayer: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that 1.31\'s enemy penalty does not reach a ranged attack, so the only feature the fixture adds cannot move the 0.300.',
      'b.ability.prayer':
        'Keep, and the absence is the rule under test: the penalty is charged against melee only in 1.31. The discriminator is a.rtbType, which candidates() does not enumerate, and prayerEnemyPenaltyRemovedPatched is the CP arm where even the melee penalty is gone.',
    },
  },
  prayerEnemyPenaltyRemovedPatched: {
    desc: 'Prayer Enemy Melee Penalty (MoM CP 1.60): fix — enemy penalty removed. 1 atk 30% vs Prayer → still 0.3',
    version: V_MOM_CP,
    a: { atk:1, hp:10 },
    b: { hp:10, abilities: { prayer: true } },
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CP 1.60 removed the enemy penalty entirely, so the only feature the fixture adds cannot move the 0.300.',
      'b.ability.prayer':
        'Keep, and the absence is the rule under test: this is a melee card, where 1.31 does charge the penalty, so the version is the discriminator. version-dead is literally true and uninformative: this is the only mom_cp_1.60.00 preset that configures prayer at all, so CP\'s positive Prayer behaviour is unasserted.',
    },
  },

  // --- High Prayer ---
  highPrayerMeleeAtk: {
    desc: 'High Prayer Melee Atk: base 1 atk + HP +2 = 3 atk, 100% hit vs 0 def → 3 dmg',
    a: { atk:1, toHitMod:70, hp:10, abilities: { highPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  highPrayerDefense: {
    desc: 'High Prayer Defense: missile 4 100% hit vs base def 1 + HP +2 = 3, 100% block → 4−3 = 1 (def 2 would give 2)',
    a: { rtbType:'missile', rtb:4, toHitRtbMod:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:10, abilities: { highPrayer: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  highPrayerResistance: {
    desc: 'High Prayer Resistance: Poison 4 vs base res 5 + HP +3 = res 8, pFail 20%, E[dmg] = 0.8',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { highPrayer: true } },
    expected: { dmgToA: 0, dmgToB: 0.800 },
  },
  highPrayerToHit: {
    desc: 'High Prayer To Hit: missile 1, base 30% + HP +10% = 40% hit vs 0 def → 0.4 (ranged isolates from +2 melee)',
    a: { rtbType:'missile', rtb:1, hp:10, abilities: { highPrayer: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },
  highPrayerToBlock: {
    desc: 'High Prayer To Block: missile 10 100% hit vs def 8 + HP +2 = 10, 40% block → 10−4 = 6.0 (30% would give 7.0)',
    a: { rtbType:'missile', rtb:10, toHitRtbMod:70, hp:10 },
    b: { def:8, hp:20, abilities: { highPrayer: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  highPrayerMeleeNotRanged: {
    desc: 'High Prayer +2 melee does NOT boost ranged: missile 3, 100% hit, HP → still 3 (not 5)',
    a: { rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10, abilities: { highPrayer: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that High Prayer\'s +2 melee does not reach the ranged slot, so the only feature the fixture adds cannot move the 3.',
      'a.ability.highPrayer':
        'Keep, and the absence is the rule under test. The discriminator is a.rtbType, which candidates() does not enumerate; highPrayerMeleeAtk is the melee arm where the +2 does land.',
    },
  },
  highPrayerCombined: {
    desc: 'High Prayer combined: atk 3+2=5 at 40% (30+10) vs 0 def → 5×0.4 = 2.0',
    a: { atk:3, hp:10, abilities: { highPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },

  // --- Warlord: Prayer + High Prayer stacking ---
  warlordPrayerStackAtk: {
    desc: 'Warlord Prayer+HP stack: atk 1 + HP +2 + Prayer +1 = 4, 100% hit vs 0 def → 4.0 (CoM2 would be 3.0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { prayer: true, highPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  warlordPrayerStackDef: {
    desc: 'Warlord Prayer+HP stack: atk 5 100% hit vs def 1 + HP +2 + Prayer +1 = 4, 100% block → 5−4 = 1.0 (CoM2 def 3 → 2.0). the 0.4 counterattack is the F142 rule: the High Prayer +2 melee is the compiled region-c block and keeps its `B.attack > 0` gate, so it is skipped, while the Prayer Warlord top-up (UnitCalcPre.CAS:1487) is ungated and lands — permanent melee 0 becomes 1, at 30+10 = 40%',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:20, abilities: { prayer: true, highPrayer: true } },
    expected: { dmgToA: 0.400, dmgToB: 1.000 },
  },
  warlordPrayerStackRes: {
    desc: 'Warlord Prayer+HP stack: Poison 5 vs base res 5 + HP +3 + Prayer +1 = res 9 (CoM2 −1 mod → eff 8), pFail 20%, poison E[dmg] = 1.0. Melee dmg = 0 (atk 1 vs def 10, all blocked). (CoM2 no stack: res 8 → eff 7 → pFail 30% → 1.5). the 0.4 counterattack is the F142 rule: the High Prayer +2 melee is the compiled region-c block and keeps its `B.attack > 0` gate, so it is skipped, while the Prayer Warlord top-up (UnitCalcPre.CAS:1487) is ungated and lands — permanent melee 0 becomes 1, at 30+10 = 40%',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 5 } },
    b: { def:10, toBlkMod:70, res:5, hp:10, abilities: { prayer: true, highPrayer: true } },
    expected: { dmgToA: 0.400, dmgToB: 1.000 },
  },
  warlordPrayerStackToHitNoStack: {
    desc: 'Warlord Prayer+HP stack: To Hit does NOT stack. atk 1 + HP+2 + Prayer+1 = 4, base 30% + 10% (single bonus) = 40% vs 0 def → 4×0.4 = 1.6 (stacked 50% would give 2.0)',
    version: V_WARLORD,
    a: { atk:1, hp:10, abilities: { prayer: true, highPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.600 },
  },
  warlordPrayerStackToBlockNoStack: {
    desc: 'Warlord Prayer+HP stack: To Block does NOT stack. atk 10 100% hit vs def 0 + HP +2 + Prayer +1 = 3, base 30% + 10% (single bonus) = 40% block → 10 − 3×0.4 = 8.80 (stacked 50% would be 8.50). the 0.4 counterattack is the F142 rule: the High Prayer +2 melee is the compiled region-c block and keeps its `B.attack > 0` gate, so it is skipped, while the Prayer Warlord top-up (UnitCalcPre.CAS:1487) is ungated and lands — permanent melee 0 becomes 1, at 30+10 = 40%',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, hp:20, abilities: { prayer: true, highPrayer: true } },
    expected: { dmgToA: 0.400, dmgToB: 8.800 },
  },
  com2PrayerHpSupersedes: {
    desc: 'CoM2 Prayer+HP: HP supersedes (no stack). atk 1 + HP +2 = 3 (Prayer adds nothing), 40% hit vs 0 def → 1.2',
    version: V_COM2,
    a: { atk:1, hp:10, abilities: { prayer: true, highPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.200 },
    vacuity: {
      'a.ability.prayer':
        'Keep, and the absence is the rule under test: High Prayer supersedes Prayer rather than stacking with it, so removing Prayer leaves the same 1.2. High Prayer is the live half at delta 0.8 - ablating it drops both the +2 attack and the To Hit step, to 0.4. This card measures the To Hit arm; prayerHpStackPairCoM2 measures the attack arm at a 100% hit.',
    },
  },
  prayerHpStackPairCoM2: {
    desc: 'Prayer+HP atk pair (CoM2): HP supersedes, atk 1 + 2 = 3, 100% hit vs 0 def → 3.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { prayer: true, highPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.prayer':
        'Keep, and the absence is the rule under test: the attack arm of the same supersession com2PrayerHpSupersedes states, measured at a 100% To Hit so the attack value is the whole of it. High Prayer is the live half at delta 2, taking atk 1 to 3 rather than the 5 a stacking pair would give.',
    },
  },
  prayerHpStackPairWarlord: {
    desc: 'Prayer+HP atk pair (Warlord): stack, atk 1 + HP+2 + Prayer+1 = 4, 100% hit vs 0 def → 4.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { prayer: true, highPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },

  // --- Black Prayer ---
  blackPrayerAtkPenalty: {
    desc: 'Black Prayer Atk: base 2 atk − 1 = 1, 100% hit vs 0 def → 1 dmg',
    a: { atk:2, toHitMod:70, hp:10, abilities: { blackPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  blackPrayerDefPenalty: {
    desc: 'Black Prayer Def: 2 atk 100% hit vs base def 2 − 1 = 1, 100% block → 1 dmg',
    a: { atk:2, toHitMod:70, hp:10 },
    b: { def:2, toBlkMod:70, hp:10, abilities: { blackPrayer: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  blackPrayerResPenalty: {
    desc: 'Black Prayer Res: 1 atk (100% blocked: def 2−1=1 at 100%) + Poison 4 vs res 5−2=3, pFail 70%, E[dmg] = 2.8',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:2, toBlkMod:70, res:5, hp:10, abilities: { blackPrayer: true } },
    expected: { dmgToA: 0, dmgToB: 2.800 },
  },
  blackPrayerRangedAtk: {
    desc: 'Black Prayer Ranged Atk: base 2 missile − 1 = 1, 100% hit vs 0 def → 1 dmg',
    a: { rtbType:'missile', rtb:2, toHitRtbMod:70, hp:10, abilities: { blackPrayer: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  blackPrayerThrownAtk: {
    desc: 'Black Prayer Thrown Atk: base thrown 2 − 1 = 1, 100% hit vs 0 def → 1 thrown + base melee 2 − 1 = 1 at 100% hit → 2 total',
    a: { atk:2, rtbType:'thrown', rtb:2, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { blackPrayer: true } },
    b: { atk:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  blackPrayerDoomGazeUnchangedCoM2: {
    desc: 'Black Prayer (CoM2) does not write the independent Doom Gaze field: Doom Gaze 5 still deals 5 damage.',
    version: V_COM2,
    a: { atk:0, hp:10, abilities: { blackPrayer: true, doomGaze: 5 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'a.ability.blackPrayer':
        'Keep, and the absence is the rule under test: CoM2 carries Doom Gaze in an independent field, which Black Prayer does not write, so the gaze is untouched. The gaze half is live at delta 5.',
    },
  },
  fieryFuryApotheosisTakesBaseFantasticArmWarlord: {
    desc: 'Fiery Fury branches once, on `IF (BASEFANTASTIC(U))` (UnitCalcPre.CAS:834), and that is the permanent record: Apotheosis writes `B.Fantastic := True` at $0059A390 into BaseUnits. So a unit trained as a regular one takes the THEN arm — First Strike and the Chaos realm — instead of the regular-unit package. A kills B (melee 5 doubled to 10 vs 8 HP) before B can counter, so B deals 0. Taking the ELSE arm instead gave +3 melee before the doubling, 16 rather than 10 and no First Strike, so B still countered — 5 melee at the default 30% block against the +4 Defense Apotheosis gives A, for 3.8. Both arms cap dmgToB at B\'s 8 HP, which is why the discriminating number is dmgToA.',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { fieryFury: true, apotheosis: true } },
    b: { atk:5, hitChance:70, def:0, hp:8 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  fieryFuryUsesBaseFantasticForFirstStrikeWarlord: {
    desc: 'Fiery Fury uses BASEFANTASTIC: a base regular Combat Summoned unit receives the +3 regular-unit melee package but not First Strike, so B still counters for 5. A live-Fantastic gate would incorrectly prevent the counter.',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { fieryFury: true, combatSummoned: true } },
    b: { atk:5, hitChance:70, def:0, hp:8 },
    expected: { dmgToA: 5.000, dmgToB: 8.000 },
  },
});
