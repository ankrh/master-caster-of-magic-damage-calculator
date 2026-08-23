// Shared assertion helpers for the node_unit_checks suites. The assertion counter lives here
// so every suite contributes to the one total the entry point prints.

'use strict';

const vm = require('vm');

let assertionCount = 0;

// `const`/`let` at the top level of a script are global *lexical* bindings, not properties
// of the context object — later scripts see them, but `ctx.NAME` does not. Reach those
// (HALT, STEP_PHASES, …) through the context's own evaluator.
function evalInContext(context, expression) {
  return vm.runInContext(expression, context);
}

function assert(condition, message) {
  assertionCount += 1;
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  assertionCount += 1;
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertClose(actual, expected, message, epsilon = 1e-12) {
  assertionCount += 1;
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertDistSumsToOne(dist, message) {
  assert(Array.isArray(dist), `${message}: result is not an array`);
  const sum = dist.reduce((acc, p) => acc + p, 0);
  assertClose(sum, 1, `${message}: probability sum`);
}

// The default probe unit. `version` must be one of the five real calculator versions: every
// engine-version predicate is exact somewhere (Calculator/steps.js ENGINE_VERSIONS, and the
// `version === 'com2_1.05.11'` tests in combat_fear_and_touch.js / combat_phases.js), so a
// synthetic string silently probes a build that does not exist.
// A CoM2/Warlord record states its attacks on the four named `modernAttacks` channels, and a
// record that states no attack is four empty channels, never a missing record (`SPEC.md`,
// *Attack channels on the card*). The default probe unit states no attack, so a modern probe gets
// the empty record beside the empty shared slot. A probe that does state one through the DOS
// shared slot has to say which channel it means: the projection is not derivable here — the same
// slot carries conventional ranged, Thrown, both Breath strengths and the gazes, and on a modern
// record the gazes are not channels at all — so an unstated one halts rather than being guessed
// (`SPEC.md`, *Out-of-range values stop the run*).
function baseUnitInput(overrides = {}) {
  const version = overrides.version || 'com2_1.05.11';
  const statesSharedAttack = (Number(overrides.rtb) || 0) > 0
    || (overrides.rtbType && overrides.rtbType !== 'none');
  if (version.startsWith('com2') && !('modernAttacks' in overrides)) {
    if (statesSharedAttack) {
      throw new Error(`baseUnitInput: ${version} probe states the shared slot as `
        + `${JSON.stringify(overrides.rtbType || 'none')} at strength ${overrides.rtb || 0} but `
        + 'names no modernAttacks channel. State the record\'s ranged, thrown, fireBreath or '
        + 'lightningBreath channel, or `modernAttacks: {}` where the slot carries a gaze.');
    }
    overrides = { ...overrides, modernAttacks: {} };
  }
  return {
    prefix: 'a',
    version: 'com2_1.05.11',
    abilities: {},
    level: 'normal',
    weapon: 'normal',
    armor: 'normal',
    rtbType: 'none',
    unitType: 'normal',
    figs: 1,
    atk: 1,
    rtb: 0,
    def: 1,
    res: 1,
    hp: 1,
    dmg: 0,
    toHitMod: 0,
    toHitRtbMod: 0,
    hitChance: 0,
    hitMelee: 0,
    hitRanged: 0,
    hitThrown: 0,
    hitBreath: 0,
    toBlkMod: 0,
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
  };
}

// Set-wise list comparison that reports what moved rather than dumping both lists. Shared by
// the canonical version-scope checks and the source-manifest checks.
function assertSameKeyList(actual, expected, message) {
  const actualText = actual.join(', ');
  const expectedText = expected.join(', ');
  assertionCount += 1;
  if (actualText !== expectedText) {
    const added = actual.filter(key => !expected.includes(key));
    const removed = expected.filter(key => !actual.includes(key));
    throw new Error(`${message}:${added.length ? ` unexpected [${added.join(', ')}]` : ''}`
      + `${removed.length ? ` no longer present [${removed.join(', ')}]` : ''}`);
  }
}

// The one home for "this probe's shared-slot attack, stated as the record a CoM2/Warlord unit
// really has". A sweep whose axis is (shape x version) cannot state the modern record literally
// at each site, so the projection is written once here rather than per suite: the slot's token
// names the record field — `RANGED_TYPES` the Ranged channel, `thrown`/`fire`/`lightning` the
// Thrown and the two Breath ones — while a gaze token names no channel at all, because a modern
// unit's gazes are stated through `abilities`. The Ranged channel exists at zero strength (its
// projectile type is what states it) and the other three do not (`SPEC.md`, *Attack channels on
// the card*). Probes that name one attack outright state `modernAttacks` at the call site
// instead; this is only for the version-parameterised sweeps.
const rangedTokenCache = new Map();
function modernRecordForSharedSlot(ctx, rtbType, rtb) {
  if (!rangedTokenCache.has(ctx)) {
    rangedTokenCache.set(ctx, new Set(evalInContext(ctx, 'RANGED_TYPES')));
  }
  const strength = Number(rtb) || 0;
  const type = rtbType || 'none';
  if (rangedTokenCache.get(ctx).has(type)) return { ranged: { strength, type } };
  if (strength <= 0) return {};
  if (type === 'thrown') return { thrown: { strength, type } };
  if (type === 'fire') return { fireBreath: { strength, type } };
  if (type === 'lightning') return { lightningBreath: { strength, type } };
  return {};
}

// A primitive export would freeze at zero, so the total is read through a function.
function assertionTotal() {
  return assertionCount;
}

module.exports = {
  assert, assertClose, assertDistSumsToOne, assertEqual, assertionTotal, assertSameKeyList,
  baseUnitInput, evalInContext, modernRecordForSharedSlot,
};
