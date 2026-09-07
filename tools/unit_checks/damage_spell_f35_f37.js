// F35 / F37 — modern damage-spell resolution: the Area iteration's HP cap, and the order in
// which Magic Immunity and Black Sleep are inspected.
//
// Tag: regression.  Anchor: F35, F37.  TESTS.md keeps this suite's own section; the command
// there names this family, not the Playwright file it came from.
//
// **F38 was retired by F268.4 as corpus-reachable.** Its claim was that a Black-Sleeping attacker
// resolves no phases and deals and takes nothing, in all five engines. Letting that attacker act
// (`if (aBlackSleep)` in `combat.js`) fails the preset fixture
// `blackSleepAttackerCannotInitiateMelee`, which is therefore load-bearing for it and must not be
// retired blind.
//
// **F35 and F37 stayed, because nothing else reaches them.** Giving the modern Area spell the
// wounded-top cap, and inspecting Black Sleep before Magic Immunity in `damageSpellArm`, were
// each measured against the whole tree: all 1,161 fixtures stayed green on all four moments and
// all ten damage-category moments, as did the other 29,664 Node assertions. This family was the
// only thing that failed.
//
// Migrated from `tests/damage-spell-f35-f37-f38.spec.js` by F268.2 (file renamed by F268.4 when
// F38 was retired). That spec used Chrome purely
// as a JavaScript runtime: two `page.evaluate` blocks built `deriveUnitStats` inputs by hand,
// called `calcDamageSpellDist`, `calcAreaDamageDist`, `buildWallOfFirePhase` and `resolveCombat`,
// returned a plain report and asserted on it. It touched no DOM, so the browser bought nothing the
// `vm` context does not. Every function it called is `data-scope="core"`.
//
// Each assertion is marked `[F35-N]` / `[F37-N]` below. The two retired tests'
// `expectNoConsoleErrors` tails became `assertNoConsoleErrors`, one per test, because that tail
// also caught errors the spec's own probes raised (`assertions.js`).
//
// The helpers used are the matcher-faithful ones (`assertions.js`, F268 section), not the
// nearest-looking general ones. Every `toEqual` here compares a whole distribution, so it is
// `assertStrictArrayEqual` rather than `assertSameKeyList`, whose `join(', ')` erases element
// type; every `toBe` is `assertIs`, which is the matcher's own `Object.is` and so rejects a `-0`
// where `0` was demanded.

'use strict';

const {
  assertIs, assertNoConsoleErrors, assertNotDeepEqual, assertStrictArrayEqual,
} = require('./assertions');

const MODERN = ['com2_1.05.11', 'com2_warlord_1.5.12.9'];
const DOS = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'];

// The spec's own probe builder, carried over verbatim rather than rebased onto `baseUnitInput`.
// The shared builder's defaults differ from this one's in the fields these checks are about —
// `hp`, `res` and the to-hit fields — so rebasing would have changed the inputs while the
// assertions stayed still, which is the silent weakening F268 exists to prevent.
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
    atk: 1,
    rtb: 0,
    modernAttacks: {},
    def: 0,
    res: 10,
    hp: 20,
    dmg: 0,
    ...(version.startsWith('com2') ? { hitChance: 70 } : { toHitMod: 70, toHitRtbMod: 70 }),
    toBlkMod: 0,
    cityWalls: 'none',
    nodeAura: 'none',
    trueLight: false,
    darkness: false,
    rangedCheck: false,
    rangedDist: 1,
    ...overrides,
  });
}

// F35: a modern Area spell iterates on the full HP per figure. The DOS engines cap on the wounded
// top figure instead, which is what `calcAreaDamageDist`'s ninth argument states.
function runAreaHpCapChecks(ctx) {
  const run = version => ctx.calcDamageSpellDist(
    2, 10, 0.5, 2, 0.5, 10, 0, null, 1, version, {}, true,
  );
  const fullHpReference = ctx.calcAreaDamageDist(2, 10, 0.5, 2, 0.5, 10, 0, null);
  const woundedReference = ctx.calcAreaDamageDist(2, 10, 0.5, 2, 0.5, 10, 0, null, 1);

  // [F35-1] The two references must differ, or every check below would pass vacuously.
  assertNotDeepEqual(fullHpReference, woundedReference,
    'The full-HP and wounded-top Area references differ');
  // [F35-2, F35-3] the modern engines take the full-HP one
  for (const version of MODERN) {
    assertStrictArrayEqual(run(version), fullHpReference,
      `${version}: the modern Area spell iterates on full HP`);
  }
  // [F35-4, F35-5, F35-6] and the DOS engines keep the wounded-top cap
  for (const version of DOS) {
    assertStrictArrayEqual(run(version), woundedReference,
      `${version}: the DOS Area spell keeps the wounded-top cap`);
  }
}

// The modern half of F37/F38, one version at a time. Every probe is the spec's, verbatim.
function runModernOrderChecksFor(ctx, version) {
  const area = version === 'com2_1.05.11';
  const wall = abilities => ctx.buildWallOfFirePhase(true, {
    wofStr: version === 'com2_1.05.11' ? 10 : 12,
    wofToHit: 0,
    wofSingleFigure: !area,
    aDefForImm: 100,
    aToBlock: 1,
    aHP: 10,
    aInvulnBonus: 2,
    aAbilities: abilities,
    version,
  }).compute(2, 2, 17).dist;

  const attacker = makeUnit(ctx, version, 'a', { abilities: { immolation: true } });
  const target = makeUnit(ctx, version, 'b', { figs: 2, def: 100 });
  const resolveAgainst = abilities => ctx.resolveCombat(attacker, { ...target, abilities }, {
    version, isRanged: false, wallOfFire: false, distance: 1,
  }).totalDmgToB;

  const noImmolationImmune = ctx.resolveCombat(
    makeUnit(ctx, version, 'a'), { ...target, abilities: { magicImmunity: true } },
    { version, isRanged: false, wallOfFire: false, distance: 1 },
  ).totalDmgToB;
  const noImmolationBoth = ctx.resolveCombat(
    makeUnit(ctx, version, 'a'),
    { ...target, abilities: { magicImmunity: true, blackSleep: true } },
    { version, isRanged: false, wallOfFire: false, distance: 1 },
  ).totalDmgToB;

  // [F37-1] Magic Immunity is inspected first, so the spell contributes nothing at all.
  assertStrictArrayEqual(
    ctx.calcDamageSpellDist(2, 10, 1, 0, 0, 10, 0, null, 3, version,
      { magicImmunity: true }, true),
    [1], `${version}: a Magic Immune target takes no damage spell`);
  // [F37-2] and Black Sleep beside it does not reopen the spell.
  assertStrictArrayEqual(
    ctx.calcDamageSpellDist(2, 10, 1, 0, 0, 10, 0, null, 3, version,
      { magicImmunity: true, blackSleep: true }, true),
    [1], `${version}: Magic Immunity is ordered before Black Sleep`);
  // [F37-3] A nonmagic spell bypasses the immunity: two 10-HP figures each take the full 10 and
  // nothing truncates the phase, so the area cases sit at 20 rather than at the caller's
  // remaining-HP figure.
  assertIs(ctx.calcDamageSpellDist(2, 10, 1, 0, 0, 10, 0, null, 3, version,
    { magicImmunity: true }, true, true)[20], 1,
  `${version}: a nonmagic spell bypasses Magic Immunity`);
  // [F37-4] Black Sleep alone turns the spell into Doom damage, Area form.
  assertIs(ctx.calcDamageSpellDist(2, 10, 0, 100, 1, 10, 2, null, 3, version,
    { blackSleep: true }, true)[20], 1,
  `${version}: Black Sleep makes the Area spell Doom damage`);
  // [F37-5] and non-Area form.
  assertIs(ctx.calcDamageSpellDist(1, 12, 0, 100, 1, 10, 2, null, 3, version,
    { blackSleep: true }, false)[12], 1,
  `${version}: Black Sleep makes the non-Area spell Doom damage`);
  // [F37-6] Wall of Fire against a Black Sleeping target is Doom damage too.
  assertIs(wall({ blackSleep: true })[version === 'com2_1.05.11' ? 20 : 12], 1,
    `${version}: Wall of Fire against a Black Sleeping target is Doom damage`);
  // [F37-7] and against a Magic Immune one it does nothing.
  assertStrictArrayEqual(wall({ magicImmunity: true }), [1],
    `${version}: Wall of Fire does nothing to a Magic Immune target`);
  // [F37-8] Immolation against a Black Sleeping target is Doom damage.
  assertIs(resolveAgainst({ blackSleep: true })[21], 1,
    `${version}: Immolation against a Black Sleeping target is Doom damage`);
  // [F37-9] Immolation against a Magic Immune target is exactly the no-Immolation result.
  assertStrictArrayEqual(resolveAgainst({ magicImmunity: true }), noImmolationImmune,
    `${version}: Immolation adds nothing against a Magic Immune target`);
  // [F37-10] and Black Sleep beside the immunity does not change that.
  assertStrictArrayEqual(resolveAgainst({ magicImmunity: true, blackSleep: true }),
    noImmolationBoth,
    `${version}: Magic Immunity is ordered before Black Sleep in the Immolation path`);
}

function runOrderChecks(ctx) {
  for (const version of MODERN) runModernOrderChecksFor(ctx, version);
}

// One `assertNoConsoleErrors` per retired test, wrapping exactly the calls that test made.
function runDamageSpellF35F37Checks(ctx) {
  // [F35-7] the first retired test's error tail
  assertNoConsoleErrors(ctx, 'F35 modern Area spell HP cap', () => runAreaHpCapChecks(ctx));
  // [F37-11] the second retired test's error tail
  assertNoConsoleErrors(ctx, 'F37 Magic Immunity before Black Sleep',
    () => runOrderChecks(ctx));
}

module.exports = { runDamageSpellF35F37Checks };
