// The page renders usably: layout invariants, the mobile breakpoint, and touch
// tooltip behaviour. Nothing here asserts a number.
const { test, expect } = require('@playwright/test');
const { expectNoConsoleErrors, gameVersions, openCalculator, setValue, warmDefaultStateCache } = require('./helpers');

// --- from layout-invariants.spec.js ---
const VERSIONS = gameVersions();
const REALM_RANK = { '': 0, arcane: 1, life: 2, death: 3, chaos: 4, nature: 5, sorcery: 6 };

for (const version of VERSIONS) {
  test(`ench-bools is realm-ordered (${version})`, async ({ page }) => {
    const errors = await openCalculator(page);
    await setValue(page, 'gameVersion', version);

    // Show all so version-hidden items are the only ones excluded, then read
    // the realm rank of each visible checkbox item in DOM order.
    const ranks = await page.evaluate((rank) => {
      document.querySelectorAll('#aAbilities .toggle-abil-btn').forEach(btn => {
        if (btn.textContent === 'Show all') btn.click();
      });
      const block = document.querySelector('#aAbilities .ench-bools');
      if (!block) return null;
      return [...block.querySelectorAll('.abil-item')]
        .filter(el => !el.classList.contains('abil-hidden'))
        .map(el => ({ realm: el.dataset.realm || '', rank: rank[el.dataset.realm || ''] ?? 0 }));
    }, REALM_RANK);

    expect(ranks, '.ench-bools block exists').not.toBeNull();
    expect(ranks.length, 'block has visible checkbox items').toBeGreaterThan(1);

    // Non-decreasing realm rank down the block.
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i].rank, `item ${i} (realm ${ranks[i].realm}) not before item ${i - 1} (realm ${ranks[i - 1].realm})`)
        .toBeGreaterThanOrEqual(ranks[i - 1].rank);
    }
    expectNoConsoleErrors(errors);
  });
}

// --- from mobile-layout.spec.js ---
async function childBoxes(page) {
  return page.evaluate(() => {
    // results-area has no id — grab it as the middle flex child.
    const row = document.querySelector('.four-col-row');
    const kids = [
      document.getElementById('panelA'),
      row.querySelector('.results-area'),
      document.getElementById('panelB'),
    ];
    return kids.map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    });
  });
}

test('main calculator is responsive across viewport widths', async ({ page }) => {
  const errors = await openCalculator(page);

  for (const width of [360, 390, 700, 768, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    // Let layout settle.
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    // (a) No horizontal document scroll.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `no horizontal scroll at ${width}px`).toBeLessThanOrEqual(0);

    // (b) At <=700 the three children stack attacker -> defender -> results.
    if (width <= 700) {
      const [a, results, b] = await childBoxes(page);
      expect(b.top, `defender below attacker at ${width}px`)
        .toBeGreaterThanOrEqual(a.bottom - 1);
      expect(results.top, `results below defender at ${width}px`)
        .toBeGreaterThanOrEqual(b.bottom - 1);
    }
  }

  // (c) At a desktop width the three are side by side (tops roughly equal).
  await page.setViewportSize({ width: 1500, height: 900 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const [a, results, b] = await childBoxes(page);
  expect(Math.abs(a.top - results.top), 'attacker/results tops aligned at 1500px').toBeLessThanOrEqual(2);
  expect(Math.abs(results.top - b.top), 'results/defender tops aligned at 1500px').toBeLessThanOrEqual(2);
  // And genuinely horizontally separated.
  expect(a.right).toBeLessThanOrEqual(results.left + 1);
  expect(results.right).toBeLessThanOrEqual(b.left + 1);

  expectNoConsoleErrors(errors);
});

// --- from touch-tooltips.spec.js ---

test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

// Fire a synthetic single-finger touch event at the center of an element.
async function touch(page, selector, type) {
  await page.evaluate(([selector, type]) => {
    const el = document.querySelector(selector);
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    el.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true,
      touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
    }));
  }, [selector, type]);
}

test('long-press shows a tooltip; tap does not; next tap dismisses', async ({ page }) => {
  const errors = await openCalculator(page);
  const tip = page.locator('#tt');

  // Any tooltip-bearing label in the attacker panel.
  const target = '#panelA .panel-fields label[data-tooltip]';
  const expected = await page.locator(target).first().getAttribute('data-tooltip');

  // Quick tap: tooltip must NOT appear.
  await touch(page, target, 'touchstart');
  await touch(page, target, 'touchend');
  await page.waitForTimeout(700);
  await expect(tip).toBeHidden();

  // Long-press: tooltip appears with the element's text and survives release.
  await touch(page, target, 'touchstart');
  await page.waitForTimeout(700);
  await expect(tip).toBeVisible();
  await expect(tip).toHaveText(expected);
  await touch(page, target, 'touchend');
  await expect(tip).toBeVisible();

  // Tooltip stays within the viewport on a narrow screen.
  const box = await tip.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);

  // A tap elsewhere dismisses it.
  await touch(page, 'h1', 'touchstart');
  await touch(page, 'h1', 'touchend');
  await expect(tip).toBeHidden();

  expectNoConsoleErrors(errors);
});

test('inputs render at >=16px on phones so iOS does not zoom on focus', async ({ page }) => {
  const errors = await openCalculator(page);
  for (const id of ['aAtk', 'gameVersion', 'aUnitSearch']) {
    const size = await page.locator('#' + id).evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    expect(size, `#${id} font-size`).toBeGreaterThanOrEqual(16);
  }
  expectNoConsoleErrors(errors);
});

test('long-press exposes the same modifier chain from a calculated output', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'aAbil_highPrayer', true);
  // Take the deferred rebuild the recalculate above armed, before anything is resolved out of
  // the render. `#aAtkMod` is a static element of index.html and survives it, but the rebuild
  // would otherwise still be pending across the touch sequence below.
  await warmDefaultStateCache(page);
  const target = '#aAtkMod';
  await page.locator(target).scrollIntoViewIfNeeded();
  const expected = await page.locator(target).getAttribute('data-tooltip');
  expect(expected).toBe('Editable base: 3'
    + '\n— Calculated record seeded from the permanent record (phase a) —'
    + '\nHigh Prayer (phase c): 3 → 5\nDisplayed result: 5');

  await touch(page, target, 'touchstart');
  await page.waitForTimeout(700);
  await expect(page.locator('#tt')).toBeVisible();
  await expect(page.locator('#tt')).toHaveText(expected);
  await touch(page, target, 'touchend');
  await expect(page.locator('#tt')).toBeVisible();
  expectNoConsoleErrors(errors);
});

test('long-press exposes a rider histogram\'s effective-resistance chain', async ({ page }) => {
  const errors = await openCalculator(page);
  // The rider chains hang on a span inside a scrolling histogram, which is the one place a
  // touch tooltip could be lost to the panel's own scroll handling rather than shown.
  await page.evaluate(() => { applyPreset('stoningTouchBasic'); });
  // The target lives under #breakdownGrid, which the deferred rebuild wipes with
  // `innerHTML = ''`. Take that rebuild now, or it lands between the locator resolving and the
  // scroll acting and the scroll reports `Element is not attached to the DOM` (F241).
  await warmDefaultStateCache(page);
  const target = '#breakdownGrid .rider-panel[data-rider-key="stoningTouch"] .rider-name';
  await page.locator(target).scrollIntoViewIfNeeded();
  const expected = await page.locator(target).getAttribute('data-tooltip');
  expect(expected).toContain('Effective Resistance (defender) vs Nature');
  expect(expected).toContain('Editable base:');
  expect(expected).toContain('Displayed result:');

  await touch(page, target, 'touchstart');
  await page.waitForTimeout(700);
  await expect(page.locator('#tt')).toBeVisible();
  await expect(page.locator('#tt')).toHaveText(expected);
  await touch(page, target, 'touchend');
  await expect(page.locator('#tt')).toBeVisible();

  // A tap elsewhere dismisses it, as it does for every other tooltip.
  await touch(page, 'h1', 'touchstart');
  await touch(page, 'h1', 'touchend');
  await expect(page.locator('#tt')).toBeHidden();
  expectNoConsoleErrors(errors);
});
