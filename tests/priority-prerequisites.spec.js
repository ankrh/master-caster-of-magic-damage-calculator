const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F7 uses the moddable modern Supernatural formula with ties-to-even rounding', async ({ page }) => {
  const errors = await openCalculator(page);
  const values = await page.evaluate(() => ({
    tieDown: supernaturalMinDamageForHits(25, 'com2_1.05.11'),
    divergence: supernaturalMinDamageForHits(28, 'com2_1.05.11'),
    tieUp: supernaturalMinDamageForHits(75, 'com2_warlord_1.5.12.7'),
    modded: supernaturalMinDamageForHits(15, 'com2_1.05.11', { starts: 5, ratio: 25 }),
  }));
  expect(values).toEqual({ tieDown: 8, divergence: 10, tieUp: 26, modded: 2 });
  expectNoConsoleErrors(errors);
});

test('F22 Blood Lust strength helper preserves the target gate for modern Thrown', async ({ page }) => {
  const errors = await openCalculator(page);
  const values = await page.evaluate(() => {
    const attacker = version => ({ atk: 1, combatVersion: version, abilities: { bloodLust: true } });
    const normal = { unitType: 'normal', abilities: {} };
    const fantastic = { unitType: 'fantastic_nature', abilities: {} };
    return {
      thrownVsNormal: bloodLustMeleeAttack(attacker('com2_1.05.11'), normal, 3),
      thrownVsFantastic: bloodLustMeleeAttack(attacker('com2_1.05.11'), fantastic, 3),
      // MoM guards bit 0x00000004 as Berserk, not Blood Lust (F130), so the doubling does not
      // exist there and the same call returns the strength unchanged.
      thrownVsNormalMoM: bloodLustMeleeAttack(attacker('mom_1.31'), normal, 3),
    };
  });
  expect(values).toEqual({ thrownVsNormal: 6, thrownVsFantastic: 3, thrownVsNormalMoM: 3 });
  expectNoConsoleErrors(errors);
});

test('F52 reproduces CoM1 Supreme Light eligibility and signed ordered writes', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const version = 'com_6.08';
    const eligible = {
      liveMagical: supremeLightActiveForUnit({ supremeLight: true }, 'normal', version,
        { liveRangedType: 'magic_c', baseRangedType: 'missile' }),
      lifeRace: supremeLightActiveForUnit({ supremeLight: true }, 'normal_life', version),
      mana: supremeLightActiveForUnit({ supremeLight: true, caster: true }, 'normal', version),
      focusMagic: supremeLightActiveForUnit({ supremeLight: true, focusMagic: true }, 'normal', version),
      baseMagical: supremeLightActiveForUnit({ supremeLight: true }, 'normal', version,
        { liveRangedType: 'missile', baseRangedType: 'magic_s' }),
      none: supremeLightActiveForUnit({ supremeLight: true }, 'normal', version,
        { liveRangedType: 'missile', baseRangedType: 'missile' }),
    };
    const input = (abilities, extra = {}) => ({
      prefix: 'a', version,
      identity: createCustomUnitIdentity(version, {
        baseRace: 'Life', baseFantastic: true, isHero: false,
      }),
      abilities, figs: 1, atk: 0, rtb: 1, rtbType: 'thrown', def: 0, res: 6, hp: 10,
      weapon: 'normal', level: 'normal', ...extra,
    });
    const writes = deriveUnitStats(input({ supremeLight: true }));
    const signed = deriveUnitStats(input({ supremeLight: true, mindStorm: true }, { res: 0 }));
    return {
      eligible,
      writes: { atk: writes.atk, rtb: writes.rtb, def: writes.def },
      signedStep: signed.statTrace.find(step => step.id === 'supremeLight'),
    };
  });
  expect(report.eligible).toEqual({
    liveMagical: true, lifeRace: true, mana: true, focusMagic: true, baseMagical: true, none: false,
  });
  expect(report.writes).toEqual({ atk: 2, rtb: 3, def: 2 });
  expect(report.signedStep.changes.def).toEqual({ from: -5, to: -6, delta: -1 });
  expectNoConsoleErrors(errors);
});

test('R9-G1g imports CoM Supernatural carriers but leaves their effect inactive', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    document.getElementById('gameVersion').value = 'com_6.08';
    onVersionChange();
    const hydra = Object.values(COM_UNITS_DATA).find(unit => unit.name === 'Hydra');
    const selection = document.getElementById('aUnit');
    selection.value = String(hydra.id);
    selection.dispatchEvent(new Event('change'));
    const control = document.getElementById('aAbil_supernatural');
    const item = control.closest('.abil-item');
    const com2Callback = supernaturalMinDamageFn({ supernatural: true }, 'com2_1.05.11');
    const warlordCallback = supernaturalMinDamageFn(
      { supernatural: true }, 'com2_warlord_1.5.12.7');
    return {
      carriers: Object.values(COM_UNITS_DATA)
        .filter(unit => (unit.abilities || []).includes('Supernatural'))
        .map(unit => unit.name),
      callback: supernaturalMinDamageFn({ supernatural: true }, 'com_6.08'),
      direct: supernaturalMinDamageForHits(9, 'com_6.08'),
      rosterControl: {
        checked: control.checked,
        disabled: control.disabled,
        hidden: item.classList.contains('abil-hidden'),
        tooltip: item.dataset.tooltip,
      },
      modernCallbacks: {
        com2: com2Callback(28),
        warlord: warlordCallback(28),
      },
    };
  });
  expect(report.carriers).toEqual([
    'Hydra', 'Great Drake', 'Death Knights', 'Demon Lord', 'Arch Angel',
    'Colossus', 'Gorgons', 'Behemoth', 'Great Wyrm', 'Djinn', 'Sky Drake',
  ]);
  expect(report.callback).toBeNull();
  expect(report.direct).toBe(0);
  expect(report.rosterControl).toMatchObject({ checked: true, disabled: true, hidden: false });
  expect(report.rosterControl.tooltip).toContain('executable test is inactive');
  expect(report.rosterControl.tooltip).toContain('no combat effect');
  expect(report.modernCallbacks).toEqual({ com2: 10, warlord: 10 });
  expectNoConsoleErrors(errors);
});

test('R9-G1g preserves every compiled-modern Supreme Light eligibility alternative', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const eligible = version => ({
      liveMagical: supremeLightActiveForUnit({ supremeLight: true }, 'normal', version,
        { liveRangedType: 'magic', baseRangedType: 'missile' }),
      baseMagical: supremeLightActiveForUnit({ supremeLight: true }, 'normal', version,
        { liveRangedType: 'missile', baseRangedType: 'magic' }),
      fantasticLife: supremeLightActiveForUnit({ supremeLight: true }, 'fantastic_life', version),
      normalLife: supremeLightActiveForUnit({ supremeLight: true }, 'normal_life', version),
      mana: supremeLightActiveForUnit({ supremeLight: true, caster: true }, 'normal', version),
      focusOnly: supremeLightActiveForUnit({ supremeLight: true, focusMagic: true }, 'normal', version),
      none: supremeLightActiveForUnit({ supremeLight: true }, 'normal', version,
        { liveRangedType: 'missile', baseRangedType: 'missile' }),
    });
    return {
      com2: eligible('com2_1.05.11'),
      warlord: eligible('com2_warlord_1.5.12.7'),
      warlordLightningBolt: {
        live: supremeLightActiveForUnit({ supremeLight: true }, 'normal',
          'com2_warlord_1.5.12.7', { liveRangedType: 'magic_lightning', baseRangedType: 'missile' }),
        base: supremeLightActiveForUnit({ supremeLight: true }, 'normal',
          'com2_warlord_1.5.12.7', { liveRangedType: 'missile', baseRangedType: 'magic_lightning' }),
      },
    };
  });
  const expected = {
    liveMagical: true, baseMagical: true, fantasticLife: true,
    normalLife: true, mana: true, focusOnly: false, none: false,
  };
  expect(report.com2).toEqual(expected);
  expect(report.warlord).toEqual(expected);
  expect(report.warlordLightningBolt).toEqual({ live: true, base: true });
  expectNoConsoleErrors(errors);
});

test('F54/F55 keep base-CoM2 summon identities out of Warlord', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const simple = (identity, abilities) => deriveUnitStats({
      prefix: 'a', version: 'com2_warlord_1.5.12.7', identity, abilities,
      figs: 1, atk: 1, rtb: 0, rtbType: 'none', modernAttacks: {}, def: 0, res: 0, hp: 10,
      weapon: 'normal', level: 'normal',
    });
    const construct = simple(createUnitIdentity({
      version: 'com2_warlord_1.5.12.7', templateId: 37,
      baseRace: 'Special', baseFantastic: false,
    }), { combatSummoned: true });
    const paladins = simple(createUnitIdentity({
      version: 'com2_warlord_1.5.12.7', templateId: 113,
      baseRace: 'High Men', baseFantastic: false,
    }), { combatSummoned: true });
    return {
      construct: { identity: construct.identity, ids: construct.identityTrace.map(step => step.id) },
      paladins: { identity: paladins.identity, ids: paladins.identityTrace.map(step => step.id) },
    };
  });
  expect(report.construct.identity).toMatchObject({ race: 'Special', fantastic: true });
  expect(report.construct.ids).not.toContain('constructCatapult');
  expect(report.paladins.identity).toMatchObject({ race: 'High Men', fantastic: true });
  expect(report.paladins.ids).not.toContain('callToArmsPaladins');
  expectNoConsoleErrors(errors);
});

test('M6 merges all Lava Smelter grants and stacks both elemental protections', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const version = 'com2_warlord_1.5.12.7';
    const abilities = {
      lavaSmelterWeaponImmunity: true,
      lavaSmelterMissileImmunity: true,
      lavaSmelterResistElements: true,
      lavaSmelterElementalArmor: true,
      lavaSmelterFieryBlade: true,
    };
    const derive = (unitType) => deriveUnitStats({
      prefix: 'b', version, unitType, abilities,
      figs: 1, atk: 1, rtb: 0, rtbType: 'none', modernAttacks: {}, def: 0, res: 0, hp: 20,
      weapon: 'normal', level: 'normal',
    });
    const normal = derive('normal');
    const fantastic = derive('fantastic_nature');
    document.getElementById('gameVersion').value = version;
    onVersionChange();
    const legacyState = collectState();
    legacyState.ids.aAbil_lavaSmelter = 'elementalArmor';
    applyState(legacyState);
    return {
      normalAbilities: normal.abilities,
      effectiveDefense: effectiveDefense(normal, version, { elementalEligible: true }),
      effectiveResistance: effectiveResistance(normal, version, 'nature'),
      fantasticAbilities: fantastic.abilities,
      controls: [
        'lavaSmelterWeaponImmunity', 'lavaSmelterMissileImmunity',
        'lavaSmelterResistElements', 'lavaSmelterElementalArmor', 'lavaSmelterFieryBlade',
      ].map(key => {
        const el = document.getElementById('aAbil_' + key);
        return { key, present: !!el, type: el && el.type, disabled: el && el.disabled };
      }),
      migratedLegacySelection: document.getElementById(
        'aAbil_lavaSmelterElementalArmor').checked,
    };
  });
  expect(report.normalAbilities).toMatchObject({
    weaponImmunity: true,
    missileImmunity: true,
    resistElements: true,
    elementalArmor: true,
    fieryBlade: true,
  });
  expect(report.effectiveDefense).toBe(16);
  expect(report.effectiveResistance).toBe(4);
  expect(report.fantasticAbilities).not.toMatchObject({ weaponImmunity: true });
  for (const control of report.controls) {
    expect(control).toMatchObject({ present: true, type: 'checkbox', disabled: false });
  }
  expect(report.migratedLegacySelection).toBe(true);
  expectNoConsoleErrors(errors);
});
