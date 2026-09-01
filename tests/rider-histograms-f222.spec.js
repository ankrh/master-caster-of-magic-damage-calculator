// The per-rider histograms the breakdown grid draws inside each combat phase row (F222.4).
//
// The numeric content of each histogram is the resolver's, asserted headlessly by
// `runRiderHistogramChecks` (tools/unit_checks/phases.js). What only the page can show is the
// rendering rule, and one half of it is easy to break by accident:
//
//   R5 — a rider whose gate is false for the matchup is omitted entirely; a rider that is gated
//   on but lands with probability zero is drawn, with all its mass at 0.
//
// Hiding an all-zero panel would look like a tidy-up and would make "immune" and "absent"
// indistinguishable to the reader, which is the failure mode the rule exists to prevent.
//
// Also pinned here: the `melee` base-roll slot is labelled with the row's own attack rather than
// the literal word "Melee"; Life Steal's healing stays off the shared target-HP axis; and the
// band wraps instead of overflowing at phone width.
//
// Fixtures are driven through `applyPreset`, the app's own driver over the real controls, so a
// control renamed or version-gated fails here rather than being silently bypassed.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

async function preset(page, key) {
  const missing = await page.evaluate((k) => {
    if (!PRESETS[k]) return k;
    applyPreset(k);
    return null;
  }, key);
  expect(missing, 'the fixture preset still exists').toBeNull();
}

// Read every rider panel the breakdown grid drew, per phase row.
async function riderRows(page) {
  return page.evaluate(() => [...document.querySelectorAll('#breakdownGrid .breakdown-phase-row')]
    .map(row => ({
      label: (row.querySelector('.breakdown-phase-label') || {}).textContent || '',
      hasBand: !!row.querySelector('.breakdown-rider-band'),
      riders: [...row.querySelectorAll('.rider-panel')].map(panel => ({
        key: panel.dataset.riderKey,
        side: panel.dataset.riderSide,
        quantity: panel.dataset.riderQuantity,
        name: (panel.querySelector('.rider-name') || {}).textContent,
        bins: [...panel.querySelectorAll('tbody tr')].map(tr => ({
          value: tr.querySelector('.dmg-cell').textContent.trim(),
          chance: tr.querySelector('.chance-text').textContent.trim(),
        })),
      })),
    })));
}

// A damage histogram is read as belonging to the unit it is drawn under, the same as the two
// phase panels above it. The rider band used to be one wrapping run of panels, so the first
// rider landed in the left column whoever it damaged — a Poison Touch dealt to the defender
// appeared under "Mean damage to attacker".
test('a rider is drawn in the column of the unit whose HP it is', async ({ page }) => {
  const errors = await openCalculator(page);
  await preset(page, 'poisonTouchBasic');
  const placement = await page.evaluate(() => {
    const row = [...document.querySelectorAll('#breakdownGrid .breakdown-phase-row')]
      .find(candidate => candidate.querySelector('.rider-panel'));
    if (!row) return null;
    const columns = [...row.querySelectorAll('.breakdown-rider-column')];
    const panels = [...row.querySelectorAll('.breakdown-phase-panels > .dist-panel')];
    return {
      columns: columns.length,
      // Which phase panel each rider sits under, by horizontal centre.
      riders: [...row.querySelectorAll('.rider-panel')].map(panel => {
        const mid = panel.getBoundingClientRect().left
          + panel.getBoundingClientRect().width / 2;
        const under = panels.findIndex((phasePanel) => {
          const box = phasePanel.getBoundingClientRect();
          return mid >= box.left && mid <= box.right;
        });
        return { side: panel.dataset.riderSide, column: columns.findIndex(
          column => column.contains(panel)), under };
      }),
    };
  });
  expect(placement, 'a row with rider panels was drawn').not.toBeNull();
  expect(placement.columns, 'both sides always hold a column').toBe(2);
  expect(placement.riders.length, 'the fixture placed a rider').toBeGreaterThan(0);
  for (const rider of placement.riders) {
    const expected = rider.side === 'atk' ? 0 : 1;
    expect(rider.column, `a ${rider.side} rider sits in the ${rider.side} column`)
      .toBe(expected);
    expect(rider.under, `and lands under the ${rider.side} phase panel`).toBe(expected);
  }
  expectNoConsoleErrors(errors);
});

test('R5: a gated-on rider that cannot land is drawn with all its mass at 0', async ({ page }) => {
  const errors = await openCalculator(page);
  // stoningHighRes: Stoning -3 against Res 13 leaves effective Res 10, which no petrify roll
  // can fail. The rider is placed, so it draws.
  await preset(page, 'stoningHighRes');
  const stoning = (await riderRows(page)).flatMap(row => row.riders)
    .filter(rider => rider.key === 'stoningTouch');
  expect(stoning, 'the placed rider still draws a panel').toHaveLength(1);
  expect(stoning[0].name).toBe('Stoning Touch');
  expect(stoning[0].side).toBe('def');
  expect(stoning[0].quantity).toBe('targetHp');
  // All of its mass sits at 0, and the panel shows that rather than being suppressed.
  expect(stoning[0].bins).toEqual([{ value: '0', chance: '100.0%' }]);
  expectNoConsoleErrors(errors);
});

test('R5: a rider whose gate is false is omitted while a reachable one still draws', async ({ page }) => {
  const errors = await openCalculator(page);
  // magicImmunityPoisonTouch: the defender's Magic Immunity makes `ApplyAttack` skip the
  // Stoning Touch block outright, while Poison sits outside that gate and still rolls. Ticking
  // the DOS Stoning Touch flag arms the same shared special value the Poison rider reads, so
  // the two riders differ only in reachability — the omission cannot be blamed on the value.
  await preset(page, 'magicImmunityPoisonTouch');
  await setValue(page, 'aDosFlag_stoningTouch', true);
  const riders = (await riderRows(page)).flatMap(row => row.riders);
  const keys = riders.map(rider => rider.key);
  expect(keys, 'the reachable rider draws').toContain('poison');
  expect(keys, 'an unreachable rider emits no key and draws no panel').not.toContain('stoningTouch');
  expectNoConsoleErrors(errors);
});

test('the melee base-roll slot is labelled with the row\'s own attack', async ({ page }) => {
  const errors = await openCalculator(page);
  // poisonThrown gives a Thrown row and a melee+counter row. The resolver calls the base-roll
  // slot `melee` in all three places; the page has to name each after its own phase.
  await preset(page, 'poisonThrown');
  const named = {};
  for (const row of await riderRows(page)) {
    for (const rider of row.riders) {
      if (rider.key === 'melee') named[row.label + ' | ' + rider.side] = rider.name;
    }
  }
  const entries = Object.entries(named);
  const thrown = entries.find(([label]) => label.startsWith('Thrown'));
  expect(thrown, 'the Thrown row has a base-roll slot').toBeTruthy();
  expect(thrown[1]).toBe('Thrown');
  const melee = entries.find(([label]) => /^Melee/.test(label) && label.endsWith('| def'));
  expect(melee, 'the melee row has a base-roll slot on the defender side').toBeTruthy();
  expect(melee[1]).toBe('Melee');
  const counter = entries.find(([label]) => /^Melee/.test(label) && label.endsWith('| atk'));
  expect(counter, 'the counter half names the counter-attack').toBeTruthy();
  expect(counter[1]).toBe('Counter-attack');
  expectNoConsoleErrors(errors);
});

test('Life Steal healing is drawn off the shared target-HP axis', async ({ page }) => {
  const errors = await openCalculator(page);
  await preset(page, 'lifeStealBasic');
  const riders = (await riderRows(page)).flatMap(row => row.riders);
  const drain = riders.find(rider => rider.key === 'lifeSteal');
  const heal = riders.find(rider => rider.key === 'lifeStealHeal');
  expect(drain, 'the drain is on the shared target-HP axis').toBeTruthy();
  expect(drain.quantity).toBe('targetHp');
  expect(drain.side).toBe('def');
  expect(heal, 'the healing is its own histogram').toBeTruthy();
  expect(heal.quantity).toBe('sourceHp');
  expect(heal.side).toBe('atk');
  expect(heal.name).toBe('Life Steal healing');
  // Nothing about the target's HP scale may leak onto it: not the column heading, not the
  // "% HP" denominator, not the "destroyed" line, and not a figure-kill tick — each of those
  // would read as a statement about damage to the defender.
  const offAxis = await page.evaluate(() => [...document.querySelectorAll(
    '#breakdownGrid .rider-panel[data-rider-quantity="sourceHp"]')].map(panel => ({
    header: panel.querySelector('thead th:first-child').textContent.trim(),
    hpPct: panel.querySelectorAll('.hp-pct').length,
    destroyed: /destroyed/.test(panel.querySelector('.dist-header').textContent),
    skulls: [...panel.querySelectorAll('.dmg-cell')].filter(td => td.textContent.includes('☠')).length,
  })));
  expect(offAxis).toHaveLength(1);
  expect(offAxis[0]).toEqual({ header: 'Healed', hpPct: 0, destroyed: false, skulls: 0 });
  expectNoConsoleErrors(errors);
});

test('figures killed is a tick on the HP axis, not a second quantity', async ({ page }) => {
  const errors = await openCalculator(page);
  // stoningTouchBasic petrifies a 10-HP single-figure defender, so the shared axis reaches its
  // one kill threshold and the derived label appears there — the same machinery whose absence
  // the off-axis test above asserts for Life Steal's healing.
  await preset(page, 'stoningTouchBasic');
  const ticks = await page.evaluate(() => [...document.querySelectorAll(
    '#breakdownGrid .rider-panel[data-rider-key="stoningTouch"] .dmg-cell')]
    .filter(td => td.textContent.includes('☠')).map(td => td.textContent.trim()));
  expect(ticks, 'the kill threshold is marked on the HP axis').toEqual(['10 ☠']);
  // And it is a label on the HP axis, not a separate figures column.
  const columns = await page.evaluate(() => [...document.querySelectorAll(
    '#breakdownGrid .rider-panel[data-rider-key="stoningTouch"] thead th')]
    .map(th => th.textContent.trim()));
  expect(columns).toEqual(['Damage', 'Chance']);
  expectNoConsoleErrors(errors);
});

test('the ranged volley draws its riders even though it has no phase rows', async ({ page }) => {
  const errors = await openCalculator(page);
  // A ranged resolution returns `phases: null` and carries the rider array at the top level,
  // so the grid holds a band and no phase row. Without it the volley's riders have no home.
  await preset(page, 'poisonRanged');
  const report = await page.evaluate(() => ({
    ranged: document.getElementById('rangedCheck').checked,
    heading: (document.querySelector('#breakdownGrid .breakdown-heading') || {}).textContent,
    riders: [...document.querySelectorAll('#breakdownGrid .rider-panel')].map(panel => ({
      key: panel.dataset.riderKey,
      side: panel.dataset.riderSide,
      name: (panel.querySelector('.rider-name') || {}).textContent,
    })),
  }));
  expect(report.ranged, 'the fixture is in ranged mode').toBe(true);
  expect(report.heading).toBe('Rider breakdown');
  expect(report.riders.map(rider => rider.key)).toContain('poison');
  const base = report.riders.find(rider => rider.key === 'melee');
  expect(base, 'the volley draws its base-roll slot').toBeTruthy();
  expect(base.side).toBe('def');
  expect(base.name, 'named after the volley, not "Melee"').toBe('Ranged');
  expectNoConsoleErrors(errors);
});

test('a phase that places no rider draws no rider band', async ({ page }) => {
  const errors = await openCalculator(page);
  // Wall of Fire is not an `ApplyAttack` call, so it places no riders in any version.
  await preset(page, 'stoningTouchBasic');
  await setValue(page, 'wallOfFire', true);
  const rows = await riderRows(page);
  const wall = rows.find(row => row.label === 'Wall of Fire');
  expect(wall, 'the Wall of Fire row is drawn').toBeTruthy();
  expect(wall.riders, 'and carries no rider panels').toEqual([]);
  expect(wall.hasBand, 'and no rider band at all').toBe(false);
  expect(rows.some(row => row !== wall && row.hasBand), 'the melee row does have one').toBe(true);
  expectNoConsoleErrors(errors);
});

test('the rider band stacks rather than overflowing at phone width', async ({ page }) => {
  const errors = await openCalculator(page);
  await page.setViewportSize({ width: 375, height: 900 });
  await preset(page, 'lifeStealBasic');
  const report = await page.evaluate(() => {
    const doc = document.documentElement;
    const band = document.querySelector('.breakdown-rider-columns');
    const panels = [...document.querySelectorAll('.rider-panel')];
    return {
      hScroll: doc.scrollWidth > doc.clientWidth,
      columns: band ? getComputedStyle(band).gridTemplateColumns.split(' ').length : 0,
      panels: panels.length,
      widest: Math.max(...panels.map(panel => Math.round(panel.getBoundingClientRect().width))),
      clientWidth: doc.clientWidth,
    };
  });
  expect(report.panels, 'the fixture drew rider panels to lay out').toBeGreaterThan(1);
  expect(report.hScroll, 'no horizontal page scroll at 375px').toBe(false);
  expect(report.columns, 'the two rider columns stack into one').toBe(1);
  expect(report.widest).toBeLessThanOrEqual(report.clientWidth);
  expectNoConsoleErrors(errors);
});
