{==============================================================================
  Reconstructed routine:
    @Spells@CombatSummonUnit  $005CBEE0..$005CC3E3

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 module: Spells

  R9-G1a-R2 merged two independent derivations and reciprocal byte review.
  The companion R9-G1a-R2.evidence.md owns the complete branch/call/write
  inventories, coverage ledger, counts, findings and provenance.

  TD32 declares length $514 through $005CC3F4, but code ends with the ret at
  $005CC3E2. $005CC3E3 is a zero pad and $005CC3E4 begins the ShortString
  constant #12'Lesser Demon'; disassembling those bytes as code manufactures
  two false branches.
==============================================================================}

unit Spells_CombatSummonUnit_Reconstructed;

interface

procedure CombatSummonUnit(sp, w: Integer); register;

implementation

const
  inferred_DemonLordUnitType = $00AD;

type
  inferred_SpellEntryT = record
    inferred_beforeRealm: array[0..$33] of Byte;
    Realm: Integer;                              { +$034 }
    inferred_beforeSummonedUnit: array[$38..$8B] of Byte;
    summonedunit: Integer;                       { +$08C }
    inferred_tail: array[$90..$B7] of Byte;      { full record stride $0B8 }
  end;

  inferred_unitT = record
    name: string[30];                            { +$000, 31 bytes }
    inferred_padding01F_043: array[$01F..$043] of Byte;
    maxammo: Integer;                            { +$044 }
    ammo: Integer;                               { +$048 }
    inferred_padding04C_07B: array[$04C..$07B] of Byte;
    race: Integer;                               { +$07C }
    inferred_padding080_0CE: array[$080..$0CE] of Byte;
    Fantastic: Boolean;                          { +$0CF }
    inferred_padding0D0_3CC: array[$0D0..$3CC] of Byte;
    inferred_attackflags_lifesteal: Boolean;     { +$3CD }
    inferred_padding3CE_3D3: array[$3CE..$3D3] of Byte;
    inferred_attackflags_lifestealvalue: Integer; { +$3D4 }
    inferred_padding3D8_4E7: array[$3D8..$4E7] of Byte;
    cox: Integer;                                { +$4E8 }
    coy: Integer;                                { +$4EC }
    inferred_padding4F0_4F7: array[$4F0..$4F7] of Byte;
    combatmaxmoves: SmallInt;                    { +$4F8 }
    combatmovesleft: SmallInt;                   { +$4FA }
    inferred_padding4FC_6A7: array[$4FC..$6A7] of Byte;
    maxmp: SmallInt;                             { +$6A8 }
    mp: SmallInt;                                { +$6AA }
    inferred_padding6AC_6AD: array[$6AC..$6AD] of Byte;
    unittype: SmallInt;                          { +$6AE }
    inferred_padding6B0_6B3: array[$6B0..$6B3] of Byte;
    combatsummoned: Boolean;                     { +$6B4 }
    inferred_padding6B5_6B7: array[$6B5..$6B7] of Byte;
    AIstayBehindWalls: Boolean;                  { +$6B8 }
    inferred_tail: array[$6B9..$783] of Byte;    { full unitT stride $784 }
  end;

var
  { Exact bounds and record layers; storage is reached through the runtime-data
    pointer at $00709188. inferred_Maxunits is its dword at +$01AC1F18. }
  BaseUnits, Units: array[1..40000] of inferred_unitT;
  inferred_Maxunits: Integer;
  inferred_SpellTable: array[0..400] of inferred_SpellEntryT;

  { Semantic names are bound by the named Castercore accessors. }
  inferred_CombatPlane: ^Integer;               { pointer global $00708324 }
  inferred_CombatX: ^Integer;                   { $007089E4; @Castercore@CombatX }
  inferred_CombatY: ^Integer;                   { $007086D8; @Castercore@CombatY }
  inferred_SpellTargetX: ^Integer;              { $007085B8; @Castercore@SpellTargetX }
  inferred_SpellTargetY: ^Integer;              { $007082F8; @Castercore@SpellTargetY }
  SpellTargetUnit: Integer;                     { pointer global $0070802C }
  CombatSummoningHappened: Boolean;             { pointer global $00708C34 }
  CombatSummonedUnitID: Integer;                { pointer global $00709BDC }

procedure CombatSummonUnit(sp, w: Integer); register;
var
  i: Integer;
begin
  { $005CBEE0..$005CBEF9 [exact ABI and call]
    EAX and EDX are homed as `sp` and `w`; TD32 names EBP-$0C `i`. }
  i := SpellIDToSummon(sp);                     { call $005CBEF1 -> $005C2FA4 }

  { $005CBEF9..$005CBF1C [inferred global aliases; exact arguments]
    NewUnit TD32 homes t/owner/plane in EAX/EDX/ECX and y/x at EBP+$08/+$0C. }
  NewUnit(i, w, inferred_CombatPlane^,
          inferred_CombatX^, inferred_CombatY^); { call $005CBF17 -> $00596848 }

  { $005CBF1C..$005CBFFA [exact]
    Every indexed statement independently reloads inferred_Maxunits and uses
    the complete checked 1-based `$1E1`-dword record-address idiom. }
  BaseUnits[inferred_Maxunits].combatsummoned := True;  { write $005CBF48 }
  BaseUnits[inferred_Maxunits].cox := inferred_SpellTargetX^; { $005CBF84 }
  BaseUnits[inferred_Maxunits].coy := inferred_SpellTargetY^; { $005CBFBF }
  BaseUnits[inferred_Maxunits].Fantastic := True;       { $005CBFF2 }

  { $005CBFFA..$005CC057 [inferred table alias; exact field/flow]
    The checked spell index is 0..400; `$17 * 8` is the $0B8 record stride. }
  BaseUnits[inferred_Maxunits].race :=
    RealmtoRace(inferred_SpellTable[sp].Realm);  { call $005CC01D; write $005CC050 }

  { $005CC057..$005CC066 [exact]
    AL=True, EDX=-1, ECX=-1, pushed tay=-1. }
  RecalculateUnits(True, -1, -1, -1);           { call $005CC061 }

  { $005CC066..$005CC1A2 [exact record layers and widths]
    Each read and write has a separate checked inferred_Maxunits address. }
  BaseUnits[inferred_Maxunits].mp :=
    Units[inferred_Maxunits].mp;                 { read $005CC092; write $005CC0C8 }
  BaseUnits[inferred_Maxunits].ammo :=
    Units[inferred_Maxunits].maxammo;            { read $005CC0FC; write $005CC131 }
  BaseUnits[inferred_Maxunits].combatmovesleft :=
    Units[inferred_Maxunits].combatmaxmoves;     { read $005CC164; write $005CC19A }

  { $005CC1A2..$005CC204 [exact writes; inferred global bindings] }
  BaseUnits[inferred_Maxunits].AIstayBehindWalls := False; { $005CC1CE }
  SpellTargetUnit := inferred_Maxunits;          { $005CC1E7 }
  CombatSummoningHappened := True;               { $005CC1EE }
  CombatSummonedUnitID := inferred_Maxunits;     { $005CC202 }

  { $005CC204..$005CC3C6 [exact]
    UnitCaster is nullary: TD32 lists only local Result and its body homes no
    incoming register. The two calls are independent evaluations. Both false
    exits target $005CC3C6. }
  if (UnitCaster > 0) and                        { call $005CC204; jle $005CC20B }
     (BaseUnits[UnitCaster].unittype = inferred_DemonLordUnitType) then
                                                 { call $005CC211; jne $005CC241 }
  begin
    Units[inferred_Maxunits].maxmp := 0;         { $005CC273 }
    BaseUnits[inferred_Maxunits].mp := 0;        { $005CC2A9 }
    Units[inferred_Maxunits].mp := 0;            { $005CC2DF }
    BaseUnits[inferred_Maxunits].maxmp := 0;     { $005CC315 }
    BaseUnits[inferred_Maxunits].name := 'Lesser Demon'; { $005CC357..$005CC35A }
    BaseUnits[inferred_Maxunits].inferred_attackflags_lifesteal := True;
                                                 { $005CC387 }
    BaseUnits[inferred_Maxunits].inferred_attackflags_lifestealvalue := -2;
                                                 { $005CC3BB }
  end;

  { $005CC3C6..$005CC3DD [exact order]
    Warlord's script layer runs after every compiled write above and before the
    final full-unit recalculation. }
  CallCombatSpellEffectScript(sp);               { call $005CC3C9 -> $005C9948 }
  RecalculateUnits(True, -1, -1, -1);           { call $005CC3D8 -> $00599920 }
end;                                             { epilogue $005CC3DD..$005CC3E3 }

end.
