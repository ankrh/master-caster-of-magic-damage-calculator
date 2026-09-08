// Numeric presets. Protective enchantments (Endurance through Wraith Form), the weapon
// enchantments (Metal Fires, Flame Blade, Fiery Blade, Chaos Channels), Lucky, Large Shield,
// and Blur.
definePresets({
  // --- Land Linking ---
  landLinkingBeforeMysticSurgeRealmCoM: {
    desc: 'Land Linking (CoM 1): the block tests the running `bu->race` at com1:0x8F765, and Mystic Surge writes the unaligned-fantastic realm below it at com1:0x8F79E, so a unit made fantastic only by Mystic Surge gets no +2 melee. atk 1 stays 1. The exclusion is the rule under test',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, abilities: { landLinking: true, mysticSurge: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the CoM 1 order denies this unit the Land Linking package, so neither of the two abilities the fixture adds can move the number. Mystic Surge\'s own writes land where nothing reads them - its +2 Defence and -2 Resistance sit on the attacker in a one-way exchange, and its opponent To Defend reduction has no defence dice to act on against a Defence-0 target.',
      'a.ability.landLinking':
        'Keep, and the absence is the rule under test: the +2 melee is gated on the *calculated* Fantastic identity (stats.js:547, combat_abilities.js:325), and the CoM 1 chain ranks `c:landLinking` ahead of `c:mysticSurge:race` (stats_manifests.js:190-191), so the conversion at stats_identity.js:377 is not yet visible. Swap those two rows and the unit is fantastic at the block, taking atk 1 -> 3 for 3.000. version-dead is expected: this and landLinkingRangedCoM are the only two com_6.08 presets that configure the key, and both are absence claims.',
      'a.ability.mysticSurge':
        'Keep. Inert as a consequence of the assertion: Mystic Surge is here only to make the unit fantastic *after* the block that would have used it, so by construction it moves nothing. version-dead follows - this is the only com_6.08 preset in the suite that configures Mystic Surge, its other four appearances being mysticSurgeDefenseBonusCoM2, mysticSurgeResistPenaltyCoM2, mysticSurgeFantasticAndToDefendCoM2 and mysticSurgeOverridesUndeadCoM2, all com2_1.05.11, plus natureLinkBeforeSpiritLinkClearWarlord.',
    },
  },
  landLinkingFantasticMeleeCoM2: {
    desc: 'Land Linking (CoM2): fantastic creature gets +2 melee. atk 1 to 3, 100% hit vs 0 def gives 3 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType: 'fantastic_nature', abilities: { landLinking: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  landLinkingFantasticBreathCoM2: {
    desc: 'Land Linking (CoM2): fantastic creature gets +2 breath and melee. fire breath 2 to 4, melee 1 to 3, for 7 damage',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:2, type:'fire' } }, hp:10, unitType: 'fantastic_nature', abilities: { landLinking: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.000, sdDmgToB: 0.000 },
  },
  landLinkingFantasticDefenseCoM2: {
    desc: 'Land Linking (CoM2): fantastic creature gets +2 defense. 5 atk at 100% vs def 2 at 100% block gives 3 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, unitType: 'fantastic_nature', abilities: { landLinking: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  landLinkingNormalNoBonusCoM2: {
    desc: 'Land Linking (CoM2): normal unit only gets Pathfinding, so combat stats are unchanged. atk 1 stays 1',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { landLinking: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that a normal unit is outside Land Linking\'s eligibility altogether, so the only feature the fixture adds cannot move the number.',
      'a.ability.landLinking':
        'Keep, and the absence is the rule under test: eligibility is `unitType.startsWith(\'fantastic_\')` and nothing else (combat_abilities.js:322-326), so CoM 2 grants a normal unit no combat stat. landLinkingFantasticMeleeCoM2 is this card with `unitType: \'fantastic_nature\'` added and nothing else changed, and pins 3.000 against this 1.000. The Warlord rename is where a normal unit does gain something - the +1 Resistance written by `b:natureLink` (stats_sequence.js:638-640) that natureLinkNormalResistanceWarlord pins - and that arm is deliberately absent in CoM 2.',
    },
  },
  landLinkingRangedCoM: {
    desc: 'Land Linking (CoM): fantastic creature does not get +2 ranged attack. missile 2 stays 2',
    version: V_COM,
    a: { rtbType:'missile', rtb:2, toHitRtbMod:70, hp:10, unitType: 'fantastic_nature', abilities: { landLinking: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Land Linking package never reaches a ranged slot, so neither the enchantment nor the fantastic unitType that admits it can move a missile number.',
      'a.ability.landLinking':
        'Keep, and the absence is the rule under test: the block\'s attack-strength half is gated on `slotHasBreath` (stats_sequence.js:1024-1028), so a Missile slot is outside it, and the melee half has no melee attack to take. Drop the breath test and missile 2 becomes 4 for 4.000. version-dead is expected: this and landLinkingBeforeMysticSurgeRealmCoM are the only two com_6.08 presets that configure the key, both absence claims, so CoM 1 has no positive Land Linking fixture at all.',
    },
  },
  landLinkingRangedCoM2: {
    desc: 'Land Linking (CoM2): fantastic creature does not get +2 ranged attack. missile 2 stays 2',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, unitType: 'fantastic_nature', abilities: { landLinking: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the Land Linking package never reaches a ranged slot, so neither the enchantment nor the fantastic unitType that admits it can move a missile number.',
      'a.ability.landLinking':
        'Keep, and the absence is the rule under test: the attack-strength half is gated on `slotHasBreath` (stats_sequence.js:1024-1028), so the modern Ranged channel is outside it. Its two positive arms are landLinkingFantasticBreathCoM2, where the same +2 does reach a Fire Breath channel for 7.000, and landLinkingFantasticMeleeCoM2 for the melee half at 3.000; drop the breath test here and missile 2 becomes 4 for 4.000.',
    },
  },

  // --- Nature Link (Warlord rename of Land Linking) ---
  natureLinkBeforeSpiritLinkClearWarlord: {
    desc: 'Nature Link (Warlord): the region-c block tests `U.Fantastic`, and Spirit Link clears it only in the late hook (UnitCalc.CAS!NOTICEAGE!+3 "IF GETENCHANTMENTFLAG(U,EncSpiritLink,1) THEN { SETSTAT(U,AFantastic,0,0); }", region d), so a Mystic-Surged unit still gets the +2 melee there. atk 1 to 3 for 3 dmg',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { natureLink: true, mysticSurge: true, spiritLink: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.spiritLink':
        'Keep, and the absence is the rule under test: Spirit Link makes two writes to the same field - `b:spiritLink` asserting Fantastic (stats_identity.js:300-302) and `d:spiritLink` clearing it (stats_identity.js:385-387) - and the claim is that the clear lands too late to take the +2 melee back. Ablating the enchantment removes both writes, so it can never show that; the chain position is what does. `d:spiritLink` follows `c:landLinking` (stats_manifests.js:282, :297), and ranking it ahead clears the Fantastic Mystic Surge wrote before the block reads it, dropping this to 1.000. natureLinkSpiritLinkAssertsFantasticWarlord is this card without Mystic Surge, where the b-write is the only source of Fantastic and Spirit Link is the live half.',
    },
  },
  natureLinkSpiritLinkAssertsFantasticWarlord: {
    desc: 'Spirit Link on an otherwise non-fantastic unit: `SETSTAT(U,AFantastic,0,1)` at UnitCalcPre.CAS!NOSPIRITLINK!-11 "SETSTAT(U,AFantastic,0,1);" asserts Fantastic in region b, and the region-c Nature Link block reads that record, so the +2 melee applies. atk 1 to 3 for 3 dmg, against the 1 the same unit deals without Spirit Link. The clearing write at UnitCalc.CAS!NOTICEAGE!+3 "IF GETENCHANTMENTFLAG(U,EncSpiritLink,1) THEN { SETSTAT(U,AFantastic,0,0); }" is region d, past both blocks.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { natureLink: true, spiritLink: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  natureLinkFantasticMeleeWarlord: {
    desc: 'Nature Link (Warlord): fantastic creature still gets the Land Linking +2 melee. atk 1 to 3, 100% hit vs 0 def gives 3 dmg',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, unitType: 'fantastic_nature', abilities: { natureLink: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  natureLinkNormalResistanceWarlord: {
    desc: 'Nature Link (Warlord): normal unit gains only +1 resistance (Land Linking gives normal units nothing). Death Gaze 0 vs res 5 to 6 drops P(die) from 0.5 to 0.4, so 10 HP yields 4.0 dmg',
    version: V_WARLORD,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, abilities: { natureLink: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 4.899 },
  },

  // --- Endurance ---
  enduranceDefenseCoM: {
    desc: 'Endurance (CoM): defender gains +2 defense, so 5 atk at 100% hit vs 2 def blocks 0.6 on average → 4.4 dmg',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10 },
    b: { def:0, hp:10, abilities: { endurance: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.400, sdDmgToB: 0.648 },
  },
  enduranceHpBonusCoM2: {
    desc: 'Endurance (CoM2): 2-figure unit gets floor(4/2)=2 HP per figure, so stoning kill deals 4 plus 1 physical → 5.0 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { figs:2, def:0, res:0, hp:2, abilities: { endurance: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000, regDmgToB: 1.000, sdRegDmgToB: 0.000, irrDmgToB: 4.000, sdIrrDmgToB: 0.000 },
  },
  enduranceHpMinimumCoM2: {
    desc: 'Endurance (CoM2): minimum +1 HP per figure still applies above 4 figures, so 9 figs at hp 1 become hp 2 and one stoning kill deals 2 plus 1 physical → 3.0 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { figs:9, def:0, res:0, hp:1, abilities: { endurance: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000, regDmgToB: 1.000, sdRegDmgToB: 0.000, irrDmgToB: 2.000, sdIrrDmgToB: 0.000 },
  },
  enduranceEffectCoM: {
    desc: 'Endurance (CoM): same 2-figure target keeps hp 2 but gains +2 defense, so damage is 2 from stoning plus 0.49 physical → 2.49',
    version: V_COM,
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { figs:2, def:0, res:0, hp:2, abilities: { endurance: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.490, sdDmgToB: 0.500, regDmgToB: 0.490, sdRegDmgToB: 0.500, irrDmgToB: 2.000, sdIrrDmgToB: 0.000 },
  },
  enduranceEffectCoM2: {
    desc: 'Endurance (CoM2): same 2-figure target gets hp 4 per figure and no defense bonus, so damage is 4 from stoning plus 1 physical → 5.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { stoningTouch: -7 } },
    b: { figs:2, def:0, res:0, hp:2, abilities: { endurance: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000, regDmgToB: 1.000, sdRegDmgToB: 0.000, irrDmgToB: 4.000, sdIrrDmgToB: 0.000 },
  },

  // --- Malnourished ---
  malnourishedMeleePenaltyWarlord: {
    desc: 'Malnourished (Warlord): −1 melee, so atk 5 → 4, 100% hit vs 0 def → 4 dmg',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { malnourished: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  malnourishedDefensePenaltyWarlord: {
    desc: 'Malnourished (Warlord): −2 def, so def 3 → 1, 5 atk 100% hit, 1 of 5 blocked → 4 dmg',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:3, toBlkMod:70, hp:10, abilities: { malnourished: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  malnourishedClosesMeleeSlotWarlord: {
    desc: 'Malnourished (Warlord) writes −1 melee at ABase, so a 1-melee unit enters the recalculation with BaseUnits.attack 0 and every later melee-presence gate is shut — the exclusion is the rule under test. Holy Bonus\'s `if B.attack > 0` therefore skips melee: 0 dmg (reading the card\'s atk instead would leave 1 − 1 + 2 = 2 → 2.0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { malnourished: true, holyBonus: 2 } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.000, sdDmgToB: 0.000 },
  },

  // --- Mislead / Misfortune ---
  misleadMisfortuneNormalMeleeCoM2: {
    desc: 'Mislead/Misfortune (CoM2): affected normal unit loses 1 melee attack, so base 1 atk becomes 0 → 0 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { mislead: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.000, sdDmgToB: 0.000 },
  },
  misleadMisfortuneNormalRangedCoM2: {
    desc: 'Mislead/Misfortune (CoM2): affected normal unit loses 1 ranged attack, so missile 2 becomes 1 → 1 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { mislead: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
  },
  misleadMisfortuneNormalDefenseCoM2: {
    desc: 'Mislead/Misfortune (CoM2): affected normal defender loses 1 defense, so 2 atk 100% hit vs base def 1 drops to def 0 → 2 dmg',
    version: V_COM2,
    a: { atk:2, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:10, abilities: { mislead: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
  },
  misleadMisfortuneNormalResistanceCoM2: {
    desc: 'Mislead/Misfortune (CoM2): affected normal defender loses 1 resistance, so Death Gaze vs res 5 becomes res 4 → 6 dmg',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { res:5, hp:10, abilities: { mislead: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 6.000, sdDmgToB: 4.899 },
  },
  misleadMisfortuneHeroAffectedCoM2: {
    desc: 'Mislead/Misfortune (CoM2): heroes count as normal-unit targets here, so atk 1 drops to 0 → 0 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType:'hero', abilities: { mislead: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.unitType=hero':
        'Keep, and the absence is the rule under test: the eligibility gate is `!liveFantastic` and nothing else (combat_abilities.js:343-346), so a hero takes the same four penalties a normal unit does. misleadMisfortuneNormalMeleeCoM2 is this fixture with the unitType line removed and pins the same 0.000, which is the control; add a hero exemption to the gate and atk 1 survives for 1.000. Mislead is the live half.',
    },
  },

  // --- Mystic Surge ---
  mysticSurgeDefenseBonusCoM2: {
    desc: 'Mystic Surge (CoM2): surged defender gets +2 defense. 5 atk 100% hit vs 2 def at 30% block → 4.4 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10 },
    b: { def:0, hp:10, abilities: { mysticSurge: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.400, sdDmgToB: 0.648 },
  },
  mysticSurgeResistPenaltyCoM2: {
    desc: 'Mystic Surge (CoM2): surged unit loses 2 resistance. Death Gaze vs 2-figure res 5 stack becomes res 3 → pFail=0.7 per figure → 14.0 dmg',
    version: V_COM2,
    a: { hp:10, abilities: { deathGaze: 0 } },
    b: { figs:2, res:5, hp:10, abilities: { mysticSurge: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 14.000, sdDmgToB: 6.481 },
  },
  mysticSurgeFantasticAndToDefendCoM2: {
    desc: 'Mystic Surge (CoM2): directly grants EncMagic and makes the attacker unaligned Fantastic; Weapon Immunity is bypassed, and its -10% To Defend gives 5 atk vs 1 def at 20% block → 4.8 dmg',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10, unitType:'normal', abilities: { mysticSurge: true } },
    b: { def:1, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.800, sdDmgToB: 0.400 },
  },

  // --- Supernatural ---
  supernaturalFormulaCoM: {
    desc: 'Supernatural (CoM): the roster trait has no combat effect; 9 melee fully blocked deals 0 damage',
    version: V_COM,
    a: { atk:9, toHitMod:70, hp:10, abilities: { supernatural: true } },
    b: { def:9, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CoM 1 preserves the roster trait but runs no live test on it, so the only feature the fixture adds cannot move the number.',
      'a.ability.supernatural':
        'Keep, and the absence is the rule under test: the version test is made twice, independently. `supernaturalMinDamageFn` returns no callback outside `com2_` (combat_abilities.js:408), and `supernaturalMinDamageForHits` computes the minimum only for `com2_` and otherwise returns 0 (combat_abilities.js:399-404), so CoM 1 has no blocked-attack minimum and all 9 blocked hits deal 0. Widening either guard alone still leaves this at 0; widen both and the same fixture reads Round(9 x 34/100) = 3 for 3.000. version-dead is expected - this is the only com_6.08 preset that configures Supernatural, its three live arms all being com2_1.05.11: supernaturalFormulaCoM2, supernaturalMagicImmunityRangedCoM2 and supernaturalFireBreathFireImmunityCoM2.',
    },
  },
  supernaturalFormulaCoM2: {
    desc: 'Supernatural (CoM2): the blocked-attack minimum is Round(hits × 34 / 100), not round(hits/3). Magic Immunity sets effectiveDefense to 100, so all 28 magic ranged hits are blocked and only the minimum lands: Round(28 × 34/100) = 10, where round(28/3) would give 9. A fully-blocked melee probe can no longer discriminate the two: F32/F34\'s defense-dice cap (Combat.ResolutionHelpers.pas:159-171) holds blocked hits to 15 or fewer, where the formulas agree, and the Defense input is UI-capped at 50. Without Supernatural the same attack deals ~0.',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:28, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { supernatural: true } },
    b: { toBlkMod:70, hp:20, abilities: { magicImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 10.000, sdDmgToB: 0.000 },
  },
  supernaturalMagicImmunityRangedCoM2: {
    desc: 'Supernatural (CoM2): magic ranged 6 reduced by Magic Immunity still deals the 1/3 minimum = 2 dmg',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:6, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { supernatural: true } },
    b: { toBlkMod:70, hp:10, abilities: { magicImmunity: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
  },
  supernaturalFireBreathFireImmunityCoM2: {
    desc: 'Supernatural (CoM2): fire breath 6 reduced by Fire Immunity still deals the 1/3 minimum = 2 dmg',
    version: V_COM2,
    a: { atk:1, modernAttacks: { fireBreath: { strength:6, type:'fire' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { supernatural: true } },
    b: { def:1, toBlkMod:70, hp:10, abilities: { fireImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
  },

  // --- Resistance to All ---
  resistanceToAllBasic: {
    desc: 'Resistance to All: Poison 4 vs base res 5 + RTA 2 → effective res 7, pFail 30%, E[dmg]=1.2',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { resistanceToAll: 2 } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.200, sdDmgToB: 0.917 },
  },
  resistanceToAllCap: {
    desc: 'Resistance to All caps immunity: Poison 4 vs res 8 + RTA 2 → effective res 10, pFail 0% → immune',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:8, hp:10, abilities: { resistanceToAll: 2 } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0, sdDmgToB: 0.000 },
  },
  holyBonusPlusResistanceToAll: {
    desc: 'HB + RTA stacking: Poison 4 vs res 4 + HB 1 + RTA 1 → effective res 6, pFail 40%, E[dmg]=1.6',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:4, hp:10, abilities: { holyBonus: 1, resistanceToAll: 1 } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.600, sdDmgToB: 0.980 },
  },

  // --- Resist Magic ---
  resistMagicBlocks: {
    desc: 'Resist Magic +5 res vs stoning: res 5+5=10, stoningTouch -3 → effectiveRes 7, pFail 30% → E[stoning dmg]=3.0. Without RM pFail=80% → 8.0.',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { resistMagic: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 4.583, regDmgToB: 0.000, sdRegDmgToB: 0.000, irrDmgToB: 3.000, sdIrrDmgToB: 4.583 },
  },
  resistMagicNotPoison: {
    desc: 'Resist Magic does not apply to poison: res 5+0=5, poison 4 → pFail 50% → E[poison dmg]=2.0 (would be 0 if RM applied).',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { resistMagic: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 1.000 },
    vacuity: {
      'b.ability.resistMagic':
        'Keep, and the absence is the rule under test: the +5 is gated on `ctx.realm !== null` (combat_effects.js:560-562), and Poison is the realm-less roll, passed as null at combat_phases.js:374-375. Drop that term and res 5 + 5 = 10 puts Poison 4 out of reach for 0. resistMagicBlocks is the same defender against a realm-carrying Stoning Touch and pins 3.000, so the write itself is live in this version. Poison is the live half here.',
    },
  },

  // --- Stone Skin / Iron Skin ---
  stoneSkinDef: {
    desc: 'Stone Skin: +1 Def. 1 atk 100% hit vs def 0 + Stone Skin → def 1, 30% block → E[dmg]=0.7',
    a: { atk:1, toHitMod:70, hp:10 },
    b: { hp:10, abilities: { stoneSkin: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.700, sdDmgToB: 0.458 },
  },
  ironSkinDef: {
    desc: 'Iron Skin: +5 Def. 5 atk 100% hit vs def 0 + Iron Skin → def 5, E[blocks]=1.5 → E[dmg]=3.5',
    a: { atk:5, toHitMod:70, hp:10 },
    b: { hp:10, abilities: { ironSkin: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.500, sdDmgToB: 1.025 },
  },
  ironSkinStoneSkinNoStack: {
    desc: 'Iron Skin + Stone Skin do not stack: only +5 Def applies (not +6). 5 atk 100% hit vs def 5 → E[blocks]=1.5 → E[dmg]=3.5',
    a: { atk:5, toHitMod:70, hp:10 },
    b: { hp:10, abilities: { ironSkin: true, stoneSkin: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.500, sdDmgToB: 1.025 },
    vacuity: {
      'b.ability.stoneSkin':
        'Keep, and the absence is the rule under test: the two writes are one `if` / `else if` (combat_abilities.js:961-969), so Iron Skin supersedes Stone Skin rather than stacking with it. ironSkinDef is this fixture with Stone Skin removed and pins the same 3.500, which is the control; make them independent writes and def 6 drops this to 3.200. The +1 is not inert in general - holyArmorStacksWithStoneSkin has it stack with Holy Armor for def 3.',
    },
  },

  // --- Invulnerability ---
  invulnerabilityMelee: {
    desc: 'Invulnerability: -2 damage per defense roll. 5 atk 100% hit vs def 0 + invuln → net 5-0-2=3 dmg (magic weapon bypasses granted WI)',
    a: { atk:5, toHitMod:70, hp:10, weapon:'magic' },
    b: { hp:10, abilities: { invulnerability: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  invulnerabilityFloorsAtZero: {
    desc: 'Invulnerability: reduction cannot go negative. 1 atk 100% hit vs def 0 + invuln → max(0, 1-2) = 0 dmg',
    a: { atk:1, toHitMod:70, hp:10, weapon:'magic' },
    b: { hp:10, abilities: { invulnerability: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0, sdDmgToB: 0.000 },
  },
  invulnerabilityGrantsWeaponImmunity: {
    desc: 'Invulnerability grants Weapon Immunity (def→10 vs normal weapons): 10 atk 100% hit 100% block → all blocked',
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { invulnerability: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0, sdDmgToB: 0.000 },
  },
  invulnerabilityRanged: {
    desc: 'Invulnerability vs ranged missile: 5 rtb 100% hit vs def 0, magic weapon bypasses WI → net 5-2=3',
    a: { rtbType:'missile', rtb:5, toHitRtbMod:70, hp:10, weapon:'magic' },
    b: { hp:10, abilities: { invulnerability: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  invulnerabilityImmolation: {
    desc: 'Invulnerability reduces immolation damage by 2 per defense roll',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, weapon:'magic', abilities: { immolation: true } },
    b: { figs:1, def:0, toBlkMod:70, hp:10, abilities: { invulnerability: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.0918, sdDmgToB: 0.316 },
  },
  invulnerabilityNotDoom: {
    desc: 'Invulnerability does not reduce doom damage: 6 atk doom → floor(6/2)=3 lands in full vs invuln',
    a: { atk:6, hp:10, abilities: { doom: true } },
    b: { hp:10, abilities: { invulnerability: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3, sdDmgToB: 0.000 },
    vacuity: {
      'b.ability.invulnerability':
        'Keep, and the absence is the rule under test: the -2 is an argument to `calcTotalDamageDist`, and the doom arm beside it calls `calcDoomDist` with neither a defence roll nor a reduction to pass (combat_fear_and_touch.js:411-417). Route the doom arm through the same reduction and floor(6/2) = 3 becomes 1. invulnerabilityMelee is the same defender against a conventional melee 5 and pins 3.000 against the 5 it would otherwise take, so the write is live in this version. Doom is the live half here.',
    },
  },
  invulnerabilityMultiFigOverflow: {
    desc: 'Invulnerability -2 fires on each fresh defense roll during overflow. 5 atk 100% hit vs 3-fig hp=2: fig1 takes 2 (5-2=3, dies, excess 1), fig2 takes max(0,1-2)=0 → total 2 (vs 5 without invuln)',
    a: { atk:5, toHitMod:70, hp:10, weapon:'magic' },
    b: { figs:3, hp:2, abilities: { invulnerability: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
  },

  // --- Holy Armor ---
  holyArmorDef: {
    desc: 'Holy Armor: +2 Def. 2 atk 100% hit vs def 0 + Holy Armor → def 2, 30% block → E[dmg]=1.4',
    a: { atk:2, toHitMod:70, hp:10 },
    b: { hp:10, abilities: { holyArmor: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.400, sdDmgToB: 0.648 },
  },
  holyArmorVsRanged: {
    desc: 'Holy Armor applies vs ranged too: 2 rtb 100% hit vs def 0 + Holy Armor → def 2 → E[dmg]=1.4',
    a: { rtbType:'missile', rtb:2, toHitRtbMod:70, hp:10 },
    b: { hp:10, abilities: { holyArmor: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.400, sdDmgToB: 0.648 },
  },
  holyArmorStacksWithStoneSkin: {
    desc: 'Holy Armor (+2) stacks with Stone Skin (+1): 3 atk 100% hit vs def 0 → def 3, E[blocks]=0.9 → E[dmg]=2.1',
    a: { atk:3, toHitMod:70, hp:10 },
    b: { hp:10, abilities: { holyArmor: true, stoneSkin: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.100, sdDmgToB: 0.794 },
  },
  holyArmorHighDefMoM: {
    desc: 'Holy Armor (MoM): always +2 def regardless of base def. 15 atk 100% hit vs def 8+2=10, 30% block → E[blocks]=3.0 → E[dmg]=12.0',
    version: V_MOM_131,
    a: { atk:15, toHitMod:70, hp:30 },
    b: { def:8, hp:30, abilities: { holyArmor: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 12.000, sdDmgToB: 1.449 },
  },
  holyArmorLowDefCoM2: {
    desc: 'Holy Armor (CoM2): def 5 ≤ 5 → +2 defense. 10 atk 100% hit vs def 5+2=7, 30% block → E[blocks]=2.1 → E[dmg]=7.9',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:20 },
    b: { def:5, hp:20, abilities: { holyArmor: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.900, sdDmgToB: 1.212 },
  },
  holyArmorHighDefCoM2: {
    desc: 'Holy Armor (CoM2): def 8 > 5 → +10% To Defend instead of +2 def. 15 atk 100% hit vs def 8, toBlock 40% → E[blocks]=3.2 → E[dmg]=11.8',
    version: V_COM2,
    a: { atk:15, hitChance:70, hp:30 },
    b: { def:8, hp:30, abilities: { holyArmor: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 11.800, sdDmgToB: 1.386 },
  },

  // --- Holy Weapon ---
  holyWeaponMelee: {
    desc: 'Holy Weapon melee: atk 1 @ base 30% + HW +10% = 40% vs def 0 → E[dmg]=0.4',
    a: { atk:1, hp:10, abilities: { holyWeapon: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.400, sdDmgToB: 0.490 },
  },
  holyWeaponMissile: {
    desc: 'Holy Weapon missile: rtb 1 @ base 30% + HW +10% = 40% vs def 0 → E[dmg]=0.4',
    a: { rtbType:'missile', rtb:1, hp:10, abilities: { holyWeapon: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.400, sdDmgToB: 0.490 },
  },
  holyWeaponBoulder: {
    desc: 'Holy Weapon boulder: rtb 1 @ base 30% + HW +10% = 40% vs def 0 → E[dmg]=0.4',
    a: { rtbType:'boulder', rtb:1, hp:10, abilities: { holyWeapon: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.400, sdDmgToB: 0.490 },
  },
  holyWeaponNotMagicRanged: {
    desc: 'Holy Weapon does NOT boost magic ranged: rtb 1 magic_c @ 30% (no HW bonus) → E[dmg]=0.3',
    a: { rtbType:'magic_c', rtb:1, hp:10, abilities: { holyWeapon: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.300, sdDmgToB: 0.458 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Holy Weapon reaches no part of a magical ranged attack, and the fixture leaves it nothing else to touch - the card carries no melee for the To Hit half, and the defender no Weapon Immunity for the bypass - so the only feature the fixture adds cannot move the number.',
      'a.ability.holyWeapon':
        'Keep, and the absence is the rule under test: the secondary threshold is picked per channel, and its ranged arm is gated on `isNonMagicalRangedFieldSlot` (stats_sequence.js:1450-1457, wired at stats.js:1737-1738), so a magic_c type takes nothing. holyWeaponMissile and holyWeaponBoulder are this card with only rtbType changed and both pin 0.400 against this 0.300, the difference being the +10% this fixture denies.',
    },
  },
  holyWeaponNotFireBreath: {
    desc: 'Holy Weapon does NOT boost fire breath: melee 1 @ 40% + fire rtb 1 @ 30% = 0.4+0.3=0.7',
    a: { atk:1, rtbType:'fire', rtb:1, hp:10, abilities: { holyWeapon: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.700, sdDmgToB: 0.671 },
  },
  holyWeaponThrownMoM: {
    desc: 'Holy Weapon vs Thrown (MoM 1.31): bug — no HW bonus on thrown. melee 1 @ 40% + thrown 1 @ 30% = 0.7',
    version: V_MOM_131,
    a: { atk:1, rtbType:'thrown', rtb:1, hp:10, abilities: { holyWeapon: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.700, sdDmgToB: 0.671 },
  },
  holyWeaponThrownPatched: {
    desc: 'Holy Weapon vs Thrown (MoM CP 1.60+): fix — HW boosts thrown. melee 1 @ 40% + thrown 1 @ 40% = 0.8',
    version: V_MOM_CP,
    a: { atk:1, rtbType:'thrown', rtb:1, hp:10, abilities: { holyWeapon: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.800, sdDmgToB: 0.693 },
  },
  holyWeaponBypassesWI: {
    desc: 'Holy Weapon bypasses Weapon Immunity: 10 atk normal weapon + HW vs WI def 0 → weapon treated as magic, WI does not trigger, 40% hit = E[dmg]=4.0',
    version: V_MOM_131,
    a: { atk:10, hp:10, abilities: { holyWeapon: true } },
    b: { def:0, toBlkMod:70, hp:20, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 1.549 },
  },

  // --- Heavenly Light ---
  heavenlyLightRangedCoM2: {
    desc: 'Heavenly Light (CoM 2) on an eligible normal unit: +1 conventional ranged strength and +10% Ranged To Hit → missile 3 at 40% = 1.200. Without the enchantment this is missile 2 at 30% = 0.600.',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hp:10, abilities: { heavenlyLight: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.200, sdDmgToB: 0.849 },
  },
  heavenlyLightNotBreathCoM2: {
    desc: 'Channel boundary: Units.RecalculateUnits.pas:1451-1454 writes Ranged and Thrown only, and the strength bonus reads the conventional Ranged field, so a Fire Breath unit gains neither — breath 2 at 30% = 0.600, the same as without the enchantment. A leak into the Breath To Hit modifier gives 0.800; one into the Breath strength gives 0.900. Paired with heavenlyLightRangedCoM2, which is the same unit with a missile attack.',
    version: V_COM2,
    a: { modernAttacks: { fireBreath: { strength:2, type:'fire' } }, hp:10, abilities: { heavenlyLight: true } },
    b: { hp:10 },
    rangedCheck: false,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.600, sdDmgToB: 0.648 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the CoM 2 block writes the Ranged and Thrown channels only, so on a Fire Breath card the enchantment has no channel left to reach; its +1 Defence and +1 Resistance sit on the attacker in a one-way exchange, and its melee arm reads a base melee this card does not have.',
      'a.ability.heavenlyLight':
        'Keep, and the absence is the rule under test: the modern strength half is gated on `isConventionalRangedSlot` (stats_sequence.js:956-960), and the To Hit half answers for kinds ranged and thrown only, returning 0 for anything else (stats_sequence.js:1450-1457). heavenlyLightRangedCoM2 is the same card with a missile Ranged channel instead and pins 1.200; the 0.800 and 0.900 the desc names are what a Breath arm on either half would give here.',
    },
  },
  heavenlyLightTailRefusedByApotheosisWarlord: {
    desc: 'The material tail is `not B.Fantastic and not B.ishero` (Units.RecalculateUnits.pas:1447-1448) — the `B.` selector, so the permanent record, which the Apotheosis cast (Warlord renames Destiny to Apotheosis, `enchantments.js`) writes Fantastic at $0059A390 ahead of `a:baseCopy`. The strength half has no such gate and still lands: melee 2 doubled by that cast is 4, +1 from the block is 5, and the To Hit stays at the base 30% -> 1.500. Negative claim on the tail alone; reading the training-time flag instead granted the +10% for 5 at 40% = 2.000.',
    version: V_WARLORD,
    a: { atk:2, hp:10, abilities: { apotheosis: true, heavenlyLight: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.500, sdDmgToB: 1.025 },
    vacuity: {
      'a.ability.heavenlyLight':
        'Keep: the enchantment supplies the +1 melee this card scores, so ablating it drops 5 to 4 and the number to 1.200. What is asserted is the *absence of its To Hit tail*, which is why the pinned value is 1.500 rather than the 2.000 the same card gives with the tail. a.ability.apotheosis is the other live half.',
    },
  },
  heavenlyLightTailReachesSpiritLinkedFantasticWarlord: {
    desc: 'The positive direction of the same permanent-record read: the `SETSTAT(TU,AFantastic,1,0)` of Spirit Link clears the flag ahead of the copy, so a base-Fantastic unit passes `not B.Fantastic` and takes the tail. melee 2 + 1 = 3 at 40% -> 1.200; reading the training-time flag instead withheld the tail for 3 at 30% = 0.900.',
    version: V_WARLORD,
    a: { unitType: 'fantastic_nature', atk:2, hp:10,
      abilities: { spiritLink: true, heavenlyLight: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.200, sdDmgToB: 0.849 },
  },
  heavenlyLightRangedTailRefusedByApotheosisWarlord: {
    desc: 'The secondary To Hit half of the same tail, which takes a different picker path from the melee one (`makeSecondaryHitPick`, stats_sequence.js): the Ranged threshold is withheld on an Apotheosis unit for the same `not B.Fantastic` reason. Missile 2 doubled by that cast is 4, +1 from the block is 5, at the base 30% -> 1.500, against the 2.000 the granted threshold gives. Paired with heavenlyLightTailRefusedByApotheosisWarlord, the melee half of the same claim.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:2, type:'missile' } }, hp:10,
      abilities: { apotheosis: true, heavenlyLight: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.500, sdDmgToB: 1.025 },
  },
  heavenlyLightRangedTailReachesSpiritLinkedFantasticWarlord: {
    desc: 'The positive direction of the secondary half: missile 2 + 1 = 3 at 40% -> 1.200 on a Spirit-Linked base-Fantastic unit, against 3 at 30% = 0.900 when the tail is read off the training-time flag.',
    version: V_WARLORD,
    a: { unitType: 'fantastic_nature',
      modernAttacks: { ranged: { strength:2, type:'missile' } }, hp:10,
      abilities: { spiritLink: true, heavenlyLight: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.200, sdDmgToB: 0.849 },
  },
  heavenlyLightMeleeCoM: {
    desc: 'Heavenly Light (CoM 1), the defender-side city block at com1:0x905BB: a positive melee attack gains +1, and a unit carrying no weapon material also gains +10% melee To Hit → 3 at 40% = 1.200. Without the enchantment this is 2 at 30% = 0.600.',
    version: V_COM,
    a: { atk:2, toHitMod:0, hp:10, abilities: { heavenlyLight: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.200, sdDmgToB: 0.849 },
  },
  heavenlyLightToHitNeedsBareWeaponCoM: {
    desc: 'Material boundary: com1:0x90600 grants the melee threshold only where `mutations & UM_WEAPON_QUALITY_MASK` is clear, so a mithril unit takes the +1 strength and none of the To Hit. Mithril alone is 3 at 40% = 1.200; with Heavenly Light it is 4 at 40% = 1.600, not the 4 at 50% = 2.000 an unconditional threshold gives. Paired with heavenlyLightMeleeCoM, the same unit with a bare weapon.',
    version: V_COM,
    a: { atk:2, toHitMod:0, weapon:'mithril', hp:10, abilities: { heavenlyLight: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.600, sdDmgToB: 0.980 },
  },
  heavenlyLightMissileCoM: {
    desc: 'The shared-slot half: com1:0x90610 raises a positive ranged strength and com1:0x9062B adds the threshold for Thrown, Missile and Boulder types → missile 3 at 40% = 1.200. Without the enchantment this is missile 2 at 30% = 0.600.',
    version: V_COM,
    a: { atk:0, rtbType:'missile', rtb:2, hp:10, abilities: { heavenlyLight: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.200, sdDmgToB: 0.849 },
  },
  heavenlyLightBreathStrengthNoToHitCoM: {
    desc: 'Type boundary inside one slot: the CoM 1 strength write carries no `ranged_type` test, so the DOS shared slot takes +1 whatever stands in it, while the threshold at com1:0x90618 admits only Thrown and types below RAT_MAGIC_FIRST. A Fire Breath unit is therefore breath 3 at 30% = 0.900, not the 2 at 30% = 0.600 it is without the enchantment and not the 3 at 40% = 1.200 a leaking threshold gives. Paired with heavenlyLightMissileCoM, the same unit with a missile attack.',
    version: V_COM,
    a: { atk:0, rtbType:'fire', rtb:2, hp:10, abilities: { heavenlyLight: true } },
    b: { hp:10 },
    rangedCheck: false,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.900, sdDmgToB: 0.794 },
  },
  heavenlyLightMagicWeaponCoM: {
    desc: 'The minimum weapon quality: com1:0x9063F raises `Weapon_Plus1` to 1 where it was 0, so a bare-weapon unit bypasses Weapon Immunity. atk 10 at a forced 100% To Hit against a Weapon-Immune defender: 11 (the block\'s own +1) all land for 11.000. Without the enchantment Weapon Immunity holds the defense up and only 2.000 gets through; a plain magic weapon and no enchantment gives 10.000, which is the same bypass without the strength bonus.',
    version: V_COM,
    a: { atk:10, toHitMod:70, hp:10, abilities: { heavenlyLight: true } },
    b: { def:0, toBlkMod:70, hp:20, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 11.000, sdDmgToB: 0.000 },
  },

  // --- Channel fields on the modern record (F80) ---
  ccFireBreathSeparatesThrownWarlord: {
    desc: 'Record fields: `Caster.exe` $00599F3E adds 4 to the Fire Breath field and writes no other attack, so a Thrown unit finishes with two attacks rather than one boosted one. Hurricane separates them by channel — UnitCalc.CAS!NOAETHERSURGE!+3 "IF (HASCOMBATGLOBAL(W,CGHurricane,1)=0)", UnitCalc.CAS!NOAETHERSURGE!+14..+16 "SETSTAT(U,SToBreath,0,( GetStat(U,SToBreath,0) - 15*(HURRICANESTR) ) );" "SETSTAT(U,SToRanged,0,( GetStat(U,SToRanged,0) - 10*(HURRICANESTR) ) );" takes 20 points off Thrown and 30 off Breath — so from a 100% base the Thrown 2 fires at 80% and the granted Fire Breath 4 at 70%: 1.6 + 2.8 = 4.400. A grant landing on the Thrown field instead leaves one attack of 6 (4.200 as Breath, 4.800 as Thrown), and a lost Breath field leaves the Thrown alone at 1.600.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { thrown: { strength:2, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    hurricane: true,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.400, sdDmgToB: 1.077 },
  },
  weaponToHitReadsOwnRangedChannelWarlord: {
    desc: 'ApplyMagicWeapons (Units.RecalculateUnits.pas:639-662) gates `hitchanceranged` on the record\'s own `rangedtype` and `hitchancethrown` on the record\'s Thrown field, so the Ranged modifier is decided by the Ranged channel even while the unit also carries the Thrown attack Bombs & Grenades creates. Magic weapon on missile 3: 3 at 40% = 1.200. Without the material this is 0.900. Paired with weaponToHitSkipsMagicRangedChannelWarlord, the same unit with a magical ranged type.',
    version: V_WARLORD,
    a: { atk:1, weapon:'magic', modernAttacks: { ranged: { strength:3, type:'missile' } }, hp:10,
      abilities: { outlanderWizard: true, explosive: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.200, sdDmgToB: 0.849 },
  },
  weaponToHitSkipsMagicRangedChannelWarlord: {
    desc: 'Channel boundary: the same unit with a magical ranged attack. `Ismagicalranged` holds, so ApplyMagicWeapons withholds the material To Hit modifier from the Ranged channel and the attack stays at 30% — 3 at 30% = 0.900, the same as with no weapon material at all. That inertness is the rule under test, and it is not general: its missile pair reaches 1.200 from the same material, and reading this gate from the Thrown channel Bombs & Grenades created, whose own material gate passes, would reach 1.200 here too.',
    version: V_WARLORD,
    a: { atk:1, weapon:'magic', modernAttacks: { ranged: { strength:3, type:'magic' } }, hp:10,
      abilities: { outlanderWizard: true, explosive: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.900, sdDmgToB: 0.794 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction. The material To Hit is withheld by the magical-ranged gate, which is the claim; the Outlander pair is present to give the fixture a second material gate - the Thrown one, which passes - on a channel the ranged exchange never fires, and the asserted 0.900 is exactly ranged 3 at 30% with nothing else in it.',
      'a.weapon=magic':
        'Keep, and the absence is the rule under test: ApplyMagicWeapons\' Ranged To Hit write is gated on `isNonMagicalRangedFieldSlot` (stats.js:1765-1766), and the modern branch answers the Ranged field from that gate alone rather than summing both halves the way the DOS shared slot does (stats.js:1777-1785), so a magical ranged type keeps its 30%. weaponToHitReadsOwnRangedChannelWarlord is this fixture with the ranged type changed from magic to missile and nothing else, and pins 1.200.',
    },
  },
  weaponMaterialRangedHasNoStrengthGateWarlord: {
    desc: 'ApplyMagicWeapons writes `Inc(Units[i].ranged, j)` inside `if not Ismagicalranged(Units[i].rangedtype)` with no positive-strength gate at all (Units.RecalculateUnits.pas:648-656), and `Ismagicalranged` is False for a zero ranged type (:2968-2975), so the adamantium +2 lands on the `SRanged` field of a unit that owns no ranged attack. Blaze of Glory then moves that whole field into Thrown (UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));"): melee 3 + 2 material + 2 for the Armor the material gave = 7, beside a new Thrown 2 → 9.0. (Gating that write on the slot\'s input strength leaves nothing to transfer, for 7.0; without Blaze of Glory melee 5 and Armor 2 stay where they are, for 5.0; without the material, melee 3 → 3.0.)',
    version: V_WARLORD,
    a: { atk:3, def:0, hitChance:70, hp:10, weapon:'adamantium',
      abilities: { blazeOfGlory: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.000, sdDmgToB: 0.000 },
  },
  weaponMaterialThrownReadsCalculatedFieldWarlord: {
    desc: 'The Thrown half of the same block is gated on `if Units[i].thrown > 0` — the *calculated* Thrown field at ApplyMagicWeapons\' own position (Units.RecalculateUnits.pas:658-662), which region `b` has already written. Bombs & Grenades creates Thrown floor(8 − 4/2) = 6 at `UnitCalcPre.CAS!NOMAGITEKENGINE!+11 "SETSTAT(U,SThrown,0,( GETSTAT(U,SThrown,0)+%I( 8 - (GETSTAT(U,SFigures,1)/2) ) );"` on a card with no Thrown input at all, so the adamantium +2 reaches it: 4 figures at melee 1+2 = 3 and Thrown 6+2 = 8 deal (3 + 8) × 4 = 44.0. (Reading the slot\'s input strength instead withholds the material from the created attack, leaving Thrown 6 for 36.0; the sibling bombsGrenadesWarlord fixture without the material is 28.0.)',
    version: V_WARLORD,
    a: { figs:4, atk:1, hitChance:70, hp:10, weapon:'adamantium',
      abilities: { outlanderWizard: true, explosive: true } },
    b: { def:0, toBlkMod:70, hp:50 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 44.000, sdDmgToB: 0.000 },
  },
  weaponMaterialDosThrownHasNoStrengthGateMoM: {
    desc: 'The DOS material body admits the shared slot by type alone — `RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE || RAT_CLASS_BOULDER || bu->ranged_type == RAT_THROWN` (`unitcalc.c`, 131:0x8F089/0x8F09C/0x8F0A4) — and the `bu->ranged += quality - 1` inside it (131:0x8F0BA) makes no strength test, so adamantium\'s +2 lands on a Thrown slot whose input strength is 0. One figure at 100%: the Thrown phase deals 0 + 2 and the melee 3 + 2, for 7.0. (Gating the write on the slot\'s input strength, as the calculator did before F109, leaves the Thrown attack at 0 for 5.0; mithril is quality 2 and reaches 5.0; a magic weapon is quality 1 and adds nothing, 3.0; no material at all is 3.0.)',
    version: V_MOM_131,
    a: { figs:1, atk:3, def:0, hp:20, rtbType:'thrown', rtb:0, weapon:'adamantium',
      toHitMod:70, toHitRtbMod:70 },
    b: { atk:0, def:0, toBlkMod:70, hp:40 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.000, sdDmgToB: 0.000 },
  },
  weaponMaterialDosMissileHasNoStrengthGateMoM: {
    desc: 'The Missile half of the same type-only gate (`unitcalc.c`, 131:0x8F089): a Missile slot at input strength 0 takes adamantium\'s +2 and becomes a real ranged attack of 2, fired at range 1 with no counter-attack, for 2.0. (With the fabricated input-strength gate the slot stays at 0, the card offers no ranged attack at all and the exchange silently resolves as melee 3 + 2 = 5.0; without the material it is melee 3.0.) Paired with weaponMaterialDosThrownHasNoStrengthGateMoM, the Thrown half of the same gate.',
    version: V_MOM_131,
    a: { figs:1, atk:3, def:0, hp:20, rtbType:'missile', rtb:0, weapon:'adamantium',
      toHitMod:70, toHitRtbMod:70 },
    b: { atk:0, def:0, toBlkMod:70, hp:40 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
  },
  weaponMaterialDosThrownHasNoStrengthGateCoM1: {
    desc: 'CoM 1 compiles the same type-only gate at com1:0x8F070/0x8F083/0x8F08B and the same three writes at com1:0x8F0A1/0x8F0A5/0x8F0AF, so the MoM 1.31 result repeats: Thrown 0 + 2 beside melee 3 + 2 = 7.0, against 5.0 with the input-strength gate. It is also the control for weaponMaterialDosSecondarySkippedByFocusMagicCoM1, which is this fixture plus Focus Magic.',
    version: V_COM,
    a: { figs:1, atk:3, def:0, hp:20, rtbType:'thrown', rtb:0, weapon:'adamantium',
      toHitMod:70, toHitRtbMod:70 },
    b: { atk:0, def:0, toBlkMod:70, hp:40 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.000, sdDmgToB: 0.000 },
  },
  weaponMaterialDosMeleeGateIsLiveRecordCoM1: {
    desc: 'The DOS material block gates its melee half on the *calculated* record in front of it: `if (bu->melee > 0)` wraps `bu->melee += quality - 1`, `Gold_Melee` and `melee_tohit++` (`unitcalc.c`, com1:0x8F03A). This unit has melee 0, so adamantium adds nothing to it and only CoM 1\'s Supreme Light does — melee 0 + 2 = 2 for 2.0. (Without the gate the material also lands, for melee 4 and 4.0; Supreme Light is what makes it visible at all, because it is the one CoM 1 effect that widens the terminal slot clamp for a melee-less unit.) Defense stays outside the gate in both engines: 2 from Supreme Light\'s trunc(6/3) plus adamantium\'s 2. The magical ranged 5 + 2 is Supreme Light\'s and moves either way — the DOS material body admits Missile, Boulder and Thrown only.',
    version: V_COM,
    a: { figs:1, atk:0, def:0, res:6, hp:20, rtbType:'magic_s', rtb:5, weapon:'adamantium',
      toHitMod:70, toHitRtbMod:70, abilities: { supremeLight: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:40 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.weapon=adamantium':
        'Keep, and the absence is the rule under test: the DOS melee half is gated on the *calculated* record, `u.atk > 0` (stats.js:1801), and this card enters the block with melee 0, so the material is withheld and only Supreme Light\'s +2 lands. Drop the gate and the material\'s +2 joins it for 4.000. The material\'s other two arms are deliberately out of reach here - its Defence write is on the attacker in a one-way exchange, and the DOS secondary body admits Missile, Boulder and Thrown only, not the magic_s slot this card carries. weaponMaterialDosThrownHasNoStrengthGateCoM1 is the same engine with melee 3 > 0, where the material\'s +2 melee does land.',
    },
  },
  weaponMaterialMeleeGateReadsPermanentRecordWarlord: {
    desc: 'The modern engine makes the same melee-presence test on the *permanent* record instead: `if BaseUnits[i].attack > 0` wraps `hitchancemelee`, `attack` and `attackbonus` (Units.RecalculateUnits.pas:637-642). Malnourished writes its −1 melee into ABase at `CreateUnit.CAS!HASEVILPRESENCE!+4..+8 ": If city suffer from famine, impaired newly trained units" "SETSTAT(U,SMalnourished,ABase,1);"`, so this card\'s melee 1 enters ApplyMagicWeapons as a permanent 0 and adamantium is withheld: melee 1 − 1 = 0, then Blaze of Glory moves the whole armour — 4 − 2 Malnourished + 2 adamantium = 4 — onto it, for 4.0. This fixture separates all three readings of the gate: no gate at all, or a gate on the card\'s own melee input, both leave the +2 in place for 6.0. (Without the material, armour 2 alone gives 2.0.) The Ranged record is typed magical at strength 0 so `Ismagicalranged` withholds the material\'s secondary write, leaving Blaze of Glory nothing to transfer — otherwise this fixture would also carry weaponMaterialRangedHasNoStrengthGateWarlord\'s Thrown 2 and state two rules at once.',
    version: V_WARLORD,
    a: { figs:1, atk:1, def:4, hp:20, weapon:'adamantium', hitChance:70,
      modernAttacks: { ranged: { strength: 0, type: 'magic' } },
      abilities: { blazeOfGlory: true, malnourished: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:60 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  weaponMaterialDosSecondarySkippedByFocusMagicCoM1: {
    desc: 'Negative claim — the exclusion is the rule under test. CoM 1 alone wraps the whole secondary half of the material block in `if (!(ench_lo & UE_FOCUS_MAGIC))` (`unitcalc.c`, com1:0x8F095), so a Focus Magic unit takes none of its strength, display bonus or threshold even though the block runs before the conversion at com1:0x8F7E6 and the slot still carries its Thrown type. Only the melee half lands: 3 + 2 = 5.0. Its control is weaponMaterialDosThrownHasNoStrengthGateCoM1, the identical fixture without Focus Magic, which reaches 7.0; removing the exclusion from the calculator raises this fixture to 7.0 too, so the inertness is the engine\'s and not the fixture\'s.',
    version: V_COM,
    a: { figs:1, atk:3, def:0, hp:20, rtbType:'thrown', rtb:0, weapon:'adamantium',
      toHitMod:70, toHitRtbMod:70, abilities: { focusMagic: true } },
    b: { atk:0, def:0, toBlkMod:70, hp:40 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },

  // --- Wraith Form ---
  wraithFormGrantsWeaponImmunity: {
    desc: 'Wraith Form grants Weapon Immunity: normal melee vs WF unit gets blocked by WI defense',
    version: V_MOM_131,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { wraithForm: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0, sdDmgToB: 0.000 },
  },
  wraithFormBypassesWIMoM: {
    desc: 'Wraith Form offense in MoM: no WI bypass yet, so normal unit + WF still gets blocked by enemy WI',
    version: V_MOM_131,
    a: { atk:10, toHitMod:70, hp:10, abilities: { wraithForm: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.wraithForm':
        'Keep, and the absence is the rule under test: the bypass disjunct is gated on `version.startsWith(\'com\')` (stats.js:1031-1034), so MoM 1.31 leaves the weapon normal and enemy Weapon Immunity still raises the defence. wraithFormBypassesWICoM2 is the same card in CoM 2 and pins 10.000, which is what widening that version test would give here. The enchantment is not dead in this version - its defensive half is live at combat_special_attacks.js:571-572, which wraithFormGrantsWeaponImmunity pins. Weapon Immunity is the live half here.',
    },
  },
  wraithFormBypassesWICoM2: {
    desc: 'Wraith Form offense in CoM2: unit attacks as though it had magic weapons, bypassing enemy WI',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { wraithForm: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 10.000, sdDmgToB: 0.000 },
  },
  rulerOfUnderworldBypassesWICoM2: {
    desc: 'Ruler of Underworld (CoM2): attacks count as magical for Weapon Immunity bypass, so 10 atk vs enemy WI deals full 10.0',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { rulerOfUnderworld: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 10.000, sdDmgToB: 0.000 },
  },
  rulerOfUnderworldPreservesMagicWICoM2: {
    desc: 'Ruler of Underworld (CoM2): a material-only Magic Weapon grant no longer bypasses the granted Weapon Immunity, so 10 magic atk vs def 0 still faces WI +8 → 2.0 dmg',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, weapon: 'magic' },
    b: { def:0, toBlkMod:70, hp:20, abilities: { rulerOfUnderworld: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.weapon=magic':
        'Keep, and the absence is the rule under test: the claim is that a material-only Magic Weapon grant cannot bypass a Ruler of Underworld defender, so the material has to be inert. `modernAttackIsMagic` answers a Ruler-of-Underworld defender from `encMagicIndependentOfMaterial` alone (combat_special_attacks.js:582-584), and this attacker\'s only EncMagic source is the material (`modernEncMagicFromMaterial`, stats.js:1062; none of the independent terms enumerated beside it at stats.js:1066-1070 is present on this card), so the attack stays non-magical either way, `wi` holds (combat_effects.js:646-647) and CoM 2\'s +8 (combat_effects.js:499) leaves 10 - 8 = 2.000. Delete that Ruler branch and the helper falls through to `encMagic` (combat_special_attacks.js:585), the material is admitted and this reads 10.000. version-dead is arithmetic rather than a second finding: this is the only com2_1.05.11 preset in the suite that sets a weapon material on either side.',
    },
  },

  // --- Metal Fires / Flame Blade / Fiery Blade ---
  metalFiresMelee: {
    desc: 'Metal Fires +1 melee: base 1 atk + MF → 2 atk, 100% hit vs 0 def → E[dmg]=2.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { metalFires: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
  },
  metalFiresFantasticUnaffected: {
    desc: 'Metal Fires is non-Fantastic-only: a Fantastic Chaos unit keeps melee 1 instead of receiving +1.',
    a: { atk:1, toHitMod:70, hp:10, unitType:'fantastic_chaos', abilities: { metalFires: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.metalFires':
        'Keep, and the absence is the rule under test: `c:metalFires` is gated on `!u.fantastic` (combat_abilities.js:996), so a Fantastic card takes neither the melee +1 (combat_abilities.js:999) nor the secondary +1 (combat_abilities.js:1003), and ablating the enchantment must leave 1.000. The live candidate is the unitType: metalFiresMelee is this fixture with `unitType: \'fantastic_chaos\'` removed and nothing else changed, and pins 2.000. The block states the same exclusion a second time for the magic-weapon upgrade (`metalFiresActiveAt`, stats.js), but that arm cannot move this number - the defender has no Weapon Immunity.',
    },
  },
  metalFiresFantasticMissileUnaffected: {
    desc: 'Metal Fires does not boost a Fantastic unit\'s missile attack: strength 1 stays 1.',
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10,
      unitType:'fantastic_chaos', abilities: { metalFires: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.metalFires':
        'Keep, and the absence is the rule under test: the same `!u.fantastic` gate (combat_abilities.js:996) withholds the whole block, so the secondary write that would admit a `missile` slot (combat_abilities.js:1001-1003) never runs and ablating the enchantment must leave 1.000. metalFiresMissile is this fixture with `unitType: \'fantastic_chaos\'` removed and nothing else changed, and pins 2.000; the unitType is the live candidate.',
    },
  },
  metalFiresFantasticThrownUnaffected: {
    desc: 'Metal Fires does not boost a Fantastic unit\'s melee or Thrown attacks: strength 1 + 1 deals 2.',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10,
      unitType:'fantastic_chaos', abilities: { metalFires: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.metalFires':
        'Keep, and the absence is the rule under test: the `!u.fantastic` gate (combat_abilities.js:996) withholds both halves at once, so melee 1 and Thrown 1 each stay where they are and ablating the enchantment must leave 2.000. metalFiresThrown is this fixture with `unitType: \'fantastic_chaos\'` removed and nothing else changed, and pins 4.000 - the two-channel spread is what separates this fixture from metalFiresFantasticUnaffected and metalFiresFantasticMissileUnaffected, which pin the halves singly.',
    },
  },
  metalFiresMissile: {
    desc: 'Metal Fires +1 missile: base 1 + MF → 2 rtb, 100% hit vs 0 def → E[dmg]=2.0',
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10, abilities: { metalFires: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
  },
  metalFiresNotBoulder: {
    desc: 'Metal Fires does NOT boost boulder: base 1 boulder + MF → still 1 rtb → E[dmg]=1.0',
    a: { rtbType:'boulder', rtb:1, toHitRtbMod:70, hp:10, abilities: { metalFires: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the enchantment is the only feature the fixture configures, and the claim is that it does not reach a boulder slot.',
      'a.ability.metalFires':
        'Keep, and the absence is the rule under test: this card is not Fantastic, so `c:metalFires` does fire (combat_abilities.js:996), but its secondary write admits `missile` and `thrown` alone (combat_abilities.js:1001-1002) and boulder is neither. The melee half beside it (combat_abilities.js:999) writes into an `atk` left at the default 0 (UNIT_DEFAULTS, data.js:103) on a fixture that resolves a range-1 ranged exchange, so only that type test can move a number here. Widen it to boulder and the attack becomes 1 + 1 for 2.000, which metalFiresMissile - this fixture with `rtbType: \'missile\'` in place of `\'boulder\'` and nothing else changed - pins.',
    },
  },
  metalFiresThrown: {
    desc: 'Metal Fires +1 thrown: atk 1+1=2, thrown 1+1=2, 100% hit vs 0 def → E[dmg]=4.0 (thrown+melee)',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10, abilities: { metalFires: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  metalFiresWeaponUpgrade: {
    desc: 'Metal Fires upgrades weapon to magic, bypassing WI: 2+1=3 atk vs WI def=1 100% block → WI skipped, E[dmg]=2.0',
    a: { atk:2, toHitMod:70, hp:10, abilities: { metalFires: true } },
    b: { def:1, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000 },
  },
  flameBladeMelee: {
    desc: 'Flame Blade +2 melee: base 1 atk + FB → 3 atk, 100% hit vs 0 def → E[dmg]=3.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { flameBlade: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  flameBladeMissile: {
    desc: 'Flame Blade +2 missile: base 1 + FB → 3 rtb, 100% hit vs 0 def → E[dmg]=3.0',
    a: { rtbType:'missile', rtb:1, toHitRtbMod:70, hp:10, abilities: { flameBlade: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  flameBladeThrown: {
    desc: 'Flame Blade +2 thrown: atk 1+2=3, thrown 1+2=3, 100% hit vs 0 def → E[dmg]=6.0 (thrown+melee)',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10, abilities: { flameBlade: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 6.000, sdDmgToB: 0.000 },
  },
  flameBladeMetalFiresNoStack: {
    desc: 'Flame Blade + Metal Fires do not stack: only +2 melee applies (not +3). base 1 atk + FB → 3 atk, 100% hit vs 0 def → E[dmg]=3.0',
    a: { atk:1, toHitMod:70, hp:10, abilities: { flameBlade: true, metalFires: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.metalFires':
        'Keep, and the absence is the rule under test: `c:metalFires` will not fire while Flame Blade is on the card - `!(hasAbil(abilities, \'flameBlade\') || ...)` (combat_abilities.js:997) - so only Flame Blade\'s +2 lands and the melee stays 3. Drop that disjunct and Metal Fires\' +1 joins it for 4.000. flameBladeMelee is this fixture without Metal Fires and pins the same 3.000; metalFiresMelee is this fixture without Flame Blade and pins 2.000, so the pair brackets the non-stacking from both sides. `metalFiresActiveAt` states the same exclusion again for the magic-weapon upgrade (stats.js), but that arm cannot move this number - the defender has no Weapon Immunity.',
    },
  },
  flameBladeMeleeCoM2: {
    desc: 'CoM2 Flame Blade +3 melee: 1 atk + FB → 4 atk, 100% hit vs 0 def → E[dmg]=4.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { flameBlade: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  flameBladeThrownNotBoostedCoM2: {
    desc: 'CoM2 Flame Blade does NOT boost thrown (helptext: missile only): melee 1+3=4, thrown 1 (unchanged), 100% hit vs 0 def → E[dmg]=5.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hp:10, abilities: { flameBlade: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },
  flameBladeMeleeWarlord: {
    desc: 'Warlord Flame Blade +3 melee: 1 atk + FB → 4 atk at 100% hit vs 0 def. Combat-cast Flame Blade also does an unconditional SFireBreath += 1 (UnitCalc.CAS!NOTZEAL!+7..+10 ": Combat cast Flame Blade now nolonger buff rock type range attack but give fire breath+1 :" "}"), creating a strength-1 fire breath on a unit that had none; at the default 30% breath To Hit that adds 0.3 → E[dmg]=4.3. Without the ability the same unit deals 1.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hitRanged:-70, hitThrown:-70, hitBreath:-70, hp:10,
      abilities: { flameBladeWarlord: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.300, sdDmgToB: 0.458 },
  },
  flameBladeMissileWarlord: {
    desc: 'Warlord Flame Blade +2 missile: 1 rtb + FB → 3 rtb, 100% hit vs 0 def → E[dmg]=3.0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { flameBladeWarlord: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  flameBladeBoulderWarlord: {
    desc: 'Warlord Flame Blade does NOT boost boulder (helptext: rock bonus belongs to Fiery Fury): 1 rtb, 100% hit vs 0 def → E[dmg]=1.0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { flameBladeWarlord: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the enchantment is the only feature the fixture configures, and the claim is that it does not reach a boulder channel.',
      'a.ability.flameBladeWarlord':
        'Keep, and the absence is the rule under test: the phase-c blade step admits `missile` and `thrown` alone on its Warlord arm (stats.js:1923), so a boulder Ranged channel takes nothing. Its melee half is gated on a melee attack existing (stats.js:1917) and this card\'s `atk` is the default 0 (UNIT_DEFAULTS, data.js:103), and the region-d +1 (stats_sequence.js:1522-1530) lands on the Fire Breath channel - that is what `warlordFlameBladeOwnsSlot` selects (stats.js:1713-1715) - which a range-1 ranged exchange never fires - so the type test is the only thing left that could move the number. Widen it to boulder and the attack becomes 1 + 2 for 3.000, which flameBladeMissileWarlord - this fixture with `type: \'missile\'` in place of `\'boulder\'` and nothing else changed - pins. fieryFuryBoulderWarlord is the same card with Fiery Fury in place of Flame Blade, and reaches 3.000 on a boulder because that effect\'s test is the wider `slotHasPhysicalRanged` (stats.js:1907-1908).',
    },
  },
  flameBladeThrownWarlord: {
    desc: 'Warlord Flame Blade: +3 melee and +2 thrown, plus the unconditional SFireBreath += 1 at UnitCalc.CAS!NOTZEAL!+7..+10 ": Combat cast Flame Blade now nolonger buff rock type range attack but give fire breath+1 :" "}" that creates a strength-1 fire breath from the empty breath field. atk 1+3=4, thrown 1+2=3, created breath 1, all at 100% hit → E[dmg]=8.0. Without the ability the same unit deals 2.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hp:10, abilities: { flameBladeWarlord: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 8.000, sdDmgToB: 0.000 },
  },
  flameBladeFireBreathWarlord: {
    desc: 'Warlord Flame Blade +1 fire breath: 1 + FB → 2 breath, 100% hit + melee atk 1+3=4 → E[dmg]=6.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:1, type:'fire' } }, hp:10, abilities: { flameBladeWarlord: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 6.000, sdDmgToB: 0.000 },
  },
  flameBladeCreatesFireBreathWarlord: {
    desc: 'Warlord combat Flame Blade creates Fire Breath 1 from an empty field: melee 1+3=4 plus breath 1 at 100% hit → E[dmg]=5.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { flameBladeWarlord: true } },
    b: { def:0, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },
  fieryBladeMeleeWarlord: {
    desc: 'Warlord Lava Smelter Fiery Blade +3 melee: 1 atk + Fiery Blade → 4 atk, 100% hit vs 0 def → E[dmg]=4.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, race:'Dwarf', abilities: { lavaSmelterFieryBlade: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. The gap is in the naming, not the fixture: the control is registered as `lavaSmelterFieryBlade`, label "Lava Smelter: Fiery Blade" (enchantments.js:110), and the sweep binds a feature only when the whole token run `lava smelter fiery blade` appears in the key, while this key names the effect without its Lava Smelter source. The feature is live all the same - `training:lavaSmelter:flameBlade` writes `fieryBlade` onto the record (stats_identity.js), `hasWarlordBladeAt` reads it back off the record at each consumer (stats.js) and the phase-c blade step adds the modern melee bonus of 3, taking atk 1 to 4. The other candidate, `race: \'Dwarf\'`, is not read by that grant: the step\'s admission test is the mineral-pair mark and the permanent unitType (stats_identity.js, the caller passing `baseUnitType` through the sequence context), and it reads the five Lava Smelter ability flags and the legacy selector. No race test appears anywhere in the block.',
    },
  },
  fieryBladeNoFireBreathWarlord: {
    desc: 'Warlord Lava Smelter Fiery Blade does NOT add fire breath: breath stays 1 while melee is 1+3=4 → E[dmg]=5.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:1, type:'fire' } }, hp:10, race:'Dwarf', abilities: { lavaSmelterFieryBlade: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. Same naming gap as fieryBladeMeleeWarlord - the control is `lavaSmelterFieryBlade` / "Lava Smelter: Fiery Blade" (enchantments.js:110) and the key names only the effect, so no candidate\'s token run appears in it. The claim itself is live and negative at once: the +1 Fire Breath is a region-d write gated on `warlordCombatFlameBlade` (stats_sequence.js), which is `isWarlord && !!abilities.flameBlade` (stats.js) and so reads the combat-cast enchantment rather than the Lava Smelter grant, leaving breath 1 beside the melee 1 + 3 that the phase-c step does land. Widen that gate to the grant and this reads 6.000, which flameBladeFireBreathWarlord pins - it is this card with the combat-cast Flame Blade in place of the grant and no `race` field. Ablating the grant leaves `fieryBlade` unwritten on the record and with it `hasWarlordBladeAt` false (stats.js), which is the blade step\'s own gate, so the melee +3 goes and the candidate is not inert.',
    },
  },
  fieryFuryMeleeWarlord: {
    desc: 'Warlord Fiery Fury +3 melee (regular unit): 1 atk + FF → 4 atk, 100% hit vs 0 def → E[dmg]=4.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { fieryFury: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  fieryFuryMissileWarlord: {
    desc: 'Warlord Fiery Fury +2 missile (regular unit): 1 rtb + FF → 3 rtb, 100% hit vs 0 def → E[dmg]=3.0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { fieryFury: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  fieryFuryBoulderWarlord: {
    desc: 'Warlord Fiery Fury +2 boulder (regular unit): 1 rtb + FF → 3 rtb, 100% hit vs 0 def → E[dmg]=3.0',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'boulder' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { fieryFury: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  fieryFuryThrownWarlord: {
    desc: 'Warlord Fiery Fury: +3 melee + +2 thrown (regular). atk 1+3=4, thrown 1+2=3 → E[dmg]=7.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hp:10, abilities: { fieryFury: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.000, sdDmgToB: 0.000 },
  },
  fieryFuryNoBreathBonusWarlord: {
    desc: 'Warlord Fiery Fury does NOT boost fire breath (elemental). breath 1 + 0 = 1, melee 1+3=4 → E[dmg]=5.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:1, type:'fire' } }, hp:10, abilities: { fieryFury: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },
  fieryFuryFantasticNoStatBonus: {
    desc: 'Warlord Fiery Fury on a fantastic creature: no stat bonuses (only First Strike + Chaos conversion). atk stays 1 → E[dmg]=1.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_nature', abilities: { fieryFury: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.fieryFury':
        'Keep, and the absence is the rule under test: the stat package is the ELSE arm of Fiery Fury\'s one base-Fantastic test - `ffRegularBonusAt = runCtx => isWarlord && !!abilities.fieryFury && !runCtx.base.fantastic` (stats.js) - and it gates both the phase-b `b:fieryFury` write (stats_sequence.js) and `ffMeleeBonusAt` (stats.js), so a base-Fantastic card takes nothing and ablating the enchantment must leave 1.000. The THEN arm is not dead in this version, it simply has nothing to act on here: its First Strike (`applyFieryFuryEffects`, combat_effects.js) faces a defender with no attack, and its Chaos realm (`b:fieryFury:race`, stats_identity.js) has no Chaos Surge to feed, this fixture setting none. Drop the base-Fantastic term and atk 1 becomes 4 for 4.000, which fieryFuryMeleeWarlord - this fixture with `unitType: \'fantastic_nature\'` removed and nothing else changed - pins.',
    },
  },
  fieryFuryFantasticFirstStrike: {
    desc: 'Warlord Fiery Fury on fantastic gives First Strike: A kills B before B can swing. atk 5 + FS, B atk 5 no FS, B has 5 HP → A wins unscathed → dmgToA=0, dmgToB=5.0',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, figs:1, unitType:'fantastic_nature', abilities: { fieryFury: true } },
    b: { atk:5, hitChance:70, def:0, hp:5, figs:1 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },
  fieryFuryFantasticChaosConversion: {
    desc: 'Warlord Fiery Fury on a fantastic non-undead creature converts it to Chaos: Chaos Surge (count 1, Warlord) then grants +3 melee. atk 1 + ChaosSurge(3) = 4 → E[dmg]=4.0',
    version: V_WARLORD,
    chaosSurge: 1,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_nature', abilities: { fieryFury: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  fieryFuryUndeadNoChaosConversion: {
    desc: 'Fiery Fury\'s Chaos write applies to every base-fantastic unit and carries no undead test (UnitCalcPre.CAS!NOTHERO!+3..+9 "IF (GETENCHANTMENTFLAG(U,EncFieryFury,0)=0) THEN { GOTO" "} ELSE {"); the undead exclusion comes later, from the compiled aggregate Undead normalization that forces race := 20 (Units.RecalculateUnits.pas, $0059FBD0..$0059FD93). So the Undead flag, not the Death realm, is what keeps this unit off the Chaos realm and out of Chaos Surge: atk stays 1 → E[dmg]=1.0. Dropping only the Undead flag gives 4.0, matching the sibling fieryFuryFantasticChaosConversion, so the pair brackets the rule.',
    version: V_WARLORD,
    chaosSurge: 1,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_death', abilities: { fieryFury: true, undead: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.fieryFury':
        'Keep. Both of the enchantment\'s arms are already answered on this card, so ablating it cannot move the number: the stat package needs `!runCtx.base.fantastic` (`ffRegularBonusAt`, stats.js) and this unit is base-Fantastic, while the Chaos realm its THEN arm writes at `b:fieryFury:race` (stats_identity.js:311-314) is overwritten by `c:undead`\'s `u.race = \'Death\'` (stats_identity.js:367-369), which ranks after it (stats_manifests.js:262, :280), so `chaosSurgeCount` finds no Chaos realm and returns 0 (stats.js:600-602). The live half is the Undead flag, which is what the fixture measures. Rank `b:fieryFury:race` after `c:undead` and the Chaos Surge melee bonus lands for 4.000 - the value fieryFuryFantasticChaosConversion pins on a base-Fantastic card that does reach the Chaos realm, differing from this one in two fields: `unitType` fantastic_nature rather than fantastic_death, and no `undead`.',
    },
  },
  fieryFurySanctifyNoChaosConversionWarlord: {
    desc: 'Sanctify overrides Fiery Fury\'s Chaos write from a different source line (UnitCalcPre.CAS!NODOMAINOFENCHANTER!+6 "SETSTAT(U,SRace,0,RCLife);") than the Undead normalization does: the unit ends Life rather than Chaos, so Chaos Surge does not reach it and atk stays 1 → E[dmg]=1.0. Dropping Sanctify gives 4.0.',
    version: V_WARLORD,
    chaosSurge: 1,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_nature', abilities: { fieryFury: true, sanctify: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.fieryFury':
        'Keep. Same shape as fieryFuryUndeadNoChaosConversion, with the override coming from the other source: the stat package needs `!runCtx.base.fantastic` (`ffRegularBonusAt`, stats.js) and this unit is base-Fantastic, while the Chaos realm `b:fieryFury:race` writes (stats_identity.js:311-314) is replaced by `b:sanctify`\'s `u.race = \'Life\'` (stats_identity.js:338), which ranks later inside the same region (stats_manifests.js:262, :267), so `chaosSurgeCount` returns 0 (stats.js:600-602). Ablating Fiery Fury changes neither answer; Sanctify is the live half, and fieryFuryFantasticChaosConversion is this fixture with Sanctify removed and nothing else changed, pinning 4.000.',
    },
  },
  fieryFuryFieryBladeNoStack: {
    desc: 'Warlord Fiery Fury + Fiery Blade: shared bonuses do NOT stack (melee stays +3, missile +2). atk 1+3=4 → E[dmg]=4.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, race:'Dwarf', abilities: { fieryFury: true, lavaSmelterFieryBlade: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction, and the inertness is the whole assertion: the claim is that the two sources supply one +3 melee between them, so removing either has to leave 4.000. The third candidate, `race: \'Dwarf\'`, is not read by the Lava Smelter grant: the step\'s admission test is the mineral-pair mark and the permanent unitType (stats_identity.js, the caller passing `baseUnitType` through the sequence context), and it reads the five Lava Smelter ability flags and the legacy selector. No race test appears anywhere in the block.',
      'a.ability.fieryFury':
        'Keep, and the absence is the rule under test: with a Warlord blade on the card `ffMeleeBonusAt` is forced to 0 by `ffRegularBonusAt(runCtx) && !hasWarlordBladeAt(u)` (stats.js), and the whole +3 comes from the phase-c blade step instead (`flameBladeStep`, stats.js), so ablating Fiery Fury leaves 4.000 - and ablating the Fiery Blade grant also leaves 4.000, because `ffMeleeBonusAt` then returns 3. Drop the `!hasWarlordBladeAt(u)` term and the two stack for 7.000. fieryFuryMeleeWarlord and fieryBladeMeleeWarlord each pin the single-source 4.000 this fixture has to match.',
    },
  },
  fieryFuryWeaponImmunityBypass: {
    desc: 'Warlord Fiery Fury bypasses Weapon Immunity (effective weapon → magic). atk 4+3=7 hits WI 10 def 0+10=10 normally but bypass leaves def 0 → E[dmg]=7.0',
    version: V_WARLORD,
    a: { atk:4, hitChance:70, hp:10, abilities: { fieryFury: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.000, sdDmgToB: 0.000 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: the defender\'s flag has to be unable to add anything, or there is no bypass. `ffRegularBonusAt(runCtx)` is one of `modernEncMagicOtherTermsAt`\' disjuncts (stats.js), so `modernAttackIsMagic` is true (combat_special_attacks.js), `wi` is false (combat_effects.js) and no Weapon Immunity bonus is ever added - the melee 4 + 3 lands whole. Remove that disjunct and Warlord\'s +10 Weapon Immunity Defence bonus (`effectiveDefense:weaponImmunity`, combat_effects.js) meets a 7-strength attack against Defence 0, the same pairing rustStripsMagicWeaponWarlord asserts at 0.000. Fiery Fury is the live candidate.',
    },
  },

  // --- Spirit Link (Warlord, Conjurer signature) ---
  spiritLinkExorciseImmuneWarlord: {
    desc: 'Spirit Link: spirit-linked fantastic_death is no longer fantastic for targeting, so Exorcise −4 cannot affect it — only physical 1 atk lands → 1.0 (vs 10.0 without Spirit Link)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: -4 } },
    b: { figs:2, def:0, res:5, hp:10, unitType: 'fantastic_death', abilities: { spiritLink: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.exorcise':
        'Keep, and the absence is the rule under test: `exorciseFailProb` returns 0 on its first line for any defender whose unit type does not begin `fantastic_` (combat_special_attacks.js:121), and the type it is handed is the finished one (combat_phases.js:88 passes `other.unitType`, which is `finishedUnitType`, the unit type the stat run left, stats.js). `d:spiritLink` clears Fantastic at the tail of the derivation (`stats_identity.js`), which is the identity a combat-time classification reads, and `legacyUnitTypeFromLiveRecord` then answers `normal_death` (stats_identity.js), so there is no banish roll for the ablation to remove and only the physical melee 1 lands. Spirit Link is the live half: without it the base fantastic_death survives to that read and the -4 fires.',
    },
  },
  spiritLinkWeaponImmunityBypassWarlord: {
    desc: 'Spirit Link: phase c grants magical attacks while the unit is still fantastic; phase d then clears Fantastic without clearing EncMagic. The spirit-linked attacker therefore still bypasses Weapon Immunity and deals 10.0.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, unitType: 'fantastic_chaos', abilities: { spiritLink: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 10.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is about *when* the EncMagic flag is read, and no feature the fixture could give up moves that read. The attacker is Fantastic where the flag is taken either way - it is base-Fantastic through `unitType`, and dropping that to normal leaves `b:spiritLink`\'s own assertion (stats_identity.js:302) standing in its place - so both attacker-side candidates leave 10.000, and the defender\'s Weapon Immunity has nothing to add once the flag is set.',
      'a.ability.spiritLink':
        'Keep, and the ordering is the rule under test: EncMagic\'s Fantastic arm is read off the record standing at `c:chaosSurge` (stats.js:2167, folded into the flag at :2168), and `d:spiritLink`\'s clearing write (stats_identity.js:387) is ranked past it (stats_manifests.js:283 then :297), so `modernAttackIsMagic` answers from a Fantastic unit (combat_special_attacks.js:585). Ablating the enchantment removes the clear along with the assertion and can never show that; the rank is what does. Take the flag from the finished identity instead and the attack is no longer magical, `wi(false)` holds (combat_effects.js:646-647, :656) and Warlord\'s +10 (combat_effects.js:499, added at :474) meets a 10-strength attack against Defence 0 at a 100% block chance. Spirit Link is not the source of the Fantastic this read finds, only of the later clear; spiritLinkExorciseImmuneWarlord is where the same `d:spiritLink` write is the live half.',
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: the defender\'s flag has to be unable to add anything, or there is no bypass. `modernAttackIsMagic` is true, so `wi` is false (combat_effects.js:646-647) and `effectiveDefense:weaponImmunity` never fires (combat_effects.js:474-475), leaving the melee 10 whole. Removing the flag reaches the same 10.000 through the other term of that conjunction instead, `hasWeaponImmunityEffect` answering false (combat_special_attacks.js:570-574).',
    },
  },
  spiritLinkBlessNoBonusWarlord: {
    desc: 'Spirit Link: a spirit-linked fantastic_chaos missile attacker grants the enemy no anti-Chaos Bless bonus, and neither does any other Warlord unit attack. The defence half needs magicImmunityEligible && spellId > 0 with a Chaos or Death realm (combat_effects.js:448-450) and every unit-attack descriptor passes spellId: 0 (:654, :663, :689, :701), so no missile configuration can reach it — Immolation (:709-717) is the one modern channel that does, and Spirit Link does not participate there. missile 10 vs def 0 → 10.0.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:10, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, unitType: 'fantastic_chaos', abilities: { spiritLink: true } },
    b: { def:0, toBlkMod:70, res:5, hp:10, abilities: { bless: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 10.000, sdDmgToB: 0.000 },
  },
  spiritLinkResistanceWarlord: {
    // F44 re-derivation: Spirit Link gives Res 5+2=7, Stoning Gaze −3 → effRes 4, pFail 0.6.
    // One defending figure at 10 HP → 6.000. The earlier 6.120 added a 0.12 physical component,
    // but SPEC (*Gaze attacks*) has that hidden component as MoM-only: CoM2 and Warlord carry
    // gazes as save-modifier stats with no attack-strength slot, so there is nothing to roll.
    desc: 'Spirit Link: +2 Resistance. Stoning Gaze −3 vs Res 5+2=7 → effRes 4, pFail 0.6 → 6.0 damage; Warlord has no hidden gaze component',
    version: V_WARLORD,
    a: { hp:10, abilities: { stoningGaze: -3 } },
    b: { res:5, hp:10, unitType: 'fantastic_nature', abilities: { spiritLink: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 6.000, sdDmgToB: 4.899, regDmgToB: 0.000, sdRegDmgToB: 0.000, irrDmgToB: 6.000, sdIrrDmgToB: 4.899 },
  },
  spiritLinkCastResetsLevelWarlord: {
    desc: 'Spirit Link’s cast puts a fantastic creature back to Recruit: `SETSTAT(TU,ALevel,1,1)` at OLSpell.CAS!NOTAIRSUPPORT!+10 "SETSTAT(TU,ALevel,1,1);", under the same `IF BASEFANTASTIC(TU)` as the Fantastic clear, and writing the base level "also sets experience to the amount required for that level" (MASTER.CAS~"ALevel=26;"). A marked enchantment is a cast that landed, so the stated Elite is the pre-cast record and `buffs:spiritLink:level` discards it — the shape `debuffs:rust:material` already has for the weapon control. atk 1, 100% hit vs def 0 → 1.0, where the same card without the enchantment reaches 1.0 by the other route, `c:level:fantastic` (F245).',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, level:'elite', unitType: 'fantastic_nature', abilities: { spiritLink: true } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'a.ability.spiritLink':
        'Keep, and the inertness is the rule under test: the two routes to Recruit meet on this card. With the enchantment the cast’s own `buffs:spiritLink:level` writes it (stats_sequence.js); without it the permanent record stays Fantastic and `c:level:fantastic` writes it instead (stats_sequence.js). Ablating the enchantment therefore cannot move the number, and that it cannot is the claim — before F245 this same card read 3.000, the widening having suppressed `c:level:fantastic` while nothing replaced it. a.unitType is the live half: dropped to normal, neither route fires and the Elite ladder row survives for 3.000.',
      'a.level=elite':
        'Keep for the same reason and from the other side: the field is what the cast discards, so ablating it to normal reaches the same 1.000 by construction. Its presence is what makes the discard visible at all — with the card already at Recruit the step would write the value that stands there. The cast’s Fantastic clear is the live half of badMoonSkipsDestinyPermanentFantasticCoM2’s Warlord sibling and of rustAppliesToSpiritLinkedFantasticWarlord; it is not the loadout gate’s, which reads the record four phases earlier (F262).',
    },
  },
  apotheosisKeepsWeaponMaterialWarlord: {
    desc: 'The material is a stored flag the training city writes once, and no block in either engine family gates the read on Fantastic: `Caster.exe` reads `BaseUnits[i].EnchantmentFlags[EncMagic] or EncMithril or EncAdamant` ($00598D91) and the DOS builds `_UNITS[si].mutations & UM_WEAPON_QUALITY_MASK`. Destiny’s permanent identity write, `B.race := 19; B.Fantastic := True` ($0059A390), touches no material flag, so a normal unit that was equipped when it was built stays equipped after the cast: `training:weaponQuality` reads `u.fantastic` at its own `training` rank, four phases ahead of `buffs:destiny` (F262). `c:destiny` doubles the melee first (atk 1 → 2) and `c:weapon` adds adamantium’s +2 behind it (→ 4), the Warlord chain ranking `c:destiny` at 126 and `c:weapon` at 128: 100% hit vs def 0 → 4.0. Both named features are live — without Destiny the same card reaches 3.0, without the material 2.0. Until F262 the gate was an end-of-`buffs` snapshot and this card read 2.0, the cast having discarded a material it never writes.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, weapon:'adamantium', abilities: { apotheosis: true } },
    b: { def:0, hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  spiritLinkApotheosisKeepsPermanentFantasticWarlord: {
    desc: 'The two permanent identity writes on one card, and the chain order between them is what the number measures. Spirit Link’s cast clears the flag once — `SETSTAT(TU,AFantastic,1,0)` (OLSpell.CAS!NOTAIRSUPPORT!+9 "SETSTAT(TU,AFantastic,1,0);") — while Apotheosis’ `B.race := 19; B.Fantastic := True` ($0059A390) is a write the recalculation re-makes on every pass, so `buffs:destiny` stands behind `buffs:spiritLink:fantastic` and the record `a:baseCopy` publishes is Fantastic. Bad Moon is the probe: its `(not B.Fantastic)` arm ($005A273C) therefore refuses the unit and the −3 Resistance is never written. res 6 + 2 (Spirit Link’s cast) + 4 (Apotheosis) = 12, Stoning Gaze −3 → effRes 9 → pFail 0.1 against hp 10 × 2 (Apotheosis) = 20 → 2.0. Ranking the two writes the other way round would leave the copied record non-Fantastic, Bad Moon would land for res 9 → effRes 6 → 0.4 → 8.0, and this is the only fixture in the corpus that marks both (F262).',
    version: V_WARLORD,
    a: { hp:10, abilities: { stoningGaze: -3 } },
    b: { res:6, hp:10, unitType: 'fantastic_nature', abilities: { spiritLink: true, apotheosis: true, badMoon: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 6.000, regDmgToB: 0.000, sdRegDmgToB: 0.000, irrDmgToB: 2.000, sdIrrDmgToB: 6.000 },
    vacuity: {
      'b.ability.badMoon':
        'Keep, and the absence is the rule under test: `badMoonActiveAt` carries `&& !runCtx.base.fantastic` (stats.js), and Apotheosis’ permanent write re-asserts that flag behind Spirit Link’s clear, so the step’s `when` refuses it and the −3 Resistance is never written (stats_sequence.js). Bad Moon has to be on the card for the exclusion to be what is measured, and it is what makes the chain order observable at all: swap `buffs:spiritLink:fantastic` and `buffs:destiny` in CHAIN_COM2_WARLORD_1_5_12_9 (stats_manifests.js) and this fixture reads 8.000. Both other marks are live — without Spirit Link’s +2 Resistance the card reads 6.000, and without Apotheosis the clear stands, Bad Moon lands, and it reads 8.000 by the other route.',
    },
  },

  // --- Chaos Channels ---
  ccDefense131: {
    desc: 'Chaos Channels Defense (MoM 1.31): +6 def bug → 7 atk 100% hit, def 0+6=6, 100% block → 1 dmg',
    version: V_MOM_131,
    a: { atk:7, toHitMod:70, hp:10 },
    b: { toBlkMod:70, hp:10, abilities: { ccDefense: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - the version suffix carries no capital to break on, so camelTokens splits the key into `cc`/`defense131` and the candidate\'s `cc`/`defense` is not a contiguous run inside it. The feature is live: the bug is `version === \'mom_1.31\' ? 6 : 3` (combat_abilities.js:1070), written at :1072, and ccDefenseFixed is this fixture with `version` alone changed to CP 1.60, pinning the patched 4.000 against this 1.000.',
    },
  },
  ccDefenseFixed: {
    desc: 'Chaos Channels Defense (CP 1.60): +3 def (Insecticide fix) → 7 atk 100% hit, def 0+3=3, 100% block → 4 dmg',
    version: V_MOM_CP,
    a: { atk:7, toHitMod:70, hp:10 },
    b: { toBlkMod:70, hp:10, abilities: { ccDefense: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 4.000, sdDmgToB: 0.000 },
  },
  ccFireBreathBasic: {
    desc: 'Chaos Channels Fire Breath 2: atk 1 melee + breath 2 (forced), 100% hit → 3 dmg',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  ccFireBreathAfterLevelMoM: {
    desc: 'Chaos Channels Fire Breath (MoM 1.31) is written inside BU_Apply_Specials at 0x8F720, after the level bonus, and it assigns the shared slot rather than adding to it — so an elite unit breathes 2, not 2 + the elite ranged bonus. Elite melee 1 + 2 = 3 plus breath 2 → 5 dmg (7 if the assignment ran before the level bonus; a normal-level unit deals 3).',
    version: V_MOM_131,
    a: { atk:1, level:'elite', toHitMod:70, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },
  ccFireBreathCoM: {
    desc: 'Chaos Channels Fire Breath 4 in CoM: atk 1 melee + breath 4 → 5 dmg',
    version: V_COM,
    a: { atk:1, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },
  ccFireBreathReplacesThrown: {
    desc: 'Chaos Channels Fire Breath (MoM 1.31): base Thrown 3 is admitted at the signed ceiling and replaced by Fire Breath 2, so melee 1 + breath 2 = 3 dmg',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:3, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  ccFireBreathRejectsPositiveThrownCP: {
    desc: 'Chaos Channels Fire Breath (CP 1.60): positive base Thrown 3 exceeds the patched ceiling of 0, so the shared slot stays Thrown; Chaos identity still admits the +2 node aura, making melee 3 + Thrown 5 = 8 (7 if wrongly replaced, 4 without Chaos Channels)',
    version: V_MOM_CP,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:3, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    nodeAura: 'chaos',
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 8.000, sdDmgToB: 0.000 },
  },
  ccFireBreathRepeatsAtRecompute131: {
    desc: 'MoM 1.31 passes the mutations byte whole to the recompute\'s second BU_Apply_Specials call (131:0x90A1D), so the fire-breath block assigns the shared slot a second time, after the Chaos node aura has already raised it. Melee 1 + 2 (aura, on the Chaos identity Chaos Channels grants) = 3, plus breath 2 → 5 dmg; 7 if the second assignment is missing and the aura keeps its +2 on the slot, which is what CP 1.60 does once its zeroed mutations byte stops the repeat.',
    version: V_MOM_131,
    nodeAura: 'chaos',
    a: { atk:1, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },
  ccFireBreathRecomputeFixedCP: {
    desc: 'The same fixture on CP 1.60, which zeroes the mutations byte at the second call so the fire-breath block runs once: the Chaos node aura keeps its +2 on the shared slot, giving melee 3 + breath 4 = 7 dmg against 1.31\'s 5.',
    version: V_MOM_CP,
    nodeAura: 'chaos',
    a: { atk:1, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.000, sdDmgToB: 0.000 },
  },
  ccFireBreathCoexistsWithLightningCoM2: {
    // F44: this asserted 5.000 on the assumption that CC overwrites the lightning breath. No
    // source supports that. `Caster.exe` $00599EE8 does `firebreath += 4` and writes no other
    // attack field, and the CoM2 manual says CC "can still add Fire Breath to units that have
    // Thrown, Gaze or Lightning Breath". CoM2's channels are independent, so both fire.
    desc: 'Chaos Channels in CoM2 adds Fire Breath alongside an existing Lightning Breath: melee 1 + lightning 5 + fire 4 = 10',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { lightningBreath: { strength:5, type:'lightning' } }, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 10.000, sdDmgToB: 0.000 },
  },
  ccFireBreathCoexistsWithGazeCoM2: {
    // F44's replacement for `ccFireBreathReplacesGazeCoM2`, which asserted that the gaze
    // suppressed the breath. Nothing supports that; the fabricated overwrite is gone. Defender
    // Resistance 20 against a −3 gaze puts the kill roll out of reach, so this isolates the
    // grant: melee 1 + fire breath 4 = 5.000, where the old suppression gave melee 1 alone.
    desc: 'Chaos Channels in CoM2 adds Fire Breath to a unit that already has a Stoning Gaze: melee 1 + breath 4 = 5 (1 if the gaze wrongly suppresses the grant)',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { ccFireBreath: true, stoningGaze: -3 } },
    b: { res:20, hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
  },
  ccFireBreathVsFireImmunity: {
    desc: 'CC Fire Breath vs Fire Immunity: breath blocked (def 50) → melee 1 only',
    a: { atk:1, toHitMod:70, toHitRtbMod:70, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10, abilities: { fireImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.001 },
    vacuity: {
      'a.ability.ccFireBreath':
        'Keep. Inert as a consequence of the assertion: Fire Immunity has already closed the channel the grant writes, so removing the grant cannot move the number. The grant sets the shared slot\'s type to `fire` (stats_sequence.js:351) at the MoM strength 2 (stats.js:392), the defender\'s immunity then raises the blanket marker on any fire-typed ranged attack (combat_effects.js:779, gated at :780-782), and the tail step cashes that in as Defence 50 (combat_effects.js:834, value at :906) - the breath contributes 0 either way and only the melee 1 lands. Fire Immunity is the live half: ccFireBreathBasic states the same two units without it (spelling `version: V_MOM_131` where this fixture inherits mom_1.31 from its group) and pins 3.000.',
    },
  },
  ccBypassWeaponImmunity: {
    desc: 'CC unit attacks Weapon Immune: CC makes unit fantastic_chaos, so WI does not apply → 3 dmg',
    a: { atk:3, toHitMod:70, hp:10, abilities: { ccDefense: true } },
    b: { hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test: the defender\'s flag has to be unable to add anything, or there is no bypass. `weaponImmunityApplies` refuses a non-normal attacker outright (combat_special_attacks.js:602), and `c:chaosChannels:armor:race` has made this attacker a Chaos fantastic creature (stats_identity.js:350), so `dosEffectiveDefense:weaponImmunityMark` never fires (combat_effects.js:785-786) and 1.31\'s floor of 10 (combat_effects.js:826) never runs - Defence stays 0 and the melee 3 lands whole. Removing the flag reaches the same 3.000 by the function\'s first line instead (combat_special_attacks.js:598). Chaos Channels is the live half here; its own +6 Defence lands on the attacker, which never has to defend on this card.',
    },
  },
  ccNodeAuraChaos: {
    desc: 'CC unit benefits from Chaos Node aura: +2 atk. 1 atk + CC (fantastic_chaos) + chaos node aura → 3 atk, 100% hit → 3 dmg',
    nodeAura: 'chaos',
    a: { atk:1, toHitMod:70, hp:10, abilities: { ccDefense: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
  },
  // This pair is kept although both sides now agree: CoM2 was modelled as replacing an
  // existing fire breath and Warlord as stacking, but `Caster.exe` $00599F3E is one `add`
  // routine serving both, so the split was invented. Keeping the pair locks the agreement —
  // a regression that re-splits them fails exactly one side.
  ccFireBreathAddsToExistingCoM2: {
    desc: 'CC Fire Breath vs existing fire breath (CoM2): adds. melee 1 + fire breath (3+4) = 8 dmg',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:3, type:'fire' } }, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 8.000, sdDmgToB: 0.000 },
  },
  ccFireBreathAddsToExistingWarlord: {
    desc: 'CC Fire Breath vs existing fire breath (Warlord): adds, identically to CoM2. melee 1 + fire breath (3+4) = 8 dmg',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, modernAttacks: { fireBreath: { strength:3, type:'fire' } }, hp:10, abilities: { ccFireBreath: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 8.000, sdDmgToB: 0.000 },
  },

  // --- Lucky ---
  luckyToHit: {
    desc: 'Lucky To Hit: 1 atk, base 30% + Lucky +10% = 40% hit vs 0 def → E[dmg] = 0.4',
    a: { atk:1, hp:10, abilities: { lucky: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.400, sdDmgToB: 0.490 },
  },
  luckyToHitRanged: {
    desc: 'Lucky To Hit Ranged: missile 1 atk, base 30% + Lucky +10% = 40% hit vs 0 def → 0.4',
    a: { rtbType:'missile', rtb:1, hp:10, abilities: { lucky: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.400, sdDmgToB: 0.490 },
  },
  luckyToBlock: {
    desc: 'Lucky To Block: 1 atk 90% hit (v1.31 Lucky penalty) vs def 1, 40% block → 0.9×0.6 = 0.54',
    a: { atk:1, toHitMod:70, hp:10 },
    b: { def:1, hp:10, abilities: { lucky: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.540, sdDmgToB: 0.498 },
  },
  luckyResistance: {
    desc: 'Lucky Resistance: Poison 4 vs base res 5 + Lucky +1 = res 6, pFail 40%, E[dmg] = 1.6',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { lucky: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.600, sdDmgToB: 0.980 },
  },
  luckyEnemyMeleePenalty131: {
    desc: 'Lucky Enemy Melee Penalty (MoM 1.31): bug — B Lucky, A melee 30% → 20%. 1 atk vs 0 def → E[dmg] = 0.2',
    version: V_MOM_131,
    a: { atk:1, hp:10 },
    b: { hp:10, abilities: { lucky: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.200, sdDmgToB: 0.400 },
  },
  luckyEnemyPenaltyNotRanged131: {
    desc: 'Lucky Enemy Ranged Penalty (MoM 1.31): enemy penalty does NOT apply to ranged. Missile 1 atk 30% → still 0.3',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:1, hp:10 },
    b: { hp:10, abilities: { lucky: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.300, sdDmgToB: 0.458 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the 1.31 enemy penalty is melee-only, and the defender\'s Lucky is the only feature the fixture adds. Its own three writes (combat_abilities.js:833) have nothing to act on here either - the defender never attacks, its Defence 0 rolls no blocking dice, and the fixture makes no resistance roll.',
      'b.ability.lucky':
        'Keep, and the absence is the rule under test: the 1.31 block writes the opponent\'s `toHitMelee` and nothing else (combat_phases.js:255), where the Invisibility block below it writes `toHitMelee` and `toHitRtb` together (combat_phases.js:280-281), so a missile attacker is outside it and the 30% base To Hit stands. Give the block the shared secondary slot as well and this reads 0.200 - the value its melee twin luckyEnemyMeleePenalty131 pins against the same Lucky defender.',
    },
  },
  luckyEnemyPenaltyRemovedPatched: {
    desc: 'Lucky Enemy Melee Penalty (MoM CP 1.60): fix — enemy penalty removed. 1 atk 30% vs Lucky → still 0.3',
    version: V_MOM_CP,
    a: { atk:1, hp:10 },
    b: { hp:10, abilities: { lucky: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0.300, sdDmgToB: 0.458 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that CP 1.60 removed the enemy penalty, so the defender\'s Lucky has to move nothing. Its own three writes (combat_abilities.js:833) have nothing to act on here either - the defender never attacks, its Defence 0 rolls no blocking dice, and the fixture makes no resistance roll.',
      'b.ability.lucky':
        'Keep, and the absence is the fix under test: the whole enemy-penalty block sits inside `if (version === \'mom_1.31\')` (combat_phases.js:253), so no CP 1.60 attacker takes the -10 written at :255 and the 30% base To Hit stands. luckyEnemyMeleePenalty131 is this fixture with `version` alone changed and pins 0.200. version-dead is a coverage fact rather than a second claim: this is the only mom_cp_1.60.00 preset in the suite that configures `lucky`, the other seven being luckyToHit, luckyToHitRanged, luckyToBlock, luckyResistance, luckyEnemyMeleePenalty131 and luckyEnemyPenaltyNotRanged131 on mom_1.31 and luckyStarEnchantedUnitWarlord on Warlord.',
    },
  },

  // --- Defense Rollover (wounded top figure) ---
  defRolloverWoundedCoM: {
    desc: 'MoM/CoM: top fig wounded (1/2 HP); rollover at fullHP=2, net 2 hits fullHP threshold → no fresh roll → E=2.000',
    version: V_COM,
    a: { figs: 1, atk: 3, toHitMod: 70, def: 0, hp: 20 },
    b: { figs: 2, hp: 2, dmg: 1, def: 1, toBlkMod: 70, atk: 0 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 2.000, sdDmgToB: 0.000, regDmgToB: 3.000, sdRegDmgToB: 0.000 },
    vacuity: {
      'no-ablatable-feature':
        'Keep. Nothing to ablate by construction, because the rule is a numeric state rather than a feature: the fixture states only figs/atk/toHitMod/def/hp/dmg/toBlkMod, and none of those is an ability, one of `candidates()`\' unit or identity fields, or a combat global (tools/preset_vacuity_sweep.js:196-206, enumerated at :256-292). What decides the number is `b`\'s `dmg: 1` against a 2x2 pool. The DOS engines are handed no top-figure threshold - `isCoM2 ? woundedTopFigHP(cap, b.hp) : undefined` (combat_phases.js:654, and again at :565, :720 and :781 for the other channels and the other side) - so the chain rolls over at the full 2 HP (engine.js:116-119): 3 hits less 1 block is exactly 2, the boundary is reached with nothing left to carry, and the total is 2. defRolloverWoundedCoM2 states the same units on CoM 2, with `hitChance` for `toHitMod` as ui_state.js:304-306 requires, and pins 1.000.',
    },
  },
  defRolloverWoundedCoM2: {
    desc: 'CoM2: top fig wounded (1/2 HP); rollover at topFigHP=1, excess hits fresh defense roll → blocked → E=1.000',
    version: V_COM2,
    a: { figs: 1, atk: 3, hitChance:70, def: 0, hp: 20 },
    b: { figs: 2, hp: 2, dmg: 1, def: 1, toBlkMod: 70, atk: 0 },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000, regDmgToB: 2.000, sdRegDmgToB: 0.000 },
    vacuity: {
      'no-ablatable-feature':
        'Keep, and nothing to ablate for the same reason as its DOS half defRolloverWoundedCoM: the fixture states only numeric fields, none of which `candidates()` enumerates (tools/preset_vacuity_sweep.js:196-206, :256-292). Here `isCoM2` supplies the threshold (combat_phases.js:654), `woundedTopFigHP` of the defender\'s remaining 3 HP over 2 HP per figure is 1 (combat_abilities.js:54), and the shallower first boundary sends the excess into a fresh Defence roll (engine.js:132, chained at :139-146) which a 100% block chance takes - 1.000 against the DOS 2.000.',
    },
  },

  // --- Predefined unit matchups (MoM 1.31) ---
  // --- Large Shield ---
  largeShieldRangedMissile: {
    desc: 'Large Shield Ranged (MoM 1.31): missile 4 (100% hit) vs def 1+2=3 (100% block) → 4−3=1',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:4, toHitRtbMod:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:10, abilities: { largeShield: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
  },
  largeShieldMeleeNoEffect: {
    desc: 'Large Shield Melee: LS does NOT apply — atk 4 (100% hit) vs def 1 (100% block) → 4−1=3',
    a: { atk:4, toHitMod:70, hp:10 },
    b: { atk:0, def:1, toBlkMod:70, hp:10, abilities: { largeShield: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 3.000, sdDmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Large Shield is a ranged-only bonus, so the only feature the fixture adds cannot move the 3.',
      'b.ability.largeShield':
        'Keep, and the absence is the rule under test: `dosEffectiveDefense:largeShield` is gated on `ctx.isRanged` (combat_effects.js:773), and the melee descriptor is the one branch of `dosDefenseForAttack` that never sets that flag (combat_effects.js:955-961), so Defence stays 1 and 4 - 1 = 3. Drop the `isRanged` term and MoM\'s +2 (combat_effects.js:904) makes it 4 - 3 = 1, which is what its ranged twin largeShieldRangedMissile pins against the same Defence-1 Large Shield defender.',
    },
  },
  largeShieldThrown: {
    desc: 'Large Shield Thrown: thrown 4 (100% hit) vs def 1+2=3 (100% block) → 4−3=1; melee 1 vs def 1 (no LS) → 0',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:4, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:1, toBlkMod:70, hp:10, abilities: { largeShield: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
  },
  largeShieldArmorPiercing: {
    desc: 'Large Shield + AP Ranged: def 4+2=6 halved to 3 — missile 4 (100% hit) vs 3 (100% block) → 1',
    a: { rtbType:'missile', rtb:4, toHitRtbMod:70, hp:10, abilities: { armorPiercing: true } },
    b: { def:4, toBlkMod:70, hp:10, abilities: { largeShield: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
  },
  largeShieldFireBreath: {
    desc: 'Large Shield Breath: fire breath 4 (100% hit) vs def 1+2=3 (100% block) → 4−3=1; melee 1 vs def 1 (no LS) → 0',
    a: { atk:1, toHitMod:70, rtbType:'fire', rtb:4, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:1, toBlkMod:70, hp:10, abilities: { largeShield: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 0.000 },
  },

  // --- Large Shield (CoM/CoM2: +3) ---
  largeShieldCom2Ranged: {
    desc: 'Large Shield Ranged (CoM): missile 4 (100% hit) vs def 1+3=4 (100% block) → 0',
    a: { rtbType:'missile', rtb:4, toHitRtbMod:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:10, abilities: { largeShield: true } },
    rangedCheck: true, rangedDist: 1,
    version: V_COM,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 0, sdDmgToB: 0.000 },
  },

  // --- Blur ---
  // blurBasicMoM131: 10 atk, 100% to hit, def 0, hp 100 (no overflow). Buggy v1.31: skip-on-success.
  // E[negated] per DP recurrence = 0.9174, E[surviving] = 9.083.
  blurBasicMoM131: {
    desc: 'Blur v1.31 (buggy, 10%): 10 atk 100% hit, B has blur — skip-on-success bug, E[dmg]≈9.083',
    version: V_MOM_131,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.083, sdDmgToB: 0.834 },
  },
  blurFixedMoM160: {
    desc: 'Blur v1.60 (fixed, 10%): 10 atk 100% hit, B has blur — no skip bug, E[dmg]=9.0',
    version: V_MOM_CP,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.000, sdDmgToB: 0.949 },
  },
  blurCoM2: {
    desc: 'Blur CoM2 (20%): tactical defender Card B\'s army has Blur; E[dmg]=8.0',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 8.000, sdDmgToB: 1.265 },
  },
  blurCoM2CounterOwnSide: {
    desc: 'CoM2 Card B army Blur reduces both the initiating strike and Card B\'s counterattack; E[dmg]=8 each',
    version: V_COM2,
    a: { atk:10, def:0, hitChance:70, hp:100 },
    b: { atk:10, def:0, hitChance:70, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 8.000, sdDmgToA: 1.265, dmgToB: 8.000, sdDmgToB: 1.265 },
  },
  blurIllImmBugV131: {
    desc: 'Blur v1.31 bug: defender illusionImmunity disables their own blur — E[dmg]=10 (no protection)',
    version: V_MOM_131,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true, illusionImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 10.000, sdDmgToB: 0.000 },
    vacuity: {
      'b.ability.blur':
        'Keep. Inert as a consequence of the assertion: the claim is that 1.31 lets the defender\'s own Illusion Immunity switch its Blur off, so the Blur has to be worth nothing. `getBlurChance` picks the 10% rate (combat_effects.js:24, :27) and then returns 0 because the 1.31 branch tests the *defender\'s* flag (combat_effects.js:40-41), leaving all 10 hits to land. Illusion Immunity is the live half. Delete that branch and the test falls to the attacker, who carries none, so the Blur survives - blurIllImmDefenderFixed is this fixture with `version` alone changed to CP 1.60 and pins 9.000, the round 9 rather than blurBasicMoM131\'s 9.083 because `blurBuggy` is 1.31-only (combat.js:71).',
    },
  },
  blurIllImmAtkBugV131: {
    desc: 'Blur v1.31 bug: attacker illusionImmunity does NOT disable blur (checked on wrong unit) — E[dmg]≈9.083',
    version: V_MOM_131,
    a: { atk:10, toHitMod:70, hp:10, abilities: { illusionImmunity: true } },
    b: { def:0, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.083, sdDmgToB: 0.834 },
  },
  blurIllImmFixed: {
    desc: 'Blur v1.60 fixed: attacker illusionImmunity disables blur — E[dmg]=10',
    version: V_MOM_CP,
    a: { atk:10, toHitMod:70, hp:10, abilities: { illusionImmunity: true } },
    b: { def:0, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 10.000, sdDmgToB: 0.000 },
    vacuity: {
      'b.ability.blur':
        'Keep. Inert as a consequence of the assertion: the claim is that CP 1.60 reads Illusion Immunity on the attacker, which is where this fixture puts it, so the defender\'s Blur has to be worth nothing. `getBlurChance` picks the 10% rate (combat_effects.js:24, :27) and then returns 0 on the non-1.31 branch (combat_effects.js:42-43). The attacker\'s Illusion Immunity is the live half; blurIllImmAtkBugV131 is this fixture with `version` alone changed to 1.31, where the same flag is read on the wrong unit and the Blur survives at 9.083.',
    },
  },
  blurIllImmDefenderFixed: {
    desc: 'Blur v1.60 fixed: defender illusionImmunity does NOT disable their own blur (correct unit checked) — E[dmg]=9.0',
    version: V_MOM_CP,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true, illusionImmunity: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.000, sdDmgToB: 0.949 },
  },
  blurVsDoom: {
    desc: 'Blur does not apply to Doom damage: 10 atk doom → floor(10/2)=5, B has blur — doom bypasses blur, E[dmg]=5',
    version: V_MOM_131,
    a: { atk:10, toHitMod:70, hp:10, abilities: { doom: true } },
    b: { def:0, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 5.000, sdDmgToB: 0.000 },
    vacuity: {
      'b.ability.blur':
        'Keep, and the absence is the rule under test: a Doom strike never reaches the Blur filter. `calcMeleeTouchOutcome` routes it to `calcDoomDist` (combat_fear_and_touch.js:413-414), which takes neither To Hit nor blur and returns the exact total (combat_special_attacks.js:313-317); only the ordinary branch below passes `blurChance` on (combat_fear_and_touch.js:416). The 10% is computed for this defender and then never consulted, and the number is `applyDoomUAHalving`\'s floor(10 / 2) (combat_phases.js:169). Doom is the live half: blurBasicMoM131 is this fixture with it removed and pins 9.083.',
    },
  },
  invisToHitMoM: {
    desc: 'Invisibility in MoM: −10% to-hit penalty (no blur-equivalent): 10 atk 90% hit, def 0 → E[dmg]=9.0',
    version: V_MOM_CP,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { invisibility: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.000, sdDmgToB: 0.949 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact - the key abbreviates the ability, so camelTokens gives `invis`/`to`/`hit`/`mo`/`m` while the candidate\'s only terms are its key and label, `invisibility` and `Invisibility` (enchantments.js:40). The feature is live: on a MoM build `invisGivesBlur` is false (combat_effects.js:26), so Invisibility acts only as the -10 percentage points written at combat_phases.js:280, gated on `!invisIsCoM` at :278, taking a capped 100% To Hit to 90% for 9.000 where a visible defender takes the full 10.',
    },
  },
  blurInvisCoM: {
    desc: 'Invisibility grants Blur-equivalent in CoM (20%, no to-hit penalty): 10 atk 100% hit → E[dmg]=8.0',
    version: V_COM,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { invisibility: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 8.000, sdDmgToB: 1.265 },
    vacuity: {
      'name-binds-nothing':
        'Keep. The same tokenisation artefact - camelTokens gives `blur`/`invis`/`co`/`m` against the candidate\'s `invisibility`/`Invisibility` (enchantments.js:40), and the key\'s `blur` names the modelled effect rather than a second feature, since the fixture sets no Blur. The feature is live, and this is the other side of invisToHitMoM: `invisGivesBlur` is true for a `com` version (combat_effects.js:19, :26), so Invisibility alone takes the 20% rate (combat_effects.js:27, :35-36) while the MoM To-Hit penalty is skipped (combat_phases.js:273, :278), giving 8.000 where MoM gives 9.000. The `CoM` suffix is com_6.08, matching the fixture\'s `version`; blurPlusInvisCoM is the same version\'s Blur+Invisibility arm and blurPlusInvisCoM2v2 the actual CoM 2 one.',
    },
  },
  blurPlusInvisCoM: {
    desc: 'Blur + Invisibility CoM combined 30% (no to-hit penalty): 10 atk 100% hit → E[dmg]=7.0',
    version: V_COM,
    a: { atk:10, toHitMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true, invisibility: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.000, sdDmgToB: 1.449 },
  },
  blurPlusInvisCoM2v2: {
    desc: 'Card B army Blur + Card B Invisibility CoM2 combined 30%: 10 atk 100% hit → E[dmg]=7.0',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true, invisibility: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 7.000, sdDmgToB: 1.449 },
  },
  blurPlusInvisWarlord: {
    desc: 'Card B army Blur + Card B Invisibility Warlord combined 40% → E[dmg]=6.0',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true, invisibility: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 6.000, sdDmgToB: 1.549 },
  },
  // Blur applies to missile, boulder, magic ranged, thrown, fire breath, gaze ranged (v1.31 buggy 10%)
  blurRangedMissile131: {
    desc: 'Blur applies to ranged missile (v1.31 buggy 10%): rtb=10 100% hit → E[dmg]≈9.083',
    version: V_MOM_131,
    a: { rtbType:'missile', rtb:10, toHitRtbMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.083, sdDmgToB: 0.834 },
  },
  blurBoulder131: {
    desc: 'Blur applies to boulder (v1.31 buggy 10%): rtb=10 100% hit → E[dmg]≈9.083',
    version: V_MOM_131,
    a: { rtbType:'boulder', rtb:10, toHitRtbMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.083, sdDmgToB: 0.834 },
  },
  blurMagicRanged131: {
    desc: 'Blur applies to magic ranged (v1.31 buggy 10%): rtb=10 100% hit → E[dmg]≈9.083',
    version: V_MOM_131,
    a: { rtbType:'magic_c', rtb:10, toHitRtbMod:70, hp:10 },
    b: { def:0, hp:100, abilities: { blur: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.083, sdDmgToB: 0.834 },
  },
  // Thrown/fire breath require atk>0 to trigger, so melee fires too: E = thrown blur (9.083) + melee blur (0.9) = 9.983
  blurThrown131: {
    desc: 'Blur applies to thrown (v1.31 buggy 10%): rtb=10 + atk=1 both 100% hit → E[dmg]≈9.983',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:10, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.983, sdDmgToB: 0.886 },
  },
  blurFireBreath131: {
    desc: 'Blur applies to fire breath (v1.31 buggy 10%): rtb=10 + atk=1 both 100% hit → E[dmg]≈9.983',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, rtbType:'fire', rtb:10, toHitRtbMod:70, hp:10 },
    b: { atk:0, def:0, hp:100, abilities: { blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.983, sdDmgToB: 0.886 },
  },
  blurGazeRanged131: {
    desc: 'Blur applies to hidden gaze ranged component (v1.31 buggy 10%): shared gaze strength 10 100% hit → E[dmg]≈9.083',
    version: V_MOM_131,
    a: { rtbType:'gaze_stoning', rtb:10, toHitRtbMod:70, hp:10, abilities: {  } },
    b: { def:0, hp:100, abilities: { stoningImmunity: true, blur: true } },
    expected: { dmgToA: 0, sdDmgToA: 0.000, dmgToB: 9.083, sdDmgToB: 0.834 },
  },

  // --- Cause Fear (v1.60 fixed behavior) ---
  fearAttackerFixed: {
    desc: 'Cause Fear Attacker (MoM CP 1.60): fix — A fears B normally, no self-fear bug. E[dmgB]=12 (all 4 figs), E[dmgA]=1.5',
    version: V_MOM_CP,
    a: { figs:4, atk:3, toHitMod:70, hp:10, abilities: { fear: true } },
    b: { atk:3, toHitMod:70, hp:20, def:0, res:5 },
    expected: { dmgToA: 1.500, sdDmgToA: 1.500, dmgToB: 12.000, sdDmgToB: 0.000 },
  },
  fearDefenderFixed: {
    desc: 'Cause Fear Defender (MoM CP 1.60): fix — B defending Fear now works, fears A (50%). E[dmgB]=2.5, E[dmgA]=5',
    version: V_MOM_CP,
    a: { atk:5, toHitMod:70, hp:10, res:5 },
    b: { atk:5, toHitMod:70, hp:10, def:0, res:5, abilities: { fear: true } },
    expected: { dmgToA: 5.000, sdDmgToA: 0.000, dmgToB: 2.500, sdDmgToB: 2.500 },
  },
  fearDefenderPenaltyCoM: {
    desc: 'Cause Fear Defender (CoM): B defending Fear works with -3 resistance. A res 5 becomes 2, so only 20% attack → E[dmgB]=1',
    version: V_COM,
    a: { atk:5, toHitMod:70, hp:10, res:5 },
    b: { atk:5, toHitMod:70, hp:10, def:0, res:5, abilities: { fear: true } },
    expected: { dmgToA: 5.000, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 2.000 },
  },
  fearDefenderPenaltyCoM2: {
    desc: 'Cause Fear Defender (CoM2): B defending Fear works with -3 resistance. A res 5 becomes 2, so only 20% attack → E[dmgB]=1',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10, res:5 },
    b: { atk:5, hitChance:70, hp:10, def:0, res:5, abilities: { fear: true } },
    expected: { dmgToA: 5.000, sdDmgToA: 0.000, dmgToB: 1.000, sdDmgToB: 2.000 },
  },
  fearDefenderFixedFirstStrike: {
    desc: 'Cause Fear bilateral + First Strike (MoM CP 1.60): B fears A before FS; A fears B after FS before counter',
    version: V_MOM_CP,
    a: { atk:10, toHitMod:70, hp:10, res:5, abilities: { firstStrike: true, fear: true } },
    b: { atk:10, toHitMod:70, hp:10, def:0, res:5, abilities: { fear: true } },
    expected: { dmgToA: 2.500, sdDmgToA: 4.330, dmgToB: 5.000, sdDmgToB: 5.000 },
  },
});
