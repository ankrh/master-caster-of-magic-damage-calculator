{==============================================================================
  Reconstructed routines:
    @Spells@DamageSpell     $005C10E8..$005C1954
    @Spells@ApplyDamageSpell $005C1974..$005C1C45
    @Spells@FirewallEffect  $005C1C48..$005C1CA5

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 module: Spells

  This is reconstructed source, not recovered original source. R5.2g and R5.2j
  provide complete semantic coverage of the three TD32 extents. Their evidence
  companions hold the branch-target bytes, calls, writes, ledgers and review
  records. Claude's 2026-08-03 R5.C review cleared all three extents, but Codex's
  reciprocal review found that DamageSpell's non-area spill back edge had been
  flattened into a one-shot branch. Claude confirmed the repeated loop from the
  cited bytes, and Codex integrated the correction below on 2026-08-03.
==============================================================================}

unit Spells_DamageSpells_Reconstructed;

interface

type
  damageT = record
    irrec: Integer;                             { +$00 }
    undead: Integer;                            { +$04 }
    normal: Integer;                            { +$08 }
  end;

function DamageSpell(u, sp, stroverride: Integer): damageT; register;
procedure ApplyDamageSpell(u, sp, ov: Integer); register;
procedure FirewallEffect(u: Integer); register;

implementation

type
  SpellTableT = array[0..400] of record
    inferred_beforeAttack: array[0..$47] of Byte;
    Attack: Integer;                            { +$48 }
    savepen: Integer;                           { +$4C }
    Illusion: Boolean;                          { +$50 }
    Doom: Boolean;                              { +$51 }
    Piercing: Boolean;                          { +$52 }
    Lightning: Boolean;                         { +$53 }
    Area: Boolean;                              { +$54 }
    Poison: Boolean;                            { +$55 }
    Fire: Boolean;                              { +$56 }
    Cold: Boolean;                              { +$57 }
    Missile: Boolean;                           { +$58 }
    Stoning: Boolean;                           { +$59 }
    Death: Boolean;                             { +$5A }
    Nonmagic: Boolean;                          { +$5B }
    Corporeal: Boolean;                         { +$5C }
    Nonhero: Boolean;                           { +$5D }
    inferred_alignment: array[$5E..$5F] of Byte;
    hitchance: Integer;                         { +$60 }
    inferred_afterHitChance: array[$64..$93] of Byte;
    irrecoverable: Boolean;                     { +$94 }
    undeaddamage: Boolean;                      { +$95 }
    inferred_tail: array[$96..$B7] of Byte;     { full entry stride $B8 }
  end;

  inferred_unitT = record
    rangedtype: Integer;                        { +$028 }
    ammo: Integer;                              { +$048 }
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
    immolation: Boolean;                        { +$0CD }
    noncorporeal: Boolean;                      { +$0DA }
    lightningresist: Boolean;                   { +$0DF }
    EnchantmentFlags: array[1..100] of Boolean; { +$509 }
    CombatEnchantmentFlags: array[1..100] of Boolean; { +$5D1 }
    owner: ShortInt;                            { +$699 }
    dead: Boolean;                              { +$69E }
    mp: SmallInt;                               { +$6AA }
  end;

const
  SChaosConjunctionScaled: set of Byte =
    [7, 13, 42, 50, 83, 91, 96, 99, 104, 122, 177];
  SIceBolt = 13;
  SAEtherSparks = 42;
  SWallofFire = 87;
  SWarpLightning = 101;
  EncBlackSleep = 46;
  EncInvulnerability = 44;
  EncFrozen = 61;

var
  Units: array[1..40000] of inferred_unitT;
  BaseUnits: array[1..40000] of inferred_unitT;
  SpellTable: SpellTableT;
  inferred_ChaosConjunction_State: Integer;     { runtime-data displacement $0AF90AE0 }
  inferred_InvulnerabilityDamageReduction: Integer; { pointer global $0070808C }

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
    str := stroverride;                         { $005C1135..$005C113E }

  if inferred_ChaosConjunction_State > 0 then
    if (sp <= 183) and (sp in SChaosConjunctionScaled) then
      str := Trunc(str * 1.34);                 { $005C1141..$005C118D;
                                                  set $005C1930..$005C1948;
                                                  80-bit 1.34 $005C1948..$005C1952 }
  if (inferred_ChaosConjunction_State > 0) and
     (sp = SWarpLightning) then
    Inc(str, 2);                                { $005C1190..$005C11AF }

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
    flags.illusion := True;                     { $005C11DF..$005C1209 }
  if SpellTable[sp].Area then
    aoe := True;                                { $005C1209..$005C1233 }
  if SpellTable[sp].Doom then
    flags.doom := True;                         { $005C1233..$005C125D }
  if SpellTable[sp].Piercing then
    flags.armorpiercing := True;                { $005C125D..$005C1287 }
  if SpellTable[sp].Lightning then
  begin
    if Units[u].lightningresist then
      flags.armorpiercing := False
    else
      flags.armorpiercing := True;              { $005C1287..$005C12E5 }
  end;

  if Units[u].magicimmunity and
     (not SpellTable[sp].Nonmagic) then
    Exit;                                       { $005C12E5..$005C133D;
                                                  target $005C1926 }

  nofattacks := 1;
  if aoe then
    nofattacks := LivingFigures(u);             { $005C133D..$005C1355 }
  if sp = SWarpLightning then
    nofattacks := str;                          { $005C1355..$005C1361 }

  totaldam := 0;
  def := EffectiveDefense(u, flags, True, 0, sp,
    False, False, False, False, True,
    not SpellTable[sp].Nonmagic);               { $005C1361..$005C13A9 }

  if SpellTable[sp].Cold and Units[u].coldimmunity then
    def := 100;                                 { $005C13AC..$005C1407 }
  if SpellTable[sp].Fire and Units[u].Fireimmunity then
    def := 100;                                 { $005C1407..$005C1462 }
  if SpellTable[sp].Missile and Units[u].missileImmunity then
    def := 100;                                 { $005C1462..$005C14BD }
  if SpellTable[sp].Poison and Units[u].poisonimmunity then
    def := 100;                                 { $005C14BD..$005C1518 }
  if SpellTable[sp].Death and Units[u].deathimmunity then
    def := 100;                                 { $005C1518..$005C1573 }
  if SpellTable[sp].Stoning and Units[u].stoningimmunity then
    def := 100;                                 { $005C1573..$005C15CE }
  if SpellTable[sp].Corporeal and Units[u].noncorporeal then
    def := 100;                                 { $005C15CE..$005C1629 }

  if Units[u].EnchantmentFlags[EncBlackSleep] then
    flags.doom := True;                         { $005C1629..$005C165B }

  topfdam := TopFigureDamage(u);                 { $005C165B..$005C1663 }
  if flags.doom then
    totaldam := str * nofattacks                 { $005C1666..$005C167C }
  else if nofattacks > 0 then
    for i := 1 to nofattacks do
    begin
      dam := AttackRoll(str, SpellTable[sp].hitchance) -
             DefenseRoll(def, Units[u].defendchance); { $005C1696..$005C16FF }

      if Units[u].EnchantmentFlags[EncInvulnerability] then
        Dec(dam, inferred_InvulnerabilityDamageReduction); { $005C1702..$005C1741 }
      if dam < 0 then
        dam := 0;                               { $005C1741..$005C174C }

      if aoe then
      begin
        if dam > HpPerFigure(u) then
          dam := HpPerFigure(u);                { $005C174C..$005C176E }
        Inc(totaldam, dam);
        dam := 0;                               { $005C176E..$005C1785 }
      end
      else
      begin
        { Delphi lays this pre-tested while as an initial jump from $005C1750 to
          the condition at $005C1850, followed by the backward true edge
          $005C1867 -> $005C1785. The body can run zero or many times. }
        while dam + topfdam > HpPerFigure(u) do { condition $005C1850..$005C186D;
                                                   true target $005C1785 }
        begin
          Inc(totaldam, HpPerFigure(u) - topfdam); { $005C1785..$005C17A1 }
          dam := dam - HpPerFigure(u) + topfdam;  { $005C17A4..$005C17C2 }
          Dec(dam, DefenseRoll(def, Units[u].defendchance)); { $005C17C2..$005C17FE }
          if Units[u].EnchantmentFlags[EncInvulnerability] then
            Dec(dam, inferred_InvulnerabilityDamageReduction); { $005C1801..$005C1840 }
          if dam < 0 then
            dam := 0;                           { $005C1840..$005C184B }
          topfdam := 0;                         { $005C184B..$005C1850 }
        end;

        Inc(totaldam, dam);
        Inc(topfdam, dam);
        dam := 0;                               { $005C186D..$005C188C }
      end;

      Inc(totaldam, dam);                       { $005C188C..$005C1899 }
      if sp = SWarpLightning then
        Dec(str);                               { $005C1899..$005C18AA }
    end;                                       { $005C18AA..$005C18B6 }

  if SpellTable[sp].irrecoverable then
    Result.irrec := totaldam
  else if SpellTable[sp].undeaddamage then
    Result.undead := totaldam
  else
    Result.normal := totaldam;                  { $005C18B6..$005C1926 }
end;                                           { $005C1926..$005C1954 includes
                                                  embedded constants/padding }

procedure ApplyDamageSpell(u, sp, ov: Integer); register;
var
  dam: damageT;
begin
  dam := DamageSpell(u, sp, ov);                { $005C1983..$005C1990 }

  if AmplifiedDamage(u, sp) then                { $005C1995..$005C19A2 }
  begin
    if dam.normal > 0 then
      Inc(dam.normal)
    else if dam.irrec > 0 then
      Inc(dam.irrec)
    else if dam.undead > 0 then
      Inc(dam.undead);                          { $005C19A4..$005C19DB }
  end;

  Dealdamage(u, dam.normal, dam.undead, True,
    dam.irrec);                                 { $005C19DB..$005C19EA }

  if sp = SAEtherSparks then
  begin
    BaseUnits[u].mp := BaseUnits[u].mp div 2;   { $005C19EF..$005C1A67 }
    if Ismagicalranged(BaseUnits[u].rangedtype) or
       Ismagicalranged(Units[u].rangedtype) then
      BaseUnits[u].ammo := BaseUnits[u].ammo div 2;
                                                { $005C1A6F..$005C1B10 }
  end;

  if (sp = SIceBolt) and
     (not Units[u].coldimmunity) and
     (not Units[u].noncorporeal) and
     (not Units[u].immolation) then
    BaseUnits[u].CombatEnchantmentFlags[EncFrozen] := True;
                                                { $005C1B10..$005C1BD4 }

  if Units[u].dead and (not Iscombat) then
    UnitDies(u, False, Units[u].owner);         { $005C1BD4..$005C1C41 }
end;                                           { $005C1C41..$005C1C45 }

procedure FirewallEffect(u: Integer); register;
begin
  if (not HasTeleMerge(u)) and
     (not Units[u].flying) then
    ApplyDamageSpell(u, SWallofFire,
      SpellTable[SWallofFire].Attack);          { $005C1C48..$005C1CA5 }
end;

end.
