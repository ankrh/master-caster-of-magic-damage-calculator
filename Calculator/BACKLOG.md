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

## Priority

| # | Items | Next outcome |
|---|---|---|
| 1 | **R9-G1a–R9-G1k** | Reconstruct or locate the implementation lines still missing from the stat-formula provenance audit, one fixed formula domain at a time. |
| 2 | **F7** | Replace the known-wrong Supernatural approximation when the deferral is lifted. |
| 3 | **B4, B7, B9** | Verify foundational DOS damage and rider behavior. |
| 4 | **D2, D18** | Audit modern Weapon Immunity mapping and Warlord touch-flag placement. |
| 5 | **F5–F6, F9, F12–F43** | Implement confirmed defects, respecting dependencies below. |
| 6 | **F49** | Add the confirmed CoM 1 Heavenly Light effect when higher-priority work is complete. |

## Provenance evidence gaps

R9-G1 is the non-executable tracking umbrella for R9-G1a–R9-G1k. Its live total remains the
audit reconciliation point; each implementation child owns the fixed formula domain stated below.
R9-G1a–R9-G1k must be undertaken in **dual-agent implementation mode** under
[`DERIVATION-REVIEW-PROTOCOL.md`](../DERIVATION-REVIEW-PROTOCOL.md): two cold implementations,
reciprocal review, and final integration. Dedicated reconstruction dependencies instead use the
mode stated on their own rows and the protocol's derivation rules.

| ID | Evidence gap / fixed formula domain | Cost | Mode | Strongest pointer / dependency |
|---|---|---|---|---|
| R9-G1 | **Tracking umbrella; do not execute directly.** Reconstruct or locate exact implementation gates and arithmetic for the `165` UNVERIFIED formulas named by adjacent `PROVENANCE[...]` comments; replace each gap only when the strongest implementation source covers every applicable version and runtime-table constant. | large | Tracking only | `node tools/provenance_audit.js`; strongest pointers are recorded beside each formula |
| R9-G1a | Close the remaining `8` identity and creation-grant gaps: six `identity:*` formulas and the two compressed elemental-protection `lavaSmelter:*` formulas still marked `UNVERIFIED` beside the helpers. | medium | **Dual-agent implementation** | R9-G1a-R1–R3 complete in `HISTORY.md`; legacy conversions depend on R9-G1g; elemental grants depend on M6 |
| R9-G1b | Close the `6` base/permanent-transform gaps: `destiny`, `chaosChannels:fireBreath`, `lightningBlade:breath`, `focusMagic:conversion`, `vampirism:transfer`, and `shadowStrike:thrown`. | medium | **Dual-agent implementation** | `stats.js`, base/permanent transform sequence; adjacent strongest pointers |
| R9-G1c | Close the `29` late unit-transform gaps from `stat:base` through `giantStrength:thrown`, inclusive, in the ordered stat-step sequence. | large | **Dual-agent implementation** | `stats.js`, late stat transforms; adjacent strongest pointers |
| R9-G1d | Close the `14` non-chance tail gaps: the twelve formulas from `nodeAura` through `clamp`, inclusive, plus `altarOfTheSun:figures` and `alumniOfAcademy:figures`. | medium | **Dual-agent implementation** | `stats.js`, late/global and figure transforms; adjacent strongest pointers |
| R9-G1e | Close all `27` `chance:*` provenance gaps in the chance-contribution and projection sequence. | large | **Dual-agent implementation** | `stats.js`, chance transforms; adjacent strongest pointers |
| R9-G1f | Close the `16` level-dispatch gaps: `levelBonusDispatch` and all fifteen `levelBonuses:*` formulas. | medium | **Dual-agent implementation** | `combat.js`, `getLevelBonuses`; DOS reconstruction, Caster implementation and current runtime tables |
| R9-G1g | Close the `16` remaining direct-helper gaps from `clampPct` through `distancePenalty`, excluding the level-dispatch formulas owned by R9-G1f. | large | **Dual-agent implementation** | `combat.js`, direct helpers; `supernaturalMinimumDamage` depends on F7 and `supremeLightEligibility` depends on F52 |
| R9-G1h | Close the `20` ability-stat-modifier gaps from `holyBonus` through `disheartenProphecy`, inclusive. | large | **Dual-agent implementation** | `combat.js`, `getAbilityStatSteps`; adjacent strongest pointers |
| R9-G1i | Close the `8` effective-attack, defense and damage-constant gaps from `rageEffectiveAttack` through `wallOfFireStrength`, inclusive. | medium | **Dual-agent implementation** | `combat.js`, attack/defense helpers; DOS and Caster combat reconstructions plus runtime tables |
| R9-G1j | Close the `13` derived-package gaps from `undeadImmunityDerivation` through `bloodLustMeleeAttack`, inclusive. | large | **Dual-agent implementation** | `combat.js`, derived unit/ability packages; `bloodLustMeleeAttack` depends on F22 |
| R9-G1k | Close the `8` resolution-stat and combat-context gaps: `effectiveDefense:base`, `elemResistBonus`, `dosEffectiveDefenseProfile`, `doomAttackStrengthModifiers`, `normalizeCombatUnit`, `pairToHitModifiers`, `resolutionResistanceContext`, and `resolutionToBlockContext`. | medium | **Dual-agent implementation** | `combat.js`, resolution helpers and combat context; adjacent strongest pointers |

## Confirmed and suspected defects

| ID | Upcoming task | Cost | Evidence / dependency |
|---|---|---|---|
| F5 | Put common and channel To Hit/To Block writes in the transform record and implement the modern two-stage clamp. | large | CoM2 units, region `e` and sequential-transform audit |
| F6 | Implement the remaining DOS Chaos Channels shared-slot gaze-and-breath behavior. | medium | MoM analysis, Chaos Channels; `stats.js:436-441` |
| F7 | **Deferred:** replace `Math.round(hits/3)` with the moddable Supernatural formula using Delphi banker's rounding; update affected presets. | small | CoM2 combat, ApplyAttack; CoM2 tables, Supernatural minimum damage |
| F9 | Model Marionette's Channeler transformation, bonuses, spell package, and live-Fantastic Xenoveterinary eligibility. | medium | discrepancies, script checks without a calculator discrepancy |
| F12 | Move Destiny to the end of permanent `base` writes and make later channel transformations ordinary ordered steps, including Focus Magic conversion and Shadow Strike's creation/boost of Thrown. | medium | CoM2 units, Destiny; `CreateUnit.CAS:695,703`; current preset regressions |
| F13 | Move Upgraded Explosive's Fire Breath doubling to its early `UnitCalcPre` position and test a later bonus escaping it. | small | CoM2 units, Warlord region `b` |
| F14 | Move Misfortune/Mislead to aura type 10 in region `e`, preserving eligibility gates. | small | CoM2 units, aura pass |
| F15 | Put Holy Armor at its exact region-`c` position so its `Defense > 5` test cannot see later effects. | medium | CoM2 units, unit-enchantment effects |
| F16 | Compute Charm of Life from live HP at its engine position after earlier HP writers. | small | CoM2 units, global enchantments/events |
| F17 | Implement Warlord Vampirism's script formula and source-channel resets at its region-`d` position. | medium | `UnitCalc.CAS:1245-1258`; CoM2 units |
| F18 | Split Mind Storm, Tactician, True Light, node aura, and combat Flame Blade writes onto their actual channels/positions. | medium | CoM2 units, calculator-facing discrepancies and aura pass |
| F19 | Add controls/transforms for the calculator-relevant compiled effects identified as absent by the sequential-transform audit, including Lightning Blade's created Breath and Military Workshop/Rocketry channel behavior. | large | CoM2 units, sequential-transform audit; current preset regressions |
| F20 | **Blocked by F12–F19:** make the represented `b`/`c`/`d` step lists source-order exhaustive and atomic; add a complete trace-order assertion. | medium | CoM2 units, phase and region maps |
| F21 | Load modern roster `to_block` into the card with one consistent absolute/delta encoding; add non-default controls. | small | generators vs `ui.js`; MoM analysis, constructor |
| F22 | Apply modern Blood Lust doubling to Thrown as well as melee at the resolution boundary. | small | CoM2 combat, ApplyAttack setup/result flow |
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
| F51 | Add a CoM 1 Realm Ward city-enchantment input and transform: a matching Nature/Sorcery/Chaos/Life/Death Fantastic unit loses 20% To Hit, 3 Defense and 3 Resistance. | small | R6.1d evidence, *CoM 1 Realm Wards use −2/−3/−3*; absent from `data.js`/stat steps; Q19 |
| F52 | Split CoM 1 Supreme Light eligibility from the modern helper and reproduce its five binary paths (live magical ranged, Life race, mana, persistent Focus Magic, or base magical ranged), unconditional +2 melee, positive-ranged gate, and signed live-Resistance division. | medium | R6.1d evidence, *CoM 1 Supreme Light has five eligibility paths*; `combat.js:78-82`, `stats.js:1018-1023,1454-1462` |
| F53 | Use signed truncate-toward-zero division for CoM 1 Warped Defense instead of `Math.floor`; negative pre-Warp Defense can receive later Supreme Light/Tactician writes before the terminal clamp. | small | R6.1d evidence, *Warp Creature and Shatter expose both arithmetic and ordering differences*; `stats.js:1428-1431` |
| F54 | Version-gate Warlord's Construct Catapult identity conversion. The calculator currently applies the base-CoM2 Nature rewrite to every modern combat-summoned template 37, but Warlord replaces the enabled spell slot with Water Elemental and leaves its Realm-6 template-37 custom entry disabled. | small | base CoM2 `SPELLS.INI:614-628`; Warlord `SPELLS.INI:901-915,4666-4683`; `stats.js`, `identity:constructCatapult`; R9-G1a-R2 |
| F55 | Version-gate Warlord's Call to Arms Paladins identity conversion. The calculator accepts the base spell-result flag plus template 113 in every modern version, while Warlord replaces that spell slot with Spirit of Chivalry summoning template 211. | small | base CoM2 `SPELLS.INI:2689-2702`; Warlord `SPELLS.INI:3024-3035`; `stats.js`, `identity:callToArmsPaladins`; R9-G1a-R2 |

## Engine verification

Detailed dossiers live in **verification evidence**. This table states only the remaining read.

| ID | Upcoming verification | Cost |
|---|---|---|
| A32 | Locate and decode the CoM 1 Shatter effect-setter eligibility gate. | small |
| B4 | Verify per-figure damage rollover and fresh Defense rolls. | medium |
| B5 | Verify Armor Piercing rounding and its Immolation exclusion. | small |
| B6 | Verify repeated Invulnerability subtraction across rollover. | small |
| B7 | Compare the DOS data-driven touch dispatcher with calculator phase routing. | medium |
| B9 | Determine whether natural Death creatures carry `UM_UNDEAD` for Dispel Evil. | small |
| D2 | Prove the calculator's modern Weapon-Immunity proxy matches `EncMagic or magicranged` for every reachable transformation. | medium |
| D18 | Complete the Warlord touch-flag placement audit. | small |
| D21 | Reconstruct modern `ApplyLevelBonus` far enough to settle gaze level bonuses. | medium |

## Modelling work

Accepted limitations remain in `SPEC.md`; only planned changes appear here.

| ID | Upcoming task |
|---|---|
| M3 | Implement the older-engine Destruction path, including elemental protection. Present in all three DOS builds but hero-only, so it stays unreachable until heroes are modelled; 1.31 adds the defender's per-figure hits where CoM 1 adds a flat 100. |
| M6 | Represent all simultaneous Lava Smelter mineral-pair grants as independent ability/enchantment flags, including coexisting Resist Elements and Elemental Armor; the scripts write both independently and the compiled resolution helper applies both. |

## Open questions

| ID | Question / next action | Evidence / blocker |
|---|---|---|
| Q1 | Resolve Troll Shaman/Magician roster values versus the manual, including the possible Troll +1 melee rule. | roster/manual conflict |
| Q2 | Confirm the apparent Draconian common-unit +1 Resistance racial modifier. | roster/manual conflict |
| Q4 | Settle DOS Chaos Spawn poison-touch delivery. | Partial: modern gazes excluded; B7, D18, F25 |
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
| X1 | Maintainer response to the compiled CoM2-manual-vs-`UNITS.INI` discrepancy list. |
| X2 | Whether CoM2 prose “+X attack” means melee only. |
| X3 | Which attack channels CoM2 prose “+X ranged” includes. |
| X4 | Whether Seravy's newer Defense formulas apply to current CoM or CoM2. |
| X5 | Whether Sky Drake should have Negate First Strike despite the manual omission. |
| X6 | Whether “regular units” excludes heroes despite Warlord's script gate allowing them. |
