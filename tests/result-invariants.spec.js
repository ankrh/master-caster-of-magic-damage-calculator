// Result-panel invariants for a mid-strength melee matchup. These assert
// structural properties of the output, never specific damage numbers.
//
// (a) The rendered damage distribution is a probability distribution:
//     each row's chance is in [0,1] and they sum to ~1 (parsed from the DOM
//     percentages, so a rounding tolerance applies).
// (b) Monotonicity: raising the attacker's Atk never lowers the mean damage
//     dealt to the defender; raising the defender's Def never raises it.
// (c) Swap symmetry: #swapBtn is involutive on collectState(), and one swap
//     actually exchanges the two sides.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

// Switch both sides to custom units so ability checkboxes/stat fields are freely
// editable (a roster unit locks its panel).
async function selectCustom(page) {
  await page.evaluate(() => {
    for (const p of ['a', 'b']) {
      const el = document.getElementById(p + 'Unit');
      el.value = 'custom';
      el.dispatchEvent(new Event('change'));
    }
  });
}

async function midMatchup(page) {
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await selectCustom(page);
  await setValue(page, 'aFigs', '6');
  await setValue(page, 'aAtk', '7');
  await setValue(page, 'aHP', '4');
  await setValue(page, 'aDmg', '0');
  await setValue(page, 'bFigs', '6');
  await setValue(page, 'bDef', '4');
  await setValue(page, 'bHP', '8');
  await setValue(page, 'bDmg', '0');
}

// Parse the chance percentages rendered in a result panel into fractions.
async function distProbs(page, panelId) {
  return page.evaluate((panelId) => {
    const cells = document.querySelectorAll('#' + panelId + ' .dist-table tbody tr .chance-text');
    return [...cells].map(c => parseFloat(c.textContent) / 100);
  }, panelId);
}

async function meanDmgToDefender(page) {
  const txt = await page.locator('#distB .dist-header .avg').innerText();
  return parseFloat(txt);
}

test('rendered distribution is a valid probability distribution', async ({ page }) => {
  const errors = await openCalculator(page);
  await midMatchup(page);

  for (const panelId of ['distA', 'distB']) {
    const probs = await distProbs(page, panelId);
    expect(probs.length, `${panelId} renders rows`).toBeGreaterThan(1);
    for (const p of probs) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    const sum = probs.reduce((a, b) => a + b, 0);
    // One-decimal percentage rounding across many rows -> loose tolerance.
    expect(sum, `${panelId} probabilities sum to ~1`).toBeGreaterThan(0.95);
    expect(sum, `${panelId} probabilities sum to ~1`).toBeLessThan(1.05);
  }
  expectNoConsoleErrors(errors);
});

test('mean damage is monotonic in attacker Atk and defender Def', async ({ page }) => {
  const errors = await openCalculator(page);
  await midMatchup(page);

  // Rising Atk -> non-decreasing damage to defender.
  let prev = -Infinity;
  const atkMeans = [];
  for (const atk of [4, 6, 8, 10, 12]) {
    await setValue(page, 'aAtk', String(atk));
    const m = await meanDmgToDefender(page);
    expect(m, `Atk=${atk} not below Atk<${atk}`).toBeGreaterThanOrEqual(prev - 1e-9);
    prev = m;
    atkMeans.push(m);
  }
  // Sanity (mutation gate): the sweep must actually move the number.
  expect(atkMeans[atkMeans.length - 1]).toBeGreaterThan(atkMeans[0]);

  // Rising Def -> non-increasing damage to defender.
  await setValue(page, 'aAtk', '8');
  prev = Infinity;
  const defMeans = [];
  for (const def of [1, 3, 5, 7, 9]) {
    await setValue(page, 'bDef', String(def));
    const m = await meanDmgToDefender(page);
    expect(m, `Def=${def} not above Def<${def}`).toBeLessThanOrEqual(prev + 1e-9);
    prev = m;
    defMeans.push(m);
  }
  expect(defMeans[0]).toBeGreaterThan(defMeans[defMeans.length - 1]);

  expectNoConsoleErrors(errors);
});

test('swap button is involutive and exchanges the two sides', async ({ page }) => {
  const errors = await openCalculator(page);

  // Asymmetric configuration.
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await selectCustom(page);
  await setValue(page, 'aAtk', '9');
  await setValue(page, 'aFigs', '4');
  await setValue(page, 'bDef', '6');
  await setValue(page, 'bHP', '12');
  await setValue(page, 'aAbil_firstStrike', true);

  const before = await page.evaluate(() => collectState());
  const aAtk0 = await page.locator('#aAtk').inputValue();
  const bDef0 = await page.locator('#bDef').inputValue();

  await page.click('#swapBtn');

  // One swap actually exchanges sides: firstStrike moved to defender, stats swapped.
  await expect(page.locator('#bAbil_firstStrike')).toBeChecked();
  await expect(page.locator('#aAbil_firstStrike')).not.toBeChecked();
  expect(await page.locator('#bAtk').inputValue()).toBe(aAtk0);
  expect(await page.locator('#aDef').inputValue()).toBe(bDef0);

  const once = await page.evaluate(() => collectState());
  expect(once, 'a single swap changes state').not.toEqual(before);

  // Involution: swapping again returns to the original state.
  await page.click('#swapBtn');
  const twice = await page.evaluate(() => collectState());
  expect(twice).toEqual(before);

  expectNoConsoleErrors(errors);
});
