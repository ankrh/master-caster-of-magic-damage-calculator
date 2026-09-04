// R7.4 presentation of R7.3's calculated-output traces.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, warmDefaultStateCache } = require('./helpers');

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
