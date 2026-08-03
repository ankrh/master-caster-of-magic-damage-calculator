{==============================================================================
  Reconstructed routines:
    @Combat@mergeflags            $005B1630..$005B17FE
    @Units@Ismissileranged        $00596440..$0059648C
    @Units@canattackflier         $005953D8..$00595544
    @Combat@CrushWall             $005B32BC..$005B3338
    unnamed coordinate overload   $005B3ECC..$005B3F04
    @Combat@Insidewalls           $005B3F04..$005B3F5C
    @Combat@HasWallOfFire         $005B403C..$005B40AC
    @Combat@HasWall               $005B40AC..$005B411C
    @Combat@ctws                  $005BB0D0..$005BB1CC
    @Combat@GetWallState          $005BB738..$005BB785
    @Combat@SetWallState          $005BB788..$005BB7CE
    @Combat@destroywall           $005BB7D0..$005BB7FE

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 modules: Combat, Units

  This is reconstructed source, not recovered original source. R5.2h and R5.2l
  provide complete semantic coverage of all twelve assigned extents. Names
  beginning `inferred_` are semantic aliases; exact addresses and supporting
  evidence are in Combat.AttackAndWallHelpers.R5.2h.evidence.md and
  Combat.WallStateMapping.R5.2l.evidence.md. Claude reviewed all twelve extents
  against the binary on 2026-08-03 (R5.C): one semantic-label defect, spanning
  three `mergeflags` rider labels, was corrected; nothing else changed.
==============================================================================}

unit Combat_AttackAndWallHelpers_Reconstructed;

interface

type
  AttackFlagsT = record                         { exact Typedec.pas layout; $4C bytes }
    doom, illusion, supernatural, armorpiercing, mysticsurge: Boolean;
    lifesteal, poison, destruction, stoningtouch, deathtouch, exorcise: Boolean;
    lifestealvalue, poisonvalue, destructionvalue: Integer;
    stoningtouchvalue, deathtouchvalue, exorcisevalue: Integer;
    placeholder: array[1..10] of Integer;
  end;

procedure mergeflags(var f: AttackFlagsT; const f2: AttackFlagsT); register;
function Ismissileranged(rt: Integer): Boolean; register;
function canattackflier(u: Integer): Boolean; register;
function CrushWall(u: Integer): Boolean; register;
function inferred_InsideWallCoordinates(x, y: Integer): Boolean; register;
function Insidewalls(u: Integer): Boolean; register;
function HasWallOfFire: Boolean;
function HasWall: Boolean;
function ctws(cx, cy: Integer): Integer; register;
function GetWallState(cx, cy: Integer): Integer; register;
procedure SetWallState(cx, cy, ws: Integer); register;
procedure destroywall(cx, cy: Integer); register;

implementation

type
  inferred_RangedTypeT = record                 { inferred name; exact $10 stride }
    inferred_beforeClassFlags: array[0..11] of Byte;
    IsMissile: Boolean;                         { +$0C }
    IsMagic: Boolean;                           { +$0D }
    inferred_tail: array[$0E..$0F] of Byte;
  end;

  inferred_unitT = record
    thrown: Integer;                            { +$02C }
    firebreath: Integer;                        { +$030 }
    lightningbreath: Integer;                   { +$034 }
    deathgaze: Integer;                         { +$038; 100 = absent }
    stoninggaze: Integer;                       { +$03C; 100 = absent }
    doomgaze: Integer;                          { +$040; 0 = absent }
    flying: Boolean;                            { +$0BC }
    wallcrusher: Boolean;                       { +$0D2 }
    cox, coy: Integer;                          { +$4E8, +$4EC }
    owner: ShortInt;                            { +$699 }
  end;

  { Partial projection. Field identities and the $07B8 stride are exact;
    omitted CityT fields intentionally keep this reconstruction non-compilable. }
  inferred_CityT = record
    Buildings: array[1..100] of ShortInt;
    Enchantments: array[1..100] of ShortInt;
  end;

const
  BCityWalls = 37;
  CEWallOfFire = 1;

var
  Units, BaseUnits: array[1..40000] of inferred_unitT;
  inferred_RangedTypes: array[1..100] of inferred_RangedTypeT; { pointer $0070A144 }
  inferred_Cities: array[1..1000] of inferred_CityT;
  inferred_CombatWallState: array[1..12] of Integer; { pointer global $0070969C;
                                                       indexed operand +$44EC is
                                                       lower-bound-biased: element 1
                                                       at +$44F0, element 12 at +$451C }
  inferred_CombatPlane: ^Integer;               { pointer global $00708324 }
  inferred_CombatX: ^Integer;                   { pointer global $007089E4 }
  inferred_CombatY: ^Integer;                   { pointer global $007086D8 }
  inferred_CombatDefenderOwner: ^Integer;       { pointer global $0070A22C }

procedure mergeflags(var f: AttackFlagsT; const f2: AttackFlagsT); register;
begin
  if f2.doom then f.doom := True;               { $005B163C..$005B164A; false target
                                                  $005B164A begins illusion }
  if f2.illusion then f.illusion := True;        { $005B164A..$005B165A; false target
                                                  $005B165A begins supernatural }
  if f2.supernatural then f.supernatural := True; { $005B165A..$005B166A; false target
                                                    $005B166A begins armor piercing }
  if f2.armorpiercing then f.armorpiercing := True; { $005B166A..$005B167A; false target
                                                      $005B167A begins Mystic Surge }
  if f2.mysticsurge then f.mysticsurge := True; { $005B167A..$005B168A; false target
                                                  $005B168A begins Life Steal }

  if f2.lifesteal then                           { $005B168D; false target $005B16C8:
                                                  Death Touch }
    if f.lifesteal then                         { $005B1696; false target $005B16B5:
                                                  first-source copy }
      f.lifestealvalue := Min(f.lifestealvalue, f2.lifestealvalue) { call $005B16A8 }
    else
    begin
      f.lifesteal := True;
      f.lifestealvalue := f2.lifestealvalue;    { writes $005B16B8..$005B16C5 }
    end;

  if f2.deathtouch then                         { $005B16CB; false target $005B1706:
                                                  Poison }
    if f.deathtouch then                        { $005B16D4; false target $005B16F3:
                                                  first-source copy }
      f.deathtouchvalue := Min(f.deathtouchvalue, f2.deathtouchvalue) { call $005B16E6 }
    else
    begin
      f.deathtouch := True;
      f.deathtouchvalue := f2.deathtouchvalue;  { writes $005B16F6..$005B1703 }
    end;

  if f2.poison then                             { $005B1709; false target $005B1740:
                                                  Destruction }
    if f.poison then                            { $005B1712; false target $005B172D:
                                                  first-source copy }
      f.poisonvalue := f.poisonvalue + f2.poisonvalue { add $005B1721 }
    else
    begin
      f.poison := True;
      f.poisonvalue := f2.poisonvalue;          { writes $005B1730..$005B173D }
    end;

  if f2.destruction then                        { $005B1743; false target $005B177E:
                                                  Stoning Touch }
    if f.destruction then                       { $005B174C; false target $005B176B:
                                                  first-source copy }
      f.destructionvalue := Min(f.destructionvalue, f2.destructionvalue) { call $005B175E }
    else
    begin
      f.destruction := True;
      f.destructionvalue := f2.destructionvalue; { writes $005B176E..$005B177B }
    end;

  if f2.stoningtouch then                       { $005B1781; false target $005B17BC:
                                                  Exorcise }
    if f.stoningtouch then                      { $005B178A; false target $005B17A9:
                                                  first-source copy }
      f.stoningtouchvalue := Min(f.stoningtouchvalue, f2.stoningtouchvalue) { call $005B179C }
    else
    begin
      f.stoningtouch := True;
      f.stoningtouchvalue := f2.stoningtouchvalue; { writes $005B17AC..$005B17B9 }
    end;

  if f2.exorcise then                           { $005B17BF; false target $005B17FA:
                                                  epilogue }
    if f.exorcise then                          { $005B17C8; false target $005B17E7:
                                                  first-source copy }
      f.exorcisevalue := Min(f.exorcisevalue, f2.exorcisevalue) { call $005B17DA }
    else
    begin
      f.exorcise := True;
      f.exorcisevalue := f2.exorcisevalue;      { writes $005B17EA..$005B17F7 }
    end;
end;

function Ismissileranged(rt: Integer): Boolean; register;
begin
  if rt < 1 then                                { $00596449; nonnegative target
                                                  $00596455 begins table access }
    Result := False
  else
    Result := inferred_RangedTypes[rt].IsMissile; { $00596474; false target
                                                    $00596481 writes False }
end;

function canattackflier(u: Integer): Boolean; register;
begin
  Result :=
    (Units[u].thrown > 0) or                    { $00595405; true target $00595539 }
    (Units[u].firebreath > 0) or                { $00595437; true target $00595539 }
    (Units[u].lightningbreath > 0) or           { $00595469; true target $00595539 }
    Units[u].flying or                          { $0059549B; true target $00595539 }
    (Units[u].stoninggaze <> 100) or            { $005954CD; true target $00595539 }
    (Units[u].deathgaze <> 100) or              { $005954FB; true target $00595539 }
    (Units[u].doomgaze <> 0);                   { $00595529; true target $00595539;
                                                  false fall-through writes False }
end;

function CrushWall(u: Integer): Boolean; register;
begin
  Result := False;                              { $005B32C5 }
  if Units[u].wallcrusher and                   { $005B32ED; false target $005B3331:
                                                  return current False }
     (Units[u].owner <> inferred_CombatDefenderOwner^) then { $005B3329; equal target
                                                              $005B3331: return False }
    Result := True;                             { $005B332D }
end;

function inferred_InsideWallCoordinates(x, y: Integer): Boolean; register;
begin
  Result := (x >= 6) and                        { $005B3ED8; false target $005B3EF6 }
            (x <= 9) and                        { $005B3EDE; false target $005B3EF6 }
            (y >= 10) and                       { $005B3EE4; false target $005B3EF6 }
            (y <= 13);                          { $005B3EEA; false target $005B3EF6;
                                                  success writes True $005B3EF0 }
end;

function Insidewalls(u: Integer): Boolean; register;
begin
  Result := inferred_InsideWallCoordinates(BaseUnits[u].cox, BaseUnits[u].coy);
                                               { reads $005B3F3E..$005B3F47;
                                                 call $005B3F4D }
end;

function HasWallOfFire: Boolean;
var
  c: Integer;
begin
  c := cityontile(inferred_CombatPlane^, inferred_CombatX^, inferred_CombatY^);
                                               { globals/call $005B4042..$005B4059 }
  if c <= 0 then                               { $005B4061; positive target $005B406D:
                                                 city-record access }
    Result := False
  else
    Result := inferred_Cities[c].Enchantments[CEWallOfFire] >= 0;
                                               { $005B4091; negative target $005B40A1:
                                                 write False; otherwise True }
end;

function HasWall: Boolean;
var
  c: Integer;
begin
  c := cityontile(inferred_CombatPlane^, inferred_CombatX^, inferred_CombatY^);
                                               { globals/call $005B40B2..$005B40C9 }
  if c <= 0 then                               { $005B40D1; positive target $005B40DD:
                                                 city-record access }
    Result := False
  else
    Result := inferred_Cities[c].Buildings[BCityWalls] >= 1;
                                               { $005B4101; below-one target $005B4111:
                                                 write False; otherwise True }
end;

function ctws(cx, cy: Integer): Integer; register;
begin
  Result := 0;                                  { $005BB0DC..$005BB0DE }

  if (cx = 9) and (cy = 13) then                { jumps $005BB0E5/$005BB0EB to
                                                  $005BB0F4: next coordinate test }
    Result := 1;                                { $005BB0ED }
  if (cx = 9) and (cy = 12) then                { jumps $005BB0F8/$005BB0FE to
                                                  $005BB107: next coordinate test }
    Result := 2;                                { $005BB100 }
  if (cx = 9) and (cy = 11) then                { jumps $005BB10B/$005BB111 to
                                                  $005BB11A: next coordinate test }
    Result := 3;                                { $005BB113 }
  if (cx = 9) and (cy = 10) then                { jumps $005BB11E/$005BB124 to
                                                  $005BB12D: next coordinate test }
    Result := 4;                                { $005BB126 }
  if (cx = 8) and (cy = 10) then                { jumps $005BB131/$005BB137 to
                                                  $005BB140: next coordinate test }
    Result := 5;                                { $005BB139 }
  if (cx = 7) and (cy = 10) then                { jumps $005BB144/$005BB14A to
                                                  $005BB153: next coordinate test }
    Result := 6;                                { $005BB14C }
  if (cx = 6) and (cy = 10) then                { jumps $005BB157/$005BB15D to
                                                  $005BB166: next coordinate test }
    Result := 7;                                { $005BB15F }
  if (cx = 6) and (cy = 11) then                { jumps $005BB16A/$005BB170 to
                                                  $005BB179: next coordinate test }
    Result := 8;                                { $005BB172 }
  if (cx = 6) and (cy = 12) then                { jumps $005BB17D/$005BB183 to
                                                  $005BB18C: next coordinate test }
    Result := 9;                                { $005BB185 }
  if (cx = 6) and (cy = 13) then                { jumps $005BB190/$005BB196 to
                                                  $005BB19F: next coordinate test }
    Result := 10;                               { $005BB198 }
  if (cx = 7) and (cy = 13) then                { jumps $005BB1A3/$005BB1A9 to
                                                  $005BB1B2: next coordinate test }
    Result := 11;                               { $005BB1AB }
  if (cx = 8) and (cy = 13) then                { jumps $005BB1B6/$005BB1BC to
                                                  $005BB1C5: return load }
    Result := 12;                               { $005BB1BE }
end;

function GetWallState(cx, cy: Integer): Integer; register;
var
  w: Integer;
begin
  w := ctws(cx, cy);                            { call $005BB74A }
  if w > 0 then                                { $005BB752; nonpositive target
                                                 $005BB779 writes zero }
    Result := inferred_CombatWallState[w]       { read $005BB767..$005BB774 }
  else
    Result := 0;
end;

procedure SetWallState(cx, cy, ws: Integer); register;
var
  w: Integer;
begin
  w := ctws(cx, cy);                            { call $005BB79D }
  if w > 0 then                                 { $005BB7A5/$005BB7A9; false target
                                                  $005BB7CA begins epilogue }
    inferred_CombatWallState[w] := ws;          { $005BB7C3; complete 1..12 range idiom
                                                  $005BB7AB..$005BB7B9, pointer load
                                                  $005BB7BA, value reload $005BB7C0 }
end;

procedure destroywall(cx, cy: Integer); register;
begin
  if GetWallState(cx, cy) = 1 then              { call $005BB7E2; unequal target
                                                  $005BB7FA epilogue }
    SetWallState(cx, cy, 2);                    { call $005BB7F5 }
end;

end.
