<!-- Tier: TASKS. Deferred work. Items are added only on explicit approval, one at a time. -->

# Tasks

## Priority

Execution order, one row per subtask (SPEC T-2 — a row naming a range such as `T2.11`–`T2.13` is
malformed). Every subtask is sized for one agent prompt; the item bodies below are not a queue. A
subtask appears here before any subtask that depends on it.

| # | Subtask | Next outcome |
|---|---|---|
| 1 | **F260.1** | `readUnitStats` splits into a DOM read and a core-scope pure projection, so one path builds the derivation input. No number moves. |
| 2 | **F260.2** | The pure gating helpers leave the page files for a core-scope source, and the manifest follows. Zero behaviour change. |
| 3 | **F260.3** | `applyVersionGating` becomes the one implementation of the control-clearing half of `updateTypeVisibility`, carrying today's card/matrix divergence explicitly rather than resolving it. Needs F260.2. |
| 4 | **F260.4** | `applyRosterUnit` becomes the pure twin of `applyUnit`'s card writes. Needs F260.1. |
| 5 | **F260.5** | Identity moves onto the card state, so a preset's R8 identity and special unit resolve without controls. Needs F260.1, F260.4. |
| 6 | **F260.6** | `presetToCardState` is the pure preset applier, with the globals and both fail-loud asserts. Needs F260.3, F260.4, F260.5. |
| 7 | **F260.7** | The page's `applyPreset` becomes the pure applier plus a control writer; the Test Cases drawer is unchanged for the user. Needs F260.6. |
| 8 | **F260.8** | The equivalence gate: every preset through both paths, derivation inputs compared field by field. Needs F260.7. |
| 9 | **F260.9** | Every preset is evaluated in Node through the pure applier, parallelized. Needs F260.8. |
| 10 | **F260.10** | The Node suite becomes the numeric authority and `presets.spec.js` shrinks to a control-path sample. Needs F260.9 and a tier-promotion proposal. |
| 11 | **F252.1** | The ability input boundary carries the source: innate and marked halves reach `deriveUnitStats` separately and it reconstructs today's merged map internally. Pure refactor; the digest must be 0. |
| 12 | **F252.2** | The nine dual-source keys get a ruling; `holyBonus` and `resistanceToAll` are already ruled provided-vs-received, max'ed at position. Needs F252.1. |
| 13 | **F252.3** | The innate half becomes `template` writes. Needs F252.1. |
| 14 | **F252.4** | The marked immunities become `immunities` writes from the marked half, superseding F244.3b's merged-mark variant. Needs F252.3. |
| 15 | **F252.5** | The marked buffs become `buffs` writes from the marked half. Needs F252.3. |
| 16 | **F252.6** | The marked curses become `debuffs` writes from the marked half, rebinding the nine F244.3b built off the merged map. Needs F252.3. |
| 17 | **F263** | The Sapiens label becomes a permanent record field with its own `buffs:spiritLink:sapiens` write, so the `NOTSAPIENS` gate is two record reads. Needs F252.3.
| 18 | **F267.1** | CoM 1's `template:constructCatapult` and `template:summonBranch` are reclassified as calculated-record writes, so `u.fantastic` at `template` rank is the permanent flag in every version. Supersedes the F262 close-block follow-up.
| 19 | **F267.2** | `unittype`, `herotype` and `ishero` become record fields seeded at `template` rank, matching `Typedec.pas:203/246/247`. Nothing reads them yet; the digest must be 0.
| 20 | **F267.3** | `specialUnit` dissolves into `u.unittype = <id>` comparisons against a version-scoped id table, the shape the engine uses. Needs F267.2.
| 21 | **F267.4** | The seed record is constructed where `abilities` is, not at `stats.js:2531`, and the eager base-identity scalars read it. This is the input-boundary fix. Needs F267.1, F267.2.
| 22 | **F267.5** | The live `identity.race`/`identity.fantastic` pair is deleted; `identityAt`, the hover trace, `ui_matrix.js` and `combat_effects.js` read the record. Needs F267.4.
| 23 | **F267.6** | `initializeUnitIdentity` retires: the constructors stay as the input-shape declaration and produce a seed fragment. `version` leaves the unit. Needs F267.3, F267.5.
| 24 | **F261** | The matrix's version filter becomes `abilityVersionGated`, closing the six-control Warlord gap and retiring the `blur` special case. Needs F260.3. |
| 25 | **F264** | Warlord's `SpellTypeGroup=16` target-selection dispatch is reconstructed, so the record a targeting gate reads stops being a ruling.
| 26 | **F253.1** | `seedNonStatRecordFields` halts when a caller supplies a seeded key with no origin row in the active version, instead of erasing it. |
| 27 | **F253.2** | The remaining erasure: a key whose origin row exists but whose step gate reads a different input key. Needs F252.1. |
| 28 | **F259.1** | `derivation_equivalence` states which fields it does and does not vary, so a zero is self-qualifying. |
| 29 | **F259.2** | The top-level input fields are varied, or the tool reports which gates its run cannot speak for. Needs F259.1. |
| 30 | **F254.1** | Discipline's hero and Fantastic exclusion is read and stated for base CoM2 and for Warlord, which differ. |
| 31 | **F254.2** | The exclusion is enforced at the positioned steps, with the Fantastic case stated by a probe. Needs F254.1. |
| 32 | **F255.1** | `hasImplementationWrite` recognises `SETHEAB` and `SETOLENCHANTMENTFLAG`, so an honest narrow citation of either is not rejected as citing nothing. |
| 33 | **F255.2** | The existing citations are re-audited for spans widened only to reach a recognised verb. Needs F255.1. |
| 34 | **F256.1** | F147's "redundant second home" premise is corrected so `transmuteEquipment` is not deleted, and its three engine writer sites are recorded. |
| 35 | **F256.2** | The Transmute Equipment cast becomes a modelled, version-scoped control with its `buffs` write. Needs F256.1. |
| 36 | **F256.3** | The Caravanserai retrain and the Adamant/Orihalcon training write are modelled or declared out of scope. Needs F256.1. |
| 37 | **F257.1** | The five retort-gated ascension writes are read and stated, and it is settled whether retorts are stated values or controls. |
| 38 | **F257.2** | The input contract gains wizard retorts, with the `PROPOSALS.md` amendment, version gating, state round-trip and tooltips. Needs F257.1. |
| 39 | **F257.3** | The five writes become positioned steps at their `UnitCalcPre.CAS` ranks, one per engine write. Needs F257.2. |
| 40 | **F242** | Rust's cast strips all nine permanent flags the script clears, as `debuffs` steps after the roll. |
| 41 | **F243** | Endurance, Lionheart and the figure-scaled grant read the post-building figure count. |
| 42 | **F249** | CoM 1's Raise Dead race write moves from its deduced region-`c` rank to the creation-time `training` position the resurrection makes it at. |
| 43 | **F250.1** | The nine curse flags and the two cast flags get a cited qualification and magic/non-magic classification out of the two `spells.ini` files. |
| 44 | **F250.2** | The modern family's cast-flag writes are reconstructed or declared absent. Needs F250.1. |
| 45 | **F250.3** | The DOS family's cast-flag writes are reconstructed or declared absent. Needs F250.1. |
| 46 | **F250.4** | The Illusion Immunity branch and the four Warlord script-side writes get evidence or a declared gap. Needs F250.1. |
| 47 | **F226.1** | Create Undead becomes a modelled, version-scoped flag with its own immunity gate. |
| 48 | **F226.2** | Create Undead routes the damage it colours into the undead bucket, in both engine families. Needs F226.1. |
| 49 | **F233** | The post-combat composition states a normalisation rule for overkill cells, where uncapped riders sum past the capped published total. |
| 50 | **F229** | Exorcise's created-undead penalty loses the `fantastic_death` term no version's block tests. |
| 51 | **F230** | Supreme Light stops testing the compact type token, so a Life-race hero passes the gate the binary passes it on. |
| 52 | **F231** | `unit.raceNoHeal` gains a producer or goes, and Raise Dead stops healing naturally. |
| 53 | **F232** | `UnitCalc.CAS:93-98`'s region-`d` Sanctify race re-write is read and either modelled or declared inapplicable. |
| 54 | **F234** | The DOS Warp Reality exemption sheds the Fantastic term its block does not test, keeping a scalar race compare. |
| 55 | **F235** | Whether Warlord Vampirism and Revenant set `EncUndead` for the classifier and the Eternal Night / True Light arms is settled against the scripts. |
| 56 | **F251.1** | Each engine family's Elemental Armor / Resist Elements precedence moves out of the control shape and into the steps, so a both-marked unit is correct in all five versions. |
| 57 | **F251.2** | The `elemArmor` select is replaced by two independent booleans, with a stored-state migration on the retired values. Needs F251.1. |
| 58 | **F251.3** | Golem's intrinsic Resist Elements becomes an additive write, so a CoM 1 / CoM2 Golem under Elemental Armor takes both bonuses. Needs F251.2. |
| 59 | **F236.1** | CoM 1's Holy-Arms/Heavenly-Light eligibility gate is stated as a rule, with its version scope and its custom-unit discriminator settled. |
| 60 | **F236.2** | The gate is implemented so an ineligible unit cannot carry the granted effect. Needs F236.1. |
| 61 | **F239** | The F209 and F200 stage 3 bodies stop naming retired `base:*` keys and the closed F210. |
| 62 | **F209.1** | F202's four immovable rulings reopen. Needs F210. |
| 63 | **F209.2** | F200 stage 4's narrowing and base CoM2's empty training group reopen. Needs F210. |
| 64 | **Q30** + **F200 stage 3** | Sancta Basilica's over-wide Sanctify grant is settled while its two grants take positions. One subtask: each names the other as the place it is settled. Needs F210. |
| 65 | **F207** | The last published-value suppression that gates nothing goes. |
| 66 | **F180** | The four keys live in some versions and silent in others get a source reading each. |
| 67 | **F159.1** | Rule on what "same implementation in all versions" has to mean. |
| 68 | **F159.2** | Roughly 15 of the 43 unasserted keys get a scope entry with a citation. Needs F159.1. |
| 69 | **F159.3** | Roughly 15 of the 43 unasserted keys get a scope entry with a citation. Needs F159.1. |
| 70 | **F159.4** | Roughly 15 of the 43 unasserted keys get a scope entry with a citation. Needs F159.1. |
| 71 | **F215.1** | CoM2 gains a positive Black Sleep and a positive Shatter assertion. |
| 72 | **F215.2** | CoM 1 gains a positive Land Linking assertion. |
| 73 | **F216** | The Land Linking version-difference subgroup asserts a version difference. Needs F215.2. |
| 74 | **F145.1** | Family predicates are added over the existing `SCOPE_*` sets. |
| 75 | **F145.2** | Roughly 55 open-coded version tests route through the predicates and take the halt. Needs F145.1. |
| 76 | **F145.3** | Roughly 55 open-coded version tests route through the predicates and take the halt. Needs F145.1. |
| 77 | **F145.4** | Roughly 55 open-coded version tests route through the predicates and take the halt. Needs F145.1. |
| 78 | **F145.5** | Roughly 55 open-coded version tests route through the predicates and take the halt. Needs F145.1. |
| 79 | **F213.1** | The seven Warlord race-building race terms get a citation or an evidence home. |
| 80 | **F213.2** | The eight Warlord race-building hero terms get a citation or an evidence home. Needs F213.1. |
| 81 | **T8.1** | The unsourced engine claims in `combat.js` get a citation or an evidence home. |
| 82 | **T8.2** | The unsourced engine claims in `combat_special_attacks.js` get a citation or an evidence home. |
| 83 | **T8.3** | The unsourced engine claims in `combat_effects.js` get a citation or an evidence home. |
| 84 | **T8.4** | The unsourced engine claims in `combat_abilities.js` and `combat_phases.js` get a citation or an evidence home. |
| 85 | **T8.5** | The unsourced engine claims in the remaining sources get a citation or an evidence home. |
| 86 | **F153** | The modern gaze rider exclusion gets one home. |
| 87 | **F146** | The seven roster facts the card and matrix decode separately get one reader each. |
| 88 | **F147** | Six derivation values read by nothing go, F205's three write-only `luckyPhase*` markers with them. |
| 89 | **F140** | The matrix stops computing a row and column for the card that nothing renders. |
| 90 | **F151** | A version's default-state map is built without resetting the live page. |
| 91 | **F128** | The `Other` unit category no roster can fill goes. |
| 92 | **F129** | The version-scope sweep's shared attack slot gets a strength. |
| 93 | **F182** | `derivation_equivalence.js`'s dead `chaos-channels` env is dropped or fixed. |
| 94 | **F240** | The dead `traceBasePreparation` trace in `stats.js` goes. |
| 95 | **F237** | The CAS audit attributes and gates a `/N` after a locator and a bare `:N` under a `@span` line or bare mention, keeping non-script numbers reported and ungated. |
| 96 | **F115** | The 44 Warlord spell ids the roster renders as `Spell#N` get names. |
| 97 | **T15** | The Markdown roster tools' drift from the roster JSON is fixed. |
| 98 | **F238** | The Warlord source-order tables in `CoM2 binary - unit recalculation.md` are re-derived against 1.5.12.9 with label-bounded rows. |
| 99 | **F41.1** | The DOS eight-threshold hero ladders. |
| 100 | **F41.2** | The DOS template-ability formulas. |
| 101 | **F41.3** | The modern nine-step hero table. |
| 102 | **F41.4** | How the level control exposes them. Needs F41.1–F41.3. |
| 103 | **M3** | The DOS Destruction path. Needs F41. |
| 104 | **Q1** | Troll Shaman/Magician roster values versus the manual. |
| 105 | **Q2** | The apparent Draconian common-unit +1 Resistance racial modifier. |
| 106 | **Q6** | CoM High Prayer's +3-attack text versus the +2 used elsewhere. |
| 107 | **Q8** | Whether Wraiths use Life Steal −4 or −3. |
| 108 | **Q12** | When "ranged" includes each attack kind, across versions and effects. |
| 109 | **Q19** | CoM 1 Realm Ward helptext against the executed −2/−3/−3 writes. |
| 110 | **Q21** | CoM 1 helptext's retained powers against the manual's replacements. |
| 111 | **Q26** | The R9-G1a-R3 evidence-scope disagreement. |
| 112 | **Q28** | What realm a Fantastic unit with a mundane base race has. |
| 113 | **H1** | Contact Seravy about the Blur bug. |
| 114 | **H2** | Contact Seravy about the Bless defense term's missing breath flag. |
| 115 | **F265** | The ~60 `SPEC.md` references in `Calculator/*.js` name `CLAUDE.md`, the file that actually holds the content.
**Provenance of the queue.** Items are named rather than numbered here, so a reorder does not rot this paragraph. **F260** and **F261** were filed 2026-09-05 out of the preset-suite cost measurement and moved above the backlog the same day so the rows below run against the cheaper suite; F261 is ordered after the refactor on the user’s ruling. **F252** and **F263** follow the F260 block on the user’s 2026-09-05 ruling that the ability-to-record migration comes straight after the DOM work. **F267** was filed 2026-09-05 out of the identity-object read and is sequenced beside F263; its first subtask absorbs the CoM 1 template-phase follow-up the F262 close proposed. **F264** and **F265** were filed 2026-09-05 out of the F244.3h and F246 close blocks. **F253** and **F259** were filed 2026-09-03 and 2026-09-04 out of the F244.3c close and the digest-blindness findings. **F254**, **F255**, **F256** and **F257** were filed 2026-09-04 out of the F244.3f and F244.3g reviews. Rust’s strip, the figure split and **F249** were approved 2026-09-03 from the No Heal merge. **F250**, the evidence debt the F244.3b writes declared, was filed 2026-09-03 on the user’s approval. Then the Create Undead damage-bucket item and the composition normalisation decision F225.1 surfaced, and below those the standalone and structural backlog, F251 and the F224 race and realm findings among it. F239–F248 were approved 2026-09-02 from the F210/F204 close. Closed: F244 (F244.1, F244.2, F244.3a–F244.3i), F245, F246, F247, F248, F258, F262.

F211–F216 were filed 2026-08-30 from the T2.11–T2.23 run, which found them while reading fixtures
against the code. Each is verified against source and none makes a test red.

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

The criterion said a training-time write setting a flag earns no step. It is gone from the rebuilt
SPEC, which now states the opposite: "Each engine write is its own step carrying its provenance
citation." Its premise was also false — base blocks gate on base flags 7 times in `CreateUnit.CAS`
and 29 in `OverlandEndTurn.CAS`, so a base flag write's rank is observable to other base steps.

Reopen what rested on it: F202's four immovable rulings (`fieryBlade`, `powerEngine`, `flying`,
`discipline`, commit `0fd0b32` — its digest was 0 of 52440, so the unwind is the rulings and the
comments, with no numbers to restore), F200 stage 4's narrowing, and base CoM2's empty training
group. Not in scope: whether a granted flag also needs its own UI control.

Depends on F210. Subtasks: **F209.1** the four F202 rulings; **F209.2** F200 stage 4's narrowing and
CoM2's training group.

### F200 stage 3 — Position Sancta Basilica's and Pillar of Faith's ability grants

Stages 1 and 2 landed. Both remaining grants already have `base` chain entries, so the work is to
widen `base:sanctaBasilica` and `base:pillarOfFaith` onto the `CreateUnit.CAS` branches that make
the ability writes, with a new hashed-span anchor each.

The ruling this item once needed is gone: `targetingIdentity` was the obstacle, and F246 deleted it
(2026-09-05). `b:sanctify`'s gate can simply read the record.

`magicImmunity` feeds `finishedImmunities`, the declared cross-boundary read
`base:immunityCurseGating` takes. Settle Q30 on the same block while rebinding.

Depends on F210. CoM2 and Warlord.

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

*Category: faithfulness.* Filed out of Q18, 2026-09-01.

Holy Arms is a global enchantment granting Holy Weapon, and CoM 1 gates the grant on the base
unit type: `com1:0x8F170` admits `type < 0x97`, the normal/fantastic cut (Q18, `R6.1a.evidence.md`).
Heavenly Light's weapon-quality test at `com1:0x905E7` reads the same ceiling and, on a unit at or
above it, forces `cl` to Magic Weapons and withholds the To Hit thresholds.

The calculator models `holyWeapon` as a free boolean (`enchantments.js:17`) with no eligibility
test, so a Fantastic unit can be given Holy Weapon — a state Holy Arms could never have produced.
This is the pattern SPEC already applies to immunities and curses: an effect the unit could not
have received is not silently allowed.

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

Open at filing: whether Heavenly Light's withheld To Hit thresholds are a second write or fall
out of the same gate.

Subtasks: **F236.1** state the rule, its version scope and the custom-unit discriminator;
**F236.2** implement it.

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

**F226.1 — model the flag.** Needs no other item. Give Create Undead an `ABILITY_DEFS` entry with
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

Category: **binary reconstruction** (script reading). Filed 2026-09-01 on the user's approval, out
of the F224.1 sweep.

`UnitCalc.CAS:93-98` is a `SETSTAT(U,SRace,0,RCLife)` in region `d` — the late script hook. The
calculator models Sanctify only as the region-`b` `b:sanctify` write. In Warlord a Sanctified unit
that also took a region-`c` conversion would have that conversion undone by this later write, and
the calculator has no step for it.

Read the block against its guards and either give it a step in the region-`d` chain or declare it
unreachable for the states the calculator models. Note that Warlord scripts outrank the compiled
behaviour they overwrite, so if it fires it wins.


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

Category: **binary reconstruction** (script reading). Filed 2026-09-01 on the user's approval, out
of the F224.2a run.

Warlord's Vampirism (`UnitCalc.CAS!NOVAMPIRISM!-7`) and Revenant (the `COSpell.CAS` Revenant arm)
both write `EncUndead` at index 1. By this repo's reading that an index-1 write is already set at
region `b`, both would be `EncUndead` for every later consumer — Eternal Night's Poor Vision, True
Light, and the classifier arm F224.2a built.

`UnitCalcPre.CAS~"SPELLSTATE(W,SDeathMastery)=2"` argues the other way: it spells `EncUndead`,
`EncRevenant` and `EncVampirism` as three separate disjuncts, so the script's own author does not
treat either as implying the flag at the position that block reads.

F224.2a's review pressed for folding these into the membership reader's `EncUndead` term and the
agent declined, on the grounds above; the question was documented in the reader's comment rather
than decided. Settle it against the scripts. It moves existing Warlord fixtures for Eternal Night
and True Light, so it needs its own evidence pass rather than a fold-in.


### F180 — Four keys live in some versions and silent in others, with nothing saying why

`bless` (moves in both MoM, silent in CoM 1, CoM2 and Warlord), `ccFireBreath` and `supernatural`
(move in CoM2 and Warlord, silent in all three DOS builds), `immolation` (moves in CoM 1, CoM2 and
Warlord, silent in both MoM). Each needs its own source reading.

`destruction` is **settled and not part of this**: the control is correctly shown in the DOS
versions, where Destruction exists but is hero-only and therefore unimplemented until hero mechanics
land (M3). Reproduce with `node tools/narrow_control_scope_sweep.js`.

### F251 — Elemental Armor and Resist Elements are one exclusive control, and three engines stack them

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
  the two existing keys widen past Warlord, [stats_origins.js:395](Calculator/stats_origins.js:395)),
  the 15 presets that set `elemArmor`, the four Playwright specs, and
  `tools/state_persistence_check.js`. A stored-state migration keyed like Lava Smelter's maps the
  retired `resistElements` and `elementalArmor` select values onto the booleans; SPEC's
  *Input/output contract* requires the migration or an accepted halt. Needs F251.1.
- **F251.3** — Golem's intrinsic becomes an additive `resistElements` write in the shape of the
  binary's `item_enchantments` OR, leaving Elemental Armor markable alongside it: `stats.js`'s
  overwrite, the UI's `_preGolemElemArmor` stash and disable, and `golemShaping`'s origin mapping
  and assertion in `tools/unit_checks/ability_origins.js`. Fixtures for a CoM 1 and a CoM2 Golem
  under Elemental Armor at +16. Needs F251.2.

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

### F147 — Six derivation values are read by nothing

`liveRace` (`stats.js:1134`), written beside `liveFantastic` which 13 sites read; and the five
Marionette strayed-branch grants (`stats_identity.js:495-501`) — `transmuteEquipment`, `sage`,
`mechanicalMaster`, `ritualMaster`, `arcaneWard` — written in the same object literal as `rebuild`
(36 reads), `charmed` (24) and `spellLock` (17). `transmuteEquipment` is not a missing effect: it is
implemented as `b:marionette:strayedTransmute`, so the flag is a redundant second home.
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

### F239 — Rewrite the F209 and F200 stage 3 bodies for the post-F210 keys

*Category: documentation.* Approved 2026-09-02 from the F210 close.

F210 replaced the `base` phase with four phases, which F248 renamed and split again: the current
set is `template`, `training`, `immunities`, `buffs`, `debuffs`. Both items are closed.
The F209 and F200 stage 3 bodies still say `base:armorclad`, `base:sanctaBasilica`,
`base:pillarOfFaith`, `base:immunityCurseGating`, "base steps" and "Depends on F210". Rewrite them to
the current keys and drop the dependency notes. One subtask; moves no number.

### F240 — Delete the dead `traceBasePreparation` trace

*Category: other.* Approved 2026-09-02 from the F210 close.

`traceBasePreparation` in `Calculator/stats.js` (near line 492) has no call site, so
`basePreparationTrace` is always empty and its entries never reach a tooltip. Delete the helper, the
array and the spread that seeds `statTrace` from it. One subtask; moves no number.

### F242 — Rust's cast clears nine permanent flags, and the calculator clears one

*Category: faithfulness.* Approved 2026-09-02. Warlord only.

The Rust cast (`COSpell.CAS`, the `SRust` block after `!NOTHIEROPHANY!`) clears, on the target's
permanent record after its resistance roll: `EncMagic`, `EncMithril`, `EncAdamant`, `EncOrihalcon`,
`EncTransmuteEquipment`, `EncResistElements`, `EncElementalArmor`, `EncFlameBlade`,
`EncGuardianWind`. F244.2 made the first three of those a step — `debuffs:rust:material`, which
clears the record's `weaponMaterial` — so the weapon half is done and shows in the chain. The
remaining six are not modelled: `EncOrihalcon` has a record field (`armorMaterial`, written by
`training:armorQuality`) and no clear, and the other five have neither, so a unit with Rust and
Flame Blade both marked still keeps Flame Blade. Add the six clears beside `debuffs:rust:material`,
under the same `rustActive` gate. Measure: `EncOrihalcon` and the other five will move numbers.
One subtask.

### F243 — The figure count crosses the sequence split

*Category: faithfulness.* Approved 2026-09-02. Warlord only.

The figure sequence (`stats.js`, `figureSteps`) adds Altar of the Sun's +1 and the Academy's +2
after the stat sequence has run, and the stat sequence reads `baseFigs`, the card's count:
Endurance and Lionheart (`stats.js` near lines 850 and 858) and the figure-scaled grant at
`stats_sequence.js:584`. The engine divides by the finished `U.figures`. Preferred fix: `figs`
becomes a field of the stat record, the two figure steps join the main chain at their `training`
positions, and the separate figure run is retired. Measure before and after with a probe that
combines the two buildings with Endurance and Lionheart. One subtask.

### F250 — The eleven declared cast writes have no evidence

*Category: binary reconstruction.* Approved 2026-09-03, out of the F244.3b review. Runs under
Method B, not A: it is a reading of the scripts and the binaries, not a code change.

F244.3b turned each curse and each beneficial cast flag into its own positioned permanent-record
write. Eleven of them carry `UNVERIFIED` provenance, because **no supported source in the tree
reconstructs a cast putting its own flag on a unit's permanent record.**
`Spells.InitializeCombatSpellcasting.pas` reconstructs exactly one such write, Raise Dead's
`EncNoHeal`. The eleven are the nine `debuffs:<curse>:cast` steps (`weakness`, `blackSleep`,
`shatter`, `vertigo`, `warpAttack`, `warpDefense`, `warpResist`, `mindStorm`, and Warlord's
`nausea`) and the two `buffs:*:cast` steps (`trueSight`, `rebuild`), all in `stats_identity.js`.

**What the existing anchor does and does not cover.** `PROVENANCE[curseImmunityRefusal]`, on
`curseRefusedByImmunity`, is VERIFIED across all five engines and covers exactly one thing: the
Magic Immunity **refusal mechanism** — both engine families make the target's resistance
unreachable for any spell carrying a realm, so the roll cannot fail. It says nothing about whether
a given flag qualifies as a curse, nothing about that flag's magic/non-magic classification,
nothing about the cast's own write, and nothing about the Illusion Immunity branch, which
`stats_identity.js` states outright is assumed rather than cited. Those four gaps are this item.

Each subtask ends by converting the writes it sourced from `UNVERIFIED` to `VERIFIED` with an
anchor, or by narrowing the declared `gap=` to what is genuinely unreachable. A subtask that finds
no source must say so and leave the entry `UNVERIFIED` with a sharper gap — that is a result, not a
failure.

- **F250.1** the qualification and classification half, for all eleven keys: read
  `Reference docs/Script source/CoM2 1.05.11 base/spells.ini` and the Warlord one, and give each
  key a cited spell record and a cited `NonMagic` presence or absence. The membership rule the
  curse list states in its own comment — "by default, spells are blocked by Magic Immunity" — is
  the thing to anchor. `nausea` is known to have no record at all and is the expected negative
  result. This subtask fixes the key list every other one reads.
- **F250.2** the modern family's cast writes: whether `Caster.exe` writes each of the eleven flags
  onto the permanent record, starting from `Spells.InitializeCombatSpellcasting.pas` and the
  neighbouring spell-application code. Needs F250.1.
- **F250.3** the DOS family's equivalent, in `combat.c` and `unitcalc.c`, for the eight
  all-version curses and `trueSight`. Needs F250.1.
- **F250.4** the Illusion Immunity branch — currently assumed, with `A32_ai_shatter_candidate`
  named as the only curse-facing test anywhere and an AI heuristic at that — plus the four Warlord
  script-side writes (`nausea` in `UnitCalcPre.CAS`, `rebuild` in `OLSpell.CAS`, and the Eye of
  Heaven grant that confers Illusion Immunity). Needs F250.1.

Moves no number by itself. If a reading contradicts a modelled gate, that is a separate item.

### F249 — CoM 1's Raise Dead race write is a creation-time write, not a region-`c` one

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


### F263 — The Sapiens label becomes a record field

*Category: faithfulness.* Approved 2026-09-05. Warlord. Rides on F252.

`CLAUDE.md` requires the calculator’s unit properties to match the binaries’. The `NOTSAPIENS`
gate has two permanent-record terms –
`IF (BASEFANTASTIC(U)>0) %AND (GETSTAT(U,SMultiLabel,1)<>14)` (`UnitCalcPre.CAS:1062`) — and only
the first is a record field. The Sapiens label is an `ABILITY_DEFS` control read pre-sequence, and
Spirit Link’s `SETSTAT(TU,SMultiLabel,1,14)` (`OLSpell.CAS:495`) travels as a
`spiritLinkSentience` parameter rather than a write.

F252.3 gives `sapiens` a `template` row for free. What is extra: Spirit Link’s label write becomes
`buffs:spiritLink:sapiens`, positioned beside the existing `buffs:spiritLink:fantastic` under the same
`IF BASEFANTASTIC(TU)` gate; `spiritLinkSentience` is deleted; and `sapiensEligible` becomes two
record reads at its steps’ own rank. Needs F252.3.

### F267 — The identity object dissolves into the record

*Category: faithfulness.* Approved 2026-09-05. Sequenced beside F263: both move state the engine
keeps on its unit record out of calculator-only side objects.

`CLAUDE.md` *Architecture* requires the calculator’s unit properties to closely match the
binaries’. `Typedec.pas` keeps one flat `UnitT`, and three of the identity object’s fields are
ordinary members of it: `ishero : boolean` (:203, sitting between `bloodsucker` and `equip`),
`unittype : smallint` (:246) and `herotype : smallint` (:247). `BaseUnits[]` and `Units[]` are both
arrays of that record, so all three exist on B and on U.

Three findings from the 2026-09-05 read:

- **`unittype` is how the engine answers ’is this Zombies’.** `BaseUnits[i].unittype =
  inferred_UnitGolem` (`Units.RecalculateUnits.pas:768`), `B.unittype = ChosenUnitID` (:1611, read
  from `MODDING.INI`), `BaseUnits[UnitCaster].unittype = $00AD` (`Spells.CombatSummonUnit.pas:136`).
  Our `specialUnit` is a five-valued token precomputing what the engine writes as independent
  integer compares; it has no engine counterpart.
- **`herotype` is not derived from `unittype`.** The only helper goes the other way
  (`CasApi.pas:164 Herotypetounittype`). It indexes the wizard’s per-hero ability array,
  `Wizards[owner].Hero[herotype, HABattlemage]` (`Combat.ApplyAttack.pas:361`), 85 wide against
  `unittype`’s 400.
- **`ishero` is a calculated-record field.** `CoM2 binary - resolution helpers.md:208` records that
  in the Charmed test `owner` is read from `BaseUnits` while `ishero` and `herotype` come from the
  current record. Our `!!identity.isHero`, frozen at the input boundary and closed over by
  predicates, cannot express that.

**The input boundary is the real defect.** The engine constructs `B` and every gate reads `B` or
`U`. `deriveUnitStats` builds ~2,500 lines of predicates first and seeds `statRecord` at
`stats.js:2531`, so `identity.baseRace` / `identity.baseFantastic` / `identity.isHero` exist as a
shadow permanent record for those predicates to read.

The seed does not need this. Its inputs are `abilities` (`stats.js:121`), `input`, and the base
identity triple – not a record. Most of what stands between is closures over `u` / `runCtx`,
which do not need the record to exist at definition time; roughly ten are eager scalars
(`isHero` :25, `isFantasticBase` :26, `baseUnitType` :24, `baseUnitRace` :65 and their dependents)
and those are the only real movers.

**Blast radius is contained by keeping the constructors.** `createUnitIdentity`,
`createRosterUnitIdentity` and `createCustomUnitIdentity` have ~90 call sites across `tests/` and
`tools/`. They stay as the declaration of the input shape; what changes is that `deriveUnitStats`
folds the result into the seed record instead of keeping a live object beside it.

**`version` leaves the unit as a consequence, not as a goal.** It is on the identity object only to
scope `specialUnit` validation against the version’s defs; F267.3 turns that into an id-table
lookup at the roster boundary, and `input.version` / `statRunContext.version` already carry it.

F267.1 is the prerequisite: while CoM 1’s `template:constructCatapult` and
`template:summonBranch` write the calculated record at `template` rank, `u.fantastic` there is not
the permanent flag and cannot replace `identity.baseFantastic`.

### F264 — Reconstruct Warlord's `SpellTypeGroup=16` target-selection dispatch

*Category: binary reconstruction.* Approved 2026-09-05 out of the F246 close. Runs under Method B.

Which record a cast-time targeting gate reads is currently a **ruling**, not a reading:
`CLAUDE.md` *Architecture* says targeting is assumed to read the permanent (base) record, and F246
implemented `rustActive` on that basis — **2,117 measured Warlord cases** turn on it. No
reconstruction of the target-selection dispatch exists to confirm or overturn it, and
`UnitCalc.CAS`’s Spirit-Link tail-clear comment points the other way in the 632-case
Spirit-Link-plus-Destiny class, the only place the two records disagree in that direction.

Reconstructing the dispatch settles Rust, Shatter and every future targeting gate at once. A result
that confirms the ruling is as valuable as one that overturns it; either way the ruling stops being
load-bearing.

### F265 — `SPEC.md` does not exist

*Category: documentation.* Approved 2026-09-05 out of the F244.3h close. Low priority.

Roughly 60 comments across `Calculator/*.js` cite `SPEC.md` as the home of the fail-loud rule, the
out-of-range rule and the UI contract. There is no such file; the content is in `CLAUDE.md`.
Mechanical rename, no behaviour. Each agent that meets one currently rediscovers this.

### F253 — A caller-supplied seeded key with no origin row halts instead of being silently erased

*Category: other* (architecture; traces to `CLAUDE.md` *Architecture*, the fail-loud rule).
Approved 2026-09-03 out of the F244.3c close. Scheduled after the F244.3/F245/F246 run.

`seedNonStatRecordFields` already throws when a *transform* grants a key with no `template` row and
no `TRANSFORM_SEED_CARRY` entry. A key the **caller** supplies raw falls into the `else seed = false`
arm and is dropped without complaint, which is the opposite of the fail-loud rule. It is not
theoretical: F244.3c positioned three keys and immediately tripped five fixtures that had been
reaching the derivation through an input path the origin table does not model.

Measured at F244.3c (`JOURNAL.md`, 2026-09-03): 39 keys are seeded; in each of the four non-Warlord
versions **13 have no origin row at all** — `nausea`, `fieryBlade`, `armorclad`, `mechanical`,
`rebuild`, `psychoForce`, `pneumaField`, `resistElements`, `elementalArmor`, `rage`, `blackpowder`,
`energyCannon`, `wallCrusher`. Warlord has none. The halt below costs ~15 lines and fires on **0 of
the 1,151 presets**.

**The wider rule must not be written.** "Throw whenever a supplied key lacks a `template` row" would
fire on every cursed unit: 20–22 keys per version lack one, the nine curses among them, and their
`debuffs:*:cast` steps read `marked` rather than the seed. The rule is *no origin row at all*, not
*no template row*.

- **F253.1** `seedNonStatRecordFields` halts when a caller supplies a seeded key that has no origin
  row in the active version, naming the key, the version and the origins the table does offer.
  Retriage any fixture it catches through the real controls rather than weakening the halt.
  Depends on nothing.
  **The ground moved under this item during the F244.3 run, twice.** F244.3g fixed a hole in the
  neighbouring transform guard, which tested `!!marked[key]` and so let a transform writing a value
  key to `0` bypass a supposedly unconditional throw; it now compares the two maps, and a legitimate
  deletion still passes. Match that shape rather than reintroducing truthiness. And the census this
  item was scoped against has grown: at F244.3c it was 43 seeded record fields with 13 lacking an
  origin row per non-Warlord build; after F244.3g it is **64 seeded fields**, with **30** lacking a
  row in each MoM build, **28** in CoM 1, **27** in base CoM2 and **0** in Warlord. Re-measure before
  scoping; do not trust either figure.
- **F253.2** the remaining half: a key whose origin row exists but whose step gate reads a *different*
  input key, so the supplied key admits no write and is still erased. `resolution_steps.js`'s raw
  `fieryBlade` in Warlord is the known instance — the training step's gate reads
  `lavaSmelterFieryBlade`. Catching it requires the origin table to record which input key admits
  each write, which is what F252.1–F252.3 build. **Needs F252.1.**

### F254 — Discipline's hero and Fantastic eligibility is claimed by both tooltips and enforced by neither

*Category: faithfulness.* Approved 2026-09-03 out of the F244.3d close. CoM2 and Warlord.

Both Discipline controls' tooltips say "Does not affect heroes or fantastic units". Nothing enforces
either half, before or after F244.3d — a modern hero supplied `discipline: 'overland'` takes the
record field and the +1 defense. The project contract requires eligibility to be gated internally by
the `buffs`/`debuffs` phases, because any enchantment may be supplied on any unit.

The two builds genuinely differ, which is why the rule is read before it is written. Base CoM2 marks
Discipline `NonHero=True` (`Reference docs/Script source/CoM2 1.05.11 base/spells.ini` [221]:3678).
Warlord's [221] is `Tactical Drill` and carries **no** `NonHero`; its [221] is `Unobtainable=True`
and its [271] `Discipline` is `Disabled=True`, so in Warlord the only routes are the unit's own
arcane ability and Military Drilling.

`training:militaryDrilling` already refuses permanently-Fantastic units through the overland
`BASEFANTASTIC` gate. The hero half and the CoM2 cast half are the gap.

Measured at F244.3d: a hero gate moves **36 digest cases per version, 72 modern**. The Fantastic half
is unmeasured — the digest never pairs Discipline with a Fantastic unit, so a probe has to state that
case rather than expecting the sweep to find it.

- **F254.1** the rule is read and stated for both builds: whether the hero exclusion applies to the
  cast only or to the arcane ability and Military Drilling too, and what the Fantastic exclusion
  covers beyond the `BASEFANTASTIC` gate already in place. Cite `spells.ini` for each build and say
  what the tooltips should claim if they are wrong. Depends on nothing.
- **F254.2** the gate is implemented at the positioned steps so an ineligible unit cannot carry the
  effect, with a probe stating the Fantastic case explicitly. Report the measured movement against
  F244.3d's 36-per-version figure. Needs F254.1.

### F255 — The provenance audit does not recognise two write verbs the shipped scripts use

*Category: other* (tooling). Approved 2026-09-04 out of the F244.3f close.

`hasImplementationWrite` (`tools/provenance_audit.js`) recognises `SETSTAT`,
`SETENCHANTMENTFLAG` and `SETCOMBATENCHANTMENTFLAG`. The shipped Warlord scripts also write with
**`SETHEAB`** (the wizard hero-ability record) and **`SETOLENCHANTMENTFLAG`** (the overland
enchantment word), and the audit sees neither as a write. Verified empirically at F244.3f:
`UnitCalcPre.CAS` 388–394 — which contains `SETHEAB(W,48,HAArcaneWard,2)` and
`SETOLENCHANTMENTFLAG(U,EncSpellLock,1,1)` — resolves as `gate: true, write: false`.

The consequence is the opposite of what the audit is for: an honest narrow citation of one of those
writes is rejected as citing nothing, so the author must widen the span until it swallows an
adjacent recognised write. That is exactly the over-broad shape the audit exists to catch, and it
has already cost two revision rounds in the F244.3 run (F244.3b and F244.3c both attached spans
proving a downstream effect rather than the write).

**This loosens the gate every provenance citation in the repository passes through**, which is why
it is filed rather than done in passing. The two verbs must be added without admitting anything
that is not a write, and the existing corpus re-audited for citations that were widened only to
satisfy the old rule.

- **F255.1** the two verbs are recognised, with a test that a citation carrying only `SETHEAB` or
  only `SETOLENCHANTMENTFLAG` resolves as a write, and that nothing which is not a write becomes
  one. Depends on nothing.
- **F255.2** the existing citations are re-audited for spans widened only to reach a recognised
  verb, and narrowed where the real write is now citable. Needs F255.1.

### F256 — Transmute Equipment has three unmodelled engine writers and no control

*Category: faithfulness.* Approved 2026-09-04 out of the F244.3f close. Warlord.

`transmuteEquipment` reaches the record only through `b:marionette:strayedPackage`. The engine
writes the permanent flag from three further sites, none modelled and none with a control:

| Site | What it is |
|---|---|
| `OLSpell.CAS:817-820` | the **Transmute Equipment cast** (`spells.ini:4735`, an enabled unit enchantment) |
| `OverlandEndTurn.CAS:161-193` | the Caravanserai retrain |
| `CreateUnit.CAS:75-77` | an Adamant-plus-Orihalcon training write |

The nonhero cast arm at `OLSpell.CAS:821-824` additionally writes the three material flags.

**F147's premise is wrong and is corrected in the same change.** F147 says `transmuteEquipment` "is
not a missing effect: it is implemented as `b:marionette:strayedTransmute`, so the flag is a
redundant second home" — and would have deleted it. Since F244.3f the flag is that step's only
input, and the table above shows it is a live cast target besides. The key is not write-only and
must not be deleted.

Note also that `b:marionette:strayedTransmute` applies its `SRanged +2` only to a channel marked
`marionetteRangedSlot`, where the script writes `SRanged` unconditionally for every affected hero
(`UnitCalcPre.CAS:675-676`). Settle that on the same reading.

- **F256.1** F147's body is corrected so the flag is not deleted as redundant, and the three writer
  sites are recorded against it. Depends on nothing; moves no number.
- **F256.2** the cast becomes a modelled, version-scoped control with its `buffs` write, and the
  unconditional `SRanged` question above is settled. Needs F256.1.
- **F256.3** the Caravanserai retrain and the Adamant/Orihalcon training write are modelled or
  declared out of scope with a reason. Needs F256.1.

### F257 — Wizard retorts become inputs, and the five retort-gated ascension writes are modelled

*Category: faithfulness.* Approved 2026-09-04 out of the F244.3g close. Warlord.

`UnitCalcPre.CAS` 303–356 — the ascension block's retort tail — writes `HASage`,
`HAMechanicalMaster`, `HARitualMaster`, `HACharmed` and `EncSpellLock` a **second** time, each behind
a wizard retort: Sage Master, Artificer, Astrologer, Charismatic, Enchanter. The calculator models
none of it, because it has no control for a wizard retort at all. F244.3f found the tail and scoped it
out; F244.3g re-derived it and scoped it out again. It is filed so it is not found a third time.

**This is an input-contract change, and that is the substance of the item.** CLAUDE.md's
*Input/output contract* says the user specifies the version, a unit per side, and a set of
enchantments and conditions. A wizard retort is none of those: it is a property of the *owning
wizard*, not of the unit on the card. Adding retorts widens what the card states, and reaches
persistence, share state, version gating and tooltips. **F257.2 must carry a `PROPOSALS.md` entry
amending the input contract; it is not an agent's to decide unilaterally.**

Related but distinct, and not folded in: `soulLinkerAura` shows the calculator's existing answer to
"a wizard-level effect the unit is subject to" — a `nonRecord` input the user states directly, read by
`c:soulLinkerAura`/`e:soulLinkerAura`. F244.3g declined to model Conjurer's `HASoulLinker` write
because nothing in the tree reconstructs rank → aura magnitude, so a step would have no number to
write. F257.1 should say whether retorts follow the `soulLinkerAura` pattern (a stated value) or
become real controls, because that choice decides how large F257.2 is.

- **F257.1** the five retort-gated writes are read and stated: for each, the retort, the gate, the
  write and its selector, the version scope, and whether the write differs from the package grant the
  unit already has. Say whether retorts should be stated values in the `soulLinkerAura` shape or
  controls in their own right, and size F257.2 accordingly. Depends on nothing.
- **F257.2** the input contract gains wizard retorts, with the `PROPOSALS.md` amendment, version
  gating, persistence and share-state round-tripping (INV-6), and tooltips per the style guide.
  Needs F257.1.
- **F257.3** the five writes become positioned steps gated on the new inputs, at their ranks in
  `UnitCalcPre.CAS` 303–356, one step per engine write. Report what moves. Needs F257.2.

### F259 — The digest sets no top-level input fields, so a zero cannot speak for a gated change

*Category: other* (tooling). Approved 2026-09-04 out of the F244.3i close.

`tools/derivation_equivalence.js` is the measurement every subtask of the F244.3 run leaned on, and
"0 of 52,440" has been read throughout as "nothing moved". It does not mean that.

**Corrected 2026-09-04** — the first filing of this item said the tool "never sets top-level input
fields", which is false and was itself an overstatement of the kind this item is about. The tool
varies an explicit `ENVS` list (`level`, `gear`, `adamantium`, `nodeAura`/`darkness`,
`trueLight`/`warpReality`, `enemyEternalNight`, `cityWalls`, `chaosChannels`, `chaosSurge`). The real
gap has two parts: a field **absent from that list** is never varied at all — `enemyEyeOfHeaven` is
absent — and a field on the list can still fail to exercise its axis if the combination that matters
arises only by seeded chance.

Both halves have bitten before, and the tool's own comments record it: the `gear` env carried values
that were not options of the Armor Type control, so the axis was never exercised (F117); the walls
env carried a value naming no option and produced bonus 0 (F113); and `chaosSurge` was never varied,
"which is how F178's defect passed this tool at 0 differences". **This is a recurring, already
twice-documented failure mode in this one tool.**

This is not hypothetical: F244.3i's **only** real behaviour change — 16 cases in three builds — sat
entirely inside that blind spot. The digest reported 0 of 52,440 and a hand probe over the state where
card and record can disagree found the movement. F244.3g's Warlord Marionette cases had the same
shape: the digest's identity axis never selects hero type 48, so that path had to be probed separately.

A zero from an instrument that does not vary the gate is not evidence.

- **F259.1** the fields `derivation_equivalence` does and does not vary are enumerated and stated in
  the tool's own output, so a zero is self-qualifying rather than silently over-read. Depends on
  nothing.
- **F259.2** the top-level input fields are varied, or the tool reports explicitly which gates its
  run cannot speak for. Report the new case count and any movement the added coverage exposes —
  earlier "0 of 52,440" results in the F244.3 run may not survive. Needs F259.1.

### F252 — Innate abilities are `template` writes; marked enchantments are `immunities`/`buffs`/`debuffs` writes

*Category: faithfulness.* Approved 2026-09-03. All five versions. Subsumes the Option B costed
under F244.3b.

`readAbilitiesFromDOM` (`ui_card.js:8`) folds every def through `mergeAbilityCalcValue`
(`combat_abilities.js:31`) into one map keyed by `calcKey`, so by the time `deriveUnitStats` sees a
key it cannot say whether the unit was built with it or the card marks it. The engine makes those
two writes at different moments — creation and cast — and the phase table already names both
(`template`; `immunities`/`buffs`/`debuffs`). The calculator conflates them, which is why F244.3b
could not source the `immunities` phase from the enchantment control and settled for writing the
merged card mark.

The information is not lost at the control: `abilityUiDefs()` tags every def
`source: 'ability' | 'enchantment'`, `ABILITY_DEFS` has 48 calcKeys and `ENCHANTMENT_DEFS` 163, of a
202-key union. **Nine calcKeys are contributed by both** — `fear`, `holyBonus`, `immolation`,
`invisibility`, `magicImmunity`, `missileImmunity`, `resistanceToAll`, `teleporting`, `undead` — and
those nine are the whole of what the fold destroys. Everything else is single-source and its origin
is already recoverable from which def list the key came from.

The nine are not one shape. Four are the same effect declared twice (`immolation`, `invisibility`,
`magicImmunity`, `undead`). Two are **two different quantities sharing a key**: `holyBonus` is
"Holy bonus" against "Received holy bonus", and `resistanceToAll` is "Res. to all" against "Received
res. to all" — provided against received. One is two different effects (`fear`: innate Cause Fear
against marked Cloak of Fear). One has three contributors (`missileImmunity`: the innate control plus
Guardian Wind and Hillfort). One is an innate ability with a distinct cast that grants it
(`teleporting`, granted by Planewalking).

For `teleporting` the split is **already asserted** and only the plumbing cannot carry it:
`stats_origins.js:1116` files it as `template`/`control` and `buffs`/"the Planewalking cast writes
Teleporting on the unit" (plus a Warlord `regionD` strip). Treat the origin table as the statement of
intent this item makes executable, and check the other eight against it the same way.

Rule: the innate half seeds the record at `template`; the marked half is a positioned write in
`immunities`, `buffs` or `debuffs` per the phase table, admitted by the engine's own eligibility test
read against the record as the earlier steps left it.

- **F252.1** the input boundary carries the source. `readAbilitiesFromDOM` returns the innate and
  marked halves separately, `mergeAbilityCalcValue` keeps its fold *within* a source, and
  `deriveUnitStats` takes both and reconstructs today's merged map internally so nothing moves yet.
  Call sites: `ui_card.js:63`, `ui_matrix.js:182` and `:263`, `parseAbilitiesFromUnit`,
  `baseUnitInput` (`tools/unit_checks/assertions.js`), the Node checks, `derivation_equivalence.js`.
  Pure refactor: the digest must be **0 of 52,440**, and that is the subtask's acceptance test.
  This subtask also censuses the marked half by target phase, which may re-partition F252.4–F252.6
  below — those slice bounds are a work partition, not a contract.
- **F252.2** rule on the nine dual-source keys: what the record holds when a unit is built with the
  ability *and* the card marks the enchantment. Today it is `!!a || !!b` for a bool and a
  max/last-write for the numeric and select arms, which is a fold chosen for one merged map rather
  than a ruling about two engine writes at different moments.
  **`holyBonus` and `resistanceToAll` are already ruled** (user, 2026-09-03): the innate and marked
  defs are the *provided* and the *received* value, they are not the same quantity, and they are
  max'ed **with each other during the sequence** — not folded at input, which is where
  `mergeAbilityCalcValue`'s `Math.max` arm does it today. Each becomes its own positioned write and
  the max is taken at position.
  The open question this subtask answers is the generalisation: whether that numeric arm survives at
  all, or whether every numeric dual-source key becomes two positioned writes with the max taken in
  the sequence. `teleporting` needs no ruling — `stats_origins.js` already states its split.
  Needs F252.1.
- **F252.3** the innate half becomes `template` writes: the seed carries it, and any innate key with
  no template origin becomes a positioned `template` step. Retires the `immunities` origin
  token if F252.4 supersedes it. (`TRANSFORM_SEED_CARRY` is already gone: F244.3g removed it.)
  Needs F252.1.
- **F252.4** the marked immunities become `immunities` writes sourced from the marked half alone,
  superseding F244.3b's merged-mark variant for `magicImmunity` and `missileImmunity`. Needs F252.3.
- **F252.5** the marked buffs become `buffs` writes sourced from the marked half. Needs F252.3.
- **F252.6** the marked curses and detrimental conditions become `debuffs` writes sourced from the
  marked half, rebinding the nine `debuffs:<curse>:cast` writes F244.3b built off the merged map.
  Needs F252.3.

**Ordering note.** F244.3h and F246 are closed and did not depend on this. F252 now runs straight
after the F260 block on the user’s 2026-09-05 ruling: it completes the phase restructuring, and
**F263** rides on it. It still revisits F244.3b's merged-mark variant.

**Not in scope:** adding a control. A key with one control covering both the innate and the cast
case stays governed by CLAUDE.md's assumed-cast-order deviation; this item recovers only origins the
def lists already distinguish.

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

### F260 — The preset applier becomes DOM-free, and the presets are evaluated in Node

*Category: other* (testability). Approved 2026-09-05 out of the preset-suite cost measurement.

`PRESETS` is the authority for calculation correctness and can only be evaluated in a browser,
because the only code that turns a fixture into a `deriveUnitStats` input is `applyPreset`
([ui_state.js:399](Calculator/ui_state.js:399)) writing card controls and `readUnitStats`
([ui_card.js:56](Calculator/ui_card.js:56)) reading them back. `node_unit_checks.js` forbids
reconstructing that path in Node, and the reason is sound: the DOM path is not a passthrough. It
applies version gating by *clearing* gated controls (`applyDisabled`,
[ui_abilities.js:498](Calculator/ui_abilities.js:498)), merges several controls onto one `calcKey`
([ui_card.js:13](Calculator/ui_card.js:13)), applies roster records (`applyUnit`,
[ui_units.js:525](Calculator/ui_units.js:525)) and translates legacy identity. A second translation
written beside it would drift, which is what the prohibition protects.

Cost measurement in [JOURNAL.md](JOURNAL.md), 2026-09-05. The short form: the preset spec is 42.1 s
of a 196.5 s suite, and roughly half of one preset pass is the page maintaining itself rather than
calculating.

The fix is a **card-state model** — a plain object holding what the controls hold, with the DOM a
projection of it in both directions rather than its definition. That is what makes the equivalence
structural rather than checked. Most of the machinery is already pure and already `core`-scope:
`mergeAbilityCalcValue`, `dosSpecialAbilityValues`, `createUnitIdentity`, `abilityDefByKey`,
`UNIT_DEFAULTS` and both defs files.

**The item must move no number, including the matrix's.** F260.3 therefore carries the card/matrix
gating divergence explicitly instead of resolving it; F261 removes it afterwards. F260.8 is the
load-bearing subtask: the failure mode of the whole item is a pure path that computes a *different
unit* and a green suite that no longer notices, so 8 must be green before 9 or 10 take authority,
and it stays afterwards as the permanent anti-drift check — the role
`tools/derivation_equivalence.js` plays for the derivation.

The page keeps a DOM `applyPreset`: the Test Cases drawer is a user-facing feature (user ruling,
2026-09-05), which is what obliges 7 and 8.

- **F260.1** `readUnitStats` splits into `collectCardState(prefix)` and a core-scope pure
  `cardStateToDerivationInput(state, globals)`; production uses both, so the projection has one
  home. Depends on nothing.
- **F260.2** `abilityUiDefs`, `abilityVersionGated`, `subgroupAllowedForVersion`,
  `globalEnchantmentAllowedForVersion` and `MODERN_SPECIAL_FIELDS` are extracted from the page
  files into a core-scope source; `index.html`'s manifest and the manifest assertions follow.
  Depends on nothing.
- **F260.3** `applyVersionGating(state, version)` becomes the single implementation of
  `updateTypeVisibility`'s clear-and-disable half, consumed by the card and the matrix readers.
  The six-control Warlord divergence F261 records is carried as an explicit, named parameter so
  this subtask moves no number. Needs F260.2.
- **F260.4** `applyRosterUnit(state, unitRecord, version)` becomes the pure twin of `applyUnit`'s
  card writes; `applyUnit` computes it and writes the result. Needs F260.1.
- **F260.5** Identity moves onto the state: `presetIdentity` and `unitIdentityForDerivation`
  resolve a preset's R8 identity and its `specialUnit` without controls. Needs F260.1, F260.4.
- **F260.6** `presetToCardState(name, preset)` — the pure applier itself, including the globals and
  both fail-loud asserts (`assertFixtureMatchesVersionRecord`, `assertPresetRangedMode`).
  Needs F260.3, F260.4, F260.5.
- **F260.7** The page's `applyPreset` becomes `presetToCardState` plus `writeCardStateToControls`;
  the Test Cases drawer is unchanged for the user. Needs F260.6.
- **F260.8** The equivalence gate: every preset through both paths, derivation inputs compared
  field by field, run in the browser. Needs F260.7.
- **F260.9** `tools/preset_checks.js` evaluates every preset in Node through `presetToCardState`
  → `resolveCombat`, parallelized across cores. Needs F260.8.
- **F260.10** Authority moves: the Node suite becomes the numeric authority, `presets.spec.js`
  shrinks to a control-path sample, and the two “browser only” comments plus `TESTS.md` follow.
  The tier promotion needs a `PROPOSALS.md` entry. Needs F260.9.

### F261 — The matrix's version filter admits six Warlord-gated enchantments

*Category: faithfulness.* Approved 2026-09-05; ordered after F260 on the user's ruling.

The card gates a control with `abilityVersionGated`
([ui_abilities.js:371](Calculator/ui_abilities.js:371)), which honours `exceptVersions`. The matrix
uses bare `subgroupAllowedForVersion` at
[ui_matrix_properties.js:145](Calculator/ui_matrix_properties.js:145) (render),
[:260](Calculator/ui_matrix_properties.js:260) (value read) and
[:323](Calculator/ui_matrix_properties.js:323), with a single hand-added `abilityVersionGated`
exception for `blur` at [:324](Calculator/ui_matrix_properties.js:324).

Checked 2026-09-05 against every enchantment def in every version: exactly one version has a gap,
with six entries — `flameBlade`, `landLinking`, `discipline`, `destiny`, `mislead` and
`blazingEyes` in `com2_warlord_1.5.12.9`. Each is the CoM2-named half of a Warlord rename
(`exceptVersions: ['com2_warlord_']`, [enchantments.js](Calculator/enchantments.js)) and writes the
same `calcKey` as its Warlord twin. The matrix renders them and reads them as active where the card
hides them, which is INV-2: a control hidden for the active version can move a number. Same class
as F258.1's `enemyEyeOfHeaven`.

`npm test` is green with this present: `version-gating.spec.js`'s matrix half exercises one ability
rather than the def set. The fix is the matrix reader taking `abilityVersionGated`, the `blur`
exception going with it, and the spec asserting the two tests agree across every def and every
version. Numbers move in Warlord matrix runs. Needs F260.3, which gives both paths one gating
implementation to change.

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

The DOS eight-threshold ladders and template-ability formulas (including CoM's Blademaster divisors,
mana table and Lucky rewrite), plus the modern nine-step hero table. Decide how the current
six-entry level control exposes them. Evidence: R6.1f hero ladders and abilities; CoM2 level-bonus
tables; `combat_abilities.js:43-78`.

Hero *equipment* is deferred by SPEC until everything else works; this is progression, not equipment.

Subtasks: **F41.1** DOS ladders; **F41.2** DOS template-ability formulas; **F41.3** the modern
nine-step table; **F41.4** the level control.

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
| Q28 | What realm a Fantastic unit with a mundane base race has. `legacyUnitTypeFromIdentity` and `legacyUnitTypeFromLiveIdentity` (`stats_identity.js:71`, `:109`) read everything outside the six realm races plus `No Heal` as `arcane`. No shipped roster reaches it, but the UI does — Fantastic + Barbarian is a legal control pair. `UNITS.INI` cannot express the pair, so the sources leave it undefined. Either source the answer, restrict the control pair, or record the `arcane` reading as a deviation. |
| Q30 | **Code defect.** Sancta Basilica grants Sanctify to Crusaders and Paladins in `applySanctaBasilicaGrant` (`stats_identity.js`); `CreateUnit.CAS:412-441` writes four *mutually exclusive* `STypeID` branches — 108 and 231 get Sanctify plus improved Exorcise, 111 (Crusaders) gets Lucky alone, 113 (Paladins) gets Magic Immunity alone. The +3 Resistance ahead of the branches does apply to everyone trained there. `DisAbil.CAS:1036-1046` groups all three under one display line and is the likely origin of the conflation. Sanctify drives the Life-realm conversion, so the fix moves numbers. Settle with F200 stage 3. |

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
