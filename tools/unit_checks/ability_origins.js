// F244.3a: the origin table (`Calculator/stats_origins.js`) against the code it classifies.
//
// The table says, for every raw ability key, how the unit comes to carry it — template intrinsic,
// training grant, beneficial or detrimental cast, a region-`a`/`b`/`c`/`d` recalculation grant, a
// non-record input, or a calculator-internal derived key. F244.3b reads it to decide which seeded
// key becomes a positioned write and at which phase, so a key the table has not heard of, or a row
// whose version scope disagrees with the control or the step it names, is a defect that would
// silently mis-seed the record.
//
// The key universe is enumerated from the code rather than restated: the calc keys of
// `ABILITY_DEFS` and `ENCHANTMENT_DEFS`, the keys the five pre-sequence transforms write, and the
// four record-field lists in `stats_identity.js`. The transform-write list is the one part that
// cannot be read off a data structure — the transforms write object literals — so it is stated
// below and checked against the transforms by running them.
//
// `abilityVersionGated` (`ability_gating.js`) is the single home for "does this control exist in this
// version". That source is `data-scope="core"` (F260.2), so the calculator context already carries
// it and no page source is injected here.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { repoRoot } = require('../calculator_sources');
const { assert, assertClose, assertEqual, assertSameKeyList, assertSeedRefusesKey,
  baseUnitInput, seedRefusesKeyIn } = require('./assertions');

// The keys each pre-sequence transform writes into the ability map. Stated here because the writes
// are object literals inside the transforms; `runTransformWriteChecks` below runs each transform
// against an input that turns its grants on and asserts the produced key set matches, so a grant
// added to a transform without a row here fails rather than passing unclassified.
const TRANSFORM_WRITES = {
  golemShaping: ['elemArmor'],
  applySanctaBasilicaGrant: ['sanctify', 'lucky', 'luckyPhaseBase', 'magicImmunity'],
  applyPillarOfFaithGrant: ['lucky', 'luckyPhaseBase'],
  // `deriveMarionettePackage` left this map entirely in F244.3g, which is why it has no entry.
  // The strayed branch's eight writes became steps in F244.3f and the owned branch's thirty-one in
  // F244.3g, so the function grants no ability key at all and is no longer one of
  // `ABILITY_ORIGIN_TRANSFORMS`. `luckyPhaseB` went with them and is not a key of any kind now: it
  // was a write-only derived flag standing for no engine write, retired the way F198 and F244.3e
  // retired theirs.
};

// Which origins each producer form can possibly stand for (F244.3a review, finding 3). Before
// this, the prefix was checked syntactically and any origin could carry any producer, so a row
// naming a global as a cast — the seven the review found — passed. A form absent from this map
// admits every origin; `step:` is not here because its phase is checked exactly, against the step
// id itself.
const PRODUCER_ORIGINS = {
  cast: ['buffs', 'debuffs'],
  input: ['nonRecord'],
  grant: ['training', 'regionA', 'regionB', 'regionC', 'regionD'],
  postChain: ['regionD', 'derived'],
  transform: ['training', 'buffs', 'debuffs', 'regionA', 'regionB', 'regionC', 'regionD', 'derived'],
  none: ['derived'],
  control: ['template'],
};

// The producer's form, for `PRODUCER_ORIGINS`. `control:<key>` is deliberately not `control`: a
// bare `control` is the key's own control stating a roster fact, so it implies `template`, while a
// second control naming the same calc key (Hillfort naming Missile Immunity) says only that the
// control exists — the origin beside it is what says when the engine makes the write.
function producerForm(producer) {
  if (producer === 'control') return 'control';
  if (producer === 'none') return 'none';
  const cut = producer.indexOf(':');
  if (cut < 0) return null;
  const prefix = producer.slice(0, cut);
  return prefix === 'control' ? null : prefix;
}

// Ability-map keys no definition exposes and no transform writes, which the derivation
// nevertheless reads (F244.3a review, finding 2). The universe below is enumerated from the defs,
// the transforms and the record-field lists, so a compatibility read is invisible to it and the
// table would be asserted complete while missing them. Each is declared here with the source that
// reads it, and the read is checked against the file text, so a key that stops being read fails
// here rather than sitting in the table forever.
const COMPATIBILITY_ABILITY_KEYS = {
  // The legacy Lava Smelter selector, kept so old presets and share payloads still load.
  lavaSmelter: [['Calculator/stats_identity.js', 'marked.lavaSmelter']],
  // Identity metadata mirrored into the ability map; the identity record is its home. The
  // `combat_abilities.js` site was Breakthrough's fallback and went with F244.3h, which made the
  // block's `not B.Fantastic` a `when` over `ctx.base`; the two combat_effects.js reads remain.
  baseFantastic: [['Calculator/combat_effects.js', 'abilities.baseFantastic']],
};

function assertCompatibilityReads() {
  for (const [key, sites] of Object.entries(COMPATIBILITY_ABILITY_KEYS)) {
    for (const [file, text] of sites) {
      const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
      assert(source.includes(text),
        `${key}: ${file} still reads it as '${text}', which is why the table classifies it`);
    }
  }
}

const WARLORD = 'com2_warlord_1.5.12.9';

// `abilityUiDefs` and `abilityVersionGated` are `data-scope="core"` (`ability_gating.js`), so a
// core context already carries them. Kept as a named assertion rather than dropped: a move back
// into page scope must fail here loudly instead of throwing a bare ReferenceError deeper in.
function loadUiDefs(ctx) {
  if (!vm.runInContext('typeof abilityUiDefs === "function"', ctx)) {
    throw new Error('ability_origins: abilityUiDefs is not in the core context; '
      + 'Calculator/ability_gating.js must stay data-scope="core"');
  }
}

// Every key a transform can write, measured by running it rather than read off a list.
function runTransformWriteChecks(ctx) {
  const read = expression => vm.runInContext(expression, ctx);
  // The two lists are one fact in two places, and the write check below is conditional on this
  // file carrying the transform. Without this, a producer could name a transform absent from
  // `TRANSFORM_WRITES` and its `${name} actually writes the key` assertion would simply be
  // skipped (F244.3a review, finding 4).
  assertSameKeyList(Object.keys(TRANSFORM_WRITES).sort(),
    [...read('ABILITY_ORIGIN_TRANSFORMS')].sort(),
    'TRANSFORM_WRITES covers exactly the transforms ABILITY_ORIGIN_TRANSFORMS declares');
  // The hero flag as well as the hero type: the Marionette region opens on
  // `IF ( ISHERO(U) = 0 ) THEN { GOTO "NOTHERO"; }`, and `deriveMarionettePackage` enforces it
  // since F244.3f. This identity used to state `isHero: false` and still got the package.
  // Since F267.6 the package is asked of the **record**: `ishero` and `herotype` are the two
  // `UnitT` members it reads, not fields of an identity object beside it.
  const identity = { herotype: 48, ishero: true, race: 'High Men' };
  const marionetteInput = {
    channeler: true, marionettePrimary: 'nature', marionetteAscension: true,
    marionetteNatureBooks: 13, marionetteSorceryBooks: 13, marionetteChaosBooks: 13,
    marionetteLifeBooks: 13, marionetteDeathBooks: 13,
  };
  // `deriveOutlanderReformRecord` left `ABILITY_ORIGIN_TRANSFORMS` in F244.3e because it grants
  // nothing any more: every reform write is a positioned step, and the record it returns supplies
  // each one's `when`. That is measured rather than asserted — the input below turns every reform
  // state on, and the returned map must add no key. Without it the transform could start granting
  // again and the origin table would classify the new key nowhere.
  const outlanderInput = {
    outlanderWizard: true, mechanical: true, armorcladReform: true, heatPowerEngine: true,
    temporalEngineering: true, sailing: true, magitekEngineering: true, magitekScience: true,
    militaryDrilling: true, energyBeamWeapons: true, psychoConverter: true, pneumaReactor: true,
    xenopsychology: true, radio: true, xenoveterinary: true, ballisticsTraining: true,
  };
  const outlanderBefore = { ...outlanderInput };
  const outlanderAfter = read('deriveOutlanderReformRecord')(
    outlanderBefore, WARLORD, false, false).abilities;
  assertSameKeyList(
    Object.keys(outlanderAfter).filter(key => outlanderAfter[key] !== outlanderBefore[key]).sort(),
    [], 'deriveOutlanderReformRecord adds no ability key: every reform write is a positioned step');
  const cases = [
    ['applySanctaBasilicaGrant', { sanctaBasilica: true, clergy: true },
      abil => read('applySanctaBasilicaGrant')(abil, WARLORD, 'normal', 'High Men', 'High Men Crusaders')],
    ['applyPillarOfFaithGrant', { pillarOfFaithLucky: true },
      abil => read('applyPillarOfFaithGrant')(abil, WARLORD)],
  ];
  for (const [name, input, run] of cases) {
    const before = { ...input };
    const after = run(before);
    const written = Object.keys(after).filter(key => after[key] !== before[key]).sort();
    // The Sancta Basilica case takes the Crusader name, so it cannot also produce the Paladin
    // branch's Magic Immunity in one run; the union over its branches is what the table classifies.
    const expected = name === 'applySanctaBasilicaGrant'
      ? TRANSFORM_WRITES[name].filter(key => key !== 'magicImmunity').sort()
      : [...TRANSFORM_WRITES[name]].sort();
    assertSameKeyList(written, expected,
      `${name} writes exactly the ability keys the origin table classifies for it`);
  }
  // The Marionette package adds no ability key either, since F244.3g positioned the owned branch's
  // thirty-one grants (F244.3f did the strayed branch's eight). Its branches are mutually exclusive
  // — strayed against owned, and one primary realm per ascension — so the claim is checked over all
  // seven runs rather than one, with every book count saturated so no threshold is left untested.
  const marionetteRuns = [{ ...marionetteInput, channeler: false }];
  for (const primary of ['nature', 'sorcery', 'chaos', 'life', 'death']) {
    marionetteRuns.push({ ...marionetteInput, marionettePrimary: primary });
  }
  const marionetteWritten = new Set();
  for (const input of marionetteRuns) {
    const before = { ...input };
    const after = read('deriveMarionettePackage')(identity, before, WARLORD).abilities;
    for (const key of Object.keys(after)) if (after[key] !== before[key]) marionetteWritten.add(key);
  }
  assertSameKeyList([...marionetteWritten].sort(), [],
    'deriveMarionettePackage adds no ability key: every branch write is a positioned step');
  // And the labels it still produces are a display list, not a source: the owned branch's package
  // names all thirty-one grants an ascended thirteen-book Channeler receives, while the ability map
  // it returns is the one it was handed.
  const saturated = read('deriveMarionettePackage')(identity,
    { ...marionetteInput, marionettePrimary: 'life' }, WARLORD).package;
  assertEqual(saturated.grantedAbilities.length, 23,
    'one saturated ascended run still reports its sixteen book, two realm and five ascension-book '
    + 'grants as labels');
  const allLabels = new Set();
  for (const input of marionetteRuns.slice(1)) {
    for (const label of read('deriveMarionettePackage')(identity, { ...input }, WARLORD)
      .package.grantedAbilities) allLabels.add(label);
  }
  assertEqual(allLabels.size, 31,
    'and the five primaries between them name all thirty-one, which is the count the steps write');

  // The Paladin branch, for the one key the Crusader run cannot reach.
  const paladin = read('applySanctaBasilicaGrant')(
    { sanctaBasilica: true }, WARLORD, 'normal', 'High Men', 'High Men Paladins');
  assert(paladin.magicImmunity === true,
    'applySanctaBasilicaGrant grants Magic Immunity on the Paladin branch, as the table says');
  // The Golem shaping is inline in `deriveUnitStats`, so it is measured through a derivation.
  const golem = read('deriveUnitStats')(baseUnitInput({
    version: 'com2_1.05.11', atk: 5, def: 4, res: 6, hp: 4,
    identity: { version: 'com2_1.05.11', specialUnit: 'golem', baseRace: '', baseFantastic: false },
  }));
  assertEqual(golem.abilities.elemArmor, 'resistElements',
    'The Golem shaping writes the one key the origin table classifies for it');
}

function runAbilityOriginChecks(ctx) {
  loadUiDefs(ctx);
  const read = expression => vm.runInContext(expression, ctx);

  const versions = read('ENGINE_VERSIONS');
  const origins = read('ABILITY_ORIGINS');
  const originPhase = read('ORIGIN_PHASE');
  const table = read('ABILITY_KEY_ORIGINS');
  const transforms = read('ABILITY_ORIGIN_TRANSFORMS');
  const debuffExemptions = read('DEBUFFS_OUTSIDE_CURSE_LISTS');
  const stepScopes = read('STEP_VERSION_SCOPES');
  const stepPhases = read('STEP_PHASES');
  const gated = read('abilityVersionGated');

  const magicCurses = read('MAGIC_IMMUNITY_GATED_CURSES');
  const illusionCurses = read('ILLUSION_IMMUNITY_GATED_CURSES');
  const grantFields = read('POSITIONED_GRANT_FIELDS');
  const grantWrites = read('POSITIONED_GRANT_WRITES');
  const grantValueWrites = read('POSITIONED_GRANT_VALUE_WRITES');
  const derivedOutlander = read('DERIVED_OUTLANDER_STATE_KEYS');

  // --- 1. the key universe, enumerated from the code -----------------------------------------
  const controlVersions = new Map();
  // The innate half's scope on its own (F252.3): which versions an `ABILITY_DEFS` control offers
  // the calc key in, which is what a `template` row states.
  const innateControlVersions = new Map();
  const controlKeys = new Set();
  const controlsByKey = new Map();
  for (const def of read('abilityUiDefs')()) {
    const key = def.calcKey;
    controlKeys.add(def.key);
    controlsByKey.set(def.key, key);
    if (!controlVersions.has(key)) controlVersions.set(key, new Set());
    if (def.source === 'ability' && !innateControlVersions.has(key)) {
      innateControlVersions.set(key, new Set());
    }
    for (const version of versions) {
      if (gated(def, version)) continue;
      controlVersions.get(key).add(version);
      if (def.source === 'ability') innateControlVersions.get(key).add(version);
    }
  }
  const universe = new Set(controlVersions.keys());
  for (const written of Object.values(TRANSFORM_WRITES)) for (const key of written) universe.add(key);
  for (const list of [magicCurses, illusionCurses, grantFields, grantWrites, grantValueWrites,
    derivedOutlander]) for (const key of list) universe.add(key);
  assertCompatibilityReads();
  for (const key of Object.keys(COMPATIBILITY_ABILITY_KEYS)) universe.add(key);

  assertSameKeyList(Object.keys(table).sort(), [...universe].sort(),
    'The origin table names exactly the ability keys the defs, the transforms and the record-field '
    + 'lists expose');

  // --- 2. row shape ---------------------------------------------------------------------------
  for (const [key, rows] of Object.entries(table)) {
    assert(Array.isArray(rows) && rows.length > 0, `${key} carries at least one origin row`);
    const seen = new Set();
    for (const row of rows) {
      assert(origins.includes(row.origin), `${key}: '${row.origin}' is a declared origin`);
      assert(!seen.has(row.origin), `${key}: one row per origin (${row.origin} appears once)`);
      seen.add(row.origin);
      assert(Array.isArray(row.versions) && row.versions.length > 0,
        `${key}/${row.origin}: the version scope is a non-empty list`);
      for (const version of row.versions) {
        assert(versions.includes(version), `${key}/${row.origin}: '${version}' is an engine version`);
      }
      assert(Array.isArray(row.producers) && row.producers.length > 0,
        `${key}/${row.origin}: at least one producer is named`);
      const phase = originPhase[row.origin];
      assert(phase === null || stepPhases.includes(phase),
        `${key}/${row.origin}: ORIGIN_PHASE names a declared step phase or null`);
      // `admits` — which input key admits the row's write (F253.2). Omitting it reads as the row's
      // own key, so a row that spells that out explicitly would be a second spelling of the
      // default and is refused; a row naming an input key the table has never heard of is a typo
      // the seed's halt would print verbatim. It belongs only on a row whose origin is a record
      // write: a `nonRecord` or `derived` key is read straight off the input map, where there is
      // no gate to be admitted by.
      if ('admits' in row) {
        assert(Array.isArray(row.admits), `${key}/${row.origin}: admits is a list`);
        assert(phase !== null,
          `${key}/${row.origin}: admits belongs to a record write, not a ${row.origin} row`);
        assert(!(row.admits.length === 1 && row.admits[0] === key),
          `${key}/${row.origin}: admits naming only '${key}' is the default — omit it`);
        for (const admitted of row.admits) {
          assert(!!table[admitted],
            `${key}/${row.origin}: admits names '${admitted}', which is an ability key the origin `
            + 'table knows');
        }
      }
    }
  }

  // --- 3. producers name real steps and real transforms ----------------------------------------
  for (const [key, rows] of Object.entries(table)) {
    for (const row of rows) {
      const stepIds = [];
      for (const producer of row.producers) {
        if (producer.startsWith('step:')) {
          const id = producer.slice(5);
          assert(!!stepScopes[id], `${key}/${row.origin}: producer names the known step ${id}`);
          if (stepScopes[id]) {
            assertEqual(id.slice(0, id.indexOf(':')), originPhase[row.origin],
              `${key}/${row.origin}: step ${id} sits in the phase the origin implies`);
            stepIds.push(id);
          }
        } else if (producer.startsWith('transform:')) {
          const name = producer.slice(10);
          assert(transforms.includes(name),
            `${key}/${row.origin}: producer names a declared pre-sequence transform (${name})`);
          if (TRANSFORM_WRITES[name]) {
            assert(TRANSFORM_WRITES[name].includes(key),
              `${key}/${row.origin}: ${name} actually writes the key`);
          }
        } else if (producer.startsWith('control:')) {
          const name = producer.slice(8);
          assert(controlKeys.has(name),
            `${key}/${row.origin}: producer names the control ${name}`);
          assert(controlsByKey.get(name) === key,
            `${key}/${row.origin}: control ${name} names this calc key`);
        } else {
          assert(/^(control|cast:|input:|grant:|postChain:|none$)/.test(producer),
            `${key}/${row.origin}: '${producer}' uses a declared producer form`);
        }
        // The form admits only the origins it can stand for, so a global cannot be filed as a
        // cast and an item grant cannot be filed as a user input.
        const form = producerForm(producer);
        if (form && PRODUCER_ORIGINS[form]) {
          assert(PRODUCER_ORIGINS[form].includes(row.origin),
            `${key}/${row.origin}: a '${form}' producer stands only for `
            + `${PRODUCER_ORIGINS[form].join('/')}`);
        }
      }
      // A row whose producers are all steps takes its scope from them, so the two cannot drift.
      if (stepIds.length === row.producers.length) {
        const union = new Set();
        for (const id of stepIds) for (const version of stepScopes[id]) union.add(version);
        assertSameKeyList([...row.versions].sort(), [...union].sort(),
          `${key}/${row.origin}: the scope is the union of its steps' STEP_VERSION_SCOPES entries`);
      }
    }
  }

  // --- 4. the table against the control set ----------------------------------------------------
  // The `template` row is the **innate** control's scope, not the union of both sources' (F252.3).
  // Since the seed reads the innate half, a template row states what the unit can be *built* with;
  // an enchantment control reaching the same calc key in some further version is a cast and takes a
  // positioned `immunities`/`buffs`/`debuffs` write there, not a wider template row. The two
  // scopes coincide for all 48 innate calc keys today, so this is a narrowing that costs nothing
  // now and refuses the wrong widening later.
  //
  // The converse is the mechanical form of F252.3's second half — "any innate key with no
  // `template` origin becomes a positioned `template` step". That set is **empty**: every calc key
  // an `ABILITY_DEFS` control names already has a template row covering exactly the versions the
  // control offers it, so the subtask positioned no new step. This assertion is what keeps it
  // empty; a new innate control with no template row halts here instead of seeding nothing.
  for (const [key, rows] of Object.entries(table)) {
    const visible = controlVersions.get(key);
    const innateVisible = innateControlVersions.get(key);
    const templateRow = rows.find(row => row.origin === 'template');
    if (templateRow) {
      assert(!!innateVisible, `${key}: a template row belongs to a key an ability control names`);
      if (innateVisible) {
        assertSameKeyList([...templateRow.versions].sort(), [...innateVisible].sort(),
          `${key}: the template row covers exactly the versions the ability control offers the `
          + "key in — the innate half is the seed's only source (F252.3)");
      }
    }
    if (innateVisible && innateVisible.size) {
      assert(!!templateRow,
        `${key}: an ability control offers it, so it has a template row — the innate half is a `
        + 'seed write and there is no positioned `template` step to fall back on (F252.3)');
    }
    if (visible) {
      const covered = new Set();
      for (const row of rows) for (const version of row.versions) covered.add(version);
      for (const version of visible) {
        assert(covered.has(version),
          `${key}: some origin row covers ${version}, where a control offers the key`);
      }
    }
  }

  // --- 5. curses ------------------------------------------------------------------------------
  const curseKeys = new Set([...magicCurses, ...illusionCurses]);
  for (const key of curseKeys) {
    const rows = table[key] || [];
    assert(rows.some(row => row.origin === 'debuffs'),
      `${key} is on a curse list, so the table classifies it as a detrimental cast`);
  }
  for (const [key, rows] of Object.entries(table)) {
    if (!rows.some(row => row.origin === 'debuffs')) continue;
    assert(curseKeys.has(key) || Object.prototype.hasOwnProperty.call(debuffExemptions, key),
      `${key} is a detrimental cast, so it is on a curse list or in DEBUFFS_OUTSIDE_CURSE_LISTS`);
  }
  for (const key of Object.keys(debuffExemptions)) {
    assert(!curseKeys.has(key),
      `${key} is exempted from the curse lists, so it must not also be on one`);
    assert((table[key] || []).some(row => row.origin === 'debuffs'),
      `${key} is exempted from the curse lists, so it must be a detrimental cast`);
  }

  // --- 6. the record-field lists ----------------------------------------------------------------
  // Everything the record seeds today has to be classified, and everything the record carries
  // because a step writes it has to have an origin that can take a position.
  const positioned = new Set(['template', 'training', 'buffs', 'debuffs',
    'regionA', 'regionB', 'regionC', 'regionD']);
  for (const key of [...magicCurses, ...grantFields, ...grantWrites, ...grantValueWrites]) {
    const rows = table[key] || [];
    assert(rows.length > 0, `${key} is a seeded record field, so the table classifies it`);
    assert(rows.some(row => positioned.has(row.origin)),
      `${key} is a seeded record field, so at least one origin can take a position`);
  }
  for (const key of [...grantWrites, ...grantValueWrites]) {
    assert((table[key] || []).some(row => originPhase[row.origin] !== null),
      `${key} is written by a positioned step, so its origin implies a phase`);
  }
  // The converse: a key with no positioned origin must not be a record field, or F244.3b would
  // seed something no rank can ever write.
  const recordFields = new Set([...magicCurses, ...grantFields, ...grantWrites, ...grantValueWrites]);
  for (const [key, rows] of Object.entries(table)) {
    if (rows.some(row => positioned.has(row.origin))) continue;
    assert(!recordFields.has(key),
      `${key} has no positioned origin, so it must not be a seeded record field`);
  }

  // --- 7. the helpers -------------------------------------------------------------------------
  const abilityOriginPhases = read('abilityOriginPhases');
  const abilityOriginIsTemplate = read('abilityOriginIsTemplate');
  const phaseRank = read('STEP_PHASE_RANK');
  for (const key of Object.keys(table)) {
    const phases = abilityOriginPhases(key);
    for (let i = 1; i < phases.length; i++) {
      assert(phaseRank[phases[i - 1]] < phaseRank[phases[i]],
        `${key}: abilityOriginPhases returns the phases in chain order`);
    }
  }
  assert(abilityOriginIsTemplate('lucky', 'mom_1.31'),
    'Lucky is a template intrinsic in MoM 1.31, where the ability control offers it');
  assert(!abilityOriginIsTemplate('destiny', 'com2_1.05.11'),
    'Destiny is a cast, not a template intrinsic, so the seed may not carry it');
  let halted = false;
  try {
    read('abilityOriginRows')('notAnAbilityKey');
  } catch (err) {
    halted = /has no origin row/.test(String(err.message));
  }
  assert(halted, 'An unclassified key halts rather than reading as undefined');

  runTransformWriteChecks(ctx);
  runRecordSeedChecks(ctx, table, {
    magicCurses, grantFields, grantWrites, grantValueWrites, versions,
    abilityOriginIsTemplate, positioned,
  });
  runLavaSmelterGrantChecks(ctx, { versions, abilityOriginIsTemplate });
  runOutlanderReformGrantChecks(ctx, { versions, abilityOriginIsTemplate });
  runStrayedMarionetteChecks(ctx, { versions, table, scopes: stepScopes });
  runOwnedMarionetteChecks(ctx, { versions, table, scopes: stepScopes });
  runPermanentAttackRecordChecks(ctx);
}

// Composing a derivation while `statStep` is wrapped, so the steps it builds are captured with
// their live closures. This is what lets a check call a step's `when` directly instead of reaching
// it through an input (F244.3f review, finding 5) — the two Marionette sections below both need it,
// so it lives here rather than inside either.
function captureComposedSteps(ctx, build) {
  const read = expression => vm.runInContext(expression, ctx);
  ctx.__capturedSteps = [];
  read('(function () { var original = statStep;'
    + ' statStep = function (step) { var made = original(step); __capturedSteps.push(made);'
    + ' return made; };'
    + ' __restoreStatStep = function () { statStep = original; }; }())');
  try { build(); } finally { read('__restoreStatStep()'); }
  return ctx.__capturedSteps;
}

function composedPredicate(steps, id, phase) {
  const found = steps.filter(step => step.id === id && step.phase === phase);
  assertEqual(found.length, 1, `exactly one ${phase}:${id} step is composed`);
  return found[0].when;
}

// --- 12. the strayed Marionette package (F244.3f) ---------------------------------------------
// `deriveMarionettePackage`'s strayed branch used to merge eight keys into the ability map before
// the sequence; `b:marionette:strayedPackage` and `b:marionette:spellLock` write them now. Seven
// claims, each of which a wrong wiring would break silently: the branch still delivers all eight,
// the two steps sit at the ranks the script's line order gives them, the block's skip is read off
// the record, the two later blocks read their flag off the record rather than off the branch
// constant, the three gates behave correctly on records no control can currently build, the keys
// with no control of their own are not inputs, and the one key whose control the move stranded has
// a cast route again.
const STRAYED_PACKAGE_VALUES = Object.freeze({
  transmuteEquipment: true, rebuild: true, sage: 2, mechanicalMaster: 2, ritualMaster: 2,
  charmed: true, arcaneWard: 2, spellLock: true,
});
// The four with no control in any version. `charmed` (all five), `rebuild` (Warlord),
// `spellLock` (CoM 1) and, since F256.2, `transmuteEquipment` (Warlord) are left out because each
// has a control whose mark reaches the record its own way, which is what claims 4 and 6 are about.
const STRAYED_UNCONTROLLED_KEYS = ['sage', 'mechanicalMaster',
  'ritualMaster', 'arcaneWard'];

function runStrayedMarionetteChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { versions, table, scopes } = deps;
  const derive = read('deriveUnitStats');
  // Hero type 48 and the hero flag both: the strayed branch is inside the script's
  // `IF ( ISHERO(U) = 0 ) THEN { GOTO "NOTHERO"; }`, and `b:rebuild`'s hero arm reads the same
  // flag, so a Wanderer stated without it takes the non-hero `buffs:rebuild` instead.
  const wandererIdentity = { version: WARLORD, heroTypeId: 48, isHero: true, unitType: 'hero',
    baseRace: '', baseFantastic: false };
  const wanderer = (abilities = {}, over = {}) => derive(baseUnitInput({
    version: WARLORD, atk: 5, def: 5, res: 10, hp: 10, unitType: 'hero',
    identity: wandererIdentity, abilities, ...over }));
  const statusOf = (result, id) => {
    const entry = result.statExecutionTrace.find(event => event.id === id);
    return entry ? entry.status : 'absent';
  };

  // 1. The branch still delivers every one of the eight, now off the record rather than out of a
  // pre-sequence merge. The four `SETHEAB` ranks are values, not flags, so each is asserted at the
  // number the script states rather than through `!!`.
  const strayed = wanderer();
  for (const [key, value] of Object.entries(STRAYED_PACKAGE_VALUES)) {
    assertEqual(strayed.abilities[key], value,
      `b:marionette:strayedPackage delivers ${key} = ${value} to the published record`);
  }
  // An owned Marionette takes the other branch, so it receives none of the strayed eight it does
  // not otherwise have. `charmed` is the one key both a control and this branch can set, so it is
  // what proves the branch rather than the seed is the source here.
  // This is a claim about the calculator's two branches, not about the engine: the ascension
  // block's retort tail (`UnitCalcPre.CAS!NOTMARIONETTEASCENSION!-55..-3 "IF RETORT(W,Alchemist) THEN {" "SETOLENCHANTMENTFLAG(U,EncSpellLock,1,1);"`) writes `HASage`,
  // `HAMechanicalMaster`, `HARitualMaster`, `HACharmed` and `EncSpellLock` again behind five
  // wizard retorts the calculator has no control for, and the owned branch models none of it.
  // That tail is F244.3g's, with the rest of the owned/ascension branch.
  const owned = wanderer({ channeler: true, marionetteBaseSkill: 0, marionettePrimary: 'nature' });
  for (const key of ['transmuteEquipment', 'sage', 'charmed', 'spellLock']) {
    assert(!owned.abilities[key],
      `while an owned Channeler Marionette receives no ${key}: the branches are exclusive`);
  }

  // 2. The ranks. `UnitCalcPre.CAS` writes the package at lines 370-390, Spell Lock at 394, and
  // only 275 lines later Transmute Equipment's hero augmentation and Rebuild's. The order is what
  // makes the block gate below meaningful, and it is the only instrument that reaches a record
  // read whose value is identical to the constant it replaced.
  const order = strayed.statExecutionTrace.map(event => `${event.phase}:${event.id}`);
  const rank = key => order.indexOf(key);
  const ordered = ['b:marionette:strayedPackage', 'b:marionette:spellLock',
    'b:transmuteEquipment:heroAugment', 'b:rebuild'];
  for (const key of ordered) assert(rank(key) >= 0, `${key} is executed for a strayed Wanderer`);
  for (let i = 1; i < ordered.length; i++) {
    assert(rank(ordered[i - 1]) < rank(ordered[i]),
      `${ordered[i - 1]} precedes ${ordered[i]}, as its line order does`);
  }
  // Both augmentation blocks land: +2/+2/+1 from Transmute Equipment and +2/+2 from Rebuild's
  // hero arm, on a 5/5/10 card.
  assertEqual(strayed.atk, 9, 'and both augmentation blocks read their flag and fire');
  assertEqual(strayed.def, 9, 'on Defense as on melee');
  assertEqual(strayed.res, 11, 'with Transmute Equipment alone on Resistance');

  // 2b. The skip, reached from an input rather than from the step order (round-2 review,
  // finding 2). Widening the Spell Lock control to the three CoM-era engines made this
  // combination reachable on the page: a Warlord card that states Spell Lock has it on the
  // record by `buffs:spellLock:cast`, ahead of region `b`, so the package is refused and the two
  // augmentations that read its flags go with it. Stats rather than flags are the assertion,
  // because that is what a user sees move.
  const lockedWanderer = wanderer({ spellLock: true });
  assertEqual(statusOf(lockedWanderer, 'marionette:strayedPackage'), 'skipped',
    'a card-stated Spell Lock refuses the strayed package at its own rank');
  assertEqual(statusOf(lockedWanderer, 'transmuteEquipment:heroAugment'), 'skipped',
    'so Transmute Equipment, which reads the flag the package would have written, is skipped');
  assertEqual(statusOf(lockedWanderer, 'rebuild'), 'skipped', 'and Rebuild with it');
  assertEqual(statusOf(lockedWanderer, 'marionette:spellLock'), 'applied',
    'while the write outside the skip still applies, as the script has it');
  assertEqual(lockedWanderer.atk, 5, 'the card 5/5/10 keeps its melee, losing both +2 blocks');
  assertEqual(lockedWanderer.def, 5, 'and its armor');
  assertEqual(lockedWanderer.res, 10, 'and its resistance, less Transmute Equipment\'s +1');
  for (const key of ['transmuteEquipment', 'rebuild', 'sage', 'arcaneWard']) {
    assert(!lockedWanderer.abilities[key],
      `and the package delivers no ${key} at all`);
  }

  // 3. The block's own skip. `IF (GETOLENCHANTMENTFLAG(U,EncSpellLock,1)>0) THEN { GOTO
  // "NOLONGERSTRAYEDMARIONETTE" }` refuses the seven writes, and Spell Lock's own write stands
  // outside it. Warlord offers no Spell Lock control, so the gate is open by construction and the
  // falsifiable claim is the *rank*: `b:marionette:spellLock` after the package, not before it.
  assertEqual(statusOf(strayed, 'marionette:strayedPackage'), 'applied',
    'the package is applied for a Wanderer that carries no Spell Lock at its rank');
  assertEqual(statusOf(strayed, 'marionette:spellLock'), 'applied',
    'and the Spell Lock write outside the skip is applied with it');

  // 4. The two later blocks read the record. `b:transmuteEquipment:heroAugment`'s gate is
  // `GetEnchantmentFlag(U,EncTransmuteEquipment,1)` and `b:rebuild`'s is `EncRebuild` — both the
  // permanent flag the package wrote — so an owned Marionette, which writes neither, is skipped
  // at both rather than gated out by a branch constant.
  assertEqual(statusOf(owned, 'transmuteEquipment:heroAugment'), 'skipped',
    'b:transmuteEquipment:heroAugment reads Transmute Equipment off the record, so it skips an '
    + 'owned Marionette');
  assertEqual(statusOf(owned, 'rebuild'), 'skipped', 'and b:rebuild skips it the same way');

  // 5. The three predicates, tested directly rather than through a derivation (F244.3f review,
  // finding 5). Each of these steps reads a record field no control in this version can set, so
  // no input reaches the false arm and a derivation can only ever exercise one side. That is a
  // limit of the reachable *inputs*, not of the claim, and the earlier revision of this section
  // wrongly recorded it as "unfalsifiable" — the predicates themselves are ordinary functions and
  // can simply be called. Three wrong implementations pass every derivation-level assertion above
  // and fail here: dropping `!u.spellLock` from the package gate, adding it to the Spell Lock
  // write that stands outside the skip, and reverting the Transmute Equipment gate to the branch
  // constant.
  //
  // `statStep` is a global of the derivation's own scope, so wrapping it captures the steps a run
  // composes together with their live closures. The wrapper is removed in a `finally`.
  const captureSteps = build => captureComposedSteps(ctx, build);
  const predicateOf = composedPredicate;
  const strayedSteps = captureSteps(() => wanderer());
  const ownedSteps = captureSteps(() => wanderer(
    { channeler: true, marionetteBaseSkill: 0, marionettePrimary: 'nature' }));

  // The package's gate has two terms and both are load-bearing: the branch, and the Spell Lock
  // flag standing on the record at this step's own rank.
  const packageGate = predicateOf(strayedSteps, 'marionette:strayedPackage', 'b');
  assertEqual(!!packageGate({}), true, 'the package applies to a strayed Wanderer with no lock');
  assertEqual(!!packageGate({ spellLock: true }), false,
    'and the block\'s own skip refuses it to one that already carries Spell Lock');
  assertEqual(!!predicateOf(ownedSteps, 'marionette:strayedPackage', 'b')({}), false,
    'while the branch term refuses it to an owned Channeler Marionette');

  // The Spell Lock write stands after `!NOLONGERSTRAYEDMARIONETTE!`, so the same flag must not
  // gate it. This is the assertion that separates the two steps.
  const lockGate = predicateOf(strayedSteps, 'marionette:spellLock', 'b');
  assertEqual(!!lockGate({}), true, 'the Spell Lock write applies to a strayed Wanderer');
  assertEqual(!!lockGate({ spellLock: true }), true,
    'and re-applies to one already locked: it is outside the skip, not behind it');

  // The augmentation reads the flag alone, inside the hook's hero-only region. An owned
  // Marionette carrying the flag would take it; the branch constant this gate used to be could
  // not express that, which is what makes the record read a real change rather than a rename.
  const transmuteGate = predicateOf(ownedSteps, 'transmuteEquipment:heroAugment', 'b');
  assertEqual(!!transmuteGate({ transmuteEquipment: true }), true,
    'b:transmuteEquipment:heroAugment reads the flag off the record, not the strayed branch');
  assertEqual(!!transmuteGate({}), false, 'and takes nothing without it');

  // The two hero-region terms, which no input can reach either. The Marionette region opens on
  // `IF ( ISHERO(U) = 0 ) THEN { GOTO "NOTHERO"; }` and closes at `!NOTHERO!`, so both the branch
  // selection and the augmentation block inside it are hero-only. `heroTypeId` comes from the
  // roster record and only the Wanderer carries 48, so a non-hero cannot state the type — which is
  // why the terms are asserted here rather than through a derivation.
  const derivePackage = read('deriveMarionettePackage');
  const packageFor = isHero => derivePackage(
    { herotype: 48, ishero: isHero }, {}, WARLORD).package;
  assertEqual(packageFor(true).state, 'strayed',
    'a Wanderer with the hero flag takes the strayed branch');
  assertEqual(packageFor(false), null,
    'and one without it takes no branch at all: the region is inside the script\'s ISHERO gate');
  const nonHeroSteps = captureSteps(() => derive(baseUnitInput({
    version: WARLORD, atk: 5, def: 5, res: 10, hp: 10,
    identity: { version: WARLORD, isHero: false, baseRace: '', baseFantastic: false },
    abilities: {} })));
  assertEqual(
    !!predicateOf(nonHeroSteps, 'transmuteEquipment:heroAugment', 'b')({ transmuteEquipment: true }),
    false,
    'and the Transmute Equipment augmentation is refused outside the hero region, however the '
    + 'flag got onto the record');

  // The seven per-write skips are "first writer wins", not idempotent guards: an `HEAB` rank is a
  // number, so a unit already holding Sage 1 keeps 1 rather than being raised to the script's 2.
  const packageApply = strayedSteps
    .find(step => step.id === 'marionette:strayedPackage' && step.phase === 'b').apply;
  const held = { sage: 1, arcaneWard: 3 };
  packageApply(held);
  assertEqual(held.sage, 1, 'the Sage skip preserves a rank the record already carries');
  assertEqual(held.arcaneWard, 3, 'and so does the Arcane Ward skip, above the script\'s own 2');
  assertEqual(held.ritualMaster, 2, 'while a key the record does not carry takes the script value');

  // 6. The four with no control anywhere are outputs, never inputs: a raw mark publishes nothing,
  // in every version. This is the half a derived assertion cannot reach.
  for (const version of versions) {
    for (const key of STRAYED_UNCONTROLLED_KEYS) {
      const rawMark = () => derive(baseUnitInput({
        version, atk: 1, def: 1, abilities: { [key]: true } }));
      // Where the table names the key nowhere in this version, the raw mark is refused at the seed
      // (F253.1) rather than reaching a record that publishes nothing; where it names it, the
      // original claim stands and the strayed package is the writer. Read off the table, not off a
      // version test, so a key gaining a row elsewhere moves to the other arm on its own.
      if (seedRefusesKeyIn(ctx, key, version)) {
        assertSeedRefusesKey(rawMark,
          `${version}: a raw '${key}' mark is refused rather than silently dropped`);
        continue;
      }
      assert(!rawMark().abilities[key],
        `${version}: ${key} has no control, so b:marionette:strayedPackage is its only source`);
    }
  }

  // 7. The cast route the move forced, and the version scope it settled. `spellLock` became a
  // record field here, and its control is a cast enchantment with no `template` row, so without
  // `buffs:spellLock:cast` the seed would drop the card's mark and the Exorcise refusal in
  // `combat_special_attacks.js` would stop firing.
  //
  // The scope is the three CoM-era engines. Spell Lock is a castable unit enchantment in base
  // CoM2 and Warlord as well (`spells.ini` [54] in both — Realm 2, cost 100, EnchantmentID 26),
  // and the shared modern executable refuses Exorcise on `EncSpellLock`
  // (`Reference docs/Caster binary/Combat.ApplyAttack.pas`, the `aflags.exorcise` gate). Until
  // F244.3f the control was gated to CoM 1 and the Exorcise reader tested the key only there, so
  // a Spell-Locked Fantastic target took Exorcise in both modern builds exactly as an unlocked
  // one did. Fixed in F244.3f on the user's ruling; this section is what holds the eight sites
  // together, so a partial revert fails here rather than silently in one version.
  for (const version of versions) {
    const stateLock = () => derive(baseUnitInput({ version, atk: 1, def: 1,
      abilities: { spellLock: true } }));
    const offered = version === 'com_6.08' || version.startsWith('com2');
    // In the two MoM builds the table names `spellLock` nowhere, so the card's mark is refused at
    // the seed (F253.1); where the control is offered the cast step carries it onto the record.
    if (offered) {
      assertEqual(!!stateLock().abilities.spellLock, true,
        `${version}: buffs:spellLock:cast is in scope exactly where the Spell Lock control is`);
    } else {
      assertSeedRefusesKey(stateLock,
        `${version}: a Spell Lock mark is refused, the control not being offered here`);
    }
    // And the number it protects: a Spell-Locked Fantastic target takes no Exorcise roll in any
    // engine that has the spell, and the two MoM builds compile no Exorcise rider at all.
    const reaches = read('exorciseReachesRoll')({ spellLock: true }, 'fantastic_nature', version);
    assertEqual(reaches, false,
      `${version}: a Spell-Locked Fantastic target is refused the Exorcise roll`);
    assertEqual(read('exorciseReachesRoll')({}, 'fantastic_nature', version), true,
      `${version}: while an unlocked one still takes it`);
  }
  assertSameKeyList([...(scopes['buffs:spellLock:cast'] || [])].sort(),
    ['com2_1.05.11', 'com2_warlord_1.5.12.9', 'com_6.08'],
    'buffs:spellLock:cast covers the three CoM-era engines, as the Spell Lock control does');
  assertSameKeyList([...(scopes['b:marionette:strayedPackage'] || [])].sort(), [WARLORD],
    'and the package write is Warlord alone');
  assertSameKeyList([...(scopes['b:marionette:spellLock'] || [])].sort(), [WARLORD],
    'as is the Spell Lock write beside it');
  assertSameKeyList((table.spellLock || []).flatMap(row => row.producers).sort(),
    ['step:b:marionette:spellLock', 'step:buffs:spellLock:cast'],
    'and the origin table names exactly the two steps that write spellLock');
}

// --- 13. the owned Marionette package (F244.3g) ------------------------------------------------
// `deriveMarionettePackage`'s owned branch used to merge thirty-one keys into the ability map
// before the sequence; thirty-one `b:marionette:books:<key>` and `b:marionette:ascension:<key>`
// steps write them now, one per engine write. Everything here was written because a mutation battery
// found it missing: three wrong implementations passed every assertion the subtask had before this
// section — swapping the chain ranks of the ascension realm arm and the projectile retype, moving
// Illusion Immunity from three Life books to two, and dropping the book term from a step's gate so
// it fired for a Channeler with no books at all.
//
// The thresholds are the script's own `BOOKS(W,<realm>)>n`, so each is asserted on both sides of
// its boundary. That is what makes an off-by-one visible: a grant at `>1` must be absent at 1 book
// and present at 2.
const OWNED_BOOK_THRESHOLDS = [
  ['nature', 1, ['forester', 'mountaineer']],
  ['nature', 2, ['poisonImmunity']],
  ['nature', 4, ['stoningImmunity']],
  ['sorcery', 1, ['largeShield']],
  ['sorcery', 2, ['missileImmunity']],
  ['sorcery', 4, ['resistMagic']],
  ['chaos', 1, ['firstStrike']],
  ['chaos', 2, ['fireImmunity']],
  ['chaos', 4, ['lightningResist']],
  ['life', 1, ['healer']],
  ['life', 2, ['illusionImmunity']],
  ['life', 4, ['lucky']],
  ['death', 1, ['coldImmunity']],
  ['death', 2, ['deathImmunity']],
  ['death', 4, ['weaponImmunity']],
];

// The ascension arm each primary realm takes, and the value the script writes. One arm fires per
// derivation, so this is also what pins the arms' shared gate to the primary realm rather than
// letting every arm fire.
const OWNED_ASCENSION_REALMS = {
  nature: { poison: 10, stoningTouch: -2 },
  sorcery: { counterImmunity: true, illusion: true },
  chaos: { wallCrusher: true, armorPiercing: true },
  life: { exorcise: -4, bless: true },
  death: { bloodSucker: true, createUndead: true },
};

// The ascension block's own five book tests, all at `>4`.
const OWNED_ASCENSION_BOOKS = {
  nature: ['regeneration', 2],
  sorcery: ['invisibility', true],
  chaos: ['destruction', 0],
  life: ['healingAura', true],
  death: ['lifeSteal', -1],
};

// The seven with no control in any version, so the step is their only source and a raw mark is not
// an input. `stoningImmunity`, `illusion`, `invisibility`, `bloodSucker`, `stoningTouch`,
// `exorcise` and `destruction` are left out because each has a control whose mark rides the
// template seed, and `bless` because its mark rides `buffs:bless:cast`.
// Every owned-branch grant and the step that writes it, so the scope and producer assertions
// below walk all thirty-one rather than a sample.
const OWNED_GRANT_STEPS = {
  forester: 'b:marionette:books:forester',
  mountaineer: 'b:marionette:books:mountaineer',
  poisonImmunity: 'b:marionette:books:poisonImmunity',
  stoningImmunity: 'b:marionette:books:stoningImmunity',
  largeShield: 'b:marionette:books:largeShield',
  missileImmunity: 'b:marionette:books:missileImmunity',
  resistMagic: 'b:marionette:books:resistMagic',
  firstStrike: 'b:marionette:books:firstStrike',
  fireImmunity: 'b:marionette:books:fireImmunity',
  lightningResist: 'b:marionette:books:lightningResist',
  healer: 'b:marionette:books:healer',
  illusionImmunity: 'b:marionette:books:illusionImmunity',
  lucky: 'b:marionette:books:lucky',
  coldImmunity: 'b:marionette:books:coldImmunity',
  deathImmunity: 'b:marionette:books:deathImmunity',
  weaponImmunity: 'b:marionette:books:weaponImmunity',
  poison: 'b:marionette:ascension:poison',
  stoningTouch: 'b:marionette:ascension:stoningTouch',
  counterImmunity: 'b:marionette:ascension:counterImmunity',
  illusion: 'b:marionette:ascension:illusion',
  wallCrusher: 'b:marionette:ascension:wallCrusher',
  armorPiercing: 'b:marionette:ascension:armorPiercing',
  exorcise: 'b:marionette:ascension:exorcise',
  bless: 'b:marionette:ascension:bless',
  bloodSucker: 'b:marionette:ascension:bloodSucker',
  createUndead: 'b:marionette:ascension:createUndead',
  regeneration: 'b:marionette:ascension:regeneration',
  invisibility: 'b:marionette:ascension:invisibility',
  destruction: 'b:marionette:ascension:destruction',
  healingAura: 'b:marionette:ascension:healingAura',
  lifeSteal: 'b:marionette:ascension:lifeSteal',
};

const OWNED_UNCONTROLLED_KEYS = ['forester', 'mountaineer', 'healer', 'counterImmunity',
  'createUndead', 'healingAura', 'regeneration'];

function runOwnedMarionetteChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { versions, table, scopes } = deps;
  const captureSteps = build => captureComposedSteps(ctx, build);
  const predicateOf = composedPredicate;
  const derive = read('deriveUnitStats');
  const wandererIdentity = { version: WARLORD, heroTypeId: 48, isHero: true, unitType: 'hero',
    baseRace: '', baseFantastic: false };
  const owned = (extra = {}) => derive(baseUnitInput({
    version: WARLORD, atk: 5, def: 5, res: 10, hp: 10, unitType: 'hero',
    identity: wandererIdentity,
    abilities: { channeler: true, marionetteBaseSkill: 0, marionettePrimary: 'nature', ...extra } }));
  const bookKey = realm => `marionette${realm[0].toUpperCase()}${realm.slice(1)}Books`;

  // 1. Every book threshold, on both sides. The `over` value is the script's own comparison, so a
  // grant at `>n` is absent at n books and present at n+1.
  for (const [realm, over, keys] of OWNED_BOOK_THRESHOLDS) {
    const below = owned({ [bookKey(realm)]: over });
    const at = owned({ [bookKey(realm)]: over + 1 });
    for (const key of keys) {
      assert(!below.abilities[key],
        `${realm} ${over} books is below the threshold, so no ${key}`);
      assert(!!at.abilities[key],
        `and ${realm} ${over + 1} books grants ${key} through b:marionette:books:${key}`);
    }
  }

  // 2. The ascension arm is the primary's alone, and it is behind the ascension gate. Both halves
  // matter: without the gate an unascended Channeler would take the package, and without the
  // primary term every realm's two keys would land at once.
  for (const [primary, grants] of Object.entries(OWNED_ASCENSION_REALMS)) {
    const ascended = owned({ marionettePrimary: primary, marionetteAscension: true });
    const plain = owned({ marionettePrimary: primary });
    for (const [key, value] of Object.entries(grants)) {
      assertEqual(ascended.abilities[key], value,
        `the ${primary} ascension arm writes ${key} = ${value}`);
      assert(plain.abilities[key] == null || plain.abilities[key] === false,
        `and an unascended ${primary} Marionette takes no ${key}`);
    }
    for (const [other, otherGrants] of Object.entries(OWNED_ASCENSION_REALMS)) {
      if (other === primary) continue;
      for (const key of Object.keys(otherGrants)) {
        if (Object.prototype.hasOwnProperty.call(grants, key)) continue;
        assert(ascended.abilities[key] == null || ascended.abilities[key] === false,
          `and it takes none of the ${other} arm, which is a different IF (PRIMARY=n)`);
      }
    }
  }

  // 3. The ascension block's five book tests, all `>4` and all behind the same gate.
  for (const [realm, [key, value]] of Object.entries(OWNED_ASCENSION_BOOKS)) {
    const five = owned({ marionetteAscension: true, [bookKey(realm)]: 5 });
    const four = owned({ marionetteAscension: true, [bookKey(realm)]: 4 });
    const unascended = owned({ [bookKey(realm)]: 5 });
    assertEqual(five.abilities[key], value,
      `five ${realm} books with Ascension writes ${key} = ${value}`);
    assert(four.abilities[key] == null || four.abilities[key] === false,
      `four ${realm} books does not: the script's test is > 4`);
    assert(unascended.abilities[key] == null || unascended.abilities[key] === false,
      `and neither does five without Ascension: the block is inside the ascension gate`);
  }

  // 4. Chain rank. The script's order is the five book blocks, then the ascension realm arm, then
  // the Chaos arm's `SETSTAT(U,SRangedType,0,30)` on its third line, then the five ascension book
  // blocks. Swapping the realm arm and the retype passed every assertion above, because the two
  // touch disjoint fields — so the order is asserted directly.
  const chaosAscended = owned({ marionettePrimary: 'chaos', marionetteAscension: true,
    marionetteNatureBooks: 13, marionetteSorceryBooks: 13, marionetteChaosBooks: 13,
    marionetteLifeBooks: 13, marionetteDeathBooks: 13 });
  const executed = chaosAscended.statExecutionTrace.map(event => `${event.phase}:${event.id}`);
  const rank = key => executed.indexOf(key);
  const scriptOrder = ['b:marionette:stats', 'b:marionette:rangedType',
    'b:marionette:books:forester', 'b:marionette:books:mountaineer', 'b:marionette:books:poisonImmunity',
    'b:marionette:books:stoningImmunity', 'b:marionette:books:largeShield', 'b:marionette:books:missileImmunity',
    'b:marionette:books:resistMagic', 'b:marionette:books:firstStrike', 'b:marionette:books:fireImmunity',
    'b:marionette:books:lightningResist', 'b:marionette:books:healer', 'b:marionette:books:illusionImmunity',
    'b:marionette:books:lucky', 'b:marionette:books:coldImmunity', 'b:marionette:books:deathImmunity',
    'b:marionette:books:weaponImmunity', 'b:marionette:ascension:poison', 'b:marionette:ascension:stoningTouch',
    'b:marionette:ascension:counterImmunity', 'b:marionette:ascension:illusion', 'b:marionette:ascension:wallCrusher',
    'b:marionette:ascension:armorPiercing', 'b:marionette:ascensionRangedType', 'b:marionette:ascension:exorcise',
    'b:marionette:ascension:bless', 'b:marionette:ascension:bloodSucker', 'b:marionette:ascension:createUndead',
    'b:marionette:ascension:regeneration', 'b:marionette:ascension:invisibility', 'b:marionette:ascension:destruction',
    'b:marionette:ascension:healingAura', 'b:marionette:ascension:lifeSteal'];
  for (const key of scriptOrder) {
    assert(rank(key) >= 0, `${key} is executed for a saturated ascended Chaos Marionette`);
  }
  for (let i = 1; i < scriptOrder.length; i++) {
    assert(rank(scriptOrder[i - 1]) < rank(scriptOrder[i]),
      `${scriptOrder[i - 1]} runs before ${scriptOrder[i]}, as UnitCalcPre.CAS has them`);
  }

  // 5. The gates, called directly. Each book step's `when` carries its realm's loosest threshold
  // and the branch; dropping either term passes every derivation above, because a Channeler with
  // no books has nothing for the apply to write and looks identical either way.
  const ownedSteps = captureSteps(() => owned({ marionetteAscension: true }));
  for (const [realm, key] of [['nature', 'forester'], ['sorcery', 'largeShield'],
    ['chaos', 'firstStrike'], ['life', 'healer'], ['death', 'coldImmunity']]) {
    const gate = predicateOf(ownedSteps, `marionette:books:${key}`, 'b');
    assertEqual(!!gate({}), false,
      `b:marionette:books:${key} is skipped for a Channeler with no ${realm} books`);
  }
  const bookedSteps = captureSteps(() => owned({ marionetteNatureBooks: 2 }));
  assertEqual(!!predicateOf(bookedSteps, 'marionette:books:forester', 'b')({}), true,
    'and applied for one with two, which is the script\'s > 1');
  const unascendedSteps = captureSteps(() => owned({}));
  for (const id of ['marionette:ascension:poison', 'marionette:ascension:regeneration']) {
    assertEqual(!!predicateOf(unascendedSteps, id, 'b')({}), false,
      `b:${id} is skipped without Ascension`);
  }
  const ascendedNature = captureSteps(() => owned({ marionettePrimary: 'nature',
    marionetteAscension: true, marionetteNatureBooks: 13 }));
  for (const id of ['marionette:ascension:poison', 'marionette:ascension:regeneration']) {
    assertEqual(!!predicateOf(ascendedNature, id, 'b')({}), true, `and applied with it`);
  }
  assertEqual(!!predicateOf(ascendedNature, 'marionette:ascension:bless', 'b')({}), false,
    'while the Life arm is refused to a Nature primary: the arms are five IF (PRIMARY=n) tests');

  // 6. Regeneration is the branch's one **increment**,
  // `SETSTAT(U,SRegeneration,0,GETSTAT(U,SRegeneration,0)+2)`. No control writes the key and no
  // other step does, so no derivation can distinguish `+2` from `=2` — the apply is called on a
  // record that already carries a value instead.
  const applyOf = (steps, id) => {
    const found = steps.filter(step => step.id === id && step.phase === 'b');
    assertEqual(found.length, 1, `exactly one b:${id} step is composed`);
    return found[0].apply;
  };
  const regenApply = applyOf(ascendedNature, 'marionette:ascension:regeneration');
  const carried = { regeneration: 3 };
  regenApply(carried);
  assertEqual(carried.regeneration, 5,
    'the Regeneration write adds 2 to what the record carries rather than assigning 2');
  const empty = {};
  regenApply(empty);
  assertEqual(empty.regeneration, 2, 'and reads an absent value as 0');
  const ascendedChaosSteps = captureSteps(() => owned({ marionettePrimary: 'chaos',
    marionetteAscension: true, marionetteChaosBooks: 13 }));
  const destructionRecord = { destruction: 4 };
  applyOf(ascendedChaosSteps, 'marionette:ascension:destruction')(destructionRecord);
  assertEqual(destructionRecord.destruction, 0,
    'while Destruction is an assignment, and 0 is the value it assigns over a card\'s own');
  // The apply is taken off the **composed step** rather than off the table helper on purpose: a
  // step that calls the right helper and then overwrites the field passes a helper-level assertion
  // and fails this one (F244.3g review, finding 6, which proved it with an injected mutation).

  // 7. The seven with no control anywhere are outputs, never inputs: a raw mark publishes nothing,
  // in every version. This is the half a derived assertion cannot reach.
  for (const version of versions) {
    for (const key of OWNED_UNCONTROLLED_KEYS) {
      const rawMark = () => derive(baseUnitInput({
        version, atk: 1, def: 1, abilities: { [key]: true } }));
      // Where the table names the key in this version at all, the mark reaches a record that
      // publishes nothing; where it names it nowhere the mark is refused at the seed instead
      // (F253.1). Which of the two applies is read off the table, not listed here.
      if (seedRefusesKeyIn(ctx, key, version)) {
        assertSeedRefusesKey(rawMark,
          `${version}: a raw '${key}' mark is refused rather than silently dropped`);
        continue;
      }
      assert(!rawMark().abilities[key],
        `${version}: ${key} has no control, so the owned Marionette step is its only source`);
    }
  }

  // 8. The cast route the move forced. `bless` became a record field when the Life ascension arm's
  // `SETENCHANTMENTFLAG(U,EncBless,1,1)` became a step, and its only control is a cast enchantment
  // with no `template` row, so without `buffs:bless:cast` the seed would drop every card's mark and
  // both Bless riders would stop firing in all five versions.
  for (const version of versions) {
    const blessed = derive(baseUnitInput({ version, atk: 1, def: 1, abilities: { bless: true } }));
    assertEqual(!!blessed.abilities.bless, true,
      `${version}: buffs:bless:cast carries the card's own Bless mark to the record`);
  }
  assertSameKeyList([...(scopes['buffs:bless:cast'] || [])].sort(), [...versions].sort(),
    'buffs:bless:cast covers every engine, as the Bless control does');
  for (const [key, step] of Object.entries(OWNED_GRANT_STEPS)) {
    assertSameKeyList([...(scopes[step] || [])].sort(), [WARLORD],
      `${step} is Warlord alone`);
    const producers = (table[key] || []).flatMap(row => row.producers);
    assert(producers.includes(`step:${step}`),
      `and the origin table names ${step} as a producer of ${key}`);
  }
  assertSameKeyList((table.bless || []).flatMap(row => row.producers).sort(),
    ['step:b:marionette:ascension:bless', 'step:buffs:bless:cast'],
    'and for bless it names exactly the two steps that write it');
}

// --- 9. the Lava Smelter grants (F244.3c) ------------------------------------------------------
// The five mineral-pair grants, executed rather than described. `applyLavaSmelterGrant` used to
// merge them into the ability map before the sequence, so `runTransformWriteChecks` measured them
// by running the transform; there is no transform left to run, and a table row saying
// `step:training:lavaSmelter:*` proves nothing about whether the step fires or what it writes.
//
// Four claims, each of which a wrong wiring would break silently: the control writes its own key
// and no other, the legacy selector reaches the same write, the permanent Fantastic test refuses
// the whole block, and — for the three keys with no control of their own — the granted key is not
// an input, so marking it raw publishes nothing. The Fiery Blade case additionally asserts the
// **stat** the record read produces, because a `fieryBlade` that reached the published map without
// reaching `hasWarlordBladeAt`'s read would pass every flag assertion above it.
const LAVA_SMELTER_CASES = [
  ['weaponImmunity', 'lavaSmelterWeaponImmunity', 'weaponImmunity'],
  ['missileImmunity', 'lavaSmelterMissileImmunity', 'missileImmunity'],
  ['resistElements', 'lavaSmelterResistElements', 'resistElem'],
  ['elementalArmor', 'lavaSmelterElementalArmor', 'elementalArmor'],
  ['fieryBlade', 'lavaSmelterFieryBlade', 'flameBlade'],
];

function runLavaSmelterGrantChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { versions, abilityOriginIsTemplate } = deps;
  const derive = read('deriveUnitStats');
  const scopes = read('STEP_VERSION_SCOPES');
  const granted = LAVA_SMELTER_CASES.map(([key]) => key);
  const warlordUnit = abilities => derive(baseUnitInput({
    version: WARLORD, atk: 1, hitChance: 70, hp: 10, abilities }));

  for (const [key, control, legacy] of LAVA_SMELTER_CASES) {
    const stepKey = (read('ABILITY_KEY_ORIGINS')[key] || [])
      .flatMap(row => row.producers)
      .filter(producer => producer.startsWith('step:training:lavaSmelter:'))
      .map(producer => producer.slice('step:'.length));
    assertEqual(stepKey.length, 1, `${key} names exactly one Lava Smelter step`);
    assertSameKeyList([...(scopes[stepKey[0]] || [])].sort(),
      versions.filter(version => version === WARLORD).sort(),
      `${stepKey[0]} is Warlord's alone`);

    const byControl = warlordUnit({ [control]: true });
    assertEqual(!!byControl.abilities[key], true,
      `${control} writes ${key} onto the record, which the published set takes it from`);
    for (const other of granted) {
      if (other === key) continue;
      assert(!byControl.abilities[other],
        `${control} writes ${key} and no other Lava Smelter grant (${other})`);
    }

    const byLegacy = warlordUnit({ lavaSmelter: legacy });
    assertEqual(!!byLegacy.abilities[key], true,
      `the legacy selector value '${legacy}' still reaches ${key}`);

    const fantastic = derive(baseUnitInput({ version: WARLORD, atk: 1, hitChance: 70, hp: 10,
      unitType: 'fantastic_chaos', abilities: { [control]: true } }));
    assertEqual(!!fantastic.abilities[key], false,
      `the block's BASEFANTASTIC gate refuses ${key} to a permanently Fantastic unit`);

    // A key with a template row somewhere is a card fact as well as a grant, so a raw mark is a
    // legitimate input there and this claim does not apply to it. For the other three —
    // `fieryBlade`, `resistElements`, `elementalArmor` — the step is the only source and a raw
    // mark used to write *nothing*: this check asserted that erasure, which is exactly what
    // F253.2 turned into a halt. The claim is the same one layer earlier and stronger: the mineral
    // pair's control admits the write and the key does not, so stating the key stops the run.
    if (!versions.some(version => abilityOriginIsTemplate(key, version))) {
      assertSeedRefusesKey(() => warlordUnit({ [key]: true }),
        `${key} has no control of its own, so the step is its only source and stating the key raw`);
    }
  }

  // The blade's own stat, which is what makes `hasWarlordBladeAt` a record read: Warlord's blade
  // melee bonus is 3 and the weapon becomes magic, and both are gone without the grant.
  const bladed = warlordUnit({ lavaSmelterFieryBlade: true });
  assertEqual(bladed.atk, 4, 'the Fiery Blade grant reaches `c:flameBlade` through the record');
  assertEqual(bladed.weapon, 'magic',
    'and reaches the weapon result field through the record the run leaves');
  const unbladed = warlordUnit({});
  assertEqual(unbladed.atk, 1, 'and neither lands without it');
  assertEqual(unbladed.weapon, 'normal', 'on either consumer');
}

// --- 10. the Outlander reform's positioned writes (F244.3d, F244.3e) --------------------------
// The reform derivation used to merge Armorclad, Power Engine, Resist Magic, Discipline and the
// Anti-Gravity Drive's three flags into the ability map before the sequence, and
// `runTransformWriteChecks` measured them by running the transform. There is no transform grant
// left to run at all, and a table row saying
// `step:training:*` proves nothing about whether the step fires, what it writes, or what reads it.
//
// Five claims per key, each of which a wrong wiring would break in silence:
//   1. the origin table names exactly one `training` step for the key, and it is Warlord's alone;
//   2. the grant fires for the case its block admits, and reaches the published set;
//   3. it does not fire without the Outlander wizard - the explicit gate that replaced the map
//      deletion, which is the half of this subtask no stat can show;
//   4. it does not fire when the block's own eligibility term is missing;
//   5. the *consumer* answers from the record, not from a constant. That last one is what a
//      passing digest cannot distinguish from a step that never fires: Armorclad's reader is
//      `training:magitekScience`, Power Engine's is `training:energyCannon`, and Discipline's is
//      `c:discipline`, so each is asserted through the number its reader produces.
const OUTLANDER_WIZARD = { outlanderWizard: true };
const OUTLANDER_REFORM_CASES = [
  { key: 'armorclad',
    step: 'training:armorclad',
    // The block is `IF (SPELLSTATE(W,STArmorClad)=2)` inside the `SCustomAttribute` mechanical gate.
    on: { armorcladReform: true, mechanical: true },
    // Same research state, no permanent Mechanical flag: the Battle Armor branch, which grants no
    // permanent Armorclad.
    off: { armorcladReform: true } },
  { key: 'powerEngine',
    step: 'training:powerEngine',
    on: { heatPowerEngine: true, mechanical: true },
    off: { heatPowerEngine: true } },
  { key: 'resistMagic',
    step: 'training:magitekScience',
    on: { magitekScience: true, armorcladReform: true, mechanical: true },
    // The nested `IF (SPELLSTATE(W,STMagitekMaterialScience)=2)` sits inside the Armorclad block,
    // and the overland route gates on `GETENCHANTMENTFLAG(U,EncArmorClad,1)`. Without Armorclad
    // there is no grant however loudly the research state is set.
    off: { magitekScience: true } },
  { key: 'discipline',
    step: 'training:militaryDrilling',
    on: { militaryDrilling: true },
    off: {},
    value: 'overland' },
  // The Anti-Gravity Drive block's three writes (F244.3e). Haste is the unconditional one; Flying
  // and Illusion Immunity sit behind the block's own `IF (GETSTAT(U,ASailing,1)>0)`, so their
  // `off` case keeps the whole outer gate and drops Sailing alone.
  { key: 'haste',
    step: 'training:temporalDrive',
    on: { temporalEngineering: true, heatPowerEngine: true, mechanical: true },
    off: { temporalEngineering: true } },
  { key: 'flying',
    step: 'training:temporalDrive',
    on: { temporalEngineering: true, heatPowerEngine: true, mechanical: true, sailing: true },
    off: { temporalEngineering: true, heatPowerEngine: true, mechanical: true } },
  { key: 'illusionImmunity',
    step: 'training:temporalDrive',
    on: { temporalEngineering: true, heatPowerEngine: true, mechanical: true, sailing: true },
    off: { temporalEngineering: true, heatPowerEngine: true, mechanical: true } },
];

function runOutlanderReformGrantChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { versions, abilityOriginIsTemplate } = deps;
  const derive = read('deriveUnitStats');
  const scopes = read('STEP_VERSION_SCOPES');
  const table = read('ABILITY_KEY_ORIGINS');
  const warlordUnit = (abilities, over = {}) => derive(baseUnitInput({
    version: WARLORD, atk: 1, def: 1, hitChance: 70, hp: 10, abilities, ...over }));

  for (const testCase of OUTLANDER_REFORM_CASES) {
    const { key, step, on, off } = testCase;
    const expected = testCase.value === undefined ? true : testCase.value;
    const trainingSteps = (table[key] || [])
      .filter(row => row.origin === 'training')
      .flatMap(row => row.producers)
      .filter(producer => producer.startsWith('step:'))
      .map(producer => producer.slice('step:'.length));
    assertSameKeyList(trainingSteps, [step],
      `${key} names exactly the training step that writes it`);
    assertSameKeyList([...(scopes[step] || [])].sort(),
      versions.filter(version => version === WARLORD).sort(),
      `${step} is Warlord's alone`);

    assertEqual(warlordUnit({ ...OUTLANDER_WIZARD, ...on }).abilities[key], expected,
      `${step} writes ${key} onto the record, which the published set takes it from`);
    // The gate the deleted map mutation used to make implicitly. Same marks, no Outlander wizard.
    assert(!warlordUnit({ ...on }).abilities[key],
      `${step} refuses ${key} to a unit whose owner is not an Outlander wizard`);
    assert(!warlordUnit({ ...OUTLANDER_WIZARD, ...off }).abilities[key],
      `${step} refuses ${key} when the block's own eligibility term is absent`);
    // A key with a control of its own is a legitimate raw input somewhere; the two with none are
    // written by their step alone, so marking them by hand must publish nothing.
    if (!versions.some(version => abilityOriginIsTemplate(key, version))
      && !(table[key] || []).some(row => row.origin === 'buffs')) {
      assert(!warlordUnit({ [key]: true }).abilities[key],
        `${key} has no control of its own, so the step is its only source and a raw mark writes `
        + 'nothing');
    }
  }

  // The three record reads, each asserted through the number its own consumer produces: break one
  // and the flag still reaches the published set, so no assertion above this point moves.
  //
  // Most of them are *not* this section's only cover. `warlord_abilities.js` already asserts the
  // Magitek Science pair and the Discipline package against the same inputs, and
  // `derive_unit_stats.js` asserts Discipline's Defense, so breaking the Armorclad read, the
  // Discipline read, or `training:armorclad`'s flag write fails there too (F244.3d review, nit 4).
  // The two reads this section alone covers are `training:energyCannon`'s and
  // `d:energyCannonThreshold`'s, the second only through the step trace below.
  //
  // Armorclad -> `training:magitekScience`: Resist Magic lands only where the record already
  // carries the flag `training:armorclad` wrote one position earlier.
  const armorcladPlusScience = warlordUnit({
    ...OUTLANDER_WIZARD, armorcladReform: true, mechanical: true, magitekScience: true });
  assertEqual(armorcladPlusScience.abilities.resistMagic, true,
    'training:magitekScience reads the Armorclad flag off the record at its own position');
  assertEqual(armorcladPlusScience.def, 7,
    'and training:armorclad still makes the +6 Defense write beside the flag');

  // Power Engine -> `training:energyCannon`: the Beam conversion retypes the permanent Ranged slot
  // and adds 50%, and the region-`d` threshold step then writes the Destruction rider.
  const beam = { rtb: 6, rtbType: 'missile',
    modernAttacks: { ranged: { strength: 6, type: 'missile' } } };
  const cannon = warlordUnit(
    { ...OUTLANDER_WIZARD, heatPowerEngine: true, mechanical: true, energyBeamWeapons: true }, beam);
  assertEqual(cannon.modernAttacks.ranged.strength, 9,
    'training:energyCannon reads the Power Engine flag off the record and makes its +50%');
  assertEqual(cannon.modernAttacks.ranged.type, 'magic', 'and retypes the slot to Beam');
  assertEqual(cannon.abilities.energyCannonDestruction, -6,
    'and the post-chain Destruction write reads the same flag off the finished record');
  const noEngine = warlordUnit(
    { ...OUTLANDER_WIZARD, mechanical: true, energyBeamWeapons: true }, beam);
  assertEqual(noEngine.modernAttacks.ranged.strength, 6, 'and none of it lands without the flag');
  assertEqual(noEngine.modernAttacks.ranged.type, 'missile', 'on either field');
  assert(noEngine.abilities.energyCannonDestruction == null, 'or on the rider');
  // `d:energyCannonThreshold` reads the same flag, and its write is invisible in the finished
  // record because the post-chain Destruction block gates on the flag as well. So the trace is
  // where the read shows: without the flag the step must not run at all, or the gate is dead code
  // that a later change to the post-chain block would silently promote to a wrong answer.
  assert(!noEngine.statTrace.some(entry => entry.id === 'energyCannonThreshold'),
    'd:energyCannonThreshold does not run without the Power Engine flag on the record');
  assert(cannon.statTrace.some(entry => entry.id === 'energyCannonThreshold'),
    'and does run with it');

  // Discipline -> `c:discipline`: +1 Defense at Recruit, and the cast's own value overrides the
  // training grant's `overland` rather than being merged ahead of it.
  const drilled = warlordUnit({ ...OUTLANDER_WIZARD, militaryDrilling: true });
  assertEqual(drilled.def, 2, 'c:discipline reads the Discipline value off the record');
  assertEqual(warlordUnit({ ...OUTLANDER_WIZARD, militaryDrilling: true,
    discipline: 'combat' }).abilities.discipline, 'combat',
  'buffs:discipline:cast overrides the training grant, as the retired merge did');
  assertEqual(warlordUnit({ ...OUTLANDER_WIZARD, militaryDrilling: true },
    { unitType: 'fantastic_chaos' }).abilities.discipline, undefined,
  'and the overland route BASEFANTASTIC gate refuses a permanently Fantastic unit');

  // The card's own Resist Magic and Discipline, which became `buffs` writes when the keys became
  // record fields. Each must survive in exactly the versions its control is offered in.
  for (const version of versions) {
    const marked = derive(baseUnitInput({ version, def: 1, abilities: { resistMagic: true } }));
    assertEqual(marked.abilities.resistMagic, true,
      `${version}: buffs:resistMagic:cast carries the card's mark onto the record`);
    const offered = version.startsWith('com2');
    const stateDiscipline = () => derive(baseUnitInput({ version, def: 1,
      abilities: { discipline: 'overland' } }));
    if (!offered) {
      // Outside the two modern builds the origin table names `discipline` nowhere, so the card's
      // value is refused at the seed rather than reaching a record that drops it (F253.1). That is
      // the "in scope exactly where the control is offered" claim, made at the input boundary.
      assertSeedRefusesKey(stateDiscipline,
        `${version}: the Discipline value is refused by the seed, the control not being offered `
        + 'here');
      assertEqual(derive(baseUnitInput({ version, def: 1 })).def, 1,
        `${version}: and Defense is what it was without it`);
      continue;
    }
    const disciplined = stateDiscipline();
    assertEqual(disciplined.abilities.discipline, 'overland',
      `${version}: buffs:discipline:cast is in scope exactly where the control is offered`);
    assertEqual(disciplined.def, 2,
      `${version}: and c:discipline moves Defense only there`);
  }

  // The mixed-origin claim behind the cast steps' half (F244.3d review, finding 1; F252.5). A
  // `buffs:*:cast` step says the *cast* wrote the flag, so it must read the card's **marked**
  // half — not the effective map, which used to carry `deriveMarionettePackage`'s grants of these
  // same two keys, and not the merged card map, which for a dual-source key also carries what the
  // unit was built with. The record ends up carrying the
  // flag either way, so the published set cannot tell the two apart and the **execution ledger**
  // is the assertion. It has to be the ledger and not `statTrace`: the two keys reach the record
  // from a step of their own now — `b:marionette:books:resistMagic` and `b:marionette:strayedPackage`
  // — so a wrongly admitted cast writes over a record the seed left false and would reach
  // `statTrace`, but only in whichever direction the two steps' ranks happen to fall.
  // `statExecutionTrace` records every visited step as `applied` or `skipped`, so it separates
  // "the gate was false" from "the gate was true and the write changed nothing" — which is
  // exactly the distinction this claim is about, and it holds whatever the ranks are. It was
  // committed rather than probed once while the two keys were still seed carries (F244.3b), which
  // is why deleting the last carry in F244.3g needed no change to the assertions below.
  const marionetteIdentity = { heroTypeId: 48, isHero: true, baseRace: '', baseFantastic: false,
    version: WARLORD };
  const marionetteUnit = abilities => derive(baseUnitInput({
    version: WARLORD, def: 1, res: 5, abilities, identity: marionetteIdentity }));
  // The two keys sit on the package's two mutually exclusive branches: `resistMagic` is an owned
  // Channeler's five-sorcery-book grant, `rebuild` is one of the strayed branch's eight.
  const bookPackage = {
    resistMagic: { channeler: true, marionetteBaseSkill: 0, marionettePrimary: 'sorcery',
      marionetteSorceryBooks: 13 },
    rebuild: { marionetteBaseSkill: 0 },
  };
  for (const [key, step] of [['resistMagic', 'resistMagic:cast'], ['rebuild', 'rebuild:cast']]) {
    const statusOf = (result, id) => {
      const entry = result.statExecutionTrace.find(event => event.id === id);
      return entry ? entry.status : 'absent';
    };
    const granted = marionetteUnit(bookPackage[key]);
    assertEqual(!!granted.abilities[key], true,
      `the Marionette book package still delivers ${key} to the record`);
    assertEqual(statusOf(granted, step), 'skipped',
      `but ${step} is skipped for it — a book grant is not a cast`);
    const marked = marionetteUnit({ [key]: true });
    assertEqual(!!marked.abilities[key], true, `the card's own ${key} reaches the record`);
    assertEqual(statusOf(marked, step), 'applied',
      `and it gets there through ${step}`);
  }

  // The research states themselves are no longer deleted from the published map for a
  // non-Outlander owner: the ownership test is a term at each read (F244.3d). Both halves are
  // asserted, because dropping the term would be invisible in the published set alone.
  const nonOutlander = warlordUnit({ rocketry: true }, beam);
  assertEqual(nonOutlander.abilities.rocketry, true,
    'a non-Outlander unit keeps the raw research state in the published map');
  assert(!nonOutlander.abilities.blackpowder,
    'and the Blackpowder source refuses it, because the gate moved to the read');
  assertEqual(warlordUnit({ ...OUTLANDER_WIZARD, rocketry: true }, beam).abilities.blackpowder,
    true,
    'while an Outlander wizard still reaches the Rocketry upgrade');

  runTemporalDriveChecks(ctx, { derive, warlordUnit, versions, table, scopes });
  runCombatOverrideChecks({ warlordUnit });
}

// --- 11. the Anti-Gravity Drive and the `!COMBATOVERRIDE!` block (F244.3e) ----------------------
// The reform's last seven pre-sequence grants. Three of them - Haste, Flying and Illusion Immunity
// - are permanent writes and take the `training` rank the loop above covers; what is left here is
// the two record reads the move created, the cast route the move forced, and the three names that
// stopped being ability keys at all.
function runTemporalDriveChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { derive, warlordUnit, versions, table, scopes } = deps;
  const drive = { temporalEngineering: true, heatPowerEngine: true, mechanical: true };

  // Read 1 - `training:temporalDrive` reads the Power Engine flag off the record, the way the
  // overland route spells it (`IF (GETENCHANTMENTFLAG(U,EncPowerEngine,1)>0)`). Without the
  // enclosing mechanical gate there is no flag and no Haste, however loudly the research is set.
  assertEqual(warlordUnit({ ...OUTLANDER_WIZARD, ...drive }).abilities.haste, true,
    'training:temporalDrive reads the Power Engine flag off the record at its own position');
  assert(!warlordUnit({ ...OUTLANDER_WIZARD,
    temporalEngineering: true, heatPowerEngine: true }).abilities.haste,
  'and refuses the grant to a non-mechanical unit, which never gets the flag');

  // Read 2 - `b:bombsGrenades` reads Flying off the record rather than off a pre-sequence
  // constant. This is the interaction that made `flying` a record field: the Anti-Gravity grant
  // qualifies a zero-melee unit for Bombs & Grenades that the card never marked Flying, and the
  // write has to stand on the record by region `b` for the gate to see it. Thrown is the number.
  const bombs = { explosive: true, sapiens: true };
  const bombsOver = { atk: 0, figs: 6, modernAttacks: {} };
  const flyingByGrant = warlordUnit(
    { ...OUTLANDER_WIZARD, ...drive, sailing: true, ...bombs }, bombsOver);
  assertEqual(flyingByGrant.modernAttacks.thrown.strength, 5,
    'b:bombsGrenades reads the Flying flag training:temporalDrive wrote onto the record');
  const noFlying = warlordUnit({ ...OUTLANDER_WIZARD, ...drive, ...bombs }, bombsOver);
  assert(!noFlying.modernAttacks.thrown || !noFlying.modernAttacks.thrown.strength,
    'and a zero-melee unit without it qualifies for nothing');
  const flyingByCard = warlordUnit({ ...OUTLANDER_WIZARD, flying: true, ...bombs }, bombsOver);
  assertEqual(flyingByCard.modernAttacks.thrown.strength, 5,
    'while the card own Flying mark reaches the same gate through the template seed');

  // The card's own Haste, which became a `buffs` write when the key became a record field. Its
  // control is offered in every version, so the step is too.
  for (const version of versions) {
    const hasted = derive(baseUnitInput({ version, atk: 1, def: 1, abilities: { haste: true } }));
    assertEqual(hasted.abilities.haste, true,
      `${version}: buffs:haste:cast carries the card's mark onto the record`);
  }
  assertSameKeyList([...(scopes['buffs:haste:cast'] || [])].sort(), [...versions].sort(),
    'buffs:haste:cast is in scope in every engine, as the Haste control is');
  assertSameKeyList(
    (table.haste || []).flatMap(row => row.producers).sort(),
    ['step:buffs:haste:cast', 'step:training:temporalDrive'],
    'and the origin table names exactly the two steps that write haste');

  // The three names that stopped being ability keys. Each was a label for a block gate no engine
  // flag stands behind, so it is a `reform` field now and the published map must not carry it -
  // which is also what stops a caller bypassing the reform prerequisites with a raw mark.
  // Armorclad is in the set because `drive` carries Mechanical, and a mechanical unit without the
  // flag is refused by the `!COMBATOVERRIDE!` soldier gate the two region-`d` effects share.
  const fullReform = warlordUnit({ ...OUTLANDER_WIZARD, ...drive, sailing: true,
    armorcladReform: true, psychoConverter: true, pneumaReactor: true },
  { res: 5, level: 'veteran' });
  const originTable = read('ABILITY_KEY_ORIGINS');
  const retired = read('RETIRED_OUTLANDER_STATE_KEYS');
  assertSameKeyList([...retired].sort(),
    ['pneumaField', 'psychoForce', 'temporalGravityDrive'],
    'RETIRED_OUTLANDER_STATE_KEYS is exactly the three names F244.3e retired');
  for (const key of retired) {
    assert(fullReform.abilities[key] === undefined,
      `${key} is a reform-record field, not an ability key the derivation publishes`);
    assert(!(key in originTable),
      `and the origin table no longer classifies ${key}`);
  }
  // The **raw** half, which the derived assertion above cannot reach: a stale saved state or share
  // link from a build that still had these names supplies the key directly, and nothing writes it
  // any more, so it would otherwise ride the input straight into the published map. Every name on
  // both strip lists is asserted, not only the retired three — the reform's own outputs have
  // always had to be unforgeable and the two lists differ only in whether this build still
  // produces the name (F244.3e review, finding 1).
  for (const key of [...read('DERIVED_OUTLANDER_STATE_KEYS'), ...retired]) {
    assert(!warlordUnit({ ...OUTLANDER_WIZARD, [key]: true }, { res: 5 }).abilities[key],
      `a raw ${key} mark is stripped: the reform's names are outputs, never accepted inputs`);
  }
  // ...while the effect that gate admits still lands, off the reform record.
  assertEqual(fullReform.abilities.lifeSteal, -3,
    'd:pneumaField still drains trunc(resistance / 2) from its reform-record gate');
}

// The `!COMBATOVERRIDE!` Outlander-soldier gate, which F244.3e made a record read. All three
// effects behind it - Energy Weaponry, Psycho Force, Pneuma Field - take the same predicate, so
// one of them proves the wiring and the others prove they share it.
function runCombatOverrideChecks(deps) {
  const { warlordUnit } = deps;
  const soldier = { psychoConverter: true, pneumaReactor: true, energyBeamWeapons: true };
  const over = { res: 5, level: 'veteran' };
  // A mechanical unit fails the gate - `GETENCHANTMENTFLAG(U,EncArmorClad,0)=0 %AND
  // GetStat(U,SCustomAttribute,1)=1` - and the record is where both terms come from.
  const mechNoClad = warlordUnit({ ...OUTLANDER_WIZARD, ...soldier, mechanical: true }, over);
  assert(!mechNoClad.abilities.energyWeaponry,
    'the combat-soldier gate reads Mechanical off the record and refuses a mechanical unit');
  assert(mechNoClad.abilities.lifeSteal == null, 'and refuses Pneuma Field with it');
  // Psycho Force shares the same predicate, and it is the only one of the three whose refusal is
  // invisible in the ability map — its write is a To-Defend delta. Without this arm, deleting
  // `outlanderCombatSoldierAt` from `d:psychoForce` alone leaves every other check green
  // (F244.3e review, finding 2). Resistance is 5 + the veteran +1 = 6 at region `d`, veteran rank
  // 2, so the grant is trunc(6 * 2 / 2) = 6 points of To-Defend on the 30% base.
  assertClose(mechNoClad.toBlock, 0.30, 'and refuses Psycho Force with them');
  // Armorclad on the record clears the same gate, which is what makes it a record read: the flag
  // comes from `training:armorclad`, several ranks earlier.
  const mechClad = warlordUnit(
    { ...OUTLANDER_WIZARD, ...soldier, mechanical: true, armorcladReform: true }, over);
  assertEqual(mechClad.abilities.energyWeaponry, true,
    'while the flag training:armorclad wrote onto the record clears it');
  assertEqual(mechClad.abilities.lifeSteal, -3, 'and Pneuma Field lands with it');
  assertClose(mechClad.toBlock, 0.36, 'and Psycho Force with them');
  // A non-mechanical regular unit passes with neither flag.
  const regular = warlordUnit({ ...OUTLANDER_WIZARD, ...soldier }, over);
  assertEqual(regular.abilities.energyWeaponry, true,
    'and a non-mechanical regular unit clears it with neither flag');
  assertClose(regular.toBlock, 0.36, 'on all three effects');
  // Rebuild writes the permanent Mechanical flag at `buffs:rebuild`, before region `d`, so a
  // Rebuilt non-hero is refused exactly as a roster-Mechanical one is. That is the read this
  // section alone covers: the retired constant carried the same term, so no number moves, and
  // only the record path makes it answerable at the block's own rank.
  const rebuilt = warlordUnit({ ...OUTLANDER_WIZARD, ...soldier, rebuild: true }, over);
  assert(!rebuilt.abilities.energyWeaponry,
    'the permanent Mechanical write buffs:rebuild makes reaches the region-d soldier gate');
  assertClose(rebuilt.toBlock, 0.30, 'for Psycho Force as much as for the other two');
  // `d:energyWeaponry` is the key's one source: it has no control, so a raw mark publishes
  // nothing.
  assert(!warlordUnit({ ...OUTLANDER_WIZARD, energyWeaponry: true }, over).abilities.energyWeaponry,
    'energyWeaponry has no control, so d:energyWeaponry is its only source');
}

// --- 8. the record seed (F244.3b) -------------------------------------------------------------
// F244's rule is that the record starts as the roster template and nothing else. `stats.js` seeds
// through `seedNonStatRecordFields`, which asks this table, so what has to be checked is the
// partition it rests on: every seeded non-stat key is either template-intrinsic somewhere or has a
// positioned step that writes it. Without this, deleting a step or a template row would leave a key
// that no rank ever writes and the seed no longer carries, and the only symptom would be a silently
// false flag.
function runRecordSeedChecks(ctx, table, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { magicCurses, grantFields, grantWrites, grantValueWrites, versions,
    abilityOriginIsTemplate, positioned } = deps;
  const seeded = read('SEEDED_NON_STAT_KEYS');
  const scopes = read('STEP_VERSION_SCOPES');
  const transformWritten = new Set(Object.values(TRANSFORM_WRITES).flat());

  assertSameKeyList([...seeded].sort(),
    [...new Set([...grantValueWrites, ...magicCurses, ...grantFields, ...grantWrites])].sort(),
    'SEEDED_NON_STAT_KEYS is exactly the union of the four record-field lists');

  // The seed's declared exception is gone (F244.3g). `TRANSFORM_SEED_CARRY` named the seeded keys a
  // pre-sequence transform still granted with no `template` row to carry them, and the loop that
  // stood here checked each entry against the transform that granted it. With the Marionette
  // package's grants positioned there is nothing left to declare, and `seedNonStatRecordFields`
  // throws on that combination instead of consulting a list. This is the same condition, read off
  // the table rather than off the carry: a transform may still write a seeded key that has a
  // `template` row — Sancta Basilica's and Pillar of Faith's `lucky`, and Sancta Basilica's
  // `magicImmunity`, which since F252.4 rides the template seed like any other dual-source key
  // rather than being suppressed by its `immunities` row.
  for (const key of seeded) {
    if (!transformWritten.has(key)) continue;
    const carried = versions.some(version => abilityOriginIsTemplate(key, version));
    assert(carried,
      `a pre-sequence transform writes ${key}, which has no template row in any `
      + 'version, so the seed would drop it — give the grant a positioned write '
      + '(Calculator/stats_identity.js; seedNonStatRecordFields throws on exactly this)');
  }

  // The partition itself. A key with a template row somewhere is seeded there; every other key is
  // written by a step of its own. `blackpowder` and `energyCannon` are the shape that needs no
  // template row: nothing writes them before the sequence at all.
  for (const key of seeded) {
    if (versions.some(version => abilityOriginIsTemplate(key, version))) continue;
    const rows = table[key] || [];
    const writers = rows.flatMap(row => (positioned.has(row.origin) ? row.producers : []))
      .filter(producer => producer.startsWith('step:'));
    assert(writers.length > 0,
      `${key} has no template row and no carry entry, so a positioned step must write it`);
    for (const producer of writers) {
      const stepKey = producer.slice('step:'.length);
      assert(Object.prototype.hasOwnProperty.call(scopes, stepKey),
        `${key}'s writer ${stepKey} has a canonical version-scope entry`);
    }
  }

  // The nine curse flags are the item's own worked case: each is `debuffs`-only, so none may be
  // seeded in any version, and each must have its own write.
  for (const key of magicCurses) {
    assert(!versions.some(version => abilityOriginIsTemplate(key, version)),
      `${key} is a curse, so no version's seed may carry it`);
    assert(Object.prototype.hasOwnProperty.call(scopes, `debuffs:${key}:cast`),
      `${key} takes its own debuffs write rather than a shared strip`);
  }

  runSeedExecutionChecks(ctx, { seeded, versions, abilityOriginIsTemplate,
    magicCurses, grantWrites, grantValueWrites, table, scopes });
  runMarkedImmunityPhaseChecks(ctx, { versions, table, seeded });
  runMarkedBuffPhaseChecks(ctx, { versions, table, seeded, scopes });
  runMarkedDebuffPhaseChecks(ctx, { versions, table, seeded, scopes });
  runSapiensLabelChecks(ctx, { versions, table, seeded, scopes });
  runImmunityRefusalMatrix(ctx, magicCurses);
}

// The seed, executed rather than described (F244.3b review, finding 6). The checks above read the
// tables; these run `seedNonStatRecordFields` itself and then the whole derivation, because a
// partition that is well formed on paper can still seed the wrong value.
// A key whose statement this version's origin table cannot hear — no row at all (F253.1), or rows
// every one of which is admitted by a different input key (F253.2). The seed refuses such an input
// outright rather than erasing it, so the checks below state it as a halt instead of stating it on
// a card and asking what the record did with it. `seedRefusesKeyIn` (`assertions.js`) is the one
// home for the question and reads the seed's own predicate, so this file cannot drift from it.

function runSeedExecutionChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { seeded, versions, abilityOriginIsTemplate,
    magicCurses, grantWrites, grantValueWrites, table, scopes } = deps;
  const seedFn = read('seedNonStatRecordFields');
  const uiDefs = read('abilityUiDefs()');

  const noRowIn = (key, version) => seedRefusesKeyIn(ctx, key, version);

  for (const version of versions) {
    // Every seeded key the version can carry, marked on the card. A key with a template row in
    // this version takes the mark; a key without one starts unwritten however loudly the card
    // states it, because its arrival is a positioned write. A key with no row of any kind is not
    // on this card — stating it halts (F253.1), which the `noRow` block below asserts directly.
    const carriable = seeded.filter(key => !noRowIn(key, version));
    const marked = Object.fromEntries(carriable.map(key => [key, true]));
    const seed = seedFn(version, marked, marked, marked);
    assertSameKeyList(Object.keys(seed).sort(), [...seeded].sort(),
      `${version}: the seed names exactly the record's non-stat fields`);
    for (const key of seeded) {
      // Since F252.4 there is no exception: the template row is the whole rule. The two marked
      // immunities used to be forced false here however template-capable they were, which was the
      // seed suppression the `immunities` token stood for.
      assertEqual(!!seed[key], abilityOriginIsTemplate(key, version),
        `${version}: '${key}' is seeded exactly where the origin table gives it a template row`);
    }

    // The mixed-origin case, probed one key at a time because the guard below halts on the first
    // offender. `marked` set with `supplied` empty is exactly a pre-sequence transform's grant:
    // a template-row key absorbs it (the hoist the two Lucky transforms still rest on), and since
    // F244.3g deleted the last `TRANSFORM_SEED_CARRY` entry every other key must halt rather than
    // seed in silence — there is no third branch any more.
    for (const key of seeded) {
      const grantOnly = () => seedFn(version, {}, { [key]: true }, {});
      if (abilityOriginIsTemplate(key, version)) {
        assertEqual(!!grantOnly()[key], true,
          `${version}: '${key}' has a template row, so its seed still absorbs a transform grant`);
        continue;
      }
      let halted = false;
      try {
        grantOnly();
      } catch (error) {
        halted = /yet a pre-sequence transform wrote it/.test(String(error.message));
      }
      assert(halted,
        `${version}: a transform grant of '${key}' halts instead of seeding silently`);
      // And the same for a **zero-valued** write, which is the shape the guard used to miss: it
      // tested truthiness, so a transform setting an unseeded value key to 0 was seeded away
      // instead of halting (F244.3g review, finding 7). `destruction` is the live example — the
      // ascension block writes `SETSTAT(U,AFDestruction,0,0,1)`.
      let zeroHalted = false;
      try {
        seedFn(version, {}, { [key]: 0 }, {});
      } catch (error) {
        zeroHalted = /yet a pre-sequence transform wrote it/.test(String(error.message));
      }
      assert(zeroHalted,
        `${version}: and a zero-valued transform write of '${key}' halts too, rather than reading `
        + 'as absent');
    }
    // A **deletion** is not a write and must not halt: `deriveOutlanderReformRecord` strips its
    // derived output names from the map on purpose, so `marked` is missing a key `supplied` had.
    const deletionSeed = seedFn(version, {}, {}, { armorclad: true, powerEngine: true });
    assertEqual(!!deletionSeed.armorclad, false,
      `${version}: a transform deleting a key seeds it false rather than halting`);

    // --- the seed reads the innate half (F252.3) ----------------------------------------------
    // The marked half is a cast, and a cast is a positioned write. Stated in the merged map alone
    // — innate empty, supplied carrying the key — a template-seeded key must therefore either
    // land in a positioned marked step or halt. Before F252.3 the seed simply took it, which put
    // the cast's bit on the record at `template` rank.
    for (const key of seeded) {
      if (!abilityOriginIsTemplate(key, version)) continue;
      const markedOnly = () => seedFn(version, {}, { [key]: true }, { [key]: true });
      if (read('abilityMarkedWriteIsPositioned')(key, version)) {
        assertEqual(!!markedOnly()[key], false,
          `${version}: '${key}' has a positioned marked write, so the seed leaves the mark to it `
          + 'rather than carrying it at template rank');
        continue;
      }
      let halted = false;
      try {
        markedOnly();
      } catch (error) {
        halted = /no positioned/.test(String(error.message));
      }
      assert(halted,
        `${version}: the marked half stating '${key}' halts — a template seed may not carry a `
        + 'cast (F252.3)');
    }
    // And the innate half is what it *does* carry: the same key stated innate-only seeds true.
    for (const key of seeded) {
      if (!abilityOriginIsTemplate(key, version)) continue;
      assertEqual(!!seedFn(version, { [key]: true }, { [key]: true }, { [key]: true })[key], true,
        `${version}: '${key}' stated in the innate half is what the template seed carries`);
    }

    // --- the caller's own statement of a key this version cannot carry (F253.1) --------------
    // The erasure this replaces was silent and total: no template row to seed the key into and no
    // origin row anywhere, so no positioned step was waiting for it either, and the two arms of
    // the seed simply dropped what the caller said. Three claims, and the second is the one that
    // keeps the rule narrow — "no template row" would fire on every cursed unit.
    // What the key's own controls read as off, and what they read as stated. The off values are
    // the ones a card really hands over for a hidden control (`versionGatedClearedValue`,
    // `card_state.js`), and the stated ones are where the seed must halt. The `numcheck` pair is
    // the distinction a token list gets wrong: `null` is an unticked box and `0` is a ticked one
    // stating a zero modifier, which the combat consumers read as present (review, finding 1).
    const offValues = key => {
      const defs = uiDefs.filter(def => (def.calcKey || def.key) === key);
      if (!defs.length) return [null];
      const values = new Set([null]);
      for (const def of defs) {
        if (def.type === 'bool') values.add(false);
        else if (def.type === 'select') values.add((def.options || [['none']])[0][0]);
        else if (def.type === 'num') values.add(0);
      }
      return [...values];
    };
    const statedValues = key => {
      const defs = uiDefs.filter(def => (def.calcKey || def.key) === key);
      const values = new Set([true]);
      for (const def of defs) {
        if (def.type === 'numcheck') { values.add(0); values.add(-1); }
        else if (def.type === 'num') values.add(3);
        else if (def.type === 'select') {
          for (const option of (def.options || []).slice(1)) values.add(option[0]);
        }
      }
      return [...values];
    };
    for (const key of seeded) {
      const stated = { [key]: true };
      if (noRowIn(key, version)) {
        for (const value of statedValues(key)) {
          const map = { [key]: value };
          assertSeedRefusesKey(() => seedFn(version, map, map, map),
            `${version}: stating '${key}' as ${JSON.stringify(value)} halts rather than being `
            + 'dropped in silence');
        }
        // And the control's *off* position states nothing, so it must not halt.
        for (const off of offValues(key)) {
          seedFn(version, {}, { [key]: off }, { [key]: off });
        }
        continue;
      }
      // A key the table does place in this version is stated freely, whether or not it has a
      // template row: the nine curses have none and land in their own `debuffs:*:cast` steps.
      // Stated in every half, so this is the caller's statement alone and neither the transform
      // guard nor F252.3's marked-half guard is the thing being probed.
      seedFn(version, stated, stated, stated);
    }
  }

  // The record has to be the carrier in both directions, not just inbound. `rebuild` was written
  // by a positioned step and then published from the pre-sequence ability map instead of the
  // record, so a non-Warlord input still advertised it (F244.3b review, finding 3).
  //
  // The assertion is narrowed to the case that can only be a defect: a key with no template row
  // in this version, whose every positioned writer is out of scope here, must not be published as
  // true just because the card marked it. A key the input map cannot carry at all — the
  // `DERIVED_OUTLANDER_STATE_KEYS` the reform strips, `blackpowder` among them — is skipped,
  // since absence rather than `false` is the documented publication rule.
  const derive = read('deriveUnitStats');
  const stripped = new Set(read('DERIVED_OUTLANDER_STATE_KEYS'));
  for (const key of [...grantWrites, ...grantValueWrites]) {
    if (stripped.has(key)) continue;
    const writers = (table[key] || [])
      .flatMap(row => row.producers)
      .filter(producer => producer.startsWith('step:'))
      .map(producer => producer.slice('step:'.length));
    if (!writers.length) continue;
    for (const version of versions) {
      if (abilityOriginIsTemplate(key, version)) continue;
      const inScope = writers.some(stepKey => (scopes[stepKey] || []).includes(version));
      if (inScope) continue;
      // Where the table gives the key no row here at all, the input never reaches the record: the
      // seed halts on it (F253.1), which is the same claim discharged one layer earlier and is
      // asserted as a halt rather than as an absent publication.
      if (noRowIn(key, version)) {
        assertSeedRefusesKey(() => derive(baseUnitInput({ version, abilities: { [key]: true } })),
          `${version}: marking '${key}' is refused by the seed rather than published`);
        continue;
      }
      const marked = derive(baseUnitInput({ version, abilities: { [key]: true } }));
      assert(!marked.abilities[key],
        `${version}: '${key}' has no writer in scope and no template row, so marking it publishes `
        + 'nothing — the record is the carrier');
    }
  }
}

// The `immunities` phase, proved by running it rather than by reading the chain (F244.3b, Option
// C; F252.4). Four things have to hold together, and each of them failed in some earlier draft:
// the phase has entries in every version, the seed carries the **innate** half, the step carries
// the **marked** half at its own rank, and the two together are the idempotent OR at the grant
// position (F252.2, shape 1). Before F252.4 the seed was forced false for these keys and the step
// read the merged map, so an innate-only unit fired a write claiming a cast had made it.
function runMarkedImmunityPhaseChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { versions, table, seeded } = deps;
  const chain = read('statChain');
  const derive = read('deriveUnitStats');
  const seedFn = read('seedNonStatRecordFields');

  // Read off the table rather than named here, so a third marked immunity is covered by filing its
  // row and nothing else.
  const marked = seeded.filter(key => (table[key] || [])
    .some(row => row.origin === 'immunities'));
  assert(marked.length > 0,
    'The immunities phase writes at least one marked immunity, so it is not an empty phase');

  for (const version of versions) {
    const entries = chain(version).filter(entry => entry.phase === 'immunities');
    assert(entries.length > 0,
      `${version}: the immunities phase has at least one chain entry`);
    assertSameKeyList(entries.map(entry => entry.id).sort(),
      marked.map(key => `${key}:marked`).sort(),
      `${version}: the immunities phase writes exactly the marked immunities`);

    const run = (innate, markedHalf) => derive(baseUnitInput({
      version, innateAbilities: innate, markedAbilities: markedHalf }));
    const markEvent = (result, key) => result.statExecutionTrace
      .find(event => event.phase === 'immunities' && event.id === `${key}:marked`);

    for (const key of marked) {
      // The seed carries the innate half — the suppression the `immunities` token used to impose
      // is gone (F252.4).
      assertEqual(!!seedFn(version, { [key]: true }, { [key]: true }, { [key]: true })[key], true,
        `${version}: '${key}' stated innate is what the template seed carries`);
      assertEqual(!!seedFn(version, {}, {}, {})[key], false,
        `${version}: '${key}' unstated is seeded false`);

      // Neither half: unwritten, and the step does not run either — the value assertion alone
      // cannot tell "nothing wrote it" from "something wrote false" (review, finding 3).
      const neither = run({}, {});
      assertEqual(!!neither.abilities[key], false,
        `${version}: '${key}' stays unwritten when neither half states it`);
      assertEqual((markEvent(neither, key) || {}).status, 'skipped',
        `${version}: and 'immunities:${key}:marked' does not run at all`);
      // Innate alone: the seed is the writer and the marked step does not run. That is the whole
      // of what the merged read hid — the step used to fire here.
      const innateOnly = run({ [key]: true }, {});
      assertEqual(!!innateOnly.abilities[key], true,
        `${version}: the innate half alone carries '${key}', through the template seed`);
      assertEqual((markEvent(innateOnly, key) || {}).status, 'skipped',
        `${version}: and 'immunities:${key}:marked' is skipped — it reads the marked half, not `
        + 'the merged map');
      // Marked alone: the step is the only writer, at `immunities` rank.
      const markedOnly = run({}, { [key]: true });
      assertEqual(!!markedOnly.abilities[key], true,
        `${version}: the marked half alone carries '${key}', through immunities:${key}:marked`);
      assertEqual((markEvent(markedOnly, key) || {}).status, 'applied',
        `${version}: and that step is what ran — the seed did not take the mark`);
      // Both: the OR at the grant position, idempotent because the write is a set onto the same
      // field (F252.2, shape 1).
      const both = run({ [key]: true }, { [key]: true });
      assertEqual(!!both.abilities[key], true,
        `${version}: both halves is the idempotent OR at the grant position`);
      assertEqual((markEvent(both, key) || {}).status, 'applied',
        `${version}: and the step still runs over the seeded bit — the OR is idempotent because `
        + 'the write is a set onto the same field, not because the step stands down');
    }
  }
}

// The `buffs` phase's marked half, proved by running it (F252.3 for `invisibility`, F252.5 for the
// other seven). This is the immunity block one phase later and makes the same four claims, over
// every key rather than over one: the step exists in exactly the versions its scope names, an
// innate statement does not fire it, a marked statement does, and where a key has both controls
// the two are the idempotent OR at the grant position (F252.2, shape 1).
//
// **The key list and the partition are read off the code, not named here.** A `buffs`-origin key
// that is a sequence record field takes a positioned `buffs:<key>:cast` step; a `buffs`-origin key
// that is *not* a record field has no step and no seed, so the merged ability map is its only
// carrier. That second class is 41 of the 49 marked `buffs` keys today — `fear`, `immolation`,
// `teleporting` and `undead` among them, the four dual-source ones. The assertion below keeps the
// two classes from drifting: giving one of the 41 a record field without giving it a cast step, or
// the reverse, fails here rather than silently putting a cast on the record at `template` rank.
//
// **It reconciles two implementation inventories; it does not say the 41 are exempt.** F252's rule
// is that the marked half is a positioned write, and for the 41 that would mean giving each a
// record field first and migrating its readers off the merged map — work F252.5 did not do and did
// not have a ruling for (F252.5 review, finding 1). Read this as the partition the code currently
// has, not as a discharge of that obligation.
function runMarkedBuffPhaseChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { versions, table, seeded, scopes } = deps;
  const derive = read('deriveUnitStats');
  const uiDefs = read('abilityUiDefs()');
  const abilityValueIsActive = read('abilityValueIsActive');
  const seededSet = new Set(seeded);

  // What a card states to turn each control on. Every one of the eight is a `bool` except
  // `discipline`, whose control is a select and whose step writes the stated value rather than a
  // flag. The mark is pinned against `abilityValueIsActive` below, so a def changing type cannot
  // leave a silently inert mark here.
  const MARK_VALUE = { discipline: 'overland' };
  const markValue = key => (Object.prototype.hasOwnProperty.call(MARK_VALUE, key)
    ? MARK_VALUE[key] : true);

  const buffsRows = key => (table[key] || []).filter(row => row.origin === 'buffs');
  const isPositioned = key => buffsRows(key).some(row => row.producers.length > 0
    && row.producers.every(producer => producer === 'step:buffs:' + key + ':cast'));
  const controlOf = (key, source) => uiDefs.find(def => def.calcKey === key && def.source === source);

  // The partition. Every `buffs`-origin key the card can mark is on exactly one side of it.
  const markedBuffKeys = Object.keys(table)
    .filter(key => buffsRows(key).length > 0 && controlOf(key, 'enchantment'));
  const cast = markedBuffKeys.filter(key => seededSet.has(key));
  for (const key of markedBuffKeys) {
    assertEqual(isPositioned(key), seededSet.has(key),
      `'${key}' is a marked buffs key: it has a positioned buffs:${key}:cast step exactly where it `
      + 'is a sequence record field, because a key the record does not carry has no rank to take');
  }
  assert(cast.length > 0, 'the buffs phase carries at least one marked cast write');

  for (const key of cast) {
    const stepKey = `buffs:${key}:cast`;
    const scope = scopes[stepKey];
    assert(Array.isArray(scope) && scope.length > 0, `${stepKey} has a canonical version scope`);
    assert(abilityValueIsActive(controlOf(key, 'enchantment'), markValue(key)),
      `the mark used for '${key}' is a value its own control reads as active`);
    const innate = controlOf(key, 'ability');

    for (const version of versions) {
      const run = (innateHalf, markedHalf) => derive(baseUnitInput({
        version, innateAbilities: innateHalf, markedAbilities: markedHalf }));
      const event = result => result.statExecutionTrace
        .find(entry => entry.phase === 'buffs' && entry.id === `${key}:cast`);
      const inScope = scope.includes(version);
      const mark = markValue(key);
      // Where this version's table names the key nowhere, marking it is refused at the seed
      // (F253.1) rather than carried nowhere, which is the out-of-scope claim below made one
      // layer earlier and more strongly. `discipline` in the three DOS builds is the live case.
      if (seedRefusesKeyIn(ctx, key, version)) {
        assert(!inScope,
          `${version}: '${stepKey}' is out of scope wherever the table names '${key}' nowhere`);
        assertSeedRefusesKey(() => run({}, { [key]: mark }),
          `${version}: marking '${key}' is refused by the seed`);
        continue;
      }

      // Neither half: unwritten, and the step does not run — the value alone cannot separate
      // "nothing wrote it" from "something wrote false".
      const neither = run({}, {});
      assert(!neither.abilities[key],
        `${version}: '${key}' stays unwritten when neither half states it`);
      assertEqual((event(neither) || {}).status, inScope ? 'skipped' : undefined,
        `${version}: and '${stepKey}' is in the chain exactly where its scope puts it`);

      // Marked alone: the step is the writer, at `buffs` rank.
      const markedOnly = run({}, { [key]: mark });
      assertEqual((event(markedOnly) || {}).status, inScope ? 'applied' : undefined,
        `${version}: the marked half fires '${stepKey}' exactly in scope`);
      if (inScope) {
        assertEqual(markedOnly.abilities[key], mark,
          `${version}: and '${key}' reaches the record through it`);
      } else {
        assert(!markedOnly.abilities[key],
          `${version}: out of scope nothing carries '${key}' — the record is the carrier`);
      }

      // Innate: seven of the eight have no ability control at all today, so for those the merged
      // card map *is* the marked half and re-sourcing them moved no number. That is a coincidence
      // of which controls exist, not a property — and this branch is what catches it changing:
      // giving one of the seven an ability control makes `innate` truthy, and the innate-only
      // assertion below then fails, because a key with no `template` row is not seeded.
      // `invisibility` is the one dual-source key of the eight, where the seed is the writer and
      // the cast step must stand down (F252.3). Reviewer-reproduced (F252.5 review, finding 2).
      if (!innate) continue;
      const innateOnly = run({ [key]: mark }, {});
      assertEqual(!!innateOnly.abilities[key], true,
        `${version}: the innate half alone carries '${key}', through the template seed`);
      assertEqual((event(innateOnly) || {}).status, inScope ? 'skipped' : undefined,
        `${version}: and '${stepKey}' is skipped — it reads the marked half, not the merged map`);
      const both = run({ [key]: mark }, { [key]: mark });
      assertEqual(!!both.abilities[key], true,
        `${version}: both halves is the idempotent OR at the grant position (F252.2, shape 1)`);
      assertEqual((event(both) || {}).status, inScope ? 'applied' : undefined,
        `${version}: and the step still runs over the seeded bit — the OR is idempotent because `
        + 'the write is a set onto the same field, not because the step stands down');
    }
  }
}

// The `debuffs` phase's marked half, proved by running it (F252.6). This is the `immunities` and
// `buffs` blocks one phase later and makes the same claims over the phase's own key list: the
// step is in the chain exactly where its scope puts it, neither half leaves the key unwritten
// *and* the step applied, and the marked half alone puts the flag on the record.
//
// **Two things are different here, and both are the phase's own.** A `debuffs` write is refused by
// an immunity standing on the record at its rank (`curseRefusedByImmunity`, `stats_identity.js`;
// the user's ruling of 2026-09-02), so the marked-alone run is made on a unit with no immunity
// stated and the refusal is asserted separately by `runImmunityRefusalMatrix` below. And **none of
// the nine has an `ABILITY_DEFS` control**, so no card can state one of these keys in the innate
// half — which means the merged map and the marked half are identical on every control-built
// input, and a value probe cannot tell the F252.6 read from the F244.3b one. The innate arm below
// therefore states the half **directly**, through `deriveUnitStats`' own documented input
// boundary, and asserts the thing only the marked read makes true: a curse flag has no `template`
// row in any version, so an innate statement reaches nothing and the cast step stands down.
// Reverting `curseCastSteps`' argument to the merged map fails exactly there. `assertEqual(!!innate,
// false, ...)` below is what makes a curse flag gaining an ability control fail rather than
// silently changing what that arm means.
//
// **The key list and the partition are read off the code.** A `debuffs`-origin key that is a
// sequence record field takes a positioned `debuffs:<key>:cast` step; a `debuffs`-origin key that
// is not a record field has no such step, and the merged ability map is its only carrier. Today
// that is 9 / 4: the nine curse flags against `hierophany`, `mislead`, `soulFlay` and `rust`.
//
// **It reconciles two implementation inventories; it does not say the four are exempt.** F252's
// rule is that the marked half is a positioned write, and for the four that means giving each a
// record field and migrating its readers off the merged map — the same obligation
// `runMarkedBuffPhaseChecks` above leaves open for its 41. `rust` is the sharpest of the four: it
// *does* have a positioned `debuffs` step, `debuffs:rust:material`, and F252.6 re-sourced that
// step's cast term to the marked half with the nine (`rustActiveAt`, `stats.js`) — but `rust`
// itself is still not a record field, so the key travels on the merged map to the melee -3 in
// `combat_abilities.js` and to every other reader, and this block cannot range over it.
function runMarkedDebuffPhaseChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { versions, table, seeded, scopes } = deps;
  const chain = read('statChain');
  const derive = read('deriveUnitStats');
  const uiDefs = read('abilityUiDefs()');
  const abilityValueIsActive = read('abilityValueIsActive');
  const seededSet = new Set(seeded);

  const debuffRows = key => (table[key] || []).filter(row => row.origin === 'debuffs');
  const isPositioned = key => debuffRows(key).some(row => row.producers.length > 0
    && row.producers.every(producer => producer === 'step:debuffs:' + key + ':cast'));
  const controlOf = (key, source) => uiDefs.find(def => def.calcKey === key && def.source === source);

  // The partition. Every `debuffs`-origin key the card can mark is on exactly one side of it.
  const markedDebuffKeys = Object.keys(table)
    .filter(key => debuffRows(key).length > 0 && controlOf(key, 'enchantment'));
  const cast = markedDebuffKeys.filter(key => seededSet.has(key));
  for (const key of markedDebuffKeys) {
    assertEqual(isPositioned(key), seededSet.has(key),
      `'${key}' is a marked debuffs key: it has a positioned debuffs:${key}:cast step exactly `
      + 'where it is a sequence record field, because a key the record does not carry has no rank '
      + 'to take');
  }
  assert(cast.length > 0, 'the debuffs phase carries at least one marked cast write');

  // Completeness in the other direction: every `:cast` entry the phase actually runs is one of
  // them, so a curse write added to the chain without a `debuffs` origin row fails here.
  for (const version of versions) {
    const inPhase = chain(version)
      .filter(entry => entry.phase === 'debuffs' && entry.id.endsWith(':cast'))
      .map(entry => entry.id).sort();
    assertSameKeyList(inPhase,
      cast.filter(key => (scopes[`debuffs:${key}:cast`] || []).includes(version))
        .map(key => `${key}:cast`).sort(),
      `${version}: the debuffs phase's cast writes are exactly the marked debuffs record fields `
      + 'their scopes put here');
  }

  for (const key of cast) {
    const stepKey = `debuffs:${key}:cast`;
    const scope = scopes[stepKey];
    assert(Array.isArray(scope) && scope.length > 0, `${stepKey} has a canonical version scope`);
    assert(abilityValueIsActive(controlOf(key, 'enchantment'), true),
      `the mark used for '${key}' is a value its own control reads as active`);
    const innate = controlOf(key, 'ability');
    assertEqual(!!innate, false,
      `'${key}' has no ABILITY_DEFS control — the innate arm below is written for that, and a `
      + 'curse flag gaining one owes a template row (F252.3) and a re-derivation here');

    for (const version of versions) {
      const run = (innateHalf, markedHalf) => derive(baseUnitInput({
        version, innateAbilities: innateHalf, markedAbilities: markedHalf }));
      const event = result => result.statExecutionTrace
        .find(entry => entry.phase === 'debuffs' && entry.id === `${key}:cast`);
      const inScope = scope.includes(version);
      // The same refusal the buffs block states: a key this version's table names nowhere is
      // refused at the seed rather than carried nowhere (F253.1). `nausea` outside Warlord is the
      // live case; the other eight curses have rows in every build and fall through.
      if (seedRefusesKeyIn(ctx, key, version)) {
        assert(!inScope,
          `${version}: '${stepKey}' is out of scope wherever the table names '${key}' nowhere`);
        assertSeedRefusesKey(() => run({}, { [key]: true }),
          `${version}: marking '${key}' is refused by the seed`);
        continue;
      }

      // Neither half: unwritten, and the step does not run — the value alone cannot separate
      // "nothing wrote it" from "something wrote false".
      const neither = run({}, {});
      assert(!neither.abilities[key],
        `${version}: '${key}' stays unwritten when neither half states it`);
      assertEqual((event(neither) || {}).status, inScope ? 'skipped' : undefined,
        `${version}: and '${stepKey}' is in the chain exactly where its scope puts it`);

      // Marked alone, on a unit stating no immunity: the step is the writer, at `debuffs` rank.
      const markedOnly = run({}, { [key]: true });
      assertEqual((event(markedOnly) || {}).status, inScope ? 'applied' : undefined,
        `${version}: the marked half fires '${stepKey}' exactly in scope`);
      if (inScope) {
        assertEqual(!!markedOnly.abilities[key], true,
          `${version}: and '${key}' reaches the record through it`);
      } else {
        assert(!markedOnly.abilities[key],
          `${version}: out of scope nothing carries '${key}' — the record is the carrier`);
      }

      // **The innate arm, run whether or not a control puts a key there.** This is what
      // separates the marked read from the merged one, and it is the only thing that can: with
      // no curse flag carrying an `ABILITY_DEFS` control, every *card* states these keys in the
      // marked half alone, so the two maps are identical on every input a control can build and a
      // value probe cannot see the difference. `deriveUnitStats`' halves are its documented input
      // boundary, so the check states the innate half directly.
      //
      // A curse flag has no `template` row in any version, so the innate statement must reach
      // nothing: the seed does not carry it and the cast step, reading the marked half, stands
      // down. Under the merged read the step fires here and publishes the flag — which is
      // precisely the defect F252.6 removed, and reverting the argument fails these two lines.
      const innateOnly = run({ [key]: true }, {});
      assert(!innateOnly.abilities[key],
        `${version}: '${key}' stated in the innate half alone reaches nothing — it has no `
        + 'template row, and the cast step reads the marked half');
      assertEqual((event(innateOnly) || {}).status, inScope ? 'skipped' : undefined,
        `${version}: and '${stepKey}' is skipped — it reads the marked half, not the merged map`);
      // Both halves: the marked statement is what fires the step, and the innate one adds
      // nothing. If one of the nine ever gains an ability control this stays true while the
      // `innateOnly` arm above becomes the assertion that has to be re-derived — a `template` row
      // would then be owed, and F252.3's guard is the second net.
      const both = run({ [key]: true }, { [key]: true });
      assertEqual((event(both) || {}).status, inScope ? 'applied' : undefined,
        `${version}: the marked statement fires '${stepKey}' with the innate half stated too`);
      assertEqual(!!both.abilities[key], inScope,
        `${version}: and '${key}' is on the record exactly in scope`);
    }
  }
}

// --- 15. the Sapiens label is a record field (F263) -------------------------------------------
// The `NOTSAPIENS` gate is `BASEFANTASTIC(U)>0 %AND (GETSTAT(U,SMultiLabel,1)<>14)`, and both
// terms read the permanent record. F262 positioned the first; this block is the second, and it
// asserts the three things the value of a reform grant alone cannot separate:
//
//   1. the label is a **sequence record field** whose innate control seeds it at `template` rank;
//   2. Spirit Link's `SETSTAT(TU,SMultiLabel,1,14)` is a positioned `buffs:spiritLink:sapiens`
//      write standing under the block's own `IF BASEFANTASTIC(TU)`, read off the record at its own
//      rank — the step is ahead of `buffs:spiritLink:fantastic`, which is where the script writes
//      it, so the clear has not yet falsified the flag it reads;
//   3. `outlanderSapiensAt` reads **both** terms off `ctx.base`, so a unit whose permanent record
//      is Fantastic keeps the reform grant exactly when the record also carries the label.
//
// The lesson F252.6 left is honoured two ways. The innate arm states `innateAbilities` directly
// through `deriveUnitStats`' documented boundary rather than through a control-conditional branch,
// and the label's two writers are *different keys* — the `sapiens` ability control and the
// `spiritLink` enchantment — so no half-merge can make one stand in for the other.
//
// **What these assertions observe, exactly**: the published `abilities.sapiens` and each step's
// execution status. That is enough to catch the writer being deleted and the pre-sequence
// `sapiensLabelled` term restored — every number would stay where it is and the `applied` /
// `skipped` arms would fail — and enough to catch the step's own `IF BASEFANTASTIC(TU)` gate
// going. It is **not** enough to separate `outlanderSapiensAt`'s `ctx.base` read from a read of
// the running record: no step writes `sapiens` after `a:baseCopy`, so the two records carry the
// same label and no probe can tell them apart. That choice is correct by inspection against the
// selector — `GETSTAT(U,SMultiLabel,1)`, `ABase` — and is asserted nowhere (F263 review,
// finding 2).
function runSapiensLabelChecks(ctx, deps) {
  const read = expression => vm.runInContext(expression, ctx);
  const { versions, table, seeded, scopes } = deps;
  const derive = read('deriveUnitStats');
  const stepKey = 'buffs:spiritLink:sapiens';
  const warlord = 'com2_warlord_1.5.12.9';

  // The classification, read off the code rather than restated. The label is a record field, its
  // `buffs` row names exactly this step, and the step is Warlord's alone — the version whose
  // scripts carry both the `NOTSAPIENS` gate and the Spirit Link block.
  assert(seeded.includes('sapiens'),
    'the Sapiens label is a sequence record field — the NOTSAPIENS gate reads it at a rank');
  const buffsRow = (table.sapiens || []).find(row => row.origin === 'buffs');
  assert(!!buffsRow && buffsRow.producers.length === 1
    && buffsRow.producers[0] === `step:${stepKey}`,
    'and its buffs origin is the positioned Spirit Link write, not a bare cast producer');
  assertSameKeyList([...(scopes[stepKey] || [])].sort(), [warlord],
    `${stepKey} is Warlord's alone`);

  const run = (version, unitType, innate, marked) => derive(baseUnitInput({
    version, unitType, innateAbilities: innate, markedAbilities: marked }));
  const event = result => result.statExecutionTrace
    .find(entry => entry.phase === 'buffs' && entry.id === 'spiritLink:sapiens');

  for (const version of versions) {
    const inScope = version === warlord;
    // Neither writer: unwritten, and the step does not run. The value alone cannot separate
    // "nothing wrote it" from "something wrote false", which is why the status is asserted beside
    // it in every arm below.
    const neither = run(version, 'normal', {}, {});
    assert(!neither.abilities.sapiens,
      `${version}: the label stays unwritten when neither writer states it`);
    assertEqual((event(neither) || {}).status, inScope ? 'skipped' : undefined,
      `${version}: and '${stepKey}' is in the chain exactly where its scope puts it`);

    // The innate control alone: the template seed is the writer and the step stands down. Out of
    // scope the table names the label nowhere, so the statement is refused at the seed rather than
    // carried nowhere (F253.1) — the same claim, one layer earlier.
    const statedInnate = () => run(version, 'normal', { sapiens: true }, {});
    if (inScope) {
      const innateOnly = statedInnate();
      assertEqual(!!innateOnly.abilities.sapiens, true,
        `${version}: the innate half carries the label where a template row offers it`);
      assertEqual((event(innateOnly) || {}).status, 'skipped',
        `${version}: and the cast step stands down — the seed is the innate half's writer`);
    } else {
      assertSeedRefusesKey(statedInnate,
        `${version}: the Sapiens label stated in the innate half alone is refused`);
    }

    // Spirit Link on a **base-Fantastic** unit: the cast is the writer, at `buffs` rank.
    const castFantastic = run(version, 'fantastic_chaos', {}, { spiritLink: true });
    assertEqual((event(castFantastic) || {}).status, inScope ? 'applied' : undefined,
      `${version}: Spirit Link fires '${stepKey}' exactly in scope`);
    assertEqual(!!castFantastic.abilities.sapiens, inScope,
      `${version}: and the label reaches the record through it`);

    // Spirit Link on a **base-normal** unit: the block's own `IF BASEFANTASTIC(TU)` is false at
    // this step's rank, so no label is written. This is the arm that fails if the step is given
    // the cast's mark without the gate, and the arm a latched pre-sequence predicate could not
    // distinguish from the one above without restating the flag.
    const castNormal = run(version, 'normal', {}, { spiritLink: true });
    assertEqual((event(castNormal) || {}).status, inScope ? 'skipped' : undefined,
      `${version}: Spirit Link on a base-normal unit writes no label — the block gates on `
      + 'BASEFANTASTIC(TU) and this step reads it off the record at its own rank');
    assert(!castNormal.abilities.sapiens,
      `${version}: and nothing carries the label for that unit`);

    // Both writers: the idempotent OR at the grant position (F252.2, shape 1). The write is a set
    // onto the same field, so the step still runs over the seeded bit rather than standing down.
    const statedBoth = () => run(version, 'fantastic_chaos', { sapiens: true },
      { spiritLink: true });
    if (inScope) {
      const both = statedBoth();
      assertEqual(!!both.abilities.sapiens, true,
        `${version}: both writers leave the label on the record`);
      assertEqual((event(both) || {}).status, 'applied',
        `${version}: and the step still runs over the seeded bit`);
    } else {
      assertSeedRefusesKey(statedBoth,
        `${version}: and so is the label stated by both writers`);
    }
  }

  // The reader, at the rank of the step asking. `b:bombsGrenades` is one of the six region-`b`
  // steps `outlanderSapiensAt` gates, and the four combinations below are the gate's truth table
  // read off the permanent record: the grant is withheld only where the record is Fantastic and
  // carries no label. Destiny is the case that makes the two terms disagree — its
  // `B.Fantastic := True` is re-made on every pass and does not touch `SMultiLabel` — so the
  // label has to survive it, which is what a projection of "Spirit Link cleared the flag" could
  // not express (F245).
  const reform = { outlanderWizard: true, explosive: true };
  const grant = (unitType, innate, marked) => {
    const result = derive(baseUnitInput({ version: warlord, unitType, atk: 1, figs: 4,
      innateAbilities: innate, markedAbilities: { ...reform, ...marked } }));
    const entry = result.statExecutionTrace
      .find(step => step.phase === 'b' && step.id === 'bombsGrenades');
    return entry ? entry.status : 'absent';
  };
  assertEqual(grant('normal', {}, {}), 'applied',
    'a base-normal unit takes Bombs & Grenades — the gate opens on the first term alone');
  assertEqual(grant('fantastic_chaos', {}, {}), 'skipped',
    'a base-Fantastic unit with no label does not — both terms of the conjunction hold');
  assertEqual(grant('fantastic_chaos', { sapiens: true }, {}), 'applied',
    'the innate label is the exemption, read off ctx.base at this step\'s own rank');
  assertEqual(grant('fantastic_chaos', {}, { spiritLink: true }), 'applied',
    "Spirit Link's own label write is the same exemption");
  assertEqual(grant('normal', {}, { destiny: true }), 'skipped',
    "Destiny's permanent B.Fantastic := True closes the gate for an unlabelled unit");
  assertEqual(grant('normal', { sapiens: true }, { destiny: true }), 'applied',
    'and the innate label survives it — the conjunction admits a labelled Fantastic unit');
  assertEqual(grant('fantastic_chaos', {}, { spiritLink: true, destiny: true }), 'applied',
    "Spirit Link's label survives Destiny re-asserting the flag its clear took away (F245)");
  assertEqual(grant('normal', {}, { spiritLink: true, destiny: true }), 'skipped',
    'while a base-normal Spirit Link target was never labelled, so Destiny closes the gate on it');
}

// The immunity matrix the review asked for: every curse against every immunity source, direct and
// granted, in every version. It is committed rather than left to a scratch probe because it is the
// assertion that the `debuffs` gates read the record and not a projection — a granted immunity has
// to refuse exactly what a stated one refuses.
function runImmunityRefusalMatrix(ctx, magicCurses) {
  const read = expression => vm.runInContext(expression, ctx);
  const derive = read('deriveUnitStats');
  const illusionCurses = read('ILLUSION_IMMUNITY_GATED_CURSES');
  const versions = read('ENGINE_VERSIONS');
  const warlord = 'com2_warlord_1.5.12.9';
  const sources = [
    { name: 'stated Magic Immunity', abilities: { magicImmunity: true }, magic: true },
    { name: 'stated Illusion Immunity', abilities: { illusionImmunity: true }, illusion: true },
    { name: 'True Sight', abilities: { trueSight: true }, illusion: true },
    // Sancta Basilica grants a High Men Paladin Magic Immunity. It is a pre-sequence transform, so
    // it is the case that proves a *granted* immunity refuses exactly what a stated one does —
    // the property the retired `finishedImmunities` projection used to provide by construction.
    // There is no Illusion-arm grant counterpart, and since F244.3g there cannot be one: the
    // Marionette book package is the only Illusion Immunity grant in any version, and it is a
    // region-`b` step now, made two phases after `debuffs:mindStorm:cast` has written the flag.
    // `marionetteRegionBGrantDoesNotRefuseMindStormWarlord` (`presets_warlord_effects.js`) is the
    // fixture for that, and it asserts the opposite of what its predecessor did.
    { name: 'Sancta Basilica grant', warlordOnly: true, name_: 'Paladins',
      abilities: { sanctaBasilica: true }, race: 'High Men', magic: true },
    { name: 'no immunity', abilities: {} },
  ];
  for (const version of versions) {
    for (const source of sources) {
      if (source.warlordOnly && version !== warlord) continue;
      for (const curse of magicCurses) {
        // `nausea` exists only in Warlord, so outside it the flag is never written at all and the
        // matrix would be asserting the version scope rather than the refusal.
        if (curse === 'nausea' && version !== warlord) continue;
        const input = baseUnitInput({ version, name: source.name_ || 'a custom unit',
          race: source.race || '', abilities: { [curse]: true, ...source.abilities } });
        const result = derive(input);
        const refused = !!source.magic
          || (!!source.illusion && illusionCurses.includes(curse));
        assertEqual(!!result.abilities[curse], !refused,
          `${version}: ${source.name} ${refused ? 'refuses' : 'admits'} ${curse}`);
      }
    }
  }
}

// --- 14. the permanent attack record is read from `ctx.base` (F244.3i) ------------------------
//
// Four gates used to ask the card's `rtb`/`rtbType`/`modernAttacks` input what the permanent
// attack record holds; they ask `ctx.base` now, the record `a:baseCopy` publishes after the five
// permanent-record phases have written it. In the four non-Warlord builds `template:stat:base` is
// the *only* permanent-phase writer of an attack field; in Warlord eight training writers move the
// field without flipping any of these answers, because the one retype landing ahead of a reader
// (`training:energyCannon`, Beam) stays inside `RANGED_TYPES` and every write **to the Ranged
// field** is itself gated on a Ranged field that already carries strength. (Lightning Blade and
// Dragon Mound do create Breath strength from nothing; neither is a Ranged field.)
//
// A claim no output can distinguish has to be asserted on the predicate, not through an input
// (F244.3f review, finding 5). Each gate is therefore driven against a `base` that says the
// *opposite* of the card, and only the **discriminating** cases below are evidence of the
// relocation — an assertion the card and the record answer alike is there for the gate's own
// terms, not for where it reads them.
//
// Two instruments, and the second exists because the first was not enough. Calling a composed
// predicate proves what that predicate does; it does not prove the production path reaches it.
// The F244.3i review demonstrated four wrong implementations that passed every assertion in this
// section's first draft — `addToSlot`'s forwarding regressed under an untouched `slotGateAdmits`,
// the Chaos Channels `apply`'s independent re-check regressed under an untouched `when`, the
// post-run Destruction reader reverted with `d:energyCannonThreshold` untouched, and the Energy
// Cannon type test narrowed to the single token every synthetic base happened to name. So the
// second instrument is `deriveWithPatchedBase`, which doctors the record `a:baseCopy` publishes
// and then reads a *derived output*: it drives each production call site whole.
function runPermanentAttackRecordChecks(ctx) {
  const read = expression => vm.runInContext(expression, ctx);
  const derive = read('deriveUnitStats');
  const slotGateAdmits = read('slotGateAdmits');
  const WARLORD = 'com2_warlord_1.5.12.9';

  // One wrapped derivation yields both instruments: the composed steps with their closures, and
  // the run context the sequence actually ran on — which is where the real slot contexts live.
  // Fabricating a slot context would fabricate the thing under test.
  function captureRun(input) {
    let runContext = null;
    ctx.__runCapture = (spec) => {
      if (spec.id !== 'baseCopy') return spec;
      const inner = spec.apply;
      return Object.assign({}, spec, { apply: (u, c) => {
        const result = inner(u, c); runContext = c; return result;
      } });
    };
    const steps = captureComposedSteps(ctx, () => {
      read('(function () { var original = statStep;'
        + ' statStep = function (spec) { return original(__runCapture(spec)); };'
        + ' __restoreCapture = function () { statStep = original; }; }())');
      try { derive(input); } finally { read('__restoreCapture()'); }
    });
    delete ctx.__runCapture;
    assert(!!runContext, 'the wrapped `a:baseCopy` published a run context');
    return { steps, runContext };
  }

  // Doctor the record `a:baseCopy` publishes, then let the whole derivation run on it. Whatever
  // the card says, every gate downstream of the copy must answer from the patched record — and
  // the answer is read off a derived output, so the production call site is what is under test.
  function deriveWithPatchedBase(input, patch) {
    ctx.__basePatch = patch;
    read('(function () { var original = statStep;'
      + ' statStep = function (spec) {'
      + '   if (spec.id !== "baseCopy") return original(spec);'
      + '   var inner = spec.apply;'
      + '   var patched = Object.assign({}, spec, { apply: function (u, c) {'
      + '     var r = inner(u, c); Object.assign(c.base, __basePatch); return r; } });'
      + '   return original(patched); };'
      + ' __restorePatch = function () { statStep = original; }; }())');
    try { return derive(input); } finally {
      read('__restorePatch()');
      delete ctx.__basePatch;
    }
  }

  // (a) `d:energyCannonThreshold`. The card states a Ranged channel that is typed but empty, so
  // the input-derived gate is false; a `ctx.base` carrying strength in a magical Ranged field
  // opens it, and an emptied `ctx.base` closes it over a card that states strength.
  const cannonInput = over => baseUnitInput({ version: WARLORD, atk: 4, def: 3, res: 5, hp: 6,
    abilities: { outlanderWizard: true, heatPowerEngine: true, energyBeamWeapons: true,
      mechanical: true },
    identity: { version: WARLORD, unitType: 'normal', baseRace: '', baseFantastic: false,
      isHero: false },
    ...over });
  const emptyCard = captureRun(cannonInput({
    modernAttacks: { ranged: { strength: 0, type: 'missile' } } }));
  const cannonGate = composedPredicate(emptyCard.steps, 'energyCannonThreshold', 'd');
  const cannonUnit = { powerEngine: true };
  assertEqual(cannonGate(cannonUnit, { base: { rtbRanged: 0, rangedTypeRanged: 'missile' } }), false,
    'd:energyCannonThreshold is refused where the permanent Ranged field is empty');
  assertEqual(cannonGate(cannonUnit, { base: { rtbRanged: 3, rangedTypeRanged: 'magic' } }), true,
    'and admitted where it carries Beam strength, which the card, stating an empty channel, does not');
  const fullCard = captureRun(cannonInput({
    modernAttacks: { ranged: { strength: 4, type: 'missile' } } }));
  const cannonGateFull = composedPredicate(fullCard.steps, 'energyCannonThreshold', 'd');
  assertEqual(cannonGateFull(cannonUnit, { base: { rtbRanged: 0, rangedTypeRanged: 'missile' } }),
    false,
    'and refused on a card that states strength once the permanent record no longer carries it');
  // The type half is asserted separately, since every base above names a ranged type: a Ranged
  // field carrying strength under no projectile type is not a conventional ranged attack, which is
  // what `CreateUnit.CAS`'s ammo-derived gate stands for. A typeless field is reachable — the
  // Focus Magic, Blaze of Glory and Marionette seeds all create one.
  assertEqual(cannonGateFull(cannonUnit, { base: { rtbRanged: 4, rangedTypeRanged: 'none' } }), false,
    'and refused where the permanent Ranged field carries strength under no projectile type');
  assertEqual(cannonGateFull(cannonUnit, { base: { rtbRanged: 4, rangedTypeRanged: 'thrown' } }),
    false, 'or a Thrown one, which is not a conventional ranged attack');
  // Every member of the vocabulary, not the one token the cases above happened to name: narrowing
  // `RANGED_TYPES.includes(...)` to `=== 'magic'` passed the whole suite (F244.3i review,
  // finding 2). `CreateUnit.CAS`'s gate is the ammunition-bearing conventional ranged attack,
  // which is the whole of `RANGED_TYPES` and not a chosen projectile.
  for (const type of read('RANGED_TYPES')) {
    assertEqual(cannonGateFull(cannonUnit, { base: { rtbRanged: 2, rangedTypeRanged: type } }), true,
      `every conventional ranged type admits the Energy Cannon record gate, ${type} included`);
  }

  // (b) `slots.persistentRanged`, the aura pass's `B.ranged > 0`. Asked of the real Ranged slot
  // context, through the same `slotGateAdmits` arm `e:holyBonus` and `e:mislead` reach it by.
  const thrownCard = captureRun(cannonInput({
    modernAttacks: { ranged: { strength: 4, type: 'missile' },
      thrown: { strength: 6, type: 'thrown' } } }));
  const rangedSlot = fullCard.runContext.channels
    .find(channel => channel.channelKey === 'ranged');
  assert(!!rangedSlot, 'the captured run context carries the record\'s Ranged slot');
  assertEqual(slotGateAdmits({}, rangedSlot, 'persistentRanged', { base: { rtbRanged: 0 } }), false,
    'the aura pass is refused where the permanent Ranged field is empty, though the card states 4');
  assertEqual(slotGateAdmits({}, rangedSlot, 'persistentRanged', { base: { rtbRanged: 5 } }), true,
    'and admitted where it carries strength');
  // `if B.ranged > 0` names one field. A Thrown or Breath channel carrying strength is not it, and
  // the term saying so needs its own assertion: a run in which the Ranged channel is empty and a
  // secondary one is full is what a dropped term would show, and no card the digest draws builds
  // it.
  const thrownSlot = thrownCard.runContext.channels
    .find(channel => channel.channelKey === 'thrown');
  assert(!!thrownSlot, 'the Thrown channel is in the run context to ask');
  assertEqual(slotGateAdmits({}, thrownSlot, 'persistentRanged', { base: { rtbThrown: 6 } }), false,
    'the aura pass never reaches the Thrown channel, whatever strength the permanent record gives it');
  // ...and the same claim through the production path. `addToSlot` forwards the run context to
  // `slotGateAdmits`; regressing only that forwarding, with `slotGateAdmits` untouched, passed
  // every assertion above (F244.3i review, finding 5). So `e:holyBonus`'s CoM2 arm is run whole
  // and the Ranged channel's published strength is the assertion.
  const auraCard = over => baseUnitInput({ version: WARLORD, atk: 4, def: 3, res: 5, hp: 6,
    abilities: { holyBonus: 3 },
    identity: { version: WARLORD, unitType: 'normal', baseRace: '', baseFantastic: false,
      isHero: false },
    modernAttacks: { ranged: { strength: 4, type: 'missile' } }, ...over });
  const auraPlain = derive(auraCard({}));
  assertEqual(auraPlain.modernAttacks.ranged.strength, 7,
    'Holy Bonus reaches the Ranged channel of a record whose permanent Ranged field carries 4');
  const auraEmptiedBase = deriveWithPatchedBase(auraCard({}), { rtbRanged: 0 });
  assertEqual(auraEmptiedBase.modernAttacks.ranged.strength, 4,
    'and is refused once the permanent record the copy published carries no Ranged strength, '
    + 'though the card still states 4');
  // The shared slot's arm carries the type test the channel's does not: one DOS-shaped value
  // stands for ranged, Thrown, Breath and a gaze alike, so it is the Ranged field only while the
  // permanent type is a conventional ranged one.
  const sharedSlot = fullCard.runContext.channels.find(channel => !channel.isChannelSlot);
  assert(!!sharedSlot, 'and the shared slot beside it');
  assertEqual(slotGateAdmits({}, sharedSlot, 'persistentRanged',
    { base: { rtb: 4, rangedType: 'thrown' } }), false,
    'the shared slot is not the Ranged field while the permanent record types it Thrown');
  assertEqual(slotGateAdmits({}, sharedSlot, 'persistentRanged',
    { base: { rtb: 4, rangedType: 'boulder' } }), true,
    'and is once the permanent type is a conventional ranged one');

  // (c) Chaos Channels' DOS admission gate. MoM 1.31 is the build whose ceiling is 3 rather than
  // 0, so both halves of the test are visible in one version. The card states a Missile record
  // the gate refuses; a `ctx.base` that types the shared value as nothing admits it, and the
  // reverse card is refused by a `ctx.base` that types it Missile.
  const ccMissile = captureRun(baseUnitInput({ version: 'mom_1.31', atk: 4, def: 3, res: 5, hp: 6,
    rtb: 2, rtbType: 'missile', abilities: { ccFireBreath: true } }));
  const ccGate = composedPredicate(ccMissile.steps, 'chaosChannels:fireBreath', 'c');
  assertEqual(ccGate({}, { base: { rtb: 2, rangedType: 'missile', thrownType: 'none' } }), false,
    'c:chaosChannels:fireBreath is refused while the permanent record types the shared value Missile');
  assertEqual(ccGate({}, { base: { rtb: 2, rangedType: 'none', thrownType: 'none' } }), true,
    'and admitted where it types it as nothing at a strength inside MoM 1.31\'s ceiling of 3');
  assertEqual(ccGate({}, { base: { rtb: 4, rangedType: 'none', thrownType: 'none' } }), false,
    'the ceiling being read off the same record, not off the card');
  // The step's `apply` re-asks `ccGrantsThisSlot` for itself, so regressing that call alone left
  // every assertion above green (F244.3i review, finding 4). Run the block whole instead: the
  // card types the shared byte Missile, which the gate refuses, and a patched base that types it
  // as nothing must admit the conversion — Fire Breath at MoM 1.31's strength 2, over the top of
  // the byte.
  const ccCard = baseUnitInput({ version: 'mom_1.31', atk: 4, def: 3, res: 5, hp: 6,
    rtb: 2, rtbType: 'missile', abilities: { ccFireBreath: true } });
  const ccRefused = derive(ccCard);
  assertEqual(ccRefused.thrownType, 'none',
    'Chaos Channels is refused on a Missile record and grants no Fire Breath');
  const ccAdmitted = deriveWithPatchedBase(ccCard,
    { rangedType: 'none', thrownType: 'none', rtb: 0 });
  assertEqual(ccAdmitted.thrownType, 'fire',
    'and lands once the permanent record the copy published types the shared byte as nothing');
  assertEqual(ccAdmitted.rtb, 2, 'assigning MoM 1.31\'s strength 2 over the byte');
  // The Doom Gaze half of the admission gate is a record field too, not a card mark
  // (F244.3i review, finding 1): `template:stat:base` writes `doomGaze` and `a:baseCopy`
  // publishes it, so a base that carries a Doom Gaze refuses a card that states none.
  const ccDoomBase = deriveWithPatchedBase(ccCard,
    { rangedType: 'none', thrownType: 'none', rtb: 0, doomGaze: 3 });
  assertEqual(ccDoomBase.thrownType, 'none',
    'a permanent record carrying Doom Gaze refuses the conversion, though the card states none');

  // (d) The post-run Destruction rider, the second reader of `energyCannonResearchAt`. Reverting
  // it to the card-derived test passed everything above, because section 14 reached that
  // predicate only through `d:energyCannonThreshold` (F244.3i review, finding 3).
  const riderCard = channels => baseUnitInput({ version: WARLORD, atk: 4, def: 3, res: 5, hp: 6,
    abilities: { outlanderWizard: true, heatPowerEngine: true, energyBeamWeapons: true,
      mechanical: true },
    identity: { version: WARLORD, unitType: 'normal', baseRace: '', baseFantastic: false,
      isHero: false },
    modernAttacks: channels });
  const riderOn = derive(riderCard({ ranged: { strength: 4, type: 'missile' } }));
  assert(riderOn.abilities.energyCannonDestruction < 0,
    'the Destruction rider is written for a record whose permanent Ranged field carries strength');
  const riderEmptiedBase = deriveWithPatchedBase(
    riderCard({ ranged: { strength: 4, type: 'missile' } }),
    { rtbRanged: 0, rangedTypeRanged: 'none' });
  assertEqual(riderEmptiedBase.abilities.energyCannonDestruction, undefined,
    'and withheld once the permanent record the copy published carries none, though the card '
    + 'states 4 — the rider and d:energyCannonThreshold transcribe one block and must read one '
    + 'record');

  // (d) `training:militaryDrilling`'s `BASEFANTASTIC(U)` term, moved from the permanent-record
  // projection to the running record at the step's own rank (F245, on the user's ruling). The
  // step runs *before* `a:baseCopy`, so `deriveWithPatchedBase` cannot doctor its input — which
  // is the point: a gate that had gone on reading the projection would answer from a record
  // published two phases later, and the patch is what proves the read is not there. The card
  // states Apotheosis, whose `buffs:destiny` write is the only thing that used to close this
  // grant; the assertion is that it no longer does, and that patching Fantastic onto the copied
  // record does not close it either. Reverting the gate to `!!outlanderReform.militaryDrilling`
  // over a `!baseFantastic` reform field fails the first of these.
  const drillCard = over => baseUnitInput({ version: WARLORD, atk: 4, def: 1, res: 6, hp: 8,
    rtb: 0, rtbType: 'none', modernAttacks: {},
    abilities: { outlanderWizard: true, militaryDrilling: true }, ...over });
  const drilledApotheosis = derive(drillCard({
    abilities: { outlanderWizard: true, militaryDrilling: true, destiny: true } }));
  assertEqual(drilledApotheosis.abilities.discipline, 'overland',
    'training:militaryDrilling reads Fantastic at its own rank, where Destiny has not written it');
  const drilledBaseFantastic = derive(drillCard({ unitType: 'fantastic_nature' }));
  assertEqual(drilledBaseFantastic.abilities.discipline, undefined,
    'while a unit Fantastic in the record at that rank is still refused');
  // `deriveWithPatchedBase` is deliberately **not** used on this gate, and the reason is the
  // finding: the step runs at index 26 of the Warlord execution trace and `a:baseCopy` at 58, so
  // there is no `ctx.base` for it to read and no patch that could reach it. Patching `fantastic`
  // onto the published record halts the run outright, on the assertion that the copy agrees with
  // the loadout gate. The rank is asserted directly instead, because it is what makes the
  // permanent-record projection the wrong thing for this step to have read.
  const drillTrace = (drilledApotheosis.statExecutionTrace || []).map(entry => entry.id);
  const drillAt = drillTrace.indexOf('militaryDrilling');
  const copyAt = drillTrace.indexOf('baseCopy');
  assert(drillAt >= 0 && copyAt >= 0 && drillAt < copyAt,
    'training:militaryDrilling runs before a:baseCopy publishes the permanent record, so a gate '
    + 'reading that record would be reading a later phase');

  // (e) Eye of Heaven's gaze zeroing (F258.2). The gate is the top-level `enemyEyeOfHeaven` input
  // rather than an ability key, so `hidden_control_gating.js` and `derivation_equivalence.js` —
  // which vary ability keys and record fields — never move it, and these are the only assertions
  // over it in the suite (the blind spot itself is F259). The write is
  // `UnitCalc.CAS!IMMUNETOROT!+8..+11 "IF (HASCOMBATGLOBAL(W,CGEyeOfHeaven,2)>0) THEN {" "SETSTAT(U,SDoomGaze,0,0);"`, one block of region `d`, and it used to be applied at the
  // seed and again at the region-`e` floor. Both wrong ranks published the same finished number,
  // so the falsifiable statements are about the record `a:baseCopy` publishes, the step's rank,
  // and which engines the input reaches at all.
  const eyeInput = (version, over) => baseUnitInput({
    version, atk: 4, def: 3, res: 5, hp: 6, figs: 2,
    ...(version.startsWith('com2') ? { modernAttacks: {} } : { rtb: 0, rtbType: 'none' }),
    ...over });

  const eyeOn = derive(eyeInput(WARLORD, { abilities: { doomGaze: 4 }, enemyEyeOfHeaven: true }));
  assertEqual(eyeOn.baseDoomGaze, 4,
    'the permanent record a:baseCopy publishes carries the unzeroed Doom Gaze — region `a` copies '
    + 'the permanent record, which Eye of Heaven never touches');
  assertEqual(eyeOn.effectiveDoomGaze, 0, 'and the finished record still reads 0');
  const eyeChain = eyeOn.modifierTraces.doomGaze;
  assertEqual(eyeChain.base, 4, 'so the displayed chain starts at the strength the unit has');
  const eyeWrites = eyeChain.entries.filter(entry => !entry.boundary);
  assertEqual(eyeWrites.length, 1, 'and carries exactly one write, not one per wrong rank');
  assertEqual(eyeWrites[0].id, 'eyeOfHeaven:enemyGaze', 'which is Eye of Heaven\'s own step');
  assertEqual(eyeWrites[0].phase, 'd', 'at region d, where UnitCalc.CAS runs');
  assertEqual(eyeWrites[0].from, 4, 'reading the strength standing there');
  assertEqual(eyeWrites[0].to, 0, 'and zeroing it');
  // The rank inside `d`, over the whole run of blocks `UnitCalc.CAS` puts between the file's
  // Outlander section and Blaze of Glory — not the two endpoints alone. Asserting only the ends
  // let a manifest that moved Psycho Force past the Eye block pass (F258.2 review, finding 5).
  const eyeTrace = (eyeOn.statExecutionTrace || []).filter(entry => entry.phase === 'd')
    .map(entry => entry.id);
  const eyeBand = ['spiritLink', 'energyWeaponry', 'psychoForce', 'pneumaField',
    'energyCannonThreshold', 'eyeOfHeaven:enemyGaze', 'blazeOfGlory'];
  let previousRank = -1;
  eyeBand.forEach((id, position) => {
    const rank = eyeTrace.indexOf(id);
    assert(rank > previousRank, position === 0
      ? `region d runs ${id}, the head of the band UnitCalc.CAS puts before Blaze of Glory`
      : `region d runs ${id} after ${eyeBand[position - 1]}, which is UnitCalc.CAS line order`);
    previousRank = rank;
  });
  assert(eyeTrace.indexOf('shadowStrike:thrown') >= 0
    && eyeTrace.indexOf('shadowStrike:thrown') < eyeTrace.indexOf('spiritLink'),
    'and Shadow Strike ahead of that whole band');
  // The two sentinel writes the record has no field for, kept at resolution. Asked of a card that
  // actually states them: the Doom-only fixture above compares two absent values, and a strip
  // narrowed to `gazeDisabled && !!shapedGazeAbilities.doomGaze` passed it (F258.2 review,
  // finding 4).
  const eyeTouchOn = derive(eyeInput(WARLORD,
    { abilities: { stoningGaze: -2, deathGaze: -3 }, enemyEyeOfHeaven: true }));
  assertEqual(eyeTouchOn.abilities.stoningGaze, null,
    'SETSTAT(U,SStoningGaze,0,100) removes a stoning gaze the card states');
  assertEqual(eyeTouchOn.abilities.deathGaze, null,
    'and SETSTAT(U,SDeathGaze,0,100) a death gaze the card states, with no Doom Gaze in reach');
  const eyeTouchOff = derive(eyeInput(WARLORD,
    { abilities: { stoningGaze: -2, deathGaze: -3 } }));
  assertEqual(eyeTouchOff.abilities.stoningGaze, -2,
    'while without the enchantment the stoning gaze keeps its modifier');
  assertEqual(eyeTouchOff.abilities.deathGaze, -3, 'and the death gaze keeps its own');
  assertEqual(eyeOn.abilities.doomGaze, 0, 'and the published Doom Gaze agrees with the record');
  // The other arm, so none of the above passes on a build that zeroes unconditionally.
  const eyeOff = derive(eyeInput(WARLORD, { abilities: { doomGaze: 4 } }));
  assertEqual(eyeOff.effectiveDoomGaze, 4,
    'without the enchantment the Warlord Doom Gaze survives to the finished record');
  assertEqual(eyeOff.modifierTraces.doomGaze.entries.filter(e => !e.boundary).length, 0,
    'and its chain carries no write at all');
  // `SETSTAT(U,SDoomGaze,0,0)` is an assignment, not a floor, and the modern tail has no Doom
  // Gaze floor of its own. A negative Doom Gaze separates the two claims from every wrong
  // implementation that agrees with them on a positive one: `if (u.doomGaze > 0) u.doomGaze = 0`
  // in the step, and a restored modern `Math.max(0, u.doomGaze)` in region `e`, both passed the
  // suite without these (F258.2 review, findings 2 and 3). The value is reachable: `doomGaze` has
  // no `min`, so its control takes the default floor of -50 (`ui_abilities.js`).
  for (const version of ['com2_1.05.11', WARLORD]) {
    const negative = derive(eyeInput(version, { abilities: { doomGaze: -4 } }));
    assertEqual(negative.effectiveDoomGaze, -4,
      `${version}: region e floors no Doom Gaze field, so a negative one survives the tail`);
    assertEqual(negative.modifierTraces.doomGaze.entries.filter(e => !e.boundary).length, 0,
      'and the chain shows the tail making no write on it');
  }
  const negativeUnderEye = derive(eyeInput(WARLORD,
    { abilities: { doomGaze: -4 }, enemyEyeOfHeaven: true }));
  assertEqual(negativeUnderEye.effectiveDoomGaze, 0,
    'while the region-d write assigns 0 rather than flooring, so a negative Doom Gaze rises to 0');
  const negativeWrites = negativeUnderEye.modifierTraces.doomGaze.entries
    .filter(entry => !entry.boundary);
  assertEqual(negativeWrites.length, 1, 'in one write');
  assertEqual(negativeWrites[0].id, 'eyeOfHeaven:enemyGaze', 'which is the step');
  assertEqual(negativeWrites[0].from, -4, 'from the negative value');
  assertEqual(negativeWrites[0].to, 0, 'to exactly zero');
  // The region-`e` floor no longer touches the modern Doom Gaze field, so a grant made after the
  // seed must still reach the finished record: `c:blazingEyes` writes 3 onto a unit whose card
  // states none, and the floor used to be what re-published it.
  const blazingCard = { abilities: { blazingEyes: true }, unitType: 'fantastic_chaos' };
  const blazing = derive(eyeInput(WARLORD, blazingCard));
  assertEqual(blazing.effectiveDoomGaze, 3,
    'c:blazingEyes still reaches the finished record with the modern arm of the region-e floor gone');
  // ...and the step, running one region later, still takes that grant away — which the seed
  // placement could not have done, the grant not existing when the seed was written.
  const blazingUnderEye = derive(eyeInput(WARLORD,
    { ...blazingCard, enemyEyeOfHeaven: true }));
  assertEqual(blazingUnderEye.effectiveDoomGaze, 0,
    'while d:eyeOfHeaven:enemyGaze, one region after c:blazingEyes, still zeroes what it granted');

  // `CGEyeOfHeaven` is a Warlord combat global implemented in a script, and the other four engines
  // have no such enchantment — the three DOS builds have no script system at all. So the input
  // must move nothing in any of them, which is the invariant behind F244.3i's sixteen cases: they
  // were DOS runs in which the seed's zeroing opened the Chaos Channels breath conversion.
  const eyeDigest = (version, over) => {
    const result = derive(eyeInput(version, over));
    return JSON.stringify([result.rtb, result.rtbType, result.thrownType, result.gaze,
      result.effectiveGazeRanged, result.effectiveDoomGaze, result.baseDoomGaze,
      result.abilities.stoningGaze, result.abilities.deathGaze, result.abilities.doomGaze,
      result.modernAttacks ? JSON.stringify(result.modernAttacks) : null]);
  };
  // The shared byte's type has to vary: a record already typed as a gaze refuses the Chaos
  // Channels conversion whatever the Doom Gaze field says, so a grid that only ever states
  // `gaze_multiple` would assert the sixteen cases' shape without building it.
  const dosSlots = [{ rtb: 0, rtbType: 'none' }, { rtb: 2, rtbType: 'gaze_multiple' },
    { rtb: 1, rtbType: 'gaze_stoning' }, { rtb: 3, rtbType: 'thrown' }];
  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11']) {
    const slots = version.startsWith('com2') ? [{ modernAttacks: {} }] : dosSlots;
    for (const shared of slots) {
      for (const abilities of [{ doomGaze: 4 }, { doomGaze: 4, ccFireBreath: true },
        { stoningGaze: -2, deathGaze: -2 }, { ccFireBreath: true }]) {
        assertEqual(eyeDigest(version, { ...shared, abilities, enemyEyeOfHeaven: true }),
          eyeDigest(version, { ...shared, abilities }),
          `enemyEyeOfHeaven moves nothing in ${version}, which has no Eye of Heaven to model`);
      }
    }
  }
  // F244.3i's sixteen cases by name, so the shape is asserted rather than merely covered by the
  // grid: a DOS unit with a Doom Gaze, Chaos Channels and an untyped shared byte. The seed's
  // zeroing made `ctx.base.doomGaze` 0, `ccDosBreathEligibleAt` admitted the conversion, and the
  // byte became Fire Breath. The permanent record carries the gaze now, so it is refused.
  for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
    const ccDoom = derive(eyeInput(version, { rtb: 0, rtbType: 'none',
      abilities: { doomGaze: 4, ccFireBreath: true }, enemyEyeOfHeaven: true }));
    assertEqual(ccDoom.thrownType, 'none',
      `${version}: an Eye-of-Heaven'd Doom Gaze unit takes no Chaos Channels breath, the `
      + 'permanent record the copy published carrying the gaze');
    assertEqual(ccDoom.rtb, 0, 'and the shared byte keeps the strength it had');
  }
}

module.exports = { runAbilityOriginChecks };
