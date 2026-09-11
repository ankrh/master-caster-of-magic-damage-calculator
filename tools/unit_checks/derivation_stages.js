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
  const version = 'com2_warlord_1.5.12.9';

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

  assertEqual(phaseOf({ lucky: true }, 'lucky'), 'c',
    'Intrinsic Lucky is applied in region c, where +0x044C7 puts it');
  assertEqual(phaseOf({ lucky: true, luckyPhaseBase: true }, 'lucky'), 'c',
    'Creation-time Lucky establishes the flag before its compiled region-c stat write');

  // The four magnitudes are proved by damage instead — `artificerMechanical*Warlord`, whose
  // resistance case is written against the script's +2.
  assertEqual(phaseOf({ artificer: true, mechanical: true }, 'artificer'), 'training',
    'Artificer ABase writes are training-time');

  assertEqual(phaseOf({ guardian: true }, 'guardian'), 'c',
    'The Guardian retort is region c, where +0x0B092 puts it');
  assertEqual(phaseOf({ rebuild: true }, 'rebuild', version, { isHero: false }), 'buffs',
    'Non-hero Rebuild ABase write is cast-time');
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
  for (const modernVersion of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const misfortune = stepFor({ mislead: true }, 'mislead', modernVersion);
    assertEqual(misfortune.phase, 'e',
      `${modernVersion}: Misfortune is aura type 10 in the region-e aura pass`);
    assertEqual(JSON.stringify(misfortune.writes), JSON.stringify(['atk', 'def', 'res', 'rtb']),
      `${modernVersion}: Misfortune emits one atomic four-stat aura step`);

    const afterClamp = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, atk: 0, def: 0, res: 0,
      rtb: 1, rtbType: 'missile', modernAttacks: { ranged: { strength: 1, type: 'missile' } },
      markedAbilities: { mindStorm: true, mislead: true },
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
      markedAbilities: { mislead: true, supremeLight: true },
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
      markedAbilities: { focusMagic: true, mislead: true }, modernAttacks: {},
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
    for (const auraSource of ['innateAbilities', 'markedAbilities']) {
      const createdRangedWithAuras = ctx.deriveUnitStats(baseUnitInput({
        version: modernVersion, rtb: 0, rtbType: 'none',
        innateAbilities: auraSource === 'innateAbilities' ? { holyBonus: 2 } : {},
        markedAbilities: { focusMagic: true, mislead: true, guidingBeaconAura: 2,
          ...(auraSource === 'markedAbilities' ? { holyBonus: 2 } : {}) },
        modernAttacks: {},
      }));
      assertEqual(createdRangedWithAuras.modernAttacks.ranged.strength, 5,
        `[${auraSource}] ` + (`${modernVersion}: a created Ranged channel takes Guiding Beacon but neither permanent-record aura`));
      const createdAuraIds = createdRangedWithAuras.modernAttacks.ranged.modifierTrace.entries
        .map(entry => entry.id);
      assert(createdAuraIds.includes('guidingBeaconAura')
        && !createdAuraIds.includes('holyBonus') && !createdAuraIds.includes('mislead'),
      `[${auraSource}] ` + (`${modernVersion}: calculated and permanent Ranged gates remain isolated in one aura pass`));
  }
    const hero = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, unitType: 'hero', atk: 2, def: 2, res: 2,
      rtb: 2, rtbType: 'missile', modernAttacks: { ranged: { strength: 2, type: 'missile' } },
      markedAbilities: { mislead: true },
    }));
    assertEqual(hero.atk, 1,
      `${modernVersion}: an eligible live non-Fantastic hero receives Misfortune`);
    assert(hero.statTrace.some(entry => entry.id === 'mislead'),
      `${modernVersion}: an eligible hero emits the atomic Misfortune trace event`);

    const thrown = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, rtb: 2, rtbType: 'thrown',
      modernAttacks: { thrown: { strength: 2, type: 'thrown' } }, markedAbilities: { mislead: true },
    }));
    assertEqual(thrown.rtb, 2,
      `${modernVersion}: Misfortune does not subtract from the independent Thrown channel`);

    const fantastic = ctx.deriveUnitStats(baseUnitInput({
      version: modernVersion, unitType: 'normal', atk: 2, def: 2, res: 2,
      rtb: 2, rtbType: 'missile', modernAttacks: { ranged: { strength: 2, type: 'missile' } },
      markedAbilities: { combatSummoned: true, mislead: true },
    }));
    assertEqual(fantastic.abilities.liveFantastic, true,
      `${modernVersion}: the test subject becomes Fantastic before the aura gate`);
    assertEqual(fantastic.atk, 2,
      `${modernVersion}: Misfortune remains inert on a live Fantastic unit`);
    assert(!fantastic.statTrace.some(entry => entry.id === 'mislead'),
      `${modernVersion}: an ineligible Fantastic unit emits no Misfortune trace event`);
  }
  const linkedMisfortune = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', unitType: 'fantastic_nature', atk: 2, def: 2, res: 2,
    rtb: 2, rtbType: 'missile', modernAttacks: { ranged: { strength: 2, type: 'missile' } },
    markedAbilities: { spiritLink: true, mislead: true },
  }));
  assertEqual(linkedMisfortune.abilities.liveFantastic, false,
    'Warlord Spirit Link clears Fantastic before the Misfortune aura gate');
  assertEqual(linkedMisfortune.atk, 1,
    'A base-Fantastic unit qualifies for Misfortune after Spirit Link makes it live non-Fantastic');
  assertEqual(phaseOf({ spiritLink: true }, 'spiritLink'), 'buffs',
    'Spirit Link writes +2 Resistance permanently to ABase when cast');

  // F245: the cast's three permanent writes. `buffs:spiritLink:fantastic` clears the Fantastic
  // flag ahead of `a:baseCopy`, so it is off the record every later gate reads;
  // `buffs:spiritLink:level` puts the base level back to Recruit behind it. Asserted through
  // derived outputs at three production call sites rather than by reading the record: the level
  // ladder (`training:veterancy` overwritten at `buffs:spiritLink:level`, with
  // `c:level:fantastic` no longer firing), Bad Moon's `!runCtx.base.fantastic` arm (F244.3h
  // retired the pre-sequence `permanentFantastic` spelling there), and the reform's `NOTSAPIENS`
  // gate. Mutation-tested: reverting any one of those consumers to the template flag
  // (`!isFantasticBase`) fails exactly one assertion below. The *relative rank* of
  // `buffs:spiritLink:fantastic` and `buffs:destiny` is not asserted anywhere in this suite and
  // deliberately is not: the manifest is the ordering authority, so a check restating it would
  // assert a constant against itself. It is defended by measurement instead — the preset
  // `spiritLinkApotheosisKeepsPermanentFantasticWarlord` is the one fixture in the corpus that
  // marks both, and swapping the two chain entries moves the damage it pins from 2.0 to 8.0
  // (F262). Restoring the retired `spiritLinkLevelWidening` term
  // does **not** fail, and that is the retirement being complete rather than a gap here: its
  // training occurrence was already vacuous (Warlord satisfies `isCoM2`) and its
  // `c:level:fantastic` occurrence is now a no-op, `ctx.base.fantastic` being false wherever it
  // would have fired.
  //
  // The loadout gate is no longer one of those call sites, and that is F262 rather than a gap:
  // `training:weaponQuality` reads the permanent Fantastic flag as it stands at its own
  // `training` rank, four phases ahead of the cast, so a base-Fantastic card is unequipped
  // whether or not Spirit Link is marked. The material is a stored flag the training city writes
  // once and no later cast re-runs.
  const linkedCard = over => baseUnitInput({
    version: 'com2_warlord_1.5.12.9', unitType: 'fantastic_nature', atk: 4, def: 4, res: 6,
    rtb: 0, rtbType: 'none', modernAttacks: {}, level: 'elite', ...over });
  const linkedEquipped = ctx.deriveUnitStats(linkedCard({
    weapon: 'adamantium', markedAbilities: { spiritLink: true } }));
  const unlinkedEquipped = ctx.deriveUnitStats(linkedCard({
    weapon: 'adamantium', innateAbilities: {}, markedAbilities: {} }));
  assertEqual(unlinkedEquipped.weapon, 'normal',
    'a base-Fantastic Warlord unit is unequipped: the loadout gate discards the stated material');
  assertEqual(linkedEquipped.weapon, 'normal',
    'and Spirit Link does not equip it retroactively: the cast clears the permanent Fantastic '
    + 'flag at buffs, four phases behind the training write that reads it (F262)');
  const normalEquipped = ctx.deriveUnitStats(linkedCard({
    unitType: 'normal', weapon: 'adamantium', innateAbilities: {}, markedAbilities: {} }));
  const destinyEquipped = ctx.deriveUnitStats(linkedCard({
    unitType: 'normal', weapon: 'adamantium', markedAbilities: { destiny: true } }));
  assertEqual(normalEquipped.weapon, 'adamantium',
    'a normal Warlord unit keeps the material its city gave it');
  assertEqual(destinyEquipped.weapon, 'adamantium',
    "and Destiny's later B.Fantastic := True does not take it away: no material block in either "
    + 'engine family carries a Fantastic gate, and the flag it reads is never cleared (F262)');
  assertEqual(unlinkedEquipped.lvl.atk, 0,
    'and c:level:fantastic zeroes the stated level for the unlinked one');
  assertEqual(linkedEquipped.lvl.atk, 0,
    'while the Spirit-Linked one is put back to Recruit by the cast itself, at buffs rather than c');
  assert(linkedEquipped.statTrace.some(e => e.id === 'spiritLink:level'),
    'and buffs:spiritLink:level is the step that did it');
  assert(!linkedEquipped.statTrace.some(e => e.id === 'level:fantastic'),
    'while c:level:fantastic no longer fires, its gate reading the cleared base record');
  const linkedBadMoon = ctx.deriveUnitStats(linkedCard({
    level: 'normal', markedAbilities: { spiritLink: true, badMoon: true } }));
  const unlinkedBadMoon = ctx.deriveUnitStats(linkedCard({
    level: 'normal', markedAbilities: { badMoon: true } }));
  assertEqual(unlinkedBadMoon.res, 6,
    "Bad Moon's permanent-record arm refuses a base-Fantastic unit");
  assertEqual(linkedBadMoon.res, 5,
    'and admits the same unit once Spirit Link has cleared that flag');
  // F244.3h: Breakthrough's `not B.Fantastic` admission ($005A376D..$005A3DDE) moved from a
  // decision not to *create* `c:breakthrough:normal` to the step's own `when` over `ctx.base`.
  // The damage both directions produce is pinned by two presets; what is asserted here is the
  // structural half those cannot express — that the step is composed either way and reports
  // itself skipped rather than being absent, which is what makes the exclusion visible in the
  // chain dump and to `STEP_VERSION_SCOPES`' complement check (the F244.1 census's defect 4).
  const breakthroughCard = over => baseUnitInput({
    version: 'com2_1.05.11', unitType: 'normal', atk: 1, def: 0, res: 3, hp: 10,
    rtb: 0, rtbType: 'none', modernAttacks: {}, ...over });
  const breakthroughEvent = card => ctx.deriveUnitStats(card).statExecutionTrace
    .find(event => event.id === 'breakthrough:normal');
  const plainBreakthrough = breakthroughEvent(breakthroughCard({
    markedAbilities: { breakthrough: 'melee' } }));
  const destinyBreakthrough = breakthroughEvent(breakthroughCard({
    markedAbilities: { breakthrough: 'melee', destiny: true } }));
  assert(plainBreakthrough && plainBreakthrough.status === 'applied',
    'c:breakthrough:normal is composed and fires on a permanently non-Fantastic unit');
  assert(destinyBreakthrough && destinyBreakthrough.status === 'skipped',
    'and is still composed, reporting itself skipped, once Destiny writes the permanent flag '
    + '- a step present and unfired rather than a step never built (F244.3h)');
  assert(!breakthroughEvent(breakthroughCard({ innateAbilities: {}, markedAbilities: {} })),
    'while a card with no Breakthrough composes no step at all, which is the enchantment gate '
    + 'rather than the block term');

  // Destiny's `B.Fantastic := True` is a write the recalculation re-makes on every pass and it is
  // ranked after the clear, so it wins on the flag. Read through the reform's `NOTSAPIENS` gate,
  // which is a `ctx.base` reader: the loadout gate used to show it too and does not any more, its
  // `training` rank standing ahead of both writes (F262).
  // `SMultiLabel := 14` is not re-asserted away with the flag, so the reform's `NOTSAPIENS` gate
  // still admits the unit. Since F263 the label is a record field too — `buffs:spiritLink:sapiens`
  // writes it and `outlanderSapiensAt` reads it off `ctx.base` beside the flag — so this is a
  // **value** witness of a gate whose two terms are both record reads. `runSapiensLabelChecks`
  // (`ability_origins.js`) is its structural counterpart, over the label's two writers and the
  // block's own `IF BASEFANTASTIC(TU)`; this one is kept because it is the only assertion that
  // takes the answer as a stat rather than as a step status, and it reaches the Sapiens tail
  // through Radio/Ballistics/Xenopsychology rather than through Bombs & Grenades.
  const reformCard = over => baseUnitInput({
    version: 'com2_warlord_1.5.12.9', unitType: 'fantastic_nature', atk: 4, def: 4, res: 6,
    rtb: 6, rtbType: 'missile',
    modernAttacks: { ranged: { strength: 6, type: 'missile' } }, ...over });
  const REFORM = { ballisticsTraining: true, xenopsychology: true,
    radio: true };
  const reformDestinyLinked = ctx.deriveUnitStats(reformCard({
    innateAbilities: { outlanderWizard: true }, markedAbilities: { ...REFORM, spiritLink: true, destiny: true } }));
  const reformDestinyPlain = ctx.deriveUnitStats(reformCard({
    innateAbilities: { outlanderWizard: true }, markedAbilities: { ...REFORM, destiny: true } }));
  assertEqual(reformDestinyPlain.toHitRtb, 0.3,
    'a permanently Fantastic Outlander unit is outside the Sapiens tail');
  assertEqual(reformDestinyLinked.toHitRtb, 0.5,
    "but Spirit Link's SMultiLabel 14 label survives Destiny's Fantastic write and admits it");

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
  const phases = ['template', 'training', 'immunities', 'buffs', 'debuffs',
    'a', 'b', 'c', 'd', 'e'];
  const byPhase = {};
  for (const step of mixed) (byPhase[step.phase] = byPhase[step.phase] || []).push(step);
  assert(Object.keys(byPhase).every(phase => phases.includes(phase)),
    'Every emitted step carries a known phase');
  // Emission is in source order, which is *not* phase order — Artificer is `training` and comes
  // near the end. Partitioning by phase is therefore the caller's job, not something to be
  // assumed. `lucky` and `rebuild` appear without being asked for because each reads a grantable
  // flag off the record at its own position, and the five Outlander reform writes appear because
  // their `when` reads the reform record this harness does not supply — so emission is a superset
  // and the `when` is the gate (F202, F244.3d, F244.3e).
  assertEqual(mixed.map(step => step.id).join(','),
    'holyBonus,lucky,prayer,rust,favoredTerrain,armorclad,militaryDrilling,powerEngine,'
    + 'temporalDrive,magitekScience,artificer,rebuild',
    'Steps are emitted in source order, which the caller partitions by phase');
  assertEqual(mixed.map(step => step.phase).join(','),
    'e,c,c,d,d,training,training,training,training,training,training,buffs',
    'Emission order is not phase order');
}

module.exports = { runToBlockChecks, runDerivationStageChecks };
