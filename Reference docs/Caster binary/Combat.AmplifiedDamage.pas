{==============================================================================
  Reconstructed routine:
    @Combat@AmplifiedDamage  $005BEB28..$005BEC6F

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 module: Combat

  This is reconstructed source, not recovered original source. R5.2m provides
  complete semantic coverage of the extent; the companion evidence holds the
  branch-target bytes, calls, reads, ledger and self-review record. Claude
  reviewed the extent against the binary on 2026-08-03 (R5.C): no semantic
  misreading.
==============================================================================}

unit Combat_AmplifiedDamage_Reconstructed;

interface

function AmplifiedDamage(u, sp: Integer): Boolean; register;

implementation

type
  inferred_unitT = record
    inferred_beforeOwner: array[0..$698] of Byte;
    owner: ShortInt;                            { +$699 }
    inferred_beforeDead: array[$69A..$69D] of Byte;
    dead: Boolean;                              { +$69E }
    inferred_beforeInCombat: array[$69F..$6A1] of Byte;
    incombat: Boolean;                          { +$6A2 }
    inferred_beforeAmplifier: array[$6A3..$6CE] of Byte;
    amplifier: Boolean;                         { +$6CF }
    inferred_tail: array[$6D0..$783] of Byte;   { full unitT stride $784 }
  end;

var
  BaseUnits, Units: array[1..40000] of inferred_unitT;
  inferred_Maxunits: Integer;                  { runtime-data displacement
                                                  $01AC1F18 through $00709188 }

function AmplifiedDamage(u, sp: Integer): Boolean; register;
var
  b: Boolean;
  i: Integer;
begin
  { TD32 homes `sp` at $005BEB2E, but the extent never reads it. }
  if not Iscombat then                          { $005BEB34..$005BEB3B;
                                                  true -> $005BEB46, scan setup }
  begin
    Result := False;                            { $005BEB3D..$005BEB41;
                                                  jump -> $005BEC68, return load }
    Exit;
  end;

  b := False;                                   { $005BEB46 }
  for i := 1 to inferred_Maxunits do            { bound/setup $005BEB4A..$005BEB60;
                                                  non-positive -> $005BEC62;
                                                  back-edge $005BEC56..$005BEC5C
                                                  -> $005BEB67 }
  begin
    if (not BaseUnits[i].dead) and               { $005BEB67..$005BEB93;
                                                  dead -> $005BEC56 }
       BaseUnits[i].incombat and                 { $005BEB99..$005BEBC5;
                                                  false -> $005BEC56 }
       Units[i].amplifier and                    { $005BEBCB..$005BEBF7;
                                                  false -> $005BEC56 }
       (Units[i].owner <> Units[u].owner) then   { $005BEBF9..$005BEC50;
                                                  equal -> $005BEC56 }
      b := True;                                 { $005BEC52 }
  end;

  Result := b;                                  { $005BEC62..$005BEC65 }
end;                                             { $005BEC68..$005BEC6F }

end.
