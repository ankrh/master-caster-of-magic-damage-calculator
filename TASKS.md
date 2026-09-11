<!-- Tier: TASKS. Deferred work. Items are added only on explicit approval, one at a time. -->

# Tasks

## Priority

Execution order, one row per subtask (CLAUDE.md T-2 — a row naming a range such as `T2.11`–`T2.13` is
malformed). Every subtask is sized for one agent prompt; the item bodies below are not a queue. A
subtask appears here before any subtask that depends on it.

The first block completes the stat-derivation mechanism across the full control inventory.
F279 owns the census and completion; the other items own named evidence or implementation slices.
Holy Weapon is the first pilot, followed by training grants, a dual-source case and Rust. An
unresolved census gap blocks its dependent implementation; it is not permission to guess a gate.
The census reconciliation proposes additional required work; F279.4 refines later batches. Approved rows precede their consumers.
The final audit cannot run to completion while those proposals or their implementation remain open.
Unrelated work keeps its relative order after this block.

| # | Subtask | Next outcome |
|---|---|---|
| 1 | **P2** | Map existing modern Holy Weapon targeting, stores and recalculation callers. Documentation, no reconstruction. |
| 2 | **P8.1** | Map MoM 1.31's two Specials calls, arguments and reset/retain boundaries. Documentation, no reconstruction. |
| 3 | **F279.2** | Design the outer cast sequence, record ownership, recalculation boundaries and traces. Needs P2, P8.1 and required resulting engine evidence; uses completed P1, F250, F236.1 and F277.2. |
| 4 | **F271.1** | Inventory and partition merged-input callers; resolve ambiguous source intent. Needs F279.2. |
| 5 | **F271.2** | Convert derive_unit_stats callers to explicit source halves. Needs F271.1. |
| 6 | **F271.3** | Convert remaining unit-check callers and factories. Needs F271.2. |
| 7 | **F271.4** | Preserve explicit sources in the matrix custom-unit path. Needs F271.3. |
| 8 | **F271.5** | Convert tool/sweep and other remaining callers. Needs F271.4. |
| 9 | **F271.6** | Remove the merged-input API and splitter; verify caller intent and coverage. Needs F271.5. |
| 10 | **F279.3a** | Implement pilot execution/trace support while preserving current schedules. Needs F279.2 and F271.6. |
| 11 | **F279.3c** | Implement the pilot outer cast sequence with persistent state and evidenced recalculation boundaries. Needs F279.3a. |
| 12 | **F279.3b** | Migrate Holy Weapon admission and consumers in all five versions. Needs F279.3c. |
| 13 | **F277.3** | Extend the DOS schedule and position CoM 1 summon conversions. Needs F279.3b. |
| 14 | **F209.1** | Reopen F202 rulings against the settled model. Needs F279.2. |
| 15 | **F209.2** | Reopen F200 stage 4 narrowing and CoM2 training coverage. Needs F209.1. |
| 16 | **F213.1** | The seven Warlord race-building race terms get a citation or an evidence home. |
| 17 | **F213.2** | The eight Warlord race-building hero terms get a citation or an evidence home. Needs F213.1. |
| 18 | **F273.1** | Position Sancta Basilica grants and fix the over-wide Sanctify grant; owns Q30/F200 stage 3. Needs F209.2, F213.2 and F279.3b. |
| 19 | **F273.2** | Position Pillar of Faith and remove early grant/seed-carry paths. Needs F273.1. |
| 20 | **F272.4** | Migrate innate/cast Fear and Immolation as the dual-source pilot. Needs F273.2 and F279.3b. |
| 21 | **F275** | Add cast-only modern Immolation Cold Immunity. Needs F272.4. |
| 22 | **F251.1** | Put elemental precedence in the consumers. Needs F279.3b. |
| 23 | **F251.2** | The `elemArmor` select is replaced by two independent booleans, with a stored-state migration on the retired values. Needs F251.1. |
| 24 | **F272.3** | Give the two independent elemental casts their record fields and admission. Needs F251.2 and F279.3b. |
| 25 | **F251.3** | Compose Golem intrinsic Resist Elements with Elemental Armor. Needs F251.2 and F272.3. |
| 26 | **F272.2a** | Position the remaining Rust clear-target presence writes. Needs F272.3. |
| 27 | **F276** | Implement the single Rust targeting decision at the evidenced record/time. Needs F279.3b. |
| 28 | **F272.7** | Publish admitted Rust state and migrate its melee reader. Needs F276 and F272.2a. |
| 29 | **F242** | Apply Rust permanent clears using the admitted state and fields. Needs F272.7 and F251.3. |
| 30 | **F226.1** | Model Create Undead in the settled record/admission design and extend the census. Needs F279.3b. |
| 31 | **F279.4** | Assign every remaining census gap; fix batch lists and propose any additional bounded tasks. Needs F273.2, F275, F242 and F277.3. |
| 32 | **F272.2b** | Migrate the first dependency-ordered group of remaining condition flags, exactly listed by F279.4. Needs F279.4. |
| 33 | **F272.2c** | Migrate the second group of that list. Needs F272.2b. |
| 34 | **F272.5** | Migrate teleporting/undead admission and readers. Needs F279.4. |
| 35 | **F272.6** | Migrate hierophany/mislead/soulFlay admission and readers. Needs F279.4. |
| 36 | **F257.3** | The six writes become positioned steps at their `UnitCalcPre.CAS` ranks, one per engine write. Needs F279.4; the retort inputs are already implemented. |
| 37 | **F243** | Resolve the figure-dependent writes using the settled record schedule. Needs F279.2. |
| 38 | **F249** | Position CoM 1 Raise Dead with the settled creation schedule. Needs F279.2. |
| 39 | **F236.2** | Implement remaining global-grant eligibility, preserving the pilot cast distinction. Needs F279.3b and F279.4. |
| 40 | **F232** | `UnitCalc.CAS:93-98`'s region-`d` Sanctify race re-write is read and either modelled or declared inapplicable. |
| 41 | **F235** | Determine when the known Vampirism/Revenant `EncUndead` writes reach the classifier and Eternal Night / True Light readers. |
| 42 | **F231** | Resolve the No Heal missing producer/healing reader. Needs F249. |
| 43 | **F207** | Remove the obsolete Supreme Light published-value suppression. Needs F279.4. |
| 44 | **F279.5** | Audit every live control/version and remove obsolete paths/docs; BLOCKED until all assigned migration/evidence work is resolved. See body for prerequisites. |
| 45 | **F226.2** | Create Undead routes the damage it colours into the undead bucket, in both engine families. Needs F226.1. |
| 46 | **F233** | The post-combat composition states a normalisation rule for overkill cells, where uncapped riders sum past the capped published total. |
| 47 | **F229** | Exorcise's created-undead penalty loses the `fantastic_death` term no version's block tests. |
| 48 | **F230** | Supreme Light stops testing the compact type token, so a Life-race hero passes the gate the binary passes it on. |
| 49 | **F234** | The DOS Warp Reality exemption sheds the Fantastic term its block does not test, keeping a scalar race compare. |
| 50 | **F180** | The four keys live in some versions and silent in others get a source reading each. |
| 51 | **F159.1** | Rule on what "same implementation in all versions" has to mean. |
| 52 | **F159.2** | Roughly 15 of the 43 unasserted keys get a scope entry with a citation. Needs F159.1. |
| 53 | **F159.3** | Roughly 15 of the 43 unasserted keys get a scope entry with a citation. Needs F159.1. |
| 54 | **F159.4** | Roughly 15 of the 43 unasserted keys get a scope entry with a citation. Needs F159.1. |
| 55 | **F215.1** | CoM2 gains a positive Black Sleep and a positive Shatter assertion. |
| 56 | **F215.2** | CoM 1 gains a positive Land Linking assertion. |
| 57 | **F216** | The Land Linking version-difference subgroup asserts a version difference. Needs F215.2. |
| 58 | **F145.1** | Family predicates are added over the existing `SCOPE_*` sets. |
| 59 | **F145.2** | Roughly 55 open-coded version tests route through the predicates and take the halt. Needs F145.1. |
| 60 | **F145.3** | Roughly 55 open-coded version tests route through the predicates and take the halt. Needs F145.1. |
| 61 | **F145.4** | Roughly 55 open-coded version tests route through the predicates and take the halt. Needs F145.1. |
| 62 | **F145.5** | Roughly 55 open-coded version tests route through the predicates and take the halt. Needs F145.1. |
| 63 | **T8.1** | The unsourced engine claims in `combat.js` get a citation or an evidence home. |
| 64 | **T8.2** | The unsourced engine claims in `combat_special_attacks.js` get a citation or an evidence home. |
| 65 | **T8.3** | The unsourced engine claims in `combat_effects.js` get a citation or an evidence home. |
| 66 | **T8.4** | The unsourced engine claims in `combat_abilities.js` and `combat_phases.js` get a citation or an evidence home. |
| 67 | **T8.5** | The unsourced engine claims in the remaining sources get a citation or an evidence home. |
| 68 | **F153** | The modern gaze rider exclusion gets one home. |
| 69 | **F146** | The seven roster facts the card and matrix decode separately get one reader each. |
| 70 | **F147** | Five derivation values read by nothing go, F205's three write-only `luckyPhase*` markers with them. |
| 71 | **F140** | The matrix stops computing a row and column for the card that nothing renders. |
| 72 | **F151** | A version's default-state map is built without resetting the live page. |
| 73 | **F128** | The `Other` unit category no roster can fill goes. |
| 74 | **F129** | The version-scope sweep's shared attack slot gets a strength. |
| 75 | **F182** | `derivation_equivalence.js`'s dead `chaos-channels` env is dropped or fixed. |
| 76 | **F240** | The dead `traceBasePreparation` trace in `stats.js` goes. |
| 77 | **F237** | The CAS audit attributes and gates a `/N` after a locator and a bare `:N` under a `@span` line or bare mention, keeping non-script numbers reported and ungated. |
| 78 | **F115** | The 44 Warlord spell ids the roster renders as `Spell#N` get names. |
| 79 | **T15** | The Markdown roster tools' drift from the roster JSON is fixed. |
| 80 | **F238** | The Warlord source-order tables in `CoM2 binary - unit recalculation.md` are re-derived against 1.5.12.9 with label-bounded rows. |
| 81 | **F41.1** | The DOS eight-threshold hero ladders. |
| 82 | **F41.2** | The DOS template-ability formulas. |
| 83 | **F41.3** | The modern nine-step hero table. |
| 84 | **F41.4** | How the level control exposes them. Needs F41.1–F41.3. |
| 85 | **M3** | The DOS Destruction path. Needs F41. |
| 86 | **Q1** | Troll Shaman/Magician roster values versus the manual. |
| 87 | **Q2** | The apparent Draconian common-unit +1 Resistance racial modifier. |
| 88 | **Q6** | CoM High Prayer's +3-attack text versus the +2 used elsewhere. |
| 89 | **Q8** | Whether Wraiths use Life Steal −4 or −3. |
| 90 | **Q12** | When "ranged" includes each attack kind, across versions and effects. |
| 91 | **Q19** | CoM 1 Realm Ward helptext against the executed −2/−3/−3 writes. |
| 92 | **Q21** | CoM 1 helptext's retained powers against the manual's replacements. |
| 93 | **Q26** | The R9-G1a-R3 evidence-scope disagreement. |
| 94 | **Q28** | What realm a Fantastic unit with a mundane base race has. |
| 95 | **H1** | Contact Seravy about the Blur bug. |
| 96 | **H2** | Contact Seravy about the Bless defense term's missing breath flag. |
| 97 | **F265** | The ~60 `SPEC.md` references in `Calculator/*.js` name `CLAUDE.md`, the file that actually holds the content. |
| 98 | **F269** | The post-combat panel stops showing `Bonus HP / figure` / `Extra Hits / figure`; the quantity stays internal. |
| 99 | **F270** | The tooltip system is overhauled. Low priority, deliberately late: nothing depends on it and the F268 pass left tooltip wording unasserted in the meantime. |
| 100 | **F278** | The cost of having the matrix worker import all 24 core sources instead of nine is measured, and the subset either goes or is kept with the number stated. |

## Approved pilot source preparation

Approved 2026-09-11. Each is **documentation/source reconciliation**, with no binary
reconstruction or calculator migration. Reuse existing source first; a missing locator is not
proof of missing reconstruction. Any necessary new binary packet is separately scoped for
approval. These implement only the three named preparation slices in the
[control census](Reference%20docs/Stat%20derivation%20control%20census.md).

- **P2 — Modern Holy Weapon targeting and cast boundary.** Map existing evidence for
  Holy Weapon group 15/id 124 in CoM2 and Warlord independently, including
  ValidUnitSpellTarget, InitializeCombatSpellcasting, combat/overland writers and subsequent
  recalculation. Subtract F264.1/F250.2 coverage. Raise Dead-specific and action-end calls
  do not establish universal pre-cast recalculation. Deliver exact remaining pilot
  gate/store/timing gaps and sized packet requests where needed.
- **P8.1 — MoM 1.31 Specials call arguments.** Map only BU_Construct and
  BU_Apply_Battlefield_Effects calls to BU_Apply_Specials, their arguments and reset/retain
  boundaries, with local Specials rows as witnesses. Deliver one source-availability ledger
  with exact existing locators or named missing extents and size status. Exclude the full
  50-step migration, other callers and any new reconstruction.

The remaining preparations precede F279.2. Their completion identifies evidence availability; it does not
close missing engine evidence or authorize implementing an unsupported pilot schedule.

## T2 — Adjudicate the non-discriminating presets and declare the result

`tools/preset_vacuity_sweep.js` flags 389 of 1122 presets where a configured feature can be
removed without moving a number. That is a lead, not a verdict: a preset may legitimately assert
that something does not happen, and a preset can look inert while being the only fixture pinning a
rule's shape — `longRangeClose` is inert under ablation and is the only preset that would catch
the Long Range cap at [combat_abilities.js:438](Calculator/combat_abilities.js:438) being written
as a flat assignment.

The tool used to separate the two by regex over the preset key and `desc`, which on a 12-preset
sample was wrong on 6 — missing every genuine absence claim and matching one preset that should not
be suppressed. That regex is gone. A fixture now declares its own verdict in a `vacuity` map keyed
by the sweep's finding; the schema is in the tool's header comment, which is its only home.
Detail and provenance in [JOURNAL.md](JOURNAL.md), 2026-08-29 and 2026-08-30.

Per preset: read it against the code that decides its number, and record whether it meaningfully
tests its claim (keep / re-aim / delete) and whether the absence is its subject. Then declare that
intent on the fixture. A `keep` clears the finding; a `re-aim` or `delete` is left undeclared, so
the sweep goes on reporting it.

Subsumes backlog F61 and F68–F79, which ask this question split across twelve items by version
and class. The `re-aim` verdicts generate follow-on work that is **not** in this item's scope.

Regenerate the flagged set with `node tools/preset_vacuity_sweep.js --out report.json`. The slice
bounds below are a work partition, not a contract: if the flagged set shifts, re-partition.

| Subtask | File | Presets | Sharp | From … to |
|---|---|---:|---:|---|
| T2.01 ✓ | `presets_ranged_and_haste.js` | 20 | 3 | `rangedMissileBasic` … `lightningResistKeepsAPMagicRangedWarlord` |
| T2.02 ✓ | `presets_ranged_and_haste.js` | 20 | 10 | `wandererRosterRangedTypeWarlord` … `hiddenGazeIgnoresWeaponImmunity` |
| T2.03 ✓ | `presets_ranged_and_haste.js` | 20 | 9 | `hiddenGazeLevelLadderNeedsStrength` … `firstStrikeCapCoM` |
| T2.04 ✓ | `presets_ranged_and_haste.js` | 18 | 8 | `firstStrikeCapIgnoresThrownCoM` … `armorPiercingLightningNoDoubleHalve` |
| T2.05 ✓ | `presets_curses_and_undead.js` | 17 | 7 | `righteousnessMagicNatureNotBlocked` … `weaknessBoulderNotAffected` |
| T2.06 ✓ | `presets_curses_and_undead.js` | 17 | 8 | `weaknessBoulderNotAffectedMoM` … `blackpowderMissileWarlord` |
| T2.07 ✓ | `presets_curses_and_undead.js` | 17 | 11 | `bombsGrenadesWarlord` … `supremeLightSkipsBlazedRangedWarlord` |
| T2.08 ✓ | `presets_fire_and_blessings.js` | 20 | 5 | `predefBarbSwordsVsSpears` … `wallOfFireNotRanged` |
| T2.09 ✓ | `presets_fire_and_blessings.js` | 20 | 8 | `resistElementsWallOfFireCoM` … `blessMeleeFromChaosCoM2` |
| T2.10 ✓ | `presets_fire_and_blessings.js` | 18 | 12 | `blessMeleeFromNormal` … `blackPrayerDoomGazeUnchangedCoM2` |
| T2.11 ✓ | `presets_warlord_effects.js` | 18 | 1 | `berserkIronSkinOverridden` … `bloodLustThrownFantasticTargetCoM2` |
| T2.12 ✓ | `presets_warlord_effects.js` | 18 | 13 | `bloodLustPhysicalRangedUndoubledCoM2` … `destructionDeathImmunityNoProtectionCoM2` |
| T2.13 ✓ | `presets_warlord_effects.js` | 16 | 9 | `destructionNotInMoM` … `blackChannelsPoisonImmune` |
| T2.14 ✓ | `presets_immunities_and_abilities.js` | 16 | 10 | `weaponImmunityMagicWeapon` … `fireImmunityNotMissile` |
| T2.15 ✓ | `presets_immunities_and_abilities.js` | 16 | 4 | `fireImmunityAfterArmorPiercing` … `invisibilityIllusionImmuneNoPenalty` |
| T2.16 ✓ | `presets_immunities_and_abilities.js` | 16 | 5 | `invisibilityDoomIgnores` … `chaosEmbraceLandsAfterFocusMagicWarlord` |
| T2.17 ✓ | `presets_immunities_and_abilities.js` | 15 | 4 | `blazingEyesNonChaosNoUpgradeCoM2` … `fortificationRestoresRustedLargeShieldWarlord` |
| T2.18 ✓ | `presets_protections_and_weapons.js` | 15 | 8 | `landLinkingBeforeMysticSurgeRealmCoM` … `wraithFormBypassesWIMoM` |
| T2.19 ✓ | `presets_protections_and_weapons.js` | 15 | 5 | `rulerOfUnderworldPreservesMagicWICoM2` … `spiritLinkExorciseImmuneWarlord` |
| T2.20 ✓ | `presets_protections_and_weapons.js` | 15 | 8 | `spiritLinkWeaponImmunityBypassWarlord` … `blurInvisCoM2` |
| T2.21 ✓ | `presets_buildings_and_machines.js` | 14 | 4 | `hillfortMeleeUnaffectedWarlord` … `alumniOfAcademyNonHalflingExcludedWarlord` |
| T2.22 ✓ | `presets_buildings_and_machines.js` | 14 | 9 | `dragonMoundHeroExcludedWarlord` … `poolOfRepentanceHeroExcludedWarlord` |
| T2.23 ✓ | `presets_buildings_and_machines.js` | 14 | 4 | `sanctaBasilicaNonHighMenWarlord` … `rebuildMechanicalTooLateForArtificerWarlord` |

*Sharp* counts the presets in the slice that either move nothing at all or whose key binds no
feature they configure — the two shapes most likely to be genuine defects.

Done when every one of the 389 carries a declared intent and a sweep re-run reports only presets no
verdict has cleared. T2.01–T2.10 landed 2026-08-30: 183 of those 187 declared `keep`, four left
open (`longRangeMidRange`, `hasteMagicRangedDoublesForCaster`, `blackSleepIncomingRanged`,
`weaknessBoulderNotAffected`).

T2.11–T2.23 landed 2026-08-30: 195 of those 202 declared `keep`, seven left open —
`missileImmunityArmorPiercing`, `supremeLightCasterRangedCoM2`,
`goodMoonSkipsDestinyPermanentFantasticCoM2`, `focusMagicConvertsThrownCoM2` and
`spiritLinkBlessNoBonusWarlord` re-aim, `lavaSmelterFlameBladeWarlord` re-aim as a rename, and
`focusMagicDoomGazeRangedBranchCoM2` delete. Reasons for all eleven open verdicts are in
[JOURNAL.md](JOURNAL.md), 2026-08-30.

**Closed 2026-08-30.** All 389 adjudicated. The 23 slices sum to exactly 389, so there was no
balance outside them. `longRangeMidRange`, the last one carrying the ambiguous "re-aim/delete", was
settled as **delete** and executed: the fixture is gone from `presets_ranged_and_haste.js`, its key
removed from the *Ranged* group in `test_tree.js`, and `longRangeClose`'s reason updated where it
named it. Its redundancy was re-derived before deleting rather than taken from the record — see
[JOURNAL.md](JOURNAL.md), where the original reason's cited sibling is corrected.

Final state: 378 fixtures carry a `vacuity` block, 10 carry a deliberate non-declaration. The sweep
reports 1121 swept, `baselineMismatches` empty, 0 stale declarations, and 10 open findings whose keys
are exactly the ten adjudicated `re-aim`/`delete`. `npm test` passes, 129 tests.

**The key-by-key match is the completeness test, not the arithmetic.** `378 + 10` summing correctly
proves nothing on its own: the item allows the flagged set to shift, so a newly flagged preset
outside the original slices could replace one that stopped flagging and leave the sum unchanged.
Comparing the sweep's finding keys against the recorded open list, plus the stale count, is what
proves it.

One inconsistency in this item's own text, left as read rather than rewritten after the fact:
"declare that intent on the fixture" is contradicted by the next sentence, which *defines* a
`re-aim` or `delete` as left undeclared — that being the reporting mechanism. So "every one of the
389 carries a declared intent" was read as "every one has been adjudicated". A future item in this
shape should say which it means.

The 10 are follow-on work this item generated and deliberately excluded from its own scope. They are
not filed as items: each is a single fixture change, and the sweep goes on reporting it until acted
on, which is the mechanism the schema was built for. Their reasoning is in `JOURNAL.md`, which is
journal tier and freely pruned — if it is worth more than that, it needs a home decided on.

Filing note: the run also produced F211–F216, each found by reading a fixture against the code
rather than by the sweep, and each out of this item's scope.

## Modelling and phase work

### F209 — Retire the flag-versus-delta criterion

*Category: decision.* Needs F279.2. Reopen the rulings that treated a training-time flag write
as not needing a step. `CLAUDE.md` now requires individually cited engine writes; a flag can be
read by later training writes as well as by recalculation.

- **F209.1** re-examine F202's four rulings (`fieryBlade`, `powerEngine`, `flying`, `discipline`,
  commit `0fd0b32`) against the settled record and execution model. Identify any remaining
  implementation work and its existing migration owner; do not recreate already positioned writes.
- **F209.2** re-examine F200 stage 4's narrowing and base CoM2's training coverage. Distinguish
  missing evidence from missing implementation; route each gap into F279's census rather than
  inferring that a flag-only write needs no position. Needs F209.1.

Neither subtask is a code migration. Any further implementation is assigned through F279.4.

### F207 — Delete Supreme Light's published-value suppression

`effectiveAbilities.supremeLight` is `supremeLightActiveForUnit(...) ? abilities.supremeLight :
false` (`stats.js`), a normalization no engine block makes. The eligibility term is already carried
where it belongs: `c:supremeLight` and `e:supremeLight` both take `supremeLightEligibleAt` as their
own `when`. No `combat_*.js` line reads the key and no assertion names the published value.

Expected to move only `abilities.supremeLight`. Measure with `tools/derivation_equivalence.js`.

### F205 — Delete the three write-only `luckyPhase*` markers

`luckyPhaseA` (`markIntrinsicLucky`), `luckyPhaseBase` (`applySanctaBasilicaGrant`,
`applyPillarOfFaithGrant`) and `luckyPhaseB` (`deriveMarionettePackage`) are set in
`stats_identity.js` and read by no line of `Calculator/`. Non-stacking is already structural —
`c:lucky` is one step gated `when: u => !!u.lucky`. The SPEC deviation that described them as a
mechanism is gone from the rebuilt SPEC. Fold into F147, which is the same class.

## Defects with evidence in hand

### F236 — CoM 1's unit-type eligibility gate is not modelled

The completed [source distinction](Reference%20docs/DOS%20reconstructed/F236.1.holy-weapon-sources.md) supplies grant evidence to F279.2/F279.3b. F236.2 implements any remaining
Holy-Arms/Heavenly-Light grant behavior after that pilot, without duplicating Holy Weapon's cast
admission. A global grant's restriction is not evidence for a direct cast's restriction.

*Category: faithfulness.* Filed out of Q18, 2026-09-01.

Holy Arms is a global enchantment granting Holy Weapon, and CoM 1 gates the grant on the base
unit type: `com1:0x8F170` admits `type < 0x97`, the normal/fantastic cut (Q18, `R6.1a.evidence.md`).
Heavenly Light's weapon-quality test at `com1:0x905E7` reads the same ceiling and, on a unit at or
above it, forces `cl` to Magic Weapons and withholds the To Hit thresholds.

The calculator's free `holyWeapon` boolean does not distinguish a direct cast from a Holy Arms
grant. The unit-type test above evidences the global grant's restriction; it does not by itself
establish the direct cast's eligibility. The completed source distinction separates those paths; implement using the current `CLAUDE.md` input/output contract.

The rule and its discriminators:

- **Roster units.** `templateId < 0x97`. Across all 192 units in `Calculator/units_com.js` this
  agrees exactly with `!baseFantastic` (highest normal 150, lowest fantastic 152, 151 absent).
- **Custom units.** No `templateId` exists, so the Fantastic flag is the discriminator.
- **Version scope.** Only CoM 1. All four in-attack sites are new in CoM 1, not inherited: the
  1.31/CP `0x9A` homologs are the overland and post-combat sites. Confirm before gating that no
  DOS build reaches an equivalent test in an attack.

The `holyWeapon` control stays specifiable on every unit: gating is internal, in the manner of
the **immunities** phase (`CLAUDE.md`, *Architecture*), which strips what the unit could not have
received rather than preventing it being marked. The matrix depends on that — one enchantment
applied across a filter must land on the eligible units and not the rest.

The completed source distinction establishes that Heavenly Light withholds the To Hit increments
through its local weapon-quality substitution, without rejecting its whole stat package.

Remaining subtask: **F236.2** implement the remaining grant behavior (needs F279.3b and F279.4),
using the completed source distinction. Enclosing direct-cast admission/store/timing gaps remain
with P1/P2; no new reconstruction of the known grants is needed.

### F226 — Create Undead is omitted, and it colours the damage it deals

Category: **faithfulness**. Filed 2026-09-01 on the user's instruction, from the same run.

`applyVampirismEffects` ([combat_effects.js:223](Calculator/combat_effects.js:223)) states the
omission and its reason: Create Undead "only routes damage into a post-combat creation category; it
does not change one-round damage", so the calculator drops the flag. That reasoning held while
nothing displayed the category split. The post-combat block now displays exactly that, so a Ghoul's
melee prints `Regular 100.0%` for damage the engine books as undead.

The routing is not incidental. Caster sends the **whole** ordinary attack roll to the undead bucket
when the attacker has Create Undead and the target has neither Magic nor Death Immunity
(`Combat.ApplyAttack.pas:624`, `$005B31FA`). DOS routes at least two damage sources the same way,
including Poison ([combat.c:4920](Reference%20docs/DOS%20reconstructed/combat.c:4920) and
[:4968](Reference%20docs/DOS%20reconstructed/combat.c:4968)), and carries a version difference in
the gate: MoM 1.31 blocks on Magic Immunity alone (`USA_CREATE_UNDEAD_BLOCK_131`, raw `0x0020`)
while CP 1.60 and CoM 1 block on Magic **or** Death Immunity (raw `0x0060`).

Today `createUndead` exists only as a display grant
([stats_identity.js:834](Calculator/stats_identity.js:834)) — no control, no `ABILITY_DEFS` entry,
and therefore no roster import, since `ui_abilities.js` imports only abilities the defs list.

**F226.1 — model the flag.** Needs F279.3b. Extend the census and use the settled record/admission
design. Give Create Undead an `ABILITY_DEFS` entry with
its tooltip and version gating, so it survives roster import and satisfies INV-2, and derive it
where the engines grant it — the Warlord Vampirism grant included. Name the immunity gate once,
with its 1.31-versus-later split, the way the `*ReachesRoll` predicates name theirs. No damage
routing yet.

**F226.2 — route the damage.** Needs F226.1. Send the damage Create Undead colours into the undead
bucket in both families, to the extent each engine does it: the whole conventional roll on Caster,
and each DOS site that tests the flag. Add the `createUndead` row to `nonNormalRiders` in
`runRiderHistogramChecks`. Expect preset movement wherever an affected unit already appears, and
expect DOS combat healing to move with it, since undead damage is healed after regular damage
rather than alongside it.

### F233 — The post-combat composition has no rule for overkill cells

Category: **decision**. Filed 2026-09-01 on the user's approval, out of the F225.1 adjudication.

The project CLAUDE.md's damage-phase rule says what a phase publishes is capped at the HP its target
had entering it, while "a rider histogram is not capped, so in an overkill cell the riders bound
their phase total rather than summing to it". The post-combat block displays a damage-type
composition built from those uncapped riders against that capped total, and nothing states how the
two are reconciled: in an overkill cell the buckets sum past 100% of the published figure.

This is a display and normalisation decision, not a faithfulness one — the engine's own buckets are
uncapped and the calculator is right to carry them that way. What is missing is a stated rule for
what the composition shows when they exceed the published total: normalise to the buckets' own sum,
clip proportionally to the published total, or show the overflow.

It affects every non-normal rider, not only the gaze, which is why it is not folded into F225.2.
F225.2 and F226.2 both push more cells into the regime by routing damage into the irreversible and
undead buckets, so settling it before those land avoids re-reading the display twice.


### F229 — Exorcise's created-undead penalty carries a realm term no version tests

Category: **faithfulness**. Filed 2026-09-01 on the user's approval, out of the F224.1 sweep.

`isCreatedUndeadTarget` ([combat_special_attacks.js:110](Calculator/combat_special_attacks.js:110),
used at `:120` and `:174`) requires `defUnitType === 'fantastic_death'` before the extra
Exorcise / Dispel Evil penalty applies. No block in any version puts a realm term on that clause:
the modern gate is `EncUndead` alone (`Combat.ApplyAttack.pas:482-484`, `$005B2A85`), and all three
DOS builds test `mutations & 0x20` alone (`com1:0x99FB7`, `131:0x99FA9`). So a created-undead unit
whose realm is not Death loses a penalty every engine applies.

Unsupported in all five versions, so this is not a modern-only correction and F224.2 does not touch
it — it is a realm term to delete, not a predicate to collapse.

### F230 — Supreme Light tests the compact type token, so Life-race heroes fail its gate

Category: **faithfulness**. Filed 2026-09-01 on the user's approval, out of the F224.1 sweep.

`supremeLightActiveForUnit` ([combat_abilities.js:301](Calculator/combat_abilities.js:301), called
at [stats.js:1788](Calculator/stats.js:1788)) reads the compact type token, but the block at
`$005A6FDF..$005A744B` compares `U.race = RCLife`. A hero whose race is Life — Torin, any Sanctified
hero — passes the binary's test and fails the calculator's.

The same F195 shape as F224, but in a **scalar-form** consumer: the block compares `U.race`, so it
must not gain the recovery clause and no F224.2 subtask picks it up. The fix is the Fantastic term
alone.

### F231 — `unit.raceNoHeal` has no producer, and Raise Dead heals naturally

Category: **faithfulness**. Filed 2026-09-01 on the user's approval, out of the F224.1 sweep.

`CanHealNaturally`'s realm arm ([engine.js:336](Calculator/engine.js:336), `:355`) reads
`unit.raceNoHeal` against the binary's `Units[u].race = RCNoHeal` (`$005ECB8B..$005ECBB9`), but
nothing in the calculator ever writes that field. The live consequence is Raise Dead:
[stats_identity.js:398](Calculator/stats_identity.js:398) writes race `No Heal` and no `noHealing`
term names it, so a raised unit heals where the engine forbids it. Mystic Surge is already covered
by `noHealing` and is not the missing case.

Either give the field a producer at the Raise Dead write or delete it and route the case through
`noHealing`; the reading decides which.

### F232 — `UnitCalc.CAS:93-98` re-writes race in region `d`, and nothing models it

Categories: **decision and faithfulness** (existing script interpretation and implementation).
Use Method A; the source write is already available. Filed 2026-09-01 on the user's approval, out
of the F224.1 sweep.

`UnitCalc.CAS:93-98` is a `SETSTAT(U,SRace,0,RCLife)` in region `d` — the late script hook. The
calculator models Sanctify only as the region-`b` `b:sanctify` write. In Warlord a Sanctified unit
that also took a region-`c` conversion would have that conversion undone by this later write, and
the calculator has no step for it.

Read the block against its guards and either give it a step in the region-`d` chain or declare it
unreachable for the states the calculator models. Note that Warlord scripts outrank the compiled
behaviour they overwrite, so if it fires it wins.
Any missing caller or API semantics must be named separately from this known script write;
this task does not presume a new binary reconstruction is needed.


### F234 — The DOS Warp Reality exemption carries a Fantastic term its block does not test

Category: **faithfulness**. Filed 2026-09-01 on the user's approval, out of the F224.2a run.

F224.2a routed the modern half of `unitIsChaos` ([stats.js](Calculator/stats.js)) onto the realm
membership reader and left the DOS half on the compact `fantastic_chaos` type token, because the
subtask was scoped modern-only. The DOS block tests no Fantastic flag: Warp Reality's exemption is
`bu->race != rt_Chaos` at `131:0x9077A` and `com1:0x904DF`. A non-Fantastic unit whose race is Chaos
is therefore wrongly denied the exemption in all three DOS builds.

The same F195 shape as F224, and the last of that family in this consumer. The DOS engines have no
`IsChaosUnit` helper, so this takes a **scalar** race compare and must not gain the recovery clause
— the membership reader is the wrong tool here. `unitInRealmAt` throws on any realm but `chaos` and
`death` precisely so this cannot be routed through it by reflex.

Add a fixture per corrected build with its arithmetic in the `desc`.

### F235 — Warlord Vampirism and Revenant write `EncUndead`, and nothing decides whether it counts

Categories: **decision and faithfulness** (existing script interpretation and implementation).
Use Method A; the writes themselves are known. Filed 2026-09-01 on the user's approval, out
of the F224.2a run.

Warlord's Vampirism (`UnitCalc.CAS!NOVAMPIRISM!-7`) and Revenant (the `COSpell.CAS` Revenant arm)
both write `EncUndead` at index 1. Determine which invocation makes each write and which later
readers see it — Eternal Night's Poor Vision, True Light, and the classifier arm F224.2a built.
A destination in permanent state does not place the write before region `b`; record destination
and execution time must be established separately, including carry-forward between recalculations.

`UnitCalcPre.CAS~"SPELLSTATE(W,SDeathMastery)=2"` lists `EncUndead`,
`EncRevenant` and `EncVampirism` as three separate disjuncts. Compare that earlier reader with
the actual write sites and call order; the spelling alone does not settle their timing.

F224.2a's review pressed for folding these into the membership reader's `EncUndead` term and the
agent declined; the question was documented in the reader's comment rather than decided.
Resolve it from the existing scripts and reconstructed call schedule, then implement the supported
result and report affected fixtures. Name any missing caller/reset evidence rather than
reconstructing the already-known flag writes again.


### F180 — Four keys live in some versions and silent in others, with nothing saying why

`bless` (moves in both MoM, silent in CoM 1, CoM2 and Warlord), `ccFireBreath` and `supernatural`
(move in CoM2 and Warlord, silent in all three DOS builds), `immolation` (moves in CoM 1, CoM2 and
Warlord, silent in both MoM). Each needs its own source reading.

`destruction` is **settled and not part of this**: the control is correctly shown in the DOS
versions, where Destruction exists but is hero-only and therefore unimplemented until hero mechanics
land (M3). Reproduce with `node tools/narrow_control_scope_sweep.js`.

### F251 — Elemental Armor and Resist Elements are one exclusive control, and three engines stack them

Needs F279.3b. F251 owns control shape, saved-state conversion, precedence and the Golem grant;
F272.3 owns the independent casts' record fields and admission. Neither creates a new
`elemArmor` value field. F251.3 additionally needs F272.3.

Category: **faithfulness**. Filed 2026-09-03 on the user's approval.

The two are separate bits in one enchantment word — `UE_RESIST_ELEMENTS` `0x200` and
`UE_ELEMENTAL_ARMOR` `0x400` ([combat.c:129](Reference%20docs/DOS%20reconstructed/combat.c:129)) —
and every reader takes the union of the overland, combat and item words
([combat.c:2294](Reference%20docs/DOS%20reconstructed/combat.c:2294)). Only MoM 1.31 and CP 1.60
make the bonuses exclusive, and they do it in the *defense code*, not by keeping the flags apart:
`0x9A753`'s `EB 14` skips the Resist Elements test once Elemental Armor has fired. CoM 1 replaces
those two bytes with `90 90`, so both tests run and both add — +12 then +4
([combat.c:2417](Reference%20docs/DOS%20reconstructed/combat.c:2417), com1:`0x9A733`..`0x9A769`;
[R6.2e.evidence.md:367](Reference%20docs/DOS%20reconstructed/R6.2e.evidence.md:367)). CoM2 and
Warlord are independent terms too, which the calculator already models as two steps
([combat_effects.js:492](Calculator/combat_effects.js:492)). On resistance CoM 1 is the mirror
image: Elemental Armor's `add di,10` is stranded behind an unconditional `EB 05`, so it grants no
resistance at all and Resist Elements' +4 always gets its test
([combat.c:2063](Reference%20docs/DOS%20reconstructed/combat.c:2063)).

The calculator cannot express the combination in CoM 1 or base CoM2. `elemArmor` is one three-way
select ([enchantments.js:10](Calculator/enchantments.js:10)); the independent `resistElements` and
`elementalArmor` booleans exist in the calculation layer but are fed only by Warlord's Lava Smelter
([stats_identity.js:551](Calculator/stats_identity.js:551)), which returns early on every other
version. So CoM 1's two independent defense steps
([combat_effects.js:1099](Calculator/combat_effects.js:1099)) are unreachable as a pair.

It is not hypothetical, and it does not wait on hero equipment. CoM 1's battle-unit constructor
gives Golem an intrinsic `UE_RESIST_ELEMENTS` in `item_enchantments`
([unitcalc.c:2304](Reference%20docs/DOS%20reconstructed/unitcalc.c:2304), com1:`0x8EE40`), and CoM2
does the same on base `unittype` 81. The calculator makes that grant *overwrite* the select
([stats.js:44](Calculator/stats.js:44)) and disables the control
([ui_units.js:374](Calculator/ui_units.js:374)), so a Golem under Elemental Armor computes +4 where
CoM 1 gives +16.

The fix is the control shape, chosen over a local Golem patch: two independent booleans for all
five versions, with each family's precedence living in the step that reads them. Lava Smelter is
the precedent for every part of it — five booleans replacing a select, a keyed stored-state
migration ([ui_state.js:858](Calculator/ui_state.js:858)), and grants that compose rather than
overwrite.

Open at filing: whether MoM/CP's exclusivity is better expressed as one step choosing the larger
bonus (today's shape, moved off the control) or as two steps with the second gated on the first not
having fired. Either satisfies the binary; the second reads closer to `0x9A753`.

Subtasks:

- **F251.1** — Move each family's precedence into the steps, so a both-marked unit is already
  correct before any control changes. MoM/CP keep exclusivity (+10 wins over +3 on defense and on
  resistance); CoM 1 stacks +12 and +4 on defense and takes Resist Elements' +4 alone on
  resistance; CoM2 and Warlord keep their two independent terms. `elemResistBonus`
  ([combat_effects.js:912](Calculator/combat_effects.js:912)) and the DOS `elemental` steps are the
  sites. Fixtures for the both-marked state in each family, since no preset covers it today.
- **F251.2** — Replace the `elemArmor` select with independent `resistElements` and
  `elementalArmor` booleans: the manifest and its two tooltips
  ([enchantments.js:10](Calculator/enchantments.js:10)), the select-row set
  ([ui_abilities.js:152](Calculator/ui_abilities.js:152)), the origin entries (`elemArmor` goes;
  the two existing keys widen past Warlord, [stats_origins.js:395](Calculator/stats_origins.js:395));
  F251.2 owns this control-scope metadata while F272.3 owns the positioned writer registrations.
  Update the presets and existing checks that set `elemArmor`, including
  `tools/state_persistence_check.js`. A stored-state migration keyed like Lava Smelter's maps the
  retired `resistElements` and `elementalArmor` select values onto the booleans; SPEC's
  *Input/output contract* requires the migration or an accepted halt. Needs F251.1.
- **F251.3** — Golem's intrinsic becomes an additive `resistElements` write in the shape of the
  binary's `item_enchantments` OR, leaving Elemental Armor markable alongside it: `stats.js`'s
  overwrite, the UI's `_preGolemElemArmor` stash and disable, and `golemShaping`'s origin mapping
  and assertion in `tools/unit_checks/ability_origins.js`. Fixtures for a CoM 1 and a CoM2 Golem
  under Elemental Armor at +16. Needs F251.2 and F272.3.

## Version scoping

### F159 — 43 all-version keys have no scope entry

178 read sites over 68 all-version keys; 20 have a `STEP_VERSION_SCOPES` entry covering all five,
and 5 more were read individually and found correct with a narrower step scope (`animated`,
`combatSummoned`, `eternalNight`, `raiseDead`, `trueSight`), because a step is not the only place an
effect can be implemented. The remaining 43 are unasserted.

Not mechanical: several are cross-version in presence while differing per engine in their numbers —
`weaponImmunity`'s bonus is per engine at `combat_special_attacks.js:526` (MoM raises to 10, CoM 1
+8, CoM2 +8, Warlord +10), and `lifeSteal`, `bless`, `blur`, `haste`, `immolation` and `fear` sit in
the same position. Rule on what "same implementation in all versions" has to mean first, then apply
per key with a citation. Census in `Reference docs/Version gating census.md`.

Subtasks: **F159.1** the ruling; **F159.2**–**F159.4** roughly 15 keys each.

### F215 — Three effects are asserted only by absence claims in a version

Surfaced by the sweep's `version-dead` flag during T2.11–T2.23 and confirmed by enumerating every
preset across all seven `Calculator/presets_*.js`. In each case the code path is live in that
version but every fixture configuring the key there is an exclusion claim, so the **positive**
behaviour is unasserted and a regression in it would be caught by nothing.

| Key | Version | The only fixtures configuring it there |
|---|---|---|
| `blackSleep` | com2_1.05.11 | `magicImmunityGatesBlackSleep` — the eight positive fixtures in `presets_curses_and_undead.js` all resolve to mom_1.31 through `TEST_TREE` |
| `shatter` | com2_1.05.11 | `magicImmunityGatesShatter` — the sole other, `shatterBeforeSupremeLightCoM`, is com_6.08 |
| `landLinking` | com_6.08 | `landLinkingBeforeMysticSurgeRealmCoM` and `landLinkingRangedCoM`, both absence claims; the path is gated `version.startsWith('com')` at [stats_sequence.js:1024](Calculator/stats_sequence.js:1024) |

Add a positive fixture per key with its expected value derived from the code and its `desc` stating
the arithmetic that derivation implies. This is not mechanical — each needs the value worked out and
verified, which is why it is split by version.

Subtasks: **F215.1** the two CoM2 keys; **F215.2** CoM 1 Land Linking.

### F216 — The Land Linking version-difference subgroup demonstrates nothing about versions

`landLinkingRangedCoM` and `landLinkingRangedCoM2` sit in a subgroup of the group named *Version
differences tests* ([test_tree.js:1191](Calculator/test_tree.js:1191)) and both expect the identical
`0 / 2.000`. That is exactly the degenerate shape `versionDifferenceGroups` detects
([preset_vacuity_sweep.js:129](tools/preset_vacuity_sweep.js:129)): whatever the arithmetic does, a
version-difference subgroup whose members share one expectation shows no version difference.

Both fixtures are individually sound — each pins the breath-only gate in its own engine — and both
carry `keep` declarations from T2.18. It is the **grouping** that is empty, and there is no
`vacuity` key for a group-level finding, so no verdict can settle it; only a fixture change can.

Needs F215.2: the positive CoM 1 Land Linking assertion that item adds may be the natural contrast
member, in which case the two items resolve together and this one should say so rather than
duplicating the work. Neighbouring subgroups in the same group — Supernatural, Endurance, Holy
Weapon, Holy Armor — were checked and all have distinct expectations, so this is a single
degenerate subgroup, not a pattern.

### F145 — Route version membership through the `SCOPE_*` sets

218 open-coded tests across 17 sources re-derive version membership by string prefix (155
`startsWith`, 63 exact `===`/`!==`), and the same fact is re-derived as a local 22 times under five
names (`isCoM2`, `isModern`, `isWarlord`, `isCoM`, `isCoM1`). `steps.js` already owns the vocabulary
as exact-member sets — `SCOPE_DOS`, `SCOPE_MOM`, `SCOPE_COM1`, `SCOPE_COM_PLUS`, `SCOPE_MODERN`,
`SCOPE_WARLORD` — with two membership readers over them that halt on a key with no scope.

**SPEC settles both halves**: "Version is a dimension of the model, not a set of conditionals added
at each point of need", plus the fail-loud rule. So add family predicates over the existing sets
(`data-scope="core" data-worker`, no new bundle cost and no new scope tag) and route the sites
through them, **taking the halt** — `version.startsWith('com2')` answers a silent `false` for an
out-of-range version today and the run continues with a DOS-shaped answer. Collapses ~199 of the 218
sites; the ~19 genuinely single-version tests keep their meaning through the one-member scopes.
Equivalence is exhaustively checkable: the domain is five ids.

Subtasks: **F145.1** add the predicates; **F145.2**–**F145.5** roughly 55 sites each, by source.

## Structure and duplication

### F153 — Give the modern gaze rider exclusion one home

`gazeTouchParams` (`combat_phases.js`) zeroes the six rider probabilities under
`modernGazeSkipsRiders`, and `buildAttackerGazePhase` / `buildDefenderGazePhase` separately hardcode
`poisonStr`, `poisonFail`, `stoningFail`, `deathTouchFail`, `exorciseFail` and `destructionFail` to
0 and `lifeStealMod` to null in their `isCoM2` `commonSpec`. Ablating either copy alone moves
nothing; only both together do. The phase builder is the site that binds. CoM2 and Warlord, no
number moves.

### F146 — Give the seven roster facts the card and matrix decode separately one reader each

`hp`, `melee`, `defense`, `resist`, `to_hit`, `category` and `name` are each read by both
`setRosterUnitRecords` (`ui_units.js`) and `buildMatrixUnitStats` (`ui_matrix.js`). 14 of the 23
roster fields the sources read have more than one reader, from a 29-field record; that count is a
floor, since a decode through a local is invisible to the sweep. The argument-record axis is clean
and needs no work. Reproduce with `node tools/drift_class_sweep.js readers`.

### F147 — Five derivation values are read by nothing

`liveRace` (`stats.js:1134`), written beside `liveFantastic` which 13 sites read; and four of the
five Marionette strayed-branch grants (`stats_identity.js:495-501`) — `sage`, `mechanicalMaster`,
`ritualMaster`, `arcaneWard` — written in the same object literal as `rebuild` (36 reads),
`charmed` (24) and `spellLock` (17).

**`transmuteEquipment` is excluded and must not be deleted (F256.1, 2026-09-08).** The premise this
item used to carry — that the flag "is implemented as `b:transmuteEquipment:heroAugment`, so the flag
is a redundant second home" — is wrong twice over. Since F244.3f that step's gate is
`u.transmuteEquipment` rather than the branch constant, so the flag is the step's **only** input,
not a second home for it; and the engine grants the same permanent flag from seven further paths
outside the Marionette package, one of them a live cast, while Rust's cast clears it from an
eighth. Those sites are recorded with citations on the `transmuteEquipment` entry in
`Calculator/stats_origins.js`. F256 closed over them — the cast is a control (F256.2) and the six
equip-rule sites are out of scope (F256.3) — and F242 owns the clear; the key is not write-only,
and this item leaves it alone.

`package.grantedAbilities` publishes the same eight grants as display labels and nothing reads that
either. Also `REALM_PANEL_CLASSES` (`ui.js:206`) names `panel-realm-normal`, the one of its seven
with no rule in `style.css`.

Absorbs F205's three `luckyPhase*` markers. Reproduce with
`node tools/drift_class_sweep.js writeonly`.

### F140 — The matrix computes a row and column for the card that nothing renders

`buildMatrixCache` (`ui_matrix.js`) appends `selectedMatrixUnitRow('a')` and `('b')` to `attackers`
and `defenders`, then publishes `allAttackerIndexes`/`allDefenderIndexes` from the lists *before* the
append, so the appended row and column reach no cell. Two consequences: the extra combat resolution
is discarded, and the `info.unitId != null` guard in `applyMatrixCellToMain` has an unreachable false
branch. Settle which was intended — render the selected unit as its own row and column (the append
already builds the labels), or drop the append and the guard branch with it.

### F151 — Build a version's default-state map without resetting the live page

`getDefaultIds` (`ui_state.js`) sets `_restoring`, calls `resetCalculatorState(version)` — which ends
in `recalculate()` against foreign state — snapshots the result, then `applyFullState(saved)`. Its
comment claims the dance never disturbs what the user sees; it does disturb it transiently, and an
observer that latches the transient keeps the wrong state after the restore. F134 fixed the one latch
found, at the observer. Derive the defaults from the same definitions `resetCalculatorState` reads, or
in a detached document. The cost is that path's breadth: unit-dropdown population, per-version control
visibility and default-unit selection exist only as live-DOM mutations today.

### F128 — Delete the `Other` unit category no roster can fill

`populateUnitDropdown`'s `categoryOrder` (`ui_units.js`) names it. Across all four rosters the
categories emitted are the 18 race names, `Generic`, `Special` and the six realms, and neither
generator family can produce `Other`. Since F116 the loop throws on an unnamed bucket, so the list is
an enumeration and a member nothing can satisfy is a claim without a referent. Either delete the
entry or record what would produce it.

### F129 — Give the version-scope sweep's shared attack slot a strength

`baseUnitInput` (`tools/unit_checks/assertions.js`) seeds `rtb: 0` and the sweep never overrides it,
while every read that asks whether the unit *has* that attack is gated on a positive strength.
Measured over the full cross-product: the corrected 14-token list adds no newly applied step over the
old 10-token one, because at strength 0 the token only names an empty slot. Re-running at `rtb: 4`
adds six applied writes, all Warlord, and strength 0 uniquely reaches one, `b:fieryFury` — so both
shapes are real. Blocked on cost, not evidence: sweeping both strengths takes
`node tools/node_unit_checks.js` from ~11s to ~20s. Choose between both strengths across the
cross-product, the positive strength plus a compact zero-strength pass, and leaving it.

### F182 — Drop or fix `derivation_equivalence.js`'s dead `chaos-channels` env

The env is `{ chaosChannels: 'demonWings' }` but `input.chaosChannels` is read nowhere in
`Calculator/` — all 47 occurrences are step ids, `PROVENANCE` labels or helper names. The three real
controls are the `ccDefense`, `ccFlight` and `ccFireBreath` booleans. An env is drawn per combination
case, so a dead one spends a share of the 3900 combinations per version on a duplicate of `plain`.
Decide whether an env may carry abilities at all — the combination pass overwrites `over.abilities`
today, so it cannot — then either drop the entry or give the pass a way to merge one.

### F240 — Delete the dead `traceBasePreparation` trace

*Category: other.* Approved 2026-09-02 from the F210 close.

`traceBasePreparation` in `Calculator/stats.js` (near line 492) has no call site, so
`basePreparationTrace` is always empty and its entries never reach a tooltip. Delete the helper, the
array and the spread that seeds `statTrace` from it. One subtask; moves no number.

### F272 — The 45 marked keys the record does not carry

*Category: faithfulness.* The control census is complete; F279.2 owns the design.
F272.1 is absorbed there. The previously counted 45 non-record marked keys are a starting list,
not the coverage boundary: a control absent from the origin table must still be investigated.

Migrate each assigned effect from its requested input through admission, record writes and all
consumers, using the engine record and execution pass established by F279.2. Wizard properties
and battlefield conditions stay external where the engine makes them external. Do not invent a
unit flag merely to make every control fit one shape.

For every batch, enumerate its control/version rows from the census, audit aliases and other
grant producers, and identify expected numerical changes before accepting them. A change limited
to representation may preserve numbers; corrected eligibility, record choice or order may not.
Use source-backed preset cases for admitted/refused and order-sensitive combinations, including
innate versus cast cases where both exist. Existing suites carry structural/trace claims; no new
suite is implied by this migration.

- **F272.2a** position the remaining beneficial-effect presence writes consumed by Warlord Rust's
  clears: Transmute Equipment, Resist Elements, Elemental Armor, Flame Blade and Guardian Wind.
  Reuse fields/writes already implemented; cover each effect's supported versions and other grant
  producers. F272.3 owns the elemental pair and must finish first; this subtask owns only the
  remaining gaps in the named group. No Rust clear is implemented here. Needs F272.3.
- **F272.2b** migrate the first dependency-ordered group of the remaining same-named condition
  flags identified by the full control census, excluding the owners above and the dedicated rows below.
  F279.4 fixes the exact list before execution. Needs F279.4.
- **F272.2c** migrate the second group of that same fixed list. Needs F272.2b. Keep each effect's
  admission, grants and consumers together; F279.4 must size both groups for one prompt each.
- **F272.3** give the independent `resistElements` and `elementalArmor` requests the record
  representation and admission writes the evidence requires, and move their consumers to those
  fields. F251.2 retires `elemArmor`; do not create a new field under its retired exclusive shape.
  Building and intrinsic grants compose with the admitted casts. Needs F251.2 and F279.3b.
- **F272.4** migrate modern `fear` and `immolation`, preserving innate/cast origin and the DOS
  Cause Fear contributions the evidence keeps separate. This is the dual-source pilot. F275 owns
  Immolation's additional Cold Immunity write. Needs F273.2 and F279.3b.
- **F272.5** migrate `teleporting` and `undead` using the census's source-specific record and
  consumer mapping. Preserve the intended meaning of innate controls; resolve unsupported
  assumptions rather than treating a historical deviation reference as proof. Needs F279.4.
- **F272.6** migrate `hierophany`, `mislead` and `soulFlay`, with their admission, grants and
  record readers. Needs F279.4.
- **F272.7** give Rust its admitted state and move the melee -3 reader off the bare requested
  `rust` key. Reuse F276's targeting decision and record/time choice; do not introduce a second
  eligibility predicate. F242 owns the permanent clears. Needs F276 and F272.2a.

The old boundary-OR alternative is a possible user decision, not an implicit exemption. Any
chosen deviation must be explicit under the contract's proposals process. F279.5 checks coverage
of the whole census, including effects that are not members of F272's original list.

### F273 — Two seeded keys ride the template seed's transform arm

*Category: faithfulness.* Warlord. The training-grant pilot. Absorbs F200 stage 3 and Q30; those are no
longer separate implementation owners. Needs F209.2, F213.2 and F279.3b.

`lucky` (`applySanctaBasilicaGrant`, `applyPillarOfFaithGrant`) and `magicImmunity` (Sancta
Basilica's Paladin grant) currently enter the sequence through the template seed's
`transformWrote` arm, although their producers are training writes. Position the grants before
removing the carry, so the migration cannot silently drop them.

- **F273.1** migrate Sancta Basilica's ability writes onto its training positions and settle Q30
  in the same source block. `CreateUnit.CAS`'s Basilica branch gives unit IDs 108 and 231 Sanctify
  plus their Exorcise writes, 111 Lucky, and 113 Magic Immunity (the block between
  `CreateUnit.CAS!NOFROSTCLUB!` and `CreateUnit.CAS!NOBASILICA!`); its +3 Resistance precedes those
  mutually exclusive branches. `applySanctaBasilicaGrant` currently gives Sanctify to Crusaders
  and Paladins as well. Correct that over-wide grant while moving the writes, using the source's
  unit IDs and the building eligibility evidence, not display-name suffixes. Verify the resulting
  realm and immunity interactions and report numerical changes. `DisAbil.CAS`'s combined display
  line (`DisAbil.CAS~"new effect of Sancta Basilica"`) is not a grant rule. Needs F209.2, F213.2 and F279.3b.
- **F273.2** migrate Pillar of Faith's Lucky grant; then remove the obsolete early grant
  transformations and the template seed's grant-carry arm after checking all its writers.
  Innate seeds remain innate and each training grant appears in the execution/hover trace.
  Any remaining producer outside these two buildings is recorded in the census and must be
  resolved before removing its only path. Needs F273.1.

### F277 — CoM 1 runs `BU_Apply_Specials` twice, and the chain models one pass

*Category: faithfulness* (remaining F277.3). Approved
2026-09-09 out of the F267.1 close discussion. CoM 1, and CP 1.60 for the same routine.
**Absorbs F274**, which framed this as a rank correction; the evidence says it is a double-execution
problem, and a rank alone cannot express it.

`BU_Apply_Specials` has **two callers running the same routine body**: the constructor, inside
`Load_Battle_Unit`, and the stat recompute, inside `BU_Apply_Battlefield_Effects`
(`Reference docs/DOS reconstructed/R6.1a.evidence.md`, "CP 1.60 and CoM 1 moved Holy Weapon out of
the constructor"). What differs is the argument: the recompute is passed
`(unit_ench XOR bu_ench) AND bu_ench`, so an enchantment the unit record already carries is filtered
out of the second call — the Holy Arms grant and to-hit normalisation do not read `ench`, so their tests run in both
calls. Mutation-only writes instead depend on the supplied mutations byte, which is zero in
the second call; CoM Blood Lust can set its local Undead bit during that call.

The calculator's region `c` combines constructor, Specials, battlefield and external-handler writes
in one ordered list of 50 steps. The completed [execution census](Reference%20docs/DOS%20reconstructed/F277.1.execution-census.md) maps all 50 and CP 1.60's 37, including conditional repeated calls and compound HP steps. The chain has no invocation vocabulary. R6.1a
records that normalization is usually inert on repetition, but can change the result if a
`melee_tohit`-only bonus arrives between calls. That is not a claim that the entire second
Specials invocation is inert.

**CoM 1's combat summon has a caller-boundary ordering problem.** `BU_UnitLoadToBattle` writes `bu->race` and
`bu->Abilities |= UA_FANTASTIC` (com1:0x75D56/0x75D65/0x75D6C) after `Load_Battle_Unit` returns and
before `BU_Apply_Battlefield_Effects` runs, so the unit acquires realm and Fantastic state between
the two calls. F267.1 ranked those writes at the head of region `a` to keep its reclassification
free of number movement, and labels the rank a deviation in `stats_manifests.js`. It is not
listed in the current contract, so it remains a defect rather than an accepted design. Until this item lands, a CoM 1 combat summon's realm and Fantastic flag are visible to effects inside the
first call that should not see them.

The completed [invocation decision](Reference%20docs/DOS%20reconstructed/F277.2.invocation-decision.md)
uses one shared Specials routine with distinct call positions, arguments and trace occurrences.
F279.2 designs its representation; F279.3a implements the pilot support.

- **F277.3** extend the pilot's execution support to the remaining affected DOS schedule,
  preserving per-pass enchantment arguments and matching execution/hover traces. Then the two
  combat-summon conversions take their evidenced positions and the
  temporary head-of-`a` placement and its deviation comment in `stats_manifests.js` retire. **Numbers move in CoM 1 combat-summon
  runs**; enumerate them rather than accepting whatever changes. Needs F279.3b.

### F275 — Immolation's cold immunity is not modelled

Needs F272.4. Completes the dual-source pilot with its source-specific Cold Immunity grant.

*Category: faithfulness.* Approved 2026-09-07 as low priority, out of the F252.2 close block.

In CoM2 and Warlord a **cast** Immolation sets `U.coldimmunity` ($005A00E7); an **innate**
Immolation does not, and the DOS builds grant none. The calculator models neither, so a unit under
cast Immolation is missing a Cold Immunity the modern engines give it.

The innate/marked split F252.1 built is what makes the distinction expressible: the grant belongs
to the marked half's positioned write alone. `immolation` is one of the 45 keys F272 covers, so if
F272 gives it a record field, do this row after F272.4 and write the immunity beside it. One
subtask.

### F276 — Rust's targeting gate reads the wrong record

Needs F279.3b. Owns Rust's one targeting decision, reused by F272.7 and F242.
Use the calculated record at targeting time under F279.2's design, not the final post-Rust
record; this must not introduce a circular derivation.

*Category: faithfulness.* Approved 2026-09-08 as low priority, out of the F264.1 close. Warlord.

F264.1 read the dispatch: a `SpellTypeGroup = 16` (`SGUnitCurseNormalUnit`) gate reads the
**calculated** `Units[u].Fantastic` (`Reference docs/Caster binary/F264.1.evidence.md`). Warlord Rust
is spell 88, group 16, so that is the record its targeting gate reads.

F246 implemented `rustActiveAt` on `permanentFantasticAt` (`Calculator/stats.js`) — the permanent
record — on the strength of the `CLAUDE.md` ruling F264.1 overturns. The implementation is therefore
known-wrong rather than merely unconfirmed, and the 40-line comment that labels the choice a ruling
is now stale.

Flip the gate to the calculated record and retire the ruling comment. **2,117 measured Warlord cases
turn on it**: 1,485 where Rust currently lands and would stop, 632 Spirit-Link-plus-Destiny cases
where it currently does not land and would start — the direction `UnitCalc.CAS`'s Spirit-Link
tail-clear comment predicted. Enumerate both classes rather than accepting whatever moves.

Consumers to check: `stats.js` (two sites), `stats_sequence.js`. The melee −3 is a separate bare
`hasAbil(abilities, 'rust')` in `combat_abilities.js` with no Fantastic term at all, and F272.7 owns
that one.

Shatter is **not** in scope: Warlord moves it to id 272 with `SpellTypeGroup = 13`. Base-CoM2 Shatter
(id 88) is group 16, but base CoM2 has no Rust.

### F278 — Measure what the matrix worker's nine-source subset buys

*Category: other.* Approved 2026-09-09 as low priority, out of the F269.1 removal.

`matrixWorkerSource()` (`Calculator/ui_matrix.js`) builds the worker blob from `index.html`'s
`data-worker` script tags — **nine of the 24 `data-scope="core"` sources**. Nothing in a core source
says whether the worker loads it, so moving a function between two core files leaves `npm test`
green and the page working while the worker throws `ReferenceError` and the matrix renders nothing.
F268.6 demonstrated it with `convolveDists`.

F269.1 guarded that with a Node check; the check was **removed 2026-09-09 on the user's ruling** that
`tests/matrix.spec.js` already fails the class and discovery at the next `test:all` is acceptable.
Do not reintroduce it. The subset itself is untouched, and importing all 24 core sources would
delete the failure class rather than detect it.

What is unknown is the price. Measure, with numbers rather than estimates:

- blob size and per-worker parse/startup time, nine sources against all 24;
- how many workers a matrix run spawns, and whether the sources are parsed once per worker;
- the wall-clock change for a representative matrix, against the ~7.6 ms/cell realm figure F260.9
  measured.

Then either widen the worker to all core sources and delete the `data-worker` attribute along with
the distinction it encodes, or keep the subset and record the measured cost as the reason. One
subtask; the close block puts the choice to the user with the numbers attached. Moves no number
either way — the worker runs the same sources the page does, and F269.2 already gave the matrix the
card's own input path.

### F271 — The merged-`abilities` compatibility arm is deleted

*Category: other.* Prerequisite for source-sensitive effect migration. Needs F279.2.

`deriveUnitStats` accepts a merged `abilities` map as well as `innateAbilities` and
`markedAbilities`. `splitAbilityCalcValuesBySource` puts a dual-source value in both halves.
That cannot establish the original source once admission or execution depends on it.

- **F271.1** inventory every merged-input caller and shared test factory, and state the intended
  source of each ambiguous dual-source value from the caller's actual claim. Partition callers
  among the next four batches, with explicit file ownership and bounded lists. Do not copy the
  old splitter or infer both sources merely because both controls exist. Unresolved intent is a
  decision to settle before converting that caller. If a batch cannot fit one prompt because
  intent is ambiguous, propose its concrete split before execution. Needs F279.2.
- **F271.2** convert the callers in `tools/unit_checks/derive_unit_stats.js` to explicit halves,
  preserving each assertion's intended source. Needs F271.1.
- **F271.3** convert the remaining `tools/unit_checks/` callers and shared factories. Retain
  the merged API only while the last caller batch still needs it; do not add a replacement
  compatibility helper. Needs F271.2.
- **F271.4** migrate `readMatrixCustomUnitStats` in `Calculator/ui_matrix.js`: it currently
  merges innate DOM values with matrix enchantments and calls the splitter. Preserve those two
  sources separately through the shared card projection, including the DOS special block and
  matrix-side settings, rather than manufacturing origins after merging. Verify card/matrix
  equivalence for dual-source cases and account for any corrected overwrite behavior. This is
  page code and runs the page suite selected by `TESTS.md`. Needs F271.3.
- **F271.5** convert the root `tools/` probes, sweeps and any other callers identified by
  F271.1. Recheck sweep coverage of both sources and their combinations rather than keeping the
  former one-value/two-sources assumption. Needs F271.4.
- **F271.6** remove the merged-input arm and `splitAbilityCalcValuesBySource`, verify that no
  caller remains and run the required suites. A caller conversion that changes the state being
  tested must explain that change; a green suite alone does not establish preserved intent.
  Needs F271.5.

The definition lists keep one home. Saved-state import is a different boundary and this item
does not remove promised saved-link migrations. Subsequent effect migrations use only the two
explicit source inputs and the separate external context agreed by F279.2.

### F269 — The post-combat panel shows Bonus HP / figure, which is out of scope

*Category: decision.* Approved 2026-09-06.

`renderCombatStateSummary` (`Calculator/ui.js:513-544`) closes the *Post-combat damage by type*
panel with a `Bonus HP / figure` row, labelled `Extra Hits / figure` on the DOS versions
(`ui.js:521`). The user has ruled the quantity out of the calculator's output: it is battle-scratch
state in the DOS engines (`Extra_Hits` is a battle-unit field, zeroed by the battle-unit
constructor at `unitcalc.c:2026` and again for survivors at `combat.c:1443`), and on the modern
side `Combatheal` writes `BaseUnits[u].bonushp` (`Combat.DamageHandling.pas:105-108`) with no
reconstructed clear path, so what the number means past the click is unsettled.

Remove the display only. The quantity stays in the model: it raises HP per figure inside the
attack (`HpPerFigure = hp + bonushp`, `Units.RecalculateUnits.pas:2924`;
`combatHealTransition` and `combatHealLivingFigures` in `Calculator/engine.js`), so deleting it
from the engine would move damage numbers. Nothing binding mandates the row — `CLAUDE.md`'s
*Input/output contract* does not name the panel, and its *Deliberate deviations* entry covers
Bonus HP as an **input**, which this does not touch.

Touches: the `bonusLabel` line and the final `<div>` of the panel's `innerHTML`; the
`extraHits` entry in `COMBAT_CATEGORY_PANEL_ATTRIBUTES` (`ui.js:498`) and its `data-bonus` /
`data-sdBonus` writes; the `['bonusHpTo', 'sdBonusHpTo', 'extraHits']` column in
`tools/preset_checks.js:433` with its per-preset expectations; and the `bonusHp` row in
`tools/generate_preset_stdev.js:79`. `tests/life-steal-healing.spec.js` asserts the engine-level
`state.extraHits` and is unaffected.

One subtask, last in the queue on the user's 2026-09-06 ruling. F268.7 lands the
`bonusHpTo` corpus column before this pulls it; that is the order, not a blocker.

To decide in the subtask: whether the `data-bonus` / `data-sdBonus` attributes and the preset
corpus column go with the visible row, or stay as a headless regression channel on a quantity that
still moves numbers. Recommend they go — the panel is the display, and a data attribute nothing
renders is a second home for a number the engine already publishes to the Node checks.

### F279 — "Marked write" and "recalculation write" hide a missing eligibility gate

*Categories: documentation (F279.1a–F279.1f, F279.4), decision (F279.2), faithfulness (F279.3b, F279.3c),
other (F279.3a, F279.5).* Scope and ordering revised on the user's approval, 2026-09-10.

Holy Weapon exposed a mechanism gap when the user asked about it as an example. It is a pilot,
not the scope of completion. This item owns coverage of every exposed ability, enchantment and
condition control in each supported version, including controls absent from the origin table.
F272.1's investigation is absorbed into this census; its historical 45-key count is not a limit.

The census is split by columns and engine family so each subtask has one bounded reading.
The completed F279.1a inventory is `Reference docs/Stat derivation control census.md`;
F279.1b DOS and F279.1c modern admission/writers and F279.1d DOS and F279.1e modern consumers are complete, including F279.1f reconciliation. Task status remains here.
They inspect current code and available evidence, not fresh disassembly. Unknown source facts
remain named gaps; source mapping and missing binary evidence are distinguished in the reconciliation. Controls absent from the origin table must still appear.
F279.1b–F279.1e also record available evidence for recalculation boundaries around cast applications,
including which writes during recalculation mutate the permanent record and which rebuild or modify
the calculated record. Identify missing caller/timing evidence explicitly; reading a calculated
field does not by itself establish that a full recalculation runs before every cast. The census
reconciliation names existing owners and individually enumerated unfiled P-family/U1–U3 proposals;
these are not approved tasks. F279.2 and dependent .3c/.3b work remain gated on required pilot
timing/target evidence (P1/P2/P8.1 and resulting separately approved evidence work).
Later-only gaps gate their own migrations and .5.

- **F279.2** settle one design from the completed census, the completed [invocation decision](Reference%20docs/DOS%20reconstructed/F277.2.invocation-decision.md) and the relevant admission evidence. Separate
  requested effects from admitted record state, source regions from execution passes, and source
  write identity from its invocations. Preserve template/permanent/calculated record distinctions
  and external wizard/battlefield state where the engine does. Admission must read the record
  at the time the evidence specifies: F276's calculated-record targeting cannot be replaced by
  a blanket permanent-record rule or by the final post-cast output. Design an outer attempted-cast
  sequence invoking reusable recalculation under the assumed cast order. Carry permanent state,
  including mutations made during recalculation, forward between casts; establish calculated-record
  reset/copy rules and recalculation boundaries from evidence. Cast application must not be replayed
  merely because recalculation runs again. Specify how admission and repeated invocations appear
  in the traces. Cost faithful alternatives
  and any proposed deviation; settle vocabulary and submit necessary contract text through
  `PROPOSALS.md`. No code migration. Needs P2, P8.1 and required resulting engine evidence; uses completed P1, F250, F236.1 and F277.2.
- **F279.3a** implement the execution-schedule and trace support chosen by F279.2 for the pilot:
  distinguish a source write from its invocations, with explicit per-pass arguments and record
  reads. Preserve the currently executed schedules and numerical behavior in this representation-only
  step; F279.3c introduces the outer sequence and F279.3b migrates Holy Weapon. Update affected
  trace/citation consumers together, using existing suites for structural claims. Needs F279.2
  and F271.6.
- **F279.3c** implement the outer attempted-cast sequence for the pilot using F279.2's design and
  F279.3a's executor. Category: faithfulness. Approved 2026-09-10. Check each attempted cast against
  the appropriate current records, apply admitted cast writes once for that application, and invoke
  recalculation at the evidenced boundaries. Carry permanent mutations from both cast application
  and recalculation into subsequent attempts; rebuild the calculated record only as the evidenced
  schedule specifies. Keep the scope to the shared executor and pilot integration; F279.3b owns
  Holy Weapon's gate/consumer migration and later tasks own the remaining effects. Verify an earlier
  cast can change later eligibility, permanent mutations survive recalculation, calculated-only
  changes follow the reset rules, and earlier cast writes are not replayed. Use existing suites for
  executor claims and preset fixtures for sourced numerical corrections; report every number change
  and execution/admission trace. Missing timing evidence blocks its dependent implementation.
  Needs F279.3a.
- **F279.3b** migrate Holy Weapon across all five versions as the first complete cast-to-consumer
  pilot. Implement its evidenced admission and presence writes and have its stat/weapon readers
  consume admitted state at the correct execution positions. Distinguish the cast from Holy Arms
  and other grant routes; do not copy a global grant's target restriction onto the cast without
  evidence. F236.1 supplies the CoM 1 grant distinction. CP 1.60 and CoM 1 repeat the routine
  with a different enchantment argument, so do not blindly apply the same bonus twice. Exercise
  admitted/refused, innate/granted where applicable, and order-sensitive combinations; report
  expected numerical corrections and traces. Use F279.3c's outer sequence; F277.3 owns the
  remaining affected DOS schedule and summon conversion migration. Needs F279.3c. Missing cast
  evidence must be resolved before claiming a faithful pilot; propose bounded reconstruction
  work rather than inferring eligibility from the recalculation reader.
- **F279.4** after the representative cases, reconcile the entire census with the implementation.
  Fix the exact control/version lists for F272.2b and F272.2c; map every other outstanding
  migration/evidence gap to one existing owner or propose a concrete new subtask with category,
  scope, dependencies and acceptance criteria. Group by interacting records and effects, not
  arbitrary batches that split one grant from its reader. Additional items require the user's
  approval before filing; do not treat approval of this planning row as approval of unknown
  implementation work. Insert approved required work before F279.5. Needs F273.2, F275, F242
  and F277.3. Re-size F279.5 into individually queued, one-prompt audit slices if the finished
  census is too large for a single review. This row does not close F279 or establish mechanism
  completeness.
- **F279.5** review the completed mechanism against every control/version row in the census,
  then check supporting documentation and remove remaining obsolete migration paths within this
  scope. Re-enumerate the live input surfaces so additions since F279.1f cannot escape the audit.
  Look for early transformations seeded as innate data, requested-map reads bypassing admission,
  lost grant/clear producers, wrong record/time reads, duplicate invocations and obsolete aliases.
  Audit cast-to-cast interactions across the migrated controls: admission sees the correct pre-cast
  records, recalculation occurs at evidenced boundaries, permanent mutations survive between casts,
  calculated state follows its reset/copy rules, and recalculation does not replay prior cast writes.
  Verify that admission and execution traces are emitted by the actual calculating path and that
  each numerical change has evidence and discriminating coverage. Passing preset totals alone
  is insufficient. Needs F279.4, F272.2c, F272.5, F272.6, F251.3, F257.3, F243, F249, F236.2,
  F232, F235, F226.1, F231, F207, and all further migration/evidence subtasks assigned by F279.4. **Blocked until
  that work is resolved:** an unapproved proposal, unresolved gap or merely deferred migration
  is not completion. Only an explicit accepted deviation can exempt a census row.

The ordered migration below uses F273 for training grants, F272.4/F275 for the dual-source case,
and F276/F272.7/F242 for Rust. F251 and F272.3 first supply the independent elemental fields
Rust clears. These are representative checks on the design; the remaining census rows must
still be migrated or explicitly accounted for before F279.5 can finish.

### F242 — Rust's cast clears nine permanent flags, and the calculator clears one

Needs F272.7 and F251.3. The destructive-cast pilot: F276 owns admission, F272.7 owns Rust's
admitted state/readers, and F272.2a/F272.3 own the clear targets' presence writes. Reuse those
fields and gates; this item owns the permanent clears and their downstream consequences.
Recheck which clears already exist at execution time; the historical count below is not a work list.

*Category: faithfulness.* Approved 2026-09-02. Warlord only.

The Rust cast (`COSpell.CAS`, the `SRust` block after `!NOTHIEROPHANY!`) clears, on the target's
permanent record after its resistance roll: `EncMagic`, `EncMithril`, `EncAdamant`, `EncOrihalcon`,
`EncTransmuteEquipment`, `EncResistElements`, `EncElementalArmor`, `EncFlameBlade`,
`EncGuardianWind`. F244.2 made the first three of those a step — `debuffs:rust:material`, which
clears the record's `weaponMaterial` — so the weapon half is done and shows in the chain. The
remaining six are not modelled: `EncOrihalcon` has a record field (`armorMaterial`, written by
`training:armorQuality`) and no clear, and the other five have neither, so a unit with Rust and
Flame Blade both marked still keeps Flame Blade. Add the six clears beside `debuffs:rust:material`,
under the admission F276 settles and the state F272.7 publishes. Measure: `EncOrihalcon` and the other five will move numbers.
One subtask.

### F243 — The figure count crosses the sequence split

Needs F279.2. Apply the settled record/pass model; recheck the historical implementation
description before editing so an already migrated field is not recreated.

*Category: faithfulness.* Approved 2026-09-02. Warlord only.

The figure sequence (`stats.js`, `figureSteps`) adds Altar of the Sun's +1 and the Academy's +2
after the stat sequence has run, and the stat sequence reads `baseFigs`, the card's count:
Endurance and Lionheart (`stats.js` near lines 850 and 858) and the figure-scaled grant at
`stats_sequence.js:584`. The engine divides by the finished `U.figures`. Preferred fix: `figs`
becomes a field of the stat record, the two figure steps join the main chain at their `training`
positions, and the separate figure run is retired. Measure before and after with a probe that
combines the two buildings with Endurance and Lionheart. One subtask.

### F249 — CoM 1's Raise Dead race write is a creation-time write, not a region-`c` one

Needs F279.2. Apply the settled record/pass model; recheck the historical implementation
description before editing so an already migrated field is not recreated.

*Category: faithfulness.* Approved 2026-09-03 from the No Heal merge. CoM 1 only.

`CMB_Raise_Dead` writes `bu->race = rt_Fantastic_No_Realm` directly at the resurrection site
(`combat.c`, com1:0xAB2B8) and only then calls `BU_Construct` and `BU_Apply_Battlefield_Effects`.
No block of `BU_Apply_Specials` makes that write, which is why `c:raiseDead` is the last member of
CoM 1's `DEDUCED_POSITIONS`: its rank is a guess. The resurrection is the unit's creation moment,
the same moment a trained unit's `training` writes are made, so the step belongs in `training`.

The modern builds are already correct and are not in scope: their Raise Dead race change is
`c:noHealConversion`, the transcribed `$005A0420` block the cast reaches through
`CombatEnchantmentFlags[EncNoHeal]`. CoM 1's own `c:mysticSurge:race` (com1:0x8F79E) is a real
region-`c` block and stays.

**This moves numbers**, which is the whole reason it is its own item: the race would become visible
to every gate in regions `a` through `c` that reads it and currently runs before the deduced rank.
Measure with the digest and with a probe saturating the CoM 1 realm and identity consumers, and
report which cases move and which consumer moved them rather than predicting the set. The resurrection's
other writes — half figures, the enchantment wipe, the damage clears — stay unmodelled: the
calculator starts from a stated card.

One subtask.


### F265 — `SPEC.md` does not exist

*Category: documentation.* Approved 2026-09-05 out of the F244.3h close. Low priority.

Roughly 60 comments across `Calculator/*.js` cite `SPEC.md` as the home of the fail-loud rule, the
out-of-range rule and the UI contract. There is no such file; the content is in `CLAUDE.md`.
Mechanical rename, no behaviour. Each agent that meets one currently rediscovers this.

### F257 — Wizard retorts become inputs, and the retort-gated ascension writes are modelled

*Category: faithfulness.* Approved 2026-09-04 out of the F244.3g close. Warlord.

The Marionette ascension block's retort tail writes `HASage`, `HAMechanicalMaster`,
`HARitualMaster`, `HACharmed`, `HALucky` and `EncSpellLock` a **second** time, each behind a wizard
retort: Sage Master, Artificer, Astrologer, Charismatic (two writes), Enchanter. The calculator
models none of it. F244.3f found the tail and scoped it out; F244.3g re-derived it and scoped it out
again. It is filed so it is not found a third time.

The current `CLAUDE.md` input/output contract includes the owning wizard's retorts among
conditions. The input work is complete; F257.3 implements the remaining retort-gated writes
using F279's separation between external wizard context and the unit record it changes.

Related but distinct, and not folded in: `soulLinkerAura` shows the calculator's existing answer to
"a wizard-level effect the unit is subject to" — a `nonRecord` input the user states directly, read by
`c:soulLinkerAura`/`e:soulLinkerAura`. F244.3g declined to model Conjurer's `HASoulLinker` write
because nothing in the tree reconstructs rank → aura magnitude, so a step would have no number to
write.

**F257.1 closed 2026-09-09.** The reading, the six writes (the Charismatic block holds two), their
citations, the version scope, and the ruling that retorts are controls in the `marionetteConjurer`
shape are in `Reference docs/Caster binary/F257.1 Marionette retort tail.md`, which states what
F257.2 and F257.3 each inherit. The `HALucky` write rests on an unread `ApplyHeroBonus`, filed as
`D37` in `Reference docs/Engine verification evidence.md`.

**F257.2 closed 2026-09-09.** Four Warlord-only boolean retort controls — `sageMaster`,
`astrologer`, `charismatic`, `enchanter` — stand beside `channeler` in
`Calculator/enchantments.js` with `nonRecord` origin rows; the tail's fifth retort, Artificer,
reuses the `artificer` control that already states the same wizard fact. The controls default off
and move no number until F257.3 positions the writes.

- **F257.3** the six writes become positioned steps gated on the new inputs, at their ranks in
  `UnitCalcPre.CAS` 303–356, one step per engine write. Report what moves. Needs F279.4;
  F257.2's input work is already implemented.

### T8 — Give the code's unsourced engine claims a citation or an evidence home

163 unsourced multi-line blocks remain, concentrated in `steps.js`, `combat_special_attacks.js` and
`combat_effects.js`. `tools/comment_citation_census.js` is the measurement; re-run it first.
`tools/comment_quotation_check.js` is the companion check on quotations — run it on each source
triaged and read every `MISSING` it reports, since it cannot tell an attributed quotation from the
author's own scare-quote.

Two things a round must know. The count is an upper bound and the margin is per-file: reading is the
only thing that separates a block documenting the code from an unsupported engine claim, and the
ratio has measured 77% code-doc in `steps.js` and 25% in `stats.js`. And a pointer closes the
evidence-home half but not the audit half — `npm run provenance` still cannot see a claim without an
anchor beside it.

SPEC requires citations for stat-derivation steps; the `combat_*.js` blocks are not steps, so that
half is quality work rather than a SPEC requirement.

Subtasks: **T8.1** `combat.js`; **T8.2** `combat_special_attacks.js`; **T8.3** `combat_effects.js`;
**T8.4** `combat_abilities.js` and `combat_phases.js`; **T8.5** the rest.

### F213 — The Warlord race-building gates have race and hero terms no script contains

T8's class, in one concentrated place, which is why it is filed separately: it is a single coherent
question about one subsystem rather than a per-file sweep.

`stats.js` gates all seven Warlord race buildings on `baseUnitRace === '<race>' && !isHero` —
Altar of the Moon, Altar of the Sun, Dragon Mound, Ludus Agoge, Mother Fungus, Pool of Repentance
and Sancta Basilica ([stats.js:158-220](Calculator/stats.js:158)). Per *Source routing* the Warlord
`.CAS` scripts outrank the compiled behaviour here, and the scripts do not carry those terms:

- **No hero test exists at all.** `CreateUnit.CAS` contains **zero** occurrences of `ISHERO`,
  checked case-insensitively over the whole file.
- **No unit-race test appears in any building block.** Each gates on `ISBUILT(C,B<building>)` — the
  city — and `RACE` in that region is `CITYRACE(C)` (`CreateUnit.CAS:6`). The file's one unit-race
  read, `GETSTAT(U,SRace,1)<>RCGeneric` at `:78`, is in the separate generic-to-racial conversion.

The comments justify the terms as matching the in-game race-exclusive building: `ISBUILT`
presupposes a city of that race, the calculator has no city, so it asks the unit. That is coherent
and may well be right — **the item is to give it a citation or an evidence home, not to remove it.**
Check the manual, the changelog and `UNITS.INI` before concluding a term is unsourced.

Two terms are already settled and are not in scope: `militaryWorkshopMeleeOnlyExcludedWarlord`'s
melee-only exclusion **is** script-backed at `CreateUnit.CAS:251-253`, and Ludus Agoge's Legionary
exclusion at `:339` via `STypeID=139` = Legionary (`Unit rosters/Warlord mod unit data/UNITS.INI:3876`).
So the gates are a mix, and each must be read on its own rather than swept.

Military Workshop's hero term is a third shape again: it comes from `baseNormalTrainingUnit`
([stats.js:320](Calculator/stats.js:320)), justified at `stats.js:299-305` from the changelog phrase
"base normal units" — a source, but a prose one, and worth ruling on.

Roughly 60 declared preset reasons from T2.21–T2.23 now cite `stats.js` for these terms and say
explicitly that the script does not carry them. Whatever this item settles, those reasons are the
places that will need re-reading.

Subtasks: **F213.1** the seven race terms, which also opens the evidence entry; **F213.2** the eight
hero terms into the same entry. Needs F213.1.

### F237 — The CAS audit cannot see two shapes of stale citation

Category: **other** (tooling). Filed 2026-09-02 on the user's approval, out of the F227 run.

`tools/cas_citation_audit.js` gates every citation it can attribute, and F227.3–.6 found two shapes
it cannot:

- **A locator followed by `/N`.** `UnitCalcPre.CAS:456/661` converted its `:456` and left `/661`
  dangling; neither the `:N` continuation heuristic nor the locator-tail check saw it. Found only by
  review (F227.3).
- **A bare `:N` or `:N-M`, or prose "line N", whose antecedent is not a locator.** The heuristic sets
  an antecedent only on a `File.CAS:N`, `!` or `~` form, so a continuation under a
  `File.CAS@span:…` provenance line, or after a bare `File.CAS` mention, is attributed to nothing.
  28 `CreateUnit.CAS` continuations hid that way, 17 found only by review (F227.5); F227.6's wide
  scan found more across the other scripts.

Extend the audit so both shapes are attributed and gated: reject `/N` after any locator, and take a
`@span` line or a bare `.CAS` mention in the same paragraph as a continuation antecedent. Keep the
census of non-script `:N`s (Pascal, `.c`, `.INI`, table columns) reported and ungated, as the wide
scan classified them, or the new rule will fire on every one. Registry entry stays `scaffolding`.

### F270 — The tooltip system is overhauled

*Category: other.* Approved 2026-09-07 on the user's ruling, filed **low priority and deliberately
late**: nothing depends on it, and it is a rewrite rather than a repair.

Every ability and enchantment control carries a tooltip describing its modelled effect
(`CLAUDE.md`, *Input/output contract*), and the hover chain on a calculated value is a separate
mechanism again (R7.3/R7.4). The two have grown independently and the wording is authored
per-control with no shared shape.

**What the F268 pass changed for this item.** F268.4 and F268.5 deleted the tooltip *content*
assertions for eight controls — `mechanicalExpert` (its eight named roster units, its Mechanical
Master disjunct and its "not modeled" disclosure), `exorcise` (literal-modifier and blocker lines),
`supernatural` (two lines, the only place a user learns CoM 1's trait is inert), the six touch
riders' "never on Gaze" line, the three gaze abilities' level line, and `#rangedDistLabel`'s hero
note. **Nothing now fails if one of those tooltips is deleted or reworded.** Tooltip content is
still asserted for Cause Fear, Cloak of Fear and Death Immunity in
`tools/unit_checks/backlog_checks.js`, and by the two modifier-trace tooltip suites.

Both disposition passes recommended the same interim measure, which this item should either absorb
or supersede: **one shared presence-and-type check over every ability and enchantment tooltip**,
which serves the contract's requirement better than per-control wording snapshots and costs one
assertion per def. If the overhaul is far enough away, that check is worth doing on its own first.

## Roster and documents

### F115 — Name the 44 Warlord spell ids the roster renders as `Spell#N`

44 of the 50 spell ids the Warlord roster uses have no display name, so 95 `Spellcaster=` entries in
`units_warlord.js` read like `Spell#260x3`. `SPELL_NAMES` in both roster generators lists six (Web,
Fireball, Doom Bolt, Healing, Raise Dead, Summon Demon); a miss renders the record's own id verbatim.
Nothing in `Calculator/` reads the value — only `tools/generate_com2_unit_roster.py` displays it — so
this is roster-document quality, not a calculation defect. `MASTER.CAS` is the numeric id map
(`S<Name> = <id>`) and `DESC.INI` carries the display spellings; transcribe both and reconcile them,
since the six existing entries use display names. Regeneration must move only these strings.

### T15 — Fix the Markdown roster tools' drift from the roster JSON

`RANGED_TYPE` (`tools/generate_mom_com2_unit_comparison.py:13`) is a third copy of a map T12 deleted,
keyed `missile`/`rock`/`magic_c`/`magic_n`/`magic_s`; every roster JSON carries the display spelling
instead, so no key matches and the tool's Ranged column falls to its `"?"` default. Drop it as T12
did. Separately, `breath_str` in **both** tools reads `breath` and `breath_type`, keys no roster JSON
has — the records carry `fire_breath`, `lightning_breath`, `thrown` and
`thrown_breath`/`thrown_breath_type` — so the Breath/Thrown column reads `-` for all 194 CoM2 units,
hiding 10 fire-breath, 2 lightning-breath, 8 thrown and 20 thrown-breath attackers, and `BREATH_TYPE`
is dead with it. Deciding which of those four fields the one column shows is the work. Only
`Unit rosters/CoM2 unit roster.md` regenerates.

Check whether the untracked `tools/generate_com2_warlord_unit_comparison.py` is a fourth copy.

### F238 — The Warlord source-order tables are pinned to a script set the tree no longer ships

Category: **documentation**. Filed 2026-09-02 on the user's approval, out of F227.6.

`Reference docs/Caster binary/CoM2 binary - unit recalculation.md` §"Warlord regions b and d:
source order" carries two `| Lines | Ordered block |` tables (46 rows) and six prose bullets whose
line numbers are 1.5.12.7's, pinned by the section's own md5 table. F227.6 left them whole and
corrected the preamble to say the release is no longer shipped and is recoverable at `2c0fd48^`.

They are not stale against what they cite, which is why F227 did not convert them: the section
states its referent. But they are the last script line numbers in the tree, and a reader who wants
the order in 1.5.12.9 has to re-derive every row against the alignment tables the F227 journal
entries record (`UnitCalcPre.CAS` shift 0 through 1084, +11 from 1119; `UnitCalc.CAS` +2 from 49, −8
from 345).

Re-derive the section against `Warlord 1.5.12.9` with each row bounded by the enclosing `!LABEL!`
rather than a line number, so the next script swap moves nothing. This is a reading of ~50 blocks,
not a citation swap.

## Heroes

### F41 — Engine-specific hero progression

*Categories: faithfulness (F41.1–F41.3), decision (F41.4).* Start from existing source and
implement its supported behavior using Method A. A new binary reconstruction is required only
for a specific necessary fact absent from the existing coverage, using Method B for that extent.

The DOS eight-threshold ladders and template-ability formulas (including CoM's Blademaster divisors,
mana table and Lucky rewrite), plus the modern nine-step hero table. Decide how the current
six-entry level control exposes them. Evidence: R6.1f hero ladders and abilities; CoM2 level-bonus
tables; `combat_abilities.js:43-78`.

Hero *equipment* is deferred by SPEC until everything else works; this is progression, not equipment.

Subtasks: **F41.1** apply the DOS ladders from the existing `BU_Apply_Level_Bonus` reconstruction;
**F41.2** apply DOS template-ability formulas from `BU_Apply_Hero_Abilities`. Both bodies and
their three-build coverage are in `unitcalc.c` and
[R6.1f](Reference%20docs/DOS%20reconstructed/R6.1f.evidence.md); do not rederive them wholesale.
**F41.3** reconcile the modern nine-step table with existing level-bonus evidence before
implementation, identifying any actual missing extent rather than assuming DOS coverage applies.
**F41.4** decide how the level control exposes the evidenced progression.

### M3 — The older-engine Destruction path

Present in all three DOS builds but hero-only, so unreachable until F41 lands. 1.31 adds the
defender's per-figure hits where CoM 1 adds a flat 100. Include elemental protection. **Blocked by
F41**, and it is what makes F180's `destruction` control correct-but-inert in the DOS versions today.

## Open evidence questions

Each is one prompt: read the named sources, answer, record the answer where the subject lives.

| id | Question |
|---|---|
| Q1 | Troll Shaman/Magician roster values versus the manual, including the possible Troll +1 melee rule. |
| Q2 | The apparent Draconian common-unit +1 Resistance racial modifier. |
| Q6 | CoM High Prayer's +3-attack text versus the +2 used elsewhere. |
| Q8 | Whether Wraiths use Life Steal −4 or −3. |
| Q12 | When "ranged" includes missile, boulder, magical, Thrown, breath or gaze, across versions and effects. |
| Q19 | CoM 1 Realm Ward helptext's −2 To Hit / −4 Defense / −4 Resistance against the executed `0x90A87..0x90A9B` writes of −2/−3/−3. |
| Q21 | CoM 1 helptext's retained Endurance/Giant Strength powers against the manual's Teleportation/Inner Fire/Divine Protection replacements. The executed binary matches the manual's package. |
| Q26 | The R9-G1a-R3 evidence-scope disagreement. The base, target address/value and constructor linkage are undisputed. |
| Q28 | What realm a Fantastic unit with a mundane base race has. `legacyUnitTypeFromIdentity` and `legacyUnitTypeFromLiveRecord` (`stats_identity.js`) read everything outside the six realm races plus `No Heal` as `arcane`. No shipped roster reaches it, but the UI does — Fantastic + Barbarian is a legal control pair. `UNITS.INI` cannot express the pair, so the sources leave it undefined. Either source the answer, restrict the control pair, or record the `arcane` reading as a deviation. |

## Blocked on people

**H2** — Contact Seravy about the Bless defense term's missing breath flag. The `EncBless` term
at `Caster.exe` `0x5966B8`-`0x596703` requires `spellid > 0`, so it cannot admit breath or gaze,
while Resist Elements (`0x59667D`) and Elemental Armor (`0x5966A2`) two instructions away each do
`ismagic2 OR isbreath`. The CoM 2 helptext describes the behaviour the missing clause would
produce. Ask whether the omission is intended. Evidence in `Reference docs/Source
discrepancies.md` §17, which records the resolution.

**H1** — Contact Seravy about the confirmed CoM2/Warlord Blur bug: turn-relative `CGADEnemy` makes
the opposing army's Blur reduce that army's own retaliation gazes and counterattack. Record whether
it is intended and whether a future engine build should change it.
