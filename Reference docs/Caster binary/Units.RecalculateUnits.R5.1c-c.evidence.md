# Aura-table helpers R5.1c-c reconstruction evidence

This is the durable evidence companion for the source-shaped R5.1c-c reconstruction in
`Units.RecalculateUnits.pas`. It covers these assigned half-open extents:

- `@Units@BuildAuraTable`: `$005976CC..$00597F4F`
- `@Units@AddtoAuraTable`: `$005973A4..$005976C9`
- `@Heroes@HeroBonus`: `$005933E8..$005934DB`

The binary identity remains solely in `README.md`. Provenance: Codex cold-derived all three
extents on 2026-08-02, then re-read their raw instruction streams in a byte-level self-audit
requested by the user. No actionable defect was found. The required independent Claude
derivation and formal review were not available. The user directed completion on 2026-08-02
with that limitation retained explicitly in the durable provenance. The formal review was
completed afterwards: Claude 2026-08-03 re-read all three extents cold from the binary and found
no semantic misreading; the two documentation defects it raised are fixed here and in
`Units.RecalculateUnits.pas`. This remains a **single** derivation reviewed, not two independent
derivations.

Verified: Codex 2026-08-02, single-agent derivation + self-audit; Claude 2026-08-03, reviewed
($00593406, $00597984, $005979A8, $005979BD, $00597696).

## Entry and enclosing gates

`annotate_caster_disasm.py --inbound` found no branch straddling any whole assigned extent. All
three are complete TD32-named routines. Internal nesting is preserved in the ledgers below.

## Recovered bindings

Unit offsets are direct displacement-minus-base results (`$06426898` for `Units`, `$01AC1798`
for `BaseUnits`); names and types are from shipped `Typedec.pas`:

| Field | Offset | Type | Anchor |
|---|---:|---|---:|
| `ResistToAll` | `+$03C4` | ShortInt | `$0059784F` |
| `HolyBonus` | `+$03C5` | ShortInt | `$0059774E` |
| `EnchantmentFlags[EncMisfortune]` | `+$0542` | Boolean | `$005977E2` |
| `ishero` | `+$00E2` | Boolean | `$005978E3` |
| `level` | `+$04FD` | ShortInt | `$005979E2` |
| `plane` / `overlandx` / `overlandy` | `+$04DC` / `+$04AC` / `+$04B0` | Integer | `$00597524` / `$00597575` / `$005975C6` |
| `owner` | `+$0699` | ShortInt | `$00597475` / `$00597941` |
| `dead` | `+$069E` | Boolean | `$0059771C` |
| `herotype` | `+$06B0` | SmallInt | `$00597970` |

The aura table pointer at `$00709BF4` addresses 10,000 24-byte entries. The bounds idiom is
`dec; cmp $270F`, and each entry is six dwords in the order `{plane, x, y, kind, value, owner}`.
The count pointer is loaded from `$00707FA8`.

`Typedec.pas:71` declares `WizardT.Hero` as `array[1..85] of array[1..50] of Integer`. The
executable's binding, with both declared bounds recovered from their guards:

```text
$00597984 83f80d            cmp  eax,$0D          ; owner, no dec: bound 0..13
$0059798E 69c097290300      imul eax,eax,$32997   ; *8 index scale => stride 1,658,040
$005979A8 83fa54            dec / cmp edx,$54     ; herotype: bound 1..85
$005979BD 8b8cd034a70800    mov  ecx,[eax+edx*8+$0008A734]
```

The hero-type stride is `$19 * 8 = 200` and the ability displacement `$0008A724 + ability*4`;
`$005979BD` therefore reads `$0008A734`, the `HADivineBarrier` (4) element, and the `Hero` field
itself begins at wizard `+$0008A7F0`. `HeroAbilityT` has a nine-dword stride at `$007086C8`; its
`bonusmul` and `bonusdiv` fields are at +$08 and +$0C, and its own bound is proved by
`$00593406 83f831` (`dec; cmp eax,$31`), matching the shipped
`maxmaxheroability = 50`.

## Conditional-branch targets

Every semantic conditional is listed with encoded bytes, literal target, and what begins there.
Compiler range and overflow guards are excluded.

### `@Units@AddtoAuraTable` — 6

- `$005973CE 3b45f0` / `$005973D1 0f8c06010000 jl $005974DD` -> scan exhausted; begin append/existing decision.
- `$0059744F 84c0` / `$00597451 0f8465ffffff je $005973BC` -> tile mismatch; increment `i` and retry.
- `$005974A5 3b44d1fc` / `$005974A9 0f850dffffff jne $005973BC` -> current owner differs from entry owner; increment and retry.
- `$005974D4 3b45f8` / `$005974D7 0f85dffeffff jne $005973BC` -> aura kind differs; increment and retry.
- `$005974E4 3b45f0` / `$005974E7 0f8d84010000 jge $00597671` -> existing entry found; skip append and begin maximum merge.
- `$00597696 3b45f4` / `$00597699 7d28 jge $005976C3` -> stored value is already at least `val`; return without replacement.

### `@Heroes@HeroBonus` — 2

- `$005933FC 837df401` / `$00593400 755d jne $0059345F` -> skip the normal formula and begin the independent super-level test.
- `$0059345F 837df402` / `$00593463 756f jne $005934D4` -> skip the super formula and return `Result`.

### `@Units@BuildAuraTable` — 16

- `$005976E6 85c0` / `$005976E8 0f8e5d080000 jle $00597F4B` -> non-positive unit count; epilogue.
- `$0059771C 80bc82361eac0100` / `$00597724 0f8515080000 jne $00597F3F` -> dead base unit; loop advance.
- `$0059774E 80bc825d6c420600` / `$00597756 7e66 jle $005977BE` -> calculated Holy Bonus non-positive; Misfortune test.
- `$005977E2 80bc82da6d420600` / `$005977EA 743f je $0059782B` -> Misfortune clear; Resist-to-All test.
- `$0059784F 80bc825c6c420600` / `$00597857 7e66 jle $005978BF` -> calculated Resist to All non-positive; hero eligibility.
- `$005978E3 80bc827a18ac0100` / `$005978EB 0f844e060000 je $00597F3F` -> not a base hero; loop advance.
- `$00597915 80bc82361eac0100` / `$0059791D 0f851c060000 jne $00597F3F` -> repeated dead test true; loop advance.
- `$005979FD 837df800` / `$00597A01 7e3d jle $00597A40` -> Divine Barrier result non-positive; Guiding Beacon.
- `$00597ABC 837df800` / `$00597AC0 7e3d jle $00597AFF` -> Guiding Beacon result non-positive; Soul Linker.
- `$00597B7B 837df800` / `$00597B7F 7e3d jle $00597BBE` -> Soul Linker result non-positive; Supply Commander.
- `$00597BFA 83bcd040a7080000` / `$00597C02 7e3f jle $00597C43` -> Supply Commander level non-positive; Logistics.
- `$00597CBF 837df800` / `$00597CC3 7e3d jle $00597D02` -> Logistics result non-positive; Prayermaster.
- `$00597D7E 837df800` / `$00597D82 7e3d jle $00597DC1` -> Prayermaster result non-positive; Armsmaster.
- `$00597E3D 837df800` / `$00597E41 7e3d jle $00597E80` -> Armsmaster result non-positive; Leadership.
- `$00597EFC 837df800` / `$00597F00 7e3d jle $00597F3F` -> Leadership result non-positive; loop advance.
- `$00597F42 ff4dec` / `$00597F45 0f85adf7ffff jne $005976F8` -> cached count remains; next unit iteration.

## Semantic calls

| Address | Bytes | Target | Role |
|---:|---|---|---|
| `$0059744A` | `e851180400` | `@Map@unitonoverlandtile` `$005D8CA0` | match the source against an entry tile |
| `$005977B9` | `e8e6fbffff` | `@Units@AddtoAuraTable` | Holy Bonus |
| `$00597826` | `e879fbffff` | `@Units@AddtoAuraTable` | Misfortune |
| `$005978BA` | `e8e5faffff` | `@Units@AddtoAuraTable` | Resist to All as aura kind 3 |
| `$005979F5` | `e8eeb9ffff` | `@Heroes@HeroBonus` | Divine Barrier value |
| `$00597A3B` | `e864f9ffff` | `@Units@AddtoAuraTable` | Divine Barrier entry |
| `$00597AB4` | `e82fb9ffff` | `@Heroes@HeroBonus` | Guiding Beacon value |
| `$00597AFA` | `e8a5f8ffff` | `@Units@AddtoAuraTable` | Guiding Beacon entry |
| `$00597B73` | `e870b8ffff` | `@Heroes@HeroBonus` | Soul Linker value |
| `$00597BB9` | `e8e6f7ffff` | `@Units@AddtoAuraTable` | Soul Linker entry |
| `$00597C3E` | `e861f7ffff` | `@Units@AddtoAuraTable` | Supply Commander literal-2 entry |
| `$00597CB7` | `e82cb7ffff` | `@Heroes@HeroBonus` | Logistics value |
| `$00597CFD` | `e8a2f6ffff` | `@Units@AddtoAuraTable` | Logistics entry |
| `$00597D76` | `e86db6ffff` | `@Heroes@HeroBonus` | Prayermaster value |
| `$00597DBC` | `e8e3f5ffff` | `@Units@AddtoAuraTable` | Prayermaster entry |
| `$00597E35` | `e8aeb5ffff` | `@Heroes@HeroBonus` | Armsmaster value |
| `$00597E7B` | `e824f5ffff` | `@Units@AddtoAuraTable` | Armsmaster entry |
| `$00597EF4` | `e8efb4ffff` | `@Heroes@HeroBonus` | Leadership value |
| `$00597F3A` | `e865f4ffff` | `@Units@AddtoAuraTable` | Leadership entry |

## Arithmetic and state writes

`HeroBonus` normal-level arithmetic is:

```text
$00593421 8b4482e4  load bonusmul
$00593425 f76dfc    multiply by level
$00593448 8b4c91e8  load bonusdiv
$00593452 99        cdq
$00593453 f7f9      idiv ecx
$00593455 0145f0    add quotient to Result
```

The super-level path is:

```text
$00593484 6b4482e403  bonusmul * 3
$00593490 f76dfc      multiply by level
$005934B9 6b5491e802  bonusdiv * 2
$005934C5 8bca        mov ecx,edx
$005934C7 99          cdq
$005934C8 f7f9        idiv ecx
$005934CA 0145f0      add quotient to Result
```

Both divisions are signed and truncate toward zero. The two formula tests are independent, not
an `else if` in the executable.

Persistent aura writes in `AddtoAuraTable`, in order:

| Address | Bytes | Write |
|---:|---|---|
| `$005974F2` | `830001` | increment aura count |
| `$00597553` | `8944d1e8` | new entry `.plane` |
| `$005975A4` | `8944d1ec` | new entry `.x` |
| `$005975F5` | `8944d1f0` | new entry `.y` |
| `$0059761D` | `894cc2f4` | new entry `.kind` |
| `$00597645` | `894cc2fc` | new entry `.owner := ow` |
| `$0059766D` | `894cc2f8` | new entry `.value := val` |
| `$005976BF` | `894cc2f8` | replace `.value` when `val` is larger |

`BuildAuraTable` resets the persistent count at `$005976D9 8910`. All other persistent writes
occur through the real, fully reconstructed helper. `HeroBonus` writes local `Result` at
`$005933F9`, `$00593455`, and `$005934CA`.

Two oddities are intentional and byte-backed. The aura search compares `Units[uid].owner` with
an existing entry, while the separate `ow` parameter is only stored on append. Holy Bonus and
Resist to All are gated by their calculated `Units` fields at `$0059774E` and `$0059784F`, but
their contributed magnitudes are read from `BaseUnits` at `$005977A3` and `$005978A4`.

## Coverage ledgers

### `@Units@AddtoAuraTable`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005973A4` | `$005973B3` | — | compiler-only | prologue and register spills |
| 1 | `$005973B3` | `$005974DD` | — | reconstructed | initialized short-circuiting scan and mismatch loop |
| 2 | `$005974DD` | `$005974ED` | — | reconstructed | existing-versus-append decision |
| 3 | `$005974ED` | `$00597671` | 2 | reconstructed | append and initialize new entry |
| 4 | `$00597671` | `$005976C3` | — | reconstructed | maximum-value merge |
| 5 | `$005976C3` | `$005976C9` | — | compiler-only | epilogue and stack cleanup |

### `@Heroes@HeroBonus`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005933E8` | `$005933F7` | — | compiler-only | prologue and register spills |
| 1 | `$005933F7` | `$0059345F` | — | reconstructed | result initialization and normal formula |
| 2 | `$0059345F` | `$005934D4` | — | reconstructed | independent super formula |
| 3 | `$005934D4` | `$005934DB` | — | compiler-only | result load and epilogue |

### `@Units@BuildAuraTable`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005976CC` | `$005976D2` | — | compiler-only | prologue |
| 1 | `$005976D2` | `$005976F8` | — | reconstructed | clear count, positive-count gate and loop setup |
| 2 | `$005976F8` | `$00597F3F` | 1 | reconstructed | complete per-unit aura collection in executable order |
| 3 | `$00597F3F` | `$00597F4B` | 1 | reconstructed | loop counters and back edge |
| 4 | `$00597F4B` | `$00597F4F` | — | compiler-only | epilogue |

## Completion declarations

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Totals: 24 semantic conditional jumps, 19 semantic calls, eight persistent aura-table/count
writes in `AddtoAuraTable`, one persistent count reset in `BuildAuraTable`, and all three local
`HeroBonus` result writes.
