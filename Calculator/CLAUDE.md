# Working conventions: Damage Calculator

Scope, architecture, the input/output contract, deliberate deviations and invariants are specified
in `SPEC.md`; update it when one of those changes. What an individual effect does is not there —
it is owned by the effect's `PROVENANCE[id]` citation and the sources that citation names. This
file contains only directory-specific authoring and test conventions.

## Source manifest

The `<script src="Calculator/...">` tags in `index.html` are the single home for the file list and
load order. Adding, splitting or renaming a source is one edit there; every consumer derives its
list from it. Each tag needs `data-scope="core"` (computation layer, runs without a DOM) or
`data-scope="page"`, plus `data-worker` on the sources the matrix worker imports. Node reads the
tags through `tools/calculator_sources.js` — which also exports `loadCalculatorContext()`, the
headless context the Node suites run against — and browser code reads them from the DOM via
`matrixWorkerSource()` in `ui_matrix.js`. Both readers throw on an unclassified tag or a `Calculator/*.js`
file that no tag mentions, so a new source cannot reach some consumers while the rest report green.

## Ability and enchantment definitions

- `ABILITY_DEFS` (`abilities.js`) and `ENCHANTMENT_DEFS` (`enchantments.js`) author their entries
  through the layout helpers in `data.js`.
- `ABILITY_DEFS` uses `twoColumnMajor([...])`: author entries column-major so each rendered column
  reads non-realm → arcane → life → death → chaos → nature → sorcery. Recount neighboring entries
  after insertions or removals.
- The nine `MODERN_SPECIAL_FIELDS` render both as controls and, for CoM2/Warlord, on the stat card.
  The control owns state. Card copies must preserve `numcheck`; `null` and `0` are distinct.
- Enchantment selects/numbers render in one full-width controls block. Boolean enchantments render
  in a realm-sorted two-column block; set `realm` correctly because definition order does not drive
  that layout.

## Step authoring

A sequence is authored in non-decreasing phase order, checked under the debug switch. The phase
model itself is in `SPEC.md`, *Phases*; this is how a new step is assigned to one.

**Which source implements an effect decides its phase.** Game-fiction wording ("combat
enchantment", "trained in the city") does not. Classify by, in order:

1. Read it out of the region maps in the CoM2 binary analysis, *Unit stat recalculation*, which
   decode `a`, `c` and `e` block by block with addresses.
2. Grep the identifier across the Warlord script source. In `UnitCalcPre.CAS` → **b**; in
   `UnitCalc.CAS` → **d**, at that file's line order. (`DisAbil.CAS`, `DisInfo.CAS`, `AIRes.CAS`
   and `EnterGame.CAS` are display and AI only.)
3. A raw unit stat, or a value written permanently into the unit's base before the pipeline runs
   — `CreateUnit.CAS`, `OverlandEndTurn.CAS`, or a cast handler writing `ABase` in `OLSpell.CAS`
   — → **base**.
4. Neither map nor script names it → deduce, mark the step `provisional`, and say from what.

Steps 1–3 are checkable, which is the point; only step 4 is judgment, and it is the exception.
Routing to each source corpus is in the root [CLAUDE.md](../CLAUDE.md).

## Tooltips

Tooltip claims must match `SPEC.md`, UI contract. Follow
`Reference docs/Tooltip style guide.md`: short labelled lines, one fact per line, with `\n` for
breaks. Do not add “informational only” or “not implemented” hedges to a represented control.

## Presets

- Presets live in the `presets_*.js` files, cut by ability family, and merge into one `PRESETS`
  object through `definePresets()` (`presets.js`), which rejects a key defined twice. Add a preset
  beside its family; add a part file by listing it in the manifest. `TEST_TREE` (`test_tree.js`)
  owns the browser's grouping. These are `data-scope="page"`: the page is the only consumer.
- A preset must appear in `TEST_TREE`; keep ability-named groups alphabetical.
- Every version-difference preset needs an explicit `version:` unless it also belongs to a
  versioned group. Artificial MoM tests resolve to `mom_1.31`; version-difference subgroups contain
  paired scenarios differing only by version.
- Prefer +70% To Hit and To Block for deterministic 100% chances unless probability is the subject.
- Prove the expected result changes when the feature is removed; otherwise the preset is not a
  regression test.
- Evaluate `PRESETS` only through browser `runTests()`; `npm test` does this in
  `tests/presets.spec.js`. Ad-hoc Node reconstruction skips DOM and `calcKey` behavior.
  `node tools/node_unit_checks.js` is a separate `deriveUnitStats` suite.

## Tests

Run the applicable checks; calculator behavior changes normally require:

```powershell
node tools/node_unit_checks.js
npm run provenance
npm test
```

`npm test` owns its no-cache server and honors `PLAYWRIGHT_PORT`. Direct browser inspection may use:

```powershell
python tools/nocache_server.py --port 8080
```

For an approved method-2 worktree, use its assigned isolated port from
`DERIVATION-REVIEW-PROTOCOL.md`. Never reuse another worktree's server. When using browser tools,
read computed values rather than screenshots, dispatch `input`/`change` after programmatic edits,
and close the browser when finished.
