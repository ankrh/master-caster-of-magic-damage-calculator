// Combat phase builders in isolation: the distributions each phase returns and the
// invariants they must keep.

'use strict';

const {
  evalInContext, assert, assertEqual, assertClose, assertDistSumsToOne, assertSameKeyList,
  baseUnitInput,
} = require('./assertions');

function runPhaseChecks(ctx) {
  // F22: Caster.exe doubles only the selected melee/Thrown scratch strength. The
  // finished derived channels remain unchanged, and CoM 1 retains melee-only behavior.
  const bloodLustTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 0, def: 0, hp: 40, unitType: 'normal',
  }));
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 0, def: 0, hp: 10, unitType: 'normal',
      hitRanged: 70, hitThrown: 70, hitBreath: 70,
      abilities: { bloodLust: true, doomGaze: 4 },
      modernAttacks: {
        thrown: { strength: 3, type: 'thrown' },
        fireBreath: { strength: 3, type: 'fire' },
        lightningBreath: { strength: 3, type: 'lightning' },
      },
    }));
    const result = ctx.resolveCombat(attacker, bloodLustTarget,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
    assertEqual(result.totalDmgToB[16], 1,
      `${version}: Blood Lust doubles only Thrown while both Breaths and Doom Gaze stay undoubled`);
    assertEqual(attacker.modernAttacks.thrown.strength, 3,
      `${version}: Blood Lust does not write the doubled Thrown strength into derived stats`);
    assertEqual(attacker.modernAttacks.fireBreath.strength, 3,
      `${version}: the resolution scratch does not leak into a later channel`);
  }

  const fantasticTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 0, def: 0, hp: 20,
    identity: ctx.createCustomUnitIdentity('com2_1.05.11', {
      isHero: false, baseRace: 'Nature', baseFantastic: true,
    }),
  }));
  const fantasticAttacker = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, def: 0, hp: 10, hitChance: 70,
    abilities: { bloodLust: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  }));
  const fantasticResult = ctx.resolveCombat(fantasticAttacker, fantasticTarget,
    { version: 'com2_1.05.11', isRanged: false, wallOfFire: false, distance: 1 });
  assertEqual(fantasticResult.totalDmgToB[4], 1,
    'Modern Blood Lust does not double melee or Thrown against a Fantastic defender');

  const com1Attacker = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', atk: 1, rtb: 3, rtbType: 'thrown', def: 0, hp: 10,
    toHitMod: 70, toHitRtbMod: 70, abilities: { bloodLust: true },
  }));
  const com1Target = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', atk: 0, def: 0, hp: 20, unitType: 'normal',
  }));
  const com1Result = ctx.resolveCombat(com1Attacker, com1Target,
    { version: 'com_6.08', isRanged: false, wallOfFire: false, distance: 1 });
  assertEqual(com1Result.totalDmgToB[5], 1,
    'CoM 1 Blood Lust doubles melee but leaves Thrown undoubled');

  for (const type of ['missile', 'magic']) {
    const rangedAttacker = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_1.05.11', atk: 0, def: 0, hp: 10,
      hitRanged: 70, hitThrown: 70, hitBreath: 70,
      abilities: { bloodLust: true },
      modernAttacks: { ranged: { strength: 3, type } },
    }));
    const rangedResult = ctx.resolveCombat(rangedAttacker, bloodLustTarget,
      { version: 'com2_1.05.11', isRanged: true, wallOfFire: false, distance: 1 });
    assertEqual(rangedResult.totalDmgToB[3], 1,
      `Modern Blood Lust does not double ${type === 'missile' ? 'physical' : 'magical'} conventional ranged`);
  }

  // R3.3: Caster.exe's independent attack fields must survive the card's single shared
  // RTB projection. Three deterministic coexisting channels produce three separate attacks.
  const modernChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, rtb: 0, rtbType: 'none', def: 0, hp: 10,
    hitRanged: 70, hitThrown: 70, hitBreath: 70,
    modernAttacks: {
      thrown: { strength: 1, type: 'thrown' },
      fireBreath: { strength: 1, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));
  const channelTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, rtb: 0, rtbType: 'none', def: 0, hp: 10,
  }));
  const channelCombat = ctx.resolveCombat(modernChannels, channelTarget,
    { version: 'com2_1.05.11', isRanged: false, wallOfFire: false });
  assertClose(channelCombat.totalDmgToB[3], 0.7,
    'Modern Thrown, Fire Breath, and Lightning Breath coexist instead of using the RTB projection');
  assertEqual(channelCombat.phases.filter(p => /Breath|Thrown/.test(p.label)).length, 3,
    'Modern coexistence produces one phase per independent channel');

  // R3.4: cover the complete modern roster boundary, not just a hand-authored fixture.
  // Every source channel must make it through derivation; every non-ranged channel must
  // surface as a melee phase, and a conventional ranged channel must remain selectable.
  const typeMap = { Missile: 'missile', Boulder: 'boulder', Magic: 'magic', 'Magic-lightning': 'magic_lightning' };
  const warlordRoster = Object.values(evalInContext(ctx, 'WARLORD_UNITS_DATA'));
  const multiChannelRoster = warlordRoster.filter(unit =>
    ['ranged', 'thrown', 'fire_breath', 'lightning_breath'].filter(key => Number(unit[key]) > 0).length > 1);
  // 1.5.12.9 added Aerial Support Drones [364], the 30th: Thrown 7 alongside Ranged 9.
  assertEqual(multiChannelRoster.length, 30, 'Warlord roster contains the expected multi-channel units');
  for (const unit of multiChannelRoster) {
    const records = {
      ranged: unit.ranged ? { strength: unit.ranged, type: typeMap[unit.ranged_type] } : null,
      thrown: unit.thrown ? { strength: unit.thrown, type: 'thrown' } : null,
      fireBreath: unit.fire_breath ? { strength: unit.fire_breath, type: 'fire' } : null,
      lightningBreath: unit.lightning_breath ? { strength: unit.lightning_breath, type: 'lightning' } : null,
    };
    const projection = records.ranged || records.thrown || records.fireBreath || records.lightningBreath;
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.9', figs: unit.figures, atk: unit.melee,
      rtb: projection.strength, rtbType: projection.type, def: unit.defense,
      res: unit.resist, hp: unit.hp, modernAttacks: records,
      hitRanged: 70, hitThrown: 70, hitBreath: 70,
    }));
    const expectedKeys = Object.keys(records).filter(key => records[key]);
    assertEqual(Object.keys(attacker.modernAttacks).length, expectedKeys.length,
      `${unit.name} retains every source attack channel during derivation`);
    const melee = ctx.resolveCombat(attacker, channelTarget,
      { version: 'com2_warlord_1.5.12.9', isRanged: false, wallOfFire: false });
    const expectedMeleeChannels = expectedKeys.filter(key => key !== 'ranged').length;
    assertEqual((melee.phases || []).filter(p => /Breath|Thrown/.test(p.label)).length, expectedMeleeChannels,
      `${unit.name} resolves every non-ranged channel`);
    if (records.ranged) {
      const ranged = ctx.resolveCombat(attacker, channelTarget,
        { version: 'com2_warlord_1.5.12.9', isRanged: true, wallOfFire: false });
      assert(ranged.totalDmgToB.some((p, damage) => damage > 0 && p > 1e-15),
        `${unit.name} resolves its independent conventional ranged channel`);
    }
  }

  // B7: DOS uses the ranged attack-attribute record for every non-melee call. These
  // normalized record-only fixtures isolate placement from the common roster flags.
  const routedDosTouch = ({ version = 'mom_cp_1.60.00', atk = 1, rtb = 0,
                            rtbType = 'none', isRanged = false, record = 'ranged' }) => {
    const dosTouchTarget = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', figs: 1, atk: 0, def: 1, res: 0,
      hp: 10, toBlkMod: 70, abilities: { deathImmunity: true },
    }));
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk, rtb, rtbType, def: 0, hp: 10,
      toHitMod: 70, toHitRtbMod: 70,
    }));
    attacker.touchFlagRecords = {
      global: {}, melee: {}, ranged: {},
    };
    attacker.touchFlagRecords[record].stoningTouch = -10;
    return ctx.resolveCombat(attacker, dosTouchTarget, {
      version, isRanged, wallOfFire: false, distance: 1,
    });
  };
  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    assertEqual(routedDosTouch({ version, record: 'melee' }).totalDmgToB[10], 1,
      `B7 ${version} melee call merges the melee touch record`);
    assertEqual(routedDosTouch({ version, record: 'ranged' }).totalDmgToB[0], 1,
      `B7 ${version} melee call excludes a ranged-only touch record`);
    for (const scenario of [
      { label: 'ordinary ranged', rtb: 1, rtbType: 'missile', isRanged: true },
      { label: 'Thrown', rtb: 1, rtbType: 'thrown' },
      { label: 'Fire Breath', rtb: 1, rtbType: 'fire' },
      { label: 'Lightning Breath', rtb: 1, rtbType: 'lightning' },
      { label: 'Stoning Gaze', rtb: 1, rtbType: 'gaze_stoning' },
      { label: 'Multiple Gaze', rtb: 1, rtbType: 'gaze_multiple' },
      { label: 'Death Gaze', rtb: 1, rtbType: 'gaze_death' },
    ]) {
      const result = routedDosTouch({ version, ...scenario, record: 'ranged' });
      // The claim is that the Stoning Touch fired, i.e. that the target's one 10-HP figure
      // was killed. Nothing truncates a phase's damage, so a channel that also lands its own
      // damage — armour-piercing Lightning Breath does — carries the total past 10.
      const killed = result.totalDmgToB
        .reduce((sum, p, damage) => (damage >= 10 ? sum + p : sum), 0);
      assertClose(killed, 1,
        `B7 ${version} ${scenario.label} call merges the shared ranged touch record`);
    }
  }

  const dosChannelModifier = key => {
    const version = 'mom_cp_1.60.00';
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 1, def: 0, hp: 10, toHitMod: 70,
    }));
    attacker.touchFlagRecords = { global: {}, melee: {}, ranged: {} };
    attacker.touchFlagRecords.melee[key] = 0;
    const target = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', atk: 0, def: 1, res: 9, hp: 10, toBlkMod: 70,
    }));
    return ctx.resolveCombat(attacker, target,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
  };
  assertClose(dosChannelModifier('stoningTouch').totalDmgToB[10], 0.2,
    'B7 DOS channel-carried Stoning Touch receives an additional -1 save modifier');
  assertClose(dosChannelModifier('deathTouch').totalDmgToB[10], 0.4,
    'B7 DOS channel-carried Death Touch receives an additional -3 save modifier');

  const zeroStrengthThrownTouch = version => {
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 1, rtb: 1, rtbType: 'thrown', def: 0, hp: 10,
      toHitMod: 70, toHitRtbMod: 70,
    }));
    attacker.rtb = 0;
    attacker.touchFlagRecords = { global: {}, melee: {}, ranged: { stoningTouch: -10 } };
    const target = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', atk: 0, def: 1, res: 0, hp: 10, toBlkMod: 70,
    }));
    return ctx.resolveCombat(attacker, target,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
  };
  assertEqual(zeroStrengthThrownTouch('mom_1.31').totalDmgToB[0], 1,
    'B7 MoM 1.31 does not admit a zero-live-strength Thrown call');
  for (const version of ['mom_cp_1.60.00', 'com_6.08']) {
    assertEqual(zeroStrengthThrownTouch(version).totalDmgToB[10], 1,
      `B7 ${version} patched zero-strength Thrown call still dispatches its ranged record`);
  }

  // The zero-strength abort is a distinct 1.31-only dispatcher gate. A gaze can admit
  // combat for a zero-melee attacker; CP then dispatches the common touch on both calls,
  // while 1.31 discards the zero-strength melee call's rider.
  const zeroMeleeGazeTouch = version => {
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 0, rtb: 1, rtbType: 'gaze_death', def: 0, hp: 10,
      toHitRtbMod: 70, abilities: { stoningTouch: -10 },
    }));
    const target = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', figs: 2, atk: 0, def: 1, res: 0, hp: 10,
      toBlkMod: 70, abilities: { deathImmunity: true },
    }));
    return ctx.resolveCombat(attacker, target,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
  };
  assertEqual(zeroMeleeGazeTouch('mom_1.31').totalDmgToB[10], 1,
    'B7 MoM 1.31 zero-strength melee abort leaves only the gaze-carried common touch');
  assertEqual(zeroMeleeGazeTouch('mom_cp_1.60.00').totalDmgToB[20], 1,
    'B7 CP 1.60 patched abort lets the common touch fire on gaze and zero-strength melee');

  assertEqual(ctx.buildWallOfFirePhase(false, {}), null, 'Inactive Wall of Fire phase is null');
  const wallOfFire = ctx.buildWallOfFirePhase(true, {
    wofStr: 1,
    wofToHit: 1,
    aDefForImm: 0,
    aToBlock: 0,
    aHP: 1,
    aInvulnBonus: null,
  });
  const wofResult = wallOfFire.compute(0, 2, 2);
  assertDistSumsToOne(wofResult.dist, 'Wall of Fire distribution');
  assertEqual(wofResult.dist[2], 1, 'Wall of Fire deterministic smoke damage');
  assertEqual(wofResult.lifeStealEV, 0, 'Wall of Fire has no life steal');

  assertEqual(ctx.buildThrownPhase(false, {}), null, 'Inactive thrown phase is null');
  const thrown = ctx.buildThrownPhase(true, {
    a: { rtb: 2, hp: 1, toHitImmolation: 0.3 },
    b: { hp: 3 },
    aDoomsB: true,
    aBlackSleep: false,
    aToHitRtbVert: 0.3,
    bDefForThrown: 0,
    bToBlockVsAThrEW: 0,
    bInvulnBonus: null,
    bBlurChance: 0,
    blurBuggy: false,
    isCoM2: false,
    aMinDamageFromHits: null,
    aImmWithThrown: false,
    immStr: 0,
    bDefForImm: 0,
    bToBlockVsAAll: 0,
    aPoisonStrT: 0,
    aPoisonFailT: 0,
    aStoningFailT: 0,
    aLifeStealModT: null,
    lifeStealRes: 0,
    aHaste: false,
  });
  const thrownResult = thrown.compute(2, 2, 5);
  assertDistSumsToOne(thrownResult.dist, 'Thrown doom distribution');
  assertEqual(thrownResult.dist[4], 1, 'Thrown doom smoke damage');
  assertEqual(thrownResult.lifeStealEV, 0, 'Thrown doom without touch attacks has no life steal');

  const hastedThrown = ctx.buildThrownPhase(true, {
    a: { rtb: 1, hp: 1, toHitImmolation: 0.3 },
    b: { hp: 3 },
    aDoomsB: true,
    aBlackSleep: false,
    aToHitRtbVert: 0.3,
    bDefForThrown: 0,
    bToBlockVsAThrEW: 0,
    bInvulnBonus: null,
    bBlurChance: 0,
    blurBuggy: false,
    isCoM2: false,
    aMinDamageFromHits: null,
    aImmWithThrown: false,
    immStr: 0,
    bDefForImm: 0,
    bToBlockVsAAll: 0,
    aPoisonStrT: 0,
    aPoisonFailT: 0,
    aStoningFailT: 0,
    aLifeStealModT: null,
    lifeStealRes: 0,
    aHaste: true,
  });
  const hastedThrownResult = hastedThrown.compute(2, 2, 5);
  assertDistSumsToOne(hastedThrownResult.dist, 'Hasted thrown doom distribution');
  assertEqual(hastedThrownResult.dist[4], 1, 'Hasted thrown self-convolves damage');

  // F223 renamed the builder's Life Steal resistance parameter, which travels with the rider
  // that queried it. Both cases above pass `aLifeStealModT: null`, so neither reads it; this one
  // activates the rider so a wrong or missing name shows up as a wrong drain rather than passing.
  const drainingThrown = ctx.buildThrownPhase(true, {
    a: { rtb: 1, hp: 1, figs: 2, dmg: 0, toHitImmolation: 0.3, combatVersion: 'mom_1.31' },
    b: { hp: 3 },
    aDoomsB: true,
    aBlackSleep: false,
    aToHitRtbVert: 0.3,
    bDefForThrown: 0,
    bToBlockVsAThrEW: 0,
    bInvulnBonus: null,
    bBlurChance: 0,
    blurBuggy: false,
    isCoM2: false,
    aMinDamageFromHits: null,
    aImmWithThrown: false,
    immStr: 0,
    bDefForImm: 0,
    bToBlockVsAAll: 0,
    aPoisonStrT: 0,
    aPoisonFailT: 0,
    aStoningFailT: 0,
    aLifeStealModT: 0,
    lifeStealRes: 0,
    aHaste: false,
    version: 'mom_1.31',
  });
  const drainingResult = drainingThrown.compute(2, 2, 5);
  assertDistSumsToOne(drainingResult.dist, 'Thrown Life Steal distribution');
  assert(drainingResult.lifeStealEV > 0,
    "An active Life Steal rider reads the builder's lifeStealRes and drains");
}

// F222.2 / F222.3: the per-rider histograms each combat phase emits, in all five engines. One key
// per rider that writes into an `ApplyAttack` damage bucket, uncapped HP, presence separate from
// value. The modern block runs first, the DOS block second; the machinery under them is shared.
function runRiderHistogramChecks(ctx) {
  const mean = dist => dist.reduce((total, p, damage) => total + p * damage, 0);
  const sum = dist => dist.reduce((total, p) => total + p, 0);
  const resolve = (version, aOverrides, bOverrides, opts = {}) => ctx.resolveCombat(
    ctx.deriveUnitStats(baseUnitInput({ version, ...aOverrides })),
    ctx.deriveUnitStats(baseUnitInput({ version, prefix: 'b', ...bOverrides })),
    { version, isRanged: false, wallOfFire: false, distance: 1, ...opts });

  // Haste is only here to force a breakdown row: a bare melee exchange with no other phase
  // leaves `phases` null, and the rider histograms hang off the rows.
  const modernAttacker = {
    atk: 4, hitChance: 70, hp: 10, figs: 2,
    abilities: { stoningTouch: -3, poison: 2, haste: true },
  };
  const modernTarget = { figs: 3, def: 0, toBlkMod: 0, res: 5, hp: 6 };

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const result = resolve(version, modernAttacker, modernTarget);
    let sawRiders = false;
    for (const phase of result.phases || []) {
      const riders = phase.riders || [];
      if (!riders.length) continue;
      sawRiders = true;
      for (const rider of riders) {
        assertClose(sum(rider.dist), 1,
          `F222 ${version} ${phase.label} rider ${rider.key} is a valid PMF`, 1e-9);
      }
      // The three damage buckets partition every HP the attack produced, and the riders carry
      // those uncapped figures. What the phase *publishes* is capped at the HP the target had
      // entering it, so the two agree only while nothing overkills: the rider sum is an upper
      // bound on the published total, and the published total never runs past the target's
      // remaining HP. Both halves are asserted, because either one alone passes a cap applied
      // in the wrong place.
      for (const [side, dist, remHP] of [['def', phase.defDist, phase.defHP],
        ['atk', phase.atkDist, phase.atkHP]]) {
        const placed = riders
          .filter(rider => rider.side === side && rider.quantity === 'targetHp');
        if (!placed.length) continue;
        const riderTotal = placed.reduce((total, rider) => total + mean(rider.dist), 0);
        assert(riderTotal >= mean(dist) - 1e-9,
          `F222 ${version} ${phase.label} ${side} riders bound the phase total`);
        assert(dist.length - 1 <= remHP,
          `F222 ${version} ${phase.label} ${side} phase total stops at remaining HP`);
      }
    }
    assert(sawRiders, `F222 ${version} emits at least one rider histogram`);

    // R5: presence is the placement gate, not the value. A rider the attacker does not carry
    // emits no key; a placed one whose roll can never succeed emits with all its mass at 0.
    const plain = resolve(version,
      { atk: 4, hitChance: 70, hp: 10, abilities: { haste: true } },
      { figs: 3, def: 0, toBlkMod: 0, res: 5, hp: 6 });
    for (const phase of plain.phases || []) {
      for (const rider of phase.riders || []) {
        assertEqual(rider.key, 'melee',
          `F222 ${version} an unplaced rider emits no key in ${phase.label}`);
      }
    }
    const resistant = resolve(version,
      { atk: 4, hitChance: 70, hp: 10, abilities: { stoningTouch: 0, haste: true } },
      { figs: 3, def: 0, toBlkMod: 0, res: 10, hp: 6 });
    const stoningRows = (resistant.phases || []).flatMap(
      phase => (phase.riders || []).filter(rider => rider.key === 'stoningTouch'));
    assert(stoningRows.length > 0,
      `F222 ${version} a placed rider that cannot land still emits a histogram`);
    for (const rider of stoningRows) {
      assertClose(rider.dist[0], 1,
        `F222 ${version} a rider that cannot land draws all its mass at 0`, 1e-9);
    }

    // The other half of that pair: an immunity that skips the block outright is a false gate,
    // so it emits nothing at all rather than an empty panel. `ApplyAttack` tests
    // `not magicimmunity` before every one of these rolls.
    const immune = resolve(version,
      { atk: 4,
        hitChance: 70,
        hp: 10,
        abilities: {
          stoningTouch: 0, deathTouch: 0, exorcise: 0, destruction: 0, lifeSteal: 0,
          poison: 2, haste: true,
        } },
      { figs: 3, def: 0, toBlkMod: 0, res: 5, hp: 6, unitType: 'fantastic_death',
        abilities: { magicImmunity: true, poisonImmunity: true } });
    for (const phase of immune.phases || []) {
      for (const rider of phase.riders || []) {
        assertEqual(rider.key, 'melee',
          `F222 ${version} an immunity that skips the block emits no key in ${phase.label}`);
      }
    }
  }

  // F222.3: the same emission from the three DOS resolvers. The rider set differs — no
  // Destruction, and Dispel Evil is MoM's name for the slot CoM 1 reads as Exorcise — and the
  // DOS phases reach `convolveTouchAttacks` through their own builders (the shared ranged flag
  // record, the DOS gaze branch, the CoM 1 First-Strike fallthrough), so each is exercised here
  // rather than inferred from the modern runs above.
  //
  // INV-1 in full: a sum of 1 alone admits a negative bin against an oversized one, and `NaN`
  // slips through any `Math.abs(x - y) > eps` test, so each bin is checked for being a real
  // probability before the sum is.
  const assertRiderPmf = (rider, label) => {
    const bad = rider.dist.findIndex(
      p => !Number.isFinite(p) || p < -1e-12 || p > 1 + 1e-12);
    assert(bad === -1,
      `${label} rider ${rider.key} has a bin outside [0,1] at ${bad}: ${rider.dist[bad]}`);
    assertClose(sum(rider.dist), 1, `${label} rider ${rider.key} is a valid PMF`, 1e-9);
  };
  // The three damage buckets partition every HP the attack produced and the riders carry those
  // uncapped figures, so their sum bounds what the phase publishes; the published total is
  // capped at the HP the target had entering the phase, so the two coincide only when nothing
  // overkills.
  //
  // The bound alone is weak — it survives a rider marginal read at the wrong probability
  // weight, because the other riders' means still clear the published total. So a rider set
  // that cannot overkill asserts the equality instead, which is the case that actually pins
  // the weighting; `assertRidersPartitionTotal` below is that case, and every caller that may
  // overkill gets the bound plus the support test.
  const assertRidersBoundTotal = (rows, total, remHP, label) => {
    if (!rows.length) return;
    const riderSum = rows.reduce((acc, rider) => acc + mean(rider.dist), 0);
    assert(riderSum >= mean(total) - 1e-9, `${label} riders bound the phase total`);
    assert(total.length - 1 <= remHP,
      `${label} the phase total stops at the target's remaining HP `
      + `(${total.length - 1} > ${remHP})`);
    assert(rows.reduce((acc, rider) => acc + (rider.dist.length - 1), 0) >= total.length - 1,
      `${label} the riders' maxima bound the phase total's maximum`);
  };
  // No path in this phase can have overkilled, so the clip was the identity and the riders
  // still partition the total exactly. This is the assertion that fails when a rider marginal
  // is accumulated at the wrong weight.
  const assertRidersPartitionTotal = (rows, total, remHP, label) => {
    assert(rows.length > 0, `${label} placed a rider to partition`);
    assert(total.length - 1 < remHP,
      `${label} is a non-overkill fixture (max ${total.length - 1} < remHP ${remHP})`);
    assertClose(rows.reduce((acc, rider) => acc + mean(rider.dist), 0), mean(total),
      `${label} riders sum to the phase total exactly`, 1e-9);
  };
  // The post-combat composition is only as good as the gate that decides whether the joint
  // carries per-path damage state at all (`trackModernHealing`, `combat.js`). When it does not,
  // the composition is reported as wholly regular damage, on the claim that no rider able to
  // write a non-normal bucket can be placed without turning that gate on. If the gate ever
  // misses one, the reading silently becomes "100% Regular" for a wound that is partly
  // permanent — a wrong answer that looks like a measurement. So every rider that writes a
  // non-normal bucket is placed here and its category asserted present.
  const compositionOf = (result, side) => {
    const mean = result[side + 'PostCombatStateMean'];
    return { irrec: mean.irreversibleDamage, undead: mean.undeadDamage,
      regular: mean.regularDamage };
  };
  // A DOS gaze is a ranged type, not a bare ability, so its fixture states the channel the
  // build reads; a modern gaze is its own record field and needs nothing else.
  const dosGazeChannel = { rtb: 1, rtbType: 'gaze_stoning', toHitRtbMod: 7 };
  const nonNormalRiders = [
    ['stoningTouch', { stoningTouch: -3 }, {}, 'irrec',
      ['mom_1.31', 'com_6.08', 'com2_1.05.11']],
    ['lifeSteal', { lifeSteal: -3 }, {}, 'undead',
      ['mom_1.31', 'com_6.08', 'com2_1.05.11']],
    ['destruction', { destruction: 0 }, {}, 'irrec', ['com2_1.05.11']],
    // Both families, since F225.2. `combat.c:4419` writes the DOS stoning gaze's kill into
    // `local_damage[2]`, the irreversible bucket (index 0 is regular and index 1 is undead —
    // `combat.c:4934/4936`, the Create Undead branch), exactly as `Combat.ApplyAttack.pas:405`
    // does. The DOS arm of `buildAttackerGazePhase` used to pass no `baseDamageCategory` and
    // book the whole gaze as regular damage, which is healable where the engine's is not
    // (`healable = damage[DMG_UNDEATH] + damage[DMG_REGULAR]`, `0x7FCC5`). It now routes that
    // one loop through the rider channel with its own bucket, which is what these three
    // versions assert.
    ['stoningGaze', { stoningGaze: 0 }, dosGazeChannel, 'irrec',
      ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11']],
  ];
  for (const [name, abilities, dosChannel, bucket, versions] of nonNormalRiders) {
    for (const version of versions) {
      const composition = compositionOf(resolve(version,
        { figs: 2, atk: 2, hp: 10, ...(version.startsWith('com2')
          ? { hitChance: 100 } : { toHitMod: 7, ...dosChannel }), abilities },
        { figs: 4, def: 0, toBlkMod: 0, res: 5, hp: 10 }), 'b');
      assert(composition[bucket] > 0,
        `F222 ${version} ${name} reaches the post-combat composition as ${bucket} damage `
        + `(got irrec ${composition.irrec}, undead ${composition.undead}, `
        + `regular ${composition.regular})`);
    }
  }
  // A DOS gaze carries the touch group, so a Stoning Touch can reach the irrecoverable bucket
  // with no melee or thrown placement at all. That is the shape that used to slip past the
  // joint's tracking gate and report the wound as wholly regular.
  for (const version of ['mom_1.31', 'com_6.08']) {
    const composition = compositionOf(resolve(version,
      { figs: 1, atk: 0, hp: 10, toHitMod: 7, rtb: 1, rtbType: 'gaze_death', toHitRtbMod: 7,
        abilities: { deathGaze: 0, stoningTouch: -10 } },
      { figs: 2, def: 0, toBlkMod: 0, res: 0, hp: 10,
        abilities: { deathImmunity: true } }), 'b');
    assert(composition.irrec > 0,
      `F222 ${version} a gaze-carried Stoning Touch reaches the composition as irrecoverable `
      + `damage (got irrec ${composition.irrec}, regular ${composition.regular})`);
  }

  // And the converse: a rider that writes the normal bucket must not colour the composition.
  for (const version of ['mom_1.31', 'com2_1.05.11']) {
    const composition = compositionOf(resolve(version,
      { figs: 2, atk: 2, hp: 10, ...(version.startsWith('com2')
        ? { hitChance: 100 } : { toHitMod: 7 }), abilities: { deathTouch: -3 } },
      { figs: 4, def: 0, toBlkMod: 0, res: 5, hp: 10 }), 'b');
    assertEqual(composition.irrec, 0,
      `F222 ${version} Death Touch writes no irrecoverable damage`);
    assertEqual(composition.undead, 0, `F222 ${version} Death Touch writes no undead damage`);
    assert(composition.regular > 0, `F222 ${version} Death Touch is regular damage`);
  }

  // INV-1 on what a phase publishes, not just on what a rider does. Every distribution the
  // breakdown draws is a PMF, including a row for a strike a build suppresses: CoM 1 omits the
  // Haste repeat against a top figure above 24 HP, and that row used to publish `[0]` — mass
  // dropped rather than folded in — so it summed to 0 while every rider on it summed to 1.
  const phaseDistSums = (result, label) => {
    for (const phase of result.phases || []) {
      for (const [side, dist] of [['atk', phase.atkDist], ['def', phase.defDist]]) {
        assertClose(sum(dist), 1,
          `${label} ${phase.label} ${side} distribution is a PMF`, 1e-9);
      }
    }
  };
  for (const [version, target] of [
    // The CoM 1 suppression arm, and the same package where First Strike is not suppressed.
    ['com_6.08', { figs: 1, def: 0, toBlkMod: 0, res: 5, hp: 30 }],
    ['com_6.08', { figs: 2, def: 0, toBlkMod: 0, res: 5, hp: 6 }],
    ['mom_1.31', { figs: 1, def: 0, toBlkMod: 0, res: 5, hp: 30 }],
  ]) {
    phaseDistSums(
      resolve(version,
        { figs: 2, atk: 3, toHitMod: 3, hp: 10, abilities: { firstStrike: true, haste: true } },
        target),
      `F222 ${version} hp${target.hp} FS+Haste`);
  }

  // A rider set that cannot reach the target's HP in any path, in both engine families: the
  // clip is the identity here, so the riders partition the published total exactly. Every
  // other rider fixture can overkill and so can only assert the bound.
  for (const version of ['com2_1.05.11', 'mom_1.31']) {
    // Each family states To Hit on its own fields (`SPEC.md`, *Attack channels on the card*).
    const toHit = version.startsWith('com2') ? { hitChance: 100 } : { toHitMod: 7 };
    const small = resolve(version,
      { figs: 1, atk: 2, hp: 10, ...toHit, abilities: { poison: 2, haste: true } },
      { figs: 4, def: 0, toBlkMod: 0, res: 4, hp: 20 });
    let partitioned = 0;
    for (const phase of small.phases || []) {
      const rows = (phase.riders || [])
        .filter(rider => rider.side === 'def' && rider.quantity === 'targetHp');
      if (!rows.length) continue;
      assertRidersPartitionTotal(rows, phase.defDist, phase.defHP,
        `F222 ${version} ${phase.label} def`);
      partitioned++;
    }
    assert(partitioned > 0,
      `F222 ${version} the non-overkill fixture drew a rider row to partition`);
  }

  // Every DOS rider the attacker carries, against a Chaos-realm Fantastic target so that
  // Dispel Evil / Exorcise is eligible and neither Death Touch nor Life Steal is turned off by
  // a Death immunity. Life Steal is not on this card: a DOS drain is wide and
  // `repeatTouchAttack` squares the outcome list per joint cell, so it gets its own
  // single-figure fixture below rather than riding this one.
  const dosRiders = {
    stoningTouch: -3, deathTouch: -3, poison: 2,
    dispelEvil: true, exorcise: -1, destruction: 0,
  };
  const dosTarget = {
    figs: 2, def: 0, toBlkMod: 0, res: 5, hp: 6, unitType: 'fantastic_chaos',
  };
  // Which name each build gives the one Life-realm rider slot, and which riders it has at all.
  // `TOUCH_KEY_SCOPE_IDS` -> `COMBAT_VERSION_SCOPES` owns that fact; this asserts the resolver
  // reads it, so INV-2 holds at the histogram: a rider a version does not carry emits no key.
  const dosLifeRiderKey = {
    'mom_1.31': 'dispelEvil',
    'mom_cp_1.60.00': 'dispelEvil',
    'com_6.08': 'exorcise',
  };

  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const lifeRider = dosLifeRiderKey[version];
    const otherLifeRider = lifeRider === 'dispelEvil' ? 'exorcise' : 'dispelEvil';
    // A Thrown attack gives the run a second row without Haste, and it is the DOS shared
    // ranged flag record — `touchRecordForPhase` sends every non-melee DOS call to it.
    const dos = resolve(version,
      { atk: 4, toHitMod: 3, hp: 10, figs: 2,
        rtb: 3, rtbType: 'thrown', toHitRtbMod: 3, abilities: dosRiders },
      dosTarget);
    const dosRows = (dos.phases || []).filter(phase => (phase.riders || []).length);
    assert(dosRows.length >= 2,
      `F222 ${version} emits rider histograms on both the Thrown and the melee row`);
    for (const phase of dosRows) {
      for (const rider of phase.riders) {
        assertRiderPmf(rider, `F222 ${version} ${phase.label}`);
        assert(rider.key !== 'destruction',
          `F222 ${version} does not emit a Destruction histogram in ${phase.label}`);
        assert(rider.key !== otherLifeRider,
          `F222 ${version} names the Life-realm rider ${lifeRider}, not ${otherLifeRider}`);
      }
      for (const [side, dist, remHP] of [['def', phase.defDist, phase.defHP],
        ['atk', phase.atkDist, phase.atkHP]]) {
        assertRidersBoundTotal(
          phase.riders.filter(rider => rider.side === side && rider.quantity === 'targetHp'),
          dist, remHP, `F222 ${version} ${phase.label} ${side}`);
      }
    }
    const dosKeys = new Set(dosRows.flatMap(phase => phase.riders.map(rider => rider.key)));
    for (const key of [lifeRider, 'stoningTouch', 'deathTouch', 'poison', 'melee']) {
      assert(dosKeys.has(key), `F222 ${version} emits a ${key} histogram`);
    }

    // The DOS gaze places the touch riders: `BU_ProcessAttack` merges the ranged flag record
    // into every non-melee call, so unlike a modern gaze the group is not jumped past.
    const dosGaze = resolve(version,
      { atk: 4, toHitMod: 3, hp: 10, figs: 2,
        rtb: 1, rtbType: 'gaze_stoning', toHitRtbMod: 3,
        abilities: { stoningGaze: 0, ...dosRiders } },
      dosTarget);
    const gazeRow = (dosGaze.phases || []).find(phase => /Gaze/.test(phase.label));
    assert(!!gazeRow, `F222 ${version} deals an attacker gaze row`);
    const gazeKeys = (gazeRow.riders || []).map(rider => rider.key);
    for (const key of [lifeRider, 'stoningTouch', 'deathTouch', 'poison', 'melee']) {
      assert(gazeKeys.includes(key),
        `F222 ${version} a DOS gaze places the ${key} rider on its own row`);
    }
    for (const rider of gazeRow.riders) assertRiderPmf(rider, `F222 ${version} gaze`);
    assertRidersBoundTotal(
      gazeRow.riders.filter(rider => rider.side === 'def' && rider.quantity === 'targetHp'),
      gazeRow.defDist, gazeRow.defHP, `F222 ${version} the DOS gaze row's`);

    // The ranged volley resolves without a joint and carries the same array at the top level,
    // read off the outcome accumulators rather than off a joint traversal — so it gets the same
    // PMF and sum-to-total checks, against `totalDmgToB`, which is that volley's own total.
    const dosVolley = resolve(version,
      { atk: 4, toHitMod: 3, hp: 10, figs: 2,
        rtb: 3, rtbType: 'missile', toHitRtbMod: 3, abilities: dosRiders },
      dosTarget, { isRanged: true });
    const volleyKeys = (dosVolley.riders || []).map(rider => rider.key);
    for (const key of [lifeRider, 'stoningTouch', 'deathTouch', 'poison', 'melee']) {
      assert(volleyKeys.includes(key),
        `F222 ${version} the DOS ranged volley emits a ${key} histogram`);
    }
    assert(!volleyKeys.includes('destruction'),
      `F222 ${version} the DOS ranged volley emits no Destruction histogram`);
    for (const rider of dosVolley.riders) assertRiderPmf(rider, `F222 ${version} volley`);
    assertRidersBoundTotal(
      dosVolley.riders.filter(rider => rider.side === 'def' && rider.quantity === 'targetHp'),
      dosVolley.totalDmgToB, dosVolley.bRemHP,
      `F222 ${version} the DOS ranged volley's`);

    // R5, first half: a placed rider whose roll can never succeed still draws, at 0. A
    // Resistance of 10 leaves `stoningFailProb` no margin, and the block is still entered.
    const dosResistant = resolve(version,
      { atk: 4, toHitMod: 3, hp: 10, figs: 2,
        rtb: 3, rtbType: 'thrown', toHitRtbMod: 3, abilities: { stoningTouch: 0 } },
      { ...dosTarget, res: 10 });
    const dosStoningRows = (dosResistant.phases || []).flatMap(
      phase => (phase.riders || []).filter(rider => rider.key === 'stoningTouch'));
    assert(dosStoningRows.length > 0,
      `F222 ${version} a placed DOS rider that cannot land still emits a histogram`);
    for (const rider of dosStoningRows) {
      assertRiderPmf(rider, `F222 ${version} inert-rider`);
      assertClose(rider.dist[0], 1,
        `F222 ${version} a DOS rider that cannot land draws all its mass at 0`, 1e-9);
    }

    // R5, second half: the DOS Magic-Immunity gate at `0x99F67` jumps past all five touch
    // blocks in one test — `Reference docs/DOS reconstructed/combat.c`, the
    // `!(Attribs_1 & USA_IMMUNITY_MAGIC)` guard that opens the rider group — so none of them
    // emits. Poison sits outside that gate, at `0x9A2D8` behind its own Poison-Immunity test,
    // and still does.
    const dosImmune = resolve(version,
      { atk: 4, toHitMod: 3, hp: 10, figs: 2,
        rtb: 3, rtbType: 'thrown', toHitRtbMod: 3,
        abilities: { ...dosRiders, lifeSteal: -3 } },
      { ...dosTarget, abilities: { magicImmunity: true } });
    const immuneKeys = new Set((dosImmune.phases || [])
      .flatMap(phase => (phase.riders || []).map(rider => rider.key)));
    for (const key of [lifeRider, 'stoningTouch', 'deathTouch', 'lifeSteal', 'lifeStealHeal']) {
      assert(!immuneKeys.has(key),
        `F222 ${version} the DOS Magic-Immunity gate leaves ${key} with no histogram`);
    }
    assert(immuneKeys.has('poison'),
      `F222 ${version} Poison is outside the DOS Magic-Immunity gate and still emits`);

    // Life Steal is the one DOS rider with a source-side histogram (R2), and it runs the DOS
    // healing record rather than the modern one (`calcDosLifeStealHealOutcomes`). One attacking
    // figure keeps the drain's outcome list small; First Strike is what gives the run a row
    // without Haste, and in `com_6.08` it also takes the DOS-only `isCoM1Only` arm of
    // `applyFsBlockNoHaste` — the 24-HP top-figure test, here satisfied so the strike is dealt.
    const dosDrain = resolve(version,
      { atk: 4, toHitMod: 3, hp: 10, figs: 1,
        abilities: { lifeSteal: -3, firstStrike: true } },
      { figs: 2, def: 0, toBlkMod: 0, res: 5, hp: 6 });
    const drainRow = (dosDrain.phases || []).find(
      phase => (phase.riders || []).some(rider => rider.key === 'lifeSteal'));
    assert(!!drainRow, `F222 ${version} emits a DOS Life Steal drain histogram`);
    const drainHeal = drainRow.riders.find(rider => rider.key === 'lifeStealHeal');
    assert(!!drainHeal, `F222 ${version} emits the DOS Life Steal healing histogram beside it`);
    assertEqual(drainHeal.quantity, 'sourceHp',
      `F222 ${version} the DOS Life Steal healing plots source HP, not the shared axis`);
    assertEqual(drainHeal.side, 'atk',
      `F222 ${version} the DOS Life Steal healing is drawn under the draining unit`);
    for (const rider of drainRow.riders) assertRiderPmf(rider, `F222 ${version} life-steal`);
    assertRidersBoundTotal(
      drainRow.riders.filter(rider => rider.side === 'def' && rider.quantity === 'targetHp'),
      drainRow.defDist, drainRow.defHP, `F222 ${version} the DOS Life Steal row's`);

    // The other side of `isCoM1Only`: CoM 1 suppresses First Strike when the target's top figure
    // is above 24 HP and falls through to a simultaneous main/counter pair, an arm no other
    // build reaches. Its rider tally is a separate code path from the dealt-strike arm above.
    const dosBigTarget = resolve(version,
      { atk: 4, toHitMod: 3, hp: 10, figs: 2,
        abilities: { ...dosRiders, firstStrike: true } },
      { ...dosTarget, figs: 1, hp: 30 });
    const bigRows = (dosBigTarget.phases || []).filter(phase => (phase.riders || []).length);
    assert(bigRows.length > 0,
      `F222 ${version} a First Strike against a 30-HP figure still emits rider histograms`);
    for (const phase of bigRows) {
      for (const rider of phase.riders) {
        assertRiderPmf(rider, `F222 ${version} ${phase.label}`);
      }
      for (const [side, dist, remHP] of [['def', phase.defDist, phase.defHP],
        ['atk', phase.atkDist, phase.atkHP]]) {
        assertRidersBoundTotal(
          phase.riders.filter(rider => rider.side === side && rider.quantity === 'targetHp'),
          dist, remHP, `F222 ${version} ${phase.label} ${side}`);
      }
    }
  }

  // F222.4: every base-roll slot has a name for the side it rolled on.
  //
  // `melee` is the base-roll slot in every phase, so a gaze row's slot holds the gaze's own
  // damage and a Thrown row's holds the Thrown roll. The UI labels the slot from the row's
  // `attackLabels[side]` and halts when there is none, which would be a page crash. A row can
  // carry two `melee` entries — one per direction of a simultaneous exchange — so the name is
  // per side, and a name stated for the wrong side is as bad as a missing one.
  //
  // Asserted here rather than in the browser because the gap is per phase shape per version,
  // and the resolver is where the field is written. The fixtures carry no touch riders: the
  // base slot is present on every damage row regardless, and a rider stack makes the DOS
  // resolutions slow.
  const labelShapes = [
    // `aModern` replaces the DOS shared slot where a modern record states the attack on a named
    // channel instead. A modern gaze is not a channel, so the gaze shapes keep the shared slot.
    { name: 'Thrown', match: /^Thrown/, sides: { def: 'Thrown' },
      a: { atk: 4, hp: 10, rtb: 3, rtbType: 'thrown' },
      aModern: { atk: 4, hp: 10, modernAttacks: { thrown: { strength: 3, type: 'thrown' } } } },
    { name: 'Fire Breath', match: /^Fire Breath/, sides: { def: 'Fire Breath' },
      a: { atk: 4, hp: 10, rtb: 3, rtbType: 'fire' },
      aModern: { atk: 4, hp: 10, modernAttacks: { fireBreath: { strength: 3, type: 'fire' } } } },
    { name: 'attacker gaze', match: /Gaze/, sides: { def: 'Stoning Gaze' },
      a: { atk: 4, hp: 10, rtb: 1, rtbType: 'gaze_stoning', abilities: { stoningGaze: -3 } } },
    { name: 'defender gaze', match: /Gaze/, sides: { atk: 'Stoning Gaze' },
      a: { atk: 4, hp: 10 },
      b: { rtb: 1, rtbType: 'gaze_stoning', abilities: { stoningGaze: -3 } } },
    { name: 'First Strike', match: /^First Strike/, sides: { def: 'First Strike' },
      a: { atk: 4, hp: 10, abilities: { firstStrike: true } } },
    { name: 'Hasted 2nd Strike', match: /^Hasted 2nd Strike/,
      sides: { def: 'Hasted 2nd Strike', atk: 'Counter-attack' },
      a: { atk: 4, hp: 10, abilities: { firstStrike: true, haste: true } } },
    { name: 'Hasted Melee', match: /^Hasted Melee/,
      sides: { def: 'Hasted Melee', atk: 'Counter-attack' },
      a: { atk: 4, hp: 10, abilities: { haste: true } } },
    { name: 'Wall of Fire', match: /^Wall of Fire/, sides: {},
      a: { atk: 4, hp: 10 }, opts: { wallOfFire: true } },
  ];
  for (const version of
    ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const modern = version.startsWith('com2');
    // The DOS To Hit record has no `hitChance` and the modern one has no `toHitMod`; a modern
    // probe that states the shared slot must also name its `modernAttacks` channel, and a gaze
    // is not a channel, so it names the empty record.
    const toHit = modern ? { hitChance: 50 } : { toHitMod: 0 };
    const channels = modern ? { modernAttacks: {} } : {};
    for (const shape of labelShapes) {
      const result = resolve(version,
        { figs: 2, ...toHit, ...channels, ...((modern && shape.aModern) || shape.a) },
        { figs: 2, def: 0, toBlkMod: 0, res: 5, hp: 6, atk: 3, ...toHit, ...channels,
          ...(shape.b || {}) },
        shape.opts || {});
      const rows = result.phases || [];
      const row = rows.find(phase => shape.match.test(phase.label));
      assert(!!row, `F222 ${version} deals a ${shape.name} row for the attack-label check`);
      for (const [side, expected] of Object.entries(shape.sides)) {
        assertEqual((row.attackLabels || {})[side], expected,
          `F222 ${version} the ${shape.name} row names its ${side}-side attack`);
      }
      // Whatever the shape, every base-roll slot on every row has a name for its own side.
      for (const phase of rows) {
        for (const rider of phase.riders || []) {
          if (rider.key !== 'melee') continue;
          const named = (phase.attackLabels || {})[rider.side];
          assert(typeof named === 'string' && named.length > 0,
            `F222 ${version} ${phase.label} names its ${rider.side}-side base-roll slot`);
        }
      }
    }
    // The ranged volley has no phase rows and carries the array at the top level, so its name
    // rides on the result itself.
    const volley = resolve(version,
      { figs: 2, ...toHit, hp: 10, rtb: 3, rtbType: 'missile',
        ...(modern ? { modernAttacks: { ranged: { strength: 3, type: 'missile' } } } : {}) },
      { figs: 2, def: 0, toBlkMod: 0, res: 5, hp: 6, ...toHit, ...channels },
      { isRanged: true });
    assert((volley.riders || []).some(rider => rider.key === 'melee'),
      `F222 ${version} the ranged volley emits its base-roll slot`);
    for (const rider of volley.riders) {
      if (rider.key !== 'melee') continue;
      assertEqual((volley.attackLabels || {})[rider.side], 'Ranged',
        `F222 ${version} the ranged volley names its base-roll slot`);
    }
  }

  // `Result.field_00 := 150` is an assignment, so a Destruction success discards the
  // irrecoverable HP the Exorcise and Stoning Touch blocks put there earlier in the same
  // ApplyAttack, and a later figure's success accumulates on top of the 150
  // (`Reference docs/Caster binary/Combat.ApplyAttack.pas`, the `$005B2DC2` write).
  const destructionSpec = extra => ({
    poisonStr: 0, poisonFail: 0, stoningFail: 0, deathTouchFail: 0,
    dispelEvilFail: 0, exorciseFail: 0, destructionFail: 0, targetHP: 10,
    lifeStealMod: null, lifeStealRes: 0, immDist: null, bloodsucker: false,
    version: 'com2_1.05.11', ...extra,
  });
  const certain = evalInContext(ctx, 'convolveTouchAttacks')(
    [1], 2, destructionSpec({ exorciseFail: 1, destructionFail: 1 }));
  assertClose(certain.dist[150], 1,
    'F222 a certain Destruction discards the Exorcise HP booked before it', 1e-12);
  const certainRiders = evalInContext(ctx, 'outcomeRiderDists')(
    certain.outcomes, certain.ridersPresent, 'riders');
  assertClose(certainRiders.dists.exorcise[0], 1,
    'F222 the discarded Exorcise HP is attributed to no rider', 1e-12);
  const half = evalInContext(ctx, 'convolveTouchAttacks')(
    [1], 1, destructionSpec({ exorciseFail: 1, destructionFail: 0.5 }));
  assertClose(half.dist[150], 0.5,
    'F222 a Destruction success replaces the Exorcise kill rather than adding to it', 1e-12);
  assertClose(half.dist[10], 0.5,
    'F222 the Exorcise kill stands when Destruction does not fire', 1e-12);
  // The figures after the last success accumulate on top of the 150.
  const after = evalInContext(ctx, 'convolveTouchAttacks')(
    [1], 2, destructionSpec({ exorciseFail: 1, destructionFail: 0.5 }));
  assertClose(after.dist[160], 0.25,
    'F222 a figure after the last Destruction success adds its Exorcise kill to the 150',
    1e-12);
}

// The step runner (Calculator/steps.js) — R1's single stat-derivation mechanism.
// Asserted directly rather than only through the stats it will carry, because the
// migration relies on three of its properties: phase order, stable within-phase order,
// and the write check that catches a step writing a field it did not declare.

// F222.5: the hover chain each rider histogram carries. The claim under test is not that a
// chain exists but that it is the one the query that produced the rider's number built — so
// every assertion below re-derives the figure from the same routine the resolver called and
// requires the chain to end on it, and requires the realm to be the one the rider's source
// names (`Combat.ApplyAttack.pas:485`/`:494`/`:502`/`:511`/`:521`/`:533` and
// `combat.c:4556`/`:4617`/`:4641`/`:4672`/`:4686`/`:4905`, transcribed in `combat_effects.js`).
function runRiderChainChecks(ctx) {
  const resolve = (version, aOverrides, bOverrides, opts = {}) => ctx.resolveCombat(
    ctx.deriveUnitStats(baseUnitInput({ version, ...aOverrides })),
    ctx.deriveUnitStats(baseUnitInput({ version, prefix: 'b', ...bOverrides })),
    { version, isRanged: false, wallOfFire: false, distance: 1, ...opts });
  const allRiders = result => [
    ...(result.phases || []).flatMap(phase => (phase.riders || []).map(
      rider => ({ phase: phase.label, rider }))),
    ...(result.riders || []).map(rider => ({ phase: 'Ranged volley', rider })),
  ];

  // The realm each rider's roll names. `melee` is the base-roll slot and is not on this list:
  // what it carries is the phase's own effective defense, plus — on a gaze row — the kill
  // rolls, which are the gaze call's own rather than riders on it (F223). The DOS stoning gaze
  // is the exception F225.2 made: its loop writes a bucket of its own, so it draws its own row
  // and its Nature roll heads that row instead of the base-roll slot.
  const RIDER_REALMS = {
    stoningGaze: 'nature',
    dispelEvil: 'life',
    exorcise: 'life',
    stoningTouch: 'nature',
    deathTouch: 'death',
    lifeSteal: 'death',
    lifeStealHeal: 'death',
    destruction: 'chaos',
    poison: null,
  };
  // The two riders that make no roll of their own: Blood Sucker is a flat amount dealt after
  // the per-figure loop closes, and its healing is the same event read on the source.
  const CHAINLESS_RIDERS = new Set(['bloodsucker', 'bloodsuckerHeal']);

  // One figure a side, and no Haste. Six riders on one exchange is the stack F222.2 measured
  // at tens of seconds for a multi-figure card, and nothing here needs more than one path per
  // rider: the claim is about the chains, and the histograms themselves are covered above.
  const attacker = {
    atk: 4, hitChance: 70, hp: 4, figs: 1,
    abilities: {
      stoningTouch: -3, deathTouch: -2, lifeSteal: -1, destruction: -1, exorcise: -2,
      poison: 1,
    },
  };
  const target = {
    figs: 1, def: 4, toBlkMod: 0, res: 8, hp: 4, unitType: 'fantastic_chaos',
    // Resist Elements through the `elemArmor` select, which is the control that offers it here:
    // the raw `resistElements` key is Warlord's Lava Smelter grant alone since F244.3c, so a raw
    // mark writes nothing outside Warlord and this target would carry no resistance bonus.
    abilities: { bless: true, elemArmor: 'resistElements', resistMagic: true },
  };

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const withChains = resolve(version, attacker, target, { riderChains: true });
    const rows = allRiders(withChains);
    assert(rows.length > 0, `F222.5 ${version} emits rider rows to hang chains on`);

    // The matrix asks for no chains and must pay for none: same matchup, same rows, no field.
    for (const { rider, phase } of allRiders(resolve(version, attacker, target))) {
      assert(rider.chains === undefined,
        `F222.5 ${version} ${phase} rider ${rider.key} carries no chain unless one is asked for`);
    }

    const realmsSeen = new Set();
    for (const { phase, rider } of rows) {
      const label = `F222.5 ${version} ${phase} rider ${rider.key}`;
      if (CHAINLESS_RIDERS.has(rider.key)) {
        assert(!rider.chains, `${label} makes no roll and carries no chain`);
        continue;
      }
      assert(rider.chains && rider.chains.length > 0, `${label} carries a chain`);
      for (const record of rider.chains) {
        // INV-2: a chain may not name a step this engine family does not run. The two families
        // transcribe two different routines, and each step id carries its routine's name.
        for (const entry of record.trace.entries) {
          assertEqual(entry.phase, 'attackSpecific', `${label} chain entry is attack-specific`);
          assert(!/^dos/.test(entry.id),
            `${label} modern chain names no DOS step (${entry.id})`);
        }
      }
      if (rider.key === 'melee') {
        // The base-roll slot: the defense the phase's attack was scored against.
        const defense = rider.chains.filter(record => record.quantity === 'defense');
        assertEqual(defense.length, 1, `${label} carries exactly one effective-defense chain`);
        continue;
      }
      const expectedRealm = RIDER_REALMS[rider.key];
      assert(expectedRealm !== undefined, `${label} is a rider this check knows the realm of`);
      assertEqual(rider.chains.length, 1, `${label} carries one resistance chain`);
      const record = rider.chains[0];
      assertEqual(record.quantity, 'resistance', `${label} chain is a resistance chain`);
      assertEqual(record.realm, expectedRealm, `${label} chain names its source's realm`);
      realmsSeen.add(String(expectedRealm));
      // The chain is the projection of the trace the query produced, so it must end on the
      // figure that query returns for this target and realm, and start from the record value
      // its seeding step reads.
      const defender = ctx.deriveUnitStats(baseUnitInput({ version, prefix: 'b', ...target }));
      assertEqual(record.trace.base, defender.res, `${label} chain starts at the record's Resistance`);
      // "Emitted by the computing path" is a structural property and cannot be asserted
      // directly. What can be: the chain is the whole ordered list of steps that fired in that
      // query, not merely a set of writes that happen to reach the same total. A chain rebuilt
      // in the UI from the controls would have to reproduce this version's step list, its
      // order, and its predicates exactly to pass.
      const witnessTrace = [];
      const witnessValue = ctx.effectiveResistance(defender, version, expectedRealm, true,
        witnessTrace);
      const witness = ctx.projectStatTrace(witnessTrace, 'effectiveResistance', defender.res,
        witnessValue, { baseId: 'effectiveResistance:base' });
      assertEqual(record.trace.result, witnessValue,
        `${label} chain ends on the figure the roll used`);
      assertSameKeyList(record.trace.entries.map(entry => entry.id),
        witness.entries.map(entry => entry.id),
        `${label} chain is the query's own ordered step list`);
      assertEqual(record.trace.entries.map(entry => `${entry.from}>${entry.to}`).join(','),
        witness.entries.map(entry => `${entry.from}>${entry.to}`).join(','),
        `${label} chain carries the query's own running values`);
      let running = record.trace.base;
      for (const entry of record.trace.entries) {
        assertEqual(entry.from, running, `${label} chain is continuous at ${entry.id}`);
        running = entry.to;
      }
      assertEqual(running, record.trace.result, `${label} chain reaches its own result`);
    }
    // The point of putting the realm in the header: one target, one attack, five different
    // effective resistances, and they are not all the same number.
    assertEqual(realmsSeen.size, 5,
      `F222.5 ${version} one attack asks five realms of one target`);
    const byRealm = new Map();
    for (const { rider } of rows) {
      if (!rider.chains || CHAINLESS_RIDERS.has(rider.key) || rider.key === 'melee') continue;
      byRealm.set(String(rider.chains[0].realm), rider.chains[0].trace.result);
    }
    assert(new Set(byRealm.values()).size > 1,
      `F222.5 ${version} those five figures are not one figure under five names`);
    // Poison passes realm 0, so not one realm-conditional term of the query reaches it — not
    // Magic Immunity, not Resist Magic, not Bless, not Resist Elements — and it therefore
    // stands at the record's own Resistance while every named realm has moved off it.
    assertEqual(byRealm.get('null'),
      ctx.deriveUnitStats(baseUnitInput({ version, prefix: 'b', ...target })).res,
      `F222.5 ${version} the realm-less Poison roll takes no realm-conditional term`);
    assert(byRealm.get('life') > byRealm.get('null'),
      `F222.5 ${version} a named realm does take them`);
  }

  // The DOS families run their own routine, and no chain may name a modern step. Dispel Evil
  // stands in for Exorcise in the two MoM builds; Destruction is not placed in any DOS build.
  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const dosAttacker = {
      atk: 4, toHitMod: 1, hp: 4, figs: 1,
      abilities: {
        stoningTouch: -3, deathTouch: -2, poison: 1, dispelEvil: true, exorcise: -1,
      },
    };
    const dosTarget = {
      figs: 1, def: 5, toBlkMod: 0, res: 8, hp: 4, unitType: 'fantastic_chaos',
      abilities: { bless: true, elemArmor: 'resistElements' },
    };
    const result = resolve(version, dosAttacker, dosTarget, { riderChains: true });
    const defender = ctx.deriveUnitStats(
      baseUnitInput({ version, prefix: 'b', ...dosTarget }));
    let sawResistanceChain = false;
    for (const { phase, rider } of allRiders(result)) {
      const label = `F222.5 ${version} ${phase} rider ${rider.key}`;
      assertEqual(rider.key === 'destruction', false, `${label} is not Destruction in a DOS build`);
      if (CHAINLESS_RIDERS.has(rider.key)) continue;
      assert(rider.chains && rider.chains.length > 0, `${label} carries a chain`);
      for (const record of rider.chains) {
        for (const entry of record.trace.entries) {
          assert(/^dos/.test(entry.id), `${label} DOS chain names only DOS steps (${entry.id})`);
        }
        if (record.quantity !== 'resistance') continue;
        sawResistanceChain = true;
        // Against the rider's own realm from the table above, not against the realm the record
        // happens to carry: reading the record back would let a wrong realm agree with itself.
        const expectedRealm = RIDER_REALMS[rider.key];
        assert(expectedRealm !== undefined,
          `${label} is a rider this check knows the realm of`);
        assertEqual(record.realm, expectedRealm, `${label} chain names its source's realm`);
        assertEqual(record.trace.base, defender.res,
          `${label} chain starts at the record's Resistance`);
        assertEqual(record.trace.result,
          ctx.dosEffectiveResistance(defender, version, expectedRealm),
          `${label} chain ends on the figure the DOS roll used`);
        let running = record.trace.base;
        for (const entry of record.trace.entries) {
          assertEqual(entry.from, running, `${label} DOS chain is continuous at ${entry.id}`);
          running = entry.to;
        }
        assertEqual(running, record.trace.result, `${label} DOS chain reaches its own result`);
      }
    }
    assert(sawResistanceChain, `F222.5 ${version} emits at least one DOS resistance chain`);
  }

  // A gaze row is one `ApplyAttack` call in the modern builds and names one kill roll, so its
  // base-roll slot must not carry the other roll's chain.
  const gazer = {
    atk: 4, hitChance: 70, hp: 4, figs: 1,
    abilities: { stoningGaze: -2, deathGaze: -1 },
  };
  const gazed = { figs: 1, def: 4, toBlkMod: 0, res: 8, hp: 4,
    abilities: { bless: true, elemArmor: 'resistElements' } };
  const gazeResult = resolve('com2_1.05.11', gazer, gazed, { riderChains: true });
  const gazeRows = (gazeResult.phases || []).filter(phase => /Gaze/.test(phase.label));
  assert(gazeRows.length >= 2, 'F222.5 the modern gazer emits a row per kill gaze');
  for (const phase of gazeRows) {
    const base = (phase.riders || []).find(rider => rider.key === 'melee');
    assert(base, `F222.5 ${phase.label} carries its base-roll slot`);
    const realms = (base.chains || []).filter(record => record.quantity === 'resistance')
      .map(record => record.realm);
    assertEqual(realms.length, 1, `F222.5 ${phase.label} names one kill roll`);
    assertEqual(realms[0], /Stoning/.test(phase.label) ? 'nature' : 'death',
      `F222.5 ${phase.label} names its own kill roll's realm`);
  }

  // F225.2: a DOS combined gaze splits its stoning kill into a rider of its own, so the roll
  // that produced it heads that rider rather than the row's base-roll slot — which keeps the
  // death roll, whose `hits` are still part of the base distribution. Both halves are asserted,
  // because moving the record to the wrong slot passes either one alone.
  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const dosGaze = resolve(version,
      { rtbType: 'gaze_multiple', rtb: 1, toHitRtbMod: 3, hp: 10, figs: 1,
        abilities: { stoningGaze: -3, deathGaze: -3 } },
      { figs: 4, def: 0, toBlkMod: 0, res: 5, hp: 10 }, { riderChains: true });
    const row = (dosGaze.phases || []).find(phase => /Gaze/.test(phase.label));
    assert(!!row, `F225.2 ${version} deals a DOS combined gaze row`);
    const stoningRow = (row.riders || []).find(rider => rider.key === 'stoningGaze');
    assert(!!stoningRow, `F225.2 ${version} the DOS stoning kill draws its own histogram`);
    assertEqual((stoningRow.chains || []).length, 1,
      `F225.2 ${version} that histogram carries one chain`);
    assertEqual(stoningRow.chains[0].quantity, 'resistance',
      `F225.2 ${version} and it is the resistance the kill roll had to beat`);
    assertEqual(stoningRow.chains[0].realm, 'nature',
      `F225.2 ${version} headed by the Nature realm the stoning loop rolls in`);
    const baseRow = (row.riders || []).find(rider => rider.key === 'melee');
    const baseRealms = (baseRow.chains || [])
      .filter(record => record.quantity === 'resistance').map(record => record.realm);
    assertSameKeyList(baseRealms, ['death'],
      `F225.2 ${version} the base-roll slot keeps the death roll and only the death roll`);
    // And the placement gate: an immunity that skips the loop outright emits no key at all,
    // rather than a row of zeroes claiming a roll the engine never made (0x99D8F).
    const immune = resolve(version,
      { rtbType: 'gaze_multiple', rtb: 1, toHitRtbMod: 3, hp: 10, figs: 1,
        abilities: { stoningGaze: -3, deathGaze: -3 } },
      { figs: 4, def: 0, toBlkMod: 0, res: 5, hp: 10,
        abilities: { stoningImmunity: true } }, { riderChains: true });
    const immuneRow = (immune.phases || []).find(phase => /Gaze/.test(phase.label));
    assert(!(immuneRow.riders || []).some(rider => rider.key === 'stoningGaze'),
      `F225.2 ${version} Stoning Immunity skips the loop and draws no histogram`);
  }

  // A rider whose roll is made and cannot succeed draws at zero, and shows the chain that says
  // why: the figure the roll had to beat is in it.
  const hopeless = resolve('com2_1.05.11',
    { atk: 4, hitChance: 70, hp: 4, figs: 1, abilities: { stoningTouch: 0 } },
    { figs: 1, def: 0, toBlkMod: 0, res: 10, hp: 4, abilities: { elemArmor: 'resistElements' } },
    { riderChains: true });
  const zeroRows = allRiders(hopeless).filter(({ rider }) => rider.key === 'stoningTouch');
  assert(zeroRows.length > 0, 'F222.5 a rider that cannot land still emits a row');
  for (const { rider } of zeroRows) {
    assertClose(rider.dist[0], 1, 'F222.5 that rider draws all its mass at 0', 1e-9);
    assertEqual(rider.chains.length, 1, 'F222.5 and carries its chain unchanged');
    assertEqual(rider.chains[0].realm, 'nature', 'F222.5 headed by the realm it rolled in');
    assert(rider.chains[0].trace.entries.some(entry => entry.id.endsWith(':resistElements')),
      'F222.5 and naming the transform that put the roll out of reach');
  }

  // The other half of that pair, and the one R5's placement gate does not already cover: the
  // gaze row's base-roll slot always draws, so an immunity that makes the engine skip the kill
  // roll must take the chain with it rather than leave a figure nothing was rolled against.
  const skipped = resolve('com2_1.05.11', gazer,
    { ...gazed, abilities: { ...gazed.abilities, stoningImmunity: true } },
    { riderChains: true });
  const skippedRows = (skipped.phases || []).filter(phase => /Stoning Gaze/.test(phase.label));
  assert(skippedRows.length > 0, 'F222.5 the skipped gaze still draws its row');
  for (const phase of skippedRows) {
    const base = (phase.riders || []).find(rider => rider.key === 'melee');
    const resistance = (base.chains || []).filter(record => record.quantity === 'resistance');
    assertEqual(resistance.length, 0,
      `F222.5 ${phase.label} shows no chain for a roll the immunity skipped`);
  }

  // Only a gaze's conventional component is scored against Defense. The gazer above carries
  // none, so its rows must claim none; giving it one turns the same rows' claim on.
  for (const phase of gazeRows) {
    const base = (phase.riders || []).find(rider => rider.key === 'melee');
    assertEqual((base.chains || []).filter(record => record.quantity === 'defense').length, 0,
      `F222.5 ${phase.label} is scored against no Defense and says so`);
  }
  // The positive arm, on the shared DOS slot, which is where a conventional gaze component
  // lives: that component *is* rolled against Defense, so the same slot must claim it.
  const conventionalGaze = resolve('mom_1.31',
    { rtbType: 'gaze_stoning', rtb: 10, toHitRtbMod: 70, hp: 10, figs: 1 },
    { figs: 1, def: 4, toBlkMod: 0, res: 8, hp: 20 }, { riderChains: true });
  const conventionalRows = (conventionalGaze.phases || [])
    .filter(phase => /Gaze/.test(phase.label));
  assert(conventionalRows.length > 0, 'F222.5 the conventional gazer emits its rows');
  for (const phase of conventionalRows) {
    const base = (phase.riders || []).find(rider => rider.key === 'melee');
    assertEqual((base.chains || []).filter(record => record.quantity === 'defense').length, 1,
      `F222.5 ${phase.label} does carry the Defense its conventional component rolled against`);
  }

  // Immolation is a spell cast, and the modern engine reads no Defense on either of the two
  // arms it can take before reaching one.
  const immolator = { atk: 4, hitChance: 70, hp: 4, figs: 1,
    abilities: { immolation: true, stoningTouch: -3 } };
  const immolationDefense = (targetAbilities) => {
    const result = resolve('com2_1.05.11', immolator,
      { figs: 1, def: 4, toBlkMod: 0, res: 8, hp: 4, abilities: targetAbilities },
      { riderChains: true });
    return allRiders(result).filter(({ rider }) => rider.key === 'immolation')
      .map(({ rider }) => (rider.chains || []).length);
  };
  const rolled = immolationDefense({});
  assert(rolled.length > 0 && rolled.every(count => count === 1),
    'F222.5 an Immolation that rolls against Defense carries that chain');
  for (const [name, abilities] of [['Magic Immunity', { magicImmunity: true }],
    ['Black Sleep', { blackSleep: true }]]) {
    const counts = immolationDefense(abilities);
    assert(counts.length > 0, `F222.5 Immolation still draws under ${name}`);
    assert(counts.every(count => count === 0),
      `F222.5 and claims no Defense chain under ${name}`);
  }

  // The DOS defense chain: continuous, and carrying the City Walls bonus its own routine adds
  // after the sequence rather than losing it or double-counting it.
  const walled = resolve('mom_cp_1.60.00',
    { atk: 6, toHitMod: 1, hp: 4, figs: 1, abilities: { stoningTouch: -3 } },
    { figs: 1, def: 5, toBlkMod: 0, res: 8, hp: 4, cityWalls: '3' },
    { riderChains: true });
  const walledBase = allRiders(walled).map(({ rider }) => rider)
    .find(rider => rider.key === 'melee' && rider.side === 'def');
  assert(walledBase && walledBase.chains, 'F222.5 the DOS melee row carries its Defense chain');
  const walledChain = walledBase.chains.find(record => record.quantity === 'defense');
  assert(walledChain, 'F222.5 that chain is a Defense chain');
  assertEqual(walledChain.trace.base, 5, 'F222.5 it starts at the record Defense');
  assertEqual(walledChain.trace.result, 8, 'F222.5 and ends on 5 + the intact-wall 3');
  let dosRunning = walledChain.trace.base;
  for (const entry of walledChain.trace.entries) {
    assertEqual(entry.from, dosRunning, `F222.5 DOS Defense chain is continuous at ${entry.id}`);
    dosRunning = entry.to;
  }
  assertEqual(dosRunning, walledChain.trace.result,
    'F222.5 DOS Defense chain reaches its own result');
  assertEqual(walledChain.trace.entries.filter(
    entry => entry.id === 'dosEffectiveDefense:cityWalls').length, 1,
  'F222.5 the wall bonus is one entry, not none and not two');
}

module.exports = { runPhaseChecks, runRiderHistogramChecks, runRiderChainChecks };
