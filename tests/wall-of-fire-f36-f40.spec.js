const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors, setValue } = require('./helpers');

test('F36 Warlord Wall of Fire spills across figure boundaries with fresh defenses', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const referenceNonAreaSpell = ({ atkStr, toHit, defStr, toBlock, hp,
      topFigHP, invulnBonus, cap }) => {
      const hits = binomialPMF(atkStr, toHit);
      const blocks = defenseBlockPMF(defStr, toBlock);
      const out = new Array(cap + 1).fill(0);
      const crossBoundaries = (remainder, booked, boundaryHP, probability) => {
        if (remainder <= boundaryHP) {
          out[Math.min(cap, booked + remainder)] += probability;
          return;
        }
        const nextRemainder = remainder - boundaryHP;
        for (let block = 0; block < blocks.length; block++) {
          if (blocks[block] < 1e-15) continue;
          crossBoundaries(
            Math.max(0, nextRemainder - block - invulnBonus),
            booked + boundaryHP,
            hp,
            probability * blocks[block],
          );
        }
      };
      for (let hit = 0; hit < hits.length; hit++) {
        if (hits[hit] < 1e-15) continue;
        for (let block = 0; block < blocks.length; block++) {
          if (blocks[block] < 1e-15) continue;
          crossBoundaries(
            Math.max(0, hit - block - invulnBonus),
            0,
            topFigHP,
            hits[hit] * blocks[block],
          );
        }
      }
      return out;
    };
    const wall = (overrides = {}, cap = 13) => buildWallOfFirePhase(true, {
      wofStr: 12,
      wofToHit: 1,
      wofSingleFigure: true,
      aDefForImm: 0,
      aToBlock: 0,
      aHP: 5,
      aInvulnBonus: 0,
      aAbilities: {},
      amplifiedDamage: false,
      version: 'com2_warlord_1.5.12.7',
      ...overrides,
    }).compute(1, Math.ceil(cap / (overrides.aHP || 5)), cap).dist;

    const makeUnit = (prefix, abilities = {}) => deriveUnitStats({
      prefix,
      version: 'com2_warlord_1.5.12.7',
      abilities,
      level: 'normal', weapon: 'normal', armor: 'normal', rtbType: 'none',
      unitType: 'normal', figs: 3, atk: prefix === 'a' ? 1 : 0, rtb: 0,
      modernAttacks: {}, def: 0, res: 10, hp: 5, dmg: 0,
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: -30,
      cityWalls: 'none', nodeAura: 'none', trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1,
    });
    const integrated = defenderAbilities => resolveCombat(
      makeUnit('a'), makeUnit('b', defenderAbilities), {
        version: 'com2_warlord_1.5.12.7', isRanged: false,
        wallOfFire: true, distance: 1,
      },
    ).totalDmgToA;

    const probabilisticParams = {
      atkStr: 12, toHit: 0.6, defStr: 3, toBlock: 0.4,
      hp: 5, topFigHP: 3, invulnBonus: 2, cap: 17,
    };
    return {
      woundedTop: wall({}, 13),
      multiBoundary: wall({ aHP: 3 }, 12),
      // Initial net damage is 10 against a wounded top figure with 2 HP. The first
      // remainder 8 rerolls to 6, crosses a full 3-HP figure, then the next remainder
      // 3 rerolls to 1. Total damage is therefore 2 + 3 + 1 = 6; applying fresh
      // Defense/Invulnerability only once would incorrectly return 8.
      freshDefenseAndInvulnerability: wall({
        aHP: 3,
        aDefForImm: 1,
        aToBlock: 1,
        aInvulnBonus: 1,
      }, 11),
      ordinary: wall({}, 20),
      amplified: wall({ amplifiedDamage: true }, 20),
      amplifiedZero: wall({ wofToHit: 0, amplifiedDamage: true }, 20),
      amplifiedImmune: wall({
        amplifiedDamage: true,
        aAbilities: { magicImmunity: true },
      }, 20),
      integratedOrdinary: integrated({}),
      integratedAmplified: integrated({ amplifier: true }),
      probabilistic: calcDamageSpellDist(
        1, probabilisticParams.atkStr, probabilisticParams.toHit,
        probabilisticParams.defStr, probabilisticParams.toBlock,
        probabilisticParams.hp, probabilisticParams.cap, probabilisticParams.invulnBonus,
        null, probabilisticParams.topFigHP, 'com2_warlord_1.5.12.7', {}, false,
      ),
      probabilisticReference: referenceNonAreaSpell(probabilisticParams),
      fullTopReference: referenceNonAreaSpell({ ...probabilisticParams, topFigHP: 5 }),
      categoryPriority: {
        normal: applyDamageSpellAmplifier({ normal: 2, irrec: 3, undead: 4 }, true),
        irrec: applyDamageSpellAmplifier({ normal: 0, irrec: 3, undead: 4 }, true),
        undead: applyDamageSpellAmplifier({ normal: 0, irrec: 0, undead: 4 }, true),
        zero: applyDamageSpellAmplifier({ normal: 0, irrec: 0, undead: 0 }, true),
        nonstacking: applyDamageSpellAmplifier({ normal: 2, irrec: 0, undead: 0 }, 2),
      },
    };
  });

  expect(report.woundedTop[12]).toBe(1);
  expect(report.multiBoundary[12]).toBe(1);
  expect(report.freshDefenseAndInvulnerability[6]).toBe(1);
  expect(report.ordinary[12]).toBe(1);
  expect(report.amplified[13]).toBe(1);
  expect(report.amplifiedZero[0]).toBe(1);
  expect(report.amplifiedZero.slice(1).every(p => p === 0)).toBe(true);
  expect(report.amplifiedImmune[0]).toBe(1);
  expect(report.amplifiedImmune.slice(1).every(p => p === 0)).toBe(true);
  expect(report.integratedAmplified[0]).toBeCloseTo(report.integratedOrdinary[0], 12);
  for (let damage = 1; damage < 15; damage++) {
    expect(report.integratedAmplified[damage + 1]).toBeCloseTo(
      report.integratedOrdinary[damage], 12,
    );
  }
  expect(report.integratedAmplified[15]).toBeCloseTo(
    (report.integratedOrdinary[14] || 0) + (report.integratedOrdinary[15] || 0), 12,
  );
  expect(report.probabilistic).toHaveLength(report.probabilisticReference.length);
  for (let damage = 0; damage < report.probabilisticReference.length; damage++) {
    expect(report.probabilistic[damage] || 0).toBeCloseTo(
      report.probabilisticReference[damage] || 0, 12,
    );
  }
  expect(report.probabilistic.some((p, damage) =>
    Math.abs((p || 0) - (report.fullTopReference[damage] || 0)) > 1e-8)).toBe(true);
  expect(report.categoryPriority).toEqual({
    normal: { normal: 3, irrec: 3, undead: 4 },
    irrec: { normal: 0, irrec: 4, undead: 4 },
    undead: { normal: 0, irrec: 0, undead: 5 },
    zero: { normal: 0, irrec: 0, undead: 0 },
    nonstacking: { normal: 3, irrec: 0, undead: 0 },
  });
  expectNoConsoleErrors(errors);
});

test('F40 uses calculated Teleporting and Merging independently in both modern engines', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const makeUnit = (version, prefix, abilities = {}) => deriveUnitStats({
      prefix,
      version,
      abilities,
      level: 'normal',
      weapon: 'normal',
      armor: 'normal',
      rtbType: 'none',
      unitType: 'normal',
      figs: 3,
      atk: prefix === 'a' ? 1 : 0,
      rtb: 0,
      modernAttacks: {},
      def: 0,
      res: 10,
      hp: 5,
      dmg: 0,
      ...(version.startsWith('com2') ? { hitChance: 70 } : { toHitMod: 70, toHitRtbMod: 70 }),
      toBlkMod: 0,
      cityWalls: 'none',
      nodeAura: 'none',
      trueLight: false,
      darkness: false,
      rangedCheck: false,
      rangedDist: 1,
    });
    const resolve = (version, abilities, defenderAbilities = {}) => {
      const result = resolveCombat(
        makeUnit(version, 'a', abilities),
        makeUnit(version, 'b', defenderAbilities),
        { version, isRanged: false, wallOfFire: true, distance: 1 },
      );
      return {
        incoming: result.totalDmgToA,
        sources: (result.phases || []).map(phase => phase.source),
      };
    };
    const modern = ['com2_1.05.11', 'com2_warlord_1.5.12.7'].map(version => ({
      version,
      plain: resolve(version, {}),
      teleporting: resolve(version, { teleporting: true }),
      merging: resolve(version, { merging: true }),
    }));
    const dos = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'].map(version => ({
      version,
      teleporting: resolve(version, { teleporting: true }),
      merging: resolve(version, { merging: true }),
    }));
    const twistTeleport = makeUnit('com2_warlord_1.5.12.7', 'a', {
      teleporting: true,
      temporalTwist: true,
    });
    const twistMerging = makeUnit('com2_warlord_1.5.12.7', 'a', {
      merging: true,
      temporalTwist: true,
    });
    const hierophanyTeleport = makeUnit('com2_warlord_1.5.12.7', 'a', {
      teleporting: true,
      hierophany: true,
    });
    const hierophanyMerging = makeUnit('com2_warlord_1.5.12.7', 'a', {
      merging: true,
      hierophany: true,
    });
    return {
      modern,
      dos,
      calculated: {
        twistTeleport: twistTeleport.abilities,
        twistMerging: twistMerging.abilities,
        hierophanyTeleport: hierophanyTeleport.abilities,
        hierophanyMerging: hierophanyMerging.abilities,
      },
      calculatedCombat: {
        twistTeleport: resolveCombat(twistTeleport, makeUnit('com2_warlord_1.5.12.7', 'b'), {
          version: 'com2_warlord_1.5.12.7', isRanged: false, wallOfFire: true, distance: 1,
        }).totalDmgToA,
        twistMerging: resolveCombat(twistMerging, makeUnit('com2_warlord_1.5.12.7', 'b'), {
          version: 'com2_warlord_1.5.12.7', isRanged: false, wallOfFire: true, distance: 1,
        }).totalDmgToA,
        hierophanyTeleport: resolveCombat(hierophanyTeleport, makeUnit('com2_warlord_1.5.12.7', 'b'), {
          version: 'com2_warlord_1.5.12.7', isRanged: false, wallOfFire: true, distance: 1,
        }).totalDmgToA,
        hierophanyMerging: resolveCombat(hierophanyMerging, makeUnit('com2_warlord_1.5.12.7', 'b'), {
          version: 'com2_warlord_1.5.12.7', isRanged: false, wallOfFire: true, distance: 1,
        }).totalDmgToA,
      },
    };
  });

  const positiveProbability = dist => dist.slice(1).reduce((sum, p) => sum + (p || 0), 0);
  const expectZeroDamage = dist => {
    expect(dist[0]).toBe(1);
    expect(positiveProbability(dist)).toBe(0);
  };
  for (const row of report.modern) {
    expect(positiveProbability(row.plain.incoming)).toBeGreaterThan(0);
    expectZeroDamage(row.teleporting.incoming);
    expectZeroDamage(row.merging.incoming);
  }
  for (const row of report.dos) {
    expect(positiveProbability(row.teleporting.incoming)).toBeGreaterThan(0);
    expect(positiveProbability(row.merging.incoming)).toBeGreaterThan(0);
  }
  // Temporal Twist's calculated strip is applied in combat normalization, while
  // Hierophany's UnitCalc strip is already visible on the derived card record.
  expect(report.calculated.twistTeleport.teleporting).toBe(true);
  expect(report.calculated.twistMerging.merging).toBe(true);
  expect(report.calculated.hierophanyTeleport.teleporting).toBe(false);
  expect(report.calculated.hierophanyMerging.merging).toBe(false);
  expect(positiveProbability(report.calculatedCombat.twistTeleport)).toBeGreaterThan(0);
  expectZeroDamage(report.calculatedCombat.twistMerging);
  expect(positiveProbability(report.calculatedCombat.hierophanyTeleport)).toBeGreaterThan(0);
  expect(positiveProbability(report.calculatedCombat.hierophanyMerging)).toBeGreaterThan(0);
  expectNoConsoleErrors(errors);
});

test('F40 roster, custom, state, swap, and matrix paths keep the controls separate', async ({ page }) => {
  const errors = await openCalculator(page);
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    await setValue(page, 'gameVersion', version);
    const roster = await page.evaluate(() => {
      const units = unitDatabases[document.getElementById('gameVersion').value];
      const find = ability => units.find(unit => (unit.abilities || []).includes(ability));
      const teleporting = find('Teleporting');
      const merging = find('Merging');
      const amplifier = find('Amplifier');
      const select = (prefix, unit) => {
        const el = document.getElementById(prefix + 'Unit');
        el.value = String(unit.id);
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return readUnitStats(prefix).abilities;
      };
      return {
        teleportingName: teleporting && teleporting.name,
        teleporting: teleporting ? select('a', teleporting).teleporting : null,
        mergingName: merging && merging.name,
        merging: merging ? select('b', merging).merging : null,
        matrixTeleporting: teleporting
          ? buildMatrixUnitStats('a', teleporting, {}, 'melee').abilities.teleporting : null,
        matrixMerging: merging
          ? buildMatrixUnitStats('b', merging, {}, 'melee').abilities.merging : null,
        amplifierName: amplifier && amplifier.name,
        amplifier: amplifier ? select('b', amplifier).amplifier : null,
        matrixAmplifier: amplifier
          ? buildMatrixUnitStats('b', amplifier, {}, 'melee').abilities.amplifier : null,
      };
    });
    expect(roster.teleportingName).toBeTruthy();
    expect(roster.teleporting).toBe(true);
    expect(roster.matrixTeleporting).toBe(true);
    if (version === 'com2_1.05.11') {
      expect(roster.mergingName).toBeFalsy();
      expect(roster.amplifierName).toBeFalsy();
    } else {
      expect(roster.mergingName).toBeTruthy();
      expect(roster.merging).toBe(true);
      expect(roster.matrixMerging).toBe(true);
      expect(roster.amplifierName).toBeTruthy();
      expect(roster.amplifier).toBe(true);
      expect(roster.matrixAmplifier).toBe(true);
    }
  }

  await setValue(page, 'gameVersion', 'com2_warlord_1.5.12.7');
  await setValue(page, 'aUnit', 'custom');
  await setValue(page, 'bUnit', 'custom');
  await setValue(page, 'aAbil_teleporting', true);
  await setValue(page, 'aAbil_merging', false);
  await setValue(page, 'bAbil_teleporting', false);
  await setValue(page, 'bAbil_merging', true);

  const restored = await page.evaluate(() => {
    const state = collectState();
    for (const id of ['aAbil_teleporting', 'aAbil_merging', 'bAbil_teleporting', 'bAbil_merging']) {
      document.getElementById(id).checked = false;
    }
    applyState(state);
    return ['aAbil_teleporting', 'aAbil_merging', 'bAbil_teleporting', 'bAbil_merging']
      .map(id => document.getElementById(id).checked);
  });
  expect(restored).toEqual([true, false, false, true]);

  await page.click('#swapBtn');
  await expect(page.locator('#aAbil_teleporting')).not.toBeChecked();
  await expect(page.locator('#aAbil_merging')).toBeChecked();
  await expect(page.locator('#bAbil_teleporting')).toBeChecked();
  await expect(page.locator('#bAbil_merging')).not.toBeChecked();

  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    await setValue(page, 'gameVersion', version);
    const hidden = await page.evaluate(() => ['teleporting', 'merging'].map(key => {
      const control = document.getElementById('aAbil_' + key);
      return {
        hidden: control.closest('.abil-item').classList.contains('abil-hidden'),
        checked: control.checked,
        calculated: !!readUnitStats('a').abilities[key],
      };
    }));
    expect(hidden).toEqual([
      { hidden: true, checked: false, calculated: false },
      { hidden: true, checked: false, calculated: false },
    ]);
  }

  expectNoConsoleErrors(errors);
});
