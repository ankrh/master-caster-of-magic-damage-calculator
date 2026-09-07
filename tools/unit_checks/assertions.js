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

// --- Helpers for suites migrated out of Playwright (F268) ---
//
// A migrated check must make the *same* claim at the *same strength* as the `expect` it replaces,
// and the nearest-looking helper here is not always that. The three below exist because the
// F268.1 review produced a working counter-example against each of the obvious substitutions:
//
//  - `assertClose(x, 2, msg, 1e-12)` for `expect(x).toBeCloseTo(2, 12)` accepts `|d| <= 1e-12`
//    where the matcher requires `|d| < 5e-13`, and `Math.abs(NaN - e) > eps` is false, so it
//    accepts `NaN` outright. A distribution of `[1 - 7.5e-13, 7.5e-13]` and one of `[NaN]` both
//    failed the retired spec and passed the first migration.
//  - `assertSameKeyList(labels, expected)` for `expect(labels).toEqual(expected)` compares
//    `join(', ')`, which erases element type: replacing a label string with a singleton array
//    holding that string passed the first migration and failed the retired spec.
//  - `String(label).includes(...)` for `expect(label).toContain(...)` coerces the receiver, so
//    `['Wrong Melee']` passed.
//
// Use these in a migrated family wherever the retired spec used the matcher they name.

// `expect(actual).toBeCloseTo(expected, precision)`: the matcher's own predicate is
// `|expected - actual| < 10**-precision / 2`, strictly, and a non-finite actual never satisfies
// it. Counts as one assertion, like the matcher it stands for.
function assertCloseToPrecision(actual, expected, precision, message) {
  const tolerance = Math.pow(10, -precision) / 2;
  const ok = typeof actual === 'number' && Number.isFinite(actual)
    && Math.abs(expected - actual) < tolerance;
  assert(ok, `${message}: expected ${expected} to within ${tolerance} `
    + `(toBeCloseTo precision ${precision}), got ${actual}`);
}

// `expect(actual).toBeGreaterThan(expected)`: the matcher requires its receiver to be a number or
// a bigint and throws otherwise, where JavaScript's bare `>` happily compares a numeric string.
// F268.4's review built the counter-example: a `resolveCombat` wrapper that stringified
// `aLifeStealExpected` passed a whole family of `assert(x > 0)` checks and fails the matcher.
function assertGreaterThan(actual, expected, message) {
  assert(typeof actual === 'number' || typeof actual === 'bigint',
    `${message}: expected a number to compare, got ${typeof actual} ${JSON.stringify(actual)}`);
  assert(actual > expected, `${message}: expected a value greater than ${expected}, got ${actual}`);
}

// `expect(actual).toEqual(expected)` for an array of primitives: same length, and each element
// equal *and of the same type*. `JSON.stringify` in the message keeps `'Melee'` and `['Melee']`
// distinguishable, which is the distinction the counter-example turned on.
function assertStrictArrayEqual(actual, expected, message) {
  let same = Array.isArray(actual) && actual.length === expected.length;
  if (same) {
    for (let index = 0; index < expected.length; index += 1) {
      // `index in actual` is the half `every` cannot make: it skips holes, so a sparse
      // `[0.25, <hole>, 0.25]` satisfied `every` against `[0.25, 0.5, 0.25]` and passed a whole
      // migrated family, while the `toEqual` it stands for rejects it. Found by the F268.5
      // review; a distribution missing probability mass is exactly what INV-1 exists to stop,
      // so the helper that guards PMFs must not accept one.
      if (!(index in actual) || !Object.is(actual[index], expected[index])) {
        same = false;
        break;
      }
    }
  }
  assert(same, `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// `expect(actual).toContain(needle)` where the receiver is a string. The receiver's type is part
// of the claim, so a non-string fails rather than being coerced into one.
function assertStringContains(actual, needle, message) {
  assert(typeof actual === 'string' && actual.includes(needle),
    `${message}: expected a string containing ${JSON.stringify(needle)}, `
    + `got ${JSON.stringify(actual)}`);
}

// The Node stand-in for the `expectNoConsoleErrors` tail a migrated spec carried.
//
// That tail was not only a page-load claim. `openCalculator` (`tests/helpers.js`) installs its
// listeners before navigating and leaves them installed, so the errors a spec's own
// `page.evaluate` produced were caught too — and a `console.error` raised on a path only that
// spec's synthetic probes reach is caught by nothing else in the tree. So the claim migrates
// rather than being dropped: `body` runs with the context's `console.error` recorded, and one
// assertion afterwards says nothing was recorded.
//
// Only `error` is captured. Playwright's `msg.type() === 'error'` is `console.error` alone —
// `console.warn` is `'warning'` and was never part of the tail. An uncaught throw needs no
// capture: it already fails the run, which is what `pageerror` did for the spec.
function assertNoConsoleErrors(ctx, message, body) {
  const real = ctx.console;
  const captured = [];
  const recorder = Object.create(real);
  recorder.error = (...args) => { captured.push(args.map(arg => String(arg)).join(' ')); };
  ctx.console = recorder;
  try {
    body();
  } finally {
    ctx.console = real;
  }
  assert(captured.length === 0,
    `${message}: no console errors during the checks; got ${captured.length} `
    + `[${captured.join(' | ')}]`);
}

// `expect(actual).toBe(expected)`. The matcher's predicate is `Object.is`, which is not `===`
// in two places that matter: `Object.is(NaN, NaN)` is true and `Object.is(0, -0)` is false. Using
// `!==` instead would be weaker in the second direction — a `-0` where the spec demanded `0`
// would pass — so the matcher's own predicate is used rather than the nearest-looking one.
function assertIs(actual, expected, message) {
  assert(Object.is(actual, expected),
    `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// `expect(actual).toEqual(expected)` for arbitrary plain data: recursive structural equality,
// `Object.is` at the leaves, and — as `toEqual` does — a key whose value is `undefined` is
// ignored on both sides. Arrays and objects are not interchangeable, which is the type erasure
// `assertSameKeyList` was shown to have.
function deepEquals(actual, expected) {
  if (Object.is(actual, expected)) return true;
  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) return false;
    if (actual.length !== expected.length) return false;
    return actual.every((value, index) => deepEquals(value, expected[index]));
  }
  if (actual === null || expected === null) return false;
  if (typeof actual !== 'object' || typeof expected !== 'object') return false;
  const keys = object => Object.keys(object).filter(key => object[key] !== undefined);
  const actualKeys = keys(actual).sort();
  const expectedKeys = keys(expected).sort();
  if (actualKeys.length !== expectedKeys.length) return false;
  if (!actualKeys.every((key, index) => key === expectedKeys[index])) return false;
  return actualKeys.every(key => deepEquals(actual[key], expected[key]));
}

function assertDeepEqual(actual, expected, message) {
  assert(deepEquals(actual, expected),
    `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

// `expect(actual).not.toEqual(expected)`. Its own assertion, not the negation of a call to the
// one above, so the counter moves once and the message says which direction failed.
function assertNotDeepEqual(actual, expected, message) {
  assert(!deepEquals(actual, expected),
    `${message}: expected a value differing from ${JSON.stringify(expected)}, but they are equal`);
}

// `expect(actual).toContain(item)` where the receiver is an ARRAY. This is a different matcher
// behaviour from the string form (`assertStringContains`): membership under SameValueZero, not a
// substring test. Substituting the string helper here would silently turn `['Exorcise']`-style
// membership into a substring match over a joined array.
function assertArrayContains(actual, item, message) {
  assert(Array.isArray(actual) && actual.some(value => value === item || Object.is(value, item)),
    `${message}: expected an array containing ${JSON.stringify(item)}, `
    + `got ${JSON.stringify(actual)}`);
}

// `expect(actual).toHaveLength(n)`: the receiver's own `length` property, strictly equal.
function assertLength(actual, expected, message) {
  assert(actual != null && actual.length === expected,
    `${message}: expected length ${expected}, got ${actual == null ? actual : actual.length}`);
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

// The entries of a projected chain that are writes. A projection also carries the `a:baseCopy`
// boundary marker, which moves no value, so a check about "the first modifier" reads this rather
// than `entries[0]`.
function traceWrites(projected) {
  return ((projected && projected.entries) || []).filter(entry => !entry.boundary);
}

// A primitive export would freeze at zero, so the total is read through a function.
function assertionTotal() {
  return assertionCount;
}

module.exports = {
  assertGreaterThan,
  assert, assertArrayContains, assertClose, assertCloseToPrecision, assertDeepEqual,
  assertDistSumsToOne, assertEqual, assertionTotal, assertIs, assertLength, assertNoConsoleErrors,
  assertNotDeepEqual, assertSameKeyList, assertStrictArrayEqual, assertStringContains,
  baseUnitInput, evalInContext, modernRecordForSharedSlot, traceWrites,
};
