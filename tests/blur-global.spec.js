const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('Blur stays on both cards in every version and retired global controls are gone', async ({ page }) => {
  const errors = await openCalculator(page);

  for (const version of [
    'mom_1.31',
    'mom_cp_1.60.00',
    'com_6.08',
    'com2_1.05.11',
    'com2_warlord_1.5.12.9',
  ]) {
    await setValue(page, 'gameVersion', version);
    await expect(page.locator('#aAbil_blur')).toBeEnabled();
    await expect(page.locator('#bAbil_blur')).toBeEnabled();
    expect(await page.evaluate(() => matrixPropertyCandidates('a').map(row => row.label)))
      .toContain('Blur');
    expect(await page.evaluate(() => matrixPropertyCandidates('b').map(row => row.label)))
      .toContain('Blur');
  }

  for (const retiredId of [
    'modernBlurControls',
    'combatTurnSide',
    'combatAttackerBlur',
    'combatDefenderBlur',
  ]) {
    await expect(page.locator('#' + retiredId)).toHaveCount(0);
  }

  expectNoConsoleErrors(errors);
});

test('modern uses tactical defender Card B Blur for both directions; DOS uses each target card', async ({ page }) => {
  const errors = await openCalculator(page);

  const result = await page.evaluate(() => {
    applyPreset('blurCoM2CounterOwnSide');
    const baseA = readUnitStats('a');
    const baseB = readUnitStats('b');
    const unit = (base, blur) => ({ ...base, abilities: { ...base.abilities, blur } });
    const ev = dist => dist.reduce((sum, p, damage) => sum + p * damage, 0);
    const means = (version, aBlur, bBlur) => {
      const resolved = resolveCombat(unit(baseA, aBlur), unit(baseB, bBlur), {
        isRanged: false,
        version,
      });
      return [ev(resolved.totalDmgToA), ev(resolved.totalDmgToB)];
    };
    return {
      modernOnlyA: means('com2_1.05.11', true, false),
      modernOnlyB: means('com2_1.05.11', false, true),
      warlordOnlyB: means('com2_warlord_1.5.12.9', false, true),
      dosOnlyA: means('com_6.08', true, false),
      dosOnlyB: means('com_6.08', false, true),
      hiddenOptions: (() => {
        const base = resolveCombat(unit(baseA, false), unit(baseB, false), {
          isRanged: false,
          version: 'com2_1.05.11',
        });
        const retired = resolveCombat(unit(baseA, false), unit(baseB, false), {
          isRanged: false,
          version: 'com2_1.05.11',
          combatTurnSide: 'attacker',
          combatAttackerBlur: true,
          combatDefenderBlur: true,
        });
        return [ev(base.totalDmgToA), ev(base.totalDmgToB),
          ev(retired.totalDmgToA), ev(retired.totalDmgToB)];
      })(),
    };
  });

  expect(result.modernOnlyA).toEqual([10, 10]);
  expect(result.modernOnlyB).toEqual([8, 8]);
  expect(result.warlordOnlyB).toEqual([8, 8]);
  expect(result.dosOnlyA).toEqual([8, 10]);
  expect(result.dosOnlyB).toEqual([10, 8]);
  expect(result.hiddenOptions.slice(2)).toEqual(result.hiddenOptions.slice(0, 2));

  expectNoConsoleErrors(errors);
});

test('card Blur persists, swaps naturally, and migrates retired page and matrix state', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
  await setValue(page, 'aAbil_blur', true);
  await setValue(page, 'bAbil_blur', false);

  const state = await page.evaluate(() => collectState());
  expect(state.ids.aAbil_blur).toBe(true);
  expect(state.ids).not.toHaveProperty('combatTurnSide');
  expect(state.ids).not.toHaveProperty('combatAttackerBlur');
  expect(state.ids).not.toHaveProperty('combatDefenderBlur');

  await page.click('#swapBtn');
  await expect(page.locator('#aAbil_blur')).not.toBeChecked();
  await expect(page.locator('#bAbil_blur')).toBeChecked();

  const migratedPage = await page.evaluate(() => {
    const attackerInitiates = migrateRetiredControlIds({
      gameVersion: 'com2_1.05.11',
      aAbil_blur: false,
      bAbil_blur: false,
      combatTurnSide: 'attacker',
      combatAttackerBlur: true,
      combatDefenderBlur: false,
    });
    const defenderInitiates = migrateRetiredControlIds({
      gameVersion: 'com2_1.05.11',
      combatTurnSide: 'defender',
      combatAttackerBlur: true,
      combatDefenderBlur: false,
    });
    const fallbackVersion = migrateRetiredControlIds({
      aAbil_blur: false,
      bAbil_blur: false,
      combatTurnSide: 'defender',
      combatAttackerBlur: true,
      combatDefenderBlur: false,
    }, 'com2_warlord_1.5.12.9');
    localStorage.setItem(GAME_VERSION_STORAGE_KEY, 'com2_warlord_1.5.12.9');
    applyState({
      v: 1,
      ids: {
        aAbil_blur: false,
        bAbil_blur: false,
        combatTurnSide: 'defender',
        combatAttackerBlur: true,
        combatDefenderBlur: false,
      },
    });
    const restoredFallbackBlob = {
      version: document.getElementById('gameVersion').value,
      a: document.getElementById('aAbil_blur').checked,
      b: document.getElementById('bAbil_blur').checked,
    };
    return { attackerInitiates, defenderInitiates, fallbackVersion, restoredFallbackBlob };
  });
  expect(migratedPage.attackerInitiates).toMatchObject({ aAbil_blur: true, bAbil_blur: false });
  expect(migratedPage.defenderInitiates).toMatchObject({ aAbil_blur: false, bAbil_blur: true });
  expect(migratedPage.fallbackVersion).toMatchObject({ aAbil_blur: false, bAbil_blur: true });
  expect(migratedPage.restoredFallbackBlob).toEqual({
    version: 'com2_warlord_1.5.12.9',
    a: false,
    b: true,
  });
  for (const ids of Object.values(migratedPage)) {
    expect(ids).not.toHaveProperty('combatTurnSide');
    expect(ids).not.toHaveProperty('combatAttackerBlur');
    expect(ids).not.toHaveProperty('combatDefenderBlur');
  }

  const migratedMatrix = await page.evaluate(() => {
    localStorage.setItem(MATRIX_STATE_KEY, JSON.stringify({
      a: [],
      b: [],
      global: [
        { key: 'combatTurnSide', enabled: true, value: 'defender' },
        { key: 'combatAttackerBlur', enabled: true, value: true },
        { key: 'combatDefenderBlur', enabled: true, value: false },
      ],
    }));
    const loaded = loadMatrixPropertyStateFromStorage();
    matrixPropertyState = loaded;
    return {
      a: loaded.a,
      b: loaded.b,
      global: loaded.global,
      appliedA: matrixAppliedEnchantments('a'),
      appliedB: matrixAppliedEnchantments('b'),
    };
  });
  expect(migratedMatrix.a).not.toContainEqual(expect.objectContaining({ key: 'blur' }));
  expect(migratedMatrix.b).toContainEqual({ key: 'blur', enabled: true, value: true });
  expect(migratedMatrix.global.map(row => row.key)).not.toEqual(expect.arrayContaining([
    'combatTurnSide', 'combatAttackerBlur', 'combatDefenderBlur',
  ]));
  expect(migratedMatrix.appliedA.blur).toBeUndefined();
  expect(migratedMatrix.appliedB.blur).toBe(true);

  expectNoConsoleErrors(errors);
});
