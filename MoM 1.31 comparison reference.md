# MoM 1.31 comparison reference

Reference for cross-checking this calculator against another online MoM calculator
(MoM 1.31 and 1.60 only). Two lists:

1. **1.31 bugs** the engine reproduces (set `gameVersion = mom_1.31`). These are where
   1.31 and 1.60 should *diverge* — the best test points.
2. **Example predefined units** that natively carry each 1.31 ability, so you can pick
   them in the other calculator to verify behavior.

---

## Part 1 — MoM 1.31 bugs modeled by the calculator

All of these are fixed (or behave differently) in 1.60.

### Immunity / status bugs
1. **Undead grants only Death Immunity.** The Undead / Animate Dead / Black-Channels status
   grants *only* Death Immunity in 1.31; it should also grant **Cold, Poison, and Illusion
   Immunity** (it does in 1.60). (`combat.js:1249`)
2. **Illusion Immunity checked on the wrong unit for Blur.** Checked on the *defender*
   instead of the attacker, so a unit's own Illusion Immunity disables its own Blur and the
   opponent's Illusion Immunity is ignored. (`combat.js:1219`, `combat.js:2699`)

### Weapon Immunity bugs
3. **Thrown attacks ignore Weapon Immunity** — thrown bypasses WI entirely (def stays at
   base, not 10). (`combat.js:842`)
4. **Generic units bypass Weapon Immunity** regardless of attack type (Catapult, Warship,
   Trireme, Galley). (`combat.js:845-853`)
5. **WI overwrites Missile Immunity** when both apply — defense becomes 10 instead of 50
   vs missiles. (`combat.js:1546-1550`)

### Cause Fear bugs
6. **Defending Cause Fear never fires** — only the *attacker's* Fear works. (`combat.js:2771`)
7. **Attacker self-fear bug** — each of the *defender's* failed resistance rolls also fears
   one *attacker* figure, and this self-fear **bypasses immunity**. (`combat.js:996`,
   `combat.js:2780`)

### Blur bug
8. **Skip-on-success / 50% cap.** Each successful Blur negation skips the next roll, so Blur
   tops out at 50% blocked regardless of luck. (`engine.js:22-33`) — plus bug #2 above.

### Chaos Channels bug
9. **CC: +Defense applied twice** — net **+6 defense** instead of +3. (`combat.js:374-378`)

### Immolation bug
10. **Immolation also fires alongside ranged attacks** (not just melee phases); strength 4.

### Curse / enchantment "thrown not covered" bugs
11. **Weakness doesn't reduce thrown** — only melee/missile get −2. (`stats.js:818`)
12. **Holy Weapon doesn't affect thrown** — +10% To Hit applies to melee/missile/boulder
    but not thrown. (`stats.js:835`)

### "Enemy melee −10% To Hit" effects (1.31-only)
13. **Lucky** also gives the opponent **−10% To Hit on melee** (and counter-attacks).
    (`combat.js:2062`)
14. **Prayer** gives **enemy melee −10% To Hit**. (`combat.js:2063`)
15. **High Prayer** gives **enemy melee −10% To Hit**.

### Touch / gaze suppression (intended 1.31 behavior, differs from 1.60)
16. **Touch attacks don't fire if effective attack value is 0**, and **gaze is suppressed
    when effective hidden strength hits 0**. 1.60 uses *base* strength, so they still fire.
    (`combat.js:793-808`)

### Non-bug 1.31 magnitudes that still differ from CoM (sanity checks)
- Large Shield **+2** (CoM +3)
- Weapon Immunity flat defense **= 10**
- Vertigo **−20% To Hit / −1 def**
- Holy Bonus does **not** boost ranged attack
- Haste does **not** double a Caster unit's magical ranged

---

## Part 2 — Example predefined units per 1.31 ability

Units that natively carry each ability in the MoM 1.31 roster. Where magnitude varies, one
unit is listed per value.

| Ability | Example unit(s) |
|---|---|
| Armor Piercing | **Paladin** (also High Men Pikemen, Chaos Warrior) |
| Caster (20 MP) | **Efreet**, Djinn |
| Caster (40 MP) | **Arch Angel** |
| Cause Fear | **Chaos Spawn**, Demon Lord |
| Cold Immunity | **Skeletons** (also Werewolves, Wraiths) |
| Death Gaze −2 / −4 | **Night Stalker** (−2) / **Chaos Spawn** (−4) |
| Death Immunity | **Skeletons** (also Ghouls, Golem, Werewolves) |
| Dispel Evil | **Angel** |
| Doom Gaze (4) | **Chaos Spawn** |
| Doom Damage (Doombolt) | **Warlocks**, Chaos Spawn |
| Fire Immunity | **Fire Elemental** (also Fire Giant, Efreet) |
| First Strike | **Paladin** (also Black Knight, Cavalry units) |
| Hidden Gaze Attack | **Night Stalker**, Basilisk, Gorgons |
| Holy Bonus 1 / 2 | **Paladins** (1) / **Arch Angel** (2) |
| Illusion (illusionary attack) | **Phantom Warriors**, Phantom Beast, Illusionist |
| Immolation | **Doom Bat** |
| Invisibility | **Ninja** (also Nightblades, Night Stalker, Air Elemental) |
| Large Shield | **Minotaurs** (any Swordsmen unit) |
| Life Steal −3 / −4 / −5 / +1 | **Wraiths** (−3) / **Death Knights** (−4) / **Demon Lord** (−5) / **Necromancer** (+1) |
| Long Range | **Catapult**, Warship |
| Lucky | **Slingers** (also Halfling Spearmen/Swordsmen/Bowmen) |
| Magic Immunity | **Sky Drake** (also Paladin, Black Knight, Chosen) |
| Missile Immunity | **Magician** (also Warlock, Witch, Illusionist) |
| Negate First Strike | **High Men Pikemen** (also Halberdiers, Nomad Pikemen) |
| Non-Corporeal | **Wraiths** (also Shadow Demons, Magic Spirit) |
| Poison Immunity | **Gargoyles** (also Skeletons, Ghouls) |
| Poison Touch 1 / 4 / 5 / 6 / 15 | **Nightblades** (1) / **Giant Spiders** (4) / **Assassin** (5) / **Manticores** (6) / **Great Wyrm** (15) |
| Resistance to All 1 / 2 | **Guardian Spirit** (1) / **Unicorns** (2) |
| Stoning Gaze −1 / −2 / −4 | **Basilisk** (−1) / **Gorgons** (−2) / **Chaos Spawn** (−4) |
| Stoning Immunity | **Stone Giant** (also Colossus, Earth Elemental, Gargoyles) |
| Stoning Touch −3 | **Cockatrices** |
| Weapon Immunity | **Werewolves** (also Demon, Wraiths, Death Knights) |

### Notes / caveats
- **Fire Immunity** and **Cold Immunity** are *intrinsic* in real MoM 1.31 (confirmed via the
  MoM Fandom source: Fire Elemental/Fire Giant/Efreet have Fire Immunity; Skeletons/Werewolves/
  Wraiths/Zombies have Cold Immunity) but are **not tagged** in this calculator's generated
  `units.js`. They're valid picks in the other (real-game) calculator.
- **High Men Pikemen** carry **Negate First Strike + Armor Piercing** per both the CoM2 manual
  and base MoM. ⚠️ This calculator's `units.js` currently mislabels them as `First Strike +
  Armor Piercing` — a local data discrepancy to investigate separately.
- Abilities with **no native 1.31 carrier** (apply as a buff/curse, not via a predefined unit):
  Lightning Resist.
