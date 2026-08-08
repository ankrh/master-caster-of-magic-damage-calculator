# Working conventions: Damage Calculator

Behaviour is specified in [SPEC.md](./SPEC.md) — read it before changing what the
calculator does, and update it in the same change. This file covers *how* to work in
this directory.

## ABILITY_DEFS / ENCHANTMENT_DEFS ordering (`data.js`)
**Abilities group** (`ABILITY_DEFS`): a 2-column CSS grid with row-first flow, so order maps to columns interleaved L/R. Entries are wrapped in `twoColumnMajor([...])` and authored column-major so each column reads top-to-bottom by realm: **non-realm → arcane → life → death → chaos → nature → sorcery**. When adding/removing an entry, recount and reorder neighbours to keep both columns aligned.

The nine gaze/touch/special entries in `MODERN_SPECIAL_FIELDS` (`ui.js`) render **twice**: as ability rows, and — in CoM2 and Warlord only — as a two-column block on the stat card (`buildModernSpecialCard`). The ability control holds the state and the two mirror each other; `updateModernSpecialDuplicates` hides the ability row wherever the card is shown. A card copy must reproduce its def's `numcheck` checkbox, because `null` (absent) and `0` (present, save modifier −0) are different states to the engine.

**Enchantments group** (`ENCHANTMENT_DEFS`): rendered as two stacked blocks with no subgroup headers (`subgroup` is retained only for version gating via `subgroupAllowed`):
- **Controls block** (`.ench-controls`, single full-width column): all `select` and `num`/`numcheck` enchantments, in def order.
- **Checkbox block** (`.ench-bools`, two-column CSS multi-column): all `bool` enchantments. `buildAbilitiesUI` **sorts these at render time by realm** (non-realm → arcane → life → death → chaos → nature → sorcery, stable within a realm) using each item's `dataset.realm`, so the merged list reads by realm regardless of which version subgroups are present, and reflows correctly when items are hidden.

So for enchantments, def order within a subgroup doesn't drive the checkbox layout (the realm sort does) — entries are wrapped in `realmLinear([...])` (identity passthrough) rather than `twoColumnMajor`. Set each entry's `realm` correctly; that, not its position, determines where it lands.

## Tooltips (`ABILITY_DEFS` / `ENCHANTMENT_DEFS` in `data.js`)
What a tooltip may and may not claim is set by [SPEC.md](./SPEC.md) (*UI contract → Tooltip content*). Style rules follow.

Tooltip strings render with `\n` as line breaks — break clauses onto their own lines instead of writing one long run-on sentence. Match the existing style: short labelled lines (e.g. `"MoM 1.31: ..."`, `"Immune: ..."`), one fact per line.

Don't add hedges like "informational only" or "no effect in this calculator"; if a bool exists, assume its mechanics are either implemented or about to be.

`Reference docs/Tooltip style guide.md` holds the standard structure and token vocabulary for `tooltip:` strings — follow it when writing or editing tooltips.

## Test cases (`PRESETS` + `TEST_TREE` in `data.js`)
A preset must be wired into `TEST_TREE` to appear in the UI sidebar. Ability-named subgroups (e.g. "Haste", "Wall of Fire") stay in alphabetical order within their parent group.

**A preset's version comes from its own `version:` field or from its `TEST_TREE` group's**, via
`PRESET_VERSIONS` — and "Version differences tests" declares no group version. A preset reachable
only from that group and carrying no `version:` field therefore selects *whatever version the
previous preset left in the dropdown*, and will appear to pass or fail at random depending on
sibling order. Presets that also appear in a versioned group are immune, which is why this stays
hidden. **Always give a version-differences preset an explicit `version:`.**

Two groups have stricter rules:
- **"Artificial MoM 1.31 tests"** — every key must resolve to `version: 'mom_1.31'`.
- **"Version differences tests"** — each version-specific subgroup must contain **pairs** of tests that differ *only* by version (same stats, ability, scenario). Lone entries don't belong.

When **authoring** a new test case:
- Use **+70% to hit** and **+70% to block** (which add to the 30% base for an effective 100%) unless the test specifically depends on a non-100% probability. Pinning to 100% removes probabilistic noise so the expected damage is deterministic and the test isolates the mechanic under test.
- Verify the expected outcome would actually **change if the feature were bugged**. If a test passes with the feature both implemented and stripped out, it's not testing the feature — adjust the scenario (stats, ability, probabilities) until the "works" and "broken" outcomes diverge.

**Evaluating presets — only one sanctioned path.** Run the `PRESETS` suite through the browser via `runTests()` (see *Testing with Playwright*). That is the *only* faithful way to check expected values, because it goes `applyPreset` → DOM → `readUnitStats` → `resolveCombat`, including the `calcKey` remap (e.g. `fortification`→`largeShield`) and all global-toggle wiring. **Do not reconstruct preset evaluation in an ad-hoc Node script** — hand-rebuilding `applyPreset`/`readUnitStats` and calling `resolveCombat` yourself silently skips the DOM/`calcKey` layer and the enemy-side reads, producing *false* failures that waste a session chasing phantom regressions. (`node tools/node_unit_checks.js` is a *separate*, sanctioned Node suite — it asserts on `deriveUnitStats` directly and never touches `PRESETS`; it is not a substitute for `runTests()`.)

## Testing with Playwright
`npm test` starts and owns its configured server automatically; the manual launch below is for
direct browser navigation only.
Start the no-cache server before the first Playwright navigation — the browser disk cache persists across tab closes, so a reload won't recover from stale JS. Launch it with the Bash/PowerShell tool's `run_in_background`, then confirm it's serving on port 8080:
```powershell
python tools/nocache_server.py --port 8080        # run_in_background
(Invoke-WebRequest http://127.0.0.1:8080/ -UseBasicParsing).StatusCode

# For an isolated agent worktree, use its assigned port instead:
python tools/nocache_server.py --port 8081        # Luna example
(Invoke-WebRequest http://127.0.0.1:8081/ -UseBasicParsing).StatusCode
```

`npm test` reads `PLAYWRIGHT_PORT` and passes that port to the no-cache server. For example,
run Luna's suite with `$env:PLAYWRIGHT_PORT='8081'; npm test` and Sol's with
`$env:PLAYWRIGHT_PORT='8082'; npm test`. Playwright does not reuse an existing server unless
`PLAYWRIGHT_REUSE_EXISTING=1` is explicitly set for an intentional single-checkout run. The
`tools/browser_check.js` harness chooses its own ephemeral HTTP and Chrome-debugging ports and
does not need a manual port assignment.

If you do get stuck on cached JS, force-reload via indirect eval:
```js
const scripts = ['Calculator/units_mom.js', 'Calculator/units_com.js', 'Calculator/units_com2.js', 'Calculator/units_warlord.js', 'Calculator/data.js', 'Calculator/engine.js', 'Calculator/steps.js', 'Calculator/combat.js', 'Calculator/stats.js', 'Calculator/ui.js'];
scripts.reduce((chain, s) =>
  chain.then(() => fetch('/' + s, {cache: 'no-store'}).then(r => r.text()).then(c => (0,eval)(c))),
  Promise.resolve()
)
```

Read computed values via `browser_evaluate`, not snapshots. Key DOM IDs:
- `aFigs/aAtk/aRtb/aRtbType/aDef/aRes/aHP/aDmg/aLevel/aWeapon` — attacker stats (`b` prefix = defender).
- `aAbil_<key>` / `bAbil_<key>` — ability inputs; `<key>` is `ABILITY_DEFS[].key` (e.g. `aAbil_firstStrike`).
- `rangedCheck`, `rangedDist`, `gameVersion`, `cityWalls`, `nodeAura`, `trueLight`, `darkness` — globals.
- `distA` / `distB` — result panels (header in `.dist-header`).
- After programmatic changes, dispatch `new Event('input')` (or `'change'`) on the element to trigger recalc.

Call `runTests()` to run the suite — returns `{ allPassed, total, failures[] }`.

Always `browser_close` when finished — the MCP shares one Chrome instance and a leftover tab blocks the next run.
