# Project: Master/Caster of Magic tooling

Read `AGENTS.md` in full and follow it before starting work.

| Directory | Deliverable | Behavior | Work state | Conventions |
|---|---|---|---|---|
| `Calculator/` | Damage calculator | `Calculator/SPEC.md` | `Calculator/BACKLOG.md` | `Calculator/CLAUDE.md` |
| `Manual/` | Interactive CoM2 manual | `Manual/SPEC.md` | `Manual/PLAN.md` | this file |

Read the relevant behavior document before changing behavior and update it in the same change.
Rules that apply to all agents, including the read-only and branch-approval gates, live only in
`AGENTS.md`.

## Document ownership

- `Calculator/BACKLOG.md` is the sole register of live calculator work: IDs, priority, state,
  dependencies, method preferences, and concise unresolved questions.
- Completed calculator work leaves the backlog and gets a short entry in
  `Calculator/HISTORY.md`. `done` is not a backlog state.
- `Manual/PLAN.md` is the Manual's separate status authority.
- Evidence documents own findings and immutable provenance. They may record what was found and
  when, but never mirror live state, blockers, or next actions.
- Indexes route readers; they do not duplicate status or findings.

When evidence opens or resolves a question, update both its evidence home and the corresponding
backlog row. In the numbered priority queue, every dependency must precede the item it blocks.

## Source routing and authority

| Subject | Start here | Authority notes |
|---|---|---|
| MoM 1.31 / CP 1.60 / CoM 1 compiled behavior | `Reference docs/DOS reconstructed/README.md` | Address-backed reconstructions outrank prose; `MoM binary analysis.md` is the broader index. |
| CoM2 / Warlord compiled behavior | `Reference docs/Caster binary/CoM2 binary analysis.md` | Its subsystem index routes to address-backed Pascal reconstructions. |
| Warlord scripted behavior | `Reference docs/Script source/Warlord 1.5.12.7/` | Executing `.CAS` scripts outrank manuals, helptext, and compiled behavior they overwrite. |
| CoM2 / Warlord constants | `Reference docs/CoM2 data tables.md` | Runtime INI assignments own loaded values; `UNITS.INI` separately owns roster data. |
| Manuals and helptext | the version-matched files under `Reference docs/` or `Unit rosters/` | Co-equal prose sources: read both and surface disagreements. |
| Unresolved evidence | `Reference docs/Engine verification evidence.md` | The backlog remains the authority for whether work is live. |
| Script-vs-prose conflicts | `Reference docs/Source discrepancies.md` | Warlord script wins; the document records the conflict. |

Modern sources compose: compiled code supplies control flow, INI files supply runtime constants,
and Warlord scripts may add to or overwrite the result. Do not infer base CoM2 formulas from its
empty CAS stubs. `MASTER.CAS` is the sole numeric ID map; trust its assignments, not its comments.

For versions without a script arbiter, unresolved prose conflicts belong in the backlog's open
questions. Manuals and helptext describe behavior but do not outrank a checked executable
reconstruction.

Executable paths, hashes, artifact conventions, and tool commands live in the README beside each
binary corpus. Do not restate them elsewhere. Superseded manuals, scripts, and roster snapshots are
comparison evidence only, never sources for current behavior.

## External MoM reconstruction

`C:\ReMoM` is useful for orientation and field offsets but is not shipped source and never
outranks the executable. Treat `__WIP`/`__NOOP` functions, competing reconstructions, and apparent
formulas used only by AI heuristics as hypotheses until checked against `WIZARDS.EXE`. Do not
vendor ReMoM because it has no license file.

## Unit data

`UNITS.INI` is authoritative for CoM2 and Warlord rosters. DOS rosters originate in the versioned
text sources under `Unit rosters/`. The `Calculator/units_<version>.js` files are generated build
products: fix their source or generator, never hand-edit them.

Generators:

- `tools/generate_com2_units_json.py`
- `tools/generate_warlord_units_json.py`
- `tools/parse_tweaker_unit_data.py`

## Calculator execution methods

Before implementing a calculator backlog item, reconstructing binary code, or doing cross-agent
review work, read `DERIVATION-REVIEW-PROTOCOL.md`.

- Binary reconstruction always uses method 4: two independent Codex GPT-5.6 Sol High derivations,
  main-agent merge, then one Claude Opus 5 High review.
- Implementation uses method 2 or 3 only when the user or backlog row selects it.
- If neither selects an implementation method, ask before reading implementation code.
