{==============================================================================
  Reconstructed routines:
    @Units@GetEffectiveResistance  $00595AB8..$00595CE9
    @Units@ResistanceRoll          $00595CEC..$00595DAD
    @Units@AttackRoll              $00595E24..$00595E7C
    @Units@DefenseRoll             $00595E7C..$00595EE9
    @Units@EffectiveDefense        $005965C8..$00596848
    @Combat@RangedPenalty          $005B1800..$005B1927
    @Combat@CombatDistanceUnit     $005BB234..$005BB2FE

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 modules: Units, Combat

  This is reconstructed source, not recovered original source. R5.2e provides
  complete semantic coverage of all seven TD32 extents. Names beginning
  `inferred_` are reconstructed aliases; their dereferences and addresses are
  exact and their MODDING.INI key bindings are proved in the evidence companion.
  Claude reviewed all seven extents against the binary on 2026-08-03 (R5.C): no
  semantic misreading.
==============================================================================}

unit Combat_ResolutionHelpers_Reconstructed;

interface

type
  AttackFlagsT = record                         { 19 dwords / $4C bytes }
    doom, illusion, supernatural, armorpiercing, mysticsurge: Boolean;
    lifesteal, poison, destruction, stoningtouch, deathtouch, exorcise: Boolean;
    lifestealvalue, poisonvalue, destructionvalue: Integer;
    stoningtouchvalue, deathtouchvalue, exorcisevalue: Integer;
    placeholder: array[1..10] of Integer;
  end;

function GetEffectiveResistance(i, realm: Integer; isroll: Boolean): Integer; register;
function ResistanceRoll(u, realm, save: Integer; fate: Boolean; w: Integer): Integer; register;
function AttackRoll(str, hit: Integer): Integer; register;
function DefenseRoll(def, todef: Integer): Integer; register;
function EffectiveDefense(u: Integer; flags: AttackFlagsT; ismagic: Boolean;
  extradef, spellid: Integer; ismissile, isbreath, islightning, isfire,
  isranged, ismagic2: Boolean): Integer; register;
function RangedPenalty(au, du: Integer): Integer; register;
function CombatDistanceUnit(u, u2: Integer): Integer; register;

implementation

const
  Nature = 1;
  Chaos = 3;
  Death = 5;
  HACharmed = 14;
  EncResistElements = 16;
  EncElementalArmor = 20;
  EncResistMagic = 23;
  GEFateMastery = 35;
  EncBless = 51;

type
  inferred_SpellEntryT = record
    inferred_beforeRealm: array[0..$33] of Byte;
    Realm: Integer;                             { +$34 }
    inferred_beforeTags: array[$38..$54] of Byte;
    Poison: Boolean;                            { +$55 }
    Fire: Boolean;                              { +$56 }
    Cold: Boolean;                              { +$57 }
  end;

  inferred_unitT = record
    rangedtype: Integer;                        { +$028 }
    defense: Integer;                           { +$064 }
    resistance: Integer;                        { +$068 }
    Fireimmunity: Boolean;                      { +$0C1 }
    missileImmunity: Boolean;                   { +$0C3 }
    illusionimmunity: Boolean;                  { +$0C4 }
    coldimmunity: Boolean;                      { +$0C5 }
    magicimmunity: Boolean;                     { +$0C6 }
    poisonimmunity: Boolean;                    { +$0C8 }
    weaponimmunity: Boolean;                    { +$0C9 }
    LargeShield: Boolean;                       { +$0D0 }
    lightningresist: Boolean;                   { +$0DF }
    ishero: Boolean;                            { +$0E2 }
    longrange: Boolean;                         { +$0D7 }
    cox, coy: Integer;                          { +$4E8, +$4EC }
    EnchantmentFlags: array[1..100] of Boolean; { +$509 }
    owner: ShortInt;                            { +$699 }
    herotype: SmallInt;                         { +$6B0 }
  end;

var
  Units, BaseUnits: array[1..40000] of inferred_unitT;
  SpellTable: array[0..400] of inferred_SpellEntryT;

  inferred_ResistElementsResistBonus: ^Integer; { pointer global $007099E8 }
  inferred_BlessResistBonus: ^Integer;          { pointer global $00708F50 }
  inferred_ResistMagicBonus: ^Integer;          { pointer global $0070A20C }
  inferred_LargeShieldBonus: ^Integer;          { pointer global $0070920C }
  inferred_ResistElementsDefenseBonus: ^Integer; { pointer global $00708BA0 }
  inferred_ElementalArmorDefenseBonus: ^Integer; { pointer global $0070A264 }
  inferred_BlessDefenseBonus: ^Integer;         { pointer global $00708148 }
  inferred_WeaponImmunityDefenseBonus: ^Integer; { pointer global $00708BA4 }
  inferred_ToDefendCap: ^Integer;               { pointer global $0070A284 }
  inferred_ToDefendCappedValue: ^Integer;       { pointer global $007099EC }
  inferred_HeroNoRangePenalty: ^Boolean;        { pointer global $00708D50 }
  inferred_MagicNoRangePenalty: ^Boolean;       { pointer global $00708D4C }
  inferred_RangedPenaltyStarts: ^Integer;       { pointer global $00708EFC }
  inferred_RangedPenaltyGap: ^Integer;          { pointer global $00708B6C }
  inferred_RangedPenaltyGrowth: ^Integer;       { pointer global $0070A098 }
  inferred_RangedPenaltyBase: ^Integer;         { pointer global $007095CC }

function GetEffectiveResistance(i, realm: Integer; isroll: Boolean): Integer; register;
begin
  Result := Units[i].resistance;                       { $00595AEB..$00595AF2 }

  if isroll and Units[i].ishero and
     (Wizards[BaseUnits[i].owner].Hero[Units[i].herotype, HACharmed] > 0) then
    Result := 100;                                     { $00595AF5..$00595BCA }

  if Units[i].magicimmunity and (realm <> 0) then
    Result := 100;                                     { $00595BEF..$00595C05 }

  if (realm = Nature) and Units[i].EnchantmentFlags[EncResistElements] then
    Inc(Result, inferred_ResistElementsResistBonus^);  { $00595C0C..$00595C47 }

  if ((realm = Chaos) or (realm = Death)) and
     Units[i].EnchantmentFlags[EncBless] then
    Inc(Result, inferred_BlessResistBonus^);           { $00595C51..$00595C93 }

  if (realm <> 0) and Units[i].EnchantmentFlags[EncResistMagic] then
    Inc(Result, inferred_ResistMagicBonus^);           { $00595C9D..$00595CD8 }
end;

function ResistanceRoll(u, realm, save: Integer; fate: Boolean;
  w: Integer): Integer; register;
var
  i, j: Integer;
begin
  i := GetEffectiveResistance(u, realm, True) + save;  { call $00595D03; add $00595D08 }
  j := Random(10) + 1;                                { call $00595D1A }
  if j > i then Result := j - i else Result := 0;     { $00595D2C..$00595D48 }

  if fate and (w >= 0) and HasGlobalEnchantment(w, GEFateMastery) and
     (Result <= 0) then
  begin
    j := Random(10) + 1;                              { call $00595D73 }
    if j > i then Result := j - i else Result := 0;   { $00595D85..$00595DA1 }
  end;
end;

function AttackRoll(str, hit: Integer): Integer; register;
var
  i: Integer;
begin
  Result := 0;
  if hit < 10 then hit := 10;                         { $00595E35..$00595E3B }
  for i := 1 to str do
    if Random(100) < hit then Inc(Result);            { $00595E53..$00595E73 }
end;

function DefenseRoll(def, todef: Integer): Integer; register;
var
  i: Integer;
begin
  Result := 0;
  for i := 1 to def do
  begin
    if (i > inferred_ToDefendCap^) and
       (todef > inferred_ToDefendCappedValue^) then
      todef := inferred_ToDefendCappedValue^;         { $00595E9E..$00595EBD }
    if Random(100) < todef then Inc(Result);          { $00595EC0..$00595EE0 }
  end;
end;

function EffectiveDefense(u: Integer; flags: AttackFlagsT;
  ismagic: Boolean; extradef, spellid: Integer;
  ismissile, isbreath, islightning, isfire, isranged,
  ismagic2: Boolean): Integer; register;
var
  U: ^inferred_unitT;
begin
  U := @Units[u];                                     { $005965E4..$0059660F }
  Result := U^.defense + extradef;                    { $00596612..$00596622 }

  if flags.illusion and U^.illusionimmunity then
    flags.illusion := False;                          { $00596625..$00596637 }
  if flags.illusion then
  begin
    Result := 0;
    Exit;                                             { $0059663B..$00596646 }
  end;

  if isranged and U^.LargeShield then
    Inc(Result, inferred_LargeShieldBonus^);          { $0059664B..$00596664 }
  if U^.EnchantmentFlags[EncResistElements] and (ismagic2 or isbreath) then
    Inc(Result, inferred_ResistElementsDefenseBonus^); { $0059666E..$00596689 }
  if U^.EnchantmentFlags[EncElementalArmor] and (ismagic2 or isbreath) then
    Inc(Result, inferred_ElementalArmorDefenseBonus^); { $00596693..$005966AE }
  if U^.EnchantmentFlags[EncBless] and ismagic2 and (spellid > 0) and
     ((SpellTable[spellid].Realm = Chaos) or
      (SpellTable[spellid].Realm = Death)) then
    Inc(Result, inferred_BlessDefenseBonus^);         { $005966B8..$00596700 }

  if U^.lightningresist and islightning then
    flags.armorpiercing := False;                     { $0059670A..$00596718 }
  if flags.armorpiercing then
    Result := Result div 2;                           { signed idiv $00596722..$0059672D }

  if U^.Fireimmunity and SpellTable[spellid].Fire then Result := 100;   { $00596730..$00596762 }
  if U^.Fireimmunity and isfire then Result := 100;                     { $00596769..$00596777 }
  if U^.coldimmunity and SpellTable[spellid].Cold then Result := 100;   { $0059677E..$005967B0 }
  if U^.poisonimmunity and SpellTable[spellid].Poison then Result := 100; { $005967B7..$005967E9 }
  if U^.magicimmunity and ismagic2 then Result := 100;                 { $005967F0..$005967FE }
  if U^.missileImmunity and ismissile then Result := 100;              { $00596805..$00596813 }

  if not ismagic and U^.weaponimmunity then
    Inc(Result, inferred_WeaponImmunityDefenseBonus^); { $0059681A..$00596833 }
end;

function RangedPenalty(au, du: Integer): Integer; register;
var
  dist: Integer;
begin
  Result := 0;
  dist := CombatDistanceUnit(au, du);                 { call $005B1817 }

  if Units[au].ishero and not inferred_HeroNoRangePenalty^ then
    dist := 0;                                        { $005B183D..$005B1859 }
  if Ismagicalranged(Units[au].rangedtype) and
     not inferred_MagicNoRangePenalty^ then
    dist := 0;                                        { $005B185C..$005B189C }

  if dist >= inferred_RangedPenaltyStarts^ then
  begin
    Dec(dist, inferred_RangedPenaltyStarts^);         { $005B189F..$005B18B2 }
    if Units[au].longrange then dist := 0;            { $005B18DA..$005B18EC }
    Result := (dist div inferred_RangedPenaltyGap^) *
              inferred_RangedPenaltyGrowth^ +
              inferred_RangedPenaltyBase^;           { $005B18EF..$005B191D }
  end;
end;

function CombatDistanceUnit(u, u2: Integer): Integer; register;
begin
  Result := CombatDistance(BaseUnits[u].cox, BaseUnits[u].coy,
    BaseUnits[u2].cox, BaseUnits[u2].coy);             { call $005BB2EE }
end;

end.
