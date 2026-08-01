# `Caster.exe`

Everything read out of the modern engine's executable, which covers **both CoM2 and Warlord**
(Warlord ships no executable of its own).

| File | Owns |
|---|---|
| [`CoM2 binary analysis.md`](./CoM2%20binary%20analysis.md) | mechanic-level findings, the method for getting more, and the address anchors behind each |
| [`Units.RecalculateUnits.pas`](./Units.RecalculateUnits.pas) and siblings | address-backed, Pascal-like reconstructions of the calculator-relevant flows |
| this file | the binary's identity, and the reconstruction's conventions |

The `.pas` files imitate the executable's control and data flow; they are not a claim to recover
the original source, and are intentionally not compilable — partial record layouts and unresolved
seams stay visible until their executable blocks have been reconstructed. Tracking for the
reconstruction effort (IDs, status, completion gate) lives in `Calculator/BACKLOG.md`, §2e.

## The binary

**This table is the single home for `Caster.exe`'s identity — do not restate it elsewhere.**

| Field | Value |
|---|---|
| Path | `C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic\Master of Magic Caster Windows\Caster.exe` |
| Version | CoM2 **1.05.11** |
| md5 | `540c22dbd701fb2caa95bd3ecccd9447` |
| Size | 10,584,041 bytes |
| Format | PE32, i386, image base `0x400000`, Delphi (Embarcadero) |

Every address in this directory is a virtual address in that exact build. Verify the hash before
using them.

**`1.05.11` is the engine's own spelling.** It occurs twice, as Delphi short strings:

| VA | Length byte | String |
|---|---|---|
| `0x694975` | `0x1B` (27) at `0x694974` | `Version 1.05.11, 2025-12-06` — one string; the version substring starts at `0x69497D` |
| `0x699F11` | `0x07` at `0x699F10` | `Version` — the label only |
| `0x699F19` | `0x13` (19) at `0x699F18` | `1.05.11, 2025-12-06` — the value, a *separate* string from the label above it |

The string `1.5.11` does not occur in the executable at all, and the PE version resource is an
unset `1.0.0.0` placeholder that says nothing. Both the CoM2 and Warlord manuals write `1.5.11`
in prose; where they differ from the binary, the binary is the version name.

## Naming and confidence

- TD32 procedure, parameter and local names are retained verbatim.
- Names beginning `inferred_` are semantic aliases assigned by the reconstruction.
- `field_XXXX` names are record fields known only by byte offset.
- `global_XXXXXXXX` names are globals known only by virtual address.
- Every reconstructed block is tagged `exact`, `inferred`, or `unresolved`.
  - `exact`: branch/call/write structure is read directly from the executable.
  - `inferred`: the structure is exact but at least one semantic name or type is assigned.
  - `unresolved`: intentionally left source-shaped without pretending the body is decoded.
- Record fields carry their byte offset within the record as a comment wherever it is known, so a
  field claim can be checked against a disassembled operand without re-deriving the layout.
- Delphi's compiler-generated range and overflow checks (`cmp …, N; jbe` before an indexed
  access; `jno` after an `imul`) are omitted throughout, since they do not alter ordinary control
  flow. Where a check reveals something the source shape otherwise loses — most importantly an
  array's declared bound — that fact is recorded at the declaration instead.

## Reconstruction index

| R5 item | File | Current coverage |
|---|---|---|
| R5.1 | [`Units.RecalculateUnits.pas`](./Units.RecalculateUnits.pas) | `@Units@RecalculateUnits`: signature/ABI, complete region `a`, both script-hook boundaries, an address-indexed seam for regions `c` and `e`, plus its CasterCore and city-tile wrappers |
| R5.1 | named helpers | not yet reconstructed |
| R5.2 | combat damage flow | not yet started |
