// R8.4 migrates stateful UI boundaries to independent source/base identity while retaining
// legacy preset and v1 persistence readers.
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('v2 state restores roster source identity and Custom base identity without live fields', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const change = (id, value) => {
      const control = document.getElementById(id);
      if (control.type === 'checkbox') control.checked = !!value;
      else control.value = String(value);
      control.dispatchEvent(new Event('change'));
    };
    change('gameVersion', 'com2_1.05.11');
    change('aUnit', 34); // Chosen: template 34, hero type 35.
    document.getElementById('aHP').value = '77'; // deliberate hand edit on a roster selection
    change('bUnit', 'custom');
    change('bBaseHero', true);
    change('bBaseFantastic', true);
    change('bBaseRace', 'Chaos');
    change('bSpecialUnit', 'golem');

    const blob = collectState();
    resetCalculatorState('mom_1.31');
    applyState(blob);
    const forbidden = side => ['templateId', 'heroTypeId', 'race', 'fantastic', 'version']
      .filter(key => Object.prototype.hasOwnProperty.call(blob.identity[side], key));
    return {
      blob,
      forbidden: { a: forbidden('a'), b: forbidden('b') },
      hasLegacyType: Object.keys(blob.ids).some(id => id.endsWith('Abil_unitType')),
      a: {
        selection: document.getElementById('aUnit').value,
        hp: document.getElementById('aHP').value,
        controls: readIdentityControls('a'),
        locked: ['aBaseHero', 'aBaseFantastic', 'aBaseRace', 'aSpecialUnit']
          .every(id => document.getElementById(id).disabled),
        source: { ...unitIdentity.a },
        calculated: { ...readUnitStats('a').identity },
      },
      b: {
        controls: readIdentityControls('b'),
        locked: ['bBaseHero', 'bBaseFantastic', 'bBaseRace', 'bSpecialUnit']
          .some(id => document.getElementById(id).disabled),
        source: { ...unitIdentity.b },
        calculated: { ...readUnitStats('b').identity },
      },
    };
  });

  expect(report.blob.v).toBe(2);
  expect(report.forbidden).toEqual({ a: [], b: [] });
  expect(report.hasLegacyType).toBe(false);
  expect(report.a.selection).toBe('34');
  expect(report.a.hp).toBe('77');
  expect(report.a.locked).toBe(true);
  expect(report.a.source).toMatchObject({ templateId: 34, heroTypeId: 35, isHero: true,
    baseRace: 'Life', baseFantastic: false, specialUnit: 'chosen' });
  expect(report.a.calculated).toMatchObject({ race: 'Life', fantastic: true });
  expect(report.b.controls).toEqual({ isHero: true, baseFantastic: true,
    baseRace: 'Chaos', specialUnit: 'golem' });
  expect(report.b.locked).toBe(false);
  expect(report.b.source).toMatchObject({ templateId: null, heroTypeId: null, isHero: true,
    baseRace: 'Chaos', baseFantastic: true, specialUnit: 'golem' });
  expect(report.b.calculated).toMatchObject({ race: 'Chaos', fantastic: true });
  expectNoConsoleErrors(errors);
});

test('legacy v1 default-diff identity restores through the compatibility reader', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const legacy = {
      v: 1,
      ids: {
        gameVersion: 'com2_1.05.11', aUnit: 'custom', bUnit: 'custom',
        aAbil_unitType: 'fantastic_nature', aHP: '19',
      },
      identity: { a: { race: 'Nature', name: 'Legacy Unit' }, b: null },
      generic: { a: false, b: false },
    };
    applyState(legacy);
    return {
      controls: readIdentityControls('a'),
      source: { ...unitIdentity.a },
      calculated: { ...readUnitStats('a').identity },
      hp: document.getElementById('aHP').value,
    };
  });
  expect(report.controls).toEqual({ isHero: false, baseFantastic: true,
    baseRace: 'Nature', specialUnit: 'none' });
  expect(report.source).toMatchObject({ templateId: null, heroTypeId: null,
    baseRace: 'Nature', baseFantastic: true, name: 'Legacy Unit' });
  expect(report.calculated).toMatchObject({ race: 'Nature', fantastic: true });
  expect(report.hp).toBe('19');
  expectNoConsoleErrors(errors);
});

test('version changes remap roster identity or clear source IDs without stale special state', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const changeVersion = version => {
      document.getElementById('gameVersion').value = version;
      onVersionChange();
      const selection = document.getElementById('aUnit').value;
      const unit = selection === 'custom' ? null
        : (unitDatabases[version] || []).find(value => String(value.id) === selection);
      return {
        version,
        selection,
        source: { ...unitIdentity.a },
        expected: unit ? createRosterUnitIdentity(version, unit) : null,
        controls: readIdentityControls('a'),
        locked: document.getElementById('aBaseRace').disabled,
      };
    };
    document.getElementById('gameVersion').value = 'com2_1.05.11';
    onVersionChange();
    const golem = unitDatabases['com2_1.05.11'].find(unit => unit.templateId === 81);
    document.getElementById('aUnit').value = String(golem.id);
    document.getElementById('aUnit').dispatchEvent(new Event('change'));
    const roster = [
      changeVersion('com2_warlord_1.5.12.7'),
      changeVersion('com_6.08'),
      changeVersion('mom_1.31'),
    ];

    document.getElementById('gameVersion').value = 'com2_1.05.11';
    onVersionChange();
    document.getElementById('aUnit').value = 'custom';
    document.getElementById('aUnit').dispatchEvent(new Event('change'));
    document.getElementById('aBaseFantastic').checked = true;
    document.getElementById('aBaseRace').value = 'Chaos';
    document.getElementById('aSpecialUnit').value = 'chosen';
    document.getElementById('aSpecialUnit').dispatchEvent(new Event('change'));
    const custom = changeVersion('mom_1.31');
    return { roster, custom };
  });
  for (const state of report.roster) {
    expect(state.source.version).toBe(state.version);
    if (state.expected) {
      expect(state.source).toMatchObject(state.expected);
      expect(state.locked).toBe(true);
    } else {
      expect(state.source).toMatchObject({ templateId: null, heroTypeId: null });
      expect(state.locked).toBe(false);
    }
    expect(['none', 'golem']).toContain(state.controls.specialUnit);
  }
  expect(report.custom.selection).toBe('custom');
  expect(report.custom.source).toMatchObject({ version: 'mom_1.31', templateId: null,
    heroTypeId: null, baseRace: 'Chaos', baseFantastic: true, specialUnit: 'none' });
  expect(report.custom.controls).toEqual({ isHero: false, baseFantastic: true,
    baseRace: 'Chaos', specialUnit: 'none' });
  expect(report.custom.locked).toBe(false);
  expectNoConsoleErrors(errors);
});

test('swap exchanges complete source/base identity and remains an involution without clobbering edits', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const change = (id, value) => {
      const control = document.getElementById(id);
      if (control.type === 'checkbox') control.checked = !!value;
      else control.value = String(value);
      control.dispatchEvent(new Event('change'));
    };
    change('gameVersion', 'com_6.08');
    change('aUnit', 38); // roster id 38 carries source template 37
    document.getElementById('aHP').value = '71';
    change('aAbil_combatSummoned', true);
    change('bUnit', 'custom');
    change('bBaseHero', true);
    change('bBaseFantastic', true);
    change('bBaseRace', 'Death');
    document.getElementById('bAbil_elemArmor').value = 'elementalArmor';
    change('bSpecialUnit', 'golem');
    document.getElementById('bHP').value = '23';
    const before = collectFullState();
    swapAttackerDefender();
    const once = {
      a: { source: { ...unitIdentity.a }, controls: readIdentityControls('a'),
        hp: document.getElementById('aHP').value, stats: readUnitStats('a'),
        elements: document.getElementById('aAbil_elemArmor').value,
        elementsLocked: document.getElementById('aAbil_elemArmor').disabled },
      b: { source: { ...unitIdentity.b }, controls: readIdentityControls('b'),
        hp: document.getElementById('bHP').value, stats: readUnitStats('b') },
    };
    swapAttackerDefender();
    return { before, once, twice: collectFullState() };
  });
  expect(report.once.a.source).toMatchObject({ templateId: null, heroTypeId: null,
    isHero: true, baseRace: 'Death', baseFantastic: true, specialUnit: 'golem' });
  expect(report.once.a.hp).toBe('23');
  expect(report.once.a.elements).toBe('resistElements');
  expect(report.once.a.elementsLocked).toBe(true);
  expect(report.once.b.source).toMatchObject({ templateId: 37, heroTypeId: null,
    baseRace: 'Generic', baseFantastic: false, specialUnit: 'catapult' });
  expect(report.once.b.hp).toBe('71');
  expect(report.once.b.stats.identity).toMatchObject({ race: 'Nature', fantastic: true });
  expect(report.once.b.stats.weapon).toBe('magic');
  expect(report.twice).toEqual(report.before);
  expectNoConsoleErrors(errors);
});

test('R8 presets are authoritative for Custom only and legacy unitType callers remain compatible', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    PRESETS.__r84Identity = {
      version: 'com2_1.05.11',
      a: { atk: 2, hp: 10, unitType: 'normal', identity: {
        isHero: true, baseFantastic: true, baseRace: 'Chaos', specialUnit: 'chosen',
      } },
      b: { hp: 10, unitType: 'fantastic_nature' },
    };
    applyPreset('__r84Identity');
    const custom = { a: readUnitStats('a'), b: readUnitStats('b') };

    PRESETS.__r84Roster = {
      version: 'com2_1.05.11', aUnitName: 'Golem',
      a: { hp: 99, identity: {
        isHero: true, baseFantastic: true, baseRace: 'Chaos', specialUnit: 'chosen',
      } },
      b: { hp: 10 },
    };
    applyPreset('__r84Roster');
    const roster = { source: { ...unitIdentity.a }, controls: readIdentityControls('a') };
    applyPreset('sanctifyTrueLightWarlord');
    const sanctify = {
      controls: readIdentityControls('a'),
      source: { ...unitIdentity.a },
      stats: readUnitStats('a'),
      checked: document.getElementById('aAbil_sanctify').checked,
    };
    delete PRESETS.__r84Identity;
    delete PRESETS.__r84Roster;
    return { custom, roster, sanctify };
  });
  expect(report.custom.a.identity).toMatchObject({ templateId: null, heroTypeId: null,
    isHero: true, baseFantastic: true, baseRace: 'Chaos', specialUnit: 'chosen',
    race: 'Life', fantastic: true });
  expect(report.custom.b.identity).toMatchObject({ baseFantastic: true,
    baseRace: 'Nature', race: 'Nature', fantastic: true });
  expect(report.roster.source).toMatchObject({ templateId: 81, heroTypeId: null,
    isHero: false, baseFantastic: false, baseRace: 'Dwarf', specialUnit: 'golem' });
  expect(report.roster.controls).toEqual({ isHero: false, baseFantastic: false,
    baseRace: 'Dwarf', specialUnit: 'golem' });
  expect(report.sanctify).toMatchObject({ checked: true, stats: {
    unitType: 'normal_life', identity: { race: 'Life', fantastic: false }, atk: 6,
  } });
  expectNoConsoleErrors(errors);
});

test('special options and ordered live realm overrides preserve base identity', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const input = (version, specialUnit, abilities = {}) => ({
      prefix: 'a', version, abilities,
      identity: createCustomUnitIdentity(version, {
        isHero: false, baseRace: 'Dwarf', baseFantastic: false, specialUnit,
      }),
      figs: 1, atk: 1, def: 0, res: 5, hp: 10, rtb: 9, rtbType: 'boulder',
      weapon: 'normal', armor: 'normal', level: 'normal', toHitRtbMod: 70,
    });
    const derive = (version, special, abilities) => deriveUnitStats(input(version, special, abilities));
    const options = {
      mom: derive('mom_1.31', 'none'),
      comGolem: derive('com_6.08', 'golem'),
      comZombies: derive('com_6.08', 'zombies'),
      comCatapult: derive('com_6.08', 'catapult'),
      modernGolem: derive('com2_1.05.11', 'golem'),
      modernChosen: derive('com2_1.05.11', 'chosen'),
      warlordGolem: derive('com2_warlord_1.5.12.7', 'golem'),
      warlordChosen: derive('com2_warlord_1.5.12.7', 'chosen'),
    };
    const catapult = {
      ordinary: derive('com_6.08', 'catapult', {}),
      summoned: derive('com_6.08', 'catapult', { combatSummoned: true }),
    };
    const ordered = [
      {},
      { ccDefense: true },
      { ccDefense: true, undead: true },
      { ccDefense: true, undead: true, mysticSurge: true },
      { ccDefense: true, undead: true, mysticSurge: true, sanctify: true, clergy: true },
    ].map(abilities => derive('com2_warlord_1.5.12.7', 'chosen', abilities));
    return { options, catapult, ordered };
  });
  for (const value of Object.values(report.options)) {
    expect(value.identity).toMatchObject({ templateId: null, heroTypeId: null,
      baseRace: 'Dwarf', baseFantastic: false });
  }
  expect(report.options.comGolem.abilities.elemArmor).toBe('resistElements');
  expect(report.options.comZombies.identity.fantastic).toBe(true);
  expect(report.options.modernChosen.identity).toMatchObject({ race: 'Life', fantastic: true });
  expect(report.options.warlordChosen.identity).toMatchObject({ race: 'Life', fantastic: true });
  expect(report.catapult.ordinary.identity).toMatchObject({ race: 'Dwarf', fantastic: false });
  expect(report.catapult.ordinary.weapon).toBe('normal');
  expect(report.catapult.summoned.identity).toMatchObject({ race: 'Nature', fantastic: true });
  expect(report.catapult.summoned.weapon).toBe('magic');
  expect(report.ordered.map(value => [value.identity.race, value.unitType])).toEqual([
    ['Life', 'fantastic_life'],
    ['Chaos', 'fantastic_chaos'],
    ['Death', 'fantastic_death'],
    ['No Heal', 'fantastic_unaligned'],
    ['No Heal', 'fantastic_unaligned'],
  ]);
  expectNoConsoleErrors(errors);
});

test('production Matrix rows and worker match main cards for an identity-sensitive Construct Catapult', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(async () => {
    const version = 'com_6.08';
    document.getElementById('gameVersion').value = version;
    onVersionChange();

    const attacker = document.getElementById('aUnit');
    attacker.value = '38'; // CoM 1 roster ID 38 carries source template ID 37.
    attacker.dispatchEvent(new Event('change'));
    document.getElementById('aAbil_combatSummoned').checked = true;

    const defenderSelection = document.getElementById('bUnit');
    defenderSelection.value = 'custom';
    defenderSelection.dispatchEvent(new Event('change'));
    setIdentityControls('b', { baseFantastic: true, baseRace: 'Chaos', specialUnit: 'none' });
    document.getElementById('bHP').value = '20';
    document.getElementById('bDef').value = '2';
    document.getElementById('bAbil_weaponImmunity').checked = true;

    matrixPropertyState = {
      a: [{ key: 'combatSummoned', enabled: true, value: true }],
      b: [], global: [], _seeded: true,
    };
    const construct = predefinedMatrixUnitRows('a', matrixAppliedEnchantments('a'), 'ranged')
      .find(row => row.unitId === '38').stats;
    const ordinary = predefinedMatrixUnitRows('a', {}, 'ranged')
      .find(row => row.unitId === '38').stats;
    const defender = selectedMatrixUnitRow('b', 'ranged').stats;
    const mainAttacker = readUnitStats('a', { rangedCheck: true, rangedDist: 1 });
    const mainDefender = readUnitStats('b');
    const opts = { isRanged: true, version, wallOfFire: false };
    const ratio = stats => {
      const result = resolveCombat(stats, defender, opts);
      return distExpectedValue(result.totalDmgToB) / result.bRemHP;
    };
    const mainResult = resolveCombat(mainAttacker, mainDefender, opts);
    const main = distExpectedValue(mainResult.totalDmgToB) / mainResult.bRemHP;
    const matrixMain = ratio(construct);
    const ordinaryMain = ratio(ordinary);

    // Same builder the matrix modal uses, so the worker under test imports exactly what the
    // app's worker imports (index.html's data-worker tags).
    const url = URL.createObjectURL(new Blob([matrixWorkerSource()], { type: 'text/javascript' }));
    const workerRatio = await new Promise((resolve, reject) => {
      const worker = new Worker(url);
      worker.onmessage = event => { worker.terminate(); resolve(event.data.ratios[0]); };
      worker.onerror = reject;
      worker.postMessage({ attackerStats: construct, allDefenderStats: [defender], opts, rowIndex: 0 });
    });
    URL.revokeObjectURL(url);
    return {
      main, matrixMain, ordinaryMain, workerRatio,
      identity: construct.identity,
      customIdentity: defender.identity,
      mainIdentity: mainAttacker.identity,
      mainCustomIdentity: mainDefender.identity,
      weapon: construct.weapon,
      trace: construct.identityTrace.map(step => step.id),
    };
  });

  expect(report.identity).toMatchObject({ race: 'Nature', fantastic: true, baseFantastic: false });
  expect(report.identity).toEqual(report.mainIdentity);
  expect(report.customIdentity).toMatchObject({ race: 'Chaos', fantastic: true, baseRace: 'Chaos', baseFantastic: true });
  expect(report.customIdentity).toEqual(report.mainCustomIdentity);
  expect(report.weapon).toBe('magic');
  expect(report.trace).toContain('identity:com1ConstructCatapult');
  expect(report.matrixMain).toBeCloseTo(report.main, 12);
  expect(report.main).toBeGreaterThan(report.ordinaryMain);
  expect(report.workerRatio).toBeCloseTo(report.main, 12);
  expectNoConsoleErrors(errors);
});
