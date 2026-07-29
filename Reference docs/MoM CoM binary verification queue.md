# MoM / CoM binary verification queue

Combat peculiarities the calculator asserts that are worth confirming against the code that
implements them. Every entry rests on prose (Fandom wiki, manual, helptext) or on inference.
Two engines, in separate sections:

- **A–C** — the DOS builds `WIZARDS.EXE`: **MoM 1.31**, **MoM CP 1.60**, **CoM 1**. The
  executable is the only source; nothing else ships.
- **D** — the modern engine: **CoM2** and **Warlord**, whose implementation is split across
  `Caster.exe`, the `.CAS` scripts and the data tables. Each entry names which one owns it.

Companion files:
- `Calculator/BACKLOG.md` — the **work register**: the single list of all outstanding calculator
  work, this file's entries included. Every ID below appears there as a one-line row with status
  and cost. This file holds the reasoning; the register holds the tracking.
- `MoM binary analysis.md`, `CoM2 binary analysis.md` — method, anchors, and findings *already
  resolved* for each engine. Resolved items are not repeated here.
- `CoM2 data tables.md` — findings read out of CoM2's and Warlord's `.INI` tables
  (`MODDING.INI`, `Levelbonus.INI`, `SPELLS.INI`, `DESC.INI`). Same role for the tables that the
  two analysis docs play for the binaries; section D entries settled from a table resolve there.
- `TODO.md` — open mechanic questions in general. Overlaps with this file where a question is
  binary-answerable; those rows are cross-referenced rather than restated.

Version ids below are the calculator's: `mom_1.31`, `mom_cp_1.60.00`, `com_6.08`,
`com2_1.05.11`, `com2_warlord_1.5.12.6.2`.

Binary paths, hashes, and how far each build drifts from 1.31's addresses live in
`MoM binary analysis.md`, *The binaries*. The consequence that shapes sections A–C: **CP 1.60 is a
same-size, in-place patch of 1.31, and only 192 of `BU_ProcessAttack`'s 3,006 bytes differ.**
That makes it the cheapest of the three to work on — 1.31 offsets re-read unchanged, and any
"1.31 does X, 1.60 fixed it" entry below can be falsified by diff alone.

---

## A. Version-branch claims — the calculator behaves differently per version

These are the highest-value checks: a wrong branch produces a wrong answer for one version
while looking correct in another.

### A31. Level bonus tables, especially MoM's to-hit ladder
`combat.js:34-71`. The **CoM column is settled** — it is a 5×7 table at `0x8FACA` and it matches
(`MoM binary analysis.md`, *Level bonuses*). MoM's is an unrolled `if` chain at `0x8F881`–`0x8FB3E`
whose *shape* was read on the same pass (to-hit increments at the Elite/Ultra-Elite/Champion
thresholds, resistance at most of them), but its six increment sites were not decoded
exhaustively, so the magnitudes — +10/+20/+30% to hit, up to +5 resistance, the hp steps —
remain unconfirmed. **Still the cheapest item left in section A.**

*(A30, Warp Creature, is resolved: magnitudes confirmed and, more consequentially, CoM 1 applies
the whole block early in the recompute while MoM applies it last. See `MoM binary analysis.md`,
*Warp Creature runs early*. `TODO.md` still carries the related question of whether Warp Reality
can drive to-hit below 10% — see B1.)*

### A32. Shatter — CP 1.60's change, and CoM 1's eligibility gate

Two loose ends left by the Warp-ordering read (`MoM binary analysis.md`, *Warp Creature runs
early*), which decoded Shatter's **position** in the recompute but not its content.

- **CP 1.60 changed the code immediately after both of 1.31's Shatter writes** —
  `0x90AE6`–`0x90AF9` after `melee = 1` (`0x90AE5`) and `0x90B08`–`0x90B1B` after `ranged = 1`
  (`0x90B07`). Two of only five changed regions in the whole recompute, so it is a deliberate
  edit, not drift. Nothing is known about what it does.
- **CoM 1's Shatter block (`0x907DC`–`0x90827`) was read for position only.** The calculator
  restricts Shatter to normal units and heroes outside Warlord (`stats.js`, `shatterEligible`);
  no unit-type test was decoded at that address either way. Note the binary *caps* at 1
  (`cmp …, 1 / jle`) where the calculator *sets* to 1 when above 0 — equivalent for every
  reachable value, but worth keeping in mind if the gate turns out to differ.

### A33. The per-realm global debuff at `0x90A87` (CoM 1)

Applies −2 to-hit, −3 defence, −3 resistance to creatures of one realm, gated on a global array
indexed `realm − 0x10` (so realms `0x10`–`0x14`) and skipping realm `0x15`. Found while reading
the post-Warp write list; **not identified, and not modelled by the calculator.** Naming it needs
the global-enchantment byte at `[0x9274] + 0x1587 + (realm − 0x10)` traced to a spell.

---

## B. Shared-formula claims — the calculator applies these in every version, but never verified

### B1. The 10%–100% to-hit clamp
`combat.js:9-13` (`clampPct`), plus `Math.max(0.1, …)` at every to-hit modifier site.
`MoM binary analysis.md` established the 10% floor for 1.31 from `CMB_AttackRoll`'s
`|| die_roll == 10`. Not established: the **100% ceiling**, nor either bound for CP 1.60 and
CoM 1. `TODO.md` carries the matching open question (Warp Reality's page claims to-hit can reach
0%). The floor mechanism — "natural 10 always hits" — is not the same thing as a clamp, and the
distinction matters if any effect can push to-hit above 100%.

### B3. The Life Steal damage curve
`engine.js:260-286`: one d10 per attacking figure; `roll > effective_res` deals `roll − effective_res`
damage, so a negative effective resistance yields more than 10 damage from a single roll. Immunity
at `effective_res ≥ 10`. The *curve* is settled — `Combat_Resistance_Check` returns exactly
`roll − effective_res` on a failed save (`MoM binary analysis.md`, *Resistance rolls*). What
remains is whether Life Steal reads that return value rather than re-rolling, and the disputed
stat in `TODO.md`: "manuals say wraiths have life steal −4 but it seems to be −3".

### B4. Damage rollover with a fresh defence roll per figure
`engine.js:80-155`: excess damage past a figure's HP chains to the next figure and the defender
rolls defence again. Contrast `areaPerFigureDmgDist` (189-209), where area damage does **not**
roll over. Both are foundational to every number the calculator prints and neither is sourced to
the binary. `BU_ApplyDamage` is the named entry point in ReMoM.

### B5. Armor Piercing halves defence (floor) and never touches Immolation
`combat.js:1643-1650`. The floor direction and the Immolation exemption are separate assumptions;
the comment cites "MoM and the ADC reference", i.e. another calculator, not the game.

### B6. Invulnerability subtracts its bonus on *every* chained defence roll
`engine.js:91` — `net = max(e − b − inv, 0)` inside the rollover chain, so a multi-figure kill
applies the reduction repeatedly. Plausible, but it is a modelling choice made in the engine, not
a documented rule.

### B7. Which attack phases each touch effect rides
`combat.js` routes touch/gaze/immolation riders per phase throughout `resolveCombat`.
`MoM binary analysis.md` already established for 1.31 that this is **data-driven** — the effect
dispatcher tests one local seeded from the unit's own attribute fields with no phase gate — and
that CoM 1 behaves identically. The calculator does not model it that way; it hard-codes per-effect
phase eligibility. Worth a pass to check the hard-coding agrees with the data-driven behaviour on
the actual roster, and it bears directly on `TODO.md`'s open Chaos-Spawn poison-touch question.

### B9. Dispel Evil penalties −4, and −9 against created undead
`combat.js:731-742`. `MoM binary analysis.md` confirmed the save is −4 with a further −5 for
`UM_UNDEAD` in 1.31 — which is where −9 comes from — but the calculator gates that extra penalty
on *created* undead (Undead/Animate Dead/Revenant status) while the binary tests a **unit-type
mutation flag**. Those are not obviously the same set. Check whether base Death creatures carry
`UM_UNDEAD`; if they do, the calculator's `isCreatedUndeadTarget` restriction (722-725) is wrong.

---

## C. Two code defects found while compiling this list — fixed

Not binary questions; recorded because the first changed behaviour.

1. **`combat.js` `applyAnimatedEffects` compared against a version id that does not exist.**
   `version !== 'mom_1.31' && version !== 'mom_1.60'` — the id is `mom_cp_1.60.00`
   (`data.js:294`), so `'mom_1.60'` never matched and Animate Dead granted Weapon Immunity under
   MoM CP 1.60, which the code and the ability's own tooltip (`data.js:133`) both exclude.
   Rewritten to the positive `startsWith('com_') || startsWith('com2_')` form used by the six
   other `isCoMPlus` sites in the file, so a future MoM id cannot reintroduce it. Weapon Immunity
   from Animate Dead is now CoM 1 / CoM2 / Warlord only.

   Still open, and unaffected by this: whether CP 1.60 *should* grant it. `TODO.md` carries a
   related question on the same ability ("does animate dead give +ranged attack?").

2. **`tools/node_unit_checks.js` passed `version: 'mom_1.60'` in five places.** They exercised the
   intended branches anyway (every predicate they hit is `startsWith('mom')` or `!== 'mom_1.31'`),
   but named a version the app cannot select. Now `mom_cp_1.60.00`.

No stray version-id literal remains in any `.js`. After both fixes: `node_unit_checks` 164/164,
in-browser `runTests()` 870/870, Playwright specs 32/32.

---

## D. CoM2 and Warlord

Enumerated from what the calculator **asserts** for `com2_1.05.11` and `com2_warlord_1.5.12.6.2`,
not from what is easy to find in the executable. Every claim is implemented somewhere; the only
question per entry is which source owns it, and they are checked in this order:

| Source | Owns | Note |
|---|---|---|
| Warlord `.CAS` scripts | per-unit stat calculation (`UnitCalcPre.CAS`, `UnitCalc.CAS`), display-only ability labels (`DisAbil.CAS`) | Warlord only, and outranks the binary |
| Data tables | tunable combat constants (`MODDING.INI`), level ladder (`Levelbonus.INI`), per-spell strength / hit chance / area flag (`SPELLS.INI`), unit stats (`UNITS.INI`) | ship with both versions; findings in `CoM2 data tables.md` |
| `Caster.exe` | everything else: all combat resolution, **and the whole of base CoM2's stat calculation** | `CoM2 binary analysis.md` |

The third row is wide because **vanilla ships `UnitCalc.CAS` as a `HALT;`** — so a Warlord claim
may be settled by one line of script while the identical CoM2 claim needs the binary. Many
`combat.js` comments already cite a `UnitCalc.CAS` line for the Warlord half; the entries below
name only what is still open.

### D1–D12. Inherited from CoM 1 by prefix-match

These are the highest-risk entries in the file. Each is a `version.startsWith('com')` test, so a
result established for CoM 1's DOS binary silently governs CoM2 and Warlord, which are a
different engine. `startsWith('com2')` sites are the *deliberate* CoM2 divergences and appear in
the next section; anything here has no CoM2-specific branch at all.

**Half of this group is now settled**, mostly from the data tables: D4, D5, D6, D7 and D12's
Flame Blade row have had their magnitudes confirmed, D9 is closed outright, and D1 and D2 are
down to one open claim each. What remains is disproportionately *shape* rather than *value* —
realm gates, eligibility rules, ability-vs-enchantment questions — which is what tables cannot
express and the binary must answer.

#### D1. Defence-replacing immunities are 100, not 50 — **mostly resolved**
`combat.js:1051-1084` — `missileImmunityDef`, `fireImmunityDef`, `righteousnessDef`,
`magicImmunityDef` all return **100** for `com*`. Sourced solely from CoM 1's one-byte
`0x32`→`0x64` (`MoM binary analysis.md`, *Defence specials*). The shape matters as much as the
value: these *replace* the computed defence rather than adding to it.

**`EffectiveDefense` step 8 settles both halves for CoM2/Warlord** — six immunity tests, *each an
assignment* to 100, discarding everything accumulated before them (`CoM2 binary analysis.md`,
*Resolution-time modifiers*). So the value and the replace-not-add shape are confirmed for Fire
(spell and `isfire`), Cold, Poison, Magic and Missile Immunity.

**Righteousness is not among the six**, so that one leg is still open — the calculator gives it
the same 100-replacement treatment on no CoM2 evidence. Worth settling on the same read as D3,
which also concerns Righteousness.

#### D2. Weapon Immunity eligibility, and the generic bypass — **magnitude resolved**
`combat.js:997-1050`. The **magnitude is settled**: `MODDING.INI`'s `WeaponImmunityDefenseBonus`
is 8 in CoM2 and 10 in Warlord, and the key is framed as a *bonus*, which also confirms the
additive shape (`CoM2 data tables.md`). Two claims remain: eligibility is by attacker weapon and
unit type; and `atkGeneric` reproduces MoM's generic-hull bypass in every version. In MoM that
bypass was a *race-number cutoff* — a 1991 artefact. Whether the modern engine has anything
equivalent is unestablished. Related: `wraithFormBypassesWI` (`stats.js:1151-1153`) and Animate
Dead granting Weapon Immunity (`combat.js:1437-1444`), both gated `com*`.

#### D3. Cause Fear's −3 save modifier
`combat.js:1131-1140`. Also asserts Death Immunity is a skip and that Magic Immunity /
Righteousness are +30 resistance bonuses rather than skips — the MoM shape, carried over whole.

#### D4. Poison being realm-less — **the −1 save penalty is resolved**
`combat.js:670-677`. `MODDING.INI`'s `PoisonSavePenalty=-1` in both versions settles the penalty
outright (`CoM2 data tables.md`). What remains is the same function's assertion that Poison is
realm-less, so Magic Immunity does not stop it — a MoM structural fact with no CoM2 evidence and
no key in the tables.

#### D5. Blur's *shape* — **all three rates resolved**
`getBlurChance` (`combat.js`). `MODDING.INI [Spells]` owns the rates and confirms every one:
`BlurDamageReduction=20`, `InvisibilitydamageReduction=20`, `BlurInvisibilityTotalReduction=30`
(40 in Warlord) — see `CoM2 data tables.md`. What is left is exactly the shape: the calculator
models Blur as a defender **ability** where MoM proved it a side-wide **enchantment**, and flips
whose Illusion Immunity is tested. Neither is expressible as a table key, so this needs
`Caster.exe`.

#### D6. Bless — the attack types the defence half covers. **Magnitudes resolved**
Defence half `combat.js:1637-1665`, resistance half `combat.js:2367-2378`. `MODDING.INI` confirms
all four values and the odd split: CoM2 `BlessDefenseBonus=5` / `BlessResistBonus=5`, Warlord
`7` / `4` (`CoM2 data tables.md`).

**Scope is the whole of what remains.** A21 settled CoM 1: its defence half covers breath and
Chaos/Death gazes only, because the DOS engine derives the attack's realm from `ranged_type`
alone — missile, boulder and thrown are realm-less — and CoM 1 adds a `ranged_type > 39` test on
top. The calculator keeps the wide scope (thrown and physical ranged inheriting a Chaos/Death
attacker's realm) for `com2*` only, on no evidence at all; it was never more than the CoM 1
branch spilling over. Establish how `Caster.exe` classifies an attack's realm before trusting it.

#### D7. Elemental Armor / Resist Elements — **magnitudes resolved, realm gate open**
`elemResistBonus` (`combat.js:1618-1623`) gives `com*` **+4 for Resist Elements and nothing for
Elemental Armor**, inverting MoM's +10/+3.

**Both halves are now confirmed.** CoM 1: the +10 really is dead code there, and Resist Elements
really is +4 (`MoM binary analysis.md`, *Resistance rolls*). CoM2/Warlord: `MODDING.INI` sets
`ResistElementsResistBonus=4` and defines **no** `ElementalArmorResistBonus` key at all, while
naming a resistance bonus for Resist Magic, Resist Elements and Bless — so the asymmetry is
deliberate. The defence side matches too (`ResistElementsDefenseBonus=4`,
`ElementalArmorDefenseBonus=12`). See `CoM2 data tables.md`.

**What is still open is the realm gate**, which CoM 1 narrowed to Nature only and which no table
expresses. The calculator adds this bonus to
`aResStoning` / `bResStoning` alone, so it already behaves Nature-only everywhere — which is
right for CoM 1 but leaves the MoM Destruction gap recorded under *Known modelling limitations*
in `Calculator/SPEC.md`.

#### D8. Weakness and Mind Storm magnitudes
`combat.js:459-465` (−3 melee) and `combat.js:474-483` (−3 melee, −5 rtb/def/res). The DOS side of
both is settled (`MoM binary analysis.md`, *Combat-effect stat writes*); this is the tail it left
behind. The CoM 1 values were extended to CoM2 on shared helptext wording alone.
Warlord's breath half is already script-cited (`UnitCalc.CAS:309-315`); the CoM2 half is not.
`scan_caster_binary.py syms` finds no `Weak`/`MindStorm`/`UnitCalc`-shaped symbol, so the write
sits in an enchantment-ID-keyed recompute that has to be located first — not a free read.

*(D9, Vertigo, is **fully resolved**. `buildVertigoContext` applies −25% to hit / −7% to block for
`com2*`; the compiled block confirms both magnitudes and the display path that contradicted it
was corrected on 2026-07-29. Warlord inherits them unchanged — `EncVertigo` appears exactly twice
in its stat scripts and both are a combat-layer-to-unit-layer flag copy, with no magnitude
written. See `CoM2 binary analysis.md`, *Calculator-facing discrepancy found during the region-`c`
pass*. IDs are not reused.)*

#### D10. Haste does not double counter-attacks
`combat.js:2896-2900`. One boolean, large effect, no CoM2-specific evidence.

#### D11. Invisibility's −10% to-hit malus is MoM-only
`combat.js:2284-2300`. The ranged-targeting block is claimed for all versions; only the malus is
gated off for `com*`.

#### D12. Assorted `com*` stat constants
Each a single constant with no CoM2-specific branch. Cheap once the owning routine is open.

| Claim | Site |
|---|---|
| ~~Flame Blade +3 (vs +2)~~ | **Resolved** — `MODDING.INI` gives `FlameBladeAttackBonus=3` in both versions, plus `MissileRangedBonus=2` and `ThrownBonus` 0 (CoM2) / 2 (Warlord), matching `stats.js` exactly, CoM2's dropped thrown bonus included (`CoM2 data tables.md`) |
| Chaos Channels fire breath strength 4 (vs 2) | `stats.js:445` — **CoM 1 half confirmed** at 4 vs MoM's 2 (`MoM binary analysis.md`, *`BU_Apply_Specials` runs twice*); CoM2/Warlord still open |
| Chaos Surge grants +resistance | `stats.js:679` |
| Land Linking boosts breath | `stats.js:1097` |
| Focus Magic exists at all | `stats.js:522` |
| Warp Creature also halves ranged | `stats.js` Warp block — **CoM 1 half confirmed**, and it halves the shared `.ranged` slot with no type test at all (`MoM binary analysis.md`, *Warp Creature runs early*); CoM2/Warlord open, and the ordering question is D21 |
| Immolation strength 10 | `combat.js:1087-1091` |

### D14–D21, D27. CoM2- and Warlord-specific claims

Deliberate divergences with their own constants — so the question is not "does CoM 1's rule carry
over" but "is this number right".

*(D13, Level bonus tables, is resolved — `Levelbonus.INI` `[Normal]` matches `getLevelBonuses` on
all 70 values for both versions. See `CoM2 data tables.md`, *Level bonuses*. The hero ladder it
exposed is D27 below. D15, Wall of Fire, is resolved from `SPELLS.INI [87]` — strength 12,
`HitChance=60`, and the `Area` flag dropped in Warlord alone. D16, Supernatural minimum damage,
is resolved and the calculator disagrees with it; it is now the **F7** defect in
`Calculator/BACKLOG.md`. IDs are not reused.)*

#### D14. Ranged distance penalty — **CoM2's formula resolved, hero exemption open**
`distancePenalty` (`combat.js:207-220`) gives CoM2 a formula shared with no other version: no
penalty below 4 tiles, then −10% and a further −3% per tile beyond. `MODDING.INI` states it
directly — `RangedPenaltyStarts=4`, `RangedPenaltyBase=10`, `RangedPenaltyGap=1`,
`RangedPenaltyGrowth=3`, identical in both versions — so the calculator reproduces the table
verbatim (`CoM2 data tables.md`). The DOS half is settled separately (`MoM binary analysis.md`,
*Ranged distance penalty*).

**Open:** whether `Caster.exe` kept CoM 1's hero exemption, which the calculator applies to
`com_6.08` only. `MODDING.INI`'s `HeroNoRangePenalty` describes the hardcoded effect as
**Sharpshooting** — an *ability*-gated exemption — which suggests the CoM 1 blanket-hero rule did
not simply carry over. Long Range's −10% cap is likewise unstated by any table.

#### D17. Destruction is CoM2-only, and its immunity set
`destructionFailProb` (`combat.js:773-781`) returns 0 outside `com2_`, skips on Magic Immunity, and
reads the roster's per-unit value as a resistance modifier. The surrounding comment notes the
roster ships `Destruction=0`, so the modifier path is untested by any actual unit.

#### D18. Which phases touch effects ride
`combat.js:3612-3620` — Warlord removes Stoning Touch and Death Touch from ranged, cited to the
manual; `immolationBlocksRanged` (`combat.js:1094-1096`) blocks Immolation from ranged in every
non-1.31 version. MoM proved this is **data-driven** there (`B7`), and the calculator hard-codes it
per effect. `@Combat@ApplyAttack` takes the attack type as an explicit argument, so any real phase
gate is a plain comparison — easier to settle here than it was in MoM. Bears on
`Touch attack trigger matrix.md`.

#### D19. CoM2-only abilities with no cross-version anchor
Inner Power, Blazing Eyes, Mislead, Destiny (`combat.js:92-109`), Discipline and Endurance
(`stats.js:748-767`), and the Eternal Night / Darkness doubling (`stats.js:687-689`). Each exists
only in this engine, so nothing in sections A–B constrains them; each needs its own read of the
helptext, the script, or the binary.

#### D20. Chaos Surge scope in CoM2 and Warlord
`stats.js:1058-1069`, `1228-1241`. CoM 1 is settled (`MoM binary analysis.md`, *Chaos Surge*): it
writes the shared `.ranged` slot unconditionally, so thrown and both gaze forms are boosted, and
the CC fire breath is boosted too. The calculator now follows that for `com_6.08` while keeping
the narrower helptext-derived scope — ranged and breath only, no thrown, no gaze — for `com2*`.
Nothing has been read from `Caster.exe` to justify the split; the magnitudes (+count+2 melee,
+count+1 ranged and resistance) do match CoM 1 exactly, which makes the scope difference the more
suspicious half.

#### D21. Where Warp Creature sits in the sequence, and what the level ladder does to a gaze

Three CoM 1 results that the calculator now applies to `com_6.08` **only**, because nothing has
been read from `Caster.exe` about the modern engine. All three are settled for the DOS build in
`MoM binary analysis.md` (*Warp Creature runs early*, *Level bonuses*); each has a CoM2/Warlord
half that is pure inheritance-by-prefix and was deliberately not extended.

1. ~~**Ordering.**~~ **Resolved 2026-07-28** — see `CoM2 binary analysis.md`, *Associating a block
   with its enchantment*. CoM2/Warlord run the three Warps late in region `c` (+0x0BA3C /
   +0x0BCDF / +0x0BDF7) with Shatter immediately after (+0x0BF62): **MoM's shape, not CoM 1's**,
   which is what the calculator already assumed for `com2*`. No change needed there.
   Two consequences did fall out, both open and both recorded under *Code inconsistencies* below:
   Supreme Light runs in the post-`d` region `e`, and the phase-`a` attribution of level and
   weapon bonuses looks wrong for this engine.
2. ~~**Warp Attack reaches a gaze.**~~ **Resolved 2026-07-28** — see `CoM2 binary analysis.md`,
   *The Warp blocks*. CoM2/Warlord's Warp Attack writes `attack`, `ranged`, `thrown`,
   `firebreath` and `lightningbreath` and **no gaze field**; a complete census of the block's
   field constants confirms the absence. With *Gaze attacks* already establishing that gazes are
   independent fields sharing no slot with `ranged`, the calculator's
   `gazeWarpHalves = isCoM1 && ...` (`stats.js:1263`) is correct as written. No change needed.
   D20's Chaos Surge scope is still open and no longer coupled to this.
3. **Level ladder for a gaze.** CoM 1 gives `ranged_type >= 100` only the Veteran step, i.e. the
   `thrown` column. CoM2 and Warlord read `Levelbonus.INI`, which the D13 read confirms has no
   place to express a special-attack distinction — its `[Normal]` columns are `Attack`,
   `MissileRanged`, `MagicRanged`, `Thrown`, `Breath`, `Defense`, `Resistance`, `hp`, `mp`,
   `Hit`, `Todefend`, and no more. So the gate, if it survives, is in the executable.
   The calculator still gives a CoM2 gaze the full `ranged` column and a CoM2 Doom Gaze nothing.

#### D27. The hero level ladder is not modelled
`getLevelBonuses` (`combat.js`) takes no unit type, so heroes are given the 6-step `[Normal]`
ladder. `Levelbonus.INI` `[Hero]` is a **9-step table of a different shape**: `MagicRanged`
advances at half the `MissileRanged` rate (where `[Normal]` keeps them equal), `Thrown` and
`Breath` at half `Attack`, and Warlord adds to-hit steps at levels 3–4 (+5) and 7–8 (+15) that
CoM2 lacks. The two `[Hero]` sections are otherwise identical between versions.

No binary work is needed for the values — the table has them (`CoM2 data tables.md`). What needs
deciding first is scope: the UI offers one six-entry level list for every unit, so modelling this
means either a hero-only ladder behind the existing control or a wider change to how level is
selected. `MODDING.INI` gives `MaxUnitLevel=4`, `MaxHeroLevel=9`, `AbsoluteMaxLevel=9`, so levels
7–9 are hero-only and levels 5–6 need Warlord/Crusade.

### D22–D26. Open consequences of the 2026-07-28 `Caster.exe` stat-pipeline read — **not fixed**
All from `CoM2 binary analysis.md`, *Unit stat recalculation*. None is a numeric claim; each
changes where a modifier sits in the sequence, so all want settling alongside the R1 restructure
in `Calculator/BACKLOG.md` rather than as one-off patches.

#### D22. Warp is applied too late for CoM2/Warlord

Magnitudes are confirmed correct (`CoM2 binary analysis.md`, *The Warp blocks*), but
`stats.js:1488-1497` applies all three Warps to the *finished* totals, while the engine runs them
mid-`c` at +0xBA3C. Everything the engine writes afterwards — the rest of `c` (Web, Frozen, Black
Sleep), the whole of `d` (Warlord's `UnitCalc.CAS`, including Colossal Strength), the aura pass and
Supreme Light — is added at full value on top of the reduced stat. In the calculator all of it is
halved instead. `warpLate` is empty for `com2*`, so there is currently no way to express this.

#### D23. The whole aura pass runs after `d`

Holy Bonus, Resistance to All, Prayermaster, Guiding Beacon, Divine Barrier, Soul Linker, Supply
Commander, Logistics, Leadership and Misfortune are applied by region `e`'s second per-unit loop.
`combat.js:273-278` books `holyBonus` to phase `a` and `combat.js:295` books `resistanceToAll` to
`a` — the earliest phase for effects that in fact run last. Both are step-4 judgments that SPEC.md
already marks provisional. Two further mechanics fall out: sources merge by **maximum, not sum**
(`@Units@AddtoAuraTable`), and Resistance to All shares aura type 3 with Prayermaster so those two
compete rather than stack.

#### D24. Supreme Light is post-Warp *and* post-aura-pass in CoM2/Warlord

Its block is in region `e` after the aura loop, so after the Warps at +0x0BA3C. `stats.js:714`
(`preWarpTerm = isCoM1 ? 0 : v`) books it to phase `c`, i.e. *before* Warp, for every version
except CoM 1. The CoM 1 outcome is right for the wrong engine reason and the CoM2 outcome looks
wrong outright. Its defense component is `+= floor(resistance / 3)` reading resistance *after*
the aura pass — the live-resistance cross-stat read recorded as Q7 in `Calculator/BACKLOG.md`, now
positioned. Independently corroborated by the CoM2 manual changelog (`CoM2 manual.txt:5545`).

#### D25. Level, hero and weapon bonuses may be phase `c`, not `a`

`@Units@ApplyLevelBonus` (+0xD16), `@Units@ApplyHeroBonus` (+0x139A) and `@Units@ApplyMagicWeapons`
(+0x4B90) all sit after the `UnitCalcPre` hook, and region `a` writes only 9 unit fields against
`c`'s 492. `stats.js:956`, `:973` and `:1018` put `lvl.*` and `wpn.*` in `a`. If they belong in
`c`, Upgraded Explosive's fire-breath doubling (which reads `base+a+b` of `rtb`) is currently
doubling bonuses it should not see. **Needs an execution-order check first** — everything so far
is layout.

#### D26. The Chosen is Fantastic in the engine, a plain hero in the calculator

Region `c` forces `race := RCLife` and `Fantastic` on the unit type named by `MODDING.INI`'s
`ChosenUnitID` (`CoM2 binary analysis.md`, *Unit enchantment effects*). `UNITS.INI` carries the
race but has no Fantastic key, and `ui.js:2448` types anything in the Heroes category as `hero`,
so every Fantastic-gated modifier downstream — Nature Conjunction, Survival Instinct, Land Link's
extra package, the Soul Linker aura, and exclusion from Good Moon, Bad Moon, Leadership and
Misfortune — resolves the wrong way for the Chosen. Fixing it means a hard-coded unit-type rule
in the generator or the type resolver, the same shape as the Golem/Resist Elements rule. Tracked
as F4 in `Calculator/BACKLOG.md`, since it is a wrong output today and not only an ordering
question.

### Code inconsistencies found while compiling this list — **both fixed 2026-07-29**
- **`isCoM2` was defined twice in `deriveUnitStats`.** `isCoM2Version` and its one call site were
  folded into the earlier `isCoM2`.
- **D9's Vertigo split.** `combat.js` and `stats.js` disagreed for `com2*`. The binary settled it —
  the compiled block is −25 To Hit / −7 To Block (`CoM2 binary analysis.md`) — so `stats.js` was
  the side that changed. Its display path had applied CoM 1's −30 / −10 to every `com*` version;
  it now derives both magnitudes from the same version ladder `buildVertigoContext` uses, so CoM2
  and Warlord display −25 / −7 while CoM 1 and MoM are unchanged. Verified in the browser across
  all five versions; all three suites green (167 / 911 / 32).

### Not carried over from MoM
The CP 1.60 diff methodology (no same-size sibling binary exists here), the 1.31 Cause Fear
argument-order bugs, and the ReMoM discrepancies — ReMoM does not cover this engine.

---

## What to read next

Prioritisation across all of these lives in `Calculator/BACKLOG.md`, §1 — it ranks them
alongside the calculator's other outstanding work, which this file cannot see.

One cost note that belongs here rather than there: the battle-unit stat recompute
(`0x8FF09`–`0x90B8D`) owns the `Combat_Effects` writes and has now been read end to end for
CoM 1 (*Warp Creature runs early*), so anything else keyed to `Combat_Effects` is cheap to
settle from the write list already tabulated there.
