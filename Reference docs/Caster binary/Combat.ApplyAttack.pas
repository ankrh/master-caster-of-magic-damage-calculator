{==============================================================================
  Reconstructed procedure: @Combat@ApplyAttack

  Binary: Caster.exe — see README.md in this directory for path, md5 and size.
  VA:     $005B1970
  Extent: $0000194C bytes ($005B1970..$005B32BC)
  TD32 module: Combat

  This is reconstructed source, not recovered original source. R5.2a through
  R5.2c provide complete semantic coverage of the full TD32 extent. Claude
  reviewed all three extents against the binary on 2026-08-03 (R5.C): no
  semantic misreading.

  TD32 frame inventory (names and offsets are exact):
    [EBP-$00EC] aflags2
    [EBP-$00A0] aflags
    [EBP-$004C] enemyhpperfigure
    [EBP-$0048] topfdam
    [EBP-$0044] redper
    [EBP-$0040] supernaturaldam
    [EBP-$003C] dam3
    [EBP-$0038] dam2
    [EBP-$0034] TotalDamage
    [EBP-$002E] isbreath
    [EBP-$002D] isfire
    [EBP-$002C] islightning
    [EBP-$002B] missileranged
    [EBP-$002A] magicranged
    [EBP-$0029] fulldoom
    [EBP-$0028] attacks
    [EBP-$0024] todef
    [EBP-$0020] tohit
    [EBP-$001C] def
    [EBP-$0018] atk
    [EBP-$0014] j
    [EBP-$0010] i
    [EBP-$000C] at
    [EBP-$0008] du
    [EBP-$0004] au
    [EBP+$0008] Result
    [EBP+$000C] simul
    [EBP+$0010] counter
    [EBP+$0014] figs

  The compiler reuses unnamed frame slots for loop counters and temporary
  damage records. Descriptive aliases below remain visibly inferred.
==============================================================================}

unit Combat_ApplyAttack_Reconstructed;

interface

type
  inferred_AttackResultT = record
    field_00: Integer;
    field_04: Integer;
    field_08: Integer;
  end;

function ApplyAttack(au, du, at: Integer; figs: Integer;
  counter, simul: Boolean): inferred_AttackResultT; register;

implementation

const
  { [exact TD32 typed-constant names and values] }
  ATRanged = 1;
  ATmelee = 2;
  ATFirebreath = 3;
  ATLightningbreath = 4;
  ATThrown = 5;
  ATDoomGaze = 6;
  ATDeathGaze = 7;
  ATStoningGaze = 8;

  { [exact names and values; SharedConstants.pas] }
  EncMagic = 1;
  EncUndead = 5;
  EncSpellLock = 26;
  EncInvulnerability = 44;
  EncBlackSleep = 46;
  EncBloodLust = 48;
  SImmolation = 99;
  HABattlemage = 9;
  Maxmaxcombatenchantments = 100;
  CGDefender = 1;
  CGAttacker = 2;
  CGBlur = 3;

  { [inferred semantic aliases; exact numeric values] }
  inferred_NatureRealm = 1;
  inferred_ChaosRealm = 3;
  inferred_LifeRealm = 4;
  inferred_DeathRealm = 5;

type
  { [exact name and layout; Typedec.pas]
    The executable copies exactly $13 dwords = 76 bytes at every snapshot. }
  AttackFlagsT = record
    doom, illusion, supernatural, armorpiercing, mysticsurge: Boolean;
    lifesteal, poison, destruction, stoningtouch, deathtouch, exorcise: Boolean;
    lifestealvalue, poisonvalue, destructionvalue: Integer;
    stoningtouchvalue, deathtouchvalue, exorcisevalue: Integer;
    placeholder: array[1..10] of Integer;
  end;

  EnchFlagT = array[1..100] of Boolean;

  inferred_CombatGlobalsT =
    array[CGDefender..CGAttacker] of
      array[1..Maxmaxcombatenchantments] of Integer;

  { [exact names; inferred offset bindings]
    Only fields read by R5.2a-c are shown. Units and BaseUnits share this
    $0784-byte record and are distinguished by their executable displacement
    bases, $06426898 and $01AC1798 respectively. }
  unitT = record
    attack: Integer;                          { +$020, $005B1C09 }
    ranged: Integer;                          { +$024, $005B1A7A }
    rangedtype: Integer;                      { +$028, $005B1B56 }
    thrown: Integer;                          { +$02C, $005B1EE3 }
    firebreath: Integer;                      { +$030, $005B1E94 }
    lightningbreath: Integer;                 { +$034, $005B1E64 }
    deathgaze: Integer;                       { +$038, $005B2615 }
    stoninggaze: Integer;                     { +$03C, $005B2729 }
    doomgaze: Integer;                        { +$040, $005B1FC3 }
    hitchance: Integer;                       { +$04C, $005B1AD4 }
    defendchance: Integer;                    { +$050, $005B2956 }
    hitchancethrown: Integer;                 { +$054, $005B1F11 }
    hitchancebreath: Integer;                 { +$058, $005B1DBE }
    hitchancemelee: Integer;                  { +$05C, $005B1C37 }
    hitchanceranged: Integer;                 { +$060, $005B1AA8 }
    flying: Boolean;                          { +$0BC, $005B24B8 }
    teleporting: Boolean;                     { +$0BD, $005B2875 }
    merging: Boolean;                         { +$0C0, $005B28B5 }
    stoningimmunity: Boolean;                 { +$0C2, $005B267C }
    illusionimmunity: Boolean;                { +$0C4, $005B2FCF }
    magicimmunity: Boolean;                   { +$0C6, $005B259A }
    deathimmunity: Boolean;                   { +$0C7, $005B1D1C/$005B2568 }
    poisonimmunity: Boolean;                  { +$0C8, $005B2DF9 }
    immolation: Boolean;                      { +$0CD, $005B24FC }
    fear: Boolean;                            { +$0CE, $005B1CEA }
    Fantastic: Boolean;                       { +$0CF, $005B21AC }
    invisible: Boolean;                       { +$0D5, $005B2F85 }
    createundead: Boolean;                    { +$0D6, $005B318E }
    bloodsucker: Boolean;                     { +$0E1, $005B325D }
    ishero: Boolean;                          { +$0E2, $005B21F2 }
    attackflags: AttackFlagsT;                { +$3C8, $005B1A07 }
    meleeflags: AttackFlagsT;                 { +$414, $005B1C98 }
    rangedflags: AttackFlagsT;                { +$460, $005B1B09 }
    cox: Integer;                             { +$4E8, $005B2828 }
    coy: Integer;                             { +$4EC, $005B27FD }
    level: ShortInt;                          { +$4FD, $005B2309 }
    EnchantmentFlags: EnchFlagT;              { +$509, $005B19CA }
    owner: ShortInt;                          { +$699, $005B22B6/$005B25E6 }
    maxmp: SmallInt;                          { +$6A8, $005B2224 }
    mp: SmallInt;                             { +$6AA, $005B2340 }
    suppression: SmallInt;                    { +$6AC, $005B2472 }
    herotype: SmallInt;                       { +$6B0, $005B2273 }
  end;

var
  { [inferred aliases; exact array identity and bounds]
    Both are reached through the runtime data pointer at $00709188. }
  Units, BaseUnits: array[1..40000] of unitT;

  { [inferred names; exact pointer globals used by this routine] }
  inferred_PoisonSavePenalty: Integer;                    { $00709F84 }
  inferred_DoomDamagePercentage: Integer;                 { $00709948 }
  inferred_SupernaturalStarts: Integer;                   { $00709914 }
  inferred_SupernaturalRatio: Integer;                    { $00708CD4 }
  inferred_BlurDamageReduction: Integer;                  { $00708FC4 }
  inferred_InvisibilityDamageReduction: Integer;          { $007082AC }
  inferred_BlurInvisibilityTotalReduction: Integer;       { $00708A10 }
  inferred_InvulnerabilityDamageReduction: Integer;       { $0070808C }
  inferred_BloodsuckerDamage: Integer;                    { $00708740 }
  inferred_BloodsuckerHealing: Integer;                   { $00708F54 }
  inferred_CombatGlobals: inferred_CombatGlobalsT;         { runtime pointer $0070969C;
                                                              shared layout also declared in
                                                              Units.RecalculateUnits.pas;
                                                              $190 side stride, CGBlur +$08;
                                                              access $005B2F2E..$005B2F55 }

function ApplyAttack(au, du, at: Integer; figs: Integer;
  counter, simul: Boolean): inferred_AttackResultT; register;
var
  aflags, aflags2: AttackFlagsT;
  inferred_immolationDamage: inferred_AttackResultT;
  topfdam: Integer;
  fulldoom, magicranged, missileranged: Boolean;
  isfire, islightning, isbreath: Boolean;
  atk, tohit, def, todef, TotalDamage, attacks: Integer;
  enemyhpperfigure, dam2, dam3, supernaturaldam, redper: Integer;
  i, j: Integer;
  inferred_loopRemaining: Integer;
  inferred_riderLoopRemaining: Integer;
  inferred_wallState: Integer;
begin
  { [inferred bindings; exact control/data flow]
    R5.2a: $005B1970..$005B213D. }
  Result.field_00 := 0;                       { $005B1984..$005B198B }
  Result.field_04 := 0;                       { $005B198B..$005B1993 }
  Result.field_08 := 0;                       { $005B1993..$005B199B }
  topfdam := TopFigureDamage(du);              { call $005B199E }

  if Units[au].EnchantmentFlags[EncBlackSleep] then
    figs := 0;                                 { $005B19C4..$005B19D6;
                                                 false target $005B19D9 tests figs }
  if figs <= 0 then
    goto FinalizeResult_at_005B3216;           { $005B19D9..$005B19DD;
                                                 target totals the result fields }

  aflags := Units[au].attackflags;             { $13-dword copy, $005B19E3..$005B1A1B }
  fulldoom := False;                           { $005B1A1B }

  { `$005B1A22 83F808 cmp eax,8` followed by
    `$005B1A25 0F8789060000 ja $005B20B4` is unsigned: every signed value
    outside 0..8, including a negative one, reaches the invalid block. Value
    zero reaches the same block through jump-table entry zero. }
  case at of
    ATRanged:                                  { target $005B1A56 }
      begin
        atk := Units[au].ranged;
        tohit := Units[au].hitchanceranged + Units[au].hitchance;
        aflags2 := Units[au].rangedflags;
        Dec(tohit, RangedPenalty(au, du));      { call $005B1B23 }
        magicranged := Ismagicalranged(Units[au].rangedtype); { call $005B1B5D }
        missileranged := Ismissileranged(Units[au].rangedtype); { call $005B1B90 }
        isfire := False;
        islightning := aflags2.armorpiercing or
                       (Units[au].rangedtype = 30); { $005B1B9C..$005B1BD9;
                                                    true target $005B1BD7 }
        isbreath := False;
      end;

    ATmelee:                                   { target $005B1BE5 }
      begin
        atk := Units[au].attack;
        tohit := Units[au].hitchancemelee + Units[au].hitchance;
        aflags2 := Units[au].meleeflags;
        magicranged := False;
        missileranged := False;
        isfire := False;
        islightning := False;
        isbreath := False;
        j := figs;

        { The Death-Immunity read is deliberately from BaseUnits, not Units:
          `$005B1D1C ...+$01AC185F`, BaseUnits +$0C7. All three false exits
          target $005B1D8F, which copies j back to figs. }
        if Units[du].fear and
           not BaseUnits[au].deathimmunity and
           (j > 0) then
        begin
          inferred_loopRemaining := j;
          i := 1;
          repeat
            if ResistanceRoll(au, inferred_DeathRealm, -3, False,
                 Units[au].owner) > 0 then
              Dec(j);                          { call $005B1D73;
                                                 false target $005B1D87 }
            Inc(i);
            Dec(inferred_loopRemaining);
          until inferred_loopRemaining = 0;    { back edge $005B1D8D -> $005B1D37 }
        end;
        figs := j;                             { target $005B1D8F }
      end;

    ATFirebreath,
    ATLightningbreath:                         { shared target $005B1D9A }
      begin
        tohit := Units[au].hitchancebreath + Units[au].hitchance;
        aflags2 := Units[au].attackflags;
        if at = ATLightningbreath then
        begin
          aflags2.armorpiercing := True;
          atk := Units[au].lightningbreath;
        end
        else                                    { target $005B1E70: fire-breath arm }
          atk := Units[au].firebreath;
        magicranged := True;
        missileranged := False;
        isfire := at = ATFirebreath;
        islightning := at = ATLightningbreath;
        isbreath := True;
      end;

    ATThrown:                                  { target $005B1EBF }
      begin
        atk := Units[au].thrown;
        tohit := Units[au].hitchancethrown + Units[au].hitchance;
        aflags2 := Units[au].meleeflags;
        magicranged := False;
        missileranged := False;
        isfire := False;
        islightning := False;
        isbreath := False;
      end;

    ATDoomGaze:                                { target $005B1F9F }
      begin
        atk := Units[au].doomgaze;
        tohit := 100;
        aflags2 := Units[au].attackflags;
        aflags2.doom := True;
        fulldoom := True;
        magicranged := True;
        missileranged := False;
        isfire := False;
        islightning := False;
        isbreath := False;
      end;

    ATDeathGaze,
    ATStoningGaze:                             { shared target $005B2030 }
      begin
        atk := 0;
        tohit := Units[au].hitchance;
        aflags2 := Units[au].attackflags;
        magicranged := True;
        missileranged := False;
        isfire := False;
        islightning := False;
        isbreath := False;
      end;

  else                                         { target $005B20B4: at=0 or at outside 0..8 }
    begin
      atk := 0;
      tohit := Units[au].hitchance;
      aflags2 := Units[au].attackflags;
      magicranged := False;
      missileranged := False;
      isfire := False;
      islightning := False;
      isbreath := False;
      Rederror('Undefined attack type!');       { string $005B32A0; call $005B2138 }
    end;
  end;

  { [inferred bindings; exact control/data flow]
    R5.2b: $005B213D..$005B2994. }
  mergeflags(@aflags, @aflags2);                { call $005B2149 }

  if (at in [ATmelee, ATThrown]) and
     Units[au].EnchantmentFlags[EncBloodLust] and
     not Units[du].Fantastic then
    atk := atk * 2;                             { $005B214E..$005B21C4 }

  if not simul and
     Units[au].ishero and
     (Units[au].maxmp <> 0) and
     (at in [ATmelee, ATThrown, ATFirebreath, ATLightningbreath]) then
  begin
    { Owner and hero type are both BaseUnits reads. `$005B22B6
      0FBE9491311EAC01` reads BaseUnits +$699, not Units +$699. }
    BaseUnits[au].mp := BaseUnits[au].mp +
      HeroBonus(
        Units[au].level,
        HABattlemage,
        Wizards[BaseUnits[au].owner].Hero[BaseUnits[au].herotype, HABattlemage]);
                                                 { call $005B2316;
                                                   write $005B238C }
    if BaseUnits[au].mp > Units[au].maxmp then
      BaseUnits[au].mp := Units[au].maxmp;       { false target $005B2448;
                                                   write $005B2440 }
  end;

  if counter then
    Dec(tohit, BaseUnits[du].suppression * 5);   { $005B2448..$005B248E }

  if not counter and
     Units[du].flying and
     not canattackflier(au) and
     (at = ATmelee) then
    goto FinalizeResult_at_005B3216;             { $005B248E..$005B24D8 }

  if Units[au].immolation and (at = ATmelee) then
  begin
    inferred_immolationDamage := DamageSpell(
      du, SImmolation, inferred_SpellTable[SImmolation].Attack);
                                                 { call $005B2527; table $00708164 +$4770 }
    AddDamage(@Result, @inferred_immolationDamage); { call $005B2535 }
  end;

  if (at = ATDeathGaze) and
     not Units[du].deathimmunity and
     not Units[du].magicimmunity then
  begin
    inferred_loopRemaining := LivingFigures(du); { call $005B25AB }
    if inferred_loopRemaining > 0 then
    begin
      i := 1;
      repeat
        if ResistanceRoll(du, inferred_DeathRealm, Units[au].deathgaze,
             False, Units[au].owner) > 0 then    { call $005B2624 }
          Inc(Result.field_08, HpPerFigure(du)); { call $005B2630; write $005B2638;
                                                   false target $005B2642 }
        Inc(i);
        Dec(inferred_loopRemaining);
      until inferred_loopRemaining = 0;          { back edge $005B2648 -> $005B25C2 }
    end;
  end;

  if (at = ATStoningGaze) and
     not Units[du].stoningimmunity and
     not Units[du].magicimmunity then
  begin
    inferred_loopRemaining := LivingFigures(du); { call $005B26BF }
    if inferred_loopRemaining > 0 then
    begin
      i := 1;
      repeat
        if ResistanceRoll(du, inferred_NatureRealm, Units[au].stoninggaze,
             False, Units[au].owner) > 0 then    { call $005B2738 }
          Inc(Result.field_00, HpPerFigure(du)); { call $005B2744; write $005B274C;
                                                   false target $005B2755 }
        Inc(i);
        Dec(inferred_loopRemaining);
      until inferred_loopRemaining = 0;          { back edge $005B275B -> $005B26D6 }
    end;
  end;

  if Units[du].EnchantmentFlags[EncBlackSleep] then
  begin
    fulldoom := True;
    aflags.doom := True;
  end;                                          { false target $005B279A }

  if tohit < 10 then
    tohit := 10;                                 { false target $005B27A7 }

  def := 0;
  if HasWall and Insidewalls(du) and not Insidewalls(au) then
  begin
    inferred_wallState := GetWallState(BaseUnits[du].cox, BaseUnits[du].coy);
    def := inferred_CityWallDefBonus;            { global $00708620, $005B283E }
    if inferred_wallState = 2 then
      def := inferred_CityWallBrokenDefBonus;    { global $00707FB8, $005B284E }
    if Units[au].teleporting and simul and (at <> ATRanged) then
      def := inferred_CityWallBrokenDefBonus;    { $005B286F..$005B2891 }
    if Units[au].merging and simul and (at <> ATRanged) then
      def := inferred_CityWallBrokenDefBonus;    { $005B28AF..$005B28D1 }
  end;

  def := EffectiveDefense(
    du,
    @aflags,
    Units[au].EnchantmentFlags[EncMagic] or magicranged,
    def,
    0,
    missileranged,
    isbreath,
    islightning,
    isfire,
    at = ATRanged,
    magicranged);                               { call $005B292A; write $005B292F }

  todef := Units[du].defendchance;
  if aflags.mysticsurge then
    Dec(todef, inferred_MysticSurgeToDefPenalty); { global $00709434, $005B2970;
                                                     false target $005B297A }

  TotalDamage := 0;
  if figs <= 0 then
    goto PostAttackLoop_at_005B316A;             { $005B297F..$005B2984 }
  inferred_loopRemaining := figs;
  attacks := 1;

  { [inferred bindings; exact control/data flow]
    R5.2c: $005B2994..$005B32BC. The unsigned range idiom at
    $005B2994..$005B299D admits exactly attack types 6..8 and jumps to
    $005B2E6F, where the Doom/ordinary-damage fork begins. }
  repeat
    if not (at in [ATDoomGaze, ATDeathGaze, ATStoningGaze]) then
    begin
      if aflags.exorcise and
         not Units[du].magicimmunity and
         not Units[du].EnchantmentFlags[EncSpellLock] and
         Units[du].Fantastic then
      begin
        i := aflags.exorcisevalue;
        if Units[du].EnchantmentFlags[EncUndead] then
          Dec(i, 3);                              { false target $005B2A85 }
        if ResistanceRoll(du, inferred_LifeRealm, i, False,
             Units[au].owner) > 0 then            { call $005B2ABF }
          Inc(Result.field_00, HpPerFigure(du));  { call $005B2ACB; write $005B2AD3;
                                                    false target $005B2ADC }
      end;

      if aflags.stoningtouch and
         not Units[du].magicimmunity and
         not Units[du].stoningimmunity and
         (ResistanceRoll(du, inferred_NatureRealm, aflags.stoningtouchvalue,
            False, Units[au].owner) > 0) then     { call $005B2B86 }
        Inc(Result.field_00, HpPerFigure(du));    { call $005B2B92; write $005B2B9A;
                                                    false target $005B2BA3 }

      if aflags.deathtouch and
         not Units[du].magicimmunity and
         not Units[du].deathimmunity and
         (ResistanceRoll(du, inferred_DeathRealm, aflags.deathtouchvalue,
            False, Units[au].owner) > 0) then     { call $005B2C4D }
        Inc(Result.field_08, HpPerFigure(du));    { call $005B2C59; write $005B2C61;
                                                    false target $005B2C6B }

      if aflags.lifesteal and
         not Units[du].magicimmunity and
         not Units[du].deathimmunity then
      begin
        i := ResistanceRoll(du, inferred_DeathRealm, aflags.lifestealvalue,
               False, Units[au].owner);           { call $005B2D15 }
        Inc(Result.field_04, i);                   { write $005B2D23 }
        if not simul then
          Combatheal(au, i, True, False);          { call $005B2D3D;
                                                      false target $005B2D42 }
      end;

      if aflags.destruction and
         not Units[du].magicimmunity and
         (ResistanceRoll(du, inferred_ChaosRealm, aflags.destructionvalue,
            False, Units[au].owner) > 0) then     { call $005B2DB6 }
        Result.field_00 := 150;                    { assignment $005B2DC2;
                                                    false target $005B2DC8 }

      if aflags.poison and
         not Units[du].poisonimmunity and
         (aflags.poisonvalue > 0) then
      begin
        inferred_riderLoopRemaining := aflags.poisonvalue;
        i := 1;
        repeat
          if ResistanceRoll(du, 0, inferred_PoisonSavePenalty,
               False, Units[au].owner) > 0 then   { call $005B2E53 }
            Inc(TotalDamage);                      { write $005B2E5C;
                                                    false target $005B2E67 }
          Inc(i);
          Dec(inferred_riderLoopRemaining);
        until inferred_riderLoopRemaining = 0;    { back edge $005B2E6D -> $005B2E17 }
      end;
    end;

    if aflags.doom then                            { false target $005B2EC5 }
    begin
      dam2 := 0;
      if not fulldoom then
        Inc(TotalDamage, inferred_DoomDamagePercentage * atk div 100)
                                                   { full idiv idiom $005B2E83..$005B2E9C }
      else                                         { target $005B2EAF }
        Inc(TotalDamage, atk);
    end
    else
    begin
      dam3 := AttackRoll(atk, tohit);              { call $005B2ECB }
      dam2 := dam3;
      supernaturaldam := Round(
        (dam3 - inferred_SupernaturalStarts) *
        inferred_SupernaturalRatio / 100.0);       { fild/fdiv/Round
                                                    $005B2ED9..$005B2F1E;
                                                    @System@@ROUND at $005B2F0B is
                                                    banker's rounding: ties to even;
                                                    Single 100.0 at $005B32B8: 0000C842 }

      redper := 0;
      i := CGADEnemy;                              { call $005B2F26; side opposite the
                                                     current combat-turn side, not a
                                                     direct Units[du] owner lookup }
      if inferred_CombatGlobals[i][CGBlur] > 0 then
        redper := inferred_BlurDamageReduction;    { false target $005B2F61 }
      if Units[du].invisible then
      begin
        if redper = 0 then
          redper := inferred_InvisibilityDamageReduction
        else                                       { target $005B2FA1 }
          redper := inferred_BlurInvisibilityTotalReduction;
      end;                                         { join $005B2FAB }

      if (redper > 0) and
         not Units[au].illusionimmunity and
         (dam3 > 0) then
      begin
        inferred_riderLoopRemaining := dam3;
        i := 1;
        repeat
          if Random(100) < redper then             { call $005B2FF5 }
            Dec(dam2);                             { false target $005B300A }
          Inc(i);
          Dec(inferred_riderLoopRemaining);
        until inferred_riderLoopRemaining = 0;     { back edge $005B3010 -> $005B2FF0 }
      end;

      Dec(dam2, DefenseRoll(def, todef));          { call $005B3018; write $005B301D }
      if Units[du].EnchantmentFlags[EncInvulnerability] then
        Dec(dam2, inferred_InvulnerabilityDamageReduction);
                                                   { false target $005B3066 }
      if dam2 < 0 then
        dam2 := 0;                                 { false target $005B3071 }
      if aflags.supernatural and
         (def < 80) and
         (dam2 < supernaturaldam) then
        dam2 := supernaturaldam;                   { three false targets $005B308E }
    end;

    enemyhpperfigure := HpPerFigure(du);           { call $005B3091 }
    while dam2 + topfdam > enemyhpperfigure do     { back edge $005B3145 -> $005B309E }
    begin
      TotalDamage := TotalDamage + enemyhpperfigure - topfdam;
      dam2 := dam2 - enemyhpperfigure + topfdam - DefenseRoll(def, todef);
                                                   { call $005B30BE; write $005B30E3 }
      if Units[du].EnchantmentFlags[EncInvulnerability] then
        Dec(dam2, inferred_InvulnerabilityDamageReduction);
                                                   { false target $005B3125 }
      if dam2 < 0 then
        dam2 := 0;                                 { false target $005B3130 }
      topfdam := 0;
    end;
    Inc(TotalDamage, dam2);
    topfdam := dam2;
    Inc(attacks);
    Dec(inferred_loopRemaining);
  until inferred_loopRemaining = 0;               { back edge $005B3164 -> $005B2994 }

PostAttackLoop_at_005B316A:
  if Units[au].createundead and
     not Units[du].magicimmunity and
     not Units[du].deathimmunity then
    Inc(Result.field_04, TotalDamage)              { write $005B31FA }
  else                                             { target $005B3206 }
    Inc(Result.field_08, TotalDamage);             { write $005B320C }

FinalizeResult_at_005B3216:
  if (Result.field_08 + Result.field_04 + Result.field_00 > 0) and
     Units[au].bloodsucker then
  begin
    Inc(Result.field_08, inferred_BloodsuckerDamage); { write $005B3271 }
    if not simul then
      Combatheal(au, inferred_BloodsuckerHealing, False, True);
                                                   { call $005B3290;
                                                     false target $005B3295 }
  end;
end;

end.
