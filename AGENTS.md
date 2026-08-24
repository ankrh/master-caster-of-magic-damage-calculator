Read [CLAUDE.md](./CLAUDE.md) and follow the project instructions defined there.

## Fidelity to the binaries, and structural change

The calculator computes stats the way the engines compute them. Where the code's structure and the
engine's control flow disagree, the engine wins — even where the calculator's shape is more
convenient, and even where both produce the same numbers today.

**The standing preference is the rewrite, not the local fix.** Propose the structural change
whenever it would leave the code leaner, more elegant, or a more direct model of the binary;
removing a known deviation is one such case, not the only one. Give an honest cost, but do not
default to recommending the cheaper workaround, and do not size a rewrite pessimistically to make
a bandaid look reasonable. If the user chooses the local fix, file what the rewrite would have been
in `Calculator/BACKLOG.md`.

Two things hide a deviation and are themselves defects: one written into `Calculator/SPEC.md` as
though it were the intended design, and one missing from that file's *Deliberate deviations*. On
finding a structure the engine does not have, check both before concluding it was chosen
deliberately.

## Approval gate for checks and reviews

Requests to **check, review, inspect, investigate, diagnose, or verify** are read-only.
Do not edit implementation code, tests, specifications, plans, queues, analysis notes, or
other project files unless the user explicitly asks for the changes to be implemented or
approves them after seeing the findings. If a check reveals a defect, report the evidence
and proposed fix first, then wait for approval before changing any file. A request to check
numbered verification-evidence items does not authorize resolving/removing those items or updating their
supporting documents.

**One exception, and it needs no approval.** When a tool or test fails because it constructs a
state real use cannot reach — a programmatic write that skips the events the page binds, an input
the code now requires and the harness never states — the defect is in the harness. Fix the harness
so it exercises the real path, and say so in the report. Never soften the code it exercises to
accommodate it, and never carry such a failure back as a decision for the user.

## Documentation discipline

Every policy, status, and finding has one owning document; other documents link to it instead of
restating it. Keep history and benchmark entries to outcomes and durable pointers, not process
transcripts. When changing instructions or project information, replace obsolete text and avoid net
growth unless a genuinely new rule or behavior requires it.

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

Implement `Calculator/BACKLOG.md` items directly: no execution method applies, and do not propose
one or launch subagents unless the user asks by name.

**Check the item's premise before implementing it.** A row's stated measurements, line numbers and
scope are a snapshot from when it was written and go stale as the code moves. Re-measure what the
row asserts. If the premise is falsified, correcting the row is part of the task — do not implement
text you have just shown to be wrong, and do not implement a scope the evidence no longer supports.

**Fixing an adjacent defect is preferred to filing one, within a bound.** Fix it in the same change
when all four hold: it is in code the item already touches; its correction is backed by a cited
source, not by inference; you add a preset that fails against the unfixed code and passes after, confirmed in the round's single `npm test` rather than by a suite run per fix; and it moves
no number in a version outside the item's declared `Versions` scope, measured rather than assumed.
Anything failing one of those is filed instead. Say in the `HISTORY.md` entry what was folded in and
why, so the scope growth stays visible; a fix that outgrows the item mid-change is a signal to stop
and report, not to keep going. Read `DERIVATION-REVIEW-PROTOCOL.md` in full
only when performing binary reconstruction, which always uses method 4 — two independent Codex
GPT-5.6 Sol High derivations, main-agent merge, then one Claude Opus 5 Medium review — or when the
user names one of its other methods. Do not load it otherwise.
