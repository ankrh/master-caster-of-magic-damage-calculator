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
| 1 | **R6.1a** | Reconstruct `BU_Apply_Specials` across all three DOS builds at once. |
| 2 | **A31** | Decode MoM's six remaining level-bonus increments. |
| 3 | **F7** | Replace the known-wrong Supernatural approximation when the deferral is lifted. |
| 4 | **B4, B7, B9** | Verify foundational DOS damage and rider behavior. |
| 5 | **D2, D18** | Audit modern Weapon Immunity mapping and Warlord touch-flag placement. |
| 6 | **F3–F6, F9, F12–F43** | Implement confirmed defects, respecting dependencies below. |
| 7 | **R7.3, R7.4** | Finish the tiered modifier display; both wait on Q16. |

## Structural and reconstruction work

| ID | Task | State | Cost | Evidence / dependency |
|---|---|---|---|---|
| R3 | Replace CoM2/Warlord's lossy single-`rtb` resolver projection. Closes after R3.1–R3.4; keep the DOS shared slot unchanged. | done 2026-08-03 | large | CoM2 units, record layout and sequential-transform audit; closes M5 |
| R3.3 | Make modern combat resolution select and consume the independent channels, including coexistence of attacks; preserve DOS resolution unchanged. | done 2026-08-03 | medium | CoM2 combat flow; F25, F29, and F30 remain separate behavior work |
| R3.4 | Remove the modern lossy projection, update migration/regression coverage, and verify multi-channel roster units load and resolve without dropping an attack. | done 2026-08-03 | small–medium | closes R3 and M5; unblocks F12, F17, F18, F20, and R4 |
| R4 | Make the unit card and roster boundary version-shaped. Closes after R4.1–R4.3. | done 2026-08-03 | medium–large | MoM analysis, record anchors; CoM2 units, `unitT` fields; Q15 and D21 remain inputs |
| R4.1 | Split the card and roster boundary by engine shape: modern named channels versus the DOS shared special-value presentation. | done 2026-08-03 | medium | card fields, roster binding, persistence, and roster smoke coverage; gaze/touch deferred to R4.2 |
| R4.2 | Add the modern binary-shaped gaze save modifiers, touch values, and To Defend fields with version gating and roster binding. | done 2026-08-03 | medium | modern card fields, roster binding, persistence, and roster smoke coverage; D21 still informs gaze level presentation |
| R4.3 | Remove the synthetic hidden-gaze input; finalize version gating, presets, and UI regression coverage for the shaped cards. | done 2026-08-03 | small–medium | DOS gazes now use their shared strength/type slot; closes R4 |
| R6.0 | Make the derivation checker work on the DOS builds. | done 2026-08-04 | medium | `tools/verify_dos_derivation.py`, plus `Reference docs/DOS reconstructed/README.md` for the artifact conventions. No overlay mapping was needed — the DOS docs cite raw file offsets. Verified against `Has_Ranged_Attack` with four fixtures: full citation, none, one withheld, and a ledger hole. Exposed R9 |
| R6.1a | `BU_Apply_Specials`, `0x8F310`–`0x8F880`. Same entry address in all three builds. | ready | medium | 460 instr, 0 calls, 38 branches |
| R6.1b | Battle-unit constructor, `0x8EDFD`–`0x8F30F`. | open | medium | 437 instr, 5 calls |
| R6.1c | Stat recompute, first half of `0x8FF09`–`0x90B8D`. | open | medium | 1059 instr over the whole routine; boundary fixed at scoping |
| R6.1d | Stat recompute, second half. Carries A31's six level-bonus sites and A33's `0x90A87`. | open | medium | same routine; A31, A33 |
| R6.1e | Constructor callees `0x8DBD0` and `0x8E668`. | open | medium | ~598 instr; extents provisional |
| R6.1f | Recompute/constructor callees `0x8F881` and `0x8FB42`, plus the hit-point routine at `0x8E850`. | open | medium | ~605 instr + HP routine; extents provisional |
| R6.2a | `BU_AttackTarget`, `0x99292`–`0x999C8`. | open | medium | 772 instr, 13 calls |
| R6.2b | `BU_ProcessAttack`, first half of `0x999C9`–`0x9A586`. | open | medium | 1119 instr over the whole routine; boundary fixed at scoping. CP 1.60 changes only 192 of its 3,006 bytes |
| R6.2c | `BU_ProcessAttack`, second half. Carries B4's rollover and fresh Defense rolls, and B7's touch dispatch. | open | medium | same routine; B4, B7 |
| R6.2d | `BU_ProcessAttack` small helpers `0x98F60`, `0x98F9D`, `0x98FCB`, `0x99150`, `0x9A79E`, `0x9BB3E`, plus `Distance` and `Has_Ranged_Attack`. | open | medium | ~471 instr; extents provisional |
| R6.2e | `0x9A587` and `Check_Wall_Of_Fire_Attack` (ends `retf` at `0x9EE84`). | open | medium | ~195 instr + wall check; start address unlocated |
| R6.3 | Cross-build consistency pass: reconcile the per-item diff tables into one version-difference index, and confirm no first- or second-level callee was left unlocated. | blocked on R6.1a–R6.2e | medium | the one thing not checkable per item |
| R9 | Fix the Delphi checker's gap-hiding bug and re-check R5. A ledger now splits on row-number restart only, so an address discontinuity inside one ledger is reported as the gap it is instead of being reclassified as two adjacent extents. **All 19 R5 artifacts re-checked clean** — 894 conditional jumps, 224 calls and 910 named-field writes accounted, no gaps, no parent mismatches — and the grouping is byte-identical under both rules, so the bug was latent on this corpus and no R5 finding is affected. Regeneration was therefore unnecessary: the ledgers live in the merged evidence docs, and `.derivations/` is ephemeral scratch by design. | done 2026-08-04 | small | `tools/verify_derivation.py:85`. Verified both directions: a fixture with a deleted ledger row is now caught (`5B2DC8..5B2E6F`) where the old rule reported nothing |
| R7 | Present unit-card stats as an unmodified base plus tiered modifier values, imitating the game's plain/gold stat display. Closes after R7.1–R7.4. | open | medium | D22; Q16 |
| R7.1 | Rename `applyLevelBonuses` and its call sites to state what they do — reset the card fields to roster base — and assert no path writes level into the card. | done 2026-08-03 | free–small | renamed `resetCardToRosterBase`; pre-level invariant verified in-browser; SPEC UI contract |
| R7.2 | Regroup the card into "Base stats and abilities" and "Enchantments and conditions", with Level, Weapon and Armor in the lower group. | done 2026-08-03 | small–medium | `ABIL_GROUP_HEADINGS`, loadout relocated in `buildAbilitiesUI`; SPEC UI contract |
| R7.3 | Derive the engine's plain-versus-gold display rule and assign every modifier source a tier. | blocked on Q16 | medium | D22; CoM2 units |
| R7.4 | Replace the single effective-value column with separate silver and gold modifier values, keeping numeric presentation rather than icon pips. | blocked on R7.3 | medium | `ui.js:651`, `stats.js:1798`, `style.css:291`; SPEC UI contract |
| R8 | Represent the DOS `Spec_Att_Attrib` byte as one shared card value with per-consumer flags, replacing the eleven independent ability numbers. Closes after R8.1–R8.5. | done 2026-08-04 | large | MoM analysis, *Touch-effect immunities* and *Holy Bonus and Resistance to All are per-player maxima*; extends the gaze-only shaping R4.3 stopped at |
| R8.1 | Emit the DOS record's `spec_att_attrib` byte from the roster generator and drop the fabricated magnitude-1 fallback; regenerate `units_mom.js` and `units_com.js`. | done 2026-08-04 | medium | `tools/parse_tweaker_unit_data.py`; the source has one `Gaze/Poison` column and only Chaos Spawn consumes it twice, so the halt condition could not trigger |
| R8.2 | Build the DOS card block under the shared strength/type slot — one magnitude input plus the consumer checkboxes — mirroring the ability rows the way `buildModernSpecialCard` does. Dispel Evil and Destruction sit apart at the bottom of the base card, since their modifiers are literals rather than the shared byte. | done 2026-08-04 | medium | `buildDosSpecialCard`; SPEC, DOS card presentation; presentation only — consumer reads still take the per-effect ability values until R8.3 |
| R8.3 | Gate each DOS consumer's read on its own flag so the shared magnitude reaches only selected consumers, and keep provided-versus-received Holy Bonus / Res. to All maxing where it already happens. Destruction and Dispel Evil are flags only — their modifiers are literals, so they must not read the byte. | done 2026-08-04 | medium | `dosSpecialValues`; MoM analysis, provider/aggregation/consumption stages and touch-effect table |
| R8.4 | Derive DOS gaze realm and Doom Gaze strength from `ranged_type` rather than from ability flags, and retire the DOS gaze ability controls. | done 2026-08-04 | small–medium | `dosSpecialValues`, `stats.js` gaze strength; MoM analysis, realm classifier. Fixed a type-104 double-count introduced by R4.3 and re-shaped 22 gaze presets to representable units |
| R8.5 | Retire the per-effect `Name=value` ability entries from the DOS rosters now that every consumer reads `spec_att_attrib`, then re-run the preset suite. | done 2026-08-04 | small–medium | consumers now emit bare flag tokens and gaze tokens are gone entirely; `applyUnit` seeds the card magnitude from the record rather than from ability values. 927/927 presets pass; exposed F45 |

R8 left modern untouched: `Caster.exe` carries independent fields, which is why Warlord's Chaos
Spawn drops Stoning Gaze while keeping Death Gaze.

**Every R6 item covers all three DOS builds at once**, not one build each. The builds are one
lineage — 1.31, the community patch, then CoM 1 on top — so homologous code is read once and
diffed rather than derived three times and reconciled afterwards. The version differences *are*
the deliverable for A31, A32, A33, B1 and C1, and `MoM binary analysis.md` already records its
findings that way. Size each item against 1.31 as the primary and derive CP 1.60 and CoM 1 as
diffs against it; where a build diverges structurally, that region becomes its own item rather
than bloating a joint one. CoM 1's table-rewritten level-bonus routine is the known case.

**Artifacts are C, not Pascal.** `WIZARDS.EXE` is Borland C++ 1991 (see `tools/scan_mom_binary.py`),
where `Caster.exe` is Delphi — so `Reference docs/DOS reconstructed/` holds `.c` files, and the
`.pas` convention under `Caster binary/` does not carry over. Matching ReMoM's language and
`MOM_DAT.h` struct names keeps the two directly comparable, which matters because ReMoM is the
orientation source we most need to check against.

Instruction counts above are measured, not estimated (`capstone`, 16-bit). The located core is
~4,119 instructions per build and the eleven first-level callees add ~1,790; second-level
callees are not yet enumerated, so the surface will grow. Every call target found so far is
near/direct, so the call graph is statically walkable. Extents marked *provisional* were sized by
scanning to the first `retf` and must be confirmed when the item is scoped.

**R6 runs in dual-derivation mode throughout** — AKH's standing instruction, 2026-08-04, on the
grounds that the work is too difficult to trust a single pass. Both agents derive every item
independently before any review; see `DERIVATION-REVIEW-PROTOCOL.md`. Review is per item, as that
protocol's merge gate describes; there is no end-of-R6 review gate, which would have put the first
feedback after six large reconstructions.

R6 closes after R6.1a–R6.2e and R6.3. A material post-review change requires the affected
reviewer to re-check it.

## Confirmed and suspected defects

| ID | Upcoming task | State | Cost | Evidence |
|---|---|---|---|---|
| F3 | Derive Golem's intrinsic Resist Elements in both modern roster generators and add Golem/non-Golem controls. | open | small | CoM2 units, region `a` |
| F4 | Classify the Chosen as engine-Fantastic for all downstream gates without losing hero behavior. | open | medium | CoM2 units, unit-enchantment effects |
| F5 | Put common and channel To Hit/To Block writes in the transform record and implement the modern two-stage clamp. | open | large | CoM2 units, region `e` and sequential-transform audit |
| F6 | Trace Chaos Channels Fire Breath eligibility/coexistence, then make CoM2/Warlord representation and arithmetic match the reachable engine state. F48 settled the modern half — CC adds, never removes, and CoM2 and Warlord behave identically — so what remains is DOS: MoM leaves a gaze *and* a breath both firing from the one shared slot at the overwritten strength (2+2+1 = 5 where the slot holds one attack). | open | medium | CoM2 units, region `a`; CoM2 tables, Chaos Channels; `stats.js:436-441` |
| F7 | Replace `Math.round(hits/3)` with the moddable Supernatural formula using Delphi banker's rounding; update affected presets. | deferred | small | CoM2 combat, ApplyAttack; CoM2 tables, Supernatural minimum damage |
| F9 | Model Marionette's Channeler transformation, bonuses, spell package, and live-Fantastic Xenoveterinary eligibility. | open | medium | discrepancies, script checks without a calculator discrepancy |
| F12 | After R3, move Destiny to the end of permanent `base` writes and make later channel transformations ordinary ordered steps, including Focus Magic conversion and Shadow Strike's creation/boost of Thrown. | blocked on R3 | medium | CoM2 units, Destiny; `CreateUnit.CAS:695,703`; current preset regressions |
| F13 | Move Upgraded Explosive's Fire Breath doubling to its early `UnitCalcPre` position and test a later bonus escaping it. | open | small | CoM2 units, Warlord region `b` |
| F14 | Move Misfortune/Mislead to aura type 10 in region `e`, preserving eligibility gates. | open | small | CoM2 units, aura pass |
| F15 | Put Holy Armor at its exact region-`c` position so its `Defense > 5` test cannot see later effects. | open | medium | CoM2 units, unit-enchantment effects |
| F16 | Compute Charm of Life from live HP at its engine position after earlier HP writers. | open | small | CoM2 units, global enchantments/events |
| F17 | After R3, implement Warlord Vampirism's script formula and source-channel resets at its region-`d` position. | blocked on R3 | medium | `UnitCalc.CAS:1245-1258`; CoM2 units |
| F18 | After R3, split Mind Storm, Tactician, True Light, node aura, and combat Flame Blade writes onto their actual channels/positions. | blocked on R3 | medium | CoM2 units, calculator-facing discrepancies and aura pass |
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
| F41 | Add the modern nine-step hero level ladder and decide how the current six-entry level control exposes it. | open | medium | CoM2 tables, level bonuses |
| F42 | Stop a Level change from overwriting hand-edited stats on a custom unit: `resetCardToRosterBase` fires on every Level change and rewrites the card from a stale roster record even when the unit selector is "custom" and the fields are unlocked. | open | small | found during R7.1; `ui.js` Level change handlers and `unitBaseStats` lifetime |
| F43 | Decide whether Dispel Evil should also be gated. Exorcise is now hidden in the MoM versions and Destruction is explicitly ungated, but Dispel Evil still shows everywhere: MoM's roster names it, CoM 1's roster names Exorcise instead, yet the `0x800` flag and its literal −4 are byte-identical at `0x99F72` in both — so it may be live in CoM 1 with no roster user. | open | small | MoM analysis, touch-effect table and *Dispel Evil*; `data.js:71,72` |
| F48 | Remove the fabricated CoM2 Chaos Channels overwrite. No source has CC removing any attack: `Caster.exe` `$00599EE8`–`$00599FA8` writes only `firebreath += 4`, `race := RCChaos` and `Fantastic`; Warlord's `UnitCalc.CAS:40` touches only `SFireBreath`; the CoM2 manual says CC "can still **add** Fire Breath to units that have Thrown, Gaze or Lightning Breath"; `MODDING.INI`'s `CCRangedFBAllowed` is worded "can add" and gates **ranged** only. Deleted `ccCanOverwriteSpecial`/`gazeOverwrittenByCC`, gave the grant its own channel so it stops overwriting whichever channel is being derived, and corrected the tooltip. Also removed the invented CoM2-replaces / Warlord-stacks split: `$00599F3E` is one `add` routine serving both, so `ccFireBreathStacksWarlord` is gone and both versions add. | done 2026-08-04 | small | `stats.js:429-448,480,1112,1859`; `data.js:149`. Overwriting and assignment are DOS shared-slot artifacts, so the DOS gates are unchanged |
| F45 | Fix the `Resistance to All` roster token, which had never matched its ability def in any version: normalization strips spaces without folding case, so the roster's token became `ResistancetoAll` while `match` was `ResistanceToAll`. Corrected both defs to the exact normalized token rather than folding case, which would have been a blanket rule for a single token. | done 2026-08-04 | small | `data.js:70,126`. An exhaustive sweep of all four rosters against every def confirms no case-only mismatch remains. Exposed F46 and corrected `predefChaosSpawnVsUnicorns` |
| F46 | Give the DOS rosters' `Illusionary attack` token a match, which it had never had — the modern generators emit `Illusion` but the DOS generator kept the source spelling, so MoM and CoM Phantom Warriors, Phantom Beast and the Illusionist silently lacked the ability. Renamed to `Illusion` in `TOKEN_RENAMES` and dropped from `EXPLICIT_KEEP`, which had been suppressing it from the generator's own unmatched-token report. | done 2026-08-04 | small | `tools/parse_tweaker_unit_data.py`. No preset expectation moved because **no preset exercises these six units** — verified manually instead: MoM 1.31 Phantom Warriors vs Paladins goes 1.129 → 5.400. See F47 |
| F47 | Add roster-wiring coverage for the DOS Illusion units, which nothing tested — the mechanic worked and only the roster token was broken, so a custom-stat preset would have passed either way. Added `predefPhantomWarriorsVsPaladins` (MoM 1.31) and `predefPhantomWarriorsVsGreatDrakeCoM` under a new *Roster ability wiring* subgroup. The feared calculator-derived expectation did not materialise: Illusion zeroes the defender's defense, so the mean is exactly figures x melee x to-hit — 6x3x0.30 = 5.400 and 7x3x0.30 = 6.300 — independent of defender stats. | done 2026-08-04 | small | reinjecting the F46 bug fails both, and only both, at the predicted 1.129 and 0.321 |
| F44 | Re-verify the two modern-gaze preset expectations R4.3/R4.2 moved without a recorded reason. **`spiritLinkResistanceWarlord` 6.120 → 6.000 was correct**: effRes 5+2−3 = 4, pFail 0.6, one 10 HP figure → 6.000, and the old 6.120's extra 0.12 was a hidden gaze component SPEC scopes to MoM only. Derivation now recorded in the preset; the vestigial DOS `rtbType`/`rtb` were dropped. **`ccFireBreathReplacesGazeCoM2` 5.000 → 1.000 was not** — but neither was the 5.000: both encoded a CC-overwrites-gaze rule that no source supports (F48). Replaced by `ccFireBreathCoexistsWithGazeCoM2` at 5.000 = melee 1 + breath 4 with the gaze intact, and `ccFireBreathReplacesLightningCoM2` re-derived to `ccFireBreathCoexistsWithLightningCoM2` at 10.000 = melee 1 + lightning 5 + fire 4. | done 2026-08-04 | small | SPEC, *Gaze attacks*; F48's source stack |

## Engine verification

Detailed dossiers live in **verification evidence**. This table states only the remaining read.

| ID | Upcoming verification | Cost |
|---|---|---|
| A31 | Decode MoM's six level-bonus increment sites. | small |
| A32 | Decode CP 1.60's two post-Shatter edits and CoM 1's Shatter eligibility gate. | small |
| A33 | Identify the CoM 1 per-realm global debuff at `0x90A87`. | medium |
| B1 | Establish the To-Hit ceiling and non-1.31 floor behavior. | small |
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
| Q3 | Decide whether Warp Reality can reach 0% To Hit and whether the answer varies by version. | open, asked | B1 |
| Q4 | Settle DOS Chaos Spawn poison-touch delivery; modern gazes are already excluded. | open, partial | B7, D18, F25 |
| Q5 | Identify the source and page behind “weird defense behavior on page 25.” | blocked on missing source | — |
| Q6 | Resolve CoM High Prayer's +3-attack text versus the +2 used elsewhere. | open | prose conflict |
| Q8 | Determine whether Wraiths use Life Steal −4 or −3. | open | observation/manual conflict |
| Q11 | Verify whether DOS Animate Dead grants +ranged; modern Animated does. | open, partial | C1; CoM2 units |
| Q12 | Determine when “ranged” includes missile, boulder, magical, Thrown, breath, or gaze across versions/effects. | open, asked | — |
| Q15 | Check whether compiled code ever consumes `unitT.savemodifier`. | open | CoM2 units, `unitT` fields; R4 |
| Q16 | Determine what makes CoM2 draw a stat bonus as a plain icon rather than a gold one, and classify every modifier source. | open, partial | D22; R7.3 |

## Blocked on people

| ID | Needed answer |
|---|---|
| X1 | Maintainer response to the compiled CoM2-manual-vs-`UNITS.INI` discrepancy list. |
| X2 | Whether CoM2 prose “+X attack” means melee only. |
| X3 | Which attack channels CoM2 prose “+X ranged” includes. |
| X4 | Whether Seravy's newer Defense formulas apply to current CoM or CoM2. |
| X5 | Whether Sky Drake should have Negate First Strike despite the manual omission. |
| X6 | Whether “regular units” excludes heroes despite Warlord's script gate allowing them. |
