// UI tests for the matrix modal's combined Settings & Filters side panel:
// its push layout (opening shrinks the matrix), the responsive/persisted
// open state, the live active-count badge, and the scroll-away header.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

async function openMeleeMatrix(page) {
  await page.click('#meleeMatrixBtn');
  await page.waitForSelector('#matrixModal.is-open');
  await page.waitForSelector('#matrixTableWrap table');
}

// Ratio of the matrix table wrap width to the whole modal panel width.
function wrapRatio(page) {
  return page.evaluate(() => {
    const panel = document.querySelector('.modal-panel').getBoundingClientRect().width;
    const wrap = document.getElementById('matrixTableWrap').getBoundingClientRect().width;
    return wrap / panel;
  });
}

test('panel defaults open on a wide viewport and pushes the matrix', async ({ page }) => {
  const errors = await openCalculator(page); // default viewport 1280 wide (>= 1000)
  await openMeleeMatrix(page);

  await expect(page.locator('#matrixSidePanel')).toHaveClass(/open/);
  // Pushed: the panel occupies real width, so the table is well short of full.
  expect(await wrapRatio(page)).toBeLessThan(0.9);

  expectNoConsoleErrors(errors);
});

test('narrow viewport defaults the panel closed and the table spans the width', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);

  await expect(page.locator('#matrixSidePanel')).not.toHaveClass(/open/);
  expect(await wrapRatio(page)).toBeGreaterThan(0.9);

  expectNoConsoleErrors(errors);
});

test('toggling collapses/expands the panel, reclaims width, and persists state', async ({ page }) => {
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);

  const panel = page.locator('#matrixSidePanel');
  await expect(panel).toHaveClass(/open/); // wide default

  // Collapse: table reclaims (nearly) the full width and the choice is stored.
  // Poll because the width change is a CSS transition (~0.22s).
  await page.click('#matrixSideToggle');
  await expect(panel).not.toHaveClass(/open/);
  await expect.poll(() => wrapRatio(page)).toBeGreaterThan(0.9);
  expect(await page.evaluate(() => localStorage.getItem('matrixSidePanelOpen_v1'))).toBe('0');

  // Expand again: matrix is pushed once more and the stored flag flips.
  await page.click('#matrixSideToggle');
  await expect(panel).toHaveClass(/open/);
  await expect.poll(() => wrapRatio(page)).toBeLessThan(0.9);
  expect(await page.evaluate(() => localStorage.getItem('matrixSidePanelOpen_v1'))).toBe('1');

  expectNoConsoleErrors(errors);
});

test('combined badge tracks both settings and filters', async ({ page }) => {
  const errors = await openCalculator(page);
  await openMeleeMatrix(page);
  await expect(page.locator('#matrixSidePanel')).toHaveClass(/open/);

  const badge = page.locator('#matrixSideBadge');
  await expect(badge).toHaveText('0');

  // Add an attacker property via its dropdown.
  await page.locator('#matrixAPropSearch').click();
  const firstItem = page.locator('#matrixAPropList .unit-dropdown-item').first();
  await expect(firstItem).toBeVisible();
  const label = (await firstItem.textContent()).trim();
  await firstItem.click();
  await expect(badge).toHaveText('1');

  // A non-empty name filter counts too.
  await page.fill('#matrixAttackerNameFilter', 'Life');
  await expect(badge).toHaveText('2');

  await page.fill('#matrixAttackerNameFilter', '');
  await expect(badge).toHaveText('1');

  // Remove the property row we added.
  const row = page.locator('#matrixAttackerSettings li.matrix-prop-row', { hasText: label });
  await row.locator('.matrix-prop-del').click();
  await expect(badge).toHaveText('0');

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
