// The PRESETS suite is the authority for calculation correctness (Calculator/CLAUDE.md).
// It is browser-only by design: applyPreset drives the real controls and runTests reads the
// rendered averages back out, so DOM wiring and calcKey behavior are part of what it checks.
// Every other spec in this directory defers numeric correctness to it.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

// One page load drives every preset, so the whole suite is a single test. It runs well past
// the 30s project default: each preset applies its controls and forces a full recalculation.
test('every PRESETS damage expectation holds', async ({ page }) => {
  test.setTimeout(600_000);
  const errors = await openCalculator(page);

  const result = await page.evaluate(() => runTests());

  // A zero-length run passes vacuously, which is the one failure mode that looks green.
  expect(result.total, 'runTests evaluated no presets').toBeGreaterThan(0);

  const detail = result.failures
    .map(f => `  ${f.name}: A=${f.dmgToA} (expected ${f.expectedA}, err ${f.errA}), `
            + `B=${f.dmgToB} (expected ${f.expectedB}, err ${f.errB})`)
    .join('\n');
  expect(result.allPassed,
    `${result.failures.length}/${result.total} presets failed:\n${detail}`).toBe(true);

  // runTests logs its own failure summary through console.error, so this only adds signal
  // once the assertions above are green: an incidental page error during a preset run.
  expectNoConsoleErrors(errors);
});
