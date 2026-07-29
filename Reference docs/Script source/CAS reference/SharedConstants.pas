unit SharedConstants;

interface

Const VERSION = '1.05.00, 2023-06-21';
      Fulldebugtestuntil = 1;    // Debug feature

Const MaxMaxGameOptions=100;
Const MaxWizardPortraits=14;
Const MaxRetorts = 18;
Const MaxItemtypes = 10;    // Sword, Armor, Accessory etc
Const MaxMaxWizards = 13;   // Highest amount of supported AI wizards in a game (player 0 is always the human player)
Const Maxqueuesize = 100;   // Maximal amount of entires in building queues
Const Maxunitslots = 39999;
Const Maxcityslots = 1000;
Const Maxunittypesarraysize = 400; // Highest amount of different unit types supported
Const MaxHeroes = 6; // Maximal heroes per player
Const NofPlanes = 2;
Const MaxMaxBuildings = 100; // Maximal amount of building types supported in the game (with modding)
Const MaxMaxitempowers = 150; // Maximal amount of different item powers supported (with modding)
Const MaxMaxherotypes = 85; // Maximal different type of hero units supported (with modding)
Const MaxMaxspells = 400; // Maximal amount of spells supported (with modding)
Const MaxMaxraces = 100; // Maximal amount of races supported (with modding)
Const maxturns = 10000; // Highest overland game turn
Const CSX = 29; // Combat map size X
Const CSY = 29; // Combat map size Y
Const MaxMaxlevel=20; // Highest maximal unit or hero level with modding
Const MaxMaxGlobals = 100; // Highest amount of global enchantments with modding
Const MaxMaxEnchantmentFlag = 100;  // Same for unit enchantments
Const MaxMaxCityBuffs = 100; // And city enchantments
Const Maxmaxcombatenchantments = 100;
Const MaxRealm = 5;
Const NeutralplayerID = 15;
Const MaxDifficulty=9;
Const MaxLandSize=8;
Const MaxMagicPower=6;
Const MaxClimate=6;
Const MaxMinerals=4;
Const MaxContSizes=6;
Const MaxLandtype = 16;
Const Maxpersonality = 6;
Const Maxobjective = 6;
Const MaxOreType = 12;
Const Maxvault = 8; // Available space in wizard valuts
Const MaxVortex = 3; // Maximal allowed magic vortexes per player
Const MaxMaxrangedtype=100; // Highest ranged type valid on a unit (RangedType.INI)
Const maxitemslottypes=6;
Const maxpredefined = 250;
Const CastedFromItem = -999999; // Add this to Caster value if an item or ability is used from a unit
      maxmaxheroability = 50;
      MaxMaxevents = 100;
      // map size
      MaxXArea = 200;
      MaxYArea = 200;
      maxtowerslots  = 18;
      maxnodeslots = 300;
      maxlairslots = 1000;
      NofSkyFire = 3; // Number of Sky Fire Bolts
      NofACEffects=7;
Const Dirx: array [1 .. 4] of integer = (1, 0, -1, 0); // Map processing
      Diry: array [1 .. 4] of integer = (0, 1, 0, -1);
      RealmNames : array[1..Maxrealm+1] of shortString = ('Nature','Sorcery','Chaos','Life','Death','Arcane');

      // Ranged attack types
Const RTRock = 10;
      RTArrow = 20;
      RTSling = 21;
      RTLightning = 30;
      RTFire = 31;
      RTIllusion = 32;
      RTDeath = 33;
      RTSorcery = 34;
      RTShaman = 35;
      RTDrow = 36;
      RTNature = 37;
      RTDruid = 38;
      RTSpell = 39;

      // Lair Types
      LATTower=1;
      LATNatureNode=2;
      LATSorceryNode=3;
      LATChaosNode=4;
      LATLair=5;
      LATCave=6;
      LATRuin=7;
      LATTemple=8;
      LATStonehenge=9;
      LATKeep=10;
      LATDungeon=11;
      MaxLairtypes=11;

// Overland unit orders
Const OONone = 0;
      OOPatrol = 1;
      OOWait = 2;
      OOGoing = 3;
      OORoadBuilding = 4;
      OOMeld = 5;
      OOPurify = 6;
      OOSettle = 7;

//-----------------------------------
// Diplomacy
//-----------------------------------

      TSNone = 0;
      TSPact = 1;
      TSAlliance = 2;
      TSWar = 3;

      // Treaty offers
      TOPact = 1;
      TOAlliance = 2;
      TOPeace = 3;
      TODeclareWar = 4;
      TOBreakAlliance = 5;

      // Diplomatic reactions (DR - the AI contacts the AI of their own will. DA - The AI answers the player's request(s).

      DRTreatyBrokenByAttacking = 1;
      DRKilledTroops = 2;
      DRAttackedCity = 3;
      DRCityCursed = 5;
      DRGlobalEnchantment = 6;
      DRDispelled = 7;
      DRAllianceGoldBonus = 8;
      DRMutualEnemy = 9;
      DRSpellOfMastery = 10;
      DRCountered = 12;
      DRAIPositive = 13;

      DRSomWarDeclaration = 11;
      DRChaoticWar = 14;
      DRWarDeclarationConquerCity =4;
      DRMilitaristWar = 15;
      DRGenericWar = 16;
      DRAlliedWar = 17;
      DRRelationWar = 18;
      DRRepeatWarningWar = 26;

      DRMilitaristTreatyBreak = 19;
      DRGenericTreatyBreak = 20;
      DRAlliedTreatyBreak = 21;
      DRRelationTreatyBreak = 22;
      DREnteredTerritoryWarning = 24;
      DREnteredTerritorytreatyBreak = 25;

      DRGreetingMessage = 23;
      DRPeaceTreatyOffer = 27;
      DRPactOffer = 28;
      DRAllianceOffer = 29;
      DRTradeOffer = 30;
      DRTradeOffer2 = 38;
      DRDemandWar = 31;

      DRDemandBreakAlliance =34 ;

      DRStayAwayWarning = 32; // No pact

      DROverexpand = 33;

      DRBribeBySpell = 50;
      DRBribeByGold = 51;

      DAGoAway = 100;
      DABeBrief = 101;
      DAStart = 102;

      DAMainMenu  =103;

      DATributeAccepted = 104;
      DAPlayerDeclaredWar = 105;
      DAPlayerBrokeTreaty = 106;

      DASpellTradeGet = 107;
      DASpellTradeGive = 108;
      DASpellTradeAIHasnothing = 109;
      DASpellTradeHumanHasnothing = 110;
      DASpellTradeValueMismatch = 111;
      DASpellTradeSuccess = 112;

      DAProposemenu = 120;
      DAHostilemenu = 121;
      DATributeMenu = 122;

      DATributeSpellUnavailable = 123;
      DASpellTributeMenu = 124;
      DAThreatNotScared = 125;
      DAThreatGiveGold = 126;
      DAThreatGiveSpell = 127;
      DAthreatPeace = 128;

      DATreatyRefused = 130;
      DATreatyDemandGold = 131;
      DATreatyDemandSpell = 132;
      DABreakAlliancePlayerList = 133;
      DADeclareWarPlayerList = 134;

      DAAllianceAccepted = 135;
      DAPactAccepted = 136;
      DAPeaceAccepted = 137;
      DADoWAccepted = 138;
      DABAllAccepted = 139;

      DAFailedToDemand = 140;
      DAOfferAcceptedDuetoSpellTribute = 141;
      DADowCannotDueToPeace = 143;

      DATiredEndAudience = 142;

      DRBanishedEnemy = 150;
      DRBanishedFriend = 151;
      DRDefeatedEnemy = 152;
      DRDefeatedFriend = 153;
      DRDefeatedNeutral = 154;

      DRSurrender = 155;

      // Combat results
      CRTIE = 1;
      CRWINLOSE = 2;
      CREXHAUSTED = 3;
      CRFLEE = 4;
      CRRAMPAGE = 5;
      CRDESTROY = 6;

      WSNone = 0;
      WSWall = 1;
      WSRuin = 2;

// Spell IDs
SNone = 0;
SEarthtoMud = 1;
SResistElements = 2;
SNaturesEye = 3;
SWildBoars = 4;
SWeb = 5;
SWarBears = 6;
SFairyDust = 7;
SWaterWalking = 8;
SSprites = 9;
SEarthLore = 10;
SCracksCall = 11;
SConstructCatapult = 12;
SIceBolt = 13;
SGiantSpiders = 14;
SChangeTerrain = 15;
SLandLinking = 16;
SCockatrices = 17;
STransmute = 18;
SNatureCures = 19;
SGreatLizard = 20;
SElementalArmor = 21;
SPetrify = 22;
SStoneGiant = 23;
SIronSkin = 24;
SBlizzard = 25;
SEarthquake = 26;
SGorgons = 27;
SSurvivalInstinct = 28;
SGaiaBlessing = 29;
SEarthElemental = 30;
SRegeneration = 31;
SBehemoth = 32;
SEntangle = 33;
SSeismicMastery = 34;
SCallLightning = 35;
SColossus = 36;
SEarthGate = 37;
SHerbMastery = 38;
SGreatWyrm = 39;
SFairyRing = 40;
SResistMagic = 41;
SAEtherSparks = 42;
SFloatingIsland = 43;
SGuardianWind = 44;
SPhantomWarriors = 45;
SConfusion = 46;
SFocusMagic = 47;
SBlur = 48;
SNagas = 49;
SPsionicBlast = 50;
SCounterMagic = 51;
SDispellingWave = 52;
SVertigo = 53;
SSpellLock = 54;
SWaterElemental = 55;
SFlight = 56;
SAetherBinding = 57;
SSpellBlast = 58;
SAuraofMajesty = 59;
SPhantomBeast = 60;
SUranusBlessing = 61;
SInvisibility = 62;
SWindWalking = 63;
SBanish = 64;
SStormGiant = 65;
SAirElemental = 66;
SMindStorm = 67;
SStasis = 68;
SMagicImmunity = 69;
SFlyingFortress = 70;
SDjinn = 71;
SSpellWard = 72;
SCreatureBinding = 73;
SMassInvisibility = 74;
SGreatUnsummoning = 75;
SSpellBinding = 76;
SHaste = 77;
SSkyDrake = 78;
SPowerLink = 79;
STimeStop = 80;
SWarpWood = 81;
SDisrupt = 82;
SFireBolt = 83;
SHellHounds = 84;
SCorruption = 85;
SFlameBlade = 86;
SWallofFire = 87;
SShatter = 88;
SWarpCreature = 89;
SFireElemental = 90;
SLightningBolt = 91;
SFireGiant = 92;
SChaosChannels = 93;
SMysticSurge = 94;
SGargoyles = 95;
SFireball = 96;
SFireStorm = 97;
SRaiseVolcano = 98;
SImmolation = 99;
SChimeras = 100;
SWarpLightning = 101;
SBlazingMarch = 102;
SChaosSpawn = 103;
SDoomBolt = 104;
SMagicVortex = 105;
SEfreet = 106;
SDoomBat = 107;
SDoomMastery = 108;
SFlameStrike = 109;
SChaosRift = 110;
SHydra = 111;
SDisintegrate = 112;
SMeteorStorm = 113;
SDoomsday = 114;
SApocalypse = 115;
SChaosSurge = 116;
SWarpReality = 117;
SGreatDrake = 118;
SCalltheVoid = 119;
SArmageddon = 120;
SBless = 121;
SStarFires = 122;
SEndurance = 123;
SHolyWeapon = 124;
SHealing = 125;
SHolyArmor = 126;
SJustCause = 127;
SHeavenlyLight = 128;
SGuardianSpirit = 129;
SHeroism = 130;
STrueSight = 131;
SStreamofLife = 132;
SResurrection = 133;
SExorcise = 134;
SDivineOrder = 135;
SUnicorns = 136;
SRaiseDead = 137;
SSanctify = 138;
SAltarofPeace = 139;
SPrayer = 140;
SLionheart = 141;
SIncarnation = 142;
SInvulnerability = 143;
SInspirations = 144;
SProsperity = 145;
SAltarofBattle = 146;
SAngel = 147;
SExaltation = 148;
SMassHealing = 149;
SHolyWord = 150;
SHighPrayer = 151;
SSupremeLight = 152;
SCalltoArms = 153;
SHolyArms = 154;
SConsecration = 155;
SLifeForce = 156;
SEnlightenment = 157;
SCrusade = 158;
SArchAngel = 159;
SCharmofLife = 160;
SSkeletons = 161;
SWeakness = 162;
SZombies = 163;
SCloakofFear = 164;
SBlackSleep = 165;
SGhouls = 166;
SLifeDrain = 167;
SWraithForm = 168;
SDarkness = 169;
SManaLeak = 170;
SDrainPower = 171;
SPossession = 172;
SLycanthropy = 173;
SBlackPrayer = 174;
SSyphonLife = 175;
SNightStalker = 176;
SReaperSlash = 177;
SWallofDarkness = 178;
SBloodLust = 179;
SShadowDemons = 180;
STerror = 181;
SGateofHades = 182;
SEvilPresence = 183;
SWraiths = 184;
SCloudofShadow = 185;
SWarpNode = 186;
SWaveofDespair = 187;
SZombieMastery = 188;
SDrought = 189;
SDarkRitual = 190;
SSummonDemon = 191;
SAnnihilate = 192;
SDeathKnights = 193;
SMassacre = 194;
SAnimateDead = 195;
SPestilence = 196;
SEternalNight = 197;
SEvilOmens = 198;
SFinalWave = 199;
SDemonLord = 200;
SMagicSpirit = 201;
SDispelMagic = 202;
SSummoningCircle = 203;
SHeroicHeart = 204;
SDisenchantArea = 205;
SDetectMagic = 206;
SEnchantItem = 207;
SSummonHero = 208;
SPlaneShift = 209;
SDisjunction = 210;
SCreateArtifact = 211;
SSummonChampion = 212;
SSpellofMastery = 213;
SSpellofReturn = 214;
STreeOfKnowledge = 215;
SAbundance = 216;
SPhilStone = 217;
SDarkestHour = 218;
SFateMastery = 219;
SClairvoyance = 220;
SDiscipline = 221;
SWindMastery = 222;
SCallTheWild = 223;
SReinforceMagic = 224;
SKingoftheUnderworld = 225;
SRootsofGenesis = 226;
SBlazingEyes = 227;
SInnerPower = 228;
SDestiny = 229;
SMislead = 230;
SVampire = 231;
SPhoenix = 232;
SDisillusionise = 233;
SRulerofHeaven = 234;
SChainLightning = 235;

// Enchantment IDs
      CEWallofFire = 1;
      CEChaosRift = 2;
      CEDarkRituals = 3;
      CEEvilPresence = 4;
      CEUranusBless = 5;
      CEPestilence = 6;
      CECloudofShadow = 7;
      CEDrought = 8;
      CEFlyingFortress = 9;
      CENatureWard = 10;
      CESorceryWard = 11;
      CEChaosWard = 12;
      CELifeWard = 13;
      CEDeathWard = 14;
      CENatureEye = 15;
      CEEarthGate = 16;
      CEStreamofLife = 17;
      CEGaiasBlessing = 18;
      CEInspirations = 19;
      CEProsperity = 20;
      CEAltarofPeace = 21;
      CEHeavenlyLight = 22;
      CEConsecration = 23;
      CEWallofDarkness = 24;
      CEAltarofBattle = 25;
      CEAbundance = 26;
      CEPhilStone = 27;

// Spell targeting result codes 0 or higher is valid target
const SPTValid = 0;
      SPTMustBeSea = -1;
      SPTTooManyUnits = -2;
      SPTMustBeOwn = -3;
      SPTMustBeNormal = -4;
      SPTMustBeFantastic = -5;
      SPTAlreadyHasBuff = -6;
      SPTAlreadyHasAbility = -7;
      SPTMustBeCorporeal = -8;
      SPTAlreadyHasMaxResistance = -9;
      SPTHasImmunity = -10;
      SPTNoHeroes = -11;
      SPTNoShips = -12;
      SPTMustTargetCity = -13;
      SPTMustBeEnemy = -14;
      SPTHasALlWards = -15;
      SPTHasToBeScouted = -16;
      SPTInvalidTerrain = -17;
      SPTMustTargetNode = -18;
      SPTMustBeMelded = -19;
      SPTNothingToDispel = -20;
      SPTNoContact = -21;
      SPTSelfTarget = -22;
      SPTNotcasting = -23;
      SPTCannotCounter = -24;
      SPTNotEnoughMana = -25;
      SPTNoHealing = -26;
      SPTTileOccupied = -27;
      SPTWrongSide = -28;
      SPTOutside = -29;
      SPTInvalidTile = -30;
      SPTMustTargetUnit = -31;
      SPTMustTargetWall = -32;
      SPTMustHaveRanged = -33;
      SPTMustBeHero = -34;
      SPTMustTargetLand = -35;
      SPTNoBanished = -36;
      SPTNoSettlers = -37;
      SPTNoInput = -999;

// Spell Groups
const SGSummon = 0;
SGUnitBuff = 1;
SGCityBuff = 2;
SGCityCurse = 3;
SGCombatSpell = 4;
SGOther = 5;
SGWizardTargeting = 6;
SGGlobalEnchantment = 9;
SGCombatGlobal = 10;
SGItemCreation = 11;
SGSaveorDie =12;
SGUnitCurse = 13;
SGUnitcurseNoSaves = 14;
SGUnitBuffNormalUnit = 15;
SGUnitCurseNormalUnit = 16;

// Combat Terrain
const CTGrass = 1; //
      CTSea = 2;    //
      CTForest = 3; //
      CTIce = 4;     //
      CTPine = 5; //
      CTrock = 6; //
      CTRock2 = 7; //
      CTMountain = 8; //
      CTDesert = 9; //
      CTSwamp = 10; //
      CTCenter = 11;
      CTFloating = 12;

// Global Enchantments
      GEEternalNight = 1;
      GEEvilOmens = 2;
      GEZombieMastery = 3;
      GEAuraofMajesty = 4;
      GEAEtherBinding = 5;
      GEPowerLink = 6;
      GETimeStop = 7;
      GEFairyRing = 8;
      GESeismicMastery = 9;
      GEHerbMastery = 10;
      GEChaosSurge = 11;
      GEDoomMastery = 12;
      GEDoomsday = 13;
      GEMeteorStorm = 14;
      GEArmageddon = 15;
      GEEnlightenment = 16;
      GELifeForce = 17;
      GECrusade = 18;
      GEJustCause = 19;
      GEHolyArms = 20;
      GEDivineOrder = 21;
      GECharmofLife = 22;
      GEDetectMagic = 23;
      GESurvivalInstinct = 24;
      GEDarkestHour = 25;
      GEClairvoyance = 26;
      GEWindMastery = 27;
      GECallTheWild = 28;
      GEReinforceMagic = 29;
      GEKingOfUnderworld = 30;
      GERootsofGenesis = 31;
      GEBlazingEyes = 32;
      GEInnerPower = 33;
      GERulerofHeaven = 34;
      GEFateMastery = 35;

      // Spell status
      SSUnavailable = 0;
      SSPossible = 1;
      SSKnown = 2;
      SSOnList = 3;

      // Combat global enchantment sides
      CGDefender = 1;
      CGAttacker = 2;

//-----------------------------------
// Realms
//-----------------------------------

      Nature =1;
      Sorcery =2;
      Chaos =3;
      Life =4;
      Death =5;
      Arcane = 6;

/// Spell fail reasons
/// 0 means no message to display
/// Positive value means Mana Drain drained that many MP from the human player and this needs to be shown.
      SFROutofHeores = -1;
      SFRTooManyHeroes = -2;
      SFRDisjunctionResisted = -3;

      lairnames : array[1..Maxlairtypes] of shortstring =
      ('Tower','Nature Node','Sorcery Node','Chaos Node',
      'Lair','Cave','Ruin','Temple','Stonehenge','Keep',
      'Dungeon');

      NofITIcons : array[1..maxitemtypes+1] of integer =
      (9,11,9,9,9,9,10,8,7,35,3);

      Const CitySizeNames : array[0..5] of shortstring =
      ('Outpost','Hamlet','Village','Town','City','Capital');

      LandTileNames : array[0..12] of string[20]=
      ('Ocean','Shore','Lake','RiverMouth','Grassland','Hill',
      'Mountain','Volcano','Desert','Swamp','Tundra','River','Forest');

Const DifficultyLevels : array[1..Maxdifficulty] of shortstring =
('Beginner','Easy','Normal','Fair','Advanced','Expert','Master','Lunatic','Phantasm');

      SpellrarityName : array[1..4] of string =
      ('Common','Uncommon','Rare','Very Rare');

const categorynames : array[0..5] of string[20]=
('Special Spells','Summoning','Enchantments',
'City Spells','Unit Spell','Combat Spells');

//-----------------------------------
// Settings
//-----------------------------------

      DiffBeginner = 1;
      DiffEasy = 2;
      DiffNormal =3;
      DiffFair =4;
      DiffAdvanced =5;
      DiffExpert = 6;
      DiffMaster = 7;
      DiffLunatic = 8;
      DiffPhantasm = 9;

      LandMinimal = 1;
      LandTiny = 2;
      LandSmall = 3;
      LandNormal = 4;
      LandLarge = 5;
      LandHuge =6;
      LandMaximal = 7;
      LandRandom = 8;

// Dry = more deserts, fewer rivers and swamps.
// Wet = more rivers and swamps, fewer deserts.
// Volcanic = more hills and mountains, including some volcanoes, less forests and grasslands
// Frozen = more tundra
const CliNormal = 1;
      CliDry = 2;
      CliWet = 3;
      CliVolcanic = 4;
      CliFrozen = 5;
      CliRandom = 6;
      MineralPoor = 1;
      MineralNormal = 2;
      MineralRich = 3;

      ContiIsland = 1;
      ContiSmall = 2;
      ContiAverage =3;
      ContiLarge = 4;
      ContiMixed = 5;
      ContiRandom = 6;

//-----------------------------------
// Retorts
//-----------------------------------

const Alchemy=1;
      SageMaster=2;
      Specialist=3;
      Warlord=4;
      Myrran=5;
      Tactician=6;
      Channeler=7;
      Guardian=8;
      Omniscient=9;
      Archmage=10;
      Famous=11;
      CultLeader=12;
      Artificer=13;
      Runemaster=14;
      Astrologer=15;
      Conjurer=16;
      Charismatic=17;
      Spellweaver=18;

      // Combat starting positions, city location is relative to this.
      DefenderStartX = 9;
      DefenderStartY = 12;
      AttackerStartX = 15;
      AttackerStartY = 12;

      // Enchantment flags

      EncMagic = 1;
      EncMithril = 2;
      EncAdamant = 3;
      EncOrihalcon = 4;
      EncUndead = 5;
      EncWarpAttack = 6;
      EncWarpDefense = 7;
      EncWarpResist = 8;
      EncStasisCombat = 9;
      EncStasisOverland = 10;
      EncShatter = 11;
      EncConfusion = 12;
      EncWeakness = 13;
      EncMindStorm = 14;
      EncHaste = 15;
      EncResistElements = 16;
      EncWeb = 17;  // can't fly part of effect.
      EncWaterWalking = 18;
      EncLandLink = 19;
      EncElementalArmor = 20;
      EncIronSkin = 21;
      EncRegeneration = 22;
      EncResistMagic = 23;
      EncGuardianWind = 24;
      EncVertigo = 25;
      EncSpellLock = 26;
      EncFlight = 27;
      EncInvisibility = 28;
      EncWindWalking = 29;
      EncMagicImmunity = 30;
      EncFlameBlade = 31;
      EncMysticSurge = 32;
      EncCCBreath = 33;
      EncCCFlight = 34;
      EncCCArmor = 35;
      EncImmolation = 36;
      EncEndurance = 37;
      EncHolyArmor = 38;
      EncHolyWeapon  =39;
      EncHeroism = 40;
      EncTrueSight = 41;
      EncSanctify = 42;
      EncLionheart = 43;
      EncInvulnerability = 44;
      EncCloakofFear = 45;
      EncBlackSleep = 46;
      EncWraithForm = 47;
      EncBloodLust = 48;
      EncFocusMagic = 49;
      EncAnimated = 50;
      EncBless = 51;
      EncPossession = 52;
      EncCreatureBinding = 53;
      EncSupremeLightRegen = 54;
      EncNecromancy = 55;
      EncDiscipline = 56;
      EncDestiny = 57;
      EncMisfortune = 58;
      EncHovering = 59;
      EncBuried = 60;
      EncFrozen = 61;
      EncNoHeal = 62;

      AFAlwaysAnimated = 12;

      UnitSprites = 180;

//-----------------------------------
// Tiles
//-----------------------------------
      LTOCean = 0;
      LTShore = 1;
      LTLake = 2;
      LTRiverMouth = 3;
      //---------------------- Counts as water above this tile
      LTGrassland = 4;
      LTHill = 5;
      LTMountain = 6;
      LTVolcano = 7;
      LTDesert = 8;
      LTSwamp = 9;
      LTTundra = 10;
      LTRiver = 11;
      LTForest = 12;
      LTChaosNode = 13;
      LTNatureNode = 14;
      LTSorceryNode = 15;
      LTRiverStart = 16;

      OreWildgame = 1;
      OreNightshade = 2;
      OreAdamantium = 3;
      OreMithril = 4;
      OreOrihalcon = 5;
      OreIron = 6;
      OreCoal = 7;
      OreSilver = 8;
      OreGold = 9;
      OreGems = 10;
      OreCrysx = 11;
      OreQuork = 12;

// Personalities and Objectives
      Maniacal=1;
      Ruthless=2;
      Aggressive=3;
      Chaotic=4;
      Lawful=5;
      Peaceful=6;

      Pragmatist=1;
      Theurgist=2;
      Militarist=3;
      Expansionist=4;
      Perfectionist=5;
      Narcissist = 6;

      BCityWalls=37;

      // Combat location
      COTCity = 1;
      COTLair = 2;
      COTLand = 3;
      COTSea = 4;
      COTNone = 0; // No combat caused by movement
      CTWaitForUser = 5; // Do not attack

//-----------------------------------
// Score Modifiers
//-----------------------------------
const SStrategicCombat = 1;
SAgainstTheWorld = 2;
SEqualizer = 3;
SRaceToUnknown = 4;
SEasyLairs = 5;
SDumbNeutrals = 6;
SMonsters = 7;
STargetingAid = 8;
SPlaneofEarth = 9;
SLeavemeAlone = 10;
SSandboxPlay = 11;
SOrderPlease = 12;
SSmartFamiliar = 13;
SNoTrading = 14;
SNoOverlap = 15;
SNoIslandStart = 16;
STreeMastery = 17;
SUndevelopedStart = 18;
SDisconnected = 19;
SEverythingNice = 20;
SLoner = 21;
SStandardized = 22;
SPlaneOfWater = 23;
SInvertedStart = 24;
STreasureImpact=25;
SCorruptLeaders=26;
SParanoia=27;
SHostility=28;
SFinalWar=29;

// Hero abilities

HARitualMaster = 1;
HAAEtherMaster = 2;
HACapacity = 3;
HADivineBarrier = 4;
HAGuidingBeacon = 5;
HASoulLinker = 6;
HASupplycommander = 7;
HALogistics = 8;
HABattlemage = 9;
HAAgility = 10;
HAArcanePower = 11;
HAArmsmaster = 12;
HABlademaster = 13;
HACharmed = 14;
HAConstitution =15;
HALeadership = 16;
HALegendary = 17;
HALucky = 18;
HAMight = 19;
HANoble = 20;
HAPrayermaster = 21;
HASage = 22;
HAExtraMP = 23;
HAPowershot = 24;

      GazeNone = 100;

      UnitSteamCannon = 80;
      UnitVampire = 199;

      // Spell Rarity
      STCommon = 1;
      STUncommon = 2;
      STRare = 3;
      STVeryRare = 4;
      STInvalid = 999;

      MaxClTargets = 2; // additional targets for chain lightning

//-----------------------------------
// Races
//-----------------------------------

      RCBarbarian = 0;
      RCBeastmen = 1;
      RCDarkElf = 2;
      RCDraconian = 3;
      RCDwarf = 4;
      RCGnoll =5;
      RCHalfling = 6;
      RCHighElf = 7;
      RCHighMen = 8;
      RCKlackon = 9;
      RCLizard = 10;
      RCNomad = 11;
      RCOrc = 12;
      RCTroll = 13;
      RCGeneric = 14;
      RCArcane = 15;
//----------------------------------------------------
      RCNature = 16;  // Do not change these
      RCSorcery = 17;
      RCChaos = 18;
      RCLife = 19;
      RCDeath = 20;
//----------------------------------------------------
      RCNoHeal = 21;

//-----------------------------------
// Events
//-----------------------------------
      EvSorceryC = 1;
      EvChaosC = 2;
      EvNatureC = 3;
      EvGoodMoon = 4;
      EvBadMoon = 5;
      EvPirates = 6;
      EvMerchant = 7;
      EvDepletion = 8;
      EvMarriage = 9;
      EvStroke = 10;
      EvFlux = 11;
      EvEarthquake = 12;
      EvMeteor = 13;
      EvMinerals = 14;
      EvPlague =15;
      EvPopBoom = 16;
      EvRebellion = 17;
      EvGift = 18;
      EvRaisingIsland = 19; // New, generate an island with lairs
      EvMonsterOutbreak =20; // New, generate a whole bunch of rampaging monsters somewhere
      EvRetire = 999;

//-----------------------------------
// Buildings
//-----------------------------------
BTradeGoods = 1;
BHousing = 2;
BBarracks=3;
BColosseum=4;
BFighterGuild=5;
BArmorerGuild=6;
BWarCollege=7;
BSmithy=8;
BStables=9;
BAnimistGuild=10;
BFantasticStables=11;
BShipyard=12;
BMagicMarket=13;
BMaritimeGuild=14;
BSawmill=15;
BLibrary=16;
BSagesGuild=17;
BOracle=18;
BAlchemistguild=19;
BUniversity=20;
BWizardsGuild=21;
BShrine=22;
BAmplifyingTower=23;
BParthenon=24;
BCathedral=25;
BMarketplace=26;
BBank=27;
BMerchantGuild=28;
BGranary=29;
BFarmerMarket=30;
BForesterGuild=31;
BBuilderHall=32;
BMechaGuild=33;
BMinerGuild=34;
BMonument=35;
BLinkingTower=36;
//BCityWalls=37;
ReqSea = 110;
ReqForest = 101;
ReqMountain=102;
ReqSwamp=103;
ReqDesert=104;
ReqTundra=105;
ReqRiver=106;

      BBuilt = 1;
      BReplaced = 2;
      BDestroyed = -1;
      BNotbuilt = 0;
      BToBeDestroyed = 3;

const ITNone = 0;
      ITSword = 1;
      ITMace = 2;
      ITAxe = 3;
      ITBow = 4;
      ITWand = 5;
      ITStaff= 6;
      ITShield = 7;
      ITChain = 8;
      ITPlate = 9;
      ITAccessory = 10;
      ITVial = 11;

HosNames : array[0..4] of string[10]=
('None','Annoyed','Hostile','Warlike','Jihad');

const itemtypename : array[1..maxitemtypes+1] of string[20] =
      ('Sword','Mace','Axe','Bow','Wand','Staff','Shield','Chain Mail','Plate Mail','Trinket','Vial');
const itemtypenameshort : array[1..maxitemtypes+1] of string[20] =
      ('Sword','Mace','Axe','Bow','Wand','Staff','Shield','Chain','Plate','Other','Vial');

const IPattack1=1;
      IPattack2=2;
      IPattack3=3;
      IPattack4=4;
      IPattack5=5;
      IPattack6=6;
      IPDefense1=7;
      IPDefense2=8;
      IPDefense3=9;
      IPDefense4=10;
      IPDefense5=11;
      IPDefense6=12;
      IPHit1=13;
      IPHit2=14;
      IPHit3=15;
      IPMove1=16;
      IPMove2=17;
      IPMove3=18;
      IPResist1=19;
      IPResist2=20;
      IPResist3=21;
      IPResist4=22;
      IPResist5=23;
      IPResist6=24;
      IPSkill5=25;
      IPSkill10=26;
      IPSkill15=27;
      IPSkill20=28;
      IPSave1=29;
      IPSave2=30;
      IPSave3=31;
      IPSave4=32;
      IPHP1=33;
      IPHP2=34;
      IPHP3=35;
      IPFlaming=36;
      IPInsulation=37;
      IPPandora=38;
      IPLightning=39;
      IPDoom=40;
      IPDestruction=41;
      IPFear=42;
      IPVampiric=43;
      IPDeath=44;
      IPWraithform=45;
      IPShadow=46;
      IPNecromancy=47;
      IPBless=48;
      IPHolyAvenger=49;
      IPTrueSight=50;
      IPLionheart=51;
      IPDivineProt=52;
      IPInvulnerability=53;
      IPWaterWalking=54;
      IPPathfinding=55;
      IPStoning=56;
      IPResistElements=57;
      IPElementalArmor=58;
      IPMerging=59;
      IPRegeneration=60;
      IPGuardianWInd=61;
      IPResistMagic=62;
      IPFlight=63;
      IPPhantasmal=64;
      IPInvisibility=65;
      IPTeleport=66;
      IPHaste=67;
      IPImmolation=68;
      IPRecharge=69;
      IPEgoism=70;
      IPDarkForce=71;
      IPAmplifier=72;
      IPStealth=73;

      Confskipturn = 1;
      Confchangecontrol = 2;
      ConfMoverandomly = 3;
      ConfNoeffect = 4;

implementation

end.
