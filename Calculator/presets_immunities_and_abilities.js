// Numeric presets. Weapon, Missile and Fire Immunity, Cause Fear, Illusion and Invisibility,
// and the modern unit abilities from Doom Damage through Fortification.
definePresets({
  // --- Weapon Immunity (MoM 1.31) ---
  weaponImmunityMelee: {
    desc: 'Weapon Immunity Melee (MoM 1.31): normal melee vs WI (def 0→10), 100% block → all 10 hits blocked',
    version: V_MOM_131,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  weaponImmunityMagicWeapon: {
    desc: 'Weapon Immunity bypassed by magic weapon: 10 hits vs 0 def → full damage',
    a: { atk:10, toHitMod:70, hp:10, weapon: 'magic' },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 10 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: a non-normal weapon fails the test at combat_special_attacks.js:601, so no Weapon Immunity marker is set and the floor of 10 at combat_effects.js:826 never runs. a.weapon=magic is the live half - ablating it restores exactly weaponImmunityMelee\'s card, which pins 0 against this 10.',
    },
  },
  weaponImmunityFantastic: {
    desc: 'Weapon Immunity bypassed by fantastic unit: 10 hits vs 0 def → full damage',
    a: { atk:10, toHitMod:70, hp:10, unitType: 'fantastic_chaos' },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 10 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: the marker is offered only against a Normal-type attacker (combat_special_attacks.js:602), so a fantastic attacker never sets it and the floor of 10 at combat_effects.js:826 never runs. The unit type is the live half - ablating it restores exactly weaponImmunityMelee\'s card, which pins 0 against this 10.',
    },
  },
  weaponImmunityHero: {
    desc: 'Weapon Immunity bypassed by hero: 10 hits vs 0 def → full damage',
    a: { atk:10, toHitMod:70, hp:10, unitType: 'hero' },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 10 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: a hero is not a Normal-type attacker, so the same test at combat_special_attacks.js:602 that weaponImmunityFantastic takes on the fantastic side refuses the marker here and the floor of 10 never runs. a.unitType=hero is the live half - ablating it restores exactly weaponImmunityMelee\'s card, which pins 0 against this 10.',
    },
  },
  weaponImmunityCounter: {
    desc: 'Weapon Immunity on attacker: A has WI (def 0→10), B normal counter 10 atk all blocked',
    a: { atk:1, toHitMod:70, def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    b: { atk:10, toHitMod:70, def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1 },
  },
  weaponImmunityThrown131: {
    desc: 'Weapon Immunity vs Thrown (MoM 1.31): bug — thrown ignores WI → def stays 0, all 10 thrown hits land; melee 1 hit blocked by WI def 10',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:10, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:20, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 10 },
  },
  weaponImmunityRangedMissile: {
    desc: 'Weapon Immunity applies to ranged missile: def 0→10, 100% block → all hits blocked',
    a: { rtbType:'missile', rtb:10, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  weaponImmunityRangedMagic: {
    desc: 'Weapon Immunity does not apply to ranged magic: 10 hits vs 0 def → full damage',
    a: { rtbType:'magic_c', rtb:10, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 10 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Weapon Immunity does not reach a magic ranged attack, so the only feature the fixture adds cannot move the number. The discriminator is a.rtbType, which candidates() does not enumerate.',
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: the ranged branch offers the marker only for a physical shot - missile or boulder (combat_effects.js:964, 983) - and magic_c is neither. weaponImmunityRangedMissile differs only in a.rtbType and pins 0 against this 10.',
    },
  },
  // --- Weapon Immunity (version-specific) ---
  weaponImmunityThrownPatched: {
    desc: 'Weapon Immunity vs Thrown (MoM CP 1.60): fix — thrown triggers WI (def 0→10), 100% block → all thrown + melee blocked',
    version: V_MOM_CP,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:10, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  weaponImmunityCom2Melee: {
    desc: 'Weapon Immunity Melee (CoM2): normal melee vs WI → def 0+8=8, 100% block → only 8 hits blocked',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 2 },
  },
  weaponImmunityWarlordMelee: {
    desc: 'Weapon Immunity Melee (Warlord): normal melee vs WI → def 0+10=10, 100% block → all 10 hits blocked',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  weaponImmunityAfterMissileImmunityCoM2: {
    desc: 'EffectiveDefense order: Missile Immunity replaces the accumulated defense with 100, then Weapon Immunity adds 8. Modern defense rolls only the first 15 dice at To Block and the rest at 30%, so 108 defense blocks 15 + 93×0.3 = 42.9 of 70 missile hits → 27.1; the 100-final chain blocks 40.5 and leaks 29.5.',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:70, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:70, abilities: { missileImmunity: true, weaponImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 27.100 },
  },
  weaponImmunityGeneric131: {
    desc: 'Weapon Immunity vs Generic unit (MoM 1.31): bug — WI bypassed, def stays 0, 6 atk 30% hit → 1.8 dmg',
    version: V_MOM_131,
    aUnitName: 'Trireme',
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 1.800 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that a generic hull bypasses Weapon Immunity in 1.31, so the only feature the fixture adds cannot move the number. The discriminator is aUnitName, which candidates() does not reach.',
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: 1.31 marks generic hulls as carrying a magical weapon, so the marker is refused at combat_special_attacks.js:605 and the floor of 10 at combat_effects.js:826 never runs. weaponImmunityGenericPatched is the same card in CP 1.60, where that gate is gone, and pins 0 against this 1.800.',
    },
  },
  weaponImmunityGenericPatched: {
    desc: 'Weapon Immunity vs Generic unit (MoM CP 1.60): fix — WI applies, def 0→10, 100% block → 0 dmg',
    version: V_MOM_CP,
    aUnitName: 'Trireme',
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  weaponImmunityGenericCatapult131: {
    desc: 'Weapon Immunity vs Generic Catapult boulder (MoM 1.31): bug — WI bypassed, def stays 0, 10 boulder 30% hit → 3.0 dmg',
    version: V_MOM_131,
    aUnitName: 'Catapult',
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that a generic hull bypasses Weapon Immunity in 1.31 on the ranged path too, so the only feature the fixture adds cannot move the number. The discriminator is aUnitName, which candidates() does not reach.',
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: a boulder is a physical shot and passes the ranged branch\'s own test (combat_effects.js:964, 983), so it is the generic gate at combat_special_attacks.js:605 alone that refuses the marker here. weaponImmunityGenericCatapultPatched is the same card in CP 1.60, where that gate is gone, and pins 0 against this 3.000.',
    },
  },
  weaponImmunityGenericCatapultPatched: {
    desc: 'Weapon Immunity vs Generic Catapult boulder (MoM CP 1.60): fix — WI applies, def 0→10, 100% block → 0 dmg',
    version: V_MOM_CP,
    aUnitName: 'Catapult',
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },

  // --- Missile Immunity ---
  missileImmunityMissile: {
    desc: 'Missile Immunity vs Missile: def 2→50, 3 atk 100% hit → all blocked (50 def × 100% block)',
    a: { rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:2, toBlkMod:70, hp:10, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  missileImmunityBoulder: {
    desc: 'Missile Immunity does NOT apply to boulder: def stays 2, 3 atk 100% hit → 1 dmg',
    a: { rtbType:'boulder', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:2, toBlkMod:70, hp:10, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Missile Immunity does not cover a boulder, so the only feature the fixture adds cannot move the number. The discriminator is a.rtbType, which candidates() does not enumerate.',
      'b.ability.missileImmunity':
        'Keep, and the absence is the rule under test: the immunity mask reads missileAttack, which the ranged branch sets from rangedType === \'missile\' alone (combat_effects.js:963, 980), so a boulder never opens the missile arm at combat_effects.js:781 and the defense stays at its own 2. missileImmunityMissile differs only in a.rtbType and pins 0 against this 1.000.',
    },
  },
  missileImmunityMagic: {
    desc: 'Missile Immunity does NOT apply to magic ranged: def stays 0, 3 atk 100% hit → 3 dmg',
    a: { rtbType:'magic_c', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Missile Immunity does not cover a magic ranged attack, so the only feature the fixture adds cannot move the number. The discriminator is a.rtbType, which candidates() does not enumerate.',
      'b.ability.missileImmunity':
        'Keep, and the absence is the rule under test: magic_c is not a missile, so missileAttack stays false (combat_effects.js:963, 980) and the mask arm at combat_effects.js:781 never opens. missileImmunityMissile is the positive arm at the same shot strength, though not a one-value sibling - it also sets b.def 2.',
    },
  },
  missileImmunityMelee: {
    desc: 'Missile Immunity does NOT apply to melee: def stays 0, 3 atk 100% hit → 3 dmg',
    a: { atk:3, toHitMod:70, hp:10, abilities: {} },
    b: { def:0, toBlkMod:70, hp:10, abilities: { missileImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Missile Immunity does not reach a melee attack, so the only feature the fixture adds cannot move the number. The discriminator is that the attacker has melee only, which candidates() does not enumerate.',
      'b.ability.missileImmunity':
        'Keep, and the absence is the rule under test: the mask is gated on isRanged before it looks at any immunity bit (combat_effects.js:780), and the melee branch builds a descriptor that sets neither isRanged nor missileAttack (combat_effects.js:952-961). missileImmunityMissile is the positive arm, though not a one-value sibling - it also sets b.def 2.',
    },
  },
  missileImmunityArmorPiercing: {
    desc: 'Missile Immunity after Armor Piercing: AP halves first, then MI raises to 50 → all blocked',
    a: { rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10, abilities: { armorPiercing: true } },
    b: { def:6, toBlkMod:70, hp:10, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },

  missileImmunityWIOverwrite131: {
    desc: 'WI+MI vs Missile (MoM 1.31): bug — WI overwrites MI, def=10 not 50. 15 hits − 10 blocks = 5',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:15, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20, abilities: { weaponImmunity: true, missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.ability.missileImmunity':
        'Keep, and the absence is the rule under test: 1.31 runs immunityMask before weaponImmunityMark (combat_effects.js:846-847), and both write the single defenseSpecial slot, so the Weapon marker replaces the Missile one and the immunity\'s 50 is never cashed in - what is left is the floor of 10 (combat_effects.js:853). The immunity has to be on the card for the overwrite to be what is measured. missileImmunityWIOverwriteFixed is the same card in CP 1.60, which orders the two writes the other way (combat_effects.js:860-861), and pins 0 against this 5.000.',
    },
  },
  missileImmunityWIOverwriteFixed: {
    desc: 'WI+MI vs Missile (MoM CP 1.60): fix — MI wins, def=50. 15 hits all blocked',
    version: V_MOM_CP,
    a: { rtbType:'missile', rtb:15, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20, abilities: { weaponImmunity: true, missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  missileImmunityWraithFormOverwrite131: {
    desc: 'Wraith Form WI+MI vs Missile (MoM 1.31): WI overwrites MI, def=10. 15 hits − 10 blocks = 5',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:15, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20, abilities: { wraithForm: true, missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.ability.missileImmunity':
        'Keep, and the absence is the rule under test: Wraith Form carries the Weapon Immunity effect (combat_special_attacks.js:570-573), so 1.31\'s marker order (combat_effects.js:846-847) clobbers the Missile marker here exactly as a written-out Weapon Immunity does, and the immunity has to be present for that to be what is measured. missileImmunityWIOverwrite131 differs only in that ability and pins the same 5.000, which is the control.',
    },
  },
  missileImmunityInvulnerabilityOverwrite131: {
    desc: 'Invulnerability WI+MI vs Missile (MoM 1.31): WI overwrites MI, def=10; Invulnerability absorbs 2 of 5 damage',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:15, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20, abilities: { invulnerability: true, missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'b.ability.missileImmunity':
        'Keep, and the absence is the rule under test: Invulnerability carries the Weapon Immunity effect (combat_special_attacks.js:570-573), so 1.31\'s marker order (combat_effects.js:846-847) clobbers the Missile marker as it does for a written-out Weapon Immunity, and the immunity has to be present for that to be what is measured. missileImmunityWIOverwrite131 differs only in that ability and pins 5.000; the 2 between them is Invulnerability\'s own absorption, which is the second half of this fixture.',
    },
  },
  missileImmunityGenericKeepsMI131: {
    desc: 'WI+MI vs Generic missile (MoM 1.31): Generic bypasses WI, so MI remains def=50 and blocks the shot',
    version: V_MOM_131,
    aUnitName: 'Galley',
    b: { def:0, toBlkMod:70, hp:20, abilities: { weaponImmunity: true, missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  missileImmunityWIMagicWeapon: {
    desc: 'WI+MI vs magic weapon missile → WI bypassed, MI still applies, def=50. All blocked',
    a: { rtbType:'missile', rtb:15, toHitRtbMod:70, hp:10, weapon:'magic' },
    b: { def:0, toBlkMod:70, hp:20, abilities: { weaponImmunity: true, missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },

  // --- Guardian Wind ---
  guardianWindBlocksMissile: {
    desc: 'Guardian Wind grants Missile Immunity: missile 3 vs def 2 + Guardian Wind → def raised to 50, all blocked',
    a: { rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:2, toBlkMod:70, hp:10, abilities: { guardianWind: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },

  // --- Fire Immunity ---
  fireImmunityFireBreath: {
    desc: 'Fire Immunity vs Fire Breath: breath 5 at 100% vs FI def 50 → blocked; melee 5 at 100% vs def 2 → 3 dmg',
    a: { atk:5, rtbType:'fire', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { fireImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  fireImmunityNotMelee: {
    desc: 'Fire Immunity does NOT apply to melee: def stays 0, 3 atk 100% hit → 3 dmg',
    a: { atk:3, toHitMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { fireImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Fire Immunity does not reach a melee attack, so the only feature the fixture adds cannot move the number. The discriminator is that the attacker has melee only, which candidates() does not enumerate.',
      'b.ability.fireImmunity':
        'Keep, and the absence is the rule under test: the mask is gated on isRanged before it looks at any immunity bit (combat_effects.js:780), and the melee branch sets neither isRanged nor fireAttack (combat_effects.js:952-961). fireImmunityFireBreath is the positive arm and carries the same contrast inside one card - its breath is blocked while its melee lands against the defender\'s own 2.',
    },
  },
  fireImmunityNotThrown: {
    desc: 'Fire Immunity does NOT apply to thrown: def stays 0, 1+3 thrown+melee 100% hit → 4 dmg',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:3, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { fireImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Fire Immunity does not reach a physical Thrown attack, so the only feature the fixture adds cannot move the number. The discriminator is a.rtbType, which candidates() does not enumerate.',
      'b.ability.fireImmunity':
        'Keep, and the absence is the rule under test: the thrown branch sets fireAttack only for a fire breath (combat_effects.js:987, 998), so a plain Thrown leaves the fire arm of the mask (combat_effects.js:782) shut and both the thrown 3 and the melee 1 land. fireImmunityFireBreath is the positive arm, though not a one-value sibling - it also differs in the attack strengths and in b.def.',
    },
  },
  fireImmunityNotMissile: {
    desc: 'Fire Immunity does NOT apply to missile ranged: def stays 0, 3 atk 100% hit → 3 dmg',
    a: { rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { fireImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Fire Immunity does not reach a missile, so the only feature the fixture adds cannot move the number. The discriminator is a.rtbType, which candidates() does not enumerate.',
      'b.ability.fireImmunity':
        'Keep, and the absence is the rule under test: the ranged branch never sets fireAttack at all (combat_effects.js:971-984), so a missile can only open the mask\'s missile arm, never the fire arm at combat_effects.js:782. missileImmunityMissile shoots the identical attacker into the arm that does open and pins 0, though it is not a one-value sibling - it also sets b.def 2.',
    },
  },
  fireImmunityAfterArmorPiercing: {
    desc: 'Fire Immunity after Armor Piercing: AP halves def 6→3, then Fire Immunity assigns 50, so breath 70 deals 20. The assignment is absolute, not a raise — measured, a defender at def 6, 60 or 100 all end at 50 — so removing Armor Piercing leaves 20 as well, and no fixture can make its presence move this number. What the size does prove is the order: Armor Piercing applied *after* Fire Immunity would halve the 50 and the same breath would deal 45, which is what the same shot deals against a plain def 25. The earlier 5-strength breath against a 10 HP defender printed 0 under both orders and could not fail. Armor Piercing is live in the same setup without Fire Immunity: 67 against 64.',
    a: { atk:0, rtbType:'fire', rtb:70, toHitRtbMod:70, hp:10, abilities: { armorPiercing: true } },
    b: { atk:0, def:6, toBlkMod:70, hp:200, abilities: { fireImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 20.000 },
    vacuity: {
      'a.ability.armorPiercing':
        'Keep, and the absence is the rule under test: the Fire Immunity marker is cashed in by an outright assignment, u.effectiveDefense = ctx.defenseSpecialValue (combat_effects.js:834), and 1.31 runs that step after the halving at combat_effects.js:822 - the list orders armorPiercing at combat_effects.js:852 ahead of defenseSpecial at 854. Whatever Armor Piercing wrote is discarded, so on any card where the marker is set its presence cannot move the number. The size is what pins that order: halving the assigned 50 instead would leave 25 and let the 70-strength breath deal 45.',
    },
  },
  fireImmunityIllusionOverrides: {
    desc: 'Illusion overrides Fire Immunity: FI sets def to 50, then Illusion sets to 0 → full breath damage',
    a: { atk:1, rtbType:'fire', rtb:5, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { illusion: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:10, abilities: { fireImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'b.ability.fireImmunity':
        'Keep, and the absence is the rule under test: the Illusion step zeroes the defense and stops the sequence - u.effectiveDefense = 0; return HALT (combat_effects.js:768), which runStatSteps breaks on (steps.js:750) - and every DOS list places it ahead of the immunity mask (combat_effects.js:844 before 846, :858 before 861, :872 before 875), so Fire Immunity never reaches a write of its own. The immunity has to be on the card for the override to be what is measured; a.ability.illusion is the live half.',
    },
  },

  // --- Cause Fear (v1.31 buggy behavior) ---
  fearBasic: {
    desc: 'Cause Fear Attacker (MoM 1.31): bug — A fears B (50%) + self-fear bug. E[A unfeared]=3.5 → E[dmgB]=10.5, E[B unfeared]=0.5 → E[dmgA]=1.5',
    version: V_MOM_131,
    a: { figs:4, atk:3, toHitMod:70, hp:10, abilities: { fear: true } },
    b: { atk:3, toHitMod:70, hp:20, def:0, res:5 },
    expected: { dmgToA: 1.500, dmgToB: 10.500 },
  },
  fearDefenderNoop: {
    desc: 'Cause Fear Defender (MoM 1.31): bug — defending Fear has no effect. Both do 5 dmg normally',
    version: V_MOM_131,
    a: { atk:5, toHitMod:70, hp:10, res:5 },
    b: { atk:5, toHitMod:70, hp:10, def:0, res:5, abilities: { fear: true } },
    expected: { dmgToA: 5.000, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that a defending unit\'s Cause Fear does nothing in this build, so the only feature the fixture adds cannot move the number. The discriminator is the version, which candidates() does not enumerate.',
      'b.ability.fear':
        'Keep, and the absence is the rule under test: aFearedByB is bFear && opts.version !== \'mom_1.31\' (combat.js:190), so B\'s Cause Fear is silenced in this build and only the phase row survives it (combat.js:193). The expectation is what catches a build that let it through: A carries Resistance 5, so a live defender fear would fail its roll half the time and cut the 5.000 A deals.',
    },
  },
  fearDeathImmune: {
    desc: 'Cause Fear vs Death Immunity: fear blocked, both do 5 dmg normally',
    a: { atk:5, toHitMod:70, hp:10, abilities: { fear: true } },
    b: { atk:5, toHitMod:70, hp:10, def:0, abilities: { deathImmunity: true } },
    expected: { dmgToA: 5.000, dmgToB: 5.000 },
    vacuity: {
      'a.ability.fear':
        'Keep, and the absence is the rule under test: fearFailProb returns 0 for a Death-Immune target before any roll (combat_fear_and_touch.js:24), so A\'s Cause Fear moves nothing. It also leaves A itself unfeared, because 1.31\'s self-fear bug arms only while that probability is positive (combat.js:191) - which is what the 5.000 on the attacker side pins. b.ability.deathImmunity is the live half.',
    },
  },
  fearMagicImmune: {
    desc: 'Cause Fear vs Magic Immunity: fear blocked, both do 5 dmg normally',
    a: { atk:5, toHitMod:70, hp:10, abilities: { fear: true } },
    b: { atk:5, toHitMod:70, hp:10, def:0, abilities: { magicImmunity: true } },
    expected: { dmgToA: 5.000, dmgToB: 5.000 },
    vacuity: {
      'a.ability.fear':
        'Keep, and the absence is the rule under test: Magic Immunity is never tested inside fearFailProb; it arrives as the +30 on the death-realm resistance (combat_effects.js:540, in this build\'s list at combat_effects.js:572), which clears the effectiveRes >= 10 return (combat_fear_and_touch.js:26). So A\'s Cause Fear moves nothing, and with that probability at zero the 1.31 self-fear bug does not arm either (combat.js:191) - the 5.000 on the attacker side is that second half. b.ability.magicImmunity is the live half.',
    },
  },
  fearNotRanged: {
    desc: 'Cause Fear does not apply to ranged attacks: 5 missile 100% hit → 5 dmg',
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, abilities: { fear: true } },
    b: { def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Cause Fear does not reach a ranged exchange, so the only feature the fixture adds cannot move the number. The discriminator is rangedCheck, which candidates() does not enumerate.',
      'a.ability.fear':
        'Keep, and the absence is the rule under test: both Cause Fear reads are gated on !isRanged (combat.js:173-174), so a ranged exchange never computes a fear probability at all and the missile 5 stands undiminished. fearBasic is the positive arm in the same build, though not a one-value sibling - it is a four-figure melee card.',
    },
  },

  // --- Illusion ---
  illusionMelee: {
    desc: 'Illusion Melee: 5 atk 30% hit vs def 6 → def becomes 0, E[dmg] = 5×0.3 = 1.5',
    a: { atk:5, hp:10, abilities: { illusion: true } },
    b: { def:6, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.500 },
  },
  illusionRanged: {
    desc: 'Illusion Ranged: missile 5 atk 30% hit vs def 6 → def becomes 0, E[dmg] = 5×0.3 = 1.5',
    a: { rtbType:'missile', rtb:5, hp:10, abilities: { illusion: true } },
    b: { def:6, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.500 },
  },
  illusionThrown: {
    desc: 'Illusion Thrown: thrown 5 + melee 1, 30% hit vs def 6 → def becomes 0, E[dmg] = 6×0.3 = 1.8',
    a: { atk:1, rtbType:'thrown', rtb:5, hp:10, abilities: { illusion: true } },
    b: { atk:0, def:6, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.800 },
  },
  illusionCounter: {
    desc: 'Illusion on defender: B counter ignores A def 6. A 1atk all blocked; B 5atk 30% hit → E[counter] = 1.5',
    a: { atk:1, toHitMod:70, def:6, hp:10 },
    b: { atk:5, def:1, toBlkMod:70, hp:10, abilities: { illusion: true } },
    expected: { dmgToA: 1.500, dmgToB: 0 },
  },
  illusionImmunityNegates: {
    desc: 'Illusion Immunity: 5 atk 30% hit vs def 6 + Illusion Immunity → def stays 6, normal damage',
    a: { atk:5, hp:10, abilities: { illusion: true } },
    b: { def:6, hp:10, abilities: { illusionImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0.449 },
    vacuity: {
      'a.ability.illusion':
        'Keep, and the absence is the rule under test: the Illusion step is gated on the target not carrying Illusion Immunity (combat_effects.js:769), so the zeroing at combat_effects.js:768 never runs and the defender keeps its own 6. illusionMelee is the same card without the immunity and pins 1.500 against this 0.449.',
    },
  },
  trueSightNegatesIllusion: {
    desc: 'True Sight grants Illusion Immunity: 5 atk 100% hit vs def 6 + True Sight 100% block → def stays 6, 0 dmg (would be 5 if True Sight didn\'t grant immunity)',
    a: { atk:5, toHitMod:70, hp:10, abilities: { illusion: true } },
    b: { def:6, toBlkMod:70, hp:10, abilities: { trueSight: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.illusion':
        'Keep, and the absence is the rule under test: True Sight sets Illusion Immunity in region c - u.illusionImmunity = true (stats_sequence.js:991) - and the Illusion step is gated on the target not carrying it (combat_effects.js:769), so the zeroing at combat_effects.js:768 never runs and the defender keeps its own 6 behind a 100% To Block. What this card adds over illusionImmunityNegates is the grant rather than the gate; b.ability.trueSight is the live half.',
    },
  },
  trueSightRangedToHitWarlord: {
    desc: 'True Sight (Warlord): ranged 1 at base 30% + True Sight 5% To-Hit vs def 0 → E[dmg] = 0.35 (without True Sight, 0.30)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hp:10, abilities: { trueSight: true } },
    b: { atk:0, def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.350 },
  },
  trueSightBreathUnaffectedWarlord: {
    desc: 'True Sight (Warlord) writes SToRanged only: melee 1 and fire breath 1 both stay at 30% → 0.3 + 0.3 = 0.6. If the bonus reached the Breath channel the breath would hit at 35% and give 0.650.',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { fireBreath: { strength:1, type:'fire' } }, hp:10, abilities: { trueSight: true } },
    b: { hp:10 },
    rangedCheck: false,
    expected: { dmgToA: 0, dmgToB: 0.600 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Warlord\'s True Sight bonus does not reach the Breath channel, so the only feature the fixture adds cannot move the number. The discriminator is which channels the attacker owns, which candidates() does not enumerate.',
      'a.ability.trueSight':
        'Keep, and the absence is the rule under test: d:trueSight adds its 5 only where the target field\'s kind is ranged (stats_sequence.js:1515), and a Fire Breath channel takes the breath kind (stats.js:1439-1442), whose field is toHitBreath (stats.js:1429-1430) - a field kindAt reports as breath rather than ranged (stats.js:1470); the step names no melee field at all. So both attacks on this card stay at 30%. The expectation is what catches a bonus that reached the breath - it would hit at 35% and give 0.650.',
    },
  },
  trueSightThrownUnaffectedWarlord: {
    desc: 'True Sight (Warlord) writes SToRanged only: melee 1 and thrown 1 both stay at 30% → 0.3 + 0.3 = 0.6. If the bonus reached the Thrown channel the thrown attack would hit at 35% and give 0.650.',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hp:10, abilities: { trueSight: true } },
    b: { hp:10 },
    rangedCheck: false,
    expected: { dmgToA: 0, dmgToB: 0.600 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Warlord\'s True Sight bonus does not reach the Thrown channel, so the only feature the fixture adds cannot move the number. The discriminator is which channels the attacker owns, which candidates() does not enumerate.',
      'a.ability.trueSight':
        'Keep, and the absence is the rule under test: d:trueSight adds its 5 only where the target field\'s kind is ranged (stats_sequence.js:1515), and a Thrown channel takes the thrown kind (stats.js:1439-1442), whose field is toHitThrown (stats.js:1429-1430) - a field kindAt reports as thrown rather than ranged (stats.js:1470); the step names no melee field at all. So both attacks on this card stay at 30%. The expectation is what catches a bonus that reached the thrown attack - it would hit at 35% and give 0.650.',
    },
  },
  eyeOfHeavenNegatesIllusion: {
    desc: 'Eye of Heaven grants Illusion Immunity to its own unit: 5 atk 100% hit vs def 6 + Eye of Heaven 100% block → def stays 6, 0 dmg (would be 5 if illusion still ignored armor)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { illusion: true } },
    b: { def:6, toBlkMod:70, hp:10, abilities: { eyeOfHeaven: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.illusion':
        'Keep, and the absence is the rule under test: Eye of Heaven\'s whole write on its own unit is the True Sight flag - u.trueSight = true (stats_sequence.js:674) - which c:trueSight turns into Illusion Immunity (stats_sequence.js:991); the modern Illusion step is gated on the target not carrying that immunity (combat_effects.js:432), so its zeroing and HALT (combat_effects.js:431) never run and the defender keeps its own 6. b.ability.eyeOfHeaven is the live half.',
    },
  },
  eyeOfHeavenDisablesEnemyGaze: {
    desc: 'Eye of Heaven on the defender strips the attacker\'s gaze: Doom Gaze 5 disabled → 0 dmg (would be 5 without Eye of Heaven)',
    version: V_WARLORD,
    a: { atk:0, hp:10, abilities: { doomGaze: 5 } },
    b: { def:0, hp:10, abilities: { eyeOfHeaven: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  eyeOfHeavenTrueSightToHitWarlord: {
    desc: 'Eye of Heaven (Warlord): grants True Sight, so ranged 1 at base 30% + 5% To-Hit vs def 0 → E[dmg] = 0.35 (without Eye of Heaven, 0.30)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hp:10, abilities: { eyeOfHeaven: true } },
    b: { atk:0, def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.350 },
  },
  illusionCityWalls: {
    desc: 'Illusion + City Walls: def 3 base + 3 CW = 6, Illusion → only CW survives, def=3',
    a: { atk:5, toHitMod:70, hp:10, abilities: { illusion: true } },
    b: { def:3, toBlkMod:70, hp:10, cityWalls: '3' },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  blazeOfGloryZeroesEnchantmentArmorWarlord: {
    desc: 'Blaze of Glory transfers current Armor and then sets Defense to 0, including enchantment Armor. Iron Skin gives +5 Armor, so defender melee becomes 5 but all 4 incoming hits land. The old surviving-Armor reconstruction blocked every hit.',
    version: V_WARLORD,
    a: { atk:4, def:10, hitChance:70, toBlkMod:70, hp:20 },
    b: { atk:0, def:0, hitChance:70, toBlkMod:70, hp:20,
      abilities: { blazeOfGlory: true, ironSkin: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  illusionCityWallsCoM2: {
    desc: 'EffectiveDefense returns immediately at the Illusion step in CoM2: both base defense and the City Walls extra-defense input are discarded, so all 5 hits land.',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10, abilities: { illusion: true } },
    b: { def:3, toBlkMod:70, hp:10, cityWalls: '3' },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.cityWalls=3':
        'Keep, and the absence is the rule under test: CoM2 takes City Walls as EffectiveDefense extra defense, folded into the seed at combat_effects.js:428 from the value supplied at combat_effects.js:723, and the very next step assigns u.effectiveDefense = 0 and returns HALT (combat_effects.js:431). The walls are discarded with the base Defense rather than surviving it. illusionCityWalls is the same card in the DOS engine - the only other difference is that build\'s own To Hit control, toHitMod in place of hitChance - and pins 2.000, because there the bonus is added after the whole sequence has run (combat_effects.js:1074).',
    },
  },
  cityWallsAfterWarpDefenseCoM2: {
    desc: 'City Walls is EffectiveDefense extra defense, not a unit stat: Warp Defense first reduces Armor 9 to 3, then intact walls add 3 → 6. Eight hits at 100% block deal 2 (adding walls before Warp would leave 4 and deal 4).',
    version: V_COM2,
    a: { atk:8, hitChance:70, hp:10 },
    b: { def:9, toBlkMod:70, hp:10, cityWalls: '3', abilities: { warpDefense: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  cityWallsAfterBlazeOfGloryWarlord: {
    desc: 'City Walls lands after Blaze of Glory: Blaze transfers base Armor 3 to melee and zeros it, then intact walls add 3 only for the incoming attack. Five hits at 100% block deal 2 (booking walls before Blaze would transfer them and deal 5).',
    version: V_WARLORD,
    a: { atk:5, def:10, hitChance:70, toBlkMod:70, hp:10 },
    b: { atk:0, def:3, toBlkMod:70, hp:10, cityWalls: '3', abilities: { blazeOfGlory: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  cityWallsProtectsInitiatorOnCounterattackCoM2: {
    desc: 'Card A is inside and attacks card B outside. City Walls does not protect outside B from the initial strike, but protects inside A when B counterattacks: 4 hits − 3 blocks = 1.',
    version: V_COM2,
    a: { atk:4, def:0, hitChance:70, toBlkMod:70, hp:20, cityWalls:'3' },
    b: { atk:4, def:0, hitChance:70, toBlkMod:70, hp:20 },
    expected: { dmgToA:1.000, dmgToB:4.000 },
  },
  cityWallsProtectsRecipientAcrossWallCoM2: {
    desc: 'Card A is outside and attacks card B inside. City Walls protects B from the initial strike regardless of army membership: 4 hits − 3 blocks = 1; outside A gets no bonus against the counterattack.',
    version: V_COM2,
    a: { atk:4, def:0, hitChance:70, toBlkMod:70, hp:20 },
    b: { atk:4, def:0, hitChance:70, toBlkMod:70, hp:20, cityWalls:'3' },
    expected: { dmgToA:4.000, dmgToB:1.000 },
  },
  cityWallsNoBonusWhenBothInsideCoM2: {
    desc: 'Both cards are inside the walls, so neither attack crosses inward from outside and neither unit receives the City Walls defense bonus.',
    version: V_COM2,
    a: { atk:4, def:0, hitChance:70, toBlkMod:70, hp:20, cityWalls:'3' },
    b: { atk:4, def:0, hitChance:70, toBlkMod:70, hp:20, cityWalls:'3' },
    expected: { dmgToA:4.000, dmgToB:4.000 },
  },
  illusionOverridesWeaponImmunity: {
    desc: 'Illusion overrides Weapon Immunity: WI sets def to 10, then Illusion sets to 0 → full damage',
    a: { atk:5, toHitMod:70, hp:10, abilities: { illusion: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: the Illusion step zeroes the defense and stops the sequence (combat_effects.js:768, broken on at steps.js:750), and every DOS list places it ahead of the Weapon Immunity marker (combat_effects.js:844 before 847, :858 before 860, :872 before 874), so the marker is never set and the floor at combat_effects.js:826 never runs. The immunity has to be on the card for the override to be what is measured; a.ability.illusion is the live half.',
    },
  },
  illusionDoesNotOverrideImmolationDefense: {
    desc: 'Illusion does not affect Immolation defense: melee ignores def for 1 dmg, but Immolation 4 vs def 4 at 100% block is fully blocked',
    a: { atk:1, toHitMod:70, hp:10, abilities: { illusion: true, immolation: true } },
    b: { def:4, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'a.ability.immolation':
        'Keep, and the absence is the rule under test: the spell path builds its own descriptor with no illusion term (combat_effects.js:1027-1037), so ctx.illusion is false for the Immolation defense and the zeroing at combat_effects.js:768 is skipped; Immolation\'s strength 4 in this build (combat_special_attacks.js:641) then meets the defender\'s own Defense 4 at 100% To Block and none of it lands. Contributing zero is the claim, so ablating it cannot move a number - the 1.000 is the melee that Illusion does reach, and an Illusion that reached the spell path would make it 5.000.',
    },
  },

  // --- Invisibility ---
  invisibilityMelee: {
    desc: 'Invisible defender melee: 5 atk 30% hit − 10% invis penalty = 20% hit vs def 0, E[dmg] = 5×0.2 = 1.0',
    a: { atk:5, hp:10 },
    b: { def:0, hp:10, abilities: { invisibility: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  invisibilityRangedBlocked: {
    desc: 'Invisible defender cannot be targeted by ranged: 0 damage regardless of attacker stats',
    a: { rtbType:'missile', rtb:5, hp:10 },
    b: { def:0, hp:10, abilities: { invisibility: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  invisibilityRangedIllusionImmune: {
    desc: 'Illusion Immune attacker can target invisible defender at range with no penalty: E[dmg] = 5×0.3 = 1.5',
    a: { rtbType:'missile', rtb:5, hp:10, abilities: { illusionImmunity: true } },
    b: { def:0, hp:10, abilities: { invisibility: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.500 },
    vacuity: {
      'b.ability.invisibility':
        'Keep, and the absence is the rule under test: an attacker carrying Illusion Immunity satisfies aCanSeeB whatever the defender has (combat_phases.js:276), so the ranged early return at combat.js:1147 is not taken and the MoM To Hit penalty is not applied (combat_phases.js:278). Invisibility has to be on the card for that to be what is measured. invisibilityRangedBlocked is the same card without the attacker\'s immunity and pins 0 against this 1.500.',
    },
  },
  invisibilityCounter: {
    desc: 'Invisible attacker: B counter gets −10% to hit penalty. A: 1×0.3=0.3; B counter: 5×0.2=1.0',
    a: { atk:1, def:0, hp:10, abilities: { invisibility: true } },
    b: { atk:5, def:0, hp:10 },
    expected: { dmgToA: 1.000, dmgToB: 0.300 },
  },
  invisibilityIllusionImmuneNoPenalty: {
    desc: 'Illusion Immune attacker ignores invisibility: full 30% hit, E[dmg] = 5×0.3 = 1.5',
    a: { atk:5, hp:10, abilities: { illusionImmunity: true } },
    b: { def:0, hp:10, abilities: { invisibility: true } },
    expected: { dmgToA: 0, dmgToB: 1.500 },
    vacuity: {
      'b.ability.invisibility':
        'Keep, and the absence is the rule under test: an attacker carrying Illusion Immunity satisfies aCanSeeB (combat_phases.js:276), so the ten-point melee penalty at combat_phases.js:280 is skipped and the attack stays at its base 30%. invisibilityMelee is the same card without the attacker\'s immunity and pins 1.000 against this 1.500.',
    },
  },
  invisibilityDoomIgnores: {
    desc: 'Doom bypasses to-hit so invisibility penalty is irrelevant: floor(5/2) = 2 damage',
    a: { atk:5, hp:10, abilities: { doom: true } },
    b: { def:5, toBlkMod:70, hp:10, abilities: { invisibility: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'b.ability.invisibility':
        'Keep, and the absence is the rule under test: the penalty is genuinely applied here - 1.31 is not the CoM branch, so the gate at combat_phases.js:278 opens and the attacker\'s melee To Hit drops ten points at combat_phases.js:280 - but a Doom attack builds its distribution from calcDoomDist(k, atk, remHP) at combat_fear_and_touch.js:414, which is handed no To Hit at all. doomDamageMelee is the same card without b.abilities.invisibility, in the same version group of the tree, and pins the same 2.000; the equality is the claim.',
    },
  },

  // --- Doom Damage ---
  doomDamageMelee: {
    desc: 'Doom Damage Melee: 1 fig 5 atk doom vs 5 def — bypasses to-hit and defense, floor(5/2) = 2 damage',
    a: { atk:5, hp:10, abilities: { doom: true } },
    b: { def:5, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  doomDamageMultiFig: {
    desc: 'Doom Damage Multi-fig: 4 figs × floor(2/2)=1 atk doom vs 5 def — exact 4 damage, ignores defense',
    a: { figs:4, atk:2, hp:10, abilities: { doom: true } },
    b: { def:5, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  doomDamageRanged: {
    desc: 'Doom Damage Ranged: 1 fig 5 missile doom vs 5 def — floor(5/2) = 2 damage, no distance penalty',
    a: { rtbType:'missile', rtb:5, hp:10, abilities: { doom: true } },
    b: { def:5, toBlkMod:70, hp:10 },
    rangedCheck: true, rangedDist: 9,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  doomDamageThrownAffected: {
    desc: 'Doom Damage applies to thrown + melee: 2 thrown doom + 4 melee doom vs 5 def, 20 hp — floor(4/2) + floor(2/2) = 2 + 1 = 3',
    a: { atk:4, rtbType:'thrown', rtb:2, hp:10, abilities: { doom: true } },
    b: { def:5, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  doomDamageCounter: {
    desc: 'Doom Damage Counter: defender 5 atk doom vs attacker 5 def — counter is floor(5/2) = 2 damage',
    a: { atk:1, toHitMod:70, def:5, toBlkMod:70, hp:10 },
    b: { atk:5, hp:10, abilities: { doom: true } },
    expected: { dmgToA: 2.000, dmgToB: 1.000 },
  },

  // --- Holy Bonus ---
  holyBonusMeleeAtk: {
    desc: 'Holy Bonus Melee Atk: base 1 atk + HB 2 → effective 3 atk, 100% hit vs 0 def → 3 dmg',
    a: { atk:1, toHitMod:70, hp:10, abilities: { holyBonus: 2 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  holyBonusDef: {
    desc: 'Holy Bonus Defense: 2 atk 100% hit vs base def 1 + HB 2 → effective 3 def, 100% block → all blocked',
    a: { atk:2, toHitMod:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:10, abilities: { holyBonus: 2 } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  holyBonusRes: {
    desc: 'Holy Bonus Resistance: Poison 4 vs base res 5 + HB 2 → effective res 7, pFail 30%, E[dmg]=1.2',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { holyBonus: 2 } },
    expected: { dmgToA: 0, dmgToB: 1.200 },
  },
  holyBonusRangedMoM: {
    desc: 'Holy Bonus Ranged (MoM 1.31): HB does NOT boost ranged atk. rtb 1 + HB 2 → still 1 hit',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10, abilities: { holyBonus: 2 } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that MoM\'s Holy Bonus has no ranged half at all, so the only feature the fixture adds cannot move the number. The discriminator is the version, which the sweep resolves for the fixture rather than enumerating as a candidate.',
      'a.ability.holyBonus':
        'Keep, and the absence is the rule under test: MoM falls to the third arm of the Holy Bonus block (combat_abilities.js:723), whose apply writes melee, Defense and Resistance and nothing else (combat_abilities.js:724). It has no counterpart to CoM 1\'s rangedStrength write at combat_abilities.js:720 or CoM2\'s persistentRanged write at combat_abilities.js:711, so the missile keeps its base 1. The three writes the arm does make are unobservable on this card: the attacker has no melee attack, and the defender never strikes, so its Defense and Resistance are never read.',
    },
  },
  holyBonusRangedCoM2: {
    desc: 'Holy Bonus Ranged (CoM2): HB boosts ranged atk. rtb 1 + HB 2 → 3 hits, 100% hit vs 0 def → 3 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { holyBonus: 2 } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },

  // --- Supreme Light ---
  supremeLightLifeCreatureMeleeCoM: {
    desc: 'Supreme Light (CoM): Life creature gains +2 melee. atk 1 → 3, 100% hit vs 0 def → 3 dmg',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, unitType: 'fantastic_life', abilities: { supremeLight: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  supremeLightCasterRangedCoM2: {
    desc: 'Supreme Light (CoM2): Caster unit gains +2 ranged. rtb 1 → 3, 100% hit vs 0 def → 3 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { supremeLight: true, caster: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  supremeLightDefenseFromResistanceCoM2: {
    desc: 'Supreme Light (CoM2): Life creature with res 8 gains floor(8/3)=2 defense. 6 atk 100% hit vs 2 def → E[dmg]=5.4',
    version: V_COM2,
    a: { atk:6, hitChance:70, hp:10 },
    b: { res:8, hp:10, unitType: 'fantastic_life', abilities: { supremeLight: true } },
    expected: { dmgToA: 0, dmgToB: 5.400 },
  },
  supremeLightNonEligibleNoBonusCoM2: {
    desc: 'Supreme Light (CoM2): normal non-Caster unit gets no bonus. atk 1 stays 1 → 1 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { supremeLight: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that a plain normal unit meets none of Supreme Light\'s eligibility arms, so the only feature the fixture adds cannot move the number. The discriminator is what the card omits - a Life realm, a Caster flag, a magical ranged type - and candidates() enumerates only what a fixture sets.',
      'a.ability.supremeLight':
        'Keep, and the absence is the rule under test: the CoM2 return asks for a magical live ranged type, a fantastic_life or normal_life unit type, the Caster flag, or a magical base ranged type (combat_abilities.js:301-305), and this attacker answers no to all four. The step\'s own `when` is that predicate over the record and every channel (stats_sequence.js:1853-1855), so neither the melee +2 at stats_sequence.js:1859 nor the per-channel +2 at stats_sequence.js:1864 ever runs and the attack stays at 1.',
    },
  },

  // --- Breakthrough ---
  breakthroughMeleeCoM2: {
    desc: 'Breakthrough (CoM2) +1melee: base 1 atk becomes 2, 100% hit vs 0 def → 2.0 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { breakthrough: 'melee' } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  breakthroughMeleeDefAttackCoM2: {
    desc: 'Breakthrough (CoM2) +1melee/+1def still grants the +1 melee attack on offense: base 1 atk becomes 2 → 2.0 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { breakthrough: 'meleeDef' } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  breakthroughLiveFantasticStillNormalCoM2: {
    desc: 'Breakthrough (CoM2) admits the normal package on the permanent record: Chaos Channels makes the attacker live-Fantastic over a non-Fantastic base, and the block tests `not B.Fantastic`, so the +1 melee still lands. atk 1 becomes 2 → 2.0 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { breakthrough: 'melee', ccDefense: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  breakthroughLiveFantasticStillNormalWarlord: {
    desc: 'Breakthrough (Warlord) admits the normal package on the permanent record: Chaos Channels makes the attacker live-Fantastic over a non-Fantastic base, and the block tests `not B.Fantastic`, so the +1 melee still lands. atk 1 becomes 2 → 2.0 dmg',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { breakthrough: 'melee', ccDefense: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  breakthroughRefusedByDestinyPermanentFantasticCoM2: {
    desc: 'The other side of the same `not B.Fantastic` test ($005A376D..$005A3DDE): `B.` is the permanent record, and Destiny writes `B.Fantastic := True` at $0059A390 before the recalculation copies it, so a unit trained as a regular one is outside the normal package. Negative claim, the absence being the rule under test: melee 1 doubled by Destiny is 2 at 100% hit vs def 0 -> 2.0, which is what its Destiny-only sibling destinyMeleeRemovesLevelsCoM2 measures. Reading the training-time flag instead admitted the package for 3 -> 3.000. Paired with breakthroughLiveFantasticStillNormalCoM2, which is the live-Fantastic direction of the same gate.',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destiny: true, breakthrough: 'melee' } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.ability.breakthrough':
        'Keep, and the absence is the rule under test: the enchantment has to be on the card for the exclusion to be what is measured. `c:breakthrough:normal` is composed unconditionally now and refuses at its own `when`, `!combatSummoned && !ctx.base.fantastic` (combat_abilities.js), so ablating Breakthrough leaves the same 2.000. a.ability.destiny is the live half, doubling melee 1 to 2; breakthroughMeleeCoM2 is this card without Destiny and pins 2.000 from base 1 + 1 instead.',
    },
  },
  breakthroughReachesSpiritLinkedFantasticWarlord: {
    desc: 'The positive direction of the same permanent-record read: Spirit Link clears the permanent flag with `SETSTAT(TU,AFantastic,1,0)`, and that clear stands ahead of `a:baseCopy`, so a base-Fantastic unit passes `not B.Fantastic` and takes the normal package. melee 1 + 1 = 2 at 100% hit vs def 0 -> 2.0; reading the training-time flag instead refused it for 1.000, which is what the same card without Breakthrough gives.',
    version: V_WARLORD,
    a: { unitType: 'fantastic_nature', atk:1, hitChance:70, hp:10,
      abilities: { spiritLink: true, breakthrough: 'melee' } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  breakthroughMeleeDefDefenseCoM2: {
    desc: 'Breakthrough (CoM2) derives its normal package from identity: the exceptional +def label cannot override a normal unit, so defense stays 0 and 1 hit deals 1 damage.',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10 },
    b: { def:0, hp:10, abilities: { breakthrough: 'meleeDef' } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the `+1mel/+1def` label cannot hand a permanent normal unit the defense half, so the only feature the fixture adds cannot move the number. The discriminator is the defender\'s identity - not combat-summoned, not permanently Fantastic, not Non-Corporeal - which is what the card omits rather than sets.',
      'b.ability.breakthrough':
        'Keep, and the absence is the rule under test: the selector value is read only to decide that Breakthrough is present at all (combat_abilities.js:1024); which package is granted is derived from identity, and the +1 defense belongs to the Non-Corporeal and combat-summoned packages alone (combat_abilities.js:1046, 1051). This defender is neither, so it takes the normal package (combat_abilities.js:1038), whose single write is the melee +1 at combat_abilities.js:1041 - and that write passes the melee slot gate at combat_abilities.js:528, which is `runCtx.base.atk > 0` (stats.js:977), a test a defender with no attack fails. Defense therefore stays 0 and the one hit deals 1.',
    },
  },

  // --- Combat Discipline / Overland Discipline ---
  combatDisciplineEliteNegatesFirstStrikeCoM2: {
    desc: 'Combat Discipline (CoM2): Elite+ grants Negate First Strike, so the defender cancels First Strike and trades damage normally',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { firstStrike: true, illusion: true } },
    b: { atk:2, hitChance:70, hp:10, level:'elite', abilities: { discipline: 'combat' } },
    expected: { dmgToA: 5.000, dmgToB: 10.000 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test: Combat Discipline at level rank 3 or better sets combatDisciplineNegatesFirstStrike, which reads the experience level off the finished record (stats.js), which puts negateFirstStrike onto the unit\'s combat ability set (stats.js:2235), and the exchange grants the pre-emptive strike only while the defender lacks that flag (combat.js:87). So the attacker\'s First Strike is cancelled and both sides trade, which is why dmgToA is not 0. It has to be on the card for the cancellation to be what is measured. b.ability.discipline and b.level=elite are the two live halves - that test needs both.',
    },
  },
  overlandDisciplineDefenseNormalCoM2: {
    desc: 'Overland Discipline (CoM2): normal unit gets +1 defense. 2 missile atk at 100% vs def 1 at 100% block → 1 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { discipline: 'overland' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  overlandDisciplineDefenseRegularCoM2: {
    desc: 'Overland Discipline (CoM2): Regular+ gets another +1 defense. 3 missile atk at 100% vs def 2 at 100% block → 1 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:3, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, level:'regular', abilities: { discipline: 'overland' } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  overlandDisciplineVeteranMeleeCoM2: {
    desc: 'Overland Discipline (CoM2): Veteran+ gets +1 melee attack. base 1 + veteran 2 + discipline 1 = 4 → 4 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, level:'veteran', abilities: { discipline: 'overland' } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  overlandDisciplineVeteranMissileCoM2: {
    desc: 'Overland Discipline (CoM2): Veteran+ gets +1 non-magical ranged. missile 1 + veteran 2 + discipline 1 = 4 → 4 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, level:'veteran', abilities: { discipline: 'overland' } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  overlandDisciplineVeteranMagicRangedNoBonusCoM2: {
    desc: 'Overland Discipline (CoM2): Veteran+ does not boost magical ranged. magic 1 + veteran 2 = 3, not 4',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, level:'veteran', abilities: { discipline: 'overland' } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.discipline':
        'Keep, and the absence is the rule under test: the Discipline step\'s ranged half is `if (isNonMagicalRangedFieldSlot(u, c)) u[c.strengthField] += 1` (stats_sequence.js:1008), and for a modern Ranged channel that predicate resolves to `!isMagicalRangedType(...)` (combat_abilities.js:271-272), so a magic-typed shot is refused and the attack stays at base 1 plus veteran 2. The step\'s other writes are Defense and melee on the attacker (stats_sequence.js:1005), and a ranged-only exchange against a defender that never strikes can show neither. a.level=veteran is the live half twice over: it is the +2 inside the 3, and it is the `levelRankOf(u.level) >= 2` gate in `c:discipline` (stats_sequence.js) that admits the ranged half at all.',
    },
  },

  // --- Destiny ---
  destinyDefenseAndHealthCoM2: {
    desc: 'Destiny (CoM2): defender gets +4 defense and doubled HP. 24 atk vs def 4 at 100% block leaves 20 damage, which now fits under the 20 HP cap',
    version: V_COM2,
    a: { atk:24, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { destiny: true } },
    expected: { dmgToA: 0, dmgToB: 20.000 },
  },
  destinyGrantsSupernaturalCoM2: {
    desc: 'Destiny (CoM2): enchanted unit becomes Supernatural. doubled melee 3→6 fully blocked still deals round(6/3) = 2 damage',
    version: V_COM2,
    a: { atk:3, hitChance:70, hp:10, abilities: { destiny: true } },
    b: { def:6, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  destinyMeleeRemovesLevelsCoM2: {
    desc: 'Destiny (CoM2): doubles base melee but removes veterancy. Veteran base 1 becomes 2, not 4',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, level:'veteran', abilities: { destiny: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  destinyRangedDoublesBaseCoM2: {
    desc: 'Destiny (CoM2): doubles base ranged attack strength. missile 2 becomes 4',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { destiny: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  destinyFireBreathDoublesCoM2: {
    desc: 'Destiny (CoM2): the doubling reaches Fire Breath ($0059A51F), which the modern engine keeps in its own channel rather than in the ranged field. Melee 0 isolates the breath: strength 3 doubles to 6 at 100% hit vs def 0; without Destiny the same setup deals 3.0. The 30 HP defender keeps both values clear of the HP pool.',
    version: V_COM2,
    a: { atk:0, modernAttacks: { fireBreath: { strength:3, type:'fire' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { destiny: true } },
    b: { def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  destinyLightningBreathDoublesCoM2: {
    desc: 'Destiny (CoM2): the doubling reaches Lightning Breath ($0059A559), a channel independent of both ranged and Fire Breath. Melee 0 isolates the breath: strength 4 doubles to 8 at 100% hit vs def 0; without Destiny 4.0. The 30 HP defender keeps both values clear of the HP pool.',
    version: V_COM2,
    a: { atk:0, modernAttacks: { lightningBreath: { strength:4, type:'lightning' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { destiny: true } },
    b: { def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  destinyThrownDoublesCoM2: {
    desc: 'Destiny (CoM2): the doubling reaches Thrown ($0059A593), the last of the six doubled attack/HP fields. Melee 0 isolates the Thrown attack: strength 5 doubles to 10 at 100% hit vs def 0; without Destiny 5.0. The 30 HP defender keeps both values clear of the HP pool.',
    version: V_COM2,
    a: { atk:0, modernAttacks: { thrown: { strength:5, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { destiny: true } },
    b: { def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  destinyResistanceAndHpCoM2: {
    desc: 'Destiny (CoM2): +4 resistance and doubled HP turn Death Gaze vs res 3 / hp 10 into res 7 / hp 20, for 6 damage on average',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:3, hp:10, abilities: { destiny: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  badMoonSkipsDestinyPermanentFantasticCoM2: {
    desc: 'Bad Moon tests the **permanent** record — `(inferred_BadMoon_State <> 0) and B.incombat and (not B.Fantastic)` at $005A273C (Units.RecalculateUnits.pas), the `B.` selector beside `U.*` siblings — and Destiny writes `B.Fantastic := True` at $0059A390, so the enchanted unit is outside the event. Negative claim, and the absence is the rule under test: the fixture reproduces its verified sibling destinyResistanceAndHpCoM2 exactly, res 3 + 4 = 7 and hp 10 → 20 giving Death Gaze 6.0. Reading the training-time flag instead let Bad Moon take 3 Resistance off, for res 4 and 12.0.',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:3, hp:10, abilities: { destiny: true, badMoon: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'b.ability.badMoon':
        'Keep, and the absence is the rule under test: Destiny writes the permanent Fantastic flag (`buffs:destiny`, stats_identity.js), and `badMoonActiveAt` carries `&& !runCtx.base.fantastic` (stats.js), so the step\'s `when` refuses it and the -3 Resistance is never written (stats_sequence.js:1253-1254). Bad Moon has to be on the card for that exclusion to be what is measured. destinyResistanceAndHpCoM2 is the same card without b.abilities.badMoon and pins the same 6.000; b.ability.destiny is the live half, at +4 Resistance and doubled HP (stats_sequence.js:725).',
    },
  },
  goodMoonSkipsDestinyPermanentFantasticCoM2: {
    desc: 'Good Moon tests the same permanent flag — `(inferred_GoodMoon_State <> 0) and (not B.Fantastic)` at $005A285E — so Destiny\'s `B.Fantastic := True` closes it. Negative claim, the absence being the rule under test: melee 1 doubled by Destiny is 2 at 100% hit vs def 0 → 2.0, the number the verified sibling destinyMeleeRemovesLevelsCoM2 measures. Reading the training-time flag instead added Good Moon\'s +1 to the doubled melee for 3.0.',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destiny: true, goodMoon: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  natureConjunctionSeesDestinyPermanentFantasticCoM2: {
    desc: 'Nature Conjunction is the positive arm of the same permanent test — `(inferred_NatureConjunction_State <> 0) and B.Fantastic` at $005A2BB6 — so Destiny\'s permanent write admits a unit trained as a regular one. `c:destiny` doubles melee 1 to 2 and the event then adds its +2 (the block\'s own `if U.attack > 0` reads the doubled value), for 4 at 100% hit vs def 0 → 4.0. Reading the training-time flag instead left the event inert at 2.0.',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destiny: true, natureConjunction: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  destinyAfterLuckyStarWarlord: {
    desc: 'Ordered Apotheosis (Warlord): Warlord renames Destiny to Apotheosis, so the Apotheosis control is the one that reaches this version — the CoM2-named Destiny control is hidden here and selecting it would leave Lucky Star running alone. Lucky Star adds +1 melee in UnitCalcPre, then Apotheosis doubles the live 3+1 to 8. At 100% hit vs def 0 → 8.0; without it 4.0, and applying the doubling before the hook would deal 7.0.',
    version: V_WARLORD,
    a: { atk:3, hitChance:70, hp:10, abilities: { luckyStar: true, apotheosis: true } },
    b: { def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },

  // --- Focus Magic ---
  focusMagicMagicRangedCoM2: {
    desc: 'Focus Magic (CoM2): magical ranged gets +3. magic 4 → 7, 100% hit vs 0 def → 7.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:4, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { focusMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  focusMagicMagicalRangedIgnoresLiveStrengthWarlord: {
    desc: 'Focus Magic (Warlord): the magical-ranged +3 is the fourth arm of the ranged branch ($0059AAA3), reached on `B.ranged <> 0` and a magical `B.rangedtype` — both permanent-record reads, and the arm makes no live-strength test of its own (Units.RecalculateUnits.pas:874-909). Plague is region `b`, so its −3 has already driven the magic 2 to −1 by the time the branch runs; the arm still adds 3, and the region-`e` clamp settles it at 2. Ranged mode at 100% To Hit → 2.0. Gating the +3 on live strength instead loses the attack outright for 0.0, and removing Focus Magic does exactly that.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:2, type:'magic' } }, hitRanged:80, hitThrown:80, hitBreath:80, hp:10,
      abilities: { focusMagic: true, plague: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  focusMagicBreathCoM2: {
    desc: 'Focus Magic (CoM2): breath gets +3. fire breath 2 → 5 plus melee 1 → 6.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:2, type:'fire' } }, hp:10, abilities: { focusMagic: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  focusMagicConvertsMissileCoM2: {
    desc: 'Focus Magic (CoM2): missile 5 converts to magic 5, bypassing Missile Immunity → 5.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:5, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { focusMagic: true } },
    b: { hp:10, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  focusMagicPreservesLowMissileCoM2: {
    desc: 'Focus Magic (CoM2): missile 1 converts to magic at the same strength, bypassing Missile Immunity → 1.0. Raising it to the CoM 1 minimum of 3 would deal 3.0; failing to convert it would deal 0.',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { focusMagic: true } },
    b: { hp:10, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  focusMagicConvertsThrownCoM2: {
    desc: 'Focus Magic (CoM2): thrown 5 converts to magic 5, so ranged mode uses a magical ranged attack and bypasses Missile Immunity → 5.0',
    version: V_COM2,
    a: { modernAttacks: { thrown: { strength:5, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { focusMagic: true } },
    b: { hp:10, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  focusMagicFollowsLionheartCoM: {
    desc: 'Ordered Focus Magic (CoM 1): Lionheart is com1:0x8F660 and Focus Magic com1:0x8F7E6, so the +3 reads the still-Missile type and lands — missile 2 + 3 = 5 — and the later conversion retypes that 5 to magic_s, which Missile Immunity does not stop: 5.0. Reading the converted type at Lionheart\'s position would leave 2, raised to the branch minimum of 3; without Focus Magic the missile 5 is stopped outright for 0.',
    version: V_COM,
    a: { rtbType:'missile', rtb:2, toHitRtbMod:70, hp:10,
      abilities: { lionheart: true, focusMagic: true } },
    b: { hp:10, abilities: { missileImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  focusMagicGrantsRangedCoM2: {
    desc: 'Focus Magic (CoM2): no qualifying attack grants strength-3 magic ranged; at base 30% To Hit that averages 0.9 dmg',
    version: V_COM2,
    a: { hp:10, abilities: { focusMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.900 },
  },
  focusMagicCreatedRangedNoLevelBonusCoM2: {
    desc: 'Focus Magic (CoM2): the level ladder does not reach an attack Focus Magic created. An attack-less unit takes the creation arm and ends holding strength-3 magic ranged, and every attack gate the CoM2 ladder applies to a normal unit reads the permanent record, where this unit has no attack of any kind — so Champion rank adds nothing to the created field. (The hero path is the one that tests the calculated Thrown and Breath instead, and this unit is not a hero.) 3 at 100% hit → 3.0, and the same card at Normal rank reaches the same 3.0. That the rank never reaches the created attack is the assertion.',
    version: V_COM2,
    a: { atk:0, level:'champion', hitRanged:70, hitThrown:70, hitBreath:70, hp:10,
      abilities: { focusMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.level=champion':
        'Keep, and the absence is the rule under test: the CoM2 arm of the level ladder selects its ranged table from `base[c.rangedTypeField]` (stats_sequence.js:786, 791) and gates its melee step on hasMeleeAttackAt (stats_sequence.js:747) - both reads of the permanent record, which `a:baseCopy` publishes at the head of region `a` (stats_sequence.js, precalcBinaryStatSteps). Focus Magic writes only the calculated record - this fixture takes the creation arm, `u[target.strengthField] = 3` with its type pair (stats_sequence.js:915-917) - so an attack-less unit\'s created field is outside every arm of the ladder. The ladder\'s remaining writes cannot show either: its Resistance, Defense and HP land on an attacker nothing strikes, and its To Hit step cannot raise a shot the card already fires at 100%. Note the number does not in fact turn on the two steps\' order (level at stats_sequence.js:733, Focus Magic at :848) - the gates read `base`, which no region-c step can move.',
    },
  },
  focusMagicDoomGazeBoostCoM2: {
    desc: 'Focus Magic (CoM2): doom gaze gets +3. doom gaze 4 → 7 exact damage',
    version: V_COM2,
    a: { hp:10, abilities: { focusMagic: true, doomGaze: 4 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  // The two members below are one fixture under two versions, which is what a version-difference
  // pair has to be. A doom gaze is held differently by the two engines — the DOS record keeps its
  // strength in the shared RTB slot while CoM2 keeps it in the ability row — so each half states
  // the same unit in its own engine's notation. Selecting the type-104 slot also arms the stoning
  // and death kill loops in the DOS build, so the defender's Resistance is put out of their reach
  // and only the doom strength is left to measure. Both engines reach `+3` on the gaze, so the
  // difference the pair measures is **what else the block does**, which ranged mode exposes.
  focusMagicDoomGazeCoM: {
    desc: 'Focus Magic (CoM 1): one three-way branch, and a doom-gaze template takes its first arm — the unit type\'s ranged type 104 satisfies `>= 30 and <> 100` (com1:0x8F825/0x8F829) — so the gaze goes 2 → 5 and **no ranged attack is created**. Ranged mode at 100% To Hit therefore falls back to melee and only the gaze lands, for 5.0. The paired focusMagicDoomGazeCoM2 runs the same unit on the engine whose gaze clause and ranged-creation branch are independent tests, so there the created strength-3 magic attack fires and the gaze does not, for 3.0. Removing Focus Magic leaves 2 here; retyping the slot as arm 3 would leaves the gaze at 2 and fires a created 3.',
    version: V_COM,
    a: { rtbType:'gaze_multiple', rtb:2, toHitRtbMod:70, hp:10,
      abilities: { focusMagic: true, doomGaze: 2 } },
    b: { def:0, res:50, hp:10 },
    // "Ranged mode falls back to melee" is the page withdrawing the control, and the tick is what
    // makes that observable: arm 1 creates no ranged attack, so the record carries none and
    // updateTypeVisibility clears the box, leaving the gaze phase's `!isRanged` gate open for 5.
    // On arm 3 the slot holds a created attack, the control is kept, the volley fires instead of
    // the gaze and the number is 3.
    rangedCheck: true, rangedDist: 1, rangedModeWithdrawn: true,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'a.ability.doomGaze':
        'Keep: the gaze is the subject, but a DOS record spells its strength in the shared ranged slot rather than in the ability row - for a gaze_multiple type baseDoomGaze is recordContext.calcBaseRtb (stats.js:1661-1663), and it is that derived value which is published back onto the combat abilities (stats.js:2241-2242), so the ability entry is overwritten before anything reads it. a.rtbType=gaze_multiple with a.rtb 2 is the live spelling here, and candidates() enumerates neither field. a.ability.focusMagic is the live half.',
    },
  },
  focusMagicDoomGazeCoM2: {
    desc: 'Focus Magic (CoM2): the doomgaze +3 test ($0059A66D) and the ranged-creation branch ($0059A790) are independent tests that both run (Units.RecalculateUnits.pas:873-910), so a doom-gaze unit gains the strength-3 magic ranged attack as well. Ranged mode at 100% To Hit fires that attack and the gaze does not, for 3.0 — against the 5.0 the CoM 1 member of this pair reports for the same unit, whose single branch spends itself on the gaze and creates nothing. Without Focus Magic there is no ranged attack, the exchange falls back to melee and the bare gaze deals 2.0. The gaze half alone is focusMagicDoomGazeBoostCoM2.',
    version: V_COM2,
    a: { hitRanged:70, hitThrown:70, hitBreath:70, hp:10,
      abilities: { focusMagic: true, doomGaze: 2 } },
    b: { def:0, res:50, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.doomGaze':
        'Keep, and the absence is the rule under test: CoM2 runs the gaze clause `if (u.doomGaze > 0) u.doomGaze += 3` (stats_sequence.js:879) and the four-way ranged branch (stats_sequence.js:898-922) as independent tests, so carrying a doom gaze costs the unit nothing - it still takes the created strength-3 magic ranged attack. The raised gaze itself cannot appear in this number, because the gaze phase is `!isRanged && aGazeActiveP` (combat.js:296) and the fixture measures a ranged exchange; that invisibility is exactly what makes the 3.0 a statement about the branch. CoM 1 is the contrast - its arm 1 takes the +3 and `continue`s past the creation (stats_sequence.js:863-869) - and focusMagicDoomGazeCoM is that engine on the same unit.',
    },
  },
  focusMagicDoomGazeRangedBranchCoM2: {
    desc: 'The other half of the same independence: a doom-gaze-only CoM2 unit still gets Focus Magic\'s created strength-3 magic ranged attack ($0059A790), so the +3 gaze clause does not consume it. Ranged mode at 100% hit → 3.0; without Focus Magic the unit has no ranged attack, the exchange falls back to melee and only the bare gaze lands, for 2.0.',
    version: V_COM2,
    a: { hitRanged:70, hitThrown:70, hitBreath:70, hp:10,
      abilities: { focusMagic: true, doomGaze: 2 } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  // Arm 1 of CoM 1's three-way branch tests the **unit type's** ranged type for
  // `>= RAT_MAGIC_FIRST and <> RAT_THROWN` (com1:0x8F825, com1:0x8F829, both signed), so it admits
  // 101-105 — the two breaths and all three gazes — beside magical ranged, and it makes no
  // strength test. The four presets below hold that reach and the two shapes of arm 3.
  focusMagicStoningGazeCoM: {
    desc: 'Focus Magic (CoM 1): arm 1 admits a gaze template, so a stoning gaze of 2 becomes 5 exact damage. The gaze rides the DOS shared slot, which is the value the +3 lands on (com1:0x8F82D). Removing Focus Magic leaves 2, and so does treating the gaze as arm 3\'s fallback — retyping the slot to a magical ranged attack leaves the gaze itself at 2. Melee mode: gazes do not fire in the ranged sequence. Resistance 50 puts the petrify roll out of reach, so the gaze strength is all that is measured.',
    version: V_COM,
    a: { rtbType:'gaze_stoning', rtb:2, toHitRtbMod:70, hp:10, abilities: { focusMagic: true } },
    b: { def:0, res:50, hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  focusMagicBreathIgnoresLiveStrengthCoM: {
    desc: 'Focus Magic (CoM 1): arm 1 makes no strength test at all (com1:0x8F825 straight to the +3 at com1:0x8F82D), so a fire-breath template standing at strength 0 still takes it. Melee 1 at 100% plus the breath raised 0 → 3 deals 4.0; a fabricated `strength > 0` gate on the arm leaves the breath at 0 for 1.0, which is also what removing Focus Magic gives.',
    version: V_COM,
    a: { atk:1, toHitMod:70, rtbType:'fire', rtb:0, toHitRtbMod:70, hp:10,
      abilities: { focusMagic: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  focusMagicConvertsZeroThrownCoM: {
    desc: 'Focus Magic (CoM 1): a Thrown template is excluded from arm 1 by `base_rt <> RAT_THROWN` (com1:0x8F829) and from arm 2 by `> RAT_THROWN` (com1:0x8F839), so it falls to arm 3 whatever its strength — retyped to shot type 34 and floored at 3 (com1:0x8F840, com1:0x8F84C). Ranged mode at 100% To Hit → 3.0. Gating the conversion on positive Thrown strength leaves the unit with no ranged attack for 0.0, which is also what removing Focus Magic gives.',
    version: V_COM,
    a: { rtbType:'thrown', rtb:0, toHitRtbMod:70, hp:10, abilities: { focusMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  focusMagicFloorsTypelessSlotCoM: {
    desc: 'Focus Magic (CoM 1): arm 3 floors rather than assigns — `if (bu->ranged < 3) bu->ranged = 3` (com1:0x8F845, com1:0x8F84C) — so a typeless slot already carrying 4 keeps 4 after the retype to shot type 34. Ranged mode at 100% To Hit → 4.0; assigning 3 instead cuts it to 3.0, and removing Focus Magic leaves the slot typeless with no ranged attack, for 0.0.',
    version: V_COM,
    a: { rtbType:'none', rtb:4, toHitRtbMod:70, hp:10, abilities: { focusMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },

  // --- Blazing Eyes ---
  blazingEyesChaosCreatureGetsDoomGazeCoM2: {
    desc: 'Blazing Eyes (CoM2): Chaos creature gains Doom Gaze 3 → 3 exact damage',
    version: V_COM2,
    a: { hp:10, unitType:'fantastic_chaos', abilities: { blazingEyes: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blazingEyesChaosCreatureUpgradesDoomGazeCoM2: {
    desc: 'Blazing Eyes (CoM2): Chaos creature with Doom Gaze 4 gets +1 instead of replacing it, so it deals 5 exact damage',
    version: V_COM2,
    a: { hp:10, unitType:'fantastic_chaos', abilities: { blazingEyes: true, doomGaze: 4 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blazingEyesChaosChannelsEligibleCoM2: {
    desc: 'Blazing Eyes (CoM2): a normal unit transformed to fantastic_chaos by Chaos Channels qualifies and gains Doom Gaze 3',
    version: V_COM2,
    a: { hp:10, unitType:'normal', abilities: { blazingEyes: true, ccDefense: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blazingEyesReachesChaosChannelsUndeadCoM2: {
    desc: 'Blazing Eyes (CoM2) still reaches a Chaos-Channelled unit that a later Undead conversion re-tagged Death. The block at $005A1E16 gates on `IsChaosUnit(i)`, which is `(race = RCChaos) or (ChaosChannel(u) and EncUndead)` at $00594FE4, so the second arm recovers the Chaos realm `c:chaosChannels:armor:race` wrote and `c:undead` overwrote. The conjured Doom Gaze 3 is the card\'s only attack, for 3 exact damage -> 3.000. Reading the compact `fantastic_chaos` token instead sees fantastic_death, conjures no gaze, and gives 0.000 - and that token is narrower on a second count as well, since `IsChaosUnit` tests no Fantastic flag.',
    version: V_COM2,
    a: { hp:10, abilities: { blazingEyes: true, ccDefense: true, undead: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.undead':
        'Keep, and the absence is the rule under test: the claim is that the Undead conversion does not cost this unit the Doom Gaze, so ablating Undead has to leave the same 3.000 - it removes the very overwrite the recovery arm exists to undo. Both other features are live at delta 3: without a.ability.ccDefense there is no Chaos realm to recover, and without a.ability.blazingEyes there is no block.',
    },
  },
  blazingEyesLandsAfterFocusMagicCoM2: {
    desc: 'Blazing Eyes is a region-c block at $005A1E16, later than Focus Magic\'s doom-gaze clause `if U.doomgaze > 0` at $0059A66D, so a Doom Gaze this block conjures is not one Focus Magic can find: the Chaos creature ends at Doom Gaze 3 and deals 3 exact damage. Melee mode, so Focus Magic\'s separately created magic ranged attack does not fire. Removing Blazing Eyes leaves no gaze and 0; removing Focus Magic leaves the same 3, which is the point. Before F174 the grant was folded into the base seed, Focus Magic saw it there, and the unit dealt 6.',
    version: V_COM2,
    a: { hp:10, unitType:'fantastic_chaos', abilities: { blazingEyes: true, focusMagic: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.focusMagic':
        'Keep, and the absence is the rule under test: Focus Magic\'s doom-gaze clause is `if (u.doomGaze > 0) u.doomGaze += 3` (stats_sequence.js:879), and Blazing Eyes conjures the field later in the same region with `u.doomGaze += u.doomGaze === 0 ? 3 : 1` (stats_sequence.js:1107), so at Focus Magic\'s position there is no gaze to find and the unit ends at 3. Focus Magic\'s other product, the created strength-3 magic ranged attack, cannot fire either: this is melee mode and the ranged phase is `ranged: isRanged` (combat.js:293). a.ability.blazingEyes and a.unitType=fantastic_chaos are the live halves - the grant needs both, `isCoM2 && abilities.blazingEyes && unitTypeAt(u) === \'fantastic_chaos\'` (stats.js:365-366).',
    },
  },
  chaosEmbraceLandsAfterFocusMagicWarlord: {
    desc: 'The Warlord arm of the same order: Chaos Embrace is Blazing Eyes renamed, writes the same $005A1E16 block, and still lands after Focus Magic ($0059A66D), so the conjured Doom Gaze 3 deals 3 exact damage rather than the 6 a base-seeded grant would have reached.',
    version: V_WARLORD,
    a: { hp:10, unitType:'fantastic_chaos', abilities: { chaosEmbrace: true, focusMagic: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.focusMagic':
        'Keep, and the absence is the rule under test: Chaos Embrace is the Warlord name for the same write - its control carries `calcKey: \'blazingEyes\'` (enchantments.js:102) - so the conjuring at stats_sequence.js:1107 again lands after Focus Magic\'s `if (u.doomGaze > 0) u.doomGaze += 3` (stats_sequence.js:879) and finds no gaze to raise; the unit ends at 3. Melee mode, so the created strength-3 magic ranged attack does not fire either (combat.js:293). a.ability.chaosEmbrace and a.unitType=fantastic_chaos are the live halves, on the same two-term gate (stats.js:365-366).',
    },
  },
  blazingEyesNonChaosNoUpgradeCoM2: {
    desc: 'Blazing Eyes (CoM2): non-Chaos creature with Doom Gaze 4 does not get the +1 bonus, so it stays at 4 damage',
    version: V_COM2,
    a: { hp:10, unitType:'fantastic_nature', abilities: { blazingEyes: true, doomGaze: 4 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'a.ability.blazingEyes':
        'Keep, and the absence is the rule under test: the grant carries `isCoM2 && !!abilities.blazingEyes && unitTypeAt(u) === \'fantastic_chaos\'` (stats.js:365-366) over the live identity (stats.js:115), so a Nature creature never reaches `u.doomGaze += u.doomGaze === 0 ? 3 : 1` (stats_sequence.js:1107) and the gaze stays at the 4 the card gave it. blazingEyesChaosCreatureUpgradesDoomGazeCoM2 differs only in a.unitType and pins 5.000 against this 4.000. Note the unit-type field cannot be measured live here either: ablation rewrites it to \'normal\' (tools/preset_vacuity_sweep.js:204, :300), which is equally outside the Chaos gate. a.ability.doomGaze is the live half - it is the only damage on the card.',
    },
  },

  // --- Inner Power ---
  innerPowerFireImmunityMeleeCoM2: {
    desc: 'Inner Power (CoM2): Fire Immunity unit gets +3 melee, so atk 1 becomes 4 → 4 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { innerPower: true, fireImmunity: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  innerPowerLightningResistRangedCoM2: {
    desc: 'Inner Power (CoM2): Lightning Resist unit gets +3 to magical ranged, so magic 2 becomes 5 → 5 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { innerPower: true, lightningResist: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  innerPowerDefenseCoM2: {
    desc: 'Inner Power (CoM2): eligible defender gets +2 defense, so 5 atk 100% hit vs def 2 at 30% block → 4.4 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, hp:10, abilities: { innerPower: true, fireImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 4.400 },
  },
  innerPowerResistanceCoM2: {
    desc: 'Inner Power (CoM2): eligible defender gets +2 resistance, so Death Gaze vs res 5 becomes res 7 → 3 dmg',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, abilities: { innerPower: true, lightningResist: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  innerPowerNoTraitNoBonusCoM2: {
    desc: 'Inner Power (CoM2): unit without Fire Immunity or Lightning Resist gets no bonus, so atk 1 stays 1 → 1 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { innerPower: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Inner Power grants nothing to a unit carrying neither Fire Immunity nor Lightning Resist, so the only feature the fixture adds cannot move the number. The discriminator is the *absence* of those two flags, and candidates() enumerates only what a preset configures (tools/preset_vacuity_sweep.js:250-293).',
      'a.ability.innerPower':
        'Keep, and the absence is the rule under test: the step\'s `when` is `innerPowerActiveForUnit` (combat_abilities.js:930), which is `!!record.fireImmunity || !!record.lightningResist` read on the record at this step\'s own rank (combat_abilities.js:337-339). With neither flag set the `apply` never runs, so the +3 melee at combat_abilities.js:932 is not written and atk 1 stays 1. innerPowerFireImmunityMeleeCoM2 is this card with `fireImmunity` added to the same ability map and pins 4.000 against this 1.000.',
    },
  },
  innerPowerBreathNotThrownCoM2: {
    desc: 'Exclusion the engine makes: the block\'s three secondary writes are `U.ranged`, `U.firebreath` and `U.lightningbreath`, each on its own `> 0` test, and its decode note says in as many words that it does not alter Thrown (Units.RecalculateUnits.pas:1877-1884). Fire Breath 5 → 8 while Thrown 3 stays 3, so 3 + 8 = 11.000 at 100% hit vs def 0. A grant reaching every channel, as this block made before F139, gives 6 + 8 = 14.000.',
    version: V_COM2,
    a: { atk:0, modernAttacks: { thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' } },
    hitRanged:70, hitThrown:70, hitBreath:70, hp:10,
    abilities: { innerPower: true, fireImmunity: true } },
    b: { def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 11.000 },
  },
  innerPowerDoomGazeUnchangedCoM2: {
    desc: 'Exclusion the engine makes: `U.doomgaze` is an independent record field named by no line of the Inner Power block (Units.RecalculateUnits.pas:1866-1885). Doom Gaze 5 still deals 5.000; the pre-F139 write gave 8.000.',
    version: V_COM2,
    a: { atk:0, hp:10, abilities: { innerPower: true, fireImmunity: true, doomGaze: 5 } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'a.ability.innerPower':
        'Keep, and the absence is the rule under test: the block\'s `apply` names melee, Defense, Resistance and the `rangedOrBreath` slot (combat_abilities.js:932-933), and that slot gate is `isModernSecondarySlot`, which admits the ranged, fireBreath and lightningBreath channels (combat_abilities.js:279-285) - no gaze among them. The step also declares `attackWrites`, the strength fields alone (combat_abilities.js:929), rather than the `rtbWrites` shape that carries `gaze` and `doomGaze` beside them (combat_abilities.js:657-658), so `u.doomGaze` is outside its write set and the gaze stays at 5. The card is built so nothing else the block writes can surface: base melee is 0, so the melee gate `hasMeleeAttackAt`, `runCtx.base.atk > 0` (stats.js:977, consulted at combat_abilities.js:528), refuses the +3; and B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103), so A\'s Defense and Resistance are never scored against. This is melee mode, so the gaze does fire - `aGaze: !isRanged && aGazeActiveP` (combat.js:296). a.ability.doomGaze is the live half.',
    },
  },

  // --- Orihalcon ---
  orihalconMagicRangedBonusCoM2: {
    desc: 'Orihalcon (CoM2): magical ranged gets +2 strength, so magic 2 becomes 4 → 4 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, armor:'orihalcon' },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  orihalconResBonusCoM2: {
    desc: 'Orihalcon (CoM2): +1 resistance, so res 5 becomes 6 → death gaze 40% kill chance → 4 expected damage',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, armor:'orihalcon' },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  orihalconNoMissileBonusCoM2: {
    desc: 'Orihalcon (CoM2): non-magical missile ranged gets no +2 attack bonus, so missile 2 stays 2 → 2 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, armor:'orihalcon' },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Orihalcon\'s +2 does not reach a non-magical shot, so the only feature the fixture adds cannot move the number. The discriminator is the type inside a.modernAttacks.ranged, which candidates() does not enumerate - it reaches the ability maps, the seven UNIT_FIELD_DEFAULTS fields, the identity fields and the top-level combat fields (tools/preset_vacuity_sweep.js:250-293).',
      'a.armor=orihalcon':
        'Keep, and the absence is the rule under test: the strength write is gated on `slotHasMagicalRanged(u, c)` (stats_sequence.js:1071), which is `isMagicalRangedType(u[channel.rangedTypeField])` (combat_abilities.js:221-222), and that predicate lists the five magic tokens with \'missile\' among none of them (combat_abilities.js:202-205). The step\'s other write, `u.res += 1` (stats_sequence.js:1069), cannot show on this card: B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103) and no phase rolls against A\'s Resistance. The armor token gates that one step: `training:armorQuality` writes it onto the record and `orihalconActive` is `u.armorMaterial === \'orihalcon\'` read there (stats.js). orihalconMagicRangedBonusCoM2 differs only in the ranged type and pins 4.000 against this 2.000.',
    },
  },
  orihalconFocusMagicConvertedCoM2: {
    desc: 'Orihalcon (CoM2): Focus Magic preserves missile strength 2 while converting it to magic, then Orihalcon adds +2 → 4 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, armor:'orihalcon', abilities: { focusMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },

  // --- Reinforce Magic ---
  reinforceMagicResistanceCoM2: {
    desc: 'Reinforce Magic (CoM2): all units gain +2 resistance, so Death Gaze vs res 5 becomes res 7 → 3 dmg',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, abilities: { reinforceMagic: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  reinforceMagicMagicRangedCoM2: {
    desc: 'Reinforce Magic (CoM2): magical ranged gets +2 strength, so magic 2 becomes 4 → 4 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { reinforceMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  reinforceMagicMissileNoBonusCoM2: {
    desc: 'Reinforce Magic (CoM2): non-magical missile ranged gets no +2 attack bonus, so missile 2 stays 2 → 2 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { reinforceMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Reinforce Magic\'s +2 does not reach a non-magical shot, so the only feature the fixture adds cannot move the number. The discriminator is the type inside a.modernAttacks.ranged, which candidates() does not enumerate (tools/preset_vacuity_sweep.js:250-293).',
      'a.ability.reinforceMagic':
        'Keep, and the absence is the rule under test: the strength write is gated on `slotHasMagicalRanged(u, c)` (stats_sequence.js:1114), which reads the slot\'s live ranged type through `isMagicalRangedType` (combat_abilities.js:221-222), and \'missile\' is not one of the five magic tokens that predicate lists (combat_abilities.js:202-205). The step\'s unconditional `u.res += 2` (stats_sequence.js:1112) cannot show on this card: B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103) and no phase rolls against A\'s Resistance. reinforceMagicMagicRangedCoM2 differs only in the ranged type and pins 4.000 against this 2.000.',
    },
  },
  reinforceMagicFocusConvertedCoM2: {
    desc: 'Reinforce Magic (CoM2): Focus Magic preserves missile strength 2 while converting it to magic, then Reinforce Magic adds +2 → 4 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { reinforceMagic: true, focusMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },

  // --- Survival Instinct ---
  survivalInstinctFantasticBonusCoM2: {
    desc: 'Survival Instinct (CoM2): fantastic creature gets +10% To Hit, so atk 1 at base 30% becomes 40% → 0.4 dmg',
    version: V_COM2,
    a: { atk:1, hp:10, unitType: 'fantastic_nature', abilities: { survivalInstinct: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },
  survivalInstinctTransformedEligibleCoM2: {
    desc: 'Survival Instinct (CoM2): a normal unit transformed by Chaos Channels counts as fantastic_chaos and gains the +10% To Hit bonus → 0.4 dmg',
    version: V_COM2,
    a: { atk:1, hp:10, unitType: 'normal', abilities: { survivalInstinct: true, ccDefense: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },
  survivalInstinctSpiritLinkAssertsFantasticWarlord: {
    desc: 'Survival Instinct (Warlord) on a Spirit-Linked normal unit: the block tests the calculated record, `if U.Fantastic` at $005A1664 (Units.RecalculateUnits.pas), and Spirit Link asserts Fantastic in region b at UnitCalcPre.CAS!NOSPIRITLINK!-11 "SETSTAT(U,AFantastic,0,1);", so the +10% To Hit applies where it stands — atk 1 at base 30% becomes 40% → 0.4 dmg, against the 0.3 the same unit deals without Spirit Link. Reading the record the recalculation leaves instead answered for the region-d clearing write at UnitCalc.CAS!NOTICEAGE!+3 "IF GETENCHANTMENTFLAG(U,EncSpiritLink,1) THEN { SETSTAT(U,AFantastic,0,0); }", which is past this block, and gave 0.3.',
    version: V_WARLORD,
    a: { atk:1, hp:10, unitType: 'normal', abilities: { survivalInstinct: true, spiritLink: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },

  // --- Guardian ---
  guardianToHitCoM: {
    desc: 'Guardian (CoM): +10% To Hit, so atk 1 at base 30% becomes 40% → 0.4 dmg',
    version: V_COM,
    a: { atk:1, toHitMod:0, hp:10, abilities: { guardian: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.400 },
  },
  guardianToDefendCoM2: {
    desc: 'Guardian (CoM2): defender gets +10% To Defend, so 5 hits vs 1 shield at 40% block → 4.6 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:0, hp:10, abilities: { guardian: true } },
    expected: { dmgToA: 0, dmgToB: 4.600 },
  },
  guardianResistanceCoM2: {
    desc: 'Guardian (CoM2): +1 resistance, so Death Gaze vs res 5 becomes res 6 → 4 dmg',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, abilities: { guardian: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },

  // --- Tactician ---
  tacticianNormalDefenseCoM: {
    desc: 'Tactician (CoM): non-hero unit gets +1 defense. 5 hits vs 1 shield at 100% block → 4 dmg',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { tactician: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  tacticianHeroAttackCoM2: {
    desc: 'Tactician (CoM2): hero gets +2 melee attack. atk 1 becomes 3 → 3 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType: 'hero', abilities: { tactician: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  tacticianHeroCcDefenseCoM2: {
    desc: 'Tactician (CoM2): the branch is `if U.ishero` (Units.RecalculateUnits.pas:2417) — a hero test, not a unit-type test. Chaos Channels turns the hero into a fantastic Chaos creature and leaves the hero flag untouched, so the hero package still applies: atk 1 becomes 3 → 3 dmg. Spelling the hero question through the live unit-type token instead selected the non-hero +1 defense arm, for 1 dmg (F187).',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType: 'hero', abilities: { tactician: true, ccDefense: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.ccDefense':
        'Keep, and the absence is the rule under test: the claim is that a Chaos Channels conversion must not change which Tactician arm runs, so the spell is expected to move nothing. The branch reads `isHeroUnit` (combat_abilities.js:1188), which is `!!identityPredicates.isHero` (combat_abilities.js:677), handed in once as `!!identity.isHero` (stats.js:1603) and set at the input boundary from `input.unitType === \'hero\'` (stats_identity.js:134). The ccDefense control has two stat-affecting emission sites in `Calculator/`: the +3 Defense at combat_abilities.js:1068-1072, which nothing scores against because B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103), and the identity step whose declared `writes` are `[\'race\', \'fantastic\']` (stats_identity.js:347-350) - the token under test, and not the hero flag. So the hero arm\'s `addToSlot(u, ctx, \'melee\', 2)` (combat_abilities.js:1192) runs either way and atk 1 ends at 3. a.ability.tactician and a.unitType=hero are the live halves: without the retort no step writes the +2, and the non-hero arm writes Defense alone (combat_abilities.js:1212-1213), leaving 1.',
    },
  },
  tacticianHeroCcDefenseCoM: {
    desc: 'Tactician (CoM 1): the hero arm is guarded on `_UNITS[].Hero_Slot >= 0` (com1:0x90AB4), the permanent record\'s hero slot, so a Chaos-Channelled hero keeps it: atk 1 becomes 3 → 3 dmg, against 1 dmg while the gate read the live unit-type token (F187).',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, unitType: 'hero', abilities: { tactician: true, ccDefense: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.ccDefense':
        'Keep, and the absence is the rule under test: the CoM 1 arm takes the same branch test the CoM2 member of this pair does - `isHeroUnit` (combat_abilities.js:1188), `!!identityPredicates.isHero` (combat_abilities.js:677), set from `input.unitType === \'hero\'` at the input boundary (stats_identity.js:134) - and the version chooses only which secondary shape the arm writes through (`rangedTyped`, combat_abilities.js:1196). Chaos Channels cannot reach that flag: its two stat-affecting emission sites in `Calculator/` are the +3 Defense at combat_abilities.js:1068-1072, unscored here because B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103), and the identity step declaring `writes: [\'race\', \'fantastic\']` (stats_identity.js:347-350). So `addToSlot(u, ctx, \'melee\', 2)` (combat_abilities.js:1192) runs and atk 1 ends at 3; the arm\'s ranged half writes nothing because A\'s shared slot carries no type and no gaze, which is what `dosSharedSlotTyped` asks (combat_abilities.js:583-588). a.ability.tactician and a.unitType=hero are the live halves - the non-hero arm writes Defense alone (combat_abilities.js:1212-1213), leaving 1.',
    },
  },
  tacticianHeroCcDefenseWarpAttackWarlord: {
    desc: 'Tactician (Warlord): the hero grant and the region-`b` clawback net to the same +1 defense a non-hero gets, so the branch choice shows only once something between the two regions rescales the value. Warp Attack is that: melee 6 −2 at `b`, halved to 2 at `c`, +2 back after the Warp → 4 dmg. The non-hero arm the live token selected halves 6 to 3 and writes defense only, for 3 dmg (F187).',
    version: V_WARLORD,
    a: { atk:6, hitChance:70, hp:10, unitType: 'hero', abilities: { tactician: true, ccDefense: true, warpAttack: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'a.ability.ccDefense':
        'Keep, and the absence is the rule under test: the branch test is again `isHeroUnit` (combat_abilities.js:1188), `!!identityPredicates.isHero` (combat_abilities.js:677) from `input.unitType === \'hero\'` (stats_identity.js:134), and Chaos Channels writes neither term - its two stat-affecting emission sites in `Calculator/` are the +3 Defense at combat_abilities.js:1068-1072, unscored here because B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103), and the identity step declaring `writes: [\'race\', \'fantastic\']` (stats_identity.js:347-350). What makes the branch visible on this card is the rescaling between the hero path\'s two halves: `b:tactician`\'s `u.atk -= 2` (combat_abilities.js:1205-1207) runs first, Warp Attack halves in region `c` (stats_sequence.js:1362), and the region-`c` grant\'s `addToSlot(u, ctx, \'melee\', 2)` (combat_abilities.js:1192) is spliced after it - the Warlord manifest order `b:tactician` (stats_manifests.js:262), `c:warpAttack` (:289), `c:tactician` (:290). That is unchanged by the conversion, so 6 stays 4. a.ability.tactician, a.ability.warpAttack and a.unitType=hero are the live halves; the non-hero arm writes Defense alone (combat_abilities.js:1212-1213) and halves 6 to 3.',
    },
  },
  tacticianHeroRangedCoM2: {
    desc: 'Tactician (CoM2): hero gets +2 to ranged attack strength. missile 1 becomes 3 → 3 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, unitType: 'hero', abilities: { tactician: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  tacticianHeroThrownUnchangedCoM2: {
    desc: 'Tactician (CoM2) writes only conventional ranged: a hero\'s Thrown 1 stays 1 instead of receiving +2.',
    version: V_COM2,
    a: { atk:0, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10,
      unitType:'hero', abilities: { tactician: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the hero package\'s +2 does not reach a Thrown channel, so neither feature the fixture adds can move the number. The discriminator is the thrown entry in a.modernAttacks, which candidates() does not enumerate (tools/preset_vacuity_sweep.js:250-293).',
      'a.ability.tactician':
        'Keep, and the absence is the rule under test: the hero arm\'s secondary write is `addToSlot(u, ctx, \'ranged\', 2, strength => strength > 0)` (combat_abilities.js:1198), and the `ranged` gate is `isLiveSlot(u, channel) && u[channel.rangedTypeField] !== \'none\'` (combat_abilities.js:555). The thrown channel\'s ranged-type field is `rangedTypeThrown` (steps.js:805), and a `type: \'thrown\'` attack leaves it at \'none\' because the token is a THROWN_TYPES member and lands in the thrown-type field instead (stats.js:1154-1155), so the gate refuses and Thrown 1 stays 1. The arm\'s other writes cannot show either: the melee +2 is refused by `hasMeleeAttackAt`, `runCtx.base.atk > 0` (stats.js:977, consulted at combat_abilities.js:528) with base melee 0, and A\'s Defense and Resistance are never scored against because B carries no attack (`atk` defaults to 0, UNIT_DEFAULTS, data.js:103).',
      'a.unitType=hero':
        'Keep, and the absence is the rule under test: the hero flag is what selects the arm whose exclusion is being measured (`isHeroUnit`, combat_abilities.js:1188, from `input.unitType === \'hero\'`, stats_identity.js:134), so it has to stand on the card for the +2 to be attempted at all - but ablating it only substitutes the non-hero arm, whose single write is `u.def += 1` (combat_abilities.js:1213), and nothing scores against A\'s Defense here. Either arm leaves Thrown at 1.',
    },
  },
  tacticianHeroDefenseCoM2: {
    desc: 'Tactician (CoM2): hero gets +2 defense. 5 hits vs 2 shields at 100% block → 3 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, unitType: 'hero', abilities: { tactician: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  tacticianHeroResistanceCoM2: {
    desc: 'Tactician (CoM2): hero gets +2 resistance, so Death Gaze vs res 5 becomes res 7 → 3 dmg',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, unitType: 'hero', abilities: { tactician: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  tacticianHeroDefenseWarlord: {
    desc: 'Tactician (Warlord): hero gets only +1 defense (not +2). 5 hits vs 1 shield at 100% block → 4 dmg',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, unitType: 'hero', abilities: { tactician: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'b.unitType=hero':
        'Keep, and the absence is the rule under test: Warlord reaches its flat +1 by subtracting from the compiled hero grant rather than replacing it, so the hero path is `u.def += 2` in region `c` (combat_abilities.js:1192) with `u.def -= 1` in region `b` (combat_abilities.js:1205-1207), while the non-hero path is the single `u.def += 1` (combat_abilities.js:1213). The two nets agree, which is what this version\'s Tactician tooltip states in as many words (enchantments.js:62), so hero-ness cannot move the number here. What the 4.000 does pin is that net: drop the clawback and the hero stands at Defense 2, blocking 2 of the 5 hits for 3.000. tacticianHeroDefenseCoM2 is this card with only `version` changed and pins exactly that 3.000, where the hero grant stands unreduced. b.ability.tactician is the live half.',
    },
  },
  tacticianTeleportingFirstStrikeWarlord: {
    desc: 'Tactician (Warlord): teleporting unit gains First Strike — kills B before B can counter',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { tactician: true, teleporting: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  tacticianNonCorporealNegateFirstStrikeWarlord: {
    desc: 'Tactician (Warlord): non-corporeal unit gains Negate First Strike — B survives to retaliate (dmgToA=5)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, hitChance:70, hp:9, toBlkMod:70, abilities: { tactician: true, nonCorporeal: true } },
    expected: { dmgToA: 5.000, dmgToB: 9.000 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test: the exchange takes the First Strike path only on `!isRanged && hasAbil(a.abilities, \'firstStrike\') && !hasAbil(b.abilities, \'negateFirstStrike\')` (combat.js:85-87, branch at :889), so a negated First Strike and an absent one make that term false the same way and ablating A\'s flag cannot move anything - that equivalence is the claim. The 5.000 to A is what witnesses it: A\'s 10 at 100% takes B\'s whole 9-point pool, so on the First Strike path B is gone before the counter and dmgToA is 0. Both of B\'s features are live halves: `applyTacticianWarlordEffects` returns before writing anything without the retort (combat_effects.js:132) and reaches `negateFirstStrike` only through `hasNonCorporealEffect` (combat_effects.js:135), whose first term is `nonCorporeal` (combat_special_attacks.js:610-613).',
    },
  },
  tacticianWraithFormNegateFirstStrikeWarlord: {
    desc: 'Tactician (Warlord): Wraith Form unit gains Negate First Strike — B survives to retaliate (dmgToA=5)',
    version: V_WARLORD,
    a: { atk:12, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, hitChance:70, hp:1, toBlkMod:70, abilities: { tactician: true, wraithForm: true } },
    expected: { dmgToA: 5.000, dmgToB: 1.000 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test: `hasFirstStrike` is `!isRanged && hasAbil(a.abilities, \'firstStrike\') && !hasAbil(b.abilities, \'negateFirstStrike\')` (combat.js:85-87, branch at :889), so the negation and an absent flag close the same term and A\'s First Strike is expected to move nothing - that is the claim. The 5.000 to A carries it: A\'s 12 at 100% empties B\'s 1-point pool, so on the First Strike path the counter never happens and dmgToA is 0. This member pins the second term of `hasNonCorporealEffect`, `wraithForm` (combat_special_attacks.js:610-613), read by `applyTacticianWarlordEffects` at combat_effects.js:135 under the retort guard at :132; b.ability.tactician and b.ability.wraithForm are the live halves.',
    },
  },
  tacticianRulerNegateFirstStrikeWarlord: {
    desc: 'Tactician (Warlord): Ruler of Underworld unit gains Negate First Strike — B survives to retaliate (dmgToA=5)',
    version: V_WARLORD,
    a: { atk:12, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, hitChance:70, hp:1, toBlkMod:70, abilities: { tactician: true, rulerOfUnderworld: true } },
    expected: { dmgToA: 5.000, dmgToB: 1.000 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test: `hasFirstStrike` is `!isRanged && hasAbil(a.abilities, \'firstStrike\') && !hasAbil(b.abilities, \'negateFirstStrike\')` (combat.js:85-87, branch at :889), so the negation makes that term false exactly as an absent flag would and ablating A\'s First Strike cannot move the number - the claim itself. The 5.000 to A witnesses it: A\'s 12 at 100% empties B\'s 1-point pool, so on the First Strike path there is no counter and dmgToA is 0. This member pins the third term of `hasNonCorporealEffect`, `rulerOfUnderworldActiveForUnit` (combat_special_attacks.js:613), which carries a version gate of its own (:537-539) beside the ability test; b.ability.tactician is the live half at the retort guard `applyTacticianWarlordEffects` makes (combat_effects.js:132).',
    },
  },

  // --- Favored Terrain ---
  favoredTerrainDefenseWarlord: {
    desc: 'Favored Terrain (Warlord): unit on favored tile gets +1 defense. 5 hits vs 1 shield at 100% block → 4 dmg',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { favoredTerrain: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  favoredTerrainToHitWarlord: {
    desc: 'Favored Terrain (Warlord): unit on favored tile gets +5% To Hit. 10 dice at 30%+5%=35% → 3.5 dmg',
    version: V_WARLORD,
    a: { atk:10, hp:10, abilities: { favoredTerrain: true } },
    b: { def:0, atk:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 3.500 },
  },
  favoredTerrainTacticianDefenseWarlord: {
    desc: 'Favored Terrain + Tactician (Warlord): terrain bonus doubled (+2 def) stacks with Tactician +1 def → +3. 5 hits vs 3 shields at 100% block → 2 dmg',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { favoredTerrain: true, tactician: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  favoredTerrainTacticianToHitWarlord: {
    desc: 'Favored Terrain + Tactician (Warlord): To Hit bonus doubled to +10%. 10 dice at 30%+10%=40% → 4.0 dmg',
    version: V_WARLORD,
    a: { atk:10, hp:10, abilities: { favoredTerrain: true, tactician: true } },
    b: { def:0, atk:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  favoredTerrainTacticianFirstStrikeWarlord: {
    desc: 'Favored Terrain + Tactician (Warlord): unit gains First Strike — kills B before B can counter (dmgToA=0)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { favoredTerrain: true, tactician: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  favoredTerrainTacticianNegateFirstStrikeWarlord: {
    desc: 'Favored Terrain + Tactician (Warlord): unit gains Negate First Strike — survives A\'s First Strike to retaliate (dmgToA=5)',
    version: V_WARLORD,
    a: { atk:20, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, hitChance:70, hp:10, toBlkMod:70, abilities: { favoredTerrain: true, tactician: true } },
    expected: { dmgToA: 5.000, dmgToB: 10.000 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test: `hasFirstStrike` is `!isRanged && hasAbil(a.abilities, \'firstStrike\') && !hasAbil(b.abilities, \'negateFirstStrike\')` (combat.js:85-87, branch at :889), so A\'s flag and its negation cancel to the same path and the ablation is expected to be inert. The claim rides on dmgToA, not dmgToB: the doubled terrain bonus puts B at Defense 2 (`u.def += 1 * mult` with `mult` 2 under the retort, combat_abilities.js:1223, 1226), which still leaves A\'s 20 enough to take the whole 10-point pool, so dmgToB is at the pool either way while the 5.000 to A is what a lost negation would drop to 0. This member pins the favoredTerrain arm, which grants both flags together (combat_effects.js:137-140) rather than going through `hasNonCorporealEffect`; b.ability.favoredTerrain and b.ability.tactician are the live halves, the retort being the function\'s own guard (combat_effects.js:132).',
    },
  },

  // --- Fortification ---
  fortificationRangedWarlord: {
    desc: 'Fortification Ranged (Warlord): missile 4 (100% hit) vs def 1+3=4 (100% block) → 0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:4, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp: 10 },
    b: { def: 1, toBlkMod: 70, hp: 10, abilities: { fortification: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  fortificationBreathWarlord: {
    desc: 'Fortification Breath (Warlord): fire breath 4 (100% hit) vs def 1+3=4 (100% block) → 0; melee 1 vs def 1 → 0',
    version: V_WARLORD,
    a: { atk: 1, hitChance:70, modernAttacks: { fireBreath: { strength:4, type:'fire' } }, hp: 10 },
    b: { atk: 0, def: 1, toBlkMod: 70, hp: 10, abilities: { fortification: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },

  fortificationLargeShieldUpgradeWarlord: {
    desc: 'Fortification on a unit that already has Large Shield grants Missile Immunity instead: missile 12 (100% hit) vs def raised to 100 → 0 (would be 12−5=7 with only Large Shield)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:12, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp: 10 },
    b: { def: 2, toBlkMod: 70, hp: 20, abilities: { largeShield: true, fortification: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  fortificationSeesMagitekLargeShieldWarlord: {
    desc: 'Fortification\'s already-shielded test is `GETSTAT(U,ALargeShield,0)` — the calculated record at `UnitCalc.CAS!NOHILLFORT!+7 "IF (GETSTAT(U,ALargeShield,0)>0) THEN { SETSTAT(U,AMissileImmunity,0,1); } ELSE { SETSTAT(U,ALargeShield,0,1); }"` — and Magitek Engineering set that same flag back in `UnitCalcPre.CAS!NOXENOVET!+9 "SETSTAT(U,ALargeShield,0,1);"`, region `b`. So a Power Engine unit inside the walls takes the Missile Immunity arm: missile 12 vs an immune defender is 0. Applying Fortification ahead of the reform grants instead answered from before the region-`b` write and gave plain Large Shield, for 12−(2+3)=7 (F200).',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:12, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp: 10 },
    b: { def: 2, toBlkMod: 70, hp: 20,
      abilities: { outlanderWizard: true, mechanical: true, heatPowerEngine: true,
        magitekEngineering: true, fortification: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  fortificationRestoresRustedLargeShieldWarlord: {
    desc: 'Rust clears the flag with `SETSTAT(U,ALargeShield,0,0)` at `UnitCalc.CAS!NOTCITY!+16 "SETSTAT(U,ALargeShield,0,0);"` and Fortification reads it 576 lines later at `UnitCalc.CAS!NOHILLFORT!+7 "IF (GETSTAT(U,ALargeShield,0)>0) THEN { SETSTAT(U,AMissileImmunity,0,1); } ELSE { SETSTAT(U,ALargeShield,0,1); }"`, so the shielded unit ends the block with plain Large Shield rather than Missile Immunity: missile 12 vs def 2+3 blocked at 100% is 7. With the clear taken after the chain instead, Fortification saw the innate shield, granted Missile Immunity, and the strip then removed the shield too, for 0 (F200).',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:12, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp: 10 },
    b: { def: 2, toBlkMod: 70, hp: 20,
      abilities: { largeShield: true, rust: true, fortification: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'b.ability.largeShield':
        'Keep, and the absence is the rule under test: `d:rust` clears the flag with `u.largeShield = false` (stats.js:1622) and `d:fortification` reads what stands there - `if (u.largeShield) u.missileImmunity = true; else u.largeShield = true;` (stats_sequence.js:1566-1567) - with the Warlord manifest putting `d:rust` (stats_manifests.js:294) ahead of `d:fortification` (:295). So the innate shield is already gone at the read, and the card with it and the card without it both end holding plain Large Shield, worth +3 effective Defense against the shot (combat_effects.js:434-436): 12 - (2+3) = 7. The shield still has to stand on the card, because it is the thing the two orderings disagree about - answer Fortification from before the clear and the innate shield selects the Missile Immunity arm instead, for 0. fortificationLargeShieldUpgradeWarlord is this card without `rust` and pins that 0. b.ability.rust is the live half.',
    },
  },
});
