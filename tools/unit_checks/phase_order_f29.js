// F29 — combat phase ORDER, and casualties recomputed between phases.
//
// Tag: regression.  Anchor: F29.  TESTS.md keeps this suite's own section; the command there
// names this family, not the Playwright file it came from.
//
// Migrated from `tests/phase-order-f29.spec.js` by F268.1. That spec used Chrome purely as a
// JavaScript runtime: one `page.evaluate` built `deriveUnitStats` inputs by hand, called
// `resolveCombat`, returned a plain report and asserted on it. It touched no DOM, so the browser
// bought nothing the `vm` context does not.
//
// Each assertion is marked `[F29-N]` below, and the retired test's `expectNoConsoleErrors` tail
// became `assertNoConsoleErrors`, because that tail also caught errors the spec's own probes
// raised — see that helper.
//
// **The DOS half was retired by F268.4 as corpus-reachable.** It asserted the older engines'
// Thrown / defender-gaze / Wall of Fire opening in all three DOS builds. Reversing that order
// fails three preset fixtures — `wallOfFireAfterThrown`, `wallOfFireAfterGazeCounter` and
// `wallOfFireAfterThrownAndGaze` — which are therefore load-bearing for it and must not be
// retired blind. They are `mom_1.31` fixtures, and one version suffices because the DOS arm of
// `resolveCombat`'s opening is one version-independent branch.
//
// **The modern half stayed, because nothing else reaches it.** Reordering the modern channel
// resolution (`['lightningBreath', 'fireBreath', 'thrown']`, `combat_phases.js`) and moving Wall
// of Fire to the end of the modern opening were each measured against the whole tree: all 1,161
// fixtures stayed green on all four moments and all ten damage-category moments, as did the other
// 29,664 Node assertions. This family was the only thing that failed.
//
// The helpers used here are the matcher-faithful ones (`assertions.js`, F268 section), not the
// nearest-looking general ones: the F268.1 review built passing counter-examples against
// `assertClose` (inclusive bound, accepts `NaN`), `assertSameKeyList` (joins, so element type is
// erased) and `String(x).includes(...)` (coerces the receiver).

'use strict';

// `assert` still stands for the two `toBeLessThan` calls: `a < b` is exactly that matcher's
// predicate, and it rejects `NaN` on either side the same way.
const {
  assert, assertCloseToPrecision, assertNoConsoleErrors, assertStrictArrayEqual,
  assertStringContains,
} = require('./assertions');

// The spec's own probe builder, carried over verbatim rather than rebased onto `baseUnitInput`.
// The shared builder's defaults differ from this one's in the very fields F29 is about — `atk`,
// `hp`, `res` and every to-hit field — so rebasing would have changed the inputs while the
// assertions stayed still, which is the silent weakening F268 exists to prevent. This probe is
// local to F29 for that reason and is not a second general-purpose builder.
function makeUnit(ctx, version, prefix, overrides = {}) {
  return ctx.deriveUnitStats({
    prefix,
    version,
    innateAbilities: {}, markedAbilities: {},
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
    toBlkMod: -30,
    cityWalls: 'none',
    nodeAura: 'none',
    trueLight: false,
    darkness: false,
    rangedCheck: false,
    rangedDist: 1,
    ...overrides,
  });
}

const mean = dist => dist.reduce((sum, probability, damage) => sum + probability * damage, 0);

// The full modern opening, in order, before any melee exchange.
const MODERN_OPENING = [
  'Wall of Fire',
  'Attacker Stoning Gaze',
  'Attacker Death Gaze',
  'Attacker Doom Gaze',
  'Defender Stoning Gaze',
  'Defender Death Gaze',
  'Defender Doom Gaze',
  'Lightning Breath',
  'Fire Breath',
  'Thrown',
];

// F29, modern half: every opening phase is ordered, and casualties taken in an earlier phase are
// recomputed before a later attack rather than the later attack running against the figure count
// its side entered the sequence with.
function runModernPhaseOrderChecks(ctx) {
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const allAttacker = makeUnit(ctx, version, 'a', {
      figs: 2,
      atk: 1,
      hp: 20,
      res: 100,
      modernAttacks: {
        lightningBreath: { strength: 1, type: 'lightning' },
        fireBreath: { strength: 1, type: 'fire' },
        thrown: { strength: 1, type: 'thrown' },
      },
      innateAbilities: { stoningGaze: 0, deathGaze: 0, doomGaze: 1 },
    });
    const allDefender = makeUnit(ctx, version, 'b', {
      figs: 2,
      atk: 1,
      hp: 20,
      res: 100,
      modernAttacks: {},
      innateAbilities: { stoningGaze: 0, deathGaze: 0, doomGaze: 1 },
    });
    const ordered = ctx.resolveCombat(allAttacker, allDefender, {
      version, isRanged: false, wallOfFire: true, distance: 1,
    });

    // The retaliation gaze resolves before Lightning Breath. Its deterministic Stoning failures
    // remove both one-HP attacker figures, so the later attack contributes zero instead of the
    // two damage produced without that gaze.
    const breathAttacker = makeUnit(ctx, version, 'a', {
      figs: 2,
      atk: 1,
      hp: 1,
      modernAttacks: {
        lightningBreath: { strength: 1, type: 'lightning' },
      },
    });
    const plainDefender = makeUnit(ctx, version, 'b', {
      figs: 2, hp: 20, res: 0, modernAttacks: {},
    });
    const gazeDefender = makeUnit(ctx, version, 'b', {
      figs: 2,
      hp: 20,
      res: 0,
      modernAttacks: {},
      innateAbilities: { stoningGaze: -10 },
    });
    const baseline = ctx.resolveCombat(breathAttacker, plainDefender, {
      version, isRanged: false, wallOfFire: false, distance: 1,
    });
    const afterCasualties = ctx.resolveCombat(breathAttacker, gazeDefender, {
      version, isRanged: false, wallOfFire: false, distance: 1,
    });
    const afterWallCasualties = ctx.resolveCombat(breathAttacker, plainDefender, {
      version, isRanged: false, wallOfFire: true, distance: 1,
    });
    const lightning = result => result.phases.find(phase => phase.label === 'Lightning Breath');

    const labels = ordered.phases.map(phase => phase.label);
    const casualtyLabels = afterCasualties.phases.map(phase => phase.label);
    const baselineLightning = mean(lightning(baseline).defDist);
    const casualtyLightning = mean(lightning(afterCasualties).defDist);
    const wallCasualtyLightning = mean(lightning(afterWallCasualties).defDist);

    // [F29-1] the opening, in order
    assertStrictArrayEqual(labels.slice(0, MODERN_OPENING.length), MODERN_OPENING,
      `${version}: the modern opening phases resolve in order`);
    // [F29-2] melee closes the sequence
    assertStringContains(labels.at(-1), 'Melee',
      `${version}: the last phase is a Melee phase`);
    // [F29-3] the retaliation gaze is resolved before the breath that reads its casualties
    assert(
      casualtyLabels.indexOf('Defender Stoning Gaze') < casualtyLabels.indexOf('Lightning Breath'),
      `${version}: Defender Stoning Gaze resolves before Lightning Breath`);
    // [F29-4] the undisturbed breath's mean
    assertCloseToPrecision(baselineLightning, 2, 12,
      `${version}: Lightning Breath with both attacker figures alive`);
    // [F29-5] gaze casualties are recomputed before the breath, which then contributes nothing
    assertCloseToPrecision(casualtyLightning, 0, 12,
      `${version}: Lightning Breath after the retaliation gaze killed both attacker figures`);
    // [F29-6] Wall of Fire casualties reach the same later phase
    assert(wallCasualtyLightning < baselineLightning,
      `${version}: Wall of Fire casualties reduce the later Lightning Breath `
      + `(${wallCasualtyLightning} is not below ${baselineLightning})`);
  }
}

// One `assertNoConsoleErrors` per retired test, wrapping exactly the calls that test made — the
// tail it stands for was installed for the whole test, including its `page.evaluate`.
function runPhaseOrderF29Checks(ctx) {
  // [F29-7] the retired test's error tail
  assertNoConsoleErrors(ctx, 'F29 modern phase order',
    () => runModernPhaseOrderChecks(ctx));
}

module.exports = { runPhaseOrderF29Checks };
