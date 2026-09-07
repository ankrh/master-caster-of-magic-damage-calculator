// The calculator's global invariants, asserted once over the whole page rather
// than restated inside each feature's suite.
//
// INV-1 valid PMF, INV-3 swap involution, INV-5 no console errors, INV-6 state
// round-trip. A feature that could break one of these in a way these checks
// cannot see is a gap here, to be widened here.
const { test, expect } = require('@playwright/test');
const { expectNoConsoleErrors, openCalculator, setValue } = require('./helpers');

// --- from result-invariants.spec.js ---
async function selectCustom(page) {
  await page.evaluate(() => {
    for (const p of ['a', 'b']) {
      const el = document.getElementById(p + 'Unit');
      el.value = 'custom';
      el.dispatchEvent(new Event('change'));
    }
  });
}

async function midMatchup(page) {
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await selectCustom(page);
  await setValue(page, 'aFigs', '6');
  await setValue(page, 'aAtk', '7');
  await setValue(page, 'aHP', '4');
  await setValue(page, 'aDmg', '0');
  await setValue(page, 'bFigs', '6');
  await setValue(page, 'bDef', '4');
  await setValue(page, 'bHP', '8');
  await setValue(page, 'bDmg', '0');
}

// Parse the chance percentages rendered in a result panel into fractions.
async function distProbs(page, panelId) {
  return page.evaluate((panelId) => {
    const cells = document.querySelectorAll('#' + panelId + ' .dist-table tbody tr .chance-text');
    return [...cells].map(c => parseFloat(c.textContent) / 100);
  }, panelId);
}

test('rendered distribution is a valid probability distribution', async ({ page }) => {
  const errors = await openCalculator(page);
  await midMatchup(page);

  for (const panelId of ['distA', 'distB']) {
    const probs = await distProbs(page, panelId);
    expect(probs.length, `${panelId} renders rows`).toBeGreaterThan(1);
    for (const p of probs) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
    const sum = probs.reduce((a, b) => a + b, 0);
    // One-decimal percentage rounding across many rows -> loose tolerance.
    expect(sum, `${panelId} probabilities sum to ~1`).toBeGreaterThan(0.95);
    expect(sum, `${panelId} probabilities sum to ~1`).toBeLessThan(1.05);
  }
  expectNoConsoleErrors(errors);
});

test('swap button is involutive and exchanges the two sides', async ({ page }) => {
  const errors = await openCalculator(page);

  // Asymmetric configuration.
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await selectCustom(page);
  await setValue(page, 'aAtk', '9');
  await setValue(page, 'aFigs', '4');
  await setValue(page, 'bDef', '6');
  await setValue(page, 'bHP', '12');
  await setValue(page, 'aAbil_firstStrike', true);

  const before = await page.evaluate(() => collectState());
  const aAtk0 = await page.locator('#aAtk').inputValue();
  const bDef0 = await page.locator('#bDef').inputValue();

  await page.click('#swapBtn');

  // One swap actually exchanges sides: firstStrike moved to defender, stats swapped.
  await expect(page.locator('#bAbil_firstStrike')).toBeChecked();
  await expect(page.locator('#aAbil_firstStrike')).not.toBeChecked();
  expect(await page.locator('#bAtk').inputValue()).toBe(aAtk0);
  expect(await page.locator('#aDef').inputValue()).toBe(bDef0);

  const once = await page.evaluate(() => collectState());
  expect(once, 'a single swap changes state').not.toEqual(before);

  // Involution: swapping again returns to the original state.
  await page.click('#swapBtn');
  const twice = await page.evaluate(() => collectState());
  expect(twice).toEqual(before);

  expectNoConsoleErrors(errors);
});

// --- from persistence.spec.js ---
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
  await setValue(page, 'aModernRangedType', 'missile');
  await setValue(page, 'aModernRanged', '5');
  await setValue(page, 'rangedCheck', true);

  const state = await page.evaluate(() => collectState());

  // Wait for the debounced save (~250ms) to land *this* state in localStorage. Waiting on the
  // blob's existence alone returns on any earlier write: the debounce runs 250ms after the last
  // change, so a stall during setup lands a blob holding only the ids set so far, and the reload
  // below would restore that instead of the state under test. Requiring the stored ids to equal
  // the ones just collected still fails if a write is genuinely lost — the wait times out.
  await page.waitForFunction((expected) => {
    const raw = localStorage.getItem('pageState_v2');
    if (!raw) return false;
    let ids;
    try {
      ids = JSON.parse(raw.charAt(0) === '{' ? raw : lzDecode(raw)).ids;
    } catch (err) { return false; }
    const canon = (o) => JSON.stringify(Object.keys(o).sort().map((k) => [k, o[k]]));
    return canon(ids) === canon(expected);
  }, state.ids);

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

  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
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

// Seed a saved blob that is valid except for the named fields, then reload through the real
// init path. The blob is written from an init script so the outgoing page's debounced save
// cannot race it. `mutation` names control ids (`ids`) and/or per-side identity fields
// (`identity`) — the two carriers a v2 blob restores state through.
async function reloadWithSavedBlob(page, version, edits, mutation) {
  await setValue(page, 'gameVersion', version);
  for (const [id, value] of Object.entries(edits)) await setValue(page, id, value);
  const blob = await page.evaluate((m) => {
    const seed = collectState();
    Object.assign(seed.ids, m.ids || {});
    for (const [prefix, fields] of Object.entries(m.identity || {})) {
      Object.assign(seed.identity[prefix], fields);
    }
    return seed;
  }, mutation);
  await page.addInitScript((seed) => {
    try { localStorage.setItem('pageState_v2', JSON.stringify(seed)); } catch (e) {}
  }, blob);
  await page.reload();
  await page.waitForFunction(() => typeof window.collectState === 'function');
}

function reloadWithSavedValue(page, version, edits, retiredId, retiredValue) {
  return reloadWithSavedBlob(page, version, edits, { ids: { [retiredId]: retiredValue } });
}

// A saved state naming an option the build has since removed must halt, not restore a control
// the user never chose. `magic_c` on the modern ranged select and `beam` on the DOS shared-slot
// select are real selections from before F93 (HISTORY.md) collapsed the modern projectile
// vocabulary and removed `beam` from both families' lists. `el.value = x` with no matching
// <option> clears the selection instead of failing, so the page came back silently disagreeing
// with the state it was restoring (SPEC.md, *Out-of-range values stop the run*).
for (const [label, version, edits, retiredId, retiredValue] of [
  ['modern ranged projectile', 'com2_1.05.11',
    { aModernRangedType: 'missile', aModernRanged: '5' }, 'aModernRangedType', 'magic_c'],
  ['DOS shared-slot type', 'com_6.08',
    { aRtbType: 'missile', aRtb: '5' }, 'aRtbType', 'beam'],
]) {
  test(`a saved ${label} this build retired halts the restore`, async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = await openPersistent(page);
    // This context started with empty localStorage, so this is the fresh-page reference.
    const fresh = await page.evaluate(() => collectState());
    const freshRetired = await page.locator(`#${retiredId}`).inputValue();

    await reloadWithSavedValue(page, version, edits, retiredId, retiredValue);

    // Clean defaults, rather than the saved version with a blank control in it.
    const restored = await page.evaluate(() => collectState());
    expect(restored).toEqual(fresh);
    await expect(page.locator(`#${retiredId}`)).toHaveValue(freshRetired);
    // And loud: the report names the control and the value it could not restore.
    const reported = errors.join('\n');
    expect(reported).toContain(retiredId);
    expect(reported).toContain(retiredValue);

    await context.close();
  });
}

// Rejecting an unofferable value on the way in is only well-founded if the page never writes one
// on the way out. The shared-slot select has no spelling for the modern-only projectile tokens, so
// both writers that can hand it one — a fixture's `rtbType` and a roster record's ranged type,
// Warlord [362] Wanderer being `magic` — have to project rather than assign blind.
test('no control is left holding a value its own option list does not offer', async ({ page }) => {
  const errors = await openCalculator(page);
  const result = await page.evaluate(() => {
    const blanks = [];
    const check = where => {
      for (const el of document.querySelectorAll('#calcMain select')) {
        if (el.selectedIndex === -1) blanks.push(where + ':' + el.id);
      }
    };
    applyPreset('alumniOfAcademyMagicRangedWarlord');  // fixture rtbType 'magic'
    check('fixture');
    applyPreset('wandererRosterRangedTypeWarlord');    // roster ranged type 'magic'
    check('roster');
    let threw = null;
    try { collectState(); } catch (err) { threw = String(err.message || err); }
    return { blanks, threw };
  });
  expect(result.blanks).toEqual([]);
  expect(result.threw).toBeNull();
  expectNoConsoleErrors(errors);
});

test('retired Warlord version ids migrate to 1.5.12.7', async ({ page }) => {
  const errors = await openCalculator(page);
  const mapped = await page.evaluate(() => [
    'com2_warlord_1.5.12.5',
    'com2_warlord_1.5.12.6',
    'com2_warlord_1.5.12.6.2',
  ].map(normalizeGameVersion));
  expect(mapped).toEqual([
    'com2_warlord_1.5.12.9',
    'com2_warlord_1.5.12.9',
    'com2_warlord_1.5.12.9',
  ]);
  expectNoConsoleErrors(errors);
});

// F138 (1). A saved version id this build neither offers nor renames used to fall back to
// DEFAULT_GAME_VERSION, and the blob's default-diff was then expanded against that version's
// defaults — so every other id came back under a rule set the user never selected. That is a
// wider substitution than the single control value F123 stopped, and it halts for the same
// reason (SPEC.md, *Out-of-range values stop the run*).
test('a saved version id this build neither offers nor renames halts the restore', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = await openPersistent(page);
  const fresh = await page.evaluate(() => collectState());

  await reloadWithSavedBlob(page, 'com2_1.05.11', { aAtk: '11' },
    { ids: { gameVersion: 'com2_0.9.0' } });

  const restored = await page.evaluate(() => collectState());
  expect(restored).toEqual(fresh);
  const reported = errors.join('\n');
  expect(reported).toContain('gameVersion');
  expect(reported).toContain('com2_0.9.0');
  // And the offending blob is discarded, so it cannot re-throw on every reload.
  const stored = await page.evaluate(() => localStorage.getItem('pageState_v2'));
  expect(stored === null || !stored.includes('com2_0.9.0')).toBe(true);

  await context.close();
});

// F138 (2). The v2 identity record is the carrier `applyFullState` actually prefers for the
// special-unit selector, and F123's offered-value check only reads the `ids` copy. A key this
// build does not define reached `populateSpecialUnitOptions` and became `none` with nothing
// raised.
test('a saved special-unit key this build does not define halts the restore', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = await openPersistent(page);
  const fresh = await page.evaluate(() => collectState());

  await reloadWithSavedBlob(page, 'com2_1.05.11', { aUnit: 'custom', aAtk: '11' },
    { identity: { a: { specialUnit: 'juggernaut' } } });

  const restored = await page.evaluate(() => collectState());
  expect(restored).toEqual(fresh);
  const reported = errors.join('\n');
  expect(reported).toContain('juggernaut');

  await context.close();
});

// The other half of the same decision: a key this build *does* define, in a version that does
// not allow it, keeps its version-scoped clamp to `none`. Retirement and version scope are
// different things, and only the first is out of range.
test('an undefined special-unit key throws while a version-disallowed one still clamps', async ({ page }) => {
  const errors = await openCalculator(page);
  const result = await page.evaluate(() => {
    document.getElementById('gameVersion').value = 'com2_1.05.11';
    onVersionChange();
    populateSpecialUnitOptions('a', 'com2_1.05.11', 'chosen');
    const allowed = document.getElementById('aSpecialUnit').value;
    // MoM has no special-unit templates at all, so a known key clamps rather than halting.
    populateSpecialUnitOptions('a', 'mom_1.31', 'chosen');
    const clamped = document.getElementById('aSpecialUnit').value;
    let threw = null;
    try {
      populateSpecialUnitOptions('a', 'com2_1.05.11', 'juggernaut');
    } catch (err) { threw = String(err.message || err); }
    let identityThrew = null;
    try {
      setIdentityControls('a', { baseRace: 'Dwarf', specialUnit: 'juggernaut' });
    } catch (err) { identityThrew = String(err.message || err); }
    return { allowed, clamped, threw, identityThrew };
  });
  expect(result.allowed).toBe('chosen');
  expect(result.clamped).toBe('none');
  expect(result.threw).toContain('juggernaut');
  expect(result.identityThrew).toContain('juggernaut');
  expectNoConsoleErrors(errors);
});

// --- from share-link.spec.js ---
test('share link restores the full calculator state', async ({ page, context }) => {
  const errors = await openCalculator(page);

  // Build a state that differs from the defaults across several control
  // kinds: version select, stat inputs, ability checkbox, a global toggle.
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await setValue(page, 'aAtk', '9');
  await setValue(page, 'bDef', '7');
  await setValue(page, 'aAbil_firstStrike', true);
  // rangedCheck is only enabled when the attacker has a ranged attack.
  await setValue(page, 'aModernRangedType', 'missile');
  await setValue(page, 'aModernRanged', '4');
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
