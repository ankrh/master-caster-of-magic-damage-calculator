// Unit-identity derivation: roster identities, ordered identity conversions, and the
// live unit-type projection.

'use strict';

const fs = require('fs');
const path = require('path');
const { calculatorFiles } = require('../provenance_audit');
const { repoRoot } = require('../calculator_sources');
const { evalInContext, assert, assertEqual, assertClose, baseUnitInput } = require('./assertions');

function calculatorSource(file) {
  return fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
}

// The `fantastic_<realm>` / `normal_<realm>` / `hero` grammar, transcribed from the token's own
// consumers rather than from the projection that builds it, so this decodes the token
// independently of the function under test.
const TOKEN_REALM_RACES = Object.freeze({
  life: 'Life', death: 'Death', chaos: 'Chaos', nature: 'Nature',
  sorcery: 'Sorcery', arcane: 'Arcane', unaligned: 'No Heal',
});
const TOKEN_RACES = Object.freeze(Object.values(TOKEN_REALM_RACES));

function unitTypeTokenAgreesWithIdentity(token, identity) {
  if (token === 'hero') return !!identity.isHero && !identity.fantastic;
  if (token.startsWith('fantastic_')) {
    if (!identity.fantastic) return false;
    const realm = token.slice('fantastic_'.length);
    if (TOKEN_REALM_RACES[realm] === identity.race) return true;
    // `fantastic_arcane` is also the token for a fantastic unit whose race names no realm.
    return realm === 'arcane' && !TOKEN_RACES.includes(identity.race);
  }
  if (token.startsWith('normal_')) {
    return !identity.fantastic
      && TOKEN_REALM_RACES[token.slice('normal_'.length)] === identity.race;
  }
  return token === 'normal' && !identity.fantastic && !TOKEN_RACES.includes(identity.race);
}

// M7: the identity conversions write the live `race`/`fantastic` fields, and the compact
// `unitType` token is projected from those fields wherever it is needed.
//
// F163 adds a second bound to the same list, and it is load-bearing rather than stylistic: every
// conversion writes *only* those two fields, which is what makes `targetingIdentity` — the
// projection the two cast-time targeting predicates and the post-chain reads take — computable
// without running the stat sequence. These are the structural
// bounds that stop an effect rule from drifting back onto the compatibility projection — a
// conversion that read or wrote the token would fuse realm and Fantastic again, which is what
// forced Sanctify's realm-less `hero` special case before the split.
function runIdentityProjectionChecks(ctx) {
  const identitySource = calculatorSource('Calculator/stats_identity.js');
  const conversionsStart = identitySource.indexOf('function identityConversionSteps(');
  assert(conversionsStart >= 0, 'The identity conversions are found in stats_identity.js');
  const conversionsEnd = identitySource.indexOf('\nfunction ', conversionsStart + 1);
  const conversions = identitySource.slice(conversionsStart,
    conversionsEnd === -1 ? identitySource.length : conversionsEnd);
  assert(!/unitType/.test(conversions),
    'No identity conversion reads or writes the compact unitType token');
  const declaredWrites = [...conversions.matchAll(/writes:\s*\[([^\]]*)\]/g)]
    .map(match => match[1].split(',').map(value => value.trim().replace(/^'|'$/g, ''))
      .filter(Boolean));
  assert(declaredWrites.length >= 11,
    'The identity conversions are individually declared steps, not one merged write');
  for (const writes of declaredWrites) {
    assertEqual(writes.filter(field => field !== 'race' && field !== 'fantastic').join(','), '',
      'Every identity conversion writes only the live race and Fantastic fields');
  }

  const phasesSource = calculatorSource('Calculator/combat_phases.js');
  const normalizeStart = phasesSource.indexOf('function normalizeCombatUnit(');
  assert(normalizeStart >= 0, 'normalizeCombatUnit is found in combat_phases.js');
  const normalize = phasesSource.slice(normalizeStart,
    phasesSource.indexOf('\nfunction ', normalizeStart + 1));
  assert(!/unitType\s*:/.test(normalize),
    'Combat normalization no longer rewrites the unit type a derivation already projected');

  for (const file of calculatorFiles) {
    const text = calculatorSource(file);
    for (const match of text.matchAll(/writes:\s*\[([^\]]*)\]/g)) {
      assert(!/'unitType'/.test(match[1]),
        `${file} declares no step that writes the compact unitType token`);
    }
  }

  // The projection itself, decoded by the grammar above rather than re-run: no derivation may
  // report a token whose realm or Fantastic value its live identity does not carry.
  const conversionControls = ['ccFireBreath', 'fieryFury', 'sanctify', 'clergy', 'destiny',
    'ccFlight', 'ccDefense', 'bloodLust', 'blackChannels', 'undead', 'animated', 'mysticSurge',
    'raiseDead'];
  const identityShapes = [
    { isHero: false, baseRace: 'High Men', baseFantastic: false },
    { isHero: true, baseRace: 'High Men', baseFantastic: false },
    { isHero: false, baseRace: 'Chaos', baseFantastic: true },
    { isHero: false, baseRace: '', baseFantastic: false },
  ];
  for (const version of evalInContext(ctx, 'ENGINE_VERSIONS')) {
    for (const shape of identityShapes) {
      for (const control of ['none', ...conversionControls]) {
        const result = ctx.deriveUnitStats(baseUnitInput({
          version,
          identity: ctx.createCustomUnitIdentity(version, shape),
          abilities: control === 'none' ? {} : { [control]: true },
        }));
        assert(unitTypeTokenAgreesWithIdentity(result.unitType, result.identity),
          `${version}/${control}: the projected unit type agrees with the live identity `
          + `(${result.unitType} vs race ${JSON.stringify(result.identity.race)}, `
          + `fantastic ${result.identity.fantastic})`);
      }
    }
  }
}

function runIdentityChecks(ctx) {
  runIdentityProjectionChecks(ctx);
  const rosterSets = [
    ['mom_1.31', evalInContext(ctx, 'MOM_UNITS_DATA')],
    ['com_6.08', evalInContext(ctx, 'COM_UNITS_DATA')],
    ['com2_1.05.11', evalInContext(ctx, 'COM2_UNITS_DATA')],
    ['com2_warlord_1.5.12.9', evalInContext(ctx, 'WARLORD_UNITS_DATA')],
  ];
  for (const [version, data] of rosterSets) {
    for (const unit of Object.values(data)) {
      const label = `${version} template ${unit.templateId} (${unit.name})`;
      assert(Number.isInteger(unit.templateId), `${label}: generator preserves integer templateId`);
      assertEqual(unit.isHero, unit.category === 'Heroes', `${label}: isHero is source-independent of race/fantastic`);
      assertEqual(unit.heroTypeId === null, !unit.isHero, `${label}: only heroes carry heroTypeId`);
      assertEqual(unit.baseRace, unit.race, `${label}: baseRace faithfully carries source race`);
      const fantasticToken = (unit.abilities || []).some(a => a === 'Fantastic' || a === 'Fantastic=1');
      assertEqual(unit.baseFantastic, fantasticToken, `${label}: baseFantastic faithfully carries source bit`);
      assert(!Object.prototype.hasOwnProperty.call(unit, 'chosen'), `${label}: chosen is not persisted`);
      assert(!Object.prototype.hasOwnProperty.call(unit, 'golem'), `${label}: golem is not persisted`);

      const rosterIdentity = ctx.createRosterUnitIdentity(version, unit);
      assertEqual(rosterIdentity.version, version, `${label}: templateId is scoped by active version`);
      assertEqual(rosterIdentity.templateId, unit.templateId, `${label}: identity keeps templateId`);
      assertEqual(rosterIdentity.heroTypeId, unit.heroTypeId, `${label}: identity keeps heroTypeId`);
    }
  }

  const momData = evalInContext(ctx, 'MOM_UNITS_DATA');
  const momDwarf = Object.values(momData).find(unit => unit.templateId === 0);
  const momIdentity = ctx.createRosterUnitIdentity('mom_1.31', momDwarf);
  const cpIdentity = ctx.createRosterUnitIdentity('mom_cp_1.60.00', momDwarf);
  assertEqual(momIdentity.templateId, cpIdentity.templateId,
    'The shared MoM roster preserves the same source template ID');
  assert(momIdentity.version !== cpIdentity.version,
    'The shared MoM source template is scoped independently to each active version');

  const comData = evalInContext(ctx, 'COM_UNITS_DATA');
  const comSupernaturalUnits = Object.values(comData)
    .filter(unit => (unit.abilities || []).includes('Supernatural'))
    .map(unit => unit.name);
  assertEqual(JSON.stringify(comSupernaturalUnits), JSON.stringify([
    'Hydra', 'Great Drake', 'Death Knights', 'Demon Lord', 'Arch Angel',
    'Colossus', 'Gorgons', 'Behemoth', 'Great Wyrm', 'Djinn', 'Sky Drake',
  ]), 'CoM roster imports every executable $2000 Supernatural carrier');

  const customBaseIdentity = ctx.createCustomUnitIdentity('com2_1.05.11', {
    isHero: true,
    baseRace: 'Life',
    baseFantastic: false,
  });
  assertEqual(customBaseIdentity.templateId, null, 'Custom identity has null templateId');
  assertEqual(customBaseIdentity.heroTypeId, null, 'Custom identity has null heroTypeId even for a hero');
  assertEqual(customBaseIdentity.isHero, true, 'Custom identity stores Hero independently');
  assertEqual(customBaseIdentity.baseRace, 'Life', 'Custom identity stores base race independently');
  assertEqual(customBaseIdentity.baseFantastic, false, 'Custom identity stores base Fantastic independently');

  const customInput = baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'hero',
    identity: customBaseIdentity,
  });
  const first = ctx.deriveUnitStats(customInput);
  assertEqual(first.identity.race, 'Life', 'Derivation initializes live race from baseRace');
  assertEqual(first.identity.fantastic, false, 'Derivation initializes live Fantastic from baseFantastic');
  assertEqual(first.identity.isHero, true, 'Derivation retains independent Hero identity');
  assert(!Object.prototype.hasOwnProperty.call(first.identity, 'chosen'), 'Calculated identity does not persist chosen');
  assert(!Object.prototype.hasOwnProperty.call(first.identity, 'golem'), 'Calculated identity does not persist golem');
  assert(!Object.prototype.hasOwnProperty.call(customBaseIdentity, 'race'),
    'Base identity is not mutated with calculated race');
  assert(!Object.prototype.hasOwnProperty.call(customBaseIdentity, 'fantastic'),
    'Base identity is not mutated with calculated Fantastic');

  first.identity.race = 'Chaos';
  first.identity.fantastic = true;
  const second = ctx.deriveUnitStats(customInput);
  assert(first.identity !== second.identity, 'Every deriveUnitStats invocation owns a separate calculated identity record');
  assertEqual(second.identity.race, 'Life', 'A later derivation resets live race from baseRace');
  assertEqual(second.identity.fantastic, false, 'A later derivation resets live Fantastic from baseFantastic');

  const chosen = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 34,
      isHero: true, baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'chosen' }),
  }));
  assertEqual(chosen.identity.race, 'Life', 'Chosen writes live Life');
  assertEqual(chosen.identity.fantastic, true, 'Chosen writes live Fantastic');
  assertEqual(chosen.identityTrace.map(t => t.id).join(','), 'chosen',
    'Identity writes are exposed on the calculated output trace');
  assert(chosen.statTrace.some(t => t.id === 'chosen'),
    'Identity writes are included with affected calculated-stat output trace');

  const orderedRealmAbilities = [
    {},
    { ccDefense: true },
    { ccDefense: true, undead: true },
    { ccDefense: true, undead: true, mysticSurge: true },
    { ccDefense: true, undead: true, mysticSurge: true, sanctify: true, clergy: true },
  ];
  const orderedRealmExpected = [
    ['Life', 'fantastic_life'],
    ['Chaos', 'fantastic_chaos'],
    ['Death', 'fantastic_death'],
    ['No Heal', 'fantastic_unaligned'],
    ['No Heal', 'fantastic_unaligned'],
  ];
  orderedRealmAbilities.forEach((abilities, index) => {
    const unit = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.9',
      identity: ctx.createCustomUnitIdentity('com2_warlord_1.5.12.9', {
        baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'chosen',
      }),
      abilities,
    }));
    assertEqual(unit.identity.race, orderedRealmExpected[index][0],
      `Ordered identity override ${index} writes the expected live race`);
    assertEqual(unit.unitType, orderedRealmExpected[index][1],
      `Ordered identity override ${index} projects the expected compatibility type`);
  });

  const summoned = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { combatSummoned: true },
  }));
  assertEqual(summoned.identity.fantastic, true, 'Combat Summoned writes live Fantastic');

  const construct = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 37,
      baseRace: 'Special', baseFantastic: false }),
  }));
  assertEqual(construct.identity.race, 'Nature', 'Construct Catapult writes live Nature');
  assertEqual(construct.identity.fantastic, true, 'Construct Catapult writes live Fantastic');

  const callToArms = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 113,
      baseRace: 'High Men', baseFantastic: false }),
  }));
  assertEqual(callToArms.identity.race, 'Life', 'Call to Arms Paladins writes live Life');
  assertEqual(callToArms.identity.fantastic, true, 'Call to Arms Paladins writes live Fantastic');

  const invalidCallToArms = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', name: 'Paladins', abilities: { combatSummoned: true },
    identity: ctx.createCustomUnitIdentity('com2_1.05.11', { baseRace: 'High Men' }),
  }));
  assertEqual(invalidCallToArms.identity.race, 'High Men', 'Call to Arms ignores display names');
  assert(!invalidCallToArms.identityTrace.some(t => t.id === 'callToArmsPaladins'),
    'Custom Paladins display name does not infer Call to Arms');

  const com1SummonedOther = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com_6.08', templateId: 150,
      baseRace: 'Troll', baseFantastic: false }),
  }));
  assertEqual(com1SummonedOther.identity.race, 'Troll',
    'CoM1 generic combat summons retain their loaded race');
  assertEqual(com1SummonedOther.identity.fantastic, true,
    'CoM1 generic combat summons become live Fantastic');

  const com1ConstructCatapult = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { combatSummoned: true }, rtb: 9, rtbType: 'boulder',
    identity: ctx.createUnitIdentity({ version: 'com_6.08', templateId: 37,
      baseRace: 'Special', baseFantastic: false, specialUnit: 'none' }),
  }));
  assertEqual(com1ConstructCatapult.identity.race, 'Nature',
    'CoM1 Construct Catapult recognizes source type 37 without a duplicated special-unit token');
  assertEqual(com1ConstructCatapult.identity.fantastic, true,
    'CoM1 Construct Catapult becomes live Fantastic');
  assertEqual(com1ConstructCatapult.weapon, 'magic',
    'CoM1 Construct Catapult source type 37 receives Magic Weapons');

  const com1SummonedCentaurs = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com_6.08', templateId: 54,
      baseRace: 'Beastmen', baseFantastic: false }),
  }));
  assertEqual(com1SummonedCentaurs.identity.race, 'Nature',
    'CoM1 combat-summoned Centaurs become live Nature');
  assertEqual(com1SummonedCentaurs.identity.fantastic, true,
    'CoM1 combat-summoned Centaurs become live Fantastic');

  const com1SummonedPaladins = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08', abilities: { combatSummoned: true },
    identity: ctx.createUnitIdentity({ version: 'com_6.08', templateId: 113,
      baseRace: 'High Men', baseFantastic: false }),
  }));
  assertEqual(com1SummonedPaladins.identity.race, 'Life',
    'CoM1 combat-summoned Paladins become live Life');
  assertEqual(com1SummonedPaladins.identity.fantastic, true,
    'CoM1 combat-summoned Paladins become live Fantastic');

  const zombies = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08',
    identity: ctx.createCustomUnitIdentity('com_6.08', { specialUnit: 'zombies' }),
  }));
  assertClose(zombies.toBlock, 0.2, 'CoM1 Zombies convert toblock=-1 to 20% To Block');
  assertEqual(zombies.statTrace.find(t => t.id === 'zombies:toBlock').changes.toBlk.delta, -10,
    'CoM1 Zombies trace the ten-percentage-point engine step');

  const breakthroughNormal = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { breakthrough: 'meleeDef' }, atk: 2, def: 2,
  }));
  assertEqual(breakthroughNormal.atk, 3, 'Normal Breakthrough derives the melee package');
  assertEqual(breakthroughNormal.def, 2,
    'Exceptional Breakthrough labels cannot override the normal package\'s zero Defense bonus');
  const breakthroughChosen = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { breakthrough: 'meleeDef' }, atk: 2, def: 2,
    identity: ctx.createUnitIdentity({ version: 'com2_1.05.11', templateId: 34,
      isHero: true, baseRace: 'Dwarf', baseFantastic: false, specialUnit: 'chosen' }),
  }));
  // The block at $005A376D..$005A3DDE admits the normal package on `(not U.combatsummoned) and
  // (not B.Fantastic)`, so the Fantastic term is the **permanent** record. The Chosen are live
  // Fantastic over a non-Fantastic base and therefore still take the package (F179).
  assertEqual(breakthroughChosen.identity.fantastic, true,
    'Chosen convert to live Fantastic over a non-Fantastic base');
  assert(breakthroughChosen.statTrace.some(t => t.id === 'breakthrough:normal'),
    'Live-Fantastic Chosen still receive the normal Breakthrough package, which tests the permanent record');
  const breakthroughSummoned = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { breakthrough: 'melee', combatSummoned: true }, atk: 2, def: 2,
  }));
  assertEqual(breakthroughSummoned.atk, 3, 'Combat Summoned derives Breakthrough attack');
  assertEqual(breakthroughSummoned.def, 3, 'Combat Summoned derives Breakthrough defense');
  const breakthroughNoncorporeal = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', abilities: { breakthrough: 'melee', nonCorporeal: true }, atk: 2, def: 2,
    identity: ctx.createCustomUnitIdentity('com2_1.05.11', {
      baseRace: 'Sorcery', baseFantastic: true,
    }),
  }));
  assertEqual(breakthroughNoncorporeal.atk, 3, 'Non-Corporeal derives Breakthrough attack');
  assertEqual(breakthroughNoncorporeal.def, 3, 'Non-Corporeal derives Breakthrough defense');
}

module.exports = { runIdentityChecks };
