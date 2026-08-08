// R8.1 identity records stay source-shaped inside the UI while derivation receives a fresh
// calculated identity for each read. This intentionally tests the internal boundary only;
// the independent Hero/Fantastic/Race controls belong to R8.2.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('predefined and custom units keep independent source identity records', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const select = (prefix, id) => {
      const el = document.getElementById(prefix + 'Unit');
      el.value = String(id);
      el.dispatchEvent(new Event('change'));
    };
    document.getElementById('gameVersion').value = 'com2_1.05.11';
    onVersionChange();

    select('a', 81); // Golem
    const golem = {
      record: { ...unitIdentity.a },
      derived: { ...readUnitStats('a').identity },
    };

    select('a', 34); // Chosen
    const chosen = { ...unitIdentity.a };

    select('a', 'custom');
    const type = document.getElementById('aAbil_unitType');
    type.value = 'fantastic_chaos';
    type.dispatchEvent(new Event('change'));
    const custom = { ...unitIdentity.a };
    const derived = { ...readUnitStats('a').identity };
    const persisted = JSON.parse(JSON.stringify(collectFullState().identity.a));
    return { golem, chosen, custom, derived, persisted };
  });

  expect(report.golem.record).toMatchObject({
    version: 'com2_1.05.11',
    templateId: 81,
    heroTypeId: null,
    isHero: false,
    baseRace: 'Dwarf',
    baseFantastic: false,
  });
  expect(report.golem.derived).toMatchObject({
    version: 'com2_1.05.11',
    templateId: 81,
    heroTypeId: null,
    isHero: false,
    baseRace: 'Dwarf',
    baseFantastic: false,
    race: 'Dwarf',
    fantastic: false,
  });
  expect(report.chosen).toMatchObject({
    version: 'com2_1.05.11',
    templateId: 34,
    heroTypeId: 35,
    isHero: true,
    baseRace: 'Life',
    baseFantastic: false,
  });
  expect(report.custom).toMatchObject({
    version: 'com2_1.05.11',
    templateId: null,
    heroTypeId: null,
    isHero: false,
    baseRace: 'Chaos',
    baseFantastic: true,
  });
  expect(report.derived).toMatchObject({
    version: 'com2_1.05.11',
    templateId: null,
    heroTypeId: null,
    isHero: false,
    baseRace: 'Chaos',
    baseFantastic: true,
    race: 'Chaos',
    fantastic: true,
  });
  expect(report.persisted).toMatchObject({ race: 'Chaos' });
  expect(report.persisted).not.toHaveProperty('templateId');
  expect(report.persisted).not.toHaveProperty('heroTypeId');
  expect(report.persisted).not.toHaveProperty('isHero');
  expect(report.persisted).not.toHaveProperty('baseRace');
  expect(report.persisted).not.toHaveProperty('baseFantastic');
  expect(report.persisted).not.toHaveProperty('fantastic');
  expect(report.persisted).not.toHaveProperty('chosen');
  expect(report.persisted).not.toHaveProperty('golem');
  expectNoConsoleErrors(errors);
});
