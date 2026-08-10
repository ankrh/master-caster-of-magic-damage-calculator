# Working conventions: Damage Calculator

Behavior is specified in `SPEC.md`; update it with behavior changes. This file contains only
directory-specific authoring and test conventions.

## Ability and enchantment definitions

- `ABILITY_DEFS` uses `twoColumnMajor([...])`: author entries column-major so each rendered column
  reads non-realm → arcane → life → death → chaos → nature → sorcery. Recount neighboring entries
  after insertions or removals.
- The nine `MODERN_SPECIAL_FIELDS` render both as controls and, for CoM2/Warlord, on the stat card.
  The control owns state. Card copies must preserve `numcheck`; `null` and `0` are distinct.
- Enchantment selects/numbers render in one full-width controls block. Boolean enchantments render
  in a realm-sorted two-column block; set `realm` correctly because definition order does not drive
  that layout.

## Tooltips

Tooltip claims must match `SPEC.md`, UI contract. Follow
`Reference docs/Tooltip style guide.md`: short labelled lines, one fact per line, with `\n` for
breaks. Do not add “informational only” or “not implemented” hedges to a represented control.

## Presets

- A preset must appear in `TEST_TREE`; keep ability-named groups alphabetical.
- Every version-difference preset needs an explicit `version:` unless it also belongs to a
  versioned group. Artificial MoM tests resolve to `mom_1.31`; version-difference subgroups contain
  paired scenarios differing only by version.
- Prefer +70% To Hit and To Block for deterministic 100% chances unless probability is the subject.
- Prove the expected result changes when the feature is removed; otherwise the preset is not a
  regression test.
- Evaluate `PRESETS` only through browser `runTests()`. Ad-hoc Node reconstruction skips DOM and
  `calcKey` behavior. `node tools/node_unit_checks.js` is a separate `deriveUnitStats` suite.

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
