# Interactive CoM2 Manual — build plan

Project state: what is done, what is next, and the rules for autonomous runs.
Behaviour is in [SPEC.md](./SPEC.md) — this file never restates it.

**Status: Stage 0 complete** (commit `537b044`). `--verify` is green.

## Stages

Each stage ends with `python tools/parse_com2_manual.py --verify` green and the
stage's own assertions added to `EXPECTED`.

### Stage 0 — contract ✅ done

Parser skeleton, run-based tokenizer, `--census` / `--verify` / `--emit`.
Confirmed: 17 chapters, 14 races, 234 spells, 272 style-detected entries.
Deterministic JSON emit. Built by hand deliberately — the agent whose work it
grades must not also define it.

### Stage 1 — full extraction

Every chapter's entities extracted, with per-chapter entry rules (SPEC.md,
*Entry detection is per-chapter* — this is the part that will bite).

Done when:
- Retorts, Buildings, Hero Abilities, Hero Types, Common Units and racial units
  all extract, each with a count assertion in `EXPECTED`.
- The item-power count is resolved (37 vs 38) and asserted.
- The unclaimed-text report is empty.
- Structured fields per SPEC.md's entity model are populated.

### Stage 2 — tables and verification

- Transcribe the three images to JSON. The difficulty GIF is ~70 × 9 with **no
  verification source**: transcribe in column chunks, verify row count and row
  labels in a separate pass, and mark the result machine-transcribed.
- Build the helptext / `UNITS.INI` join as a *verification* pass and emit
  `Manual/DISCREPANCIES.md`. Never let a discrepancy change what is presented.

### Stage 3 — the page

`Manual/index.html` + `manual.js` + `manual.css`. Renderers in SPEC.md's
priority order. Highest value first: the item-power inverted filter and the
difficulty matrix, since neither exists anywhere else today.

## Priority if work is cut short

**Finish the data layer before any renderer beyond a plain browsable list.**
A clean, verified, reusable JSON dataset is worth more than a half-built page —
the data is the painful part to redo. Stages 1 and 2 before Stage 3.

## Working agreement for autonomous runs

- **Never relax a failing assertion.** A mismatch means the parser or the
  expected count is wrong. Both are defects: report and stop. Tuning the number
  until it passes destroys the only signal that the run is working.
- **Never widen scope to `Calculator/`.** It is live code with a passing test
  suite and is not part of this project.
- **Log discrepancies, don't resolve them.** They go to `DISCREPANCIES.md` and
  are surfaced at the end of the run, not decided mid-run.
- **Confirm a count before asserting it.** Counts derived from one method can be
  wrong — the 233-vs-234 spell error survived into the spec because a single
  regex was trusted. Corroborate with a second, structurally different method.
- **Stop and report** on anything the spec does not cover, rather than guessing.

Runs happen locally in a git worktree (no remote agents available). The manual
HTML and its images are tracked precisely so a worktree checkout has them.
