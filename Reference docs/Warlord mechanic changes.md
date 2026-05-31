# Warlord Mod — Combat Mechanic Changes Relevant to the Damage Calculator

Based on the Warlord manual (v1.5.12.5). This covers differences from CoM2 (Caster of Magic for Windows) that affect how combat damage or stats are calculated.

---

## New Buildings with Combat Effects

None of these buildings exist in CoM2. Effects listed are permanent (units trained at the city keep the stats) unless noted as "in combat" (applies only when that city is being defended in battle).

### Race-Exclusive Special Buildings

#### Altar of the Sun (Hawkmen)
Cost 600/10, requires Witches' Convent + hill/mountain/volcano. Units trained here (except Holy Mother) gain **+1 Figure**. In combat (defending): city is protected by **High Prayer**.

#### Dragon Mound (Draconian)
Cost 1200/10, requires Stable + hill/mountain/volcano. Units trained here gain **+2 Fire Breath** and **+1 Armor**.

#### Lava Smelter (Dwarf)
Cost 1200/20, requires Alchemist's Guild + hill/mountain/volcano. Enhances weapon upgrade tier (Mithril → Adamantium → Orihalcon). Mineral combinations present near the city grant units permanent abilities:
- Mithril + Adamantium → **Weapon Immunity**
- Mithril + Crysx → **Missile Immunity**
- Mithril + Orihalcon → **Resist Element**
- Adamantium + Orihalcon → **Elemental Armor**
- Adamantium + Crysx → **Flame Blade**

In combat (defending under siege): city gains **Wall of Fire** from the outset of battle.

#### Ludus Agoge (Orc)
Cost 1200/20, requires War College + desert. Units trained here gain **+1 Attack, +1 Resistance, +1 HP** (Legionary units instead gain +1 Movement).

#### Military Workshop (XuanYuan)
Cost 1200/20, requires Mechanician's Guild + river. Units trained here gain **+2 Physical Ranged, +2 Fire Breath, +2 Thrown** (on applicable attack types) and **+1 Poison**. Units with Small Physical Ranged projectiles are upgraded to Heavy Physical Ranged (gunpowder).

#### Mother Fungus (Goblin)
Cost 1200/10, requires Witches' Convent + swamp. Units trained here gain **+2 Attack, +10% To-Defend, Poison 1**, and ×2 Spellcharge.

#### Pool of Repentance (Rakhshasa)
Cost 1200/10, requires Monastery + forest. Units trained here gain **+1 Armor** and **+1 Resistance**.

#### Sancta Basilica (High Men)
Cost 2400/20, requires Cathedral + desert. Units trained here gain **+3 Resistance**. Clergy, Crusaders, and Paladins also gain **Sanctify**; Crusaders additionally gain **Lucky**; Paladins gain **Magic Immunity**; Clergy gain improved **Exorcise**. In combat (defending): city is blessed by **True Light**.

---

## New Enchantments Added in Warlord

These spells do not exist in CoM2 and would each require fresh implementation.

### Unit Enchantments (persistent)

**Divine Protection** (Life **uncommon**, 22/110, 1 upkeep)
Grants Lucky (+10% To-Hit, +10% To-Defend, +1 resistance) and Death Immunity. Castable outside combat. (Note: despite being uncommon, cost is high enough to be within range of elite Magisters or sanctified clerics with base Resistance > 10.)

**Colossal Strength** (Nature rare, 24/120, 3 upkeep)
Increases melee and physical ranged attack strength by 40%.

**Venom** (Nature uncommon, 12/60, 1 upkeep)
Grants the unit +1 poison and poison immunity.

**Insulation** (Chaos uncommon, 16/80, 2 upkeep)
Grants fire immunity, cold immunity, and lightning resistance.

**Shadow Strike** (Death uncommon, 18/90, 2 upkeep)
If the unit has no thrown attack: adds thrown at 1/3 of melee strength. If the unit already has thrown: adds 1/3 of melee strength as additional thrown damage. Thrown attacks can hit flyers. Because thrown is a separate pre-melee attack, per-hit effects (poison, life steal, bloodsucker) **trigger twice per attack sequence** — once from thrown, once from melee.

**Spirit Link** (Arcane/Conjurer retort exclusive, overland, -/150, 0 upkeep)
Converts the unit to non-fantastic status while still granting it bonuses as if it were fantastic, plus **+2 Resistance**. Units that normally cannot gain experience levels may now do so. The unit can be targeted by normal unit enchantments but is immune to spells that only affect fantastic creatures.

**Transmute Equipment** (Nature rare, overland, -/90, 0 upkeep)
Pseudo unit enchantment that permanently grants a normal unit **adamantium and orihalcon** weapon upgrades, or grants a hero a permanent stat buff of equivalent value. Useful for retroactively upgrading veteran units trained before adamantium was available.

### Combat Unit Enchantments (last for the battle only)

**Lucky Star** (Arcane/Astrologer retort exclusive, 15 mana)
Grants Lucky (+10% To-Hit, +10% To-Defend, +1 resistance) to a single target unit for the battle.

**Rally** (Arcane/Charismatic retort exclusive, 15 mana)
All friendly units gain **+2 Resistance** until end of combat.

**Blaze of Glory** (Chaos common, 20 mana)
Transfers the unit's armor to its melee attack and ranged attack to its melee attack. Grants Armor Piercing. The unit loses First Strike if present. (Cannot be cast on heroes.)

**Revenant** (Death uncommon, 25 mana)
Grants the unit melee Death Touch 0 and Regeneration 1. The unit permanently becomes undead for the rest of the battle. Death Touch triggers once per attacking figure; does not apply to ranged attacks.

### Combat Enchantments (global, affect all units in battle)

**Eye of Heaven** (Life rare, 60 mana)
Grants True Sight to all friendly units. True Sight gives +5% to ranged attacks in CoM2.

**Hurricane** (Nature rare, 30 mana)
−20% To-Hit for all ranged attacks, −30% To-Hit for all breath attacks (affects both sides including the caster). Eliminates flying from all units except Thunderbird and Air Elemental.

**Beat of Swiftness** (Chaos rare, 55 mana)
Friendly units with melee > range gain +3 movement; others gain +2 movement. All friendly units lose **10% of their armor** as a penalty.

**Temporal Twist** (Sorcery rare, 40 mana)
All enemy units lose 1 movement point, teleport, First Strike, and Negate First Strike. Fantastic units lose an extra movement point. Movement cannot go below 0.5.

**Breakthrough** (Chaos common, 9 mana)
Combat enchantment that enhances the melee attack against combat summons and Non-Corporeal units. Also grants all units Wall Crashing.

**Rust** (Chaos common, 7 mana)
Combat unit curse, resistance penalty **−5**. If the target fails:
- Magic weapons and orihalcon upgrades are **permanently stripped** (unit reverts to regular weapons)
- **−3 physical attack**
- All **thrown attacks** eliminated for the rest of combat
- **Large shield** eliminated for the rest of combat

A separate resistance roll at −3 also determines whether permanent enchantments (except Chaos Channels) are destroyed. The only spell in the game that can strip magic weapons entirely. Replaces Shatter at the common tier (Shatter moved to rare).

**Conjuring Pact** (Arcane/Conjurer retort exclusive, uncommon, 40 mana)
Targets a single unit. Against a **fantastic creature**: attempts to tame it; if tamed and it survives combat, the Conjurer can research its summon spell. Against a **non-fantastic unit**: inflicts **nausea — −10% To-Hit and −10% To-Defend** for the rest of the battle.

### Combat Curses

**Dishearten Prophesy** (Arcane/Astrologer retort exclusive, city curse, -/100, 1 upkeep)
City suffers +4 unrest. In combat: all garrison units defending that city suffer **−2 Resistance**.

**Soul Flay** (Death rare, 45 mana)
Irresistible curse targeting normal units or heroes. Reduces stats by **1 melee, 2 armor, and 2 resistance per experience level** of the target (so −2/−8/−8 at Recruit, scaling up to −10/−40/−40 at Champion for a 5-level hero). Devastating against high-experience heroes and ultra-elite/champion units.

**Hierophany** (Life rare, 23 mana)
Resistance roll at −5. If it fails: target unit loses half its armor, all immunities, lightning resistance, Negate First Strike, and all mobility-related abilities.

### Global Enchantments with Combat Effects

**Pillar of Faith** (Life rare city enchantment, -/180, 5 upkeep)
City buff with two recruitment effects:
- **20% chance** each recruited unit gains **Lucky** (+10% To-Hit, +10% To-Defend, +1 resistance)
- **+1 to +8 Resistance** to recruited units depending on the number of religious buildings in the city

Also generates **0.5 overland casting skill per unrest reduction** from religious buildings in the enchanted city. Synergizes with Sanctify — sanctified clerics can reach high enough casting skill to cast Prayer.

**Plague Debuff** (applied by Pestilence city curse and Goblin Poxbearer units)
Not a castable spell directly, but a combat global debuff inflicted in two ways:
- **Pestilence** (Death very rare city enchantment): In Warlord, the Pestilence curse now also applies the plague debuff to all **defending garrison units in combat** at that city. CoM2 Pestilence had no combat effect.
- **Poxbearer units** (Goblin): Spread plague to enemies at the start of combat (with a minor self-side debuff that ends when the Poxbearer dies).

Plague debuff values: **−3 Attack, −3 Defense, −2 Resistance** for all affected units for the rest of combat.

**Ruler of Underworld** (Death very rare global, 1300/50)
- **CoM2**: All friendly units gain Wraith Form in battle. Magic/Mithril/Adamantium weapons cannot bypass weapon immunity.
- **Warlord**: Core combat effect unchanged. Research cost decreased (10000 → 8000). Now additionally grants +4 religious power per oracle in all cities (overland only; not combat-relevant). Combat relevance increased indirectly: the weapon immunity boost (+8 → +10) makes it stronger in Warlord overall.

**State of Rot** (Death rare global, 600 mana / 30 upkeep)
All enemy non-undead units in combat lose regeneration and cannot heal in combat. Friendly undead units outside combat heal 3 hp/turn.

**Great Unbinding** (Sorcery very rare global, -/1000, 50 upkeep)
Replaces Great Unsummoning (removed in Warlord). At the start of each combat, all opponent fantastic creatures must resist **Confusion at −4** — this Confusion cannot be prevented by Illusion Immunity. Even if they resist, all opponent fantastic creatures in combat suffer **−20% To-Hit, −20% To-Defend, and −2 Resistance** for the rest of battle. As of v1.5.12.5, also applies to lair monsters.

**Natural Selection** (Nature common global, -/150, 3 upkeep)
Renamed/replaced from CoM2's "Survival of the Fittest" (which is now a separate very rare spell — see below). Newly trained units in any friendly city gain bonuses based on resources in the city's surroundings:
- Coal → **+1 melee**
- Iron → **+1 armor**
- Wild game → **+1 ranged attack** + **Forester**
- Nightshade → **+1 resistance**
- Power minerals → **+1 resistance per 10 base power income from minerals**

**Survival Instinct** (Nature very rare global, -/600, 15 upkeep)
Formerly "Survival of the Fittest" in CoM2. Added effect in Warlord: newly created normal units gain a small **+3% to +7% To-Defend** based on gold-producing resources (iron, orihalcon, etc.) in the city's surroundings. Note: Evil Presence now also suppresses this recruitment bonus.

**Angelic Guardians** (Life rare global, 500 mana / 35 upkeep)
In combat: all friendly normal units gain exorcise at −0; life and sanctified units gain exorcise at −1; units with existing exorcise get −2/−3 extra strength. Undead defenders suffer a −3 additional resistance penalty.

---

## Summary: Items Requiring Calculator Updates for Warlord Version

2. **Bless** — +4 res / +7 armor (not +5/+5)
3. **True Light** — new spell; needs full implementation
4. **Wall of Fire** — single-figure mechanic + defender attack bonus
5. **Eternal Night** — add −2 range penalty to non-death units
6. **Prayer/High Prayer stacking** — partial stat stack
7. **Chaos Channels** — fire breath stacks additively with base fire breath
8. **Fiery Fury** — extended ranged/thrown bonus
9. **Blazing March** — add thrown boost
12. **Weakness** — now irresistible; also reduces breath
13. **Bloodlust** — no immunities; castable in combat
15. **Divine Protection** — new; Lucky + Death Immunity
16. **Colossal Strength** — new; +40% melee/physical ranged
17. **Venom** — new; +1 poison + poison immunity
18. **Insulation** — new; fire/cold immunity + lightning resistance
19. **Shadow Strike** — new; adds thrown at 1/3 melee
20. **Vampirism** — new; converts thrown/breath to melee, undead
21. **Lucky Star** — new; combat Lucky buff on single unit
22. **Blaze of Glory** — new; armor+ranged → melee, armor piercing, loses first strike
23. **Revenant** — new; death touch 0 + regeneration, unit becomes undead
24. **Eye of Heaven** — new; True Sight for all friendly units
25. **Hurricane** — new; −20% ranged / −30% breath to-hit, removes flying
26. **Beat of Swiftness** — new; −10% armor penalty on all friendly units
28. **Soul Flay** — new; irresistible; −1 melee / −2 armor / −2 resistance per experience level
29. **Hierophany** — new; strips half armor and all immunities on resistance fail
30. **State of Rot** — new; enemy non-undead cannot heal or regenerate in combat
31. **Angelic Guardians** — new; gives friendly units exorcise in combat
32. **Fortification** (building) — new; all defending units inside city walls gain large shield effect
33. **Hillfort** (building) — new; all defending units inside city gain Missile Immunity
34. **Altar of Storm** (Barbarian building) — new; trained units gain Lightning Blade; defending city gets Lightning Storm
36. **Altar of the Sun** (Hawkmen building) — new; trained units gain +1 Figure; defending city gets High Prayer
37. **Dragon Mound** (Draconian building) — new; trained units gain +2 Fire Breath, +1 Armor
38. **Lava Smelter** (Dwarf building) — new; mineral combos grant Weapon/Missile Immunity, Resist Element, Elemental Armor, Flame Blade; siege gets Wall of Fire
39. **Ludus Agoge** (Orc building) — new; trained units gain +1 Attack, +1 Resistance, +1 HP
40. **Military Workshop** (XuanYuan building) — new; trained units gain +2 Ranged/Breath/Thrown, +1 Poison; projectile upgrade
41. **Mother Fungus** (Goblin building) — new; trained units gain +2 Attack, +10% To-Defend, Poison 1
42. **Pool of Repentance** (Rakhshasa building) — new; trained units gain +1 Armor, +1 Resistance
43. **Sancta Basilica** (High Men building) — new; trained units gain +3 Resistance + unit-specific abilities; defending city gets True Light
44. **Spirit Link** (Conjurer exclusive) — new; unit becomes non-fantastic but retains fantastic bonuses; +2 Resistance, can gain XP
45. **Transmute Equipment** (Nature rare) — new; gives normal unit adamantium + orihalcon permanently, or hero equivalent
46. **Rally** (Charismatic exclusive) — new; all friendly units +2 Resistance for battle
47. **Conjuring Pact** (Conjurer exclusive) — new; tames fantastic creatures or inflicts nausea (−10% To-Hit/To-Defend) on non-fantastic
48. **Dishearten Prophesy** (Astrologer exclusive) — new; city curse; garrison suffers −2 Resistance in combat
49. **Natural Selection** (Nature common global) — new; trained units gain stat bonuses from city's surrounding resources
50. **Survival Instinct** (Nature very rare global) — changed; now also grants trained units +3–7% To-Defend from gold resources
51. **Blur + Invisibility/Mass Invisibility stacking** — combined miss chance increased from 30% to 40%
52. **Stone Touch / Death Touch on ranged attacks** — changed; both now melee-only (in CoM2 they could trigger on magical ranged attacks)
53. **Berserk** — removed as castable spell; now Troll Medicineman ability: +15% To-Hit, +1 move, −10% To-Defend on target unit
54. **Inner Power** — changed; now also grants Mountaineer to all friendly units in combat (cost raised to 600/20)
55. **Shatter** — changed; moved to rare, 20 mana, −5 resistance penalty, now targets any unit (not just normal)
56. **Rust** — new Chaos common combat curse; strips magic weapons, −3 physical attack, eliminates thrown and large shield
57. **Discipline** — removed as castable spell; now Centurion hero ability only (same stats); Enlightenment grants it at recruitment
58. **Zeal** — new (not in CoM2); Inquisitor/Grand Inquisitor ability only; grants First Strike + Negate First Strike for battle
59. **Divine Protection** — tier corrected to Uncommon (was listed as Rare); castable outside combat
60. **Pillar of Faith** — new Life rare city enchantment; 20% chance Lucky on recruited units; +1–8 Resistance from religious buildings
62. **Per-hit touch effects fire on all attack phases** — not a Warlord change; inherited CoM2 behavior. A unit with both thrown and melee gets two separate touch triggers per attack sequence. See `Touch attack trigger matrix.md`.
63. **Bloodsucker** — new per-hit touch effect in Warlord (Rakhshasa, Vampire Lord, Vampirism). +2 damage / +2 heal per attack phase that deals damage, capped at 1 trigger per phase regardless of attacker figure count.
63. **Bloodlust** — only doubled melee vs normals/heroes retained; no longer turns unit undead and grants no immunities; now castable in combat
64. **Vampirism** — unit cannot gain experience; thrown/breath → melee transfer prevents double Bloodsucker trigger
65. **Drought** — changed; newly recruited units suffer −1 Melee / −2 Armor (malnourished) at recruitment
66. **Plague debuff** — new; −3 Attack / −3 Defense / −2 Resistance; applied by Pestilence city curse garrison in combat and by Poxbearer units
67. **Ruler of Underworld** — unchanged core (Wraith Form for all units); research cost reduced; Warlord's +10 weapon immunity makes it stronger
53. **Great Unbinding** (Sorcery very rare global) — new; opponent fantastic creatures get Confusion at −4 at battle start + −20% To-Hit/To-Defend, −2 Resistance all battle
