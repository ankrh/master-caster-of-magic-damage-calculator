# Castercore.RecalculateUnits wrapper verification evidence

This companion covers `@Castercore@RecalculateUnits`,
`$00648718..$0064873F`, included in R5.1a. Provenance: Codex 2026-08-02,
single-agent audit against the md5-pinned executable.

The wrapper spills its four incoming arguments, pushes stack argument `tay`,
reloads ECX=`tax`, EDX=`tap`, AL=`com`, and performs
`$00648734` `e8e711f5ff call 0x599920` -> `@Units@RecalculateUnits`.
`$0064873C` `c20400 ret 4` preserves the callee-cleaned stack argument.
There are no semantic conditionals, game-state writes, or arithmetic idioms.

## Coverage ledger

| Row | Start | End | Within | Disposition | Reconstruction location |
|---:|---|---|---:|---|---|
| 0 | `$00648718` | `$0064873F` | — | reconstructed | Complete forwarding wrapper, including call and return |

Current completion counts:

- `unresolved ranges: 0`
- `synthetic helpers without bodies: 0`
- `semantic conditional jumps omitted: 0`
- `semantic calls omitted: 0`
- `state writes omitted: 0`
- `declared parent mismatches: 0`

**The Castercore wrapper is complete under the current reconstruction gate.**

