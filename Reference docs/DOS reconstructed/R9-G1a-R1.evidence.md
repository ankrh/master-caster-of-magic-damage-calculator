# R9-G1a-R1 merged evidence — `BU_UnitLoadToBattle`

Complete reconstruction of the overlay-98 routine identified by the ReMoM orientation name
`BU_UnitLoadToBattle__SEGRAX` (`WZD o98p15`) over the half-open extent
`[0x75C69, 0x75D93)` in all three pinned DOS builds. The merged source-shaped body is in
`combat.c`.

## Provenance and binary identity

| build | MD5 | extent | bytes | reachable instructions |
|---|---|---|---:|---:|
| mom131 | `4123a5e17b7829dcb4457bd3c83cce3d` | `[0x75C69,0x75D93)` | 298 | 109 |
| mom160 | `7700b989590cd71f0535d62c5079e230` | `[0x75C69,0x75D93)` | 298 | 87 |
| com1 | `d92830af2c18fd57e82f26d6c690af82` | `[0x75C69,0x75D93)` | 298 | 135 |

The extent comes from overlay table entry 98: exported offset `0x17C9` resolves to `0x75C69`,
and the next entry, `0x18F3`, resolves to `0x75D93`. Every build begins `55 8B EC` and ends in
`CB` at `0x75D92`. CP's reachable count excludes the patched residue skipped by
`0x75D1B: EB 67`; a linear sweep reports 122 instructions because it decodes that residue.

Verified independently by Claude and Codex on 2026-08-09, followed by reciprocal byte review.
Both agents accepted and incorporated the four review corrections: the 1.31 `bufpi` value, CP's
reachable final call, the record-write counts, and removal of an out-of-scope caller survey.
No disagreement survived review.

## Interface and build shape

The far routine takes five `int16_t` arguments:

| frame slot | meaning | in-extent evidence |
|---|---|---|
| `[bp+6]` | `battle_unit_idx` | scales by the raw `s_BATTLE_UNIT` stride `0x6E` |
| `[bp+8]` | `player_idx` | byte store to `controller_idx`, record `+0x35` |
| `[bp+0xA]` | `unit_idx` | scales by the raw `s_UNIT` stride `0x20`; reads type at `+0x05` |
| `[bp+0xC]` | `cgx` | stores to `+0x44` and `+0x48` |
| `[bp+0xE]` | `cgy` | stores to `+0x46` and `+0x4A` |

MoM 1.31 has a two-byte local and calls `Battle_Unit_Pict_Open`; CP 1.60 and CoM 1 have an
18-byte local occupancy map and select the first free picture slot in-line. The later-build scan
is a `do/while`: record zero is examined even when `_combat_total_unit_count <= 0`. Both the
`slot_used[bufpi]` mark and the first-free-slot search lack an upper-bound check.

MoM 1.31 does not assign a semantic return value; its last address recomputation leaves
`AX = battle_unit_idx * 0x6E`. CP returns the zero-extended unit type. CoM returns zero on its
normal path and `-1` only when the low-index Demon random gate fails.

## Coverage ledgers

Rows are half-open, contiguous, non-overlapping, and cover the assigned extent exactly.

The following compact ledger is repeated in the verifier's required cross-build form. The more
granular per-build tables below partition the same ranges.

| N | build | Start | End | Within | Disposition | Title |
|---:|---|---|---|---|---|---|
| 0 | mom131 | `0x75C69` | `0x75C71` | — | compiler-only | prologue and saved registers |
| 1 | mom131 | `0x75C71` | `0x75C92` | — | reconstructed | address battle unit and call loader |
| 2 | mom131 | `0x75C92` | `0x75C9A` | — | reconstructed | obtain picture slot |
| 3 | mom131 | `0x75C9A` | `0x75CCA` | — | reconstructed | load figure and store returned `bufpi` |
| 4 | mom131 | `0x75CCA` | `0x75D2E` | — | reconstructed | controller and coordinate writes |
| 5 | mom131 | `0x75D2E` | `0x75D8D` | — | reconstructed | clear motion/action fields |
| 6 | mom131 | `0x75D8D` | `0x75D93` | — | compiler-only | epilogue and `retf` |
| 0 | mom160 | `0x75C69` | `0x75C71` | — | compiler-only | prologue and saved registers |
| 1 | mom160 | `0x75C71` | `0x75C92` | — | reconstructed | address battle unit and call loader |
| 2 | mom160 | `0x75C92` | `0x75CBF` | — | reconstructed | controller, coordinate, and cleared-field writes |
| 3 | mom160 | `0x75CBF` | `0x75CCB` | — | reconstructed | zero occupancy map |
| 4 | mom160 | `0x75CCB` | `0x75CED` | — | reconstructed | mark occupied slots |
| 5 | mom160 | `0x75CED` | `0x75CF8` | — | reconstructed | find first free slot |
| 6 | mom160 | `0x75CF8` | `0x75D1B` | — | reconstructed | load figure and store returned `bufpi` |
| 7 | mom160 | `0x75D1B` | `0x75D1D` | — | reconstructed | jump to final call |
| 8 | mom160 | `0x75D1D` | `0x75D84` | — | compiler-only | unreachable patched residue |
| 9 | mom160 | `0x75D84` | `0x75D8D` | — | reconstructed | battlefield call and result |
| 10 | mom160 | `0x75D8D` | `0x75D93` | — | compiler-only | epilogue and `retf` |
| 0 | com1 | `0x75C69` | `0x75C71` | — | compiler-only | prologue and saved registers |
| 1 | com1 | `0x75C71` | `0x75C92` | — | reconstructed | address battle unit and call loader |
| 2 | com1 | `0x75C92` | `0x75CBF` | — | reconstructed | controller, coordinate, and cleared-field writes |
| 3 | com1 | `0x75CBF` | `0x75CCB` | — | reconstructed | zero occupancy map |
| 4 | com1 | `0x75CCB` | `0x75CED` | — | reconstructed | mark occupied slots |
| 5 | com1 | `0x75CED` | `0x75CF8` | — | reconstructed | find first free slot |
| 6 | com1 | `0x75CF8` | `0x75D1B` | — | reconstructed | load figure and store returned `bufpi` |
| 7 | com1 | `0x75D1B` | `0x75D21` | — | reconstructed | Demon type gate |
| 8 | com1 | `0x75D21` | `0x75D3D` | 7 | reconstructed | Demon grant/failure gate |
| 9 | com1 | `0x75D3D` | `0x75D51` | 7 | reconstructed | Demon grant writes |
| 10 | com1 | `0x75D51` | `0x75D5B` | — | reconstructed | Paladins/Life gate |
| 11 | com1 | `0x75D5B` | `0x75D6A` | — | reconstructed | Centaurs/Catapult Nature gates |
| 12 | com1 | `0x75D6A` | `0x75D71` | — | reconstructed | success and Fantastic write |
| 13 | com1 | `0x75D71` | `0x75D84` | — | compiler-only | NOP fill |
| 14 | com1 | `0x75D84` | `0x75D8D` | — | reconstructed | battlefield call and result |
| 15 | com1 | `0x75D8D` | `0x75D93` | — | compiler-only | epilogue and `retf` |

### mom131

| N | Start | End | Disposition | Contents |
|---:|---|---|---|---|
| 0 | `0x75C69` | `0x75C71` | compiler-only | prologue, two-byte frame, save `si`/`di` |
| 1 | `0x75C71` | `0x75C92` | reconstructed | arguments, battle-unit address, `Load_Battle_Unit` |
| 2 | `0x75C92` | `0x75C9A` | reconstructed | `Battle_Unit_Pict_Open`, store local |
| 3 | `0x75C9A` | `0x75CB7` | reconstructed | unit type and `Combat_Figure_Load` |
| 4 | `0x75CB7` | `0x75CCA` | reconstructed | preserve call result and store `bufpi` |
| 5 | `0x75CCA` | `0x75CDE` | reconstructed | controller write |
| 6 | `0x75CDE` | `0x75CF2` | reconstructed | `cgx` write |
| 7 | `0x75CF2` | `0x75D06` | reconstructed | `cgy` write |
| 8 | `0x75D06` | `0x75D1A` | reconstructed | target `cgx` write |
| 9 | `0x75D1A` | `0x75D2E` | reconstructed | target `cgy` write |
| 10 | `0x75D2E` | `0x75D41` | reconstructed | zero `+0x4C` |
| 11 | `0x75D41` | `0x75D54` | reconstructed | zero `+0x50` |
| 12 | `0x75D54` | `0x75D67` | reconstructed | zero `+0x4E` |
| 13 | `0x75D67` | `0x75D7A` | reconstructed | zero `+0x52` |
| 14 | `0x75D7A` | `0x75D8D` | reconstructed | zero `+0x54`; final address product in `AX` |
| 15 | `0x75D8D` | `0x75D93` | compiler-only | epilogue and `retf` |

### mom160

| N | Start | End | Disposition | Contents |
|---:|---|---|---|---|
| 0 | `0x75C69` | `0x75C71` | compiler-only | prologue, 18-byte frame, save registers |
| 1 | `0x75C71` | `0x75C92` | reconstructed | arguments, battle-unit address, `Load_Battle_Unit` |
| 2 | `0x75C92` | `0x75CA2` | reconstructed | persistent record pointer and controller write |
| 3 | `0x75CA2` | `0x75CB8` | reconstructed | coordinate and target-coordinate stores |
| 4 | `0x75CB8` | `0x75CBF` | reconstructed | zero five motion/action words |
| 5 | `0x75CBF` | `0x75CCB` | reconstructed | zero the 18-byte occupancy map |
| 6 | `0x75CCB` | `0x75CED` | reconstructed | mark slots used by active battle units |
| 7 | `0x75CED` | `0x75CF8` | reconstructed | find first free slot |
| 8 | `0x75CF8` | `0x75D13` | reconstructed | type read and `Combat_Figure_Load` |
| 9 | `0x75D13` | `0x75D1B` | reconstructed | restore record pointer and store `bufpi` |
| 10 | `0x75D1B` | `0x75D1D` | reconstructed | jump to `0x75D84` |
| 11 | `0x75D1D` | `0x75D84` | compiler-only | unreachable patched residue |
| 12 | `0x75D84` | `0x75D8D` | reconstructed | battlefield-effects call and return value |
| 13 | `0x75D8D` | `0x75D93` | compiler-only | epilogue and `retf` |

### com1

| N | Start | End | Within | Disposition | Contents |
|---:|---|---|---:|---|---|
| 0 | `0x75C69` | `0x75C71` | — | compiler-only | prologue and saved registers |
| 1 | `0x75C71` | `0x75C92` | — | reconstructed | address record and call `Load_Battle_Unit` |
| 2 | `0x75C92` | `0x75CBF` | — | reconstructed | controller, coordinates, cleared motion/action fields |
| 3 | `0x75CBF` | `0x75CCB` | — | reconstructed | zero occupancy map |
| 4 | `0x75CCB` | `0x75CED` | — | reconstructed | mark occupied slots |
| 5 | `0x75CED` | `0x75CF8` | — | reconstructed | find first free slot |
| 6 | `0x75CF8` | `0x75D1B` | — | reconstructed | load figure and store returned `bufpi` |
| 7 | `0x75D1B` | `0x75D21` | — | reconstructed | Demon type gate |
| 8 | `0x75D21` | `0x75D27` | 7 | reconstructed | battle-unit-index bypass of random gate |
| 9 | `0x75D27` | `0x75D38` | 8 | reconstructed | `Random(4) == 1` gate |
| 10 | `0x75D38` | `0x75D3D` | 9 | reconstructed | failure result and jump to common tail |
| 11 | `0x75D3D` | `0x75D51` | 7 | reconstructed | four Demon attribute writes |
| 12 | `0x75D51` | `0x75D5B` | — | reconstructed | Paladins/Life gate |
| 13 | `0x75D5B` | `0x75D6A` | — | reconstructed | Centaurs-or-Catapult/Nature gates |
| 14 | `0x75D6A` | `0x75D71` | — | reconstructed | success result and Fantastic write |
| 15 | `0x75D71` | `0x75D84` | — | compiler-only | nineteen NOP bytes |
| 16 | `0x75D84` | `0x75D8D` | — | reconstructed | battlefield-effects call and return value |
| 17 | `0x75D8D` | `0x75D93` | — | compiler-only | epilogue and `retf` |

## Branch inventory

MoM 1.31 has no branch instruction in the extent. Every later-build conditional is listed here;
the target description identifies the first instruction on the taken edge.

| build | site | bytes | transfer | target contents |
|---|---:|---|---|---|
| mom160, com1 | `0x75CD7` | `7C 0A` | `jl 0x75CE3` | advance record without marking a negative `bufpi` |
| mom160, com1 | `0x75CDE` | `75 03` | `jne 0x75CE3` | advance record without marking non-active status |
| mom160, com1 | `0x75CEB` | `7C E4` | `jl 0x75CD1` | next scan iteration |
| mom160, com1 | `0x75CF3` | `74 03` | `je 0x75CF8` | first free slot, then unit-type load |
| com1 | `0x75D1F` | `75 30` | `jne 0x75D51` | skip Demon block, begin identity race gates |
| com1 | `0x75D25` | `7D 16` | `jge 0x75D3D` | grant Demon package without PRNG |
| com1 | `0x75D36` | `74 05` | `je 0x75D3D` | grant Demon package when roll was exactly one |
| com1 | `0x75D54` | `75 05` | `jne 0x75D5B` | skip Life write, test Centaurs |
| com1 | `0x75D5E` | `74 05` | `je 0x75D65` | write Nature for Centaurs |
| com1 | `0x75D63` | `75 05` | `jne 0x75D6A` | skip Nature write for non-Catapult |

Unconditional transfers are `mom160 0x75CF6 -> 0x75CEF`, `mom160 0x75D1B -> 0x75D84`,
`com1 0x75CF6 -> 0x75CEF`, and `com1 0x75D3B -> 0x75D84`. CP's `0x75D1B` transfer makes
`[0x75D1D,0x75D84)` unreachable.

## Call inventory

| build | site | far operand | resolved file offset | call |
|---|---:|---|---:|---|
| all | `0x75C8A` | `03A0:0039` | `0x8EAB9` | `Load_Battle_Unit(unit_idx, bu)` |
| mom131 | `0x75C92` | `0388:0061` | `0x883E4` | `Battle_Unit_Pict_Open()` |
| mom131 | `0x75CB0` | `0518:0039` | `0xF2D72` | `Combat_Figure_Load(type, slot)` |
| mom160, com1 | `0x75D0C` | `0518:0039` | `0xF2D72` | `Combat_Figure_Load(type, slot)` |
| com1 | `0x75D2D` | `00B0:00D8` | `0x0FFA8` | `Random(4)` |
| mom160, com1 | `0x75D84` | `03A0:0052` | `0x8FF09` | `BU_Apply_Battlefield_Effects(bu)` |

Reachable call counts are 3/3/4 for mom131/mom160/com1. The verifier's linear checker reports
only two CP calls: decoding the unreachable residue reaches an apparent `LES` at `0x75D81` that
consumes `0x75D84`'s `9A` opcode. Decoded from the reachable branch target, `0x75D84` is the far
call bytes `9A 52 00 A0 03`.

## State-write inventory

| build | site(s) | destination |
|---|---|---|
| mom131 | `0x75CC6` | `bu->bufpi = Combat_Figure_Load(...)` result |
| mom131 | `0x75CDA` | byte `controller_idx = player_idx` |
| mom131 | `0x75CEE`, `0x75D02`, `0x75D16`, `0x75D2A` | `cgx`, `cgy`, `target_cgx`, `target_cgy` |
| mom131 | `0x75D3B`, `0x75D4E`, `0x75D61`, `0x75D74`, `0x75D87` | zero `+0x4C`, `+0x50`, `+0x4E`, `+0x52`, `+0x54` |
| mom160, com1 | `0x75C9E` | byte `controller_idx = player_idx` |
| mom160, com1 | `0x75CAA`, `0x75CAD`, `0x75CB4`, `0x75CB7` | four coordinate words via `STOSW` |
| mom160, com1 | `0x75CBD` | five zero words over `bu+0x4C..bu+0x55` |
| mom160, com1 | `0x75CC9` | zero local occupancy bytes `[bp-0x12,bp)` |
| mom160, com1 | `0x75CE0` | increment `slot_used[bufpi]` |
| mom160, com1 | `0x75D17` | `bu->bufpi = Combat_Figure_Load(...)` result |
| com1 | `0x75D3D` | `Spec_Att_Attrib = -4` (raw byte `0xFC`) |
| com1 | `0x75D42` | overwrite `Attribs_1` high byte with raw `0x83` |
| com1 | `0x75D47` | `attack_attributes |= 0x0208` (Life Steal + Death Touch) |
| com1 | `0x75D4D` | word store at `+0x3F`, spanning `mana_max` and adjacent `mana` |
| com1 | `0x75D56` | `race = rt_Life` (raw `0x13`) |
| com1 | `0x75D65` | `race = rt_Nature` (raw `0x10`) |
| com1 | `0x75D6C` | byte OR `Abilities |= UA_FANTASTIC` (raw `0x01`) |

There are 11/7/14 record-write instructions in mom131/mom160/com1. The counts exclude the 1.31
frame-local write and the later-build local occupancy-map writes.

The raw `0x83` high-byte overwrite corresponds to
`USA_IMMUNITY_WEAPON | USA_UNKNOWN_0200 | USA_UNKNOWN_8000` (`0x8300`). The `0x0200` meaning is
not established by this extent and is deliberately not mislabeled as Flying.

## Merged findings

1. **The CoM 1 Construct Catapult identity rewrite is in this load path.** Unit type `0x25`
   reaches the Nature race write at `0x75D65`, then the Fantastic ability write at `0x75D6C`.
   This is the DOS evidence required by `identity:com1ConstructCatapult`.
2. **The CoM 1 summon identity branch is success-wide.** Paladins (`0x71`) become Life;
   Centaurs (`0x36`) and Catapults (`0x25`) become Nature; every path except the failed Demon
   path executes `Abilities |= UA_FANTASTIC`. Other unit types keep their loaded race while still
   receiving Fantastic. This supplies the DOS side of `identity:com1SummonBranch`.
3. **Demon handling is conditional and carries two different words into mana.** Battle-unit
   indices at least 19 receive the package unconditionally and store the figure-loader result as
   the word at `+0x3F`; lower indices require `Random(4) == 1`, whose taken edge stores zero there.
   Failure returns `-1` after still calling `BU_Apply_Battlefield_Effects`. A grant also sets
   save modifier `-4`, replaces the `Attribs_1` high byte with `0x83`, and adds Life Steal and
   Death Touch.
4. **The picture loader's return is the `bufpi` value in every build.** In 1.31 the result is
   carried across an address recomputation by `push ax`/`pop ax`; the separately opened picture
   slot is only an argument to `Combat_Figure_Load`.
5. **CP and CoM replaced the separate slot-opening call with unsafe in-line selection and added
   battlefield recomputation.** Their slot scan is bottom-tested and neither occupancy index has
   a bound check. Both call `BU_Apply_Battlefield_Effects`; 1.31 does not.

## Completion and verification

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- disputed items: none

Verifier commands (run against the merged evidence and `combat.c`):

```text
python tools/verify_dos_derivation.py <mom131 WIZARDS.EXE> "Reference docs/DOS reconstructed/R9-G1a-R1.evidence.md,Reference docs/DOS reconstructed/combat.c" mom131 0x75C69 0x75D93
python tools/verify_dos_derivation.py <mom160 WIZARDS.EXE> "Reference docs/DOS reconstructed/R9-G1a-R1.evidence.md,Reference docs/DOS reconstructed/combat.c" mom160 0x75C69 0x75D93
python tools/verify_dos_derivation.py <com1 WIZARDS.EXE> "Reference docs/DOS reconstructed/R9-G1a-R1.evidence.md,Reference docs/DOS reconstructed/combat.c" com1 0x75C69 0x75D93
```

All three commands passed on 2026-08-09: ledgers contiguous, parent declarations valid, and zero
unaccounted semantic conditional jumps, calls, or named-field writes. The CP call-count caveat
documented above is the verifier's only expected linear-decoder limitation.
