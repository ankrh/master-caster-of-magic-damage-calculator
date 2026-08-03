# R5.2k — small damage-call-closure helpers: executable evidence

This is the evidence companion to `Combat.CallClosureHelpers.pas`. It covers six
complete TD32 extents in the pinned `Caster.exe`:

| Symbol | Extent |
|---|---:|
| `@Wizard@HasGlobalEnchantment` | `$00590DAC..$00590E07` |
| `@Units@HasTeleMerge` | `$005952DC..$00595352` |
| `@Units@DeadFigures` | `$005964F8..$00596553` |
| `@Combat@CombatDistance` | `$005BB1CC..$005BB232` |
| `@Combat@CGADEnemy` | `$005BD25C..$005BD284` |
| `@Game@CanHealNaturally` | `$005ECB4C..$005ECBC4` |

## Provenance and review status

The executable's size and MD5 matched the identity in this directory's README
immediately before disassembly. Codex produced the derivation cold without
reading, searching for, or receiving a Claude derivation or review. Whole-routine
inbound scans found no straddling outer branch for any extent. At the user's
direction, Codex then performed a separate uncollapsed raw-byte self-review on
2026-08-02 and integrated without Claude input or a formal cross-review.

The second pass decoded the routines in reverse order, rechecked every branch
destination, field layer, call target, result store and arithmetic sequence, and
found no reconstruction or completeness correction. It specifically confirmed
that `CanHealNaturally` always performs the race check after the `nohealing`
check, and that the neutral-player fast path in `HasGlobalEnchantment` bypasses
both wizard and global-enchantment range checks.

TD32 supplies every routine name and the parameter/local names `w`, `ge`, `u`,
`x`, `y`, `x2`, `y2`, `xd`, `yd`, and `Result`. `Typedec.pas` supplies the unit
and wizard field names; the executable supplies the exact offsets and strides.
The constants `NeutralplayerID=15`, `RCNoHeal=21`, `CGDefender=1`,
`CGAttacker=2`, `MaxMaxWizards=13`, and `MaxMaxGlobals=100` are exact
`SharedConstants.pas` names and values; the last two are also exactly what the
two `HasGlobalEnchantment` guards encode.

## Complete source-shaped bodies

```pascal
function HasGlobalEnchantment(w, ge: Integer): Boolean; register;
begin
  if w = NeutralplayerID then
    Result := True                              { `$00590DB8..$00590DC2` }
  else
    Result := Wizards[w].GlobalEnchantments[ge];
                                                { `$00590DC4..$00590DFD` }
end;                                            { `$00590E00..$00590E07` }

function HasTeleMerge(u: Integer): Boolean; register;
begin
  Result := Units[u].teleporting or Units[u].merging;
                                                { `$005952E5..$00595347`;
                                                  short-circuit join `$0059534B` }
end;                                            { `$0059534B..$00595352` }

function DeadFigures(u: Integer): Integer; register;
begin
  Result := BaseUnits[u].figures - LivingFigures(u);
                                                { record address `$00596501..$0059652C`;
                                                  call `$00596532 E855FFFFFF`;
                                                  checked subtract `$0059653A..$00596549` }
end;                                            { `$00596549..$00596553` }

function CombatDistance(x, y, x2, y2: Integer): Integer; register;
var
  xd, yd: Integer;
begin
  xd := Abs(x - x2);                            { `$005BB1DB..$005BB1F4` }
  yd := Abs(y - y2);                            { `$005BB1F7..$005BB210` }
  if xd > yd then
    Result := xd                                { `$005BB213..$005BB221` }
  else
    Result := yd;                               { target `$005BB223` begins
                                                  `8B45E8 mov eax,[yd]` }
end;                                            { `$005BB229..$005BB232` }

function CGADEnemy: Integer; register;
begin
  if inferred_CombatAttackersTurnState then
    Result := CGDefender                        { `$005BD260..$005BD275` }
  else
    Result := CGAttacker;                       { target `$005BD277` begins
                                                  `C745FC02000000 mov [Result],2` }
end;                                            { `$005BD27E..$005BD284` }

function CanHealNaturally(u: Integer): Boolean; register;
begin
  Result := True;                               { `$005ECB55 C645FB01` }
  if Units[u].nohealing then
    Result := False;                            { `$005ECB59..$005ECB87` }
  if Units[u].race = RCNoHeal then
    Result := False;                            { `$005ECB8B..$005ECBB9` }
end;                                            { `$005ECBBD..$005ECBC4` }
```

The relevant exact field offsets are `race +$07C`, `figures +$088`,
`teleporting +$0BD`, `merging +$0C0`, and `nohealing +$72A`. `HasTeleMerge`
and `CanHealNaturally` read calculated `Units`; `DeadFigures` reads
`BaseUnits`. `GlobalEnchantments[1]` is at current-binary WizardT offset
`+$89AF4`, after the documented eight-byte drift in the shipped CAS header.

## Exact semantic findings

- Wizard 15, `NeutralplayerID`, is treated as having every global enchantment.
  Any other wizard index is range-checked as 0..13 and `ge` as 1..100 before
  the actual wizard record is read.
- `HasTeleMerge` is exactly calculated Teleporting OR calculated Merging, with
  Teleporting short-circuiting the Merging read. Consequently modern
  `FirewallEffect` skips Wall of Fire for either state, not just for Flying.
- `DeadFigures` is exactly base maximum figures minus current `LivingFigures`.
  It has no clamp of its own.
- `CombatDistance` is `max(abs(x-x2), abs(y-y2))`: Chebyshev distance on the
  combat grid, with signed-overflow checking around both subtraction and
  absolute value operations.
- `CGADEnemy` reads the same runtime Boolean exposed by
  `@Castercore@CombatAttackersTurn` (`$00643FB0..$00643FC8`). True returns
  `CGDefender=1`; false returns `CGAttacker=2`.
- `CanHealNaturally` initializes true, clears for calculated `nohealing`, and
  independently clears for calculated race `RCNoHeal=21`. The second read is
  not short-circuited when the first condition already cleared the result.

## Semantic conditional branches and targets

Compiler range/overflow guards are excluded under the reconstruction
convention. Every semantic conditional quotes the encoded jump and the bytes
that begin its destination.

| Routine | Jump bytes | Target | Target contents |
|---|---|---:|---|
| `HasGlobalEnchantment` | `$00590DBC 7506 jne` | `$00590DC4` | `8B45FC mov eax,[w]`: begin the bounded real-wizard access; wizard 15 instead set true and jumped to the return |
| `HasTeleMerge` | `$00595311 752E jne` | `$00595341` | `C645FB01 mov byte ptr [Result],1`: Teleporting short-circuits Merging and returns true |
| `HasTeleMerge` | `$0059533F 7406 je` | `$00595347` | `C645FB00 mov byte ptr [Result],0`: neither calculated flag is set |
| `CombatDistance` | `$005BB219 7E08 jle` | `$005BB223` | `8B45E8 mov eax,[yd]`: `xd <= yd` selects the y-axis distance |
| `CGADEnemy` | `$005BD26C 7409 je` | `$005BD277` | `C745FC02000000 mov dword ptr [Result],2`: defender's turn selects combat-global attacker side 2 |
| `CanHealNaturally` | `$005ECB85 7404 je` | `$005ECB8B` | `8B45FC mov eax,[u]`: begin the independent race check without changing Result |
| `CanHealNaturally` | `$005ECBB7 7504 jne` | `$005ECBBD` | `8A45FB mov al,[Result]`: non-`RCNoHeal` race returns the current result; equality falls through and clears it |

`DeadFigures` has no semantic conditional branch.

## Semantic calls and state writes

The sole semantic call in all six extents is:

| Address | Bytes | Target / role |
|---:|---|---|
| `$00596532` | `E855FFFFFF` | `@Units@LivingFigures`, subtracted from base maximum figures |

All other calls are compiler `BoundErr` or `IntOver` guards. The six helpers
write only their local `Result` slots; none writes persistent or calculated
game state. No executable body is hidden behind a synthetic helper.

## Complete arithmetic and address idioms

- `HasGlobalEnchantment` forms its wizard record with
  `$00590DD1 69C097290300 imul eax,eax,$32997`;
  `$00590DD7 7105 jno $00590DDE`; `$00590DD9 E80A61E7FF call IntOver`;
  `$00590DDE 8B1588917000 mov edx,[$00709188]`;
  `$00590DE4 8D04C2 lea eax,[edx+eax*8]`. The exact byte stride is therefore
  `$32997 * 8 = $194CB8`. The one-based global index is
  `$00590DE7 8B55F8`; `$00590DEA 4A dec edx`;
  `$00590DEB 83FA63 cmp edx,$63`; range guard; `$00590DF5 42 inc edx`;
  `$00590DF6 8A8410F39A0800 mov al,[eax+edx+$89AF3]`.
- Every unit record access uses `dec index`, unsigned check against `$9C3F`,
  `inc index`, checked `imul $1E1`, and scale 4, giving the exact `$784`-byte
  stride and declared one-based 1..40000 bound. `HasTeleMerge` repeats the
  complete calculation at `$005952E5..$00595311` and
  `$00595313..$0059533F`; `CanHealNaturally` repeats it at
  `$005ECB59..$005ECB85` and `$005ECB8B..$005ECBB7`.
- `DeadFigures` captures `@BaseUnits[u]` at `$00596501..$0059652C`, calls
  `LivingFigures`, then uses the complete checked subtraction:
  `$0059653A 8B9288000000 mov edx,[record+$88]`;
  `$00596540 2BD0 sub edx,eax`; `$00596542 7105 jno $00596549`;
  `$00596544 E89F09E7FF call IntOver`; `$00596549 8955F8 mov [Result],edx`.
- The x absolute delta is the full
  `$005BB1DB 8B45FC`; `$005BB1DE 2B45F4`; `$005BB1E1 7105` plus `IntOver`;
  `$005BB1E8 99 cdq`; `$005BB1E9 33C2 xor eax,edx`;
  `$005BB1EB 2BC2 sub eax,edx`; `$005BB1ED 7105` plus `IntOver`;
  `$005BB1F4 8945EC` sequence. Y repeats it at `$005BB1F7..$005BB210`.
  The signed comparison and selection are `$005BB213..$005BB229`.

## Coverage ledgers

### `HasGlobalEnchantment`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$00590DAC` | `$00590E07` | — | reconstructed | neutral-player special case, bounded wizard/global access and Boolean return |

### `HasTeleMerge`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005952DC` | `$00595352` | — | reconstructed | calculated Teleporting/Merging short-circuit predicate and return |

### `DeadFigures`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005964F8` | `$00596553` | — | reconstructed | base-figure read, LivingFigures call, checked subtraction and return |

### `CombatDistance`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005BB1CC` | `$005BB232` | — | reconstructed | two complete checked absolute deltas, maximum selection and return |

### `CGADEnemy`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005BD25C` | `$005BD284` | — | reconstructed | turn-state read and defender/attacker combat-global side selection |

### `CanHealNaturally`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005ECB4C` | `$005ECBC4` | — | reconstructed | true initialization, calculated NoHealing and RCNoHeal gates, return |

## Completion declaration

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Verifier totals, run separately: `HasGlobalEnchantment` 1/1 branches, 0 calls,
0 writes; `HasTeleMerge` 2/2, 0, 0; `DeadFigures` 0, 1/1, 0;
`CombatDistance` 1/1, 0, 0; `CGADEnemy` 1/1, 0, 0; and
`CanHealNaturally` 2/2, 0, 0. All six ledgers are contiguous and all declare
zero parent mismatches.

R5.2k closes the six R5.2i call-closure gaps. The exact `CGADEnemy` body supports
existing defect F24; the exact natural-healing predicate completes the callee
detail needed by F28. The newly proved Teleporting/Merging Wall-of-Fire exclusion
is tracked as F40.
