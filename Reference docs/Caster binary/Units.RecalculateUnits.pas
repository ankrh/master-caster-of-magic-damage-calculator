{==============================================================================
  Reconstructed procedure: @Units@RecalculateUnits

  Binary: Caster.exe — see README.md in this directory for path, md5 and size.
  VA:     $00599920
  Extent: $0000E150 bytes ($00599920..$005A7A70)
  TD32 module: Units

  This is reconstructed source, not recovered original source.

  TD32 frame inventory (names and offsets are exact):
    [EBP-$2714C] prevmaxmoves
    [EBP-$0050]  $161756148
    [EBP-$004C]  $161756112
    [EBP-$0048]  $161756076
    [EBP-$0044]  $161674140
    [EBP-$003C]  $161560768
    [EBP-$0038]  $161560280
    [EBP-$0034]  $161560016
    [EBP-$0030]  $161530336
    [EBP-$002C]  $161477980
    [EBP-$0028]  $161468288
    [EBP-$0020]  ownCG
    [EBP-$001C]  n
    [EBP-$0018]  k
    [EBP-$0014]  j
    [EBP-$0010]  i
    [EBP-$000C]  tax
    [EBP-$0008]  tap
    [EBP-$0001]  com
    [EBP+$0008]  tay

  The numbered `$...` compiler temporaries remain listed rather than renamed.
  [EBP-$0028] holds the current unit record's base address in the region-a
  enchantment merger. R5.1c-a additionally identifies [EBP-$0048] as the
  first-loop tail's Units pointer, [EBP-$004C] as the current aura-entry
  pointer and [EBP-$0050] as the cached Units pointer used by the aura switch.
  The remaining numbered slots are first used in later blocks.

  Two frame slots carry no TD32 entry:
    [EBP-$0024]  Maxunits, copied from the loop bound at $00599973
    [EBP-$0004]  the incoming EAX, spilled by the prologue at $00599923

  Field names below are taken from the shipped `unitT` and `CityT` in
  `Script source/CAS reference/Typedec.pas`, so they are original names rather
  than reconstruction aliases. What is inferred is the *binding* of a name to a
  byte offset; each field therefore carries the offset it was read at.
==============================================================================}

unit Units_RecalculateUnits_Reconstructed;

interface

{ [exact names; inferred types]
  Delphi register convention at $0059993F..$00599945:
    AL  = com
    EDX = tap
    ECX = tax
    [EBP+$08] = tay
}
procedure RecalculateUnits(com: Boolean; tap, tax, tay: Integer); register;
procedure ApplyLevelBonus(i: Integer); register;
procedure RecalculateunitsonCityTile(c: Integer); register;
procedure BuildAuraTable; register;
procedure AddtoAuraTable(uid, at, val, ow: Integer); register;
function HeroBonus(level, ability, ablevel: Integer): Integer; register;
function Ismagicalranged(rt: Integer): Boolean; register;
function unitonoverlandtile(u, checkplane, checkx, checky: Integer): Boolean; register;
function Immobile(t: Integer): Boolean; register;
function TotalHpLeft(u: Integer): Integer; register;
function HpPerFigure(u: Integer): Integer; register;
function Iscombat: Boolean; register;
function Min(i, j: Integer): Integer; register;
{ [inferred name]
  TD32 calls this @Castercore@RecalculateUnits — unit Castercore, procedure
  RecalculateUnits. One file is one Pascal unit, so its original name would
  collide with @Units@RecalculateUnits above; the flattened name below is the
  reconstruction's, not the binary's. }
procedure inferred_Castercore_RecalculateUnits(com: Boolean; tap, tax, tay: Integer); register;

implementation

const
  { [exact names and values; Typedec.pas / SharedConstants.pas] }
  Maxunitslots = 39999;
  MaxMaxherotypes = 85;
  maxmaxheroability = 50;
  Maxmaxcombatenchantments = 100;

  { [exact name; value read from the executable]
    `Typedec.pas` declares EnchFlagT = array[1..maxmaxenchantmentflag] but the
    constant itself ships in no reference file. The merger's range check at
    $00599B95 (`cmp eax, $63`) and its loop bound at $00599C23 (`cmp j, $65`)
    both give 100. }
  maxmaxenchantmentflag = 100;

  { [exact name; value read from the executable]
    Same situation: `Typedec.pas` declares `Cities : array[1..maxCityslots]`
    but ships no value. The three range checks in RecalculateunitsonCityTile
    (`dec; cmp $3E7` at $005A8C77, $005A8CA4 and $005A8CD0) give 1000. }
  maxCityslots = 1000;

  { [inferred names; exact values] }
  inferred_UnitRecordDwords = $01E1;
  inferred_UnitGolem = 81;

  { [exact names and values; SharedConstants.pas *Races*, lines 941-961]
    Race doubles as the magic realm for summoned units, which is why the
    Supreme Light eligibility test at $005A7114 compares race with $13. }
  RCChaos = 18;
  RCLife = 19;

  { [exact names and values; SharedConstants.pas for the two sides,
    MASTER.CAS *Combat global enchantment IDs* for the members]
    Members are recovered from their displacement, not guessed: with the side
    stride $190 established below, the element index behind a displacement
    -$N is (($190 - $N) div 4) + 1. Every displacement the reconstruction
    touches resolves to a named MASTER.CAS constant, with none left over. }
  CGDefender = 1;
  CGAttacker = 2;

  CGEntangle = 2;                                { -$18C }
  CGMassInvisibility = 4;                        { -$184 }
  CGBlazingMarch = 6;                            { -$17C }
  CGWarpReality = 7;                             { -$178 }
  CGPrayer = 8;                                  { -$174 }
  CGSupremeLight = 9;                            { -$170 }
  CGHighPrayer = 10;                             { -$16C }
  CGDarkness = 11;                               { -$168 }
  CGTerror = 13;                                 { -$160 }
  CGBlackPrayer = 15;                            { -$158 }
  CGBreakthrough = 16;                           { -$154 }

  { [exact typed-constant names and values] }
  EncMagic = 1;
  EncStasisCombat = 9;
  EncConfusion = 12;
  EncResistElements = 16;
  EncCCBreath = 33;
  EncBlackSleep = 46;
  EncPossession = 52;
  EncCreatureBinding = 53;
  EncSupremeLightRegen = 54;
  EncMisfortune = 58;
  EncBuried = 60;
  EncFrozen = 61;

  HADivineBarrier = 4;
  HAGuidingBeacon = 5;
  HASoulLinker = 6;
  HASupplyCommander = 7;
  HALogistics = 8;
  HAArmsmaster = 12;
  HALeadership = 16;
  HAPrayermaster = 21;

  { [inferred semantic aliases; exact values passed as aura kind] }
  inferred_AuraHolyBonus = 1;
  inferred_AuraGuidingBeacon = 2;
  inferred_AuraPrayermaster = 3;
  inferred_AuraDivineBarrier = 4;
  inferred_AuraSoulLinker = 5;
  inferred_AuraSupplyCommander = 6;
  inferred_AuraLogistics = 7;
  inferred_AuraArmsmaster = 8;
  inferred_AuraLeadership = 9;
  inferred_AuraMisfortune = 10;

type
  { [inferred name; exact element type and bound]
    Every inline level-table access in @Units@ApplyLevelBonus checks
    `level - 1 <= $13` before indexing a pointer-loaded Integer array. }
  inferred_LevelBonusT = array[1..20] of Integer;
  Pinferred_LevelBonusT = ^inferred_LevelBonusT;

  { [exact name; bound read from the executable] }
  EnchFlagT = array[1..maxmaxenchantmentflag] of Boolean;

  { [exact names/operands; inferred bindings]
    Only fields touched by the reconstructed blocks are declared. The real
    record is $01E1 dwords / 1,924 bytes and its base within the runtime data
    block is $6426898 for Units, $1AC1798 for BaseUnits; every offset below was
    read as `displacement - base` at the cited instruction.

    Names come from `Typedec.pas` and offsets from the executable, so both are
    exact — but *pairing* them is an inference, resting on the layout match
    argued in `CoM2 binary analysis.md`. It is well supported here: the offsets
    below reproduce Typedec's declaration order and its adjacencies exactly
    (dead..incombat four bytes apart; owner, combatattacksdone, pad,
    PandoraBoxBudget consecutive). That is evidence, not a direct read.

    The four flag arrays are contiguous and each is exactly 100 bytes, which is
    what makes the merger's shape legible: element j of the first lands at
    +$508 + j, so the arrays span +$509..+$56C, +$56D..+$5D0, +$5D1..+$634 and
    +$635..+$698, and `owner` follows immediately at +$699. }
  unitT = record
    attack: Integer;                           { +$020, $005A67C4 }
    ranged: Integer;                           { +$024, $005A67D5 }
    rangedtype: Integer;                       { +$028, $005A6F64 }
    thrown: Integer;                           { +$02C, $005A67E6 }
    firebreath: Integer;                        { +$030, $00599F3E }
    lightningbreath: Integer;                   { +$034, $005A6808 }
    deathgaze: Integer;                         { +$038, absent from ApplyLevelBonus }
    stoninggaze: Integer;                       { +$03C, absent from ApplyLevelBonus }
    doomgaze: Integer;                          { +$040, absent from ApplyLevelBonus }
    maxammo: Integer;                           { +$044, $005A6D28 }
    hitchance: Integer;                         { +$04C, $005A660D }
    defendchance: Integer;                      { +$050, $005A6D12 }
    hitchancethrown: Integer;                   { +$054, $005A6693 }
    hitchancebreath: Integer;                   { +$058, $005A66C3 }
    hitchancemelee: Integer;                    { +$05C, $005A6663 }
    hitchanceranged: Integer;                   { +$060, $005A6633 }
    defense: Integer;                           { +$064, $005A67B3 }
    resistance: Integer;                        { +$068, $005A6A68 }
    race: Integer;                              { +$07C, $00599F71 }
    hp: Integer;                                { +$080, $00595DDD }
    figures: Integer;                           { +$088, $0059538A }
    Fantastic: Boolean;                         { +$0CF, $00599FA0 }
    invisible: Boolean;                         { +$0D5, $005A769C }
    ishero: Boolean;                            { +$0E2, $005978E3 }
    ResistToAll: ShortInt;                      { +$3C4, $0059784F }
    HolyBonus: ShortInt;                        { +$3C5, $0059774E }
    overlandx: Integer;                         { +$4AC, $00599A49 }
    overlandy: Integer;                         { +$4B0, $00599A7D }
    otherplanex: Integer;                       { +$4B4, $005D8CE3 }
    otherplaney: Integer;                       { +$4B8, $005D8CEB }
    plane: Integer;                             { +$4DC, $00599A15 }
    combatmaxmoves: SmallInt;                   { +$4F8, $00599AB1 }
    combatmovesleft: SmallInt;                  { +$4FA, $005A75CD }
    level: ShortInt;                            { +$4FD, $005979E2 }
    Totaldamage: SmallInt;                      { +$500, $005953BD }
    Overdamage: SmallInt;                       { +$506, $005A7789 }
    EnchantmentFlags: EnchFlagT;                { +$509, $00599BA3 }
    OverlandEnchantmentFlags: EnchFlagT;        { +$56D, $00599BF7 }
    CombatEnchantmentFlags: EnchFlagT;          { +$5D1, $00599BDB }
    ItemEnchantmentFlags: EnchFlagT;            { +$635, $00599BBF }
    owner: ShortInt;                            { +$699, $00599E2A }
    combatattacksdone: ShortInt;                { +$69A, $005A75FA }
    PandoraBoxBudget: SmallInt;                 { +$69C, $00599EDE }
    dead: Boolean;                              { +$69E, $005999A1 }
    incombat: Boolean;                          { +$6A2, $005999D9 }
    bonushp: SmallInt;                          { +$6A4, $00595E09 }
    maxmp: SmallInt;                            { +$6A8, $005A7142 }
    mp: SmallInt;                               { +$6AA, $005A746F }
    unittype: SmallInt;                         { +$6AE, $00599E55 }
    herotype: SmallInt;                         { +$6B0, $00597970 }
    webleft: ShortInt;                          { +$6B2, $00595201 }
    confusioneffect: ShortInt;                  { +$6B3, $00599D6B }
    combatsummoned: Boolean;                    { +$6B4, $00599FCC }
    attackbonus: SmallInt;                      { +$6BC, $005A6B37 }
    defensebonus: SmallInt;                     { +$6BE, $005A6ABF }
    resistancebonus: SmallInt;                  { +$6C0, $005A6A75 }
    rangedbonus: SmallInt;                      { +$6C2, $005A6BB3 }
    attackpenal: SmallInt;                      { +$6C4, $005A6DAB }
    defensepenal: SmallInt;                     { +$6C6, $005A6DED }
    resistancepenal: SmallInt;                  { +$6C8, $005A6E2F }
    rangedpenal: SmallInt;                      { +$6CA, $005A6EA3 }
    stealth: Boolean;                           { +$6D0, $005A76C8 }
  end;

  { [inferred names; exact offsets, stride and executable bound]
    Entry j is `base + j*24 - 24` at $005A696D..$005A6992. The field
    bindings come from the register/stack arguments passed to
    @Map@unitonoverlandtile at $005A69CD..$005A69E2. }
  inferred_AuraEntryT = record
    plane: Integer;                              { +$00 }
    x: Integer;                                  { +$04 }
    y: Integer;                                  { +$08 }
    kind: Integer;                               { +$0C }
    value: Integer;                              { +$10 }
    owner: Integer;                              { +$14 }
  end;
  inferred_AuraTableT = array[1..10000] of inferred_AuraEntryT;

  { [exact shipped field names; inferred executable binding]
    The executable's nine-dword stride matches Typedec.pas HeroAbilityT.
    The two formula fields are read at +$08 and +$0C. }
  HeroAbilityT = record
    name: string;
    helpentry: string;
    bonusmul: Integer;
    bonusdiv: Integer;
    super: Boolean;
    scaling: Boolean;
    heroclass: Integer;
    icon: Integer;
    vialmin, vialmax: Integer;
  end;
  inferred_HeroAbilityTableT =
    array[1..maxmaxheroability] of HeroAbilityT;

  { [exact shipped field name/bounds; inferred binding and offset]
    Only the field R5.1c-c reads is located; see the Wizards declaration below
    for the address evidence behind the offset and both bounds. }
  WizardT = record
    inferred_padding000000_08A7EF: array[$000000..$08A7EF] of Byte;
    Hero: array[1..MaxMaxherotypes] of
            array[1..maxmaxheroability] of Integer;  { +$08A7F0 }
  end;

  { [inferred type/binding; exact stride and bound]
    @Units@Ismagicalranged reads byte +$0D of a 16-byte, 1-based entry. }
  inferred_RangedTypeT = record
    inferred_padding00_0C: array[$00..$0C] of Byte;
    Ismagic: Boolean;                            { +$0D, $00596428 }
  end;
  inferred_RangedTypeTableT = array[1..100] of inferred_RangedTypeT;

  { [exact names/operands; inferred bindings; *relative* offsets only]
    Record stride is $F7 * 8 = 1,976 bytes (`imul reg, reg, $F7` at $005A8C84,
    with an *8 index scale). Unlike unitT, this record has no established base:
    the Cities array's own base address in the runtime data block has not been
    read, so only the spacing of the three accessed fields is known, not their
    absolute offsets. What the executable shows is a byte at some offset B, then
    words at B+2 and B+4, with displacements $0ADADC70, $0ADADC72 and $0ADADC74.
    `Typedec.pas`'s `Race, plane, Owner : shortint; x, y : smallint;` is the only
    reading of those five fields that fits that shape, which is what binds the
    three names below. Do not treat $70/$72/$74 as record offsets. }
  CityT = record
    plane: ShortInt;                            { B+$0, $005A8CF0 }
    x: SmallInt;                                { B+$2, $005A8CC4 }
    y: SmallInt;                                { B+$4, $005A8C97 }
  end;

  { [inferred partial type; exact offsets in the pointed-to combat record] }
  { [inferred record name; exact base, stride, bound and member identities]
    The per-side enchantment block is read as
      $005A7057 8b45e0            mov  eax,[ebp-$20]      { ownCG }
      $005A705B 83f801 7605 …     dec / cmp eax,1 / jbe   { declared bound 1..2 }
      $005A7066 6bc032            imul eax,eax,$32
      $005A7070 8b159c967000      mov  edx,[$0070969C]
      $005A7076 83bcc290feffff00  cmp  dword [edx+eax*8-$170],0
    so the side stride is $32 * 8 = $190 bytes = Maxmaxcombatenchantments * 4,
    and side s occupies [s*$190 - $190 .. s*$190 - 1] from the pointer. The
    two Boolean fields then sit immediately past both blocks, at 2 * $190 + 2. }
  inferred_CombatStateT = record
    inferred_CombatGlobals:
      array[CGDefender..CGAttacker] of
        array[1..Maxmaxcombatenchantments] of Integer;
                                                { +$000, $190-byte side stride }
    inferred_padding0320_0321: array[$320..$321] of Byte;
    inferred_DefenderSight: Boolean;            { +$322 }
    inferred_AttackerSight: Boolean;            { +$323 }
  end;
  Pinferred_CombatStateT = ^inferred_CombatStateT;

var
  { [exact names; exact declared bounds]
    Storage is reached through the runtime data block whose pointer lives at
    $00709188. The bounds are the ones the compiler range-checks against:
    `dec; cmp $9C3F` at $00599980 gives array[1..40000], matching
    `Typedec.pas`'s `array[1..maxunitslots+1] of UnitT`. Units and BaseUnits
    are $4965100 apart, which is exactly 40000 * 1924. }
  BaseUnits, Units: array[1..Maxunitslots + 1] of unitT;

  { [exact shipped field name and bounds; inferred record binding]
    Shares the runtime-data block base $00709188 with Units and BaseUnits. The
    owner index is *not* decremented before its guard, so this array is 0-based
    with 14 entries; only the Hero field has been located:
      $00597984 83f80d            cmp  eax,$0D            { owner bound 0..13 }
      $0059798E 69c097290300      imul eax,eax,$32997     { *8 index scale }
      $005979A8 83fa54            dec / cmp edx,$54       { herotype bound 1..85 }
      $005979BD 8b8cd034a70800    mov  ecx,[eax+edx*8+$0008A734]
    The record stride is therefore $32997 * 8 = 1,658,040 bytes, the herotype
    stride is $19 * 8 = 200 bytes, and the displacement is
    $0008A724 + ability*4, which places element [1,1] at +$0008A7F0.
    Typedec.pas:71 declares
      Hero : array[1..MaxMaxherotypes] of array[1..maxmaxheroability] of integer. }
  Wizards: array[0..13] of WizardT;
  { [inferred name/type; exact supplying operand]
    The loop bound is read at $00599960..$00599965 as
      A1 F8 91 70 00          mov eax, [$00709188]
      8B 80 18 1F AC 01       mov eax, [eax+$01AC1F18].
    TD32 supplies no semantic name for that runtime-data field; `Maxunits` is
    therefore a reconstruction alias, not a recovered global declaration. }
  Maxunits: Integer;
  Cities: array[1..maxCityslots] of CityT;

  { [inferred pointer types; exact global addresses and dereference shape] }
  global_CombatStatePtr: Pointer absolute $0070969C;
  global_AttackerPtr: ^Integer absolute $007092AC;
  global_DefenderPtr: ^Integer absolute $0070A22C;
  global_UnitRecalculateEnabledPtr: ^Boolean absolute $00709AF8;
  global_UnitCalcPreHandlePtr: ^Integer absolute $00707FB4;
  global_UnitCalcHandlePtr: ^Integer absolute $00708F68;
  global_CombatPlanePtr: ^Integer absolute $00708324;
  global_DebugInvisPtr: ^Boolean absolute $00709BD8;
  inferred_AuraCountPtr: ^Integer absolute $00707FA8;
  inferred_AuraTablePtr: ^inferred_AuraTableT absolute $00709BF4;
  inferred_HeroAbilityPtr: ^inferred_HeroAbilityTableT absolute $007086C8;
  inferred_RangedTypesPtr: ^inferred_RangedTypeTableT absolute $0070A144;

  { [inferred names/types; exact pointer-global addresses]
    @Init@LoadLevelBonusINI fills these arrays. The final pointer is named for
    its consumer rather than its apparent section: loader bytes $00630D7B..
    $00630DAD fill it from [Hero] ToDefend even though the normal arm consumes
    it. The six @Heroes@ table helpers use seven further pointers recorded in
    D21.evidence.md. }
  inferred_HeroThrownPtr: Pinferred_LevelBonusT absolute $00709278;
  inferred_HeroBreathPtr: Pinferred_LevelBonusT absolute $00709EF4;
  inferred_HeroToDefendPtr: Pinferred_LevelBonusT absolute $00708940;
  inferred_NormalAttackPtr: Pinferred_LevelBonusT absolute $00708C54;
  inferred_NormalMissileRangedPtr: Pinferred_LevelBonusT absolute $00709BA4;
  inferred_NormalMagicRangedPtr: Pinferred_LevelBonusT absolute $00709C4C;
  inferred_NormalHPPtr: Pinferred_LevelBonusT absolute $007090AC;
  inferred_NormalResistancePtr: Pinferred_LevelBonusT absolute $0070876C;
  inferred_NormalThrownPtr: Pinferred_LevelBonusT absolute $00708B64;
  inferred_NormalBreathPtr: Pinferred_LevelBonusT absolute $00709824;
  inferred_NormalDefensePtr: Pinferred_LevelBonusT absolute $00709E5C;
  inferred_NormalHitPtr: Pinferred_LevelBonusT absolute $00709200;
  inferred_NormalToDefendFromHeroPtr: Pinferred_LevelBonusT absolute $00708268;

  { Reading alias, not a separate object: every use below is exactly
    Pinferred_CombatStateT(global_CombatStatePtr)^.inferred_CombatGlobals,
    and compiles to [ [$0070969C] + side*$190 - $190 + (id-1)*4 ]. }
  inferred_CombatGlobals:
    array[CGDefender..CGAttacker] of
      array[1..Maxmaxcombatenchantments] of Integer
    absolute Pinferred_CombatStateT(global_CombatStatePtr)^;

{ [exact call target and call order; inferred declaration]
  TD32: @Scripts@SetScriptNumVar, VA $00590CF0.
  At both hooks the literal address $005A7A6C identifies script variable "U",
  value is i, and the third register argument is 1. }
procedure inferred_SetScriptUnitVariable(i: Integer);
begin
  { Scripts.SetScriptNumVar($005A7A6C, i, 1); }
end;

{ [exact call target; inferred declaration]
  TD32: @Scripts@RunScript, VA $00582C14. DL is 1 at both call sites. }
procedure inferred_RunUnitScript(handle: Integer);
begin
  { Scripts.RunScript(handle, True); }
end;

{ $005981F8..$00598D86 [exact control, operands and writes; inferred bindings]
  @Units@ApplyLevelBonus. The named @Heroes@ helpers and SetMaxMp are real
  executable calls; their targets and table bodies are recorded in
  D21.evidence.md. Every addition below is a checked signed 32-bit `add` into
  the calculated record. The routine never writes BaseUnits and never touches
  deathgaze +$38, stoninggaze +$3C or doomgaze +$40. }
procedure ApplyLevelBonus(i: Integer); register;
begin
  { $00598223..$00598754: the path split reads BaseUnits.ishero. }
  if BaseUnits[i].ishero then
  begin
    { $00598231..$00598295 }
    Inc(Units[i].attack, Heroes.HeroLvToAttack(Units[i].level));

    { $00598295..$0059835D: gate reads base rangedtype. }
    if BaseUnits[i].rangedtype > 0 then
      Inc(Units[i].ranged,
          Heroes.HeroLvToRanged(
            Units[i].level,
            Ismagicalranged(BaseUnits[i].rangedtype)));

    { $0059835D..$00598425 }
    Inc(Units[i].hp, Heroes.HeroLvToHP(Units[i].level));
    Inc(Units[i].resistance,
        Heroes.HeroLvToResistance(Units[i].level));

    { $00598425..$0059860E: unlike the normal arm, these three gates read the
      calculated channel. Hero Breath shares one table for Fire and Lightning. }
    if Units[i].thrown > 0 then
      Inc(Units[i].thrown,
          inferred_HeroThrownPtr^[Units[i].level]);
    if Units[i].firebreath > 0 then
      Inc(Units[i].firebreath,
          inferred_HeroBreathPtr^[Units[i].level]);
    if Units[i].lightningbreath > 0 then
      Inc(Units[i].lightningbreath,
          inferred_HeroBreathPtr^[Units[i].level]);

    { $0059860E..$00598754 }
    Inc(Units[i].defense,
        Heroes.HeroLvToDefense(Units[i].level));
    Inc(Units[i].hitchance,
        Heroes.HeroLvToHitchance(Units[i].level));
    Inc(Units[i].defendchance,
        inferred_HeroToDefendPtr^[Units[i].level]);
  end
  else
  begin
    { $00598754..$005987F7: normal Attack is gated on the base channel. }
    if BaseUnits[i].attack > 0 then
      Inc(Units[i].attack,
          inferred_NormalAttackPtr^[Units[i].level]);

    { $005987F7..$00598949: both alternatives write only Units.ranged +$24. }
    if BaseUnits[i].rangedtype > 0 then
      if Ismagicalranged(BaseUnits[i].rangedtype) then
        Inc(Units[i].ranged,
            inferred_NormalMagicRangedPtr^[Units[i].level])
      else
        Inc(Units[i].ranged,
            inferred_NormalMissileRangedPtr^[Units[i].level]);

    { $00598949..$00598A33 }
    Inc(Units[i].defense,
        inferred_NormalDefensePtr^[Units[i].level]);
    Inc(Units[i].resistance,
        inferred_NormalResistancePtr^[Units[i].level]);

    { $00598A33..$00598C1C: all three normal gates read BaseUnits. }
    if BaseUnits[i].thrown > 0 then
      Inc(Units[i].thrown,
          inferred_NormalThrownPtr^[Units[i].level]);
    if BaseUnits[i].firebreath > 0 then
      Inc(Units[i].firebreath,
          inferred_NormalBreathPtr^[Units[i].level]);
    if BaseUnits[i].lightningbreath > 0 then
      Inc(Units[i].lightningbreath,
          inferred_NormalBreathPtr^[Units[i].level]);

    { $00598C1C..$00598D7B }
    Inc(Units[i].hp,
        inferred_NormalHPPtr^[Units[i].level]);
    Inc(Units[i].hitchance,
        inferred_NormalHitPtr^[Units[i].level]);
    { Loader anomaly: this normal-path pointer is filled from [Hero] ToDefend,
      not [Normal] ToDefend ($00630D7B..$00630DAD). }
    Inc(Units[i].defendchance,
        inferred_NormalToDefendFromHeroPtr^[Units[i].level]);
  end;

  { $00598D7B..$00598D86: common tail and sole return. }
  SetMaxMp(i);
end;

procedure RecalculateUnits(com: Boolean; tap, tax, tay: Integer); register;
var
  { [exact TD32 local names] }
  i, j, k, n: Integer;
  ownCG: Integer;

  { [exact TD32 name; exact declared bound]
    Declared one element *shorter* than Units and BaseUnits: its range check at
    $00599ABD is `dec; cmp $9C3E` (1..39999) against their `cmp $9C3F`
    (1..40000). The stack arithmetic agrees — the prologue reserves $27148
    bytes, element i sits at [EBP + 4*i - $27150], so the array runs from
    EBP-$2714C down to EBP-$54 and stops just short of the first named local at
    EBP-$50. A Maxunits of 40000 would therefore range-check here before it
    range-checked on the unit record itself; whether the engine can reach that
    value has not been established. }
  prevmaxmoves: array[1..Maxunitslots] of Integer;
begin
  { R5.1a completion evidence for $00599920..$0059A02C, including every
    semantic conditional target, call, state write, the whole-record copy and
    the contiguous coverage ledger, is in
    Units.RecalculateUnits.R5.1a.evidence.md. }
  { $00599920..$00599960 [exact control/writes; inferred field names]
    The real prologue allocates $27148 bytes of stack (an $27-iteration loop of
    $1000 each, then a further $148) and preserves EBX/ESI/EDI.
    k, n and ownCG are used by later, not-yet-reconstructed regions. }
  Pinferred_CombatStateT(global_CombatStatePtr)^.inferred_DefenderSight := False;
  Pinferred_CombatStateT(global_CombatStatePtr)^.inferred_AttackerSight := False;

  { $00599960..$005A681C: first pass over units. [exact structure] }
  for i := 1 to Maxunits do
  begin
    { $0059997D..$00599A8D [exact] }
    if BaseUnits[i].dead then
      Continue;                                      { target $005A6816 }

    if com and not BaseUnits[i].incombat then
      Continue;                                      { target $005A6816 }

    { tax = -1 disables all three location filters. The unusual parameter
      order is preserved: tap is plane, tax is X, tay is Y. }
    if tax <> -1 then
    begin
      if BaseUnits[i].plane <> tap then
        Continue;
      if BaseUnits[i].overlandx <> tax then
        Continue;
      if BaseUnits[i].overlandy <> tay then
        Continue;
    end;

    { $00599A8D..$00599B30 [exact]
      Save the old current movement before overwriting the complete current
      record with its base record. REP MOVSD count is exactly $01E1. The saved
      value is sign-extended from combatmaxmoves' 16 bits into a 32-bit slot. }
    prevmaxmoves[i] := Units[i].combatmaxmoves;
    Units[i] := BaseUnits[i];

    { $00599B30..$00599C2D [exact]

      The merge is *self-inclusive*: destination and first source are the same
      array. Both sit at record +$509, which is `BaseUnitEnchantment`'s layer in
      BaseUnits and `HasUnitEnchantment`'s aggregate in Units — one array whose
      meaning changes with the copy above. So the copied base layer is the
      aggregate's seed, and there is no separate "base" array in the record.

      That is what makes the EncMagic write load-bearing rather than redundant:
      it drops any base-layer EncMagic before the merge, so a unit keeps it only
      if an overland, combat or item source supplies it — or if region c
      re-derives it, which it does for base heroes at $0059ACAF.

      Source order follows the executable's own tests at $00599BA3, $00599BBF,
      $00599BDB and $00599BF7. The chain short-circuits on the first set flag. }
    Units[i].EnchantmentFlags[EncMagic] := False;
    for j := 1 to maxmaxenchantmentflag do
      Units[i].EnchantmentFlags[j] :=
        Units[i].EnchantmentFlags[j] or
        Units[i].ItemEnchantmentFlags[j] or
        Units[i].CombatEnchantmentFlags[j] or
        Units[i].OverlandEnchantmentFlags[j];

    { $00599C2D..$00599D19 [exact]
      EncPossession and EncCreatureBinding share the same branch. Do not
      simplify the owner swap to a boolean toggle: the executable computes
      Attacker + Defender - current owner. It range-checks the result as a
      signed byte, which is what identifies owner as a ShortInt. }
    if Units[i].EnchantmentFlags[EncPossession] or
       Units[i].EnchantmentFlags[EncCreatureBinding] then
      Units[i].owner :=
        global_AttackerPtr^ + global_DefenderPtr^ - Units[i].owner;

    { $00599D19..$00599E31 [exact] }
    if not Units[i].EnchantmentFlags[EncConfusion] then
      Units[i].confusioneffect := 0;
    if Units[i].confusioneffect = 2 then
      Units[i].owner :=
        global_AttackerPtr^ + global_DefenderPtr^ - Units[i].owner;

    { $00599E31..$00599E8C [exact]
      This writes the item/derived source layer after the aggregate array was
      rebuilt; there is no second aggregate rebuild before UnitCalcPre. }
    if BaseUnits[i].unittype = inferred_UnitGolem then
      Units[i].ItemEnchantmentFlags[EncResistElements] := True;

    { $00599E8C..$00599EE8 [exact]
      The destination is BaseUnits, not Units. }
    if not BaseUnits[i].incombat then
      BaseUnits[i].PandoraBoxBudget := 0;

    { $00599EE8..$00599FA8 [exact values/order] }
    if Units[i].EnchantmentFlags[EncCCBreath] then
    begin
      Inc(Units[i].firebreath, 4);
      Units[i].race := RCChaos;
      Units[i].Fantastic := True;
    end;

    { $00599FA8..$0059A002 [exact] }
    if Units[i].combatsummoned then
      Units[i].Fantastic := True;

    { $0059A002..$0059A02C [exact hook boundary]
      Call sites:
        $0059A019 -> @Scripts@SetScriptNumVar ($00590CF0)
        $0059A027 -> @Scripts@RunScript      ($00582C14)
      Handle global $00707FB4 is loaded by @Init@GameInitialize from
      MODDING.INI [Scripts] UnitRecalculateEarly, default "UnitCalcPre". }
    if global_UnitRecalculateEnabledPtr^ then
    begin
      inferred_SetScriptUnitVariable(i);
      inferred_RunUnitScript(global_UnitCalcPreHandlePtr^);
    end;

    { $0059A02C..$005A65B2 [exact/inferred]
      Complete R5.1b reconstruction, merged 2026-08-02 from the independent
      Claude and Codex derivations after both review files were processed.
      Provenance: Claude 2026-08-01; Codex 2026-08-01, independent from the
      shared thirteen-anchor spine already present in this reconstruction placeholder.

      The source below uses U = Units[i], B = BaseUnits[i], and item for the
      current BaseUnits[i].equip[j] pointer. These are readability aliases in
      this intentionally non-compilable reconstruction, not recovered names.
      The companion R5.1b evidence file preserves all 401 conditional-branch
      targets, 15 arithmetic idioms, the contiguous coverage ledger, and the
      completion counts. }
    { $0059A02C..$0059A172 [exact] }
    if U.EnchantmentFlags[EncHeroism] then
    begin
      { $0059A05E..$0059A0B8 }
      if U.level <= 3 then
        U.level := 4;

      { $0059A0B8..$0059A172
        This clears the persistent overland Heroism source once the base unit has naturally reached
        level 4. It does not clear experience. }
      if B.level >= 4 then
        B.OverlandEnchantmentFlags[EncHeroism] := False;
    end
    else
    begin
      { $0059A118..$0059A172 }
      if B.Fantastic then
        U.level := 1;
    end;

    { $0059A172..$0059A35E [inferred: global semantic name] }
    if (not B.Fantastic) and (U.owner <> 15) then
    begin
      { $0059A1D6..$0059A25C; owner is range-checked as 0..13 }
      if Wizards[U.owner].GlobalEnchantments[GECrusade] then
        Inc(U.level);

      { $0059A25C..$0059A2DF; owner is independently reloaded and range-checked }
      if Wizards[U.owner].Retorts[Warlord] then
        Inc(U.level);

      { $0059A2DF..$0059A35E [inferred: name; pointer/global address $00709E64] }
      if U.level > inferred_MaxNormalLevelPtr^ then
        U.level := inferred_MaxNormalLevelPtr^;
    end;

    { $0059A35E..$0059A633 [exact] }
    if U.EnchantmentFlags[EncDestiny] then
    begin
      { Persistent/base-record transformation, in executable write order. }
      B.race := 19;                          { $0059A390..$0059A3BF }
      B.Fantastic := True;                   { $0059A3BF..$0059A3EB }
      B.attackflags.supernatural := True;    { $0059A3EB..$0059A417, field +$3CA }
      B.experience := 0;                     { $0059A417..$0059A445 }
      B.level := 1;                          { $0059A445..$0059A471 }

      { Calculated-record writes, also in executable order. }
      U.attack := U.attack * 2;              { $0059A471..$0059A4AB }
      U.ranged := U.ranged * 2;              { $0059A4AB..$0059A4E5 }
      U.hp := U.hp * 2;                      { $0059A4E5..$0059A51F }
      U.firebreath := U.firebreath * 2;      { $0059A51F..$0059A559 }
      U.lightningbreath :=
        U.lightningbreath * 2;               { $0059A559..$0059A593 }
      U.thrown := U.thrown * 2;              { $0059A593..$0059A5CD }
      Inc(U.defense, 4);                     { $0059A5CD..$0059A600 }
      Inc(U.resistance, 4);                  { $0059A600..$0059A633 }
    end;

    { $0059A633..$0059A63B [exact TD32 call] }
    ApplyLevelBonus(i);

    { $0059A63B..$0059ABF7 [exact] }
    if U.EnchantmentFlags[EncFocusMagic] then
    begin
      { Three independent positive-strength tests. }
      if U.doomgaze > 0 then                 { $0059A66D..$0059A6CE }
        Inc(U.doomgaze, 3);
      if U.firebreath > 0 then               { $0059A6CE..$0059A72F }
        Inc(U.firebreath, 3);
      if U.lightningbreath > 0 then          { $0059A72F..$0059A790 }
        Inc(U.lightningbreath, 3);

      { $0059A790..$0059AB4F
        Exactly one ranged branch runs. The gates deliberately read B.ranged and B.rangedtype,
        whereas the writes target U. }
      if (U.thrown > 0) and (B.ranged = 0) then
      begin
        U.ranged := U.thrown;                { $0059A7F4..$0059A84B }
        U.rangedbonus := U.thrown;           { $0059A84B..$0059A8B9, SmallInt range check }
        U.thrown := 0;                       { $0059A8B9..$0059A8E6 }
        U.rangedtype := 34;                  { $0059A8E6..$0059A915 }
        U.maxammo := 4;                      { $0059A915..$0059A944 }
      end
      else if B.ranged = 0 then
      begin
        U.ranged := 3;                       { $0059A97B..$0059A9AA }
        U.rangedbonus := 3;                  { $0059A9AA..$0059A9D8 }
        U.rangedtype := 34;                  { $0059A9D8..$0059AA07 }
        U.maxammo := 4;                      { $0059AA07..$0059AA36 }
      end
      else if not Ismagicalranged(B.rangedtype) then
      begin
        U.rangedtype := 34;                  { $0059AA3B..$0059AA9E }
      end
      else
      begin
        Inc(U.ranged, 3);                    { $0059AAA3..$0059AAD6 }
        Inc(U.rangedbonus, 3);               { $0059AAD6..$0059AB4F, SmallInt range check }
      end;

      { $0059AB4F..$0059ABF7 }
      if U.maxmp > 0 then
        Inc(U.maxmp, 15);                    { SmallInt range check }
    end;

    { $0059ABF7..$0059AC5D [exact] }
    if (B.ammo <= 0) and Iscombat then
      U.rangedtype := -1;

    { $0059AC5D..$0059ACB7 [exact] }
    if B.ishero then
      U.EnchantmentFlags[EncMagic] := True;

    { $0059ACB7..$0059ACBF [exact TD32 call] }
    ApplyHeroBonus(i);

    { $0059ACBF..$0059AD90 [exact outer structure] }
    if B.ishero then
    begin
      for j := 1 to 3 do
      begin
        if B.equip[j].it <> -1 then
        begin
          item := @B.equip[j];

          { $0059AD93..$0059B1E6 [exact]
            Each Defense power updates both the calculated stat and its SmallInt display bonus. }
          if item.powers[IPDefense1] then begin
            Inc(U.defense, 1);
            Inc(U.defensebonus, 1);
          end;
          if item.powers[IPDefense2] then begin
            Inc(U.defense, 2);
            Inc(U.defensebonus, 2);
          end;
          if item.powers[IPDefense3] then begin
            Inc(U.defense, 3);
            Inc(U.defensebonus, 3);
          end;
          if item.powers[IPDefense4] then begin
            Inc(U.defense, 4);
            Inc(U.defensebonus, 4);
          end;
          if item.powers[IPDefense5] then begin
            Inc(U.defense, 5);
            Inc(U.defensebonus, 5);
          end;
          if item.powers[IPDefense6] then begin
            Inc(U.defense, 6);
            Inc(U.defensebonus, 6);
          end;

          { $0059B1E6..$0059B411 [exact]
            Movement is stored in half-moves, so the raw increments 2/4/6 represent 1/2/3 displayed
            movement points. Combat movement is SmallInt; overland movement is Integer. }
          if item.powers[IPMove1] then begin
            Inc(U.combatmaxmoves, 2);
            Inc(U.overlandmaxmoves, 2);
          end;
          if item.powers[IPMove2] then begin
            Inc(U.combatmaxmoves, 4);
            Inc(U.overlandmaxmoves, 4);
          end;
          if item.powers[IPMove3] then begin
            Inc(U.combatmaxmoves, 6);
            Inc(U.overlandmaxmoves, 6);
          end;

          { $0059B411..$0059B867 [exact] }
          if item.powers[IPResist1] then begin
            Inc(U.resistance, 1);
            Inc(U.resistancebonus, 1);
          end;
          if item.powers[IPResist2] then begin
            Inc(U.resistance, 2);
            Inc(U.resistancebonus, 2);
          end;
          if item.powers[IPResist3] then begin
            Inc(U.resistance, 3);
            Inc(U.resistancebonus, 3);
          end;
          if item.powers[IPResist4] then begin
            Inc(U.resistance, 4);
            Inc(U.resistancebonus, 4);
          end;
          if item.powers[IPResist5] then begin
            Inc(U.resistance, 5);
            Inc(U.resistancebonus, 5);
          end;
          if item.powers[IPResist6] then begin
            Inc(U.resistance, 6);
            Inc(U.resistancebonus, 6);
          end;

          { $0059B867..$0059BB3B [exact]
            Each skill power is independently gated by the current casting pool being positive. }
          if item.powers[IPSkill5] and (U.maxmp > 0) then
            Inc(U.maxmp, 5);
          if item.powers[IPSkill10] and (U.maxmp > 0) then
            Inc(U.maxmp, 10);
          if item.powers[IPSkill15] and (U.maxmp > 0) then
            Inc(U.maxmp, 15);
          if item.powers[IPSkill20] and (U.maxmp > 0) then
            Inc(U.maxmp, 20);

          { $0059BB3B..$0059BD66 [exact] }
          if item.powers[IPHP1] then begin
            Inc(U.hp, 1);
            Inc(U.goldhp, 1);
          end;
          if item.powers[IPHP2] then begin
            Inc(U.hp, 2);
            Inc(U.goldhp, 2);
          end;
          if item.powers[IPHP3] then begin
            Inc(U.hp, 3);
            Inc(U.goldhp, 3);
          end;

          { $0059BD66..$0059C020 [exact]
            Flaming always adds 3 to melee. The other four channels are changed only when their
            current strength is positive; only melee and ordinary ranged have display accumulators. }
          if item.powers[IPFlaming] then begin
            Inc(U.attack, 3);
            Inc(U.attackbonus, 3);
            if U.thrown > 0 then
              Inc(U.thrown, 3);
            if U.ranged > 0 then begin
              Inc(U.ranged, 3);
              Inc(U.rangedbonus, 3);
            end;
            if U.firebreath > 0 then
              Inc(U.firebreath, 3);
            if U.lightningbreath > 0 then
              Inc(U.lightningbreath, 3);
          end;

          { $0059C020..$0059C081 [exact] }
          if item.powers[IPInsulation] then begin
            U.Fireimmunity := True;
            U.lightningresist := True;
          end;

          { $0059C081..$0059C6E9 [exact]
            These tests are independent and remain in executable order. Several powers populate the
            item/derived enchantment layer for later processing; the exceptions write direct fields. }
          if item.powers[IPImmolation] then begin
            U.coldimmunity := True;
            U.ItemEnchantmentFlags[EncImmolation] := True;
          end;
          if item.powers[IPFear] then
            U.ItemEnchantmentFlags[EncCloakofFear] := True;
          if item.powers[IPNecromancy] then
            U.ItemEnchantmentFlags[EncNecromancy] := True;
          if item.powers[IPWraithform] then
            U.ItemEnchantmentFlags[EncWraithForm] := True;
          if item.powers[IPBless] then
            U.ItemEnchantmentFlags[EncBless] := True;
          if item.powers[IPTrueSight] then
            U.ItemEnchantmentFlags[EncTrueSight] := True;
          if item.powers[IPLionheart] then
            U.ItemEnchantmentFlags[EncLionheart] := True;
          if item.powers[IPDivineProt] then begin
            U.Lucky := True;
            U.deathimmunity := True;
          end;
          if item.powers[IPInvulnerability] then
            U.ItemEnchantmentFlags[EncInvulnerability] := True;
          if item.powers[IPRecharge] then
            Inc(U.maxammo, 4);
          if item.powers[IPEgoism] then
            U.egoism := True;
          if item.powers[IPDarkForce] then
            U.darkforce := True;
          if item.powers[IPStealth] then
            U.stealth := True;
          if item.powers[IPAmplifier] then
            U.amplifier := True;
          if item.powers[IPWaterWalking] then
            U.ItemEnchantmentFlags[EncWaterWalking] := True;
          if item.powers[IPPathfinding] then begin
            U.forester := True;
            U.mountaineer := True;
          end;
          if item.powers[IPResistElements] then
            U.ItemEnchantmentFlags[EncResistElements] := True;
          if item.powers[IPElementalArmor] then
            U.ItemEnchantmentFlags[EncElementalArmor] := True;
          if item.powers[IPMerging] then
            U.merging := True;
          if item.powers[IPTeleport] then begin
            U.teleporting := True;
            Inc(U.overlandmaxmoves, 2);
            Inc(U.combatmaxmoves, 2);
          end;
          if item.powers[IPRegeneration] then
            U.ItemEnchantmentFlags[EncRegeneration] := True;
          if item.powers[IPGuardianWInd] then
            U.ItemEnchantmentFlags[EncGuardianWind] := True;
          if item.powers[IPResistMagic] then
            U.ItemEnchantmentFlags[EncResistMagic] := True;
          if item.powers[IPFlight] then
            U.ItemEnchantmentFlags[EncFlight] := True;
          if item.powers[IPInvisibility] then
            U.ItemEnchantmentFlags[EncInvisibility] := True;

          { $0059C6E9..$0059C7AD [inferred: table semantic name]
            The Pandora power is ignored while the persistent/base unit is already in combat.
            U.level is range-checked as 1..20 before indexing the dword table reached through the
            pointer at $00709AA8; the selected value is range-checked into SmallInt. }
          if (not B.incombat) and item.powers[IPPandora] then
            B.PandoraBoxBudget := inferred_PandoraBudgetByLevelPtr^[U.level];

          { $0059C7AD..$0059C7E2 [exact] }
          if item.powers[IPHaste] then
            U.ItemEnchantmentFlags[EncHaste] := True;

          { $0059C7E2..$0059C881 [exact]
            `spellcharge` is ItemT +$20 and `chargeamount` is ItemT +$24. The former is copied into
            SmallInt Spellability and the latter into ShortInt maxcharges, in the write order shown. }
          if item.spellcharge > 0 then begin
            U.maxcharges := item.chargeamount;
            U.Spellability := item.spellcharge;
          end;

          { $0059C881..$0059C93A [exact]
            ItemT.it is the dword at +$28. The numeric type name is not supplied; the comparison and
            effects are direct binary reads. }
          if item.it = 9 then begin
            Inc(U.defense, 2);
            Inc(U.defensebonus, 2);
          end;

          { $0059C93A..$0059C9F3 [exact] }
          if item.it = 8 then begin
            Inc(U.defense, 1);
            Inc(U.defensebonus, 1);
          end;

          { $0059C9F3..$0059CA28 [exact] }
          if item.it = 7 then
            U.LargeShield := True;

          { $0059CA28..$0059D435 [exact]
            The compiler emits two accepted item-type ranges: 1..3 and 7..10. Types outside those
            ranges jump over this entire melee/Thrown power pass. }
          case item.it of
            1..3, 7..10:
            begin
              { $0059CA40..$0059CBA8
                Each Hit power always changes the melee-specific channel. Item type 3 additionally
                receives the same change in the Thrown-specific channel. }
              if item.powers[IPHit1] then begin
                Inc(U.hitchancemelee, 10);
                if item.it = 3 then
                  Inc(U.hitchancethrown, 10);
              end;
              if item.powers[IPHit2] then begin
                Inc(U.hitchancemelee, 20);
                if item.it = 3 then
                  Inc(U.hitchancethrown, 20);
              end;
              if item.powers[IPHit3] then begin
                Inc(U.hitchancemelee, 30);
                if item.it = 3 then
                  Inc(U.hitchancethrown, 30);
              end;

              { $0059CBA8..$0059D27A
                Every Attack power changes melee and its SmallInt display accumulator. For item type
                3 it also changes an already-positive Thrown attack; zero or negative Thrown is left
                unchanged. Every power test is independent. }
              if item.powers[IPattack1] then begin
                Inc(U.attack, 1);
                Inc(U.attackbonus, 1);
                if (item.it = 3) and (U.thrown > 0) then
                  Inc(U.thrown, 1);
              end;
              if item.powers[IPattack2] then begin
                Inc(U.attack, 2);
                Inc(U.attackbonus, 2);
                if (item.it = 3) and (U.thrown > 0) then
                  Inc(U.thrown, 2);
              end;
              if item.powers[IPattack3] then begin
                Inc(U.attack, 3);
                Inc(U.attackbonus, 3);
                if (item.it = 3) and (U.thrown > 0) then
                  Inc(U.thrown, 3);
              end;
              if item.powers[IPattack4] then begin
                Inc(U.attack, 4);
                Inc(U.attackbonus, 4);
                if (item.it = 3) and (U.thrown > 0) then
                  Inc(U.thrown, 4);
              end;
              if item.powers[IPattack5] then begin
                Inc(U.attack, 5);
                Inc(U.attackbonus, 5);
                if (item.it = 3) and (U.thrown > 0) then
                  Inc(U.thrown, 5);
              end;
              if item.powers[IPattack6] then begin
                Inc(U.attack, 6);
                Inc(U.attackbonus, 6);
                if (item.it = 3) and (U.thrown > 0) then
                  Inc(U.thrown, 6);
              end;

              { $0059D27A..$0059D32C [exact]
                The arithmetic is Delphi signed integer division. Unlike the six Attack powers,
                Shadow does not test whether Thrown is positive and does not update a display word. }
              if item.powers[IPShadow] then
                Inc(U.thrown, (B.attack + U.level - 1) div 2);

              { $0059D32C..$0059D435 [exact]
                TD32's shipped AttackFlagsT names bind the byte and dword offsets. Values are written
                literally as 0, -1, -2 or -3; they are not derived from unit stats. }
              if item.powers[IPLightning] then
                U.meleeflags.armorpiercing := True;
              if item.powers[IPDoom] then
                U.meleeflags.doom := True;
              if item.powers[IPPhantasmal] then
                U.meleeflags.illusion := True;
              if item.powers[IPDestruction] then begin
                U.meleeflags.destruction := True;
                U.meleeflags.destructionvalue := 0;
              end;
              if item.powers[IPVampiric] then begin
                U.meleeflags.lifesteal := True;
                U.meleeflags.lifestealvalue := -2;
              end;
              if item.powers[IPDeath] then begin
                U.meleeflags.deathtouch := True;
                U.meleeflags.deathtouchvalue := -3;
              end;
              if item.powers[IPStoning] then begin
                U.meleeflags.stoningtouch := True;
                U.meleeflags.stoningtouchvalue := -1;
              end;
              if item.powers[IPHolyAvenger] then begin
                U.ItemEnchantmentFlags[EncBless] := True;
                U.meleeflags.exorcise := True;
                U.meleeflags.exorcisevalue := -3;
              end;
            end;
          end;

          { $0059D435..$0059DA5A [exact]
            This second category gate accepts item types 4..10. Types outside that range jump to the
            equipment-loop increment. Types 7..10 therefore run both this pass and the preceding
            melee pass. }
          case item.it of
            4..10:
            begin
              { $0059D447..$0059D4FB }
              if item.powers[IPHit1] then
                Inc(U.hitchanceranged, 10);
              if item.powers[IPHit2] then
                Inc(U.hitchanceranged, 20);
              if item.powers[IPHit3] then
                Inc(U.hitchanceranged, 30);

              { $0059D4FB..$0059D951
                Each test independently changes ranged strength and its SmallInt display bonus. }
              if item.powers[IPattack1] then begin
                Inc(U.ranged, 1);
                Inc(U.rangedbonus, 1);
              end;
              if item.powers[IPattack2] then begin
                Inc(U.ranged, 2);
                Inc(U.rangedbonus, 2);
              end;
              if item.powers[IPattack3] then begin
                Inc(U.ranged, 3);
                Inc(U.rangedbonus, 3);
              end;
              if item.powers[IPattack4] then begin
                Inc(U.ranged, 4);
                Inc(U.rangedbonus, 4);
              end;
              if item.powers[IPattack5] then begin
                Inc(U.ranged, 5);
                Inc(U.rangedbonus, 5);
              end;
              if item.powers[IPattack6] then begin
                Inc(U.ranged, 6);
                Inc(U.rangedbonus, 6);
              end;

              { $0059D951..$0059DA5A
                Same power tests and literal values as the melee pass, but the destinations are the
                distinct rangedflags record. Holy Avenger's Bless flag is shared at unit level. }
              if item.powers[IPLightning] then
                U.rangedflags.armorpiercing := True;
              if item.powers[IPDoom] then
                U.rangedflags.doom := True;
              if item.powers[IPPhantasmal] then
                U.rangedflags.illusion := True;
              if item.powers[IPDestruction] then begin
                U.rangedflags.destruction := True;
                U.rangedflags.destructionvalue := 0;
              end;
              if item.powers[IPVampiric] then begin
                U.rangedflags.lifesteal := True;
                U.rangedflags.lifestealvalue := -2;
              end;
              if item.powers[IPDeath] then begin
                U.rangedflags.deathtouch := True;
                U.rangedflags.deathtouchvalue := -3;
              end;
              if item.powers[IPStoning] then begin
                U.rangedflags.stoningtouch := True;
                U.rangedflags.stoningtouchvalue := -1;
              end;
              if item.powers[IPHolyAvenger] then begin
                U.ItemEnchantmentFlags[EncBless] := True;
                U.rangedflags.exorcise := True;
                U.rangedflags.exorcisevalue := -3;
              end;
            end;
          end;
        end;
      end; { $0059DA5A..$0059DA67: Inc(j), continue while j <> 4 }
    end;

    { $0059DA67..$0059DCF2 [exact]
      Owner 15 bypasses the whole block. Other owners are range-checked as 0..13 before the wizard
      record access. Wind Mastery persists Hovering in the base overland layer and skips every later
      terrain/state branch in this block. }
    if U.owner <> 15 then
    begin
      if Wizards[U.owner].GlobalEnchantments[GEWindMastery] then
      begin
        B.OverlandEnchantmentFlags[EncHovering] := True;
      end
      else if B.OverlandEnchantmentFlags[EncHovering] then
      begin
        { $0059DB4F..$0059DC8F
          Exact register argument order at the call is plane, x, y. }
        if not Map.IsNonlandTile(B.plane, B.overlandx, B.overlandy) then
        begin
          { Land removes Hovering from both persistent/current overland layers and both aggregate
            layers, in this exact write order. }
          B.OverlandEnchantmentFlags[EncHovering] := False;
          U.OverlandEnchantmentFlags[EncHovering] := False;
          B.EnchantmentFlags[EncHovering] := False;
          U.EnchantmentFlags[EncHovering] := False;
        end
        else if Iscombat then
        begin
          U.waterwalking := True;
        end
        else
        begin
          U.flying := True;
        end;
      end;
    end;

    { $0059DCF2..$0059DDC3 [exact]
      The loop bound and four source tests are independently range-checked as 1..100. Evaluation
      short-circuits in the order shown. The destination is also the first source: this preserves any
      aggregate bit already derived by the equipment and Hovering blocks. }
    for j := 1 to 100 do
      U.EnchantmentFlags[j] :=
        U.EnchantmentFlags[j] or
        U.ItemEnchantmentFlags[j] or
        U.CombatEnchantmentFlags[j] or
        U.OverlandEnchantmentFlags[j];

    { $0059DDC3..$0059DEC2 [exact]
      Lucky is a direct unit boolean, not an enchantment-array test at this point. Common To Hit and
      To Block have no display-word writes here; Resistance alone updates its SmallInt bonus word. }
    if U.Lucky then
    begin
      Inc(U.hitchance, 10);
      Inc(U.defendchance, 10);
      Inc(U.resistance, 1);
      Inc(U.resistancebonus, 1);
    end;

    { $0059DEC2..$0059DF56 [exact] }
    if U.darkforce then
    begin
      Inc(U.hitchance, 10);
      Inc(U.defendchance, 10);
    end;

    { $0059DF56..$0059E4AD [inferred: global/record names]
      `j` is reused for the node index returned by @Map@nodeontile. Its register arguments are loaded
      through the globals at $00708324 (plane), $007089E4 (x) and $007086D8 (y). The defender owner
      is loaded through $0070A22C; the combat-city index through $00709F14.

      The city record has a $7B8-byte stride and the qualifying signed byte is reached with absolute
      displacement $0ADADDD1. The node record has a $94-byte stride: the qualifying byte uses
      displacement $01AB7124 and its owner dword $01AB7120. Those semantic field names are inferred,
      so the source-shaped aliases retain the displacements rather than guessing names. }
    j := Map.nodeontile(global_00708324^, global_007089E4^, global_007086D8^);
    if Iscombat and (U.owner = global_0070A22C^) then
    begin
      inferred_qualifies := False;

      { The city path wins immediately when its signed field is greater than -1. Otherwise control
        falls through to the node path. }
      if global_00709F14^ > 0 then
        if inferred_Cities[global_00709F14^].field_abs_0ADADDD1 > -1 then
          inferred_qualifies := True;

      if not inferred_qualifies then
        if (j > 0) and inferred_Nodes[j].field_abs_01AB7124 and
           (inferred_Nodes[j].owner_abs_01AB7120 = global_0070A22C^) then
          inferred_qualifies := True;

      if inferred_qualifies then
      begin
        Inc(U.defense, 1);
        Inc(U.defensebonus, 1);
        Inc(U.resistance, 1);
        Inc(U.resistancebonus, 1);
        if B.attack > 0 then begin
          Inc(U.attack, 1);
          Inc(U.attackbonus, 1);
        end;
        if U.ranged > 0 then begin
          Inc(U.ranged, 1);
          Inc(U.rangedbonus, 1);
        end;
        U.EnchantmentFlags[EncMagic] := True;

        { $0059E2B8..$0059E4AD
          This To-Hit tail runs only for the newly qualifying city/node package, and only when the
          base unit has no pre-existing weapon material, is not Fantastic and is not a hero. }
        if not B.EnchantmentFlags[EncMagic] and
           not B.EnchantmentFlags[EncMithril] and
           not B.EnchantmentFlags[EncAdamant] and
           not B.Fantastic and not B.ishero then
        begin
          if B.attack > 0 then
            Inc(U.hitchancemelee, 10);
          if not Ismagicalranged(U.rangedtype) then
            Inc(U.hitchanceranged, 10);
          Inc(U.hitchancethrown, 10);
        end;
      end;
    end;

    { $0059E4AD..$0059E4B5 [exact TD32 call] }
    ApplyMagicWeapons(i);

    { $0059E4B5..$0059E6A1 [exact]
      Regeneration is normalized separately from each non-base source layer. Overland and combat
      sources require at least 2; the item/derived source requires at least 1. }
    if U.OverlandEnchantmentFlags[EncRegeneration] then
      U.regeneration := Max(U.regeneration, 2);
    if U.CombatEnchantmentFlags[EncRegeneration] then
      U.regeneration := Max(U.regeneration, 2);
    if U.ItemEnchantmentFlags[EncRegeneration] then
      U.regeneration := Max(U.regeneration, 1);

    { $0059E6A1..$0059E6FB [exact] }
    if U.EnchantmentFlags[EncWaterWalking] then
      U.waterwalking := True;

    { $0059E6FB..$0059E7B6 [exact] }
    if U.EnchantmentFlags[EncWindWalking] then
    begin
      U.windwalking := True;
      if U.overlandmaxmoves < 12 then
        U.overlandmaxmoves := 12;
    end;

    { $0059E7B6..$0059E810 [exact] }
    if U.EnchantmentFlags[EncInvisibility] then
      U.invisible := True;

    { $0059E810..$0059E86A [exact] }
    if U.EnchantmentFlags[EncTrueSight] then
      U.illusionimmunity := True;

    { $0059E86A..$0059E8C4 [exact] }
    if U.EnchantmentFlags[EncInvulnerability] then
      U.weaponimmunity := True;

    { $0059E8C4..$0059EA39 [exact] }
    if U.EnchantmentFlags[EncFlight] then
    begin
      U.flying := True;
      if U.overlandmaxmoves < 6 then
        U.overlandmaxmoves := 6;
      if U.combatmaxmoves < 6 then
        U.combatmaxmoves := 6;
      if U.scouting < 2 then
        U.scouting := 2;
    end;

    { $0059EA39..$0059EA93 [exact] }
    if U.EnchantmentFlags[EncCloakofFear] then
      U.fear := True;

    { $0059EA93..$0059EB4D [exact]
      King of Underworld derives the aggregate Wraith Form flag only during combat, for a valid
      owner. Owner is range-checked as 0..13. }
    if (U.owner <> 15) and Iscombat and
       Wizards[U.owner].GlobalEnchantments[GEKingOfUnderworld] then
      U.EnchantmentFlags[EncWraithForm] := True;

    { $0059EB4D..$0059EC03 [exact] }
    if U.EnchantmentFlags[EncWraithForm] then
    begin
      U.weaponimmunity := True;
      U.noncorporeal := True;
      U.EnchantmentFlags[EncMagic] := True;
    end;

    { $0059EC03..$0059EE76 [inferred: configured-global binding]
      Movement fields use half-moves. The configured EnduranceHpBonus is loaded twice through the
      global at $0070A0C8, once for each destination, rather than retaining the first quotient. }
    if U.EnchantmentFlags[EncEndurance] then
    begin
      Inc(U.overlandmaxmoves, 2);
      Inc(U.combatmaxmoves, 2);
      if U.roadbuilding > 0 then
        Inc(U.roadbuilding, 1);
      Inc(U.goldhp, Max(1, EnduranceHpBonus div U.figures));
      Inc(U.hp, Max(1, EnduranceHpBonus div U.figures));
    end;

    { $0059EE76..$0059F198 [exact] }
    if U.EnchantmentFlags[EncDiscipline] then
    begin
      Inc(U.defense, 1);
      Inc(U.defensebonus, 1);
      if U.level >= 2 then begin
        Inc(U.defense, 1);
        Inc(U.defensebonus, 1);
      end;
      if U.level >= 3 then begin
        if B.attack > 0 then begin
          Inc(U.attack, 1);
          Inc(U.attackbonus, 1);
        end;
        if not Ismagicalranged(U.rangedtype) then begin
          Inc(U.ranged, 1);
          Inc(U.rangedbonus, 1);
        end;
      end;
    end;

    { $0059F198..$0059F2A8 [exact]
      The level-4 movement package tests the persistent overland Discipline layer specifically. }
    if U.OverlandEnchantmentFlags[EncDiscipline] and (U.level >= 4) then
    begin
      Inc(U.overlandmaxmoves, 2);
      Inc(U.combatmaxmoves, 2);
    end;

    { $0059F2A8..$0059F330 [exact]
      The parallel combat-layer package sets Negate First Strike instead of movement. }
    if U.CombatEnchantmentFlags[EncDiscipline] and (U.level >= 4) then
      U.negatefirststrike := True;

    { $0059F330..$0059F4A3 [exact] }
    if U.EnchantmentFlags[EncCCFlight] then
    begin
      U.flying := True;
      U.race := 18;
      U.Fantastic := True;
      if U.overlandmaxmoves < 4 then
        U.overlandmaxmoves := 4;
      if U.combatmaxmoves < 4 then
        U.combatmaxmoves := 4;
    end;

    { $0059F4A3..$0059F5DC [exact] }
    if U.EnchantmentFlags[EncCCArmor] then
    begin
      Inc(U.defense, 3);
      Inc(U.defensebonus, 3);
      U.race := 18;
      U.Fantastic := True;
    end;

    { $0059F5DC..$0059F747 [exact]
      Blood Lust persists Undead in the base aggregate and also sets the current aggregate before
      immediately applying the Undead identity/upkeep subset shown here. }
    if U.EnchantmentFlags[EncBloodLust] then
    begin
      B.EnchantmentFlags[EncUndead] := True;
      U.EnchantmentFlags[EncUndead] := True;
      U.race := 20;
      U.Fantastic := True;
      U.foodupkeep := 0;
      U.goldupkeep := 0;
      U.nohealing := True;
    end;

    { $0059F747..$0059F7D8 [inferred: configured-global binding]
      The dword through $00708E0C is MODDING.INI's ChosenUnitID. The base unittype is a SmallInt. }
    if B.unittype = ChosenUnitID then
    begin
      U.race := 19;
      U.Fantastic := True;
    end;

    { $0059F7D8..$0059FBD0 [exact]
      Animated persists Undead in the base aggregate. Its attack-channel gates deliberately differ:
      melee tests base attack, breath/Thrown test current positive strength, and ordinary ranged
      tests current rangedtype > 0 rather than ranged strength. }
    if U.EnchantmentFlags[EncAnimated] then
    begin
      B.EnchantmentFlags[EncUndead] := True;
      U.race := 20;
      U.Fantastic := True;
      U.EnchantmentFlags[EncUndead] := True;
      if B.attack > 0 then begin
        Inc(U.attack, 1);
        Inc(U.attackbonus, 1);
      end;
      if U.firebreath > 0 then
        Inc(U.firebreath, 1);
      if U.lightningbreath > 0 then
        Inc(U.lightningbreath, 1);
      if U.thrown > 0 then
        Inc(U.thrown, 1);
      if U.rangedtype > 0 then begin
        Inc(U.ranged, 1);
        Inc(U.rangedbonus, 1);
      end;
      Inc(U.defense, 1);
      Inc(U.defensebonus, 1);
      Inc(U.hitchance, 10);
      U.weaponimmunity := True;
    end;

    { $0059FBD0..$0059FD93 [exact]
      This aggregate Undead normalization also catches Undead derived by Blood Lust or Animated. }
    if U.EnchantmentFlags[EncUndead] then
    begin
      U.race := 20;
      U.Fantastic := True;
      U.illusionimmunity := True;
      U.deathimmunity := True;
      U.coldimmunity := True;
      U.foodupkeep := 0;
      U.goldupkeep := 0;
      U.createoutpost := False;
      U.nohealing := True;
    end;

    { $0059FD93..$0059FDED [exact] }
    if U.EnchantmentFlags[EncGuardianWind] then
      U.missileImmunity := True;

    { $0059FDED..$0059FE47 [exact] }
    if U.EnchantmentFlags[EncMagicImmunity] then
      U.magicimmunity := True;

    { $0059FE47..$005A00E7 [inferred: configured-global bindings]
      The three magnitudes come through $00709A34 (FlameBladeAttackBonus), $00709964
      (FlameBladeThrownBonus) and $00708440 (FlameBladeMissileRangedBonus). The gates read base
      melee/Thrown but current ranged type. EncMagic is derived whenever Flame Blade is present,
      irrespective of which attack gates fired. }
    if U.EnchantmentFlags[EncFlameBlade] then
    begin
      if B.attack > 0 then begin
        Inc(U.attack, FlameBladeAttackBonus);
        Inc(U.attackbonus, FlameBladeAttackBonus);
      end;
      if B.thrown > 0 then
        Inc(U.thrown, FlameBladeThrownBonus);
      if Ismissileranged(U.rangedtype) then begin
        Inc(U.ranged, FlameBladeMissileRangedBonus);
        Inc(U.rangedbonus, FlameBladeMissileRangedBonus);
      end;
      U.EnchantmentFlags[EncMagic] := True;
    end;

    { $005A00E7..$005A016D [exact] }
    if U.EnchantmentFlags[EncImmolation] then
    begin
      U.immolation := True;
      U.coldimmunity := True;
    end;

    { $005A016D..$005A0420 [exact]
      Combat movement is stored in half-moves; +6 is three displayed movement points. Mystic Surge
      derives No Heal in the combat source layer, not merely in the current aggregate. }
    if U.EnchantmentFlags[EncMysticSurge] then
    begin
      U.EnchantmentFlags[EncMagic] := True;
      U.CombatEnchantmentFlags[EncNoHeal] := True;
      Inc(U.combatmaxmoves, 6);
      Inc(U.defense, 2);
      Inc(U.defensebonus, 2);
      Dec(U.resistance, 2);
      Inc(U.resistancepenal, 2);
      U.Displayrace := 0;
      U.attackflags.mysticsurge := True;
    end;

    { $005A0420..$005A04A9 [exact]
      Any combat-layer No Heal source, including Mystic Surge above, performs this conversion. }
    if U.CombatEnchantmentFlags[EncNoHeal] then
    begin
      U.race := 21;
      U.Fantastic := True;
    end;

    { $005A04A9..$005A091D [inferred: configured-global bindings]
      LionheartHpBonus is loaded twice through $00709094 and divided by figures without a minimum.
      LionheartoldHPBonus is loaded through $00709FE4 and then added separately to both destinations. }
    if U.EnchantmentFlags[EncLionheart] then
    begin
      if B.attack > 0 then begin
        Inc(U.attack, 3);
        Inc(U.attackbonus, 3);
      end;
      if not Ismagicalranged(U.rangedtype) then begin
        Inc(U.ranged, 3);
        Inc(U.rangedbonus, 3);
      end;
      Inc(U.resistance, 3);
      Inc(U.resistancebonus, 3);
      Inc(U.goldhp, LionheartHpBonus div U.figures);
      Inc(U.hp, LionheartHpBonus div U.figures);
      Inc(U.goldhp, LionheartoldHPBonus);
      Inc(U.hp, LionheartoldHPBonus);
    end;

    { $005A091D..$005A09FB [exact] }
    if U.EnchantmentFlags[EncIronSkin] then
    begin
      Inc(U.defense, 5);
      Inc(U.defensebonus, 5);
    end;

    { $005A09FB..$005A0D03 [exact]
      Forester and Mountaineer apply to every Land Link unit. The stat package requires the current
      Fantastic flag; melee tests base attack and each breath tests current positive strength. }
    if U.EnchantmentFlags[EncLandLink] then
    begin
      U.forester := True;
      U.mountaineer := True;
      if U.Fantastic then begin
        Inc(U.defense, 2);
        Inc(U.defensebonus, 2);
        if B.attack > 0 then begin
          Inc(U.attack, 2);
          Inc(U.attackbonus, 2);
        end;
        if U.firebreath > 0 then
          Inc(U.firebreath, 2);
        if U.lightningbreath > 0 then
          Inc(U.lightningbreath, 2);
      end;
    end;

    { $005A0D03..$005A0E4B [exact]
      Holy Armor's two outcomes are mutually exclusive. Defense above 5 receives only To Block;
      Defense 5 or below receives only Defense and its display accumulator. }
    if U.EnchantmentFlags[EncHolyArmor] then
    begin
      if U.defense > 5 then
        Inc(U.defendchance, 10)
      else begin
        Inc(U.defense, 2);
        Inc(U.defensebonus, 2);
      end;
    end;

    { $005A0E4B..$005A100D [exact] }
    if U.EnchantmentFlags[EncOrihalcon] then
    begin
      if Ismagicalranged(U.rangedtype) then begin
        Inc(U.ranged, 2);
        Inc(U.rangedbonus, 2);
      end;
      Inc(U.resistance, 1);
      Inc(U.resistancebonus, 1);
    end;

    { $005A100D..$005A10EC [exact]
      Holy Arms derives Holy Weapon for the owning wizard's non-Fantastic units. }
    if (U.owner <> 15) and
       Wizards[U.owner].GlobalEnchantments[GEHolyArms] and
       (not B.Fantastic) then
      U.EnchantmentFlags[EncHolyWeapon] := True;

    { $005A10EC..$005A1217 [exact]
      Melee and Thrown always receive their channel bonus. Ranged receives it only when the current
      type is not already magical; EncMagic is then derived unconditionally. }
    if U.EnchantmentFlags[EncHolyWeapon] then
    begin
      Inc(U.hitchancemelee, 10);
      Inc(U.hitchancethrown, 10);
      if not Ismagicalranged(U.rangedtype) then
        Inc(U.hitchanceranged, 10);
      U.EnchantmentFlags[EncMagic] := True;
    end;

    { $005A1217..$005A1271 [exact] }
    if U.Fantastic then
      U.EnchantmentFlags[EncMagic] := True;

    { $005A1271..$005A1664 [exact]
      The loop's inclusive upper bound is the runtime byte at data-block +$3; each index is checked
      as 0..13. `k` is TD32's named local. For n active Chaos Surges, k becomes n+1 before the stat
      writes: eligible ranged/breath and Resistance gain n+1, while melee gains n+2. }
    if IsChaosUnit(i) then
    begin
      k := 0;
      for j := 0 to inferred_LastWizardIndex_DataBlockByte3 do
        if Wizards[j].GlobalEnchantments[GEChaosSurge] then
          Inc(k);
      if k > 0 then
      begin
        Inc(k);
        if U.rangedtype > 0 then begin
          Inc(U.ranged, k);
          Inc(U.rangedbonus, k);
        end;
        if U.firebreath > 0 then
          Inc(U.firebreath, k);
        if U.lightningbreath > 0 then
          Inc(U.lightningbreath, k);
        if B.attack > 0 then begin
          Inc(U.attack, k + 1);
          Inc(U.attackbonus, k + 1);
        end;
        Inc(U.resistance, k);
        Inc(U.resistancebonus, k);
      end;
    end;

    { $005A1664..$005A18AA [exact] }
    if U.Fantastic and (U.owner <> 15) and
       Wizards[U.owner].GlobalEnchantments[GESurvivalInstinct] then
    begin
      Inc(U.resistance, 2);
      Inc(U.resistancebonus, 2);
      Inc(U.defense, 1);
      Inc(U.defensebonus, 1);
      Inc(U.hitchance, 10);
    end;

    { $005A18AA..$005A1957 [exact] }
    if (U.owner <> 15) and
       Wizards[U.owner].GlobalEnchantments[GEClairvoyance] then
      U.forester := True;

    { $005A1957..$005A1E16 [exact]
      Inner Power requires either current Fire Immunity or Lightning Resistance. It does not alter
      Thrown. Melee tests base attack; ordinary ranged and both breaths test current strength. }
    if (U.owner <> 15) and (U.Fireimmunity or U.lightningresist) and
       Wizards[U.owner].GlobalEnchantments[GEInnerPower] then
    begin
      Inc(U.resistance, 2);
      Inc(U.resistancebonus, 2);
      Inc(U.defense, 2);
      Inc(U.defensebonus, 2);
      if B.attack > 0 then begin
        Inc(U.attack, 3);
        Inc(U.attackbonus, 3);
      end;
      if U.ranged > 0 then begin
        Inc(U.ranged, 3);
        Inc(U.rangedbonus, 3);
      end;
      if U.firebreath > 0 then
        Inc(U.firebreath, 3);
      if U.lightningbreath > 0 then
        Inc(U.lightningbreath, 3);
    end;

    { $005A1E16..$005A1F12 [exact]
      Every active Blazing Eyes copy is processed in wizard-index order. A zero Doom Gaze becomes 3;
      each later copy, or every copy when Doom Gaze was already nonzero, adds 1. }
    if IsChaosUnit(i) then
      for j := 0 to inferred_LastWizardIndex_DataBlockByte3 do
        if Wizards[j].GlobalEnchantments[GEBlazingEyes] then
        begin
          if U.doomgaze = 0 then
            Inc(U.doomgaze, 3)
          else
            Inc(U.doomgaze, 1);
        end;

    { $005A1F12..$005A212B [exact] }
    if (U.owner <> 15) and
       Wizards[U.owner].GlobalEnchantments[GEReinforceMagic] then
    begin
      Inc(U.resistance, 2);
      Inc(U.resistancebonus, 2);
      if Ismagicalranged(U.rangedtype) then begin
        Inc(U.ranged, 2);
        Inc(U.rangedbonus, 2);
      end;
    end;

    { $005A212B..$005A228C [exact]
      This later Wind Mastery block grants current Flying and adds one displayed movement point to
      both movement fields; it is distinct from the earlier persistent Hovering block. }
    if (U.owner <> 15) and
       Wizards[U.owner].GlobalEnchantments[GEWindMastery] then
    begin
      U.flying := True;
      Inc(U.overlandmaxmoves, 2);
      Inc(U.combatmaxmoves, 2);
    end;

    { $005A228C..$005A238A [exact]
      Eternal Night copies stack. Each caster's copy penalizes every non-Death unit not owned by that
      caster; the unit's owner is compared to the current loop index. }
    for j := 0 to inferred_LastWizardIndex_DataBlockByte3 do
      if Wizards[j].GlobalEnchantments[GEEternalNight] and
         (not IsDeathUnit(i)) and (U.owner <> j) then
      begin
        Dec(U.resistance, 1);
        Inc(U.resistancepenal, 1);
      end;

    { $005A238A..$005A2506 [exact]
      Signed division by four truncates toward zero. The local result is then clamped to a minimum of
      1 and reused for both the display accumulator and HP. }
    if (U.owner <> 15) and
       Wizards[U.owner].GlobalEnchantments[GECharmofLife] then
    begin
      k := U.hp div 4;
      if k < 1 then
        k := 1;
      Inc(U.goldhp, k);
      Inc(U.hp, k);
    end;

    { $005A2506..$005A2561 [exact] }
    if U.EnchantmentFlags[EncSanctify] then
      U.goldupkeep := 0;

    { $005A2561..$005A25F0 [exact] }
    if U.flying then
      U.scouting := Max(2, U.scouting);

    { $005A25F0..$005A273C [exact]
      NodeAuraType receives base plane, x and y. It returns 1 for the race-16 branch, 2 for race 17,
      and 3 for the Chaos predicate; other values do nothing. applynodeaura takes only unit index i. }
    j := Map.NodeAuraType(B.plane, B.overlandx, B.overlandy);
    case j of
      1: if U.race = 16 then
           applynodeaura(i);
      2: if U.race = 17 then
           applynodeaura(i);
      3: if IsChaosUnit(i) then
           applynodeaura(i);
    end;

    { $005A273C..$005A285E [inferred: event name]
      The Bad Moon state is the dword at runtime-data displacement $0AF90B10. }
    if (inferred_BadMoon_State <> 0) and B.incombat and (not B.Fantastic) then
    begin
      Dec(U.resistance, 3);
      Inc(U.resistancepenal, 3);
    end;

    { $005A285E..$005A2BB6 [inferred: event name]
      The Good Moon state is the dword at runtime-data displacement $0AF90B00. Attack and ranged
      gates read current strength. Both movement increments are one displayed point. }
    if (inferred_GoodMoon_State <> 0) and (not B.Fantastic) then
    begin
      Inc(U.defense, 1);
      Inc(U.defensebonus, 1);
      if U.attack > 0 then begin
        Inc(U.attack, 1);
        Inc(U.attackbonus, 1);
      end;
      if U.ranged > 0 then begin
        Inc(U.ranged, 1);
        Inc(U.rangedbonus, 1);
      end;
      Inc(U.combatmaxmoves, 2);
      Inc(U.overlandmaxmoves, 2);
    end;

    { $005A2BB6..$005A2F0E [inferred: event name]
      Nature Conjunction is the dword at runtime-data displacement $0AF90AF0. }
    if (inferred_NatureConjunction_State <> 0) and B.Fantastic then
    begin
      Inc(U.resistance, 2);
      Inc(U.resistancebonus, 2);
      Inc(U.defense, 2);
      Inc(U.defensebonus, 2);
      if U.attack > 0 then begin
        Inc(U.attack, 2);
        Inc(U.attackbonus, 2);
      end;
      if U.ranged > 0 then begin
        Inc(U.ranged, 2);
        Inc(U.rangedbonus, 2);
      end;
    end;

    { $005A2F0E..$005A2FF5 [inferred: one global semantic name]
      A base unit not marked in combat exits the entire remaining R5.1b target at $005A65B2. ownCG
      is TD32's named local and is exactly CGDefender (1) for the defender owner, otherwise
      CGAttacker (2). During strategic resolution, the byte at runtime-data displacement $0AFB8415
      can suppress current Flying and Invisible. }
    if not B.incombat then
      goto R5_1b_End;
    if U.owner = global_0070A22C^ then
      ownCG := CGDefender
    else
      ownCG := CGAttacker;
    if Preparecombat.IsStrategic and inferred_StrategicSuppressAirAndInvisibility then
    begin
      U.flying := False;
      U.invisible := False;
    end;

    { $005A2FF5..$005A3402 [exact]
      The combat-global record is reached through $0070969C with a $190-byte side stride. The tested
      dwords use effective displacements -$16C (High Prayer) and -$174 (Prayer). High Prayer wins:
      when positive, control jumps over Prayer after applying its package. }
    if inferred_CombatGlobals[ownCG][CGHighPrayer] > 0 then
    begin
      Inc(U.resistance, 3);
      Inc(U.resistancebonus, 3);
      Inc(U.defense, 2);
      Inc(U.defensebonus, 2);
      Inc(U.hitchance, 10);
      Inc(U.defendchance, 10);
      if B.attack > 0 then begin
        Inc(U.attack, 2);
        Inc(U.attackbonus, 2);
      end;
    end
    else if inferred_CombatGlobals[ownCG][CGPrayer] > 0 then
    begin
      Inc(U.hitchance, 10);
      Inc(U.defendchance, 10);
      Inc(U.resistance, 1);
      Inc(U.resistancebonus, 1);
    end;

    { $005A3402..$005A376D [inferred: configured-global bindings]
      Blazing March is the combat-global dword at effective displacement -$17C. Its configured
      magnitudes are loaded through $00709564 (Attack), $0070945C (Thrown), $0070A0CC (both Breath),
      and $00707FDC (missile Ranged). EncMagic is derived whenever the combat global is active. }
    if inferred_CombatGlobals[ownCG][CGBlazingMarch] > 0 then
    begin
      if B.attack > 0 then begin
        Inc(U.attack, BlazingMarchAttackBonus);
        Inc(U.attackbonus, BlazingMarchAttackBonus);
      end;
      if U.thrown > 0 then
        Inc(U.thrown, BlazingMarchThrownBonus);
      if U.firebreath > 0 then
        Inc(U.firebreath, BlazingMarchBreathBonus);
      if U.lightningbreath > 0 then
        Inc(U.lightningbreath, BlazingMarchBreathBonus);
      if Ismissileranged(U.rangedtype) then begin
        Inc(U.ranged, BlazingMarchMissileRangedBonus);
        Inc(U.rangedbonus, BlazingMarchMissileRangedBonus);
      end;
      U.EnchantmentFlags[EncMagic] := True;
    end;

    { $005A376D..$005A3DDE [inferred: configured-global bindings]
      Breakthrough is the combat-global dword at effective displacement -$154. The configured globals
      are $00709B84 (AffectRanged), $007081FC/$00709444 (normal Attack/Defense),
      $00709FD8/$00708D9C (Noncorporeal Attack/Defense), and $00709390/$00708128
      (combat-summoned Attack/Defense).

      The three packages are structurally independent. A qualifying Noncorporeal combat summon can
      therefore receive both the second and third packages. }
    if inferred_CombatGlobals[ownCG][CGBreakthrough] > 0 then
    begin
      { Normal, non-Fantastic, non-summoned package. An ammunition-using ranged unit is admitted only
        when BreakthroughAffectRanged is positive; units without that combination reach this package
        without consulting the option. }
      if ((not ((U.ranged > 0) and (U.ammo > 0))) or
          (BreakthroughAffectRanged > 0)) and
         (not U.combatsummoned) and (not B.Fantastic) then
      begin
        if B.attack > 0 then begin
          Inc(U.attack, BreakthroughAttackBonus);
          Inc(U.attackbonus, BreakthroughAttackBonus);
        end;
        Inc(U.defense, BreakthroughDefenseBonus);
        Inc(U.defensebonus, BreakthroughDefenseBonus);
        U.wallcrusher := True;
      end;

      if U.noncorporeal then
      begin
        if B.attack > 0 then begin
          Inc(U.attack, BreakthroughAttackBonus2);
          Inc(U.attackbonus, BreakthroughAttackBonus2);
        end;
        Inc(U.defense, BreakthroughDefenseBonus2);
        Inc(U.defensebonus, BreakthroughDefenseBonus2);
      end;

      if U.combatsummoned then
      begin
        if B.attack > 0 then begin
          Inc(U.attack, BreakthroughAttackBonus3);
          Inc(U.attackbonus, BreakthroughAttackBonus3);
        end;
        Inc(U.defense, BreakthroughDefenseBonus3);
        Inc(U.defensebonus, BreakthroughDefenseBonus3);
      end;
    end;

    { $005A3DDE..$005A3E33 [exact]
      Mass Invisibility is the owning side's combat-global dword at effective displacement -$184. }
    if inferred_CombatGlobals[ownCG][CGMassInvisibility] > 0 then
      U.invisible := True;

    { $005A3E33..$005A3ED0 [exact]
      Warp Reality is the combat-global dword at effective displacement -$178. It affects a
      non-Chaos unit when either side has the effect; the owning-side test short-circuits the
      opposing-side lookup. }
    if ((inferred_CombatGlobals[ownCG][CGWarpReality] > 0) or
        (inferred_CombatGlobals[3 - ownCG][CGWarpReality] > 0)) and
       (not IsChaosUnit(i)) then
      Dec(U.hitchance, 20);

    { $005A3ED0..$005A4183 [exact]
      Black Prayer is read from the opposing side at effective displacement -$158. Its attack,
      ranged and Defense writes are unconditional: unlike Darkness below, it can drive a current
      strength below zero. }
    if inferred_CombatGlobals[3 - ownCG][CGBlackPrayer] > 0 then
    begin
      Dec(U.defense, 1);
      Inc(U.defensepenal, 1);
      Dec(U.attack, 1);
      Inc(U.attackpenal, 1);
      Dec(U.thrown, 1);
      Dec(U.firebreath, 1);
      Dec(U.lightningbreath, 1);
      Dec(U.ranged, 1);
      Inc(U.rangedpenal, 1);
      Dec(U.resistance, 2);
      Inc(U.resistancepenal, 2);
    end;

    { $005A4183..$005A4938 [exact]
      Darkness is the combat-global dword at effective displacement -$168. The routine first scans
      every wizard for Eternal Night. Any copy changes k from 1 to 2 and independently admits this
      block even when neither side's combat-global Darkness dword is positive.

      Race 19 receives the Life-unit penalty once. Death units receive their positive attack and
      Defense package k times, but Resistance is deliberately outside that loop and increases only
      once. Positive-strength guards exist on all five attack channels in both race branches. }
    k := 1;
    for n := 0 to inferred_LastWizardIndex_DataBlockByte3 do
      if Wizards[n].GlobalEnchantments[GEEternalNight] then
        k := 2;

    if (inferred_CombatGlobals[ownCG][CGDarkness] > 0) or
       (inferred_CombatGlobals[3 - ownCG][CGDarkness] > 0) or
       (k = 2) then
    begin
      if U.race = 19 then
      begin
        if U.attack > 0 then begin
          Dec(U.attack, 1);
          Inc(U.attackpenal, 1);
        end;
        if U.ranged > 0 then begin
          Dec(U.ranged, 1);
          Inc(U.rangedpenal, 1);
        end;
        if U.thrown > 0 then
          Dec(U.thrown, 1);
        if U.firebreath > 0 then
          Dec(U.firebreath, 1);
        if U.lightningbreath > 0 then
          Dec(U.lightningbreath, 1);
        if U.defense > 0 then begin
          Dec(U.defense, 1);
          Inc(U.defensepenal, 1);
        end;
        if U.resistance > 0 then begin
          Dec(U.resistance, 1);
          Inc(U.resistancepenal, 1);
        end;
      end;

      if IsDeathUnit(i) then
      begin
        for j := 1 to k do
        begin
          if U.attack > 0 then begin
            Inc(U.attack, 1);
            Inc(U.attackbonus, 1);
          end;
          if U.ranged > 0 then begin
            Inc(U.ranged, 1);
            Inc(U.rangedbonus, 1);
          end;
          if U.thrown > 0 then
            Inc(U.thrown, 1);
          if U.firebreath > 0 then
            Inc(U.firebreath, 1);
          if U.lightningbreath > 0 then
            Inc(U.lightningbreath, 1);
          Inc(U.defense, 1);
          Inc(U.defensebonus, 1);
        end;
        Inc(U.resistance, 1);
        Inc(U.resistancebonus, 1);
      end;
    end;

    { $005A4938..$005A4ACF [exact]
      The global defender owner at $0070A22C must be a real wizard, must own this unit, and the
      settlement-state dword at $00709F14 must be positive. Retort byte 8 is Guardian. }
    if (global_0070A22C^ <> 15) and
       (U.owner = global_0070A22C^) and
       (global_00709F14^ > 0) and
       Wizards[global_0070A22C^].Retorts[8 { Guardian }] then
    begin
      Inc(U.hitchance, 10);
      Inc(U.defendchance, 10);
      Inc(U.resistance, 1);
      Inc(U.resistancebonus, 1);
    end;

    { $005A4ACF..$005A4C15 [inferred: configured-global binding]
      Entangle is read from the opposing side at effective displacement -$18C. The configured
      movement reduction is the dword through $00708198. Noncorporeal units bypass it. }
    if (inferred_CombatGlobals[3 - ownCG][CGEntangle] > 0) and
       (not U.noncorporeal) then
    begin
      Dec(U.combatmaxmoves, EntangleMovementReduction);
      if U.combatmaxmoves < 0 then
        U.combatmaxmoves := 0;
    end;

    { $005A4C15..$005A4D2B [exact]
      These are ordered lower bounds on the current combat-movement field. }
    if U.EnchantmentFlags[EncFlight] and (U.combatmaxmoves < 6) then
      U.combatmaxmoves := 6;
    if U.EnchantmentFlags[EncCCFlight] and (U.combatmaxmoves < 4) then
      U.combatmaxmoves := 4;

    { $005A4D2B..$005A4DD2 [exact]
      Haste doubles the already modified combat movement, including Entangle and the flight floors. }
    if U.EnchantmentFlags[EncHaste] then
      U.combatmaxmoves := U.combatmaxmoves * 2;

    { $005A4DD2..$005A4E66 [exact] }
    if U.EnchantmentFlags[EncVertigo] then
    begin
      Dec(U.hitchance, 25);
      Dec(U.defendchance, 7);
    end;

    { $005A4E66..$005A5023 [exact]
      Weakness has no positivity gates and no breath writes. }
    if U.EnchantmentFlags[EncWeakness] then
    begin
      Dec(U.attack, 3);
      Inc(U.attackpenal, 3);
      Dec(U.ranged, 3);
      Inc(U.rangedpenal, 3);
      Dec(U.thrown, 3);
    end;

    { $005A5023..$005A5338 [exact]
      Mind Storm likewise has no positivity gates and leaves both breath fields untouched. }
    if U.EnchantmentFlags[EncMindStorm] then
    begin
      Dec(U.attack, 3);
      Inc(U.attackpenal, 3);
      Dec(U.ranged, 5);
      Inc(U.rangedpenal, 5);
      Dec(U.thrown, 5);
      Dec(U.defense, 5);
      Inc(U.defensepenal, 5);
      Dec(U.resistance, 5);
      Inc(U.resistancepenal, 5);
    end;

    { $005A5338..$005A55DB [exact]
      Signed integer division truncates toward zero. For melee and ranged, the display penalty is
      assigned to old value minus trunc(old value / 2), then the live strength itself is divided by
      two. Thrown and both breath strengths are divided without a display-penalty write. }
    if U.EnchantmentFlags[EncWarpAttack] then
    begin
      U.attackpenal := U.attack - (U.attack div 2);
      U.attack := U.attack div 2;
      U.rangedpenal := U.ranged - (U.ranged div 2);
      U.ranged := U.ranged div 2;
      U.thrown := U.thrown div 2;
      U.firebreath := U.firebreath div 2;
      U.lightningbreath := U.lightningbreath div 2;
    end;

    { $005A55DB..$005A56F3 [exact]
      Defense penalty is assigned old Defense minus trunc(old Defense / 3); the live field is then
      divided by three. }
    if U.EnchantmentFlags[EncWarpDefense] then
    begin
      U.defensepenal := U.defense - (U.defense div 3);
      U.defense := U.defense div 3;
    end;

    { $005A56F3..$005A57C0 [exact] }
    if U.EnchantmentFlags[EncWarpResist] then
    begin
      U.resistancepenal := U.resistance;
      U.resistance := 0;
    end;

    { $005A57C0..$005A585E [inferred: city-field alias]
      $00709F14 supplies the current settlement index. The byte tested in that settlement's
      $7B8-byte record is at effective displacement $ADADDC4 and is signed: a value greater than
      -1 means Flying Fortress is present. Only units owned by the global defender qualify. }
    if (U.owner = global_0070A22C^) and
       (global_00709F14^ > 0) and
       (inferred_Cities[global_00709F14^].FlyingFortress_at_ADADDC4 > -1) then
      U.flying := True;

    { $005A585E..$005A5BB9 [exact]
      Shatter runs after the Warps. For melee and ranged it first adds current strength minus one to
      the existing display penalty, thereby retaining the earlier Warp penalty, and only then forces
      a positive live strength to one. The other three attack channels have no penalty accumulator. }
    if U.EnchantmentFlags[EncShatter] then
    begin
      U.attackpenal := U.attackpenal + U.attack - 1;
      if U.attack > 0 then
        U.attack := 1;
      U.rangedpenal := U.rangedpenal + U.ranged - 1;
      if U.ranged > 0 then
        U.ranged := 1;
      if U.thrown > 0 then
        U.thrown := 1;
      if U.firebreath > 0 then
        U.firebreath := 1;
      if U.lightningbreath > 0 then
        U.lightningbreath := 1;
    end;

    { $005A5BB9..$005A5CC7 [exact] }
    if U.EnchantmentFlags[EncWeb] then
      U.flying := False;
    if U.EnchantmentFlags[EncFrozen] then
      U.flying := False;
    if U.EnchantmentFlags[EncBlackSleep] then
      U.flying := False;

    { $005A5CC7..$005A5D36 [inferred: configured-global binding]
      Terror is read from the opposing side at effective displacement -$160. Its magnitude is the
      configured dword through $0070930C. }
    if inferred_CombatGlobals[3 - ownCG][CGTerror] > 0 then
      Dec(U.hitchance, TerrorHitchancePenalty);

    { $005A5D36..$005A607F [inferred: city-field aliases]
      A positive current-settlement index admits an ordered, short-circuit realm selection. The five
      signed city bytes at effective displacements $ADADDC5..$ADADDC9 use greater than -1 as the
      ward-present test. Race 16 is Nature, race 17 Sorcery, race 19 Life; Death and Chaos use their
      predicates. When more than one classification could theoretically match, the order below is
      the actual precedence. }
    if global_00709F14^ > 0 then
    begin
      if ((U.race = 16) and
          (inferred_Cities[global_00709F14^].NatureSpellWard_at_ADADDC5 > -1)) or
         ((U.race = 19) and
          (inferred_Cities[global_00709F14^].LifeSpellWard_at_ADADDC8 > -1)) or
         (IsDeathUnit(i) and
          (inferred_Cities[global_00709F14^].DeathSpellWard_at_ADADDC9 > -1)) or
         (IsChaosUnit(i) and
          (inferred_Cities[global_00709F14^].ChaosSpellWard_at_ADADDC7 > -1)) or
         ((U.race = 17) and
          (inferred_Cities[global_00709F14^].SorcerySpellWard_at_ADADDC6 > -1)) then
      begin
        Dec(U.hitchance, 20);
        Dec(U.defense, 3);
        Inc(U.defensepenal, 3);
        Dec(U.resistance, 3);
        Inc(U.resistancepenal, 3);
      end;
    end;

    { $005A607F..$005A6135 [inferred: sight-byte aliases]
      Illusion Immunity is converted into a side-wide combat sight flag. The two owner comparisons
      are independent; $0070A22C is the defender owner and $007092AC the attacker owner. }
    if U.illusionimmunity then
    begin
      if U.owner = global_0070A22C^ then
        inferred_CombatState.IllusionSight_Defender_at_322 := True;
      if U.owner = global_007092AC^ then
        inferred_CombatState.IllusionSight_Attacker_at_323 := True;
    end;

    { $005A6135..$005A65B2 [exact]
      Neutral owner 15 bypasses the wizard-record lookup. Retort byte 6 is Tactician. Heroes receive
      four +2 packages. The melee eligibility gate deliberately reads persistent B.attack, whereas
      the ranged gate reads the already modified current U.ranged. Non-heroes receive only +1
      Defense. }
    if (U.owner <> 15) and Wizards[U.owner].Retorts[6 { Tactician }] then
    begin
      if U.ishero then
      begin
        Inc(U.defense, 2);
        Inc(U.defensebonus, 2);
        Inc(U.resistance, 2);
        Inc(U.resistancebonus, 2);
        if B.attack > 0 then begin
          Inc(U.attack, 2);
          Inc(U.attackbonus, 2);
        end;
        if U.ranged > 0 then begin
          Inc(U.ranged, 2);
          Inc(U.rangedbonus, 2);
        end;
      end
      else
      begin
        Inc(U.defense, 1);
        Inc(U.defensebonus, 1);
      end;
    end;

    R5_1b_End:
    { $005A65B2 is the boundary immediately before the late UnitCalc script-hook test. }

    { $005A65B2..$005A65DC [exact hook boundary]
      Call sites:
        $005A65C9 -> @Scripts@SetScriptNumVar ($00590CF0)
        $005A65D7 -> @Scripts@RunScript      ($00582C14)
      Handle global $00708F68 is loaded by @Init@GameInitialize from
      MODDING.INI [Scripts] UnitRecalculate, default "UnitCalc".
      The branch/call inventory and coverage ledger are in
      Units.RecalculateUnits.R5.1a-late-hook.evidence.md. }
    if global_UnitRecalculateEnabledPtr^ then
    begin
      inferred_SetScriptUnitVariable(i);
      inferred_RunUnitScript(global_UnitCalcHandlePtr^);
    end;

    { $005A65DC..$005A681C [exact control/writes; inferred field bindings]
      Region-e final clamps. `hitchance` is clamped first; each channel stores
      a modifier whose sum with hitchance is then clamped. Completion evidence:
      Units.RecalculateUnits.R5.1c-a.evidence.md. }
    if U.hitchance > 100 then
      U.hitchance := 100;
    if U.hitchance < 10 then
      U.hitchance := 10;

    if U.hitchanceranged + U.hitchance > 100 then
      U.hitchanceranged := 100 - U.hitchance;
    if U.hitchancemelee + U.hitchance > 100 then
      U.hitchancemelee := 100 - U.hitchance;
    if U.hitchancethrown + U.hitchance > 100 then
      U.hitchancethrown := 100 - U.hitchance;
    if U.hitchancebreath + U.hitchance > 100 then
      U.hitchancebreath := 100 - U.hitchance;

    if U.hitchanceranged + U.hitchance < 10 then
      U.hitchanceranged := 10 - U.hitchance;
    if U.hitchancemelee + U.hitchance < 10 then
      U.hitchancemelee := 10 - U.hitchance;
    if U.hitchancethrown + U.hitchance < 10 then
      U.hitchancethrown := 10 - U.hitchance;
    if U.hitchancebreath + U.hitchance < 10 then
      U.hitchancebreath := 10 - U.hitchance;

    if U.defense < 0 then U.defense := 0;
    if U.attack < 0 then U.attack := 0;
    if U.ranged < 0 then U.ranged := 0;
    if U.thrown < 0 then U.thrown := 0;
    if U.firebreath < 0 then U.firebreath := 0;
    if U.lightningbreath < 0 then U.lightningbreath := 0;
  end;

  { $005A6822 calls the fully reconstructed real helper
    @Units@BuildAuraTable at $005976CC. }
  BuildAuraTable;

  { $005A6827..$005A6FDF [exact control/writes; inferred aura names]
    The second loop repeats the base-record filters, then applies every
    same-owner aura whose plane/x/y matches either overland projection. }
  if Maxunits > 0 then
  for i := 1 to Maxunits do
  begin
    if B.dead then
      Continue;
    if com and not B.incombat then
      Continue;
    if tax <> -1 then
    begin
      if B.plane <> tap then Continue;
      if B.overlandx <> tax then Continue;
      if B.overlandy <> tay then Continue;
    end;

    if inferred_AuraCountPtr^ > 0 then
    for j := 1 to inferred_AuraCountPtr^ do
    begin
      A := @inferred_AuraTablePtr^[j];
      if Units[i].owner <> A.owner then
        Continue;
      if not unitonoverlandtile(i, A.plane, A.x, A.y) then
        Continue;

      P := @Units[i];
      case A.kind of
        0, inferred_AuraArmsmaster: ;

        inferred_AuraHolyBonus:
          begin
            Inc(U.resistance, A.value);
            Inc(U.resistancebonus, A.value);
            Inc(U.defense, A.value);
            Inc(U.defensebonus, A.value);
            if B.attack > 0 then
            begin
              Inc(U.attack, A.value);
              Inc(U.attackbonus, A.value);
            end;
            if B.ranged > 0 then
            begin
              Inc(U.ranged, A.value);
              Inc(U.rangedbonus, A.value);
            end;
          end;

        inferred_AuraGuidingBeacon:
          if U.ranged > 0 then
          begin
            Inc(U.ranged, A.value);
            Inc(U.rangedbonus, A.value);
          end;

        inferred_AuraPrayermaster:
          begin
            Inc(U.resistance, A.value);
            Inc(U.resistancebonus, A.value);
          end;

        inferred_AuraDivineBarrier:
          begin
            Inc(U.defense, A.value);
            Inc(U.defensebonus, A.value);
          end;

        inferred_AuraSoulLinker:
          if U.Fantastic then
          begin
            Inc(U.hitchance, A.value);
            Inc(U.defendchance, A.value);
          end;

        inferred_AuraSupplyCommander:
          if U.maxammo > 0 then
            Inc(U.maxammo, A.value);

        inferred_AuraLogistics:
          U.combatmaxmoves := U.combatmaxmoves + A.value;

        inferred_AuraLeadership:
          if not U.Fantastic then
          begin
            if B.attack > 0 then
            begin
              Inc(U.attack, A.value);
              Inc(U.attackbonus, A.value);
            end;
            if not Ismagicalranged(U.rangedtype) and (U.ranged > 0) then
            begin
              Inc(U.ranged, A.value div 2);
              Inc(U.rangedbonus, A.value div 2);
            end;
          end;

        inferred_AuraMisfortune:
          if not U.Fantastic then
          begin
            Dec(U.attack);
            Inc(U.attackpenal);
            Dec(U.defense);
            Inc(U.defensepenal);
            Dec(U.resistance);
            Inc(U.resistancepenal);
            if B.ranged > 0 then
            begin
              Dec(U.ranged);
              Inc(U.rangedpenal);
            end;
          end;
      else
        ;  { kinds above 10 jump to the aura-loop tail at $005A6FD3 }
      end;
    end;

    { $005A6FDF..$005A744B [exact control/writes; inferred combat-global name]
      Completion evidence, including every branch target, call, write and all
      six assigned ledgers: Units.RecalculateUnits.R5.1c-b.evidence.md. }
    if B.incombat then
    begin
      if U.owner = global_DefenderPtr^ then
        ownCG := CGDefender
      else
        ownCG := CGAttacker;

      if inferred_CombatGlobals[ownCG][CGSupremeLight] > 0 then
        if Ismagicalranged(U.rangedtype) or
           Ismagicalranged(B.rangedtype) or
           (U.race = RCLife) or
           (U.maxmp > 0) then
        begin
          if B.attack > 0 then
          begin
            Inc(U.attack, 2);
            Inc(U.attackbonus, 2);
          end;
          { Unlike melee, this gate reads the current record. }
          if U.ranged > 0 then
          begin
            Inc(U.ranged, 2);
            Inc(U.rangedbonus, 2);
          end;
          { Signed Delphi div truncates toward zero; the quotient is re-read
            and recomputed for the display-bonus write. }
          Inc(U.defense, U.resistance div 3);
          Inc(U.defensebonus, U.resistance div 3);
          U.EnchantmentFlags[EncSupremeLightRegen] := True;
        end;
    end;

    { $005A744B..$005A74FF [exact] }
    if U.mp > U.maxmp then
      U.mp := U.maxmp;

    { $005A74FF..$005A766E [exact]
      The full `sar / jns / adc` sequence at $005A761B..$005A7622 is Delphi's
      signed div 2, including its correction toward zero. }
    if (U.combatmaxmoves <> prevmaxmoves[i]) and not Immobile(i) then
    begin
      j := U.combatmaxmoves - prevmaxmoves[i];
      B.combatmovesleft :=
        B.combatmovesleft + ((2 - B.combatattacksdone) * j) div 2;
    end;

    { $005A766E..$005A76D0 [exact; global name established by TD32-named
      DebugInvis accessors and toggle routine] }
    if global_DebugInvisPtr^ then
    begin
      U.invisible := False;
      U.stealth := False;
    end;

    { $005A76D0..$005A789D [exact]
      Write order is material: Overdamage reads the old Totaldamage. }
    if (TotalHpLeft(i) <= 0) and not B.dead and not Iscombat then
    begin
      B.Overdamage :=
        B.Overdamage + B.Totaldamage - (HpPerFigure(i) * U.figures - 1);
      B.Totaldamage := HpPerFigure(i) * U.figures - 1;
    end;

    { $005A789D..$005A7A57 [exact]
      Restore no more deferred damage than leaves one hit point. }
    if (TotalHpLeft(i) > 1) and not B.dead and not Iscombat and
       (B.Overdamage > 0) then
    begin
      k := Min(TotalHpLeft(i) - 1, B.Overdamage);
      B.Totaldamage := B.Totaldamage + k;
      B.Overdamage := B.Overdamage - k;
    end;
  end;

  { $005A7A57..$005A7A63 [exact]
    The compiled loop tail increments i, decrements its hidden down-counter and
    branches to $005A6844 while entries remain. $005A7A63..$005A7A6C is the
    epilogue; $005A7A6C..$005A7A70 is the aligned short-string literal 'U'. }
end;

{==============================================================================
  TD32: @Heroes@HeroBonus
  VA: $005933E8, extent $F3 bytes
==============================================================================}
function HeroBonus(level, ability, ablevel: Integer): Integer; register;
begin
  { $005933E8..$005934DB [exact control/arithmetic; inferred table binding]
    The two tests are independent in the executable. Both divisions use
    `cdq; idiv`, so signed results truncate toward zero. }
  Result := 0;

  if ablevel = 1 then
    Result := Result +
      (inferred_HeroAbilityPtr^[ability].bonusmul * level) div
       inferred_HeroAbilityPtr^[ability].bonusdiv;

  if ablevel = 2 then
    Result := Result +
      (inferred_HeroAbilityPtr^[ability].bonusmul * 3 * level) div
      (inferred_HeroAbilityPtr^[ability].bonusdiv * 2);
end;

{==============================================================================
  TD32: @Units@AddtoAuraTable
  VA: $005973A4, extent $325 bytes
==============================================================================}
procedure AddtoAuraTable(uid, at, val, ow: Integer); register;
var
  i: Integer;
begin
  { $005973A4..$005976C9 [exact control/operands/writes; inferred aura type]
    Search key: projected overland tile, current Units owner, and aura kind.
    `ow` is not part of the search key; it is stored only on append. }
  i := 1;
  while i <= inferred_AuraCountPtr^ do
  begin
    if not unitonoverlandtile(
        uid,
        inferred_AuraTablePtr^[i].plane,
        inferred_AuraTablePtr^[i].x,
        inferred_AuraTablePtr^[i].y) then
    begin
      Inc(i);
      Continue;                                 { target $005973BC }
    end;

    if Units[uid].owner <> inferred_AuraTablePtr^[i].owner then
    begin
      Inc(i);
      Continue;                                 { target $005973BC }
    end;

    if inferred_AuraTablePtr^[i].kind <> at then
    begin
      Inc(i);
      Continue;                                 { target $005973BC }
    end;

    Break;                                      { fall through $005974DD }
  end;

  if inferred_AuraCountPtr^ < i then
  begin
    Inc(inferred_AuraCountPtr^);
    i := inferred_AuraCountPtr^;
    inferred_AuraTablePtr^[i].plane := BaseUnits[uid].plane;
    inferred_AuraTablePtr^[i].x := BaseUnits[uid].overlandx;
    inferred_AuraTablePtr^[i].y := BaseUnits[uid].overlandy;
    inferred_AuraTablePtr^[i].kind := at;
    inferred_AuraTablePtr^[i].owner := ow;
    inferred_AuraTablePtr^[i].value := val;
  end;

  if inferred_AuraTablePtr^[i].value < val then
    inferred_AuraTablePtr^[i].value := val;
end;

{==============================================================================
  TD32: @Units@BuildAuraTable
  VA: $005976CC, extent $883 bytes
==============================================================================}
procedure BuildAuraTable; register;
var
  i, j, baseowner, herotype: Integer;
begin
  { $005976CC..$00597F4F [exact control/calls; inferred semantic aura names]
    Completion evidence: Units.RecalculateUnits.R5.1c-c.evidence.md. }
  inferred_AuraCountPtr^ := 0;

  if Maxunits > 0 then
  for i := 1 to Maxunits do
  begin
    if BaseUnits[i].dead then
      Continue;                                 { target $00597F3F }

    { The calculated field gates each provider, but the aura value is read
      from BaseUnits. This calculated/base split is literal in the binary. }
    if Units[i].HolyBonus > 0 then
      AddtoAuraTable(
        i,
        inferred_AuraHolyBonus,
        BaseUnits[i].HolyBonus,
        Units[i].owner);

    if Units[i].EnchantmentFlags[EncMisfortune] then
      AddtoAuraTable(
        i,
        inferred_AuraMisfortune,
        1,
        Units[i].owner);

    if Units[i].ResistToAll > 0 then
      AddtoAuraTable(
        i,
        inferred_AuraPrayermaster,
        BaseUnits[i].ResistToAll,
        Units[i].owner);

    if not BaseUnits[i].ishero then
      Continue;                                 { target $00597F3F }
    { The executable deliberately repeats the dead test here. }
    if BaseUnits[i].dead then
      Continue;                                 { target $00597F3F }

    baseowner := BaseUnits[i].owner;
    herotype := BaseUnits[i].herotype;

    j := HeroBonus(
      Units[i].level,
      HADivineBarrier,
      Wizards[baseowner].Hero[herotype, HADivineBarrier]);
    if j > 0 then
      AddtoAuraTable(
        i, inferred_AuraDivineBarrier, j, Units[i].owner);

    j := HeroBonus(
      Units[i].level,
      HAGuidingBeacon,
      Wizards[baseowner].Hero[herotype, HAGuidingBeacon]);
    if j > 0 then
      AddtoAuraTable(
        i, inferred_AuraGuidingBeacon, j, Units[i].owner);

    j := HeroBonus(
      Units[i].level,
      HASoulLinker,
      Wizards[baseowner].Hero[herotype, HASoulLinker]);
    if j > 0 then
      AddtoAuraTable(
        i, inferred_AuraSoulLinker, j, Units[i].owner);

    { Supply Commander alone bypasses HeroBonus and contributes literal 2. }
    if Wizards[baseowner].Hero[herotype, HASupplyCommander] > 0 then
      AddtoAuraTable(
        i, inferred_AuraSupplyCommander, 2, Units[i].owner);

    j := HeroBonus(
      Units[i].level,
      HALogistics,
      Wizards[baseowner].Hero[herotype, HALogistics]);
    if j > 0 then
      AddtoAuraTable(
        i, inferred_AuraLogistics, j, Units[i].owner);

    j := HeroBonus(
      Units[i].level,
      HAPrayermaster,
      Wizards[baseowner].Hero[herotype, HAPrayermaster]);
    if j > 0 then
      AddtoAuraTable(
        i, inferred_AuraPrayermaster, j, Units[i].owner);

    j := HeroBonus(
      Units[i].level,
      HAArmsmaster,
      Wizards[baseowner].Hero[herotype, HAArmsmaster]);
    if j > 0 then
      AddtoAuraTable(
        i, inferred_AuraArmsmaster, j, Units[i].owner);

    j := HeroBonus(
      Units[i].level,
      HALeadership,
      Wizards[baseowner].Hero[herotype, HALeadership]);
    if j > 0 then
      AddtoAuraTable(
        i, inferred_AuraLeadership, j, Units[i].owner);
  end;
end;

{==============================================================================
  TD32: @Units@Immobile
  VA: $005951D4, extent $107 bytes
==============================================================================}
function Immobile(t: Integer): Boolean; register;
begin
  { $005951D4..$005952DB [exact control/reads; inferred field bindings] }
  Result := (Units[t].webleft > 0) or
            Units[t].EnchantmentFlags[EncStasisCombat] or
            Units[t].EnchantmentFlags[EncBlackSleep] or
            Units[t].EnchantmentFlags[EncBuried] or
            Units[t].EnchantmentFlags[EncFrozen];
end;

{==============================================================================
  TD32: @Units@TotalHpLeft
  VA: $00595354, extent $84 bytes
==============================================================================}
function TotalHpLeft(u: Integer): Integer; register;
begin
  { $00595354..$005953D8 [exact] }
  Result := HpPerFigure(u) * Units[u].figures - BaseUnits[u].Totaldamage;
end;

{==============================================================================
  TD32: @Combat@Iscombat
  VA: $005B9C54, extent $16 bytes
==============================================================================}
function Iscombat: Boolean; register;
begin
  { $005B9C54..$005B9C6A [exact; global identified by cross-reference] }
  Result := global_CombatPlanePtr^ <> -1;
end;

{==============================================================================
  TD32: @Units@HpPerFigure
  VA: $00595DB0, extent $74 bytes
==============================================================================}
function HpPerFigure(u: Integer): Integer; register;
begin
  { $00595DB0..$00595E24 [exact] }
  Result := Units[u].hp + Units[u].bonushp;
end;

{==============================================================================
  TD32: @Game@Min
  VA: $005FCF7C, extent $29 bytes
==============================================================================}
function Min(i, j: Integer): Integer; register;
begin
  { $005FCF7C..$005FCFA5 [exact signed comparison; ties return j] }
  if i < j then
    Result := i
  else
    Result := j;
end;

{==============================================================================
  TD32: @Map@unitonoverlandtile
  VA: $005D8CA0, extent $67 bytes
==============================================================================}
function unitonoverlandtile(u, checkplane, checkx, checky: Integer): Boolean;
  register;
begin
  { $005D8CA0..$005D8D07 [exact control; inferred parameter names]
    EAX=u, EDX=checkplane, ECX=checkx, stack=checky. The alternate
    coordinates match only on the plane opposite BaseUnits[u].plane. }
  if BaseUnits[u].dead then
    Result := False
  else if (checkx = BaseUnits[u].overlandx) and
          (checky = BaseUnits[u].overlandy) and
          (checkplane = BaseUnits[u].plane) then
    Result := True
  else if (checkx = BaseUnits[u].otherplanex) and
          (checky = BaseUnits[u].otherplaney) and
          (checkplane <> BaseUnits[u].plane) then
    Result := True
  else
    Result := False;
end;

{==============================================================================
  TD32: @Units@Ismagicalranged
  VA: $005963F4, extent $4C bytes
==============================================================================}
function Ismagicalranged(rt: Integer): Boolean; register;
begin
  { $005963F4..$00596440 [exact control/read; inferred table binding] }
  if rt < 1 then
    Result := False
  else
    Result := inferred_RangedTypesPtr^[rt].Ismagic;
end;

{==============================================================================
  TD32: @Castercore@RecalculateUnits
  VA: $00648718, extent $27 bytes
  Declared as inferred_ because the name is flattened; see the interface.
==============================================================================}
procedure inferred_Castercore_RecalculateUnits(com: Boolean; tap, tax, tay: Integer);
  register;
begin
  { $00648718..$0064873F [exact]
    Pure forwarding wrapper. It preserves the same register/stack argument
    order and calls @Units@RecalculateUnits at $00648734.
    Completion evidence: Castercore.RecalculateUnits.evidence.md. }
  RecalculateUnits(com, tap, tax, tay);
end;

{==============================================================================
  TD32: @Units@RecalculateunitsonCityTile
  VA: $005A8C6C, extent $96 bytes
==============================================================================}
procedure RecalculateunitsonCityTile(c: Integer); register;
begin
  { $005A8C6C..$005A8D02 [exact control/call]
    The three city-coordinate loads are Y, X, plane in push/register order.
    EAX = 0 at $005A8CF8, so the call selects the non-combat path.
    Completion evidence: Units.RecalculateunitsonCityTile.evidence.md. }
  RecalculateUnits(
    False,
    Cities[c].plane,
    Cities[c].x,
    Cities[c].y
  ); { call at $005A8CFA }
end;

end.
