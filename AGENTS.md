Read [CLAUDE.md](./CLAUDE.md) and follow the project instructions defined there.

## Approval gate for checks and reviews

Requests to **check, review, inspect, investigate, diagnose, or verify** are read-only.
Do not edit implementation code, tests, specifications, plans, queues, analysis notes, or
other project files unless the user explicitly asks for the changes to be implemented or
approves them after seeing the findings. If a check reveals a defect, report the evidence
and proposed fix first, then wait for approval before changing any file. A request to check
numbered verification-evidence items does not authorize resolving/removing those items or updating their
supporting documents.

Instructions are split by directory and are **not** all loaded automatically — read the ones covering the code you are touching:
- `Calculator/CLAUDE.md` + `Calculator/SPEC.md` — the damage calculator.
- `Manual/SPEC.md` + `Manual/PLAN.md` — the interactive CoM2 manual (spec, then stages/status).

When editing text that contains non-ASCII characters such as `→`, prefer `apply_patch` over PowerShell write/replace commands because `apply_patch` has preserved UTF-8 correctly in this repo.

## Dual-agent implementation, derivations and cross-agent reviews

Before implementing any `Calculator/BACKLOG.md` item, or when asked to perform binary derivation
or cross-agent review work, read `DERIVATION-REVIEW-PROTOCOL.md` in full. Do not load it for other
ordinary tasks.
