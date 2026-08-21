const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('R9-G1c preserves late-transform source gates, arithmetic, order, and UI state', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const input = (version, overrides = {}) => ({
      prefix: 'a', version,
      identity: createCustomUnitIdentity(version, {
        baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
      }),
      abilities: {}, level: 'normal', weapon: 'normal', armor: 'none',
      figs: 1, atk: 1, rtb: 0, rtbType: 'none',
      def: 1, res: 3, hp: 10, dmg: 0,
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
      cityWalls: 'none', nodeAura: 'none', trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1,
      ...overrides,
    });
    const warlord = 'com2_warlord_1.5.12.7';
    const ranged = deriveUnitStats(input(warlord, {
      abilities: { wildGame: true }, rtb: 2, rtbType: 'missile',
      modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    }));
    const convertedThrown = deriveUnitStats(input(warlord, {
      abilities: { wildGame: true, focusMagic: true }, rtb: 2, rtbType: 'thrown',
    }));
    const nightshade = deriveUnitStats(input(warlord, {
      abilities: { powerMinerals: 2, nightshade: 3 },
    }));
    const dragon = deriveUnitStats(input(warlord, {
      identity: createCustomUnitIdentity(warlord, {
        baseRace: 'Draconian', baseFantastic: false, specialUnit: 'none',
      }),
      abilities: { dragonMound: true }, modernAttacks: {},
    }));
    const cannon = deriveUnitStats(input(warlord, {
      rtb: 5, rtbType: 'missile',
      modernAttacks: { ranged: { strength: 5, type: 'missile' } },
      abilities: { outlanderWizard: true, mechanical: true,
        heatPowerEngine: true, energyBeamWeapons: true },
    }));
    const cannonWithoutRanged = deriveUnitStats(input(warlord, {
      abilities: { outlanderWizard: true, mechanical: true,
        heatPowerEngine: true, energyBeamWeapons: true },
    }));
    const normalizedCannon = normalizeCombatUnit(cannon, warlord);
    const com1 = deriveUnitStats(input('com_6.08', {
      rtb: 1, rtbType: 'missile', weapon: 'mithril',
      abilities: { flameBlade: true, focusMagic: true },
    }));
    const modernOrder = deriveUnitStats(input('com2_1.05.11', {
      rtb: 1, rtbType: 'missile', weapon: 'mithril',
      abilities: { focusMagic: true },
    }));

    document.getElementById('gameVersion').value = warlord;
    onVersionChange();
    document.getElementById('aUnit').value = 'custom';
    updateUnitLock('a');
    document.getElementById('aAbil_nightshade').value = '3';
    const state = collectFullState();
    document.getElementById('aAbil_nightshade').value = '0';
    applyFullState(state);

    const ids = unit => unit.statTrace.map(step => step.id);
    return {
      ranged: ranged.modernAttacks.ranged.strength,
      convertedThrown: convertedThrown.rtb,
      nightshade: nightshade.res,
      dragon: dragon.modernAttacks.fireBreath.strength,
      cannonWithRanged: cannon.modernAttacks.ranged.type,
      cannonNoRanged: !!cannonWithoutRanged.abilities.energyCannon,
      cannonNoRangedStrength: cannonWithoutRanged.rtb,
      cannonRangedDestruction: normalizedCannon.touchFlagRecords.ranged.destruction,
      cannonGeneralDestruction: normalizedCannon.touchFlagRecords.global.destruction,
      com1Strength: com1.rtb,
      com1Order: ids(com1),
      modernOrder: ids(modernOrder),
      restoredNightshade: document.getElementById('aAbil_nightshade').value,
      nightshadeType: document.getElementById('aAbil_nightshade').type,
      ammoFieldAbsent: document.getElementById('aMaxAmmo') === null,
    };
  });

  expect(report.ranged).toBe(3);
  expect(report.convertedThrown).toBe(2);
  expect(report.nightshade).toBe(6);
  expect(report.dragon).toBe(2);
  expect(report.cannonWithRanged).toBe('magic');
  expect(report.cannonNoRanged).toBe(false);
  expect(report.cannonNoRangedStrength).toBe(0);
  expect(report.cannonRangedDestruction).toBe(-2);
  expect(report.cannonGeneralDestruction).toBeUndefined();
  expect(report.com1Strength).toBe(3);
  expect(report.com1Order.indexOf('weapon')).toBeLessThan(report.com1Order.indexOf('flameBlade'));
  expect(report.com1Order.indexOf('flameBlade')).toBeLessThan(report.com1Order.indexOf('focusMagic'));
  expect(report.modernOrder.indexOf('focusMagic')).toBeLessThan(report.modernOrder.indexOf('weapon'));
  expect(report.restoredNightshade).toBe('3');
  expect(report.nightshadeType).toBe('number');
  expect(report.ammoFieldAbsent).toBe(true);
  expectNoConsoleErrors(errors);
});
