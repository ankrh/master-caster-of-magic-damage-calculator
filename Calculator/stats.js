// --- Unit Stat Derivation ---
// Depends on data.js and the combat_*.js helper functions. No DOM dependencies.
// The per-version execution chain is in stats_manifests.js, the identity helpers in
// stats_identity.js, and the phase-tagged stat sequence in stats_sequence.js.

// Derive all effective stats for a unit from raw UI state.
// Pure stat logic: no DOM reads or rendering side effects.
function deriveUnitStats(input) {
  const prefix = input.prefix;
  const version = input.version;
  // A CoM2/Warlord record that states no attack is four empty channels, never a missing record:
  // the four strengths are fields of `unitT`, so every modern unit has all four and an ungated
  // engine write can create the channel it names (`SPEC.md`, *Attack channels on the card*).
  // Supplying no record at all is a different statement — the unit's version has no such record
  // — and only the DOS versions make it, so a modern input without one halts rather than falling
  // back to the DOS-shaped shared slot (`SPEC.md`, *Out-of-range values stop the run*).
  if (version && version.startsWith('com2') && !input.modernAttacks) {
    throw new Error(`deriveUnitStats: ${version} is a modern engine, whose unit record states its `
      + 'attacks on the four modernAttacks channels (ranged, thrown, fireBreath, '
      + `lightningBreath); the input for side ${JSON.stringify(input.prefix)} supplied none. A `
      + 'record that states no attack is `modernAttacks: {}`, not a missing one.');
  }
  const identity = initializeUnitIdentity(input);
  const baseUnitType = legacyUnitTypeFromIdentity(identity);
  const isHero = !!identity.isHero;
  const isFantasticBase = !!identity.baseFantastic;
  const isCoM1 = version === 'com_6.08';
  // CoM 1 (the DOS build). Kept distinct from `isCoM2` wherever a mechanic is settled for
  // one engine and open for the other — see the Warp Creature block and the gaze ladder.
  const isCoM2 = version.startsWith('com2');
  const suppliedAbilities = { ...(input.abilities || {}) };
  // ApplyAttack's modern Cause Fear setup reads Death Immunity from BaseUnits rather than
  // the recalculated Units record: the immunity test at 0x5B1D1C reads displacement
  // `BaseUnits + 0xC7` (`Reference docs/Caster binary/CoM2 binary - combat flow.md`, *Cause Fear
  // uses a base-record immunity gate*). Preserve the raw/intrinsic bit before buildings, items,
  // enchantments, and unit-state normalization can grant calculated Death Immunity.
  const baseDeathImmunity = !!suppliedAbilities.deathImmunity;
  // Golem's Resist Elements is a hard-coded unit-type rule, not a `UNITS.INI` ability: region `a`
  // grants it on base `unittype` 81 (`Caster.exe` 0x599E31, `Reference docs/Caster binary/CoM2
  // binary - unit recalculation.md`, *Golems intrinsically receive Resist Elements in compiled
  // code*), and CoM 1 does the same on `COM1_UT_GOLEM` (`unitcalc.c`, com1:0x8EE40). It must survive
  // direct calculator/Matrix calls, even when the DOM-derived Elements control is not present in
  // the caller's ability map.
  if ((isCoM2 || isCoM1) && identity.specialUnit === 'golem') {
    suppliedAbilities.elemArmor = 'resistElements';
  }
  // Abilities are read before stat derivation because Chaos Channels eligibility can depend on gaze attacks.
  // Lava Smelter folds its granted ability in here so every downstream read sees it.
  // Race-exclusive building enchantments gate on the unit's intrinsic race/name, supplied by the
  // caller from the selected roster unit. The script itself tests only `ISBUILT(C,B<building>)`
  // on the training city (`CreateUnit.CAS`); the race is what decides which city can hold the
  // building at all, so the race test here stands in for a city model the calculator does not
  // have. Where a script block narrows further it does so by `STypeID`, whose ids are
  // `Unit rosters/Warlord mod unit data/UNITS.INI`. Custom (hand-entered) units carry neither,
  // so building buffs are inert on them. The display name may be race-prefixed for some
  // units and not others, so name exceptions match with endsWith (always gated by race).
  // `identity.baseRace` is the permanent record's race, and it is the only race any of these
  // gates may read: each is either a `CreateUnit.CAS`/`OverlandEndTurn.CAS` training gate — which
  // runs before combat recalculation exists — or, for Goblin Pox, a block whose own read is
  // `GETSTAT(U,SRace,1)`, index 1, the permanent slot. Reading the live `identity.race` would let
  // a realm conversion (Undead, Chaos Channels, Sanctify, Destiny) answer a permanent-record
  // question with `Life`/`Death`.
  const baseUnitRace = identity.baseRace;
  const unitName = input.name || '';
  const marionetteDerivation = deriveMarionettePackage(
    identity, markIntrinsicLucky(suppliedAbilities), version);
  const marionette = marionetteDerivation.package;
  // The **permanent** record's Fantastic flag as the `base` phase leaves it. Two gates read it,
  // each at a position after that phase: `if B.Fantastic then U.level := 1` at $0059A118 and the
  // weapon block's `not B.Fantastic and not B.ishero` at $0059E2B8. `base:destiny` is the one
  // permanent identity write the pipeline itself makes — `B.race := 19; B.Fantastic := True` at
  // $0059A390 — so it, and nothing else, separates this value from the unit's own
  // `identity.baseFantastic`. It used to be spelled as a `destinyActive` term patched onto each
  // gate; now it is the record, and the sequence asserts below that `ctx.base` agrees (F163).
  // It is read off the supplied abilities rather than the granted ones because the Outlander
  // reform gates below need it: `destinyActiveForUnit` reads the `destiny` key alone, which no
  // grant and no curse strip writes, and the `ctx.base` check at the tail is what makes that a
  // measured claim rather than a stated one (F198).
  const destinyActive = destinyActiveForUnit(suppliedAbilities, version);
  const permanentFantastic = isFantasticBase || destinyActive;
  // The Outlander reform block's own eligibility gates, computed once and read by two consumers:
  // the permanent and ability grants it still makes, and the six phase-`b` steps whose write the
  // calculator used to reach through an invented ability label (F198).
  const outlanderDerivation = applyOutlanderReformGrants(
    applyPillarOfFaithGrant(
      applySanctaBasilicaGrant(
        applyLavaSmelterGrant(marionetteDerivation.abilities, version, baseUnitType),
        version, isHero ? 'hero' : baseUnitType, baseUnitRace, unitName),
      version),
    version, permanentFantastic, isHero);
  const outlanderReform = outlanderDerivation.reform;
  // The curse strip is no longer folded in here: the ten flags it clears are fields of the
  // sequence record, and `base:immunityCurseGating` clears them at the head of the chain like any
  // other write (F199). So this is the granted ability set, curses and all.
  const abilities = outlanderDerivation.abilities;
  // The identity conversions are steps of the one sequence, spliced in below and ordered by the
  // execution chain like every other write, so `race` and `fantastic` are fields of the running
  // record and a gate reads whatever stands in them at its own position (F163). There is no
  // pre-pass and no fixed point handed to a gate; the three shapes a read can take are the live
  // record at the reading step (`unitTypeAt` and friends), the permanent record
  // (`identity.baseRace` / `identity.baseFantastic`, or `ctx.base` for a permanent write the
  // pipeline itself makes), and the record the recalculation *leaves*.
  const identityMeta = { isHero, name: unitName };
  const identityConversions = identityConversionSteps(identity, abilities, version, identityMeta);
  // The record the recalculation leaves. Two classes of read want it and no other does: the
  // post-chain reads, where combat resolution is handed the finished unit, and the two cast-time
  // *targeting* predicates (F183, F188). It is a projection of the same conversion list the
  // sequence runs — exact because no conversion's gate reads a stat — and the sequence asserts
  // below that the two agree, so the claim is checked rather than stated.
  const finishedIdentity = targetingIdentity(identity, abilities, version, identityMeta);
  const finishedUnitType = legacyUnitTypeFromLiveIdentity(finishedIdentity);
  // The calculated identity as it stands at a step's own position. `u` is the sequence record,
  // which carries `race` and `fantastic` like any other field.
  const identityAt = u => ({ ...identity, race: u.race, fantastic: u.fantastic });
  const unitTypeAt = u => legacyUnitTypeFromLiveIdentity(identityAt(u));
  const unitRealmAt = u => realmOfUnitType(unitTypeAt(u), identityAt(u));
  const marionetteOwned = !!(marionette && marionette.state === 'owned');
  const marionetteStrayed = !!(marionette && marionette.state === 'strayed');
  const marionetteAttackBonus = marionetteOwned ? marionette.attackBonus : 0;
  const marionetteDefenseBonus = marionetteOwned ? marionette.defenseBonus : 0;
  // Caster.exe's standing `if U.Fantastic then U.EnchantmentFlags[EncMagic] := True` is a
  // region-`c` block of its own, $005A1217..$005A1271 (Units.RecalculateUnits.pas:1813-1815),
  // reading the *calculated* record where it stands: between the Holy Weapon channel block that
  // ends at $005A1217 and the Chaos Surge block that begins at $005A1271, which makes
  // `c:chaosSurge` the chain entry it sits immediately before. `c:spellWard` reads the same rule
  // later in region c, and Blazing Eyes' `IsChaosUnit` gate ($005A1E16) later still (F174, F178).
  // Each is now an ordinary positional read of the record at its own step.
  //
  // No version test here. The rule is a modern block, and both consumers carry their own exact
  // `com2_` test in the same expression, which is the settled adjacent form (`SPEC.md`,
  // *Versions*) (F188).
  const fantasticAtModernEncMagicRule = u => !!u.fantastic;
  const loadoutEligible = !permanentFantastic;
  // Spirit Link (Warlord): "If the enchanted unit is Fantastic creature, it gains sentience, able
  // to earn experience" (`Unit rosters/Warlord mod unit data/HELP.TXT:6324`). Nothing in that
  // description or in the script grants weapon/armor loadout, so only level eligibility is
  // widened — weapon and armor below stay gated on loadoutEligible. The widening covers a
  // base-Fantastic unit, which is the case the helptext is about, and excludes Destiny alone,
  // because Destiny's own permanent write zeroes experience and sets level 1 ($0059A417,
  // $0059A445) rather than merely making the unit Fantastic.
  const levelEligible = loadoutEligible
    || (version.startsWith('com2_warlord') && !!abilities.spiritLink && !destinyActive);
  const level = levelEligible ? input.level : 'normal';
  const lvl = getLevelBonuses(level, version);
  const isWarlord = version.startsWith('com2_warlord');
  // One `flameBlade` input, two controls: the wizard spell everywhere but Warlord, the arcane
  // unit ability in Warlord (`enchantments.js`). The version decides which arithmetic the shared
  // block does, so the input carries no version of its own.
  const warlordCombatFlameBlade = isWarlord && !!abilities.flameBlade;
  // The Magic Weapons half of the Artificer retort: `SETENCHANTMENTFLAG(U,EncMagic,1,1)`
  // (`CreateUnit.CAS:39`), gated with the stat half on `GetStat(U,SCustomAttribute,1)=1` at `:38`.
  // It is +10% To Hit and the Weapon Immunity bypass, and it is a **result** field — the weapon
  // material — so it cannot be a record field and is read here rather than at a rank. The raw
  // flag is what the record holds at that rank: `base:artificer` is a training-time write and the
  // only mid-sequence write to `mechanical` is `base:rebuild`'s, which is cast-time and therefore
  // strictly later (F208). Its stat half is `PROVENANCE[artificer]` (`combat_abilities.js`).
  const artificerMagicWeapon = isWarlord
    && !!abilities.artificer && !!abilities.mechanical;
  // Altar of the Moon (Warlord, Gnoll building): Gnoll units trained here gain Rage and
  // Poison Immunity; ranged units also gain +2 Ranged Attack. The granted abilities are
  // folded into effectiveAbilities below; the ranged bonus is added to the rtb total.
  // Gated on the Gnoll race — non-Gnoll units and heroes gain nothing. What the building writes
  // is `PROVENANCE[altarOfTheMoon]` (`stats_sequence.js`), from `CreateUnit.CAS`.
  const altarOfTheMoon = isWarlord && !!abilities.altarOfTheMoon
    && baseUnitRace === 'Gnoll' && !isHero;
  // Unit-specific Altar of the Moon grants, two mutually exclusive `STypeID` branches
  // (`CreateUnit.CAS:382-390`): 210 Hunters take `SETSTAT(U,AFPoison,1,2,1)`, and 203
  // Witchdoctors take `AFPoison` 100 plus `AFLifeSteal` -1. 100 is the scripts' no-poison
  // sentinel — every `AFPoison` increment reads `<>100` and restarts at 1 — so that branch
  // removes the poison rather than raising it. Applied via effectiveAbilities below.
  const altarHunter = altarOfTheMoon && baseUnitRace === 'Gnoll' && unitName.endsWith('Hunters');
  const altarWitchdoctor = altarOfTheMoon && baseUnitRace === 'Gnoll' && unitName.endsWith('Witchdoctors');
  // Altar of the Sun (Warlord, Hawkmen building): Hawkmen units trained here gain +1
  // Figure, except Holy Mother who gains +1 Melee instead. Gated on the Hawkmen race —
  // heroes are excluded and gain nothing. Only these unit bonuses are modelled; the
  // defending-city High Prayer buff is not. The two writes are
  // `PROVENANCE[altarOfTheSun:holyMother]` and `PROVENANCE[altarOfTheSun:figures]`.
  const altarOfTheSunEligible = isWarlord
    && !!abilities.altarOfTheSun && baseUnitRace === 'Hawkmen' && !isHero;
  const altarOfTheSunHolyMother = altarOfTheSunEligible && unitName.endsWith('Holy Mother');
  const altarOfTheSun = altarOfTheSunEligible && !unitName.endsWith('Holy Mother');
  // Dragon Mound (Warlord, Draconian building): Draconian units trained here gain +1 Armor
  // (folded into def below) and, for units that already have a Fire Breath attack, +2 Fire
  // Breath. Like the Military Workshop breath bonus, it boosts an existing fire breath rather
  // than granting one to melee-only units. Gated on the Draconian race — non-Draconian
  // units and heroes gain nothing, matching the in-game race-exclusive building. The writes are
  // `PROVENANCE[dragonMound]` (`stats_sequence.js`).
  const dragonMound = isWarlord
    && !!abilities.dragonMound && baseUnitRace === 'Draconian' && !isHero;
  // Ludus Agoge (Warlord, Orc building): Orc units trained here gain +1 Attack (melee, folded
  // into atk below), +1 Resistance, and +1 HP. Legionary units gain +1 Movement instead — not
  // modelled here — so they receive no stat bonus. Gated on the Orc race — non-Orc units,
  // Legionaries, and heroes gain nothing, matching the in-game race-exclusive building. The
  // writes are `PROVENANCE[ludusAgoge]` (`stats_sequence.js`), which also carries the +1 ranged
  // strength the building's prose description omits.
  const ludusAgoge = isWarlord
    && !!abilities.ludusAgoge && baseUnitRace === 'Orc' && !unitName.endsWith('Legionary') && !isHero;
  // Mother Fungus (Warlord, Goblin building): Goblin units trained here gain +2 Attack (melee,
  // folded into atk below), +10% To Defend (folded into toBlock below), and Poison 1 (boosts an
  // existing poison attack, or grants Poison 1 if it has none). The ×2 Spellcharge bonus is not
  // modelled. Gated on the Goblin race — non-Goblin units and heroes gain nothing, matching the
  // in-game race-exclusive building. The writes are `PROVENANCE[motherFungus]`
  // (`stats_sequence.js`).
  const motherFungus = isWarlord
    && !!abilities.motherFungus && baseUnitRace === 'Goblin' && !isHero;
  // Pool of Repentance (Warlord, Rakhshasa building): Rakhshasa units trained here gain +1 Armor
  // (folded into defBase below) and +1 Resistance (folded into res below). Gated on the Rakhshasa
  // race — non-Rakhshasa units and heroes gain nothing, matching the in-game race-exclusive
  // building. The writes are `PROVENANCE[poolOfRepentance]` (`stats_sequence.js`).
  const poolOfRepentance = isWarlord
    && !!abilities.poolOfRepentance && baseUnitRace === 'Rakhshasa' && !isHero;
  // Sancta Basilica (Warlord, High Men building): +3 Resistance for every High Men unit trained
  // here (folded into res below). The write is `PROVENANCE[sanctaBasilica]` (`stats_sequence.js`).
  // The unit-specific Sanctify / Lucky / Magic Immunity grants are applied earlier via
  // applySanctaBasilicaGrant, whose KNOWN DEFECT note (`stats_identity.js`) records that the
  // Sanctify half disagrees with `CreateUnit.CAS` — `BACKLOG.md` Q30. Gated on the High Men race;
  // heroes gain nothing.
  const sanctaBasilica = isWarlord
    && !!abilities.sanctaBasilica && baseUnitRace === 'High Men' && !isHero;
  // Rust (Warlord Chaos common combat curse): the unit "loses Magical weapons their bonuses and
  // permanent enchantments permanently", takes "-3 to its Melee and Physical Ranged Attack" and
  // loses "Thrown Attack and Large Shield abilities until the end of combat"
  // (`Unit rosters/Warlord mod unit data/HELP.TXT:2782`), whose "Target: enemy regular unit"
  // line is the fantastic exclusion. The melee half is in combat_abilities.js and the ranged
  // half is `PROVENANCE[rust:ranged]` below.
  //
  // The exclusion is a **targeting** restriction, not a term of the block, and it is read at the
  // record the recalculation *leaves* (F183). Three facts settle that. (a) The recalculation
  // block, `UnitCalc.CAS:492-503`, is gated on `GETENCHANTMENTFLAG(U,EncRust,0)` alone and makes
  // no Fantastic test of either record, so there is no block term to position. (b) The helptext's
  // Target lines spell "regular", "Fantastic" and "non-hero" as three separate words — "enemy
  // regular non-hero unit" and "friendly non-hero regular unit" both occur — so "regular" is the
  // non-Fantastic class and a hero is targetable. (c) Targeting reads the *finished* calculated
  // record, which is what `finishedIdentity` is. Spirit Link states it outright: it asserts
  // `SETSTAT(U,AFantastic,0,1)` at the head of the routine to "allow unit to get bonus and penalty
  // of fantastic and non-fantastic" (`UnitCalcPre.CAS:25-28`) and clears it again at the tail so
  // the "enchanted fantastic unit could not be targeted by fantastic-only spell"
  // (`UnitCalc.CAS:1305-1306`). The engine manipulates the recalculated flag *in order to* change
  // targetability, so a targeting predicate is a function of the record after every conversion —
  // and a Spirit-Linked Fantastic unit is a legal Rust target, which that record reports and
  // the record at `d:rust` (chain rank 130, ahead of `d:spiritLink` at 137) would not.
  // The same reading covers this constant's two other consumers, the weapon material below and
  // the Large Shield strip, which is why the read is `finishedIdentity` and not the record at
  // `d:rust`. `tools/unit_checks/identity_record_choice.js` declares it as one of the three
  // reads taken outside a step, for that reason rather than by owning it to a chain entry.
  const rustActive = version.startsWith('com2_warlord') && !!(abilities && abilities.rust)
    && !finishedIdentity.fantastic;
  // The material block has no Fantastic gate in either engine family: it reads
  // `_UNITS[si].mutations & UM_WEAPON_QUALITY_MASK` and nothing else (`unitcalc.c`,
  // 131:0x8F02A / com1:0x8F024). The `!isFantasticBase` gate below is the UI's — a fantastic
  // creature is never equipped — and Zombies is the one case where it is wrong, because a unit
  // raised as Zombies is a converted normal unit whose persistent mutations survive: CoM 1's
  // Zombies constructor patch writes `toblock` alone (`R6.1b.evidence.md`, com1:0x8EE28-0x8EE31).
  // So weapon eligibility gets a Zombies exception while armor and level stay fantastic-gated.
  // **CoM 1 alone**, which is what `specialUnit` already scopes. The conversion that leaves the
  // mutations in place is `UNIT(...)->type = UNITTYPE_ZOMBIES` at com1:0x9C460 (`combat.c`), and
  // its whole block is annotated `131:— 160:—`: MoM 1.31 and CP 1.60 have no such conversion.
  // CoM2 and Warlord summon Zombies instead — `SZombies` is a summon and the Warlord corpus makes
  // no `SETSTAT(…,STypeID,…)` write at all — so a summoned unit has no prior mutations to keep,
  // and Zombie Mastery there is a stat buff (`UnitCalcPre.CAS:898`), not a conversion. A
  // `unitName === 'Zombies'` term used to widen this to all five versions; it was a display string
  // standing in for the identity record, and no source supports the four it added (F203).
  const weaponEligible = loadoutEligible || identity.specialUnit === 'zombies';
  // CoM 1's Catapult constructor writes `_UNITS[si].mutations = 1` for type 0x25 with `wp == 9`
  // (com1:0x8EEA4-0x8EEAF), and the weapon-quality read at com1:0x8F024 re-reads the record, so
  // the unit takes quality 1 immediately (`Reference docs/DOS reconstructed/R6.1b.evidence.md`,
  // *CoM 1 has three unit-type constructor patches*). `wp == 9` is the combat-summoned Construct
  // Catapult path alone. That is a direct Magic Weapons write: it gives the Boulder channel +10%
  // To Hit and lets it bypass Weapon Immunity, while an ordinary Catapult remains a normal,
  // non-fantastic siege unit.
  const constructCatapult = isCoM1
    && isConstructCatapultUnit(identity, abilities, version, identityMeta);
  const weaponInput = constructCatapult ? 'normal' : (weaponEligible ? input.weapon : 'normal');
  const weaponPreRust = constructCatapult ? 'magic'
    : (artificerMagicWeapon && weaponInput === 'normal') ? 'magic' : weaponInput;
  const weapon = rustActive ? 'normal' : weaponPreRust;
  const wpn = weaponBonus(weapon);
  // Armor quality: CoM/CoM2/Warlord only — `PROVENANCE[orihalcon]` (`stats_sequence.js`) carries
  // no MoM build, because Orihalcon is CoM 1's repurposing of the enchantment slot MoM spends on
  // Giant Strength (`unitcalc.c`, `UE_ORIHALCON = UE_GIANT_STRENGTH`, com1:0x8F853, inside a
  // `BUILD == COM1` arm), so neither MoM build has the block. The `!isHero` term is
  // the control's, not the engine's: the compiled block gates on `EncOrihalcon` alone
  // (Units.RecalculateUnits.pas:1784, $005A0E4B), and a hero's equipment is items rather than an
  // armour material. The stated value is checked *before* that gate rather than
  // after it: the gate discards the input for MoM, for heroes and for every ineligible unit, so a
  // check on the gated result would accept anything in exactly the cases the caller is most
  // likely to have got wrong. An absent field is the control's own default, as it is for the
  // City walls position below.
  const armorInput = input.armor === undefined || input.armor === null
    ? 'normal' : String(input.armor);
  if (!ARMOR_MATERIALS.includes(armorInput)) {
    throw new Error(
      `deriveUnitStats: armor quality '${armorInput}' is not one of ${ARMOR_MATERIALS.join('/')}, `
      + `the option set of the Armor Type control and of MATRIX_ARMOR_OPTIONS.`);
  }
  const armorExists = !version.startsWith('mom_');
  const armor = (armorExists && loadoutEligible && !isHero) ? armorInput : 'normal';

  // Military Workshop (Warlord, XuanYuan building): upgrades any normal unit trained,
  // garrisoned in, or fighting from the city — not race-gated, per the "any defending units
  // of the city" + "base normal units" changelog wording. Heroes and fantastic creatures are
  // excluded, and Rocketry is an alternative cause of the same permanent Blackpowder upgrade,
  // which the scripts grant only to a normal unit that already has physical ranged, Thrown or
  // Fire Breath. What the upgrade then writes is `PROVENANCE[militaryWorkshop]`
  // (`base:militaryWorkshop`, `stats_sequence.js`) and the Blackpowder gate further down.
  //
  // The magnitudes are patch history, and the changelog in
  // `Reference docs/Warlord manual v1.5.12.7.html` is what records them: the missile-to-boulder
  // projectile upgrade is the original 1.5.4.1 effect; 1.5.7.4 replaced a flat +2 physical
  // ranged / +4 Thrown with Armor Piercing and raised Fire Breath from +2 to +4; 1.5.9.5 gave a
  // Doom attack that strength back rather than the Armor Piercing Doom already makes redundant.
  // Where changelog and script could disagree the script wins, and the step implements the
  // script.
  const blackpowderSource = isWarlord
    && (!!abilities.militaryWorkshop || !!abilities.rocketry);
  // CreateUnit.CAS makes this permanent training decision before any later combat-time
  // identity conversion. A base-normal unit remains eligible after Chaos Channels/Sanctify,
  // while a base-Fantastic unit does not become eligible merely because Spirit Link clears its
  // live Fantastic flag.
  const baseNormalTrainingUnit = !isHero && !isFantasticBase;

  // Bombs&Grenades writes the independent Thrown field with no coexistence test, so it can stand
  // beside another ranged or breath attack — `PROVENANCE[bombsGrenades]` (`stats_sequence.js`).
  // The calculator's single RTB slot represents it directly when that slot is
  // empty, and adds it normally when the selected attack is already Thrown.
  // The gate is the block's own `IF (BASEFANTASTIC(U)>0) %AND (GETSTAT(U,SMultiLabel,1)<>14)
  // THEN { GOTO "NOTSAPIENS"; }` (`UnitCalcPre.CAS:1062-1064`) — both terms read the **permanent**
  // record, so a combat conversion to Fantastic cannot close it. `BASEFANTASTIC(U)` is the base
  // unit data "before applying continuous effects such as buffs or curses"
  // (`Reference docs/Script source/CAS reference/Scripts.TXT:286`), which is the record the
  // `base` phase leaves — Destiny's `B.Fantastic := True` at $0059A390 included, since that write
  // is to `BaseUnits` and persists into every later recalculation (F192). The same `NOTSAPIENS`
  // label also encloses Ballistics Training, Xenopsychology and Radio, which take the identical
  // gate through `outlanderReform.sapiensEligible` — one home for one script test (F198).
  const explosiveEligible = isWarlord && !!abilities.explosive
    && outlanderReform.sapiensEligible;
  // The write's own gate, `IF (GETSTAT(U,SAttack,1)>0) %OR (GETSTAT(U,AFlying,1)>0)`
  // (`UnitCalcPre.CAS:1068-1069`). Record selector `1` is "the base unit", not the calculated one
  // (`Reference docs/Script source/CAS reference/Scripts.TXT:270`), so both terms read the
  // **permanent** record — which is the record the `base` phase leaves, `ctx.base`, not the card's
  // melee input: `base:rebuild` writes `SETSTAT(TU,SAttack,1,…+2)` (`OLSpell.CAS:280`) and
  // `base:artificer` `+1` (`CreateUnit.CAS:40`), both permanently and both before region `b`, so a
  // unit whose roster melee is 0 can still satisfy this gate (F202).
  //
  // `AFlying` needs no such treatment and stays the pre-sequence flag. Only two lines in the
  // corpus write it at selector 1 — `CreateUnit.CAS:687` and `OverlandEndTurn.CAS:654`, the
  // Anti-Gravity Drive branch this file's `temporalGravityDrive` grant carries — and both are
  // permanent writes that set flags and movement alone, with no stat delta, so neither earns a
  // step (`SPEC.md`, *Phases*). Every other `AFlying` write in the corpus is selector 0, the
  // calculated record this gate does not read.
  const bombsGrenadesFlying = !!abilities.flying;
  const bombsGrenadesActive = (u, ctx) => explosiveEligible
    && (ctx.base.atk > 0 || bombsGrenadesFlying);
  // Whether the record carries a Thrown field at all is a structural question answered before the
  // sequence, so it takes the widest state in which this block can write one: the gate above is
  // resolved at the step's own rank, and seeding a field is not a write.
  const bombsGrenadesCanWriteThrown = explosiveEligible;

  // Blazing Eyes' block ($005A1E16..$005A1F12) is region `c`, so its `IsChaosUnit` gate reads the
  // calculated record at that position. The write itself is
  // `c:blazingEyes` (`stats_sequence.js`), where the Doom Gaze field it conjures or raises is
  // read at the same position. The Chaos test keeps the compact-token reading the block has
  // always had here; that `IsChaosUnit` is also Chaos Surge's gate, where the calculator spells
  // it `chaosSurgeRealm === 'chaos'` over this same positional identity, is BACKLOG Q31.
  const blazingEyesActive = u => isCoM2 && !!abilities.blazingEyes
    && unitTypeAt(u) === 'fantastic_chaos';
  const baseDoomGazeStat = abilVal(abilities, 'doomGaze', 0);

  // Chaos Channels (Fire Breath option): version-sensitive strength and admission, all four DOS
  // facts from `Reference docs/DOS reconstructed/unitcalc.c`. `Apply_Chaos_Channels` reads the
  // unit *type* table's signed ranged value and shared attack type before choosing the mutation
  // (131:0xA4E4A): MoM 1.31 rejects `ranged > 3`, CP 1.60 and CoM 1 reject `ranged > 0`
  // (0xA4E4F), and every build additionally rejects a `ranged_type` that is neither `RAT_NONE`
  // nor `RAT_THROWN` (0xA4E60/0xA4E71), so Gaze and either Breath type cannot coexist with a
  // Chaos Channels Fire Breath in the shared slot. Once admitted, `BU_Apply_Specials` *assigns*
  // `bu->ranged` — 2 in both MoM builds (131:0x8F728) and 4 in CoM 1 (com1:0x8F47C).
  // CoM2/Warlord instead have independent channels and add 4 to Fire Breath.
  const ccFireBreathAbil = !!abilities.ccFireBreath;
  // Chaos Channels *adds* a Fire Breath; it never removes another attack. `Caster.exe`
  // $00599EE8-$00599FA8 writes only `firebreath += 4`, `race := RCChaos` and `Fantastic`,
  // and Warlord's `UnitCalc.CAS:40` touches only `SFireBreath` — neither clears a gaze,
  // thrown or lightning breath. The CoM2 manual says the same in words: it "can still add
  // Fire Breath to units that have Thrown, Gaze or Lightning Breath". So the modern engines,
  // whose attack channels are independent fields, impose no coexistence restriction at all.
  // The DOS engines keep theirs because one shared `.ranged` slot cannot hold two attacks.
  const ccIndependentChannels = isCoM2;
  const ccDosBaseRangedMax = version === 'mom_1.31' ? 3 : 0;
  // `Caster.exe` $00599F3E is `add 4 to U.firebreath`, not an assignment, and it is the same
  // routine for CoM2 and Warlord — there is no version split to model. The DOS engines still
  // assign, because the value lands in the one shared `.ranged` slot rather than a field of
  // its own, which is the same reason they exclude ranged units from the mutation.
  const ccFireBreathStrength = version.startsWith('com') ? 4 : 2;

  // Lightning Blade (Warlord): the Altar of Storm writes Lightning Breath = Thrown + 1, then
  // clears Thrown — `PROVENANCE[lightningBlade:breath]` (`stats_sequence.js`), from
  // `CreateUnit.CAS:294-299`. Without Thrown it assigns strength 1 even beside another
  // independent attack; with Thrown it preserves that channel's earlier permanent bonuses and
  // adds one. The resulting Lightning Breath is innate and gains veterancy level bonuses.
  const lightningBladeAbil = version.startsWith('com2_warlord') && !!abilities.lightningBlade
    && baseNormalTrainingUnit;

  // Base values from inputs
  const baseFigs = Math.max(1, parseInt(input.figs) || 1);
  const inputBaseAtk = Math.max(0, parseInt(input.atk) || 0);
  const inputBaseRtb = Math.max(0, parseInt(input.rtb) || 0);
  const inputBaseDef = Math.max(0, parseInt(input.def) || 0);
  const inputBaseRes = Math.max(0, parseInt(input.res) || 0);
  const inputBaseHP  = Math.max(1, parseInt(input.hp) || 1);
  // Some permanent/base-record writes execute before the main scratch-record sequence. Keep
  // them as individual trace events at those execution sites: `stat:base` then becomes only a
  // seed of the prepared record, never a catch-all attribution for the sources which prepared it.
  const basePreparationTrace = [];
  let basePreparationOrder = 0;
  const traceBasePreparation = (id, sourceLabel, before, after) => {
    const changes = {};
    for (const field of Object.keys(after)) {
      if (before[field] === after[field]) continue;
      const from = before[field];
      const to = after[field];
      changes[field] = (typeof from === 'number' && typeof to === 'number')
        ? { from, to, delta: to - from }
        : { from, to };
    }
    if (Object.keys(changes).length === 0) return;
    basePreparationTrace.push({
      id,
      source: { id, label: sourceLabel },
      phase: 'base',
      order: basePreparationOrder++,
      changes,
    });
  };

  const calcBaseAtk = inputBaseAtk;
  const calcBaseDef = inputBaseDef;
  const calcBaseRes = inputBaseRes;
  const calcBaseHP = inputBaseHP;
  // The DOS record keeps one melee threshold and one shared secondary threshold — `melee_tohit`
  // and `ranged_tohit`, the pair the constructor zeroes together at 131:0x8EE48/0x8EE53
  // (`unitcalc.c`) — so its card states exactly those two.
  const baseToHitMod = parseInt(input.toHitMod) || 0;
  const baseToHitRtbMod = parseInt(input.toHitRtbMod) || 0;
  const baseToBlkMod = parseInt(input.toBlkMod) || 0;
  // The modern record keeps five: one common `hitchance` plus `hitchancemelee`,
  // `hitchanceranged`, `hitchancethrown` and the single `hitchancebreath` that serves both
  // breath strengths (Units.RecalculateUnits.pas:203-219). That is a different record shape,
  // not a projection of the DOS pair, so the card states each field on its own.
  //
  // A field the active version's record does not have would be written by a caller and read by
  // nothing, which is the silent no-op this split exists to end (`SPEC.md`, *Out-of-range values
  // stop the run*). Zero is indistinguishable from absent, so only a value that would have meant
  // something halts the run.
  const DOS_HIT_INPUTS = ['toHitMod', 'toHitRtbMod'];
  const MODERN_HIT_INPUTS = ['hitChance', 'hitMelee', 'hitRanged', 'hitThrown', 'hitBreath'];
  const foreignHitInputs = (isCoM2 ? DOS_HIT_INPUTS : MODERN_HIT_INPUTS)
    .filter(field => (parseInt(input[field]) || 0) !== 0);
  if (foreignHitInputs.length > 0) {
    throw new Error(
      `deriveUnitStats: ${version} carries the `
      + `${isCoM2 ? 'modern' : 'DOS'} To Hit record, so ${foreignHitInputs.join(', ')} `
      + `name${foreignHitInputs.length === 1 ? 's' : ''} no field it has. `
      + `Expected ${(isCoM2 ? MODERN_HIT_INPUTS : DOS_HIT_INPUTS).join(', ')}.`);
  }
  const baseHitChance = parseInt(input.hitChance) || 0;
  const baseHitMelee = parseInt(input.hitMelee) || 0;
  const modernSecondaryHitMod = {
    ranged: parseInt(input.hitRanged) || 0,
    thrown: parseInt(input.hitThrown) || 0,
    breath: parseInt(input.hitBreath) || 0,
  };

  // Focus Magic: CoM/CoM2-only. In CoM2, magical ranged, doom gaze, and breath get +3.
  // In CoM, doom gaze is not mentioned, so only magical ranged and breath are boosted.
  // Otherwise, a thrown or physical ranged (missile/boulder) attack is converted
  // into Sorcery magical ranged, with a minimum strength of 3. If nothing qualifies,
  // the unit gains strength-3 Sorcery magical ranged. (All versions convert boulder. CoM 1's
  // helptext narrows the conversion to "its existing thrown or missile attack"
  // (`Reference docs/CoM helptext.txt:328`), while Warlord's lists "Physical Ranged Attack
  // converts to Magical at the same strength or 3"
  // (`Unit rosters/Warlord mod unit data/HELP.TXT:5273`) — and boulder is physical ranged.)
  // The writes are `PROVENANCE[focusMagic]` (`stats_sequence.js`), whose version list is the
  // CoM/CoM2-only scope.
  const focusMagicActive = !!(abilities && abilities.focusMagic) && version.startsWith('com');
  // Warlord Vampirism reads all three independent source fields at one region-d position and
  // truncates their combined total once — `PROVENANCE[vampirism:transfer]` (`stats_sequence.js`).
  // Under one walk that is a plain cross-channel read at the step's own position; the four
  // strength fields all stand at their region-d values there.
  const vampirismActive = !!(abilities && abilities.vampirism) && version.startsWith('com2_warlord');
  // Warlord Shadow Strike: adds a Thrown attack at 1 + 1/3 of live melee strength (truncated) —
  // `PROVENANCE[shadowStrike:thrown]` (`stats_sequence.js`), from `UnitCalc.CAS:1262-1266`.
  // A unit that already has a Thrown attack instead gains the same amount. It executes after
  // Colossal Strength and Vampirism, so both earlier live melee writes feed it; the leading +1
  // creates Thrown even at zero melee. Because Thrown is a separate pre-melee
  // phase, per-hit riders (Poison, Life Steal, Blood Sucker) fire on both the thrown and the
  // melee phase — that double trigger falls out naturally from the granted thrown phase.
  const shadowStrikeActive = !!(abilities && abilities.shadowStrike) && version.startsWith('com2_warlord');
  // Warlord Blaze of Glory: the unit's whole Ranged strength is added to the Thrown field and
  // the Ranged field is emptied (Ammo goes with it; the model tracks neither Ammo nor the
  // `SRangedPenalty` bookkeeping write). Breath attacks are not "Ranged" and are untouched.
  // The Armor→Melee transfer, the Armor Piercing and Wall Crusher grants and the First Strike
  // loss are all fields of the one step now, at the block's own rank (F201, F206).
  // Blaze of Glory targets a friendly non-hero unit (normal or fantastic); heroes are exempt.
  // The transfer is `PROVENANCE[blazeOfGlory]` (`stats_sequence.js`), from `UnitCalc.CAS:1494`.
  const blazeOfGloryActive = !!(abilities && abilities.blazeOfGlory)
    && version.startsWith('com2_warlord') && !isHero;
  // Warlord Venom enchantment, `PROVENANCE[venom]` (`stats_sequence.js`): the gate of `d:venom`,
  // whose two writes are the Poison Immunity flag and the `<>100` poison increment.
  const venomActive = isWarlord && !!(abilities && abilities.venom);

  // Per-card wall position. Combat resolution admits this bonus only when the incoming attacker
  // is outside; card A/B exchange role and persistent army ownership are irrelevant.
  // `@Combat@ApplyAttack` requires a wall, the defender inside it and the attacker outside it
  // (0x5B27AC-0x5B27D3), then passes `CityWallDefBonus`/`CityWallBrokenDefBonus` as
  // `EffectiveDefense`'s `extradef` (`Reference docs/Caster binary/CoM2 binary - resolution
  // helpers.md`, *City Walls is `extradef`, not a RecalculateUnits write*) — so it is a
  // per-attack value, not a recalculation write, which is why nothing below reads it.
  const cwVal = input.cityWalls === undefined || input.cityWalls === null
    ? 'none' : String(input.cityWalls);
  const cityWallBonus = cwVal === 'none' ? 0 : cwVal === '1' ? 1 : cwVal === '3' ? 3 : null;
  if (cityWallBonus === null) {
    throw new Error(
      `deriveUnitStats: city-walls position '${cwVal}' is not one of none/1/3, the option set `
      + `of the City walls control and of MATRIX_CITY_WALL_OPTIONS.`);
  }

  // Survival Instinct's Fantastic test reads the *calculated* record at its own block, in both
  // engine families. `Caster.exe` tests `if U.Fantastic and (U.owner <> 15) and ...` at
  // $005A1664..$005A18AA (`Units.RecalculateUnits.pas`), the running unit — not `BASEFANTASTIC`,
  // which is what `b:wallOfFire:garrison` and `b:bombsGrenades` turned out to take (F170, F172).
  // CoM 1 tests `bu->race >= RACE_FIRST_FANTASTIC` at com1:0x8F27F (`unitcalc.c`), on the one
  // battle-unit record the routine mutates in place. So both take the running identity at
  // `c:survivalInstinct`. In Warlord that excludes
  // `d:spiritLink`'s clearing write, leaving the Fantastic `b:spiritLink` asserts; CoM 1 and base
  // CoM2 rank every conversion ahead of the block, so they are unmoved.
  const survivalInstinctEligible = u => survivalInstinctActiveForUnit(
    abilities, unitTypeAt(u), version);
  // Land Linking's Fantastic test reads the *calculated* record at its own block, in both
  // engine families. CoM 1 tests `bu->race >= RACE_FIRST_FANTASTIC` at com1:0x8F765, on the one
  // battle-unit record `BU_Apply_Specials` mutates in place — the demon-skin armor write at
  // com1:0x8F757 immediately above it is visible, Mystic Surge's `bu->race` write at com1:0x8F79E
  // below it is not. `Caster.exe` tests `if U.Fantastic`, and the melee gate three lines later in
  // the same block tests `B.attack > 0`, so the U/B choice there is deliberate rather than
  // incidental (`SPEC.md`, *The step model*). Neither reads the permanent record, so both take the
  // running identity at `c:landLinking`: in CoM 1 that
  // excludes `c:mysticSurge:race` and `c:raiseDead`, and in Warlord it excludes `d:spiritLink`'s
  // clearing write. Base CoM2 ranks every conversion ahead of the block, so it is unmoved.
  const landLinkingEligible = u => landLinkingActiveForUnit(abilities, unitTypeAt(u), version);
  // Inner Power's eligibility has no constant here any more: its block tests the *calculated*
  // record's Fire Immunity and Lightning Resist, so it is `c:innerPower`'s own `when`
  // (`combat_abilities.js`) and answers after `b:insulation` has written both (F200).
  const misleadEligible = u => misleadActiveForUnit(abilities, u.fantastic, version);

  const nodeAuraVal = input.nodeAura;
  const nodeAuraActive = u => {
    const realm = unitRealmAt(u);
    return realm !== null && nodeAuraVal !== 'none' && realm === nodeAuraVal;
  };
  const darkForceActive = isCoM2 && !!abilities.darkForce;
  // The compiled city/node package requires membership in the defending army. The card prefix
  // instead records who initiates this particular exchange, so the per-unit control carries the
  // army/location eligibility and must work from either card. CoM 1's own block gates on the
  // defending side and a non-zero city-enchantment byte, which is a city-combat condition; that
  // eligibility is likewise the control's, not a card role. The package itself is
  // `PROVENANCE[heavenlyLight]` (`stats_sequence.js`).
  const heavenlyLightActive = (isCoM1 || isCoM2) && !!abilities.heavenlyLight;
  // The three astronomical events each test `B.Fantastic`, the **permanent** record, not the
  // unit as it was trained: `not B.Fantastic` at $005A273C (Bad Moon) and $005A285E (Good Moon),
  // `B.Fantastic` at $005A2BB6 (Nature Conjunction), all three in
  // `Units.RecalculateUnits.pas`. Their sibling gates in the same stretch read `U.*`, so the `B.`
  // selector is deliberate. `permanentFantastic` is the record the `base` phase leaves
  // (`SPEC.md`, *The step model*), which is what separates this from `identity.baseFantastic`:
  // Destiny writes `B.Fantastic := True` at $0059A390 (F192).
  const badMoonActive = isCoM2 && !!abilities.badMoon && !permanentFantastic;
  const goodMoonActive = isCoM2 && !!abilities.goodMoon && !permanentFantastic;
  const natureConjunctionActive = isCoM2 && !!abilities.natureConjunction
    && permanentFantastic;
  // Spell Ward is region-c logic — `PROVENANCE[spellWard]` (`stats_sequence.js`). In Warlord it
  // therefore reads the current Fantastic flag before the region-d Spirit Link hook
  // (`UnitCalc.CAS:1306`) can clear that flag.
  const spellWardActive = u => !!(isCoM2 && fantasticAtModernEncMagicRule(u)
    && abilities.spellWard && abilities.spellWard !== 'none'
    && abilities.spellWard === unitRealmAt(u));
  const realmWardActive = u => !!(isCoM1 && u.fantastic
    && abilities.realmWard && abilities.realmWard !== 'none'
    && abilities.realmWard === unitRealmAt(u));
  const com1AuraValue = key => isCoM1
    ? Math.max(0, parseInt(abilities[key], 10) || 0) : 0;
  const com1GuidingBeaconAura = com1AuraValue('guidingBeaconAura');
  const com1DivineBarrierAura = com1AuraValue('divineBarrierAura');
  const com1SoulLinkerAura = com1AuraValue('soulLinkerAura');
  // Chaos Surge tests the calculated record at its own block, and both MoM builds make the test
  // *before* the routine's only realm writes: `bu->race == rt_Chaos` at 131:0x8F138 / 160:0x8F138,
  // with the single `BU_Apply_Specials` call that carries every realm write at 131:0x8F2A2 /
  // 160:0x8F2A2 (`unitcalc.c`, `BU_Construct`). So a Chaos-Channelled or Black-Channelled MoM unit
  // is not yet Chaos here and collects nothing. CoM 1 calls `BU_Apply_Specials` first, at
  // com1:0x8F0E8, ahead of its own block at com1:0x8F110, and both modern chains rank every
  // conversion ahead of `c:chaosSurge`, so those three read exactly what the finished record
  // would have given them. Reading the chain position rather than branching on version is what makes
  // that a measurement instead of an assumption (F178).
  const chaosSurgeCount = u => unitRealmAt(u) === 'chaos'
    ? Math.max(0, parseInt(input.chaosSurge) || 0)
    : 0;
  const chaosSurgeMeleeBonus = u => chaosSurgeCount(u) > 0
    ? (version.startsWith('mom') ? 2 : 3 + (chaosSurgeCount(u) - 1))
    : 0;
  const chaosSurgeRtbBonus = u => chaosSurgeCount(u) > 0
    ? (version.startsWith('mom') ? 2 : 1 + chaosSurgeCount(u))
    : 0;
  const chaosSurgeResBonus = u => chaosSurgeCount(u) > 0 && version.startsWith('com')
    ? 1 + chaosSurgeCount(u) : 0;

  // Darkness / True Light: +/- to atk (non-spell), def, res for Death/Life fantastic units.
  // Darkness: +Death, -Life. True Light: +Life, -Death. Both can be active.
  // True Light was removed in CoM 1 & 2; Darkness still exists in all versions.
  // Eternal Night is side-owned but makes Darkness global. CoM2 only doubles that
  // Darkness atk/def swing; CoM keeps the normal Darkness values.
  // Eternal Night also gives enemy non-Death units -1 resistance in CoM/CoM2.
  // The three writes are `PROVENANCE[darkness]`, `PROVENANCE[trueLight]` and
  // `PROVENANCE[eternalNight:enemyResistance]` (`stats_sequence.js`).
  const legacyLightDarkVal = input.enchLightDark || 'none';
  const isCoMVersion = version.startsWith('com');
  const ownEternalNight = !!(abilities && abilities.eternalNight) || !!input.eternalNight;
  const enemyEternalNight = !!input.enemyEternalNight;
  const hasAnyEternalNight = ownEternalNight || enemyEternalNight;
  // Enemy Eye of Heaven strips this unit's gaze attacks (the opponent gains True Sight).
  const enemyEyeOfHeaven = !!input.enemyEyeOfHeaven;
  const hasDarkness = !!input.darkness || legacyLightDarkVal === 'darkness' || hasAnyEternalNight;
  // True Light was removed in CoM 1 & 2 — CoM 1 reuses its combat-enchantment slot for Supreme
  // Light (`unitcalc.c`, `CE_SUPREME_LIGHT_ATTACKER = CE_TRUE_LIGHT_ATTACKER`) — but Warlord
  // re-introduces it as a "Life Common - Combat Enchantment"
  // (`Unit rosters/Warlord mod unit data/HELP.TXT:3199`), so enable it for MoM and Warlord only.
  const hasTrueLight = (!!input.trueLight || legacyLightDarkVal === 'trueLight') && (!isCoMVersion || isWarlord);
  // Modern Eternal Night sets the Death-package loop count to two: any wizard holding
  // `GEEternalNight` raises `k` from 1 to 2 and the Death branch applies its attack/Defense
  // package `k` times, while the Life (race 19) branch and Resistance sit outside that loop and
  // run once (Units.RecalculateUnits.pas:2163-2185). DOS Darkness has no such multiplier.
  const darknessAtkDefMagnitude = u => hasDarkness
    ? (hasAnyEternalNight && isCoM2 && unitRealmAt(u) === 'death' ? 2 : 1)
    : 0;
  const darknessResMagnitude = hasDarkness ? 1 : 0;
  const eternalNightEnemyResPenalty = u => enemyEternalNight && isCoMVersion
    && unitRealmAt(u) !== 'death' ? -1 : 0;
  // The Undead enchantment flag, as the two `UnitCalcPre.CAS` blocks below read it:
  // `GetEnchantmentFlag(U,EncUndead,0)`. It is a flag test, not a realm test, and it stands
  // beside the realm test rather than behind it — which is why the realm read below can move to
  // its own position without taking an Undead unit's swing away with it. Every source of the flag
  // writes it into the *permanent* aggregate, so it is already set where region `b` reads it:
  // the casts write index 1 (`COSpell.CAS:323,346`, `OLSpell.CAS:526`, `UnitCalc.CAS:1253`), and
  // Animate Dead's own block persists it there as well — `B.EnchantmentFlags[EncUndead] := True`
  // at `$0059F7D8` (`Units.RecalculateUnits.pas`), which is the same pairing `c:undead` already
  // reads for its conversion.
  const undeadEnchantmentFlag = hasAbil(abilities, 'undead') || hasAbil(abilities, 'animated');
  // Warlord Eternal Night ("Poor Vision"): "All non-Death creatures get -2 Ranged Attack power
  // as long as Eternal Night is in effect" (`Unit rosters/Warlord mod unit data/HELP.TXT:5768`),
  // so missile/boulder and magic ranged take it while Thrown and breath — short-range, not
  // "Ranged" — do not. The write is `PROVENANCE[eternalNight:poorVision]` (`stats_sequence.js`).
  //
  // The exemption is `(GetStat(U,STypeID,1)<>356) %AND (GetStat(U,SRace,0)<>RCDeath) %AND
  // (GetEnchantmentFlag(U,EncUndead,0)=0)` (`UnitCalcPre.CAS:1341-1344`). `GetStat(U,S,0)` is the
  // *current* record — "if B=0, it checks the current stats and abilities, if B=1 it checks the
  // base unit" (`Reference docs/Script source/CAS reference/Scripts.TXT:266`) — so the realm is
  // read where this region-`b` block stands, ahead of the region-`c` conversions (F186).
  //
  // The template term takes the other record: `GetStat(U,STypeID,1)` reads the **base** unit, so
  // it is a permanent-record read and no live conversion can defeat it. Template 356 is Warlord's
  // Goblin Night Goblins (`Calculator/units_warlord.js`, Missile 5), and it carries the
  // `nightGoblins` special-unit key so the one table of template-id exceptions stays the only
  // place a template id is named (`SPECIAL_UNIT_DEFS`, `stats_identity.js`). `identity` is the
  // permanent record and `specialUnit` is never written by a conversion, which is what makes this
  // read permanent by construction rather than by position (F189).
  const warlordEternalNightActive = u => !!(enemyEternalNight && isWarlord
    && identity.specialUnit !== 'nightGoblins'
    && unitRealmAt(u) !== 'death' && !undeadEnchantmentFlag);
  // The realm is read once per call, at the reading step's own position.
  const darknessBonuses = (u) => {
    const realm = unitRealmAt(u);
    if (realm === 'death') {
      return { atk: darknessAtkDefMagnitude(u), def: darknessAtkDefMagnitude(u),
        res: darknessResMagnitude };
    }
    if (realm === 'life') {
      return { atk: -darknessAtkDefMagnitude(u), def: -darknessAtkDefMagnitude(u),
        res: -darknessResMagnitude };
    }
    return { atk: 0, def: 0, res: 0 };
  };
  const darknessAtkBonus = u => darknessBonuses(u).atk;
  const darknessDefBonus = u => darknessBonuses(u).def;
  const darknessResBonus = u => darknessBonuses(u).res;
  // True Light reads the realm at its own block in both engine families, so it takes the record
  // standing at its own chain entry (F185). Warlord's block
  // is `GetStat(U,SRace,0)` (`UnitCalcPre.CAS:1511,1523`), the *current* record by the CAS
  // contract quoted above `warlordEternalNightActive`; the DOS block is `bu->race` at 131:0x903A1 and
  // 131:0x904EB (`unitcalc.c`), the one battle-unit record `BU_Apply_Specials` mutates in place.
  // The two entries differ — `b:trueLight` in Warlord, `c:trueLight` in the MoM builds — and the
  // MoM entry follows every conversion, so only Warlord moves.
  //
  // Warlord's Death arm carries a second term the DOS block does not have:
  // `%OR (GetEnchantmentFlag(U,EncUndead,0)>0)`. It is what gives an Undead unit the penalty at
  // region `b`, where `c:undead`'s realm write has not run yet.
  // Two independent `IF`s in both families, not an if/else, which only matters once the Undead
  // flag is a term of its own: a Life-race unit carrying the flag takes the penalty arm *and* the
  // bonus arm and nets zero. The realm alone can never satisfy both.
  const trueLightBonuses = (u) => {
    const realm = unitRealmAt(u);
    let value = 0;
    if (realm === 'death' || (isWarlord && undeadEnchantmentFlag)) value -= 1;
    if (realm === 'life') value += 1;
    return value;
  };

  // Effective values (level + weapon + ability + node aura + darkness/light modifiers)
  // Lionheart: version-dependent HP bonus (+3 in MoM; floor(8/figs) in CoM/CoM2).
  // RTB bonus (+3) applies to non-magical ranged (missile/boulder) in all versions.
  // Thrown gets the bonus only in MoM; CoM/CoM2/Warlord drop the thrown bonus.
  // The write is `PROVENANCE[lionheart]` (`stats_sequence.js`), which carries all five builds.
  const lionheartActive = !!(abilities && abilities.lionheart);
  const lionheartHpMod = lionheartActive
    ? (version.startsWith('mom') ? 3 : Math.floor(8 / baseFigs))
    : 0;
  // Endurance: CoM gives +2 defense; CoM2 instead gives +4 total HP split evenly
  // between figures, with a minimum of +1 HP per figure. The write is `PROVENANCE[endurance]`
  // (`stats_sequence.js`); the +4 is the configured `EnduranceHpBonus`, not a literal.
  const enduranceActive = !!(abilities && abilities.endurance);
  const enduranceDefMod = enduranceActive && version.startsWith('com_') ? 2 : 0;
  const enduranceHpMod = enduranceActive && version.startsWith('com2')
    ? Math.max(1, Math.floor(4 / baseFigs))
    : 0;

  const charmOfLifeActive = !!(abilities && abilities.charmOfLife);
  // Position on the same six-rung ladder `getLevelBonuses` reads. An unlisted level stops
  // rather than ranking as an unpromoted unit, which would silently withhold the Discipline
  // and Soul Flay steps below (`SPEC.md`, *Out-of-range values stop the run*).
  const levelRank = ({
    normal: 0,
    regular: 1,
    veteran: 2,
    elite: 3,
    ultra_elite: 4,
    champion: 5,
  })[level];
  if (levelRank === undefined) {
    throw new Error(
      `deriveUnitStats: experience level '${level}' is not one of `
      + `${LEVEL_LADDER.join('/')}, the option set of the Unit Level control.`);
  }
  // A pre-sequence constant on purpose, and not a record field. `EncDiscipline` is written at
  // `CreateUnit.CAS:661` (`ABase`) and `OverlandEndTurn.CAS:452` (selector 1) — the permanent
  // record, and neither line carries a stat delta, so neither earns a step (`SPEC.md`, *Phases*).
  // Nothing else in the corpus writes the flag: `UnitCalcPre.CAS:858` reads it and writes
  // `EncDisciplineOld`. So no step can move this value and a record field would restate the
  // constant rather than position it — the Outlander Military Drilling grant included, which is
  // that same permanent write (`stats_identity.js`) (F202).
  const disciplineVal = version.startsWith('com2') ? ((abilities && abilities.discipline) || 'none') : 'none';
  const disciplineActive = disciplineVal === 'overland' || disciplineVal === 'combat';
  const combatDisciplineNegatesFirstStrike = disciplineVal === 'combat' && levelRank >= 3;
  const disciplineDefMod = disciplineActive ? (levelRank >= 1 ? 2 : 1) : 0;
  const disciplineAtkMod = disciplineActive && levelRank >= 2 ? 1 : 0;
  // Overland Discipline grants +1 movement at Elite+, but movement is not modeled here.

  // Soul Flay (Warlord, Death rare combat curse): irresistible curse on normal units
  // or heroes. Penalises stats by −1 melee, −1 ranged, −2 armor and −2 resistance per
  // experience level of the target. Experience level counts Recruit (the calculator's "normal")
  // as level 1, so the multiplier is levelRank + 1: Recruit −1/−1/−2/−2, Elite −4/−4/−8/−8.
  // Fantastic creatures are not valid targets and take no penalty. The write is
  // `PROVENANCE[soulFlay]` (`stats_sequence.js`).
  const soulFlayActive = version.startsWith('com2_warlord')
    && !!(abilities && abilities.soulFlay)
    && !isFantasticBase;
  const soulFlayLevels = levelRank + 1;
  const soulFlayAtkMod = -1 * soulFlayLevels;
  const soulFlayDefMod = -2 * soulFlayLevels;
  const soulFlayResMod = -2 * soulFlayLevels;

  // Plague (Warlord combat curse): inflicted by the Pestilence city curse on defending
  // garrison units, by the Plague Lord unit ability, and by the Plague Lord artifact power.
  // −3 attack, −3 ranged, −3 armor, −6 resistance and −10% To-Hit for the rest of combat, on
  // any affected unit (no fantastic exclusion). The To-Hit penalty is applied below. The
  // script writes `SRanged`, the conventional ranged field, so the penalty lands on the
  // ranged channel only; Warlord's independent Thrown and Breath fields are untouched.
  // The write is `PROVENANCE[plague]` (`stats_sequence.js`).
  const plagueActive = version.startsWith('com2_warlord') && !!(abilities && abilities.plague);

  // Pox Host (Warlord global combat debuff): a Goblin Poxbearer unit present on the
  // battlefield spreads Goblin Pox to every unit, with the effect varying by race.
  // Goblin units suffer −1 attack, −1 ranged, −1 armor (no resistance penalty); non-Goblin
  // units suffer −3 attack, −3 ranged, −3 armor, −1 resistance. No To-Hit penalty, unlike
  // Plague. The Warlord manual instead gives −1/−3 resistance; the script's branches settle it
  // (`PROVENANCE[goblinPox]`, `stats_sequence.js`) and agree with the in-game helptext: "all
  // Goblin units suffer -1 Attack, and -1 Armor, while all non-Goblin units suffer -3 Attack,
  // -3 Armor, and -1 Resistance" (`Unit rosters/Warlord mod unit data/HELP.TXT:6428`, POX HOST).
  // Read from the global toggle; the race picks the branch. The block's own read is
  // `GETSTAT(U,SRace,1)` — index 1, the permanent record — while the Specialist's Mastery block
  // immediately below it reads `GETSTAT(U,SRace,0)`, so the two slots are distinguished at this
  // point in the file and this one takes the base race (empty on custom units).
  const poxHostActive = version.startsWith('com2_warlord') && !!input.poxHost;
  const poxHostIsGoblin = baseUnitRace === 'Goblin';
  const goblinPoxAtkMod = poxHostIsGoblin ? -1 : -3;
  const goblinPoxDefMod = poxHostIsGoblin ? -1 : -3;
  const goblinPoxResMod = poxHostIsGoblin ? 0 : -1;

  // Great Unbinding (Warlord Sorcery very rare global): debuffs opponent fantastic
  // creatures in combat with −20% To-Hit, −20% To-Defend and −2 Resistance for the
  // rest of battle. Only fantastic creatures are affected (the Confusion half of the
  // spell is not modelled here). The To-Hit/To-Defend penalties are applied in the
  // toHit/toBlock section below; here we handle the −2 Resistance. The write is
  // `PROVENANCE[greatUnbinding]` (`stats_sequence.js`).
  const greatUnbindingActive = version.startsWith('com2_warlord')
    && !!(abilities && abilities.greatUnbinding)
    && isFantasticBase;

  // Natural Selection (Warlord Nature common global): units trained in a city gain
  // bonuses from resources in the city's surroundings. The inputs expose each resource
  // separately on the trained unit:
  //   Coal → +1 melee; Iron → +1 armor; Wild game → +1 ranged attack (+ Forester);
  //   Nightshade → +1 resistance; Power minerals → +N resistance (the numeric input
  //   holds the resistance bonus directly). The Resistance resources are not independent:
  //   Nightshade's later snapshot-based write replaces the Power-mineral bonus.
  // Forester is a terrain/movement perk with no combat effect, so only the +1 ranged
  // attack from Wild game is reflected in the stats. The five writes are
  // `PROVENANCE[naturalSelection:coal|iron|wildGame|nightshade|powerMinerals]`
  // (`stats_sequence.js`), all from `CreateUnit.CAS`, and the Nightshade anchor is where the
  // snapshot ordering that makes the two Resistance resources non-independent is recorded.
  const naturalSelectionEligible = isWarlord && !isFantasticBase && !isHero;
  const naturalSelectionCoal = naturalSelectionEligible && !!(abilities && abilities.coal);
  const naturalSelectionIron = naturalSelectionEligible && !!(abilities && abilities.iron);
  const naturalSelectionNightshadeCount = abilities && abilities.nightshade === true
    ? 1 : Math.max(0, parseInt(abilities && abilities.nightshade) || 0);
  const naturalSelectionNightshade = naturalSelectionEligible
    && naturalSelectionNightshadeCount > 0;
  // Nature Link (Warlord rename of Land Linking): grants +1 resistance to any unit
  // (normal or fantastic) — `PROVENANCE[natureLink]` (`stats_sequence.js`). The fantastic-only
  // +2 melee/def/breath is `PROVENANCE[landLinking]` beside it.
  const natureLinkActive = isWarlord && !!(abilities && abilities.landLinking);
  const naturalSelectionPowerMineralsCount = naturalSelectionEligible
    ? Math.max(0, parseInt(abilities.powerMinerals) || 0)
    : 0;
  const naturalSelectionPowerMinerals = naturalSelectionPowerMineralsCount > 0;

  // Survival Instinct (Warlord addition): newly trained normal units gain a small
  // +3% to +7% To-Defend from gold-producing resources in the city's surroundings.
  // The numeric input holds that To-Defend percentage; applied to normal units only
  // (the fantastic-creature buff is the separate survivalInstinct checkbox). The write is
  // `PROVENANCE[survivalInstinctToBlock]` (`stats_sequence.js`), from `CreateUnit.CAS`.
  // `CreateUnit.CAS:524-525` writes `SToDefend` on record `ABase` when a city produces the unit,
  // and its own block carries no identity test — the restriction to a trained normal unit is the
  // routine, not the block. So the gate reads the **base** identity: this is a permanent
  // training-time write, made before combat, and no later conversion is visible to it. A unit
  // Chaos Channels, Sanctify, Undead or Destiny converts in combat keeps what its city gave it.
  const survivalInstinctToBlkBonus = isWarlord && isNormalUnitType(baseUnitType)
    ? Math.max(0, parseInt(abilities.survivalInstinctToBlock) || 0)
    : 0;

  // Orihalcon: +1 resistance, +2 magical ranged attack (CoM/CoM2).
  const orihalconActive = armor === 'orihalcon';

  // Wall of Fire garrison boost (Warlord): the city enchantment grants +1 to all
  // defending non-Fantastic non-magic attacks, mirroring the original game's Metal
  // Fires. Modelled as a per-unit enchantment so it can apply to whichever side is
  // the garrison. Covers melee, physical ranged
  // (missile/boulder), and thrown — but not magic ranged or breath. Like Metal Fires
  // it also upgrades a normal weapon to magic (bypasses Weapon Immunity) — applied to
  // effectiveWeapon below. (The fire-line damage to attackers crossing the wall is the
  // separate global Wall of Fire toggle, handled in combat_special_attacks.js.) The strength
  // write is `PROVENANCE[wallOfFire:garrison]` (`stats_sequence.js`).
  // The eligibility term is the block's own `IF (BASEFANTASTIC(U)>0) THEN { GOTO "NOWALLOFFIRE"; }`
  // (`UnitCalcPre.CAS:1638`) — the **permanent** record, so a combat conversion to Fantastic does
  // not withdraw the garrison bonus, and Spirit Link clearing live Fantastic does not confer it.
  // That record is the one the `base` phase leaves, so Destiny's permanent `B.Fantastic := True`
  // ($0059A390) withdraws it (F192).
  // That single test is the whole gate: the block has no hero arm, so a Warlord hero garrisoning
  // the city takes the package like any other non-Fantastic unit. The `!isHero` term this line
  // used to carry was the calculator's own, read off the helptext's "Friendly regular units gain
  // +1 Melee Attack, +1 Physical Ranged Attack, and +1 Thrown Attack, and their attacks can
  // ignore Weapon Immunity" (`Unit rosters/Warlord mod unit data/HELP.TXT:2761`) — prose, which
  // the script outranks (CLAUDE.md, *Source routing*) (F175).
  const wofDefenderBonusActive = isWarlord && !!(abilities && abilities.wallOfFireBoost)
    && !permanentFantastic;

  // Flame Blade: +2 to missile and thrown rtb only (not boulder, magic) —
  // `PROVENANCE[flameBlade]` (`stats_sequence.js`), which carries all five builds, and Warlord's
  // helptext says the same in words: "+2 Missile-type Ranged and Thrown Attacks"
  // (`Unit rosters/Warlord mod unit data/HELP.TXT:5300`, and :5305 for Fiery Blade).
  // Combat-cast Flame Blade's +1 Fire Breath is a separate region-d script write below;
  // neither blade boosts boulder here.
  // Warlord Fiery Fury is the wider one — "Thrown/Missile/Rock Ranged Attacks by 2" (:5885),
  // regular units only — and the two do not stack except on that Rock/boulder arm (:5886).
  // Its write is `PROVENANCE[fieryFury]`.
  // Flame Blade / Fiery Blade also upgrade the unit's normal weapon to magic (bypasses Weapon Immunity);
  // Fiery Fury does the same for regular units.
  // Read here rather than at a rank, for both of this file's reasons at once. The Lava Smelter
  // grant is `SETENCHANTMENTFLAG(U,EncFlameBlade,ABase,1)` (`CreateUnit.CAS:496`) and
  // `…,1,1)` (`OverlandEndTurn.CAS:551`) — permanent writes, and that whole block writes five
  // flags and no stat, so it earns no step (`SPEC.md`, *Phases*) and no step can move the value.
  // And the upgrade it feeds through `hasWarlordBlade` is the weapon material, a **result** field
  // that cannot be a record field, exactly as `artificerMagicWeapon` above and Metal Fires' own
  // upgrade below are. `c:metalFires`'s non-stacking gate takes `u.fieryBlade` off the record
  // because it is a step; `hasWarlordBlade` gates a step *and* the result field, and since the
  // result half can never move, moving the step half alone would spell one fact twice (F202).
  const warlordFieryBlade = isWarlord && !!abilities.fieryBlade;
  const hasWarlordBlade = warlordCombatFlameBlade || warlordFieryBlade;
  const nonWarlordFlameBlade = !!abilities.flameBlade && !isWarlord;
  // Metal Fires is one compiled block (`unitcalc.c` 131:0x9065F..0x9072B), built only into
  // MoM 1.31 and CP 1.60, and one eligibility gate covers its whole package: melee 0x906C1,
  // missile/Thrown strength 0x906FC, and the magic-weapon upgrade 0x90723. The strength and
  // melee halves are the `c:metalFires` step (`combat_abilities.js`), which `SCOPE_MOM` keeps
  // out of the CoM engines; the weapon upgrade is not a step, so it carries the same version
  // test here. The engine's `!(ench & UE_FLAME_BLADE)` non-stacking gate is the last term.
  // The block's Fantastic test is `!(bu->Abilities & UA_FANTASTIC)` at 131:0x9069A, the calculated
  // record at the block's own position, and the upgrade is a result field that cannot be a step,
  // so it takes `finishedIdentity`. The two agree wherever this is reachable: `c:metalFires` is
  // rank 30 of 44 in the MoM 1.31 chain and 30 of 43 in CP 1.60, and no identity conversion ranks
  // after it in either (F192).
  const metalFiresActive = !!abilities.metalFires && !finishedIdentity.fantastic
    && !isCoMVersion && !abilities.flameBlade;
  const fbAtkBonus = (nonWarlordFlameBlade || hasWarlordBlade) ? 2 : 0;
  // The ELSE arm of Fiery Fury's one `IF (BASEFANTASTIC(U))` (`UnitCalcPre.CAS:834`), whose THEN
  // arm is `b:fieryFury:race` (`stats_identity.js`). `BASEFANTASTIC` is the permanent record as
  // the `base` phase leaves it, Destiny's write included (F192).
  const ffRegularBonus = isWarlord && !!abilities.fieryFury && !permanentFantastic;
  // Fiery Fury melee +3 for regular units — "an increase in Melee Attacks by 3"
  // (`Unit rosters/Warlord mod unit data/HELP.TXT:5885`) — non-cumulative with Flame Blade /
  // Fiery Blade (combat_abilities.js already adds +3 melee for a Warlord blade effect).
  const ffMeleeBonus = ffRegularBonus && !hasWarlordBlade ? 3 : 0;

  // Warlord Colossal Strength: +1 + 40% (rounded down) of Melee, Physical Ranged, and
  // Thrown attack strength. Breath and magic ranged are not "physical ranged" and do not
  // qualify.
  //
  // UnitCalc.CAS:1227-1243 computes `1 + %I(GetStat(U,SAttack,0)*4/10)` from the attack as
  // it stands in phase d — not from the base — so the bonus scales everything phases a-c
  // applied, plus the phase-d terms that precede it in the file: Rust (:500-512), Focus
  // Magic (:83, :515) and Weakness's breath penalty (:317-323). Those are every phase-d
  // term the calculator models. As a step it simply reads `u.atk` / the channel's strength at
  // the end of region `d`, which is that subtotal by construction.
  const colossalStrength = isWarlord && !!(abilities && abilities.colossalStrength);
  // Stats are never negative in the engine, so a subtotal driven below zero scales as zero.
  const colossalScaled = (subtotal) => 1 + Math.floor(0.4 * Math.max(0, subtotal));
  const holyArmorActive = !!(abilities && abilities.holyArmor);
  // Pillar of Faith (Warlord, Life rare city enchantment): +1 Resistance per qualifying
  // building in the training city — `PROVENANCE[pillarOfFaith]` (`stats_sequence.js`), whose
  // `CreateUnit.CAS` span is the `FAITH` accumulator. The script has no cap; the numeric input
  // holds the count.
  const pillarOfFaithCount = isWarlord && !isFantasticBase && !isHero
    ? Math.max(0, parseInt(abilities.pillarOfFaithRes) || 0)
    : 0;
  const pillarOfFaith = pillarOfFaithCount > 0;
  // Warlord scoring options run in UnitCalcPre.CAS (phase b). Uphill Battle is
  // represented per unit so the caller can mark whichever side is AI-controlled.
  // Gods Play Dices records the already-rolled combat modifier rather than rolling
  // or mixing it into the damage distribution.
  const uphillBattleActive = isWarlord && !!(abilities && abilities.uphillBattle);
  const godsPlayDicesResMod = isWarlord
    ? Math.max(-2, Math.min(2, parseInt(abilities.godsPlayDices) || 0))
    : 0;
  // Berserk: two distinct mechanics, modelled as separate abilities.
  // 'berserk' (MoM Death spell, UI-gated to MoM versions): doubles melee attack
  // (applied last, after all other bonuses) and sets defense to 0 absolutely (no
  // other bonus can raise it while Berserk is active). Removed in CoM/CoM2.
  // 'berserkWarlord' (Warlord Troll Medicineman buff, UI-gated to Warlord): +15% To
  // Hit, +1 combat movement (irrelevant here), and -10% To Block. No atk-doubling
  // and no def-zeroing.
  // The two writes are `PROVENANCE[berserk]` (MoM builds only) and
  // `PROVENANCE[berserkWarlord]` (`stats_sequence.js`), whose version lists are the split.
  const classicBerserk = !!(abilities && abilities.berserk) && version.startsWith('mom');
  const warlordBerserk = !!(abilities && abilities.berserkWarlord) && isWarlord;
  // `B.attack > 0`, the melee-presence test the **compiled** blocks make. It is a per-write
  // gate and nothing else: no terminal pass consults it, because the engine has none. The
  // recompute's melee tail is `if U.attack < 0 then U.attack := 0`
  // (Units.RecalculateUnits.pas:2483) — a floor, not a zeroing of a unit whose permanent melee
  // is 0 — so a write that carries no gate of its own leaves melee standing, and `e:clamp`
  // floors it like any other field (F142). A block with no gate is therefore expressed by not
  // asking this predicate, rather than by widening it: the Warlord CAS files gate no melee
  // write at all, and widening the predicate for those would also un-gate every compiled block
  // in the same run, which is what F142 measured and removed.
  //
  // **Which record the strength is read from is the permanent one, `ctx.base`, not the card's
  // `atk` input** (F133). Every melee-presence test `Caster.exe` makes is `BaseUnits[i].attack`
  // — the Holy Bonus aura (Units.RecalculateUnits.pas:2530), `applynodeaura` ($005971C3, :466),
  // the level ladder (:543) and `ApplyMagicWeapons` ($00598F43, :637) — and
  // `CreateUnit.CAS` writes `SAttack` at `ABase` before the recalculation copies that record,
  // ungated on the field's current value: Ludus/Agoge (:346), an Altar of the Sun Holy Mother
  // (:360), Mother Fungus (:448), a Coal site (:552) and the Malnourished penalty (:616). Those
  // writes are `base`-phase steps here, so the record as that phase leaves it is what a later
  // region reads (SPEC.md, *The step model*). The card's input is that record only before the
  // base phase runs, which is why this is a predicate over the run context rather than a boolean
  // captured beside it — the same read `c:weapon`'s `weaponMeleeOpen` already makes.
  const hasMeleeAttackAt = runCtx => runCtx.base.atk > 0;

  // Chaos Surge: affects Chaos creatures only.
  // MoM and CoM 1 both write the shared ranged slot unconditionally on attack type, so
  // the bonus reaches missile, boulder, magic ranged, thrown, breath and gaze alike.
  // Chaos Channels' granted Fire Breath is excluded in MoM only: the constructor runs
  // Chaos Surge *before* BU_Apply_Specials, whose CC block then assigns ranged = 2 over
  // the top. CoM 1 swapped that call order, so there the CC breath keeps the bonus.
  // CoM2/Warlord are a separate engine and keep the narrower helptext scope.
  // Weakness: -2 (MoM) or -3 (CoM/CoM2/Warlord). Which ranged types each build's gate admits,
  // and MoM 1.31's unsatisfiable `int8` second test that exempts thrown there, are
  // `Reference docs/MoM binary analysis.md`, *Combat-effect stat writes* — its per-build gate
  // table, richer than any restatement here. The steps are `PROVENANCE[weakness]`
  // (`stats_sequence.js`), phase c for the compiled block and phase d for Warlord's script half.
  // The three branches are mutually exclusive and fall in different phases: ranged and
  // thrown are binary (phase c), while the Warlord breath penalty is phase d. They are
  // kept as separate terms so each lands in the right accumulator.
  // The magnitude alone. Whether Weakness lands is `u.weakness` at each of the two steps' own
  // positions, which is what the curse strip at the head of the chain has already answered.
  const weaknessPenalty = isCoMVersion ? 3 : 2;

  // Holy Weapon: +10% To Hit on melee, missile, and boulder attacks. Also applies to thrown
  // in all versions except MoM 1.31 (bug). Does NOT affect magic ranged, fire/lightning
  // breath, or gaze attacks. Also upgrades normal weapon to magic (bypasses Weapon Immunity).
  // The write is `PROVENANCE[holyWeapon]` (`stats_sequence.js`), which carries all five builds.
  const hwActive = !!(abilities && abilities.holyWeapon);
  const hwMeleeToHit = hwActive ? 10 : 0;
  // Rust clears the persistent material flags before recalculation, so Heavenly Light sees the
  // post-Rust base material record rather than the pre-curse UI selection. The write itself is
  // `PROVENANCE[heavenlyLight]` (`stats_sequence.js`); this is its material gate.
  //
  // Both engines read the same fact — the persistent record's weapon-quality bits — and grant the
  // threshold only where they are clear. CoM 1 states it as `cl = _UNITS[si].mutations` followed
  // by `if (!(cl & UM_WEAPON_QUALITY_MASK))`, and has neither of the modern hero/Fantastic
  // exclusions. It adds one suppressor the calculator does not model: `_UNITS[si].type >= 0x97`
  // forces `cl` to Magic Weapons, so a high-index roster entry takes no threshold. Which set that
  // ceiling selects is R6.1a's open question — the index↔roster-id mapping is unsettled — so the
  // condition that *is* determined is implemented and the ceiling is not.
  const heavenlyLightMaterialTail = heavenlyLightActive
    && weapon === 'normal' && (isCoM1 || (!isHero && !isFantasticBase));
  // CoM 1 tests the *live* melee at its own position (`if (bu->melee > 0)`, com1:0x905F3), where
  // Caster.exe tests the persistent base attack; both thresholds sit inside that same gate.
  const heavenlyLightMeleeToHitAt = u => (heavenlyLightMaterialTail
    && (isCoM1 ? u.atk > 0 : inputBaseAtk > 0)) ? 10 : 0;
  const heavenlyLightThrownToHit = heavenlyLightMaterialTail ? 10 : 0;
  const outlanderRtbToHitBonus = outlanderReform.ballisticsTraining ? 20 : 0;
  const uphillBattlePct = uphillBattleActive ? 10 : 0;
  const weaponUpgradedByHW = hwActive && weapon === 'normal';
  // Two effects with different scopes shared one test here: Wraith Form is an all-versions
  // enchantment whose bypass arm is CoM 1 on, while Ruler of Underworld is Caster.exe only —
  // `PROVENANCE[rulerOfUnderworldEligibility]` (`combat_special_attacks.js`) carries the two
  // modern builds alone, and its `GEKingOfUnderworld` grant is the compiled
  // `U.EnchantmentFlags[EncWraithForm] := True` at Units.RecalculateUnits.pas:1515-1517. So
  // `startsWith('com')` wrongly admitted it into CoM 1; each disjunct now carries its own scope.
  const wraithFormBypassesWI = weapon === 'normal'
    && !!abilities
    && ((version.startsWith('com') && !!abilities.wraithForm)
      || rulerOfUnderworldActiveForUnit(abilities, version));
  // Warlord Wall of Fire's defender bonus mirrors Metal Fires: "their attacks can ignore Weapon
  // Immunity" (`Unit rosters/Warlord mod unit data/HELP.TXT:2761`), for its non-magic attacks.
  const weaponUpgradedByWoF = wofDefenderBonusActive && weapon === 'normal';
  // Note: Eldritch Weapon also upgrades a normal weapon to magic, but ONLY for the melee attack:
  // its first bonus turns the enchanted unit's Melee Attack into a Magical Melee Attack, and it
  // names no other channel (`Reference docs/MoM source - Fandom site/Eldritch Weapon.md`,
  // *Magical Attack*). It is therefore NOT folded into
  // this global weapon type — it is applied to the melee Weapon-Immunity check only
  // (see meleeWeaponWI in combat_effects.js). Its ranged/thrown attacks stay non-magical, so
  // Weapon Immunity still raises the target's defense against them.
  const weaponUpgradedByHeavenlyLight = heavenlyLightActive && weapon === 'normal';
  const effectiveWeapon = ((fbAtkBonus > 0 || metalFiresActive) && weapon === 'normal') ? 'magic'
    : (ffRegularBonus && weapon === 'normal') ? 'magic'
    : (weaponUpgradedByHW ? 'magic'
    : (wraithFormBypassesWI ? 'magic'
    : (weaponUpgradedByWoF ? 'magic'
    : (weaponUpgradedByHeavenlyLight ? 'magic'
    : weapon))));

  // ApplyAttack passes `EncMagic or magicranged` to EffectiveDefense. Keep EncMagic as
  // calculated state instead of approximating it later from weapon quality and final unit
  // type. Only the material grant made by `ApplyMagicWeapons` can be suppressed by an enemy
  // King/Ruler of Underworld: a rival `GEKingOfUnderworld` clears the local `b` and so skips
  // `Units[i].EnchantmentFlags[EncMagic] := True` alone, clearing neither an existing flag nor
  // any material stat or To-Hit write below it (Units.RecalculateUnits.pas:613-626, $00598EA7).
  // Independent EncMagic writes therefore survive whether they occur before that helper (hero
  // standing and Warlord Wall of Fire) or after it.
  const modernEncMagicFromMaterial = version.startsWith('com2_') && weapon !== 'normal';
  // The flag is published as a result field rather than carried on the record, so its Fantastic
  // arm is read off the record at the block's own chain rank — captured during the run below —
  // instead of at any other position. Everything else in the disjunction is position-independent.
  const modernEncMagicOtherTerms = version.startsWith('com2_')
    && (isHero
      || nonWarlordFlameBlade || hasWarlordBlade || ffRegularBonus || hwActive
      || !!abilities.wraithForm || !!abilities.rulerOfUnderworld
      || !!abilities.blazingMarch || wofDefenderBonusActive || heavenlyLightActive);

  // Eye of Heaven is the only effect that switches a gaze off: `UnitCalc.CAS:1483` zeroes
  // `SStoningGaze`/`SDeathGaze`/`SDoomGaze` and nothing else in any source does.
  const gazeDisabled = enemyEyeOfHeaven;
  // A gaze's strength lives in the same `.ranged` slot Chaos Surge writes, so MoM and
  // CoM 1 boost all three DOS gaze types. CoM2/Warlord (separate engine) are left unchanged.
  // Level bonus to a gaze's strength, from the same shared `.ranged` slot. MoM's level
  // routine (0x8F881-0x8FB3E) has no `ranged_type` gate at all, so all DOS gaze types take
  // the full ranged ladder. CoM 1 replaced it with a table loop whose `.ranged` step is
  // skipped for `ranged_type >= 100` — thrown, breath and every gaze — on all rows but
  // Veteran (0x8FA9A-0x8FAAB); that is exactly the ladder's `thrown` column. CoM2 and
  // Warlord instead write none of their three independent gaze fields in ApplyLevelBonus.
  const gazeLvlMod = version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : 0;
  const doomGazeLvlMod = version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : 0;
  // CoM 1's Warp Attack halves the `.ranged` slot with no `ranged_type` test at all
  // (0x90764-0x90772), so it reaches a gaze's strength exactly as it reaches conventional
  // ranged, thrown and breath. Darkness lands after the halving, as it does for the ranged
  // stat below. MoM's Warp Attack touches melee only. CoM2/Warlord's separate gaze fields
  // are untouched by all three compiled Warp blocks (CoM2 analysis, *The Warp blocks*).
  // CoM 1 only, and read inside `c:warpAttack`'s own `apply`, so whether Warp Attack lands is
  // already settled by that step's gate: this is the branch within it, not a second copy of it.
  const gazeWarpHalves = isCoM1;

  // Psycho Force and Pneuma Field are the two Magitek effects that read Resistance rather than
  // writing it. Both are region `d` — UnitCalc.CAS:1413-1417 and :1419-1425 — and both flags are
  // Outlander reform grants, so each is a record field the step reads at its own position; the
  // version half is the step's scope (`SCOPE_WARLORD`) and needs no term here (F202).
  const warpRealityActive = !!input.warpReality;
  // Warp Reality's exemption is read at its own block in both engine families, so it takes the
  // record standing at `c:warpReality` (F184). The modern
  // block is `(ownCG or oppCG) and (not IsChaosUnit(i))` at $005A3E33..$005A3ED0
  // (`Units.RecalculateUnits.pas`), and the helper takes the *calculated* record — the one stated
  // fact about it, from the Spell Ward chain in
  // `Reference docs/Caster binary/CoM2 binary - unit recalculation.md`; the DOS block is
  // `bu->race != rt_Chaos` at 131:0x9077A and com1:0x904DF (`unitcalc.c`), the one battle-unit
  // record `BU_Apply_Specials` mutates in place. The block states **no second unit-side term**:
  // its other two terms are the attacker-side and defender-side combat-global reads, which are
  // `warpRealityActive`. Only Warlord moves — `c:warpReality` follows every conversion of the
  // other four chains, and in Warlord `d:spiritLink` still follows it, so a Spirit-Linked Chaos
  // unit is Fantastic where the block stands and the exemption is no longer withheld from it.
  //
  // *Which* predicate `IsChaosUnit` computes is a separate, unsettled question — BACKLOG Q31 —
  // and this positioning does not answer it: the DOS block transcribed above tests the realm
  // alone, where the calculator spells the modern one as the compact `fantastic_chaos` token here
  // and as the realm alone at Chaos Surge. Both readings exempt the Spirit-Linked Chaos unit once
  // the record is positional, which is why the position is answerable without Q31.
  const unitIsChaos = u => unitTypeAt(u) === 'fantastic_chaos';
  const hurricaneActive = !!input.hurricane;
  // The immunity half used to be restated here beside the flag. It is not a term of the block —
  // `Units.RecalculateUnits.pas:2341`-style curse blocks test their flag alone — and it was a
  // second home for what `base:immunityCurseGating` already does, whose Illusion arm is the wider
  // of the two (it also reaches True Sight and Eye of Heaven). The flag at this step's own
  // position is the whole gate (F199).
  const vertigoHitPenalty = isCoM2 ? 0.25 : (isCoMVersion ? 0.3 : 0.2);
  const vertigoBlockPenalty = isCoM2 ? 0.07 : (isCoMVersion ? 0.1 : 0);

  // The record's own vocabulary boundary. `buildSlotContext` reads a slot's token through three
  // positive `includes` predicates over `RANGED_TYPES`, `THROWN_TYPES` and `GAZE_TYPES`, so a
  // token no vocabulary defines answers `none` to all three and the slot derives with no attack
  // in it — the silent inertness the fail-loud rule forbids (`CLAUDE.md`, *Architecture*), and
  // the shape that let F161's `'stoning_gaze'` typo pass a negative assertion vacuously. `none`
  // is the one token that legitimately states no attack, in every version and on both the shared
  // slot and a seeded modern channel; anything else stops the run (F181).
  //
  // Written once and called twice, because the channel loop below drops an empty untyped channel
  // before `buildSlotContext` ever sees it: `{ strength: 0, type: '' }` and a channel with no
  // `type` at all would otherwise be filtered out rather than rejected, which is the same silence
  // one layer earlier. An empty channel states `{ strength: 0, type: 'none' }`.
  function assertSlotAttackType(type, where) {
    if (SLOT_ATTACK_TYPES.includes(type)) return type;
    throw new TypeError(
      `deriveUnitStats: ${where} of side ${JSON.stringify(prefix)}, `
      + `${JSON.stringify(input.name || 'a custom unit')} in ${version}, states attack type `
      + `${JSON.stringify(type)}, which names no channel type this build defines `
      + `(offered: ${SLOT_ATTACK_TYPES.join(', ')}). A slot with no attack states 'none'.`);
  }

  // --- One derivation slot per record strength field (F80) ---
  //
  // `Caster.exe` holds Ranged, Thrown, Fire Breath and Lightning Breath as four named fields of
  // one unit record — `U.ranged`, `U.thrown`, `U.firebreath`, `U.lightningbreath` in
  // `Reference docs/Caster binary/Units.RecalculateUnits.pas` — copies the record once and
  // mutates those fields in place. One walk therefore
  // derives every channel: a slot is one strength field plus the type pair and the secondary To
  // Hit modifier that field is read with (steps.js, STAT_DERIVATION_SLOTS).
  //
  // The `shared` slot is the DOS engines' shared `.ranged` slot, which carries conventional
  // ranged, Thrown, Breath and both gaze strengths in one value. The modern engines keep it as
  // the card's shared secondary projection (`result.rtb`), so it is a slot in every version and
  // the four channel slots exist only where the caller supplies `modernAttacks`.
  //
  // Everything below that depends on which attack a write reaches is computed per slot; every
  // other field of the record is written once, from the `shared` slot's context, which is the
  // record-level answer the exposed `atk`/`def`/`res`/`hp` outputs have always used.
  function buildSlotContext(slot) {
    const fields = STAT_DERIVATION_SLOTS[slot.slotKey];
    const channelKey = slot.channelKey || null;
    const isChannelSlot = slot.slotKey !== 'shared';
    const rtbTypeRaw = assertSlotAttackType(slot.type,
      `the ${slot.slotKey} slot${channelKey ? ` (channel ${channelKey})` : ''}`);
    const inputSlotRtb = Math.max(0, parseInt(slot.strength) || 0);
    const permanentRangedType = RANGED_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
    const permanentThrownType = THROWN_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
    const gazeType = GAZE_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
    const marionetteRangedSlot = (marionetteOwned || marionetteStrayed)
      && (!channelKey || channelKey === 'ranged');
    const marionetteOwnsThisRangedSlot = marionetteOwned
      && (!channelKey || channelKey === 'ranged');

    const modernBaseAttacks = slot.baseAttacks || null;
    const modernBaseHasBlackpowderChannel = modernBaseAttacks && Object.values(modernBaseAttacks)
      .some(attack => attack && attack.strength > 0
        && ['missile', 'boulder', 'thrown', 'fire'].includes(attack.type));
    const modernBaseHasPhysicalBlackpowderChannel = modernBaseAttacks
      && Object.values(modernBaseAttacks).some(attack => attack && attack.strength > 0
        && ['missile', 'boulder', 'thrown'].includes(attack.type));
    const selectedBaseHasBlackpowderChannel = inputSlotRtb > 0
      && (permanentRangedType === 'missile' || permanentRangedType === 'boulder'
        || permanentThrownType === 'thrown' || permanentThrownType === 'fire');
    const selectedBaseHasPhysicalBlackpowderChannel = inputSlotRtb > 0
      && (permanentRangedType === 'missile' || permanentRangedType === 'boulder'
        || permanentThrownType === 'thrown');
    const blackpowderEligibleAttack = modernBaseAttacks
      ? modernBaseHasBlackpowderChannel : selectedBaseHasBlackpowderChannel;
    // Blackpowder-derived facts (see the Military Workshop / Rocketry gate above). These read
    // the permanent source fields, as the script's own gates do, and so survive later channel
    // conversions. What the upgrade then *writes* — the missile-to-boulder projectile change,
    // the `<>100` poison increment, the Blackpowder flag and the Armor Piercing grant — is all
    // `base:militaryWorkshop`, `PROVENANCE[militaryWorkshop]` (`stats_sequence.js`), at that
    // block's own rank (F201).
    const blackpowder = blackpowderSource
      && baseNormalTrainingUnit && blackpowderEligibleAttack;
    const blackpowderPhysicalSource = blackpowder && (modernBaseAttacks
      ? modernBaseHasPhysicalBlackpowderChannel : selectedBaseHasPhysicalBlackpowderChannel);
    const blackpowderSelectedPhysicalRanged = blackpowder
      && (permanentRangedType === 'missile' || permanentRangedType === 'boulder');
    const blackpowderSelectedThrown = blackpowder && permanentThrownType === 'thrown';
    const blackpowderSelectedFireBreath = blackpowder && permanentThrownType === 'fire';
    const blackpowderUpgradesToBoulder = blackpowderSelectedPhysicalRanged
      && permanentRangedType === 'missile';

    const calcBaseRtb = inputSlotRtb;
    // CreateUnit.CAS city/resource gates read the permanent unit record before later
    // enchantment-driven channel conversions can create or replace an attack.
    const hasPermanentRangedStat = inputSlotRtb > 0 && RANGED_TYPES.includes(rtbTypeRaw);
    // The field half of Alumni of Academy's gate: the permanent Ranged field carrying a strength
    // in the magical band — `GetStat(U,SRangedType,1) > 29` (`CreateUnit.CAS:462-464`), the whole
    // band, which includes Warlord's own id 40, beam energy. Naming three realm tokens excluded
    // it; the modern vocabulary's `magic`/`magic_lightning` are exactly ids 30-38 and 40, so the
    // predicate is the band. The rest of the gate reads no field and is assembled beside the
    // slot that holds this one (`rangedFieldContext`).
    const permanentMagicalRangedField = inputSlotRtb > 0 && isMagicalRangedType(rtbTypeRaw);

    // What `base:stat:base` seeds, the chain's first entry: the permanent record's identity
    // alone. The Marionette realm retype is `SETSTAT(U,SRangedType,0,…)` — record selector `0`,
    // the calculated record — so it is `b:marionette:rangedType` at its own position and not a
    // seed here (F107), on `PROVENANCE[marionette:rangedType]` (`stats_sequence.js`) from
    // `UnitCalcPre.CAS`. Wanderer's own permanent Chaos type comes from its roster record
    // (`Unit rosters/Warlord mod unit data/UNITS.INI` [362]: `RangedType=30` at `Ranged=0`).
    const baseSequenceRangedType = permanentRangedType;
    const baseSequenceThrownType = permanentThrownType;

    // `base:energyCannon` is a permanent overland conversion to projectile type Beam
    // with ranged Doom damage. The script gates it on persistent Max Ammo > 0, but every
    // shipped Warlord conventional-ranged unit has positive Max Ammo and every Mechanical
    // zero-ammo unit lacks conventional Ranged. The one-round calculator therefore infers
    // that gate from the permanent conventional-ranged snapshot and imports no ammo field.
    // Its +50% write is added to the base phase below, after the earlier permanent ranged
    // writes it reads have been assembled — `PROVENANCE[energyCannon]` (`stats_sequence.js`).
    //
    // Both ability terms are pre-sequence constants on purpose. `energyBeamWeapons` is
    // `SPELLSTATE(W,STMagitekBeamWeapon)=2`, the wizard's research state and no unit field at
    // all. `powerEngine` is `EncPowerEngine` on the **permanent** record — the term this block's
    // second route reads directly (`OverlandEndTurn.CAS:664`) and the one its first route states
    // as the enclosing `SPELLSTATE(W,STHeatPowerEngine)=2` plus `GetStat(U,SCustomAttribute,1)<>1`
    // (`CreateUnit.CAS:675-691`). That flag is written only at `CreateUnit.CAS:679` (`ABase`) and
    // `OverlandEndTurn.CAS:417` (selector 1), and neither line carries a stat delta the record
    // holds — the four writes beside them are movement, which is outside it (F139) — so neither
    // earns a step (`SPEC.md`, *Phases*). No step can move either value, so a record field would
    // restate the constant rather than position it (F202).
    const energyCannon = isWarlord && !!abilities.energyBeamWeapons
      && !!abilities.powerEngine && hasPermanentRangedStat;
    // The conversion reads and writes `SRanged` (`CreateUnit.CAS`, on the anchor above), so the
    // slot that takes it is the one holding
    // the record's Ranged field: the `ranged` channel in the modern record, the shared slot in
    // the DOS ones. It is the same field the record-level gate below resolves, and the two have
    // to name one slot or the +50% strength and the Destruction rider disagree (F127).
    const energyCannonOwnsThisSlot = isCoM2 ? channelKey === 'ranged' : !isChannelSlot;

    // The Chaos Channels fire-breath write — `a:` in the modern builds, `c:` in the DOS ones,
    // both on `PROVENANCE[chaosChannels:fireBreath]` (`stats_sequence.js`). The version-specific
    // admission gate reads the permanent record; whether the slot is free for the write is the
    // step's own live read.
    // The Doom Gaze term is the record's own value: Blazing Eyes is a CoM2-only region-`c` write
    // (`c:blazingEyes`), and this admission gate is reached only when `ccIndependentChannels` is
    // false, i.e. in the three DOS builds, so no Blazing Eyes grant can be standing here (F174).
    const hasGazeAttack = gazeType !== 'none'
      || abilities.stoningGaze != null
      || abilities.deathGaze != null
      || baseDoomGazeStat > 0;
    const ccDosBaseRanged = inputSlotRtb;
    const ccDosBreathEligible = (rtbTypeRaw === 'none' || rtbTypeRaw === 'thrown')
      && !hasGazeAttack && ccDosBaseRanged <= ccDosBaseRangedMax;
    const ccFireBreathGranted = ccFireBreathAbil
      && (ccIndependentChannels || ccDosBreathEligible);
    // Only the Fire Breath channel takes the grant; without this the shared-slot write would
    // land in whichever channel this slot derives and overwrite it.
    const ccOwnsThisSlot = !channelKey || channelKey === 'fireBreath';

    // Natural Selection — Wild game snapshots the permanent conventional-ranged field before any
    // later conversion; the snapshot is on `PROVENANCE[naturalSelection:wildGame]`
    // (`stats_sequence.js`). Read the value at the source step and keep the channel predicate
    // separate so a converted Thrown field cannot stand in for the saved RNG field.
    const naturalSelectionWildGameRangedSlot = isChannelSlot
      ? channelKey === 'ranged'
      : RANGED_TYPES.includes(rtbTypeRaw);
    const naturalSelectionWildGameActive = naturalSelectionEligible
      && !!(abilities && abilities.wildGame) && naturalSelectionWildGameRangedSlot;
    // A channel field carries ranged, thrown AND breath (distinguished by its type pair), so it
    // is also what Explosive's fire-breath doubling scales — that effect has no stat of its own.
    // The doubling is `PROVENANCE[upgradedExplosive:fireBreath]` (`stats_sequence.js`).
    const upgradedExplosive = explosiveEligible && blackpowder;
    // CreateUnit.CAS applies Energy Cannon after Artificer, Blackpowder,
    // Altar of the Moon, and Natural Selection. The +50% therefore reads those
    // permanent ranged writes, but not later equipment or combat modifiers.
    // Type 104 has no conventional component: Automatic Damage assigns `hits = attack_strength`
    // and jumps past both rolls (0x9A1E6 -> 0x9A204), so the one number is *delivered* rather
    // than rolled. Only 103 and 105 roll it. Counting both would double the gaze.
    const dosGazeStrength = !isCoM2 && gazeType !== 'none' && gazeType !== 'gaze_multiple'
      ? calcBaseRtb : 0;

    // Slot identity, and the permanent-record facts the engine's own gates read from `B`.
    // Nothing type-dependent is decided here: what stands in a slot is sequence state, so every
    // such gate is a read of the record at the asking step's own position (M14).
    return {
      slotKey: slot.slotKey, channelKey, isChannelSlot, isCoM2,
      strengthField: fields.strength,
      rangedTypeField: fields.rangedType,
      thrownTypeField: fields.thrownType,
      baseStrength: inputSlotRtb,
      rtbTypeRaw, gazeType,
      baseSequenceRangedType, baseSequenceThrownType,
      permanentRangedType, permanentThrownType,
      calcBaseRtb, hasPermanentRangedStat, permanentMagicalRangedField,
      marionetteRangedSlot, marionetteOwnsThisRangedSlot,
      blackpowder, blackpowderPhysicalSource,
      blackpowderSelectedPhysicalRanged, blackpowderSelectedThrown,
      blackpowderSelectedFireBreath, blackpowderUpgradesToBoulder,
      ccFireBreathGranted, ccDosBreathEligible, ccOwnsThisSlot,
      energyCannon, energyCannonOwnsThisSlot,
      naturalSelectionWildGameActive, upgradedExplosive, dosGazeStrength,
    };
  }

  // The `shared` slot is the DOS engines' shared `.ranged` value and, in the modern engines,
  // the card's shared secondary projection. It carries the record-level answer for every field
  // that is not one of the four channel strengths.
  const recordContext = buildSlotContext({
    slotKey: 'shared', channelKey: null,
    strength: input.rtb, type: input.rtbType, baseAttacks: input.modernAttacks || null,
  });

  // The channel slots. Each of these effects is a real engine write with no existence gate, so
  // the field it writes has to exist for the write to land — `SRanged`/`SThrown`/`SFireBreath`
  // are fields of the record, not attacks the unit has to already own. Each seeding decision
  // below names the `UnitCalc.CAS`/`UnitCalcPre.CAS`/`CreateUnit.CAS` line whose write is
  // ungated. Seeding the field here is what lets the creating step run at its own position
  // inside the one walk.
  const channelSlots = [];
  if (isCoM2 && input.modernAttacks) {
    const modernInputs = { ...input.modernAttacks };
    // `SThrown := SThrown + 1 + SAttack/3` (UnitCalc.CAS:1262-1266) has no existence gate, so
    // the Thrown field has to exist for the positioned grant to land on it. Seeded empty and
    // typeless, exactly as the Blaze of Glory transfer's field is: nothing before
    // `UnitCalc.CAS:1262` may see a Thrown channel the grant has not yet created, and the step
    // itself supplies the identity. Focus Magic needs no second accumulator beside it any more:
    // `U.ranged := U.thrown; U.thrown := 0` (Units.RecalculateUnits.pas:885-891) is a real field
    // move, so it leaves this one field free for the grant (F90).
    // Bombs & Grenades writes the independent Thrown field regardless of any conventional
    // ranged or Breath field already present. `SETSTAT(U,SThrown,0,…)` (UnitCalcPre.CAS:1071)
    // names the calculated record, so the field is seeded empty and typeless like the Shadow
    // Strike and Blaze of Glory fields below, and `b:bombsGrenades` supplies its identity at
    // its own position rather than the permanent record carrying a region-`b` write. The term
    // is the block's eligibility alone, not its write gate: that gate reads the permanent melee
    // the `base` phase leaves and is therefore resolved at the step's own rank, so the field has
    // to stand ready wherever the block can reach it (F202).
    if ((bombsGrenadesCanWriteThrown || shadowStrikeActive) && !modernInputs.thrown) {
      modernInputs.thrown = { strength: 0, type: 'none' };
    }
    // Focus Magic always executes its ranged branch, and every arm of it writes `U.ranged`
    // (Units.RecalculateUnits.pas:884-910) — the creation, the retype, the +3, and the move out
    // of `U.thrown`. The destination is the record's Ranged field in every case, so that field
    // has to exist for the positioned branch to land on it (F90).
    if (focusMagicActive && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: 'none' };
    }
    // `SETSTAT(U,SRanged,0,…)` (UnitCalcPre.CAS:87, and `:412` for the strayed branch's
    // Transmute Equipment) names the calculated record and has no existence gate, so the Ranged
    // field has to exist for the positioned writes to land on it. It is seeded empty and
    // typeless, like the Focus Magic and Blaze of Glory fields above: the permanent type is the
    // roster record's own, and the owned branch's retype is `b:marionette:rangedType`.
    if ((marionetteOwned || marionetteStrayed) && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: 'none' };
    }
    // Unconditional: the grant is `firebreath += 4` whatever else the unit carries
    // (`Caster.exe` $00599F3E, above), so the channel must exist even beside a gaze, a lightning
    // breath or a thrown attack.
    if (recordContext.ccFireBreathGranted && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'none' };
    }
    // UnitCalc.CAS writes `SFireBreath := SFireBreath + 1` without an existence gate, so
    // combat-cast Flame Blade creates a strength-1 Fire Breath on a unit that had none.
    if (warlordCombatFlameBlade && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'fire' };
    }
    // CreateUnit.CAS adds 2 without an existence gate, so the building creates this channel.
    if (dragonMound && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'fire' };
    }
    // `SETSTAT(U,SLightningBreath,1,GetStat(U,SThrown,1)+1)` then `SETSTAT(U,SThrown,1,0)`
    // (CreateUnit.CAS:294-299) assigns the independent Lightning Breath field and clears Thrown,
    // so the destination has to exist whether or not the unit owns a breath — and the emptied
    // Thrown field survives as the record's Thrown field rather than being spent (F90).
    if (lightningBladeAbil) {
      modernInputs.lightningBreath = { strength: 0, type: 'none' };
      if (!modernInputs.thrown) modernInputs.thrown = { strength: 0, type: 'none' };
    }
    // `SThrown := SThrown + SRanged` (UnitCalc.CAS:1499) has no existence gate either, so the
    // Thrown field has to exist for the positioned transfer to land on it. It is seeded empty
    // and typeless: nothing before `UnitCalc.CAS:1490` may see a Thrown channel that the
    // transfer has not yet created, and the step itself supplies the identity.
    if (blazeOfGloryActive && !modernInputs.thrown) {
      modernInputs.thrown = { strength: 0, type: 'none' };
    }
    // `BLAZETHROWN = GetStat(U,SRanged,0)` (UnitCalc.CAS:1494-1500) reads the Ranged *field*
    // with no type or strength gate, and the region-`c` writes it carries have none either:
    // `not Ismagicalranged(U.rangedtype)` passes on a zero ranged type, so Lionheart (`:1730`),
    // Discipline at level 3 (`:1554`) and the weapon material (`:651`) all land on `SRanged`
    // even where the unit owns no ranged attack. The field therefore has to exist for the
    // transfer to have something to move — the same reason the Thrown field is seeded above.
    if (blazeOfGloryActive && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: 'none' };
    }
    for (const [channelKey, attack] of Object.entries(modernInputs)) {
      const seeded = (channelKey === 'ranged' && focusMagicActive)
        || (channelKey === 'ranged' && blazeOfGloryActive)
        || (channelKey === 'ranged' && (marionetteOwned || marionetteStrayed))
        || (channelKey === 'fireBreath' && recordContext.ccFireBreathGranted)
        || (channelKey === 'fireBreath' && warlordCombatFlameBlade)
        || (channelKey === 'fireBreath' && dragonMound)
        || (channelKey === 'lightningBreath' && lightningBladeAbil);
      // A caller-supplied channel that names a projectile type is a record field that exists:
      // `UNITS.INI` ships `RangedType` without `Ranged` (Warlord [362] Wanderer), and the writes
      // that read the permanent type — `ApplyLevelBonus`'s ranged gate is
      // `BaseUnits[i].rangedtype > 0` with no strength test (Units.RecalculateUnits.pas:548-571)
      // — need the field present to land on. Only a typeless empty channel is dropped.
      // A channel the caller supplied states its type before the drop test reads it, so an
      // untyped or misspelled empty channel is rejected rather than filtered out (F181).
      if (attack) assertSlotAttackType(attack.type, `the ${channelKey} channel of modernAttacks`);
      const typedField = !!(attack && attack.type && attack.type !== 'none');
      if (!attack || (attack.strength <= 0 && channelKey !== 'thrown' && !seeded && !typedField)) continue;
      channelSlots.push({
        slotKey: channelKey, channelKey,
        strength: attack.strength, type: attack.type, baseAttacks: null,
      });
    }
  }
  const channelContexts = channelSlots.map(buildSlotContext);
  const derivationContexts = [recordContext, ...channelContexts];
  const strengthFields = derivationContexts.map(context => context.strengthField);
  const rangedTypeFields = derivationContexts.map(context => context.rangedTypeField);
  const thrownTypeFields = derivationContexts.map(context => context.thrownTypeField);

  // Each slot reads exactly one secondary To Hit modifier. The modern channels share the three
  // the record stores — `hitchanceranged`, `hitchancethrown` and the one `hitchancebreath` that
  // serves both breath strengths (Units.RecalculateUnits.pas:203-219) — so a gated writer decides
  // each of them once, from the channel's own type rather than from whichever channel the
  // derivation happens to be for. The DOS-shaped `shared` slot keeps its own `toHitRtb`.
  const SECONDARY_HIT_KINDS = ['ranged', 'thrown', 'breath'];
  const SECONDARY_HIT_FIELD_BY_KIND = {
    ranged: 'toHitRanged', thrown: 'toHitThrown', breath: 'toHitBreath',
  };
  const SHARED_HIT_FIELD = 'toHitRtb';
  recordContext.secondaryHitField = SHARED_HIT_FIELD;
  // Which of the three modifiers a modern channel reads is pure record structure: `SRanged`
  // reads `hitchanceranged`, `SThrown` reads `hitchancethrown`, and the two breath fields share
  // `hitchancebreath` (Units.RecalculateUnits.pas:203-219). Every conversion is a move between
  // those fields rather than a retype in place (F90), so no slot changes which modifier it reads
  // part-way through the walk.
  const CHANNEL_HIT_KIND = { ranged: 'ranged', thrown: 'thrown', fireBreath: 'breath',
    lightningBreath: 'breath' };
  for (const context of channelContexts) {
    context.secondaryHitField = SECONDARY_HIT_FIELD_BY_KIND[CHANNEL_HIT_KIND[context.channelKey]];
  }
  // What a writer declares is what attributes it to a channel (steps.js, STAT_CHANNEL_FIELDS),
  // so a write the engine makes for Ranged and Thrown alone names those two fields and no others.
  // A modern record carries all three, exactly as the engine's does, whether or not this unit
  // happens to own an attack of that kind — which is also what lets the card state a modifier for
  // a channel an effect has yet to create.
  const secondaryHitFieldsFor = kinds => [SHARED_HIT_FIELD,
    ...(isCoM2 ? kinds.map(kind => SECONDARY_HIT_FIELD_BY_KIND[kind]) : [])];
  const secondaryHitFields = secondaryHitFieldsFor(SECONDARY_HIT_KINDS);
  // The DOS-shaped shared slot keeps **one** threshold where the modern record keeps three, so
  // which half of a gated writer it consults is settled by what stands in the slot at that
  // writer's own position: a breath, Thrown, or a conventional ranged attack. An empty slot reads
  // the Ranged half — `SToRanged` is written with no presence gate (UnitCalc.CAS:326-328), so the
  // record holds that modifier on a unit with no secondary attack to spend it on.
  //
  // The one thing this projection cannot read from the record in front of it: the Shadow Strike
  // grant creates a Thrown attack in region `d`, and the ungated Thrown thresholds are written
  // back in `c`. With three fields the engine simply accumulates both and the surviving attack
  // reads its own; with one field the projection has to know which attack it will be carrying.
  // That is an input fact — which secondary attack the unit ends up with — not a prediction of
  // any step's arithmetic.
  const secondaryHitTargets = secondaryHitFields.map(field => ({
    field,
    kindAt: field === SHARED_HIT_FIELD
      ? (u => (slotHasBreath(u, recordContext) ? 'breath'
        : slotHasThrown(u, recordContext) ? 'thrown'
          : (shadowStrikeActive && isThrownFieldSlot(u, recordContext)) ? 'thrown' : 'ranged'))
      : () => SECONDARY_HIT_KINDS.find(kind => SECONDARY_HIT_FIELD_BY_KIND[kind] === field),
    contexts: derivationContexts.filter(context => context.secondaryHitField === field),
  }));

  // Which slot holds the record's **Ranged** field is record structure, not a choice: in
  // `Caster.exe` it is `SRanged`, the modern record's own `ranged` channel, and in the DOS
  // engines it is the shared slot, whose one value stands for Ranged only while its permanent
  // type is a conventional ranged one. The two `CreateUnit.CAS` city gates below read that
  // field on the permanent record, so they resolve it here rather than from the modern card's
  // shared projection, which `Caster.exe` has no field for at all (F127). A modern record with
  // no Ranged field has nothing for either gate to read, which a null context is.
  const rangedFieldContext = isCoM2
    ? (channelContexts.find(context => context.channelKey === 'ranged') || null)
    : recordContext;
  // Alumni of Academy is a permanent +2-figure write made when a unit is trained —
  // `PROVENANCE[alumniOfAcademy:figures]` (`stats.js`, the figure sequence below), from
  // `CreateUnit.CAS` and `OverlandEndTurn.CAS`. Academy is
  // Halfling-only, so the condition is race-gated; the script admits Halfling Rocs (type 221,
  // their Fantastic Stable unit) unconditionally, and that branch reads no field, so it survives
  // a record with no Ranged field. The other branch rejects Mechanical units and reads the field
  // (`permanentMagicalRangedField` above).
  // `GetStat(U,SCustomAttribute,1)<>1` (`CreateUnit.CAS:465`, `OverlandEndTurn.CAS:606`) is the
  // permanent record at a training-time rank, so it takes the raw flag, not the value Rebuild's
  // cast-time write leaves: `base:alumniOfAcademy:figures` is a training-time write and
  // `base:rebuild`, the only mid-sequence write to `mechanical`, is cast-time and therefore
  // strictly later (F208, F202). The figure sequence is its own record and no write in it
  // reaches `mechanical`, so a record field here would restate this constant, not position it.
  const alumniOfAcademy = isWarlord && !!abilities.alumniOfAcademy
    && baseUnitRace === 'Halfling' && !isHero
    && (unitName.endsWith('Rocs')
      || (!abilities.mechanical
        && !!rangedFieldContext && rangedFieldContext.permanentMagicalRangedField));
  // The record-level half of the same gate the slot contexts assemble above; why both ability
  // terms stay pre-sequence constants is stated there (F202).
  const energyCannon = isWarlord && !!abilities.energyBeamWeapons && !!abilities.powerEngine
    && !!rangedFieldContext && rangedFieldContext.hasPermanentRangedStat;
  // `UnitCalc.CAS:1435-1443` reads the unit's To-Hit plus its **Ranged** To-Hit, which is the
  // record field `hitchanceranged` — the modifier the Ranged field is read with, and therefore
  // the one belonging to the slot that holds it. Reading the shared slot's `toHitRtb` answered
  // from the DOS record instead (F127). Only meaningful where `energyCannon` gates the step on.
  const energyCannonHitField = (rangedFieldContext || recordContext).secondaryHitField;

  // Every ability write this merge used to make is a positioned step now, and what is left is the
  // finished-record projection `SPEC.md`, *The step model* blesses: the record the recalculation
  // **leaves**, which combat resolution is handed and which no block reads at a position.
  //
  // The grants that left: `base:altarOfTheMoon` (Rage, Poison Immunity, and the
  // Hunter/Witchdoctor poison and Life Steal branches), `base:militaryWorkshop` (Blackpowder, its
  // poison increment and Armor Piercing), `base:motherFungus` and `d:venom` (their own poison
  // increments), `base:energyCannon`, `b:bombsGrenades` and `d:blazeOfGlory` (both Wall Crusher,
  // F206 for the second; Armor Piercing; First Strike clear) with stage 1; then `base:destiny`
  // (Supernatural) and `b:eyeOfHeaven` (True Sight) → `c:trueSight` (Illusion Immunity) with
  // stage 2; and last `base:rebuild` / `b:rebuild` (Mechanical) with F208, which was the only
  // one of the thirteen keys that moved a number. Each writes a `statRecord` field at its own
  // block's rank and is read back after the chain.
  //
  // The inert-Rust drop went with them, deleted rather than positioned: no engine block clears
  // `EncRust`, and the Fantastic exclusion it stood for is a cast-time *targeting* class, which
  // `rustActive` — `d:rust`'s own `when` — already carries at the one place `SPEC.md`, *The step
  // model* puts it. Nothing reads the published flag, so emission is a superset and the `when` is
  // the gate (`SPEC.md`, *Version scope*).
  //
  // Inner Power's suppression went the same way with F200's Insulation stage, but as a gate
  // rather than a drop: `c:innerPower` had no `when`, so suppressing the published key *was* the
  // eligibility test. The test is now the step's own, over the record `b:insulation` writes.
  const effectiveAbilities = {
    ...abilities,
    unitType: finishedUnitType,
    baseRace: identity.baseRace,
    baseFantastic: identity.baseFantastic,
    liveRace: finishedIdentity.race,
    liveFantastic: finishedIdentity.fantastic,
    doomGaze: baseDoomGazeStat,
    // Inner Power joins the three passthroughs below: `c:innerPower` carries the eligibility as
    // its own `when` now, reading `fireImmunity` and `lightningResist` off the record where its
    // block does, so the published key is the raw flag and the suppression that used to stand
    // here is gone (F200).
    innerPower: abilities.innerPower || false,
    mislead: abilities.mislead || false,
    // Supreme Light's own steps carry this same predicate as their `when`, so this is a published
    // normalization only, with no reader in `combat_*.js` — the class the inert-Rust drop
    // belonged to (F201 stage 2 filed it as F207 rather than folding a second published-value
    // change into this round).
    supremeLight: supremeLightActiveForUnit(abilities, finishedUnitType, version, {
      liveRangedType: recordContext.baseSequenceRangedType,
      baseRangedType: recordContext.rtbTypeRaw,
    }) ? abilities.supremeLight : false,
    survivalInstinct: abilities.survivalInstinct || false,
    landLinking: abilities.landLinking || false,
  };
  // The immunity set the recalculation leaves, and the only value `base:immunityCurseGating` reads
  // that is not a field of the record at its own position. The strip is artificial — no engine
  // makes the write (`SPEC.md`, *Deliberate deviations*) — so no source fixes its position
  // relative to a grant that writes one of these four, and taking the finished set is what makes
  // its answer independent of where such a grant lands (F199). Declared as a cross-boundary read
  // in `tools/unit_checks/identity_record_choice.js`, which halts on an undeclared occurrence.
  // `trueSight` and `eyeOfHeaven` are separate terms here rather than folded into
  // `illusionImmunity`, and that is what lets the implication between them be the positioned
  // write it is in every engine — `c:trueSight`, which cannot have run when this set is built
  // (F201). The strip's answer is the same either way, because `immunityStrippedCurses`
  // (`stats_identity.js`) tests all three.
  const finishedImmunities = {
    magicImmunity: !!effectiveAbilities.magicImmunity,
    illusionImmunity: !!effectiveAbilities.illusionImmunity,
    trueSight: !!effectiveAbilities.trueSight,
    eyeOfHeaven: !!effectiveAbilities.eyeOfHeaven,
  };
  // The ranged subformula remains an internal part of Rust's one atomic engine write; it is not
  // inserted into the execution list as a second step.
  // PROVENANCE[rust:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:10:98745d26b4fbf74694b1a932
  const rustRangedStep = statStep({ id: 'rust:ranged', phase: 'd', writes: strengthFields,
    when: () => rustActive,
    apply: u => {
      // -3 to a physical ranged field (missile/boulder), mirroring the -3 melee penalty in
      // combat_abilities.js. Magic ranged, both breaths and Thrown are excluded — Thrown is
      // eliminated entirely by the same step.
      for (const context of derivationContexts) {
        if (slotHasPhysicalRanged(u, context)) u[context.strengthField] -= 3;
      }
    } });
  // One step per ability or enchantment that writes a stat, at the position its engine region
  // gives it (combat_abilities.js, getAbilityStatSteps). Partitioned by phase in one pass so each group
  // can be spliced into the sequence below where that region runs.
  const abilSteps = getAbilityStatSteps(effectiveAbilities, version, {
    baseFantastic: identity.baseFantastic,
    // The two eligibility predicates whose block reads the *calculated* identity. They are
    // functions of the running record, so each answers at its own step's position rather than
    // deciding, before the sequence, whether the step exists at all (F163).
    misleadEligible,
    survivalInstinctEligible,
    // The hero flag itself, for the two blocks that test hero-ness rather than unit type
    // (Tactician's branch pair and Rebuild's phase choice). No conversion writes it, so it is
    // one value for the whole derivation and needs no position (F187).
    isHero: !!identity.isHero,
    combatSummoned: !!effectiveAbilities.combatSummoned,
    // The Outlander reform block's eligibility record: the gate of `b:battleArmor` and
    // `b:magitekEngine`, neither of which has an ability key any more (F198).
    outlanderReform,
    strengthFields,
  }).map(step => {
    if (step.id !== 'rust') return step;
    const legacyApply = step.apply;
    return {
      ...step,
      writes: ['atk', 'largeShield', ...strengthFields, ...thrownTypeFields],
      when: () => rustActive,
      apply: (u, context) => {
        legacyApply(u, context);
        rustRangedStep.apply(u, context);
        // `SETSTAT(U,ALargeShield,0,0)` (`UnitCalc.CAS:498`), the fourth line of the same block
        // and inside the same reviewed span. It is a positioned write because a later block
        // reads what it leaves: Fortification at `:1074` (F200).
        u.largeShield = false;
        // `SETSTAT(U,SThrown,0,0)` empties the Thrown *strength*; the type clear beside it is
        // this model's stand-in for the field being empty, since Warlord stores no Thrown type.
        // The strength write is load-bearing rather than cosmetic: Blaze of Glory's positioned
        // transfer adds the Ranged field onto whatever stands in Thrown at `UnitCalc.CAS:1490`,
        // and Rust (`:493`) runs first.
        for (const slot of derivationContexts) {
          if (u[slot.thrownTypeField] !== 'thrown') continue;
          u[slot.thrownTypeField] = 'none';
          u[slot.strengthField] = 0;
        }
      },
    };
  });
  // `cAfterWarp` is a second splice point inside region c, for the effects the engine writes
  // after its Warp Creature block — Tactician in every CoM engine, plus Supreme Light in CoM 1.
  // The addresses that fix that boundary are on `afterWarp` in `combat_abilities.js`: CoM 1
  // moved Warp to the front (0x907AA), while CoM2/Warlord run it late (+0x0BA3C) with only
  // Tactician (+0x0C890) after it.
  const abilByPhase = {
    base: [], a: [], b: [], cBeforeHolyArmor: [], c: [], cAfterWarp: [], d: [], e: [],
  };
  for (const step of abilSteps) {
    const group = step.afterWarp ? 'cAfterWarp'
      : (step.beforeHolyArmor ? 'cBeforeHolyArmor' : step.phase);
    abilByPhase[group].push(step);
  }

  // The two gaze strengths live in the same `.ranged` slot as the DOS `rtb` value — a gaze is a
  // `ranged_type` of 103/104/105 on the one shared field (`unitcalc.c`, `RAT_STONING_GAZE`
  // /`RAT_MULTIPLE_GAZE`/`RAT_DEATH_GAZE`) — so they are fields of the same record and are
  // written by the same steps, with the narrower set of modifiers a gaze takes: the ability lump,
  // node aura, Darkness/True Light, Chaos Surge and their own level ladder, but no weapon, no
  // per-attack-type ranged bonus, and no Shatter.
  const baseGazeRanged = gazeDisabled ? 0 : recordContext.dosGazeStrength;
  // DOS type 104 uses the shared strength as Doom Gaze damage — Automatic Damage assigns
  // `hits = attack_strength` and jumps past both rolls (0x9A1E6 -> 0x9A204), as the gaze
  // distribution in `combat_special_attacks.js` records. The modern engines instead carry an
  // independent Doom Gaze field.
  const baseDoomGaze = gazeDisabled ? 0
    : (!isCoM2 && recordContext.gazeType === 'gaze_multiple'
      ? recordContext.calcBaseRtb : (effectiveAbilities.doomGaze || 0));
  // Whether a gaze *stands in* the record, which is not the same question as what strength it
  // carries. In the DOS record one `.ranged` byte holds conventional ranged, Thrown, Breath or a
  // gaze, and what says a gaze stands there is the record's **type** — RAT 103/104/105 — not the
  // strength beside it: CoM 6.08's Gorgons ship `"ranged_type": "Gaze(Stoning)"` at `"ranged": 0`
  // (`Unit rosters/CoM 6.08 unit data.json`) and have the gaze, with only its hidden conventional
  // component empty — the same roster entry carries `"ranged": 1` in both MoM builds. So the
  // region-`e` floor asks the type, and the seeded
  // strength decides nothing (F122). The modern engines carry an independent Doom Gaze field with
  // no type of its own, so no such slot question exists there — and their tail makes no Doom Gaze
  // write at all, its floor list being Defense, melee, Ranged, Thrown and the two Breaths
  // (Units.RecalculateUnits.pas:2482-2487). `hasDoomGazeSlot` is therefore a DOS fact; the modern
  // arm of the floor answers only Eye of Heaven's zeroing (F174).
  const hasGazeRangedSlot = !gazeDisabled
    && (recordContext.gazeType === 'gaze_stoning' || recordContext.gazeType === 'gaze_death')
    && !isCoM2;
  const hasDoomGazeSlot = !gazeDisabled
    && ((!isCoM2 && recordContext.gazeType === 'gaze_multiple')
      || baseDoomGazeStat > 0);
  const doomGazeFloorKeeps = isCoM2 ? !gazeDisabled : hasDoomGazeSlot;
  // Focus Magic's ranged branch reads the record's Thrown field and writes its Ranged one, so the
  // two ends of `U.ranged := U.thrown` (Units.RecalculateUnits.pas:885-891) are slot identities.
  // The DOS-shaped shared slot is both at
  // once, which is why the branch is a retype in place there; a modern record with no Thrown
  // field has no `U.thrown` to read, which a null source is.
  const focusMagicBranchSlots = [{ target: recordContext, source: recordContext }];
  if (channelContexts.length) {
    const rangedChannel = channelContexts.find(context => context.channelKey === 'ranged');
    if (rangedChannel) {
      focusMagicBranchSlots.push({
        target: rangedChannel,
        source: channelContexts.find(context => context.channelKey === 'thrown') || null,
      });
    }
  }
  // `SETSTAT(U,SLightningBreath,1,GetStat(U,SThrown,1)+1)` then `SETSTAT(U,SThrown,1,0)`
  // (CreateUnit.CAS:294-299) is a move out of the record's Thrown field, so its two ends are slot
  // identities: the modern record's Lightning Breath and Thrown channels. `lightningBladeAbil` is
  // Warlord-only and seeds the destination channel above, so both ends always exist.
  const lightningBladeSlots = [];
  if (lightningBladeAbil) {
    const breathChannel = channelContexts.find(c => c.channelKey === 'lightningBreath');
    lightningBladeSlots.push({ target: breathChannel,
      source: channelContexts.find(c => c.channelKey === 'thrown') || breathChannel });
  }
  // Chaos Channels' admission gate is the permanent record; whether the slot is free for the
  // write is the block's own live read.
  const ccGrantsThisSlot = (u, context) => context.ccFireBreathGranted && context.ccOwnsThisSlot
    && (ccIndependentChannels ? u[context.rangedTypeField] === 'none'
      : context.ccDosBreathEligible);
  const warlordFlameBladeOwnsSlot = (u, context) => warlordCombatFlameBlade
    && (context.channelKey ? context.channelKey === 'fireBreath'
      : u[context.thrownTypeField] === 'fire');
  // Supreme Light's eligibility is a live read of the record's ranged type at the block's own
  // position — region `e` in CoM2/Warlord, after CoM 1's Warp block in CoM 1. The write is
  // `PROVENANCE[supremeLight]` (`stats_sequence.js`).
  const supremeLightEligibleAt = (u, context) => supremeLightActiveForUnit(
    abilities, unitTypeAt(u), version,
    { liveRangedType: u[context.rangedTypeField], baseRangedType: context.rtbTypeRaw });
  // Heavenly Light's material tail and Holy Weapon write the same two secondary thresholds, on
  // the same two gates, so one factory states both (stats_sequence.js).
  //
  // CoM 1 admits the same two type sets — `bu->ranged_type == RAT_THROWN ||
  // bu->ranged_type < RAT_MAGIC_FIRST`, which is Thrown plus Missile and Boulder — but puts the
  // whole write inside `if (bu->ranged > 0)` (com1:0x90609), so its Thrown half carries the
  // strength gate the modern `Inc(U.hitchancethrown, 10)` does not.
  const heavenlyLightHitPick = isCoM1
    ? (u, context, kind) => {
      if (!heavenlyLightMaterialTail || u[context.strengthField] <= 0) return 0;
      if (kind === 'thrown') return 10;
      if (kind === 'ranged') return isNonMagicalRangedFieldSlot(u, context) ? 10 : 0;
      return 0;
    }
    : makeSecondaryHitPick(heavenlyLightMaterialTail, heavenlyLightThrownToHit);
  const holyWeaponHitPick = makeSecondaryHitPick(hwActive,
    hwActive && version !== 'mom_1.31' ? 10 : 0);
  const hasPermanentRangedStat = recordContext.hasPermanentRangedStat;

  // --- Steps spliced into the sequence (R1) at more than one position ---
  // Built here rather than in stats_sequence.js because each reads the locals above; the
  // sequence itself, and what its ordering means, is stats_sequence.js.
  // DOS applies material strength and chance before BU_Apply_Specials (and therefore before
  // CoM 1 Focus Magic). Modern Caster calls ApplyMagicWeapons later in region c. Reuse the same
  // atomic steps at those two version-exclusive splice points.
  //
  // `c:weapon`'s To Hit half and the two To Hit tails below decide each secondary modifier from
  // the channel that reads it: Units.RecalculateUnits.pas:639-662 gates `hitchanceranged` on the
  // current `rangedtype` and `hitchancethrown` on the current Thrown field, and :1451-1454 /
  // :1806-1809 do the same for Heavenly Light's material tail and Holy Weapon. Breath is
  // untouched by all three.
  let appliedRtbToHitWpn = 0;
  // The DOS material body admits Missile, Boulder and Thrown by type, without a strength test.
  // `Caster.exe` keeps the same no-strength gate for conventional non-magical ranged, but reads
  // its independent Thrown field at this position. Both are live reads of the record in front of
  // the step.
  //
  // CoM 1 alone wraps the whole secondary half — strength, display bonus and threshold — in
  // `if (!(ench_lo & UE_FOCUS_MAGIC))` (`unitcalc.c`, com1:0x8F095), so a Focus Magic unit takes
  // none of it even though the block runs before the conversion at com1:0x8F7E6 and the record
  // still carries the physical type here. The enchantment flag is what the engine tests, not the
  // type the conversion will later write.
  const materialSecondaryOpen = !(isCoM1 && focusMagicActive);
  const weaponHitRanged = (u, context) => (wpn.toHit !== 0 && materialSecondaryOpen
    && isNonMagicalRangedFieldSlot(u, context) ? wpn.toHit : 0);
  // `if Units[i].thrown > 0 then Inc(Units[i].hitchancethrown, …)`
  // (Units.RecalculateUnits.pas:660-662): the modern threshold is gated on the **calculated**
  // Thrown strength at this position, which by `c:weapon` has already seen region `b` and
  // `c:focusMagic`. The DOS body writes `ranged_tohit++` inside its one type-only gate
  // (`unitcalc.c`, 131:0x8F0DD) and makes no strength test at all.
  const weaponHitThrown = (u, context) => (wpn.toHit !== 0 && materialSecondaryOpen
    && slotHasThrown(u, context) && (!isCoM2 || u[context.strengthField] > 0) ? wpn.toHit : 0);
  const weaponHitWrite = (u, target) => {
    const kind = target.kindAt(u);
    for (const context of target.contexts) {
      if (!isCoM2) {
        const value = weaponHitRanged(u, context) + weaponHitThrown(u, context);
        if (value !== 0) return value;
        continue;
      }
      const value = kind === 'thrown' ? weaponHitThrown(u, context)
        : kind === 'ranged' ? weaponHitRanged(u, context) : 0;
      if (value !== 0) return value;
    }
    return 0;
  };
  // The melee half of the block is gated on a melee attack existing, in both engine families —
  // but each reads a different record, so the gate is one test over two records rather than one
  // value. DOS tests the **calculated** record in front of it: `if (bu->melee > 0)` wraps
  // `bu->melee += quality - 1`, `Gold_Melee` and `melee_tohit++` (`unitcalc.c`, 131:0x8F041,
  // 160:0x8F053, com1:0x8F03A). `ApplyMagicWeapons` tests the **permanent** one:
  // `if BaseUnits[i].attack > 0` wraps `hitchancemelee`, `attack` and `attackbonus`
  // (Units.RecalculateUnits.pas:637-642, $00598F43), under that file's own note that all
  // material-presence and melee-presence tests there read `BaseUnits`. The permanent record is
  // `runCtx.base`, not the card's input: `CreateUnit.CAS` writes melee into it before the
  // recalculation copies it, so a Warlord unit recruited Malnourished, or trained at a
  // Ludus/Agoge, a Coal site or an Altar of the Sun, enters `ApplyMagicWeapons` with a
  // `BaseUnits.attack` its card never stated. Defense is outside both gates in both engines,
  // which is why it stays unconditional below.
  const weaponMeleeOpen = (u, runCtx) => (isCoM2 ? runCtx.base.atk > 0 : u.atk > 0);
  // PROVENANCE[weapon]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:40:bc81a9f3b6ba3703d596d756 | Reference docs/DOS reconstructed/unitcalc.c@span:15:9b957c6ff1d6ae8d9afca04b | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:40:eae87788c081c49037f75656 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:2cc8f80e45e1482ee9229fd8 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:06ea8c358024e0163de78588 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
  // Both engines gate the whole material block on the material itself: `if EncMagic or
  // EncMithril or EncAdamant` at $00598D91, and `if (quality > 0)` over
  // `mutations & UM_WEAPON_QUALITY_MASK` in every DOS build. Everything inside is the
  // material's own magnitude, so a normal weapon is a block neither engine enters.
  const hasWeaponMaterial = weapon === 'magic' || weapon === 'mithril' || weapon === 'adamantium';
  const weaponStatSteps = [
    statStep({ id: 'weapon', phase: 'c',
      writes: ['def', 'atk', ...strengthFields,
        'toHitMelee', ...secondaryHitFieldsFor(['ranged', 'thrown'])],
      when: () => hasWeaponMaterial,
      apply: (u, runCtx) => {
        u.def += wpn.def;
        if (weaponMeleeOpen(u, runCtx)) u.atk += wpn.atk;
        // Ranged/Thrown/Breath strength. The modern `ranged` channel answers for `SRanged` even
        // while it is typeless, so the branch is chosen by which record field the slot is, not
        // by whether that field currently names an attack.
        //
        // `ApplyMagicWeapons` makes two independent writes here, and neither reads the slot's
        // *input* strength: `if not Ismagicalranged(U.rangedtype) then Inc(U.ranged, j)` has no
        // positive-strength gate at all (:651-653), and `if Units[i].thrown > 0 then
        // Inc(Units[i].thrown, j)` reads the **calculated** Thrown field at this position
        // (:660-663) — which by `c:weapon` has already seen region `b` and `c:focusMagic`.
        //
        // The DOS body is one type-only gate over Missile, Boulder and Thrown —
        // `RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE || RAT_CLASS_BOULDER ||
        // bu->ranged_type == RAT_THROWN` (`unitcalc.c`, 131:0x8F089/0x8F09C/0x8F0A4) — and its
        // three writes, `bu->ranged += quality - 1`, `Gold_Ranged` and `ranged_tohit++`, make no
        // strength test, so the calculator makes none either.
        // `materialSecondaryOpen` closes the secondary half alone. The melee To-Hit write below
        // is outside it, which is why this is a guard around the strength loop and not an early
        // return out of the block.
        if (materialSecondaryOpen) {
          for (const context of derivationContexts) {
            const isRangedField = (context.isCoM2 && context.channelKey === 'ranged')
              || u[context.rangedTypeField] !== 'none';
            if (isRangedField) {
              if (isNonMagicalRangedFieldSlot(u, context)) {
                u[context.strengthField] += wpn.atk;
              }
            } else if (u[context.thrownTypeField] !== 'none') {
              if (slotHasThrown(u, context)
                && (!isCoM2 || u[context.strengthField] > 0)) {
                u[context.strengthField] += wpn.atk;
              }
            }
          }
        }
        // The To-Hit writes belong to this same block, under the same gates. `ApplyMagicWeapons`
        // interleaves them per channel and does not even keep one order while doing it — melee is
        // To-Hit then strength ($00598F43, "Write order is To-Hit, strength, display bonus"),
        // ordinary ranged is strength then To-Hit ($0059910B), Thrown is To-Hit then strength
        // ($0059922B) — and the DOS body writes `bu->ranged += quality - 1`, `Gold_Ranged` and
        // `ranged_tohit++` inside its one type gate. The two field sets are disjoint and every
        // gate here is order-invariant (each strength write is a positive increment guarded by
        // the same positivity test it would be read through), so this block's position for them
        // is unobservable and they stay grouped rather than interleaved.
        if (wpn.toHit !== 0 && weaponMeleeOpen(u, runCtx)) {
          u.toHitMelee += wpn.toHit;
        }
        for (const target of secondaryHitTargets) {
          const value = weaponHitWrite(u, target);
          if (value === 0) continue;
          u[target.field] += value;
          if (target.field === recordContext.secondaryHitField) appliedRtbToHitWpn = value;
        }
      } }),
  ];

  // The compiled Weakness block writes the record's Ranged field and its Thrown field. Neither
  // `Dec(U.ranged, 3)` nor `Dec(U.thrown, 3)` carries a positivity or a type gate
  // (Units.RecalculateUnits.pas:2273-2279), so each reaches its field whether or not anything
  // stands in it; the negative holds until a later grant or transfer adds to it and the region-`e`
  // clamp settles the result. Which slot is the Ranged field and which is the Thrown field is
  // therefore the whole question in the CoM engines — a typeless `SRanged` is still `SRanged`
  // (F100). MoM's compiled block is narrower on the ranged half: Missile alone. Warlord's script
  // adds a Breath branch in region `d` that fires only where the compiled block made no write, so
  // both positions ask this same question of the record in front of them.
  const weaknessBinaryHits = (u, context) => {
    if (isCoMVersion) return isRangedFieldSlot(u, context) || isThrownFieldSlot(u, context);
    return u[context.rangedTypeField] === 'missile'
      || (isThrownFieldSlot(u, context) && version !== 'mom_1.31');
  };

  // CoM 1's Flame Blade write precedes its later Focus Magic conversion/minimum; the other
  // versions keep the established compiled position after it. That version difference is the
  // step's own position in each chain (`stats_manifests.js`), so the gate reads the record's
  // live type pair here rather than a version-selected copy of an earlier one.
  //
  // M4, resolved at R1 stage 9. The two sources fall in different regions — Fiery Fury in `b`
  // (UnitCalcPre.CAS:832-846), the blades in `c` — and do not stack, which the bucket model
  // could only express as a single `Math.max` booked whole to `c`. Two steps carry it now:
  // Fiery Fury writes its own bonus in `b`, and this step adds only the excess, so the total is
  // still the maximum of the two while each lands in its own region. What the excess is measured
  // against is the amount region `b` actually wrote, which `fieryFuryRtbWrite` below states once.
  //
  // One block, one step (M11/F92). Every engine's Flame Blade is a single compiled block
  // writing melee and secondary strength together — `unitcalc.c` 131:0x8F56E, com1:0x8F55C and
  // `$0059FE47..$005A00E7` — so the melee bonus and the attack-strength bonus are one write,
  // not two effects. The halves keep their own gates because the engine's are separate: melee
  // on a melee attack existing, each secondary slot on its own type test.
  // PROVENANCE[flameBlade]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:4:549122cfd5e672f77f13100e | Reference docs/DOS reconstructed/unitcalc.c@span:15:f6e8770f05c1d997df898eec | Reference docs/DOS reconstructed/unitcalc.c@span:13:bf6a11bc7e2e0a1492be8f9a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:98daf6b1cfd836c4a184f151 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:3:a6c1282e7bba499b7b5ef5f3 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:d7cdec7c168e641613b36c19
  // `b:fieryFury` (`UnitCalcPre.CAS:832-846`) adds 2 to a physical ranged or Thrown field. The
  // blade step below subtracts what that block wrote, so both ask the same live test — each at
  // its own position, which agree wherever the blade's own narrower gate fires.
  const fieryFuryRtbWrite = (u, context) => (ffRegularBonus
    && (slotHasPhysicalRanged(u, context) || slotHasThrown(u, context)) ? 2 : 0);
  // MoM's block adds 2 melee, the CoM engines' 3 (`MODDING.INI` FlameBladeAttackBonus).
  const bladeMeleeBonus = isCoMVersion ? 3 : 2;
  const flameBladeStep = statStep({
    id: 'flameBlade', phase: 'c', writes: ['atk', ...strengthFields],
    when: () => hasWarlordBlade || nonWarlordFlameBlade,
    // `runCtx`, not `context`: the loop below reuses that name for this file's per-channel
    // derivation context, while the runner passes the sequence context carrying `base`.
    apply: (u, runCtx) => {
      if (hasMeleeAttackAt(runCtx)) u.atk += bladeMeleeBonus;
      for (const context of derivationContexts) {
        const liveRangedType = u[context.rangedTypeField];
        const liveThrownType = u[context.thrownTypeField];
        let bladeRtb = 0;
        if (hasWarlordBlade) {
          if (liveRangedType === 'missile' || liveThrownType === 'thrown') bladeRtb = 2;
        } else if (fbAtkBonus > 0) {
          // MoM Flame Blade boosts missile and thrown; CoM 1's block nopped the Thrown test
          // (`unitcalc.c` com1:0x8F596-0x8F59B), so it boosts missile only — Warlord, handled
          // above, re-adds Thrown.
          const fbThrownEligible = !isCoMVersion;
          if (liveRangedType === 'missile' || (fbThrownEligible && liveThrownType === 'thrown')) {
            bladeRtb = fbAtkBonus;
          }
        }
        u[context.strengthField] += Math.max(0, bladeRtb - fieryFuryRtbWrite(u, context));
      }
    },
  });

  // Warlord True Light is its own UnitCalcPre.CAS block (:1507-1540), after Rally and before
  // Plague. The DOS builds execute their distinct True Light block after Prayer and before
  // Darkness in region c. Keep both as one atomic multi-field write at their engine phase.
  // PROVENANCE[trueLight]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:30:307377331fcb02be6a7a1275
  const makeTrueLightStep = phase => statStep({
    id: 'trueLight', sourceId: 'trueLight', sourceLabel: 'True Light', phase,
    writes: ['res', 'def', 'atk', ...strengthFields, 'gaze', 'doomGaze', 'toHit'],
    when: () => hasTrueLight,
    apply: u => {
      const bonus = trueLightBonuses(u);
      u.res += bonus; u.def += bonus;
      u.atk += bonus;
      for (const context of derivationContexts) {
        if (!isCoM2 || isConventionalRangedSlot(u, context)) {
          u[context.strengthField] += bonus;
        }
      }
      if (!isCoM2) {
        u.gaze += bonus; u.doomGaze += bonus;
      }
      // The Marionette's Sorcery ascension grants Illusion, so the malus reads the flag off the
      // record at this block's own position rather than as a pre-sequence constant (F202).
      if (isWarlord && !!u.illusion) u.toHit -= 10;
    },
  });
  const warlordTrueLightStep = makeTrueLightStep('b');
  const dosTrueLightStep = makeTrueLightStep('c');

  // The phase sections live in stats_sequence.js, cut at the region boundaries. Every value
  // they read is handed over explicitly, so a section states its own inputs instead of
  // depending on everything this function happens to have in scope.
  const rawStatSteps = buildRawStatSteps({
    abilByPhase, abilities, altarHunter, altarOfTheMoon, altarWitchdoctor,
    altarOfTheSun, altarOfTheSunHolyMother, armor, badMoonActive, baseDoomGaze, baseGazeRanged,
    baseToBlkMod, baseToHitMod, baseToHitRtbMod,
    baseHitChance, baseHitMelee, modernSecondaryHitMod,
    blazeOfGloryActive, bombsGrenadesActive,
    calcBaseAtk, calcBaseDef, calcBaseHP, calcBaseRes,
    ccFireBreathStrength, ccIndependentChannels,
    chaosSurgeCount, chaosSurgeMeleeBonus, chaosSurgeResBonus,
    chaosSurgeRtbBonus, charmOfLifeActive,
    channels: derivationContexts, recordContext, strengthFields, rangedTypeFields,
    thrownTypeFields, secondaryHitTargets, secondaryHitFields, secondaryHitFieldsFor,
    classicBerserk, colossalScaled, colossalStrength, com1DivineBarrierAura,
    com1GuidingBeaconAura, com1SoulLinkerAura, darkForceActive, darknessAtkBonus,
    darknessDefBonus, darknessResBonus, destinyActive, disciplineActive, disciplineAtkMod,
    disciplineDefMod, doomGazeLvlMod, dosTrueLightStep, dragonMound,
    enduranceActive, enduranceDefMod, enduranceHpMod, energyCannon, energyCannonHitField,
    baseFigs, ccGrantsThisSlot, eternalNightEnemyResPenalty, ffMeleeBonus, ffRegularBonus,
    lightningBladeSlots,
    fieryFuryRtbWrite, focusMagicBranchSlots, poxHostIsGoblin, shadowStrikeActive,
    soulFlayLevels, warlordFlameBladeOwnsSlot, weaknessBinaryHits, weaknessPenalty,
    flameBladeStep, focusMagicActive,
    gazeLvlMod, gazeWarpHalves, goblinPoxAtkMod, hasGazeRangedSlot, doomGazeFloorKeeps,
    blazingEyesActive,
    goblinPoxDefMod, goblinPoxResMod, godsPlayDicesResMod, goodMoonActive,
    greatUnbindingActive, hasDarkness, hasMeleeAttackAt,
    hasPermanentRangedStat, heavenlyLightActive, heavenlyLightMeleeToHitAt,
    heavenlyLightThrownToHit,
    holyArmorActive, hurricaneActive, hwMeleeToHit, identity,
    input, inputBaseAtk,
    isCoM1, isCoM2, isCoMVersion, isWarlord, landLinkingEligible, level, levelRank,
    lionheartHpMod,
    ludusAgoge, lvl,
    marionette, marionetteAttackBonus, marionetteDefenseBonus, marionetteOwned,
    marionetteStrayed,
    motherFungus,
    naturalSelectionCoal, naturalSelectionIron, naturalSelectionNightshade,
    naturalSelectionNightshadeCount, naturalSelectionPowerMinerals,
    naturalSelectionPowerMineralsCount,
    natureConjunctionActive, natureLinkActive, nodeAuraActive,
    orihalconActive, outlanderReform, outlanderRtbToHitBonus,
    pillarOfFaith, pillarOfFaithCount, plagueActive,
    poolOfRepentance, poxHostActive,
    realmWardActive, sanctaBasilica,
    soulFlayActive, soulFlayAtkMod, soulFlayDefMod, soulFlayResMod,
    heavenlyLightHitPick, holyWeaponHitPick, spellWardActive, supremeLightEligibleAt,
    survivalInstinctToBlkBonus, unitIsChaos,
    finishedUnitType,
    uphillBattleActive, vampirismActive,
    venomActive,
    version, vertigoBlockPenalty, vertigoHitPenalty, warlordBerserk,
    warlordCombatFlameBlade, warlordEternalNightActive, warlordTrueLightStep,
    warpRealityActive, weaponStatSteps, wofDefenderBonusActive,
    finishedImmunities,
  });
  // The raw assembly intentionally keeps the implementation fragments close to their formulas.
  // F20 performs one explicit manifest walk here so the executed list is source ordered, every
  // emitted b/c/d step is covered once, and each returned step carries its source position.
  // The canonical version scope (steps.js, STEP_VERSION_SCOPES) is applied first, for every
  // phase alike: this version's sequence is the writes this version's engine makes. That
  // subsumes the Warlord-hook filter this line used to carry — UnitCalcPre/UnitCalc steps are
  // scoped to Warlord, so the DOS and base-CoM2 sequences drop them along with every other
  // region's out-of-scope write.
  // The identity conversions join the same list: they are ordinary steps writing two ordinary
  // fields, filtered by the same version scope and ordered by the same chain (F163).
  const applicableRawStatSteps = filterStepsToVersionScope(
    [...rawStatSteps, ...identityConversions], version);
  const statSteps = orderStatStepsBySource(applicableRawStatSteps, statChain(version));
  // One calculated fact the derivation publishes as a **result field** rather than as a record
  // field, and which the engine writes at a position: `if U.Fantastic then
  // U.EnchantmentFlags[EncMagic] := True` at $005A1217, immediately before the Chaos Surge block
  // (F188). A fact the record does not carry cannot be read at its own step, so the identity is
  // *sampled* at the block's chain rank instead: immediately before the first step at or after
  // that rank, which is the instant the block itself would run at. Everything else that reads the
  // calculated identity does so from the record inside its own step. Warp Reality was the second
  // such sample, for an Immolation To Hit arm that had no source; F190 deleted the arm, and the
  // sample with it — Warp Reality's one surviving write is `c:warpReality`, an ordinary step that
  // reads the record at its own position.
  const identitySamples = new Map();
  const sampledStatSteps = (() => {
    const chain = statChain(version);
    const wrapped = new Map();
    for (const key of ['c:chaosSurge']) {
      const rank = chain.findIndex(entry => entry.key === key);
      // A key no chain entry names would sample silently at the wrong place.
      if (rank < 0) throw new Error(`deriveUnitStats: ${version} has no chain entry ${key}`);
      identitySamples.set(key, null);
      const step = statSteps.find(candidate => candidate.sourceOrder >= rank);
      if (!step) continue;
      if (!wrapped.has(step)) wrapped.set(step, []);
      wrapped.get(step).push(key);
    }
    return statSteps.map((step) => {
      const keys = wrapped.get(step);
      if (!keys) return step;
      const when = step.when;
      return { ...step,
        when: (u, runCtx) => {
          for (const key of keys) {
            if (identitySamples.get(key) === null) identitySamples.set(key, identityAt(u));
          }
          return when ? when(u, runCtx) : true;
        } };
    });
  })();
  // A sample whose rank no emitted step reaches is the finished record: nothing after that rank
  // writes anything, identity included.
  const identityAtRank = (key) => identitySamples.get(key) || finishedIdentity;
  // `slots` carries the gates that are **not** position-dependent, so a slot can hold them.
  // `melee` is the permanent record's `B.attack > 0`, which
  // the base phase settles, so it is the predicate over the run context rather than a boolean
  // (F133). `persistentRanged` is the aura pass's
  // `B.ranged > 0` (Units.RecalculateUnits.pas:2535, :2599): the **permanent** record's Ranged
  // field carrying strength, with no test of what type stands in it and none of what the
  // calculated record now holds. Which slot that field is, is record structure — the modern
  // `ranged` channel is `SRanged`; the DOS-shaped shared slot is the Ranged field only while its
  // permanent type is a conventional ranged one, since one value stands there for ranged,
  // Thrown, Breath or a gaze. `hasPermanentRangedStat` keeps its own narrower job: the
  // `CreateUnit.CAS` city gates, which do read a permanent ranged *type*.
  //
  // The secondary-strength gates `rtb`, `ranged` and `rangedOrThrown` are not here: they read
  // what stands in the slot, which is sequence state, so `slotGateAdmits` (combat_abilities.js)
  // resolves them against the record at each writing step's own position (M14).
  //
  // `lifeSteal` is on the record because Pneuma Field's `SETSTAT(U,AFLifeSteal,…)` is a write to
  // a unit field at a position, like any other. It is seeded from the effective ability set —
  // the Gnoll Witchdoctor altar grant included — since that is the value standing at region `d`.
  // Identity writes are calculated unit-stat outputs, not UI-control writes. Seed the ordered
  // stat trace with those applied live-field changes so the affected race/fantastic outputs have
  // one trace alongside the numeric stat sequence; no-op identity steps were already omitted by
  // runStatSteps.
  //
  // The two gaze strengths are no longer gates of their own. In the DOS engines they are *views*
  // of the shared `.ranged` byte, so whether a write reaches them is the writing block's own test
  // on that byte and nothing else — `slots.gaze`/`slots.doomGaze` were a second, static gate on
  // one engine field and are retired (F135). What survives is which mirrors of the byte the
  // **record** carries, which is the same type fact the region-`e` floor asks
  // (`hasGazeRangedSlot`/`hasDoomGazeSlot`, F122), and it belongs to the slot that holds the byte.
  // The modern engines' independent Doom Gaze field is not a slot gate either: it is a view of no
  // attack slot, and why no `addToSlot` write reaches it is stated there (F143).
  for (const context of derivationContexts) {
    context.slots = {
      melee: hasMeleeAttackAt,
      persistentRanged: context.isChannelSlot
        ? (context.channelKey === 'ranged' && context.baseStrength > 0)
        : context.hasPermanentRangedStat,
    };
    context.gazeMirrors = (context.isChannelSlot || isCoM2) ? []
      : [...(hasGazeRangedSlot ? ['gaze'] : []), ...(hasDoomGazeSlot ? ['doomGaze'] : [])];
  }
  const statTrace = [...basePreparationTrace];
  for (let traceOrder = 0; traceOrder < statTrace.length; traceOrder++) {
    statTrace[traceOrder].traceOrder = traceOrder;
  }
  const statExecutionLedger = createStatExecutionTraceLedger();
  const statRecord = { res: 0, def: 0, atk: 0, hp: 0, gaze: 0, doomGaze: 0,
    toHit: 30, toHitMelee: 0, toBlk: 30, energyCannonToHit: null,
    // The two ability fields that carry a value rather than a flag, seeded verbatim (F201).
    // `lifeSteal` is on the record because Pneuma Field's `SETSTAT(U,AFLifeSteal,…)` is a write to
    // a unit field at a position, like any other, and `poison` because four blocks in a row make
    // the script's `<>100` increment on it.
    ...Object.fromEntries(POSITIONED_GRANT_VALUE_WRITES
      .map(key => [key, effectiveAbilities[key]])),
    // The ten curse flags an immunity can block are record fields, so the artificial strip is a
    // positioned write and every curse gate is an ordinary read at its own step (F199). Seeded
    // from the effective ability set, which is the state the strip finds at the head of the chain.
    ...Object.fromEntries(MAGIC_IMMUNITY_GATED_CURSES
      .map(key => [key, !!effectiveAbilities[key]])),
    // The grantable ability keys some step reads, on the record for the same reason and seeded
    // the same way (F202). A grant hoist can write any of them, so a step that took one as a
    // pre-sequence constant would answer from the wrong position once [F200] gives that grant a
    // rank — which five of them already have, so the seed is the state the chain's head finds
    // rather than the value every reader takes.
    ...Object.fromEntries(POSITIONED_GRANT_FIELDS
      .map(key => [key, !!effectiveAbilities[key]])),
    // The keys a positioned grant step *writes*, seeded the same way. These are the ones no hoist
    // merges any more, so the record is their only carrier and `grantedAbilities` below reads
    // them back out for combat resolution (F200).
    ...Object.fromEntries(POSITIONED_GRANT_WRITES
      .map(key => [key, !!effectiveAbilities[key]])),
    // The calculated identity is part of the record, seeded from the permanent one. Every
    // conversion is a positioned write to these two fields (F163).
    race: identity.baseRace, fantastic: identity.baseFantastic };
  for (const context of derivationContexts) {
    statRecord[context.strengthField] = 0;
    statRecord[context.rangedTypeField] = 'none';
    statRecord[context.thrownTypeField] = 'none';
  }
  // Two record shapes: the modern engines separate Ranged, Thrown and Breath modifiers,
  // the DOS engines keep one shared secondary slot. See `secondaryHitTargets` above.
  for (const field of secondaryHitFields) statRecord[field] = 0;
  const statRunContext = { version,
    trace: statTrace,
    executionTrace: statExecutionLedger,
    assertExecutionTraceOrder: true,
    channels: derivationContexts,
    slots: recordContext.slots };
  const statUnit = runStatSteps(sampledStatSteps, statRecord, statRunContext);
  // Two claims this function makes before the sequence runs, both checkable once it has, and
  // both silent defects if they ever drift (`SPEC.md`, *Out-of-range values stop the run*).
  // (1) `finishedIdentity` is the record the recalculation leaves — the projection is exact
  // only while no conversion's gate reads a stat. (2) `permanentFantastic` is the permanent
  // record's Fantastic flag as the `base` phase leaves it, which is what the loadout and level
  // gates read at their own positions.
  if (statUnit.race !== finishedIdentity.race
      || !!statUnit.fantastic !== !!finishedIdentity.fantastic) {
    throw new Error(
      `deriveUnitStats: the identity projection disagrees with the sequence for ${version} `
      + `(projected ${finishedIdentity.race}/${finishedIdentity.fantastic}, `
      + `sequence ${statUnit.race}/${statUnit.fantastic}). A conversion whose gate reads a stat `
      + 'would break the projection targeting and the post-chain reads depend on.');
  }
  // The second claim is checked in the modern builds alone, which are the only ones the two
  // gates belong to and the only ones whose base phase writes the *permanent* identity.
  // CoM 1's three base-phase conversions — Zombies, Construct Catapult and the summon branch —
  // are creation-time writes to the *calculated* record that happen to sit in that phase, so
  // `ctx.base` there is not a statement about the permanent one. Nothing reads it.
  const baseRecord = statRunContext.base;
  if (isCoM2 && baseRecord && !!baseRecord.fantastic !== permanentFantastic) {
    throw new Error(
      `deriveUnitStats: the permanent Fantastic flag the base phase leaves (${baseRecord.fantastic}) `
      + `disagrees with the loadout and level gates' value (${permanentFantastic}) for ${version}.`);
  }
  const modernEncMagicIndependentOfMaterial = modernEncMagicOtherTerms
    || (version.startsWith('com2_') && !!identityAtRank('c:chaosSurge').fantastic);
  const modernEncMagic = modernEncMagicFromMaterial || modernEncMagicIndependentOfMaterial;
  identity.race = statUnit.race;
  identity.fantastic = !!statUnit.fantastic;
  const hp = statUnit.hp;
  const effectiveGazeRanged = statUnit.gaze;
  const effectiveDoomGaze = statUnit.doomGaze;
  const finalRangedType = statUnit[recordContext.rangedTypeField];
  const finalThrownType = statUnit[recordContext.thrownTypeField];
  // Psycho Force and Pneuma Field are steps in `d` — `UnitCalc.CAS:1413-1417` and `:1419-1425`,
  // on `PROVENANCE[psychoForce]` and `PROVENANCE[pneumaField]` (`stats_sequence.js`) — so their
  // reads of Resistance happen where the engine takes them. Warp Resist having zeroed Resistance
  // is supplied by construction, since `warpResist` is a step in `c`.
  // The curse flags combat resolution reads — Black Sleep, Temporal Twist, Vertigo and Mind Storm
  // among them — are record fields now, so the published set takes them from the record the
  // sequence leaves rather than from the pre-strip ability map (F199).
  const curseGatedAbilities = { ...effectiveAbilities,
    ...Object.fromEntries(MAGIC_IMMUNITY_GATED_CURSES.map(key => [key, statUnit[key]])) };
  // The building and enchantment ability grants that are positioned writes read back the same
  // way: the record is where Divine Protection's Death Immunity, Magitek Engine's and
  // Fortification's Large Shield, Fortification's Missile Immunity, Rust's clear of it and
  // Insulation's Fire Immunity, Lightning Resist and Cold Immunity live (F200), and where the
  // Altar of the Moon, Military Workshop, Mother Fungus, Venom, Energy Cannon, Bombs & Grenades
  // and Blaze of Glory ability writes live now (F201). So the published set takes all of them
  // from the record the sequence leaves.
  // A key the ability set never carried stays absent rather than being published as `false`:
  // absence and `false` are the same to every reader (`hasAbil`), and writing the whole list out
  // would put seventeen keys on every unit of all five versions to say nothing. So the record's
  // value is written back where it says something — the flag stands set, or the set already
  // stated it. The two value fields take the same rule against `null`, so a `poison` of 0 — the
  // Witchdoctor branch's spelling of the scripts' 100 sentinel — is published rather than
  // dropped.
  const grantedAbilities = { ...curseGatedAbilities };
  for (const key of POSITIONED_GRANT_WRITES) {
    if (statUnit[key] || key in curseGatedAbilities) grantedAbilities[key] = statUnit[key];
  }
  for (const key of POSITIONED_GRANT_VALUE_WRITES) {
    if (statUnit[key] != null || key in curseGatedAbilities) grantedAbilities[key] = statUnit[key];
  }
  const combatAbilitiesBase = combatDisciplineNegatesFirstStrike
    ? { ...grantedAbilities, negateFirstStrike: true }
    : grantedAbilities;
  // DOS Doom damage is the shared strength slot — `RAT_MULTIPLE_GAZE` is a `ranged_type`, not a
  // field of its own (`unitcalc.c`) — so the resolver's `doomGaze` value is the derived one. The
  // projection asks the same existence question the region-`e` floor asks (F122): a type-104
  // record at strength 0 an earlier step raised carries the raised value.
  const shapedGazeAbilities = !isCoM2 && hasDoomGazeSlot
    ? { ...combatAbilitiesBase, doomGaze: effectiveDoomGaze }
    : combatAbilitiesBase;
  let combatAbilities = gazeDisabled
    ? { ...shapedGazeAbilities, stoningGaze: null, deathGaze: null, doomGaze: 0 }
    : shapedGazeAbilities;
  // Rust's `SETSTAT(U,ALargeShield,0,0)` (`UnitCalc.CAS:498`) is a field of `d:rust` now, inside
  // that step's own reviewed span, so the clear happens at rank 130 rather than after the chain.
  // What that buys is the block 576 lines below it: `d:fortification` reads the calculated
  // `ALargeShield` the clear left and grants Large Shield back (F200).

  // Hierophany (Warlord Life uncommon combat curse): the landed curse strips the target's
  // immunities, Lightning Resist, Negate First Strike, Merging, and Teleporting. The latter two
  // are combat-damage-relevant because FirewallEffect reads their calculated values. The
  // half-Defense penalty is applied in the ordered record above, on `PROVENANCE[hierophany]`
  // (`stats_sequence.js`); the strip itself is `PROVENANCE[hierophanyAbilityStrip]`
  // (`stats_identity.js`). The calculator models only the landed outcome, so the strip is
  // unconditional when active.
  combatAbilities = applyHierophanyAbilityStrip(combatAbilities, isWarlord);

  // Compatibility breakdowns retained for the card. The authoritative values now come
  // directly from the ordered record above.
  const meleeToHitBonus = statUnit.toHit + statUnit.toHitMelee - 30
    - (isCoM2 ? baseHitChance + baseHitMelee : baseToHitMod);

  // Caster.exe does not clamp defendchance during recalculation; the `Random(100)` threshold
  // comparison naturally bounds the effective probability to 0..100. That projection is
  // `PROVENANCE[chance:toBlockProbabilityBound]` below, from `Combat.ResolutionHelpers.pas`.
  let toBlock = Math.max(0, Math.min(1, statUnit.toBlk / 100));
  if (energyCannon) {
    // UnitCalc.CAS:1435-1443 reads the unit's To-Hit + Ranged To-Hit
    // stats, capped at 100. Attack-distance and battlefield penalties are
    // applied later and do not change the permanent Destruction modifier.
    const destructionPenalty = Math.trunc(statUnit.energyCannonToHit / 15);
    // UnitCalc.CAS reads and writes AFDestruction record 3 (ranged). Keep that value
    // separate from a unit's general Destruction so melee and Thrown do not inherit the
    // Energy Cannon rider when combat normalization merges phase-specific flag records.
    const currentDestruction = combatAbilities.energyCannonDestruction;
    const energyDestruction = currentDestruction != null && currentDestruction <= 0
      ? currentDestruction - destructionPenalty
      : -destructionPenalty;
    combatAbilities = { ...combatAbilities, energyCannonDestruction: energyDestruction };
  }
  // Immolation To Hit: 30%, and no unit-side modifier reaches it, because the roll does not read
  // a unit field at all. Immolation is delivered by `DamageSpell`
  // (`Combat.ApplyAttack.pas:378-383`, `SImmolation = 99`), whose per-attack roll is
  // `AttackRoll(str, SpellTable[sp].hitchance)` at `$005C1696..$005C16FF`
  // (`Reference docs/Caster binary/Spells.DamageSpells.pas`) — the *spell table's* hitchance, not
  // `U.hitchance`. Spell 99 sets no `HitChance` in either `spells.ini` copy (CoM2 1.05.11 base
  // `:1899-1916`, Warlord 1.5.12.7 `:2218-2235`), and the file's own key list documents the
  // default: "HitChance - chance to hit, defaults to 30%" (base `:332`, Warlord `:614`).
  // The DOS engines reach the same answer through the neutral to-hit argument. `BU_ProcessAttack`
  // hands melee Immolation to `Apply_Battle_Unit_Damage_From_Spell` (the far target `0388:0039`,
  // `0x87036`; `Reference docs/DOS reconstructed/combat.c:2596`) — call sequences
  // 131:0x99D5E..0x99D70, 160:0x99D5E..0x99D70 and com1:0x99D50..0x99D70 — and that routine's
  // per-attack roll is `CMB_AttackRoll(attack_strength, 0)` at 131:0x87239, identical in all
  // three builds. The to-hit argument is a literal zero — the same argument an unmodified attack
  // passes, which is this calculator's 30% everywhere — so the attacker's `bu->tohit` is neither
  // passed nor read. Wall of Fire shares the routine and the literal.
  // So the unit-side To Hit writers stop at the melee/ranged/thrown/breath channels in every
  // version. Warp Reality is one of them — `Dec(U.hitchance,20)` and `bu->tohit -= 2` at
  // 131:0x9079D and com1:0x90502 — and its write is on the ordered stat record above, on
  // `PROVENANCE[warpReality]` (`stats_sequence.js`). F190 deleted the second copy of it that
  // used to be re-applied here.
  const toHitImmolation = 0.3;

  // Hurricane (Warlord Nature rare, global): tropical storm affecting both sides.
  // -20% To Hit for ranged/thrown attacks, -30% To Hit for breath attacks.
  // The persistent Hurricane channel write is already on the ordered stat record, on
  // `PROVENANCE[hurricane]` (`stats_sequence.js`).

  // Warlord True Light "interferes with illusions, causing non-wizard illusion units to suffer
  // -10% To-Hit" (`Unit rosters/Warlord mod unit data/HELP.TXT:3201`) — for all units regardless
  // of realm, and Warlord-only; MoM's block has no such clause.
  // The persistent True Light common write is already on the ordered stat record.

  // Vertigo: reflect the displayed penalty in the red To Hit / To Block numbers.
  // MoM:  -20% To Hit, -1 Defense (the defense die penalty is applied at `displayDef`).
  // CoM 1: -30% To Hit, -10% To Block.
  // CoM2/Warlord: -25% To Hit, -7% To Block — the compiled block reads -25/-7
  // (`Reference docs/Caster binary/CoM2 binary analysis.md`), not CoM 1's -30/-10.
  // The persistent Vertigo chance writes are already on the ordered stat record.

  // Every persistent stat and chance total is the ordered record's output. The remaining
  // chance work below is limited to later per-attack resolution modifiers.
  const finalAtk = statUnit.atk;
  const finalDef = statUnit.def;
  const finalRtb = statUnit[recordContext.strengthField];
  const finalRes = statUnit.res;
  // Berserk's persistent chance writes are already on the ordered stat record.

  // Conjuring Pact nausea (Warlord Conjurer retort): a non-fantastic unit struck by
  // Conjuring Pact suffers -10% To Hit and -10% To Defend for the rest of combat.
  // Only the ELSE arm is modelled here (the fantastic-creature taming branch is out of
  // scope), so the gate is Warlord and a non-Fantastic calculated record — heroes
  // included, the block carrying no hero test.
  // Nausea's persistent chance writes are already on the ordered stat record, on
  // `PROVENANCE[nausea]` (`stats_sequence.js`).

  // Plague (Warlord combat curse): −10% To-Hit on the cursed unit (the −3/−3/−6 stat
  // penalties are folded into atk/def/res above). Goblin Pox carries no To-Hit penalty.
  // Plague's persistent common chance write is already on the ordered stat record, on
  // `PROVENANCE[plague]` (`stats_sequence.js`).

  // Great Unbinding (Warlord Sorcery very rare global): −20% To-Hit and −20% To-Defend
  // on opponent fantastic creatures for the rest of battle (the −2 Resistance is folded
  // into res above). Only fantastic creatures are affected.
  // Great Unbinding's persistent common chance writes are already on the ordered record, on
  // `PROVENANCE[greatUnbinding]` (`stats_sequence.js`).

  const displayDef = (!!statUnit.vertigo && !isCoMVersion) ? Math.max(0, finalDef - 1) : finalDef;

  // Chance trace. To Hit and To Block already execute on the authoritative ordered `statSteps`
  // record. Project those recorded deltas into a percentage-point resolution trace so every
  // displayed write keeps its source and running before/after value. One field per quantity:
  // the trace and the resolver read the same number, because nothing between recalculation and
  // the roll changes one without the other. One projection per derivation slot: each reads the
  // secondary modifier its own channel reads, which is what lets a single walk answer for the
  // shared slot and every modern channel alike.
  // The ledger's own accumulator names. `common` is the record's `hitchance` seen alone, which
  // is what the card's base To-Hit row shows; `melee` and `rtb` are resolved thresholds — the
  // common value plus the modifier the projection's context names — and only those two are what
  // AttackRoll compares, so only those two take the resolution-time bound below.
  const chanceFields = {
    common: 'toHitCommon', melee: 'toHitMelee', rtb: 'toHitRtb', block: 'toBlock',
  };
  const allHitFields = [chanceFields.melee, chanceFields.rtb];
  // Distance penalty (attacker ranged only). This is a resolution-time projection, not a
  // recalculation write, so it reads the **finished** record: the projectile type standing in
  // this slot's Ranged field after the whole sequence has run, rather than the type standing in it
  // at any writing step's own position. The separation is observable wherever a type write leaves
  // the attack live: `c:focusMagic` retypes a live missile in place to the IsMagic shot type
  // (`stats_sequence.js`), and `base:energyCannon` does the same for Warlord's Beam conversion, so
  // the finished field is neither missile nor boulder while the permanent one was — measured by
  // `focusMagicRetypeSkipsDistancePenaltyCoM2` against `distPenaltyCoM2_6`. Warlord's
  // `d:blazeOfGlory` is *not* one of those cases, though it also retypes: it empties the Ranged
  // field onto Thrown (`UnitCalc.CAS:1494-1500`), the finished record then carries no conventional
  // ranged attack at all, and the page withdraws ranged mode before this projection is reached
  // (`updateTypeVisibility`, `ui_abilities.js`), so the `!input.rangedCheck` line below answers
  // first and no type is read (F131).
  // This is a *type* read, not the field-identity question `isRangedFieldSlot` answers: the curve
  // itself differs between missile and boulder, and a Ranged field standing typeless is a field
  // with no projectile, so both tests have to come from the same finished type.
  const distancePenaltyFor = context => {
    if (prefix !== 'a' || !input.rangedCheck) return 0;
    const finishedRangedType = statUnit[context.rangedTypeField];
    if (finishedRangedType !== 'missile' && finishedRangedType !== 'boulder') return 0;
    const dist = Math.max(1, parseInt(input.rangedDist) || 1);
    return distancePenalty(dist, finishedRangedType, !!(abilities && abilities.longRange), version,
      isHero);
  };

  function buildChanceProjection(context) {
    const chanceTrace = [];
    const chanceContributions = [];
    let chanceSerial = 0;
    function addChanceContribution(id, source, phase, order, deltas, projectionOf) {
      if (!Object.values(deltas).some(value => value !== 0)) return;
      chanceContributions.push({
        id, source, phase, order, deltas, projectionOf, serial: chanceSerial++,
      });
    }
    function addChanceDelta(id, source, phase, order, fields, value) {
      const deltas = {};
      for (const field of fields) deltas[field] = value;
      addChanceContribution(id, source, phase, order, deltas);
    }

    for (const event of statTrace) {
      const deltas = {};
      const commonHitDelta = event.changes.toHit ? event.changes.toHit.delta : 0;
      const meleeHitDelta = commonHitDelta
        + (event.changes.toHitMelee ? event.changes.toHitMelee.delta : 0);
      const rtbHitDelta = commonHitDelta
        + (event.changes[context.secondaryHitField]
          ? event.changes[context.secondaryHitField].delta : 0);
      deltas[chanceFields.common] = commonHitDelta;
      deltas[chanceFields.melee] = meleeHitDelta;
      deltas[chanceFields.rtb] = rtbHitDelta;
      if (event.changes.toBlk) deltas[chanceFields.block] = event.changes.toBlk.delta;
      // `chance:` is this ledger's namespace and nothing else's: no stat step's id begins with
      // it (M13), so the projected id is mechanical and can never collide with the id of the
      // write it projects. Every entry produced here re-presents a stat write, so it also
      // carries that write's canonical scope key rather than claiming one of its own
      // (steps.js, `projectionOf`).
      const projectedId = event.id === 'trueLight' ? 'chance:trueLightIllusion'
        : `chance:${event.id}`;
      addChanceContribution(projectedId,
        event.source, event.phase, event.order, deltas, `${event.phase}:${event.id}`);
    }
    // PROVENANCE[chance:distancePenalty]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:28:4d6d2024c9551eae456f2bbf | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:21:b13db6265b2feaabf81fb261 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:6:791acb631b8f903c2812da35 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:6:791acb631b8f903c2812da35
    addChanceDelta('chance:distancePenalty', { id: 'distancePenalty', label: 'Range distance' },
      'attackSpecific', -100, [chanceFields.rtb], distancePenaltyFor(context));

    // Contribution order is the order the writes execute, in every version. A projection
    // re-presents the ordered ledger; it does not re-sequence it.
    // STAT-FORMULA[chance:dynamicProjection]
    // PROVENANCE[chance:dynamicProjection]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:8afd898f274ed76b7474ccfc | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:5d84b2c3857f747269473386 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:013e80fc5cd1dea733651726
    const chanceSteps = chanceContributions.map(item => statStep({
      id: item.id, sourceId: item.source.id, sourceLabel: item.source.label,
      phase: item.phase, writes: Object.keys(item.deltas),
      ...(item.projectionOf ? { projectionOf: item.projectionOf } : {}),
      apply: u => {
        for (const [field, value] of Object.entries(item.deltas)) u[field] += value;
      },
    }));
    chanceSteps.push(
      // AttackRoll floors To Hit at 10, then compares Random(100) directly with the supplied
      // threshold. The late aura pass can raise the already-clamped record above 100, and range
      // penalties are applied after recalculation, so project the actual comparison boundary here.
      // PROVENANCE[chance:attackRollProbabilityBound]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:9:a1152c71125049b18e8745a4
      statStep({ id: 'chance:attackRollProbabilityBound', sourceId: 'attackRoll',
        sourceLabel: 'Attack-roll threshold', phase: 'attackSpecific', writes: allHitFields,
        when: () => isCoM2, apply: u => {
          for (const field of allHitFields) u[field] = Math.max(10, Math.min(100, u[field]));
        } }),
      // DefenseRoll compares Random(100), whose output is 0..99, directly against the
      // signed record value. Project that comparison to the calculator's To-Block probability
      // without pretending Caster.exe wrote a region-e To-Defend clamp.
      // PROVENANCE[chance:toBlockProbabilityBound]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:12:08b392da258c1aa5831668e7
      statStep({ id: 'chance:toBlockProbabilityBound', sourceId: 'defenseRoll',
        sourceLabel: 'Defense-roll threshold', phase: 'attackSpecific', writes: [chanceFields.block],
        when: () => isCoM2, apply: u => {
          u[chanceFields.block] = Math.max(0, Math.min(100, u[chanceFields.block]));
        } }),
    );
    // Most of this sequence is projected from the stat ledger, so its entries inherit their
    // canonical scope from the step they project (steps.js, resolveStepVersionScope).
    const chanceUnit = runStatSteps(filterStepsToVersionScope(chanceSteps, version), {
      toHitCommon: 30, toHitMelee: 30, toHitRtb: 30, toBlock: 30,
    }, { version, trace: chanceTrace });
    return { chanceTrace, chanceUnit };
  }

  const recordChance = buildChanceProjection(recordContext);
  const chanceTrace = recordChance.chanceTrace;
  const chanceUnit = recordChance.chanceUnit;
  const rtbDistPenalty = distancePenaltyFor(recordContext);
  // One projection per **hitchance field**, not per output channel: `hitchancebreath` serves
  // both breath strengths (Units.RecalculateUnits.pas:203-219, the record's field list), so one
  // breath row answers for Fire and Lightning alike, and a field
  // the unit owns no attack for still resolves — the card states the modifier whether or not a
  // channel is standing in front of it. Only the conventional Ranged channel is charged a range
  // distance penalty, and that penalty reads the *finished* projectile type, so the ranged row
  // borrows that channel's own type field; a row with no such field is never a missile or a
  // boulder, which is what `distancePenaltyFor` asks.
  const modernHitFieldChance = {};
  if (isCoM2) {
    for (const kind of SECONDARY_HIT_KINDS) {
      const field = SECONDARY_HIT_FIELD_BY_KIND[kind];
      const owner = channelContexts.find(context => context.secondaryHitField === field);
      modernHitFieldChance[kind] = buildChanceProjection({
        secondaryHitField: field,
        rangedTypeField: kind === 'ranged' && owner ? owner.rangedTypeField : null,
      });
    }
  }
  const modernHitFieldTrace = kind => {
    const projected = modernHitFieldChance[kind];
    return projected ? projectStatTrace(projected.chanceTrace, chanceFields.rtb, 30,
      projected.chanceUnit.toHitRtb, { unit: 'percent' }) : undefined;
  };
  // These assignments make the traced execution path authoritative.  Focused tests assert
  // parity with the existing formulas across the full preset suite.
  const toHitMelee = chanceUnit.toHitMelee / 100;
  const toHitRtb = chanceUnit.toHitRtb / 100;
  toBlock = Math.max(0, Math.min(1, chanceUnit.toBlock / 100));

  const figureTrace = [];
  const figureSteps = [
    // PROVENANCE[altarOfTheSun:figures]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:12:08e36e60187df8bc650c42c7
    statStep({ id: 'altarOfTheSun:figures', sourceId: 'altarOfTheSun',
      sourceLabel: 'Altar of the Sun', phase: 'base', writes: ['figs'],
      when: () => altarOfTheSun, apply: u => { u.figs += 1; } }),
    // PROVENANCE[alumniOfAcademy:figures]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:10:848b52c34c24d8642625dae6 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:18:55478fbb88ad8926f0ce7c78
    statStep({ id: 'alumniOfAcademy:figures', sourceId: 'alumniOfAcademy',
      sourceLabel: 'Academy', phase: 'base', writes: ['figs'],
      when: () => alumniOfAcademy, apply: u => { u.figs += 2; } }),
  ];
  const figureUnit = runStatSteps(
    orderStatStepsBySource(filterStepsToVersionScope(figureSteps, version), statChain(version)),
    { figs: baseFigs }, { version, trace: figureTrace });

  const modifierTraces = {
    figures: projectStatTrace(figureTrace, 'figs', baseFigs, figureUnit.figs),
    melee: projectStatTrace(statTrace, 'atk', inputBaseAtk, finalAtk),
    sharedAttack: projectStatTrace(projectTraceToSlot(statTrace, 'shared'),
      recordContext.strengthField, recordContext.baseStrength, finalRtb),
    defense: projectStatTrace(statTrace, 'def', inputBaseDef, displayDef),
    resistance: projectStatTrace(statTrace, 'res', inputBaseRes, finalRes),
    hits: projectStatTrace(statTrace, 'hp', inputBaseHP, hp),
    gaze: projectStatTrace(statTrace, 'gaze', baseGazeRanged, effectiveGazeRanged),
    doomGaze: projectStatTrace(statTrace, 'doomGaze', baseDoomGaze, effectiveDoomGaze),
    toHitMelee: projectStatTrace(chanceTrace, chanceFields.melee, 30,
      chanceUnit.toHitMelee, { unit: 'percent' }),
    // `toHitShared` is the DOS engines' one shared secondary threshold. A version keeps only
    // the projections its record has, so a DOS result carries no modern channel row and a
    // modern result no empty one: the keys themselves say which record is in front of you.
    toHitShared: projectStatTrace(chanceTrace, chanceFields.rtb, 30,
      chanceUnit.toHitRtb, { unit: 'percent' }),
    // `toHitCommon` is the modern record's common field alone against 30; the three per-kind
    // rows are its own modifiers, each resolved against that common value.
    ...(isCoM2 ? {
      toHitCommon: projectStatTrace(chanceTrace, chanceFields.common, 30,
        chanceUnit.toHitCommon, { unit: 'percent' }),
      toHitRanged: modernHitFieldTrace('ranged'),
      toHitThrown: modernHitFieldTrace('thrown'),
      toHitBreath: modernHitFieldTrace('breath'),
    } : {}),
    toBlock: projectStatTrace(chanceTrace, chanceFields.block, 30,
      chanceUnit.toBlock, { unit: 'percent' }),
    // The conversions are steps of the one sequence, so their trace entries are in `statTrace`
    // beside every other write rather than in a pre-pass trace of their own (F163).
    race: projectStatTrace(statTrace, 'race', identity.baseRace, identity.race),
    fantastic: projectStatTrace(statTrace, 'fantastic',
      identity.baseFantastic, identity.fantastic),
    modernAttacks: {},
  };
  appendProjectedTraceEntry(modifierTraces.defense, {
    id: 'displayDefense:vertigo', sourceId: 'vertigo', sourceLabel: 'Vertigo',
    phase: 'attackSpecific', order: 0,
  }, finalDef, displayDef);

  const toHitMeleeHasModifiers = modifierTraces.toHitMelee.entries.length > 0;
  const toHitRtbHasModifiers = modifierTraces.toHitShared.entries.length > 0;
  const toBlockHasModifiers = modifierTraces.toBlock.entries.length > 0;

  const totalDamage = Math.max(0, parseInt(input.dmg) || 0);
  const carriesHealingState = true;
  const irrecoverableDamage = carriesHealingState
    ? Math.min(totalDamage, Math.max(0, parseInt(input.irrecoverableDamage) || 0)) : 0;
  const undeadDamage = carriesHealingState
    ? Math.min(totalDamage - irrecoverableDamage,
      Math.max(0, parseInt(input.undeadDamage) || 0)) : 0;
  const extraHitsCap = version === 'com_6.08' || version.startsWith('com2_') ? 90 : 255;
  const baseBonusHp = carriesHealingState
    ? Math.min(extraHitsCap, Math.max(0, parseInt(input.baseBonusHp) || 0)) : 0;
  const carriesModernHealingState = version.startsWith('com2_');
  const noHealing = carriesModernHealingState && (!!input.noHealing
    || hasAbil(combatAbilities, 'undead')
    || hasAbil(combatAbilities, 'animated')
    || hasAbil(combatAbilities, 'mysticSurge'));

  const result = {
    // Base values (for display)
    baseAtk: inputBaseAtk, baseRtb: inputBaseRtb, baseDef: inputBaseDef, baseRes: inputBaseRes, baseHP: inputBaseHP,
    baseToHitMod, baseToHitRtbMod, baseToBlkMod,
    // Bonus breakdown (for display)
    atkBonus: finalAtk - inputBaseAtk,
    rtbBonus: finalRtb - inputBaseRtb,
    defBonus: displayDef - inputBaseDef,
    resBonus: finalRes - inputBaseRes,
    hpBonus: hp - inputBaseHP,
    meleeToHitBonus,
    rtbToHitWpnBonus: appliedRtbToHitWpn,
    rtbToHitLvlBonus: lvl.toHit,
    rtbDistPenalty,
    toHitMeleeHasModifiers,
    toHitRtbHasModifiers,
    toBlockHasModifiers,
    // Effective values (for calculation)
    figs: figureUnit.figs,
    atk: finalAtk, def: finalDef, res: finalRes, hp, rtb: finalRtb, effectiveGazeRanged, effectiveDoomGaze, baseGazeRanged, baseDoomGaze, weapon: effectiveWeapon, unitType: finishedUnitType, isHero, generic: !!input.generic,
    encMagic: modernEncMagic,
    encMagicIndependentOfMaterial: modernEncMagicIndependentOfMaterial,
    baseDeathImmunity,
    identity,
    // The identity conversions no longer have a trace of their own: they are steps of the one
    // sequence, so `identityTrace` is the projection of `statTrace` onto the two identity fields.
    identityTrace: statTrace.filter(event => event.changes
      && ('race' in event.changes || 'fantastic' in event.changes)),
    statTrace,
    modifierTraces,
    dmg: totalDamage,
    totalDamage,
    irrecoverableDamage,
    undeadDamage,
    baseBonusHp,
    noHealing,
    rangedType: finalRangedType, thrownType: finalThrownType,
    cityWallBonus,
    wpn, lvl,
    // Display value: `resolveCombat` applies the Vertigo Defense die penalty itself, so the
    // card's number and the resolver's input are genuinely two quantities here.
    displayDef,
    toHitMelee, toHitRtb, toHitImmolation, toBlock,
    // Abilities (for combat flow modifiers)
    abilities: combatAbilities,
    // Informational spell/charge and grant package. Spellcasting itself remains outside
    // the one-round damage resolver, but callers and the UI state can inspect the exact choice.
    marionette,
  };
  // Keep the complete structural ledger available to direct callers and focused diagnostics,
  // but out of the enumerable combat payload. Matrix workers clone many derived records and do
  // not consume trace metadata; cloning the complete ledger there would turn a debug contract
  // into a UI performance cost.
  Object.defineProperty(result, 'statExecutionTrace', {
    enumerable: false,
    get: () => statExecutionLedger.materialize(),
  });

  // Modern units have four independent attack fields, all derived by the one walk above. The
  // assembly reads each slot's finished strength, type and To Hit out of that record and
  // projects the shared ledger onto it.
  if (isCoM2 && input.modernAttacks) {
    const channels = {};
    for (const context of channelContexts) {
      const strength = statUnit[context.strengthField];
      if (strength <= 0) continue;
      const slotRangedType = statUnit[context.rangedTypeField];
      const slotThrownType = statUnit[context.thrownTypeField];
      const outputKey = slotRangedType !== 'none' ? 'ranged'
        : slotThrownType === 'thrown' ? 'thrown'
        : slotThrownType === 'fire' ? 'fireBreath'
        : slotThrownType === 'lightning' ? 'lightningBreath'
        : null;
      // Rust can eliminate an existing Thrown field.  A channel with no resolved
      // attack type must not survive merely because it still has a positive stat value.
      if (!outputKey) continue;
      const slotTrace = projectTraceToSlot(statTrace, context.slotKey);
      const slotChance = buildChanceProjection(context);
      const channel = {
        baseStrength: context.baseStrength,
        strength,
        type: slotRangedType !== 'none' ? slotRangedType : slotThrownType,
        toHit: slotChance.chanceUnit.toHitRtb / 100,
        // Preserve the atomic channel execution log as well as its strength projection.
        // Type-only Focus conversions otherwise disappear from every exposed trace.
        statTrace: slotTrace,
        modifierTrace: projectStatTrace(slotTrace, context.strengthField,
          context.baseStrength, strength),
        toHitTrace: projectStatTrace(slotChance.chanceTrace, chanceFields.rtb, 30,
          slotChance.chanceUnit.toHitRtb, { unit: 'percent' }),
      };
      channels[outputKey] = channel;
      result.modifierTraces.modernAttacks[outputKey] = channel.modifierTrace;
    }
    result.modernAttacks = channels;
  }

  return result;
}
