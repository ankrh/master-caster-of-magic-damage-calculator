# Project: CoM2 Damage Calculator

## Reference docs (under `Reference docs/`)
- `MoM source - Fandom site/` — base MoM rules (abilities, damage types, immunities).
- `CoM spells.md`, `CoM2 spells.md` — CoM/CoM2 spell mechanics.
- `CoM2 spells helptext.txt` / `CoM2 helptext.TXT` — exact in-game text for CoM2 spells and abilities. (The two files are byte-identical.)
- `CoM2 manual.txt` — CoM2 manual: spell/ability/mechanic descriptions.
- `CoM helptext (parsed).txt` — exact in-game help text for CoM (1) spells and abilities, extracted from `CoM helptext.LBX` via `tools/parse_lbx_helptext.py`.
- `CoM manual.txt` — CoM (1) manual: spell/ability/mechanic descriptions.
- `Warlord manual.txt` — Warlord mod (built on CoM2) spell/ability/retort behavior.
- `Warlord mechanic changes.md` — curated diff of Warlord vs CoM2. Check first for Warlord-specific work.
- `Warlord helptext.TXT` — exact in-game text for Warlord enchantments and spell effects.

**Helptext and manual are equally authoritative — read both, never one without the other.** For any version (CoM, CoM2, Warlord), the in-game helptext and that version's manual are co-equal sources; neither overrides the other. When verifying a mechanic, consult *both* the helptext and the manual for that version before drawing a conclusion. If they disagree (e.g. one lists an immunity the other omits), treat it as a discrepancy to surface and resolve with the user — do not silently pick one as "more correct."
- `Tooltip style guide.md` — standard structure and token vocabulary for `tooltip:` strings; follow when writing or editing tooltips.
- `Tooltip rewrite plan.md` — chunked plan + starter prompts for the ongoing pass that re-verifies and rewrites every tooltip against the implementation.

Read the relevant doc before implementing a new mechanic. Use exact probability distributions (binomial math), never Monte Carlo.

## Unit data source (under `Unit rosters/`)
`UNITS.INI` is the original data source for CoM2 and Warlord units: `CoM2 unit data/UNITS.INI` and `Warlord mod unit data/UNITS.INI`. The in-app `units.js` / `units_warlord.js` are generated from these — treat the `.ini` files as authoritative when a unit's stats or abilities are in question.

## ABILITY_DEFS / ENCHANTMENT_DEFS ordering (`data.js`)
**Abilities group** (`ABILITY_DEFS`): a 2-column CSS grid with row-first flow, so order maps to columns interleaved L/R. Entries are wrapped in `twoColumnMajor([...])` and authored column-major so each column reads top-to-bottom by realm: **non-realm → arcane → life → death → chaos → nature → sorcery**. When adding/removing an entry, recount and reorder neighbours to keep both columns aligned.

**Enchantments group** (`ENCHANTMENT_DEFS`): rendered as two stacked blocks with no subgroup headers (`subgroup` is retained only for version gating via `subgroupAllowed`):
- **Controls block** (`.ench-controls`, single full-width column): all `select` and `num`/`numcheck` enchantments, in def order.
- **Checkbox block** (`.ench-bools`, two-column CSS multi-column): all `bool` enchantments. `buildAbilitiesUI` **sorts these at render time by realm** (non-realm → arcane → life → death → chaos → nature → sorcery, stable within a realm) using each item's `dataset.realm`, so the merged list reads by realm regardless of which version subgroups are present, and reflows correctly when items are hidden.

So for enchantments, def order within a subgroup doesn't drive the checkbox layout (the realm sort does) — entries are wrapped in `realmLinear([...])` (identity passthrough) rather than `twoColumnMajor`. Set each entry's `realm` correctly; that, not its position, determines where it lands.

## Tooltips (`ABILITY_DEFS` / `ENCHANTMENT_DEFS` in `data.js`)
Tooltip strings render with `\n` as line breaks — break clauses onto their own lines instead of writing one long run-on sentence. Match the existing style: short labelled lines (e.g. `"MoM 1.31: ..."`, `"Immune: ..."`), one fact per line.

Don't add hedges like "informational only" or "no effect in this calculator"; if a bool exists, assume its mechanics are either implemented or about to be.

The calculator models only the *outcome* of a curse or enchantment landing — it does not model whether a unit successfully resists the spell (i.e. the resistance roll to avoid the effect). Do not mention resistance modifiers (e.g. "resistance roll at −3") in tooltips.

## Test cases (`PRESETS` + `TEST_TREE` in `data.js`)
A preset must be wired into `TEST_TREE` to appear in the UI sidebar. Ability-named subgroups (e.g. "Haste", "Wall of Fire") stay in alphabetical order within their parent group.

Two groups have stricter rules:
- **"Artificial MoM 1.31 tests"** — every key must resolve to `version: 'mom_1.31'`.
- **"Version differences tests"** — each version-specific subgroup must contain **pairs** of tests that differ *only* by version (same stats, ability, scenario). Lone entries don't belong.

When **authoring** a new test case:
- Use **+70% to hit** and **+70% to block** (which add to the 30% base for an effective 100%) unless the test specifically depends on a non-100% probability. Pinning to 100% removes probabilistic noise so the expected damage is deterministic and the test isolates the mechanic under test.
- Verify the expected outcome would actually **change if the feature were bugged**. If a test passes with the feature both implemented and stripped out, it's not testing the feature — adjust the scenario (stats, ability, probabilities) until the "works" and "broken" outcomes diverge.

**Evaluating presets — only one sanctioned path.** Run the `PRESETS` suite through the browser via `runTests()` (see *Testing with Playwright*). That is the *only* faithful way to check expected values, because it goes `applyPreset` → DOM → `readUnitStats` → `resolveCombat`, including the `calcKey` remap (e.g. `fortification`→`largeShield`) and all global-toggle wiring. **Do not reconstruct preset evaluation in an ad-hoc Node script** — hand-rebuilding `applyPreset`/`readUnitStats` and calling `resolveCombat` yourself silently skips the DOM/`calcKey` layer and the enemy-side reads, producing *false* failures that waste a session chasing phantom regressions. (`node tools/node_unit_checks.js` is a *separate*, sanctioned Node suite — it asserts on `deriveUnitStats` directly and never touches `PRESETS`; it is not a substitute for `runTests()`.)

## Testing with Playwright
Start the no-cache server before the first Playwright navigation — the browser disk cache persists across tab closes, so a reload won't recover from stale JS. Launch it with the Bash/PowerShell tool's `run_in_background`, then confirm it's serving on port 8080:
```powershell
python tools/nocache_server.py        # run_in_background
(Invoke-WebRequest http://localhost:8080/ -UseBasicParsing).StatusCode
```

If you do get stuck on cached JS, force-reload via indirect eval:
```js
const scripts = ['Calculator/units.js', 'Calculator/units_warlord.js', 'Calculator/data.js', 'Calculator/engine.js', 'Calculator/combat.js', 'Calculator/stats.js', 'Calculator/ui.js'];
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
