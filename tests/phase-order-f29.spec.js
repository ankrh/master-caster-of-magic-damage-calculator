const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F29 orders every modern opening phase and recomputes casualties before later attacks', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const makeUnit = (version, prefix, overrides = {}) => deriveUnitStats({
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
      modernAttacks: {},
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
    const mean = dist => dist.reduce(
      (sum, probability, damage) => sum + probability * damage, 0);

    return ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => {
      const allAttacker = makeUnit(version, 'a', {
        figs: 2,
        atk: 1,
        hp: 20,
        res: 100,
        modernAttacks: {
          lightningBreath: { strength: 1, type: 'lightning' },
          fireBreath: { strength: 1, type: 'fire' },
          thrown: { strength: 1, type: 'thrown' },
        },
        abilities: { stoningGaze: 0, deathGaze: 0, doomGaze: 1 },
      });
      const allDefender = makeUnit(version, 'b', {
        figs: 2,
        atk: 1,
        hp: 20,
        res: 100,
        abilities: { stoningGaze: 0, deathGaze: 0, doomGaze: 1 },
      });
      const ordered = resolveCombat(allAttacker, allDefender, {
        version, isRanged: false, wallOfFire: true, distance: 1,
      });

      // The retaliation gaze resolves before Lightning Breath. Its deterministic
      // Stoning failures remove both one-HP attacker figures, so the later attack
      // contributes zero instead of the two damage produced without that gaze.
      const breathAttacker = makeUnit(version, 'a', {
        figs: 2,
        atk: 1,
        hp: 1,
        modernAttacks: {
          lightningBreath: { strength: 1, type: 'lightning' },
        },
      });
      const plainDefender = makeUnit(version, 'b', { figs: 2, hp: 20, res: 0 });
      const gazeDefender = makeUnit(version, 'b', {
        figs: 2,
        hp: 20,
        res: 0,
        abilities: { stoningGaze: -10 },
      });
      const baseline = resolveCombat(breathAttacker, plainDefender, {
        version, isRanged: false, wallOfFire: false, distance: 1,
      });
      const afterCasualties = resolveCombat(breathAttacker, gazeDefender, {
        version, isRanged: false, wallOfFire: false, distance: 1,
      });
      const afterWallCasualties = resolveCombat(breathAttacker, plainDefender, {
        version, isRanged: false, wallOfFire: true, distance: 1,
      });
      const lightning = result => result.phases.find(
        phase => phase.label === 'Lightning Breath');

      return {
        version,
        labels: ordered.phases.map(phase => phase.label),
        baselineLightning: mean(lightning(baseline).defDist),
        casualtyLightning: mean(lightning(afterCasualties).defDist),
        wallCasualtyLightning: mean(lightning(afterWallCasualties).defDist),
        casualtyLabels: afterCasualties.phases.map(phase => phase.label),
      };
    });
  });

  const opening = [
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
  for (const result of report) {
    expect(result.labels.slice(0, opening.length), result.version).toEqual(opening);
    expect(result.labels.at(-1)).toContain('Melee');
    expect(result.casualtyLabels.indexOf('Defender Stoning Gaze')).toBeLessThan(
      result.casualtyLabels.indexOf('Lightning Breath'));
    expect(result.baselineLightning).toBeCloseTo(2, 12);
    expect(result.casualtyLightning).toBeCloseTo(0, 12);
    expect(result.wallCasualtyLightning).toBeLessThan(result.baselineLightning);
  }
  expectNoConsoleErrors(errors);
});

test('F29 preserves the DOS Thrown/gaze/Wall opening order in every older calculator version', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const makeUnit = (version, prefix, overrides = {}) => deriveUnitStats({
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
      hp: 20,
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
    return ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => {
      const attacker = makeUnit(version, 'a', {
        atk: 1,
        rtb: 1,
        rtbType: 'thrown',
      });
      const defender = makeUnit(version, 'b', {
        atk: 1,
        rtb: 1,
        rtbType: 'gaze_death',
        abilities: { deathGaze: 0 },
      });
      const result = resolveCombat(attacker, defender, {
        version, isRanged: false, wallOfFire: true, distance: 1,
      });
      return { version, labels: result.phases.map(phase => phase.label) };
    });
  });

  for (const result of report) {
    expect(result.labels.slice(0, 3), result.version).toEqual([
      'Thrown', 'Defender Death Gaze', 'Wall of Fire',
    ]);
    expect(result.labels.at(-1)).toContain('Melee');
  }
  expectNoConsoleErrors(errors);
});
