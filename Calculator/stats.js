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
  // Lava Smelter is no longer among the transforms here: its five mineral-pair grants are
  // `training:lavaSmelter:*` steps writing the record at their own rank (`stats_identity.js`,
  // F244.3c), and the Outlander reform's four permanent grants left the same way (F244.3d).
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
    identity, suppliedAbilities, version);
  const marionette = marionetteDerivation.package;
  // There is no pre-sequence spelling of the permanent Fantastic flag any more. Every gate that
  // stands at or behind `a:baseCopy` reads it off `ctx.base` — `c:level:fantastic`
  // (`if B.Fantastic then U.level := 1`, $0059A118), Heavenly Light's material tail
  // (`not B.Fantastic and not B.ishero`, $0059E2B8), Breakthrough's normal package
  // ($005A376D), the three astronomical events, Wall of Fire's garrison bonus, Fiery Fury's two
  // arms and Soul Flay (F244.3h), and the Outlander reform's three region-`b`-or-later states
  // (F262) — and the two `training` loadout gates, which rank four phases ahead of the copy and
  // so have no `ctx.base` to ask, read the permanent flag as it stands at their own rank, which
  // is `identity.baseFantastic` (F262; `weaponEligibleAt` says why not the running record). The
  // former snapshot restated `buffs:destiny` and `buffs:spiritLink:fantastic` outside the chain
  // and needed a post-run assertion to keep it honest; both are gone.
  //
  // `destinyActive` survives it because `c:destiny`'s calculated package needs the mark itself.
  // It is read off the supplied abilities rather than the granted ones: `destinyActiveForUnit`
  // reads the `destiny` key alone, which no grant and no curse strip writes.
  const destinyActive = destinyActiveForUnit(suppliedAbilities, version);
  // The Outlander reform block's own eligibility gates, computed once and read by every step the
  // reform makes: the phase-`b` steps whose write the calculator used to reach through an invented
  // ability label (F198), the four `training` steps F244.3d positioned, and the
  // `training:temporalDrive` and three region-`d` `!COMBATOVERRIDE!` steps F244.3e did (F244.3e
  // also retired the last three invented labels — Psycho Force, Pneuma Field and Temporal Gravity
  // Drive are `reform` fields, not ability keys).
  // The transform grants nothing at all now — it strips the reform's derived output names from the
  // map and returns the record — which is why it is no longer named for grants and no longer one
  // of `ABILITY_ORIGIN_TRANSFORMS` (`stats_origins.js`). Lava Smelter's five mineral-pair writes
  // are `training:lavaSmelter:*` (`lavaSmelterGrantSteps`, `stats_identity.js`, F244.3c); the
  // reform's own eight permanent writes are `training:armorclad`, `training:powerEngine`,
  // `training:magitekScience`, `training:militaryDrilling` and `training:temporalDrive`'s three
  // fields; and Energy Weaponry's calculated-record write is `d:energyWeaponry`. The record rather
  // than this map is where all of them land.
  const outlanderDerivation = deriveOutlanderReformRecord(
    applyPillarOfFaithGrant(
      applySanctaBasilicaGrant(
        marionetteDerivation.abilities,
        version, isHero ? 'hero' : baseUnitType, baseUnitRace, unitName),
      version),
    version, isHero,
    // Spirit Link's cast also writes the Sapiens label, `SETSTAT(TU,SMultiLabel,1,14)`, under
    // the same gate as the Fantastic clear. The reform's `NOTSAPIENS` test reads that label
    // beside the permanent Fantastic flag, and the two can disagree once Destiny re-asserts the
    // flag, so it travels as its own term (F245). It is still a **pre-sequence** read, because
    // the Sapiens label is not a record field yet; **F263** makes it one and finishes the
    // migration this parameter is the last of.
    spiritLinkClearsPermanentFantastic(identity, suppliedAbilities, version));
  const outlanderReform = outlanderDerivation.reform;
  // The curse strip is no longer folded in here, and since F244.3b there is no strip at all: each
  // of the nine curse flags is a field of the sequence record written by its own
  // `debuffs:<curse>:cast` step, which the immunities standing on the record refuse (F199,
  // F244.3b). Since F244.3g the Marionette package grants nothing either — the strayed branch's
  // eight writes and the owned branch's thirty-one are positioned region-`b` steps — so the only
  // transforms still adding a key here are Sancta Basilica's and Pillar of Faith's.
  const abilities = outlanderDerivation.abilities;
  // The identity conversions are steps of the one sequence, spliced in below and ordered by the
  // execution chain like every other write, so `race` and `fantastic` are fields of the running
  // record and a gate reads whatever stands in them at its own position (F163). There is no
  // pre-pass and no fixed point handed to a gate; the three shapes a read can take are the live
  // record at the reading step (`unitTypeAt` and friends), the permanent record
  // (`identity.baseRace` / `identity.baseFantastic`, or the record `a:baseCopy` publishes, for a
  // permanent write the pipeline itself makes), and the record the recalculation *leaves*.
  const identityMeta = { isHero, name: unitName };
  const identityConversions = identityConversionSteps(identity, abilities, version, identityMeta);
  // There is no identity *projection* any more. `targetingIdentity` used to replay the conversion
  // list on a scratch record before the sequence, so that a read wanting the record the
  // recalculation leaves could be answered ahead of the run. F246 retired it by classifying every
  // consumer: a cast-time **targeting** gate reads the permanent record `a:baseCopy` publishes,
  // and a **combat-time** classification reads the record the run itself left, resolved below the
  // run from `statUnit`. Nothing needs the finished identity before the sequence has produced it.
  // The calculated identity as it stands at a step's own position. `u` is the sequence record,
  // which carries `race` and `fantastic` like any other field.
  const identityAt = u => ({ ...identity, race: u.race, fantastic: u.fantastic });
  const unitTypeAt = u => legacyUnitTypeFromLiveIdentity(identityAt(u));
  const unitRealmAt = u => realmOfUnitType(unitTypeAt(u), identityAt(u));
  // The Undead enchantment flag as the region-`b` `UnitCalcPre.CAS` blocks further down read it:
  // `GetEnchantmentFlag(U,EncUndead,0)`. It is a flag test, not a realm test, and it stands
  // beside the realm test rather than behind it — which is why those realm reads can move to
  // their own position without taking an Undead unit's swing away with them. The sources that
  // reach region `b` write the flag into the *permanent* aggregate, so it is already set there:
  // the casts write index 1 (`COSpell.CAS!POWEROFDEATH!-3 "SETENCHANTMENTFLAG(TU,EncUndead,1,1)"`
  // and `OLSpell.CAS!NOTVAMPIRISM!-5 "SETENCHANTMENTFLAG(TU,EncUndead,1,1)"`),
  // and Animate Dead's own block persists it there as well — `B.EnchantmentFlags[EncUndead] :=
  // True` at `$0059F7D8` (`Units.RecalculateUnits.pas`), which is the same pairing `c:undead`
  // already reads for its conversion. It is resolved here rather than beside that first consumer
  // because the realm-membership reader below starts from it.
  const undeadEnchantmentFlag = hasAbil(abilities, 'undead') || hasAbil(abilities, 'animated');
  // The same flag as the region-`c` classifier helpers read it, which is a later position and a
  // wider set. Three compiled blocks set `EncUndead` before the first helper call at $005A1274:
  // Blood Lust ($0059F600, which sets the flag and then writes `RCDeath` at $0059F68A), Animated
  // ($0059F7FC) and the shared Undead normalization ($0059FBF4) (`Q31.evidence.md`, *Why the
  // recovery clause exists*). Blood Lust is the one this adds, and it is base CoM2's alone:
  // Warlord's `UnitCalc.CAS` recasts the spell as Frenzy and sets `EncBloodLust` only afterwards,
  // so the compiled block never sees the flag there (`PROVENANCE[bloodLust]`,
  // `stats_identity.js`). Blood Lust is also the block Q31's ladder names as destroying a Chaos
  // Channels `RCChaos` write, so it is exactly what the recovery arm below exists to undo.
  //
  // Warlord's Vampirism and Revenant also write `EncUndead`, at index 1
  // (`UnitCalc.CAS!NOVAMPIRISM!-7 "SETENCHANTMENTFLAG(U,EncUndead,1,1)"`,
  // `COSpell.CAS~"IF (SP=SRevenant) THEN {"+1 "SETENCHANTMENTFLAG(TU,EncUndead,1,1)"`),
  // and are deliberately **not** folded in here:
  // `UnitCalcPre.CAS~"SPELLSTATE(W,SDeathMastery)=2"` spells `EncUndead`,
  // `EncRevenant` and `EncVampirism` as three separate disjuncts, so the script's own author does
  // not treat either as implying the flag at the position that block reads. The index-1 writes
  // argue the other way and the point is open, not settled here: deciding it would move Warlord's
  // Eternal Night and True Light as well, which is a correction with its own evidence rather than
  // part of F224.
  const encUndeadAtClassifier = undeadEnchantmentFlag
    || (isCoM2 && !version.startsWith('com2_warlord') && hasAbil(abilities, 'bloodLust'));
  // `ChaosChannel(u)` at $005950B4 is `EncCCArmor or EncCCFlight or EncCCBreath`
  // (`Q31.evidence.md`) — three enchantment flags and no realm term. Like `EncUndead` above it is
  // a flag read rather than a record read, so it has no chain position of its own. The same three
  // flags are written out at `greatUnbindingActive` below, for the same reason.
  const chaosChannelFlag = hasAbil(abilities, 'ccDefense')
    || hasAbil(abilities, 'ccFlight') || hasAbil(abilities, 'ccFireBreath');
  // Realm membership as a **set**, which is what the modern engine's two classifier helpers make
  // it. `race` is one scalar and holds only the last conversion the recalculation ladder made,
  // but `Caster.exe` classifies with two helpers that each recover a realm that scalar can no
  // longer state:
  //   `IsChaosUnit(u)` = `(race = RCChaos) or (ChaosChannel(u) and EncUndead)`   $00594FE4
  //   `IsDeathUnit(u)` = `(race = RCDeath) or (ChaosChannel(u) and EncUndead)`   $0059504C
  // (`Q31.evidence.md`). The second arm is the same expression in both, so a Chaos-Channelled
  // Undead unit answers True to *both* classifiers at once. No scalar can say that, and that is
  // why membership is a set here rather than one more spelling of `unitRealmAt` (F224).
  //
  // The set widens by exactly the two realms those two helpers name, and by nothing else. It is
  // deliberately not "every realm a later conversion overwrote": Life is overwritten by the same
  // ladder and no helper recovers it — Spell Ward's Life arm still compares `U.race` directly
  // (`Q31.evidence.md:171-172`) — so the recovery arm is a property of these two helpers, not of
  // conversion. Neither helper tests Fantastic, so neither does this.
  //
  // Modern only, and the version term sits here rather than at each consumer: the DOS engines
  // have no classifier at all and `unitcalc.c` spells every realm test `bu->race`.
  //
  // Only a consumer whose block *calls* one of the two helpers reads this; a block that compares
  // `U.race` keeps `unitRealmAt` and must not acquire the recovery arm.
  // `Reference docs/Modern realm test inventory.md` is the ruling table for which is which.
  const helperRealmRecovery = isCoM2 && chaosChannelFlag && encUndeadAtClassifier;
  const realmMembershipAt = (u) => {
    const realms = new Set();
    const scalar = unitRealmAt(u);
    if (scalar) realms.add(scalar);
    if (helperRealmRecovery) { realms.add('chaos'); realms.add('death'); }
    return realms;
  };
  // The two classifiers name two realms and no others, so this reader answers about two realms and
  // no others. A block testing any other realm compares `U.race` and reads `unitRealmAt`; routing
  // one through here would be the over-generalisation the inventory's Life case rules out, and a
  // misspelt token would answer False everywhere and leave the consumer silently inert, which is
  // the shape the fail-loud rule forbids (`SPEC.md`, *Out-of-range values stop the run*).
  const unitInRealmAt = (u, realm) => {
    if (realm !== 'chaos' && realm !== 'death') {
      throw new TypeError(
        `Realm membership was asked about ${JSON.stringify(realm)}. The engine's two classifiers `
        + 'name only chaos (IsChaosUnit, $00594FE4) and death (IsDeathUnit, $0059504C); every '
        + 'other realm test in the modern chain is a scalar U.race compare and reads unitRealmAt '
        + '(Reference docs/Modern realm test inventory.md).');
    }
    return realmMembershipAt(u).has(realm);
  };
  const marionetteOwned = !!(marionette && marionette.state === 'owned');
  const marionetteStrayed = !!(marionette && marionette.state === 'strayed');
  const marionetteAttackBonus = marionetteOwned ? marionette.attackBonus : 0;
  const marionetteDefenseBonus = marionetteOwned ? marionette.defenseBonus : 0;
  // What the *training city* leaves in the persistent Level field, which `training:veterancy` writes
  // and `c:level` reads back. The Fantastic term is the calculator's, not a block's: a fantastic
  // creature earns no veterancy, so no city ever writes it a level. The modern engines restate
  // the same rule inside the recalculation — `if B.Fantastic then U.level := 1` at $0059A118 —
  // and that read is the `c:level:fantastic` step, which is why this gate carries the term for
  // the DOS builds alone. Destiny's own `B.level := 1` ($0059A445) is `buffs:destiny:level`.
  // Spirit Link's Warlord widening used to be a third term here and was vacuous even then
  // (`isCoM2` already admits Warlord); it retired with F245, which took the permanent Fantastic
  // flag off the record instead.
  const trainingLevelEligible = isCoM2 || !isFantasticBase;
  const levelInput = trainingLevelEligible ? input.level : 'normal';
  const isWarlord = version.startsWith('com2_warlord');
  // One `flameBlade` input, two controls: the wizard spell everywhere but Warlord, the arcane
  // unit ability in Warlord (`enchantments.js`). The version decides which arithmetic the shared
  // block does, so the input carries no version of its own.
  const warlordCombatFlameBlade = isWarlord && !!abilities.flameBlade;
  // Altar of the Moon (Warlord, Gnoll building): Gnoll units trained here gain Rage and
  // Poison Immunity; ranged units also gain +2 Ranged Attack. The granted abilities are
  // folded into effectiveAbilities below; the ranged bonus is added to the rtb total.
  // Gated on the Gnoll race — non-Gnoll units and heroes gain nothing. What the building writes
  // is `PROVENANCE[altarOfTheMoon]` (`stats_sequence.js`), from `CreateUnit.CAS`.
  const altarOfTheMoon = isWarlord && !!abilities.altarOfTheMoon
    && baseUnitRace === 'Gnoll' && !isHero;
  // Unit-specific Altar of the Moon grants, two mutually exclusive `STypeID` branches
  // (`CreateUnit.CAS!NOALTAROFTHESUN!+12..+20 "IF (GetStat(U,STypeID,1)=210) THEN {" "}"`): 210 Hunters take `SETSTAT(U,AFPoison,1,2,1)`, and 203
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
  // The exclusion is a **targeting** restriction, not a term of the block. (a) The recalculation
  // block, `UnitCalc.CAS!NOTCITY!+10..+21 "unit loses 1/2 of melee/physical range/thrown strength :"`, is gated on `GETENCHANTMENTFLAG(U,EncRust,0)` alone and makes
  // no Fantastic test of either record, so there is no block term to position. (b) The helptext's
  // Target lines spell "regular", "Fantastic" and "non-hero" as three separate words — "enemy
  // regular non-hero unit" and "friendly non-hero regular unit" both occur — so "regular" is the
  // non-Fantastic class and a hero is targetable.
  //
  // (c) The record a targeting gate reads is the **permanent** one (`SPEC.md`, *Architecture*:
  // spell targeting is assumed to read the permanent (base) record). F183 read it at the record
  // the recalculation *leaves* instead, on Spirit Link's tail clear
  // (`UnitCalc.CAS!NOTICEAGE!+2..+3 ": Effect of Sentience, enchanted fantastic unit could not be targeted by fantastic-only spell and gain +2 resistance :" "IF GETENCHANTMENTFLAG(U,EncSpiritLink,1) THEN { SETSTAT(U,AFantastic,0,0); }"`), which reaches the same verdict for the case that
  // motivated it: F245 established that the *cast* clears the permanent flag as well
  // (`buffs:spiritLink:fantastic`), so a Spirit-Linked Fantastic unit is a legal Rust target on
  // either reading and `rustAppliesToSpiritLinkedFantasticWarlord` still pins 7. The two readings
  // part where a conversion writes the calculated record alone (Chaos Channels, Undead, Mystic
  // Surge, a clergy Sanctify) and where Destiny re-asserts the permanent flag behind Spirit
  // Link's cast; the permanent record is what the ruling takes (F246).
  //
  // **The record choice rests on the ruling, not on a read of the target-selection path.** No
  // reconstruction of Warlord's `SpellTypeGroup=16` dispatch exists yet, and the tail clear's own
  // comment says the *calculated* flag is what changes targetability — which is evidence pointing
  // the other way in exactly the Spirit-Link-plus-Destiny case where the two records disagree.
  // Reading that dispatch is a separate item; until it is read, the cases this gate moves are
  // ruled, not proven (F246 review, finding 1).
  //
  // One decision, read at four writes: this `d`-phase pair, the melee -3 in
  // `combat_abilities.js`, and `debuffs:rust:material` (`stats_sequence.js`). The first three
  // stand behind `a:baseCopy` and read `ctx.base`; `rust:material` stands ahead of it, where the
  // running record *is* the permanent one, so it reads that. No identity conversion ranks between
  // `debuffs:rust:material` and `a:baseCopy` in the Warlord chain, so the four answer alike.
  const permanentFantasticAt = (u, runCtx) => (runCtx && runCtx.base
    ? !!runCtx.base.fantastic : !!u.fantastic);
  const rustActiveAt = (u, runCtx) => version.startsWith('com2_warlord')
    && !!(abilities && abilities.rust) && !permanentFantasticAt(u, runCtx);
  // The material block has no Fantastic gate in either engine family: it reads
  // `_UNITS[si].mutations & UM_WEAPON_QUALITY_MASK` and nothing else (`unitcalc.c`,
  // 131:0x8F02A / com1:0x8F024). The `!isFantasticBase` term in `weaponEligibleAt` below is the
  // UI's — a fantastic
  // creature is never equipped — and Zombies is the one case where it is wrong, because a unit
  // raised as Zombies is a converted normal unit whose persistent mutations survive: CoM 1's
  // Zombies constructor patch writes `toblock` alone (`R6.1b.evidence.md`, com1:0x8EE28-0x8EE31).
  // So weapon eligibility gets a Zombies exception while armor and level stay fantastic-gated.
  // **CoM 1 alone**, which is what `specialUnit` already scopes. The conversion that leaves the
  // mutations in place is `UNIT(...)->type = UNITTYPE_ZOMBIES` at com1:0x9C460 (`combat.c`), and
  // its whole block is annotated `131:— 160:—`: MoM 1.31 and CP 1.60 have no such conversion.
  // CoM2 and Warlord summon Zombies instead — `SZombies` is a summon and the Warlord corpus makes
  // no `SETSTAT(…,STypeID,…)` write at all — so a summoned unit has no prior mutations to keep,
  // and Zombie Mastery there is a stat buff (`UnitCalcPre.CAS!NOTNATURELINK!+4 "IF (HASGLOBAL(W,GEZombieMastery)=0) THEN { GOTO"`), not a conversion. A
  // `unitName === 'Zombies'` term used to widen this to all five versions; it was a display string
  // standing in for the identity record, and no source supports the four it added (F203).
  //
  // The Fantastic term is the **permanent** flag as it stands at `training:weaponQuality`'s own
  // rank (F262). It used to be `!permanentFantastic`, an end-of-`buffs` snapshot answering a
  // creation-time question: the material is written once, by the training city, and the engines
  // only ever *read* the stored flag afterwards
  // (`BaseUnits[i].EnchantmentFlags[EncMagic] or EncMithril or EncAdamant` at $00598D91;
  // `_UNITS[si].mutations & UM_WEAPON_QUALITY_MASK` in the DOS builds). So a cast that changes the
  // permanent Fantastic flag later cannot equip or unequip the unit retroactively: Destiny's
  // `B.Fantastic := True` ($0059A390) clears no material flag and a Destiny'd normal unit keeps
  // what its city gave it, while a base-Fantastic unit had no city loadout to begin with and
  // Spirit Link's later `SETSTAT(TU,AFantastic,1,0)` does not hand it one.
  //
  // **Why `identity.baseFantastic` rather than the running `u.fantastic`.** A `training` step's
  // running record *is* the permanent record in four of the five chains — nothing writes
  // `fantastic` in their `template` phase past the seed — so there the two are the same read. In
  // **CoM 1** they are not: `template:constructCatapult` and `template:summonBranch`
  // (`stats_identity.js`) are creation-time writes to the *calculated* record that happen to sit
  // in that phase, and the engine makes the material read strictly ahead of them —
  // `Load_Battle_Unit` (`combat.c`, com1:0x75C8A) runs the quality read at com1:0x8F024 and
  // returns before the combat-summon path reaches `bu->Abilities |= UA_FANTASTIC` at
  // com1:0x75D6C. A CoM 1 combat summon therefore keeps a stored material, and reading the
  // running record here would have taken it away. This is the same value the file's two other
  // `training`-phase Fantastic gates read, `trainingLevelEligible` and `baseNormalTrainingUnit`
  // (F262 review, finding 1).
  const weaponEligibleAt = () => !isFantasticBase || identity.specialUnit === 'zombies';
  // CoM 1's Catapult constructor writes `_UNITS[si].mutations = 1` for type 0x25 with `wp == 9`
  // (com1:0x8EEA4-0x8EEAF), and the weapon-quality read at com1:0x8F024 re-reads the record, so
  // the unit takes quality 1 immediately (`Reference docs/DOS reconstructed/R6.1b.evidence.md`,
  // *CoM 1 has three unit-type constructor patches*). `wp == 9` is the combat-summoned Construct
  // Catapult path alone. That is a direct Magic Weapons write: it gives the Boulder channel +10%
  // To Hit and lets it bypass Weapon Immunity, while an ordinary Catapult remains a normal,
  // non-fantastic siege unit.
  const constructCatapult = isCoM1
    && isConstructCatapultUnit(identity, abilities, version, identityMeta);
  // What the *training city* leaves in the persistent weapon-quality field, which
  // `training:weaponQuality` writes onto the record. Construct Catapult's own constructor assigns
  // quality 1 outright, so its unit takes nothing from a city: it is a combat summon and has no
  // training site, and the assignment is `template:constructCatapult:weapon`'s.
  const weaponTrainingInputAt = () => (constructCatapult || !weaponEligibleAt()
    ? 'normal' : input.weapon);
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
  // What the training city leaves in the persistent armour-material field, which
  // `training:armorQuality` writes onto the record and `c:orihalcon` reads back. The `!isHero`
  // term is the control's, as the paragraph above says; the Fantastic term is the permanent flag
  // at the step's own `training` rank, for the reason `weaponEligibleAt` states (F262).
  const armorTrainingInputAt = () => (armorExists && !isFantasticBase && !isHero
    ? armorInput : 'normal');

  // Military Workshop (Warlord, XuanYuan building): upgrades any normal unit trained,
  // garrisoned in, or fighting from the city — not race-gated, per the "any defending units
  // of the city" + "base normal units" changelog wording. Heroes and fantastic creatures are
  // excluded, and Rocketry is an alternative cause of the same permanent Blackpowder upgrade,
  // which the scripts grant only to a normal unit that already has physical ranged, Thrown or
  // Fire Breath. What the upgrade then writes is `PROVENANCE[militaryWorkshop]`
  // (`training:militaryWorkshop`, `stats_sequence.js`) and the Blackpowder gate further down.
  //
  // The magnitudes are patch history, and the changelog in
  // `Reference docs/Warlord manual v1.5.12.9.html` is what records them: the missile-to-boulder
  // projectile upgrade is the original 1.5.4.1 effect; 1.5.7.4 replaced a flat +2 physical
  // ranged / +4 Thrown with Armor Piercing and raised Fire Breath from +2 to +4; 1.5.9.5 gave a
  // Doom attack that strength back rather than the Armor Piercing Doom already makes redundant.
  // Where changelog and script could disagree the script wins, and the step implements the
  // script.
  // Rocketry is one of the fifteen Outlander research states. Its ownership test used to be made
  // by deleting the key from the ability map for a non-Outlander wizard; it is an explicit term of
  // the reform record now, so the gate is visible where it is read (F244.3d).
  const blackpowderSource = isWarlord
    && (!!abilities.militaryWorkshop || !!outlanderReform.rocketry);
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
  // THEN { GOTO "NOTSAPIENS"; }` (`UnitCalcPre.CAS!NOMAGITEKENGINE!+2..+4 "IF (BASEFANTASTIC(U)>0)" "THEN { GOTO"`) — both terms read the **permanent**
  // record, so a combat conversion to Fantastic cannot close it. `BASEFANTASTIC(U)` is the base
  // unit data "before applying continuous effects such as buffs or curses"
  // (`Reference docs/Script source/CAS reference/Scripts.TXT:286`), which is the record the
  // permanent-record phases leave — Destiny's `B.Fantastic := True` at $0059A390 included, since that write
  // is to `BaseUnits` and persists into every later recalculation (F192). The same `NOTSAPIENS`
  // label also encloses Ballistics Training, Xenopsychology and Radio, which take the identical
  // gate through `outlanderSapiensAt` — one home for one script test (F198). That gate is read at
  // the asking step's own rank now, off `ctx.base`, rather than from a pre-sequence snapshot of
  // the same flag (F262); every step it gates is region `b`, so the copy has been published.
  const explosiveOwned = isWarlord && !!abilities.explosive;
  const explosiveEligibleAt = ctx => explosiveOwned
    && outlanderSapiensAt(ctx, outlanderReform);
  // The write's own gate, `IF (GETSTAT(U,SAttack,1)>0) %OR (GETSTAT(U,AFlying,1)>0)`
  // (`UnitCalcPre.CAS!NOMAGITEKENGINE!+8..+9 "IF (GETSTAT(U,SAttack,1)>0)" "%OR (GETSTAT(U,AFlying,1)>0)"`). Record selector `1` is "the base unit", not the calculated one
  // (`Reference docs/Script source/CAS reference/Scripts.TXT:270`), so both terms read the
  // **permanent** record — which is the record `a:baseCopy` publishes as `ctx.base`, not the
  // card's melee input: `buffs:rebuild` writes `SETSTAT(TU,SAttack,1,…+2)` (`OLSpell.CAS!NOTMARKOFCONQUEROR!+9 "SETSTAT(TU,SAttack,1,GETSTAT(TU,SAttack,1)+2);"`) and
  // `training:artificer` `+1` (`CreateUnit.CAS!NOLOGISTIC!+10 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1));"`), both permanently and both before region `b`, so a
  // unit whose roster melee is 0 can still satisfy this gate (F202).
  //
  // `AFlying` takes the same treatment as of F244.3e, and this is where the last of F209's four
  // rulings on the retired flag-versus-delta criterion fell. Only two lines in the corpus write it
  // at selector 1 — `CreateUnit.CAS!HASEVILPRESENCE!+77 "SETSTAT(U,AFlying,1,1);"` and `OverlandEndTurn.CAS!NOOUTLANDERUPGRADE!+7 "SETSTAT(U,AFlying,1,1);"`, the
  // Anti-Gravity Drive branch — and both are permanent writes carrying no stat delta, which is
  // exactly why F202 left the grant pre-sequence. F244 overturned that rule: the two lines are
  // `training:temporalDrive` (`combat_abilities.js`) now, and this gate reads the flag off the
  // record at its own rank, the selector-1 read the script makes. Every other `AFlying` write in
  // the corpus is selector 0, the calculated record this gate does not read.
  const bombsGrenadesActive = (u, ctx) => explosiveEligibleAt(ctx)
    && (ctx.base.atk > 0 || !!u.flying);
  // Whether the record carries a Thrown field at all is a structural question answered before the
  // sequence, so it takes the widest state in which this block can write one: both the write gate
  // above and the `NOTSAPIENS` gate are resolved at the step's own rank, and seeding a field is
  // not a write. It is a conservative structural superset, not the gate: the `NOTSAPIENS` term
  // left it with F262, when that term stopped having a pre-sequence answer, so what remains is
  // the ownership half, which no step can change. A seeded channel the step never writes reaches
  // nothing — `slotHasThrown` stays false until a step assigns the type, and the assembly drops
  // non-positive, unresolved channels (F262 review, finding 2).
  const bombsGrenadesCanWriteThrown = explosiveOwned;

  // Blazing Eyes' block ($005A1E16..$005A1F12) is region `c`, so its `IsChaosUnit` gate reads the
  // calculated record at that position. The write itself is
  // `c:blazingEyes` (`stats_sequence.js`), where the Doom Gaze field it conjures or raises is
  // read at the same position. Q31 settles what the gate computes: `IsChaosUnit` is
  // `(race = RCChaos) or (ChaosChannel(u) and EncUndead)` (`Q31.evidence.md`), which tests no
  // Fantastic flag and recovers the `RCChaos` a later Undead conversion overwrote. Both halves
  // are `unitInRealmAt`, the membership reader above: the compact `fantastic_chaos` token that
  // used to stand here was narrower on the Fantastic term and on the recovery arm alike, and
  // Chaos Surge and Warp Reality's exemption — the same helper over this same positional
  // identity — now spell the test the one way. `Reference docs/Modern realm test inventory.md`
  // rules this consumer H2, helper form (F224.2a).
  const blazingEyesActive = u => isCoM2 && !!abilities.blazingEyes
    && unitInRealmAt(u, 'chaos');
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
  // and Warlord's `UnitCalc.CAS!NOTCCBREATH!-5 "IF (GETENCHANTMENTFLAG(U,EncCCBreath,0)=0) THEN { GOTO"` touches only `SFireBreath` — neither clears a gaze,
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
  // `CreateUnit.CAS!NOBARAY!+10..+15 ": new effect of Altar of Storm, all units recruit from the city gains +1 lightning breath, if unit already have thrown then convert innate thrown to innate lightning breath :" "ENDOFUNIQUEBUILDING"`. Without Thrown it assigns strength 1 even beside another
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
      phase: 'template',
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
  // `PROVENANCE[shadowStrike:thrown]` (`stats_sequence.js`), from `UnitCalc.CAS!NOVAMPIRISM!+2..+6 ", gain thrown at strength half of its melee power :" "SETSTAT(U,SThrown,0,(GetStat(U,SThrown,0)+STRIKE));"`.
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
  // The transfer is `PROVENANCE[blazeOfGlory]` (`stats_sequence.js`), from `UnitCalc.CAS!IMMUNETOROT!+18 "BLAZETHROWN=GetStat(U,SRanged,0);"`.
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
  // The modern node block, $005A25F0..$005A273C (`Units.RecalculateUnits.pas`), is one `case`
  // over three realm arms, and the arms are not spelt alike: `1: U.race = 16` (Nature,
  // $005A26E9) and `2: U.race = 17` (Sorcery, $005A2721) compare the scalar, while
  // `3: IsChaosUnit(i)` ($005A272B) calls the classifier. So the Chaos arm alone reads the
  // membership set and can see the Chaos realm `c:undead` overwrote, and the other two keep the
  // scalar compare and must not gain the recovery arm. `Reference docs/Modern realm test
  // inventory.md` rules them H4 (Chaos) and S1, S2 (Nature, Sorcery) (F224.2b). The three DOS
  // builds spell every arm `bu->race` — `bu->race == rt_Chaos` at 131:0x8FF42 (`unitcalc.c`) —
  // and `unitInRealmAt` carries no recovery arm there, so they keep the plain compare.
  const nodeAuraActive = u => {
    if (nodeAuraVal === 'chaos') return unitInRealmAt(u, 'chaos');
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
  // selector is deliberate. The record the permanent-record phases leave is `ctx.base`, read at
  // each block's own region-`c` position (F244.3h), which is what separates this from
  // `identity.baseFantastic`: Destiny writes `B.Fantastic := True` at $0059A390 (F192) and
  // Spirit Link's cast clears the same flag ahead of the copy (F245).
  const badMoonActiveAt = runCtx => isCoM2 && !!abilities.badMoon && !runCtx.base.fantastic;
  const goodMoonActiveAt = runCtx => isCoM2 && !!abilities.goodMoon && !runCtx.base.fantastic;
  const natureConjunctionActiveAt = runCtx => isCoM2 && !!abilities.natureConjunction
    && !!runCtx.base.fantastic;
  // The ward block, $005A5D36..$005A607F, is a settlement-index guard over five realm arms and
  // nothing else: `U.race = 16` (Nature), `U.race = 19` (Life), `IsDeathUnit(i)`, `IsChaosUnit(i)`
  // and `U.race = 17` (Sorcery), each paired with its own city byte. No arm tests Fantastic, and
  // Q31 settles that the two classifiers do not either — `IsChaosUnit` is
  // `(race = RCChaos) or (ChaosChannel and EncUndead)` and `IsDeathUnit` its `RCDeath` twin
  // (`Q31.evidence.md`). So no arm carries a Fantastic condition, and the live-Fantastic term that
  // used to stand here excluded every unit the engine gives a realm without making it Fantastic —
  // a realm-tagged hero (Torin, Mortu, Ravashack, Everchosen, Avatar) and a Sanctified non-clergy
  // unit — and is gone (F195). Node Aura's block, $005A25F0, is the same shape and was corrected
  // the same way.
  //
  // The five arms are not spelt alike, and the split is per arm rather than per block: the
  // Death arm calls `IsDeathUnit(i)` at $005A5E0F and the Chaos arm `IsChaosUnit(i)` at
  // $005A5E51, so those two read the membership set and a Chaos-Channelled undead unit answers
  // both wards at once; Nature (`cmp race,$10` $005A5D68), Life (`cmp race,$13` $005A5DCC) and
  // Sorcery (`cmp race,$11` $005A5EB0) compare the scalar and keep `unitRealmAt`. Life is the
  // arm that shows the split is the binary's and not a rule about conversion: ladder block 5
  // overwrites Life just as later blocks overwrite Chaos, yet the Life arm stays a direct compare
  // (`Q31.evidence.md`, the ward table's loose end), so it must not gain the recovery arm.
  // `Reference docs/Modern realm test inventory.md` rules the arms H7, H8 and S4, S5, S6
  // (F224.2b).
  const spellWardArmMatches = u => (abilities.spellWard === 'death' || abilities.spellWard === 'chaos')
    ? unitInRealmAt(u, abilities.spellWard)
    : abilities.spellWard === unitRealmAt(u);
  const spellWardActive = u => !!(isCoM2
    && abilities.spellWard && abilities.spellWard !== 'none'
    && spellWardArmMatches(u));
  // CoM 1's ward keeps its Fantastic term, and not by omission: its own block
  // (`unitcalc.c:3966-3975`) requires a fantastic realm race and excludes the no-realm value,
  // which is a different test from the modern block above (F195).
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
  //
  // *Which* record answers `Chaos` is the membership reader's question, not this block's. The
  // modern block calls `IsChaosUnit(i)` at $005A1274, so a Chaos-Channelled Undead unit is Chaos
  // here through the helper's `ChaosChannel(u) and EncUndead` arm even though `c:undead`
  // overwrote the scalar the Chaos Channels step wrote. DOS has no helper and `unitInRealmAt`
  // carries no recovery arm there, so the three DOS builds keep the plain realm compare.
  // `Reference docs/Modern realm test inventory.md` rules this consumer H1 (F224.2a).
  const chaosSurgeCount = u => unitInRealmAt(u, 'chaos')
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
  // The Death test the two blocks below share. `Caster.exe` makes it through the classifier
  // helper rather than a `race` compare: Eternal Night's enemy-Resistance block
  // ($005A228C..$005A238A) gates on `not IsDeathUnit(i)` at $005A22D9, and Darkness's Death arm
  // ($005A4183..$005A4938) on `IsDeathUnit(i)` at $005A45EF — the same call the CoM2 Eternal
  // Night doubling loops inside (`Units.RecalculateUnits.pas:1928`, `:2201`). So both take the
  // membership reader, and with it the helper's `ChaosChannel(u) and EncUndead` arm. `EncUndead`
  // already implies the Undead normalization's own `RCDeath` write ($0059FC26), so that arm can
  // differ from the scalar in exactly one corner: a Chaos-Channelled Undead unit whose realm the
  // later No Heal block overwrote with `RCNoHeal` ($005A0472) — `c:noHealConversion` here —
  // which the scalar calls unaligned and the helper still calls Death.
  // The same unit without Chaos Channels stays outside: that is `BUG-Q31`, the missing
  // `EncUndead`-alone disjunct, reproduced as written (`Q31.evidence.md`, *`IsDeathUnit` — the
  // clone, and `BUG-Q31`*).
  //
  // The DOS half stays the scalar: CoM 1's Eternal Night block is `bu->race != rt_Death` at
  // com1:0x90B2A and its Darkness block `bu->race == rt_Death` at com1:0x908F0; the MoM builds'
  // is `bu->race == rt_Death` at 131:0x904EB (`unitcalc.c`). Those engines have no helper, so
  // there is no recovery arm to route. Darkness's Life arm is a `U.race = 19` compare in every
  // build and keeps `unitRealmAt` below; Warlord's Poor Vision and True Light blocks write out
  // `GetStat(U,SRace,0)` beside their own `EncUndead` term and are not this predicate.
  // `Reference docs/Modern realm test inventory.md` rules these H3 and H6 (F224.2c).
  const isDeathUnitAt = u => (isCoM2 ? unitInRealmAt(u, 'death') : unitRealmAt(u) === 'death');
  // Modern Eternal Night sets the Death-package loop count to two: any wizard holding
  // `GEEternalNight` raises `k` from 1 to 2 and the Death branch applies its attack/Defense
  // package `k` times, while the Life (race 19) branch and Resistance sit outside that loop and
  // run once (Units.RecalculateUnits.pas:2163-2185). DOS Darkness has no such multiplier.
  const darknessAtkDefMagnitude = u => hasDarkness
    ? (hasAnyEternalNight && isCoM2 && isDeathUnitAt(u) ? 2 : 1)
    : 0;
  const darknessResMagnitude = hasDarkness ? 1 : 0;
  const eternalNightEnemyResPenalty = u => enemyEternalNight && isCoMVersion
    && !isDeathUnitAt(u) ? -1 : 0;
  // Warlord Eternal Night ("Poor Vision"): "All non-Death creatures get -2 Ranged Attack power
  // as long as Eternal Night is in effect" (`Unit rosters/Warlord mod unit data/HELP.TXT:5768`),
  // so missile/boulder and magic ranged take it while Thrown and breath — short-range, not
  // "Ranged" — do not. The write is `PROVENANCE[eternalNight:poorVision]` (`stats_sequence.js`).
  //
  // The exemption is `(GetStat(U,STypeID,1)<>356) %AND (GetStat(U,SRace,0)<>RCDeath) %AND
  // (GetEnchantmentFlag(U,EncUndead,0)=0)` (`UnitCalcPre.CAS!NOBLOODANDIRON!+6..+9 "%AND (GetStat(U,STypeID,1)<>356)" "THEN {"`). `GetStat(U,S,0)` is the
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
  // Both arms read the record at the reading step's own position: the Death arm through the
  // block's own test above, the Life arm through the scalar the block compares.
  const darknessBonuses = (u) => {
    if (isDeathUnitAt(u)) {
      return { atk: darknessAtkDefMagnitude(u), def: darknessAtkDefMagnitude(u),
        res: darknessResMagnitude };
    }
    if (unitRealmAt(u) === 'life') {
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
  // is `GetStat(U,SRace,0)` (`UnitCalcPre.CAS!NOUPLIFTSPEECH!+7 "IF ( (GetStat(U,SRace,0)=RCDeath)", UnitCalcPre.CAS!NOUPLIFTSPEECH!+8 "%OR (GetEnchantmentFlag(U,EncUndead,0)>0) )"`), the *current* record by the CAS
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
  // A record field, not a pre-sequence constant. `EncDiscipline` is written at
  // `CreateUnit.CAS!HASEVILPRESENCE!+51 "SETENCHANTMENTFLAG(U,EncDiscipline,ABase,1);"` (`ABase`) and `OverlandEndTurn.CAS!NOMAGITEKSCI!+8 "SETENCHANTMENTFLAG(U,EncDiscipline,1,1);"` (selector 1) — the permanent
  // record. F202 read those two lines carrying no stat delta as meaning neither earns a step, so
  // no step could move the value and a field would restate a constant; F244 overturned that half
  // of the rule, and both writes are steps now — the Outlander Military Drilling grant is
  // `training:militaryDrilling` and the cast's own write is `buffs:discipline:cast` (F244.3d). The
  // one thing that reads the flag without writing the calculated record is still not modelled:
  // `UnitCalcPre.CAS!NOFIERYFURY!+11 "IF (GetEnchantmentFlag(U,EncDiscipline,0)>0) THEN {"` reads it and writes `EncDisciplineOld`.
  // The version term the constant used to carry is the two steps' `STEP_VERSION_SCOPES` rows now:
  // outside CoM2 and Warlord neither is in scope, so the field stays unwritten.
  const disciplineValueAt = u => (u && (u.discipline === 'overland' || u.discipline === 'combat')
    ? u.discipline : 'none');
  const disciplineActiveAt = u => disciplineValueAt(u) !== 'none';
  // The three thresholds read the experience level standing on the record at `c:discipline`'s own
  // position — `levelRankOf(u.level)` (`combat_abilities.js`) — which is what `training:veterancy`
  // wrote and what Destiny's `B.level := 1` may have taken back.
  const disciplineDefMod = u => (disciplineActiveAt(u) ? (levelRankOf(u.level) >= 1 ? 2 : 1) : 0);
  const disciplineAtkMod = u => (disciplineActiveAt(u) && levelRankOf(u.level) >= 2 ? 1 : 0);
  // Overland Discipline grants +1 movement at Elite+, but movement is not modeled here.

  // Soul Flay (Warlord, Death rare combat curse): irresistible curse on normal units
  // or heroes. Penalises stats by −1 melee, −1 ranged, −2 armor and −2 resistance per
  // experience level of the target. Experience level counts Recruit (the calculator's "normal")
  // as level 1, so the multiplier is levelRank + 1: Recruit −1/−1/−2/−2, Elite −4/−4/−8/−8.
  // Fantastic creatures are not valid targets and take no penalty. The write is
  // `PROVENANCE[soulFlay]` (`stats_sequence.js`).
  //
  // The block itself carries no Fantastic test — `IF (GetEnchantmentFlag(U,EncSoulFlay,0)=0)`
  // is its whole gate — so the exclusion is a **targeting** term, and `CLAUDE.md`, *Architecture*,
  // gives targeting the permanent (base) record. That is `ctx.base.fantastic` at `b:soulFlay`'s
  // own position rather than the unit's training-time flag. Both `buffs` writes are inside the
  // snapshot, so the flag it carries is True for a Destiny unit (`B.Fantastic := True`,
  // $0059A390) and False for a Spirit-Linked one (`SETSTAT(TU,AFantastic,1,0)`) (F244.3h).
  // Rust's exclusion is the same shape and takes the same record since F246: `rustActiveAt`
  // reads `ctx.base.fantastic` at its three `d`-phase halves, and the running record at
  // `debuffs:rust:material`, which stands ahead of `a:baseCopy` where that record still is the
  // permanent one.
  const soulFlayActiveAt = runCtx => version.startsWith('com2_warlord')
    && !!(abilities && abilities.soulFlay)
    && !runCtx.base.fantastic;
  // Read off the record at `b:soulFlay`'s own position, like Discipline's thresholds. Region `b`
  // runs before the region-`c` level ladder, so the value it reads is the persistent level
  // `training:veterancy` wrote, which is the field the script's `GETSTAT(U,ALevel,…)` names.
  const soulFlayLevels = u => levelRankOf(u.level) + 1;
  const soulFlayAtkMod = u => -1 * soulFlayLevels(u);
  const soulFlayDefMod = u => -2 * soulFlayLevels(u);
  const soulFlayResMod = u => -2 * soulFlayLevels(u);

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
  // units in combat with −20% To-Hit, −20% To-Defend and −2 Resistance for the
  // rest of battle (the Confusion half of the spell is not modelled here). The To-Hit/To-Defend penalties are applied in the
  // toHit/toBlock section below; here we handle the −2 Resistance. The write is
  // `PROVENANCE[greatUnbinding]` (`stats_sequence.js`).
  //
  // The block's two gates are `UnitCalcPre.CAS!NOETERNALNIGHT!+2..+22 ", All opponent fantastic creatures suffer -20% To-Hit, -20% To-Defend, -2 Resistance :" "!NOTUNBINDING!"` (F217.2). The first is an outright
  // exemption: `IF (HASGLOBAL(W,GEGreatUnbinding)) %OR (GETENCHANTMENTFLAG(U,EncSpiritLink,0)>0)
  // THEN { GOTO "NOTUNBINDING"; }` — a Spirit-Linked unit takes nothing at all. The `HASGLOBAL(W,…)`
  // half has no calculator counterpart: the control models the *opponent's* cast reaching this
  // unit, which is the second gate `HASGLOBAL(OPPONENT,GEGreatUnbinding)`, and the page has no
  // separate "this unit's own wizard also cast it" input.
  //
  // The second gate is the eligibility disjunction, and it is wider than Fantastic: `FANTASTIC(U)`
  // — a live read at this point in region `b`, so a unit made Fantastic earlier in the chain
  // counts — plus `EncUndead`, the three Chaos-Channels flags, `EncNecromancy`, `EncRevenant` and
  // `EncVampirism`. `EncNecromancy` has no calculator input and so has no term here; every other
  // flag does. The Chaos-Channels terms are not redundant with `FANTASTIC(U)` in the script and
  // are written out for the same reason here.
  const greatUnbindingCast = isWarlord
    && !!(abilities && abilities.greatUnbinding)
    && !hasAbil(abilities, 'spiritLink');
  const greatUnbindingActive = u => greatUnbindingCast
    && (!!u.fantastic
      || undeadEnchantmentFlag
      || hasAbil(abilities, 'ccDefense')
      || hasAbil(abilities, 'ccFireBreath')
      || hasAbil(abilities, 'ccFlight')
      || hasAbil(abilities, 'revenant')
      || hasAbil(abilities, 'vampirism'));

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
  // The Fantastic and hero terms are the calculator's own — `CreateUnit.CAS` carries neither
  // `BASEFANTASTIC` nor `ISHERO` anywhere in the file. The Fantastic half is read off the record
  // at each `training:naturalSelection:*` step's own position rather than captured ahead of the
  // sequence (F244.3h); the hero half stays a constant, since no conversion writes that flag
  // (F187). A `training` step ranks four phases ahead of `a:baseCopy`, so
  // `ctx.base` does not exist yet and would be the wrong record if it did: the permanent record
  // a training gate asks about is the one the training phase is *building*, before any cast.
  // That is the running `u.fantastic`, which no step has written at this rank in any Warlord
  // chain, so the value is the template flag and the read is positional rather than hoisted.
  const naturalSelectionEligibleAt = u => isWarlord && !u.fantastic && !isHero;
  const naturalSelectionCoalAt = u => naturalSelectionEligibleAt(u)
    && !!(abilities && abilities.coal);
  const naturalSelectionIronAt = u => naturalSelectionEligibleAt(u)
    && !!(abilities && abilities.iron);
  const naturalSelectionNightshadeCount = abilities && abilities.nightshade === true
    ? 1 : Math.max(0, parseInt(abilities && abilities.nightshade) || 0);
  const naturalSelectionNightshadeAt = u => naturalSelectionEligibleAt(u)
    && naturalSelectionNightshadeCount > 0;
  // Nature Link (Warlord rename of Land Linking): grants +1 resistance to any unit
  // (normal or fantastic) — `PROVENANCE[natureLink]` (`stats_sequence.js`). The fantastic-only
  // +2 melee/def/breath is `PROVENANCE[landLinking]` beside it.
  const natureLinkActive = isWarlord && !!(abilities && abilities.landLinking);
  const naturalSelectionPowerMineralsCountAt = u => (naturalSelectionEligibleAt(u)
    ? Math.max(0, parseInt(abilities.powerMinerals) || 0)
    : 0);
  const naturalSelectionPowerMineralsAt = u => naturalSelectionPowerMineralsCountAt(u) > 0;

  // Survival Instinct (Warlord addition): newly trained normal units gain a small
  // +3% to +7% To-Defend from gold-producing resources in the city's surroundings.
  // The numeric input holds that To-Defend percentage; applied to normal units only
  // (the fantastic-creature buff is the separate survivalInstinct checkbox). The write is
  // `PROVENANCE[survivalInstinctToBlock]` (`stats_sequence.js`), from `CreateUnit.CAS`.
  // `CreateUnit.CAS!NOTARCHMAGE!+5..+6 "IF HASGLOBAL(W,GESurvivalInstinct) %AND (OREGUILED>0) THEN {" "SETSTAT(U,SToDefend,ABase,((GETSTAT(U,SToDefend,ABase))+OREGUILED));"` writes `SToDefend` on record `ABase` when a city produces the unit,
  // and its own block carries no identity test — the restriction to a trained normal unit is the
  // routine, not the block. So the gate reads the **base** identity: this is a permanent
  // training-time write, made before combat, and no later conversion is visible to it. A unit
  // Chaos Channels, Sanctify, Undead or Destiny converts in combat keeps what its city gave it.
  const survivalInstinctToBlkBonus = isWarlord && isNormalUnitType(baseUnitType)
    ? Math.max(0, parseInt(abilities.survivalInstinctToBlock) || 0)
    : 0;

  // Orihalcon: +1 resistance, +2 magical ranged attack (CoM/CoM2). The compiled block's gate is
  // `EncOrihalcon` on the record, so the step reads the armour material standing there at its own
  // position — what `training:armorQuality` wrote.
  const orihalconActive = u => u.armorMaterial === 'orihalcon';

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
  // (`UnitCalcPre.CAS!NOLUCKYSTAR!+15 "IF (BASEFANTASTIC(U)>0) THEN { GOTO"`) — the **permanent** record, so a combat conversion to Fantastic does
  // not withdraw the garrison bonus, and Spirit Link clearing live Fantastic does not confer it.
  // That record is the one the permanent-record phases leave and `a:baseCopy` publishes, read at
  // this block's own region-`b` position (F244.3h), so Destiny's permanent `B.Fantastic := True`
  // ($0059A390) withdraws it (F192) and Spirit Link's permanent clear confers it (F245).
  // That single test is the whole gate: the block has no hero arm, so a Warlord hero garrisoning
  // the city takes the package like any other non-Fantastic unit. The `!isHero` term this line
  // used to carry was the calculator's own, read off the helptext's "Friendly regular units gain
  // +1 Melee Attack, +1 Physical Ranged Attack, and +1 Thrown Attack, and their attacks can
  // ignore Weapon Immunity" (`Unit rosters/Warlord mod unit data/HELP.TXT:2761`) — prose, which
  // the script outranks (CLAUDE.md, *Source routing*) (F175).
  const wofDefenderBonusActiveAt = runCtx => isWarlord
    && !!(abilities && abilities.wallOfFireBoost)
    && !runCtx.base.fantastic;

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
  // The Fiery Blade half is read **off the record**, at each consumer's own position (F244.3c).
  // The Lava Smelter grant is `SETENCHANTMENTFLAG(U,EncFlameBlade,ABase,1)` (`CreateUnit.CAS!NOACADEMY!+25 "IF (ACCESSADAMANTIUM>0) %AND (ACCESSCRYSX>0) THEN { SETENCHANTMENTFLAG(U,EncFlameBlade,ABase,1); }"`) and
  // `…,1,1)` (`OverlandEndTurn.CAS!OUTLANDERSKIPELEMENTALARMOR!+4 "IF (OWNADAMANTIUM>0) %AND (OWNCRYSX>0) THEN { SETENCHANTMENTFLAG(U,EncFlameBlade,1,1); }"`) — permanent writes made when the city
  // built or retrained the unit, so `training:lavaSmelter:flameBlade` is their rank, ahead of every
  // consumer here. F202 ruled the other way and left the grant a pre-sequence constant because the
  // write carries no stat delta of its own; F244's rule — the record starts as the roster template
  // and nothing else — reopened that and decided it as a positioned write.
  //
  // So there is no `hasWarlordBlade` constant any more, only a read at a rank. The two step
  // consumers (`c:flameBlade` below and `c:metalFires`, `combat_abilities.js`) ask the record they
  // are handed; the weapon *result* field `effectiveWeapon` (below the run) asks the record the run
  // leaves. `training` ranks ahead of `b`, `c` and the tail alike, so all three read one value —
  // and each reads it where its own engine block does rather than from a constant.
  // The upgrade is the result field and not the record's material: a blade upgrades the attack it
  // makes without writing the persistent quality Artificer and the training city write, which is
  // why `training:artificer` writes `weaponMaterial` and this does not (F244.2).
  const hasWarlordBladeAt = u => warlordCombatFlameBlade || (isWarlord && !!u.fieryBlade);
  const nonWarlordFlameBlade = !!abilities.flameBlade && !isWarlord;
  // Metal Fires is one compiled block (`unitcalc.c` 131:0x9065F..0x9072B), built only into
  // MoM 1.31 and CP 1.60, and one eligibility gate covers its whole package: melee 0x906C1,
  // missile/Thrown strength 0x906FC, and the magic-weapon upgrade 0x90723. The strength and
  // melee halves are the `c:metalFires` step (`combat_abilities.js`), which `SCOPE_MOM` keeps
  // out of the CoM engines; the weapon upgrade is not a step, so it carries the same version
  // test here. The engine's `!(ench & UE_FLAME_BLADE)` non-stacking gate is the last term.
  // The block's Fantastic test is `!(bu->Abilities & UA_FANTASTIC)` at 131:0x9069A, the calculated
  // record at the block's own position — a **term of the block**, not a targeting class, so it is
  // not one of the reads F246 moved to the permanent record. The upgrade is a result field that
  // cannot be a step, so the predicate is evaluated below the run against the record the run
  // left. That is the same value the block's own position carries wherever this is reachable:
  // `c:metalFires` ranks after every identity conversion in both MoM chains (rank 47, last
  // conversion 38 in 1.31 and 37 in CP), so nothing writes `fantastic` between the block and the
  // end of the run (F192, F246).
  const metalFiresActiveAt = u => !!abilities.metalFires && !u.fantastic
    && !isCoMVersion && !abilities.flameBlade;
  const fbAtkBonusAt = u => ((nonWarlordFlameBlade || hasWarlordBladeAt(u)) ? 2 : 0);
  // The ELSE arm of Fiery Fury's one `IF (BASEFANTASTIC(U))` (`UnitCalcPre.CAS!NOTHERO!+6 "IF (BASEFANTASTIC(U)) THEN {"`), whose THEN
  // arm is `b:fieryFury:race` (`stats_identity.js`). `BASEFANTASTIC` is the permanent record as
  // the permanent-record phases leave it, Destiny's write included (F192).
  const ffRegularBonusAt = runCtx => isWarlord && !!abilities.fieryFury
    && !runCtx.base.fantastic;
  // Fiery Fury melee +3 for regular units — "an increase in Melee Attacks by 3"
  // (`Unit rosters/Warlord mod unit data/HELP.TXT:5885`) — non-cumulative with Flame Blade /
  // Fiery Blade (combat_abilities.js already adds +3 melee for a Warlord blade effect).
  const ffMeleeBonusAt = (u, runCtx) => ((ffRegularBonusAt(runCtx)
    && !hasWarlordBladeAt(u)) ? 3 : 0);

  // Warlord Colossal Strength: +1 + 40% (rounded down) of Melee, Physical Ranged, and
  // Thrown attack strength. Breath and magic ranged are not "physical ranged" and do not
  // qualify.
  //
  // UnitCalc.CAS!NOCOMBAT!+4..+20 ", +40% melee and non-magic range attack :" "!NOCOLOSSALSTRENGTH!" computes `1 + %I(GetStat(U,SAttack,0)*4/10)` from the attack as
  // it stands in phase d — not from the base — so the bonus scales everything phases a-c
  // applied, plus the phase-d terms that precede it in the file: Rust (UnitCalc.CAS!NOTCITY!+10..+22 "unit loses 1/2 of melee/physical range/thrown strength :" "!NOTRUST!"), Focus
  // Magic (UnitCalc.CAS!NOVENOM!+5 "IF (GETENCHANTMENTFLAG(U,EncFocusMagic,0)=0) THEN { GOTO", UnitCalc.CAS!NOTRUST!+3 "IF (GETENCHANTMENTFLAG(U,EncFocusMagic,0)=0) THEN { GOTO") and Weakness's breath penalty (UnitCalc.CAS!NOTENGINEERCOUNT!+2..+8 ": Modified Weakness effect :" "!NOTWEAKNESS!"). Those are every phase-d
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
  // Same reading as Natural Selection's eligibility above: a `training` gate has no `ctx.base`
  // to read, so its Fantastic term is the record the training phase is building — the running
  // `u.fantastic` at this step's own rank (F244.3h).
  const pillarOfFaithCountAt = u => (isWarlord && !u.fantastic && !isHero
    ? Math.max(0, parseInt(abilities.pillarOfFaithRes) || 0)
    : 0);
  const pillarOfFaithAt = u => pillarOfFaithCountAt(u) > 0;
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
  // ungated on the field's current value: Ludus/Agoge (CreateUnit.CAS!NODRAGONMOUND!+13 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,1)+1));"),
  // an Altar of the Sun Holy Mother (CreateUnit.CAS!NOAGOGE!+7 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,1)+1));"),
  // Mother Fungus (CreateUnit.CAS!NOBASILICA!+7 "SETSTAT(U,SAttack,1,(GETSTAT(U,SAttack,1)+2)"), a Coal site
  // (CreateUnit.CAS!NOTARCHMAGE!+33 "SETSTAT(U,SAttack,ABase,ATK+1);") and the Malnourished penalty
  // (CreateUnit.CAS!HASEVILPRESENCE!+6 "SETSTAT(U,SAttack,ABase,(GetStat(U,SAttack,ABase)-1));"). Those
  // writes are `training`-phase steps here, so the record `a:baseCopy` copies is what a later
  // region reads (SPEC.md, *The step model*). The card's input is that record only before the
  // permanent phases run, which is why this is a predicate over the run context rather than a
  // boolean captured beside it — the same read `c:weapon`'s `weaponMeleeOpen` already makes.
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
  // Rust clears the persistent material flags before recalculation (`debuffs:rust:material`), so Heavenly
  // Light reads the record the permanent phases leave rather than the UI selection. The write
  // itself is `PROVENANCE[heavenlyLight]` (`stats_sequence.js`); this is its material gate.
  //
  // Both engines read the same fact — the persistent record's weapon-quality bits — and grant the
  // threshold only where they are clear. CoM 1 states it as `cl = _UNITS[si].mutations` followed
  // by `if (!(cl & UM_WEAPON_QUALITY_MASK))`, and has neither of the modern hero/Fantastic
  // exclusions. It adds one suppressor the calculator does not model: `_UNITS[si].type >= 0x97`
  // forces `cl` to Magic Weapons, so a high-index roster entry takes no threshold. Which set that
  // ceiling selects is R6.1a's open question — the index↔roster-id mapping is unsettled — so the
  // condition that *is* determined is implemented and the ceiling is not.
  //
  // The modern pair is `not B.Fantastic and not B.ishero` (Units.RecalculateUnits.pas:1447-1448):
  // the `B.` selector is the **permanent** record, which `a:baseCopy` publishes, so the Fantastic
  // half reads `ctx.base.fantastic` at this region-`c` block's own position rather than the
  // unit's training-time flag. `buffs:destiny` writes `B.Fantastic := True` ($0059A390) and
  // `buffs:spiritLink:fantastic` clears it, and both stand ahead of the copy (F244.3h, F192).
  // CoM 1 short-circuits the whole pair, so the read is modern-only — which matters, because
  // CoM 1's three `template`-phase conversions make `ctx.base.fantastic` a different fact there.
  const heavenlyLightMaterialTail = (u, runCtx) => heavenlyLightActive
    && u.weaponMaterial === 'normal' && (isCoM1 || (!isHero && !runCtx.base.fantastic));
  // CoM 1 tests the *live* melee at its own position (`if (bu->melee > 0)`, com1:0x905F3), where
  // Caster.exe tests the persistent base attack; both thresholds sit inside that same gate.
  const heavenlyLightMeleeToHitAt = (u, runCtx) => (heavenlyLightMaterialTail(u, runCtx)
    && (isCoM1 ? u.atk > 0 : inputBaseAtk > 0)) ? 10 : 0;
  const heavenlyLightThrownToHit = (u, runCtx) => (
    heavenlyLightMaterialTail(u, runCtx) ? 10 : 0);
  const uphillBattlePct = uphillBattleActive ? 10 : 0;
  // The flag is published as a result field rather than carried on the record, so its Fantastic
  // arm is read off the record at the block's own chain rank — captured during the run below —
  // instead of at any other position. The blade arm is a record read too since F244.3c, taken
  // from the record the run leaves: `training:lavaSmelter:flameBlade` ranks ahead of every region,
  // so the finished value is the one this block's own rank would have seen. Everything else in the
  // disjunction is position-independent.
  const modernEncMagicOtherTermsAt = (u, runCtx) => version.startsWith('com2_')
    && (isHero
      || nonWarlordFlameBlade || hasWarlordBladeAt(u) || ffRegularBonusAt(runCtx) || hwActive
      || !!abilities.wraithForm || !!abilities.rulerOfUnderworld
      || !!abilities.blazingMarch || wofDefenderBonusActiveAt(runCtx) || heavenlyLightActive);

  // Eye of Heaven switches a gaze off: `UnitCalc.CAS!IMMUNETOROT!+7 ", is also shut off gaze attack of opponent :"` zeroes
  // `SStoningGaze`/`SDeathGaze`/`SDoomGaze`, and it is the only write of those three fields in the
  // shipped Warlord script set — a search result over that set, not a claim about the DOS
  // binaries, where whether some differently named effect suppresses a gaze is open (F258.1 §3.3).
  //
  // Warlord only, and the version test is this read's own. `CGEyeOfHeaven` is combat global 21
  // (`MASTER.CAS~"CGEyeOfHeaven = 21"`), a Warlord addition implemented as a *scripted* combat
  // global; the DOS builds have no script system for one to live in and none of the three names
  // the enchantment anywhere, and neither does the CoM2 1.05.11 base script set (F258.1). The
  // other two `eyeOfHeaven` reads in the calculation layer already carry the test
  // (`stats_sequence.js`, `stats_identity.js`); this one did not, and a Warlord matrix row
  // surviving a version switch reached DOS runs through it (F258).
  //
  // What it gates is now the *step* below — `d:eyeOfHeaven:enemyGaze` (`stats_sequence.js`) —
  // and the resolution-time strip of the two sentinel-written gaze marks. The seed and the
  // region-`e` floor no longer read it: the engine's write is one block in `UnitCalc.CAS`, which
  // is region `d`, so the permanent record `a:baseCopy` publishes carries the unzeroed strength.
  const gazeDisabled = isWarlord && enemyEyeOfHeaven;
  // A gaze's strength lives in the same `.ranged` slot Chaos Surge writes, so MoM and
  // CoM 1 boost all three DOS gaze types. CoM2/Warlord (separate engine) are left unchanged.
  // Level bonus to a gaze's strength, from the same shared `.ranged` slot. MoM's level
  // routine (0x8F881-0x8FB3E) has no `ranged_type` gate at all, so all DOS gaze types take
  // the full ranged ladder. CoM 1 replaced it with a table loop whose `.ranged` step is
  // skipped for `ranged_type >= 100` — thrown, breath and every gaze — on all rows but
  // Veteran (0x8FA9A-0x8FAAB); that is exactly the ladder's `thrown` column. CoM2 and
  // Warlord instead write none of their three independent gaze fields in ApplyLevelBonus.
  // Both take the bonus row `c:level` resolved from the record at its own position, so they are
  // magnitudes of that step's write rather than pre-sequence constants (F244.2).
  const gazeLvlMod = lvl => (version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : 0);
  const doomGazeLvlMod = lvl => (version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : 0);
  // CoM 1's Warp Attack halves the `.ranged` slot with no `ranged_type` test at all
  // (0x90764-0x90772), so it reaches a gaze's strength exactly as it reaches conventional
  // ranged, thrown and breath. Darkness lands after the halving, as it does for the ranged
  // stat below. MoM's Warp Attack touches melee only. CoM2/Warlord's separate gaze fields
  // are untouched by all three compiled Warp blocks (CoM2 analysis, *The Warp blocks*).
  // CoM 1 only, and read inside `c:warpAttack`'s own `apply`, so whether Warp Attack lands is
  // already settled by that step's gate: this is the branch within it, not a second copy of it.
  const gazeWarpHalves = isCoM1;

  // Psycho Force and Pneuma Field are the two Magitek effects that read Resistance rather than
  // writing it. Both are region `d` — UnitCalc.CAS!COMBATOVERRIDE!+13..+17 "IF (SPELLSTATE(W,STMagitekPsycheForceConverter)=2) THEN {" "}" and UnitCalc.CAS!COMBATOVERRIDE!+19..+25 "IF (SPELLSTATE(W,STMagitekPneumaReactor)=2) THEN {" "SETSTAT(U,AFLifeSteal,0,PNEUMA,1);" — and both flags are
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
  // *Which* predicate `IsChaosUnit` computes is a separate question, and Q31 answers it:
  // `(race = RCChaos) or (ChaosChannel(u) and EncUndead)` (`Q31.evidence.md`). It tests no
  // Fantastic flag, so the compact `fantastic_chaos` token spelled here is narrower than the
  // block, and it carries no recovery arm, so a Chaos-Channelled undead unit is wrongly denied
  // the exemption. The recovery half is modern-only — the DOS block transcribed above really does
  // test the realm alone — but the Fantastic half is not: the compact token is narrower than
  // `bu->race != rt_Chaos` too. `Reference docs/Modern realm test inventory.md` rules this a
  // helper-form consumer; the collapse itself is F224.2. The positioning below is independent of
  // all that: both readings exempt the Spirit-Linked Chaos unit once the record is positional.
  //
  // The modern half is the membership reader: `IsChaosUnit` tests no Fantastic flag, so the
  // compact token is dropped, and its `ChaosChannel(u) and EncUndead` arm restores the exemption
  // to a Chaos-Channelled Undead unit whose scalar `c:undead` overwrote. The DOS half is left as
  // it stands: those engines have no helper, so there is no recovery arm to route, and shedding
  // the Fantastic term there is a separate correction the inventory records against `bu->race !=
  // rt_Chaos` (131:0x9077A) rather than part of this collapse.
  // `Reference docs/Modern realm test inventory.md` rules the modern half H5 (F224.2a).
  const unitIsChaos = u => (isCoM2
    ? unitInRealmAt(u, 'chaos')
    : unitTypeAt(u) === 'fantastic_chaos');
  const hurricaneActive = !!input.hurricane;
  // The immunity half used to be restated here beside the flag. It is not a term of the block —
  // `Units.RecalculateUnits.pas:2341`-style curse blocks test their flag alone — and it was a
  // second home for what the `debuffs:vertigo:cast` gate already does, whose Illusion arm is the wider
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
    // `training:militaryWorkshop`, `PROVENANCE[militaryWorkshop]` (`stats_sequence.js`), at that
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
    // in the magical band — `GetStat(U,SRangedType,1) > 29` (`CreateUnit.CAS!NOMOTHERFUNGUS!+4..+6 "IF (GetStat(U,STypeID,1)=221)" "%AND (GetStat(U,SRangedType,1)>29)"`), the whole
    // band, which includes Warlord's own id 40, beam energy. Naming three realm tokens excluded
    // it; the modern vocabulary's `magic`/`magic_lightning` are exactly ids 30-38 and 40, so the
    // predicate is the band. The rest of the gate reads no field and is assembled beside the
    // slot that holds this one (`rangedFieldContext`).
    const permanentMagicalRangedField = inputSlotRtb > 0 && isMagicalRangedType(rtbTypeRaw);

    // What `template:stat:base` seeds, the chain's first entry: the permanent record's identity
    // alone. The Marionette realm retype is `SETSTAT(U,SRangedType,0,…)` — record selector `0`,
    // the calculated record — so it is `b:marionette:rangedType` at its own position and not a
    // seed here (F107), on `PROVENANCE[marionette:rangedType]` (`stats_sequence.js`) from
    // `UnitCalcPre.CAS`. Wanderer's own permanent Chaos type comes from its roster record
    // (`Unit rosters/Warlord mod unit data/UNITS.INI` [362]: `RangedType=30` at `Ranged=0`).
    const baseSequenceRangedType = permanentRangedType;
    const baseSequenceThrownType = permanentThrownType;

    // `training:energyCannon` is a permanent overland conversion to projectile type Beam
    // with ranged Doom damage. The script gates it on persistent Max Ammo > 0, but every
    // shipped Warlord conventional-ranged unit has positive Max Ammo and every Mechanical
    // zero-ammo unit lacks conventional Ranged. The one-round calculator therefore infers
    // that gate from the permanent conventional-ranged snapshot and imports no ammo field.
    // Its +50% write is added to the training-time group below, after the earlier permanent ranged
    // writes it reads have been assembled — `PROVENANCE[energyCannon]` (`stats_sequence.js`).
    //
    // The block's two research terms, and no record term: `powerEngine` is a record field now, so
    // its read moved to the step (F244.3d). `energyBeamWeapons` is
    // `SPELLSTATE(W,STMagitekBeamWeapon)=2`, the wizard's research state and no unit field at
    // all, taken from the reform record so the Outlander-ownership test is explicit.
    // `EncPowerEngine` on the **permanent** record is the term this block's
    // second route reads directly (`OverlandEndTurn.CAS!NOANTIGRAVITY!+5 "IF (GETENCHANTMENTFLAG(U,EncPowerEngine,1)>0)"`) and the one its first route states
    // as the enclosing `SPELLSTATE(W,STHeatPowerEngine)=2` plus `GetStat(U,SCustomAttribute,1)<>1`
    // (`CreateUnit.CAS!HASEVILPRESENCE!+65..+81 "IF (GetStat(U,SCustomAttribute,1)<>1) THEN { GOTO" "IF (SPELLSTATE(W,STMagitekBeamWeapon)=2)"`). That flag is written at `CreateUnit.CAS!HASEVILPRESENCE!+69 "SETENCHANTMENTFLAG(U,EncPowerEngine,ABase,1);"` (`ABase`) and
    // `OverlandEndTurn.CAS!NOXENOVET!+8 "SETENCHANTMENTFLAG(U,EncPowerEngine,1,1);"` (selector 1), which is `training:powerEngine`
    // (`combat_abilities.js`); `training:energyCannon` stands after it in the chain and reads the
    // flag off the record, the way the overland route reads it.
    const energyCannonResearch = isWarlord && !!outlanderReform.energyBeamWeapons
      && hasPermanentRangedStat;
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
    // Which mirrors of the shared byte the record carries is structure, not a value the sequence
    // moves, and `stoningGaze`/`deathGaze` are card marks that are not record fields at all —
    // neither is a member of `SEEDED_NON_STAT_KEYS`, so there is nothing on `ctx.base` to read
    // them from. Those three terms stay slot facts.
    //
    // The Doom Gaze term is **not** one of them and used to be, which was the defect this subtask
    // exists to remove surviving inside it (F244.3i review, finding 1). `doomGaze` is an ordinary
    // stat field of the record: `template:stat:base` writes it (`stats_sequence.js`) and
    // `a:baseCopy` publishes it, so a card and a permanent record that disagree about it must be
    // answered by the record. It reads `base.doomGaze` at `ccDosBreathEligibleAt` below, beside
    // the byte's permanent type and strength.
    const hasGazeAttack = gazeType !== 'none'
      || abilities.stoningGaze != null
      || abilities.deathGaze != null;
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
    // The eligibility half moved to the step's own `when`, which reads the record at the
    // `training` rank (F244.3h); what stays here is the channel predicate, which is a fact
    // about the slot rather than about the unit.
    const naturalSelectionWildGameSlot = !!(abilities && abilities.wildGame)
      && naturalSelectionWildGameRangedSlot;
    // A channel field carries ranged, thrown AND breath (distinguished by its type pair), so it
    // is also what Explosive's fire-breath doubling scales — that effect has no stat of its own.
    // The doubling is `PROVENANCE[upgradedExplosive:fireBreath]` (`stats_sequence.js`).
    // Like `naturalSelectionWildGameSlot` above, what stays here is the channel predicate — the
    // Blackpowder upgrade standing in this slot — and the `NOTSAPIENS` eligibility half is the
    // two steps' own `when`, read off `ctx.base` at their region-`b` rank (F262).
    const upgradedExplosiveSlot = !!blackpowder;
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
      calcBaseRtb, hasPermanentRangedStat, permanentMagicalRangedField, hasGazeAttack,
      marionetteRangedSlot, marionetteOwnsThisRangedSlot,
      blackpowder, blackpowderPhysicalSource,
      blackpowderSelectedPhysicalRanged, blackpowderSelectedThrown,
      blackpowderSelectedFireBreath, blackpowderUpgradesToBoulder,
      ccFireBreathAbil, ccOwnsThisSlot,
      energyCannonResearch, energyCannonOwnsThisSlot,
      naturalSelectionWildGameSlot, upgradedExplosiveSlot, dosGazeStrength,
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
    // `SThrown := SThrown + 1 + SAttack/3` (UnitCalc.CAS!NOVAMPIRISM!+2..+6 ", gain thrown at strength half of its melee power :" "SETSTAT(U,SThrown,0,(GetStat(U,SThrown,0)+STRIKE));") has no existence gate, so
    // the Thrown field has to exist for the positioned grant to land on it. Seeded empty and
    // typeless, exactly as the Blaze of Glory transfer's field is: nothing before
    // `UnitCalc.CAS!NOVAMPIRISM!+2 ", gain thrown at strength half of its melee power :"` may see a Thrown channel the grant has not yet created, and the step
    // itself supplies the identity. Focus Magic needs no second accumulator beside it any more:
    // `U.ranged := U.thrown; U.thrown := 0` (Units.RecalculateUnits.pas:885-891) is a real field
    // move, so it leaves this one field free for the grant (F90).
    // Bombs & Grenades writes the independent Thrown field regardless of any conventional
    // ranged or Breath field already present. `SETSTAT(U,SThrown,0,…)` (UnitCalcPre.CAS!NOMAGITEKENGINE!+11 "SETSTAT(U,SThrown,0,( GETSTAT(U,SThrown,0)+%I( 8 - (GETSTAT(U,SFigures,1)/2) ) );")
    // names the calculated record, so the field is seeded empty and typeless like the Shadow
    // Strike and Blaze of Glory fields below, and `b:bombsGrenades` supplies its identity at
    // its own position rather than the permanent record carrying a region-`b` write. The term
    // is the block's eligibility alone, not its write gate: that gate reads the permanent melee
    // the permanent-record phases leave and is therefore resolved at the step's own rank, so the field has
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
    // `SETSTAT(U,SRanged,0,…)` (UnitCalcPre.CAS!NOVAMPIRISM!+19 "SETSTAT(U,SRanged,0,GETSTAT(U,SRanged,0)+MATK);",
    // and UnitCalcPre.CAS!NOSACRED!+18 "SETSTAT(U,SRanged,0,(GetStat(U,SRanged,0)+2));" for the strayed branch's
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
    // The mark alone. This block is `isCoM2`, which is `ccIndependentChannels`, and the modern
    // grant carries no admission gate at all — so the seed is the Chaos Channels mark, and the
    // DOS admission half that used to stand beside it here never applied (F244.3i).
    if (ccFireBreathAbil && !modernInputs.fireBreath) {
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
    // (CreateUnit.CAS!NOBARAY!+10..+15 ": new effect of Altar of Storm, all units recruit from the city gains +1 lightning breath, if unit already have thrown then convert innate thrown to innate lightning breath :" "ENDOFUNIQUEBUILDING") assigns the independent Lightning Breath field and clears Thrown,
    // so the destination has to exist whether or not the unit owns a breath — and the emptied
    // Thrown field survives as the record's Thrown field rather than being spent (F90).
    if (lightningBladeAbil) {
      modernInputs.lightningBreath = { strength: 0, type: 'none' };
      if (!modernInputs.thrown) modernInputs.thrown = { strength: 0, type: 'none' };
    }
    // `SThrown := SThrown + SRanged` (UnitCalc.CAS!IMMUNETOROT!+23 "SETSTAT(U,SThrown,0,((GetStat(U,SThrown,0))+BLAZETHROWN));") has no existence gate either, so the
    // Thrown field has to exist for the positioned transfer to land on it. It is seeded empty
    // and typeless: nothing before `UnitCalc.CAS!IMMUNETOROT!+14 ", gain first strike, and doom damage but lose all base defense, lose original range attack and become throw power instead :"` may see a Thrown channel that the
    // transfer has not yet created, and the step itself supplies the identity.
    if (blazeOfGloryActive && !modernInputs.thrown) {
      modernInputs.thrown = { strength: 0, type: 'none' };
    }
    // `BLAZETHROWN = GetStat(U,SRanged,0)` (UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));") reads the Ranged *field*
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
        || (channelKey === 'fireBreath' && ccFireBreathAbil)
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
  // the Ranged half — `SToRanged` is written with no presence gate (UnitCalc.CAS!NOTZEAL!+3..+5 "IF (GETENCHANTMENTFLAG(U,EncTrueSight,0)>0) THEN {" "}"), so the
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
  // `GetStat(U,SCustomAttribute,1)<>1` (`CreateUnit.CAS!NOMOTHERFUNGUS!+7 "%AND (GetStat(U,SCustomAttribute,1)<>1) )"`, `OverlandEndTurn.CAS!NOOUTLANDERALTAROFSTORM!+15 "%AND (GetStat(U,SCustomAttribute,1)<>1) )"`) is the
  // permanent record at a training-time rank, so it takes the raw flag, not the value Rebuild's
  // cast-time write leaves: `training:alumniOfAcademy:figures` is a training-time write and
  // `buffs:rebuild`, the only mid-sequence write to `mechanical`, is cast-time and therefore
  // strictly later (F208, F202). The figure sequence is its own record and no write in it
  // reaches `mechanical`, so a record field here would restate this constant, not position it.
  //
  // The ranged-field term stays a constant for a harder reason, and **not** the one the other
  // three permanent-attack-record reads took (F244.3i). `ctx.base` is the wrong record here: it
  // is the record at `a:baseCopy`, four phases later, and `training:energyCannon` retypes the
  // Ranged field to Beam — a magical type — between this block and that copy, so a gate reading
  // the copy would be answering about a projectile type the Academy block cannot have seen.
  // The *scripts* keep the two apart on their own: the Beam conversion is Mechanical-only
  // (`CreateUnit.CAS`:677-699, and the `OverlandEndTurn.CAS`:664 upgrade route requires Power
  // Engine) while the Academy branch excludes Mechanical (`CreateUnit.CAS`:467), so no unit the
  // scripts can build takes both. The order argument is therefore about which record the gate
  // names, not about a counterexample the sources reach; a Halfling Beam unit is reachable only
  // through this calculator's mixed-entrance and Rebuild abstractions. The right record is
  // still the one standing at this block's own `training` rank, and it is out of reach twice
  // over: the figure sequence runs on `{ figs }` alone, carrying no
  // attack field, and it has no `a:baseCopy`, so it publishes no `ctx.base` at all. F243 is the
  // prerequisite — it folds `figs` into the stat record and retires the separate run, after
  // which this gate is an ordinary live read at its own rank.
  //
  // The constant is exact today, which is why it waits rather than being scaffolded: of the
  // seven permanent-phase attack writes ahead of this block, the retype
  // (`training:militaryWorkshop`, missile → boulder) stays non-magical and every strength write
  // is itself gated on a Ranged field that already carries strength, so no reachable state flips
  // `permanentMagicalRangedField` between the card input and this rank.
  const alumniOfAcademy = isWarlord && !!abilities.alumniOfAcademy
    && baseUnitRace === 'Halfling' && !isHero
    && (unitName.endsWith('Rocs')
      || (!abilities.mechanical
        && !!rangedFieldContext && rangedFieldContext.permanentMagicalRangedField));
  // The record-level half of the same gate the slot contexts assemble above; why the Power Engine
  // flag is not a term here, and is read off the record at each reading step instead, is stated
  // there (F244.3d).
  //
  // It has **two** readers — `d:energyCannonThreshold` (`stats_sequence.js`) and the post-run
  // Destruction rider below, which transcribe one `UnitCalc.CAS` block between them — and the
  // record half is read where they stand: `ctx.base`, the permanent record `a:baseCopy`
  // publishes, rather than the card's channel input (F244.3i). The difference is Warlord's eight permanent-phase attack writes —
  // `training:militaryWorkshop`'s missile-to-boulder retype and `training:energyCannon`'s own
  // Beam conversion among them — all of which land before region `d`. Both retypes stay inside
  // `RANGED_TYPES`, which is the whole of what this predicate asks of the type, so the
  // conversion cannot close the gate on the block that made it.
  const energyCannonResearchAt = runCtx => isWarlord
    && !!outlanderReform.energyBeamWeapons
    && !!rangedFieldContext
    && runCtx.base[rangedFieldContext.strengthField] > 0
    && RANGED_TYPES.includes(runCtx.base[rangedFieldContext.rangedTypeField]);
  // `UnitCalc.CAS!NOTOUTLANDERSOLDIER!+7..+15 "DESTRUCTION=GETSTAT(U,AFDestruction,0,3);" "SETSTAT(U,AFDestruction,0,DESTRUCTION,3);"` reads the unit's To-Hit plus its **Ranged** To-Hit, which is the
  // record field `hitchanceranged` — the modifier the Ranged field is read with, and therefore
  // the one belonging to the slot that holds it. Reading the shared slot's `toHitRtb` answered
  // from the DOS record instead (F127). Only meaningful where `d:energyCannonThreshold` gates on.
  const energyCannonHitField = (rangedFieldContext || recordContext).secondaryHitField;

  // Every ability write this merge used to make is a positioned step now, and what is left is the
  // finished-record projection `SPEC.md`, *The step model* blesses: the record the recalculation
  // **leaves**, which combat resolution is handed and which no block reads at a position.
  //
  // The grants that left: `training:altarOfTheMoon` (Rage, Poison Immunity, and the
  // Hunter/Witchdoctor poison and Life Steal branches), `training:militaryWorkshop` (Blackpowder, its
  // poison increment and Armor Piercing), `training:motherFungus` and `d:venom` (their own poison
  // increments), `training:energyCannon`, `b:bombsGrenades` and `d:blazeOfGlory` (both Wall Crusher,
  // F206 for the second; Armor Piercing; First Strike clear) with stage 1; then `buffs:destiny`
  // (Supernatural) and `b:eyeOfHeaven` (True Sight) → `c:trueSight` (Illusion Immunity) with
  // stage 2; and last `buffs:rebuild` / `b:rebuild` (Mechanical) with F208, which was the only
  // one of the thirteen keys that moved a number. Each writes a `statRecord` field at its own
  // block's rank and is read back after the chain.
  //
  // The inert-Rust drop went with them, deleted rather than positioned: no engine block clears
  // `EncRust`, and the Fantastic exclusion it stood for is a cast-time *targeting* class, which
  // `rustActiveAt` — `d:rust`'s own `when` — already carries at the one place `SPEC.md`, *The step
  // model* puts it. Nothing reads the published flag, so emission is a superset and the `when` is
  // the gate (`SPEC.md`, *Version scope*).
  //
  // Inner Power's suppression went the same way with F200's Insulation stage, but as a gate
  // rather than a drop: `c:innerPower` had no `when`, so suppressing the published key *was* the
  // eligibility test. The test is now the step's own, over the record `b:insulation` writes.
  //
  // Three keys that used to be resolved here are not: `unitType`, `liveRace` and `liveFantastic`
  // are the record the run **leaves**, and so is Supreme Light's published normalization, which
  // reads the same unit type. None of them has a reader among the steps this map feeds — combat
  // resolution is the only consumer of all four — so each is written below the run, from
  // `statUnit`, instead of from a projection taken ahead of it (F246).
  const effectiveAbilities = {
    ...abilities,
    baseRace: identity.baseRace,
    baseFantastic: identity.baseFantastic,
    doomGaze: baseDoomGazeStat,
    // Inner Power joins the three passthroughs below: `c:innerPower` carries the eligibility as
    // its own `when` now, reading `fireImmunity` and `lightningResist` off the record where its
    // block does, so the published key is the raw flag and the suppression that used to stand
    // here is gone (F200).
    innerPower: abilities.innerPower || false,
    mislead: abilities.mislead || false,
    survivalInstinct: abilities.survivalInstinct || false,
    landLinking: abilities.landLinking || false,
  };
  // The immunity set is no longer projected: `magicImmunity` and `illusionImmunity` are record
  // fields the template phase seeds, `trueSight` is written by `buffs:trueSight:cast`, and each
  // `debuffs:*:cast` step reads all three off the record at its own position (F244.3b). Only
  // `eyeOfHeaven` stays a constant, because the key is `nonRecord` — Warlord's combat enchantment,
  // which no permanent record carries (`stats_origins.js`). The cross-boundary read
  // `tools/unit_checks/identity_record_choice.js` declared for `finishedImmunities` went with it.
  // The ranged subformula remains an internal part of Rust's one atomic engine write; it is not
  // inserted into the execution list as a second step.
  // PROVENANCE[rust:ranged]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:10:98745d26b4fbf74694b1a932
  const rustRangedStep = statStep({ id: 'rust:ranged', phase: 'd', writes: strengthFields,
    when: (u, ctx) => rustActiveAt(u, ctx),
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
    // `baseFantastic` used to travel here for Breakthrough's `not B.Fantastic` admission. It
    // does not any more: that term is `c:breakthrough:normal`'s own `when` over `ctx.base`,
    // the record `a:baseCopy` publishes, which the template flag is not (F244.3h).
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
      when: (u, ctx) => rustActiveAt(u, ctx),
      apply: (u, context) => {
        legacyApply(u, context);
        rustRangedStep.apply(u, context);
        // `SETSTAT(U,ALargeShield,0,0)` (`UnitCalc.CAS!NOTCITY!+16 "SETSTAT(U,ALargeShield,0,0);"`), the fourth line of the same block
        // and inside the same reviewed span. It is a positioned write because a later block
        // reads what it leaves: Fortification at `UnitCalc.CAS!NOHILLFORT!+7 "IF (GETSTAT(U,ALargeShield,0)>0) THEN { SETSTAT(U,AMissileImmunity,0,1); } ELSE { SETSTAT(U,ALargeShield,0,1); }"` (F200).
        u.largeShield = false;
        // `SETSTAT(U,SThrown,0,0)` empties the Thrown *strength*; the type clear beside it is
        // this model's stand-in for the field being empty, since Warlord stores no Thrown type.
        // The strength write is load-bearing rather than cosmetic: Blaze of Glory's positioned
        // transfer adds the Ranged field onto whatever stands in Thrown at `UnitCalc.CAS!IMMUNETOROT!+14 ", gain first strike, and doom damage but lose all base defense, lose original range attack and become throw power instead :"`,
        // and Rust (`UnitCalc.CAS!NOTCITY!+11 "IF (GETENCHANTMENTFLAG(U,EncRust,0)=0) THEN { GOTO"`) runs first.
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
    template: [], training: [], immunities: [], buffs: [], debuffs: [],
    a: [], b: [], cBeforeHolyArmor: [], c: [], cAfterWarp: [], d: [], e: [],
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
  const baseGazeRanged = recordContext.dosGazeStrength;
  // DOS type 104 uses the shared strength as Doom Gaze damage — Automatic Damage assigns
  // `hits = attack_strength` and jumps past both rolls (0x9A1E6 -> 0x9A204), as the gaze
  // distribution in `combat_special_attacks.js` records. The modern engines instead carry an
  // independent Doom Gaze field.
  //
  // The seed is the *permanent* record, so Eye of Heaven does not reach it: its zeroing is a
  // block in `UnitCalc.CAS`, which is region `d`, and the permanent record is never zeroed at all
  // (F258). `a:baseCopy` therefore publishes the unit's real Doom Gaze, which is what the
  // consumers reading `ctx.base` — `ccDosBreathEligibleAt` among them — must see.
  const baseDoomGaze = !isCoM2 && recordContext.gazeType === 'gaze_multiple'
    ? recordContext.calcBaseRtb : (effectiveAbilities.doomGaze || 0);
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
  // (Units.RecalculateUnits.pas:2482-2487). `hasDoomGazeSlot` is therefore asked only by DOS
  // consumers — the region-`e` floor, `gazeMirrors` and `shapedGazeAbilities`, each gated on
  // `!isCoM2` — though its second disjunct evaluates on a modern card too, so it is the readers
  // that are DOS-only rather than the predicate. The modern tail has no Doom Gaze write for it to
  // answer for at all: the one reading the modern arm of the floor used to carry was Eye of
  // Heaven's zeroing, which is a region-`d` step of its own now, so the floor is DOS-only and
  // `doomGazeFloorKeeps` is gone with it (F174, F258).
  const hasGazeRangedSlot =
    (recordContext.gazeType === 'gaze_stoning' || recordContext.gazeType === 'gaze_death')
    && !isCoM2;
  const hasDoomGazeSlot = (!isCoM2 && recordContext.gazeType === 'gaze_multiple')
    || baseDoomGazeStat > 0;
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
  // (CreateUnit.CAS!NOBARAY!+10..+15 ": new effect of Altar of Storm, all units recruit from the city gains +1 lightning breath, if unit already have thrown then convert innate thrown to innate lightning breath :" "ENDOFUNIQUEBUILDING") is a move out of the record's Thrown field, so its two ends are slot
  // identities: the modern record's Lightning Breath and Thrown channels. `lightningBladeAbil` is
  // Warlord-only and seeds the destination channel above, so both ends always exist.
  const lightningBladeSlots = [];
  if (lightningBladeAbil) {
    const breathChannel = channelContexts.find(c => c.channelKey === 'lightningBreath');
    lightningBladeSlots.push({ target: breathChannel,
      source: channelContexts.find(c => c.channelKey === 'thrown') || breathChannel });
  }
  // Chaos Channels' admission gate is the permanent record, and it is read there: `ctx.base`,
  // the record `a:baseCopy` publishes, rather than the card's `rtb`/`rtbType` input the slot
  // context was built from (F244.3i). The three DOS builds are the only readers — the gate is
  // reached only where `ccIndependentChannels` is false — and both DOS call sites stand after
  // `a:baseCopy` in their chains (`c:chaosChannels:fireBreath`, and MoM 1.31's
  // `c:chaosChannels:fireBreath:recompute` behind it), so the record is published when they ask.
  //
  // The type test is the shared byte's permanent identity spelled in the two fields the record
  // keeps it in: `rtbTypeRaw === 'none' || rtbTypeRaw === 'thrown'` is "no ranged type, and no
  // thrown type other than plain Thrown". A gaze template leaves both fields `none` and is
  // refused by `hasGazeAttack`, which is the structural half — which mirrors the record carries,
  // plus two card marks that are not record fields.
  //
  // The Doom Gaze half is the record's own `doomGaze`, read here rather than off the card's
  // ability value. In the DOS engines that field is a mirror of the same shared byte, seeded by
  // `template:stat:base`, so a permanent record whose Doom Gaze the card does not state is
  // answered as the record has it, not as the card does. Eye of Heaven is no longer one of the
  // ways the two can disagree: its zeroing is a Warlord region-`d` step, which is both after
  // `a:baseCopy` and in a version this gate never runs in (F258.2).
  //
  // Whether the slot is free for the write stays the block's own live read.
  const ccDosBreathEligibleAt = (runCtx, context) => {
    const base = runCtx.base;
    return base[context.rangedTypeField] === 'none'
      && (base[context.thrownTypeField] === 'none' || base[context.thrownTypeField] === 'thrown')
      && !context.hasGazeAttack
      && !(base.doomGaze > 0)
      && base[context.strengthField] <= ccDosBaseRangedMax;
  };
  const ccGrantsThisSlot = (u, context, runCtx) => context.ccFireBreathAbil
    && context.ccOwnsThisSlot
    && (ccIndependentChannels ? u[context.rangedTypeField] === 'none'
      : ccDosBreathEligibleAt(runCtx, context));
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
  // A factory over the run context rather than a bare pick: the material tail's Fantastic term
  // reads `ctx.base`, and the pick signature the To-Hit walk uses carries the per-channel
  // derivation context in that slot, not the sequence one (F244.3h).
  const heavenlyLightHitPickAt = isCoM1
    ? runCtx => (u, context, kind) => {
      if (!heavenlyLightMaterialTail(u, runCtx) || u[context.strengthField] <= 0) return 0;
      if (kind === 'thrown') return 10;
      if (kind === 'ranged') return isNonMagicalRangedFieldSlot(u, context) ? 10 : 0;
      return 0;
    }
    : runCtx => makeSecondaryHitPick(
      u => heavenlyLightMaterialTail(u, runCtx),
      u => heavenlyLightThrownToHit(u, runCtx));
  const holyWeaponHitPick = makeSecondaryHitPick(hwActive,
    hwActive && version !== 'mom_1.31' ? 10 : 0);
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
  // `wpn` is the material's bonus row, read off the record at this step's own position:
  // `training:weaponQuality` (and, in Warlord, `training:artificer`) put the quality there
  // and `debuffs:rust:material` may have cleared it, which is the state both engines' material gate asks about.
  const weaponMaterialBonus = u => weaponBonus(u.weaponMaterial);
  const weaponHitRanged = (u, context) => (weaponMaterialBonus(u).toHit !== 0
    && materialSecondaryOpen
    && isNonMagicalRangedFieldSlot(u, context) ? weaponMaterialBonus(u).toHit : 0);
  // `if Units[i].thrown > 0 then Inc(Units[i].hitchancethrown, …)`
  // (Units.RecalculateUnits.pas:660-662): the modern threshold is gated on the **calculated**
  // Thrown strength at this position, which by `c:weapon` has already seen region `b` and
  // `c:focusMagic`. The DOS body writes `ranged_tohit++` inside its one type-only gate
  // (`unitcalc.c`, 131:0x8F0DD) and makes no strength test at all.
  const weaponHitThrown = (u, context) => (weaponMaterialBonus(u).toHit !== 0
    && materialSecondaryOpen
    && slotHasThrown(u, context) && (!isCoM2 || u[context.strengthField] > 0)
    ? weaponMaterialBonus(u).toHit : 0);
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
  // PROVENANCE[weapon]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:40:bc81a9f3b6ba3703d596d756 | Reference docs/DOS reconstructed/unitcalc.c@span:15:9b957c6ff1d6ae8d9afca04b | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:40:eae87788c081c49037f75656 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:2cc8f80e45e1482ee9229fd8 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:06ea8c358024e0163de78588 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:7171af67ce10b8422e044eff
  // Both engines gate the whole material block on the material itself: `if EncMagic or
  // EncMithril or EncAdamant` at $00598D91, and `if (quality > 0)` over
  // `mutations & UM_WEAPON_QUALITY_MASK` in every DOS build. Everything inside is the
  // material's own magnitude, so a normal weapon is a block neither engine enters.
  const hasWeaponMaterial = u => u.weaponMaterial !== 'normal';
  const weaponStatSteps = [
    statStep({ id: 'weapon', phase: 'c',
      writes: ['def', 'atk', ...strengthFields,
        'toHitMelee', ...secondaryHitFieldsFor(['ranged', 'thrown'])],
      when: u => hasWeaponMaterial(u),
      apply: (u, runCtx) => {
        const wpn = weaponMaterialBonus(u);
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
  // (UnitCalcPre.CAS!NOTHERO!+3..+17 "IF (GETENCHANTMENTFLAG(U,EncFieryFury,0)=0) THEN { GOTO"), the blades in `c` — and do not stack, which the bucket model
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
  // PROVENANCE[flameBlade]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:4:549122cfd5e672f77f13100e | Reference docs/DOS reconstructed/unitcalc.c@span:15:f6e8770f05c1d997df898eec | Reference docs/DOS reconstructed/unitcalc.c@span:13:bf6a11bc7e2e0a1492be8f9a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:98daf6b1cfd836c4a184f151 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:3:a6c1282e7bba499b7b5ef5f3 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:3:d7cdec7c168e641613b36c19
  // `b:fieryFury` (`UnitCalcPre.CAS!NOTHERO!+3..+17 "IF (GETENCHANTMENTFLAG(U,EncFieryFury,0)=0) THEN { GOTO"`) adds 2 to a physical ranged or Thrown field. The
  // blade step below subtracts what that block wrote, so both ask the same live test — each at
  // its own position, which agree wherever the blade's own narrower gate fires.
  const fieryFuryRtbWrite = (u, context, runCtx) => (ffRegularBonusAt(runCtx)
    && (slotHasPhysicalRanged(u, context) || slotHasThrown(u, context)) ? 2 : 0);
  // MoM's block adds 2 melee, the CoM engines' 3 (`MODDING.INI` FlameBladeAttackBonus).
  const bladeMeleeBonus = isCoMVersion ? 3 : 2;
  const flameBladeStep = statStep({
    id: 'flameBlade', phase: 'c', writes: ['atk', ...strengthFields],
    when: u => hasWarlordBladeAt(u) || nonWarlordFlameBlade,
    // `runCtx`, not `context`: the loop below reuses that name for this file's per-channel
    // derivation context, while the runner passes the sequence context carrying `base`.
    apply: (u, runCtx) => {
      if (hasMeleeAttackAt(runCtx)) u.atk += bladeMeleeBonus;
      for (const context of derivationContexts) {
        const liveRangedType = u[context.rangedTypeField];
        const liveThrownType = u[context.thrownTypeField];
        let bladeRtb = 0;
        if (hasWarlordBladeAt(u)) {
          if (liveRangedType === 'missile' || liveThrownType === 'thrown') bladeRtb = 2;
        } else if (fbAtkBonusAt(u) > 0) {
          // MoM Flame Blade boosts missile and thrown; CoM 1's block nopped the Thrown test
          // (`unitcalc.c` com1:0x8F596-0x8F59B), so it boosts missile only — Warlord, handled
          // above, re-adds Thrown.
          const fbThrownEligible = !isCoMVersion;
          if (liveRangedType === 'missile' || (fbThrownEligible && liveThrownType === 'thrown')) {
            bladeRtb = fbAtkBonusAt(u);
          }
        }
        u[context.strengthField] += Math.max(0, bladeRtb - fieryFuryRtbWrite(u, context, runCtx));
      }
    },
  });

  // Warlord True Light is its own UnitCalcPre.CAS block (UnitCalcPre.CAS!NOUPLIFTSPEECH!+3..+34 "IF ((HASCOMBATGLOBAL(W,CGTrueLight,1))=0)" "!NOTRUELIGHT!"), after Rally and before
  // Plague. The DOS builds execute their distinct True Light block after Prayer and before
  // Darkness in region c. Keep both as one atomic multi-field write at their engine phase.
  // PROVENANCE[trueLight]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:30:307377331fcb02be6a7a1275
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
    altarOfTheSun, altarOfTheSunHolyMother, armorTrainingInputAt, badMoonActiveAt,
    baseDoomGaze, baseGazeRanged,
    baseToBlkMod, baseToHitMod, baseToHitRtbMod,
    baseHitChance, baseHitMelee, modernSecondaryHitMod,
    blazeOfGloryActive, bombsGrenadesActive, explosiveEligibleAt,
    calcBaseAtk, calcBaseDef, calcBaseHP, calcBaseRes,
    ccFireBreathStrength, ccIndependentChannels,
    chaosSurgeCount, chaosSurgeMeleeBonus, chaosSurgeResBonus,
    chaosSurgeRtbBonus, charmOfLifeActive,
    channels: derivationContexts, recordContext, strengthFields, rangedTypeFields,
    thrownTypeFields, secondaryHitTargets, secondaryHitFields, secondaryHitFieldsFor,
    classicBerserk, colossalScaled, colossalStrength, com1DivineBarrierAura,
    com1GuidingBeaconAura, com1SoulLinkerAura, darkForceActive, darknessAtkBonus,
    darknessDefBonus, darknessResBonus, destinyActive, disciplineActiveAt, disciplineAtkMod,
    disciplineDefMod, doomGazeLvlMod, dosTrueLightStep, dragonMound,
    enduranceActive, enduranceDefMod, enduranceHpMod, energyCannonResearchAt, energyCannonHitField,
    baseFigs, ccGrantsThisSlot, eternalNightEnemyResPenalty, ffMeleeBonusAt, ffRegularBonusAt,
    lightningBladeSlots,
    fieryFuryRtbWrite, focusMagicBranchSlots, poxHostIsGoblin, shadowStrikeActive,
    soulFlayLevels, warlordFlameBladeOwnsSlot, weaknessBinaryHits, weaknessPenalty,
    flameBladeStep, focusMagicActive,
    gazeLvlMod, gazeWarpHalves, goblinPoxAtkMod, hasGazeRangedSlot, hasDoomGazeSlot, gazeDisabled,
    blazingEyesActive,
    goblinPoxDefMod, goblinPoxResMod, godsPlayDicesResMod, goodMoonActiveAt,
    greatUnbindingActive, hasDarkness, hasMeleeAttackAt,
    heavenlyLightActive, heavenlyLightMeleeToHitAt,
    heavenlyLightThrownToHit,
    holyArmorActive, hurricaneActive, hwMeleeToHit, identity,
    input, inputBaseAtk,
    // The permanent unit type, for the one `training` gate that reads it: the Lava Smelter block's
    // `BASEFANTASTIC` test (`lavaSmelterGrantSteps`, `stats_identity.js`). A `training` step runs
    // before `a:baseCopy`, so the permanent record is a closure constant there, not `ctx.base`.
    baseUnitType,
    isCoM1, isCoM2, isCoMVersion, isWarlord, landLinkingEligible,
    levelInput, lionheartHpMod,
    ludusAgoge, constructCatapult, weaponTrainingInputAt, rustActiveAt,
    marionette, marionetteAttackBonus, marionetteDefenseBonus, marionetteOwned,
    marionetteStrayed,
    motherFungus,
    naturalSelectionCoalAt, naturalSelectionIronAt, naturalSelectionNightshadeAt,
    naturalSelectionNightshadeCount, naturalSelectionPowerMineralsAt,
    naturalSelectionPowerMineralsCountAt, naturalSelectionEligibleAt,
    natureConjunctionActiveAt, natureLinkActive, nodeAuraActive,
    orihalconActive, outlanderReform,
    pillarOfFaithAt, pillarOfFaithCountAt, plagueActive,
    poolOfRepentance, poxHostActive,
    realmWardActive, sanctaBasilica,
    soulFlayActiveAt, soulFlayAtkMod, soulFlayDefMod, soulFlayResMod,
    heavenlyLightHitPickAt, holyWeaponHitPick, spellWardActive, supremeLightEligibleAt,
    survivalInstinctToBlkBonus, unitIsChaos,
    // The calculated unit type at a step's own position, for `c:shatter`'s target class (F246).
    unitTypeAt,
    uphillBattleActive, vampirismActive,
    venomActive,
    version, vertigoBlockPenalty, vertigoHitPenalty, warlordBerserk,
    warlordCombatFlameBlade, warlordEternalNightActive, warlordTrueLightStep,
    warpRealityActive, weaponStatSteps, wofDefenderBonusActiveAt,
    markedAbilities: effectiveAbilities, eyeOfHeavenActive: !!effectiveAbilities.eyeOfHeaven,
    // The card's own ability set, before any pre-sequence transform ran. Only the `buffs:*:cast`
    // steps read it, and they must: a `buffs:<key>:cast` step claims *the cast wrote this flag*,
    // and `markedAbilities` above cannot support that claim because it also carries the
    // Marionette book package's grants of `resistMagic` and `rebuild`. The two maps agree on
    // every other key those steps write (F244.3d review, finding 1).
    cardAbilities: suppliedAbilities,
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
  // U.EnchantmentFlags[EncMagic] := True`, a region-`c` block of its own at
  // $005A1217..$005A1271 (Units.RecalculateUnits.pas:1813-1815), between the Holy Weapon channel
  // block that ends at $005A1217 and the Chaos Surge block that begins at $005A1271 — which makes
  // `c:chaosSurge` the chain entry it sits immediately before (F188). This is now the rule's only
  // consumer: F195 removed the second one from Spell Ward, whose block tests realm alone.
  // A fact the record does not carry cannot be read at its own step, so the identity is
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
  // `slots` carries the gates that are **not** position-dependent, so a slot can hold them.
  // `melee` is the permanent record's `B.attack > 0`, which
  // the phases ahead of `a:baseCopy` settle, so it is the predicate over the run context rather
  // than a boolean (F133). `persistentRanged` is the aura pass's
  // `B.ranged > 0` (Units.RecalculateUnits.pas:2535, :2599): the **permanent** record's Ranged
  // field carrying strength, with no test of what type stands in it and none of what the
  // calculated record now holds. It is a predicate over the run context for the same reason
  // `melee` is: the record it names is `ctx.base`, which `a:baseCopy` publishes, not the card's
  // channel input (F244.3i) — and in Warlord the two differ, because eight permanent-phase steps
  // write an attack field before the copy. Both readers, `e:holyBonus` and `e:mislead`, stand in
  // region `e`, well behind it.
  //
  // Which slot that field is, is record structure — the modern
  // `ranged` channel is `SRanged`; the DOS-shaped shared slot is the Ranged field only while its
  // permanent type is a conventional ranged one, since one value stands there for ranged,
  // Thrown, Breath or a gaze, and that type is read off the same copied record.
  // `hasPermanentRangedStat` keeps its own narrower job: the
  // `CreateUnit.CAS` city gates, which do read a permanent ranged *type* and, being `training`
  // writes, run four phases ahead of the copy.
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
        ? (runCtx => context.channelKey === 'ranged'
          && runCtx.base[context.strengthField] > 0)
        : (runCtx => runCtx.base[context.strengthField] > 0
          && RANGED_TYPES.includes(runCtx.base[context.rangedTypeField])),
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
    // The non-stat ability fields, seeded by origin rather than wholesale (F244.3b). The rule
    // F244 states is that the record starts as the roster template and nothing else, so a key is
    // seeded only where `Calculator/stats_origins.js` gives it a `template` row in this version;
    // every other origin is a positioned write. `seedNonStatRecordFields` below is that rule, and
    // it has no exceptions left: F244.3c positioned the Lava Smelter five, F244.3d the Outlander
    // four, F244.3e the reform's last seven, F244.3f the strayed Marionette's eight and F244.3g the
    // owned branch's thirty-one, which was the last entry on the declared-carry list.
    //
    // Seven ability fields carry a value rather than a flag and are seeded verbatim rather than
    // through `!!` (F201): `lifeSteal`, because Pneuma Field's `SETSTAT(U,AFLifeSteal,…)` is a
    // write to a unit field at a position like any other, and `poison`, because four blocks in a
    // row make the script's `<>100` increment on it. Both are template-intrinsic in all five
    // engines, so both keep their seed. `discipline` is the third and is template-intrinsic
    // nowhere: it has no roster row, so its seed is empty and `training:militaryDrilling` and
    // `buffs:discipline:cast` are its only sources (F244.3d). `stoningTouch`, `exorcise` and
    // `destruction` joined them in F244.3g, all three template-intrinsic where their control is
    // offered and all three overwritten by the owned Marionette's ascension arm — the script's
    // `SETSTAT(U,AF…,0,<n>,1)` is an assignment. `regeneration` is the seventh and the one
    // *increment* in that branch, with no control and no template row anywhere, so
    // `b:marionette:ascension:regeneration` is its only source.
    ...seedNonStatRecordFields(version, effectiveAbilities, suppliedAbilities),
    // The calculated identity is part of the record, seeded from the permanent one. Every
    // conversion is a positioned write to these two fields (F163).
    race: identity.baseRace, fantastic: identity.baseFantastic,
    // The persistent loadout and veterancy fields, seeded at the roster template's values — a
    // unit ships unequipped and at Recruit, and every departure from that is a positioned write:
    // `training:weaponQuality`, `training:armorQuality` and `training:veterancy` for what the
    // training city left, `training:artificer` and `template:constructCatapult:weapon` for the two
    // quality writes made elsewhere, `debuffs:rust:material` and `buffs:destiny:level` for what a cast
    // took back (F244.2).
    weaponMaterial: 'normal', armorMaterial: 'normal', level: 'normal' };
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
  // The identity the recalculation **left**, which is what every combat-time classification asks
  // for: the published unit type, the `liveRace` / `liveFantastic` pair combat resolution is
  // handed, Supreme Light's published eligibility and the `identityAtRank` fallback. It is read
  // off the record the run produced rather than projected ahead of it, so there is nothing left to
  // assert agreement with — the assertion F246 deleted existed only to check that projection.
  const finishedIdentity = identityAt(statUnit);
  const finishedUnitType = unitTypeAt(statUnit);
  // A sample whose rank no emitted step reaches is the finished record: nothing after that rank
  // writes anything, identity included.
  const identityAtRank = (key) => identitySamples.get(key) || finishedIdentity;
  // `a:baseCopy` is in every version's chain and has no predicate, so an absent record is a
  // composition defect, not a shape a derivation can legitimately have.
  //
  // The agreement check that stood beside this one is gone with F262. It compared `a:baseCopy`'s
  // published Fantastic flag against `permanentFantastic`, the pre-sequence snapshot the two
  // loadout gates and the Outlander reform used to read; neither reader exists now, so there is
  // no second answer left to disagree. The manifest ordering it also caught — a chain ranking
  // `buffs:destiny` ahead of `buffs:spiritLink:fantastic` — is not restated as an assertion: the
  // manifest is the ordering authority, so a check reading it would assert a constant against
  // itself. It is defended by measurement, at the preset
  // `spiritLinkApotheosisKeepsPermanentFantasticWarlord`, which is the only fixture in the corpus
  // marking both writes; swapping the two chain entries moves it from 2.0 to 8.0.
  const baseRecord = statRunContext.base;
  if (!baseRecord) {
    throw new Error(
      `deriveUnitStats: no step published the permanent record for ${version}; `
      + 'a:baseCopy is missing from the composed sequence.');
  }
  // The weapon material the sequence leaves on the record. Every consumer below is a **result**
  // field — the Weapon-Immunity bypass and the modern EncMagic flag, both read by combat
  // resolution rather than by a step — so each is computed here, from the finished record, rather
  // than from a pre-sequence constant: the material is written at `training:weaponQuality` and
  // `training:artificer` and cleared at `debuffs:rust:material`, and this is the state those writes
  // leave
  // (F244.2).
  const finishedWeaponMaterial = statUnit.weaponMaterial;
  const weaponUpgradedByHW = hwActive && finishedWeaponMaterial === 'normal';
  // Two effects with different scopes shared one test here: Wraith Form is an all-versions
  // enchantment whose bypass arm is CoM 1 on, while Ruler of Underworld is Caster.exe only —
  // `PROVENANCE[rulerOfUnderworldEligibility]` (`combat_special_attacks.js`) carries the two
  // modern builds alone, and its `GEKingOfUnderworld` grant is the compiled
  // `U.EnchantmentFlags[EncWraithForm] := True` at Units.RecalculateUnits.pas:1515-1517. So
  // `startsWith('com')` wrongly admitted it into CoM 1; each disjunct now carries its own scope.
  const wraithFormBypassesWI = finishedWeaponMaterial === 'normal'
    && !!abilities
    && ((version.startsWith('com') && !!abilities.wraithForm)
      || rulerOfUnderworldActiveForUnit(abilities, version));
  // Warlord Wall of Fire's defender bonus mirrors Metal Fires: "their attacks can ignore Weapon
  // Immunity" (`Unit rosters/Warlord mod unit data/HELP.TXT:2761`), for its non-magic attacks.
  const weaponUpgradedByWoF = wofDefenderBonusActiveAt(statRunContext)
    && finishedWeaponMaterial === 'normal';
  // Note: Eldritch Weapon also upgrades a normal weapon to magic, but ONLY for the melee attack:
  // its first bonus turns the enchanted unit's Melee Attack into a Magical Melee Attack, and it
  // names no other channel (`Reference docs/MoM source - Fandom site/Eldritch Weapon.md`,
  // *Magical Attack*). It is therefore NOT folded into
  // this global weapon type — it is applied to the melee Weapon-Immunity check only
  // (see meleeWeaponWI in combat_effects.js). Its ranged/thrown attacks stay non-magical, so
  // Weapon Immunity still raises the target's defense against them.
  const weaponUpgradedByHeavenlyLight = heavenlyLightActive && finishedWeaponMaterial === 'normal';
  const effectiveWeapon = ((fbAtkBonusAt(statUnit) > 0 || metalFiresActiveAt(statUnit))
      && finishedWeaponMaterial === 'normal') ? 'magic'
    : (ffRegularBonusAt(statRunContext) && finishedWeaponMaterial === 'normal') ? 'magic'
    : (weaponUpgradedByHW ? 'magic'
    : (wraithFormBypassesWI ? 'magic'
    : (weaponUpgradedByWoF ? 'magic'
    : (weaponUpgradedByHeavenlyLight ? 'magic'
    : finishedWeaponMaterial))));
  // ApplyAttack passes `EncMagic or magicranged` to EffectiveDefense. Keep EncMagic as
  // calculated state instead of approximating it later from weapon quality and final unit
  // type. Only the material grant made by `ApplyMagicWeapons` can be suppressed by an enemy
  // King/Ruler of Underworld: a rival `GEKingOfUnderworld` clears the local `b` and so skips
  // `Units[i].EnchantmentFlags[EncMagic] := True` alone, clearing neither an existing flag nor
  // any material stat or To-Hit write below it (Units.RecalculateUnits.pas:613-626, $00598EA7).
  // Independent EncMagic writes therefore survive whether they occur before that helper (hero
  // standing and Warlord Wall of Fire) or after it.
  const modernEncMagicFromMaterial = version.startsWith('com2_')
    && finishedWeaponMaterial !== 'normal';
  const modernEncMagicIndependentOfMaterial = modernEncMagicOtherTermsAt(statUnit, statRunContext)
    || (version.startsWith('com2_') && !!identityAtRank('c:chaosSurge').fantastic);
  const modernEncMagic = modernEncMagicFromMaterial || modernEncMagicIndependentOfMaterial;
  identity.race = statUnit.race;
  identity.fantastic = !!statUnit.fantastic;
  const hp = statUnit.hp;
  const effectiveGazeRanged = statUnit.gaze;
  const effectiveDoomGaze = statUnit.doomGaze;
  const finalRangedType = statUnit[recordContext.rangedTypeField];
  const finalThrownType = statUnit[recordContext.thrownTypeField];
  // Psycho Force and Pneuma Field are steps in `d` — `UnitCalc.CAS!COMBATOVERRIDE!+13..+17 "IF (SPELLSTATE(W,STMagitekPsycheForceConverter)=2) THEN {" "}"` and `UnitCalc.CAS!COMBATOVERRIDE!+19..+25 "IF (SPELLSTATE(W,STMagitekPneumaReactor)=2) THEN {" "SETSTAT(U,AFLifeSteal,0,PNEUMA,1);"`,
  // on `PROVENANCE[psychoForce]` and `PROVENANCE[pneumaField]` (`stats_sequence.js`) — so their
  // reads of Resistance happen where the engine takes them. Warp Resist having zeroed Resistance
  // is supplied by construction, since `warpResist` is a step in `c`.
  // The curse flags combat resolution reads — Black Sleep, Vertigo and Mind Storm among them —
  // are record fields now, so the published set takes them from the record the sequence leaves
  // rather than from the pre-strip ability map (F199). Temporal Twist is no longer one of them:
  // F244.3a reclassified it as a side-wide combat global that no per-unit record carries.
  const curseGatedAbilities = { ...effectiveAbilities,
    // The four combat-time classifications, off the record the run left rather than off a
    // projection taken ahead of it (F246). Supreme Light's own steps carry the same predicate as
    // their `when`, so the key here is a published normalization only, with no reader in
    // `combat_*.js` (F201 stage 2 filed it as F207).
    unitType: finishedUnitType,
    liveRace: finishedIdentity.race,
    liveFantastic: finishedIdentity.fantastic,
    supremeLight: supremeLightActiveForUnit(abilities, finishedUnitType, version, {
      liveRangedType: recordContext.baseSequenceRangedType,
      baseRangedType: recordContext.rtbTypeRaw,
    }) ? abilities.supremeLight : false,
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
  // Combat Discipline cancels an opposing First Strike from Elite (rank 3) up. It is a result
  // field, read by the exchange rather than by a step, so both of its terms come off the finished
  // record — the level `training:veterancy` wrote, less whatever `buffs:destiny:level` and
  // `c:level:fantastic` took back (F244.2), and the Discipline value `training:militaryDrilling`
  // and `buffs:discipline:cast` left (F244.3d).
  const combatDisciplineNegatesFirstStrike = statUnit.discipline === 'combat'
    && levelRankOf(statUnit.level) >= 3;
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
  // Eye of Heaven's other two writes. `SETSTAT(U,SStoningGaze,0,100)` and
  // `SETSTAT(U,SDeathGaze,0,100)` write the block's "no gaze attack" sentinel, and the two fields
  // they name are card marks in this model rather than record fields — neither is in
  // `SEEDED_NON_STAT_KEYS`, so there is nothing on the record for a step to write and no
  // `ctx.base` to read them off. Their stand-in is therefore this resolution-time strip, which is
  // where the marks live. The block's third write, `SETSTAT(U,SDoomGaze,0,0)`, *is* a record write
  // and is `d:eyeOfHeaven:enemyGaze` (`stats_sequence.js`); `doomGaze` is repeated here only
  // because the modern arm of `shapedGazeAbilities` above does not project the derived field onto
  // the published ability set, so without it the set would still echo the card's mark while the
  // record the step left reads 0.
  let combatAbilities = gazeDisabled
    ? { ...shapedGazeAbilities, stoningGaze: null, deathGaze: null, doomGaze: 0 }
    : shapedGazeAbilities;
  // Rust's `SETSTAT(U,ALargeShield,0,0)` (`UnitCalc.CAS!NOTCITY!+16 "SETSTAT(U,ALargeShield,0,0);"`) is a field of `d:rust` now, inside
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
  // The Power Engine flag is read off the record the run leaves, which is where
  // `training:powerEngine` left it (F244.3d); the record half of the research gate is read off
  // `statRunContext.base`, the same permanent record `d:energyCannonThreshold` asks at its own
  // rank (F244.3i). This projection and that step transcribe one script block, so a record read
  // they did not share would let the threshold be taken and the rider not written, or the
  // reverse.
  if (energyCannonResearchAt(statRunContext) && statUnit.powerEngine) {
    // UnitCalc.CAS!NOTOUTLANDERSOLDIER!+7..+15 "DESTRUCTION=GETSTAT(U,AFDestruction,0,3);" "SETSTAT(U,AFDestruction,0,DESTRUCTION,3);" reads the unit's To-Hit + Ranged To-Hit
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
  // on the eligible opponent units for the rest of battle (the −2 Resistance is folded
  // into res above). The eligibility disjunction is stated at `greatUnbindingActive` above.
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
  // (`stats_sequence.js`), and `training:energyCannon` does the same for Warlord's Beam conversion, so
  // the finished field is neither missile nor boulder while the permanent one was — measured by
  // `focusMagicRetypeSkipsDistancePenaltyCoM2` against `distPenaltyCoM2_6`. Warlord's
  // `d:blazeOfGlory` is *not* one of those cases, though it also retypes: it empties the Ranged
  // field onto Thrown (`UnitCalc.CAS!IMMUNETOROT!+18..+24 "BLAZETHROWN=GetStat(U,SRanged,0);" "SETSTAT(U,SRanged,0,((GetStat(U,SRanged,0))-BLAZETHROWN));"`), the finished record then carries no conventional
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
      // The ledger is projected from the stat sequence, so it inherits that sequence's boundary
      // as a marker of its own: a To-Hit chain crosses from the record's stored thresholds to
      // the recalculation exactly where the stat chains do. It projects a position, not a
      // write, so it contributes no delta and its `apply` is empty.
      if (event.boundary) {
        chanceContributions.push({
          id: `chance:${event.id}`, source: event.source, phase: event.phase, order: event.order,
          deltas: {}, projectionOf: `${event.phase}:${event.id}`, boundary: true,
          serial: chanceSerial++,
        });
        continue;
      }
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
    // PROVENANCE[chance:distancePenalty]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/combat.c@span:28:4d6d2024c9551eae456f2bbf | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:21:b13db6265b2feaabf81fb261 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:6:791acb631b8f903c2812da35 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:6:791acb631b8f903c2812da35
    addChanceDelta('chance:distancePenalty', { id: 'distancePenalty', label: 'Range distance' },
      'attackSpecific', -100, [chanceFields.rtb], distancePenaltyFor(context));

    // Contribution order is the order the writes execute, in every version. A projection
    // re-presents the ordered ledger; it does not re-sequence it.
    // STAT-FORMULA[chance:dynamicProjection]
    // PROVENANCE[chance:dynamicProjection]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:8afd898f274ed76b7474ccfc | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:5d84b2c3857f747269473386 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:10:013e80fc5cd1dea733651726
    const chanceSteps = chanceContributions.map(item => statStep({
      id: item.id, sourceId: item.source.id, sourceLabel: item.source.label,
      phase: item.phase, writes: Object.keys(item.deltas),
      ...(item.projectionOf ? { projectionOf: item.projectionOf } : {}),
      ...(item.boundary ? { boundary: true } : {}),
      apply: u => {
        for (const [field, value] of Object.entries(item.deltas)) u[field] += value;
      },
    }));
    chanceSteps.push(
      // AttackRoll floors To Hit at 10, then compares Random(100) directly with the supplied
      // threshold. The late aura pass can raise the already-clamped record above 100, and range
      // penalties are applied after recalculation, so project the actual comparison boundary here.
      // PROVENANCE[chance:attackRollProbabilityBound]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:9:a1152c71125049b18e8745a4
      statStep({ id: 'chance:attackRollProbabilityBound', sourceId: 'attackRoll',
        sourceLabel: 'Attack-roll threshold', phase: 'attackSpecific', writes: allHitFields,
        when: () => isCoM2, apply: u => {
          for (const field of allHitFields) u[field] = Math.max(10, Math.min(100, u[field]));
        } }),
      // DefenseRoll compares Random(100), whose output is 0..99, directly against the
      // signed record value. Project that comparison to the calculator's To-Block probability
      // without pretending Caster.exe wrote a region-e To-Defend clamp.
      // PROVENANCE[chance:toBlockProbabilityBound]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:12:08b392da258c1aa5831668e7
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
    // PROVENANCE[altarOfTheSun:figures]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS@span:12:08e36e60187df8bc650c42c7
    statStep({ id: 'altarOfTheSun:figures', sourceId: 'altarOfTheSun',
      sourceLabel: 'Altar of the Sun', phase: 'training', writes: ['figs'],
      when: () => altarOfTheSun, apply: u => { u.figs += 1; } }),
    // PROVENANCE[alumniOfAcademy:figures]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS@span:10:848b52c34c24d8642625dae6 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:18:55478fbb88ad8926f0ce7c78
    statStep({ id: 'alumniOfAcademy:figures', sourceId: 'alumniOfAcademy',
      sourceLabel: 'Academy', phase: 'training', writes: ['figs'],
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

  const toHitMeleeHasModifiers = traceHasWrites(modifierTraces.toHitMelee);
  const toHitRtbHasModifiers = traceHasWrites(modifierTraces.toHitShared);
  const toBlockHasModifiers = traceHasWrites(modifierTraces.toBlock);

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
    rtbToHitLvlBonus: getLevelBonuses(statUnit.level, version).toHit,
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
    // The material and ladder rows the sequence resolved from the record, republished for the
    // card and for the identity regression that pins Construct Catapult's Magic Weapons.
    wpn: weaponBonus(finishedWeaponMaterial), lvl: getLevelBonuses(statUnit.level, version),
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
