// The ordered-step machinery: step construction and the modifier trace the UI reads back.

'use strict';

const { evalInContext, assert, assertEqual, assertClose, baseUnitInput } = require('./assertions');

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
    version: 'com2_warlord_1.5.12.7',
    identity: ctx.createCustomUnitIdentity('com2_warlord_1.5.12.7', {
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
    toHitMod: 5,
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
  assertEqual(chanceSources[0], 'baseToHitMelee',
    'To Hit trace starts with the editable base modifier when it is active');
  assert(chanceSources.indexOf('level') < chanceSources.indexOf('weapon'),
    'To Hit trace keeps level before weapon');
  assert(chanceSources.indexOf('weapon') < chanceSources.indexOf('lucky'),
    'To Hit trace keeps weapon before Lucky in this engine sequence');
  assert(chanceSources.indexOf('highPrayer') < chanceSources.indexOf('vertigo'),
    'Displayed To Hit trace keeps High Prayer before the later recalculation-time Vertigo write');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
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
      version, def: 6, hp: 8, armor: 'orihalcon', rtb: 2, rtbType: 'magic_n',
      abilities: {
        holyArmor: true, holyWeapon: true, highPrayer: true,
        reinforceMagic: true, charmOfLife: true, weakness: true,
      },
    })).statTrace.map(entry => entry.id);
    assert(postThresholdOrder.indexOf('holyArmor') < postThresholdOrder.indexOf('orihalcon')
        && postThresholdOrder.indexOf('orihalcon')
          < postThresholdOrder.indexOf('chance:holyWeapon:melee')
        && postThresholdOrder.indexOf('chance:holyWeapon:melee')
          < postThresholdOrder.indexOf('highPrayer'),
    `${version}: post-threshold order is Holy Armor, Orihalcon, Holy Weapon, then globals`);
    const representativeLaterIds = ['reinforceMagic:ranged', 'charmOfLife', 'weakness:ranged'];
    let previousLaterIndex = postThresholdOrder.indexOf('chance:holyWeapon:melee');
    for (const laterId of representativeLaterIds) {
      const laterIndex = postThresholdOrder.indexOf(laterId);
      assert(previousLaterIndex < laterIndex,
        `${version}: ${laterId} remains on the ordered post-Holy-Armor side`);
      previousLaterIndex = laterIndex;
    }
    const physicalLaterOrder = ctx.deriveUnitStats(baseUnitInput({
      version, def: 6, hp: 8, rtb: 2, rtbType: 'missile',
      abilities: {
        holyArmor: true, holyWeapon: true,
        charmOfLife: true, blazingMarch: true, weakness: true,
      },
    })).statTrace.map(entry => entry.id);
    assert(physicalLaterOrder.indexOf('chance:holyWeapon:melee')
        < physicalLaterOrder.indexOf('charmOfLife')
        && physicalLaterOrder.indexOf('charmOfLife')
          < physicalLaterOrder.indexOf('blazingMarch:ranged')
        && physicalLaterOrder.indexOf('blazingMarch:ranged')
          < physicalLaterOrder.indexOf('weakness:ranged'),
    `${version}: explicit global, combat-global, and curse pieces follow Holy Weapon in order`);
  }

  assertEqual(traced.modifierTraces.fantastic.entries[0].source.id, 'identity:chosen',
    'Boolean identity trace attributes the live Fantastic write');
  assertEqual(traced.modifierTraces.race.entries[0].source.id, 'identity:chosen',
    'Identity trace attributes the live race write');

  const rangedDistanceTraceUnit = ctx.deriveUnitStats(baseUnitInput({
    prefix: 'a', version: 'com2_1.05.11',
    rtb: 4, rtbType: 'missile', rangedCheck: true, rangedDist: 4,
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
  assertClose(lowBlockZombies.displayToBlock, 0.1,
    'Negative base To Block plus Zombies retains the production ten-percent floor');
  assertEqual(lowBlockZombies.modifierTraces.toBlock.result, 10,
    'To Block trace uses the same initial ten-percent floor');
  assertEqual(lowBlockZombies.modifierTraces.toBlock.entries.slice(-1)[0].id, 'chance:legacyClamp',
    'The initial To Block clamp records the floor when it changes the running value');

  const cappedPlague = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', toHitMod: -20,
    abilities: { plague: true },
  }));
  const cappedSources = cappedPlague.modifierTraces.toHitMelee.entries.map(t => t.id);
  assert(cappedSources.includes('chance:plague'),
    'Active Plague writes the signed common chance before the region-e floor');
  assert(cappedSources.indexOf('chance:plague') < cappedSources.indexOf('chance:modernClampCommon'),
    'Plague precedes the modern common-Hit clamp in the projected trace');
  assertEqual(cappedPlague.modifierTraces.toHitMelee.result, 10,
    'The later region-e clamp restores the displayed To Hit floor');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const twoStage = ctx.deriveUnitStats(baseUnitInput({
      version, rtb: 1, rtbType: 'missile',
      toHitMod: -50, toHitRtbMod: -40, toBlkMod: -40,
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
      version, rtb: 1, rtbType: 'missile', toHitMod: -50, toHitRtbMod: 100,
    }));
    const commonClamp = orderedClamp.statTrace.findIndex(t => t.id === 'chance:modernClampCommon');
    const channelClamp = orderedClamp.statTrace.findIndex(t => t.id === 'chance:clamp');
    assert(commonClamp >= 0 && commonClamp < channelClamp,
      `${version}: the ordered record clamps common Hit before attack-channel Hit`);
  }

  const recoveringBlock = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', toBlkMod: -40,
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
    const highLegacy = ctx.deriveUnitStats(baseUnitInput({
      version, toHitMod: 70, abilities: { lucky: true },
    }));
    assertClose(highLegacy.toHitMelee, 1,
      `${version}: legacy terminal normalization clamps the effective common-plus-melee threshold`);
    const lowLegacy = ctx.deriveUnitStats(baseUnitInput({
      version, toHitMod: -20, warpReality: true,
    }));
    assertClose(lowLegacy.toHitMelee, 0.1,
      `${version}: legacy terminal normalization preserves the effective ten-percent floor after common penalties`);
  }

  const tracedDestiny = ctx.deriveUnitStats(baseUnitInput({
    abilities: { destiny: true },
    level: 'champion',
    rtbType: 'missile',
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
    assertEqual(trace.base, from, `Destiny ${field} trace starts at the editable value`);
    assertEqual(trace.entries.length, 1, `Destiny ${field} is one independently attributed write`);
    assertEqual(trace.entries[0].source.id, 'destiny', `Destiny owns the ${field} write`);
    assertEqual(trace.entries[0].source.label, 'Destiny', `Destiny labels the ${field} source`);
    assertEqual(trace.entries[0].from, from, `Destiny ${field} records its running before value`);
    assertEqual(trace.entries[0].to, to, `Destiny ${field} records its running after value`);
    assertEqual(trace.result, to, `Destiny ${field} trace reaches the derived result`);
  }

  const permanentSourceCases = [
    [
      'Chaos Channels', 'chaosChannels:fireBreath',
      baseUnitInput({ version: 'com2_1.05.11', abilities: { ccFireBreath: true } }), 0, 4,
    ],
    [
      'Lightning Blade', 'lightningBlade:breath',
      baseUnitInput({ version: 'com2_warlord_1.5.12.7', abilities: { lightningBlade: true } }), 0, 1,
    ],
    [
      'Focus Magic', 'focusMagic:conversion',
      baseUnitInput({ version: 'com2_1.05.11', abilities: { focusMagic: true } }), 0, 3,
    ],
  ];
  for (const [label, sourceId, input, from, to] of permanentSourceCases) {
    const trace = ctx.deriveUnitStats(input).modifierTraces.sharedAttack;
    assertEqual(trace.entries[0].source.id, sourceId, `${label} owns its ordered shared-attack write`);
    assertEqual(trace.entries[0].from, from, `${label} records the editable running value`);
    assertEqual(trace.entries[0].to, to, `${label} records the ordered running value`);
  }

  const destinyAfterPermanent = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', race: 'Goblin',
    atk: 3, rtb: 2, rtbType: 'missile',
    abilities: { motherFungus: true, destiny: true },
  }));
  assertEqual(destinyAfterPermanent.atk, 10,
    'Destiny doubles melee after the permanent Mother Fungus write');
  assertEqual(destinyAfterPermanent.rtb, 8,
    'Destiny doubles ranged after the permanent Mother Fungus write');
  const destinyOrderedIds = destinyAfterPermanent.statTrace.map(entry => entry.id);
  assert(destinyOrderedIds.indexOf('motherFungus') < destinyOrderedIds.indexOf('destiny'),
    'Destiny follows every permanent base write in the ordered trace');

  const destinyAfterEarlyHook = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 3, rtb: 2, rtbType: 'missile',
    abilities: { luckyStar: true, destiny: true },
  }));
  assertEqual(destinyAfterEarlyHook.atk, 8,
    'Destiny doubles the phase-b Lucky Star melee write at its compiled position');
  assertEqual(destinyAfterEarlyHook.rtb, 6,
    'Destiny doubles the phase-b Lucky Star ranged write at its compiled position');
  const earlyHookIds = destinyAfterEarlyHook.statTrace.map(entry => entry.id);
  assert(earlyHookIds.indexOf('luckyStar') < earlyHookIds.indexOf('destiny'),
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
  assertEqual(focusCreatedAfterLevel.modifierTraces.sharedAttack.entries[0].phase, 'c',
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
  assertEqual(focusedThrown.modernAttacks.ranged.type, 'magic_s',
    'Focus Magic conversion changes the ordered channel type to Sorcery ranged');
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

  const focusedBombs = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 3,
    abilities: { outlanderWizard: true, explosive: true, focusMagic: true },
    modernAttacks: {},
  }));
  assertEqual(focusedBombs.modernAttacks.ranged.strength, 7,
    'Focus Magic converts the live phase-b Bombs & Grenades Thrown strength');
  assertEqual(focusedBombs.modernAttacks.ranged.type, 'magic_s',
    'Focus Magic converts phase-b-created Thrown to Sorcery ranged');
  assertEqual(focusedBombs.modernAttacks.thrown, undefined,
    'Focus Magic consumes the phase-b-created Thrown channel');
  const focusedBombIds = focusedBombs.modernAttacks.ranged.statTrace.map(entry => entry.id);
  assert(focusedBombIds.indexOf('bombsGrenades')
      < focusedBombIds.indexOf('focusMagic:conversion'),
  'The atomic modern-channel trace records phase-b creation before phase-c conversion');

  const focusedBombsAndBreath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 3,
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
    .find(entry => entry.id === 'focusMagic:conversion');
  assert(typeOnlyFocusEvent && typeOnlyFocusEvent.phase === 'c'
      && typeOnlyFocusEvent.changes.rangedType,
  'A strength-preserving Focus type conversion remains visible as a phase-c channel event');

  const tracedVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
    abilities: { vampirism: true },
    atk: 3, rtb: 5, rtbType: 'thrown',
  }));
  for (const [field, from, to] of [['melee', 3, 5], ['sharedAttack', 5, 1]]) {
    const entry = tracedVampirism.modifierTraces[field].entries[0];
    assertEqual(entry.source.id, 'vampirism:transfer', `Vampirism owns its ${field} transfer`);
    assertEqual(entry.from, from, `Vampirism ${field} records its running before value`);
    assertEqual(entry.to, to, `Vampirism ${field} records its running after value`);
  }

  const simultaneousVampirism = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7',
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
    version: 'com2_warlord_1.5.12.7',
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
    version: 'com2_warlord_1.5.12.7', atk: 3, rtb: 4, rtbType: 'missile',
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
  assertEqual(focusedCoexistingVampirism.modernAttacks.ranged.type, 'magic_s',
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
      version: 'com2_warlord_1.5.12.7', atk: 3,
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
    version: 'com2_warlord_1.5.12.7',
    abilities: { shadowStrike: true },
    atk: 6, rtb: 0, rtbType: 'none',
    modernAttacks: {},
  }));
  const grantedThrown = shadowStrikeGrant.modernAttacks.thrown;
  assertEqual(grantedThrown.baseStrength, 0,
    'Shadow Strike-created modern Thrown retains its editable zero base');
  assertEqual(grantedThrown.modifierTrace.base, 0,
    'Shadow Strike-created modern Thrown trace starts from zero');
  assertEqual(grantedThrown.modifierTrace.entries.length, 1,
    'Shadow Strike-created modern Thrown has one applied grant entry');
  assertEqual(grantedThrown.modifierTrace.entries[0].source.id, 'shadowStrike:thrown',
    'Shadow Strike owns the created modern Thrown grant');
  assertEqual(grantedThrown.modifierTrace.entries[0].source.label, 'Shadow Strike',
    'Created modern Thrown identifies Shadow Strike to presentation');
  assertEqual(grantedThrown.modifierTrace.entries[0].from, 0,
    'Shadow Strike grant records zero as its running before value');
  assertEqual(grantedThrown.modifierTrace.entries[0].to, 3,
    'Shadow Strike grant records the created strength as its running after value');
  assertEqual(grantedThrown.modifierTrace.result, grantedThrown.strength,
    'Shadow Strike-created modern Thrown trace reaches channel strength');

  const colossalShadow = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', atk: 9,
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
    version: 'com2_warlord_1.5.12.7', atk: 9, rtb: 4, rtbType: 'thrown',
    abilities: { focusMagic: true, shadowStrike: true },
    modernAttacks: { thrown: { strength: 4, type: 'thrown' } },
  }));
  assertEqual(focusAndShadow.modernAttacks.ranged.strength, 4,
    'Focus Magic converts the original Thrown channel at its live strength');
  assertEqual(focusAndShadow.modernAttacks.ranged.type, 'magic_s',
    'The converted original channel is Sorcery ranged');
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

module.exports = { runStatStepChecks, runModifierTraceChecks };
