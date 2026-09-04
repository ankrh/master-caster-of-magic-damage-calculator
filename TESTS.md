<!-- Agent-maintained registry of the test suites agents may run.
     Tag definitions and the rules for changing a tag are in the global CLAUDE.md. -->

# Test registry — Master/Caster of Magic damage calculator

Everything under `tests/` runs in the browser through `npm test`; a single file runs with
`npx playwright test tests/<file>`. The three Node suites are not in `npm test` and run on their own.

Other `tools/*.js` scripts are diagnostics and censuses, not suites: they report, they do not pass
or fail. Do not add them here.

## Playwright, whole suite

- Command: `npm test`
- Tag: scaffolding
- Anchor: —
- Checks: every `tests/*.spec.js` below, serially, against a no-cache dev server.
- Runtime: ~150s. Workers are pinned to 1 deliberately; the config records the measurements.

## presets

- Command: `npx playwright test tests/presets.spec.js`
- Tag: spec
- Anchor: CLAUDE.md *Damage calculator purpose and non-goals* — "The ultimate source of truth for the
  calculator formulas and calculation sequence is the contents of the binaries, WIZARDS.EXE and
  CASTER.EXE" and "the way that the calculator should calculate the effect of enchantments and
  conditions on unit stats should very closely follow the sequence that the binaries follow", over
  the space "The calculator must support the application of any combination of the combat-relevant
  enchantments and conditions."
- Checks: the authority for calculation correctness. Drives every preset through the real controls
  and reads the rendered averages back. Every other spec defers numeric correctness to it.
  CLAUDE.md states no individual effect's behaviour and does not need to: it names the binaries as the
  source of truth, and each preset is one instance of that claim. The per-effect evidence is the
  `PROVENANCE` citation on the step the preset exercises, checked by `npm run provenance`; the
  preset's `desc` states the arithmetic that citation implies. That preset-to-step link is
  conceptual, not machine-checked — 172 of 1151 `desc` fields name a game-source location inline.
  Recount that under the rule rather than incrementing it: test each `desc` of the **evaluated**
  `PRESETS` object (not the file text) against
  `/[\w./\\-]+\.(?:CAS|INI|pas|c|EXE):\d+|0x[0-9A-Fa-f]{4,}|\$[0-9A-Fa-f]{6,}/i`. The `c` extension
  is load-bearing — `combat.c` and `unitcalc.c` are the DOS reconstruction filenames.
- Runtime: well past the 30s default; one page load drives every preset.

## result-invariants

- Command: `npx playwright test tests/result-invariants.spec.js`
- Tag: spec
- Anchor: CLAUDE.md INV-1 (valid PMF) and INV-3 (swap involution)
- Checks: the rendered distribution sums to ~1 within a rounding tolerance; `#swapBtn` is involutive
  and one swap exchanges sides.

## version-gating

- Command: `npx playwright test tests/version-gating.spec.js`
- Tag: spec
- Anchor: CLAUDE.md INV-2 (version gating)
- Checks: the set of items the UI hides per version equals the set the defs' gating disables, asked
  of the app's own `abilityVersionGated`; and a hidden ability cannot leak into the calculation.
  The leak half covers **both** input paths, which are protected differently. The card is safe
  because `applyDisabled` clears version-hidden controls, so its readers need no version test. The
  matrix reads persisted `matrixPropertyState`, which a version switch only *hides* and never
  clears, so its reader carries the filter itself (`matrixEnchantmentValue`). The matrix case
  asserts the row is **still stored** after the switch before asserting it reads inactive —
  otherwise it would pass on a row that had been cleaned up rather than filtered. Added after
  F258.1 found a Warlord-only `enemyEyeOfHeaven` reaching DOS matrix runs; the card-path test
  passes with that defect present, so it was not covering it.

## roster-smoke

- Command: `npx playwright test tests/roster-smoke.spec.js`
- Tag: spec
- Anchor: CLAUDE.md INV-4 (roster soundness) and INV-5 (no console errors)
- Checks: every unit of every version selects without console errors or a page crash and the core
  stat fields become real numbers. Spot-checks confirm the values came from `units_*.js`.

## fail-loud-f113

- Command: `npx playwright test tests/fail-loud-f113.spec.js`
- Tag: spec
- Anchor: CLAUDE.md *Architecture*, the fail-loud rule
- Checks: each converted site is handed a value outside its defined set and must throw, naming the
  offending value. Covers both the computation and the page layer.

## modifier-traces

- Command: `npx playwright test tests/modifier-traces.spec.js`
- Tag: spec
- Anchor: CLAUDE.md *Input/output contract*, the hover-chain paragraph
- Checks: R7.3 source-ordered calculated-stat traces, including that every chain over the stat
  record and its To-Hit/To-Block projection carries the `a:baseCopy` boundary marker once, and
  that the marker survives a transform appended after the projection is built (the displayed
  Vertigo Defense penalty).

## modifier-trace-tooltips

- Command: `npx playwright test tests/modifier-trace-tooltips.spec.js`
- Tag: spec
- Anchor: CLAUDE.md *Input/output contract*, the hover-chain paragraph
- Checks: R7.4 presentation of those traces in the tooltip, and the same presentation on the
  per-rider histograms' effective-resistance / effective-defense chains (F222.5), including that
  the chain's header names the realm its roll asked.

## provenance

- Command: `npm run provenance`
- Tag: spec
- Anchor: CLAUDE.md *Architecture* — each engine write carries its provenance citation and the citations
  are checked mechanically
- Checks: every `PROVENANCE[id]` comment is VERIFIED or UNVERIFIED, matches its reviewed anchor, and
  leaves no stale manifest entry.

## cas-citations

- Command: `node tools/cas_citation_audit.js`
- Tag: scaffolding
- Anchor: —
- Checks: every citation into a shipped `.CAS` script resolves against
  `Reference docs/Script source/<set>/`, under the grammar in `Reference docs/CAS citation
  grammar.md`. Label and text anchors must find their landmark, land inside the file and satisfy
  the statement assertion an offset obliges them to carry; a line-list citation (a `:N` or `:N-M`
  locator) into any script fails, every per-script ceiling in `DEPRECATED_BUDGET` being 0 since
  F227.6, so `--strict` (ceilings forced to 0) is the same check as the registered command; a `@span` must
  sit on a `// PROVENANCE[id]:` comment line, which is what makes `npm run provenance`
  responsible for resolving it. A citation-bearing source the tool classifies neither in scope
  nor out fails, and so does a `.CAS` glued to a locator the grammar does not define.
- Runtime: ~1s.

## node-unit-checks

- Command: `node tools/node_unit_checks.js`
- Tag: scaffolding
- Anchor: —
- Checks: `deriveUnitStats` and the engine/combat helpers in isolation, headless, in a `vm` context
  built from `index.html`'s script manifest. 23,206 assertions across 14 families, including the
  per-rider phase histograms F222.2 and F222.3 emit and the effective-resistance /
  effective-defense chains F222.5 hangs on them, for all five engines, plus INV-1 on every
  distribution a phase publishes and the rider/total partition on a set that cannot overkill.
  It also places every rider that writes a non-normal damage bucket and asserts that category
  reaches the post-combat composition, which is the check that catches a rider missing from the
  joint's damage-tracking gate. It cannot evaluate presets: that path runs through the DOM.
  The 14th family is `ability_origins` (6,092 assertions, F244.3a to F244.3i): the origin table in
  `Calculator/stats_origins.js` against the code it classifies — that it names exactly the keys the
  ability/enchantment defs, the three pre-sequence transforms and the four record-field lists
  expose; that every row's origin, version scope and producers are well formed and agree with the
  control's own version gating and with the named step's `STEP_VERSION_SCOPES` entry and phase;
  that each producer form admits only the origins it can stand for, so a global cannot be filed as
  a cast; that the `debuffs` origin and the two curse lists name the same keys but for the declared
  exemptions; that every
  seeded record field has an origin that can take a position and nothing else is a record field;
  that the compatibility ability keys no def exposes are still read where they are declared to be;
  and that each transform writes exactly the keys the table classifies for it, measured by running
  the transform rather than reading a list. Its `record_seed` section (F244.3b) asserts the
  partition the seed rests on: `SEEDED_NON_STAT_KEYS` is exactly the four lists' union; every
  `TRANSFORM_SEED_CARRY` entry is a seeded key a transform writes, has no template row, and names
  the subtask that retires it; every seeded key with no template row is either a declared carry or
  has a positioned step with a scope entry; and each of the nine curse flags is seeded in no
  version and has its own `debuffs:<curse>:cast` write. It then **executes** the seed rather than
  describing it: `seedNonStatRecordFields` is run per version and asserted key by key, a transform
  grant of an undeclared non-template key is asserted to halt, a positioned write with no writer
  in scope is asserted not to publish, and a committed immunity matrix runs every curse against
  every immunity source — stated and, for Sancta Basilica, granted — in every version. A last
  group proves the `immunities` phase is real: it has a chain entry in every version, the seed
  does **not** carry what those entries write, and the marked immunity still reaches the finished
  record — which together are the difference between a positioned write and a hoist the phase
  merely restates. A last group (F244.3c) executes the five `training:lavaSmelter:*` grants: each
  control writes its own key and no other, the legacy `lavaSmelter` selector reaches the same
  write, the block's permanent-Fantastic gate refuses all five, a granted key with no control of
  its own is not an input, and the Fiery Blade grant moves the melee stat and the weapon result
  field — which is what proves `hasWarlordBladeAt` reads the record rather than a constant.
  The next group (F244.3d, extended by F244.3e) does the same for the Outlander reform's seven
  permanent writes: each of
  `armorclad`, `powerEngine`, `resistMagic`, `discipline`, `haste`, `flying` and
  `illusionImmunity` names exactly one Warlord-only
  `training` step, fires for the case its script block admits, is refused both without an Outlander
  wizard — the explicit gate that replaced a deletion from the ability map — and without the
  block's own eligibility term, and is asserted through the number its downstream *reader*
  produces, since a flag that reaches the published set without reaching its reader would pass
  every other assertion. `d:energyCannonThreshold`'s read is asserted on the step trace instead,
  because its write is invisible in the finished record. The same group pins the one claim
  the finished record cannot show at all: a `buffs:*:cast` step reads the card's own ability
  map, so a Marionette book grant of Resist Magic or Rebuild is `skipped` there while the
  card's own mark is `applied`. That assertion reads `statExecutionTrace` rather than
  `statTrace`, because a wrongly admitted cast writes a value the seed already carries and so
  changes nothing.
  The last group (F244.3e) covers the two record reads that move created and the three names that
  stopped being ability keys: `training:temporalDrive` reads the Power Engine flag off the record,
  `b:bombsGrenades` reads the Flying flag it wrote there — asserted through the Thrown field a
  zero-melee unit only qualifies for with it — the card's own Haste reaches the record through
  `buffs:haste:cast` in every version, and `temporalGravityDrive`, `psychoForce` and `pneumaField`
  are absent from both the published map and the origin table while the effects their gates admit
  still land. A last section pins the `!COMBATOVERRIDE!` combat-soldier gate as a record read: a
  Mechanical unit is refused, `training:armorclad`'s flag clears it, a Rebuilt non-hero is refused
  by the permanent Mechanical write `buffs:rebuild` makes, and `energyWeaponry` — which has no
  control — publishes nothing from a raw mark.
  The newest group (F244.3f) covers the strayed Marionette's eight persistent writes, which
  `b:marionette:strayedPackage` and `b:marionette:spellLock` make: all eight reach the published
  record at the values the script states — four of them ranks rather than flags — an owned
  Channeler Marionette receives none of them, the two steps and the two blocks that read their
  flag execute in the script's line order, the five keys with no control anywhere publish nothing
  from a raw mark in any version, and the card's own Spell Lock reaches the record through
  `buffs:spellLock:cast` in each of the three CoM-era engines and neither MoM build — which
  also asserts the number that scope protects, that a Spell-Locked Fantastic target is refused
  the Exorcise roll while an unlocked one still takes it. That section is what holds the nine
  Spell Lock sites together, so a partial revert fails there rather than silently in one
  version.
  Its last section calls the step **predicates** directly, by wrapping `statStep` for one run and
  keeping the composed steps with their closures. That is there because every gate this subtask
  added or changed reads a record field no control can currently set, so a derivation exercises
  one arm only and five wrong implementations passed everything above it: dropping the Spell Lock
  skip from the package, adding one to the Spell Lock write that stands outside it, reverting the
  Transmute Equipment gate to the branch constant, and dropping either of the two per-write
  `SETHEAB` skips — which are first-writer-wins rules over a rank, not idempotent guards, so a unit
  already holding Sage 1 must keep 1. The same section asserts the two hero-region terms the same
  way, since `heroTypeId` 48 implies a hero in every reachable state.
  F244.3g closed the transform out and added a section of its own for the owned branch's
  thirty-one writes. `deriveMarionettePackage` is asserted to add no ability key on any of its seven
  branches, the way `deriveOutlanderReformRecord` already was, and its label list is asserted
  separately - 23 for one saturated ascended run, 31 across the five primaries - so a grant deleted
  from `MARIONETTE_OWNED_GRANTS` fails here rather than passing as a silently smaller package.
  The new section exists because a mutation battery found three wrong implementations passing
  everything else: every book threshold is asserted on both sides of its boundary, each step's gate
  is called directly, and the whole twenty-two-step chain order is asserted against
  `statExecutionTrace` for a saturated ascended Chaos Marionette - the one shape in which every step
  fires, and the shape that pins the projectile retype between Armor Piercing and Exorcise. The
  Regeneration increment is asserted by running the **composed step's** apply on a record already
  carrying a value, not the table helper: a step that calls the right helper and then overwrites the
  field passes a helper-level assertion (F244.3g review, finding 6, which proved it). The seed
  partition lost its third branch with `TRANSFORM_SEED_CARRY`: a transform may now write a seeded key
  only where that key has a `template` or `immunities` row, any other transform write must halt -
  including a zero-valued one, which the earlier truthiness test read as absent - and a *deletion*
  must not.
  F244.3i's section is the whole assertion for a relocation that moves no number: three gates that
  asked the card's attack input what the permanent record holds now ask `ctx.base`, and every
  output is identical either way, so the only falsifiable statement is about the predicates
  themselves. Each is composed with its live closures - `d:energyCannonThreshold`'s `when`,
  `c:chaosChannels:fireBreath`'s `when`, and `slots.persistentRanged` reached through the real
  `slotGateAdmits` arm with the run context's own slot contexts, since fabricating one would
  fabricate the thing under test - and called against a run context whose `base` says the opposite
  of the card. A build reading the input answers all six backwards. That covers the ranged-type
  test the DOS-shaped shared slot carries and the channel one does not, and MoM 1.31's
  strength ceiling of 3, which is read off the same record.
  Its second instrument, `deriveWithPatchedBase`, exists because the first was not enough: the
  F244.3i review demonstrated four wrong implementations that passed every predicate-level
  assertion, each regressing a production path while leaving the helper the predicate tests
  untouched - `addToSlot`'s forwarding, the Chaos Channels `apply`'s independent re-check of the
  gate its `when` already asked, the post-run Destruction rider beside `d:energyCannonThreshold`,
  and the Energy Cannon type test narrowed to the single token every synthetic base named. The
  instrument doctors the record `a:baseCopy` publishes and reads a derived output, so it drives
  each call site whole; the Energy Cannon gate is also asserted over every `RANGED_TYPES` member
  rather than a chosen one.
  The last section of that group (F258.2) covers Eye of Heaven’s gaze zeroing, moved off the
  seed and the region-`e` floor onto its own region-`d` step. Both wrong ranks published the
  same finished number, so what is asserted is the record `a:baseCopy` publishes, the step’s
  rank inside `d` against the neighbours whose blocks bracket it in `UnitCalc.CAS`, the chain
  the tooltip shows carrying exactly one write, and — for the four engines that have no such
  enchantment — that the `enemyEyeOfHeaven` input moves nothing at all. That last assertion is
  the standing form of F244.3i’s sixteen cases, and it is the only coverage the input has: it
  is a top-level field rather than an ability key, so no sweep in the suite and no `ENVS` entry
  in `derivation_equivalence.js` varies it (F259).
  Four of those assertions exist because the F258.2 review proved wrong implementations passing
  without them: a **negative** Doom Gaze separates the step’s unconditional assignment from a
  floor and the removed modern region-`e` floor from a restored one, where a positive value
  cannot; the sentinel strip is asked of a card that actually states Stoning and Death Gaze,
  since a Doom-only fixture compares two absent values; and the rank is asserted over the whole
  run of blocks between the Outlander section and Blaze of Glory rather than its two endpoints.
- Runtime: ~85s.

## persistence

- Command: `npx playwright test tests/persistence.spec.js`
- Tag: spec
- Anchor: CLAUDE.md INV-6 (state round-trip)
- Checks: localStorage round-trip across a real page reload, and that Reset restores the state a
  fresh page has.

## share-link

- Command: `npx playwright test tests/share-link.spec.js`
- Tag: spec
- Anchor: CLAUDE.md INV-6 (state round-trip)
- Checks: serialize → load → serialize is a fixpoint and the DOM reflects the applied state.

## layout-invariants

- Command: `npx playwright test tests/layout-invariants.spec.js`
- Tag: scaffolding
- Anchor: — (cites an `ENCHANTMENT_DEFS` ordering rule from the deleted `Calculator/CLAUDE.md`)
- Checks: the enchantment checkbox block is sorted non-realm → arcane → life → death → chaos →
  nature → sorcery for every version, and reflows when version-hidden items drop out.

## rider-histograms-f222

- Command: `npx playwright test tests/rider-histograms-f222.spec.js`
- Tag: scaffolding
- Anchor: —
- Checks: the rendering half of the per-rider histograms — R5's omission-versus-all-zero
  distinction in the DOM, the `melee` base-roll slot named after its own phase (Thrown / Melee /
  Counter-attack), Life Steal's healing kept off the shared target-HP axis, each rider drawn in
  the column of the unit whose HP it is (asserted by geometry, not by class name), a rider-less
  phase drawing no band, and the band stacking to one column with no page overflow at 375px. Never a
  damage number: the histograms' contents are `node-unit-checks`' business.

## mobile-layout

- Command: `npx playwright test tests/mobile-layout.spec.js`
- Tag: scaffolding
- Anchor: —
- Checks: no horizontal page scroll at any tested width; the three `.four-col-row` children stack at
  ≤700px and sit side by side at ≥1400px.

## touch-tooltips

- Command: `npx playwright test tests/touch-tooltips.spec.js`
- Tag: scaffolding
- Anchor: —
- Checks: long-press shows and tap dismisses a tooltip, on an ordinary control, on a calculated
  output's chain, and on a rider histogram's chain inside a scrolling panel; inputs are ≥16px at
  phone widths so iOS does not zoom on focus.

## matrix-drawers

- Command: `npx playwright test tests/matrix-drawers.spec.js`
- Tag: scaffolding
- Anchor: —
- Checks: the matrix modal's Settings & Filters panel — push layout, persisted open state, active
  count badge, scroll-away header. Never a cell value.
- Runtime: slow; opening the matrix resolves roughly 150×150 matchups per test.

## marionette

- Command: `npx playwright test tests/marionette.spec.js`
- Tag: scaffolding
- Anchor: —
- Checks: the Wanderer/Channeler package derives through UI and share state, Marionette controls are
  exact-version gated, and the Wanderer roster Ranged record sources its permanent ranged type.

## blur-global

- Command: `npx playwright test tests/blur-global.spec.js`
- Tag: regression
- Anchor: the Blur card/global migration
- Checks: Blur stays on both cards in every version, retired global controls are gone, modern uses
  the tactical defender's card for both directions, and retired page and matrix state migrates.

## f20-source-order

- Command: `npx playwright test tests/f20-source-order.spec.js`
- Tag: regression
- Anchor: F20
- Checks: every represented b/c/d step appears in source order for all five versions, multi-field
  writes stay atomic, Warlord identity writes land in b and d, and malformed trace entries are
  rejected. It also asserts which phases are transcribed and which are inherited: `b`, `c`, `d`
  and — since F204 — Warlord's `training` group carry non-provisional positions, the rest are
  provisional.

## identity

- Command: `npx playwright test tests/identity.spec.js`
- Tag: regression
- Anchor: R8.2
- Checks: independent editable base identity fields and the version-gated special-unit selector;
  numeric source and template identity stay internal.

## identity-r8.3

- Command: `npx playwright test tests/identity-r8.3.spec.js`
- Tag: regression
- Anchor: R8.3
- Checks: ordered identity and special-unit conversions.

## identity-r8.4

- Command: `npx playwright test tests/identity-r8.4.spec.js`
- Tag: regression
- Anchor: R8.4 (completed; its backlog row is gone)
- Checks: stateful UI boundaries migrated to independent source/base identity while the legacy preset
  and v1 persistence readers still load.

## custom-level-f42

- Command: `npx playwright test tests/custom-level-f42.spec.js`
- Tag: regression
- Anchor: F42 (completed; its backlog row is gone)
- Checks: the Custom card stays the editable pre-level boundary even when a persistence restore
  leaves a roster base record in the internal cache.

## roster-statement-f136

- Command: `npx playwright test tests/roster-statement-f136.spec.js`
- Tag: regression
- Anchor: F136 — two functions wrote disjoint halves of the roster record and three call paths ran
  only the second, so an edited card was half-reverted by a level change or a matrix cell click.
- Checks: the roster record is stated on the card exactly once, at selection, and no other path
  restates part of it.

## phase-order-f29

- Command: `npx playwright test tests/phase-order-f29.spec.js`
- Tag: regression
- Anchor: F29
- Checks: modern opening phases are ordered and casualties recomputed before later attacks; the DOS
  Thrown/gaze/Wall opening order is preserved in every older version.

## haste-gaze-fear-f30-f31

- Command: `npx playwright test tests/haste-gaze-fear-f30-f31.spec.js`
- Tag: regression
- Anchor: F30, F31
- Checks: each initiating modern gaze repeats under Haste while retaliation stays single; Cause Fear
  samples independently for both Hasted melee calls; Haste healing stays correlated and the defender
  snapshot frozen across pending calls.

## defense-cap-bless-f32-f34

- Command: `npx playwright test tests/defense-cap-bless-f32-f34.spec.js`
- Tag: regression
- Anchor: F32, F34
- Checks: modern defense dice split after die 15 with boundaries unchanged; Bless Defense stays
  spell-only in both modern versions.

## range-level-f33-f56

- Command: `npx playwright test tests/range-level-f33-f56.spec.js`
- Tag: regression
- Anchor: F33, F56
- Checks: CoM2 and Warlord heroes are exempt from physical ranged distance penalties; modern gaze
  fields stay out of the level bonus step.

## damage-spell-f35-f37-f38

- Command: `npx playwright test tests/damage-spell-f35-f37-f38.spec.js`
- Tag: regression
- Anchor: F35, F37, F38
- Checks: modern Area spell iterations use full HP rather than the wounded-top cap; modern Magic
  Immunity is ordered before Black Sleep Doom spell damage.

## wall-of-fire-f36-f40

- Command: `npx playwright test tests/wall-of-fire-f36-f40.spec.js`
- Tag: regression
- Anchor: F36, F40
- Checks: Warlord Wall of Fire spills across figure boundaries with fresh defenses; Teleporting and
  Merging are calculated independently in both modern engines and stay separate across roster,
  custom, state, swap and matrix paths.

## chaos-conjunction-f39

- Command: `npx playwright test tests/chaos-conjunction-f39.spec.js`
- Tag: regression
- Anchor: F39
- Checks: every modern Immolation firing scales from strength 10 to 13 exactly once; Wall of Fire is
  unchanged; DOS state stays hidden and inert; the state persists, shares, survives Swap and crosses
  the matrix worker boundary.

## exorcise-f43

- Command: `npx playwright test tests/exorcise-f43.spec.js`
- Tag: regression
- Anchor: F43
- Checks: CoM common `0x0800` maps to the literal Exorcise consumer; the two DOS names are gated and
  the other four version mechanics are left intact; and no control hidden in both MoM builds but
  live in a modern one names Dispel Evil in its tooltip, `spiritLink` naming Exorcise (F197).
  Amended by F244.3f: the `spellLock` entries of its version-gating table for
  `com2_1.05.11` and `com2_warlord_1.5.12.9` encoded a defect rather than a finding —
  the spell is `spells.ini` [54] in both modern sets and the shared executable refuses
  Exorcise on the flag — so both flipped, the matrix-property row with them, and a new
  `lockedExorcise` assertion pins the number a locked target now takes. What F43 itself
  established is asserted unchanged: the two DOS names stay gated and the modern Exorcise
  mechanic is undisturbed.

## life-steal-healing

- Command: `npx playwright test tests/life-steal-healing.spec.js`
- Tag: regression
- Anchor: F28, F57
- Checks: Combatheal preserves exact categories, irrecoverable damage, overheal division, cap and
  dead figures; raw Life Steal stays uncapped and repeated calls convolve exact heal state; DOS
  healing reproduces categories, restoration and build differences; CoM Life Steal retains the 24-HP
  First Strike suppression.

## modern-riders

- Command: `npx playwright test tests/modern-riders.spec.js`
- Tag: regression
- Anchor: F25, F26
- Checks: every modern gaze type is excluded from the shared touch-rider dispatcher; Destruction uses
  independent surviving-figure attempts, each success assigning the engine's flat 150.

## priority-prerequisites

- Command: `npx playwright test tests/priority-prerequisites.spec.js`
- Tag: regression
- Anchor: F7, F22, F52, R9-G1g
- Checks: the moddable modern Supernatural formula with ties-to-even rounding; the Blood Lust strength
  helper's target gate for modern Thrown; CoM1 Supreme Light eligibility and signed ordered writes;
  CoM Supernatural carriers imported but inactive.

## roster-to-block

- Command: `npx playwright test tests/roster-to-block.spec.js`
- Tag: regression
- Anchor: F21
- Checks: modern roster To Defend deltas load into card and derivation, matrix rows use each unit's
  own value rather than the card's, and non-default roster controls survive swap and state while DOS
  stays at zero delta.

## r9-g1c

- Command: `npx playwright test tests/r9-g1c.spec.js`
- Tag: regression
- Anchor: R9-G1c
- Checks: late-transform source gates, arithmetic, order and UI state are preserved.

## mechanical-expert-f196

- Command: `npx playwright test tests/mechanical-expert-f196.spec.js`
- Tag: scaffolding
- Anchor: —
- Checks: the eight `STypeID`s that satisfy Mechanical Expert's friendly-side presence gate
  (`UnitCalc.CAS!NOTGOBLINCOUNT!+13..+20 "%OR (GETSTAT(UOT,STypeID,1)=52)" "%OR (GETSTAT(UOT,STypeID,1)=363)"`) each resolve in the live Warlord roster and are named in the
  `mechanicalExpert` tooltip, along with the `HAMechanicalMaster` disjunct and the disclosure
  that the scan itself is not derived. Also holds the tooltip to the style guide's 75-character
  line limit. Names are read out of the roster by id, so a roster rename fails here rather than
  leaving the tooltip silently stale.
