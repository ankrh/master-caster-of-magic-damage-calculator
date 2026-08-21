// Combat phase builders in isolation: the distributions each phase returns and the
// invariants they must keep.

'use strict';

const {
  evalInContext, assert, assertEqual, assertClose, assertDistSumsToOne, baseUnitInput,
} = require('./assertions');

function runPhaseChecks(ctx) {
  // F22: Caster.exe doubles only the selected melee/Thrown scratch strength. The
  // finished derived channels remain unchanged, and CoM 1 retains melee-only behavior.
  const bloodLustTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 0, def: 0, hp: 40, unitType: 'normal',
  }));
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 0, def: 0, hp: 10, toHitRtbMod: 70, unitType: 'normal',
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
    version: 'com2_1.05.11', atk: 1, def: 0, hp: 10, toHitMod: 70, toHitRtbMod: 70,
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
      version: 'com2_1.05.11', atk: 0, def: 0, hp: 10, toHitRtbMod: 70,
      abilities: { bloodLust: true },
      modernAttacks: { ranged: { strength: 3, type } },
    }));
    const rangedResult = ctx.resolveCombat(rangedAttacker, bloodLustTarget,
      { version: 'com2_1.05.11', isRanged: true, wallOfFire: false, distance: 1 });
    assertEqual(rangedResult.totalDmgToB[3], 1,
      `Modern Blood Lust does not double ${type === 'missile' ? 'physical' : 'magical'} conventional ranged`);
  }

  // R3.3: Caster.exe's independent attack fields must survive the legacy card's single
  // RTB projection. Three deterministic coexisting channels produce three separate attacks.
  const modernChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, rtb: 0, rtbType: 'none', def: 0, hp: 10,
    toHitRtbMod: 70,
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
  assertEqual(multiChannelRoster.length, 29, 'Warlord roster contains the expected multi-channel units');
  for (const unit of multiChannelRoster) {
    const records = {
      ranged: unit.ranged ? { strength: unit.ranged, type: typeMap[unit.ranged_type] } : null,
      thrown: unit.thrown ? { strength: unit.thrown, type: 'thrown' } : null,
      fireBreath: unit.fire_breath ? { strength: unit.fire_breath, type: 'fire' } : null,
      lightningBreath: unit.lightning_breath ? { strength: unit.lightning_breath, type: 'lightning' } : null,
    };
    const projection = records.ranged || records.thrown || records.fireBreath || records.lightningBreath;
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.7', figs: unit.figures, atk: unit.melee,
      rtb: projection.strength, rtbType: projection.type, def: unit.defense,
      res: unit.resist, hp: unit.hp, toHitRtbMod: 70, modernAttacks: records,
    }));
    const expectedKeys = Object.keys(records).filter(key => records[key]);
    assertEqual(Object.keys(attacker.modernAttacks).length, expectedKeys.length,
      `${unit.name} retains every source attack channel during derivation`);
    const melee = ctx.resolveCombat(attacker, channelTarget,
      { version: 'com2_warlord_1.5.12.7', isRanged: false, wallOfFire: false });
    const expectedMeleeChannels = expectedKeys.filter(key => key !== 'ranged').length;
    assertEqual((melee.phases || []).filter(p => /Breath|Thrown/.test(p.label)).length, expectedMeleeChannels,
      `${unit.name} resolves every non-ranged channel`);
    if (records.ranged) {
      const ranged = ctx.resolveCombat(attacker, channelTarget,
        { version: 'com2_warlord_1.5.12.7', isRanged: true, wallOfFire: false });
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
      assertEqual(result.totalDmgToB[10], 1,
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
    bResDeath: 0,
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
    bResDeath: 0,
    aHaste: true,
  });
  const hastedThrownResult = hastedThrown.compute(2, 2, 5);
  assertDistSumsToOne(hastedThrownResult.dist, 'Hasted thrown doom distribution');
  assertEqual(hastedThrownResult.dist[4], 1, 'Hasted thrown self-convolves damage');
}

// The step runner (Calculator/steps.js) — R1's single stat-derivation mechanism.
// Asserted directly rather than only through the stats it will carry, because the
// migration relies on three of its properties: phase order, stable within-phase order,
// and the write check that catches a step writing a field it did not declare.

module.exports = { runPhaseChecks };
