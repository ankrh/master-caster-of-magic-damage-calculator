# `@Units@RecalculateUnits` R5.1c-a completion evidence

This is the durable evidence companion for the merged R5.1c-a reconstruction in
`Units.RecalculateUnits.pas`. It covers these assigned half-open extents:

- `@Units@RecalculateUnits`: `$005A65DC..$005A681C`
- `@Units@RecalculateUnits`: `$005A6822..$005A6FDF`
- `@Map@unitonoverlandtile`: `$005D8CA0..$005D8D07`
- `@Units@Ismagicalranged`: `$005963F4..$00596440`

The binary identity remains solely in `README.md`. Provenance: Claude 2026-08-02 and
Codex 2026-08-02, independently derived; both cross-reviews resolved against quoted
instruction bytes with no surviving disagreement; merged by Codex 2026-08-02.

## Entry and enclosing gates

`annotate_caster_disasm.py --inbound` found one outer branch over the first extent:
`$0059996D 0f8eafce0000 jle $005A6822`; this is the established first-unit-loop
zero-count exit. `$005A65BA 741a je $005A65DC` enters the first extent by skipping the
late `UnitCalc` hook. Five older first-loop `Continue` branches also land at
`$005A6816`, the loop-counter tail.

The aura extent is top-level after `BuildAuraTable`. `$0059996D` lands at its first
instruction, and the second-unit-loop back edge `$005A7A5D 0f85e1edffff jne
$005A6844` lands at its loop head. Neither helper has an outer gate.

## Branch-target inventory

Every semantic conditional is listed with its encoded bytes, literal target and what
begins there. Range/overflow guards are compiler-only and omitted; the signed-division
correction branches are quoted under *Arithmetic idioms*.

### First-pass tail — 16

- `$005A6611 7e0a jle $005A661D` → lower hitchance clamp.
- `$005A6624 7d0a jge $005A6630` → ranged upper clamp.
- `$005A6646 7e18 jle $005A6660` → melee upper clamp.
- `$005A6676 7e18 jle $005A6690` → thrown upper clamp.
- `$005A66A6 7e18 jle $005A66C0` → breath upper clamp.
- `$005A66D6 7e18 jle $005A66F0` → ranged lower clamp.
- `$005A6706 7d18 jge $005A6720` → melee lower clamp.
- `$005A6736 7d18 jge $005A6750` → thrown lower clamp.
- `$005A6766 7d18 jge $005A6780` → breath lower clamp.
- `$005A6796 7d18 jge $005A67B0` → defense floor.
- `$005A67B7 7d08 jge $005A67C1` → attack floor.
- `$005A67C8 7d08 jge $005A67D2` → ranged floor.
- `$005A67D9 7d08 jge $005A67E3` → thrown floor.
- `$005A67EA 7d08 jge $005A67F4` → fire-breath floor.
- `$005A67FB 7d08 jge $005A6805` → lightning-breath floor.
- `$005A680C 7d08 jge $005A6816` → first-loop counters. The back edge begins at
  the excluded end address: `$005A681C 0f855b31ffff jne $0059997D`.

### Aura pass — 24

- `$005A6834 0f8e29120000 jle $005A7A63` → routine epilogue
  (`5f 5e 5b 8be5 5d c20400`: pop EDI/ESI/EBX, restore frame, `ret 4`).
- `$005A6870 0f85e1110000 jne $005A7A57` → second-loop `Continue` tail.
- `$005A687A 7432 je $005A68AE` → location-filter test.
- `$005A68A8 0f84a9110000 je $005A7A57` → second-loop `Continue` tail.
- `$005A68B2 0f849c000000 je $005A6954` → aura-count read.
- `$005A68E6 0f856b110000 jne $005A7A57` → second-loop `Continue` tail.
- `$005A691A 0f8537110000 jne $005A7A57` → second-loop `Continue` tail.
- `$005A694E 0f8503110000 jne $005A7A57` → second-loop `Continue` tail.
- `$005A695D 0f8e7c060000 jle $005A6FDF` → the next scoped block; skips only
  this unit's aura pass.
- `$005A69C7 0f8506060000 jne $005A6FD3` → aura-loop counters.
- `$005A69E9 0f84e4050000 je $005A6FD3` → aura-loop counters.
- `$005A6A26 0f87a7050000 ja $005A6FD3` → empty default case.
- `$005A6B1F 7e4a jle $005A6B6B` → kind-1 ranged gate, a sibling of its
  attack rider.
- `$005A6B97 0f8e36040000 jle $005A6FD3` → aura-loop counters.
- `$005A6C42 0f8e8b030000 jle $005A6FD3` → aura-loop counters.
- `$005A6CF0 0f84dd020000 je $005A6FD3` → aura-loop counters.
- `$005A6D2C 0f8ea1020000 jle $005A6FD3` → aura-loop counters.
- `$005A6D94 0f8539020000 jne $005A6FD3` → aura-loop counters.
- `$005A6E8C 0f8e41010000 jle $005A6FD3` → aura-loop counters.
- `$005A6EE3 0f85ea000000 jne $005A6FD3` → aura-loop counters.
- `$005A6F15 7e4a jle $005A6F61` → kind-9 ranged eligibility; it is a
  sibling of the attack rider.
- `$005A6F6E 7563 jne $005A6FD3` → aura-loop counters when ranged is magical.
- `$005A6F77 7e5a jle $005A6FD3` → aura-loop counters when ranged is absent.
- `$005A6FD9 0f858ef9ffff jne $005A696D` → next aura entry.

### `unitonoverlandtile` — 7

- `$005D8CC9 7530 jne $005D8CFB` → False.
- `$005D8CD1 7510 jne $005D8CE3` → alternate-coordinate tests.
- `$005D8CD9 7508 jne $005D8CE3` → alternate-coordinate tests.
- `$005D8CE1 741c je $005D8CFF` → True.
- `$005D8CE9 7510 jne $005D8CFB` → False.
- `$005D8CF1 7508 jne $005D8CFB` → False.
- `$005D8CF9 7504 jne $005D8CFF` → True: alternate coordinates require a
  plane different from `BaseUnits[u].plane`.

### `Ismagicalranged` — 2

- `$00596401 7d06 jge $00596409` → checked table addressing.
- `$0059642D 7406 je $00596435` → store False; fall-through `$0059642F
  c645fb01` stores True.

## Indirect dispatch

`$005A6A23 83f80a cmp eax,$0A` / `$005A6A26 0f87a7050000 ja $005A6FD3`
guards `$005A6A2C ff2485336a5a00 jmp dword ptr [eax*4+$005A6A33]`.
The 11 dwords at `$005A6A33..$005A6A5F` are data, not instructions:

```text
d3 6f 5a 00  5f 6a 5a 00  3b 6c 5a 00  ec 6b 5a 00  97 6c 5a 00  e6 6c 5a 00
25 6d 5a 00  4e 6d 5a 00  d3 6f 5a 00  d9 6e 5a 00  8a 6d 5a 00
```

| Kind | Target | Complete body extent |
|---:|---:|---:|
| 0 | `$005A6FD3` | empty |
| 1 | `$005A6A5F` | `$005A6A5F..$005A6BEC` |
| 2 | `$005A6C3B` | `$005A6C3B..$005A6C97` |
| 3 | `$005A6BEC` | `$005A6BEC..$005A6C3B` |
| 4 | `$005A6C97` | `$005A6C97..$005A6CE6` |
| 5 | `$005A6CE6` | `$005A6CE6..$005A6D25` |
| 6 | `$005A6D25` | `$005A6D25..$005A6D4E` |
| 7 | `$005A6D4E` | `$005A6D4E..$005A6D8A` |
| 8 | `$005A6FD3` | empty |
| 9 | `$005A6ED9` | `$005A6ED9..$005A6FD3` |
| 10 | `$005A6D8A` | `$005A6D8A..$005A6ED9` |

## Call inventory

| Address | Bytes | Target | Arguments |
|---:|---|---|---|
| `$005A6822` | `e8a50effff` | `@Units@BuildAuraTable`, `$005976CC` | none |
| `$005A69E2` | `e8b9220300` | `@Map@unitonoverlandtile`, `$005D8CA0` | EAX=i, EDX=plane, ECX=x, pushed y |
| `$005A6F67` | `e888f4feff` | `@Units@Ismagicalranged`, `$005963F4` | EAX=`U.rangedtype` |

The other extents contain no non-guard calls.

## Arithmetic idioms

The SmallInt additions use a temporary bias solely for the signed range check. The
first of 14 instances is quoted in full:

```text
5A6A72  8b45b0          mov eax,[ebp-$50]
5A6A75  0fbf80c0060000  movsx eax,word ptr [eax+$6C0]
5A6A7C  8b55b4          mov edx,[ebp-$4C]
5A6A7F  034210          add eax,[edx+$10]
5A6A82  7105            jno $005A6A89
5A6A84  e85f04e6ff      call @System@@IntOver
5A6A89  0500800000      add eax,$8000
5A6A8E  3dffff0000      cmp eax,$FFFF
5A6A93  7605            jbe $005A6A9A
5A6A95  e84604e6ff      call @System@@BoundErr
5A6A9A  050080ffff      add eax,$FFFF8000
5A6A9F  8b55b0          mov edx,[ebp-$50]
5A6AA2  668982c0060000  mov word ptr [edx+$6C0],ax
```

The two bias additions cancel. The other correction/store anchors are `$005A6AD3`,
`$005A6B4B`, `$005A6BC7`, `$005A6C16`, `$005A6C72`, `$005A6CC1`, `$005A6D65`,
`$005A6DBC`, `$005A6DFE`, `$005A6E40`, `$005A6EB4`, `$005A6F41`, `$005A6FB3`.

Kind 9 divides the aura value twice using Delphi signed `div 2`, including the
negative-value correction; these are not bare arithmetic shifts:

```text
5A6F7F  d1f8    sar eax,1
5A6F81  7903    jns $005A6F86
5A6F83  83d000  adc eax,0
5A6F86  014224  add dword ptr [edx+$24],eax

5A6FA3  d1fa    sar edx,1
5A6FA5  7903    jns $005A6FAA
5A6FA7  83d200  adc edx,0
5A6FAA  03c2    add eax,edx
```

## State-write inventory

The 46 semantic unit-record writes are all rendered: 16 in the first-pass tail and
30 in the aura switch. First-tail writes are `$005A6616,$005A6629,$005A665D,
$005A668D,$005A66BD,$005A66ED,$005A671D,$005A674D,$005A677D,$005A67AD,
$005A67BE,$005A67CF,$005A67E0,$005A67F1,$005A6802,$005A6813`.

Aura writes are `$005A6A68,$005A6AA2,$005A6AB2,$005A6AEC,$005A6B2A,
$005A6B64,$005A6BA6,$005A6BE0,$005A6BF5,$005A6C2F,$005A6C51,$005A6C8B,
$005A6CA0,$005A6CDA,$005A6CFF,$005A6D12,$005A6D3B,$005A6D7E,$005A6D9D,
$005A6DD5,$005A6DDF,$005A6E17,$005A6E21,$005A6E59,$005A6E95,$005A6ECD,
$005A6F20,$005A6F5A,$005A6F89,$005A6FCC`.

The source also represents loop and cache writes at `$005A6607,$005A6816,
$005A6819,$005A683A,$005A683D,$005A6963,$005A6966,$005A6992,$005A6A1A,
$005A6FD3,$005A6FD6`, either explicitly or as compiler-only addressing. The linear
checker reports five phantom writes at `$005A6A36,$005A6A3A,$005A6A5A,$005A6A71,
$005A6A7A` because it decodes the jump-table bytes as instructions; those addresses
are accounted for by the raw table above. It also misses the real `$005A6A68` write
until disassembly is re-anchored at `$005A6A5F`.

## Coverage ledgers

### `$005A65DC..$005A681C`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005A65DC` | `$005A660A` | — | compiler-only | checked Units address |
| 1 | `$005A660A` | `$005A6630` | — | reconstructed | common hitchance clamps |
| 2 | `$005A6630` | `$005A6660` | — | reconstructed | ranged upper clamp |
| 3 | `$005A6660` | `$005A6690` | — | reconstructed | melee upper clamp |
| 4 | `$005A6690` | `$005A66C0` | — | reconstructed | thrown upper clamp |
| 5 | `$005A66C0` | `$005A66F0` | — | reconstructed | breath upper clamp |
| 6 | `$005A66F0` | `$005A6720` | — | reconstructed | ranged lower clamp |
| 7 | `$005A6720` | `$005A6750` | — | reconstructed | melee lower clamp |
| 8 | `$005A6750` | `$005A6780` | — | reconstructed | thrown lower clamp |
| 9 | `$005A6780` | `$005A67B0` | — | reconstructed | breath lower clamp |
| 10 | `$005A67B0` | `$005A67C1` | — | reconstructed | defense floor |
| 11 | `$005A67C1` | `$005A67D2` | — | reconstructed | attack floor |
| 12 | `$005A67D2` | `$005A67E3` | — | reconstructed | ranged floor |
| 13 | `$005A67E3` | `$005A67F4` | — | reconstructed | thrown floor |
| 14 | `$005A67F4` | `$005A6805` | — | reconstructed | fire-breath floor |
| 15 | `$005A6805` | `$005A6816` | — | reconstructed | lightning-breath floor |
| 16 | `$005A6816` | `$005A681C` | — | reconstructed | first-loop counters |

### `$005A6822..$005A6FDF`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005A6822` | `$005A6844` | — | reconstructed | BuildAuraTable and loop entry |
| 1 | `$005A6844` | `$005A68AE` | 0 | reconstructed | dead/combat filters |
| 2 | `$005A68AE` | `$005A6954` | 1 | reconstructed | optional location filters |
| 3 | `$005A6954` | `$005A696D` | 2 | reconstructed | aura-count gate/loop entry |
| 4 | `$005A696D` | `$005A69CD` | 3 | reconstructed | aura address and owner gate |
| 5 | `$005A69CD` | `$005A6A2C` | 4 | reconstructed | tile gate, cached Units pointer, kind load |
| 6 | `$005A6A2C` | `$005A6FD3` | 5 | reconstructed | complete mutually exclusive case switch |
| 7 | `$005A6FD3` | `$005A6FD9` | 3 | reconstructed | aura-loop counters |
| 8 | `$005A6FD9` | `$005A6FDF` | 3 | reconstructed | aura-loop back edge |

### `$005D8CA0..$005D8D07`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005D8CA0` | `$005D8CC2` | — | compiler-only | prologue and BaseUnits address |
| 1 | `$005D8CC2` | `$005D8D01` | — | reconstructed | both coordinate predicates and results |
| 2 | `$005D8D01` | `$005D8D07` | — | compiler-only | epilogue and `ret 4` |

### `$005963F4..$00596440`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005963F4` | `$005963FD` | — | compiler-only | prologue/argument spill |
| 1 | `$005963FD` | `$00596439` | — | reconstructed | low guard, table read, result stores |
| 2 | `$00596439` | `$00596440` | — | compiler-only | result load/epilogue |

## Completion declarations

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Verification totals across the four extents are 49 semantic conditional jumps
(`16+24+7+2`), 3 semantic calls and 57 checker-counted named-field writes, all
accounted for. The raw jump-table and state-write reconciliation above explain why
the checker's linear write count is not the semantic unit-write subtotal.
