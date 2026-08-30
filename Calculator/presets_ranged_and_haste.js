// Numeric presets. Ranged distance penalties and their version differences, Warlord
// experience bonuses, the Warlord source-record placement for Stoning and Death Touch, and Haste.
definePresets({
  rangedMissileBasic: {
    desc: 'Ranged Missile: 100% base to hit, range 9 → 70% effective (−30% penalty)',
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 9,
    expected: { dmgToA: 0, dmgToB: 0.700 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rtbType, which candidates() does not enumerate. It is the missile arm of the gate at combat_abilities.js:428; rangedMagicBasic differs only in rtbType and pins 1.000.',
    },
  },
  rangedBoulderBasic: {
    desc: 'Ranged Boulder: 100% base to hit, range 9 → 70% effective (−30% penalty)',
    a: { toHitRtbMod:70, rtbType:'boulder', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 9,
    expected: { dmgToA: 0, dmgToB: 0.700 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rtbType, which candidates() does not enumerate. It is the boulder arm of the gate at combat_abilities.js:428; rangedMagicBasic differs only in rtbType and pins 1.000. longRangeBoulder also carries boulder, so this is not the only fixture that would catch the arm being dropped.',
    },
  },
  rangedMagicBasic: {
    desc: 'Ranged Magic: 100% base to hit, range 9 → 100% effective (no distance penalty)',
    a: { toHitRtbMod:70, rtbType:'magic_c', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 9,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'no-ablatable-feature':
        'Keep, and the absence is the subject. The discriminator is rtbType, which candidates() does not enumerate. Magic ranged fails the missile/boulder gate at combat_abilities.js:428 and takes no distance penalty at all; rangedMissileBasic and rangedBoulderBasic differ only in rtbType and pin 0.700.',
    },
  },
  magicImmunityMagicRanged: {
    desc: 'Magic Immunity vs sorcery magic ranged: def raised to 50 → rtb 3 fully blocked → 0 dmg',
    a: { rtbType:'magic_s', rtb:3, toHitRtbMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { magicImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  longRangeMissile: {
    desc: 'Long Range Missile: 100% base to hit, range 9 → penalty capped at −10% → 90% effective',
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10, abilities: { longRange: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 9,
    expected: { dmgToA: 0, dmgToB: 0.900 },
  },
  longRangeBoulder: {
    desc: 'Long Range Boulder: 100% base to hit, range 6 → penalty capped at −10% → 90% effective',
    a: { toHitRtbMod:70, rtbType:'boulder', rtb:1, hp:10, abilities: { longRange: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 6,
    expected: { dmgToA: 0, dmgToB: 0.900 },
  },
  longRangeClose: {
    desc: 'Long Range at range 2: no penalty anyway, Long Range has no effect',
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10, abilities: { longRange: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 2,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction. At range 2 the MoM ladder gives -10 * floor(2/3) = 0, so the cap has nothing to clamp and the assertion is that the value stays at 1.000.',
      'a.ability.longRange':
        'Keep, and the only fixture that pins the cap at combat_abilities.js:438 as conditional. Written flat as `if (longRange) penalty = -10` it returns 0.900 here; longRangeMissile is unmoved by that error, and longRangeMidRange, which was also unmoved by it, was deleted as redundant under T2.',
    },
  },
  // --- Ranged distance penalty version differences ---
  distPenaltyMoM3: {
    desc: 'MoM 1.60: range 3 → −10% penalty → 90% effective (penalty kicks in at 3 tiles)',
    version: V_MOM_CP,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 3,
    expected: { dmgToA: 0, dmgToB: 0.900 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rangedDist, which candidates() does not enumerate. Pins the MoM 3-tile divisor at combat_abilities.js:436 at its first step; distPenaltyMoM12 differs only in rangedDist and pins 0.600.',
    },
  },
  distPenaltyMoM12: {
    desc: 'MoM 1.60: range 12 → −40% penalty → 60% effective (uncapped per-3-tile penalty)',
    version: V_MOM_CP,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 12,
    expected: { dmgToA: 0, dmgToB: 0.600 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rangedDist, which candidates() does not enumerate. Pins the MoM ladder as uncapped at four steps (combat_abilities.js:436); distPenaltyMoM3 differs only in rangedDist and pins 0.900.',
    },
  },
  distPenaltyCoM3: {
    desc: 'CoM 6.08: range 3 → no penalty (threshold is 4 tiles) → 100% effective',
    version: V_COM,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 3,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rangedDist, which candidates() does not enumerate. Pins the CoM threshold as 4 rather than MoM\'s 3 (combat_abilities.js:434): floor(3/4) = 0, so range 3 costs nothing. distPenaltyCoM6, CoM12 and CoM16 differ only in rangedDist and pin 0.900, 0.700 and 0.600.',
    },
  },
  distPenaltyCoM12: {
    desc: 'CoM 6.08: range 12 → −30% penalty → 70% effective (per-4-tile penalty)',
    version: V_COM,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 12,
    expected: { dmgToA: 0, dmgToB: 0.700 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rangedDist, which candidates() does not enumerate. Pins the CoM ladder\'s third step (combat_abilities.js:434); its three rangedDist siblings pin 1.000, 0.900 and 0.600.',
    },
  },
  distPenaltyHeroMoM12: {
    desc: 'MoM 1.60: hero archer at range 12 → −40% penalty → 60% effective (no hero exemption)',
    version: V_MOM_CP,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10, unitType:'hero' },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 12,
    expected: { dmgToA: 0, dmgToB: 0.600 },
    vacuity: {
      'every-feature-inert':
        'Inert by design: MoM grants no hero exemption, so the hero takes the full -40. distPenaltyMoM12 differs only in a.unitType and pins the same 0.600.',
      'a.unitType=hero':
        'Keep, and the absence is the rule under test. The exemption at combat_abilities.js:429 is gated on version.startsWith(\'com\'), and this is its MoM arm. distPenaltyHeroCoM12 is the positive arm: the same fixture in CoM pins 1.000 against distPenaltyCoM12\'s 0.700. version-dead is expected here - no other mom_cp_1.60.00 preset makes hero move a number.',
    },
  },
  distPenaltyHeroCoM12: {
    desc: 'CoM 6.08: hero archer at range 12 → no penalty at all → 100% effective '
      + '(WIZARDS.EXE 0x99B64 skips the block when Hero_Slot >= 0)',
    version: V_COM,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10, unitType:'hero' },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 12,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  distPenaltyCoM6: {
    desc: 'CoM 6.08: range 6 → −10% (4–7 tile tier) → 90% effective',
    version: V_COM,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 6,
    expected: { dmgToA: 0, dmgToB: 0.900 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rangedDist, which candidates() does not enumerate. Pins the CoM ladder\'s first step (combat_abilities.js:434); its three rangedDist siblings pin 1.000, 0.700 and 0.600.',
    },
  },
  distPenaltyCoM2_6: {
    desc: 'CoM2 1.05.11: range 6 → −10% − 3%×(6−4) = −16% → 84% effective',
    version: V_COM2,
    a: { hitRanged:70, hitThrown:70, hitBreath:70, modernAttacks: { ranged: { strength:1, type:'missile' } }, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 6,
    expected: { dmgToA: 0, dmgToB: 0.840 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rangedDist, which candidates() does not enumerate. Pins the CoM2 ladder as -10 - 3*(d-4) rather than a per-tier step (combat_abilities.js:432); distPenaltyCoM2_16 differs only in rangedDist and pins 0.540, and the two together fix both the intercept and the slope.',
    },
  },
  // Which projectile type the penalty asks about: the finished one, not the permanent one. F131
  // re-aimed this from Blaze of Glory, whose transfer empties the Ranged field and so withdraws
  // ranged mode before any type is read; Focus Magic is the retype that leaves the attack live.
  focusMagicRetypeSkipsDistancePenaltyCoM2: {
    desc: 'The distance penalty is a resolution-time read of the **finished** projectile type '
      + '(distancePenaltyFor, stats.js). Focus Magic finds a live conventional Ranged attack '
      + 'whose permanent type is not already magical and retypes it in place to shot type 34, '
      + 'IsMagic (Units.RecalculateUnits.pas:873-910, `c:focusMagic`), leaving strength 1 in a '
      + 'Ranged field that is neither missile nor boulder — so nothing is charged at range 6 and '
      + 'the volley lands at 30+70 = 100% for 1.0. distPenaltyCoM2_6 is the same unit without '
      + 'Focus Magic: still a missile at range 6, and it pays CoM2\'s −10 − 3×(6−4) = −16% for '
      + '0.840. Reading the permanent type here charges the retyped attack that same −16%, for '
      + '0.840; strength, To Hit and distance are the same in both, so the 0.16 is the type read '
      + 'alone.',
    version: V_COM2,
    a: { hitRanged:70, hitThrown:70, hitBreath:70, modernAttacks: { ranged: { strength:1, type:'missile' } }, hp:10,
      abilities: { focusMagic: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 6,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  distPenaltyCoM16: {
    desc: 'CoM 6.08: range 16 → −40% penalty → 60% effective (uncapped per-4-tile penalty)',
    version: V_COM,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 16,
    expected: { dmgToA: 0, dmgToB: 0.600 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rangedDist, which candidates() does not enumerate. Pins the CoM ladder as uncapped at four steps (combat_abilities.js:434); its three rangedDist siblings pin 1.000, 0.900 and 0.700.',
    },
  },
  distPenaltyCoM2_16: {
    desc: 'CoM2 1.05.11: range 16 → −10% − 3%×(16−4) = −46% → 54% effective',
    version: V_COM2,
    a: { hitRanged:70, hitThrown:70, hitBreath:70, modernAttacks: { ranged: { strength:1, type:'missile' } }, hp:10 },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 16,
    expected: { dmgToA: 0, dmgToB: 0.540 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rangedDist, which candidates() does not enumerate. The far end of the CoM2 ladder (combat_abilities.js:432), and with distPenaltyCoM2_6 it fixes both the intercept and the slope.',
    },
  },

  thrownBasic: {
    desc: 'Thrown: 100% to hit thrown, B dies before melee/counter fires',
    a: { atk:1, rtbType:'thrown', rtb:1, toHitRtbMod:70, def:0, hp:1 },
    b: { atk:1, toHitMod:70, def:0, hp:1 },
    expected: { dmgToA: 0, dmgToB: 1 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rtbType, which candidates() does not enumerate. dmgToA 0 is the claim: the thrown channel resolves before melee, so B dies without ever countering. Lose the channel and B survives to counter for 1.',
    },
  },
  fireBreathBasic: {
    desc: 'Fire Breath: 100% to hit breath, B dies before melee/counter fires',
    a: { atk:1, rtbType:'fire', rtb:1, toHitRtbMod:70, def:0, hp:1 },
    b: { atk:1, toHitMod:70, def:0, hp:1 },
    expected: { dmgToA: 0, dmgToB: 1 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rtbType, which candidates() does not enumerate. thrownBasic differs only in rtbType and pins the same 0/1, which is the assertion: fire breath resolves on the same pre-melee channel as thrown. Lose the channel and B survives to counter for 1.',
    },
  },
  lightningBreathBasic: {
    desc: 'Lightning Breath: 100% to hit breath, B dies despite 1 defense (lightning is AP)',
    a: { atk:1, rtbType:'lightning', rtb:1, toHitRtbMod:70, def:0, hp:1 },
    b: { atk:1, toHitMod:70, def:1, toBlkMod:70, hp:1 },
    expected: { dmgToA: 0, dmgToB: 1 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is rtbType, which candidates() does not enumerate. B holds def 1 at a 100% block chance, so a non-AP breath 1 deals 0 and B counters; lightning\'s own AP arm at combat_effects.js:997 halves def to 0 for the kill. No one-value sibling exists - fireBreathBasic differs in b.def and b.toBlkMod as well.',
    },
  },
  lightningResistCancelsAP: {
    desc: 'Lightning Resist cancels AP: breath 2 (100% hit) vs def 2 (100% block) — AP cancelled, 2−2=0',
    a: { atk:1, toHitMod:70, rtbType:'lightning', rtb:2, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { lightningResist: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  lightningResistKeepsAbilityAP: {
    desc: 'Lightning Resist + AP ability: ability AP still halves def 2→1, breath 2−1=1',
    a: { atk:1, toHitMod:70, rtbType:'lightning', rtb:2, toHitRtbMod:70, hp:10, abilities: { armorPiercing: true } },
    b: { atk:0, def:2, toBlkMod:70, hp:10, abilities: { lightningResist: true } },
    expected: { dmgToA: 0, dmgToB: 1 },
    vacuity: {
      'b.ability.lightningResist':
        'Keep, and the absence is the rule under test. combat_effects.js:996-997 makes the thrown path\'s AP `aArmorPiercing || (isLightning && !lightningResist)`, so Lightning Resist cancels only the lightning-derived arm and the ability\'s own AP survives. lightningResistCancelsAP differs only in a.abilities.armorPiercing and pins 0; armorPiercingLightningNoDoubleHalve differs only in this ability and pins the same 1, which is the control.',
    },
  },
  // `Combat.ApplyAttack.pas:230-231` sets `islightning` on the modern conventional ranged path
  // from the projectile id — `rangedtype = 30`, the lightning bolt — and Lightning Resist then
  // clears Armor Piercing in `EffectiveDefense`. The pair below is the id-30 arm and its boundary:
  // a plain magical projectile is not lightning, so Armor Piercing still halves.
  lightningResistCancelsAPLightningBoltRangedCoM2: {
    desc: 'Lightning Resist vs id-30 ranged (CoM2): magical-lightning ranged 4 (100% hit) + AP vs def 4 (100% block) — AP cancelled, def stays 4, 4−4=0',
    version: V_COM2,
    a: { atk:0, modernAttacks: { ranged: { strength:4, type:'magic_lightning' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { armorPiercing: true } },
    b: { atk:0, def:4, toBlkMod:70, hp:10, abilities: { lightningResist: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  lightningResistKeepsAPMagicRangedCoM2: {
    desc: 'Lightning Resist boundary (CoM2): a plain magical ranged 4 is not id 30, so AP still halves def 4→2 — 4−2=2. The exclusion is the rule under test: `islightning` keys on the projectile id, not on magical-ness',
    version: V_COM2,
    a: { atk:0, modernAttacks: { ranged: { strength:4, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { armorPiercing: true } },
    b: { atk:0, def:4, toBlkMod:70, hp:10, abilities: { lightningResist: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'b.ability.lightningResist':
        'Keep, and the absence is the rule under test. On the modern ranged path `isLightning` is `rangedType === \'magic_lightning\'` alone (combat_effects.js:679), so a plain magical ranged is not lightning and effectiveDefense:armorPiercing still halves. lightningResistCancelsAPLightningBoltRangedCoM2 differs only in the ranged type and pins 0.',
    },
  },
  lightningResistCancelsAPLightningBoltRangedWarlord: {
    desc: 'Lightning Resist vs id-30 ranged (Warlord): magical-lightning ranged 4 (100% hit) + AP vs def 4 (100% block) — AP cancelled, def stays 4, 4−4=0',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { ranged: { strength:4, type:'magic_lightning' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { armorPiercing: true } },
    b: { atk:0, def:4, toBlkMod:70, hp:10, abilities: { lightningResist: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  lightningResistKeepsAPMagicRangedWarlord: {
    desc: 'Lightning Resist boundary (Warlord): a plain magical ranged 4 is not id 30, so AP still halves def 4→2 — 4−2=2. The exclusion is the rule under test: `islightning` keys on the projectile id, not on magical-ness',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { ranged: { strength:4, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { armorPiercing: true } },
    b: { atk:0, def:4, toBlkMod:70, hp:10, abilities: { lightningResist: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'b.ability.lightningResist':
        'Keep, and the absence is the rule under test. On the modern ranged path `isLightning` is `rangedType === \'magic_lightning\'` alone (combat_effects.js:679), so a plain magical ranged is not lightning and effectiveDefense:armorPiercing still halves. lightningResistCancelsAPLightningBoltRangedWarlord differs only in the ranged type and pins 0.',
    },
  },
  levelWeaponBonus: {
    desc: 'Level+Weapon Bonus: Champion+Adamantium (base 1atk/2def/1hp) matches defender with equivalent effective stats',
    a: { figs:8, atk:1, def:2, res:5, hp:1, level:'champion', weapon:'adamantium' },
    b: { figs:8, atk:6, toHitMod:40, toHitRtbMod:30, def:6, res:10, hp:3 },
    expected: { dmgToA: 17.375, dmgToB: 17.375 },
  },

  // --- Warlord experience bonuses (Ultra Elite / Champion differ from CoM2) ---
  // Each Warlord case is paired with the identical CoM2 scenario so only the version differs.
  experienceChampionMeleeCoM2: {
    desc: 'Champion melee (CoM2): +3 attack. base 2 + 3 = 5 → 5 dmg at 100% hit vs def 0',
    version: V_COM2,
    a: { atk:2, hitChance:70, hp:10, level:'champion' },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  experienceChampionMeleeWarlord: {
    desc: 'Champion melee (Warlord): +4 attack (vs CoM2 +3). base 2 + 4 = 6 → 6 dmg at 100% hit vs def 0',
    version: V_WARLORD,
    a: { atk:2, hitChance:70, hp:10, level:'champion' },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  experienceUltraEliteThrownCoM2: {
    desc: 'Ultra Elite thrown (CoM2): +1 thrown (melee +3 same both versions). melee 1+3=4 + thrown 1+1=2 = 6 dmg at 100% hit vs def 0',
    version: V_COM2,
    a: { atk:1, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hitChance:70, hp:10, level:'ultra_elite' },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  experienceUltraEliteThrownWarlord: {
    desc: 'Ultra Elite thrown (Warlord): +2 thrown (vs CoM2 +1; melee +3 same). melee 1+3=4 + thrown 1+2=3 = 7 dmg at 100% hit vs def 0',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hitChance:70, hp:10, level:'ultra_elite' },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  experienceChampionDefenseCoM2: {
    desc: 'Champion defense (CoM2): +3 armor. atk 10 at 100% block vs def 3 → 7 dmg',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:30, level:'champion' },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  experienceChampionDefenseWarlord: {
    desc: 'Champion defense (Warlord): +5 armor (vs CoM2 +3). atk 10 at 100% block vs def 5 → 5 dmg',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { atk:0, def:0, toBlkMod:70, hp:30, level:'champion' },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  experienceUltraEliteToHitCoM2: {
    desc: 'Ultra Elite to-hit (CoM2): +0% to-hit. atk 10 + UE 3 = 13 at base 30% vs def 0 → 13×0.30 = 3.9',
    version: V_COM2,
    a: { atk:10, hp:10, level:'ultra_elite' },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 3.900 },
  },
  experienceUltraEliteToHitWarlord: {
    desc: 'Ultra Elite to-hit (Warlord): +5% to-hit (vs CoM2 +0%). atk 10 + UE 3 = 13 at 35% vs def 0 → 13×0.35 = 4.55',
    version: V_WARLORD,
    a: { atk:10, hp:10, level:'ultra_elite' },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 4.550 },
  },
  // Note: a champion defender also gains the version's defense bonus, so the attack
  // strength is set far above any possible block to overwhelm defense — damage then
  // caps deterministically at the single figure's HP pool, isolating the HP difference.
  experienceChampionHpCoM2: {
    desc: 'Champion HP (CoM2): +2 hp → single figure pool 1+2=3. 20 melee overwhelms def, dmg caps at pool → 3',
    version: V_COM2,
    a: { atk:20, hitChance:70, hp:10 },
    b: { atk:0, def:0, hp:1, level:'champion' },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  experienceChampionHpWarlord: {
    desc: 'Champion HP (Warlord): +1 hp (vs CoM2 +2) → single figure pool 1+1=2. 20 melee overwhelms def, dmg caps at pool → 2',
    version: V_WARLORD,
    a: { atk:20, hitChance:70, hp:10 },
    b: { atk:0, def:0, hp:1, level:'champion' },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },

  // --- The level ladder's four base-record gates ---
  // `ApplyLevelBonus` gates its ranged write on `BaseUnits[i].rangedtype > 0` alone, with no
  // strength test, and its Thrown and two Breath writes on `BaseUnits[i].thrown`,
  // `.firebreath` and `.lightningbreath` being positive — the permanent record in the normal
  // arm, the calculated fields in the hero arm (Units.RecalculateUnits.pas:548-571, :509-530).
  levelRangedGateZeroStrengthCoM2: {
    desc: 'The ranged level bonus is gated on the permanent ranged *type*, with no strength test: a record carrying a magical ranged type at strength 0 finishes Champion on the CoM2 MagicRanged column, 0 + 3 = 3, so the ladder creates the attack. UNITS.INI ships one such record (Warlord [362] Wanderer, RangedType=30 with Ranged=0). The same card at level normal deals 0.',
    version: V_COM2,
    a: { figs:1, atk:0, modernAttacks: { ranged: { strength: 0, type: 'magic' } },
      level:'champion', hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { atk:0, def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  levelRangedGateZeroStrengthWarlord: {
    desc: 'The same zero-strength typed ranged record under Warlord, whose MagicRanged column gives Champion 4 where CoM2 gives 3: 0 + 4 = 4. The same card at level normal deals 0.',
    version: V_WARLORD,
    a: { figs:1, atk:0, modernAttacks: { ranged: { strength: 0, type: 'magic' } },
      level:'champion', hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { atk:0, def:0, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  levelThrownGateBaseRecordWarlord: {
    desc: 'Explosive Reform writes `SETSTAT(U,SThrown,0,...)` (UnitCalcPre.CAS:1071) — record selector 0, the calculated record — so `BaseUnits[i].thrown` is still zero when the normal arm reads it and the Thrown ladder adds nothing. One figure gives Thrown 7, and Champion melee is 5 + 4 = 9, for 16.0. Reading the calculated field instead would carry the Thrown to 9, for 18.0.',
    version: V_WARLORD,
    a: { figs:1, atk:5, level:'champion', hitChance:70, hp:10,
      abilities: { outlanderWizard: true, explosive: true } },
    b: { atk:0, def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 16.000 },
  },
  levelThrownGateHeroCalculatedWarlord: {
    desc: 'The paired hero case: the hero arm tests the *calculated* Thrown field, so the same Explosive Reform grant does take the Champion Thrown step — Thrown 7 + 2 = 9 beside melee 9, for 18.0 where the normal arm gives 16.0. The +2 comes from the [Normal] ladder because the separate nine-step [Hero] progression is not modelled (D27/F41); what this pair fixes is which record each arm reads.',
    version: V_WARLORD,
    a: { figs:1, atk:5, level:'champion', unitType:'hero', hitChance:70, hp:10,
      abilities: { outlanderWizard: true, explosive: true } },
    b: { atk:0, def:0, hp:30 },
    expected: { dmgToA: 0, dmgToB: 18.000 },
  },
  wandererRosterRangedTypeWarlord: {
    desc: 'The one shipped record of that shape, read from the roster instead of a projection: `UNITS.INI [362]` Wanderer states `RangedType=30` (`RangedType.INI [30] IsMagic=Yes`) with `Ranged=0`, so `ranged_type` is a roster fact and `Ranged` is not. A Champion strayed Wanderer therefore takes the Warlord MagicRanged ladder on a record it has no strength in, and Transmute Equipment adds 2: 0 + 4 + 2 = 6 at the Champion 50% To Hit, for 3.0. A build whose roster generation drops `RangedType` when `Ranged` is zero leaves the record typeless, the ladder skips it, and the same card deals 1.0 (Transmute Equipment\'s 2 at 50%).',
    version: V_WARLORD,
    aUnitName: 'Wanderer',
    a: { level: 'champion' },
    b: { atk:0, def:0, hp:50 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A tokenisation artefact, not a defect: the key names the roster record and its RangedType, neither of which candidates() enumerates, and the one feature it does enumerate is live - ablating a.level=champion moves 3.0 to 0.8.',
    },
  },

  // --- Warlord source-record placement for Stoning Touch and Death Touch ---
  // Unit-card/roster values occupy the general record, so both physical and magical
  // ranged attacks merge them. Focus Magic and Revenant supply the record-specific cases.
  stoningTouchRangedMissileCoM2: {
    desc: 'Stoning Touch on ranged missile (CoM2): rtb 1 fully blocked, stoningTouch -3 vs Res 5 fires per arrow → pFail 0.8 × 10 hp = 8.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  stoningTouchRangedMissileWarlord: {
    desc: 'Global Stoning Touch on ranged missile (Warlord): rtb 1 fully blocked, Stoning -3 vs Res 5 fires → 8.0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  stoningTouchRangedMagicCoM2: {
    desc: 'Stoning Touch on magical ranged (CoM2): magic rtb 1 fully blocked, stoningTouch -3 vs Res 5 fires → 8.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  stoningTouchRangedMagicWarlord: {
    desc: 'Global Stoning Touch on magical ranged (Warlord): magic rtb 1 fully blocked, Stoning -3 fires → 8.0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  deathTouchRangedMissileCoM2: {
    desc: 'Death Touch on ranged missile (CoM2): rtb 1 fully blocked, deathTouch -3 vs Res 5 fires per arrow → pFail 0.8 × 10 hp = 8.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  deathTouchRangedMissileWarlord: {
    desc: 'Global Death Touch on ranged missile (Warlord): rtb 1 fully blocked, Death Touch -3 fires → 8.0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  deathTouchRangedMagicCoM2: {
    desc: 'Death Touch on magical ranged (CoM2): magic rtb 1 fully blocked, deathTouch -3 vs Res 5 fires → 8.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  deathTouchRangedMagicWarlord: {
    desc: 'Global Death Touch on magical ranged (Warlord): magic rtb 1 fully blocked, Death Touch -3 fires → 8.0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  focusMagicMovesStoningOffRangedWarlord: {
    desc: 'Focus Magic moves global Stoning Touch -3 to melee/Thrown: magic 1 becomes 4 but is fully blocked by def 4; ranged touch no longer fires → 0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { focusMagic: true, stoningTouch: -3 } },
    b: { def:4, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.000 },
  },
  focusMagicMovesDeathOffBreathWarlord: {
    desc: 'Focus Magic moves global Death Touch -3 to melee/Thrown: fire breath 1 becomes 4 but is fully blocked '
        + 'by def 4, and Breath reads only general flags, so the touch rides the unconditional melee call alone '
        + '- one Death -3 attempt vs Res 5, pFail 0.8 x 10 hp = 8.0. A Breath that carried it too would make two '
        + 'attempts, 1 - 0.2^2 = 0.96 x 10 = 9.6, so the Breath exclusion is what the number measures.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { fireBreath: { strength:1, type:'fire' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { focusMagic: true, deathTouch: -3 } },
    b: { def:4, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  stoningTouchMultipleModernChannelsWarlord: {
    desc: 'Global Stoning Touch joins every attack call: Lightning Breath 1 and Chaos Channels Fire Breath 4 are '
        + 'fully blocked, and the melee call runs unconditionally at melee 0, so three Stoning -3 attempts vs '
        + 'Res 5 average 3 x 0.8 = 2.4 kills x 10 hp = 24.0. Without the two breath channels the melee call '
        + 'alone gives 8.0.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { lightningBreath: { strength:1, type:'lightning' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { ccFireBreath: true, stoningTouch: -3 } },
    b: { figs:4, def:20, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 24.000 },
  },
  poisonTouchBasic: {
    desc: 'Poison Touch: 1 atk (100% blocked) + Poison 4 vs Res 5 — 4 rolls × 50% fail = 2.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  poisonPlusMelee: {
    desc: 'Poison + Melee: 1 atk 100% hit + Poison 2, vs 0 def Res 5 — 1.0 melee + 1.0 poison',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 2 } },
    b: { res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  poisonImmunity: {
    desc: 'Poison Immunity: 1 atk (100% blocked) + Poison 4 vs Poison Immune — no damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { poisonImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.poison':
        'Keep. Inert as a consequence of the assertion rather than despite it: Poison Immunity zeroes the poison term, so removing the poison as well cannot move an already-zero result. The immunity is the live half - ablating it returns poisonTouchBasic\'s 2.0, and poisonTouchBasic differs only in that ability.',
    },
  },
  magicImmunityPoisonTouch: {
    desc: 'Magic Immunity does NOT block poison (poison is not a magical effect): 4 rolls × Res 5 (50% fail) = 2.0; melee blocked by def 1',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'b.ability.magicImmunity':
        'Keep, and the absence is the rule under test: poison is realm-less, so Magic Immunity does not reach it. poisonTouchBasic differs only in this ability and pins the same 2.0, which is the control; the poison half is live at delta 2.',
    },
  },
  poisonHighRes: {
    desc: 'Poison vs High Res: 1 atk (100% blocked) + Poison 4 vs Res 10 — immune',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:10, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: at Res 10 no poison roll can fail, so the result is 0 whatever the poison strength.',
      'a.ability.poison':
        'Keep. The discriminator is b.res, which candidates() does not enumerate: poisonTouchBasic differs only in b.res 10 -> 5 and pins 2.0. The absence is the subject - Resistance at or above the strength closes the roll.',
    },
  },
  charmedPoisonCoM2: {
    desc: 'Charmed is a roll-only assignment to Resistance 100, even for realm-less Poison: melee is blocked and all four Poison rolls succeed.',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:0, hp:10, unitType:'hero', abilities: { charmed: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.poison':
        'Keep. Inert as a consequence of the assertion: Charmed\'s roll-only assignment to Resistance 100 closes every poison save, so the poison strength cannot move a zero. Both live halves carry the claim - ablating b.abilities.charmed or b.unitType=hero returns 4.0.',
    },
  },
  charmedPoisonMoM: {
    desc: 'DOS Charmed gives a hero +30 Resistance for rolls, including realm-less Poison.',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:0, hp:10, unitType:'hero', abilities: { charmed: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.poison':
        'Keep. Inert as a consequence of the assertion: DOS Charmed\'s +30 Resistance for rolls closes every poison save, so the poison strength cannot move a zero. Both live halves carry the claim - ablating b.abilities.charmed or b.unitType=hero returns 4.0.',
    },
  },
  poisonRanged: {
    desc: 'Poison + Ranged: 1 missile 100% hit + Poison 2 vs 0 def Res 5 — 1.0 ranged + 1.0 poison',
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10, abilities: { poison: 2 } },
    b: { res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  poisonThrown: {
    desc: 'Poison + Thrown + Melee: 1 thrown + 1 melee (100% hit, 0 def) + Poison 2 × 2 phases vs Res 5 — 2 + 2 poison',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10, abilities: { poison: 2 } },
    b: { res:5, hp:20 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  chaosSpawnPoisonGazeMom: {
    desc: 'DOS roster Chaos Spawn keeps Poison 4 in the common attack flags, so its Multiple Gaze carries four realm-less saves. Weakness suppresses its 1.31 melee call; gaze immunities and full blocking leave the unavoidable Doom Gaze 4 plus 2.0 poison EV.',
    version: V_MOM_131,
    aUnitName: 'Chaos Spawn',
    a: { abilities: { weakness: true } },
    b: { atk:0, figs:1, def:50, toBlkMod:70, res:5, hp:100,
      abilities: { stoningImmunity: true, deathImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A tokenisation artefact: the key names the roster record, its Poison 4 and its Multiple Gaze, none of which candidates() reaches through aUnitName. All three features it does enumerate are live - weakness at delta 2, and each immunity at delta 84.6.',
    },
  },
  stoningTouchBasic: {
    desc: 'Stoning Touch: 1 atk (100% blocked) + Stoning -3 vs Res 5 — pFail 80%, E[dmg] = 0.8 × 10 = 8.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  stoningImmunity: {
    desc: 'Stoning Immunity: 1 atk (100% blocked) + Stoning -3 vs Stoning Immune — no damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { stoningImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  stoningMagicImmunity: {
    desc: 'Magic Immunity blocks Stoning: 1 atk (100% blocked) + Stoning -3 vs Magic Immune — no damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  stoningHighRes: {
    desc: 'Stoning vs High Res: Stoning -3 vs Res 13 (effective 10) — immune',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:13, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: Res 13 against a -3 modifier leaves effective Res 10, so no petrify roll can fail and the result is 0 whatever the modifier.',
      'name-binds-nothing':
        'Keep. The discriminator is b.res, which candidates() does not enumerate: stoningTouchBasic differs only in b.res 13 -> 5 and pins 8.0. The absence is the subject.',
    },
  },
  stoningMultiFig: {
    desc: 'Stoning Multi-fig: 4 figs, Stoning -1 vs Res 5, 4 figs 5hp — pFail 60%, E[kills]=2.4, E[dmg]=12.0',
    a: { figs:4, atk:1, toHitMod:70, hp:5, abilities: { stoningTouch: -1 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:5 },
    expected: { dmgToA: 0, dmgToB: 12.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'stoning touch\' and the key says \'stoning multi fig\'. The feature is live at delta 12, and the discriminators the key does name, a.figs and b.figs, are outside candidates().',
    },
  },
  stoningTouchMeleeAtkZeroMoM: {
    desc: 'Touch riders at melee strength 0 (MoM 1.31): BU_ProcessAttack aborts the call before its '
        + 'rider dispatcher, so Stoning -7 vs Res 0 never rolls. The exclusion is the rule under test.',
    version: V_MOM_131,
    a: { atk:0, toHitMod:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { def:0, res:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: with the melee call aborted there is no rider dispatch at all, so nothing the fixture configures can move the zero.',
      'a.ability.stoningTouch':
        'Keep, and the absence is the rule under test. The discriminator is a.atk 0 together with the version: BU_ProcessAttack aborts before its rider dispatcher in MoM 1.31, and the CoM2 and Warlord twins stoningTouchMeleeAtkZeroCoM2/Warlord run the same card to 10.0 because ApplyAttack is issued unconditionally there.',
    },
  },
  stoningTouchMeleeAtkZeroCoM2: {
    desc: 'Touch riders at melee strength 0 (CoM2): ApplyAttack is issued unconditionally and its riders '
        + 'test no strength, so Stoning -7 vs Res 0 kills the 10 HP figure with 0 physical damage → 10.0',
    version: V_COM2,
    a: { atk:0, hitChance:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { def:0, res:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  stoningTouchMeleeAtkZeroWarlord: {
    desc: 'Touch riders at melee strength 0 (Warlord): the same unconditional melee call → 10.0',
    version: V_WARLORD,
    a: { atk:0, hitChance:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { def:0, res:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  stoningGazeBasic: {
    desc: 'Stoning Gaze: Gaze -3 + 1 ranged vs 1 fig Res 5, 10 hp — stoning 8.0 + physical 0.06 = 8.06',
    a: { rtbType:'gaze_stoning', rtb:1, hp:10, abilities: { stoningGaze: -3 } },
    b: { res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.060 },
  },
  stoningGazeMultiFig: {
    desc: 'Stoning Gaze Multi-fig: Gaze -1 + 1 ranged vs 4 figs Res 5, 5hp — stoning 12.0 + physical ~0.26',
    a: { rtbType:'gaze_stoning', rtb:1, hp:10, abilities: { stoningGaze: -1 } },
    b: { figs:4, res:5, hp:5 },
    expected: { dmgToA: 0, dmgToB: 12.261 },
  },
  stoningGazeBilateral: {
    desc: 'Bilateral Gaze: both -3 + 1 ranged, Res 5 — A gaze 8.06; B gaze (if B survives) 1.612',
    a: { rtbType:'gaze_stoning', rtb:1, hp:10, res:5, abilities: { stoningGaze: -3 } },
    b: { rtbType:'gaze_stoning', rtb:1, hp:10, res:5, abilities: { stoningGaze: -3 } },
    expected: { dmgToA: 1.612, dmgToB: 8.060 },
  },
  stoningGazeImmunity: {
    desc: 'Stoning Gaze vs Stoning Immunity — stoning blocked, but physical 1 ranged still hits (0.3)',
    a: { rtbType:'gaze_stoning', rtb:1, hp:10, abilities: { stoningGaze: -3 } },
    b: { res:5, hp:10, abilities: { stoningImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'a.ability.stoningGaze':
        'Keep. Inert as a consequence of the assertion: Stoning Immunity removes the kill roll, leaving only the hidden physical gaze 0.300, which the gaze modifier does not size. The immunity is the live half - stoningGazeBasic differs only in that ability and pins 8.060.',
    },
  },
  stoningGazeMagicImmunity: {
    desc: 'Magic Immunity vs stoning gaze: MI blocks physical gaze (def 50) AND skips the stoning roll → 0 dmg',
    a: { rtbType:'gaze_stoning', rtb:1, hp:10, abilities: { stoningGaze: -3 } },
    b: { res:5, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.stoningGaze':
        'Keep. Inert as a consequence of the assertion, and a stronger one than stoningGazeImmunity\'s: Magic Immunity removes the kill roll and raises Defense to 50, so even the hidden physical component is blocked and the modifier has nothing left to size. The immunity is live at delta 8.06.',
    },
  },
  deathGazeBasic: {
    desc: 'Death Gaze: Gaze -3 + 1 ranged vs 1 fig Res 5, 10 hp — death 8.0 + physical 0.06 = 8.06',
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.060 },
  },
  deathGazeMultiFig: {
    desc: 'Death Gaze Multi-fig: Gaze -1 + 1 ranged vs 4 figs Res 5, 5hp — death 12.0 + physical ~0.26',
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -1 } },
    b: { figs:4, res:5, hp:5 },
    expected: { dmgToA: 0, dmgToB: 12.261 },
  },
  deathGazeDeathImmunity: {
    desc: 'Death Gaze vs Death Immunity — death blocked, but physical 1 ranged still hits (0.3)',
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { res:5, hp:10, abilities: { deathImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'a.ability.deathGaze':
        'Keep. Inert as a consequence of the assertion: Death Immunity removes the kill roll, leaving only the hidden physical gaze 0.300, which the gaze modifier does not size. The immunity is live at delta 7.76.',
    },
  },
  deathGazeMagicImmunity: {
    desc: 'Magic Immunity blocks Death Gaze kill AND physical gaze ranged (def set to 50) — 0 dmg',
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { res:5, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.deathGaze':
        'Keep. Inert as a consequence of the assertion: Magic Immunity removes the kill roll and raises Defense to 50, so the hidden physical component goes too and the modifier has nothing left to size. The immunity is live at delta 8.06.',
    },
  },
  deathGazeStoningImmunityNotBlocked: {
    desc: 'Stoning Immunity does NOT block Death Gaze — full effect (8.0 + 0.06)',
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { res:5, hp:10, abilities: { stoningImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 8.060 },
    vacuity: {
      'b.ability.stoningImmunity':
        'Keep, and the absence is the rule under test: the two kill loops take separate immunities, so Stoning Immunity does not reach a death gaze. deathGazeBasic differs only in this ability and pins the same 8.060, which is the control; the gaze half is live at delta 2.91.',
    },
  },
  deathGazeHighRes: {
    desc: 'Death Gaze vs High Res: Death Gaze -3 vs Res 13 (effective 10) — kill blocked, physical 0.3 (unreduced)',
    a: { rtbType:'gaze_death', rtb:1, hp:10, abilities: { deathGaze: -3 } },
    b: { res:13, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0.300 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: Res 13 against a -3 modifier leaves effective Res 10, so no kill roll can fail and only the hidden physical 0.300 remains.',
      'a.ability.deathGaze':
        'Keep. The discriminator is b.res, which candidates() does not enumerate: deathGazeBasic differs only in b.res 13 -> 5 and pins 8.060. The absence is the subject, and 0.300 rather than 0 is the second half of the claim - a blocked kill does not reduce the physical component.',
    },
  },
  combinedStoningDeathGaze: {
    desc: 'Chaos-Spawn-style combined gaze: type 104, strength 1, special value 3 vs Res 5, 10 hp — each kill roll 80% fail, so 1−(1−0.8)(1−0.8)=0.96 chance of 10 dmg. Type 104 delivers its strength as doom damage rather than rolling it, so the other 4% takes exactly 1: 0.96×10 + 0.04×1 = 9.64.',
    a: { rtbType:'gaze_multiple', rtb:1, hp:10, abilities: { stoningGaze: -3, deathGaze: -3 } },
    b: { res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 9.640 },
    vacuity: {
      'every-feature-inert':
        'Not a defect of the fixture but of one-at-a-time ablation. dosGazeAbilityValues (combat_special_attacks.js:210-211) derives both stoningGaze and deathGaze from the one shared modifier and the rangedType, so the two entries are two views of one byte: remove either and the other still supplies the magnitude. Removing both does move the number - the --interactions probe reports the pair as non-additive.',
      'a.ability.deathGaze':
        'Keep. Same shared byte. The discriminator is rtbType gaze_multiple, which candidates() does not enumerate: it is type 104, the only type that runs both kill loops and the only one that delivers its strength as doom damage rather than rolling it.',
    },
  },
  hiddenGazePerAttackerFigure: {
    desc: 'The hidden gaze component is rolled once per ATTACKING figure (it sits inside BU_ProcessAttack\'s per-figure loop): 4 figs × 3 str × 100% hit vs Defense 0 = 12. Would be 3 if it fired only once.',
    a: { rtbType:'gaze_stoning', rtb:3, figs:4, atk:0, hp:10, toHitRtbMod:70, abilities: {  } },
    b: { atk:0, def:0, hp:20, abilities: { stoningImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 12 },
    vacuity: {
      'name-binds-nothing':
        'Keep. The discriminators are a.figs and a.rtb, which candidates() does not enumerate - 4 figures at strength 3 is the 12, and the claim is that it would be 3 if the hidden component fired once per attack. The one feature enumerated, b.abilities.stoningImmunity, is live at delta 8 and is there to isolate the hidden component from the kill rolls.',
    },
  },
  hiddenGazeStoningKillsPerDefenderFigure: {
    desc: 'The kill rolls, by contrast, are once per DEFENDING figure and resolve once per attack regardless of attacker figures. 2 attacker figs vs 4 defender figs × 5 hp; Stoning −5 vs Res 5 → effRes 0, every figure dies = 20 (the physical 2 is absorbed by the cap). Scaling kills by the attacker instead would kill only 2 figures → 12.',
    a: { rtbType:'gaze_stoning', rtb:1, figs:2, atk:0, hp:10, toHitRtbMod:70, abilities: { stoningGaze: -5 } },
    b: { figs:4, atk:0, def:0, res:5, hp:5 },
    expected: { dmgToA: 0, dmgToB: 20 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - containsRun looks for \'stoning gaze\' and the key says \'gaze stoning\'. The feature is live at delta 8.125, and the figure counts the key does name are outside candidates().',
    },
  },
  hiddenGazeIgnoresWeaponImmunity: {
    desc: 'Weapon Immunity can never apply to a gaze — the immunity-mask builder admits bit 0x100 only for ranged_type/10 < 3, and gaze is 103-105. Normal-unit attacker with a normal weapon vs Weapon Immunity: still the full 5, not the Defense-10 floor.',
    a: { rtbType:'gaze_stoning', rtb:5, atk:0, hp:10, toHitRtbMod:70, unitType:'normal', abilities: {  } },
    b: { atk:0, def:0, hp:20, unitType:'normal', abilities: { stoningImmunity: true, weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 5 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: the immunity-mask builder admits the Weapon bit only for ranged_type/10 < 3 and gaze is 103-105, so Weapon Immunity can never reach a gaze. The other half is live - ablating b.abilities.stoningImmunity moves 5 to 20, which shows the fixture is otherwise wired up.',
    },
  },
  // The hidden component is the shared `.ranged` byte, and the recompute floors that byte once
  // with an ungated `if (bu->ranged < 0) bu->ranged = 0` (131:0x90B2F 160:= com1:0x90B54). A
  // gaze template shipping strength 0 — Gorgons and Night Stalker both do — therefore keeps
  // whatever an earlier write put in the byte, and the delivery path reads that same byte
  // (`attack_strength = bu->ranged`, 131:0x99B0B). The pair below raises it two different ways.
  hiddenGazeLevelLadderNeedsStrength: {
    desc: 'Exclusion the engine makes: every ranged step of MoM\'s level ladder is `if (bu->ranged > 0) bu->ranged++` — 131:0x8FA8E, 0x8FAD4, 0x8FB21 on the six-step normal ladder and 0x8F8FB, 0x8F935, 0x8F961, 0x8F994, 0x8F9C7 on the nine-step hero one — so Champion\'s +3 never reaches a gaze template that ships strength 0, and 1.31\'s effective-strength gaze test then suppresses the gaze outright: 0. `doomGazeLevelLadderMoM` is the positive twin, where the same ladder does reach a gaze whose byte carries strength. Applying the ladder ungated, as the gaze arm did before F135, gives 3.',
    a: { rtbType:'gaze_stoning', rtb:0, atk:0, hp:10, level:'champion', toHitRtbMod:70, abilities: {  } },
    b: { atk:0, def:0, res:50, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the level ladder never reaches this record, so no level the fixture sets can move the zero.',
      'a.level=champion':
        'Keep, and the absence is the rule under test. Every ranged step of MoM\'s ladder is gated `if (bu->ranged > 0)`, so Champion\'s +3 never reaches a gaze template shipping strength 0 and 1.31\'s effective-strength gaze test then suppresses the gaze outright. doomGazeLevelLadderMoM is the positive twin, where the same ladder does reach a gaze whose byte carries strength; run the ladder ungated and this fixture returns 3.',
    },
  },
  // One byte, one gate (F135). Each preset below names the test its own block makes on
  // `bu->ranged`, and each is red against the static `baseGazeRanged > 0` gate the gaze arm
  // carried before.
  hiddenGazeTakesBlackChannelsTypeGate: {
    desc: 'Black Channels writes the shared byte under `if (bu->ranged_type != RAT_NONE) bu->ranged += 1` (131:0x8F437) — the -1 sentinel, not a strength test — so a stoning-gaze template shipping strength 0 reaches 1 and the terminal floor keeps it: 1 hidden damage at 100% To Hit vs Defense 0. Res 50 puts the petrify roll out of reach; melee stays 0 because the card carries no melee attack. Asking the byte\'s strength instead of its type gives 0.',
    a: { rtbType:'gaze_stoning', rtb:0, atk:0, hp:10, toHitRtbMod:70, abilities: { blackChannels: true } },
    b: { atk:0, def:0, res:50, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1 },
  },
  hiddenGazeTakesBlackPrayerUngatedCoM: {
    desc: 'CoM 1: Focus Magic\'s arm 1 raises the strength-0 gaze template\'s shared byte to 3 (com1:0x8F82D), then Black Prayer\'s `bu->ranged--` (com1:0x9054A) reaches it with no strength or type test at all, leaving 2 hidden damage at 100% To Hit vs Defense 0. Res 50 puts the petrify roll out of reach. The two views of that one byte disagreed before F135 — the decrement reached the ranged projection and not the gaze one — for 3.',
    version: V_COM,
    a: { rtbType:'gaze_stoning', rtb:0, atk:0, hp:10, toHitRtbMod:70, abilities: { focusMagic: true, blackPrayer: true } },
    b: { atk:0, def:0, res:50, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2 },
  },
  hiddenGazeMindStormFlooredCoM: {
    desc: 'CoM 1: Focus Magic raises the same strength-0 gaze template to 3, then Mind Storm\'s unconditional `bu->ranged -= 5` (com1:0x906D1) drives that one byte to -2 and the terminal floor (com1:0x90B54) settles it at 0, so nothing is delivered. Before F135 the decrement missed the gaze view and 3 was delivered.',
    version: V_COM,
    a: { rtbType:'gaze_stoning', rtb:0, atk:0, hp:10, toHitRtbMod:70, abilities: { focusMagic: true, mindStorm: true } },
    b: { atk:0, def:0, res:50, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  holyBonusNeedsRangedStrengthCoM: {
    desc: 'Exclusion the engine makes: CoM 1\'s Holy Bonus ranged half is `if (bu->ranged > 0) bu->ranged += cl` (com1:0x900E8), a live-strength test on the shared byte and not a type test, so a Missile record carrying a projectile type at strength 0 takes nothing and fires for 0. Treating any typed slot as live, as the general dead-slot rule does, hands it Holy Bonus 2 for 2.',
    version: V_COM,
    a: { toHitRtbMod:70, rtbType:'missile', rtb:0, atk:0, hp:10, abilities: { holyBonus: 2 } },
    b: { atk:0, def:0, hp:10 },
    // The tick is the measuring instrument, not a configuration slip: a typed slot left at
    // strength 0 carries no conventional ranged attack, so the page withdraws ranged mode and the
    // exchange is melee for 0. Hand the slot the Holy Bonus 2 this fixture says it must not take
    // and the withdrawal stops: the control is kept, the volley fires and the number is 2.
    rangedCheck: true, rangedDist: 1, rangedModeWithdrawn: true,
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the record is not live enough for the bonus to attach, so nothing the fixture configures can move the zero.',
      'a.ability.holyBonus':
        'Keep, and the absence is the rule under test. CoM 1\'s Holy Bonus ranged half is `if (bu->ranged > 0) bu->ranged += cl` (com1:0x900E8), a live-strength test on the shared byte rather than a type test, so a Missile record typed at strength 0 takes nothing. Treating any typed slot as live, as the general dead-slot rule does, hands it Holy Bonus 2 and returns 2.',
    },
  },
  hiddenGazeKeepsFocusMagicRaiseCoM: {
    desc: 'CoM 1: Focus Magic\'s arm 1 admits a gaze template with no strength test (com1:0x8F825, +3 at com1:0x8F82D), so a stoning gaze shipping strength 0 — Gorgons on the shipped roster — reaches 3, and the terminal floor keeps it for 3 hidden damage at 100% To Hit vs Defense 0. Res 50 puts the petrify roll out of reach. Reading the template\'s base strength at the floor throws the +3 away for 0, which is also what removing Focus Magic gives.',
    version: V_COM,
    a: { rtbType:'gaze_stoning', rtb:0, atk:0, hp:10, toHitRtbMod:70, abilities: { focusMagic: true } },
    b: { atk:0, def:0, res:50, hp:10 },
    expected: { dmgToA: 0, dmgToB: 3 },
  },
  // Doom Gaze is ranged_type 104, whose damage is the shared strength slot, and 104 runs the
  // stoning and death kill loops as well. Res 10 makes every kill save succeed (effective
  // res >= 10 is a certain pass), which isolates the doom damage; doomGazeChaosSpawn below is
  // the paired test of the kill rolls themselves.
  doomGazeBasic: {
    desc: 'Doom Gaze 4 vs 10 hp — exact 4 damage, no rolls, no defense. Res 10 suppresses 104\'s kill rolls so only the doom damage lands.',
    a: { rtbType:'gaze_multiple', rtb:4, hp:10 },
    b: { def:10, res:10, hp:10 },
    expected: { dmgToA: 0, dmgToB: 4 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminators are rtbType and rtb, which candidates() does not enumerate: type 104 delivers its shared strength as exact doom damage with no roll and no Defense subtraction, and doomGazeKill differs only in a.rtb 4 -> 12 and pins 10. Res 10 and def 10 are there to suppress the kill rolls and the physical component so the doom total is the only thing measured.',
    },
  },
  doomGazeMagicImmunity: {
    desc: 'Doom Gaze 4 vs Magic Immune 10 hp — doom gaze ignores Magic Immunity, exact 4 damage.',
    a: { rtbType:'gaze_multiple', rtb:4, hp:10 },
    b: { def:10, res:10, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 4 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Magic Immunity has nothing to act on here, so the one feature the fixture adds to doomGazeBasic cannot move the number.',
      'b.ability.magicImmunity':
        'Keep, and the absence is the rule under test: doom damage is assigned rather than rolled, so Magic Immunity has no roll to close and no Defense term to raise against it. doomGazeBasic differs only in this ability and pins the same 4, which is the control.',
    },
  },
  doomGazeKill: {
    desc: 'Doom Gaze 12 vs 10 hp — exact 10 damage (capped at total HP), kills the unit.',
    a: { rtbType:'gaze_multiple', rtb:12, hp:10 },
    b: { def:10, res:10, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminator is a.rtb, which candidates() does not enumerate: strength 12 against a 10 HP pool pins the cap, and doomGazeBasic differs only in a.rtb 12 -> 4 and pins 4. The expectation sits at the pool by design - the cap is the subject - so the structural expectationsAtHpCap flag is expected here.',
    },
  },
  doomGazeChaosSpawn: {
    desc: 'Chaos Spawn gaze suite: type 104 with strength 4 and special value 4 — doom exact 4; stoning/death each 20% per figure at the shared -4, combined into one joint kill roll (a figure dies once if it fails either), so pKill = 1 - 0.8*0.8 = 0.36.',
    a: { rtbType:'gaze_multiple', rtb:4, hp:10, abilities: { stoningGaze: -4, deathGaze: -4 } },
    b: { figs:4, res:12, hp:5 },
    expected: { dmgToA: 0, dmgToB: 11.133 },
    vacuity: {
      'every-feature-inert':
        'Not a defect of the fixture but of one-at-a-time ablation. dosGazeAbilityValues (combat_special_attacks.js:210-211) derives stoningGaze and deathGaze from the one shared modifier and the rangedType, so the two entries are two views of one byte and removing either leaves the other supplying the magnitude.',
      'name-binds-nothing':
        'Keep. The discriminators are rtbType gaze_multiple, rtb, b.figs and b.res, none of which candidates() enumerates. It is the paired kill-roll test to doomGazeBasic\'s isolated doom damage: the same type 104, with Res 12 low enough that the shared -4 leaves a 20% failure per loop and the two loops join into one 0.36 kill chance per figure.',
    },
  },
  // The doom damage's figure bound is the sharpest MoM/CoM2 divergence in the gaze block, so the
  // three presets below are one paired set: the DOS builds assign `hits = attack_strength` inside
  // BU_ProcessAttack's per-attacker-figure loop, while CoM2/Warlord call ApplyAttack with a
  // literal 1 for Doom Gaze alone. Res 10 suppresses 104's kill rolls and the 50 hp defender
  // keeps the cap out of the measurement, so the number is the doom total and nothing else.
  doomGazePerAttackerFigureMoM: {
    desc: 'Doom Gaze is delivered once per ATTACKING figure in MoM 1.31: 3 figs x strength 4 = 12. One figure would be 4, which is what the same fixture reports on CoM2.',
    version: V_MOM_131,
    a: { rtbType:'gaze_multiple', rtb:4, figs:3, hp:10 },
    b: { def:10, res:10, hp:50 },
    expected: { dmgToA: 0, dmgToB: 12 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminators are a.figs and the version, which candidates() does not enumerate. It is one of a three-preset set: the DOS builds assign hits = attack_strength inside BU_ProcessAttack\'s per-attacker-figure loop, so 3 figures deal 12, and doomGazeOncePerAttackCoM2 runs the same shape to 4 because CoM2 passes a literal figure count of 1.',
    },
  },
  doomGazePerAttackerFigureCoM: {
    desc: 'CoM 6.08 shares MoM\'s per-figure doom delivery — its automatic-damage arm sits at the same 0x9A1E6 site inside the same loop — so 3 figs x strength 4 = 12 here too. CoM 1 reaches the arm through its own marker test, which the Multiple Gaze setup always sets, so the full strength is taken rather than the halved one.',
    version: V_COM,
    a: { rtbType:'gaze_multiple', rtb:4, figs:3, hp:10 },
    b: { def:10, res:10, hp:50 },
    expected: { dmgToA: 0, dmgToB: 12 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. The discriminators are a.figs and the version, which candidates() does not enumerate. It is the CoM 1 member of the same three-preset set, and it carries its own claim beyond doomGazePerAttackerFigureMoM\'s: CoM 1 reaches the automatic-damage arm through a marker test the Multiple Gaze setup always sets, so the full strength is taken rather than the halved one.',
    },
  },
  doomGazeOncePerAttackCoM2: {
    desc: 'CoM2 passes a literal figure count of 1 for Doom Gaze, so the same 3-figure gazer at strength 4 deals 4, not the 12 the DOS members of this set report. The two kill-roll gazes beside it do pass LivingFigures, which is why this is a Doom-Gaze-only difference.',
    version: V_COM2,
    a: { figs:3, hp:10, abilities: { doomGaze: 4 } },
    b: { def:10, res:10, hp:50 },
    expected: { dmgToA: 0, dmgToB: 4 },
  },
  lifeStealBasic: {
    desc: 'Life Steal: 1 atk (100% blocked) + Life Steal -3 vs Res 5 — effective res 2, E[dmg] = sum(1..8)/10 = 3.6',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:20 },
    expected: { dmgToA: 0, dmgToB: 3.600 },
  },
  lifeStealDeathImmune: {
    desc: 'Life Steal vs Death Immunity: Life Steal -3 vs Death Immune — no damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { deathImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.lifeSteal':
        'Keep. Inert as a consequence of the assertion rather than despite it: Death Immunity closes the drain, so the drain\'s own modifier cannot move an already-zero result. The immunity is the live half at delta 3.6, which is lifeStealBasic\'s number.',
    },
  },
  lifeStealMagicImmune: {
    desc: 'Life Steal vs Magic Immunity: Life Steal -3 vs Magic Immune — no damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.lifeSteal':
        'Keep. Inert as a consequence of the assertion: Magic Immunity closes the drain, so its modifier cannot move a zero. The immunity is the live half at delta 3.6, which is lifeStealBasic\'s number.',
    },
  },
  lifeStealHighRes: {
    desc: 'Life Steal vs High Res: Life Steal -3 vs Res 13 (effective 10) — immune',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { def:1, toBlkMod:70, res:13, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: Res 13 against a -3 modifier leaves effective Res 10, which no drain roll can beat, so the result is 0 whatever the modifier.',
      'a.ability.lifeSteal':
        'Keep. The discriminator is b.res, which candidates() does not enumerate; lifeStealNegativeRes and lifeStealNoMod are the same shape at Res 0 and modifier 0. The absence is the subject - Resistance at or above the reach of the roll closes it.',
    },
  },
  lifeStealNoMod: {
    desc: 'Life Steal 0 modifier vs Res 5: E[dmg] = sum(1..5)/10 = 1.5',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: 0 } },
    b: { def:1, toBlkMod:70, res:5, hp:20 },
    expected: { dmgToA: 0, dmgToB: 1.500 },
  },
  lifeStealNegativeRes: {
    desc: 'Life Steal -3 vs Res 0: effective res -3, so every roll deals 4..13 damage equally; E[dmg] = 8.5',
    a: { atk:1, toHitMod:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { def:1, toBlkMod:70, res:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 8.500 },
  },
  deathTouchBasic: {
    desc: 'Death Touch: 1 atk (100% blocked) + Death Touch -3 vs Res 5 — pFail 80%, E[dmg] = 0.8 × 10 = 8.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  deathTouchDeathImmune: {
    desc: 'Death Touch vs Death Immunity: Death Touch -3 vs Death Immune — no damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { deathImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.deathTouch':
        'Keep. Inert as a consequence of the assertion: Death Immunity closes the kill roll, so its modifier cannot move a zero. deathTouchBasic differs only in this immunity and pins 8.0, and ablating the immunity here returns that same 8.0.',
    },
  },
  deathTouchMagicImmune: {
    desc: 'Death Touch vs Magic Immunity: Death Touch -3 vs Magic Immune — no damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.deathTouch':
        'Keep. Inert as a consequence of the assertion: Magic Immunity closes the kill roll, so its modifier cannot move a zero. The immunity is the live half at delta 8, which is deathTouchBasic\'s number.',
    },
  },
  deathTouchHighRes: {
    desc: 'Death Touch vs High Res: Death Touch -3 vs Res 13 (effective 10) — immune',
    a: { atk:1, toHitMod:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:13, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: Res 13 against a -3 modifier leaves effective Res 10, so no kill roll can fail and the result is 0 whatever the modifier.',
      'a.ability.deathTouch':
        'Keep. The discriminator is b.res, which candidates() does not enumerate: deathTouchBasic differs only in b.res 13 -> 5 and pins 8.0. The absence is the subject.',
    },
  },
  deathTouchStoningImmunityNotBlocked: {
    desc: 'Stoning Immunity does NOT block Death Touch — full effect 8.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { stoningImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 8.000 },
    vacuity: {
      'b.ability.stoningImmunity':
        'Keep, and the absence is the rule under test: the petrify and death kill loops take separate immunities, so Stoning Immunity does not reach Death Touch. deathTouchBasic differs only in this ability and pins the same 8.0, which is the control; the touch half is live at delta 8.',
    },
  },
  deathTouchMultiFig: {
    desc: 'Death Touch Multi-fig: 4 figs, Death Touch -1 vs Res 5, 4 figs 5hp — pFail 60%, E[kills]=2.4, E[dmg]=12.0',
    a: { figs:4, atk:1, toHitMod:70, hp:5, abilities: { deathTouch: -1 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:5 },
    expected: { dmgToA: 0, dmgToB: 12.000 },
  },
  deathTouchRighteousness: {
    desc: 'Death Touch vs Righteousness (+30 res): Death Touch -3 vs Res 5 → effective 32 — immune',
    a: { atk:1, toHitMod:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { righteousness: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.deathTouch':
        'Keep. Inert as a consequence of the assertion: Righteousness puts effective Resistance at 32, out of reach of any roll, so the touch modifier cannot move a zero. deathTouchBasic differs only in Righteousness and pins 8.0, and ablating it here returns that same 8.0.',
    },
  },
  firstStrikeKillsBeforeCounter: {
    desc: 'First Strike: 1-fig A (atk 10, 100% hit) kills 1-fig B (10hp) before B can counter — dmgToA=0',
    a: { atk:10, toHitMod:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, toHitMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10 },
  },
  negateFirstStrike: {
    desc: 'Negate First Strike cancels First Strike — simultaneous exchange: A takes 5, B takes 10',
    a: { atk:10, toHitMod:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:5, toHitMod:70, hp:10, abilities: { negateFirstStrike: true } },
    expected: { dmgToA: 5, dmgToB: 10 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep. Inert as a consequence of the assertion: Negate First Strike cancels it, so with both on the exchange is simultaneous and removing First Strike as well changes nothing. firstStrikeKillsBeforeCounter differs only in the negation and pins dmgToA 0, and ablating the negation here returns that same 0.',
    },
  },
  firstStrikeMultiFig: {
    desc: 'First Strike Multi-fig: A (4 figs × 1 atk, 100% hit) kills 1 B fig, B (2→1 figs × 2 atk) counters for 2',
    a: { figs:4, atk:1, toHitMod:70, hp:4, abilities: { firstStrike: true } },
    b: { figs:2, atk:2, toHitMod:70, hp:4 },
    expected: { dmgToA: 2, dmgToB: 4 },
  },
  firstStrikeNoKillUnchanged: {
    desc: 'First Strike but no figures killed: damage matches simultaneous (A 1 atk, B 10hp, B 2 atk)',
    a: { atk:1, toHitMod:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:2, toHitMod:70, hp:10 },
    expected: { dmgToA: 2, dmgToB: 1 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that with no figure killed the exchange is indistinguishable from a simultaneous one, so nothing the fixture configures can move it.',
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test. First Strike only matters through a figure that dies before it can counter; A\'s 1 attack cannot kill B\'s 10 HP figure, so B counters for its full 2 exactly as it would without the ability. firstStrikeKillsBeforeCounter is the positive arm at atk 10.',
    },
  },
  firstStrikeIgnoredOnRanged: {
    desc: 'First Strike has no effect on ranged attacks (no counter exists anyway)',
    a: { rtbType:'missile', rtb:3, toHitRtbMod:70, hp:10, abilities: { firstStrike: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: a ranged attack draws no counter, so there is no counter for First Strike to pre-empt and nothing the fixture configures can move the result.',
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test. The discriminator is rtbType, which candidates() does not enumerate - the same ability on the melee path is what firstStrikeKillsBeforeCounter measures.',
    },
  },
  firstStrikeCapCoM: {
    desc: 'First Strike cap (CoM): B top figure has 30hp (>24) so FS is simultaneous — B counters with all 6 atk despite dying',
    version: V_COM,
    a: { atk:30, toHitMod:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:6, toHitMod:70, hp:30 },
    expected: { dmgToA: 6, dmgToB: 30 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the CoM cap suspends First Strike for this fixture, so the ability has no effect left to remove.',
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test. B\'s top figure holds 30 HP, above CoM\'s 24 cutoff, so First Strike is simultaneous and B counters with all 6 despite dying. firstStrikeCapCoM2 runs the same card in CoM2, where the cap is gone, and pins dmgToA 0. version-dead is expected - firstStrikeCapIgnoresThrownCoM is the only other com_6.08 First Strike preset and it asserts the same suspension.',
    },
  },
  firstStrikeCapCoM2: {
    desc: 'First Strike cap removed (CoM2): A (atk 30) kills B (30hp) before counter — dmgToA=0',
    version: V_COM2,
    a: { atk:30, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:6, hitChance:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 30 },
  },
  firstStrikeCapIgnoresThrownCoM: {
    desc: 'CoM 1: 6 pending Thrown damage does not lower the 30-HP top figure for the First Strike cutoff',
    version: V_COM,
    a: { atk:30, rtbType:'thrown', rtb:6, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:1, toHitMod:70, hp:30 },
    expected: { dmgToA: 1, dmgToB: 30 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the CoM cap suspends First Strike for this fixture, so the ability has no effect left to remove.',
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test. The cutoff reads the top figure\'s HP at the start of the exchange, so the 6 pending Thrown damage does not drop the 30-HP figure under CoM\'s 24 and B still counters for 1. firstStrikeCapRemovedThrownCoM2 runs the same shape in CoM2, where the cap is gone, and pins dmgToA 0. version-dead is expected - firstStrikeCapCoM is the only other com_6.08 First Strike preset and it asserts the same suspension.',
    },
  },
  firstStrikeCapRemovedThrownCoM2: {
    desc: 'CoM2: no 24-HP First Strike cutoff after the same 6-damage Thrown attack',
    version: V_COM2,
    a: { atk:30, modernAttacks: { thrown: { strength:6, type:'thrown' } }, hitChance:70, hp:10, abilities: { firstStrike: true } },
    b: { atk:1, hitChance:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 30 },
  },

  // --- Haste ---
  hasteMeleeDoubles: {
    desc: 'Haste doubles melee: 1 atk 100% hit, no def — single strike 1 → hasted 2',
    a: { atk:1, toHitMod:70, def:0, hp:20, abilities: { haste: true } },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  hasteRangedDoubles: {
    desc: 'Haste doubles missile ranged: 1 rtb 100% hit → 2.0 damage',
    a: { toHitRtbMod:70, rtbType:'missile', rtb:1, hp:10, abilities: { haste: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  hasteMagicRangedDoublesNoCaster: {
    desc: 'Haste doubles magic ranged when attacker is not Caster → 2.0 damage',
    a: { toHitRtbMod:70, rtbType:'magic_c', rtb:1, hp:10, abilities: { haste: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  hasteMagicRangedDoublesForCaster: {
    desc: 'MoM: Haste doubles magical ranged for Caster units when mana is available → 2.0 damage',
    version: V_MOM_131,
    a: { toHitRtbMod:70, rtbType:'magic_c', rtb:1, hp:10, abilities: { haste: true, caster: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  hasteMagicRangedHeroNoRepeatMoM131: {
    desc: 'MoM 1.31: a hero\'s mana-pool magical ranged attack is not repeated by Haste (1.31\'s repeat gate recognises only the Caster 20/40 unit flags, so the hero falls to the ammunition branch and has none) → 1.0 damage',
    version: V_MOM_131,
    a: { toHitRtbMod:70, rtbType:'magic_c', rtb:1, hp:10, unitType:'hero', abilities: { haste: true, caster: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'a.ability.haste':
        'Keep, and the absence is the rule under test: the claim is that Haste does not repeat this attack, so ablating Haste is expected to leave the single 1.0 standing. The live half is a.unitType=hero at delta 1, which is the gate combat.js:1225 actually tests, and hasteMagicRangedHeroRepeatsMoM160 runs the same card in CP 1.60 to 2.0.',
    },
  },
  hasteMagicRangedHeroRepeatsMoM160: {
    desc: 'MoM CP 1.60 added the missing hero test, so the same hero\'s magical ranged attack is repeated → 2.0 damage',
    version: V_MOM_CP,
    a: { toHitRtbMod:70, rtbType:'magic_c', rtb:1, hp:10, unitType:'hero', abilities: { haste: true, caster: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.unitType=hero':
        'Keep. Inert as a consequence of the assertion: CP 1.60 added the missing hero test, so a hero is repeated exactly like a non-hero and removing the hero-ness cannot move the number - that sameness is the claim. Haste is the live half at delta 1, and hasteMagicRangedHeroNoRepeatMoM131 is the 1.31 arm at 1.0.',
    },
  },
  hasteThrownDoubles: {
    desc: 'Haste doubles thrown (+ hasted melee): thrown 2 + melee 2 → 4.0 total damage',
    a: { atk:1, rtbType:'thrown', rtb:1, toHitMod:70, toHitRtbMod:70, def:0, hp:20, abilities: { haste: true } },
    b: { atk:0, def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  hasteGazeNotDoubled: {
    desc: 'Haste does NOT double gaze: expected damage matches stoningGazeBasic (8.06)',
    a: { rtbType:'gaze_stoning', rtb:1, hp:10, abilities: { haste: true, stoningGaze: -3 } },
    b: { res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.060 },
    vacuity: {
      'a.ability.haste':
        'Keep, and the absence is the rule under test: Haste does not repeat a gaze, so the result equals stoningGazeBasic\'s 8.060 with or without it. The gaze half is live at delta 2.91, which shows the fixture is otherwise wired up.',
    },
  },
  hasteCounterDoublesMoM: {
    desc: 'MoM: Hasted defender doubles counter-attack → 2.0 damage to A',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, def:0, hp:20 },
    b: { atk:1, toHitMod:70, def:0, hp:20, abilities: { haste: true } },
    expected: { dmgToA: 2.000, dmgToB: 1.000 },
  },
  hasteCounterNotDoubledCoM: {
    desc: 'CoM 1: Hasted defender does NOT double counter-attack → 1.0 damage to A',
    version: V_COM,
    a: { atk:1, toHitMod:70, def:0, hp:20 },
    b: { atk:1, toHitMod:70, def:0, hp:20, abilities: { haste: true } },
    expected: { dmgToA: 1.000, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CoM 1 does not repeat the counter, so the only feature the fixture adds to a plain exchange cannot move it.',
      'b.ability.haste':
        'Keep, and the absence is the rule under test. CoM 1 replaces MoM\'s counter-repeat block with an unconditional jump at 0x99849, so a hasted defender counters once. hasteCounterDoublesMoM is the MoM arm of the same card at dmgToA 2.0. version-dead is expected - this is the only com_6.08 preset that puts Haste on the defender.',
    },
  },
  hasteFirstStrikeSecondConcurrent: {
    desc: 'FS+Haste: 1st strike deals 1 to B (survives) → 2nd strike + counter simultaneous → A=1, B=2',
    a: { atk:1, toHitMod:70, def:0, hp:10, abilities: { firstStrike: true, haste: true } },
    b: { atk:1, toHitMod:70, def:0, hp:10 },
    expected: { dmgToA: 1.000, dmgToB: 2.000 },
    vacuity: {
      'a.ability.firstStrike':
        'Keep, and the absence is the rule under test: A\'s first strike does not kill B, so the second strike and B\'s counter resolve together and the totals match a First-Strike-less exchange. The ordering claim is the point - the counter is not deferred behind both hasted strikes - and Haste is the live half at delta 1.',
    },
  },
  hasteComplexThrownDefenderGaze: {
    desc: 'Haste FS+Thrown vs Hasted Gaze: WoF, Imm, Fear, Poison (MoM 1.31)',
    version: V_MOM_131,
    a: { atk:1, rtbType:'thrown', rtb:1, toHitMod:70, toHitRtbMod:70, def:0, res:5, hp:20, abilities: { stoningImmunity: true, haste:true, firstStrike:true, immolation:true, fear:true, poison:1 } },
    b: { rtbType:'gaze_stoning', rtb:1, atk:1, toHitMod:70, toHitRtbMod:70, def:0, res:5, hp:20, abilities: { haste:true, immolation:true, fear:true, poison:1 } },
    wallOfFire: true,
    expected: { dmgToA: 6.900, dmgToB: 9.450 },
  },
  hasteComplexThrownDefenderGaze160: {
    desc: 'Haste FS+Thrown vs Hasted Gaze: WoF, Imm, Fear, Poison (MoM 1.60)',
    version: V_MOM_CP,
    a: { atk:1, rtbType:'thrown', rtb:1, toHitMod:70, toHitRtbMod:70, def:0, res:5, hp:20, abilities: { stoningImmunity: true, haste:true, firstStrike:true, immolation:true, fear:true, poison:1 } },
    b: { rtbType:'gaze_stoning', rtb:1, atk:1, toHitMod:70, toHitRtbMod:70, def:0, res:5, hp:20, abilities: { haste:true, immolation:true, fear:true, poison:1 } },
    wallOfFire: true,
    expected: { dmgToA: 6.900, dmgToB: 8.100 },
  },
  hasteComplexBilateralGaze: {
    desc: 'Haste FS+Gaze vs Hasted Gaze: WoF, Imm, Fear, Poison (MoM 1.31)',
    version: V_MOM_131,
    a: { rtbType:'gaze_stoning', rtb:1, atk:1, toHitMod:70, toHitRtbMod:70, def:0, res:5, hp:20, abilities: { stoningImmunity: true, haste:true, firstStrike:true, immolation:true, fear:true, poison:1 } },
    b: { rtbType:'gaze_stoning', rtb:1, atk:1, toHitMod:70, toHitRtbMod:70, def:0, res:5, hp:20, abilities: { stoningImmunity: true, haste:true, immolation:true, fear:true, poison:1 } },
    wallOfFire: true,
    expected: { dmgToA: 6.900, dmgToB: 6.750 },
  },
  hasteComplexBilateralGaze160: {
    desc: 'Haste FS+Gaze vs Hasted Gaze: WoF, Imm, Fear, Poison (MoM 1.60)',
    version: V_MOM_CP,
    a: { rtbType:'gaze_stoning', rtb:1, atk:1, toHitMod:70, toHitRtbMod:70, def:0, res:5, hp:20, abilities: { stoningImmunity: true, haste:true, firstStrike:true, immolation:true, fear:true, poison:1 } },
    b: { rtbType:'gaze_stoning', rtb:1, atk:1, toHitMod:70, toHitRtbMod:70, def:0, res:5, hp:20, abilities: { stoningImmunity: true, haste:true, immolation:true, fear:true, poison:1 } },
    wallOfFire: true,
    expected: { dmgToA: 6.900, dmgToB: 5.400 },
  },
  nodeAuraChaos: {
    desc: 'Node Aura: Chaos Fantastic 4atk/2def in Chaos Node → effective 6atk/4def (+2 each)',
    a: { figs:1, atk:4, def:2, res:5, hp:10, unitType:'fantastic_chaos' },
    b: { figs:1, def:0, res:0, hp:10 },
    nodeAura: 'chaos',
    expected: { dmgToA: 0, dmgToB: 1.800 },
  },
  nodeAuraNoMatch: {
    desc: 'Node Aura Mismatch: same Chaos Fantastic in Nature Node → no bonus, effective 4atk/2def',
    a: { figs:1, atk:4, def:2, res:5, hp:10, unitType:'fantastic_chaos' },
    b: { figs:1, def:0, res:0, hp:10 },
    nodeAura: 'nature',
    expected: { dmgToA: 0, dmgToB: 1.200 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the assertion is that no bonus is granted, and every ablation available also grants no bonus - dropping the realm makes the unit non-Fantastic, dropping the aura makes the node neutral.',
      'combat.nodeAura':
        'Keep, and the absence is the rule under test: the aura only pays a unit of its own realm. nodeAuraChaos differs only in nodeAura nature -> chaos and pins 1.800 against this 1.200.',
    },
  },
  chaosSurgeMeleeCoM2: {
    desc: 'Chaos Surge (CoM2): Chaos creature gains +3 melee from one copy. atk 1 -> 4',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  chaosSurgeRangedCoM2: {
    desc: 'Chaos Surge (CoM2): Chaos creature gains +2 ranged from one copy. missile 1 -> 3',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  chaosSurgeBreathCoM2: {
    desc: 'Chaos Surge (CoM2): Chaos creature gains +2 breath from one copy. fire breath 1 -> 3, plus 1 melee',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:1, type:'fire' } }, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  chaosSurgeResistanceCoM2: {
    desc: 'Chaos Surge (CoM2): Chaos creature gains +2 resistance from one copy. Poison 4 vs res 5 -> 7',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison:4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_chaos' },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 1.600 },
  },
  chaosSurgeStackingCoM2: {
    desc: 'Chaos Surge (CoM2): subsequent copies add +1 melee each, so 3 copies = +5 melee, not +9. atk 1 -> 6',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    chaosSurge: 3,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  chaosSurgeNonChaosNoBonusCoM2: {
    desc: 'Chaos Surge (CoM2): non-Chaos unit gets no bonus. atk 1 stays 1',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_nature' },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the assertion is that no bonus is granted, and both ablations available also grant none - dropping the realm makes the unit non-Fantastic, dropping the surge removes the source.',
      'combat.chaosSurge':
        'Keep, and the absence is the rule under test: the surge pays only Chaos creatures. chaosSurgeMeleeCoM2 is the same card at unitType fantastic_chaos and pins 7.000 against this 1.000.',
    },
  },
  chaosSurgeMeleeMoM: {
    desc: 'Chaos Surge (MoM): Chaos creature gains +2 melee from one copy. atk 1 -> 3',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  chaosSurgeRangedMoM: {
    desc: 'Chaos Surge (MoM): Chaos creature gains +2 ranged from one copy. missile 1 -> 3',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  chaosSurgeThrownMoM: {
    desc: 'Chaos Surge (MoM): Chaos creature gains +2 thrown and +2 melee. thrown 1 + melee 1 -> 6 total',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  chaosSurgeDoomGazeMoM: {
    desc: 'Chaos Surge (MoM): Chaos Spawn-style Doom Gaze gains +2. doom gaze 4 -> 6. Res 10 suppresses 104\'s kill rolls.',
    version: V_MOM_131,
    a: { rtbType:'gaze_multiple', rtb:4, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10, res:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  chaosSurgeNoResistanceMoM: {
    desc: 'Chaos Surge (MoM): no resistance bonus. Poison 4 vs res 5 remains 2.0',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison:4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_chaos' },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'combat.chaosSurge':
        'Keep, and the absence is the rule under test: MoM\'s surge has no resistance arm, so the poison saves are unchanged. chaosSurgeResistanceCoM2 is the same shape in CoM2, where the +2 Resistance exists, and pins 1.600 against this 2.000. The poison half is live at delta 2.',
    },
  },
  chaosSurgeStackingMoM: {
    desc: 'Chaos Surge (MoM): multiple copies do not stack. three copies still make atk 1 -> 3',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    chaosSurge: 3,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  chaosSurgeChaosChannelsBreathMoM: {
    desc: 'Chaos Surge (MoM 1.31): a Chaos-Channelled unit collects nothing at all. The realm test is 131:0x8F138 and every realm write is inside the BU_Apply_Specials call at 131:0x8F2A2, so the unit is still non-Chaos here: melee stays 1 and breath stays 2. This is the ordering exclusion, not incidental inertness.',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'combat.chaosSurge':
        'Keep, and the absence is the rule under test - an ordering exclusion, not incidental inertness. The realm test at 131:0x8F138 runs before every Chaos Channels realm write inside the BU_Apply_Specials call at 131:0x8F2A2, so the surge sees a non-Chaos unit. chaosSurgeChaosChannelsBreathCoM runs the same card in CoM 1, which orders the two the other way, and pins 10.000 against this 3.000. The breath half is live at delta 2.',
    },
  },
  chaosSurgeChaosChannelsBreathCoM: {
    desc: 'Chaos Surge (CoM 1): Chaos Channels Fire Breath IS boosted (the constructor runs Chaos Surge after BU_Apply_Specials, unlike MoM). melee 1 -> 4, breath 4 -> 6',
    version: V_COM,
    a: { atk:1, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 10.000 },
  },
  chaosSurgeChaosChannelsArmorMoM: {
    desc: 'Chaos Surge (MoM 1.31): demon-skin armor makes the unit Chaos at 131:0x8F6FE, inside the BU_Apply_Specials call at 131:0x8F2A2 — after the realm test at 131:0x8F138 — so the surge sees a non-Chaos unit and melee 5 stays 5. The exclusion under test is that ordering; a base-Chaos unit takes the +2 (chaosSurgeMeleeMoM).',
    version: V_MOM_131,
    a: { atk:5, toHitMod:70, hp:10, abilities: { ccDefense: true } },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the surge cannot see the realm Chaos Channels grants, so neither the grant nor the surge alone can move the melee 5.',
      'combat.chaosSurge':
        'Keep, and the absence is the rule under test - the same ordering exclusion as chaosSurgeChaosChannelsBreathMoM, on the demon-skin armor arm that makes the unit Chaos at 131:0x8F6FE. chaosSurgeChaosChannelsArmorCoM runs the same card in CoM 1 and pins 8.000; chaosSurgeMeleeMoM shows a base-Chaos unit does take the +2.',
    },
  },
  chaosSurgeChaosChannelsArmorCP: {
    desc: 'Chaos Surge (CP 1.60): same ordering as 1.31 — realm test 160:0x8F138, realm writes inside the BU_Apply_Specials call at 160:0x8F2A2 — so melee 5 stays 5. The armor fix that separates CP from 1.31 touches Defense, not this gate.',
    version: V_MOM_CP,
    a: { atk:5, toHitMod:70, hp:10, abilities: { ccDefense: true } },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the surge cannot see the realm Chaos Channels grants, so neither the grant nor the surge alone can move the melee 5.',
      'combat.chaosSurge':
        'Keep, and the absence is the rule under test: CP 1.60 keeps 1.31\'s ordering - realm test at 160:0x8F138, realm writes inside the BU_Apply_Specials call at 160:0x8F2A2 - and the CP armor fix touches Defense, not this gate. chaosSurgeChaosChannelsArmorCoM pins 8.000 on the same card in CoM 1. version-dead is literally true and uninformative here: this is the only mom_cp_1.60.00 preset that configures chaosSurge at all, so CP\'s positive melee bonus is unasserted.',
    },
  },
  chaosSurgeChaosChannelsArmorCoM: {
    desc: 'Chaos Surge (CoM 1): the same fixture is boosted, because CoM 1 calls BU_Apply_Specials at com1:0x8F0E8 before its Chaos Surge block at com1:0x8F110. melee 5 -> 8',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10, abilities: { ccDefense: true } },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  chaosSurgeThrownCoM: {
    desc: 'Chaos Surge (CoM 1): thrown is boosted. thrown 1 -> 3 plus melee 1 -> 4',
    version: V_COM,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  chaosSurgeThrownCoM2: {
    desc: 'Chaos Surge (CoM2): thrown is not boosted. thrown stays 1 plus melee 1 -> 4',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  chaosSurgeDoomGazeCoM: {
    desc: 'Chaos Surge (CoM 1): Doom Gaze shares the ranged slot and is boosted. doom gaze 4 -> 6. Res 10 suppresses 104\'s kill rolls.',
    version: V_COM,
    a: { rtbType:'gaze_multiple', rtb:4, hp:10, unitType:'fantastic_chaos' },
    b: { hp:10, res:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  chaosSurgeDoomGazeCoM2: {
    desc: 'Chaos Surge (CoM2): Doom Gaze is not boosted. doom gaze stays 4',
    version: V_COM2,
    a: { hp:10, unitType:'fantastic_chaos', abilities: { doomGaze:4 } },
    b: { hp:10 },
    chaosSurge: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'combat.chaosSurge':
        'Keep, and the absence is the rule under test: the surge\'s melee arm does not reach Doom Gaze. chaosSurgeMeleeCoM2 is the same realm and surge on a melee card and pins 7.000, so the surge is otherwise live in this version. The gaze half is live at delta 4.',
    },
  },
  darknessDeathVsLife: {
    desc: 'Darkness: Death 4atk/3def→5/4, Life 4atk/3def→3/2, mirror match',
    a: { figs:1, atk:4, def:3, res:5, hp:10, unitType:'fantastic_death' },
    b: { figs:1, atk:4, def:3, res:5, hp:10, unitType:'fantastic_life' },
    darkness: true,
    expected: { dmgToA: 0.323, dmgToB: 1.033 },
  },
  trueLightDeathVsLife: {
    desc: 'True Light: Death 4atk/3def→3/2, Life 4atk/3def→5/4, mirror match',
    a: { figs:1, atk:4, def:3, res:5, hp:10, unitType:'fantastic_death' },
    b: { figs:1, atk:4, def:3, res:5, hp:10, unitType:'fantastic_life' },
    trueLight: true,
    expected: { dmgToA: 1.033, dmgToB: 0.323 },
  },
  trueLightDeathVsLifeWarlord: {
    desc: 'True Light (Warlord): re-enabled in Warlord. Death atk6→5/def2→1, Life atk6→7/def2→3, 100% hit/block: A=7-1=6, B=5-3=2',
    version: V_WARLORD,
    a: { figs:1, atk:6, def:2, res:5, hp:10, hitChance:70, toBlkMod:70, unitType:'fantastic_death' },
    b: { figs:1, atk:6, def:2, res:5, hp:10, hitChance:70, toBlkMod:70, unitType:'fantastic_life' },
    trueLight: true,
    expected: { dmgToA: 6.000, dmgToB: 2.000 },
  },
  trueLightWarlordIllusionToHit: {
    desc: 'True Light (Warlord): illusion attacker takes -10% To Hit (all units). Normal 4atk, illusion (def→0), 100%→90% to hit',
    version: V_WARLORD,
    a: { figs:1, atk:4, hitChance:70, res:5, hp:10, unitType:'normal', abilities: { illusion: true } },
    b: { figs:1, atk:0, res:5, hp:10, unitType:'normal' },
    trueLight: true,
    expected: { dmgToA: 0, dmgToB: 3.600 },
  },
  trueLightReadsRealmAtItsOwnBlockWarlord: {
    desc: 'True Light (Warlord): the Death arm reads the realm at its own region-b block, before Chaos Channels converts it. A base-Death unit given CC:+Defense is still Death at UnitCalcPre.CAS:1511, so it takes -1: atk6->5 vs def 0, 100% hit = 5. Reading the post-conversion realm would see Chaos and give nothing.',
    version: V_WARLORD,
    a: { figs:1, atk:6, res:5, hp:10, hitChance:70, unitType:'fantastic_death', abilities: { ccDefense: true } },
    b: { figs:1, atk:0, def:0, res:5, hp:10, toBlkMod:70, unitType:'normal' },
    trueLight: true,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  trueLightSeesDestinysPermanentLifeRealmWarlord: {
    desc: 'True Light (Warlord): Destiny/Apotheosis writes the *permanent* record — `B.race := 19; B.Fantastic := True` at $0059A390 — so the unit is already a Life creature when the region-b True Light block reads `GetStat(U,SRace,0)` at UnitCalcPre.CAS:1511. True Light adds +1 (atk 5→6) and the region-c Destiny package then doubles the live value to 12; 100% hit vs def 0 = 12. Treating the realm write as a region-c write of the calculated record leaves True Light inert here and gives 10.',
    version: V_WARLORD,
    a: { figs:1, atk:5, res:5, hp:20, hitChance:70, unitType:'normal', abilities: { apotheosis: true } },
    b: { figs:1, atk:0, def:0, res:5, hp:20, toBlkMod:70, unitType:'normal' },
    trueLight: true,
    expected: { dmgToA: 0, dmgToB: 12.000 },
  },
  sanctifyTrueLightWarlord: {
    desc: 'Sanctify (Warlord): sanctified normal unit becomes life-realm, so True Light gives +1. atk5->6 vs def2, 100% hit/block: 6-2=4 (unsanctified normal would stay 5 -> 3)',
    version: V_WARLORD,
    a: { figs:1, atk:5, res:5, hp:10, hitChance:70, unitType:'normal', abilities: { sanctify: true } },
    b: { figs:1, atk:0, def:2, res:5, hp:10, toBlkMod:70, unitType:'normal' },
    trueLight: true,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  sanctifyClergyFantasticWarlord: {
    desc: 'Sanctify (Warlord): clergy becomes Life Fantastic before the standing EncMagic rule, so its attacks bypass Weapon Immunity. atk6+TL=7 vs def2, 100% hit/block: 7-2=5. Non-clergy stays non-fantastic without EncMagic, so WI would add +10 def -> 0.',
    version: V_WARLORD,
    a: { figs:1, atk:6, res:5, hp:10, hitChance:70, weapon:'normal', unitType:'normal', abilities: { sanctify: true, clergy: true } },
    b: { figs:1, atk:0, def:2, res:5, hp:10, toBlkMod:70, unitType:'normal', abilities: { weaponImmunity: true } },
    trueLight: true,
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  eternalNightDarknessMoM: {
    desc: 'Eternal Night (MoM): Death unit gets normal Darkness melee bonus. atk 1 -> 2',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, unitType:'fantastic_death', abilities: { eternalNight: true } },
    b: { atk:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  eternalNightNoEnemyResistanceMoM: {
    desc: 'Eternal Night (MoM): no enemy-only resistance penalty. Poison 4 vs res 5 remains 2.0',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, abilities: { eternalNight: true, poison:4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.ability.eternalNight':
        'Keep, and the absence is the rule under test: MoM\'s Eternal Night carries no enemy-only Resistance penalty, so the poison saves are unchanged at 2.000. The poison half is live at delta 2.',
    },
  },
  eternalNightDarknessCoM: {
    desc: 'Eternal Night (CoM): Death unit gets normal Darkness melee bonus, not doubled. atk 1 -> 2',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, unitType:'fantastic_death', abilities: { eternalNight: true } },
    b: { atk:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  eternalNightEnemyResistanceCoM: {
    desc: 'Eternal Night (CoM): enemy non-Death unit loses 1 resistance. Poison 4 vs res 5 -> 4 gives 2.8',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, abilities: { eternalNight: true, poison:4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 2.800 },
  },
  eternalNightDoubleDarknessCoM2: {
    desc: 'Eternal Night (CoM2): Death unit gets doubled Darkness attack bonus. atk 1 -> 3',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_death', abilities: { eternalNight: true } },
    b: { atk:0, hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  eternalNightEnemyLifeResistanceCoM2: {
    desc: 'Eternal Night (CoM2): enemy Life unit gets Darkness -1 res and enemy -1 res. Poison 4 vs res 5 -> 3 gives 3.2',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { eternalNight: true, poison:4 } },
    b: { def:3, toBlkMod:70, res:5, hp:10, unitType:'fantastic_life' },
    expected: { dmgToA: 0, dmgToB: 3.200 },
  },
  eternalNightEnemyPoorSightWarlord: {
    desc: 'Eternal Night (Warlord): enemy non-Death unit gets -2 ranged attack strength ("poor vision"). Missile rtb 4 - 2 = 2 at 100% hit vs def 0 = 2 dmg',
    version: V_WARLORD,
    a: { hitRanged:70, hitThrown:70, hitBreath:70, modernAttacks: { ranged: { strength:4, type:'missile' } }, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { eternalNight: true } },
    rangedCheck: true, rangedDist: 2,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  eternalNightMagicRangedWarlord: {
    desc: 'Eternal Night (Warlord): -2 ranged penalty also applies to magic ranged. Magic ranged rtb 4 - 2 = 2 at 100% hit vs def 0 = 2 dmg',
    version: V_WARLORD,
    a: { hitRanged:70, hitThrown:70, hitBreath:70, modernAttacks: { ranged: { strength:4, type:'magic' } }, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { eternalNight: true } },
    rangedCheck: true, rangedDist: 2,
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  eternalNightDeathUnitNoPoorSightWarlord: {
    desc: 'Eternal Night (Warlord): Death-realm unit is NOT affected by the -2 ranged penalty. Missile rtb 4 + doubled Darkness +2 = 6 × 100% hit vs def 0 = 6 dmg',
    version: V_WARLORD,
    a: { hitRanged:70, hitThrown:70, hitBreath:70, modernAttacks: { ranged: { strength:4, type:'missile' } }, hp:10, unitType:'fantastic_death' },
    b: { def:0, toBlkMod:70, hp:10, abilities: { eternalNight: true } },
    rangedCheck: true, rangedDist: 2,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  eternalNightPoorVisionReadsRealmAtItsOwnBlockWarlord: {
    desc: 'Eternal Night (Warlord): the Poor Vision exemption reads the realm at its own region-b block, before Chaos Channels converts it. A base-Death unit given CC:+Defense is still Death at UnitCalcPre.CAS:1343, so it keeps its missile rtb 4 at 100% hit vs def 0 = 4. Reading the post-conversion realm would see Chaos and charge the -2. Darkness stays at its own later region-c position, where the unit is Chaos, so it adds nothing here.',
    version: V_WARLORD,
    a: { figs:1, hitRanged:70, hitThrown:70, hitBreath:70, modernAttacks: { ranged: { strength:4, type:'missile' } }, hp:10, unitType:'fantastic_death', abilities: { ccDefense: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { eternalNight: true } },
    rangedCheck: true, rangedDist: 2,
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'b.ability.eternalNight':
        'Keep. Inert as a consequence of the assertion: the claim is that this attacker is exempt from the Poor Vision penalty, so removing the source of the penalty is expected to leave the 4 standing. The exemption is measured by the live halves - ablating a.unitType=fantastic_death charges the -2 and returns 2, which is exactly the reading of the post-conversion realm the fixture rules out.',
    },
  },
  eternalNightNightGoblinsExemptWarlord: {
    desc: 'Eternal Night (Warlord): Goblin Night Goblins, template 356, are named by the Poor Vision gate itself — `(GetStat(U,STypeID,1)<>356)`, UnitCalcPre.CAS:1341 — so they keep the full Missile 5 the roster gives them. 8 figures x strength 5 = 40 dice at the record\'s 30+5 = 35% To Hit, against defense 0 (no block dice), = 14.000. Taking the -2 would leave strength 3, 24 dice, 8.400. The defender carries Poison Immunity because the roster record also has Poison Touch=1, which would add 8 guaranteed points on top of the number under test. The 35% is the To Hit the record itself carries: the other engine block on template 356, UnitCalc.CAS:359-368, gives it +10 To Hit and +10 To Defend under Eternal Night or Darkness and is not modelled, so this number will move to 18.000 when that block lands.',
    version: V_WARLORD,
    aUnitName: 'Goblin Night Goblins',
    b: { figs:9, def:0, toBlkMod:70, hp:10, abilities: { eternalNight: true, poisonImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 14.000 },
    vacuity: {
      'b.ability.eternalNight':
        'Keep. Inert as a consequence of the assertion: the claim is that this attacker is the one unit the Poor Vision gate names as exempt, so removing the source of the penalty is expected to leave the 14.000 standing. The exemption is measured against eternalNightGoblinBowmenNotExemptWarlord, which differs only in aUnitName - a Goblin missile unit the gate does not name - and pins 2.800, the penalised reading. Dropping the template term from the gate returns 8.400 here.',
    },
  },
  eternalNightGoblinBowmenNotExemptWarlord: {
    desc: 'Eternal Night (Warlord): the control for the template-356 exemption. Goblin Bowmen, template 348, are Goblins with a Missile attack and are not named by the gate, so strength 3 - 2 = 1. 8 figures x strength 1 = 8 dice at the record\'s 30+5 = 35% To Hit, against defense 0, = 2.800. Without the penalty it would be 24 dice, 8.400. The defender is the same record as in eternalNightNightGoblinsExemptWarlord, Poison Immunity included, so the two fixtures differ only in aUnitName.',
    version: V_WARLORD,
    aUnitName: 'Goblin Bowmen',
    b: { figs:9, def:0, toBlkMod:70, hp:10, abilities: { eternalNight: true, poisonImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 2.800 },
  },
  eternalNightThrownUnaffectedWarlord: {
    desc: 'Eternal Night (Warlord): -2 ranged penalty does not apply to thrown. Melee 1 + thrown 3 at 100% hit vs def 0 = 4 dmg',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:3, type:'thrown' } }, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { eternalNight: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the penalty never reaches a thrown attack, so the only feature the fixture adds cannot move the total.',
      'b.ability.eternalNight':
        'Keep, and the absence is the rule under test: the -2 is a ranged penalty and the thrown channel is outside it, so melee 1 + thrown 3 stays 4 with or without Eternal Night.',
    },
  },
  armorPiercingMelee: {
    desc: 'Armor Piercing Melee: 2 atk 100% hit vs def 3 100% block — AP halves and rounds down def to 1, dmg=1',
    a: { atk:2, toHitMod:70, hp:10, abilities: { armorPiercing: true } },
    b: { def:3, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  armorPiercingRanged: {
    desc: 'Armor Piercing Ranged: missile rtb 2 100% hit vs def 3 100% block — AP halves and rounds down def to 1, dmg=1',
    a: { rtbType:'missile', rtb:2, toHitRtbMod:70, hp:10, abilities: { armorPiercing: true } },
    b: { def:3, toBlkMod:70, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  armorPiercingThrown: {
    desc: 'Armor Piercing Thrown: thrown 2 + melee 1 (100% hit) vs def 2 (100% block) — AP halves to 1; thrown 2−1=1, melee 1−1=0',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:2, toHitRtbMod:70, hp:10, abilities: { armorPiercing: true } },
    b: { atk:0, def:2, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  armorPiercingLightningNoDoubleHalve: {
    desc: 'AP + Lightning Breath: def halved once (not twice). Breath 2−1=1; melee 1−1=0',
    a: { atk:1, toHitMod:70, rtbType:'lightning', rtb:2, toHitRtbMod:70, hp:10, abilities: { armorPiercing: true } },
    b: { atk:0, def:2, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the second source of Armor Piercing adds nothing, so removing it leaves the number where it was.',
      'a.ability.armorPiercing':
        'Keep, and the absence is the rule under test: Lightning Breath already carries Armor Piercing on the thrown path (combat_effects.js:996-997), so the ability is a second source of one flag and Defense is halved once, not twice. Halving twice would take def 2 to 0 and return 2 rather than 1. lightningResistKeepsAbilityAP differs only by adding b.lightningResist and pins the same 1, which is that fixture\'s control.',
    },
  },
  armorPiercingDefenderCounter: {
    desc: 'Defender Armor Piercing: A 1 atk blocked by B def 1; B 2 atk counter halves A def 2→1, dmg=1',
    a: { atk:1, toHitMod:70, def:2, toBlkMod:70, hp:10 },
    b: { atk:2, toHitMod:70, def:1, toBlkMod:70, hp:10, abilities: { armorPiercing: true } },
    expected: { dmgToA: 1.000, dmgToB: 0 },
  },
});
