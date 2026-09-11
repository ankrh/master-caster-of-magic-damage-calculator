// The matrix view's own surfaces: its drawers, and the property list it
// assembles itself from the version select (`data-scope="page"`, so no Node
// context reaches it).
const { test, expect } = require('@playwright/test');
const { expectNoConsoleErrors, openCalculator } = require('./helpers');

// --- from matrix-drawers.spec.js ---
const MATRIX_ROSTER_LIMIT = 40;

test('custom matrix projection preserves provided and received sources independently', async ({ page }) => {
  const errors = await openCalculator(page);
  const reports = await page.evaluate(() => {
    const reports = [];
    const select = document.getElementById('gameVersion');
    const original = deriveUnitStats;
    let captured;
    deriveUnitStats = input => { captured = input; return original(input); };
    try {
      for (const version of Array.from(select.options, option => option.value)) {
        select.value = version;
        select.dispatchEvent(new Event('change'));
        const key = name => cardStateAbilityUiKey(abilityUiDefs().find(
          def => def.source === 'enchantment' && def.key === name));
        for (const prefix of ['a', 'b']) for (const mode of ['melee', 'ranged']) {
          for (const [provided, received] of [[5, 3], [2, 4]]) {
            const state = presetDefaultCardState(prefix, version);
            state.atk = '5';
            state.dmg = '0';
            state.abilities[key('holyBonus')] = 9;
            state.abilities[key('holyWeapon')] = true;
            state.abilities.holyBonus = provided;
            state.dosSpecial.magnitude = provided;
            state.dosSpecial.flags.holyBonus = true;
            writeCardStateToControls(prefix, state, 'matrix source test');
            const before = JSON.stringify(collectCardState(prefix));
            matrixPropertyState = { a: [], b: [], global: [
              { key: 'rangedDist', enabled: true, value: 7 },
            ] };
            matrixPropertyState[prefix] = [
              { key: key('holyBonus'), enabled: true, value: received },
              { key: key('holyWeapon'), enabled: false, value: true },
              { key: 'damageTaken', enabled: true, value: 2 },
            ];
            readMatrixCustomUnitStats(prefix, mode);
            const active = { innate: captured.innateAbilities.holyBonus,
              marked: captured.markedAbilities.holyBonus,
              weapon: !!captured.markedAbilities.holyWeapon,
              damage: captured.dmg, ranged: captured.rangedCheck, distance: captured.rangedDist };
            matrixPropertyState[prefix][0].enabled = false;
            readMatrixCustomUnitStats(prefix, mode);
            reports.push({ version, prefix, mode, provided, received, active,
              inactive: captured.markedAbilities.holyBonus ?? 0,
              retained: captured.innateAbilities.holyBonus,
              unchanged: before === JSON.stringify(collectCardState(prefix)) });
          }
        }
      }
    } finally { deriveUnitStats = original; }
    return reports;
  });
  expect(reports).toHaveLength(40);
  for (const row of reports) {
    const label = `${row.version}/${row.prefix}/${row.mode}/${row.provided}/${row.received}`;
    expect(row.active, label).toEqual({ innate: row.provided, marked: row.received,
      weapon: false, damage: '2', ranged: row.prefix === 'a' && row.mode === 'ranged',
      distance: row.prefix === 'a' && row.mode === 'ranged' ? '7' : '1' });
    expect(row.inactive, label).toBe(0);
    expect(row.retained, label).toBe(row.provided);
    expect(row.unchanged, label).toBe(true);
  }
  expectNoConsoleErrors(errors);
});

test('custom matrix keeps flags, special records, aliases and matrix settings through the card projection', async ({ page }) => {
  const errors = await openCalculator(page);
  const rows = await page.evaluate(() => {
    const select = document.getElementById('gameVersion');
    select.value = 'com2_warlord_1.5.12.9';
    select.dispatchEvent(new Event('change'));
    const key = name => cardStateAbilityUiKey(abilityUiDefs().find(
      def => def.source === 'enchantment' && def.key === name));
    const original = deriveUnitStats;
    deriveUnitStats = input => input; // Inspect the real page-to-calculator boundary.
    try {
      return [true, false].map(innate => {
        const state = presetDefaultCardState('b', select.value);
        state.abilities.magicImmunity = innate;
        state.abilities[key('magicImmunity')] = true;
        state.identity.specialUnit = 'golem';
        state.modernSpecial.stoningGaze = { on: true, value: -2 };
        state.modernAttacks = { ranged: '6', rangedType: 'magic', thrown: '3',
          fireBreath: '4', lightningBreath: '2' };
        writeCardStateToControls('b', state, 'matrix record test');
        matrixPropertyState = { a: [], b: [
          { key: key('magicImmunity'), enabled: !innate, value: true },
          { key: key('liability'), enabled: true, value: true },
          { key: key('elemArmor'), enabled: true, value: 'elementalArmor' },
          ...Object.entries({ level: 'veteran', weapon: 'mithril', armor: 'orihalcon',
            cityWalls: '3', damageTaken: 4 }).map(([key, value]) => ({ key, value, enabled: true })),
        ], global: [{ key: 'wallOfFire', enabled: true, value: true }] };
        const input = readMatrixCustomUnitStats('b', 'ranged');
        return { innate: input.innateAbilities.magicImmunity,
          marked: !!input.markedAbilities.magicImmunity, alias: input.markedAbilities.mislead,
          elements: input.markedAbilities.elemArmor, gaze: input.innateAbilities.stoningGaze,
          channels: input.modernAttacks, level: input.level, weapon: input.weapon,
          armor: input.armor, walls: input.cityWalls, damage: input.dmg, wallOfFire: input.wallOfFire };
      });
    } finally { deriveUnitStats = original; }
  });
  for (const [index, row] of rows.entries()) expect(row).toEqual({
    innate: index === 0, marked: index !== 0, alias: true, elements: 'resistElements', gaze: -2,
    channels: { ranged: { strength: 6, type: 'magic' }, thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 4, type: 'fire' }, lightningBreath: { strength: 2, type: 'lightning' } },
    level: 'veteran', weapon: 'mithril', armor: 'orihalcon', walls: '3', damage: '4', wallOfFire: true,
  });
  expectNoConsoleErrors(errors);
});

async function useSmallRoster(page) {
  await page.evaluate((limit) => {
    const version = document.getElementById('gameVersion').value;
    // populateUnitDropdown drops Heroes, and the DOS roster's first 35 templates are all
    // heroes, so filter before slicing or the matrix comes back empty.
    unitDatabases[version] = unitDatabases[version]
      .filter(u => u.category !== 'Heroes')
      .slice(0, limit);
    populateUnitDropdown('aUnit', unitDatabases[version]);
    populateUnitDropdown('bUnit', unitDatabases[version]);
  }, MATRIX_ROSTER_LIMIT);
}

async function openMeleeMatrix(page) {
  await page.click('#meleeMatrixBtn');
  await page.waitForSelector('#matrixModal.is-open');
  await page.waitForSelector('#matrixTableWrap table');
  // Guards the trim above: a matrix too small to overflow would make the scroll assertions
  // below pass vacuously, which is the one way shrinking the roster could hide a regression.
  const overflows = await page.locator('#matrixTableWrap').evaluate(
    el => el.scrollHeight > el.clientHeight && el.scrollWidth > el.clientWidth);
  expect(overflows, 'trimmed matrix must still overflow for the scroll assertions to mean anything').toBe(true);
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
  await useSmallRoster(page);
  await openMeleeMatrix(page);

  await expect(page.locator('#matrixSidePanel')).toHaveClass(/open/);
  // Pushed: the panel occupies real width, so the table is well short of full.
  expect(await wrapRatio(page)).toBeLessThan(0.9);

  expectNoConsoleErrors(errors);
});

test('narrow viewport defaults the panel closed and the table spans the width', async ({ page }) => {
  await page.setViewportSize({ width: 720, height: 900 });
  const errors = await openCalculator(page);
  await useSmallRoster(page);
  await openMeleeMatrix(page);

  await expect(page.locator('#matrixSidePanel')).not.toHaveClass(/open/);
  expect(await wrapRatio(page)).toBeGreaterThan(0.9);

  expectNoConsoleErrors(errors);
});

test('toggling collapses/expands the panel, reclaims width, and persists state', async ({ page }) => {
  const errors = await openCalculator(page);
  await useSmallRoster(page);
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
  await useSmallRoster(page);
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
  await useSmallRoster(page);
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
  await useSmallRoster(page);
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

// --- from exorcise-f43-matrix.spec.js ---
test('F43 offers Spell Lock as a matrix defender property in exactly the gated versions', async ({ page }) => {
  const errors = await openCalculator(page);
  const matrixSpellLock = await page.evaluate(() => {
    const versions = [
      'mom_1.31',
      'mom_cp_1.60.00',
      'com_6.08',
      'com2_1.05.11',
      'com2_warlord_1.5.12.9',
    ];
    const versionSelect = document.getElementById('gameVersion');
    return Object.fromEntries(versions.map(version => {
      versionSelect.value = version;
      return [version, matrixPropertyCandidates('b').some(def => def.key === 'spellLock')];
    }));
  });

  // The matrix property list follows the same gating the card does for this control, so it becomes
  // an offerable defender property in the three CoM-era versions. The two modern entries are
  // F244.3f's correction: the shared modern executable refuses Exorcise on the Spell Lock flag, so
  // the control belongs there too.
  expect(matrixSpellLock).toEqual({
    'mom_1.31': false,
    'mom_cp_1.60.00': false,
    'com_6.08': true,
    'com2_1.05.11': true,
    'com2_warlord_1.5.12.9': true,
  });
  expectNoConsoleErrors(errors);
});

// --- F267.5 ---
//
// The matrix row's class term is read off the **live** Fantastic flag the stat run left, not off
// the base one. Nothing else witnesses that: the row builder is page scope, so neither
// `derivation_equivalence` nor a preset fixture executes it, and the GPT review of F267.5 showed
// that swapping the read for the base flag passes every Node assertion.
// The term feeds `matchText`, which is what the matrix filter box searches, so a stale read
// silently mis-files every converted unit.
test('a matrix row is classed by the live Fantastic flag, not the base one', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const select = document.getElementById('gameVersion');
    select.value = 'com2_warlord_1.5.12.9';
    select.dispatchEvent(new Event('change'));
    // Spirit Link clears calculated Fantastic on a base-Fantastic target at the tail of the
    // derivation, which is exactly a live/base disagreement and the only kind this row can show.
    const classOf = row => String(row.matchText).split(' ').pop();
    const plain = predefinedMatrixUnitRows('a', {}, 'melee');
    const linked = predefinedMatrixUnitRows('a', { spiritLink: true }, 'melee');
    const linkedById = new Map(linked.map(row => [row.unitId, row]));
    const flipped = plain.filter(row => classOf(row) === 'Fantastic'
      && linkedById.has(row.unitId) && classOf(linkedById.get(row.unitId)) === 'Normal');
    return {
      rows: plain.length,
      fantasticRows: plain.filter(row => classOf(row) === 'Fantastic').length,
      flipped: flipped.length,
      sample: flipped.length ? flipped[0].label : null,
      // The base flag the stale read would have used is still true on every flipped row, so the
      // two answers genuinely differ rather than agreeing by accident.
      sampleBaseFantastic: flipped.length
        ? linkedById.get(flipped[0].unitId).stats.abilities.baseFantastic : null,
    };
  });

  expect(report.rows, 'the Warlord matrix has attacker rows').toBeGreaterThan(0);
  expect(report.fantasticRows, 'and base-Fantastic ones among them').toBeGreaterThan(0);
  expect(report.flipped, 'Spirit Link re-classes every unit whose live Fantastic it clears')
    .toBeGreaterThan(0);
  expect(report.sampleBaseFantastic, 'while their base flag still reads Fantastic').toBe(true);

  expectNoConsoleErrors(errors);
});
