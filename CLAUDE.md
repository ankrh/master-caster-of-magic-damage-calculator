# Project: Master/Caster of Magic tooling

Two deliverables, each with its own spec and its own working conventions:

| Directory | Deliverable | Spec | Conventions | Plan |
|---|---|---|---|---|
| `Calculator/` | Damage calculator (live) | `Calculator/SPEC.md` | `Calculator/CLAUDE.md` | — |
| `Manual/` | Interactive CoM2 manual (in progress) | `Manual/SPEC.md` | — | `Manual/PLAN.md` |

Specs hold *behaviour*; CLAUDE.md files hold *working conventions*; `Manual/PLAN.md`
holds *project state* — stages, status, and the rules for autonomous runs. Read the
relevant spec before changing behaviour, and update it in the same change. This file
holds only what applies across both deliverables.

## Reference docs (under `Reference docs/`)
- `MoM source - Fandom site/` — base MoM rules (abilities, damage types, immunities).
- `CoM spells.md`, `CoM2 spells.md` — CoM/CoM2 spell mechanics.
- `CoM2 spells helptext.txt` / `CoM2 helptext.TXT` — exact in-game text for CoM2 spells and abilities. (The two files are byte-identical.)
- `CoM2 manual.txt` — CoM2 manual as plain text.
- `CoM2manual.html` — CoM2 manual as an OpenOffice HTML export (Shift_JIS), with its images in `CoM2manual_files/`. Preferred over the `.txt`: it preserves strikethrough, realm colour, and the three tables that exist only as images. See `Manual/SPEC.md`.
- `CoM helptext (parsed).txt` — exact in-game help text for CoM (1) spells and abilities, extracted from `CoM helptext.LBX` via `tools/parse_lbx_helptext.py`.
- `CoM manual.txt` — CoM (1) manual: spell/ability/mechanic descriptions.
- `CoM1manual.HTML` — CoM (1) manual as an HTML export, images in `CoM1manual_files/`.
- `Warlord manual.txt` — Warlord mod (built on CoM2) spell/ability/retort behavior.
- `Warlord mechanic changes.md` — curated diff of Warlord vs CoM2. Check first for Warlord-specific work.
- `Warlord helptext.TXT` — exact in-game text for Warlord enchantments and spell effects.

**Helptext and manual are equally authoritative — read both, never one without the other.** For any version (CoM, CoM2, Warlord), the in-game helptext and that version's manual are co-equal sources; neither overrides the other. When verifying a mechanic, consult *both* the helptext and the manual for that version before drawing a conclusion. If they disagree (e.g. one lists an immunity the other omits), treat it as a discrepancy to surface and resolve with the user — do not silently pick one as "more correct."

Read the relevant doc before implementing a new mechanic.

## Unit data source (under `Unit rosters/`)
`UNITS.INI` is the original data source for CoM2 and Warlord units: `CoM2 unit data/UNITS.INI` and `Warlord mod unit data/UNITS.INI`. The in-app `units_com2.js` / `units_warlord.js` are generated from these by `tools/generate_com2_units_json.py` and `tools/generate_warlord_units_json.py`. The MoM/CoM datasets (`units_mom.js`, `units_com.js`) are generated from the `.txt` rosters by `tools/parse_tweaker_unit_data.py`. Each version's data lives in its own `Calculator/units_<version>.js` file.

These are build products — never hand-edit them. When a unit's stats are disputed, the source roster wins and the fix belongs in the generator.
