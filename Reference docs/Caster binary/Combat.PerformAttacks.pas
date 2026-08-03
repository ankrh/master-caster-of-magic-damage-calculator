{==============================================================================
  Reconstructed procedures:
    @Combat@PerformRangedAttack  $005B3338..$005B35A2
    @Combat@PerformMeleeAttack   $005B35A4..$005B3ECB

  Binary: Caster.exe — see README.md in this directory for identity.
  TD32 module: Combat

  This is reconstructed source, not recovered original source. R5.2d provides
  complete semantic coverage of both TD32 extents. Names beginning `inferred_`
  and record-field/result-field bindings are reconstructed aliases. Claude
  reviewed both extents against the binary on 2026-08-03 (R5.C): no semantic
  misreading.
==============================================================================}

unit Combat_PerformAttacks_Reconstructed;

interface

procedure PerformRangedAttack(au, du: Integer); register;
procedure PerformMeleeAttack(au, du: Integer); register;

implementation

type
  inferred_AttackResultT = record
    irrecoverable: Integer;                    { +$00 }
    undead: Integer;                           { +$04 }
    normal: Integer;                           { +$08 }
  end;

const
  ATRanged = 1;
  ATmelee = 2;
  ATFirebreath = 3;
  ATLightningbreath = 4;
  ATThrown = 5;
  ATDoomGaze = 6;
  ATDeathGaze = 7;
  ATStoningGaze = 8;
  EncHaste = 15;

type
  inferred_unitT = record
    rangedtype: Integer;                       { +$028 }
    thrown: Integer;                           { +$02C }
    firebreath: Integer;                       { +$030 }
    lightningbreath: Integer;                  { +$034 }
    deathgaze: Integer;                        { +$038 }
    stoninggaze: Integer;                      { +$03C }
    doomgaze: Integer;                         { +$040 }
    ammo: Integer;                             { +$048 }
    negatefirststrike: Boolean;                { +$0DD }
    firststrike: Boolean;                      { +$0DE }
    cox: Integer;                              { +$4E8 }
    coy: Integer;                              { +$4EC }
    combatmaxmoves: SmallInt;                  { +$4F8 }
    combatmovesleft: SmallInt;                 { +$4FA }
    EnchantmentFlags: array[1..100] of Boolean; { +$509 }
    owner: ShortInt;                           { +$699 }
    combatattacksdone: ShortInt;               { +$69A }
    dead: Boolean;                             { +$69E }
    suppression: SmallInt;                     { +$6AC }
  end;

  inferred_CombatStateT = record
    field_44E8: Integer;                       { named by accessor $00643134 }
  end;

var
  Units, BaseUnits: array[1..40000] of inferred_unitT;
  inferred_CAAttackerUnit: ^Integer;           { pointer global $00708534;
                                                  accessor at $0064692C }
  inferred_CAattdamage: ^Integer;              { pointer global $00708BEC;
                                                  accessor at $00646954 }
  inferred_CAdefdamage: ^Integer;              { pointer global $007081D0;
                                                  accessor at $00646968 }
  inferred_FirstStrikeCap: ^Integer;           { pointer global $00708E58;
                                                  `FirstStrikeCap` key $0063A0D8 }
  inferred_CombatDefenderOwner: ^Integer;      { pointer global $0070A22C }
  inferred_CombatState: ^inferred_CombatStateT; { pointer global $0070969C }

procedure PerformRangedAttack(au, du: Integer); register;
var
  dam: inferred_AttackResultT;                 { exact TD32 local [EBP-$20] }
  i, j: Integer;                               { exact TD32 names -$0C/-$10 }
  inferred_remaining: Integer;                 { unnamed [EBP-$14] }
begin
  { [inferred aliases; exact control/data flow]
    False target $005B33AF initializes the attack-repeat count. }
  if CrushWall(inferred_CAAttackerUnit^) then   { call $005B334B; je $005B3352 }
    destroywall(BaseUnits[du].cox, BaseUnits[du].coy); { call $005B33AA }

  j := 1;                                      { $005B33AF }
  if Units[au].EnchantmentFlags[EncHaste] then
    j := 2;                                    { $005B33E2 -> false target $005B33EB }

  if j > 0 then                                { false target $005B3535 finalizes action }
  begin
    inferred_remaining := j;
    i := 1;
    repeat
      if BaseUnits[au].ammo > 0 then            { $005B342C -> false target $005B3529
                                                  advances loop }
      begin
        dam := ApplyAttack(au, du, ATRanged, LivingFigures(au), False, False);
                                               { calls $005B3435, $005B344E }
        Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B3462 }
        Inc(BaseUnits[du].suppression);         { write $005B348B }
        Dec(BaseUnits[au].ammo);                { write $005B34BF }
        if BaseUnits[au].ammo <= 0 then         { $005B34FA -> false target $005B3529
                                                  advances loop }
          Units[au].rangedtype := 0;            { write $005B3522 }
      end;
      Inc(i);
      Dec(inferred_remaining);
    until inferred_remaining = 0;              { back target $005B3400 tests ammo }
  end;

  BaseUnits[au].combatmovesleft := 0;           { write $005B3559 }
  BaseUnits[au].combatattacksdone := 2;         { write $005B3587 }
  RecalculateUnits(True, -1, -1, -1);           { call $005B3599 }
end;

procedure PerformMeleeAttack(au, du: Integer); register;
var
  dam, dam2, dam3: inferred_AttackResultT;      { exact TD32 locals -$24/-$30/-$3C }
  i, j: Integer;                               { exact TD32 names -$0C/-$10 }
  inferred_auCalculated: ^inferred_unitT;       { unnamed [EBP-$14] }
  inferred_remaining: Integer;                 { unnamed [EBP-$18] }
begin
  inferred_CAattdamage^ := 0;                  { writes $005B35B1..$005B35B8 }
  inferred_CAdefdamage^ := 0;                  { writes $005B35BA..$005B35C1 }

  { All four failed Wall-of-Fire predicates target $005B36CC, which starts
    the independent CrushWall block: jumps $005B3620, $005B3683,
    $005B368C and $005B36C2. The unnamed callee is scoped under R5.2h. }
  if unnamed_005B3ECC(BaseUnits[du].cox, BaseUnits[du].coy) then
    if not unnamed_005B3ECC(BaseUnits[au].cox, BaseUnits[au].coy) then
      if HasWallOfFire then
        if Units[au].owner <> inferred_CombatDefenderOwner^ then
          FirewallEffect(au);                  { calls $005B3619, $005B367C,
                                                  $005B3685, $005B36C7 }

  if CrushWall(au) then                         { false target $005B3733 caches Units[au] }
    destroywall(BaseUnits[du].cox, BaseUnits[du].coy);
                                               { calls $005B36CF, $005B372E }

  inferred_auCalculated := @Units[au];          { $005B3757..$005B375E }
  j := 1;
  if inferred_auCalculated^.EnchantmentFlags[EncHaste] then
    j := 2;                                    { $005B3772 -> false target $005B377B:
                                                  Stoning Gaze }

  { Attacker Stoning Gaze; its two exits target $005B37D2, Death Gaze. }
  if (inferred_auCalculated^.stoninggaze <> 100) and (j > 0) then
  begin                                        { jumps $005B3782, $005B3789 }
    inferred_remaining := j;
    i := 1;
    repeat
      dam := ApplyAttack(au, du, ATStoningGaze, LivingFigures(au), False, False);
                                               { calls $005B3798, $005B37B1 }
      Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B37C5 }
      Inc(i);
      Dec(inferred_remaining);
    until inferred_remaining = 0;              { back target $005B3795 starts next pass }
  end;

  { Attacker Death Gaze; its two exits target $005B3829, Doom Gaze. }
  if (inferred_auCalculated^.deathgaze <> 100) and (j > 0) then
  begin                                        { jumps $005B37D9, $005B37E0 }
    inferred_remaining := j;
    i := 1;
    repeat
      dam := ApplyAttack(au, du, ATDeathGaze, LivingFigures(au), False, False);
                                               { calls $005B37EF, $005B3808 }
      Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B381C }
      Inc(i);
      Dec(inferred_remaining);
    until inferred_remaining = 0;              { back target $005B37EC starts next pass }
  end;

  { Attacker Doom Gaze; its two exits target $005B3879, defender gazes.
    Doom passes literal one figure, and Haste repeats the entire call. }
  if (inferred_auCalculated^.doomgaze > 0) and (j > 0) then
  begin                                        { jumps $005B3830, $005B3837 }
    inferred_remaining := j;
    i := 1;
    repeat
      dam := ApplyAttack(au, du, ATDoomGaze, 1, False, False); { call $005B3858 }
      Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B386C }
      Inc(i);
      Dec(inferred_remaining);
    until inferred_remaining = 0;              { back target $005B3843 starts next pass }
  end;

  { Defender retaliation gazes are each single calls, outside the Haste loops. }
  if Units[du].stoninggaze <> 100 then           { $005B38A5 -> false target $005B38DC:
                                                  Death Gaze }
  begin
    dam := ApplyAttack(du, au, ATStoningGaze, LivingFigures(du), False, False);
                                               { calls $005B38AA, $005B38C3 }
    Dealdamage(au, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B38D7 }
  end;
  if Units[du].deathgaze <> 100 then             { $005B3908 -> false target $005B393F:
                                                  Doom Gaze }
  begin
    dam := ApplyAttack(du, au, ATDeathGaze, LivingFigures(du), False, False);
                                               { calls $005B390D, $005B3926 }
    Dealdamage(au, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B393A }
  end;
  if Units[du].doomgaze > 0 then                 { $005B396B -> false target $005B399B:
                                                  Lightning Breath }
  begin
    dam := ApplyAttack(du, au, ATDoomGaze, 1, False, False); { call $005B3982 }
    Dealdamage(au, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B3996 }
  end;

  { Attacker Lightning Breath; exits target $005B39F2, Fire Breath. }
  if (inferred_auCalculated^.lightningbreath > 0) and (j > 0) then
  begin                                        { jumps $005B39A2, $005B39A9 }
    inferred_remaining := j;
    i := 1;
    repeat
      dam := ApplyAttack(au, du, ATLightningbreath, LivingFigures(au), False, False);
                                               { calls $005B39B8, $005B39D1 }
      Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B39E5 }
      Inc(i);
      Dec(inferred_remaining);
    until inferred_remaining = 0;              { back target $005B39B5 starts next pass }
  end;

  { Attacker Fire Breath; exits target $005B3A49, Thrown. }
  if (inferred_auCalculated^.firebreath > 0) and (j > 0) then
  begin                                        { jumps $005B39F9, $005B3A00 }
    inferred_remaining := j;
    i := 1;
    repeat
      dam := ApplyAttack(au, du, ATFirebreath, LivingFigures(au), False, False);
                                               { calls $005B3A0F, $005B3A28 }
      Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B3A3C }
      Inc(i);
      Dec(inferred_remaining);
    until inferred_remaining = 0;              { back target $005B3A0C starts next pass }
  end;

  { Attacker Thrown; exits target $005B3AA0, First Strike. }
  if (inferred_auCalculated^.thrown > 0) and (j > 0) then
  begin                                        { jumps $005B3A50, $005B3A57 }
    inferred_remaining := j;
    i := 1;
    repeat
      dam := ApplyAttack(au, du, ATThrown, LivingFigures(au), False, False);
                                               { calls $005B3A66, $005B3A7F }
      Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B3A93 }
      Inc(i);
      Dec(inferred_remaining);
    until inferred_remaining = 0;              { back target $005B3A63 starts next pass }
  end;

  { Every failed First Strike predicate targets $005B3B48, which computes the
    unresolved main strike: absent $005B3AAA, negated $005B3ADC, or remaining
    top-figure HP greater than FirstStrikeCap $005B3B00. }
  if inferred_auCalculated^.firststrike and
     not Units[du].negatefirststrike and
     (HpPerFigure(du) - TopFigureDamage(du) <= inferred_FirstStrikeCap^) then
  begin                                        { calls $005B3AE1, $005B3AEB }
    dam := ApplyAttack(au, du, ATmelee, LivingFigures(au), False, False);
                                               { calls $005B3B05, $005B3B1E }
    Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable);
                                               { call $005B3B32 }
    dam.normal := 0;
    dam.undead := 0;
    dam.irrecoverable := 0;                    { writes $005B3B37..$005B3B43 }
  end
  else
    dam := ApplyAttack(au, du, ATmelee, LivingFigures(au), False, False);
                                               { calls $005B3B4B, $005B3B64 }

  if j > 1 then                                { false target $005B3B90: counterattack }
    dam3 := ApplyAttack(au, du, ATmelee, LivingFigures(au), False, False);
                                               { calls $005B3B72, $005B3B8B }

  dam2 := ApplyAttack(du, au, ATmelee, LivingFigures(du), True, False);
                                               { calls $005B3B93, $005B3BAC }

  { `dam2` and `dam3` are computed before any slot is dealt. `dam` is not
    uniformly a computed result: on the admitted First Strike path above,
    $005B3B46 skips the else branch, so `dam` is the zero placeholder its own
    damage was already dealt from, and the first Dealdamage below is a no-op. }
  Dealdamage(du, dam.normal, dam.undead, False, dam.irrecoverable); { $005B3BC0 }
  Dealdamage(au, dam2.normal, dam2.undead, False, dam2.irrecoverable); { $005B3BD4 }
  if j > 1 then                                { false target $005B3BF3: action costs }
    Dealdamage(du, dam3.normal, dam3.undead, False, dam3.irrecoverable); { $005B3BEE }

  Inc(BaseUnits[au].combatattacksdone);         { write $005B3C17 }

  { Full signed `div 2`: `$005B3C7F D1FA sar`, `$005B3C81 7903 jns
    $005B3C86`, whose target subtracts the quotient, and `$005B3C83 83D200
    adc edx,0` corrects negative odd inputs toward zero. }
  BaseUnits[au].combatmovesleft :=
    BaseUnits[au].combatmovesleft - (Units[au].combatmaxmoves div 2);
                                               { write $005B3CCA }

  { Full signed `mod 2`: `$005B3CFE 2501000080`, `$005B3D03 7905 jns
    $005B3D0A`, whose target stores `i`, then the negative correction
    `$005B3D05 48`, `$005B3D06 83C8FE`, `$005B3D09 40`. }
  i := Units[au].combatmaxmoves mod 2;
  if BaseUnits[au].combatattacksdone > 1 then   { $005B3D39 -> false target $005B3DB4:
                                                  clamp }
    BaseUnits[au].combatmovesleft := BaseUnits[au].combatmovesleft - i;
                                               { write $005B3DAC }

  if BaseUnits[au].combatmovesleft < 0 then
    BaseUnits[au].combatmovesleft := 0;         { $005B3DE1 -> false target $005B3E11:
                                                  suppression;
                                                  write $005B3E07 }

  Inc(BaseUnits[du].suppression);               { write $005B3E35 }
  RecalculateUnits(True, -1, -1, -1);           { call $005B3E4F }

  if not BaseUnits[au].dead and                 { $005B3E80 -> nonzero target $005B3EC6
                                                  epilogue }
     (Units[au].owner = 0) then                 { $005B3EAE -> nonzero target $005B3EC6
                                                  epilogue }
    CombatGetMoveMatrix(inferred_CombatState^.field_44E8, -1, -1);
                                               { call $005B3EC1; field is accessor
                                                 `CombatSelectedUnit` at $00643134 }
end;

end.
