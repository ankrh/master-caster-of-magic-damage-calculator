// R7.3 source-ordered calculated-stat traces.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('R7.3 projects source-ordered running chains for chance, identity, and modern channels', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => deriveUnitStats({
    prefix: 'a',
    version: 'com2_warlord_1.5.12.6.2',
    identity: createCustomUnitIdentity('com2_warlord_1.5.12.6.2', {
      baseRace: 'High Men', baseFantastic: false, specialUnit: 'chosen',
    }),
    figs: 1, atk: 5, def: 6, res: 8, hp: 7,
    rtb: 4, rtbType: 'missile',
    level: 'elite', weapon: 'mithril', armor: 'none',
    toHitMod: 5, toHitRtbMod: 0, toBlkMod: 0,
    abilities: { lucky: true, highPrayer: true, warpAttack: true, vertigo: true },
    modernAttacks: {
      ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 2, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));

  const assertChain = (trace) => {
    let running = trace.base;
    for (const entry of trace.entries) {
      expect(entry.source.id).toBeTruthy();
      expect(entry.from).toBe(running);
      running = entry.to;
    }
    expect(running).toBe(trace.result);
  };
  for (const [key, trace] of Object.entries(report.modifierTraces)) {
    if (key !== 'modernAttacks') assertChain(trace);
  }

  const meleeSources = report.modifierTraces.melee.entries.map(entry => entry.source.id);
  expect(meleeSources.indexOf('level')).toBeLessThan(meleeSources.indexOf('weapon'));
  expect(meleeSources.indexOf('weapon')).toBeLessThan(meleeSources.indexOf('highPrayer'));
  expect(meleeSources.indexOf('highPrayer')).toBeLessThan(meleeSources.indexOf('warpAttack'));

  const hitSources = report.modifierTraces.toHitMelee.entries.map(entry => entry.source.id);
  expect(hitSources[0]).toBe('baseToHitMelee');
  expect(hitSources.indexOf('level')).toBeLessThan(hitSources.indexOf('weapon'));
  expect(hitSources.indexOf('highPrayer')).toBeLessThan(hitSources.indexOf('vertigo'));
  expect(report.modifierTraces.fantastic.entries[0].source.id).toBe('identity:chosen');

  for (const key of ['ranged', 'thrown', 'fireBreath', 'lightningBreath']) {
    const channel = report.modernAttacks[key];
    expect(channel.modifierTrace.base).toBe(channel.baseStrength);
    expect(channel.modifierTrace.result).toBe(channel.strength);
    assertChain(channel.modifierTrace);
  }
  expectNoConsoleErrors(errors);
});

test('R7.3 omits inactive, invalid, and no-op inputs from projected traces', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => deriveUnitStats({
    prefix: 'a', version: 'com2_1.05.11',
    identity: createCustomUnitIdentity('com2_1.05.11', {
      baseRace: 'High Men', baseFantastic: false,
    }),
    figs: 1, atk: 4, def: 3, res: 5, hp: 6,
    rtb: 0, rtbType: 'none', level: 'normal', weapon: 'normal', armor: 'none',
    abilities: {
      highPrayer: false, warpAttack: false, holyBonus: 0,
      callToArmsPaladins: true, // invalid without the retained Paladins template
    },
  }));
  const sources = Object.values(report.modifierTraces)
    .filter(trace => trace && Array.isArray(trace.entries))
    .flatMap(trace => trace.entries.map(entry => entry.source.id));
  expect(sources).not.toContain('highPrayer');
  expect(sources).not.toContain('warpAttack');
  expect(sources).not.toContain('holyBonus');
  expect(sources).not.toContain('identity:callToArmsPaladins');
  expectNoConsoleErrors(errors);
});
