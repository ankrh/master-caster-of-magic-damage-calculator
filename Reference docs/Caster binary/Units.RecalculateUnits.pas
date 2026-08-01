{==============================================================================
  Reconstructed procedure: @Units@RecalculateUnits

  Binary: Caster.exe — see README.md in this directory for path, md5 and size.
  VA:     $00599920
  Extent: $0000E150 bytes ($00599920..$005A7A70)
  TD32 module: Units

  This is reconstructed source, not recovered original source.

  TD32 frame inventory (names and offsets are exact):
    [EBP-$2714C] prevmaxmoves
    [EBP-$0050]  $161756148
    [EBP-$004C]  $161756112
    [EBP-$0048]  $161756076
    [EBP-$0044]  $161674140
    [EBP-$003C]  $161560768
    [EBP-$0038]  $161560280
    [EBP-$0034]  $161560016
    [EBP-$0030]  $161530336
    [EBP-$002C]  $161477980
    [EBP-$0028]  $161468288
    [EBP-$0020]  ownCG
    [EBP-$001C]  n
    [EBP-$0018]  k
    [EBP-$0014]  j
    [EBP-$0010]  i
    [EBP-$000C]  tax
    [EBP-$0008]  tap
    [EBP-$0001]  com
    [EBP+$0008]  tay

  The numbered `$...` compiler temporaries remain listed rather than renamed.
  One of them is live in this slice: [EBP-$0028] holds the current unit
  record's base address, computed once at $00599B8E and used for all four
  enchantment-flag arrays in the merger. The rest are first used past the
  region-c seam.

  Two frame slots carry no TD32 entry:
    [EBP-$0024]  Maxunits, copied from the loop bound at $00599973
    [EBP-$0004]  the incoming EAX, spilled by the prologue at $00599923

  Field names below are taken from the shipped `unitT` and `CityT` in
  `Script source/CAS reference/Typedec.pas`, so they are original names rather
  than reconstruction aliases. What is inferred is the *binding* of a name to a
  byte offset; each field therefore carries the offset it was read at.
==============================================================================}

unit Units_RecalculateUnits_Reconstructed;

interface

{ [exact names; inferred types]
  Delphi register convention at $0059993F..$00599945:
    AL  = com
    EDX = tap
    ECX = tax
    [EBP+$08] = tay
}
procedure RecalculateUnits(com: Boolean; tap, tax, tay: Integer); register;
procedure RecalculateunitsonCityTile(c: Integer); register;
{ [inferred name]
  TD32 calls this @Castercore@RecalculateUnits — unit Castercore, procedure
  RecalculateUnits. One file is one Pascal unit, so its original name would
  collide with @Units@RecalculateUnits above; the flattened name below is the
  reconstruction's, not the binary's. }
procedure inferred_Castercore_RecalculateUnits(com: Boolean; tap, tax, tay: Integer); register;

implementation

const
  { [exact names and values; Typedec.pas / SharedConstants.pas] }
  Maxunitslots = 39999;

  { [exact name; value read from the executable]
    `Typedec.pas` declares EnchFlagT = array[1..maxmaxenchantmentflag] but the
    constant itself ships in no reference file. The merger's range check at
    $00599B95 (`cmp eax, $63`) and its loop bound at $00599C23 (`cmp j, $65`)
    both give 100. }
  maxmaxenchantmentflag = 100;

  { [exact name; value read from the executable]
    Same situation: `Typedec.pas` declares `Cities : array[1..maxCityslots]`
    but ships no value. The three range checks in RecalculateunitsonCityTile
    (`dec; cmp $3E7` at $005A8C77, $005A8CA4 and $005A8CD0) give 1000. }
  maxCityslots = 1000;

  { [inferred names; exact values] }
  inferred_UnitRecordDwords = $01E1;
  inferred_UnitGolem = 81;
  inferred_RCChaos = 18;

  { [exact typed-constant names and values] }
  EncMagic = 1;
  EncConfusion = 12;
  EncResistElements = 16;
  EncCCBreath = 33;
  EncPossession = 52;
  EncCreatureBinding = 53;

type
  { [exact name; bound read from the executable] }
  EnchFlagT = array[1..maxmaxenchantmentflag] of Boolean;

  { [exact names/operands; inferred bindings]
    Only fields touched by the reconstructed blocks are declared. The real
    record is $01E1 dwords / 1,924 bytes and its base within the runtime data
    block is $6426898 for Units, $1AC1798 for BaseUnits; every offset below was
    read as `displacement - base` at the cited instruction.

    Names come from `Typedec.pas` and offsets from the executable, so both are
    exact — but *pairing* them is an inference, resting on the layout match
    argued in `CoM2 binary analysis.md`. It is well supported here: the offsets
    below reproduce Typedec's declaration order and its adjacencies exactly
    (dead..incombat four bytes apart; owner, combatattacksdone, pad,
    PandoraBoxBudget consecutive). That is evidence, not a direct read.

    The four flag arrays are contiguous and each is exactly 100 bytes, which is
    what makes the merger's shape legible: element j of the first lands at
    +$508 + j, so the arrays span +$509..+$56C, +$56D..+$5D0, +$5D1..+$634 and
    +$635..+$698, and `owner` follows immediately at +$699. }
  unitT = record
    firebreath: Integer;                        { +$030, $00599F3E }
    race: Integer;                              { +$07C, $00599F71 }
    Fantastic: Boolean;                         { +$0CF, $00599FA0 }
    overlandx: Integer;                         { +$4AC, $00599A49 }
    overlandy: Integer;                         { +$4B0, $00599A7D }
    plane: Integer;                             { +$4DC, $00599A15 }
    combatmaxmoves: SmallInt;                   { +$4F8, $00599AB1 }
    EnchantmentFlags: EnchFlagT;                { +$509, $00599BA3 }
    OverlandEnchantmentFlags: EnchFlagT;        { +$56D, $00599BF7 }
    CombatEnchantmentFlags: EnchFlagT;          { +$5D1, $00599BDB }
    ItemEnchantmentFlags: EnchFlagT;            { +$635, $00599BBF }
    owner: ShortInt;                            { +$699, $00599E2A }
    PandoraBoxBudget: SmallInt;                 { +$69C, $00599EDE }
    dead: Boolean;                              { +$69E, $005999A1 }
    incombat: Boolean;                          { +$6A2, $005999D9 }
    unittype: SmallInt;                         { +$6AE, $00599E55 }
    confusioneffect: ShortInt;                  { +$6B3, $00599D6B }
    combatsummoned: Boolean;                    { +$6B4, $00599FCC }
  end;

  { [exact names/operands; inferred bindings; *relative* offsets only]
    Record stride is $F7 * 8 = 1,976 bytes (`imul reg, reg, $F7` at $005A8C84,
    with an *8 index scale). Unlike unitT, this record has no established base:
    the Cities array's own base address in the runtime data block has not been
    read, so only the spacing of the three accessed fields is known, not their
    absolute offsets. What the executable shows is a byte at some offset B, then
    words at B+2 and B+4, with displacements $0ADADC70, $0ADADC72 and $0ADADC74.
    `Typedec.pas`'s `Race, plane, Owner : shortint; x, y : smallint;` is the only
    reading of those five fields that fits that shape, which is what binds the
    three names below. Do not treat $70/$72/$74 as record offsets. }
  CityT = record
    plane: ShortInt;                            { B+$0, $005A8CF0 }
    x: SmallInt;                                { B+$2, $005A8CC4 }
    y: SmallInt;                                { B+$4, $005A8C97 }
  end;

  { [inferred partial type; exact offsets in the pointed-to combat record] }
  inferred_CombatStateT = record
    inferred_padding0000_0321: array[0..$321] of Byte;
    inferred_DefenderSight: Boolean;            { +$322 }
    inferred_AttackerSight: Boolean;            { +$323 }
  end;
  Pinferred_CombatStateT = ^inferred_CombatStateT;

var
  { [exact names; exact declared bounds]
    Storage is reached through the runtime data block whose pointer lives at
    $00709188. The bounds are the ones the compiler range-checks against:
    `dec; cmp $9C3F` at $00599980 gives array[1..40000], matching
    `Typedec.pas`'s `array[1..maxunitslots+1] of UnitT`. Units and BaseUnits
    are $4965100 apart, which is exactly 40000 * 1924. }
  BaseUnits, Units: array[1..Maxunitslots + 1] of unitT;
  Maxunits: Integer;
  Cities: array[1..maxCityslots] of CityT;

  { [inferred pointer types; exact global addresses and dereference shape] }
  global_CombatStatePtr: Pointer absolute $0070969C;
  global_AttackerPtr: ^Integer absolute $007092AC;
  global_DefenderPtr: ^Integer absolute $0070A22C;
  global_UnitRecalculateEnabledPtr: ^Boolean absolute $00709AF8;
  global_UnitCalcPreHandlePtr: ^Integer absolute $00707FB4;
  global_UnitCalcHandlePtr: ^Integer absolute $00708F68;

{ [exact call target and call order; inferred declaration]
  TD32: @Scripts@SetScriptNumVar, VA $00590CF0.
  At both hooks the literal address $005A7A6C identifies script variable "U",
  value is i, and the third register argument is 1. }
procedure inferred_SetScriptUnitVariable(i: Integer);
begin
  { Scripts.SetScriptNumVar($005A7A6C, i, 1); }
end;

{ [exact call target; inferred declaration]
  TD32: @Scripts@RunScript, VA $00582C14. DL is 1 at both call sites. }
procedure inferred_RunUnitScript(handle: Integer);
begin
  { Scripts.RunScript(handle, True); }
end;

procedure RecalculateUnits(com: Boolean; tap, tax, tay: Integer); register;
var
  { [exact TD32 local names] }
  i, j, k, n: Integer;
  ownCG: Integer;

  { [exact TD32 name; exact declared bound]
    Declared one element *shorter* than Units and BaseUnits: its range check at
    $00599ABD is `dec; cmp $9C3E` (1..39999) against their `cmp $9C3F`
    (1..40000). The stack arithmetic agrees — the prologue reserves $27148
    bytes, element i sits at [EBP + 4*i - $27150], so the array runs from
    EBP-$2714C down to EBP-$54 and stops just short of the first named local at
    EBP-$50. A Maxunits of 40000 would therefore range-check here before it
    range-checked on the unit record itself; whether the engine can reach that
    value has not been established. }
  prevmaxmoves: array[1..Maxunitslots] of Integer;
begin
  { $00599920..$00599960 [exact control/writes; inferred field names]
    The real prologue allocates $27148 bytes of stack (an $27-iteration loop of
    $1000 each, then a further $148) and preserves EBX/ESI/EDI.
    k, n and ownCG are used by later, not-yet-reconstructed regions. }
  Pinferred_CombatStateT(global_CombatStatePtr)^.inferred_DefenderSight := False;
  Pinferred_CombatStateT(global_CombatStatePtr)^.inferred_AttackerSight := False;

  { $00599960..$005A681C: first pass over units. [exact structure] }
  for i := 1 to Maxunits do
  begin
    { $0059997D..$00599A8D [exact] }
    if BaseUnits[i].dead then
      Continue;                                      { target $005A6816 }

    if com and not BaseUnits[i].incombat then
      Continue;                                      { target $005A6816 }

    { tax = -1 disables all three location filters. The unusual parameter
      order is preserved: tap is plane, tax is X, tay is Y. }
    if tax <> -1 then
    begin
      if BaseUnits[i].plane <> tap then
        Continue;
      if BaseUnits[i].overlandx <> tax then
        Continue;
      if BaseUnits[i].overlandy <> tay then
        Continue;
    end;

    { $00599A8D..$00599B30 [exact]
      Save the old current movement before overwriting the complete current
      record with its base record. REP MOVSD count is exactly $01E1. The saved
      value is sign-extended from combatmaxmoves' 16 bits into a 32-bit slot. }
    prevmaxmoves[i] := Units[i].combatmaxmoves;
    Units[i] := BaseUnits[i];

    { $00599B30..$00599C2D [exact]

      The merge is *self-inclusive*: destination and first source are the same
      array. Both sit at record +$509, which is `BaseUnitEnchantment`'s layer in
      BaseUnits and `HasUnitEnchantment`'s aggregate in Units — one array whose
      meaning changes with the copy above. So the copied base layer is the
      aggregate's seed, and there is no separate "base" array in the record.

      That is what makes the EncMagic write load-bearing rather than redundant:
      it drops any base-layer EncMagic before the merge, so a unit keeps it only
      if an overland, combat or item source supplies it — or if region c
      re-derives it, which it does for base heroes at $0059ACAF.

      Source order follows the executable's own tests at $00599BA3, $00599BBF,
      $00599BDB and $00599BF7. The chain short-circuits on the first set flag. }
    Units[i].EnchantmentFlags[EncMagic] := False;
    for j := 1 to maxmaxenchantmentflag do
      Units[i].EnchantmentFlags[j] :=
        Units[i].EnchantmentFlags[j] or
        Units[i].ItemEnchantmentFlags[j] or
        Units[i].CombatEnchantmentFlags[j] or
        Units[i].OverlandEnchantmentFlags[j];

    { $00599C2D..$00599D19 [exact]
      EncPossession and EncCreatureBinding share the same branch. Do not
      simplify the owner swap to a boolean toggle: the executable computes
      Attacker + Defender - current owner. It range-checks the result as a
      signed byte, which is what identifies owner as a ShortInt. }
    if Units[i].EnchantmentFlags[EncPossession] or
       Units[i].EnchantmentFlags[EncCreatureBinding] then
      Units[i].owner :=
        global_AttackerPtr^ + global_DefenderPtr^ - Units[i].owner;

    { $00599D19..$00599E31 [exact] }
    if not Units[i].EnchantmentFlags[EncConfusion] then
      Units[i].confusioneffect := 0;
    if Units[i].confusioneffect = 2 then
      Units[i].owner :=
        global_AttackerPtr^ + global_DefenderPtr^ - Units[i].owner;

    { $00599E31..$00599E8C [exact]
      This writes the item/derived source layer after the aggregate array was
      rebuilt; there is no second aggregate rebuild before UnitCalcPre. }
    if BaseUnits[i].unittype = inferred_UnitGolem then
      Units[i].ItemEnchantmentFlags[EncResistElements] := True;

    { $00599E8C..$00599EE8 [exact]
      The destination is BaseUnits, not Units. }
    if not BaseUnits[i].incombat then
      BaseUnits[i].PandoraBoxBudget := 0;

    { $00599EE8..$00599FA8 [exact values/order] }
    if Units[i].EnchantmentFlags[EncCCBreath] then
    begin
      Inc(Units[i].firebreath, 4);
      Units[i].race := inferred_RCChaos;
      Units[i].Fantastic := True;
    end;

    { $00599FA8..$0059A002 [exact] }
    if Units[i].combatsummoned then
      Units[i].Fantastic := True;

    { $0059A002..$0059A02C [exact hook boundary]
      Call sites:
        $0059A019 -> @Scripts@SetScriptNumVar ($00590CF0)
        $0059A027 -> @Scripts@RunScript      ($00582C14)
      Handle global $00707FB4 is loaded by @Init@GameInitialize from
      MODDING.INI [Scripts] UnitRecalculateEarly, default "UnitCalcPre". }
    if global_UnitRecalculateEnabledPtr^ then
    begin
      inferred_SetScriptUnitVariable(i);
      inferred_RunUnitScript(global_UnitCalcPreHandlePtr^);
    end;

    { $0059A02C..$005A65B2 [unresolved in this file]
      Compiled region c. Its source-shaped reconstruction is the next R5.1
      slice. Verified spine:
        $0059A050 Heroism / effective-experience normalization
        $0059A21F Crusade contribution
        $0059A2A5 Warlord contribution
        $0059A382 Destiny transformation
        $0059A636 @Units@ApplyLevelBonus ($005981F8)
        $0059A65F Focus Magic
        $0059ACAF derived EncMagic marker for base heroes
        $0059ACBA @Units@ApplyHeroBonus ($005992CC)
        $0059E4B0 @Units@ApplyMagicWeapons ($00598D88)
        $005A2671 native node-aura dispatch
        $005A4D4F Haste and subsequent direct curses begin
        $005A61B0 Tactician
      The semantic names above are address-backed, but this placeholder does
      not assert unrendered control flow. }
    { inferred_CompiledRegionC(i); }

    { $005A65B2..$005A65DC [exact hook boundary]
      Call sites:
        $005A65C9 -> @Scripts@SetScriptNumVar ($00590CF0)
        $005A65D7 -> @Scripts@RunScript      ($00582C14)
      Handle global $00708F68 is loaded by @Init@GameInitialize from
      MODDING.INI [Scripts] UnitRecalculate, default "UnitCalc". }
    if global_UnitRecalculateEnabledPtr^ then
    begin
      inferred_SetScriptUnitVariable(i);
      inferred_RunUnitScript(global_UnitCalcHandlePtr^);
    end;

    { $005A65DC..$005A681C [unresolved]
      Region-e final clamps close the first unit loop. }
  end;

  { $005A6822..$005A7A70 [unresolved]
    Region e continues with:
      $005A6822 call @Units@BuildAuraTable ($005976CC);
      a second filtered unit loop;
      aura dispatch;
      Supreme Light;
      MP/movement/damage reconciliation;
      procedure epilogue at $005A7A70.
    These blocks remain to be rendered as source. }
end;

{==============================================================================
  TD32: @Castercore@RecalculateUnits
  VA: $00648718, extent $27 bytes
  Declared as inferred_ because the name is flattened; see the interface.
==============================================================================}
procedure inferred_Castercore_RecalculateUnits(com: Boolean; tap, tax, tay: Integer);
  register;
begin
  { $00648718..$0064873F [exact]
    Pure forwarding wrapper. It preserves the same register/stack argument
    order and calls @Units@RecalculateUnits at $00648734. }
  RecalculateUnits(com, tap, tax, tay);
end;

{==============================================================================
  TD32: @Units@RecalculateunitsonCityTile
  VA: $005A8C6C, extent $96 bytes
==============================================================================}
procedure RecalculateunitsonCityTile(c: Integer); register;
begin
  { $005A8C6C..$005A8D02 [exact control/call]
    The three city-coordinate loads are Y, X, plane in push/register order.
    EAX = 0 at $005A8CF8, so the call selects the non-combat path. }
  RecalculateUnits(
    False,
    Cities[c].plane,
    Cities[c].x,
    Cities[c].y
  ); { call at $005A8CFA }
end;

end.
