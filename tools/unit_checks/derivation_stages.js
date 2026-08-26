// The To-Block context and the derivation stages deriveUnitStats exposes: the chance ledger,
// the figure sequence, and the staged records they are composed from.

'use strict';

const { assert, assertEqual, assertClose, baseUnitInput } = require('./assertions');

// Eldritch Weapon and Mystic Surge are one engine write reached under two names: MoM guards bit
// 0x00200000 as Eldritch Weapon, CoM 1 as Mystic Surge (`COMBAT_VERSION_SCOPES`, `steps.js`). No
// version admits both, so the pair is checked once per engine rather than on one fixture carrying
// both — which is what this check used to do, with no version passed at all.
//
// `com_6.08` is the CoM arm rather than `com2_1.05.11` because a `com2_` version wraps every
// return in the capped-chance profile object, which would put `.chance` in front of every value
// here and test the wrapper rather than the reduction.
function runToBlockChecks(ctx) {
  const unit = (toBlock, thrownType, rangedType) => ({
    toBlock,
    abilities: { eldritchWeapon: true, mysticSurge: true },
    thrownType,
    rangedType,
  });
  const a = unit(0.4, 'thrown', 'missile');
  const b = unit(0.5, 'none', 'none');

  // MoM: Eldritch Weapon live, Mystic Surge inert.
  const mom = ctx.buildToBlockContext(a, b, 0.05, 0.07, 'mom_1.31');
  assertClose(mom.bToBlockConventional, 0.43, 'MoM defender conventional block applies Vertigo');
  assertClose(mom.aToBlockConventional, 0.35, 'MoM attacker conventional block applies Vertigo');
  assertClose(mom.bToBlockVsAAll, 0.43, 'MoM has no Mystic Surge, so the all-attack block is unreduced');
  assertClose(mom.aToBlockVsBAll, 0.35, 'MoM opponent Mystic Surge is inert');
  assertClose(mom.bToBlockVsAMelee, 0.33, 'MoM Eldritch Weapon lowers defender melee block');
  assertClose(mom.bToBlockVsAThrEW, 0.33, 'MoM Eldritch Weapon lowers defender thrown block');
  assertClose(mom.bToBlockVsARangedEW, 0.33, 'MoM Eldritch Weapon lowers defender missile block');
  assertClose(mom.aToBlockVsBMelee, 0.25, 'MoM opponent Eldritch Weapon lowers attacker melee block');

  // CoM 1: Mystic Surge live, Eldritch Weapon inert. The melee value still falls, because Mystic
  // Surge reduces the all-attack block the melee value is taken from.
  const com = ctx.buildToBlockContext(a, b, 0.05, 0.07, 'com_6.08');
  assertClose(com.bToBlockConventional, 0.43, 'CoM 1 defender conventional block applies Vertigo');
  assertClose(com.aToBlockConventional, 0.35, 'CoM 1 attacker conventional block applies Vertigo');
  assertClose(com.bToBlockVsAAll, 0.33, 'CoM 1 Mystic Surge lowers defender block against all conventional attacks');
  assertClose(com.aToBlockVsBAll, 0.25, 'CoM 1 opponent Mystic Surge lowers attacker block');
  assertClose(com.bToBlockVsAMelee, 0.33, 'CoM 1 has no Eldritch Weapon, so melee takes no second reduction');
  assertClose(com.bToBlockVsAThrEW, 0.33, 'CoM 1 thrown takes no Eldritch Weapon reduction');
  assertClose(com.bToBlockVsARangedEW, 0.33, 'CoM 1 missile takes no Eldritch Weapon reduction');
  assertClose(com.aToBlockVsBMelee, 0.25, 'CoM 1 attacker melee takes no Eldritch Weapon reduction');
}

function runDerivationStageChecks(ctx) {
  const version = 'com2_warlord_1.5.12.7';

  // Phase attribution is a step's declared position, so these assert on the emitted step
  // rather than on a bucket total. `null` means the effect emitted no step at all.
  // `deriveUnitStats` hands the builder its identity predicates separately from the ability map,
  // and the hero flag is one of them (F187) — a probe stating a hero through `abilities.unitType`
  // would build a state the page cannot produce. `predicates` is that third argument.
  const stepFor = (abilities, id, ver, predicates) => {
    const steps = ctx.getAbilityStatSteps(abilities, ver || version, predicates || {});
    const matches = steps.filter(step => step.id === id);
    assert(matches.length <= 1, `getAbilityStatSteps emits at most one '${id}' step`);
    return matches[0] || null;
  };
  const phaseOf = (abilities, id, ver, predicates) => {
    const step = stepFor(abilities, id, ver, predicates);
    return step ? step.phase : null;
  };

  assertEqual(phaseOf({ lucky: true, luckyPhaseA: true }, 'lucky'), 'c',
    'Intrinsic Lucky is applied in region c, where +0x044C7 puts it');
  assertEqual(phaseOf({ lucky: true, luckyPhaseBase: true, luckyPhaseA: true }, 'lucky'), 'c',
    'Creation-time Lucky establishes the flag before its compiled region-c stat write');
  assertEqual(phaseOf({ lucky: true, luckyPhaseB: true }, 'lucky'), 'c',
    'Lucky Star / Divine Protection establish the flag before the compiled region-c stat write');

  // The four magnitudes are proved by damage instead — `artificerMechanical*Warlord`, whose
  // resistance case is written against the script's +2 rather than the helptext's +1.
  assertEqual(phaseOf({ artificer: true, mechanical: true }, 'artificer'), 'base',
    'Artificer ABase writes use the base stage');

  assertEqual(phaseOf({ guardian: true }, 'guardian'), 'c',
    'The Guardian retort is region c, where +0x0B092 puts it');
  assertEqual(phaseOf({ rebuild: true }, 'rebuild', version, { isHero: false }), 'base',
    'Non-hero Rebuild ABase write uses the base stage');
  assertEqual(phaseOf({ rebuild: true }, 'rebuild', version, { isHero: true }), 'b',
    'Hero Rebuild is reapplied in UnitCalcPre phase b');

  // D23: CoM2/Warlord apply Holy Bonus and Resistance to All as region-`e` stack auras, after
  // `d` and after the Warps. The DOS engines have no aura pass and keep them in `a`.
  // Which field each engine's Holy Bonus reaches is proved by damage: `holyBonusSkipsThrownCoM2`
  // against `holyBonusReachesMissileCoM2` for the modern narrow field, and
  // `holyBonusReachesThrownCoM1` for CoM 1's shared slot.
  assertEqual(phaseOf({ holyBonus: 3 }, 'holyBonus'), 'e',
    "CoM2/Warlord run Holy Bonus in region e's aura pass");
  assertEqual(phaseOf({ holyBonus: 3 }, 'holyBonus', 'mom_1.31'), 'a',
    'MoM has no aura pass and keeps Holy Bonus in phase a');
  assertEqual(phaseOf({ resistanceToAll: 2 }, 'resistanceToAll'), 'e',
    'Resistance to All feeds the region-e Prayermaster aura');
  for (const modernVersion of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
    const misfortune = stepFor({ mislead: true }, 'mislead', modernVersion);
    assertEqual(misfortune.phase, 'e',
      `${modernVersion}: Misfortune is aura type 10 in the region-e aura pass`);
    assertEqual(JSON.stringify(misfortune.writes), JSON.stringify(['atk', 'def', 'res', 'rtb']),
      `${modernVersion}: Misfortune emits one atomic four-stat aura step`);

    const afterClamp = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, atk: 0, def: 0, res: 0,
      rtb: 1, rtbType: 'missile', modernAttacks: { ranged: { strength: 1, type: 'missile' } },
      abilities: { mindStorm: true, mislead: true },
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
      rtb: 1, rtbType: 'magic', modernAttacks: { ranged: { strength: 1, type: 'magic' } },
      abilities: { mislead: true, supremeLight: true },
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

    // Holy Bonus and Misfortune both test `B.ranged > 0` (Units.RecalculateUnits.pas:2535,
    // :2599), so a Ranged channel created after the permanent record takes neither; Guiding
    // Beacon tests the calculated `U.ranged > 0` (:2543) and takes it. That is what separates
    // the two gates in one aura pass — the record each reads, not the slot each writes.
    const createdRangedWithAuras = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 0, rtbType: 'none',
      abilities: { focusMagic: true, holyBonus: 2, mislead: true, guidingBeaconAura: 2 },
      modernAttacks: {},
    }));
    assertEqual(createdRangedWithAuras.modernAttacks.ranged.strength, 5,
      `${modernVersion}: a created Ranged channel takes Guiding Beacon but neither permanent-record aura`);
    const createdAuraIds = createdRangedWithAuras.modernAttacks.ranged.modifierTrace.entries
      .map(entry => entry.id);
    assert(createdAuraIds.includes('guidingBeaconAura')
      && !createdAuraIds.includes('holyBonus') && !createdAuraIds.includes('mislead'),
    `${modernVersion}: calculated and permanent Ranged gates remain isolated in one aura pass`);

    const hero = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, unitType: 'hero', atk: 2, def: 2, res: 2,
      rtb: 2, rtbType: 'missile', modernAttacks: { ranged: { strength: 2, type: 'missile' } },
      abilities: { mislead: true },
    }));
    assertEqual(hero.atk, 1,
      `${modernVersion}: an eligible live non-Fantastic hero receives Misfortune`);
    assert(hero.statTrace.some(entry => entry.id === 'mislead'),
      `${modernVersion}: an eligible hero emits the atomic Misfortune trace event`);

    const thrown = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 2, rtbType: 'thrown',
      modernAttacks: { thrown: { strength: 2, type: 'thrown' } }, abilities: { mislead: true },
    }));
    assertEqual(thrown.rtb, 2,
      `${modernVersion}: Misfortune does not subtract from the independent Thrown channel`);

    const fantastic = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, unitType: 'normal', atk: 2, def: 2, res: 2,
      rtb: 2, rtbType: 'missile', modernAttacks: { ranged: { strength: 2, type: 'missile' } },
      abilities: { combatSummoned: true, mislead: true },
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
    rtb: 2, rtbType: 'missile', modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    abilities: { spiritLink: true, mislead: true },
  }));
  assertEqual(linkedMisfortune.identity.fantastic, false,
    'Warlord Spirit Link clears Fantastic before the Misfortune aura gate');
  assertEqual(linkedMisfortune.atk, 1,
    'A base-Fantastic unit qualifies for Misfortune after Spirit Link makes it live non-Fantastic');
  assertEqual(phaseOf({ spiritLink: true }, 'spiritLink'), 'base',
    'Spirit Link writes +2 Resistance permanently to ABase when cast');

  // Which fields modern Animated and Black Prayer reach is proved by the four channel strengths
  // and the untouched Doom Gaze in `runDeriveUnitStatsChecks`.

  // D24/D25: both engines write Supreme Light and Tactician after their Warp block, and each
  // is emitted as a version-exclusive step rather than as a version predicate.
  assertEqual(phaseOf({ supremeLight: true }, 'supremeLight'), null,
    'Supreme Light is one step in stats.js, not an ability step, outside CoM 1');
  assertEqual(phaseOf({ supremeLight: true }, 'supremeLight', 'com_6.08'), null,
    "CoM 1's Supreme Light is likewise one step in stats.js");
  const tacticianCoM2 = stepFor({ tactician: true }, 'tactician');
  assertEqual(tacticianCoM2.phase, 'c', 'Tactician is region c (+0x0C890), not a');
  assertEqual(tacticianCoM2.afterWarp, true, 'and it runs after the Warp block');
  const tacticianCoM1 = stepFor({ tactician: true }, 'tactician', 'com_6.08');
  assertEqual(tacticianCoM1.phase, 'c', "CoM 1's Tactician retort is also region c (0x90AB4)");
  assertEqual(tacticianCoM1.afterWarp, true, 'and also after Warp Creature');
  // The modern hero grant's narrow conventional-Ranged target is proved by the four channel
  // strengths in `runDeriveUnitStatsChecks`, and its live-strength gate by the same suite's
  // `tacticianReadsLiveRanged`.

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
  // near the end. Partitioning by phase is therefore the caller's job, not something to be
  // assumed. `lucky`, `armorclad` and `rebuild` appear without being asked for: each reads a
  // grantable flag off the record at its own position, so emission is a superset and the `when`
  // is the gate (F202).
  assertEqual(mixed.map(step => step.id).join(','),
    'holyBonus,lucky,prayer,rust,favoredTerrain,armorclad,artificer,rebuild',
    'Steps are emitted in source order, which the caller partitions by phase');
  assertEqual(mixed.map(step => step.phase).join(','), 'e,c,c,d,d,base,base,base',
    'Emission order is not phase order');
}

module.exports = { runToBlockChecks, runDerivationStageChecks };
