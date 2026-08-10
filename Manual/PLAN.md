# Interactive CoM2 Manual — build plan

Project state: what is done, what is next, and the rules for autonomous runs.
Behaviour is in [SPEC.md](./SPEC.md) — this file never restates it.

**Status: Stage 1 complete.** `--verify` is green.

## Stages

Each stage ends with `python tools/parse_com2_manual.py --verify` green and the
stage's own assertions added to `EXPECTED`.

### Stage 0 — contract ✅ done

Parser skeleton, run-based tokenizer, `--census` / `--verify` / `--emit`.
Deterministic JSON emit. Built by hand deliberately — the agent whose work it
grades must not also define it.

### Stage 1 — full extraction ✅ done

Every chapter's entities extracted, with per-chapter entry rules. All counts in
SPEC.md's entity model are asserted, alongside structural and referential-integrity
assertions; the unclaimed-text report is empty and emit is byte-identical across runs.

The item-power count resolved to **38**. The 38th, `Lightning`, is a heading that
starts *mid-paragraph*, which no lead-run classifier can see — see SPEC.md,
*Headings that start mid-paragraph*. Two hierarchy overrides were also needed
(Heroes, Item Powers), both recorded in SPEC.md.

Summoned creatures were not in the original entity model and were added here: 48
fantastic units, extracted from their summoning spells' effect text.

Extraction surfaced four places where the manual contradicts itself or writes in
shorthand; all are resolved and logged rather than silently repaired — see SPEC.md,
*Discrepancies report*. Two notation mappings supplied by the maintainer are recorded there too.

### Stage 2 — tables and verification

- Transcribe the three images to JSON. The difficulty GIF is ~70 × 9 with **no
  verification source**: transcribe in column chunks, verify row count and row
  labels in a separate pass, and mark the result machine-transcribed.
- Build the helptext / `UNITS.INI` join as a *verification* pass and emit
  `Manual/DISCREPANCIES.md`. Never let a discrepancy change what is presented.
- Seed that report with the manual-vs-itself conflicts Stage 1 found and resolved
  — they are listed in SPEC.md, *Discrepancies report*.

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
