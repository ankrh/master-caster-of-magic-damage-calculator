// The ordered-step machinery: step construction and the modifier trace the UI reads back.

'use strict';

const {
  evalInContext, abilitiesStatableIn, assert, assertEqual, assertClose, assertSameKeyList,
  baseUnitInput, traceWrites,
} = require('./assertions');

function runStatStepChecks(ctx) {
  const HALT = evalInContext(ctx, 'HALT');
  const step = (id, phase, writes, apply, extra) =>
    ctx.statStep({ id, phase, writes, apply, ...(extra || {}) });

  // A step reads the field's current value at its own position, so a later halving sees
  // everything the earlier additions wrote — the property the bucket model cannot express.
  const unit = { res: 2 };
  ctx.runStatSteps([
    step('add', 'a', ['res'], u => { u.res += 5; }),
    step('halve', 'c', ['res'], u => { u.res = Math.floor(u.res / 2); }),
  ], unit, { version: 'com2_1.05.11' });
  assertEqual(unit.res, 3, 'A later step reads what earlier steps wrote');

  // List order is execution order; phase only has to be non-decreasing along it.
  let misordered = null;
  try {
    ctx.runStatSteps([
      step('spell', 'c', ['res'], u => { u.res += 1; }),
      step('intrinsic', 'a', ['res'], u => { u.res += 1; }),
    ], { res: 0 }, { validateWrites: true });
  } catch (err) {
    misordered = String(err.message);
  }
  assert(misordered && misordered.includes('is declared after'),
    'A sequence authored out of phase order is rejected');

  const skipped = { res: 0 };
  ctx.runStatSteps([
    step('inactive', 'a', ['res'], u => { u.res += 1; }, { when: () => false }),
    step('active', 'a', ['res'], u => { u.res += 2; }, { when: () => true }),
  ], skipped, {});
  assertEqual(skipped.res, 2, 'A step whose predicate is false does not run');

  const halted = { res: 0, def: 0 };
  ctx.runStatSteps([
    step('bonus', 'a', ['res'], u => { u.res += 1; }),
    step('illusion', 'a', ['def'], () => HALT),
    step('unreached', 'a', ['res'], u => { u.res += 100; }),
  ], halted, {});
  assertEqual(halted.res, 1, 'HALT stops the sequence');

  const base = Object.freeze({ def: 4 });
  const reader = { def: 99 };
  ctx.runStatSteps([
    step('holyArmor', 'c', ['def'], (u, c) => { u.def = c.base.def + 2; }),
  ], reader, { base });
  assertEqual(reader.def, 6, 'A step reads the permanent base record through ctx.base');

  const trace = [];
  ctx.runStatSteps([
    step('silent', 'a', ['res'], () => {}),
    step('warpResist', 'c', ['res'], u => { u.res = 0; }),
  ], { res: 7 }, { trace });
  assertEqual(trace.length, 1, 'Only steps that change a field are traced');
  assertEqual(trace[0].id, 'warpResist', 'Trace names the step');
  assertEqual(trace[0].source.id, 'warpResist', 'Trace identifies the transform source');
  assertEqual(trace[0].changes.res.delta, -7, 'Trace records the delta');

  let undeclared = null;
  try {
    ctx.runStatSteps([
      step('sloppy', 'a', ['res'], u => { u.res += 1; u.def += 1; }),
    ], { res: 0, def: 0 }, { validateWrites: true });
  } catch (err) {
    undeclared = String(err.message);
  }
  assert(undeclared && undeclared.includes('undeclared field def'),
    'validateWrites catches a step writing a field it did not declare');

  let rejected = null;
  try {
    ctx.statStep({ id: 'nowhere', phase: 'z', writes: ['res'], apply: () => {} });
  } catch (err) {
    rejected = String(err.message);
  }
  assert(rejected && rejected.includes('unknown phase'), 'statStep rejects an unknown phase');

  // The sequence is assembled from two places, so a colliding id has to fail rather than
  // quietly make the trace ambiguous.
  let collided = null;
  try {
    ctx.runStatSteps([
      step('lionheart', 'c', ['res'], u => { u.res += 1; }),
      step('lionheart', 'c', ['res'], u => { u.res += 1; }),
    ], { res: 0 }, { validateWrites: true });
  } catch (err) {
    collided = String(err.message);
  }
  assert(collided && collided.includes('declared twice'),
    'A sequence with two steps sharing an id is rejected');
}

function runModifierTraceChecks(ctx) {
  const traced = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    identity: ctx.createCustomUnitIdentity('com2_warlord_1.5.12.9', {
      baseRace: 'High Men', specialUnit: 'chosen',
    }),
    atk: 5,
    rtb: 4,
    rtbType: 'missile',
    def: 6,
    res: 8,
    hp: 7,
    level: 'elite',
    weapon: 'mithril',
    // A modern fixture states the record's own To-Hit fields; the DOS pair is a different
    // record shape (`SPEC.md`, *Attack channels on the card*).
    hitMelee: 5,
    abilities: { lucky: true, highPrayer: true, warpAttack: true, vertigo: true },
    modernAttacks: {
      ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 2, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));

  for (const [name, trace] of Object.entries(traced.modifierTraces)) {
    if (name === 'modernAttacks') continue;
    assert(trace && Array.isArray(trace.entries), `${name} exposes a projected modifier trace`);
    let running = trace.base;
    for (const entry of trace.entries) {
      assert(entry.source && typeof entry.source.id === 'string' && entry.source.id.length > 0,
        `${name} trace entry identifies its source`);
      assertEqual(entry.from, running, `${name} trace carries a continuous running before value`);
      running = entry.to;
    }
    assertEqual(running, trace.result, `${name} trace finishes at its displayed result`);
  }

  const meleeSources = traced.modifierTraces.melee.entries.map(entry => entry.source.id);
  assert(meleeSources.indexOf('level') < meleeSources.indexOf('weapon'),
    'Melee trace keeps level before weapon execution order');
  assert(meleeSources.indexOf('weapon') < meleeSources.indexOf('highPrayer'),
    'Melee trace keeps weapon before the later High Prayer write');
  assert(meleeSources.indexOf('highPrayer') < meleeSources.indexOf('warpAttack'),
    'Melee trace keeps High Prayer before Warp Attack');

  const chanceSources = traced.modifierTraces.toHitMelee.entries.map(entry => entry.source.id);
  assertEqual(chanceSources[0], 'baseThresholds',
    'To Hit trace starts with the editable base modifier when it is active');
  assert(chanceSources.indexOf('level') < chanceSources.indexOf('weapon'),
    'To Hit trace keeps level before weapon');
  // Lucky precedes the weapon-material write in all five chains, and the projection presents
  // the ledger in execution order rather than re-sequencing it.
  assert(chanceSources.indexOf('lucky') < chanceSources.indexOf('weapon'),
    'To Hit trace keeps Lucky before weapon, as every chain executes them');
  assert(chanceSources.indexOf('highPrayer') < chanceSources.indexOf('vertigo'),
    'Displayed To Hit trace keeps High Prayer before the later recalculation-time Vertigo write');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const raisedBeforeHolyArmor = ctx.deriveUnitStats(baseUnitInput({
      version, def: 1,
      abilities: {
        holyArmor: true, discipline: 'overland', animated: true,
        mysticSurge: true, ironSkin: true, landLinking: true,
      },
    }));
    assertEqual(raisedBeforeHolyArmor.def, 12,
      `${version}: every represented earlier Defense writer contributes before Holy Armor`);
    assertClose(raisedBeforeHolyArmor.toBlock, 0.4,
      `${version}: earlier Defense writers can select Holy Armor's To Defend branch`);
    const earlierWriterIds = raisedBeforeHolyArmor.statTrace.map(entry => entry.id);
    const holyArmorIndex = earlierWriterIds.indexOf('holyArmor');
    for (const earlierId of ['discipline', 'animated', 'mysticSurge', 'ironSkin', 'landLinking']) {
      assert(earlierWriterIds.indexOf(earlierId) < holyArmorIndex,
        `${version}: ${earlierId} trace precedes Holy Armor's live Defense read`);
    }

    const raisedAfterHolyArmor = ctx.deriveUnitStats(baseUnitInput({
      version, def: 4, abilities: { holyArmor: true, highPrayer: true },
    }));
    assertEqual(raisedAfterHolyArmor.def, 8,
      `${version}: Holy Armor takes its +2 Defense branch before High Prayer raises Defense`);
    assertClose(raisedAfterHolyArmor.toBlock, 0.4,
      `${version}: later High Prayer cannot change Holy Armor's To Defend outcome`);
    const raisedIds = raisedAfterHolyArmor.statTrace.map(entry => entry.id);
    assert(raisedIds.indexOf('holyArmor') < raisedIds.indexOf('highPrayer'),
      `${version}: Holy Armor trace precedes the later combat-global Defense write`);

    const loweredAfterHolyArmor = ctx.deriveUnitStats(baseUnitInput({
      version, def: 6, abilities: { holyArmor: true, blackPrayer: true },
    }));
    assertEqual(loweredAfterHolyArmor.def, 5,
      `${version}: Holy Armor takes its To Defend branch before Black Prayer lowers Defense`);
    assertClose(loweredAfterHolyArmor.toBlock, 0.4,
      `${version}: later Black Prayer cannot change Holy Armor's To Defend outcome`);
    const loweredIds = loweredAfterHolyArmor.statTrace.map(entry => entry.id);
    assert(loweredIds.indexOf('holyArmor') < loweredIds.indexOf('blackPrayer'),
      `${version}: Holy Armor trace precedes the later curse Defense write`);

    const postThresholdOrder = ctx.deriveUnitStats(baseUnitInput({
      version, def: 6, hp: 8, armor: 'orihalcon', rtb: 2, rtbType: 'magic',
      modernAttacks: { ranged: { strength: 2, type: 'magic' } },
      abilities: {
        holyArmor: true, holyWeapon: true, highPrayer: true,
        reinforceMagic: true, charmOfLife: true, weakness: true,
      },
    })).statTrace.map(entry => entry.id);
    assert(postThresholdOrder.indexOf('holyArmor') < postThresholdOrder.indexOf('orihalcon')
        && postThresholdOrder.indexOf('orihalcon')
          < postThresholdOrder.indexOf('holyWeapon')
        && postThresholdOrder.indexOf('holyWeapon')
          < postThresholdOrder.indexOf('highPrayer'),
    `${version}: post-threshold order is Holy Armor, Orihalcon, Holy Weapon, then globals`);
    const representativeLaterIds = ['reinforceMagic', 'charmOfLife', 'weakness'];
    let previousLaterIndex = postThresholdOrder.indexOf('holyWeapon');
    for (const laterId of representativeLaterIds) {
      const laterIndex = postThresholdOrder.indexOf(laterId);
      assert(previousLaterIndex < laterIndex,
        `${version}: ${laterId} remains on the ordered post-Holy-Armor side`);
      previousLaterIndex = laterIndex;
    }
    const physicalLaterOrder = ctx.deriveUnitStats(baseUnitInput({
      version, def: 6, hp: 8, rtb: 2, rtbType: 'missile',
      modernAttacks: { ranged: { strength: 2, type: 'missile' } },
      abilities: {
        holyArmor: true, holyWeapon: true,
        charmOfLife: true, blazingMarch: true, weakness: true,
      },
    })).statTrace.map(entry => entry.id);
    assert(physicalLaterOrder.indexOf('holyWeapon')
        < physicalLaterOrder.indexOf('charmOfLife')
        && physicalLaterOrder.indexOf('charmOfLife')
          < physicalLaterOrder.indexOf('blazingMarch')
        && physicalLaterOrder.indexOf('blazingMarch')
          < physicalLaterOrder.indexOf('weakness'),
    `${version}: explicit global, combat-global, and curse pieces follow Holy Weapon in order`);
  }

  assertEqual(traceWrites(traced.modifierTraces.fantastic)[0].source.id, 'chosen',
    'Boolean identity trace attributes the live Fantastic write');
  assertEqual(traceWrites(traced.modifierTraces.race)[0].source.id, 'chosen',
    'Identity trace attributes the live race write');

  const rangedDistanceTraceUnit = ctx.deriveUnitStats(baseUnitInput({
    prefix: 'a', version: 'com2_1.05.11',
    modernAttacks: { ranged: { strength: 4, type: 'missile' } },
    rangedCheck: true, rangedDist: 4,
  }));
  const distanceEntry = rangedDistanceTraceUnit.modifierTraces.toHitRanged.entries
    .find(t => t.id === 'chance:distancePenalty');
  assertEqual(distanceEntry.from, 30,
    'Range trace starts from the current percentage-point value');
  assertEqual(distanceEntry.to, 20,
    'CoM2 range four applies a ten-percentage-point trace penalty');
  assertEqual(rangedDistanceTraceUnit.modifierTraces.toHitRanged.result, 20,
    'Distance-enabled ranged derivation completes at the displayed percentage');

  const lowBlockZombies = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', toBlkMod: -20,
    identity: ctx.createCustomUnitIdentity('com_6.08', { specialUnit: 'zombies' }),
  }));
  assertClose(lowBlockZombies.toBlock, 0.1,
    'Negative base To Block plus Zombies retains the production ten-percent floor');
  assertEqual(lowBlockZombies.modifierTraces.toBlock.result, 10,
    'To Block trace uses the same initial ten-percent floor');
  assertEqual(lowBlockZombies.modifierTraces.toBlock.entries.slice(-1)[0].id, 'chance:dosClamp',
    'The initial To Block clamp records the floor when it changes the running value');

  const cappedPlague = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', hitChance: -20,
    abilities: { plague: true },
  }));
  const cappedSources = cappedPlague.modifierTraces.toHitMelee.entries.map(t => t.id);
  assert(cappedSources.includes('chance:plague'),
    'Active Plague writes the signed common chance before the region-e floor');
  assert(cappedSources.indexOf('chance:plague') < cappedSources.indexOf('chance:modernClampCommon'),
    'Plague precedes the modern common-Hit clamp in the projected trace');
  assertEqual(cappedPlague.modifierTraces.toHitMelee.result, 10,
    'The later region-e clamp restores the displayed To Hit floor');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const twoStage = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 1, rtbType: 'missile',
      modernAttacks: { ranged: { strength: 1, type: 'missile' } },
      hitChance: -50, hitRanged: 10, hitThrown: 10, hitBreath: 10, toBlkMod: -40,
    }));
    assertClose(twoStage.toHitMelee, 0.1,
      `${version}: common Hit is clamped to ten percent before channel modifiers`);
    assertClose(twoStage.toHitRtb, 0.2,
      `${version}: the positive ranged channel survives the earlier common-Hit clamp`);
    assertClose(twoStage.toBlock, 0,
      `${version}: modern To Defend is carried on the record without a ten-percent clamp`);
    const signedBlockWrites = twoStage.statTrace.filter(t => t.changes.toBlk);
    assertEqual(signedBlockWrites[signedBlockWrites.length - 1].changes.toBlk.to, -10,
      `${version}: the authoritative modern To Defend record retains its signed value`);
    assertEqual(twoStage.modifierTraces.toBlock.entries.slice(-1)[0].id,
      'chance:toBlockProbabilityBound',
      `${version}: only the DefenseRoll probability projection bounds signed To Defend`);
    const orderedClamp = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 1, rtbType: 'missile',
      modernAttacks: { ranged: { strength: 1, type: 'missile' } },
      hitChance: -50, hitRanged: 150, hitThrown: 150, hitBreath: 150,
    }));
    const commonClamp = orderedClamp.statTrace.findIndex(t => t.id === 'modernClampCommon');
    const channelClamp = orderedClamp.statTrace.findIndex(t => t.id === 'clamp');
    assert(commonClamp >= 0 && commonClamp < channelClamp,
      `${version}: the ordered record clamps common Hit before attack-channel Hit`);
  }

  const recoveringBlock = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', toBlkMod: -40,
    abilities: {
      outlanderWizard: true, mechanical: true, heatPowerEngine: true,
      magitekEngineering: true, radio: true,
    },
  }));
  assertClose(recoveringBlock.toBlock, 0.2,
    'Warlord phase-b To Defend bonuses recover from the signed base record without an intermediate floor');
  const recoveringBlockIds = recoveringBlock.statTrace.filter(t => t.changes.toBlk).map(t => t.id);
  assert(recoveringBlockIds.indexOf('magitekEngine') < recoveringBlockIds.indexOf('outlanderRadio'),
    'Warlord To Defend writes retain UnitCalcPre source order');

  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const highDos = ctx.deriveUnitStats(baseUnitInput({
      version, toHitMod: 70, abilities: { lucky: true },
    }));
    assertClose(highDos.toHitMelee, 1,
      `${version}: DOS terminal normalization clamps the effective common-plus-melee threshold`);
    const lowDos = ctx.deriveUnitStats(baseUnitInput({
      version, toHitMod: -20, warpReality: true,
    }));
    assertClose(lowDos.toHitMelee, 0.1,
      `${version}: DOS terminal normalization preserves the effective ten-percent floor after common penalties`);
  }

  const tracedDestiny = ctx.deriveUnitStats(baseUnitInput({
    abilities: { destiny: true },
    level: 'champion',
    rtbType: 'missile',
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    atk: 3, rtb: 2, def: 1, res: 4, hp: 2,
  }));
  const destinyWrites = [
    ['melee', 3, 6],
    ['sharedAttack', 2, 4],
    ['defense', 1, 5],
    ['resistance', 4, 8],
    ['hits', 2, 4],
  ];
  for (const [field, from, to] of destinyWrites) {
    const trace = tracedDestiny.modifierTraces[field];
    const writes = traceWrites(trace);
    assertEqual(trace.base, from, `Destiny ${field} trace starts at the editable value`);
    assertEqual(writes.length, 1, `Destiny ${field} is one independently attributed write`);
    assertEqual(writes[0].source.id, 'destiny', `Destiny owns the ${field} write`);
    assertEqual(writes[0].source.label, 'Destiny', `Destiny labels the ${field} source`);
    assertEqual(writes[0].from, from, `Destiny ${field} records its running before value`);
    assertEqual(writes[0].to, to, `Destiny ${field} records its running after value`);
    assertEqual(trace.result, to, `Destiny ${field} trace reaches the derived result`);
  }

  // Each of these three creates an attack on a unit whose record states none. The record they
  // create it on is the modern one, so the write is attributed to the channel it names rather
  // than to the card's shared projection.
  const permanentSourceCases = [
    [
      'Chaos Channels', 'chaosChannels:fireBreath', 'fireBreath',
      baseUnitInput({ version: 'com2_1.05.11', abilities: { ccFireBreath: true } }), 0, 4,
    ],
    [
      'Lightning Blade', 'lightningBlade:breath', 'lightningBreath',
      baseUnitInput({ version: 'com2_warlord_1.5.12.9', abilities: { lightningBlade: true } }), 0, 1,
    ],
    [
      'Focus Magic', 'focusMagic', 'ranged',
      baseUnitInput({ version: 'com2_1.05.11', abilities: { focusMagic: true } }), 0, 3,
    ],
  ];
  for (const [label, sourceId, channel, input, from, to] of permanentSourceCases) {
    const trace = ctx.deriveUnitStats(input).modifierTraces.modernAttacks[channel];
    const [first] = traceWrites(trace);
    assertEqual(first.source.id, sourceId, `${label} owns its ordered ${channel} write`);
    assertEqual(first.from, from, `${label} records the editable running value`);
    assertEqual(first.to, to, `${label} records the ordered running value`);
  }

  const destinyAfterPermanent = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', race: 'Goblin',
    atk: 3, rtb: 2, rtbType: 'missile',
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    abilities: { motherFungus: true, destiny: true },
  }));
  assertEqual(destinyAfterPermanent.atk, 10,
    'Destiny doubles melee after the permanent Mother Fungus write');
  assertEqual(destinyAfterPermanent.rtb, 8,
    'Destiny doubles ranged after the permanent Mother Fungus write');
  // Destiny makes two writes at two positions: `buffs:destiny`, the permanent `B.race` /
  // `B.Fantastic` transformation, and `c:destiny`, the calculated-record package these checks
  // are about. `phase:id` is what tells them apart (`SPEC.md`, *The step model*).
  const destinyOrderedIds = destinyAfterPermanent.statTrace
    .map(entry => `${entry.phase}:${entry.id}`);
  assert(destinyOrderedIds.indexOf('training:motherFungus') < destinyOrderedIds.indexOf('c:destiny'),
    'Destiny follows every permanent-record write in the ordered trace');

  const destinyAfterEarlyHook = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 3, rtb: 2, rtbType: 'missile',
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    abilities: { luckyStar: true, destiny: true },
  }));
  assertEqual(destinyAfterEarlyHook.atk, 8,
    'Destiny doubles the phase-b Lucky Star melee write at its compiled position');
  assertEqual(destinyAfterEarlyHook.rtb, 6,
    'Destiny doubles the phase-b Lucky Star ranged write at its compiled position');
  const earlyHookIds = destinyAfterEarlyHook.statTrace.map(entry => `${entry.phase}:${entry.id}`);
  assert(earlyHookIds.indexOf('b:luckyStar') < earlyHookIds.indexOf('c:destiny'),
    'Destiny follows UnitCalcPre and precedes later phase-c transforms');

  const destinyChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, abilities: { ccFireBreath: true, destiny: true },
    modernAttacks: {},
  }));
  assertEqual(destinyChannels.modernAttacks.fireBreath.strength, 8,
    'Destiny doubles the earlier region-a Chaos Channels Fire Breath write');
  const destinyFireIds = destinyChannels.modernAttacks.fireBreath.modifierTrace.entries
    .map(entry => entry.id);
  assert(destinyFireIds.indexOf('chaosChannels:fireBreath')
      < destinyFireIds.indexOf('destiny'),
  'Chaos Channels Fire Breath precedes Destiny in the modern channel trace');

  const focusCreatedAfterLevel = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', level: 'champion', abilities: { focusMagic: true },
  }));
  assertEqual(focusCreatedAfterLevel.rtb, 3,
    'Focus Magic creates ranged strength after the level ladder, so the new slot gets no level bonus');
  assertEqual(traceWrites(focusCreatedAfterLevel.modifierTraces.sharedAttack)[0].phase, 'c',
    'Focus Magic creation is a region-c trace event');

  const baseModernThrown = { thrown: { strength: 2, type: 'thrown' } };
  const leveledThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', level: 'champion', rtb: 2, rtbType: 'thrown',
    modernAttacks: baseModernThrown,
  }));
  const focusedThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', level: 'champion', rtb: 2, rtbType: 'thrown',
    abilities: { focusMagic: true }, modernAttacks: baseModernThrown,
  }));
  assertEqual(focusedThrown.modernAttacks.ranged.strength,
    leveledThrown.modernAttacks.thrown.strength,
    'Focus Magic converts the live post-level Thrown strength without reapplying the level bonus');
  assertEqual(focusedThrown.modernAttacks.ranged.type, 'magic',
    'Focus Magic conversion changes the ordered channel type to magical ranged');
  assertEqual(focusedThrown.modernAttacks.thrown, undefined,
    'Focus Magic consumes the original Thrown channel');

  const focusedBreath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { focusMagic: true },
    modernAttacks: { fireBreath: { strength: 2, type: 'fire' } },
  }));
  assertEqual(focusedBreath.modernAttacks.fireBreath.strength, 5,
    'Focus Magic adds three to an existing Fire Breath');
  assertEqual(focusedBreath.modernAttacks.ranged.strength, 3,
    'Focus Magic also executes its independent empty-ranged creation branch beside a Breath');

  const focusedGaze = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { focusMagic: true, doomGaze: 4 },
    modernAttacks: {},
  }));
  assertEqual(focusedGaze.effectiveDoomGaze, 7,
    'Focus Magic adds three to independent Doom Gaze damage');
  assertEqual(focusedGaze.modernAttacks.ranged.strength, 3,
    'Focus Magic executes its independent empty-ranged creation branch beside a Gaze');

  // `if U.doomgaze > 0 then Inc(U.doomgaze, 3)` (Units.RecalculateUnits.pas:876-877) is one
  // positive-strength test on the Doom Gaze field and reads nothing else, so a magical-ranged
  // unit with no Doom Gaze takes no Doom Gaze write at all. The region-`e` clamp discards a
  // stray one, which is why the ledger rather than the total is where this is observable.
  const focusedNoGaze = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { focusMagic: true },
    rtbType: 'magic', rtb: 4,
    modernAttacks: { ranged: { strength: 4, type: 'magic' } },
  }));
  const focusedNoGazeEvent = focusedNoGaze.statTrace.find(entry => entry.id === 'focusMagic');
  assert(focusedNoGazeEvent && !focusedNoGazeEvent.changes.doomGaze,
    'Focus Magic records no Doom Gaze write on a unit whose Doom Gaze field is empty');

  const focusedBombs = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 3,
    abilities: { outlanderWizard: true, explosive: true, focusMagic: true },
    modernAttacks: {},
  }));
  assertEqual(focusedBombs.modernAttacks.ranged.strength, 7,
    'Focus Magic converts the live phase-b Bombs & Grenades Thrown strength');
  assertEqual(focusedBombs.modernAttacks.ranged.type, 'magic',
    'Focus Magic converts phase-b-created Thrown to magical ranged');
  assertEqual(focusedBombs.modernAttacks.thrown, undefined,
    'Focus Magic consumes the phase-b-created Thrown channel');
  const focusedBombIds = focusedBombs.modernAttacks.ranged.statTrace.map(entry => entry.id);
  assert(focusedBombIds.indexOf('bombsGrenades')
      < focusedBombIds.indexOf('focusMagic'),
  'The atomic modern-channel trace records phase-b creation before phase-c conversion');

  const focusedBombsAndBreath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 3,
    abilities: { outlanderWizard: true, explosive: true, focusMagic: true },
    modernAttacks: { fireBreath: { strength: 2, type: 'fire' } },
  }));
  assertEqual(focusedBombsAndBreath.modernAttacks.ranged.strength, 7,
    'Bombs & Grenades creates convertible Thrown beside an existing Breath');
  assertEqual(focusedBombsAndBreath.modernAttacks.fireBreath.strength, 5,
    'Focus Magic independently boosts Breath while converting Bombs & Grenades Thrown');

  const typeOnlyFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { focusMagic: true },
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  const typeOnlyFocusEvent = typeOnlyFocus.modernAttacks.ranged.statTrace
    .find(entry => entry.id === 'focusMagic');
  assert(typeOnlyFocusEvent && typeOnlyFocusEvent.phase === 'c'
      && typeOnlyFocusEvent.changes.rangedTypeRanged,
  'A strength-preserving Focus type conversion remains visible as a phase-c channel event');

  const tracedVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    abilities: { vampirism: true },
    atk: 3, rtb: 5, rtbType: 'thrown',
    modernAttacks: { thrown: { strength: 5, type: 'thrown' } },
  }));
  for (const [field, from, to] of [['melee', 3, 5], ['sharedAttack', 5, 1]]) {
    const entry = traceWrites(tracedVampirism.modifierTraces[field])[0];
    assertEqual(entry.source.id, 'vampirism:transfer', `Vampirism owns its ${field} transfer`);
    assertEqual(entry.from, from, `Vampirism ${field} records its running before value`);
    assertEqual(entry.to, to, `Vampirism ${field} records its running after value`);
  }

  const simultaneousVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    abilities: { vampirism: true },
    atk: 3, rtb: 1, rtbType: 'thrown',
    modernAttacks: {
      thrown: { strength: 1, type: 'thrown' },
      fireBreath: { strength: 1, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));
  assertEqual(simultaneousVampirism.atk, 4,
    'Vampirism truncates the combined three-channel half after aggregation');
  for (const key of ['thrown', 'fireBreath', 'lightningBreath']) {
    assertEqual(simultaneousVampirism.modernAttacks[key].strength, 1,
      `Vampirism retains positive ${key} at strength 1`);
  }

  const orderedVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    abilities: { colossalStrength: true, vampirism: true, shadowStrike: true },
    atk: 4, rtb: 3, rtbType: 'thrown',
    modernAttacks: {
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));
  assertEqual(orderedVampirism.atk, 11,
    'Vampirism aggregates source strengths after Colossal Strength');
  assertEqual(orderedVampirism.modernAttacks.thrown.strength, 5,
    'Shadow Strike adds to Thrown after Vampirism resets it to 1');
  assertEqual(orderedVampirism.modernAttacks.fireBreath.strength, 1,
    'Vampirism independently resets positive Fire Breath');
  assertEqual(orderedVampirism.modernAttacks.lightningBreath.strength, 1,
    'Vampirism independently resets positive Lightning Breath');
  const vampirismMeleeEntry = orderedVampirism.modifierTraces.melee.entries
    .find(entry => entry.source.id === 'vampirism:transfer');
  assert(vampirismMeleeEntry && vampirismMeleeEntry.phase === 'd'
      && vampirismMeleeEntry.from === 6 && vampirismMeleeEntry.to === 11,
  'Vampirism records one coordinated region-d melee transfer');
  const thrownOrder = orderedVampirism.modernAttacks.thrown.modifierTrace.entries
    .map(entry => entry.source.id);
  assert(thrownOrder.indexOf('colossalStrength') < thrownOrder.indexOf('vampirism:transfer')
      && thrownOrder.indexOf('vampirism:transfer') < thrownOrder.indexOf('shadowStrike:thrown'),
  'Thrown trace orders Colossal Strength, Vampirism reset, then Shadow Strike');

  const focusedCoexistingVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 3, rtb: 4, rtbType: 'missile',
    abilities: { focusMagic: true, vampirism: true },
    modernAttacks: {
      ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 2, type: 'fire' },
      lightningBreath: { strength: 2, type: 'lightning' },
    },
  }));
  assertEqual(focusedCoexistingVampirism.atk, 9,
    'Vampirism reads Focus-boosted Breaths and the coexisting unconverted Thrown channel');
  assertEqual(focusedCoexistingVampirism.modernAttacks.ranged.strength, 4,
    'Vampirism does not consume or reset conventional ranged beside its three sources');
  assertEqual(focusedCoexistingVampirism.modernAttacks.ranged.type, 'magic',
    'Focus Magic owns conventional ranged when ranged and Thrown coexist');
  for (const key of ['thrown', 'fireBreath', 'lightningBreath']) {
    assertEqual(focusedCoexistingVampirism.modernAttacks[key].strength, 1,
      `Vampirism resets Focus interaction source ${key} independently`);
  }
  assert(!focusedCoexistingVampirism.modifierTraces.modernAttacks.ranged.entries
    .some(entry => entry.source.id === 'vampirism:transfer'),
  'Conventional ranged strength trace does not claim a Vampirism write');
  assert(!Object.keys(focusedCoexistingVampirism)
    .some(key => key.includes('vampirismSource')),
  'Vampirism probe fields do not leak into the public derived result');

  const createdVampirismSources = [
    ['Bombs & Grenades', { outlanderWizard: true, explosive: true }, {}, 6, 'thrown'],
    ['Chaos Channels', { ccFireBreath: true }, {}, 5, 'fireBreath'],
    ['Lightning Blade', { lightningBlade: true },
      { thrown: { strength: 4, type: 'thrown' } }, 5, 'lightningBreath'],
  ];
  for (const [label, sourceAbilities, modernAttacks, expectedMelee, outputKey]
    of createdVampirismSources) {
    const created = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.9', atk: 3,
      rtb: outputKey === 'lightningBreath' ? 4 : 0,
      rtbType: outputKey === 'lightningBreath' ? 'thrown' : 'none',
      abilities: { vampirism: true, ...sourceAbilities }, modernAttacks,
    }));
    assertEqual(created.atk, expectedMelee,
      `Vampirism includes the ${label} source at its region-d read`);
    assertEqual(created.modernAttacks[outputKey].strength, 1,
      `Vampirism resets the ${label} source independently`);
  }

  for (const otherVersion of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11']) {
    const inert = ctx.deriveUnitStats(baseUnitInput({
      version: otherVersion, atk: 3, rtb: 3, rtbType: 'thrown',
      abilities: { vampirism: true },
      modernAttacks: otherVersion.startsWith('com2')
        ? { thrown: { strength: 3, type: 'thrown' } } : undefined,
    }));
    assertEqual(inert.atk, 3, `Vampirism transfer is inert in ${otherVersion}`);
    assertEqual(inert.rtb, 3, `Vampirism reset is inert in ${otherVersion}`);
  }

  const shadowStrikeGrant = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9',
    abilities: { shadowStrike: true },
    atk: 6, rtb: 0, rtbType: 'none',
    modernAttacks: {},
  }));
  const grantedThrown = shadowStrikeGrant.modernAttacks.thrown;
  assertEqual(grantedThrown.baseStrength, 0,
    'Shadow Strike-created modern Thrown retains its editable zero base');
  assertEqual(grantedThrown.modifierTrace.base, 0,
    'Shadow Strike-created modern Thrown trace starts from zero');
  const grantedThrownWrites = traceWrites(grantedThrown.modifierTrace);
  assertEqual(grantedThrownWrites.length, 1,
    'Shadow Strike-created modern Thrown has one applied grant entry');
  assertEqual(grantedThrownWrites[0].source.id, 'shadowStrike:thrown',
    'Shadow Strike owns the created modern Thrown grant');
  assertEqual(grantedThrownWrites[0].source.label, 'Shadow Strike',
    'Created modern Thrown identifies Shadow Strike to presentation');
  assertEqual(grantedThrownWrites[0].from, 0,
    'Shadow Strike grant records zero as its running before value');
  assertEqual(grantedThrownWrites[0].to, 3,
    'Shadow Strike grant records the created strength as its running after value');
  assertEqual(grantedThrown.modifierTrace.result, grantedThrown.strength,
    'Shadow Strike-created modern Thrown trace reaches channel strength');

  const colossalShadow = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 9,
    abilities: { colossalStrength: true, shadowStrike: true }, modernAttacks: {},
  }));
  assertEqual(colossalShadow.atk, 13,
    'Colossal Strength raises melee before Shadow Strike reads it');
  assertEqual(colossalShadow.modernAttacks.thrown.strength, 5,
    'Shadow Strike derives Thrown from the live post-Colossal melee strength');
  const colossalShadowIds = colossalShadow.modernAttacks.thrown.modifierTrace.entries
    .map(entry => entry.id);
  assert(colossalShadowIds.indexOf('colossalStrength')
      < colossalShadowIds.indexOf('shadowStrike:thrown'),
  'Shadow Strike follows Colossal Strength in the phase-d channel trace');

  const focusAndShadow = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 9, rtb: 4, rtbType: 'thrown',
    abilities: { focusMagic: true, shadowStrike: true },
    modernAttacks: { thrown: { strength: 4, type: 'thrown' } },
  }));
  assertEqual(focusAndShadow.modernAttacks.ranged.strength, 4,
    'Focus Magic converts the original Thrown channel at its live strength');
  assertEqual(focusAndShadow.modernAttacks.ranged.type, 'magic',
    'The converted original channel is magical ranged');
  assertEqual(focusAndShadow.modernAttacks.thrown.strength, 4,
    'Later Shadow Strike recreates an independent Thrown channel');

  for (const key of ['ranged', 'thrown', 'fireBreath', 'lightningBreath']) {
    const channel = traced.modernAttacks[key];
    assert(channel && channel.modifierTrace,
      `Modern ${key} keeps its independent strength trace`);
    assertEqual(channel.modifierTrace.base, channel.baseStrength,
      `Modern ${key} trace starts at that channel's own editable base`);
    assertEqual(channel.modifierTrace.result, channel.strength,
      `Modern ${key} trace finishes at that channel's own result`);
  }

  const inert = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    atk: 4,
    abilities: { highPrayer: false, warpAttack: false, holyBonus: 0 },
  }));
  const inertSources = inert.modifierTraces.melee.entries.map(entry => entry.source.id);
  assert(!inertSources.includes('highPrayer') && !inertSources.includes('warpAttack')
      && !inertSources.includes('holyBonus'),
    'Inactive and zero-valued inputs are omitted instead of producing no-op trace entries');
}

// Channel attribution on the trace layer (F87). A modern record keeps its attack channels in
// separate fields, so a recorded write says which channel it reached, and one walk can answer
// for all four. The expected channel sets below come from the sources each step cites — what
// the engine writes — not from the step's own code.
function runChannelAttributionChecks(ctx) {
  const projectTraceToChannel = ctx.projectTraceToChannel;
  const assertStatTraceOrder = ctx.assertStatTraceOrder;

  // One Warlord unit carrying all four channels, with three To Hit writers whose channel sets
  // differ: Heavenly Light Ranged and Thrown, True Sight Ranged alone, Hurricane all four.
  const multiChannel = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 6, rtb: 5, rtbType: 'missile', hp: 10,
    abilities: { heavenlyLight: true, trueSight: true },
    hurricane: true,
    modernAttacks: {
      ranged: { strength: 5, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 3, type: 'fire' },
      lightningBreath: { strength: 2, type: 'lightning' },
    },
  }));
  // The one walk, before any channel projection: F80 stage C derives every channel from it.
  const walk = multiChannel.statTrace;
  const eventOf = id => walk.find(entry => entry.id === id);

  // Units.RecalculateUnits.pas:1451-1454 writes hitchanceranged and hitchancethrown; breath is
  // untouched.
  const heavenlyLight = eventOf('heavenlyLight');
  assert(!!heavenlyLight, 'Heavenly Light records a To Hit write on the multi-channel unit');
  assertSameKeyList(heavenlyLight.channels, ['ranged', 'thrown'],
    'Heavenly Light attributes its To Hit write to Ranged and Thrown');
  assert(!Object.prototype.hasOwnProperty.call(heavenlyLight.changes, 'toHitBreath'),
    'Heavenly Light leaves the Breath To Hit field alone');

  // UnitCalc.CAS!NOTZEAL!+3..+5 "IF (GETENCHANTMENTFLAG(U,EncTrueSight,0)>0) THEN {" "}" writes SToRanged alone. Keyed `phase:id`, because True Sight makes two
  // writes at two positions: `c:trueSight` sets Illusion Immunity in every engine and this
  // Warlord-only `d:trueSight` is the To Hit half (F201).
  const trueSight = walk.find(entry => entry.id === 'trueSight' && entry.phase === 'd');
  assert(!!trueSight, 'True Sight records a To Hit write on the multi-channel unit');
  assertSameKeyList(trueSight.channels, ['ranged'],
    'True Sight attributes its To Hit write to Ranged alone');

  // UnitCalc.CAS!NOAETHERSURGE!+3 "IF (HASCOMBATGLOBAL(W,CGHurricane,1)=0)", UnitCalc.CAS!NOAETHERSURGE!+14..+16 "SETSTAT(U,SToBreath,0,( GetStat(U,SToBreath,0) - 15*(HURRICANESTR) ) );" "SETSTAT(U,SToRanged,0,( GetStat(U,SToRanged,0) - 10*(HURRICANESTR) ) );" writes -20 Ranged, -20 Thrown and -30 Breath, and the one breath
  // modifier serves both breath strength fields (Units.RecalculateUnits.pas:203-219).
  const hurricane = eventOf('hurricane');
  assert(!!hurricane, 'Hurricane records a To Hit write on the multi-channel unit');
  assertSameKeyList(hurricane.channels, ['ranged', 'thrown', 'fireBreath', 'lightningBreath'],
    'Hurricane attributes its To Hit write to every channel');
  assertEqual(hurricane.changes.toHitRanged.delta, -20, 'Hurricane takes 20 points off Ranged');
  assertEqual(hurricane.changes.toHitThrown.delta, -20, 'Hurricane takes 20 points off Thrown');
  assertEqual(hurricane.changes.toHitBreath.delta, -30, 'Hurricane takes 30 points off Breath');

  // Reconstructing one channel's view of that single walk.
  const projections = {};
  for (const channel of ['ranged', 'thrown', 'fireBreath', 'lightningBreath']) {
    projections[channel] = projectTraceToChannel(walk, channel);
    assertStatTraceOrder(projections[channel]);
    assert(projections[channel].every(entry =>
      !entry.channels || entry.channels.includes(channel)),
    `The ${channel} reconstruction carries no other channel's write`);
  }

  const idsIn = trace => trace.map(entry => entry.id);
  // Keyed `phase:id` where an effect writes at two positions: `c:trueSight` sets Illusion
  // Immunity in every engine and is channel-agnostic, so every reconstruction keeps it, while
  // `d:trueSight` is the Warlord Ranged-only To Hit write these assertions are about (F201).
  const keysIn = trace => trace.map(entry => `${entry.phase}:${entry.id}`);
  const fieldsIn = (trace, id) => {
    const entry = trace.find(item => item.id === id);
    return entry ? Object.keys(entry.changes) : [];
  };
  // Heavenly Light writes melee and the Ranged/Thrown secondaries in one step, so what a
  // reconstruction drops is the *fields* that belong to other channels, not the whole entry:
  // the melee half belongs to every channel's view, exactly as a common To Hit write does.
  assert(!keysIn(projections.fireBreath).includes('d:trueSight'),
    'A Breath reconstruction drops the Ranged-only To Hit write');
  assertSameKeyList(fieldsIn(projections.fireBreath, 'heavenlyLight'),
    ['def', 'res', 'atk', 'toHitMelee'],
    'A Breath reconstruction keeps only the channel-agnostic half of a Ranged/Thrown write');
  assert(idsIn(projections.thrown).includes('heavenlyLight')
      && !keysIn(projections.thrown).includes('d:trueSight'),
  'A Thrown reconstruction keeps Heavenly Light and drops True Sight');
  assertSameKeyList(fieldsIn(projections.thrown, 'heavenlyLight'),
    ['def', 'res', 'atk', 'toHitMelee', 'toHitThrown'],
    'A Thrown reconstruction keeps only the Thrown half of a two-channel write');
  assertSameKeyList(
    Object.keys(projections.fireBreath.find(entry => entry.id === 'hurricane').changes),
    ['toHitBreath'],
    'A Breath reconstruction keeps only the Breath half of a four-channel write');

  // Fire and Lightning Breath share the one To Hit modifier, so their reconstructions agree.
  assertSameKeyList(idsIn(projections.fireBreath), idsIn(projections.lightningBreath),
    'The two Breath channels reconstruct the same To Hit writes');

  // Nothing channel-agnostic is lost: a def or res write belongs to every channel. The reverse
  // does not hold — a write that reached only other channels' strength fields is stripped to its
  // agnostic remainder, which is why this is containment rather than set equality.
  const agnosticIds = idsIn(walk.filter(entry => !entry.channels));
  for (const channel of Object.keys(projections)) {
    const projectedIds = idsIn(projections[channel]);
    assert(agnosticIds.every(id => projectedIds.includes(id)),
      `The ${channel} reconstruction keeps every channel-agnostic write`);
  }

  let unknownChannel = null;
  try { projectTraceToChannel(walk, 'breath'); } catch (err) { unknownChannel = err.message; }
  assert(unknownChannel && unknownChannel.includes('unknown attack channel'),
    'A reconstruction cannot be asked for a channel the record has no field for');

  // The complete ledger attributes from the declaration, so a predicate-skipped step still says
  // which channel it would have reached — what a per-channel execution ledger is rebuilt from.
  const withoutTrueSight = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 6, rtb: 5, rtbType: 'missile', hp: 10,
    hurricane: true,
    modernAttacks: { ranged: { strength: 5, type: 'missile' } },
  }));
  const skippedTrueSight = withoutTrueSight.statExecutionTrace
    .find(event => event.id === 'trueSight' && event.phase === 'd');
  assert(!!skippedTrueSight && skippedTrueSight.status === 'skipped',
    'The ledger still visits True Sight when its predicate is false');
  assertSameKeyList(skippedTrueSight.channels, ['ranged'],
    'A predicate-skipped step keeps the channel its declaration targets');

  // The same reconstruction runs over the complete ledger, where an event carries attribution
  // but no changes and is therefore kept or dropped whole.
  const ledger = multiChannel.statExecutionTrace;
  const breathLedger = projectTraceToChannel(ledger, 'fireBreath');
  const breathLedgerIds = breathLedger.map(event => `${event.phase}:${event.id}`);
  assert(!breathLedgerIds.includes('d:trueSight')
      && breathLedgerIds.includes('d:hurricane')
      && breathLedgerIds.includes('c:heavenlyLight'),
  'A Breath ledger reconstruction drops the steps whose declaration excludes Breath, and keeps '
  + 'one whose declaration reaches Breath-agnostic fields');
  // Compared over the events themselves, not by id: three steps share the id `spiritLink` at
  // three positions (`buffs:`, `b:` and `d:`), so a lookup by id alone answers for the wrong one.
  assertSameKeyList(
    breathLedger.filter(event => !event.channels).map(event => `${event.phase}:${event.id}`),
    ledger.filter(event => !event.channels).map(event => `${event.phase}:${event.id}`),
    'A ledger reconstruction keeps every channel-agnostic step');
  assert(breathLedger.every((event, index) => event.traceOrder === index),
    'A ledger reconstruction is renumbered over its survivors');

  // Attribution is only as complete as `writes:`, so the existing write check is what keeps a
  // step from reaching a channel field its declaration does not name.
  let undeclaredChannel = null;
  try {
    ctx.runStatSteps([{
      id: 'leak', phase: 'c', writes: ['toHitRanged'],
      apply: u => { u.toHitRanged += 5; u.toHitThrown += 5; },
    }], { toHitRanged: 0, toHitThrown: 0 }, { trace: [], validateWrites: true });
  } catch (err) {
    undeclaredChannel = err.message;
  }
  assert(undeclaredChannel && undeclaredChannel.includes('undeclared field toHitThrown'),
    'A step reaching a channel field it did not declare is rejected');

  let misattributed = null;
  try {
    assertStatTraceOrder([{
      id: 'wrong', source: { id: 'wrong', label: 'wrong' }, phase: 'c', order: 0, traceOrder: 0,
      channels: ['thrown'], changes: { toHitRanged: { from: 0, to: 5, delta: 5 } },
    }]);
  } catch (err) {
    misattributed = err.message;
  }
  assert(misattributed && misattributed.includes('attributes its write to'),
    'A trace event whose attribution disagrees with its changed fields is rejected');

  runRecordFieldChecks(ctx);
}

// One walk, four strength fields (F80). These read every channel of one unit, so a write that
// landed on the wrong record field, or a To Hit gate decided by some other channel's type, shows
// up as a wrong number on a channel this derivation was not "for". The expectations come from the
// cited engine gates, not from the steps.
function runRecordFieldChecks(ctx) {
  const fourChannels = rangedType => ({
    ranged: { strength: 5, type: rangedType },
    thrown: { strength: 4, type: 'thrown' },
    fireBreath: { strength: 3, type: 'fire' },
    lightningBreath: { strength: 2, type: 'lightning' },
  });
  const probe = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 4, hp: 10, ...overrides,
  }));
  const strengths = derived => ['ranged', 'thrown', 'fireBreath', 'lightningBreath']
    .map(key => derived.modernAttacks[key].strength);
  const toHits = derived => ['ranged', 'thrown', 'fireBreath', 'lightningBreath']
    .map(key => derived.modernAttacks[key].toHit);

  // `Caster.exe` $00599EE8-$00599FA8 writes `firebreath += 4` and no other attack field.
  const chaosChannels = probe({
    abilities: { ccFireBreath: true }, rtbType: 'missile', rtb: 5,
    modernAttacks: fourChannels('missile'),
  });
  assertEqual(strengths(chaosChannels).join(','), '5,4,7,2',
    'Chaos Channels adds its Fire Breath to the Fire Breath field alone');

  // Units.RecalculateUnits.pas:1451-1454 and its strength half (:span e405a407) write the
  // conventional Ranged field; Thrown and both Breaths keep their own values.
  const goodMoon = probe({
    abilities: { goodMoon: true }, rtbType: 'missile', rtb: 5,
    modernAttacks: fourChannels('missile'),
  });
  assertEqual(strengths(goodMoon).join(','), '6,4,3,2',
    'Good Moon adds its point to the conventional Ranged field alone');

  // ApplyMagicWeapons (Units.RecalculateUnits.pas:639-662) writes `hitchanceranged` only when the
  // record's own `rangedtype` is not magical, `hitchancethrown` only while the record's Thrown
  // field is positive, and never `hitchancebreath`. Holy Weapon (:1806-1809) repeats both gates.
  // The two probes differ only in the Ranged channel's type, so the Ranged modifier cannot have
  // been decided by the Thrown channel that is present in both.
  const magicWeapon = { weapon: 'magic', abilities: { holyWeapon: true } };
  const materialOnMissile = probe({
    ...magicWeapon, rtbType: 'missile', rtb: 5, modernAttacks: fourChannels('missile'),
  });
  assertEqual(toHits(materialOnMissile).join(','), '0.5,0.5,0.3,0.3',
    'Material and Holy Weapon reach a non-magical Ranged channel and the Thrown channel');
  const materialOnMagicRanged = probe({
    ...magicWeapon, rtbType: 'magic', rtb: 5, modernAttacks: fourChannels('magic'),
  });
  assertEqual(toHits(materialOnMagicRanged).join(','), '0.3,0.5,0.3,0.3',
    'A magical Ranged channel is withheld both modifiers while Thrown still receives them');

  // Units.RecalculateUnits.pas:1451-1454: the Heavenly Light material tail writes Ranged only
  // when the current type is not magical, and Thrown unconditionally. Its strength half reads
  // the conventional Ranged field, so the +1 lands there whatever that field's type is.
  const heavenlyMissile = probe({
    abilities: { heavenlyLight: true }, rtbType: 'missile', rtb: 5,
    modernAttacks: fourChannels('missile'),
  });
  assertEqual(toHits(heavenlyMissile).join(','), '0.4,0.4,0.3,0.3',
    'Heavenly Light reaches a non-magical Ranged channel and the Thrown channel');
  assertEqual(strengths(heavenlyMissile).join(','), '6,4,3,2',
    'Heavenly Light adds its strength to the conventional Ranged field alone');
  const heavenlyMagicRanged = probe({
    abilities: { heavenlyLight: true }, rtbType: 'magic', rtb: 5,
    modernAttacks: fourChannels('magic'),
  });
  assertEqual(toHits(heavenlyMagicRanged).join(','), '0.3,0.4,0.3,0.3',
    'Heavenly Light withholds its To Hit from a magical Ranged channel but not from Thrown');
  assertEqual(strengths(heavenlyMagicRanged).join(','), '6,4,3,2',
    'Heavenly Light still writes the conventional Ranged strength when that channel is magical');
}

// --- F20: the execution chain is the source order, and the composer enforces it ---
//
// Tag: regression.  Anchor: F20.  Migrated out of `tests/f20-source-order.spec.js` by F268.4 and
// reduced there under that item's deletion default.  The spec touched no DOM — `deriveUnitStats`,
// `statChain` and `orderStatStepsBySource` are all `data-scope="core"` — so the browser bought it
// nothing, and its 56 `expect` calls became the two claims below that nothing else in the tree
// can make.  It lives beside the rest of the step machinery rather than in a file of its own, and
// keeps its own `--only source-order-f20` command through `MIGRATED_SUITES`, so folding it here
// does not fold its anchor into `node-unit-checks`' `scaffolding` claim.
//
// **Why these two and not the other fifty-four.**  F268.4 mutation-tested F268's premise that
// `composeStatSteps` already covers source order, and it does not:
//
//   * Swapping two adjacent region-c chain entries moves **no** number.  Swapping `c:lionheart`
//     with `c:ironSkin` left the whole 1,161-fixture preset corpus green — all four moments and
//     all ten damage-category moments — and the other 29,664 Node assertions with it.  The anchor
//     subsequence below was the only thing in the tree that failed.  It is an independent
//     transcription of the DOS ledgers and the CoM2 region map, so it is a second source for the
//     chain rather than the chain restated against itself.
//
// **A gap F268.4 first recorded here has been withdrawn.**  It claimed that swapping `c:level`
// with `c:destiny` is numerically meaningful and caught by nothing.  The review checked it and it
// does not reproduce: Destiny's permanent write resets the calculated level to Normal, whose
// ladder bonuses are zero, so with Destiny active the two orders give the same result and with
// Destiny absent its step never runs.  Probed at Normal, Elite and Champion, with and without
// Destiny: attack, defence, HP and ranged strength are identical under both orders.  The swap is
// inert, not uncaught.
//   * Deleting any one of the composer's four rejections is caught by nothing at all.  Every
//     derivation feeds the composer well-formed input, so its guards are exercised in the passing
//     direction only.
//
// Dropped as redundant or self-referential: the trace-shape assertions (`traceOrder === index`,
// `executionOrder === index`, `sourceOrder === chain.indexOf(key)`, strictly increasing ranks),
// which are these guards restated on their own output; the per-phase order comparison, which is
// that monotonicity again; the atomic multi-field `changes` key lists for Destiny and Rust,
// covered by the write-declaration check earlier in this file; and the sparse-projection claims.
// The F268.4 report carries the full table.

// Independent source-order anchors, carried over verbatim from the retired spec.  They come from
// the checked-in DOS ledgers and the CoM2 region map, NOT from `statChain()`, so a copied or
// misordered chain cannot make this pass by agreeing with itself.
const F20_VERSIONS = [
  'mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.9',
];

const F20_PROBE_ABILITIES = {
  lucky: true, darkForce: true, heavenlyLight: true, endurance: true, discipline: true,
  animated: true, flameBlade: true, mysticSurge: true, lionheart: true, ironSkin: true,
  stoneSkin: true, landLinking: true, ccDefense: true, blackChannels: true,
  giantStrength: true, holyArmor: true, orihalcon: true, highPrayer: true, prayer: true,
  trueLight: true, blackPrayer: true, darkness: true, warpReality: true, vertigo: true,
  weakness: true, mindStorm: true, warpAttack: true, warpDefense: true, warpResist: true,
  shatter: true, guardian: true, survivalInstinct: true, reinforceMagic: true,
  innerPower: true, blazingEyes: true, blazingMarch: true, charmOfLife: true,
  badMoon: true, goodMoon: true,
  natureConjunction: true, tactician: true, spellWard: 'life', metalFires: true,
  rebuild: true, fieryFury: true,
  nausea: true, uphillBattle: true, soulFlay: true,
  eternalNight: true, greatUnbinding: true, plague: true, goblinPox: true, luckyStar: true,
  disheartenProphecy: true, wallOfFireGarrison: true, godsPlayDices: true,
  mechanical: true, mechanicalExpert: true, trueSight: true, eyeOfHeaven: true,
  berserkWarlord: true, rust: true, hurricane: true, favoredTerrain: true,
  colossalStrength: true, vampirism: true, shadowStrike: true, psychoForce: true,
  pneumaField: true, energyBeamWeapons: true, blazeOfGlory: true, beatOfSwiftness: true,
  hierophany: true, channeler: true, militaryWorkshop: true, rocketry: true,
  insulation: true, divineProtection: true, fortification: true, venom: true,
};

// An anchor is a write the named build makes, in the order that build makes it.
const F20_SOURCE_ANCHORS = {
  'mom_1.31': {
    // True Sight is the second block of `BU_Apply_Specials` (131:0x8F338); Chaos Surge
    // (0x8F113) and 1.31's inline Holy Weapon (0x8F1A8) are ahead of the 0x8F2A2 call, and
    // Black Channels (0x8F3FA) is behind it.
    c: ['level', 'lucky', 'weapon', 'chaosSurge', 'holyWeapon', 'trueSight',
      'blackChannels', 'ironSkin', 'flameBlade', 'giantStrength',
      'chaosChannels:armor', 'lionheart', 'holyArmor',
      'berserk', 'nodeAura', 'highPrayer', 'trueLight', 'darkness',
      'warpReality', 'blackPrayer', 'vertigo', 'weakness',
      'warpAttack', 'warpDefense', 'warpResist', 'shatter'],
  },
  'mom_cp_1.60.00': {
    // CP moved Holy Weapon into the relocated `BU_Apply_Specials` tail; True Sight stays at
    // the routine's head, 0x8F338.
    c: ['level', 'lucky', 'weapon', 'chaosSurge', 'trueSight', 'blackChannels', 'ironSkin',
      'flameBlade', 'giantStrength',
      'chaosChannels:armor', 'lionheart', 'holyArmor',
      'berserk', 'holyWeapon', 'nodeAura',
      'highPrayer', 'trueLight', 'darkness', 'warpReality',
      'blackPrayer', 'vertigo', 'weakness', 'warpAttack',
      'warpDefense', 'warpResist', 'shatter'],
  },
  'com_6.08': {
    // CoM 1's BU_Apply_Specials layout: Lionheart com1:0x8F660, Iron Skin 0x8F71F, the
    // Chaos Channels armor mutation 0x8F735, Land Link 0x8F75C, then Mystic Surge's
    // stat-writing half 0x8F795, then Holy Armor 0x8F7C1.
    c: ['level', 'lucky', 'weapon', 'trueSight', 'endurance', 'animated',
      'flameBlade', 'lionheart',
      'ironSkin', 'chaosChannels:armor',
      'landLinking', 'mysticSurge',
      'holyArmor', 'focusMagic',
      'orihalcon', 'holyWeapon', 'chaosSurge',
      'survivalInstinct', 'nodeAura', 'highPrayer',
      'blazingMarch',
      'warpReality', 'blackPrayer', 'guardian',
      'heavenlyLight',
      'vertigo', 'weakness',
      'warpAttack', 'warpDefense', 'warpResist', 'shatter',
      'darkness', 'supremeLight', 'realmWard', 'tactician',
      'eternalNight:enemyResistance'],
  },
  'com2_1.05.11': {
    c: ['level', 'focusMagic', 'lucky', 'darkForce',
      'heavenlyLight',
      'weapon', 'trueSight', 'endurance', 'discipline',
      'chaosChannels:armor', 'animated', 'flameBlade',
      'mysticSurge', 'lionheart', 'ironSkin', 'landLinking',
      'holyArmor', 'orihalcon', 'holyWeapon',
      'chaosSurge', 'survivalInstinct', 'blazingEyes', 'reinforceMagic',
      'eternalNight:enemyResistance', 'charmOfLife',
      'nodeAura', 'badMoon', 'goodMoon', 'natureConjunction', 'highPrayer',
      'blazingMarch', 'warpReality', 'blackPrayer',
      'darkness', 'guardian', 'vertigo', 'weakness',
      'warpAttack', 'warpDefense', 'warpResist', 'shatter', 'spellWard', 'tactician'],
  },
  'com2_warlord_1.5.12.9': {
    b: ['marionette:stats', 'marionette:rangedType',
      'fieryFury', 'insulation', 'divineProtection', 'natureLink', 'outlanderXenoveterinary',
      'bombsGrenades', 'upgradedExplosive:ranged', 'upgradedExplosive:fireBreath',
      'outlanderBallisticsTraining', 'outlanderXenopsychology', 'outlanderRadio',
      'berserkWarlord', 'nausea', 'uphillBattle', 'soulFlay', 'eternalNight:poorVision',
      'greatUnbinding', 'prayer', 'trueLight', 'plague', 'goblinPox',
      'luckyStar', 'disheartenProphecy', 'wallOfFire:garrison', 'godsPlayDices',
      'eyeOfHeaven'],
    c: ['level', 'focusMagic', 'lucky', 'darkForce',
      'heavenlyLight',
      'weapon', 'trueSight', 'endurance', 'discipline', 'chaosChannels:armor', 'animated',
      'flameBlade', 'mysticSurge', 'lionheart',
      'ironSkin', 'landLinking',
      'holyArmor', 'orihalcon', 'holyWeapon',
      'chaosSurge', 'survivalInstinct', 'blazingEyes', 'reinforceMagic',
      'eternalNight:enemyResistance', 'charmOfLife', 'nodeAura', 'badMoon', 'goodMoon',
      'natureConjunction', 'highPrayer', 'blazingMarch',
      'warpReality', 'blackPrayer', 'darkness', 'guardian', 'vertigo',
      'weakness', 'warpAttack', 'warpDefense', 'warpResist',
      'shatter', 'spellWard', 'tactician'],
    d: ['venom', 'mechanicalExpert', 'weakness', 'trueSight',
      'flameBlade', 'rust', 'hurricane',
      'favoredTerrain', 'fortification', 'colossalStrength', 'vampirism:transfer',
      'shadowStrike:thrown',
      'psychoForce', 'pneumaField', 'energyCannonThreshold', 'blazeOfGlory',
      'beatOfSwiftness', 'hierophany'],
  },
};

const F20_WARLORD_NORMAL_ANCHORS = {
  ...F20_SOURCE_ANCHORS['com2_warlord_1.5.12.9'],
  b: F20_SOURCE_ANCHORS['com2_warlord_1.5.12.9'].b
    .filter(id => id !== 'marionette:stats' && id !== 'marionette:rangedType'),
  d: F20_SOURCE_ANCHORS['com2_warlord_1.5.12.9'].d.filter(id => id !== 'rust'),
};

const F20_WARLORD_MARIONETTE_ANCHORS = {
  ...F20_SOURCE_ANCHORS['com2_warlord_1.5.12.9'],
  d: F20_SOURCE_ANCHORS['com2_warlord_1.5.12.9'].d.filter(id => id !== 'rust'),
};

function f20Anchors(version, scenario) {
  if (version !== 'com2_warlord_1.5.12.9') return F20_SOURCE_ANCHORS[version];
  return scenario === 'marionette' ? F20_WARLORD_MARIONETTE_ANCHORS : F20_WARLORD_NORMAL_ANCHORS;
}

// The retired spec's `expectSubsequence`, as an assertion: every anchor must appear, in order,
// among the ids the run actually executed for that region.
function assertSubsequence(actual, expected, label) {
  let next = 0;
  for (const id of actual) {
    if (id === expected[next]) next += 1;
  }
  assert(next === expected.length,
    `${label}: the executed order does not contain the independent source anchors as a `
    + `subsequence - matched ${next} of ${expected.length}, stopped at `
    + `${JSON.stringify(expected[next])}; executed ${JSON.stringify(actual)}`);
}

function f20Input(ctx, version, scenario) {
  return {
    prefix: 'a',
    version,
    identity: version === 'com2_warlord_1.5.12.9' && scenario === 'marionette'
      ? ctx.createUnitIdentity({
        version, heroTypeId: 48, isHero: true, baseRace: 'High Men',
        baseFantastic: false, specialUnit: 'none',
      })
      : ctx.createCustomUnitIdentity(version, {
        baseRace: 'High Men', baseFantastic: false, specialUnit: 'chosen',
      }),
    figs: 1, atk: 5, rtb: 4, rtbType: 'missile', def: 6, res: 8, hp: 7,
    // A CoM2/Warlord record states the attack on its own channel; the DOS versions state the
    // same attack on the shared slot (`SPEC.md`, *Attack channels on the card*).
    ...(version.startsWith('com2')
      ? { modernAttacks: { ranged: { strength: 4, type: 'missile' } } } : {}),
    level: 'normal', weapon: 'normal', armor: 'normal',
    toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
    cityWalls: 'none', nodeAura: 'life', chaosSurge: 1,
    guidingBeaconAura: 2, divineBarrierAura: 2, soulLinkerAura: 2,
    // Minus any key the origin table does not place in this version: stating one is a halt since
    // F253.1, and it is not part of the version's input surface — no control offers it either, so
    // the anchors it could contribute to are not this version's.
    realmWard: 'life', abilities: abilitiesStatableIn(ctx, version, F20_PROBE_ABILITIES),
  };
}

// [F20-1] Every version's executed b/c/d order contains its independent anchors as a subsequence.
function runF20AnchorChecks(ctx) {
  for (const version of F20_VERSIONS) {
    const scenarios = version === 'com2_warlord_1.5.12.9'
      ? ['normal', 'marionette'] : ['default'];
    for (const scenario of scenarios) {
      const label = scenario === 'default' ? version : `${version}/${scenario}`;
      const executionTrace = ctx.deriveUnitStats(f20Input(ctx, version, scenario))
        .statExecutionTrace;
      assert(Array.isArray(executionTrace) && executionTrace.length > 0,
        `${label}: the derivation publishes a non-empty execution trace to read the order off`);
      for (const phase of ['b', 'c', 'd']) {
        const executed = executionTrace
          .filter(event => event.phase === phase).map(event => event.id);
        assertSubsequence(executed, f20Anchors(version, scenario)[phase] || [],
          `${label} region ${phase}`);
      }
    }
  }

  // The two Warlord identity writes the region anchors do not carry, because their positions are
  // fixed by the CAS files rather than by the region map.  Spirit Link asserts Fantastic at the
  // head of the pre-hook and clears it late in the main one, and a Channeler's Marionette
  // conversion sits one line ahead of the `marionette:stats` attack writes:
  // UnitCalcPre.CAS!NOSPIRITLINK!-11 "SETSTAT(U,AFantastic,0,1);"
  // UnitCalcPre.CAS!NOVAMPIRISM!+16 "SETSTAT(U,AFantastic,0,1);"
  // UnitCalc.CAS!NOTICEAGE!+3 "IF GETENCHANTMENTFLAG(U,EncSpiritLink,1) THEN { SETSTAT(U,AFantastic,0,0); }"
  // Base CoM2 ships HALT stubs for both hooks, so neither region may appear in its chain at all.
  const phaseIds = (chain, phase) => chain.filter(entry => entry.phase === phase)
    .map(entry => entry.id);
  const warlordChain = ctx.statChain('com2_warlord_1.5.12.9');
  const b = phaseIds(warlordChain, 'b');
  const d = phaseIds(warlordChain, 'd');
  assert(b.indexOf('spiritLink') === 0,
    'Warlord region b opens with Spirit Link\'s Fantastic assert; it is at index '
    + `${b.indexOf('spiritLink')}`);
  assert(b.indexOf('marionetteChanneler') === b.indexOf('marionette:stats') - 1,
    'The Channeler Marionette conversion sits one entry ahead of the Marionette stat writes: '
    + `${b.indexOf('marionetteChanneler')} against ${b.indexOf('marionette:stats')}`);
  assert(d.indexOf('spiritLink') > d.indexOf('shadowStrike:thrown')
    && d.indexOf('spiritLink') < d.indexOf('psychoForce'),
    'Spirit Link\'s Fantastic clear sits between Shadow Strike and Psycho Force');
  const baseChain = ctx.statChain('com2_1.05.11');
  assert(phaseIds(baseChain, 'b').length === 0 && phaseIds(baseChain, 'd').length === 0,
    'Base CoM2 ships HALT stubs for both script hooks, so its chain has no b or d entry');
}

// [F20-2] The four composer rejections.  Nothing else in the tree fails when one is removed:
// every derivation feeds the composer well-formed input, so only a deliberately malformed one
// reaches the rejecting branch.
function runF20ComposerGuardChecks(ctx) {
  const step = id => ({ id, phase: 'c', writes: ['res'], apply: unit => { unit.res += 1; } });
  const chain = (...entries) => entries.map(([phase, id, provisional = false]) =>
    ({ key: `${phase}:${id}`, phase, id, provisional }));
  const rejects = (label, callback, expected) => {
    let message = null;
    try {
      callback();
    } catch (err) {
      message = String(err.message);
    }
    assert(message !== null, `${label}: the composer accepted it instead of halting`);
    assert(message.includes(expected),
      `${label}: halted, but the message does not name the fault - wanted `
      + `${JSON.stringify(expected)}, got ${JSON.stringify(message)}`);
  };

  rejects('a step with no chain entry',
    () => ctx.orderStatStepsBySource([step('unlisted')], chain(['c', 'listed'])),
    'missing from its version\'s execution chain');
  rejects('the same step emitted twice',
    () => ctx.orderStatStepsBySource([step('same'), step('same')], chain(['c', 'same'])),
    'is represented twice');
  rejects('a step with no id',
    () => ctx.orderStatStepsBySource([{ ...step('x'), id: undefined }], chain(['c', 'x'])),
    'without an id');
  rejects('a chain authored out of region order',
    () => ctx.orderStatStepsBySource([], chain(['c', 'first'], ['b', 'second'])),
    'declared after a later phase');
}

function runSourceOrderF20Checks(ctx) {
  runF20AnchorChecks(ctx);
  runF20ComposerGuardChecks(ctx);
}

module.exports = {
  runStatStepChecks, runModifierTraceChecks, runChannelAttributionChecks,
  runSourceOrderF20Checks,
};
