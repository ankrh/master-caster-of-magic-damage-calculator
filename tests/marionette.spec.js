const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('Wanderer Channeler package derives through UI and share state', async ({ page, context }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.7');
  await setValue(page, 'aUnit', '362');
  await setValue(page, 'aAbil_channeler', true);
  await setValue(page, 'aAbil_marionetteBaseSkill', '90');
  await setValue(page, 'aAbil_marionettePrimary', 'death');
  await setValue(page, 'aAbil_marionetteDeathBooks', '5');
  await setValue(page, 'aAbil_marionetteAscension', true);
  await setValue(page, 'aAbil_xenoveterinary', true);
  await setValue(page, 'aAbil_outlanderWizard', true);

  const report = await page.evaluate(() => {
    const stats = readUnitStats('a');
    return {
      identity: stats.identity,
      atk: stats.atk,
      def: stats.def,
      hp: stats.hp,
      ranged: stats.modernAttacks.ranged,
      package: stats.marionette,
      xenoveterinary: stats.abilities.outlanderXenoveterinary,
      lifeSteal: stats.abilities.lifeSteal,
      state: collectState(),
    };
  });
  expect(report.identity).toMatchObject({ heroTypeId: 48, fantastic: true });
  expect(report.atk).toBe(8);
  expect(report.def).toBe(6);
  expect(report.hp).toBe(15);
  expect(report.ranged).toMatchObject({ strength: 3, type: 'magic_c' });
  expect(report.package).toMatchObject({
    state: 'owned', primary: 'death', spell: 'Syphon Life', charges: 2,
    attackBonus: 3, defenseBonus: 1,
  });
  expect(report.xenoveterinary).toBe(true);
  expect(report.lifeSteal).toBe(-1);

  const shareUrl = await page.evaluate(
    () => '/#s=' + LZString.compressToEncodedURIComponent(JSON.stringify(collectState())));
  const restored = await context.newPage();
  const restoredErrors = await openCalculator(restored, shareUrl);
  expect(await restored.evaluate(() => collectState())).toEqual(report.state);
  await expect(restored.locator('#aUnit')).toHaveValue('362');
  await expect(restored.locator('#aAbil_channeler')).toBeChecked();
  await expect(restored.locator('#aAbil_marionetteBaseSkill')).toHaveValue('90');
  await expect(restored.locator('#aAbil_marionettePrimary')).toHaveValue('death');
  await expect(restored.locator('#aAbil_marionetteDeathBooks')).toHaveValue('5');
  await expect(restored.locator('#aAbil_marionetteAscension')).toBeChecked();

  expectNoConsoleErrors(errors);
  expectNoConsoleErrors(restoredErrors);
});

test('Marionette controls are exact-version gated', async ({ page }) => {
  const errors = await openCalculator(page);
  const ids = [
    'channeler', 'marionetteBaseSkill', 'marionettePrimary', 'marionetteNatureBooks',
    'marionetteSorceryBooks', 'marionetteChaosBooks', 'marionetteLifeBooks',
    'marionetteDeathBooks', 'marionetteAscension', 'marionetteConjurer',
  ];

  await setValue(page, 'gameVersion', 'com2_1.05.11');
  for (const key of ids) {
    await expect(page.locator(`#aAbilities [data-abil-key="${key}"]`)).toHaveClass(/abil-version-gated/);
  }
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.7');
  for (const key of ids) {
    await expect(page.locator(`#aAbilities [data-abil-key="${key}"]`)).not.toHaveClass(/abil-version-gated/);
  }
  expectNoConsoleErrors(errors);
});

test('Wanderer without Channeler receives the strayed persistent package', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.7');
  await setValue(page, 'aUnit', '362');

  const report = await page.evaluate(() => {
    const stats = readUnitStats('a');
    return {
      atk: stats.atk,
      def: stats.def,
      res: stats.res,
      ranged: stats.modernAttacks.ranged,
      package: stats.marionette,
      rebuild: stats.abilities.rebuild,
      charmed: stats.abilities.charmed,
    };
  });
  expect(report).toMatchObject({
    atk: 9,
    def: 9,
    res: 11,
    ranged: { strength: 2, type: 'magic_c' },
    package: { state: 'strayed', spellLock: true },
    rebuild: true,
    charmed: true,
  });
  expectNoConsoleErrors(errors);
});
