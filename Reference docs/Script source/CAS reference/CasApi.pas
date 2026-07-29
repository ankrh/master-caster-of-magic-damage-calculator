//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// These read system variables
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// Returns the ID of the current acting player.
// 0 indicates the human player's turn, non-zero means an AI controlled player
Function AITurn : integer; stdcall; forward;
// Returns true during combat, false otherwise.
Function IsCombat : boolean; stdcall; forward;
// Returns the active unit during combat. It's assumed if a unit moves or attacks, this unit is performing the action.
// -1 is returned when there is no selected unit.
Function CombatSelectedUnit : integer; stdcall; forward;
// Sets the active unit during combat.
Procedure CombatSelectUnit( u : integer);stdcall; forward;
// Returns true if it's the human player's turn in combat.
Function HumanCombatTurn : boolean;stdcall; forward;
// Returns the current overland turn count.
Function CurrentTurn : integer;stdcall; forward;
// Converts the turn count into a displayable Year number.
Function CurrentGameYear : integer;stdcall; forward;
// Returns true if an autosave is required (human player's turn just started)
Function AutoSaveNeeded : boolean;stdcall; forward;
// Returns the number of opponents in the game.
Function NumberofWizards : integer;stdcall; forward;
// These return the settings for the current game
Function GameDifficulty : integer;stdcall; forward;
Function LandSize : integer;stdcall; forward;
Function Minerals : integer;stdcall; forward;
Function MagicPower : integer;stdcall; forward;
Function Climate : integer;stdcall; forward;
Function ContinentSize : integer;stdcall; forward;
Procedure SetDifficulty(n : integer);stdcall; forward;
Procedure SetMagicPower(n : integer);stdcall; forward;
Procedure SetMinerals(n : integer);stdcall; forward;
Procedure SetClimate(n : integer);stdcall; forward;
Procedure SetMaxWizards(n : integer);stdcall; forward;
Procedure SetContinentSize(n : integer);stdcall; forward;
Procedure SetLandSize(n : integer);stdcall; forward;
// Returns the highest valid spell ID
Function MaxSpells : integer;stdcall; forward;
// Returns the highest currently existing unit ID
Function NumberOfUnits : integer;stdcall; forward;
// Returns the highest valid global enchantment ID
Function MaxGlobals : integer;stdcall; forward;
// Same as above but for combat global enchantment ID
Function MaxCombatEnchantments : integer;stdcall; forward;
// Returns the highest currently existing city ID
Function NumberofCities : integer;stdcall; forward;
// Returns the main RNG seed that was used to generate the current game.
Function MainSeed : longint;stdcall; forward;
// Returns the highest level allowed on units or heroes.
Function MaxLevel : integer;stdcall; forward;
// Returns the highest valid building ID (according to current mod settings)
Function NumberofBuildings : integer;stdcall; forward;
// Returns the highest valid hero type ID (according to current mod settings)
Function NumberofHeroTypes : integer;stdcall; forward;
// Returns the highest valid unit type ID (according to current mod settings)
Function NumberofUnitTypes : integer;stdcall; forward;
// Returns the highest valid lair ID (encounter zone);
Function MaxLairs : integer;stdcall; forward;
// Returns the highest valid tower ID
Function MaxTowers : integer;stdcall; forward;
// Returns the highest valid node ID
Function MaxNodes : integer;stdcall; forward;
// Returns the highest valid score modifier ID (according to current mod settings)
Function MaxGameOptions : integer;stdcall; forward;
// Returns the highest valid hero ability ID
Function MaxHeroability : integer;stdcall; forward;
// Returns the highest valid race ID (according to current mod settings)
Function MaxRaces : integer;stdcall; forward;
// Returns false if the race is set as unavailable both as Playable and Neutral races. (Can only happen by modding)
Function RaceValid(r : integer) : boolean;stdcall; forward;
// After calling FillRaceArrays, these functions return the number of valid races and each race ID for each plane.
Function NumberofArcanusRaces : integer;stdcall; forward;
Function NumberofMyrranRaces : integer;stdcall; forward;
Function ArcanusRace (n : integer) : integer;stdcall; forward;
Function MyrranRace (n : integer) : integer;stdcall; forward;
Function Racename(r : integer) : shortstring;stdcall; forward;
// The highest valid item power ID
Function MaxItemPowers : integer; stdcall; forward;
// Returns the multiplier of costs if the caster has the Artificer retort.
Function ArtificerItemCastingCostMultiplier : integer;stdcall; forward;
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// These read data
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
//-----------------------------
// Spell targeting
//-----------------------------
// Returns a list of unit IDs for units as valid targets for a revival spell cast by player W (Raise Dead or Animate Dead), use this to display the unit selection menu.
Function GetReviveTargets(w,sp : integer) : UnitList;stdcall; forward;
// Same as the above for the Resurrection spell. This returns Hero type IDs.
Function GetResurrectTargets(w : integer) : HeroList;stdcall; forward;
// Returns a list of Spell IDs as valid target for a Spell Binding cast by wizard w.
Function GetSpellBindingTargets(w : integer) : SpellList;stdcall; forward;
// Returns the target unit of the currently cast spell when applicable.
Function SpellTargetUnit : integer;stdcall; forward;
Procedure SetSpellTargetUnit(u : integer);stdcall; forward;
// Returns the target player of the currently cast spell when applicable.
Function SpellTargetPlayer : integer;stdcall; forward;
Procedure SetSpellTargetPlayer( w : integer);stdcall; forward;
// Returns the type of Spell Ward being cast.
Function SpellWardType : integer;stdcall; forward;
// Returns the tile being targeted by the currently cast spell when applicable. For combat spells, Plane is not used and X,Y refers to the combat tile.
Function SpellTargetPlane : integer;stdcall; forward;
Function SpellTargetX : integer;stdcall; forward;
Function SpellTargetY : integer;stdcall; forward;
Procedure SetSpellTargetLocation(p,x,y : integer); overload;stdcall; forward;
Procedure SetSpellTargetLocation(x,y : integer); overload;stdcall; forward;
// Returns the target city of the currently cast spell when applicable.
Function SpellTargetCity : integer;stdcall; forward;
// Returns the unit type ID of the hero targeted by the Resurrection spell.
Function ResurrectTarget : integer;stdcall; forward;
// While casting a Summon Hero type spell, returns the unit type ID of the hero.
Function HeroBeingSummoned : integer;stdcall; forward;
// Returns the spell ID of the spell being stolen by Spell Binding.
Function SpellBindingTarget : integer;stdcall; forward;
// Returns the caster of the currently cast spell.
// A positive value implies a wizard is casting.
// A negative value implies a unit is casting.
// A negative value plus the CastedFromItem constant implies a spell is being cast from an item or ability.
Function Caster : integer;stdcall; forward;
// Returns the caster of the spell but if a unit or item is casting, returns the owner wizard.
Function MainCaster : integer;stdcall; forward;
// Converts Caster to a Unit ID when a unit or item is casting.
Function UnitCaster : integer;stdcall; forward;
// Returns a Global enchantment or City enchantment ID for the selected target of the current spell.
// Mainly used by dispelling or manually cancelling enchantments.
Function GlobalEnchantmentTarget : integer;stdcall; forward;
Procedure SetGlobalEnchantmenttarget( i : integer);stdcall; forward;
// While a Plane Shift spell is being cast, this returns the location of the destionation tile the unit arrives to.
Function PlaneShiftDest : tileT;stdcall; forward;
// When Chain Lightning is being cast on unit U, this looks for the other targets the spell chains to and sets those targets.
Procedure FillCLTargets(u : integer);stdcall; forward;
// Returns the Ith target for chain lightning (not counting the initial target) or a nonpositive number if fewer targets were found.
Function CLTarget(i : integer) : integer;stdcall; forward;
// The number of enemy units being affected by an Apocalypse spell being cast
Function NofApoc : integer;stdcall; forward;
// The unit ID of each target and the effect type applied to that target during the Apocalypse spell
Function ApocTarget(n : integer) : integer;stdcall; forward;
Function ApocEffect(n : integer) : integer;stdcall; forward;
// Returns true if spell sp does not require targeting
Function UntargetedSpell(sp : integer) : boolean;stdcall; forward;
// Returns how much mp is available for using the spell slider in pecentage (0-100)
Function CombatSpellAvailableSlider(sp : integer) : integer;stdcall; forward;
// Returns true if spell sp uses the spell slider
Function IsSliderSpell(sp : integer) : boolean;stdcall; forward;

//-----------------------------
// Unit data
//-----------------------------
// Return the name of a unit. (This returns the generic name for heroes, such as "The Druid")
Function GetUnitName(u : integer) : str30;stdcall; forward;
Function GetUnitTypeName(ut : integer) : str30;stdcall; forward;
// Returns the name of a hero unit as named by the owning wizard.
// If "long" is true, also adds "The <type>" to the text.
Function GetHeroName(w,hid : integer; long:boolean) : shortstring;stdcall; forward;
Procedure SetHeroName(w,hid : integer; na : shortstring);stdcall; forward;
// Returns the spell ID of the spell ability available for the unit.
Function GetSpellAbility(u : integer) : integer;stdcall; forward;
// This converts a hero type ID to a corresponding unit type ID
Function Herotypetounittype(ht : integer) : integer;stdcall; forward;
// Returns true if the flag applies to the unit type according to
Function AIUnitFlags(ut,flag : integer) : boolean;stdcall; forward;
// Returns the number of figures in unit u
Function UnitFigures(u : integer) : integer;stdcall; forward;
// Returns the number of figures in unit u that are still alive calculated from the damage taken.
Function LivingFigures(u : integer) : integer;stdcall; forward;
// Returns true if the unit is currently in combat
Function UnitInCombat(u : integer) : boolean;stdcall; forward;
// Returns true if the unit is dead. (dead units are only removed outside combat at specific timings such as loading from a save or starting a new turn)
Function UnitIsDead(u : integer) : boolean;stdcall; forward;
// Returns true if the unit is a hero
Function UnitIsHero(u : integer) : boolean;stdcall; forward;
Function UnitTypeIsHero(u : integer) : boolean;stdcall; forward;
// Returns the hero type of a unit if applicable.
Function UnitHeroType(u : integer) : integer;stdcall; forward;
// Returns the hero type of a unit type if applicable.
Function UnitTypetoHeroType(u : integer) : integer;stdcall; forward;
// Returns the original owner of the unit, not including any controller changing effects
Function UnitBaseOwner(u : integer) : integer;stdcall; forward;
// Sets the original base owner of a unit.
{ Procedure SetUnitBaseOwner(u,o : integer); }
// Returns the current owner of the unit.
Function UnitOwner(u : integer) : integer;stdcall; forward;
// Returns true for fantastic units
Function UnitBaseFantastic(u : integer) : boolean;stdcall; forward;
// Returns true for fantastic units, including effects that might change this status
Function UnitFantastic(u : integer) : boolean;stdcall; forward;
// Returns the unit's base type (ID in the unit table)
Function UnitBaseType(u : integer) : integer;stdcall; forward;
// Returns the position of a unit
Function UnitOverlandP(u : integer) : integer;stdcall; forward;
Function UnitOverlandX(u : integer) : integer;stdcall; forward;
Function UnitOverlandY(u : integer) : integer;stdcall; forward;
Function UnitOverlandToX(u : integer) : integer;stdcall; forward;
Function UnitOverlandToY(u : integer) : integer;stdcall; forward;
Function UnitCombatX(u : integer) : integer;stdcall; forward;
Function UnitCombatY(u : integer) : integer;stdcall; forward;
Procedure SetUnitCombatPosition(u,x,y : integer);stdcall; forward;
Procedure SetUnitOverlandToXY(u,x,y : integer);stdcall; forward;
Procedure SetUnitCOverlandPosition(u,p,x,y : integer);stdcall; forward;
// Adjusts an overland X coordinate value to be in the valid range.
// Always call this when adding or subtracting a value from an X coordinate to correctly handle the map looping around horizontally.
Function EffectiveXCoord(p, x: integer): integer;stdcall; forward;
// Returns the level of a unit
Function UnitLevel(u : integer) : integer;stdcall; forward;
// Returns the amount of damage on the figure visible in the stat window
Function TopFigureDamage(u : integer) : integer;stdcall; forward;
// How much hp the unit has left including all living figures.
Function TotalHpLeft(u : integer) : integer;stdcall; forward;
// Returns the total damage taken by a unit
Function TotalDamage(u : integer) : integer;stdcall; forward;
// Returns how much hp each figure in the unit has
Function HPPerFigure(u : integer) : integer;stdcall; forward;
// Returns the remaining unused movement points of a unit
Function UnitCombatMovesLeft(u : integer) : integer;stdcall; forward;
Procedure SubtractCombatMoves(u, amount : integer);stdcall; forward;
Function UnitOverlandMovesLeft(u : integer) : integer;stdcall; forward;
Procedure SetUnitOverlandMovesLeft(u,n : integer);stdcall; forward;
// returns the assigned command to a unit (going, waiting, patrolling, etc)
Function UnitOverlandCommand(u : integer) : integer;stdcall; forward;
Procedure SetUnitOverlandCommand(u,oc : integer);stdcall; forward;
// Returns how much road building ability a unit has.
Function UnitRoadBuilding(u : integer) : integer;stdcall; forward;
// Returns the type of ranged attack the uit currently has
Function UnitRangedType(u : integer) : integer;stdcall; forward;
// Returns the scouting range the unit currently has
Function UnitScoutingRange(u : integer) : integer;stdcall; forward;
// Returns true if unit U has the enchantment flag E
Function HasUnitEnchantment(u, e : integer) : boolean;stdcall; forward;
// Same but only if the unit has the base enchantment flag (enchantment actually cast on the unit, not granted by another spell effect temporally)
Function BaseUnitEnchantment(u, e : integer) : boolean;stdcall; forward;
// Same but only if the base enchantment was cast as a combat, or overland enchantment specifically. (Combat enchantments expire at the end of combat)
Function OverlandUnitEnchantment(u, e : integer) : boolean;stdcall; forward;
Function CombatUnitEnchantment(u, e : integer) : boolean;stdcall; forward;
Procedure SetOverlandUnitEnchantment(u, e : integer; flag : boolean);stdcall; forward;
// Returns true if the unit has the Flying ability currently
Function UnitFlying (u : integer): boolean;stdcall; forward;
// Returns true if the unit has the Merging ability currently
Function UnitMerging (u : integer): boolean;stdcall; forward;
// Returns the difficulty level below which item teleport to heroes who already ended their turn is allowed in modding.ini
Function UnrestrictedItemTeleport : integer;
// Returns true if the unit has the Flying ability among its base stats
Function BaseUnitFlying (u : integer): boolean;stdcall; forward;
// Returns true if the unit has the Invisibility ability currently
Function UnitInvisible (u : integer): boolean;stdcall; forward;
// Returns true if the unit has the Stealth ability currently
Function UnitStealth (u : integer): boolean;stdcall; forward;
// Returns true if the unit has the "Heads" ability such as Hydra (number of heads = number of figures)
Function UnitHeads(u : integer) : boolean;stdcall; forward;
// Returns true if the unit has the Transport ability currently
Function UnitTransport (u : integer): boolean;stdcall; forward;
// Returns the amount of webbing left on a unit. 0 or less means no web.
Function WebLeft(u : integer) : integer;stdcall; forward;
// Returns the sound ID for the unit
Function UnitSound(u : integer) : integer;stdcall; forward;
// Returns true if the unit already participated in battle this turn and thus cannot be moved or transported.
Function Unitfoughtalready(u : integer): boolean;stdcall; forward;

// Returns the total mana upkeep of the unit and all the unit enchantments on it.
Function oneunitmanaupkeep(u : integer) : integer;stdcall; forward;
// Returns the type of equipment slot for a hero type (3 slots)
Function HeroEquipslots(h,s : integer) : integer;stdcall; forward;
// Returns the spell ID for a spell known by the hero inherently. (4 slots)
Function HeroSpells(h,s : integer) : integer;stdcall; forward;

// Returns the "icon priority" of a unit. In stacks the unit with the highest such value has to be shown on the map.
function uniticonpriority(u : integer) : integer;stdcall; forward;

// Returns the entire unit data for a unit's current state
Function GetUnitData (u : integer) : UnitT;stdcall; forward;
// Returns the entire unit data for a unit's base state (continuous effects like buffs not applied)
Function GetBaseUnitData (u : integer) : UnitT;stdcall; forward;

// Returns the race of a unit type from the unit data table
Function GetUnitTypeRace(ut : integer) : integer;stdcall; forward;
// Returns the item equipped on unit U, slot N
Function UnitEquipped(u,n : integer) : ItemT;stdcall; forward;
Procedure SetUnitEquip(u,n : integer; it : ItemT);stdcall; forward;
// Returns how much unspent MP the unit currently has left
Function UnitMP(u : integer) : integer;stdcall; forward;
// Returns how many spell charges are left for a unit. (or zero if the unit has no such ability or item)
Function SpellChargesLeft(u : integer) : integer;stdcall; forward;
// Return which spell the unit has inherent spell charges to cast for free of, such as items equipped on heroes or the "Healing Spell" ability on priests.
Function SpellAbility(u : integer) : integer;stdcall; forward;
// Returns the confusion effect type rolled for the unit for the turn.
Function ConfusionEffect(u : integer) : integer;stdcall; forward;
// Returns true if unit i can't be seen on the overland map by the human player.
Function UnseenUnitOverland(i : integer) : boolean;stdcall; forward;
//-----------------------------
// Spell data
//-----------------------------
// This returns the name of a spell
Function SpellName(sp : integer) : str30;stdcall; forward;
// This returns the "spell group" of a spell, used to categorize spells based on gameplay effects
Function SpellGroup(sp : integer) : integer;stdcall; forward;
// This returns the realm of a spell
Function SpellRealm(sp : integer) : integer;stdcall; forward;
// Returns the rarity of the spell (commun, uncommon, rare, very rare)
Function SpellRarity(sp : integer) : integer;stdcall; forward;
// This returns the display category of the spell in the spellbook
Function SpellCategory(sp : integer) : integer;stdcall; forward;
// Returns the original default casting cost of a spell from the spell data table
Function SpellCastingCost(sp : integer) : integer;stdcall; forward;
// Returns true is the spell was set as custom in the spell table. (modded spells)
Function SpellIsCustom(sp : integer) : boolean;stdcall; forward;
// For custom spells this returns the animation and sound defined in the spell table. (modded spells)
Function SpellCustomAnimation(sp : integer) : integer;stdcall; forward;
Function SpellCustomSound(sp : integer) : integer;stdcall; forward;
// Returns true if the spell was set as Disabled in the spell data by modding.
Function SpellDisabled(sp : integer) : boolean;stdcall; forward;

// these return the type of a spell
Function IsOverlandUnitTargetingSpell(sp : integer) : boolean;stdcall; forward;
Function IsOverlandSpell( i : integer) : boolean;stdcall; forward;
Function IsCombatSpell( i : integer) : boolean;stdcall; forward;

// Returns true when a spell is available to cast for a wizard or unit in combat
Function CombatSpellAvailable(caster,sp : integer) : boolean;stdcall; forward;
// Returns true if the wizard has enough skill and mp to cast a combat spell
Function CanAffordCombatSpell(w,sp : integer) : boolean;stdcall; forward;
// Same as above but when the spell is cast by a unit. Use SetCaster with the negative unit id before calling this.
Function CanUnitAffordCombatSpell(sp : integer) : boolean;stdcall; forward;

// These convert spell IDs to other associated IDs (enchantment, unit type, etc)
Function SpellIDToCombatGlobalEnchantment(sp : integer) : integer;stdcall; forward;
Function SpellIDToGlobalEnchantment(sp : integer) : integer;stdcall; forward;
Function SpellIDToCityEnchantment(sp : integer) : integer;stdcall; forward;
Function SpellIDToSummon(sp : integer) : integer;stdcall; forward;
Function CombatGlobalEnchantmentToSpellID(sp : integer) : integer; stdcall; forward;
Function CityEnchantmentToSpellID(sp : integer) : integer;stdcall; forward;
Function GlobalEnchantmentToSpellID(sp : integer) : integer;stdcall; forward;
Function UnitEnchantmentToSpellID(sp : integer) : integer;stdcall; forward;
// For spells that aren't a global enchantment but use a global enchantment animation, such as Spell Binding, this returns the global enchantment ID for the enchantment image to display
Function SpecialSpellIDToGlobalEnchantment(sp : integer) : integer;stdcall; forward;

// Returns the player ID of the wizard who has Time Stop in effect or -1 if no one does.
Function TimeStop : integer;stdcall; forward;
// Returns how many spells are in a specific realm and rarity. (default is 10 for common and uncommon, 12 for rare and very rare but moddable)
Function NumberofSpellsInTier(Realm, Rarity : integer) : integer;stdcall; forward;
// Returns the strength of the fortress lightning in the current battle
Function FortressLightningStrength : integer;stdcall; forward;
// Returns the attack strength of a spell in the spell data table
Function SpellAttackStrength(sp : integer) : integer;stdcall; forward;
// Returns the area radius of the Earth Lore spell.
Function EarthLoreSize : integer;stdcall; forward;
// Returns the casting cost that needs to be paid to cast the spell in general
Function EffectiveCastingCost(w, sp : integer) : integer;stdcall; forward;
// Returns the casting cost locked in for the spell currently being cast by the wizard
Function OverlandSpellEffectiveCost(w : integer) : integer;stdcall; forward;
// Returns how much was already spent into the current overland spell being cast
Function CastingDone(w : integer) : integer;stdcall; forward;
// Returns the cost of a spell without cost modifiers. If the spell is already being cast, also includes the slider cost, otherwise it does not.
Function CombatBaseCost(w, sp : integer) : integer;stdcall; forward;
// Returns how much Drain Power would drain from wizard w
Function DrainPowerAmount(w : integer) : integer;stdcall; forward;
// returns at how many books "guaranteed" picks change to "early research" picks.
function EarlyTresholdUncommon : integer;stdcall; forward;
function EarlyTresholdRare : integer;stdcall; forward;
// Returns true if a spell rarity tier gives starting spells instead of guaranteed or early spells.
Function SpellRarityStarting(n : integer) : boolean;stdcall; forward;
//-----------------------------
// City data
//-----------------------------
// Returns the status of a city enchantment. -1 indicates no player has cast that enchantment on that city, otherwise the player ID of the owner is returned.
Function CityEnchantmentOwner(c,ce : integer) : integer;stdcall; forward;
Function Cityenchantmentineffect(c,ce: integer) : boolean;stdcall; forward;
Procedure SetCityEnchantmentOwner(c,ce,ow : integer);stdcall; forward;
// The owner of the city
Function CityOwner(c : integer) : integer;stdcall; forward;
// The location of the city
Function CityPlane(c : integer) : integer;stdcall; forward;
Function CityX(c : integer) : integer;stdcall; forward;
Function CityY(c : integer) : integer;stdcall; forward;
// Returns the current population and race of the city
Function CityPopulation(c : integer) : integer;stdcall; forward;
Function CityRace(c : integer) : integer;stdcall; forward;
// Returns the name of a city
Function CityName(c : integer) : shortstring;stdcall; forward;
Procedure SetCityName(c : integer; na : shortstring);stdcall; forward;
// Returns the size rating of a city. (Outpost, Hamlet, etc)
Function CitySize(c : integer) : integer;stdcall; forward;
// Returns the size rating of a city for drawing it on the map.
Function CitySize2(c : integer) : integer;stdcall; forward;
// Returns true if the city is someone's fortress city
Function Fortress(c : integer) : boolean;stdcall; forward;
// Returns the produced resources of a city.
// Note : If the city's cached data was marked invalid, it will recalculate data and fill detailed resource information.
Function CityFoodProduction(cityID : integer) : integer;stdcall; forward;
Function CityResearchProduction(cityID : integer) : integer;stdcall; forward;
Function CityPowerProduction(cityID : integer) : integer;stdcall; forward;
Function CityGoldProduction(cityID : integer) : integer;stdcall; forward;
Function CityProductionProduction(cityID : integer) : integer;stdcall; forward;
Function CityGrowth(cityID : integer) : integer;stdcall; forward;
// returns the total building maintenance for a city and fills detailed resource information.
Function CityBuildingMaintenance(cityID : integer) : integer;stdcall; forward;
// Marks the cached city resource data invalid. Use this to force recalculating the data and filling detailed resource information.
Procedure ResetCityData(c : integer);stdcall; forward;
// Same but for all cities
Procedure ResetAllCityData;stdcall; forward;
// Returns the number of entries and each entry in the detailed resource list for the city. The above functions must be used to generate this data first.
Function NofResourceLines : integer;stdcall; forward;
Function CityResourceLineAmount (n : integer) : integer;stdcall; forward;
Function CityResourceLineText (n : integer) : shortstring;stdcall; forward;
// Returns how much a building would cost when produced in a city
Function ProductionCost(Ci : integer; building : integer) : integer;stdcall; forward;
// Returns the amount of producton still required to complete the current project.
Function RemainingProductionCost(ci : integer) : integer;stdcall; forward;
// Returns the current amount of city production done.
Function CityProductiondone(c : integer) : integer;stdcall; forward;
// Returns the size of the production queue for the city
Function ProductionQueueCount(ci : integer) : integer;stdcall; forward;
// Returns the Qth item in the city's production queue. 1st item is the currently produced one.
Function ProductionQueue(ci,q : integer) : integer;stdcall; forward;
// Returns true if a queue item in a city was marked for autobuy
Function Autobuy(c,q : integer) : boolean;stdcall; forward;
Procedure ToggleAutoBuy(c,q : integer);stdcall; forward;
// Returns the selling price of a building.
Function SellPrice(b : integer) : integer;stdcall; forward;
// Returns the first or second building requirement for building b.
// i must be 1 or 2.
Function BuildingRequirement(b,i : integer) : integer;stdcall; forward;
// Same but for building units. i must be 1, 2 or 3.
Function UnitBuildingRequirement(b,i : integer) : integer;stdcall; forward;
// Returns true if city C has a race that allows building the ith building.
Function AllowedBuilding(c,i : integer) : boolean;stdcall; forward;
// Returns the upkeep cost of a building type
Function BuildingUpkeep(b : integer) : integer;stdcall; forward;
// Reads or stores the state of the "Housing/Trade Goods/Repeat Production" toggle button
Function HousingTradeLoop(c : integer) : integer;stdcall; forward;
Procedure SetHousingTradeLoop(c,s : integer);stdcall; forward;
// Fills the available production data for a city.
Procedure getavailableproduction(CC : integer);stdcall; forward;
// Returns how many different units and buildings can be produced after the above call
Function NofAP : integer;stdcall; forward;
// Returns the Nth item from the list of available production
Function AvailableProduction(n : integer) : integer;stdcall; forward;
// Returns the highest valid city population from modding settings
Function MaximalCityPopulationCap : integer;stdcall; forward;
// Returns the maximal population of a city before or after applying the maximal population cap.
Function CityMaxPop(cityID : integer) :  integer;stdcall; forward;
Function CityMaxPopUncapped(cityID : integer) :  integer;stdcall; forward;
// Returns the unrest of a city
Function CityUnrest(cityID : integer) : integer;stdcall; forward;
// Returns the minimal required farmers for the city to feed itself
Function CityMinimalfarmers(cityID : integer) : integer;stdcall; forward;
// Returns true if a "Raze" order was issued by the player
Function CityRazing(cityID : integer) : boolean;stdcall; forward;
Procedure SetCityRazing(cityID : integer; b  : boolean);stdcall; forward;
// Returns the number of farmers set for the city (including minimal farmers)
Function CityFarmers(cityID : integer) : integer;stdcall; forward;
Procedure SetCityFarmers(cityID,fa : integer);stdcall; forward;
// Returns the Rally destination of a city, or -1 if unset.
Function CityRallyX(c : integer) : integer;stdcall; forward;
Function CityRallyY(c : integer) : integer;stdcall; forward;
Procedure SetCityRally(c,x,y : integer);stdcall; forward;
// Returns the state of a building in a city (not build, built, destroyed etc)
Function CityBuildingState(c,b : integer) : integer;stdcall; forward;
// Removes Housing or Trade Goods from the end of the building queue.
Procedure RemoveHTfromqueue(cityID : integer);stdcall; forward;
// Adds Housing or Trade Goods to the end of the building queue according to the city settings.
Procedure AddHTInqueue(cityID : integer);stdcall; forward;
// Returns the name of a city enchantment in a city enchantment slot.
// Do not use the spell name from the spell table as "life/death/etc" wards are unique enchantments from the same spell.
Function CityEnchantmentName(EncID:integer) : shortstring;stdcall; forward;
// Returns true if building cannot be sold or destroyed because another building needs it
Function BuildingRequired(c,b : integer) : boolean;stdcall; forward;
// Returns true if a building was already sold in a city this turn and another cannot be sold.
Function CitySoldBuilding(c : integer) : boolean;stdcall; forward;
// Reads or sets all data for a city.
Function GetCityData(c : integer) : CityT;stdcall; forward;
Procedure SetCityData(c : integer; da : CityT);stdcall; forward;
// Returns true if the prerequisites are built for a building in a city.
// if queueok is true, requirements in the queue are also acceptable (this is safe when adding a new item to the end of the queue)
Function HasRequirement(Ci : integer;building : integer; queueok : boolean) : boolean;stdcall; forward;

//-----------------------------
// Wizard data
//-----------------------------
// Returns the status of a global enchantment cast/not cast by wizard w
Function HasGlobalEnchantment(w,ge : integer) : boolean;stdcall; forward;
Procedure SetGlobalEnchantment(w,ge : integer; state : boolean);stdcall; forward;
// Returns the state of a spell. 0 = unknown, 1 = researchable, 2 = known, 3 = selectable for research
Function SpellKnown(w,sp : integer) : integer;stdcall; forward;
Procedure SetSpellKnown(w,sp,state : integer);stdcall; forward;
// Returns the spell the wizard is currently casting.
Function CurrentCasting(w : integer) : integer;stdcall; forward;
Procedure SetCurrentCasting(w,cc : integer);stdcall; forward;
// Returns the spell the wizard is currently reseaching.
Function CurrentResearch(w : integer) : integer;stdcall; forward;
Procedure SetCurrentResearch(w,r : integer);stdcall; forward;
// Calculates how many turns are left to finish researching a spell for a wizard.
Function ResearchTurns(w,sp : integer) : integer;stdcall; forward;
// Returns the number of heroes owned by a wizard
Function Heroesowned(w : integer) : integer;stdcall; forward;
// Returns the unit ID of the hero in the Nth hero slot (1-6) for wizard w
Function HeroOwned(w,n : integer) : integer;stdcall; forward;
// Returns the cooldown turns remaining for spell binding and number of times already used.
Function SpellBindingCooldown(w : integer) : integer;stdcall; forward;
Function SpellBindingUses(w : integer) : integer;stdcall; forward;
// Returns the maximal uses of Spell Binding according to the modding settings.
Function SpellBindingMaxUses : integer;stdcall; forward;
// Returns the state of Tree of Knowledge
Function TreeCast(w : integer) : boolean;stdcall; forward;
// Returns the name of the wizard.
Function WizardName(w : integer) : str30;stdcall; forward;
Procedure SetWizardName(w : integer; s : str30);stdcall; forward;
// Returns the portrait ID of a wizard
Function WizardPortrait(w : integer) : integer;stdcall; forward;
Procedure SetWizardPortrait(w,p : integer);stdcall; forward;
// Returns the starting (home) race of a wizard
Function WizardRace(w : integer) : integer;stdcall; forward;
Procedure SetWizardRace(w,r : integer);stdcall; forward;
// Returns the number of books a wizard has in a realm.
Function WizardBooks(w, r : integer) : integer;stdcall; forward;
Function WizardAllBooks(w : integer) : BookT;stdcall; forward;
Procedure SetWizardBooks(w, r, n : integer);stdcall; forward;
// Returns true if the wizard has the specified retort.
Function HasRetort(w, r : integer ) : boolean;stdcall; forward;
Function WizardAllRetrts(w : integer) : RetortT;stdcall; forward;
Procedure SetWizardRetort(w,r : integer; re : boolean);stdcall; forward;
// The city ID of the Summoning Circle
Function CircleCity(w : integer) : integer;stdcall; forward;
//  The city ID of the Fortress, assuming the wizard is not banished, otherwise the returned value contains the city where they used to have their fortress.
Function FortressCity(w : integer) : integer;stdcall; forward;
// Returns true if the wizad was eliminated or banished.
Function Defeated(w : integer) : boolean;stdcall; forward;
Function Banished(w : integer) : boolean;stdcall; forward;
// Returns the Historian Graph total value for wizard w, turn t. (Historian data is always only available up to the current turn minus 1!)
Function HistorianTotal(w,t : integer) : integer;stdcall; forward;
// Returns the values of each historian rating category
Function HistorianPop(w,t : integer) : integer;stdcall; forward;
Function HistorianSpell(w,t : integer) : integer;stdcall; forward;
Function HistorianPower(w,t : integer) : integer;stdcall; forward;
Function HistorianMili(w,t : integer) : integer;stdcall; forward;
// Returns the relation value recorded in the diplomacy history
Function RelationHistory(w,w2,turn : integer) : integer;stdcall; forward;
// Returns the item currently being created by the wizard using the enchant item or create artifact spell
Function CreatingItem(w : integer) : ItemT;stdcall; forward;
// Gold and Mana owned by the wizard
Function WizardGold(w : integer) : integer;stdcall; forward;
Function WizardMana(w : integer) : integer;stdcall; forward;
Procedure SetWizardGold(w,g : integer);stdcall; forward;
Procedure SetWizardMana(w,m : integer);stdcall; forward;
// Total SP in a wizard's SP pool
Function WizardSP(w : integer) : integer;stdcall; forward;
// Returns the number of picks remaning for a wizard during character creation.
Function RemainingPicks(w : integer) : integer;stdcall; forward;
// Returns the chosen flag color for the wizard
Function GetFlagColor(w : integer) : integer;stdcall; forward;
Procedure SetFlagColor(w,fc : integer);stdcall; forward;
// Returns the unit type ID of the best unit type wizard w has.
// This is the highest production cost non-settler unit.
Function BestUnit(w : integer) : integer;stdcall; forward;
// Returns the personality and objective of a wizard
Function WizardPersonality(w : integer) : integer;stdcall; forward;
Function WizardObjective(w : integer) : integer;stdcall; forward;
// Returns the primary realm of a wizard. (highest number of books when starting the game)
Function PrimaryRealm(w : integer) : integer;stdcall; forward;
Procedure SetPrimaryRealm(w,pr : integer);stdcall; forward;
// Returns how much casting skill the wizard has. These are the total amounts, not considering what might have been spent already.
Function CastingskillCombat(w : integer) : integer;stdcall; forward;
Function CastingskillOverland(w : integer) : integer;stdcall; forward;
// Returns the Base skill (not counting combat only and overland only skill)
Function BaseCastingskill(w : integer) : integer;stdcall; forward;
// Returns cast skill granted by heroes in the fortress
Function Heroskill(w : integer) : integer;stdcall; forward;
// Returns the ability level (0, 1, 2) for ht hero type, w wizard and ha hero ability.
Function GetHeroAbility(w,ht,ha : integer) : integer;stdcall; forward;
Procedure SetHeroAbility(w,ht,ha,lv : integer);stdcall; forward;
Procedure IncHeroAbility(w,ht,ha : integer);stdcall; forward;
// Returns how many cities are owned by a wizard, and how many of those are not being currently razed
Function NofOwnedCities(w : integer) : integer;stdcall; forward;
Function NofOwnedCitiesRaze(w : integer) : integer;stdcall; forward;
// Returns the power distribution settings of a wizard (percentage of power converted into each resource)
Function PowerdistributionMana(w : integer) : integer;stdcall; forward;
Function PowerdistributionResearch(w : integer) : integer;stdcall; forward;
Function PowerdistributionSkill(w : integer) : integer;stdcall; forward;
// Set the above variables
Procedure SetPDSkill(w,s : integer);stdcall; forward;
Procedure SetPDMana(w,m : integer);stdcall; forward;
Procedure SetPDResearch(w,r : integer);stdcall; forward;
// Returns the item in the Nth slot of a wizard's vault.
Function VaultItem(w,n : integer) : ItemT;stdcall; forward;
Procedure SetVaultItem(w,n : integer; i : ItemT);stdcall; forward;
// Returns how much skill the wizard still has left available to spent for the turn or in the current combat.
Function OverlandSkillLeft(w : integer) : integer;stdcall; forward;
Function CombatSkillLeft(w : integer) : integer;stdcall; forward;
// Returns how much Fame the wizard has
Function GetFame(w : integer) : integer;stdcall; forward;
// Returns how much more RP is needed to research a spell for a wizard
Function RemainingRPCost(w, spellID : integer) : integer;stdcall; forward;
// Return how many spells are currently available for selection on the player's research list (up to 8).
Function NofResearchAvailable(w : integer) : integer;stdcall; forward;
// Reads or sets all data for a wizard.
Function GetWizardData(w : integer) : WizardT;stdcall; forward;
Procedure SetWizardData(w : integer; da : WizardT);stdcall; forward;
// Reads or sets the tax rate.
Function GetTaxRate(w : integer) : integer;stdcall; forward;
Procedure SetTaxRate(w,t : integer);stdcall; forward;
// Returns the unrest percentage for the Nth tax rate level.
Function TaxrateUnrest(n : integer) : integer;stdcall; forward;



//-----------------------------------------
// Diplomacy data
//-----------------------------------------
// Returns true if the two wizards have diplomatic contact
Function DiplomaticContact(w,w2 : integer) : boolean;stdcall; forward;
Procedure SetDiplomaticContact(w,w2 : integer; state : boolean);stdcall; forward;
// Returns the treaty between the two players (0 = none, 1 = pact, 2 = alliance, 3 = war)
Function DiplomaticTreaty(w,w2 : integer) : integer;stdcall; forward;
// Returns the AI wizard ID during a diplomacy audience
Function AudienceAI : integer;stdcall; forward;
// Returns the diplomacy text ID currently displayed in the audience
Function AudienceText : integer;stdcall; forward;
// Returns true if the current audience has to be ended due to the player making too many requests.
// (AudienceAI must be set. Only applies when the human player requested the auidence and is currently in the menu to select options.)
Function DiplomacyExhausted : boolean;stdcall; forward;
// Returns the relation value between the two wizards (-100 to 100)
Function Relation(w,w2 : integer) : integer;stdcall; forward;
// Note : Functions below return data from the "AudienceAI" wizard specificially.
// Returns the diplomacy text ID of what the AI wizard wants to say to the human player next time there is an audience
Function DiplomaticReactionID : integer;stdcall; forward;
// Returns the first or second parameter of the diplomacy reaction text.
// There are usually wizard, city or spell IDs, depending on the which text ID it was.
Function DiplomaticReactionParameter1 : integer;stdcall; forward;
Function DiplomaticReactionParameter2 : integer;stdcall; forward;
// Returns true and the treaty type if a warning type diplomatic reaction has been
// escalated into breaking a treaty.
Function EscalatedWarning : boolean;stdcall; forward;
Function EscalationBrokenTreaty : integer;stdcall; forward;
// Returns the treaty ID of the treaty the human player broke last with the current audience wizard.
// This treaty is referenced in offer refusal texts.
Function LastBrokenTreaty : integer;stdcall; forward;
// When refusing, this contains a warning type reaction ID to reference as the reason for refusal such as "you cursed my cities, so no peace"
Function RejectOfferType : integer;stdcall; forward;
Procedure ClearRejectOfferType;stdcall; forward;
// Parameters for the above such as the curse spell id or city id.
Function RejectOfferParameter1 : integer;stdcall; forward;
Function RejectOfferParameter2 : integer;stdcall; forward;

// During an AI spell trade offer, this contains the list of spells the AI can offer. N = 1 to 4.
Function SpellTradeList(n : integer) : integer;stdcall; forward;
// Returns the ID of the targeted wizard during a "Break alliance" demand from an AI.
Function Breakalliancewith : integer;stdcall; forward;
// Calculates the amount of gold to be given as a reward for attacking a mutual enemy.
// Returns the amount in I and ALSO TRANSFERS THIS AMOUNT OF GOLD FROM WIZARD W TO THE HUMAN PLAYER!
Procedure GoldRewardAmount( w : integer; var i : integer);stdcall; forward;
// When the human player attempts to trade spells, this is the list of spells the player can choose to receive
Function SpellTradeListGet : SpellTradeListT;stdcall; forward;
// And after they choose that spell, this is the list of what they are allowed to give in return.
Function SpellTradeListGive : SpellTradeListT;stdcall; forward;
// After the human player selected the spell they try to trade for, this is that spell ID.
Function SpellTradeHumanWant : integer;stdcall; forward;
// When the human player wants to offer a tribute, this is the base amount of gold required for the lowest level tribute.
Function TributeAmount : integer;stdcall; forward;
// List of available targets for a "Declare War On" request in the diplomacy menu.
Function NofDoWTargets : integer;stdcall; forward;
Function DoWTarget(n : integer) : integer;stdcall; forward;
// After the human player has chosen from the list, this is the target for the war declaration request.
Function AIDoWOn : integer;stdcall; forward;
// Same for the "Break Alliance With" request
Function NofBAllTargets : integer;stdcall; forward;
Function BAllTarget(n : integer) : integer;stdcall; forward;
// When the AI refers a previous spell tribute as the reason for accepting a player offer, this is the spell ID of that spell.
Function TributeSpellRefer : integer;stdcall; forward;
// Returns the treaty offer type the player is selected
Function PlayerOfferedTreaty : integer;stdcall; forward;
// Returns a unit ID if the human player's units on the tile violate any wizard's pact, -1 otherwise.
Function AnyPactViolation(p,x,y : integer): integer;stdcall; forward;
// Returns true if the two wizards are close enough on the map to declare war. (Note, this only restricts AI player war declaration of specific types. If elim is true, it is checked for the limination war declaration type specifically.)
Function InRangeForWardec(w,w2 : integer; Elim : boolean) : boolean;stdcall; forward;
// Returns how many turns are remaining of a peace treaty between the wizards.
Function PeaceCounter(w,w2 : integer) : integer;stdcall; forward;
// Returns true if the Final War was activated.
Function FinalWar : boolean;stdcall; forward;
//-----------------------------
// Map data
//-----------------------------
// Returns the player ID of the player who has a unit on the specified overland tile
Function PlayerOnTile(P,x,y : integer) : integer;stdcall; forward;
// Returns the city ID if a city is present on the specified overland tile
Function CityOnTile(P,x,y : integer) : integer;stdcall; forward;
// Returns how many cities are "using" a map tile. (0, 1, or 2)
Function TileCityCount(p,x,y : integer) : integer;stdcall; forward;
// Returns the node ID if a city is present on the specified overland tile
Function NodeOnTile(P,x,y : integer) : integer;stdcall; forward;
// Returns the Lair (encounter zone) ID if a city is present on the specified overland tile
Function LairOnTile(P,x,y : integer) : integer;stdcall; forward;
// Returns true if an overload tile is visible or scouted for the human player.
Function TileVisible(p,x,y : integer) : boolean;stdcall; forward;
Function TileScouted(p,x,y : integer) : boolean;stdcall; forward;
// Returns the overland tile type (Grasslands, Forest, etc)
Function TileType(p,x,y : integer) : integer;stdcall; forward;
// Returns the type of ore or special resource, if any (Mithril, Coal, Nightshade etc)
Function TileOreType(p,x,y : integer) : integer;stdcall; forward;
// Returns the road construction progress of a tile. If >=RoadCompleted then the road is built.
Function TileRoad(p,x,y : integer) : integer;stdcall; forward;
// The amount of construction required for a road to be completed.
Function RoadCompleted : integer;stdcall; forward;
// The direction of the next tile that belongs to the river.
Function TileRiverDirection(p,x,y : integer) : integer;stdcall; forward;
// Returns true if the tile is corrupted
Function IsCorruptedTile(p,x,y : integer) : boolean;stdcall; forward;
// Returns the continent ID of a map tile. 0 means ocean, 1 and 2 are the north and south pole.
Function ContinentID(p,x,y : integer) : integer;stdcall; forward;
// Check whether a tile is sea or land.
 // For waterwalking checks, Lake included!
Function IsNonlandTile(plane,x,y : integer) : boolean;stdcall; forward;
 // For naval move checks. Lake not included!
Function IsSeaTile(plane,x,y : integer) : boolean;stdcall; forward;
// Casting cost penalty for a wizard on a remote map tile.
Function RangePenalty(w: integer; combatplane,combatx,CombatY : integer): real;stdcall; forward;
// Amount of power produced by a node.
Function ThisNodePower(n : integer) : real;stdcall; forward;
// Returns the type of a lair or other encounter zone (lair, tower, node, cave, temple, etc)
Function Lairtype(L : integer) : integer;stdcall; forward;
// Returns the location of a lair
Function LairPlane(L : integer) : integer;stdcall; forward;
Function LairX(L : integer) : integer;stdcall; forward;
Function LairY(L : integer) : integer;stdcall; forward;
// Returns True if any unit in the current combat location has the Stealth ability.
Function HaveStealthForScouting : boolean;stdcall; forward;
// Returns or sets how much a lair was scouted : 0 = not at all, 1 = primary monster seen, 2 = both monsters seen, 3 - monster amounts also known exactly
Function LairScountingLevel(la : integer) : integer;stdcall; forward;
Procedure SetLairScountingLevel(la, lv : integer);stdcall; forward;
// Returns how many and which units are in a lair garrison's first or second slot.
Function LairDefenderUnit(la, slot : integer) : integer;stdcall; forward;
Function LairNofdefenders(la, slot : integer) : integer;stdcall; forward;
// Returns the amount of food (maxpop), gold, production produced by each landtype.
Function TerrainFoodValue(landtp : integer) : integer;stdcall; forward;
Function TerrainProdValue(landtp : integer) : integer;stdcall; forward;
Function TerrainGoldValue(landtp : integer) : integer;stdcall; forward;
// Returns Shore and River gold bonus according to modding settings
Function NearShoreGoldBonus : integer;stdcall; forward;
Function OnRiverGoldBonus : integer;stdcall; forward;
// Fills overland movement path data for building a road between two tiles of the map
Procedure GetRoadPath(plane,x,y,tox,toy : integer);stdcall; forward;
// Returns how many turns are left to build a road on a tile, considering work already done.
Function RoadTimeLeft(plane,x,y : integer) : integer;stdcall; forward;
// Returns the map size of each plane
Function PlaneSizeX(p : integer) : integer;stdcall; forward;
Function PlaneSizeY(p : integer) : integer;stdcall; forward;
// Returns true if at least one tower has been opened by any player.
Function opentowerexists : boolean;stdcall; forward;
// Returns the position of a tower on plane P
Function TowerX(t,p : integer) : integer;stdcall; forward;
Function TowerY(t,p : integer) : integer;stdcall; forward;
// Returns the tower's owner or -1 if neutral.
Function TowerOwner(t : integer) : integer;stdcall; forward;
// Returns the owner of a node or -1 if unclaimed
Function NodeOwner(n : integer) : integer;stdcall; forward;
// Returns the type of a node
Function NodeType(n : integer) : integer;stdcall; forward;
// Returns -1 or the player ID of the wizard who warped the node
Function NodeWarpedBy(n : integer) : integer;stdcall; forward;
// Returns True if a Guardian Spirit melded the node
Function NodeGuardian(n : integer) : boolean;stdcall; forward;
// Returns the position of a Node
Function NodePlane(N : integer) : integer;stdcall; forward;
Function NodeX(N : integer) : integer;stdcall; forward;
Function NodeY(N : integer) : integer;stdcall; forward;
// Returns what type of node aura affects a map tile and who owns it
Function NodeAuraOwner(plane,x,y : integer) : integer;stdcall; forward;
Function NodeAuraType(plane,x,y : integer) : integer;stdcall; forward;
// Calcultes the distance of two overland tiles on the same plane
function OverlandDistance(x,y,x2,y2,plane : integer) : integer;stdcall; forward;
// Returns the required minimal distance between cities accoring to modding.ini
Function MinCityDistance : integer;stdcall; forward;
// Returns the maximal population from terrain
// If visible is true, every tile is counted, otherwise only tiles scouted by the human player.
Function TileMaxPop(plane,x1,y1 : integer; visible : boolean) : integer;stdcall; forward;
// Returns the total production bonus or gold bonus from terrain
Function TileTotalProduction(plane,x1,y1 : integer; visible : boolean) :  integer;stdcall; forward;
Function TileTotalGold(plane,x1,y1 : integer; visible : boolean) :  integer;stdcall; forward;
// Same as above but includes any modifiers from the city such as Gaia's Blessing.
Function CityTerrainProduction(cityID : integer) :  integer;stdcall; forward;
Function CityTerrainGold(cityID : integer) :  integer;stdcall; forward;
// Returns true if a unit is on a specific tile, including being on the other plane position a tower on the checked tile leads to.
function unitonoverlandtile(i,checkplane,checkx,checky : integer) : boolean;stdcall; forward;
// The scale of each plane compared to the default size.
Function PlaneRatio(p : integer) : real;stdcall; forward;
// Returns true if the coordinates are valid on the overland map
Function ValidCoords(p, x, y: integer): boolean;stdcall; forward;
// Returns true if the specified tile is valid for building a city for wizard w.
Function Cansettletile(w,p,x,y : integer) : boolean;stdcall; forward;
// Returns true if the specified unit can build an outpost where it stands right now
Function Cansettleunit(id : integer) : boolean;stdcall; forward;
// Same but for melding, purifying and road building.
function CanMeldunit(id : integer) : boolean;stdcall; forward;
function CanPurifyunit(id : integer) : boolean;stdcall; forward;
function CanBuildroadunit(id : integer) : boolean;stdcall; forward;
// Returns the X and Y coordinates of where switching planes would lead the unit to on the other plane.
// (planes can be different sizes in CoM!)
Function TileOtherPlaneX(p,x,y : integer) : integer;stdcall; forward;
Function TileOtherPlaneY(p,x,y : integer) : integer;stdcall; forward;
// Returns who owns the volcano on the tile (who gains power from it).
// (Note, you must check for the tile being a volcano separately)
Function TileVolcanoOwner(p,x,y : integer) : integer;stdcall; forward;
// Creates a lit of units on a tile, which can then be read using the two functions below
procedure getunitsontile(plane,x,y : integer);stdcall; forward;
// How many units weer found on the tile
Function NofFoundUnits : integer;stdcall; forward;
// Returns the ID of the Nth found unit
Function TileUnits(n : integer) : integer;stdcall; forward;
// Returns true if unit I can move on overland sea and lake tiles.
Function Seaworthy(i : integer) : boolean;stdcall; forward;
// Returns true if a stack as a whole can move on overland sea and lake tiles.
Function SeaworthyStack(p,x,y: integer) : boolean;stdcall; forward;
// returns true if unit U is able to change planes on its current location due to a tower or plane shifting ability.
// "Nof" is the number of units that will move together, however the function has to be called for each unit individually.
Function UnitCanChangePlane(u : integer; nof : integer) : boolean;stdcall; forward;
// Returns how many units are on an overland tile.
function nofunitsontile(plane,x,y : integer) : integer;stdcall; forward;

//-----------------------------
// Combat data
//-----------------------------
// The location of combat if one is in progress
Function CombatPlane : integer;stdcall; forward;
Function CombatX : integer;stdcall; forward;
Function CombatY : integer;stdcall; forward;
// The two players involved in combat
Function Defender : integer;stdcall; forward;
Function Attacker : integer;stdcall; forward;
// The player whose turn it is
Function CombatturnPlayer: integer;stdcall; forward;
// Returns the type of combat location.
Function CombatType : integer;stdcall; forward;
// True if it's the attacker's turn, false if it's the defender's
Function CombatAttackersTurn : boolean;stdcall; forward;
// Returns the number of magic vortexes summoned by the wizard
Function ownedvortexes(w : integer) : integer;stdcall; forward;
// Returns the Nth votrex's position for wizard w
Function VortexX(w,n : integer) : integer;stdcall; forward;
Function VortexY(w,n : integer) : integer;stdcall; forward;
Procedure SetVortexPosition(w,n,x,y : integer);stdcall; forward;
// Returns the state of a combat global enchantment (side = 1 for defender, 2 for attacker)
Function CombatGlobalEnchantment(side,sp : integer) : integer;stdcall; forward;
// Returns true if the tile is a road/river
Function CombatRoad(x,y : integer) : boolean;stdcall; forward;
Function CombatRiver(x,y : integer) : boolean;stdcall; forward;
Function CombatRiverType(x,y : integer) : integer;stdcall; forward;
// Returns true if the defender has a wall or flying fortress enchantment in the curren combat
Function HasWall: boolean;stdcall; forward;
Function HasWallOfDarkness: boolean;stdcall; forward;
Function HasFlyingCity: boolean;stdcall; forward;
Function HasWallOfFire: boolean;stdcall; forward;
// Returns the combat wall slot ID for a combat tile (1-12)
Function ctws(cx, cy: integer): integer;stdcall; forward;
// Returns the wall state for a combat tile (None, Existing, Destroyed)
Function GetWallState(cx, cy: integer): integer;stdcall; forward;
// Returns true if the coordiates are inside the combat map, false if outside.
Function IsValidCombattile(x, y: integer): boolean;stdcall; forward;
// The direction the road continues from the tile. Returns -1,0 or 1.
Function RoadFlowX(x, y: integer): integer;stdcall; forward;
Function RoadFlowY(x, y: integer): integer;stdcall; forward;
// Returns true if unit U is visible for wizard w
Function CanSee(w,u : integer) : boolean;stdcall; forward;
// Returns the combat terrain type on tile x,y
Function CombatTileTerrain(x,y : integer) : integer;stdcall; forward;
// Returns true if the combat tile is has the mud effect on it.
Function IsMud(x,y : integer) : boolean;stdcall; forward;
// Returns the basic terrain type the "center tile" should have drawn under the central object
// for example Nature nodes draw a "grassland" tile under the central big tree.
Function CityTile : integer;stdcall; forward;
// Returns the ID of the central stucture to be draw on the central combat tile.
// 1 : Fortress
// 2 : Outpost
// 3 : Lair/Cave
// 4 : Tower
// 5 : Ruin
// 6 : Keep, Dungeon
// 7 : Temple
// 8 : Stonehenge
// 9 : Sorcery Node
// 10 : Nature Node
// 11 : Chaos Node
Function CentralStructure : integer;stdcall; forward;
// Returns the unit ID of the unit currently on the tile, if any, or -1 otherwise
Function CombatUnitOntile(tx,ty : integer) : integer;stdcall; forward;
// Returns true if unit U is allowed to attack unit U2
Function Rangedattackvalid(u, u2: integer): boolean;stdcall; forward;
Function Meleeattackvalid(u, u2: integer): boolean;stdcall; forward;
// Returns how much % damage reduction happens on ranged attacks from unit AU to DU.
Function RangedPenalty(au, du: integer): integer;stdcall; forward;
// Returns true if unit U can move to tile TX,TY.
// Can only be called when movement cost data for unit U was already calculated.
Function Combatmovelegal(u,tx,ty : integer) : boolean;stdcall; forward;
// Returns the move cost of entering the tile
// Can only be called when movement cost data was already calculated.
Function CMoveCosts(tx,ty : integer) : integer;stdcall; forward;
// Returns the total movement cost to a destination tile from the current movement cost data.
Function CTotalMoveCost(tx,ty : integer) : integer;stdcall; forward;
// Returns the length of the path for a combat movement.
Function CFoundPathLength : integer;stdcall; forward;
// Returns the coordinates of the Nth tile in the combat movement path
Function CFoundPathX(n : integer) : integer;stdcall; forward;
Function CFoundPathY(n : integer) : integer;stdcall; forward;
// Set the above variables to contain a single tile path. Used for moving vortexes manually.
Procedure SetOneTileCombatPath(tx, ty : integer);stdcall; forward;
// Returns true if unit u or coordinates x,y are in the combat area that counts as inside the city walls.
Function Insidewalls(u: integer): boolean; overload;stdcall; forward;
Function Insidewalls(x,y: integer): boolean; overload;stdcall; forward;
// Returns true if unit U is supposed to destroy walls on tiles it attacks or moves through.
Function CrushWall(u : integer) : boolean;stdcall; forward;
// Sets the wall status on a combat tile to "Destroyed" if a wall is present
Procedure Destroywall(cx, cy: integer);stdcall; forward;
// Returns true if it's safe to flee for the human player (guaranteed no units lost)
Function SafeFleeing : boolean;stdcall; forward;
// Returns the current combat turn count
Function CombatTurn : integer;stdcall; forward;
// Returns true if the once per turn spellcasting chance wasn't used up by the current player
Function Castingavailable : boolean;stdcall; forward;
// Returns true when one side ran out of units and the combat has to end.
Function CheckCombatEnd: boolean;stdcall; forward;

//-----------------------------
// Other
//-----------------------------
// Returns the ID of the Chosen hero (Incarnation)
Function ChosenID : integer;stdcall; forward;
// Returns true if wizard w has a city within r tiles of p,x,y. If samecont is true, the tile has to be on the same continent.
Function Hascityinrange(r,w,p,x,y : integer; samecont : boolean) : boolean;stdcall; forward;
// Returns the Nth predefined item's data.
// Items 1-250 are the predefined items in items.ini.
// Items 251-500 are additional predefined items players can create through the UI.
Function PredefinedItem(n : integer) : ItemT;stdcall; forward;
// Returns true when Debug mode is enabled
Function Debug : boolean;stdcall; forward;
Procedure ToggleDebug;stdcall; forward;
// Returns true if saving is in progress
Function SaveInProgress : boolean;stdcall; forward;
// Returns the default wizard name for each wizard selection slot
Function Defaultwizardname ( i : integer) : shortstring;stdcall; forward;
Function DefaultWizardBooks (w : integer) : BookT;stdcall; forward;
Function DefaultWizardRetorts (w : integer) : RetortT;stdcall; forward;
// Returns the name of a retort
Function RetortName( i :integer) : shortstring;stdcall; forward;
// Returns the number of retort picks allowed at the start of the game according to the modding settings.
Function MaximalStartingRetorts : integer;stdcall; forward;
// Returns true if the retort r is allowed to be picked for the wizard w
// limit is the maximal allowed retort count at the time this call, treasure should be true if the retort is being found in treasure.
function Retortavailable(w: integer; r: integer; limit : integer; treasure : boolean): boolean;stdcall; forward;
// Returns the reason why a retort is not available. (mutually exclusive, not enough picks, etc)
function RetortUnavailableReason(w: integer; r: integer): shortstring;stdcall; forward;
// Returns the number of available starting, guaranteed or guaranteed early spell picks for the selected rarity and number of books
Function StartingMaxSpellPicks(rarity,books : integer) : integer;stdcall; forward;
// Returns true if wizard w has picked spell sp during starting spell selecton.
// Note : AI wizards are only created and fill this data during map generation.
// Use PickSS(w,sp) and UnpickSS to set the chosen spells.
Function WasSSPicked(w: integer; sp: integer): boolean;stdcall; forward;
// Returns how many spells are already picked for wizard w, realm re, rarity r.
Function PickedSSCount(w: integer; re, r: integer): integer;stdcall; forward;
// Returns the state of a score modifier (sm) game option
Function ScoreModifier(sm : integer) : boolean;stdcall; forward;
Procedure SetScoreModifier(sm : integer; b : boolean);stdcall; forward;
// Takes the entry from the Unit Tables (units.ini data) and creates a unit
// of that type in unit slot beyond the last (maxunitslots+1).
// Use this to show production and hiring dialogue windows.
Procedure CreateVirtualUnit(u : integer);stdcall; forward;
// Returns the type of houses to draw for a race according to the modding settings.
Function HouseType(race : integer) : integer;stdcall; forward;
// Returns the name of the unit or building for production screens.
// Units use their unit ID+1000, buildings use their building ID as production ID.
Function Productionname(i : integer) : shortstring;stdcall; forward;
// Returns the name of a building;
Function BuildingName(i : integer) : shortstring;stdcall; forward;
// Simulates an Automatic Combat for the current combat location
// with the human player as attacker and the neutral player as defender.
// Uses the units inside the lair lr at the combat tile as the defending army.
// Use this for the Smart Familiar feature
Function SimulateCombat(lr : integer) : CombatResultT;stdcall; forward;
// Returns the adjusted creation cost of an item
Function NonLinearCost(it : ItemT) : integer;stdcall; forward;
// Returns the non-adjusted item cost, the sum of the costs of the powers and the base item.
Function LinearCost(it : ItemT) : integer;stdcall; forward;
// Returns the fame requirement threshold between heroes and champions.
Function FameChampion : integer;stdcall; forward;
// Returns the parameters of the Necromancy ability set in modding.ini
Function NecromancyBudgetPerLevel : integer;stdcall; forward;
Function NecromancyBaseBudget : integer;stdcall; forward;
// Returns true if a hero ability scales with levels
Function HeroAbilityScaling( ha : integer) : boolean;stdcall; forward;
// Returns true if the hero ability has a super version
Function HeroAbilitySuper( ha : integer) : boolean;stdcall; forward;
// Returns the name of a hero ability
Function HeroAbilityName( ha : integer) : shortstring;stdcall; forward;
// Returns the icon ID and Help Entry ID for a hero ability from the modding files
Function HeroAbilityIcon( ha : integer) : integer;stdcall; forward;
Function HeroAbilityHelpEntry( ha : integer) : shortstring;stdcall; forward;
// Returns the amount of bonus value granted by a hero ability.
// Level is the level of the unit, ability is the hero ability ID
// ABLevel is 1 for normal, 2 for a super ability
function HeroBonus(level, ability, ablevel : integer) : integer;stdcall; forward;
// Returns the default hero name for hero type i, wizard j
Function DefaultHeroName(i,j : integer) : shortstring;stdcall; forward;
// Runs the DisAbil.CAS script file to the display of support custom abilities on units.
Procedure RunDisAbil(u : integer);stdcall; forward;
// Runs the DisInfo.CAS script file to make a list of displayable combat effects
Procedure RunDisInfo;stdcall; forward;
// Returns true if the player has enough domination percentage to be allowed to win the game.
Function Winlosedecider : boolean;stdcall; forward;
// Creates an instance of the "prod-1000" unit, as if it was built in city c and returns the unit ID for the unit which is always the unit ID 1 above the last existing unit.
Function CreateUnitPreview(prod,ci : integer) : integer;stdcall; forward;
// Same but uses the mercenary hire window data variables to create the unit.
Function CreateMercenaryPreview : integer;stdcall; forward;
// Same but uses the hero hire window data variables to create the unit.
Function CreateHeroPreview : integer;stdcall; forward;
// Returns the grand total income for the player's empire.
Function totalfoodincome(w : integer) : integer;stdcall; forward;
Function totalpowerincome(w : integer) : integer;stdcall; forward;
Function totalgoldincome(w : integer) : integer;stdcall; forward;
Function totalmanaincome(w : integer) : integer;stdcall; forward;
Function totalmanaupkeep(w : integer) : integer;stdcall; forward;
Function totalmanaincomeBeforeMaintenance(w : integer) : integer;stdcall; forward;
Function totalresearchincome(w : integer) : integer;stdcall; forward;
Function totalSPincome(w : integer) : integer;stdcall; forward;
// Same but separately for each type of source
Function totalcreaturemanaupkeep(w : integer) : integer;stdcall; forward;
Function totalunitbuffmanaupkeep(w : integer) : integer;stdcall; forward;
Function totalcitymanaupkeep(w : integer) : integer;stdcall; forward;
Function totalenchantmentupkeep(w : integer) : integer;stdcall; forward;
Function cityresearchincome(w : integer) : integer;stdcall; forward;
function unitresearch(w : integer) : integer;stdcall; forward;
function unitskill(w : integer) : integer;stdcall; forward;
Function nodepowerincome(w : integer) : integer;stdcall; forward;
function unitpower(w : integer) : integer;stdcall; forward;
Function Citypowerincome(w : integer) : integer;stdcall; forward;
Function volcanopowerincome(w : integer) : integer;stdcall; forward;
Function forestpowerincome(w : integer) : integer;stdcall; forward;
Function AEtherBindingSP(w : integer) : integer;stdcall; forward;
Function PowerLinkGain(w : integer) : integer;stdcall; forward;
Function totalunitfoodupkeep(w : integer) : integer;stdcall; forward;
Function totalunitgoldupkeep(w : integer) : integer;stdcall; forward;
Function totalunitmanaupkeep(w : integer) : integer;stdcall; forward;
// Returns the number of turns a random event was active for, or zero when it's not active.
Function EventStartedTurn(ev : integer) : integer;stdcall; forward;
// Returns data associated with the event (location, etc)
Function EventVal1(ev : integer) : integer;stdcall; forward;
// Return the name of an item power
Function ItemPowerLongName(ip : integer) : shortstring;stdcall; forward;
Function ItemPowerName(ip : integer) : shortstring;stdcall; forward;
// Name of the help entry for an item power
Function ItemPowerHelp(ip : integer) : shortstring;stdcall; forward;
// Returns true if pwr is allowed to be on item type it
Function ItemPowerallowed(pwr,it : integer) : boolean;stdcall; forward;
Function ItemPowerArtifactOnly(pwr : integer) : boolean;stdcall; forward;
// Returns which realm of magic the item power belongs to
Function ItemPowerRealm(pwr : integer) : integer;stdcall; forward;
// Returns how many books are required for the item power to be enchanted into an item
Function ItemPowerBooks(pwr : integer) : integer;stdcall; forward;
// Returns the group ID of the item power or -1 if the power is not grouped.
Function ItemPowerGroup(pwr : integer) : integer;stdcall; forward;
// Returns the cost of an item power to be added to an item
Function ItemPowerCost(pwr : integer) : integer;stdcall; forward;
// Returns the base cost of an item type. (no powers)
Function ItemBasecost(it : integer) : integer;stdcall; forward;
// Returns the autogenerated name of an item
Function GenerateItemName(it : itemT) : shortstring;stdcall; forward;
// Returns true if a ranged attack type ID belongs to a magical, missile or other type ranged attack
Function Ismagicalranged(rt : integer) : boolean;stdcall; forward;
Function Ismissileranged(rt : integer) : boolean;stdcall; forward;
Function Isotherranged(rt : integer) : boolean;stdcall; forward;
// The score multiplier in percentage for each level of difficulty.
Function DifficultyScore(diff : integer) : integer;stdcall; forward;
// The score multiplier in percentage of each score multiplier option in game settings.
Function Optionscoremod(sm : integer) : integer;stdcall; forward;
// Returns the percentage of how close the player is to winning the game.
Function DominationPercentage : integer;stdcall; forward;
// Returns true if debug turn skipping is enabled. The human player's turn should be ended automatically without any human interaction required.
// This mode is used to test AI performance and the general stability of the game.
Function Debugtime : boolean;stdcall; forward;
// Returns the state of debug omnivision, showing all maps and enemy units, to the player.
Function DebugOmnivision : boolean;stdcall; forward;
// Returns the state of the debug mode whch shows invisible enemy units.
Function DebugInvis : boolean;stdcall; forward;
//  Returns the state of the debug god mode (invincible units that deal infinite damage)
Function DebugGod : boolean;stdcall; forward;
// Debug feature that grants diplomatic immunity to the player (no war declaration, hostility or other diplomacy interactions from the AI to the human player)
Function DebugImmunity : boolean;stdcall; forward;
// Returns true if item teleport to heroes who already ended their turn is allowed in modding.ini
Function UnrestrictedItemTeleport : boolean;stdcall; forward;
// Returns the number of units and unit IDs of units that have recently moved and are temporaliy exempt from the item teleport rule. (heroes who just looted new items in the combat they participated in)
Function NofHCM : integer;stdcall; forward;
Function HeroCurrentlyMoving(n: integer) : integer;stdcall; forward;
// Returns true if unit U can use a vial to learn or upgrade the "vial" hero ability.
Function Canvial(u,vial : integer) : boolean;stdcall; forward;
// Returns true if item type itt can be equipped into an item slot type itst.
Function SlotCompatibility(itt,itst : integer) : boolean;stdcall; forward;
// Checks whether two realms are allowed to be picked at the same time in the modding settings.
Function RealmPairAllowed(r1,r2 : integer) : boolean;stdcall; forward;
// Returns how many spell picks are given to the player in each rarity for each number of books.
Function StartingMaxpicks(rarity, books : integer) : integer;stdcall; forward;
// Returns how many races are available on each plane according to modding settings.
Function NofMyrrorRaces : integer;stdcall; forward;
Function NofArcanusRaces  : integer;stdcall; forward;
// Highest valid tax level option.
Function Maxtaxlevel : integer;stdcall; forward;
// Returns the associated image category ID for a projectile type from RangedType.INI or -1 for invalid projectile IDs.
// (the animation for the projectile)
Function ProjectileImageID(n : integer) : integer;stdcall; forward;
// Returns the associated type of unit icons to display in the stat window
// (1 is bow, 2 is rock, 3 is magic, 4 is sling)
Function ProjectileStatIcon(n : integer) : integer;stdcall; forward;
Function ProjectileSound(n : integer) : integer;stdcall; forward;

//--------------------------------------------------------------------------
// Spell Targeting validity functions. 0 means the target is valid. Otherwise the returned code corresponds to the reason for targeting to fail.
//--------------------------------------------------------------------------
// Checks if wizard W is allowed to Spell Blast Wizard I.
Function ValidTargetforSpellBlast(w,i : integer) : integer;stdcall; forward;
// Checks if wizard W is allowed to Drain Power Wizard I.
Function ValidTargetforDrainPower(w,i : integer) : integer;stdcall; forward;
// Checks if wizard W can target tile P,X,Y with spell sp
Function ValidTargetforCityTargetingspell(sp,w,x,y,plane : integer) : integer;stdcall; forward;
// Checks if wizard W can target unit u with spell sp
Function ValidUnitSpellTarget(w,u,sp : integer) : integer;stdcall; forward;
// Checks if wizard W can target tile P,X,Y with the named spell
Function ValidDisenchantAreaTarget(w,x,y,plane : integer) : integer;stdcall; forward;
Function ValidDispellingWaveTarget(w,x,y,plane : integer) : integer;stdcall; forward;
Function ValidDisIllusioniseTarget(w,x,y,plane : integer) : integer;stdcall; forward;
Function ValidFloatingIslandTarget(w,x,y,plane : integer) : integer;stdcall; forward;
Function ValidRaiseVolcanoTarget(w,x,y,plane : integer) : integer;stdcall; forward;
Function ValidCorruptionTarget(w,x,y,plane : integer) : integer;stdcall; forward;
Function ValidChangeTerrainTarget(w,x,y,plane : integer) : integer;stdcall; forward;
Function ValidTransmuteTarget(w,x,y,plane : integer) : integer;stdcall; forward;
Function ValidWarpNodeTarget(w,x,y,plane : integer) : integer;stdcall; forward;
// Checks if a combat tile (or the unit on it) is a valid target for a spell cast during combat
Function ValidCombatSpellTarget(sp,x,y : integer) : integer;stdcall; forward;


//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// These change data or perform game functions.
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
//------------------------
// Spellcasting related
//------------------------
// Sets the spell being cast to None. Call this if the player presses the Cancel button or no valid targets are available.
Procedure CancelSpellCasting;stdcall; forward;
// Sets the spell currently being targeted. (note : Overload spells are not targeted when casting starts, only after they finish casting.)
Procedure SetSpellBeingTargeted(sp : integer);stdcall; forward;
// Sets the spell currently being cast. The UI most likely should not use this directly.
Procedure SetSpellBeingCast(sp : integer);stdcall; forward;
// Sets SpellBeingCast, clears SpellBeingTargeted and SpellHadEffect variables.
// Call this exactly once for each spell after targeting but before anything else.
Procedure InitializeSpellCasting(sp : integer);stdcall; forward;
// Resets the casting related wizard variables to indicate spending mana on the spell is complete.
// Call this immediately when the targeting phase for the spell begins.
Procedure SpellReadyClear(w : integer);stdcall; forward;
// Sets the target of the currently being cast spell to this city.
Procedure SetSpellTargetCity(c : integer);stdcall; forward;
// Set the Caster variable. See the Caster function for the values used.
Procedure SetCaster( i : integer);stdcall; forward;
// Sets the type of Spell Ward being cast ( 0 = not yet chosen)
Procedure SetSpellWardType( i : integer);stdcall; forward;
// Sets the target chosen for Spell Binding (-1 = no target)
Procedure SetSpellBindingTarget( i : integer);stdcall; forward;
// Sets the target chosen for Resurrection (-1 = no target)
Procedure SetResurrectTarget( i : integer);stdcall; forward;
// Call this to cause the currently cast overland spell to take effect
// sp is the spell ID, w is the casting wizard
// Returns non-zero if the spell requires displaying a message due to failure.
Function SpellEffect(sp,w : integer) : integer;stdcall; forward;
// Call this to cause the currently cast combat spell to take effect
// Caster and targets must be already set!
Procedure CombatSpellEffect(sp : integer);stdcall; forward;
// Call this when starting to cast a combat spell, but after InitializeSpellcasting.
// Caster and targets have to be set prior to this call.
// This function spends any costs associated with the spell.
// Returns false if the spell was countered.
// In case of some spells, this will also produce some effects immediately :
// - summoning spells will create the summoned unit (so its data is available for the summoning animation, including stats and even enchantment auras when applied by a global effect)
// - Apocalypse will roll the random effect that will be applied to the unit (but won't apply it yet)
// - Raise Dead and Animate Dead will revive the unit and apply the spell's effects
Function InitializeCombatSpellcasting(sp: integer) : boolean;stdcall; forward;
// Call this when starting to cast an overland spell, but after InitializeSpellcasting.
// As costs for overland spells were already spent before targeting, this only checks for
// the spell being countered and returns false in that case.
Function InitializeOverlandSpellcasting(sp: integer) : boolean;stdcall; forward;
// This boolean value is set false by the Initialize function and true by the Effect function.
// If true, CombatSpellEffect(sp) does nothing.
// This is a fail-safe to guarantee a spell won't activate twice even if the timing to call the effect function is vague.
// Use it to make sure you don't call the spell effect function twice within one spell animation.
// Note to self : These might be unnecessary? Was there any spell that calls the effect function more than once? Seems to only work on combat spells, too. Should deprecate and remove when implementing spell animation modding.
Function SpellHadEffect : boolean;stdcall; forward;
Procedure SetSpellHadEffect( b: boolean);stdcall; forward;
// Call this when an AI player finished casting an overland spell to set all target related variables.
// Returns false if no target was found and the spell is cancelled.
Function AITargetSpell(w,sp : integer) : boolean;stdcall; forward;
// Sets or returns the last page that was open in the overland spellbook.
// (this is stored in the save data for the current game)
Function LastOverlandPage : integer;stdcall; forward;
Procedure SetLastOverlandPage ( i : integer);stdcall; forward;
// Makes wizard W spend mana and skill into their currently cast overland spell.
// set eot=true for the end of turn phase using hero skill, false during the turn.
Procedure ProgressSpellcasting(w : integer; eot : boolean);stdcall; forward;
// Sets the amount of slider cost used for the current spell in percentage (0-100)
Procedure SetoverlandSlider(w, amount : integer);stdcall; forward;
Procedure SetCombatSlider(w, amount : integer);stdcall; forward;
// Makes a wizard start researchig a spell
Procedure StartResearching(w,spell : integer);stdcall; forward;
// Returns true if the currently cast/targeted spell is cast by an AI player. (works both in and out of combat)
Function IsAIcasting : boolean;stdcall; forward;
// When the above returns true, this returns the player ID of the AI player. (the turn player overland or the opponent in the battle during combat.)
Function AIplayerID : integer;stdcall; forward;
// Call this when the player selected a spell to cast from the spellbook.
// This starts spending MP into the spell.
// if the "CastingDone" value exceeds the spell's cost, the spell is ready and has to be cast as soon as the player gets a turn.
Procedure StartCastingOverland(w, sp : integer);stdcall; forward;

//------------------------
// Diplomacy
//------------------------
// Call this when a diplomacy session with the AI ends.
Procedure AudienceEnd;stdcall; forward;
// Sets the diplomacy text ID currently displayed in the audience.
// This is used by various diplomacy functions that determine how to progress an audience such as treaty success rolls.
Procedure SetAudienceText( at : integer);stdcall; forward;
// Sets the text ID in a wizard's diplomacy variable, towards the human player.
Procedure SetDiplomaticReactionID(w,rt : integer);stdcall; forward;
// Sets which AI is currently on the diplomacy screen.
Procedure SetAudienceAI (w : integer);stdcall; forward;
// When the AI replaces their treaty offer with a demand to break an alliance first,
// this is used to set which wizard the human player has to break their alliance with.
Procedure SetBreakalliancewith (w : integer);stdcall; forward;
// When the above demand is triggered, use SetRealOffer to save the real offer the AI
// will show the player after their demand was accepted.
Procedure SetRealOffer( r : integer);stdcall; forward;
// Call this when the player has chosen "trade" from the diplomacy main menu
Procedure SetupSpelltrademenu;stdcall; forward;
// The human player has chosen to request a treaty from the AI
Procedure HumanRequestPact;stdcall; forward;
Procedure HumanRequestAlliance;stdcall; forward;
Procedure HumanRequestPeace;stdcall; forward;
Procedure PlayerAskDoWOnThis(w : integer);stdcall; forward;
Procedure PlayerAskBAllOnThis(w : integer);stdcall; forward;
// The human player accepted the counteroffer the AI made in exchange for one of the above treaty offers. Parameter should always be false, as true means there was no coutneroffer.
Procedure AcceptTreaty(noadditionalrequest : boolean);stdcall; forward;
// The human player selected war declaration from the audience menu
Procedure HumanDeclareWar; stdcall; forward;
// The human player selected to break their treaty
Procedure HumanBreakTreaty;stdcall; forward;
// The human player selected to threaten the AI wizard
Procedure Threaten;stdcall; forward;
// The human player has chosen to tribute gold (amount options 1 to 4)
Procedure TributeGold(goldlevel : integer);stdcall; forward;
// The human player has decided to tribute a spell, go to the spell menu
Procedure TributeSpell;stdcall; forward;
// The human player has chosen from the spell menu, sp is the option they choose from the menu (1-4).
Procedure TributeThisSpell(sp : integer);stdcall; forward;
// The player has chosen the spell they are trading for (1-4)
Procedure SpellTradeWantSpell(sp : integer);stdcall; forward;
// The player has chosen the spell they are giving in exchange (1-4)
Procedure SpellTradeGiveSpell(sp : integer);stdcall; forward;
// The player tried to trade for a spell but picked cancel after the spells they can give in return were presented. (this counts as a failed trade attempt and has consequences. Cancelling before requesting a spell should return to the main menu without calling this.)
Procedure SpellTradeCancel;stdcall; forward;
// After the AI requests a treaty from the human player, the player pressed the "Accept" button.
Procedure PlayerAcceptedAIOffer;stdcall; forward;
// After the AI requests a treaty from the human player, the player pressed the "Reject" button.
Procedure PlayerRejectedAIOffer;stdcall; forward;
// After the AI requests a treaty from the human player, it was refused, and the AI offered an additional bribe but the player refused again.
Procedure PlayerCompletelyRefused;stdcall; forward;
// After the AI requested the spell trade, the player has chosen to accept this spell (1-4) in exchange and the trade is a success.
Procedure SpellTradeToAI(sp : integer);stdcall; forward;
// Call this after the AI paid a spell for a treaty to store this information. (The AI isn't allowed to do this more than once per game.)
Procedure SpellExtortionSuccessful;stdcall; forward;
// The player requests an audience with AI wizard w.
// returns true if the diplomacy subscreen was entered and false
// if it failed due to the player or the AI wizard being banished.
Function InitiateAudience(w : integer) : boolean;stdcall; forward;
// When the player attacks another player, was asked if they are sure to do this and confirmed.
Procedure BreakTreatyByAttacking(w,w2 : integer);stdcall; forward;
// If the player was asked to confirm or cancel an attack for any reason (treaty, lair etc), this tells the game their response.
Procedure ContinueAttacking;stdcall; forward;
Procedure Cancelattack;stdcall; forward;
// If he player has chosen to fight the lair, this creates the garrisoning neutral units. Call before "continueattacking"
// forreal should be true.
Procedure CreateLairDefenders(forreal : boolean);stdcall; forward;


//------------------------
// Other
//------------------------
// Call this to initialize the system. Loads all the data from INI and Dat files.
Procedure GameInitialize;stdcall; forward;
// Call this to clear all additional data not stored in game saves when returning to the main menu or loading a save file. (such as unhandled game triggers like an open hero hire window. )
Procedure ClearGameVariables;stdcall; forward;
// Call this before terminating the application to free variables, close the debug file, etc.
Procedure CloseGame;stdcall; forward;
// This adds a new line of text to the monthly report.
Procedure AddReport(s : shortstring);stdcall; forward;
// This logs text into the log.txt file if debugging is enabled.
Procedure Debuglog(s : str150);stdcall; forward;
// Force the operating system to write all logged text into the debug.txt file by closing and reopening the file.
Procedure Flushdebug;stdcall; forward;
// Human player overland unit movement :
// Process the movement of stacks as ordered starting with the currently selected one.
// StopMove refers to the Move Together optional setting being enabled that forces the stack to unselect and be ignored if one unit runs out of movement as in MoM 1.3.1.
Procedure Automove(SelectedStackSize : integer; SelectedstackUnits : UnitList9; FlagStopmove : boolean);stdcall; forward;
// This returns the last position a unit moved into. Center the view on this tile if the "select previous stack" button was pressed.
Function AutoMoveresetPlane : integer;stdcall; forward;
Function AutoMoveresetY : integer;stdcall; forward;
Function AutoMoveresetX : integer;stdcall; forward;
// Sets the red message window to be shown with this text
// (this can also be triggered by gameplay features)
Procedure Rederror(s : str150);stdcall; forward;
// Sets the state of various game settings
Procedure SetSettingAutoRebuild( b : boolean);stdcall; forward;
Procedure SetSettingRebuildPrompt( b : boolean);stdcall; forward;
Procedure SetSettingRandomItems( b : boolean);stdcall; forward;
Procedure SetSettingEvents( b : boolean);stdcall; forward;
// Performs an autosave. If BS is true, it also produces a numbered turn save.
Procedure AutoSave( bs : boolean);stdcall; forward;
// Sets or reads the auto combat mode.
// 0 - disabled. 1-6 : corresponds to each option in the Auto menu.
// if set to mode 3 or 4, the 1 turn modes, ending the combat turn resets it to zero
// While enabled, spell immunity checks on targeting are handled as though Targeting Aid was on for the human player.
Procedure SetAutoMode(i : integer);stdcall; forward;
Function GetAutoMode : integer;stdcall; forward;
// Sets predefined item N to be item I
Procedure SetPredefinedItem(n : integer; i : ItemT);stdcall; forward;
// Sets the item currently being created by wizard W to be item I
Procedure SetCreatingItem(w : integer; i : ItemT);stdcall; forward;
// Picks the mode for the functions that return avilable races on each plane.
// True includes races playable for neutral cities only.
// False includes races playable for human players only.
Procedure FillRaceArrays(Neutral : boolean);stdcall; forward;
// Set or Unset a starting spell pick for wizard w, realm r, spell ID s
Procedure Pickss(w, r, s: integer);stdcall; forward;
Procedure UnPickss(w, r, s: integer);stdcall; forward;
// Loads the default picks for starting spells
Procedure LoadDefaultSpellPicks;stdcall; forward;
// Returns true after saving the game has failed.
Function SaveFailed : boolean;stdcall; forward;
// Returns the number of ongoing "save game" attempts/threads currently being executed
Function Savecounter : integer;stdcall; forward;
// Same but also counts threads created and allocated to use memory. (Each save data uses roughly 200 MB of RAM so unlimited save threads leads to out of memory crashes without this safety variable being checked when the player spams clicking the end turn button and triggers many autosaves.)
// In general, don't allow saving, manual or automatic, if this returns 2 or more
// and don't allow manual saving if this isn't zero.
Function Savecounter2 : integer;stdcall; forward;
// Selectes the next combat unit that can move.
// Also fills movement cost data on the combat map for the unit
Procedure Autoselectnextcombatunit;stdcall; forward;
// Fills movement cost data on the combat map for the unit,
Procedure CombatGetMoveMatrix(u: integer);stdcall; forward;
// When this returns false, and no unit was selected by the autoselection, the turn should end.
// This is used to prevent the turn ending before the player was able to do anything when their units are all disabled by enemy spells.
Function AllImmobilized : boolean;stdcall; forward;
// Sets the above value to false. Call this after the player successfully took a combat action.
Procedure ClearAllImmobilized;stdcall; forward;
// Applies the effect of Wall of Fire to a unit
Procedure FireWallEffect(u : integer);stdcall; forward;
// Call this after a unit finished a combat movement animation to check whether it needs to do something else (attack, cast a spell, etc)
Procedure ExecuteAICombatOrder;stdcall; forward;
// Force the recalculation of unit stats.
// If CoM is true, recalculates only the units in the current combat.
// If the coordinates are not -1, reclaculates only the units on that specific overland tile.
// Otherwise it will recalculate the stats of every single unit that exists in the game. This can be time consuming so use it carefully and only when necessary!
// Most of the time this is handled by the gameplay automatically, so the UI should only call this when it makes direct changes to unit data that requires or might require it, such as updating the position of a unit after a movement animation finished.
Procedure RecalculateUnits(com : boolean; tap,tax,tay : integer);stdcall; forward;
// Scouts the map for player W, at position P,X,Y and a range of R tiles around it.
// If Cancontact is true, this scouting can trigger enabling diplomatic contact with other players.
// For the human player this sets the tiles as scouted. For AI players who do not have that feature, this sets any city in range as known which enables targeting them with city curses.
Procedure ScoutInRange(w,x,y,p,r : integer; cancontact : boolean);stdcall; forward;
// Refresh visibility information for the human player on the map. Use this if a unit moved or the scouting range of a unit or object changed.
Procedure Recalculatevisibility;stdcall; forward;
// Deal damage to a unit.
Procedure Dealdamage(u, normal, undead, irrec: integer; overland: boolean);stdcall; forward;
// Applies damage to unit U dealt by spell SP.
// If ov is zero, the default spell strength is used, otherwise ov is the used spell strength.
Procedure ApplyDamageSpell(u, sp, ov : integer);stdcall; forward;
//----------------------------------------------
// Note to self : These really should be in the UI part but then DisAbil.CAS becomes impossible.
// Clears the ability display data.
Procedure Clearabilitylines;stdcall; forward;
// Adds a new ability icon to the list of displayable abilities.
Procedure AddAbilityLine(tp,icon : integer; help,txt : shortstring);stdcall; forward;
// Returns the number of ability lines currently stored.
Function NofAL : integer;stdcall; forward;
// Returns the stored Nth ability line's data
Function ALTp(n : integer) : integer;stdcall; forward;
Function ALIcon(n : integer) : integer;stdcall; forward;
Function ALHelp(n : integer) : shortstring;stdcall; forward;
Function ALTxt(n : integer) : shortstring;stdcall; forward;

// Converts the ability line list to production view, only containing data on the first column.
Procedure ConvertALToProductionView;stdcall; forward;

// Replaces the value of S with the hostility level of wizard w. Use for Hostility debugging.
Procedure HostilityDebugText(w : integer; var s : shortstring);stdcall; forward;

// Refresh the research list by adding spells until there are 8 spells available for research selection
Procedure RefreshResearchList(w : integer);stdcall; forward;

// Adds all "Aura" effects such as Holy Bonus as ability lines for combat info view
Procedure AddAuraInfoToCombatInfo;stdcall; forward;

// Causes the unit to change plane (plane shifting or tower)
Procedure UnitChangePlane(u : integer);stdcall; forward;

// Loads a saved game from a file.
Function Loadgame2(filename : str150) : boolean;stdcall; forward;
// Saves the game. This copies game data in the memory into a separate thread immediately so gameplay can continue as normal while saving.
Procedure Savegame(filename : str150);stdcall; forward;

// Orders a unit to settle or meld. The highest city ID will be the new city.
Procedure Settlewith(ID : integer);stdcall; forward;
Procedure Meldwith(id : integer);stdcall; forward;

// Clears all game data. Use when returning to the main menu.
Procedure ClearGameData;stdcall; forward;
// Close and reopen the debug text file to force the OS to write cached data.
Procedure FlushDebugfile;stdcall; forward;

// Enables or disables various debug modes
Procedure ToggleDebugOmnivision;stdcall; forward;
Procedure ToggleDebugInvis;stdcall; forward;
Procedure ToggleDebugImmunity;stdcall; forward;
Procedure ToggleDebugGod;stdcall; forward;
Procedure ToggleDebugTime;stdcall; forward;

// Sets wizard mana, gold and sp.
Procedure SetWizardResources(w,gold,mana,sp : integer);stdcall; forward;

// Ends the current combat turn for the current player.
Procedure CombatEndTurn;stdcall; forward;
// Call this during the human player's turn if the Auto mode is enabled to let the AI make the moves.
Procedure HandleAutoTurn;stdcall; forward;
// Forces a unit to move randomly in combat. Should be called if the unit is affected by confusion and has the "move randomly" effect rolled.
Procedure UnitMoveRandomly(u : integer);  stdcall; forward;
// Orders unit U to move to a tile. Returns false if the move is illegal and failed.
Function CombatMoveOrderByHuman(u,tx,ty : integer) : boolean; stdcall; forward;
// During the AI's combat turn, call this to let the AI perform moves.
Procedure AICombatTurn;stdcall; forward;
// Save all custom item data in the item editor
Procedure Saveitemdata;stdcall; forward;
// Wizard W learns the spell s. (received in trade, etc)
// This will update the current research and in case of the AI, trigger a new research selection if necessary, unlike setting the spell as known directly.
Procedure GainSpell(w,s : integer);stdcall; forward;
// The human player pressed the End Turn button on the overland map
Procedure EndTurnPressed;stdcall; forward;
// Refreshes cached data on how many units are on each map tile, their status (being in a tower or not)
// and if "ownerset" is true, also refreshes tower ownership.
// In most cases the functions handling the movement automatically call this so
// only use it if a unit changed positions directly through the UI without performing movement or calling a function that does so.
// AFAIK only Earth Gate should use this function.
Procedure RefreshUnitsOnMapStatus(ownerset : boolean);stdcall; forward;
// Signals to the UI that the last movement order given was a manual movement other and not an automatic one from the previous turn.
// Call directly before AutomovestackandSelectNext and after setting the Going command and destination on the units.
Procedure SetManualMove; stdcall; forward;
// If the current production item was marked for autobuy and gold is available, buys the item.
Procedure CheckAutoBuy(c : integer);stdcall; forward;
// Sets production queue size in city c to 0.
Procedure ClearProductionQueue(c : integer);stdcall; forward;
// Adds the new item p to the production queue of city c.
Procedure AddtoQueueEnd(c ,p : integer);stdcall; forward;
Procedure AddtoQueueFront(c ,p : integer);stdcall; forward;
// Removes an item from the production queue.
// If it was a building, also removes everythinhg that uses that building as a prerequisite.
// If it was a unit, it removes all instances of that unit from the queue.
Procedure Removefromqueue(cityID,building : integer);stdcall; forward;
// Buys the current production queue item in a city.
Procedure BuyAt(w,c : integer);stdcall; forward;
// Sells a building in a city.
Procedure Sellbuilding(c,b : integer);stdcall; forward;
// Disbands a unit.
Procedure DismissUnit(U : integer);stdcall; forward;
// Sets Vizier status and mode
Function GetVizier : boolean;stdcall; forward;
Procedure SetVizier(v : boolean);stdcall; forward;
Procedure SetVizierMilitary(v : boolean);stdcall; forward;
// The human player decided to flee from combat.
Procedure HumanFleeFromCombat;stdcall; forward;
// Causes the AI to continue processing their overland turn and take action(s).
Procedure ProcessAITurn;stdcall; forward;
// Sets all wizards to no books or retorts.
Procedure ClearWizardBooksRetorts;stdcall; forward;
// Same for one wizard
Procedure ClearBooksRetorts(i : integer);stdcall; forward;
// Generates random books and retorts for the human player's wizard in slot 0.
Procedure Generaterandomcustomwizard;stdcall; forward;
// Causes wizard W to pick the default starting spells
Procedure Pickdefaultspells(w : integer);stdcall; forward;
// Generates the game map, AI wizards, etc.
// The human player's wizard data, map settings and scoring modifiers must be set.
Procedure GenerateNewGame;stdcall; forward;
// Clears the data of item it. If all is true, also clears the type and icon, otherwise those stay unchanged.
Procedure Clearitem(var it : ItemT; all : boolean);stdcall; forward;

//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// These functions signal the need to display something on the UI
//--------------------------------------------------------------------------
//--------------------------------------------------------------------------
// If this returns true, the AutoMove function needs to be called instead of handling user input on the overland map screen.
Function AutoMoverequest : boolean;stdcall; forward;
Procedure ClearAutoMoverequest;stdcall; forward;
// If this returns true, the end of combat report window needs to be displayed.
Function CombatReport : boolean;stdcall; forward;
Procedure ClearCombatReport;stdcall; forward;
// Returns the end of combat report data
Function CombatReportData : CombatReportDataT;stdcall; forward;
// If this returns non-zero, the "N units are raising as undead" animation needs to be displayed.
Function UndeadRaising : integer;stdcall; forward;
Procedure ClearUndeadRaising;stdcall; forward;
// If this returns non-zero, the "N units were converted to zombies" animation needs to be displayed.
Function ZombieRaising : integer;stdcall; forward;
Procedure ClearZombieRaising;stdcall; forward;
//  If this returns non-zero, the hero level up window needs to be displayed for this many heroes.
Function NofHeroLevels : integer;stdcall; forward;
// Returns the stats gained for each hero level up window that needs to be displayed.
Function HeroDefenseUpAmount(he : integer) : integer;stdcall; forward;
Function HeroResUpAmount(he : integer) : integer;stdcall; forward;
Function HeroHPUpAmount(he : integer) : integer;stdcall; forward;
Function HeroAttackUpAmount(he : integer) : integer;stdcall; forward;
Function HeroHitUpAmount(he : integer) : integer;stdcall; forward;
Function HeroMPUpAmount(he : integer) : integer;stdcall; forward;
Function HeroUpUnitID(he : integer) : integer;stdcall; forward;
// Returns the hero type ID of the hero leveling up
Function HeroLevelupHerotype(he : integer) : integer;stdcall; forward;
// Executes "addabilityline" calls for each hero ability that increased in value from the gained levels.
Procedure AddLevelupAbilityLines(he : integer);stdcall; forward;
// Removes the hero level trigger data from the first slot and moves all other slots up by one.
Procedure RemoveHeroLevelTrigger;stdcall; forward;
// If this returns a non-empty string, the "Treasure found" window needs to be displayed. The string contains the treasure message.
Function TreasureReport : shortstring;stdcall; forward;
Procedure ClearTreasureReport;stdcall; forward;
//  If this returns non-zero, the hero hire window needs to be displayed. The unit ID of the available hero is returned.
Function HeroID : integer;stdcall; forward;
Function HeroCost : integer;stdcall; forward;
Procedure ClearHeroHire;stdcall; forward;
Procedure HumanHireHero;stdcall; forward;
// Causes an unhired hero for a wizard to gain a level. This should be called when the hero wasn't hired by the player.
Procedure IncreaseHeroLevel(w, ht : integer);stdcall; forward;
// Returns true if the hero hire windows is the result of a summoning spell
Function WasSummonedHero : boolean;stdcall; forward;
// If this returns true, the merchant dialog needs to be displayed, an item is for sale.
Function MerchantActive : boolean;stdcall; forward;
Function MerchantCost : integer;stdcall; forward;
// Call one of these depending on whether the player has chosen to buy the item or not.
Procedure ClearMerchantActive;stdcall; forward;
Procedure HumanBuyItem;stdcall; forward;
// The item the merchant is selling
Function Merchantitem : ItemT;stdcall; forward;
//  If this returns non-zero, the mercenary hire window needs to be displayed. Returns the number of mercenaries available for hire.
Function MercenaryCount : integer;stdcall; forward;
Function MercenaryCost : integer;stdcall; forward;
Procedure ClearMercenaryActive;stdcall; forward;
Procedure HumanHireMercenary;stdcall; forward;
// If this returns non-zero, a spell is in the targeting phase. The returned value is the spell's ID.
Function SpellBeingTargeted : integer;stdcall; forward;
// If this returns non-zero, a spell is being cast currently.
Function SpellBeingCast : integer;stdcall; forward;
// If this returns non-zero, the "N spells have been dispelled" window needs to be displayed. Returns the number of spells.
Function DispelReport : integer;stdcall; forward;
Procedure ClearDispelReport;stdcall; forward;
// Returns the text for the dispel report message
Function DispelReportMessage : shortstring;stdcall; forward;
// Returns true if a city spell was dispelled, false if only unit spells were dispelled.
Function DispelReportcity : boolean;stdcall; forward;
// If this returns a non-empty string, the "<Spellname> Has been countered" window needs to be displayed. The string contains the message to display.
Function CounterReportMessage : shortstring;stdcall; forward;
Procedure ClearCounterReportMessage;stdcall; forward;
// If this returns non-zero, "completion" reports need to be displayed. (buuilding complete, building destroyed, outpost grown into a city, etc)
Function NofCompletionReports : integer;stdcall; forward;
// Returns the city being reported
Function CompletionReports(i : integer) : integer;stdcall; forward;
// Returns the report type.
// 0 means grown to a city from an outpost.
// A positive number reports finished production of that unit or building.
// A negative number reports a destroyed building
Function CompletionReportBuildings(i : integer) : integer;stdcall; forward;
// Clears the completion report in the first slot and any other reports that target the same city.
Procedure ClearCompletionReport;stdcall; forward;
// If this returns a non-empty string, a random event dialog needs to be displayed, containing this message.
Function EventText : shortstring;stdcall; forward;
// Returns the type of the event
Function Eventtype : integer;stdcall; forward;
Procedure ClearEventReport;stdcall; forward;
// If this returns true, the "prepare combat" dialog for automatic battles needs to be displayed, listing the units entering combat, and asking the player to use or not use spells.
Function PrepareCombatUI : boolean;stdcall; forward;
// Submits the user's response to the above (use or not use spells)
Procedure PrepareCombatUIReponse(spells : boolean);stdcall; forward;
// If this returns a non-empty string, the "red error" type message window needs to be displayed. (this is usually triggered by the player trying to perform an invalid action such as targeting an invalid tile with a spell.
Function RedErrorMessage : str150;stdcall; forward;
// If this returns true, after closing the "red error" message, the application should be terminated.
Function FatalError : boolean;stdcall; forward;
// 0 - No change, 1 - Entered combat, -1 Left combat, -2 Left Diplomacy screen, 2 Entered the diplomacy screen on AI's turn
Function GameStateChangeRequest : integer;stdcall; forward;
Procedure ClearGameStateChangeRequest;stdcall; forward;
// 0 - No event, 1 - Confirmation window for attacking a lair, 2 - Confirmation window for attacking a treaty partner and breaking treaty
Function PrepareCombatDialogTrigger : integer;stdcall; forward;
Procedure ClearPrepareCombatDialogTrigger;stdcall; forward;
// Returns the spell ID when the AI is casting a combat spell
Function AICombatCastingRequest : integer;stdcall; forward;
Procedure ClearAICombatCastingRequest;stdcall; forward;
// PlayerID, or +100 if defeated. If human player is banished, ask player to resign or continue and move to banish or defeat accordingly.
// -1 means no action requierd.
Function BanishPlayerRequest : integer;stdcall; forward;
Procedure ClearBanishPlayerRequest;stdcall; forward;
// Call this after a wizard was banished and the animation is over to produce the effects of being banished. Might trigger a Win or Lose request below.
Procedure BanishmentEffect(def : boolean);stdcall; forward;
// Returns -1 if the "lose game" screen should be shown to the player and 1 if the "win game" screen should be shown. Either way the game ends and scoring happens afterwards.
Function WinLoseRequest : integer;stdcall; forward;
Procedure ClearWinLoseRequest;stdcall; forward;
// Returns true after casting a spell triggers the effect of Seismic Mastery
Function SeismicMasteryTrigger : boolean;stdcall; forward;
Procedure ClearSeismicMasteryTrigger;stdcall; forward;
// Returns true if the turn player started casting Spell of Mastery and the player needs to be notified of this.
Function SoMAnimationStart : boolean;stdcall; forward;
Procedure ClearSoMAnimationStart;stdcall; forward;
// This is set to true when the monthly report needs to be shown to the player. Automatically enabled when a new line is added or a new turn starts.
Function ReportDisplayNeeded : boolean;stdcall; forward;
Procedure SetReportDisplayNeeded(b : boolean);stdcall; forward;
// Returns the number of lines in the monthly report and the text for each line
Function NofReports : integer;stdcall; forward;
Function ReportLines( i : integer) : shortstring;stdcall; forward;
// After an overland summoning spell, returns the summon location for the units there to be autoselected in the UI.
// -1 is returned for the plane if no summoning was done.
Function OverlandSummonedtoP : integer;stdcall; forward;
Function OverlandSummonedtoX : integer;stdcall; forward;
Function OverlandSummonedtoY : integer;stdcall; forward;
Procedure ClearOverlandSummonedto;stdcall; forward;
// Returns true if a combat summoning spell was just cast and the summoning animation has to be played
Function CombatSummoningHappened : boolean;stdcall; forward;
Procedure ClearCombatSummoningHappened;stdcall; forward;
// When this returns non-zero, a new combat unit was created (or revived) and its facing and animation has to be initialized.
Function CombatSummonedUnitID : integer;stdcall; forward;
Procedure ClearCombatSummonedUnitID;stdcall; forward;
// Returns a negative number if no action is required.
// Returns zero if the current stack selection needs to be cleared (select none -> then autoselect the next available stack)
// Returns a unit ID otherwise to select the tile containing that unit.
Function OverlandSelectRequest : integer;stdcall; forward;
Procedure ClearOverlandSelectRequest;stdcall; forward;
// A magic vortex is ready to move
Function VortexMoveRequest : boolean;stdcall; forward;
Procedure ClearVortexMoveRequest;stdcall; forward;
// Returns true if the game is waiting for the player to move a Magic Vortex manually.
Function VortexManualMove : boolean;stdcall; forward;
Procedure ClearVortexManualMove;stdcall; forward;
// Returns the which Magic Vortex is currently being handled by the UI, moving automatically or manually.
Function VortexCounter : integer;stdcall; forward;
// Call this after each tile moved by the Vortex to apply damage and increase the step counter
Procedure VortexStepDone;stdcall; forward;
// Call this after each tile moved by the Vortex if it can still move (step counter below 4)
Procedure MoveVortex;stdcall; forward;
// Returns which step out of the 4 tiles moved is being handled.
Function VortexStepCounter : integer;stdcall; forward;
// Signal the end of movement for the current Vortex by increasing the VortexCounter and resetting the step counter to 0.
Procedure VortexMovedone;stdcall; forward;
// Call this function after an animation from an end of turn spell effect is done to advance to the next "end of turn" effect.
Procedure CombatEnfofTurnAnimationOver;stdcall; forward;
// The end of turn Gate of Hades is ready for animation
Function GateofHadesTrigger : boolean;stdcall; forward;
Procedure ClearGateofHadesTrigger;stdcall; forward;
// Returns the ID of the unit currently being affected by GoH.
Function HadesID : integer;stdcall; forward;
// Returns the amount of damage dealt to the unit
Function HadesDamage : integer;stdcall; forward;
// the end of turn Fortress Lightning is ready for animation
Function FortressLightningTrigger : boolean;stdcall; forward;
Procedure ClearFortressLightningTrigger;stdcall; forward;
// the end of turn Call Lightning is ready for animation
Function CallLightningTrigger : boolean;stdcall; forward;
Procedure ClearCallLightningTrigger;stdcall; forward;
// After the animation is done, call this to continue to the next lightning bolt or finish.
// Returns true and sets the target if another lightning is coming down.
Function NextCallLightningBolt : boolean;stdcall; forward;
// the end of turn Sky Fires is ready for animation
Function SkyFiresTrigger : boolean;stdcall; forward;
Procedure ClearSkyFiresTrigger;stdcall; forward;
// Call this after the animation ends to deal the damage and continue the end of turn phase.
Procedure SkyFiresAnimationOver;stdcall; forward;
// the end of turn Healing Aura is ready for animation
Function HealingAuraTrigger : boolean;stdcall; forward;
Procedure ClearHealingAuraTrigger;stdcall; forward;
// Call this when the effect (healing) should be applied.
Procedure HealingAuraEffect;stdcall; forward;
// A unit is ready to perform combat movement
Function CombatMoveRequest : boolean;stdcall; forward;
Procedure ClearCombatMoveRequest;stdcall; forward;
// The AI wants to attack with a unit. Returns 1 for melee, 2 for ranged, 0 if no trigger
Function AIAttackRequest : Integer;stdcall; forward;
Procedure ClearAIAttackRequest;stdcall; forward;
// Returns the unit ID of the attacking and defending unit during combat attack animations
Function CAAttackerunit : integer;stdcall; forward;
Function CADefenderunit : integer;stdcall; forward;
// Sets the above variables.
Procedure SetCombatAttackerandDefender(att,def : integer);stdcall; forward;
// Returns the amount of damage dealt during the last combat attack for display purposes
Function CAattdamage : integer;stdcall; forward;
Function CAdefdamage : integer;stdcall; forward;
// Resets the above numbers to zero
Procedure ClearAttackDamage;stdcall; forward;
// Executes the attack's effect (deal damage), call from the attack animation when appropriate.
Procedure PerformMeleeAttack(au, du: integer);stdcall; forward;
Procedure PerformRangedAttack(au, du: integer);stdcall; forward;

// The diplomacy portrait needs to start the talking animation
Function DiplTalkAnimationRequest : Boolean;stdcall; forward;
Procedure ClearDiplTalkAnimationRequest;stdcall; forward;
// The "Research complete" animation needs to be played. Returns the spell ID of the spell or 0 when no trigger.
Function ResearchCompleteRequest : integer;stdcall; forward;
Procedure ClearResearchCompleteRequest;stdcall; forward;
// Returns the number of looted items that have to be given to the player after combat.
Function Nofreceiveditems : integer;stdcall; forward;
// Returns the first unhandled looted item
Function ReceivedItem : ItemT;stdcall; forward;
// Removes the above item from the list
Procedure HandledReceivedItem;stdcall; forward;
// Call this after the player placed the last item and exited the hero UI screen. After this call, moving items to/from heroes that participated in the previous battle is no longer possible (unless they have movement points remaining).
Procedure ItemHandlingCompleted;stdcall; forward;
// Returns the progress of the "end of turn" process in combat
Function CombatEndPhase : integer;stdcall; forward;
// During the combat end turn phase, call this to progress the game state.
Procedure CETProcess;stdcall; forward;

//------------------------------------
// Returns -1 if no movement is taking place, otherwise returns the player ID whose units are moving.
Function OverlandMovingPlayerTrigger : integer;stdcall; forward;
// Clears the above trigger when it is handled.
// The results of functions remain valid until another overland movement trigger happens.
Procedure ClearOverlandMovingPlayerTrigger;stdcall; forward;
// Returns true if the above movement is visible for the human player on the map.
Function OverlandMoveVisible : boolean;stdcall; forward;
// Returns the source and destination tile of the overland movement.
Function OverlandMovePlane: integer;stdcall; forward;
Function OverlandMoveFromX : integer;stdcall; forward;
Function OverlandMoveFromY : integer;stdcall; forward;
Function OverlandMoveToX : integer;stdcall; forward;
Function OverlandMoveToY : integer;stdcall; forward;
Function OverlandMovePlayer : integer;stdcall; forward;
// Sets the tile the unit is currently moving form during the movement animation.
// This is where the army will retreat after combat or when the player chooses to cancel attacking the tile.
Procedure SetOverlandMovePreviousTile(x,y : integer);stdcall; forward;
// Returns the tile coordinates for each step of the path the unit is taking.
// Tile 1 is the destination, Tile 2 is the tile before that, and so on.
Function OverlandMoveFoundPathX (n : integer) : integer;stdcall; forward;
Function OverlandMoveFoundPathY (n : integer) : integer;stdcall; forward;
Function OverlandMoveFoundPathLength : integer;stdcall; forward;
// Returns the number of units in the currently moving overland stack
Function MovingStackSize : integer;stdcall; forward;
// Returns the Nth unit ID in the moving stack
Function MovingUnit(n : integer) : integer;stdcall; forward;
// after each step done in the movement, use this to refresh the location of the stack in unit data
// use fin = true for the last step, false otherwise.
Procedure SetMovingstackisat(x, y : integer; fin : boolean);stdcall; forward;
// After the last step of overland movement, if the combat type isn't "CTNone" or "CTWaitforUser",
// call this to initiate combat preparations (asking if the player wants to engage, setting combat lcation variables, etc)
Procedure Movetocombat(plane,x,y : integer);stdcall; forward;
// After the last step of overland movement, call this instead if Movetocombat wasn't called to clear movement related variables.
Procedure OverlandMovementDone;stdcall; forward;
// Calculates and fills collective movement type data for the units in the "Moving stack" data.
Procedure Getstackmovementtype;stdcall; forward;
// Returns the amount of collective move points remaining for the "Moving Stack".
Function GetstackmovementRemaning : integer;stdcall; forward;
// Returns the entire "Moving Stack" data.
Function GetMS : MovingStackDataT;stdcall; forward;
// Overwrites the "Moving Stack" data.
Procedure SetMS(NMS : MovingStackdataT);stdcall; forward;
// Sets the moving stack size to zero
Procedure ClearMovingStack;stdcall; forward;
// Adds a unit to the moving stack
Procedure AddMovingStackUnit(u : integer);stdcall; forward;
// During the neutral player's turn, call this when the UI is idle to proceed the turn.
Procedure NeutralsAutomove;stdcall; forward;
// During AI player turns in the movement phase, call this when the UI is idle to proceed the turn.
// Returns false if no unit was found to have an assigned move order.
Function AIStacksAutomove(w : integer) : boolean;stdcall; forward;

