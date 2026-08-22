const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F30 repeats each initiating modern gaze under Haste and leaves retaliation single', async ({ page }) => {
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
      res: 5,
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
    const opts = version => ({
      version, isRanged: false, wallOfFire: false, distance: 1,
    });
    const countLabel = (result, label) => (result.phases || [])
      .filter(phase => phase.label === label).length;

    const modern = ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => {
      const target = makeUnit(version, 'b');
      const gazeResult = gaze => resolveCombat(makeUnit(version, 'a', {
        abilities: { haste: true, ...gaze },
      }), target, opts(version));
      const stoning = gazeResult({ stoningGaze: 0 });
      const death = gazeResult({ deathGaze: 0 });
      const doom = gazeResult({ doomGaze: 1 });

      const retaliation = resolveCombat(makeUnit(version, 'a', { atk: 1 }),
        makeUnit(version, 'b', {
          abilities: { haste: true, doomGaze: 1 },
        }), opts(version));

      const ordered = resolveCombat(makeUnit(version, 'a', {
        abilities: {
          haste: true, stoningGaze: 10, deathGaze: 10, doomGaze: 1,
        },
      }), makeUnit(version, 'b', {
        abilities: { stoningGaze: 10, deathGaze: 10, doomGaze: 1 },
      }), opts(version));

      return {
        version,
        stoning: {
          zero: stoning.totalDmgToB[0],
          cap: stoning.totalDmgToB[10],
          phases: countLabel(stoning, 'Attacker Stoning Gaze'),
        },
        death: {
          zero: death.totalDmgToB[0],
          cap: death.totalDmgToB[10],
          phases: countLabel(death, 'Attacker Death Gaze'),
        },
        doom: {
          damage2: doom.totalDmgToB[2],
          phases: countLabel(doom, 'Attacker Doom Gaze'),
        },
        retaliation: {
          damage1: retaliation.totalDmgToA[1],
          phases: countLabel(retaliation, 'Defender Doom Gaze'),
        },
        labels: ordered.phases.map(phase => phase.label),
      };
    });
    const dos = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => {
      const result = resolveCombat(makeUnit(version, 'a', {
        atk: 1,
        rtb: 1,
        rtbType: 'gaze_multiple',
        abilities: { haste: true },
      }), makeUnit(version, 'b'), opts(version));
      return {
        version,
        phases: (result.phases || []).filter(phase =>
          phase.label.startsWith('Attacker') && phase.label.includes('Gaze')).length,
      };
    });
    return { modern, dos };
  });

  const expectedOpening = [
    'Attacker Stoning Gaze', 'Attacker Stoning Gaze',
    'Attacker Death Gaze', 'Attacker Death Gaze',
    'Attacker Doom Gaze', 'Attacker Doom Gaze',
    'Defender Stoning Gaze', 'Defender Death Gaze', 'Defender Doom Gaze',
  ];
  for (const result of report.modern) {
    expect(result.stoning.phases, result.version).toBe(2);
    expect(result.stoning.zero, result.version).toBeCloseTo(0.25, 12);
    expect(result.stoning.cap, result.version).toBeCloseTo(0.75, 12);
    expect(result.death.phases, result.version).toBe(2);
    expect(result.death.zero, result.version).toBeCloseTo(0.25, 12);
    expect(result.death.cap, result.version).toBeCloseTo(0.75, 12);
    expect(result.doom.phases, result.version).toBe(2);
    expect(result.doom.damage2, result.version).toBeCloseTo(1, 12);
    expect(result.retaliation.phases, result.version).toBe(1);
    expect(result.retaliation.damage1, result.version).toBeCloseTo(1, 12);
    expect(result.labels.slice(0, expectedOpening.length), result.version)
      .toEqual(expectedOpening);
  }
  for (const result of report.dos) {
    expect(result.phases, result.version).toBe(1);
  }
  expectNoConsoleErrors(errors);
});

test('F31 samples Cause Fear independently for both modern Hasted melee calls', async ({ page }) => {
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
      res: 8,
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
    const run = (version, firstStrike, res = 8) => resolveCombat(makeUnit(version, 'a', {
      figs: 2,
      atk: 1,
      res,
      abilities: { haste: true, ...(firstStrike ? { firstStrike: true } : {}) },
    }), makeUnit(version, 'b', {
      hp: 10,
      abilities: { fear: true },
    }), { version, isRanged: false, wallOfFire: false, distance: 1 });

    return {
      modern: ['com2_1.05.11', 'com2_warlord_1.5.12.7'].flatMap(version =>
        [false, true].map(firstStrike => ({
          version,
          firstStrike,
          dist: run(version, firstStrike).totalDmgToB.slice(0, 5),
        }))),
      dos: {
        mom: run('mom_1.31', false, 5).totalDmgToB.slice(0, 5),
        cp: run('mom_cp_1.60.00', false, 5).totalDmgToB.slice(0, 5),
        com: run('com_6.08', false).totalDmgToB.slice(0, 5),
      },
    };
  });

  const independent = [0.0625, 0.25, 0.375, 0.25, 0.0625];
  for (const result of report.modern) {
    expect(result.dist, `${result.version} firstStrike=${result.firstStrike}`)
      .toHaveLength(independent.length);
    independent.forEach((probability, damage) => {
      expect(result.dist[damage],
        `${result.version} firstStrike=${result.firstStrike} damage=${damage}`)
        .toBeCloseTo(probability, 12);
    });
  }

  // CoM 6.08 retains the established one-sample Haste model: both strikes use the
  // same active-figure count, so odd total damage remains impossible.
  for (const version of ['cp', 'com']) {
    expect(report.dos[version][0]).toBeCloseTo(0.25, 12);
    expect(report.dos[version][1] || 0).toBeCloseTo(0, 12);
    expect(report.dos[version][2]).toBeCloseTo(0.5, 12);
    expect(report.dos[version][3] || 0).toBeCloseTo(0, 12);
    expect(report.dos[version][4]).toBeCloseTo(0.25, 12);
  }
  // MoM 1.31's defender Cause Fear bug still silences the roll entirely.
  expect(report.dos.mom[4]).toBeCloseTo(1, 12);
  expectNoConsoleErrors(errors);
});

test('F31 keeps modern Haste healing correlated while melee damage remains pending', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const version = 'com2_warlord_1.5.12.7';
    const makeUnit = (prefix, overrides = {}) => deriveUnitStats({
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
      res: 10,
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
    return [false, true].map(firstStrike => {
      const result = resolveCombat(makeUnit('a', {
        atk: 1,
        dmg: 9,
        abilities: {
          haste: true,
          bloodSucker: true,
          ...(firstStrike ? { firstStrike: true } : {}),
        },
      }), makeUnit('b', {
        atk: 3,
        hp: 100,
      }), { version, isRanged: false, wallOfFire: false, distance: 1 });
      return {
        firstStrike,
        damageToAttacker: result.totalDmgToA,
        attackerBenefit: result.aLifeStealExpected,
      };
    });
  });

  // Both positive initiating ApplyAttack calls heal 2 before the counter is computed.
  // The counter therefore sees five current HP and deals all three deterministic damage,
  // even though the initiating unit began the exchange with only one current HP.
  for (const result of report) {
    expect(result.damageToAttacker[3], `firstStrike=${result.firstStrike}`)
      .toBeCloseTo(1, 12);
    expect(result.attackerBenefit, `firstStrike=${result.firstStrike}`)
      .toBeCloseTo(4, 12);
  }
  expectNoConsoleErrors(errors);
});

test('F31 keeps the defender snapshot frozen across pending Hasted melee calls', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const version = 'com2_warlord_1.5.12.7';
    const makeUnit = (prefix, overrides = {}) => deriveUnitStats({
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
      res: 8,
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
    const run = ({ firstStrike = false, fear = false } = {}) => {
      const result = resolveCombat(makeUnit('a', {
        atk: 1,
        dmg: 9,
        abilities: {
          haste: true,
          bloodSucker: true,
          ...(firstStrike ? { firstStrike: true } : {}),
        },
      }), makeUnit('b', {
        hp: 1,
        abilities: fear ? { fear: true } : {},
      }), { version, isRanged: false, wallOfFire: false, distance: 1 });
      return {
        benefit: result.aLifeStealExpected,
        benefitDist: result.aAppliedHealingBenefitDist,
      };
    };
    return {
      pendingPair: run(),
      independentFear: run({ fear: true }),
      dealtFirstStrike: run({ firstStrike: true }),
    };
  });

  // Without First Strike, both ApplyAttack calls see the live one-HP defender before
  // either pending result is dealt, so both positive results trigger Bloodsucker.
  expect(report.pendingPair.benefit).toBeCloseTo(4, 12);

  // Each independent 50% Cause Fear sample can admit a Bloodsucker trigger. Pending
  // first-call damage must not suppress the two-success (four healing) outcome.
  expect(report.independentFear.benefitDist[0]).toBeCloseTo(0.25, 12);
  expect(report.independentFear.benefitDist[2]).toBeCloseTo(0.5, 12);
  expect(report.independentFear.benefitDist[4]).toBeCloseTo(0.25, 12);

  // Admitted First Strike is dealt immediately, so its one damage kills this defender
  // before the Haste call and only the First Strike Bloodsucker trigger remains.
  expect(report.dealtFirstStrike.benefit).toBeCloseTo(2, 12);
  expectNoConsoleErrors(errors);
});

test('F58 shows one Cause Fear distribution for every modern melee ApplyAttack call', async ({ page }) => {
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
      figs: 2,
      atk: 1,
      rtb: 0,
      modernAttacks: {},
      def: 0,
      res: 8,
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
    const run = (version, firstStrike, haste = true) => resolveCombat(makeUnit(version, 'a', {
      abilities: {
        fear: true,
        ...(haste ? { haste: true } : {}),
        ...(firstStrike ? { firstStrike: true } : {}),
      },
    }), makeUnit(version, 'b', {
      abilities: { fear: true },
    }), { version, isRanged: false, wallOfFire: false, distance: 1 });
    const fearRows = result => (result.phases || [])
      .filter(phase => phase.mode === 'feared')
      .map(phase => ({ label: phase.label, atkDist: phase.atkDist, defDist: phase.defDist }));
    const uiResult = run('com2_warlord_1.5.12.7', false);
    renderBreakdownGrid(uiResult.phases);
    const uiRows = [...document.querySelectorAll('#breakdownGrid .breakdown-phase-row')]
      .filter(row => row.querySelector('.breakdown-phase-label').textContent.includes('Cause Fear'))
      .map(row => ({
        label: row.querySelector('.breakdown-phase-label').textContent,
        headers: [...row.querySelectorAll('.dist-header')].map(header => header.textContent),
        columns: [...row.querySelectorAll('thead th:first-child')].map(header => header.textContent),
      }));
    return {
      modern: ['com2_1.05.11', 'com2_warlord_1.5.12.7'].flatMap(version =>
        [false, true].flatMap(firstStrike => [false, true].map(haste => ({
          version, firstStrike, haste,
          rows: fearRows(run(version, firstStrike, haste)),
        })))),
      dos: ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => ({
        version,
        rows: fearRows(run(version, false)),
      })),
      uiRows,
    };
  });

  const fiftyPercentTwoFigures = [0.25, 0.5, 0.25];
  for (const result of report.modern) {
    const firstLabel = result.firstStrike ? 'First Strike Cause Fear' : 'Main Cause Fear';
    expect(result.rows.map(row => row.label), result.version).toEqual(result.haste
      ? [firstLabel, 'Haste Cause Fear', 'Counter Cause Fear']
      : [firstLabel, 'Counter Cause Fear']);
    expect(result.rows[0].atkDist, result.version).toEqual(fiftyPercentTwoFigures);
    expect(result.rows[0].defDist, result.version).toEqual([1]);
    const counterIndex = result.haste ? 2 : 1;
    if (result.haste) {
      expect(result.rows[1].atkDist, result.version).toEqual(fiftyPercentTwoFigures);
      expect(result.rows[1].defDist, result.version).toEqual([1]);
    }
    expect(result.rows[counterIndex].atkDist, result.version).toEqual([1]);
    expect(result.rows[counterIndex].defDist, result.version).toEqual(fiftyPercentTwoFigures);
  }

  // The older engines retain their established single shared row/sample in the
  // simultaneous non-First-Strike exchange, including MoM 1.31's bug presentation.
  for (const result of report.dos) expect(result.rows, result.version).toHaveLength(1);
  expect(report.uiRows.map(row => row.label)).toEqual([
    'Main Cause Fear', 'Haste Cause Fear', 'Counter Cause Fear',
  ]);
  for (const row of report.uiRows) {
    expect(row.headers[0]).toContain('Attacker figs feared');
    expect(row.headers[1]).toContain('Defender figs feared');
    expect(row.columns).toEqual(['Feared', 'Feared']);
  }
  expectNoConsoleErrors(errors);
});

test('F58 preserves exact modern fear PMFs through dead targets, Black Sleep, and healing', async ({ page }) => {
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
      figs: 2,
      atk: 1,
      rtb: 0,
      modernAttacks: {},
      def: 0,
      res: 8,
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
    const fearRows = result => (result.phases || [])
      .filter(phase => phase.mode === 'feared')
      .map(phase => ({ label: phase.label, atkDist: phase.atkDist, defDist: phase.defDist }));
    const run = (version, a, b) => fearRows(resolveCombat(
      makeUnit(version, 'a', a), makeUnit(version, 'b', b),
      { version, isRanged: false, wallOfFire: false, distance: 1 },
    ));
    const version = 'com2_warlord_1.5.12.7';
    return {
      // Two Hasted Doom Gazes kill B before the selected main/Haste/counter calls.
      deadTarget: run(version,
        { abilities: { haste: true, doomGaze: 10 } },
        { abilities: { fear: true } }),
      // B's retaliation Doom Gaze kills A. The later counter call still has a
      // living source and therefore still samples A's Cause Fear.
      deadSource: run(version,
        { abilities: { haste: true, fear: true } },
        { abilities: { doomGaze: 20 } }),
      blackSleep: run(version,
        { abilities: { haste: true, blackSleep: true } },
        { abilities: { fear: true } }),
      healing: [false, true].map(firstStrike => run(version,
        {
          dmg: 11,
          abilities: {
            haste: true,
            bloodSucker: true,
            ...(firstStrike ? { firstStrike: true } : {}),
          },
        },
        { hp: 100, abilities: { fear: true } })),
    };
  });

  const twoFigures = [0.25, 0.5, 0.25];
  expect(report.deadTarget.map(row => row.label)).toEqual([
    'Main Cause Fear', 'Haste Cause Fear', 'Counter Cause Fear',
  ]);
  expect(report.deadTarget[0].atkDist).toEqual(twoFigures);
  expect(report.deadTarget[1].atkDist).toEqual(twoFigures);
  expect(report.deadTarget[2].defDist).toEqual([1]);

  expect(report.deadSource[0].atkDist).toEqual([1]);
  expect(report.deadSource[1].atkDist).toEqual([1]);
  expect(report.deadSource[2].defDist).toEqual(twoFigures);
  for (const row of report.blackSleep) {
    expect(row.atkDist).toEqual([1]);
    expect(row.defDist).toEqual([1]);
  }

  // A begins with one living figure. An unfeared first call triggers Bloodsucker
  // and restores the second figure before the Haste call; a feared call does not.
  // The Haste PMF is therefore 50% Binomial(1, .5) + 50% Binomial(2, .5).
  const healedHaste = [0.375, 0.5, 0.125];
  for (const rows of report.healing) {
    expect(rows[0].atkDist[0]).toBeCloseTo(0.5, 12);
    expect(rows[0].atkDist[1]).toBeCloseTo(0.5, 12);
    expect(rows[0].atkDist[2] || 0).toBeCloseTo(0, 12);
    for (let feared = 0; feared < healedHaste.length; feared++) {
      expect(rows[1].atkDist[feared]).toBeCloseTo(healedHaste[feared], 12);
    }
  }

  for (const rows of Object.values(report)) {
    for (const row of rows.flat()) {
      expect(row.atkDist.reduce((sum, p) => sum + p, 0), row.label).toBeCloseTo(1, 12);
      expect(row.defDist.reduce((sum, p) => sum + p, 0), row.label).toBeCloseTo(1, 12);
    }
  }
  expectNoConsoleErrors(errors);
});
