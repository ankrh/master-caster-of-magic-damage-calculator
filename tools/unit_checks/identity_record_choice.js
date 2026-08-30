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
// (1) **The reads that are still taken outside a step must each be declared.** Four named values
//     carry a calculated fact across the sequence boundary — three the calculated identity, one
//     the finished immunity set — and every one of them is a deliberate exception with a
//     citation. An occurrence of one that no row below claims halts,
//     which is the property the census's channel scan gave and the reason a new unpositioned read
//     cannot enter the code unnoticed (`SPEC.md`, *Out-of-range values stop the run*).
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
    why: 'The record the recalculation leaves. Combat resolution is handed the finished unit '
      + '(post-chain), and the two cast-time *targeting* predicates are evaluated against it '
      + 'because the engine manipulates the recalculated flag in order to change targetability '
      + '(F183 Rust, F188 Shatter).',
    sites: [
      'Calculator/stats.js#finishedIdentity',        // the declaration
      'Calculator/stats.js#finishedUnitType',        // its compact projection
      'Calculator/stats.js#rustActive',              // targeting: "Target: enemy regular unit"
      'Calculator/stats.js#metalFiresActive',        // the weapon-upgrade half, read post-chain
      'Calculator/stats.js#effectiveAbilities',      // liveRace/liveFantastic for combat
      'Calculator/stats.js#identityAtRank',          // the fallback when no step reaches the rank
      // The sequence's own agreement check, which is what makes the projection's exactness a
      // measured claim rather than a stated one. It sits directly under `const statUnit`, which
      // is the record it checks the projection against.
      'Calculator/stats.js#statUnit',
    ],
  },
  {
    token: 'finishedUnitType',
    why: 'The compact projection of the same record, for the post-chain readers that still take '
      + 'the token: the returned `unitType`, the ability map combat resolution reads, Supreme '
      + "Light's published eligibility, and Shatter's target class.",
    sites: [
      'Calculator/stats.js#finishedUnitType',
      'Calculator/stats.js#effectiveAbilities',
      'Calculator/stats.js#result',
      'Calculator/stats.js#rawStatSteps',
      'Calculator/stats_sequence.js#magicCalcBinaryStatSteps',
      'Calculator/stats_sequence.js#step:shatter',
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
  {
    token: 'finishedImmunities',
    why: 'The immunity set the recalculation leaves. `base:immunityCurseGating` is an artificial '
      + 'step — no engine removes a curse flag it already carries (`SPEC.md`, *Deliberate '
      + 'deviations*) — so no source fixes its position relative to a grant that writes one of '
      + 'these four immunities, and taking the finished set is what makes its answer independent '
      + 'of where such a grant lands (F164, F199). The curse flags it clears are ordinary record '
      + 'fields read at its own position; only the immunity half crosses the boundary.',
    sites: [
      'Calculator/stats.js#finishedImmunities',   // the declaration
      'Calculator/stats.js#rawStatSteps',         // handed to the sequence builder
      'Calculator/stats_sequence.js#baseStatSteps',
      'Calculator/stats_identity.js#immunityCurseGatingStep',
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
      `Every read of \`${entry.token}\` is a declared cross-boundary read. It is the calculated `
      + 'identity taken outside the step that would read it at its own position, which is the '
      + 'shape F163 removed everywhere else, so each occurrence needs a row in '
      + '`tools/unit_checks/identity_record_choice.js` saying why');
  }
}

// --- (2) The landed corrections, and where each is asserted -----------------------------------
//
// `at` is the chain entry or gate the correction settled; `record` is which record it turned out
// to want — `positional` (the calculated record where the block stands), `permanent` (the base
// record), `finished` (the record the recalculation leaves, for a cast-time targeting class), or
// `hero` (the block asks a hero question, which is not an identity read at all). `preset` is the
// regression that holds it.
const LANDED_CORRECTIONS = [
  { id: 'F167', at: 'base:altarOfTheMoon and the four other Warlord building gates',
    record: 'permanent', preset: 'altarOfTheMoonNonGnollWarlord' },
  { id: 'F169', at: 'base:survivalInstinctToBlock', record: 'permanent',
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
  { id: 'F183', at: "Rust's target class", record: 'finished',
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
  { id: 'F187', at: 'base:rebuild', record: 'hero',
    preset: 'rebuildHeroCcDefenseLionheartWarlord' },
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
  { id: 'F198', at: 'the Outlander-soldier gate at UnitCalc.CAS:1405-1407', record: 'permanent',
    preset: 'energyWeaponrySkipsApotheosisPermanentFantasticWarlord' },
  { id: 'F198', at: "Military Drilling's permanent Discipline grant", record: 'permanent',
    preset: 'militaryDrillingSkipsApotheosisPermanentFantasticWarlord' },
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
