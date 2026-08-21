# Calculator work history

Short index of completed calculator work. Behavior lives in `SPEC.md`; implementation evidence
lives under `Reference docs/`; benchmark comparisons live in `DUAL-AGENT-BENCHMARK.md`. Detailed
pre-2026-08-10 narratives remain recoverable from git history.

## 2026-08-21

- **F112 — the projectile-id map is complete, versioned, and stops on an id it does not know.**
  `RangedType.INI` classifies by flag: ids 10–14 carry neither `IsMagic` nor `IsMissile` and are
  the calculator's `boulder` class, 20–22 are `IsMissile`, 30–38 and 40 are `IsMagic`. Roster
  generation covered 10, 11, 20, 21 and 30–40 and sent every other id to a `'Missile'` default, so
  five Warlord units on ids 12 and 14 shipped as missile attackers — Stone Giant, Colossus, both
  Gaia Lords and the Goblin Midget Submarine. `Ismissileranged` reads the flag directly
  (`Combat.AttackAndWallHelpers.pas:181`) and `Combat.ApplyAttack.pas:228` feeds it straight into
  `EffectiveDefense`, so Missile Immunity was zeroing attacks the engine lets through, while
  Blazing March's magic-weapon grant and Elven Wind applied where they should not. The three map
  copies — the two generators, which disagreed on id 40, and a dead one in `data.js` with no
  reader — are now one home, `tools/ranged_types.py`, carrying a separate table per version
  because CoM2 1.05.11 base defines neither 12–14 nor 22 nor 40. Reserved id 39 is deliberately
  absent from both. Regeneration moves exactly five `ranged_type` values, all Warlord;
  `units_com2.js` is byte-identical. **This is the worked example behind `SPEC.md`,
  *Out-of-range values stop the run*, added in the same change:** the lookup and the missing-key
  path now raise with the value, the record and the expected set, and the codebase-wide sweep for
  the same shape is [F113](./BACKLOG.md).

- **F110 — a preset can state the modern card's four attack channels directly.** A CoM2/Warlord
  fixture may now carry `modernAttacks: { ranged: { strength, type }, thrown, fireBreath,
  lightningBreath }` on either unit; it is the complete statement of the card's channels, and the
  DOS-shaped `rtb`/`rtbType` pair keeps its one-channel projection where no `modernAttacks` is
  given (`dosPairAsModernChannels`, `ui_state.js`). **Two strength gates had to come off for the
  statement to reach the resolver, and both are the gate [F95](#2026-08-21) removed from the level
  ladder:** `modernCardAttacks` (`ui_units.js`) discarded the Ranged type selector's value unless
  the strength box was positive, and `deriveUnitStats` (`stats.js`) dropped a supplied channel at
  strength 0 unless an internal seed had asked for it. Both now treat a named projectile type as
  the Ranged record's statement of existence, which is what `UNITS.INI` ships (Warlord `[362]`
  Wanderer, `RangedType=30` with `Ranged=0`) and what `BaseUnits[i].rangedtype > 0` reads
  (`Units.RecalculateUnits.pas:548-571`). Thrown and both Breath fields have no type of their own,
  so strength remains their only existence statement, on the card and in the fixture alike.
  **Measurement.** No other preset can reach either relaxed gate: the only writer of the card's
  channels is `applyModernAttackFields`, which sets the type selector to `none` whenever it applies
  no ranged channel, and both channel sources — the DOS pair projection and `predefinedModernAttacks`
  — yield a ranged channel only above strength 0. The three internal zero-strength typed seeds
  (Marionette, Warlord combat Flame Blade, Dragon Mound) were already admitted as seeded. The suite
  confirms it: the whole 1032-preset suite passes, the two named presets included. Checks:
  `node tools/node_unit_checks.js` 14295/14295; `npm run provenance` 267 formulas, 267 verified,
  0 UNVERIFIED; `npm test` 114 passed, 0 failed.

- **F49 — CoM 1 now has its own Heavenly Light block.** `com1:0x905BB` reuses the space MoM
  spends on True Light: gated on the defending side and a non-zero `city_enchantments` byte, it
  adds +1 Defense and Resistance, +1 to a positive melee attack and to a positive shared ranged
  slot, raises `Weapon_Plus1` to 1 where it was 0, and adds a To Hit threshold to melee and to
  Thrown/Missile/Boulder where the persistent record carries no weapon quality
  (`unitcalc.c` com1:0x905BB-0x9064B). **Premise partly falsified.** The row said the effect was
  "absent from `enchantments.js` and `combat_abilities.js`"; the *CoM 1* effect was absent, but
  `heavenlyLight` has been a CoM2/Warlord control and a `c:heavenlyLight`/`c:heavenlyLight:toHit`
  step pair since M11, and neither engine's write lives in `combat_abilities.js`. CoM 1 was
  therefore added by widening the existing control (`subgroup: 'CoM, CoM2 & Warlord'`) and the
  existing step pair to `SCOPE_COM_PLUS` with a CoM 1 branch, as `blazingMarch` and `nodeAura`
  already do, rather than by adding a second control. The chain position is transcribed, not
  deduced: the relocated aura tail returns to `0x905BB`, so the pair sits after `c:soulLinkerAura`
  and before R6.1d resumes at `0x9064B`; `tests/f20-source-order.spec.js` gained the same two
  anchors independently. Two engine facts distinguish the CoM 1 branch from the modern one: its
  attack gates are **live**, not the persistent base attack, and its strength write carries **no
  type test**, so the DOS shared slot takes +1 whatever stands in it — Thrown, Breath and both
  gazes included — while the threshold keeps the narrower Thrown/Missile/Boulder set.
  **Left unmodelled, deliberately:** `com1:0x905E7` forces the weapon-quality byte to Magic Weapons
  for `_UNITS[si].type >= 0x97`, withholding both thresholds from high roster indices. What that
  ceiling selects is [Q18](./BACKLOG.md), open because the index-to-roster-id mapping is unsettled;
  the condition the evidence does determine — no weapon material — is implemented, the ceiling is
  not, and Q18 now records that it decides this block too. **Measurement.** 3,920 `deriveUnitStats`
  inputs over all five versions — the control on and off, crossed with seven ranged-slot shapes,
  four weapon materials, two melee values and seven co-occurring effects — differ in **392** cases,
  **every one `com_6.08` with the control on**. `mom_1.31`, `mom_cp_1.60.00`, `com2_1.05.11` and
  `com2_warlord_1.5.12.7` are identical throughout, as is CoM 1 with the control off. New coverage,
  each browser-confirmed against the number the unfixed code gives: `heavenlyLightMeleeCoM`
  **1.200** (0.600), `heavenlyLightToHitNeedsBareWeaponCoM` **1.600** (1.200, the material
  exclusion), `heavenlyLightMissileCoM` **1.200** (0.600),
  `heavenlyLightBreathStrengthNoToHitCoM` **0.900** (0.600, the strength write with no type test
  beside the threshold that has one), and `heavenlyLightMagicWeaponCoM` **11.000** (2.000, the
  Weapon Immunity bypass). `backlog_checks.js`'s F19 sweep dropped `heavenlyLight` from its CoM 1
  inert list, which the item makes false; the MoM half of that sweep still holds it inert. Nothing
  was folded in. Checks: `node tools/node_unit_checks.js` 14295/14295; `npm run provenance` 267
  formulas, 267 verified, 0 UNVERIFIED.

- **F101 — the Bombs & Grenades grant now lands on the record's Thrown field alone.**
  `SETSTAT(U,SThrown,0,(GETSTAT(U,SThrown,0)+%I(8-(GETSTAT(U,SFigures,1)/2))))`
  (`UnitCalcPre.CAS:1071`) is one write to one field, but `b:bombsGrenades` (`stats_sequence.js`)
  asked only whether the slot stood empty and typeless, so it typed and filled every slot in that
  state. It now asks `isThrownFieldSlot` (`combat_abilities.js`), the same structural question the
  ungated `Dec(U.thrown, …)` writes ask since [F91](#2026-08-20). **Premise held where it counts
  and was falsified in one detail.** Re-measured after today's six changes, the row's headline
  reading stands: a Warlord 1-figure melee-5 unit with Explosive Reform and Blaze of Glory derived
  Thrown **14**, because the grant filled the `SRanged` field the transfer needs standing by and
  `d:blazeOfGlory` then moved that spurious 7 into Thrown. The row's third named victim, the
  Lightning Blade `lightningBreath` seed, **never was one**: the base-phase `lightningBlade:breath`
  step types that field `'lightning'` before region `b` (`CreateUnit.CAS:294-299`), so the old test
  already excluded it. Focus Magic's `ranged` seed did take the grant, but its branch assigns rather than
  adds (`Units.RecalculateUnits.pas:885-891`), so no number moved there — only the modifier trace,
  which no longer shows a `rtbRanged` write the engine does not make. **Measurement.** 235,000
  `deriveUnitStats` inputs over all five versions — 14 seed-carrying and grant-carrying ability
  toggles up to three at a time, crossed with five DOS-shaped slot shapes, five modern channel
  shapes and four figure/melee/Chaos-Channels shapes — differ in **90** cases counting the step
  trace and **45** counting output alone, **every one `com2_warlord_1.5.12.7`**. `mom_1.31`,
  `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` are identical throughout, which is the row's
  declared scope (Bombs & Grenades is Warlord-only). Every moving case is Explosive Reform beside
  Blaze of Glory, and each loses exactly the duplicated grant. New coverage:
  `blazeOfGloryCarriesNoBombsGrenadesGrantWarlord` = **14.000** against the 21.000 the untested
  slot gave, browser-confirmed failing before and passing after against a reverted copy of the
  source. Nothing was folded in. Checks: `node tools/node_unit_checks.js` 14287/14287;
  `npm run provenance` 267 formulas, 267 verified, 0 UNVERIFIED.

- **F100 — Weakness' and Mind Storm's ranged arms now reach a typeless `SRanged`, as their
  ungated `Dec` does.** `Dec(U.ranged, 3)` and `Dec(U.ranged, 5)` sit beside their Thrown siblings
  with no positivity and no type gate (`Units.RecalculateUnits.pas:2273-2295`), so each names a
  field of the record rather than an attack the unit owns. `weaknessBinaryHits` (`stats.js`) asked
  `rangedType !== 'none'` and `slotGateAdmits`'s `rangedOrThrown` arm (`combat_abilities.js`)
  required a live slot; both now ask only which field the slot is — `isRangedFieldSlot ||
  isThrownFieldSlot` and `isModernRangedOrThrownSlot`, whose live-slot conjunct was the whole of
  the difference. **The row's "no number moves today" premise was stale, falsified by
  [F97](#2026-08-21), [F95](#2026-08-21) and [F98](#2026-08-21) earlier the same day**, and this is
  a defect with a fixture, not faithfulness. **Measurement.** 251,940 `deriveUnitStats` inputs over
  all five versions — every ability and enchantment key singly, crossed with five carriers that
  give a typeless `SRanged` an identity or move it, eight modern channel shapes and six DOS-shaped
  slot shapes — move **1,308 cases, every one `com2_warlord_1.5.12.7`**; `mom_1.31`,
  `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` are identical throughout, which is the row's
  declared scope. Every moving case has a Thrown attack beside the typeless Ranged field and
  `d:blazeOfGlory` to carry the penalty into it (`UnitCalc.CAS:1494-1500`); base CoM2 has no Blaze
  of Glory, which is why it cannot reach the difference. Held by
  `blazeOfGloryCarriesWeaknessRangedPenaltyWarlord` (6.000 against 9.000) and
  `blazeOfGloryCarriesMindStormRangedPenaltyWarlord` (8.000 against 13.000), both browser-confirmed
  failing before and passing after against a reverted copy of the two sources. Nothing was folded
  in. Checks: `node tools/node_unit_checks.js` 14287/14287; `npm run provenance` 267 formulas,
  267 verified, 0 UNVERIFIED.

- **F97 — the weapon material's two modern strength gates are the engine's.** `ApplyMagicWeapons`
  writes `Inc(Units[i].ranged, j)`, its display bonus and `hitchanceranged` inside
  `if not Ismagicalranged(Units[i].rangedtype)` with **no** positive-strength gate
  (`Units.RecalculateUnits.pas:648-656`), and writes `hitchancethrown` then `Inc(Units[i].thrown, j)`
  inside `if Units[i].thrown > 0` — the **calculated** Thrown field at that position (`:658-662`),
  which by `c:weapon` has already seen region `b` and `c:focusMagic`. `c:weapon` (`stats.js`,
  `weaponStatSteps`) had it the other way round on both, gating each on `context.calcBaseRtb > 0`,
  the slot's *input* strength. **The row's premise held on the two strength halves and was stale on
  its third claim:** `weaponHitThrown` did carry no strength test, but `weaponHitWrite` applied the
  engine's `U.thrown > 0` one level up, at the To-Hit target, so moving it into the function moves
  no number — the correction is where the test lives, not whether it is made. **Measurement.** A
  22,528-case weapon-material sweep — five versions × four materials × 16 control sets that create,
  move, retype or drain a secondary field × two levels × every DOS shared-slot type at zero and
  positive strength × 22 modern channel shapes — moves **508 cases, 90 `com2_1.05.11` and 418
  `com2_warlord_1.5.12.7`, none in the three DOS versions**; the 15,480-case derivation digest is
  unchanged throughout. Every moving case is a strength field; no To-Hit field moves anywhere, and
  nothing decreases. Two classes: a typeless `SRanged` now takes the material, which
  `d:blazeOfGlory` then moves into Thrown, and a Thrown field Bombs & Grenades created in region `b`
  now takes it too. On `com2_1.05.11` the only reachable class is the DOS-shaped legacy projection
  `result.rtb` at zero input strength, which the modern resolver does not fire, so no CoM2 damage
  number moves. Held by `weaponMaterialRangedHasNoStrengthGateWarlord` (9.000 against 7.000) and
  `weaponMaterialThrownReadsCalculatedFieldWarlord` (44.000 against 36.000), both browser-confirmed
  failing before and passing after. **Nothing was folded in:** the DOS material body has no strength
  test either (`unitcalc.c`, 131:0x8F089), but removing its `calcBaseRtb > 0` moves 164/162/132
  cases in `mom_1.31`/`mom_cp_1.60.00`/`com_6.08` — outside this row's declared scope — so it is
  filed as [F109](./BACKLOG.md). Checks: `node tools/node_unit_checks.js` 14287/14287;
  `npm run provenance` 267 formulas, 267 verified, 0 UNVERIFIED; the whole preset suite driven
  through the page's own `applyPreset` in a local browser, 1022 of 1024. **Those two red presets
  were found by this item, not caused by
  it:** `levelRangedGateZeroStrengthCoM2` and `levelRangedGateZeroStrengthWarlord`
  ([F95](#2026-08-21)) both measure 0 against expectations of 3 and 4, identically before and after
  this change — `applyPreset` builds no modern ranged channel from a DOS-shaped `rtb: 0` fixture,
  so the modern resolver has no attack to fire. Filed as [F110](#2026-08-21), since resolved.

- **F98 — Focus Magic now makes the engine's four-way permanent-record branch and its three
  independent strength tests.** `Caster.exe` runs `if U.doomgaze > 0`, `if U.firebreath > 0` and
  `if U.lightningbreath > 0`, each `+3`, and then **exactly one** of four ranged arms, all four
  gated on the permanent record: `(U.thrown > 0) and (B.ranged = 0)`, `B.ranged = 0`,
  `not Ismagicalranged(B.rangedtype)`, and an `else` adding `+3` to `U.ranged`
  (`Units.RecalculateUnits.pas:874-909`). `c:focusMagic` had hoisted that fourth arm out of the
  branch into a pre-loop over every channel gated on the *live* strength and type, and computed the
  conversion arms from `baseRangedPresent` — the raw card input, with a type test the engine's
  strength-only `B.ranged` does not make. The branch now reads `ctx.base`, and the modern and CoM 1
  bodies are separate: CoM 1's block is a three-way branch on the unit *type's* ranged type with a
  minimum of 3 (`unitcalc.c`, com1:0x8F7E6) and keeps `baseRangedPresent`, now its only consumer.
  **The row's premise held on both halves.** The re-measured `doomGaze 0 -> 3` on a CoM2 `magic_c`
  ranged 4 unit was still in the `c:focusMagic` ledger entry, and `e:clamp` still reverted it —
  `focusMagicDoomGazeMod`'s first disjunct is the same predicate the clamp gates on, so the wrong
  write could never reach a total. That half is therefore bound in the ledger rather than in a
  number, by `step_traces.js`. The row's `stats_sequence.js:486-490` pointer had gone stale to
  line 637. **Measurement.** 16,840 `deriveUnitStats` inputs over all five versions, before and
  after: `mom_1.31`, `mom_cp_1.60.00` and `com_6.08` are identical, and the modern diffs are two
  classes. A Warlord unit whose permanently magical ranged attack a region-`b` penalty drove to or
  below zero now takes the fourth arm's `+3` and survives the clamp — held by
  `focusMagicMagicalRangedIgnoresLiveStrengthWarlord` (not yet browser-confirmed) and a
  `deriveUnitStats` check. And the DOS-shaped shared slot, when it carries a Thrown *type* at zero
  strength, now takes the creation arm as the engine does; no preset or roster record reaches it,
  and the modern Ranged channel already held the created attack. Nothing was folded in. Checks:
  `node tools/node_unit_checks.js` 14287/14287; `npm run provenance` 267 formulas, 267 verified,
  0 UNVERIFIED.

- **F95 — the level ladder now makes the engine's four independent secondary writes, each on the
  record its own arm reads.** `ApplyLevelBonus`'s normal arm gates all four on the permanent record
  — `BaseUnits[i].rangedtype > 0` selecting `NormalMagicRanged` or `NormalMissileRanged`,
  `BaseUnits[i].thrown > 0`, and `.firebreath > 0` / `.lightningbreath > 0` sharing `NormalBreath`
  (`Units.RecalculateUnits.pas:548-571`) — while the hero arm keeps the base ranged gate and tests
  the calculated Thrown and both Breaths (`:509-530`). `c:level` had one if/else-if over the live
  record with an extra `calcBaseRtb > 0` on the ranged arm and no positivity test on the other.
  `getLevelBonuses` now carries `missileRanged`, `magicRanged`, `thrown` and `breath` as the four
  arrays `@Init@LoadLevelBonusINI` fills; `ranged`/`thrown` stay for the DOS ladders, which have no
  tables. The split moves no number with the shipped data — both `Levelbonus.INI` files have
  MissileRanged/MagicRanged and Thrown/Breath column-identical — so nothing tests it; the gates do.
  **The row's premise held in both halves.** Warlord Outlander with Explosive Reform, melee 5, one
  figure, no base secondary attack: Thrown 7/8/9 at Recruit/Veteran/Champion before, 7/7/7 after,
  and `UnitCalcPre.CAS:1071` is `SETSTAT(U,SThrown,0,...)`, record selector `0`.
  **The permanent record is now a real read.** Every permanent write is a `base`-phase step, so
  `runStatSteps` maintains the record through that phase and freezes it as `ctx.base` — the
  mechanism `steps.js` already documented and nothing populated. Reading it rather than the raw
  input is what lets Dragon Mound's and Lightning Blade's permanent breath writes meet the gate.
  **Measurement.** 151,200 `deriveUnitStats` inputs across all five versions and 6,588 roster-unit
  derivations, before and after: `mom_1.31`, `mom_cp_1.60.00` and `com_6.08` are byte-identical, and
  the modern diffs are two classes — a record whose ranged *type* names an attack at zero strength
  now takes the ladder, and a Thrown/Breath field created after the permanent record no longer does
  unless the unit is a hero. One shipped roster record is in the first class, Warlord `[362]`
  Wanderer (`RangedType=30`, `Ranged=0`), which also produced [F107](./BACKLOG.md). Held by
  `levelRangedGateZeroStrengthCoM2`, `levelRangedGateZeroStrengthWarlord`,
  `levelThrownGateBaseRecordWarlord` and `levelThrownGateHeroCalculatedWarlord`. Nothing was folded
  in. Checks: `node tools/node_unit_checks.js` 14285/14285; `npm run provenance` 267 formulas, 267
  verified, 0 UNVERIFIED.

- **F104 — the DOS resistance transform makes both +30 writes, and one consumer was spending the
  missing one as damage.** `dosEffectiveResistance:magicImmunity` (131:0x990B6, `SCOPE_DOS`) and
  `dosEffectiveResistance:righteousness` (131:0x990D5, `SCOPE_MOM`) are steps of
  `DOS_RESISTANCE_STEPS`; the duplicate +30s that stood at `fearFailProb`, `deathTouchFailProb`,
  `deathGazeFailProb` and `lifeStealEffective` are gone. **The row's premise was stale in both
  halves.** Neither effect was modelled as a skipped roll: Magic Immunity was a skip at eight
  consumers and a consumer-side +30 at Cause Fear — which is what the engine does, since the two
  gates at 0x99D3F and 0x99F67 jump past the touch/gaze group before any roll — and Righteousness
  was a consumer-side +30 at all four Death-realm consumers and never a skip.
  **Where they disagreed: Life Steal's margin.** `Combat_Resistance_Check` returns `roll −
  resistance`, and Life Steal spends that margin as drain, so a bonus held at the consumer reached
  the pass/fail gate but not the drain. Measured on a MoM unit at Resistance 5 against Life Steal
  −30: 30.500 damage before, 1.500 after, which is the engine's 35 − 30 = 5. Held by
  `righteousnessLifeStealDrain` and `righteousnessLifeStealDrain160`. CoM 1 keeps the address but
  reads Shadow Attack there ([F105](#2026-08-21)), so its list has no Righteousness step;
  `fearMagicImmune` already covers the Magic Immunity write's one visible consumer.
  **Measurement.** 3840 `buildResistanceContext` contexts and 1080 `resolveCombat` results across
  all five versions, before and after: every differing combat row has a Righteousness defender, and
  `com_6.08`, `com2_1.05.11` and `com2_warlord_1.5.12.7` are byte-identical once the Righteousness
  control is restricted to the versions that render it (`subgroup: 'MoM only'`, cleared by
  `applyDisabled`). Only two MoM rows move, both Life Steal. Checks:
  `node tools/node_unit_checks.js` 14285/14285; `npm run provenance` 267 formulas, 267 verified,
  0 UNVERIFIED.
- **F105 — CoM 1 no longer takes the two defence writes its own binary withholds.**
  `Battle_Unit_Defense_Special`'s Righteousness block is an 87-byte NOP field in CoM 1
  (com1:0x9A6DC..0x9A732) where both MoM builds make the write (131:0x9A728, 160:0x9A728), so
  `dosEffectiveDefense:righteousness` is now absent from CoM 1's ordered list rather than gated
  channel by channel — the same shape the elemental block already had. Its scope narrowed to
  `SCOPE_MOM`, which closed the `SCOPE_PROVENANCE_GAPS` entry M10 filed, and the gaze channel's
  now-redundant `!isCoM1` went with it. The spell path is settled with it: CoM 1 gates the Bless
  arm on `ranged_type > 39` (com1:0x9A6D3) and the spell-damage helper passes exactly 39
  (com1:0x871B6, against MoM's 38), so Immolation and Wall of Fire get no CoM 1 Bless bonus.
  `blessImmolationDefMoM`/`blessImmolationDefCoM` hold the pair, and the Bless tooltip stopped
  claiming Immolation for CoM 1.
- **The row's own preset is not writable, and that is the finding.** Righteousness does not exist
  in CoM 1 at all: `UE_RIGHTEOUSNESS` `0x40000000` is Shadow Attack there, both in the
  enchantment-name table (`R6.1a`) and in the item-power helper (`R6.1g`), which is why the block
  was NOPped. The calculator already models that with `subgroup: 'MoM only'`, so the control is
  hidden and cleared under `com_6.08` and no preset can reach the write; the CoM 1 Righteousness
  half is faithfulness, measurable only below the UI. Measured there, `computeDefenseProfile` over
  seven attack types and three defender configurations moves only in `com_6.08` — Righteousness'
  100 disappears from vsRanged, vsThrown and vsImmolation, and Bless' +5 from vsImmolation — with
  all four other versions byte-identical.
- **F103 — the DOS identity conversions now sit where the address map puts them.** The eleven
  ordered conversions ran in the order M7's helper split left behind; `unitcalc.c`'s
  `BU_Apply_Specials` gives every DOS realm write an address, and it runs them the other way round.
  The two MoM chains now carry Undead (131:0x8F3DC), Black Channels' realm write (0x8F4A1),
  demon-skin armor (0x8F6FE), demon wings (0x8F71B) and fire breath (0x8F738) in that order, and
  CoM 1 carries demon wings (com1:0x8F46F), fire breath (0x8F48C), Blood Lust (0x8F49A), Undead
  (0x8F4BC), demon-skin armor (0x8F757) and Mystic Surge (0x8F79E). Consequence: a DOS unit holding
  both a Chaos Channels mutation and a Death conversion finishes fantastic **Chaos**, as the engine
  leaves it, not Death — which moves Land Link, Survival Instinct, the realm gates and every
  realm-keyed aura. The reordered entries left `DEDUCED_POSITIONS`; only CoM 1's Focus Magic and
  Raise Dead stay inherited there, Raise Dead because it is a `combat.c` combat-spell write that
  `BU_Apply_Specials` never makes. The modern chains are untouched:
  `Units.RecalculateUnits.pas` already ordered them, and a probe over both CoM2 builds confirmed no
  number moved.
- **The sub-fork is settled against phase `a`, for both halves of the write.** Chaos Channels fire
  breath is region `a` in `Caster.exe` alone ($00599EE8, ahead of the UnitCalcPre hook at
  $0059A002). The DOS builds make the same effect inside `BU_Apply_Specials`, between the two
  sibling mutation blocks the chains already carried in region `c`, so nothing distinguishes it
  from them and `a:chaosChannels:fireBreath*` is now modern-scoped with `c:` DOS counterparts. Its
  stat half moved with its realm half, because they are one block: the shared-slot **assignment**
  now lands after the level bonus and the enchantment writes ahead of it rather than before them,
  so an elite MoM breather deals 2 and not 2 plus its level bonus. That reproduces a documented
  engine result independently — MoM's constructor runs Chaos Surge before `BU_Apply_Specials` and
  the assignment overwrites its +2, while CoM 1 calls `BU_Apply_Specials` first and keeps it.
- **Folded in:** nothing. Two findings were filed instead. **F106:** MoM 1.31 alone passes the
  mutations byte whole at the recompute's second `BU_Apply_Specials` call (131:0x90A1D), so its
  Chaos Channels blocks run twice; the chain models the constructor position only, which is exact
  for the additive armor bonus and lossy for the breath assignment. **T11:** the `c:chaosSurge`
  carve-out that skipped a MoM fire-breath slot is now inert — the corrected position produces the
  exclusion by itself — but removing it moves no number, so no preset can hold the removal.
- **Premise re-measurement.** Every address the row named was checked against
  `Reference docs/DOS reconstructed/unitcalc.c` and held. The row's headline example held too, and
  turned out to need the phase move it filed as an open question: reordering region `c` alone
  leaves fire breath ahead of Black Channels and the MoM unit still finishing Death.

## 2026-08-20

- **M13 — `chance:` is the To-Hit/To-Block ledger's namespace and nothing else's.** The prefix used
  to mean two things at once: the ledger's projection namespace (`buildChanceProjection` emitted
  `chance:${id}` *unless the id already started with it*) and a qualifier on sixteen real writes.
  That exception was what let a real write and its own projection share one `phase:id` key on all
  sixteen — the key the chains, `STEP_VERSION_SCOPES` and `assertStatStepOrder` all treat as naming
  exactly one step. **Decision: the two id spaces are disjoint.** Every step of the ledger carries
  the prefix — one projection per stat event, plus the three resolution-time writes native to it —
  and no step of a derivation sequence does, so the projected id is now mechanical and the exception
  is gone. `projectionOf` stays the authoritative marker, because an id is presentation and a ledger
  step that projects nothing (`attackSpecific:chance:distancePenalty`) has a scope row of its own.
  Thirteen ids lost the prefix accordingly: the three base seeds, `survivalInstinctToBlock`,
  `outlanderBallisticsTraining`, `energyCannonThreshold`, `trueSight:ranged`, `legacyClamp`,
  `modernClampCommon`, and the `holyWeapon` pair merged by (a). The two that keep a bare sibling
  took the qualifier `SPEC.md` already licenses instead — `c:weapon:toHit` beside `c:weapon`,
  `c:heavenlyLight:toHit` beside `c:heavenlyLight` — because each pair is two separately cited
  engine blocks, not one write split by field, which is what separates them from M11's merges.
  **(a)** `c:chance:holyWeapon:melee` and `c:chance:holyWeapon:rtb` are one step, `c:holyWeapon`,
  built the way M11 built the `heavenlyLight` pair: the union of the two `writes`, the `or` of the
  two gates, both halves in one `apply`. `hitTargetValue` reads only type and strength fields, so
  the melee half cannot change what the secondary half computes. Its merged citation is the `:rtb`
  list, of which the `:melee` list is a subset — the anchor is byte-identical, so no reviewed span
  moved. The ledger's own ids did not move at all: stripping the prefix from a real write makes
  `buildChanceProjection` re-add it, so `modifierTraces` still shows `chance:modernClampCommon`,
  `chance:legacyClamp` and `chance:distancePenalty`, and only `statTrace` ids changed.
  **Premise re-measurement.** Two of the row's three claims held and one did not. The pair is
  chain-adjacent in all five versions (positions 17/18, 27/28, 34/35, 38/39, 93/94), and the prefix
  was on exactly 16 ids, 14 of them without a bare sibling — the row's list of fourteen was exact.
  The row's “6 carry the prefix and 8 do not” was wrong on the second number when it was written,
  not stale: counting effects whose declared `writes` are only To-Hit/To-Block fields gives **11**
  unprefixed, not 8. `b:magitekEngine`, `d:hurricane` and `d:mechanicalExpert` were all present and
  hit-only at `865a648`, and the row's list omits them. The asymmetry the row argued from is
  therefore larger than it claimed, not smaller.
  **New coverage:** two sweep assertions state the namespace rule as an observation — no
  stat-sequence step carries `chance:`, every ledger entry does — plus a registry assertion that no
  derivation scope row does (`tools/unit_checks/version_scope.js`). The two `resolveScope` probes
  that named the pre-M11 `c:chance:vertigo` are re-aimed at the case that still exists, a ledger
  step with no `projectionOf`. **Arithmetic is unchanged in all five versions**, measured as zero
  differing cases and zero field differences across 15,480 derivations
  (`tools/derivation_equivalence.js`, `tools/derivation_equivalence_diff.js`). The seed steps' own
  split and two leftover field qualifiers were left alone and filed as `T10`.
  Checks: `node tools/node_unit_checks.js` 14,255 assertions, none failing; `npm run provenance`
  265 formulas, 265 verified, 0 UNVERIFIED (266 before: the merge retired one); `npm test`
  114 passed.

- **M10 — the DOS attack-specific stage is ordered steps, one list per engine.**
  `Combat_Effective_Resistance` and `Battle_Unit_Defense_Special` are transcribed as
  `DOS_RESISTANCE_STEPS` and `DOS_DEFENSE_STEPS` (`combat_effects.js`), keyed by version and run
  by `dosEffectiveResistance` / `dosEffectiveDefense` over a scratch copy — the same step type,
  runner, authoring syntax, canonical-scope rows and `PROVENANCE` labelling the Caster.exe pair
  already used, so the two stages now differ only in which routine they transcribe. Five
  resistance writes and twelve or thirteen defense writes replace the inline arithmetic in
  `buildResistanceContext` (`combat_phases.js`) and `computeDefenseProfile`, which keep only what
  the engine keeps outside the routines: the per-realm and per-attack classification
  (`dosDefenseForAttack`, the DOS counterpart of `computeCasterDefenseForAttack`) and the City
  Walls addition its caller makes afterwards. `SPEC.md`, *Attack-specific sequences*, *Version
  scope* and *The execution chain* record what moved; the stage is no longer a known limitation.

  **Premise, re-measured.** The named effects held — Charmed +30, Resist Magic +5, Bless +3 (MoM)
  / +5 (CoM 1), the latter two being what `isCoM` selected in a branch Warlord can never enter.
  `PROVENANCE[dosEffectiveDefenseProfile]` did span **seven** `DOS reconstructed/combat.c` ranges,
  and `PROVENANCE[resolutionResistanceContext]` did cover all five versions. Both line references
  had drifted by the earlier uncommitted rounds: `buildResistanceContext` is at
  `combat_phases.js:310` (row: `:313`) and `computeDefenseProfile` at `combat_effects.js:583`
  (row: `:584`).

  **Order, and which positions are provisional.** Every position is transcribed from
  `DOS reconstructed/combat.c`, address by address; none is deduced, so nothing here is marked
  provisional. Resistance runs base, Charmed, elemental, Bless, Resist Magic (131:0x9903C ->
  0x990A6 -> 0x990F5 -> 0x9912A -> 0x99143) — additive throughout, which is why a DOS unit can
  finish above the 100 Caster.exe's assignments cap it at, and why this is a separate
  transcription rather than a variant. Defense runs base, Illusion, Large Shield, the two
  `defense_special` markers, Magic Immunity, Bless, Righteousness, the elemental block, Armor
  Piercing, the Weapon Immunity payout and the blanket replacement. **MoM 1.31 writes the blanket
  marker before the Weapon Immunity one and CP 1.60 and CoM 1 write them the other way round**
  (131:0x9A66E/0x9A68C against 160:0x9A66B/0x9A68C), which is the whole of that build's
  Weapon-Immunity-overwrites-Missile-Immunity bug, now an ordering fact in the list rather than a
  version test in a branch. CoM 1 additionally splits MoM's `else if` elemental pair into two
  independent adds and cashes the Weapon Immunity marker as `+8` where the MoM builds raise to a
  floor of 10, so it has two step ids of its own.

  **Folded in.** The five `*Def` immunity helpers (`weaponImmunityDef`, `missileImmunityDef`,
  `fireImmunityDef`, `righteousnessDef`, `magicImmunityDef`) are deleted: their constants are now
  the ordered steps' own, and keeping them would have left the 50/100 replacement value and the
  Weapon Immunity floor with two homes. `weaponImmunityApplies` survives as the eligibility test
  both engine families call. `buildResistanceContext`'s dead `isCoM` parameter and its three
  unconsumed `bBless`/`aBless`/`blessBonus` return fields go with them, as do the `isCaster` and
  `isWarlord` branches inside `computeDefenseProfile`, which the `com2` early return had made
  unreachable.

  **Filed, not fixed.** Two engine facts the conversion made visible are new backlog rows rather
  than changes, because both would have moved a number in a version M10 scoped `behavior
  unchanged`. **F104:** the DOS resistance routine's `USA_IMMUNITY_MAGIC` and `UE_RIGHTEOUSNESS`
  +30 writes have no step, because the calculator models both as a skipped roll. **F105:** CoM 1
  NOPs the Righteousness defence block out entirely, yet the calculator still admits the write on
  its Chaos magical-ranged, breath and spell-damage channels; that is recorded as an explicit
  `SCOPE_PROVENANCE_GAPS` entry so the checks name it rather than pass over it.

  **Measurement.** A digest over three surfaces, before and after, in all five versions: 2400
  `computeDefenseProfile` profiles, 900 `buildResistanceContext` contexts and 160 full
  `resolveCombat` results per version. Defense and combat outputs are byte-identical; all eight
  resistance values are identical in every case, the only difference being the three dead return
  fields. Checks: `node tools/node_unit_checks.js` 14277/14277; `npm run provenance` 266 formulas,
  266 verified, 0 UNVERIFIED; `npm test` 114 passed.

- **M7 — eleven atomic identity conversions, and `unitType` is only a projection.**
  `determineEffectiveUnitType` is deleted. The single `a:legacyConversions` step it hid behind is
  eleven steps in `applyOrderedIdentityConversions` (`stats_identity.js`), each writing live
  `race`/`fantastic` directly, each with its own position, trace entry, ledger visit, canonical
  scope row and `PROVENANCE` citation. Sanctify loses the compact token's three-branch
  approximation and becomes what `UnitCalcPre.CAS:1246-1252` is: an unconditional Life-realm
  write plus a Fantastic write gated on a non-hero clergy unit — the hero special case existed
  only because a `hero` token has no realm slot. `normalizeCombatUnit` (`combat_phases.js`) no
  longer rewrites `unitType` a second time, and `applyLiveUnitType` — the token round-trip — is
  gone with it. `SPEC.md`, *Identity*, *The step model* and *The execution chain* record the
  three rules that moved.

  **Premise, re-measured.** Both counts held: **eleven** ordered conversions in the helper body,
  and **fifteen** source spans in `PROVENANCE[legacyUnitTypeConversions]` — which was duplicated
  verbatim as `PROVENANCE[legacyConversions]` beside the step. Two of three line references had
  drifted: the step was `stats_identity.js:186-195` (row: `:187-198`) and the helper
  `combat_abilities.js:290-329` (row: `:199-238`, a 91-line drift from the uncommitted M15
  round); `combat_phases.js:195` was exact.

  **Phases and positions.** Region maps first: `CoM2 binary - unit recalculation.md`'s phase
  index puts Chaos Channels Breath's realm write in `a` and CC Flight, CC Armor, Blood Lust,
  Animated, Undead, Mystic Surge and Destiny in `c`; the Warlord script grep puts Fiery Fury
  (`UnitCalcPre.CAS:832`) and Sanctify (`:1246`) in `b`, at those line positions. Nothing needed
  step 4. Scopes come from the same evidence: `SCOPE_ALL` for the three Chaos Channels writes and
  `undead`; `SCOPE_WARLORD` for `fieryFury:race` and `sanctify`; `SCOPE_MODERN` for
  `destiny:race`; `SCOPE_COM_PLUS` for `mysticSurge:race` and `raiseDead`; `SCOPE_MOM` for
  `blackChannels:race`; and a new `SCOPE_COM1_COM2` for `bloodLust`, because Warlord recasts the
  spell as Frenzy and sets `EncBloodLust` only in `UnitCalc.CAS`, after the compiled block that
  would have read it. **Provisional:** the two `b` entries are transcribed at their CAS lines and
  the `a` entry is provisional with its whole region; all eight region-`c` identity entries are
  named in `DEDUCED_POSITIONS` (`stats_manifests.js`) rather than inheriting region `c`'s
  transcribed claim, because they head their region by convention and, in the DOS builds, their
  order among themselves is inherited from the helper rather than from the address map.

  **Six ids carry a `:race` qualifier** — `chaosChannels:fireBreath:race`,
  `chaosChannels:armor:race`, `fieryFury:race`, `destiny:race`, `blackChannels:race`,
  `mysticSurge:race` — because one engine block writes the realm and a stat, and the calculator
  runs identity in a separate pre-pass, so `phase:id` has to separate two positions. This is
  `base:zombies:toBlock`'s exception, not a return of M11's `identity:` prefix.

  **Arithmetic, measured.** Full-digest comparison over **15,480** derivations
  (`tools/derivation_equivalence.js`): **0** differences for deleting the helper and the second
  rewrite. Splitting the merged scope moved **212** cases, every one of them a control the
  calculator's own version gating (`abilityVersionGated`, `ui_abilities.js`) hides in that
  version — Blood Lust and Mystic Surge under the two MoM builds, Black Channels under CoM 1,
  CoM2 and Warlord — which is the inconsistency the merged step hid: the stat halves
  `c:blackChannels` and `c:mysticSurge` already carried those scopes while the realm half ran
  everywhere. Every differing case was checked against the gating table, with **0** unexplained.
  Removing `normalizeCombatUnit`'s rewrite is separately shown inert: over **3,498** reachable
  version × base-identity × up-to-three-control combinations, the derived `unitType` is already a
  fixed point of the deleted helper, with **0** mismatches.

  **The structural regression** (`tools/unit_checks/identity.js`, +465 assertions) is four
  claims: no ordered identity conversion mentions `unitType` at all; every one of them declares
  only `race`/`fantastic`; combat normalization writes no `unitType`; and no step in any
  formula-bearing source declares a `unitType` write. Beside them, the projection is decoded by a
  transcription of the token's grammar — not by re-running the projection — and asserted to agree
  with the live identity across all five versions. Five mutations were run against a scratch copy
  and all five were caught, including "the projection stops tracking the live fields", which the
  decoder catches by name.

  **The audit for remaining merged helpers** found no more of this class. The largest surviving
  merged citations are `level` (13 spans, one `ApplyLevelBonus` block — [F95](./BACKLOG.md)),
  `levelBonusDispatch` (a table dispatch) and `resolutionResistanceContext` /
  `resolutionToBlockContext` (DOS resolution-time arithmetic; the resistance half has since
  become ordered steps under [M10](#2026-08-20)). The two
  remaining ordered compositions outside the phase-tagged records — `deriveUnitStats`'s ability
  grant chain and `normalizeCombatUnit`'s normalization chain — compose ability grants, not stat
  or identity writes, and each member already carries its own citation.

  **Filed, not folded in:** [F103](./BACKLOG.md). The split made the DOS conversion order
  readable, and it is the reverse of the address order — `unitcalc.c` runs Undead and Black
  Channels *before* the Chaos Channels blocks in the MoM builds, and puts CC armor *after*
  Undead in CoM 1, where the calculator has both the other way round. A MoM unit holding Black
  Channels and Chaos Channels Fire Breath finishes fantastic Chaos in the engine and fantastic
  Death here. Correcting it moves numbers in three versions, which is outside a row whose whole
  claim is that arithmetic does not move.

  **Checks:** `node tools/node_unit_checks.js` 14,006/14,006; `npm run provenance` 251 formulas,
  251 verified, 0 UNVERIFIED (239 → 242 → 251 as the merged pair became eleven anchors);
  `npm test` 114 passed.

- **M15 — the engine rules the DOM layer was deciding are cited derivation-layer functions.**
  `mergedAbilityValue` is now `mergeAbilityCalcValue` in `combat_abilities.js`, beside the ability
  accessors it is the write-side counterpart of. The DOS record's shared special-value byte —
  `DOS_SPECIAL_CONSUMERS`, `DOS_GAZE_KEYS`, `dosSpecialIsActive`, `dosSpecialAbilityValues` and
  `dosGazeAbilityValues` — is in `combat_special_attacks.js` beside `gazeRealm`, which already
  read the 103/104/105 contention back out of it. `ui_card.js`'s `dosSpecialValues` and
  `dosReceivedValue` only marshal now: read a control, name a key, pass a value. Three new
  VERIFIED anchors take the audit from 239 formulas to 242 — `abilityCalcKeyMerge` (the DOS
  per-player provider maximum in `combat.c`, `AddtoAuraTable`'s higher-value merge in
  `Units.RecalculateUnits.pas`, and a second grant of a record flag in `unitcalc.c`),
  `dosSharedSpecialByte` (the touch riders' `-abs(Spec_Att_Attrib)` reads plus those maxima) and
  `dosGazeTypeContention` (both kill loops). `tools/unit_checks/ability_inputs.js` adds 71
  assertions to `node tools/node_unit_checks.js`; each was confirmed to fail against a mutated
  rule before being kept. `SPEC.md`, *Stat derivation contract* now states the boundary.

  **Premise, re-measured.** The counts were exact — 0 `PROVENANCE` anchors in `ui_*.js` against
  66 / 30 / 11 / 4 — and `mergedAbilityValue` was exactly `ui_abilities.js:42-51`. Two spans had
  drifted: `dosReceivedValue` was `ui_card.js:254-261` and `dosSpecialValues` `:270-305`, against
  the row's `:254-260` and `:270-300`. Neither changes what the row claimed.

  **Arithmetic unchanged, measured rather than assumed.** `mergeAbilityCalcValue`'s body is the
  old one verbatim; the restructured `dosSpecialValues` was diffed against a transcription of the
  pre-move body over **62,720** marshalled states — five versions × seven byte spellings
  (including empty and non-numeric) × seven ranged types × four received-value sets × all 64 flag
  combinations — with **0** differences.

  **Not asserted, deliberately.** That two grants of one *boolean* do not stack has no observable
  consequence: every consumer of a boolean is a flag test, so any truthy merge behaves alike.
  That half of the rule stays a citation; what the checks assert is that either control alone
  reaches the effect, which is what separates OR from AND.

  **One membership left uncited.** Poison Touch's repeat count is modelled as a seventh consumer
  of the shared byte, but the reconstruction names its loop bound separately (`Poison_Strength`)
  and no evidence document gives that field's offset — only the roster's single `Gaze/Poison`
  column ties them. The gap is stated beside the consumer list rather than folded into the
  citation, which is [T8](./BACKLOG.md)'s class of work.

- **F90 + M14 — the field moves are real and the precomputed pass is gone.** Run as one package,
  which is how the sequencing conflict both rows recorded was settled: M14's position-aware gates
  are what F90 was blocked on, and F90's field moves are what let M14 reduce the pass to identity.
  M14 first, then F90, in one change.

  **M14.** `buildSlotContext` computed every type-dependent modifier and gate once, before the walk,
  from a `rangedType`/`thrownType` pair it advanced by hand through the chain's type writes. That
  pair is gone. Every modifier is now written in the step that consumes it and reads
  `u[c.rangedTypeField]` / `u[c.thrownTypeField]` at that step's own position; the slot gates
  `rtb`, `ranged` and `rangedOrThrown` moved out of the per-slot `slots` object into
  `slotGateAdmits` (`combat_abilities.js`), which resolves them against the record `addToSlot` is
  writing to. The type-list tests the engines make are named once beside it —
  `slotHasPhysicalRanged`, `slotHasMagicalRanged`, `slotHasThrown`, `slotHasBreath`,
  `isNonMagicalRangedFieldSlot`, `isConventionalRangedSlot`, `isModernSecondarySlot`,
  `isThrownFieldSlot`, `isLiveSlot` — so a step states the engine's condition rather than
  re-deriving a type list. `buildSlotContext` went from **457 lines, 111 bindings and 22 `*Mod`
  values to 159 lines, 44 bindings and none**, and returns slot identity plus the permanent-record
  facts the engine's own gates read from `B`. The row's premise held on re-measurement: it said
  461 lines, 112 bindings and 23 `*Mod` values, drift of four, one and one.

  **F90.** `U.ranged := U.thrown; U.thrown := 0` (`Units.RecalculateUnits.pas:885-891`) and
  `SETSTAT(U,SLightningBreath,1,GetStat(U,SThrown,1)+1)` / `SETSTAT(U,SThrown,1,0)`
  (`CreateUnit.CAS:294-299`) are now moves between two fields of the modern record, not retypes in
  place. Both free the Thrown field, so the `shadowThrown` accumulator is gone from
  `STAT_DERIVATION_SLOTS`, and with it `focusOwner`, `skipFocusBranch`, `deferShadowStrike`,
  `blazeOfGloryFillsSlot`, `blazeTransferRetypesSourceSlot` and the precomputed `secondaryHitKind`:
  a modern channel's To Hit modifier is now fixed by which record field it is, because no slot
  changes identity part-way through the walk. `d:shadowStrike:thrown` targets `isThrownFieldSlot`,
  which is that same structural question read at `UnitCalc.CAS:1262`. Acceptance holds:
  `focusMagic`+`shadowStrike` on Warlord melee 9 with `thrown 4` is `ranged 4 magic_s` +
  `thrown 4`.

  **Measured, per version.** The 15,480-case digest moves **12 cases**, in two classes and nothing
  else. Eleven are `modernAttacks.<channel>.baseStrength: 4 -> 0` on the channel that now
  *receives* a move (`com2_1.05.11` and `com2_warlord_1.5.12.7`), which is the move showing up as a
  trace entry from editable zero instead of a type-only change on a slot that already held the
  strength — what `SPEC.md`, *Traces* already requires of a channel-creating write. The twelfth is
  a correction: **CoM 1, missile ranged with Lionheart and Focus Magic, `rtb` 7 → 10.** Lionheart
  is com1:0x8F660 and Focus Magic com1:0x8F7E6 (`DOS reconstructed/unitcalc.c`), so the `+3` reads
  a type that is still Missile; the precomputed pass showed it the converted type and suppressed
  it. `mom_1.31` and `mom_cp_1.60.00` move nothing at all.

  **Folded in, because the live read exposed it:** CoM 1's material block gates its *whole*
  secondary half — strength, display bonus and threshold together — on
  `if (!(ench_lo & UE_FOCUS_MAGIC))` at com1:0x8F095, a test of the enchantment flag rather than of
  a type. The precomputed pass reproduced that by accident, reading the post-conversion type at a
  block the chain places before the conversion; with the read live the gate has to be stated where
  the engine makes it, and `R9-G1e CoM 1 Focus Magic suppresses the material shared-slot To-Hit
  write` is what caught its absence.

  **One thing the shared slot cannot read from the record.** The DOS-shaped `legacy` projection
  keeps one secondary threshold where the modern record keeps three, so it has to know which attack
  it will be carrying: Shadow Strike's grant creates a Thrown attack in region `d` while the ungated
  Thrown thresholds are written back in `c`. That is an input fact, not a prediction of any step's
  arithmetic, and it is the one place `secondaryHitTargets` consults `shadowStrikeActive`.

  **Closed in passing:** [F100](#2026-08-21)(a). Its fixture — Warlord melee 1, `thrown 4`,
  `lightningBlade`+`blazeOfGlory`+`lionheart` — now derives Lightning Breath 5 **and Thrown 3**,
  the number the row said the engine gives, because Lightning Blade's move leaves `SThrown` free
  for the transfer and the region-`e` clamp's slot test is a live read rather than
  `channelKey === 'thrown'`. The row's other half — the ungated ranged arms of Weakness and Mind
  Storm — is untouched and stays. [F101](#2026-08-21)'s premise was re-measured and still held at
  Thrown **14**.

  New coverage: `focusMagicFollowsLionheartCoM` = **5.000** (missile 2 + Lionheart 3, retyped to
  `magic_s` and so unstopped by Missile Immunity; reading the converted type at Lionheart's
  position leaves the branch minimum 3, and without Focus Magic the missile is stopped for 0) and
  `shadowStrikeFillsThrownFocusMagicVacatedWarlord` = **13.000** (melee 9 plus the grant's own
  thrown 4, against 17.000 where the grant lands on an unvacated 4 and 9.000 with no grant).
  `node tools/node_unit_checks.js` 13303/13303, `npm run provenance` 239/239 verified, `npm test`
  114/114 including all 987 preset expectations, and `node tools/preset_vacuity_sweep.js` reports
  neither new preset.

- **F99 — the distance penalty reads the finished ranged type.** `distancePenaltyFor`
  (`stats.js:1801-1808`) decided both whether a ranged distance penalty applies and which curve to
  use from `context.rangedType`, the value the precomputed pass leaves after `c:focusMagic`. It
  feeds a resolution-time projection, so it now reads `statUnit[context.rangedTypeField]`. The one
  write that separates the two is Warlord's `d:blazeOfGlory`: `SThrown := SThrown + SRanged`
  followed by `SRanged := SRanged - SRanged` (`UnitCalc.CAS:1494-1500`) empties the Ranged field,
  and the calculator's stand-in for the `SETSTAT(U,SAmmo,0,0)` beside it (`:1502`) clears the type,
  so the surviving attack is Thrown and has no range to be charged for. This is a projectile-*type*
  read, not the field-identity question `isRangedFieldSlot` answers — missile and boulder select
  different curves, and a typeless Ranged field carries no projectile — so it does not go through
  that helper.

  **The measurement the row asked for, first.** The legacy-slot `toHitRtb` projection did carry the
  penalty into a resolved number, not just a display: a Warlord unit with melee 1 and missile 6 at
  range 6, Blaze of Glory active, derived `toHitRtb` 0.84 with `rtbDistPenalty` −16 while its
  finished types were `ranged none` / `thrown thrown`, and the Thrown phase reads that same
  `toHitRtb` (`combat_phases.js`, `aToHitRtbVert`), giving 6.040 damage where 7.000 is correct. The
  row's two claims both hold as written, with only line numbers stale.

  **Measured, per version.** The 15,480-case digest moves **0 cases in all five versions** — it
  sets `rangedCheck`/`rangedDist` only through its `walls-ranged` environment at distance 3, below
  CoM2's threshold of 4, and never beside Blaze of Glory. A supplementary 33,800-case sweep crossed
  13 attack shapes (the four modern channels singly and together, and each conventional type on the
  DOS-shaped slot) with 26 late-type-write combinations, hero and non-hero, `rangedCheck` off and on
  at nine distances, over all five versions, recording the finished types, `toHitRtb`, the penalty,
  each channel's To Hit and both resolved damage means. **504 cases move, all
  `com2_warlord_1.5.12.7`; `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` are
  unchanged.** Every one is Blaze of Glory on a non-hero missile or boulder attack at distance ≥ 4,
  and every one is a penalty that stops being charged. `blaze+focusMagic` and `blaze+energyCannon`
  move nothing, which is the type read doing its work: those retype the attack to `magic_s` and
  `beam` before Blaze, and neither takes a distance penalty either way.

  192 of the 504 move a resolved damage mean and the other 312 move only the record-level
  `toHitRtb`/`rtbDistPenalty` pair, which for a unit with modern channels is the card's displayed
  To Hit line. Of the 192, 168 are the DOS-shaped shared slot, which no CoM2/Warlord browser input
  produces — every modern unit gets attack channels from `modernCardAttacks` (`ui_units.js`), and
  presets translate their `rtb` pair into one. The 24 a user can reach are the modern-channel case
  where the transfer has nowhere to move to: Lightning Blade has already spent the Thrown field
  (`CreateUnit.CAS:294-299`), so Blaze retypes the Ranged slot in place and that slot's own
  projection was charging a missile penalty to a Thrown attack. Where the Thrown field is free the
  move is real, the emptied Ranged channel disappears from the output, and the surviving channel
  never had a ranged type to be penalised for.

  New coverage: `blazeOfGloryThrownTakesNoDistancePenaltyWarlord` = **8.000** — melee 1, the
  transferred Thrown 6 and Lightning Blade's granted Lightning Breath 1, all at 30+70 = 100% —
  against the **7.040** the pre-sequence type gives by charging the Thrown attack CoM2's
  −10−3×(6−4) = −16%. Without Blaze the same unit's attack is still a missile, fires at range 6 and
  does take the −16% → 5.040. Nothing was folded in. E71's other half is left alone deliberately:
  the output contract's `rangedGetsWpn` is still the pre-sequence const where `thrownGetsWpn` is
  recomputed from `finalThrownType`, but `GetsWpn` occurs on 10 lines of `stats.js` and nowhere else
  in the repository, so neither field is read and no reading of them is observable. Settling that
  pair belongs to [M14](#2026-08-20), which removes the pass they escape from.

- **F96 — the region-`e` aura ranged gates are the strength tests the engine makes, on the record
  it reads.** Five aura-pass writes gate a ranged bonus and only one tests a type: Holy Bonus
  `if B.ranged > 0` (`Units.RecalculateUnits.pas:2535`), Guiding Beacon `if U.ranged > 0` (`:2543`),
  Misfortune `if B.ranged > 0` (`:2599`), Supreme Light `if U.ranged > 0` (`:2632`), and Leadership,
  which pairs `not Ismagicalranged(U.rangedtype)` with `U.ranged > 0` (`:2583`). `U` is `Units[i]`
  and `B` is `BaseUnits[i]` (`:806`). The item's premise holds block for block; its four line
  numbers were each one to four lines off the gate they named and are corrected here and in the
  [predicate inventory](../Reference%20docs/Attack-type%20predicate%20inventory.md).

  `addToSlot`'s `persistentRanged` arm is now `B.ranged > 0` — which record field the slot is, plus
  that field's permanent strength, with no type test on a modern channel — and carries Holy Bonus
  as well as Misfortune. A new `rangedField` arm answers which slot is `U.ranged` **at the writing
  step's own position**, through `isRangedFieldSlot` (`combat_abilities.js`), and carries Guiding
  Beacon, Leadership's strength half and `e:supremeLight`'s `+2`; the six-name `supremeLightRtbMod`
  is deleted. `hasPermanentRangedStat` keeps its own job, the `CreateUnit.CAS` city gates, which do
  read a permanent ranged type. The Blaze of Glory transfer's own "which slot is `SRanged`" test is
  the same helper now, so that rule has one home.

  **Measured.** The 15,480-case digest moves 2 cases, one `com2_1.05.11` and one
  `com2_warlord_1.5.12.7`, both Focus Magic + Holy Bonus at ranged 6 → 3; `mom_1.31`,
  `mom_cp_1.60.00` and `com_6.08` are unchanged. Its combination pass does not pair an aura with a
  late type write, so a supplementary 70,890-case sweep crossed the five gates — singly and all
  together — with 47 type- and strength-writing controls plus 153 pairs of the 18 that can reach a
  ranged field, over 17 attack shapes and all five versions: **640 cases move, 233 `com2_1.05.11`
  and 407 `com2_warlord_1.5.12.7`, none in the three DOS versions.** Every one is a bonus that
  stops being made; no number rises. Misfortune and Leadership alone move nothing, so their
  corrections are faithfulness only.

  Three shapes account for all of it. Holy Bonus no longer reaches a Ranged attack created or
  converted after the permanent record, where `B.ranged = 0`. Supreme Light no longer adds `+2` to
  a Ranged field standing at zero. And neither Guiding Beacon nor Supreme Light reaches the Ranged
  field `d:blazeOfGlory` has emptied — the position half, invisible to a predicate computed before
  region `d`. Holy Bonus does now write that emptied field, as the engine does, and the ranged-type
  clear standing in for `SETSTAT(U,SAmmo,0,0)` retires the result, so no output moves (`SPEC.md`,
  *Deliberate deviations*, which now names it).

  New coverage: `holyBonusSkipsFocusCreatedRangedCoM2` = 1.000 against the 5.000 the slot's type
  test gave, `supremeLightSkipsZeroedRangedCoM2` = 0 against 2.000,
  `guidingBeaconSkipsBlazedRangedWarlord` = 3.000 against 6.000, and
  `supremeLightSkipsBlazedRangedWarlord` = 3.000 against 5.000. One existing node check moved with
  the engine reading rather than against it: `derivation_stages.js` asserted that a Focus-Magic-
  created Ranged channel takes Holy Bonus while refusing Misfortune, to show two gates isolated —
  both read `B.ranged`, so what separates them is Guiding Beacon's calculated `U.ranged`, and the
  created channel is now 5 with neither permanent-record aura in its trace. Nothing was folded in.
  E40's own `Ismagicalranged(U.rangedtype)` eligibility read stays stale deliberately: making it
  live would feed the calculator's Blaze ranged-type stand-in into a gate the engine resolves from
  a record it never clears, which is [M14](#2026-08-20)'s to settle.

- **F102 — the equivalence digest was blind to every enchantment.** `deriveUnitStats` reads
  abilities and enchantments from one `input.abilities` map, because `abilityUiDefs()`
  (`ui_abilities.js`) merges `ABILITY_DEFS` and `ENCHANTMENT_DEFS` into it by `calcKey` — but
  `tools/derivation_equivalence.js` wrote ability specs to `over.abilities` and enchantment specs
  to `over[spec.key]` at the top level of the input, where nothing reads them. Measured: **0 of
  8,370** solo enchantment cases moved a number before the fix, **8,112** after. None of the
  genuinely top-level inputs are in either defs list, so nothing was relying on the old routing;
  the `ENVS` list already covers `trueLight`, `darkness`, `warpReality`, `nodeAura`, `cityWalls`
  and the rest. Both lists now go through one `setControl`, keyed by `calcKey` — which differs
  from the control's own key on eight enchantments (`natureLink` → `landLinking`, `apotheosis`
  → `destiny`, `liability` → `mislead`, `guardianWind` and `hillfort` → `missileImmunity`,
  `disciplineWarlord` → `discipline`, `chaosEmbrace` → `blazingEyes`, `planewalking` →
  `teleporting`) — and a case setting an Outlander reform now sets `outlanderWizard` with it,
  since `applyOutlanderReformGrants` (`stats_identity.js:540-547`) strips all fifteen without it.
  No stored digest survives the change, which is the point of the item. Re-verified with the
  corrected harness across the whole of [M12](#2026-08-20) and [F94](#2026-08-20): **15,480 cases,
  0 differing, all five versions**, against the tree as it stood before both landed. The digest's
  combination pass still does not reach F94's `explosive` + `fieryFury` pair, which is covered by
  `bombsGrenadesAfterFieryFuryWarlord` instead.

- **F94 — the pre-sequence type flips run in chain order, and the base seed is the permanent
  record.** `buildSlotContext` advances one `rangedType`/`thrownType` pair through five writes of
  its own, and advanced it in the order they happened to be authored — Military Workshop, Bombs &
  Grenades, Lightning Blade, Chaos Channels, Energy Cannon — where the Warlord chain orders their
  steps `base:militaryWorkshop`, `base:lightningBlade:breath`, `base:energyCannon`,
  `a:chaosChannels:fireBreath`, `b:bombsGrenades` (`stats_manifests.js`). The pair now advances in
  that order, with each position's predicates evaluated between the flips rather than after all of
  them.

  **The number this moves is Fiery Fury's.** `UnitCalcPre.CAS:832-846` runs before the Bombs &
  Grenades block at `:1066-1080` in the same file, and `b:fieryFury` precedes `b:bombsGrenades` in
  the chain, so Fiery Fury cannot see the Thrown field that block creates — but `ffRtbMod` read the
  pair after the grant and added its `+2` to it. Over a 54,900-case pairwise sweep of 60
  attack- and type-relevant controls across all five versions and six attack shapes, exactly three
  cases move, all `com2_warlord_1.5.12.7` and all Explosive Reform + Fiery Fury: Thrown 9 → 7 at
  one figure and 8 → 6 at four. `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` are
  unchanged, as is the 15,480-case `tools/derivation_equivalence.js` digest.

  **`base:stat:base` no longer carries a later step's write.** It is the chain's first entry, yet
  it seeded the type fields from a pair that had already taken both the `base:militaryWorkshop`
  boulder upgrade and the region-`b` Bombs & Grenades grant. Each is now made by its own step —
  `base:militaryWorkshop` declares `rangedTypeFields` and writes `'boulder'`, `b:bombsGrenades`
  declares `thrownTypeFields` and writes `'thrown'` — and the modern Thrown channel that grant
  creates is seeded `type: 'none'` like the Shadow Strike and Blaze of Glory fields beside it,
  because `SETSTAT(U,SThrown,0,…)` (`UnitCalcPre.CAS:1071`) names the calculated record. That is
  what F95 needs: `BaseUnits.thrown` now reads zero where `ApplyLevelBonus` reads it.

  The Chaos Channels / Energy Cannon transposition the item flagged moves no number and cannot:
  `ccFireBreathActive`'s modern arm asks `rangedType === 'none'` while Energy Cannon requires a
  permanent conventional ranged attack, so the pair is never `'none'` where the order could be
  observed — and on the modern record the two write different channel slots. It is corrected
  anyway, because the order is what the invariant claims. The dead `rangedType`/`thrownType`
  locals in `deriveUnitStats` are gone.

  New coverage: `bombsGrenadesAfterFieryFuryWarlord` = 40.000 against the 48.000 the previous
  order gave. **Nothing was folded in; two adjacent defects the measurement exposed were filed
  instead.** F101 — the grant has no slot test, so it lands on every channel field standing empty
  at `b:bombsGrenades`, and Explosive Reform + Blaze of Glory derives Thrown 14 where the engine
  gives 7. F102 — `tools/derivation_equivalence.js` writes enchantment controls to the top level of
  the input where `deriveUnitStats` reads them from `input.abilities`, so ~164 of the 170
  `ENCHANTMENT_DEFS` entries are inert in it and its run reported 0 differences over this change.

- **M12 — an `applied` ledger entry now means a block the engine entered.** A step whose
  enchantment was absent still ran, because its modifier had been precomputed to zero, so it had
  no `when` and the ledger recorded a visit to a branch the engine never took. Thirty-one steps
  now state the condition the engine tests and write the engine's constant: the thirteen
  `CreateUnit.CAS` building and Natural Selection writes, the ten `UnitCalcPre.CAS` curses and
  boosts, Endurance, Discipline, Orihalcon, Chaos Surge, Flame Blade's ranged half, region-`d`
  Weakness, and the weapon-material block — the last on the engines' own outer gate, `if EncMagic
  or EncMithril or EncAdamant` (`Units.RecalculateUnits.pas:603-605`) and `if (quality > 0)` over
  `mutations & 0x03` in all three DOS builds (`unitcalc.c`, `BU_Construct`). On a unit with
  nothing selected the ledger falls from 35 `applied` to 4 under Warlord, 10 to 4 in CoM2, 9 to 4
  in CoM 1 and 7 to 4 in both MoM builds. **The four that remain are correct and stay ungated:**
  the base seed, the level ladder — `ApplyLevelBonus` has no outer gate and always writes defense,
  resistance, HP, To-Hit and To-Defend (`Units.RecalculateUnits.pas:500-585`) — and the two
  terminal clamps. Gods Play Dices keeps a magnitude test because the script's four separate
  `EncDICE` flags (`UnitCalcPre.CAS:1699-1714`) are what the calculator's one signed control
  stands for, and zero is none of them set.

  **The `delta` dialect is retired.** Its 39 emit sites through `abilityStatStep` are ordinary
  `statStep` records with explicit `writes` and `apply` bodies, matching the rest of the sequence.
  Its five channel names were never five fields — `ranged`, `rangedOrThrown` and `nonGazeRtb` all
  wrote the same strength field and differed only in which `ctx.slots` gate they read. The one
  real content, the slot rule, is single-homed as `addToSlot(u, ctx, slot, value, whereStrength)`
  (`combat_abilities.js`), which `mislead` and `leadershipAura` now call as well. The `delta`-shape
  assertions in `tools/unit_checks/derivation_stages.js` are gone. Mutation probes settled which of
  their claims had behavioural cover, correcting the row's own list: the `nonGazeRtb` claims for
  `animated` and `blackPrayer` and both halves of the `positiveRanged` claim for CoM2 `tactician`
  are already covered by numeric consequences in `tools/unit_checks/derive_unit_stats.js`
  (`tacticianReadsLiveRanged` for the live-strength half); the one claim with no cover was CoM 1's
  Holy Bonus reaching Thrown through the shared `.ranged` slot, which is now the preset
  `holyBonusReachesThrownCoM1` 5.000, the mirror of `holyBonusSkipsThrownCoM2`.

  **The collapsed display/effective split is retired.** `chanceFields` is one field per quantity.
  The `display*` twins existed because Vertigo once wrote only the displayed halves while
  `resolveCombat` applied the effective ones itself; that stopped being true when Vertigo's To-Hit
  and To-Block writes moved onto the ordered record, and the split has stated nothing since. The
  surviving real instance of the distinction is `displayDef`, where `resolveCombat` still applies
  the Vertigo Defense die penalty itself. `deriveUnitStats` no longer returns
  `displayToHitMelee`/`displayToHitRtb`/`displayToBlock`; the one outside reference,
  in `tools/unit_checks/step_traces.js`, reads `toBlock`.

  Arithmetic is unchanged in all five versions: 15,480 derivations identical once the three
  removed twins are excluded, plus 600 targeted weapon/armor/attack-type/level cases covering
  `magic` weapons and `orihalcon` armor, which the digest's case list does not reach. The
  scope-key scraper (`tools/unit_checks/version_scope.js`) and the provenance auditor
  (`tools/provenance_audit.js`) key on `abilityStep(` where they keyed on `emit(`.

- **F91 — an ungated write to `SThrown` is a field write, not a type predicate.** `Dec(U.thrown, 3)`,
  `Dec(U.thrown, 5)` (`Units.RecalculateUnits.pas:2273-2295`) and `Inc(U.hitchancethrown, 10)`
  (`:1803-1809`) carry no positivity and no type gate, so what decides them is which record field
  the slot is. `modernThrownField` states that — the `thrown` channel slot, unless an earlier write
  has spent it on `SLightningBreath` or `SRanged` — and replaces the `thrownType === 'thrown' ||
  shadowStrikeFillsSlot` disjuncts F82 left at Weakness, Mind Storm and Holy Weapon's Thrown
  To Hit. Holy Weapon's now matches `heavenlyLightThrownToHit`'s shape exactly: no gate at all,
  because `secondaryHitKind` is what routes a slot to its threshold. The DOS-shaped `legacy` slot
  keeps the type test, which is what routes its shared value's two halves. **(b), settled with (a):**
  where the transfer finds no free Thrown field — Lightning Blade having spent it — `d:blazeOfGlory`
  retypes the source slot in place, and that slot now reads `toHitThrown` too, since the surviving
  attack is `SThrown` whichever slot holds it. Four things move, all
  `com2_warlord_1.5.12.7`: the Blaze-filled Thrown field takes Holy Weapon's +10 (missile 7 under
  Blaze, 30% → 40%); Weakness's and Mind Storm's penalties land on that field as well as on the one
  transferred into it (missile 7 + Weakness → thrown 1, was 4; + Mind Storm → no attack, was 2);
  neither reaches a Lightning Blade breath any more, which the engine leaves untouched (thrown 4 +
  Lightning Blade + Mind Storm → breath 5, was gone); and a transfer that stays in the Ranged slot
  reads the Thrown threshold rather than the Ranged one (magic ranged 6 + thrown 4 + Lightning Blade
  + Blaze + True Sight + Holy Weapon → 40%, was 35%). Measured as 1,495 differing cases out of
  69,540 derivations, every one of them Warlord and every one under Blaze of Glory or Lightning
  Blade; `com2_1.05.11`, `mom_1.31`, `mom_cp_1.60.00` and `com_6.08` are unchanged, measured rather
  than assumed. New cover:
  `blazeOfGloryCarriesWeaknessThrownPenaltyWarlord` 3.000, `blazeOfGloryThrownReadsHolyWeaponToHitWarlord`
  4.800, and six assertions in `tools/unit_checks/warlord_abilities.js`. The measurement also found
  two things left for [F100](#2026-08-21): the region-`e` clamp drops an attack the transfer
  retypes in place when the source slot has no permanent strength, and the ranged siblings
  `Dec(U.ranged, 3)`/`Dec(U.ranged, 5)` are still type-gated.

- **F89 — a ranged-less unit passes the engine's non-magical-ranged gate, and the gates now say
  so.** `Ismagicalranged(rt)` is `False` for `rt < 1` (`Units.RecalculateUnits.pas:2968-2975`), so
  every `not Ismagicalranged(U.rangedtype)` gate also admits a unit whose ranged type is zero:
  `SRanged` is a record field, not an attack the unit has to own. The measurement settled whether
  that matters. It does — `UnitCalc.CAS:1494-1500` reads `GetStat(U,SRanged,0)` with no type or
  strength gate and moves the whole field into `SThrown`, so a Warlord unit with **no ranged
  attack** and Lionheart gains a Thrown 3 attack it did not have: melee 1+3 plus thrown 3 measures
  **7.000** against 4.000 without Blaze of Glory and 1.000 without Lionheart
  (`blazeOfGloryCarriesRangedlessLionheartWarlord`). The six sites the
  [predicate inventory](../Reference%20docs/Attack-type%20predicate%20inventory.md) lists (I3, I5,
  I6, I7, I9, I11) now read `!isMagicalRangedType` on the modern record's `ranged` channel, while
  the DOS-shaped shared slot keeps Missile/Boulder — there `'none'` means the one value is
  carrying a Thrown, Breath or gaze attack instead. Two companion writes were needed for the
  widened gates to have anywhere to land: the `ranged` channel is seeded under Blaze of Glory, as
  the Thrown field already was, and `d:blazeOfGlory` identifies `SRanged` by which record field
  the slot is rather than by its current type. Measured across 19,140 derivations, exactly six
  cases move, all `com2_warlord_1.5.12.7`, all under Blaze of Glory; `com2_1.05.11` has no
  region-`d` reader of `SRanged` and the three DOS versions are untouched. Two gates are widened
  but still inert: Holy Weapon's and Heavenly Light's ranged To-Hit tails land on a field the
  transfer empties, and Discipline is hidden in Warlord by `exceptVersions`. The weapon material's
  ranged *strength* is still held off the typeless field by `rtbWpn`'s `calcBaseRtb > 0` gate,
  which is F97's.

- **F84 — every attack-type predicate read twice.** The audit swept all 96 `rangedType`/
  `thrownType` lines of `stats.js` and all 45 of `stats_sequence.js` — 141 lines, 73 predicate
  entries and 12 sequence rows — and recorded, beside each, the engine position it models and
  whether its breadth matches the gate at that position. The readings, including the map of all
  13 `Ismagicalranged` call sites to their calculator counterparts that F89 consumed, are in
  [`Attack-type predicate inventory.md`](../Reference%20docs/Attack-type%20predicate%20inventory.md).
  **Audit only: nothing was fixed.** The structural finding is that `buildSlotContext` computes
  every type-dependent modifier once from a pair that advances through five of its own writes in
  an order the execution chain does not have, and then stops at `c:focusMagic` — so the three
  later type writes (`d:rust`, `d:shadowStrike:thrown`, `d:blazeOfGlory`) are invisible to every
  precomputed predicate, which is the whole of region `e`. The Weakness case the item named as its
  starting point is already closed by F81/F83; six further right-number/wrong-branch cases replace
  it, one of them measured — Focus Magic writes `doomGaze 0 -> 3` on a magical-ranged unit that has
  no Doom Gaze, and only `e:clamp` hides it. One finding is number-changing and was measured too:
  a Warlord Explosive-Reform unit with no base secondary attack derives Thrown 8 at Veteran and 9
  at Champion where the engine's `BaseUnits.thrown` gate leaves it at 7. Six new items were filed — F94 the flip order and the base seed, F95 the level ladder's four
  base-record gates and three tables, F96 the region-`e` aura gates, F97 the weapon-material
  strength gates, F98 Focus Magic's four-way branch and its Doom Gaze test, F99 the distance
  penalty's stale type — and three additional narrow-gate call sites (Discipline, Lionheart,
  Leadership) were added to F89's scope. F91, F92 and F93 were confirmed in place and
  cross-referenced to the entries that carry their evidence.

- **The CoM2 To-Hit presentation reorder is gone.** The chance projection moved the
  weapon-material contribution ahead of Lucky in CoM2 and Warlord tooltips to preserve the order
  the projection had before F20 corrected the execution sequence. Lucky precedes weapon material in
  all five chains, so the reorder made two identical orderings display differently and left the
  tooltip asserting a sequence the model contradicts. Removed, along with the check that had pinned
  it — whose message claimed the order was "this engine sequence", making it an assertion bound to
  the implementation rather than a source, which [CLAUDE.md](./CLAUDE.md), *What an assertion has to
  be bound to*, exists to forbid. It now asserts the chains' own order. No arithmetic moves; all
  five versions present `lucky` then `weapon`. The related collapsed display/effective field split
  it exposed was folded into M12, above.

- **M11 — one step id per enchantment.** A step id is now the effect a player selects, carrying no
  qualifier the `phase:id` key, the scope table or the step's own `writes` already states.
  Eleven adjacent same-phase groups merged into one step each — `lionheart`, `giantStrength`,
  `landLinking`, `blazingMarch`, `reinforceMagic`, `weakness`, `focusMagic`, `blazeOfGlory`, and
  the `chance:` pairs `weapon`, `heavenlyLight` and `clamp`; `flameBlade`'s c-pair is deferred to
  F92, which merges it once it has settled whether the Warlord half belongs in region `b`, so the
  pair is not merged and then split again. `tactician` lost its version-chosen second id and is one
  `SCOPE_COM_PLUS` step whose CoM 1 and modern chains place it differently, which retired the last
  entry in the version-scope checks' PROVENANCE exemption list: every scope id now carries its own
  citation. Ten `:coM1` / `:aura` / `:warlordStack` suffixes and the `identity:` prefix on all
  eleven identity steps are gone, as is the `chance:` prefix on the five real writes that kept no
  bare sibling. `base:zombies:toBlock` is the one surviving qualifier — the only enchantment
  writing at two non-adjacent positions inside one region. `base:com1ConstructCatapult` folded into
  `constructCatapult` beside the modern step; `com1SummonBranch` did **not**, because it covers
  both the Paladins-to-Life and the Nature branches that the modern engines split into two writes,
  so it kept its own id as `summonBranch` with the engine name dropped.
  **One invariant changed:** `assertStatStepOrder` now keys sequence uniqueness on `phase:id`, the
  key the composer, the chains and `STEP_VERSION_SCOPES` already used; the bare-id check it
  replaced could not express one enchantment writing in two regions of one engine (Warlord's
  `c:weakness` and `d:weakness`). Two F20 assertions and one trace-projection assertion moved to
  the same key for the same reason, and the projection check now states what it always meant — a
  Breath reconstruction drops the *fields* belonging to other channels, not the whole entry, since
  a merged step's melee half belongs to every channel's view.
  Six flat halves left `getAbilityStatSteps` for hand-written steps in `stats_sequence.js`, because
  their attack-strength half reads a per-channel mod that builder never receives; `landLinking`
  needed `landLinkingEligible` plumbed through, since the emit it replaced read the pre-gated
  `effectiveAbilities`. Twenty-one PROVENANCE comments merged and their anchors rebound —
  the same reviewed spans regrouped, no new evidence — leaving 239 formulas. Player-facing
  modifier tooltips lost the raw qualifiers with them ("Identity Chosen" is now "Chosen").
  **Arithmetic is unchanged in all five versions**, measured as zero differences across 15,480
  derivations spanning every ability and enchantment control, eight attack shapes and nine
  environments, against a baseline taken on the pristine tree
  (`tools/derivation_equivalence.js`, `tools/derivation_equivalence_diff.js`).

## 2026-08-19

- **F83 — the pre-Focus type snapshots are gone.** `rangedTypeBeforeFocus` /
  `thrownTypeBeforeFocus` and all six per-site version ternaries reading them are deleted
  (`stats.js`). Each reader now takes the channel identity live at its own step's position: the
  three writes the chain puts ahead of `c:focusMagic:conversion` — `b:fieryFury`,
  `b:bombsGrenades` and `c:level` — are evaluated before the conversion in the pre-sequence
  chain, and `flameBlade:ranged` reads `u[rangedTypeField]`/`u[thrownTypeField]` in its own
  `apply`, which is what lets one gate serve CoM 1 (whose chain puts the step *before* the
  conversion) and CoM2/Warlord (after) with no `isCoM1` test. The M4 excess still subtracts
  `ffRtbMod`, the amount region `b` actually wrote. **Arithmetic moved in one version:** the
  three `isWarlord ?` ternaries were standing in for the pre-sequence Blaze of Glory and Shadow
  Strike flips that F81 and F82 removed, and their pre-Focus side effect made Warlord disagree
  with CoM2 at region-`c` positions the two chains share. On Warlord under Focus Magic only,
  Orihalcon now reaches the converted magical ranged (missile 6 → `magic_s` 8, was 6) while
  Discipline (−1), Blazing March (−3) and the Warlord blade (−2) stop reaching it — each now
  equal to CoM2 1.05.11, which no Warlord script overrides: `UnitCalcPre.CAS` and `UnitCalc.CAS`
  name Discipline and Blazing March only to set flags and Orihalcon not at all. Nothing moves in
  `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` or `com2_1.05.11`, measured by diffing 298,720
  derivations against an inverted-edit baseline. The four assertions that pinned the old Warlord
  values are replaced by the claim that carries them: a Focus-converted attack and a native
  magical one of the same strength must be treated alike by every write after the conversion,
  checked in both modern versions.

- **F82 — Shadow Strike's grant is a positioned region-`d` step.** `SThrown := SThrown + 1 +
  SAttack/3` (`UnitCalc.CAS:1262-1266`) still runs where it always did, after Colossal Strength
  and Vampirism, but the pre-sequence `shadowStrikeApplies` flip that re-aimed a slot's identity
  before any step ran is gone, and the Thrown field it fills is now seeded empty and typeless
  like the Blaze of Glory transfer's: the step supplies the identity, so nothing before
  `UnitCalc.CAS:1262` sees a Thrown attack the grant has not yet made. `shadowStrikeFillsSlot`
  replaces the flip and states only which field the write reaches. Three writers keep reaching
  that field through it, because the binary writes them with no positivity or type gate:
  Weakness's and Mind Storm's `Dec(U.thrown, …)` (`Units.RecalculateUnits.pas:2273-2295`) and
  Holy Weapon's `Inc(U.hitchancethrown, 10)` (`:1803-1809`); F91 generalized all three to the
  record field they write. Five type-gated ones stop reaching it, each toward the engine: Blazing
  March's +3 Thrown, Flame Blade (Warlord) +2, Fiery Fury +2, the Wall of Fire garrison +1, and
  Metal Fires' shared blade bonus. So do the level ladder, gated on `BaseUnits.thrown > 0`
  (`:562-564`), and the magic-weapon strength and To Hit, gated on `Units.thrown > 0` (`:660-663`)
  — both read the field in region `c`, where the grant has not written it. Nothing moves in the
  other four versions. The transitional `shadowThrown` slot stays: the calculator models Focus
  Magic's `U.ranged := U.thrown; U.thrown := 0` as an identity flip in place, so the record's
  Thrown field is not free for the grant, and making that move real needs position-aware slot
  gates — filed as [F90](#2026-08-20), which M12 did not lift. New coverage:
  `shadowStrikeGrantPrecedesNoBlazingMarchWarlord` 17.000, plus the two-channel acceptance case
  (`thrown 10` on F81's fixture) and the level/weapon exclusions in
  `tools/unit_checks/warlord_abilities.js`.

- **F81 — Blaze of Glory's channel transfer is a positioned region-`d` step.** `SThrown :=
  SThrown + SRanged` / `SRanged := SRanged - SRanged` (`UnitCalc.CAS:1490-1501`) is now emitted by
  `d:blazeOfGlory:thrown` at that line's own position instead of by a pre-sequence
  `blazeOfGloryConvertsChannel` flip plus a post-walk merge of two slots, so every earlier
  predicate reads the conventional Ranged identity the engine's earlier writes read. The Thrown
  field is seeded empty and typeless where the unit has none, since the transfer has no existence
  gate; the step supplies the identity, and the region-`e` slot clamp spares that field the way it
  already spares the armor-to-melee transfer. Rust gained the `SETSTAT(U,SThrown,0,0)` strength
  write beside its type clear (`:493-503`) — cosmetic until the transfer had a position, load-bearing
  now. Eight further effects change under Blaze on Warlord, each toward the engine: Rust −3 reaches
  the missile field (`thrown 3`, was 6); Weakness and Mind Storm carry their pre-clamp negative into
  the transfer; Lionheart's +3 lands on missile; Misfortune's `persistentRanged` −1 lands on the
  emptied Ranged field rather than the survivor; Metal Fires and Wall of Fire stop reaching a magic
  ranged attack through the flipped branch; Reinforce Magic reaches it; and the Focus-created Ranged
  is transferred, the old `calcBaseRtb > 0` gate having skipped it. `blazeOfGlory` alone, Colossal
  Strength, Vampirism and Shadow Strike are unchanged. Clearing the emptied field's ranged type is
  this model's stand-in for the `SETSTAT(U,SAmmo,0,0)` beside the transfer, recorded in
  [SPEC.md](./SPEC.md), *Deliberate deviations from the engine*. New coverage:
  `blazeOfGloryFollowsRustWarlord` 3.000, and the two-channel acceptance case in
  `tools/unit_checks/warlord_abilities.js`.

- **F88 — the modern engines derive every attack channel in one walk.** `Caster.exe` holds Ranged,
  Thrown, Fire Breath and Lightning Breath as four named fields of one record
  (`Units.RecalculateUnits.pas:203-219`) and mutates them in place, so the calculator now does too:
  `STAT_DERIVATION_SLOTS` (`steps.js`) declares one **slot** per record strength field, each with
  the type pair the two surviving pre-sequence flips still need beside it, and `deriveUnitStats`
  builds one context per slot and runs the sequence once. The per-channel recursion is gone with
  every ownership gate it needed — `_modernChannelPass`, `_modernChannelKey`,
  `energyCannonOwnsThisPass`, `ccOwnsThisPass`, `marionetteRangedPass`,
  `modernConventionalRangedPass`, `shadowStrikeOwnsThisPass` and the rest are per-slot facts now,
  not per-derivation ones. The channel-seeding rules survive as field creation: an effect with no
  existence gate — Shadow Strike, Bombs & Grenades, Focus Magic, Marionette, Chaos Channels Fire
  Breath, combat Flame Blade, Dragon Mound, Lightning Blade — seeds the field its step then writes.
  Vampirism stops probing: `UnitCalc.CAS:1490`'s combined truncation is now a plain cross-channel
  read of the three source fields at its own region-`d` position, which is the write F80 existed to
  make expressible. The DOS engines keep the shared `.ranged` slot, which the modern record carries
  beside its four as the card's legacy secondary projection — a fifth slot the engine has no field
  for, recorded in [SPEC.md](./SPEC.md), *Deliberate deviations from the engine*. The three To Hit
  writers F87 measured are re-sourced: `chance:weapon:rtb`, `chance:holyWeapon:rtb` and
  `chance:heavenlyLight:rtb` decide `hitchanceranged` from the record's own `rangedtype` and
  `hitchancethrown` from its Thrown field (`Units.RecalculateUnits.pas:639-662`, `:1806-1809`,
  `:1451-1454`), so a Thrown channel can no longer decide the Ranged modifier — latent under the
  recursion, a live defect under one walk. No arithmetic moves in any of the five versions; the
  flips and the Blaze of Glory merge stayed for F81/F82. New coverage: `ccFireBreathSeparatesThrownWarlord`
  4.400, which Hurricane's −20/−30 split makes sensitive to which field the grant lands in, and the
  pair `weaponToHitReadsOwnRangedChannelWarlord` 1.200 / `weaponToHitSkipsMagicRangedChannelWarlord`
  0.900, which read the Ranged modifier off a unit that also carries a Bombs & Grenades Thrown;
  plus per-channel strength and To Hit checks over a four-channel unit in
  `tools/unit_checks/step_traces.js`.

- **F87 — a recorded write now names the attack channel it reached.** `STAT_CHANNEL_FIELDS`
  (`steps.js`) is the single map from record field to channel — `toHitRanged` → Ranged,
  `toHitThrown` → Thrown, `toHitBreath` → both Breaths, since one `hitchancebreath` modifier
  serves two strength fields (`Units.RecalculateUnits.pas:203-219`) — and a step’s `writes:` is
  what resolves it, so nothing gains a second declaration. `recordStepTrace` tags a sparse event
  with the channels its *changed* fields reached; the execution ledger tags every visited step,
  applied or predicate-skipped, with the channels its *declaration* targets, so a step that did
  not fire still says which channel it would have reached. `projectTraceToChannel` rebuilds one
  channel’s view of a walk: channel-agnostic writes survive whole, a shared write keeps only that
  channel’s half, emptied events are dropped and `traceOrder` is renumbered, so the result is a
  trace `assertStatTraceOrder` holds on — that assertion now also requires attribution to be
  present and exact, in both the sparse and the complete form, which reaches the producers that
  build trace events outside the runner. No arithmetic moves in any of the five versions and the
  per-channel recursion stays; the next stage of F80 removes it and registers the four strength
  fields in the same table. Measuring the walk found three To Hit writers whose eligibility still
  reads the pass’s `rangedType`/`thrownType` rather than a per-channel field, recorded at
  `secondaryHitField` (`stats.js`); each pass’s own field is right, the others are latent. New
  coverage: channel-attribution and reconstruction checks in `tools/unit_checks/step_traces.js`,
  plus the enchantment’s first presets — `heavenlyLightRangedCoM2` 1.200 and, for the channel
  boundary, `heavenlyLightNotBreathCoM2` 0.600 against the 0.800 a Breath To Hit leak gives.

- **F86 — The modern secondary To Hit slot became three fields.** `toHitRtb` splits into
  `toHitRanged`, `toHitThrown` and `toHitBreath` for `com2_1.05.11` and `com2_warlord_1.5.12.7`;
  the three DOS engines keep the single slot, which is the shape they store. Fire and Lightning
  Breath are separate strength fields sharing one `hitchancebreath` modifier
  (`Units.RecalculateUnits.pas:203-219`), so three fields and not four — `toHitMelee` was already
  its own. Every writer now names its channels instead of depending on which channel the pass
  derives: Ballistics Training all three (`UnitCalcPre.CAS:1084-1086`); Heavenly Light, Holy Weapon
  and weapon material ranged and thrown but never breath (`Units.RecalculateUnits.pas:1451-1454`,
  `:1806-1809`, `:639-662`); True Sight ranged alone (`UnitCalc.CAS:326-328`), replacing the
  `modernConventionalRangedPass` gate F85 above used; Hurricane −20 ranged, −20 thrown, −30 breath
  (`UnitCalc.CAS:558,569-571`), retiring the `hurricaneRtbPenalty` 0.2/0.3 ternary that existed
  only because two engine fields shared one slot. Region `e` clamps all three against the
  already-clamped common value (`:2456-2480`), and Energy Cannon’s threshold reads the ranged
  field (`UnitCalc.CAS:1435-1443`). `result.toHitRtb` still exposes the deriving channel’s field,
  so the output contract is unchanged. Two values move, both where the shared slot had been
  self-inconsistent: a Lightning-Blade-converted channel is Breath and so no longer takes Heavenly
  Light’s Thrown bonus, and a modern unit with no secondary attack now shows True Sight’s
  unconditional `SToRanged` write. Nothing else moves, in any of the five versions. The
  per-channel recursion stays; collapsing it is the next stage of F80. New coverage reads several
  channels off one unit — Hurricane in `warlord_abilities.js`, Holy Weapon in
  `derive_unit_stats.js` — plus presets `hurricanePenaltySizeRanged` 1.600 and
  `hurricanePenaltySizeBreath` 1.700, because the existing `hurricaneRanged`/`hurricaneBreath` pair
  cannot separate −20 from −30: from a 30% base both floor at 10%.

- **F85 — Warlord True Sight leaked its To Hit bonus onto Thrown and Breath.** `UnitCalc.CAS:326-328`
  writes `SToRanged` alone, but `trueSightRtbToHitBonus` (`stats.js`) carried no channel test, so
  under the per-channel derivation the +5 also landed on the Thrown, Fire Breath and Lightning
  Breath passes. Gated on `modernConventionalRangedPass`, the same fix F67 below used for the
  Goblin Pox and Soul Flay ranged penalties; no ranged-type test, because the script writes the
  modifier whatever the type. Eye of Heaven inherits the bug and the fix through
  `UnitCalcPre.CAS:1840-1842`, which grants `EncTrueSight`. `PROVENANCE[chance:trueSight:ranged]`
  is unchanged and already cited the correct lines. The `derive_unit_stats` Eye of Heaven check
  asserted the leak — it measured `rtbType:'fire'` and expected 0.35 — and is re-aimed onto magical
  ranged, with a second case holding Fire Breath at 0.30. Two new presets,
  `trueSightBreathUnaffectedWarlord` and `trueSightThrownUnaffectedWarlord`, each 0.600 against the
  0.650 the leak produced. Found while checking whether existing evidence settles F80's record
  shape: the modern unit record carries `hitchance` plus four separate modifiers
  (`hitchanceranged`, `hitchancethrown`, `hitchancebreath`, `hitchancemelee`), so Fire and
  Lightning Breath share one To Hit field while remaining separate strength fields
  (`Units.RecalculateUnits.pas:203-219`; `MASTER.CAS:1000-1006`).

- **F67 — Goblin Pox and Soul Flay ranged penalties.** Both curses write `SRanged` in
  `UnitCalcPre.CAS` — Goblin Pox −1 on the Goblin branch and −3 on the non-Goblin branch, Soul
  Flay −FLAY per experience level — and both steps dropped it, the same defect F62 below fixed for
  Plague between them. Added `goblinPoxRtbMod` and `soulFlayRtbMod` (`stats.js`) gated on
  `modernConventionalRangedPass`, so each penalty lands on the conventional ranged channel and
  leaves Warlord’s independent Thrown and Breath fields alone, and extended both steps’ `writes`
  with `rtb`. Neither citation changed: `PROVENANCE[goblinPox]` covers `UnitCalcPre.CAS:1554-1572`
  and `PROVENANCE[soulFlay]` covers `1298-1310`, both including the ranged lines, so these were
  partial readings of correct sources. `goblinPoxNonGoblinArmorWarlord` asserted the opposite —
  its missile attacker was chosen because “Pox Host reduces only melee” — and is re-aimed onto
  Thrown, the channel the script really does leave alone, keeping its 3.000 against 0.000 without
  Pox Host while now also failing at 0.000 if the ranged write leaked to Thrown. Three new presets
  measure the write: `soulFlayRangedRecruitWarlord` 4.000 against 5.000, and
  `goblinPoxNonGoblinRangedWarlord` 5.000 and `goblinPoxGoblinRangedMilderWarlord` 7.000, both
  against 8.000, the Goblin pair also separating −1 from −3. The Soul Flay enchantment tooltip
  and the Pox host control tooltip now list the ranged term.

- **F65 — the `PRESETS`/`TEST_TREE` contract is now checked.** `CLAUDE.md`, *Presets* required
  every preset to appear in `TEST_TREE` with nothing enforcing it, and `immolationNotRangedCoM` had
  fallen out — evaluated by `runTests()` but unreachable from the browser grouping.
  `runPresetGroupingChecks` (`tools/node_unit_checks.js`) now diffs the merged `PRESETS` keys
  against every `keys:` list in `TEST_TREE` in both directions and reports both in one message; the
  reverse direction guards the same defect in an orphaned group key, of which there are none.
  `loadPresetContext` (`tools/calculator_sources.js`) loads the `data-scope="page"` fixture sources
  on top of the core context — they are plain data — selected by the names the *Presets* section
  already fixes, so a new part file needs no second list. Keys only: Node still never evaluates a
  preset. The missing key joined the version-differences `Immolation` group, where it completes a
  three-version scenario with `immolationRangedMoM` and `immolationNotRangedPatched` that is
  identical apart from `version:`.

- **F62 — Warlord Plague's ranged penalty.** The `plague` step applied melee, armor, resistance
  and To Hit but silently dropped `SETSTAT(U,SRanged,0,GetStat(U,SRanged,0)-3)`, which its
  `PROVENANCE[plague]` span already bound. Added `plagueRtbMod` (`stats.js`) gated on
  `modernConventionalRangedPass`, so the penalty lands on the conventional ranged channel only and
  leaves Warlord's independent Thrown and Breath fields alone, as the script does; extended the
  step's `writes` to include `rtb`. The citation and its anchor were unchanged — the span covers
  `UnitCalcPre.CAS:1540-1550` in full, so the defect was a partial reading of a correct source,
  not a mis-scoped one. New preset `plagueRangedWarlord` measures 4.500 with the write and 7.200
  without it, the gap being the 8-strength missile the old code left unreduced. The `plague`
  enchantment tooltip now lists the ranged term.

## 2026-08-18

- **M9 — one canonical version scope, one execution chain.** Stages 2 and 3, closing the item.
  *Stage 2:* `filterStepsToVersionScope` applies `STEP_VERSION_SCOPES` to all four sequences —
  stat, identity, figure and the To-Hit/To-Block ledger — before composition, replacing the
  `phase b/d && isWarlord` filter that was the only one of its kind. A version's sequence is now
  the writes that version's engine makes, so an out-of-scope step is absent rather than present
  behind a false predicate, and the region-`c` lists lost the entries the filter made unreachable
  (68→60 modern, 68→49 CoM 1, 68→37 both MoM builds). The filter is also the coverage check —
  an unclassified step throws there, in every build rather than under the debug switch — so the
  three debug-only coverage assertions are gone. Stage 1's measured worklist of 48/48/39/32/15
  out-of-scope members per version is now an invariant instead of an inventory: no version
  composes an out-of-scope step, evaluates one's predicate, or writes a field from one. The eight
  steps whose removal could have changed a number are each an enchantment whose control the
  version hides, so no UI state reached them.
  *Stage 3:* one ordered chain per version, `base` through `e`, is the single ordering mechanism —
  `statChain` in `stats_manifests.js`. Array order decides nothing, `phase` is a provenance label
  that orders nothing, and a step whose key the chain does not name fails composition instead of
  landing where it was authored. Both derivation sequences and the figure sequence walk it. Each
  entry says whether its position is transcribed or `provisional`: region `c` and the Warlord
  `b`/`d` lists are transcribed, `base`/`a`/`e` are inherited from authoring order, and CoM 1's
  Focus Magic is the one deduced position inside a transcribed region. That flag was set on
  `berserk` alone and consumed by nothing; it is now asserted key by key per version. A projection
  states the write it re-presents as `projectionOf` instead of having it guessed from a `chance:`
  prefix — the guess could not tell a projection from a real `chance:` step, so a real one whose
  scope row went missing silently inherited another step's. Arithmetic is unchanged in all five
  versions: 114 Playwright tests, 983 presets and 13459 node checks green.

- **F59 — the preset reconciliation is closed; the suite is green.** The last three failures were
  not M9's to fix — all three run under `mom_1.31`, where both effects are in scope, so the scope
  filter never touched them. Each was a separate, sourced problem. `berserkDoublesAfterOtherBonuses`
  expected High Prayer before Berserk's doubling; `unitcalc.c` doubles at `131:0x8F860`, the last
  block of the unit-enchantment routine, and adds High Prayer's +2 at `131:0x902CF` in the
  combat-enchantment blocks that follow, so 8 is the engine's answer and 10 was the pre-R1 deduced
  position. Renamed `berserkDoublesBeforeHighPrayer`; the step's `provisional` flag and the "after
  all other bonuses" claim in its comment and tooltip are gone, because the routine is decoded.
  `metalFiresFantasticUnaffected` expected 2.000 against its own description; it expected 1.000
  until `a1d686d` renumbered it, and 1.000 is what the Fantastic gate produces.
  `metalFiresFantasticNoWeaponUpgrade` is retired: a Fantastic unit's `Weapon_Plus1` is already 1
  at `131:0x8F266`, long before Metal Fires' region-`c` block, so its attacks are always magical,
  `Battle_Unit_Attack_Immunities` never sets the Weapon Immunity flag, and the preset's premise
  could not hold. Measured with and without Metal Fires: 2.0 either way. Its claim has no
  observable consequence in the model — [F61](./BACKLOG.md)'s aim-vacuity mode, which it now
  illustrates alongside `upgradedExplosiveBeforeTrueLightWarlord`.

- **Two defects the M9 filter surfaced.** `baseUnitInput` defaulted the node suites to
  `version: 'com2_1.5'`, which is not one of the five: every `startsWith('com2_')` predicate
  accepted it while the exact `version === 'com2_1.05.11'` tests in `combat_fear_and_touch.js`,
  `combat_phases.js` and `ui.js` did not, so those paths were probed as a build that does not
  exist. And the CoM 1 source-order anchors in `tests/f20-source-order.spec.js` named
  `discipline`, `badMoon`, `goodMoon` and `natureConjunction` — `Caster.exe` writes with no CoM 1
  counterpart, which only ever matched skipped visits to steps the binary does not contain.

- **F63 — Blaze of Glory's channel transfer reaches the output, and adds.** The Ranged→Thrown
  conversion was a local mutation that the stepped record could not see, so it had stopped
  reaching the result; it is now `d:blazeOfGlory:thrown`, a step beside `d:blazeOfGlory` under the
  same `UnitCalc.CAS:1490-1501` citation, which covers both transfers of the one script block. The
  script's `SThrown := SThrown + SRanged` is an addition, not a rename, so the modern channel
  assembly in `stats.js` now merges a Blaze-converted Ranged channel onto the Thrown field instead
  of letting the two collide on one output key: `ranged 6 + thrown 2` yields `thrown 8`, the
  script's answer, where the collision previously dropped the converted strength and printed
  `thrown 2`. The Thrown field is the survivor and keeps its own type, To Hit and traces; the
  merge happens after the channel walk so it does not depend on channel order, and it extends the
  surviving modifier trace so `modifierTrace.result` still equals the reported strength. The
  preset fixture format maps a scenario onto a single modern channel, so the two-channel case is
  asserted in `tools/unit_checks/warlord_abilities.js` with its feature-removed control.
  `blazeOfGloryRangedToThrownWarlord` is green; `npm test` is 113 passed with [F59](./BACKLOG.md)'s
  three M9-held preset failures remaining. Implementing it measured a third, distinct defect at the
  same site, filed as [F66](./BACKLOG.md): the local flip re-aims the type predicates of every
  earlier region, so a Blaze unit escapes Rust's missile/boulder penalty. The Giant Strength
  half of that first reading was wrong and is withdrawn in F66 — the ability is MoM-scoped.

- **F64 — the DOS thrown/breath phase no longer requires melee strength.** `combat.js` gated the
  melee-path thrown/breath rider on base melee > 0 for `mom_1.31`, `mom_cp_1.60.00` and
  `com_6.08`, an unsourced predicate added in `563d4d3`. It is gone: `BU_AttackTarget` admits the
  rider on attack type alone (`DOS reconstructed/combat.c:2605`), its melee entry carries no
  strength gate in any build, and the routine's sole call site — one near call at `0x9AF40`,
  identical across the three builds, found by scanning both direct call encodings over each whole
  executable — is unconditional, computing a ranged-versus-melee mode argument rather than
  deciding whether to engage. The call-site evidence is in
  [R6.2a](../Reference%20docs/DOS%20reconstructed/R6.2a.evidence.md), *Call-site admission*;
  the routine at `0x9AD04` remains unreconstructed and no reconstruction was needed. Whether the
  game's UI offers a zero-melee unit a melee attack is a command-layer question the calculator
  deliberately does not model — it computes the exchange it is given, which also sidesteps the
  unresolved base-versus-effective and Confusion cases. `guidingBeaconExcludesThrownCoM` is green;
  `fireImmunityAfterArmorPiercing` keeps its expectation of 0 but now reaches the immunity it
  names. CoM2 and Warlord are unaffected: their thrown/breath channels never used this predicate.

- **T7 — `ui.js` split into readable sources.** The last calculator file no agent could read whole
  (205 KB, 4,772 lines) is now seven, cut along its own responsibilities: `ui_abilities.js` (ability
  controls, version gating, show-inactive visibility), `ui_units.js` (roster comboboxes and identity
  controls), `ui_card.js` (control reading, the modern and DOS special blocks, the derived stat
  card), `ui_state.js` (reset/swap/version switching, presets, and the share, hash and localStorage
  payloads), `ui_matrix_properties.js` (the matrix property drawer) and `ui_matrix.js` (matrix
  stats, worker, table, CSV, modal), with `ui.js` keeping result rendering, `recalculate` and the
  bootstrap wiring. Largest is now `ui_state.js` at 40 KB. The cut is load-order-safe by
  construction: every top-level statement in the UI layer stays in `ui.js` in its original order and
  `ui.js` stays last, so the other six declare only and nothing runs before what it needs — the rule
  is recorded in index.html's manifest comment, which owns load order. No behavior change; every
  moved line moved verbatim. `node tools/node_unit_checks.js` passes 12,750 assertions (12,744 plus
  one manifest existence check per new source), `npm run provenance` is unchanged at 264 formulas,
  and `npm test` is unchanged at 113 passed with [F59](./BACKLOG.md)'s 25 preset failures still red,
  identical in name and error magnitude. The largest calculator source is now `stats.js` at 113 KB.

## 2026-08-17

- **T6 — the provenance-narrative boundary decided, and the duplication it found removed.** The
  boundary: prose stays beside the code when it justifies the step's *position*, records a
  divergence the calculator makes deliberately, or documents the code's own vocabulary; it belongs
  in evidence when it establishes how an engine *value* was arrived at — patch sites, table
  lookups, source-vs-source reconciliation. An address in the prose does not decide it: position
  justification cites addresses too. The audit measured 250 KB of comment text across the twelve
  formula-bearing sources, in 760 blocks of which 92% are four lines or shorter, so there was no
  bulk move available. Of 319 multi-line prose blocks only **92 carry a `PROVENANCE`/`STAT-FORMULA`
  citation**; triaging all 92 against the boundary found seven carrying value-derivation, each with
  an evidence home strictly richer than the code text (Wall of Fire and Immolation to *Immolation
  and Wall of Fire are both Fireball*, Chaos Channels to *`BU_Apply_Specials` runs twice*, undead
  immunities to *Undead immunities are a race gate in MoM*, the ranged divisor to *Ranged distance
  penalty*, Artificer and Lucky Star to `Source discrepancies.md` §6 and §10). Those were replaced
  by section pointers, and the phase-model restatement in `combat_abilities.js` — a third copy of
  what `SPEC.md`, *Phases* and `CLAUDE.md`, *Step authoring* own — was deleted outright. The
  measured saving is **1,461 characters**: the anchored corpus turned out to be almost entirely
  position justification and deliberate-divergence notes, both of which stay, so T6's premise that
  long-form narrative was displaceable in bulk does not hold and it is retired rather than
  continued. The 227 unanchored blocks are the opposite problem and became T8. Comments only —
  `node tools/node_unit_checks.js` passes 12,744 assertions, `npm run provenance` is unchanged at
  264 formulas.

- **`SPEC.md` stopped restating engine behavior, retiring T5.** The spec described what individual
  abilities, enchantments and effects do — magnitudes, gates, arithmetic, channel lists — in prose
  that nothing checked, alongside binary addresses, CAS line numbers and loaded INI constants whose
  owners are the evidence documents. `PROVENANCE[id]` citations carry the same claims and *are*
  checked, by `npm run provenance`, so the spec's copy was an unverified duplicate of a verified
  one, with drift resolved by whichever copy the reader opened. Effect behavior now has one home:
  the citation beside the implementing step. `SPEC.md` keeps scope, computation and derivation
  architecture, the input/output contract, invariants, and a new **Deliberate deviations from the
  engine** section — the 17 places the calculator knowingly departs from, narrows or declines to
  reproduce the engine, which no binary states and which were previously buried mid-paragraph.
  1,281 lines to 619 (92 KB to 40 KB, ~24.8k tokens to ~10.7k), so T5's premise no longer holds and
  it is retired rather than done. The phase-classification procedure moved to `CLAUDE.md` as the
  authoring convention it is; routing in the root `CLAUDE.md` and `Calculator/CLAUDE.md` now sends
  effect questions to the citation rather than the spec. Two orphans surfaced: a dangling `D1/D3`
  reference behind Righteousness' parked classification, re-filed as Q27, and the DOS per-figure
  Doom Gaze divergence, filed as F60. Documentation only — `node tools/node_unit_checks.js` passes
  12,744 assertions and `npm run provenance` is unchanged at 264 formulas.

- **T4 — the three unreadable sources split.** `combat.js` (325 KB) is seven files cut at
  top-level function boundaries, `combat.js` itself keeping `resolveCombat`; `stats.js` (221 KB)
  is four, cut at the phase boundaries M9 works in — `stats_manifests.js`,
  `stats_identity.js`, and `stats_sequence.js`, whose six functions are the engine regions `base`
  through `e` in execution order; and `tools/node_unit_checks.js` (233 KB) is an entry point over
  ten suites in `tools/unit_checks/`, sharing one assertion counter. Largest remaining file of the
  three: `stats.js` at 113 KB. The stat sequence no longer closes over `deriveUnitStats`' locals:
  it takes the 182 values it reads as one context object, so a region states its own inputs, and
  the classification checks proved this behavior-neutral because nothing the sections read is
  reassigned after the sequence is built. Formula-bearing sources also got one home —
  `calculatorFiles` in `provenance_audit.js`, which the manifest generator and the version-scope
  checks now read instead of repeating a list that would otherwise have grown from two names to
  ten in four places. No behavior change: `node tools/node_unit_checks.js` passes 12,744
  assertions (12,735 plus one manifest existence check per new calculator source), `npm run
  provenance` is unchanged at 264 formulas, and `npm test` is unchanged at 113 passed with
  [F59](./BACKLOG.md)'s 25 preset failures still red. T4 named three files; `ui.js` (205 KB) was
  larger than any of them and became T7.

- **T3 — `data.js` split into readable sources.** The repo's largest file (509 KB, ~141k tokens)
  is now twelve, each one an agent can read whole: `data.js` keeps the constants, the version ids
  and the two definition-layout helpers; `abilities.js` and `enchantments.js` take the definition
  lists; and the 979 numeric presets are cut by ability family across seven `presets_*.js` files
  that merge into one `PRESETS` through `definePresets()` (`presets.js`), with `TEST_TREE` in
  `test_tree.js`. Nothing was reordered — the cuts fall on the existing `// --- family ---`
  boundaries, so the presets' relative-position prose still reads true — and `definePresets()`
  rejects a key defined twice, which the single object literal accepted silently. The presets and
  the tree are `data-scope="page"`, which is the manifest stating what `CLAUDE.md` already
  required: `PRESETS` is evaluated only through the page's `runTests()`, and the Node suites now
  load 424 KB less. No behavior change: every global is byte-identical in content and key order
  (all 979 presets), `node tools/node_unit_checks.js` passes 12,735 assertions — 12,724 plus one
  manifest existence check per new file — `npm run provenance` is unchanged at 264 formulas, and
  `npm test` is unchanged at 113 passed with [F59](./BACKLOG.md)'s `25/979` preset failures still
  red. Per-test cost is unchanged: eleven more requests per page load measured +0.09s per load.

- **T2 — one source manifest.** `index.html`'s `<script>` tags are now the single home for the
  calculator's file list and load order, classified `data-scope="core"`/`"page"` with `data-worker`
  marking the matrix worker's subset. `tools/calculator_sources.js` reads them for Node and owns the
  shared headless `loadCalculatorContext()`; `matrixWorkerSource()` in `ui.js` reads the same tags
  from the DOM for the matrix worker and the three specs that build a worker to check parity.
  Adding or splitting a source is one edit instead of five, unblocking T3 and T4. The readers throw
  on an unclassified tag, on `data-worker` outside `core`, and on any `Calculator/*.js` file no tag
  mentions — an unconditional rule, since `Calculator/matrix-worker.js` is deleted. That file was an
  unloaded hand-synced copy of the worker body and the one import list that could not read the
  manifest; it had already drifted, missing `steps.js`. No behavior change: all five versions and
  the loaded file set are identical,
  `node tools/node_unit_checks.js` passes 12,724 assertions and `npm test` is unchanged at 113
  passed with [F59](./BACKLOG.md)'s 25 preset failures still red.

- **Numeric preset suite runs from `npm test`, and the suite runs twice as fast.** `runTests`
  had no caller in the repo, so none of `PRESETS`' 979 expectations were ever evaluated by an
  automated run; `tests/presets.spec.js` now drives them all in one page load. It is red at
  `25/979` and [F59](./BACKLOG.md) owns the reconciliation. The matrix drawer tests, which assert
  panel layout and scroll behavior and never read a cell, now trim the roster before opening the
  matrix instead of resolving ~150x150 combats per test, cutting each from 19–23s to 1.4–2.2s,
  with an overflow assertion so a too-small matrix cannot make the scroll checks pass vacuously.
  That file was 51% of suite runtime. The suite stays serial: parallel workers measured worse
  than their complexity was worth. Absolute suite totals on this laptop drift heavily under
  sustained load — the same serial configuration measured between 146s and 262s — so compare
  per-test durations rather than wall clock.

- **CoM 6.08 Quick Casting relabel.** The Tweaker export still carries MoM's `Land Corruption`
  name for `Abilities` bit `0x0200`, which CoM 1 reassigned to Quick Casting. Illusionist and
  Demon Lord now carry `Quick Casting`, matching the CoM2 and Warlord rosters and the manual's
  own unit entries; the ability stays unmodelled and inert, like the other strategic abilities the
  roster retains. `Destruction` on the CoM 6.08 Magician is now explicitly kept rather than
  reported as an unrecognized tag — it binds to the `destruction` control and M3 still owns the
  older-engine path. The generator's unmatched-token report is clean for all three DOS inputs and
  is now version-aware, so a MoM export growing either token would still be reported. Evidence:
  [R6.1a](../Reference%20docs/DOS%20reconstructed/R6.1a.evidence.md).

- **T1 — newline-delimited generated rosters.** The three roster generators now emit
  `units_mom.js`, `units_com.js`, `units_com2.js`, and `units_warlord.js` at `indent=2`, matching
  the JSON sibling each already wrote, so a content search returns matching lines instead of four
  single-line build products. Every record parses identically and all five calculator versions are
  unchanged; the `Unit rosters/` JSON outputs stay byte-identical. Total roster bytes grow 354 KB to
  454 KB, and a whole-file read is no longer the search's default outcome.

## 2026-08-16

- **F20 — source-order stat-transform closure.** Explicit per-version `b`/`c`/`d` manifests now account for every represented step exactly once in source order, preserve atomic multi-field writes, and expose a complete applied/skipped execution trace with order assertions. Existing arithmetic and sparse public traces remain unchanged across `mom_1.31`, `mom_cp_1.60.00`, `com_6.08`, `com2_1.05.11`, and `com2_warlord_1.5.12.7`; focused structural regressions cover atomicity and malformed manifests. See [the method-3.1 review artifact](../.reviews/F20.review-of-luna.md).

## 2026-08-15

- **R9-G1c — final unit-transform provenance closure.** Bound the last seven formula sites to
  checked-in DOS, modern Caster, and Warlord script/table implementations. Warlord permanent
  creation now uses the saved Wild Game ranged channel, the full Nightshade count, unconditional
  Dragon Mound Fire Breath creation, and Energy Cannon's roster-equivalent permanent-Ranged gate
  and ranged-only riders;
  DOS material and CoM 1 Flame Blade writes now retain their pre-Focus order. The provenance audit
  has no open formulas.

- **R9-G1e — weapon material chance projections.** Bound melee and secondary-channel material
  To-Hit across all five builds to the reconstructed DOS material block, reconstructed modern
  `ApplyMagicWeapons`, and both shipped runtime values. Eligible Thrown attacks now receive the
  material bonus, while a zero-melee unit no longer displays a material melee bonus; magical
  Ranged, Breath, Gaze, and CoM 1 Focus-Magic exclusions are preserved.

- **F50/F51/F53 — CoM 1 side maxima, Realm Ward, and signed Warped Defense.** CoM 6.08 now
  applies Guiding Beacon, Divine Barrier, and Soul Linker at their pre-Heavenly-Light side-tail
  position; exposes the binary-backed Realm Ward −20%/−3/−3 transform; and truncates negative
  Warped Defense toward zero before later Supreme Light and Tactician writes. MoM 1.31, CP 1.60,
  CoM2 1.05.11, and Warlord 1.5.12.7 behavior is unchanged. The owning evidence is
  [R6.1d](../Reference%20docs/DOS%20reconstructed/R6.1d.evidence.md).

- **Combat healing state moved from advanced inputs to result means.** Unit cards and the matrix
  now accept only aggregate starting Damage Taken, treating it as Regular damage. Each side's
  result panel reports mean post-combat Irrecoverable/Irreversible Damage, Undeath Damage, and
  Bonus HP/Extra Hits per figure from the exact correlated final-state paths; retired saved input
  values are ignored.

- **F43 — CoM 6.08 common `0x0800` resolves as Exorcise.** The calculator now
  maps the retained *Dispel Evil* data label to the executable's literal Exorcise consumer and
  applies its CoM-only target, modifier, immunity, and attack-channel behavior. The address-backed
  path is recorded in [the MoM/CoM touch-effect analysis](../Reference%20docs/MoM%20binary%20analysis.md)
  and [D39's reconstructed common-attack flow](../Reference%20docs/DOS%20reconstructed/D39.evidence.md).

- **F57 — immediate DOS Life Steal healing.** MoM 1.31, CP 1.60, and CoM 6.08 now
  apply each eligible Life Steal margin immediately through the exact build-specific
  `Battle_Unit_Heal` transition and carry its correlated attacker state into later calls and
  dealt phases. Regular/Undeath/Irreversible categories, restored figures, temporary Extra Hits,
  signed-byte quirks, incoming category caps, and frozen simultaneous exchanges follow
  [R6.2c](../Reference%20docs/DOS%20reconstructed/R6.2c.evidence.md) and
  [R6.5b](../Reference%20docs/DOS%20reconstructed/R6.5b.evidence.md); modern Combatheal and
  Warlord Bloodsucker behavior remains unchanged.

- **F42 — Custom Level changes preserve editable base stats.** In all five calculator versions,
  changing Level on a Custom unit now leaves its hand-edited pre-level card stats and base identity
  untouched; only the downstream effective-stat transform changes. Predefined roster cards retain
  their roster reset and locking behavior.

- **F39 — combat-global Chaos Conjunction Immolation scaling.** CoM2 1.05.11 and
  Warlord 1.5.12.7 now expose one combat-global state that applies
  `Trunc(10 × 1.34) = 13` to every eligible Immolation firing from either side. Swap leaves the
  global in place, and persistence, share links, and matrix workers carry it. Wall of Fire and
  MoM 1.31, CP 1.60, and CoM 6.08 behavior are unchanged.

- **F36 — Warlord Wall of Fire spill and amplification.** Warlord 1.5.12.7 now
  resolves Wall of Fire as one ordinary non-Area attack whose surviving damage crosses wounded
  and full-figure boundaries with a fresh Defense roll and Invulnerability subtraction at each
  boundary. Its `ApplyDamageSpell` result receives the source-ordered, nonstacking Amplifier
  category adjustment. CoM2 Area Wall of Fire, Immolation, and all DOS versions are unchanged.

- **F40 — modern Wall of Fire Teleporting/Merging eligibility.** CoM2 1.05.11 and
  Warlord 1.5.12.7 now skip Wall of Fire when the attacker's calculated abilities include
  Teleporting or Merging. The abilities remain separate controls because Warlord Temporal Twist
  and Tactician treat Teleporting differently; Hierophany strips both. DOS versions keep both
  controls hidden and inert.

- **F35 — modern Area spell caps.** CoM2 1.05.11 and Warlord 1.5.12.7 Area
  `DamageSpell` iterations now cap at full HP per figure rather than the wounded top figure's
  remaining HP; the aggregate still caps at remaining unit HP. This covers both modern
  Immolations and CoM2 Wall of Fire. DOS behavior and Warlord's non-Area Wall of Fire are unchanged.

- **F37 — modern spell Magic-Immunity exit.** CoM2 1.05.11 and Warlord 1.5.12.7
  magical Immolation and Wall of Fire now return zero before Black Sleep or any attack,
  defense, or Invulnerability roll when the target has calculated Magic Immunity. The explicit
  `Nonmagic` bypass remains represented; DOS behavior is unchanged.

- **F38 — modern Black Sleep spell Doom conversion.** After the earlier immunity exit,
  CoM2 1.05.11 and Warlord 1.5.12.7 Immolation and Wall of Fire now deal deterministic Doom
  spell damage against a sleeping target. A Black-Sleeping tactical attacker cannot initiate the
  represented combat, so all incoming and outgoing damage remains zero. CoM2 keeps Area iteration
  semantics; Warlord Wall of Fire uses exact non-Area Doom strength. DOS behavior is unchanged.

- **F33 — modern hero ranged-distance exemption.** CoM2 1.05.11 and Warlord 1.5.12.7
  heroes now bypass physical missile and boulder distance penalties before range arithmetic.
  Nonheroes retain the modern distance formula and Long Range cap, while magical, thrown,
  breath, and gaze attacks retain their separate zero-penalty rule. MoM 1.31, CP 1.60, and
  CoM 6.08 behavior is unchanged.

- **F56 — modern independent gazes exclude Level.** CoM2 1.05.11 and Warlord 1.5.12.7
  Level processing now writes none of the independent Stoning, Death, or Doom Gaze fields or
  their trace changes. Conventional ranged, Thrown, Fire Breath, and Lightning Breath retain
  their level bonuses; MoM 1.31, CP 1.60, and CoM 6.08 gaze ladders are unchanged.

- **F58 — per-call modern Cause Fear breakdown.** CoM2 1.05.11 and Warlord
  1.5.12.7 now show separate normalized feared-figure distributions for Main or First Strike,
  Haste, and Counter melee calls. Each row follows the call's exact living source state, including
  immediate Life Steal/Bloodsucker healing and calls whose target was already killed, while zero
  source figures and Black Sleep show zero feared. MoM 1.31 retains its no-op/self-fear bug
  presentation; CP 1.60 and CoM 6.08 retain their shared Haste sample and combined row.

- **F32/F34 — modern Defense rolls and Bless Defense gate.** CoM2 1.05.11 and
  Warlord 1.5.12.7 now convolve ordinary To Defend for dice 1–15 with the shipped 30% cap
  for dice 16 onward; thresholds above 100% make the first fifteen dice certain while the capped
  dice remain 30%. Unit `ApplyAttack` channels pass spell ID 0 and receive no Bless Defense.
  Positive-ID Chaos/Death spells retain +5 CoM2 or +7 Warlord Defense before Armor Piercing,
  while Bless Resistance remains +5/+4 respectively. MoM 1.31, CP 1.60, and CoM 6.08 retain
  their ordinary single-binomial Defense rolls.

- **F30/F31 — modern Haste attack calls.** CoM2 1.05.11 and Warlord 1.5.12.7 now repeat
  each initiating Stoning, Death, and Doom Gaze under Haste while retaliation gazes remain
  single, and each Hasted melee `ApplyAttack` samples Cause Fear independently. The main,
  Haste, and counter block preserves its frozen pending-damage snapshot while immediate Life
  Steal and Bloodsucker healing follows call order and conditions later calls. MoM 1.31,
  CP 1.60, and CoM 6.08 retain their legacy Haste and fear behavior.

- **F29 — modern melee opening order.** CoM2 1.05.11 and Warlord 1.5.12.7 now deal
  Wall of Fire, each attacker and defender Stoning/Death/Doom Gaze, Lightning Breath, Fire
  Breath, and Thrown in compiled order before the melee block. Each boundary carries exact
  casualties and healing state forward; MoM 1.31, CP 1.60, and CoM 6.08 retain their legacy order.

- **D40 — modern Blur side review.** Independent raw-byte reviews confirmed that CoM2 1.05.11
  and Warlord 1.5.12.7 keep `CGADEnemy` fixed on the army opposing the active-side initiator
  throughout every displayed exchange. Card B's army Blur therefore affects initiating attacks,
  retaliation gazes, and Card B's own counterattack; Warlord's executing scripts do not override
  that flow. The durable array binding and active-side caller proof are recorded in
  [`Combat.ApplyAttack.R5.2c.evidence.md`](../Reference%20docs/Caster%20binary/Combat.ApplyAttack.R5.2c.evidence.md).

## 2026-08-14

- **F27/F28 — modern immediate drain and Warlord Bloodsucker.** CoM2 1.05.11 and
  Warlord 1.5.12.7 now preserve uncapped per-figure Life Steal rolls separately from
  target-capped damage and apply immediate `Combatheal` results through exact correlated attack
  paths. Warlord Bloodsucker finalizes once per `ApplyAttack` call after all routed result
  categories, using its independent runtime damage and healing values. Explicit modern damage
  categories and bonus-HP state round-trip through UI, saved/share state, swaps, and matrix cells;
  MoM 1.31, CP 1.60, CoM 6.08, and base CoM2 Bloodsucker behavior remain unchanged.

- **F25/F26 — modern ApplyAttack rider dispatch.** CoM2 1.05.11 and Warlord
  1.5.12.7 now exclude Poison, Stoning Touch, Death Touch, Life Steal, Exorcise, and
  Destruction from all three Gaze types. Eligible non-Gaze calls retain their routed riders,
  and Destruction makes one independent resistance attempt per surviving attacker figure with
  any failure destroying the target. MoM 1.31, CP 1.60, and CoM 6.08 remain unchanged.

- **F24 — modern army-global Blur.** CoM2 1.05.11 and Warlord 1.5.12.7 represent
  each army's Blur on its unit card: Card B is the tactical defender and supplies Blur for every
  eligible attack in the displayed exchange, including its counterattack; Card A's stored value
  becomes active after Swap. Retired strategic-side state migrates to the two card controls, and
  matrix workers use the same projection. Target Invisibility and source Illusion Immunity remain
  directional. MoM 1.31, CP 1.60, and CoM 6.08 retain target-unit Blur.

- **F23 — modern Cause Fear base-immunity gate.** CoM2 1.05.11 and Warlord
  1.5.12.7 now preserve intrinsic/base Death Immunity separately for Cause Fear's direct
  skip. Recalculation-only grants from Blood Lust, Animated, Rebuild, and Divine Protection
  still make the −3 roll, while Magic Immunity remains protective through effective Resistance
  100. MoM 1.31, CP 1.60, and CoM 6.08 behavior remains unchanged.

- **F21 — modern roster To Defend.** CoM2 1.05.11 and Warlord 1.5.12.7 roster
  generators now encode both `to_hit` and `to_block` as percentage-point deltas above 30%.
  The main cards and matrix rows load each unit's own value, including all 29 shipped
  non-default 20%, 40%, and 50% records; reporting tools still render absolute percentages.
  MoM 1.31, CP 1.60, and CoM 6.08 roster behavior remains unchanged.

- **City Walls exchange-role correction.** City-wall position now belongs to each unit card.
  Resolution grants its +1/+3 extra Defense only when that attack's target is inside and source
  is outside, including the reversed source/target on a counter-attack; army identity and card
  label are irrelevant. Modern and DOS resolution retain their distinct extra-Defense ordering,
  and DOS spell damage remains wall-independent. Old global saved state migrates to card B.

- **F19 — complete calculator-relevant modern transform inventory.** CoM2 1.05.11 and Warlord
  1.5.12.7 now expose and apply Dark Force, the Heavenly Light/Guardian-node package, all three
  Moon/Conjunction effects, Spell Ward, and the Guiding Beacon, Prayermaster, Divine Barrier,
  Soul Linker, and Leadership auras at their compiled positions. Heavenly Light's per-unit input
  follows defending-army membership independently of which unit initiates the exchange.
  Warlord 1.5.12.7 additionally
  preserves independent Military Workshop/Rocketry channels, gates permanent training on base
  identity, and applies those writes before Lightning Blade creates, overwrites, or converts
  Lightning Breath. Military Workshop is
  now source-bound, leaving 10 live provenance gaps. MoM 1.31, CP 1.60, and CoM 6.08 remain
  unchanged. Durable ordering and gate evidence lives in
  `Reference docs/Caster binary/CoM2 binary - unit recalculation.md`,
  `Units.RecalculateUnits.pas`, and Warlord 1.5.12.7 `CreateUnit.CAS`.
- **F18 — modern node aura reconstruction and correction.** Reconstructed the complete shared
  CoM2 1.05.11/Warlord 1.5.12.7 `@Units@applynodeaura` helper. It gates melee on persistent
  `BaseUnits.attack`, gates current conventional Ranged and both Breath fields independently,
  never writes Thrown or Gaze, and adds 2 Defense/Resistance unconditionally. The calculator now
  preserves both persistent-versus-live melee cases and leaves Thrown unchanged; focused checks
  cover the corrected channels. Method-4 review found no reconstruction error and exposed both
  corrected model mismatches. Durable coverage is in `Reference docs/Caster binary/F18.evidence.md`.
- **F17 — complete Warlord Vampirism channel transfer.** Warlord 1.5.12.7 now reads
  simultaneous Thrown, Fire Breath, and Lightning Breath strengths at Vampirism's exact
  post-Colossal region-`d` position, adds half their combined total to melee with one truncation,
  and independently resets every positive source channel to strength 1 before Shadow Strike.
  Conventional ranged remains unchanged. Focused regressions cover odd combined totals, all three
  resets, and Colossal/Vampirism/Shadow ordering; MoM 1.31, CP 1.60, CoM 6.08, and CoM2 1.05.11
  remain unchanged.
- **F15 — Holy Armor threshold ordering.** CoM2 1.05.11 and Warlord 1.5.12.7 now
  evaluate Holy Armor's `Defense > 5` branch at its exact region-`c` boundary: after the
  earlier item and unit-enchantment Defense writers, but before Orihalcon, Holy Weapon,
  globals, combat globals, auras, and curses. Later positive or negative Defense changes no
  longer flip its +2 Defense / +10% To Defend result; ordered traces and focused regressions
  cover both branch directions and the boundary's split attack-channel writes.
- **F14 — Misfortune aura ordering.** CoM2 1.05.11 Mislead and Warlord 1.5.12.7
  Liability now apply one atomic aura-type-10 write in region `e`, after the terminal clamps and
  before Supreme Light. Live non-Fantastic units lose 1 melee, Defense, and Resistance; only a
  persistent base Ranged slot also loses 1, so Focus Magic-created Ranged and independent Thrown,
  Breath, and Gaze channels remain untouched. An eligible zero stat can finish at −1. MoM 1.31,
  CP 1.60, and CoM 6.08 remain unchanged.
- **F13 — Upgraded Explosive source order.** Warlord 1.5.12.7 now doubles Fire Breath at
  its exact `UnitCalcPre.CAS` position, before later phase-`b` effects. The derived trace keeps
  the doubling attached to the Blackpowder-upgraded subtotal instead of folding later writes
  into it; focused derivation and browser regressions cover the ordering.
  MoM 1.31, CP 1.60, CoM 6.08, and CoM2 1.05.11 remain unchanged.

## 2026-08-13

- **F12 — ordered late unit transforms.** CoM2 1.05.11 and Warlord 1.5.12.7 now apply
  Chaos Channels, Destiny, level bonuses, and Focus Magic in compiled order. Focus uses the
  persistent base-channel gate while converting the live post-level channel, including the
  Marionette and Bombs & Grenades interactions, and retains independent modern attack channels.
  Warlord now applies Colossal Growth, represented Vampirism, and Shadow Strike in region-`d`
  order; MoM 1.31, CP 1.60, and CoM 6.08 behavior remains unchanged.
- **F9 — Warlord Marionette.** Wanderer now derives the Warlord 1.5.12.7 Channeler
  transformation from wizard skill, primary realm, all five book counts, Ascension, and
  Conjurer. The package covers live Fantastic identity, generated magical ranged, ordered stat
  and threshold grants, spell/charge metadata, Ascension attack flags, and the persistent strayed
  package including Transmute Equipment's latent Chaos ranged channel, Rebuild, and Charmed.
  The early Fantastic write now makes an Outlander-owned Wanderer eligible for
  Xenoveterinary. Controls are exact-version gated and round-trip through saved/share state;
  remaining retort-to-hero-template progression stays with F41.
- **F6 — DOS Chaos Channels shared attack slot.** MoM 1.31 now admits the Fire Breath
  result only for a base None/Thrown slot with signed strength at most 3; CP 1.60 and CoM 6.08
  use the patched ceiling of 0. Gaze and existing Breath types reject the result, so DOS no
  longer invents a second attack channel; admitted slots receive the exact 2/2/4 strengths.
  CoM2 1.05.11 and Warlord 1.5.12.7 retain independent channels and add Fire Breath 4 beside
  ranged, Thrown, Lightning Breath, and Gaze. Durable reconstruction evidence is in
  [`F6.evidence.md`](../Reference%20docs/DOS%20reconstructed/F6.evidence.md).
- **F5 — ordered chance transforms and modern two-stage clamp.** CoM2 1.05.11 and Warlord
  1.5.12.7 now carry common/channel To Hit and To Defend writes on the source-ordered unit record.
  Region `e` clamps common To Hit to 10–100 before normalizing each channel against it: a common
  −50 modifier plus a +10 ranged-channel modifier now resolves as 10% melee and 20% ranged, not
  10% for both. Modern signed To Defend remains unclamped in recalculation and is naturally bounded
  by the defense-roll probability; MoM 1.31, CP 1.60 and CoM 6.08 retain their legacy final-threshold
  clamps. Source-position fixes also removed late chance replays and Vertigo duplication and made
  Energy Cannon snapshot its live pre-clamp threshold. The audit now reports 223 `VERIFIED` and 13
  `UNVERIFIED` formulas.
- **R9-G1a — identity and creation-grant provenance.** Closed the five live identity gaps for
  CoM 6.08, CoM2 1.05.11 and Warlord 1.5.12.7 plus both Warlord Lava Smelter elemental-grant
  gaps against the completed constructor/summon reconstructions, shipped spell rows, creation and
  retraining scripts, resolution consumers and runtime constants. Corrected CoM 1's summon branch:
  previously only an unsupported template whitelist became Fantastic, with every entry except
  Centaurs forced to Life; now every successful combat summon becomes Fantastic, only Paladins
  become Life, only Centaurs and Catapult become Nature, and other types retain their loaded race.
  The audit now reports 227
  `VERIFIED` and 15 `UNVERIFIED` formulas.
- **R9-G1g — Supernatural direct helper.** CoM 6.08 now imports and displays the 11 roster
  templates carrying attack-attribute `$2000`, despite its misleading Tweaker-export label, but
  gives Supernatural no combat effect: D39 proves its resolver test is inactive and the live floor
  belongs to Destruction `$0020`. CoM2 1.05.11 and Warlord 1.5.12.7 retain their shipped `0`/`34`
  ties-to-even minimum-damage formula. The provenance audit now reports 220 `VERIFIED` and 22
  `UNVERIFIED` formulas; durable legacy evidence is in
  [`D39.evidence.md`](../Reference%20docs/DOS%20reconstructed/D39.evidence.md).
- **D39 — reconstruct the CoM 6.08 standard attack resolver.** Completed and independently
  reviewed the parent `[0x99292,0x999C9)`, resolver `[0x999C9,0x9A587)`, adjacent defense
  producer `[0x9A587,0x9A79E)`, BP-sharing helpers, all callers, loops, reductions, output routing,
  and required dependencies. Confirmed the only live `(hits - 5) >> 1` first-reduction floor is
  Destruction `$0020`; the Supernatural `$2000` test is dead, and the residual reduction has no
  floor call. Durable findings are in
  [`D39.evidence.md`](../Reference%20docs/DOS%20reconstructed/D39.evidence.md). Calculator behavior
  is unchanged; R9-G1g is now unblocked and owns the separate helper decision.
- **D38 — locate the CoM 6.08 Supernatural minimum-damage consumer.** Proved the frozen
  `WIZARDS.EXE` has no executing binding from binary-named Supernatural `$2000` to the documented
  `(damage-5)/2` floor. The only live formula path is gated by binary-named Destruction `$0020`,
  applies only on the first per-strike reduction below an adjusted defense threshold, and is absent
  from the residual-damage reduction. Bounded the complete standard resolver at
  `[0x999C9,0x9A587)` with all direct callers and exits; D39 owns its fixed-extent reconstruction.
  Durable findings are in
  [`D38.evidence.md`](../Reference%20docs/DOS%20reconstructed/D38.evidence.md). Calculator behavior
  is unchanged; R9-G1g remains blocked by D39.

## 2026-08-12

- **R9-G1g second pass — four direct helpers closed.** Bound Magic, Mithril, and Adamantium
  weapon bonuses plus the legacy identity-conversion helper across their applicable MoM 1.31,
  CP 1.60, CoM 6.08, CoM2 1.05.11, and Warlord 1.5.12.7 sources. Corrected Warlord's
  Fiery Fury/Sanctify/compiled-conversion order and preserved Sanctify's Life-race write for
  heroes. The user's CoM2 1.4.2 changelog pointer, corroborated by CoM 6.08 helptext, required
  retaining the legacy Supernatural floor; D34 disproves only the proposed executable binding,
  so that final helper remains under R9-G1g behind D39. The audit now reports 219 `VERIFIED` and
  23 `UNVERIFIED` formulas.
- **D36 — reconstruct modern Raise Dead.** Reconstructed the shared CoM2/Warlord
  `$005CD1FF..$005CD372` Raise Dead case and complete `$0064435C..$00644377` Castercore
  wrapper. The engine clears revival/status state, sets combat No Heal, restores position and
  movement, recalculates, stores checked half-total-HP damage, publishes the target ID, and
  recalculates again. Warlord's script adds disjoint combat-wide living-unit recounts; D36 does
  not assert the hook's exact order. Durable source and coverage are in
  [`D36.evidence.md`](../Reference%20docs/Caster%20binary/D36.evidence.md). Calculator behavior is
  unchanged; the modern Raise Dead prerequisite for R9-G1g is complete.
- **R9-G1j — derived-package provenance.** Bound all 13 unit/ability-package formulas from
  `undeadImmunityDerivation` through `bloodLustMeleeAttack` to the applicable DOS, shared
  `Caster.exe`, and Warlord-script implementations; the audit now reports 214 `VERIFIED` and
  28 `UNVERIFIED`. Corrected Warlord strike-effect order, Fiery Fury and Angelic Guardians
  base-Fantastic gates, Angelic Guardians' existing-Exorcise branch, and Blood Lust targeting;
  focused regressions and the durable behavior contract are in `data.js` and `SPEC.md`.
- **D35 — reconstruct CoM 6.08 Raise Dead.** Reconstructed the complete
  `[0xAB04D,0xAB474)` routine and `[0x82ED0,0x82EEA)` dispatcher. Raise Dead halves the
  restored figures/front damage, clears combat effects, both combat and persistent enchantment
  dwords, and movement-recalculation flags `$0800|$1000`, then writes the inline unaligned
  Fantastic identity and `Grey_Hits = -1` cache sentinel before rebuilding the battle unit.
  Durable findings and coverage are in
  [`D35.evidence.md`](../Reference%20docs/DOS%20reconstructed/D35.evidence.md). Calculator behavior
  is unchanged; D36 supplies the corresponding modern prerequisite for R9-G1g.
- **D34 — falsify the CoM 6.08 Supernatural damage-floor binding.** Proved common attack mask
  `$2000` is Supernatural and `$0020` is Destruction; the existing signed `(hits - 5) >> 1`
  helper is a branch-specific Destruction floor suppressed by defense-special scores `>=80`.
  The supplied `Attribs_2` anchor instead projects `$4000`, lowers to-block by one, and ensures
  minimum weapon quality. The only direct functional Supernatural consumer found is inside newly
  bounded `[0x9BCE0,0x9D535)`, now owned by D37. Durable findings are in
  [`D34.evidence.md`](../Reference%20docs/DOS%20reconstructed/D34.evidence.md). Calculator behavior
  is unchanged; R9-G1g owns removal or replacement of the unverified CoM formula.
- **D30_D31_D32 — locate Supernatural and Raise Dead prerequisites.** Corrected the two DOS
  rows from non-implementation `MAGIC.EXE` to CoM 6.08 `WIZARDS.EXE`. D30 found an already
  reconstructed minimum-damage candidate but left the Supernatural-to-`$0020` binding unproved;
  D31 bounded the DOS Raise Dead routine and its inline unaligned identity writes; D32 bounded the
  modern Raise Dead case, wrapper, `EncNoHeal` producer, and existing recomputation consumer.
  Durable results are indexed by
  [`D30_D31_D32.evidence.md`](../Reference%20docs/DOS%20reconstructed/D30_D31_D32.evidence.md);
  D34–D36 own the corrected follow-up work. Calculator behavior is unchanged.
- **D33 — reconstruct `ApplyMagicWeapons`.** Reconstructed the complete shared CoM2/Warlord
  `$00598D88..$005992CC` helper: base material gates, other-owner King-of-Underworld suppression,
  Magic/Mithril/Adamantium tiers 0/1/2, channel-specific strength and runtime To-Hit writes,
  checked display-bonus arithmetic, both callers and Warlord composition. Durable source and
  coverage are in [`D33.evidence.md`](../Reference%20docs/Caster%20binary/D33.evidence.md).
  Calculator behavior is unchanged; the result supplies R9-G1g's modern weapon prerequisite.
- **R9-G1g existing-evidence pass.** Bound eight direct formulas across their applicable DOS,
  CoM2 and Warlord builds, and removed the aggregate weapon dispatch plus two calculator-only
  unit-type projections from the source-formula inventory. Corrected modern Supreme Light so
  live or base magical ranged, either Life identity, or nonzero mana independently satisfies its
  compiled eligibility gate. The audit now reports 201 `VERIFIED` and 41 `UNVERIFIED` formulas.
  The five remaining R9-G1g gaps were isolated to four reconstruction domains; D33 now supplies
  the modern material domain, while D34–D36 own the remaining Supernatural and Raise Dead scopes.
- **D29 — locate `ApplyMagicWeapons`.** Corrected the supplied interior anchor to the exact shared
  CoM2/Warlord extent `$00598D88..$005992CC`, proved its two direct callers and sole normal return,
  and moved the now-fixed semantic reconstruction into D33. Durable boundary and dependency
  evidence is in [`D29.evidence.md`](../Reference%20docs/Caster%20binary/D29.evidence.md).

## 2026-08-11

- **R9-G1i — DOS Wall of Fire strength provenance.** Bound the inherited MoM 1.31 and
  CP 1.60 Wall of Fire strength to the zero-override spell path and D22's source-shaped
  Fireball record. Both calculator versions remain at strength 5; behavior is unchanged and
  the audit now reports 193 `VERIFIED` and 52 `UNVERIFIED` formulas.
- **R9-G1k — resolution-stat and combat-context provenance.** Bound seven source-authored
  formulas across all applicable DOS, CoM2 and Warlord versions, and removed the aggregate
  `normalizeCombatUnit` orchestration marker from the formula inventory without performing M7's
  helper retirement. Corrected modern Defense to avoid a second Vertigo subtraction and corrected
  DOS Elemental Armor/Resist Elements overlap rules for Defense and Resistance. Focused
  regressions cover the corrected behavior; the audit now reports 192 `VERIFIED` and 53
  `UNVERIFIED` formulas.
- **D22 — DOS Fireball spell-table record.** Materialized the complete MoM 1.31/CP 1.60
  36-byte Fireball record in `Reference docs/DOS reconstructed/spelldat.c` with byte coverage in
  `D22.evidence.md`. Both builds load unsigned strength 5 from `+0x20`; the sole record difference
  is `AI_Group` at `+0x13`. Calculator behavior is unchanged and R9-G1i is unblocked. Method-4
  review also corrected a CP-only incoming Wall call; D28 owns its out-of-scope trigger semantics.
- **R9-G1i existing-evidence pass.** Bound seven of the eight effective-attack, defense and
  damage-constant formulas across their applicable calculator versions, reducing the live audit
  to 61 `UNVERIFIED` formulas without changing calculator behavior. The remaining DOS Wall of
  Fire strength binding needs D22's source-shaped `SPELLDAT.LBX` record before R9-G1i can close.
- **R9-G1h — ability-stat provenance.** Bound all 20 formulas from `holyBonus` through
  `disheartenProphecy` across MoM 1.31, CP 1.60, CoM 6.08, CoM2 1.05.11 and Warlord 1.5.12.7,
  reducing the live audit to 68 `UNVERIFIED` formulas. Corrected modern Animated and Black Prayer
  leaking into independent Gaze fields, modern Tactician hero bonuses leaking into Thrown/Breath/
  Gaze, Breakthrough's normal-package Defense from +1 to the configured 0, and Metal Fires on
  Fantastic units, including its secondary-channel and weapon-upgrade paths. The review also
  restored Spirit Link's permanent +2 Resistance write to the base phase. Focused regressions
  cover every corrected channel and eligibility boundary.
- **R9-G1f — level-dispatch provenance.** Bound the version dispatch and all fifteen normal-unit
  ladder formulas across the five supported builds to the reconstructed DOS gates and HP
  thresholds, reconstructed Caster consumer, and current CoM2/Warlord tables. Existing calculated
  bonuses remain unchanged; the audit now reports 158 `VERIFIED` and 88 `UNVERIFIED` formulas.
- **R9-G1e existing-evidence pass.** Bound 24 of the 27 chance-contribution and projection
  formulas to exact DOS, Caster, Warlord-script and runtime-table sources, with no calculator
  behavior change. Corrected overbroad version metadata for seven Warlord-only formulas. The
  remaining modern material helper was routed to R9-G1g and the two-stage clamp to F5, both now
  closed above; the audit then reported 142 `VERIFIED` and 104 `UNVERIFIED` formulas.
- **R9-G1d — late/global and figure-transform provenance.** Closed ten formulas against their
  strongest implementation sources and retired the erroneous Warlord-only Focus Magic duplicate,
  reducing the live audit to 118 `VERIFIED` and 128 `UNVERIFIED`. Corrected Focus Magic ordering,
  Chaos Surge and Darkness channel gates, Eternal Night's modern Life/Death asymmetry, signed
  modern Warp Attack division, Warlord Beat of Swiftness rounding/gating, and both figure-count
  transforms. Focused regressions and the full calculator suite cover the corrected behavior.
- **A32 — DOS Shatter eligibility.** Reconstructed human admission, AI selection, the generic
  effect setter, and recompute consumer for MoM 1.31, CP 1.60, and CoM 1. All three admit normal
  units and heroes but reject Fantastic units; existing calculator behavior is correct. The
  method-4 proof is `Reference docs/DOS reconstructed/A32.evidence.md`.
- **B4/B5/B6 — DOS rollover and Defense.** Verified one cohesive three-build package:
  conventional and non-Area excess receives fresh Defense and Invulnerability −2 at each figure;
  Area attacks are independently capped per figure; Armor Piercing is signed `/2` truncated toward
  zero; and Immolation uses Fireball's non-AP flags. Existing calculator outcomes were correct;
  DOS halving now expresses the exact arithmetic. The reviewed proof is
  `Reference docs/DOS reconstructed/B4_B5_B6.evidence.md`.
- **B9 — DOS `Create_Unit`.** Reconstructed overlay 121 entry 0 for MoM 1.31, CP 1.60 and CoM 1.
  Every unit instance starts with `mutations = 0`; the complete constructor write set cannot add
  `UM_UNDEAD`, so natural Death creatures do not receive Dispel Evil's created-undead-only extra
  penalty. Existing calculator behavior is correct. Merged source and evidence are in
  `Reference docs/DOS reconstructed/unitcalc.c` and `B9.evidence.md`.
- **D2 — modern Weapon Immunity eligibility.** Replaced the weapon/type proxy with the exact
  calculated `EncMagic or magicranged` rule. Corrected Spirit Link and Blazing March bypasses,
  King/Ruler's material-only suppression, and Wall of Fire ordering; added exhaustive represented
  source and attack-class regressions. Method-3 review found and corrected the ordering defect.

## 2026-08-10

- **D21 — modern level-bonus helper.** Reconstructed `@Units@ApplyLevelBonus` completely and
  bound its CoM2/Warlord runtime tables. The 21 writes omit Death, Stoning and Doom Gaze; the
  loader also feeds the normal To Defend slot from `[Hero]ToDefend`. Independent Claude/Codex
  derivations and reciprocal review left no disagreement. Durable source and coverage are in
  `Reference docs/Caster binary/Units.RecalculateUnits.pas` and `D21.evidence.md`; F56 owns the
  newly confirmed calculator mismatch.
- **B7 — DOS touch record routing.** Verified that common flags reach every admitted call, while
  melee records remain melee-only and one ranged record feeds ordinary ranged, Thrown, both
  Breaths and every Gaze. Corrected all-rider record routing, channel-carried Stoning −1 and Death
  −3 modifiers, and CP/CoM zero-strength dispatch. Cross-version and roster regressions confirm
  Chaos Spawn's common Poison 4 accompanies Multiple Gaze, resolving Q4; modern exclusion remains
  tracked by F25. The reviewed mapping lives in `Reference docs/Touch attack trigger matrix.md`.
- **D18 — Warlord touch-flag placement.** Replaced the blanket ranged exclusion with internal
  general/melee/ranged records: innate/card Stoning and Death Touch are general, Focus Magic moves
  them to melee/Thrown, and Revenant overwrites Death Touch with melee/Thrown value 0. Corrected
  tooltips and regressions, recorded the manual/helptext conflict, and retained B7 for the distinct
  DOS record/roster comparison. Method-3 review fixed created modern-channel touch delivery.
- **R9-G1c evidence/revision pass.** Bound 20 of the 29 formulas from `stat:base` through
  `giantStrength:thrown`; the nine unsupported ordering/channel claims remain live in
  `BACKLOG.md`. Corrected the executing Warlord recruitment writes for Ludus Agoge, Mother
  Fungus, Pillar of Faith and Natural Selection. Charm of Life now reads live HP after
  Endurance, Lionheart and every earlier HP writer, closing F16. Earlier Warlord gates now
  retain base recruitment identity and their pre-Focus attack types. The live audit is 139
  `UNVERIFIED` formulas.
- **R9-G1b — base/permanent-transform provenance.** Bound Destiny, Chaos Channels Fire Breath,
  Lightning Blade, Focus Magic, Vampirism, and Shadow Strike to reviewed implementation excerpts.
  Corrected modern low-strength Focus Magic, Warlord Vampirism transfer, and Lightning Blade's
  `Thrown + 1` write. The live audit fell to 159 `UNVERIFIED` formulas; F12 and F17 retain their
  wider scopes.
- **F7, F22, F52, F54, F55, M6.** Implemented modern Supernatural rounding, modern Blood Lust on
  Thrown, all reconstructed Supreme Light paths, base-CoM2-only spell-result identity rewrites,
  and independent Lava Smelter grants with legacy-state migration. Method-3 review caught the
  migration, a weak Fire Breath regression, and stale provenance wording. Final checks passed.

## 2026-08-09

- **R9-G1a-R3 — CoM 1 Zombies table binding.** Bound the type `0xAE` ability record and constructor
  copy in `Reference docs/DOS reconstructed/unitcalc.c`; merged evidence is
  `R9-G1a-R3.evidence.md`.
- **R9-G1a-R2 — `CombatSummonUnit`.** Reconstructed the full CoM2 routine in
  `Reference docs/Caster binary/Spells.CombatSummonUnit.pas`; merged evidence is
  `R9-G1a-R2.evidence.md`.
- **R9-G1a-R1 — DOS battle-unit load.** Reconstructed all three DOS builds in
  `Reference docs/DOS reconstructed/combat.c`; merged evidence is `R9-G1a-R1.evidence.md`.
- **R9-G1a existing-evidence pass.** Promoted modern Combat Summoned and Chosen identity plus
  three Lava Smelter grants. Eight gaps remained for dedicated reconstruction or other owners.
- **R9 — enforceable formula provenance.** Added adjacent formula classifications, reviewed source
  anchors, runtime-table binding, and automated completeness checks. Initial result: 247 formulas,
  77 `VERIFIED`, 170 explicit gaps; later R9-G1 work updates the live totals.

## 2026-08-08

- **R7.4 — modifier tooltips.** Exposed ordered calculated-stat traces through hover/touch UI and
  fixed stale overlays; see `SPEC.md`, UI contract.
- **R7.3 — ordered calculated-stat traces.** Made the calculation path emit source-labelled running
  values for every displayed output; fixed permanent-write attribution.
- **R8.1–R8.4 — identity lifecycle.** Added version-scoped source identity, independent editable
  base controls, ordered live conversions, and v2 persistence/share/swap/Matrix migration. Roster
  units reconstruct authoritative source IDs; Custom units retain null IDs.
- **Persistence resilience cleanup.** Hardened corrupt and legacy state fixtures.
- **R6.5b–R6.5d — DOS combat reconstruction.** Completed attack preparation, touch/special rider,
  and damage-application extents across MoM 1.31, CP 1.60, and CoM 1. Owning bodies and per-item
  evidence are under `Reference docs/DOS reconstructed/`.

## 2026-08-07

- **R6.2a–R6.2f, R6.3, R6.5a.** Reconstructed the DOS conventional attack, defense specials,
  resistance helpers, combat dispatch, and related natural extents for all three builds.
- **R6.4.** Hardened the DOS derivation checker and reverified the corpus.
- Completed rows left the backlog; address coverage, build differences, and findings remain in the
  corresponding `R6.*.evidence.md` files and C sources.

## 2026-08-05 to 2026-08-06

- **R6.1a–R6.1h.** Reconstructed DOS battle-unit creation and recalculation: enchantments, base
  stats, experience, movement, hero items/templates, item powers, and hit-point writes. The merged
  `unitcalc.c` and item-scoped evidence are authoritative.

## 2026-08-02 to 2026-08-04

- **R5.1, R5.2a–R5.2m, R5.C, R5.G.** Completed and reviewed the modern Caster reconstruction
  corpus. A reciprocal review corrected `DamageSpell`'s repeated spill loop. The artifact index is
  `Reference docs/Caster binary/README.md`.
- **R3/R4.** Split modern binary analysis by subsystem, preserved independent modern attack
  channels, and reshaped the version-specific conventional attack card and derivation paths.
- **R6.0/R9 checker work.** Added DOS verification and fixed the Delphi ledger gap-hiding bug.
- **R8 shared DOS special byte.** Replaced fabricated per-ability magnitudes with the shared
  `Spec_Att_Attrib` value and consumer flags; fixed gaze realm/strength shaping and roster wiring.
- **F44–F48.** Fixed DOS Illusion and Resistance-to-All token wiring, added roster regressions, and
  removed the fabricated modern Chaos Channels overwrite/stacking split.

## 2026-07-26 to 2026-07-29

- Established the ordered stat-derivation and combat-resolution sequences (**R1/R2**) and fixed the
  defects exposed by them. Canonical order is in `SPEC.md`; evidence is in the engine analyses.
- Swept Warlord scripts and CoM2 runtime tables, moved loaded constants to their owning data-table
  document, and separated live work from evidence.
- Early executable verification settled foundational roll, immunity, spill, and sequencing claims
  later absorbed into the reconstruction corpora.

## Closed mechanic questions

| ID | Result | Durable home |
|---|---|---|
| Q7 | Supreme Light reads live Resistance at its engine position. | DOS and modern recalculation analyses |
| Q9 | CoM2/Warlord may carry Doom Gaze and ranged simultaneously. | modern combat-flow and recalculation analyses |
| Q10 | Destiny does not remove later weapon-material bonuses. | modern recalculation analysis |
| Q13 | Modern Land Link adds +2 to each positive breath field for current Fantastic units. | modern recalculation analysis |
| Q14 | Modern Defense dice use capped To Defend. | data tables; `Combat.ResolutionHelpers.R5.2e.evidence.md` |
| Q22 | CoM 1 implements no Inner Fire +1 hero-item attack. | MoM binary analysis; R6.1g evidence |
| Q11 | DOS Animate Dead/Black Channels grants +1 ranged when a ranged type exists. | R6.1a evidence |

## Accepted modelling decisions

Canonical descriptions are in `SPEC.md`, Known modelling limitations.

- **M7:** ammunition is outside the one-engagement model.
- **M8:** between-turn regeneration is outside the one-engagement model.
