const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F33 exempts CoM2 and Warlord heroes from physical ranged distance penalties', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const direct = version => ({
      heroMissile: distancePenalty(8, 'missile', false, version, true),
      normalMissile: distancePenalty(8, 'missile', false, version, false),
      heroBoulder: distancePenalty(8, 'boulder', false, version, true),
      normalBoulder: distancePenalty(8, 'boulder', false, version, false),
      normalLongRange: distancePenalty(8, 'missile', true, version, false),
      heroMagic: distancePenalty(8, 'magic_c', false, version, true),
      normalMagic: distancePenalty(8, 'magic_c', false, version, false),
      normalThrown: distancePenalty(8, 'thrown', false, version, false),
      normalBreath: distancePenalty(8, 'fire', false, version, false),
    });
    const derive = (version, unitType, identity) => deriveUnitStats({
      prefix: 'a', version, abilities: {}, level: 'normal', weapon: 'normal', armor: 'normal',
      rtbType: 'missile', unitType, figs: 1, atk: 1, rtb: 10, def: 0, res: 5, hp: 10,
      dmg: 0, toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0, cityWalls: 'none',
      nodeAura: 'none', trueLight: false, darkness: false, rangedCheck: true, rangedDist: 8,
      identity,
      modernAttacks: version.startsWith('com2')
        ? { ranged: { strength: 10, type: 'missile' } } : undefined,
    });
    return {
      modern: ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => {
        const roster = version === 'com2_1.05.11' ? COM2_UNITS_DATA : WARLORD_UNITS_DATA;
        const units = Object.values(roster);
        const physical = unit => unit.ranged_type === 'Missile' || unit.ranged_type === 'Boulder';
        const heroUnit = units.find(unit => unit.isHero && physical(unit));
        const normalUnit = units.find(unit => !unit.isHero && physical(unit));
        const rosterHero = derive(version, 'normal', createRosterUnitIdentity(version, heroUnit));
        const rosterNormal = derive(version, 'hero', createRosterUnitIdentity(version, normalUnit));
        const customHero = derive(version, 'normal', createCustomUnitIdentity(version, {
          isHero: true, baseRace: 'High Men', baseFantastic: false,
        }));
        const customNormal = derive(version, 'hero', createCustomUnitIdentity(version, {
          isHero: false, baseRace: 'High Men', baseFantastic: false,
        }));
        return {
          version,
          direct: direct(version),
          rosterHeroName: heroUnit.name,
          rosterHeroIsHero: rosterHero.isHero,
          rosterHeroPenalty: rosterHero.rtbDistPenalty,
          rosterHeroRangeTrace: rosterHero.modifierTraces.toHitRanged.entries
            .some(entry => entry.source.id === 'distancePenalty'),
          rosterNormalName: normalUnit.name,
          rosterNormalIsHero: rosterNormal.isHero,
          rosterNormalPenalty: rosterNormal.rtbDistPenalty,
          rosterNormalRangeTrace: rosterNormal.modifierTraces.toHitRanged.entries
            .some(entry => entry.source.id === 'distancePenalty'),
          customHeroPenalty: customHero.rtbDistPenalty,
          customNormalPenalty: customNormal.rtbDistPenalty,
        };
      }),
      dos: ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => ({
        version, direct: direct(version),
      })),
      distanceTooltip: document.querySelector('#rangedDistLabel label').dataset.tooltip,
    };
  });

  for (const result of report.modern) {
    expect(result.direct.heroMissile, result.version).toBe(0);
    expect(result.direct.normalMissile, result.version).toBe(-22);
    expect(result.direct.heroBoulder, result.version).toBe(0);
    expect(result.direct.normalBoulder, result.version).toBe(-22);
    expect(result.direct.normalLongRange, result.version).toBe(-10);
    expect(result.direct.heroMagic, result.version).toBe(0);
    expect(result.direct.normalMagic, result.version).toBe(0);
    expect(result.direct.normalThrown, result.version).toBe(0);
    expect(result.direct.normalBreath, result.version).toBe(0);
    expect(result.rosterHeroName, result.version).toBeTruthy();
    expect(result.rosterHeroIsHero, result.version).toBe(true);
    expect(result.rosterHeroPenalty, result.version).toBe(0);
    expect(result.rosterHeroRangeTrace, result.version).toBe(false);
    expect(result.rosterNormalName, result.version).toBeTruthy();
    expect(result.rosterNormalIsHero, result.version).toBe(false);
    expect(result.rosterNormalPenalty, result.version).toBe(-22);
    expect(result.rosterNormalRangeTrace, result.version).toBe(true);
    expect(result.customHeroPenalty, result.version).toBe(0);
    expect(result.customNormalPenalty, result.version).toBe(-22);
  }
  expect(report.dos[0].direct.heroMissile).toBe(-20);
  expect(report.dos[1].direct.heroMissile).toBe(-20);
  expect(report.dos[2].direct.heroMissile).toBe(0);
  expect(report.distanceTooltip).toContain('Heroes ignore distance penalties');
  expect(report.distanceTooltip).toContain('CoM 2 & Warlord');
  expectNoConsoleErrors(errors);
});

test('F56 leaves every modern gaze field out of the level bonus step', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const derive = (version, level, overrides = {}) => deriveUnitStats({
      prefix: 'a', version, abilities: { stoningGaze: -3, deathGaze: -2, doomGaze: 4 },
      level, weapon: 'normal', armor: 'normal', rtbType: 'none', unitType: 'normal',
      figs: 1, atk: 1, rtb: 0, modernAttacks: {}, def: 0, res: 5, hp: 10, dmg: 0,
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0, cityWalls: 'none', nodeAura: 'none',
      trueLight: false, darkness: false, rangedCheck: false, rangedDist: 1,
      ...overrides,
    });
    const modern = ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => {
      const elite = derive(version, 'elite');
      const levelStep = elite.statTrace.find(entry => entry.id === 'level');
      const conventional = derive(version, 'elite', {
        modernAttacks: {
          ranged: { strength: 2, type: 'missile' },
          thrown: { strength: 2, type: 'thrown' },
          fireBreath: { strength: 2, type: 'fire' },
          lightningBreath: { strength: 2, type: 'lightning' },
        },
      });
      const hero = derive(version, 'elite', {
        identity: createCustomUnitIdentity(version, {
          isHero: true, baseRace: 'High Men', baseFantastic: false,
        }),
      });
      return {
        version,
        gazeChange: levelStep.changes.gaze || null,
        doomChange: levelStep.changes.doomGaze || null,
        stoningGaze: elite.abilities.stoningGaze,
        deathGaze: elite.abilities.deathGaze,
        doomGaze: elite.abilities.doomGaze,
        heroStoningGaze: hero.abilities.stoningGaze,
        heroDeathGaze: hero.abilities.deathGaze,
        heroDoomGaze: hero.abilities.doomGaze,
        rangedStrength: conventional.modernAttacks.ranged.strength,
        thrownStrength: conventional.modernAttacks.thrown.strength,
        fireBreathStrength: conventional.modernAttacks.fireBreath.strength,
        lightningBreathStrength: conventional.modernAttacks.lightningBreath.strength,
      };
    });
    const momNormal = derive('mom_1.31', 'normal', {
      abilities: { stoningGaze: -3 }, rtbType: 'gaze_stoning', rtb: 1,
    });
    const momElite = derive('mom_1.31', 'elite', {
      abilities: { stoningGaze: -3 }, rtbType: 'gaze_stoning', rtb: 1,
    });
    const cpNormal = derive('mom_cp_1.60.00', 'normal', {
      abilities: { stoningGaze: -3 }, rtbType: 'gaze_stoning', rtb: 1,
    });
    const cpElite = derive('mom_cp_1.60.00', 'elite', {
      abilities: { stoningGaze: -3 }, rtbType: 'gaze_stoning', rtb: 1,
    });
    const comNormal = derive('com_6.08', 'normal', {
      abilities: { deathGaze: -3 }, rtbType: 'gaze_death', rtb: 1,
    });
    const comElite = derive('com_6.08', 'elite', {
      abilities: { deathGaze: -3 }, rtbType: 'gaze_death', rtb: 1,
    });
    return {
      modern,
      dos: {
        momNormal: momNormal.effectiveGazeRanged,
        momElite: momElite.effectiveGazeRanged,
        cpNormal: cpNormal.effectiveGazeRanged,
        cpElite: cpElite.effectiveGazeRanged,
        comNormal: comNormal.effectiveGazeRanged,
        comElite: comElite.effectiveGazeRanged,
      },
      gazeTooltips: Object.fromEntries(['stoningGaze', 'deathGaze', 'doomGaze']
        .map(key => [key, ABILITY_DEFS.find(def => def.key === key).tooltip])),
    };
  });

  for (const result of report.modern) {
    expect(result.gazeChange, result.version).toBeNull();
    expect(result.doomChange, result.version).toBeNull();
    expect(result.stoningGaze, result.version).toBe(-3);
    expect(result.deathGaze, result.version).toBe(-2);
    expect(result.doomGaze, result.version).toBe(4);
    expect(result.heroStoningGaze, result.version).toBe(-3);
    expect(result.heroDeathGaze, result.version).toBe(-2);
    expect(result.heroDoomGaze, result.version).toBe(4);
    expect(result.rangedStrength, result.version).toBe(4);
    expect(result.thrownStrength, result.version).toBe(3);
    expect(result.fireBreathStrength, result.version).toBe(3);
    expect(result.lightningBreathStrength, result.version).toBe(3);
  }
  expect(report.dos.momElite).toBeGreaterThan(report.dos.momNormal);
  expect(report.dos.cpElite).toBeGreaterThan(report.dos.cpNormal);
  expect(report.dos.comElite).toBeGreaterThan(report.dos.comNormal);
  for (const tooltip of Object.values(report.gazeTooltips)) {
    expect(tooltip).toContain('Level does not modify this independent gaze field');
  }
  expectNoConsoleErrors(errors);
});
