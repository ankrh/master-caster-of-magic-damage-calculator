// Version-gating invariants.
//
// (1) For each game version, the set of ability/enchantment items the UI hides
//     (in "show all" mode, so hide-inactive doesn't muddy it) must equal exactly
//     the set the defs' version gating disables, asked of the app's own
//     `abilityVersionGated` so the rule is not restated here.
// (2) A hidden ability must not leak into the calculation: enabling an ability
//     in a version where it exists, then switching to a version where it's
//     hidden, must yield the same result as never enabling it.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue, gameVersions } = require('./helpers');

const VERSIONS = gameVersions();

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

    // Show all inactive items in every group so visibility is driven only by version
    // gating, not by each group's hide-inactive default.
    await page.evaluate(() => {
      document.querySelectorAll('#aAbilities .toggle-abil-btn').forEach(btn => {
        if (btn.textContent === 'Show all') btn.click();
      });
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
        // Ask the app's own rule rather than restating it; a copy here would drift.
        const versionGated = abilityVersionGated(abil, version);
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

test('gaze inputs follow the selected engine record shape', async ({ page }) => {
  const errors = await openCalculator(page);

  // The synthetic cross-version control is gone entirely. DOS exposes gaze types in
  // the shared secondary-attack selector and binds roster strength into that slot.
  await expect(page.locator('#aAbil_gazeRanged')).toHaveCount(0);
  await setValue(page, 'gameVersion', 'mom_1.31');
  await page.evaluate(() => {
    const gorgons = (unitDatabases[V_MOM_131] || []).find(u => u.name === 'Gorgons');
    if (!gorgons) throw new Error('MoM Gorgons not found');
    const select = document.getElementById('aUnit');
    select.value = String(gorgons.id);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#aRtbType')).toHaveValue('gaze_stoning');
  await expect(page.locator('#aRtb')).toHaveValue('1');
  await expect(page.locator('#aRtbType')).toBeVisible();
  await expect(page.locator('#aModern_stoningGaze')).toBeHidden();

  // Modern engines hide the DOS union and expose the independent gaze field instead.
  await setValue(page, 'gameVersion', 'com2_1.05.11');
  await expect(page.locator('#aRtbType')).toBeHidden();
  await expect(page.locator('#aModern_stoningGaze')).toBeVisible();

  expectNoConsoleErrors(errors);
});

test('reform controls stay editable and affect predefined Warlord units', async ({ page }) => {
  const errors = await openCalculator(page);
  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');

  await page.evaluate(() => {
    const catapult = (unitDatabases[V_WARLORD] || []).find(u => u.name === 'Catapult');
    if (!catapult) throw new Error('Warlord Catapult not found');
    const select = document.getElementById('aUnit');
    select.value = String(catapult.id);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });

  const causalControls = [
    'armorcladReform',
    'energyBeamWeapons',
    'explosive',
    'heatPowerEngine',
    'magitekEngineering',
    'militaryWorkshop',
    'outlanderWizard',
    'pneumaReactor',
    'psychoConverter',
    'rocketry',
    'temporalEngineering',
  ];
  for (const key of causalControls) {
    const control = page.locator(`#aAbil_${key}`);
    await expect(control).toBeEnabled();
    expect(await control.evaluate(el => el.closest('.abil-item').dataset.abilSource))
      .toBe('enchantment');
  }

  const armorclad = page.locator('#aAbil_armorcladReform');
  const before = await page.evaluate(() => readUnitStats('a').def);
  await setValue(page, 'aAbil_outlanderWizard', true);
  await setValue(page, 'aAbil_armorcladReform', true);
  const after = await page.evaluate(() => readUnitStats('a').def);
  expect(after - before).toBe(6);

  // Derived labels are calculated internally, not exposed as competing UI state.
  const derivedStates = [
    'armorclad',
    'blackpowder',
    'bombsGrenades',
    'energyCannon',
    'energyWeaponry',
    'pneumaField',
    'powerEngine',
    'psychoForce',
    'temporalGravityDrive',
    'upgradedExplosive',
  ];
  for (const key of derivedStates) {
    await expect(page.locator(`#aAbil_${key}`)).toHaveCount(0);
  }

  expectNoConsoleErrors(errors);
});
