// F136: the roster record is stated on the card exactly once — when the unit is selected.
// No other path restates part of it. Before the merge two functions wrote disjoint halves of
// that record and three call paths ran only the second half, so a card deliberately edited
// away from its record was half-reverted by a level change or by clicking the matrix's own
// selected-unit cell: some fields snapped back to the roster, the rest kept the edit.
//
// The assertions below are card-state observations, not a restatement of either function's
// field list: each says what the user sees after an interaction the SPEC's UI contract
// governs ("the stat fields hold pre-level values ... no code path may write a level bonus
// into a card field", and Swap's "preserves hand-edited values on a predefined selection").
const { test, expect } = require('@playwright/test');
const { openCalculator, setValue, expectNoConsoleErrors } = require('./helpers');

// Every editable card field the roster record reaches, DOS and modern alike. Listed here so a
// partial restatement shows up as a specific field, not as a count.
const CARD_FIELDS = ['Atk', 'Rtb', 'Def', 'Res', 'HP', 'Figs', 'ToHitMod', 'ToHitRtbMod',
  'HitChance', 'HitMelee', 'HitRanged', 'HitThrown', 'HitBreath', 'ToBlkMod',
  'ModernRanged', 'ModernThrown', 'ModernFireBreath', 'ModernLightningBreath'];

const readCard = (page, prefix) => page.evaluate(([prefix, fields]) => Object.fromEntries(
  fields.map(f => [f, String(document.getElementById(prefix + f).value)])),
  [prefix, CARD_FIELDS]);

// A roster unit that is not a hero (heroes are filtered out of the matrix dropdown) and that
// the version actually ships. Returns its id and name.
const pickRosterUnit = (page, version) => page.evaluate((version) => {
  const unit = (unitDatabases[version] || []).find(u => u.category !== 'Heroes');
  if (!unit) throw new Error('no non-hero roster unit in ' + version);
  return { id: unit.id, name: unit.name };
}, version);

// Edit every card field to a value the record did not give it. Returns the edited card.
async function handEditCard(page, prefix, value) {
  return page.evaluate(([prefix, fields, value]) => {
    for (const f of fields) {
      const el = document.getElementById(prefix + f);
      if (el.tagName !== 'INPUT') continue;
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return Object.fromEntries(fields.map(f => [f, String(document.getElementById(prefix + f).value)]));
  }, [prefix, CARD_FIELDS, value]);
}

for (const version of ['mom_1.31', 'com2_warlord_1.5.12.9']) {
  test(`changing Level restates no card field on a roster unit (${version})`, async ({ page }) => {
    const errors = await openCalculator(page);
    await setValue(page, 'gameVersion', version);
    const unit = await pickRosterUnit(page, version);
    await setValue(page, 'aUnit', unit.id);

    // A card holding values its record never gave it is a state the app produces on purpose:
    // persistence restores hand-edited fields and rebuilds the roster locks without rewriting
    // them. Reach it the same way rather than by editing locked fields in place.
    await handEditCard(page, 'a', 7);
    const restored = await page.evaluate((version) => {
      const blob = collectState();
      resetCalculatorState(version);
      applyState(blob);
      return true;
    }, version);
    expect(restored).toBe(true);
    const before = await readCard(page, 'a');
    for (const f of CARD_FIELDS) expect(before[f], `${f} survives the restore`).toBe('7');

    const levels = await page.evaluate(() =>
      Array.from(document.getElementById('aLevel').options).map(o => o.value));
    expect(levels.length).toBeGreaterThan(1);
    const derivedBefore = await page.evaluate(() => readUnitStats('a').atk);

    await setValue(page, 'aLevel', levels[levels.length - 1]);

    const after = await readCard(page, 'a');
    expect(after).toEqual(before);

    // Not vacuous: the level change did reach the derivation, it simply never touched the card.
    const derivedAfter = await page.evaluate(() => readUnitStats('a').atk);
    expect(derivedAfter).not.toBe(derivedBefore);

    expectNoConsoleErrors(errors);
  });

  test(`re-selecting the roster unit states its whole record (${version})`, async ({ page }) => {
    const errors = await openCalculator(page);
    await setValue(page, 'gameVersion', version);
    const unit = await pickRosterUnit(page, version);
    await setValue(page, 'aUnit', unit.id);
    const fromRoster = await readCard(page, 'a');

    await handEditCard(page, 'a', 7);
    const edited = await readCard(page, 'a');
    for (const f of CARD_FIELDS) expect(edited[f]).toBe('7');

    await setValue(page, 'aUnit', unit.id);
    // Selecting the unit is the one statement of the record, so every field it owns returns —
    // including the ones the pre-merge second half never wrote.
    expect(await readCard(page, 'a')).toEqual(fromRoster);

    expectNoConsoleErrors(errors);
  });
}

// The matrix's own call to the removed half was redundant: every rendered cell names a roster
// unit, so applying one already ran the whole statement through `updateUnitLock` → `applyUnit`
// before the second call. Nothing observable changes when it goes, which is what this guards —
// applying a cell must still leave the card stating that unit's record in full.
test('applying a matrix cell states the picked roster unit in full', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'mom_1.31');
  // The matrix resolves every roster unit against every other; trim it so this test costs
  // seconds rather than the full roster's tens of seconds.
  await page.evaluate(() => {
    const version = document.getElementById('gameVersion').value;
    unitDatabases[version] = unitDatabases[version].filter(u => u.category !== 'Heroes').slice(0, 12);
    populateUnitDropdown('aUnit', unitDatabases[version]);
    populateUnitDropdown('bUnit', unitDatabases[version]);
  });
  const unit = await pickRosterUnit(page, 'mom_1.31');
  await setValue(page, 'aUnit', unit.id);
  await setValue(page, 'bUnit', unit.id);
  await handEditCard(page, 'a', 7);

  await page.click('#meleeMatrixBtn');
  await page.waitForSelector('#matrixModal.is-open');
  await page.waitForSelector('#matrixTableWrap table');

  const cell = page.locator('td.matrix-cell').first();
  const picked = await cell.evaluate(el => ({
    atk: Number(el.dataset.atkIdx), def: Number(el.dataset.defIdx),
    atkUnitId: matrixCache.rows[Number(el.dataset.atkIdx)].info.unitId,
  }));
  expect(picked.atkUnitId, 'a rendered cell always names a roster unit').not.toBeNull();
  await cell.click();
  await page.waitForSelector('#matrixModal.is-open', { state: 'hidden' });

  // Selecting that same unit on the card is the reference statement of its record.
  const applied = await readCard(page, 'a');
  await setValue(page, 'aUnit', Number(picked.atkUnitId));
  expect(applied).toEqual(await readCard(page, 'a'));

  expectNoConsoleErrors(errors);
});
