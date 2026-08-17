# Calculator execution, derivation, and review protocol

Read this file only when reconstructing binary code, or when the user has named one of the methods
below. Ordinary backlog work is **not** governed by it: no method applies, and no agent proposes
one. The main agent implements and verifies directly unless the user asks for something else.

| Method | Use |
|---|---|
| **4. Dual Codex derivation + Claude review** | Every binary-reconstruction execution package: two Codex GPT-5.6 Sol High agents derive the whole package independently, the main Codex agent merges them, and one Claude Opus 5 Medium session reviews the merged derivation before Codex revises and finishes the package. Method 1 is retired. |
| **2. Independent implementation** | Two Codex GPT-5.6 Sol High agents implement the same execution package cold. Use only when selected by the user or backlog row. |
| **3. Implementation + review/revision** | The implementation owner implements the execution package, then one Codex GPT-5.6 Sol High agent reviews and fixes it. In a direct run the current agent is the implementation owner; in a delegated run the launched implementation subagent is the owner. Use only when selected by the user or backlog row. |
| **3.1. Implementation + Luna and Opus review/revision** | The implementation owner implements the execution package, one Codex GPT-5.6 Luna subagent at Max reasoning reviews and fixes it, and then one Claude Opus 5 High session reviews and revises the post-Luna result. In a delegated run, the implementation subagent launches and owns both review rounds. Use only when selected by the user or backlog row. |
| **5. Delegated Opus implementation + Opus review/revision** | The orchestrator launches one Claude Opus 5 High implementer subagent per execution package; that subagent owns the implementation and launches one Claude Opus 5 High reviewer/reviser sub-subagent. The orchestrator may run several packages sequentially, one implementer each. Use only when selected by the user or backlog row. |

Every method here is opt-in. The one exception is method 4, which binary reconstruction always uses
without needing to be selected. If the user and backlog select different methods, follow the user.
Never substitute a different required model, effort, or method silently.

Methods 3, 3.1, and 5 are one structure — orchestrator, implementation owner, reviewer/reviser —
differing only in which models fill the roles and how many review rounds run. In a delegated run
they are structurally identical; only the casting changes.

## Rules shared by all methods

- An **execution package** is one or more related backlog items dispatched as one coordinated run.
  The user may define the package explicitly; otherwise a priority-queue row or one task packet
  that groups related items is one package. Before dispatch, freeze only the objective scope: its
  member IDs, case-preserving package key, applicable versions or binary targets, intended
  outcomes, and explicit out-of-scope boundaries. A one-item package uses that item's ID; a
  multi-item package uses the member IDs joined with underscores in their frozen order (for
  example, `B4_B5_B6`).
- Agent and paid-session counts are per execution package, never per member backlog item. Method 1
  is retired. Method 4 uses exactly two Codex GPT-5.6 Sol High derivation agents and one Claude
  Opus 5 Medium review session for the whole package; method 2 uses two implementer agents for the
  whole package; method 3 uses one reviewer/reviser; method 3.1 uses one Luna
  reviewer/reviser followed by one Opus review/revision session for the whole package; and method 5
  uses one Opus 5 High implementer plus one Opus 5 High reviewer/reviser for the whole package. Do
  not multiply agents, sessions, derivations, or reviews merely because the package contains several
  IDs.
- If a proposed package is too broad for one pair of tracks, narrow or split it before dispatch and
  obtain the user's approval for the new package boundaries. State that a split increases agent or
  paid-session count. Never silently split a package after work begins.
- Follow the branch and worktree approval gate in `AGENTS.md`. Method selection is not branch
  approval. Methods 3, 3.1, 4, and 5 normally run on `main`; method 2 requires two approved
  temporary branches and worktrees.
- Acceptance criteria are a living completion checklist, not a frozen boundary. Every agent and
  reviewer must look for missing or incorrect criteria and may add, clarify, or strengthen them
  when evidence shows that doing so better accomplishes the objective. Record each change and its
  rationale in the task packet or review artifact before relying on it, and give every later track
  the current checklist. Never silently weaken or remove a criterion: propose the change with
  evidence, and require the current agent to record an explicit disposition. A criterion stated
  explicitly by the user is part of the objective boundary and requires user approval to change.
- Evidence, dependencies, affected files, implementation approach, documentation, and tests are
  also not frozen. Agents and reviewers may inspect additional evidence, follow newly discovered
  dependencies, and add or change any implementation, documentation, or tests required to satisfy
  the frozen objective scope and current acceptance criteria. None of those actions widens the
  package unless it changes the member IDs, applicable versions or binary targets, intended
  outcomes, or explicit out-of-scope boundaries. Report and obtain user approval before making
  such an objective-scope change.
- `Calculator/BACKLOG.md` owns the item-level version-scope rule. Repeat that scope in the
  objective packet and state it clearly in every user-facing task summary or completion report in
  chat.
- Preserve unrelated user changes. Never push as part of these methods.
- An implementation is incomplete if required behavior, tests, specification, or migration work is
  missing.
- Every calculator change must explain its before-and-after state in the task packet and review
  handoff. In the user-facing completion report, give each changed mechanic or backlog member its
  own comparison block with a Markdown table using `State`, `Versions`, and `Behavior` columns. The
  block starts with one or more `Unchanged` rows which together cover every unaffected calculator
  version, followed by `Before` and then `After` rows for the exact affected calculator versions.
  Split a state across multiple rows when its versions have different behavior; group versions only
  when their behavior in that state is identical. Every row states the actual mechanic behavior; do
  not use `Unchanged` by itself as the behavior description or substitute vague phrases such as
  "legacy behavior." Use a concrete scenario or value when behavior changes, and say explicitly
  when the mechanic does not exist in a version. For a refactor or documentation-only change, name
  the affected versions and state the actual behavior preserved in each applicable version group.
- When a calculator item completes, remove it from `Calculator/BACKLOG.md` and add a concise result
  to `Calculator/HISTORY.md` in the same change.

Raw-binary work is allowed only inside a dedicated reconstruction backlog item. Any other task
that reaches missing binary evidence must leave the claim `UNVERIFIED`, create or propose a
separate reconstruction item with a bounded target and owning artifacts, and record the dependency.
An informal disassembly observation is not implementation evidence.

## Method 4: dual Codex derivation plus Claude review

### Scope and artifacts

A reconstruction item names the executable/build, routine or table, address extent, evidence
directory, and owning source-shaped file. Prefer one natural unit and no more than roughly 1,000
instructions per item. If the extent is unknown, scope a locate-and-bound item first. Freeze the
objective scope before launching either derivation agent. A package may contain several such
bounded items; both cold tracks receive and complete the same full package.

Use the frozen, case-preserving package key:

| Artifact | Name | Writer |
|---|---|---|
| Sol High A derivation | `.derivations/<PACKAGE>.sol-high-a.md` | Sol High A only |
| Sol High B derivation | `.derivations/<PACKAGE>.sol-high-b.md` | Sol High B only |
| Merged Codex derivation | `.derivations/<PACKAGE>.codex.md` | Main Codex agent |
| Mechanical Claude review bundle | `.derivations/<PACKAGE>.claude-review-bundle.md` | Main Codex agent, from deterministic read-only tooling |
| Claude review of merged Codex derivation | `.reviews/<PACKAGE>.review-of-codex.md` | Claude Opus 5 only |
| Merged evidence | `<evidence directory>/<PACKAGE>.evidence.md` | Merger |

Derivation, review-bundle, and review files are gitignored scratch. The merged evidence and
source-shaped body are committed. Never use unscoped filenames or let two writers edit the same
scratch file.

### Agent and Claude-session ownership

The main Codex agent launches exactly two subagents for the package, both with model
`gpt-5.6-sol`, High effort, no inherited conversation, and the same self-contained objective
packet.
Label them **Sol High A** and **Sol High B**. They may use shared read-only helper tooling but may
not inspect each other's files, messages, or results before both initial derivations are complete,
and may not spawn further agents. The main agent coordinates and merges; it is not a third cold
derivation track.

Only after the main agent has merged the two Codex derivations, run the applicable derivation
checker, and generated the mechanical review bundle does it invoke Claude through the Claude CLI.
Create exactly one new package-specific Claude session using Claude Opus 5 at Medium effort, capture
its session ID, and ask it for one review of the merged Codex derivation against the objective packet,
bundle, and raw binary. Claude writes only the package review; it does not create a competing
derivation or edit the merged artifact.

If that Claude process is interrupted, resume the exact recorded session rather than replacing it.
If the session cannot be resumed, report the failure and stop the review track. Restarting it
requires explicit user approval. Method 4 has no routine second Claude pass: Codex revises from the
single review and requests another paid Claude turn only when the user explicitly asks.

Invoke the `claude` CLI resolved from `PATH`. Launch every package review with
`--dangerously-skip-permissions` (or the SDK-equivalent `bypassPermissions` mode) under the user's
explicit authorization for this project. Keep the available tool surface limited to `Read`,
`Glob`, `Grep`, `PowerShell`, `Bash`, `Write`, and `Edit`. On Windows, enable the native
PowerShell tool and make it the primary shell for Windows paths and native executables; retain Bash
for POSIX-oriented repository tooling. The review prompt keeps both shells read-only and permits
`Write` and `Edit` only for `.reviews/<PACKAGE>.review-of-codex.md`. Bypassing approval prompts does
not widen the review task.

Claude's project trust lookup is path-string-sensitive on this host and normalizes Windows project
keys to forward slashes before consulting `%USERPROFILE%\.claude.json`. The selectable key for this
checkout is exactly `C:/CoM2-damage-calculator`; verify that it has
`hasTrustDialogAccepted: true` before invocation. If `exec_command` returns a live session ID, poll
that exact process to completion before declaring preflight failure or starting another session.

```powershell
Get-Command claude -ErrorAction Stop
claude --version
claude auth status
# Add to the package invocation:
$env:CLAUDE_CODE_USE_POWERSHELL_TOOL = '1'
# claude --dangerously-skip-permissions `
#   --tools Read Glob Grep PowerShell Bash Write Edit ...
```

Those preflight commands are local-only; if they do not reach a model, report zero Claude token
usage under the usage-analysis rule below.

### Mechanical review bundle and Claude tool use

The main agent generates the review bundle from the binaries named by the objective scope, merged
coverage ledgers, and repository sources using deterministic read-only commands. It is an evidence
index, not another interpretive derivation. Include the exact commands and their bounded outputs
for:

- binary identities and build mapping;
- raw bytes and disassembly for every assigned extent;
- semantic conditional branches, calls, named-field writes, and every incoming or outgoing edge;
- switch-table entries, external records, structure layouts, and constants on which the merged
  claims depend;
- the applicable checker commands and complete results; and
- a discovery frontier of referenced call targets, branch targets, data producers/consumers,
  undefined locals or globals, and other dependencies outside the assigned extents.

Claude treats the bundle as its primary evidence source, never as a closed universe. Its review
prompt must preserve permission to inspect any additional binary code or data that may materially
affect a finding, coverage claim, build difference, or completion verdict. Examples include an
unexplained local or global, an incoming or outgoing control-flow edge, an unresolved call target,
a questionable table binding, or a producer/consumer relationship outside the bundle.

Claude keeps `Read`, `Glob`, `Grep`, read-only `PowerShell`, read-only `Bash`, `Write`, and `Edit`
available. `Write` and `Edit` are exclusively for creating and revising the package's single review
artifact; Claude must not create scratch scripts or alter any other file. Prefer `Glob`/`Grep` for
repository discovery and PowerShell for Windows-native paths and executables; use Bash for bounded
POSIX-oriented commands. Claude should minimize separate tool-use round trips when the bundle
already answers a question, collect currently known unanswered questions before calling tools, and
batch related bounded inspections where practical. It must not avoid important dependency-driven
exploration merely to save usage, and it must not replace many small calls with one unbounded output
dump. A supplemental tool inspection should pursue a stated hypothesis whose result could change
the review. Do not impose a routine `--max-turns` cap; Claude uses its own judgment to decide when
the evidence is complete.

### Claude usage analysis

After every Claude CLI invocation, including an interrupted invocation or a resume, the main agent
analyzes that invocation before continuing. Prefer the structured CLI result and confirm it against
the persisted session transcript. Transcript streaming may repeat one assistant message, so count
each assistant `message.id` usage object and each `tool_use.id` only once.

Report in the next user update and the final completion summary:

- whether the invocation reached the model or stopped during local preflight;
- actual session ID, model, effort, wall time, and completion/interruption status;
- unique model inference messages and tool-use calls, with tool counts by kind;
- ordinary input, cache-creation input, cache-read input, and output tokens, plus their sum; and
- whether the pattern was proportionate to the review or showed avoidable repeated searches,
  oversized outputs, or context churn.

For a resumed session, report both the new invocation and the cumulative session totals. A local
preflight failure that made no model request is zero Claude token usage. Keep this process accounting
in chat and scratch only; durable evidence and history remain outcome records, not usage transcripts.
Label the token sum as raw processed token-events, distinguish it from new content by also reporting
the total without cache reads, and do not infer a subscription-window percentage from token fields
unless the provider supplies that mapping.

### Workflow

1. The main Codex agent freezes the objective scope: member IDs and package key, exact binary
   builds and calculator versions, routines/tables and address extents, intended outcomes, and
   explicit out-of-scope boundaries. It records the initial acceptance criteria, known evidence
   directories, owning source-shaped files, dependencies, documentation, implementation, and tests
   as starting context, not as frozen boundaries.
2. The main agent launches Sol High A and Sol High B as defined above. Each independently derives
   every target in the package directly from the raw binary, writes only its own derivation file,
   and runs the applicable checker. Neither sees prior reconstruction conclusions or the other
   track before both are complete.
3. After both initial derivations complete, the main agent merges their union into the package's
   Codex derivation. It resolves differences by re-reading and quoting the bytes rather than by
   choosing a preferred author, preserves any unresolved disagreement explicitly, reruns the
   applicable checker, and generates the mechanical Claude review bundle.
4. The main agent launches the package's single Claude Opus 5 Medium review session with the merged
   derivation, objective packet, and mechanical bundle. A review finding is actionable only when it
   identifies the address, quotes the relevant instruction bytes, and explains the semantic
   consequence. Claude records findings in the package review file. After the invocation ends, the
   main agent performs and reports the required usage analysis before revising from the review.
5. The main agent verifies every review finding against the bytes, revises the Codex derivation for
   accepted findings, and records an evidence-based response beneath any disputed finding. Copy
   every surviving substantive disagreement into a backlog Q row with both readings and the code
   site.
6. The main agent reruns the checker, writes durable findings and source-shaped code from the
   revised derivation, finishes any scoped implementation/specification/tests, clears resolved
   package scratch, closes every completed member backlog row, and records short history entries.

### Evidence and completion gate

Each cold Sol derivation contains checkable evidence, not mechanic findings or recommendations.
Put local observations beside the relevant source-shaped code; reserve conclusions for the merged
artifact. Agreement is not proof: resolve different readings by re-reading and quoting the bytes,
not by confidence or concession.

Each build has its own complete, contiguous, non-overlapping coverage ledger. Every assigned byte
is classified as:

- `reconstructed`: represented in the source-shaped body;
- `compiler-only`: checks, address calculation, or routine scaffolding; or
- `unresolved`: bounded work still missing, which keeps the derivation in progress.

Each Sol derivation and the final revised Codex derivation represent every semantic conditional
branch, loop, call, return, branch-affecting read, and state write. Each explicitly reports:

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
3. After approval, create `codex/<PACKAGE>-sol-high-a` and
   `codex/<PACKAGE>-sol-high-b` from that commit.
   Reserve the primary checkout for integration; do not create an integration branch.
4. Assign separate free test ports (normally 8081 and 8082; integration uses 8080). Do not share
   servers, caches that write into worktrees, or `PLAYWRIGHT_REUSE_EXISTING=1`.

### Implement, review, revise

1. Each agent independently implements the complete packet, runs its checks, and commits locally.
   Until both initial commits exist, neither agent may inspect the other's worktree, branch, diff,
   answer, or review.
2. Each then reviews the other's base-to-tip diff and writes once:
   `.reviews/<PACKAGE>.review-of-sol-high-a.md` or
   `.reviews/<PACKAGE>.review-of-sol-high-b.md`, named for the implementation under review.
3. A review finding identifies a file and line or symbol, observable failure or maintainability
   risk, and supporting evidence or test. Preference is not a finding.
4. Each author fixes or concretely disputes every finding on their own branch, reruns checks, and
   commits the revision.

### Integrate and finish

Compare both revised results against the current acceptance criteria. Select one as the base or
combine material elements, explaining the evidence for the choice. Integrate directly into the
original clean `main`; do not mechanically merge both branches.

Run all applicable checks, commit locally, and then verify the commit is reachable from `main`.
Stop every temporary server, confirm assigned ports are free, remove the exact temporary
worktrees and branches, clear resolved review files, and leave the primary checkout clean on
`main`. Cleanup is part of completion.

Record one compact row in `DUAL-AGENT-BENCHMARK.md`: package/date, exact models, initial winner,
most useful review, selected integration base, material contribution from the other branch, final
commit/checks, active time per agent, and cleanup result. Missing timing is `not recorded`; do not
infer active time from commits. Keep parallel and orchestrator time separate.

The user-facing result reports the same comparison and confirms cleanup and that nothing was
pushed. Quality judgments cite concrete defects avoided, tests added, requirements covered, or
simpler design—not model identity, confidence, or speed alone.

### Delegated sequential backlog execution

When the user instructs the coordinator to **sequentially launch subagents** to perform backlog
packages, each launched subagent is the implementation owner for its one frozen package. The
implementation owner—not the coordinator—implements the package and launches the required review
subagent or subagents. For method 3.1, that owner launches exactly one Codex GPT-5.6 Luna Max
reviewer/reviser followed by exactly one Claude Opus 5 High review/revision session; for method 5 it
launches exactly one Claude Opus 5 High reviewer/reviser. In both cases the owner records the
required artifacts and findings, and reruns the applicable checks. The coordinator only sequences
the packages, monitors each implementation owner, verifies the completed handoff, and launches
the next implementation owner after the prior package is complete. This delegation rule changes
ownership, not the method's required models, review count, frozen scope, or evidence obligations.
Do not consider an implementation or review subagent stalled merely because it is silent or a wait
times out. Allow up to 120 minutes of continuous runtime from launch or resumption before declaring
it stalled. At that threshold, inspect and preserve its shared-checkout changes, request a
checkpoint where possible, and only then decide whether to close or re-dispatch it.

## Method 3: implementation plus review/revision

1. The implementation owner implements the complete execution package on `main`, updates
   specification and tests, and runs the applicable checks.
2. The implementation owner launches one Codex GPT-5.6 Sol High reviewer/reviser, which reviews
   the whole package, evidence, diff, and tests;
   directly fixes every issue it finds in the shared checkout; and reruns the checks. It is a
   reviewer/reviser, not a cold competing implementation.
3. The implementation owner verifies the revised result and closes each completed member's
   backlog/history state. If final verification finds a substantive defect, return it to the same
   reviewer/reviser before closing.

Method 3 is not benchmarked unless the user explicitly asks.

## Method 3.1: implementation plus Luna and Opus review/revision

1. The implementation owner performs Method 3 step 1.
2. The implementation owner launches one Codex GPT-5.6 Luna subagent at Max reasoning to review
   and revise the whole package exactly as the Sol High reviewer/reviser does in Method 3 step 2.
3. After the Luna round is complete, the implementation owner creates
   `.reviews/<PACKAGE>.review-of-luna.md` and invokes exactly one new package-specific Claude
   Opus 5 session at High effort. Claude reviews the whole post-Luna package, evidence, diff, and tests;
   records every concrete finding in that review artifact before changing implementation files;
   directly fixes every issue it confirms within the frozen objective scope; records each finding's
   disposition; and reruns the applicable checks. If it finds no issue, it records that result and
   the evidence and checks it examined. This is a reviewer/reviser round, not a cold competing
   implementation.
4. The Claude session follows the CLI, project-trust, interruption/resume, and usage-analysis rules
   defined for Method 4, except that it uses High effort and `Write` and `Edit` are allowed only for
   the Method 3.1 review artifact and files required to satisfy the frozen objective scope.
5. The implementation owner verifies the twice-revised result and closes each completed member's
   backlog/history state. If final verification finds a substantive defect, return it to the same
   Opus session before closing.

The user-facing completion report summarizes the Opus findings and fixes that remained after the
Luna round so the run tests Luna's review performance. Keep detailed process accounting in chat and
the scratch review artifact; do not add Method 3.1 runs to `DUAL-AGENT-BENCHMARK.md` unless the user
explicitly asks.

## Method 5: delegated Opus implementation plus Opus review/revision

1. The orchestrator freezes the objective scope for one execution package and launches exactly one
   Claude Opus 5 High implementer subagent with a self-contained task packet and no inherited
   conversation. The orchestrator coordinates, monitors, and verifies the handoff; it does not
   implement, review, or act as a second implementation track.
2. That implementer subagent is the package's implementation owner. It implements the complete
   package on `main`, updates specification and tests, and runs the applicable checks.
3. The implementation owner then launches exactly one Claude Opus 5 High reviewer/reviser
   sub-subagent, which reviews the whole package, evidence, diff, and tests; records every concrete
   finding in `.reviews/<PACKAGE>.review-of-opus-implementer.md` before changing implementation
   files; directly fixes every issue it confirms within the frozen objective scope; records each
   finding's disposition; and reruns the applicable checks. If it finds no issue, it records that
   result and the evidence and checks it examined. It is a reviewer/reviser, not a cold competing
   implementation, and it may not spawn further agents.
4. The implementation owner verifies the revised result, closes each completed member's
   backlog/history state, and reports the package outcome to the orchestrator. If final verification
   finds a substantive defect, return it to the same reviewer/reviser before closing.

The review artifact is gitignored scratch; clear it once the package is closed.

The orchestrator may run several backlog packages sequentially, one implementer subagent per
package, launching the next only after the prior package's handoff is verified. Agent counts stay
per package: one implementer and one reviewer/reviser each, regardless of how many packages the run
covers or how many members a package holds. Sequential packages share the primary checkout on
`main`, so a package must be complete with green checks before the next launches; running packages
concurrently would require approved branches and worktrees under `AGENTS.md`. The delegated
sequential rules above, including the 120-minute stall threshold, apply.

Method 5 is not benchmarked unless the user explicitly asks.
