# Project: Master/Caster of Magic tooling

Two deliverables, each with its own spec and its own working conventions:

| Directory | Deliverable | Spec | Conventions | Plan |
|---|---|---|---|---|
| `Calculator/` | Damage calculator (live) | `Calculator/SPEC.md` | `Calculator/CLAUDE.md` | `Calculator/BACKLOG.md` |
| `Manual/` | Interactive CoM2 manual (in progress) | `Manual/SPEC.md` | — | `Manual/PLAN.md` |

Specs hold *behaviour*; CLAUDE.md files hold *working conventions*; the Plan files hold
*project state* — `Manual/PLAN.md` covers stages, status and the rules for autonomous
runs; `Calculator/BACKLOG.md` is the **work register** for the calculator — the single list of
everything outstanding, whatever kind of work it is and wherever its evidence lives. Read the
relevant spec before changing behaviour, and update it in the same change. This file
holds only what applies across both deliverables.

## Git topology

`main` is the default and final home for all agent work. Before creating any branch, an agent must
explain to the user why it is necessary, identify the exact proposed branch/worktree names and
cleanup plan, and receive explicit approval. Task authorization and protocol selection do not
imply branch authorization. Approved temporary work must be integrated into `main` and its
branches/worktrees removed before the agent reports completion, unless the user explicitly asks
to retain a named branch. Agent-created uncommitted work must also be resolved; unrelated user
changes remain untouched. See `AGENTS.md` for the mandatory approval gate.

**One rule for the register.** Docs under `Reference docs/` own findings, evidence and immutable
provenance; `Calculator/BACKLOG.md` is the **only** home for live calculator-work state and concise
unresolved question statements — IDs, open/blocked/ready/pending-review state, review gates, cost
and priority. **`done` is not a backlog state:** when an item is completed, remove its row from
`Calculator/BACKLOG.md` and summarize the completed work in `Calculator/HISTORY.md` in the same
change. In the backlog's numbered priority queue, every live dependency must appear in an earlier
row than the item it blocks; when a new dependency is discovered, update both rows and the queue in
the same change. Reference docs may record that a derivation or review occurred on a date and what
it found, but must not mirror the work item's current state, parent blockers or next action.
Their indexes are navigation aids, never status tables. When evidence opens or resolves a
question, update its finding home and update the Q/X row in the register.
`Manual/PLAN.md` remains the separate status authority for the Manual deliverable.

## Reference docs (under `Reference docs/`)
- `MoM source - Fandom site/` — base MoM rules (abilities, damage types, immunities).
- `MoM binary analysis.md` — findings read directly out of the DOS `WIZARDS.EXE` builds, plus the
  method and code anchors for getting more. Outranks every prose source for MoM 1.31. Its
  *The binaries* section is the single home for the paths and md5s of all three builds
  (MoM 1.31, MoM CP 1.60, CoM 1) — do not restate them elsewhere.
- `Caster binary/` — everything read out of the modern engine's `Caster.exe`, which covers
  **both CoM2 and Warlord** (Warlord ships no executable). Its `README.md` is the single home for
  that binary's path and md5; `CoM2 binary analysis.md` is the short method and subsystem index.
  The linked `CoM2 binary - *.md` files own mechanic-level findings for combat flow, resolution
  helpers, direct spells, damage/healing, unit recalculation, and map/city state. They are the
  CoM2/Warlord counterpart to `MoM binary analysis.md`; the `.pas` files are address-backed
  reconstructions of the flows themselves. Much cheaper to read than the DOS builds: the binary
  ships a TD32 debug section with procedure symbols and named locals, so
  `tools/scan_caster_binary.py` resolves routines by name rather than by hunting struct offsets.
  Start at the index whenever a CoM2/Warlord mechanic is not settled by the scripts below.
- `DOS reconstructed/` — address-backed reconstructions of the three DOS builds, produced by
  **R6**. The DOS counterpart to `Caster binary/`, but in C rather than Pascal because
  `WIZARDS.EXE` is Borland C++ 1991. Its `README.md` owns the artifact conventions; `unitcalc.c`
  and `combat.c` hold the reconstruction bodies and `<ID>.evidence.md` the ledgers, counts and
  findings. Reconstructions of a routine outrank the prose sections of `MoM binary analysis.md`
  where they overlap, since they are read instruction by instruction against all three builds.
- `CoM2 data tables.md` — findings read out of the `.INI` tables that ship with CoM2 and Warlord
  (`MODDING.INI`, `Levelbonus.INI`, `SPELLS.INI`, `DESC.INI`). Where a table states a value it
  *is* the implementation, since the engine reads these at load time — so for numeric constants
  check here **before** opening `Caster.exe`. A Warlord `.CAS` script still outranks a table.
- `Engine verification evidence.md` — unresolved or partial evidence dossiers for calculator
  claims that began on prose or inference, split by engine (sections A–C for the DOS builds, D for
  CoM2/Warlord). Resolved findings move to the owning analysis/table document;
  `Calculator/BACKLOG.md`, *Engine verification*, is the only authority for whether an item is actionable.
- `CoM spells.md`, `CoM2 spells.md` — CoM/CoM2 spell mechanics.
- `CoM2 helptext.TXT` — exact in-game text for CoM2 spells and abilities.
- `CoM2manual.html` — CoM2 manual as an OpenOffice HTML export (Shift_JIS), with its images in `CoM2manual_files/`. The only CoM2 manual in the repo; it preserves strikethrough, realm colour, and the three tables that exist only as images. See `Manual/SPEC.md`.
- `CoM helptext.txt` — exact in-game help text for CoM (1) spells and abilities.
- `CoM1manual.HTML` — CoM (1) manual as an HTML export, images in `CoM1manual_files/`. The only CoM (1) manual in the repo.
- `Warlord manual v1.5.12.7.html` — searchable, page-anchored derivative of the current Warlord
  manual, preserving bold, italic, colour and detected strikethrough. Generated by
  `tools/extract_warlord_manual_html.py`; `Warlord_Manual v1.5.12.7.pdf` remains authoritative
  for visual verification.
- `Warlord manual v1.5.12.6.html` and `Warlord_Manual v1.5.12.6.pdf` — previous manual,
  retained as version-comparison evidence.
- `Warlord manual v1.5.12.5 (superseded, formatting-lossy).txt` — old plain-text extraction,
  retained only as version-comparison evidence.

Warlord's in-game helptext is `Unit rosters/Warlord mod unit data/HELP.TXT` — it ships with the
mod's unit data, so it lives with the roster rather than here.

Evidence written before commit `b5c97e5` cites `CoM manual.txt`, `CoM2 manual.txt` and
`CoM helptext.LBX`, which that commit deleted (it also renamed `CoM helptext (parsed).txt` to
`CoM helptext.txt`). Those citations are provenance and stay as written; re-check such a claim
against the HTML manual, whose line numbers differ.

**Helptext and manual are equally authoritative — read both, never one without the other.** For any version (CoM, CoM2, Warlord), the in-game helptext and that version's manual are co-equal sources; neither overrides the other. When verifying a mechanic, consult *both* the helptext and the manual for that version before drawing a conclusion. If they disagree (e.g. one lists an immunity the other omits), treat it as a discrepancy to surface and resolve with the user — do not silently pick one as "more correct."

Where sources conflict, record it rather than re-deriving it later:
- `Source discrepancies.md` — **script vs prose** conflicts. Warlord only, since no other version
  has scripts. The script wins there; see *Game script source* below.
- `Calculator/BACKLOG.md`, *Open questions* and *Blocked on people* — unresolved prose-vs-prose and prose-vs-`UNITS.INI`
  questions for versions with no script arbiter (MoM, CoM, CoM2), plus questions for people.
  Each Q/X row points directly to any evidence catalogue or analysis that bears on it.

Read the relevant doc before implementing a new mechanic.

Closed calculator work and accepted decisions are summarized in `Calculator/HISTORY.md`. It is
historical context, not required reading for ordinary tasks and never a live-status authority.

## Game script source (under `Reference docs/Script source/`)
The game's and mod's own `.CAS` scripts and data tables — the implementation itself, not prose
describing it.
- `CAS reference/` — `Scripts.TXT` (CAS language: syntax, `%I` = integer part, `%R` = round),
  `CasApi.pas` (engine function surface), `SharedConstants.pas` (spell/enchantment/realm IDs),
  `Typedec.pas` (save-file structures).
- `CoM2 1.05.11 base/` — pristine vanilla CoM2 scripts and data tables.
- `Warlord 1.5.12.7/` — the mod's current scripts and data tables.
- `Warlord 1.5.12.6.2/` — the previous full script/data snapshot, retained as
  version-comparison evidence. Never a source for current behaviour.
- `Warlord 1.5.12.6 (superseded)/` — only the five scripts the v1.5.12.6.2 hotfix changed,
  kept as version-comparison evidence. Never a source for current behaviour.

**For Warlord-specific behaviour the scripts outrank both helptext and manual**, because they
are what executes. `Warlord 1.5.12.7/UnitCalcPre.CAS` (reforms) and `UnitCalc.CAS` (unit
enchantments) hold the per-unit stat calculation; `DisAbil.CAS` decides which ability labels
merely *display*. This is the one exception to the co-equal-sources rule above.

**Base CoM2 formulas are not here.** Vanilla ships its combat scripts as empty stubs
(`CoM2 1.05.11 base/UnitCalc.CAS` is a `HALT;`) — base mechanics are compiled into `Caster.exe`.
For CoM2 and MoM, helptext and manual remain co-equal as stated above. What vanilla *does*
expose as text is the `.INI` data tables shipped alongside these scripts, and they carry far
more of the engine than their name suggests — see `Reference docs/CoM2 data tables.md`, which is
their single home. Only when they are silent, read the executable
(`Reference docs/Caster binary/`).

### CoM2 / Warlord implementation authority

For modern-engine mechanics, the source of truth is deliberately small and is **not** the
manual or helptext. Start with the routing table in
`Reference docs/Caster binary/CoM2 binary analysis.md`, *Modern-engine source of truth*:

1. the address-backed reconstruction in `Reference docs/Caster binary/` owns compiled
   `Caster.exe` control flow and arithmetic;
2. the shipped Warlord `.CAS` files own Warlord behavior that they execute or overwrite;
3. `MODDING.INI`, `Levelbonus.INI`, and `SPELLS.INI` own their loaded numeric values;
   `UNITS.INI` separately owns roster data. `DESC.INI`, manuals, and helptext are prose,
   not implementation.

These sources compose rather than forming a blanket winner-takes-all hierarchy: compiled code
often supplies the formula while an INI supplies its constant; a Warlord script can add to or
overwrite the compiled result after both. The executable reconstruction settles a question only
when the applicable CAS and runtime-table inputs are silent. Do not infer CoM2 formula behavior
from vanilla CAS stubs.

**`MASTER.CAS` is the only map from stat/ability names to numeric IDs**, so it cannot be
cross-checked against anything. Trust its `Name=Number` lines; treat its `:comments:` as
unreliable — the `STExplosive` comment states a Thrown formula the code contradicts.

## MoM 1.31 decompilation (outside this repo, at `C:\ReMoM`)
[ReMoM](https://github.com/jbalcomb/ReMoM) — a community disassembly of Master of Magic v1.31
translated to C. Cloned as a sibling directory, deliberately **not** vendored or committed: it has
no licence file, so we read it but never redistribute it. Refresh with `git -C /c/ReMoM pull`.

The combat resolution lives in `MoM/src/Combat.c` (~31k lines). Entry points worth knowing:
`CMB_AttackRoll__SEGRAX` / `CMB_DefenseRoll__SEGRAX` (the per-figure d10 rolls),
`Combat_Resistance_Check` / `Combat_Effective_Resistance`, `BU_ProcessAttack__WIP` (the melee and
ranged damage pipeline), `Battle_Unit_Defense_Special`, `BU_ApplyDamage`. `MoX/src/random.c`
defines `Random(n)`, which returns **1..n inclusive** — essential when reading any roll comparison.

Authority: useful for orientation and for its field offsets, but it is a *reconstruction*, not
shipped source, and it has been shown to render real control flow incorrectly. It does not
outrank helptext and manual, and it never outranks the binary. For CoM2 and Warlord it is a
*hypothesis* only; those versions rewrote combat, and `Reference docs/Script source/Warlord 1.5.12.7/` wins.

Three traps: names ending `__WIP` or `__NOOP` are **structurally unreliable, not merely
unfinished** — `BU_ProcessAttack__WIP` was found to have wrong assignment operators and a
merged `else` branch; two ReMoM functions covering the same logic can disagree; and functions
can be AI heuristics rather than rules — `Get_Effective_Hits()` looks like a damage formula but
is the AI's stack-strength estimator.

**For MoM 1.31, the executable is the arbiter, and it is reachable.** See
`Reference docs/MoM binary analysis.md` and `tools/scan_mom_binary.py` — struct field offsets
from ReMoM's `MOM_DAT.h` locate code in `WIZARDS.EXE` without a symbol table or overlay map.
Use it whenever prose sources conflict or ReMoM looks doubtful.

## Unit data source (under `Unit rosters/`)
`UNITS.INI` is the original data source for CoM2 and Warlord units: `CoM2 unit data/UNITS.INI` and `Warlord mod unit data/UNITS.INI`. The in-app `units_com2.js` / `units_warlord.js` are generated from these by `tools/generate_com2_units_json.py` and `tools/generate_warlord_units_json.py`. The MoM/CoM datasets (`units_mom.js`, `units_com.js`) are generated from the `.txt` rosters by `tools/parse_tweaker_unit_data.py`. Each version's data lives in its own `Calculator/units_<version>.js` file.

These are build products — never hand-edit them. When a unit's stats are disputed, the source roster wins and the fix belongs in the generator.

Each version's directory also holds the `HELP.TXT` that shipped with it.
`Warlord mod unit data/v1.5.12.6.2 (superseded)/` holds the previous release's `UNITS.INI`
and `HELP.TXT`; the adjacent v1.5.12.6 directory holds the pre-hotfix release. Both are
version-comparison evidence only, never sources for current behaviour. See their READMEs.

## Calculator task-execution protocols

Before implementing any `Calculator/BACKLOG.md` item, performing binary reconstruction, or doing
cross-agent review work, read `DERIVATION-REVIEW-PROTOCOL.md` in full. It defines exactly three
execution methods:

1. Claude + Codex dual-agent derivation for every binary reconstruction task;
2. two Codex GPT-5.6 Sol High agents independently implementing and reciprocally reviewing a task;
3. implementation by the current agent, regardless of model, followed by one Codex GPT-5.6 Sol
   High subagent that reviews and revises the work.

Implementation methods 2 and 3 are never defaults. Use one only when the user requests it or the
backlog row already records that preference; an explicit request overrides the recorded
preference. If neither source selects a method, ask the user before starting implementation. Do not
load the protocol for other ordinary work.
