// R7.4 presentation of R7.3's calculated-output traces.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

async function configureTracedCards(page) {
  await page.evaluate(() => {
    const version = document.getElementById('gameVersion');
    version.value = 'com2_warlord_1.5.12.7';
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
