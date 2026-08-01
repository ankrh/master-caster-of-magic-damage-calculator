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

This repo runs two agents. You are **Codex**; Claude works the same tree. The protocol —
channels, review-entry format, the no-peek rule for derivation mode, and how disagreements are
recorded — is in `CLAUDE.md` § *Two agents*. Read it before writing a review or a derivation.

Your write channel is `.codex-review.md`. Never write to `.claude-review.md` or to Claude's
files under `.derivations/`, and never read a `.derivations/*.claude.md` file while your own
derivation of that item is unfinished.
