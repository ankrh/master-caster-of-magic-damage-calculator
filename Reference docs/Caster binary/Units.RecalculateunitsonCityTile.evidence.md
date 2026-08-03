# Units.RecalculateunitsonCityTile wrapper verification evidence

This companion covers `@Units@RecalculateunitsonCityTile`,
`$005A8C6C..$005A8D02`, included in R5.1a. Provenance: Codex 2026-08-02,
single-agent audit against the md5-pinned executable.

The three repeated `dec; cmp $3E7; jbe` and `imul $F7; jno` sequences are
compiler range/overflow guards and record-address calculations. The semantic
loads and call are:

- `$005A8C97` `0fbf84c274dcda0a`: sign-extend city Y and push it as `tay`.
- `$005A8CC4` `0fbf8cc272dcda0a`: sign-extend city X into ECX (`tax`).
- `$005A8CF0` `0fbe94c270dcda0a`: sign-extend city plane into EDX (`tap`).
- `$005A8CF8` `33c0 xor eax,eax`: set AL=False (`com`).
- `$005A8CFA` `e8210cffff call 0x599920` -> `@Units@RecalculateUnits`.
- `$005A8D01` `c3 ret`: return from the wrapper.

There are no semantic conditionals, game-state writes, or gameplay arithmetic idioms.

## Coverage ledger

| Row | Start | End | Within | Disposition | Reconstruction location |
|---:|---|---|---:|---|---|
| 0 | `$005A8C6C` | `$005A8D02` | — | reconstructed | City-coordinate loads, non-combat argument and forwarding call |

Current completion counts:

- `unresolved ranges: 0`
- `synthetic helpers without bodies: 0`
- `semantic conditional jumps omitted: 0`
- `semantic calls omitted: 0`
- `state writes omitted: 0`
- `declared parent mismatches: 0`

**The city-tile wrapper is complete under the current reconstruction gate.**

