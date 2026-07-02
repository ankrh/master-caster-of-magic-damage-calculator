// UI tests for the matrix modal's two left-edge drawers (Settings / Filters),
// their live active-count badges, and the scroll-away header.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

async function openMeleeMatrix(page) {
  await page.click('#meleeMatrixBtn');
  await page.waitForSelector('#matrixModal.is-open');
  await page.waitForSelector('#matrixTableWrap table');
}

test('drawers start closed and the table spans (nearly) the full modal width', async ({ page }) => {
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);

  const settingsOpen = await page.locator('#matrixSettingsDrawer').evaluate(el => el.classList.contains('open'));
  const filtersOpen = await page.locator('#matrixFiltersDrawer').evaluate(el => el.classList.contains('open'));
  expect(settingsOpen).toBe(false);
  expect(filtersOpen).toBe(false);

  const ratio = await page.evaluate(() => {
    const panel = document.querySelector('.modal-panel').getBoundingClientRect().width;
    const wrap = document.getElementById('matrixTableWrap').getBoundingClientRect().width;
    return wrap / panel;
  });
  expect(ratio).toBeGreaterThan(0.9);

  expectNoConsoleErrors(errors);
});

test('Settings badge tracks property add/remove', async ({ page }) => {
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);

  await page.click('#matrixSettingsToggle');
  await expect(page.locator('#matrixSettingsDrawer')).toHaveClass(/open/);

  const badge = page.locator('#matrixSettingsBadge');
  const before = parseInt(await badge.textContent(), 10);

  // Open the attacker dropdown and grab the first candidate's label.
  await page.locator('#matrixAPropSearch').click();
  const firstItem = page.locator('#matrixAPropList .unit-dropdown-item').first();
  await expect(firstItem).toBeVisible();
  const label = (await firstItem.textContent()).trim();
  await firstItem.click();

  await expect(badge).toHaveText(String(before + 1));

  // Remove the row we just added via its delete button.
  const row = page.locator('#matrixAttackerSettings li.matrix-prop-row', { hasText: label });
  await row.locator('.matrix-prop-del').click();
  await expect(badge).toHaveText(String(before));

  expectNoConsoleErrors(errors);
});

test('Filters badge tracks non-empty textareas', async ({ page }) => {
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);

  await page.click('#matrixFiltersToggle');
  await expect(page.locator('#matrixFiltersDrawer')).toHaveClass(/open/);

  const badge = page.locator('#matrixFiltersBadge');
  await expect(badge).toHaveText('0');

  await page.fill('#matrixAttackerNameFilter', 'Life');
  await expect(badge).toHaveText('1');

  await page.fill('#matrixAttackerNameFilter', '');
  await expect(badge).toHaveText('0');

  expectNoConsoleErrors(errors);
});

test('opening one drawer closes the other', async ({ page }) => {
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);

  await page.click('#matrixSettingsToggle');
  await expect(page.locator('#matrixSettingsDrawer')).toHaveClass(/open/);

  await page.click('#matrixFiltersToggle');
  await expect(page.locator('#matrixFiltersDrawer')).toHaveClass(/open/);
  await expect(page.locator('#matrixSettingsDrawer')).not.toHaveClass(/open/);

  expectNoConsoleErrors(errors);
});

test('scroll gestures on sticky header cells move the page, not the matrix', async ({ page }) => {
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);

  const wrapTop = () => page.locator('#matrixTableWrap').evaluate(el => el.scrollTop);
  const pageTop = () => page.locator('.modal-scroll').evaluate(el => el.scrollTop);
  const resetScrolls = () => page.evaluate(() => {
    document.getElementById('matrixTableWrap').scrollTop = 0;
    document.querySelector('#matrixModal .modal-scroll').scrollTop = 0;
  });

  // Real mouse wheel over a data cell scrolls the table wrap. Wheel scrolling
  // applies asynchronously, so poll rather than reading immediately.
  await page.locator('#matrixTableWrap tbody td').first().hover();
  await page.mouse.wheel(0, 200);
  await expect.poll(wrapTop, { message: 'wheel on a data cell scrolls the matrix' }).toBeGreaterThan(0);
  await resetScrolls();

  // Wheel over a column header (top row) scrolls the modal page, not the table.
  await page.locator('#matrixTableWrap thead th').nth(2).hover();
  await page.mouse.wheel(0, 200);
  await expect.poll(pageTop, { message: 'wheel on the header row scrolls the page' }).toBeGreaterThan(0);
  expect(await wrapTop(), 'wheel on the header row does not scroll the matrix').toBe(0);
  await resetScrolls();

  // Same for a row header (first column).
  await page.locator('#matrixTableWrap tbody th').first().hover();
  await page.mouse.wheel(0, 200);
  await expect.poll(pageTop, { message: 'wheel on the name column scrolls the page' }).toBeGreaterThan(0);
  expect(await wrapTop(), 'wheel on the name column does not scroll the matrix').toBe(0);

  // Touch drag starting on a header cell also moves the page scroller.
  await page.locator('.modal-scroll').evaluate(el => { el.scrollTop = 0; });
  const dragged = await page.evaluate(() => {
    const wrap = document.getElementById('matrixTableWrap');
    const th = wrap.querySelector('thead th:nth-child(3)');
    const r = th.getBoundingClientRect();
    const mkTouch = (x, y) => new Touch({ identifier: 1, target: th, clientX: x, clientY: y });
    const fire = (type, x, y) => th.dispatchEvent(new TouchEvent(type, {
      bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [mkTouch(x, y)],
    }));
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    fire('touchstart', x, y);
    fire('touchmove', x, y - 120); // drag upward = scroll down
    fire('touchend', x, y - 120);
    return {
      pageTop: document.querySelector('#matrixModal .modal-scroll').scrollTop,
      wrapTop: wrap.scrollTop,
    };
  });
  expect(dragged.pageTop, 'touch drag on a header cell scrolls the page').toBeGreaterThan(0);
  expect(dragged.wrapTop, 'touch drag on a header cell does not scroll the matrix').toBe(0);

  expectNoConsoleErrors(errors);
});

test('scrolling the modal hides the header while the close stays visible and clickable', async ({ page }) => {
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);

  // Header visible before scroll.
  const headerBefore = await page.locator('.modal-header').boundingBox();
  expect(headerBefore.y + headerBefore.height).toBeGreaterThan(0);

  await page.evaluate(() => {
    const s = document.querySelector('.modal-scroll');
    s.scrollTop = s.scrollHeight; // scroll past the header
  });

  // Header has scrolled out of the modal's scroll viewport: its bottom edge is
  // at or above the top of the scroll container, so its visible intersection is 0.
  const scrollTop = await page.locator('.modal-scroll').evaluate(el => el.getBoundingClientRect().top);
  const headerAfter = await page.locator('.modal-header').boundingBox();
  expect(headerAfter.y + headerAfter.height).toBeLessThanOrEqual(scrollTop + 1);

  // Close control remains visible and actually closes the modal.
  const close = page.locator('#matrixClose');
  await expect(close).toBeVisible();
  const box = await close.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  await close.click();
  await expect(page.locator('#matrixModal')).not.toHaveClass(/is-open/);

  expectNoConsoleErrors(errors);
});
