# R5.2m evidence — `@Combat@AmplifiedDamage`

Durable evidence for the `Combat.AmplifiedDamage.pas` reconstruction of pinned
`Caster.exe` extent `$005BEB28..$005BEC6F`. The executable is the CoM2 1.05.11 build whose
identity is owned by [`README.md`](./README.md); its byte size and MD5 were rechecked immediately
before derivation and matched that record exactly. TD32 supplies the routine and local names.

This was a user-directed **single-agent, no-Claude** derivation. Codex did not read or receive any
Claude derivation or review artifact.

## Reconstructed body and exact predicate

```pascal
function AmplifiedDamage(u, sp: Integer): Boolean; register;
var
  b: Boolean;
  i: Integer;
begin
  { `sp` is homed at $005BEB2E but is never read. }
  if not Iscombat then                           { call/test $005BEB34..$005BEB3B;
                                                   true target $005BEB46 initializes
                                                   the combat-only scan }
  begin
    Result := False;                            { $005BEB3D;
                                                   jump $005BEB41 targets
                                                   $005BEC68, the return load }
    Exit;
  end;

  b := False;                                   { $005BEB46 }
  for i := 1 to inferred_Maxunits do            { bound read/test $005BEB4A..$005BEB57;
                                                   non-positive target $005BEC62 copies
                                                   `b` to `Result`; saved bound and `i := 1`
                                                   at $005BEB5D..$005BEB60;
                                                   back-edge $005BEC56..$005BEC5C targets
                                                   $005BEB67, the next record read }
  begin
    if (not BaseUnits[i].dead) and               { $005BEB67..$005BEB93;
                                                   dead target $005BEC56 advances the loop }
       BaseUnits[i].incombat and                 { $005BEB99..$005BEBC5;
                                                   false target $005BEC56 advances the loop }
       Units[i].amplifier and                    { $005BEBCB..$005BEBF7;
                                                   false target $005BEC56 advances the loop }
       (Units[i].owner <> Units[u].owner) then   { owner reads $005BEBF9..$005BEC49;
                                                   equal target $005BEC56 advances the loop }
      b := True;                                 { $005BEC52 }
  end;

  Result := b;                                  { $005BEC62..$005BEC65 }
end;                                             { $005BEC68..$005BEC6F }
```

`inferred_Maxunits` is an alias, not a recovered TD32 global name. Its exact value is the dword
at runtime-data displacement `$01AC1F18`, loaded through pointer global `$00709188` at
`$005BEB4A..$005BEB4F`. That location is four bytes before `BaseUnits[1]`, matching the durable
unit-record address model. The compiler saves the bound once before the loop.

The exact predicate is:

```text
Iscombat
and exists i in 1..inferred_Maxunits:
    not BaseUnits[i].dead
    and BaseUnits[i].incombat
    and Units[i].amplifier
    and Units[i].owner <> Units[u].owner
```

The scan does not stop after a match. Its Boolean remains true while later candidates are
visited, so multiple Amplifiers do not stack. The routine has no spell-ID condition and does not
read `sp`. It also receives no caster argument: executable truth is only that the qualifying
Amplifier's calculated owner differs from the target unit's calculated owner.

`ApplyDamageSpell` calls this predicate after `DamageSpell`. If true, it adds one point to only
the first positive damage category in priority `normal`, `irrec`, `undead`; a wholly zero record
stays zero. Thus the predicate applies to every positive direct-spell result routed through that
wrapper, including Warlord Wall of Fire's non-area path.

## Conditional-branch target bytes

| Meaning | Instruction bytes | Target and target contents |
|---|---|---|
| combat is active | `$005BEB39 84c0`; `$005BEB3B 7509` | `$005BEB46 c645f300` initializes `b := False` and starts the scan. False falls through to `Result := False`. |
| `inferred_Maxunits <= 0` | `$005BEB55 85c0`; `$005BEB57 0f8e05010000` | `$005BEC62 8a45f3` copies the still-false `b` toward `Result`. |
| candidate is dead | `$005BEB8B 80bc82361eac0100`; `$005BEB93 0f85bd000000` | `$005BEC56 ff45f4` increments `i` and proceeds to the trip-count decrement. |
| candidate is not in combat | `$005BEBBD 80bc823a1eac0100`; `$005BEBC5 0f848b000000` | `$005BEC56 ff45f4` advances the loop without testing Amplifier or owner. |
| candidate lacks Amplifier | `$005BEBEF 80bc82676f420600`; `$005BEBF7 745d` | `$005BEC56 ff45f4` advances the loop without reading either owner. |
| owners are equal | `$005BEC49 3a8491316f4206`; `$005BEC50 7404` | `$005BEC56 ff45f4` advances without setting `b`; inequality falls through to `$005BEC52 c645f301`, `b := True`. |
| saved trip count remains nonzero | `$005BEC59 ff4dec`; `$005BEC5C 0f8505ffffff` | `$005BEB67 8b45f4` begins the next candidate's checked `BaseUnits[i].dead` address calculation. |

The sole semantic call is `$005BEB34 e81bb1ffff`, targeting `@Combat@Iscombat` at
`$005B9C54`, reconstructed under R5.1c-b. Five `@System@@BoundErr` / `@System@@IntOver` pairs
are compiler guards and not semantic callees.

The off-combat unconditional branch is `$005BEB41 e922010000`, targeting
`$005BEC68 8a45fb`, the Boolean return load. The routine's sole return is
`$005BEC6E c3`; the source-shaped `Exit` and final `end` represent both paths to it.

## Reads, writes, and arithmetic/index idioms

- There are no persistent state writes. All writes target argument homes, locals, the compiler's
  saved loop bound, or `Result`.
- `$005BEB4A a188917000` and `$005BEB4F 8b80181fac01` load the bound once.
  `$005BEB55..$005BEB60` performs the empty-loop test, saves the bound, and initializes `i := 1`.
  `$005BEC56 ff45f4`, `$005BEC59 ff4dec`, and `$005BEC5C 0f8505ffffff` implement `Inc(i)`,
  count-down, and the back-edge. This is a positive inclusive `1..inferred_Maxunits` loop.
- The four candidate accesses use the complete checked 1-based array-index idiom at
  `$005BEB67..$005BEB85`, `$005BEB99..$005BEBB7`, `$005BEBCB..$005BEBE9`, and
  `$005BEBF9..$005BEC17`; the target owner uses the same complete idiom at
  `$005BEC24..$005BEC43`. Each is `mov index; dec; cmp $9C3F; jbe / BoundErr; inc;
  imul index,$1E1; jno / IntOver`. `$1E1` dwords is the exact 1,924-byte `unitT` stride,
  and the post-`dec` `$9C3F` comparison implements the exact `array[1..40000]` bound.
- Branch-affecting field operands preserve the two record layers:
  `BaseUnits[i].dead` `$005BEB8B`, `BaseUnits[i].incombat` `$005BEBBD`,
  `Units[i].amplifier` `$005BEBEF`, `Units[i].owner` `$005BEC1D`, and
  `Units[u].owner` `$005BEC49`.
- No signed division, corrected shift, floating-point conversion, or rounding idiom occurs in
  this routine. The complete semantic arithmetic is the loop and indexing machinery above.

## Prose cross-check

CoM2 helptext and manual agree that a present Amplifier makes friendly spells deal or heal one
more damage after successfully dealing damage and that copies do not stack. Warlord helptext
states the same behavior; its manual records changes to Amplifier's item cost/book requirement
and no contradictory combat behavior. The executable tightens “friendly” to the owner comparison
above for this damage caller and confirms the non-stacking Boolean. Healing is not inferred from
this function; the sibling healing-side routine was outside R5.2m's assigned extent.

## Separate raw-byte self-review

After the cold derivation was complete, Codex generated fresh Capstone disassembly directly from
the pinned bytes in three windows: `$005BEB28..$005BEB85`, `$005BEB85..$005BEC17`, and
`$005BEC17..$005BEC6F`. The second pass rechecked all branch targets and their first
instructions, the call displacement, off-combat exit, five full checked-index sequences,
base/current record selection, both owner operands, loop trip count, every local/result write,
and the exclusive end.

Self-review correction count: **0**. No unresolved or disputed instruction remains.

Verified: Codex 2026-08-02, cold derivation plus separate raw-byte self-review. The user directed
single-agent integration without Claude input; no Claude derivation or review was read or used.

## Coverage ledger

The required whole-routine inbound scan identified the enclosing TD32 extent as
`@Combat@AmplifiedDamage`, `$005BEB28..$005BEC6F`, and found no straddling outer branch.
Both ledger rows are therefore top level.

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005BEB28` | `$005BEC68` | — | reconstructed | complete ABI, off-combat return, combat-unit scan, exact base/current predicates, owner comparison, loop, and result assignment |
| 1 | `$005BEC68` | `$005BEC6F` | — | compiler-only | Boolean return load and routine epilogue |

## Completion declaration

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Accounting: 7/7 semantic conditional jumps, 1/1 semantic calls, and 0/0
verifier-classified named-field writes are cited. All five branch-affecting record reads and all
local/result writes are individually represented.
