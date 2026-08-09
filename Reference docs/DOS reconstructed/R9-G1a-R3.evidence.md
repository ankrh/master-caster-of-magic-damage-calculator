# R9-G1a-R3 — CoM 1 Zombies type-table binding

The merged source-shaped binding is in `unitcalc.c`. This item locates CoM 1's full
`unit_types` record base and stride, binds only type `0xAE` Zombies' `Abilities` word, and
connects that word to the already reconstructed full-word copy in `BU_Construct`. Calculator
behavior and calculator provenance promotion are outside this reconstruction.

The executable hash was checked against the canonical value in `MoM binary analysis.md`,
*The binaries*, before either derivation read these offsets.

## Merged reconstruction

`BU_Construct` obtains the persistent unit type and reaches the table as follows:

```c
ax = si;                                      /* com1:0x8EE92  8B C6 */
cl = 5;                                       /* com1:0x8EE94  B1 05 */
ax <<= cl;                                    /* com1:0x8EE96  D3 E0 */
u = *(struct s_UNIT far **)dseg(0x9EC2);       /* com1:0x8EE98  C4 1E C2 9E */
u = (struct s_UNIT far *)((uint8_t far *)u + ax);
                                              /* com1:0x8EE9C  03 D8 */
type = (uint8_t)u->type;                       /* com1:0x8EE9E  26 8A 47 05 */
ax = type;                                     /* com1:0x8EEA2  B4 00 */

if (type == COM1_UT_CATAPULT) {                /* raw 0x25; com1:0x8EEA4  3C 25;
                                                 com1:0x8EEA6  75 0C -> 0x8EEB4,
                                                 the record-address calculation */
    if (u->wp == COM1_CATAPULT_MAGIC_WP) {     /* raw 9; com1:0x8EEA8  26 80 7F 02 09;
                                                 com1:0x8EEAD  75 05 -> 0x8EEB4,
                                                 the record-address calculation */
        u->mutations = UM_MAGIC_WEAPONS;       /* raw 1; com1:0x8EEAF  26 C6 47 17 01 */
    }
}

dx = UNIT_TYPES_STRIDE;                        /* raw 0x24; com1:0x8EEB4  BA 24 00 */
/* Signed one-operand `imul` writes DX:AX. `mov ah,0` at 0x8EEA2 restricts AX to
   0..255, so AX*36 is 0..9180 and signed/unsigned readings have the same low word. */
DX_AX = (int16_t)ax * (int16_t)dx;              /* com1:0x8EEB7  F7 EA */
bx = ax;                                       /* com1:0x8EEB9  8B D8 */
ah = 0;                                        /* com1:0x8EEBB  32 E4; zeroes the high
                                                 byte for subsequent byte loads */
push(bx);                                      /* com1:0x8EEBD  53 */
move_flags_lo = *(uint8_t *)dseg(0x019C + bx + 0x18);
                                              /* com1:0x8EEBE  8A 87 B4 01 */
push(move_flags_lo);                           /* com1:0x8EEC2  50 */
abilities = *(uint16_t *)dseg(0x019C + bx + 0x1E);
                                              /* com1:0x8EEC3  8B 87 BA 01 */
push(abilities);                               /* com1:0x8EEC7  50 */
```

The remaining pushes and reverse pops are already rendered in `unitcalc.c`. They route the word
loaded at `0x8EEC3` to:

```c
bu->Abilities = unit_types[type].Abilities;   /* com1:0x8EF02  26 89 47 1C */
```

The source word bound by this item is:

```c
#define UNIT_TYPES_DSEG_BASE        0x019C
#define UNIT_TYPES_STRIDE           0x24
#define UT_OFF_ABILITIES            0x1E
#define COM1_UT_ZOMBIES             0xAE
#define UA_FANTASTIC                0x0001
#define UA_CREATE_UNDEAD            0x0080
#define COM1_UT_ZOMBIES_ABILITIES   (UA_FANTASTIC | UA_CREATE_UNDEAD) /* raw 0x0081;
                                      file com1:0x2AED2  81 00 */
```

## Locate method and address arithmetic

1. `0x8EE9E` reads the one-byte `_UNITS[si].type`; `0x8EEA2` zero-extends it. The signed
   `imul` at `0x8EEB7` uses the literal stride `0x24` loaded at `0x8EEB4`.
2. Full `unit_types` records start at `DS:0x019C` / raw `0x2963C`. Their word name pointer is
   record `+0x00`; the first stat is at `DS:0x019E`, two bytes into the record. Thus the older
   `DS:0x019E` anchor is the stat-payload base, not a conflicting full-record base.
3. The target record starts at
   `0x2963C + 0xAE * 0x24 = 0x2AEB4`. Its name pointer is `0x257A`, which resolves under the
   established DOS data mapping to `Zombies`.
4. `0x8EEC3` reads `DS:[bx+0x1BA]`; `0x1BA - 0x019C = 0x1E`, the record's `Abilities`
   offset. The target word is therefore raw `0x2AEB4 + 0x1E = 0x2AED2`, bytes `81 00`.
5. The checked-in R9-G1a-R1 write at `com1:0x75D6C` (`26 80 4F 1C 01`) establishes
   `UA_FANTASTIC = 0x0001` on the same battle-unit field. The binary's Abilities name/mask
   record at raw `0x2CFD8` assigns `0x0080` to `Create Undead`. The mask expansion is
   `0x0001 | 0x0080 = 0x0081`.
6. The LIFO import sequence ends at the CoM-only word store `0x8EF02` (`26 89 47 1C`), so both
   bytes of the source word reach `bu->Abilities`. CP 1.60's counterpart is a byte store and is
   not part of this CoM-only table-row binding.

## Code coverage ledger — `com1` `[0x8EE92, 0x8EF0D)`

Rows are half-open. They match the already reconstructed constructor boundaries.

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | com1 | `0x8EE92` | `0x8EEB4` | — | reconstructed | `_UNITS[si]` address, type load and Catapult mutation gate |
| 1 | com1 | `0x8EEB4` | `0x8EEBD` | — | compiler-only | `type * 0x24` record-address calculation and byte-load preparation |
| 2 | com1 | `0x8EEBD` | `0x8EEE2` | — | reconstructed | type-table reads including full-word `Abilities`, plus `resist` store |
| 3 | com1 | `0x8EEE2` | `0x8EF0D` | — | reconstructed | reverse-pop masked imports and full-word `Abilities` copy |

## Raw-data coverage ledgers

These are byte-data extents, not code. The `data` key keeps them separate from the executable
instruction checker. Every opened range is tiled without gaps.

### D1 — type records 172–176, `[0x2AE6C,0x2AF20)`

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | data | `0x2AE6C` | `0x2AE90` | — | reconstructed | type 172, name pointer `0x2561` → `Death Knights` |
| 1 | data | `0x2AE90` | `0x2AEB4` | — | reconstructed | type 173, name pointer `0x256F` → `Demon Lord` |
| 2 | data | `0x2AEB4` | `0x2AED8` | — | reconstructed | type 174 Zombies; target record |
| 3 | data | `0x2AED8` | `0x2AEFC` | — | reconstructed | type 175, name pointer `0x2582` → `Unicorns` |
| 4 | data | `0x2AEFC` | `0x2AF20` | — | reconstructed | type 176, name pointer `0x258B` → `Guardian Spirit` |

### D2 — table origin, `[0x2963C,0x2963E)`

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | data | `0x2963C` | `0x2963E` | — | reconstructed | type 0 name pointer `0x21D3` → `Dwarf` |

### D3 — Abilities name/mask table and upper bound, `[0x2CFA8,0x2D028)`

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | data | `0x2CFA8` | `0x2D020` | — | reconstructed | fifteen Abilities records, masks `0x0002` through `0x8000`; no `0x0001` row |
| 1 | data | `0x2D020` | `0x2D028` | — | reconstructed | first Attribs_1 record, `Lucky`, bounds the preceding table |

### D4 — names for D1, `[0x2BA01,0x2BA3B)`

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | data | `0x2BA01` | `0x2BA0F` | — | reconstructed | `Death Knights` |
| 1 | data | `0x2BA0F` | `0x2BA1A` | — | reconstructed | `Demon Lord` |
| 2 | data | `0x2BA1A` | `0x2BA22` | — | reconstructed | `Zombies` |
| 3 | data | `0x2BA22` | `0x2BA2B` | — | reconstructed | `Unicorns` |
| 4 | data | `0x2BA2B` | `0x2BA3B` | — | reconstructed | `Guardian Spirit` |

### D5 — name for D2, `[0x2B673,0x2B679)`

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | data | `0x2B673` | `0x2B679` | — | reconstructed | `Dwarf` |

### D6 — Create Undead name, `[0x2D54D,0x2D55B)`

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | data | `0x2D54D` | `0x2D55B` | — | reconstructed | `Create Undead` |

### D7 — Negate First Strike name, `[0x2D5B4,0x2D5C8)`

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | data | `0x2D5B4` | `0x2D5C8` | — | reconstructed | `Negate First Strike` |

### D8 — Lucky name, `[0x2D5C8,0x2D5CE)`

| N | build | Start | End | Within | Disposition | Title |
|---|---|---|---|---|---|---|
| 0 | data | `0x2D5C8` | `0x2D5CE` | — | reconstructed | `Lucky` |

## Target record decode

The full target record `[0x2AEB4,0x2AED8)` is:

```text
7A 25 04 00 FF 00 01 03 03 02 46 00 00 14 06 00 00 00
03 01 00 06 00 00 00 00 58 00 00 08 81 00 00 00 96 00
```

| Record offset | File | Bytes | Field | Value |
|---|---|---|---|---|
| `+0x00` | `0x2AEB4` | `7A 25` | name pointer | `0x257A` → `Zombies` |
| `+0x02` | `0x2AEB6` | `04` | Melee | 4 |
| `+0x07` | `0x2AEBB` | `03` | Defense | 3 |
| `+0x08` | `0x2AEBC` | `03` | Resist | 3 |
| `+0x1A` | `0x2AECE` | `58 00` | Attribs_1 | `0x0058` |
| `+0x1E` | `0x2AED2` | `81 00` | Abilities | `0x0081` |

## Branch, call and state-write inventories

| Address | Bytes | Instruction | Target and target contents |
|---|---|---|---|
| `0x8EEA6` | `75 0C` | `jne` | `0x8EEB4`, `mov dx,0x24`; skips Catapult mutation write |
| `0x8EEAD` | `75 05` | `jne` | `0x8EEB4`, `mov dx,0x24`; skips Catapult mutation write |

The code extent contains no call, `lcall`, `INT 3Fh` thunk, loop edge or return.

| Address | Bytes | State write |
|---|---|---|
| `0x8EEAF` | `26 C6 47 17 01` | persistent `_UNITS[si].mutations = UM_MAGIC_WEAPONS` |
| `0x8EEDE` | `26 88 47 06` | `bu->resist` |
| `0x8EEE6` | `26 80 67 1A D7` | `bu->Attribs_2` keep mask |
| `0x8EEEB` | `26 08 47 1A` | `bu->Attribs_2` imported bits |
| `0x8EEF3` | `26 80 67 19 FE` | `bu->Attribs_1` high-byte keep mask |
| `0x8EEF8` | `26 08 47 19` | `bu->Attribs_1` imported high bit |
| `0x8EEFD` | `26 88 47 18` | `bu->Attribs_1` low byte |
| `0x8EF02` | `26 89 47 1C` | full-word `bu->Abilities` copy |
| `0x8EF07` | `26 88 47 16` | `bu->Move_Flags` low byte |

## Completion counts

```text
unresolved ranges:                  0
synthetic helpers without bodies:   0
semantic conditional jumps omitted: 0
semantic calls omitted:             0
state writes omitted:               0
```

`verify_dos_derivation.py` passes the code ledger together with `unitcalc.c`: two semantic
conditional jumps, zero calls and nine named-field writes are all represented. The data ledgers
are inspected as byte ranges rather than disassembled as 16-bit code.

## Merged findings

### The full table base and the stat-payload base are two bytes apart

The full CoM 1 `unit_types` record base is `DS:0x019C` / raw `0x2963C`. Record `+0x00` is a
word pointer to the type's name, and record `+0x02` is Melee. The previously recorded
`DS:0x019E` / raw `0x2963E` figure is therefore the first-stat payload base, not a competing
full-record base. Records are `0x24` bytes and the constructor indexes them with the
zero-extended `_UNITS[].type` byte (`0x8EE9E`–`0x8EEB9`).

### CoM 1 Zombies carry `Abilities = 0x0081` in the table

Type `0xAE` begins at raw `0x2AEB4`; its name pointer resolves to `Zombies`. Its `Abilities`
word is record `+0x1E`, raw `0x2AED2`, bytes `81 00`. The word expands to `UA_FANTASTIC |
UA_CREATE_UNDEAD` (`0x0001 | 0x0080`).

### `BU_Construct` copies the entire Zombies word

The constructor's `0x8EEC3` instruction loads the 16-bit table word and the LIFO import sequence
feeds it to `0x8EF02`, whose `89` opcode stores a full word to battle-unit `Abilities +0x1C`.
This item records the source value and linkage; it does not promote `identity:zombies` or alter
calculator behavior.

## Disputed evidence scope

The review round left one scope disagreement, with no disagreement about any byte or mechanic:

- Codex: “Retain only raw `[0x2AED2,0x2AED4)` (`81 00`) for the target value” and cite the
  checked-in mapping, ability names and prior identity evidence; D1–D8 exceed a row frozen to
  “only” the Zombies Abilities word.
- Claude: “Restricting the read to the two target bytes is exactly the position that produced the
  wrong record base”; the neighbouring name-pointer rows, table origin, mask-table bound and
  selected strings are the minimum evidence that independently locates the row and distinguishes
  the full base from the stat-payload base.

The union is retained above with every opened data extent ledgered. Q26 records the unresolved
scope/representation choice. It does not affect the three merged findings.

## Provenance

Verified: Claude 2026-08-09; Codex 2026-08-09, independent. Both derivations were subsequently
reviewed byte-for-byte. The sole surviving review dispute concerns evidence extent selection,
not the executable result.
