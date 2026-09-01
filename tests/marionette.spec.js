const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('Wanderer Channeler package derives through UI and share state', async ({ page, context }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
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
      lifeSteal: stats.abilities.lifeSteal,
      state: collectState(),
    };
  });
  expect(report.identity).toMatchObject({ heroTypeId: 48, fantastic: true });
  expect(report.atk).toBe(8);
  expect(report.def).toBe(6);
  expect(report.hp).toBe(15);
  expect(report.ranged).toMatchObject({ strength: 3, type: 'magic' });
  expect(report.package).toMatchObject({
    state: 'owned', primary: 'death', spell: 'Syphon Life', charges: 2,
    attackBonus: 3, defenseBonus: 1,
  });
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
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
  for (const key of ids) {
    await expect(page.locator(`#aAbilities [data-abil-key="${key}"]`)).not.toHaveClass(/abil-version-gated/);
  }
  expectNoConsoleErrors(errors);
});

test('Wanderer without Channeler receives the strayed persistent package', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
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
    ranged: { strength: 2, type: 'magic_lightning' },
    package: { state: 'strayed', spellLock: true },
    rebuild: true,
    charmed: true,
  });
  expectNoConsoleErrors(errors);
});

// F107. `UNITS.INI [362]` states `RangedType=30` with `Ranged=0`, so the Wanderer's permanent
// ranged record is a roster fact. It used to reach the calculator only through
// `deriveMarionettePackage`'s hardcoded projection, which no longer exists; the roster record and
// the card control it populates are now the single home for it.
test('Wanderer roster Ranged record is the source of its permanent ranged type', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
  await setValue(page, 'aUnit', '362');

  const strayed = await page.evaluate(() => {
    const record = (unitDatabases['com2_warlord_1.5.12.9'] || []).find(u => u.id === 362);
    const stats = readUnitStats('a');
    return {
      rosterRanged: record.ranged,
      rosterRangedType: record.ranged_type,
      cardRangedType: document.getElementById('aModernRangedType').value,
      package: stats.marionette,
      ranged: stats.modernAttacks.ranged,
    };
  });
  // The roster states the type and no strength; the card control carries it.
  expect(strayed.rosterRanged).toBeUndefined();
  expect(strayed.rosterRangedType).toBe('Magic-lightning');
  expect(strayed.cardRangedType).toBe('magic_lightning');
  // The strayed branch writes no ranged type (`UnitCalcPre.CAS:364-392`), so the package
  // projects none and the record's own type is what Transmute Equipment's +2 lands on.
  expect(strayed.package.rangedType).toBeUndefined();
  expect(strayed.ranged).toMatchObject({ strength: 2, type: 'magic_lightning' });

  // The owned branch's realm retype is `SETSTAT(U,SRangedType,0,...)` -- record selector 0 --
  // so it is a region-`b` write over the roster's permanent id-30 type, not a seed of it.
  await setValue(page, 'aAbil_channeler', true);
  await setValue(page, 'aAbil_marionetteBaseSkill', '90');
  await setValue(page, 'aAbil_marionettePrimary', 'nature');
  const owned = await page.evaluate(() => {
    const stats = readUnitStats('a');
    const retype = stats.statTrace.find(event => event.id === 'marionette:rangedType');
    return {
      retype,
      order: stats.statTrace.map(event => `${event.phase}:${event.id}`),
      ranged: stats.modernAttacks.ranged,
    };
  });
  expect(owned.retype).toMatchObject({ phase: 'b' });
  // The write it makes is `magic_lightning` -> `magic`: the roster's permanent id-30 type is
  // what the record carries into region `b`, and the id-37 retype replaces it there.
  expect(owned.retype.changes.rangedTypeRanged).toEqual({ from: 'magic_lightning', to: 'magic' });
  expect(owned.order.indexOf('b:marionette:rangedType'))
    .toBeGreaterThan(owned.order.indexOf('base:stat:base'));
  expect(owned.ranged).toMatchObject({ type: 'magic' });
  expectNoConsoleErrors(errors);
});

// F93. `UnitCalcPre.CAS:269-273` writes `AWallCrusher`, `AFArmorPiercing` *and*
// `SRangedType = 30` for an ascended Chaos-primary Marionette, after the twenty book-grant
// blocks the five realm arms at `:104-176` precede. Id 30 is the lightning-bolt projectile and a
// token of its own, so the ascension arm is a second region-`b` write and not something the
// primary arm's id 31 already stands for.
test('An ascended Chaos Marionette takes the ascension block\'s own projectile retype', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
  await setValue(page, 'aUnit', '362');
  await setValue(page, 'aAbil_channeler', true);
  await setValue(page, 'aAbil_marionetteBaseSkill', '90');
  await setValue(page, 'aAbil_marionettePrimary', 'chaos');
  await setValue(page, 'aAbil_marionetteChaosBooks', '5');

  const unascended = await page.evaluate(() => {
    const stats = readUnitStats('a');
    return {
      ranged: stats.modernAttacks.ranged,
      ascensionEvent: stats.statTrace.find(event => event.id === 'marionette:ascensionRangedType'),
    };
  });
  // The primary arm alone: `SRangedType = 31`, the plain magical token.
  expect(unascended.ranged).toMatchObject({ type: 'magic' });
  expect(unascended.ascensionEvent).toBeUndefined();

  await setValue(page, 'aAbil_marionetteAscension', true);
  const ascended = await page.evaluate(() => {
    const stats = readUnitStats('a');
    return {
      ranged: stats.modernAttacks.ranged,
      ascensionEvent: stats.statTrace.find(event => event.id === 'marionette:ascensionRangedType'),
      order: stats.statTrace.map(event => `${event.phase}:${event.id}`),
      wallCrusher: stats.abilities.wallCrusher,
      armorPiercing: stats.abilities.armorPiercing,
    };
  });
  expect(ascended.ranged).toMatchObject({ type: 'magic_lightning' });
  expect(ascended.ascensionEvent).toMatchObject({ phase: 'b' });
  expect(ascended.ascensionEvent.changes.rangedTypeRanged)
    .toEqual({ from: 'magic', to: 'magic_lightning' });
  // The other two writes of the same three lines were already modelled.
  expect(ascended.wallCrusher).toBe(true);
  expect(ascended.armorPiercing).toBe(true);
  expect(ascended.order.indexOf('b:marionette:ascensionRangedType'))
    .toBeGreaterThan(ascended.order.indexOf('b:marionette:rangedType'));

  // A non-Chaos primary has no such arm, whatever its ascension state.
  await setValue(page, 'aAbil_marionettePrimary', 'nature');
  const natureAscended = await page.evaluate(() => {
    const stats = readUnitStats('a');
    return {
      ranged: stats.modernAttacks.ranged,
      ascensionEvent: stats.statTrace.find(event => event.id === 'marionette:ascensionRangedType'),
    };
  });
  expect(natureAscended.ranged).toMatchObject({ type: 'magic' });
  expect(natureAscended.ascensionEvent).toBeUndefined();
  expectNoConsoleErrors(errors);
});
