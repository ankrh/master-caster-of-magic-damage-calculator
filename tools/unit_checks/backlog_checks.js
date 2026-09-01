// Regression suites kept per backlog item, each pinning the behavior that item settled.

'use strict';

const {
  evalInContext, assert, assertEqual, assertClose, baseUnitInput, modernRecordForSharedSlot,
} = require('./assertions');

function runF19Checks(ctx) {
  const modern = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', ...overrides,
  }));
  const warlord = overrides => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', ...overrides,
  }));

  const darkForce = modern({ abilities: { darkForce: true } });
  assertClose(darkForce.toHitMelee, 0.4, 'F19 Dark Force adds 10 percentage points To Hit');
  assertClose(darkForce.toBlock, 0.4, 'F19 Dark Force adds 10 percentage points To Block');

  const heavenly = modern({
    prefix: 'b', atk: 2, def: 3, res: 4,
    abilities: { heavenlyLight: true },
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
    prefix: 'a', atk: 2, def: 3, res: 4, abilities: { heavenlyLight: true },
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
    prefix: 'b', weapon: 'mithril', abilities: { heavenlyLight: true, rust: true },
    modernAttacks: { ranged: { strength: 4, type: 'missile' } },
  });
  assertClose(rustedIntoNormalMaterial.modernAttacks.ranged.toHit, 0.4,
    'F19 Heavenly Light reads the still-current base material after Rust strips Mithril');

  const moons = modern({
    atk: 2, def: 3, res: 6,
    abilities: { badMoon: true, goodMoon: true },
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
    abilities: { natureConjunction: true, goodMoon: true, badMoon: true },
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
    def: 6, res: 7, abilities: { spellWard: 'chaos' },
  });
  assertEqual(warded.def, 3, 'F19 matching Spell Ward removes three Defense');
  assertEqual(warded.res, 4, 'F19 matching Spell Ward removes three Resistance');
  assertClose(warded.toHitMelee, 0.1, 'F19 matching Spell Ward removes 20 percentage points To Hit');
  const wrongWard = modern({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, abilities: { spellWard: 'nature' },
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
      def: 6, res: 7, abilities: { spellWard: realm },
    });
    assertEqual(nonFantasticWard.def, 3,
      `F195 the ${realm} Spell Ward arm reaches a non-Fantastic unit of that realm`);
    assertEqual(nonFantasticWard.res, 4,
      `F195 the ${realm} Spell Ward arm takes Resistance from a non-Fantastic unit of that realm`);
  }
  const unrealmedWard = modern({
    unitType: 'normal', def: 6, res: 7, abilities: { spellWard: 'life' },
  });
  assertEqual(unrealmedWard.def, 6,
    'F195 Spell Ward is still inert against a unit the recalculation gives no realm');
  const sanctifiedWard = warlord({
    unitType: 'normal', def: 6, res: 7, abilities: { sanctify: true, spellWard: 'life' },
  });
  assertEqual(sanctifiedWard.def, 3,
    'F195 a Sanctified non-clergy unit is Life-realmed without being Fantastic, and is warded');
  // The block's third write. The old term suppressed all three, so a check that reads only
  // Defense and Resistance would pass against a ward that had lost its To Hit arm.
  const chaosWardToHit = modern({
    identity: { baseFantastic: false, baseRace: 'Chaos' }, unitType: 'normal',
    def: 6, res: 7, abilities: { spellWard: 'chaos' },
  });
  assertClose(chaosWardToHit.toHitMelee, 0.1,
    'F195 the ward takes 20 percentage points To Hit from a non-Fantastic unit of its realm');
  const chaosNoWardToHit = modern({
    identity: { baseFantastic: false, baseRace: 'Chaos' }, unitType: 'normal', def: 6, res: 7,
  });
  assertClose(chaosNoWardToHit.toHitMelee, 0.3,
    'F195 the same unit keeps its To Hit with no ward standing');
  // The hero path is distinct: `legacyUnitTypeFromLiveIdentity` collapses a non-Fantastic hero to
  // `hero`, which carries no realm, so the ward can only reach it through `realmOfUnitType`'s
  // live-identity fallback. Torin (`units_com2.js` #34) is the base-CoM2 instance; Mortu,
  // Ravashack, Everchosen and Avatar are the Warlord ones.
  const lifeHeroWard = modern({
    isHero: true, identity: { baseFantastic: false, baseRace: 'Life' },
    def: 6, res: 7, abilities: { spellWard: 'life' },
  });
  assertEqual(lifeHeroWard.def, 3,
    'F195 a realm-tagged non-Fantastic hero is warded through the live-identity realm fallback');
  const deathHeroWard = warlord({
    isHero: true, identity: { baseFantastic: false, baseRace: 'Death' },
    def: 6, res: 7, abilities: { spellWard: 'death' },
  });
  assertEqual(deathHeroWard.def, 3,
    'F195 the Warlord Death heroes take the IsDeathUnit arm without being Fantastic');

  const auraMaximum = modern({
    res: 1, def: 2, abilities: {
      resistanceToAll: 4, prayermasterAura: 6, divineBarrierAura: 3,
    },
  });
  assertEqual(auraMaximum.res, 7,
    'F19 Prayermaster competes with Resistance to All by maximum rather than stacking');
  assertEqual(auraMaximum.def, 5, 'F19 Divine Barrier adds its entered aura value');
  const soulLinked = modern({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    abilities: { soulLinkerAura: 5 },
  });
  assertClose(soulLinked.toHitMelee, 0.35, 'F19 Soul Linker raises Fantastic To Hit');
  assertClose(soulLinked.toBlock, 0.35, 'F19 Soul Linker raises Fantastic To Block');
  const cappedSoulLinker = modern({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    hitChance: 70, abilities: { soulLinkerAura: 99 },
  });
  assertClose(cappedSoulLinker.toHitMelee, 1,
    'F19 late Soul Linker To Hit observes AttackRoll\'s natural 100% probability bound');
  const cappedSoulLinkerTraceIds = cappedSoulLinker.modifierTraces.toHitMelee.entries
    .map(entry => entry.id);
  assert(cappedSoulLinkerTraceIds.indexOf('chance:soulLinkerAura')
      < cappedSoulLinkerTraceIds.indexOf('chance:attackRollProbabilityBound'),
  'F19 chance trace attributes Soul Linker before the resolution probability bound');

  const auraChannels = modern({
    atk: 2, abilities: { guidingBeaconAura: 4, leadershipAura: 5 },
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
    abilities: { leadershipAura: 5 },
    modernAttacks: { ranged: { strength: 3, type: 'magic' } },
  });
  assertEqual(magicalLeadership.modernAttacks.ranged.strength, 3,
    'F19 Leadership excludes magical conventional Ranged');

  const baseNormalMadeFantastic = modern({
    baseFantastic: false, baseRace: null, unitType: 'normal',
    abilities: {
      destiny: true, badMoon: true, goodMoon: true, natureConjunction: true,
      spellWard: 'life', soulLinkerAura: 5, leadershipAura: 7,
    },
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
    abilities: {
      spiritLink: true, badMoon: true, goodMoon: true, natureConjunction: true,
      spellWard: 'nature', soulLinkerAura: 5, leadershipAura: 4,
    },
  });
  const baseFantasticMadeNormalIds = baseFantasticMadeNormal.statTrace.map(event => event.id);
  for (const expectedId of ['natureConjunction', 'spellWard', 'leadershipAura']) {
    assert(baseFantasticMadeNormalIds.includes(expectedId),
      `F19 ${expectedId} observes its required base/live predicate after Spirit Link`);
  }
  for (const excludedId of ['badMoon', 'goodMoon', 'soulLinkerAura']) {
    assert(!baseFantasticMadeNormalIds.includes(excludedId),
      `F19 ${excludedId} rejects the opposite base/live predicate after Spirit Link`);
  }

  const createdBesideRanged = warlord({
    abilities: { lightningBlade: true },
    modernAttacks: { ranged: { strength: 4, type: 'missile' } },
  });
  assertEqual(createdBesideRanged.modernAttacks.ranged.strength, 4,
    'F19 Lightning Blade preserves coexisting conventional Ranged');
  assertEqual(createdBesideRanged.modernAttacks.lightningBreath.strength, 1,
    'F19 Lightning Blade creates strength-one Breath beside Ranged');
  const overwrittenLightning = warlord({
    abilities: { lightningBlade: true },
    modernAttacks: { lightningBreath: { strength: 7, type: 'lightning' } },
  });
  assertEqual(overwrittenLightning.modernAttacks.lightningBreath.strength, 1,
    'F19 Lightning Blade assignment overwrites existing Breath when Thrown is absent');

  const workshopChannels = warlord({
    abilities: { militaryWorkshop: true, armorPiercing: true },
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
    abilities: { militaryWorkshop: true, lightningBlade: true, armorPiercing: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(workshopLightning.modernAttacks.lightningBreath.strength, 8,
    'F19 Lightning Blade reads Workshop-upgraded permanent Thrown: 3 + 4 + 1');
  assertEqual(workshopLightning.modernAttacks.thrown, undefined,
    'F19 Lightning Blade clears the upgraded Thrown source');

  const baseNormalConvertedFantastic = warlord({
    abilities: { militaryWorkshop: true, lightningBlade: true, ccDefense: true,
      armorPiercing: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(baseNormalConvertedFantastic.identity.fantastic, true,
    'F19 base-normal training regression reaches a later live-Fantastic conversion');
  assertEqual(baseNormalConvertedFantastic.modernAttacks.lightningBreath.strength, 8,
    'F19 permanent Workshop and Lightning Blade gates use base-normal identity');
  assertEqual(baseNormalConvertedFantastic.abilities.poison, 1,
    'F19 base-normal unit keeps the permanent Workshop poison after conversion');

  const baseFantasticClearedLive = warlord({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    abilities: { militaryWorkshop: true, lightningBlade: true, spiritLink: true,
      armorPiercing: true },
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
  });
  assertEqual(baseFantasticClearedLive.identity.fantastic, false,
    'F19 base-Fantastic training regression reaches a later live-normal conversion');
  assertEqual(baseFantasticClearedLive.modernAttacks.thrown.strength, 3,
    'F19 live-normal conversion does not retroactively admit permanent training writes');
  assertEqual(baseFantasticClearedLive.modernAttacks.lightningBreath, undefined,
    'F19 base-Fantastic unit does not gain Lightning Blade after Spirit Link');
  assertEqual(baseFantasticClearedLive.abilities.poison || 0, 0,
    'F19 base-Fantastic unit does not gain Workshop poison after Spirit Link');

  const warlordPermanentControlsInBaseCoM2 = modern({
    abilities: { militaryWorkshop: true, rocketry: true, lightningBlade: true,
      armorPiercing: true },
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
      abilities: {
        darkForce: true, heavenlyLight: true, badMoon: true, goodMoon: true,
        natureConjunction: true, spellWard: 'life', guidingBeaconAura: 5,
        prayermasterAura: 5, divineBarrierAura: 5, soulLinkerAura: 5,
        leadershipAura: 5,
      },
    }));
    assertEqual(inert.atk, 2, `F19 modern controls are inert in ${version} melee`);
    assertEqual(inert.def, 3, `F19 modern controls are inert in ${version} Defense`);
    assertEqual(inert.res, 4, `F19 modern controls are inert in ${version} Resistance`);
  }
  // `heavenlyLight` left this list with F49: CoM 1 has its own Heavenly Light block at
  // com1:0x905BB, so the control is live there and only the MoM loop above still holds it inert.
  const inertInCoM1 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', atk: 2, def: 3, res: 4,
    abilities: {
      darkForce: true, badMoon: true, goodMoon: true,
      natureConjunction: true, spellWard: 'life', prayermasterAura: 5,
      leadershipAura: 5,
    },
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
  const fearedChance = (version, abilities) => {
    const feared = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'a', figs: 1, atk: 5, def: 0, res: 5, hp: 10,
      hitChance: 70, abilities,
    }));
    const fearSource = ctx.deriveUnitStats(baseUnitInput({
      version, prefix: 'b', figs: 1, atk: 1, def: 0, res: 5, hp: 20,
      abilities: { fear: true },
    }));
    return { feared, fearSource, chance: fearPhaseChance(feared, fearSource, version) };
  };

  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const intrinsic = fearedChance(version, { deathImmunity: true });
    assertEqual(intrinsic.feared.baseDeathImmunity, true,
      `F23 ${version} preserves intrinsic Death Immunity on the base record`);
    assertClose(intrinsic.chance, 0,
      `F23 ${version} intrinsic Death Immunity skips Cause Fear`);

    const bloodLust = fearedChance(version, { bloodLust: true });
    assertEqual(bloodLust.feared.baseDeathImmunity, false,
      `F23 ${version} Blood Lust does not rewrite base Death Immunity`);
    assertClose(bloodLust.chance, 0.8,
      `F23 ${version} Blood Lust-derived Death Immunity still rolls against Cause Fear`);

    const magicImmune = fearedChance(version, { magicImmunity: true });
    assertEqual(magicImmune.feared.baseDeathImmunity, false,
      `F23 ${version} Magic Immunity remains distinct from base Death Immunity`);
    assertEqual(ctx.effectiveResistance(magicImmune.feared, version, 'death'), 100,
      `F23 ${version} Magic Immunity assigns effective Death resistance to 100`);
    assertClose(ctx.fearFailProb(5, magicImmune.feared.abilities, version, false), 0.8,
      `F23 ${version} fear helper does not replace the modern effective-resistance path`);
    assertClose(magicImmune.chance, 0,
      `F23 ${version} Magic Immunity still blocks Cause Fear through effective resistance`);

    const transported = JSON.parse(JSON.stringify(bloodLust.feared));
    const transportedSource = JSON.parse(JSON.stringify(bloodLust.fearSource));
    assertEqual(transported.baseDeathImmunity, false,
      `F23 ${version} Matrix-style structured transport preserves base Death Immunity`);
    assertClose(fearPhaseChance(transported, transportedSource, version), 0.8,
      `F23 ${version} Matrix-style resolver path keeps calculated Death Immunity rollable`);

    const directIntrinsic = { ...intrinsic.feared };
    delete directIntrinsic.baseDeathImmunity;
    assertClose(fearPhaseChance(directIntrinsic, intrinsic.fearSource, version), 0,
      `F23 ${version} direct resolver callers treat supplied Death Immunity as intrinsic`);
    const directBloodLust = { ...bloodLust.feared };
    delete directBloodLust.baseDeathImmunity;
    assertClose(fearPhaseChance(directBloodLust, bloodLust.fearSource, version), 0.8,
      `F23 ${version} direct resolver normalization captures base immunity before Blood Lust`);
  }

  const animated = fearedChance('com2_1.05.11', { animated: true });
  assertClose(animated.chance, 0.8,
    'F23 CoM2 Animated-derived Death Immunity still rolls against Cause Fear');

  const rebuild = fearedChance('com2_warlord_1.5.12.9', { rebuild: true });
  assertClose(rebuild.chance, 0.8,
    'F23 Warlord Rebuild-derived Death Immunity still rolls against Cause Fear');

  const divineProtection = fearedChance('com2_warlord_1.5.12.9', {
    divineProtection: true,
  });
  assertEqual(divineProtection.feared.abilities.deathImmunity, true,
    'F23 Warlord Divine Protection still grants calculated Death Immunity');
  assertEqual(divineProtection.feared.baseDeathImmunity, false,
    'F23 Warlord Divine Protection does not rewrite base Death Immunity');
  assertClose(divineProtection.chance, 0.7,
    'F23 Warlord Divine Protection-derived Death Immunity still rolls with Lucky resistance');

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
    rtb: 3, rtbType: 'missile', abilities: { guidingBeaconAura: 5 },
  });
  assertEqual(beaconRanged.rtb, 8,
    'F50 CoM 1 Guiding Beacon adds its side maximum to conventional Ranged');
  for (const rtbType of ['boulder', 'magic_c', 'magic_n', 'magic_s']) {
    const eligible = derive({
      rtb: 3, rtbType, abilities: { guidingBeaconAura: 5 },
    });
    assertEqual(eligible.rtb, 8,
      `F50 CoM 1 Guiding Beacon includes ${rtbType}`);
  }
  for (const rtbType of ['thrown', 'fire', 'lightning', 'gaze_stoning', 'gaze_death']) {
    const excluded = derive({
      rtb: 3, rtbType, abilities: { guidingBeaconAura: 5 },
    });
    assertEqual(excluded.rtb, 3,
      `F50 CoM 1 Guiding Beacon excludes ${rtbType}`);
  }

  const barrier = derive({ def: 2, abilities: { divineBarrierAura: 5 } });
  assertEqual(barrier.def, 7,
    'F50 CoM 1 Divine Barrier adds its side maximum without a unit gate');
  const linked = derive({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    abilities: { soulLinkerAura: 5 },
  });
  assertClose(linked.toHitMelee, 0.33,
    'F50 CoM 1 Soul Linker gives ceil(value / 2) To Hit');
  assertClose(linked.toBlock, 0.32,
    'F50 CoM 1 Soul Linker gives floor(value / 2) To Block');
  const unlinkedNormal = derive({ abilities: { soulLinkerAura: 5 } });
  assertClose(unlinkedNormal.toHitMelee, 0.3,
    'F50 CoM 1 Soul Linker rejects non-Fantastic units');
  assertClose(unlinkedNormal.toBlock, 0.3,
    'F50 CoM 1 Soul Linker leaves non-Fantastic To Block unchanged');

  const orderedAuras = derive({
    baseFantastic: true, baseRace: 'Nature', unitType: 'fantastic_nature',
    rtb: 4, rtbType: 'missile', def: 8, nodeAura: 'nature',
    abilities: {
      guidingBeaconAura: 3, divineBarrierAura: 4, soulLinkerAura: 5,
      mindStorm: true, warpAttack: true, warpDefense: true,
    },
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
    def: 6, res: 7, abilities: { realmWard: 'chaos' },
  });
  assertEqual(warded.def, 3, 'F51 matching CoM 1 Realm Ward removes three Defense');
  assertEqual(warded.res, 4, 'F51 matching CoM 1 Realm Ward removes three Resistance');
  assertClose(warded.toHitMelee, 0.1,
    'F51 matching CoM 1 Realm Ward removes 20 percentage points To Hit');
  const wrongWard = derive({
    baseFantastic: true, baseRace: 'Chaos', unitType: 'fantastic_chaos',
    def: 6, res: 7, abilities: { realmWard: 'nature' },
  });
  assertEqual(wrongWard.def, 6, 'F51 nonmatching CoM 1 Realm Ward is inert');
  const normalWard = derive({ def: 6, res: 7, abilities: { realmWard: 'chaos' } });
  assertEqual(normalWard.def, 6, 'F51 CoM 1 Realm Ward rejects non-Fantastic units');
  for (const realm of ['nature', 'sorcery', 'chaos', 'life', 'death']) {
    const matchingWard = derive({
      baseFantastic: true,
      baseRace: realm[0].toUpperCase() + realm.slice(1),
      unitType: `fantastic_${realm}`,
      def: 6, res: 7, abilities: { realmWard: realm },
    });
    assertEqual(matchingWard.def, 3,
      `F51 CoM 1 ${realm} Realm Ward maps to its matching Fantastic realm`);
  }

  const wardOrder = derive({
    isHero: true, baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    def: 6, res: 9, abilities: {
      supremeLight: true, realmWard: 'life', tactician: true,
    },
  });
  const wardOrderIds = wardOrder.statTrace.map(event => event.id);
  assert(wardOrderIds.indexOf('supremeLight') < wardOrderIds.indexOf('realmWard')
      && wardOrderIds.indexOf('realmWard') < wardOrderIds.indexOf('tactician'),
  'F51 CoM 1 Realm Ward stays between Supreme Light and Tactician');

  const warpedBeforeSupremeLight = derive({
    baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
    def: 1, res: 20,
    abilities: { mindStorm: true, warpDefense: true, supremeLight: true },
  });
  assertEqual(warpedBeforeSupremeLight.def, 4,
    'F53 CoM 1 signed -4 / 3 truncates to -1 before Supreme Light adds 5');
  const warpedBeforeTactician = derive({
    isHero: true, unitType: 'hero', def: 1,
    abilities: { mindStorm: true, warpDefense: true, tactician: true },
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
      abilities: {
        realmWard: 'chaos', guidingBeaconAura: 0,
        divineBarrierAura: 0, soulLinkerAura: 0,
      },
    }));
    assertEqual(inert.def, 6, `F51 Realm Ward is inert in ${version}`);
    assertEqual(inert.res, 7, `F51 Realm Ward leaves Resistance unchanged in ${version}`);
    assertClose(inert.toHitMelee, 0.3, `F51 Realm Ward leaves To Hit unchanged in ${version}`);
  }
  for (const version of ['mom_1.31', 'mom_cp_1.60.00']) {
    const inertAuras = ctx.deriveUnitStats(baseUnitInput({
      version, baseFantastic: true, baseRace: 'Life', unitType: 'fantastic_life',
      rtb: 3, rtbType: 'missile', def: 6,
      abilities: {
        guidingBeaconAura: 5, divineBarrierAura: 5, soulLinkerAura: 5,
      },
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
      abilities: {
        guidingBeaconAura: 5, divineBarrierAura: 5, soulLinkerAura: 5,
      },
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
      version, def: defense, abilities: { warpDefense: true },
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
    abilities: { outlanderWizard: true, explosive: true },
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
    abilities: { focusMagic: true },
  }));
  assertClose(comFocus.toHitRtb, 0.3,
    'R9-G1e CoM 1 Focus Magic suppresses the material shared-slot To-Hit write');
  const modernFocus = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', weapon: 'mithril', rtb: 2, rtbType: 'missile',
    abilities: { focusMagic: true },
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

module.exports = { runF19Checks, runF23Checks, runF50F51F53Checks, runR9G1eChecks };
