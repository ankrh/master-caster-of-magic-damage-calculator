# Calculator work history

Short index of completed calculator work. Behavior lives in `SPEC.md`; implementation evidence
lives under `Reference docs/`; benchmark comparisons live in `DUAL-AGENT-BENCHMARK.md`. Detailed
pre-2026-08-10 narratives remain recoverable from git history.

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
  Holy Weapon's `Inc(U.hitchancethrown, 10)` (`:1803-1809`) — cross-referenced from F84, which
  owns generalizing them. Five type-gated ones stop reaching it, each toward the engine: Blazing
  March's +3 Thrown, Flame Blade (Warlord) +2, Fiery Fury +2, the Wall of Fire garrison +1, and
  Metal Fires' shared blade bonus. So do the level ladder, gated on `BaseUnits.thrown > 0`
  (`:562-564`), and the magic-weapon strength and To Hit, gated on `Units.thrown > 0` (`:660-663`)
  — both read the field in region `c`, where the grant has not written it. Nothing moves in the
  other four versions. The transitional `shadowThrown` slot stays: the calculator models Focus
  Magic's `U.ranged := U.thrown; U.thrown := 0` as an identity flip in place, so the record's
  Thrown field is not free for the grant, and making that move real needs position-aware slot
  gates — filed as [F90](./BACKLOG.md), blocked on M12. New coverage:
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
