<!-- Agent-maintained registry of the test suites agents may run.
     Tag definitions and the rules for changing a tag are in the global CLAUDE.md. -->

# Test registry — Master/Caster of Magic damage calculator

Everything under `tests/` runs in the browser through `npm test`; a single file runs with
`npx playwright test tests/<file>`. The two Node suites are not in `npm test` and run on their own.

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
  conceptual, not machine-checked — 103 of 1125 `desc` fields quote a source address inline.
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
- Checks: R7.3 source-ordered calculated-stat traces.

## modifier-trace-tooltips

- Command: `npx playwright test tests/modifier-trace-tooltips.spec.js`
- Tag: spec
- Anchor: CLAUDE.md *Input/output contract*, the hover-chain paragraph
- Checks: R7.4 presentation of those traces in the tooltip.

## provenance

- Command: `npm run provenance`
- Tag: spec
- Anchor: CLAUDE.md *Architecture* — each engine write carries its provenance citation and the citations
  are checked mechanically
- Checks: every `PROVENANCE[id]` comment is VERIFIED or UNVERIFIED, matches its reviewed anchor, and
  leaves no stale manifest entry.

## node-unit-checks

- Command: `node tools/node_unit_checks.js`
- Tag: scaffolding
- Anchor: —
- Checks: `deriveUnitStats` and the engine/combat helpers in isolation, headless, in a `vm` context
  built from `index.html`'s script manifest. 14,646 assertions across 13 families. It cannot
  evaluate presets: that path runs through the DOM.
- Runtime: ~49s.

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
- Checks: long-press shows and tap dismisses a tooltip; inputs are ≥16px at phone widths so iOS does
  not zoom on focus.

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
  rejected.

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
  the other four version mechanics are left intact.

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
  independent surviving-figure attempts with capped exact PMFs.

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
