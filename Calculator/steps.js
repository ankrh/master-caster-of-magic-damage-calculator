// --- Stat transform steps (R1) ---
// The single mechanism for stat derivation: a phase-tagged sequence of steps over a
// mutable unit record. See SPEC.md, *Stat derivation contract*; completion history is in
// Calculator/HISTORY.md.
//
// One step is one engine write, made at the position the engine makes it. Additive,
// scaling, replacing and short-circuiting effects are all the same shape, because the
// engine makes them all the same way. A step may read any field's *current* value —
// that is what its position means — and the permanent base record through `ctx.base`.
//
// No DOM dependencies; loaded before the combat_*.js and stats*.js sources.

// Returned by a step's apply() to stop the sequence. `EffectiveDefense` step 2 needs it
// (Illusion against a defender without Illusion Immunity returns immediately, so no
// later bonus or immunity applies); nothing in the derivation phases does.
const HALT = Object.freeze({ halt: true });

// Provenance labels for where a write was found, listed in region order. The five permanent-record
// phases, then the engine's five derivation regions, followed by the separate attack-specific
// axis. A phase orders nothing — the per-version execution chain does (stats_manifests.js,
// statChain) — but a chain is authored in non-decreasing phase order, so the two have to agree:
//   template   the record as the unit template ships it, plus the construction patches
//   training   written once, when the city built the unit  (CreateUnit.CAS)
//   immunities the immunities the card marks, in the permanent record before anything tests
//              them. Its entries are the marked immunities whose calc key more than one control
//              can set; a curse an immunity would have refused is declined at its own `debuffs`
//              write rather than stripped here
//   buffs      each beneficial enchantment or condition the card marks, written where the
//              engine's own eligibility test admits it (OLSpell.CAS and the other grant sites),
//              and the permanent writes a recalculation re-makes on every pass
//   debuffs    the same for curses and detrimental conditions, after every buff, so a marked
//              immunity or an identity-changing buff is in place when the debuff's test runs
//   a          precalc, in the binary, opening with the `Units[i] := BaseUnits[i]` copy that
//              publishes the permanent record the five phases above wrote
//   b          precalc, in UnitCalcPre.CAS      (Warlord only)
//   c          magic calc, in the binary
//   d          magic calc, in UnitCalc.CAS      (Warlord only)
//   e          the binary's post-hook tail: the final clamps, the aura pass, Supreme Light
//
// The order within `buffs` and within `debuffs` is an assumed cast order, not a derivation: the
// calculator has no cast history, so each chain declares it (stats_manifests.js) and it is a
// ruling rather than something a source fixes.
//
// `attackSpecific` is not an eleventh derivation phase. It tags steps in the routines that run on
// a disposable copy after derivation, keyed by an incoming attack: Caster.exe's
// GetEffectiveResistance / EffectiveDefense, and the DOS engines' Combat_Effective_Resistance /
// Battle_Unit_Defense_Special. Every engine models the stage as ordered steps; what differs is
// the routine each list transcribes, and each list carries its own version scope below.
//
// Every other phase is an engine region. The two scaffolding phases the migration ran on —
// `tail` (a post-total pass over finished stats) and `warpLate` (CoM 1's post-Warp tail) —
// were deleted at R1 stage 10, when each of their steps moved to the region the map gives it.
const STEP_PHASES = [
  'template', 'training', 'immunities', 'buffs', 'debuffs',
  'a', 'b', 'c', 'd', 'e', 'attackSpecific',
];
const STEP_PHASE_RANK = STEP_PHASES.reduce((rank, phase, i) => (rank[phase] = i, rank), {});

// A **boundary step** is a step that makes no write of its own and marks a position the engine
// crosses. `a:baseCopy` is the only one: it is the recalculation's `Units[i] := BaseUnits[i]`
// copy, and it publishes `ctx.base`. Because it writes nothing, `writes` is empty — the one
// exception `statStep` allows — and `assertStepWrites` then demands that the record be unchanged
// across it. It still reaches the sparse trace and the projections, as the marker between the
// permanent-record phases and the recalculation.
function isBoundaryStep(step) {
  return !!(step && step.boundary === true);
}

// --- Canonical engine-version scope (M9) ---
//
// Phase says *where* in an engine a write happens; scope says *which engines make it at all*.
// `STEP_VERSION_SCOPES` below is the single home for the second fact, for every phase and for
// the separate attackSpecific lists. It is keyed by `phase:id` — the same key the F20 source
// manifests use — because two step objects may share an id when two engines write the same
// effect from different regions (`b:trueLight` is the Warlord CAS block, `c:trueLight` the DOS
// region-c one).
//
// Scope is an upper bound on applicability, not a firing condition. Inside its scope a step
// still asks `when` whether this particular unit/state fires it; outside its scope the engine
// has no such write, so the step must never contribute. That complement is what the checks
// assert (`tools/node_unit_checks.js`, canonical version scope).
//
// Relationship to the three mechanisms that used to carry this fact:
//   `when` predicates       still gate firing *within* scope; a version test inside a
//                           predicate is now a duplicate of the scope entry, not the home.
//   `subgroup`              is a property of a UI *control* (abilities.js, enchantments.js), not
//                           of a step: several controls map to one calcKey
//                           (`discipline`/`disciplineWarlord`), so it can never be per-step. It
//                           stays the authority for control visibility.
//   PROVENANCE `versions=`  states which builds' sources were reviewed for the formula. Every
//                           entry here is initialised from it and the checks assert the two
//                           agree, except for the recorded gaps where the write is evidenced
//                           for fewer builds than it runs in (see the notes below).
//
// Every derivation sequence is filtered through `filterStepsToVersionScope` before it is
// composed, so this table decides membership rather than merely describing it.
const ENGINE_VERSIONS = Object.freeze([
  'mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.9',
]);

// Named version sets. Every set names its exact members: family labels alone are not a scope.
const SCOPE_ALL = ENGINE_VERSIONS;
const SCOPE_DOS = Object.freeze(['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']);
const SCOPE_MOM = Object.freeze(['mom_1.31', 'mom_cp_1.60.00']);
const SCOPE_MOM_1_31 = Object.freeze(['mom_1.31']);
const SCOPE_MOM_MODERN = Object.freeze([
  'mom_1.31', 'mom_cp_1.60.00', 'com2_1.05.11', 'com2_warlord_1.5.12.9',
]);
const SCOPE_COM1 = Object.freeze(['com_6.08']);
const SCOPE_COM_PLUS = Object.freeze(['com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.9']);
// CoM 1 and base CoM2 only: Warlord replaces the effect rather than omitting it.
const SCOPE_COM1_COM2 = Object.freeze(['com_6.08', 'com2_1.05.11']);
const SCOPE_MODERN = Object.freeze(['com2_1.05.11', 'com2_warlord_1.5.12.9']);
const SCOPE_WARLORD = Object.freeze(['com2_warlord_1.5.12.9']);

const STEP_VERSION_SCOPES = Object.freeze({
  // --- template: the record the unit template ships, plus the construction patches ---
  'template:baseHitChance': SCOPE_MODERN,
  'template:baseThresholds': SCOPE_ALL,
  'template:constructCatapult': SCOPE_COM1,
  'template:constructCatapult:weapon': SCOPE_COM1,
  'template:stat:base': SCOPE_ALL,
  'template:summonBranch': SCOPE_COM1,
  'template:zombies:toBlock': SCOPE_COM1,
  // --- training: permanent writes made when the city built the unit ---
  // The three persistent loadout/veterancy fields every engine reads back. Only Warlord's writer
  // is reconstructed (`CreateUnit.CAS`); the other four builds' positions are deduced, which is
  // what their `DEDUCED_POSITIONS` rows say (`stats_manifests.js`).
  'training:weaponQuality': SCOPE_ALL,
  'training:armorQuality': SCOPE_COM_PLUS,
  'training:veterancy': SCOPE_ALL,
  'training:altarOfTheMoon': SCOPE_WARLORD,
  'training:altarOfTheSun:figures': SCOPE_WARLORD,
  'training:altarOfTheSun:holyMother': SCOPE_WARLORD,
  'training:alumniOfAcademy:figures': SCOPE_WARLORD,
  'training:armorclad': SCOPE_WARLORD,
  'training:artificer': SCOPE_WARLORD,
  'training:dragonMound': SCOPE_WARLORD,
  'training:energyCannon': SCOPE_WARLORD,
  'training:lavaSmelter:weaponImmunity': SCOPE_WARLORD,
  'training:lavaSmelter:missileImmunity': SCOPE_WARLORD,
  'training:lavaSmelter:resistElementsAlias': SCOPE_WARLORD,
  'training:lavaSmelter:elementalProtection': SCOPE_WARLORD,
  'training:lavaSmelter:flameBlade': SCOPE_WARLORD,
  'training:lightningBlade:breath': SCOPE_WARLORD,
  'training:ludusAgoge': SCOPE_WARLORD,
  'training:magitekScience': SCOPE_WARLORD,
  'training:malnourished': SCOPE_WARLORD,
  'training:militaryDrilling': SCOPE_WARLORD,
  'training:militaryWorkshop': SCOPE_WARLORD,
  'training:motherFungus': SCOPE_WARLORD,
  'training:naturalSelection:coal': SCOPE_WARLORD,
  'training:naturalSelection:iron': SCOPE_WARLORD,
  'training:naturalSelection:nightshade': SCOPE_WARLORD,
  'training:naturalSelection:powerMinerals': SCOPE_WARLORD,
  'training:naturalSelection:wildGame': SCOPE_WARLORD,
  'training:pillarOfFaith': SCOPE_WARLORD,
  'training:powerEngine': SCOPE_WARLORD,
  'training:poolOfRepentance': SCOPE_WARLORD,
  'training:sanctaBasilica': SCOPE_WARLORD,
  'training:survivalInstinctToBlock': SCOPE_WARLORD,
  'training:temporalDrive': SCOPE_WARLORD,
  // --- immunities: the immunities the card marks, written before anything tests them. The two
  // keys here are the ones more than one control can set, so the record is the only place their
  // combined value can stand at a rank; every other marked immunity has a single control and rides
  // the template seed. The artificial curse strip that used to be this phase's one entry is gone:
  // a curse is refused at its own `debuffs` write now (F244.3b).
  'immunities:magicImmunity:marked': SCOPE_ALL,
  'immunities:missileImmunity:marked': SCOPE_ALL,
  // --- buffs: beneficial permanent writes made when the spell landed, and the per-pass ones ---
  'buffs:destiny': SCOPE_MODERN,
  'buffs:destiny:supernatural': SCOPE_MODERN,
  'buffs:destiny:level': SCOPE_MODERN,
  'buffs:rebuild': SCOPE_WARLORD,
  // The cast's own write, ahead of the stat package it admits. These five are the
  // `buffs`-origin record keys with no `template` row, so the seed cannot carry them
  // (`permanentCastFlagSteps`, `stats_identity.js`). `discipline` carries a value rather than
  // a flag and is scoped to the two builds whose control offers it.
  'buffs:discipline:cast': SCOPE_MODERN,
  'buffs:haste:cast': SCOPE_ALL,
  'buffs:rebuild:cast': SCOPE_WARLORD,
  'buffs:spellLock:cast': SCOPE_COM_PLUS,
  'buffs:bless:cast': SCOPE_ALL,
  'buffs:resistMagic:cast': SCOPE_ALL,
  'buffs:trueSight:cast': SCOPE_ALL,
  'buffs:spiritLink': SCOPE_WARLORD,
  'buffs:spiritLink:fantastic': SCOPE_WARLORD,
  'buffs:spiritLink:level': SCOPE_WARLORD,
  // --- debuffs: the same for curses and detrimental conditions ---
  'debuffs:rust:material': SCOPE_WARLORD,
  // The nine curse flags an immunity can refuse, each the cast's own permanent write, gated on the
  // immunities standing on the record at this phase (`curseCastSteps`, `stats_identity.js`).
  // `nausea` is Warlord's alone: it is a `UnitCalcPre.CAS` effect with no spell record.
  'debuffs:blackSleep:cast': SCOPE_ALL,
  'debuffs:mindStorm:cast': SCOPE_ALL,
  'debuffs:nausea:cast': SCOPE_WARLORD,
  'debuffs:shatter:cast': SCOPE_ALL,
  'debuffs:vertigo:cast': SCOPE_ALL,
  'debuffs:warpAttack:cast': SCOPE_ALL,
  'debuffs:warpDefense:cast': SCOPE_ALL,
  'debuffs:warpResist:cast': SCOPE_ALL,
  'debuffs:weakness:cast': SCOPE_ALL,
  // --- a: precalc, in the binary ---
  // The head of the region in every engine: the copy that seeds the calculated record from the
  // permanent one. It is a boundary step, so it writes nothing and publishes `ctx.base`.
  'a:baseCopy': SCOPE_ALL,
  // Chaos Channels Fire Breath is region `a` in `Caster.exe` alone: its block is
  // $00599EE8..$00599FA8, ahead of the UnitCalcPre hook at $0059A002. The DOS builds put the
  // same effect inside `BU_Apply_Specials` (131:0x8F720, com1:0x8F474), one block past the
  // demon wings the chains already carry in region `c`, so both of its halves are
  // `c:chaosChannels:fireBreath*` there (F103).
  'a:chaosChannels:fireBreath': SCOPE_MODERN,
  'a:holyBonus': SCOPE_DOS,
  'a:callToArmsPaladins': SCOPE_MODERN,
  'a:chosen': SCOPE_MODERN,
  'a:combatSummoned': SCOPE_MODERN,
  'a:constructCatapult': SCOPE_MODERN,
  'a:chaosChannels:fireBreath:race': SCOPE_MODERN,
  'a:resistanceToAll': SCOPE_DOS,
  // --- b: precalc, in UnitCalcPre.CAS ---
  'b:battleArmor': SCOPE_WARLORD,
  'b:berserkWarlord': SCOPE_WARLORD,
  'b:bombsGrenades': SCOPE_WARLORD,
  'b:nausea': SCOPE_WARLORD,
  'b:disheartenProphecy': SCOPE_WARLORD,
  'b:divineProtection': SCOPE_WARLORD,
  'b:eternalNight:poorVision': SCOPE_WARLORD,
  'b:eyeOfHeaven': SCOPE_WARLORD,
  'b:fieryFury': SCOPE_WARLORD,
  'b:goblinPox': SCOPE_WARLORD,
  'b:godsPlayDices': SCOPE_WARLORD,
  'b:greatUnbinding': SCOPE_WARLORD,
  'b:insulation': SCOPE_WARLORD,
  'b:fieryFury:race': SCOPE_WARLORD,
  'b:marionetteChanneler': SCOPE_WARLORD,
  'b:luckyStar': SCOPE_WARLORD,
  'b:magitekEngine': SCOPE_WARLORD,
  'b:marionette:ascensionRangedType': SCOPE_WARLORD,
  'b:marionette:ascension:armorPiercing': SCOPE_WARLORD,
  'b:marionette:ascension:bless': SCOPE_WARLORD,
  'b:marionette:ascension:bloodSucker': SCOPE_WARLORD,
  'b:marionette:ascension:counterImmunity': SCOPE_WARLORD,
  'b:marionette:ascension:createUndead': SCOPE_WARLORD,
  'b:marionette:ascension:destruction': SCOPE_WARLORD,
  'b:marionette:ascension:exorcise': SCOPE_WARLORD,
  'b:marionette:ascension:healingAura': SCOPE_WARLORD,
  'b:marionette:ascension:illusion': SCOPE_WARLORD,
  'b:marionette:ascension:invisibility': SCOPE_WARLORD,
  'b:marionette:ascension:lifeSteal': SCOPE_WARLORD,
  'b:marionette:ascension:poison': SCOPE_WARLORD,
  'b:marionette:ascension:regeneration': SCOPE_WARLORD,
  'b:marionette:ascension:stoningTouch': SCOPE_WARLORD,
  'b:marionette:ascension:wallCrusher': SCOPE_WARLORD,
  'b:marionette:books:coldImmunity': SCOPE_WARLORD,
  'b:marionette:books:deathImmunity': SCOPE_WARLORD,
  'b:marionette:books:fireImmunity': SCOPE_WARLORD,
  'b:marionette:books:firstStrike': SCOPE_WARLORD,
  'b:marionette:books:forester': SCOPE_WARLORD,
  'b:marionette:books:healer': SCOPE_WARLORD,
  'b:marionette:books:illusionImmunity': SCOPE_WARLORD,
  'b:marionette:books:largeShield': SCOPE_WARLORD,
  'b:marionette:books:lightningResist': SCOPE_WARLORD,
  'b:marionette:books:lucky': SCOPE_WARLORD,
  'b:marionette:books:missileImmunity': SCOPE_WARLORD,
  'b:marionette:books:mountaineer': SCOPE_WARLORD,
  'b:marionette:books:poisonImmunity': SCOPE_WARLORD,
  'b:marionette:books:resistMagic': SCOPE_WARLORD,
  'b:marionette:books:stoningImmunity': SCOPE_WARLORD,
  'b:marionette:books:weaponImmunity': SCOPE_WARLORD,
  'b:marionette:rangedType': SCOPE_WARLORD,
  'b:marionette:stats': SCOPE_WARLORD,
  'b:marionette:spellLock': SCOPE_WARLORD,
  'b:marionette:strayedPackage': SCOPE_WARLORD,
  'b:marionette:strayedTransmute': SCOPE_WARLORD,
  'b:natureLink': SCOPE_WARLORD,
  'b:sanctify': SCOPE_WARLORD,
  'b:outlanderBallisticsTraining': SCOPE_WARLORD,
  'b:outlanderRadio': SCOPE_WARLORD,
  'b:outlanderXenopsychology': SCOPE_WARLORD,
  'b:outlanderXenoveterinary': SCOPE_WARLORD,
  'b:plague': SCOPE_WARLORD,
  'b:prayer': SCOPE_WARLORD,
  'b:rally': SCOPE_WARLORD,
  'b:rebuild': SCOPE_WARLORD,
  'b:soulFlay': SCOPE_WARLORD,
  'b:spiritLink': SCOPE_WARLORD,
  'b:tactician': SCOPE_WARLORD,
  'b:trueLight': SCOPE_WARLORD,
  'b:upgradedExplosive:fireBreath': SCOPE_WARLORD,
  'b:upgradedExplosive:ranged': SCOPE_WARLORD,
  'b:uphillBattle': SCOPE_WARLORD,
  'b:wallOfFire:garrison': SCOPE_WARLORD,
  // --- c: magic calc, in the binary ---
  'c:animated': SCOPE_COM_PLUS,
  'c:badMoon': SCOPE_MODERN,
  'c:berserk': SCOPE_MOM,
  'c:blackChannels': SCOPE_MOM,
  'c:blackPrayer': SCOPE_ALL,
  'c:blazingEyes': SCOPE_MODERN,
  'c:blazingMarch': SCOPE_COM_PLUS,
  'c:blackChannels:race': SCOPE_MOM,
  'c:bloodLust': SCOPE_COM1_COM2,
  'c:breakthrough:combatSummoned': SCOPE_MODERN,
  'c:breakthrough:noncorporeal': SCOPE_MODERN,
  'c:breakthrough:normal': SCOPE_MODERN,
  'c:chaosChannels:armor': SCOPE_ALL,
  'c:chaosChannels:fireBreath': SCOPE_DOS,
  // 1.31 alone passes the mutations byte to the recompute's second `BU_Apply_Specials` call,
  // so it alone re-assigns the shared slot there (F106). The call is 131:0x90A1D; the address
  // and the resulting chain position are carried beside the chain entry in stats_manifests.js.
  'c:chaosChannels:fireBreath:recompute': SCOPE_MOM_1_31,
  'c:chaosChannels:armor:race': SCOPE_ALL,
  'c:chaosChannels:fireBreath:race': SCOPE_DOS,
  'c:chaosChannels:flight': SCOPE_ALL,
  'c:chaosSurge': SCOPE_ALL,
  'c:charmOfLife': SCOPE_ALL,
  'c:darkForce': SCOPE_MODERN,
  'c:darkness': SCOPE_ALL,
  'c:destiny': SCOPE_MODERN,
  'c:discipline': SCOPE_MODERN,
  'c:divineBarrierAura': SCOPE_COM1,
  'c:endurance': SCOPE_COM_PLUS,
  'c:eternalNight:enemyResistance': SCOPE_COM_PLUS,
  'c:flameBlade': SCOPE_ALL,
  'c:focusMagic': SCOPE_COM_PLUS,
  'c:giantStrength': SCOPE_MOM,
  'c:goodMoon': SCOPE_MODERN,
  'c:guardian': SCOPE_COM_PLUS,
  'c:guidingBeaconAura': SCOPE_COM1,
  'c:heavenlyLight': SCOPE_COM_PLUS,
  'c:highPrayer': SCOPE_ALL,
  'c:holyArmor': SCOPE_ALL,
  'c:holyWeapon': SCOPE_ALL,
  'c:innerPower': SCOPE_MODERN,
  'c:ironSkin': SCOPE_ALL,
  'c:landLinking': SCOPE_COM_PLUS,
  'c:level': SCOPE_ALL,
  'c:level:fantastic': SCOPE_MODERN,
  'c:lionheart': SCOPE_ALL,
  'c:lucky': SCOPE_ALL,
  'c:metalFires': SCOPE_MOM,
  'c:mindStorm': SCOPE_ALL,
  'c:mysticSurge': SCOPE_COM_PLUS,
  'c:natureConjunction': SCOPE_MODERN,
  // Wider than PROVENANCE[nodeAura] (Caster.exe only): apply() carries an explicit `!isCoM2`
  // DOS branch for the same +2 package and the node-aura control exists in every version.
  'c:nodeAura': SCOPE_ALL,
  'c:orihalcon': SCOPE_COM_PLUS,
  'c:prayer': SCOPE_ALL,
  'c:mysticSurge:race': SCOPE_COM1,
  'c:noHealConversion': SCOPE_MODERN,
  'c:raiseDead': SCOPE_COM1,
  'c:realmWard': SCOPE_COM1,
  'c:reinforceMagic': SCOPE_MODERN,
  'c:shatter': SCOPE_ALL,
  'c:soulLinkerAura': SCOPE_COM1,
  'c:spellWard': SCOPE_MODERN,
  'c:stoneSkin': SCOPE_MOM,
  'c:supremeLight': SCOPE_COM1,
  // Wider than PROVENANCE[survivalInstinct] (Caster.exe only): survivalInstinctActiveForUnit
  // gates the effect to CoM+ and PROVENANCE[survivalInstinctEligibility] covers com_6.08.
  'c:survivalInstinct': SCOPE_COM_PLUS,
  // One id for all three CoM engines: the chains place it after Realm Ward in CoM 1 and last in
  // region `c` in CoM2/Warlord, which is the whole of the difference. It is sourced on
  // PROVENANCE[tactician:heroDynamic] / PROVENANCE[tactician:nonheroDynamic], which cover
  // com_6.08 too.
  'c:tactician': SCOPE_COM_PLUS,
  // The DOS half of True Light. PROVENANCE[trueLight] cites only the Warlord CAS block, which
  // is the separate `b:trueLight` step; the MoM region-c block has no citation yet.
  'c:trueLight': SCOPE_MOM,
  // True Sight's Illusion Immunity write. Every engine makes it in region `c`; Warlord's
  // `d:trueSight` is its separate script write of ranged To Hit, and the two share a citation.
  'c:trueSight': SCOPE_ALL,
  'c:undead': SCOPE_ALL,
  'c:warpAttack': SCOPE_ALL,
  'c:warpDefense': SCOPE_ALL,
  'c:warpResist': SCOPE_ALL,
  'c:vertigo': SCOPE_ALL,
  'c:warpReality': SCOPE_ALL,
  'c:weakness': SCOPE_ALL,
  'c:weapon': SCOPE_ALL,
  // --- d: magic calc, in UnitCalc.CAS ---
  'd:beatOfSwiftness': SCOPE_WARLORD,
  'd:blazeOfGlory': SCOPE_WARLORD,
  'd:energyCannonThreshold': SCOPE_WARLORD,
  'd:eyeOfHeaven:enemyGaze': SCOPE_WARLORD,
  'd:hurricane': SCOPE_WARLORD,
  'd:trueSight': SCOPE_WARLORD,
  'd:colossalStrength': SCOPE_WARLORD,
  'd:favoredTerrain': SCOPE_WARLORD,
  'd:fortification': SCOPE_WARLORD,
  'd:flameBlade': SCOPE_WARLORD,
  'd:hierophany': SCOPE_WARLORD,
  'd:spiritLink': SCOPE_WARLORD,
  'd:mechanicalExpert': SCOPE_WARLORD,
  'd:nightGoblinsNightVision': SCOPE_WARLORD,
  'd:energyWeaponry': SCOPE_WARLORD,
  'd:pneumaField': SCOPE_WARLORD,
  'd:psychoForce': SCOPE_WARLORD,
  'd:rust': SCOPE_WARLORD,
  'd:shadowStrike:thrown': SCOPE_WARLORD,
  'd:vampirism:transfer': SCOPE_WARLORD,
  'd:venom': SCOPE_WARLORD,
  'd:weakness': SCOPE_WARLORD,
  // --- e: the binary's post-hook tail ---
  'e:clamp': SCOPE_ALL,
  'e:dosClamp': SCOPE_DOS,
  'e:modernClampCommon': SCOPE_MODERN,
  'e:divineBarrierAura': SCOPE_MODERN,
  'e:guidingBeaconAura': SCOPE_MODERN,
  'e:holyBonus': SCOPE_MODERN,
  'e:leadershipAura': SCOPE_MODERN,
  'e:mislead': SCOPE_MODERN,
  'e:resistanceToAll': SCOPE_MODERN,
  'e:soulLinkerAura': SCOPE_MODERN,
  'e:supremeLight': SCOPE_MODERN,
  // --- attackSpecific: GetEffectiveResistance / EffectiveDefense, and the resolution-time
  // projections of the To-Hit/To-Block ledger ---
  'attackSpecific:chance:attackRollProbabilityBound': SCOPE_MODERN,
  'attackSpecific:chance:distancePenalty': SCOPE_ALL,
  'attackSpecific:chance:toBlockProbabilityBound': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:armorPiercing': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:base': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:bless': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:elementalArmor': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:illusion': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:immunities': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:largeShield': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:resistElements': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:weaponImmunity': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:base': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:bless': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:charmed': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:magicImmunity': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:resistElements': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:resistMagic': SCOPE_MODERN,
  'attackSpecific:dosEffectiveDefense:armorPiercing': SCOPE_DOS,
  'attackSpecific:dosEffectiveDefense:base': SCOPE_DOS,
  'attackSpecific:dosEffectiveDefense:bless': SCOPE_DOS,
  'attackSpecific:dosEffectiveDefense:defenseSpecial': SCOPE_DOS,
  'attackSpecific:dosEffectiveDefense:elemental': SCOPE_MOM,
  'attackSpecific:dosEffectiveDefense:elementalArmor': SCOPE_COM1,
  'attackSpecific:dosEffectiveDefense:illusion': SCOPE_DOS,
  'attackSpecific:dosEffectiveDefense:immunityMask': SCOPE_DOS,
  'attackSpecific:dosEffectiveDefense:largeShield': SCOPE_DOS,
  'attackSpecific:dosEffectiveDefense:magicImmunity': SCOPE_DOS,
  'attackSpecific:dosEffectiveDefense:resistElements': SCOPE_COM1,
  'attackSpecific:dosEffectiveDefense:righteousness': SCOPE_MOM,
  'attackSpecific:dosEffectiveDefense:weaponImmunityBonus': SCOPE_COM1,
  'attackSpecific:dosEffectiveDefense:weaponImmunityFloor': SCOPE_MOM,
  'attackSpecific:dosEffectiveDefense:weaponImmunityMark': SCOPE_DOS,
  'attackSpecific:dosEffectiveResistance:base': SCOPE_DOS,
  'attackSpecific:dosEffectiveResistance:bless': SCOPE_DOS,
  'attackSpecific:dosEffectiveResistance:charmed': SCOPE_DOS,
  'attackSpecific:dosEffectiveResistance:elemental': SCOPE_DOS,
  'attackSpecific:dosEffectiveResistance:magicImmunity': SCOPE_DOS,
  'attackSpecific:dosEffectiveResistance:resistMagic': SCOPE_DOS,
  'attackSpecific:dosEffectiveResistance:righteousness': SCOPE_MOM,
  // --- attackSpecific: the per-rider resistance queries (F223) ---
  // The scope of a rider-query step is the engine family whose list holds it, not which build
  // names the rider: every engine in the family makes the call, and whether this unit carries
  // the rider is the step's `when`, read off values `touchKeyInVersion` has already scoped.
  'attackSpecific:touchRiderResistance:lifeRider': SCOPE_MODERN,
  'attackSpecific:touchRiderResistance:stoningTouch': SCOPE_MODERN,
  'attackSpecific:touchRiderResistance:deathTouch': SCOPE_MODERN,
  'attackSpecific:touchRiderResistance:lifeSteal': SCOPE_MODERN,
  'attackSpecific:touchRiderResistance:destruction': SCOPE_MODERN,
  'attackSpecific:touchRiderResistance:poison': SCOPE_MODERN,
  'attackSpecific:fearRiderResistance:fear': SCOPE_MODERN,
  'attackSpecific:gazeKillResistance:deathGaze': SCOPE_MODERN,
  'attackSpecific:gazeKillResistance:stoningGaze': SCOPE_MODERN,
  'attackSpecific:dosTouchRiderResistance:lifeRider': SCOPE_DOS,
  'attackSpecific:dosTouchRiderResistance:stoningTouch': SCOPE_DOS,
  'attackSpecific:dosTouchRiderResistance:deathTouch': SCOPE_DOS,
  'attackSpecific:dosTouchRiderResistance:lifeSteal': SCOPE_DOS,
  'attackSpecific:dosTouchRiderResistance:destruction': SCOPE_DOS,
  'attackSpecific:dosTouchRiderResistance:poison': SCOPE_DOS,
  'attackSpecific:dosFearRiderResistance:fear': SCOPE_DOS,
  'attackSpecific:dosGazeKillResistance:stoningGaze': SCOPE_DOS,
  'attackSpecific:dosGazeKillResistance:deathGaze': SCOPE_DOS,
});

// --- Canonical engine-version scope: resolution-time reads (F130) ---
//
// `STEP_VERSION_SCOPES` covers writes made by ordered steps. An effect implemented purely in
// combat resolution has no step at all, so it had no home for the same fact and each read carried
// its own hand-written version test — or none. This table is that home, keyed `resolution:<id>`
// where `<id>` is the formula id whose `PROVENANCE versions=` backs it, the way the phase tables
// are keyed `phase:id`. `tools/unit_checks/version_scope.js` asserts the two agree.
//
// It stays one namespace. A read the derivation makes can always put an exact version test in its
// own expression, because `version` is a local binding there — the **adjacent** shape in
// `SPEC.md`, *Versions*, invariant 4 — so a `derivation:` sibling would only add indirection to a
// gate a reader can already check on the line. This table is for a read inside a helper shared by
// several engines, which has no version literal in reach.
//
// A control's `subgroup` is NOT the source for these. It states UI visibility only (see the note
// above), and the DOS engines make the difference load-bearing: they **repurpose enchantment
// bits** between builds, so one bit is two named effects. `0x00200000` guards Eldritch Weapon in
// both MoM builds and Mystic Surge in CoM 1; `0x00000004` is Berserk in MoM and Blood Lust in
// CoM 1 (`Reference docs/DOS reconstructed/R6.1a.evidence.md`, guard-mask table). CoM 1's -10pp
// To Block is therefore real and reached through Mystic Surge, while an Eldritch Weapon read
// firing there is a duplicate of it. The calculator's inputs are named effects, not record bits:
// one name means one effect in every version, and the shared storage is the citation for why the
// two are distinct rather than a reason to alias them.
const COMBAT_VERSION_SCOPES = Object.freeze({
  'resolution:blackChannelsEffectDerivation': SCOPE_MOM,
  'resolution:blazingMarchMagicWeapon': SCOPE_COM1,
  'resolution:bloodLustAbilityDerivation': SCOPE_COM_PLUS,
  'resolution:bloodLustMeleeAttack': SCOPE_COM_PLUS,
  'resolution:dispelEvilTouchRider': SCOPE_MOM,
  'resolution:eldritchWeaponEligibility': SCOPE_MOM,
  'resolution:exorciseTouchRider': SCOPE_COM_PLUS,
  'resolution:mysticSurge': SCOPE_COM_PLUS,
  'resolution:rageEffectiveAttack': SCOPE_WARLORD,
  'resolution:rulerOfUnderworldEligibility': SCOPE_MODERN,
});

// Scope is an upper bound, exactly as it is for steps: inside it the read still asks whether this
// unit carries the effect; outside it the engine has no such effect and the read must not fire.
// Throws on an unknown id rather than defaulting to "applies everywhere", which would reintroduce
// the ungated read this table exists to remove (`SPEC.md`, *Out-of-range values stop the run*).
function combatEffectInVersion(id, version) {
  const scope = COMBAT_VERSION_SCOPES[id];
  if (!scope) {
    throw new Error(`combatEffectInVersion: '${id}' has no COMBAT_VERSION_SCOPES entry. `
      + 'Add it with the versions its PROVENANCE names.');
  }
  if (!version) {
    throw new Error(`combatEffectInVersion: '${id}' needs a version; got ${JSON.stringify(version)}.`);
  }
  return scope.includes(version);
}

// `chance:` is the To-Hit/To-Block ledger's namespace and nothing else's (M13): every step in
// that ledger carries it and no step of the stat sequence does, so the two id spaces are
// disjoint and one `phase:id` key names one step. The ledger holds the projection of each stat
// event (`chance:${event.id}`, and `chance:trueLightIllusion` for True Light's Illusion malus)
// plus the three resolution-time writes native to it.
//
// A projection is the same engine write seen through another output, not a second write, so it
// carries the key of the write it projects instead of a separately maintained entry — stated on
// the step as `projectionOf`, never guessed from the id. The marker has to be what does the
// inheriting: an id is presentation, and a ledger step that is *not* a projection
// (`attackSpecific:chance:distancePenalty`) has a scope row of its own. Deriving inheritance
// from the prefix instead would give such a step the scope of whatever it appeared to project —
// a coverage failure that reports itself as coverage.
//
// `entry` is a step or a trace event: both carry `phase`, `id` and, for a projection,
// `projectionOf`.
function stepVersionScopeKey(entry) {
  if (entry && typeof entry.projectionOf === 'string') return entry.projectionOf;
  return `${entry && entry.phase}:${entry && entry.id}`;
}

function resolveStepVersionScope(entry) {
  return STEP_VERSION_SCOPES[stepVersionScopeKey(entry)] || null;
}

// The canonical scope of one step. Throws rather than defaulting: a step with no entry has no
// classification, and silently treating it as "every version" is the absence of a home that M9
// exists to remove.
function stepVersionScope(step) {
  if (!step || typeof step.id !== 'string') throw new Error('stepVersionScope: step has no id');
  const scope = resolveStepVersionScope(step);
  if (!scope) {
    throw new Error(`step ${stepVersionScopeKey(step)} has no canonical version scope`);
  }
  return scope;
}

function stepAppliesToVersion(step, version) {
  return stepVersionScope(step).includes(version);
}

// The filter (M9 stage 2). Every derivation sequence passes through this before composition,
// so a version's sequence contains only the writes that version's engine makes. A step outside
// its scope is not a write the engine declines to make — it is a write the engine does not
// have — so it must not be ordered, must not be visited, and must not appear in a ledger as a
// skipped branch of a binary that has no such branch.
//
// This is also the coverage check: `stepVersionScope` throws on a step with no entry, and it
// runs on every step of every sequence rather than under the debug switch, so an unclassified
// step cannot reach a sequence in any build.
function filterStepsToVersionScope(steps, version) {
  return (steps || []).filter(step => stepAppliesToVersion(step, version));
}

// The membership check. Scope also hides at call sites — the six EFFECTIVE_RESISTANCE_STEPS
// carry no predicate and are CoM2-only solely because the modern arm of `resistanceQueries` is
// the only path that reaches them, and the DOS lists are keyed by version rather than gated —
// so membership has to be checkable where steps enter a sequence, not only inside their
// predicates.
// Returns the steps this version's engine does not contain, in sequence order.
function sequenceVersionScopeViolations(steps, version) {
  const violations = [];
  for (const step of steps || []) {
    if (!stepAppliesToVersion(step, version)) {
      violations.push({ key: stepVersionScopeKey(step), scope: stepVersionScope(step) });
    }
  }
  return violations;
}

function assertSequenceVersionScope(steps, version, label) {
  const violations = sequenceVersionScopeViolations(steps, version);
  if (violations.length > 0) {
    const named = violations.map(violation => violation.key).join(', ');
    throw new Error(`${label || 'sequence'} runs steps outside their version scope in ${version}: ${named}`);
  }
  return steps;
}

// Development switch for the write check below. Off in normal use — it copies the unit
// record once per step — and turned on by the test suites, which is where a step writing a
// field it did not declare has to be caught. `runStatSteps` also takes it per call, via
// ctx.validateWrites.
let statStepDebug = false;
function setStatStepDebug(on) { statStepDebug = !!on; }
function statStepDebugEnabled() { return statStepDebug; }

// A step:
//   id          stable identifier, unique within a sequence; names the trace entry
//   phase       one of STEP_PHASES — evidence, not decoration: it records which region
//               or resolution axis makes this write
//   writes      the fields the step may write. The trace and the write check read it,
//               so it has to be complete. It is also what attributes the write to an attack
//               channel (STAT_CHANNEL_FIELDS below), so name the exact per-channel fields
//               rather than the widest set that happens to pass the write check.
//   sourceId / sourceLabel  optional presentation identity for the write's game source;
//               sourceId defaults to the stable step id, so every applied entry is named
//   when(unit, ctx)   optional predicate; a step that never fires costs one call
//   apply(unit, ctx)  mutates `unit`; return HALT to stop the sequence
//   projectionOf  set only on a projection: the `phase:id` scope key of the engine write this
//               step re-presents through another output. A projection is not an engine write,
//               so it never gets a STEP_VERSION_SCOPES row of its own
//   boundary    set only on a boundary step (`isBoundaryStep` above): it makes no write, so
//               `writes` is empty and the record must be unchanged across it
// The checks run under the debug switch only. A sequence is rebuilt on every
// deriveUnitStats call — once per roster unit per side when the matrix view is built — so
// in normal use this is the identity function, and the test suites are where a malformed
// step gets caught.
function statStep(step) {
  if (!statStepDebug) return step;
  if (!step || typeof step.apply !== 'function') {
    throw new Error(`statStep: ${step && step.id} has no apply()`);
  }
  if (!Object.prototype.hasOwnProperty.call(STEP_PHASE_RANK, step.phase)) {
    throw new Error(`statStep: ${step.id} has unknown phase ${step.phase}`);
  }
  if (!Array.isArray(step.writes) || (step.writes.length === 0 && !isBoundaryStep(step))) {
    throw new Error(`statStep: ${step.id} declares no writes`);
  }
  if (isBoundaryStep(step) && step.writes.length > 0) {
    throw new Error(`statStep: boundary step ${step.id} declares writes`);
  }
  return step;
}

// List order *is* execution order — there is no sort. Sorting on every call would both cost
// (deriveUnitStats runs once per roster unit per side when the matrix is built) and quietly repair
// a sequence composed in the wrong order.
//
// What phase buys is a checkable invariant: a composed sequence is in non-decreasing phase order,
// since a step cannot run in region `b` after one in `c`. Keys must also be unique, because a
// sequence is assembled from two places — the list in `deriveUnitStats` and the ability steps
// spliced into it — and a collision would silently make the trace ambiguous rather than fail.
// The key is `phase:id`, the same one the composer, the chains and STEP_VERSION_SCOPES use: one
// enchantment writing in two regions of one engine (`c:weakness` and Warlord's `d:weakness`) is
// two distinct writes of one effect, and the phase is what separates them. Every trace event
// carries its phase, so a consumer reading the ledger sees the same distinction.
// What makes a step identifiable at all. Both the order assertion and the composer reject a step
// that fails it, with their own diagnostics; the rule itself is stated once so tightening it
// cannot leave one entry point admitting what the other rejects.
function stepHasId(step) {
  return !!(step && typeof step.id === 'string' && step.id);
}

function assertStatStepOrder(steps) {
  let rank = -1;
  let previous = null;
  const seen = new Set();
  for (const step of steps) {
    if (!stepHasId(step)) {
      throw new Error('stat step has no id');
    }
    if (!Object.prototype.hasOwnProperty.call(STEP_PHASE_RANK, step.phase)) {
      throw new Error(`step ${step.id} has unknown phase ${step.phase}`);
    }
    const stepRank = STEP_PHASE_RANK[step.phase];
    if (stepRank < rank) {
      throw new Error(`step ${step.id} (phase ${step.phase}) is declared after ${previous.id} (phase ${previous.phase})`);
    }
    const key = stepVersionScopeKey(step);
    if (seen.has(key)) throw new Error(`step ${key} is declared twice in one sequence`);
    seen.add(key);
    rank = stepRank;
    previous = step;
  }
  return steps;
}

// The per-version execution chain (stats_manifests.js, statChain) is the source-order authority
// for every represented write, `template` through `e`. The composer is deliberately separate from
// the runner: it walks the chain explicitly, annotates every step with its chain position and
// whether that position is transcribed or inherited, and rejects a step the chain does not name.
// There is no generic sort here — a chain is an authored execution sequence, not a repair for an
// accidentally unordered list, and an unclassified step must fail loudly.
//
// Both derivation sequences go through this composer — the stat sequence and the ordered
// identity conversions — so a represented write cannot reach the trace from a sequence no chain
// covers. Chain entries a run does not emit are simply skipped: a step is version-exclusive or
// predicate-exclusive, and its absence is not an error. The reverse is.
const validatedChains = new WeakSet();

// Checked once per chain, not once per derivation: a chain is a frozen module constant, and
// deriveUnitStats runs once per roster unit per side when the matrix is built.
function assertStatChain(chain) {
  if (!Array.isArray(chain)) throw new Error('the composer received no execution chain');
  if (validatedChains.has(chain)) return chain;
  const seen = new Set();
  let rank = -1;
  for (const entry of chain) {
    if (!entry || typeof entry.key !== 'string' || !entry.key) {
      throw new Error('execution chain has an entry without a key');
    }
    if (!Object.prototype.hasOwnProperty.call(STEP_PHASE_RANK, entry.phase)) {
      throw new Error(`execution chain entry ${entry.key} has unknown phase ${entry.phase}`);
    }
    if (entry.key !== `${entry.phase}:${entry.id}`) {
      throw new Error(`execution chain entry ${entry.key} disagrees with its phase and id`);
    }
    if (typeof entry.provisional !== 'boolean') {
      throw new Error(`execution chain entry ${entry.key} does not say whether its position is provisional`);
    }
    if (seen.has(entry.key)) throw new Error(`execution chain repeats ${entry.key}`);
    seen.add(entry.key);
    // Phase orders nothing, but it still has to agree with the chain: a chain authored out of
    // region order is an entry filed under the wrong region.
    const entryRank = STEP_PHASE_RANK[entry.phase];
    if (entryRank < rank) {
      throw new Error(`execution chain entry ${entry.key} is declared after a later phase`);
    }
    rank = entryRank;
  }
  validatedChains.add(chain);
  return chain;
}

function orderStatStepsBySource(steps, chain) {
  if (!Array.isArray(steps)) throw new Error('the composer received no step list');
  assertStatChain(chain);
  const emitted = new Map();
  for (const step of steps) {
    if (!stepHasId(step)) {
      throw new Error('the composer received a step without an id');
    }
    const key = stepVersionScopeKey(step);
    if (emitted.has(key)) throw new Error(`step ${key} is represented twice`);
    emitted.set(key, step);
  }
  const ordered = [];
  for (let sourceOrder = 0; sourceOrder < chain.length; sourceOrder++) {
    const entry = chain[sourceOrder];
    const step = emitted.get(entry.key);
    if (!step) continue; // A version- or predicate-exclusive step may be absent this run.
    ordered.push({ ...step, sourceOrder, provisional: entry.provisional });
    emitted.delete(entry.key);
  }
  // Every emitted step must have been consumed by exactly one chain entry. This is the omission
  // check: unused chain entries are fine, an unplaced step is not.
  for (const [key] of emitted) {
    throw new Error(`step ${key} is missing from its version's execution chain`);
  }
  assertStatStepOrder(ordered);
  return ordered;
}

// Run a sequence over `unit`, mutating it in place and returning it.
//
// `ctx` carries everything a step may read besides the unit: `version`, the permanent
// base record as `ctx.base`, and — for the resolution sequences — the attack context.
//
// `ctx.base` is published by a step of the sequence rather than maintained here: the
// `a:baseCopy` boundary step takes it, and nothing else assigns it. Every write an engine makes
// to its permanent record happens in one of the five phases ahead of that step, so the record it
// copies is exactly what a later region's `BaseUnits[i].…` gate reads. A sequence with no such
// step leaves `ctx.base` as the caller supplied it: absent for the resolution transforms, the
// To-Hit ledger and the figure sequence, none of which reads it, and the permanent identity for
// `targetingIdentity`'s conversion-only run, which supplies it explicitly. A gate reading an
// absent one throws rather than answering from a record nothing published.
//
// Two optional fields are for development only:
//   ctx.trace             an array; each step that changes a declared field appends an entry
//   ctx.executionTrace    an array; every visited step appends an applied/skipped entry
//   ctx.validateWrites    throw if a step writes a field it did not declare
function runStatSteps(steps, unit, ctx) {
  const context = ctx || {};
  const trace = context.trace;
  const executionTrace = context.executionTrace;
  const validate = context.validateWrites || statStepDebug;
  if (validate) assertStatStepOrder(steps);
  for (let order = 0; order < steps.length; order++) {
    const step = steps[order];
    if (step.when && !step.when(unit, context)) {
      if (executionTrace) recordStepExecution(executionTrace, step, order, 'skipped');
      continue;
    }
    const before = (trace || validate) ? { ...unit } : null;
    const result = step.apply(unit, context);
    if (validate) assertStepWrites(step, before, unit);
    if (trace) recordStepTrace(trace, step, before, unit, order);
    if (executionTrace) recordStepExecution(executionTrace, step, order, 'applied');
    if (result === HALT) break;
  }
  if (trace && context.assertTraceOrder) assertStatTraceOrder(trace);
  if (executionTrace && (context.assertTraceOrder || context.assertExecutionTraceOrder)) {
    if (typeof executionTrace.assert === 'function') executionTrace.assert(steps);
    else assertStatTraceOrder(executionTrace, { steps });
  }
  return unit;
}

// A step that writes a field it did not declare is a migration bug: the trace under-reports,
// and — once the sequence carries steps that read each other — so does every later read. A
// boundary step declares nothing, so the same loop demands that it leave the record untouched.
function assertStepWrites(step, before, unit) {
  const declared = new Set(step.writes);
  const fields = new Set([...Object.keys(before), ...Object.keys(unit)]);
  for (const field of fields) {
    if (before[field] === unit[field] || declared.has(field)) continue;
    throw new Error(`step ${step.id} wrote undeclared field ${field} (${before[field]} -> ${unit[field]})`);
  }
}

// --- Channel attribution (F87) ---
//
// A modern unit record keeps several attack channels side by side, so a write to it is not
// only "which field" but "whose channel". These two tables are the single home for that fact,
// and `writes:` is what resolves it: a step already declares the fields it may write, so the
// channel it targets is read off that declaration rather than restated beside it.
//
// The four channels are the keys `result.modernAttacks` exposes. A To Hit modifier can serve
// more than one of them — the modern record carries `hitchancebreath` once for two separate
// breath strength fields (Units.RecalculateUnits.pas:203-219) — so a field maps to a *list*.
//
// A field absent from `STAT_CHANNEL_FIELDS` is channel-agnostic and reaches every channel:
// either it belongs to no channel at all (`def`, `res`, `toHit`), or it is a shared slot one
// write reaches all channels through — `toHitRtb`, which is the shape the DOS engines store.
const STAT_ATTACK_CHANNELS = Object.freeze(['ranged', 'thrown', 'fireBreath', 'lightningBreath']);

// --- Derivation slots (F80 stage C) ---
//
// The modern record carries the engine's four named strength fields side by side, so one walk
// derives every channel. A **slot** is one such field plus the two type fields the calculator
// still needs beside it: `Caster.exe` stores a single `rangedtype`, but the positioned Blaze of
// Glory transfer and Shadow Strike grant each supply an identity to a field that was empty, so
// each slot answers type predicates for itself.
//
// `shared` is the DOS engines' shared `.ranged` slot — one field carrying ranged, Thrown, Breath
// and both gaze strengths alike. The modern engines keep it too, as the card's shared secondary
// projection (`result.rtb`), which is why it is a slot here rather than a channel.
//
// `extra` names the fields a slot owns beyond its strength and type pair: the DOS-shaped
// `shared` slot also stores its own secondary To Hit threshold, where the modern channels share
// the record's three `hitchance<channel>` modifiers listed in `STAT_CHANNEL_FIELDS` below.
const STAT_DERIVATION_SLOTS = Object.freeze({
  shared: Object.freeze({ channel: null, strength: 'rtb', rangedType: 'rangedType', thrownType: 'thrownType', extra: Object.freeze(['toHitRtb']) }),
  ranged: Object.freeze({ channel: 'ranged', strength: 'rtbRanged', rangedType: 'rangedTypeRanged', thrownType: 'thrownTypeRanged' }),
  thrown: Object.freeze({ channel: 'thrown', strength: 'rtbThrown', rangedType: 'rangedTypeThrown', thrownType: 'thrownTypeThrown' }),
  fireBreath: Object.freeze({ channel: 'fireBreath', strength: 'rtbFireBreath', rangedType: 'rangedTypeFireBreath', thrownType: 'thrownTypeFireBreath' }),
  lightningBreath: Object.freeze({ channel: 'lightningBreath', strength: 'rtbLightningBreath', rangedType: 'rangedTypeLightningBreath', thrownType: 'thrownTypeLightningBreath' }),
});

function statSlotFields(slot) {
  return [slot.strength, slot.rangedType, slot.thrownType, ...(slot.extra || [])];
}

// field -> slot key, derived from the one declaration above so the two views cannot drift.
const STAT_SLOT_OF_FIELD = Object.freeze(Object.fromEntries(
  Object.entries(STAT_DERIVATION_SLOTS).flatMap(([key, slot]) =>
    statSlotFields(slot).map(field => [field, key]))));

const STAT_CHANNEL_FIELDS = Object.freeze({
  toHitRanged: Object.freeze(['ranged']),
  toHitThrown: Object.freeze(['thrown']),
  toHitBreath: Object.freeze(['fireBreath', 'lightningBreath']),
  ...Object.fromEntries(Object.values(STAT_DERIVATION_SLOTS)
    .filter(slot => slot.channel)
    .flatMap(slot => [slot.strength, slot.rangedType, slot.thrownType]
      .map(field => [field, Object.freeze([slot.channel])]))),
});

// Checked once, at load: a field registered against a channel the output does not have would
// otherwise attribute writes to a channel no consumer can ask for.
for (const [field, channels] of Object.entries(STAT_CHANNEL_FIELDS)) {
  if (!Array.isArray(channels) || channels.length === 0) {
    throw new Error(`STAT_CHANNEL_FIELDS entry ${field} names no attack channel`);
  }
  for (const channel of channels) {
    if (!STAT_ATTACK_CHANNELS.includes(channel)) {
      throw new Error(`STAT_CHANNEL_FIELDS maps ${field} to unknown attack channel ${channel}`);
    }
  }
}

function assertKnownAttackChannel(channel) {
  if (!STAT_ATTACK_CHANNELS.includes(channel)) {
    throw new Error(`unknown attack channel ${channel}`);
  }
  return channel;
}

// The channels a set of record fields reaches, in canonical channel order, or `null` when none
// of them is channel-scoped. `null` and `[]` are deliberately different answers: `null` means
// "this write is not about any one channel", which is what makes it visible to all of them.
function channelsForStatFields(fields) {
  let found = null;
  for (const field of fields || []) {
    const owned = STAT_CHANNEL_FIELDS[field];
    if (!owned) continue;
    if (!found) found = new Set();
    for (const channel of owned) found.add(channel);
  }
  return found ? STAT_ATTACK_CHANNELS.filter(channel => found.has(channel)) : null;
}

// What a step *may* target, from its declaration. The execution ledger uses this, because a
// predicate-skipped step made no writes to read attribution off.
function stepChannelTargets(step) {
  return channelsForStatFields(step && step.writes);
}

// What an event *did* target, from the fields it actually changed.
function traceEventChannels(event) {
  return channelsForStatFields(event && event.changes ? Object.keys(event.changes) : null);
}

function sameChannelList(actual, expected) {
  if (actual === null || actual === undefined) return expected === null;
  if (!Array.isArray(actual) || expected === null) return false;
  return actual.length === expected.length
    && actual.every((channel, index) => channel === expected[index]);
}

function describeChannels(channels) {
  return channels ? channels.join('+') : 'no channel';
}

function assertEventChannelAttribution(event, expected) {
  const actual = Object.prototype.hasOwnProperty.call(event, 'channels') ? event.channels : null;
  if (!sameChannelList(actual, expected)) {
    throw new Error(`trace event ${event.id} attributes its write to ${describeChannels(actual)}, expected ${describeChannels(expected)}`);
  }
}

// Reconstruct one channel's view of a walk. An event keeps the changes that reach this channel —
// every channel-agnostic field, plus the fields this channel owns — and an event left with
// nothing is dropped. `traceOrder` is renumbered over the survivors, so the result is a trace in
// its own right and `assertStatTraceOrder` holds on it.
//
// A complete-ledger event carries attribution but no changes, so it is kept or dropped whole on
// the channels its declaration named. That makes this work on either trace shape.
//
// This is what lets one walk answer for four channels: F80 stage C reads each channel's strength
// and To Hit projection out of the same ledger the per-channel recursion produces today.
function projectTraceToChannel(trace, channel) {
  assertKnownAttackChannel(channel);
  return projectTraceByField(trace,
    field => {
      // A slot-owned field belongs to that slot's channel and to no other, so the DOS-shaped
      // `shared` slot's fields reach none of them.
      const owner = STAT_SLOT_OF_FIELD[field];
      if (owner) return STAT_DERIVATION_SLOTS[owner].channel === channel;
      const owned = STAT_CHANNEL_FIELDS[field];
      return !owned || owned.includes(channel);
    },
    event => !Array.isArray(event.channels) || event.channels.includes(channel));
}

// One derivation slot's view of the same walk. A slot is narrower than a channel: the DOS-shaped
// `shared` slot answers for no channel at all. Every other slot's fields drop; everything else
// survives, so a channel's exposed `statTrace` is the events that reached *its* accumulator and
// no other.
function projectTraceToSlot(trace, slot) {
  if (!Object.prototype.hasOwnProperty.call(STAT_DERIVATION_SLOTS, slot)) {
    throw new Error(`unknown derivation slot ${slot}`);
  }
  const channel = STAT_DERIVATION_SLOTS[slot].channel;
  return projectTraceByField(trace,
    field => {
      const owner = STAT_SLOT_OF_FIELD[field];
      if (owner) return owner === slot;
      if (channel === null) return true;
      const owned = STAT_CHANNEL_FIELDS[field];
      return !owned || owned.includes(channel);
    },
    event => channel === null || !Array.isArray(event.channels)
      || event.channels.includes(channel));
}

function projectTraceByField(trace, keepField, keepLedgerEvent) {
  const projected = [];
  for (const event of trace || []) {
    if (!event.changes) {
      if (!keepLedgerEvent(event)) continue;
      projected.push(event.traceOrder === projected.length
        ? event : { ...event, traceOrder: projected.length });
      continue;
    }
    const changes = {};
    let removed = false;
    for (const [field, change] of Object.entries(event.changes || {})) {
      if (!keepField(field)) { removed = true; continue; }
      changes[field] = change;
    }
    if (!removed) {
      projected.push(event.traceOrder === projected.length
        ? event : { ...event, traceOrder: projected.length });
      continue;
    }
    if (Object.keys(changes).length === 0) continue;
    const next = { ...event, changes, traceOrder: projected.length };
    const channels = channelsForStatFields(Object.keys(changes));
    if (channels) next.channels = channels;
    else delete next.channels;
    projected.push(next);
  }
  return projected;
}

// One entry per step that changed something, in execution order. Not needed for the red
// display numbers — those are `final - base` — but it is what an ordered "what modified
// this unit" breakdown would read, and where M4's `flameBlade` attribution belongs.
function traceSourceForStep(step) {
  const id = step.sourceId || step.id;
  return {
    id,
    label: step.sourceLabel || id,
  };
}

function collectStepChanges(step, before, unit) {
  const changes = {};
  if (!before) return changes;
  for (const field of step.writes) {
    if (before[field] === unit[field]) continue;
    const from = before[field];
    const to = unit[field];
    changes[field] = (typeof from === 'number' && typeof to === 'number')
      ? { from, to, delta: to - from }
      : { from, to };
  }
  return changes;
}

function recordStepTrace(trace, step, before, unit, order) {
  const changes = collectStepChanges(step, before, unit);
  if (isBoundaryStep(step) || Object.keys(changes).length > 0) {
    const event = {
      id: step.id,
      source: traceSourceForStep(step),
      phase: step.phase,
      order,
      traceOrder: trace.length,
      changes,
    };
    if (isBoundaryStep(step)) event.boundary = true;
    if (Number.isInteger(step.sourceOrder)) event.sourceOrder = step.sourceOrder;
    if (typeof step.projectionOf === 'string') event.projectionOf = step.projectionOf;
    // Attribution comes from the fields this write actually changed, not from the declaration:
    // a step that may write three channels but moved one records the one it moved. `changes`
    // only ever holds declared fields, so a step that reaches an undeclared channel field is
    // caught by `assertStepWrites` under the development write check, like any other
    // undeclared write — not here.
    const channels = channelsForStatFields(Object.keys(changes));
    if (channels) event.channels = channels;
    trace.push(event);
    return event;
  }
  return null;
}

// Complete execution ledger used by F20. It intentionally records no-op and predicate-skipped
// steps as well as writes, so a trace cannot appear complete merely because changed events were
// sorted or because an omitted step happened to be a no-op. The public `trace` remains sparse.
function recordStepExecution(trace, step, order, status) {
  if (typeof trace.record === 'function') {
    trace.record(step, order, status);
    return;
  }
  const event = {
    id: step.id,
    phase: step.phase,
    order,
    traceOrder: trace.length,
    executionOrder: trace.length,
    status,
  };
  if (Number.isInteger(step.sourceOrder)) event.sourceOrder = step.sourceOrder;
  if (typeof step.projectionOf === 'string') event.projectionOf = step.projectionOf;
  const channels = stepChannelTargets(step);
  if (channels) event.channels = channels;
  trace.push(event);
}

// Keep the complete execution ledger compact during ordinary derivation. The public array is
// materialized only when a caller reads it, which avoids allocating one event object per visited
// step for matrix rows that only consume the calculated combat payload.
function createStatExecutionTraceLedger() {
  const records = [];
  return {
    record(step, order, status) {
      records.push([step, order, status]);
    },
    assert(steps) {
      if (!Array.isArray(steps)) {
        throw new Error('complete stat trace expected steps is not an array');
      }
      if (records.length !== steps.length) {
        throw new Error(`complete stat trace has ${records.length} events, expected ${steps.length}`);
      }
      let previousSource = null;
      for (let index = 0; index < records.length; index++) {
        const [step, order, status] = records[index];
        if (step !== steps[index] || order !== index) {
          throw new Error(`complete trace event ${step && step.id} does not match step ${steps[index] && steps[index].id}`);
        }
        if (!['applied', 'skipped'].includes(status)) {
          throw new Error(`complete trace event ${step.id} has no execution status`);
        }
        const sourceOrder = Number.isInteger(step.sourceOrder) ? step.sourceOrder : null;
        if (['b', 'c', 'd'].includes(step.phase) && sourceOrder === null) {
          throw new Error(`complete trace event ${step.id} has no source order`);
        }
        const phaseRank = STEP_PHASE_RANK[step.phase];
        if (previousSource && (phaseRank < previousSource.phaseRank
            || (phaseRank === previousSource.phaseRank
              && sourceOrder <= previousSource.sourceOrder))) {
          throw new Error(`trace event ${step.id} is out of source order after ${previousSource.id}`);
        }
        if (sourceOrder !== null) {
          previousSource = { id: step.id, phaseRank, sourceOrder };
        }
      }
    },
    materialize() {
      return records.map(([step, order, status], traceOrder) => {
        const channels = stepChannelTargets(step);
        return {
          id: step.id,
          phase: step.phase,
          order,
          traceOrder,
          executionOrder: traceOrder,
          status,
          ...(Number.isInteger(step.sourceOrder) ? { sourceOrder: step.sourceOrder } : {}),
          ...(channels ? { channels } : {}),
        };
      });
    },
  };
}

// A complete trace is an append-only execution log.  It must never be reconstructed by sorting
// phase/order pairs: identity and permanent preparation events can be emitted by earlier
// sub-sequences, and their local step indexes are intentionally independent.  `traceOrder` is
// therefore the one total order exposed to projections and to the F20 regression.
function assertStatTraceOrder(trace, options = {}) {
  if (!Array.isArray(trace)) throw new Error('stat trace is not an array');
  const seen = new Set();
  let previousSource = null;
  const expectedSteps = options.steps || null;
  if (expectedSteps && !Array.isArray(expectedSteps)) {
    throw new Error('complete stat trace expected steps is not an array');
  }
  if (expectedSteps && !options.allowPrefix && trace.length !== expectedSteps.length) {
    throw new Error(`complete stat trace has ${trace.length} events, expected ${expectedSteps.length}`);
  }
  if (expectedSteps && options.allowPrefix && trace.length > expectedSteps.length) {
    throw new Error(`complete stat trace has ${trace.length} events, expected at most ${expectedSteps.length}`);
  }
  for (let index = 0; index < trace.length; index++) {
    const event = trace[index];
    if (!event || typeof event.id !== 'string' || !event.id) {
      throw new Error(`trace event ${index} has no id`);
    }
    // Keyed `phase:id`, the key the chain and the scope table use: one effect may make two
    // separately cited writes in two regions of one engine and both may fire in one pass —
    // `c:trueSight` sets Illusion Immunity and `d:trueSight` adds ranged To Hit (`SPEC.md`,
    // *The step model*). A repeated `phase:id` is still a bug, because that is one position.
    const eventKey = `${event.phase}:${event.id}`;
    if (seen.has(eventKey)) throw new Error(`trace event id ${eventKey} is repeated`);
    seen.add(eventKey);
    if (event.traceOrder !== index) {
      throw new Error(`trace event ${event.id} has trace order ${event.traceOrder}, expected ${index}`);
    }
    if (!Object.prototype.hasOwnProperty.call(STEP_PHASE_RANK, event.phase)) {
      throw new Error(`trace event ${event.id} has unknown phase ${event.phase}`);
    }
    const complete = !!expectedSteps;
    if (!complete && !event.boundary
        && (!event.changes || Object.keys(event.changes).length === 0)) {
      throw new Error(`trace event ${event.id} records no changes`);
    }
    // Channel attribution is part of what makes a trace well formed, and a sparse trace is
    // assembled from several producers — the permanent-write pass, the
    // sequence runner — plus whatever a channel projection rebuilds. Deriving the expectation
    // from the changed fields here, and from the step's declaration in the complete case,
    // keeps every producer answerable to the same registry.
    if (!complete) assertEventChannelAttribution(event, traceEventChannels(event));
    if (complete) {
      const expected = expectedSteps[index];
      if (!expected || event.id !== expected.id || event.phase !== expected.phase
          || event.order !== index || event.executionOrder !== index) {
        throw new Error(`complete trace event ${event.id} does not match step ${expected && expected.id}`);
      }
      const expectedSourceOrder = Number.isInteger(expected.sourceOrder)
        ? expected.sourceOrder : null;
      const actualSourceOrder = Number.isInteger(event.sourceOrder) ? event.sourceOrder : null;
      if (['b', 'c', 'd'].includes(expected.phase) && expectedSourceOrder === null) {
        throw new Error(`complete trace event ${event.id} has no source order`);
      }
      if (expectedSourceOrder !== actualSourceOrder) {
        throw new Error(`complete trace event ${event.id} has the wrong source order`);
      }
      if (!['applied', 'skipped'].includes(event.status)) {
        throw new Error(`complete trace event ${event.id} has no execution status`);
      }
      assertEventChannelAttribution(event, stepChannelTargets(expected));
    }
    const phaseRank = STEP_PHASE_RANK[event.phase];
    if (Number.isInteger(event.sourceOrder)) {
      if (previousSource && (phaseRank < previousSource.phaseRank
          || (phaseRank === previousSource.phaseRank
            && event.sourceOrder <= previousSource.sourceOrder))) {
        throw new Error(`trace event ${event.id} is out of source order after ${previousSource.id}`);
      }
      previousSource = { id: event.id, phaseRank, sourceOrder: event.sourceOrder };
    }
  }
  return trace;
}

// Project the shared ordered event log onto one calculated output.  R7.3 deliberately
// keeps the event log atomic (one engine write can touch several fields), while this
// projection is what a stat's final-value output consumes.  The projection carries its
// editable base and displayed result separately so R7.4 can render those as the first and
// last lines without inventing either value from deltas.
//
// `stat:base` seeds the mutable record from zero. Permanent construction writes are expected
// to appear as their own preceding source events, making that seed a no-op relative to the
// projected running value and therefore invisible. Normalizing the seed's `from` to the running
// value keeps the chain continuous and makes a missed permanent-write attribution testable.
//
// `options.baseId` names that seeding step for a sequence that seeds under another id — the two
// attack-specific sequences seed from the record's own Resistance or Defense rather than from
// zero (`effectiveResistance:base` and its three siblings, `combat_effects.js`). A seed that
// writes nothing but the supplied base is then a no-op and drops out; a seed that writes more
// than the base — City Walls into EffectiveDefense, the DOS Vertigo subtraction — stays in the
// chain as the transform it is.
//
// A boundary event (`a:baseCopy`) carries no `changes`, so it is projected onto every field as a
// value-free marker at its own position: the reader sees where the permanent record ends and the
// recalculation begins. It moves the running value nowhere, so it is not a modifier — a consumer
// asking "did anything modify this stat" asks `traceHasWrites` below rather than reading the
// entry count, and a chain that holds the marker alone answers no.
function projectStatTrace(trace, field, base, result, options = {}) {
  const entries = [];
  let running = base;
  const baseId = options.baseId || 'stat:base';
  const ignoredIds = new Set(options.ignoreIds || []);

  for (const event of trace || []) {
    if (ignoredIds.has(event.id)) continue;
    if (event.boundary) {
      entries.push({
        id: event.id,
        source: event.source || { id: event.id, label: event.id },
        phase: event.phase,
        order: event.order,
        ...(Number.isInteger(event.traceOrder) ? { traceOrder: event.traceOrder } : {}),
        ...(typeof event.projectionOf === 'string' ? { projectionOf: event.projectionOf } : {}),
        boundary: true,
        from: running,
        to: running,
      });
      continue;
    }
    if (!event.changes
        || !Object.prototype.hasOwnProperty.call(event.changes, field)) continue;
    const change = event.changes[field];
    const from = event.id === baseId ? running : change.from;
    const to = change.to;
    if (from === to) continue;
    entries.push({
      id: event.id,
      source: event.source || { id: event.id, label: event.id },
      phase: event.phase,
      order: event.order,
      ...(Number.isInteger(event.traceOrder) ? { traceOrder: event.traceOrder } : {}),
      ...(typeof event.projectionOf === 'string' ? { projectionOf: event.projectionOf } : {}),
      from,
      to,
    });
    running = to;
  }

  return {
    field,
    ...(options.unit ? { unit: options.unit } : {}),
    base,
    entries,
    result,
  };
}

// Whether a projected chain contains anything that moved the value. The entry list is not the
// answer on its own: it also carries the boundary marker, which is a position rather than a
// write, so a stat nothing modified would otherwise present as modified.
function traceHasWrites(projected) {
  return !!(projected && Array.isArray(projected.entries)
    && projected.entries.some(entry => !entry.boundary));
}

// Append a transform which is applied after the main derivation record (for example the
// displayed Vertigo defense penalty).  No-op transforms stay absent, exactly like
// `recordStepTrace` entries.
function appendProjectedTraceEntry(projected, step, from, to) {
  if (!projected || from === to) return projected;
  projected.entries.push({
    id: step.id,
    source: traceSourceForStep(step),
    phase: step.phase,
    order: step.order,
    from,
    to,
  });
  projected.result = to;
  return projected;
}
