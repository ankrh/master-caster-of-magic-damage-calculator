unit Typedec;

interface

uses SharedConstants;

Type Str30 = String[30];

Type DiplomacyT = record
Hostility : integer;
HostilityTimer : integer;
StartingRelation : integer;
Relation, HiddenRelation : integer;
HistiRelation : array[0..maxturns] of integer;
PeaceCounter, TreatyCounter,NoComplainCounter : integer;
Treaty : integer;
Contact : boolean;
Greeting : boolean;
TreatyInt,PeaceInt,TradeInt : integer;
ReactionStrength : integer;
ReactionType : integer;
ReactionParam1,ReactionParam2 : integer;
LastBrokenTreaty : integer;
RejectOfferType, RejectOfferParam1,RejectOfferParam2 : integer;
LastSpellTributed : integer;
WarningCounter : integer;
Escalatedwarning : boolean; // The warning also broke the treaty
SpellTradeList : array[1..4] of integer;
PactWarnings : integer;
LootedSpell,Extortedspell : boolean;
WarStarted : boolean;
EscalationBrokenTreaty : byte;
PLACEHOLDER : array[1..148] of byte;
end;

Type ItemT = record
             name : string[30];
             spellcharge,chargeamount : integer;
             it, icon : integer;
             named : boolean;
             powers : array[1..maxmaxitempowers] of boolean;
             PLACEHOLDER : array[1..44] of byte;
             end;

Type BookT = array[1..MaxRealm] of integer;
     RetortT = array[1..MaxRetorts] of boolean;
Type WizardT = record
  Books : BookT;
  Retorts : RetortT;
  Name : String[30];
  Portrait : integer;
  Personality, Objective : integer;
  PrimaryRealm : integer;
  FortressCity : integer;
  CircleCity : integer;
  banished : boolean;
  defeated : boolean;
  Treecast : boolean;
  StartingRace : integer;
  Flagcolor : integer;
  SP, Mana, Gold,Fame : integer;
  TaxRate : integer;
  PDMana,PDRes,PDSkill : integer;
  Diplomacy : array[0..maxmaxwizards] of DiplomacyT;
  GlobalEnchantments : array[1..maxmaxglobals] of boolean;
  SomCost : integer;
  Spells : array[1..maxmaxspells] of integer;
  RPSpent : array[1..maxmaxspells] of integer;
  PowerLinkGain : integer;
  MPtoget,sptoget,rptoget,goldtoget : integer;
  Hero : array[1..MaxMaxherotypes] of array[1..maxmaxheroability] of integer;
  HeroState : array[1..MaxMaxherotypes] of integer;
  HeroName : array[1..MaxMaxherotypes] of string[30];
  Vault : array[1..maxvault] of ItemT;
  CreatingItem : ItemT;
  HistorianPop,HistorianMili,HistorianPower,HistorianSpell,HistorianTotal : array[0..maxturns] of integer;
  HistorianPopRate,HistorianMiliRate,HistorianPowerRate,HistorianSpellRate,HistorianTotalRate : array[0..maxturns] of integer;
  // Spells
  Combatskill, Overlandskill : integer;  // Remaining amount, maximal is calcualted by function
  CurrentResearch, CurrentCasting : integer;
  OverlandSlider,CombatSlider : integer;
  OverlandSpellEffectiveCost : integer;
  ResearchDone, CastingDone : integer; // RP or casting already progressed on spell
  SpellBindingCooldown, SpellBindingUses : integer;
  // AI
  PowerDistributionTimer : integer;
  PDStrategy : integer;
  MainActionContinent : array[1..2] of integer;
  Notargetoncontinentreevaluatetimer : array[1..2,1..10000] of integer;
  WantToLeave : array[1..2,1..10000] of integer;
  AISoMCounter : integer;
  Frontiercity : integer;
  AISummoncycle : integer;
  AINofshippoints : array[1..2] of integer;
  AIShippointX : array[1..2,1..500] of integer;
  AIShippointY : array[1..2,1..500] of integer;
  MonsterTimer : integer;
  EliminationTurns : integer;
  GRares : array[1..20] of integer;
  Custom : array[1..100] of integer;
  PLACEHOLDER : array[1..499988] of byte;
end;

Type MapTileT = record
  Elevation : integer;
  LandType : integer;
  Corruption : boolean;
  OreType : integer;
  ContinentID : integer; // 0 = SEA
  Riverdirection : byte;
  Volcanoowner : integer;
  Scouted, Visible : boolean;
  Road : integer; // need 60 construction points = road exists.
  Purify : integer;
  opx,opy : integer;
  Custom : array[1..5] of byte;
  Placeholder : array[1..5] of byte;
end;

type TowerT = record
  owner : integer;
  x,y : array[1..nofplanes] of integer;
end;

type EventT = array[1..maxmaxevents] of record
     startturn : integer;
     val1,val2,val3 : integer; // various parameters
     end;

type NodeT = record
  plane,x,y,owner : integer;
  guardian : boolean;
  warpedby : shortint;
  noftiles : shortint;
  tilesx : array[1..25] of smallint;
  tilesy : array[1..25] of smallint;
  Influencer : array[1..3] of integer;
  Nodetype : shortint;
  Scoutedby : array[0..MaxMaxwizards] of boolean;
end;

Type SpellTradeListT = record
    spellID,spellvalue : array[1..maxmaxspells] of integer;
    Nofavailable : integer;
    end;

Type EnchFlagT = array[1..maxmaxenchantmentflag] of boolean;

type AttackFlagsT = record
doom,illusion,supernatural,armorpiercing,mysticsurge : boolean;
lifesteal,poison,destruction,stoningtouch,deathtouch,exorcise : boolean;
lifestealvalue,poisonvalue,destructionvalue,stoningtouchvalue,deathtouchvalue,exorcisevalue : integer;
placeholder : array[1..10] of integer;
end;

Type UnitUIT = record
    combatfacing : integer;
    coanix,coaniy, coaniframe,groundmerge : shortint; // combat movement animation
    end;

type unitT = record
  name : str30;
  attack, ranged : integer;
  rangedtype : integer;
  thrown : integer;
  firebreath,lightningbreath : integer;
  deathgaze,stoninggaze,doomgaze : integer;
  maxammo, ammo : integer;
  hitchance,defendchance : integer;
  hitchancethrown,hitchancebreath,hitchancemelee,hitchanceranged : integer;  // Additional chance to hit on top of the default for specific attacks
  defense,resistance : integer;
  expvalue : integer;
  goldupkeep : integer;
  manaupkeep : integer;
  foodupkeep : integer;
  race : integer;
  hp : integer;
  scouting : integer;
  figures : integer;
  roadbuilding : integer;
  savemodifier : integer;

  rqbuilding : array[1..3] of integer;
  famerequirement : integer;
  laircost : integer;
  productioncost : integer;

  aigroupingpriority : integer;
  aiproductionpriority : integer;
  aigarrisonpriority : integer;
  sound : word;

  Sailing,Waterwalking,flying,teleporting,forester,mountaineer,merging : boolean;
  Fireimmunity,stoningimmunity,missileImmunity,illusionimmunity,coldimmunity,magicimmunity,deathimmunity,poisonimmunity,weaponimmunity : boolean;
  transport : boolean;
  Lucky : boolean;
  Displayrace,immolation : boolean;
  fear : boolean;
  Fantastic,LargeShield,Planeshifting,wallcrusher,healer,createoutpost,invisible,createundead : boolean;
  longrange,quickcasting,meld,noncorporeal,windwalking,purify,negatefirststrike : boolean;
  firststrike, lightningresist, healingaura,bloodsucker: boolean;

  ishero : boolean;
  equip : array[1..3] of ItemT;

  Spellability : smallint;
  maxcharges,chargesleft : shortint;
  ResistToAll,HolyBonus : shortint;
  regeneration : shortint;
  attackflags, meleeflags,rangedflags : attackflagsT;

  overlandx,overlandy : integer;
  otherplanex,otherplaney : integer; // use while in towers
  overlandtox,overlandtoy,combattox,combattoy,disembarktox,disembarktoy : integer;
  settlertox,settlertoy : integer;
  plane : integer;
  overlandmaxmoves,overlandmovesleft : integer;

  cox,coy, unused1 {combatfacing} : integer;
  unused2,unused3,unused4,unused5
  {coanix,coaniy, coaniframe,groundmerge} : shortint; // combat movement animation
  combatmaxmoves : smallint;
  combatmovesleft : smallint;

  overlandcommand : shortint;
  level : shortint;
  experience : smallint;

  Totaldamage : smallint;
  Irrecoverabledamage : smallint;
  Undeaddamage : smallint;
  Overdamage : smallint;
  foughtalready : boolean;
  EnchantmentFlags : EnchFlagT;
  OverlandEnchantmentFlags : EnchFlagT;
  CombatEnchantmentFlags : EnchFlagT;
  ItemEnchantmentFlags : EnchFlagT;
  owner : shortint;
  combatattacksdone : shortint;
  PandoraBoxBudget : smallint;
  dead,fleeing,undeaded,irrecoverable,incombat : boolean;
  bonushp : smallint; // from draining effects
  goldhp : smallint; // hp icons that need to be displayed in bonus color
  maxmp, mp : smallint;
  suppression : smallint;
  unittype : smallint;
  herotype : smallint;
  webleft,confusioneffect : shortint;
  combatsummoned : boolean;
  laircontent : boolean;
  stasisnextturn : boolean;

  ainotdone : boolean;
  AIstayBehindWalls : boolean;
  Aicombatwaiting : boolean;
  Neutrallock : shortint;

  attackbonus,defensebonus,resistancebonus,rangedbonus : smallint; // needed for gold icons. calculate grey icons from difference between base and current
  attackpenal,defensepenal,resistancepenal,rangedpenal : smallint; // needed for gold icons. calculate grey icons from difference between base and current
  stopmove : boolean;
  egoism,darkforce,amplifier,stealth : boolean;
  custom : array[1..20] of integer;
  ignorepact: byte;
  multihead : boolean;
  createpower : byte;
  lairinvalid,rampageinvalid : boolean;
  counterimmunity : boolean;
  nohealing : boolean;
  eotheal,eothealperc : shortint;
  PLACEHOLDER : array[1..86] of byte;
end;

Type LairT = record
  plane : shortint;
  x,y : smallint;
  lairtype : shortint;
  gold,mana : integer;
  spell : smallint;
  picks : shortint;
  prisoner : boolean;
  defenders : array[1..2] of smallint;
  nofdefenders : array[1..2] of shortint;
  scouted : array[1..2] of boolean;
  nofitems : shortint;
  items : array[1..3] of smallint;
  towerlink : smallint;
  vial : boolean;
  fullscouted : boolean;
  PLACEHOLDER : array[1..98] of byte;
end;

Type CityT = record
  Name : string[30];
  Race,plane,Owner : shortint;
  x,y: smallint;
  Population : word;
  Farmers : shortint; // do not include minimalfarmers
  Soldbuilding : boolean;
  Razing : boolean;
  Scoutedby : array[0..MaxMaxwizards] of boolean;
  Queue : array[1..maxqueuesize] of smallint;
  Queuecount : shortint;
  ProductionDone : integer;
  Buildings : Array[1..{37}MaxMaxBuildings] of shortint;
  Enchantments : Array[1..MaxMaxCitybuffs] of shortint;
  Aidraftcounter : smallint;
  AIneedtosummon : boolean;
  RallyX, RallyY : smallint;
  new : boolean;
  AutoBuy : array[1..maxqueuesize] of boolean;
  Housingtradeloop : byte;
  Custom : array[1..100] of integer;
  PLACEHOLDER : array[1..999] of byte;
end;

Type GameDataType = record
  Difficulty : byte;
  Landsize : byte;
  Continentsize : byte;
  Maxwizards : byte;
  Climate : byte;
  Minerals : byte;
  MagicPower : byte;
  Wizards : array[0..MaxMaxwizards] of WizardT;
  Map : array[1..NofPlanes,1..MaxXArea,1..MaxYArea] of MapTileT;
  PlaneSizeX : array[1..NofPlanes] of smallint;
  PlaneSizeY : array[1..NofPlanes] of smallint;
  PlaneRatio : array[1..NofPlanes] of real;
  MaxContinent : array[1..Nofplanes] of smallint;
  MainSeed : longint;
  MaxTowers : integer;
  Towers : array[1..maxtowerslots] of TowerT;
  MaxNodes : longint;
  Nodes : array[1..maxnodeslots] of NodeT;
  Maxunits : integer;
  BaseUnits, Units : array[1..maxunitslots+1] of UnitT;
  Unittype : integer;
  Maxlairs : integer;
  Lairs : array[1..maxlairslots] of LairT;
  MaxCities : integer;
  Cities : array[1..maxCityslots] of CityT;
  TimeStopCounter : integer;
  CurrentTurn : integer;
  Events : EventT;
  LastEvent : integer;
  PredefinedUsed : array[1..maxpredefined*2] of boolean;
  RaiderTimer : integer;
  GrandVizier : boolean;
  VizierMilitary : boolean;
  nofchain : integer;
  chainship,chaincargo : array[1..maxunitslots] of smallint;
  options : array[1..MaxMaxgameoptions] of boolean;
  LastOverlandPage : integer;
  FinalWar : boolean;
  Version : byte;
  PLACEHOLDER : array[1..499992] of byte;
end;

    type UnittableT = array[0..Maxunittypesarraysize] of UnitT;
    type PredefinedT = array[1..maxpredefined*2] of ItemT;

type damageT = record
     irrec,undead,normal : integer;
     end;

type TileT = record
     x,y,plane : integer;
     end;

     str150 = string[250];

type CombatdataT = record
    CombatEnchantments : array[1..2,1..maxmaxcombatenchantments] of integer;
    DefenderIsland,Attackerisland : boolean;
    DefenderSight,AttackerSight : boolean; // Who can see invisible units
    CastingAvailable : boolean; // Human player hasn't used a spell yet
    Terrain : array[1..CSX,1..CSY] of integer;
    Road, River, Reverseflow,Ismud : array[1..CSX,1..CSY] of boolean;
    RoadFlowX,RoadFlowY, Rivertiletype : array[1..CSX,1..CSY] of integer;
    Turn,LastAIAction : integer;
    attackerturn : boolean;
    Selectedunit : integer;
    allimmobilized : boolean;
    Wallstate : array[1..12] of integer;
    CombatEndPhase : integer;
    HadesID : integer;
    HadesDamage : integer;
    Fortligstr : integer;
    Callligcounter : integer;
    VortexCounter : integer;
    VortexStepCounter : integer;
    NofVortex : array[1..2] of integer;
    Aiturninit : boolean;
    VortexX,Vortexy, Vortexprevdir : array[1..2,1..maxvortex] of integer;
    AIUnitOrder : integer;
    Auto : integer;
    LastAISpellTurn : integer;
    Skyfire : array[1..2,1..NofSkyFire] of integer;
    end;

type CombatresultT = record
     attackerlossrate : real;
     defenderlossrate : real;
     endtype : integer;
     winner : integer;
     end;

type ScriptT = record
    name : string[80];
    data : pointer;
    datasize : integer;
    end;

Type ItempowerT = record
                       name : string[30];
                       longname : string[40];
                       help : string[30];
                       AllowedItem : array[1..maxitemtypes] of boolean;
                       Af :  boolean;
                       AIvalue,AICreationPrio : integer;
                       pri : array[1..4] of integer;
                       group,realm, books : integer;
                       cost : integer;
                       powername : string[30];
                       end;

Type HeroAbilityT =  record
name : string;
helpentry : string;
bonusmul,bonusdiv : integer;
super : boolean;
scaling : boolean;
heroclass : integer;
icon : integer;
vialmin,vialmax : integer;
end;

Type OreTableT = array[1..10,1..1+3*NofPlanes*(Maxminerals-1)] of integer;

      Type BuildingT = record
      name : shortstring;
      Requires1, Requires2,Replaces, Upkeep, Cost : integer;
      needtree : boolean;
      AIBuyPrio,AIEarlyBuyPrio : integer;
      scouting : integer;
      fortress,outpost : boolean;
      end;

Type SpellTableT = array[0..MaxMaxspells] of record
name : string[30];
Rarity : integer;
AICat : integer;
AItrade: integer;
SpellGroup : integer;
Category : integer;
Realm : integer;
Loc,CCost, RCost : integer;
Disabled : boolean;
Attack,savepen : integer;
Illusion,Doom,Piercing,Lightning,Area : boolean;
Poison,Fire,Cold,Missile,Stoning,Death,Nonmagic,Corporeal : boolean;
Nonhero : boolean;
hitchance : integer;
Undeadpen,fantasticpen,normalpen : integer;
treasureoverride : integer;
invalidtreasure : boolean;
aiwatermove : boolean;
iscustom : boolean;
customanimation, custompriority, customprioritycombat, custompriorityspecial, customsound : integer;
summonedunit : integer;
EnchantmentID : integer;
irrecoverable, undeaddamage, spellblastneeded : boolean;
ACEffect : array[1..NofACEffects] of integer;
end;

Unitlist = record
           UIDs : array[1..maxunitslots] of integer;
           NofUnits : integer;
           end;

Herolist = record
           HeIDs : array[1..maxunitslots] of integer;
           NofHeroes : integer;
           end;

SpellList = record
           SIDs : array[1..maxunitslots] of integer;
           NofSpells : integer;
           end;

Type UnitList9 = array[1..9] of integer;

     BuildingListT = array[1..maxmaxbuildings] of integer;

Type CombatReportDataT = record
                       winner,loser,attacker,defender : integer;
                       endtype,combattype : integer;
                       HumanFameGain : integer;
                       HumanGoldGain : integer;
                       Populationloss : integer;
                       NofDestroyedbuildings : integer;
                       FleeingDied : integer;
                       DestroyedBuildings : BuildingListT;
                       WinnerExp : integer;
                       end;

    Type MovingStackDataT = record
    MovingStackSize : integer;
    MovingUnits : array[1..9] of integer;
    movingstackZeromoveunit,movingstackShip : integer;
    NotMovingStackSize : integer;
    NotMovingUnits : array[1..9] of integer;
    waterwalk,sailing,flying,mountaineer,forester,pathfinding,windwalking,noncorporeal,planeshifting : boolean;
    end;

implementation

end.
