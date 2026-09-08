// F43 - CoM's common `0x0800` flag maps to the literal Exorcise consumer.
//
// Tag: regression.  Anchor: F43.  TESTS.md keeps this suite's own section; the command there names
// this family, not the Playwright file it came from.
//
// Migrated from `tests/exorcise-f43.spec.js` by F268.2 and reduced by F268.4 under that item's
// deletion default.  The one page-layer claim - that the matrix's *property list* offers Spell
// Lock in exactly the versions the gate admits - stayed in Playwright as
// `tests/matrix.spec.js`, and F268.4 kept it: removing the matrix's version gate
// outright (`abilityVersionGated`, `ui_matrix_properties.js`) is caught by that spec and
// by nothing else in the 36-spec suite.
//
// **What F268.4 retired here, each shown covered elsewhere by mutation:**
//
//   * The target-class table (`fantastic_*` fires, `normal` does not, Undead is banished) and the
//     Undead extra penalty.  Admitting a non-Fantastic target fails the preset corpus; changing
//     the Undead penalty fails `bloodLustVulnerableToExorciseCoM2` and
//     `exorciseUndeadExtraPenaltyWarlord`.
//   * The two enemy-held blockers, and the F244.3f `lockedExorcise` number.  Ignoring Spell Lock
//     halts `ability_origins.js`' `runStrayedMarionetteChecks`, which asserts the same refusal
//     over every version.  **That is a duplication this row surfaced rather than fixed** - see the
//     F268.4 report.
//   * The version-gating table for `dispelEvil` / `exorcise` / `spellLock`, and the four
//     undisturbed version mechanics.  Offering Exorcise in MoM is caught in Node outside this
//     family, and `version_gate_divergence.js` already asserts card-versus-matrix gating over
//     every def in every version.
//   * The two tooltip assertions and the Dispel Evil naming scan, dropped with every other
//     tooltip-content assertion in this pass - see the report's coverage-given-up paragraph.
//
// **What stayed, because nothing else reaches it.**  Making CoM 1 read the stored value instead of
// its literal -3 left all 1,161 preset fixtures green on all four moments and all ten
// damage-category moments, and the other 29,664 Node assertions with them; so did giving the Angel
// a valued `Exorcise=3` roster entry.  The CoM 1 literal consumer is this family's whole remaining
// subject, and every assertion below runs through it.
//
// The helpers are the matcher-faithful ones (`assertions.js`, F268 section).  One trap in
// particular: `expect(report.angelAbilities).toContain('Exorcise')` has an **array** receiver, so
// it is `assertArrayContains` (membership) and not `assertStringContains` (substring) - the two
// differ on an abilities list holding `'Exorcise=3'`.

'use strict';

const {
  assertArrayContains, assertCloseToPrecision, assertIs, assertNoConsoleErrors,
  assertStrictArrayEqual, assertStringContains, evalInContext,
} = require('./assertions');

// The spec's own probe builder, carried over verbatim.
function makeUnit(ctx, version, prefix, overrides = {}) {
  return ctx.deriveUnitStats({
    prefix,
    version,
    abilities: {},
    level: 'normal',
    weapon: 'normal',
    armor: 'normal',
    rtbType: 'none',
    unitType: 'normal',
    figs: 1,
    atk: 0,
    rtb: 0,
    def: 0,
    res: 0,
    hp: 10,
    dmg: 0,
    ...(version.startsWith('com2') ? { hitChance: 70 } : { toHitMod: 70, toHitRtbMod: 70 }),
    toBlkMod: 70,
    cityWalls: 'none',
    nodeAura: 'none',
    trueLight: false,
    darkness: false,
    enemyEternalNight: false,
    rangedCheck: false,
    rangedDist: 1,
    warpReality: false,
    chaosChannels: 'none',
    ...overrides,
  });
}

// The CoM 1 consumer reads the literal modifier and reaches every attack channel.
function runLiteralConsumerChecks(ctx) {
  const version = 'com_6.08';
  const fail = (unitType, abilities = {}, value = 47) =>
    ctx.exorciseFailProb(5, abilities, unitType, value, version);
  const target = extraAbilities => makeUnit(ctx, version, 'b', {
    unitType: 'fantastic_nature',
    baseFantastic: true,
    def: 1,
    res: 5,
    hp: 10,
    toBlkMod: 70,
    abilities: { deathImmunity: true, ...extraAbilities },
  });
  const resolve = (attacker, defender, isRanged = false) => ctx.resolveCombat(attacker, defender, {
    version, isRanged, wallOfFire: false, distance: 1,
  });
  const exorcise = { exorcise: 47 };
  const melee = resolve(makeUnit(ctx, version, 'a', { atk: 1, abilities: exorcise }), target());
  const ranged = resolve(makeUnit(ctx, version, 'a', {
    rtb: 1, rtbType: 'missile', abilities: exorcise,
  }), target(), true);
  const gaze = resolve(makeUnit(ctx, version, 'a', {
    rtb: 1, rtbType: 'gaze_death', abilities: exorcise,
  }), target());
  const twoFigure = resolve(makeUnit(ctx, version, 'a', {
    figs: 2, atk: 1, abilities: exorcise,
  }), makeUnit(ctx, version, 'b', {
    figs: 2,
    unitType: 'fantastic_nature',
    baseFantastic: true,
    def: 1,
    res: 5,
    hp: 10,
    toBlkMod: 70,
    abilities: { deathImmunity: true },
  }));

  const versionData = evalInContext(ctx, 'VERSION_DATA');
  const angel = Object.values(versionData[version] || {}).find(unit => unit.name === 'Angel');
  const parsedAngelAbilities = ctx.parseAbilitiesFromUnit(angel);
  const angelStrike = resolve(makeUnit(ctx, version, 'a', {
    atk: 1, abilities: { exorcise: parsedAngelAbilities.exorcise },
  }), target());
  const abilityDefs = evalInContext(ctx, 'ABILITY_DEFS');
  const tooltip = abilityDefs.find(def => def.key === 'exorcise').tooltip;

  // [F43-1] The stored value is the literal modifier, not a magnitude: -50 and 47 are the same
  // roll because the consumer reads the flag, not the number.
  assertStrictArrayEqual([fail('fantastic_nature', {}, -50), fail('fantastic_nature', {}, 47)],
    [0.8, 0.8], 'The stored Exorcise value does not change the roll');
  // [F43-4] melee
  assertCloseToPrecision(melee.totalDmgToB[10], 0.8, 12,
    'A melee Exorcise banishes the target with probability 0.8');
  // [F43-5] ranged
  assertCloseToPrecision(ranged.totalDmgToB[10], 0.8, 12,
    'A ranged Exorcise banishes the target with probability 0.8');
  // [F43-6] CoM's patched zero-strength abort means the common flag fires once with the Gaze and
  // again with the subsequent zero-strength melee call: 1 - (1 - 0.8)^2 = 0.96.
  assertCloseToPrecision(gaze.totalDmgToB[10], 0.96, 12,
    'A gaze attacker rolls Exorcise twice');
  // [F43-7] and the phase says so
  assertStringContains(gaze.phases.find(phase => phase.label.includes('Gaze'))?.label, 'Exorcise',
    'The gaze phase names Exorcise');
  // [F43-8] each figure rolls independently
  assertCloseToPrecision(twoFigure.totalDmgToB[20], 0.64, 12,
    'Two attacking figures each roll Exorcise');
  // [F43-9] The roster states the flag by name with no value, which is what makes the literal
  // reading observable at all.
  assertArrayContains(angel && angel.abilities, 'Exorcise',
    'The Angel carries the bare Exorcise flag');
  // [F43-10] and no valued form of it
  assertIs((angel && angel.abilities).some(ability => ability.startsWith('Exorcise=')), false,
    'The Angel carries no valued Exorcise entry');
  // [F43-11] so the parsed modifier is 0
  assertIs(parsedAngelAbilities.exorcise, 0, 'The parsed Angel Exorcise modifier is 0');
  // [F43-12] and a modifier of 0 rolls exactly as 47 did
  assertCloseToPrecision(angelStrike.totalDmgToB[10], 0.8, 12,
    'The Angel\'s Exorcise rolls the same as a valued one');
}

// The retired test's `assertNoConsoleErrors` tail, which also caught errors the spec's own
// probes raised.
function runExorciseF43Checks(ctx) {
  // [F43-13] the retired test's error tail
  assertNoConsoleErrors(ctx, 'F43 literal Exorcise consumer', () => runLiteralConsumerChecks(ctx));
}

module.exports = { runExorciseF43Checks };
