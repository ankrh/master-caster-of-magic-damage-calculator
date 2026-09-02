// Numeric presets. Berserk, the Warlord combat enchantments and curses (Blood Lust through
// Blaze of Glory), the Warlord globals granted by city resources and buildings, and Black Channels.
definePresets({
  // --- Berserk ---
  berserkDoublesMelee: {
    desc: 'Berserk doubles melee attack: base 3 atk × 2 = 6, 100% hit vs 0 def → E[dmg]=6.0',
    a: { atk:3, toHitMod:70, hp:10, abilities: { berserk: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  berserkDoublesBeforeHighPrayer: {
    desc: 'Berserk is the last unit-enchantment block (131:0x8F860), so it doubles before the combat-enchantment blocks: atk 3 × 2 = 6, then High Prayer +2 (131:0x902CF) → E[dmg]=8.0 (without Berserk: 5.0)',
    a: { atk:3, toHitMod:70, hp:10, abilities: { berserk: true, highPrayer: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  berserkSetsDefToZero: {
    desc: 'Berserk sets own def to 0: Berserked unit has def=5 but effective def=0 → all atk hits land, E[dmg]=4.0',
    a: { atk:4, toHitMod:70, hp:10 },
    b: { def:5, hp:10, abilities: { berserk: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  berserkIronSkinOverridden: {
    desc: 'Berserk overrides Iron Skin: Iron Skin would give +5 def, but Berserk forces def=0 → all hits land, E[dmg]=4.0',
    a: { atk:4, toHitMod:70, hp:10 },
    b: { def:0, hp:10, abilities: { berserk: true, ironSkin: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'b.ability.ironSkin':
        'Keep, and the absence is the rule under test. Berserk writes an absolute `u.def = 0` (stats_sequence.js:1186) and `c:ironSkin` stands ahead of `c:berserk` in the MoM 1.31 chain (stats_manifests.js:137 and :141), so Iron Skin\'s +5 at combat_abilities.js:964 is overwritten rather than added and cannot reach the block roll. Berserk is the live half. berserkSetsDefToZero is the nearest control at the same 4.0, but not a one-value sibling: it carries b.def 5 in place of the Iron Skin grant.',
    },
  },

  // --- Warlord Berserk: +15% To Hit, -1 armor, no atk doubling, no def-zero ---
  // --- Beat of Swiftness (Warlord) ---
  beatOfSwiftnessArmorPenaltyWarlord: {
    desc: 'Beat of Swiftness: def 10 loses round-to-even(10/10)=1, leaving 9. atk 10 @100% hit, 100% block → 10−9=1 dmg (without it: 10−10=0)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:10, toBlkMod:70, hp:20, abilities: { beatOfSwiftness: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },
  berserkWarlordPlus15ToHit: {
    desc: 'Warlord Berserk grants +15% To Hit, no atk doubling: 4 atk @ 30%+15%=45% vs def=0 → E[dmg]=1.8',
    version: V_WARLORD,
    a: { atk:4, hp:10, abilities: { berserkWarlord: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 1.800 },
  },
  berserkWarlordArmorPenalty: {
    desc: 'Warlord Berserk on defender: -1 armor and no To Block penalty (UnitCalcPre.CAS!NOTCOMBATOUTLANDER!+2..+11 ": new unit enchantment" "!NOBERSERK!", which replaced the -10% To Defend the block carried in UnitCalc.CAS before 1.5.12.8). def 10 becomes 9; atk 10 @100% hit vs 100% block → 10-9=1.0 (without it: 10-10=0). A surviving -10% To Block would move this off 1.0, so the preset pins the removal as well as the armor loss.',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10 },
    b: { def:10, toBlkMod:70, hp:20, abilities: { berserkWarlord: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
  },

  // --- Conjuring Pact nausea (Warlord) ---
  nauseaMinus10ToHit: {
    desc: 'Nausea on attacker: -10% To Hit. atk=10 @ 100%-10%=90% hit vs def=0 → E[dmg]=9.0 (without it: 10.0)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { nausea: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 9.000 },
  },
  nauseaMinus10ToDefend: {
    desc: 'Nausea on defender: -10% To Defend. atk=1 @100% hit; def=1 @ 100%-10%=90% block → E[dmg]=0.1 (without it: 0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:20, abilities: { nausea: true } },
    expected: { dmgToA: 0, dmgToB: 0.100 },
  },
  nauseaReadsIdentityAtItsOwnBlockWarlord: {
    desc: 'The branch is `IF FANTASTIC(U)` at UnitCalcPre.CAS!NOBERSERK!+5 "IF FANTASTIC(U) THEN {", read where that block stands. Region b runs before region c, so Raise Dead — a region-c conversion — has not made the defender fantastic yet, and the ELSE arm still applies: def=1 at 100%-10% = 90% block against atk=1 at 100% hit gives 0.1, the same as the sibling nauseaMinus10ToDefend. Reading the record the recalculation leaves instead saw a fantastic creature, took the creature-binding arm and left 0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:20, abilities: { nausea: true, raiseDead: true } },
    expected: { dmgToA: 0, dmgToB: 0.100 },
  },
  nauseaSpiritLinkTakesFantasticArmWarlord: {
    desc: 'Spirit Link asserts Fantastic at UnitCalcPre.CAS!NOSPIRITLINK!-11 "SETSTAT(U,AFantastic,0,1);", ahead of the Conjuring Pact branch at UnitCalcPre.CAS!NOBERSERK!+5 "IF FANTASTIC(U) THEN {" in the same file, so the defender is fantastic where that branch reads it and takes the creature-binding arm instead of the -10% To Defend: def=1 blocks at a full 100% and takes 0, against the 0.1 of the sibling nauseaMinus10ToDefend. Only the region-d clear was modelled before, so the ELSE arm applied.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:20, abilities: { nausea: true, spiritLink: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'b.ability.nausea':
        'Keep, and the absence is the rule under test. `b:spiritLink` stands ahead of `b:nausea` in the Warlord chain (stats_manifests.js:260 and :267), so the defender is already Fantastic in the record `b:nausea`\'s own gate reads — `!u.fantastic` at stats_sequence.js:502 — and the -10% To Hit / To Defend never lands. nauseaMinus10ToDefend differs only in b.abilities.spiritLink and pins 0.100 against this 0; Spirit Link is the live half.',
    },
  },

  nauseaReachesHeroWarlord: {
    desc: 'The branch is `IF FANTASTIC(U)` at UnitCalcPre.CAS!NOBERSERK!+5 "IF FANTASTIC(U) THEN {" and the -10% To Hit / To Defend pair is its ELSE arm, which the block hands to every unit it does not send to creature binding — a hero included, there being no hero test anywhere in the block. So a hero defender takes the penalty exactly as a normal one does: def=1 at 100%-10% = 90% block against atk=1 at 100% hit gives 0.1, the same as the sibling nauseaMinus10ToDefend. The gate used to read isNormalUnitType(unitTypeAt(u)), which is false for `hero` as well as for Fantastic, and left 0 (F175).',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10 },
    b: { def:1, toBlkMod:70, hp:20, unitType:'hero', abilities: { nausea: true } },
    expected: { dmgToA: 0, dmgToB: 0.100 },
    vacuity: {
      'b.unitType=hero':
        'Keep, and the inertness is the claim: the sweep ablates unitType to \'normal\' (UNIT_FIELD_DEFAULTS, tools/preset_vacuity_sweep.js:204), and \'normal\' is precisely the identity a hero is asserted to answer alike. The ELSE arm of `IF FANTASTIC(U)` (UnitCalcPre.CAS!NOBERSERK!+5 "IF FANTASTIC(U) THEN {") carries no hero test, so the gate is `!u.fantastic` (stats_sequence.js:502) and admits both; no ablation between the two can move a number. b.ability.nausea is the live half, and nauseaMinus10ToDefend pins the same 0.100 on the normal identity.',
    },
  },

  // --- Magic Immunity curse gating ---
  // Magic Immunity (and, for Mind Storm, Illusion Immunity) hard-blocks these
  // magic-based curses: the gated attacker keeps its full strength / to-hit.
  // Each test diverges from the ungated result, so removing the gate fails it.
  magicImmunityGatesWeakness: {
    desc: 'Magic Immunity blocks Weakness: melee stays 10 (ungated −3 → 7). 100% hit vs def 0 → 10',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { magicImmunity: true, weakness: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.weakness':
        'Keep, and the absence is the rule under test. `weakness` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` clears the flag at the head of the chain (stats_identity.js:644-651) and the curse the fixture configures is gone before any step could read it. Magic Immunity is the live half — ablating it lets Weakness land and the melee falls to 7.',
    },
  },
  magicImmunityGatesBlackSleep: {
    desc: 'Magic Immunity blocks Black Sleep: defender rolls normally (ungated = max damage). atk 10 @ 30% hit vs def 0 → 3.0 (ungated 10)',
    version: V_COM2,
    a: { atk:10, hp:10 },
    b: { def:0, hp:20, abilities: { magicImmunity: true, blackSleep: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'b.ability.blackSleep':
        'Keep, and the absence is the rule under test. `blackSleep` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` clears the flag at the head of the chain (stats_identity.js:644-651) and the defender rolls normally instead of taking doom-style assigned damage. Magic Immunity is the live half. version-dead is literally true and uninformative: this is the only preset in Calculator/presets_*.js that runs blackSleep at com2_1.05.11 — the eight in presets_curses_and_undead.js all sit under TEST_TREE\'s mom_1.31 group (test_tree.js:8, :14) — so CoM2\'s positive Black Sleep behaviour is unasserted.',
    },
  },
  magicImmunityGatesShatter: {
    desc: 'Magic Immunity blocks Shatter: melee stays 10 (ungated → 1). 100% hit vs def 0 → 10',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { magicImmunity: true, shatter: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.shatter':
        'Keep, and the absence is the rule under test. `shatter` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` clears the flag at the head of the chain (stats_identity.js:644-651) and the melee is never capped at 1. Magic Immunity is the live half. version-dead is literally true and uninformative: this is the only preset in Calculator/presets_*.js that runs shatter at com2_1.05.11 — the one other, shatterBeforeSupremeLightCoM, is com_6.08 — so CoM2\'s positive Shatter behaviour is unasserted.',
    },
  },
  magicImmunityGatesVertigo: {
    desc: 'Magic Immunity blocks Vertigo: To Hit stays 100% (ungated −25% → 75%). atk 10 vs def 0 → 10 (ungated 7.5)',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { magicImmunity: true, vertigo: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.vertigo':
        'Keep, and the absence is the rule under test. `vertigo` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` clears the flag at the head of the chain (stats_identity.js:644-651) and the -25% To Hit never lands. Magic Immunity is the live half — ablating it drops the hit chance to 75% and the total to 7.5.',
    },
  },
  magicImmunityGatesWarpAttack: {
    desc: 'Magic Immunity blocks Warp Creature (attack): melee stays 10 (ungated halved → 5). 100% hit vs def 0 → 10',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { magicImmunity: true, warpAttack: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.warpAttack':
        'Keep, and the absence is the rule under test. `warpAttack` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` clears the flag at the head of the chain (stats_identity.js:644-651) and the melee halving never runs. Magic Immunity is the live half — ablating it halves the melee to 5.',
    },
  },
  magicImmunityGatesMindStorm: {
    desc: 'Magic Immunity blocks Mind Storm: melee stays 10 (ungated −3 → 7). 100% hit vs def 0 → 10',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { magicImmunity: true, mindStorm: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.mindStorm':
        'Keep, and the absence is the rule under test. `mindStorm` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` clears the flag at the head of the chain (stats_identity.js:644-651) and the -3 melee never lands. Magic Immunity is the live half — ablating it drops the melee to 7. illusionImmunityGatesMindStorm is the Illusion arm of the same strip, reached through the separate ILLUSION_IMMUNITY_GATED_CURSES list at stats_identity.js:630.',
    },
  },
  illusionImmunityGatesMindStorm: {
    desc: 'Illusion Immunity blocks Mind Storm: melee stays 10 (ungated −3 → 7). 100% hit vs def 0 → 10',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { illusionImmunity: true, mindStorm: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.mindStorm':
        'Keep, and the absence is the rule under test. `mindStorm` is one of the two members of ILLUSION_IMMUNITY_GATED_CURSES (stats_identity.js:630), which `immunityStrippedCurses` unions in whenever `illusionImmunity`, `trueSight` or Warlord\'s Eye of Heaven is present (stats_identity.js:656-662). The set it reads is the finished one: `immunityCurseGatingStep` passes `finishedImmunities` into both the gate and the write (stats_identity.js:647 and :649), and the comment at :655 states that split. So `immunity:immunityCurseGating` clears the flag and the -3 melee never lands. Illusion Immunity is the live half — ablating it drops the melee to 7.',
    },
  },
  illusionImmunityGatesVertigo: {
    desc: 'Illusion Immunity blocks Vertigo: To Hit stays 100% (ungated −25% → 75%). atk 10 vs def 0 → 10 (ungated 7.5)',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { illusionImmunity: true, vertigo: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.vertigo':
        'Keep, and the absence is the rule under test. `vertigo` is the other member of ILLUSION_IMMUNITY_GATED_CURSES (stats_identity.js:630), so `immunity:immunityCurseGating` clears the flag through the Illusion arm at stats_identity.js:658-661 and the -25% To Hit never lands. Illusion Immunity is the live half — ablating it drops the hit chance to 75% and the total to 7.5.',
    },
  },
  magicImmunityGatesNausea: {
    desc: 'Magic Immunity blocks Nausea: To Hit stays 100% (ungated −10% → 90%). atk 10 vs def 0 → 10 (ungated 9)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { magicImmunity: true, nausea: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.nausea':
        'Keep, and the absence is the rule under test. `nausea` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` clears the flag at the head of the chain (stats_identity.js:644-651) and `b:nausea`\'s -10% To Hit (stats_sequence.js:500-503) never fires. Magic Immunity is the live half — ablating it drops the hit chance to 90% and the total to 9. This is the one member whose gating is inferred rather than read: the comment at stats_identity.js:609-611 records that nausea is a UnitCalcPre.CAS effect with no spells.ini record, so no `NonMagic` flag decides it.',
    },
  },
  magicImmunityGatesTemporalTwist: {
    desc: 'Magic Immunity blocks Temporal Twist: First Strike preserved, so A kills B before retaliation (ungated dmgToA=5)',
    version: V_WARLORD,
    a: { atk:10, hitChance:70, hp:10, abilities: { magicImmunity: true, firstStrike: true, temporalTwist: true } },
    b: { atk:5, hitChance:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.temporalTwist':
        'Keep, and the absence is the rule under test. `temporalTwist` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` clears the flag at the head of the chain (stats_identity.js:644-651) and `applyTemporalTwistEffects` then finds nothing to act on (combat_effects.js:188-195), leaving First Strike in place. Magic Immunity is the live half — ablating it lets the strip delete firstStrike and B retaliates for dmgToA 5.',
    },
  },
  // The corpus was blind to the grant/strip combination: every fixture above states its immunity
  // directly, so none of them says what happens when the immunity is *granted* during the
  // derivation. These two do, one per grant that reaches the strip's own gates (F199).
  sanctaBasilicaMagicImmunityStripsWeaknessWarlord: {
    desc: 'The Magic Immunity that gates the curse strip can be a grant rather than an input: Sancta Basilica gives a High Men Paladin Magic Immunity (CreateUnit.CAS!NOFROSTCLUB!+2..+31 ": new effect of Sancta Basilica :" "!NOBASILICA!"), and `immunity:immunityCurseGating` reads the immunity set the recalculation leaves, so Weakness is stripped whatever position the grant takes. Melee 6 at 100% hit against Armor 0 is 6.0, the undiminished attack: the stated Weakness never reaches it, and that inertness is what the fixture asserts. Sancta Basilica is the half that moves the number — drop it and Weakness lands for melee 6−3 and 3.0.',
    version: V_WARLORD,
    a: { figs:1, atk:6, hitChance:70, hp:10, race:'High Men', name:'Paladins',
      abilities: { sanctaBasilica: true, weakness: true } },
    b: { def:0, toBlkMod:70, hp:60 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'a.ability.weakness':
        'Keep, and the absence is the rule under test. `weakness` is a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), and `immunityStrippedCurses` takes its immunity half from `finishedImmunities` — the set the recalculation leaves — rather than from the record at the step\'s own rank (stats_identity.js:644-651, :656-662), so a granted Magic Immunity strips the curse just as an input one does. That the curse is gone by the time anything reads it is the assertion; Sancta Basilica is the live half, at melee 6 against the ungated 3.',
    },
  },
  marionetteIllusionImmunityStripsMindStormWarlord: {
    desc: 'The Illusion Immunity arm of the same gate, also as a grant: a Channeler-owned Marionette with three Life books receives Illusion Immunity from the book package, and the strip reads the finished immunity set, so Mind Storm never lands. The Wanderer keeps melee 5 at its roster 40% To Hit for 2.0, the undiminished attack: the stated Mind Storm never reaches it, and that inertness is what the fixture asserts. The Life-book grant is the half that moves the number — drop it and Mind Storm lands for melee 5−3 and 0.8.',
    version: V_WARLORD,
    aUnitName: 'Wanderer',
    a: { abilities: { channeler: true, marionetteBaseSkill: 0, marionettePrimary: 'life',
      marionetteLifeBooks: 3, mindStorm: true } },
    b: { def:0, toBlkMod:70, hp:60 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.ability.mindStorm':
        'Keep, and the absence is the rule under test. `mindStorm` is a member of ILLUSION_IMMUNITY_GATED_CURSES (stats_identity.js:630) and `immunityCurseGatingStep` passes `finishedImmunities` — the set the recalculation leaves — into both the gate and the write rather than reading the record at its own rank (stats_identity.js:644-651, with the split stated in the comment at :655 and the union logic at :656-662), so an Illusion Immunity arriving from the Marionette book package strips the curse exactly as a stated one would. That the curse never lands is the assertion; the grant chain is the live half, at melee 5 against the ungated 2.',
    },
  },
  blackPrayerBypassesMagicImmunity: {
    desc: 'Black Prayer is NOT gated by Magic Immunity (on the MoM bypass list): melee 10 still −1 → 9 vs def 0 at 100% hit',
    version: V_COM2,
    a: { atk:10, hitChance:70, hp:10, abilities: { magicImmunity: true, blackPrayer: true } },
    b: { def:0, hp:20 },
    expected: { dmgToA: 0, dmgToB: 9.000 },
    vacuity: {
      'a.ability.magicImmunity':
        'Keep, and the absence is the rule under test. `blackPrayer` is deliberately not a member of MAGIC_IMMUNITY_GATED_CURSES (stats_identity.js:626-629), so `immunity:immunityCurseGating` has nothing to clear and the immunity moves no number. The comment above the list gives the mechanism (stats_identity.js:616-625): Black Prayer is a combat global gated on a side-indexed global rather than a flag on the unit, so no per-unit resistance roll is ever made for the immunity to close. Black Prayer is the live half at melee 10 -> 9.',
    },
  },

  // --- Blood Lust ---
  bloodLustDoublesVsNormalCoM: {
    desc: 'Blood Lust doubles melee vs normal units in CoM: 3 atk → 6, 100% hit vs 0 def → 6.0',
    version: V_COM,
    a: { atk:3, toHitMod:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { hp:10, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  bloodLustHeroTargetCoM2: {
    desc: 'Blood Lust treats heroes as normal targets in CoM2: 3 atk → 6 vs hero → 6.0',
    version: V_COM2,
    a: { atk:3, hitChance:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { hp:10, unitType:'hero' },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'b.unitType=hero':
        'Keep, and the absence is the rule under test. The sweep ablates unitType to \'normal\' (UNIT_FIELD_DEFAULTS, tools/preset_vacuity_sweep.js:204), which is the claim itself: `bloodLustMeleeAttack` tests `isNormalUnitType(defUnit.unitType) || defUnit.unitType === \'hero\'` (combat_effects.js:356-357), so hero and normal are meant to answer alike and no ablation can separate them. The arm is still load-bearing — `isNormalUnitType` excludes heroes (combat_abilities.js:373-376), so dropping the `=== \'hero\'` half turns this 6.000 into 3.000. Blood Lust is the live half.',
    },
  },
  bloodLustDoublesThrownCoM2: {
    desc: 'Blood Lust (CoM2): Thrown 3 doubles to 6 vs a normal 6-HP target and kills it before melee. Without the Thrown doubling, Thrown 3 + doubled melee 2 would deal only 5',
    version: V_COM2,
    a: { atk:1, hitChance:70, modernAttacks: { thrown: { strength:3, type:'thrown' } }, hp:10, abilities: { bloodLust: true } },
    b: { def:0, toBlkMod:70, hp:6, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  bloodLustDoesNotDoubleFireBreathCoM2: {
    desc: 'Blood Lust (CoM2): Fire Breath 3 remains 3 against a normal target; only melee and Thrown enter the doubling block',
    version: V_COM2,
    a: { atk:0, modernAttacks: { fireBreath: { strength:3, type:'fire' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { bloodLust: true } },
    b: { def:0, toBlkMod:70, hp:10, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Blood Lust does not reach the breath channel, so the only feature the fixture adds cannot move the breath 3.',
      'a.ability.bloodLust':
        'Keep, and the absence is the rule under test. The doubling is applied per pre-melee channel and only where `channel.key === \'thrown\'` (combat.js:675-677); Fire Breath rides its own channel and keeps `channel.strength` untouched, so Blood Lust has no breath effect to remove. bloodLustDoublesThrownCoM2 runs the same version and ability with a thrown channel and pins the doubling at 6.000, though it is not a one-value sibling — it differs in a.atk, the channel, the To Hit fields and b.hp.',
    },
  },
  bloodLustThrownCoM1MeleeOnly: {
    desc: 'CoM 1 Blood Lust remains melee-only: melee 1 doubles to 2 while Thrown 3 stays 3, for 5 total damage',
    version: V_COM,
    a: { atk:1, rtbType:'thrown', rtb:3, toHitMod:70, toHitRtbMod:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { def:0, hp:20, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  bloodLustThrownCoM2: {
    desc: 'CoM2 Blood Lust doubles melee 1 and Thrown 3 against a non-Fantastic target, for 8 total damage',
    version: V_COM2,
    a: { atk:1, modernAttacks: { thrown: { strength:3, type:'thrown' } }, hitChance:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { def:0, hp:20, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  bloodLustThrownFantasticTargetCoM2: {
    desc: 'CoM2 Blood Lust does not double melee 1 or Thrown 3 against a Fantastic target, for 4 total damage',
    version: V_COM2,
    a: { atk:1, modernAttacks: { thrown: { strength:3, type:'thrown' } }, hitChance:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { def:0, hp:20, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 4.000 },
    vacuity: {
      'a.ability.bloodLust':
        'Keep, and the absence is the rule under test. `targetIsNormal` is false for a fantastic defender (combat_effects.js:356-358), so `bloodLustMeleeAttack` returns the strength unchanged on both the melee and the thrown call and Blood Lust has nothing to remove. bloodLustThrownCoM2 differs only in b.unitType and pins 8.000 against this 4.000; b.unitType is the live half.',
    },
  },
  bloodLustThrownWarlord: {
    desc: 'Warlord Blood Lust doubles melee 1 and Thrown 3 against a non-Fantastic target, for 8 total damage',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { thrown: { strength:3, type:'thrown' } }, hitChance:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { def:0, hp:20, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  bloodLustLightningBreathUndoubledWarlord: {
    desc: 'Warlord Blood Lust leaves Lightning Breath undoubled: breath 3 + doubled melee 1 to 2 = 5.0',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { lightningBreath: { strength:3, type:'lightning' } }, hitChance:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { hp:10, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  bloodLustPhysicalRangedUndoubledCoM2: {
    desc: 'CoM2 Blood Lust leaves physical ranged undoubled: missile 3 = 3.0',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:3, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { hp:10, unitType:'normal' },
    rangedCheck: true,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Blood Lust does not reach the conventional ranged channel, so the only feature the fixture adds cannot move the missile 3.',
      'a.ability.bloodLust':
        'Keep, and the absence is the rule under test. `bloodLustMeleeAttack` has three call sites in Calculator/: the melee pair at combat.js:28-29, and the pre-melee channel loop at combat.js:676, which reaches it only where `channel.key === \'thrown\'` (combat.js:675). The conventional ranged phase calls none of them, so Blood Lust has no ranged strength to double and nothing to remove. bloodLustMagicalRangedUndoubledWarlord makes the same claim at the other modern engine; it is not a one-value sibling, differing in `version` and in the ranged `type`.',
    },
  },
  bloodLustMagicalRangedUndoubledWarlord: {
    desc: 'Warlord Blood Lust leaves magical ranged undoubled: a magical shot of 3 stays 3.0 where the doubling would make it 6.0. The attack type token is the modern `magic` — the spelled-out magic_sorcery this preset used before is in no type list, so the unit had no attack at all and the preset could never fail.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:3, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { hp:10, unitType:'normal' },
    rangedCheck: true,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Warlord Blood Lust does not reach the conventional ranged channel, so the only feature the fixture adds cannot move the magical shot of 3.',
      'a.ability.bloodLust':
        'Keep, and the absence is the rule under test. `bloodLustMeleeAttack` has three call sites in Calculator/: the melee pair at combat.js:28-29, and the pre-melee channel loop at combat.js:676, which reaches it only where `channel.key === \'thrown\'` (combat.js:675). The conventional ranged phase calls none of them, and the version scope is not what withholds the doubling here — `resolution:bloodLustMeleeAttack` is SCOPE_COM_PLUS (steps.js:380), so Warlord is inside it. bloodLustPhysicalRangedUndoubledCoM2 makes the same claim at CoM2; it is not a one-value sibling, differing in `version` and in the ranged `type`.',
    },
  },
  bloodLustDoomGazeUndoubledCoM2: {
    desc: 'CoM2 Blood Lust leaves Doom Gaze undoubled: gaze 3 + doubled melee 1 to 2 = 5.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, unitType:'normal', abilities: { bloodLust: true, doomGaze: 3 } },
    b: { hp:10, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  bloodLustNoDoubleVsFantasticCoM: {
    desc: 'Blood Lust does not double against fantastic units: 3 atk stays 3 vs fantastic target → 3.0',
    version: V_COM,
    a: { atk:3, toHitMod:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { hp:10, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'a.ability.bloodLust':
        'Keep, and the absence is the rule under test. `targetIsNormal` is false for a fantastic defender, so `bloodLustMeleeAttack` returns the strength unchanged (combat_effects.js:356-358) and Blood Lust has nothing to remove. bloodLustDoublesVsNormalCoM differs only in b.unitType and pins 6.000 against this 3.000; b.unitType is the live half.',
    },
  },
  bloodLustFantasticBecomesDeathRealmCoM2: {
    desc: 'Blood Lust converts a fantastic_chaos unit into Death realm in CoM2: Darkness gives +1 atk to Death units, so atk 1 → 2, doubled to 4 vs normal → 4.0',
    version: V_COM2,
    darkness: true,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_chaos', abilities: { bloodLust: true } },
    b: { hp:10, unitType:'normal' },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  bloodLustBypassesWeaponImmunityCoM2: {
    desc: 'Blood Lust makes a normal attacker undead/Fantastic before CoM2 derives EncMagic, so Weapon Immunity is bypassed; the normal target still takes doubled melee: 5 atk → 10 vs def 2 → 9.4',
    version: V_COM2,
    a: { atk:5, hitChance:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { def:2, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 9.400 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test. `c:bloodLust` writes `u.fantastic = true` (stats_identity.js:357) and stands ahead of `c:chaosSurge` in the CoM2 chain (stats_manifests.js:220 and :223), so the Fantastic arm of EncMagic, which is read off the record at that rank, is set (stats.js:2167-2168). `modernAttackIsMagic` then answers true (combat_special_attacks.js:585), the melee eligibility `wi(false)` is false (combat_effects.js:646-647 and :656), and `effectiveDefense:weaponImmunity` never adds its bonus (combat_effects.js:474, amount at :499). The defender\'s Weapon Immunity therefore has no defense to contribute. bloodLustDoesNotBypassWeaponImmunityWarlord differs only in `version` and pins 6.400 against this 9.400; Blood Lust is the live half.',
    },
  },
  bloodLustVulnerableToExorciseCoM2: {
    desc: 'Blood Lust makes a normal unit a created-undead fantastic Death unit in CoM2, so Exorcise can target it: −6 plus the created-undead −3 leaves res 12 at effective 3, so pFail=0.7 and 1 attacking figure vs a 2-figure target gives E[banish]=7 plus 1 physical → 8.0',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: -6 } },
    b: { figs:2, def:0, res:12, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  bloodLustNotUndeadWarlord: {
    desc: 'Warlord: Bloodlust no longer turns the unit undead, so it stays non-fantastic and Exorcise cannot target it. Same setup as the CoM2 pair (1 fig Exorcise −6 vs 2-fig res 12 normal w/ bloodLust); only the 1 physical melee hit lands → 1.0',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: -6 } },
    b: { figs:2, def:0, res:12, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    expected: { dmgToA: 0, dmgToB: 1.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that neither half can act. Warlord Blood Lust leaves the defender a normal unit, so the Exorcise the attacker carries has no fantastic target, and the 1.000 is the bare melee hit that remains.',
      'b.ability.bloodLust':
        'Keep, and the absence is the rule under test. `c:bloodLust` is scoped SCOPE_COM1_COM2 (steps.js:198, the scope itself at steps.js:97), so it appears only in the CoM 1 and CoM2 chains (stats_manifests.js:188 and :220) and never runs here; `applyBloodLustEffects` likewise returns the unit untouched on a Warlord version before it can add the `undead` flag (combat_effects.js:208). The defender stays non-fantastic and `exorciseFailProb` returns 0 on its unit-type gate (combat_special_attacks.js:121). bloodLustVulnerableToExorciseCoM2 differs only in `version` and pins 8.000 against this 1.000.',
    },
  },
  bloodLustDoesNotBypassWeaponImmunityWarlord: {
    desc: 'Warlord: Bloodlust attacker stays normal, so Weapon Immunity DOES apply (+10 def). atk 5 doubled to 10 vs effective def 12 (2+10), 100% hit, 30% block → 10 - 12*0.3 = 6.4',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, unitType:'normal', abilities: { bloodLust: true } },
    b: { def:2, hp:10, abilities: { weaponImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 6.400 },
  },

  // --- Bloodsucker (Warlord) ---
  // Per-phase trigger: if base attack deals ≥1 dmg through armor, +2 dmg / +2 heal.
  // Cap: 1 trigger per phase regardless of attacker figure count.
  bloodsuckerBasicMeleeWarlord: {
    desc: 'Bloodsucker melee: 1 fig atk 5, 100% hit vs def 0 → 5 base + 2 BS = 7.0',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { bloodSucker: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact. The fixture\'s one candidate is the `bloodSucker` ability, whose terms are its key and its label \'Blood Sucker\' (tools/preset_vacuity_sweep.js:260; abilities.js:59); both tokenise to \'blood sucker\', while the preset key tokenises to \'bloodsucker basic melee warlord\', where the ability is one unsplittable token, so `containsRun` cannot match it (tools/preset_vacuity_sweep.js:40-47 and :49-59, read at :428). The candidate itself is live: the block adds its 2 to any outcome whose damage is above zero (combat_fear_and_touch.js:243-244, :247, :252).',
    },
  },
  bloodsuckerMultiFigCapWarlord: {
    desc: 'Bloodsucker cap: 4 figs each atk 1 (100% hit, def 0) = 4 base dmg, +2 BS once (not 4×2). Total 6.0.',
    version: V_WARLORD,
    a: { figs:4, atk:1, hitChance:70, hp:3, abilities: { bloodSucker: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact: `containsRun` looks for \'blood sucker\', the tokens of both terms the one candidate offers (tools/preset_vacuity_sweep.js:260; label at abilities.js:59), and the key tokenises to \'bloodsucker multi fig cap warlord\', in which the ability is one unsplittable token (tools/preset_vacuity_sweep.js:40-47, :49-59, :428). The candidate is live, and the fixture pins the once-per-call rule: the block maps over the finished outcome list of a single ApplyAttack (combat_fear_and_touch.js:245-257), so four attacking figures still add 2 once rather than 4x2. bloodsuckerBasicMeleeWarlord is the one-figure control at the same 2, differing in a.figs, a.atk and a.hp.',
    },
  },
  bloodsuckerArmorBlocksAllNoTriggerWarlord: {
    desc: 'Bloodsucker requires ≥1 dmg through armor: 1 fig atk 1 (100% hit) vs def 5 (100% block) → 0 base dmg, no trigger. Total 0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { bloodSucker: true } },
    b: { def:5, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the trigger guard `if (outcome.damage <= 0) return outcome;` (combat_fear_and_touch.js:247) is the assertion itself, so with the armor blocking every point the one feature the fixture adds cannot move the zero.',
      'name-binds-nothing':
        'Keep, and the absence is the rule under test. A tokenisation artefact as well: `containsRun` looks for \'blood sucker\', the tokens of both terms the one candidate offers (tools/preset_vacuity_sweep.js:260; label at abilities.js:59), and the key tokenises to \'bloodsucker armor blocks all no trigger warlord\', where the ability is one unsplittable token (tools/preset_vacuity_sweep.js:40-47, :49-59, :428). bloodsuckerBasicMeleeWarlord is the positive arm at 7.000; it differs in a.atk, b.def and b.hp.',
    },
  },
  bloodsuckerThrownMeleeDoubleTriggerWarlord: {
    desc: 'Bloodsucker fires per phase: 1 fig thrown 1 + melee 1 (both 100% hit, def 0) → thrown 1+2 + melee 1+2 = 6.0.',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hitChance:70, hp:10, abilities: { bloodSucker: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact: `containsRun` looks for \'blood sucker\', the tokens of both terms the one candidate offers (tools/preset_vacuity_sweep.js:260; label at abilities.js:59), and the key tokenises to \'bloodsucker thrown melee double trigger warlord\', in which the ability is one unsplittable token (tools/preset_vacuity_sweep.js:40-47, :49-59, :428). The candidate is live, and the fixture pins the per-phase multiplicity: the Thrown phase and the melee phase each pass the flag into their own touch call (combat_phases.js:582 in buildThrownPhase and :655 in buildMeleePhase), so the 2 is added twice.',
    },
  },
  bloodsuckerHasteDoublesWarlord: {
    desc: 'Bloodsucker with Haste: each of two melee strikes is a separate trigger. 1 fig atk 1, def 0, hasted: (1+2) + (1+2) = 6.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { bloodSucker: true, haste: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  bloodsuckerRangedWarlord: {
    desc: 'Bloodsucker fires on ranged: 1 fig missile 1 (100% hit, def 0) → 1+2 = 3.0.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { bloodSucker: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact: `containsRun` looks for \'blood sucker\', the tokens of both terms the one candidate offers (tools/preset_vacuity_sweep.js:260; label at abilities.js:59), and the key tokenises to \'bloodsucker ranged warlord\', in which the ability is one unsplittable token (tools/preset_vacuity_sweep.js:40-47, :49-59, :428). The candidate is live, and the fixture pins the ranged channel: the ranged touch spec carries the flag at combat.js:1204, so the 2 lands on a missile shot as well as in melee.',
    },
  },
  bloodsuckerCapAtRemHPWarlord: {
    desc: 'Bloodsucker +2 is added after the attack, uncapped inside the phase: atk 5 vs hp 6 (no figs lost) → base 5 + BS 2 = 7, which the phase publishes clipped at the target\'s remaining 6.',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { bloodSucker: true } },
    b: { def:0, toBlkMod:70, hp:6 },
    expected: { dmgToA: 0, dmgToB: 6 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact: `containsRun` looks for \'blood sucker\', the tokens of both terms the one candidate offers (tools/preset_vacuity_sweep.js:260; label at abilities.js:59), and the key tokenises to \'bloodsucker cap at rem hp warlord\', in which the ability is one unsplittable token (tools/preset_vacuity_sweep.js:40-47, :49-59, :428). The candidate is live, and the fixture pins where the clamp is: the block adds its damage as `outcome.damage + bloodsucker.damage`, so 5 + 2 is 7 inside the phase, clipped when the phase publishes it to the target\'s remaining 6.',
    },
  },
  bloodsuckerCounterAttackWarlord: {
    desc: 'Bloodsucker fires on counter-attack: defender (BS) counters with atk 3 → 3 base + 2 BS = 5 to attacker. Attacker atk 1 deals 1 to defender (no BS).',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, def:0, toBlkMod:70 },
    b: { atk:3, hitChance:70, def:0, toBlkMod:70, hp:20, abilities: { bloodSucker: true } },
    expected: { dmgToA: 5.000, dmgToB: 1.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact: `containsRun` looks for \'blood sucker\', the tokens of both terms the one candidate offers (tools/preset_vacuity_sweep.js:260; label at abilities.js:59), and the key tokenises to \'bloodsucker counter attack warlord\', in which the ability is one unsplittable token (tools/preset_vacuity_sweep.js:40-47, :49-59, :428). The candidate is live, and the fixture pins the side: buildCounterPhase reads the defender\'s own flag (combat_phases.js:721), so the 2 rides B\'s counterattack for dmgToA 5.000 while A\'s melee, which carries no Blood Sucker, stays at dmgToB 1.000.',
    },
  },

  // --- Vampirism (Warlord enchantment: grants undead + Blood Sucker, thrown/breath → melee) ---
  vampirismGrantsBloodSuckerWarlord: {
    desc: 'Vampirism grants Blood Sucker: 1 fig atk 5, 100% hit vs def 0 → 5 base + 2 BS = 7.0. (Without the granted BS it would be 5.0.)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { vampirism: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  vampirismGrantsUndeadImmunityWarlord: {
    desc: 'Vampirism makes defender undead → Life Steal immune. Atk 1 (100% blocked by def 1) + attacker Life Steal -3 vs res 5 → 0 (immune). Without undead it would be 3.6.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { lifeSteal: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { vampirism: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  vampirismThrownToMeleeTransferWarlord: {
    desc: 'Vampirism script transfer: thrown 5, melee 2 vs def 2 (100% hit/block). Melee becomes 2+trunc(5/2)=4 → 2 through +2 Blood Sucker = 4; thrown drops to 1 → 0. Total 4.0. Without transfer: thrown 5→3 +2 Blood Sucker = 5, melee 2→0 = 5.0.',
    version: V_WARLORD,
    a: { atk:2, modernAttacks: { thrown: { strength:5, type:'thrown' } }, hitChance:70, hp:10, abilities: { vampirism: true } },
    b: { def:2, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  // --- Revenant (Warlord enchantment: grants undead + melee Death Touch 0) ---
  revenantGrantsDeathTouchWarlord: {
    desc: 'Revenant grants Death Touch 0: atk 1 (100% blocked by def 1) + granted Death Touch 0 vs Res 5 — pFail (10−5)/10 = 0.5, E[dmg] = 0.5 × 10 = 5.0. Without Revenant it would be 0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { revenant: true } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  revenantDeathTouchOnThrownWarlord: {
    desc: 'Revenant writes Death Touch 0 to melee flags, which Caster.exe also uses for Thrown: thrown 1 is fully '
        + 'blocked by def 1, and the Thrown call and the unconditional melee call each make one Death 0 attempt '
        + 'vs Res 5, so 1 - 0.5^2 = 0.75 x 10 hp = 7.5. Without the Thrown record sharing only melee would roll, '
        + 'for 5.0.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { thrown: { strength:1, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { revenant: true } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 7.500 },
  },
  revenantDeathTouchNotRangedWarlord: {
    desc: 'Revenant clears the general/ranged Death Touch records: magic 1 fully blocked by def 1 and the melee-only Death Touch does not join the ranged attack → 0.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { revenant: true } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 0.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that the melee-only Death Touch does not join a ranged attack, and the magic 1 is fully blocked by def 1, so the one feature the fixture adds cannot move the zero.',
      'a.ability.revenant':
        'Keep, and the absence is the rule under test. Revenant\'s placement deletes the general and ranged copies of the flag and writes it to the melee record alone (combat_effects.js:288-290). A ranged phase asks for the \'ranged\' record (combat_phases.js:60), `placedTouchValue` finds neither a global nor a ranged entry and returns null (combat_phases.js:29), and `touchParams` then leaves `deathTouchFail` at 0 on its `deathTouch != null` guard (combat_phases.js:83). revenantDeathTouchOnThrownWarlord is the positive arm at 7.500, where Warlord Thrown is redirected to the melee record (combat_phases.js:61); it is not a one-value sibling, differing in a.atk, in the channel, and in the rangedCheck/rangedDist pair.',
    },
  },
  revenantOverwritesStrongerDeathTouchWarlord: {
    desc: 'Revenant unconditionally replaces intrinsic Death Touch -3 with melee Death Touch 0: fully blocked melee averages 5.0, not the intrinsic 8.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { revenant: true, deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'a.ability.deathTouch':
        'Keep, and the absence is the rule under test. `applyRevenantEffects` writes `deathTouch: 0` over the ability map unconditionally (combat_effects.js:239), and the placement then deletes the general copy the intrinsic -3 would have been written to and sets the melee record to 0 (combat_effects.js:282, :288, :290), so the -3 can never reach `touchParams`. That the ablation changes nothing is the assertion: revenantGrantsDeathTouchWarlord differs only in a.abilities.deathTouch and pins the same 5.000. The discriminating control is Revenant itself, which the sweep measures as live — remove it and the intrinsic -3 survives into the melee call.',
    },
  },
  revenantGrantsUndeadImmunityWarlord: {
    desc: 'Revenant makes defender undead → Death Touch immune. Atk 1 (100% blocked by def 1) + attacker Death Touch -3 vs Res 5 → 0 (immune). Without undead it would be (10−5−3)/10 × 10 = 2.0. '
        + 'The subject is that dmgToB stays 0; dmgToA is the defender\'s own Revenant Death Touch 0, which rides '
        + 'its unconditional counterattack at melee 0 against Res 0 and kills the attacking figure for 10.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { deathTouch: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { revenant: true } },
    expected: { dmgToA: 10.000, dmgToB: 0 },
  },
  // --- Exorcise (Warlord touch: resist-or-banish vs fantastic units) ---
  exorciseFantasticWarlord: {
    desc: 'Exorcise -3 vs fantastic Res 5: atk 1 (100% blocked by def 1) + Exorcise touch, effRes 5-3=2 → pFail 0.8 × 10 hp = 8.0. Non-fantastic defender would be immune (0).',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  exorciseNonFantasticImmuneWarlord: {
    desc: 'Exorcise only affects fantastic units: same Exorcise -3 vs a NORMAL defender → 0. (As fantastic it would be 8.0.)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: -3 } },
    b: { def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Exorcise cannot touch a non-fantastic defender, and the melee 1 is fully blocked by def 1, so the one feature the fixture adds cannot move the zero.',
      'a.ability.exorcise':
        'Keep, and the absence is the rule under test. `exorciseFailProb` returns 0 on its first line for any defender whose unit type does not begin `fantastic_` (combat_special_attacks.js:121), and this fixture leaves b.unitType at the default \'normal\' (UNIT_DEFAULTS, data.js:110), so there is no banish roll for the ablation to remove. exorciseFantasticWarlord differs only in b.unitType and pins 8.000 against this 0; b.unitType is the live half.',
    },
  },
  exorciseUndeadExtraPenaltyWarlord: {
    desc: 'Exorcise (like Dispel Evil) hits created-undead with an additional -3: Exorcise 0 vs an undead (fantastic_death) defender Res 5 → effRes 5-3=2 → pFail 0.8 × 10 = 8.0. A non-undead fantastic defender would be effRes 5 → 0.5 × 10 = 5.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { exorcise: 0 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { undead: true } },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  // --- Destruction (CoM2/Warlord touch: one roll per attacking figure, whole-unit outcome) ---
  // Defenders are 4 figures x 10 hp = 40 total so a whole-unit kill is distinguishable from
  // the per-figure kill that Stoning/Death Touch would produce (which would be 10 per fail).
  destructionWholeUnitCoM2: {
    desc: 'Destruction 0 vs Res 5: one attacker figure makes one attempt. Melee atk 1 is fully blocked; a failure assigns the engine\'s flat 150 to the irrecoverable bucket, and the phase publishes that clipped at the 4 x 10 = 40 HP pool → 0.5 x 40 = 20.0.',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 20.000 },
  },
  destructionPerAttackerFigureCoM2: {
    desc: 'Destruction rolls once per surviving attacker figure: 4 figures each fail independently with p=0.5, so P(any failure)=1-0.5^4=0.9375. The flat 150 clips at the 40 HP pool for E[dmg]=37.5; one whole-call roll would deal 20.0.',
    version: V_COM2,
    a: { figs:4, atk:1, hitChance:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 37.500 },
  },
  destructionSaveModifierCoM2: {
    desc: 'Destruction -3 vs Res 5: effRes 5-3=2 → pFail 0.8, and the flat 150 clips at the 40 HP pool → 32.0 (vs 20.0 at modifier 0).',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destruction: -3 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 32.000 },
  },
  destructionMagicImmunityCoM2: {
    desc: 'Magic Immunity blocks Destruction: same setup as destructionWholeUnitCoM2 but the defender has Magic Immunity → 0 (would be 20.0 without it).',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:10, abilities: { magicImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.destruction':
        'Keep, and the absence is the rule under test. `destructionFailProb` returns 0 as soon as the defender carries Magic Immunity (combat_special_attacks.js:147), before the modifier is read at all, so the Destruction the fixture arms has no roll left for the ablation to remove; the comment at :140-142 records the deliberate asymmetry, that Death and Stoning Immunity do not apply to a Chaos-realm touch but Magic Immunity does. Magic Immunity is the live half. destructionWholeUnitCoM2 differs only in b.abilities.magicImmunity and pins 20.000 against this 0.',
    },
  },
  destructionHighResistanceCoM2: {
    desc: 'Destruction 0 vs Res 10: effRes 10 is never failed → 0 (Res 5 would give 20.0).',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:10, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: at effective Res 10 no Destruction roll can fail, so the result is 0 whatever save modifier the fixture sets, and the melee 1 is fully blocked by def 1.',
      'a.ability.destruction':
        'Keep, and the absence is the rule under test. The discriminator is b.res, which is not an ablatable feature: `destructionFailProb` returns 0 once `effectiveRes >= 10` (combat_special_attacks.js:149), and res 10 with modifier 0 reaches exactly that. destructionWholeUnitCoM2 differs only in b.res and pins 20.000 against this 0.',
    },
  },
  destructionRangedMagicCoM2: {
    desc: 'Destruction fires on magical ranged (CoM2): one attacker figure makes one attempt at effRes 5, so pFail 0.5 x the flat 150, clipped at the 40 HP pool, = 20.0.',
    version: V_COM2,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 20.000 },
  },
  destructionRangedMagicWarlord: {
    desc: 'Destruction still fires on magical ranged in Warlord — unlike Stoning/Death Touch, it has no ranged exclusion (Energy Cannon triggers it from its beam projectile, and the Magician only attacks at range) → 0.5 x the flat 150 clipped at the 40 HP pool = 20.0.',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:1, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 20.000 },
  },
  destructionBlessCoM2: {
    desc: 'Destruction is Chaos-realm, so Bless protects: Res 2 + Bless 5 = 7 → pFail 0.3 against the 40 HP pool = 12.0. Without Bless it would be pFail 0.8 → 32.0.',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:2, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 12.000 },
  },
  destructionBlessWarlord: {
    desc: "Warlord's Bless resistance bonus is 4, not CoM2's 5: Res 2 + 4 = 6 → pFail 0.4 against the 40 HP pool = 16.0 (12.0 in CoM2).",
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:2, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 16.000 },
  },
  destructionDeathImmunityNoProtectionCoM2: {
    desc: 'Death Immunity does NOT stop Destruction — the realm is Chaos, not Death: still 0.5 against the 40 HP pool = 20.0 (a Death-realm touch would be 0).',
    version: V_COM2,
    a: { atk:1, hitChance:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:10, abilities: { deathImmunity: true } },
    expected: { dmgToA: 0, dmgToB: 20.000 },
    vacuity: {
      'b.ability.deathImmunity':
        'Keep, and the absence is the rule under test. `destructionFailProb` tests only the engine version, Magic Immunity and the effective resistance (combat_special_attacks.js:145-151); it has no Death Immunity arm, unlike the next function down, `deathGazeFailProb`, which skips its roll on `deathImmunity` at combat_special_attacks.js:157. Destruction is the live half. destructionWholeUnitCoM2 differs only in b.abilities.deathImmunity and pins the same 20.000, which is the assertion. The `version-dead` label is literally true and uninformative: this is the only preset in Calculator/presets_*.js that configures deathImmunity at com2_1.05.11. The seven others are all named in subs of TEST_TREE\'s mom_1.31 group, whose version is set at test_tree.js:5-8 and whose membership lists carry them at test_tree.js:15 (two), :18, :25, :26, :52 and :60, so CoM2\'s positive Death Immunity behaviour is unasserted.',
    },
  },
  destructionNotInMoM: {
    desc: 'Destruction does not exist in MoM: same setup as destructionWholeUnitCoM2 under MoM 1.31 → 0 (20.0 in CoM2).',
    version: V_MOM_131,
    a: { atk:1, toHitMod:70, hp:10, abilities: { destruction: 0 } },
    b: { figs:4, def:1, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that MoM has no Destruction at all, and the melee 1 is fully blocked by def 1, so the one feature the fixture adds cannot move the zero.',
      'a.ability.destruction':
        'Keep, and the absence is the rule under test. `destructionFailProb` returns 0 for any version whose id does not begin `com2_` (combat_special_attacks.js:146), ahead of both the Magic Immunity test and the resistance read, so at mom_1.31 there is no roll left for the ablation to remove. The discriminator is the version, which is not an ablatable feature. destructionWholeUnitCoM2 is the positive arm at 20.000; it is not a one-value sibling, differing in the version and in the to-hit control that version offers (hitChance in place of toHitMod). The `version-dead` label is literally true and uninformative: this is the only preset in Calculator/presets_*.js that configures the ability at mom_1.31, every other fixture that sets it standing in the CoM2/Warlord block at presets_warlord_effects.js:613-696.',
    },
  },
  // --- Angelic Guardians (Warlord global: grants/improves Exorcise on friendly units) ---
  angelicGuardiansGrantsExorciseRegularWarlord: {
    desc: 'Angelic Guardians on a regular unit grants Exorcise -0: vs fantastic Res 5, effRes 5 → pFail 0.5 × 10 = 5.0. Without the enchantment it would be 0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { angelicGuardians: true } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  angelicGuardiansLifeTierWarlord: {
    desc: 'Angelic Guardians on a Sanctified (life-realm) unit grants Exorcise -1: vs fantastic Res 5, effRes 4 → pFail 0.6 × 10 = 6.0. A regular unit would only get -0 → 5.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { angelicGuardians: true, sanctify: true } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  angelicGuardiansImprovesExistingExorciseWarlord: {
    desc: 'Angelic Guardians on a regular unit that already has Exorcise -1 adds -2 → -3: vs fantastic Res 5, effRes 2 → pFail 0.8 × 10 = 8.0. Without the enchantment, Exorcise -1 → effRes 4 → 0.6 × 10 = 6.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { angelicGuardians: true, exorcise: -1 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  angelicGuardiansFantasticChaosNotBuffedWarlord: {
    desc: 'Angelic Guardians does not buff non-Life fantastic creatures: a fantastic Chaos attacker gains no Exorcise → 0 (atk 1 fully blocked). A realm-less/Life unit would have gained Exorcise -0 → 5.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_chaos', abilities: { angelicGuardians: true } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.angelicGuardians':
        'Keep, and the absence is the rule under test. With no Exorcise already on the record, `applyAngelicGuardiansEffects` takes its else arm and returns the unit untouched whenever the base record is Fantastic and the current realm is not Life (combat_effects.js:337). A fixture that states `unitType: \'fantastic_chaos\'` and no identity gets `baseFantastic` true (stats_identity.js:136) and realm \'chaos\' (combat_abilities.js:364), so the enchantment writes nothing and the ablation has nothing to take away. a.unitType=fantastic_chaos is the live half, which the sweep measures: angelicGuardiansGrantsExorciseRegularWarlord differs only in carrying no a.unitType at all — defaulting to \'normal\' (UNIT_DEFAULTS, data.js:110, spread at ui_state.js:362), which is also the value the ablation writes (tools/preset_vacuity_sweep.js:204, assigned at :300) — and pins 5.000 against this 0.',
    },
  },
  angelicGuardiansImprovesExistingExorciseOnChaosWarlord: {
    desc: 'Angelic Guardians improves an existing Exorcise even on a non-Life fantastic unit: Chaos Exorcise -1 becomes -3, so Res 5 fails 80% of the time for 8.0 expected damage. Without the improvement it would deal 6.0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, unitType:'fantastic_chaos', abilities: { angelicGuardians: true, exorcise: -1 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  angelicGuardiansUsesBaseFantasticGateWarlord: {
    desc: 'Angelic Guardians uses BASEFANTASTIC: a base regular unit made Fantastic by Combat Summoned still gains Exorcise 0, dealing 5.0 expected damage. A live-Fantastic gate would incorrectly deal 0.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { angelicGuardians: true, combatSummoned: true } },
    b: { def:1, toBlkMod:70, res:5, hp:10, unitType:'fantastic_nature' },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  shadowStrikeGrantsThrownWarlord: {
    desc: 'Shadow Strike (Warlord): melee-only unit gains a thrown attack at 1 + 1/3 of melee. Melee 9 → thrown 1+floor(9/3)=4. Both 100% hit vs def 0 → 9 + 4 = 13.0 (without Shadow Strike, melee 9 only → 9.0)',
    version: V_WARLORD,
    a: { atk:9, hitChance:70, hp:10, abilities: { shadowStrike: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 13.000 },
  },
  shadowStrikeBoostsExistingThrownWarlord: {
    desc: 'Shadow Strike (Warlord): a unit with existing thrown gains 1 + 1/3 of melee as added thrown. Melee 9, thrown 4 → thrown 4+1+floor(9/3)=8. Both 100% hit vs def 0 → 9 + 8 = 17.0 (without Shadow Strike, 9 + 4 = 13.0)',
    version: V_WARLORD,
    a: { atk:9, modernAttacks: { thrown: { strength:4, type:'thrown' } }, hitChance:70, hp:10, abilities: { shadowStrike: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 17.000 },
  },
  shadowStrikeAfterColossalWarlord: {
    desc: 'Ordered Shadow Strike (Warlord): Colossal Strength raises melee 9 → 13, then Shadow Strike creates thrown 1+floor(13/3)=5. Both hit at 100% vs def 0 → 18.0; using pre-Colossal melee would deal 17.0',
    version: V_WARLORD,
    a: { atk:9, hitChance:70, hp:10, abilities: { colossalStrength: true, shadowStrike: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 18.000 },
  },
  shadowStrikeGrantPrecedesNoBlazingMarchWarlord: {
    desc: 'Ordered Shadow Strike (Warlord): Blazing March adds +3 melee in region c, so the grant reads melee 12 and creates thrown 1+floor(12/3)=5 in region d. Its +3 Thrown bonus is written in region c, where the Thrown field does not exist yet, so the created attack does not carry it: 12 + 5 = 17.0, not the 20.0 a pre-sequence grant would take',
    version: V_WARLORD,
    a: { atk:9, hitChance:70, hp:10, abilities: { blazingMarch: true, shadowStrike: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 17.000 },
  },
  shadowStrikeFillsThrownFocusMagicVacatedWarlord: {
    desc: 'Focus Magic moves the Thrown field rather than retyping it (Units.RecalculateUnits.pas:885-891), so `SThrown` stands empty when Shadow Strike reaches `UnitCalc.CAS!NOVAMPIRISM!+2 ", gain thrown at strength half of its melee power :"` and the grant is the whole of it. Melee 9, thrown 4: the 4 leaves for the Ranged field, the grant makes thrown 1+floor(9/3)=4, and melee mode fires melee plus thrown for 9 + 4 = 13.0. Without Focus Magic the grant lands on the untouched 4 for 9 + 8 = 17.0; without Shadow Strike the vacated field stays empty for 9.0.',
    version: V_WARLORD,
    a: { atk:9, modernAttacks: { thrown: { strength:4, type:'thrown' } }, hitChance:70, hp:10,
      abilities: { focusMagic: true, shadowStrike: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 13.000 },
  },
  shadowStrikeDoublePoisonWarlord: {
    desc: 'Shadow Strike (Warlord): the granted thrown is a separate phase, so Poison fires on both thrown and melee. Melee 9 grants thrown 4, both 100% hit vs def 0 → 13 physical; Poison 3 vs res 5 (CoM2 fail = (11−5)/10 = 0.6) → 1.8 per phase × 2 = 3.6, total 16.6 (without Shadow Strike, melee 9 + single poison 1.8 = 10.8)',
    version: V_WARLORD,
    a: { atk:9, hitChance:70, hp:10, abilities: { shadowStrike: true, poison: 3 } },
    b: { def:0, toBlkMod:70, res:5, hp:30 },
    expected: { dmgToA: 0, dmgToB: 16.600 },
  },

  // --- Soul Flay (Warlord Death curse: −1 melee / −1 ranged / −2 armor / −2 resistance per experience level; Recruit counts as level 1) ---
  soulFlayMeleeRecruitWarlord: {
    desc: 'Soul Flay (Warlord) on a Recruit (normal level = level 1): melee 5 − 1 = 4, 100% hit vs def 0 → 4.0 (without Soul Flay it would be 5.0)',
    version: V_WARLORD,
    a: { atk:5, hitChance:70, hp:10, abilities: { soulFlay: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  soulFlayMeleeScalesEliteWarlord: {
    desc: 'Soul Flay (Warlord) scales with level: Elite (level 4) melee 10 + 2 (Elite level bonus) − 4 = 8, 100% hit vs def 0 → 8.0 (a flat −1 penalty would give 11.0)',
    version: V_WARLORD,
    a: { atk:10, level:'elite', hitChance:70, hp:10, abilities: { soulFlay: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  soulFlayRangedRecruitWarlord: {
    desc: 'Soul Flay (Warlord) on a Recruit missile attacker: SRanged 5 − 1 = 4, 100% hit vs def 0 → 4.0. Without the ranged write it would be 5.0; without Soul Flay entirely, also 5.0.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { ranged: { strength:5, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { soulFlay: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  soulFlayArmorRecruitWarlord: {
    desc: 'Soul Flay (Warlord) on a Recruit defender: armor 2 − 2 = 0, so atk 2 (100% hit/block) passes a defenseless target → 2.0 (without Soul Flay, def 2 blocks all → 0.0)',
    version: V_WARLORD,
    a: { atk:2, hitChance:70, hp:10 },
    b: { def:2, toBlkMod:70, hp:10, abilities: { soulFlay: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  soulFlayResistanceRecruitWarlord: {
    desc: 'Soul Flay (Warlord) on a Recruit defender: resistance 5 − 2 = 3. Death Touch 0 vs res 3 → pFail (10−3)/10 = 0.7 × 10 hp = 7.0. Melee atk 1 fully blocked by armor 3−2=1. (Without Soul Flay, res 5 → pFail 0.5 → 5.0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { deathTouch: 0 } },
    b: { def:3, toBlkMod:70, res:5, hp:10, abilities: { soulFlay: true } },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },

  // --- Plague (Warlord combat curse: −3 melee / −3 ranged / −3 armor / −6 resistance / −10% To Hit) ---
  plagueMeleeWarlord: {
    desc: 'Plague (Warlord) on the attacker: melee 8 − 3 = 5, 100% base hit − 10% Plague = 90% vs def 0 → 5 × 0.9 = 4.5 (without Plague it would be 8.0)',
    version: V_WARLORD,
    a: { atk:8, hitChance:70, hp:10, abilities: { plague: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 4.500 },
  },
  plagueRangedWarlord: {
    desc: 'Plague (Warlord) on a missile attacker: SRanged 8 − 3 = 5, 100% base hit − 10% Plague = 90% vs def 0 → 5 × 0.9 = 4.5. Without the ranged write it would be 8 × 0.9 = 7.2; without Plague entirely, 8.0.',
    version: V_WARLORD,
    a: { atk:0, modernAttacks: { ranged: { strength:8, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { plague: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 4.500 },
  },
  plagueArmorWarlord: {
    desc: 'Plague (Warlord) on the defender: armor 3 − 3 = 0, so atk 3 (100% hit/block) passes a defenseless target → 3.0 (without Plague, def 3 blocks all → 0.0)',
    version: V_WARLORD,
    a: { atk:3, hitChance:70, hp:10 },
    b: { def:3, toBlkMod:70, hp:10, abilities: { plague: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  plagueResistanceWarlord: {
    desc: 'Plague (Warlord) on the defender: resistance 8 − 6 = 2. Death Touch 0 vs res 2 → pFail (10−2)/10 = 0.8 × 10 hp = 8.0. Melee atk 1 fully blocked by armor 4−3=1. (Without Plague, res 8 → pFail 0.2 → 2.0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { deathTouch: 0 } },
    b: { def:4, toBlkMod:70, res:8, hp:10, abilities: { plague: true } },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  plagueToHitWarlord: {
    desc: 'Plague (Warlord) −10% To Hit: melee 13 − 3 = 10, 100% base hit − 10% = 90% vs def 0 → 10 × 0.9 = 9.0 (without Plague, 13 × 100% = 13.0)',
    version: V_WARLORD,
    a: { atk:13, hitChance:70, hp:10, abilities: { plague: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 9.000 },
  },

  // --- Pox Host / Goblin Pox (Warlord global combat debuff, race-dependent) ---
  // Non-Goblin: −3 melee / −3 ranged / −3 armor / −1 resistance, no To Hit. Goblin: −1 melee / −1 ranged / −1 armor (no resistance penalty).
  goblinPoxNonGoblinMeleeWarlord: {
    desc: 'Pox Host (Warlord) on a non-Goblin attacker: melee 8 − 3 = 5, 100% hit vs def 0 → 5.0 (no To Hit penalty, unlike Plague). Without Pox Host it would be 8.0',
    version: V_WARLORD,
    poxHost: true,
    a: { atk:8, hitChance:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact. The fixture\'s one candidate is the top-level `poxHost` flag, whose terms are the field name and its value (tools/preset_vacuity_sweep.js:290), so `containsRun` looks for \'pox host\'; the key tokenises to \'goblin pox non goblin melee warlord\', which spells the effect by its in-game name and never puts \'host\' after \'pox\' (tools/preset_vacuity_sweep.js:40-47, :49-59). The candidate is live — it is the only one the fixture offers and the sweep reports no `every-feature-inert` — and it is what takes melee 8 to 5: `goblinPoxAtkMod` is -3 for a non-Goblin (stats.js:789) and `b:goblinPox` adds it to `u.atk` (stats_sequence.js:595). goblinPoxGoblinMilderWarlord differs only in carrying a.race \'Goblin\' and pins 7.000.',
    },
  },
  goblinPoxNonGoblinArmorWarlord: {
    desc: 'Pox Host (Warlord) on a non-Goblin defender: armor 3 − 3 = 0, so thrown 3 (100% hit/block) passes a defenseless target → 3.0 (without Pox Host, def 3 blocks all → 0.0). Pox Host is a global, so both sides take it; the attack uses Thrown, the one channel the script leaves alone, which keeps the attack strength at 3 and isolates the armor rule. A conventional missile would be reduced to 0 and print 0.0.',
    version: V_WARLORD,
    poxHost: true,
    a: { atk:0, modernAttacks: { thrown: { strength:3, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:3, toBlkMod:70, hp:10 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. The same tokenisation artefact: the one candidate is the top-level `poxHost` flag, whose terms are the field name and its value (tools/preset_vacuity_sweep.js:290), while the key tokenises to \'goblin pox non goblin armor warlord\', in which \'host\' never follows \'pox\' (tools/preset_vacuity_sweep.js:40-47, :49-59). The candidate is live — the fixture offers no other and the sweep reports no `every-feature-inert` — and this is the fixture that pins the channel split: `b:goblinPox` takes `goblinPoxDefMod` -3 off the defender\'s armor (stats.js:790, written at stats_sequence.js:595) while its strength arm reaches only a slot `isConventionalRangedSlot` admits, which for a channel record is `channelKey === \'ranged\'` alone (combat_abilities.js:258, applied at stats_sequence.js:599), so the attacker\'s Thrown 3 arrives undiminished.',
    },
  },
  goblinPoxNonGoblinRangedWarlord: {
    desc: 'Pox Host (Warlord) on a non-Goblin missile attacker: SRanged 8 − 3 = 5, 100% hit vs def 0 → 5.0 (no To Hit penalty, unlike Plague). Without the ranged write it would be 8.0.',
    version: V_WARLORD,
    poxHost: true,
    a: { atk:0, modernAttacks: { ranged: { strength:8, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. The same tokenisation artefact: the one candidate is the top-level `poxHost` flag, whose terms are the field name and its value (tools/preset_vacuity_sweep.js:290), and the key tokenises to \'goblin pox non goblin ranged warlord\', where \'host\' never follows \'pox\' (tools/preset_vacuity_sweep.js:40-47, :49-59). The candidate is live — the fixture offers no other and the sweep reports no `every-feature-inert` — and it is what takes the missile 8 to 5: the non-Goblin branch subtracts 3 from every conventional ranged slot (stats_sequence.js:599). goblinPoxGoblinRangedMilderWarlord differs only in carrying a.race \'Goblin\' and pins 7.000.',
    },
  },
  goblinPoxNonGoblinResistanceWarlord: {
    desc: 'Pox Host (Warlord) on a non-Goblin defender: resistance 5 − 1 = 4 (helptext: non-Goblins take −1 resistance). Death Touch 0 vs res 4 → pFail (10−4)/10 = 0.6 × 10 hp = 6.0. Melee atk 1 fully blocked by armor 4−3=1. (Without Pox Host, res 5 → pFail 0.5 → 5.0; the manual −3 would give res 2 → 8.0)',
    version: V_WARLORD,
    poxHost: true,
    a: { atk:1, hitChance:70, hp:10, abilities: { deathTouch: 0 } },
    b: { def:4, toBlkMod:70, res:5, hp:10 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact, and here neither candidate is named. `poxHost`\'s terms are the top-level field name and its value (tools/preset_vacuity_sweep.js:290), so `containsRun` looks for \'pox host\'; Death Touch\'s are its key and its label \'Death Touch\' (tools/preset_vacuity_sweep.js:260; abilities.js:9), so it looks for \'death touch\'. The key tokenises to \'goblin pox non goblin resistance warlord\' and carries neither run (tools/preset_vacuity_sweep.js:40-47, :49-59). The fixture pins the resistance asymmetry, the one of the three stat mods whose Goblin branch is zero rather than -1: `goblinPoxResMod` is -1 for a non-Goblin and 0 for a Goblin (stats.js:791), beside -1/-3 for melee and armor (stats.js:789-790), all written at stats_sequence.js:595. goblinPoxGoblinResistanceWarlord differs only in carrying b.race \'Goblin\' and pins 5.000 against this 6.000.',
    },
  },
  goblinPoxGoblinMilderWarlord: {
    desc: 'Pox Host (Warlord) on a GOBLIN attacker: only −1 melee (not −3). melee 8 − 1 = 7, 100% hit vs def 0 → 7.0 (without Pox Host, 8.0; if it wrongly used the non-Goblin −3 it would be 5.0)',
    version: V_WARLORD,
    poxHost: true,
    a: { atk:8, hitChance:70, hp:10, race: 'Goblin' },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  goblinPoxGoblinRangedMilderWarlord: {
    desc: 'Pox Host (Warlord) on a GOBLIN missile attacker: only −1 ranged (not −3). SRanged 8 − 1 = 7, 100% hit vs def 0 → 7.0 (without Pox Host, 8.0; if it wrongly used the non-Goblin −3 it would be 5.0)',
    version: V_WARLORD,
    poxHost: true,
    a: { atk:0, modernAttacks: { ranged: { strength:8, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, race: 'Goblin' },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  goblinPoxGoblinResistanceWarlord: {
    desc: 'Pox Host (Warlord) on a GOBLIN defender: resistance is NOT penalized (helptext: Goblins take only −1 melee / −1 armor). res stays 5 → Death Touch 0 vs res 5 → pFail (10−5)/10 = 0.5 × 10 = 5.0. Melee atk 1 fully blocked by armor 4−1=3. (If the Goblin branch wrongly applied a −1 resistance, res 4 → 6.0; a non-Goblin −1 also → res 4 → 6.0)',
    version: V_WARLORD,
    poxHost: true,
    a: { atk:1, hitChance:70, hp:10, abilities: { deathTouch: 0 } },
    b: { def:4, toBlkMod:70, res:5, hp:10, race: 'Goblin' },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },

  // --- Great Unbinding (Warlord Sorcery global: −20% To Hit / −20% To Defend / −2 Resistance on opponent Fantastic, Undead, Revenant, Vampirism and Chaos Channels units; a Spirit Linked unit is exempt) ---
  greatUnbindingToHitWarlord: {
    desc: 'Great Unbinding (Warlord) on a fantastic attacker: To Hit 100% − 20% = 80%. melee 10 (1 fig) vs def 0 → 10 × 0.8 = 8.0 (without Great Unbinding, 100% → 10.0)',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:10, unitType:'fantastic_chaos', abilities: { greatUnbinding: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  greatUnbindingToBlockWarlord: {
    desc: 'Great Unbinding (Warlord) on a fantastic defender: To Block 100% − 20% = 80%. atk 10 (100% hit) vs def 10 blocking at 80% → ~2 leak through (without Great Unbinding, def 10 at 100% blocks all → 0.0)',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:20 },
    b: { def:10, toBlkMod:70, hp:20, unitType:'fantastic_chaos', abilities: { greatUnbinding: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  greatUnbindingResistanceWarlord: {
    desc: 'Great Unbinding (Warlord) on a fantastic defender: resistance 5 − 2 = 3. Death Touch 0 vs res 3 → pFail (10−3)/10 = 0.7 × 10 hp = 7.0 (without Great Unbinding, res 5 → 0.5 → 5.0)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { deathTouch: 0 } },
    b: { def:4, toBlkMod:70, res:5, hp:10, unitType:'fantastic_chaos', abilities: { greatUnbinding: true } },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  greatUnbindingNonFantasticUnaffectedWarlord: {
    desc: 'Great Unbinding (Warlord) on a non-fantastic attacker carrying none of the other eligibility flags (`UnitCalcPre.CAS!NOETERNALNIGHT!+7..+14 "IF FANTASTIC(U)" "%OR (GETENCHANTMENTFLAG(U,EncVampirism,0)>0)"`): no effect. melee 10 (1 fig, 100% hit) vs def 0 → 10.0 (a normal unit keeps full To Hit)',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:10, unitType:'normal', abilities: { greatUnbinding: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Great Unbinding does not reach a non-fantastic unit, so the one feature the fixture adds cannot move the melee 10.',
      'a.ability.greatUnbinding':
        'Keep, and the absence is the rule under test. `greatUnbindingActive` requires one of the script\'s eligibility terms — live Fantastic, Undead, Revenant, Vampirism or a Chaos Channels flag (`UnitCalcPre.CAS!NOETERNALNIGHT!+7..+14 "IF FANTASTIC(U)" "%OR (GETENCHANTMENTFLAG(U,EncVampirism,0)>0)"`) — and this fixture states `unitType: \'normal\'` with none of those abilities, so the step\'s three writes never run. The discriminator is a.unitType, which cannot be an ablation candidate here because it is already stated at the value the sweep would ablate it to, and a field equal to its default is skipped (tools/preset_vacuity_sweep.js:204 and :268). greatUnbindingToHitWarlord differs only in a.unitType \'fantastic_chaos\' and pins 8.000 against this 10.000.',
    },
  },
  greatUnbindingSpiritLinkExemptWarlord: {
    desc: 'Great Unbinding (Warlord) on a Spirit Linked fantastic attacker: exempt outright. `UnitCalcPre.CAS!NOETERNALNIGHT!+3 "IF (HASGLOBAL(W,GEGreatUnbinding)) %OR (GETENCHANTMENTFLAG(U,EncSpiritLink,0)>0) THEN { GOTO"` leaves the block on `GETENCHANTMENTFLAG(U,EncSpiritLink,0)>0`, so To Hit stays 100%: melee 10 (1 fig) vs def 0 → 10.0 (greatUnbindingToHitWarlord, the same fixture without Spirit Link, pins 8.0)',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:10, unitType:'fantastic_chaos', abilities: { greatUnbinding: true, spiritLink: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 10.000 },
    vacuity: {
      'a.ability.greatUnbinding':
        'Keep. Ablating it cannot move the 10.0 precisely because Spirit Link already exempts the unit — that is the claim under test. It is the effect the exemption blocks; without it there is nothing for Spirit Link to exempt the unit from, and the discriminating fixture is greatUnbindingToHitWarlord, identical but for Spirit Link, which pins 8.0.',
    },
  },
  greatUnbindingLiveFantasticWarlord: {
    desc: 'Great Unbinding (Warlord) on a Sanctified Clergy attacker with a non-fantastic base: `FANTASTIC(U)` at `UnitCalcPre.CAS!NOETERNALNIGHT!+7 "IF FANTASTIC(U)"` is a live read, and the Sanctify block earlier in region b has already made a non-hero Clergy fantastic, so the gate admits it. To Hit 100% − 20% = 80%: melee 10 (1 fig) vs def 0 → 10 × 0.8 = 8.0 (a base-Fantastic gate would read 10.0)',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:10, unitType:'normal', abilities: { greatUnbinding: true, sanctify: true, clergy: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  greatUnbindingUndeadFlagWarlord: {
    desc: 'Great Unbinding (Warlord) on a non-fantastic Undead attacker: the script\'s eligibility disjunction reads `GETENCHANTMENTFLAG(U,EncUndead,0)>0` beside `FANTASTIC(U)` (`UnitCalcPre.CAS!NOETERNALNIGHT!+7..+8 "IF FANTASTIC(U)" "%OR (GETENCHANTMENTFLAG(U,EncUndead,0)>0)"`), and the Undead realm write lands in region c, after this region-b block — so the flag, not the live Fantastic state, is what admits it. To Hit 100% − 20% = 80%: melee 10 (1 fig) vs def 0 → 10 × 0.8 = 8.0 (greatUnbindingNonFantasticUnaffectedWarlord, the same fixture without Undead, pins 10.0)',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:10, unitType:'normal', abilities: { greatUnbinding: true, undead: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },

  // --- Natural Selection (Warlord Nature global: recruitment bonuses from city resources) ---
  naturalSelectionCoalWarlord: {
    desc: 'Natural Selection Coal (Warlord): +1 melee. melee 5 + 1 = 6 (1 fig, 100% hit) vs def 0 → 6.0 (without Coal → 5.0)',
    version: V_WARLORD,
    a: { figs:1, atk:5, hitChance:70, hp:10, abilities: { coal: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  naturalSelectionCoalCreatesMeleeWarlord: {
    desc: 'Natural Selection Coal (Warlord) on a melee-less defender: CreateUnit.CAS writes SAttack at ABase ungated, so BaseUnits.attack becomes 1 and the melee slot is open. The counterattack is melee 0 + 1 = 1 (1 fig, 100% hit) vs def 0 → dmgToA 1.0 (reading the card input instead of the permanent record discards it → 0.0)',
    version: V_WARLORD,
    a: { figs:1, atk:5, hitChance:70, hp:30 },
    b: { figs:1, atk:0, def:0, toBlkMod:70, hitChance:70, hp:20, abilities: { coal: true } },
    expected: { dmgToA: 1.000, dmgToB: 5.000 },
  },
  naturalSelectionCoalOpensHolyBonusWarlord: {
    desc: 'Holy Bonus reads the permanent record (`if B.attack > 0`, Units.RecalculateUnits.pas:2530), which Coal has raised: the counterattack is 0 + 1 (Coal) + 2 (Holy Bonus) = 3 (1 fig, 100% hit) vs def 0 → dmgToA 3.0 (without Coal the permanent record stays 0 and the aura skips melee → 0.0). Holy Bonus also gives the defender +2 armor, blocking 2 of the incoming 5 at 100% To Block → dmgToB 3.0',
    version: V_WARLORD,
    a: { figs:1, atk:5, hitChance:70, hp:30 },
    b: { figs:1, atk:0, def:0, toBlkMod:70, hitChance:70, hp:20, abilities: { coal: true, holyBonus: 2 } },
    expected: { dmgToA: 3.000, dmgToB: 3.000 },
  },
  naturalSelectionCoalOpensNodeAuraWarlord: {
    desc: '`applynodeaura` gates melee on the permanent record (Units.RecalculateUnits.pas:466), which Coal has raised: the counterattack is 0 + 1 (Coal) + 2 (node aura) = 3 (1 fig, 100% hit) vs def 0 → dmgToA 3.0 (without Coal the node aura skips melee → 0.0). The node aura also gives the Nature defender +2 armor, blocking 2 of the incoming 5 at 100% To Block → dmgToB 3.0',
    version: V_WARLORD,
    a: { figs:1, atk:5, hitChance:70, hp:30 },
    b: { figs:1, atk:0, def:0, toBlkMod:70, hitChance:70, hp:20, race:'Nature', abilities: { coal: true } },
    nodeAura: 'nature',
    expected: { dmgToA: 3.000, dmgToB: 3.000 },
  },
  naturalSelectionCoalAttacksWarlord: {
    desc: 'The same Coal-created melee on the *attacking* card, which no melee-initiation guard may refuse: the exchange is admitted regardless of attack strength, so melee 0 + 1 = 1 (1 fig, 100% hit) vs def 0 → dmgToB 1.0, and the defender still counterattacks for 5 (without Coal the attacker deals 0.0 and only the counterattack lands)',
    version: V_WARLORD,
    a: { figs:1, atk:0, def:0, toBlkMod:70, hitChance:70, hp:20, abilities: { coal: true } },
    b: { figs:1, atk:5, hitChance:70, hp:30 },
    expected: { dmgToA: 5.000, dmgToB: 1.000 },
  },
  naturalSelectionIronWarlord: {
    desc: 'Natural Selection Iron (Warlord): +1 armor on defender. armor 4 + 1 = 5 (100% block) fully blocks atk 5 → 0.0 (without Iron, def 4 lets 1 leak → 1.0)',
    version: V_WARLORD,
    a: { figs:1, atk:5, hitChance:70, hp:20 },
    b: { def:4, toBlkMod:70, hp:20, abilities: { iron: true } },
    expected: { dmgToA: 0, dmgToB: 0.000 },
  },
  naturalSelectionWildGameWarlord: {
    desc: 'Natural Selection Wild game (Warlord): +1 ranged attack. missile 5 + 1 = 6 (1 fig, 100% hit) vs def 0 → 6.0 (without Wild game → 5.0)',
    version: V_WARLORD,
    a: { figs:1, modernAttacks: { ranged: { strength:5, type:'missile' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { wildGame: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  naturalSelectionWildGameMagicRangedWarlord: {
    desc: 'Natural Selection Wild game (Warlord): +1 also applies to magic ranged. magic 5 + 1 = 6 (1 fig, 100% hit) vs def 0 → 6.0 (without Wild game → 5.0)',
    version: V_WARLORD,
    a: { figs:1, modernAttacks: { ranged: { strength:5, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { wildGame: true } },
    b: { def:0, toBlkMod:70, hp:20 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 6.000 },
  },
  naturalSelectionWildGameThrownNoBonusWarlord: {
    desc: 'Natural Selection Wild game (Warlord): thrown is NOT a "ranged attack" for this bonus. Base thrown 7, 100% hit, def 2 blocks 2 → 5.0 (melee atk 1 fully blocked by def 2). With the bonus wrongly applied → 8 − 2 = 6.',
    version: V_WARLORD,
    a: { atk:1, modernAttacks: { thrown: { strength:7, type:'thrown' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10, abilities: { wildGame: true } },
    b: { def:2, toBlkMod:70, hp:20 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
    vacuity: {
      'every-feature-inert':
        'Inert by construction: the claim is that Wild game does not reach the Thrown channel, so the one feature the fixture adds cannot move the thrown 7 less the defender\'s armor 2.',
      'a.ability.wildGame':
        'Keep, and the absence is the rule under test. `naturalSelectionWildGameActive` is gated on `naturalSelectionWildGameRangedSlot`, which for a channel record is `channelKey === \'ranged\'` and nothing else (stats.js:1266-1270), and the step increments only a channel carrying that flag (stats_sequence.js:283), so the fixture\'s Thrown field is out of the write\'s reach and the ablation has nothing to take away. naturalSelectionWildGameWarlord is the positive arm on the conventional ranged channel at 6.000 and naturalSelectionWildGameMagicRangedWarlord the magical one at the same 6.000; neither is a one-value sibling of this fixture.',
    },
  },
  naturalSelectionNightshadeWarlord: {
    desc: 'Natural Selection Nightshade (Warlord): +1 Resistance on defender. res 4 + 1 = 5. Death Touch 0 vs res 5 → pFail (10−5)/10 = 0.5 × 10 hp = 5.0 (without Nightshade, res 4 → 0.6 → 6.0). Melee atk 1 fully blocked by armor 4.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { deathTouch: 0 } },
    b: { def:4, toBlkMod:70, res:4, hp:10, abilities: { nightshade: 1 } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  naturalSelectionPowerMineralsWarlord: {
    desc: 'Natural Selection Power minerals (Warlord): +N Resistance directly; 2 → +2. res 3 + 2 = 5. Death Touch 0 vs res 5 → 0.5 × 10 hp = 5.0 (without Power minerals, res 3 → 0.7 → 7.0). Melee atk 1 fully blocked by armor 4.',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { deathTouch: 0 } },
    b: { def:4, toBlkMod:70, res:3, hp:10, abilities: { powerMinerals: 2 } },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },

  // --- Survival Instinct +To Block (Warlord recruitment bonus: +N% To Defend on normal units) ---
  survivalInstinctToBlockNormalWarlord: {
    desc: 'Survival Instinct +To Block (Warlord) on a normal defender: +40% raises To Block from 30% base to 70%. atk 10 (100% hit, 1 fig) vs def 10 → 10 × (1 − 0.70) = 3.0 (without the bonus, 30% block → 7.0)',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:20 },
    b: { def:10, hp:20, unitType:'normal', abilities: { survivalInstinctToBlock: 40 } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  survivalInstinctToBlockFantasticUnaffectedWarlord: {
    desc: 'Survival Instinct +To Block (Warlord): no effect on fantastic creatures (normal-unit recruitment bonus). def 10 at 30% base block: atk 10 (100% hit) → 10 × 0.70 = 7.0 (same as without the bonus)',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:20 },
    b: { def:10, hp:20, unitType:'fantastic_chaos', abilities: { survivalInstinctToBlock: 40 } },
    expected: { dmgToA: 0, dmgToB: 7.000 },
    vacuity: {
      'b.ability.survivalInstinctToBlock':
        'Keep, and the absence is the rule under test. `survivalInstinctToBlkBonus` is gated on `isNormalUnitType(baseUnitType)` (stats.js:841) — the *base* identity, because `CreateUnit.CAS!NOTARCHMAGE!+5..+6 "IF HASGLOBAL(W,GESurvivalInstinct) %AND (OREGUILED>0) THEN {" "SETSTAT(U,SToDefend,ABase,((GETSTAT(U,SToDefend,ABase))+OREGUILED));"` makes this a permanent training-time write, as the comment at stats.js:836-840 sets out. The fixture\'s `unitType: \'fantastic_chaos\'` makes `baseFantastic` true (stats_identity.js:136) and so `baseUnitType` \'fantastic_chaos\' (stats.js:24; stats_identity.js:112-118), leaving the bonus 0 and the step\'s `u.toBlk +=` a no-op (stats_sequence.js:318). b.unitType=fantastic_chaos is the live half — it is the fixture\'s only other candidate and the sweep reports no `every-feature-inert` — and survivalInstinctToBlockNormalWarlord differs only in b.unitType \'normal\', pinning 3.000 against this 7.000.',
    },
  },
  survivalInstinctToBlockSurvivesCombatConversionWarlord: {
    desc: 'The write is `SETSTAT(U,SToDefend,ABase,…)` in CreateUnit.CAS!NOTARCHMAGE!+5..+6 "IF HASGLOBAL(W,GESurvivalInstinct) %AND (OREGUILED>0) THEN {" "SETSTAT(U,SToDefend,ABase,((GETSTAT(U,SToDefend,ABase))+OREGUILED));" — a permanent training-time write on a unit the city produced, so the only identity it can read is the permanent one. Raise Dead makes the defender an unaligned fantastic creature during combat, and the bonus its city gave it stands: +40% still raises To Block from 30% to 70%, so atk 10 (1 fig, 100% hit) vs def 10 deals 10 x (1 - 0.70) = 3.0, the same as the sibling survivalInstinctToBlockNormalWarlord. Gating on the combat-converted identity instead dropped the bonus and gave 7.0.',
    version: V_WARLORD,
    a: { figs:1, atk:10, hitChance:70, hp:20 },
    b: { def:10, hp:20, unitType:'normal',
      abilities: { survivalInstinctToBlock: 40, raiseDead: true } },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },

  // --- Hierophany (Warlord Life curse: halves Defense, strips all immunities / Lightning Resist / Negate First Strike) ---
  hierophanyHalvesDefenseWarlord: {
    desc: 'Hierophany (Warlord) halves the cursed unit\'s Defense: def 8 → 4. atk 8 (100% hit/block): 8 − 4 = 4.0 (without Hierophany, def 8 blocks all → 0.0)',
    version: V_WARLORD,
    a: { atk:8, hitChance:70, hp:10 },
    b: { def:8, toBlkMod:70, hp:20, abilities: { hierophany: true } },
    expected: { dmgToA: 0, dmgToB: 4.000 },
  },
  hierophanyStripsWeaponImmunityWarlord: {
    desc: 'Hierophany (Warlord) strips Weapon Immunity from the cursed unit: a normal melee attacker is no longer blocked. atk 8 (100% hit/block) vs def 0 → 8.0 (with Weapon Immunity intact, Warlord raises def to 10 → 0.0)',
    version: V_WARLORD,
    a: { atk:8, hitChance:70, hp:10, unitType:'normal', weapon:'normal' },
    b: { def:0, toBlkMod:70, hp:20, unitType:'normal', abilities: { weaponImmunity: true, hierophany: true } },
    expected: { dmgToA: 0, dmgToB: 8.000 },
    vacuity: {
      'b.ability.weaponImmunity':
        'Keep, and the absence is the rule under test. `applyHierophanyAbilityStrip` assigns `weaponImmunity: false` unconditionally on a cursed Warlord unit (stats_identity.js:972); it runs on `combatAbilities` (stats.js:2259), which is the ability map the finished unit carries out of derivation (stats.js:2609). So the flag the fixture states is already gone where the melee arm reads it (`wi(false)` at combat_effects.js:656, reading the target\'s abilities at :647), and the Warlord Weapon Immunity bonus of 10 (combat_effects.js:499) is never added to the effective defense (:474). Hierophany is the live half, which the sweep measures: it is the fixture\'s other named candidate and is not reported inert.',
    },
  },
  hierophanyStripsMagicImmunityWarlord: {
    desc: 'Hierophany (Warlord) strips Magic Immunity: sorcery magic ranged is no longer blocked. rtb 3 (100% hit/block) vs def 0 → 3.0 (with Magic Immunity intact, def is raised to 100 → 0.0)',
    version: V_WARLORD,
    a: { modernAttacks: { ranged: { strength:3, type:'magic' } }, hitRanged:70, hitThrown:70, hitBreath:70, hp:10 },
    b: { def:0, toBlkMod:70, hp:10, abilities: { magicImmunity: true, hierophany: true } },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
    vacuity: {
      'b.ability.magicImmunity':
        'Keep, and the absence is the rule under test. The same strip assigns `magicImmunity: false` (stats_identity.js:974) on `combatAbilities` (stats.js:2259), the ability map the finished unit carries out of derivation (stats.js:2609), so the step that would set `u.effectiveDefense = 100` on a magic-immune target (combat_effects.js:469) finds no flag to read — its eligibility term is satisfied here, the ranged branch setting `magicImmunityEligible` from the magical ranged type at combat_effects.js:680. Hierophany is the live half, which the sweep measures: it is the fixture\'s other named candidate and is not reported inert.',
    },
  },

  // --- Pillar of Faith (Warlord Life city enchantment: 20% Lucky grant, +1 Resistance per Religious Building) ---
  pillarOfFaithLuckyResistanceWarlord: {
    desc: 'Pillar of Faith Lucky grants +1 Resistance: Poison 4 (CoM −1) vs res 5+1=6 → pFail (11−6)/10=0.5, E[dmg]=2.0 (without Lucky, res 5 → pFail 0.6 → 2.4)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { pillarOfFaithLucky: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  pillarOfFaithResistanceWarlord: {
    desc: 'Pillar of Faith grants +1 Resistance per Religious Building: 3 buildings → +3 res. Poison 4 (CoM −1) vs res 5+3=8 → pFail (11−8)/10=0.3, E[dmg]=1.2 (without the bonus, res 5 → 2.4)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { pillarOfFaithRes: 3 } },
    expected: { dmgToA: 0, dmgToB: 1.200 },
    vacuity: {
      'name-binds-nothing':
        'Keep. A pure tokenisation artefact. Both terms the Pillar of Faith candidate offers — its key `pillarOfFaithRes` and its label \'Pillar of Faith: +Res\' (tools/preset_vacuity_sweep.js:260; enchantments.js:122) — tokenise to \'pillar of faith res\', while the key tokenises to \'pillar of faith resistance warlord\', so `containsRun` matches the first three tokens and breaks on the fourth (tools/preset_vacuity_sweep.js:40-47, :49-59). The other candidate, Poison Touch, is not named either: its terms are its key and the label \'Poison Touch\' (abilities.js:12), neither of which appears in the key. The fixture pins the per-building sum: the count is read whole with a lower bound only (stats.js:934) and added whole to resistance (stats_sequence.js:294), so 3 buildings give +3.',
    },
  },
  pillarOfFaithResistanceUncappedWarlord: {
    desc: 'Pillar of Faith has no script-side cap: 12 qualifying buildings → +12 res. Poison 10 (CoM −1) vs res 0+12=12 → immune → 0.0 (an artificial +8 cap would produce 3.0 damage)',
    version: V_WARLORD,
    a: { atk:1, hitChance:70, hp:10, abilities: { poison: 10 } },
    b: { def:1, toBlkMod:70, res:0, hp:20, abilities: { pillarOfFaithRes: 12 } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'name-binds-nothing':
        'Keep. The same tokenisation artefact: both of the candidate\'s terms reduce to \'pillar of faith res\' (tools/preset_vacuity_sweep.js:260; enchantments.js:122) while the key reads \'pillar of faith resistance uncapped warlord\' (tools/preset_vacuity_sweep.js:40-47, :49-59), and Poison Touch is not named either (abilities.js:12). The absence the key claims is in the code rather than in the fixture, and it is what the number asserts: `Math.max(0, parseInt(...) || 0)` bounds the count below and not above (stats.js:934) and the whole of it is added to resistance (stats_sequence.js:294), so 12 buildings give +12 and `poisonFailProb` returns 0 on `effectiveRes >= 10` (combat_special_attacks.js:18) after the CoM save modifier of 1 has been taken off.',
    },
  },

  // --- Blaze of Glory (Warlord Chaos enchantment: Armor→Melee, Defense→0, Ranged→Thrown, +Armor Piercing, +Wall Crusher, −First Strike) ---
  blazeOfGloryArmorToMeleeWarlord: {
    desc: 'Blaze of Glory: Melee gains the unit\'s full Armor. Melee 2, Armor 6 → melee 2+6=8, 100% hit vs def 0 → 8.0. (Without Blaze, melee 2 → 2.0.)',
    version: V_WARLORD,
    a: { atk:2, def:6, hitChance:70, hp:10, abilities: { blazeOfGlory: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  blazeOfGloryArmorPiercingWarlord: {
    desc: 'Blaze of Glory grants Armor Piercing. Attacker base armor 0 (melee stays 4), AP halves defender def 4 → 2, 100% hit/block → 4−2 = 2.0. (Without the granted AP, 4−4 = 0.)',
    version: V_WARLORD,
    a: { atk:4, def:0, hitChance:70, hp:10, abilities: { blazeOfGlory: true } },
    b: { def:4, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  blazeOfGloryRangedToThrownWarlord: {
    desc: 'Blaze of Glory turns the Ranged attack into a Thrown attack of the same strength, so it fires in the melee engagement. Melee 1, missile 6 (rangedCheck off → missile would not fire) → thrown 6 + melee 1 = 7.0. (Without Blaze, only melee 1 fires → 1.0.)',
    version: V_WARLORD,
    a: { atk:1, def:0, modernAttacks: { ranged: { strength:6, type:'missile' } }, hitChance:70, hp:10, abilities: { blazeOfGlory: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  blazeOfGloryFollowsRustWarlord: {
    desc: 'Rust (UnitCalc.CAS!NOTCITY!+11 "IF (GETENCHANTMENTFLAG(U,EncRust,0)=0) THEN { GOTO") runs before Blaze of Glory (UnitCalc.CAS!IMMUNETOROT!+14 ", gain first strike, and doom damage but lose all base defense, lose original range attack and become throw power instead :"), so Rust still sees a missile attack and takes its −3 before the transfer. Melee 1−3 → 0, missile 6−3=3 → thrown 3 → 3.0. (Without Rust, thrown 6 + melee 1 → 7.0; with the transfer applied first, Rust would find no missile and the thrown would be 6.)',
    version: V_WARLORD,
    a: { atk:1, def:0, modernAttacks: { ranged: { strength:6, type:'missile' } }, hitChance:70, hp:10, abilities: { blazeOfGlory: true, rust: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blazeOfGloryCarriesRangedlessLionheartWarlord: {
    desc: 'Lionheart\'s ranged +3 is gated on not Ismagicalranged(U.rangedtype) (Units.RecalculateUnits.pas:1730), which is True for a zero ranged type (:2968-2975), so it lands on the Ranged field of a unit with no ranged attack; Blaze of Glory then moves that whole field into Thrown (UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));"). Melee 1+3 = 4 plus a new thrown 3 → 7.0. (Without Blaze, melee 4 only → 4.0; without Lionheart, melee 1 and nothing to transfer → 1.0.)',
    version: V_WARLORD,
    a: { atk:1, def:0, hitChance:70, hp:10, abilities: { blazeOfGlory: true, lionheart: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 7.000 },
  },
  blazeOfGloryCarriesWeaknessThrownPenaltyWarlord: {
    desc: 'Weakness writes Dec(U.ranged, 3) and Dec(U.thrown, 3) with no positivity and no type gate (Units.RecalculateUnits.pas:2273-2279), so both record fields carry the penalty before Blaze of Glory adds Ranged into Thrown (UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));"): missile 7-3 = 4 arrives on a Thrown field already standing at -3 → thrown 1, beside melee 5-3 = 2 → 3.0. (Without Weakness, melee 5 plus thrown 7 → 12.0; without Blaze of Glory the missile attack does not fire in melee, leaving melee 2 → 2.0.)',
    version: V_WARLORD,
    a: { atk:5, modernAttacks: { ranged: { strength:7, type:'missile' } }, def:0, hitChance:70, hp:10, abilities: { blazeOfGlory: true, weakness: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blazeOfGloryCarriesWeaknessRangedPenaltyWarlord: {
    desc: 'Dec(U.ranged, 3) has no type gate either (Units.RecalculateUnits.pas:2273-2279), so it reaches a typeless Ranged field: Lionheart\'s own ungated +3 (:1730) puts 3 there, Weakness takes it back to 0, and Blaze of Glory transfers that 0 into Thrown (UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));"). Melee 5+3-3 = 5 plus thrown 4-3 = 1 → 6.0. (Without Weakness, melee 8 plus thrown 4+3 = 7 → 15.0; reading the ranged arm as a type predicate leaves SRanged at 3 and gives thrown 4 → 9.0.)',
    version: V_WARLORD,
    a: { atk:5, modernAttacks: { thrown: { strength:4, type:'thrown' } }, def:0, hitChance:70, hp:10,
      abilities: { blazeOfGlory: true, weakness: true, lionheart: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 6.000 },
    vacuity: {
      'a.ability.blazeOfGlory':
        'Keep, and the absence is the rule under test: the transfer carrying nothing is what the 6.000 asserts. `d:blazeOfGlory` adds the record\'s Ranged field into the Thrown field (stats_sequence.js:1726), and that field stands at exactly 0 here — `c:lionheart` puts +3 on a Ranged slot that is still typeless, which `isNonMagicalRangedFieldSlot` admits (stats_sequence.js:1046-1048; combat_abilities.js:271-272), and `c:weakness` takes the same 3 back off it (stats_sequence.js:1143, magnitude at stats.js:996, the slot admitted through `isRangedFieldSlot` at stats.js:1881 and combat_abilities.js:646), in that order and both ahead of the transfer in the Warlord chain (stats_manifests.js:282, :289, :298). The block\'s other writes have nothing to act on either: a.def is 0, so `u.atk += u.def` and `u.def = 0` change nothing (stats_sequence.js:1711-1712); the Wall Crusher the block grants (:1708) reaches no resolver in any fixture, since wall breaking is unmodelled (F206); the Armor Piercing the block grants (:1709) reaches a defender armor already at 0, and the halving it drives is `u.effectiveDefense = Math.floor(u.effectiveDefense / 2)` on the assignment line of `effectiveDefense:armorPiercing` (combat_effects.js:453, the step spanning :452-455); and the fixture carries no First Strike to clear (:1710). Weakness is the live half, which the sweep measures.',
    },
  },
  blazeOfGloryCarriesMindStormRangedPenaltyWarlord: {
    desc: 'Mind Storm\'s Dec(U.ranged, 5) is ungated in the same way (Units.RecalculateUnits.pas:2281-2295), so an empty typeless Ranged field stands at -5 when Blaze of Glory adds it into Thrown (UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));"). Melee 9-3 = 6 with an armor of 5-5 = 0 to carry, plus thrown 12-5 = 7 taking the -5 → 2 → 8.0. (Without Mind Storm, melee 9+5 = 14 plus thrown 12 → 26.0; gating the ranged arm on a live slot leaves the transfer nothing to carry and gives thrown 7 → 13.0.)',
    version: V_WARLORD,
    a: { atk:9, modernAttacks: { thrown: { strength:12, type:'thrown' } }, def:5, hitChance:70, hp:10,
      abilities: { blazeOfGlory: true, mindStorm: true } },
    b: { def:0, toBlkMod:70, hp:40 },
    expected: { dmgToA: 0, dmgToB: 8.000 },
  },
  blazeOfGloryCarriesNoBombsGrenadesGrantWarlord: {
    desc: 'SETSTAT(U,SThrown,0,GETSTAT(U,SThrown,0)+%I(8-SFigures/2)) (UnitCalcPre.CAS!NOMAGITEKENGINE!+11 "SETSTAT(U,SThrown,0,( GETSTAT(U,SThrown,0)+%I( 8 - (GETSTAT(U,SFigures,1)/2) ) );") is one '
      + 'write to one field, so the Ranged field Blaze of Glory needs standing by for its transfer '
      + '(UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));") never takes a copy of the grant merely because it is empty and '
      + 'typeless when the block runs. 1-figure melee 5 with Armor 2: Blaze moves the armor into '
      + 'melee for 7, Bombs&Grenades grants Thrown floor(8 - 1/2) = 7, and there is nothing in the '
      + 'Ranged field for the transfer to carry, so 100% hit vs def 0 gives 7 + 7 = 14.0. (Letting '
      + 'the grant fire on every empty typeless slot puts 7 in the Ranged field too and Blaze adds '
      + 'it in for Thrown 14 and 21.0; dropping Explosive Reform leaves melee 7 alone → 7.0, and '
      + 'dropping Blaze of Glory leaves melee 5 beside the same Thrown 7 → 12.0.)',
    version: V_WARLORD,
    a: { figs:1, atk:5, def:2, hitChance:70, hp:10,
      abilities: { outlanderWizard: true, explosive: true, blazeOfGlory: true } },
    b: { def:0, toBlkMod:70, hp:40 },
    expected: { dmgToA: 0, dmgToB: 14.000 },
  },
  blazeOfGloryThrownReadsHolyWeaponToHitWarlord: {
    desc: 'Inc(U.hitchancethrown, 10) is unconditional (Units.RecalculateUnits.pas:1803-1809), so Holy Weapon\'s +10 already stands on the record\'s Thrown threshold when Blaze of Glory puts an attack there (UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));"). Melee 5 at 30+10 = 40% plus the transferred thrown 7 at the same 40% → 2.0 + 2.8 = 4.8. (Without Holy Weapon both read 30% → 3.6; without Blaze of Glory the missile does not fire in melee, leaving melee 5 at 40% → 2.0.)',
    version: V_WARLORD,
    a: { atk:5, modernAttacks: { ranged: { strength:7, type:'missile' } }, def:0, hp:10, abilities: { blazeOfGlory: true, holyWeapon: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 4.800 },
  },
  // F131 removed `blazeOfGloryThrownTakesNoDistancePenaltyWarlord` from this group rather than
  // rewording it. `d:blazeOfGlory` sets `rangedType` to `none` on every ranged-field slot
  // (`UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));"`, `stats_sequence.js`) and no later step writes a ranged type, so no
  // channel can report under the `ranged` output key (`stats.js`, the output-key rule reads the
  // resolved type). A Blaze of Glory attacker therefore never carries a conventional ranged attack
  // at the end of the sequence: the page withdraws ranged mode, `distancePenaltyFor` returns 0 on
  // `!input.rangedCheck` before it reads any type, and the fixture's counterfactual — that reading
  // the permanent missile type would charge −16% — could not fire in either direction. The claim
  // is not observable on this ability at all. The distance penalty's
  // finished-type read is asserted instead where a retyped attack stays live:
  // `focusMagicRetypeSkipsDistancePenaltyCoM2` (`presets_ranged_and_haste.js`). What Blaze of
  // Glory does to the Ranged field is `blazeOfGloryRangedToThrownWarlord` and, through the two
  // region-`e` auras that then find nothing to add to, `supremeLightSkipsBlazedRangedWarlord`
  // and `guidingBeaconSkipsBlazedRangedWarlord`.
  blazeOfGloryHeroUnaffectedWarlord: {
    desc: 'Blaze of Glory targets a non-hero unit, so a hero is unaffected: no Armor→Melee transfer. Hero melee 2, Armor 6 → melee stays 2 vs def 0 → 2.0. (If wrongly applied, melee 2+6 = 8.)',
    version: V_WARLORD,
    a: { unitType:'hero', atk:2, def:6, hitChance:70, hp:10, abilities: { blazeOfGlory: true } },
    b: { def:0, toBlkMod:70, hp:30 },
    expected: { dmgToA: 0, dmgToB: 2.000 },
    vacuity: {
      'a.ability.blazeOfGlory':
        'Keep, and the absence is the rule under test. `blazeOfGloryActive` requires `!isHero` (stats.js:505), and `unitType: \'hero\'` sets that flag (stats_identity.js:134), so the step\'s `when` is false (stats_sequence.js:1706) and none of the Wall Crusher and Armor Piercing grants, the First Strike clear, the Armor-into-Melee move or the Ranged-into-Thrown transfer runs (stats_sequence.js:1708-1712 and :1726). a.unitType=hero is the live half, which the sweep measures: blazeOfGloryArmorToMeleeWarlord differs only in carrying no a.unitType at all — defaulting to \'normal\' (UNIT_DEFAULTS, data.js:110, spread at ui_state.js:362), which is also the value the ablation writes (tools/preset_vacuity_sweep.js:204, assigned at :300) — and pins 8.000 against this 2.000.',
    },
  },

  // --- Black Channels ---
  blackChannelsMeleeBonus: {
    desc: 'Black Channels +2 melee: base 3 atk + BC = 5, 100% hit vs 0 def → E[dmg]=5.0',
    a: { atk:3, toHitMod:70, hp:10, abilities: { blackChannels: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
  blackChannelsRangedBonus: {
    desc: 'Black Channels +1 ranged: base 2 rtb + BC = 3, 100% hit vs 0 def → E[dmg]=3.0',
    a: { rtbType:'missile', rtb:2, toHitRtbMod:70, hp:10, abilities: { blackChannels: true } },
    b: { hp:10 },
    rangedCheck: true, rangedDist: 1,
    expected: { dmgToA: 0, dmgToB: 3.000 },
  },
  blackChannelsDefBonus: {
    desc: 'Black Channels +1 def: 4 atk 100% hit vs def 0+1=1 (30% block) → E[dmg]=3.7',
    a: { atk:4, toHitMod:70, hp:10 },
    b: { hp:10, abilities: { blackChannels: true } },
    expected: { dmgToA: 0, dmgToB: 3.700 },
  },
  blackChannelsResBonus: {
    desc: 'Black Channels +1 res: Stoning -1 vs res 5+1=6; effectiveRes=5, pFail=0.5; hp=10+1=11 → E[dmg]=0.5×11=5.5; melee blocked',
    a: { atk:1, toHitMod:70, hp:10, abilities: { stoningTouch: -1 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { blackChannels: true } },
    expected: { dmgToA: 0, dmgToB: 5.500 },
  },
  blackChannelsHpBonus: {
    desc: 'Black Channels +1 HP: 1-fig unit hp=1+1=2; 3 atk 100% hit 0 def → damage capped at remHP=2',
    a: { atk:3, toHitMod:70, hp:10 },
    b: { hp:1, abilities: { blackChannels: true } },
    expected: { dmgToA: 0, dmgToB: 2.000 },
  },
  blackChannelsPoisonImmune: {
    desc: 'Black Channels grants Poison Immunity: poison 4 and melee both blocked → 0 damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { poison: 4 } },
    b: { def:1, toBlkMod:70, res:5, hp:10, abilities: { blackChannels: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
    vacuity: {
      'a.ability.poison':
        'Keep, and the absence is the rule under test. `applyBlackChannelsEffects` writes `poisonImmunity: true` onto the defender (combat_effects.js:101) behind a version gate it reads through `combatEffectInVersion` (:96); that gate\'s scope is `COMBAT_VERSION_SCOPES`, which maps `resolution:blackChannelsEffectDerivation` to `SCOPE_MOM` (steps.js:377), and `SCOPE_MOM` names its two members outright, `mom_1.31` and `mom_cp_1.60.00` (steps.js:89). And `poisonFailProb` returns 0 on that flag before the resistance is read at all (combat_special_attacks.js:15), so the Poison Touch 4 the fixture arms makes no roll for the ablation to remove; the melee 1 is separately stopped by the defender\'s armor at a full 100% To Block. b.ability.blackChannels is the live half, which the sweep measures.',
    },
  },
  blackChannelsDeathImmune: {
    desc: 'Black Channels grants Death Immunity: Cause Fear does not affect BC unit → 3 atk land (minus BC +1 def at 30% block → E[dmg]=2.7)',
    a: { atk:3, toHitMod:70, hp:10, abilities: { fear: true } },
    b: { res:0, hp:10, abilities: { blackChannels: true } },
    expected: { dmgToA: 0, dmgToB: 2.700 },
  },
  blackChannelsFantasticDeath: {
    desc: 'Black Channels → fantastic_death: triggers opponent Bless (+3 def at 100% block vs death) → 0 damage',
    a: { atk:1, toHitMod:70, hp:10, abilities: { blackChannels: true } },
    b: { def:0, toBlkMod:70, hp:10, abilities: { bless: true } },
    expected: { dmgToA: 0, dmgToB: 0 },
  },
  blackChannelsThrownBonus: {
    desc: 'Black Channels +1 thrown: atk 1+2=3, thrown 1+1=2, 100% hit vs 0 def → E[dmg]=5.0 (thrown+melee)',
    a: { atk:1, toHitMod:70, rtbType:'thrown', rtb:1, toHitRtbMod:70, hp:10, abilities: { blackChannels: true } },
    b: { hp:10 },
    expected: { dmgToA: 0, dmgToB: 5.000 },
  },
});
