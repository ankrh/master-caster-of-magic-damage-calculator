// Version-gating invariants.
//
// (1) For each game version, the set of ability/enchantment items the UI hides
//     (in "show all" mode, so hide-inactive doesn't muddy it) must equal exactly
//     the set the defs' version gating disables. Gating is recomputed in-page
//     from ABILITY_DEFS/ENCHANTMENT_DEFS using the same fields the app uses.
// (2) A hidden ability must not leak into the calculation: enabling an ability
//     in a version where it exists, then switching to a version where it's
//     hidden, must yield the same result as never enabling it.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

const VERSIONS = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.5'];

// A default roster unit locks its panel (all its ability controls become
// disabled), which would confound version gating. Switch both sides to custom.
async function selectCustom(page) {
  await page.evaluate(() => {
    for (const p of ['a', 'b']) {
      const el = document.getElementById(p + 'Unit');
      el.value = 'custom';
      el.dispatchEvent(new Event('change'));
    }
  });
}

for (const version of VERSIONS) {
  test(`hidden ability items match def gating (${version})`, async ({ page }) => {
    const errors = await openCalculator(page);
    await setValue(page, 'gameVersion', version);
    await selectCustom(page);

    // Show all inactive items so visibility is driven only by version gating,
    // not by the hide-inactive default.
    await page.evaluate(() => {
      const btn = document.querySelector('.toggle-abil-btn');
      if (document.querySelector('.abilities-section').classList.contains('hide-inactive')) btn.click();
    });

    const diff = await page.evaluate(() => {
      const version = document.getElementById('gameVersion').value;
      const mismatches = [];
      for (const abil of abilityUiDefs()) {
        const id = 'aAbil_' + (abil.uiKey || abil.key);
        const el = document.getElementById(id);
        if (!el) continue;
        const item = el.closest('.abil-item');
        if (!item) continue;
        // Reproduce ui.js version-gating (updateAbilityVisibility path).
        const isWarlordTag = abil.source === 'ability' && abil.subgroup === 'Warlord';
        const versionGateable = abil.source === 'enchantment' || isWarlordTag;
        const subgroupOk = subgroupAllowedForVersion(abil.subgroup, version);
        const overrideOk = (abil.alsoVersions || []).some(v => version.startsWith(v));
        const exceptOk = !(abil.exceptVersions || []).some(v => version.startsWith(v));
        const versionGated = versionGateable && !((subgroupOk || overrideOk) && exceptOk);
        const hidden = item.classList.contains('abil-hidden');
        // In show-all mode a fresh page has no active/locked items, so the only
        // reason to hide is version gating.
        if (versionGated !== hidden) mismatches.push({ key: abil.uiKey || abil.key, versionGated, hidden });
      }
      return mismatches;
    });

    expect(diff, 'hidden state equals version gating for every ability item').toEqual([]);
    expectNoConsoleErrors(errors);
  });
}

test('a hidden ability does not leak into the result', async ({ page }) => {
  const errors = await openCalculator(page);

  // Mid melee matchup on custom units. giantStrength is a MoM-only enchantment
  // that boosts the attacker's melee, so it changes damage to the defender.
  async function configure() {
    await selectCustom(page);
    await setValue(page, 'aFigs', '6');
    await setValue(page, 'aAtk', '7');
    await setValue(page, 'aHP', '4');
    await setValue(page, 'bFigs', '6');
    await setValue(page, 'bDef', '3');
    await setValue(page, 'bHP', '6');
    await setValue(page, 'aToHitMod', '40'); // push to-hit high so extra attack lands
  }
  const meanB = () => page.locator('#distB .dist-header .avg').innerText();

  // Baseline: CoM2, ability OFF (it's hidden there anyway).
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await configure();
  const off = await meanB();

  // MoM: ability visible and ON — must change the result (mutation sanity).
  await setValue(page, 'gameVersion', 'mom_1.31');
  await configure();
  await setValue(page, 'aAbil_giantStrength', true);
  const onMoM = await meanB();
  expect(onMoM).not.toEqual(off);

  // Switch to CoM2 where giantStrength is hidden/cleared: must fall back to OFF.
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await configure();
  const leaked = await meanB();
  expect(leaked).toEqual(off);

  expectNoConsoleErrors(errors);
});
