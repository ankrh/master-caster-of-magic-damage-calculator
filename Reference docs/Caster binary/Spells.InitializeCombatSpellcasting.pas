{==============================================================================
  Reconstructed source splice and wrapper:
    @Spells@InitializeCombatSpellcasting Raise Dead case
      $005CD1FF..$005CD372
    @Castercore@InitializeCombatSpellcasting
      $0064435C..$00644377

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 modules: Spells, Castercore

  D36 merged two independent Codex GPT-5.6 Sol High derivations and one
  Claude Opus 5 Medium review. D36.evidence.md owns the complete branch,
  call, write and guard inventories, both coverage ledgers and provenance.

  The Spells body below is a source splice for the assigned Raise Dead case,
  not a claim to reconstruct the enclosing multi-spell routine. The next
  case, SAnimateDead=$C3, is deliberately outside D36. The Castercore wrapper
  is complete.
==============================================================================}

unit Spells_InitializeCombatSpellcasting_Reconstructed;

interface

function Castercore_InitializeCombatSpellcasting(sp: Integer): Boolean; register;

implementation

const
  SRaiseDead = 137;
  SAnimateDead = 195;
  EncNoHeal = 62;

type
  inferred_unitT = record
    inferred_padding000_087: array[$000..$087] of Byte;
    figures: Integer;                            { +$088 }
    inferred_padding08C_0CB: array[$08C..$0CB] of Byte;
    Displayrace: Boolean;                        { +$0CC }
    inferred_padding0CD_4E7: array[$0CD..$4E7] of Byte;
    cox: Integer;                                { +$4E8 }
    coy: Integer;                                { +$4EC }
    inferred_padding4F0_4F7: array[$4F0..$4F7] of Byte;
    combatmaxmoves: SmallInt;                    { +$4F8 }
    combatmovesleft: SmallInt;                   { +$4FA }
    inferred_padding4FC_4FF: array[$4FC..$4FF] of Byte;
    Totaldamage: SmallInt;                       { +$500 }
    Irrecoverabledamage: SmallInt;               { +$502 }
    Undeaddamage: SmallInt;                      { +$504 }
    inferred_padding506_5D0: array[$506..$5D0] of Byte;
    CombatEnchantmentFlags: array[1..100] of Boolean; { +$5D1 }
    inferred_padding635_69D: array[$635..$69D] of Byte;
    dead: Boolean;                               { +$69E }
    inferred_fleeing: Boolean;                   { +$69F }
    undeaded: Boolean;                           { +$6A0 }
    irrecoverable: Boolean;                      { +$6A1 }
    inferred_padding6A2_6B1: array[$6A2..$6B1] of Byte;
    webleft: ShortInt;                           { +$6B2 }
    confusioneffect: ShortInt;                   { +$6B3 }
    inferred_tail: array[$6B4..$783] of Byte;    { full stride $784 }
  end;

var
  BaseUnits, Units: array[1..40000] of inferred_unitT;
  inferred_SpellTargetUnitPtr: ^Integer;         { pointer global $0070802C }
  inferred_SpellTargetXPtr: ^Integer;            { pointer global $007085B8 }
  inferred_SpellTargetYPtr: ^Integer;            { pointer global $007082F8 }
  inferred_CombatSummonedUnitIDPtr: ^Integer;    { pointer global $00709BDC }

{------------------------------------------------------------------------------
  Source splice inside @Spells@InitializeCombatSpellcasting(sp).
  `B` is TD32's unnamed pointer local at EBP-$28. Every field write below is
  to BaseUnits through B; the movement source is the calculated Units layer.
------------------------------------------------------------------------------}

if sp = SRaiseDead then                          { $005CD1FF; false -> $005CD372 }
begin
  { The first checked 1..40000 / $784-byte record calculation is
    $005CD20C..$005CD23B. The target global is reloaded for each later use. }
  B := @BaseUnits[inferred_SpellTargetUnitPtr^];

  RemoveAllEnchantments(inferred_SpellTargetUnitPtr^); { call $005CD245 }
  B^.Irrecoverabledamage := 0;                  { word write $005CD24D }
  B^.Undeaddamage := 0;                         { word write $005CD259 }
  B^.CombatEnchantmentFlags[EncNoHeal] := True; { byte write $005CD265 }
  B^.dead := False;                             { byte write $005CD26F }
  B^.undeaded := False;                         { byte write $005CD279 }
  B^.irrecoverable := False;                    { byte write $005CD283 }
  B^.confusioneffect := 0;                      { byte write $005CD28D }
  B^.webleft := 0;                              { byte write $005CD297 }
  B^.Displayrace := False;                      { byte write $005CD2A1 }
  B^.cox := inferred_SpellTargetXPtr^;           { dword write $005CD2B2 }
  B^.coy := inferred_SpellTargetYPtr^;           { dword write $005CD2C2 }

  { Fresh checked calculated-record address at $005CD2C8..$005CD2EA. }
  B^.combatmovesleft :=
    Units[inferred_SpellTargetUnitPtr^].combatmaxmoves; { word write $005CD2FB }

  RecalculateUnits(True, -1, -1, -1);           { call $005CD30C }

  { $005CD320 checked signed multiply; $005CD32D SAR / $005CD32F JNS /
    $005CD331 ADC is Delphi's signed div-by-two truncation-toward-zero idiom;
    $005CD334..$005CD345 is the checked SmallInt conversion. }
  B^.Totaldamage :=
    (HpPerFigure(inferred_SpellTargetUnitPtr^) * B^.figures) div 2;
                                                  { call $005CD318; write $005CD34D }

  inferred_CombatSummonedUnitIDPtr^ :=
    inferred_SpellTargetUnitPtr^;                { dword write $005CD361 }
  RecalculateUnits(True, -1, -1, -1);           { call $005CD36D }
end;

{ `$005CD372` begins `if sp = SAnimateDead`; that sibling is excluded. }

{------------------------------------------------------------------------------
  Complete TD32 @Castercore@InitializeCombatSpellcasting wrapper.
------------------------------------------------------------------------------}

function Castercore_InitializeCombatSpellcasting(sp: Integer): Boolean; register;
begin
  Result := Spells_InitializeCombatSpellcasting(sp); { call $00644368 }
end;                                               { return $00644376 }

end.
