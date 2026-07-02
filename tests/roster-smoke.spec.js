// Roster smoke test: for every game version, select every unit in the picker
// and assert the page stays healthy (no console errors / page crashes) and the
// core stat fields become real numbers. A handful of spot-checks confirm the
// selected unit's stats actually came from the units_*.js data table.
//
// This is a SMOKE test — it does not assert specific stat values for every
// unit; correctness of the numbers is the PRESETS suite's job.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

const VERSIONS = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.5'];

for (const version of VERSIONS) {
  test(`every roster unit selects cleanly (${version})`, async ({ page }) => {
    test.setTimeout(90_000);
    const errors = await openCalculator(page);
    await setValue(page, 'gameVersion', version);

    // Drive selection the way the combobox does (set the hidden #aUnit value and
    // dispatch a real 'change'), inside one evaluate loop to avoid per-unit
    // Playwright round-trips. unitComboboxData holds the picker's flat list.
    const report = await page.evaluate(() => {
      const list = (typeof unitComboboxData !== 'undefined' && unitComboboxData['a']) || [];
      const hidden = document.getElementById('aUnit');
      const num = v => v !== '' && v != null && Number.isFinite(Number(v));
      const bad = [];
      for (const u of list) {
        hidden.value = u.id;
        hidden.dispatchEvent(new Event('change'));
        const figs = document.getElementById('aFigs').value;
        const hp = document.getElementById('aHP').value;
        const atk = document.getElementById('aAtk').value;
        const def = document.getElementById('aDef').value;
        const res = document.getElementById('aRes').value;
        if (!(num(figs) && num(hp) && num(atk) && num(def) && num(res)
              && Number(figs) >= 1 && Number(hp) >= 1)) {
          bad.push({ id: u.id, name: u.name, figs, hp, atk, def, res });
        }
      }
      return { count: list.length, bad };
    });

    expect(report.count, 'the picker should have units for this version').toBeGreaterThan(0);
    expect(report.bad, 'every unit yields numeric core stats').toEqual([]);

    // Spot-checks: for a few units that have a melee value (so applyLevelBonuses
    // writes the stat fields), the DOM must match the data-table record.
    const spot = await page.evaluate(() => {
      const db = (typeof unitDatabases !== 'undefined' && unitDatabases[document.getElementById('gameVersion').value]) || [];
      const hidden = document.getElementById('aUnit');
      const withMelee = db.filter(u => u.category !== 'Heroes' && typeof u.melee === 'number' && u.melee > 0).slice(0, 4);
      const out = [];
      for (const u of withMelee) {
        hidden.value = String(u.id);
        hidden.dispatchEvent(new Event('change'));
        out.push({
          name: u.name,
          figsOk: document.getElementById('aFigs').value === String(u.figures || 1),
          hpOk: document.getElementById('aHP').value === String(u.hp),
          defOk: document.getElementById('aDef').value === String(u.defense),
          resOk: document.getElementById('aRes').value === String(u.resist),
        });
      }
      return out;
    });
    expect(spot.length, 'at least one spot-check unit exists').toBeGreaterThan(0);
    for (const s of spot) {
      expect(s.figsOk, `${s.name}: figures match roster`).toBe(true);
      expect(s.hpOk, `${s.name}: hp matches roster`).toBe(true);
      expect(s.defOk, `${s.name}: defense matches roster`).toBe(true);
      expect(s.resOk, `${s.name}: resist matches roster`).toBe(true);
    }

    expectNoConsoleErrors(errors);
  });
}
