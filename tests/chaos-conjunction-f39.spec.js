const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('F39 scales every modern Immolation firing from strength 10 to 13 exactly once', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const trim = dist => {
      const out = dist.slice();
      while (out.length > 1 && Math.abs(out[out.length - 1] || 0) < 1e-15) out.pop();
      return out;
    };
    const shifted = (dist, amount) => trim([
      ...new Array(amount).fill(0),
      ...dist,
    ]);
    const convolve = (a, b) => {
      const out = new Array(a.length + b.length - 1).fill(0);
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
      }
      return trim(out);
    };
    const makeUnit = (version, prefix, abilities = {}) => deriveUnitStats({
      prefix,
      version,
      abilities,
      level: 'normal', weapon: 'normal', armor: 'none', rtbType: 'none',
      unitType: 'normal', figs: 1, atk: 1, rtb: 0, modernAttacks: {},
      def: 0, res: 10, hp: 100, dmg: 0,
      toHitMod: 70, toHitRtbMod: 70, toBlkMod: -30,
      cityWalls: 'none', nodeAura: 'none', trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1,
    });
    const run = (version, aAbilities, bAbilities, active) => resolveCombat(
      makeUnit(version, 'a', aAbilities),
      makeUnit(version, 'b', bAbilities),
      { version, isRanged: false, wallOfFire: false, chaosConjunction: active },
    );
    const modern = ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => {
      const inactive = run(version, { immolation: true }, {}, false);
      const active = run(version, { immolation: true }, {}, true);
      const reverse = run(version, {}, { immolation: true }, true);
      const hasted = run(version, { immolation: true, haste: true }, {}, true);
      const inactiveImmolation = binomialPMF(10, 0.3);
      const activeImmolation = binomialPMF(13, 0.3);
      return {
        version,
        strengths: [immolationStr(version, false), immolationStr(version, true)],
        inactive: trim(inactive.totalDmgToB),
        active: trim(active.totalDmgToB),
        reverse: trim(reverse.totalDmgToA),
        hasted: trim(hasted.totalDmgToB),
        expectations: {
          inactive: distExpectedValue(inactive.totalDmgToB),
          active: distExpectedValue(active.totalDmgToB),
          reverse: distExpectedValue(reverse.totalDmgToA),
          hasted: distExpectedValue(hasted.totalDmgToB),
        },
        inactiveExpected: shifted(inactiveImmolation, 1),
        activeExpected: shifted(activeImmolation, 1),
        hastedExpected: shifted(convolve(activeImmolation, activeImmolation), 2),
      };
    });
    const legacy = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => {
      const inactive = run(version, { immolation: true }, {}, false);
      const active = run(version, { immolation: true }, {}, true);
      return {
        version,
        strengths: [immolationStr(version, false), immolationStr(version, true)],
        inactive: trim(inactive.totalDmgToB),
        active: trim(active.totalDmgToB),
      };
    });
    return { modern, legacy };
  });

  for (const row of report.modern) {
    expect(row.strengths).toEqual([10, 13]);
    expect(row.inactive).toEqual(row.inactiveExpected);
    expect(row.active).toEqual(row.activeExpected);
    expect(row.reverse).toEqual(row.activeExpected);
    expect(row.hasted).toEqual(row.hastedExpected);
    expect(row.expectations.inactive).toBeCloseTo(4, 12);
    expect(row.expectations.active).toBeCloseTo(4.9, 12);
    expect(row.expectations.reverse).toBeCloseTo(4.9, 12);
    expect(row.expectations.hasted).toBeCloseTo(9.8, 12);
    expect(row.active).not.toEqual(row.inactive);
  }
  for (const row of report.legacy) {
    expect(row.strengths).toEqual([row.version === 'com_6.08' ? 10 : 4,
      row.version === 'com_6.08' ? 10 : 4]);
    expect(row.active).toEqual(row.inactive);
  }
  expectNoConsoleErrors(errors);
});

test('F39 leaves Wall of Fire unchanged and keeps DOS state hidden and inert', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const trim = dist => {
      const out = dist.slice();
      while (out.length > 1 && Math.abs(out[out.length - 1] || 0) < 1e-15) out.pop();
      return out;
    };
    const convolve = (a, b) => {
      const out = new Array(a.length + b.length - 1).fill(0);
      for (let i = 0; i < a.length; i++) {
        for (let j = 0; j < b.length; j++) out[i + j] += a[i] * b[j];
      }
      return trim(out);
    };
    const repeat = (dist, count) => {
      let out = [1];
      for (let i = 0; i < count; i++) out = convolve(out, dist);
      return out;
    };
    const cappedAt = (dist, cap) => {
      const out = new Array(cap + 1).fill(0);
      for (let damage = 0; damage < dist.length; damage++) {
        out[Math.min(damage, cap)] += dist[damage] || 0;
      }
      return trim(out);
    };
    const makeUnit = (version, prefix) => deriveUnitStats({
      prefix, version, abilities: {}, level: 'normal', weapon: 'normal', armor: 'none',
      rtbType: 'none', unitType: 'normal', figs: 3, atk: prefix === 'a' ? 1 : 0,
      rtb: 0, modernAttacks: {}, def: 0, res: 10, hp: 5, dmg: 0,
      toHitMod: 70, toHitRtbMod: 70, toBlkMod: -30,
      cityWalls: 'none', nodeAura: 'none', trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1,
    });
    const runWall = (version, active) => resolveCombat(
      makeUnit(version, 'a'), makeUnit(version, 'b'), {
        version, isRanged: false, wallOfFire: true, chaosConjunction: active,
      },
    ).totalDmgToA;
    return ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => {
      const inactive = trim(runWall(version, false));
      const active = trim(runWall(version, true));
      const expected = version === 'com2_1.05.11'
        ? repeat(cappedAt(binomialPMF(10, 0.3), 5), 3)
        : trim(binomialPMF(12, 0.6));
      return {
        version,
        strength: wallOfFireStr(version),
        toHit: wallOfFireToHit(version),
        singleFigure: wallOfFireSingleFigure(version),
        inactive,
        active,
        expected,
        expectation: distExpectedValue(inactive),
        expectedExpectation: distExpectedValue(expected),
      };
    });
  });
  for (const row of report) {
    expect(row.active).toEqual(row.inactive);
    expect(row.inactive).toHaveLength(row.expected.length);
    for (let damage = 0; damage < row.expected.length; damage++) {
      expect(row.inactive[damage] || 0).toBeCloseTo(row.expected[damage] || 0, 12);
    }
    expect(row.expectation).toBeCloseTo(row.expectedExpectation, 12);
    if (row.version === 'com2_1.05.11') {
      expect(row).toMatchObject({ strength: 10, toHit: 0.3, singleFigure: false });
    } else {
      expect(row).toMatchObject({ strength: 12, toHit: 0.6, singleFigure: true });
      expect(row.expectation).toBeCloseTo(7.2, 12);
    }
  }

  await expect(page.locator('#chaosConjunction').locator('xpath=..')).toHaveAttribute(
    'data-tooltip', /Versions: CoM 2 1\.05\.11 & Warlord 1\.5\.12\.7/,
  );
  await expect(page.locator('#chaosConjunction').locator('xpath=..')).toHaveAttribute(
    'data-tooltip', /Immolation only: ×1\.34, then truncation \(strength 10→13\)\./,
  );
  await expect(page.locator('#chaosConjunction').locator('xpath=..')).toHaveAttribute(
    'data-tooltip', /Does not affect Wall of Fire\./,
  );

  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    await setValue(page, 'gameVersion', version);
    const state = await page.evaluate(() => {
      const el = document.getElementById('chaosConjunction');
      el.checked = true;
      updateGlobalEnchantmentVisibility(document.getElementById('gameVersion').value);
      return {
        checked: el.checked,
        hidden: el.closest('.check-label').classList.contains('version-hidden'),
        matrixCandidate: matrixPropertyCandidates('global')
          .some(row => row.key === 'chaosConjunction'),
      };
    });
    expect(state).toEqual({ checked: false, hidden: true, matrixCandidate: false });
  }
  expectNoConsoleErrors(errors);
});

test('F39 combat-global state persists and shares, survives Swap, and crosses the matrix worker boundary', async ({ page, context }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await setValue(page, 'chaosConjunction', true);

  const report = await page.evaluate(async () => {
    const saved = collectState();
    const encoded = lzEncode(JSON.stringify(saved));
    document.getElementById('chaosConjunction').checked = false;
    applyState(JSON.parse(lzDecode(encoded)));
    const restored = document.getElementById('chaosConjunction').checked;
    document.getElementById('swapBtn').click();
    const afterSwap = document.getElementById('chaosConjunction').checked;

    matrixPropertyState = {
      a: [], b: [],
      global: [{ key: 'chaosConjunction', enabled: true, value: true }],
      _seeded: true,
    };
    const opts = matrixCombatOptions('melee');
    const makeUnit = (prefix, abilities = {}) => deriveUnitStats({
      prefix, version: opts.version, abilities,
      level: 'normal', weapon: 'normal', armor: 'none', rtbType: 'none',
      unitType: 'normal', figs: 1, atk: 1, rtb: 0, modernAttacks: {},
      def: 0, res: 10, hp: 100, dmg: 0,
      toHitMod: 70, toHitRtbMod: 70, toBlkMod: -30,
      cityWalls: 'none', nodeAura: 'none', trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1,
    });
    const attacker = makeUnit('a', { immolation: true });
    const defender = makeUnit('b');
    const direct = resolveCombat(attacker, defender, opts);
    const directRatio = distExpectedValue(direct.totalDmgToB) / direct.bRemHP
      / (distExpectedValue(direct.totalDmgToA) / direct.aRemHP);
    const inactive = resolveCombat(attacker, defender, { ...opts, chaosConjunction: false });
    const inactiveRatio = distExpectedValue(inactive.totalDmgToB) / inactive.bRemHP
      / (distExpectedValue(inactive.totalDmgToA) / inactive.aRemHP);

    const scriptAbsUrl = name => [...document.querySelectorAll('script[src]')]
      .find(script => script.src.endsWith(name)).src;
    const source = `importScripts(${JSON.stringify(scriptAbsUrl('engine.js'))}, ${JSON.stringify(scriptAbsUrl('steps.js'))}, ${JSON.stringify(scriptAbsUrl('combat.js'))});\n${MATRIX_WORKER_HANDLER}`;
    const url = URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
    const workerRatio = await new Promise((resolve, reject) => {
      const worker = new Worker(url);
      worker.onmessage = event => { worker.terminate(); resolve(event.data.ratios[0]); };
      worker.onerror = reject;
      worker.postMessage({ attackerStats: attacker, allDefenderStats: [defender], opts, rowIndex: 0 });
    });
    URL.revokeObjectURL(url);
    return {
      saved, encoded, restored, afterSwap, opts,
      directRatio, inactiveRatio, workerRatio,
    };
  });

  expect(report.saved.ids.chaosConjunction).toBe(true);
  expect(report.restored).toBe(true);
  expect(report.afterSwap).toBe(true);
  expect(report.opts).toMatchObject({
    version: 'com2_1.05.11', isRanged: false,
    wallOfFire: false, chaosConjunction: true,
  });
  expect(report.directRatio).not.toBeCloseTo(report.inactiveRatio, 12);
  expect(report.workerRatio).toBeCloseTo(report.directRatio, 12);

  const sharedPage = await context.newPage();
  const sharedErrors = await openCalculator(sharedPage, '/#s=' + report.encoded);
  await expect(sharedPage.locator('#gameVersion')).toHaveValue('com2_1.05.11');
  await expect(sharedPage.locator('#chaosConjunction')).toBeChecked();
  expect(await sharedPage.evaluate(() => location.hash)).toBe('');
  expectNoConsoleErrors(sharedErrors);
  await sharedPage.close();
  expectNoConsoleErrors(errors);
});
