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

// The phases that write the **permanent** record, i.e. the ones `a:baseCopy` stands behind.
// `STEP_PHASES` (`Calculator/steps.js`) is the ordered list; this is the prefix of it before the
// recalculation regions, and it is the split `a:baseCopy` exists to mark.
const PERMANENT_RECORD_PHASES = new Set([
  'template', 'training', 'immunities', 'buffs', 'debuffs',
]);

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
// conversion writes *only* those two fields, so the conversion list is the complete inventory of
// what can move `race` or `fantastic` — which is what lets a reader name the record it wants by
// naming a position (F246). These are the structural
// bounds that stop an effect rule from drifting back onto the compatibility projection — a
// conversion that read or wrote the token would fuse realm and Fantastic again, which is what
// forced Sanctify's realm-less `hero` special case before the split.
function runIdentityProjectionChecks(ctx) {
  const identitySource = calculatorSource('Calculator/stats_identity.js');
  const conversionsStart = identitySource.indexOf('function identityConversionSteps(');
  assert(conversionsStart >= 0, 'The identity conversions are found in stats_identity.js');
  // The function's own closing brace, at column 0. Bounding on the next `function` declaration
  // made the scanned region depend on what happened to follow the conversions in the file, and
  // F246's deletion of `targetingIdentity` silently widened it over two `const` tables.
  const conversionsEnd = identitySource.indexOf('\n}\n', conversionsStart);
  assert(conversionsEnd >= 0, 'identityConversionSteps has a closing brace at column 0');
  const conversions = identitySource.slice(conversionsStart, conversionsEnd);
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

// F267.1: `u.fantastic` at `template` rank is the **permanent** flag, in all five versions.
//
// This is the invariant F267 is built on — it is what lets `identity.baseFantastic` be replaced by
// the record — and until F267.1 it was false in exactly one build. CoM 1's Construct Catapult and
// combat-summon conversions sat in the `template` phase while writing the *calculated* record:
// `BU_UnitLoadToBattle` writes `bu->race` (com1:0x75D56/0x75D65) and
// `bu->Abilities |= UA_FANTASTIC` (com1:0x75D6C) on the battle unit, after `Load_Battle_Unit`
// (com1:0x75C8A) has imported the persistent record. Neither reaches `_UNITS[]`.
//
// Three assertions, and the third is the one a phase label alone cannot make:
//
//  1. **Source.** `identityConversionSteps` declares no `template`-phase step. A conversion is by
//     definition a write of the calculated `race`/`fantastic` pair, so a `template` one is the
//     defect this closed.
//  2. **Execution, per version.** No entry of the `race` or `fantastic` modifier trace carries
//     phase `template`, and the trace's seed value is the permanent one the identity states. The
//     trace records applied steps only, so this observes the writes that actually happened.
//  3. **The copy boundary, which is what the phase label stands for.** Every write of `race` or
//     `fantastic` sits on the side of `a:baseCopy` its phase requires: a permanent-record phase
//     (`template`, `training`, `immunities`, `buffs`, `debuffs`) ahead of the copy, every
//     calculated region behind it. Without this the whole check passes with both conversions
//     ranked *before* `a:baseCopy` — their values would then enter `ctx.base` and the split would
//     be defeated while every phase label still read correctly. The reviewer demonstrated exactly
//     that, in memory, against the first draft (F267.1 review, finding 2).
//
// The conversions' *survival* and their outputs are not asserted here: `runIdentityChecks` below
// already derives a CoM 1 Construct Catapult, Centaurs and Paladins and pins each one's realm,
// Fantastic flag and — for the Catapult — the Magic Weapons its persistent construction patch
// gives it. Deleting either conversion fails those, so restating them here would be duplication
// (F267.1 review, finding 3).
function runTemplateRankPermanentIdentityChecks(ctx) {
  const identitySource = calculatorSource('Calculator/stats_identity.js');
  const conversionsStart = identitySource.indexOf('function identityConversionSteps(');
  const conversions = identitySource.slice(conversionsStart,
    identitySource.indexOf('\n}\n', conversionsStart));
  assert(!/phase:\s*'template'/.test(conversions),
    'No identity conversion is declared in the template phase: a conversion writes the '
    + 'calculated record, and the template phase is the permanent one (F267.1)');

  const shapes = [
    ['plain', { isHero: false, baseRace: 'High Men', baseFantastic: false }],
    ['baseFantastic', { isHero: false, baseRace: 'Chaos', baseFantastic: true }],
    ['tpl37', { isHero: false, baseRace: 'Special', baseFantastic: false, templateId: 37 }],
    ['tpl54', { isHero: false, baseRace: 'Nature', baseFantastic: false, templateId: 54 }],
    ['tpl113', { isHero: false, baseRace: 'High Men', baseFantastic: false, templateId: 113 }],
    ['catapult', { isHero: false, baseRace: 'Special', baseFantastic: false,
      specialUnit: 'catapult' }],
  ];
  for (const version of evalInContext(ctx, 'ENGINE_VERSIONS')) {
    for (const [shapeName, shape] of shapes) {
      for (const combatSummoned of [false, true]) {
        const result = ctx.deriveUnitStats(baseUnitInput({
          version,
          identity: ctx.createUnitIdentity({ version, ...shape }),
          abilities: { combatSummoned },
        }));
        const label = `${version}/${shapeName}/combatSummoned=${combatSummoned}`;
        for (const field of ['race', 'fantastic']) {
          const trace = result.modifierTraces[field];
          assertEqual(trace.entries.filter(entry => entry.phase === 'template').length, 0,
            `${label}: no template-phase write of the calculated ${field} (F267.1)`);
        }
        assertEqual(result.modifierTraces.fantastic.base, !!shape.baseFantastic,
          `${label}: the record's Fantastic flag at template rank is the permanent one`);
        assertEqual(result.modifierTraces.race.base, shape.baseRace,
          `${label}: the record's race at template rank is the permanent one`);

        // 3. The copy boundary. `a:baseCopy` is the sequence's one boundary step and publishes
        // `ctx.base`; a phase label means nothing unless the step actually stands on the side of
        // the copy that label claims.
        for (const field of ['race', 'fantastic']) {
          const entries = result.modifierTraces[field].entries;
          const copy = entries.find(entry => entry.boundary && entry.id === 'baseCopy');
          assert(!!copy, `${label}: the ${field} trace crosses a:baseCopy`);
          for (const entry of entries) {
            if (entry === copy) continue;
            const permanent = PERMANENT_RECORD_PHASES.has(entry.phase);
            assert(permanent ? entry.order < copy.order : entry.order > copy.order,
              `${label}: ${entry.phase}:${entry.id} writes ${field} on the wrong side of `
              + `a:baseCopy — a ${entry.phase}-phase write must stand `
              + `${permanent ? 'ahead of' : 'behind'} the copy (F267.1)`);
          }
        }
      }
    }
  }
}

// F260.5: the card state carries one `identity` field, and every producer of one has to state
// the same unit the control path states.
//
// Three properties, each of which a wrong implementation would break silently:
//
//  1. The roster producer round-trips. `cardStateIdentity` over `rosterCardIdentity(unit,
//     version)` must equal `createRosterUnitIdentity(version, unit)` — the identity the page
//     derived before the field existed. That is also what makes the special-unit clamp
//     `rosterCardIdentity` applies *provably* inert on the roster rather than assumed inert: a
//     future `specialUnitForRoster` answer wider than that key's own `versions` entry fails here.
//  2. The control producer keeps the clamp's two answers in their order. `specialUnitAllowed`
//     asks `specialUnitDef` first, so a key this build does not define halts, and only a defined
//     key the selected version disallows clamps to `none`. A preset naming `golem` under MoM has
//     to resolve to `none`, because that is what the `Special unit` selector leaves the card
//     holding.
//  3. `presetIdentity` translates the historical `unitType` token exactly as
//     `setIdentityControlsFromLegacy` does, and never lets that token overwrite an explicit R8
//     `identity` block.
function runCardStateIdentityChecks(ctx) {
  const rosterSets = [
    ['mom_1.31', 'MOM_UNITS_DATA'],
    ['mom_cp_1.60.00', 'MOM_UNITS_DATA'],
    ['com_6.08', 'COM_UNITS_DATA'],
    ['com2_1.05.11', 'COM2_UNITS_DATA'],
    ['com2_warlord_1.5.12.9', 'WARLORD_UNITS_DATA'],
  ];
  for (const [version, dataName] of rosterSets) {
    for (const unit of Object.values(evalInContext(ctx, dataName))) {
      const label = `${version} template ${unit.templateId} (${unit.name})`;
      const card = ctx.rosterCardIdentity(unit, version);
      const stored = ctx.rosterStoredIdentity(unit, version);
      assertEqual(card.specialUnit, stored.specialUnit,
        `${label}: the card identity's special-unit clamp is inert on the roster`);
      assert(!Object.prototype.hasOwnProperty.call(card, 'version'),
        `${label}: the card identity bakes in no version`);
      assertEqual(JSON.stringify(ctx.cardStateIdentity({ prefix: 'a', identity: card }, version)),
        JSON.stringify(ctx.createRosterUnitIdentity(version, unit)),
        `${label}: the card state's single identity field derives the record's own identity`);
      assertEqual(card.name, unit.name, `${label}: the card identity carries the record's name`);
    }
  }

  // The control producer, and the clamp's two questions in order.
  const custom = ctx.customCardIdentity(
    { isHero: true, baseRace: 'Life', baseFantastic: false, specialUnit: 'none' },
    'com2_1.05.11', 'unit check');
  assertEqual(custom.templateId, null, 'A control-stated card identity has no source template');
  assertEqual(custom.heroTypeId, null, 'A control-stated card identity has no hero-type id');
  assertEqual(custom.isHero, true, 'A control-stated card identity keeps Hero');
  assertEqual(ctx.customCardIdentity({ specialUnit: 'golem' }, 'com2_1.05.11', 'x').specialUnit,
    'golem', 'A special-unit key the version allows survives onto the card state');
  assertEqual(ctx.customCardIdentity({ specialUnit: 'golem' }, 'mom_1.31', 'x').specialUnit,
    'none', 'A defined special-unit key the version disallows clamps to none, as the selector does');
  assertEqual(ctx.customCardIdentity({ specialUnit: 'chosen' }, 'com_6.08', 'x').specialUnit,
    'none', 'Version scope is asked per key, not per version family');
  let threw = null;
  try {
    ctx.customCardIdentity({ specialUnit: 'juggernautF260' }, 'com2_1.05.11', 'unit check');
  } catch (err) { threw = err; }
  assert(threw && /juggernautF260/.test(threw.message),
    'A special-unit key this build does not define halts rather than clamping to none');

  // `presetIdentity`: the R8 block wins, and the historical token translates one way.
  const r8 = ctx.presetIdentity(
    { identity: { isHero: false, baseFantastic: true, baseRace: 'Death', specialUnit: 'none' },
      unitType: 'hero', race: 'Life' }, 'com2_1.05.11', 'unit check');
  assertEqual(r8.baseRace, 'Death', 'An explicit R8 identity is not overwritten by unitType');
  assertEqual(r8.isHero, false, 'An explicit R8 identity is not overwritten by unitType (Hero)');
  assertEqual(r8.baseFantastic, true, 'An explicit R8 identity keeps its Fantastic bit');
  const legacyHero = ctx.presetIdentity({ unitType: 'hero' }, 'com2_1.05.11', 'unit check');
  assertEqual(legacyHero.isHero, true, 'The legacy hero token translates to isHero');
  assertEqual(legacyHero.baseFantastic, false, 'The legacy hero token is not Fantastic');
  const legacyRealm = ctx.presetIdentity({ unitType: 'fantastic_sorcery' }, 'com2_1.05.11', 'x');
  assertEqual(legacyRealm.baseFantastic, true, 'A legacy realm token translates to Fantastic');
  assertEqual(legacyRealm.baseRace, 'Sorcery', 'A legacy realm token names its realm as base race');
  const legacyRace = ctx.presetIdentity({ unitType: 'fantastic_chaos', race: 'Troll' },
    'com2_1.05.11', 'unit check');
  assertEqual(legacyRace.baseRace, 'Troll', 'An explicit race outranks the token realm');
  const bare = ctx.presetIdentity({}, 'com2_1.05.11', 'unit check');
  assertEqual(bare.isHero, false, 'A fixture stating no identity is UNIT_DEFAULTS.unitType');
  assertEqual(bare.baseFantastic, false, 'A fixture stating no identity is not Fantastic');
  assertEqual(bare.specialUnit, 'none', 'A fixture stating no identity names no special unit');
  assertEqual(ctx.presetIdentity({ specialUnit: 'golem' }, 'mom_1.31', 'x').specialUnit, 'none',
    'A preset naming a special unit its version disallows resolves as the control path does');

  // A preset's special unit, both ways round. Without these, `presetIdentity` emitting a constant
  // `'none'` passes every other assertion here — the GPT review of F260.5 named that exact wrong
  // implementation, and F267 later dissolves `specialUnit` into `u.unittype` comparisons, so the
  // allowed case has to be pinned before that move.
  assertEqual(ctx.presetIdentity({ specialUnit: 'golem' }, 'com2_1.05.11', 'x').specialUnit,
    'golem', 'A preset naming a special unit its version allows keeps it');
  assertEqual(ctx.presetIdentity({ identity: { specialUnit: 'chosen' } }, 'com2_1.05.11', 'x')
    .specialUnit, 'chosen', 'An R8 preset identity keeps a special unit its version allows');
  let presetUndefined = null;
  try {
    ctx.presetIdentity({ specialUnit: 'juggernautF260' }, 'com2_1.05.11', 'Preset probe');
  } catch (err) { presetUndefined = err; }
  assert(presetUndefined && /juggernautF260/.test(presetUndefined.message),
    'A preset naming a special-unit key this build does not define halts');

  // The fixture's display name travels with the identity, so F260.6 needs no second merge.
  assertEqual(ctx.presetIdentity({ name: 'Synthetic Chosen', unitType: 'normal' },
    'com2_1.05.11', 'x').name, 'Synthetic Chosen',
  'A preset fixture name reaches the card identity through the legacy branch');
  assertEqual(ctx.presetIdentity({ name: 'Synthetic Chosen', identity: { baseRace: 'Life' } },
    'com2_1.05.11', 'x').name, 'Synthetic Chosen',
  'A preset fixture name reaches the card identity through the R8 branch');
  assertEqual(ctx.presetIdentity({ unitType: 'normal' }, 'com2_1.05.11', 'x').name, undefined,
    'A fixture with no name states none rather than an empty one');

  // A base race that is present and not a string is a broken fixture. The DOM path coerced it
  // through the `<select>` and derived a race no version has.
  let badRace = null;
  try {
    ctx.presetIdentity({ unitType: 'normal', race: { malformed: true } }, 'com2_1.05.11',
      'Preset probe');
  } catch (err) { badRace = err; }
  assert(badRace && /not a string/.test(badRace.message),
    'A non-string base race halts naming the fixture rather than reaching the derivation');
  assertEqual(ctx.customCardIdentity({ baseRace: null }, 'com2_1.05.11', 'x').baseRace, '',
    'An absent base race is the no-race answer, not an error');

  // The projection halts on a state that does not state a plain-object identity rather than
  // deriving a default unit from the spread of something else. `Date` and `RegExp` spread to
  // nothing, so every field would silently take its default (GPT review of F260.5).
  for (const [label, value] of [
    ['absent', undefined], ['null', null], ['a scalar', 7], ['an array', []],
    ['a Date', new Date(0)], ['a RegExp', /x/],
  ]) {
    let missing = null;
    try { ctx.cardStateIdentity({ prefix: 'a', identity: value }, 'com2_1.05.11'); }
    catch (err) { missing = err; }
    assert(missing && /states no identity/.test(missing.message) && /side 'a'/.test(missing.message),
      `A card state whose identity is ${label} halts naming the side`);
  }
}

function runIdentityChecks(ctx) {
  runIdentityProjectionChecks(ctx);
  runTemplateRankPermanentIdentityChecks(ctx);
  runCardStateIdentityChecks(ctx);
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
