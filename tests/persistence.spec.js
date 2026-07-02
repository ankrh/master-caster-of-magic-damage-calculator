// Persistence invariants: localStorage round-trip across a real page reload,
// and that Reset restores the same state a truly-fresh page has.
//
// Suite philosophy (see tests/share-link.spec.js): assert INVARIANTS
// (round-trip fixpoints, DOM reflects state), never hand-computed damage.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

// A variant opener that does NOT clear localStorage on navigation, so a reload
// exercises the app's real persistence path. Still stubs analytics and tracks
// console errors exactly like helpers.openCalculator. A fresh Playwright context
// starts with empty localStorage, so the first goto is still a clean slate.
async function openPersistent(page, path = '/') {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(String(err)));
  await page.route('**://plausible.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(path);
  await page.waitForFunction(() => typeof window.collectState === 'function');
  return errors;
}

test('page state survives a reload via localStorage', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = await openPersistent(page);

  // A spread of control kinds distinct from defaults.
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await setValue(page, 'aAtk', '11');
  await setValue(page, 'bDef', '6');
  await setValue(page, 'aAbil_firstStrike', true);
  await setValue(page, 'aRtbType', 'missile');
  await setValue(page, 'aRtb', '5');
  await setValue(page, 'rangedCheck', true);

  const state = await page.evaluate(() => collectState());

  // Wait for the debounced save (~250ms) to land in localStorage.
  await page.waitForFunction(() => !!localStorage.getItem('pageState_v1'));

  // Real reload: the persistent opener never installed a localStorage-clearing
  // init script, so the blob is read back on load.
  await page.reload();
  await page.waitForFunction(() => typeof window.collectState === 'function');

  const state2 = await page.evaluate(() => collectState());
  expect(state2).toEqual(state);

  // DOM spot-checks: guards against collectState/applyState colluding to ignore a control.
  await expect(page.locator('#gameVersion')).toHaveValue('com2_1.05.11');
  await expect(page.locator('#aAtk')).toHaveValue('11');
  await expect(page.locator('#bDef')).toHaveValue('6');
  await expect(page.locator('#aAbil_firstStrike')).toBeChecked();
  await expect(page.locator('#rangedCheck')).toBeChecked();

  expectNoConsoleErrors(errors);
  await context.close();
});

test('Reset returns state to a truly-fresh-page blob', async ({ browser, context }) => {
  // A truly fresh page (cleared localStorage) — the reference blob.
  const freshPage = await context.newPage();
  const freshErrors = await openCalculator(freshPage);
  const freshBlob = await freshPage.evaluate(() => collectState());

  // A separate context we mutate, then Reset.
  const dirtyCtx = await browser.newContext();
  const page = await dirtyCtx.newPage();
  const errors = await openPersistent(page);

  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.5');
  await setValue(page, 'aAtk', '13');
  await setValue(page, 'bRes', '9');
  await setValue(page, 'aAbil_firstStrike', true);

  const dirty = await page.evaluate(() => collectState());
  expect(dirty).not.toEqual(freshBlob); // sanity: we actually changed something

  await page.click('#resetBtn');
  await page.waitForFunction(() => typeof window.collectState === 'function');

  const afterReset = await page.evaluate(() => collectState());
  expect(afterReset).toEqual(freshBlob);
  await expect(page.locator('#gameVersion')).toHaveValue('mom_1.31');

  expectNoConsoleErrors(freshErrors);
  expectNoConsoleErrors(errors);
  await dirtyCtx.close();
});
