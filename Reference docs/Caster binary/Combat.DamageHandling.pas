{==============================================================================
  Reconstructed routines:
    @Combat@AddDamage        $005B1928..$005B1970
    @Combat@Combatheal       $005B1260..$005B15BE
    @Units@LivingFigures     $0059648C..$005964F8
    @Units@TopFigureDamage   $00596554..$005965C6
    @Combat@Dealdamage       $005B41C0..$005B4555

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 modules: Combat, Units

  This is reconstructed source, not recovered original source. R5.2f provides
  complete semantic coverage of all five TD32 extents. The evidence companion
  holds the branch-target bytes, calls, writes, ledgers, and review record.
  Claude reviewed all five extents against the binary on 2026-08-03 (R5.C): no
  semantic misreading.
==============================================================================}

unit Combat_DamageHandling_Reconstructed;

interface

type
  DamageT = record
    irrecoverable: Integer;                    { +$00 }
    undead: Integer;                           { +$04 }
    normal: Integer;                           { +$08 }
  end;

procedure AddDamage(var dmg1: DamageT; const dmg2: DamageT); register;
procedure Combatheal(u, amount: Integer; overheal, isregen: Boolean); register;
function LivingFigures(u: Integer): Integer; register;
function TopFigureDamage(u: Integer): Integer; register;
procedure Dealdamage(u, normal, undead: Integer; overland: Boolean;
  irrec: Integer); register;

implementation

const
  EncConfusion = 12;
  EncPossession = 52;
  EncCreatureBinding = 53;
  EncBuried = 60;

type
  inferred_unitT = record
    figures: Integer;                           { +$088 }
    Totaldamage: SmallInt;                      { +$500 }
    Irrecoverabledamage: SmallInt;              { +$502 }
    Undeaddamage: SmallInt;                     { +$504 }
    EnchantmentFlags: array[1..100] of Boolean; { +$509 }
    owner: ShortInt;                            { +$699 }
    dead: Boolean;                              { +$69E }
    undeaded: Boolean;                          { +$6A0 }
    irrecoverable: Boolean;                     { +$6A1 }
    bonushp: SmallInt;                          { +$6A4 }
    combatsummoned: Boolean;                    { +$6B4 }
  end;

var
  Units, BaseUnits: array[1..40000] of inferred_unitT;
  DebugGod: ^Boolean;                           { pointer global $00708A54 }
  CCIrrecoverable: ^Integer;                    { pointer global $00708BF4 }
  CAAttackerunit: ^Integer;                     { pointer global $00708534 }
  CADefenderunit: ^Integer;                     { pointer global $00709588 }
  CAattdamage: ^Integer;                        { pointer global $00708BEC }
  CAdefdamage: ^Integer;                        { pointer global $007081D0 }

procedure AddDamage(var dmg1: DamageT; const dmg2: DamageT); register;
begin
  Inc(dmg1.irrecoverable, dmg2.irrecoverable); { $005B1941 }
  Inc(dmg1.undead,        dmg2.undead);        { $005B1950 }
  Inc(dmg1.normal,        dmg2.normal);        { $005B1960 }
end;

procedure Combatheal(u, amount: Integer; overheal, isregen: Boolean); register;
var
  healable, normal, irrecfigures, i: Integer;
begin
  healable := BaseUnits[u].Totaldamage - BaseUnits[u].Irrecoverabledamage;
                                                     { $005B12A0..$005B12BA }
  if not overheal and (healable < amount) then
    amount := healable;                              { $005B12BD..$005B12CE }

  if CanHealNaturally(u) or isregen or overheal then { call $005B12D4 }
  begin
    normal := healable - BaseUnits[u].Undeaddamage;  { $005B12E8..$005B12FE }

    i := Min(normal, amount);                        { call $005B1307 }
    Dec(BaseUnits[u].Totaldamage, i);                { write $005B133C }
    Dec(amount, i);                                  { $005B1343..$005B1350 }

    i := Min(BaseUnits[u].Undeaddamage, amount);     { call $005B135D }
    Dec(BaseUnits[u].Totaldamage, i);                { write $005B1392 }
    Dec(amount, i);                                  { $005B1399..$005B13A6 }
    Dec(BaseUnits[u].Undeaddamage, i);               { write $005B13D3 }
  end;

  if overheal then                                   { false target $005B15B8: return }
  begin
    irrecfigures := Units[u].figures - LivingFigures(u); { call $005B13E7 }
    i := amount div LivingFigures(u);                { call $005B1427;
                                                       signed idiv $005B1431..$005B1434 }

    if BaseUnits[u].bonushp + i > 90 then            { false target $005B14B1:
                                                       add bonus HP }
      i := 90 - BaseUnits[u].bonushp;                { $005B1474..$005B14AE }
    Inc(BaseUnits[u].bonushp, i);                    { write $005B1522 }

    if not CanHealNaturally(u) then                  { call $005B152D;
                                                       false target $005B1577:
                                                       total-damage adjustment }
      Inc(BaseUnits[u].Irrecoverabledamage,
          i * irrecfigures);                         { write $005B1570 }
    Inc(BaseUnits[u].Totaldamage, i * irrecfigures); { write $005B15B1 }
  end;
end;

function LivingFigures(u: Integer): Integer; register;
begin
  Result := BaseUnits[u].figures -
            (BaseUnits[u].Totaldamage div HpPerFigure(u));
                                                     { call $005964C6;
                                                       signed idiv $005964D7..$005964DA }
end;

function TopFigureDamage(u: Integer): Integer; register;
begin
  Result := BaseUnits[u].Totaldamage -
            DeadFigures(u) * HpPerFigure(u);         { calls $0059658F, $00596599;
                                                       subtract $005965AB..$005965B4 }
end;

procedure Dealdamage(u, normal, undead: Integer; overland: Boolean;
  irrec: Integer); register;
var
  normaldamage: Integer;
begin
  { TD32 names overland, but the parameter is not read anywhere in this extent. }
  if DebugGod^ then                                  { false target $005B424D:
                                                       Buried/control gates }
  begin
    if Units[u].owner = 0 then                       { false target $005B4246:
                                                       assign normal := 100 }
    begin
      normal := 0;
      undead := 0;
      irrec := 0;                                    { $005B4235..$005B4241 }
    end
    else
      normal := 100;                                 { $005B4246 }
  end;

  if Units[u].EnchantmentFlags[EncBuried] or         { true target $005B4313:
                                                       merge all buckets }
     ((Units[u].EnchantmentFlags[EncConfusion] or    { true target $005B4309:
                                                       CCIrrecoverable test }
       Units[u].EnchantmentFlags[EncPossession] or   { true target $005B4309:
                                                       CCIrrecoverable test }
       Units[u].EnchantmentFlags[EncCreatureBinding]) and
      (CCIrrecoverable^ > 1)) then                   { false target $005B4337:
                                                       dead/damage gates }
  begin
    Inc(irrec, normal + undead);                     { $005B4313..$005B432A }
    normal := 0;
    undead := 0;                                     { $005B432D..$005B4334 }
  end;

  if not BaseUnits[u].dead and                       { true target $005B454F: return }
     (normal + undead + irrec > 0) then              { false target $005B454F: return }
  begin
    Inc(BaseUnits[u].Irrecoverabledamage, irrec);    { write $005B4393 }
    Inc(BaseUnits[u].Undeaddamage, undead);          { write $005B43C7 }
    Inc(BaseUnits[u].Totaldamage,
        irrec + undead + normal);                    { $005B43D1..$005B440F }

    if CAAttackerunit^ = u then                      { false target $005B444F:
                                                       defender accumulator }
      Inc(CAattdamage^,
          irrec + undead + normal);                  { $005B4422..$005B444D }
    if CADefenderunit^ = u then                      { false target $005B4488:
                                                       death threshold }
      Inc(CAdefdamage^,
          irrec + undead + normal);                  { $005B445B..$005B4486 }

    if HpPerFigure(u) * BaseUnits[u].figures <=
       BaseUnits[u].Totaldamage then                 { call $005B448B;
                                                       false target $005B454F }
    begin
      BaseUnits[u].dead := True;                     { write $005B44B5 }
      normaldamage := BaseUnits[u].Totaldamage -
                      BaseUnits[u].Irrecoverabledamage -
                      BaseUnits[u].Undeaddamage;      { $005B44BC..$005B44EC }

      if (BaseUnits[u].Irrecoverabledamage >= BaseUnits[u].Undeaddamage) and
         (BaseUnits[u].Irrecoverabledamage >= normaldamage) then
        BaseUnits[u].irrecoverable := True           { false targets $005B4520;
                                                       write $005B4517 }
      else if BaseUnits[u].Undeaddamage >= normaldamage then
        BaseUnits[u].undeaded := True;               { false target $005B4539;
                                                       write $005B4532 }

      if BaseUnits[u].combatsummoned then            { false target $005B454F: return }
        BaseUnits[u].irrecoverable := True;           { write $005B4548 }
    end;
  end;
end;

end.
