{==============================================================================
  Reconstructed routines:
    @Wizard@HasGlobalEnchantment  $00590DAC..$00590E07
    @Units@HasTeleMerge           $005952DC..$00595352
    @Units@DeadFigures            $005964F8..$00596553
    @Combat@CombatDistance        $005BB1CC..$005BB232
    @Combat@CGADEnemy             $005BD25C..$005BD284
    @Game@CanHealNaturally        $005ECB4C..$005ECBC4

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 modules: Wizard, Units, Combat, Game

  This is reconstructed source, not recovered original source. R5.2k provides
  complete semantic coverage of all six TD32 extents. Names beginning
  `inferred_` are semantic aliases; exact bindings and all byte evidence are in
  Combat.CallClosureHelpers.R5.2k.evidence.md. Claude reviewed all six extents
  against the binary on 2026-08-03 (R5.C): no semantic misreading.
==============================================================================}

unit Combat_CallClosureHelpers_Reconstructed;

interface

function HasGlobalEnchantment(w, ge: Integer): Boolean; register;
function HasTeleMerge(u: Integer): Boolean; register;
function DeadFigures(u: Integer): Integer; register;
function CombatDistance(x, y, x2, y2: Integer): Integer; register;
function CGADEnemy: Integer; register;
function CanHealNaturally(u: Integer): Boolean; register;

implementation

const
  MaxMaxWizards = 13;
  MaxMaxGlobals = 100;
  NeutralplayerID = 15;
  RCNoHeal = 21;
  CGDefender = 1;
  CGAttacker = 2;

type
  inferred_unitT = record
    race: Integer;                             { +$07C }
    figures: Integer;                          { +$088 }
    teleporting: Boolean;                      { +$0BD }
    merging: Boolean;                          { +$0C0 }
    nohealing: Boolean;                        { +$72A }
  end;

  inferred_WizardT = record
    GlobalEnchantments: array[1..MaxMaxGlobals] of Boolean;
                                                { element 1 +$89AF4 }
  end;

var
  Units, BaseUnits: array[1..40000] of inferred_unitT;
  Wizards: array[0..MaxMaxWizards] of inferred_WizardT;
  inferred_CombatAttackersTurnState: Boolean;   { runtime pointer $0070969C
                                                  plus $44E4; exact binding via
                                                  @Castercore@CombatAttackersTurn
                                                  $00643FB0..$00643FC8 }

function HasGlobalEnchantment(w, ge: Integer): Boolean; register;
begin
  if w = NeutralplayerID then
    Result := True                              { $00590DB8..$00590DC2 }
  else
    Result := Wizards[w].GlobalEnchantments[ge];
                                                { $00590DC4..$00590DFD }
end;                                            { $00590E00..$00590E07 }

function HasTeleMerge(u: Integer): Boolean; register;
begin
  Result := Units[u].teleporting or Units[u].merging;
                                                { $005952E5..$00595347;
                                                  short-circuit join $0059534B }
end;                                            { $0059534B..$00595352 }

function DeadFigures(u: Integer): Integer; register;
begin
  Result := BaseUnits[u].figures - LivingFigures(u);
                                                { record address $00596501..$0059652C;
                                                  call $00596532;
                                                  checked subtract $0059653A..$00596549 }
end;                                            { $00596549..$00596553 }

function CombatDistance(x, y, x2, y2: Integer): Integer; register;
var
  xd, yd: Integer;
begin
  xd := Abs(x - x2);                            { $005BB1DB..$005BB1F4 }
  yd := Abs(y - y2);                            { $005BB1F7..$005BB210 }
  if xd > yd then
    Result := xd                                { $005BB213..$005BB221 }
  else
    Result := yd;                               { target $005BB223 }
end;                                            { $005BB229..$005BB232 }

function CGADEnemy: Integer; register;
begin
  if inferred_CombatAttackersTurnState then
    Result := CGDefender                        { $005BD260..$005BD275 }
  else
    Result := CGAttacker;                       { target $005BD277 }
end;                                            { $005BD27E..$005BD284 }

function CanHealNaturally(u: Integer): Boolean; register;
begin
  Result := True;                               { $005ECB55 }
  if Units[u].nohealing then
    Result := False;                            { $005ECB59..$005ECB87 }
  if Units[u].race = RCNoHeal then
    Result := False;                            { $005ECB8B..$005ECBB9 }
end;                                            { $005ECBBD..$005ECBC4 }

end.
