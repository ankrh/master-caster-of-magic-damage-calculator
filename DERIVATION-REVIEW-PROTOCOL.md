# Calculator task execution, derivation and review protocol

Read this file before implementing any `Calculator/BACKLOG.md` item, performing binary
reconstruction, or doing other cross-agent review work. It is the single home for the project's
three execution methods:

| Method | Agents | When to use it |
|---|---|---|
| **1. Dual-agent derivation** | Claude + Codex, independently | Every binary reconstruction task |
| **2. Dual-agent implementation** | Codex GPT-5.6 Sol High + Codex GPT-5.6 Sol High, independently | Only when the user requests it or the backlog item records this preference |
| **3. Current-agent implementation + Sol High review/revision** | The current agent, regardless of model, then one Codex GPT-5.6 Sol High reviewer/reviser | Only when the user requests it or the backlog item records this preference |

The methods are distinct. Derivation produces independent evidence reads. Dual implementation
produces competing executable changes. Current-agent implementation plus review/revision produces
one executable change which a Sol High subagent checks and improves, not a second implementation.
Never substitute one method's completion gate for another's.

For implementation work, the user's explicit request overrides a backlog preference. If neither
the request nor the backlog row selects method 2 or method 3, stop and ask which method to use
before reading implementation code or creating a worktree. Neither implementation method is a
default. If a required agent, model or effort is unavailable, stop and tell the user; never
silently substitute another configuration.

## Method 1 — Claude and Codex reconstruct binaries independently

Binary source reconstruction is performed **only** under a dedicated reconstruction item in
`Calculator/BACKLOG.md`. An implementation, provenance, verification, defect, review, or other
task may read and cite address-backed reconstructions already checked into the repository, but it
must not incidentally disassemble a missing extent, create or extend a reconstructed source body,
or extract an unrecorded binary table row in order to finish its own scope.

When any non-reconstruction task discovers that completion requires binary source which has not
yet been reconstructed, every agent must stop that part of the task at the checked-in evidence
boundary and surface the dependency. The orchestrating agent must, before integrating or closing
the originating task:

1. leave the affected claim or formula UNVERIFIED and make no behavior change from an informal
   raw-binary observation;
2. create one or more dedicated reconstruction rows in `Calculator/BACKLOG.md` rather than hiding
   the work inside the originating item;
3. name each dependent formula/mechanic, executable and build, known routine/symbol and address
   extent, and the owning reconstruction/evidence artifact; if the extent is not already known,
   create a locate-and-bound reconstruction row instead of opening the binary during the current
   task; and
4. make the originating backlog row and any dependent defect rows point to the new reconstruction
   ID or IDs.

A dedicated reconstruction row is the authorization boundary for opening the raw binary and
writing address-backed source or binary-table evidence. It must have a frozen target and
acceptance gate before reconstruction begins. Every such row uses method 1 under the derivation
rules below: one cold Claude derivation, one cold Codex derivation, reciprocal review, and merge.
Discovery of a reconstruction dependency never widens the current task's scope.

### Derivation artifact names and ownership

Every derivation item uses its exact `Calculator/BACKLOG.md` ID in all artifact names. New items
must use the names below; historical artifacts are not renamed. Derivation and review files are
gitignored scratch. The merged evidence artifact is committed in the evidence directory named by
the backlog row, while the merged source-shaped body goes to the row's separately named owning
source file.

| Artifact | Exact name | Subject | Written by | Owned after writing by |
|---|---|---|---|---|
| Cold derivation | `.derivations/<ID>.claude.md` | Claude's independent evidence | Claude | Claude |
| Cold derivation | `.derivations/<ID>.codex.md` | Codex's independent evidence | Codex | Codex |
| Reciprocal review | `.reviews/<ID>.review-of-claude.md` | Claude's derivation | Codex | Claude |
| Reciprocal review | `.reviews/<ID>.review-of-codex.md` | Codex's derivation | Claude | Codex |
| Merged evidence | `<owning evidence directory>/<ID>.evidence.md` | Union, findings, ledgers, counts and disputes | Merger | Repository |

`<ID>` is literal and case-preserving: for example, `R9-G1a-R1` produces
`.derivations/R9-G1a-R1.claude.md`, `.reviews/R9-G1a-R1.review-of-codex.md`, and
`Reference docs/DOS reconstructed/R9-G1a-R1.evidence.md`. An item with several builds or
separately checked extents still has one merged evidence artifact. Do not use unscoped names such
as `.review-of-claude.md`, and do not reuse another item's files.

**Review files are named for the agent under review, not the author**, and have *phased*
ownership: the reviewer writes the file in one pass, then never touches it again; from that
moment the agent under review owns it and is the only one who edits it. `.derivations/` files
are single-writer outright. There is no shared discussion file: two simultaneous writers means
clobbered edits and no reliable record of who claimed what.

## Method 2 — two Codex Sol High agents implement the same backlog item cold

Use this method only when the user requests dual-agent implementation or the backlog item records that
preference. Its purpose is to let one orchestrating main agent coordinate two independent
implementations and reciprocal review on the same real task. It does not authorize binary
reconstruction; the dedicated-work rule above is a hard scope boundary for both implementers and
the orchestrator.

The required method-2 configuration is:

| Role | Model and effort |
|---|---|
| Main agent, orchestrator and final integrator | GPT-5.6 Sol, High |
| Subagent A, independent implementer and reciprocal reviewer | GPT-5.6 Sol, High |
| Subagent B, independent implementer and reciprocal reviewer | GPT-5.6 Sol, High |

The orchestrator is not a third implementation competitor and must not pre-implement the backlog
item before the two subagents' initial commits. Historical benchmark records retain the models and
efforts that actually ran and are not rewritten to match this configuration.

Each subagent must receive the same self-contained task packet with no inherited conversation
(`fork_turns: "none"` where that control is available). Label them **Sol High A** and **Sol High B**
throughout the run so their branches, artifacts and timing remain distinct. The main agent may
retain the task context for orchestration, but it must not leak one subagent's implementation or
review into the other subagent's cold first pass.

### Worktree and branch isolation

Separate worktrees are mandatory, not optional. Before either subagent reads implementation code:

1. Require the intended base branch to be clean and record its exact commit hash.
2. Freeze one task packet: backlog ID and text, relevant specs and instructions, acceptance
   criteria, permitted scope, required tests, base commit, branch name and absolute worktree path.
   Give the identical substantive packet to both subagents.
3. Create independent `codex/<ID>-sol-high-a` and `codex/<ID>-sol-high-b` branches and worktrees at
   that base. Reserve the primary checkout, or a third clean worktree, for orchestration and
   integration.
4. Record a dispatch timestamp for each subagent immediately before its implementation starts.
5. Assign an isolated test-server port to every checkout and include it in the task packet.

Each subagent edits and commits only in its assigned worktree. It must not open, search, diff or
otherwise inspect the other subagent's worktree or branch until both initial implementations are
committed. The orchestrating main agent may inspect both only after both initial commits exist.
Shared generated caches and servers must not write into either implementation worktree unless the
task packet explicitly assigns safe, separate locations.

### Timing and test-server isolation

Each implementation subagent owns and documents its own timing block. The orchestrating main
agent also records a coordination timing block covering dispatch, review handoff, integration and
final verification; this is reported separately and is not treated as a third implementation
competitor. Immediately before dispatch, start both a
wall-clock record (ISO 8601 with offset) and a monotonic stopwatch. At minimum, record these
events for each subagent:

- `implementation_started_at` and `initial_commit_ready_at`;
- `review_started_at` and `review_completed_at`;
- `revision_started_at` and `revision_commit_ready_at`; and
- the start and completion of every named verification suite.

Each subagent's final report must include elapsed seconds for initial implementation, reciprocal
review, review-driven revision, each verification suite, and active total. Also report waiting or
blocked time separately. Stop the active stopwatch while waiting for the other agent, user input,
an external process, or a server slot. If a start or stop event was not recorded, write `not
recorded`; the main agent may report a measurable interval as a fallback only when it labels the
interval and does not call it active runtime. The main agent copies both subagent timing blocks
and its own coordination block into the append-only `DUAL-AGENT-BENCHMARK.md` entry rather than
reconstructing durations from commit timestamps.

The default local server assignment is:

| Checkout | Default server port | Use |
|---|---:|---|
| Primary integration checkout | 8080 | Final integration and ordinary manual work |
| Sol High A implementation worktree | 8081 | Sol High A's Playwright/manual browser work |
| Sol High B implementation worktree | 8082 | Sol High B's Playwright/manual browser work |

Verify each assigned port is free before dispatch. If one is occupied, choose and record another
free port before starting the subagent. Run Playwright with `PLAYWRIGHT_PORT=<assigned-port>` and
manual servers with `python tools/nocache_server.py --port <assigned-port>`. Never point a subagent
at a server started from another worktree. `PLAYWRIGHT_REUSE_EXISTING=1` is prohibited during a
dual-agent run; server reuse is only acceptable for an explicitly single-checkout manual run.
Record the server PID, server start and stop times, and the time at which the assigned port was
confirmed free after testing. The integration gate must verify all temporary ports are free before
removing worktrees.

### Independent implementation

Both subagents implement the complete scoped item, update its specification and tests where
required, run the task packet's checks, and make an initial local commit. Each reports its commit
hash, tests, assumptions, remaining concerns, and the timing block described above. The main agent
records the timestamp at which each initial commit is ready and copies the subagent-reported
elapsed durations into the benchmark ledger. The main agent does not make an implementation commit
before these two independent initial commits exist.

An implementation that omits required tests, documentation or migration work is incomplete even
if its code appears to work. Neither subagent may compensate for a missing requirement by narrowing
the backlog item without AKH's approval.

### Reciprocal review

Only after both initial commits exist may the subagents inspect each other's base-to-tip diffs.
Each subagent reviews the other implementation against the frozen task packet and writes one
review artifact in the primary checkout:

| File | Subject | Written by | Owned after writing by |
|---|---|---|---|
| `.reviews/<ID>.review-of-sol-high-a.md` | Sol High A implementation | Sol High B | Sol High A |
| `.reviews/<ID>.review-of-sol-high-b.md` | Sol High B implementation | Sol High A | Sol High B |

The reviewer writes its artifact in one pass and never edits it again. Findings must identify the
affected file and line or symbol, explain the observable failure or maintainability risk, and give
the evidence or test that establishes it. Preference alone is not a finding. Each reviewer records
its review start and completion timestamps and elapsed duration in its timing block.

The main agent then gives each subagent the review of its own branch. Each subagent revises only
its own implementation, marks every review entry as fixed or replies with a concrete reason for
disputing it, reruns the required checks, and makes a revised local commit. Record revision start
and ready timestamps plus elapsed duration. Neither subagent edits or commits to the other's branch.

### Integration and completion gate

After both revised branches are ready, the Sol High orchestrating main agent compares them against
the frozen acceptance criteria. It may select either implementation or combine elements of both,
but it must state why the chosen result is stronger; being the orchestrator or running at High does
not give either subagent a presumption of correctness.

Perform integration on a clean branch/worktree based on the frozen commit. Do not merge both
branches mechanically. Apply only the selected changes, reconcile their specifications and tests,
and run the complete applicable test suite. The item closes only when:

- the integrated implementation satisfies every acceptance criterion;
- all required tests pass in the integration worktree;
- the specification, backlog and history are updated consistently;
- surviving review disputes are reported to AKH rather than silently discarded; and
- the integrated result is committed locally on the intended branch without pushing.

Cleanup happens only after the final commit is verified and reachable from the intended branch.
Record the temporary branch tips, remove the exact temporary worktrees, delete their temporary
branches, clear the two review artifacts, and confirm that the intended worktree is clean. Never
push as part of this protocol. Before cleanup, verify that every temporary server PID has exited
and every assigned temporary port is free.

### Required end-of-task comparison

The main agent's final user-facing summary must compare the subagents rather than merely announcing
that the integrated tests pass. Report:

- the exact model and effort used by the orchestrator and each subagent;
- each subagent's recorded start/end events, active elapsed duration, waiting duration, verification
  durations and total measured time; never substitute commit timestamps for missing starts;
- the orchestrator's coordination and integration timing separately from subagent implementation
  timing;
- which subagent produced the stronger initial implementation and the evidence for that judgment;
- which subagent produced the more useful reciprocal review;
- which revised implementation was strongest overall, or that the result was a tie or split
  decision when the evidence does not support one winner;
- which implementation supplied the integration base and what material elements, if any, came
  from the other; and
- the final commit, test results, worktree cleanup result and confirmation that nothing was
  pushed.

Measure each stage from the subagents' timing blocks, using the monotonic stopwatch for elapsed
seconds and wall-clock timestamps for auditability. For each subagent, define active total as
initial implementation plus review plus revision time, excluding waiting for the other subagent or
external resources. Report parallel subagent durations separately; do not add their totals and
present that sum as end-to-end elapsed time. Report the orchestrator's active coordination time
separately and do not compare it as implementation throughput. If active timing is incomplete,
report the missing fields and any fallback wall interval explicitly. A quality claim must cite
concrete differences such as defects avoided, tests added, requirements covered, review findings
accepted, simpler design or reduced regression risk. Do not award a winner from model identity,
confidence or speed alone.

## Method 3 — current-agent implementation, then Sol High review and revision

Use this method only when the user requests it or the backlog item records that preference. It does
not authorize binary reconstruction.

1. **The current agent implements.** Regardless of its model, the active agent reads the backlog
   item and relevant project instructions, implements the complete task in the current checkout,
   updates its specification and tests where required, and runs the applicable checks. Existing
   unrelated worktree changes are preserved; this method has no clean-base, separate-worktree,
   branch, commit, timing, or server-isolation gate.
2. **One Sol High subagent reviews and revises.** After the current agent's implementation is ready,
   it spawns one Codex GPT-5.6 Sol High subagent at High effort. That subagent reviews the complete
   task against the backlog text, evidence, specification, implementation and tests, then directly
   fixes every issue it finds in the current checkout and reruns the applicable checks. It reports
   both its findings and the revisions it made. It is a reviewer/reviser, not a competing cold
   implementer.
3. **The current agent closes and reports.** The current agent verifies the revised result, removes
   each completed item from `Calculator/BACKLOG.md`, records it in `Calculator/HISTORY.md`, and
   summarizes the implementation to the user, including what the Sol High review caught and how it
   was revised.

If the final verification exposes a substantive defect, return it to the same reviewer/reviser for
another correction pass before closing the item. Method 3 does not receive an entry in
`DUAL-AGENT-BENCHMARK.md` unless the user explicitly requests one.

## Method 1 workflow and completion gates

Used for binary reads and reconstructions (**BACKLOG** R5, R6), where the value is *independent*
agreement. Contamination destroys that value: an agent that reads the other's answer first
anchors to it, and the second read confirms nothing.

Every binary reconstruction task uses this method. Claude and Codex each produce a cold,
independent derivation, then review one another before merge. There is no single-agent
reconstruction path and no backlog preference or additional request is needed to select method 1.

### The five steps

1. **Scope the dedicated reconstruction item.** Derivation begins only from a dedicated backlog
   row created under *Method 1 — Claude and Codex reconstruct binaries independently*. Either
   agent may prepare that row, naming the target — file, routine, address range — and nothing else.
   **Size it at up to roughly 1000 instructions**, normally one enchantment block, one named helper,
   one data row,
   one locate-and-bound item, or a comparable natural unit. There is no minimum size: do not
   combine unrelated routines,
   executables or evidence owners merely to make an item larger. The preparing agent must then stop;
   **derivation starts in a fresh conversation**, so preparing an item confers no head start.
2. **Both agents derive**, Claude in `.derivations/<ID>.claude.md` and Codex in
   `.derivations/<ID>.codex.md`, and **must not read the other's**, even if it exists. Do not grep
   for it, do not open it to "check formatting". A derivation carries evidence only — see
   *Findings are a merge product* below. Shared helper tools under `tools/` may be written and
   refined freely by either agent — tooling is not an answer.
3. **Both agents review the other's derivation**, writing to the item-scoped file named for the
   *other* agent: Codex writes `.reviews/<ID>.review-of-claude.md`; Claude writes
   `.reviews/<ID>.review-of-codex.md`. When AKH asks for a new review, the reviewer **clears any
   existing content of that same item's file first** — but only after the precondition in
   *Closing a review round* below is met.
4. **Both agents work through the review of their own file.** Fix what you agree with and
   **delete that entry**. Leave what you dispute, with a reply line beneath:
   `— <agent>, <YYYY-MM-DD>: <reason>`. Never silently drop an entry. Surface every surviving
   disagreement to AKH.
5. **AKH prompts one agent to merge.** See *Merging* below. Once the merged artifact and its
   supporting documentation are complete, the merger removes the scoped item from
   `Calculator/BACKLOG.md` and records its completion in `Calculator/HISTORY.md` in the same
   change; no separate AKH sign-off is required.

### Findings are a merge product

A derivation artifact carries **evidence, not conclusions**: the source-shaped body with its
address annotations, the coverage ledgers, the branch and write inventories, the counts, and the
factual notes needed to read them — an idiom the disassembler renders misleadingly, a field name
and where it came from, a sentinel value and the sites that write it. Every one of those is
checkable against the binary.

It does **not** carry a findings section: no named conclusion about what a mechanic is, no
correction to another document, no proposed Q row, no recommendation. Those are written **once, by
the merger**, from the union of the two reconstructions.

The reason is the one that keeps the two derivations apart in the first place. A finding is an
*interpretation* of a reconstruction, and interpretation is exactly what a second independent
reconstruction exists to test. Writing it at derivation time costs three ways: it is the most
persuasive part of the file, so it anchors the reviewer hardest; both agents pay for the same
prose, and only one version survives; and it produces a doc-facing claim that has never been
cross-checked, which is the failure this mode exists to prevent.

**Nothing is lost by deferring.** An observation made while deriving belongs in the artifact as an
annotation at the site it came from, where the next reader meets it with the code in front of
them. What waits for the merge is the *claim*, not the evidence for it.

### Evidence, not persuasion

This is the rule the whole flow turns on. Two agents can agree and both be wrong.

- **A review entry is only actionable if it cites an address and quotes the instruction bytes
  there.** "I read it differently" is not a review entry.
- **A disagreement is resolved by both agents re-reading the cited address and quoting what they
  see.** If the quoted bytes agree, the reading is settled and the losing agent fixes its
  derivation. That is not conceding — it is being shown the evidence. Only a dispute about the
  *bytes themselves* goes to AKH.
- Neither agent concedes to **assertion**; both agents concede to **verified evidence**. Deferring
  to the more confident reading launders a guess into a finding, and nothing downstream can detect
  it later.

### Merging

One review round, then merge — the two derivations are **not** required to agree statement by
statement first. Merge the *union* of both, and every statement the two still disagree on lands in
the merged artifact **marked `disputed`**, carrying both readings and the address, and becomes a Q
row. Do not pick a winner document: neither derivation is reliably a superset of the other, so
selecting one silently discards the other's correct content.

**The merger writes the findings** — not by copying either agent's, because neither has any. Each
finding cites the addresses it rests on and is drawn from the merged reconstruction, so it is
stated once and rests on two independent reads. A reading the two still disagree about is a
`disputed` statement and a Q row, never a finding.

A merged artifact is allowed to be uncertain in places; do not turn an unresolved reading into a
plain finding.

**The merge closes the scoped derivation item.** After writing the merged
`<owning evidence directory>/<ID>.evidence.md` artifact and the owning source-shaped body,
recording any surviving disagreements as Q rows, updating supporting documentation, and clearing
that ID's derivation/review scratch files, remove the item from `Calculator/BACKLOG.md` and record
its completion in `Calculator/HISTORY.md` in the same change. `done` is not a backlog state. AKH's
merge request is the approval to close the item; do not leave it in the backlog awaiting a second
sign-off.

### Closing a review round

**Before `.reviews/<ID>.review-of-claude.md` or
`.reviews/<ID>.review-of-codex.md` is cleared, every disagreement still standing in it must
already exist as a Q row in `Calculator/BACKLOG.md`.** Clearing is otherwise a silent deletion of
evidence, and it would leave an ephemeral, gitignored file doing the register's job — see *One
rule for the register* in `CLAUDE.md`.

### If a review entry contradicts conversation

Surface the conflict to AKH. Neither agent shares the other's session context.

### Derivation completion gate

Reaching the target end address means only that the extent was **surveyed**. It does not mean the
extent was derived. A derivation is complete only when its artifact provides complete semantic
instruction coverage of the assigned address range: every semantic conditional branch, loop,
call, return, branch-affecting read and state write is represented in source-shaped form.

An item may span several builds of the same executable — R6 assigns all three DOS builds at once.
Each build is then its own assigned extent and carries **its own complete ledger**; a shared
ledger cannot express that two builds diverge. Where a build's code is byte-identical to the
primary's, its ledger may say so for a stated address range instead of restating the body, but a
range that differs by even one byte is derived and ledgered in full for that build.

Every address in the assigned extent must belong to exactly one contiguous, non-overlapping
coverage-ledger row whose disposition is:

- `reconstructed` — represented by the source-shaped body;
- `compiler-only` — limited to range checks, overflow checks, record-address calculation and
  routine scaffolding; or
- `unresolved` — explicitly address-bounded work that remains to be derived.

The first ledger row must start at the assigned start address, the last must end at the assigned
end address, and there may be no gaps. **Any `unresolved` row keeps the derivation `in progress`.**
A summary, table, call inventory, execution-order list or named placeholder may accompany the
reconstruction as an index, but never substitutes for the source-shaped body. The gate measures
coverage only — it neither requires nor admits a findings section.

Before claiming a derivation complete, its author must state all five counts explicitly:
`unresolved ranges: 0`; `synthetic helpers without bodies: 0`; `semantic conditional jumps
omitted: 0`; `semantic calls omitted: 0`; `state writes omitted: 0`. If the artifact is not
sufficient for another agent to reproduce every branch and write without reopening the
disassembly, it is not complete.

**Counting is not reading, and the counts alone are worth little.** A wrong reading can cite
exactly the addresses a right one would. Two further requirements exist for that reason:

- **Every conditional branch must carry its target address and what lies at it** — not just the
  address of the test. Citing only the test can hide a misread range or an incorrectly nested
  block.
- **Arithmetic idioms must be quoted in full, including their corrections.** `sar` followed by
  `jns / adc reg,0` is a compiler's signed `div`, not an arithmetic shift. Read the idiom against
  the compiler that produced the target: `Caster.exe` is Delphi, the DOS `WIZARDS.EXE` builds are
  Borland C++ 1991, and their calling conventions, division and switch-dispatch shapes differ.

`tools/verify_derivation.py <Caster.exe> <doc.md>` checks citation coverage, ledger contiguity and
declared nesting. Read its docstring before trusting a clean run: it verifies that each element is
*cited*, never that the right meaning was attached to it. `tools/verify_dos_derivation.py` is its
16-bit Borland C++ counterpart for the DOS builds and takes a build key; see
`Reference docs/DOS reconstructed/README.md`.

## Disagreement

An agent-vs-agent disagreement is **not** a source conflict. It does not belong in
`Source discrepancies.md` (script vs prose) — it is an open question *about* a source. Record it
as a Q row in `Calculator/BACKLOG.md` with both readings quoted verbatim and their code sites,
and let AKH arbitrate.

**Neither agent concedes to the other.** Deferring to the more confident reading launders a
guess into a finding, and nothing downstream can detect it later.

Two kinds of Q row come out of this flow and they are written at different times. An
**agent-vs-agent disagreement** is recorded as soon as it survives a review round, because
*Closing a review round* above will not let the review file be cleared until it exists. A
**question about the mechanic** — something neither agent can settle from the binary, an engine
behaviour that contradicts its own helptext — is a finding like any other and waits for the merge.

## Provenance

When a finding lands in its evidence home, record how it was checked:
`Verified: Claude 2026-08-01 (0x4a2f10); Codex 2026-08-02, independent.` Distinguish
*independent* (method 1) from *reviewed* (the other agent checked the written finding) —
they are not equally strong. Cross-checking alone does not close a derivation item; the completed
merge does, under the merge gate above.
