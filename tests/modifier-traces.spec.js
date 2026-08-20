// R7.3 source-ordered calculated-stat traces.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('R7.3 projects source-ordered running chains for chance, identity, and modern channels', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => deriveUnitStats({
    prefix: 'a',
    version: 'com2_warlord_1.5.12.7',
    identity: createCustomUnitIdentity('com2_warlord_1.5.12.7', {
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
  expect(report.modifierTraces.fantastic.entries[0].source.id).toBe('chosen');

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
    prefix: 'a', version: 'com2_1.05.11', name: 'Paladins',
    identity: createCustomUnitIdentity('com2_1.05.11', {
      baseRace: 'High Men', baseFantastic: false,
    }),
    figs: 1, atk: 4, def: 3, res: 5, hp: 6,
    rtb: 0, rtbType: 'none', level: 'normal', weapon: 'normal', armor: 'none',
    abilities: {
      highPrayer: false, warpAttack: false, holyBonus: 0,
      combatSummoned: true, // display name alone does not establish the retained template
    },
  }));
  const sources = Object.values(report.modifierTraces)
    .filter(trace => trace && Array.isArray(trace.entries))
    .flatMap(trace => trace.entries.map(entry => entry.source.id));
  expect(sources).not.toContain('highPrayer');
  expect(sources).not.toContain('warpAttack');
  expect(sources).not.toContain('holyBonus');
  expect(sources).not.toContain('callToArmsPaladins');
  expectNoConsoleErrors(errors);
});

test('F5 keeps modern common and channel chance writes on the ordered record', async ({ page }) => {
  const errors = await openCalculator(page);
  const reports = await page.evaluate(() => Object.fromEntries(
    ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => [version, {
      twoStage: deriveUnitStats({
      prefix: 'a', version,
      identity: createCustomUnitIdentity(version, { baseRace: 'High Men' }),
      figs: 1, atk: 1, rtb: 1, rtbType: 'missile', def: 1, res: 1, hp: 1,
      level: 'normal', weapon: 'normal', armor: 'none', abilities: {},
      toHitMod: -50, toHitRtbMod: -40, toBlkMod: -40,
      }),
      orderedClamp: deriveUnitStats({
        prefix: 'a', version,
        identity: createCustomUnitIdentity(version, { baseRace: 'High Men' }),
        figs: 1, atk: 1, rtb: 1, rtbType: 'missile', def: 1, res: 1, hp: 1,
        level: 'normal', weapon: 'normal', armor: 'none', abilities: {},
        toHitMod: -50, toHitRtbMod: 100, toBlkMod: 0,
      }),
      sourceOrdered: version.startsWith('com2_warlord') ? deriveUnitStats({
        prefix: 'a', version,
        identity: createCustomUnitIdentity(version, { baseRace: 'High Men' }),
        figs: 1, atk: 5, rtb: 5, rtbType: 'missile', def: 5, res: 6, hp: 5,
        level: 'normal', weapon: 'normal', armor: 'none',
        abilities: { plague: true, vertigo: true, berserkWarlord: true },
        toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
        warpReality: true, hurricane: true,
      }) : null,
    }]),
  ));

  for (const { twoStage: report, orderedClamp } of Object.values(reports)) {
    expect(report.toHitMelee).toBeCloseTo(0.1);
    expect(report.toHitRtb).toBeCloseTo(0.2);
    expect(report.toBlock).toBe(0);
    const ids = orderedClamp.statTrace.map(entry => entry.id);
    expect(ids.indexOf('modernClampCommon')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('modernClampCommon')).toBeLessThan(ids.indexOf('clamp'));
    expect(report.modifierTraces.toHitRanged.entries.at(-1)).toMatchObject({
      id: 'chance:modernClampCommon', from: -10, to: 20,
    });
  }

  const sourceOrdered = Object.values(reports).find(report => report.sourceOrdered).sourceOrdered;
  const expectedChanceSteps = [
    ['plague', 'b', 'Plague'],
    ['warpReality', 'c', 'Warp Reality'],
    ['vertigo', 'c', 'Vertigo'],
    ['berserkWarlord', 'd', 'Berserk'],
    ['hurricane', 'd', 'Hurricane'],
  ];
  for (const [id, phase, label] of expectedChanceSteps) {
    const entry = sourceOrdered.statTrace.find(item => item.id === id);
    expect(entry).toMatchObject({ phase, source: { label } });
  }
  const sourceIds = sourceOrdered.statTrace.map(entry => entry.id);
  expect(sourceIds.indexOf('berserkWarlord'))
    .toBeLessThan(sourceIds.indexOf('modernClampCommon'));
  expect(sourceIds.indexOf('hurricane')).toBeLessThan(sourceIds.indexOf('clamp'));
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
        ...base, version: 'com2_warlord_1.5.12.7',
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

test('R7.4 renders complete trace tooltips only on affected final outputs, symmetrically', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.7');
  await setValue(page, 'aUnit', 'custom');
  await setValue(page, 'bUnit', 'custom');

  // Attacker: exercise numeric, percentage-point, race, and boolean projections.
  await setValue(page, 'aSpecialUnit', 'chosen');
  await setValue(page, 'aBaseRace', 'High Men');
  await setValue(page, 'aBaseFantastic', false);
  await setValue(page, 'aAtk', '3');
  await setValue(page, 'aToHitMod', '5');
  await setValue(page, 'aAbil_highPrayer', true);

  // Defender: exercise the same ordinary output on the opposite card plus one of the
  // independent modern strength projections.
  await setValue(page, 'bBaseHero', false);
  await setValue(page, 'bBaseFantastic', false);
  await setValue(page, 'bBaseRace', 'High Men');
  await setValue(page, 'bSpecialUnit', 'none');
  await setValue(page, 'bAbil_highPrayer', true);
  await setValue(page, 'bWeapon', 'mithril');
  // F42 records the existing custom-card reset on a loadout change. Set this fixture's
  // editable bases after that known reset so R7.4 remains isolated from the backlog defect.
  await setValue(page, 'bAtk', '3');
  await setValue(page, 'bModernRangedType', 'missile');
  await setValue(page, 'bModernRanged', '4');

  await expect(page.locator('#aAtkMod')).toHaveText('5');
  await expect(page.locator('#aAtkMod')).toHaveAttribute('data-tooltip',
    'Editable base: 3\nHigh Prayer (phase c): 3 → 5\nDisplayed result: 5');
  await expect(page.locator('#bAtkMod')).toHaveText('6');
  await expect(page.locator('#bAtkMod')).toHaveAttribute('data-tooltip',
    'Editable base: 3\nWeapon (phase c): 3 → 4'
      + '\nHigh Prayer (phase c): 4 → 6\nDisplayed result: 6');

  await expect(page.locator('#aToHitMeleeMod')).toHaveText('45%');
  await expect(page.locator('#aToHitMeleeMod')).toHaveAttribute('data-tooltip',
    'Editable base: 30%\nBase melee To Hit (phase base): 30% → 35%'
      + '\nHigh Prayer (phase c): 35% → 45%\nDisplayed result: 45%');
  await expect(page.locator('#aRaceMod')).toHaveText('Life');
  await expect(page.locator('#aRaceMod')).toHaveAttribute('data-tooltip',
    'Editable base: High Men\nChosen (phase a): High Men → Life\nDisplayed result: Life');
  await expect(page.locator('#aFantasticMod')).toHaveText('Yes');
  await expect(page.locator('#aFantasticMod')).toHaveAttribute('data-tooltip',
    'Editable base: No\nChosen (phase a): No → Yes\nDisplayed result: Yes');

  await expect(page.locator('#bModernRangedMod')).toHaveText('5');
  await expect(page.locator('#bModernRangedMod')).toHaveAttribute('data-tooltip',
    'Editable base: 4\nWeapon (phase c): 4 → 5\nDisplayed result: 5');

  // Pointer hover uses the existing shared tooltip and preserves the complete chain.
  const attackerTrace = await page.locator('#aAtkMod').getAttribute('data-tooltip');
  await page.locator('#aAtkMod').hover();
  await expect(page.locator('#tt')).toBeVisible();
  await expect(page.locator('#tt')).toHaveText(attackerTrace);
  const defenderTrace = await page.locator('#bAtkMod').getAttribute('data-tooltip');
  await page.locator('#bAtkMod').hover();
  await expect(page.locator('#tt')).toHaveText(defenderTrace);

  // Recalculation can occur while the pointer remains stationary (keyboard changes, restore,
  // presets). Keep the already-visible tooltip synchronized, then hide it when its last trace is
  // removed; requiring another mousemove would expose stale mechanics.
  await setValue(page, 'bLevel', 'elite');
  const updatedDefenderTrace = await page.locator('#bAtkMod').getAttribute('data-tooltip');
  expect(updatedDefenderTrace).toContain('Level (phase c)');
  await expect(page.locator('#tt')).toHaveText(updatedDefenderTrace);
  await setValue(page, 'bLevel', 'normal');
  await setValue(page, 'bWeapon', 'normal');
  await setValue(page, 'bAbil_highPrayer', false);
  await expect(page.locator('#bAtkMod')).toBeHidden();
  await expect(page.locator('#bAtkMod')).not.toHaveAttribute('data-tooltip', /.+/);
  await expect(page.locator('#tt')).toBeHidden();

  // No applied trace means no output and no tooltip. Existing explanatory tooltips on
  // editable controls remain ordinary model descriptions, never modifier chains.
  await expect(page.locator('#bHPMod')).toHaveText('');
  await expect(page.locator('#bHPMod')).not.toHaveAttribute('data-tooltip', /.+/);
  for (const selector of ['#aAtk', '#aAbil_highPrayer', '#rangedCheck']) {
    const text = await page.locator(selector).getAttribute('data-tooltip');
    expect(text || '').not.toContain('Editable base:');
    expect(text || '').not.toContain('Displayed result:');
  }
  const misplaced = await page.locator('[data-tooltip]').evaluateAll(elements => elements
    .filter(el => el.dataset.tooltip.startsWith('Editable base:') && !el.matches('.mod-val'))
    .map(el => el.id || el.className));
  expect(misplaced, 'modifier chains belong only to final-output spans').toEqual([]);
  expectNoConsoleErrors(errors);
});
