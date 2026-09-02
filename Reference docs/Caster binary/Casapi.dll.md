# `Casapi.dll` — the shipped modding SDK

`Casapi.dll` is a second PE that ships beside `Caster.exe`. It is **not** part of the running
game: no shipped file in either distribution loads it. It is an SDK the developer publishes for
third-party tools, and its accessors are compiled without the range and overflow checks the
executable carries, so it is read here as a tool-facing surface rather than as engine evidence.

**Addresses in this file are virtual addresses in `Casapi.dll`, not in `Caster.exe`.** Both
modules use image base `0x400000` and their address spaces overlap without agreeing, so a bare
`$005F5DEC` from here means nothing in the executable. Every `Caster.exe` address below is marked
as such; the executable's identity stays in [`README.md`](./README.md).

## Identity

| Field | Value |
|---|---|
| Paths | `<CoM2>/CasApi/Casapi.dll`, `<CoM2>/Mods/CoMWin1511/CasApi/Casapi.dll`, and `Raw install files/CoM2ModWarlord1.5.12.9/CoMWin1511/CasApi/Casapi.dll` |
| md5 | `c7809e2b901bf2ce17a96d551b227cd5` — all three copies are byte-identical |
| Size | 8,919,162 bytes |
| Format | PE32 DLL, i386, image base `0x400000`, Delphi; 914 named exports, export-directory name `Casapi.dll` |
| PE `TimeDateStamp` | 2025-11-11 |

The DLL ships with `CasApi.pas`, `Typedec.pas`, `SharedConstants.pas` and `Readme.txt` in the same
folder. All four are byte-identical to the copies vendored at `../Script source/CAS reference/`,
so that directory's Pascal declarations are this SDK's headers, not a separate CAS artefact.

**The DLL cannot be assumed to carry the 1.05.11 executable's source revision.** Its
`TimeDateStamp` is 2025-11-11 against `Caster.exe`'s 2025-12-06, and it contains no version string
at all (the version text lives in the UI modules the DLL omits), so nothing pins the two builds
together. Nothing may be concluded about `Caster.exe`'s behaviour from a `Casapi.dll` address.

## What it contains, and what nothing does with it

`Readme.txt` states its purpose in two sentences: a DLL containing the gameplay functions of
Caster of Magic for Windows, usable to create save-game editors, damage calculators and similar
tools. `CASTERWIN.html`'s changelog adds, under 1.5.2, that it was compiled from the same source
as the game and "should be 100% identical and compatible, but is currently untested."

Its TD32 symbols carry 89 modules against the executable's 109. The 21 the DLL drops are the
presentation, input and audio layer — `Caster`, `Clickareas`, `Engine`, `Keys`, `Main`,
`NewgameUI`, `RenderDiplo`, `RenderUI`, `Rendercombat`, `Rendering`, `Sound`, `UI`,
`UIConstants`, `UIInit`, `UIScore`, `UISpell`, `UIVars`, `Vcl.MPlayer`, `Winapi.MMSystem`,
`uicontroller` — and, with them, `CasterCore`. In their
place the DLL adds one module, `Casapi`, holding 914 symbols: `@Casapi@initialization`,
`@Casapi@Finalization`, and 912 wrapper bodies whose entry VAs are 912 of the 914 exports. The two
exports with no symbol of their own, `Insidewalls` (`$005F53E0`) and `SetSpellTargetLocation`
(`$005F8A54`), are ordinary wrappers inside the same extent, immediately ahead of the symbol that
carries their name. The module is the exported facade plus its own unit initialisation and
finalisation, and nothing else.

So `Casapi` is the DLL's substitute for the executable's `CasterCore`: the same accessor facade,
re-declared `stdcall` for an external caller instead of `register` for an internal one. In
`Caster.exe`, every external call into `CasterCore`'s 901 routines originates in one of the
presentation, input and audio modules the DLL omits — 1,865 call sites in `RenderUI`, 1,357 in
`UI`, on down to 2 in `Engine`, with none from `@Scripts@`. `CasterCore` is a UI-facing facade,
not a CAS script bridge, and `Scripts.TXT` does not document these names as script functions.

**No shipped file loads the DLL.** This is an exhaustive census over the shipped files, not a
proof — a loader that built the name at runtime would leave no string — but there are only two
executable identities in the distribution and neither imports nor names it. Two scans, run
2026-09-02:

- A case-insensitive ASCII and UTF-16 scan for `casapi` over every file of the CoM2 1.05.11
  install (40,936 files, 1,620,867,861 bytes) returns four files, and only four: the two copies of
  `Casapi.dll` itself, and the two copies of the manual `CASTERWIN.html`. The DLL's 8,707
  occurrences are self-description — 8,705 TD32 symbol names in `.debug`, one export-directory
  name in `.edata`, one in `.rsrc` — and the manual's are the changelog paragraph above. The same
  scan over the Warlord 1.5.12.9 distribution (11,227 files, 252,232,547 bytes) returns two: the
  DLL and the manual. No third file names it, in prose or as a path.
- Import-directory parses of every PE in the install. There are five: `Caster.exe` and
  `Casapi.dll`, each present twice as byte-identical copies, and
  `Microsoft.Toolkit.Forms.UI.Controls.WebView.dll`. `Caster.exe` imports 13 distinct system DLLs
  statically and 9 by delay-load and has no export directory; the WebView DLL is managed and
  imports `mscoree.dll` alone. Neither imports `Casapi.dll`, statically or by delay-load. No
  executable or config file in either distribution mentions the name at all — only the two manuals
  do, in prose — and the install ships no launcher executable.

The DLL's entry point (`$0060127C`, symbol `@Casapi@initialization`) is the stock five-instruction
Delphi library start: `mov eax, 0x5f9878` — the unit initialisation table — then
`call @Sysinit@@InitLib` and `call @System@@Halt0`. There is no game-specific `DllMain` body and
no `DllProc` hook, so a client that loads it gets zero-initialised tables and must drive the
data-loading exports itself.

No `.CAS` in either script set calls any of this. `UnitBuildingRequirement` in particular appears
in exactly one place in the project's script sources: its declaration at
`../Script source/CAS reference/CasApi.pas:427`.

## Range and overflow checking is off where the accessors run

Delphi emits `call @System@@BoundErr` before a checked array index and `jno` / `call
@System@@IntOver` after checked arithmetic. Counting direct call sites to those two handlers:

| Extent | `@BoundErr` | `@IntOver` |
|---|---|---|
| `Caster.exe`, whole image | 16,357 | 22,838 |
| `Caster.exe`, `CasterCore` facade (`$00642F94..$0064DEF3`) | 561 | 491 |
| `Caster.exe`, `@Units@RecalculateUnits` | 1,183 | 1,451 |
| `Caster.exe`, `@Combat@ApplyAttack` | 93 | 131 |
| `Caster.exe`, `@Init@LoadUnitsINI` | 20 | 3 |
| `Casapi.dll`, whole image | 1,172 | 1 |
| `Casapi.dll`, `Casapi` facade (`$005F1DC4..$00601291`) | **0** | **0** |
| `Casapi.dll`, `@Units@RecalculateUnits` | **0** | **0** |
| `Casapi.dll`, `@Combat@ApplyAttack` | **0** | **0** |
| `Casapi.dll`, `@Init@LoadUnitsINI` | 20 | 0 |

Range checking is set per compilation unit, not image-wide. The whole `Casapi`, `Units` and
`Combat` modules emit none; the DLL's residual 1,172 sites belong to modules that kept the setting
— `Scripts` 410, `Init` 400, `OverlandMovement` 271, `Economy` 71, `System.Variants` 20. Overflow
checking is off everywhere the accessors reach, with one surviving site in the whole DLL, in
`System`. The size difference follows: the DLL's `@Units@RecalculateUnits` is `0x5E80` bytes
against the executable's `0xE150` for the same routine — the removed bytes are checks and
whatever else the two builds differ by, which this count does not separate.

What this establishes is bounded. Zero handler calls in a wrapper proves no *compiler-emitted*
check; a routine could still validate by hand. `BuildingRequirement` below shows one that does,
after a fashion, and `UnitBuildingRequirement` shows one that does not. Any other export needs
reading before it is called safe.

## `UnitBuildingRequirement` (export ordinal 689, `$005F5DEC`)

`CasApi.pas:427` declares `Function UnitBuildingRequirement(b,i : integer) : integer; stdcall;`
with the comment "Same but for building units. i must be 1, 2 or 3." The body,
`@CasapiUnitBuildingRequirement`, is 0x29 bytes and takes both arguments straight off the stack:

```
005F5DF0  694508e1010000   imul eax, dword ptr [ebp + 8], 0x1e1   ; b, unchecked
005F5DF7  8b158cf46000     mov  edx, dword ptr [0x60f48c]         ; UnittableT
005F5DFD  8d0482           lea  eax, [edx + eax*4]
005F5E00  8b550c           mov  edx, dword ptr [ebp + 0xc]        ; i, unchecked
005F5E03  8b849090000000   mov  eax, dword ptr [eax + edx*4 + 0x90]
```

The declared domain is exact and both arguments miss it. `Typedec.pas:359` declares
`UnittableT = array[0..Maxunittypesarraysize] of UnitT` and `SharedConstants.pas:16` sets that
constant to 400, so `b` is 0..400 over a 401 × 1,924 = 771,524-byte table — the storage bound, not
necessarily the highest configured unit type. `Typedec.pas:183` declares
`rqbuilding : array[1..3] of integer` at record `+0x94`, so `i` is 1..3. The executable's
counterpart `@Castercore@UnitBuildingRequirement` (`Caster.exe` `$00648D6C`) computes the same
field expression with both bounds enforced, and they are the declared ones verbatim:
`cmp eax, 0x190; jbe` for `b`, and `dec edx; cmp edx, 2; jbe` for `i`. Its one caller in the
executable is `@RenderUI@ProductionPreview`, from `$0067BB17`.

Out of range, the DLL's arithmetic simply runs. `i=0` reads record `+0x90`, `unitT.savemodifier`
(`Typedec.pas:181`); the field's full no-writer, no-consumer census stays in
[unit recalculation](./CoM2%20binary%20-%20unit%20recalculation.md). With shipped data the read
returns a defined 0, on two independent grounds: the table pointer is a compile-time constant into
a section with raw size 0 (`[0x60f48c]` → `$0D6C082C`, `.bss`), so it starts zero-filled; and all
401 `+0x90` slots of the shipped `Units.dat` — itself 771,524 bytes, the table verbatim — are zero
in the CoM2 and Warlord copies alike. Neither guarantees 0 for a client that loads its own data.
`i=4` and up walk into `famerequirement`, `laircost` and beyond. `b` is worse: each unit costs
1,924 bytes of stride, so `b=401` reads past the table and returns whatever is there, and a large
or negative `b` reads an address the table never covered — unrelated mapped data if it is mapped,
an access violation if it is not.

The neighbouring export is a useful contrast. `BuildingRequirement(b,i)` (`$005F5DB0`, `i` must be
1 or 2) is written as a two-arm `case` and so cannot mis-index — but its `else` path falls through
to `mov eax, [ebp-4]` with the result local never assigned, returning whatever was on the stack.
Its executable counterpart at `Caster.exe` `$00648D00` has the same `case` shape plus the bound
`dec eax; cmp eax, 0x63; jbe` on `b`. Neither DLL export validates `b`.

## Verdict: a tool-author hazard, not a game or mod hazard

It cannot affect play. No shipped file loads the DLL, no `.CAS` reaches these entry points, and
the checked `CasterCore` path the executable actually runs is bounded correctly, so a mod author
working in CAS and INI cannot reach the unchecked code at all.

It is worth recording for whoever writes a native tool against the SDK, because the danger is
larger than one field. Where `CasApi.pas` states a precondition it is only a comment: across all
914 exports the compiler emits not one check to enforce anything, so any enforcement has to be
hand-written, and the two accessors read here show what that is worth — `UnitBuildingRequirement`
has none at all, and `BuildingRequirement`'s `case` fails open into an unassigned result rather
than raising. A tool that trusts a signature and passes an id it read out of a save file therefore
gets a silent wrong answer where the index lands inside the record, unrelated bytes where it lands
past the table, and an access violation where it lands off the mapped image.
`UnitBuildingRequirement(b, 0)` is the mild end of that: with the shipped data it returns 0 from a
field the engine never uses. A native client has to honour the documented preconditions and
validate every external id itself; the exports do neither. That is also the honest reading of the
changelog's own "currently untested. Use it at your own risk."

No calculator consequence: `savemodifier` stays out of the CoM2 card field set, and this project
reads `Caster.exe` rather than the DLL.
