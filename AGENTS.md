Read [CLAUDE.md](./CLAUDE.md) and follow the project instructions defined there.

## Approval gate for checks and reviews

Requests to **check, review, inspect, investigate, diagnose, or verify** are read-only.
Do not edit implementation code, tests, specifications, plans, queues, analysis notes, or
other project files unless the user explicitly asks for the changes to be implemented or
approves them after seeing the findings. If a check reveals a defect, report the evidence
and proposed fix first, then wait for approval before changing any file. A request to check
numbered queue items does not authorize resolving/removing those items or updating their
supporting documents.

Instructions are split by directory and are **not** all loaded automatically — read the ones covering the code you are touching:
- `Calculator/CLAUDE.md` + `Calculator/SPEC.md` — the damage calculator.
- `Manual/SPEC.md` + `Manual/PLAN.md` — the interactive CoM2 manual (spec, then stages/status).

When editing text that contains non-ASCII characters such as `→`, prefer `apply_patch` over PowerShell write/replace commands because `apply_patch` has preserved UTF-8 correctly in this repo.

## Cross-agent channels

This repo runs two agents. You are **Codex**; Claude works the same tree. The full protocol —
the five-step derivation flow, the evidence rule, the completion gate, merging, and how
disagreements are recorded — is in `CLAUDE.md` § *Two agents*. **Read that section in full before
writing a review or a derivation**; the summary below is a pointer, not a substitute.

**Review files are named for the agent under review, not the author.**

- `.review-of-claude.md` — *you* write it, reviewing Claude's work. Once written, it is Claude's
  file: Claude deletes the entries it fixes and annotates the ones it disputes. Do not touch it
  again in that round.
- `.review-of-codex.md` — *Claude* writes it, reviewing your work. It is **your** file thereafter:
  work through it, fix and delete what you agree with, and leave what you dispute with a reply
  line `— Codex, <YYYY-MM-DD>: <reason>`. Never silently drop an entry.

When AKH asks you for a new review, clear the existing content of `.review-of-claude.md` first —
but only after every disagreement still standing in it exists as a Q row in
`Calculator/BACKLOG.md`. Clearing is otherwise a silent deletion of evidence.

Write your derivations to `.derivations/<ID>.codex.md`. **Never read `.derivations/*.claude.md`
while your own derivation of that item is unfinished** — not even to check formatting. Shared
tools under `tools/` are fair game for either agent to write and refine; tooling is not an answer.

Three rules that carry most of the weight, all learned from the R5.1b failure:

- **A review entry is only actionable if it cites an address and quotes the instruction bytes
  there.** A disagreement is settled by both agents re-reading that address and quoting what they
  see — not by argument. Concede to verified evidence, never to assertion.
- **Every conditional branch in a derivation must carry its target address and what lies at it.**
  Citing only the test address hides mis-read branch targets, which is how four of five R5.1b
  errors survived review.
- `tools/verify_derivation.py <Caster.exe> <doc.md>` checks citation coverage, not correctness. A
  clean run is necessary, not sufficient — all five R5.1b errors passed it.
