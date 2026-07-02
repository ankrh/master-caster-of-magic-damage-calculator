// Exemplar UI test: the share-link round trip.
//
// Pattern for this suite (see also tests/helpers.js):
// - Assert *invariants* ("serialize -> load -> serialize is a fixpoint",
//   "the DOM reflects the applied state"), never hand-computed damage numbers —
//   calculation correctness is covered by the in-page PRESETS suite.
// - Always open pages via openCalculator() and finish with
//   expectNoConsoleErrors(); a silent console exception is a failing test.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('share link restores the full calculator state', async ({ page, context }) => {
  const errors = await openCalculator(page);

  // Build a state that differs from the defaults across several control
  // kinds: version select, stat inputs, ability checkbox, a global toggle.
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await setValue(page, 'aAtk', '9');
  await setValue(page, 'bDef', '7');
  await setValue(page, 'aAbil_firstStrike', true);
  // rangedCheck is only enabled when the attacker has a ranged attack.
  await setValue(page, 'aRtbType', 'missile');
  await setValue(page, 'aRtb', '4');
  await setValue(page, 'rangedCheck', true);

  const state = await page.evaluate(() => collectState());
  const shareUrl = await page.evaluate(
    () => '/#s=' + LZString.compressToEncodedURIComponent(JSON.stringify(collectState())));

  // Load the link in a fresh page (fresh localStorage via openCalculator).
  const page2 = await context.newPage();
  const errors2 = await openCalculator(page2, shareUrl);

  // Fixpoint: re-serializing the restored state must reproduce the original.
  const state2 = await page2.evaluate(() => collectState());
  expect(state2).toEqual(state);

  // And the DOM actually reflects it (guards against collectState/applyState
  // agreeing with each other while both ignoring a control).
  await expect(page2.locator('#gameVersion')).toHaveValue('com2_1.05.11');
  await expect(page2.locator('#aAtk')).toHaveValue('9');
  await expect(page2.locator('#bDef')).toHaveValue('7');
  await expect(page2.locator('#aAbil_firstStrike')).toBeChecked();
  await expect(page2.locator('#rangedCheck')).toBeChecked();

  expectNoConsoleErrors(errors);
  expectNoConsoleErrors(errors2);
});
