# Calculator backlog

Upcoming calculator work only. Keep every entry concise: task, state, cost, dependencies, and an
evidence pointer. Completed work and accepted decisions move to [HISTORY.md](./HISTORY.md);
engine results stay in their owning evidence documents. IDs are never reused.

Behavior is specified in [SPEC.md](./SPEC.md); working conventions are in
[CLAUDE.md](./CLAUDE.md).

## Evidence homes

| Short name | File |
|---|---|
| **verification evidence** | `Reference docs/Engine verification evidence.md` |
| **MoM analysis** | `Reference docs/MoM binary analysis.md` |
| **CoM2 index** | `Reference docs/Caster binary/CoM2 binary analysis.md` |
| **CoM2 combat** | `Reference docs/Caster binary/CoM2 binary - combat flow.md` |
| **CoM2 resolution** | `Reference docs/Caster binary/CoM2 binary - resolution helpers.md` |
| **CoM2 spells** | `Reference docs/Caster binary/CoM2 binary - direct spells.md` |
| **CoM2 damage** | `Reference docs/Caster binary/CoM2 binary - damage and healing.md` |
| **CoM2 units** | `Reference docs/Caster binary/CoM2 binary - unit recalculation.md` |
| **CoM2 map/city** | `Reference docs/Caster binary/CoM2 binary - map and city.md` |
| **Caster reconstruction** | `Reference docs/Caster binary/` |
| **DOS reconstruction** | `Reference docs/DOS reconstructed/` — its README owns the artifact conventions |
| **CoM2 tables** | `Reference docs/CoM2 data tables.md` |
| **discrepancies** | `Reference docs/Source discrepancies.md` |

States: `ready`, `open`, `deferred`, `blocked`. Costs: `free`, `small`, `medium`, `large`.

## Priority

| # | Items | Next outcome |
|---|---|---|
| 1 | **R6.4, R6.5a–d** | Harden the DOS checker and reconstruct the four newly resolved call-closure targets. |
| 2 | **F7** | Replace the known-wrong Supernatural approximation when the deferral is lifted. |
| 3 | **B4, B7, B9** | Verify foundational DOS damage and rider behavior. |
| 4 | **D2, D18** | Audit modern Weapon Immunity mapping and Warlord touch-flag placement. |
| 5 | **F3–F6, F9, F12–F43** | Implement confirmed defects, respecting dependencies below. |
| 6 | **R7.3, R7.4** | Finish the tiered modifier display; both wait on Q16. |
| 7 | **F49** | Add the confirmed CoM 1 Heavenly Light effect when higher-priority work is complete. |

## Structural and reconstruction work

| ID | Task | State | Cost | Evidence / dependency |
|---|---|---|---|---|
| R6.4 | Scope `verify_dos_derivation.py` citations to the build under check; make `split_dos_derivation.py` match build labels as tokens rather than treating the `all` inside headings such as `Call inventory` as a MoM-build marker; make `named_write` require a memory destination rather than counting `mov reg,mem` loads; and extend `scan_mom_binary.FIELDS` to the displacements the reconstructed routines write. Without build scoping, a 1.31 citation silently satisfies a `com1` run wherever builds share offsets; without the field additions, the checker misses `race`, `Move_Flags`, `Attribs_1`'s high byte, `Attribs_2`, status/damage bytes, `s_UNIT` writes, `+0x3C`/`+0x3D`, and the `Gold_*`/`Grey_*` run. | ready | small | R6.1a/R6.1b/R6.2f evidence, *Counts*; R6.2f reciprocal-review tooling checks. |
| R6.5a | Reconstruct exported routine `0x7BDA0..0x7BE3B` across all three DOS builds. It is the resolved `0348:003E` target called by `BU_ApplyDamage`; the 155-byte body is byte-identical and makes no calls. | ready | small | DOS version index, *Resolved call closure* |
| R6.5b | Reconstruct exported Life-Steal-path routine `0x7FCBA..0x7FF43` across all three DOS builds. Its 649-byte bodies differ and call `abs()`, the battle-unit constructor, and stat recompute. | ready | medium | DOS version index, *Resolved call closure* |
| R6.5c | Reconstruct movement routine `0x98494..0x986BD` across all three DOS builds. MoM 1.31 and CP 1.60 call it through `03C8:0043` and are byte-identical; CoM replaces the call path and has a 17-byte-different homolog. | ready | medium | DOS version index, *Resolved call closure* |
| R6.5d | Reconstruct exported routine `0x9A8AB..0x9AD04` across all three DOS builds. CoM `BU_ApplyDamage` calls it through `03D0:004D`; it contains the already reconstructed CoM To Block and SpFx helpers and makes no calls. | ready | medium | DOS version index, *Resolved call closure* |
| R7 | Present unit-card stats as an unmodified base plus tiered modifier values, imitating the game's plain/gold stat display. Closes after R7.1–R7.4. | open | medium | D22; Q16 |
| R7.3 | Derive the engine's plain-versus-gold display rule and assign every modifier source a tier. | blocked on Q16 | medium | D22; CoM2 units; R6.1a evidence, *`Gold_*` / `Grey_*` accumulators* (the DOS engine accumulates the tiers rather than deriving them at draw time) |
| R7.4 | Replace the single effective-value column with separate silver and gold modifier values, keeping numeric presentation rather than icon pips. | blocked on R7.3 | medium | `ui.js:651`, `stats.js:1798`, `style.css:291`; SPEC UI contract |

**Every R6 item covers all three DOS builds at once**, not one build each. The builds are one
lineage — 1.31, the community patch, then CoM 1 on top — so homologous code is read once and
diffed rather than derived three times and reconciled afterwards. The version differences *are*
the deliverable for A32, B1 and C1, and `MoM binary analysis.md` already records its
findings that way. Read each item with 1.31 as the primary and CP 1.60 and CoM 1 as diffs against
it — but establish each build's *extent* separately, per the next paragraph. Where a build
diverges structurally, that region becomes its own item rather than bloating a joint one. CoM 1's
table-rewritten level-bonus routine is the known case.

**Artifacts are C, not Pascal.** `WIZARDS.EXE` is Borland C++ 1991 (see `tools/scan_mom_binary.py`),
where `Caster.exe` is Delphi — so `Reference docs/DOS reconstructed/` holds `.c` files, and the
`.pas` convention under `Caster binary/` does not carry over. Matching ReMoM's language and
`MOM_DAT.h` struct names keeps the two directly comparable, which matters because ReMoM is the
orientation source we most need to check against.

**Sizing an item by its 1.31 extent understates the two later builds.** R6.1a found that CP 1.60
and CoM 1 both replace this routine's epilogue with a jump to a tail relocated into space freed
inside the *constructor's* address range, and that each build's only `retf` lives there. Nothing
says that is the only such relocation, so scope every remaining R6 item by decoding each build to
its own `retf` rather than assuming 1.31's extent, and expect an item's ranges to interleave with
a neighbour's.

Instruction counts above are measured, not estimated (`capstone`, 16-bit). The originally located
core was ~4,119 instructions per build and the eleven first-level callees added ~1,790. R6.3 has
now enumerated the complete first-/second-level call surface with zero unresolved targets; the
four newly bounded code callees are R6.5a–d. Every call is direct, so the graph remains statically
walkable. Extents marked *provisional* were sized by scanning to the first `retf` and must be
confirmed when the item is scoped.

**R6 runs in dual-derivation mode throughout** — AKH's standing instruction, 2026-08-04, on the
grounds that the work is too difficult to trust a single pass. Both agents derive every item
independently before any review; see `DERIVATION-REVIEW-PROTOCOL.md`. Review is per item, as that
protocol's merge gate describes; there is no end-of-R6 review gate, which would have put the first
feedback after six large reconstructions. R6.3 received both independent derivations, but AKH
explicitly waived its reciprocal-review round and directed the immediate merge; the durable index
and `HISTORY.md` record that exception.

The originally assigned R6 constructor/recompute/combat surface closed with R6.3. R6.4 is checker
hardening and R6.5a–d are separately scoped routines exposed by the completed overlay-aware call
audit; neither was silently absorbed into R6.3. A material post-review change to R6.1a–R6.2f
requires the affected reviewer to re-check it.

## Confirmed and suspected defects

| ID | Upcoming task | State | Cost | Evidence |
|---|---|---|---|---|
| F3 | Derive Golem's intrinsic Resist Elements in both modern roster generators and add Golem/non-Golem controls. | open | small | CoM2 units, region `a` |
| F4 | Classify the Chosen as engine-Fantastic for all downstream gates without losing hero behavior. | open | medium | CoM2 units, unit-enchantment effects |
| F5 | Put common and channel To Hit/To Block writes in the transform record and implement the modern two-stage clamp. | open | large | CoM2 units, region `e` and sequential-transform audit |
| F6 | Trace Chaos Channels Fire Breath eligibility/coexistence, then make CoM2/Warlord representation and arithmetic match the reachable engine state. F48 settled the modern half — CC adds, never removes, and CoM2 and Warlord behave identically — so what remains is DOS: MoM leaves a gaze *and* a breath both firing from the one shared slot at the overwritten strength (2+2+1 = 5 where the slot holds one attack). | open | medium | CoM2 units, region `a`; CoM2 tables, Chaos Channels; `stats.js:436-441` |
| F7 | Replace `Math.round(hits/3)` with the moddable Supernatural formula using Delphi banker's rounding; update affected presets. | deferred | small | CoM2 combat, ApplyAttack; CoM2 tables, Supernatural minimum damage |
| F9 | Model Marionette's Channeler transformation, bonuses, spell package, and live-Fantastic Xenoveterinary eligibility. | open | medium | discrepancies, script checks without a calculator discrepancy |
| F12 | Move Destiny to the end of permanent `base` writes and make later channel transformations ordinary ordered steps, including Focus Magic conversion and Shadow Strike's creation/boost of Thrown. | open | medium | CoM2 units, Destiny; `CreateUnit.CAS:695,703`; current preset regressions |
| F13 | Move Upgraded Explosive's Fire Breath doubling to its early `UnitCalcPre` position and test a later bonus escaping it. | open | small | CoM2 units, Warlord region `b` |
| F14 | Move Misfortune/Mislead to aura type 10 in region `e`, preserving eligibility gates. | open | small | CoM2 units, aura pass |
| F15 | Put Holy Armor at its exact region-`c` position so its `Defense > 5` test cannot see later effects. | open | medium | CoM2 units, unit-enchantment effects |
| F16 | Compute Charm of Life from live HP at its engine position after earlier HP writers. | open | small | CoM2 units, global enchantments/events |
| F17 | Implement Warlord Vampirism's script formula and source-channel resets at its region-`d` position. | open | medium | `UnitCalc.CAS:1245-1258`; CoM2 units |
| F18 | Split Mind Storm, Tactician, True Light, node aura, and combat Flame Blade writes onto their actual channels/positions. | open | medium | CoM2 units, calculator-facing discrepancies and aura pass |
| F19 | Add controls/transforms for the calculator-relevant compiled effects identified as absent by the sequential-transform audit, including Lightning Blade's created Breath and Military Workshop/Rocketry channel behavior. | open | large | CoM2 units, sequential-transform audit; current preset regressions |
| F20 | After F12–F19, make the represented `b`/`c`/`d` step lists source-order exhaustive and atomic; add a complete trace-order assertion. | blocked on F12–F19 | medium | CoM2 units, phase and region maps |
| F21 | Load modern roster `to_block` into the card with one consistent absolute/delta encoding; add non-default controls. | open | small | generators vs `ui.js`; MoM analysis, constructor |
| F22 | Apply modern Blood Lust doubling to Thrown as well as melee at the resolution boundary. | open | small | CoM2 combat, ApplyAttack setup/result flow |
| F23 | Preserve intrinsic/base Death Immunity separately for modern Cause Fear's direct skip. | open | small | CoM2 combat, ApplyAttack setup |
| F24 | Replace unit-owned modern Blur with per-side combat-global inputs and reproduce turn-relative `CGADEnemy` selection. | open | medium | CoM2 combat, ApplyAttack; call-closure evidence |
| F25 | Prevent modern touch riders from firing with gaze attack types 6–8. | open | medium | CoM2 combat, ApplyAttack riders |
| F26 | Roll modern Destruction once per surviving attacking figure. | open | small | CoM2 combat, ApplyAttack riders |
| F27 | Trigger Warlord Bloodsucker after all result categories and route configured healing through non-overheal `Combatheal`. | open | medium | CoM2 combat and CoM2 damage |
| F28 | Keep Life Steal's uncapped roll distribution separate from target damage and route healing through `Combatheal`. | open | medium | CoM2 combat and CoM2 damage |
| F29 | Reorder modern melee phases to Wall of Fire → attacker gazes → defender gazes → Lightning → Fire → Thrown → melee. | open | large | CoM2 combat, attack dispatch |
| F30 | Repeat initiating modern gazes under Haste while leaving retaliation gazes/counterattack single. | open | medium | CoM2 combat, attack dispatch |
| F31 | Give each Hasted modern melee `ApplyAttack` call an independent Cause Fear sample. | open | medium | CoM2 combat, attack dispatch |
| F32 | Split modern Defense dice into pre-cap and capped-To-Defend binomials. | open | medium | CoM2 resolution, roll helpers; CoM2 tables |
| F33 | Exempt modern heroes from ranged distance penalties and retain the separate magical-ranged rule. | open | small | CoM2 resolution, ranged penalty |
| F34 | Remove Bless Defense from modern unit-attack profiles; retain it only for qualifying positive-ID Chaos/Death spells. | open | small | CoM2 resolution and CoM2 combat |
| F35 | Remove the wounded-top remaining-HP cap from modern area-spell subattacks. | open | small | CoM2 spells, DamageSpell |
| F36 | Implement Warlord Wall of Fire's repeated non-area spill distribution and `ApplyDamageSpell` category adjustment. | open | medium | CoM2 spells; R5.2g/j/m evidence |
| F37 | Short-circuit modern magical spell damage on Magic Immunity when the spell is not `Nonmagic`. | open | small | CoM2 spells, DamageSpell |
| F38 | Apply modern Black Sleep's Doom conversion to DamageSpell-shaped Immolation/Wall of Fire after the immunity exit. | open | small | CoM2 spells, DamageSpell |
| F39 | Add Chaos Conjunction combat state and apply `Trunc(str × 1.34)` to modern Immolation only. | open | medium | CoM2 spells, direct spell damage |
| F40 | Exclude calculated Teleporting/Merging attackers from modern Wall of Fire and expose Merging in the roster/card. | open | small | CoM2 spells; R5.2g/k evidence |
| F41 | Add engine-specific hero progression: the DOS eight-threshold ladders and template-ability formulas (including CoM's Blademaster divisors, mana table and Lucky rewrite), plus the modern nine-step hero table. Decide how the current six-entry level control exposes them. | open | large | R6.1f evidence, hero ladders and abilities; CoM2 tables, level bonuses; `combat.js:39-74` |
| F42 | Stop a Level change from overwriting hand-edited stats on a custom unit: `resetCardToRosterBase` fires on every Level change and rewrites the card from a stale roster record even when the unit selector is "custom" and the fields are unlocked. | open | small | found during R7.1; `ui.js` Level change handlers and `unitBaseStats` lifetime |
| F43 | Decide whether Dispel Evil should also be gated. Exorcise is now hidden in the MoM versions and Destruction is explicitly ungated, but Dispel Evil still shows everywhere: MoM's roster names it, CoM 1's roster names Exorcise instead, yet the `0x800` flag and its literal −4 are byte-identical at `0x99F72` in both — so it may be live in CoM 1 with no roster user. | open | small | MoM analysis, touch-effect table and *Dispel Evil*; `data.js:71,72` |
| F49 | Add a CoM 1 Heavenly Light active-effect control and transform for defending units: +1 positive melee/ranged, +1 Defense and Resistance, conditional weapon To Hit, and minimum magic-weapon quality. Add focused tests and state that the user enables it only for a defender in city combat. | open | small | R6.1c evidence, *The CoM 1 city-defense bytes are Guardian and Heavenly Light*; currently absent from `data.js` and `combat.js` |
| F50 | Add CoM 1 side-maximum controls/transforms for Guiding Beacon, Divine Barrier and Soul Linker. Preserve the ranged-type/Fantastic gates and Soul Linker's `ceil(v/2)` To Hit versus `floor(v/2)` To Block split. | open | medium | R6.1d evidence, *CoM 1's relocated tail consumes three side-wide hero maxima*; absent from `data.js`/stat steps |
| F51 | Add a CoM 1 Realm Ward city-enchantment input and transform: a matching Nature/Sorcery/Chaos/Life/Death Fantastic unit loses 20% To Hit, 3 Defense and 3 Resistance. | open | small | R6.1d evidence, *CoM 1 Realm Wards use −2/−3/−3*; absent from `data.js`/stat steps; Q19 |
| F52 | Split CoM 1 Supreme Light eligibility from the modern helper and reproduce its five binary paths (live magical ranged, Life race, mana, persistent Focus Magic, or base magical ranged), unconditional +2 melee, positive-ranged gate, and signed live-Resistance division. | open | medium | R6.1d evidence, *CoM 1 Supreme Light has five eligibility paths*; `combat.js:78-82`, `stats.js:1018-1023,1454-1462` |
| F53 | Use signed truncate-toward-zero division for CoM 1 Warped Defense instead of `Math.floor`; negative pre-Warp Defense can receive later Supreme Light/Tactician writes before the terminal clamp. | open | small | R6.1d evidence, *Warp Creature and Shatter expose both arithmetic and ordering differences*; `stats.js:1428-1431` |

## Engine verification

Detailed dossiers live in **verification evidence**. This table states only the remaining read.

| ID | Upcoming verification | Cost |
|---|---|---|
| A32 | Locate and decode the CoM 1 Shatter effect-setter eligibility gate. R6.1d settled the recompute (it tests only `BUE_SHATTER`) and CP 1.60's two accumulator fixes. | small |
| B4 | Verify per-figure damage rollover and fresh Defense rolls. | medium |
| B5 | Verify Armor Piercing rounding and its Immolation exclusion. | small |
| B6 | Verify repeated Invulnerability subtraction across rollover. | small |
| B7 | Compare the DOS data-driven touch dispatcher with calculator phase routing. | medium |
| B9 | Determine whether natural Death creatures carry `UM_UNDEAD` for Dispel Evil. | small |
| C1 | Verify Animate Dead's ranged bonus in the DOS builds. | small |
| D2 | Prove the calculator's modern Weapon-Immunity proxy matches `EncMagic or magicranged` for every reachable transformation. | medium |
| D18 | Complete the Warlord touch-flag placement audit. | small |
| D21 | Reconstruct modern `ApplyLevelBonus` far enough to settle gaze level bonuses. | medium |

## Modelling work

Accepted limitations remain in `SPEC.md`; only planned changes appear here.

| ID | Upcoming task | State |
|---|---|---|
| M3 | Implement the older-engine Destruction path, including elemental protection. Present in all three DOS builds but hero-only, so it stays unreachable until heroes are modelled; 1.31 adds the defender's per-figure hits where CoM 1 adds a flat 100. | open |
| M6 | Represent all simultaneous Lava Smelter mineral-pair grants. | open |

## Open questions

| ID | Question / next action | State | Evidence |
|---|---|---|---|
| Q1 | Resolve Troll Shaman/Magician roster values versus the manual, including the possible Troll +1 melee rule. | open | roster/manual conflict |
| Q2 | Confirm the apparent Draconian common-unit +1 Resistance racial modifier. | open | roster/manual conflict |
| Q4 | Settle DOS Chaos Spawn poison-touch delivery; modern gazes are already excluded. | open, partial | B7, D18, F25 |
| Q5 | Identify the source and page behind “weird defense behavior on page 25.” | blocked on missing source | — |
| Q6 | Resolve CoM High Prayer's +3-attack text versus the +2 used elsewhere. | open | prose conflict |
| Q8 | Determine whether Wraiths use Life Steal −4 or −3. | open | observation/manual conflict |
| Q12 | Determine when “ranged” includes missile, boulder, magical, Thrown, breath, or gaze across versions/effects. | open, asked | — |
| Q15 | Check whether compiled code ever consumes `unitT.savemodifier`. | open | CoM2 units, `unitT` fields; R4 |
| Q16 | Determine what makes CoM2 draw a stat bonus as a plain icon rather than a gold one, and classify every modifier source. | open, partial | D22; R7.3; R6.1a evidence, *`Gold_*` / `Grey_*` accumulators* |
| Q17 | Resolve CoM 1 FocusMagic's `ammo > 0` gate against helptext that promises the ranged attack unconditionally; the answer also decides whether the signed `base_rt` fallback is reachable in play. | open | R6.1a evidence, *Open questions* |
| Q18 | Determine what CoM 1's Holy Arms unit-type ceiling of `0x97` selects, given that the helptext says "normal unit" but the ceiling appears to admit four fantastic summons. | open | R6.1a evidence, *Open questions* |
| Q19 | Resolve CoM 1 Realm Ward helptext's −2 To Hit/−4 Defense/−4 Resistance against the executed `0x90A87..0x90A9B` writes of −2/−3/−3. | open | R6.1d evidence, *CoM 1 Realm Wards use −2/−3/−3* |
| Q20 | Identify the CoM 1 `Move_Flags 0x0100` bit set by Supreme Light and verify whether its read path implements the helptext's post-combat regeneration. | open | R6.1d evidence, *CoM 1 Supreme Light has five eligibility paths* |
| Q21 | Resolve CoM 1 helptext's retained Endurance/Giant Strength powers against the manual's Teleportation/Inner Fire/Divine Protection replacements; the executed binary effects match the manual's replacement package. | open | prose conflict; R6.1e evidence, *Later builds turn the item block into a patch surface* |
| Q23 | Resolve CoM Logistics scaling: shipped helptext says +0.5 movement per two experience levels, while the manual says +0.5 per level. `Battle_Unit_Moves2` consumes the per-controller maximum at `DS:0x3AC8` but does not calculate it. | open | R6.1g evidence, *CoM `Battle_Unit_Moves2`*; prose conflict |
| Q25 | Resolve the R6.1h shared-source rendering disagreement at `0x8E5C6: 25 00 01`. Claude: the statement-level `#if` is “a naming branch only” and may use `IP_COM1_DIVINE_PROTECTION` versus `IP_POWER_DRAIN`. Codex: a statement-level `#if` “visually asserts a source/control-flow divergence” absent from the identical bytes, so one statement plus a build-selected alias is preferable. The merged C uses the alias form and the mechanic is undisputed. | open | R6.1h evidence, *Disputed source representation* |

## Blocked on people

| ID | Needed answer |
|---|---|
| X1 | Maintainer response to the compiled CoM2-manual-vs-`UNITS.INI` discrepancy list. |
| X2 | Whether CoM2 prose “+X attack” means melee only. |
| X3 | Which attack channels CoM2 prose “+X ranged” includes. |
| X4 | Whether Seravy's newer Defense formulas apply to current CoM or CoM2. |
| X5 | Whether Sky Drake should have Negate First Strike despite the manual omission. |
| X6 | Whether “regular units” excludes heroes despite Warlord's script gate allowing them. |
