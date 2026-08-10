# Calculator execution, derivation, and review protocol

Read this file only before implementing a `Calculator/BACKLOG.md` item, reconstructing binary
code, or doing cross-agent review work.

| Method | Use |
|---|---|
| **1. Independent derivation** | Every binary reconstruction: one cold Claude read and one cold Codex read, reciprocal review, then merge. |
| **2. Independent implementation** | Two Codex GPT-5.6 Sol High agents implement the same item cold. Use only when selected by the user or backlog row. |
| **3. Implementation + review/revision** | The current agent implements, then one Codex GPT-5.6 Sol High agent reviews and fixes it. Use only when selected by the user or backlog row. |

If the user and backlog select different implementation methods, follow the user. If neither
selects one, ask before reading implementation code. Never substitute a different required model,
effort, or method silently.

## Rules shared by all methods

- Follow the branch and worktree approval gate in `AGENTS.md`. Method selection is not branch
  approval. Methods 1 and 3 normally run on `main`; method 2 requires two approved temporary
  branches and worktrees.
- Freeze the task's scope, dependencies, acceptance criteria, required documentation, and tests
  before dispatching another agent. New discoveries do not silently widen the task.
- Preserve unrelated user changes. Never push as part of these methods.
- An implementation is incomplete if required behavior, tests, specification, or migration work is
  missing.
- When a calculator item completes, remove it from `Calculator/BACKLOG.md` and add a concise result
  to `Calculator/HISTORY.md` in the same change.

Raw-binary work is allowed only inside a dedicated reconstruction backlog item. Any other task
that reaches missing binary evidence must leave the claim `UNVERIFIED`, create or propose a
separate reconstruction item with a bounded target and owning artifacts, and record the dependency.
An informal disassembly observation is not implementation evidence.

## Method 1: independent binary derivation

### Scope and artifacts

A reconstruction item names the executable/build, routine or table, address extent, evidence
directory, and owning source-shaped file. Prefer one natural unit and no more than roughly 1,000
instructions. If the extent is unknown, scope a locate-and-bound item first. Preparing the item and
deriving it happen in separate conversations.

Use the exact, case-preserving backlog ID:

| Artifact | Name | Writer |
|---|---|---|
| Claude derivation | `.derivations/<ID>.claude.md` | Claude only |
| Codex derivation | `.derivations/<ID>.codex.md` | Codex only |
| Review of Claude | `.reviews/<ID>.review-of-claude.md` | Codex, then Claude owns responses |
| Review of Codex | `.reviews/<ID>.review-of-codex.md` | Claude, then Codex owns responses |
| Merged evidence | `<evidence directory>/<ID>.evidence.md` | Merger |

Derivation and review files are gitignored scratch. The merged evidence and source-shaped body are
committed. Never use unscoped filenames or let two writers edit the same scratch file.

### Workflow

1. Claude and Codex independently reconstruct the frozen target without opening, searching, or
   learning the other's result. Shared helper tooling is allowed; another derivation is not.
2. Each reviews the other's derivation once. A finding is actionable only when it identifies the
   address, quotes the relevant instruction bytes, and explains the semantic consequence.
3. Each author fixes accepted findings in their own derivation. Delete resolved review entries;
   reply beneath disputed entries with agent, date, and evidence-based reason.
4. Before clearing a review, copy every surviving disagreement into a backlog Q row with both
   readings and the code site.
5. On the maintainer's merge request, merge the union rather than choosing a winner document.
   Disputed readings remain explicitly disputed and become Q rows.
6. Write findings once, during merge, from the combined reconstruction. Then update the owning
   analysis/specification, clear this ID's scratch files, close the backlog row, and record a short
   history entry. The merge request is approval to close the scoped item.

### Evidence and completion gate

A cold derivation contains checkable evidence, not mechanic findings or recommendations. Put local
observations beside the relevant source-shaped code; reserve conclusions for the merged artifact.
Agreement is not proof: resolve different readings by re-reading and quoting the bytes, not by
confidence or concession.

Each build has its own complete, contiguous, non-overlapping coverage ledger. Every assigned byte
is classified as:

- `reconstructed`: represented in the source-shaped body;
- `compiler-only`: checks, address calculation, or routine scaffolding; or
- `unresolved`: bounded work still missing, which keeps the derivation in progress.

A complete derivation represents every semantic conditional branch, loop, call, return,
branch-affecting read, and state write. It explicitly reports:

```text
unresolved ranges: 0
synthetic helpers without bodies: 0
semantic conditional jumps omitted: 0
semantic calls omitted: 0
state writes omitted: 0
```

Every conditional branch states its target and what lies there. Quote complete arithmetic idioms,
including correction instructions; Delphi and Borland C++ 1991 idioms are not interchangeable.
Run the applicable checker after reading its docstring:

- `tools/verify_derivation.py` for `Caster.exe`;
- `tools/verify_dos_derivation.py` for DOS builds.

The checkers validate coverage structure and citations, not semantic interpretation.

## Method 2: two independent implementations

The orchestrator and both implementer/reviewers use Codex GPT-5.6 Sol at High effort. The
orchestrator coordinates and integrates; it is not a third competitor.

### Setup

1. Obtain the separate branch/worktree approval required by `AGENTS.md`, naming both proposed
   branches, absolute worktree paths, base commit, and cleanup plan.
2. Require a clean `main`, record its commit, and give both agents the same self-contained task
   packet with no inherited conversation. Label them **Sol High A** and **Sol High B**.
3. After approval, create `codex/<ID>-sol-high-a` and `codex/<ID>-sol-high-b` from that commit.
   Reserve the primary checkout for integration; do not create an integration branch.
4. Assign separate free test ports (normally 8081 and 8082; integration uses 8080). Do not share
   servers, caches that write into worktrees, or `PLAYWRIGHT_REUSE_EXISTING=1`.

### Implement, review, revise

1. Each agent independently implements the complete packet, runs its checks, and commits locally.
   Until both initial commits exist, neither agent may inspect the other's worktree, branch, diff,
   answer, or review.
2. Each then reviews the other's base-to-tip diff and writes once:
   `.reviews/<ID>.review-of-sol-high-a.md` or
   `.reviews/<ID>.review-of-sol-high-b.md`, named for the implementation under review.
3. A review finding identifies a file and line or symbol, observable failure or maintainability
   risk, and supporting evidence or test. Preference is not a finding.
4. Each author fixes or concretely disputes every finding on their own branch, reruns checks, and
   commits the revision.

### Integrate and finish

Compare both revised results against the frozen acceptance criteria. Select one as the base or
combine material elements, explaining the evidence for the choice. Integrate directly into the
original clean `main`; do not mechanically merge both branches.

Run all applicable checks, commit locally, and then verify the commit is reachable from `main`.
Stop every temporary server, confirm assigned ports are free, remove the exact temporary
worktrees and branches, clear resolved review files, and leave the primary checkout clean on
`main`. Cleanup is part of completion.

Record one compact row in `DUAL-AGENT-BENCHMARK.md`: task/date, exact models, initial winner,
most useful review, selected integration base, material contribution from the other branch, final
commit/checks, active time per agent, and cleanup result. Missing timing is `not recorded`; do not
infer active time from commits. Keep parallel and orchestrator time separate.

The user-facing result reports the same comparison and confirms cleanup and that nothing was
pushed. Quality judgments cite concrete defects avoided, tests added, requirements covered, or
simpler design—not model identity, confidence, or speed alone.

## Method 3: implementation plus review/revision

1. The current agent implements the complete task on `main`, updates specification and tests, and
   runs the applicable checks.
2. One Codex GPT-5.6 Sol High subagent reviews the task, evidence, diff, and tests; directly fixes
   every issue it finds in the shared checkout; and reruns the checks. It is a reviewer/reviser,
   not a cold competing implementation.
3. The current agent verifies the revised result and closes the backlog/history state. If final
   verification finds a substantive defect, return it to the same reviewer/reviser before closing.

Method 3 is not benchmarked unless the user explicitly asks.
