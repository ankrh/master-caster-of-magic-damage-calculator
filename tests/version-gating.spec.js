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

test('a hidden enchantment does not leak into the matrix', async ({ page }) => {
  const errors = await openCalculator(page);

  // The card is protected by `applyVersionGating` (`card_state.js`) clearing version-hidden
  // controls, so its readers need no version test. The matrix has no equivalent cleaning step: switching version only
  // hides a row, and nothing clears `matrixPropertyState`. The filter therefore has to hold in
  // the reader, which is what `matrixEnchantmentValue` is for. Eye of Heaven is Warlord-only and
  // reaches the derivation as the top-level `enemyEyeOfHeaven` — the input F258.1 found reaching
  // DOS matrix runs.
  const ask = () => page.evaluate(() => ({
    active: matrixHasActiveEnchantment('b', 'eyeOfHeaven'),
    applied: Object.prototype.hasOwnProperty.call(matrixAppliedEnchantments('b'), 'eyeOfHeaven'),
  }));

  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');
  await page.evaluate(() => {
    matrixPropertyState.b = (matrixPropertyState.b || []).filter(r => r.key !== 'eyeOfHeaven');
    matrixPropertyState.b.push({ key: 'eyeOfHeaven', enabled: true, value: true });
  });

  // Warlord offers the row, so it must read active here — otherwise the DOS assertion below
  // would pass on a row that was never live in the first place.
  expect(await ask()).toEqual({ active: true, applied: true });

  await setValue(page, 'gameVersion', 'mom_1.31');

  // The row is still stored: it is the reader's filter that must refuse it, not a cleanup step.
  // If this ever goes false the test below stops proving anything.
  const stillStored = await page.evaluate(() =>
    (matrixPropertyState.b || []).some(r => r.key === 'eyeOfHeaven' && r.enabled));
  expect(stillStored).toBe(true);

  expect(await ask()).toEqual({ active: false, applied: false });

  expectNoConsoleErrors(errors);
});

test('the matrix reader gates on exceptVersions, not the subgroup alone (F261)', async ({ page }) => {
  const errors = await openCalculator(page);

  // The other half of INV-2 in the matrix. Eye of Heaven above is *subgroup*-gated, which the
  // matrix's retired filter already caught. These six are gated only by their own
  // `exceptVersions: ['com2_warlord_']` — the CoM2-named halves of a Warlord rename — and the
  // retired filter admitted every one of them under Warlord, where each applied its twin's
  // `calcKey` from a row the card hides. Since F261 all three matrix sites ask
  // `abilityVersionGated`, so the check is: the CoM2-named row is refused, the Warlord-named twin
  // is not, and the drawer offers only the twin.
  const PAIRS = [
    ['flameBlade', 'flameBladeWarlord'], ['landLinking', 'natureLink'],
    ['discipline', 'disciplineWarlord'], ['destiny', 'apotheosis'],
    ['mislead', 'liability'], ['blazingEyes', 'chaosEmbrace'],
  ];

  // The breadth the retired `KNOWN_GATE_DIVERGENCES` worklist had, restated as behaviour rather
  // than as a list (GPT review of F261, P3). Six named pairs witness the six that were wrong; this
  // witnesses every enchantment def in every version, in both directions — a def the matrix hides
  // while the card offers it is as much a failure as the reverse — and it is what makes a *seventh*
  // def acquiring an `exceptVersions` need no edit here. Each def is enabled alone, so a twin
  // cannot mask it through their shared `calcKey`.
  for (const version of VERSIONS) {
    await setValue(page, 'gameVersion', version);
    const mismatches = await page.evaluate(() => {
      const version = document.getElementById('gameVersion').value;
      const defs = abilityUiDefs().filter(def => def.source === 'enchantment');
      const activeValue = def => {
        if (def.type === 'bool') return true;
        if (def.type === 'select') {
          const options = def.options || [];
          return options.length > 1 ? options[1][0] : options[0][0];
        }
        return 1;
      };
      const bad = [];
      for (const def of defs) {
        matrixPropertyState.b = [{ key: def.uiKey, enabled: true, value: activeValue(def) }];
        const expected = !abilityVersionGated(def, version);
        const offered = matrixPropertyCandidates('b').some(row => row.key === def.uiKey);
        const active = matrixHasActiveEnchantment('b', def.key);
        const applied = Object.prototype.hasOwnProperty.call(
          matrixAppliedEnchantments('b'), def.calcKey || def.key);
        if (offered !== expected || active !== expected || applied !== expected) {
          bad.push(`${version}|${def.uiKey}: gate says ${expected}, `
            + `offered ${offered}, active ${active}, applied ${applied}`);
        }
      }
      return { bad, defs: defs.length };
    });
    expect(mismatches.bad).toEqual([]);
    // The sweep had subjects, and enough of them: a def list that stopped being read would make
    // the empty-mismatch assertion vacuous.
    expect(mismatches.defs).toBeGreaterThan(50);
  }


  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.9');

  const result = await page.evaluate(pairs => {
    const value = key => (key === 'discipline' || key === 'disciplineWarlord') ? 'combat' : true;
    // Both halves of every pair are stored and enabled, exactly as a version switch would leave
    // them: nothing clears `matrixPropertyState`, so the reader is the only filter.
    matrixPropertyState.b = pairs.flatMap(([hidden, twin]) =>
      [hidden, twin].map(key => ({ key, enabled: true, value: value(key) })));
    const offered = matrixPropertyCandidates('b').map(def => def.key);
    return pairs.map(([hidden, twin]) => ({
      hidden, twin,
      hiddenActive: matrixHasActiveEnchantment('b', hidden),
      twinActive: matrixHasActiveEnchantment('b', twin),
      hiddenOffered: offered.includes(hidden),
      twinOffered: offered.includes(twin),
      // Both halves write one calcKey, so `matrixAppliedEnchantments` must still carry it —
      // from the twin. A reader that dropped both would pass the two flags above and be wrong.
      applied: matrixAppliedEnchantments('b')[
        abilityUiDefs().find(a => a.source === 'enchantment' && a.key === twin).calcKey || twin],
    }));
  }, PAIRS);

  for (const row of result) {
    expect({ key: row.hidden, active: row.hiddenActive, offered: row.hiddenOffered })
      .toEqual({ key: row.hidden, active: false, offered: false });
    expect({ key: row.twin, active: row.twinActive, offered: row.twinOffered })
      .toEqual({ key: row.twin, active: true, offered: true });
    expect(row.applied).toEqual(row.hidden === 'discipline' ? 'combat' : true);
  }

  // The rows are still stored: it is the reader refusing them, not a cleanup step.
  const stillStored = await page.evaluate(() => matrixPropertyState.b.length);
  expect(stillStored).toBe(12);

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
