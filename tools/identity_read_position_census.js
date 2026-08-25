'use strict';

// Census of every identity read the derivation makes, and of the record each one actually gets.
//
//   node tools/identity_read_position_census.js              # report
//   node tools/identity_read_position_census.js --scan       # raw channel scan (authoring aid)
//   node tools/identity_read_position_census.js --json out.json
//
// WHY. `applyOrderedIdentityConversions` (`Calculator/stats_identity.js`) resolves live race and
// Fantastic to a fixed point before the stat sequence runs, so a gate that reads the live record
// is handed the end of the conversion list rather than the record standing at the gate's own
// chain rank. F163 removes the pre-pass; every such read has to be corrected first. Discovery so
// far has been by ablating one conversion (`d:spiritLink`) and watching a digest move, which is
// blind three ways: it perturbs Fantastic only, it cannot tell a hoisted early read from a
// correct late one, and it says nothing about a gate ranked before a region-`c` conversion.
//
// WHAT THIS MEASURES INSTEAD. Three parts, each checkable:
//
//   1. A channel scan over the `data-scope="core"` sources for every name through which the
//      calculated identity reaches a gate, attributed to its enclosing symbol. Every hit must be
//      claimed by a row of SITES below; an unclaimed hit halts, so a read added later cannot
//      enter the code unclassified (`SPEC.md`, *Out-of-range values stop the run*).
//   2. A divergence oracle. The identity conversions are discovered by perturbation rather than
//      declared: every control of ABILITY_DEFS/ENCHANTMENT_DEFS crossed with every identity axis
//      is run through the pre-pass, and each conversion that fires is recorded with its chain
//      rank and the fields it writes. A site owned by chain entry K is then **hoisted** for field
//      f exactly when some conversion of rank >= rank(K) writes f, and its record choice is
//      **observable** (calculated vs permanent differ) exactly when some conversion writes f at
//      all. This covers race as well as Fantastic and every conversion, not one.
//   3. Corpus counts. The pre-pass is wrapped for one full `tools/derivation_equivalence.js`
//      case list; the unrestricted call already returns an ordered trace carrying each
//      conversion's chain rank and its `{from,to}`, so every prefix of the conversion list is
//      reconstructed from that one call. Per site it reports the cases whose record at the
//      site's own rank differs from the fixed point it is handed, and the subset of those where
//      the site's own control is also present.
//
// The corrections already landed for F163 are the ground truth: GROUND_TRUTH below names
// each one's chain entry and the comparison it turned on, and the run fails loudly if the oracle
// does not independently reproduce it.
//
// Cost: one corpus derivation pass, about the same as `tools/derivation_equivalence.js` — ~25s
// since the identity axis widened that corpus to 52575 cases, from ~11s at 15525. It is a
// diagnostic like `tools/preset_vacuity_sweep.js`, not part of `npm test` or
// `node tools/node_unit_checks.js`.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { calculatorSources, loadCalculatorContext, repoRoot } = require('./calculator_sources');
const { enumerateCases } = require('./derivation_equivalence');

// ---------------------------------------------------------------------------
// 1. The channel vocabulary: the names through which the *calculated* identity reaches a gate.
const CHANNELS = [
  { token: 'identity.race', reads: ['race'] },
  { token: 'identity.fantastic', reads: ['fantastic'] },
  { token: 'isFantasticLive', reads: ['fantastic'] },
  { token: 'unitTypeRaw', reads: ['race', 'fantastic'] },
  { token: 'unitTypeVal', reads: ['race', 'fantastic'] },
  { token: 'unitRealm', reads: ['race'] },
  { token: 'unitIsChaos', reads: ['race', 'fantastic'] },
  { token: 'liveRace', reads: ['race'] },
  { token: 'liveFantastic', reads: ['fantastic'] },
  // Positional replays already in place; each names the chain entry it stops before.
  { token: 'identityAtChaosSurge', reads: ['race', 'fantastic'] },
  { token: 'fantasticAtModernEncMagicRule', reads: ['fantastic'] },
  { token: 'chaosSurgeRealm', reads: ['race'] },
  { token: 'nauseaUnitType', reads: ['race', 'fantastic'] },
  { token: 'identityAtTrueLight', reads: ['race', 'fantastic'] },
  { token: 'trueLightRealm', reads: ['race'] },
  { token: 'identityAtPoorVision', reads: ['race', 'fantastic'] },
  { token: 'poorVisionRealm', reads: ['race'] },
  { token: 'identityAtWarpReality', reads: ['race', 'fantastic'] },
  { token: 'survivalInstinctUnitType', reads: ['race', 'fantastic'] },
  { token: 'landLinkingUnitType', reads: ['race', 'fantastic'] },
  { token: 'blazingEyesActive', reads: ['race', 'fantastic'] },
  // The compact token as it reaches the ability-step builder and combat resolution.
  { token: "abilVal(abilities, 'unitType'", reads: ['race', 'fantastic'] },
  { token: 'defUnit.unitType', reads: ['race', 'fantastic'] },
  { token: 'unit.unitType', reads: ['race', 'fantastic'] },
  { token: 'atkUnitType', reads: ['race', 'fantastic'] },
];

// ---------------------------------------------------------------------------
// 2. The site table. One row per (file, enclosing symbol, channel).
//
// `owner` is the chain entry that carries the effect this read gates — the fact the tool cannot
// derive, and the one place judgement enters. It may list one key per engine family; exactly one
// of them must exist in a given version's chain. The values it can take otherwise:
//   'plumbing'    the read declares or forwards a channel and gates nothing.
//   'post-chain'  the read happens after the whole recalculation, in combat resolution or on the
//                 returned record, where the fixed point is the finished record and is correct.
//   'targeting'   the read models a *cast-time targeting* restriction rather than a term of any
//                 block, so it has no owning chain entry: the engine evaluates targetability
//                 against the record the recalculation leaves, which is what the fixed point is.
//                 Spirit Link is the citation — it asserts Fantastic at UnitCalcPre.CAS:25-28 so
//                 the unit takes fantastic bonuses, and clears it at UnitCalc.CAS:1305-1306 so the
//                 "enchanted fantastic unit could not be targeted by fantastic-only spell". A row
//                 takes this value only where the block it feeds makes no such test of its own.
//   'dead-arm'    the expression is unreachable in every version.
// `record` is what the site is handed today: 'fixed-point', 'positional:<key>', 'positional:owner',
// or 'n/a'. `positional:owner` is the replay that stops at the site's *own* owner entry, which is
// the only form available to a read whose owner differs by engine family — `b:trueLight` in
// Warlord against `c:trueLight` in the MoM builds — since a literal key would name no entry of the
// other family's chain.
// `trigger` names the control that turns the effect on, used to narrow the corpus count: an
// ability-map key, or `{ input: 'name' }` for a top-level input. `null` means the effect has no
// single control and the narrowed count equals the divergent one.
const SITES = [
  // --- stats.js: channel declarations and forwarding ------------------------------------
  { key: 'Calculator/stats.js#unitTypeVal#unitTypeRaw', owner: 'plumbing', record: 'n/a',
    note: 'alias of the projection' },
  { key: 'Calculator/stats.js#isFantasticLive#identity.fantastic', owner: 'plumbing', record: 'n/a',
    note: 'declares the channel' },
  { key: 'Calculator/stats.js#unitRealm#unitTypeVal', owner: 'plumbing', record: 'n/a',
    note: 'declares the realm channel' },
  { key: 'Calculator/stats.js#unitIsChaos#identityAtWarpReality', owner: 'plumbing', record: 'n/a',
    note: 'declares the Chaos channel from the replay at c:warpReality' },
  { key: 'Calculator/stats.js#unitIsChaos#unitTypeVal', owner: 'plumbing', record: 'n/a',
    note: 'declares the Chaos channel' },
  { key: 'Calculator/stats.js#nauseaUnitType#unitTypeVal', owner: 'plumbing', record: 'n/a',
    note: 'the else arm, taken only when the curse is absent and the value is unread' },
  { key: 'Calculator/stats.js#survivalInstinctUnitType#unitTypeVal', owner: 'plumbing', record: 'n/a',
    note: 'the else arm, taken only when the enchantment is absent' },
  { key: 'Calculator/stats.js#landLinkingUnitType#unitTypeVal', owner: 'plumbing', record: 'n/a',
    note: 'the else arm, taken only when the enchantment is absent' },
  { key: 'Calculator/stats.js#effectiveAbilities#unitTypeVal', owner: 'plumbing', record: 'n/a',
    note: 'publishes the compact token onto the ability map, and calls supremeLightActiveForUnit' },
  { key: 'Calculator/stats.js#effectiveAbilities#identity.race', owner: 'plumbing', record: 'n/a',
    note: 'publishes liveRace' },
  { key: 'Calculator/stats.js#effectiveAbilities#liveRace', owner: 'plumbing', record: 'n/a',
    note: 'publishes liveRace; F147 records that nothing reads it' },
  { key: 'Calculator/stats.js#effectiveAbilities#identity.fantastic', owner: 'plumbing', record: 'n/a',
    note: 'publishes liveFantastic' },
  { key: 'Calculator/stats.js#effectiveAbilities#liveFantastic', owner: 'plumbing', record: 'n/a',
    note: 'publishes liveFantastic' },
  { key: 'Calculator/stats.js#abilSteps#identity.fantastic', owner: 'plumbing', record: 'n/a',
    note: 'builds identityPredicates for getAbilityStatSteps' },
  { key: 'Calculator/stats.js#abilSteps#liveFantastic', owner: 'plumbing', record: 'n/a',
    note: 'builds identityPredicates for getAbilityStatSteps' },
  { key: 'Calculator/stats.js#rawStatSteps#blazingEyesActive', owner: 'plumbing', record: 'n/a' },
  { key: 'Calculator/stats.js#rawStatSteps#nauseaUnitType', owner: 'plumbing', record: 'n/a' },
  { key: 'Calculator/stats.js#rawStatSteps#unitTypeVal', owner: 'plumbing', record: 'n/a' },
  { key: 'Calculator/stats.js#rawStatSteps#unitIsChaos', owner: 'plumbing', record: 'n/a' },
  { key: 'Calculator/stats.js#modifierTraces#identity.race', owner: 'plumbing', record: 'n/a',
    note: 'projects the conversion trace' },
  { key: 'Calculator/stats.js#modifierTraces#identity.fantastic', owner: 'plumbing', record: 'n/a',
    note: 'projects the conversion trace' },
  { key: 'Calculator/stats.js#result#unitTypeVal', owner: 'post-chain', record: 'fixed-point',
    note: 'the finished record handed to combat' },

  // --- stats.js: positional replays already in place -----------------------------------
  { key: 'Calculator/stats.js#fantasticAtModernEncMagicRule#identityAtChaosSurge',
    owner: 'c:chaosSurge', record: 'positional:c:chaosSurge', trigger: null,
    effect: 'modern standing EncMagic rule', settled: 'F174/F178' },
  { key: 'Calculator/stats.js#blazingEyesActive#identityAtChaosSurge',
    owner: 'c:blazingEyes', record: 'positional:c:chaosSurge', trigger: 'blazingEyes',
    effect: 'Blazing Eyes', settled: 'F174' },
  { key: 'Calculator/stats.js#chaosSurgeRealm#identityAtChaosSurge',
    owner: 'c:chaosSurge', record: 'positional:c:chaosSurge',
    trigger: { input: 'chaosSurge' }, effect: 'Chaos Surge', settled: 'F178' },
  { key: 'Calculator/stats.js#chaosSurgeCount#chaosSurgeRealm',
    owner: 'c:chaosSurge', record: 'positional:c:chaosSurge',
    trigger: { input: 'chaosSurge' }, effect: 'Chaos Surge', settled: 'F178' },
  { key: 'Calculator/stats.js#modernEncMagicIndependentOfMaterial#fantasticAtModernEncMagicRule',
    owner: 'c:chaosSurge', record: 'positional:c:chaosSurge', trigger: null,
    effect: 'modern standing EncMagic rule', settled: 'F178' },
  { key: 'Calculator/stats.js#survivalInstinctEligible#survivalInstinctUnitType',
    owner: 'c:survivalInstinct', record: 'positional:c:survivalInstinct',
    trigger: 'survivalInstinct', effect: 'Survival Instinct', settled: 'F177' },
  { key: 'Calculator/stats.js#landLinkingEligible#landLinkingUnitType',
    owner: 'c:landLinking', record: 'positional:c:landLinking', trigger: 'landLinking',
    effect: 'Land Linking', settled: 'F173' },
  { key: 'Calculator/stats.js#spellWardActive#fantasticAtModernEncMagicRule',
    owner: 'c:spellWard', record: 'positional:c:chaosSurge', trigger: 'spellWard',
    effect: 'Spell Ward (Fantastic half)', settled: 'F163 tranche' },

  // --- stats.js: fixed-point reads that gate a positioned effect ------------------------
  // Rust's `UnitCalc.CAS:492-503` block is gated on the enchantment flag alone and makes no
  // Fantastic test of either record, so this term is not a gate of that block at all: it is the
  // helptext's "Target: enemy regular unit" restriction, evaluated where the engine evaluates
  // targeting — against the record the recalculation leaves. The fixed point is that record, so
  // the read is correct and `d:rust` was never its owner (F183).
  { key: 'Calculator/stats.js#rustActive#isFantasticLive', owner: 'targeting',
    record: 'fixed-point', trigger: 'rust', effect: 'Rust targeting restriction',
    settled: 'F183' },
  { key: 'Calculator/stats.js#misleadEligible#identity.fantastic', owner: 'e:mislead',
    record: 'fixed-point', trigger: 'mislead', effect: 'Mislead' },
  { key: 'Calculator/stats.js#nodeAuraActive#unitRealm', owner: 'c:nodeAura',
    record: 'fixed-point', trigger: null, effect: 'Node aura' },
  { key: 'Calculator/stats.js#spellWardActive#unitRealm', owner: 'c:spellWard',
    record: 'fixed-point', trigger: 'spellWard', effect: 'Spell Ward (realm half)' },
  { key: 'Calculator/stats.js#realmWardActive#identity.fantastic', owner: 'c:realmWard',
    record: 'fixed-point', trigger: 'realmWard', effect: 'Realm Ward' },
  { key: 'Calculator/stats.js#realmWardActive#unitRealm', owner: 'c:realmWard',
    record: 'fixed-point', trigger: 'realmWard', effect: 'Realm Ward' },
  { key: 'Calculator/stats.js#darknessAtkDefMagnitude#unitRealm', owner: 'c:darkness',
    record: 'fixed-point', trigger: null, effect: 'Darkness' },
  { key: 'Calculator/stats.js#darknessResBonus#unitRealm', owner: 'c:darkness',
    record: 'fixed-point', trigger: null, effect: 'Darkness' },
  { key: 'Calculator/stats.js#trueLightRealm#identityAtTrueLight', owner: 'plumbing', record: 'n/a',
    note: 'declares the realm channel the True Light package reads' },
  { key: 'Calculator/stats.js#trueLightRealm#unitRealm', owner: 'plumbing', record: 'n/a',
    note: 'the else arm, taken only when the enchantment is absent and the value is unread' },
  { key: 'Calculator/stats.js#trueLightResBonus#trueLightRealm', owner: ['c:trueLight', 'b:trueLight'],
    record: 'positional:owner', trigger: { input: 'trueLight' }, effect: 'True Light',
    settled: 'F185' },
  { key: 'Calculator/stats.js#eternalNightEnemyResPenalty#unitRealm',
    owner: 'c:eternalNight:enemyResistance', record: 'fixed-point', trigger: null,
    effect: 'Eternal Night, enemy Resistance' },
  { key: 'Calculator/stats.js#poorVisionRealm#identityAtPoorVision', owner: 'plumbing',
    record: 'n/a', note: 'declares the realm channel the Poor Vision penalty reads' },
  { key: 'Calculator/stats.js#poorVisionRealm#unitRealm', owner: 'plumbing', record: 'n/a',
    note: 'the else arm, taken only when the enchantment is absent and the value is unread' },
  { key: 'Calculator/stats.js#warlordEternalNightActive#poorVisionRealm',
    owner: 'b:eternalNight:poorVision', record: 'positional:owner',
    trigger: { input: 'enemyEternalNight' },
    effect: 'Eternal Night, Poor Vision', settled: 'F186' },
  { key: 'Calculator/stats.js#metalFiresActive#identity.fantastic', owner: 'c:metalFires',
    record: 'fixed-point', trigger: 'metalFires', effect: 'Metal Fires, weapon upgrade half' },
  { key: 'Calculator/stats.js#supremeLightEligibleAt#unitTypeVal',
    owner: ['e:supremeLight', 'c:supremeLight'], record: 'fixed-point', trigger: 'supremeLight',
    effect: 'Supreme Light' },
  { key: 'Calculator/stats.js#toHitImmolation#unitIsChaos', owner: 'c:warpReality',
    record: 'positional:c:warpReality', trigger: { input: 'warpReality' },
    effect: 'Warp Reality, Immolation To Hit', settled: 'F184' },

  // --- stats_sequence.js ----------------------------------------------------------------
  { key: 'Calculator/stats_sequence.js#precalcScriptStatSteps#nauseaUnitType', owner: 'plumbing',
    record: 'n/a' },
  { key: 'Calculator/stats_sequence.js#precalcScriptStatSteps#unitTypeVal', owner: 'plumbing',
    record: 'n/a' },
  { key: 'Calculator/stats_sequence.js#magicCalcBinaryStatSteps#blazingEyesActive',
    owner: 'plumbing', record: 'n/a' },
  { key: 'Calculator/stats_sequence.js#magicCalcBinaryStatSteps#unitTypeVal', owner: 'plumbing',
    record: 'n/a' },
  { key: 'Calculator/stats_sequence.js#magicCalcBinaryStatSteps#unitIsChaos', owner: 'plumbing',
    record: 'n/a' },
  { key: 'Calculator/stats_sequence.js#step:nausea#nauseaUnitType', owner: 'b:nausea',
    record: 'positional:b:nausea', trigger: 'nausea', effect: 'Conjuring Pact nausea',
    settled: 'F170' },
  { key: 'Calculator/stats_sequence.js#step:blazingEyes#blazingEyesActive', owner: 'c:blazingEyes',
    record: 'positional:c:chaosSurge', trigger: 'blazingEyes', effect: 'Blazing Eyes',
    settled: 'F174' },
  { key: 'Calculator/stats_sequence.js#step:soulLinkerAura#identity.fantastic',
    owner: 'c:soulLinkerAura', record: 'fixed-point', trigger: 'soulLinkerAura',
    effect: 'Soul Linker aura (CoM 1)' },
  { key: 'Calculator/stats_sequence.js#step:warpReality#unitIsChaos', owner: 'c:warpReality',
    record: 'positional:c:warpReality', trigger: { input: 'warpReality' },
    effect: 'Warp Reality', settled: 'F184' },
  // Every engine's Shatter block tests the enchantment flag alone — A32 states the recompute
  // consumer carries "no race, hero, or unit-type test" — so the unit-type expression is the
  // spell's cast-time target class, not a term of the block: "Target: one normal unit" in the DOS
  // builds (a live `BATTLE_UNIT.race < 0x0F` at human targeting), "Target: enemy normal unit" in
  // CoM2, and "Target: enemy unit" in Warlord, which is the `isWarlord` disjunct. Targeting is
  // evaluated against the record the recalculation leaves, so the fixed point is correct and
  // `c:shatter` was never this read's owner (F188, on F183's rule).
  { key: 'Calculator/stats_sequence.js#step:shatter#unitTypeVal', owner: 'targeting',
    record: 'fixed-point', trigger: 'shatter', effect: 'Shatter target class',
    settled: 'F188' },

  // --- combat_abilities.js ---------------------------------------------------------------
  { key: 'Calculator/combat_abilities.js#misleadActiveForUnit#liveFantastic', owner: 'plumbing',
    record: 'n/a', note: 'parameter of the eligibility helper; the read is at its call site' },
  { key: 'Calculator/combat_abilities.js#liveRealm#identity.race', owner: 'plumbing',
    record: 'n/a', note: 'the realm projection itself' },
  { key: 'Calculator/combat_abilities.js#step:soulLinkerAura#liveFantastic',
    owner: 'e:soulLinkerAura', record: 'fixed-point', trigger: 'soulLinkerAura',
    effect: 'Soul Linker aura (modern)' },
  { key: 'Calculator/combat_abilities.js#step:leadershipAura#liveFantastic',
    owner: 'e:leadershipAura', record: 'fixed-point', trigger: 'leadershipAura',
    effect: 'Leadership aura' },
  { key: 'Calculator/combat_abilities.js#step:metalFires#liveFantastic', owner: 'c:metalFires',
    record: 'fixed-point', trigger: 'metalFires', effect: 'Metal Fires, stat half' },
  // Tactician's branch pair and Rebuild's phase choice used to read the compact token here. Both
  // blocks ask whether the unit is a hero — `U.ishero`, `_UNITS[].Hero_Slot >= 0`, `ISHERO(U)` —
  // and the hero flag is not part of the calculated identity, so after F187 neither site reads
  // this vocabulary at all and neither has a row.

  // --- stats_identity.js -----------------------------------------------------------------
  { key: 'Calculator/stats_identity.js#legacyUnitTypeFromLiveIdentity#identity.fantastic',
    owner: 'plumbing', record: 'n/a', note: 'the compact-token projection' },
  { key: 'Calculator/stats_identity.js#realm#identity.race', owner: 'plumbing', record: 'n/a',
    note: 'the compact-token projection' },
  { key: 'Calculator/stats_identity.js#realm#identity.fantastic', owner: 'plumbing', record: 'n/a',
    note: 'the compact-token projection' },

  // --- combat resolution: reads of the finished record ------------------------------------
  { key: 'Calculator/combat_special_attacks.js#weaponImmunityApplies#atkUnitType',
    owner: 'post-chain', record: 'fixed-point', effect: 'Weapon Immunity admission' },
  { key: 'Calculator/combat_effects.js#baseFantastic#unit.unitType', owner: 'post-chain',
    record: 'fixed-point',
    note: 'last-resort decode of the *permanent* flag from the live token; F145 records the '
      + 'three-shape disagreement' },
  { key: 'Calculator/combat_effects.js#realm#unit.unitType', owner: 'post-chain',
    record: 'fixed-point', effect: 'Angelic Guardians realm' },
  { key: 'Calculator/combat_effects.js#targetIsNormal#defUnit.unitType', owner: 'post-chain',
    record: 'fixed-point', effect: 'Blood Lust target class' },
];

// ---------------------------------------------------------------------------
// 3. Ground truth: the corrections already landed for F163. Each names the chain entry its gate
// sits at and which comparison it turned on — 'positional' where the fixed point was replaced by
// the record at that rank, 'permanent' where it was replaced by the base record, 'hero' where the
// gate's block asks a hero question the calculator was spelling through the live token so the read
// left this vocabulary entirely, and 'write' where the finding was a missing conversion rather
// than a read. 'positional' and 'hero' both assert the read was hoisted at its entry — the
// condition that made it a defect; 'permanent' asserts only that the two records are
// distinguishable there. The oracle must reproduce each.
//
// `moved` is prose, not an assertion: the digest count the correction was recorded with. Every one
// of them was measured against the 15525-case corpus that stated no hero and no base race, and the
// identity axis added 2026-08-25 raises all of them. Four have been re-measured against the
// widened 52575-case list by ablating the landed change; each carries both numbers. The rest still
// carry their original figure alone, and F185 is the reason to distrust an unre-measured one:
// its recorded 7 was 8, and the pair's recorded "8 of 15525" was 9.
const GROUND_TRUTH = [
  { id: 'F167', effect: 'the unitRace alias, five Warlord building gates', at: 'base:altarOfTheMoon',
    fields: ['race'], comparison: 'permanent', versions: ['com2_warlord_1.5.12.7'], moved: 0 },
  { id: 'F169', effect: 'survivalInstinctToBlkBonus', at: 'base:survivalInstinctToBlock',
    fields: ['fantastic'], comparison: 'permanent', versions: ['com2_warlord_1.5.12.7'], moved: 11 },
  { id: 'F170', effect: 'b:nausea', at: 'b:nausea', fields: ['fantastic'], comparison: 'positional',
    versions: ['com2_warlord_1.5.12.7'], moved: 9 },
  { id: 'F171', effect: 'wofDefenderBonusActive', at: 'b:wallOfFire:garrison', fields: ['fantastic'],
    comparison: 'permanent', versions: ['com2_warlord_1.5.12.7'], moved: 6 },
  { id: 'F172', effect: 'explosiveEligible', at: 'b:bombsGrenades', fields: ['fantastic'],
    comparison: 'permanent', versions: ['com2_warlord_1.5.12.7'], moved: 9 },
  { id: 'F173', effect: 'landLinkingEligible', at: 'c:landLinking', fields: ['fantastic'],
    comparison: 'positional', versions: ['com_6.08', 'com2_warlord_1.5.12.7'], moved: 7 },
  // F174's 8 moved cases are its *write* half — the Doom Gaze grant leaving the `base:stat:base`
  // seed for its own region-`c` position — which this oracle does not measure. Its identity half
  // is a positional read, and the item records why it needed no new replay: `c:blazingEyes` sits
  // after `c:chaosSurge` with no conversion of either modern chain between them. So the position
  // is divergent in Warlord alone, where `d:spiritLink` still follows it.
  { id: 'F174', effect: 'blazingEyesActive', at: 'c:blazingEyes', fields: ['race', 'fantastic'],
    comparison: 'positional', versions: ['com2_warlord_1.5.12.7'], moved: 0 },
  { id: 'F176', effect: "Spirit Link's region-b Fantastic assert", at: 'b:spiritLink',
    fields: ['fantastic'], comparison: 'write', versions: ['com2_warlord_1.5.12.7'], moved: 2 },
  { id: 'F177', effect: 'survivalInstinctUnitType', at: 'c:survivalInstinct', fields: ['fantastic'],
    comparison: 'positional', versions: ['com2_warlord_1.5.12.7'], moved: 2 },
  { id: 'F178', effect: 'chaosSurgeRealm', at: 'c:chaosSurge', fields: ['race'],
    comparison: 'positional', versions: ['mom_1.31', 'mom_cp_1.60.00'], moved: 24, movedWide: 108 },
  { id: 'F179', effect: 'Breakthrough normal package', at: 'c:breakthrough:normal',
    fields: ['fantastic'], comparison: 'permanent',
    versions: ['com2_1.05.11', 'com2_warlord_1.5.12.7'], moved: 19 },
  // F185 and F186 are the first two corrections this tool found rather than confirmed, and the
  // first of the region-`b` class: a live *race* read hoisted by the six region-`c` conversions
  // rather than by the Spirit Link pair. Only `c:undead` and `c:destiny:race` of those six write
  // a realm either block tests, and each block's own Undead-flag term now answers for `c:undead`.
  //
  // Re-measured 2026-08-25 by rebuilding the corpus at the landing commit and its parent: the pair
  // moves **9** of the 15525 cases it was measured over, not the 8 recorded, and the split is 8/1
  // rather than 7/1, disjoint. Each half was then ablated separately on the widened list. The
  // separation matters for one further reason: reverting only the *positional read* of each half
  // moves 6 and **0** cases, so F186's whole recorded movement is its block's own Undead-flag
  // term, not the repositioning — SPEC.md rule (4) in its sharpest form.
  { id: 'F185', effect: 'the True Light package', at: 'b:trueLight', fields: ['race'],
    comparison: 'positional', versions: ['com2_warlord_1.5.12.7'], moved: 8, movedWide: 36 },
  { id: 'F186', effect: 'warlordEternalNightActive', at: 'b:eternalNight:poorVision',
    fields: ['race'], comparison: 'positional', versions: ['com2_warlord_1.5.12.7'],
    moved: 1, movedWide: 4 },
  // F184's `moved` is 0 for the reason the third tranche rule states, and stays 0 on the widened
  // list — re-measured 2026-08-25 by ablating the positional read. The corpus now has 10515
  // Warlord cases: 388 carry Warp Reality, of which 22 also carry Spirit Link and 30 a Chaos
  // Channels flag, but **0 carry a Chaos realm and Spirit Link together**, by either route — 62
  // cases state a permanently-Chaos Fantastic record and 7 of those carry Warp Reality, none with
  // Spirit Link. So no generated case can still tell the two records apart, and the correction's
  // evidence remains its two presets. Its sibling F183 has no row here on purpose: that
  // read turned out not to be a hoisting defect at all but a targeting restriction, and the
  // `targeting` classification is what records it.
  { id: 'F184', effect: 'unitIsChaos, the Warp Reality step and the Immolation To Hit read',
    at: 'c:warpReality', fields: ['race', 'fantastic'], comparison: 'positional',
    versions: ['com2_warlord_1.5.12.7'], moved: 0, movedWide: 0 },
  // F187's two sites left the vocabulary rather than changing record: both blocks ask `ISHERO`,
  // and the hero flag is not part of the calculated identity. `moved` was 0 for the third tranche
  // rule's reason and for the sharpest instance of it — every case in the list was
  // `unitType: 'normal'`, so no generated case even entered either branch, and the evidence had to
  // be four presets. The identity axis is the direct answer to that: Tactician now moves 34 cases,
  // 0 of them in the old raceless-custom segment, across the three versions the item named — 13
  // CoM 1, 15 CoM2, 6 Warlord. Rebuild stays 0 even widened, because its defect is a *phase*
  // choice and nothing between `base` and `b` scales the +2/+2 it moves; its evidence is still its
  // presets. The versions listed are the ones whose *position* was divergent, which is what this
  // oracle checks.
  { id: 'F187', effect: 'Tactician, hero branch', at: 'c:tactician',
    fields: ['race', 'fantastic'], comparison: 'hero',
    versions: ['com2_warlord_1.5.12.7'], moved: 0, movedWide: 34 },
  { id: 'F187', effect: 'Rebuild, hero/non-hero phase choice', at: 'base:rebuild',
    fields: ['race', 'fantastic'], comparison: 'hero',
    versions: ['com2_warlord_1.5.12.7'], moved: 0, movedWide: 0 },
];

// What the measurement cannot see. Every earlier round on this seam under-claimed its blind
// spots and was falsified within one round; these are printed with the report so a reader cannot
// take the site list for the whole population.
const BLIND_SPOTS = [
  'The case counts are a floor, not a bound, and the floor moved on 2026-08-25. The corpus now '
    + 'states three permanent identities across the whole list — a raceless custom unit, a High '
    + 'Men non-hero and a High Men hero — and eighteen more in combination cases only. So a gate '
    + 'comparing live race to a mundane race, and every hero branch, is now reached: F187 went '
    + 'from 0 of 15525 to 34 of 52575, and F175 from 0 to 64. What is still not reached: those '
    + 'eighteen identities against a solo control or a bare environment; the unit *name*, which '
    + 'the unit-specific building branches test with endsWith; roster-selected units; and the '
    + "defending side's identity, since every case derives side `a`.",
  'A conversion whose write equals the value the identity axis already holds is invisible to the '
    + 'oracle, because discovery reads the trace and collectStepChanges (Calculator/steps.js) '
    + 'records only fields a step moved. b:fieryFury:race was undiscovered for exactly that '
    + "reason — the basis's only base-Fantastic axis stated race 'Chaos', which is what that "
    + 'conversion writes — until the widened corpus reached it and the guard below threw. '
    + 'The guard is the protection, not the basis; a conversion the corpus never reaches either '
    + 'is still invisible and unguarded.',
  'Reachability is not modelled, and nothing flags it any more. A read behind a version test that '
    + 'skips it in the one version whose position diverges would still be reported hoisted. '
    + 'c:shatter was the one such site and carried a marker for it; F188 found the marker was '
    + 'answering the wrong question — the read is a targeting restriction, so reachability never '
    + 'bore on it — and the marker went with the reclassification. A future case has no marker and '
    + 'must be found by reading the block.',
  "A gate's owner chain entry is judgement, not measurement. The SITES table assigns it and a "
    + 'wrong assignment gives a wrong verdict in silence; only the citation beside each row '
    + 'defends it.',
  'It measures which record a site is *handed*, never which record its block *reads*. Whether a '
    + 'calculated read should have been the permanent one — the answer F169, F171, F172 and F179 '
    + 'all reached — needs the block. The tool only reports that the two are distinguishable, '
    + 'and in how many cases.',
  'A read that names no channel is invisible: a gate handed the whole live identity record and '
    + 'destructuring it under new names, or an identity fact recomputed from a stat, is outside '
    + 'the vocabulary and outside the halt that protects it.',
  'Write-side omissions are out of scope. F176 was a conversion the sequence did not make at '
    + 'all; the oracle enumerates the conversions the code already contains and cannot miss one '
    + 'it does not have.',
  'Post-chain reads are assumed correct by construction. Combat resolution gets the finished '
    + 'record, so the fixed point is right there — unless some combat rule wants an earlier one, '
    + 'which this tool does not ask.',
  'Which *units* a gate covers is a different question from which *record* it reads. F175 (the '
    + 'hero exclusion in b:nausea and b:wallOfFire:garrison) is out of scope here: both sites '
    + 'already read the record their blocks read, and their defect is the isNormalUnitType '
    + 'predicate. It is no longer invisible to the *digest*, though — with a hero in the case '
    + 'list it measures 64 cases, 35 nausea and 30 garrison, one shared. '
    + 'Rebuild and Tactician were reported only because they spelled a hero question '
    + 'through the live compact token; F187 gave both the hero flag, so neither is in this '
    + 'vocabulary now and a hero test written that way again would be found the same way.',
];

// ---------------------------------------------------------------------------
// 4. Source scanning. Comments are blanked first — a comment is not a read.
function stripComments(text) {
  let out = '';
  let i = 0;
  let mode = 'code';
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (mode === 'code') {
      if (ch === '/' && next === '/') { mode = 'line'; out += '  '; i += 2; continue; }
      if (ch === '/' && next === '*') { mode = 'block'; out += '  '; i += 2; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { mode = ch; out += ch; i += 1; continue; }
      out += ch; i += 1; continue;
    }
    if (mode === 'line') {
      if (ch === '\n') { mode = 'code'; out += '\n'; i += 1; continue; }
      out += ' '; i += 1; continue;
    }
    if (mode === 'block') {
      if (ch === '*' && next === '/') { mode = 'code'; out += '  '; i += 2; continue; }
      out += ch === '\n' ? '\n' : ' '; i += 1; continue;
    }
    if (ch === '\\') { out += '  '; i += 2; continue; }
    if (ch === mode) mode = 'code';
    out += ch; i += 1;
  }
  return out;
}

// The nearest enclosing named thing. A step literal within four lines below the read owns it —
// a gate is written above the `statStep`/`abilityStep` call it guards — otherwise the nearest
// declaration above. Line numbers are deliberately not part of a site key: they move whenever
// the file above them does, and the key has to survive that.
const SYMBOL_PATTERNS = [
  /^\s*function\s+([A-Za-z0-9_$]+)/,
  /^\s*(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=/,
  /^\s*(?:const|let|var)\s+\{[^}]*\}\s*=/,
];
const STEP_PATTERNS = [
  /statStep\(\{\s*id:\s*'([^']+)'/,
  /abilityStep\('([^']+)'/,
  /id:\s*'([^']+)',\s*sourceId/,
];

function stepIdOn(line) {
  for (const pattern of STEP_PATTERNS) {
    const match = pattern.exec(line);
    if (match) return match[1];
  }
  return null;
}

// Bracket depth at the start of each line, with string bodies blanked so a bracket inside a
// literal cannot skew it. Used to decide whether a step literal *encloses* a read or merely
// stands next to it.
function lineDepths(lines) {
  const depths = [];
  let depth = 0;
  for (const line of lines) {
    depths.push(depth);
    const bare = line.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '""');
    for (const ch of bare) {
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    }
  }
  return depths;
}

function symbolFor(lines, depths, index) {
  // 1. A step literal that encloses the read owns it — `statStep({ id: 'x', … when: … })`.
  const own = stepIdOn(lines[index]);
  if (own) return `step:${own}`;
  for (let j = index - 1; j >= 0 && j > index - 60; j -= 1) {
    const id = stepIdOn(lines[j]);
    if (!id) continue;
    let inside = true;
    for (let k = j + 1; k <= index; k += 1) if (depths[k] <= depths[j]) { inside = false; break; }
    if (inside) return `step:${id}`;
  }
  // 2. A gate that opens a block whose next statement is a step call — `if (…) { abilityStep(…) }`.
  if (/\{\s*$/.test(lines[index])) {
    let seen = 0;
    for (let j = index + 1; j < lines.length && seen < 4; j += 1) {
      if (!lines[j].trim()) continue;
      seen += 1;
      const id = stepIdOn(lines[j]);
      if (id) return `step:${id}`;
    }
  }
  // 3. Otherwise the nearest declaration above.
  for (let i = index; i >= 0; i -= 1) {
    for (const pattern of SYMBOL_PATTERNS) {
      const match = pattern.exec(lines[i]);
      if (match) return match[1] || '(destructure)';
    }
  }
  return '(top level)';
}

// `const isFantasticLive = ...` declares the channel; it does not read one.
function isDeclarationOf(token, line) {
  if (!/^[A-Za-z0-9_$]+$/.test(token)) return false;
  return new RegExp(`(?:const|let|var)\\s+${token}\\s*=`).test(line)
    && !new RegExp(`\\b${token}\\b`).test(line.split('=').slice(1).join('='));
}

function scanSources() {
  const hits = [];
  for (const file of calculatorSources().core) {
    const lines = stripComments(fs.readFileSync(path.join(repoRoot, file), 'utf8')).split('\n');
    const depths = lineDepths(lines);
    lines.forEach((line, index) => {
      for (const channel of CHANNELS) {
        let from = 0;
        for (;;) {
          const at = line.indexOf(channel.token, from);
          if (at < 0) break;
          from = at + 1;
          // A longer channel that spans this position owns the hit.
          const shadowed = CHANNELS.some((other) => {
            if (other === channel || !other.token.includes(channel.token)) return false;
            const start = line.indexOf(other.token);
            return start >= 0 && start <= at
              && start + other.token.length >= at + channel.token.length;
          });
          if (shadowed) continue;
          if (isDeclarationOf(channel.token, line)) continue;
          hits.push({ file, line: index + 1, token: channel.token, reads: channel.reads,
            symbol: symbolFor(lines, depths, index), text: line.trim() });
        }
      }
    });
  }
  return hits;
}

function siteKeyOf(hit) { return `${hit.file}#${hit.symbol}#${hit.token}`; }

// ---------------------------------------------------------------------------
// 5. The calculator context, and the identity conversions discovered by perturbation.
const ctx = loadCalculatorContext();
const read = expression => vm.runInContext(expression, ctx);

const VERSIONS = read('ENGINE_VERSIONS');
const statChain = read('statChain');
const applyOrderedIdentityConversions = read('applyOrderedIdentityConversions');
const deriveUnitStats = read('deriveUnitStats');

const IDENTITY_FIELDS = ['race', 'fantastic'];

// The identity axes the conversions branch on, beside the ability map. Each is a whole identity
// record, so a conversion needing an ability *and* an identity value (Construct Catapult needs
// Combat Summoned and template 37) is reached by the cross product below.
function identityAxes() {
  const base = {
    version: null, templateId: null, heroTypeId: null, isHero: false,
    baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
  };
  const axes = [{ name: 'plain', over: {} }];
  for (const specialUnit of ['golem', 'chosen', 'zombies', 'catapult']) {
    axes.push({ name: `special:${specialUnit}`, over: { specialUnit } });
  }
  for (const templateId of [34, 37, 54, 81, 113, 174]) {
    axes.push({ name: `template:${templateId}`, over: { templateId } });
  }
  axes.push({ name: 'hero', over: { isHero: true } });
  axes.push({ name: 'heroType:48', over: { isHero: true, heroTypeId: 48 } });
  axes.push({ name: 'baseFantastic', over: { baseFantastic: true, baseRace: 'Chaos' } });
  // A conversion is discovered from its *trace*, and `collectStepChanges` (`Calculator/steps.js`)
  // records only fields a step actually moved — so a conversion writing the value the axis
  // already holds is invisible. The axis above states `Chaos`, and Fiery Fury's THEN arm
  // (`b:fieryFury:race`, gated on `BASEFANTASTIC(U)`) writes exactly `race = 'Chaos'` and
  // `fantastic = true`: on that axis it changed nothing and the whole conversion went undiscovered,
  // which the widened corpus caught through the incompleteness guard below. Repeat the axis on a
  // race no conversion writes — the conversions write Life, Death, Chaos, Nature and No Heal —
  // so every race write is observable while the permanent record is still Fantastic.
  axes.push({ name: 'baseFantastic:mundane',
    over: { baseFantastic: true, baseRace: 'High Men' } });
  return axes.map(axis => ({ name: axis.name, identity: { ...base, ...axis.over } }));
}

// One value per control, read from the definitions so a control added later is covered.
function controlValues(defs) {
  const out = [];
  for (const def of defs) {
    if (!def || !def.key) continue;
    const calcKey = def.calcKey || def.key;
    if (def.type === 'bool') out.push([calcKey, true]);
    else if (def.type === 'num' || def.type === 'numcheck') out.push([calcKey, 3]);
    else if (def.type === 'select' && Array.isArray(def.options)) {
      for (const option of def.options) if (option[0] !== 'none') out.push([calcKey, option[0]]);
    }
  }
  return out;
}

// Every conversion the pre-pass can make, with its chain rank and the fields it writes, derived
// by perturbation rather than declared. A conversion no perturbation reaches is invisible to the
// oracle, so the corpus pass below asserts that it observes no conversion this pass missed.
function discoverConversions() {
  const controls = [
    ...controlValues(read('ABILITY_DEFS')),
    ...controlValues(read('ENCHANTMENT_DEFS')),
    ['combatSummoned', true],
    ['outlanderWizard', true],
  ];
  const byVersion = new Map();
  for (const version of VERSIONS) {
    const chain = statChain(version);
    const rankOf = new Map(chain.map((entry, index) => [entry.key, index]));
    const conversions = new Map();
    const note = (event) => {
      const key = `${event.phase}:${event.id}`;
      const rank = rankOf.has(key) ? rankOf.get(key) : event.sourceOrder;
      const existing = conversions.get(key) || { key, rank, fields: new Set() };
      for (const field of Object.keys(event.changes)) existing.fields.add(field);
      conversions.set(key, existing);
    };
    for (const axis of identityAxes()) {
      const identity = { ...axis.identity, version };
      for (const [calcKey, value] of controls) {
        const abilities = { [calcKey]: value };
        if (calcKey !== 'outlanderWizard') abilities.outlanderWizard = true;
        const result = applyOrderedIdentityConversions(
          { ...identity, race: identity.baseRace, fantastic: identity.baseFantastic },
          abilities, version, { isHero: identity.isHero, name: '' });
        for (const event of result.trace) note(event);
      }
    }
    byVersion.set(version, { chain, rankOf, conversions });
  }
  return byVersion;
}

// A site owned by chain entry K is hoisted for field f exactly when some conversion of rank at
// or after rank(K) writes f: with that conversion alone active, the record at K still holds the
// value it had before the write while the fixed point holds the value after it.
function positionAnalysis(model, ownerKey, fields) {
  const rank = model.rankOf.get(ownerKey);
  if (rank === undefined) return null;
  const hoisted = [];
  const observable = [];
  for (const conversion of model.conversions.values()) {
    for (const field of fields) {
      if (!conversion.fields.has(field)) continue;
      if (!observable.includes(conversion.key)) observable.push(conversion.key);
      if (conversion.rank >= rank && !hoisted.includes(conversion.key)) hoisted.push(conversion.key);
    }
  }
  return { rank, hoisted, observable };
}

// A site's owner may be spelled per engine family; exactly one of the candidates is in a given
// chain. The exception is a read that *chooses* between two entries — Rebuild picks its own phase
// from the live token — where both are present and the earlier one is the position the choice is
// made at. That case must say so (`ownerPick: 'earliest'`) rather than be resolved silently.
function resolveOwner(model, site) {
  const candidates = Array.isArray(site.owner) ? site.owner : [site.owner];
  const present = candidates.filter(key => model.rankOf.has(key));
  if (present.length > 1) {
    if (site.ownerPick !== 'earliest') {
      throw new Error(`identity_read_position_census: ${present.join(' / ')} are both in the `
        + 'chain and the row does not say which position the read is made at.');
    }
    return present.reduce((a, b) => (model.rankOf.get(a) <= model.rankOf.get(b) ? a : b));
  }
  return present[0] || null;
}

// ---------------------------------------------------------------------------
// 6. Corpus measurement. The unrestricted pre-pass already returns an ordered trace carrying each
// conversion's chain rank and its `{from,to}`, so one call per case yields every prefix.
function measureCorpus(models) {
  const counts = new Map();   // siteKey -> version -> {divergent, candidate}
  const seenConversions = new Map();
  const bump = (siteKey, version, field) => {
    if (!counts.has(siteKey)) counts.set(siteKey, new Map());
    const perVersion = counts.get(siteKey);
    if (!perVersion.has(version)) perVersion.set(version, { divergent: 0, candidate: 0 });
    perVersion.get(version)[field] += 1;
  };

  const gated = SITES.filter(site => typeof site.owner === 'string'
    ? !['plumbing', 'post-chain', 'targeting', 'dead-arm'].includes(site.owner) : true);

  let currentInput = null;
  const triggerPresent = (site, abilities) => {
    if (!site.trigger) return true;
    if (typeof site.trigger === 'string') return !!abilities[site.trigger];
    const value = currentInput ? currentInput[site.trigger.input] : undefined;
    return !!value && value !== 'none';
  };
  const original = applyOrderedIdentityConversions;
  ctx.applyOrderedIdentityConversions = function wrapped(identity, abilities, version, meta, options) {
    const result = original(identity, abilities, version, meta, options);
    if (options && options.beforeKey) return result;
    const model = models.get(version);
    if (!model) return result;
    for (const event of result.trace) {
      const key = `${event.phase}:${event.id}`;
      if (!seenConversions.has(version)) seenConversions.set(version, new Set());
      seenConversions.get(version).add(key);
    }
    const permanent = { race: identity.baseRace, fantastic: identity.baseFantastic };
    const fixed = { race: result.identity.race, fantastic: result.identity.fantastic };
    for (const site of gated) {
      const ownerKey = resolveOwner(model, site);
      if (!ownerKey) continue;
      const rank = model.rankOf.get(ownerKey);
      const at = { ...permanent };
      for (const event of result.trace) {
        const eventRank = model.rankOf.has(`${event.phase}:${event.id}`)
          ? model.rankOf.get(`${event.phase}:${event.id}`) : event.sourceOrder;
        if (eventRank >= rank) break;
        for (const [field, change] of Object.entries(event.changes)) at[field] = change.to;
      }
      const fields = site.fields;
      const differsPositional = fields.some(field => at[field] !== fixed[field]);
      const differsPermanent = fields.some(field => permanent[field] !== fixed[field]);
      const differs = site.record === 'fixed-point' ? differsPositional : differsPositional;
      if (differs) {
        bump(site.key, version, 'divergent');
        if (triggerPresent(site, abilities)) bump(site.key, version, 'candidate');
      }
      if (differsPermanent) bump(`${site.key}::permanent`, version, 'divergent');
    }
    return result;
  };

  let cases = 0;
  for (const testCase of enumerateCases(ctx)) {
    cases += 1;
    currentInput = testCase.input;
    try { deriveUnitStats(testCase.input); } catch (err) { /* the digest tool records these too */ }
  }
  ctx.applyOrderedIdentityConversions = original;
  return { counts, cases, seenConversions };
}

// ---------------------------------------------------------------------------
// 7. Run.
function run() {
  const problems = [];

  // (a) Scan and reconcile against the table.
  const hits = scanSources();
  const declared = new Map(SITES.map(site => [site.key, site]));
  const seen = new Map();
  for (const hit of hits) {
    const key = siteKeyOf(hit);
    if (!seen.has(key)) seen.set(key, { key, hits: [], reads: new Set() });
    seen.get(key).hits.push(hit);
    for (const field of hit.reads) seen.get(key).reads.add(field);
  }
  for (const key of seen.keys()) {
    if (!declared.has(key)) {
      problems.push(`UNCLASSIFIED identity read: ${key}\n    `
        + seen.get(key).hits.map(h => `${h.file}:${h.line}  ${h.text.slice(0, 100)}`).join('\n    '));
    }
  }
  for (const key of declared.keys()) {
    if (!seen.has(key)) problems.push(`STALE row, no longer matched by any read: ${key}`);
  }
  if (problems.length) {
    console.error(problems.join('\n'));
    throw new Error(`identity_read_position_census: ${problems.length} site(s) the table does not `
      + 'match. Classify the read (or delete the row) rather than widening the scan.');
  }
  for (const site of SITES) site.fields = [...seen.get(site.key).reads];

  // (b) The divergence oracle.
  const models = discoverConversions();

  // (c) The corpus.
  const measured = measureCorpus(models);
  for (const [version, keys] of measured.seenConversions) {
    const known = models.get(version).conversions;
    for (const key of keys) {
      if (!known.has(key)) {
        throw new Error(`identity_read_position_census: the corpus reached conversion ${key} in `
          + `${version}, which the perturbation basis never fired — the basis is incomplete.`);
      }
    }
  }

  // (d) Ground truth.
  const groundTruth = GROUND_TRUTH.map((item) => {
    const perVersion = item.versions.map((version) => {
      const model = models.get(version);
      if (item.comparison === 'write') {
        return { version, ok: model.conversions.has(item.at), detail: 'conversion present' };
      }
      const analysis = positionAnalysis(model, item.at, item.fields);
      if (!analysis) return { version, ok: false, detail: `${item.at} is not in this chain` };
      const list = (item.comparison === 'positional' || item.comparison === 'hero')
        ? analysis.hoisted : analysis.observable;
      return { version, ok: list.length > 0, detail: list.join(', ') || 'none' };
    });
    return { ...item, perVersion, pass: perVersion.every(entry => entry.ok) };
  });

  // (e) Findings.
  const findings = [];
  for (const site of SITES) {
    if (typeof site.owner === 'string'
      && ['plumbing', 'post-chain', 'targeting', 'dead-arm'].includes(site.owner)) continue;
    const perVersion = [];
    for (const version of VERSIONS) {
      const model = models.get(version);
      const ownerKey = resolveOwner(model, site);
      if (!ownerKey) continue;
      const analysis = positionAnalysis(model, ownerKey, site.fields);
      const counts = (measured.counts.get(site.key) || new Map()).get(version)
        || { divergent: 0, candidate: 0 };
      const permanentCounts = (measured.counts.get(`${site.key}::permanent`) || new Map())
        .get(version) || { divergent: 0 };
      // For a replay that already names a chain entry, the entry it stops before must be
      // equivalent to the owner's position: no conversion may lie between the two, or the replay
      // is at the wrong place and reports an earlier record than the block sees.
      let between = null;
      if (site.record.startsWith('positional:')) {
        const named = site.record.slice('positional:'.length);
        const readKey = named === 'owner' ? ownerKey : named;
        const readRank = model.rankOf.get(readKey);
        if (readRank === undefined) {
          throw new Error(`identity_read_position_census: ${site.key} replays before ${readKey}, `
            + `which is not in the ${version} chain.`);
        }
        const lo = Math.min(readRank, analysis.rank);
        const hi = Math.max(readRank, analysis.rank);
        between = [...model.conversions.values()]
          .filter(conversion => conversion.rank >= lo && conversion.rank < hi
            && site.fields.some(field => conversion.fields.has(field)))
          .map(conversion => conversion.key);
      }
      perVersion.push({ version, ownerKey, rank: analysis.rank, hoisted: analysis.hoisted,
        observable: analysis.observable, counts, permanentCounts, between });
    }
    findings.push({ site, perVersion });
  }

  return { hits, findings, models, measured, groundTruth };
}

function verdictFor(site, perVersion) {
  if (site.record !== 'fixed-point') {
    return perVersion.some(entry => entry.between && entry.between.length)
      ? 'MISPLACED-REPLAY' : 'positional-ok';
  }
  if (!perVersion.some(entry => entry.hoisted.length)) return 'late-ok';
  return 'HOISTED';
}

function main() {
  const { findings, models, measured, groundTruth } = run();

  console.log('=== identity conversions discovered, per version ===');
  for (const [version, model] of models) {
    const list = [...model.conversions.values()].sort((a, b) => a.rank - b.rank);
    console.log(`${version}: ${list.length}`);
    for (const conversion of list) {
      console.log(`    #${String(conversion.rank).padStart(3)} ${conversion.key}  `
        + `writes ${[...conversion.fields].join('+')}`);
    }
  }

  console.log(`\n=== corpus: ${measured.cases} derivations ===`);

  console.log(`\n=== ground truth: the ${GROUND_TRUTH.length} F163 corrections already landed ===`);
  let failed = 0;
  for (const item of groundTruth) {
    if (!item.pass) failed += 1;
    console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.id}  ${item.at}  [${item.comparison}]  `
      + `${item.effect}`);
    for (const entry of item.perVersion) {
      console.log(`        ${entry.version}: ${entry.ok ? 'reproduced' : 'NOT REPRODUCED'} `
        + `— ${entry.detail}`);
    }
  }
  console.log(`${GROUND_TRUTH.length - failed} of ${GROUND_TRUTH.length} reproduced`);

  console.log('\n=== sites ===');
  const order = { 'MISPLACED-REPLAY': 0, HOISTED: 1, 'late-ok': 2, 'positional-ok': 3 };
  const rows = findings
    .map(entry => ({ ...entry, verdict: verdictFor(entry.site, entry.perVersion) }))
    .sort((a, b) => (order[a.verdict] - order[b.verdict])
      || a.site.key.localeCompare(b.site.key));
  const tally = { plumbing: 0, 'post-chain': 0, targeting: 0, 'dead-arm': 0 };
  for (const site of SITES) {
    if (typeof site.owner === 'string' && site.owner in tally) tally[site.owner] += 1;
  }
  for (const row of rows) tally[row.verdict] = (tally[row.verdict] || 0) + 1;
  console.log(`${SITES.length} sites: `
    + Object.entries(tally).map(([name, n]) => `${n} ${name}`).join(', '));
  for (const row of rows) {
    const site = row.site;
    console.log(`\n[${row.verdict}] ${site.effect || site.note || ''}`);
    console.log(`    site      ${site.key}`);
    console.log(`    owner     ${Array.isArray(site.owner) ? site.owner.join(' / ') : site.owner}`);
    console.log(`    reads     ${site.fields.join('+')}   record: ${site.record}`
      + `${site.settled ? `   settled ${site.settled}` : ''}`
      + `${site.filed ? `   filed ${site.filed}` : ''}`);
    for (const entry of row.perVersion) {
      const flag = entry.hoisted.length ? 'HOISTED' : 'after all conversions';
      console.log(`      ${entry.version.padEnd(22)} ${entry.ownerKey} #${entry.rank}  ${flag}`
        + `  cases ${entry.counts.divergent}/${entry.counts.candidate}`
        + `  (perm-differs ${entry.permanentCounts.divergent})`
        + (entry.hoisted.length ? `\n            after it: ${entry.hoisted.join(', ')}` : '')
        + (entry.between && entry.between.length
          ? '\n            MISPLACED, conversions between the replay and the block: '
            + entry.between.join(', ') : ''));
    }
  }

  console.log('\n=== what this measurement cannot see ===');
  for (const line of BLIND_SPOTS) console.log(`  - ${line}`);

  if (failed) {
    throw new Error(`identity_read_position_census: ${failed} of ${GROUND_TRUTH.length} landed `
      + 'corrections were not reproduced; the enumeration is incomplete.');
  }

  const jsonAt = process.argv.indexOf('--json');
  if (jsonAt >= 0 && process.argv[jsonAt + 1]) {
    fs.writeFileSync(process.argv[jsonAt + 1], JSON.stringify({
      sites: rows.map(row => ({ ...row.site, verdict: row.verdict, versions: row.perVersion })),
      groundTruth,
    }, (key, value) => (value instanceof Set ? [...value] : value), 2));
  }
}

if (process.argv.includes('--scan')) {
  const hits = scanSources();
  const grouped = new Map();
  for (const hit of hits) {
    const key = siteKeyOf(hit);
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(hit);
  }
  for (const [key, group] of grouped) {
    console.log(`${key}  [${group.map(h => h.line).join(', ')}]`);
  }
  console.log(`\n${hits.length} hits, ${grouped.size} sites`);
} else if (require.main === module) {
  main();
}

module.exports = { scanSources, stripComments, SITES, GROUND_TRUTH };
