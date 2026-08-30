const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

// UnitCalc.CAS:278-300 scans the friendly side and counts an engineer/mechanic when the unit
// carries `HAMechanicalMaster` or its permanent `STypeID` is one of these eight. The scan is
// outside the calculator's one-attacker-one-defender scope, so `mechanicalExpert` asserts the
// presence instead of deriving it — which leaves the tooltip as the only place a user can learn
// which roster units set the tick (F196).
//
// The assertion is roster-driven on purpose. A hardcoded name list would go stale silently the
// next time `tools/` regenerates `units_warlord.js`; reading the names out of the live roster by
// id makes a rename fail here instead.
const ENGINEER_TYPE_IDS = [52, 78, 110, 117, 144, 292, 357, 363];

test('F196 names every unit that satisfies Mechanical Expert\'s presence gate', async ({ page }) => {
  const errors = await openCalculator(page);

  const report = await page.evaluate((ids) => {
    const roster = loadUnitDatabase('com2_warlord_1.5.12.7');
    const def = ENCHANTMENT_DEFS.find(d => d.key === 'mechanicalExpert');
    return {
      tooltip: def ? def.tooltip : null,
      names: ids.map((id) => {
        const unit = roster.find(u => u.id === id);
        return { id, name: unit ? unit.name : null };
      }),
      longestLine: Math.max(...(def ? def.tooltip.split('\n') : ['']).map(line => line.length)),
    };
  }, ENGINEER_TYPE_IDS);

  // Fail loud rather than pass vacuously if an id no longer resolves.
  expect(report.names.filter(entry => entry.name === null)).toEqual([]);

  // Each of the eight is named. The five race variants share the bare name "Engineers", so the
  // tooltip carries the race and the check is on the race word plus the shared noun.
  const missing = report.names.filter((entry) => {
    const words = entry.name.split(' ');
    return !words.every(word => report.tooltip.includes(word));
  });
  expect(missing).toEqual([]);

  // The hero-ability disjunct at UnitCalc.CAS:285 and the disclosure that the scan itself is
  // not derived.
  expect(report.tooltip).toContain('Mechanical Master');
  expect(report.tooltip).toContain('Not modeled');

  // `Reference docs/Tooltip style guide.md`: no line over 75 characters.
  expect(report.longestLine).toBeLessThanOrEqual(75);

  expectNoConsoleErrors(errors);
});
