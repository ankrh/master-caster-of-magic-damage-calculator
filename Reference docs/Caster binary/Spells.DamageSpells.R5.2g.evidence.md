# R5.2g — derivation and byte-level evidence

Scope: `@Spells@DamageSpell`, `$005C10E8..$005C1954`, and
`@Spells@FirewallEffect`, `$005C1C48..$005C1CA5`, from the pinned `Caster.exe`.
No Claude derivation or review was read or produced during the 2026-08-02 derivation. Claude's
2026-08-03 review initially found no semantic misreading. Codex's reciprocal review then found
that `$005C1867 jl $005C1785` had been cited but flattened into a one-shot branch. Claude re-read
the cited bytes and confirmed the correct pre-tested `while`, which appears below. Codex applied
the correction, and AKH directed R5.2g and R5.C closed on 2026-08-03. The whole-routine coverage
ledger was accepted unchanged because it has no internal boundary at this block.

The names in `SpellTableT` and `damageT` come from the shipped CAS
`Typedec.pas`. `inferred_ChaosConjunction_State` is a semantic name for the
runtime-data dword at displacement `$0AF90AE0`; the neighboring event dwords
are already address-backed in the durable R5.1 reconstruction. The spell-ID
set and the 80-bit `1.34` constant are embedded data in this routine.

```pascal
type
  damageT = record
    irrec: Integer;                            { +$00 }
    undead: Integer;                           { +$04 }
    normal: Integer;                           { +$08 }
  end;

  SpellTableT = array[0..400] of record
    inferred_beforeAttack: array[0..$47] of Byte;
    Attack: Integer;                           { +$48 }
    savepen: Integer;                          { +$4C }
    Illusion: Boolean;                         { +$50 }
    Doom: Boolean;                             { +$51 }
    Piercing: Boolean;                         { +$52 }
    Lightning: Boolean;                        { +$53 }
    Area: Boolean;                             { +$54 }
    Poison: Boolean;                           { +$55 }
    Fire: Boolean;                             { +$56 }
    Cold: Boolean;                             { +$57 }
    Missile: Boolean;                          { +$58 }
    Stoning: Boolean;                          { +$59 }
    Death: Boolean;                            { +$5A }
    Nonmagic: Boolean;                         { +$5B }
    Corporeal: Boolean;                        { +$5C }
    Nonhero: Boolean;                          { +$5D }
    inferred_alignment: array[$5E..$5F] of Byte;
    hitchance: Integer;                        { +$60 }
    inferred_afterHitChance: array[$64..$93] of Byte;
    irrecoverable: Boolean;                     { +$94 }
    undeaddamage: Boolean;                      { +$95 }
    inferred_tail: array[$96..$B7] of Byte;     { full entry stride $B8 }
  end;

  inferred_unitT = record
    defendchance: Integer;                      { +$050 }
    flying: Boolean;                            { +$0BC }
    Fireimmunity: Boolean;                      { +$0C1 }
    stoningimmunity: Boolean;                   { +$0C2 }
    missileImmunity: Boolean;                   { +$0C3 }
    illusionimmunity: Boolean;                  { +$0C4 }
    coldimmunity: Boolean;                      { +$0C5 }
    magicimmunity: Boolean;                     { +$0C6 }
    deathimmunity: Boolean;                     { +$0C7 }
    poisonimmunity: Boolean;                    { +$0C8 }
    noncorporeal: Boolean;                      { +$0DA }
    lightningresist: Boolean;                   { +$0DF }
    EnchantmentFlags: array[1..100] of Boolean; { +$509 }
  end;

const
  SChaosConjunctionScaled: set of Byte =
    [7, 13, 42, 50, 83, 91, 96, 99, 104, 122, 177];
  SWallofFire = 87;
  SWarpLightning = 101;
  EncBlackSleep = 46;
  EncInvulnerability = 44;

var
  Units: array[1..40000] of inferred_unitT;
  SpellTable: SpellTableT;
  inferred_ChaosConjunction_State: Integer;
  inferred_InvulnerabilityDamageReduction: Integer;

function DamageSpell(u, sp, stroverride: Integer): damageT; register;
var
  flags: AttackFlagsT;
  i, totaldam, topfdam, nofattacks, dam, def: Integer;
  aoe: Boolean;
  str: Integer;
begin
  Result.normal := 0;
  Result.undead := 0;
  Result.irrec := 0;                            { $005C10F8..$005C110D }

  str := SpellTable[sp].Attack;                 { $005C110F..$005C1132 }
  if stroverride <> 0 then
    str := stroverride;                         { false target $005C1141: conjunction gate }

  if inferred_ChaosConjunction_State > 0 then
  begin                                         { false target $005C1190: second conjunction test }
    if (sp <= 183) and (sp in SChaosConjunctionScaled) then
      str := Trunc(str * 1.34);                  { membership miss target $005C1190;
                                                   full `fild/fld/fmulp/TRUNC` idiom
                                                   $005C116F..$005C118D; embedded set
                                                   $005C1930..$005C1948 and 80-bit constant
                                                   $005C1948..$005C1952 }
  end;
  if (inferred_ChaosConjunction_State > 0) and
     (sp = SWarpLightning) then
    Inc(str, 2);                                { false targets $005C11AF; write $005C11A4 }

  aoe := False;
  flags.doom := False;
  flags.illusion := False;
  flags.supernatural := False;
  flags.armorpiercing := False;
  flags.mysticsurge := False;
  flags.lifesteal := False;
  flags.poison := False;
  flags.destruction := False;
  flags.stoningtouch := False;
  flags.deathtouch := False;
  flags.exorcise := False;                      { $005C11AF..$005C11DF }

  if SpellTable[sp].Illusion then
    flags.illusion := True;                     { false target $005C1209 }
  if SpellTable[sp].Area then
    aoe := True;                                { false target $005C1233 }
  if SpellTable[sp].Doom then
    flags.doom := True;                         { false target $005C125D }
  if SpellTable[sp].Piercing then
    flags.armorpiercing := True;                { false target $005C1287 }
  if SpellTable[sp].Lightning then
  begin
    if Units[u].lightningresist then
      flags.armorpiercing := False
    else
      flags.armorpiercing := True;              { immunity-false target $005C12E1;
                                                   join $005C12E5 }
  end;

  if Units[u].magicimmunity and
     (not SpellTable[sp].Nonmagic) then
    Exit;                                       { first false target $005C133D: attack-count setup;
                                                   second false target $005C1926: epilogue }

  nofattacks := 1;
  if aoe then
    nofattacks := LivingFigures(u);             { false target $005C1355; call $005C134D }
  if sp = SWarpLightning then
    nofattacks := str;                          { false target $005C1361 }

  totaldam := 0;
  def := EffectiveDefense(u, flags, True, 0, sp,
    False, False, False, False, True,
    not SpellTable[sp].Nonmagic);               { table read $005C1366..$005C1389;
                                                   call $005C13A4 }

  if SpellTable[sp].Cold and Units[u].coldimmunity then
    def := 100;                                 { false targets $005C1407; write $005C1400 }
  if SpellTable[sp].Fire and Units[u].Fireimmunity then
    def := 100;                                 { false targets $005C1462; write $005C145B }
  if SpellTable[sp].Missile and Units[u].missileImmunity then
    def := 100;                                 { false targets $005C14BD; write $005C14B6 }
  if SpellTable[sp].Poison and Units[u].poisonimmunity then
    def := 100;                                 { false targets $005C1518; write $005C1511 }
  if SpellTable[sp].Death and Units[u].deathimmunity then
    def := 100;                                 { false targets $005C1573; write $005C156C }
  if SpellTable[sp].Stoning and Units[u].stoningimmunity then
    def := 100;                                 { false targets $005C15CE; write $005C15C7 }
  if SpellTable[sp].Corporeal and Units[u].noncorporeal then
    def := 100;                                 { false targets $005C1629; write $005C1622 }

  if Units[u].EnchantmentFlags[EncBlackSleep] then
    flags.doom := True;                         { false target $005C165B; write $005C1657 }

  topfdam := TopFigureDamage(u);                 { call $005C165E }
  if flags.doom then
    totaldam := str * nofattacks                 { false target $005C1681: ordinary loop;
                                                   write $005C1679; jump target $005C18B6:
                                                   result-category routing }
  else if nofattacks > 0 then                    { false target $005C18B6: result routing }
    for i := 1 to nofattacks do
    begin
      dam := AttackRoll(str, SpellTable[sp].hitchance) -
             DefenseRoll(def, Units[u].defendchance); { calls $005C16BC, $005C16F1;
                                                        checked subtraction $005C16F6..$005C16FF }

      if Units[u].EnchantmentFlags[EncInvulnerability] then
        Dec(dam, inferred_InvulnerabilityDamageReduction); { false target $005C1741 }
      if dam < 0 then
        dam := 0;                                { false target $005C174C: area gate }

      if aoe then
      begin                                     { false target $005C1850: non-area fit test }
        if dam > HpPerFigure(u) then
          dam := HpPerFigure(u);                 { false target $005C176E; calls $005C1759,
                                                   $005C1766 }
        Inc(totaldam, dam);
        dam := 0;                                { writes $005C1771, $005C177D;
                                                   jump target $005C188C: common remainder add }
      end
      else
      begin
        { `$005C1750 je $005C1850` enters at the condition. The true edge
          `$005C1867 jl $005C1785` runs the body above it and then falls through
          to the same condition again: Delphi pre-tested `while` codegen. }
        while dam + topfdam > HpPerFigure(u) do  { condition $005C1850..$005C186D;
                                                   true/back target $005C1785 }
        begin
          Inc(totaldam, HpPerFigure(u) - topfdam); { calls $005C1788; writes $005C17A1 }
          dam := dam - HpPerFigure(u) + topfdam;   { call $005C17A7;
                                                     arithmetic $005C17AC..$005C17BB }
          Dec(dam, DefenseRoll(def, Units[u].defendchance)); { call $005C17F0;
                                                               write $005C17FE }
          if Units[u].EnchantmentFlags[EncInvulnerability] then
            Dec(dam, inferred_InvulnerabilityDamageReduction); { false target $005C1840 }
          if dam < 0 then
            dam := 0;                            { `$005C1846 xor eax,eax` supplies zero;
                                                    false target $005C184B }
          topfdam := 0;                          { $005C184B..$005C184D }
        end;

        Inc(totaldam, dam);
        Inc(topfdam, dam);
        dam := 0;                                { $005C186D..$005C1889 }
      end;

      Inc(totaldam, dam);                        { $005C188C..$005C1892 }
      if sp = SWarpLightning then
        Dec(str);                                { false target $005C18AA; write $005C189F }
    end;                                        { counter writes $005C18AA..$005C18B0;
                                                   loop target $005C1696; exit $005C18B6 }

  if SpellTable[sp].irrecoverable then
    Result.irrec := totaldam                    { false target $005C18E9; write $005C18E5;
                                                  jump target $005C1926: epilogue }
  else if SpellTable[sp].undeaddamage then
    Result.undead := totaldam                   { false target $005C191D; write $005C1918;
                                                  jump target $005C1926: epilogue }
  else
    Result.normal := totaldam;                  { $005C191D..$005C1923 }
end;                                            { $005C1926..$005C192D }

{ `$005C192D..$005C1954` is the routine's embedded data/padding: three leading
  zero bytes at `$005C192D..$005C1930`, the 24-byte spell-membership set at `$005C1930`, the 80-bit
  `1.34` constant at `$005C1948`, and two trailing zero bytes. }

procedure FirewallEffect(u: Integer); register;
begin
  if (not HasTeleMerge(u)) and                   { true/exit target $005C1CA2 }
     (not Units[u].flying) then                  { true/exit target $005C1CA2 }
    ApplyDamageSpell(u, SWallofFire,
      SpellTable[SWallofFire].Attack);           { table read $005C1C89..$005C1C95;
                                                   call $005C1C9D }
end;                                            { $005C1CA2..$005C1CA5 }
```

## Reciprocal review correction — 2026-08-03

Codex's review of Claude's R5.2g closure caught a semantic error that both the cold derivation and
the first review had missed. An inbound scan over `$005C1785..$005C188C` reports
`$005C1750 je $005C1850` as the sole outside entry to the fit test and `$005C1867 jl $005C1785`
as the body's back edge. `$005C1780 jmp $005C188C` carries the `Area` sibling over the non-area
loop. This establishes a pre-tested `while`: zero iterations when the first roll fits, and one
iteration per crossed figure boundary otherwise. The first iteration books the wounded top
figure's remaining HP; `$005C184B..$005C184D` clears `topfdam`, so subsequent iterations book a
full figure. Every iteration calls `DefenseRoll` at `$005C17F0` and applies Invulnerability at
`$005C1836`.

The coverage ledger needs no boundary change: it has always represented the complete
`DamageSpell` extent as one row. The correction is to the source-shaped body and its semantic
description, not to that whole-routine row.

## Raw-byte self-review

The second pass used uncollapsed disassembly and the bytes below, independently
of the annotated first pass. It made two completeness corrections to the cold
artifact: the embedded-set test now preserves its unsigned `sp <= 183` guard,
and `SpellTableT` now shows the tail that makes its entry stride exactly `$B8`.
No source-flow reading changed in that 2026-08-02 pass. The later reciprocal review correction
above does change the non-area spill's source shape from a one-shot branch to a repeated loop.

Every semantic conditional carries both its bytes and the meaning of its
destination:

| Test / branch bytes | Destination and what lies there |
|---|---|
| `$005C1135` `837df400`; `$005C1139` `7406` | `$005C1141`: keep the table Attack and enter the first conjunction gate |
| `$005C1146` `83b8e00af90a00`; `$005C114D` `7e41` | `$005C1190`: skip scaling and enter the Warp Lightning conjunction test |
| `$005C1152` `3db7000000`; `$005C1157` `7714` | `$005C116D`: out-of-range IDs reach the failed-membership branch |
| `$005C116A` `0fa302`; `$005C116D` `7321` | `$005C1190`: IDs absent from the embedded set skip scaling |
| `$005C1195` `83b8e00af90a00`; `$005C119C` `7e11` | `$005C11AF`: skip the Warp Lightning bonus and initialize flags |
| `$005C119E` `837df865`; `$005C11A2` `750b` | `$005C11AF`: non-Warp-Lightning spells initialize flags |
| `$005C11FE` `807cc25000`; `$005C1203` `7404` | `$005C1209`: leave Illusion false and test Area |
| `$005C1228` `807cc25400`; `$005C122D` `7404` | `$005C1233`: leave `aoe` false and test Doom |
| `$005C1252` `807cc25100`; `$005C1257` `7404` | `$005C125D`: leave Doom false and test Piercing |
| `$005C127C` `807cc25200`; `$005C1281` `7404` | `$005C1287`: leave Armor Piercing unchanged and test Lightning |
| `$005C12A6` `807cc25300`; `$005C12AB` `7438` | `$005C12E5`: a non-Lightning spell preserves the preceding Piercing value |
| `$005C12D1` `80bc827769420600`; `$005C12D9` `7406` | `$005C12E1`: no Lightning Resist sets Armor Piercing true; resistance instead falls through to the false write |
| `$005C1309` `80bc825e69420600`; `$005C1311` `742a` | `$005C133D`: no Magic Immunity enters attack-count setup |
| `$005C1332` `807cc25b00`; `$005C1337` `0f84e9050000` | `$005C1926`: a magical spell against Magic Immunity returns the already-zero result; a Nonmagic spell falls through |
| `$005C1344` `807def00`; `$005C1348` `740b` | `$005C1355`: non-area damage keeps one attack and tests Warp Lightning |
| `$005C1355` `837df865`; `$005C1359` `7506` | `$005C1361`: non-Warp-Lightning damage keeps its current attack count |
| `$005C13CB` `807cc25700`; `$005C13D0` `7435` | `$005C1407`: non-Cold spell proceeds to Fire |
| `$005C13F6` `80bc825d69420600`; `$005C13FE` `7407` | `$005C1407`: no Cold Immunity preserves effective Defense and proceeds to Fire |
| `$005C1426` `807cc25600`; `$005C142B` `7435` | `$005C1462`: non-Fire spell proceeds to Missile |
| `$005C1451` `80bc825969420600`; `$005C1459` `7407` | `$005C1462`: no Fire Immunity preserves Defense and proceeds to Missile |
| `$005C1481` `807cc25800`; `$005C1486` `7435` | `$005C14BD`: non-Missile spell proceeds to Poison |
| `$005C14AC` `80bc825b69420600`; `$005C14B4` `7407` | `$005C14BD`: no Missile Immunity preserves Defense and proceeds to Poison |
| `$005C14DC` `807cc25500`; `$005C14E1` `7435` | `$005C1518`: non-Poison spell proceeds to Death |
| `$005C1507` `80bc826069420600`; `$005C150F` `7407` | `$005C1518`: no Poison Immunity preserves Defense and proceeds to Death |
| `$005C1537` `807cc25a00`; `$005C153C` `7435` | `$005C1573`: non-Death spell proceeds to Stoning |
| `$005C1562` `80bc825f69420600`; `$005C156A` `7407` | `$005C1573`: no Death Immunity preserves Defense and proceeds to Stoning |
| `$005C1592` `807cc25900`; `$005C1597` `7435` | `$005C15CE`: non-Stoning spell proceeds to Corporeal |
| `$005C15BD` `80bc825a69420600`; `$005C15C5` `7407` | `$005C15CE`: no Stoning Immunity preserves Defense and proceeds to Corporeal |
| `$005C15ED` `807cc25c00`; `$005C15F2` `7435` | `$005C1629`: non-Corporeal spell proceeds to Black Sleep |
| `$005C1618` `80bc827269420600`; `$005C1620` `7407` | `$005C1629`: a corporeal target preserves Defense and proceeds to Black Sleep |
| `$005C164D` `80bc82ce6d420600`; `$005C1655` `7404` | `$005C165B`: without Black Sleep, proceed to the top-figure read without forcing Doom |
| `$005C1666` `807d8400`; `$005C166A` `7415` | `$005C1681`: non-Doom damage enters the ordinary-loop count gate |
| `$005C1684` `85c0`; `$005C1686` `0f8e2a020000` | `$005C18B6`: zero or negative attack count skips the loop and routes the zero total |
| `$005C1726` `80bc82cc6d420600`; `$005C172E` `7411` | `$005C1741`: without Invulnerability, clamp the first post-defense damage |
| `$005C1741` `837de400`; `$005C1745` `7d05` | `$005C174C`: nonnegative first damage enters the area gate |
| `$005C174C` `807def00`; `$005C1750` `0f84fa000000` | `$005C1850`: non-area damage enters the pre-tested spill-loop condition; the body at `$005C1785` may run zero times |
| `$005C175E` `3b45e4`; `$005C1761` `7d0b` | `$005C176E`: area damage no greater than HP skips the HP cap and is accumulated |
| `$005C1825` `80bc82cc6d420600`; `$005C182D` `7411` | `$005C1840`: without Invulnerability, clamp the spill damage |
| `$005C1840` `837de400`; `$005C1844` `7d05` | `$005C184B`: nonnegative spill damage proceeds to reset `topfdam` |
| `$005C1865` `3bc2`; `$005C1867` `0f8c18ffffff` | `$005C1785`: `HpPerFigure < dam + topfdam` is the backward true edge of the spill `while`; otherwise execution exits at `$005C186D` to add the fitting remainder |
| `$005C1899` `837df865`; `$005C189D` `750b` | `$005C18AA`: non-Warp-Lightning iterations keep `str` unchanged |
| `$005C18AD` `ff4dd0`; `$005C18B0` `0f85e0fdffff` | `$005C1696`: another counted iteration begins; zero proceeds to result routing at `$005C18B6` |
| `$005C18D5` `80bcc29400000000`; `$005C18DD` `740a` | `$005C18E9`: a recoverable spell tests undead damage; irrecoverable instead writes `Result.irrec` then jumps to the epilogue |
| `$005C1908` `80bcc29500000000`; `$005C1910` `740b` | `$005C191D`: a non-undead-damage spell writes normal damage; undead damage writes `Result.undead` then jumps to the epilogue |
| `$005C1C57` `84c0`; `$005C1C59` `7547` | `$005C1CA2`: Teleporting/Merging units exit `FirewallEffect` |
| `$005C1C7F` `80bc825469420600`; `$005C1C87` `7519` | `$005C1CA2`: Flying units exit; non-fliers fall through to Wall of Fire damage |

The complete semantic call inventory is likewise byte-checked:

| Address | Bytes | Callee / role |
|---:|---|---|
| `$005C117A` | `e8253ae4ff` | `@System@@TRUNC`, conjunction's extended-real multiply |
| `$005C134D` | `e83a51fdff` | `@Units@LivingFigures`, area attack count |
| `$005C13A4` | `e81f52fdff` | `@Units@EffectiveDefense` |
| `$005C165E` | `e8f14efdff` | `@Units@TopFigureDamage` |
| `$005C16BC` | `e86347fdff` | `@Units@AttackRoll` |
| `$005C16F1` | `e88647fdff` | first `@Units@DefenseRoll` |
| `$005C1759` | `e85246fdff` | area-cap `@Units@HpPerFigure` comparison |
| `$005C1766` | `e84546fdff` | area-cap `@Units@HpPerFigure` assignment |
| `$005C1788` | `e82346fdff` | spill total's `@Units@HpPerFigure` |
| `$005C17A7` | `e80446fdff` | spill remainder's `@Units@HpPerFigure` |
| `$005C17F0` | `e88746fdff` | spill `@Units@DefenseRoll` |
| `$005C1853` | `e85845fdff` | non-area fit-test `@Units@HpPerFigure` |
| `$005C1C52` | `e88536fdff` | `@Units@HasTeleMerge` |
| `$005C1C9D` | `e8d2fcffff` | `@Spells@ApplyDamageSpell` |

Arithmetic review quoted the whole conjunction formula
(`$005C116F` `db45f0`, `$005C1172` `db2d48195c00`, `$005C1178` `dec9`,
`$005C117A` `e8253ae4ff`) and the exact 80-bit constant bytes
`1f85eb51b81e85abff3f` at `$005C1948`; they decode to `1.34`, followed by
Delphi `Trunc`. The spill arithmetic was re-read through both overflow-checked
chains at `$005C1785..$005C17C2`; it is addition/subtraction only, with no
shift/division correction idiom. The later reciprocal review additionally restored the
`$005C1867 -> $005C1785` repetition that this arithmetic participates in.

## Coverage ledgers

### `DamageSpell`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005C10E8` | `$005C1954` | — | reconstructed | result initialization, strength/event transforms, flags and immunity gates, doom/ordinary/area damage loops, damage-category routing, embedded set and extended-real constant |

### `FirewallEffect`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005C1C48` | `$005C1CA5` | — | reconstructed | Teleport/Merging and Flying exclusions, Wall of Fire table strength, ApplyDamageSpell dispatch |

## Completion declaration

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

R5.2k subsequently reconstructed the complete `HasTeleMerge` callee in
[`Combat.CallClosureHelpers.pas`](./Combat.CallClosureHelpers.pas), proving that the Wall-of-Fire
gate is calculated Teleporting OR calculated Merging. Its bytes and coverage ledger are in
[`Combat.CallClosureHelpers.R5.2k.evidence.md`](./Combat.CallClosureHelpers.R5.2k.evidence.md).
