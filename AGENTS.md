Read [CLAUDE.md](./CLAUDE.md) and follow the project instructions defined there.

## Approval gate for checks and reviews

Requests to **check, review, inspect, investigate, diagnose, or verify** are read-only.
Do not edit implementation code, tests, specifications, plans, queues, analysis notes, or
other project files unless the user explicitly asks for the changes to be implemented or
approves them after seeing the findings. If a check reveals a defect, report the evidence
and proposed fix first, then wait for approval before changing any file. A request to check
numbered verification-evidence items does not authorize resolving/removing those items or updating their
supporting documents.

## Branch and worktree approval

Work directly on `main` by default. An agent must **never create a branch** unless it first tells
the user why a branch is necessary, gives the exact proposed branch and worktree names and the
cleanup plan, and receives explicit approval. A request to implement work, use multiple agents, or
follow a backlog execution method is not branch approval. Do not create the branch while waiting
for the answer.

Any approved agent-created branch is temporary. Before the agent finishes the task, it must put
the accepted work on `main`, remove its temporary worktrees and branches, and verify that the
primary checkout is on `main` with no agent-created uncommitted work, unless the user explicitly
asks to retain a named branch. Preserve unrelated user changes. Never leave an integration or
handoff branch for the user to clean up.

Instructions are split by directory and are **not** all loaded automatically — read the ones covering the code you are touching:
- `Calculator/CLAUDE.md` + `Calculator/SPEC.md` — the damage calculator.
- `Manual/SPEC.md` + `Manual/PLAN.md` — the interactive CoM2 manual (spec, then stages/status).

When editing text that contains non-ASCII characters such as `→`, prefer `apply_patch` over PowerShell write/replace commands because `apply_patch` has preserved UTF-8 correctly in this repo.

## Task execution, derivations and cross-agent reviews

Before implementing any `Calculator/BACKLOG.md` item, performing binary reconstruction, or doing
cross-agent review work, read `DERIVATION-REVIEW-PROTOCOL.md` in full. Binary reconstruction always
uses its Claude + Codex dual-agent derivation method. An implementation uses the dual-implementation
or single-implementation-plus-review method only when the user requests it or the backlog item
already records that preference. Do not load the protocol for other ordinary tasks.
