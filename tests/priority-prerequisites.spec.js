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
    const attacker = { atk: 1, abilities: { bloodLust: true } };
    const normal = { unitType: 'normal', abilities: {} };
    const fantastic = { unitType: 'fantastic_nature', abilities: {} };
    return {
      thrownVsNormal: bloodLustMeleeAttack(attacker, normal, 3),
      thrownVsFantastic: bloodLustMeleeAttack(attacker, fantastic, 3),
    };
  });
  expect(values).toEqual({ thrownVsNormal: 6, thrownVsFantastic: 3 });
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
      signedStep: signed.statTrace.find(step => step.id === 'supremeLight:coM1'),
    };
  });
  expect(report.eligible).toEqual({
    liveMagical: true, lifeRace: true, mana: true, focusMagic: true, baseMagical: true, none: false,
  });
  expect(report.writes).toEqual({ atk: 2, rtb: 3, def: 2 });
  expect(report.signedStep.changes.def).toEqual({ from: -5, to: -6, delta: -1 });
  expectNoConsoleErrors(errors);
});

test('R9-G1g preserves every compiled-modern Supreme Light eligibility alternative', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const eligible = version => ({
      liveMagical: supremeLightActiveForUnit({ supremeLight: true }, 'normal', version,
        { liveRangedType: 'magic_c', baseRangedType: 'missile' }),
      baseMagical: supremeLightActiveForUnit({ supremeLight: true }, 'normal', version,
        { liveRangedType: 'missile', baseRangedType: 'magic_s' }),
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
      warlordBeam: {
        live: supremeLightActiveForUnit({ supremeLight: true }, 'normal',
          'com2_warlord_1.5.12.7', { liveRangedType: 'beam', baseRangedType: 'missile' }),
        base: supremeLightActiveForUnit({ supremeLight: true }, 'normal',
          'com2_warlord_1.5.12.7', { liveRangedType: 'missile', baseRangedType: 'beam' }),
      },
    };
  });
  const expected = {
    liveMagical: true, baseMagical: true, fantasticLife: true,
    normalLife: true, mana: true, focusOnly: false, none: false,
  };
  expect(report.com2).toEqual(expected);
  expect(report.warlord).toEqual(expected);
  expect(report.warlordBeam).toEqual({ live: true, base: true });
  expectNoConsoleErrors(errors);
});

test('F54/F55 keep base-CoM2 summon identities out of Warlord', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const simple = (identity, abilities) => deriveUnitStats({
      prefix: 'a', version: 'com2_warlord_1.5.12.7', identity, abilities,
      figs: 1, atk: 1, rtb: 0, rtbType: 'none', def: 0, res: 0, hp: 10,
      weapon: 'normal', level: 'normal',
    });
    const construct = simple(createUnitIdentity({
      version: 'com2_warlord_1.5.12.7', templateId: 37,
      baseRace: 'Special', baseFantastic: false,
    }), { combatSummoned: true });
    const paladins = simple(createUnitIdentity({
      version: 'com2_warlord_1.5.12.7', templateId: 113,
      baseRace: 'High Men', baseFantastic: false,
    }), { callToArmsPaladins: true });
    document.getElementById('gameVersion').value = 'com2_warlord_1.5.12.7';
    onVersionChange();
    const callControl = document.getElementById('aAbil_callToArmsPaladins');
    return {
      construct: { identity: construct.identity, ids: construct.identityTrace.map(step => step.id) },
      paladins: { identity: paladins.identity, ids: paladins.identityTrace.map(step => step.id) },
      callControl: {
        disabled: callControl.disabled,
        hidden: callControl.closest('.abil-item').classList.contains('abil-hidden'),
      },
    };
  });
  expect(report.construct.identity).toMatchObject({ race: 'Special', fantastic: true });
  expect(report.construct.ids).not.toContain('identity:constructCatapult');
  expect(report.paladins.identity).toMatchObject({ race: 'High Men', fantastic: false });
  expect(report.paladins.ids).not.toContain('identity:callToArmsPaladins');
  expect(report.callControl).toEqual({ disabled: true, hidden: true });
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
      figs: 1, atk: 1, rtb: 0, rtbType: 'none', def: 0, res: 0, hp: 20,
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
