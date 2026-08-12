# Calculator backlog

Upcoming calculator work only. Every listed item is actionable unless marked **Deferred**,
**Blocked**, or as a tracking umbrella. Keep every entry concise: task, cost, dependencies, and
an evidence pointer.
Completed work and accepted decisions move to [HISTORY.md](./HISTORY.md); engine results stay in
their owning evidence documents. **`done` is not a valid backlog status:** remove a completed
item from this file and record its result in `HISTORY.md` in the same change. IDs are never reused.

Behavior is specified in [SPEC.md](./SPEC.md); working conventions are in
[CLAUDE.md](./CLAUDE.md).

Evidence short names below follow the source routing in the root [CLAUDE.md](../CLAUDE.md).
Costs are `free`, `small`, `medium`, or `large`.

Every item must satisfy the explicit version-scope rule in
[`DERIVATION-REVIEW-PROTOCOL.md`](../DERIVATION-REVIEW-PROTOCOL.md).

An implementation preference is explicit only when its row names **method 2** or **method 3** from
[`DERIVATION-REVIEW-PROTOCOL.md`](../DERIVATION-REVIEW-PROTOCOL.md). If a row has no preference and
the user does not select one, ask before implementation begins. Binary reconstruction always uses
method 4 and does not need a per-row preference.

## Priority

This is the execution order; the category tables below are not ordered queues. Every dependency
must occur in an earlier numbered row than the item it blocks. Items within one row are independent
unless the row says otherwise. A deferred item blocks only its named dependents, not unrelated
items in the same or later rows.

| # | Items | Next outcome |
|---|---|---|
| 1 | **D30_D31_D32 — Method 4 package: D30, D31, D32** | Locate and bound the three isolated source prerequisites as one frozen package; each completed locate item creates its fixed-extent reconstruction follow-up. |
| 2 | **R9-G1j — Method 3 package** | Close the independent derived-package provenance domain. |
| 3 | **R9-G1g** | After D30–D32 and their reconstruction follow-ups: close the five remaining direct-helper gaps. |
| 4 | **R9-G1a** | After row 3's R9-G1g: close identity/creation provenance; M6, F54 and F55 are complete. |
| 5 | **F5–F6, F9, F12–F15, F17–F19, F21, F23–F43, F50–F51, F53, F56** | Implement the remaining confirmed defects that have no named live prerequisite. |
| 6 | **R9-G1e, R9-G1c, F20** | After rows 3 and 5: close R9-G1e's weapon/clamp projections, R9-G1c's blocked claims, and the exhaustive step lists after their named prerequisites. |
| 7 | **M7** | After R9-G1a, R9-G1j and F20: retire the transitional non-linear transform helpers. |
| 8 | **M3** | After row 5's F41: implement the hero-only older-engine Destruction path. |
| 9 | **F49** | Add the confirmed CoM 1 Heavenly Light effect when higher-priority work is complete. |
| 10 | **D28** | Bound the newly exposed CP-only Wall of Fire trigger without widening D22's table reconstruction. |

## Provenance evidence gaps

R9-G1 is the non-executable tracking umbrella for R9-G1a–R9-G1k. Its live total remains the
audit reconciliation point; each implementation child or named defect owner owns the fixed formula
domain stated below.
R9-G1a–R9-G1k must be undertaken with **method 3: current-agent implementation followed by one
Codex GPT-5.6 Sol High review-and-revision pass** under
[`DERIVATION-REVIEW-PROTOCOL.md`](../DERIVATION-REVIEW-PROTOCOL.md). Dedicated reconstruction
dependencies always use method 4 under the protocol's derivation rules.

| ID | Evidence gap / fixed formula domain | Cost | Strongest pointer / dependency |
|---|---|---|---|
| R9-G1 | **Tracking umbrella; do not execute directly.** Reconstruct or locate exact implementation gates and arithmetic for the `41` UNVERIFIED formulas named by adjacent `PROVENANCE[...]` comments; replace each gap only when the strongest implementation source covers every applicable version and runtime-table constant. | large | `node tools/provenance_audit.js`; strongest pointers are recorded beside each formula |
| R9-G1a | **Blocked by R9-G1g:** close the remaining `8` identity and creation-grant gaps: six `identity:*` formulas and the two independent elemental-protection `lavaSmelter:*` formulas still marked `UNVERIFIED` beside the helpers. | medium | R9-G1a-R1–R3 complete in `HISTORY.md`; legacy conversions depend on R9-G1g; M6 and F54–F55 completed 2026-08-10 |
| R9-G1c | Close the remaining `9` late unit-transform gaps: Military Workshop, Wild Game, Energy Cannon, Nightshade, Dragon Mound, level, weapon, Flame Blade ranged, and Mislead ranged. | medium | F12/F14/F19 own the live ordering/channel dependencies; [R9-G1f](./HISTORY.md) closed the level helper; D33 supplies the checked-in modern weapon formula body |
| R9-G1e | **Blocked by R9-G1g and F5:** close the remaining `3` chance-projection gaps: `chance:weapon:melee`, `chance:weapon:rtb`, and `chance:clamp`. Versions: evidence/builds — MoM 1.31 `WIZARDS.EXE`, MoM CP 1.60 `WIZARDS.EXE`, CoM 6.08 `MAGIC.EXE`, CoM2 1.05.11 `Caster.exe`, Warlord 1.5.12.7 `Caster.exe` plus scripts/runtime tables; calculator — `mom_1.31`, `mom_cp_1.60.00`, `com_6.08`, `com2_1.05.11`, `com2_warlord_1.5.12.7`. | small | `stats.js`, chance transforms; R9-G1e existing-evidence pass in `HISTORY.md`; R9-G1g owns modern material To-Hit evidence and F5 owns the modern two-stage clamp |
| R9-G1g | **Blocked by D30–D32 and their reconstruction follow-ups:** close the `5` remaining direct-helper gaps: the three `weaponBonus:*` cases, `legacyUnitTypeConversions`, and `supernaturalMinimumDamage`. The existing-evidence pass in [HISTORY.md](./HISTORY.md) closed or reclassified the other 11; D33 completed the modern material arithmetic prerequisite. Versions: evidence/builds — MoM 1.31 `WIZARDS.EXE`, MoM CP 1.60 `WIZARDS.EXE`, CoM 6.08 `MAGIC.EXE`, CoM2 1.05.11 `Caster.exe`, Warlord 1.5.12.7 uses that shared `Caster.exe`, plus applicable scripts/runtime tables; calculator — `mom_1.31`, `mom_cp_1.60.00`, `com_6.08`, `com2_1.05.11`, `com2_warlord_1.5.12.7`. | medium | **Method 3**; `combat.js`, direct helpers; [D33 evidence](../Reference%20docs/Caster%20binary/D33.evidence.md) owns modern material arithmetic, D30 owns CoM 1 Supernatural, and D31–D32 own the DOS and modern Raise Dead identity writes |
| R9-G1j | Close the `13` derived-package gaps from `undeadImmunityDerivation` through `bloodLustMeleeAttack`, inclusive. Versions: evidence/builds — MoM 1.31 `WIZARDS.EXE`, MoM CP 1.60 `WIZARDS.EXE`, CoM 6.08 `MAGIC.EXE`, CoM2 1.05.11 `Caster.exe`, Warlord 1.5.12.7 uses that shared `Caster.exe`, plus applicable scripts/runtime tables; calculator — `mom_1.31`, `mom_cp_1.60.00`, `com_6.08`, `com2_1.05.11`, `com2_warlord_1.5.12.7`. | large | **Method 3:** `combat.js`, derived unit/ability packages, focused Node/Playwright regressions, and `SPEC.md` for any behavior change; F22 completed 2026-08-10 |

## Evidence-source prerequisites

| ID | Required source artifact | Cost | Method / evidence |
|---|---|---|---|
| D28 | Reconstruct the MoM 1.31/CP 1.60 routine `[0x8A90D,0x8B30D)` and the version-specific helper at `0x89448` (1.31 `[0x89448,0x89505)`; CP `[0x89448,0x89454)`) to identify the CP-only `0x8AF6B -> 0x89448 -> Check_Wall_Of_Fire_Attack` trigger and determine calculator relevance. Write the source-shaped body to `Reference docs/DOS reconstructed/combat.c` and durable evidence to `Reference docs/DOS reconstructed/D28.evidence.md`. Versions: evidence/builds — MoM 1.31 `WIZARDS.EXE`, MoM CP 1.60 `WIZARDS.EXE`; calculator — `mom_1.31`, `mom_cp_1.60.00`. | large | **Method 4:** [D22 evidence](../Reference%20docs/DOS%20reconstructed/D22.evidence.md) proves the extra CP incoming edge but keeps the containing trigger semantics outside its frozen table extent |
| D30 | Locate and bound the CoM 6.08 `MAGIC.EXE` consumer that applies Supernatural minimum damage, including its exact extent, callers and reachable exits; write durable locate evidence to `Reference docs/DOS reconstructed/D30.evidence.md`, then add a separate fixed-extent reconstruction follow-up that names `Reference docs/DOS reconstructed/combat.c` as its owning source-shaped file. Versions: evidence/builds — CoM 6.08 `MAGIC.EXE`; calculator — `com_6.08`. | medium | **Method 4 locate-and-bound; package `D30_D31_D32`:** the modern formula is complete in `Combat.ApplyAttack.pas`; the CoM 1 `(hits - 5) / 2` implementation exists only in prose/helptext |
| D31 | Locate and bound the CoM 6.08 `MAGIC.EXE` combat-resurrection consumer that turns a Raise Dead result into the unaligned/No-Heal Fantastic identity, including its exact extent, callers and reachable exits; write durable locate evidence to `Reference docs/DOS reconstructed/D31.evidence.md`, then add a separate fixed-extent reconstruction follow-up that names `Reference docs/DOS reconstructed/combat.c` as its owning source-shaped file. Versions: evidence/builds — CoM 6.08 `MAGIC.EXE`; calculator — `com_6.08`. | medium | **Method 4 locate-and-bound; package `D30_D31_D32`:** the CoM 1 recomputation consumer is reconstructed, but the Raise Dead producer/write that makes its gate true is not source-shaped in the repository |
| D32 | Locate and bound the shared modern `Caster.exe` combat-resurrection consumer that turns a Raise Dead result into the unaligned/No-Heal Fantastic identity, including its exact extent, callers and reachable exits; write durable locate evidence to `Reference docs/Caster binary/D32.evidence.md`, then add a separate fixed-extent reconstruction follow-up that names the located routine's owning source-shaped `.pas` file. Versions: evidence/builds — CoM2 1.05.11 `Caster.exe` (also used by Warlord 1.5.12.7); calculator — `com2_1.05.11`, `com2_warlord_1.5.12.7`. | medium | **Method 4 locate-and-bound; package `D30_D31_D32`:** the modern recomputation consumer is reconstructed, but the Raise Dead producer/write that makes its gate true is not source-shaped in the repository |

## Confirmed and suspected defects

| ID | Upcoming task | Cost | Evidence / dependency |
|---|---|---|---|
| F5 | Put common and channel To Hit/To Block writes in the transform record, implement the modern two-stage clamp, and close `PROVENANCE[clamp]`. | large | CoM2 units, region `e` and sequential-transform audit |
| F6 | First reconstruct `Apply_Chaos_Channels` for MoM 1.31, MoM CP 1.60 and CoM 1, then implement the remaining DOS Chaos Channels shared-slot gaze-and-breath behavior for calculator `mom_1.31`, `mom_cp_1.60.00` and `com_6.08`. | medium | **Reconstruction uses method 4:** `WIZARDS.EXE` overlay 129 entry 7, `[0xA4DEF,0xA4EEE)` (255 bytes, one external call); B9 bounded the three mutation writes in `DOS reconstructed/B9.evidence.md`; MoM analysis, Chaos Channels; `stats.js:436-441` |
| F9 | Model Marionette's Channeler transformation, bonuses, spell package, and live-Fantastic Xenoveterinary eligibility. | medium | discrepancies, script checks without a calculator discrepancy |
| F12 | Move Destiny to the end of permanent `base` writes and make later channel transformations ordinary ordered steps, including Focus Magic conversion and Shadow Strike's creation/boost of Thrown. | medium | CoM2 units, Destiny; `CreateUnit.CAS:695,703`; current preset regressions |
| F13 | Move Upgraded Explosive's Fire Breath doubling to its early `UnitCalcPre` position and test a later bonus escaping it. | small | CoM2 units, Warlord region `b` |
| F14 | Move Misfortune/Mislead to aura type 10 in region `e`, preserving eligibility gates. | small | CoM2 units, aura pass |
| F15 | Put Holy Armor at its exact region-`c` position so its `Defense > 5` test cannot see later effects. | medium | CoM2 units, unit-enchantment effects |
| F17 | Finish Warlord Vampirism by aggregating simultaneous Thrown/Fire/Lightning source channels, resetting each positive source independently, and moving the transfer to its region-`d` position. | medium | `UnitCalc.CAS:1245-1258`; R9-G1b corrected the represented-channel half transfer |
| F18 | Split Mind Storm, Tactician, True Light, node aura, and combat Flame Blade writes onto their actual channels/positions; close `PROVENANCE[nodeAura]`. | medium | CoM2 units, calculator-facing discrepancies and aura pass |
| F19 | Add controls/transforms for the calculator-relevant compiled effects identified as absent by the sequential-transform audit, including Lightning Blade's created Breath and Military Workshop/Rocketry channel behavior. | large | CoM2 units, sequential-transform audit; current preset regressions |
| F20 | **Blocked by F12–F19:** make the represented `b`/`c`/`d` step lists source-order exhaustive and atomic; add a complete trace-order assertion. | medium | CoM2 units, phase and region maps |
| F21 | Load modern roster `to_block` into the card with one consistent absolute/delta encoding; add non-default controls. | small | generators vs `ui.js`; MoM analysis, constructor |
| F23 | Preserve intrinsic/base Death Immunity separately for modern Cause Fear's direct skip. | small | CoM2 combat, ApplyAttack setup |
| F24 | Replace unit-owned modern Blur with per-side combat-global inputs and reproduce turn-relative `CGADEnemy` selection. | medium | CoM2 combat, ApplyAttack; call-closure evidence |
| F25 | Prevent modern touch riders from firing with gaze attack types 6–8. | medium | CoM2 combat, ApplyAttack riders |
| F26 | Roll modern Destruction once per surviving attacking figure. | small | CoM2 combat, ApplyAttack riders |
| F27 | Trigger Warlord Bloodsucker after all result categories and route configured healing through non-overheal `Combatheal`. | medium | CoM2 combat and CoM2 damage |
| F28 | Keep Life Steal's uncapped roll distribution separate from target damage and route healing through `Combatheal`. | medium | CoM2 combat and CoM2 damage |
| F29 | Reorder modern melee phases to Wall of Fire → attacker gazes → defender gazes → Lightning → Fire → Thrown → melee. | large | CoM2 combat, attack dispatch |
| F30 | Repeat initiating modern gazes under Haste while leaving retaliation gazes/counterattack single. | medium | CoM2 combat, attack dispatch |
| F31 | Give each Hasted modern melee `ApplyAttack` call an independent Cause Fear sample. | medium | CoM2 combat, attack dispatch |
| F32 | Split modern Defense dice into pre-cap and capped-To-Defend binomials. | medium | CoM2 resolution, roll helpers; CoM2 tables |
| F33 | Exempt modern heroes from ranged distance penalties and retain the separate magical-ranged rule. | small | CoM2 resolution, ranged penalty |
| F34 | Remove Bless Defense from modern unit-attack profiles; retain it only for qualifying positive-ID Chaos/Death spells. | small | CoM2 resolution and CoM2 combat |
| F35 | Remove the wounded-top remaining-HP cap from modern area-spell subattacks. | small | CoM2 spells, DamageSpell |
| F36 | Implement Warlord Wall of Fire's repeated non-area spill distribution and `ApplyDamageSpell` category adjustment. | medium | CoM2 spells; R5.2g/j/m evidence |
| F37 | Short-circuit modern magical spell damage on Magic Immunity when the spell is not `Nonmagic`. | small | CoM2 spells, DamageSpell |
| F38 | Apply modern Black Sleep's Doom conversion to DamageSpell-shaped Immolation/Wall of Fire after the immunity exit. | small | CoM2 spells, DamageSpell |
| F39 | Add Chaos Conjunction combat state and apply `Trunc(str × 1.34)` to modern Immolation only. | medium | CoM2 spells, direct spell damage |
| F40 | Exclude calculated Teleporting/Merging attackers from modern Wall of Fire and expose Merging in the roster/card. | small | CoM2 spells; R5.2g/k evidence |
| F41 | Add engine-specific hero progression: the DOS eight-threshold ladders and template-ability formulas (including CoM's Blademaster divisors, mana table and Lucky rewrite), plus the modern nine-step hero table. Decide how the current six-entry level control exposes them. | large | R6.1f evidence, hero ladders and abilities; CoM2 tables, level bonuses; `combat.js:39-74` |
| F42 | Stop a Level change from overwriting hand-edited stats on a custom unit: `resetCardToRosterBase` fires on every Level change and rewrites the card from a stale roster record even when the unit selector is "custom" and the fields are unlocked. | small | found during R7.1; `ui.js` Level change handlers and `unitBaseStats` lifetime |
| F43 | Determine whether CoM 1's retained `0x800` flag makes Dispel Evil live despite the roster naming Exorcise instead. | small | MoM analysis, touch-effect table and *Dispel Evil*; `data.js:71,72` |
| F49 | Add a CoM 1 Heavenly Light active-effect control and transform for defending units: +1 positive melee/ranged, +1 Defense and Resistance, conditional weapon To Hit, and minimum magic-weapon quality. Add focused tests and state that the user enables it only for a defender in city combat. | small | R6.1c evidence, *The CoM 1 city-defense bytes are Guardian and Heavenly Light*; currently absent from `data.js` and `combat.js` |
| F50 | Add CoM 1 side-maximum controls/transforms for Guiding Beacon, Divine Barrier and Soul Linker. Preserve the ranged-type/Fantastic gates and Soul Linker's `ceil(v/2)` To Hit versus `floor(v/2)` To Block split. | medium | R6.1d evidence, *CoM 1's relocated tail consumes three side-wide hero maxima*; absent from `data.js`/stat steps |
| F51 | Add a CoM 1 Realm Ward city-enchantment input and transform: a matching Nature/Sorcery/Chaos/Life/Death Fantastic unit loses 20% To Hit, 3 Defense and 3 Resistance. | small | R6.1d evidence, *CoM 1 Realm Wards use −2/−3/−3*; absent from `data.js`/stat steps; Q19 tracks the prose conflict but does not block the binary-backed implementation |
| F53 | Use signed truncate-toward-zero division for CoM 1 Warped Defense instead of `Math.floor`; negative pre-Warp Defense can receive later Supreme Light/Tactician writes before the terminal clamp. Close `PROVENANCE[warpDefense]`. | small | R6.1d evidence, *Warp Creature and Shatter expose both arithmetic and ordering differences*; `stats.js:1428-1431` |
| F56 | Stop applying a conventional Ranged level bonus to modern Stoning and Death Gaze. CoM2/Warlord `ApplyLevelBonus` writes none of the three independent gaze fields; Doom Gaze is already unmodified. Add focused CoM2/Warlord regressions. | small | `Caster binary/D21.evidence.md`; current `getLevelBonuses` ordinary-gaze mapping |

## Modelling work

Accepted limitations remain in `SPEC.md`; only planned changes appear here.

| ID | Upcoming task |
|---|---|
| M3 | **Blocked by F41:** implement the older-engine Destruction path, including elemental protection. Present in all three DOS builds but hero-only, so it stays unreachable until heroes are modelled; 1.31 adds the defender's per-figure hits where CoM 1 adds a flat 100. |
| M7 | **Blocked by R9-G1a, R9-G1j and F20:** enforce [SPEC.md](./SPEC.md)'s transitional-helper retirement rule across derivation and combat normalization. Audit for helpers that compose ordered engine effects outside the phase-tagged records; replace each finding with atomic source-ordered steps, beginning with `determineEffectiveUnitType` and its second type rewrite in `normalizeCombatUnit`. Retain `unitType` only as a pure projection for legacy callers, then add a structural regression that prevents effect rules from returning to compatibility projections. |

## Open questions

| ID | Question / next action | Evidence / blocker |
|---|---|---|
| Q1 | Resolve Troll Shaman/Magician roster values versus the manual, including the possible Troll +1 melee rule. | roster/manual conflict |
| Q2 | Confirm the apparent Draconian common-unit +1 Resistance racial modifier. | roster/manual conflict |
| Q5 | **Blocked:** identify the source and page behind “weird defense behavior on page 25.” | Missing source |
| Q6 | Resolve CoM High Prayer's +3-attack text versus the +2 used elsewhere. | prose conflict |
| Q8 | Determine whether Wraiths use Life Steal −4 or −3. | observation/manual conflict |
| Q12 | Determine when “ranged” includes missile, boulder, magical, Thrown, breath, or gaze across versions/effects. | Asked; awaiting answer |
| Q15 | Check whether compiled code ever consumes `unitT.savemodifier`. | CoM2 units, `unitT` fields; R4 |
| Q17 | Resolve CoM 1 FocusMagic's `ammo > 0` gate against helptext that promises the ranged attack unconditionally; the answer also decides whether the signed `base_rt` fallback is reachable in play. | R6.1a evidence, *Open questions* |
| Q18 | Determine what CoM 1's Holy Arms unit-type ceiling of `0x97` selects, given that the helptext says "normal unit" but the ceiling appears to admit four fantastic summons. | R6.1a evidence, *Open questions* |
| Q19 | Resolve CoM 1 Realm Ward helptext's −2 To Hit/−4 Defense/−4 Resistance against the executed `0x90A87..0x90A9B` writes of −2/−3/−3. | R6.1d evidence, *CoM 1 Realm Wards use −2/−3/−3* |
| Q20 | Identify the CoM 1 `Move_Flags 0x0100` bit set by Supreme Light and verify whether its read path implements the helptext's post-combat regeneration. | R6.1d evidence, *CoM 1 Supreme Light has five eligibility paths* |
| Q21 | Resolve CoM 1 helptext's retained Endurance/Giant Strength powers against the manual's Teleportation/Inner Fire/Divine Protection replacements; the executed binary effects match the manual's replacement package. | prose conflict; R6.1e evidence, *Later builds turn the item block into a patch surface* |
| Q23 | Resolve CoM Logistics scaling: shipped helptext says +0.5 movement per two experience levels, while the manual says +0.5 per level. `Battle_Unit_Moves2` consumes the per-controller maximum at `DS:0x3AC8` but does not calculate it. | R6.1g evidence, *CoM `Battle_Unit_Moves2`*; prose conflict |
| Q25 | Resolve the R6.1h shared-source rendering disagreement at `0x8E5C6: 25 00 01`. Claude: the statement-level `#if` is “a naming branch only” and may use `IP_COM1_DIVINE_PROTECTION` versus `IP_POWER_DRAIN`. Codex: a statement-level `#if` “visually asserts a source/control-flow divergence” absent from the identical bytes, so one statement plus a build-selected alias is preferable. The merged C uses the alias form and the mechanic is undisputed. | R6.1h evidence, *Disputed source representation* |
| Q26 | Resolve the R9-G1a-R3 evidence-scope disagreement. Codex: “Retain only raw `[0x2AED2,0x2AED4)` (`81 00`) for the target value” and cite checked-in mapping/name evidence. Claude: “Restricting the read to the two target bytes is exactly the position that produced the wrong record base”, so the target's neighbouring name-pointer rows, table origin, ability-mask bounds and selected strings are the minimum locate evidence. The base, target address/value and constructor linkage are undisputed. | R9-G1a-R3 evidence, *Disputed evidence scope*; data D1–D8 |

## Blocked on people

| ID | Needed answer |
|---|---|
