// Shared helpers for the Playwright UI suite.
const { expect } = require('@playwright/test');

// Navigate to the calculator with a clean slate and console-error tracking.
// - Blocks the Plausible analytics script so test runs don't pollute stats.
// - Clears localStorage on every navigation so persisted state can't leak
//   between tests (share-link hashes still take precedence and work normally).
// - Returns an array that accumulates console errors and page crashes; call
//   expectNoConsoleErrors(errors) at the end of the test.
async function openCalculator(page, path = '/') {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  // Stub (not abort) the analytics script: aborting logs a console error,
  // which would trip expectNoConsoleErrors.
  await page.route('**://plausible.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.addInitScript(() => {
    try { localStorage.clear(); } catch (e) {}
  });
  await page.goto(path);
  await page.waitForFunction(() => typeof window.collectState === 'function');
  return errors;
}

function expectNoConsoleErrors(errors) {
  expect(errors, 'no console errors or page crashes during the test').toEqual([]);
}

// Set an input/select value the way a user would, so the app's input/change
// listeners fire and state/recalc updates.
async function setValue(page, id, value) {
  await page.evaluate(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) throw new Error('no element #' + id);
    if (el.type === 'checkbox') el.checked = !!value;
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, [id, value]);
}

module.exports = { openCalculator, expectNoConsoleErrors, setValue };
