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

test('R7.3 attributes permanent writes and a created modern channel to their sources', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const base = {
      prefix: 'a', figs: 1, level: 'normal', weapon: 'normal', armor: 'none',
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
    };
    return {
      destiny: deriveUnitStats({
        ...base, version: 'com2_1.05.11',
        atk: 3, rtb: 2, rtbType: 'missile', def: 1, res: 4, hp: 2,
        abilities: { destiny: true },
      }),
      shadowStrike: deriveUnitStats({
        ...base, version: 'com2_warlord_1.5.12.6.2',
        atk: 6, rtb: 0, rtbType: 'none', def: 1, res: 1, hp: 1,
        abilities: { shadowStrike: true }, modernAttacks: {},
      }),
    };
  });

  const destinyExpected = {
    melee: [3, 6], sharedAttack: [2, 4], defense: [1, 5],
    resistance: [4, 8], hits: [2, 4],
  };
  for (const [field, [from, to]] of Object.entries(destinyExpected)) {
    const trace = report.destiny.modifierTraces[field];
    expect(trace.base).toBe(from);
    expect(trace.entries).toHaveLength(1);
    expect(trace.entries[0]).toMatchObject({
      source: { id: 'destiny', label: 'Destiny' }, from, to,
    });
    expect(trace.result).toBe(to);
  }

  const channel = report.shadowStrike.modernAttacks.thrown;
  expect(channel.baseStrength).toBe(0);
  expect(channel.modifierTrace.base).toBe(0);
  expect(channel.modifierTrace.entries).toHaveLength(1);
  expect(channel.modifierTrace.entries[0]).toMatchObject({
    source: { id: 'shadowStrike:thrown', label: 'Shadow Strike' },
    from: 0,
    to: 3,
  });
  expect(channel.modifierTrace.result).toBe(channel.strength);
  expectNoConsoleErrors(errors);
});
