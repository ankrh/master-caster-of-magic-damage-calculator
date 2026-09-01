const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F35 modern Area spell iterations use full HP instead of the wounded-top cap', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const run = version => calcDamageSpellDist(
      2, 10, 0.5, 2, 0.5, 10, 0, null, 1, version, {}, true,
    );
    return {
      modern: ['com2_1.05.11', 'com2_warlord_1.5.12.9'].map(version => ({
        version,
        actual: run(version),
      })),
      fullHpReference: calcAreaDamageDist(2, 10, 0.5, 2, 0.5, 10, 0, null),
      woundedReference: calcAreaDamageDist(2, 10, 0.5, 2, 0.5, 10, 0, null, 1),
      dos: ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => ({
        version,
        actual: run(version),
      })),
    };
  });

  expect(report.fullHpReference).not.toEqual(report.woundedReference);
  for (const row of report.modern) expect(row.actual).toEqual(report.fullHpReference);
  for (const row of report.dos) expect(row.actual).toEqual(report.woundedReference);
  expectNoConsoleErrors(errors);
});

test('F37/F38 order modern Magic Immunity before Black Sleep Doom spell damage', async ({ page }) => {
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
    const versions = ['com2_1.05.11', 'com2_warlord_1.5.12.9'];
    const modern = versions.map(version => {
      const area = version === 'com2_1.05.11';
      const wall = abilities => buildWallOfFirePhase(true, {
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

      const attacker = makeUnit(version, 'a', { abilities: { immolation: true } });
      const target = makeUnit(version, 'b', { figs: 2, def: 100 });
      const resolveAgainst = abilities => {
        const defender = { ...target, abilities };
        return resolveCombat(attacker, defender, {
          version, isRanged: false, wallOfFire: false, distance: 1,
        }).totalDmgToB;
      };
      const sleepingSource = makeUnit(version, 'a', {
        figs: 2,
        hp: 20,
        abilities: {
          blackSleep: true,
          firstStrike: true,
          haste: true,
          immolation: true,
          poison: 10,
          lifeSteal: -10,
        },
      });
      const counteringDefender = makeUnit(version, 'b', { atk: 1 });
      const sleepingMelee = resolveCombat(sleepingSource, counteringDefender, {
        version, isRanged: false, wallOfFire: true, distance: 1,
      });
      const immuneSleepingMelee = resolveCombat({
        ...sleepingSource,
        abilities: { ...sleepingSource.abilities, magicImmunity: true },
      }, counteringDefender, {
        version, isRanged: false, wallOfFire: true, distance: 1,
      });
      return {
        version,
        magicImmune: calcDamageSpellDist(
          2, 10, 1, 0, 0, 10, 0, null, 3, version,
          { magicImmunity: true }, true,
        ),
        magicImmuneBlackSleep: calcDamageSpellDist(
          2, 10, 1, 0, 0, 10, 0, null, 3, version,
          { magicImmunity: true, blackSleep: true }, true,
        ),
        nonmagicBypass: calcDamageSpellDist(
          2, 10, 1, 0, 0, 10, 0, null, 3, version,
          { magicImmunity: true }, true, true,
        ),
        blackSleepArea: calcDamageSpellDist(
          2, 10, 0, 100, 1, 10, 2, null, 3, version,
          { blackSleep: true }, true,
        ),
        blackSleepNonArea: calcDamageSpellDist(
          1, 12, 0, 100, 1, 10, 2, null, 3, version,
          { blackSleep: true }, false,
        ),
        wallBlackSleep: wall({ blackSleep: true }),
        wallImmune: wall({ magicImmunity: true }),
        immolationBlackSleep: resolveAgainst({ blackSleep: true }),
        immolationImmune: resolveAgainst({ magicImmunity: true }),
        immolationBoth: resolveAgainst({ magicImmunity: true, blackSleep: true }),
        noImmolationImmune: resolveCombat(
          makeUnit(version, 'a'), { ...target, abilities: { magicImmunity: true } },
          { version, isRanged: false, wallOfFire: false, distance: 1 },
        ).totalDmgToB,
        noImmolationBoth: resolveCombat(
          makeUnit(version, 'a'), {
            ...target, abilities: { magicImmunity: true, blackSleep: true },
          },
          { version, isRanged: false, wallOfFire: false, distance: 1 },
        ).totalDmgToB,
        sleepingMeleePhases: sleepingMelee.phases,
        sleepingMeleeTotalToA: sleepingMelee.totalDmgToA,
        sleepingMeleeTotalToB: sleepingMelee.totalDmgToB,
        immuneSleepingMeleePhases: immuneSleepingMelee.phases,
        immuneSleepingMeleeTotalToA: immuneSleepingMelee.totalDmgToA,
        immuneSleepingMeleeTotalToB: immuneSleepingMelee.totalDmgToB,
      };
    });
    const dos = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => {
      const sleepingSource = makeUnit(version, 'a', {
        abilities: { blackSleep: true, firstStrike: true, immolation: true, poison: 10 },
      });
      const result = resolveCombat(sleepingSource, makeUnit(version, 'b', { atk: 10 }), {
        version, isRanged: false, wallOfFire: true, distance: 1,
      });
      return {
        version,
        phases: result.phases,
        totalDmgToA: result.totalDmgToA,
        totalDmgToB: result.totalDmgToB,
      };
    });
    return { modern, dos };
  });

  for (const row of report.modern) {
    expect(row.magicImmune).toEqual([1]);
    expect(row.magicImmuneBlackSleep).toEqual([1]);
    // Two 10-HP figures each take the full 10 and nothing truncates the phase, so the
    // area cases sit at 20 rather than at the caller's remaining-HP figure.
    expect(row.nonmagicBypass[20]).toBe(1);
    expect(row.blackSleepArea[20]).toBe(1);
    expect(row.blackSleepNonArea[12]).toBe(1);
    expect(row.wallBlackSleep[row.version === 'com2_1.05.11' ? 20 : 12]).toBe(1);
    expect(row.wallImmune).toEqual([1]);
    expect(row.immolationBlackSleep[21]).toBe(1);
    expect(row.immolationImmune).toEqual(row.noImmolationImmune);
    expect(row.immolationBoth).toEqual(row.noImmolationBoth);
    expect(row.sleepingMeleePhases).toBeNull();
    expect(row.sleepingMeleeTotalToA).toEqual([1]);
    expect(row.sleepingMeleeTotalToB).toEqual([1]);
    expect(row.immuneSleepingMeleePhases).toBeNull();
    expect(row.immuneSleepingMeleeTotalToA).toEqual([1]);
    expect(row.immuneSleepingMeleeTotalToB).toEqual([1]);
  }
  for (const row of report.dos) {
    expect(row.phases).toBeNull();
    expect(row.totalDmgToA).toEqual([1]);
    expect(row.totalDmgToB).toEqual([1]);
  }
  expectNoConsoleErrors(errors);
});
