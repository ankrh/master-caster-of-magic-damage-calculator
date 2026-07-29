# Calculator work register

The single list of outstanding calculator work. Every item has an ID, a status and a pointer to
where its **evidence** lives — this file tracks *what is left to do*, never the analysis behind it.
Behaviour is in [SPEC.md](./SPEC.md); working conventions in [CLAUDE.md](./CLAUDE.md).

Nothing here is a source of truth about the engine. When an item names a finding, the finding's
home file wins.

## Evidence homes

| Short name | File | Owns |
|---|---|---|
| **queue** | `Reference docs/MoM CoM binary verification queue.md` | claims resting on prose or inference, per engine (A–C = DOS builds, D = CoM2/Warlord) |
| **MoM analysis** | `Reference docs/MoM binary analysis.md` | findings read out of `WIZARDS.EXE` |
| **CoM2 analysis** | `Reference docs/CoM2 binary analysis.md` | findings read out of `Caster.exe` |
| **CoM2 tables** | `Reference docs/CoM2 data tables.md` | findings read out of CoM2's and Warlord's `.INI` tables |
| **TODO** | `Reference docs/TODO.md` | open mechanic questions, prose-vs-prose conflicts |
| **discrepancies** | `Reference docs/Source discrepancies.md` | Warlord script-vs-prose conflicts |
| **SPEC** | [SPEC.md](./SPEC.md), *Known modelling limitations* | limitations the calculator deliberately carries |

## Vocabulary

**Status** — `open` · `in progress` · `blocked` (waiting on a person, not on work) ·
`accepted` (a limitation we have decided to live with).
**Cost** — `free` (grep a script or a data table) · `small` · `medium` · `large`.

---

## 1. Priority order

This section is the single home for prioritisation across all outstanding work — the queue no
longer carries its own suggested orders. Items 1 and 2 need no binary read at all: the evidence
they consume is already written down.

| # | Item | Why here |
|---|---|---|
| **1** | **R1.1–R1.10 — build the transform sequence** | **Nothing is in front of it.** R1's stage 0 is complete (see §2) and so is the `@Units@RecalculateUnits` sweep it was meant to precede, so the ordering evidence is already in hand and cannot be recorded until the sequence exists. Five confirmed defects (D22–D26) plus Q7 and M4 are blocked on it outright. |
| 2 | **S1, S2** | Warlord mechanics never checked against the script that owns them. Cheap, and independent of R1. |
| 3 | **A31** | The cheapest item left in section A; MoM's six increment sites are all that remain. |
| 4 | **F7, Q14** | Both deferred by decision on 2026-07-29, and both cheap to resume: F7 is a known-wrong formula with the right one already in hand; Q14 needs only a semantics read. |
| 5 | **D1, D3, D4, D7** | The resistance and defence routines are now decoded in execution order (**CoM2 analysis**, *Resolution-time modifiers*), so these are reads of an existing table rather than of the binary. D1 is already part-settled there. |
| 6 | **D8** | Its write sits in an enchantment-ID-keyed recompute that has to be located first. |
| 7 | **B4, B7, B9** | Foundational damage and rider behaviour on the DOS side. |
| 8 | **D2, D18** | Structural rather than numeric; each changes more than one number. |
| 9 | **F3–F6** | Fixes and audits that need their own read or trace. F6 now has table evidence to start from. |
| — | Everything else | Opportunistically, as the owning routine comes open. |

*(The **data-table sweep**, formerly item 1, was completed on 2026-07-29. It closed D13, D15 and
D5's rate outright, plus the magnitude halves of D2, D4, D6, D7, D12 and D14 — nine entries or
half-entries for one free read. Findings in **CoM2 tables**. It also opened F7, Q14 and D27, and
produced evidence bearing on F6.)*

**Two notes on estimating.**

*Cost.* The data-table sweep came in far under its billing: entries costed `small` and `medium`
across section D fell to a single `grep` because the value was simply stated in a table. Before
opening `Caster.exe` for any numeric constant, check `MODDING.INI` and `SPELLS.INI` first.

*Independence.* R1 and section D's **ordering** entries are not separate items whose costs add —
they are one pass with a precondition. A large share of R1's `large` tag is work this register
already owns under D21–D26; the refactor mostly determines whether that work can be recorded at
all. Section D's *numeric* and *touch-effect* entries are genuinely independent of R1 and are not
blocked by it.

---

## 2. R1 — restructure stat derivation into a sequence of transforms

**Status: stage 0 complete, design settled, ready to build. Cost: large.** The full rationale,
staging and the seven settled design decisions are in
[Appendix A](#appendix-a--r1-staging-plan) — that appendix is this item's only home.

| ID | Stage | Status |
|---|---|---|
| ~~R1.0a~~ | ~~Locate the two CAS hook call sites~~ | **done** — exactly two, `0x59A027` and `0x5A65D7`, and no other routine in the binary runs a per-unit stat script. The design risk it guarded against is retired. |
| ~~R1.0b~~ | ~~Sample one slice to check step granularity~~ | **done, and exceeded** — regions `a`, `c` and `e` are decoded block by block, not sampled |
| ~~R1.0c~~ | ~~Warlord `UnitCalc.CAS` / `UnitCalcPre.CAS` line-order sweep~~ | **done 2026-07-28** — both scripts mapped to top-level source order, md5-pinned |
| R1.1–R1.10 | Machinery → equivalence harness → migrate `res`, `def`, `atk`, `rtb`, `hp` → delete buckets → convert `getAbilityStatModifiers` → encode the mapped sequence | **not started — priority 1** |

All three stage-0 rows were closed by **CoM2 analysis**, *Unit stat recalculation* (2026-07-28)
and *Resolution-time modifiers* (2026-07-29), which also completed the `@Units@RecalculateUnits`
effect-order sweep that Appendix A originally deferred until after stage 10. **The evidence is
ahead of the code**, and has been since 2026-07-28: R1 is not waiting on research, the research
is waiting on R1.

### Scope: 6 + 1 axes, one mechanism

The sequence is **CoM2-shaped by default**; MoM, CoM 1 and Warlord are divergences from it. Base
CoM2 ships `UnitCalcPre.CAS` and `UnitCalc.CAS` as stubs, so regions `b` and `d` are empty there
and `a → c → e` run back to back — the minimal case as well as the best-evidenced one. Warlord
inserts `b` and `d` at two known addresses; MoM and CoM 1 collapse to a single sequence because
`b` and `d` are empty for them too, and differ mainly in where Warp sits.

**Derivation** — `Base`, `a`, `b`, `c`, `d`, `e`. Runs once per unit, produces the stat block, and
is the **sole** source of the UI's displayed modifier numbers. That cut is the engine's own, not a
display convention: the resolution routines accumulate into a local and never write back to the
unit record, so they cannot reach the displayed block.

**Resolution** — same step type, same runner, evaluated per *(defender, attacker, attack type)*
rather than per unit. Two separate sequences, not one, since they are keyed differently:

| Sequence | Steps | Keyed by |
|---|---|---|
| `@Units@GetEffectiveResistance` | 6 | realm (1–5) |
| `@Units@EffectiveDefense` | 9 | ~10 attack-type flags |

These belong in the step model rather than beside it. `EffectiveDefense` is ordered short-circuit
(Illusion returns at step 2), additive (3–6), halving (armour piercing at 7, *after* the
additions), replacing (six immunity assignments at 8, discarding everything prior) and then
additive again on top of the replacement (Weapon Immunity at 9). That is the same non-additive
vocabulary as Warp, Shatter and Berserk, and the reason a second hand-rolled mechanism for it
would reproduce the very problem R1 exists to end. Today it is a chain of conditionals in
`computeDefenseProfile`.

**Out of scope entirely.** The other seven resolution-time enchantments — Spell Lock, Stasis
(combat and overland), Buried, Necromancy, Regeneration, No Heal — are not stat transforms at
all. They are gates and events read by `@Spells@DispelMagic`, `@Units@Immobile` and
`@Combat@Combatend`. Nothing to sequence; they stay where they are.

### Confirmed engine-order defects that R1 must absorb

Five findings where `Caster.exe` is known to disagree with the calculator's ordering. All are
confirmed, none is fixed, and none can be expressed by the current bucket model — which is why
they wait for R1 rather than becoming one-off patches. Evidence: **CoM2 analysis**, *Unit stat
recalculation*; tracked in the **queue** as D22–D26.

| ID | Finding | Calculator today |
|---|---|---|
| D22 | Warp runs mid-region `c` (+0xBA3C); everything after it is added at full value | `stats.js:1488-1497` applies all three Warps to the finished totals, halving everything downstream |
| D23 | The whole aura pass runs after `d`; sources merge by **maximum, not sum**, and Resistance to All shares aura type 3 with Prayermaster | `combat.js:273-278`, `:295` book `holyBonus` and `resistanceToAll` to phase `a` — the opposite end |
| D24 | Supreme Light is post-Warp **and** post-aura-pass, reading resistance after the aura pass | `stats.js:714` books it to phase `c`, before Warp, for every version except CoM 1 |
| D25 | Level, hero and weapon bonuses may be phase `c`, not `a` (needs an execution-order check — so far this is layout only) | `stats.js:956`, `:973`, `:1018` book them to `a`; if wrong, Upgraded Explosive's doubling reads bonuses it should not see |
| D26 | The Chosen is forced `RCLife` + `Fantastic` by region `c` | tracked as **F4** — it is a wrong output today, not only an ordering question |

Also folded into R1: **Q7** (Supreme Light's live-resistance read, fixed by stage 4), **M4**
(`fbRtbMod` attribution), and the Tactician phase question in **MoM analysis**, *Warp Creature runs
early* — revisit during stage 9.

---

## 3. Defects and suspected defects

Code believed wrong, as opposed to unverified.

*(F1 — Vertigo's display path — and F2 — the duplicated `isCoM2` predicate — were fixed on
2026-07-29. F1's display now derives from the same version ladder as `buildVertigoContext`, so
CoM2 and Warlord show −25% / −7% rather than CoM 1's −30% / −10%; CoM 1 and MoM are unchanged.
IDs are not reused.)*

| ID | Item | Status | Cost | Evidence |
|---|---|---|---|---|
| F3 | **Golem's intrinsic Resist Elements is missing.** The engine writes it before either stat hook, for CoM2 and Warlord alike; neither `UNITS.INI` carries it, so the generated rosters omit it and the defence is never granted. Fix in the generators — see [Appendix B](#f3--golems-intrinsic-resist-elements). | open | small | CoM2 analysis, *Region `a`* |
| F4 | **The Chosen is Fantastic in the engine, a plain hero in the calculator.** `ui.js:2448` types anything in the Heroes category as `hero`, so Nature Conjunction, Survival Instinct, Land Link's extra package, the Soul Linker aura, and exclusion from Good Moon / Bad Moon / Leadership / Misfortune all resolve the wrong way. Needs a hard-coded unit-type rule, same shape as F3. | open | medium | queue D26; CoM2 analysis, *Unit enchantment effects* |
| F5 | **Two-stage To Hit clamp may be flattened.** The engine clamps common To Hit to 10–100, *then* adjusts each channel so `common + channel` also lands in 10–100. Clamping a flattened value once is not equivalent. Audit needed — see [Appendix B](#f5--audit-the-two-stage-to-hit-clamp). | open | medium | CoM2 analysis, *Region `e`* |
| F6 | **Chaos Channels Fire Breath coexistence is unsettled.** The recalculation arithmetic is `firebreath += 4`, but whether the flag can land on a unit that already has Fire Breath is not established. CoM2 and Warlord are treated differently today, including an artificial CoM2 preset expecting replacement — see [Appendix B](#f6--chaos-channels-fire-breath-coexistence). | open | medium | CoM2 analysis, *Region `a`*; CoM2 tables, *Chaos Channels* |
| F7 | **Supernatural minimum damage is one too high for a third of hit counts.** `MODDING.INI` gives `SupernaturalStarts=0` / `SupernaturalRatio=34` in both versions — `floor(hits * 34 / 100)`, truncating per the table's own worked example. `combat.js` uses `Math.round(hits / 3)`, which is one too high whenever `hits ≡ 2 (mod 3)`. Affects CoM2 and Warlord. **Deferred by decision 2026-07-29**; revisit later. Fixing it means changing the formula and re-checking every Supernatural preset's expected value. | open, deferred | small | CoM2 tables, *Supernatural minimum damage* |

---

## 4. Engine verification

Claims the calculator implements that rest on prose or inference. IDs are the **queue**'s own —
each row here is a one-line index; the queue holds the reasoning, the code sites and the method.

### DOS builds — MoM 1.31, MoM CP 1.60, CoM 1

| ID | Claim | Cost |
|---|---|---|
| A31 | Level bonus tables — MoM's to-hit ladder. CoM column settled; MoM's six increment sites undecoded. | small |
| A32 | Shatter — what CP 1.60 changed after both writes, and CoM 1's undecoded eligibility gate. | small |
| A33 | The unidentified per-realm global debuff at `0x90A87` (CoM 1), not modelled at all. | medium |
| B1 | The 10%–100% to-hit clamp — the ceiling is unestablished everywhere, the floor outside 1.31. Ties to **Q3**. | small |
| B3 | The Life Steal damage curve — whether Life Steal reads the resistance-check return rather than re-rolling. Ties to **Q8**. | small |
| B4 | Damage rollover with a fresh defence roll per figure. Foundational to every printed number. | medium |
| B5 | Armor Piercing halves defence (floor) and never touches Immolation — cited to another calculator, not the game. | small |
| B6 | Invulnerability subtracts its bonus on *every* chained defence roll. | small |
| B7 | Which attack phases each touch effect rides. MoM proved this **data-driven**; the calculator hard-codes it. Ties to **Q4**, **D18**. | medium |
| B9 | Dispel Evil −4, and −9 against created undead — the binary tests a unit-type mutation flag, the calculator tests *created* undead. | small |

### CoM2 and Warlord — inherited from CoM 1 by prefix-match

The highest-risk group in the file: each is a `version.startsWith('com')` test, so a CoM 1 result
silently governs a different engine.

| ID | Claim | Cost |
|---|---|---|
| D1 | **Righteousness only.** `EffectiveDefense` step 8 confirms the 100-and-replace shape for Fire, Cold, Poison, Magic and Missile Immunity; Righteousness is not among the six the engine tests. Settle alongside D3. | small |
| D2 | Weapon Immunity eligibility, and MoM's generic-hull bypass (a 1991 race-number artefact). **Magnitude resolved** — `WeaponImmunityDefenseBonus` 8 / 10, additive. | medium |
| D3 | Cause Fear's −3 save modifier, plus Magic Immunity / Righteousness as +30 rather than skips. | small |
| D4 | Poison being realm-less. **The −1 save penalty is resolved** — `PoisonSavePenalty=-1`, both versions. | small |
| D5 | Blur as ability vs enchantment, and whose Illusion Immunity is tested. **All three rates resolved** — 20 / 20 / 30, 40 in Warlord. | small |
| D6 | Which attack types Bless's defence half covers. **Magnitudes resolved** — CoM2 5/5, Warlord 7/4. | medium |
| D7 | The realm gate on Elemental Armor / Resist Elements. **Both magnitudes resolved** — RE +4 resistance, EA no resistance key at all; defence 4 / 12. | small |
| D8 | Weakness and Mind Storm magnitudes. Warlord's breath half is script-cited; the CoM2 half sits in an enchantment-ID-keyed recompute that must be located first. | medium |
| ~~D9~~ | ~~Vertigo~~ — **fully resolved 2026-07-29.** CoM2 is −25 To Hit / −7 To Block from the compiled block, F1 brought the display into line, and Warlord inherits it unchanged: `EncVertigo` appears twice in its stat scripts and both are a flag copy, not a magnitude. | — |
| D10 | Haste does not double counter-attacks. One boolean, large effect, no CoM2 evidence. | small |
| D11 | Invisibility's −10% to-hit malus is MoM-only. | small |
| D12 | Assorted `com*` stat constants: CC fire breath 4, Chaos Surge +resistance, Land Linking breath (**Q13**), Focus Magic, Warp halving ranged, Immolation strength 10. **Flame Blade resolved** at +3 melee / +2 missile / thrown 0 CoM2, 2 Warlord. | small each |

### CoM2- and Warlord-specific claims

*(D13 — level bonus tables — and D15 — Wall of Fire — were resolved on 2026-07-29 from
`Levelbonus.INI` and `SPELLS.INI`; both matched the calculator exactly. D16 was resolved the same
day and the calculator **disagrees** with it, so it is now the F7 defect in §3. IDs are not
reused.)*

| ID | Claim | Cost |
|---|---|---|
| D14 | Whether CoM 1's hero exemption survived — and `HeroNoRangePenalty` suggests CoM2 gates it on the **Sharpshooting** ability instead. **CoM2's −3%/tile formula is resolved**, verbatim from four `MODDING.INI` keys. | small |
| D17 | Destruction is CoM2-only; the roster ships `Destruction=0`, so the modifier path is untested by any unit. | small |
| D18 | Which phases touch effects ride. `@Combat@ApplyAttack` takes the attack type explicitly, so a real gate is a plain comparison. Bears on `Touch attack trigger matrix.md`. | medium |
| D19 | CoM2-only abilities with no cross-version anchor: Inner Power, Blazing Eyes, Mislead, Destiny, Discipline, Endurance, Eternal Night / Darkness doubling. | medium |
| D20 | Chaos Surge scope. CoM 1 settled and now followed; the narrower CoM2 scope rests on helptext alone, and the magnitudes match CoM 1 exactly — which makes the scope difference the suspicious half. | medium |
| D21 | Level ladder for a gaze. Sub-items 1 (ordering) and 2 (Warp reaching a gaze) **resolved 2026-07-28**; only the ladder remains. The D13 read confirms `Levelbonus.INI` has no column that could express a special-attack distinction, so the gate is in the executable if it survives at all. | medium |
| D27 | **The hero level ladder is not modelled.** `getLevelBonuses` gives heroes the 6-step `[Normal]` ladder; `Levelbonus.INI` `[Hero]` is a 9-step table of a different shape (magic ranged at half the missile rate, thrown/breath at half attack, Warlord-only to-hit steps at levels 3–4 and 7–8). Values are in hand — what needs deciding is UI scope, since one six-entry level list serves every unit. | medium |

### Warlord script checks

| ID | Item | Status | Cost |
|---|---|---|---|
| S1 | **Magitek Science, Xenoveterinary and Corruption radiation have never been checked against the script.** Recorded so the gap is not mistaken for a clean bill of health; what each is currently believed to do is in the calculator, not in a doc. | open | free |
| S2 | **Magitek Engine — movement.** The one still-open entry in **discrepancies** (§4); helptext is the outlier. | open | free |

---

## 5. Modelling gaps

From **SPEC**, *Known modelling limitations* — that section stays the text's home; these rows only
separate what we have decided to live with from what is deferred work.

| ID | Limitation | Status |
|---|---|---|
| M1 | Life Steal's *displayed distribution* is an approximation (phase count × single-firing). The displayed expected value is exact. | accepted |
| M2 | Damage is capped at the target's remaining HP; overkill is not tracked. | accepted |
| M3 | **Destruction is modelled only for CoM2/Warlord.** The MoM/CP/CoM 1 touch dispatcher also identifies Destruction as a Chaos effect, so Elemental Armor and Resist Elements should protect against it there. That path is unimplemented. | open |
| M4 | **`fbRtbMod` is not cleanly attributable** — it merges Flame Blade / Metal Fires (phase c), Warlord's Fiery Blade (c) and Fiery Fury (b) through a non-additive `Math.max`, booked wholly to c. Separating them means restructuring how they supersede → **R1**. | open, folded into R1 |
| M5 | **One ranged/thrown/breath slot.** Bombs&Grenades can add to an existing Thrown attack but cannot display its granted Thrown alongside an independent ranged or breath attack. | open, structural |
| M6 | **Lava Smelter records one mineral-pair grant at a time.** The scripts evaluate all five pairs independently, so a unit can carry several simultaneous grants. | open |

---

## 6. Open mechanic questions

From **TODO**, which stays their home. `asked` = also on the list put to the maintainer/community.

| ID | Question | Status | Links |
|---|---|---|---|
| Q1 | Troll Shaman 80 vs manual 50, Magician 180 vs 120, and Magician Melee 4 vs 3. Is there an undocumented Troll +1 Melee, or is the manual wrong? | open | — |
| Q2 | Draconian common units carry +1 Resistance over the manual across four unit types — likely an undocumented racial modifier. | open | — |
| Q3 | Warp Reality's page says to-hit can reach 0%; the to-hit page says never below 10%. Which, and does it differ by version? | open, asked | B1 |
| Q4 | Does Chaos Spawn's poison touch trigger on doom gaze, melee, or both (i.e. twice per sequence)? | open, asked | B7, D18 |
| Q5 | "Weird defense behavior on page 25" — needs the source and page identified before it can be worked. | open, underspecified | — |
| Q6 | CoM's High Prayer text says +3 attack; MoM and CoM2 say +2, and the CoM manual says it did not change it. Assumed +2 everywhere. | open | — |
| Q7 | Supreme Light's `defense += resistance/3` reads a **live** resistance in CoM 1 — after Warp Resist and Darkness, before Tactician. The calculator uses a base-ish one. Now positioned by the CoM2 read as well. | open, folded into R1 | D24, R1 stage 4 |
| Q8 | Manuals say Wraiths have Life Steal −4; observed behaviour suggests −3. | open | B3 |
| Q9 | With Blazing Eyes, can a unit have Doom Gaze *and* ranged attacks at once? Settled for the DOS engine (one shared slot); CoM2 is a different engine. | open, asked | D19 |
| Q10 | Does Destiny remove the buff from magical / mithril / adamantium weapons? | open, asked | D19 |
| Q11 | Does Animate Dead give +ranged attack? | open | queue C1 |
| Q12 | Does "ranged" include thrown and breath? Answered for MoM 1.31 to-hit (**no**); open for other versions and for non-to-hit effects. | open, asked | — |
| Q13 | CoM2 helptext says Land Linking gives +2 breath; the CoM2 and CoM 1 manuals do not mention breath. | open, asked | D12 |
| Q14 | **What does the To Defend cap do?** `MODDING.INI` carries `ToDefendCap=15` and `ToDefendCappedValue=30` in both versions — *"the amount of defense above which To Defend bonus loses effectiveness"* — and the calculator models no such cap anywhere. Most natural reading: defence beyond 15 rolls at a flat 30% rather than the unit's boosted To Block, which would mean units with high defence *and* a To Block bonus are over-modelled today. Reachable, since defence is free-form and several abilities add To Block. **Deferred by decision 2026-07-29.** Settling the semantics needs `Caster.exe` — no other source mentions it. | open, deferred | CoM2 tables, *To Defend cap* |

---

## 7. Blocked on a person

Not researchable from the sources we hold.

| ID | Question |
|---|---|
| X1 | Offer the maintainer the compiled list of CoM2-manual-vs-`UNITS.INI` discrepancies. |
| X2 | When CoM2 prose says "+X attack", is that synonymous with "+X melee attack"? |
| X3 | And "+X ranged" — which of missile / boulder / magical / thrown / breath / gaze does it cover? |
| X4 | Are Seravy's new defence formulas ([realmsbeyond post](https://www.realmsbeyond.net/forums/showthread.php?tid=8106&pid=645212#pid645212)) in current CoM or CoM2? |
| X5 | Sky Drake has Negate First Strike in `UNITS.INI` but not in the manual. |
| X6 | Does "regular units" exclude heroes? The Warlord gate at `UnitCalc.CAS:1405-1407` lets heroes through, and `UnitCalcPre.CAS` uses `ISHERO()` in five other places — so the omission looks deliberate, but if the prose means to exclude heroes the code is wrong. (**discrepancies**, *Open questions*) |

---

## Appendix A — R1 staging plan

**Why.** `deriveUnitStats` currently models the engine's pipeline as a *sum of per-phase
numbers*. That works for additive modifiers and cannot express order at all, because addition
commutes. Every non-additive effect therefore needs a second mechanism, and there are two of
them today:

- **Written back into a bucket** — when the effect reduces to an additive delta, computed from a
  named subtotal: Colossal Strength (`atkPhases.d`, `rtbPhases.d`), Xenoveterinary
  (`hpPhases.b`), Upgraded Explosive's fire-breath doubling (`rtbPhases.b`).
- **Applied to the finished total in an ad-hoc tail** — Berserk `×2`, Blaze of Glory, the three
  Warps, Beat of Swiftness `×0.9`, Hierophany `×0.5`, Shatter `=1` (melee and rtb).

`warpLate` is a third patch on top: a bucket-shaped workaround for CoM 1 writing Darkness,
Supreme Light and Tactician *after* Warp Creature. It buys one verified ordering without a
rewrite, and it does not generalise — a second such finding would need a second bucket.

A fourth class is not addressed by any of the above: effects that read a **different** stat than
they write, each currently its own hand-rolled reconstruction.

| Effect | Reads | Writes | Today |
|---|---|---|---|
| Supreme Light | live resistance | defence | [`stats.js:762`](./stats.js#L762) rebuilds a partial res sum by hand |
| Blaze of Glory | current defence | melee, defence | [`stats.js:993-997`](./stats.js#L993-L997) filters defence contributions |
| Holy Armor | `defBase` | defence *or* To Block | [`stats.js:980-987`](./stats.js#L980-L987) applied after `defBase` |
| Psycho Force / Pneuma Field | current resistance | damage %, Life Steal | [`stats.js:1030-1040`](./stats.js#L1030-L1040) |

Supreme Light is the clearest failure: the engine reads resistance *after* Warp Resist and
Darkness and *before* Tactician, and the hand-built sum has to be extended by hand every time a
resistance modifier is added. Five parallel per-stat lists do not fix this — a def step still
has to reach into the res list at the right position.

**Target.** One mechanism, shaped like the engine: **a single phase-tagged sequence of effect
steps over a mutable stat block**, not five per-stat lists. Each step names the stats it writes
and may read any stat's current value. Darkness becomes one step writing four stats, as it is at
`0x9084C`; Supreme Light one step reading live `res`; Warp one step at the position its engine
writes it. MoM and CoM 1 then differ only in *where the Warp step sits* — no `warpLate`, no
per-modifier version routing, no tail, and no separate mechanism for the table above.

The decisive argument is evidence shape. The binary yields orderings as *effects in address
order, each writing several stats* — see the CoM 1 table at `MoM binary analysis.md:1067`. Five
per-stat lists force every such finding to be shredded across five places on the way in, and the
fact that the writes were one atomic block survives only as a comment. A single list is
isomorphic to the source.

### Where the ordering evidence comes from — **it is already in hand**

| Region | Order lives in | State |
|---|---|---|
| `base` | permanent `ABase` writes before combat | **irrelevant** — additive, commutes |
| `b`, `d` (Warlord) | `UnitCalcPre.CAS` / `UnitCalc.CAS` line order | **mapped** 2026-07-28, md5-pinned, top-level order exhaustive |
| `a`, `c`, `e` (CoM2 / Warlord) | `Caster.exe` `@Units@RecalculateUnits`, VA `0x599920` | **mapped** 2026-07-28, block by block; three narrow naming residuals |
| resolution (CoM2 / Warlord) | `GetEffectiveResistance`, `EffectiveDefense` | **mapped** 2026-07-29, both in execution order |
| `a`, `c` (MoM / CoM 1) | `WIZARDS.EXE` recompute `0x8FF09`–`0x90B8E` | tail decoded; 3,205 bytes, bounded |

All of it in **CoM2 analysis**, *Unit stat recalculation* and *Resolution-time modifiers*.

**MoM's a/c split is inert and does not transfer.** `b` and `d` are empty there, so `a` and `c`
are adjacent with nothing between them — the labels collapse to one sequence. The boundary only
acquires consequences in CoM2/Warlord, where `b` sits between them and contains transforms
(Xenoveterinary, Upgraded Explosive's doubling), so an effect misfiled as `a` when it is `c` gets
wrongly scaled. That is **D25**, still open because it needs an *execution-order* check rather
than the layout the region map provides.

The design must still let a step position be **provisional and marked as such**, the same
discipline SPEC.md applies to phase attribution (*Stat derivation contract*, step 4) — MoM and
CoM 1 are not mapped to this resolution, and D25 is open for CoM2. But provisional is now the
exception rather than the rule.

**The original sequencing argument is spent.** This appendix used to defer the effect-order sweep
until after stage 10, reasoning that sweeping first would mean holding N results in a document
through a rewrite and encoding them meanwhile into a model that cannot express them — which is
how `warpLate` came to exist. That sweep has since happened anyway. The results are in the
document, and D22–D26 *are* the accumulation that argument warned about. The conclusion inverts:
the sequence is the only thing that can absorb what has already been found, so it is priority 1.

### Staging

Each stage ends with all three suites green: `node tools/node_unit_checks.js` (167),
in-browser `runTests()` (911), `npx playwright test` (32). See [CLAUDE.md](./CLAUDE.md),
*Testing with Playwright* — `runTests()` in the browser is the only sanctioned way to evaluate
presets.

**Stage 0 is complete** — see §2 for what each item returned. Its three design risks are all
retired: there are exactly two CAS hook call sites and no third, the regions decompose into
nameable per-effect blocks, and Warlord's `b`/`d` source order is mapped. Build from here.

1. **Machinery alongside the buckets.** Step type, the mutable unit object and its permanent-base
   companion, the runner, `halt`, and the optional per-step trace. Nothing migrated.
2. **Equivalence harness.** Compute every stat both ways and throw on mismatch. The 911-preset
   suite then proves equivalence rather than spot-checking it. Keep this in place through
   stage 7 and delete it in stage 8. **Benchmark here, not later** — `deriveUnitStats` runs in
   the matrix worker across many combinations, and a step runner allocates more than flat
   arithmetic. This is the one risk the harness cannot catch.
3. **Migrate `res`** — smallest surface, one transform (Warp Resist).
4. **Migrate `def`** — adds the Holy Armor `> 5` threshold, Beat of Swiftness, Hierophany,
   `blazeEnchantArmor`, and the first cross-stat read (Supreme Light, now that `res` is a step
   list and can be read at a labelled position). **Closes Q7.**
5. **Migrate `atk`** — Berserk, Blaze of Glory, Warp, Shatter, Colossal Strength.
6. **Migrate `rtb`** — the hardest: Warp, Shatter, Colossal, and Upgraded Explosive's doubling,
   which reads `base+a+b` and is gated on attack type.
7. **Migrate `hp`** (Xenoveterinary), then fold in the two **gaze strengths** — they are the same
   `.ranged` slot as `rtb` and are currently built by hand outside the phase objects.
8. **Delete** the bucket objects, `warpLate`, `PRE_WARP_PHASES`, `preWarpTerm`/`postWarpTerm`,
   `abilMods.preWarp`, and the equivalence harness. Rewrite SPEC.md's *Stat derivation contract*
   and *Warp Creature ordering* around steps.
9. **Convert `getAbilityStatModifiers`** to emit steps rather than summed buckets. Last, because
   ~15 call sites read its flat totals, and because that function is where phase attribution
   lives — it is the payoff, not the enabler. Revisit the Tactician phase and **M4** here.
10. **Encode the mapped sequence.** Not a re-check of the handful of orderings already tested
    (`warpAttackBeforeSupremeLightCoM`, `warpAttackBeforeTacticianCoM`,
    `warpDefenseBeforeSupremeLightCoM`, `shatterBeforeSupremeLightCoM`,
    `warpDarknessOrderMoM`/`CoM`) — that is the small part. This is where the region maps in
    **CoM2 analysis** become step positions, which is most of D21–D26's value and the payoff for
    the whole refactor. Each finding lands as a step move plus a test.
11. **Resolution sequence — `EffectiveDefense`.** Nine steps, keyed by attack type, replacing the
    conditional chain in `computeDefenseProfile`. Evaluated per attack rather than eagerly for
    every attack type as today. Settles the shape half of **D1** and folds in **D2**'s Weapon
    Immunity ordering.
12. **Resolution sequence — `GetEffectiveResistance`.** Six steps, keyed by realm. Note the two
    `:= 100` assignments precede all three additions, so a magic-immune unit with Bless or Resist
    Magic finishes *above* 100 — the calculator does not model that today.

Migration stays stat-by-stat despite the single list: steps declare which stats they write, so
the runner applies step results for migrated stats and buckets for the rest.

Stages 11–12 follow the derivation migration rather than interleaving with it, so each half lands
green on its own. They are a different axis — per *(defender, attacker, attack type)* rather than
per unit, and never writing back — but the same step type and the same runner. Keeping a second,
hand-rolled mechanism for them would rebuild the exact problem this refactor exists to end: the
sequence is short-circuiting, additive, halving, replacing and then additive again on top of the
replacement, which is the same vocabulary as Warp and Shatter and equally beyond a bucket.

The `0xE150` extent is what the symbol reports, and much of a routine that size is scaffolding
rather than stat work: region `c` alone decodes to 12,767 instructions, of which 2,356 calls are
Delphi `@System@@BoundErr` / `@System@@IntOver` guards. **CoM2 analysis** collapses those and
describes the semantic blocks, so the step list is built from that decomposition, not from the
raw instruction count.

### Design decisions (settled 2026-07-29)

All seven questions that gated stage 1 are answered. The governing principle throughout: **model
what the binary does, and do not carve exceptions out of that for implementation convenience.**

**1. The list covers every region, `base` and `a` included.** No region stays a sum.

**2. Steps mutate a unit object; there is no subtotal-read mechanism.** A step reads whatever
field it needs at its own position, exactly as the engine does — `unit.resistance`, not
`valueBefore(state, 'warp')`. The apparent need for labelled subtotal reads was an artefact of
the bucket model and disappears with it. The four cross-stat effects in the table above all
reduce to a plain field read; Holy Armor's `defBase` and Upgraded Explosive's `base+a+b` look
like subtotals but are **positional** — the field simply *is* that value where those steps sit.

Keep **two records**, as the engine does: the permanent base (`ABase`, copied in region `a`) and
the calculated one the steps mutate. A step wanting the permanent value reads the base record.
That is two field reads, still no labels.

**3. One list, CoM2-shaped, for all versions.** Start on the assumption it covers everything and
split only if forced. Where an effect is ordered differently between versions, prefer modelling
it as **two version-exclusive steps** over one step with a version predicate — it keeps both the
runner and the list trivial, and makes the divergence visible instead of hidden in a condition.

**4. Display stays on finished totals**, with both records available the red number is just
`final − base`. **The runner keeps an optional per-step trace** — which step wrote which field,
and by how much. Not needed for the red numbers; wanted for an ordered "what modified this unit"
breakdown in a tooltip, and it is the natural home for **M4**'s `fbRtbMod` attribution. Fill it
only when asked.

**5. Step order: migrate at today's positions, move them at stage 10.**

- *During stages 1–8, order is not a free choice for any step* — verified or not. Every step is
  declared at the position its bucket gives it today, so the migration is purely structural and
  changes no output. The equivalence harness compares step results against bucket results across
  all 911 presets, so **any** position change registers as a mismatch, including one we believe is
  more correct. That is the harness's whole purpose, and it is why known-wrong placements such as
  D22's Warp stay wrong until the buckets are gone.
- *The harness cannot outlive stage 8*, since it compares against buckets and stage 8 deletes
  them. Stage 9 (`getAbilityStatModifiers`) is also meant to be behaviour-preserving; its net is
  the 911-preset suite itself, which asserts absolute expected values rather than equivalence.
- *At stage 10, positions move*, from the region map in **CoM2 analysis**, each as a step move
  plus a test. Behaviour changes here by intention — this is where D22–D26 land and where the
  bugs get fixed.
- *For an effect the map does not locate*, default it to `base` — by deduction, not observation:
  regions `a`–`e` and the resolution routines are mapped, so a permanent pre-combat write is the
  only remaining place a stat modification can live. Flag such placements as deduced. **Two
  limits:** the mapping is strong but not airtight (`b`/`d` are exhaustive only at top level,
  `c` has three residuals, and *Resolution-time modifiers* records "not found, not absent" for
  two effects); and before defaulting to `base`, check whether the engine models the effect as a
  stat write **at all** — it may be applied in `@Combat@ApplyAttack` / `Dealdamage`, or be a
  flag consumed elsewhere, in which case the calculator's stat modifier is the error and `base`
  would bury it. CoM2/Warlord only: MoM and CoM 1 have just the recompute tail decoded, so the
  "nowhere else left" step does not hold for them.

**6. Performance is not a gate.** A benchmark at stage 2 stays worthwhile as information, but it
does not block: the step runner is expected to beat the current arithmetic, and
`computeDefenseProfile` in particular does eager work per attack type that the resolution
sequence will make lazy.

**7. Resolution steps are ordinary steps.** Same step type, same runner, same unit object — run
on a **scratch copy**, which is discarded afterwards. "Never writes back" then falls out of
copying rather than needing a separate type. This is the faithful reading, not merely the
convenient one: both routines form a pointer to `Units[u]`, the calculated record, and accumulate
into a local, so the engine has the whole struct available and merely happens to touch one field.

Attack context (realm, the ~10 attack-type flags) is passed to the sequence and available to step
predicates, the same way version is.

**One new primitive:** `halt`. `EffectiveDefense` step 2 returns immediately when the attack is
Illusion and the defender lacks Illusion Immunity, so no later bonus or immunity applies. Nothing
in the derivation phases needs it; the resolution sequences do.

### Known orderings to encode

From **MoM analysis**, *Warp Creature runs early*:

| Engine | Order within the recompute |
|---|---|
| MoM 1.31 / CP 1.60 | … → Prayer/High Prayer → Darkness → Warp (`0x90A63`, `0x90AA9`, `0x90AC9`) → Shatter → clamp |
| CoM 1 | … → Prayer/High Prayer → Warp (`0x9074C`) → Shatter (`0x907DC`) → Darkness → Supreme Light → Tactician → Eternal Night → clamp |
| CoM2 / Warlord | … → Haste → Vertigo → Weakness → Mind Storm → Warp (+0x0BA3C, +0x0BCDF, +0x0BDF7) → Shatter (+0x0BF62) → … → *`d`* → **aura pass** → **Supreme Light** (both region `e`) |

CoM2/Warlord follow **MoM's shape for Warp and Shatter**, which is what the calculator already
assumes. What it does not model is region `e` — that is D22–D24 above.

---

## Appendix B — task detail

Detail for items whose evidence lives elsewhere but whose *task* has no other home.

### F3 — Golem's intrinsic Resist Elements

Region `a` tests base unit type 81 (`UnitGolem`) and writes
`ItemEnchantmentFlags[EncResistElements]` before either stat-calculation hook. This applies to
CoM2 and to Warlord, which uses the same executable. The CoM2 manual also lists Resist Elements
on the Golem, but neither version's `UNITS.INI` does, so the generated `units_com2.js` and
`units_warlord.js` records omit it and the calculator does not grant its defence.

Fix this through the generators or another source-level derived-unit rule; do not hand-edit the
generated unit files. Add CoM2 and Warlord presets in which a Golem defends against an attack
that Resist Elements affects, plus a nearby non-Golem control.

### F5 — Audit the two-stage To Hit clamp

At the start of region `e`, the engine first clamps common To Hit to 10–100. It then adjusts
the Melee, Ranged, Thrown and shared Breath channel modifiers so `common + channel` is also in
10–100. A single clamp of a flattened effective value is not generally equivalent: raw common
0 plus Ranged +20 becomes 30 in the engine, while clamping the sum once gives 20.

Audit `deriveUnitStats` effect by effect to determine whether every attainable CoM2/Warlord
combination preserves the engine's order. If not, retain common To Hit and attack-specific
channels separately through final normalization. Cover both lower- and upper-bound cases and
all four attack channels; Fire and Lightning Breath share the Breath channel.

### F6 — Chaos Channels Fire Breath coexistence

Region `a` establishes the recalculation arithmetic as `firebreath += 4` whenever
`EncCCBreath` is present. It does not establish whether vanilla spell targeting or application
can place that flag on a unit which already has Fire Breath. The calculator currently treats
existing Fire Breath differently in CoM2 and Warlord, including an artificial CoM2 preset that
expects replacement rather than addition.

Trace the CoM2 spell eligibility/application path for the Fire Breath result. If coexistence is
reachable, change CoM2 to additive arithmetic and update the preset; if it is unreachable, make
the calculator state unrepresentable or explicitly treat that preset as an artificial
out-of-engine case. Warlord eligibility must additionally be checked against its scripts, which
can widen or alter the base executable's targeting rules.

**Start from the table.** `MODDING.INI [Spells]` carries `CCRangedFBAllowed=0` — *"Chaos Channels
can add Fire Breath to units that have ranged attacks? 0 - No"* — identically in CoM2 and
Warlord. That is the adjacent gate rather than this question exactly (it concerns *ranged*
attacks, not existing Fire Breath), but two things follow: this class of eligibility is
table-driven, so F6's own answer may be a key rather than a code path; and the two versions are
configured the same here, which undercuts the calculator treating them differently.
