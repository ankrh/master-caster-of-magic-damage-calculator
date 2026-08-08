# Dual-agent implementation, derivation and review protocol

Read this file before implementing any `Calculator/BACKLOG.md` item, and for binary derivation or
other cross-agent review work. It is the single home for independent implementations,
derivations, reciprocal review and integration.

The two modes are distinct. **Implementation mode** produces competing executable changes in
isolated Git worktrees. **Derivation mode** produces independent evidence reads and retains the
stricter evidence-specific rules below. Never substitute one mode's completion gate for the
other's.

The following scratch files belong to derivation mode:

| File | Subject | Written by | Owned after writing by |
|---|---|---|---|
| `.review-of-claude.md` | Claude's work | Codex | Claude |
| `.review-of-codex.md` | Codex's work | Claude | Codex |
| `.derivations/<ID>.claude.md` | — | Claude | Claude |
| `.derivations/<ID>.codex.md` | — | Codex | Codex |

**Review files are named for the agent under review, not the author**, and have *phased*
ownership: the reviewer writes the file in one pass, then never touches it again; from that
moment the agent under review owns it and is the only one who edits it. `.derivations/` files
are single-writer outright. There is no shared discussion file: two simultaneous writers means
clobbered edits and no reliable record of who claimed what.

## Implementation mode — both implement the same backlog item cold

Use this mode for every calculator backlog-item implementation unless AKH explicitly requests a
single-agent run. Its purpose is to compare both model family and reasoning effort on the same
real task while gaining an independent implementation and review.

The standard pair is:

| Role | Model and effort |
|---|---|
| Main agent, independent implementer and final integrator | GPT-5.6 Luna, XHigh |
| Subagent and independent implementer | GPT-5.6 Sol, Medium |

If either exact model or effort is unavailable, stop and tell AKH; never silently substitute a
different configuration. A differently configured subagent must receive a self-contained task
packet with no inherited conversation (`fork_turns: "none"` where that control is available).
This both permits the model override and protects the independence of the first pass.

### Worktree and branch isolation

Separate worktrees are mandatory, not optional. Before either agent reads implementation code:

1. Require the intended base branch to be clean and record its exact commit hash.
2. Freeze one task packet: backlog ID and text, relevant specs and instructions, acceptance
   criteria, permitted scope, required tests, base commit, branch name and absolute worktree path.
   Give the identical substantive packet to both agents.
3. Create independent `codex/<ID>-luna` and `codex/<ID>-sol` branches and worktrees at that base.
   Reserve the primary checkout, or a third clean worktree, for integration.
4. Record a dispatch timestamp for each agent immediately before its implementation starts.

Each agent edits and commits only in its assigned worktree. It must not open, search, diff or
otherwise inspect the other worktree or branch until both initial implementations are committed.
Shared generated caches and servers must not write into either implementation worktree unless the
task packet explicitly assigns safe, separate locations.

### Independent implementation

Both agents implement the complete scoped item, update its specification and tests where
required, run the task packet's checks, and make an initial local commit. Each reports its commit
hash, tests, assumptions and remaining concerns. The main agent records the timestamp at which
each initial commit is ready.

An implementation that omits required tests, documentation or migration work is incomplete even
if its code appears to work. Neither agent may compensate for a missing requirement by narrowing
the backlog item without AKH's approval.

### Reciprocal review

Only after both initial commits exist may the agents inspect each other's base-to-tip diffs. Each
reviews the other implementation against the frozen task packet and writes one review artifact in
the primary checkout:

| File | Subject | Written by | Owned after writing by |
|---|---|---|---|
| `.reviews/<ID>.review-of-luna.md` | Luna implementation | Sol | Luna |
| `.reviews/<ID>.review-of-sol.md` | Sol implementation | Luna | Sol |

The reviewer writes its artifact in one pass and never edits it again. Findings must identify the
affected file and line or symbol, explain the observable failure or maintainability risk, and give
the evidence or test that establishes it. Preference alone is not a finding. Record the review
start and completion timestamps for each agent.

The main agent then gives each agent the review of its own branch. Each agent revises only its own
implementation, marks every review entry as fixed or replies with a concrete reason for disputing
it, reruns the required checks, and makes a revised local commit. Record revision start and ready
timestamps. Neither agent edits or commits to the other's branch.

### Integration and completion gate

After both revised branches are ready, the Luna main agent compares them against the frozen
acceptance criteria. It may select either implementation or combine elements of both, but it must
state why the chosen result is stronger; being the main agent does not give Luna's own branch a
presumption of correctness.

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
push as part of this protocol.

### Required end-of-task comparison

The main agent's final user-facing summary must compare the agents rather than merely announcing
that the integrated tests pass. Report:

- the exact model and effort used by each agent;
- each agent's initial-implementation time, review time, revision time and total measured time;
- which agent produced the stronger initial implementation and the evidence for that judgment;
- which agent produced the more useful reciprocal review;
- which revised implementation was strongest overall, or that the result was a tie or split
  decision when the evidence does not support one winner;
- which implementation supplied the integration base and what material elements, if any, came
  from the other; and
- the final commit, test results, worktree cleanup result and confirmation that nothing was
  pushed.

Measure each stage from the recorded wall-clock timestamps. For each agent, define total measured
time as initial implementation plus review plus revision time, excluding time spent waiting for
the other agent. Report parallel agent durations separately; do not add the two agents' totals and
present that sum as end-to-end elapsed time. A quality claim must cite concrete differences such
as defects avoided, tests added, requirements covered, review findings accepted, simpler design
or reduced regression risk. Do not award a winner from model identity, confidence or speed alone.

## Derivation mode — both answer the same question cold

Used for binary reads and reconstructions (**BACKLOG** R5, R6), where the value is *independent*
agreement. Contamination destroys that value: an agent that reads the other's answer first
anchors to it, and the second read confirms nothing.

**Dual derivation runs only when AKH asks for it.** It costs roughly four to five times a
single-agent pass, so it is for load-bearing mechanics, not for everything. Anything else is one
agent deriving plus one review round.

### The five steps

1. **Scope the item.** Either agent may prepare the top backlog row, naming the target — file,
   routine, address range — and nothing else. **Size it at roughly 300–1000 instructions**, which
   is one enchantment block, one named helper, or a comparable unit. The preparing agent must then
   stop; **derivation starts in a fresh conversation**, so preparing an item confers no head start.
2. **Both agents derive**, each to its own `.derivations/` file, and **must not read the other's**,
   even if it exists. Do not grep for it, do not open it to "check formatting". A derivation
   carries evidence only — see *Findings are a merge product* below. Shared helper tools under
   `tools/` may be written and refined freely by either agent — tooling is not an answer.
3. **Both agents review the other's derivation**, writing to the file named for the *other* agent.
   When AKH asks for a new review, the reviewer **clears any existing content of that file first**
   — but only after the precondition in *Closing a review round* below is met.
4. **Both agents work through the review of their own file.** Fix what you agree with and
   **delete that entry**. Leave what you dispute, with a reply line beneath:
   `— <agent>, <YYYY-MM-DD>: <reason>`. Never silently drop an entry. Surface every surviving
   disagreement to AKH.
5. **AKH prompts one agent to merge.** See *Merging* below. Once the merged artifact and its
   supporting documentation are complete, the merger marks the scoped backlog item `done`; no
   separate AKH sign-off is required.

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

**The merge closes the scoped derivation item.** After writing the merged artifact, recording any
surviving disagreements as Q rows, updating its evidence home and supporting documentation, and
clearing the derivation/review scratch files, mark that backlog item `done`. AKH's merge request
is the approval to close it; do not leave it `in progress` awaiting a second sign-off.

### Closing a review round

**Before a review file is cleared, every disagreement still standing in it must already exist as a
Q row in `Calculator/BACKLOG.md`.** Clearing is otherwise a silent deletion of evidence, and it
would leave an ephemeral, gitignored file doing the register's job — see *One rule for the
register* in `CLAUDE.md`.

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
*independent* (derivation mode) from *reviewed* (the other agent checked the written finding) —
they are not equally strong. Cross-checking alone does not close a derivation item; the completed
merge does, under the merge gate above.
