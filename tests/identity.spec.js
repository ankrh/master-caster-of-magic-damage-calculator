// R8.2 exposes the independent editable base identity fields and the named, version-gated
// special-unit selector. The numeric source/template identity remains internal.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('predefined identity fields lock and custom identity fields derive independently', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const select = (prefix, id) => {
      const el = document.getElementById(prefix + 'Unit');
      el.value = String(id);
      el.dispatchEvent(new Event('change'));
    };
    const setControl = (id, value) => {
      const el = document.getElementById(id);
      if (el.type === 'checkbox') el.checked = !!value;
      else el.value = value;
      el.dispatchEvent(new Event('change'));
    };

    document.getElementById('gameVersion').value = 'com2_1.05.11';
    onVersionChange();

    select('a', 81); // Golem
    const golem = {
      record: { ...unitIdentity.a },
      controls: {
        hero: document.getElementById('aBaseHero').checked,
        fantastic: document.getElementById('aBaseFantastic').checked,
        race: document.getElementById('aBaseRace').value,
        special: document.getElementById('aSpecialUnit').value,
        locked: ['aBaseHero', 'aBaseFantastic', 'aBaseRace', 'aSpecialUnit']
          .every(id => document.getElementById(id).disabled),
        elements: document.getElementById('aAbil_elemArmor').value,
        elementsLocked: document.getElementById('aAbil_elemArmor').disabled,
      },
      derived: { ...readUnitStats('a').identity },
    };

    select('a', 34); // Chosen
    const chosen = {
      record: { ...unitIdentity.a },
      special: document.getElementById('aSpecialUnit').value,
      hero: document.getElementById('aBaseHero').checked,
      fantastic: document.getElementById('aBaseFantastic').checked,
      race: document.getElementById('aBaseRace').value,
    };

    select('a', 'custom');
    setControl('aBaseHero', false);
    setControl('aBaseFantastic', true);
    setControl('aBaseRace', 'Chaos');
    setControl('aSpecialUnit', 'none');
    const custom = { ...unitIdentity.a };
    const derived = { ...readUnitStats('a').identity };
    const persisted = JSON.parse(JSON.stringify(collectFullState()));
    return { golem, chosen, custom, derived, persisted };
  });

  expect(report.golem.record).toMatchObject({
    version: 'com2_1.05.11', templateId: 81, heroTypeId: null,
    isHero: false, baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'golem',
  });
  expect(report.golem.controls).toEqual({
    hero: false, fantastic: false, race: 'Dwarf', special: 'golem', locked: true,
    elements: 'resistElements', elementsLocked: true,
  });
  expect(report.golem.derived).toMatchObject({
    templateId: 81, heroTypeId: null, isHero: false, baseRace: 'Dwarf',
    baseFantastic: false, race: 'Dwarf', fantastic: false,
  });
  expect(report.chosen).toMatchObject({
    record: { version: 'com2_1.05.11', templateId: 34, heroTypeId: 35,
      isHero: true, baseRace: 'Life', baseFantastic: false, specialUnit: 'chosen' },
    special: 'chosen', hero: true, fantastic: false, race: 'Life',
  });
  expect(report.custom).toMatchObject({
    version: 'com2_1.05.11', templateId: null, heroTypeId: null,
    isHero: false, baseRace: 'Chaos', baseFantastic: true, specialUnit: 'none',
  });
  expect(report.derived).toMatchObject({
    templateId: null, heroTypeId: null, isHero: false, baseRace: 'Chaos',
    baseFantastic: true, race: 'Chaos', fantastic: true,
  });
  expect(report.persisted.ids).toMatchObject({
    aBaseHero: false, aBaseFantastic: true, aBaseRace: 'Chaos', aSpecialUnit: 'none',
  });
  expect(report.persisted.identity.a).toMatchObject({ race: 'Chaos' });
  expect(report.persisted.identity.a).not.toHaveProperty('templateId');
  expect(report.persisted.identity.a).not.toHaveProperty('heroTypeId');
  expect(report.persisted.identity.a).not.toHaveProperty('baseFantastic');
  expectNoConsoleErrors(errors);
});

test('special-unit options are gated by engine version and derived Golem effects release cleanly', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const options = () => Array.from(document.getElementById('aSpecialUnit').options)
      .map(option => option.value);
    const choose = value => {
      const unit = document.getElementById('aUnit');
      unit.value = 'custom';
      unit.dispatchEvent(new Event('change'));
      const special = document.getElementById('aSpecialUnit');
      special.value = value;
      special.dispatchEvent(new Event('change'));
    };
    document.getElementById('gameVersion').value = 'com2_1.05.11';
    onVersionChange();
    const modern = options();
    choose('none');
    const elem = document.getElementById('aAbil_elemArmor');
    elem.value = 'elementalArmor';
    elem.dispatchEvent(new Event('change'));
    choose('golem');
    const golemElements = {
      value: document.getElementById('aAbil_elemArmor').value,
      locked: document.getElementById('aAbil_elemArmor').disabled,
      hidden: document.getElementById('aAbil_elemArmor').closest('.abil-item').classList.contains('abil-hidden'),
    };
    const persistedGolem = collectState();
    resetCalculatorState('com2_1.05.11');
    applyState(persistedGolem);
    choose('none');
    const persistedReleased = {
      value: document.getElementById('aAbil_elemArmor').value,
      locked: document.getElementById('aAbil_elemArmor').disabled,
    };
    choose('chosen');
    const chosen = readUnitStats('a').identity.specialUnit;
    choose('none');
    const releasedElements = {
      value: document.getElementById('aAbil_elemArmor').value,
      locked: document.getElementById('aAbil_elemArmor').disabled,
    };
    document.getElementById('gameVersion').value = 'com_6.08';
    onVersionChange();
    const com = options();
    choose('zombies');
    const zombies = readUnitStats('a').identity.specialUnit;
    choose('catapult');
    const catapult = readUnitStats('a').identity.specialUnit;
    document.getElementById('gameVersion').value = 'mom_1.31';
    onVersionChange();
    const mom = options();
    return { modern, com, mom, chosen, zombies, catapult, golemElements, releasedElements, persistedReleased };
  });

  expect(report.modern).toEqual(['none', 'golem', 'chosen']);
  expect(report.com).toEqual(['none', 'golem', 'zombies', 'catapult']);
  expect(report.mom).toEqual(['none']);
  expect(report.chosen).toBe('chosen');
  expect(report.zombies).toBe('zombies');
  expect(report.catapult).toBe('catapult');
  expect(report.golemElements).toEqual({ value: 'resistElements', locked: true, hidden: false });
  expect(report.releasedElements).toEqual({ value: 'elementalArmor', locked: false });
  expect(report.persistedReleased).toEqual({ value: 'elementalArmor', locked: false });
  expectNoConsoleErrors(errors);
});

test('custom identity keeps Hero and Fantastic independent, exposes all base races, and clears race', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el.type === 'checkbox') el.checked = !!value;
      else el.value = value;
      el.dispatchEvent(new Event('change'));
    };
    document.getElementById('gameVersion').value = 'com2_warlord_1.5.12.6.2';
    onVersionChange();
    document.getElementById('aUnit').value = 'custom';
    document.getElementById('aUnit').dispatchEvent(new Event('change'));
    const races = Array.from(document.getElementById('aBaseRace').options).map(option => option.value);
    set('aBaseHero', true);
    set('aBaseFantastic', true);
    set('aBaseRace', 'Chaos');
    const combined = {
      hiddenType: document.getElementById('aAbil_unitType').value,
      stored: { ...unitIdentity.a },
      derived: { ...readUnitStats('a').identity },
      stats: { unitType: readUnitStats('a').unitType, isHero: readUnitStats('a').isHero },
    };
    set('aBaseRace', '');
    return { races, combined, cleared: { stored: { ...unitIdentity.a }, derived: { ...readUnitStats('a').identity } } };
  });

  for (const race of ['Dark Elf', 'Draconian', 'Generic', 'Hawkmen', 'Special']) {
    expect(report.races).toContain(race);
  }
  expect(report.combined.hiddenType).toBe('fantastic_chaos');
  expect(report.combined.stored).toMatchObject({ isHero: true, baseFantastic: true, baseRace: 'Chaos' });
  expect(report.combined.derived).toMatchObject({ isHero: true, baseFantastic: true, baseRace: 'Chaos', race: 'Chaos', fantastic: true });
  expect(report.combined.stats).toEqual({ unitType: 'fantastic_chaos', isHero: true });
  expect(report.cleared.stored).toMatchObject({ isHero: true, baseFantastic: true, baseRace: '' });
  expect(report.cleared.derived).toMatchObject({ isHero: true, baseFantastic: true, baseRace: '', race: '', fantastic: true });
  expectNoConsoleErrors(errors);
});

test('identity controls round-trip through a share state without exposing numeric IDs', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const set = (id, value) => {
      const el = document.getElementById(id);
      if (el.type === 'checkbox') el.checked = !!value;
      else el.value = value;
      el.dispatchEvent(new Event('change'));
    };
    document.getElementById('aUnit').value = 'custom';
    document.getElementById('aUnit').dispatchEvent(new Event('change'));
    set('aBaseHero', true);
    set('aBaseFantastic', false);
    set('aBaseRace', 'High Men');
    const blob = collectState();
    resetCalculatorState('com2_1.05.11');
    applyState(blob);
    return {
      controls: {
        hero: document.getElementById('aBaseHero').checked,
        fantastic: document.getElementById('aBaseFantastic').checked,
        race: document.getElementById('aBaseRace').value,
      },
      identity: { ...readUnitStats('a').identity },
      ids: blob.ids,
    };
  });

  expect(report.controls).toEqual({ hero: true, fantastic: false, race: 'High Men' });
  expect(report.identity).toMatchObject({ templateId: null, heroTypeId: null,
    isHero: true, baseRace: 'High Men', baseFantastic: false });
  expect(report.ids).toMatchObject({ aBaseHero: true, aBaseFantastic: false, aBaseRace: 'High Men' });
  expect(Object.keys(report.ids).some(id => /template|heroType/i.test(id))).toBe(false);
  expectNoConsoleErrors(errors);
});
