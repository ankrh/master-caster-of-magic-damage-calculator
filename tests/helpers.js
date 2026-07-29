// Shared helpers for the Playwright UI suite.
const { expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// The gameVersion <option> list in index.html is the authoritative set of versions — one the
// dropdown does not offer cannot be selected. Read it instead of restating it here, so a
// version added or renamed there is covered automatically.
//
// A hardcoded copy can only fail in the direction that looks fine: miss a version and the
// suite silently tests fewer of them while still reporting green. Hence the throws below —
// returning an empty list would generate zero tests and pass.
//
// Synchronous on purpose: Playwright collects tests at module load, before any page exists,
// so this cannot read the list out of a live DOM.
function gameVersions() {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const select = html.match(/<select id="gameVersion">([\s\S]*?)<\/select>/);
  if (!select) throw new Error('helpers.gameVersions: no <select id="gameVersion"> in index.html');
  const versions = [...select[1].matchAll(/<option value="([^"]+)"/g)].map(m => m[1]);
  if (!versions.length) throw new Error('helpers.gameVersions: gameVersion select has no <option> values');
  return versions;
}

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

module.exports = { openCalculator, expectNoConsoleErrors, setValue, gameVersions };
