// Which record each identity read takes, and where the tranche that settled that is asserted.
//
// This file is what `tools/identity_read_position_census.js` left behind. That census existed to
// measure one deviation: an identity **pre-pass** resolved live race and Fantastic to a fixed
// point before the stat sequence, so a gate reading the calculated identity was handed the end of
// the conversion list rather than the record standing at its own chain rank. Its whole model — a
// hoisting verdict computed from chain ranks against that fixed point — is a question about a
// structure the calculator no longer has (F163): the conversions are steps of the one sequence,
// `race` and `fantastic` are fields of the running record, and a gate inside a step reads the
// record at its own position by construction.
//
// Two of its jobs outlive it, and both are here rather than in a diagnostic outside the suites.
//
// (1) **The identity reads taken outside a step must each be declared.** F246 retired the last
//     read that crossed the sequence boundary — the projection `targetingIdentity` computed
//     ahead of the run — so what these rows now hold is the weaker but still load-bearing
//     property that each named value is read *below* the run and nowhere else. An occurrence
//     inside a step's symbol, which is where the projection's readers used to sit, halts
//     (`SPEC.md`, *Out-of-range values stop the run*). That is what stops the shape F163 and
//     F246 removed from re-entering the code unnoticed.
//
// (2) **The landed record-choice corrections keep a named regression.** The census reproduced
//     sixteen through its own oracle and threw if it ever stopped; that check cannot survive the
//     structure it measured. What replaces it is the binding each correction already has: a
//     preset whose expected damage came from the source reading, not from running the code
//     (`Calculator/CLAUDE.md`, *What an assertion has to be bound to*). This asserts that every
//     correction still names one, that the preset exists, and that it is reachable from
//     `TEST_TREE` — so `npm test` evaluates every one of them each run and a deletion is loud.

'use strict';

const fs = require('fs');
const path = require('path');
const { repoRoot } = require('../calculator_sources');
const { assert, assertSameKeyList } = require('./assertions');

// --- (1) The reads taken outside a step -------------------------------------------------------
//
// `token` is the identifier; `sites` is every `file#symbol` allowed to name it. A symbol is the
// enclosing top-level function or `const` the occurrence sits in. The declaration itself counts
// as a site, so the value's own definition is listed with its readers.
const CROSS_BOUNDARY_READS = [
  {
    token: 'finishedIdentity',
    why: 'The identity the run left, read off `statUnit` below the run. Every consumer is a '
      + 'combat-time classification, which is the class `SPEC.md`, *The step model* gives the '
      + 'finished record. The cast-time *targeting* predicates that used to share it are gone: '
      + "Rust's Fantastic exclusion reads the permanent record at `rustActiveAt`, and Metal "
      + "Fires' block term reads the calculated record at its own rank (F246).",
    sites: [
      'Calculator/stats.js#finishedIdentity',        // the declaration, below the run
      'Calculator/stats.js#identityAtRank',          // the fallback when no step reaches the rank
      'Calculator/stats.js#curseGatedAbilities',     // liveRace/liveFantastic for combat
    ],
  },
  {
    token: 'finishedUnitType',
    why: 'The compact projection of the same record, for the post-run readers that take the '
      + 'token: the returned `unitType`, the ability map combat resolution reads, and Supreme '
      + "Light's published eligibility. Shatter's target class left the list with F246: "
      + '`c:shatter` outranks every identity conversion in the four chains that evaluate the '
      + 'term, so the step reads its own record.',
    sites: [
      'Calculator/stats.js#finishedUnitType',
      'Calculator/stats.js#curseGatedAbilities',
      'Calculator/stats.js#result',
    ],
  },
  {
    token: 'identityAtRank',
    why: 'One engine fact the derivation publishes as a **result field** rather than as a record '
      + 'field, so it cannot be read inside its own step: the standing modern EncMagic rule at '
      + "$005A1217 (F188). The record is sampled at the block's own chain rank instead. Warp "
      + "Reality's Immolation To Hit arm was the second such read; F190 deleted it — the modern "
      + 'damage-spell roll takes `SpellTable[sp].hitchance`, never `U.hitchance` — and the '
      + '`c:warpReality` sample went with it.',
    sites: [
      'Calculator/stats.js#identityAtRank',
      'Calculator/stats.js#modernEncMagicIndependentOfMaterial',
    ],
  },
];

// The `data-scope="core"` sources the scan covers. `stats_identity.js` is excluded for the token
// scan's purposes only where it *defines* the projection; its own occurrences are listed above.
const SCANNED = ['Calculator/stats.js', 'Calculator/stats_sequence.js',
  'Calculator/combat_abilities.js', 'Calculator/stats_identity.js'];

// The enclosing symbol of a line: the nearest preceding `function name(`, `const name =`, or
// `statStep({ id: '...'` at a shallower indent. Deliberately simple — a hit whose symbol this
// cannot name shows up as an unclaimed site rather than being silently attributed.
function symbolFor(lines, index) {
  let best = null;
  for (let i = index; i >= 0; i--) {
    const line = lines[i];
    let match = /^\s*(?:statStep\(\{|abilityStep\()\s*(?:\{\s*)?id: '([^']+)'/.exec(line);
    if (match) { best = `step:${match[1]}`; break; }
    match = /^\s{0,4}(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/.exec(line);
    if (match) { best = match[1]; break; }
    match = /^function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(line);
    if (match) { best = match[1]; break; }
  }
  return best || '<file>';
}

function runCrossBoundaryIdentityReadChecks() {
  const declared = new Map();
  for (const entry of CROSS_BOUNDARY_READS) {
    declared.set(entry.token, new Set(entry.sites));
  }
  const seen = new Map(CROSS_BOUNDARY_READS.map(entry => [entry.token, new Set()]));
  for (const file of SCANNED) {
    const text = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      const code = line.replace(/^\s*\/\/.*$/, '');
      for (const entry of CROSS_BOUNDARY_READS) {
        if (!new RegExp(`\\b${entry.token}\\b`).test(code)) continue;
        seen.get(entry.token).add(`${file}#${symbolFor(lines, index)}`);
      }
    });
  }
  for (const entry of CROSS_BOUNDARY_READS) {
    const observed = [...seen.get(entry.token)].sort();
    const allowed = [...declared.get(entry.token)].sort();
    assertSameKeyList(observed, allowed,
      `Every read of \`${entry.token}\` is a declared post-run identity read. Each names the record `
      + 'the stat run left, which only a consumer below the run can legitimately ask for; an '
      + 'occurrence inside a step symbol is the ahead-of-run projection F163 and F246 removed, so '
      + 'each occurrence needs a row in `tools/unit_checks/identity_record_choice.js` saying why');
  }
}

// --- (2) The landed corrections, and where each is asserted -----------------------------------
//
// `at` is the chain entry or gate the correction settled; `record` is which record it turned out
// to want — `positional` (the calculated record where the block stands), `permanent` (the base
// record, which is what a **cast-time targeting** gate takes: `SPEC.md`, *Architecture*),
// `finished` (the record the recalculation leaves, which is what a **post-run** consumer takes —
// combat resolution and the published result fields), or `hero` (the block asks a hero question,
// which is not an identity read at all). `preset` is the regression that holds it.
//
// F246 emptied the case that used to make `finished` interesting: a targeting class read ahead of
// the sequence. Shatter is the one row that still says `finished`, and it says it without a
// projection — `c:shatter` outranks every identity conversion in the four chains that evaluate its
// term, so the record standing at the step already is the finished one.
const LANDED_CORRECTIONS = [
  { id: 'F167', at: 'training:altarOfTheMoon and the four other Warlord building gates',
    record: 'permanent', preset: 'altarOfTheMoonNonGnollWarlord' },
  { id: 'F169', at: 'training:survivalInstinctToBlock', record: 'permanent',
    preset: 'survivalInstinctToBlockFantasticUnaffectedWarlord' },
  { id: 'F170', at: 'b:nausea', record: 'positional',
    preset: 'nauseaReadsIdentityAtItsOwnBlockWarlord' },
  { id: 'F171', at: 'b:wallOfFire:garrison', record: 'permanent',
    preset: 'wallOfFireWarlordBoostAfterCombatConversion' },
  { id: 'F172', at: 'b:bombsGrenades', record: 'permanent',
    preset: 'bombsGrenadesAfterCombatConversionWarlord' },
  { id: 'F173', at: 'c:landLinking', record: 'positional',
    preset: 'landLinkingBeforeMysticSurgeRealmCoM' },
  { id: 'F174', at: 'c:blazingEyes', record: 'positional',
    preset: 'blazingEyesLandsAfterFocusMagicCoM2' },
  { id: 'F176', at: 'b:spiritLink', record: 'positional',
    preset: 'natureLinkSpiritLinkAssertsFantasticWarlord' },
  { id: 'F177', at: 'c:survivalInstinct', record: 'positional',
    preset: 'survivalInstinctSpiritLinkAssertsFantasticWarlord' },
  { id: 'F178', at: 'c:chaosSurge', record: 'positional',
    preset: 'chaosSurgeChaosChannelsArmorMoM' },
  { id: 'F179', at: 'c:breakthrough:normal', record: 'permanent',
    preset: 'breakthroughLiveFantasticStillNormalCoM2' },
  // F183 filed this as a `finished` read and F246 moved it, on the user's ruling that spell
  // targeting reads the permanent record. The preset is unmoved: F245 established that Spirit
  // Link's cast clears the permanent Fantastic flag too, so the Spirit-Linked Fantastic target
  // F183 was filed for is a legal Rust target on either record.
  { id: 'F183+F246', at: "Rust's target class", record: 'permanent',
    preset: 'rustAppliesToSpiritLinkedFantasticWarlord' },
  // F184's second row, "Warp Reality's Immolation To Hit arm", stood here. F190 deleted the arm,
  // so there is no longer a second read to fix a record for.
  { id: 'F184', at: 'c:warpReality', record: 'positional',
    preset: 'warpRealityChaosExemptAtBlockWarlord' },
  { id: 'F185', at: 'b:trueLight / c:trueLight', record: 'positional',
    preset: 'trueLightReadsRealmAtItsOwnBlockWarlord' },
  { id: 'F186', at: 'b:eternalNight:poorVision', record: 'positional',
    preset: 'eternalNightPoorVisionReadsRealmAtItsOwnBlockWarlord' },
  // The same gate's other record. Its realm term is `GetStat(U,SRace,0)`, the current record; its
  // template term is `GetStat(U,STypeID,1)`, the base one. `specialUnit` carries the template
  // answer and no conversion writes it, so the read is permanent by construction.
  { id: 'F189', at: "b:eternalNight:poorVision's template-356 exemption", record: 'permanent',
    preset: 'eternalNightNightGoblinsExemptWarlord' },
  { id: 'F187', at: 'c:tactician', record: 'hero',
    preset: 'tacticianHeroCcDefenseWarpAttackWarlord' },
  { id: 'F187', at: 'buffs:rebuild', record: 'hero',
    preset: 'rebuildHeroCcDefenseLionheartWarlord' },
  // `c:shatter` outranks every identity conversion in the four chains that evaluate the term, so
  // the step reads the finished record by reading its own (F246).
  { id: 'F188', at: "Shatter's target class", record: 'finished',
    preset: 'magicImmunityGatesShatter' },
  { id: 'F192', at: 'c:badMoon', record: 'permanent',
    preset: 'badMoonSkipsDestinyPermanentFantasticCoM2' },
  { id: 'F192', at: 'c:goodMoon', record: 'permanent',
    preset: 'goodMoonSkipsDestinyPermanentFantasticCoM2' },
  { id: 'F192', at: 'c:natureConjunction', record: 'permanent',
    preset: 'natureConjunctionSeesDestinyPermanentFantasticCoM2' },
  { id: 'F192', at: 'b:bombsGrenades', record: 'permanent',
    preset: 'bombsGrenadesSkipsApotheosisPermanentFantasticWarlord' },
  { id: 'F192', at: 'b:wallOfFire:garrison', record: 'permanent',
    preset: 'wallOfFireGarrisonSkipsApotheosisPermanentFantasticWarlord' },
  { id: 'F192', at: 'b:fieryFury:race and its First Strike half', record: 'permanent',
    preset: 'fieryFuryApotheosisTakesBaseFantasticArmWarlord' },
  { id: 'F198', at: "the `NOTSAPIENS` gate over Ballistics Training, Xenopsychology and Radio",
    record: 'permanent', preset: 'radioSkipsApotheosisPermanentFantasticWarlord' },
  { id: 'F198', at: 'b:battleArmor', record: 'permanent',
    preset: 'battleArmorSkipsApotheosisPermanentFantasticWarlord' },
  { id: 'F198', at: 'the Outlander-soldier gate at UnitCalc.CAS!COMBATOVERRIDE!+5..+7 "IF (GETENCHANTMENTFLAG(U,EncArmorClad,0)=0)" "NOTOUTLANDERSOLDIER"', record: 'permanent',
    preset: 'energyWeaponrySkipsApotheosisPermanentFantasticWarlord' },
  // F198 filed this as a `permanent` read and F245 moved it, on the user's ruling: the step is
  // `training`, which ranks ahead of every permanent-record write the pipeline makes, so the
  // projection it used to read was a later phase's. It is the reform's one `training` gate with a
  // Fantastic term; the four rows above it stay `permanent` because every step they gate is
  // region `b` or later.
  { id: 'F198+F245', at: "Military Drilling's permanent Discipline grant", record: 'positional',
    preset: 'militaryDrillingReadsFantasticAtItsOwnRankWarlord' },
  { id: 'F198', at: 'b:outlanderXenoveterinary', record: 'positional',
    preset: 'xenoveterinaryReadsFantasticAtItsOwnBlockWarlord' },
  { id: 'F200', at: "d:fortification's already-shielded test, against b:magitekEngine",
    record: 'positional', preset: 'fortificationSeesMagitekLargeShieldWarlord' },
  { id: 'F200', at: "d:fortification's already-shielded test, against d:rust's clear",
    record: 'positional', preset: 'fortificationRestoresRustedLargeShieldWarlord' },
];

// The three record choices are the whole vocabulary a gate has, so a row naming a fourth would be
// describing something the model cannot express.
const RECORD_CHOICES = new Set(['positional', 'permanent', 'finished', 'hero']);

function runLandedCorrectionChecks(presetKeys, treeKeys) {
  for (const entry of LANDED_CORRECTIONS) {
    assert(RECORD_CHOICES.has(entry.record),
      `${entry.id} (${entry.at}) names a record choice the model has: `
      + `${[...RECORD_CHOICES].join(', ')}`);
    assert(presetKeys.has(entry.preset),
      `${entry.id} (${entry.at}) names a preset that still exists: ${entry.preset}. `
      + 'The identity-record corrections of the F163 tranche and of F192 are asserted only by these '
      + 'presets, so one going missing takes the correction\'s regression with it');
    assert(treeKeys.has(entry.preset),
      `${entry.id}'s preset ${entry.preset} is reachable from TEST_TREE, so npm test runs it`);
  }
}

module.exports = {
  runCrossBoundaryIdentityReadChecks,
  runLandedCorrectionChecks,
  LANDED_CORRECTIONS,
};
