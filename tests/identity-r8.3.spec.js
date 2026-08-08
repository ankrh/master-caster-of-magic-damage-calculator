// R8.3 ordered identity and special-unit conversions.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

function simpleInput(version, identity, abilities = {}, extra = {}) {
  return {
    prefix: 'a', version, identity, abilities,
    figs: 1, atk: 1, def: 0, res: 0, hp: 10,
    rtb: 0, rtbType: 'none', weapon: 'normal', level: 'normal',
    ...extra,
  };
}

test('R8.3 keeps base identity while applying modern live conversions in order', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const simple = (version, identity, abilities = {}, extra = {}) => ({
      prefix: 'a', version, identity, abilities,
      figs: 1, atk: 1, def: 0, res: 0, hp: 10,
      rtb: 0, rtbType: 'none', weapon: 'normal', level: 'normal',
      ...extra,
    });
    const derive = (input) => deriveUnitStats(input);
    const chosen = derive(simple('com2_1.05.11', createUnitIdentity({
      version: 'com2_1.05.11', templateId: 34, heroTypeId: 35,
      isHero: true, baseRace: 'Life', baseFantastic: false, specialUnit: 'chosen',
    })));
    const summoned = derive(simple('com2_1.05.11', createCustomUnitIdentity('com2_1.05.11', {
      isHero: false, baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'none',
    }), { combatSummoned: true, breakthrough: 'meleeDef' }));
    const construct = derive(simple('com2_1.05.11', createUnitIdentity({
      version: 'com2_1.05.11', templateId: 37, isHero: false,
      baseRace: 'Special', baseFantastic: false, specialUnit: 'none',
    }), { combatSummoned: true }, { rtb: 9, rtbType: 'boulder' }));
    const paladins = derive(simple('com2_1.05.11', createCustomUnitIdentity('com2_1.05.11', {
      isHero: false, baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
    }), { callToArmsPaladins: true }, { name: 'Paladins' }));
    return { chosen, summoned, construct, paladins };
  });

  expect(report.chosen.identity).toMatchObject({
    baseRace: 'Life', baseFantastic: false, race: 'Life', fantastic: true,
    isHero: true, specialUnit: 'chosen',
  });
  expect(report.chosen.unitType).toBe('fantastic_life');
  expect(report.chosen.identityTrace.map(step => step.id)).toContain('identity:chosen');

  expect(report.summoned.identity).toMatchObject({
    baseRace: 'Dwarf', baseFantastic: false, race: 'Dwarf', fantastic: true,
  });
  expect(report.summoned.unitType).toBe('fantastic_arcane');
  expect(report.summoned.abilities.liveFantastic).toBe(true);
  expect(report.summoned.atk).toBe(2); // direct Breakthrough value is applied to this live unit
  expect(report.summoned.identityTrace.map(step => step.id)).toContain('identity:combatSummoned');

  expect(report.construct.identity).toMatchObject({
    baseRace: 'Special', baseFantastic: false, race: 'Nature', fantastic: true,
  });
  expect(report.construct.unitType).toBe('fantastic_nature');

  expect(report.paladins.identity).toMatchObject({
    baseRace: 'High Men', baseFantastic: false, race: 'Life', fantastic: true,
  });
  expectNoConsoleErrors(errors);
});

test('R8.3 applies CoM1 Zombies and Construct Catapult writes only on valid paths', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const simple = (identity, abilities = {}, extra = {}) => ({
      prefix: 'a', version: 'com_6.08', identity, abilities,
      figs: 1, atk: 1, def: 0, res: 0, hp: 10,
      rtb: 0, rtbType: 'none', weapon: 'normal', level: 'normal',
      ...extra,
    });
    const derive = (identity, abilities = {}, extra = {}) => deriveUnitStats(
      simple(identity, abilities, extra));
    const zombies = derive(createUnitIdentity({
      version: 'com_6.08', templateId: 174, isHero: false,
      baseRace: 'Death', baseFantastic: true, specialUnit: 'zombies',
    }));
    const catapultIdentity = createUnitIdentity({
      version: 'com_6.08', templateId: 37, isHero: false,
      baseRace: 'Special', baseFantastic: false, specialUnit: 'catapult',
    });
    const ordinary = derive(catapultIdentity, {}, { rtb: 9, rtbType: 'boulder' });
    const construct = derive(catapultIdentity, { combatSummoned: true }, { rtb: 9, rtbType: 'boulder' });
    const centaurs = derive(createUnitIdentity({
      version: 'com_6.08', templateId: 54, isHero: false,
      baseRace: 'Beastmen', baseFantastic: false, specialUnit: 'none',
    }), { combatSummoned: true });
    const paladins = derive(createUnitIdentity({
      version: 'com_6.08', templateId: 113, isHero: false,
      baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
    }), { combatSummoned: true });
    const unrelated = derive(createCustomUnitIdentity('com_6.08', {
      isHero: false, baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'none',
    }), { combatSummoned: true });
    return { zombies, ordinary, construct, centaurs, paladins, unrelated };
  });

  expect(report.zombies.toBlock).toBeCloseTo(0.29);
  expect(report.zombies.statTrace).toContainEqual(expect.objectContaining({
    id: 'identity:zombies:toBlock', phase: 'base',
    changes: { toBlk: { from: 0, to: -1, delta: -1 } },
  }));
  expect(report.zombies.identityTrace.map(step => step.id)).not.toContain('identity:zombies');

  expect(report.ordinary.identity.fantastic).toBe(false);
  expect(report.ordinary.weapon).toBe('normal');
  expect(report.ordinary.wpn.toHit).toBe(0);

  expect(report.construct.identity.fantastic).toBe(true);
  expect(report.construct.weapon).toBe('magic');
  expect(report.construct.wpn.toHit).toBe(10);
  expect(report.construct.toHitRtb).toBeGreaterThan(report.ordinary.toHitRtb);
  expect(report.construct.identityTrace.map(step => step.id)).not.toContain('identity:combatSummoned');
  expect(report.centaurs.identity).toMatchObject({ race: 'Nature', fantastic: true });
  expect(report.paladins.identity).toMatchObject({ race: 'Life', fantastic: true });

  expect(report.unrelated.identity.fantastic).toBe(false);
  expect(report.unrelated.identityTrace).toEqual([]);
  expectNoConsoleErrors(errors);
});

test('Combat Summoned is visible and selectable for every engine version', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const values = {};
    for (const version of ['mom_1.31', 'com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.6']) {
      document.getElementById('gameVersion').value = version;
      onVersionChange();
      const control = document.getElementById('aAbil_combatSummoned');
      values[version] = control ? {
        present: true,
        disabled: control.disabled,
        hidden: control.closest('.abil-item').classList.contains('abil-hidden'),
      } : { present: false };
    }
    return values;
  });
  for (const value of Object.values(report)) {
    expect(value).toEqual({ present: true, disabled: false, hidden: false });
  }
  expectNoConsoleErrors(errors);
});
