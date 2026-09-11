// The hover chain: the source-ordered trace behind every calculated stat, and
// its presentation in the tooltip and on the per-rider histograms.
const { test, expect } = require('@playwright/test');
const { expectNoConsoleErrors, openCalculator, setValue, warmDefaultStateCache } = require('./helpers');

// --- from modifier-traces.spec.js ---
const BASE_COPY_LINE = '— Calculated record seeded from the permanent record (phase a) —';
const writes = trace => trace.entries.filter(entry => !entry.boundary);

test('R7.3 projects source-ordered running chains for chance, identity, and modern channels', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => deriveUnitStats({
    prefix: 'a',
    version: 'com2_warlord_1.5.12.9',
    identity: createCustomUnitIdentity('com2_warlord_1.5.12.9', {
      baseRace: 'High Men', baseFantastic: false, specialUnit: 'chosen',
    }),
    figs: 1, atk: 5, def: 6, res: 8, hp: 7,
    rtb: 4, rtbType: 'missile',
    level: 'elite', weapon: 'mithril', armor: 'normal',
    hitMelee: 5, toBlkMod: 0,
    innateAbilities: { lucky: true },
    markedAbilities: { highPrayer: true, warpAttack: true, vertigo: true },
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
    // The boundary marker is a position, so a chain shows it at most once.
    expect(trace.entries.filter(entry => entry.boundary).length).toBeLessThanOrEqual(1);
  };
  for (const [key, trace] of Object.entries(report.modifierTraces)) {
    if (key !== 'modernAttacks') assertChain(trace);
  }

  // Every chain carries the marker once, the To-Hit/To-Block ledger's included: that ledger is
  // projected from the stat sequence, so it inherits the position as `chance:baseCopy`.
  expect(report.modifierTraces.melee.entries.filter(entry => entry.boundary)).toHaveLength(1);
  const hitBoundary = report.modifierTraces.toHitMelee.entries.filter(entry => entry.boundary);
  expect(hitBoundary).toHaveLength(1);
  expect(hitBoundary[0]).toMatchObject({ id: 'chance:baseCopy', projectionOf: 'a:baseCopy' });

  const meleeSources = writes(report.modifierTraces.melee).map(entry => entry.source.id);
  expect(meleeSources.indexOf('level')).toBeLessThan(meleeSources.indexOf('weapon'));
  expect(meleeSources.indexOf('weapon')).toBeLessThan(meleeSources.indexOf('highPrayer'));
  expect(meleeSources.indexOf('highPrayer')).toBeLessThan(meleeSources.indexOf('warpAttack'));

  const hitSources = writes(report.modifierTraces.toHitMelee).map(entry => entry.source.id);
  expect(hitSources[0]).toBe('baseThresholds');
  expect(hitSources.indexOf('level')).toBeLessThan(hitSources.indexOf('weapon'));
  expect(hitSources.indexOf('highPrayer')).toBeLessThan(hitSources.indexOf('vertigo'));
  expect(writes(report.modifierTraces.fantastic)[0].source.id).toBe('chosen');

  for (const key of ['ranged', 'thrown', 'fireBreath', 'lightningBreath']) {
    const channel = report.modernAttacks[key];
    expect(channel.modifierTrace.base).toBe(channel.baseStrength);
    expect(channel.modifierTrace.result).toBe(channel.strength);
    assertChain(channel.modifierTrace);
  }
  expectNoConsoleErrors(errors);
});

for (const half of ['innateAbilities', 'markedAbilities']) {
test(`R7.3 omits inactive, invalid, and no-op inputs from projected traces (${half})`, async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(half => deriveUnitStats({
    prefix: 'a', version: 'com2_1.05.11', name: 'Paladins',
    identity: createCustomUnitIdentity('com2_1.05.11', {
      baseRace: 'High Men', baseFantastic: false,
    }),
    figs: 1, atk: 4, def: 3, res: 5, hp: 6,
    rtb: 0, rtbType: 'none', modernAttacks: {},
    level: 'normal', weapon: 'normal', armor: 'normal',
    innateAbilities: { ...(half === 'innateAbilities' ? { holyBonus: 0 } : {}) },
    markedAbilities: { highPrayer: false, warpAttack: false,
      combatSummoned: true, // display name alone does not establish the retained template
      ...(half === 'markedAbilities' ? { holyBonus: 0 } : {}) },
  }), half);
  const sources = Object.values(report.modifierTraces)
    .filter(trace => trace && Array.isArray(trace.entries))
    .flatMap(trace => trace.entries.map(entry => entry.source.id));
  expect(sources).not.toContain('highPrayer');
  expect(sources).not.toContain('warpAttack');
  expect(sources).not.toContain('holyBonus');
  expect(sources).not.toContain('callToArmsPaladins');
  expectNoConsoleErrors(errors);
});

}

test('F5 keeps modern common and channel chance writes on the ordered record', async ({ page }) => {
  const errors = await openCalculator(page);
  const reports = await page.evaluate(() => Object.fromEntries(
    ['com2_1.05.11', 'com2_warlord_1.5.12.9'].map(version => [version, {
      twoStage: deriveUnitStats({
      prefix: 'a', version,
      identity: createCustomUnitIdentity(version, { baseRace: 'High Men' }),
      figs: 1, atk: 1, rtb: 1, rtbType: 'missile', def: 1, res: 1, hp: 1,
      modernAttacks: { ranged: { strength: 1, type: 'missile' } },
      level: 'normal', weapon: 'normal', armor: 'normal', innateAbilities: {}, markedAbilities: {},
      hitChance: -50, hitRanged: 10, hitThrown: 10, hitBreath: 10, toBlkMod: -40,
      }),
      orderedClamp: deriveUnitStats({
        prefix: 'a', version,
        identity: createCustomUnitIdentity(version, { baseRace: 'High Men' }),
        figs: 1, atk: 1, rtb: 1, rtbType: 'missile', def: 1, res: 1, hp: 1,
        modernAttacks: { ranged: { strength: 1, type: 'missile' } },
        level: 'normal', weapon: 'normal', armor: 'normal', innateAbilities: {}, markedAbilities: {},
        hitChance: -50, hitRanged: 150, hitThrown: 150, hitBreath: 150, toBlkMod: 0,
      }),
      sourceOrdered: version.startsWith('com2_warlord') ? deriveUnitStats({
        prefix: 'a', version,
        identity: createCustomUnitIdentity(version, { baseRace: 'High Men' }),
        figs: 1, atk: 5, rtb: 5, rtbType: 'missile', def: 5, res: 6, hp: 5,
        modernAttacks: { ranged: { strength: 5, type: 'missile' } },
        level: 'normal', weapon: 'normal', armor: 'normal',
        innateAbilities: {}, markedAbilities: { plague: true, vertigo: true, berserkWarlord: true },
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
    expect(report.modifierTraces.toHitShared.entries.at(-1)).toMatchObject({
      id: 'chance:modernClampCommon', from: -10, to: 20,
    });
  }

  const sourceOrdered = Object.values(reports).find(report => report.sourceOrdered).sourceOrdered;
  const expectedChanceSteps = [
    ['plague', 'b', 'Plague'],
    ['warpReality', 'c', 'Warp Reality'],
    ['vertigo', 'c', 'Vertigo'],
    ['berserkWarlord', 'b', 'Berserk'],
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
      prefix: 'a', figs: 1, level: 'normal', weapon: 'normal', armor: 'normal',
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
    };
    return {
      destiny: deriveUnitStats({
        ...base, version: 'com2_1.05.11',
        atk: 3, rtb: 2, rtbType: 'missile', def: 1, res: 4, hp: 2,
        modernAttacks: { ranged: { strength: 2, type: 'missile' } },
        innateAbilities: {}, markedAbilities: { destiny: true },
      }),
      shadowStrike: deriveUnitStats({
        ...base, version: 'com2_warlord_1.5.12.9',
        atk: 6, rtb: 0, rtbType: 'none', def: 1, res: 1, hp: 1,
        innateAbilities: {}, markedAbilities: { shadowStrike: true }, modernAttacks: {},
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
    expect(writes(trace)).toHaveLength(1);
    expect(writes(trace)[0]).toMatchObject({
      source: { id: 'destiny', label: 'Destiny' }, from, to,
    });
    expect(trace.result).toBe(to);
  }

  const channel = report.shadowStrike.modernAttacks.thrown;
  expect(channel.baseStrength).toBe(0);
  expect(channel.modifierTrace.base).toBe(0);
  expect(writes(channel.modifierTrace)).toHaveLength(1);
  expect(writes(channel.modifierTrace)[0]).toMatchObject({
    source: { id: 'shadowStrike:thrown', label: 'Shadow Strike' },
    from: 0,
    to: 3,
  });
  expect(channel.modifierTrace.result).toBe(channel.strength);
  expectNoConsoleErrors(errors);
});

test('R7.4 renders complete trace tooltips only on affected final outputs, symmetrically', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
  await setValue(page, 'aUnit', 'custom');
  await setValue(page, 'bUnit', 'custom');

  // Attacker: exercise numeric, percentage-point, race, and boolean projections.
  await setValue(page, 'aSpecialUnit', 'chosen');
  await setValue(page, 'aBaseRace', 'High Men');
  await setValue(page, 'aBaseFantastic', false);
  await setValue(page, 'aAtk', '3');
  // Warlord carries the modern To Hit record: a common `hitchance` plus one modifier per
  // To-Hit field. The melee row resolves the two together, so state both.
  await setValue(page, 'aHitChance', '0');
  await setValue(page, 'aHitMelee', '5');
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
    `Editable base: 3\n${BASE_COPY_LINE}`
      + '\nHigh Prayer (phase c): 3 → 5\nDisplayed result: 5');
  await expect(page.locator('#bAtkMod')).toHaveText('6');
  await expect(page.locator('#bAtkMod')).toHaveAttribute('data-tooltip',
    `Editable base: 3\n${BASE_COPY_LINE}`
      + '\nWeapon (phase c): 3 → 4'
      + '\nHigh Prayer (phase c): 4 → 6\nDisplayed result: 6');

  await expect(page.locator('#aHitMeleeDisp')).toHaveText('45%');
  await expect(page.locator('#aHitMeleeDisp')).toHaveAttribute('data-tooltip',
    `Editable base: 30%\nBase To Hit / To Block (phase template): 30% → 35%`
      + `\n${BASE_COPY_LINE}`
      + '\nHigh Prayer (phase c): 35% → 45%\nDisplayed result: 45%');
  // The common row shows that field alone, so the melee-only modifier above is absent from
  // it while the write High Prayer makes to the common field appears in both.
  await expect(page.locator('#aHitChanceDisp')).toHaveText('40%');
  await expect(page.locator('#aRaceMod')).toHaveText('Life');
  await expect(page.locator('#aRaceMod')).toHaveAttribute('data-tooltip',
    `Editable base: High Men\n${BASE_COPY_LINE}`
      + '\nChosen (phase a): High Men → Life\nDisplayed result: Life');
  await expect(page.locator('#aFantasticMod')).toHaveText('Yes');
  await expect(page.locator('#aFantasticMod')).toHaveAttribute('data-tooltip',
    `Editable base: No\n${BASE_COPY_LINE}`
      + '\nChosen (phase a): No → Yes\nDisplayed result: Yes');

  await expect(page.locator('#bModernRangedMod')).toHaveText('5');
  await expect(page.locator('#bModernRangedMod')).toHaveAttribute('data-tooltip',
    `Editable base: 4\n${BASE_COPY_LINE}`
      + '\nWeapon (phase c): 4 → 5\nDisplayed result: 5');

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

test('the boundary survives a transform appended after the projection is built', async ({ page }) => {
  // The displayed Defense penalty is `displayDefense:vertigo`, appended to the finished
  // projection rather than emitted by the sequence. With Vertigo the only modifier, the chain the
  // sequence itself produced holds nothing but the boundary marker, so a projection that dropped
  // a marker-only chain would render a tooltip that crosses the recalculation with no divider.
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'mom_1.31');
  await setValue(page, 'aUnit', 'custom');
  await setValue(page, 'aDef', '5');
  await setValue(page, 'aAbil_vertigo', true);

  await expect(page.locator('#aDefMod')).toHaveText('4');
  await expect(page.locator('#aDefMod')).toHaveAttribute('data-tooltip',
    `Editable base: 5\n${BASE_COPY_LINE}`
      + '\nVertigo (phase attackSpecific): 5 → 4\nDisplayed result: 4');
  expectNoConsoleErrors(errors);
});

// --- from modifier-trace-tooltips.spec.js ---
async function configureTracedCards(page) {
  await page.evaluate(() => {
    const version = document.getElementById('gameVersion');
    version.value = 'com2_warlord_1.5.12.9';
    version.dispatchEvent(new Event('change', { bubbles: true }));
    // Warm this version's default-state cache before configuring the cards. Otherwise the
    // delayed persistence hook can build the cache mid-assertion, briefly resetting the DOM.
    collectState();

    for (const prefix of ['a', 'b']) {
      document.getElementById(prefix + 'Atk').value = prefix === 'a' ? 5 : 6;
      document.getElementById(prefix + 'ModernRangedType').value = 'missile';
      document.getElementById(prefix + 'ModernRanged').value = 4;
      document.getElementById(prefix + 'Level').value = 'elite';
      const prayer = document.getElementById(prefix + 'Abil_highPrayer');
      prayer.checked = true;
      document.getElementById(prefix + 'BaseFantastic').checked = false;
      document.getElementById(prefix + 'BaseRace').value = 'High Men';
      document.getElementById(prefix + 'SpecialUnit').value = 'none';
      setCustomUnitIdentity(prefix, version.value, null, true);
    }

    const chosen = document.getElementById('aSpecialUnit');
    chosen.value = 'chosen';
    setCustomUnitIdentity('a', version.value, null, true);
    recalculate();
  });
}

test('calculated outputs render complete ordered chains on hover for both sides', async ({ page }) => {
  const errors = await openCalculator(page);
  await configureTracedCards(page);
  const entryCounts = await page.evaluate(() => ({
    a: readUnitStats('a').modifierTraces.melee.entries.length,
    b: readUnitStats('b').modifierTraces.melee.entries.length,
  }));

  for (const selector of ['#aAtkMod', '#bAtkMod']) {
    const output = page.locator(selector);
    await expect(output).toBeVisible();
    const chain = await output.getAttribute('data-tooltip');
    expect(chain).toContain('Editable base:');
    expect(chain).toContain('High Prayer (phase');
    expect(chain).toContain(' → ');
    expect(chain).toContain('Displayed result:');
    expect(chain.split('\n')).toHaveLength(entryCounts[selector[1]] + 2);

    await output.hover();
    await expect(page.locator('#tt')).toHaveText(chain);
  }
  const defenderChain = await page.locator('#bAtkMod').getAttribute('data-tooltip');
  expect(defenderChain.indexOf('Level (phase')).toBeLessThan(
    defenderChain.indexOf('High Prayer (phase'));

  // R7.3's percentage-point, identity/boolean, and channel projections use the same formatter.
  await expect(page.locator('#aToHitMeleeMod')).toHaveAttribute('data-tooltip', /\d+% → \d+%/);
  await expect(page.locator('#aFantasticMod')).toHaveAttribute('data-tooltip', /No → Yes/);
  await expect(page.locator('#aRaceMod')).toHaveAttribute('data-tooltip', /High Men → Life/);
  await expect(page.locator('#aModernRangedMod')).toHaveAttribute('data-tooltip', /Editable base: 4/);
  await expect(page.locator('#bModernRangedMod')).toHaveAttribute('data-tooltip', /Editable base: 4/);

  expectNoConsoleErrors(errors);
});

test('trace tooltips stay off editable controls and unmodified outputs, and clear when inactive', async ({ page }) => {
  const errors = await openCalculator(page);
  await configureTracedCards(page);

  // Existing mechanic tooltips remain, but the trace bookends belong only to final outputs.
  for (const selector of [
    '#aAtk', '#aBaseFantastic', '#aSpecialUnit',
    '#aAbil_highPrayer', '#rangedCheck',
  ]) {
    const tooltip = await page.locator(selector).getAttribute('data-tooltip');
    expect(tooltip || '').not.toContain('Editable base:');
    expect(tooltip || '').not.toContain('Displayed result:');
  }
  await expect(page.locator('#aFigsMod')).not.toHaveAttribute('data-tooltip', /.+/);

  await page.evaluate(() => {
    const prayer = document.getElementById('bAbil_highPrayer');
    prayer.checked = false;
    document.getElementById('bLevel').value = 'normal';
    recalculate();
  });
  await expect(page.locator('#bAtkMod')).toBeHidden();
  await expect(page.locator('#bAtkMod')).not.toHaveAttribute('data-tooltip', /.+/);

  expectNoConsoleErrors(errors);
});

test('visible trace refreshes and hides while the pointer remains stationary', async ({ page }) => {
  const errors = await openCalculator(page);
  await page.evaluate(() => {
    document.getElementById('aAbil_highPrayer').checked = true;
    recalculate();
  });

  const output = page.locator('#aAtkMod');
  const tip = page.locator('#tt');
  await output.hover();
  const initial = await output.getAttribute('data-tooltip');
  await expect(tip).toHaveText(initial);
  expect(initial).not.toContain('Lionheart (phase');

  // The debounced save builds this version's default-state cache by resetting the whole page
  // to defaults, snapshotting, and restoring — so the traced output loses and regains its
  // tooltip with the pointer stationary. Wait for the write that follows it, then require the
  // overlay to have survived: the reset used to drop the hover owner permanently (F134).
  await page.waitForFunction(() =>
    typeof PAGE_STATE_KEY === 'string' && localStorage.getItem(PAGE_STATE_KEY) !== null);
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(initial);

  // Recalculate without another pointer action. The visible overlay must track the same owner.
  await page.evaluate(() => {
    document.getElementById('aAbil_lionheart').checked = true;
    recalculate();
  });
  const updated = await output.getAttribute('data-tooltip');
  expect(updated).toContain('Lionheart (phase');
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(updated);

  // Removing the final two transforms makes the output inactive and must hide the old overlay.
  await page.evaluate(() => {
    document.getElementById('aAbil_lionheart').checked = false;
    document.getElementById('aAbil_highPrayer').checked = false;
    recalculate();
  });
  await expect(output).toBeHidden();
  await expect(output).not.toHaveAttribute('data-tooltip', /.+/);
  await expect(tip).toBeHidden();

  expectNoConsoleErrors(errors);
});

// F222.5: the same presentation, on the per-rider histograms inside a phase row. Each rider's
// name span carries the chain of the effective resistance or effective defense that produced
// its number, and a resistance chain is headed by the realm its roll named — because one
// defender has one effective resistance per realm its attacker's riders name, and this matchup
// has four of them standing at once.
// No authored preset puts four riders on one attacker, so the fixture is installed through the
// harness door `applyPreset` already documents and applied by the app's own driver, which is
// what keeps a renamed or version-gated control failing here rather than being bypassed.
async function configureRiderCards(page) {
  await page.evaluate(() => {
    PRESETS.f222_5RiderChains = {
      desc: 'F222.5: four rider realms of one defender inside one attack.',
      version: 'com2_1.05.11',
      a: { atk: 4, hitChance: 70, hp: 10, figs: 1,
        abilities: { stoningTouch: -3, deathTouch: -2, destruction: -1, poison: 1 } },
      b: { figs: 2, def: 4, toBlkMod: 0, res: 8, hp: 6, cityWalls: '3',
        abilities: { bless: true, resistMagic: true, elemArmor: 'resistElements' } },
      expected: { dmgToA: 0, dmgToB: 0 },
    };
    applyPreset('f222_5RiderChains');
  });
}

async function riderChainTooltips(page) {
  return page.evaluate(() => Object.fromEntries(
    [...document.querySelectorAll('#breakdownGrid .rider-panel')].map(panel => [
      panel.dataset.riderKey + '|' + panel.dataset.riderSide,
      (panel.querySelector('.rider-name') || {}).dataset.tooltip,
    ])));
}

test('each rider histogram carries its chain, headed by the realm its roll named', async ({ page }) => {
  const errors = await openCalculator(page);
  await configureRiderCards(page);
  // The fixture declares `version: 'com2_1.05.11'`, so that version's default-state cache is cold
  // and the debounced save rebuilds the DOM 250 ms later, wiping `#breakdownGrid` under the node
  // scrolled below. Today the rebuild lands during `riderChainTooltips` and the scroll is safe by
  // timing rather than by construction; take the rebuild here instead (F241).
  await warmDefaultStateCache(page);
  const chains = await riderChainTooltips(page);

  // Four realms of one defender inside one attack, and they are not one figure under four
  // names: Resist Elements answers Nature, Bless and Resist Magic answer Death and Chaos,
  // and the realm-less Poison roll takes none of them.
  expect(chains['stoningTouch|def']).toContain('Effective Resistance (defender) vs Nature');
  expect(chains['stoningTouch|def']).toContain('Resist Elements (phase attackSpecific): 8 → 12');
  expect(chains['stoningTouch|def']).toContain('Resist Magic (phase attackSpecific): 12 → 17');
  expect(chains['deathTouch|def']).toContain('Effective Resistance (defender) vs Death');
  expect(chains['deathTouch|def']).toContain('Bless (phase attackSpecific): 8 → 13');
  expect(chains['destruction|def']).toContain('Effective Resistance (defender) vs Chaos');
  expect(chains['poison|def']).toContain('Effective Resistance (defender), realm-less roll');
  // Two of the four answer the same figure and one of the others does not, which is exactly
  // why the header has to name the realm: 18 under "Death" and 18 under "Chaos" are two
  // different questions, and 17 under "Nature" is a third.
  expect(chains['deathTouch|def']).toContain('Displayed result: 18');
  expect(chains['destruction|def']).toContain('Displayed result: 18');

  // The bookends R7.4 renders everywhere else, on a rider chain too.
  expect(chains['stoningTouch|def']).toContain('Editable base: 8');
  expect(chains['stoningTouch|def']).toContain('Displayed result: 17');
  expect(chains['poison|def'].split('\n')).toContain('Editable base: 8');
  expect(chains['poison|def'].split('\n')).toContain('Displayed result: 8');

  // The base-roll slot is scored against Defense, not resistance, and says so — with the
  // City Walls the modern EffectiveDefense seed folds in named as its own transform rather
  // than hidden inside the base.
  expect(chains['melee|def']).toContain('Effective Defense (defender)');
  expect(chains['melee|def']).not.toContain('Effective Resistance');
  expect(chains['melee|def']).toContain('Editable base: 4');
  expect(chains['melee|def']).toContain('City Walls (phase attackSpecific): 4 → 7');
  expect(chains['melee|def']).toContain('Displayed result: 7');

  // And the chain the reader sees on hover is the one the attribute carries.
  const name = page.locator('#breakdownGrid .rider-panel[data-rider-key="stoningTouch"] .rider-name');
  await name.scrollIntoViewIfNeeded();
  await name.hover();
  await expect(page.locator('#tt')).toHaveText(chains['stoningTouch|def']);

  expectNoConsoleErrors(errors);
});

test('a rider that cannot land keeps its chain, which is what makes the zero readable', async ({ page }) => {
  const errors = await openCalculator(page);
  // stoningHighRes: Stoning -3 against Res 13 leaves 10, which no petrify roll can fail. The
  // rider draws with all its mass at 0 (R5), and its chain names the figure it had to beat.
  await page.evaluate(() => { applyPreset('stoningHighRes'); });
  const chains = await riderChainTooltips(page);
  expect(chains['stoningTouch|def']).toContain('Effective Resistance (defender) vs Nature');
  expect(chains['stoningTouch|def']).toContain('Displayed result: 13');
  expectNoConsoleErrors(errors);
});
