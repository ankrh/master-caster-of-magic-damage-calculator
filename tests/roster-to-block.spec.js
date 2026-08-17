const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('F21 loads modern roster To Defend deltas into the card and derivation', async ({ page }) => {
  const errors = await openCalculator(page);

  const versions = [
    ['com2_1.05.11', { '-10': 1 }],
    ['com2_warlord_1.5.12.7', { '-10': 15, 10: 12, 20: 1 }],
  ];
  for (const [version, expectedDeltaCounts] of versions) {
    await setValue(page, 'gameVersion', version);
    const report = await page.evaluate(() => {
      const roster = unitDatabases[document.getElementById('gameVersion').value];
      const select = document.getElementById('aUnit');
      const nonDefault = roster.filter(unit => unit.to_block != null);
      const results = nonDefault.map(unit => {
        select.value = String(unit.id);
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return {
          id: unit.id,
          name: unit.name,
          rosterDelta: unit.to_block,
          cardDelta: Number(document.getElementById('aToBlkMod').value),
          chance: readUnitStats('a').toBlock,
        };
      });
      const omitted = roster.find(unit => unit.to_block == null);
      select.value = String(omitted.id);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        nonDefault: results,
        omitted: {
          id: omitted.id,
          cardDelta: Number(document.getElementById('aToBlkMod').value),
          chance: readUnitStats('a').toBlock,
        },
      };
    });

    const actualDeltaCounts = report.nonDefault.reduce((counts, unit) => {
      counts[unit.rosterDelta] = (counts[unit.rosterDelta] || 0) + 1;
      return counts;
    }, {});
    expect(actualDeltaCounts).toEqual(expectedDeltaCounts);
    for (const unit of report.nonDefault) {
      expect(unit.cardDelta, `${version} ${unit.id} ${unit.name} card delta`)
        .toBe(unit.rosterDelta);
      expect(unit.chance, `${version} ${unit.id} ${unit.name} derived chance`)
        .toBeCloseTo((30 + unit.rosterDelta) / 100);
    }
    expect(report.omitted.cardDelta, `${version} omitted field card delta`).toBe(0);
    expect(report.omitted.chance, `${version} omitted field derived chance`).toBeCloseTo(0.30);
  }

  expectNoConsoleErrors(errors);
});

test('F21 matrix roster rows use each unit To Defend instead of the card value', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.7');

  const report = await page.evaluate(() => {
    const units = unitDatabases[document.getElementById('gameVersion').value];
    const derive = id => {
      const unit = units.find(candidate => candidate.id === id);
      const stats = buildMatrixUnitStats('b', unit, {}, 'melee');
      return { rosterDelta: unit.to_block || 0, baseDelta: stats.baseToBlkMod,
        chance: stats.toBlock };
    };
    // This unrelated card value exposed the old bug: every matrix row inherited it.
    document.getElementById('bToBlkMod').value = '70';
    return {
      goblin: derive(346),
      warMonk: derive(11),
      seraph: derive(286),
      ordinary: derive(35), // Trireme: omitted field means the default 30%.
    };
  });

  expect(report.goblin).toEqual({ rosterDelta: -10, baseDelta: -10, chance: 0.20 });
  expect(report.warMonk).toEqual({ rosterDelta: 10, baseDelta: 10, chance: 0.40 });
  expect(report.seraph).toEqual({ rosterDelta: 20, baseDelta: 20, chance: 0.50 });
  expect(report.ordinary).toEqual({ rosterDelta: 0, baseDelta: 0, chance: 0.30 });
  expectNoConsoleErrors(errors);
});

test('F21 preserves non-default roster controls through swap/state and leaves DOS at zero delta', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.7');
  await setValue(page, 'aUnit', '346'); // 20% = -10 delta
  await setValue(page, 'bUnit', '286'); // 50% = +20 delta

  await page.click('#swapBtn');
  expect(await page.locator('#aToBlkMod').inputValue()).toBe('20');
  expect(await page.locator('#bToBlkMod').inputValue()).toBe('-10');

  const restored = await page.evaluate(() => {
    const state = collectState();
    document.getElementById('aToBlkMod').value = '0';
    document.getElementById('bToBlkMod').value = '0';
    applyState(state);
    return [document.getElementById('aToBlkMod').value,
      document.getElementById('bToBlkMod').value];
  });
  expect(restored).toEqual(['20', '-10']);

  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    await setValue(page, 'gameVersion', version);
    const dos = await page.evaluate(() => {
      const units = unitDatabases[document.getElementById('gameVersion').value];
      const unit = units[0];
      const select = document.getElementById('aUnit');
      select.value = String(unit.id);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return {
        anyRosterField: units.some(candidate => candidate.to_block != null),
        cardDelta: Number(document.getElementById('aToBlkMod').value),
      };
    });
    expect(dos).toEqual({ anyRosterField: false, cardDelta: 0 });
  }

  expectNoConsoleErrors(errors);
});
