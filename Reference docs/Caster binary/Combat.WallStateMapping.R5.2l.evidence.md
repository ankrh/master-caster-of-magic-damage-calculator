# R5.2l combat-wall slot mapping and state-write evidence

Durable evidence for `@Combat@ctws` (`$005BB0D0..$005BB1CC`) and
`@Combat@SetWallState` (`$005BB788..$005BB7CE`) in the pinned `Caster.exe`. Their complete
source-shaped bodies are integrated beside `GetWallState` and `destroywall` in
[`Combat.AttackAndWallHelpers.pas`](./Combat.AttackAndWallHelpers.pas).

Codex cold-derived both extents and then performed a separate fresh-byte self-review on
2026-08-02 at the user's direction. This was an explicit single-agent exception: no Claude
derivation, review file, or Claude output was read or used. The executable at the identity
recorded in this directory's `README.md` was rechecked immediately before disassembly; its MD5
and size both matched that single canonical record.

## ABI and state layout

- TD32 gives `ctws` the exact locals `cx`, `cy`, and `Result`. EAX carries `cx`, EDX carries
  `cy`, and EAX returns the integer result (`$005BB0D6 8955F8`, `$005BB0D9 8945FC`,
  `$005BB1C5 8B45F4`).
- TD32 gives `SetWallState` the exact locals `cx`, `cy`, `ws`, and `w`. EAX, EDX, and ECX carry
  `cx`, `cy`, and `ws`, respectively (`$005BB78E 894DF4`, `$005BB791 8955F8`,
  `$005BB794 8945FC`).
- Both the setter and the already reconstructed getter load the containing combat-state object
  through pointer global `$0070969C`. Their indexed operand is
  `[state + w*4 + $44EC]` (`$005BB7C3`, `$005BB76D`). Because the compiler restores the
  original 1-based `w` before that access, `+$44EC` is a lower-bound-biased displacement:
  element 1 is physically at `+$44F0`, element 12 at `+$451C`.
- The full check `$005BB7AB..$005BB7B9` proves the declared index range is exactly `1..12`.

Both `--inbound` scans cover their complete TD32 extents and report no straddling outer gate.
Every ledger row is therefore top-level.

## Exact mapping and mutation semantics

`ctws` initializes its result to zero, then evaluates twelve sequential, independent coordinate
tests in executable order. Each coordinate pair is unique, so at most one result assignment can
fire:

| Slot | `cx` | `cy` | Result write |
|---:|---:|---:|---:|
| 1 | 9 | 13 | `$005BB0ED` |
| 2 | 9 | 12 | `$005BB100` |
| 3 | 9 | 11 | `$005BB113` |
| 4 | 9 | 10 | `$005BB126` |
| 5 | 8 | 10 | `$005BB139` |
| 6 | 7 | 10 | `$005BB14C` |
| 7 | 6 | 10 | `$005BB15F` |
| 8 | 6 | 11 | `$005BB172` |
| 9 | 6 | 12 | `$005BB185` |
| 10 | 6 | 13 | `$005BB198` |
| 11 | 7 | 13 | `$005BB1AB` |
| 12 | 8 | 13 | `$005BB1BE` |

These are exactly the twelve perimeter tiles of the inclusive wall rectangle `x=6..9`,
`y=10..13`; its four interior coordinates and every coordinate outside it map to zero. In numeric
order the routine visits `x=9, y=13..10` descending; `y=10, x=8..6` descending;
`x=6, y=11..13` ascending; and `y=13, x=7..8` ascending.

`SetWallState(cx,cy,ws)` calls `ctws` once. A result `<= 0` returns without a write. A positive
slot writes `ws` directly to that 1-based wall-state element. The setter does not validate or
translate the state value; `destroywall`, not this routine, supplies the established intact-to-
broken transition value 2 after first requiring current state 1. `GetWallState` uses the same map
and array expression, so lookup and mutation are symmetric.

The semantic call closure is self-contained: `ctws` has none, `SetWallState` calls the
reconstructed `ctws`, and its sole other call is the compiler's range-error helper. The exact mapping also
introduces no calculator defect or source conflict. The calculator accepts the contextual wall
bonus directly and does not model combat coordinates; the helptext and manual do not specify
the internal coordinate-to-slot numbering.

## Distinct raw-byte self-review

After the cold derivation and first verifier pass, fresh raw disassemblies were generated in
separate chunks and both inbound scans were rerun. The review corrected two precision defects
before durable integration:

1. The initial layout prose treated encoded `+$44EC` as the first element's physical offset.
   Re-reading the complete `dec` / compare / `jbe` / `BoundErr` / `inc` sequence proved that EAX
   is restored to 1-based `w`; the physical span is therefore `+$44F0..+$451C`. The durable
   projection and evidence use the corrected description.
2. The initial summary described decreasing `y` with an unsupported screen direction. The bytes
   establish numeric coordinate order only, so the durable wording uses ascending/descending
   values without assigning compass orientation.

The review independently confirmed every parameter binding, all twelve coordinate/result
triples, all 24 `ctws` branch destinations, `SetWallState`'s single semantic gate and call, the
one persistent state write, and the matching getter expression. No source-shaped control or
data-flow defect survived.

## Semantic conditional branches

Every semantic conditional is listed with its encoded jump, target, and what begins at that
target. The one compiler-only bounds branch is quoted in the arithmetic/check section instead.

| Jump | Target | Target contents |
|---|---:|---|
| `$005BB0E5 750D jne` | `$005BB0F4` | slot 2 `cx = 9` comparison |
| `$005BB0EB 7507 jne` | `$005BB0F4` | slot 2 `cx = 9` comparison |
| `$005BB0F8 750D jne` | `$005BB107` | slot 3 `cx = 9` comparison |
| `$005BB0FE 7507 jne` | `$005BB107` | slot 3 `cx = 9` comparison |
| `$005BB10B 750D jne` | `$005BB11A` | slot 4 `cx = 9` comparison |
| `$005BB111 7507 jne` | `$005BB11A` | slot 4 `cx = 9` comparison |
| `$005BB11E 750D jne` | `$005BB12D` | slot 5 `cx = 8` comparison |
| `$005BB124 7507 jne` | `$005BB12D` | slot 5 `cx = 8` comparison |
| `$005BB131 750D jne` | `$005BB140` | slot 6 `cx = 7` comparison |
| `$005BB137 7507 jne` | `$005BB140` | slot 6 `cx = 7` comparison |
| `$005BB144 750D jne` | `$005BB153` | slot 7 `cx = 6` comparison |
| `$005BB14A 7507 jne` | `$005BB153` | slot 7 `cx = 6` comparison |
| `$005BB157 750D jne` | `$005BB166` | slot 8 `cx = 6` comparison |
| `$005BB15D 7507 jne` | `$005BB166` | slot 8 `cx = 6` comparison |
| `$005BB16A 750D jne` | `$005BB179` | slot 9 `cx = 6` comparison |
| `$005BB170 7507 jne` | `$005BB179` | slot 9 `cx = 6` comparison |
| `$005BB17D 750D jne` | `$005BB18C` | slot 10 `cx = 6` comparison |
| `$005BB183 7507 jne` | `$005BB18C` | slot 10 `cx = 6` comparison |
| `$005BB190 750D jne` | `$005BB19F` | slot 11 `cx = 7` comparison |
| `$005BB196 7507 jne` | `$005BB19F` | slot 11 `cx = 7` comparison |
| `$005BB1A3 750D jne` | `$005BB1B2` | slot 12 `cx = 8` comparison |
| `$005BB1A9 7507 jne` | `$005BB1B2` | slot 12 `cx = 8` comparison |
| `$005BB1B6 750D jne` | `$005BB1C5` | load `Result` for return |
| `$005BB1BC 7507 jne` | `$005BB1C5` | load `Result` for return |
| `$005BB7A9 7E1F jle` | `$005BB7CA` | setter epilogue; no state write |

## Calls, writes, and full arithmetic/check idiom

- The only semantic call is `$005BB79D E82EF9FFFF`, directly targeting `@Combat@ctws` at
  `$005BB0D0`.
- `ctws`'s zero initialization and twelve result assignments are all rendered in the durable
  body. `SetWallState` has exactly one persistent write:
  `$005BB7C3 898C82EC440000`, fed by pointer load `$005BB7BA 8B159C967000` and `ws` reload
  `$005BB7C0 8B4DF4`.
- Neither routine has semantic multiply, divide, shift, or rounding arithmetic. The complete
  arithmetic-shaped bounds idiom is `$005BB7AB 8B45F0` (load `w`), `$005BB7AE 48` (`w-1`),
  `$005BB7AF 83F80B` (compare with 11), `$005BB7B2 7605` (`jbe $005BB7B9`, whose target
  restores the index), `$005BB7B4 E827B7E4FF` (`@System@@BoundErr`), and
  `$005BB7B9 40` (restore original `w`). This compiler-only sequence proves `1..12`; no
  correction instruction is omitted.

## Coverage ledgers

### `@Combat@ctws`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005BB0D0` | `$005BB1C5` | — | reconstructed | default plus all twelve coordinate-to-slot assignments |
| 1 | `$005BB1C5` | `$005BB1CC` | — | compiler-only | return load and epilogue |

### `@Combat@SetWallState`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005BB788` | `$005BB7CA` | — | reconstructed | lookup, positive-slot gate, checked state-array write |
| 1 | `$005BB7CA` | `$005BB7CE` | — | compiler-only | epilogue |

## Completion declarations

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Verifier totals across the two explicit extents: 25/25 semantic conditional jumps, 1/1 semantic
call, 1/1 verifier-classified named-field write, four contiguous ledger rows, and zero declared
parent mismatches. The verifier was rerun after the self-review corrections; both extents remained
clean.

Verified: Codex 2026-08-02, cold derivation followed by a distinct fresh-byte self-review and
user-directed single-agent integration; no Claude input was read or used.
