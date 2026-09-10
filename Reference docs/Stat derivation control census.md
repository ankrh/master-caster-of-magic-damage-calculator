# Stat derivation control census

CP160/CoM1 invocation and per-step coverage is now documented in the [F277.1 execution census](DOS%20reconstructed/F277.1.execution-census.md). References below assigning that local pass work to F277.1 resolve there; outer cast timing and other named gaps remain open.

Reference inventory of the current calculator input surface, reconciled by F279.1f on 2026-09-10. All current-input/admission/writer/consumer columns are populated; unknown engine facts remain explicit below. This completes the census, not engine verification or F279's mechanism. No new disassembly is included.

## Keys and scope

A row is a logical requested input, not a DOM node or a calculation key. Stable keys are source-qualified: `ability:<definition key>`, `enchantment:<definition key>`, `card:<suffix>`, `global:<id>`, and `ui:<id>`. A/B instances share a row. The UI key column is exact; `aAbil_<uiKey>` and `bAbil_<uiKey>` are the ordinary DOM controls. A numcheck's `_on` checkbox and number are one requested input with separate presence and magnitude. Select options are distinct requests within the row. Aliases remain separate rows when they have different sources or meanings.

Version abbreviations: **131** = MoM 1.31 (`mom_1.31`), **160** = MoM CP 1.60 (`mom_cp_1.60.00`), **C1** = CoM 6.08 (`com_6.08`), **C2** = CoM2 1.05.11 (`com2_1.05.11`), **W** = Warlord 1.5.12.9 (`com2_warlord_1.5.12.9`). **All** is exactly those five; **DOS** = 131,160,C1; **modern** = C2,W.

“Offered” means the surface admits the control for a version, including inactive controls revealed by Show all and custom-unit controls locked by roster selection. It is not an assertion the engine implements it or that it has a numeric effect. In particular Destruction and Supernatural have no version restriction in their definitions despite narrower tooltip wording. “Requested meaning” classifies what the current input declares: innate base ability; attempted cast/effect; training/building/research condition; wizard context; battlefield/received context; or other named condition. Training includes a selected building or research reform condition even when its bonus is recalculated in combat. These are descriptive request labels, not a classification layer for the implementation, a source-pass label, or proof of an engine admission rule.

## Definition rows

Enumerated by evaluating `abilityUiDefs()` and `abilityVersionGated()` from [ability_gating.js](../Calculator/ability_gating.js), not by enumerating origins. Definitions: [abilities.js](../Calculator/abilities.js) and [enchantments.js](../Calculator/enchantments.js). Card construction: [ui_abilities.js](../Calculator/ui_abilities.js), `buildAbilitiesUI`/`abilityControlId`. Matrix construction: [ui_matrix_properties.js](../Calculator/ui_matrix_properties.js), `matrixPropertyDef`/`matrixPropertyCandidates`.

There are **223 definition rows** (48 ability, 175 enchantment), with **207 distinct calc keys**. Every ability row is card-only (and supplied by matrix roster selection); every enchantment row is offered on both cards and both matrix side-property drawers in exactly its listed versions. Modern special controls and DOS shared controls replace duplicate ability widgets as mapped below. Matrix `enabled` toggles are wrappers around each row, not extra effects.

| Stable control key | Label | UI key → calc key | Type / options | Offered versions | Requested meaning |
|---|---|---|---|---|---|
| ability:stoningGaze | Stoning Gaze | stoningGaze → stoningGaze | numcheck | All | innate: base Stoning Gaze |
| ability:stoningTouch | Stoning Touch | stoningTouch → stoningTouch | numcheck | All | innate: base Stoning Touch |
| ability:deathGaze | Death Gaze | deathGaze → deathGaze | numcheck | All | innate: base Death Gaze |
| ability:deathTouch | Death Touch | deathTouch → deathTouch | numcheck | All | innate: base Death Touch |
| ability:doomGaze | Doom Gaze | doomGaze → doomGaze | num | All | innate: base Doom Gaze |
| ability:lifeSteal | Life Steal | lifeSteal → lifeSteal | numcheck | All | innate: base Life Steal |
| ability:poison | Poison Touch | poison → poison | num | All | innate: base Poison Touch |
| ability:holyBonus | Holy bonus | holyBonus → holyBonus | num | All | innate: provided aura magnitude |
| ability:resistanceToAll | Res. to all | resistanceToAll → resistanceToAll | num | All | innate: provided aura magnitude |
| ability:exorcise | Exorcise | exorcise → exorcise | numcheck | C1,C2,W | innate: base Exorcise |
| ability:destruction | Destruction | destruction → destruction | numcheck | All | innate: base Destruction |
| ability:armorPiercing | Armor Piercing | armorPiercing → armorPiercing | bool | All | innate: base Armor Piercing |
| ability:lightningResist | Lightning Resist | lightningResist → lightningResist | bool | All | innate: base Lightning Resist |
| ability:caster | Caster | caster → caster | bool | All | innate: base Caster |
| ability:longRange | Long Range | longRange → longRange | bool | All | innate: base Long Range |
| ability:fear | Cause Fear | fear → fear | bool | All | innate: base Cause Fear |
| ability:lucky | Lucky | lucky → lucky | bool | All | innate: base Lucky |
| ability:charmed | Charmed | charmed → charmed | bool | All | innate: base Charmed |
| ability:magicImmunity | Magic Immunity | magicImmunity → magicImmunity | bool | All | innate: base Magic Immunity |
| ability:coldImmunity | Cold Immunity | coldImmunity → coldImmunity | bool | All | innate: base Cold Immunity |
| ability:missileImmunity | Missile Immunity | missileImmunity → missileImmunity | bool | All | innate: base Missile Immunity |
| ability:deathImmunity | Death Immunity | deathImmunity → deathImmunity | bool | All | innate: base Death Immunity |
| ability:merging | Merging | merging → merging | bool | C2,W | innate: base Merging |
| ability:dispelEvil | Dispel Evil | dispelEvil → dispelEvil | bool | 131,160 | innate: base Dispel Evil |
| ability:negateFirstStrike | Negate First Strike | negateFirstStrike → negateFirstStrike | bool | All | innate: base Negate First Strike |
| ability:doom | Doom Damage | doom → doom | bool | All | innate: base Doom Damage |
| ability:nonCorporeal | Non-Corporeal | nonCorporeal → nonCorporeal | bool | All | innate: base Non-Corporeal |
| ability:fireImmunity | Fire Immunity | fireImmunity → fireImmunity | bool | All | innate: base Fire Immunity |
| ability:poisonImmunity | Poison Immunity | poisonImmunity → poisonImmunity | bool | All | innate: base Poison Immunity |
| ability:firstStrike | First Strike | firstStrike → firstStrike | bool | All | innate: base First Strike |
| ability:stoningImmunity | Stoning Immunity | stoningImmunity → stoningImmunity | bool | All | innate: base Stoning Immunity |
| ability:illusion | Illusion | illusion → illusion | bool | All | innate: base Illusion |
| ability:supernatural | Supernatural | supernatural → supernatural | bool | All | innate: base Supernatural |
| ability:illusionImmunity | Illusion Immunity | illusionImmunity → illusionImmunity | bool | All | innate: base Illusion Immunity |
| ability:teleporting | Teleporting | teleporting → teleporting | bool | C2,W | other: pre-existing condition flag |
| ability:immolation | Immolation | immolation → immolation | bool | All | innate: base Immolation |
| ability:undead | Undead | undead → undead | bool | All | other: pre-existing condition flag |
| ability:invisibility | Invisibility | invisibility → invisibility | bool | All | innate: base Invisibility |
| ability:weaponImmunity | Weapon Immunity | weaponImmunity → weaponImmunity | bool | All | innate: base Weapon Immunity |
| ability:largeShield | Large Shield | largeShield → largeShield | bool | All | innate: base Large Shield |
| ability:amplifier | Amplifier | amplifier → amplifier | bool | W | innate: base Amplifier |
| ability:mechanical | Mechanical | mechanical → mechanical | bool | W | innate: base Mechanical |
| ability:bloodSucker | Blood Sucker | bloodSucker → bloodSucker | bool | W | innate: base Blood Sucker |
| ability:rage | Rage | rage → rage | bool | W | innate: base Rage |
| ability:clergy | Clergy | clergy → clergy | bool | W | innate: base Clergy |
| ability:sailing | Sailing | sailing → sailing | bool | W | innate: base Sailing |
| ability:flying | Flying | flying → flying | bool | W | innate: base Flying |
| ability:sapiens | Sapiens | sapiens → sapiens | bool | W | innate: base Sapiens |
| enchantment:combatSummoned | Combat Summoned | combatSummoned → combatSummoned | bool | All | battlefield: Combat Summoned |
| enchantment:resistanceToAll | Received res. to all | enchantment_resistanceToAll → resistanceToAll | num | All | battlefield: Received res. to all |
| enchantment:holyBonus | Received holy bonus | enchantment_holyBonus → holyBonus | num | All | battlefield: Received holy bonus |
| enchantment:elemArmor | Elements | elemArmor → elemArmor | select: none=None; resistElements=Resist Elem.; elementalArmor=Elem. Armor | All | cast: Elements |
| enchantment:prayer | Prayer | prayer → prayer | bool | All | cast: Prayer |
| enchantment:highPrayer | High Prayer | highPrayer → highPrayer | bool | All | cast: High Prayer |
| enchantment:trueSight | True Sight | trueSight → trueSight | bool | All | cast: True Sight |
| enchantment:bless | Bless | bless → bless | bool | All | cast: Bless |
| enchantment:invulnerability | Invulnerability | invulnerability → invulnerability | bool | All | cast: Invulnerability |
| enchantment:holyWeapon | Holy Weapon | holyWeapon → holyWeapon | bool | All | cast: Holy Weapon |
| enchantment:lionheart | Lionheart | lionheart → lionheart | bool | All | cast: Lionheart |
| enchantment:holyArmor | Holy Armor | holyArmor → holyArmor | bool | All | cast: Holy Armor |
| enchantment:charmOfLife | Charm of Life | charmOfLife → charmOfLife | bool | All | cast: Charm of Life |
| enchantment:fear | Cloak of Fear | enchantment_fear → fear | bool | All | cast: Cloak of Fear |
| enchantment:undead | Undead | enchantment_undead → undead | bool | All | cast: Undead |
| enchantment:animated | Animate Dead | animated → animated | bool | All | cast: Animate Dead |
| enchantment:blackSleep | Black Sleep | blackSleep → blackSleep | bool | All | cast: Black Sleep |
| enchantment:blackPrayer | Black Prayer | blackPrayer → blackPrayer | bool | All | cast: Black Prayer |
| enchantment:raiseDead | Raise Dead | raiseDead → raiseDead | bool | All | cast: Raise Dead |
| enchantment:weakness | Weakness | weakness → weakness | bool | All | cast: Weakness |
| enchantment:wraithForm | Wraith Form | wraithForm → wraithForm | bool | All | cast: Wraith Form |
| enchantment:eternalNight | Eternal Night | eternalNight → eternalNight | bool | All | cast: Eternal Night |
| enchantment:ccDefense | CC: +Defense | ccDefense → ccDefense | bool | All | cast: CC: +Defense |
| enchantment:ccFireBreath | CC: +Fire Breath | ccFireBreath → ccFireBreath | bool | All | cast: CC: +Fire Breath |
| enchantment:ccFlight | CC: +Flight | ccFlight → ccFlight | bool | All | cast: CC: +Flight |
| enchantment:immolation | Immolation | enchantment_immolation → immolation | bool | All | cast: Immolation |
| enchantment:flameBlade | Flame Blade | flameBlade → flameBlade | bool | 131,160,C1,C2 | cast: Flame Blade |
| enchantment:shatter | Shatter | shatter → shatter | bool | All | cast: Shatter |
| enchantment:warpAttack | Warp: Attack | warpAttack → warpAttack | bool | All | cast: Warp: Attack |
| enchantment:warpDefense | Warp: Defense | warpDefense → warpDefense | bool | All | cast: Warp: Defense |
| enchantment:warpResist | Warp: Resist | warpResist → warpResist | bool | All | cast: Warp: Resist |
| enchantment:ironSkin | Iron Skin | ironSkin → ironSkin | bool | All | cast: Iron Skin |
| enchantment:invisibility | Invisibility | enchantment_invisibility → invisibility | bool | All | cast: Invisibility |
| enchantment:magicImmunity | Magic Immunity | enchantment_magicImmunity → magicImmunity | bool | All | cast: Magic Immunity |
| enchantment:guardianWind | Guardian Wind | guardianWind → missileImmunity | bool | All | cast: Guardian Wind |
| enchantment:blur | Blur | blur → blur | bool | All | cast (side/army context): Blur |
| enchantment:resistMagic | Resist Magic | resistMagic → resistMagic | bool | All | cast: Resist Magic |
| enchantment:haste | Haste | haste → haste | bool | All | cast: Haste |
| enchantment:vertigo | Vertigo | vertigo → vertigo | bool | All | cast: Vertigo |
| enchantment:mindStorm | Mind Storm | mindStorm → mindStorm | bool | All | cast: Mind Storm |
| enchantment:righteousness | Righteousness | righteousness → righteousness | bool | 131,160 | cast: Righteousness |
| enchantment:berserk | Berserk (MoM) | berserk → berserk | bool | 131,160 | cast: Berserk (MoM) |
| enchantment:blackChannels | Black Channels | blackChannels → blackChannels | bool | 131,160 | cast: Black Channels |
| enchantment:metalFires | Metal Fires | metalFires → metalFires | bool | 131,160 | cast: Metal Fires |
| enchantment:eldritchWeapon | Eldritch Weapon | eldritchWeapon → eldritchWeapon | bool | 131,160 | cast: Eldritch Weapon |
| enchantment:giantStrength | Giant Strength | giantStrength → giantStrength | bool | 131,160 | cast: Giant Strength |
| enchantment:stoneSkin | Stone Skin | stoneSkin → stoneSkin | bool | 131,160 | cast: Stone Skin |
| enchantment:guardian | Guardian retort | guardian → guardian | bool | C1,C2,W | wizard: Guardian retort |
| enchantment:tactician | Tactician retort | tactician → tactician | bool | C1,C2,W | wizard: Tactician retort |
| enchantment:supremeLight | Supreme Light | supremeLight → supremeLight | bool | C1,C2,W | cast: Supreme Light |
| enchantment:endurance | Endurance | endurance → endurance | bool | C1,C2,W | cast: Endurance |
| enchantment:bloodLust | Blood Lust | bloodLust → bloodLust | bool | C1,C2,W | cast: Blood Lust |
| enchantment:mysticSurge | Mystic Surge | mysticSurge → mysticSurge | bool | C1,C2,W | cast: Mystic Surge |
| enchantment:blazingMarch | Blazing March | blazingMarch → blazingMarch | bool | C1,C2,W | cast: Blazing March |
| enchantment:survivalInstinct | Survival Instinct | survivalInstinct → survivalInstinct | bool | C1,C2,W | cast: Survival Instinct |
| enchantment:landLinking | Land Linking | landLinking → landLinking | bool | C1,C2 | cast: Land Linking |
| enchantment:focusMagic | Focus Magic | focusMagic → focusMagic | bool | C1,C2,W | cast: Focus Magic |
| enchantment:realmWard | Realm Ward | realmWard → realmWard | select: none=None; nature=Nature; sorcery=Sorcery; chaos=Chaos; life=Life; death=Death | C1 | cast: Realm Ward |
| enchantment:spellLock | Spell Lock | spellLock → spellLock | bool | C1,C2,W | cast: Spell Lock |
| enchantment:discipline | Discipline | discipline → discipline | select: none=None; overland=Overland; combat=Combat | C2 | cast: Discipline |
| enchantment:disciplineWarlord | Discipline | disciplineWarlord → discipline | select: none=None; overland=Overland; combat=Combat | W | other: arcane unit ability — Discipline |
| enchantment:breakthrough | Breakthrough | breakthrough → breakthrough | select: none=None; melee=+1mel; meleeDef=+1mel/+1def | C2,W | other: Breakthrough |
| enchantment:spellWard | Spell Ward realm | spellWard → spellWard | select: none=None; nature=Nature; sorcery=Sorcery; chaos=Chaos; life=Life; death=Death | C2,W | battlefield: defending city ward realm |
| enchantment:guidingBeaconAura | Guiding Beacon aura | guidingBeaconAura → guidingBeaconAura | num | C1,C2,W | battlefield: Guiding Beacon aura |
| enchantment:prayermasterAura | Prayermaster aura | prayermasterAura → prayermasterAura | num | C2,W | battlefield: Prayermaster aura |
| enchantment:divineBarrierAura | Divine Barrier aura | divineBarrierAura → divineBarrierAura | num | C1,C2,W | battlefield: Divine Barrier aura |
| enchantment:soulLinkerAura | Soul Linker aura | soulLinkerAura → soulLinkerAura | num | C1,C2,W | battlefield: Soul Linker aura |
| enchantment:leadershipAura | Leadership aura | leadershipAura → leadershipAura | num | C2,W | battlefield: Leadership aura |
| enchantment:heavenlyLight | Heavenly Light / Guardian node | heavenlyLight → heavenlyLight | bool | C1,C2,W | battlefield: Heavenly Light / Guardian node |
| enchantment:darkForce | Dark Force | darkForce → darkForce | bool | C2,W | battlefield: Dark Force |
| enchantment:badMoon | Bad Moon | badMoon → badMoon | bool | C2,W | battlefield: Bad Moon |
| enchantment:goodMoon | Good Moon | goodMoon → goodMoon | bool | C2,W | battlefield: Good Moon |
| enchantment:natureConjunction | Nature Conjunction | natureConjunction → natureConjunction | bool | C2,W | battlefield: Nature Conjunction |
| enchantment:destiny | Destiny | destiny → destiny | bool | C2 | cast: Destiny |
| enchantment:rulerOfUnderworld | Ruler of Underworld | rulerOfUnderworld → rulerOfUnderworld | bool | C2,W | cast: Ruler of Underworld |
| enchantment:mislead | Mislead | mislead → mislead | bool | C2 | cast: Mislead |
| enchantment:innerPower | Inner Power | innerPower → innerPower | bool | C2,W | cast: Inner Power |
| enchantment:blazingEyes | Blazing Eyes | blazingEyes → blazingEyes | bool | C2 | cast: Blazing Eyes |
| enchantment:reinforceMagic | Reinforce Magic | reinforceMagic → reinforceMagic | bool | C2,W | cast: Reinforce Magic |
| enchantment:apotheosis | Apotheosis | apotheosis → destiny | bool | W | cast: Apotheosis |
| enchantment:liability | Liability | liability → mislead | bool | W | cast: Liability |
| enchantment:chaosEmbrace | Chaos Embrace | chaosEmbrace → blazingEyes | bool | W | cast: Chaos Embrace |
| enchantment:natureLink | Nature Link | natureLink → landLinking | bool | W | cast: Nature Link |
| enchantment:lavaSmelterWeaponImmunity | Lava Smelter: Weapon Imm. | lavaSmelterWeaponImmunity → lavaSmelterWeaponImmunity | bool | W | training: Lava Smelter: Weapon Imm. |
| enchantment:lavaSmelterMissileImmunity | Lava Smelter: Missile Imm. | lavaSmelterMissileImmunity → lavaSmelterMissileImmunity | bool | W | training: Lava Smelter: Missile Imm. |
| enchantment:lavaSmelterResistElements | Lava Smelter: Resist Elem. | lavaSmelterResistElements → lavaSmelterResistElements | bool | W | training: Lava Smelter: Resist Elem. |
| enchantment:lavaSmelterElementalArmor | Lava Smelter: Elem. Armor | lavaSmelterElementalArmor → lavaSmelterElementalArmor | bool | W | training: Lava Smelter: Elem. Armor |
| enchantment:lavaSmelterFieryBlade | Lava Smelter: Fiery Blade | lavaSmelterFieryBlade → lavaSmelterFieryBlade | bool | W | training: Lava Smelter: Fiery Blade |
| enchantment:godsPlayDices | Gods Play Dices: Resistance | godsPlayDices → godsPlayDices | num | W | battlefield: Gods Play Dices: Resistance |
| enchantment:sageMaster | Sage Master retort | sageMaster → sageMaster | bool | W | wizard: Sage Master retort |
| enchantment:astrologer | Astrologer retort | astrologer → astrologer | bool | W | wizard: Astrologer retort |
| enchantment:charismatic | Charismatic retort | charismatic → charismatic | bool | W | wizard: Charismatic retort |
| enchantment:enchanter | Enchanter retort | enchanter → enchanter | bool | W | wizard: Enchanter retort |
| enchantment:channeler | Marionette: Channeler owner | channeler → channeler | bool | W | wizard: Marionette: Channeler owner |
| enchantment:marionetteBaseSkill | Marionette: Base skill | marionetteBaseSkill → marionetteBaseSkill | num | W | wizard: Marionette: Base skill |
| enchantment:marionettePrimary | Marionette: Primary realm | marionettePrimary → marionettePrimary | select: nature=Nature; sorcery=Sorcery; chaos=Chaos; life=Life; death=Death | W | wizard: Marionette: Primary realm |
| enchantment:marionetteNatureBooks | Marionette: Nature books | marionetteNatureBooks → marionetteNatureBooks | num | W | wizard: Marionette: Nature books |
| enchantment:marionetteSorceryBooks | Marionette: Sorcery books | marionetteSorceryBooks → marionetteSorceryBooks | num | W | wizard: Marionette: Sorcery books |
| enchantment:marionetteChaosBooks | Marionette: Chaos books | marionetteChaosBooks → marionetteChaosBooks | num | W | wizard: Marionette: Chaos books |
| enchantment:marionetteLifeBooks | Marionette: Life books | marionetteLifeBooks → marionetteLifeBooks | num | W | wizard: Marionette: Life books |
| enchantment:marionetteDeathBooks | Marionette: Death books | marionetteDeathBooks → marionetteDeathBooks | num | W | wizard: Marionette: Death books |
| enchantment:marionetteAscension | Marionette: Ascension | marionetteAscension → marionetteAscension | bool | W | other: Marionette: Ascension |
| enchantment:marionetteConjurer | Marionette: Conjurer | marionetteConjurer → marionetteConjurer | bool | W | wizard: Marionette: Conjurer |
| enchantment:pillarOfFaithRes | Pillar of Faith: +Res | pillarOfFaithRes → pillarOfFaithRes | num | W | battlefield: Pillar of Faith: +Res |
| enchantment:powerMinerals | Natural Sel.: Power minerals | powerMinerals → powerMinerals | num | W | training: Natural Sel.: Power minerals |
| enchantment:survivalInstinctToBlock | Survival Instinct: +To Block% | survivalInstinctToBlock → survivalInstinctToBlock | num | W | battlefield: Survival Instinct: +To Block% |
| enchantment:altarOfTheMoon | Altar of the Moon | altarOfTheMoon → altarOfTheMoon | bool | W | training: Altar of the Moon |
| enchantment:altarOfTheSun | Altar of the Sun (+fig) | altarOfTheSun → altarOfTheSun | bool | W | training: Altar of the Sun (+fig) |
| enchantment:alumniOfAcademy | Academy (Alumni) | alumniOfAcademy → alumniOfAcademy | bool | W | training: Academy (Alumni) |
| enchantment:armorcladReform | Armorclad reform | armorcladReform → armorcladReform | bool | W | training: Armorclad reform |
| enchantment:ballisticsTraining | Ballistics Training | ballisticsTraining → ballisticsTraining | bool | W | training: Ballistics Training |
| enchantment:artificer | Artificer retort | artificer → artificer | bool | W | wizard: Artificer retort |
| enchantment:dragonMound | Dragon Mound | dragonMound → dragonMound | bool | W | training: Dragon Mound |
| enchantment:energyBeamWeapons | Energy Beam Weapons | energyBeamWeapons → energyBeamWeapons | bool | W | training: Energy Beam Weapons |
| enchantment:explosive | Explosive reform | explosive → explosive | bool | W | training: Explosive reform |
| enchantment:favoredTerrain | Favored Terrain | favoredTerrain → favoredTerrain | bool | W | battlefield: Favored Terrain |
| enchantment:fortification | Fortification | fortification → fortification | bool | W | battlefield: Fortification |
| enchantment:heatPowerEngine | Heat Power Engine | heatPowerEngine → heatPowerEngine | bool | W | training: Heat Power Engine |
| enchantment:hillfort | Hillfort | hillfort → missileImmunity | bool | W | battlefield: Hillfort |
| enchantment:lightningBlade | Lightning Blade | lightningBlade → lightningBlade | bool | W | training: Lightning Blade |
| enchantment:ludusAgoge | Ludus Agoge | ludusAgoge → ludusAgoge | bool | W | training: Ludus Agoge |
| enchantment:magitekEngineering | Magitek Engineering | magitekEngineering → magitekEngineering | bool | W | training: Magitek Engineering |
| enchantment:magitekScience | Magitek Science | magitekScience → magitekScience | bool | W | training: Magitek Science |
| enchantment:malnourished | Malnourished | malnourished → malnourished | bool | W | other: Malnourished |
| enchantment:mechanicalExpert | Mechanical Expert | mechanicalExpert → mechanicalExpert | bool | W | battlefield: Mechanical Expert |
| enchantment:militaryWorkshop | Military Workshop | militaryWorkshop → militaryWorkshop | bool | W | training: Military Workshop |
| enchantment:militaryDrilling | Military Drilling | militaryDrilling → militaryDrilling | bool | W | training: Military Drilling |
| enchantment:motherFungus | Mother Fungus | motherFungus → motherFungus | bool | W | training: Mother Fungus |
| enchantment:pneumaReactor | Pneuma Reactor | pneumaReactor → pneumaReactor | bool | W | training: Pneuma Reactor |
| enchantment:poolOfRepentance | Pool of Repentance | poolOfRepentance → poolOfRepentance | bool | W | training: Pool of Repentance |
| enchantment:psychoConverter | Psycho Converter | psychoConverter → psychoConverter | bool | W | training: Psycho Converter |
| enchantment:radio | Radio | radio → radio | bool | W | training: Radio |
| enchantment:rocketry | Rocketry | rocketry → rocketry | bool | W | training: Rocketry |
| enchantment:sanctaBasilica | Sancta Basilica | sanctaBasilica → sanctaBasilica | bool | W | training: Sancta Basilica |
| enchantment:temporalEngineering | Temporal Engineering | temporalEngineering → temporalEngineering | bool | W | training: Temporal Engineering |
| enchantment:uphillBattle | Uphill Battle (AI unit) | uphillBattle → uphillBattle | bool | W | battlefield: Uphill Battle (AI unit) |
| enchantment:xenopsychology | Xenopsychology | xenopsychology → xenopsychology | bool | W | training: Xenopsychology |
| enchantment:xenoveterinary | Xenoveterinary | xenoveterinary → xenoveterinary | bool | W | training: Xenoveterinary |
| enchantment:outlanderWizard | Outlander wizard | outlanderWizard → outlanderWizard | bool | W | wizard: Outlander wizard |
| enchantment:flameBladeWarlord | Flame Blade | flameBladeWarlord → flameBlade | bool | W | other: arcane unit ability — Flame Blade |
| enchantment:rebuild | Rebuild | rebuild → rebuild | bool | W | cast: Rebuild |
| enchantment:spiritLink | Spirit Link | spiritLink → spiritLink | bool | W | cast: Spirit Link |
| enchantment:luckyStar | Lucky Star aura | luckyStar → luckyStar | bool | W | battlefield: Lucky Star aura |
| enchantment:rally | Rally | rally → rally | bool | W | cast: Rally |
| enchantment:nausea | Nausea | nausea → nausea | bool | W | cast: Nausea |
| enchantment:disheartenProphecy | Dishearten Prophesy | disheartenProphecy → disheartenProphecy | bool | W | cast: Dishearten Prophesy |
| enchantment:divineProtection | Divine Protection | divineProtection → divineProtection | bool | W | cast: Divine Protection |
| enchantment:angelicGuardians | Angelic Guardians | angelicGuardians → angelicGuardians | bool | W | cast: Angelic Guardians |
| enchantment:eyeOfHeaven | Eye of Heaven | eyeOfHeaven → eyeOfHeaven | bool | W | cast: Eye of Heaven |
| enchantment:sanctify | Sanctify | sanctify → sanctify | bool | W | cast: Sanctify |
| enchantment:zeal | Zeal | zeal → zeal | bool | W | other: arcane unit ability — Zeal |
| enchantment:hierophany | Hierophany | hierophany → hierophany | bool | W | cast: Hierophany |
| enchantment:pillarOfFaithLucky | Pillar of Faith: Lucky | pillarOfFaithLucky → pillarOfFaithLucky | bool | W | battlefield: Pillar of Faith: Lucky |
| enchantment:shadowStrike | Shadow Strike | shadowStrike → shadowStrike | bool | W | cast: Shadow Strike |
| enchantment:revenant | Revenant | revenant → revenant | bool | W | cast: Revenant |
| enchantment:vampirism | Vampirism | vampirism → vampirism | bool | W | cast: Vampirism |
| enchantment:soulFlay | Soul Flay | soulFlay → soulFlay | bool | W | cast: Soul Flay |
| enchantment:plague | Plague | plague → plague | bool | W | cast: Plague |
| enchantment:berserkWarlord | Berserk (Warlord) | berserkWarlord → berserkWarlord | bool | W | other: arcane unit ability — Berserk (Warlord) |
| enchantment:blazeOfGlory | Blaze of Glory | blazeOfGlory → blazeOfGlory | bool | W | cast: Blaze of Glory |
| enchantment:fieryFury | Fiery Fury | fieryFury → fieryFury | bool | W | cast: Fiery Fury |
| enchantment:insulation | Insulation | insulation → insulation | bool | W | cast: Insulation |
| enchantment:beatOfSwiftness | Beat of Swiftness | beatOfSwiftness → beatOfSwiftness | bool | W | cast: Beat of Swiftness |
| enchantment:rust | Rust | rust → rust | bool | W | cast: Rust |
| enchantment:wallOfFireBoost | Wall of Fire: garrison | wallOfFireBoost → wallOfFireBoost | bool | W | battlefield: Wall of Fire: garrison |
| enchantment:colossalStrength | Colossal Strength | colossalStrength → colossalStrength | bool | W | cast: Colossal Strength |
| enchantment:venom | Venom | venom → venom | bool | W | cast: Venom |
| enchantment:transmuteEquipment | Transmute Equipment | transmuteEquipment → transmuteEquipment | bool | W | cast: Transmute Equipment |
| enchantment:coal | Natural Sel.: Coal | coal → coal | bool | W | training: Natural Sel.: Coal |
| enchantment:iron | Natural Sel.: Iron | iron → iron | bool | W | training: Natural Sel.: Iron |
| enchantment:wildGame | Natural Sel.: Wild game | wildGame → wildGame | bool | W | training: Natural Sel.: Wild game |
| enchantment:nightshade | Natural Sel.: Nightshade count | nightshade → nightshade | num | W | training: Natural Sel.: Nightshade count |
| enchantment:planewalking | Planewalking | planewalking → teleporting | bool | W | cast: Planewalking |
| enchantment:temporalTwist | Temporal Twist | temporalTwist → temporalTwist | bool | W | cast: Temporal Twist |
| enchantment:greatUnbinding | Great Unbinding | greatUnbinding → greatUnbinding | bool | W | cast: Great Unbinding |

## Shared keys and card aliases

The mapping above records every alias, including disjoint-version labels. Sharing a calc key does not authorize merging requests or engine records. `abilityUiDefs` generates `enchantment_` UI prefixes for overlapping definition keys; a definition's explicit `uiKey` wins.

| Calc key | Separate request rows |
|---|---|
| holyBonus | ability:holyBonus; enchantment:holyBonus |
| resistanceToAll | ability:resistanceToAll; enchantment:resistanceToAll |
| fear | ability:fear; enchantment:fear |
| magicImmunity | ability:magicImmunity; enchantment:magicImmunity |
| missileImmunity | ability:missileImmunity; enchantment:guardianWind; enchantment:hillfort |
| teleporting | ability:teleporting; enchantment:planewalking |
| immolation | ability:immolation; enchantment:immolation |
| undead | ability:undead; enchantment:undead |
| invisibility | ability:invisibility; enchantment:invisibility |
| flameBlade | enchantment:flameBlade; enchantment:flameBladeWarlord |
| landLinking | enchantment:landLinking; enchantment:natureLink |
| discipline | enchantment:discipline; enchantment:disciplineWarlord |
| destiny | enchantment:destiny; enchantment:apotheosis |
| mislead | enchantment:mislead; enchantment:liability |
| blazingEyes | enchantment:blazingEyes; enchantment:chaosEmbrace |

- `holyBonus` and `resistanceToAll`: innate row declares the unit's provided aura; enchantment row declares a received stackmate contribution. They remain separate inputs even though their calc keys match (`PROVIDED_RECEIVED_CALC_KEYS`).
- Innate `undead`/`teleporting` declare a pre-existing condition flag; marked rows request the corresponding effect. No identity inference is made by the census.
- Modern card aliases (C2,W): `{a,b}Modern_stoningGaze` → `ability:stoningGaze`; `{a,b}Modern_deathGaze` → `ability:deathGaze`; `{a,b}Modern_doomGaze` → `ability:doomGaze`; `{a,b}Modern_stoningTouch` → `ability:stoningTouch`; `{a,b}Modern_deathTouch` → `ability:deathTouch`; `{a,b}Modern_lifeSteal` → `ability:lifeSteal`; `{a,b}Modern_poison` → `ability:poison`; `{a,b}Modern_exorcise` → `ability:exorcise`; `{a,b}Modern_destruction` → `ability:destruction`. A numcheck also has `_on`. `buildModernSpecialCard`/`syncModernSpecialAbility`/`updateModernSpecialDuplicates` in [ui_card.js](../Calculator/ui_card.js) own these mirrors.
- DOS flag aliases (131,160,C1): `{a,b}DosFlag_stoningTouch` → `ability:stoningTouch` (magnitude sign -1); `{a,b}DosFlag_deathTouch` → `ability:deathTouch` (magnitude sign -1); `{a,b}DosFlag_lifeSteal` → `ability:lifeSteal` (magnitude sign -1); `{a,b}DosFlag_poison` → `ability:poison` (magnitude sign 1); `{a,b}DosFlag_holyBonus` → `ability:holyBonus` (magnitude sign 1); `{a,b}DosFlag_resistanceToAll` → `ability:resistanceToAll` (magnitude sign 1). They all read `card:DosSpecial`, not independent magnitudes. DOS gazes are selected by `card:RtbType` and use the shared special byte, not independent gaze widgets. `DOS_SPECIAL_CONSUMERS`, `DOS_GAZE_KEYS` in [combat_special_attacks.js](../Calculator/combat_special_attacks.js) and `updateDosSpecialDuplicates` in ui_card.js own this mapping.

## Additional calculation inputs

These rows are not additional definitions. Card DOM ids have side prefix a/b; side-property aliases name the matrix drawer key. Source: [index.html](../index.html), [ui_card.js](../Calculator/ui_card.js) `collectCardState`/`collectGlobals`, [card_state.js](../Calculator/card_state.js) `cardStateToDerivationInput`, and [ui_units.js](../Calculator/ui_units.js) `cardIdentity`. Base stats/identity enter matrix roster rows through roster selection; the selected-unit comparison row uses its card. Only the explicitly named side-property aliases are editable across the matrix roster.

| Stable control key | Offered versions | Requested meaning / projection and matrix alias |
|---|---|---|
| card:Unit | All | other: roster/custom selection; identity and locked base inputs |
| card:BaseHero | All | innate: base hero identity |
| card:BaseFantastic | All | innate: base fantastic identity |
| card:BaseRace | All | innate: base race/realm identity; fixed HTML option list, extended by ensureBaseRaceOption when needed; no version filter |
| card:SpecialUnit | All | innate: special unit selector; none (All); golem (C1,C2,W); chosen (C2,W); zombies/catapult (C1); nightGoblins (W), from SPECIAL_UNIT_DEFS in stats_identity.js |
| card:Figs | All | innate: base figure count → figs |
| card:Atk | All | innate: base melee strength → atk |
| card:RtbType | DOS | innate: shared ranged/thrown/breath/gaze type → rtbType |
| card:Rtb | DOS | innate: shared non-melee strength → rtb |
| card:DosSpecial | DOS | innate: single special magnitude byte, flags/gaze aliases above → dosSpecial.magnitude |
| card:ModernRangedType | modern | innate: conventional ranged type → modernAttacks.rangedType |
| card:ModernRanged | modern | innate: conventional ranged strength → modernAttacks.ranged |
| card:ModernThrown | modern | innate: thrown strength → modernAttacks.thrown |
| card:ModernFireBreath | modern | innate: fire breath strength → modernAttacks.fireBreath |
| card:ModernLightningBreath | modern | innate: lightning breath strength → modernAttacks.lightningBreath |
| card:ToHitMod | DOS | innate: melee To-Hit modifier → toHitMod |
| card:ToHitRtbMod | DOS | innate: shared non-melee To-Hit modifier → toHitRtbMod |
| card:HitChance | modern | innate: general To-Hit modifier → hitChance |
| card:HitMelee | modern | innate: melee-only modifier → hitMelee |
| card:HitRanged | modern | innate: ranged-only modifier → hitRanged |
| card:HitThrown | modern | innate: thrown-only modifier → hitThrown |
| card:HitBreath | modern | innate: breath-only modifier → hitBreath |
| card:ToBlkMod | All | innate: To-Block modifier → toBlkMod |
| card:Def | All | innate: base armor → def |
| card:Res | All | innate: base resistance → res |
| card:HP | All | innate: base HP per figure → hp |
| card:CityWalls | All | battlefield: side inside/outside walls (none/1/3) → cityWalls; matrix side property cityWalls |
| card:Level | All | other: selected experience level → level; matrix side property level (normal/regular/veteran/elite/ultra_elite/champion; hero level is not offered) |
| card:Weapon | All | training: normal/magic/mithril/adamantium weapon quality → weapon; matrix side property weapon |
| card:Armor | C1,C2,W | training: normal/orihalcon armor quality → armor; matrix side property armor |
| card:Dmg | All | other: starting total damage → dmg; matrix side property damageTaken |

Hidden carriers `{a,b}IdentityPreGolemElemArmor`, `{a,b}Abil_unitType`, and `{a,b}Unit` are not independently exposed requests (Unit's roster selection is included above). Their values are produced by identity/selection logic. There is no exposed irrecoverable damage, undead damage, bonus HP or no-healing override.

| Stable control key | Main card/global offered | Matrix menu offered | Card version rule | Requested meaning / projection |
|---|---|---|---|---|
| global:gameVersion | All | shared page selector | All | other: engine version |
| global:trueLight | 131,160,W | All | 131,160,W | battlefield: True Light |
| global:darkness | All | All | All | battlefield: Darkness |
| global:wallOfFire | All | All | All | battlefield: crossing-fire condition; distinct from enchantment:wallOfFireBoost |
| global:warpReality | All | All | All | battlefield: Warp Reality |
| global:chaosConjunction | C2,W | C2,W | C2,W | battlefield: Chaos conjunction |
| global:hurricane | W | All | W | battlefield: Hurricane |
| global:poxHost | W | All | W | battlefield: Pox host presence |
| global:chaosSurge | All | All | All | battlefield: Chaos Surge count |
| global:nodeAura | All | All | All | battlefield: none/chaos/nature/sorcery node aura |
| global:rangedCheck | All, when attacker has ranged | mode buttons instead | All | other: ranged/melee attack mode |
| global:rangedDist | All, ranged mode | All, ranged matrix only | All | battlefield: ranged distance |

Card version-rule sets come from `globalEnchantmentAllowedForVersion` in ability_gating.js. Matrix `matrixPropertyCandidates('global')` filters only modernOnly/rangedOnly, and `matrixGlobalValue` also checks only modernOnly. Thus the menu and raw reader offer True Light in C1/C2 and Hurricane/Pox in 131/160/C1/C2 despite the card version rule. The consumer sections locate their downstream suppression and bounded probes. The offered pairs remain in the census; the menu discrepancy is proposed work U2 below.

Side-owned effects such as Eternal Night and Eye of Heaven remain their enchantment rows even when `collectGlobals` also projects them into cross-side context (`CROSS_SIDE_ENCHANTMENT_KEYS` in card_state.js). Blur's army context likewise does not create a second control row. No independent opposing-wizard Great Unbinding exemption input exists.

## Non-calculation surface inventory

These controls select, arrange or transfer inputs/results and therefore do not need engine admission/writer/consumer evidence. Their explicit classification keeps them out of the effect inventory without silently overlooking a surface. All are available in all five versions; matrix controls require an open matrix.

| Stable control key | Requested meaning |
|---|---|
| ui:UnitSearch | other: a/b roster search feeding card:Unit |
| ui:presetSearch | other: filter fixture buttons; a fixture loads existing input rows |
| ui:matrixAPropSearch | other: search/add attacker property rows above |
| ui:matrixBPropSearch | other: search/add defender property rows above |
| ui:matrixGlobalPropSearch | other: search/add global property rows above |
| ui:matrixAttackerNameFilter | other: filter matrix roster selection |
| ui:matrixDefenderNameFilter | other: filter matrix roster selection |
| ui:matrixSortAttackers | other: sort output rows |
| ui:matrixSortDefenders | other: sort output columns |

Buttons (Swap, Reset, Copy link, fixture selection, Show/hide inactive, drawer/modal toggles, matrix mode/open, matrix side swap, add/remove property, CSV export) operate on the enumerated inputs or presentation; they do not request an additional effect. Matrix mode buttons are the surface alias of global:rangedCheck.

## Coverage checkpoint

The row set is the union of 223 definitions, 31 additional card rows, 12 global rows and 9 non-calculation UI rows: **275 stable rows**. Special mirrors and A/B instances are aliases, not added rows. Definition offered-version pairs total **578**. The matrix side inventory is all 175 enchantment definitions after version filtering plus level/weapon/armor/cityWalls/damageTaken; its global inventory is the ten MATRIX_GLOBAL_DEFS rows. Static input/select/textarea surfaces in index.html and dynamically built special controls were inspected independently of the definition count.

For each calculation row and applicable version, subsequent evidence sections must key back to this inventory and provide admission gate and record/time read; grant/clear writer locations; permanent versus calculated writes; available recalculation caller/boundary evidence; consumers and record/execution-pass reads; and explicit evidence gaps. A version-hidden surface is not evidence about whether the engine has the underlying ability. Base input and external context rows may identify no cast admission, but that does not excuse tracing their reads.

## DOS admission and grant/clear writers (F279.1b)

This column census inspected executable calculator bodies and the existing address-annotated C reconstructions. It does **not** re-derive or freshly verify binary instructions. The evidence below is a locator into those bodies, not authority delegated to their prose. Later consumer/record/pass columns are in the DOS consumers section below. A gap is a positive statement of missing evidence, not a claim the engine has no writer.

DOS has more than a permanent/calculated pair: `_UNITS[]` is persistent overland unit state, `unit_types[]` is the roster template, and `_battle_units[]` carries both recomputed statistics and battle-lifetime enchantments/`Combat_Effects`. A write to `bu` is therefore not automatically discarded at the next constructor call. The relevant field's reset/retain behavior must be followed. Do not impose the modern `BaseUnits`/`Units` layout on DOS.

### Calculator admission/writer codes

These codes describe **current calculator behavior**, not engine targeting. Every row below binds one code to its exact stable key and offered DOS versions. `ability_gating.js`/`card_state.js` perform version filtering before `deriveUnitStats`; matrix globals have the exceptions already recorded above. Select `none` and unchecked controls request no effect.

| Code | Current gate and record/time read | Current writer/carrier |
|---|---|---|
| I | Innate input after source splitting; no cast admission. | `deriveUnitStats` in stats.js and `seedNonStatRecordFields` in stats_identity.js; exact current destinations are in the input-writer map below. G-I concerns engine mapping, not unperformed current-code mapping. |
| M | Mark alone; no target-record test. | `markedImmunitySteps`, stats_identity.js: `immunities:magicImmunity:marked` or `missileImmunity:marked` sets the running record before `a:baseCopy`. |
| B | Mark alone; no target-record test. | `permanentCastFlagSteps`, stats_identity.js: `buffs:<key>:cast` sets running record before `a:baseCopy`; Spell Lock emitted only for C1 among DOS. |
| D | Mark and `!curseRefusedByImmunity(u,key,version,eyeOfHeaven)` at each debuffs step. All eight DOS keys test current `u.magicImmunity`; Mind Storm/Vertigo additionally test `u.illusionImmunity || u.trueSight`. Eye of Heaven is inactive for DOS. | `curseCastSteps`: `debuffs:<key>:cast` sets running record before `a:baseCopy`; no resistance roll is simulated. |
| C | Mark is carried without a separate cast-admission stage; an effect's own gate must not be mistaken for targeting. | `mergeAbilitySourceHalves` → `suppliedAbilities`/`abilities` in stats.js; `getAbilityStatSteps`, identityConversionSteps and stats_sequence.js consume this map. No explicit cast-flag writer located for this row (G-C). |
| CC | As C; Fire Breath additionally uses `ccDosBreathEligibleAt` in stats.js during its calculation step, reading `runCtx.base` slot type/strength/Doom Gaze plus `context.hasGazeAttack`: None/Thrown and strength ≤3 (131), ≤0 (160,C1). | No mutation-byte cast step; `chaosChannelsFireBreathStep` and `identityConversionSteps` produce calculated effects. Defense/Flight marks have no equivalent separately reconstructed admission stage in current code. |
| X | External/received condition accepted as input; no per-unit cast admission. | stats.js input/ability context (received Holy Bonus/Resistance to All use `receivedAbilityValues` separately from innate values); no unit cast writer. Engine producer may still be missing (G-X). |
| P | Roster/custom input projection; no spell admission. | card_state.js → stats.js base inputs; exact current destinations are in the input-writer map below. G-I concerns engine mapping. |
| WQ | `weaponEligibleAt`: template Fantastic false or Zombies; Construct Catapult overrides city input. | `training:weaponQuality`, plus `template:constructCatapult:weapon`, stats_sequence.js; template identity read in stats.js. |
| AQ | C1, template non-Fantastic and non-hero (`armorTrainingInputAt`). | `training:armorQuality`, stats_sequence.js. The hero exclusion is a calculator input restriction; do not infer the engine's cast gate. |
| L | Training selection requires initial non-Fantastic identity in DOS (`trainingLevelEligible` in stats.js); no cast gate. | `training:veterancy`, stats_sequence.js; E-L is a different, recalculation-time engine write. |
| Q | Query/context selection, no unit spell admission. | card_state.js/collectGlobals inputs; no corresponding unit flag writer. |

`a:baseCopy` currently snapshots `{...u}` into `runCtx.base`; the main stat run then continues mutating `u`. `deriveUnitStats` runs that stat chain once, not once per attempted cast. This source behavior cannot establish the game's recalc schedule.

### Current input-writer map

This completes the I/P destinations without making a binary claim. Names without prefixes in the first three rows are `ability:` keys; each applies only in its inventory versions. Source splitting and merges are in card_state.js/ability_gating.js; writes below are in stats.js unless a helper is named.

| Input keys | Current destination and write location |
|---|---|
| stoningTouch, lifeSteal, poison, exorcise, destruction | Same-named `statRecord` value fields via `Object.assign(...seedNonStatRecordFields(...))` before the chain; innate values retained. |
| armorPiercing, lightningResist, lucky, charmed, magicImmunity, coldImmunity, missileImmunity, deathImmunity, fireImmunity, poisonImmunity, firstStrike, stoningImmunity, illusion, supernatural, illusionImmunity, invisibility, weaponImmunity, largeShield | Same-named boolean `statRecord` fields through that seed function before the chain. |
| stoningGaze, deathGaze, deathTouch, holyBonus, resistanceToAll, caster, longRange, fear, dispelEvil, negateFirstStrike, doom, nonCorporeal, immolation, undead | Same-named ability-map values through `suppliedAbilities` → `effectiveAbilities`; no same-named `statRecord` seed. DOS gaze/touch/aura values first come from `cardDosSpecialAbilities`/`dosSpecialAbilityValues` and the shared slot where applicable; the map is their current carrier. |
| ability:doomGaze; card:Rtb, card:RtbType | DOS shared attack context: `template:stat:base` sets the context strength/type fields and `gaze`/`doomGaze` mirrors in `statRecord`; stats.js later writes derived Doom Gaze into `shapedGazeAbilities`. |
| card:DosSpecial | `cardDosSpecialAbilities` in card_state.js supplies same-named projected ability values for enabled DOS flags/gaze; the seed/map split is the preceding three rows. It is not a second independent magnitude. |
| card:Unit, card:BaseHero, card:BaseFantastic, card:BaseRace, card:SpecialUnit | Roster/custom identity projection; `unitIdentityRecordSeed` in stats_identity.js assigns `ishero`, `fantastic`, `race`, `unittype`, `herotype` in initial `statRecord`. SpecialUnit resolves a version-specific unittype; Unit also loads base inputs through card state. |
| card:Atk, card:Def, card:Res, card:HP | `template:stat:base` in stats_sequence.js writes `statRecord.atk`, `.def`, `.res`, `.hp`. |
| card:ToHitMod, card:ToHitRtbMod, card:ToBlkMod | `template:baseThresholds` in stats_sequence.js increments `toHitMelee`, DOS `secondaryHitFields`, `toBlk` respectively; thresholds are seeded before the chain. |
| card:Figs | Separate `figureUnit` record seeded `{figs: baseFigs}` in stats.js, after the main stat/chance run; no DOS figure modifier step in that small figure sequence. |

For C/X rows the named input-map carrier is the current writer result: no separate cast flag exists there. Later numeric/ability transformations of that carrier are consumers for .1d. This distinction does not excuse missing engine grant/clear evidence, which stays in each row's gap cell.

### Existing DOS source locators and bounded gaps

Paths: **UC** = [unitcalc.c](DOS%20reconstructed/unitcalc.c), **CB** = [combat.c](DOS%20reconstructed/combat.c). Addresses use 131 / 160 / C1; `=` means same address as 131 only when explicitly stated. These are existing reconstruction locations; later binary work must use the version hashes from the binary index.

| Evidence | Admission/read and writer already located | Limits / gap |
|---|---|---|
| E-I | UC `BU_Construct`, entry 131/160/C1 `0x8EDFD`; reads `_UNITS[si].type` to populate `bu` from `unit_types[]`; e.g. defense `0x8EECC/0x8EEFF/0x8EF0D`, melee `0x8EEF0/0x8EF04/0x8EF12`, ranged `0x8EF13/=/0x8EF21`. C1 Golem type test at `0x8EE39`, `bu->item_enchantments |= UE_RESIST_ELEMENTS` at `0x8EE40`. | G-I: per-control template bit mapping, constructor reset/retain coverage and non-template ability grants not listed in E-G remain unenumerated; the DOS consumers section maps later reads; .1f routes missing writer evidence. No cast gate for a custom base input. |
| E-CC | UC `Apply_Chaos_Channels`, all three `0xA4DEF..0xA4EEE`: `_UNITS[].type` selects template. Wings rejects template Flying; 131/160 also Sailing, C1 patched Sailing invalidation away. Breath tests template ranged ≤3 in 131, ≤0 in 160/C1 and type None/Thrown (`0xA4E4F..0xA4E82`). OR writes persistent mutations for Wings `0xA4E9C/0xA4EBA`, Breath `0xA4EC0/0xA4EBA`, Armor `0xA4ED4/0xA4EBA`, same addresses all three. | This is random mutation selection/retry, not the complete spell's outer target validator. Caller and full target admission remain G-CC; current calculator selects each mutation independently and checks Breath against its saved record rather than literally indexing the template. |
| E-S | CB `A32_human_shatter_target` reads battle `controller_idx`, then normal-target `bu->race < RACE_FIRST_FANTASTIC` at `0x85F31..0x85F50` all three. `A32_apply_class_16_effect` calls resistance check on battle-unit value then ORs effect mask into **battle `Combat_Effects`**, `0x822B2..0x822E9` all three. | G-S: surrounding dispatcher/timing not complete; do not extrapolate this class-16 writer to every curse. This directly narrows the current `shatter:cast` comment claiming no supported writer and a permanent flag. |
| E-SA | CB `A32_ai_shatter_candidate`: battle Magic Immunity and existing Combat_Effects at `0x80D50..0x80D89`; 131 Sorcery + Illusion Immunity exclusion, 160/C1 Death + persistent Hero_Slot exclusion at `0x80D8E..0x80DBB`; 131/160 aggregate Righteousness for Chaos/Death, C1 conflict mask at `0x80DBB..0x80DD2`; ownership/status/normal-race/visibility and effective resistance follow. C1 additionally checks Shatter attack floor and normal race at `0x80C81..0x80C98`. | AI candidate scoring/selection is not universal human admission. Generic D does not encode this complete set. |
| E-R | CB `Combat_Effective_Resistance`: reads battle resist `0x9903C..0x99040`, battle Magic Immunity + spell realm gives +30 at `0x990AE..0x990B6`, all three. Enchantments aggregate persistent, battle and item stores at `0x99015..0x99039`. | G-D: this locates a resistance mechanism, not each curse's dispatch, spell realm, immunity membership or write. The later [F250.3 subunit](DOS%20reconstructed/F250.3.mind-truesight.evidence.md) proves a local class-14 Sorcery / battle Illusion Immunity refusal in all DOS builds, conditional on Mind Storm runtime binding. Vertigo and enclosing admission remain open. |
| E-RD | C1 CB `CMB_Raise_Dead` candidates: battle status/controller/race (`0xAB08F..0xAB0B1`) and persistent `wp` (`0xAB0C6`). Application clears battle Combat_Effects `0xAB26F`, battle enchantments `0xAB27A/0xAB280`, persistent enchantments `0xAB324/0xAB32A`; writes persistent Level `0xAB3A6`; battle race `0xAB2B8`; calls constructor `0xAB429` then battlefield effects `0xAB442`. | G-RD: 131/160 equivalent writer/admission not located in this extent; C1 current control does not simulate corpse selection or all clearing writes. Battle race write precedes reconstruction, so downstream retention must be traced, not assumed. |
| E-BL | C1 UC `BU_Apply_Specials`, **Blood Lust** flag branch `0x8F491`: writes battle race `0x8F49A`, persistent `_UNITS[bu->unit_idx].mutations` OR Undead `0x8F4AC`, local `mut` OR Undead `0x8F4B1`. Following mutation branch sets battle Fantastic/immunities and clears Create Outpost `0x8F4B4..0x8F4CB`. | Recalculation can mutate persistent state. This is not Animate Dead's adjacent `0x8F4D0` branch. Original Blood Lust cast flag writer and full eligibility remain G-C. |
| E-L | C1 UC `BU_Apply_Level_Bonus`: persistent or battle Heroism flag; persistent type and owner Warlord/Crusade select floor; writes persistent Level at `0x8F8EC/0x8F8EE`. Without Heroism, type ≥ normal ceiling writes Level zero through same site. | Not a selected-level cast. Other level writers/normal training prerequisites and caller frequency still need mapping (G-L); do not claim this branch exists in 131/160. |
| E-Q | UC `Create_Unit`: persistent quality mutation assignment `0x97DEA` all three; C1 Orihalcon enchantment OR `0x97DF2`; initial XP/Level writes nearby. C1 `BU_Construct` Catapult type/wp tests `0x8EEA4/0x8EEAD`, persistent mutations **assignment** `0x8EEAF`; saved local mutations retain pre-write value, quality later re-reads persistent record. | Training-city prerequisites are not fully expanded here (G-Q). Catapult assignment can clear other mutation bits and is a constructor write, not an assumed cast. |
| E-X | CB `Calc_Battlefield_Bonuses`: city Cloud of Shadow grants defender Darkness `0x9A8BF` all three; city Heavenly Light grants defender True Light `0x9A8D4` in 131/160 only. Player Eternal Night grants side Darkness `0x9A902/0x9A913/0x9A91E/0x9A927`, all three, subject to city True Light sentinel guard. Resets holy/resistance maxima `0x9A93B/0x9A94A` (131/160), `0x9A947/0x9A956` (C1); active battle units' Attribs_2 flags and signed Spec_Att_Attrib update Holy maximum `0x9AA1C/=/0x9AA20`, Resistance maximum `0x9AA70/=/0x9AA74`. | These are derived battlefield-state producers, not original city/global casts. Other producers, full C1 hero aura maxima and original global/city writers remain G-X. |
| E-T | CB `Battle_Unit_Heal` saves movement, calls constructor (`0x7FEF7..0x7FF10`) then battlefield effects (`0x7FF10..0x7FF29`), restores movement, all three. UC constructor calls Specials C1 `0x8F0E8`, MoM `0x8F2A2`; battlefield pass calls Specials 131/160 `0x90A1D`, C1 `0x90743`, passing `(persistent XOR battle) AND battle` enchantment halves and mutations in 131, zero in 160/C1. | G-T: these named calls establish particular schedules, not full recalculation before every cast. F277.1 owns CP160/C1 Specials pass arguments; MoM131 and other caller/reset-retain questions are routed separately below. |

G-C means the particular cast's full validator, backing-store grant/clear write and caller-to-recalc boundary have not been located in this reading. G-X means no per-unit cast is requested, but the engine writer of the supplied external/global/army state has not been inventoried. G-I/G-Q/G-L are writer-mapping gaps, not permission to infer an engine rule from a calculator gate. Every row with these codes remains only partly evidenced. Dispel/recast/clear paths beyond E-RD are untraced and are part of G-C for every cast row; no global claim that other clears are absent is made.

### Additional grants and clears already visible

These keyed entries supplement, rather than replace, each row's original admission/writer code. They locate ability/flag writes only; numeric packages and later readers are mapped in the DOS consumers section.

| Stable source key → affected key(s) | Existing writer and destination; versions | Current calculator writer / unresolved difference |
|---|---|---|
| enchantment:trueSight → ability:illusionImmunity | UC Specials OR battle Attribs_1, 131/160 `0x8F34F`, C1 `0x8F33A`. | `buffs:trueSight:cast` supplies its record flag; D reads that flag directly before recalculation. Original cast backing store remains G-C. |
| enchantment:magicImmunity → ability:magicImmunity; enchantment:guardianWind → ability:missileImmunity | UC Specials OR battle Attribs_1: Magic `0x8F564/=/0x8F552`; Guardian `0x8F543/=/0x8F531`. | `markedImmunitySteps` writes pre-baseCopy record instead; these reads/grants do not establish a persistent ability cast writer. |
| enchantment:invulnerability → ability:weaponImmunity; enchantment:wraithForm → ability:nonCorporeal, ability:weaponImmunity | UC Specials Invulnerability `0x8F370/=/0x8F344`; Wraith Form `0x8F3B1..0x8F3D3` in 131/160, `0x8F35A..0x8F366` C1; battle fields. C1 also upgrades Weapon_Plus1 `0x8F372`. | Input map/effect handling in combat_effects.js and getAbilityStatSteps; cast flag remains G-C. |
| enchantment:blackChannels → ability:coldImmunity, ability:illusionImmunity, ability:poisonImmunity, ability:deathImmunity | 131/160 UC Specials OR cold/illusion/poison `0x8F4BE`, changes battle race/Fantastic `0x8F4A1/0x8F4AD`; Death race grant `0x8F828`. | `applyBlackChannelsEffects` in combat_effects.js; identityConversionSteps. Cast flag remains G-C. |
| ability:undead, enchantment:undead, enchantment:animated, enchantment:bloodLust → immunity/identity grants | UC 131 mutation changes battle race/Fantastic `0x8F3E4/0x8F3F0`; race gate grants Death only `0x8F828`. 160 same but Death/Poison/Cold/Illusion mask at `0x8F828`. C1 mutation grants Death/Cold/Illusion (no Poison) `0x8F4C6` and clears Create Outpost `0x8F4CB`; Animated separately sets battle Weapon Immunity `0x8F506`, race/Fantastic `0x8F50B/0x8F510`, same three immunities `0x8F515`. Blood Lust persistent write E-BL. | `applyUndeadImmunities`, `applyAnimatedEffects`, `applyBloodLustEffects` in combat_effects.js plus identityConversionSteps; matching grants' current execution ordering is in the DOS consumers section; engine invocation closure remains G-pass. 131/160 Animate Dead cast backing store remains G-C; never identify it with C1 Animated merely by label. |
| enchantment:immolation → ability:immolation; enchantment:invisibility → ability:invisibility | UC Specials battle Immolation OR `0x8F66C/=/0x8F5F6`; C1 Invisibility OR `0x8F330`. | Marked Invisibility has `buffs:invisibility:cast`; Immolation stays ability-map handling. 131/160 explicit Invisibility ability writer not identified by the C1 statement (G-I). |
| enchantment:holyWeapon ← unexposed Holy Arms context | UC 131 constructor grant to battle enchantments `0x8F1E4/0x8F1E8`; 160 Specials relocated tail `0x8F197..0x8F1BE` gates controller holy_arms, battle non-Fantastic, local non-Undead. C1 Holy Arms grant `0x8F16C..0x8F18D` differs: persistent unit-type ceiling and holy_arms; no same normal/undead exclusions. | Current Holy Weapon mark read `hwActive` in stats.js; no independent Holy Arms control. Exact grant→aggregate visibility on each pass is F277.1, not presumed immediate. |
| enchantment:haste ← hero item Haste power | UC battlefield effects OR battle Combat_Effects Haste `0x9021F` all three, gated by persistent Hero_Slot and item Powers. | Current `buffs:haste:cast` is not this writer. Equipment remains out of scope, but this producer prevents attributing every observed Haste flag to a cast. |
| enchantment:elemArmor ← card:SpecialUnit Golem | E-I: C1 constructor grants battle item-enchantment Resist Elements. | stats.js overwrites supplied Elements with resistElements before sequence for Golem. Does not prove a cast cleared Elemental Armor. |
| card:Weapon, card:SpecialUnit Catapult; card:Level | E-Q and E-L permanent writes during construction/recalculation. | Current training/template steps; persistent mutations/Level cannot be rebuilt solely from original inputs once an outer sequence is introduced. |

### DOS row bindings

`Evidence / gap` gives a row-specific locator or an explicit unresolved cell. The table covers 133 unique calculation rows and 355 offered DOS version pairs. All generic I/C/X rows are deliberately gaps in detailed engine writer coverage; the census does not promote their origin-table mentions to evidence. Non-calculation UI rows were excluded by the preceding surface inventory; modern-only rows are outside this table. C1 True Light and all DOS Hurricane/Pox rows remain included because the matrix offers them.

| Stable control key | DOS versions | Calculator gate/writer | Evidence / gap |
|---|---|---|---|
| ability:stoningGaze | 131,160,C1 | I | E-I; G-I |
| ability:stoningTouch | 131,160,C1 | I | E-I; G-I |
| ability:deathGaze | 131,160,C1 | I | E-I; G-I |
| ability:deathTouch | 131,160,C1 | I | E-I; G-I |
| ability:doomGaze | 131,160,C1 | I | E-I; G-I |
| ability:lifeSteal | 131,160,C1 | I | E-I; G-I |
| ability:poison | 131,160,C1 | I | E-I; G-I |
| ability:holyBonus | 131,160,C1 | I | E-I; G-I |
| ability:resistanceToAll | 131,160,C1 | I | E-I; G-I |
| ability:exorcise | C1 | I | E-I; G-I |
| ability:destruction | 131,160,C1 | I | CB ATT_DESTRUCTION reader0x9A19E..0x9A1E6; UC IP_DESTRUCTION item writer0x8E550 all three; original innate control has no such item context (M3/F41) |
| ability:armorPiercing | 131,160,C1 | I | E-I; G-I |
| ability:lightningResist | 131,160,C1 | I | E-I; G-I |
| ability:caster | 131,160,C1 | I | E-I; G-I |
| ability:longRange | 131,160,C1 | I | E-I; G-I |
| ability:fear | 131,160,C1 | I | E-I; G-I |
| ability:lucky | 131,160,C1 | I | E-I; G-I |
| ability:charmed | 131,160,C1 | I | E-I; G-I |
| ability:magicImmunity | 131,160,C1 | I | E-I; G-I; E-G |
| ability:coldImmunity | 131,160,C1 | I | E-I; G-I; E-G |
| ability:missileImmunity | 131,160,C1 | I | E-I; G-I; E-G |
| ability:deathImmunity | 131,160,C1 | I | E-I; G-I; E-G |
| ability:dispelEvil | 131,160 | I | E-I; G-I |
| ability:negateFirstStrike | 131,160,C1 | I | E-I; G-I |
| ability:doom | 131,160,C1 | I | E-I; G-I |
| ability:nonCorporeal | 131,160,C1 | I | E-I; G-I; E-G |
| ability:fireImmunity | 131,160,C1 | I | E-I; G-I |
| ability:poisonImmunity | 131,160,C1 | I | E-I; G-I; E-G |
| ability:firstStrike | 131,160,C1 | I | E-I; G-I |
| ability:stoningImmunity | 131,160,C1 | I | E-I; G-I |
| ability:illusion | 131,160,C1 | I | E-I; G-I |
| ability:supernatural | 131,160,C1 | I | G-I: offered in DOS; exact DOS representation/writer not established |
| ability:illusionImmunity | 131,160,C1 | I | E-I; G-I; E-G |
| ability:immolation | 131,160,C1 | I | E-I; G-I; E-G |
| ability:undead | 131,160,C1 | I | E-I; G-I; E-G |
| ability:invisibility | 131,160,C1 | I | E-I; G-I; E-G |
| ability:weaponImmunity | 131,160,C1 | I | E-I; G-I; E-G |
| ability:largeShield | 131,160,C1 | I | E-I; G-I |
| enchantment:combatSummoned | 131,160,C1 | X | CB BU_UnitLoadToBattle; full state-writer mapping G-X, schedule G-T |
| enchantment:resistanceToAll | 131,160,C1 | X | E-X maxima; remaining producers G-X |
| enchantment:holyBonus | 131,160,C1 | X | E-X maxima; remaining producers G-X |
| enchantment:elemArmor | 131,160,C1 | C | C1 E-I Golem; G-C both cast options |
| enchantment:prayer | 131,160,C1 | X | G-X |
| enchantment:highPrayer | 131,160,C1 | X | G-X |
| enchantment:trueSight | 131,160,C1 | B | E-G; G-C |
| enchantment:bless | 131,160,C1 | B | G-C |
| enchantment:invulnerability | 131,160,C1 | C | E-G; G-C |
| enchantment:holyWeapon | 131,160,C1 | C | E-G Holy Arms; G-C cast |
| enchantment:lionheart | 131,160,C1 | C | G-C |
| enchantment:holyArmor | 131,160,C1 | C | G-C |
| enchantment:charmOfLife | 131,160,C1 | X | G-X |
| enchantment:fear | 131,160,C1 | C | G-C |
| enchantment:undead | 131,160,C1 | C | E-G; original mutation writer G-C |
| enchantment:animated | 131,160,C1 | C | E-G; G-C |
| enchantment:blackSleep | 131,160,C1 | D | E-R; G-D, G-C |
| enchantment:blackPrayer | 131,160,C1 | X | G-X |
| enchantment:raiseDead | 131,160,C1 | C | C1 E-RD; 131/160 G-RD; G-T |
| enchantment:weakness | 131,160,C1 | D | E-R; G-D, G-C |
| enchantment:wraithForm | 131,160,C1 | C | E-G; G-C |
| enchantment:eternalNight | 131,160,C1 | X | E-X Darkness grant; original global writer G-X |
| enchantment:ccDefense | 131,160,C1 | CC | E-CC; G-CC |
| enchantment:ccFireBreath | 131,160,C1 | CC | E-CC; G-CC |
| enchantment:ccFlight | 131,160,C1 | CC | E-CC; G-CC |
| enchantment:immolation | 131,160,C1 | C | E-G; G-C |
| enchantment:flameBlade | 131,160,C1 | C | G-C |
| enchantment:shatter | 131,160,C1 | D | E-S, E-SA, E-R; G-S |
| enchantment:warpAttack | 131,160,C1 | D | E-R; G-D, G-C |
| enchantment:warpDefense | 131,160,C1 | D | E-R; G-D, G-C |
| enchantment:warpResist | 131,160,C1 | D | E-R; G-D, G-C |
| enchantment:ironSkin | 131,160,C1 | C | G-C |
| enchantment:invisibility | 131,160,C1 | B | E-G; G-C |
| enchantment:magicImmunity | 131,160,C1 | M | E-G (additional grants); G-C |
| enchantment:guardianWind | 131,160,C1 | M | E-G; G-C |
| enchantment:blur | 131,160,C1 | X | G-X; CB combat_enchantments[BLUR_ATTKR/BLUR_DFNDR] is side state; inventory correctly labels side/army context |
| enchantment:resistMagic | 131,160,C1 | B | G-C |
| enchantment:haste | 131,160,C1 | B | E-G item producer; G-C cast |
| enchantment:vertigo | 131,160,C1 | D | E-R; G-D, G-C |
| enchantment:mindStorm | 131,160,C1 | D | E-R; G-D, G-C |
| enchantment:righteousness | 131,160 | C | G-C |
| enchantment:berserk | 131,160 | C | G-C |
| enchantment:blackChannels | 131,160 | C | E-G; G-C |
| enchantment:metalFires | 131,160 | X | G-X |
| enchantment:eldritchWeapon | 131,160 | C | G-C |
| enchantment:giantStrength | 131,160 | C | G-C |
| enchantment:stoneSkin | 131,160 | C | G-C |
| enchantment:guardian | C1 | X | G-X |
| enchantment:tactician | C1 | X | G-X |
| enchantment:supremeLight | C1 | X | G-X |
| enchantment:endurance | C1 | C | G-C |
| enchantment:bloodLust | C1 | C | E-BL; G-C |
| enchantment:mysticSurge | C1 | C | G-C |
| enchantment:blazingMarch | C1 | X | G-X |
| enchantment:survivalInstinct | C1 | X | UC controller survival_instinct read 0x8F277; global producer G-X |
| enchantment:landLinking | C1 | C | G-C |
| enchantment:focusMagic | C1 | C | G-C |
| enchantment:realmWard | C1 | X | Defending-city realm context in stats.js realmWardActive; city-state writer G-X |
| enchantment:spellLock | C1 | B | G-C |
| enchantment:guidingBeaconAura | C1 | X | G-X |
| enchantment:divineBarrierAura | C1 | X | G-X |
| enchantment:soulLinkerAura | C1 | X | G-X |
| enchantment:heavenlyLight | C1 | X | G-X |
| card:Unit | 131,160,C1 | P | E-I; G-I |
| card:BaseHero | 131,160,C1 | P | E-I; G-I |
| card:BaseFantastic | 131,160,C1 | P | E-I; G-I |
| card:BaseRace | 131,160,C1 | P | E-I; G-I |
| card:SpecialUnit | 131,160,C1 | P | C1 E-I Golem and E-Q Catapult; other identity mappings G-I |
| card:Figs | 131,160,C1 | P | E-I; G-I |
| card:Atk | 131,160,C1 | P | E-I; G-I |
| card:RtbType | 131,160,C1 | P | E-I; G-I |
| card:Rtb | 131,160,C1 | P | E-I; G-I |
| card:DosSpecial | 131,160,C1 | P | E-I; G-I |
| card:ToHitMod | 131,160,C1 | P | E-I; G-I |
| card:ToHitRtbMod | 131,160,C1 | P | E-I; G-I |
| card:ToBlkMod | 131,160,C1 | P | E-I; G-I |
| card:Def | 131,160,C1 | P | E-I; G-I |
| card:Res | 131,160,C1 | P | E-I; G-I |
| card:HP | 131,160,C1 | P | E-I; G-I |
| card:CityWalls | 131,160,C1 | Q | No cast; external state writer G-X |
| card:Level | 131,160,C1 | L | E-L, E-Q; G-L |
| card:Weapon | 131,160,C1 | WQ | E-Q; G-Q |
| card:Armor | C1 | AQ | E-Q; G-Q |
| card:Dmg | 131,160,C1 | Q | No cast; external state writer G-X |
| global:gameVersion | 131,160,C1 | Q | Calculator query choice, no unit flag writer |
| global:trueLight | 131,160,C1 | X | 131/160 E-X city grant, other writers G-X; C1 matrix offered/card hidden, suppressed as recorded in DOS consumers |
| global:darkness | 131,160,C1 | X | E-X city/global grants; original cast writer G-X |
| global:wallOfFire | 131,160,C1 | X | G-X |
| global:warpReality | 131,160,C1 | X | G-X |
| global:hurricane | 131,160,C1 | X | G-X: offered by matrix in DOS; card hides; numeric suppression recorded in DOS consumers |
| global:poxHost | 131,160,C1 | X | G-X: offered by matrix in DOS; card hides; numeric suppression recorded in DOS consumers |
| global:chaosSurge | 131,160,C1 | X | G-X |
| global:nodeAura | 131,160,C1 | X | G-X |
| global:rangedCheck | 131,160,C1 | Q | Calculator attack-mode choice, no unit flag writer |
| global:rangedDist | 131,160,C1 | Q | No cast; external distance input, engine producer G-X |

E-G denotes the keyed additional-grants table immediately above. Its coverage is confined to the listed sources/targets and versions; it is not a claim of complete grant closure for any ability.

### Handoff to reconciliation

F250.3 already owns the DOS eight curse flags and True Sight: use E-S to narrow its Shatter work to remaining context, not reconstruct the already-present class-16 body again. F250.4 owns Illusion refusal. F277.1 owns CP160/C1 Specials constructor/recompute argument and repeated-pass coverage; other reset/retain and caller questions are split below. F279.1f must route G-C outside F250.3, G-CC outer targeting, G-I/G-Q/G-L detailed writer closure, G-X external producers and universal cast/recalc timing before design/pilot dependencies are treated as met. These are gap proposals for that authorized reconciliation, not newly filed tasks.

The existing code comments in stats_identity.js claiming there is no DOS curse writer conflict with E-S; its comments treating a battle aggregate as proof of permanent storage also need source-specific narrowing. The Blur tooltip in enchantments.js still calls DOS Blur a unit-owned enchantment; F279.1f must route that conflicting wording alongside the already corrected inventory meaning (U3 below). No calculator code or provenance status changed in this census.

## Modern admission and grant/clear writers (F279.1c)

This section binds every modern calculation row above separately to C2 and W. A dash means the surface does not offer that version. The calculator map is an observation of executable code, not proof of an engine writer. An input retained in an ability/context map is **not** an admitted engine flag. Later numeric/ability consumers and all their pass predicates belong to F279.1e.

### Current calculator admission and destination map

All definition rows first pass the version gate in ability_gating.js. ui_abilities.js/readAbilities and card_state.js/cardStateToDerivationInput put the row's exact calc key into innateAbilities or markedAbilities; stats.js/deriveUnitStats merges these into suppliedAbilities, applies its named pre-sequence transforms, then constructs effectiveAbilities. Matrix side properties use the same projection. The separate global reader exception remains as recorded above. These are concrete current input writers; they are not missing engine evidence.

| Code | Current admission, write and execution position (Calculator/ paths) |
|---|---|
| I | Innate input, no cast validation. stats.js/deriveUnitStats and stats_identity.js/seedNonStatRecordFields seed listed non-stat fields from innateAbilities (with explicit transform overrides); baseStatSteps and getAbilityStatSteps carry numeric fields. Unseeded values stay in effectiveAbilities. Selection does not prove the engine's original ability writer. |
| O | Mark/context passes into suppliedAbilities → effectiveAbilities without a dedicated cast-admission write. Its subsequent effect predicates in stats.js, stats_sequence.js or combat_abilities.js are consumers, to be traced in .1e. This records the absence of a cast executor for this row, not an unknown current-code location. |
| B | stats_identity.js/permanentCastFlagSteps, buffs:<key>:cast: marked key alone admits a true flag on running u before a:baseCopy. Invisibility uses a set preserving an innate true value. No target-record eligibility is tested. |
| M | stats_identity.js/markedImmunitySteps, immunities:<key>:marked: marked key alone writes magicImmunity or missileImmunity on pre-copy u. Guardian Wind and Hillfort share missileImmunity; neither has its own target gate here. |
| D | stats_identity.js/curseCastSteps writes <key>=true in debuffs. Reads pre-copy u.magicImmunity and, for Mind Storm/Vertigo, u.illusionImmunity or u.trueSight; W also reads the external Eye of Heaven mark. No normal-unit gate is applied to C2 Shatter here. Eight common flags; W adds Nausea. |
| DC | permanentCastFlagSteps/disciplineCastTargetAdmitted: marked combat/overland option; pre-copy u.fantastic must be false, C2 also requires !u.ishero. Writes the selected discipline value in buffs. W does not exclude heroes. |
| SL | O plus identityConversionSteps/buffs:spiritLink:fantastic clears pre-copy Fantastic when true; stats_sequence.js/baseStatSteps writes level/Sapiens under that gate and Resistance for the mark. |
| DE | O plus identityConversionSteps/buffs:destiny and baseStatSteps/buffs:destiny:level; destinyActiveForUnit decides from the mark/version, then writes Life/Fantastic/level. These currently precede baseCopy although the engine writes them inside recalculation. |
| RE | B for rebuild, plus combat_abilities.js/getAbilityStatSteps buffs:rebuild permanent stat/custom-attribute package and combat_effects.js/applyRebuildEffects derived abilities; non-hero package differs from hero. |
| TE | permanentCastFlagSteps buffs:transmuteEquipment:cast requires marked && !u.fantastic; materials additionally !u.ishero, writes adamantium/orihalcon on pre-copy u. |
| RU | stats.js/rustActiveAt requires W mark and !permanentFantasticAt(u,ctx). stats_sequence.js/debuffs:rust:material resets only weaponMaterial. The engine normal-unit gate instead reads calculated Fantastic; other six clears (including the Orihalcon armor clear) remain unrepresented here. |
| LS | stats_identity.js/lavaSmelterGrantSteps: mark and initial non-Fantastic type admit training writes on pre-copy u: weaponImmunity, missileImmunity, resistElements, elementalArmor or fieryBlade. Actual script resource/building prerequisites are represented by the requested option, not reconstructed from city inputs. |
| SB | O plus stats_identity.js/applySanctaBasilicaGrant before sequence: W, marked, High Men, non-hero, Clergy/name Crusaders/name Paladins; writes sanctify and respective lucky/magicImmunity in map. Current Sanctify grant is broader than source unit-id branches. |
| PF | O plus stats_identity.js/applyPillarOfFaithGrant: W and mark add lucky/luckyPhaseBase to map before sequence. |
| MP | O plus stats_identity.js/deriveMarionettePackage, marionetteOwnedGrantStep and stats_sequence.js/precalcScriptStatSteps: hero-type 48/state/owner/book/retort tests select package; map preparation and positioned b writes. Inputs are wizard/package context, not independent casts. |
| OR | O plus stats_identity.js/deriveOutlanderReformRecord prepares research predicates from outlanderWizard && reform mark. training armorclad/powerEngine/magitekScience/militaryDrilling/temporalDrive writes run on pre-copy u; b/d consumers use outlanderSapiensAt, outlanderBattleArmorAt and outlanderCombatSoldierAt. Those later gates must not be called cast admission. |
| P | card_state.js/cardStateToDerivationInput writes identity/base/modernAttacks fields; stats_identity.js/unitIdentityRecordSeed and stats_sequence.js/baseStatSteps seed corresponding u fields. No cast. |
| L | baseStatSteps/training:veterancy: modern selected level admitted, invalid vocabulary throws; writes u.level (hero levels are not offered by the control). |
| WQ | baseStatSteps/training:weaponQuality: selected material, initial non-Fantastic gate (construct summon handled separately), writes u.weaponMaterial. |
| AQ | baseStatSteps/training:armorQuality: selected material and initial non-Fantastic/non-hero gate, writes u.armorMaterial. |
| X | collectGlobals/cardStateToDerivationInput or matrix globals supplies context, no unit-target admission or unit flag grant. Original engine producer remains separately identified/gapped below. |
| Q | Query, starting damage or wall/distance context projected by card_state.js; no attempted cast or unit enchantment writer. |

`u` before the copy is the calculator's working permanent state. stats_sequence.js/a:baseCopy publishes ctx.base and subsequent sequence writes operate on the calculated working record. This is one current execution, not one per attempted cast. Persistence and destination objects suffice; the distinction needed for scheduling is cast application versus recalculation.

### Modern input-field destinations

The DOS section's current input-writer map is shared for its first three ability groups (excluding DOS-only dispelEvil), identity inputs and Atk/Def/Res/HP; this avoids a second copy of those assignments. Modern additions: **mechanical, flying, sapiens, rage, bloodSucker** are same-named boolean fields seeded by seedNonStatRecordFields; **merging, teleporting, amplifier, clergy, sailing** stay as same-named ability-map values. Modern doomGaze is seeded by template:stat:base, independently of the ranged channel. Modern gaze/touch inputs do not use cardDosSpecialAbilities.

ModernRangedType/ModernRanged/ModernThrown/ModernFireBreath/ModernLightningBreath enter modernAttacks in card_state.js; stats.js builds one channel descriptor per attack kind and template:stat:base writes each descriptor's strengthField/rangedTypeField/thrownTypeField on statRecord. HitChance → template:baseHitChance/toHit; HitMelee → template:baseThresholds/toHitMelee; HitRanged/HitThrown/HitBreath → that step's secondaryHitTargets fields selected by kindAt; ToBlkMod → toBlk. Figs seeds the separate figureUnit.figs record, which has modern figure modifier steps after the main run. These are current-code assignments, independent of MG-origin's question about the engine's construction writers.

### Existing modern source evidence and explicit limits

F250.1's [eleven-key INI qualification](Caster%20binary/F250.1.spell-classification.evidence.md) supplies exact modern record spans and missing-NonMagic evidence. This is metadata only: the legend's default does not establish every handler's admission, any DOS classification, or a cast backing store. The three Warp controls share [89] with no EnchantmentID. The completed [F250.4 script reconciliation](Caster%20binary/F250.4.script-reconciliation.md) identifies Conjuring Pact [343]/EncConjuringPact94 as the backing spell for the synthetic nausea input, with NonMagic=True; it also reconciles Rebuild and Eye of Heaven writers, selectors and hooks. Their remaining representation/outer timing stays with the existing migration slices. Existing MG-target/MG-cast/MG-time gaps remain open. F250.2's [first combat subunit](Caster%20binary/F250.2.combat.evidence.md) establishes generic and Warp stores in BaseUnits.CombatEnchantmentFlags; existing accessor and recalculation evidence identifies the containing persistent object and its copy/aggregation into Units. The base enchantment layer uses a different displacement. The [37-instruction overland store](Caster%20binary/F250.2.overland-store.evidence.md) now establishes the BaseUnits overland-layer producer. Runtime binding, complete admission and specifically needed later/caller facts remain open.

**MT**: existing F264.1 address-backed target extent, ValidUnitSpellTarget $0053DB78..$0053E216. Group 15 reads BaseUnits.Fantastic at $0053DCC5; group 16 reads Units.Fantastic at $0053DD20. NonHero reads BaseUnits.ishero $0053DF71. Owner checks read Units.owner; duplicate flags read BaseUnits.OverlandEnchantmentFlags and CombatEnchantmentFlags ($0053E050/$0053E090). This is a last-matching-result ladder; these partial tests do not imply final eligibility. The combat head routes groups {1,13,14,15,16} or ids {5,68,89,125,148}; existing F254.1 overland routing reads groups {1,15} or ids {93,173}. Warp Creature id 89 therefore enters combat unit targeting despite group 5. Other paths are not inferred from these sets. Its human/AI/cursor caller paths establish cast-time use, not a recalculation boundary. Uncovered realm/immunity tail and earlier combat ward/visibility arms remain **MG-target**. INI: version-specific spell metadata below comes from each shipped spells.ini section; absent NonHero is not reported as a positive exclusion.

**MG-cast**: original compiled cast flag grant/clear store and its complete target/dispatch path are not mapped by the extents cited here; scripted supplements below narrow this gap where stated. Aggregate flag readers do not prove a permanent cast writer. **MG-time**: a complete cast → recalculation → next-target-check schedule is not established. Applies to every cast row, including ones with a known script body. No new binary reconstruction was performed. **MG-origin**: original roster/training/custom-state writer closure not established here. **MG-context**: original wizard/city/global/army-state producer and all alternate grant paths not closed. These are engine-evidence gaps, not deferred current-input mapping. Generic gaps do not assert the relevant code does not exist elsewhere in the repository.

**MR**: Units.RecalculateUnits.pas/RecalculateUnits is the existing compiled source for both modern configurations. It copies Units[i] := BaseUnits[i] ($00599A8D..$00599B30), aggregates enchantment layers, invokes the early script, runs compiled magic calculation, re-aggregates layers at $0059DCF2..$0059DDC3, invokes the late script and runs the tail. The modern consumer section records the current pass readers; MC-gap retains unidentified original branches. Base CoM2 MODDING.INI sets UnitRecalculateEnabled=0, while its creation and Mystic Surge scripts remain active. Base CoM2's shipped UnitCalcPre.CAS is commented example plus HALT, and UnitCalc.CAS starts HALT; its example writes are not active Warlord behavior.

| Evidence code / source control → target | Existing source writer, destination and execution; remaining limits |
|---|---|
| MR-DE: destiny/apotheosis → permanent identity/level | MR $0059A390..$0059A471: aggregated EncDestiny causes B.race=19, B.Fantastic=true, B.attackflags.supernatural=true, B.experience=0, B.level=1, **during recalculation after early hook**, in both configurations. Initial cast grant remains MG-cast. |
| MR-U: bloodLust/animated → undead | MR $0059F5DC..$0059F747 Blood Lust writes B.EnchantmentFlags[EncUndead] and U aggregate; $0059F7D8..$0059FBD0 Animated writes B flag and U aggregate. Normalization $0059FBD0..$0059FD93 grants calculated Death/Cold/Illusion immunities, race/Fantastic/no-healing and clears Create Outpost. W's Frenzy mapping is late (UnitCalc.CAS), so do not treat its UI Blood Lust mark as entering the earlier compiled Blood Lust block. |
| MR-HW: unexposed Holy Arms → holyWeapon | MR $005A100D..$005A10EC: U.owner !=15, owning wizard GEHolyArms and !B.Fantastic set **U.EnchantmentFlags[EncHolyWeapon]**. Does not locate Holy Weapon's cast writer. Current hwActive in stats.js reads mark; no Holy Arms input. |
| MR-A: enchantments/items → abilities | MR True Sight → U.illusionimmunity ($0059E810..$0059E86A); Wraith Form → U.noncorporeal/weaponimmunity; Guardian Wind → U.missileImmunity $0059FD93..$0059FDED; Magic Immunity → U.magicimmunity $0059FDED..$0059FE47; Immolation → U.immolation and U.coldimmunity $005A00E7..$005A016D. Item-power branch fills U.ItemEnchantmentFlags (Bless, True Sight, Lionheart, Invulnerability, Wraith Form, Elements, Guardian Wind and others). These are alternate producers during recalculation, not original casts. Current additional derived ability writers include combat_effects.js/applyUndeadImmunities, applyAnimatedEffects and getAbilityStatSteps; .1e traces their ordering. |
| MR-G: card:SpecialUnit Golem → elemArmor | MR after first aggregation writes U.ItemEnchantmentFlags[EncResistElements] for B.unittype Golem; no immediate re-aggregation before early hook. Current stats.js forces suppliedAbilities.elemArmor=resistElements before sequence. A derived item-layer write does not demonstrate a cast clearing Elemental Armor. |
| MR-other: external state → permanent writes | MR clears B.OverlandEnchantmentFlags[EncHeroism] when B.level>=4; writes/clears B Hovering layers; resets/sets B.PandoraBoxBudget; post-hook tail writes B.combatmovesleft, B.Overdamage/B.Totaldamage. These persist through future recalculations. Not all are exposed controls; ignore neither their destination nor their call frequency when designing the executor. |
| WS-SL: spiritLink | OLSpell.CAS!NOTSENTIENTGRANTING!-10 "SETOLENCHANTMENTFLAG(TU,EncSpiritLink,1,0);": clears permanent overland layer, sets permanent aggregate, +2 permanent Resistance; under BASEFANTASTIC(TU), writes Sapiens label 14, clears Fantastic, resets level. Outer target validation and timing MG-target/MG-time. |
| WS-RE: rebuild | OLSpell.CAS!NOTREBUILD!-14 "SETOLENCHANTMENTFLAG(TU,EncRebuild,1,0);": converts overland flag to permanent aggregate; non-hero branch writes permanent custom attribute Mechanical, attack/defense +2, melee Armor Piercing, Illusion/Death immunity. Hero branch does not receive those persistent writes. MG-target/MG-time. |
| WS-TE: transmuteEquipment | OLSpell.CAS!NOTTRANSMUTEEQUIPMENT!-10 "SETOLENCHANTMENTFLAG(TU,EncTransmuteEquipment,1,0);": converts overland flag to permanent aggregate; non-heroes receive EncMagic/Adamant/Orihalcon. Group-15 target term MT; MG-target/MG-time. |
| WS-RU: rust → materials/Elements/flameBlade/guardianWind/transmuteEquipment | COSpell.CAS!NOTRUST!-13 "SETENCHANTMENTFLAG(TU,EncMagic,1,0);": after calculated Resistance−3 random checks and wizard Fate Mastery, clears nine permanent aggregate flags (Magic/Mithril/Adamant/Orihalcon/TransmuteEquipment/ResistElements/ElementalArmor/FlameBlade/GuardianWind). No ability-immunity field clear is implied. MT group16 calculated Fantastic; MG-time and remaining targeting apply. The separate failed-save curse layer is not established by these nine clears. |
| WS-UV: vampirism/revenant → undead | OLSpell.CAS!NOTVAMPIRISM!-5 "SETENCHANTMENTFLAG(TU,EncUndead,1,1);" sets permanent Undead and transfers Vampirism to permanent aggregate; COSpell.CAS~"IF (SP=SRevenant) THEN {" sets permanent Undead. UnitCalc.CAS!NOVAMPIRISM!-7 "SETENCHANTMENTFLAG(U,EncUndead,1,1)" repeats the permanent Undead write during late recalculation. F235 owns current omission from classifier input. |
| WS-HI: hierophany → own combat flag clear | COSpell.CAS!NOTHIEROPHANY!-15 "IF (SP<>SHierophany)" uses calculated Resistance, permanent EncUndead divisor and wizard Fate Mastery to clear permanent CombatEnchantmentFlags[EncHierophany] on resistance success. Late UnitCalc.CAS Hierophany ability stripping writes selector 0; current applyHierophanyAbilityStrip is a later ability-map projection. Full cast insertion MG-cast. |
| WS-CC: Power spells → packages and Chaos Channels | COSpell.CAS!POWEROFCHAOS!-4 "SETENCHANTMENTFLAG(TU,EncCCBreath,1,1);" grants all three permanent CC flags; Power of Death at COSpell.CAS!POWEROFDEATH!-3 "SETENCHANTMENTFLAG(TU,EncUndead,1,1);" grants multiple combat Death flags plus permanent Undead/Vampirism. Power of Life at COSpell.CAS!POWEROFLIFE!-10 "SETCOMBATENCHANTMENTFLAG(TU,EncHolyWeapon,1,1);" grants permanent combat-layer Endurance/Holy Armor/Holy Weapon/Heroism/True Sight/Lionheart/Invulnerability/Bless/Zeal/Discipline/Divine Protection. Power of Nature at COSpell.CAS!POWEROFNATURE! grants permanent combat-layer Resist Elements/Water Walking/Land Link/Elemental Armor/Iron Skin/Regeneration/Venom/Colossal Strength. Power of Sorcery at COSpell.CAS!POWEROFSORCERY! grants Haste/Resist Magic/Guardian Wind/Flight/Invisibility/Magic Immunity/Focus Magic/Planewalking in that layer. Power of Chaos additionally grants Flame Blade/Immolation/Insulation/Fiery Fury/Berserk in that layer before its permanent CC writes. These alternate source contexts are not the independent controls' original casts. |
| WS-EYE: eyeOfHeaven → trueSight | UnitCalcPre.CAS!ENDOFCOMBAT!+2..+4 ": New combat enchantment" "SETENCHANTMENTFLAG(U,EncTrueSight,0,1);" grants calculated True Sight from combat context. Current curse gate substitutes the Eye mark before this hook. Original context producer MG-context. |
| WS-LS: five lavaSmelter controls → abilities/flags | CreateUnit.CAS Lava Smelter block and OverlandEndTurn.CAS upgrade block: building/resource-pair tests grant permanent Weapon/Missile immunity or Resist Elements/Elemental Armor/Flame Blade. All five grants have existing individual source anchors on lavaSmelterGrantSteps. Original city/resource producers MG-context; remaining original upgrade/context closure is P6/P7 below. |
| WS-SB/PF: sanctaBasilica/pillarOfFaithLucky → abilities | CreateUnit.CAS Basilica unit-id branches grant Sanctify/Exorcise to 108/231, Lucky to 111, Magic Immunity to 113, all permanent. Pillar of Faith blocks in CreateUnit.CAS and OverlandEndTurn.CAS write permanent Lucky under their stored-faith gates. Current SB overgrant and PF boolean approximation need reconciliation, not inferred new cast gates. |
| WS-MP: Marionette wizard/books/ascension → packages | UnitCalcPre.CAS owned/strayed Marionette branches (herotype 48 and owner) write calculated abilities with SETSTAT selector 0 but permanent enchantment flags with SETENCHANTMENTFLAG selector 1 (Resist Magic, Bless, Invisibility, Rebuild, Transmute Equipment); Spell Lock instead uses SETOLENCHANTMENTFLAG selector 1, the permanent overland layer (also read by the strayed gate); marionetteOwnedGrantStep in stats_identity.js enumerates per-realm/book and retort grants. Life ascension writes calculated Exorcise −4 and permanent EncBless, not True Sight or Holy Weapon. Current b steps operate on the post-copy calculator record and do not carry these permanent flag mutations into another recalculation. Strayed grants include Rebuild/TransmuteEquipment/Spell Lock. Original wizard/hero context producers MG-context. |
| WS-OR: Outlander reforms → abilities/flags | CreateUnit.CAS creation and OverlandEndTurn.CAS upgrade write permanent Armorclad, Power Engine, Resist Magic, Discipline; Anti-Gravity Drive grants permanent Haste, Flying, Illusion Immunity. UnitCalcPre.CAS Magitek Engine grants calculated Large Shield; UnitCalc.CAS combat override grants calculated Doom. Current exact positioned writers are OR; original research state producers MG-context. |
| WS-B: buildings/natural resources → permanent stats | CreateUnit.CAS unique-building/resource blocks and OverlandEndTurn.CAS upgrade blocks are existing source bodies. Current stats.js gates named altarOfTheMoon/Sun, dragonMound, ludusAgoge, motherFungus, poolOfRepentance, sanctaBasilica add race/non-hero/name restrictions; source instead tests actual city building/type and has unit-id branches. F213 owns this discrepancy. Individual current numeric writers are in the modern consumer table; original city/resource producer MG-context. |
| WS-TM: Tattoo Magic research → ten exposed spell rows | OLSpell.CAS!NOPERMENCHANT!-74 "IF (SPELLSTATE(W,STattooMagic)<>2) THEN { GOTO" gates the scripted overland cast transfer: Resist Elements, Resist Magic, Guardian Wind, Fiery Fury, Bless, Holy Weapon, Holy Armor, Cloak of Fear, Wraith Form, Tactical Drill. SETENCHANTMENTFLAG selector 1 sets the permanent aggregate; SETOLENCHANTMENTFLAG selector 1 clears its overland source. Holy Armor writes EncDummyArmor, clears EncHolyArmor; Tactical Drill writes EncDiscipline, clears EncDisciplineOld. This establishes the research-conditioned alternate cast writer, not the unrestricted default cast backing store. There is no Tattoo Magic control; current B/M/O/DC input paths do not test that research. |
| WS-CS: combat-summon creation context → Elements/Bless/Holy Armor | COSpell.CAS~": New effect of Nature Embrace, Animist's Guild enchant unit with Resist Elements (not permanent) :" and the immediately following Consecration/Crusade blocks: wizard globals and HQ buildings/city enchantment grant NEWU Resist Elements, Bless and Holy Armor. With Tattoo Magic, write permanent aggregate (Holy Armor uses EncDummyArmor); otherwise write permanent object's overland layer (EncHolyArmor). These are creation grants, not direct casts on the selected unit; current independent marks do not synthesize these HQ contexts. |
| WS-IN: Submarine → invisibility | CreateUnit.CAS~": Submarine get innate invisibility :" tests permanent type 361 and absence of permanent EncInvisibility, then sets that permanent flag. Current innate Invisibility input and B marked write are distinct sources; no separate Submarine creation step is modeled. |
| WS-N: nausea | UnitCalcPre.CAS!NOBERSERK! reads permanent combat EncConjuringPact, then calculated FANTASTIC(U): the Fantastic arm sets permanent combat EncCreatureBinding; the other arm writes calculated To-Hit/To-Defend −10. There is no standalone Nausea flag writer in this block. Current D invents a carried nausea flag; source admission of Conjuring Pact and caller timing remain MG-cast/MG-time. The inventory's cast label is a current-request description, not proof of a Nausea spell. |
| WS-GL: card:Unit Glider → guardianWind | UnitCalcPre.CAS~"SETENCHANTMENTFLAG(U,EncGuardianWind,1,1)" reasserts permanent EncGuardianWind for permanent type 360 if absent, during overland recalculation on the owner's turn only (the NOTCOMBAT path and OVERLANDACTIVEPLAYER=W gate). CreateUnit.CAS~": Glider get innate guardian wind :" also writes the permanent flag for type 360 when absent at creation. Current markedImmunitySteps only handles the input mark; it has no Glider-specific repeat writer. A permanent re-grant can occur on that overland path; this is not a combat-recalculation re-grant. Exact cast/caller timing remains MG-time. |
| MR-K: rulerOfUnderworld → wraithForm | MR $0059EA93..$0059EB4D: valid U.owner, Iscombat and owning wizard GEKingOfUnderworld set U.EnchantmentFlags[EncWraithForm]. The following Wraith Form block writes calculated abilities. Current rulerOfUnderworld mark remains O; original wizard-global producer MG-context. |
| MS-C2: mysticSurge → random grants (C2 only) | Both versions' MODDING.INI bind MysticSurgeScript=SpellMysticSurge, but their bodies differ. Reference docs/Script source/CoM2 1.05.11 base/SpellMysticSurge.CAS~"R=RND(33)+1;": random loop sets permanent aggregate Mithril/Adamant; permanent overland-layer Orihalcon/CCBreath; permanent combat-layer WarpResist/Haste/WaterWalking/LandLink/ElementalArmor/IronSkin/Regeneration/ResistMagic/GuardianWind/SpellLock/Flight/MagicImmunity/FlameBlade/Immolation/Endurance/HolyArmor/HolyWeapon/Heroism/TrueSight/Lionheart/Invulnerability/CloakofFear/WraithForm/BloodLust/FocusMagic/Animated/Bless. It then writes permanent combat EncNoHeal. ABase=1 in that set's MASTER.CAS. Current O Mystic Surge does not execute this random grant loop; selected effects are separate inputs. Complete outer caller timing remains MG-time. |
| MS-W: mysticSurge → random grants (W only) | SpellMysticSurge.CAS~"R=RND(46)+1;": random permanent combat-layer ResistElements/Haste/WaterWalking/CloakofFear/ElementalArmor/IronSkin/DivineProtection/Regeneration/GuardianWind/SpellLock/Flight/MagicImmunity/WraithForm/Immolation/Endurance/HolyArmor/HolyWeapon/Heroism/TrueSight/Lionheart/Invulnerability/LandLink/FlameBlade/BloodLust/FocusMagic/Bless/Discipline/Zeal/Venom/ColossalStrength/Insulation/BlazeOfGlory/ShadowStrike/Planewalking/ResistMagic/Berserk. Permanent aggregate branches grant all three CC flags, Mithril/Adamant/Orihalcon, Spirit Link (permanent Resistance +2 and Fantastic/level writes under BASEFANTASTIC), non-hero Rebuild package, Vampirism/Undead. Tail can set permanent TransmuteEquipment from Adamant+Orihalcon and complete CC flags under Doom Mastery. **W's NoHeal write is commented out**, unlike C2. The literal EncBloodLust grant is not the ordinary W Frenzy/EncFrenzy source; P7/P9 retain its separate original-flag mapping. Current O does not run this random loop; outer timing MG-time. |
| SC-Q: card:Weapon/Armor/Level, CC creation sources (C2 and W separately) | C2: Reference docs/Script source/CoM2 1.05.11 base/CreateUnit.CAS~"IF RETORT(W,ALCHEMY)" grants permanent Magic (non-Barbarian); Philosopher Stone or unblocked Alchemist Guild gate the Magic/Mithril/Adamant/Orihalcon ore block. Doom Mastery calls APPLYCHAOSCHANNEL (helper flag-choice details remain a gap). Evil Presence gates permanent ALevel 4/3/2 from Altar of Battle/War College/Barracks. W: CreateUnit.CAS!NOLOGISTIC! adds Artificer, city-enchantment and Strategic Logistic/resource tests around permanent material writes; CreateUnit.CAS!NOMECHUPGRADE! contains the later Chaos Rift permanent WarpAttack/Defense/Resist random grant and the level 4/3/2 block. W's Chaos Bless + Doom Mastery creation branch explicitly sets all three permanent CC flags; other branches call APPLYCHAOSCHANNEL. These bodies narrow MG-origin but do not reconstruct every construction/XP writer. Current WQ/AQ/L are direct selected-material/level writes; independent CC/Warp marks do not reproduce those source contexts. |
| WS-HA: hero abilities → permanent flags during early recalculation | UnitCalcPre.CAS!NOTMARIONETTE! through UnitCalcPre.CAS!NOTDEATHLORD! contains Righteous Ward, Arcane Ward, Chaos Boon and Death Ascension rank/absent-flag gates: permanent aggregate Bless/DummyArmor/DivineProtection/TrueSight/Invulnerability/MagicImmunity/ResistMagic/ResistElements/ElementalArmor/IronSkin/Insulation/Invisibility/FieryFury/Immolation/Berserk/SpiritLink/CCBreath/CCArmor/CCFlight/CloakofFear/WraithForm/ShadowStrike/Frenzy/Revenant. Spirit Link grants permanent Resistance +2 only when its flag is absent. These checks run on recalculation; a flag already present does not receive another grant. The same blocks also have calculated SETSTAT identity/ability writes. This is hero-ability context, not equipment. Current input marks/seeds do not reproduce these unexposed hero-rank grant checks; their original hero-ability producers remain MG-context, routed to P7; current readers are in the modern consumer table. |
| MR-time | MR wrapper $00648734 forwards arguments; RecalculateunitsonCityTile calls with false and city plane/x/y at $005A8CFA. These establish two particular invocation routes. Neither establishes a full recalculation before each cast. Script selector 1 names the permanent object even inside early/late recalculation hooks; selector 0 names the calculated object. |

### Modern row bindings

Each non-dash cell is independent version coverage. INI metadata names the shipped spell configuration; MT supplies only the unit-target tests explicitly described above. It is a partial eligibility locator only; it does not close MG-target, MG-cast or MG-time. I and P rows have MR copy as a known writer and MG-origin for original construction. O rows explicitly have no separate current cast writer. X/Q are external context/query writers, not undocumented unit casts. Supplemental evidence codes bind all affected targets named in the preceding table, including ability aliases.

| Stable control key | C2 current / engine evidence or gap | W current / engine evidence or gap |
|---|---|---|
| ability:stoningGaze | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:stoningTouch | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:deathGaze | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:deathTouch | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:doomGaze | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:lifeSteal | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:poison | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:holyBonus | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:resistanceToAll | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:exorcise | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:destruction | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:armorPiercing | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:lightningResist | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:caster | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:longRange | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:fear | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:lucky | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:charmed | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:magicImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:coldImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:missileImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:deathImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:merging | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:negateFirstStrike | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:doom | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:nonCorporeal | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:fireImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:poisonImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:firstStrike | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:stoningImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:illusion | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:supernatural | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:illusionImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:teleporting | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:immolation | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:undead | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:invisibility | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:weaponImmunity | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:largeShield | I; MR copy; MG-origin; additional grants above where named | I; MR copy; MG-origin; additional grants above where named |
| ability:amplifier | — | I; MR copy; MG-origin; additional grants above where named |
| ability:mechanical | — | I; MR copy; MG-origin; additional grants above where named |
| ability:bloodSucker | — | I; MR copy; MG-origin; additional grants above where named |
| ability:rage | — | I; MR copy; MG-origin; additional grants above where named |
| ability:clergy | — | I; MR copy; MG-origin; additional grants above where named |
| ability:sailing | — | I; MR copy; MG-origin; additional grants above where named |
| ability:flying | — | I; MR copy; MG-origin; additional grants above where named |
| ability:sapiens | — | I; MR copy; MG-origin; additional grants above where named |
| enchantment:combatSummoned | O; MG-context | O; MG-context |
| enchantment:resistanceToAll | O; MG-context | O; MG-context |
| enchantment:holyBonus | O; MG-context | O; MG-context |
| enchantment:elemArmor | O; MR-G; INI spells.ini [2] group 1, [21] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; MR-G; WS-LS; WS-RU; WS-TM; WS-CS; INI spells.ini [2] group 1, [21] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA; MS-W |
| enchantment:prayer | O; INI spells.ini [140] group 10; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [140] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:highPrayer | O; INI spells.ini [151] group 10; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [151] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:trueSight | B; MR-A; INI spells.ini [131] group 1; MG-target/MG-cast/MG-time; MS-C2 | B; MR-A; WS-EYE; WS-CC; INI spells.ini [131] group 1; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:bless | B; INI spells.ini [121] group 1; MG-target/MG-cast/MG-time; MS-C2 | B; WS-MP; WS-TM; WS-CS; WS-CC; INI spells.ini [121] group 1; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:invulnerability | O; MR-A; INI spells.ini [143] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; MR-A; WS-CC; INI spells.ini [143] group 1; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:holyWeapon | O; MR-HW; INI spells.ini [124] group 15; MG-target/MG-cast/MG-time; MS-C2 | O; MR-HW; WS-CC; WS-TM; INI spells.ini [124] group 15; MG-target/MG-cast/MG-time; MS-W |
| enchantment:lionheart | O; INI spells.ini [141] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; WS-CC; INI spells.ini [141] group 1; MG-target/MG-cast/MG-time; MS-W |
| enchantment:holyArmor | O; INI spells.ini [126] group 15; MG-target/MG-cast/MG-time; MS-C2 | O; WS-TM; WS-CS; WS-CC; INI spells.ini [126] group 15; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:charmOfLife | O; INI spells.ini [160] group 9; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [160] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:fear | O; INI spells.ini [164] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; WS-TM; WS-CC; INI spells.ini [164] group 1; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:undead | O; MR-U; spell-table binding unresolved; MG-target/MG-cast/MG-time | O; MR-U; WS-UV; spell-table binding unresolved; MG-target/MG-cast/MG-time; MS-W |
| enchantment:animated | O; MR-U; INI spells.ini [195] group 5; MG-target/MG-cast/MG-time (outside MT head routing; other targeting path unresolved); MS-C2 | O; MR-U; INI spells.ini [195] group 5; MG-target/MG-cast/MG-time (outside MT head routing; other targeting path unresolved) |
| enchantment:blackSleep | D; INI spells.ini [165] group 13; MG-target/MG-cast/MG-time | D; INI spells.ini [165] group 13; MG-target/MG-cast/MG-time |
| enchantment:blackPrayer | O; INI spells.ini [174] group 10; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [174] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:raiseDead | O; INI spells.ini [137] group 5; MG-target/MG-cast/MG-time (outside MT head routing; other targeting path unresolved) | O; INI spells.ini [137] group 5; MG-target/MG-cast/MG-time (outside MT head routing; other targeting path unresolved) |
| enchantment:weakness | D; INI spells.ini [162] group 13; MG-target/MG-cast/MG-time | D; INI spells.ini [162] group 14; MG-target/MG-cast/MG-time |
| enchantment:wraithForm | O; MR-A; MR-K; INI spells.ini [168] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; MR-A; MR-K; WS-TM; WS-CC; INI spells.ini [168] group 1; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:eternalNight | O; INI spells.ini [197] group 9; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [197] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:ccDefense | O; INI spells.ini [93] group 5; MG-target/MG-cast/MG-time; SC-Q | O; WS-CC; INI spells.ini [93] group 5; MG-target/MG-cast/MG-time; WS-HA; SC-Q; MS-W |
| enchantment:ccFireBreath | O; INI spells.ini [93] group 5; MG-target/MG-cast/MG-time; SC-Q; MS-C2 | O; WS-CC; INI spells.ini [93] group 5; MG-target/MG-cast/MG-time; WS-HA; SC-Q; MS-W |
| enchantment:ccFlight | O; INI spells.ini [93] group 5; MG-target/MG-cast/MG-time; SC-Q | O; WS-CC; INI spells.ini [93] group 5; MG-target/MG-cast/MG-time; WS-HA; SC-Q; MS-W |
| enchantment:immolation | O; MR-A; INI spells.ini [99] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; MR-A; INI spells.ini [99] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA; MS-W |
| enchantment:flameBlade | O; INI spells.ini [86] group 15; MG-target/MG-cast/MG-time; MS-C2 | — |
| enchantment:shatter | D; INI spells.ini [88] group 16; MG-target/MG-cast/MG-time | D; INI spells.ini [272] group 13; MG-target/MG-cast/MG-time |
| enchantment:warpAttack | D; INI spells.ini [89] group 5; MG-target/MG-cast/MG-time | D; INI spells.ini [89] group 5; MG-target/MG-cast/MG-time; SC-Q |
| enchantment:warpDefense | D; INI spells.ini [89] group 5; MG-target/MG-cast/MG-time | D; INI spells.ini [89] group 5; MG-target/MG-cast/MG-time; SC-Q |
| enchantment:warpResist | D; INI spells.ini [89] group 5; MG-target/MG-cast/MG-time; MS-C2 | D; INI spells.ini [89] group 5; MG-target/MG-cast/MG-time; SC-Q |
| enchantment:ironSkin | O; INI spells.ini [24] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; INI spells.ini [24] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA; MS-W |
| enchantment:invisibility | B; INI spells.ini [62] group 1; MG-target/MG-cast/MG-time | B; WS-MP; WS-IN; INI spells.ini [62] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA |
| enchantment:magicImmunity | M; MR-A; INI spells.ini [69] group 1; MG-target/MG-cast/MG-time; MS-C2 | M; MR-A; WS-SB/PF; INI spells.ini [69] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA; MS-W |
| enchantment:guardianWind | M; MR-A; INI spells.ini [44] group 1; MG-target/MG-cast/MG-time; MS-C2 | M; MR-A; WS-RU; WS-GL; WS-TM; INI spells.ini [44] group 1; MG-target/MG-cast/MG-time; WS-CC; MS-W |
| enchantment:blur | O; MG-context | O; MG-context |
| enchantment:resistMagic | B; INI spells.ini [41] group 1; MG-target/MG-cast/MG-time; MS-C2 | B; WS-OR; WS-MP; WS-TM; INI spells.ini [41] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA; MS-W |
| enchantment:haste | B; INI spells.ini [77] group 1; MG-target/MG-cast/MG-time; MS-C2 | B; WS-OR; INI spells.ini [77] group 1; MG-target/MG-cast/MG-time; WS-CC; MS-W |
| enchantment:vertigo | D; INI spells.ini [53] group 13; MG-target/MG-cast/MG-time | D; INI spells.ini [53] group 13; MG-target/MG-cast/MG-time |
| enchantment:mindStorm | D; INI spells.ini [67] group 14; MG-target/MG-cast/MG-time | D; INI spells.ini [67] group 14; MG-target/MG-cast/MG-time |
| enchantment:guardian | O; MG-context | O; MG-context |
| enchantment:tactician | O; MG-context | O; MG-context |
| enchantment:supremeLight | O; INI spells.ini [152] group 10; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [152] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:endurance | O; INI spells.ini [123] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; WS-CC; INI spells.ini [123] group 1; MG-target/MG-cast/MG-time; MS-W |
| enchantment:bloodLust | O; MR-U; INI spells.ini [179] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; MR-U; INI spells.ini [179] group 1; MG-target/MG-cast/MG-time; WS-HA; MS-W; WS-CC |
| enchantment:mysticSurge | O; INI spells.ini [94] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; INI spells.ini [94] group 1; MG-target/MG-cast/MG-time; MS-W |
| enchantment:blazingMarch | O; INI spells.ini [102] group 10; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [102] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:survivalInstinct | O; INI spells.ini [28] group 9; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [28] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:landLinking | O; INI spells.ini [16] group 1; MG-target/MG-cast/MG-time; MS-C2 | — |
| enchantment:focusMagic | O; INI spells.ini [47] group 1; MG-target/MG-cast/MG-time; MS-C2 | O; INI spells.ini [47] group 1; MG-target/MG-cast/MG-time; WS-CC; MS-W |
| enchantment:spellLock | B; INI spells.ini [54] group 1; MG-target/MG-cast/MG-time; MS-C2 | B; WS-MP; INI spells.ini [54] group 1; MG-target/MG-cast/MG-time; MS-W |
| enchantment:discipline | DC; INI spells.ini [221] group 15 NonHero=True; MG-target/MG-cast/MG-time | — |
| enchantment:disciplineWarlord | — | DC; WS-OR; WS-TM; WS-CC; INI spells.ini [271] group 15, [221] group 15; MG-target/MG-cast/MG-time; MS-W |
| enchantment:breakthrough | O; MG-context | O; MG-context |
| enchantment:spellWard | O; MG-context | O; MG-context |
| enchantment:guidingBeaconAura | O; MG-context | O; MG-context |
| enchantment:prayermasterAura | O; MG-context | O; MG-context |
| enchantment:divineBarrierAura | O; MG-context | O; MG-context |
| enchantment:soulLinkerAura | O; MG-context | O; MG-context |
| enchantment:leadershipAura | O; MG-context | O; MG-context |
| enchantment:heavenlyLight | O; MG-context | O; MG-context |
| enchantment:darkForce | O; MG-context | O; MG-context |
| enchantment:badMoon | O; MG-context | O; MG-context |
| enchantment:goodMoon | O; MG-context | O; MG-context |
| enchantment:natureConjunction | O; MG-context | O; MG-context |
| enchantment:destiny | DE; MR-DE; INI spells.ini [229] group 15 NonHero=True; MG-target/MG-cast/MG-time | — |
| enchantment:rulerOfUnderworld | O; MR-K; INI spells.ini [225] group 9; MG-context/MG-time (context cast, no unit-target claim) | O; MR-K; INI spells.ini [225] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:mislead | O; INI spells.ini [230] group 16; MG-target/MG-cast/MG-time | — |
| enchantment:innerPower | O; INI spells.ini [228] group 9; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [228] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:blazingEyes | O; INI spells.ini [227] group 9; MG-context/MG-time (context cast, no unit-target claim) | — |
| enchantment:reinforceMagic | O; INI spells.ini [224] group 9; MG-context/MG-time (context cast, no unit-target claim) | O; INI spells.ini [224] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:apotheosis | — | DE; MR-DE; INI spells.ini [229] group 15 NonHero=True; MG-target/MG-cast/MG-time |
| enchantment:liability | — | O; INI spells.ini [230] group 16; MG-target/MG-cast/MG-time |
| enchantment:chaosEmbrace | — | O; INI spells.ini [227] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:natureLink | — | O; INI spells.ini [16] group 1; MG-target/MG-cast/MG-time; WS-CC; MS-W |
| enchantment:lavaSmelterWeaponImmunity | — | LS; WS-LS; MG-context |
| enchantment:lavaSmelterMissileImmunity | — | LS; WS-LS; MG-context |
| enchantment:lavaSmelterResistElements | — | LS; WS-LS; MG-context |
| enchantment:lavaSmelterElementalArmor | — | LS; WS-LS; MG-context |
| enchantment:lavaSmelterFieryBlade | — | LS; WS-LS; MG-context |
| enchantment:godsPlayDices | — | O; MG-context |
| enchantment:sageMaster | — | MP; WS-MP; MG-context |
| enchantment:astrologer | — | MP; WS-MP; MG-context |
| enchantment:charismatic | — | MP; WS-MP; MG-context |
| enchantment:enchanter | — | MP; WS-MP; MG-context |
| enchantment:channeler | — | MP; WS-MP; MG-context |
| enchantment:marionetteBaseSkill | — | MP; WS-MP; MG-context |
| enchantment:marionettePrimary | — | MP; WS-MP; MG-context |
| enchantment:marionetteNatureBooks | — | MP; WS-MP; MG-context |
| enchantment:marionetteSorceryBooks | — | MP; WS-MP; MG-context |
| enchantment:marionetteChaosBooks | — | MP; WS-MP; MG-context |
| enchantment:marionetteLifeBooks | — | MP; WS-MP; MG-context |
| enchantment:marionetteDeathBooks | — | MP; WS-MP; MG-context |
| enchantment:marionetteAscension | — | MP; WS-MP; MG-context |
| enchantment:marionetteConjurer | — | MP; WS-MP; MG-context |
| enchantment:pillarOfFaithRes | — | O; MG-context |
| enchantment:powerMinerals | — | O; WS-B; MG-context |
| enchantment:survivalInstinctToBlock | — | O; MG-context |
| enchantment:altarOfTheMoon | — | O; WS-B; MG-context |
| enchantment:altarOfTheSun | — | O; WS-B; MG-context |
| enchantment:alumniOfAcademy | — | O; WS-B; MG-context |
| enchantment:armorcladReform | — | OR; WS-OR; MG-context |
| enchantment:ballisticsTraining | — | OR; WS-OR; MG-context |
| enchantment:artificer | — | O; MG-context |
| enchantment:dragonMound | — | O; WS-B; MG-context |
| enchantment:energyBeamWeapons | — | OR; WS-OR; MG-context |
| enchantment:explosive | — | OR; WS-OR; MG-context |
| enchantment:favoredTerrain | — | O; MG-context |
| enchantment:fortification | — | O; MG-context |
| enchantment:heatPowerEngine | — | OR; WS-OR; MG-context |
| enchantment:hillfort | — | M; MG-context |
| enchantment:lightningBlade | — | O; WS-B; MG-context |
| enchantment:ludusAgoge | — | O; WS-B; MG-context |
| enchantment:magitekEngineering | — | OR; WS-OR; MG-context |
| enchantment:magitekScience | — | OR; WS-OR; MG-context |
| enchantment:malnourished | — | O; MG-context |
| enchantment:mechanicalExpert | — | O; MG-context |
| enchantment:militaryWorkshop | — | O; WS-B; MG-context |
| enchantment:militaryDrilling | — | OR; WS-OR; MG-context |
| enchantment:motherFungus | — | O; WS-B; MG-context |
| enchantment:pneumaReactor | — | OR; WS-OR; MG-context |
| enchantment:poolOfRepentance | — | O; WS-B; MG-context |
| enchantment:psychoConverter | — | OR; WS-OR; MG-context |
| enchantment:radio | — | OR; WS-OR; MG-context |
| enchantment:rocketry | — | OR; WS-OR; MG-context |
| enchantment:sanctaBasilica | — | SB; WS-SB/PF; MG-context |
| enchantment:temporalEngineering | — | OR; WS-OR; MG-context |
| enchantment:uphillBattle | — | O; MG-context |
| enchantment:xenopsychology | — | OR; WS-OR; MG-context |
| enchantment:xenoveterinary | — | OR; WS-OR; MG-context |
| enchantment:outlanderWizard | — | OR; WS-OR; MG-context |
| enchantment:flameBladeWarlord | — | O; INI spells.ini [281] group 15; MG-target/MG-cast/MG-time; WS-CC; WS-RU; MS-W |
| enchantment:rebuild | — | RE; WS-RE; WS-MP; INI spells.ini [338] group 1; MG-target/MG-cast/MG-time; MS-W |
| enchantment:spiritLink | — | SL; WS-SL; INI spells.ini [344] group 1; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:luckyStar | — | O; MG-context |
| enchantment:rally | — | O; INI spells.ini [345] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:nausea | — | D; WS-N; no standalone Nausea spell matched in shipped spells.ini; Conjuring Pact origin MG-cast/MG-time |
| enchantment:disheartenProphecy | — | O; INI spells.ini [342] group 3; MG-target/MG-cast/MG-time (outside MT head routing; other targeting path unresolved) |
| enchantment:divineProtection | — | O; WS-CC; INI spells.ini [278] group 15; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:angelicGuardians | — | O; INI spells.ini [261] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:eyeOfHeaven | — | O; WS-EYE; INI spells.ini [279] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:sanctify | — | O; INI spells.ini [138] group 1; MG-target/MG-cast/MG-time |
| enchantment:zeal | — | O; WS-CC; INI spells.ini [240] group 1; MG-target/MG-cast/MG-time; MS-W |
| enchantment:hierophany | — | O; WS-HI; INI spells.ini [239] group 14; MG-target/MG-cast/MG-time |
| enchantment:pillarOfFaithLucky | — | PF; WS-SB/PF; MG-context |
| enchantment:shadowStrike | — | O; WS-CC; INI spells.ini [255] group 1; MG-target/MG-cast/MG-time; WS-HA; MS-W |
| enchantment:revenant | — | O; WS-UV; WS-CC; INI spells.ini [256] group 1; MG-target/MG-cast/MG-time; WS-HA |
| enchantment:vampirism | — | O; WS-UV; WS-CC; INI spells.ini [257] group 15; MG-target/MG-cast/MG-time; MS-W |
| enchantment:soulFlay | — | O; INI spells.ini [268] group 14; MG-target/MG-cast/MG-time |
| enchantment:plague | — | O; INI spells.ini [282] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:berserkWarlord | — | O; INI spells.ini [280] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA; MS-W |
| enchantment:blazeOfGlory | — | O; INI spells.ini [253] group 1 NonHero=True; MG-target/MG-cast/MG-time; MS-W |
| enchantment:fieryFury | — | O; WS-TM; INI spells.ini [86] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA |
| enchantment:insulation | — | O; INI spells.ini [252] group 1; MG-target/MG-cast/MG-time; WS-CC; WS-HA; MS-W |
| enchantment:beatOfSwiftness | — | O; INI spells.ini [254] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:rust | — | RU; WS-RU; INI spells.ini [88] group 16; MG-target/MG-cast/MG-time |
| enchantment:wallOfFireBoost | — | O; MG-context |
| enchantment:colossalStrength | — | O; INI spells.ini [246] group 1; MG-target/MG-cast/MG-time; WS-CC; MS-W |
| enchantment:venom | — | O; INI spells.ini [244] group 1; MG-target/MG-cast/MG-time; WS-CC; MS-W |
| enchantment:transmuteEquipment | — | TE; WS-TE; WS-RU; WS-MP; INI spells.ini [264] group 15; MG-target/MG-cast/MG-time; MS-W |
| enchantment:coal | — | O; WS-B; MG-context |
| enchantment:iron | — | O; WS-B; MG-context |
| enchantment:wildGame | — | O; WS-B; MG-context |
| enchantment:nightshade | — | O; WS-B; MG-context |
| enchantment:planewalking | — | O; INI spells.ini [265] group 1; MG-target/MG-cast/MG-time; WS-CC; MS-W |
| enchantment:temporalTwist | — | O; INI spells.ini [273] group 10; MG-context/MG-time (context cast, no unit-target claim) |
| enchantment:greatUnbinding | — | O; INI spells.ini [302] group 9; MG-context/MG-time (context cast, no unit-target claim) |
| card:Unit | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:BaseHero | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:BaseFantastic | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:BaseRace | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:SpecialUnit | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:Figs | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:Atk | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:ModernRangedType | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:ModernRanged | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:ModernThrown | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:ModernFireBreath | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:ModernLightningBreath | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:HitChance | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:HitMelee | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:HitRanged | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:HitThrown | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:HitBreath | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:ToBlkMod | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:Def | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:Res | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:HP | P; MR copy; MG-origin | P; MR copy; MG-origin |
| card:CityWalls | Q; no cast; MG-context | Q; no cast; MG-context |
| card:Level | L; MR copy; MG-origin; SC-Q | L; MR copy; MG-origin; SC-Q; MS-W |
| card:Weapon | WQ; MR copy; MG-origin; SC-Q; MS-C2 | WQ; MR copy; MG-origin; SC-Q; WS-RU; MS-W |
| card:Armor | AQ; MR copy; MG-origin; SC-Q; MS-C2 | AQ; MR copy; MG-origin; SC-Q; WS-RU; MS-W |
| card:Dmg | Q; no cast; MG-context | Q; no cast; MG-context |
| global:gameVersion | Q; no unit flag writer | Q; no unit flag writer |
| global:trueLight | X; MG-context | X; MG-context |
| global:darkness | X; MG-context | X; MG-context |
| global:wallOfFire | X; MG-context | X; MG-context |
| global:warpReality | X; MG-context | X; MG-context |
| global:chaosConjunction | X; MG-context | X; MG-context |
| global:hurricane | X; MG-context | X; MG-context |
| global:poxHost | X; MG-context | X; MG-context |
| global:chaosSurge | X; MG-context | X; MG-context |
| global:nodeAura | X; MG-context | X; MG-context |
| global:rangedCheck | Q; no unit flag writer | Q; no unit flag writer |
| global:rangedDist | X; MG-context | X; MG-context |

Coverage: 252 unique modern rows; 147 C2 cells and 246 W cells. Original admission/backing-store gaps remain explicit even when a later grant is known. The final reconciliation routes MG-target/MG-cast/MG-time and the WS-UV/F235 and WS-B/F213 discrepancies without treating them as resolved prerequisites. No calculator code or provenance status changed.


## DOS consumers and record/pass reads (F279.1d)

This is the current-code consumer inventory for the same 133 keys / 355 offered DOS pairs as the admission table. A missing engine fact is explicit; it does not stand in for an unread calculator consumer. Positions name actual calculator execution, not an inferred engine pass. This inventory does not change provenance status or establish a recalculation before each cast.

### Read locations and execution boundaries

Calculator path abbreviations: **S0** = stats.js/deriveUnitStats; **Q** = stats_sequence.js; **I** = stats_identity.js; **A** = combat_abilities.js; **S** = combat_special_attacks.js; **E** = combat_effects.js; **F** = combat_fear_and_touch.js; **P** = combat_phases.js; **C** = combat.js/resolveCombat. All are under Calculator/. Named functions/step ids below are source locators, not proposed new abstractions.

S0 merges innate/marked inputs into effectiveAbilities. Unless a row explicitly names u or ctx.base, a derivation-time map read means that captured effectiveAbilities map, not a fresh read of the running stat record. Before/after a:baseCopy, u is the running record; ctx.base is the copy made at that boundary. After the main run, S0 publishes finished identity, gated curse fields and POSITIONED_GRANT_WRITES/VALUE_WRITES back into combatAbilities; unseeded abilities remain map values. DOS Doom Gaze publication then reflects the final shared-slot strength; Stoning/Death Gaze modifiers retain the input-type/DosSpecial projection. P/normalizeCombatUnit applies its final-map grants before C creates pair contexts. Resolution reads target/source final units or the per-attack scratch copied from them; no subsequent main recalculation occurs between these reads or attacks. Joint damage/figure state does change between attacks. The chance and figure projections are separate calculator runs, not evidence of additional engine calls.

The shared current-code melee-presence reader must not be mistaken for a live read: S0/hasMeleeAttackAt is ctx.base.atk>0, and statRunContext.slots.melee points to it. Q calls it for Land Linking, Giant Strength, Lionheart, Blazing March, Weakness and S0 flameBladeStep. A/addToSlot(melee) uses that same snapshot gate for Holy Bonus, Animated, High Prayer, Black Prayer, Metal Fires, Black Channels, Mind Storm and hero Tactician. Their additions modify live u.atk only after that snapshot gate. In contrast, DOS level-bonus and Chaos Surge steps test live u.atk>0; Node Aura adds melee without that gate. This describes the calculator, not an engine-equivalence assertion.

The DOS source retains unit_types templates, persistent _UNITS and battle _battle_units with both recomputed and battle-lifetime fields. It has no modern B/U copy boundary equivalent established by these phase names. The same BU_Apply_Specials body is called from constructor and battlefield recompute (E-T); its ench argument and mutations argument differ. Its field reads occur at whichever call reaches the block. **G-pass** below means the precise constructor/recompute invocation, per-call arguments and outer cast scheduling remain to be reconciled with F277.1 and the existing admission owners, even when the local read is sourced. It is not a request for a new classification of state beyond destination/persistence and cast/recalculation scheduling.

### Existing source locators and bounded gaps

UC and CB are the address-annotated unitcalc.c and combat.c links in the DOS admission section. These locators identify existing evidence leads; binary evidence retains authority. Named block locators below refer to literal flag/function bodies in those files, not their prose conclusions.

| Locator | Existing read evidence and its limit |
|---|---|
| R-specials | UC BU_Apply_Specials: local ench/mutations and live bu fields; same-named enchantment blocks carry per-build addresses. E-G supplies concrete grant/read addresses for True Sight, Magic/Guardian Wind, Invulnerability, Wraith Form, Black Channels, Animated, Undead and Immolation. E-BL establishes the C1 permanent undead mutation during this routine. These are local reads/writes; E-T and G-pass govern invocation coverage. |
| R-curse | UC battlefield Combat_Effects reads: Vertigo131/1600x9089B,C1 0x90651; Weakness131/1600x908D6,C1 0x90662; Mind Storm131/1600x90945,C1 0x906C5. Warp tail131/1600x90A63..0x90AC9,C1 0x9074C..0x90795; Shatter flag131/1600x90AD1,C1 0x907DC. Fields are current battle stats, not permanent units; Shatter's numeric block has no race gate. |
| R-aura | UC battlefield Holy Bonus reads per-controller maximum and current battle fields (MoM melee0x900C5; C1 positive ranged0x900E8); Resistance to All same side-maximum tail. E-X identifies CB's maximum producer. C1 relocated Guiding Beacon/Divine Barrier/Soul Linker tail is separately address-backed in UC; it is not modern region e. Original external producers and invocation closure remain G-X/G-pass. |
| R-light | UC battlefield live bu.race True Light131/1600x903A1 and Darkness Death arm0x904EB; C1 Darkness0x9084C/0x908F0, Supreme Light live resistance0x90992..0x90A53, Eternal Night non-Death0x90B2A. C1 reuses the True Light combat-enchantment slot for Supreme Light. E-X gives side/city producers; full external/caller closure remains open. |
| R-res | CB Combat_Effective_Resistance receives a battle-unit value: persistent/item/battle enchantment aggregate0x99015..0x99039, target resist0x9903C..0x99040, Magic Immunity/realm+30 at0x990AE..0x990B6. Its Charmed, Righteousness, Elements, Bless and Resist Magic branches retain separate version addresses; C1 removes Chaos elemental realm at0x990DC and repurposes Righteousness. Combat_Resistance_Check consumes this value. This establishes a roll-time battle read, not freshness before cast admission. |
| R-defense | CB Battle_Unit_Attack_Immunities and Battle_Unit_Defense_Special: attack-mode/type/weapon mask then battle defense, Attribs immunity bits, aggregate enchantments and per-attack realm. The literal illusion/large-shield/immunity/weapon/Magic/Bless/elemental/AP branches are separately addressed and transcribed by E/DOS_DEFENSE_WRITES. CB BU_ProcessAttack calls them (literal caller at CB line4171). Exact preceding recalculation remains unproven. |
| R-attack | CB BU_ProcessAttack: live attacker/defender battle Attribs_1/2, ranged_type/ranged, attack_attributes and Spec_Att_Attrib; literal gaze/touch/poison/drain/automatic-damage arms have independent addresses for each version. Magic Immunity skip1310x99D3F,160/C1 0x99D32; Immolation mode gates differ, C1 supernatural ranged test0x99D58 is discarded at unconditional0x99D5D. These reads establish attack-time battle records; they do not prove a full recalculation for each cast or strike. |
| R-dispatch | CB BU_AttackTarget/Check_Attack_Ranged: First Strike flag131/1600x9969A,C1 0x99691; C1-only HP/counter increment0x9969C..0x996BC; sleeping counter gate0x9975E all three, Haste repeat and C1 remaining-top-figure-HP branches. These are battle flags/current combat state; source-address annotations distinguish each build. |
| R-blur | CB BU_ProcessAttack Blur block reads side combat_enchantments and immunity; 131 reads defender illusion immunity,160/C1 attacker. C1 also reads target Invisibility. This is directional attack context, not a unit spell writer. |
| R-wall | CB Check_Wall_Of_Fire_Attack, Apply_Battle_Unit_Damage_From_Spell and Battle_Unit_Defense_Special: battlefield wall state and attacker's battle movement/immunity/defense. Current calculator models one encounter/crossing, not tactical pathfinding. |
| G-engine | A specifically named original read/meaning is not closed by the available mapping. This is separate from G-pass, G-X external producers and the admission gaps already recorded. No new reconstruction is performed or silently authorized here. |

The shared-slot aliases are material: DOS Rtb/RtbType select one ranged byte/type, unlike modern independent channels/gazes. Stoning/Death Gaze modifiers are shaped from that type and DosSpecial magnitude; the Rtb byte supplies hidden attack strength; Doom Gaze strength follows that slot; ordinary Doom remains its separate flag. DosSpecial is one shared magnitude whose enabled consumers take its signed/unsigned projection. The two Holy Bonus and Resistance to All controls remain distinct provided/received candidates until their maximum is taken. This inventory does not equate those inputs to independent engine fields.

### DOS consumer row bindings

Every listed version shares the stated current path unless its cell explicitly splits them. A source family plus a named block locates the read; G-pass explicitly leaves invocation timing unclosed. No row's phase label establishes engine order on its own. Touch rows without touchFlagRecords use the final abilities map; dosChannelTouchModifier returns zero on that DOS fallback.

| Stable control key | DOS versions | Current record/map/field read and execution position | Existing engine evidence / explicit gap |
|---|---|---|---|
| ability:stoningGaze | 131,160,C1 | S/dosGazeAbilityValues shapes modifiers from selected shared ranged type and DosSpecial magnitude; P/gazeKillProbs and C opening read final map modifiers plus target final immunities/res. Gaze hidden conventional component also reads final rtb/type. | R-attack; R-res; shared-slot note |
| ability:stoningTouch | 131,160,C1 | P/touchParams reads touchFlagRecords via placedTouchValue, falling back to final abilities when no record exists (ordinary DOS path), after normalization; S rider gates read target final map and E/resistanceQueries target.res. Life Steal spends margin and damage/healing state. DOS modifier comes shared Special magnitude. | R-attack; R-res; shared-slot note |
| ability:deathGaze | 131,160,C1 | S/dosGazeAbilityValues shapes modifiers from selected shared ranged type and DosSpecial magnitude; P/gazeKillProbs and C opening read final map modifiers plus target final immunities/res. Gaze hidden conventional component also reads final rtb/type. | R-attack; R-res; shared-slot note |
| ability:deathTouch | 131,160,C1 | P/touchParams reads touchFlagRecords via placedTouchValue, falling back to final abilities when no record exists (ordinary DOS path), after normalization; S rider gates read target final map and E/resistanceQueries target.res. Life Steal spends margin and damage/healing state. DOS modifier comes shared Special magnitude. | R-attack; R-res; shared-slot note |
| ability:doomGaze | 131,160,C1 | S0 shared-slot shaping publishes effectiveDoomGaze; C gaze opener reads that strength, separately from ordinary Doom flag. S/gazeConsultsDefense decides hidden component from final type/sleep. | R-attack; shared-slot note |
| ability:lifeSteal | 131,160,C1 | P/touchParams reads touchFlagRecords via placedTouchValue, falling back to final abilities when no record exists (ordinary DOS path), after normalization; S rider gates read target final map and E/resistanceQueries target.res. Life Steal spends margin and damage/healing state. DOS modifier comes shared Special magnitude. | R-attack; R-res; shared-slot note |
| ability:poison | 131,160,C1 | P/touchParams reads touchFlagRecords via placedTouchValue, falling back to final abilities when no record exists (ordinary DOS path), after normalization; S rider gates read target final map and E/resistanceQueries target.res. Life Steal spends margin and damage/healing state. DOS modifier comes shared Special magnitude. | R-attack; R-res; shared-slot note |
| ability:holyBonus | 131,160,C1 | A/getAbilityStatSteps a:holyBonus takes max(provided, received) map candidates at step; writes live atk/def/res, C1 additionally live positive shared ranged strength. MoM has no ranged half. | R-aura; G-pass |
| ability:resistanceToAll | 131,160,C1 | A/getAbilityStatSteps a:resistanceToAll takes max(provided, received) map candidates at step; adds to live res. | R-aura; G-pass |
| ability:exorcise | C1 | P/touchParams and S/exorciseReachesRoll: final source touchFlagRecords or DOS abilities-map fallback, target fantastic/unitType, spellLock and magicImmunity; fixed C1 penalty plus created-undead test. | R-attack; R-res |
| ability:destruction | 131,160,C1 | P places the carried touch value, but S/destructionInVersion rejects every DOS version before a destruction roll. Current DOS numeric consumer is absent. | CB ATT_DESTRUCTION0x9A19E..0x9A1E6 all three reads attack_flags and target battle resistance/hits (C1 damage100); UC IP_DESTRUCTION item writer0x8E550 all three. Owner M3, blocked by F41; do not import modern Destruction |
| ability:armorPiercing | 131,160,C1 | E/dosDefenseForAttack reads attacker final abilities.armorPiercing per attack, with lightning type also selecting AP; ordered DOS_DEFENSE_WRITES halves effectiveDefense. | R-defense |
| ability:lightningResist | 131,160,C1 | E/dosDefenseForAttack reads target final abilities.lightningResist to cancel lightning-derived AP; independent explicit attacker AP remains. | R-defense |
| ability:caster | 131,160,C1 | A/supremeLightActiveForUnit reads map caster in C1 Supreme Light eligibility. C ranged-Haste gate instead reads hero identity and magical ranged type (131 exception); it does not read the caster mark. No spell mana/ammunition-count executor. | C1 R-light. Existing131 address lead0x99396 reads battle Attribs_1 caster bits0x6000 for Haste repeat (also stale slot3 type); first-shot0x9B027 includes persistent Hero_Slot. C substitutes common-case hero/type gating;160 adds hero test. Lead: MoM binary analysis.md, First Strike/Haste; complete resource state/caller verification remains open |
| ability:longRange | 131,160,C1 | A/distancePenalty, called by S0 post-chain chance projection, reads map longRange, final ranged type, version and hero; affects distance To-Hit (3-tile MoM/4-tile C1 intervals). | G-engine: exact long-range read/caller not closed here |
| ability:fear | 131,160,C1 | C reads each normalized side map before melee/fear phase construction; E/resistanceQueries and F/fearFailProb read target res/deathImmunity. 131 suppresses defender Fear and can self-fear attacker; 160/C1 use opposing Fear. | R-attack; R-res |
| ability:lucky | 131,160,C1 | A c:lucky step reads u.lucky for own thresholds/res; P/applyPairToHitModifiers reads opposing final map lucky for incoming melee To-Hit in131 only. | R-specials for grant/read; R-attack for pair read; G-pass |
| ability:charmed | 131,160,C1 | E/DOS_RESISTANCE_WRITES.charmed reads target final hero identity and abilities.charmed for +30 before the roll. | R-res |
| ability:magicImmunity | 131,160,C1 | I/curseCastSteps reads pre-copy u.magicImmunity (admission already mapped .1b); E DOS defense/resistance and S touch/gaze/Immolation gates read final target map. Fear reaches resistance +30 rather than skip. | R-res; R-defense; R-attack; E-G; G-pass |
| ability:coldImmunity | 131,160,C1 | Final seeded field is published/normalized, but no DOS cold-attack numeric query is represented: DOS defense immunity mask uses missile/fire; coldSpell branch belongs to modern defense. | E-G grants; G-engine: no assertion that engine Cold Immunity is inert |
| ability:missileImmunity | 131,160,C1 | Guardian Wind becomes u.missileImmunity before baseCopy; E/dosDefenseForAttack reads final target missileImmunity through DOS immunity mask for admitted ranged kinds. | R-defense; E-G |
| ability:deathImmunity | 131,160,C1 | S death touch/gaze/life-steal skip and F/fearFailProb read target final map deathImmunity; DOS Fear does not use modern baseDeathImmunity marker. | R-attack; R-res; E-G |
| ability:dispelEvil | 131,160 | P/touchParams source flag; S/dispelEvil gate reads target final magicImmunity/type/undead/animated. MoM modifier distinguishes created undead and Chaos/Death. | R-attack; R-res |
| ability:negateFirstStrike | 131,160,C1 | C initial melee gate reads defending final map negateFirstStrike against initiating final firstStrike. | R-dispatch |
| ability:doom | 131,160,C1 | P/applyDoomUAHalving and C aDoom/bDoom read final maps; C conventional channels choose automatic damage, bypassing hit/defense/Blur. Doom Gaze strength is separate; its publication does not set ordinary doom. | R-attack; shared-slot note |
| ability:nonCorporeal | 131,160,C1 | S/hasNonCorporealEffect has only a Warlord Tactician caller. The DOS map carries nonCorporeal but no current DOS numeric consumer or movement simulation reads it. | E-G grant; DOS movement/wall consumer G-engine |
| ability:fireImmunity | 131,160,C1 | E DOS defense immunity mask and S/damageSpellArm for Immolation/Wall of Fire read target final fireImmunity. | R-defense; R-wall; R-attack |
| ability:poisonImmunity | 131,160,C1 | S/poisonReachesRoll reads target final map poisonImmunity before realm-less resistance roll. | R-attack; R-res |
| ability:firstStrike | 131,160,C1 | C initiating final map firstStrike and opposing negateFirstStrike gate melee opening; combat_state.js reads current joint HP for C1 25+ HP cutoff. | R-dispatch |
| ability:stoningImmunity | 131,160,C1 | S stoning gaze/touch reach-roll predicates read target final map stoningImmunity (also Magic Immunity). | R-attack; R-res |
| ability:illusion | 131,160,C1 | E/dosDefenseForAttack reads attacker final map illusion; DOS_DEFENSE_WRITES.illusion reads target illusionImmunity and can halt with zero defense. | R-defense |
| ability:supernatural | 131,160,C1 | A/supernaturalMinDamageFn rejects DOS before providing a minimum-damage function. C1 source supernatural ranged test is discarded by unconditional jump; no DOS current numeric minimum. | R-attack C1 0x99D58/0x99D5D; other DOS meaning G-engine |
| ability:illusionImmunity | 131,160,C1 | I curse admission pre-copy u; P pair visibility and Vertigo projection, E Blur and defense read final maps. Blur uses target immunity in 131, attacker immunity in 160/C1. | R-defense; R-blur; E-G; Vertigo discrepancy below |
| ability:immolation | 131,160,C1 | P normalizes map grant then C/S Immolation phase gates read source immolation and target magic/fire immunity; 131 permits its broader attack-mode rider, 160/C1 melee modes; strength version-specific. | R-attack; R-wall; E-G |
| ability:undead | 131,160,C1 | I c:undead reads map undead OR animated to write live race/Fantastic; P normalize invokes E/applyUndeadImmunities; S created-undead tests read final map/type. P noHealing consumes final flags. | E-G; R-specials; R-attack; G-pass |
| ability:invisibility | 131,160,C1 | Seed/cast field reaches final map; P pair visibility reads opponent invisibility and observer illusionImmunity; E/getBlurChance adds C1 invisibility only. | E-G; R-blur; R-attack |
| ability:weaponImmunity | 131,160,C1 | E/dosDefenseForAttack -> S/weaponImmunityApplies reads target final map and attacker final weapon/type/generic discriminator. DOS mask admits types per version; MoM floor10 versus C1 +8. | R-defense |
| ability:largeShield | 131,160,C1 | E/DOS_DEFENSE_WRITES.largeShield reads target final map and per-attack ranged context before later immunity/AP writes. | R-defense |
| enchantment:combatSummoned | 131,160,C1 | I/identityConversionSteps reads map combatSummoned: C1 a:summonBranch versus a:constructCatapult writes running race/Fantastic using template id. a:combatSummoned and Breakthrough consumers are modern-only; MoM has no corresponding numeric step. | CB BU_UnitLoadToBattle; C1 constructor E-I; G-engine exact summon-route identity equivalence |
| enchantment:resistanceToAll | 131,160,C1 | A/getAbilityStatSteps a:resistanceToAll takes max(provided, received) map candidates at step; adds to live res. | R-aura; G-pass |
| enchantment:holyBonus | 131,160,C1 | A/getAbilityStatSteps a:holyBonus takes max(provided, received) map candidates at step; writes live atk/def/res, C1 additionally live positive shared ranged strength. MoM has no ranged half. | R-aura; G-pass |
| enchantment:elemArmor | 131,160,C1 | E/hasElementalArmorEffect and hasResistElementsEffect decode map option; DOS defense/resistance read these separately. MoM armor wins else-elements, C1 independent defense contributions; C1 resistance reads only Resist Elements (+4,Nature), while MoM uses the armor-over-elements choice for Chaos/Nature. | R-defense; R-res |
| enchantment:prayer | 131,160,C1 | A c:prayer/c:highPrayer reads own map for stat/threshold additions; P pair modifier reads opposing map for incoming melee hit penalty in131 only. High Prayer supersedes Prayer in the DOS stat chain; pair flags are read through OR. | UC battlefield Prayer/High Prayer blocks; R-attack; G-pass |
| enchantment:highPrayer | 131,160,C1 | A c:prayer/c:highPrayer reads own map for stat/threshold additions; P pair modifier reads opposing map for incoming melee hit penalty in131 only. High Prayer supersedes Prayer in the DOS stat chain; pair flags are read through OR. | UC battlefield Prayer/High Prayer blocks; R-attack; G-pass |
| enchantment:trueSight | 131,160,C1 | Q c:trueSight reads u.trueSight -> u.illusionImmunity; I curse admission also pre-copy u.trueSight. Downstream reads are illusionImmunity row. | E-G; R-specials; G-pass |
| enchantment:bless | 131,160,C1 | E ordered DOS resistance and defense read final target map bless with per-attack realm; +3 MoM/+5 C1 resistance against Chaos/Death. | R-res; R-defense |
| enchantment:invulnerability | 131,160,C1 | S/hasWeaponImmunityEffect reads final map; C/P damage phase reads final invulnerability for damage reduction after conventional hit/defense; automatic Doom bypasses it. | R-defense; R-attack; E-G |
| enchantment:holyWeapon | 131,160,C1 | S0 hwActive closure reads effective map; Q c:holyWeapon updates live thresholds, 131 omits thrown bonus. Post-run material projection also reads mark to publish magical weapon. | R-specials Holy Weapon block; E-G Holy Arms sources; G-pass |
| enchantment:lionheart | 131,160,C1 | S0 lionheartActive closure from map; Q c:lionheart reads live channel kinds; HP magnitude uses input baseFigs (C1), MoM fixed +3 and includes Thrown. | R-specials Lionheart block; G-pass |
| enchantment:holyArmor | 131,160,C1 | S0 holyArmorActive closure from map; Q c:holyArmor reads live def: C1 def>5 writes To-Block, otherwise +2 defense; MoM always +2 defense. | R-specials Holy Armor block; G-pass |
| enchantment:charmOfLife | 131,160,C1 | S0 closure reads map; Q c:charmOfLife reads live hp and applies version-dependent increase. | UC BU_HitPoints owner Globals[OE_CHARM_OF_LIFE]0x8E82B (C1 0x8E785); BU_Recompute_Hit_Points persistent owner/global0x8EA5E and current hits/Extra_Hits; G-pass |
| enchantment:fear | 131,160,C1 | C reads each normalized side map before melee/fear phase construction; E/resistanceQueries and F/fearFailProb read target res/deathImmunity. 131 suppresses defender Fear and can self-fear attacker; 160/C1 use opposing Fear. | R-attack; R-res |
| enchantment:undead | 131,160,C1 | I c:undead reads map undead OR animated to write live race/Fantastic; P normalize invokes E/applyUndeadImmunities; S created-undead tests read final map/type. P noHealing consumes final flags. | E-G; R-specials; R-attack; G-pass |
| enchantment:animated | 131,160,C1 | I c:undead reads map animated even MoM; P/E Animated/Undead normalization consumes final map; C1 A c:animated additionally modifies live atk/def/To-Hit and any typed shared slot. MoM has no c:animated numeric package. | E-G; R-specials; G-pass |
| enchantment:blackSleep | 131,160,C1 | C reads final flags: sleeping initiator exits exchange; target sleep makes incoming conventional damage automatic and suppresses attacks. P/S defense/spell queries also read final sleep. | R-dispatch; R-attack; calculator empty-initiator boundary is not an engine incoming-damage gate |
| enchantment:blackPrayer | 131,160,C1 | A c:blackPrayer reads map; snapshot-gated melee plus unguarded live def/res and shared-byte decrements (no DOS type/strength gate on that byte); no separate pair Black Prayer consumer is present. | UC battlefield Black Prayer block; G-pass |
| enchantment:raiseDead | 131,160,C1 | I c:raiseDead C1 reads map -> live No Heal/Fantastic; MoM has no such step. Modern noHealConversion is not DOS. | E-RD: C1 direct cast race write, not a recalculation consumer; placement discrepancy; 131/160 G-RD |
| enchantment:weakness | 131,160,C1 | Q c:weakness reads u.weakness and live unit type/channel predicates, updates live strengths. | R-curse (Weakness); G-pass |
| enchantment:wraithForm | 131,160,C1 | S/hasWeaponImmunityEffect reads final map for defense eligibility; S0 final weapon projection makes C1 normal-material Wraith Form bypass opposing Weapon Immunity. No DOS wall-passage consumer. | E-G; R-defense; R-wall; G-pass |
| enchantment:eternalNight | 131,160,C1 | S0 own mark OR input eternalNight plus enemyEternalNight produces Darkness in all DOS; Q darkness reads live race. C1 late c:eternalNight:enemyResistance reads enemy context and live non-Death race. | R-light; E-X; G-pass |
| enchantment:ccDefense | 131,160,C1 | I c:chaosChannels:armor:race reads map; A c:chaosChannels:defense reads mark for defense (131 double-special armor folded). | E-CC; E-T; R-specials; G-pass |
| enchantment:ccFireBreath | 131,160,C1 | I race conversion and Q chaosChannelsFireBreathWrite read mark; S0 ccDosBreathEligibleAt reads ctx.base shared type/strength/gaze presence. 131 also c:chaosChannels:fireBreath:recompute overwrites shared slot late. | E-CC; E-T; R-specials; 131 second-call evidence below; G-pass |
| enchantment:ccFlight | 131,160,C1 | I c:chaosChannels:flight:race reads map for Chaos/Fantastic; no movement simulation consumer; later race-sensitive steps read resulting u.race. | E-CC; R-specials; E-T; G-pass |
| enchantment:immolation | 131,160,C1 | P normalizes map grant then C/S Immolation phase gates read source immolation and target magic/fire immunity; 131 permits its broader attack-mode rider, 160/C1 melee modes; strength version-specific. | R-attack; R-wall; E-G |
| enchantment:flameBlade | 131,160,C1 | Q c:flameBlade reads map and live shared channel type/strength for additions; S0 metalFiresActiveAt reads same mark to suppress Metal Fires. | R-specials Flame Blade; G-pass |
| enchantment:shatter | 131,160,C1 | Q c:shatter reads u.shatter AND live normal/hero identity; positive live atk/shared strengths set to1. The identity term is extra relative to sourced numeric consumer. | R-curse (Shatter); E-S cast gate; G-pass; discrepancy below |
| enchantment:warpAttack | 131,160,C1 | Q c:<key> reads same-named u flag at ordered Attack/Defense/Resist tail. MoM Warp Attack melee only; C1 also shared slot/gaze. Defense halves MoM/thirds C1; Resist sets zero. | R-curse; G-pass |
| enchantment:warpDefense | 131,160,C1 | Q c:<key> reads same-named u flag at ordered Attack/Defense/Resist tail. MoM Warp Attack melee only; C1 also shared slot/gaze. Defense halves MoM/thirds C1; Resist sets zero. | R-curse; G-pass |
| enchantment:warpResist | 131,160,C1 | Q c:<key> reads same-named u flag at ordered Attack/Defense/Resist tail. MoM Warp Attack melee only; C1 also shared slot/gaze. Defense halves MoM/thirds C1; Resist sets zero. | R-curse; G-pass |
| enchantment:ironSkin | 131,160,C1 | A c:ironSkin or c:stoneSkin reads map; ironSkin branch precedes/excludes stoneSkin and adds to live defense. | R-specials named skin blocks; G-pass |
| enchantment:invisibility | 131,160,C1 | Seed/cast field reaches final map; P pair visibility reads opponent invisibility and observer illusionImmunity; E/getBlurChance adds C1 invisibility only. | E-G; R-blur; R-attack |
| enchantment:magicImmunity | 131,160,C1 | I/curseCastSteps reads pre-copy u.magicImmunity (admission already mapped .1b); E DOS defense/resistance and S touch/gaze/Immolation gates read final target map. Fear reaches resistance +30 rather than skip. | R-res; R-defense; R-attack; E-G; G-pass |
| enchantment:guardianWind | 131,160,C1 | Guardian Wind becomes u.missileImmunity before baseCopy; E/dosDefenseForAttack reads final target missileImmunity through DOS immunity mask for admitted ranged kinds. | R-defense; E-G |
| enchantment:blur | 131,160,C1 | E/getBlurChance called for both target/source directions from C, reads current target map blur (army control projection). 131 target illusionImmunity;160/C1 attacker immunity. C1 stacks target invisibility. | R-blur |
| enchantment:resistMagic | 131,160,C1 | E/DOS_RESISTANCE_WRITES.resistMagic reads target final map under non-null realm; +5. | R-res |
| enchantment:haste | 131,160,C1 | C reads final map before phase construction, repeats initiating melee/short/ranged by channel; counter repeats MoM only. Haste/Fear and C1 First Strike use joint state later. | R-dispatch; E-G item-Haste source |
| enchantment:vertigo | 131,160,C1 | Q c:vertigo reads u.vertigo -> To-Hit and C1 To-Block; S0 displayDef reads final flag for MoM −1. P/buildVertigoContext instead rechecks final illusion/magic immunity for MoM defense projection. | R-curse; G-pass; discrepancy below |
| enchantment:mindStorm | 131,160,C1 | A emits c:mindStorm from effective map, then when reads u.mindStorm; writes snapshot-gated melee, live def/res and ungated shared byte. | R-curse; G-pass |
| enchantment:righteousness | 131,160 | E ordered DOS defense/resistance reads target final map under Chaos/Death realm, MoM only; resistance adds30, defense uses full-immunity branch. | R-res; R-defense (C1 reused bit excluded) |
| enchantment:berserk | 131,160 | S0 classicBerserk map closure; Q c:berserk reads live atk/def and doubles melee/zeros defense. C1 bit is Blood Lust, not this control. | R-specials Berserk block; G-pass |
| enchantment:blackChannels | 131,160 | I c:blackChannels:race reads map; A c:blackChannels adds live stat package; P/E applyBlackChannelsEffects grants final immunity map. | E-G; R-specials; G-pass |
| enchantment:metalFires | 131,160 | S0 metalFiresActiveAt reads map, live !fantastic, absence of Flame Blade; A c:metalFires reads live shared type. Only MoM admitted. | UC battlefield Metal Fires; G-pass |
| enchantment:eldritchWeapon | 131,160 | S/eldritchWeaponActiveForUnit reads final map, P/buildToBlockContext applies opposing weapon effect in MoM attack resolution; E/dosDefenseForAttack uses it for melee-only magic-weapon eligibility. | R-attack; exact weapon flag aggregation timing G-pass |
| enchantment:giantStrength | 131,160 | Q c:giantStrength reads map, hasMeleeAttackAt(runCtx) and live Thrown type; adds melee and Thrown strength. | R-specials Giant Strength; G-pass |
| enchantment:stoneSkin | 131,160 | A c:ironSkin or c:stoneSkin reads map; ironSkin branch precedes/excludes stoneSkin and adds to live defense. | R-specials named skin blocks; G-pass |
| enchantment:guardian | C1 | A c:guardian reads effective map for live res/threshold bonuses; context that defender is in settlement is represented by mark, not queried city state. | UC C1 Guardian block; G-pass |
| enchantment:tactician | C1 | A c:tactician reads map and captured hero identity; after Warp writes defense and hero atk/res/shared typed slot. | UC C1 0x90AB4..0x90AF6 reads wizard retort, persistent Hero_Slot; G-pass |
| enchantment:supremeLight | C1 | Q c:supremeLight -> A eligibility helper reads map caster/focusMagic plus live type/ranged type and baseRangedType; after Warp/Darkness adds floor(live res/3) defense and attack bonus. | R-light; G-pass |
| enchantment:endurance | C1 | S0 map closure; Q c:endurance adds live defense, C1 has no modern HP increment. | R-specials Endurance; G-pass |
| enchantment:bloodLust | C1 | I c:bloodLust reads map for Death/Fantastic; P/E grants undead, then E/bloodLustMeleeAttack reads attacker flag and opposing final normal-or-hero identity for doubling. | E-BL; R-specials; R-attack; persistent mutation missing from current repeatable state; G-pass |
| enchantment:mysticSurge | C1 | I c:mysticSurge:race reads map -> No Heal/Fantastic; A c:mysticSurge live def/res; P normalization noHealing and To-Block context read final map. | UC C1 UE_MYSTIC_SURGE at0x8F79E; R-attack; G-pass |
| enchantment:blazingMarch | C1 | Q c:blazingMarch reads map for live strengths; S/blazingMarchMagicWeaponForUnit reads final map for weapon immunity context. | UC C1 Blazing March block; R-defense; G-pass |
| enchantment:survivalInstinct | C1 | A c:survivalInstinct map emission + survivalInstinctActiveForUnit checks live identity; live def/res/To-Hit additions. | UC C1 controller survival_instinct 0x8F277; full predicate correspondence G-engine; G-pass |
| enchantment:landLinking | C1 | Q c:landLinking -> A helper reads map and live fantastic identity; writes live melee/def/shared breath. | R-specials Land Linking block; G-pass |
| enchantment:focusMagic | C1 | S0 map closure C1; Q c:focusMagic reads captured target.rtbTypeRaw (template type) OR live breath to add3; otherwise retypes live slot to Sorcery and floors strength3. Supreme Light also reads mark. No ammo input. | UC C1 Focus Magic ammo>0 at0x8F7FB, template/live branches0x8F82D..0x8F84C; persistent flag floors ammo at battle setup0x8EB87..0x8EB9F, mid-combat grant does not establish that floor; R-light; G-pass |
| enchantment:realmWard | C1 | S0 realmWardActive reads selected map realm, live u.fantastic and unitRealmAt(u); Q c:realmWard changes live def/res/To-Hit. | UC C1 Spell Ward/realm block; city context producer G-X; G-pass |
| enchantment:spellLock | C1 | S/exorciseReachesRoll reads target final map spellLock before Exorcise roll. No represented Dispel Magic executor. | R-attack; dispel consumer G-engine |
| enchantment:guidingBeaconAura | C1 | S0 com1AuraValue reads map; Q c:guidingBeaconAura after node/Guardian reads live shared ranged type missile/boulder/magic, not strength. | R-aura C1 relocated tail; G-pass |
| enchantment:divineBarrierAura | C1 | S0 com1AuraValue reads map; Q c:divineBarrierAura adds live def in relocated tail. | R-aura C1 relocated tail; G-pass |
| enchantment:soulLinkerAura | C1 | S0 com1AuraValue reads map; Q c:soulLinkerAura reads live fantastic; splits aura ceiling/floor into hit/block. | R-aura C1 relocated tail; G-pass |
| enchantment:heavenlyLight | C1 | S0 map closure C1; Q c:heavenlyLight reads live positive atk/shared/gaze strengths; threshold tail reads live weaponMaterial/strength and channel kinds. No live identity gate. Publishes magical-weapon context. | UC C1 Heavenly Light block; G-pass |
| card:Unit | 131,160,C1 | I/unitIdentityRecordSeed seeds template identity from projected input; Q training eligibility reads initial identity; named live consumers above read running u or final combat identity. Template unittype/isHero also select Catapult/Golem and quality routes. | E-I/E-Q/E-L distinguish template/persistent/battle fields; exact arbitrary-custom-id equivalence G-I; G-pass |
| card:BaseHero | 131,160,C1 | I/unitIdentityRecordSeed seeds template identity from projected input; Q training eligibility reads initial identity; named live consumers above read running u or final combat identity. Template unittype/isHero also select Catapult/Golem and quality routes. | E-I/E-Q/E-L distinguish template/persistent/battle fields; exact arbitrary-custom-id equivalence G-I; G-pass |
| card:BaseFantastic | 131,160,C1 | I/unitIdentityRecordSeed seeds template identity from projected input; Q training eligibility reads initial identity; named live consumers above read running u or final combat identity. Template unittype/isHero also select Catapult/Golem and quality routes. | E-I/E-Q/E-L distinguish template/persistent/battle fields; exact arbitrary-custom-id equivalence G-I; G-pass |
| card:BaseRace | 131,160,C1 | I/unitIdentityRecordSeed seeds template identity from projected input; Q training eligibility reads initial identity; named live consumers above read running u or final combat identity. Template unittype/isHero also select Catapult/Golem and quality routes. | E-I/E-Q/E-L distinguish template/persistent/battle fields; exact arbitrary-custom-id equivalence G-I; G-pass |
| card:SpecialUnit | 131,160,C1 | I/unitIdentityRecordSeed seeds template identity from projected input; Q training eligibility reads initial identity; named live consumers above read running u or final combat identity. Template unittype/isHero also select Catapult/Golem and quality routes. | E-I/E-Q/E-L distinguish template/persistent/battle fields; exact arbitrary-custom-id equivalence G-I; G-pass |
| card:Figs | 131,160,C1 | S0 input baseFigs sets figure chain seed and Lionheart C1 magnitude; separate figure run publishes figs. P/remainingUnitState and combat_state.js consume final figs/hp/dmg at each joint-state phase. | UC constructor template figures; CB damage/figure loops R-attack; G-pass |
| card:Atk | 131,160,C1 | Q template:stat seeds respective u fields; ordered stat steps read live fields as above, a:baseCopy preserves snapshot. C/P resolution consumes final atk/def/res/hp; resistance/defense create per-attack scratch records. | E-I; R-defense/R-res/R-attack; G-pass |
| card:RtbType | 131,160,C1 | S0/buildSlotContext and dosGazeAbilityValues read selected shared slot; Q steps read current type/strength, CC additionally ctx.base. C/P resolves final ranged/thrown/gaze mirrors. | E-I; R-attack; shared-slot note; G-pass |
| card:Rtb | 131,160,C1 | S0/buildSlotContext and dosGazeAbilityValues read selected shared slot; Q steps read current type/strength, CC additionally ctx.base. C/P resolves final ranged/thrown/gaze mirrors. | E-I; R-attack; shared-slot note; G-pass |
| card:DosSpecial | 131,160,C1 | S/dosSpecialAbilityValues projects one shared magnitude into each enabled DOS special consumer: negative stoning/death/lifeSteal modifiers; positive poison/Holy Bonus/Resistance to All. Those consumers above read shaped maps. | UC/CB Spec_Att_Attrib/special-attribute readers in R-aura/R-attack; original custom input writer G-I |
| card:ToHitMod | 131,160,C1 | Q template:baseThresholds seeds common/channel/block offsets; S0 chance projection runs ordered thresholds then publishes toHitMelee/toHitRtb/toBlock. P pair modifiers and combat rolls read final chances. | UC constructor/level chance fields and CB hit/block rolls; exact independent custom-offset equivalence G-I; G-pass |
| card:ToHitRtbMod | 131,160,C1 | Q template:baseThresholds seeds common/channel/block offsets; S0 chance projection runs ordered thresholds then publishes toHitMelee/toHitRtb/toBlock. P pair modifiers and combat rolls read final chances. | UC constructor/level chance fields and CB hit/block rolls; exact independent custom-offset equivalence G-I; G-pass |
| card:ToBlkMod | 131,160,C1 | Q template:baseThresholds seeds common/channel/block offsets; S0 chance projection runs ordered thresholds then publishes toHitMelee/toHitRtb/toBlock. P pair modifiers and combat rolls read final chances. | UC constructor/level chance fields and CB hit/block rolls; exact independent custom-offset equivalence G-I; G-pass |
| card:Def | 131,160,C1 | Q template:stat seeds respective u fields; ordered stat steps read live fields as above, a:baseCopy preserves snapshot. C/P resolution consumes final atk/def/res/hp; resistance/defense create per-attack scratch records. | E-I; R-defense/R-res/R-attack; G-pass |
| card:Res | 131,160,C1 | Q template:stat seeds respective u fields; ordered stat steps read live fields as above, a:baseCopy preserves snapshot. C/P resolution consumes final atk/def/res/hp; resistance/defense create per-attack scratch records. | E-I; R-defense/R-res/R-attack; G-pass |
| card:HP | 131,160,C1 | Q template:stat seeds respective u fields; ordered stat steps read live fields as above, a:baseCopy preserves snapshot. C/P resolution consumes final atk/def/res/hp; resistance/defense create per-attack scratch records. | E-I; R-defense/R-res/R-attack; G-pass |
| card:CityWalls | 131,160,C1 | S0 input cityWalls forms wall defense/context; E/computeDefenseProfile reads target cityWallBonus only when attacker has none, adding it after the defense helper result. | R-wall; external city-state acquisition G-X |
| card:Level | 131,160,C1 | Q training:veterancy reads selected level under initial training eligibility; later level bonus steps read u.level/identity and live strength predicates. | E-L: engine persistent Level write and read differs from selected training input; G-pass |
| card:Weapon | 131,160,C1 | Q training quality/material steps read selected input under initial eligibility; S0 post-run material projection plus E/S defense queries consume final weapon and identity. C1 armor modifies defense in sequence. | E-Q: persistent wp mutation/reread; exact repeat behavior G-pass |
| card:Armor | C1 | Q training quality/material steps read selected input under initial eligibility; S0 post-run material projection plus E/S defense queries consume final weapon and identity. C1 armor modifies defense in sequence. | E-Q: persistent wp mutation/reread; exact repeat behavior G-pass |
| card:Dmg | 131,160,C1 | S0 parses input dmg into result; P/remainingUnitState and combat_state.js consume current damage, hp, figures; healing/category functions update joint state between attacks. | CB BU_ApplyDamage and attack figure loops R-attack; outer pre-encounter producer G-X |
| global:gameVersion | 131,160,C1 | Q manifest/step-scope selection and C/P/E/S resolution dispatch read input version; this is calculator query context, not an engine unit-record read. | Version-specific source bodies are independent; no engine record counterpart |
| global:trueLight | 131,160,C1 | S0 hasTrueLight reads global input; c:trueLight uses live race in131/160. C1 explicit suppression despite matrix offering. | R-light; E-X; probe below; G-pass |
| global:darkness | 131,160,C1 | S0 hasDarkness reads input OR own/enemy Eternal Night; c:darkness reads live race and live strengths. C1 after Warp, MoM before Warp. | R-light; E-X; G-pass |
| global:wallOfFire | 131,160,C1 | C opts.wallOfFire and !isRanged control opening wall phase; S/wallOfFireEligible has no DOS unit-ability exclusion; S/P damageSpellArm reads final defenses/immunities. Walls do not gain Haste repeats. | R-wall; G-X external field producer |
| global:warpReality | 131,160,C1 | S0 input closure; Q c:warpReality reads live unitIsChaos (DOS compact fantastic_chaos) to subtract20 To-Hit. | UC battlefield race !=Chaos0x9077A MoM: no Fantastic conjunct; current predicate discrepancy; G-pass |
| global:hurricane | 131,160,C1 | Raw matrix input reaches S0 hurricaneActive, but Q d:hurricane belongs only to Warlord scope. No DOS numeric path. | No DOS engine counterpart claimed; bounded probe below |
| global:poxHost | 131,160,C1 | S0 poxHostActive explicitly requires Warlord; Q b:goblinPox cannot consume it in DOS. No DOS numeric path. | No DOS engine counterpart claimed; bounded probe below |
| global:chaosSurge | 131,160,C1 | S0 closure global plus side context -> Q c:chaosSurge; reads live race/type/strength. MoM precedes Specials conversions; C1 follows them. | UC constructor131/1600x8F113/0x8F138 and C1 relocated block; E-T; G-pass |
| global:nodeAura | 131,160,C1 | S0 nodeAuraActive compares selected realm with live unit realm; Q c:nodeAura adds live def/res/melee and positive shared/gaze strengths. | UC battlefield node aura0x8FF97 MoM; G-X context producer; G-pass |
| global:rangedCheck | 131,160,C1 | C opts.isRanged chooses ranged versus melee exchange; suppresses melee-only First Strike/Fear/wall crossing paths. | R-dispatch query counterpart; not a unit-record flag |
| global:rangedDist | 131,160,C1 | S0 chance projection -> A/distancePenalty reads distance with final ranged type, map longRange and hero/version; C consumes published hit chance. | Exact distance acquisition/read caller G-engine; no cast |

Coverage: 133 unique DOS keys, 355 offered key/version pairs; matches the DOS admission table exactly. The source accessor baseline (323 sites,34 sample-unreached) was a lead only: direct field reads, normalization, query contexts and shared-slot projections above were inspected separately.

### Matrix globals, discrepancies and handoff

The raw matrix global reader offers True Light in C1 and Hurricane/Pox in all DOS builds despite card hiding. Suppression is downstream: S0/hasTrueLight explicitly excludes C1; poxHostActive requires Warlord; d:hurricane has Warlord-only sequence scope in steps.js. A bounded direct derivation probe toggled each input for normal/Life/Death missile units in each DOS version (27 comparisons): Hurricane/Pox changed none of the compared finite final atk/rtb/def/res/hp/toHitMelee/toHitRtb/toBlock fields; C1 True Light changed none; MoM True Light changed Life/Death atk/rtb/def/res by ±1. This substantiates these paths, not exhaustive combinations or the matrix DOM. The current numeric paths have no DOS use of those suppressed global flags outside the scoped derivation steps.

F279.1f should reconcile the concrete consumer mismatches with existing owners: c:shatter mixes cast identity into its flag-only numeric block (F250.3/F279.3c); C1 Raise Dead's direct cast race write is represented at c (F249); the DOS Warp Reality compact Fantastic+Chaos predicate (F234) is narrower than UC's race-only test; MoM Vertigo displayDef and pair-defense projection disagree after a later immunity because the latter re-tests final immunities. A bounded MoM1.31 custom normal-unit probe (base defense4, marked Vertigo and Black Channels) yields derived def5/displayDef4 and Vertigo=true; normalization grants Illusion Immunity, and buildVertigoContext returns defense penalty0. The last two are code observations, not approved fixes. Offered DOS Destruction/Supernatural and Cold Immunity have the limited/inactive current consumers recorded above; do not translate that into engine absence. Destruction remains with M3/F41; the caster-mark substitution in ranged Haste is a known calculator deviation, with resource counts outside this model. Per-pass Specials, durable C1 Blood Lust/level/weapon mutations and late field preservation remain F277.1/.3c inputs. No new task, code fix, consumer migration or source reconstruction is included.

## Modern consumers and record/pass reads (F279.1e)

The following table covers the same 252 keys / 393 offered modern pairs as the modern admission table: 147 C2 and 246 W. Each version cell describes current calculator consumers, not a claim that the engine reads the same object. Admission/grant evidence remains in the same-key modern admission row and its MR/WS/MS locators above; repeating the control here is necessary to distinguish the reader from its writer. A dash means the version does not offer the control.

### Current execution and record boundaries

The S0/Q/I/A/E/F/P/C/S abbreviations defined in the DOS consumer section also apply here. S0 is `Calculator/stats.js`, Q is `stats_sequence.js`, I is `stats_identity.js`; named helper/step identifiers in cells are searchable source locations. `Calculator/stats_manifests.js` orders each version's actual steps; `Calculator/steps.js` filters version scope. The letter regions are calculator positions, not independent proof of engine invocation timing.

S0 constructs `effectiveAbilities` from input and pre-sequence projections. Unless a cell names `u`, `ctx.base`, final/normalized maps or another object, a derivation flag read is the captured effective map. `seedNonStatRecordFields` seeds a working record. Q `a:baseCopy` saves `{...u}` as `ctx.base`: later reads cannot observe subsequent permanent engine mutations through that snapshot. Q and I then continue changing `u`; they do not maintain a second mutable permanent object through repeated recalculations. S0 publishes admitted curse fields and `POSITIONED_GRANT_WRITES` / `POSITIONED_GRANT_VALUE_WRITES` to the combat map after the stat run. Unpositioned map values remain captured values. Blood Sucker is included in the seeded/published record fields.

`hasMeleeAttackAt` reads `ctx.base.atk>0`. The channel `persistentRanged` predicate reads copied strength and, for the compatibility slot, copied ranged type; the independent ranged channel additionally requires `channelKey==='ranged'`. Other gates deliberately use current type/strength, initial input metadata, or both. The table names those distinctions. Independent ranged, thrown, fire-breath and lightning-breath channels do not share the DOS ranged byte.

C calls P `normalizeCombatUnit` once for each side at the start of an exchange. Its fixed order is Blood Lust, Vampirism, Revenant, Animated, Undead, Black Channels (scope-filtered), Rebuild, Fiery Fury, Zeal, Temporal Twist, Tactician, Doom halving, HP/no-healing setup, Angelic Guardians, then W touch placement. Thus final normalized maps can differ from S0's published record. Pair defenses/resistance/visibility read those maps; per-phase kernels use changing living-figure/damage/healing states. They do not rerun the main unit derivation between strikes. F `fearFailProb` is a material exception: its modern direct Death Immunity check uses the raw supplied `baseDeathImmunity` snapshot when present, while the preceding effective-resistance query reads the final target. Original source also distinguishes BaseUnits and Units there.

S0 runs a separate `figureSteps` sequence on `{figs}` after stat/chance projection. It has Altar of the Sun +1 and Academy +2, with captured eligibility. Main stat effects still use input `baseFigs` for HP/Explosive divisors. This is a current ownership/snapshot limitation, not evidence of another engine recalc. No Marionette retort or figure consumer should be inferred merely from an offered retort control.

### Existing engine read evidence and limits

These locators add consumer evidence to the admission/writer locators. They refer to existing address-annotated Pascal or shipped CAS bodies. They do not upgrade provenance or authorize further reconstruction. **MG-time remains open in every applicable cell**: these local reads, hook order and post-action calls do not close the full before/after schedule for every attempted cast. **MG-context** continues to cover unrepresented original wizard, stack, battlefield or resource producers. Where only a broad body/branch lead is named, its precise version-specific consumer mapping remains **MC-gap**, rather than silently equating the calculator projection with the original engine field.

| Locator | Existing consumer evidence / remaining limit |
|---|---|
| MC-recalc | [Units.RecalculateUnits.pas](Caster%20binary/Units.RecalculateUnits.pas): `RecalculateUnits`, `ApplyLevelBonus`, `ApplyMagicWeapons` and `applynodeaura` read B/Units and aggregate flags. Use the literal same-named enchantment/stat branch with its address annotations. MR establishes copy, aggregation, hooks and permanent writes. Exact unidentified flag/alias branches remain MC-gap; the current cell is independently mapped from code. |
| MC-res | [Combat.ResolutionHelpers.pas](Caster%20binary/Combat.ResolutionHelpers.pas) `GetEffectiveResistance`: Units.resistance $00595AEB, owner-wizard Charmed using BaseUnits.owner and Units.hero identity $00595AF5..$00595BCA, Units Magic Immunity $00595BEF, Resist Elements $00595C0C, Bless $00595C51, Resist Magic $00595C9D. `ResistanceRoll` calls it at $00595D03. W constants/scripts can change magnitudes; the fields are roll-time reads, not cast-admission freshness proof. |
| MC-defense | Same `EffectiveDefense`: Units pointer $005965E4, defense+extra $00596612, Illusion/Illusion Immunity early exit, Large Shield $0059664B, Elements/Armor $0059666E/$00596693, Bless spell realm $005966B8, Lightning Resistance/AP $0059670A, typed immunity ladder $00596730..$00596813, Weapon Immunity conditional on attack magic $0059681A. `DefenseRoll` applies capped defense-die chance. The attack caller supplies context; no cast schedule inferred. |
| MC-range | Same `RangedPenalty`: `CombatDistanceUnit`, Units hero/ranged type/Long Range, then INI thresholds $005B1817..$005B191D. S0 currently substitutes a stated distance and initial hero/map Long Range plus final ranged type. Tactical coordinates and resource legality remain outside this projection. |
| MC-attack | [Combat.ApplyAttack.pas](Caster%20binary/Combat.ApplyAttack.pas) `ApplyAttack`: type-selected attack flags and current Units fields; literal gaze, touch, poison, drain, Doom, Blood Lust, supernatural and Immolation branches retain addresses. The fear-related direct immunity test uses BaseUnits[au].deathimmunity, while later rider/gaze target checks use Units[du].deathimmunity. [Combat.DamageHandling.pas](Caster%20binary/Combat.DamageHandling.pas) supplies damage/healing object mutations. Unmapped alternate callers and original resource/external-state inputs remain MC-gap/MG-context. |
| MC-action | [Combat.PerformAttacks.pas](Caster%20binary/Combat.PerformAttacks.pas): ranged Haste tests Units.EnchantmentFlags, repeats with BaseUnits.ammo gate, writes ammo/suppression/action state, and calls RecalculateUnits at $005B3599 after the action. Melee dispatch uses current strike flags and calls RecalculateUnits at $005B3E4F after action-state writes. These are known action-end calls, not before-every-cast calls; missing modeled ammunition/movement state remains explicit. |
| MC-blur | `Combat.ApplyAttack.pas` Blur block: side CombatGlobals[CGBlur], target Invisibility and attacking Illusion Immunity; current C models shared tactical-defender Blur context for both directions. The address-annotated branch begins with the side lookup and Blur test at $005B2F61 (false target); exact external side setup remains MG-context. |
| MC-wall | [Combat.AttackAndWallHelpers.pas](Caster%20binary/Combat.AttackAndWallHelpers.pas) named wall/crossing helpers and `PerformMeleeAttack` Wall-of-Fire gate; [Spells.DamageSpells.pas](Caster%20binary/Spells.DamageSpells.pas) damage-spell target branch and [Combat.AmplifiedDamage.pas](Caster%20binary/Combat.AmplifiedDamage.pas) amplification. Current controls represent a crossing/extra defense, not tactical wall ownership/pathfinding. |
| MC-aura | `Units.RecalculateUnits.pas` `BuildAuraTable`, `AddtoAuraTable` and post-hook aura tail: owner/position/value accumulation followed by current unit stat reads. The two provided/received controls represent candidates for one maximum, not distinct unit fields. Original stack/owner construction beyond named bodies remains MG-context. |
| MC-script | W `UnitCalcPre.CAS` and `UnitCalc.CAS`, already linked by the modern admission evidence: same-named effect blocks use selector0 calculated fields, selector1/base predicates, and wizard/battle context. WS locators above identify verified grant/cast blocks. A cell marked only MC-script is an existing body lead: exact original branch/alias or additional caller not already mapped above remains MC-gap. C2's early/late scripts are disabled/inert in its shipped configuration; a W current-code clause is not C2 evidence. |
| MC-summon | Existing `Spells.CombatSummonUnit.pas` and `Spells.InitializeCombatSpellcasting.pas` bodies linked by modern admission evidence establish summon/NoHeal writes. Exact entry paths outside their reconstructed scope remain MG-target/MG-time. |
| MC-fig | Existing WS-B CreateUnit/OverlandEndTurn figure writes establish permanent figure changes. Calculator figureSteps is a separate projection; its position relative to stat effects is not an original extra recalculation boundary. |

### Modern consumer bindings

Each applicable version cell is populated independently; identical wording denotes shared current code. A clause explicitly introduced by W or C2 applies only to that version. Source locators give the available evidence and their stated bounds above; MC-gap/MG-time do not replace any unread current calculator consumer.

| Stable control key | C2 current consumer / record / position / evidence | W current consumer / record / position / evidence |
|---|---|---|

| ability:stoningGaze | C gaze admission uses final-map definedness; P/gazeKillProbs reads modifier and opposing final immunity/resistance through E/resistanceQueries and S/stoningFailProb or deathGazeFailProb. W enemy Eye strips modifiers after Q d; C2 does not. MC-attack/MC-res. | C gaze admission uses final-map definedness; P/gazeKillProbs reads modifier and opposing final immunity/resistance through E/resistanceQueries and S/stoningFailProb or deathGazeFailProb. W enemy Eye strips modifiers after Q d; C2 does not. MC-attack/MC-res. |
| ability:stoningTouch | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. |
| ability:deathGaze | C gaze admission uses final-map definedness; P/gazeKillProbs reads modifier and opposing final immunity/resistance through E/resistanceQueries and S/stoningFailProb or deathGazeFailProb. W enemy Eye strips modifiers after Q d; C2 does not. MC-attack/MC-res. | C gaze admission uses final-map definedness; P/gazeKillProbs reads modifier and opposing final immunity/resistance through E/resistanceQueries and S/stoningFailProb or deathGazeFailProb. W enemy Eye strips modifiers after Q d; C2 does not. MC-attack/MC-res. |
| ability:deathTouch | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. |
| ability:doomGaze | S0 seeds numeric doomGaze; Q a/c Focus Magic and Blazing Eyes can change running u.doomGaze; C reads effectiveDoomGaze for automatic gaze damage, separate from ordinary Doom. W Q d Eye zeros it. MC-recalc/MC-attack. | S0 seeds numeric doomGaze; Q a/c Focus Magic and Blazing Eyes can change running u.doomGaze; C reads effectiveDoomGaze for automatic gaze damage, separate from ordinary Doom. W Q d Eye zeros it. MC-recalc/MC-attack. |
| ability:lifeSteal | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. |
| ability:poison | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. |
| ability:holyBonus | A/getAbilityStatSteps captures provided and received signed candidates separately; e:holyBonus takes maximum >0, reads ctx.base.atk and persistent ranged ctx.base strength, writes u atk/def/res/ranged. MC-aura. | A/getAbilityStatSteps captures provided and received signed candidates separately; e:holyBonus takes maximum >0, reads ctx.base.atk and persistent ranged ctx.base strength, writes u atk/def/res/ranged. MC-aura. |
| ability:resistanceToAll | A/getAbilityStatSteps e:resistanceToAll takes maximum of provided/received candidates and prayermasterAura, writes u.res once. MC-aura. | A/getAbilityStatSteps e:resistanceToAll takes maximum of provided/received candidates and prayermasterAura, writes u.res once. MC-aura. |
| ability:exorcise | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. |
| ability:destruction | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. | P/touchParams reads final-map or placed touchFlagRecords values per phase; E/resistanceQueries selects Nature/Death/Life/Chaos or null for Poison, then S named rider ReachesRoll/FailProb tests opposing final immunity/type/Spell Lock. W E/applyWarlordTouchFlagPlacement relocates Stoning/Death Touch for Focus Magic and Death Touch for Revenant; C2 keeps global flags. MC-attack/MC-res. |
| ability:armorPiercing | E/computeCasterDefenseForAttack reads attacking final map; effectiveDefense halves opposing scratch defense unless lightning+target lightningResist. W Q training militaryWorkshop also reads live u.armorPiercing to choose strength versus AP grant. MC-defense. | E/computeCasterDefenseForAttack reads attacking final map; effectiveDefense halves opposing scratch defense unless lightning+target lightningResist. W Q training militaryWorkshop also reads live u.armorPiercing to choose strength versus AP grant. MC-defense. |
| ability:lightningResist | A c:innerPower reads live u.lightningResist OR fireImmunity. E/effectiveDefense reads target final map to cancel lightning AP. MC-recalc/MC-defense. | A c:innerPower reads live u.lightningResist OR fireImmunity. E/effectiveDefense reads target final map to cancel lightning AP. MC-recalc/MC-defense. |
| ability:caster | A/supremeLightActiveForUnit reads captured map caster alongside live type/ranged and original ranged type for Q e:supremeLight. No modeled ammunition/casting-resource consumption for this field. MC-recalc; MC-action limits. | A/supremeLightActiveForUnit reads captured map caster alongside live type/ranged and original ranged type for Q e:supremeLight. No modeled ammunition/casting-resource consumption for this field. MC-recalc; MC-action limits. |
| ability:longRange | S0/distancePenaltyFor reads captured map only for attacker rangedCheck after final channel type; A/distancePenalty caps missile/boulder distance penalty at -10 and exempts heroes. MC-range. | S0/distancePenaltyFor reads captured map only for attacker rangedCheck after final channel type; A/distancePenalty caps missile/boulder distance penalty at -10 and exempts heroes. MC-range. |
| ability:fear | C melee-only final-map fear -> opposing E/resistanceQueries death roll -> F/fearFailProb raw baseDeathImmunity snapshot (fallback final flag if absent); active figures sampled in attack resolution. MC-attack/MC-res. | C melee-only final-map fear -> opposing E/resistanceQueries death roll -> F/fearFailProb raw baseDeathImmunity snapshot (fallback final flag if absent); active figures sampled in attack resolution. MC-attack/MC-res. |
| ability:lucky | A c:lucky reads live u.lucky, writes res/toHit/toBlk; no modern opposing Lucky hit penalty in P/applyPairToHitModifiers. MC-recalc. | A c:lucky reads live u.lucky, writes res/toHit/toBlk; no modern opposing Lucky hit penalty in P/applyPairToHitModifiers. MC-recalc. |
| ability:charmed | E/effectiveResistance reads final target map plus hero identity, sets scratch resistance100 for rolls; current map represents engine owner-wizard hero-ability lookup. MC-res. | E/effectiveResistance reads final target map plus hero identity, sets scratch resistance100 for rolls; current map represents engine owner-wizard hero-ability lookup. MC-res. |
| ability:magicImmunity | I/curseRefusedByImmunity reads u at curse cast; E/effectiveResistance and effectiveDefense read final target map; S gaze/touch/destruction and damageSpellArm reject or choose immune branch using final map. P/buildVertigoContext also conditionally reads the normalized magicImmunity flag behind Vertigo and Illusion Immunity; its modern projection is numerically inert. Hierophany/normalization ordering matters. MC-res/MC-defense/MC-attack; admission MT. | I/curseRefusedByImmunity reads u at curse cast; E/effectiveResistance and effectiveDefense read final target map; S gaze/touch/destruction and damageSpellArm reject or choose immune branch using final map. P/buildVertigoContext also conditionally reads the normalized magicImmunity flag behind Vertigo and Illusion Immunity; its modern projection is numerically inert. Hierophany/normalization ordering matters. MC-res/MC-defense/MC-attack; admission MT. |
| ability:coldImmunity | E/effectiveDefense final target flag gives defense100 for cold spells; no conventional cold ranged descriptor modeled. W Hierophany can clear before normalization restores grants. MC-defense. | E/effectiveDefense final target flag gives defense100 for cold spells; no conventional cold ranged descriptor modeled. W Hierophany can clear before normalization restores grants. MC-defense. |
| ability:missileImmunity | I curse admission Nausea conjunct and E/effectiveDefense final target missile flag; W Q d:fortification reads live largeShield then writes this field. MC-defense; WS-N. | I curse admission Nausea conjunct and E/effectiveDefense final target missile flag; W Q d:fortification reads live largeShield then writes this field. MC-defense; WS-N. |
| ability:deathImmunity | I/curseRefusedByImmunity Black Sleep gate reads u; S Death Touch/Gaze/Life Steal use final target map. F/fearFailProb instead uses S0 raw supplied baseDeathImmunity snapshot when present; modern Fear also receives E effective resistance from final target. Distinct records are intentional in current code. MC-attack/MC-res. | I/curseRefusedByImmunity Black Sleep gate reads u; S Death Touch/Gaze/Life Steal use final target map. F/fearFailProb instead uses S0 raw supplied baseDeathImmunity snapshot when present; modern Fear also receives E effective resistance from final target. Distinct records are intentional in current code. MC-attack/MC-res. |
| ability:merging | S/wallOfFireEligible reads attacker final merging map and suppresses crossing damage. W Hierophany can clear it before this read. No Tactician consumer of Merging. MC-wall. | S/wallOfFireEligible reads attacker final merging map and suppresses crossing damage. W Hierophany can clear it before this read. No Tactician consumer of Merging. MC-wall. |
| ability:negateFirstStrike | C initial melee phase selection reads attacker firstStrike and opposing negateFirstStrike from normalized maps. W late grants/strips run before this read. MC-action. | C initial melee phase selection reads attacker firstStrike and opposing negateFirstStrike from normalized maps. W late grants/strips run before this read. MC-action. |
| ability:doom | W Q training militaryWorkshop captured doom selects strength upgrade. P/applyDoomUAHalving halves normalized melee and all channels; C reads final doom to choose automatic damage. Ordinary Doom is separate from Doom Gaze. MC-attack. | W Q training militaryWorkshop captured doom selects strength upgrade. P/applyDoomUAHalving halves normalized melee and all channels; C reads final doom to choose automatic damage. Ordinary Doom is separate from Doom Gaze. MC-attack. |
| ability:nonCorporeal | A c:breakthrough:noncorporeal captures input map nonCorporeal. S/hasNonCorporealEffect reads final map/Wraith Form/Ruler; W E Tactician grants negateFirstStrike from that result. MC-recalc/MC-action. | A c:breakthrough:noncorporeal captures input map nonCorporeal. S/hasNonCorporealEffect reads final map/Wraith Form/Ruler; W E Tactician grants negateFirstStrike from that result. MC-recalc/MC-action. |
| ability:fireImmunity | A c:innerPower live u gate; E/effectiveDefense final target flag for Fire Breath and fire spells including Immolation/Wall of Fire. MC-recalc/MC-defense. | A c:innerPower live u gate; E/effectiveDefense final target flag for Fire Breath and fire spells including Immolation/Wall of Fire. MC-recalc/MC-defense. |
| ability:poisonImmunity | S/poisonReachesRoll reads final target poisonImmunity before Poison Touch rolls; E/effectiveDefense also reads it in the poisonSpell arm. MC-attack/MC-defense. | S/poisonReachesRoll reads final target poisonImmunity before Poison Touch rolls; E/effectiveDefense also reads it in the poisonSpell arm. MC-attack/MC-defense. |
| ability:firstStrike | C initial melee phase selection reads attacker firstStrike and opposing negateFirstStrike from normalized maps. W late grants/strips run before this read. MC-action. | C initial melee phase selection reads attacker firstStrike and opposing negateFirstStrike from normalized maps. W late grants/strips run before this read. MC-action. |
| ability:stoningImmunity | S/stoningTouchReachesRoll reads final target stoningImmunity and magicImmunity before Stoning Touch and Stoning Gaze rolls. MC-attack. | S/stoningTouchReachesRoll reads final target stoningImmunity and magicImmunity before Stoning Touch and Stoning Gaze rolls. MC-attack. |
| ability:illusion | E/computeCasterDefenseForAttack passes final attacker flag; E/effectiveDefense early exit sets scratch defense0 unless opposing illusionImmunity. W Q b:trueLight additionally reads live u.illusion for -10 hit. MC-defense; MC-script. | E/computeCasterDefenseForAttack passes final attacker flag; E/effectiveDefense early exit sets scratch defense0 unless opposing illusionImmunity. W Q b:trueLight additionally reads live u.illusion for -10 hit. MC-defense; MC-script. |
| ability:supernatural | A/supernaturalMinDamageFn reads normalized attacking map (or Destiny) once; minimum damage from successful hits uses modern 34% ties-to-even rule, passed to per-phase damage kernels. MC-attack. | A/supernaturalMinDamageFn reads normalized attacking map (or Destiny) once; minimum damage from successful hits uses modern 34% ties-to-even rule, passed to per-phase damage kernels. MC-attack. |
| ability:illusionImmunity | I curse refusal reads u; P pair visibility reads normalized maps; C calls E/getBlurChance with directional target/source maps. P/buildVertigoContext conditionally rechecks final illusionImmunity/magicImmunity behind Vertigo (numerically inert in modern versions). E/effectiveDefense reads target immunity for the illusion-defense branch. No modern direct invisibility -10 hit penalty. MC-defense/MC-blur. | I curse refusal reads u; P pair visibility reads normalized maps; C calls E/getBlurChance with directional target/source maps. P/buildVertigoContext conditionally rechecks final illusionImmunity/magicImmunity behind Vertigo (numerically inert in modern versions). E/effectiveDefense reads target immunity for the illusion-defense branch. No modern direct invisibility -10 hit penalty. MC-defense/MC-blur. |
| ability:teleporting | S/wallOfFireEligible reads attacker final map and suppresses crossing damage. W E/applyTacticianWarlordEffects reads Teleporting for First Strike; Temporal Twist/Hierophany can clear movement first. MC-wall/MC-action. | S/wallOfFireEligible reads attacker final map and suppresses crossing damage. W E/applyTacticianWarlordEffects reads Teleporting for First Strike; Temporal Twist/Hierophany can clear movement first. MC-wall/MC-action. |
| ability:immolation | Q derived immunity grants then C normalized map enables melee-only rider; S/immolationStr reads version/chaosConjunction, P uses damage-spell arm and opposing defense; fixed0.3 spell hit. MC-recalc/MC-attack. | Q derived immunity grants then C normalized map enables melee-only rider; S/immolationStr reads version/chaosConjunction, P uses damage-spell arm and opposing defense; fixed0.3 spell hit. MC-recalc/MC-attack. |
| ability:undead | I c:undead reads captured undead OR animated and writes live race/Fantastic; S0 helper realm recovery and W TrueLight/GreatUnbinding read captured flag. E normalization derives immunities; P noHealing and S/isCreatedUndeadTarget use final map. MC-recalc; WS-UV discrepancy. | I c:undead reads captured undead OR animated and writes live race/Fantastic; S0 helper realm recovery and W TrueLight/GreatUnbinding read captured flag. E normalization derives immunities; P noHealing and S/isCreatedUndeadTarget use final map. MC-recalc; WS-UV discrepancy. |
| ability:invisibility | P/applyPairToHitModifiers visibility and E/getBlurChance read final maps; modern invisibility gives blur, canceled by attacker Illusion Immunity. MC-blur. | P/applyPairToHitModifiers visibility and E/getBlurChance read final maps; modern invisibility gives blur, canceled by attacker Illusion Immunity. MC-blur. |
| ability:weaponImmunity | S/hasWeaponImmunityEffect final target map includes Invulnerability/Wraith Form/Ruler; E defense compares attacker encMagic/encMagicIndependentOfMaterial then adds8 C2/10 W. MC-defense. | S/hasWeaponImmunityEffect final target map includes Invulnerability/Wraith Form/Ruler; E defense compares attacker encMagic/encMagicIndependentOfMaterial then adds8 C2/10 W. MC-defense. |
| ability:largeShield | E/effectiveDefense final target flag adds3 for ranged. W Q d:fortification reads running u.largeShield before granting missileImmunity or largeShield. MC-defense/MC-script. | E/effectiveDefense final target flag adds3 for ranged. W Q d:fortification reads running u.largeShield before granting missileImmunity or largeShield. MC-defense/MC-script. |
| ability:amplifier | — | S/wallOfFireAmplified reads opposing final map, W only; C/P passes amplifiedDamage into damageSpell kernel, adding1 to first positive damage category. MC-wall. |
| ability:mechanical | — | I/deriveOutlanderReformRecord captures mechanical OR nonhero Rebuild as permanentMechanical. A training:artificer and d:mechanicalExpert read u.mechanical; I/outlanderCombatSoldierAt reads u.mechanical with u.armorclad and ctx.base.fantastic. WS-OR/MC-script; snapshot limitation below. |
| ability:bloodSucker | — | Seeded record field published to final map. C selects joint-state execution and forwards the flag for conventional ranged; P independently reads/forwards the final flag for thrown, melee, counter and gaze phase records before F performs damage/healing using changing source/target state. E Vampirism also grants it after derivation. MC-attack. |
| ability:rage | — | P melee/counter calls and C conventional ranged volley call S/applyRage at resolution time: normalized rage map, derived starting figs and current alive count determine the bonus. Engine UnitCalcPre.CAS!NORAGE! preceding Rage branch instead reads permanent SRage, current damage and calculated HP, then writes calculated melee/ranged during recalculation. MC-script; MG-time remains open, so per-strike dynamic calculator reads are not established by that engine branch. |
| ability:clergy | — | I/applySanctaBasilicaGrant and b:sanctify read captured clergy plus hero/base race/name; Sanctify writes live Life race and Fantastic only for nonhero clergy. WS-SB/PF/MC-script. |
| ability:sailing | — | A training:temporalDrive reads captured sailing map under Outlander research+live u.powerEngine; adds Flying/Illusion Immunity beside Haste. WS-OR. |
| ability:flying | — | S0/bombsGrenadesActive reads live u.flying OR ctx.base.atk>0 under Outlander Sapiens gate at Q b:bombsGrenades. WS-OR. |
| ability:sapiens | — | I/outlanderSapiensAt reads ctx.base.sapiens with ctx.base.fantastic and wizard ownership; Q b explosives/ballistics/xenopsychology/radio consumers. WS-OR. |
| enchantment:combatSummoned | I a:combatSummoned/constructCatapult/callToArmsPaladins use captured flag plus retained type IDs (C2 summon conversions; W scope differs); A c:breakthrough reads captured flag and ctx.base.fantastic. MC-summon/MC-recalc. | I a:combatSummoned/constructCatapult/callToArmsPaladins use captured flag plus retained type IDs (C2 summon conversions; W scope differs); A c:breakthrough reads captured flag and ctx.base.fantastic. MC-summon/MC-recalc. |
| enchantment:resistanceToAll | A/getAbilityStatSteps e:resistanceToAll takes maximum of provided/received candidates and prayermasterAura, writes u.res once. MC-aura. | A/getAbilityStatSteps e:resistanceToAll takes maximum of provided/received candidates and prayermasterAura, writes u.res once. MC-aura. |
| enchantment:holyBonus | A/getAbilityStatSteps captures provided and received signed candidates separately; e:holyBonus takes maximum >0, reads ctx.base.atk and persistent ranged ctx.base strength, writes u atk/def/res/ranged. MC-aura. | A/getAbilityStatSteps captures provided and received signed candidates separately; e:holyBonus takes maximum >0, reads ctx.base.atk and persistent ranged ctx.base strength, writes u atk/def/res/ranged. MC-aura. |
| enchantment:elemArmor | E/hasResistElementsEffect and hasElementalArmorEffect read final select alias or individual granted flags at scratch resistance/defense query; Resist Elements Nature res+4, eligible defense+4; Elemental Armor defense+12 only. MC-res/MC-defense. | E/hasResistElementsEffect and hasElementalArmorEffect read final select alias or individual granted flags at scratch resistance/defense query; Resist Elements Nature res+4, eligible defense+4; Elemental Armor defense+12 only. MC-res/MC-defense. |
| enchantment:prayer | A c:highPrayer or c:prayer selected from captured flags; highPrayer reads melee snapshot and writes atk/def/res/hit/block; when both W adds separate b:prayer atk/def/res. MC-recalc/MC-script. | A c:highPrayer or c:prayer selected from captured flags; highPrayer reads melee snapshot and writes atk/def/res/hit/block; when both W adds separate b:prayer atk/def/res. MC-recalc/MC-script. |
| enchantment:highPrayer | A c:highPrayer or c:prayer selected from captured flags; highPrayer reads melee snapshot and writes atk/def/res/hit/block; when both W adds separate b:prayer atk/def/res. MC-recalc/MC-script. | A c:highPrayer or c:prayer selected from captured flags; highPrayer reads melee snapshot and writes atk/def/res/hit/block; when both W adds separate b:prayer atk/def/res. MC-recalc/MC-script. |
| enchantment:trueSight | Q c:trueSight reads live u.trueSight -> illusionImmunity; W d:trueSight reads live flag -> ranged hit+5. Published immunity consumed by blur/illusion/visibility; original TrueSight flag not retested as substitute there. MR-A/MC-script. | Q c:trueSight reads live u.trueSight -> illusionImmunity; W d:trueSight reads live flag -> ranged hit+5. Published immunity consumed by blur/illusion/visibility; original TrueSight flag not retested as substitute there. MR-A/MC-script. |
| enchantment:bless | E effectiveResistance/Defense reads final target flag; res Chaos/Death +5 C2/+4 W; defense qualifying Chaos/Death spell +5 C2/+7 W. MC-res/MC-defense. | E effectiveResistance/Defense reads final target flag; res Chaos/Death +5 C2/+4 W; defense qualifying Chaos/Death spell +5 C2/+7 W. MC-res/MC-defense. |
| enchantment:invulnerability | C final target map adds2 absorption; S/hasWeaponImmunityEffect also supplies weapon immunity to E defense. MR-A/MC-defense/MC-attack. | C final target map adds2 absorption; S/hasWeaponImmunityEffect also supplies weapon immunity to E defense. MR-A/MC-defense/MC-attack. |
| enchantment:holyWeapon | S0 captured hwActive creates Q c:holyWeapon threshold picks; reads live channel type, not fresh flag, and later sets effectiveWeapon/encMagic. MR-HW/MC-recalc; captured grant caveat below. | S0 captured hwActive creates Q c:holyWeapon threshold picks; reads live channel type, not fresh flag, and later sets effectiveWeapon/encMagic. MR-HW/MC-recalc; captured grant caveat below. |
| enchantment:lionheart | Q c:lionheart captured flag; ctx.base.atk gate, live nonmagical ranged type, baseFigs HP divisor; writes atk/res/ranged/hp. MC-recalc. | Q c:lionheart captured flag; ctx.base.atk gate, live nonmagical ranged type, baseFigs HP divisor; writes atk/res/ranged/hp. MC-recalc. |
| enchantment:holyArmor | Q c:holyArmor captured flag branches on live u.def>5 ->toBlk+10 else def+2. MC-recalc. | Q c:holyArmor captured flag branches on live u.def>5 ->toBlk+10 else def+2. MC-recalc. |
| enchantment:charmOfLife | Q c:charmOfLife captured flag increases current u.hp by max1,trunc(hp/4). MC-recalc. | Q c:charmOfLife captured flag increases current u.hp by max1,trunc(hp/4). MC-recalc. |
| enchantment:fear | C melee-only final-map fear -> opposing E/resistanceQueries death roll -> F/fearFailProb raw baseDeathImmunity snapshot (fallback final flag if absent); active figures sampled in attack resolution. MC-attack/MC-res. | C melee-only final-map fear -> opposing E/resistanceQueries death roll -> F/fearFailProb raw baseDeathImmunity snapshot (fallback final flag if absent); active figures sampled in attack resolution. MC-attack/MC-res. |
| enchantment:undead | I c:undead reads captured undead OR animated and writes live race/Fantastic; S0 helper realm recovery and W TrueLight/GreatUnbinding read captured flag. E normalization derives immunities; P noHealing and S/isCreatedUndeadTarget use final map. MC-recalc; WS-UV discrepancy. | I c:undead reads captured undead OR animated and writes live race/Fantastic; S0 helper realm recovery and W TrueLight/GreatUnbinding read captured flag. E normalization derives immunities; P noHealing and S/isCreatedUndeadTarget use final map. MC-recalc; WS-UV discrepancy. |
| enchantment:animated | A c:animated captured map increases melee(snapshot)/live channels/def/hit; I c:undead converts identity; E/P normalization grants Weapon/Undead immunities and noHealing. S/isCreatedUndeadTarget directly reads final animated for Exorcise's created-undead penalty. MR-U/MC-recalc/MC-attack. | A c:animated captured map increases melee(snapshot)/live channels/def/hit; I c:undead converts identity; E/P normalization grants Weapon/Undead immunities and noHealing. S/isCreatedUndeadTarget directly reads final animated for Exorcise's created-undead penalty. MR-U/MC-recalc/MC-attack. |
| enchantment:blackSleep | I gated cast publishes u.blackSleep; C normalized source flag returns no exchange if attacker asleep; target flag changes conventional attacks to Doom; S/damageSpellArm selects Doom after Magic Immunity. MC-attack. | I gated cast publishes u.blackSleep; C normalized source flag returns no exchange if attacker asleep; target flag changes conventional attacks to Doom; S/damageSpellArm selects Doom after Magic Immunity. MC-attack. |
| enchantment:blackPrayer | A c:blackPrayer captured map writes melee via ctx.base.atk, def/res and live-slot channels (isLiveSlot). MC-recalc. | A c:blackPrayer captured map writes melee via ctx.base.atk, def/res and live-slot channels (isLiveSlot). MC-recalc. |
| enchantment:raiseDead | I c:noHealConversion reads captured raiseDead OR mysticSurge -> live No Heal/Fantastic; P healing state uses resulting raceNoHeal. Original permanent EncNoHeal cast and aggregate recalc are distinct. MC-recalc/MC-summon. | I c:noHealConversion reads captured raiseDead OR mysticSurge -> live No Heal/Fantastic; P healing state uses resulting raceNoHeal. Original permanent EncNoHeal cast and aggregate recalc are distinct. MC-recalc/MC-summon. |
| enchantment:weakness | Q c:weakness reads live u.weakness; melee ctx.base.atk and current ranged/thrown field -> -3. W d:weakness additionally covers breath outside that predicate. MC-recalc/MC-script. | Q c:weakness reads live u.weakness; melee ctx.base.atk and current ranged/thrown field -> -3. W d:weakness additionally covers breath outside that predicate. MC-recalc/MC-script. |
| enchantment:wraithForm | S0 captured flag contributes encMagic; S/hasWeaponImmunityEffect and hasNonCorporealEffect read final map, E weapon-immunity policy uses Ruler to ignore material-only EncMagic. W Tactician sees noncorporeality. MR-A/MR-K/MC-defense. | S0 captured flag contributes encMagic; S/hasWeaponImmunityEffect and hasNonCorporealEffect read final map, E weapon-immunity policy uses Ruler to ignore material-only EncMagic. W Tactician sees noncorporeality. MR-A/MR-K/MC-defense. |
| enchantment:eternalNight | S0 own mark+cross-side enemyEternalNight feeds Darkness, c:enemyResistance via live Death helper; W b:poorVision also reads current type/scalar race and captured Undead, excludes Night Goblins/Death. MC-recalc/MC-script. | S0 own mark+cross-side enemyEternalNight feeds Darkness, c:enemyResistance via live Death helper; W b:poorVision also reads current type/scalar race and captured Undead, excludes Night Goblins/Death. MC-recalc/MC-script. |
| enchantment:ccDefense | I c:chaosChannels:armor:race or flight reads captured flag -> live Chaos/Fantastic; armor A c:chaosChannels:armor def+3. S0 helperRealmRecovery uses all CC marks+Undead snapshot. MR/MC-recalc. | I c:chaosChannels:armor:race or flight reads captured flag -> live Chaos/Fantastic; armor A c:chaosChannels:armor def+3. S0 helperRealmRecovery uses all CC marks+Undead snapshot. MR/MC-recalc. |
| enchantment:ccFireBreath | S0 creates independent fireBreath channel; I a:race and Q a:fireBreath use mark, live channel absence gate and strength+4. Modern excludes c recompute; helperRealmRecovery uses captured mark. MR/MC-recalc. | S0 creates independent fireBreath channel; I a:race and Q a:fireBreath use mark, live channel absence gate and strength+4. Modern excludes c recompute; helperRealmRecovery uses captured mark. MR/MC-recalc. |
| enchantment:ccFlight | I c:chaosChannels:armor:race or flight reads captured flag -> live Chaos/Fantastic; armor A c:chaosChannels:armor def+3. S0 helperRealmRecovery uses all CC marks+Undead snapshot. MR/MC-recalc. | I c:chaosChannels:armor:race or flight reads captured flag -> live Chaos/Fantastic; armor A c:chaosChannels:armor def+3. S0 helperRealmRecovery uses all CC marks+Undead snapshot. MR/MC-recalc. |
| enchantment:immolation | Q derived immunity grants then C normalized map enables melee-only rider; S/immolationStr reads version/chaosConjunction, P uses damage-spell arm and opposing defense; fixed0.3 spell hit. MC-recalc/MC-attack. | Q derived immunity grants then C normalized map enables melee-only rider; S/immolationStr reads version/chaosConjunction, P uses damage-spell arm and opposing defense; fixed0.3 spell hit. MC-recalc/MC-attack. |
| enchantment:flameBlade | S0 captured map -> c:flameBlade ctx.base.atk+3, live missile+2; contributes encMagic. C2 has no W breath tail. MC-recalc. | — |
| enchantment:shatter | Q c:shatter reads live admitted u.shatter; C2 additionally live unitType normal/hero, W no identity conjunct; positive atk/channels set1. MT/MC-recalc; current extra gate tracked below. | Q c:shatter reads live admitted u.shatter; C2 additionally live unitType normal/hero, W no identity conjunct; positive atk/channels set1. MT/MC-recalc; current extra gate tracked below. |
| enchantment:warpAttack | Q c same-name steps read live admitted curse fields; attack truncates current strengths/2, defense floor/3, resist=0. MC-recalc. | Q c same-name steps read live admitted curse fields; attack truncates current strengths/2, defense floor/3, resist=0. MC-recalc. |
| enchantment:warpDefense | Q c same-name steps read live admitted curse fields; attack truncates current strengths/2, defense floor/3, resist=0. MC-recalc. | Q c same-name steps read live admitted curse fields; attack truncates current strengths/2, defense floor/3, resist=0. MC-recalc. |
| enchantment:warpResist | Q c same-name steps read live admitted curse fields; attack truncates current strengths/2, defense floor/3, resist=0. MC-recalc. | Q c same-name steps read live admitted curse fields; attack truncates current strengths/2, defense floor/3, resist=0. MC-recalc. |
| enchantment:ironSkin | A c:ironSkin captured map ->def+5 before Holy Armor. MC-recalc. | A c:ironSkin captured map ->def+5 before Holy Armor. MC-recalc. |
| enchantment:invisibility | P/applyPairToHitModifiers visibility and E/getBlurChance read final maps; modern invisibility gives blur, canceled by attacker Illusion Immunity. MC-blur. | P/applyPairToHitModifiers visibility and E/getBlurChance read final maps; modern invisibility gives blur, canceled by attacker Illusion Immunity. MC-blur. |
| enchantment:magicImmunity | I/curseRefusedByImmunity reads u at curse cast; E/effectiveResistance and effectiveDefense read final target map; S gaze/touch/destruction and damageSpellArm reject or choose immune branch using final map. P/buildVertigoContext also conditionally reads the normalized magicImmunity flag behind Vertigo and Illusion Immunity; its modern projection is numerically inert. Hierophany/normalization ordering matters. MC-res/MC-defense/MC-attack; admission MT. | I/curseRefusedByImmunity reads u at curse cast; E/effectiveResistance and effectiveDefense read final target map; S gaze/touch/destruction and damageSpellArm reject or choose immune branch using final map. P/buildVertigoContext also conditionally reads the normalized magicImmunity flag behind Vertigo and Illusion Immunity; its modern projection is numerically inert. Hierophany/normalization ordering matters. MC-res/MC-defense/MC-attack; admission MT. |
| enchantment:guardianWind | Marked flag writes u.missileImmunity; published final field is consumed by E defense and W Nausea admission at earlier rank. MR-A/MC-defense. | Marked flag writes u.missileImmunity; published final field is consumed by E defense and W Nausea admission at earlier rank. MR-A/MC-defense. |
| enchantment:blur | C reads only tactical defender b final blur for both directions; E/getBlurChance combines that shared context with each target Invisibility and source Illusion Immunity (C2 stack.3, W.4). MC-blur. | C reads only tactical defender b final blur for both directions; E/getBlurChance combines that shared context with each target Invisibility and source Illusion Immunity (C2 stack.3, W.4). MC-blur. |
| enchantment:resistMagic | E effectiveResistance reads final target map, nonnull realm +5. I permanent cast admission and W Marionette/reform grants publish this field. MC-res. | E effectiveResistance reads final target map, nonnull realm +5. I permanent cast admission and W Marionette/reform grants publish this field. MC-res. |
| enchantment:haste | C normalized map selects repeat phases; modern counter haste disabled; P repeat uses current living/damage states, no main recalc between strikes. MC-action. | C normalized map selects repeat phases; modern counter haste disabled; P repeat uses current living/damage states, no main recalc between strikes. MC-action. |
| enchantment:vertigo | Q c:vertigo reads admitted live u.vertigo ->toHit-25/toBlk-7. P final immunity recheck has no modern numeric penalty (all Vertigo penalty fields0); modern displayDef is finalDef. MC-recalc. | Q c:vertigo reads admitted live u.vertigo ->toHit-25/toBlk-7. P final immunity recheck has no modern numeric penalty (all Vertigo penalty fields0); modern displayDef is finalDef. MC-recalc. |
| enchantment:mindStorm | A c:mindStorm requires captured mark to construct step and live u.mindStorm to execute; melee snapshot -3, def/res-5, current ranged/thrown fields-5. MC-recalc. | A c:mindStorm requires captured mark to construct step and live u.mindStorm to execute; melee snapshot -3, def/res-5, current ranged/thrown fields-5. MC-recalc. |
| enchantment:guardian | A c:guardian captured mark ->res+1/toHit+10/toBlk+10. MC-recalc. | A c:guardian captured mark ->res+1/toHit+10/toBlk+10. MC-recalc. |
| enchantment:tactician | A c:tactician captured flag/initialhero: hero atk/def/res+ranged or normal def+1; W b hero offsets and E normalization grants first/negate first strike from final Teleporting/noncorporeal/FavoredTerrain. MC-recalc/MC-script/MC-action. | A c:tactician captured flag/initialhero: hero atk/def/res+ranged or normal def+1; W b hero offsets and E normalization grants first/negate first strike from final Teleporting/noncorporeal/FavoredTerrain. MC-recalc/MC-script/MC-action. |
| enchantment:supremeLight | A/supremeLightActiveForUnit gates Q e:supremeLight using captured mark/caster, live type/current ranged plus original ranged type; live res gives floor(res/3) defense, ctx.base.atk gate and positive ranged+2. MC-recalc. | A/supremeLightActiveForUnit gates Q e:supremeLight using captured mark/caster, live type/current ranged plus original ranged type; live res gives floor(res/3) defense, ctx.base.atk gate and positive ranged+2. MC-recalc. |
| enchantment:endurance | Q c:endurance captured flag and baseFigs ->def+1/hp max1,floor4/figs. MC-recalc. | Q c:endurance captured flag and baseFigs ->def+1/hp max1,floor4/figs. MC-recalc. |
| enchantment:bloodLust | C2 I c identity ->Death/Fantastic and E normalization Undead; W no c conversion (Frenzy projection). E/bloodLustMeleeAttack normalized source mark doubles melee versus final normal/hero target. MR-U/MC-attack; literal W EncBloodLust producer caveat below. | C2 I c identity ->Death/Fantastic and E normalization Undead; W no c conversion (Frenzy projection). E/bloodLustMeleeAttack normalized source mark doubles melee versus final normal/hero target. MR-U/MC-attack; literal W EncBloodLust producer caveat below. |
| enchantment:mysticSurge | A c:mysticSurge captured map def+2/res-2; I c:noHealConversion changes identity; P normalize noHealing and buildToBlockContext reduce opposing block. MC-recalc/MC-attack; MS-C2/MS-W random cast package remains separate. | A c:mysticSurge captured map def+2/res-2; I c:noHealConversion changes identity; P normalize noHealing and buildToBlockContext reduce opposing block. MC-recalc/MC-attack; MS-C2/MS-W random cast package remains separate. |
| enchantment:blazingMarch | Q c:blazingMarch captured mark, melee snapshot and live missile (+W thrown) +3; S0 encMagic. MC-recalc. | Q c:blazingMarch captured mark, melee snapshot and live missile (+W thrown) +3; S0 encMagic. MC-recalc. |
| enchantment:survivalInstinct | A c:survivalInstinct captured mark with live compact Fantastic type ->def/res/hit. Separate W normal-unit toBlock control below. MC-recalc. | A c:survivalInstinct captured mark with live compact Fantastic type ->def/res/hit. Separate W normal-unit toBlock control below. MC-recalc. |
| enchantment:landLinking | Aliases landLinking; Q c:landLinking captured mark with live Fantastic type ->snapshot melee+2/def+2/live breath+2; W also b:natureLink res+1 from captured mark. MC-recalc/MC-script. | — |
| enchantment:focusMagic | Q c:focusMagic captured flag, live positive doomGaze/breath+3; ctx.base ranged absence/type chooses transfer of current thrown strength, new ranged3, retype, or ranged+3. W E normalization relocates final Stoning/Death Touch to melee records. MC-recalc/MC-attack. | Q c:focusMagic captured flag, live positive doomGaze/breath+3; ctx.base ranged absence/type chooses transfer of current thrown strength, new ranged3, retype, or ranged+3. W E normalization relocates final Stoning/Death Touch to melee records. MC-recalc/MC-attack. |
| enchantment:spellLock | I permanent cast flag ->u; W Q b:strayedPackage tests live u.spellLock; S/exorciseReachesRoll uses final target map SpellLock, with Fantastic/Magic Immunity. WS-MP/MC-attack. | I permanent cast flag ->u; W Q b:strayedPackage tests live u.spellLock; S/exorciseReachesRoll uses final target map SpellLock, with Fantastic/Magic Immunity. WS-MP/MC-attack. |
| enchantment:discipline | Aliases discipline; Q c:discipline reads live u.discipline and level for overland/combat delta and nonmagical ranged; S0 publication grants negateFirstStrike for combat value+level>=elite. MR/MC-recalc. | — |
| enchantment:disciplineWarlord | — | Aliases discipline; Q c:discipline reads live u.discipline and level for overland/combat delta and nonmagical ranged; S0 publication grants negateFirstStrike for combat value+level>=elite. MR/MC-recalc. |
| enchantment:breakthrough | A c:breakthrough variants use captured selector/nonCorporeal/combatSummoned, normal arm ctx.base.fantastic; each melee addition also ctx.base.atk gate. MC-recalc; snapshot issue below. | A c:breakthrough variants use captured selector/nonCorporeal/combatSummoned, normal arm ctx.base.fantastic; each melee addition also ctx.base.atk gate. MC-recalc; snapshot issue below. |
| enchantment:spellWard | S0/spellWardActive parses captured realm; Q c tests current helper Death/Chaos or scalar other realm, writes res/def/hit penalties. MC-recalc. | S0/spellWardActive parses captured realm; Q c tests current helper Death/Chaos or scalar other realm, writes res/def/hit penalties. MC-recalc. |
| enchantment:guidingBeaconAura | A e:guidingBeaconAura reads captured positive value; current ranged-field strength>0 ->add. MC-aura. | A e:guidingBeaconAura reads captured positive value; current ranged-field strength>0 ->add. MC-aura. |
| enchantment:prayermasterAura | A e:resistanceToAll maximum against supplied/received ResistanceToAll; captured values, live u.res write. MC-aura. | A e:resistanceToAll maximum against supplied/received ResistanceToAll; captured values, live u.res write. MC-aura. |
| enchantment:divineBarrierAura | A e:divineBarrierAura captured positive value ->u.def. MC-aura. | A e:divineBarrierAura captured positive value ->u.def. MC-aura. |
| enchantment:soulLinkerAura | A e:soulLinkerAura captured positive value, live u.fantastic gate ->hit/block. MC-aura. | A e:soulLinkerAura captured positive value, live u.fantastic gate ->hit/block. MC-aura. |
| enchantment:leadershipAura | A e:leadershipAura captured positive value, !u.fantastic; melee snapshot and positive live nonmagical ranged field (half value). MC-aura. | A e:leadershipAura captured positive value, !u.fantastic; melee snapshot and positive live nonmagical ranged field (half value). MC-aura. |
| enchantment:heavenlyLight | S0 captured mark ->Q c stats; melee inputBaseAtk gate, positive live conventional ranged; material hit tail current weapon+ctx.base.fantastic+initialhero. S0 encMagic/effectiveWeapon tail also reads mark. MC-recalc. | S0 captured mark ->Q c stats; melee inputBaseAtk gate, positive live conventional ranged; material hit tail current weapon+ctx.base.fantastic+initialhero. S0 encMagic/effectiveWeapon tail also reads mark. MC-recalc. |
| enchantment:darkForce | Q c:darkForce captured flag ->u.toHit/toBlk+10. MC-recalc. | Q c:darkForce captured flag ->u.toHit/toBlk+10. MC-recalc. |
| enchantment:badMoon | Q c same-name steps captured marks plus ctx.base.fantastic (! for moons, true for conjunction); GoodMoon/NatureConjunction additionally positive current attack/ranged gates. MC-recalc. | Q c same-name steps captured marks plus ctx.base.fantastic (! for moons, true for conjunction); GoodMoon/NatureConjunction additionally positive current attack/ranged gates. MC-recalc. |
| enchantment:goodMoon | Q c same-name steps captured marks plus ctx.base.fantastic (! for moons, true for conjunction); GoodMoon/NatureConjunction additionally positive current attack/ranged gates. MC-recalc. | Q c same-name steps captured marks plus ctx.base.fantastic (! for moons, true for conjunction); GoodMoon/NatureConjunction additionally positive current attack/ranged gates. MC-recalc. |
| enchantment:natureConjunction | Q c same-name steps captured marks plus ctx.base.fantastic (! for moons, true for conjunction); GoodMoon/NatureConjunction additionally positive current attack/ranged gates. MC-recalc. | Q c same-name steps captured marks plus ctx.base.fantastic (! for moons, true for conjunction); GoodMoon/NatureConjunction additionally positive current attack/ranged gates. MC-recalc. |
| enchantment:destiny | Aliases destiny; I/Q buffs permanent-state simulation and c calculated package use captured mark; A minimum-damage helper also checks final Destiny. Actual MR-DE permanently mutates B during recalc; current pre-copy placement differs. MR-DE/MC-recalc. | — |
| enchantment:rulerOfUnderworld | S0 captured flag contributes encMagic; S/hasWeaponImmunityEffect and hasNonCorporealEffect read final map, E weapon-immunity policy uses Ruler to ignore material-only EncMagic. W Tactician sees noncorporeality. MR-A/MR-K/MC-defense. | S0 captured flag contributes encMagic; S/hasWeaponImmunityEffect and hasNonCorporealEffect read final map, E weapon-immunity policy uses Ruler to ignore material-only EncMagic. W Tactician sees noncorporeality. MR-A/MR-K/MC-defense. |
| enchantment:mislead | Aliases mislead; A e:mislead captured mark plus live !u.fantastic; atk/def/res-1 and persistent ranged ctx.base strength-1. MC-recalc. | — |
| enchantment:innerPower | A c:innerPower captured mark then live u.fireImmunity OR lightningResist; melee snapshot+3, def/res+2, positive ranged/breath+3. MC-recalc. | A c:innerPower captured mark then live u.fireImmunity OR lightningResist; melee snapshot+3, def/res+2, positive ranged/breath+3. MC-recalc. |
| enchantment:blazingEyes | Aliases blazingEyes; Q c uses captured mark plus live Chaos helper; u.doomGaze adds3 if0 else1. W label does not mean Power of Chaos cast package. MC-recalc. | — |
| enchantment:reinforceMagic | Q c captured mark ->res+2 and live magical ranged strength+2. MC-recalc. | Q c captured mark ->res+2 and live magical ranged strength+2. MC-recalc. |
| enchantment:apotheosis | — | Aliases destiny; I/Q buffs permanent-state simulation and c calculated package use captured mark; A minimum-damage helper also checks final Destiny. Actual MR-DE permanently mutates B during recalc; current pre-copy placement differs. MR-DE/MC-recalc. |
| enchantment:liability | — | Aliases mislead; A e:mislead captured mark plus live !u.fantastic; atk/def/res-1 and persistent ranged ctx.base strength-1. MC-recalc. |
| enchantment:chaosEmbrace | — | Aliases blazingEyes; Q c uses captured mark plus live Chaos helper; u.doomGaze adds3 if0 else1. W label does not mean Power of Chaos cast package. MC-recalc. |
| enchantment:natureLink | — | Aliases landLinking; Q c:landLinking captured mark with live Fantastic type ->snapshot melee+2/def+2/live breath+2; W also b:natureLink res+1 from captured mark. MC-recalc/MC-script. |
| enchantment:lavaSmelterWeaponImmunity | — | I/lavaSmelterGrantSteps training checks captured mark/base unitType and sets respective record field; later E defense/resistance reads published flag (FieryBlade instead Q c:flameBlade/live u.fieryBlade and S0 encMagic). WS-LS; individual writer map above. |
| enchantment:lavaSmelterMissileImmunity | — | I/lavaSmelterGrantSteps training checks captured mark/base unitType and sets respective record field; later E defense/resistance reads published flag (FieryBlade instead Q c:flameBlade/live u.fieryBlade and S0 encMagic). WS-LS; individual writer map above. |
| enchantment:lavaSmelterResistElements | — | I/lavaSmelterGrantSteps training checks captured mark/base unitType and sets respective record field; later E defense/resistance reads published flag (FieryBlade instead Q c:flameBlade/live u.fieryBlade and S0 encMagic). WS-LS; individual writer map above. |
| enchantment:lavaSmelterElementalArmor | — | I/lavaSmelterGrantSteps training checks captured mark/base unitType and sets respective record field; later E defense/resistance reads published flag (FieryBlade instead Q c:flameBlade/live u.fieryBlade and S0 encMagic). WS-LS; individual writer map above. |
| enchantment:lavaSmelterFieryBlade | — | I/lavaSmelterGrantSteps training checks captured mark/base unitType and sets respective record field; later E defense/resistance reads published flag (FieryBlade instead Q c:flameBlade/live u.fieryBlade and S0 encMagic). WS-LS; individual writer map above. |
| enchantment:godsPlayDices | — | S0 clamps captured numeric mark[-2,2]; Q b:godsPlayDices adds to u.res. MC-script; MG-context original external RNG not modeled. |
| enchantment:sageMaster | — | Current core has no numeric/grant consumer of this offered mark: retained input/origin metadata only (checked literal/dynamic package reads in I/deriveMarionettePackage and marionetteOwnedGrantFires). WS-MP retort tail does contain engine grants; current missing consumer, not missing engine evidence. F257 lead for .1f. |
| enchantment:astrologer | — | Current core has no numeric/grant consumer of this offered mark: retained input/origin metadata only (checked literal/dynamic package reads in I/deriveMarionettePackage and marionetteOwnedGrantFires). WS-MP retort tail does contain engine grants; current missing consumer, not missing engine evidence. F257 lead for .1f. |
| enchantment:charismatic | — | Current core has no numeric/grant consumer of this offered mark: retained input/origin metadata only (checked literal/dynamic package reads in I/deriveMarionettePackage and marionetteOwnedGrantFires). WS-MP retort tail does contain engine grants; current missing consumer, not missing engine evidence. F257 lead for .1f. |
| enchantment:enchanter | — | Current core has no numeric/grant consumer of this offered mark: retained input/origin metadata only (checked literal/dynamic package reads in I/deriveMarionettePackage and marionetteOwnedGrantFires). WS-MP retort tail does contain engine grants; current missing consumer, not missing engine evidence. F257 lead for .1f. |
| enchantment:channeler | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionetteBaseSkill | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionettePrimary | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionetteNatureBooks | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionetteSorceryBooks | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionetteChaosBooks | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionetteLifeBooks | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionetteDeathBooks | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionetteAscension | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:marionetteConjurer | — | I/deriveMarionettePackage reads captured wizard controls plus ishero/herotype48; Q b owned/strayed steps use package inputs, live flag guards and channel slots. BaseSkill divides into stats, primary/books/ascension choose grants/type; Conjurer only package spell/charges display selection. No retort-tail numeric consumer is currently implemented. WS-MP; permanent recalc mismatch below. |
| enchantment:pillarOfFaithRes | — | S0 initial !hero and Q training:pillarOfFaith live !u.fantastic; captured numeric value ->res. WS-B; MG-context. |
| enchantment:powerMinerals | — | S0 builds captured counts/marks; Q training:naturalSelection gates live !u.fantastic and initial !hero. Minerals/nightshade share res maximum adjustment; coal atk+1, iron def+1; WildGame requires conventional ranged channel with permanent strength. WS-B. |
| enchantment:survivalInstinctToBlock | — | S0 initial baseUnitType normal gate; Q training adds captured value to toBlk. WS-B/MC-script; MG-context. |
| enchantment:altarOfTheMoon | — | S0 base race Gnoll,!hero and name Hunter/Witchdoctor snapshots; Q training reads channel permanent-strength metadata, adds res/ranged and grants rage/poisonImmunity/poison or lifeSteal. WS-B; F213. |
| enchantment:altarOfTheSun | — | S0 base race Hawkmen,!hero/name HolyMother snapshots; Q training HolyMother atk+1 else S0 figure projection adds figure. WS-B; F213. |
| enchantment:alumniOfAcademy | — | S0 initial Halfling,!hero/name Rocs or captured !mechanical+permanent magical ranged; figure projection training step adds +2 figs. WS-B; F213. |
| enchantment:armorcladReform | — | I/deriveOutlanderReformRecord captures wizard research+permanentMechanical approximation; A training armorclad/powerEngine grants, MilitaryDrilling reads live !fantastic, MagitekScience live armorclad, TemporalDrive live powerEngine plus captured Sailing. WS-OR; creation/upgrade histories collapse. |
| enchantment:ballisticsTraining | — | I Outlander ownership/research and S0 captured Explosive; Q b reads I/outlanderSapiensAt(ctx.base fantastic/sapiens). Explosive additionally reads ctx.base.atk OR live flying and live slot types; other grants modify thresholds/res. WS-OR. |
| enchantment:artificer | — | A training:artificer captured mark with live u.mechanical; current weapon normal->magic and atk/def/res/ranged-field bonus. MC-script; MG-context external source. |
| enchantment:dragonMound | — | S0 initial Draconian,!hero; seeds FireBreath, Q training adds def+1/fireBreath+2. WS-B; F213. |
| enchantment:energyBeamWeapons | — | I Outlander research; Q training EnergyCannon reads live powerEngine plus captured permanent ranged eligibility, adds half strength/retypes; d EnergyWeaponry reads mixed record soldier gate; d threshold reads ctx.base ranged and live powerEngine/hit; S0 publishes ranged Destruction before distance. WS-OR/MC-attack. |
| enchantment:explosive | — | I Outlander ownership/research and S0 captured Explosive; Q b reads I/outlanderSapiensAt(ctx.base fantastic/sapiens). Explosive additionally reads ctx.base.atk OR live flying and live slot types; other grants modify thresholds/res. WS-OR. |
| enchantment:favoredTerrain | — | A d captured mark+tactician chooses multiplier, writes def/hit; E normalize with Tactician grants first/negate strike. MC-script/MC-action. |
| enchantment:fortification | — | Q d captured mark reads live u.largeShield, grants either largeShield or missileImmunity; later E defense reads final fields. MC-script. |
| enchantment:heatPowerEngine | — | I/deriveOutlanderReformRecord captures wizard research+permanentMechanical approximation; A training armorclad/powerEngine grants, MilitaryDrilling reads live !fantastic, MagitekScience live armorclad, TemporalDrive live powerEngine plus captured Sailing. WS-OR; creation/upgrade histories collapse. |
| enchantment:hillfort | — | I marked immunity writer supplies u.missileImmunity; E final target missile defense consumer. Original building/context writer unresolved MG-context; MC-defense. |
| enchantment:lightningBlade | — | S0 initial normal+mark synthesizes breath; Q training transfers running thrown strength+1 into lightningBreath and clears source. WS-B. |
| enchantment:ludusAgoge | — | S0 initial Orc,!hero,!Legionary; Q training adds atk/res/hp and permanent-strength channels. WS-B; F213. |
| enchantment:magitekEngineering | — | I captures Outlander research+derived powerEngine, A b:magitekEngine writes toBlk+20/largeShield. Engine tests calculated PowerEngine at hook; current captured derived value stands for it. WS-OR. |
| enchantment:magitekScience | — | I/deriveOutlanderReformRecord captures wizard research+permanentMechanical approximation; A training armorclad/powerEngine grants, MilitaryDrilling reads live !fantastic, MagitekScience live armorclad, TemporalDrive live powerEngine plus captured Sailing. WS-OR; creation/upgrade histories collapse. |
| enchantment:malnourished | — | A training captured mark ->atk-1/def-2 before copy. MC-script; source position is creation/upgrade projection, not established cast order. |
| enchantment:mechanicalExpert | — | A d captured mark+live u.mechanical ->hit+20/block+10. MC-script. |
| enchantment:militaryWorkshop | — | S0/buildSlotContext captures mark/research, initialnormal and physical channel shape; Q training:militaryWorkshop reads captured doom/live AP to grant strength or AP and retype missile->boulder; grants poison+1. WS-B/WS-OR. |
| enchantment:militaryDrilling | — | I/deriveOutlanderReformRecord captures wizard research+permanentMechanical approximation; A training armorclad/powerEngine grants, MilitaryDrilling reads live !fantastic, MagitekScience live armorclad, TemporalDrive live powerEngine plus captured Sailing. WS-OR; creation/upgrade histories collapse. |
| enchantment:motherFungus | — | S0 initial Goblin,!hero; Q training atk/ranged/toBlk/poison, channel eligibility captured permanent-strength. WS-B; F213. |
| enchantment:pneumaReactor | — | Q d uses I/outlanderCombatSoldierAt: ownership, ctx.base.fantastic, live mechanical/armorclad. Psycho reads live res/level to hit/block; Pneuma live res/lifeSteal ->drain modifier. WS-OR; mixed-record issue below. |
| enchantment:poolOfRepentance | — | S0 initial Rakhshasa,!hero; Q training res/def+1. WS-B; F213. |
| enchantment:psychoConverter | — | Q d uses I/outlanderCombatSoldierAt: ownership, ctx.base.fantastic, live mechanical/armorclad. Psycho reads live res/level to hit/block; Pneuma live res/lifeSteal ->drain modifier. WS-OR; mixed-record issue below. |
| enchantment:radio | — | I Outlander ownership/research and S0 captured Explosive; Q b reads I/outlanderSapiensAt(ctx.base fantastic/sapiens). Explosive additionally reads ctx.base.atk OR live flying and live slot types; other grants modify thresholds/res. WS-OR. |
| enchantment:rocketry | — | S0/buildSlotContext captures mark/research, initialnormal and physical channel shape; Q training:militaryWorkshop reads captured doom/live AP to grant strength or AP and retype missile->boulder; grants poison+1. WS-B/WS-OR. |
| enchantment:sanctaBasilica | — | I pre-sequence grant reads base HighMen/name/clergy, sets captured Sanctify/MagicImmunity; Q training res+3 uses S0 snapshot. I b:sanctify later reads captured grant. WS-SB/PF; F213 and permanent writer positioning. |
| enchantment:temporalEngineering | — | I/deriveOutlanderReformRecord captures wizard research+permanentMechanical approximation; A training armorclad/powerEngine grants, MilitaryDrilling reads live !fantastic, MagitekScience live armorclad, TemporalDrive live powerEngine plus captured Sailing. WS-OR; creation/upgrade histories collapse. |
| enchantment:uphillBattle | — | Q b captured mark ->res+1/hit+10/block+10. MC-script. |
| enchantment:xenopsychology | — | I Outlander ownership/research and S0 captured Explosive; Q b reads I/outlanderSapiensAt(ctx.base fantastic/sapiens). Explosive additionally reads ctx.base.atk OR live flying and live slot types; other grants modify thresholds/res. WS-OR. |
| enchantment:xenoveterinary | — | I Outlander research; Q b reads live u.fantastic/hp, adds quarter HP minimum1 and hit+10. WS-OR. |
| enchantment:outlanderWizard | — | I research(key) gates fifteen reform states; outlanderSapiensAt, BattleArmor and CombatSoldier gates retain ownership separately from unit fields. WS-OR; wizard context persists outside records. |
| enchantment:flameBladeWarlord | — | Aliases flameBlade; S0 creates fireBreath channel, Q c:flameBlade reads captured combat mark OR live fieryBlade, missile/thrown+2; d combat flameBlade breath+1. MC-recalc/MC-script. |
| enchantment:rebuild | — | I/Q buffs cast then A buffs nonhero reads u.rebuild for permanent-state simulation; hero b reads same live flag. I reform captures nonhero Rebuild as mechanical before those steps. E normalize grants final mechanical(nonhero), Death/Illusion immunity/AP. WS-RE/WS-MP; recalc persistent grants caveat. |
| enchantment:spiritLink | — | A buffs captured mark res+2; I/Q buffs initial Fantastic gate label/clear/reset. I b/d captured permanent-flag projection sets then clears live Fantastic; S0 GreatUnbinding captured mark excludes it. WS-SL; repeated recalc writes distinguished above. |
| enchantment:luckyStar | — | A b captured flag unconditionally atk/def/res+1 and ranged-field+1. MC-script. |
| enchantment:rally | — | A b:rally reads captured flag and applies u.res += 2. MC-script; MG-context. |
| enchantment:nausea | — | I curse admission reads u; Q b live u.nausea and !u.fantastic ->hit/block-10. WS-N. |
| enchantment:disheartenProphecy | — | A b:disheartenProphecy reads captured flag and applies u.res -= 2. MC-script; MG-context. |
| enchantment:divineProtection | — | Q b captured flag ->u.deathImmunity/lucky; A c:lucky subsequently reads live grant; final immunity consumed at attacks. MC-script. |
| enchantment:angelicGuardians | — | E/applyAngelicGuardiansEffects after normalization reads final Exorcise definedness/liveRace and captured baseFantastic to alter/grant Exorcise; P touch placement then consumes. MC-script/MC-attack. |
| enchantment:eyeOfHeaven | — | I curse gate reads own captured Eye context; Q b own mark grants trueSight. Cross-side enemyEye S0/Q d zeros doomGaze and postrun clears Stoning/Death Gaze modifiers. WS-EYE. |
| enchantment:sanctify | — | I b:sanctify captured mark/clergy/initialhero ->Life race, Fantastic on clergy only; downstream live realm/type consumers see result. WS-CS; MG-time. |
| enchantment:zeal | — | E normalize reads final mark ->FirstStrike/NegateFirstStrike before TemporalTwist/Tactician; C phase selection. MC-script/MC-action. |
| enchantment:hierophany | — | Q d captured flag halves current def; I postrun applyHierophanyAbilityStrip reads final flag, clears13 immunity/movement/negate fields; E normalization can grant some back afterward. WS-HI; schedule mismatch candidate below. |
| enchantment:pillarOfFaithLucky | — | I/applyPillarOfFaithGrant captured mark ->lucky before seed; A c:lucky consumes live u.lucky. WS-SB/PF; producer positioning caveat. |
| enchantment:shadowStrike | — | S0 seeds thrown channel; Q d captured flag plus current thrown-field shape adds1+trunc(u.atk/3). MC-script. |
| enchantment:revenant | — | E normalize reads final mark ->Undead and DeathTouch0; W touchFlagRecords puts DeathTouch only melee. No I live identity conversion from this mark during derivation. WS-UV; F235. |
| enchantment:vampirism | — | Q d captured mark reads positive thrown/breath strengths, transfers half sum to melee then sets each source1; E normalize adds Undead/BloodSucker after stat derivation. WS-UV; F235. |
| enchantment:soulFlay | — | Q b captured flag +!ctx.base.fantastic, live u.level defines atk/def/res/ranged deltas. MC-script. |
| enchantment:plague | — | Q b captured mark ->res-6/def-3/atk-3/ordinary ranged-3/hit-10. MC-script. |
| enchantment:berserkWarlord | — | Q b captured flag hit+15/def-1; no classic c Berserk double-attack in W scope. MC-script. |
| enchantment:blazeOfGlory | — | S0 captured mark/!initialhero seeds channels; Q d transfers live def to atk, zeros def, moves current ranged into thrown, grants AP/WallCrusher and clears firstStrike. MC-script. |
| enchantment:fieryFury | — | I b race arm reads ctx.base.fantastic; Q b normal arm reads inverse and live FieryBlade/captured combat blade to suppress overlap. E normalize final mark/baseFantastic or Destiny grants FirstStrike. MC-script. |
| enchantment:insulation | — | Q b captured mark grants live Fire/Cold immunity and LightningResist; c InnerPower sees grant; E final attack defenses consume. MC-script. |
| enchantment:beatOfSwiftness | — | Q d captured mark ->def minus ties-to-even(def/10). MC-script. |
| enchantment:rust | — | S0 rustActiveAt uses captured mark+ctx.base.fantastic (or pre-copy u); Q debuffs clears weapon only; A/S0 d reduces atk/physical ranged and clears LargeShield/thrown type+strength. WS-RU; mismatch against calculated target and nine engine clears remains. |
| enchantment:wallOfFireBoost | — | Q b:garrison captured mark+!ctx.base.fantastic, current physical ranged/thrown+1 and atk+1; S0 encMagic. Separate global wallOfFire crossing below. MC-script. |
| enchantment:colossalStrength | — | Q d captured flag reads live atk/channel strengths and physical type, adds1+floor(.4*positive strength). MC-script. |
| enchantment:venom | — | Q d captured flag ->poisonImmunity and live poison+1; published numeric poison then P/S riders. MC-script. |
| enchantment:transmuteEquipment | — | I buffs permanentCastFlagSteps reads live flag and nonhero material conditions; Q b heroAugment reads u.transmuteEquipment (including Marionette grant), stats+2/res+1. WS-TE/WS-MP; persistent recalc destination issue. |
| enchantment:coal | — | S0 builds captured counts/marks; Q training:naturalSelection gates live !u.fantastic and initial !hero. Minerals/nightshade share res maximum adjustment; coal atk+1, iron def+1; WildGame requires conventional ranged channel with permanent strength. WS-B. |
| enchantment:iron | — | S0 builds captured counts/marks; Q training:naturalSelection gates live !u.fantastic and initial !hero. Minerals/nightshade share res maximum adjustment; coal atk+1, iron def+1; WildGame requires conventional ranged channel with permanent strength. WS-B. |
| enchantment:wildGame | — | S0 builds captured counts/marks; Q training:naturalSelection gates live !u.fantastic and initial !hero. Minerals/nightshade share res maximum adjustment; coal atk+1, iron def+1; WildGame requires conventional ranged channel with permanent strength. WS-B. |
| enchantment:nightshade | — | S0 builds captured counts/marks; Q training:naturalSelection gates live !u.fantastic and initial !hero. Minerals/nightshade share res maximum adjustment; coal atk+1, iron def+1; WildGame requires conventional ranged channel with permanent strength. WS-B. |
| enchantment:planewalking | — | Aliases teleporting; S/wallOfFireEligible and W E/applyTacticianWarlordEffects consume normalized field, after TemporalTwist/Hierophany strip. MC-wall/MC-action. |
| enchantment:temporalTwist | — | E normalize reads final mark, removes FirstStrike/NegateFirstStrike/Teleporting before W Tactician may grant strike flags again. MC-script/MC-action. |
| enchantment:greatUnbinding | — | S0 captured mark and !spiritLink; Q b gate reads live fantastic OR captured Undead/Animated/CC/Revenant/Vampirism, writes res/hit/block penalties. MC-script; not solely live identity. |
| card:Unit | S0 creates record identity/stat seed from selected roster; all later u/ctx.base and combat-unit reads use those values. MC-recalc; MR copy. | S0 creates record identity/stat seed from selected roster; all later u/ctx.base and combat-unit reads use those values. MC-recalc; MR copy. |
| card:BaseHero | S0 initial ishero/hero predicates and I herotype-sensitive logic; A levels/reforms and E Charmed/Rebuild use identity. MC-recalc/MC-res. | S0 initial ishero/hero predicates and I herotype-sensitive logic; A levels/reforms and E Charmed/Rebuild use identity. MC-recalc/MC-res. |
| card:BaseFantastic | S0 initial Fantastic predicates, I seed and live conversion; Q a:baseCopy ->ctx.base permanent snapshot gates. MC-recalc. | S0 initial Fantastic predicates, I seed and live conversion; Q a:baseCopy ->ctx.base permanent snapshot gates. MC-recalc. |
| card:BaseRace | S0 initial baseUnitRace building tests; I seed/conversions ->live scalar realm, helper Death/Chaos union and combat liveRace. MC-recalc. | S0 initial baseUnitRace building tests; I seed/conversions ->live scalar realm, helper Death/Chaos union and combat liveRace. MC-recalc. |
| card:SpecialUnit | I creates retained unittype/herotype; S0/I exact-type tests (NightGoblins, Golem, summons, Marionette) use record or initial identity. MC-recalc/MC-summon. | I creates retained unittype/herotype; S0/I exact-type tests (NightGoblins, Golem, summons, Marionette) use record or initial identity. MC-recalc/MC-summon. |
| card:Figs | S0 baseFigs divisors and separate S0 figureSteps run on {figs}; P remainingUnitState and changing combat state use final figs for HP/attacks. MC-fig/MC-attack. | S0 baseFigs divisors and separate S0 figureSteps run on {figs}; P remainingUnitState and changing combat state use final figs for HP/attacks. MC-fig/MC-attack. |
| card:Atk | Q template:stat:base seeds u.atk; a:baseCopy publishes snapshot for positive-melee gates; current u.atk feeds scaling and C damage. MC-recalc/MC-attack. | Q template:stat:base seeds u.atk; a:baseCopy publishes snapshot for positive-melee gates; current u.atk feeds scaling and C damage. MC-recalc/MC-attack. |
| card:ModernRangedType | S0 buildSlotContext seeds independent ranged type; Q steps read ctx.base/current types, P modernAttackUnit and E attack-defense descriptors read final channel. MC-recalc/MC-attack. | S0 buildSlotContext seeds independent ranged type; Q steps read ctx.base/current types, P modernAttackUnit and E attack-defense descriptors read final channel. MC-recalc/MC-attack. |
| card:ModernRanged | Q template seeds independent ranged strength; training/permanent metadata and ctx.base determine later gates; final channel passed to ranged action. MC-recalc/MC-attack. | Q template seeds independent ranged strength; training/permanent metadata and ctx.base determine later gates; final channel passed to ranged action. MC-recalc/MC-attack. |
| card:ModernThrown | Q template independent thrown strength/type; transfers and grants read current/snapshot fields; P modernAttackChannels/modernAttackUnit resolve thrown independently. MC-recalc/MC-attack. | Q template independent thrown strength/type; transfers and grants read current/snapshot fields; P modernAttackChannels/modernAttackUnit resolve thrown independently. MC-recalc/MC-attack. |
| card:ModernFireBreath | Q template fireBreath strength/type; CC and later changes read current fields; P resolves channel separately with fire defense. MC-recalc/MC-attack. | Q template fireBreath strength/type; CC and later changes read current fields; P resolves channel separately with fire defense. MC-recalc/MC-attack. |
| card:ModernLightningBreath | Q template lightningBreath strength/type; lightningBlade transfer and other grants; P independent channel/E lightning resistance defense. MC-recalc/MC-attack. | Q template lightningBreath strength/type; lightningBlade transfer and other grants; P independent channel/E lightning resistance defense. MC-recalc/MC-attack. |
| card:HitChance | Q template:baseHitChance common threshold ->u.toHit; e clamp then S0 chance projection; C/P attack rolls use final chance. MC-recalc/MC-attack. | Q template:baseHitChance common threshold ->u.toHit; e clamp then S0 chance projection; C/P attack rolls use final chance. MC-recalc/MC-attack. |
| card:HitMelee | Q template:baseThresholds u.toHitMelee; final common+melee projection then C/P roll. MC-recalc/MC-attack. | Q template:baseThresholds u.toHitMelee; final common+melee projection then C/P roll. MC-recalc/MC-attack. |
| card:HitRanged | Q template:baseThresholds independent toHitRanged; final chance projection includes attacker distance only. MC-recalc/MC-range. | Q template:baseThresholds independent toHitRanged; final chance projection includes attacker distance only. MC-recalc/MC-range. |
| card:HitThrown | Q template:baseThresholds independent toHitThrown; S0 final chance projection and P channel roll. MC-recalc/MC-attack. | Q template:baseThresholds independent toHitThrown; S0 final chance projection and P channel roll. MC-recalc/MC-attack. |
| card:HitBreath | Q template:baseThresholds toHitBreath shared by two independent breath channels; S0 projection/P channel roll. MC-recalc/MC-attack. | Q template:baseThresholds toHitBreath shared by two independent breath channels; S0 projection/P channel roll. MC-recalc/MC-attack. |
| card:ToBlkMod | Q template:baseThresholds u.toBlk; live modifiers then S0 clamps published0..1; P defense profile caps dice above15 to.30. MC-recalc/MC-defense. | Q template:baseThresholds u.toBlk; live modifiers then S0 clamps published0..1; P defense profile caps dice above15 to.30. MC-recalc/MC-defense. |
| card:Def | Q template seeds u.def, later current-field predicates/scales; E attack-specific scratch starts final target.def+extraDefense. MC-recalc/MC-defense. | Q template seeds u.def, later current-field predicates/scales; E attack-specific scratch starts final target.def+extraDefense. MC-recalc/MC-defense. |
| card:Res | Q template u.res; later scaling/realm/stat consumers and E scratch effectiveResistance start from final target.res. MC-recalc/MC-res. | Q template u.res; later scaling/realm/stat consumers and E scratch effectiveResistance start from final target.res. MC-recalc/MC-res. |
| card:HP | Q template u.hp then live scaling; S0 output/P healing and remainingUnitState use final perfigure HP. MC-recalc/MC-attack. | Q template u.hp then live scaling; S0 output/P healing and remainingUnitState use final perfigure HP. MC-recalc/MC-attack. |
| card:CityWalls | S0 publishes cityWallBonus; E/computeCasterDefenseForAttack supplies target bonus only for non-Immolation attacks when attacker has no positive wall bonus. MC-wall/MC-defense. | S0 publishes cityWallBonus; E/computeCasterDefenseForAttack supplies target bonus only for non-Immolation attacks when attacker has no positive wall bonus. MC-wall/MC-defense. |
| card:Level | Q training:veterancy seed; c:level:fantastic reads ctx.base.fantastic; c:level reads live level and base ranged/hero live thrown data; Discipline/Psycho also live level. C2/W ladders differ in A/getLevelBonuses. MC-recalc. | Q training:veterancy seed; c:level:fantastic reads ctx.base.fantastic; c:level reads live level and base ranged/hero live thrown data; Discipline/Psycho also live level. C2/W ladders differ in A/getLevelBonuses. MC-recalc. |
| card:Weapon | S0 original eligibility and Q training weaponQuality ->u.weaponMaterial; c:weapon live material with ctx.base.atk; postrun encMagic material term and E defense. MC-recalc/MC-defense. | S0 original eligibility and Q training weaponQuality ->u.weaponMaterial; c:weapon live material with ctx.base.atk; postrun encMagic material term and E defense. MC-recalc/MC-defense. |
| card:Armor | S0 initial eligibility; Q training armorQuality ->u.armorMaterial; c:orihalcon reads live material +magical ranged type. MC-recalc. | S0 initial eligibility; Q training armorQuality ->u.armorMaterial; c:orihalcon reads live material +magical ranged type. MC-recalc. |
| card:Dmg | S0 publishes supplied damage; P remainingUnitState and combatHealStateFromUnit construct initial state; C/F joint cells update damage/figures. No recalc cast writer. MC-attack. | S0 publishes supplied damage; P remainingUnitState and combatHealStateFromUnit construct initial state; C/F joint cells update damage/figures. No recalc cast writer. MC-attack. |
| global:gameVersion | S0/filterStepsToVersionScope/statChain and C/P/E effect scopes select schedules/formulas. Calculator configuration, no unit flag read. | S0/filterStepsToVersionScope/statChain and C/P/E effect scopes select schedules/formulas. Calculator configuration, no unit flag read. |
| global:trueLight | C2 explicitly suppressed by S0 hasTrueLight; W Q b:trueLight reads current scalar Life/Death or captured Undead and live illusion; modifies stats/hit. MC-script; offered matrix exception retained. | C2 explicitly suppressed by S0 hasTrueLight; W Q b:trueLight reads current scalar Life/Death or captured Undead and live illusion; modifies stats/hit. MC-script; offered matrix exception retained. |
| global:darkness | S0 raw global OR either EternalNight; Q c:darkness live Death helper/Life scalar and positive current stats/channels. W d NightGoblins reads live unittype plus captured darkness. MC-recalc/MC-script. | S0 raw global OR either EternalNight; Q c:darkness live Death helper/Life scalar and positive current stats/channels. W d NightGoblins reads live unittype plus captured darkness. MC-recalc/MC-script. |
| global:wallOfFire | C opts flag+!ranged; S/wallOfFireEligible final attacker movement; P crossing damage target state. C2 strength10/.3/area; W12/.6/singlefigure+opponent amplifier. MC-wall. | C opts flag+!ranged; S/wallOfFireEligible final attacker movement; P crossing damage target state. C2 strength10/.3/area; W12/.6/singlefigure+opponent amplifier. MC-wall. |
| global:warpReality | Q c:warpReality raw context flag+live !Chaos helper ->hit-20. MC-recalc. | Q c:warpReality raw context flag+live !Chaos helper ->hit-20. MC-recalc. |
| global:chaosConjunction | C opts ->S/immolationStr modern strength floor10*1.34; P Immolation spell damage, not ordinary attack-stat scale. MC-attack. | C opts ->S/immolationStr modern strength floor10*1.34; P Immolation spell damage, not ordinary attack-stat scale. MC-attack. |
| global:hurricane | C2 excluded by step version scope; W Q d:hurricane raw context flag ->secondary hit ranged/thrown-20, breath-30. MC-script; offered matrix exception retained. | C2 excluded by step version scope; W Q d:hurricane raw context flag ->secondary hit ranged/thrown-20, breath-30. MC-script; offered matrix exception retained. |
| global:poxHost | C2 S0 isWarlord gate false; W Q b:goblinPox reads context flag and initial base Goblin race, modifies atk/def/res/conventional ranged. MC-script; offered matrix exception retained. | C2 S0 isWarlord gate false; W Q b:goblinPox reads context flag and initial base Goblin race, modifies atk/def/res/conventional ranged. MC-script; offered matrix exception retained. |
| global:chaosSurge | S0 count parameter+live Chaos helper; Q c adds res, snapshot-positive melee and live ranged/breath bonuses. MC-recalc; external owner count not recomputed. | S0 count parameter+live Chaos helper; Q c adds res, snapshot-positive melee and live ranged/breath bonuses. MC-recalc; external owner count not recomputed. |
| global:nodeAura | S0 selected realm; Q c:nodeAura live Chaos helper or scalar matching, snapshot melee and positive ranged/breath. MC-recalc. | S0 selected realm; Q c:nodeAura live Chaos helper or scalar matching, snapshot melee and positive ranged/breath. MC-recalc. |
| global:rangedCheck | S0 attacker distance projection and C opts.isRanged select ranged versus melee dispatch, exclude fear/firststrike/wall/thrown/gaze melee path. MC-action/MC-range. | S0 attacker distance projection and C opts.isRanged select ranged versus melee dispatch, exclude fear/firststrike/wall/thrown/gaze melee path. MC-action/MC-range. |
| global:rangedDist | S0 distancePenaltyFor parses minimum1, only prefix a+rangedCheck+final missile/boulder; A/distancePenalty uses captured LongRange/initialhero. MC-range. | S0 distancePenaltyFor parses minimum1, only prefix a+rangedCheck+final missile/boulder; A/distancePenalty uses captured LongRange/initialhero. MC-range. |

### Consumer findings for F279.1f

Coverage is 252 ordered keys / 393 offered cells (147 C2, 246 W), equal to the admission key/version set. The global suppression probe is a bounded direct derivation over normal/Life/Death missile units: C2 True Light, Hurricane and Pox are inert; W True Light changes Life/Death, and W Hurricane/Pox change all three. It checks finite numeric outputs and does not establish DOM behavior or engine invocation order.

- **Permanent state during recalculation:** MR-DE, MR-U and WS-MP/WS-HA establish permanent writes after the initial copy, while current `buffs:destiny` stands before it and Marionette b grants mutate only `u`. A repeated executor must preserve original destinations and actual execution timing; copying the current inner chain per cast would repeat one-time cast/training writes and lose those permanent hook mutations. The known post-action recalc calls do not close MG-time for spell admission. F279.2/.3c and the admission owners receive this distinction.
- **Captured versus current inputs:** Inner Power/Fortification/True Sight correctly have current record readers, while Holy Weapon/Breakthrough/Sanctify and several map predicates still use captured values; Outlander mixes ctx.base with live Mechanical/Armorclad. The census does not assert all captured reads are defects. Each needs its original selector/pass checked before movement; permanent Mechanical is particularly explicit in WS-OR while the current soldier helper reads `u.mechanical`. Retain F200/F213/F235/F236/F242/F250/F276 leads for reconciliation rather than creating tasks here.
- **Missing current retort consumers:** Sage Master, Astrologer, Charismatic and Enchanter controls are offered, but current core code does not consume them to grant the corresponding Marionette retort effects. Existing W UnitCalcPre retort branches write owner hero abilities (Sage/Ritual Master/Charmed/Lucky) or permanent OL Spell Lock. This is known source plus missing implementation, not MC-gap. The prior MP admission grouping names the package family but does not establish current writers for these four marks; this consumer finding corrects that implication. F257 is a lead for .1f to check ownership.
- **Late normalization ordering:** Hierophany's d defense write and postrun ability strip precede E normalization, which can regrant immunities from Undead/Rebuild and strike flags from other effects. W Vampire/Revenant Undead classification still arrives only after derivation (F235). Their late grants and literal W EncBloodLust grants from Mystic Surge/hero/power effects must not be conflated with the normal Frenzy UI projection. Resolve original flag layers and hook reads before changing consumers.
- **Figure and resource snapshots:** Main stat divisors read baseFigs before the separate figure projection; building qualification uses base race/name metadata (F213). Engine actions read and mutate ammunition, movement, suppression and damage before known recalc calls; current exchange models damage/figure evolution but does not supply the full action resources or cast executor. These are concrete omitted contexts, not evidence that no original consumer exists.

No calculator code, source reconstruction, migration or provenance status changed. The reconciliation below routes remaining evidence and implementation work.

## Final reconciliation (F279.1f)

The current F250 scopes and work classification are in [TASKS.md](../TASKS.md). Use those
corrected scopes when acting on the source gaps below; the old packet plans are preflight leads.

The live `abilityUiDefs`/`abilityVersionGated` enumeration agrees with every definition's stable key, UI key, calc key, type, option list and offered versions. The input inventory yields 748 calculation key/version pairs. Exact set comparison, including keys rather than counts alone, finds the DOS admission and consumer sets both equal to the 355 offered DOS pairs (133 keys), and the modern sets both equal to the 393 offered modern pairs (252 keys: 147 C2 cells, 246 W). All applicable table cells have a current admission/carrier and writer location plus consumer/record/position, or an explicit current no-op. Engine evidence is independently sourced or gapped. No unread current-code cell is being excused as an engine gap.

The 275-row total includes nine UI-only rows. It is not 275 independent engine flags: 15 calc-key alias groups, A/B mirrors, nine modern special mirrors and six DOS flag mirrors retain the relationships above. `collectCardState`, `collectGlobals`, `cardStateToDerivationInput`, the index.html input/select list, matrix candidates and the special-control builders were checked independently of origins. No new live control was found. Roster/custom selectors and version-specific options remain inputs even when roster selection locks their widgets.

### Remaining select vocabularies

Definition select options are exact in their rows above. Card Level/Weapon/Armor/CityWalls, global nodeAura and SpecialUnit options are stated in the additional-input table; gameVersion uses the five exact ids in Keys and scope. The remaining static index.html option values are:

| Stable key | Option values |
|---|---|
| card:BaseRace | `""` (unset), `Barbarian`, `Beastmen`, `Dark Elf`, `Dwarf`, `Dwarven`, `Draconian`, `Gnoll`, `Goblin`, `Halfling`, `Hawkmen`, `High Elf`, `High Men`, `Generic`, `Klackon`, `Lizardman`, `Nomad`, `Orc`, `Rakhshasa`, `Troll`, `Xuanyuan`, `Arcane`, `Chaos`, `Death`, `Life`, `Nature`, `Sorcery`, `Special` |
| card:RtbType | `none`, `missile`, `boulder`, `magic_c`, `magic_n`, `magic_s`, `thrown`, `fire`, `lightning`, `gaze_stoning`, `gaze_multiple`, `gaze_death` |
| card:ModernRangedType | `none`, `missile`, `boulder`, `magic`, `magic_lightning` |

BaseRace is not version-filtered and `ensureBaseRaceOption` can add the selected roster's value. SpecialUnit's HTML starts with none; `SPECIAL_UNIT_DEFS` and `specialUnitScopedToVersion` supply the versioned options enumerated above. Unit selection is the version's roster plus custom state, not a fixed spell list. These values share the admission/consumer row of their selector; they are not missing effect rows.

### Ownership of established findings

Owners below cover only their stated scope. F264.1 is completed evidence, not an open implementation owner; F200 is historical work, not a blanket owner. F279.4 is a sizing/assignment task and cannot authorize unnamed implementation or close an evidence gap.

| Exact key/version or routine scope | Current finding, source check and existing owner |
|---|---|
| All attempted casts, all five versions | `deriveUnitStats` runs one chain; `a:baseCopy` snapshots u. F279.2 designs records/boundaries; F279.3a supplies representation/trace support; F279.3c supplies the outer attempted-cast executor. Carry permanent mutations made by recalculation into later attempts on persistent objects. No extra classification taxonomy is required. Missing caller evidence goes to P1/P2 below, not to an assumption that each cast runs a full recalc. |
| DOS `BU_Construct`, `BU_Apply_Specials`, battlefield recompute, including C1 permanent Blood Lust/Level/Catapult mutation writes | F277.1 owns CP160/C1 Specials invocation/argument evidence and F277.2 its schedule design; F277.3 owns later schedule/summon migration. These do not own the enclosing cast-dispatch gaps P1. |
| `enchantment:weakness,blackSleep,shatter,vertigo,warpAttack,warpDefense,warpResist,mindStorm,trueSight` in their offered versions; W `nausea,rebuild` | F250.1 qualification, F250.2 modern cast writers, F250.3 DOS writers, F250.4 Illusion refusal/script supplements. CB `A32_apply_class_16_effect` already ORs **battle Combat_Effects**, 0x822B2..0x822E9 in all DOS builds. Its Shatter writer is not missing and not permanent `_UNITS.enchantments`; comments in stats_identity.js need narrowing during F250.3. No numeric Shatter correction is authorized by this evidence-only owner: F279.4 must size its later migration. |
| `enchantment:holyWeapon` All; `enchantment:heavenlyLight` C1 | The completed [F236.1 source distinction](DOS%20reconstructed/F236.1.holy-weapon-sources.md) separates direct casts from Holy-Arms/Heavenly-Light grants, F279.3b the all-version Holy Weapon pilot, F236.2 remaining global grants. F236.1 does not close a generic cast dispatcher or imply the global type gate belongs on the cast. Pilot cast/timing holes must pass P1/P2 and their resulting approved evidence work. |
| W `enchantment:rust`; material/elemental/Flame Blade/Guardian Wind targets | F264.1 group16 reads calculated Units.Fantastic at $0053DD20; group15 instead reads BaseUnits.Fantastic at $0053DCC5, NonHero BaseUnits.ishero at $0053DF71. F276 owns one Rust targeting decision; F272.7 its admitted flag and melee consumer; F242 nine permanent flag clears. F251.1–.3/F272.3 own independent Elements inputs and precedence; F272.2a owns other beneficial presence writes. `COSpell.CAS!NOTRUST!` supplies the clears; current permanentFantasticAt/weapon-only reset is a known implementation mismatch. |
| W `enchantment:sageMaster,astrologer,charismatic,enchanter,artificer` | F257.3 owns the six UnitCalcPre retort-tail writes. Only origin descriptors mention the first four in current stats/combat sources; there are no positioned consumers for their requested marks. SETHEAB changes wizard hero ranks, whereas the Enchanter arm writes permanent overland Spell Lock. D37's missing HALucky→U.Lucky bridge has no executable task owner: P10 prepares it. F41.3's level table does not cover that routine. |
| W `enchantment:vampirism,revenant`, their Undead-derived readers | F235 owns the source/ordering decision: UnitCalc.CAS Vampirism writes EncUndead selector1 in the late hook, while earlier UnitCalcPre tests the flags separately. Final normalization is later than current stat derivation. F272.5 owns Undead reader migration once evidence is settled; permanent persistence belongs to .3c, not to an assumption that every earlier reader sees a later write. |
| W `card:Figs`, `enchantment:altarOfTheSun,academy,endurance,lionheart` and figure-scaled Explosive consumers | F243 owns the separate figure projection/input-divisor mismatch. Figure writes in CreateUnit and OverlandEndTurn are existing evidence; a second calculator figure run is not an engine schedule. |
| C1 `enchantment:raiseDead` | F249 owns creation-time placement; F231 owns No Heal producer/healing consequences. CB CMB_Raise_Dead writes/clears and constructor→battlefield calls are present. MoM Raise Dead remains outside F249: P3 includes 131/160 G-RD. |
| DOS `global:warpReality` | F234 owns current Fantastic+Chaos versus UC's scalar race compare. This is sourced implementation work, not missing binary evidence. |
| W seven race buildings and eight hero gates named by F213 | F213.1/.2 own evidence/decision on the extra race/hero terms. F273.1/.2 own Sancta Basilica/Sanctify and Pillar of Faith positioning; F209.2 owns reopening CoM2 training coverage and the old F200 narrowing. Other creation/resource producer gaps are P5/P6/P7, not automatically within F213. |
| W `enchantment:hierophany,mislead/liability,soulFlay`; `ability:teleporting/undead` and their marked aliases | F272.6 and F272.5 respectively own migration. Hierophany's strip before final normalization can be followed by regrants; compare script selector/pass before changing that order. .3c only supplies persistent execution support. |
| DOS `ability:destruction`; C1 `enchantment:supremeLight`; W identity rewrite in UnitCalc.CAS | M3 (after F41) owns Destruction. F207 owns obsolete Supreme Light publication suppression. F232 owns W late race rewrite. These are not unowned holes in current-code tracing. |
| Other captured/live readers and grant families, including Holy Weapon/Breakthrough/Sanctify, Outlander Mechanical, Destiny/Apotheosis, Marionette and Rage | The consumer cells identify actual reads. Capturing a value is not automatically a defect. F279.4 must produce exact one-prompt migration groups before F272.2b/.2c; it is only the planning owner. Known repeated permanent MR-DE/WS-MP/WS-HA writes constrain F279.2/.3c. Unmapped original selector/alias reads go to P8/P9. Unexposed hero/random-grant contexts need P7's explicit interface/dependency proposals; do not silently add controls or random casting. |

### Unowned work proposed for approval

P/U identifiers are local proposal labels, not filed tasks. Every P3.*, P4.*, P5.*, P6.*, P7D.*, P7M.*, P8.* and P9.* row is a separate **documentation** subtask: one bounded source-availability/selector/caller reading for its exact listed cells, with the finite source family below. They replace the earlier P3–P9 umbrellas. No row authorizes reading whole files indiscriminately, binary extraction or implementation. A missing extent whose size is unknown ends with an explicit size status and separately approvable first packet-preparation request; any later reconstruction needs its own Method B slice (initial ≤1200 instructions, extension ≤1800).

The P1/P2 pilot and P10 bridge preparations and the three factual corrections remain separately bounded:

| Proposal | Scope / dependency / acceptance | Blocks |
|---|---|---|
| P1 — DOS cast boundary preparation | DOS `Cast_Spell_On_Battle_Unit` enclosing class dispatch and its constructor/battlefield calls, prioritizing `enchantment:holyWeapon` 131/160/C1. Use existing combat.c/unitcalc.c and DOS indexes; exclude already mapped A32 class16 body and F277.1 local pass arguments. Needs completed census; coordinate F277.1/F236.1. Accept when each existing pilot entry/exit/recalc call has a versioned locator or an exact missing caller extent and a sized next-packet request. Generalize only where callers prove the same path; other cast classes stay individually listed. | Required engine schedule input to F279.2 and .3c/.3b. |
| P2 — modern pilot targeting/boundary preparation | `ValidUnitSpellTarget` outside F264.1's mapped tests and `InitializeCombatSpellcasting` around Holy Weapon group15/id124, C2/W independently. Index existing target/dispatch/wrapper evidence; distinguish combat and overland callers, grant-store layer and subsequent recalc. Needs census; coordinate F236.1/F250.2 without enlarging their key lists. Accept with exact remaining extent/packet requests for pilot gate/store/timing. `Spells.InitializeCombatSpellcasting.pas` has **Raise Dead-specific** recalc calls $005CD30C/$005CD36D; PerformAttacks has action-end calls $005B3599/$005B3E4F. Neither proves a universal pre-cast recalc. | Required engine input to F279.2 and .3c/.3b. |
| P10 — D37 packet scope | W `enchantment:charismatic`→HALucky→U.Lucky, compiled `Units.ApplyHeroBonus` $005992CC..$0059991F (C2 compiled comparison only where relevant). Needs census; before F257.3's Lucky numeric result. Check existing D29/TD32 extent evidence and call $0059ACB7; deliver extraction plan, size status and one bounded Method B packet proposal, splitting if needed. D37 is an evidence question, not approval to reconstruct the routine. | F257.3 Lucky consumer; no Holy Weapon pilot dependency established. |
| U1 — reconcile MoM Vertigo projections (**faithfulness**) | `enchantment:vertigo` + `enchantment:blackChannels`, 131/160, and `ability:illusionImmunity`; `deriveUnitStats` display projection, `normalizeCombatUnit`, `buildVertigoContext`. Needs F250.3/.4 admission evidence and settled .3c schedule. Accept sourced admitted/refused/order-sensitive fixtures proving one consistent admitted penalty in displayed and pair defense; do not simply remove the recheck before admission timing is known. Saved131 probe reproduces def5/displayDef4 versus normalized Illusion Immunity/pair penalty0. Check160 independently at implementation. | Later DOS curse migration and F279.5; not Holy Weapon's independent pilot. |
| U2 — align matrix global availability (**other**, UI consistency) | `global:trueLight` C1/C2 and `global:hurricane,poxHost`131/160/C1/C2: matrix candidates/raw reader offer them while card hides them and calculation suppresses them. Needs census. Accept matching shared version gating on candidates/read/render and documented saved-state handling, using existing matrix/version-gating suites. Numeric no-op evidence alone does not resolve the UI discrepancy. | Later surface audit F279.5; no engine reconstruction or pilot dependency. |
| U3 — pre-F270 DOS Blur factual repair (**documentation**) | `enchantment:blur`131/160/C1, enchantments.js tooltip and combat_effects.js getBlurChance comment versus CB side-indexed combat_enchantments. Needs census. This is an explicitly carved-out factual repair before F270's later tooltip-system overhaul. Accept wording in both locations that describes the side/army context and preserves the131 target versus160/C1 attacker immunity distinction; no calculation change. The canonical census already gives that meaning. | Documentation portion of F279.5; no pilot dependency. |

The following source-family slices retain **all** subclaims of F250's keys: F250 owns qualification, initial flag-write evidence and its named refusal/script questions, while these slices own the still-unmapped general validator, clearing and caller/timing subclaims. A F250 completion alone does not close those boundaries. Existing F180 owns the version-silence/source-reading questions for Bless, CC Fire Breath, Immolation and Supernatural; recheck its historical no-op descriptions against the current consumers rather than adopting them as facts. These preparations cover other field/store/dispatch/caller questions, not a duplicate version-silence ruling. F270 remains the later tooltip-system overhaul; U3 is the explicitly proposed earlier factual repair.

Each slice below depends on the completed census and the named additional dependencies. Its acceptance is limited to the listed subclaim. **No Method B work is presumed necessary merely because a source locator has not yet been mapped.** A preparation result must say which facts are in existing source, which original extents are actually absent, and which needed facts remain unknown. Before design/pilot: P1/P2, P8.1's MoM131 call facts, F277.1/.2 and relevant F250/F236 evidence; other slices block their dependent migrations and F279.5, unless they discover a concrete additional pilot dependency, which must be named before .2/.3c/.3b proceeds.

#### DOS casts

Finite source set: CB Cast_Spell_On_Battle_Unit/class dispatch and UC same-named Specials/battlefield branches; matching DOS spell-data/index entries only.

Subclaim: Remaining validator, clear/recast and cast-boundary claims, plus original consumer/pass mapping for these effects. F250 retains only classification/own-write/Illusion claims on its nine DOS keys; P3 does not remove their other claims. F180 retains its four version-silence questions. Spell Lock includes its unrepresented Dispel consumer.

Dependency: Census; coordinate F250.1/.3/.4; before these effects migrate. Acceptance: One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction.

| Proposed subtask | Exact key/version cells |
|---|---|
| P3.1 — Life protection | `enchantment:bless` 131,160,C1; `enchantment:holyArmor` 131,160,C1; `enchantment:invulnerability` 131,160,C1; `enchantment:lionheart` 131,160,C1; `enchantment:trueSight` 131,160,C1 |
| P3.2 — Immunity and concealment | `enchantment:guardianWind` 131,160,C1; `enchantment:invisibility` 131,160,C1; `enchantment:magicImmunity` 131,160,C1; `enchantment:resistMagic` 131,160,C1; `enchantment:righteousness` 131,160 |
| P3.3 — Battle curses | `enchantment:blackSleep` 131,160,C1; `enchantment:shatter` 131,160,C1; `enchantment:weakness` 131,160,C1 |
| P3.4 — Warp Creature and mental curses | `enchantment:mindStorm` 131,160,C1; `enchantment:vertigo` 131,160,C1; `enchantment:warpAttack` 131,160,C1; `enchantment:warpDefense` 131,160,C1; `enchantment:warpResist` 131,160,C1 |
| P3.5 — Chaos Channels mutation choice | `enchantment:ccDefense` 131,160,C1; `enchantment:ccFireBreath` 131,160,C1; `enchantment:ccFlight` 131,160,C1 |
| P3.6 — Death and resurrection | `enchantment:animated` 131,160,C1; `enchantment:blackChannels` 131,160; `enchantment:bloodLust` C1; `enchantment:raiseDead` 131,160,C1; `enchantment:undead` 131,160,C1 |
| P3.7 — Offensive grants | `enchantment:berserk` 131,160; `enchantment:eldritchWeapon` 131,160; `enchantment:fear` 131,160,C1; `enchantment:flameBlade` 131,160,C1; `enchantment:immolation` 131,160,C1 |
| P3.8 — Physical and terrain buffs | `enchantment:endurance` C1; `enchantment:giantStrength` 131,160; `enchantment:ironSkin` 131,160,C1; `enchantment:landLinking` C1; `enchantment:stoneSkin` 131,160; `enchantment:wraithForm` 131,160,C1 |
| P3.9 — Haste, Focus, Spell Lock and random grants | `enchantment:elemArmor` 131,160,C1; `enchantment:focusMagic` C1; `enchantment:haste` 131,160,C1; `enchantment:mysticSurge` C1; `enchantment:spellLock` C1 |

#### Modern casts

Finite source set: F264.1 targeting extent, Spells.InitializeCombatSpellcasting.pas dispatch/index, version-matched spells.ini; only the same-key named COSpell/OLSpell/UnitCalcPre/UnitCalc/SpellMysticSurge blocks already listed in the row.

Subclaim: Remaining full validator/dispatch, clear/recast, original selector/consumer and cast-boundary claims. F250 retains literal qualification/write/Illusion scope; its keys remain here for the other subclaims. F235 owns Vampirism/Revenant ordering; F276/F242 own sourced Rust implementation, not unknown caller extents.

Dependency: Census; coordinate F250.1/.2/.4 and relevant named migration owner. Acceptance: One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction.

| Proposed subtask | Exact key/version cells |
|---|---|
| P4.1 — Life protection | `enchantment:bless` C2,W; `enchantment:divineProtection` W; `enchantment:holyArmor` C2,W; `enchantment:invulnerability` C2,W; `enchantment:lionheart` C2,W; `enchantment:trueSight` C2,W |
| P4.2 — Immunity and concealment | `enchantment:guardianWind` C2,W; `enchantment:invisibility` C2,W; `enchantment:magicImmunity` C2,W; `enchantment:resistMagic` C2,W |
| P4.3 — Battle curses | `enchantment:blackSleep` C2,W; `enchantment:shatter` C2,W; `enchantment:weakness` C2,W |
| P4.4 — Warp Creature and mental curses | `enchantment:mindStorm` C2,W; `enchantment:vertigo` C2,W; `enchantment:warpAttack` C2,W; `enchantment:warpDefense` C2,W; `enchantment:warpResist` C2,W |
| P4.5 — Chaos Channels mutation choice | `enchantment:ccDefense` C2,W; `enchantment:ccFireBreath` C2,W; `enchantment:ccFlight` C2,W |
| P4.6 — Undead and resurrection | `enchantment:animated` C2,W; `enchantment:bloodLust` C2,W; `enchantment:raiseDead` C2,W; `enchantment:revenant` W; `enchantment:undead` C2,W; `enchantment:vampirism` W |
| P4.7 — Offensive enchantments | `enchantment:fear` C2,W; `enchantment:fieryFury` W; `enchantment:flameBlade` C2; `enchantment:flameBladeWarlord` W; `enchantment:immolation` C2,W |
| P4.8 — Mobility and channels | `enchantment:endurance` C2,W; `enchantment:haste` C2,W; `enchantment:landLinking` C2; `enchantment:natureLink` W; `enchantment:planewalking` W; `enchantment:wraithForm` C2,W |
| P4.9 — Material and elemental layers | `enchantment:elemArmor` C2,W; `enchantment:insulation` W; `enchantment:ironSkin` C2,W; `enchantment:rust` W; `enchantment:transmuteEquipment` W |
| P4.10 — Identity and permanent conversion | `enchantment:apotheosis` W; `enchantment:destiny` C2; `enchantment:rebuild` W; `enchantment:sanctify` W; `enchantment:spiritLink` W |
| P4.11 — Discipline and mental control | `enchantment:discipline` C2; `enchantment:disciplineWarlord` W; `enchantment:liability` W; `enchantment:mislead` C2; `enchantment:nausea` W; `enchantment:soulFlay` W |
| P4.12 — Late script attack/defense | `enchantment:berserkWarlord` W; `enchantment:blazeOfGlory` W; `enchantment:colossalStrength` W; `enchantment:disheartenProphecy` W; `enchantment:hierophany` W; `enchantment:shadowStrike` W; `enchantment:venom` W; `enchantment:zeal` W |
| P4.13 — Focus, lock and random grants | `enchantment:focusMagic` C2,W; `enchantment:mysticSurge` C2,W; `enchantment:spellLock` C2,W |

#### DOS origin fields

Finite source set: UC BU_Construct and matching unit_types/_UNITS field assignments; quality/level rows additionally Create_Unit/BU_Apply_Level_Bonus; only corresponding CB attack/defense/resistance branch for the listed fields.

Subclaim: G-I/G-Q/G-L original field writers and named G-engine consumer meanings, including their local caller/reset-retain subclaims outside F277.1. F180 owns Supernatural/version-silence readings; M3 owns Destruction, F41 owns hero ladders, Q28 custom Fantastic+mundane race. No arbitrary custom offset is invented as an engine field.

Dependency: Census; coordinate F277.1 for CP160/C1 Specials only. Acceptance: One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction.

| Proposed subtask | Exact key/version cells |
|---|---|
| P5.1 — Identity selectors | `card:BaseFantastic` 131,160,C1; `card:BaseHero` 131,160,C1; `card:BaseRace` 131,160,C1; `card:SpecialUnit` 131,160,C1; `card:Unit` 131,160,C1 |
| P5.2 — Primary statistics and figures | `card:Atk` 131,160,C1; `card:Def` 131,160,C1; `card:Figs` 131,160,C1; `card:HP` 131,160,C1; `card:Res` 131,160,C1 |
| P5.3 — DOS shared attack channel | `card:DosSpecial` 131,160,C1; `card:Rtb` 131,160,C1; `card:RtbType` 131,160,C1 |
| P5.5 — Hit and block fields | `card:ToBlkMod` 131,160,C1; `card:ToHitMod` 131,160,C1; `card:ToHitRtbMod` 131,160,C1 |
| P5.6 — Weapon, armor and level producers | `card:Armor` C1; `card:Level` 131,160,C1; `card:Weapon` 131,160,C1 |
| P5.7 — Gaze and touch fields | `ability:deathGaze` 131,160,C1; `ability:deathTouch` 131,160,C1; `ability:dispelEvil` 131,160; `ability:doomGaze` 131,160,C1; `ability:exorcise` C1; `ability:lifeSteal` 131,160,C1; `ability:poison` 131,160,C1; `ability:stoningGaze` 131,160,C1; `ability:stoningTouch` 131,160,C1 |
| P5.8 — Typed immunity fields | `ability:coldImmunity` 131,160,C1; `ability:deathImmunity` 131,160,C1; `ability:fireImmunity` 131,160,C1; `ability:illusionImmunity` 131,160,C1; `ability:magicImmunity` 131,160,C1; `ability:missileImmunity` 131,160,C1; `ability:poisonImmunity` 131,160,C1; `ability:stoningImmunity` 131,160,C1; `ability:weaponImmunity` 131,160,C1 |
| P5.9 — Attack/property flags | `ability:armorPiercing` 131,160,C1; `ability:doom` 131,160,C1; `ability:firstStrike` 131,160,C1; `ability:illusion` 131,160,C1; `ability:largeShield` 131,160,C1; `ability:lightningResist` 131,160,C1; `ability:negateFirstStrike` 131,160,C1; `ability:supernatural` 131,160,C1 |
| P5.10 — Granted status and thresholds | `ability:charmed` 131,160,C1; `ability:fear` 131,160,C1; `ability:immolation` 131,160,C1; `ability:invisibility` 131,160,C1; `ability:lucky` 131,160,C1; `ability:nonCorporeal` 131,160,C1; `ability:undead` 131,160,C1 |
| P5.11 — Aura, caster and range fields | `ability:caster` 131,160,C1; `ability:holyBonus` 131,160,C1; `ability:longRange` 131,160,C1; `ability:resistanceToAll` 131,160,C1 |

#### Modern origin fields

Finite source set: MR initial copy and same-field Units.RecalculateUnits.pas branch; identity/quality rows additionally version-matched CreateUnit/OverlandEndTurn creation blocks, and only the matching field consumer in Combat.ApplyAttack/ResolutionHelpers.

Subclaim: MG-origin and unresolved MC-gap field/selector/caller mapping for these exact cells. Existing code needing a locator is distinguished from missing binary extents. F41.3 retains the level table; F213 retains named race/hero gates.

Dependency: Census; quality/training decisions coordinate F209.2. Acceptance: One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction.

| Proposed subtask | Exact key/version cells |
|---|---|
| P6.1 — Identity selectors | `card:BaseFantastic` C2,W; `card:BaseHero` C2,W; `card:BaseRace` C2,W; `card:SpecialUnit` C2,W; `card:Unit` C2,W |
| P6.2 — Primary statistics and figures | `card:Atk` C2,W; `card:Def` C2,W; `card:Figs` C2,W; `card:HP` C2,W; `card:Res` C2,W |
| P6.4 — Modern independent channels | `card:ModernFireBreath` C2,W; `card:ModernLightningBreath` C2,W; `card:ModernRanged` C2,W; `card:ModernRangedType` C2,W; `card:ModernThrown` C2,W |
| P6.5 — Hit and block fields | `card:HitBreath` C2,W; `card:HitChance` C2,W; `card:HitMelee` C2,W; `card:HitRanged` C2,W; `card:HitThrown` C2,W; `card:ToBlkMod` C2,W |
| P6.6 — Weapon, armor and level producers | `card:Armor` C2,W; `card:Level` C2,W; `card:Weapon` C2,W |
| P6.7 — Gaze and touch fields | `ability:deathGaze` C2,W; `ability:deathTouch` C2,W; `ability:destruction` C2,W; `ability:doomGaze` C2,W; `ability:exorcise` C2,W; `ability:lifeSteal` C2,W; `ability:poison` C2,W; `ability:stoningGaze` C2,W; `ability:stoningTouch` C2,W |
| P6.8 — Typed immunity fields | `ability:coldImmunity` C2,W; `ability:deathImmunity` C2,W; `ability:fireImmunity` C2,W; `ability:illusionImmunity` C2,W; `ability:magicImmunity` C2,W; `ability:missileImmunity` C2,W; `ability:poisonImmunity` C2,W; `ability:stoningImmunity` C2,W; `ability:weaponImmunity` C2,W |
| P6.9 — Attack/property flags | `ability:armorPiercing` C2,W; `ability:doom` C2,W; `ability:firstStrike` C2,W; `ability:illusion` C2,W; `ability:largeShield` C2,W; `ability:lightningResist` C2,W; `ability:negateFirstStrike` C2,W; `ability:supernatural` C2,W |
| P6.10 — Granted status and thresholds | `ability:charmed` C2,W; `ability:fear` C2,W; `ability:immolation` C2,W; `ability:invisibility` C2,W; `ability:lucky` C2,W; `ability:nonCorporeal` C2,W; `ability:undead` C2,W |
| P6.11 — Aura, caster and range fields | `ability:caster` C2,W; `ability:holyBonus` C2,W; `ability:longRange` C2,W; `ability:resistanceToAll` C2,W |
| P6.12 — W movement and identity abilities | `ability:clergy` W; `ability:flying` W; `ability:mechanical` W; `ability:sailing` W; `ability:sapiens` W |
| P6.13 — W additional combat abilities | `ability:amplifier` W; `ability:bloodSucker` W; `ability:merging` C2,W; `ability:rage` W; `ability:teleporting` C2,W |

#### DOS context

Finite source set: CB Calc_Battlefield_Bonuses/BU_UnitLoadToBattle and the same-key UC battlefield/constructor predicate only; spell/global producer indexes only for the exact listed keys.

Subclaim: G-X state producer and G-pass/G-engine predicate/local caller subclaims for this context family. F277.1 owns only its CP160/C1 Specials invocation question. Survival Instinct includes its C1 predicate, not just relative rank.

Dependency: Census; source-index result before affected context migration. Acceptance: One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction.

| Proposed subtask | Exact key/version cells |
|---|---|
| P7D.1 — Received and provided army auras | `enchantment:divineBarrierAura` C1; `enchantment:guardian` C1; `enchantment:guidingBeaconAura` C1; `enchantment:holyBonus` 131,160,C1; `enchantment:resistanceToAll` 131,160,C1; `enchantment:soulLinkerAura` C1; `enchantment:tactician` C1 |
| P7D.2 — Battlefield light and prayer state | `enchantment:blackPrayer` 131,160,C1; `enchantment:eternalNight` 131,160,C1; `enchantment:heavenlyLight` C1; `enchantment:highPrayer` 131,160,C1; `enchantment:prayer` 131,160,C1; `enchantment:supremeLight` C1; `global:darkness` 131,160,C1; `global:trueLight` 131,160,C1 |
| P7D.3 — Battlefield damage and combat state | `card:Dmg` 131,160,C1; `enchantment:blazingMarch` C1; `enchantment:blur` 131,160,C1; `enchantment:metalFires` 131,160; `global:chaosSurge` 131,160,C1; `global:wallOfFire` 131,160,C1 |
| P7D.4 — Node, city ward and ranged context | `card:CityWalls` 131,160,C1; `enchantment:realmWard` C1; `global:nodeAura` 131,160,C1; `global:rangedDist` 131,160,C1; `global:warpReality` 131,160,C1 |
| P7D.5 — Wizard globals and nature events | `enchantment:charmOfLife` 131,160,C1; `enchantment:survivalInstinct` C1 |
| P7D.16 — Battlefield script enchantment state | `global:hurricane` 131,160,C1; `global:poxHost` 131,160,C1 |
| P7D.17 — Summoned-unit context | `enchantment:combatSummoned` 131,160,C1 |

#### Modern context

Finite source set: Only named same-key blocks in MR BuildAuraTable/AddtoAuraTable or W UnitCalcPre/UnitCalc/CreateUnit/OverlandEndTurn, chosen by the row existing locator; corresponding compiled context consumer from MC-aura/MC-blur/MC-wall/MC-range.

Subclaim: MG-context producers and original MC-gap/script selector/caller subclaims for this context family. Specify supplied external facts versus absent interface inputs, without creating controls or simulating out-of-scope resources. F213/F257/F273 retain their literal sourced work.

Dependency: Census; source-index result before affected context migration. Acceptance: One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction.

| Proposed subtask | Exact key/version cells |
|---|---|
| P7M.1 — Received and provided army auras | `enchantment:divineBarrierAura` C2,W; `enchantment:guardian` C2,W; `enchantment:guidingBeaconAura` C2,W; `enchantment:holyBonus` C2,W; `enchantment:leadershipAura` C2,W; `enchantment:prayermasterAura` C2,W; `enchantment:resistanceToAll` C2,W; `enchantment:soulLinkerAura` C2,W; `enchantment:tactician` C2,W |
| P7M.2 — Battlefield light and prayer state | `enchantment:blackPrayer` C2,W; `enchantment:eternalNight` C2,W; `enchantment:heavenlyLight` C2,W; `enchantment:highPrayer` C2,W; `enchantment:prayer` C2,W; `enchantment:supremeLight` C2,W; `global:darkness` C2,W; `global:trueLight` C2,W |
| P7M.3 — Battlefield damage and combat state | `card:Dmg` C2,W; `enchantment:blazingMarch` C2,W; `enchantment:blur` C2,W; `enchantment:wallOfFireBoost` W; `global:chaosConjunction` C2,W; `global:chaosSurge` C2,W; `global:wallOfFire` C2,W |
| P7M.4 — Node, city ward and ranged context | `card:CityWalls` C2,W; `enchantment:spellWard` C2,W; `global:nodeAura` C2,W; `global:rangedDist` C2,W; `global:warpReality` C2,W |
| P7M.5 — Wizard globals and nature events | `enchantment:badMoon` C2,W; `enchantment:charmOfLife` C2,W; `enchantment:darkForce` C2,W; `enchantment:goodMoon` C2,W; `enchantment:natureConjunction` C2,W; `enchantment:rulerOfUnderworld` C2,W; `enchantment:survivalInstinct` C2,W; `enchantment:survivalInstinctToBlock` W |
| P7M.6 — Marionette book/ascension context | `enchantment:marionetteAscension` W; `enchantment:marionetteBaseSkill` W; `enchantment:marionetteChaosBooks` W; `enchantment:marionetteConjurer` W; `enchantment:marionetteDeathBooks` W; `enchantment:marionetteLifeBooks` W; `enchantment:marionetteNatureBooks` W; `enchantment:marionettePrimary` W; `enchantment:marionetteSorceryBooks` W |
| P7M.7 — Wizard retort context | `enchantment:artificer` W; `enchantment:astrologer` W; `enchantment:channeler` W; `enchantment:charismatic` W; `enchantment:enchanter` W; `enchantment:godsPlayDices` W; `enchantment:sageMaster` W |
| P7M.8 — Lava Smelter resources | `enchantment:lavaSmelterElementalArmor` W; `enchantment:lavaSmelterFieryBlade` W; `enchantment:lavaSmelterMissileImmunity` W; `enchantment:lavaSmelterResistElements` W; `enchantment:lavaSmelterWeaponImmunity` W |
| P7M.9 — Race-building creation context | `enchantment:altarOfTheMoon` W; `enchantment:altarOfTheSun` W; `enchantment:dragonMound` W; `enchantment:ludusAgoge` W; `enchantment:motherFungus` W; `enchantment:poolOfRepentance` W; `enchantment:sanctaBasilica` W |
| P7M.10 — Academy, workshop and faith buildings | `enchantment:alumniOfAcademy` W; `enchantment:hillfort` W; `enchantment:militaryWorkshop` W; `enchantment:pillarOfFaithLucky` W; `enchantment:pillarOfFaithRes` W; `enchantment:powerMinerals` W |
| P7M.11 — Natural resources and terrain | `enchantment:coal` W; `enchantment:favoredTerrain` W; `enchantment:iron` W; `enchantment:malnourished` W; `enchantment:nightshade` W; `enchantment:uphillBattle` W; `enchantment:wildGame` W |
| P7M.12 — Outlander armor and machinery research | `enchantment:armorcladReform` W; `enchantment:heatPowerEngine` W; `enchantment:magitekEngineering` W; `enchantment:magitekScience` W; `enchantment:outlanderWizard` W; `enchantment:pneumaReactor` W |
| P7M.13 — Outlander weapon and troop research | `enchantment:ballisticsTraining` W; `enchantment:energyBeamWeapons` W; `enchantment:explosive` W; `enchantment:lightningBlade` W; `enchantment:mechanicalExpert` W; `enchantment:militaryDrilling` W; `enchantment:rocketry` W |
| P7M.14 — Outlander support research | `enchantment:fortification` W; `enchantment:psychoConverter` W; `enchantment:radio` W; `enchantment:temporalEngineering` W; `enchantment:xenopsychology` W; `enchantment:xenoveterinary` W |
| P7M.15 — Power and arcane-context grants | `enchantment:blazingEyes` C2; `enchantment:breakthrough` C2,W; `enchantment:chaosEmbrace` W; `enchantment:innerPower` C2,W; `enchantment:reinforceMagic` C2,W |
| P7M.16 — Battlefield script enchantment state | `enchantment:angelicGuardians` W; `enchantment:beatOfSwiftness` W; `enchantment:eyeOfHeaven` W; `enchantment:greatUnbinding` W; `enchantment:luckyStar` W; `enchantment:plague` W; `enchantment:rally` W; `enchantment:temporalTwist` W; `global:hurricane` C2,W; `global:poxHost` C2,W |
| P7M.17 — Summoned-unit context | `enchantment:combatSummoned` C2,W |

#### Additional DOS callers

| Proposed subtask and exact cells | Finite source / subclaim / dependency / acceptance |
|---|---|
| P8.1 — MoM131 Specials caller arguments: `ability:lucky` 131; `ability:undead` 131; `enchantment:animated` 131; `enchantment:berserk` 131; `enchantment:blackChannels` 131; `enchantment:ccDefense` 131; `enchantment:ccFireBreath` 131; `enchantment:ccFlight` 131; `enchantment:flameBlade` 131; `enchantment:giantStrength` 131; `enchantment:holyArmor` 131; `enchantment:holyWeapon` 131; `enchantment:ironSkin` 131; `enchantment:lionheart` 131; `enchantment:stoneSkin` 131; `enchantment:trueSight` 131; `enchantment:undead` 131 | UC BU_Construct→BU_Apply_Specials and BU_Apply_Battlefield_Effects→BU_Apply_Specials, MoM131 only. Only these two calls and their argument/reset-retain boundary, with the named local Specials rows as witnesses; no full 50-step migration or other caller inventory. Other branches stay in each P3/P5/P7 family. Needs Census; before F279.2 uses MoM131 schedule. One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction. |
| P8.2 — Summon-route identity equivalence: `enchantment:combatSummoned` 131,160,C1 | CB BU_UnitLoadToBattle and UC Load_Battle_Unit/BU_Construct at their existing call sites. Only summon-route identity predicates and caller equivalence unclosed by G-engine. F277.1/.3 retain C1/CP160 Specials schedule and C1 migration. Needs Census; coordinate F277.1/.3. One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction. |
| P8.3 — DOS range acquisition: `ability:longRange` 131,160,C1; `global:rangedDist` 131,160,C1 | CB Check_Attack_Ranged and DOS binary-analysis ranged-distance entry; no tactical pathfinding reconstruction. Exact Long Range field read, distance acquisition and caller transport into hit penalty; distinguish supplied distance from original coordinates. Needs Census; before affected ranged consumer migration. One source-availability ledger for these cells and this subclaim: exact existing branch/field/caller locators, or named missing extent with size status and a separately approvable first packet request. No reconstruction. |

#### Specific script discrepancies/grants

| Proposed subtask and exact cells | Finite source / subclaim / dependency / acceptance |
|---|---|
| P9.1 — Rage recalculation versus resolution: `ability:rage` W | W UnitCalcPre.CAS NORAGE block and current combat_abilities.js Rage consumers. Permanent SRage/current damage/calculated HP selector and write timing versus per-phase live casualty updates. Needs Census and settled relevant action/recalc boundaries. Source-checked discrepancy and one bounded implementation proposal with expected discriminating case, or explicit remaining timing extent; no code fix. |
| P9.2 — Outlander Mechanical selector: `ability:mechanical` W; `enchantment:armorcladReform` W; `enchantment:fortification` W; `enchantment:outlanderWizard` W | W UnitCalcPre/UnitCalc Outlander soldier/armor blocks and current outlanderCombatSoldierAt/outlanderBattleArmorAt. Permanent Mechanical versus current Mechanical/Armorclad selector correspondence only. Needs Census. Exact original/current selector comparison and bounded migration proposal; do not infer every captured read is wrong. |
| P9.3 — Literal BloodLust grants: `enchantment:bloodLust` C2,W; `enchantment:mysticSurge` C2,W | Version-matched SpellMysticSurge and W UnitCalcPre hero/power BloodLust grant blocks; MR/ApplyAttack same-flag reader. Literal EncBloodLust layer/consumer mapping independently of W Frenzy UI alias. Needs Census. Exact script flag layers→consumer selectors and missing interface decision; no random-cast implementation. |
| P9.4 — Unexposed persistent grant contexts: `card:Unit` W; `enchantment:guardianWind` W; `enchantment:marionetteAscension` W; `enchantment:rebuild` W; `enchantment:spiritLink` W | W UnitCalcPre NOTMARIONETTE..NOTDEATHLORD hero rank-grant blocks and own-turn overland NOTGLIDER block; CreateUnit Glider branch. WS-HA/WS-GL original hero-rank/type-context interface and persistent destinations; F257.3 retort tail remains separate. Needs Census. One exact grant-family interface/field inventory and separately bounded follow-up proposals; no new controls and no claim Glider regrants in combat. |

#### Gap subclaim reconciliation

| Subclaim | Exact routing rule / existing owner limit |
|---|---|
| DOS cast validator, store, clear/recast, cast→recalc | Holy Weapon→P1/F236.1; C1 Raise Dead creation→F249 (No Heal/healing→F231), but its other caller subclaims remain P3.6. Every other G-C/G-CC/G-RD/G-S key/version is explicitly listed in P3.*. On F250's nine DOS keys, qualification/own-write/Illusion→F250.1/.3/.4, **remaining validator/clear/timing stays P3**. |
| DOS local pass membership | CP160/C1 BU_Apply_Specials→F277.1/.2; MoM131's two Specials calls→P8.1. Other cast-effect branches→the same P3 row; constructor/quality fields→P5; aura/battlefield/context branches→P7D. These slices map their own actual caller, not an inferred universal Specials schedule. |
| DOS specific consumer/source holes | Summon-route equivalence→P8.2 (C1 migration remains F277.3); Survival Instinct C1 predicate→P7D.5 (relative CP160/C1 Specials schedule remains F277.1); Spell Lock C1 Dispel read→P3.9; ranged-distance/LongRange acquisition→P8.3. Typed Cold Immunity/NonCorporeal original meaning→matching P5 field slice. Supernatural version-silence→F180; other flag representation/caller→P5. |
| Modern cast validator/store/clear/timing and original readers | Holy Weapon→P2/F236.1; all other MG-target/MG-cast cells are listed in P4.*. F250 retains its literal own-write/qualification/refusal scope only; every other subclaim on those same cells remains P4. Rust source-specific gate/clears implementation→F276/F272.7/F242, W Undead timing decision→F235, with unknown callers still listed. |
| Original input fields and non-cast consumers | DOS G-I/G-Q/G-L→exact P5 field slice; modern MG-origin/associated MC-gap→P6. Existing M3/F41/Q28/F180 retain the narrow questions named above. This is original source mapping, not deferred current-code inventory. |
| External state and associated original consumers | Every G-X cell→exact P7D slice; every explicit MG-context cell→P7M slice. Same-key context-cast boundaries and MC-gap/MC-script selector/caller questions stay in that slice; W local script bodies are source-present mapping work. Extra unexposed WS-HA/WS-GL grants→P9.4; literal random BloodLust→P9.3. F257.3 retort writes, F213 gates and F273 positioned grants retain their existing scopes; missing input/producer facts are not silently exempted. |
| Specific script disagreements/hero bridge | Rage→P9.1; Outlander Mechanical→P9.2; literal EncBloodLust→P9.3; D37 ApplyHeroBonus bridge→P10. These specific comparisons take precedence over the corresponding general original-field/context source mapping in P4/P6/P7M, avoiding duplicate readings. Hierophany/Mislead/SoulFlay migration→F272.6; W Vampirism/Revenant decision→F235. |

The preparation slices are not permission to implement all remaining effects. F279.4 still sizes later migration groups; it cannot close missing evidence or authorize unnamed reconstruction. F279.2 must not settle a faithful pilot schedule while required P1/P2/P8.1 results or resulting engine evidence are unresolved. F279.3a remains representation-only, then .3c implements evidenced attempts/persistent mutations, then .3b migrates Holy Weapon. No no-op, unexposed context, queued task or broad source locator exempts a row. F279.1f completes current-code census and exact gap reconciliation; F279 remains open.
