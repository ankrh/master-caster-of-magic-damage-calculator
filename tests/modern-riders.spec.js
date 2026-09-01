const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

test('F25 excludes every modern gaze type from the shared touch-rider dispatcher', async ({ page }) => {
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
      // A CoM2/Warlord record states its attacks on all four channels and its To Hit on the
      // modern fields; the DOS record states the shared pair (`SPEC.md`, *Attack channels on
      // the card*).
      ...(version.startsWith('com2')
        ? { hitChance: 70, modernAttacks: {} } : { toHitMod: 70, toHitRtbMod: 70 }),
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
    const riderAbilities = {
      poison: 2,
      stoningTouch: -1,
      deathTouch: -1,
      lifeSteal: -1,
      exorcise: -1,
      destruction: 0,
    };
    // Stoning and Death Gaze carry a *signed resistance modifier*, negative being stronger
    // (`effectiveRes = defRes + modifier`); the CoM2 roster states `Stoning Gaze=-3`,
    // `Stoning Gaze=-4`, `Death Gaze=-3` and `Death Gaze=-4`. Doom Gaze is a positive damage
    // value instead (`Doom Gaze=4`). A positive Stoning/Death value raises the defender's
    // resistance and silences the gaze outright, which is what these cases used to do.
    const gazeCases = [
      ['Stoning Gaze', { stoningGaze: -3 }],
      ['Death Gaze', { deathGaze: -3 }],
      ['Doom Gaze', { doomGaze: 3 }],
    ];
    const modern = [];
    for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
      const target = makeUnit(version, 'b', {
        figs: 4,
        res: 5,
        hp: 10,
        unitType: 'fantastic_nature',
      });
      for (const [name, gaze] of gazeCases) {
        const plain = makeUnit(version, 'a', { abilities: gaze });
        const withRiders = makeUnit(version, 'a', {
          abilities: { ...gaze, ...riderAbilities },
        });
        const opts = { version, isRanged: false, wallOfFire: false, distance: 1 };
        const baseline = resolveCombat(plain, target, opts);
        const actual = resolveCombat(withRiders, target, opts);
        const gazeOf = result => result.phases.find(phase => phase.label.includes(name));
        const meleeOf = result => result.phases.find(phase => phase.label.startsWith('Melee'));
        const samePhase = (x, y) => JSON.stringify(x.defDist) === JSON.stringify(y.defDist)
          && x.defDestroyPct === y.defDestroyPct;
        const gazeRow = gazeOf(actual);
        modern.push({
          version,
          name,
          // The rule itself, read off the gaze call rather than off the combat total: attack
          // types 6..8 jump past all six rider blocks, so adding the riders cannot move what
          // the gaze call does.
          gazeUnchanged: samePhase(gazeOf(baseline), gazeOf(actual)),
          // Both halves of the control that the old total-damage comparison lacked. The gaze
          // must actually resolve something, or `gazeUnchanged` is an equality between two
          // empty distributions; and the same six riders must visibly move the melee call
          // against this same defender, or they are inert for reasons of their own.
          gazeLive: gazeOf(baseline).defDist[0] < 1 || gazeOf(baseline).defDestroyPct > 0,
          meleeMoved: !samePhase(meleeOf(baseline), meleeOf(actual)),
          label: gazeRow && gazeRow.label,
          healing: actual.aLifeStealExpected,
          sum: actual.totalDmgToB.reduce((total, probability) => total + probability, 0),
        });
      }
    }

    // Non-gaze control: the same general flags remain live on an admitted ranged call.
    const version = 'com2_1.05.11';
    const rangedTarget = makeUnit(version, 'b', {
      figs: 4,
      def: 1,
      res: 5,
      hp: 10,
      unitType: 'fantastic_nature',
    });
    const rangedPlain = makeUnit(version, 'a', {
      rtb: 1,
      rtbType: 'magic',
      modernAttacks: { ranged: { strength: 1, type: 'magic' } },
    });
    const rangedRiders = makeUnit(version, 'a', {
      rtb: 1,
      rtbType: 'magic',
      modernAttacks: { ranged: { strength: 1, type: 'magic' } },
      abilities: riderAbilities,
    });
    const rangedOpts = { version, isRanged: true, wallOfFire: false, distance: 1 };
    const baseRanged = resolveCombat(rangedPlain, rangedTarget, rangedOpts);
    const richRanged = resolveCombat(rangedRiders, rangedTarget, rangedOpts);

    // DOS control: the common Stoning Touch remains merged into a gaze call.
    const dosVersion = 'mom_cp_1.60.00';
    const dosAttacker = makeUnit(dosVersion, 'a', {
      rtb: 1,
      rtbType: 'gaze_death',
      abilities: { stoningTouch: -10 },
    });
    const dosTarget = makeUnit(dosVersion, 'b', {
      def: 1,
      res: 0,
      hp: 10,
      abilities: { deathImmunity: true },
    });
    const dos = resolveCombat(dosAttacker, dosTarget,
      { version: dosVersion, isRanged: false, wallOfFire: false, distance: 1 });
    const dosGaze = dos.phases.find(phase => phase.label.includes('Gaze'));

    // F25's frozen ApplyAttack evidence skips exactly the six riders `AttackFlagsT` declares
    // (`Caster binary/Combat.ApplyAttack.pas`). Dispel Evil is not one of them and is not a
    // seventh: the record has no such member, and `0x0800` is MoM's name for the flag CoM 1 and
    // Caster read as Exorcise (`PROVENANCE[dispelEvilTouchRider]`). So the same attacker rides
    // its gaze in MoM and carries nothing at all in CoM2 (F158) — the pair, not one half, is
    // what shows the modern exclusion is scoped to riders that engine actually has.
    const dispelPair = ['mom_cp_1.60.00', 'com2_1.05.11'].map(dispelVersion => {
      const attacker = makeUnit(dispelVersion, 'a', dispelVersion.startsWith('com2')
        ? { abilities: { doomGaze: 1, dispelEvil: true } }
        : { rtb: 1, rtbType: 'gaze_death', abilities: { dispelEvil: true } });
      const target = makeUnit(dispelVersion, 'b', {
        res: 0,
        hp: 10,
        unitType: 'fantastic_chaos',
      });
      const result = resolveCombat(attacker, target,
        { version: dispelVersion, isRanged: false, wallOfFire: false, distance: 1 });
      return {
        version: dispelVersion,
        gazeLabel: (result.phases.find(phase => phase.label.includes('Gaze')) || {}).label,
        anyDispelLabel: result.phases.some(phase => phase.label.includes('Dispel Evil')),
        // The published total clips at the target's remaining HP, so a gaze that kills a
        // 10-HP target lands all of its mass at 10: the kill claim is that top bin.
        killProbability: result.totalDmgToB.reduce(
          (sum, p, damage) => (damage >= 10 ? sum + p : sum), 0),
      };
    });

    const riderTooltips = ['stoningTouch', 'deathTouch', 'lifeSteal', 'poison', 'exorcise', 'destruction']
      .map(key => ABILITY_DEFS.find(def => def.key === key).tooltip);

    return {
      modern,
      rangedChanged: JSON.stringify(richRanged.totalDmgToB) !== JSON.stringify(baseRanged.totalDmgToB),
      rangedHealing: richRanged.aLifeStealExpected,
      dos: { label: dosGaze && dosGaze.label,
        killProbability: dos.totalDmgToB.reduce(
          (sum, p, damage) => (damage >= 10 ? sum + p : sum), 0) },
      dispelPair,
      tooltipsExcludeModernGaze: riderTooltips.every(tooltip =>
        tooltip.includes('never on Gaze')
          || tooltip.includes('Does not fire on Stoning, Death, or Doom Gaze')),
      tooltipsHaveNoStaleLimitation: riderTooltips.every(tooltip => !tooltip.includes('currently also')),
    };
  });

  // `ApplyAttack` leaves early only on `figs <= 0` ($005B19D9, and again at $005B297F) and its
  // six rider blocks test the attack type, the attacker's rider flags and the defender's
  // immunities alone -- no strength, base or calculated. `PerformMeleeAttack` then issues its
  // melee `ApplyAttack` unconditionally, unlike Thrown and Breath (`> 0`) and Ranged
  // (`ammo > 0`). So a 0-attack gaze attacker still makes a melee call and still runs the
  // riders there: the exclusion is the gaze call's alone, and is asserted as such below.
  expect(report.modern).toHaveLength(6);
  for (const row of report.modern) {
    expect(row.gazeUnchanged, `${row.version} ${row.name} gaze call`).toBe(true);
    expect(row.gazeLive, `${row.version} ${row.name} gaze resolves something`).toBe(true);
    expect(row.meleeMoved, `${row.version} ${row.name} riders live on the melee call`).toBe(true);
    expect(row.label).toBe(`Attacker ${row.name}`);
    expect(row.healing).toBeGreaterThan(0);
    expect(row.sum).toBeCloseTo(1, 12);
  }
  expect(report.rangedChanged).toBe(true);
  expect(report.rangedHealing).toBeGreaterThan(0);
  expect(report.dos.label).toContain('Stoning Touch');
  expect(report.dos.killProbability).toBeCloseTo(1, 12);
  const [momDispel, com2Dispel] = report.dispelPair;
  expect(momDispel.version).toBe('mom_cp_1.60.00');
  expect(momDispel.gazeLabel).toContain('Dispel Evil');
  expect(momDispel.killProbability).toBeCloseTo(1, 12);
  expect(com2Dispel.version).toBe('com2_1.05.11');
  expect(com2Dispel.gazeLabel).toBe('Attacker Doom Gaze');
  expect(com2Dispel.anyDispelLabel).toBe(false);
  expect(com2Dispel.killProbability).toBeCloseTo(0, 12);
  expect(report.tooltipsExcludeModernGaze).toBe(true);
  expect(report.tooltipsHaveNoStaleLimitation).toBe(true);
  expectNoConsoleErrors(errors);
});

test('F26 uses independent surviving-figure Destruction attempts with a flat 150 payload', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(async () => {
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
      // A CoM2/Warlord record states its attacks on all four channels and its To Hit on the
      // modern fields; the DOS record states the shared pair (`SPEC.md`, *Attack channels on
      // the card*).
      ...(version.startsWith('com2')
        ? { hitChance: 70, modernAttacks: {} } : { toHitMod: 70, toHitRtbMod: 70 }),
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
    const version = 'com2_1.05.11';
    const one = convolveTouchAttacks([1], 1, {
      poisonStr: 0,
      poisonFail: 0,
      stoningFail: 0,
      deathTouchFail: 0,
      dispelEvilFail: 0,
      exorciseFail: 0,
      destructionFail: 0.5,
      targetHP: 10,
      lifeStealMod: null,
      lifeStealRes: 0,
    }).dist;
    const four = convolveTouchAttacks([1], 4, {
      poisonStr: 0,
      poisonFail: 0,
      stoningFail: 0,
      deathTouchFail: 0,
      dispelEvilFail: 0,
      exorciseFail: 0,
      destructionFail: 0.5,
      targetHP: 10,
      lifeStealMod: null,
      lifeStealRes: 0,
    }).dist;

    // Defender Stoning Gaze independently kills each of A's two figures with p=0.5.
    // Each survivor then makes one Destruction attempt with p=0.5. Per original A figure,
    // no later failure has probability 0.5 + 0.5*0.5 = 0.75, so target destruction is
    // 1-0.75^2 = 0.4375. Haste supplies a second independent ApplyAttack attempt per
    // survivor: 1-(0.5 + 0.5*0.5^2)^2 = 0.609375.
    const target = makeUnit(version, 'b', {
      figs: 4,
      def: 1,
      res: 5,
      hp: 10,
      abilities: { stoningGaze: 0 },
    });
    const attacker = haste => makeUnit(version, 'a', {
      figs: 2,
      atk: 1,
      def: 0,
      res: 5,
      hp: 10,
      abilities: { destruction: 0, ...(haste ? { haste: true } : {}) },
    });
    const opts = { version, isRanged: false, wallOfFire: false, distance: 1 };
    const survivorDependent = resolveCombat(attacker(false), target, opts);
    const hasted = resolveCombat(attacker(true), target, opts);

    const immune = destructionFailProb(5, { magicImmunity: true }, 0, version);
    const gated = {
      mom: destructionFailProb(5, {}, 0, 'mom_1.31'),
      cp: destructionFailProb(5, {}, 0, 'mom_cp_1.60.00'),
      com: destructionFailProb(5, {}, 0, 'com_6.08'),
    };

    // Production matrix workers import the same resolver. Four ranged figures give
    // P(any Destruction failure)=0.9375, and the flat 150 each failure deals is published
    // clipped at the target's 40 HP, so the damage/HP ratio is 0.9375 x 40 / 40 = 0.9375.
    const rangedAttacker = makeUnit(version, 'a', {
      figs: 4,
      rtb: 1,
      rtbType: 'magic',
      modernAttacks: { ranged: { strength: 1, type: 'magic' } },
      abilities: { destruction: 0 },
    });
    const rangedTarget = makeUnit(version, 'b', { figs: 4, def: 1, res: 5, hp: 10 });
    const rangedOpts = { version, isRanged: true, wallOfFire: false, distance: 1 };
    const mainResult = resolveCombat(rangedAttacker, rangedTarget, rangedOpts);
    const mainRatio = distExpectedValue(mainResult.totalDmgToB) / mainResult.bRemHP;
    // Same builder the matrix modal uses, so the worker under test imports exactly what the
    // app's worker imports (index.html's data-worker tags).
    const url = URL.createObjectURL(new Blob([matrixWorkerSource()], { type: 'text/javascript' }));
    const workerRatio = await new Promise((resolve, reject) => {
      const worker = new Worker(url);
      worker.onmessage = event => { worker.terminate(); resolve(event.data.ratios[0]); };
      worker.onerror = reject;
      worker.postMessage({
        attackerStats: rangedAttacker,
        allDefenderStats: [rangedTarget],
        opts: rangedOpts,
        rowIndex: 0,
      });
    });
    URL.revokeObjectURL(url);

    return {
      one: { zero: one[0], payload: one[150], sum: one.reduce((a, b) => a + b, 0), length: one.length },
      four: { zero: four[0], payload: four[150], sum: four.reduce((a, b) => a + b, 0), length: four.length },
      // The published total clips at the target's remaining HP, so the flat 150 the rider
      // deals inside the phase arrives in the last bin rather than at index 150.
      survivorDependent: {
        zero: survivorDependent.totalDmgToB[0],
        payload: survivorDependent.totalDmgToB[survivorDependent.bRemHP],
        top: survivorDependent.totalDmgToB.length - 1,
        remHP: survivorDependent.bRemHP,
        sum: survivorDependent.totalDmgToB.reduce((a, b) => a + b, 0),
      },
      hasted: {
        zero: hasted.totalDmgToB[0],
        payload: hasted.totalDmgToB[hasted.bRemHP],
        top: hasted.totalDmgToB.length - 1,
        sum: hasted.totalDmgToB.reduce((a, b) => a + b, 0),
      },
      immune,
      gated,
      mainRatio,
      workerRatio,
    };
  });

  // `Result.field_00 := 150` is an assignment of a flat constant, not the target's remaining
  // HP and not an `Inc`, so a success deals 150 whatever the target has left
  // (`Reference docs/Caster binary/Combat.ApplyAttack.pas`, the `$005B2DC2` write). That is
  // what `convolveTouchAttacks` produces inside the phase; what the phase publishes is the
  // same mass clipped at the 4 x 10 = 40 HP the target had entering it.
  expect(report.one).toEqual({ zero: 0.5, payload: 0.5, sum: 1, length: 151 });
  expect(report.four.zero).toBeCloseTo(0.0625, 12);
  expect(report.four.payload).toBeCloseTo(0.9375, 12);
  expect(report.four.sum).toBeCloseTo(1, 12);
  expect(report.four.length).toBe(151);
  expect(report.survivorDependent.remHP).toBe(40);
  expect(report.survivorDependent.top).toBe(40);
  expect(report.survivorDependent.zero).toBeCloseTo(0.5625, 12);
  expect(report.survivorDependent.payload).toBeCloseTo(0.4375, 12);
  expect(report.survivorDependent.sum).toBeCloseTo(1, 12);
  expect(report.hasted.top).toBe(40);
  expect(report.hasted.zero).toBeCloseTo(0.390625, 12);
  expect(report.hasted.payload).toBeCloseTo(0.609375, 12);
  expect(report.hasted.sum).toBeCloseTo(1, 12);
  expect(report.immune).toBe(0);
  expect(report.gated).toEqual({ mom: 0, cp: 0, com: 0 });
  expect(report.mainRatio).toBeCloseTo(0.9375, 12);
  expect(report.workerRatio).toBeCloseTo(report.mainRatio, 12);
  expectNoConsoleErrors(errors);
});
