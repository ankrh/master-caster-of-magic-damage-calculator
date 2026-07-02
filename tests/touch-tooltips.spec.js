// Touch tooltip behavior (long-press shows, tap dismisses) and the iOS
// focus-zoom guard (>=16px input text at phone widths).
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

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
