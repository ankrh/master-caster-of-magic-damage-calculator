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

A step needs two facts beside its formula: a **phase**, the provenance label naming the region
that makes the write, and a position in its version's **execution chain** (`statChain`,
`stats_manifests.js`), which is what actually orders it. The phase model and the chain are in
`SPEC.md`, *Phases* and *The execution chain*; this is how a new step is assigned a phase.

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
4. Neither map nor script names it → deduce, and say from what.

Steps 1–3 are checkable, which is the point; only step 4 is judgment, and it is the exception.
Routing to each source corpus is in the root [CLAUDE.md](../CLAUDE.md).

A deduced *position* is marked on the chain entry, not the step: the `provisional` flag belongs to
the segment that carries the order. The `base`, `a` and `e` segments are provisional as a whole
today; promoting one entry means splitting its segment and citing the address map that sources it.

## Tooltips

Tooltip claims must match `SPEC.md`, UI contract. Follow
`Reference docs/Tooltip style guide.md`: short labelled lines, one fact per line, with `\n` for
breaks. Do not add “informational only” or “not implemented” hedges to a represented control.

## Presets

- Presets live in the `presets_*.js` files, cut by ability family, and merge into one `PRESETS`
  object through `definePresets()` (`presets.js`), which rejects a key defined twice. Add a preset
  beside its family; add a part file by listing it in the manifest. `TEST_TREE` (`test_tree.js`)
  owns the browser's grouping. These are `data-scope="page"`: the page is the only consumer.
- A preset must appear in `TEST_TREE`, and every `TEST_TREE` key must name a preset;
  `node tools/node_unit_checks.js` asserts both directions. Keep ability-named groups alphabetical.
- Every version-difference preset needs an explicit `version:` unless it also belongs to a
  versioned group. Artificial MoM tests resolve to `mom_1.31`; version-difference subgroups contain
  paired scenarios differing only by version.
- Prefer +70% To Hit and To Block for deterministic 100% chances unless probability is the subject.
- Prove the expected result changes when the feature is removed; otherwise the preset is not a
  regression test. A preset may assert that nothing changes, but only where that absence is the
  rule under test — an exclusion the engine really makes, such as a channel, race or immunity
  boundary. Inertness that is merely incidental to a preset named for a positive rule is a defect,
  not a negative claim. Say which it is in the `desc`. `node tools/preset_vacuity_sweep.js` runs
  that control over every preset and reports the ones whose named feature moves nothing; it is a
  diagnostic, not part of `npm test`.
- Evaluate `PRESETS` only through browser `runTests()`; `npm test` does this in
  `tests/presets.spec.js`. Ad-hoc Node reconstruction skips DOM and `calcKey` behavior.
  `node tools/node_unit_checks.js` is a separate `deriveUnitStats` suite; it reads preset keys but
  never evaluates one.

## What an assertion has to be bound to

An assertion earns its place only when its expected value comes from somewhere the implementation
cannot reach: the content of a cited source (`PROVENANCE` anchors hash it), an independent
transcription (`tests/f20-source-order.spec.js` anchors, deliberately not derived from the chain
they check), or a numeric consequence whose expectation came from evidence rather than from
running the code.

An assertion that restates the implementation in a second notation and then checks the two agree
has no force: both are written by the same author from the same reading, so a wrong reading passes,
and a correct rewrite in another notation fails. Do not add one, and prefer a preset over one that
exists — `holyBonusSkipsThrownCoM2` proves the Holy Bonus aura skips Thrown by its damage number,
whatever shape the step has. Where a claim has no observable consequence at all, its home is a
`PROVENANCE` citation or a comment, not an assertion that looks like verification.

## Tests

Cost sets the cadence. `node tools/node_unit_checks.js` is ~7s and `npm run provenance` ~6s;
`npm test` is ~2.7 minutes of the user's wall clock, and the user waits through it.

```powershell
node tools/node_unit_checks.js
npm run provenance
npm test
```

- **Documentation only — run nothing.** `BACKLOG.md`, `HISTORY.md`, `SPEC.md`, `CLAUDE.md` and
  `AGENTS.md` move no check. The one exception: a `BACKLOG.md` edit runs `npm run provenance`
  alone, because `provenance_audit.js` reads that file and checks its UNVERIFIED count against
  the audit's own.
- **While implementing — the two Node checks, as often as useful.** They are cheap and carry the
  fast signal.
- **`npm test` once, at the end of a finished implementation round.** Not after each edit, not
  before a commit that changed no code, and not to re-confirm a green run that nothing since
  could have invalidated — including a green run a subagent already reported.

A red check is still a blocker: never skip, weaken or delete an assertion to reach green, and
never report a task complete with one outstanding. Say which checks you ran and what they returned,
so a reader can tell a skipped check from a passing one.

`npm test` owns its no-cache server and honors `PLAYWRIGHT_PORT`. Direct browser inspection may use:

```powershell
python tools/nocache_server.py --port 8080
```

For an approved method-2 worktree, use its assigned isolated port from
`DERIVATION-REVIEW-PROTOCOL.md`. Never reuse another worktree's server. When using browser tools,
read computed values rather than screenshots, dispatch `input`/`change` after programmatic edits,
and close the browser when finished.
