# R5.2j evidence — `@Spells@ApplyDamageSpell`

Durable evidence for the `Spells.DamageSpells.pas` reconstruction of the pinned
`Caster.exe` extent `$005C1974..$005C1C45`.

## Reconstructed body

```pascal
const
  SIceBolt = 13;
  SAEtherSparks = 42;
  EncFrozen = 61;

procedure ApplyDamageSpell(u, sp, ov: Integer); register;
var
  dam: damageT;
begin
  dam := DamageSpell(u, sp, ov);                 { hidden result pointer and call
                                                    $005C1983..$005C1990 }

  if AmplifiedDamage(u, sp) then                 { call $005C1995..$005C199B;
                                                    false target $005C19DB starts
                                                    the Dealdamage argument load }
  begin
    if dam.normal > 0 then                       { $005C19A4..$005C19A8;
                                                    false target $005C19B7 tests
                                                    dam.irrec }
      Inc(dam.normal)                            { $005C19AA }
    else if dam.irrec > 0 then                   { $005C19B7..$005C19BB;
                                                    false target $005C19CA tests
                                                    dam.undead }
      Inc(dam.irrec)                             { $005C19BD }
    else if dam.undead > 0 then                  { $005C19CA..$005C19CE;
                                                    false target $005C19DB starts
                                                    the Dealdamage argument load }
      Inc(dam.undead);                           { $005C19D0 }
  end;

  Dealdamage(u, dam.normal, dam.undead, True,
    dam.irrec);                                  { $005C19DB..$005C19EA }

  if sp = SAEtherSparks then                     { $005C19EF..$005C19F3;
                                                    false target $005C1B10 starts
                                                    the Ice Bolt gate }
  begin
    BaseUnits[u].mp := BaseUnits[u].mp div 2;    { signed-word read $005C1A1D;
                                                    complete signed-div-two idiom
                                                    $005C1A25..$005C1A29;
                                                    signed-word write $005C1A67 }

    if Ismagicalranged(BaseUnits[u].rangedtype) or
       Ismagicalranged(Units[u].rangedtype) then { first call $005C1A93..$005C1A9A,
                                                    true target $005C1AD7 starts
                                                    ammo halving; second call
                                                    $005C1AC7..$005C1ACE,
                                                    false target $005C1B10 starts
                                                    the Ice Bolt gate }
      BaseUnits[u].ammo := BaseUnits[u].ammo div 2;
                                                 { address/read and complete idiv
                                                    $005C1AF5..$005C1B0B;
                                                    write $005C1B0E }
  end;

  if (sp = SIceBolt) and                         { $005C1B10..$005C1B14;
                                                    false target $005C1BD4 starts
                                                    the death-state block }
     (not Units[u].coldimmunity) and             { $005C1B3E..$005C1B46;
                                                    true target $005C1BD4 starts
                                                    the death-state block }
     (not Units[u].noncorporeal) and             { $005C1B70..$005C1B78;
                                                    true target $005C1BD4 starts
                                                    the death-state block }
     (not Units[u].immolation) then              { $005C1B9E..$005C1BA6;
                                                    true target $005C1BD4 starts
                                                    the death-state block }
    BaseUnits[u].CombatEnchantmentFlags[EncFrozen] := True;
                                                 { $005C1BC6..$005C1BCC }

  if Units[u].dead and                           { $005C1BF2..$005C1C00;
                                                    false target $005C1C41 is
                                                    the routine epilogue }
     (not Iscombat) then                         { call/test $005C1C02..$005C1C07;
                                                    true target $005C1C41 is
                                                    the routine epilogue }
    UnitDies(u, False, Units[u].owner);          { owner read $005C1C29..$005C1C2F;
                                                    call $005C1C3C }
end;                                             { $005C1C41..$005C1C45 }
```

`damageT` has the R5.2g layout `irrec +$00`, `undead +$04`, `normal +$08`.
With the hidden result pointer at `[ebp-$18]`, the three locals read at
`[ebp-$18]`, `[ebp-$14]`, and `[ebp-$10]` are therefore `dam.irrec`,
`dam.undead`, and `dam.normal` respectively.

## Branch-target byte evidence

| Test | Instruction bytes | Target and contents |
|---|---|---|
| AmplifiedDamage false | `$005C19A0 84c0`; `$005C19A2 7437` | `$005C19DB` loads `dam.irrec` for `Dealdamage`, bypassing all three increments. |
| `dam.normal <= 0` | `$005C19A4 837df000`; `$005C19A8 7e0d` | `$005C19B7` tests `dam.irrec`. |
| `dam.irrec <= 0` | `$005C19B7 837de800`; `$005C19BB 7e0d` | `$005C19CA` tests `dam.undead`. |
| `dam.undead <= 0` | `$005C19CA 837dec00`; `$005C19CE 7e0b` | `$005C19DB` loads the record for `Dealdamage`. |
| `sp <> 42` | `$005C19EF 837df82a`; `$005C19F3 0f8517010000` | `$005C1B10` starts the Ice Bolt gate. |
| base ranged type is magical | `$005C1A9F 84c0`; `$005C1AA1 7534` | `$005C1AD7` starts the ammo-halving record address calculation. |
| calculated ranged type is not magical | `$005C1AD3 84c0`; `$005C1AD5 7439` | `$005C1B10` starts the Ice Bolt gate and skips ammo halving. |
| `sp <> 13` | `$005C1B10 837df80d`; `$005C1B14 0f85ba000000` | `$005C1BD4` starts the death-state block. |
| Cold Immunity present | `$005C1B3E 80bc825d69420600`; `$005C1B46 0f8588000000` | `$005C1BD4` starts the death-state block. |
| Noncorporeal present | `$005C1B70 80bc827269420600`; `$005C1B78 755a` | `$005C1BD4` starts the death-state block. |
| Immolation present | `$005C1B9E 80bc826569420600`; `$005C1BA6 752c` | `$005C1BD4` starts the death-state block. |
| unit not dead | `$005C1BF8 80bc82366f420600`; `$005C1C00 743f` | `$005C1C41` is the routine epilogue. |
| combat active | `$005C1C07 84c0`; `$005C1C09 7536` | `$005C1C41` is the routine epilogue. |

## Arithmetic and state-write evidence

- The mana operation is Delphi signed `div 2`, not an arithmetic shift: `$005C1A1D
  0fbf8482421eac01` sign-extends `BaseUnits[u].mp`, then `$005C1A25 d1f8`,
  `$005C1A27 7903`, `$005C1A29 83d000` perform `sar` plus the negative-value
  correction. `$005C1A2C..$005C1A3D` is the compiler's signed-word range check;
  `$005C1A67 66898491421eac01` writes the word result.
- Ammo uses an explicit complete signed division: `$005C1AFB b902000000` loads 2,
  `$005C1B00 8d8482e017ac01` takes the `BaseUnits[u].ammo` address,
  `$005C1B08 8b00`, `$005C1B0A 99`, `$005C1B0B f7f9` read, sign-extend and
  `idiv`, and `$005C1B0E 8902` writes the quotient back.
- The local damage-record writes are `$005C19AA 8345f001` (`normal`),
  `$005C19BD 8345e801` (`irrec`), and `$005C19D0 8345ec01` (`undead`). Their
  priority is mutually exclusive because each successful case jumps to `$005C19DB`.
- `$005C1BCC c68482a51dac0101` writes `True` to
  `BaseUnits[u].CombatEnchantmentFlags[61=EncFrozen]`.

## Semantic calls and closure classification

| Call site | Bytes | Target | Classification |
|---|---|---|---|
| `$005C1990` | `e853f7ffff` | `@Spells@DamageSpell` | reconstructed in R5.2g |
| `$005C199B` | `e888d1ffff` | `@Combat@AmplifiedDamage` | reconstructed in R5.2m; [`Combat.AmplifiedDamage.R5.2m.evidence.md`](./Combat.AmplifiedDamage.R5.2m.evidence.md) proves the exact non-stacking, opposing-owner predicate |
| `$005C19EA` | `e8d127ffff` | `@Combat@Dealdamage` | reconstructed in R5.2f |
| `$005C1A9A` | `e85549fdff` | `@Units@Ismagicalranged` | reconstructed in R5.1c-a |
| `$005C1ACE` | `e82149fdff` | `@Units@Ismagicalranged` | reconstructed in R5.1c-a |
| `$005C1C02` | `e84d80ffff` | `@Combat@Iscombat` | reconstructed in R5.1c-b |
| `$005C1C3C` | `e8fb42fdff` | `@Units@UnitDies` | calculator-irrelevant post-resolution world-state cleanup: it is reached only after `Dealdamage`, only when `Units[u].dead` is already true, only outside combat, and no value or unit field is read afterward in this routine |

The range/overflow calls to `@System@@BoundErr` and `@System@@IntOver` are
compiler-only under the reconstruction convention and are not semantic callees.

## Single-agent review record

Codex first completed the source-shaped derivation without reading or receiving a
Claude derivation. A separate raw-byte pass then re-read the entire extent in three
independent windows: `$005C1983..$005C19F3`, `$005C19EF..$005C1B10`, and
`$005C1B10..$005C1C45`. It rechecked all branch destinations, both division idioms,
the three damage-category offsets, both ranged-type sources, all persistent writes,
and the `UnitDies` argument registers. No correction was required.

Claude reviewed the full extent against the binary on 2026-08-03. All thirteen conditionals,
both division idioms, all seven calls, all writes, the `damageT` layout and the `Dealdamage`
argument order reproduced; no semantic correction was required.

The spell IDs and prose meaning were cross-checked against both shipped data sets and
both versions' co-equal prose sources. CoM2 `SPELLS.INI` and Warlord `SPELLS.INI`
both name ID 13 Ice Bolt and ID 42 AEther Sparks. CoM2 help and manual agree on the
Frozen exclusions and the mana/ammo-halving effect. Warlord help states the same
exclusions and halving; its manual's Ice Bolt change entry changes strength, hit chance
and cost but does not contradict the side effects. No source discrepancy was found.

## Coverage ledger

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005C1974` | `$005C1995` | — | reconstructed | ABI homes, hidden damage-record result pointer, `DamageSpell` call |
| 1 | `$005C1995` | `$005C19DB` | — | reconstructed | `AmplifiedDamage` predicate and mutually exclusive normal/irrecoverable/undead increment priority |
| 2 | `$005C19DB` | `$005C19EF` | — | reconstructed | `Dealdamage` argument routing and call |
| 3 | `$005C19EF` | `$005C1B10` | — | reconstructed | AEther Sparks mana halving and magical-ranged-gated ammo halving |
| 4 | `$005C1B10` | `$005C1BD4` | — | reconstructed | Ice Bolt Cold Immunity/Noncorporeal/Immolation exclusions and Frozen write |
| 5 | `$005C1BD4` | `$005C1C41` | — | reconstructed | dead/off-combat gate, owner read and `UnitDies` cleanup call |
| 6 | `$005C1C41` | `$005C1C45` | — | compiler-only | routine epilogue |

## Completion declaration

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Accounting: 13/13 semantic conditional jumps, 7/7 semantic calls, and 3/3
verifier-classified named-field writes are cited. The three additional direct local
damage-record writes are also individually cited above.
