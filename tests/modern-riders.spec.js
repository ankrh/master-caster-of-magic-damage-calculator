const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F25 excludes every modern gaze type from the shared touch-rider dispatcher', async ({ page }) => {
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
    const riderAbilities = {
      poison: 2,
      stoningTouch: -1,
      deathTouch: -1,
      lifeSteal: -1,
      exorcise: -1,
      destruction: 0,
    };
    const gazeCases = [
      ['Stoning Gaze', { stoningGaze: 9 }],
      ['Death Gaze', { deathGaze: 9 }],
      ['Doom Gaze', { doomGaze: 3 }],
    ];
    const modern = [];
    for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
      const target = makeUnit(version, 'b', {
        figs: 4,
        res: 5,
        hp: 10,
        unitType: 'fantastic_nature',
      });
      for (const [name, gaze] of gazeCases) {
        const plain = makeUnit(version, 'a', { abilities: gaze });
        const withRiders = makeUnit(version, 'a', {
          abilities: { ...gaze, ...riderAbilities },
        });
        const opts = { version, isRanged: false, wallOfFire: false, distance: 1 };
        const baseline = resolveCombat(plain, target, opts);
        const actual = resolveCombat(withRiders, target, opts);
        const gazeRow = actual.phases.find(phase => phase.label.includes(name));
        modern.push({
          version,
          name,
          sameDamage: JSON.stringify(actual.totalDmgToB) === JSON.stringify(baseline.totalDmgToB),
          label: gazeRow && gazeRow.label,
          healing: actual.aLifeStealExpected,
          sum: actual.totalDmgToB.reduce((total, probability) => total + probability, 0),
        });
      }
    }

    // Non-gaze control: the same general flags remain live on an admitted ranged call.
    const version = 'com2_1.05.11';
    const rangedTarget = makeUnit(version, 'b', {
      figs: 4,
      def: 1,
      res: 5,
      hp: 10,
      unitType: 'fantastic_nature',
    });
    const rangedPlain = makeUnit(version, 'a', {
      rtb: 1,
      rtbType: 'magic',
      modernAttacks: { ranged: { strength: 1, type: 'magic' } },
    });
    const rangedRiders = makeUnit(version, 'a', {
      rtb: 1,
      rtbType: 'magic',
      modernAttacks: { ranged: { strength: 1, type: 'magic' } },
      abilities: riderAbilities,
    });
    const rangedOpts = { version, isRanged: true, wallOfFire: false, distance: 1 };
    const baseRanged = resolveCombat(rangedPlain, rangedTarget, rangedOpts);
    const richRanged = resolveCombat(rangedRiders, rangedTarget, rangedOpts);

    // DOS control: the common Stoning Touch remains merged into a gaze call.
    const dosVersion = 'mom_cp_1.60.00';
    const dosAttacker = makeUnit(dosVersion, 'a', {
      rtb: 1,
      rtbType: 'gaze_death',
      abilities: { stoningTouch: -10 },
    });
    const dosTarget = makeUnit(dosVersion, 'b', {
      def: 1,
      res: 0,
      hp: 10,
      abilities: { deathImmunity: true },
    });
    const dos = resolveCombat(dosAttacker, dosTarget,
      { version: dosVersion, isRanged: false, wallOfFire: false, distance: 1 });
    const dosGaze = dos.phases.find(phase => phase.label.includes('Gaze'));

    // F25's frozen ApplyAttack evidence skips exactly the six named riders. Dispel Evil is
    // a separate pre-existing calculator effect and must not be swept into that gate.
    const modernDispelAttacker = makeUnit(version, 'a', {
      abilities: { doomGaze: 1, dispelEvil: true },
    });
    const modernDispelTarget = makeUnit(version, 'b', {
      res: 0,
      hp: 10,
      unitType: 'fantastic_chaos',
    });
    const modernDispel = resolveCombat(modernDispelAttacker, modernDispelTarget,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
    const modernDispelGaze = modernDispel.phases.find(phase => phase.label.includes('Gaze'));

    const riderTooltips = ['stoningTouch', 'deathTouch', 'lifeSteal', 'poison', 'exorcise', 'destruction']
      .map(key => ABILITY_DEFS.find(def => def.key === key).tooltip);

    return {
      modern,
      rangedChanged: JSON.stringify(richRanged.totalDmgToB) !== JSON.stringify(baseRanged.totalDmgToB),
      rangedHealing: richRanged.aLifeStealExpected,
      dos: { label: dosGaze && dosGaze.label, killProbability: dos.totalDmgToB[10] },
      modernDispel: {
        label: modernDispelGaze && modernDispelGaze.label,
        killProbability: modernDispel.totalDmgToB[10],
      },
      tooltipsExcludeModernGaze: riderTooltips.every(tooltip =>
        tooltip.includes('never on Gaze')
          || tooltip.includes('Does not fire on Stoning, Death, or Doom Gaze')),
      tooltipsHaveNoStaleLimitation: riderTooltips.every(tooltip => !tooltip.includes('currently also')),
    };
  });

  expect(report.modern).toHaveLength(6);
  for (const row of report.modern) {
    expect(row.sameDamage, `${row.version} ${row.name} damage`).toBe(true);
    expect(row.label).toBe(`Attacker ${row.name}`);
    expect(row.healing).toBe(0);
    expect(row.sum).toBeCloseTo(1, 12);
  }
  expect(report.rangedChanged).toBe(true);
  expect(report.rangedHealing).toBeGreaterThan(0);
  expect(report.dos.label).toContain('Stoning Touch');
  expect(report.dos.killProbability).toBeCloseTo(1, 12);
  expect(report.modernDispel.label).toContain('Dispel Evil');
  expect(report.modernDispel.killProbability).toBeCloseTo(1, 12);
  expect(report.tooltipsExcludeModernGaze).toBe(true);
  expect(report.tooltipsHaveNoStaleLimitation).toBe(true);
  expectNoConsoleErrors(errors);
});

test('F26 uses independent surviving-figure Destruction attempts with capped exact PMFs', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(async () => {
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
    const version = 'com2_1.05.11';
    const one = convolveTouchAttacks([1], 40, 1, {
      poisonStr: 0,
      poisonFail: 0,
      stoningFail: 0,
      deathTouchFail: 0,
      dispelEvilFail: 0,
      exorciseFail: 0,
      destructionFail: 0.5,
      targetHP: 10,
      lifeStealMod: null,
      lifeStealRes: 0,
    }).dist;
    const four = convolveTouchAttacks([1], 40, 4, {
      poisonStr: 0,
      poisonFail: 0,
      stoningFail: 0,
      deathTouchFail: 0,
      dispelEvilFail: 0,
      exorciseFail: 0,
      destructionFail: 0.5,
      targetHP: 10,
      lifeStealMod: null,
      lifeStealRes: 0,
    }).dist;

    // Defender Stoning Gaze independently kills each of A's two figures with p=0.5.
    // Each survivor then makes one Destruction attempt with p=0.5. Per original A figure,
    // no later failure has probability 0.5 + 0.5*0.5 = 0.75, so target destruction is
    // 1-0.75^2 = 0.4375. Haste supplies a second independent ApplyAttack attempt per
    // survivor: 1-(0.5 + 0.5*0.5^2)^2 = 0.609375.
    const target = makeUnit(version, 'b', {
      figs: 4,
      def: 1,
      res: 5,
      hp: 10,
      abilities: { stoningGaze: 0 },
    });
    const attacker = haste => makeUnit(version, 'a', {
      figs: 2,
      atk: 1,
      def: 0,
      res: 5,
      hp: 10,
      abilities: { destruction: 0, ...(haste ? { haste: true } : {}) },
    });
    const opts = { version, isRanged: false, wallOfFire: false, distance: 1 };
    const survivorDependent = resolveCombat(attacker(false), target, opts);
    const hasted = resolveCombat(attacker(true), target, opts);

    const immune = destructionFailProb(5, { magicImmunity: true }, 0, version);
    const gated = {
      mom: destructionFailProb(5, {}, 0, 'mom_1.31'),
      cp: destructionFailProb(5, {}, 0, 'mom_cp_1.60.00'),
      com: destructionFailProb(5, {}, 0, 'com_6.08'),
    };

    // Production matrix workers import the same resolver. Four ranged figures give
    // P(any Destruction failure)=0.9375, hence a 0.9375 damage/HP ratio.
    const rangedAttacker = makeUnit(version, 'a', {
      figs: 4,
      rtb: 1,
      rtbType: 'magic',
      modernAttacks: { ranged: { strength: 1, type: 'magic' } },
      abilities: { destruction: 0 },
    });
    const rangedTarget = makeUnit(version, 'b', { figs: 4, def: 1, res: 5, hp: 10 });
    const rangedOpts = { version, isRanged: true, wallOfFire: false, distance: 1 };
    const mainResult = resolveCombat(rangedAttacker, rangedTarget, rangedOpts);
    const mainRatio = distExpectedValue(mainResult.totalDmgToB) / mainResult.bRemHP;
    // Same builder the matrix modal uses, so the worker under test imports exactly what the
    // app's worker imports (index.html's data-worker tags).
    const url = URL.createObjectURL(new Blob([matrixWorkerSource()], { type: 'text/javascript' }));
    const workerRatio = await new Promise((resolve, reject) => {
      const worker = new Worker(url);
      worker.onmessage = event => { worker.terminate(); resolve(event.data.ratios[0]); };
      worker.onerror = reject;
      worker.postMessage({
        attackerStats: rangedAttacker,
        allDefenderStats: [rangedTarget],
        opts: rangedOpts,
        rowIndex: 0,
      });
    });
    URL.revokeObjectURL(url);

    return {
      one: { zero: one[0], cap: one[40], sum: one.reduce((a, b) => a + b, 0), length: one.length },
      four: { zero: four[0], cap: four[40], sum: four.reduce((a, b) => a + b, 0), length: four.length },
      survivorDependent: {
        zero: survivorDependent.totalDmgToB[0],
        cap: survivorDependent.totalDmgToB[40],
        sum: survivorDependent.totalDmgToB.reduce((a, b) => a + b, 0),
      },
      hasted: {
        zero: hasted.totalDmgToB[0],
        cap: hasted.totalDmgToB[40],
        sum: hasted.totalDmgToB.reduce((a, b) => a + b, 0),
      },
      immune,
      gated,
      mainRatio,
      workerRatio,
    };
  });

  expect(report.one).toEqual({ zero: 0.5, cap: 0.5, sum: 1, length: 41 });
  expect(report.four.zero).toBeCloseTo(0.0625, 12);
  expect(report.four.cap).toBeCloseTo(0.9375, 12);
  expect(report.four.sum).toBeCloseTo(1, 12);
  expect(report.four.length).toBe(41);
  expect(report.survivorDependent.zero).toBeCloseTo(0.5625, 12);
  expect(report.survivorDependent.cap).toBeCloseTo(0.4375, 12);
  expect(report.survivorDependent.sum).toBeCloseTo(1, 12);
  expect(report.hasted.zero).toBeCloseTo(0.390625, 12);
  expect(report.hasted.cap).toBeCloseTo(0.609375, 12);
  expect(report.hasted.sum).toBeCloseTo(1, 12);
  expect(report.immune).toBe(0);
  expect(report.gated).toEqual({ mom: 0, cp: 0, com: 0 });
  expect(report.mainRatio).toBeCloseTo(0.9375, 12);
  expect(report.workerRatio).toBeCloseTo(report.mainRatio, 12);
  expectNoConsoleErrors(errors);
});
