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
function baseUnitInput(overrides = {}) {
  return {
    prefix: 'a',
    version: 'com2_1.05.11',
    abilities: {},
    level: 'normal',
    weapon: 'normal',
    armor: 'none',
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

// A primitive export would freeze at zero, so the total is read through a function.
function assertionTotal() {
  return assertionCount;
}

module.exports = {
  assert, assertClose, assertDistSumsToOne, assertEqual, assertionTotal, assertSameKeyList,
  baseUnitInput, evalInContext,
};
