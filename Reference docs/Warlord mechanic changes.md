# Warlord Mod — Combat Mechanic Changes Relevant to the Damage Calculator

Based on the Warlord manual (v1.5.12.5). This covers differences from CoM2 (Caster of Magic for Windows) that affect how combat damage or stats are calculated.

## New Enchantments Added in Warlord

These spells do not exist in CoM2 and would each require fresh implementation.

### Global Enchantments with Combat Effects

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
40. **Military Workshop** (XuanYuan building) — new; ranged/thrown gain Armor Piercing (+2 strength if Doom), Fire Breath +4, +1 Poison, small→heavy projectile upgrade
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
