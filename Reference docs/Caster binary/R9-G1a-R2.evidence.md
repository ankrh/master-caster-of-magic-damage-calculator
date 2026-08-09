# R9-G1a-R2 evidence — `@Spells@CombatSummonUnit`

Merged evidence for the complete source-shaped reconstruction in
[`Spells.CombatSummonUnit.pas`](./Spells.CombatSummonUnit.pas), covering the pinned
`Caster.exe` half-open extent `$005CBEE0..$005CC3E3`. The executable identity is owned only by
[`README.md`](./README.md); both derivation sessions rechecked it before reading the bytes.

Claude and Codex derived the widened whole-routine extent independently, then reviewed one
another's artifacts against fresh disassembly. Both source bodies agreed on every semantic
branch, call, record layer, operand width and state write. Reciprocal review corrected one
accounting inconsistency in Claude's artifact and added four reproducibility/citation details to
Codex's; no byte disagreement survived and no Q row was required.

## Merged findings

### Combat summons derive identity from the spell record, not hard-coded template gates

`CombatSummonUnit(sp,w)` calls `SpellIDToSummon(sp)` at `$005CBEF1`, then passes that result to
`NewUnit` at `$005CBF17`. The called helper is the spell table's `summonedunit` accessor; inside
this routine the same checked spell record supplies `Realm` at `$005CC019`, and
`RealmtoRace` converts it before the base-record `race` write at `$005CC050`.

The new base record is unconditionally marked `combatsummoned := True` at `$005CBF48` and
`Fantastic := True` at `$005CBFF2`. There is no template-37, template-113, Construct Catapult,
or Call to Arms conditional anywhere in the routine. Those identities are the composition of
the executable's generic summon flow with the loaded `SPELLS.INI` row:

- CoM2 spell 12 is Construct Catapult, `Realm=1`, `SummonedUnit=37`
  (`Script source/CoM2 1.05.11 base/SPELLS.INI:614-628`).
- CoM2 spell 153 is Call to Arms, `Realm=4`, `SummonedUnit=113`
  (`Script source/CoM2 1.05.11 base/SPELLS.INI:2689-2702`).
- Warlord replaces enabled slot 12 with Water Elemental, still `Realm=1` but
  `SummonedUnit=158` (`Script source/Warlord 1.5.12.7/SPELLS.INI:901-915`). Its separate
  template-37 Construct Catapult row 260 is `Realm=6`, custom, and disabled
  (`SPELLS.INI:4666-4683`).
- Warlord replaces slot 153 with Spirit of Chivalry, `Realm=4`, `SummonedUnit=211`
  (`SPELLS.INI:3024-3035`).

The compiled routine is shared by CoM2 and Warlord; therefore the Warlord table substitutions,
not an executable version gate, are why the base-CoM2 template-37 and template-113 outcomes do
not apply to Warlord's enabled spells. F54 and F55 remain the calculator implementation tasks.

### Initialization is two-stage and preserves selected calculated fields

After the initial identity writes, the routine calls
`RecalculateUnits(True,-1,-1,-1)` at `$005CC061`. It then copies calculated `Units.mp` to base
`mp`, calculated `maxammo` to base `ammo`, and calculated `combatmaxmoves` to base
`combatmovesleft`, preserving the exact current/base layers and word/dword widths at
`$005CC092/$005CC0C8`, `$005CC0FC/$005CC131`, and `$005CC164/$005CC19A`. It clears base
`AIstayBehindWalls`, publishes the new index through SpellTargetUnit and
CombatSummonedUnitID, and raises CombatSummoningHappened before the caster-specific gate.

### Demon Lord-cast summons receive a compiled Lesser Demon rewrite

The routine calls nullary `UnitCaster` twice. A non-positive first result branches directly to
the script hook at `$005CC3C6`; otherwise the second result indexes `BaseUnits`, and any caster
whose base `unittype` is not `$00AD` takes the same exit. CoM2 `UNITS.INI` names entry 173
(`$00AD`) Demon Lord (`Unit rosters/CoM2 unit data/UNITS.INI:4535-4536`).

For a matching caster, the summoned unit's current `maxmp` and `mp` and base `maxmp` and `mp`
are zeroed in the interleaved order `$005CC273`, `$005CC2A9`, `$005CC2DF`, `$005CC315`.
The base name becomes the 13-byte ShortString `Lesser Demon`, base Life Steal is enabled, and
its value becomes signed `-2` at `$005CC387/$005CC3BB`.

### The Warlord script hook runs after compiled creation writes

Both compiled gates converge at `$005CC3C6`. The routine calls
`@Spells@CallCombatSpellEffectScript(sp)` at `$005CC3C9`, then performs a second
`RecalculateUnits(True,-1,-1,-1)` at `$005CC3D8`. A Warlord combat-spell-effect script therefore
runs after the generic identity/state writes and the conditional Lesser Demon rewrite but before
the final recalculation. This is an explicit post-compiled extension point, not evidence that
vanilla's empty CAS stubs own the base formula.

## ABI, tables and address models

TD32 names EBP-`$0C` `i`, EBP-`$08` `w`, and EBP-`$04` `sp`. `$005CBEE8 8955f8` and
`$005CBEEB 8945fc` home EDX and EAX, yielding
`procedure CombatSummonUnit(sp,w: Integer); register`.

Unit records use `[[$00709188] + index * $1E1 * 4 + displacement]`. Every checked unit access
implements `dec; cmp $9C3F; jbe/BoundErr; inc; imul index,$1E1; jno/IntOver`, establishing
`array[1..40000]` and the exact `$784`-byte `unitT` stride. BaseUnits begins at displacement
`$01AC1798`, Units at `$06426898`, and inferred_Maxunits is the dword at `$01AC1F18`.

Spell records use pointer global `$00708164`, a checked `0..400` index, and `$17 * 8 = $B8`
bytes per record. `$005CC019 8b44c234` reads `Realm` at `+$34`. The actual helper called at
`$005CBEF1` reads `summonedunit` at `+$8C`.

Named Castercore accessors bind the pointer globals used here:

| Global | Accessor evidence | Meaning in the body |
|---|---|---|
| `$007089E4` | `$00643D50 a1e4897000` | CombatX passed to NewUnit |
| `$007086D8` | `$00643D64 a1d8867000` | CombatY passed to NewUnit |
| `$007085B8` | `$006432F8 a1b8857000; $006432FD 8b00` | SpellTargetX copied to base `cox` |
| `$007082F8` | `$0064330C a1f8827000; $00643311 8b00` | SpellTargetY copied to base `coy` |
| `$0070802C` | `@Castercore@SpellTargetUnit` `$006431A0` | receives inferred_Maxunits |
| `$00708C34` | `@Castercore@CombatSummoningHappened` `$00645804` | receives True |
| `$00709BDC` | `@Castercore@CombatSummonedUnitID` `$00646390` | receives inferred_Maxunits |

`UnitCaster` is nullary, not a function consuming the first call's return in EAX: TD32 lists
only local `Result`, its `$005C3344 55; $005C3345 8bec; $005C3347 51` prologue homes no incoming
register, and its body reads pointer global `$007084BC` at `$005C3348`, `$005C3359`,
`$005C3366`, and `$005C3387`.

## Semantic branch inventory

| Meaning | Test/jump bytes | Target and target contents |
|---|---|---|
| `UnitCaster <= 0` | call `$005CC204 e83b71ffff`; `$005CC209 85c0`; `$005CC20B 0f8eb5010000` | `$005CC3C6 8b45fc` reloads `sp` for the script hook and skips the entire `$00AD` block |
| second `UnitCaster` base `unittype <> $00AD` | `$005CC237 6681bc82461eac01ad00`; `$005CC241 0f857f010000` | `$005CC3C6 8b45fc`, the same script-hook convergence point |

There is no semantic loop, jump table or unconditional `jmp` in the assigned extent.

## Compiler-guard branches

There are 21 complete checked indices: 19 on inferred_Maxunits, one on the second UnitCaster
return, and one on the spell index. Together they produce 21 `jbe`/BoundErr and 21
`jno`/IntOver pairs. Each `jbe` target restores or begins the scaled index; each `jno` target is
the first post-guard pointer load. The full arithmetic idiom, including `dec/inc` and the
`imul`, is represented in the Pascal body and summarized above.

Prefix guard targets:

| Jump | Bytes | Target | Bytes at target |
|---|---|---|---|
| `$005CBF2D` | `7605` | `$005CBF34` | `40 inc eax` |
| `$005CBF3B` | `7105` | `$005CBF42` | `8b1588917000 mov edx,[$00709188]` |
| `$005CBF61` | `7605` | `$005CBF68` | `40 inc eax` |
| `$005CBF6F` | `7105` | `$005CBF76` | `8b1588917000 mov edx,[$00709188]` |
| `$005CBF9C` | `7605` | `$005CBFA3` | `40 inc eax` |
| `$005CBFAA` | `7105` | `$005CBFB1` | `8b1588917000 mov edx,[$00709188]` |
| `$005CBFD7` | `7605` | `$005CBFDE` | `40 inc eax` |
| `$005CBFE5` | `7105` | `$005CBFEC` | `8b1588917000 mov edx,[$00709188]` |
| `$005CC002` | `7605` | `$005CC009` | `6bc017 imul eax,eax,$17` |
| `$005CC00C` | `7105` | `$005CC013` | `8b1564817000 mov edx,[$00708164]` |
| `$005CC035` | `7605` | `$005CC03C` | `42 inc edx` |
| `$005CC043` | `7105` | `$005CC04A` | `8b0d88917000 mov ecx,[$00709188]` |

Tail pairs use the same bytes (`7605 jbe`, `7105 jno`); every target's first bytes are quoted:

| Jump pair | Targets and target contents |
|---|---|
| `$005CC077` / `$005CC085` | `$005CC07E 40`; `$005CC08C 8b1588917000` |
| `$005CC0AD` / `$005CC0BB` | `$005CC0B4 42`; `$005CC0C2 8b0d88917000` |
| `$005CC0E1` / `$005CC0EF` | `$005CC0E8 40`; `$005CC0F6 8b1588917000` |
| `$005CC116` / `$005CC124` | `$005CC11D 42`; `$005CC12B 8b0d88917000` |
| `$005CC149` / `$005CC157` | `$005CC150 40`; `$005CC15E 8b1588917000` |
| `$005CC17F` / `$005CC18D` | `$005CC186 42`; `$005CC194 8b0d88917000` |
| `$005CC1B3` / `$005CC1C1` | `$005CC1BA 40`; `$005CC1C8 8b1588917000` |
| `$005CC21C` / `$005CC22A` | `$005CC223 40`; `$005CC231 8b1588917000` |
| `$005CC258` / `$005CC266` | `$005CC25F 40`; `$005CC26D 8b1588917000` |
| `$005CC28E` / `$005CC29C` | `$005CC295 40`; `$005CC2A3 8b1588917000` |
| `$005CC2C4` / `$005CC2D2` | `$005CC2CB 40`; `$005CC2D9 8b1588917000` |
| `$005CC2FA` / `$005CC308` | `$005CC301 40`; `$005CC30F 8b1588917000` |
| `$005CC330` / `$005CC33E` | `$005CC337 40`; `$005CC345 8b1588917000` |
| `$005CC36C` / `$005CC37A` | `$005CC373 40`; `$005CC381 8b1588917000` |
| `$005CC3A0` / `$005CC3AE` | `$005CC3A7 40`; `$005CC3B5 8b1588917000` |

The corresponding 21 BoundErr calls target `$00406EE0`; the 21 IntOver calls target
`$00406EE8`. Total conditional jumps are 44: 42 compiler guards plus the 2 semantic gates.

## Semantic call inventory

| Site | Bytes | Target/symbol |
|---|---|---|
| `$005CBEF1` | `e8ae70ffff` | `$005C2FA4 @Spells@SpellIDToSummon` |
| `$005CBF17` | `e82ca9fcff` | `$00596848 @Units@NewUnit` |
| `$005CC01D` | `e83a0a0200` | `$005ECA5C @Game@RealmtoRace` |
| `$005CC061` | `e8bad8fcff` | `$00599920 @Units@RecalculateUnits` |
| `$005CC204` | `e83b71ffff` | `$005C3344 @Spells@UnitCaster` |
| `$005CC211` | `e82e71ffff` | `$005C3344 @Spells@UnitCaster`, second evaluation |
| `$005CC3C9` | `e87ad5ffff` | `$005C9948 @Spells@CallCombatSpellEffectScript` |
| `$005CC3D8` | `e843d5fcff` | `$00599920 @Units@RecalculateUnits` |

## State-write inventory

| # | Site/bytes | Destination | Value |
|---:|---|---|---|
| 1 | `$005CBF48 c684824c1eac0101` | `BaseUnits[Mx].combatsummoned` `+$6B4` | True |
| 2 | `$005CBF84 898c82801cac01` | `BaseUnits[Mx].cox` `+$4E8` | SpellTargetX |
| 3 | `$005CBFBF 898c82841cac01` | `BaseUnits[Mx].coy` `+$4EC` | SpellTargetY |
| 4 | `$005CBFF2 c684826718ac0101` | `BaseUnits[Mx].Fantastic` `+$0CF` | True |
| 5 | `$005CC050 8984911418ac01` | `BaseUnits[Mx].race` `+$07C` | RealmtoRace result |
| 6 | `$005CC0C8 66898491421eac01` | `BaseUnits[Mx].mp` `+$6AA` | `Units[Mx].mp` |
| 7 | `$005CC131 898491e017ac01` | `BaseUnits[Mx].ammo` `+$048` | `Units[Mx].maxammo` |
| 8 | `$005CC19A 66898491921cac01` | `BaseUnits[Mx].combatmovesleft` `+$4FA` | `Units[Mx].combatmaxmoves` |
| 9 | `$005CC1CE c68482501eac0100` | `BaseUnits[Mx].AIstayBehindWalls` `+$6B8` | False |
| 10 | `$005CC1E7 8902` | SpellTargetUnit | Mx |
| 11 | `$005CC1EE c60001` | CombatSummoningHappened | True |
| 12 | `$005CC202 8902` | CombatSummonedUnitID | Mx |
| 13 | `$005CC273 66c78482406f42060000` | `Units[Mx].maxmp` `+$6A8` | 0, gated |
| 14 | `$005CC2A9 66c78482421eac010000` | `BaseUnits[Mx].mp` `+$6AA` | 0, gated |
| 15 | `$005CC2DF 66c78482426f42060000` | `Units[Mx].mp` `+$6AA` | 0, gated |
| 16 | `$005CC315 66c78482401eac010000` | `BaseUnits[Mx].maxmp` `+$6A8` | 0, gated |
| 17 | `$005CC357 a5; $005CC358 a5; $005CC359 a5; $005CC35A a4` | `BaseUnits[Mx].name` `+$000`, 13 bytes | `#12'Lesser Demon'`, gated |
| 18 | `$005CC387 c68482651bac0101` | base `attackflags.lifesteal` `+$3CD` | True, gated |
| 19 | `$005CC3BB c784826c1bac01feffffff` | base `attackflags.lifestealvalue` `+$3D4` | -2, gated |

`Mx` is inferred_Maxunits, re-read from `$01AC1F18`. The only other writes are the argument
homes `$005CBEE8 8955f8`, `$005CBEEB 8945fc`, and local `i` at
`$005CBEF6 8945f4`.

## Coverage ledger

The whole-routine inbound scan found no branch sourced outside the assigned range that straddles
it. Rows 17–23 are nested within row 16 because both semantic false-exits jump to
`$005CC3C6`; row 16 itself is nested only within row 15. The ledger is half-open, contiguous and
non-overlapping.

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005CBEE0` | `$005CBEF9` | — | reconstructed | complete ABI, argument homes, and `i := SpellIDToSummon(sp)` |
| 1 | `$005CBEF9` | `$005CBF1C` | — | reconstructed | complete `NewUnit(i,w,plane,x,y)` setup and call |
| 2 | `$005CBF1C` | `$005CBF50` | — | reconstructed | checked index and `combatsummoned := True` |
| 3 | `$005CBF50` | `$005CBF8B` | — | reconstructed | SpellTargetX read and `cox` write |
| 4 | `$005CBF8B` | `$005CBFC6` | — | reconstructed | SpellTargetY read and `coy` write |
| 5 | `$005CBFC6` | `$005CBFFA` | — | reconstructed | `Fantastic := True` |
| 6 | `$005CBFFA` | `$005CC057` | — | reconstructed | checked spell Realm, RealmtoRace, checked base race write |
| 7 | `$005CC057` | `$005CC066` | — | reconstructed | first RecalculateUnits call |
| 8 | `$005CC066` | `$005CC0D0` | — | reconstructed | current `mp` read and base `mp` write |
| 9 | `$005CC0D0` | `$005CC138` | — | reconstructed | current `maxammo` read and base `ammo` write |
| 10 | `$005CC138` | `$005CC1A2` | — | reconstructed | current `combatmaxmoves` read and base `combatmovesleft` write |
| 11 | `$005CC1A2` | `$005CC1D6` | — | reconstructed | base AIstayBehindWalls clear |
| 12 | `$005CC1D6` | `$005CC1E9` | — | reconstructed | SpellTargetUnit write |
| 13 | `$005CC1E9` | `$005CC1F1` | — | reconstructed | CombatSummoningHappened write |
| 14 | `$005CC1F1` | `$005CC204` | — | reconstructed | CombatSummonedUnitID write |
| 15 | `$005CC204` | `$005CC211` | — | reconstructed | first UnitCaster call and signed-positive gate |
| 16 | `$005CC211` | `$005CC247` | 15 | reconstructed | second UnitCaster call, checked base type and `$00AD` gate |
| 17 | `$005CC247` | `$005CC27D` | 16 | reconstructed | current `maxmp := 0` |
| 18 | `$005CC27D` | `$005CC2B3` | 16 | reconstructed | base `mp := 0` |
| 19 | `$005CC2B3` | `$005CC2E9` | 16 | reconstructed | current `mp := 0` |
| 20 | `$005CC2E9` | `$005CC31F` | 16 | reconstructed | base `maxmp := 0` |
| 21 | `$005CC31F` | `$005CC35B` | 16 | reconstructed | complete Lesser Demon ShortString copy |
| 22 | `$005CC35B` | `$005CC38F` | 16 | reconstructed | base Life Steal enable |
| 23 | `$005CC38F` | `$005CC3C6` | 16 | reconstructed | base Life Steal value `-2` |
| 24 | `$005CC3C6` | `$005CC3DD` | — | reconstructed | script hook and final RecalculateUnits call |
| 25 | `$005CC3DD` | `$005CC3E3` | — | compiler-only | saved-register restore, frame teardown and ret |

TD32's declared routine length continues to `$005CC3F4`, but the last instruction is
`$005CC3E2 c3 ret`. `$005CC3E3 00` is alignment, and `$005CC3E4` begins the Lesser Demon
constant. Linear disassembly of those data bytes manufactures `$005CC3E6 657373 jae
$005CC45C` and `$005CC3E9 657220 jb $005CC40C`; neither is a routine branch.

## Completion declaration

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Accounting: 2/2 semantic conditional jumps, 8/8 semantic calls, 19/19 persistent logical
writes, all 42 compiler-guard jumps/calls and all three local/argument-home writes are cited.
The verifier reports 18 named-field writes because it counts the three register-indirect global
stores and does not classify the four `movs` instructions implementing the one name assignment.

## Derivation and review provenance

Verified: Claude 2026-08-09, cold derivation; Codex 2026-08-09, independent. Both agents then
reviewed the other's artifact against the pinned bytes. Codex's review corrected Claude's prose
guard/load totals from 13/15/26 to the byte-backed 21/21/42 counts. Claude's review found no
semantic misread in Codex and supplied four accepted reproducibility/citation improvements:
nullary UnitCaster evidence, reconstructed ABI disposition, the UNITS.INI 173 citation, and the
TD32-tail data warning. Both revised derivations pass `tools/verify_derivation.py`; no review
entry or dispute survived the round.
