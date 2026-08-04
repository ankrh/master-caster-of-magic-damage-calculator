// Layout invariant documented in CLAUDE.md (ENCHANTMENT_DEFS ordering):
// the enchantment checkbox block (.ench-bools) is sorted by realm in the order
//   non-realm -> arcane -> life -> death -> chaos -> nature -> sorcery
// using each item's dataset.realm, for every game version and reflowing when
// version-hidden items drop out.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue, gameVersions } = require('./helpers');

const VERSIONS = gameVersions();
const REALM_RANK = { '': 0, arcane: 1, life: 2, death: 3, chaos: 4, nature: 5, sorcery: 6 };

for (const version of VERSIONS) {
  test(`ench-bools is realm-ordered (${version})`, async ({ page }) => {
    const errors = await openCalculator(page);
    await setValue(page, 'gameVersion', version);

    // Show all so version-hidden items are the only ones excluded, then read
    // the realm rank of each visible checkbox item in DOM order.
    const ranks = await page.evaluate((rank) => {
      document.querySelectorAll('#aAbilities .toggle-abil-btn').forEach(btn => {
        if (btn.textContent === 'Show all') btn.click();
      });
      const block = document.querySelector('#aAbilities .ench-bools');
      if (!block) return null;
      return [...block.querySelectorAll('.abil-item')]
        .filter(el => !el.classList.contains('abil-hidden'))
        .map(el => ({ realm: el.dataset.realm || '', rank: rank[el.dataset.realm || ''] ?? 0 }));
    }, REALM_RANK);

    expect(ranks, '.ench-bools block exists').not.toBeNull();
    expect(ranks.length, 'block has visible checkbox items').toBeGreaterThan(1);

    // Non-decreasing realm rank down the block.
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i].rank, `item ${i} (realm ${ranks[i].realm}) not before item ${i - 1} (realm ${ranks[i - 1].realm})`)
        .toBeGreaterThanOrEqual(ranks[i - 1].rank);
    }
    expectNoConsoleErrors(errors);
  });
}
