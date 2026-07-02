// Responsive layout of the main calculator window.
// - No horizontal page scroll at any tested width.
// - At phone widths (<=700) the three .four-col-row children stack
//   attacker -> defender -> results.
// - At desktop widths (>=1400) the three sit side by side.
// Matrix modal layout is out of scope and not exercised here.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

// Bounding boxes of the three .four-col-row children, in DOM order.
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
