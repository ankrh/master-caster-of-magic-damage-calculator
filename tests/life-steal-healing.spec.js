const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F28 Combatheal preserves exact categories, irrecoverable damage, overheal division, cap, and dead figures', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const ordered = combatHealTransition({ figures: 3, hp: 10, totalDamage: 15,
      irrecoverableDamage: 2, undeadDamage: 4, bonusHp: 0 }, 8, true, false);
    const irrecoverable = combatHealTransition({ figures: 3, hp: 10, totalDamage: 15,
      irrecoverableDamage: 2, undeadDamage: 4, bonusHp: 0 }, 20, true, false);
    const capped = combatHealTransition({ figures: 2, hp: 10, totalDamage: 0,
      irrecoverableDamage: 0, undeadDamage: 0, bonusHp: 89 }, 5, true, false);
    const deadNoHealing = combatHealTransition({ figures: 3, hp: 10, totalDamage: 20,
      irrecoverableDamage: 20, undeadDamage: 0, bonusHp: 0, noHealing: true }, 8, true, false);
    const regen = combatHealTransition({ figures: 1, hp: 10, totalDamage: 5,
      irrecoverableDamage: 1, undeadDamage: 2, bonusHp: 0, noHealing: true }, 2, false, true);
    return { ordered, irrecoverable, capped, deadNoHealing, regen };
  });

  expect(report.ordered.healedDamage).toBe(8);
  expect(report.ordered.state.totalDamage).toBe(7);
  expect(report.ordered.state.undeadDamage).toBe(4); // ordinary damage first
  expect(report.irrecoverable.state.totalDamage).toBe(2);
  expect(report.irrecoverable.state.irrecoverableDamage).toBe(2);
  expect(report.irrecoverable.state.undeadDamage).toBe(0);
  expect(report.irrecoverable.bonusHpGain).toBe(2);
  expect(report.capped.bonusHpGain).toBe(1);
  expect(report.capped.state.bonusHp).toBe(90);
  expect(report.deadNoHealing.state.totalDamage).toBe(36);
  expect(report.deadNoHealing.state.irrecoverableDamage).toBe(36);
  expect(report.deadNoHealing.state.bonusHp).toBe(8);
  expect(report.regen.healedDamage).toBe(2);
  expect(report.regen.bonusHpGain).toBe(0);
  expectNoConsoleErrors(errors);
});

test('F28 raw Life Steal stays uncapped and repeated calls convolve exact heal state', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const state = { figures: 2, hp: 10, totalDamage: 7,
      irrecoverableDamage: 2, undeadDamage: 2, bonusHp: 0 };
    const spec = { poisonStr: 0, poisonFail: 0, stoningFail: 0,
      deathTouchFail: 0, dispelEvilFail: 0, exorciseFail: 0,
      destructionFail: 0, targetHP: 1, lifeStealMod: -3,
      lifeStealRes: 0, immDist: null, bloodsucker: false,
      version: 'com2_1.05.11', sourceState: state };
    const first = convolveTouchAttacks([1], 1, 2, spec);
    const haste = repeatTouchAttack(first, [1], 1, 2, spec);
    const expectedRaw = calcLifeStealRawDist(4, 0, -3);
    const makeUnit = (prefix, overrides = {}) => deriveUnitStats({
      prefix, version: 'com2_1.05.11', abilities: {}, level: 'normal',
      weapon: 'normal', armor: 'normal', rtbType: 'none', unitType: 'normal',
      figs: 1, atk: 0, rtb: 0, modernAttacks: {}, def: 0, res: 0, hp: 10, dmg: 0,
      hitChance: 70, toBlkMod: 70, cityWalls: 'none',
      nodeAura: 'none', wallOfFire: false, trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1, ...overrides,
    });
    const fsHaste = resolveCombat(makeUnit('a', { figs: 2, atk: 1, dmg: 7,
      irrecoverableDamage: 2, undeadDamage: 2,
      abilities: { lifeSteal: -3, haste: true, firstStrike: true } }),
    makeUnit('b', { figs: 4, hp: 20 }),
    { version: 'com2_1.05.11', isRanged: false, wallOfFire: false });
    renderLifeStealSummary(fsHaste, 'com2_1.05.11');
    const sum = dist => dist.reduce((a, b) => a + b, 0);
    return {
      firstDamage: first.dist,
      firstRawEV: first.rawDrainEV,
      firstRawSum: sum(first.lifeStealDist),
      hasteRaw: haste.lifeStealDist,
      expectedRaw,
      fsHasteRaw: fsHaste.aLifeStealRawDist,
      fsHasteBenefit: fsHaste.aLifeStealExpected,
      hasteDamage: haste.dist,
      hasteSum: sum(haste.dist),
      hasteRawSum: sum(haste.lifeStealDist),
      hasStateBenefits: haste.lifeStealEV > 0 && haste.bonusHpEV > 0,
      summary: document.getElementById('lifeStealSummary').textContent,
    };
  });

  expect(report.firstDamage[1]).toBeCloseTo(1, 12);
  expect(report.firstRawEV).toBeCloseTo(17, 12);
  expect(report.firstRawSum).toBeCloseTo(1, 12);
  expect(report.hasteRaw).toHaveLength(report.expectedRaw.length);
  report.hasteRaw.forEach((probability, i) => {
    expect(probability).toBeCloseTo(report.expectedRaw[i], 12);
    expect(report.fsHasteRaw[i]).toBeCloseTo(report.expectedRaw[i], 12);
  });
  expect(report.fsHasteBenefit).toBeGreaterThan(0);
  expect(report.hasteDamage[1]).toBeCloseTo(1, 12);
  expect(report.hasteSum).toBeCloseTo(1, 12);
  expect(report.hasteRawSum).toBeCloseTo(1, 12);
  expect(report.hasStateBenefits).toBe(true);
  expect(report.summary).toContain('raw Life Steal drain');
  expect(report.summary).toContain('applied self-heal / bonus-HP benefit');
  expectNoConsoleErrors(errors);
});

test('F57 DOS healing reproduces categories, restoration, and build differences', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const category = version => dosLifeStealHealTransition({
      version, figures: 3, baseHp: 10, totalDamage: 12,
      irreversibleDamage: 2, undeadDamage: 4, extraHits: 0,
    }, 8);
    const extra = version => dosLifeStealHealTransition({
      version, figures: 4, baseHp: 10, regularDamage: 0,
      undeadDamage: 0, irreversibleDamage: 20,
      currentFigures: 1, frontFigureDamage: 0, extraHits: 0,
    }, 50);
    const comCap = dosLifeStealHealTransition({
      version: 'com_6.08', figures: 1, baseHp: 10, regularDamage: 0,
      undeadDamage: 0, irreversibleDamage: 0,
      currentFigures: 1, frontFigureDamage: 0, extraHits: 88,
    }, 20);
    const nonnegativeFront = dosLifeStealHealTransition({
      version: 'mom_1.31', figures: 4, baseHp: 10, regularDamage: 9,
      undeadDamage: 0, irreversibleDamage: 0,
      currentFigures: 4, frontFigureDamage: 9, extraHits: 0,
    }, 1);
    const signedHits = dosLifeStealHealTransition({
      version: 'mom_1.31', figures: 3, baseHp: 10, regularDamage: 0,
      undeadDamage: 0, irreversibleDamage: 0,
      currentFigures: 1, frontFigureDamage: 0, extraHits: 120,
    }, 1);
    const cpWrappedEffectiveMax = dosLifeStealHealTransition({
      version: 'mom_cp_1.60.00', figures: 4, baseHp: 1, regularDamage: 0,
      undeadDamage: 0, irreversibleDamage: 200,
      currentFigures: 1, frontFigureDamage: 0, extraHits: 0,
    }, 100);
    const incomingCaps = applyOutcomeDamageToState(normalizeDosCombatHealState({
      version: 'com_6.08', figures: 10, baseHp: 10,
      regularDamage: 190, undeadDamage: 195, irreversibleDamage: 199,
      currentFigures: 10, frontFigureDamage: 0, extraHits: 0,
    }), {
      damage: 30, normalDamage: 15, undeadDamage: 10, irrecoverableDamage: 5,
    });
    return {
      momCategory: category('mom_1.31'),
      cpCategory: category('mom_cp_1.60.00'),
      comCategory: category('com_6.08'),
      momExtra: extra('mom_1.31'),
      cpExtra: extra('mom_cp_1.60.00'),
      comExtra: extra('com_6.08'),
      comCap,
      nonnegativeFront,
      signedHits,
      cpWrappedEffectiveMax,
      incomingCaps,
    };
  });

  for (const result of [report.momCategory, report.cpCategory, report.comCategory]) {
    expect(result.state.regularDamage).toBe(0);
    expect(result.state.undeadDamage).toBe(2);
    expect(result.state.irreversibleDamage).toBe(2);
    expect(result.state.currentFigures).toBe(3);
    expect(result.state.frontFigureDamage).toBe(4);
  }
  expect(report.momCategory.state.extraHits).toBe(1);
  expect(report.cpCategory.state.extraHits).toBe(0);
  expect(report.comCategory.state.extraHits).toBe(0);
  expect(report.momExtra.state.currentFigures).toBe(4);
  expect(report.momExtra.state.extraHits).toBe(5);
  expect(report.cpExtra.state.currentFigures).toBe(2);
  expect(report.cpExtra.state.extraHits).toBe(20);
  expect(report.cpExtra.state.irreversibleDamage).toBe(60);
  expect(report.comExtra.state.currentFigures).toBe(4);
  expect(report.comExtra.state.extraHits).toBe(5);
  expect(report.comCap.state.extraHits).toBe(90);
  expect(report.nonnegativeFront.state.frontFigureDamage).toBe(8);
  expect(report.nonnegativeFront.state.extraHits).toBe(0);
  expect(report.signedHits.state.currentFigures).toBe(3);
  expect(report.signedHits.state.frontFigureDamage).toBe(0);
  expect(report.signedHits.state.extraHits).toBe(204);
  expect(report.cpWrappedEffectiveMax.state.currentFigures).toBe(60);
  expect(report.cpWrappedEffectiveMax.state.extraHits).toBe(0);
  expect(report.incomingCaps).toMatchObject({
    regularDamage: 200,
    undeadDamage: 200,
    irreversibleDamage: 200,
    currentFigures: 7,
    frontFigureDamage: 0,
  });
  expectNoConsoleErrors(errors);
});

test('F57 correlated CoM Life Steal retains the 24-HP First Strike suppression', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const makeUnit = (prefix, overrides = {}) => deriveUnitStats({
      prefix, version: 'com_6.08', abilities: {}, level: 'normal',
      weapon: 'normal', armor: 'normal', rtbType: 'none', unitType: 'normal',
      figs: 1, atk: 0, rtb: 0, def: 0, res: 0, hp: 10, dmg: 0,
      irrecoverableDamage: 0, undeadDamage: 0, baseBonusHp: 0,
      toHitMod: 70, toHitRtbMod: 70, toBlkMod: 70, cityWalls: 'none',
      nodeAura: 'none', wallOfFire: false, trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1, ...overrides,
    });
    const run = haste => resolveCombat(
      makeUnit('a', {
        atk: 60,
        abilities: { doom: true, firstStrike: true, lifeSteal: -20,
          ...(haste ? { haste: true } : {}) },
      }),
      makeUnit('b', { atk: 10, hp: 30, abilities: { doom: true } }),
      { version: 'com_6.08', isRanged: false, wallOfFire: false },
    );
    return { ordinary: run(false).totalDmgToA, hasted: run(true).totalDmgToA };
  });

  // A 30-HP front figure suppresses First Strike. The main attack and counter
  // therefore use one frozen snapshot, so B's deterministic counter still lands;
  // CoM's suppressed path also omits the Haste second strike.
  expect(report.ordinary[5]).toBeCloseTo(1, 12);
  expect(report.hasted[5]).toBeCloseTo(1, 12);
  expectNoConsoleErrors(errors);
});

test('F57 DOS correlation restores later attackers and preserves frozen simultaneous exchange', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const makeUnit = (version, prefix, overrides = {}) => deriveUnitStats({
      prefix, version, abilities: {}, level: 'normal', weapon: 'normal',
      armor: 'normal', rtbType: 'none', unitType: 'normal', figs: 1,
      atk: 0, rtb: 0, def: 0, res: 0, hp: 10, dmg: 0,
      irrecoverableDamage: 0, undeadDamage: 0, baseBonusHp: 0,
      toHitMod: 70, toHitRtbMod: 70, toBlkMod: 70, cityWalls: 'none',
      nodeAura: 'none', wallOfFire: false, trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1, ...overrides,
    });
    const versions = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'];
    return versions.map(version => {
      const restored = resolveCombat(
        makeUnit(version, 'a', {
          figs: 3, atk: 1, rtb: 1, rtbType: 'thrown', dmg: 15,
          abilities: { lifeSteal: -20 },
        }),
        makeUnit(version, 'b', { figs: 20, hp: 100, def: 100 }),
        { version, isRanged: false, wallOfFire: false });
      const exchange = firstStrike => resolveCombat(
        makeUnit(version, 'a', {
          figs: 2, atk: 1, dmg: 10,
          abilities: { lifeSteal: -20, ...(firstStrike ? { firstStrike: true } : {}) },
        }),
        makeUnit(version, 'b', { atk: 30, hp: 100, abilities: { doom: true } }),
        { version, isRanged: false, wallOfFire: false });
      const firstMass = dist => dist.findIndex(p => p > 1e-12);
      const lastMass = dist => dist.reduce((last, p, i) => p > 1e-12 ? i : last, 0);
      return {
        version,
        restoredMinRaw: firstMass(restored.aLifeStealRawDist),
        simultaneousMaxToA: lastMass(exchange(false).totalDmgToA),
        sequentialMaxToA: lastMass(exchange(true).totalDmgToA),
      };
    });
  });

  for (const result of report) {
    // Two figures heal in the Thrown call; all three restored figures then make
    // Life Steal rolls in melee: five rolls with a minimum result of 21 each.
    expect(result.restoredMinRaw).toBe(105);
    expect(result.simultaneousMaxToA).toBe(10);
    // CoM suppresses First Strike against a front figure above 24 HP and falls
    // back to the same frozen simultaneous exchange; both MoM builds keep FS.
    expect(result.sequentialMaxToA).toBe(result.version === 'com_6.08' ? 10 : 15);
  }
  expectNoConsoleErrors(errors);
});

test('F27/F28 sequential modern calls retain heal state, actual figure counts, and gaze finalization', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const makeUnit = (version, prefix, overrides = {}) => deriveUnitStats({
      prefix, version, abilities: {}, level: 'normal', weapon: 'normal', armor: 'normal',
      rtbType: 'none', unitType: 'normal', figs: 1, atk: 0, rtb: 0,
      modernAttacks: {}, def: 0, res: 0, hp: 10, dmg: 0,
      irrecoverableDamage: 0, undeadDamage: 0, baseBonusHp: 0,
      ...(version.startsWith('com2') ? { hitChance: 70 } : { toHitMod: 70, toHitRtbMod: 70 }),
      toBlkMod: 70, cityWalls: 'none',
      nodeAura: 'none', wallOfFire: false, trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1, ...overrides,
    });
    const resolve = (version, a, b) => resolveCombat(a, b,
      { version, isRanged: false, wallOfFire: false });

    // The first ApplyAttack fills the final bonus-HP point. The later melee call must see
    // that revised state and cannot heal the same damage or grant that point again.
    const sequential = resolve('com2_1.05.11',
      makeUnit('com2_1.05.11', 'a', {
        atk: 1, dmg: 1, baseBonusHp: 89,
        modernAttacks: { thrown: { strength: 1, type: 'thrown' } },
        abilities: { lifeSteal: -3 },
      }),
      makeUnit('com2_1.05.11', 'b', { figs: 2, hp: 100 }));

    // The defender's deterministic Doom Gaze now resolves before the two attack channels and
    // removes one attacker figure. Fire Breath, Thrown, and melee therefore contribute one
    // raw roll each: three rolls, proving the exact state crosses the F29 phase boundaries.
    const casualty = resolve('com2_1.05.11',
      makeUnit('com2_1.05.11', 'a', {
        figs: 2, atk: 1,
        modernAttacks: {
          thrown: { strength: 1, type: 'thrown' },
          fireBreath: { strength: 1, type: 'fire' },
        },
        abilities: { lifeSteal: 0 },
      }),
      makeUnit('com2_1.05.11', 'b', {
        figs: 2, atk: 1, res: 9, hp: 100,
        abilities: { doomGaze: 15 },
      }));
    const threeRolls = calcLifeStealRawDist(3, 9, 0);

    // Bloodsucker finalizes the positive gaze ApplyAttack and its later melee call separately.
    const gazeBloodsucker = resolve('com2_warlord_1.5.12.7',
      makeUnit('com2_warlord_1.5.12.7', 'a', {
        atk: 1, dmg: 4, abilities: { bloodSucker: true, doomGaze: 1 },
      }),
      makeUnit('com2_warlord_1.5.12.7', 'b', { figs: 2, hp: 100 }));
    const multiGazeBloodsucker = resolve('com2_warlord_1.5.12.7',
      makeUnit('com2_warlord_1.5.12.7', 'a', {
        atk: 1, hp: 200, dmg: 100,
        abilities: { bloodSucker: true, stoningGaze: 0, doomGaze: 1 },
      }),
      makeUnit('com2_warlord_1.5.12.7', 'b', { figs: 2, hp: 100, res: 9 }));

    // The defender heals before melee. Its revised three-HP capacity must admit all
    // three later hits even though the original display cap was only one HP.
    const healedTarget = resolve('com2_warlord_1.5.12.7',
      makeUnit('com2_warlord_1.5.12.7', 'a', {
        atk: 3, hp: 100, hitChance: 100,
      }),
      makeUnit('com2_warlord_1.5.12.7', 'b', {
        dmg: 9, abilities: { bloodSucker: true, doomGaze: 1 },
      }));

    return {
      sequentialBenefit: sequential.aLifeStealExpected,
      sequentialRaw: sequential.aLifeStealRawDist,
      casualtyRaw: casualty.aLifeStealRawDist,
      threeRolls,
      gazeBloodsuckerBenefit: gazeBloodsucker.aLifeStealExpected,
      multiGazeBloodsuckerBenefit: multiGazeBloodsucker.aLifeStealExpected,
      healedTargetDamage: healedTarget.totalDmgToB,
      healedTargetDestroy: healedTarget.bDestroyPct,
    };
  });

  expect(report.sequentialBenefit).toBeCloseTo(2, 12);
  expect(report.sequentialRaw.reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 12);
  expect(report.casualtyRaw).toHaveLength(report.threeRolls.length);
  report.threeRolls.forEach((probability, i) => {
    expect(report.casualtyRaw[i]).toBeCloseTo(probability, 12);
  });
  expect(report.gazeBloodsuckerBenefit).toBeCloseTo(4, 12);
  // Stoning triggers with P(any fail)=.19; Doom and melee each run unless both figures
  // were stoned (P=.99). Each admitted positive ApplyAttack heals 2: 2*(.19+.99+.99).
  expect(report.multiGazeBloodsuckerBenefit).toBeCloseTo(4.34, 12);
  expect(report.healedTargetDamage[3]).toBeCloseTo(1, 12);
  expect(report.healedTargetDestroy).toBeCloseTo(1, 12);
  expectNoConsoleErrors(errors);
});

test('F27 Bloodsucker finalizes once after riders with independent Warlord damage and healing', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const base = { poisonStr: 0, poisonFail: 0, stoningFail: 0,
      deathTouchFail: 0, dispelEvilFail: 0, exorciseFail: 0,
      destructionFail: 0, targetHP: 10, lifeStealMod: null,
      lifeStealRes: 0, immDist: null, bloodsucker: true,
      sourceState: { figures: 4, hp: 10, totalDamage: 5,
        irrecoverableDamage: 0, undeadDamage: 2, bonusHp: 0 } };
    const riderOnly = convolveTouchAttacks([1], 10, 4, { ...base,
      poisonStr: 1, poisonFail: 1, version: 'com2_warlord_1.5.12.7' });
    const zero = convolveTouchAttacks([1], 10, 4,
      { ...base, version: 'com2_warlord_1.5.12.7' });
    const once = convolveTouchAttacks([0, 1], 10, 4,
      { ...base, version: 'com2_warlord_1.5.12.7' });
    const overkill = convolveTouchAttacks([0, 1], 1, 4,
      { ...base, version: 'com2_warlord_1.5.12.7' });
    const haste = repeatTouchAttack(once, [0, 1], 10, 4,
      { ...base, version: 'com2_warlord_1.5.12.7' });
    const baseCom2 = convolveTouchAttacks([0, 1], 10, 4,
      { ...base, version: 'com2_1.05.11' });
    return {
      riderOnly: riderOnly.dist,
      zero: zero.dist,
      once: once.dist,
      onceHeal: once.bloodsuckerHealEV,
      overkill: overkill.dist,
      overkillHeal: overkill.bloodsuckerHealEV,
      haste: haste.dist,
      baseCom2: baseCom2.dist,
    };
  });

  expect(report.riderOnly[6]).toBeCloseTo(1, 12); // four Poison + one configured +2
  expect(report.zero[0]).toBeCloseTo(1, 12);
  expect(report.once[3]).toBeCloseTo(1, 12); // once per ApplyAttack, not per figure
  expect(report.onceHeal).toBeCloseTo(2, 12);
  expect(report.overkill[1]).toBeCloseTo(1, 12);
  expect(report.overkillHeal).toBeCloseTo(2, 12); // target cap never clips healing input
  expect(report.haste[6]).toBeCloseTo(1, 12); // repeated call gets its own trigger
  expect(report.baseCom2[1]).toBeCloseTo(1, 12); // Bloodsucker inactive in base CoM2
  expectNoConsoleErrors(errors);
});

test('combat-state categories are output means rather than advanced starting inputs', async ({ page }) => {
  const errors = await openCalculator(page);
  await page.selectOption('#gameVersion', 'com2_1.05.11');
  const report = await page.evaluate(() => {
    const retiredIds = ['aIrrecoverableDamage', 'aUndeadDamage', 'aBaseBonusHp', 'aNoHealing',
      'bIrrecoverableDamage', 'bUndeadDamage', 'bBaseBonusHp', 'bNoHealing'];
    const legacy = collectState();
    Object.assign(legacy.ids, {
      aIrrecoverableDamage: '2', aUndeadDamage: '3', aBaseBonusHp: '7', aNoHealing: true,
    });
    applyState(legacy);

    const makeUnit = (prefix, overrides = {}) => deriveUnitStats({
      prefix, version: 'com2_1.05.11', abilities: {}, level: 'normal',
      weapon: 'normal', armor: 'normal', rtbType: 'none', unitType: 'normal',
      figs: 1, atk: 1, rtb: 0, modernAttacks: {}, def: 0, res: 0, hp: 10, dmg: 0,
      irrecoverableDamage: 0, undeadDamage: 0, baseBonusHp: 0, noHealing: false,
      hitChance: 70, toBlkMod: 0, cityWalls: 'none',
      nodeAura: 'none', wallOfFire: false, trueLight: false, darkness: false,
      rangedCheck: false, rangedDist: 1, ...overrides,
    });
    const lifeSteal = resolveCombat(
      makeUnit('a', { abilities: { lifeSteal: -20 } }),
      makeUnit('b', { atk: 0, hp: 100 }),
      { version: 'com2_1.05.11', isRanged: false, wallOfFire: false });
    const stoning = resolveCombat(
      makeUnit('a', { abilities: { stoningTouch: -10 } }),
      makeUnit('b', { atk: 0, hp: 10 }),
      { version: 'com2_1.05.11', isRanged: false, wallOfFire: false });
    renderCombatStateSummary(document.getElementById('distA'), 'a',
      lifeSteal.aPostCombatStateMean, 'com2_1.05.11');
    renderCombatStateSummary(document.getElementById('distB'), 'b',
      stoning.bPostCombatStateMean, 'com2_1.05.11');
    return {
      retiredControlsPresent: retiredIds.filter(id => document.getElementById(id)),
      candidates: matrixPropertyCandidates('a').map(item => item.key),
      restoredStats: readUnitStats('a'),
      persistedIds: collectState().ids,
      lifeStealSourceMean: lifeSteal.aPostCombatStateMean,
      lifeStealTargetMean: lifeSteal.bPostCombatStateMean,
      stoningMean: stoning.bPostCombatStateMean,
    };
  });
  expect(report.retiredControlsPresent).toEqual([]);
  expect(report.candidates).toContain('damageTaken');
  expect(report.candidates).not.toEqual(expect.arrayContaining([
    'irrecoverableDamage', 'undeadDamage', 'baseBonusHp', 'noHealing',
  ]));
  expect(report.restoredStats).toMatchObject({
    irrecoverableDamage: 0, undeadDamage: 0, baseBonusHp: 0, noHealing: false,
  });
  expect(report.persistedIds).not.toHaveProperty('aIrrecoverableDamage');
  expect(report.lifeStealTargetMean.undeadDamage).toBeGreaterThan(0);
  expect(report.lifeStealSourceMean.extraHits).toBeGreaterThan(0);
  expect(report.stoningMean.irreversibleDamage).toBeGreaterThan(0);
  await expect(page.locator('#aCombatStateSummary')).toContainText('Irrecoverable damage');
  await expect(page.locator('#aCombatStateSummary')).toContainText(
    report.lifeStealSourceMean.extraHits.toFixed(3));
  await expect(page.locator('#bCombatStateSummary')).toContainText(
    report.stoningMean.irreversibleDamage.toFixed(3));
  expectNoConsoleErrors(errors);
});
