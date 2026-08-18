// The To-Block context and the derivation stages deriveUnitStats exposes: the chance ledger,
// the figure sequence, and the staged records they are composed from.

'use strict';

const { assert, assertEqual, assertClose, baseUnitInput } = require('./assertions');

function runToBlockChecks(ctx) {
  const a = {
    toBlock: 0.4,
    abilities: { eldritchWeapon: true, mysticSurge: true },
    thrownType: 'thrown',
    rangedType: 'missile',
  };
  const b = {
    toBlock: 0.5,
    abilities: { eldritchWeapon: true, mysticSurge: true },
    thrownType: 'none',
    rangedType: 'none',
  };
  const result = ctx.buildToBlockContext(a, b, 0.05, 0.07);
  assertClose(result.bToBlockConventional, 0.43, 'Defender conventional block applies Vertigo');
  assertClose(result.bToBlockVsAAll, 0.33, 'Mystic Surge lowers defender block against all conventional attacks');
  assertClose(result.bToBlockVsAMelee, 0.23, 'Eldritch Weapon lowers defender melee block');
  assertClose(result.bToBlockVsAThrEW, 0.23, 'Eldritch Weapon lowers defender thrown block');
  assertClose(result.bToBlockVsARangedEW, 0.23, 'Eldritch Weapon lowers defender missile block');
  assertClose(result.aToBlockConventional, 0.35, 'Attacker conventional block applies Vertigo');
  assertClose(result.aToBlockVsBAll, 0.25, 'Opponent Mystic Surge lowers attacker block');
  assertClose(result.aToBlockVsBMelee, 0.15, 'Opponent Eldritch Weapon lowers attacker melee block');
}

function runDerivationStageChecks(ctx) {
  const version = 'com2_warlord_1.5.12.7';

  // Phase attribution is a step's declared position, so these assert on the emitted step
  // rather than on a bucket total. `null` means the effect emitted no step at all.
  const stepFor = (abilities, id, ver) => {
    const steps = ctx.getAbilityStatSteps(abilities, ver || version);
    const matches = steps.filter(step => step.id === id);
    assert(matches.length <= 1, `getAbilityStatSteps emits at most one '${id}' step`);
    return matches[0] || null;
  };
  const phaseOf = (abilities, id, ver) => {
    const step = stepFor(abilities, id, ver);
    return step ? step.phase : null;
  };

  assertEqual(phaseOf({ lucky: true, luckyPhaseA: true }, 'lucky'), 'c',
    'Intrinsic Lucky is applied in region c, where +0x044C7 puts it');
  assertEqual(phaseOf({ lucky: true, luckyPhaseBase: true, luckyPhaseA: true }, 'lucky'), 'c',
    'Creation-time Lucky establishes the flag before its compiled region-c stat write');
  assertEqual(phaseOf({ lucky: true, luckyPhaseB: true }, 'lucky'), 'c',
    'Lucky Star / Divine Protection establish the flag before the compiled region-c stat write');

  const artificer = stepFor({ artificer: true, mechanical: true }, 'artificer');
  assertEqual(artificer.phase, 'base', 'Artificer ABase writes use the base stage');
  assertEqual(artificer.delta.atk, 1, 'Artificer grants +1 melee');
  // +2, not the +1 the in-game helptext states — CreateUnit.CAS:43 matches manual changelog
  // 1.4.22, which restored the +2 that 1.4.17 had cut. See Source discrepancies.md §6.
  assertEqual(artificer.delta.res, 2, 'Artificer grants +2 resistance, per the script');
  assertEqual(artificer.delta.def, 1, 'Artificer grants +1 armor');
  assertEqual(artificer.delta.rtb, 1, 'Artificer grants +1 ranged');

  assertEqual(phaseOf({ guardian: true }, 'guardian'), 'c',
    'The Guardian retort is region c, where +0x0B092 puts it');
  assertEqual(phaseOf({ rebuild: true, unitType: 'normal' }, 'rebuild'), 'base',
    'Non-hero Rebuild ABase write uses the base stage');
  assertEqual(phaseOf({ rebuild: true, unitType: 'hero' }, 'rebuild'), 'b',
    'Hero Rebuild is reapplied in UnitCalcPre phase b');

  // D23: CoM2/Warlord apply Holy Bonus and Resistance to All as region-`e` stack auras, after
  // `d` and after the Warps. The DOS engines have no aura pass and keep them in `a`.
  const holyBonusCoM2 = stepFor({ holyBonus: 3 }, 'holyBonus:aura');
  assertEqual(holyBonusCoM2.phase, 'e', "CoM2/Warlord run Holy Bonus in region e's aura pass");
  assertEqual(holyBonusCoM2.delta.ranged, 3,
    'The Holy Bonus aura writes the narrow ranged field, not the shared rtb slot');
  assertEqual(holyBonusCoM2.delta.rtb, undefined,
    'so Thrown, Breath and the gazes take no Holy Bonus in CoM2');
  assertEqual(phaseOf({ holyBonus: 3 }, 'holyBonus', 'mom_1.31'), 'a',
    'MoM has no aura pass and keeps Holy Bonus in phase a');
  assertEqual(stepFor({ holyBonus: 3 }, 'holyBonus', 'com_6.08').delta.rtb, 3,
    "CoM 1 writes Holy Bonus to the shared `.ranged` slot, so it reaches Thrown and Breath");
  assertEqual(phaseOf({ resistanceToAll: 2 }, 'resistanceToAll:aura'), 'e',
    'Resistance to All feeds the region-e Prayermaster aura');
  for (const modernVersion of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const misfortune = stepFor({ mislead: true }, 'mislead', modernVersion);
    assertEqual(misfortune.phase, 'e',
      `${modernVersion}: Misfortune is aura type 10 in the region-e aura pass`);
    assertEqual(JSON.stringify(misfortune.writes), JSON.stringify(['atk', 'def', 'res', 'rtb']),
      `${modernVersion}: Misfortune emits one atomic four-stat aura step`);

    const afterClamp = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, atk: 0, def: 0, res: 0,
      rtb: 1, rtbType: 'missile', abilities: { mindStorm: true, mislead: true },
    }));
    assertEqual(afterClamp.atk, -1,
      `${modernVersion}: Misfortune subtracts melee after the terminal zero clamp`);
    assertEqual(afterClamp.def, -1,
      `${modernVersion}: Misfortune subtracts Defense after the terminal zero clamp`);
    assertEqual(afterClamp.res, -1,
      `${modernVersion}: Misfortune subtracts Resistance after the calculator's terminal floor`);
    assertEqual(afterClamp.rtb, -1,
      `${modernVersion}: base Ranged remains eligible when an earlier write and clamp reduce it to zero`);
    const clampIndex = afterClamp.statTrace.findIndex(entry => entry.id === 'clamp');
    const misfortuneIndex = afterClamp.statTrace.findIndex(entry => entry.id === 'mislead');
    assert(clampIndex >= 0 && clampIndex < misfortuneIndex,
      `${modernVersion}: the trace keeps the terminal clamp before Misfortune aura type 10`);

    const beforeSupremeLight = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, atk: 1, def: 1, res: 3,
      rtb: 1, rtbType: 'magic_n', abilities: { mislead: true, supremeLight: true },
    }));
    const supremeIndex = beforeSupremeLight.statTrace
      .findIndex(entry => entry.id === 'supremeLight');
    const preSupremeMisfortuneIndex = beforeSupremeLight.statTrace
      .findIndex(entry => entry.id === 'mislead');
    assert(preSupremeMisfortuneIndex >= 0 && preSupremeMisfortuneIndex < supremeIndex,
      `${modernVersion}: Misfortune remains before Supreme Light in the region-e trace`);
    assertEqual(beforeSupremeLight.def, 0,
      `${modernVersion}: Supreme Light reads Resistance after Misfortune's atomic decrement`);

    const createdRanged = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 0, rtbType: 'none',
      abilities: { focusMagic: true, mislead: true }, modernAttacks: {},
    }));
    assertEqual(createdRanged.modernAttacks.ranged.strength, 3,
      `${modernVersion}: Misfortune does not subtract from Ranged created after the persistent base record`);
    assert(!createdRanged.modernAttacks.ranged.modifierTrace.entries
      .some(entry => entry.id === 'mislead'),
    `${modernVersion}: a created Ranged channel emits no Misfortune ranged trace write`);

    const createdRangedWithHolyBonus = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 0, rtbType: 'none',
      abilities: { focusMagic: true, holyBonus: 2, mislead: true }, modernAttacks: {},
    }));
    assertEqual(createdRangedWithHolyBonus.modernAttacks.ranged.strength, 5,
      `${modernVersion}: F14 preserves other ability steps' calculated-Ranged slot semantics`);
    const createdAuraIds = createdRangedWithHolyBonus.modernAttacks.ranged.modifierTrace.entries
      .map(entry => entry.id);
    assert(createdAuraIds.includes('holyBonus:aura') && !createdAuraIds.includes('mislead'),
      `${modernVersion}: calculated and persistent Ranged gates remain isolated in one aura pass`);

    const hero = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, unitType: 'hero', atk: 2, def: 2, res: 2,
      rtb: 2, rtbType: 'missile', abilities: { mislead: true },
    }));
    assertEqual(hero.atk, 1,
      `${modernVersion}: an eligible live non-Fantastic hero receives Misfortune`);
    assert(hero.statTrace.some(entry => entry.id === 'mislead'),
      `${modernVersion}: an eligible hero emits the atomic Misfortune trace event`);

    const thrown = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 2, rtbType: 'thrown', abilities: { mislead: true },
    }));
    assertEqual(thrown.rtb, 2,
      `${modernVersion}: Misfortune does not subtract from the independent Thrown channel`);

    const fantastic = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, unitType: 'normal', atk: 2, def: 2, res: 2,
      rtb: 2, rtbType: 'missile', abilities: { combatSummoned: true, mislead: true },
    }));
    assertEqual(fantastic.identity.fantastic, true,
      `${modernVersion}: the test subject becomes Fantastic before the aura gate`);
    assertEqual(fantastic.atk, 2,
      `${modernVersion}: Misfortune remains inert on a live Fantastic unit`);
    assert(!fantastic.statTrace.some(entry => entry.id === 'mislead'),
      `${modernVersion}: an ineligible Fantastic unit emits no Misfortune trace event`);
  }
  const linkedMisfortune = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.7', unitType: 'fantastic_nature', atk: 2, def: 2, res: 2,
    rtb: 2, rtbType: 'missile', abilities: { spiritLink: true, mislead: true },
  }));
  assertEqual(linkedMisfortune.identity.fantastic, false,
    'Warlord Spirit Link clears Fantastic before the Misfortune aura gate');
  assertEqual(linkedMisfortune.atk, 1,
    'A base-Fantastic unit qualifies for Misfortune after Spirit Link makes it live non-Fantastic');
  assertEqual(phaseOf({ spiritLink: true }, 'spiritLink'), 'base',
    'Spirit Link writes +2 Resistance permanently to ABase when cast');

  const animatedModern = stepFor({ animated: true }, 'animated', 'com2_1.05.11');
  assertEqual(animatedModern.delta.nonGazeRtb, 1,
    'Modern Animated targets the conventional Ranged/Thrown/Breath channels');
  assertEqual(animatedModern.delta.rtb, undefined,
    'Modern Animated does not target the independent Gaze fields');
  const blackPrayerModern = stepFor({ blackPrayer: true }, 'blackPrayer', 'com2_1.05.11');
  assertEqual(blackPrayerModern.delta.nonGazeRtb, -1,
    'Modern Black Prayer targets the conventional Ranged/Thrown/Breath channels');
  assertEqual(blackPrayerModern.delta.rtb, undefined,
    'Modern Black Prayer does not target the independent Gaze fields');

  // D24/D25: both engines write Supreme Light and Tactician after their Warp block, and each
  // is emitted as a version-exclusive step rather than as a version predicate.
  assertEqual(phaseOf({ supremeLight: true }, 'supremeLight'), null,
    'Supreme Light is one step in stats.js, not an ability step, outside CoM 1');
  assertEqual(phaseOf({ supremeLight: true }, 'supremeLight:coM1', 'com_6.08'), null,
    "CoM 1's Supreme Light is likewise one step in stats.js");
  const tacticianCoM2 = stepFor({ tactician: true }, 'tactician');
  assertEqual(tacticianCoM2.phase, 'c', 'Tactician is region c (+0x0C890), not a');
  assertEqual(tacticianCoM2.afterWarp, true, 'and it runs after the Warp block');
  const tacticianCoM1 = stepFor({ tactician: true }, 'tactician:coM1', 'com_6.08');
  assertEqual(tacticianCoM1.phase, 'c', "CoM 1's Tactician retort is also region c (0x90AB4)");
  assertEqual(tacticianCoM1.afterWarp, true, 'and also after Warp Creature');
  const tacticianHeroCoM2 = stepFor({ tactician: true, unitType: 'hero' },
    'tactician', 'com2_1.05.11');
  assertEqual(tacticianHeroCoM2.delta.positiveRanged, 2,
    'Modern Tactician hero targets positive live conventional Ranged');
  assertEqual(tacticianHeroCoM2.delta.rtb, undefined,
    'Modern Tactician hero does not target Thrown, Breath, or Gaze');

  const mixedAbilities = {
    artificer: true,
    mechanical: true,
    holyBonus: 2,
    prayer: true,
    rust: true,
    favoredTerrain: true,
  };
  const mixed = ctx.getAbilityStatSteps(mixedAbilities, version);
  const phases = ['base', 'a', 'b', 'c', 'd', 'e'];
  const byPhase = {};
  for (const step of mixed) (byPhase[step.phase] = byPhase[step.phase] || []).push(step);
  assert(Object.keys(byPhase).every(phase => phases.includes(phase)),
    'Every emitted step carries a known phase');
  // Emission is in source order, which is *not* phase order — Artificer is `base` and comes
  // last. Partitioning by phase is therefore the caller's job, not something to be assumed.
  assertEqual(mixed.map(step => step.id).join(','),
    'holyBonus:aura,prayer,rust,favoredTerrain,artificer',
    'Steps are emitted in source order, which the caller partitions by phase');
  assertEqual(mixed.map(step => step.phase).join(','), 'e,c,d,d,base',
    'Emission order is not phase order');
}

module.exports = { runToBlockChecks, runDerivationStageChecks };
