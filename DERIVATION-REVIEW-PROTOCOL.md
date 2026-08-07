# Derivation and cross-agent review protocol

Read this file only for binary derivation or cross-agent review work. It is the single home for
how Claude and Codex divide, independently derive, and cross-check that work.

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
