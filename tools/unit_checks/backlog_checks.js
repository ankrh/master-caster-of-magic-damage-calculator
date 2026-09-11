// Regression suites kept per backlog item, each pinning the behavior that item settled.

'use strict';

const {
  evalInContext, assert, assertEqual, assertClose, assertIs, baseUnitInput,
  modernRecordForSharedSlot,
} = require('./assertions');

function runF19Checks(ctx) {
  const modern = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', ...overrides,
  }));
  const warlord = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', ...overrides,
  }));

  const darkForce = modern({ markedAbilities: { darkForce: true } });
  assertClose(darkForce.toHitMelee, 0.4, 'F19 Dark Force adds 10 percentage points To Hit');
  assertClose(darkForce.toBlock, 0.4, 'F19 Dark Force adds 10 percentage points To Block');

  const heavenly = modern({
    prefix: 'b', atk: 2, def: 3, res: 4,
    markedAbilities: { heavenlyLight: true },
    modernAttacks: {
      ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
    },
  });
  assertEqual(heavenly.atk, 3, 'F19 Heavenly Light adds one to base-present melee');
  assertEqual(heavenly.def, 4, 'F19 Heavenly Light adds one Defense');
  assertEqual(heavenly.res, 5, 'F19 Heavenly Light adds one Resistance');
  assertEqual(heavenly.modernAttacks.ranged.strength, 4,
    'F19 Heavenly Light adds one to current conventional Ranged');
  assertEqual(heavenly.modernAttacks.thrown.strength, 4,
    'F19 Heavenly Light leaves independent Thrown strength unchanged');
  assertEqual(heavenly.modernAttacks.fireBreath.strength, 5,
    'F19 Heavenly Light leaves independent Breath strength unchanged');
  assertClose(heavenly.modernAttacks.ranged.toHit, 0.4,
    'F19 Heavenly Light grants the non-material Ranged To-Hit tail');
  assertClose(heavenly.modernAttacks.thrown.toHit, 0.4,
    'F19 Heavenly Light grants the non-material Thrown To-Hit tail');
  assertClose(heavenly.modernAttacks.fireBreath.toHit, 0.3,
    'F19 Heavenly Light does not grant its material tail to Breath');
  assertEqual(heavenly.encMagicIndependentOfMaterial, true,
    'F19 Heavenly Light grants independent EncMagic');
  const attackerHeavenly = modern({
    prefix: 'a', atk: 2, def: 3, res: 4, markedAbilities: { heavenlyLight: true },
    modernAttacks: {
      ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
    },
  });
  assertEqual(attackerHeavenly.atk, 3,
    'F19 a defending-army unit keeps Heavenly Light when it initiates from the Attacker card');
  assertEqual(attackerHeavenly.def, 4,
    'F19 Heavenly Light army-side eligibility is independent of the attack-exchange card');
  assertEqual(attackerHeavenly.res, heavenly.res,
    'F19 Attacker-card Heavenly Light keeps the defending-army Resistance package');
  assertEqual(attackerHeavenly.modernAttacks.ranged.strength,
    heavenly.modernAttacks.ranged.strength,
    'F19 Attacker-card Heavenly Light keeps the conventional-Ranged package');
  assertClose(attackerHeavenly.modernAttacks.ranged.toHit,
    heavenly.modernAttacks.ranged.toHit,
    'F19 Attacker-card Heavenly Light keeps the physical-ranged To-Hit tail');
  assertClose(attackerHeavenly.modernAttacks.thrown.toHit,
    heavenly.modernAttacks.thrown.toHit,
    'F19 Attacker-card Heavenly Light keeps the Thrown To-Hit tail');
  assertEqual(attackerHeavenly.encMagicIndependentOfMaterial,
    heavenly.encMagicIndependentOfMaterial,
    'F19 Attacker-card Heavenly Light keeps the independent EncMagic grant');
  const rustedIntoNormalMaterial = warlord({
    prefix: 'b', weapon: 'mithril', markedAbilities: { heavenlyLight: true, rust: true },
    modernAttacks: { ranged: { strength: 4, type: 'missile' } },
  });
  assertClose(rustedIntoNormalMaterial.modernAttacks.ranged.toHit, 0.4,
    'F19 Heavenly Light reads the still-current base material after Rust strips Mithril');

  const moons = modern({
    atk: 2, def: 3, res: 6,
    markedAbilities: { badMoon: true, goodMoon: true },
    modernAttacks: {
      ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
    },
  });
  assertEqual(moons.atk, 3, 'F19 Good Moon raises positive current melee');
  assertEqual(moons.def, 4, 'F19 Good Moon raises Defense');
  assertEqual(moons.res, 3, 'F19 Bad Moon lowers base-normal Resistance by three');
  assertEqual(moons.modernAttacks.ranged.strength, 4,
    'F19 Good Moon raises current conventional Ranged');
  assertEqual(moons.modernAttacks.thrown.strength, 4,
    'F19 Good Moon leaves Thrown unchanged');

  const conjunction = modern({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    atk: 2, def: 3, res: 4,
    markedAbilities: { natureConjunction: true, goodMoon: true, badMoon: true },
    modernAttacks: {
      ranged: { strength: 3, type: 'magic' },
      fireBreath: { strength: 4, type: 'fire' },
    },
  });
  assertEqual(conjunction.atk, 4, 'F19 Nature Conjunction raises base-Fantastic melee');
  assertEqual(conjunction.def, 5, 'F19 Nature Conjunction raises base-Fantastic Defense');
  assertEqual(conjunction.res, 6, 'F19 Nature Conjunction raises base-Fantastic Resistance');
  assertEqual(conjunction.modernAttacks.ranged.strength, 5,
    'F19 Nature Conjunction raises conventional Ranged');
  assertEqual(conjunction.modernAttacks.fireBreath.strength, 4,
    'F19 Nature Conjunction leaves Breath unchanged');

  const warded = modern({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, markedAbilities: { spellWard: 'chaos' },
  });
  assertEqual(warded.def, 3, 'F19 matching Spell Ward removes three Defense');
  assertEqual(warded.res, 4, 'F19 matching Spell Ward removes three Resistance');
  assertClose(warded.toHitMelee, 0.1, 'F19 matching Spell Ward removes 20 percentage points To Hit');
  const wrongWard = modern({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, markedAbilities: { spellWard: 'nature' },
  });
  assertEqual(wrongWard.def, 6, 'F19 nonmatching Spell Ward is inert');
  // F195: the block at $005A5D36 is a settlement guard over five realm arms and nothing else,
  // and Q31 shows neither classifier tests Fantastic, so the ward is a realm test alone. The
  // reachable cases the removed term used to exclude are a realm-tagged non-Fantastic hero
  // (Torin in base CoM2; Mortu, Ravashack, Everchosen and Avatar in Warlord) and a Sanctified
  // non-clergy Warlord unit, whose `b:sanctify` writes the Life realm without Fantastic.
  for (const realm of ['nature', 'sorcery', 'chaos', 'life', 'death']) {
    const race = { nature: 'Nature', sorcery: 'Sorcery', chaos: 'Chaos', life: 'Life', death: 'Death' }[realm];
    const nonFantasticWard = modern({
      identity: { baseFantastic: false, baseRace: race }, unitType: 'normal',
      def: 6, res: 7, markedAbilities: { spellWard: realm },
    });
    assertEqual(nonFantasticWard.def, 3,
      `F195 the ${realm} Spell Ward arm reaches a non-Fantastic unit of that realm`);
    assertEqual(nonFantasticWard.res, 4,
      `F195 the ${realm} Spell Ward arm takes Resistance from a non-Fantastic unit of that realm`);
  }
  const unrealmedWard = modern({
    unitType: 'normal', def: 6, res: 7, markedAbilities: { spellWard: 'life' },
  });
  assertEqual(unrealmedWard.def, 6,
    'F195 Spell Ward is still inert against a unit the recalculation gives no realm');
  const sanctifiedWard = warlord({
    unitType: 'normal', def: 6, res: 7, markedAbilities: { sanctify: true, spellWard: 'life' },
  });
  assertEqual(sanctifiedWard.def, 3,
    'F195 a Sanctified non-clergy unit is Life-realmed without being Fantastic, and is warded');
  // The block's third write. The old term suppressed all three, so a check that reads only
  // Defense and Resistance would pass against a ward that had lost its To Hit arm.
  const chaosWardToHit = modern({
    identity: { baseFantastic: false, baseRace: 'Chaos' }, unitType: 'normal',
    def: 6, res: 7, markedAbilities: { spellWard: 'chaos' },
  });
  assertClose(chaosWardToHit.toHitMelee, 0.1,
    'F195 the ward takes 20 percentage points To Hit from a non-Fantastic unit of its realm');
  const chaosNoWardToHit = modern({
    identity: { baseFantastic: false, baseRace: 'Chaos' }, unitType: 'normal', def: 6, res: 7,
  });
  assertClose(chaosNoWardToHit.toHitMelee, 0.3,
    'F195 the same unit keeps its To Hit with no ward standing');
  // The hero path is distinct: `legacyUnitTypeFromLiveRecord` collapses a non-Fantastic hero to
  // `hero`, which carries no realm, so the ward can only reach it through the record's own
  // `race`, which is `realmOfUnitType`'s second argument. Torin (`units_com2.js` #34) is the base-CoM2 instance; Mortu,
  // Ravashack, Everchosen and Avatar are the Warlord ones.
  const lifeHeroWard = modern({
    isHero: true, identity: { baseFantastic: false, baseRace: 'Life' },
    def: 6, res: 7, markedAbilities: { spellWard: 'life' },
  });
  assertEqual(lifeHeroWard.def, 3,
    'F195 a realm-tagged non-Fantastic hero is warded through the live-identity realm fallback');
  const deathHeroWard = warlord({
    isHero: true, identity: { baseFantastic: false, baseRace: 'Death' },
    def: 6, res: 7, markedAbilities: { spellWard: 'death' },
  });
  assertEqual(deathHeroWard.def, 3,
    'F195 the Warlord Death heroes take the IsDeathUnit arm without being Fantastic');

  for (const auraSource of ['innateAbilities', 'markedAbilities']) {
    const auraMaximum = modern({
      res: 1, def: 2, innateAbilities: auraSource === 'innateAbilities' ? { resistanceToAll: 4 } : {},
      markedAbilities: { prayermasterAura: 6, divineBarrierAura: 3,
        ...(auraSource === 'markedAbilities' ? { resistanceToAll: 4 } : {}) },
    });
    assertEqual(auraMaximum.res, 7,
      `[${auraSource}] ` + ('F19 Prayermaster competes with Resistance to All by maximum rather than stacking'));
    assertEqual(auraMaximum.def, 5, `[${auraSource}] ` + ('F19 Divine Barrier adds its entered aura value'));
}

  const soulLinked = modern({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    markedAbilities: { soulLinkerAura: 5 },
  });
  assertClose(soulLinked.toHitMelee, 0.35, 'F19 Soul Linker raises Fantastic To Hit');
  assertClose(soulLinked.toBlock, 0.35, 'F19 Soul Linker raises Fantastic To Block');
  const cappedSoulLinker = modern({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    hitChance: 70, markedAbilities: { soulLinkerAura: 99 },
  });
  assertClose(cappedSoulLinker.toHitMelee, 1,
    'F19 late Soul Linker To Hit observes AttackRoll\'s natural 100% probability bound');
  const cappedSoulLinkerTraceIds = cappedSoulLinker.modifierTraces.toHitMelee.entries
    .map(entry => entry.id);
  assert(cappedSoulLinkerTraceIds.indexOf('chance:soulLinkerAura')
      < cappedSoulLinkerTraceIds.indexOf('chance:attackRollProbabilityBound'),
  'F19 chance trace attributes Soul Linker before the resolution probability bound');

  const auraChannels = modern({
    atk: 2, markedAbilities: { guidingBeaconAura: 4, leadershipAura: 5 },
    modernAttacks: {
      ranged: { strength: 3, type: 'missile' },
      thrown: { strength: 4, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
    },
  });
  assertEqual(auraChannels.atk, 7, 'F19 Leadership adds its full value to base-present melee');
  assertEqual(auraChannels.modernAttacks.ranged.strength, 9,
    'F19 Guiding Beacon and half Leadership stack on physical conventional Ranged');
  assertEqual(auraChannels.modernAttacks.thrown.strength, 4,
    'F19 modern auras leave Thrown unchanged');
  assertEqual(auraChannels.modernAttacks.fireBreath.strength, 5,
    'F19 modern auras leave Breath unchanged');
  const magicalLeadership = modern({
    markedAbilities: { leadershipAura: 5 },
    modernAttacks: { ranged: { strength: 3, type: 'magic' } },
  });
  assertEqual(magicalLeadership.modernAttacks.ranged.strength, 3,
    'F19 Leadership excludes magical conventional Ranged');

  const baseNormalMadeFantastic = modern({
    baseFantastic: false, baseRace: null, unitType: 'normal',
    markedAbilities: { destiny: true, badMoon: true, goodMoon: true, natureConjunction: true, spellWard: 'life', soulLinkerAura: 5, leadershipAura: 7 },
  });
  // Destiny's identity write is to `BaseUnits` ($0059A390), so it moves the **permanent** record
  // as well as the calculated one. The three astronomical events read `B.Fantastic` and therefore
  // change arms with it; the live-record gates change with the calculated flag (F192).
  const baseNormalMadeFantasticIds = baseNormalMadeFantastic.statTrace.map(event => event.id);
  for (const expectedId of ['natureConjunction', 'spellWard', 'soulLinkerAura']) {
    assert(baseNormalMadeFantasticIds.includes(expectedId),
      `F19 ${expectedId} observes its required base/live predicate after Destiny`);
  }
  for (const excludedId of ['badMoon', 'goodMoon', 'leadershipAura']) {
    assert(!baseNormalMadeFantasticIds.includes(excludedId),
      `F19 ${excludedId} rejects the opposite base/live predicate after Destiny`);
  }

  const baseFantasticMadeNormal = warlord({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    markedAbilities: { spiritLink: true, badMoon: true, goodMoon: true, natureConjunction: true, spellWard: 'nature', soulLinkerAura: 5, leadershipAura: 4 },
  });
  // Spirit Link's cast clears the **permanent** Fantastic flag (`buffs:spiritLink:fantastic`,
  // F245) while its region-`b` write asserts the calculated one, so this card is the separating
  // case for the three astronomical events: permanent `false`, calculated `true` where they run.
  // Before F245 both records were Fantastic here and the card could not tell the two reads apart;
  // the expected and excluded sets swap with the permanent flag, which is the claim.
  const baseFantasticMadeNormalIds = baseFantasticMadeNormal.statTrace.map(event => event.id);
  for (const expectedId of ['badMoon', 'goodMoon', 'spellWard', 'leadershipAura']) {
    assert(baseFantasticMadeNormalIds.includes(expectedId),
      `F19 ${expectedId} observes its required base/live predicate after Spirit Link`);
  }
  for (const excludedId of ['natureConjunction', 'soulLinkerAura']) {
    assert(!baseFantasticMadeNormalIds.includes(excludedId),
      `F19 ${excludedId} rejects the opposite base/live predicate after Spirit Link`);
  }

  const createdBesideRanged = warlord({
    markedAbilities: { lightningBlade: true },
    modernAttacks: { ranged: { strength: 4, type: 'missile' } },
  });
  assertEqual(createdBesideRanged.modernAttacks.ranged.strength, 4,
    'F19 Lightning Blade preserves coexisting conventional Ranged');
  assertEqual(createdBesideRanged.modernAttacks.lightningBreath.strength, 1,
    'F19 Lightning Blade creates strength-one Breath beside Ranged');
  const overwrittenLightning = warlord({
    markedAbilities: { lightningBlade: true },
    modernAttacks: { lightningBreath: { strength: 7, type: 'lightning' } },
  });
  assertEqual(overwrittenLightning.modernAttacks.lightningBreath.strength, 1,
    'F19 Lightning Blade assignment overwrites existing Breath when Thrown is absent');

  const workshopChannels = warlord({
    innateAbilities: { armorPiercing: true }, markedAbilities: { militaryWorkshop: true },
    modernAttacks: {
      ranged: { strength: 2, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 4, type: 'fire' },
    },
  });
  assertEqual(workshopChannels.modernAttacks.ranged.type, 'boulder',
    'F19 Military Workshop upgrades the base missile channel');
  assertEqual(workshopChannels.modernAttacks.ranged.strength, 4,
    'F19 Military Workshop adds two to existing-AP physical Ranged');
  assertEqual(workshopChannels.modernAttacks.thrown.strength, 7,
    'F19 Military Workshop adds four to existing-AP Thrown independently');
  assertEqual(workshopChannels.modernAttacks.fireBreath.strength, 8,
    'F19 Military Workshop adds four to Fire Breath independently');
  assertEqual(workshopChannels.abilities.poison, 1,
    'F19 Military Workshop grants Poison from any eligible modern channel');

  const workshopLightning = warlord({
    innateAbilities: { armorPiercing: true }, markedAbilities: { militaryWorkshop: true, lightningBlade: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(workshopLightning.modernAttacks.lightningBreath.strength, 8,
    'F19 Lightning Blade reads Workshop-upgraded permanent Thrown: 3 + 4 + 1');
  assertEqual(workshopLightning.modernAttacks.thrown, undefined,
    'F19 Lightning Blade clears the upgraded Thrown source');

  const baseNormalConvertedFantastic = warlord({
    innateAbilities: { armorPiercing: true }, markedAbilities: { militaryWorkshop: true, lightningBlade: true, ccDefense: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(baseNormalConvertedFantastic.abilities.liveFantastic, true,
    'F19 base-normal training regression reaches a later live-Fantastic conversion');
  assertEqual(baseNormalConvertedFantastic.modernAttacks.lightningBreath.strength, 8,
    'F19 permanent Workshop and Lightning Blade gates use base-normal identity');
  assertEqual(baseNormalConvertedFantastic.abilities.poison, 1,
    'F19 base-normal unit keeps the permanent Workshop poison after conversion');

  const baseFantasticClearedLive = warlord({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    innateAbilities: { armorPiercing: true }, markedAbilities: { militaryWorkshop: true, lightningBlade: true, spiritLink: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(baseFantasticClearedLive.abilities.liveFantastic, false,
    'F19 base-Fantastic training regression reaches a later live-normal conversion');
  assertEqual(baseFantasticClearedLive.modernAttacks.thrown.strength, 3,
    'F19 live-normal conversion does not retroactively admit permanent training writes');
  assertEqual(baseFantasticClearedLive.modernAttacks.lightningBreath, undefined,
    'F19 base-Fantastic unit does not gain Lightning Blade after Spirit Link');
  assertEqual(baseFantasticClearedLive.abilities.poison || 0, 0,
    'F19 base-Fantastic unit does not gain Workshop poison after Spirit Link');

  const warlordPermanentControlsInBaseCoM2 = modern({
    innateAbilities: { armorPiercing: true }, markedAbilities: { militaryWorkshop: true, rocketry: true, lightningBlade: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(warlordPermanentControlsInBaseCoM2.modernAttacks.thrown.strength, 3,
    'F19 Warlord permanent-channel controls are inert in base CoM2');
  assertEqual(warlordPermanentControlsInBaseCoM2.modernAttacks.lightningBreath, undefined,
    'F19 Warlord Lightning Blade cannot create a base-CoM2 channel');
  assertEqual(warlordPermanentControlsInBaseCoM2.abilities.poison || 0, 0,
    'F19 Warlord Workshop/Rocketry cannot grant base-CoM2 Poison');

  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    const inert = ctx.deriveUnitStats(baseUnitInput({
      version, atk: 2, def: 3, res: 4,
      markedAbilities: { darkForce: true, heavenlyLight: true, badMoon: true, goodMoon: true, natureConjunction: true, spellWard: 'life', guidingBeaconAura: 5, prayermasterAura: 5, divineBarrierAura: 5, soulLinkerAura: 5, leadershipAura: 5 },
    }));
    assertEqual(inert.atk, 2, `F19 modern controls are inert in ${version} melee`);
    assertEqual(inert.def, 3, `F19 modern controls are inert in ${version} Defense`);
    assertEqual(inert.res, 4, `F19 modern controls are inert in ${version} Resistance`);
  }
  // `heavenlyLight` left this list with F49: CoM 1 has its own Heavenly Light block at
  // com1:0x905BB, so the control is live there and only the MoM loop above still holds it inert.
  const inertInCoM1 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', atk: 2, def: 3, res: 4,
    markedAbilities: { darkForce: true, badMoon: true, goodMoon: true, natureConjunction: true, spellWard: 'life', prayermasterAura: 5, leadershipAura: 5 },
  }));
  assertEqual(inertInCoM1.atk, 2, 'F19 modern-only controls are inert in CoM 1 melee');
  assertEqual(inertInCoM1.def, 3, 'F19 modern-only controls are inert in CoM 1 Defense');
  assertEqual(inertInCoM1.res, 4, 'F19 modern-only controls are inert in CoM 1 Resistance');
}

function runF23Checks(ctx) {
  const abilityDefs = evalInContext(ctx, 'ABILITY_DEFS');
  const enchantmentDefs = evalInContext(ctx, 'ENCHANTMENT_DEFS');
  const causeFearTooltip = abilityDefs.find(def => def.label === 'Cause Fear').tooltip;
  const cloakOfFearTooltip = enchantmentDefs.find(def => def.label === 'Cloak of Fear').tooltip;
  const deathImmunityTooltip = abilityDefs.find(def => def.label === 'Death Immunity').tooltip;
  for (const [label, tooltip] of [
    ['Cause Fear', causeFearTooltip],
    ['Cloak of Fear', cloakOfFearTooltip],
  ]) {
    assert(tooltip.includes('Opponents with Magic Immunity or Righteousness are unaffected.'),
      `F23 ${label} keeps universal blockers separate from versioned Death Immunity`);
    assert(tooltip.includes('MoM 1.31 & 1.60: Death Immunity skips the roll;'),
      `F23 ${label} retains the DOS Death-Immunity skip`);
    assert(tooltip.includes('CoM 1: Death Immunity skips the −3 roll.'),
      `F23 ${label} retains the CoM 1 Death-Immunity skip`);
    assert(tooltip.includes('CoM 2: Intrinsic/base Death Immunity skips the −3 roll;'),
      `F23 ${label} documents the CoM2 base-record gate`);
    assert(tooltip.includes('Warlord: Intrinsic/base Death Immunity skips the −3 roll;'),
      `F23 ${label} documents the Warlord base-record gate`);
    assert(tooltip.includes('recalculation-only Death Immunity still rolls.'),
      `F23 ${label} documents recalculation-only grants`);
    for (const line of tooltip.split('\n')) {
      assert(line.length <= 75, `F23 ${label} tooltip line exceeds 75 characters: ${line}`);
    }
  }
  for (const token of [
    'MoM 1.31 & 1.60: Also skips Cause Fear rolls.',
    'CoM 1: Also skips Cause Fear rolls.',
    'CoM 2: Cause Fear checks intrinsic/base Death Immunity;',
    'Warlord: Cause Fear checks intrinsic/base Death Immunity;',
    'recalculation-only grants do not skip its roll.',
  ]) {
    assert(deathImmunityTooltip.includes(token),
      `F23 Death Immunity tooltip includes ${token}`);
  }
  for (const line of deathImmunityTooltip.split('\n')) {
    assert(line.length <= 75,
      `F23 Death Immunity tooltip line exceeds 75 characters: ${line}`);
  }

  const fearPhaseChance = (feared, fearSource, version) => {
    const result = ctx.resolveCombat(feared, fearSource,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
    const fearPhase = result.phases.find(phase => phase.mode === 'feared');
    assert(fearPhase, `${version}: defender Cause Fear phase is present`);
    return fearPhase.atkDist[1] || 0;
  };
  for (const fearSourceHalf of ['innateAbilities', 'markedAbilities']) {
    const fearedChance = (version, sourceInput) => {
      const feared = ctx.deriveUnitStats(baseUnitInput({
        version, prefix: 'a', figs: 1, atk: 5, def: 0, res: 5, hp: 10,
        hitChance: 70, ...sourceInput,
      }));
      const fearSource = ctx.deriveUnitStats(baseUnitInput({
        version, prefix: 'b', figs: 1, atk: 1, def: 0, res: 5, hp: 20,
        [fearSourceHalf]: { fear: true },
      }));
      return { feared, fearSource, chance: fearPhaseChance(feared, fearSource, version) };
    };

    for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
      const intrinsic = fearedChance(version, { innateAbilities: { deathImmunity: true } });
      assertEqual(intrinsic.feared.baseDeathImmunity, true,
        `[${fearSourceHalf}] ` + (`F23 ${version} preserves intrinsic Death Immunity on the base record`));
      assertClose(intrinsic.chance, 0,
        `[${fearSourceHalf}] ` + (`F23 ${version} intrinsic Death Immunity skips Cause Fear`));

      const bloodLust = fearedChance(version, { markedAbilities: { bloodLust: true } });
      assertEqual(bloodLust.feared.baseDeathImmunity, false,
        `[${fearSourceHalf}] ` + (`F23 ${version} Blood Lust does not rewrite base Death Immunity`));
      assertClose(bloodLust.chance, 0.8,
        `[${fearSourceHalf}] ` + (`F23 ${version} Blood Lust-derived Death Immunity still rolls against Cause Fear`));

      for (const immunitySource of ['innateAbilities', 'markedAbilities']) {
        const magicImmune = fearedChance(version, { [immunitySource]: { magicImmunity: true } });
        assertEqual(magicImmune.feared.baseDeathImmunity, false,
          `[${fearSourceHalf}/${immunitySource}] ` + (`F23 ${version} Magic Immunity remains distinct from base Death Immunity`));
        assertEqual(ctx.effectiveResistance(magicImmune.feared, version, 'death'), 100,
          `[${fearSourceHalf}/${immunitySource}] ` + (`F23 ${version} Magic Immunity assigns effective Death resistance to 100`));
        assertClose(ctx.fearFailProb(5, magicImmune.feared.abilities, version, false), 0.8,
          `[${fearSourceHalf}/${immunitySource}] ` + (`F23 ${version} fear helper does not replace the modern effective-resistance path`));
        assertClose(magicImmune.chance, 0,
          `[${fearSourceHalf}/${immunitySource}] ` + (`F23 ${version} Magic Immunity still blocks Cause Fear through effective resistance`));
  }

      const transported = JSON.parse(JSON.stringify(bloodLust.feared));
      const transportedSource = JSON.parse(JSON.stringify(bloodLust.fearSource));
      assertEqual(transported.baseDeathImmunity, false,
        `[${fearSourceHalf}] ` + (`F23 ${version} Matrix-style structured transport preserves base Death Immunity`));
      assertClose(fearPhaseChance(transported, transportedSource, version), 0.8,
        `[${fearSourceHalf}] ` + (`F23 ${version} Matrix-style resolver path keeps calculated Death Immunity rollable`));

      const directIntrinsic = { ...intrinsic.feared };
      delete directIntrinsic.baseDeathImmunity;
      assertClose(fearPhaseChance(directIntrinsic, intrinsic.fearSource, version), 0,
        `[${fearSourceHalf}] ` + (`F23 ${version} direct resolver callers treat supplied Death Immunity as intrinsic`));
      const directBloodLust = { ...bloodLust.feared };
      delete directBloodLust.baseDeathImmunity;
      assertClose(fearPhaseChance(directBloodLust, bloodLust.fearSource, version), 0.8,
        `[${fearSourceHalf}] ` + (`F23 ${version} direct resolver normalization captures base immunity before Blood Lust`));
    }

    const animated = fearedChance('com2_1.05.11', { markedAbilities: { animated: true } });
    assertClose(animated.chance, 0.8,
      `[${fearSourceHalf}] ` + ('F23 CoM2 Animated-derived Death Immunity still rolls against Cause Fear'));

    const rebuild = fearedChance('com2_warlord_1.5.12.9', { markedAbilities: { rebuild: true } });
    assertClose(rebuild.chance, 0.8,
      `[${fearSourceHalf}] ` + ('F23 Warlord Rebuild-derived Death Immunity still rolls against Cause Fear'));

    const divineProtection = fearedChance('com2_warlord_1.5.12.9', {
      markedAbilities: { divineProtection: true },
    });
    assertEqual(divineProtection.feared.abilities.deathImmunity, true,
      `[${fearSourceHalf}] ` + ('F23 Warlord Divine Protection still grants calculated Death Immunity'));
    assertEqual(divineProtection.feared.baseDeathImmunity, false,
      `[${fearSourceHalf}] ` + ('F23 Warlord Divine Protection does not rewrite base Death Immunity'));
    assertClose(divineProtection.chance, 0.7,
      `[${fearSourceHalf}] ` + ('F23 Warlord Divine Protection-derived Death Immunity still rolls with Lucky resistance'));
}

  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const normalizedUndead = ctx.normalizeCombatUnit({
      abilities: { undead: true }, unitType: 'normal', identity: { baseFantastic: false },
    }, version);
    assertEqual(normalizedUndead.abilities.deathImmunity, true,
      `F23 ${version} compatibility normalization still derives Undead Death Immunity`);
    assertClose(ctx.fearFailProb(5, normalizedUndead.abilities, version, false), 0,
      `F23 ${version} Cause Fear still uses effective Death Immunity`);
  }
}

function runF50F51F53Checks(ctx) {
  const derive = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', ...overrides,
  }));

  const beaconRanged = derive({
    rtb: 3, rtbType: 'missile', markedAbilities: { guidingBeaconAura: 5 },
  });
  assertEqual(beaconRanged.rtb, 8,
    'F50 CoM 1 Guiding Beacon adds its side maximum to conventional Ranged');
  for (const rtbType of ['boulder', 'magic_c', 'magic_n', 'magic_s']) {
    const eligible = derive({
      rtb: 3, rtbType, markedAbilities: { guidingBeaconAura: 5 },
    });
    assertEqual(eligible.rtb, 8,
      `F50 CoM 1 Guiding Beacon includes ${rtbType}`);
  }
  for (const rtbType of ['thrown', 'fire', 'lightning', 'gaze_stoning', 'gaze_death']) {
    const excluded = derive({
      rtb: 3, rtbType, markedAbilities: { guidingBeaconAura: 5 },
    });
    assertEqual(excluded.rtb, 3,
      `F50 CoM 1 Guiding Beacon excludes ${rtbType}`);
  }

  const barrier = derive({ def: 2, markedAbilities: { divineBarrierAura: 5 } });
  assertEqual(barrier.def, 7,
    'F50 CoM 1 Divine Barrier adds its side maximum without a unit gate');
  const linked = derive({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    markedAbilities: { soulLinkerAura: 5 },
  });
  assertClose(linked.toHitMelee, 0.33,
    'F50 CoM 1 Soul Linker gives ceil(value / 2) To Hit');
  assertClose(linked.toBlock, 0.32,
    'F50 CoM 1 Soul Linker gives floor(value / 2) To Block');
  const unlinkedNormal = derive({ markedAbilities: { soulLinkerAura: 5 } });
  assertClose(unlinkedNormal.toHitMelee, 0.3,
    'F50 CoM 1 Soul Linker rejects non-Fantastic units');
  assertClose(unlinkedNormal.toBlock, 0.3,
    'F50 CoM 1 Soul Linker leaves non-Fantastic To Block unchanged');

  const orderedAuras = derive({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    rtb: 4, rtbType: 'missile', def: 8, nodeAura: 'nature',
    markedAbilities: { guidingBeaconAura: 3, divineBarrierAura: 4, soulLinkerAura: 5, mindStorm: true, warpAttack: true, warpDefense: true },
  });
  const orderedIds = orderedAuras.statTrace.map(event => event.id);
  for (const [earlier, later] of [
    ['nodeAura', 'guidingBeaconAura'],
    ['guidingBeaconAura', 'divineBarrierAura'],
    ['divineBarrierAura', 'soulLinkerAura'],
    ['soulLinkerAura', 'mindStorm'],
    ['mindStorm', 'warpAttack'],
    ['warpAttack', 'warpDefense'],
  ]) {
    assert(orderedIds.indexOf(earlier) >= 0 && orderedIds.indexOf(earlier) < orderedIds.indexOf(later),
      `F50 CoM 1 source order keeps ${earlier} before ${later}`);
  }

  const warded = derive({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, markedAbilities: { realmWard: 'chaos' },
  });
  assertEqual(warded.def, 3, 'F51 matching CoM 1 Realm Ward removes three Defense');
  assertEqual(warded.res, 4, 'F51 matching CoM 1 Realm Ward removes three Resistance');
  assertClose(warded.toHitMelee, 0.1,
    'F51 matching CoM 1 Realm Ward removes 20 percentage points To Hit');
  const wrongWard = derive({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, markedAbilities: { realmWard: 'nature' },
  });
  assertEqual(wrongWard.def, 6, 'F51 nonmatching CoM 1 Realm Ward is inert');
  const normalWard = derive({ def: 6, res: 7, markedAbilities: { realmWard: 'chaos' } });
  assertEqual(normalWard.def, 6, 'F51 CoM 1 Realm Ward rejects non-Fantastic units');
  for (const realm of ['nature', 'sorcery', 'chaos', 'life', 'death']) {
    const matchingWard = derive({
      baseFantastic: true,
      baseRace: realm[0].toUpperCase() + realm.slice(1),
      unitType: `fantastic_${realm}`,
      def: 6, res: 7, markedAbilities: { realmWard: realm },
    });
    assertEqual(matchingWard.def, 3,
      `F51 CoM 1 ${realm} Realm Ward maps to its matching Fantastic realm`);
  }

  const wardOrder = derive({
    isHero: true, baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    def: 6, res: 9, markedAbilities: { supremeLight: true, realmWard: 'life', tactician: true },
  });
  const wardOrderIds = wardOrder.statTrace.map(event => event.id);
  assert(wardOrderIds.indexOf('supremeLight') < wardOrderIds.indexOf('realmWard')
      && wardOrderIds.indexOf('realmWard') < wardOrderIds.indexOf('tactician'),
  'F51 CoM 1 Realm Ward stays between Supreme Light and Tactician');

  const warpedBeforeSupremeLight = derive({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    def: 1, res: 20,
    markedAbilities: { mindStorm: true, warpDefense: true, supremeLight: true },
  });
  assertEqual(warpedBeforeSupremeLight.def, 4,
    'F53 CoM 1 signed -4 / 3 truncates to -1 before Supreme Light adds 5');
  const warpedBeforeTactician = derive({
    isHero: true, unitType: 'hero', def: 1,
    markedAbilities: { mindStorm: true, warpDefense: true, tactician: true },
  });
  assertEqual(warpedBeforeTactician.def, 1,
    'F53 CoM 1 signed -4 / 3 truncates to -1 before hero Tactician adds 2');
  const warpTraceIds = warpedBeforeTactician.statTrace.map(event => event.id);
  assert(warpTraceIds.indexOf('mindStorm') < warpTraceIds.indexOf('warpDefense')
      && warpTraceIds.indexOf('warpDefense') < warpTraceIds.indexOf('tactician'),
  'F53 CoM 1 trace preserves negative pre-Warp Defense and later Tactician ordering');

  for (const version of [
    'mom_1.31', 'mom_cp_1.60.00', 'com2_1.05.11', 'com2_warlord_1.5.12.9',
  ]) {
    const inert = ctx.deriveUnitStats(baseUnitInput({
      version, baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
      rtb: 3, rtbType: 'missile', def: 6, res: 7,
      ...(version.startsWith('com2')
        ? { modernAttacks: { ranged: { strength: 3, type: 'missile' } } } : {}),
      markedAbilities: { realmWard: 'chaos', guidingBeaconAura: 0, divineBarrierAura: 0, soulLinkerAura: 0 },
    }));
    assertEqual(inert.def, 6, `F51 Realm Ward is inert in ${version}`);
    assertEqual(inert.res, 7, `F51 Realm Ward leaves Resistance unchanged in ${version}`);
    assertClose(inert.toHitMelee, 0.3, `F51 Realm Ward leaves To Hit unchanged in ${version}`);
  }
  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    const inertAuras = ctx.deriveUnitStats(baseUnitInput({
      version, baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
      rtb: 3, rtbType: 'missile', def: 6,
      markedAbilities: { guidingBeaconAura: 5, divineBarrierAura: 5, soulLinkerAura: 5 },
    }));
    assertEqual(inertAuras.rtb, 3, `F50 side maxima are inert in ${version} Ranged`);
    assertEqual(inertAuras.def, 6, `F50 side maxima are inert in ${version} Defense`);
    assertClose(inertAuras.toHitMelee, 0.3, `F50 side maxima are inert in ${version} To Hit`);
    assertClose(inertAuras.toBlock, 0.3, `F50 side maxima are inert in ${version} To Block`);
  }
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const unchangedModern = ctx.deriveUnitStats(baseUnitInput({
      version, baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
      rtb: 3, rtbType: 'missile', def: 6,
      modernAttacks: { ranged: { strength: 3, type: 'missile' } },
      markedAbilities: { guidingBeaconAura: 5, divineBarrierAura: 5, soulLinkerAura: 5 },
    }));
    assertEqual(unchangedModern.rtb, 8, `F50 modern Guiding Beacon remains full-value in ${version}`);
    assertEqual(unchangedModern.def, 11, `F50 modern Divine Barrier remains full-value in ${version}`);
    assertClose(unchangedModern.toHitMelee, 0.35,
      `F50 modern Soul Linker remains full-value To Hit in ${version}`);
    assertClose(unchangedModern.toBlock, 0.35,
      `F50 modern Soul Linker remains full-value To Block in ${version}`);
  }

  const unchangedWarpCases = [
    ['mom_1.31', 9, 4],
    ['mom_cp_1.60.00', 9, 4],
    ['com2_1.05.11', 9, 3],
    ['com2_warlord_1.5.12.9', 9, 3],
  ];
  for (const [version, defense, expected] of unchangedWarpCases) {
    const warped = ctx.deriveUnitStats(baseUnitInput({
      version, def: defense, markedAbilities: { warpDefense: true },
    }));
    assertEqual(warped.def, expected, `F53 unchanged positive Warp Defense in ${version}`);
  }
}

function runR9G1eChecks(ctx) {
  const versions = [
    'mom_1.31', 'mom_cp_1.60.00', 'com_6.08',
    'com2_1.05.11', 'com2_warlord_1.5.12.9',
  ];
  const materials = ['magic', 'mithril', 'adamantium'];
  for (const version of versions) {
    for (const weapon of materials) {
      const melee = ctx.deriveUnitStats(baseUnitInput({ version, weapon, atk: 2 }));
      assertClose(melee.toHitMelee, 0.4,
        `R9-G1e ${version} ${weapon} material adds 10% to positive melee`);
      const noMelee = ctx.deriveUnitStats(baseUnitInput({ version, weapon, atk: 0 }));
      assertClose(noMelee.toHitMelee, 0.3,
        `R9-G1e ${version} ${weapon} material does not create a melee chance channel`);

      for (const rtbType of ['missile', 'boulder', 'thrown']) {
        const physical = ctx.deriveUnitStats(baseUnitInput({
          version, weapon, rtb: 2, rtbType,
          ...(version.startsWith('com2')
            ? { modernAttacks: modernRecordForSharedSlot(ctx, rtbType, 2) } : {}),
        }));
        assertClose(physical.toHitRtb, 0.4,
          `R9-G1e ${version} ${weapon} material adds 10% to ${rtbType}`);
        assert(physical.modifierTraces.toHitShared.entries
          .some(entry => entry.source.id === 'weapon'),
        `R9-G1e ${version} ${weapon} ${rtbType} trace attributes the material write`);
      }

      // Each family's own magical token: the DOS engines keep the realm their
      // `Battle_Unit_Attack_Magic_Realm` table really has, the modern ones do not.
      const magicalToken = version.startsWith('com2') ? 'magic' : 'magic_c';
      for (const rtbType of [magicalToken, 'fire', 'lightning']) {
        const excluded = ctx.deriveUnitStats(baseUnitInput({
          version, weapon, rtb: 2, rtbType,
          ...(version.startsWith('com2')
            ? { modernAttacks: modernRecordForSharedSlot(ctx, rtbType, 2) } : {}),
        }));
        assertClose(excluded.toHitRtb, 0.3,
          `R9-G1e ${version} ${weapon} material excludes ${rtbType}`);
      }

      // The gaze exclusion is a DOS-only claim. Only the shared slot can hold a gaze, so only
      // there do a threshold and a strength exist that the material block could have reached;
      // the modern record states its gazes as independent ability fields the block never
      // writes, and its `rtbType` names nothing at all. The axis reads `GAZE_TYPES` rather
      // than restating it, so a token that is not a gaze cannot be swept here vacuously.
      if (!version.startsWith('com2')) {
        for (const gazeType of evalInContext(ctx, 'GAZE_TYPES')) {
          const gazed = ctx.deriveUnitStats(baseUnitInput({
            version, weapon, rtb: 2, rtbType: gazeType,
          }));
          assertClose(gazed.toHitRtb, 0.3,
            `R9-G1e ${version} ${weapon} material excludes ${gazeType}`);
          assertEqual(gazed.rtb, 2,
            `R9-G1e ${version} ${weapon} material adds no strength to ${gazeType}`);
        }
      }
    }
  }

  const dosZeroThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', weapon: 'mithril', rtb: 0, rtbType: 'thrown',
  }));
  assertClose(dosZeroThrown.toHitRtb, 0.4,
    'R9-G1e DOS material Thrown gate is type-only even at zero strength');
  const modernZeroThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', weapon: 'mithril', rtb: 0, rtbType: 'thrown',
    modernAttacks: {},
  }));
  assertClose(modernZeroThrown.toHitRtb, 0.3,
    'R9-G1e modern material Thrown gate requires positive current strength');
  assertEqual(modernZeroThrown.rtbToHitWpnBonus, 0,
    'R9-G1e modern zero-strength Thrown reports no applied material bonus');
  const modernZeroRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', weapon: 'mithril', rtb: 0, rtbType: 'missile',
    modernAttacks: { ranged: { strength: 0, type: 'missile' } },
  }));
  assertClose(modernZeroRanged.toHitRtb, 0.4,
    'R9-G1e modern non-magical Ranged material gate has no strength test');
  const createdModernThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', weapon: 'mithril', atk: 1,
    rtb: 0, rtbType: 'none', modernAttacks: {},
    innateAbilities: { outlanderWizard: true }, markedAbilities: { explosive: true },
  }));
  assertClose(createdModernThrown.toHitRtb, 0.4,
    'R9-G1e modern material gate reads a Thrown field created before ApplyMagicWeapons');
  const trueLightCreatedMelee = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', weapon: 'mithril', atk: 0,
    identity: ctx.createUnitIdentity({
      version: 'com2_warlord_1.5.12.9', baseRace: 'Life', baseFantastic: false,
    }),
    trueLight: true,
  }));
  assert(trueLightCreatedMelee.statTrace.some(event => event.id === 'trueLight'
      && event.changes.atk && event.changes.atk.from === 0 && event.changes.atk.to === 1),
  'R9-G1e Warlord True Light creates live melee before ApplyMagicWeapons');
  assertClose(trueLightCreatedMelee.toHitMelee, 0.3,
    'R9-G1e modern material melee gate still reads the zero persistent/base channel');

  const comFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', weapon: 'mithril', rtb: 2, rtbType: 'missile',
    markedAbilities: { focusMagic: true },
  }));
  assertClose(comFocus.toHitRtb, 0.3,
    'R9-G1e CoM 1 Focus Magic suppresses the material shared-slot To-Hit write');
  const modernFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', weapon: 'mithril', rtb: 2, rtbType: 'missile',
    markedAbilities: { focusMagic: true },
    modernAttacks: { ranged: { strength: 2, type: 'missile' } },
  }));
  assertClose(modernFocus.modernAttacks.ranged.toHit, 0.3,
    'R9-G1e modern Focus conversion is magical before ApplyMagicWeapons');

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const thrownAttacker = ctx.deriveUnitStats(baseUnitInput({
      version, weapon: 'magic', atk: 1, def: 0, hp: 10,
      modernAttacks: { thrown: { strength: 1, type: 'thrown' } },
    }));
    assertClose(thrownAttacker.modernAttacks.thrown.toHit, 0.4,
      `R9-G1e ${version} writes the material bonus to the independent Thrown channel`);
    const target = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', atk: 0, def: 0, hp: 10,
    }));
    const thrownResult = ctx.resolveCombat(thrownAttacker, target,
      { version, isRanged: false, wallOfFire: false, distance: 1 });
    assertClose(thrownResult.totalDmgToB[0], 0.36,
      `R9-G1e ${version} combat consumes both 40% material melee and Thrown chances`);
    assertClose(thrownResult.totalDmgToB[1], 0.48,
      `R9-G1e ${version} combat combines the material melee and Thrown channels`);
    assertClose(thrownResult.totalDmgToB[2], 0.16,
      `R9-G1e ${version} combat retains independent material melee and Thrown hits`);

    const rangedAttacker = ctx.deriveUnitStats(baseUnitInput({
      version, weapon: 'magic', atk: 0, def: 0, hp: 10,
      modernAttacks: { ranged: { strength: 1, type: 'missile' } },
    }));
    assertClose(rangedAttacker.modernAttacks.ranged.toHit, 0.4,
      `R9-G1e ${version} writes the material bonus to the independent Ranged channel`);
    const rangedResult = ctx.resolveCombat(rangedAttacker, target,
      { version, isRanged: true, wallOfFire: false, distance: 1 });
    assertClose(rangedResult.totalDmgToB[0], 0.6,
      `R9-G1e ${version} combat consumes the 40% material Ranged miss chance`);
    assertClose(rangedResult.totalDmgToB[1], 0.4,
      `R9-G1e ${version} combat consumes the 40% material Ranged hit chance`);
  }
}


// --- priority-prerequisites, migrated out of Playwright by F268.5 ---
//
// Tag: regression.  Anchor: F7, F52, F54, F55, R9-G1g.  `TESTS.md` keeps this suite's own
// section; the command there names this family, not the Playwright file it came from.
//
// F268.5 measured all 25 of the retired spec's `expect` calls by mutation, against the enriched
// preset corpus (1,161 fixtures, four moments per side plus ten damage-category moments) and
// against the rest of the Node tree.  What follows is everything that survived that: the claims a
// wrong implementation breaks with **every other gate in the repository still green**.
//
// **What F268.5 retired here, each shown covered elsewhere by mutation:**
//
//   * F7's ties-to-even rounding and its shipped 34% ratio.  Rounding half away from zero fails
//     `derive_unit_stats.js`' own `supernaturalMinDamageForHits` assertions; a 33% ratio fails
//     those *and* the `supernaturalFormulaCoM2` fixture.
//   * R9-G1g's claim that CoM 1 Supernatural supplies no callback and no minimum damage.  Making
//     the `$2000` trait live fails `supernaturalFormulaCoM` and `derive_unit_stats.js` both.
//   * F22's two Blood Lust gates.  Dropping the Fantastic-target test fails two fixtures and
//     `phases.js:51`; dropping the version test fails `version_scope.js:336`.
//   * M6's five Lava Smelter grants and the permanent-Fantastic gate that admits them.  Dropping
//     the gate fails `ability_origins.js:416` and a fixture; the grants themselves are
//     `runLavaSmelterGrantChecks`' subject, over both the control and the legacy selector, and the
//     two protections' stacking is `lavaSmelterProtectionsStackWarlord`'s.
//   * F52's Defence write `trunc(res / 3)`.  A `/ 4` divisor fails `backlog_checks.js`' own F53
//     assertion and the corpus.
//   * Warlord's `magic_lightning` projectile being a magical ranged type — the corpus catches it.
//   * The roster-control DOM reads (checked, disabled, hidden), the two `supernatural` tooltip
//     wording assertions, and the 11-name CoM Supernatural carrier list.  See the F268.5 report's
//     coverage-given-up paragraph; the *behaviour* those tooltips describe is
//     `supernaturalFormulaCoM`'s.
//
// **What stayed, because mutation showed nothing else reaches it.**  The Supreme Light
// eligibility table is the bulk of it: four of its alternatives, in both directions, are asserted
// by no fixture and no other Node family.  The reason is corpus composition — every shipped
// `supremeLight` fixture is CoM 2 or Warlord and none pairs the enchantment with Focus Magic, a
// Life race, or a permanently-magical ranged field.  `STEP_VERSION_SCOPES` cannot stand in for
// them either: the engine difference is inside `supremeLightActiveForUnit`, not in the scope
// table, and `c:supremeLight`'s row is identical in the two engines that disagree.
function runPriorityPrerequisitesChecks(ctx) {
  const read = expression => evalInContext(ctx, expression);
  const supremeLight = (abilities, unitType, version, rangedContext) =>
    read('supremeLightActiveForUnit')(abilities, unitType, version, rangedContext || {});

  // [PP-1] F7's moddable half.  `supernaturalMinDamageForHits` takes MODDING.INI's
  // SupernaturalStarts and SupernaturalRatio as a third argument, and **no code in `Calculator/`
  // passes it** — `supernaturalMinDamageFn` is the only caller and it calls with two arguments.
  // So the shipped tables are the only values any fixture can reach, and hardcoding 0/34 in place
  // of the argument passes the whole tree.  That the formula is the moddable one rather than the
  // shipped constants is `combat_abilities.js`' stated claim, so it is asserted here rather than
  // left to a parameter nothing exercises.  See the F268.5 report's close block: whether that
  // extension point should exist at all is the user's call, not this suite's.
  assertIs(read('supernaturalMinDamageForHits')(15, 'com2_1.05.11', { starts: 5, ratio: 25 }), 2,
    '[PP-1] F7 Supernatural applies MODDING.INI starts and ratio rather than the shipped 0/34');

  // [PP-2..PP-7] F52 — CoM 1's eligibility alternatives.  CoM 1 has one arm the modern builds do
  // not: a Focus Magic carrier qualifies even with no magical ranged field of its own
  // (`unitcalc.c`; the modern block at `Units.RecalculateUnits.pas:2632` has no such test).
  const com1 = 'com_6.08';
  assertIs(supremeLight({ supremeLight: true }, 'normal', com1,
    { liveRangedType: 'magic_c', baseRangedType: 'missile' }), true,
  '[PP-2] F52 CoM 1 Supreme Light admits a live magical ranged field');
  assertIs(supremeLight({ supremeLight: true }, 'normal_life', com1), true,
    '[PP-3] F52 CoM 1 Supreme Light admits a Life race');
  assertIs(supremeLight({ supremeLight: true, caster: true }, 'normal', com1), true,
    '[PP-4] F52 CoM 1 Supreme Light admits a mana pool');
  assertIs(supremeLight({ supremeLight: true, focusMagic: true }, 'normal', com1), true,
    '[PP-5] F52 CoM 1 Supreme Light admits a Focus Magic carrier');
  assertIs(supremeLight({ supremeLight: true }, 'normal', com1,
    { liveRangedType: 'missile', baseRangedType: 'magic_s' }), true,
  '[PP-6] F52 CoM 1 Supreme Light admits a permanently magical ranged field');
  assertIs(supremeLight({ supremeLight: true }, 'normal', com1,
    { liveRangedType: 'missile', baseRangedType: 'missile' }), false,
  '[PP-7] F52 CoM 1 Supreme Light refuses a unit meeting none of its alternatives');

  // [PP-8..PP-14] R9-G1g — the compiled-modern table, and the one alternative it **refuses**.
  // The refusal is the load-bearing half and the reason this block is not a restatement of the
  // one above: adding Focus Magic to the modern arm passes the entire corpus and the entire Node
  // tree, because no shipped fixture marks Focus Magic beside Supreme Light.
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    assertIs(supremeLight({ supremeLight: true }, 'normal', version,
      { liveRangedType: 'magic', baseRangedType: 'missile' }), true,
    `[PP-8] R9-G1g ${version} Supreme Light admits a live magical ranged field`);
    assertIs(supremeLight({ supremeLight: true }, 'normal', version,
      { liveRangedType: 'missile', baseRangedType: 'magic' }), true,
    `[PP-9] R9-G1g ${version} Supreme Light admits a permanently magical ranged field`);
    assertIs(supremeLight({ supremeLight: true }, 'fantastic_life', version), true,
      `[PP-10] R9-G1g ${version} Supreme Light admits a Fantastic Life unit`);
    assertIs(supremeLight({ supremeLight: true }, 'normal_life', version), true,
      `[PP-11] R9-G1g ${version} Supreme Light admits a normal Life unit`);
    assertIs(supremeLight({ supremeLight: true, caster: true }, 'normal', version), true,
      `[PP-12] R9-G1g ${version} Supreme Light admits a mana pool`);
    assertIs(supremeLight({ supremeLight: true, focusMagic: true }, 'normal', version), false,
      `[PP-13] R9-G1g ${version} Supreme Light does NOT admit Focus Magic alone, as CoM 1 does`);
    assertIs(supremeLight({ supremeLight: true }, 'normal', version,
      { liveRangedType: 'missile', baseRangedType: 'missile' }), false,
    `[PP-14] R9-G1g ${version} Supreme Light refuses a unit meeting none of its alternatives`);
  }

  // [PP-15, PP-16] F54/F55 — two combat-summon identity conversions that base CoM 2 makes and
  // Warlord does not.  `STEP_VERSION_SCOPES` says `SCOPE_MODERN` for both keys (`steps.js:214`,
  // `:217`), so the scope table *permits* Warlord and cannot be the guard; the refusal is the
  // steps' own `when: () => isBaseCoM2 && ...` (`stats_identity.js:349`, `:354`).  Widening both
  // to `isModern` passes the corpus, `version_scope.js` and `ability_origins.js` alike, and the
  // Node checks that already name these two steps (`resolution_steps.js:322-324`,
  // `identity.js:400`) only assert that they *fire* in base CoM 2.  The F268.5 report puts the
  // question of a mechanical predicate-scope check to the user; until then this is the guard.
  const warlord = 'com2_warlord_1.5.12.9';
  const summoned = templateId => ctx.deriveUnitStats(baseUnitInput({
    version: warlord, atk: 1, def: 0, res: 0, hp: 10,
    markedAbilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({
      version: warlord, templateId,
      baseRace: templateId === 37 ? 'Special' : 'High Men',
      baseFantastic: false,
    }),
  }));
  const construct = summoned(37);
  assertIs(construct.abilities.liveRace, 'Special',
    '[PP-15] F54 Warlord keeps base CoM 2\'s Construct Catapult Nature conversion out');
  assert(!construct.identityTrace.some(step => step.id === 'constructCatapult'),
    '[PP-15] F54 Warlord composes no a:constructCatapult step');
  const paladins = summoned(113);
  assertIs(paladins.abilities.liveRace, 'High Men',
    '[PP-16] F55 Warlord keeps base CoM 2\'s Call to Arms Paladins Life conversion out');
  assert(!paladins.identityTrace.some(step => step.id === 'callToArmsPaladins'),
    '[PP-16] F55 Warlord composes no a:callToArmsPaladins step');
  // Both are still `combatSummoned`, so the absence above is the conversion's and not the whole
  // summon block failing to run — without this the two assertions would pass on a broken input.
  assertIs(construct.abilities.liveFantastic, true,
    '[PP-17] F54 the Warlord Construct Catapult is still combat-summoned Fantastic');
  assertIs(paladins.abilities.liveFantastic, true,
    '[PP-17] F55 the Warlord Paladins are still combat-summoned Fantastic');
}

// F259.1 — the digest states its own scope, and a refusing corpus cannot report a zero.
//
// `tools/derivation_equivalence.js` is the instrument every subtask's "nothing moved" is read off,
// and its zeros have been over-read repeatedly (F204, F244.3i, F253.2). What is asserted here is
// the part a reader has to be able to trust: the scope block *partitions* the input boundary
// rather than restating a hand list, and the guard halts a corpus that has collapsed to throws.
// The checks are cheap by construction — the scope machinery is fed a slice of the case list and
// a fabricated scope object, never a 52,440-case run.
function runF259Checks(ctx) {
  const {
    enumerateCases, scopeCollector, assertCorpusCanSpeak, boundaryFieldVersions, formatScope,
    refusalCensus, isRefusal, canonicalValue, digest, REFUSAL_SHARE_BUDGET,
  } = require('../derivation_equivalence');
  const vm = require('vm');

  // A slice is enough: the claim is about how the collector classifies what it saw, not about
  // how many cases there are.
  const collector = scopeCollector(ctx);
  let seen = 0;
  const statedFields = new Set();
  for (const testCase of enumerateCases(ctx)) {
    collector.case(testCase);
    for (const field of Object.keys(testCase.input)) statedFields.add(field);
    seen += 1;
    if (seen >= 300) break;
  }
  const scope = collector.report();

  const varied = new Set(scope.topLevelVaried.map(row => row.field));
  const held = new Set(scope.topLevelHeld.map(row => row.field));
  const never = new Set(scope.boundaryFieldsNeverStated.map(row => row.field));
  assertEqual(varied.size + held.size, statedFields.size,
    '[F259.1] every field the cases state is classified as varied or held, and none twice');
  for (const field of statedFields) {
    assert(varied.has(field) || held.has(field),
      `[F259.1] the scope block classifies the stated field ${field}`);
    assert(!never.has(field),
      `[F259.1] a field the cases state is not reported as never stated (${field})`);
  }
  // The blind list is the boundary minus what was stated, so it is a derivation and not a list
  // that can drift: every boundary field is on exactly one side of it.
  const boundary = boundaryFieldVersions(ctx);
  assert(boundary.size > 0, '[F259.1] the card-path boundary supplies the denominator');
  for (const field of boundary.keys()) {
    assert(statedFields.has(field) === !never.has(field),
      `[F259.1] boundary field ${field} is either stated by the cases or reported as never stated`);
  }
  assert(scope.abilityKeyOriginRows > scope.abilityKeysStated.length,
    '[F259.1] the scope block counts the record keys the case list cannot state (F253.2)');

  const text = formatScope(scope);
  for (const row of scope.boundaryFieldsNeverStated) {
    assert(text.includes(row.field),
      `[F259.1] the printed scope names the unstated boundary field ${row.field}`);
  }
  assert(text.includes(String(scope.refusals)) && text.includes(String(scope.comparable)),
    '[F259.1] the printed scope states the comparable and refusing case counts');

  // The guard. A corpus that has collapsed to throws compares equal to any tree, which is how
  // F267.4's probe reported 0 three times running, so the run halts rather than printing it.
  const healthy = {
    versions: ['v1', 'v2'], casesPerVersion: { v1: 100, v2: 100 },
    refusalsPerVersion: { v1: 5, v2: 5 }, cases: 200, refusals: 10, refusalShare: 0.05,
    distinctRefusalMessages: 3,
  };
  assertCorpusCanSpeak(healthy);
  assert(true, '[F259.1] a corpus below the refusal budget is compared rather than halted');
  let halted = null;
  try {
    assertCorpusCanSpeak({ ...healthy, refusals: 150, refusalShare: 0.75,
      refusalsPerVersion: { v1: 75, v2: 75 } });
  } catch (err) {
    halted = String(err.message);
  }
  assert(halted && halted.includes('budget'),
    '[F259.1] a corpus throwing above the budget halts instead of reporting a zero');
  assert(REFUSAL_SHARE_BUDGET > 0 && REFUSAL_SHARE_BUDGET < 1,
    '[F259.1] the refusal budget is a share');
  let versionHalt = null;
  try {
    assertCorpusCanSpeak({ ...healthy, refusalsPerVersion: { v1: 100, v2: 5 },
      refusals: 105, refusalShare: 0.05 });
  } catch (err) {
    versionHalt = String(err.message);
  }
  assert(versionHalt && versionHalt.includes('v1'),
    '[F259.1] a version whose every case refuses halts even under the corpus-wide budget');
  // The guard reads the exact ratio: 7,001 of 20,000 rounds to the budget and would have been
  // admitted by a comparison against the rounded reporting value (GPT review, finding 5).
  let roundingHalt = null;
  try {
    assertCorpusCanSpeak({ versions: ['v1'], casesPerVersion: { v1: 20000 },
      refusalsPerVersion: { v1: 7001 }, cases: 20000, refusals: 7001, refusalShare: 0.35,
      distinctRefusalMessages: 2 });
  } catch (err) {
    roundingHalt = String(err.message);
  }
  assert(roundingHalt && roundingHalt.includes('7001'),
    '[F259.1] the budget is applied to the unrounded share, not to the reported one');
  let emptyHalt = null;
  try {
    assertCorpusCanSpeak({ versions: [], casesPerVersion: {}, refusalsPerVersion: {},
      cases: 0, refusals: 0, refusalShare: 0, distinctRefusalMessages: 0 });
  } catch (err) {
    emptyHalt = String(err.message);
  }
  assert(emptyHalt && emptyHalt.includes('nothing for a zero to range over'),
    '[F259.1] an empty corpus is refused rather than compared');

  // The census the diff guards on, over a digest object rather than a live run. A refusal is the
  // presence of `__throw`, not a truthy message: `throw new Error()` states an empty one, and
  // reading it for truthiness counted that case as comparable (GPT review, finding 1).
  const census = refusalCensus({
    'v1|solo|a': { __throw: '' },
    'v2|solo|a': { atk: 1 },
    'v2|solo|b': { atk: 1 },
  });
  assertEqual(census.refusals, 1, '[F259.1] an empty refusal message is still a refusal');
  assertEqual(census.comparable, 2, '[F259.1] the census counts the comparable cases');
  assert(isRefusal({ __throw: '' }) && !isRefusal({ atk: 1 }),
    '[F259.1] the refusal predicate reads the key, not the message');
  assertEqual(census.versions.length, 2,
    '[F259.1] the census reads each version off the case name');
  let censusHalt = null;
  try {
    assertCorpusCanSpeak(census, 'probe');
  } catch (err) {
    censusHalt = String(err.message);
  }
  assert(censusHalt && censusHalt.includes('v1'),
    '[F259.1] a digest whose one version wholly refuses is refused at 33%, under the budget');

  // Two maps stating the same thing are one value, and a stated null is not an absent field.
  assertEqual(canonicalValue({ x: 1, y: 2 }), canonicalValue({ y: 2, x: 1 }),
    '[F259.1] the distinct count is insensitive to key order');
  assert(canonicalValue(null) !== canonicalValue(undefined),
    '[F259.1] a field stated as null is not the same value as a field not stated');

  // --- F259.2: the boundary fields are stated, or the run says why not ---
  const {
    BOUNDARY_FIELD_PLAN, NAME_GATE_PAIRINGS, ABILITY_HALF_FIELDS, boundaryPlanValues,
    nameGateValues, parseNameGateCalls, assertBoundaryFieldsAccountedFor,
  } = require('../derivation_equivalence');

  // The plan is one decision per field, in exactly one of three shapes: values, a reason it is
  // stated nowhere, or a reason it is stated at one value.
  for (const [field, entry] of Object.entries(BOUNDARY_FIELD_PLAN)) {
    const shapes = [boundaryPlanValues(field).length > 0, !!entry.notVaried, !!entry.heldReason]
      .filter(Boolean).length;
    assertEqual(shapes, 1,
      `[F259.2] ${field} is varied, declared unvaried, or declared held — exactly one of the three`);
    for (const reason of [entry.notVaried, entry.heldReason]) {
      if (reason) {
        assert(reason.length > 20, `[F259.2] the reason stated for ${field} says why, not just that`);
      }
    }
  }

  // The name axis is read out of `stats.js` rather than listed, and every gate it finds is paired
  // with the race and control that open it — an unpaired name is a case that could only exercise
  // the false arm, so the tool halts instead.
  const gates = nameGateValues();
  assert(gates.length >= 4, '[F259.2] the unit-name gates are read out of Calculator/stats.js');
  for (const name of gates) {
    assert(NAME_GATE_PAIRINGS[name], `[F259.2] the name gate ${name} is paired with a race and a control`);
  }
  for (const name of Object.keys(NAME_GATE_PAIRINGS)) {
    assert(gates.includes(name),
      `[F259.2] the pairing for ${name} still names a gate Calculator/stats.js has`);
  }

  // The gate reader takes both quote styles and whitespace, and refuses a call it cannot read
  // rather than skipping it while the gates it can read keep the run looking healthy.
  assertEqual(parseNameGateCalls("x = unitName . endsWith ( 'A' ) || unitName.endsWith(\"B\")").join(','),
    'A,B', '[F259.2] the name-gate reader takes both literal spellings');
  let gateHalt = null;
  try {
    parseNameGateCalls('if (unitName.endsWith(SOME_CONSTANT)) return 1;');
  } catch (err) {
    gateHalt = String(err.message);
  }
  assert(gateHalt && gateHalt.includes('SOME_CONSTANT'),
    '[F259.2] a name gate this reader cannot read halts instead of going uncovered');

  // One whole version of the case list — 12,750 cases, ~0.1s, because nothing is derived here.
  // The claims are about what the list *states*, and they cannot be read off a 300-case prefix:
  // the boundary blocks come after the solo, environment and combination blocks.
  const firstVersion = [];
  let firstVersionName = null;
  for (const testCase of enumerateCases(ctx)) {
    if (firstVersionName === null) firstVersionName = testCase.version;
    if (testCase.version !== firstVersionName) break;
    firstVersion.push(testCase);
  }
  const statedInVersion = new Set();
  for (const testCase of firstVersion) {
    for (const field of Object.keys(testCase.input)) statedInVersion.add(field);
  }
  const boundaryHere = [...boundary.entries()]
    .filter(([, versions]) => versions.includes(firstVersionName)).map(([field]) => field);
  for (const field of boundaryHere) {
    assert(statedInVersion.has(field) || (BOUNDARY_FIELD_PLAN[field] || {}).notVaried,
      `[F259.2] ${firstVersionName} states the boundary field ${field}, or the plan says why not`);
  }
  // Every value the plan carries reaches a case, so a value added to it cannot sit unused.
  for (const field of boundaryHere) {
    for (const value of boundaryPlanValues(field)) {
      assert(firstVersion.some(testCase => testCase.input[field] === value),
        `[F259.2] some case states ${field} = ${JSON.stringify(value)} in ${firstVersionName}`);
    }
  }
  // Version scope, which is what keeps this axis out of the refusal budget: a DOS version states
  // the DOS To-Hit pair and never the modern five, because stating the other family's field is a
  // halt (`stats.js`, foreignHitInputs).
  const modernHit = ['hitChance', 'hitMelee', 'hitRanged', 'hitThrown', 'hitBreath'];
  const dosVersion = !firstVersionName.startsWith('com2');
  for (const field of modernHit) {
    assertEqual(statedInVersion.has(field), !dosVersion,
      `[F259.2] ${firstVersionName} states ${field} only if it is the version's own record`);
  }
  for (const field of ['toHitMod', 'toHitRtbMod']) {
    assertEqual(statedInVersion.has(field), dosVersion,
      `[F259.2] ${firstVersionName} states ${field} only if it is the version's own record`);
  }

  // The ability boundary's own shape (F252.1). A case stating the halves states no merged map:
  // `deriveUnitStats` halts on an input carrying both, so this is the difference between a block
  // that runs and a block that refuses.
  const halvesCases = firstVersion.filter(testCase =>
    ABILITY_HALF_FIELDS.some(field => testCase.input[field] !== undefined));
  assert(halvesCases.length > 100,
    '[F259.2] the case list states the innate/marked halves the card boundary produces');
  const halvesStatingBoth = halvesCases.filter(testCase => testCase.input.abilities !== undefined);
  assert(!halvesStatingBoth.length,
    '[F259.2] a case stating the halves states no merged map beside them'
    + `${halvesStatingBoth.length ? ` (${halvesStatingBoth[0].name})` : ''}`);
  const mergedCases = firstVersion.filter(testCase => testCase.input.abilities !== undefined);
  assert(mergedCases.length > 100,
    '[F259.2] the merged-map cases survive beside them, so old digests still diff');
  // The cross-half statement the merged map cannot make at all.
  assert(firstVersion.some(testCase => testCase.name.includes('|halves-swap|')),
    '[F259.2] a control is also stated in the half the def lists would not put it in');

  // A companion is what a value needs before a reader can take it: the two damage categories are
  // clamped to `dmg`, so a case stating one against `dmg` 0 exercises the clamp and nothing else.
  const damageCases = firstVersion.filter(testCase => testCase.name.includes('|bnd|undeadDamage='));
  assert(damageCases.length > 0 && damageCases.every(testCase => testCase.input.dmg > 0),
    '[F259.2] a case stating a damage category also states the damage it is taken out of');

  // `prefix` is an arithmetic gate, not a label: `distancePenaltyFor` returns 0 for any side but
  // `a`. A bare probe of it moved nothing, which is how it nearly entered the plan as a held field
  // with a reason (GPT review, finding 1), so the witness carries the ranged state that gate reads.
  const rangedCase = firstVersion.find(testCase =>
    testCase.name.includes('|bnd|prefix=b|') && testCase.input.rtbType === 'missile');
  assert(rangedCase && rangedCase.input.rangedCheck && rangedCase.input.rangedDist > 1,
    '[F259.2] a case stating side b also states the ranged distance its gate reads');
  const deriveUnitStats = vm.runInContext('deriveUnitStats', ctx);
  const sideB = JSON.stringify(digest(deriveUnitStats(rangedCase.input)));
  const sideA = JSON.stringify(digest(deriveUnitStats({ ...rangedCase.input, prefix: 'a' })));
  assert(sideB !== sideA,
    '[F259.2] the side the case derives moves the digest, so varying it is coverage and not a label');

  // The second guard: a boundary field on neither list halts, and a declared one does not.
  const declared = { field: 'wallOfFire', versions: ['v1'], reason: 'no derivation read exists' };
  assertBoundaryFieldsAccountedFor({ boundaryFieldsNeverStated: [{ field: 'wallOfFire', versions: ['v1'] }],
    boundaryFieldsDeclaredUnvaried: [declared] });
  assert(true, '[F259.2] a declared unvaried boundary field is not a halt');
  let blindHalt = null;
  try {
    assertBoundaryFieldsAccountedFor({
      boundaryFieldsNeverStated: [{ field: 'someNewField', versions: ['v1'] }],
      boundaryFieldsDeclaredUnvaried: [declared] });
  } catch (err) {
    blindHalt = String(err.message);
  }
  assert(blindHalt && blindHalt.includes('someNewField'),
    '[F259.2] a boundary field that is neither varied nor declared halts the run');
  // The same for a field stated at one value: held with no reason is the state F259.1 measured.
  let heldHalt = null;
  try {
    assertBoundaryFieldsAccountedFor({ boundaryFieldsNeverStated: [],
      boundaryFieldsDeclaredUnvaried: [],
      topLevelHeld: [{ field: 'quietField', distinct: 1, samples: ['0'], reason: null }] });
  } catch (err) {
    heldHalt = String(err.message);
  }
  assert(heldHalt && heldHalt.includes('quietField'),
    '[F259.2] a field held at one value with no stated reason halts the run');
}

module.exports = {
  runF19Checks, runF23Checks, runF50F51F53Checks, runR9G1eChecks,
  runPriorityPrerequisitesChecks, runF259Checks,
};
