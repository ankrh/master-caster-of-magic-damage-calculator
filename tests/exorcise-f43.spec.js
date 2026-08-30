const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F43 maps CoM common 0x0800 to the literal Exorcise consumer', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const makeUnit = (version, prefix, overrides = {}) => deriveUnitStats({
      prefix,
      version,
      abilities: {},
      level: 'normal',
      weapon: 'normal',
      armor: 'normal',
      rtbType: 'none',
      unitType: 'normal',
      figs: 1,
      atk: 0,
      rtb: 0,
      def: 0,
      res: 0,
      hp: 10,
      dmg: 0,
      ...(version.startsWith('com2') ? { hitChance: 70 } : { toHitMod: 70, toHitRtbMod: 70 }),
      toBlkMod: 70,
      cityWalls: 'none',
      nodeAura: 'none',
      trueLight: false,
      darkness: false,
      enemyEternalNight: false,
      rangedCheck: false,
      rangedDist: 1,
      warpReality: false,
      chaosChannels: 'none',
      ...overrides,
    });

    const version = 'com_6.08';
    const fail = (unitType, abilities = {}, value = 47) =>
      exorciseFailProb(5, abilities, unitType, value, version);
    const target = extraAbilities => makeUnit(version, 'b', {
      unitType: 'fantastic_nature',
      baseFantastic: true,
      def: 1,
      res: 5,
      hp: 10,
      toBlkMod: 70,
      abilities: { deathImmunity: true, ...extraAbilities },
    });
    const resolve = (attacker, defender, isRanged = false) => resolveCombat(attacker, defender, {
      version,
      isRanged,
      wallOfFire: false,
      distance: 1,
    });
    const exorcise = { exorcise: 47 };
    const melee = resolve(makeUnit(version, 'a', { atk: 1, abilities: exorcise }), target());
    const ranged = resolve(makeUnit(version, 'a', {
      rtb: 1,
      rtbType: 'missile',
      abilities: exorcise,
    }), target(), true);
    const gaze = resolve(makeUnit(version, 'a', {
      rtb: 1,
      rtbType: 'gaze_death',
      abilities: exorcise,
    }), target());
    const twoFigure = resolve(makeUnit(version, 'a', {
      figs: 2,
      atk: 1,
      abilities: exorcise,
    }), makeUnit(version, 'b', {
      figs: 2,
      unitType: 'fantastic_nature',
      baseFantastic: true,
      def: 1,
      res: 5,
      hp: 10,
      toBlkMod: 70,
      abilities: { deathImmunity: true },
    }));

    const angel = Object.values(VERSION_DATA[version] || {}).find(unit => unit.name === 'Angel');
    const parsedAngelAbilities = parseAbilitiesFromUnit(angel);
    const angelStrike = resolve(makeUnit(version, 'a', {
      atk: 1,
      abilities: { exorcise: parsedAngelAbilities.exorcise },
    }), target());
    return {
      literal: [fail('fantastic_nature', {}, -50), fail('fantastic_nature', {}, 47)],
      targets: {
        boundary: fail('fantastic_arcane'),
        nature: fail('fantastic_nature'),
        life: fail('fantastic_life'),
        normal: fail('normal'),
        undead: fail('fantastic_death', { undead: true }),
      },
      immunities: {
        magic: fail('fantastic_nature', { magicImmunity: true }),
        spellLock: fail('fantastic_nature', { spellLock: true }),
      },
      channels: {
        melee: melee.totalDmgToB[10],
        ranged: ranged.totalDmgToB[10],
        gaze: gaze.totalDmgToB[10],
        gazeLabel: gaze.phases.find(phase => phase.label.includes('Gaze'))?.label,
        twoFigureBothBanished: twoFigure.totalDmgToB[20],
      },
      angelAbilities: angel && angel.abilities,
      angelParsedExorcise: parsedAngelAbilities.exorcise,
      angelExorcise: angelStrike.totalDmgToB[10],
      tooltip: ABILITY_DEFS.find(def => def.key === 'exorcise').tooltip,
    };
  });

  expect(report.literal).toEqual([0.8, 0.8]);
  expect(report.targets).toEqual({ boundary: 0.8, nature: 0.8, life: 0.8, normal: 0, undead: 1 });
  expect(report.immunities).toEqual({ magic: 0, spellLock: 0 });
  expect(report.channels.melee).toBeCloseTo(0.8, 12);
  expect(report.channels.ranged).toBeCloseTo(0.8, 12);
  // CoM's patched zero-strength abort means the common flag fires once with the Gaze and
  // again with the subsequent zero-strength melee call: 1 - (1 - 0.8)^2 = 0.96.
  expect(report.channels.gaze).toBeCloseTo(0.96, 12);
  expect(report.channels.gazeLabel).toContain('Exorcise');
  expect(report.channels.twoFigureBothBanished).toBeCloseTo(0.64, 12);
  expect(report.angelAbilities).toContain('Exorcise');
  expect(report.angelAbilities.some(ability => ability.startsWith('Exorcise='))).toBe(false);
  expect(report.angelParsedExorcise).toBe(0);
  expect(report.angelExorcise).toBeCloseTo(0.8, 12);
  expect(report.tooltip).toContain('literal −3');
  expect(report.tooltip).toContain('Spell Lock blocks it');
  expectNoConsoleErrors(errors);
});

test('F43 gates the two DOS names and leaves the other four version mechanics intact', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const versions = [
      'mom_1.31',
      'mom_cp_1.60.00',
      'com_6.08',
      'com2_1.05.11',
      'com2_warlord_1.5.12.7',
    ];
    const defs = Object.fromEntries(abilityUiDefs()
      .filter(def => ['dispelEvil', 'exorcise', 'spellLock'].includes(def.key))
      .map(def => [(def.source + ':' + def.key), def]));
    const gates = Object.fromEntries(versions.map(version => [version, {
      dispelEvil: abilityVersionGated(defs['ability:dispelEvil'], version),
      exorcise: abilityVersionGated(defs['ability:exorcise'], version),
      spellLock: abilityVersionGated(defs['enchantment:spellLock'], version),
    }]));
    const versionSelect = document.getElementById('gameVersion');
    const matrixSpellLock = Object.fromEntries(versions.map(version => {
      versionSelect.value = version;
      return [version, matrixPropertyCandidates('b').some(def => def.key === 'spellLock')];
    }));
    // A control the MoM builds hide names the MoM rider only by mistake: `AttackFlagsT` has an
    // `exorcise` member and no Dispel Evil one, so no modern-only control can face Dispel Evil
    // (F197 — the `spiritLink` tooltip did). A control visible in MoM as well may legitimately
    // name both riders, so the filter is "hidden in both MoM builds, live in either modern one".
    const modernOnlyNamingDispelEvil = abilityUiDefs()
      .filter(def => (!abilityVersionGated(def, 'com2_1.05.11')
          || !abilityVersionGated(def, 'com2_warlord_1.5.12.7'))
        && abilityVersionGated(def, 'mom_1.31')
        && abilityVersionGated(def, 'mom_cp_1.60.00')
        && /Dispel Evil/.test(def.tooltip || ''))
      .map(def => def.source + ':' + def.key);
    return {
      gates,
      matrixSpellLock,
      modernOnlyNamingDispelEvil,
      spiritLinkTooltip: ENCHANTMENT_DEFS.find(def => def.key === 'spiritLink').tooltip,
      unaffected: {
        mom131Dispel: dispelEvilFailProb(5, {}, 'fantastic_chaos'),
        cp160Dispel: dispelEvilFailProb(5, {}, 'fantastic_death'),
        com2Exorcise: exorciseFailProb(5, {}, 'fantastic_nature', -1, 'com2_1.05.11'),
        warlordExorcise: exorciseFailProb(5, {}, 'fantastic_nature', -1,
          'com2_warlord_1.5.12.7'),
      },
    };
  });

  expect(report.gates).toEqual({
    'mom_1.31': { dispelEvil: false, exorcise: true, spellLock: true },
    'mom_cp_1.60.00': { dispelEvil: false, exorcise: true, spellLock: true },
    'com_6.08': { dispelEvil: true, exorcise: false, spellLock: false },
    'com2_1.05.11': { dispelEvil: true, exorcise: false, spellLock: true },
    'com2_warlord_1.5.12.7': { dispelEvil: true, exorcise: false, spellLock: true },
  });
  expect(report.matrixSpellLock).toEqual({
    'mom_1.31': false,
    'mom_cp_1.60.00': false,
    'com_6.08': true,
    'com2_1.05.11': false,
    'com2_warlord_1.5.12.7': false,
  });
  expect(report.unaffected).toEqual({
    mom131Dispel: 0.9,
    cp160Dispel: 0.9,
    com2Exorcise: 0.6,
    warlordExorcise: 0.6,
  });
  expect(report.modernOnlyNamingDispelEvil).toEqual([]);
  expect(report.spiritLinkTooltip).toContain('Exorcise');
  expectNoConsoleErrors(errors);
});
