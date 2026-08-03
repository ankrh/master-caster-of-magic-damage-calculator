# R5.1a late UnitCalc-hook verification evidence

This companion covers `@Units@RecalculateUnits`, `$005A65B2..$005A65DC`,
the late `UnitCalc` hook included in R5.1a. Provenance: Codex 2026-08-02,
single-agent audit against the md5-pinned executable.

The whole-routine inbound scan shows that this hook remains inside the first
filtered unit pass. The unit-count branch at `$0059996D` can skip to `$005A6822`,
and the five unit-filter branches at `$005999A9`, `$005999E1`, `$00599A1F`,
`$00599A53` and `$00599A87` can skip to the loop increment at `$005A6816`; all
straddle this extent. Conversely, five region-`c` paths land at the hook boundary
`$005A65B2` (`$005A2F3A`, `$005A6161`, `$005A61B5`, `$005A644F`, and the
unconditional `$005A6501`). The canonical Pascal body preserves both facts by
placing the hook inside the selected-unit loop immediately after region `c`.

## Branch and calls

- `$005A65BA` `7420 je 0x5a65dc` -> `$005A65DC`: `8b45f0 mov eax, dword ptr [ebp-$10]`, the first address calculation of the post-`UnitCalc` clamp block; disabled recalculation scripts skip both calls.
- `$005A65C9` `e822a7feff call 0x590cf0` -> `@Scripts@SetScriptNumVar`, with EAX=`$005A7A6C` (`U`), EDX=`i`, ECX=`1`.
- `$005A65D7` `e838c6fdff call 0x582c14` -> `@Scripts@RunScript`, with EAX=`[$00708F68]` (`UnitCalc` handle) and DL=`1`.

There are no state writes in this extent and no gameplay arithmetic idioms.

## Coverage ledger

| Row | Start | End | Within | Disposition | Reconstruction location |
|---:|---|---|---:|---|---|
| 0 | `$005A65B2` | `$005A65DC` | — | reconstructed | UnitCalc enabled gate and both script calls |

Current completion counts:

- `unresolved ranges: 0`
- `synthetic helpers without bodies: 0`
- `semantic conditional jumps omitted: 0`
- `semantic calls omitted: 0`
- `state writes omitted: 0`
- `declared parent mismatches: 0`

**The R5.1a late-hook extent is complete under the current reconstruction gate.**
