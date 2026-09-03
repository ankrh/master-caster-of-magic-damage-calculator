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
// `ABILITY_DEFS` and `ENCHANTMENT_DEFS`, the keys the seven pre-sequence transforms write, and the
// four record-field lists in `stats_identity.js`. The transform-write list is the one part that
// cannot be read off a data structure — the transforms write object literals — so it is stated
// below and checked against the transforms by running them.
//
// `abilityVersionGated` (`ui_abilities.js`) is the single home for "does this control exist in this
// version". That source is `data-scope="page"`, but its top level is declarations only, so it loads
// without a DOM — the same reason `hidden_control_gating.js` reads it.

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { repoRoot } = require('../calculator_sources');
const { assert, assertEqual, assertSameKeyList, baseUnitInput } = require('./assertions');

// The keys each pre-sequence transform writes into the ability map. Stated here because the writes
// are object literals inside the transforms; `runTransformWriteChecks` below runs each transform
// against an input that turns its grants on and asserts the produced key set matches, so a grant
// added to a transform without a row here fails rather than passing unclassified.
const TRANSFORM_WRITES = {
  golemShaping: ['elemArmor'],
  markIntrinsicLucky: ['luckyPhaseA'],
  applyLavaSmelterGrant: ['weaponImmunity', 'missileImmunity', 'resistElements', 'elementalArmor',
    'fieryBlade'],
  applySanctaBasilicaGrant: ['sanctify', 'lucky', 'luckyPhaseBase', 'magicImmunity'],
  applyPillarOfFaithGrant: ['lucky', 'luckyPhaseBase'],
  deriveMarionettePackage: ['transmuteEquipment', 'rebuild', 'sage', 'mechanicalMaster',
    'ritualMaster', 'charmed', 'arcaneWard', 'spellLock', 'forester', 'mountaineer',
    'poisonImmunity', 'stoningImmunity', 'largeShield', 'missileImmunity', 'resistMagic',
    'firstStrike', 'fireImmunity', 'lightningResist', 'healer', 'illusionImmunity', 'lucky',
    'luckyPhaseB', 'coldImmunity', 'deathImmunity', 'weaponImmunity', 'poison', 'stoningTouch',
    'counterImmunity', 'illusion', 'wallCrusher', 'armorPiercing', 'exorcise', 'bless',
    'bloodSucker', 'createUndead', 'regeneration', 'invisibility', 'destruction', 'healingAura',
    'lifeSteal'],
  applyOutlanderReformGrants: ['armorclad', 'powerEngine', 'haste', 'temporalGravityDrive',
    'flying', 'illusionImmunity', 'energyWeaponry', 'psychoForce', 'pneumaField', 'resistMagic',
    'discipline'],
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
  lavaSmelter: [['Calculator/stats_identity.js', 'abilities.lavaSmelter']],
  // Identity metadata mirrored into the ability map; the identity record is its home.
  baseFantastic: [['Calculator/combat_abilities.js', 'abilities.baseFantastic'],
    ['Calculator/combat_effects.js', 'abilities.baseFantastic']],
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

function loadUiDefs(ctx) {
  if (!vm.runInContext('typeof abilityUiDefs === "function"', ctx)) {
    vm.runInContext(
      fs.readFileSync(path.join(repoRoot, 'Calculator', 'ui_abilities.js'), 'utf8'),
      ctx, { filename: 'Calculator/ui_abilities.js' });
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
  const identity = { heroTypeId: 48, isHero: false, baseRace: 'High Men', specialUnit: null };
  const marionetteInput = {
    channeler: true, marionettePrimary: 'nature', marionetteAscension: true,
    marionetteNatureBooks: 13, marionetteSorceryBooks: 13, marionetteChaosBooks: 13,
    marionetteLifeBooks: 13, marionetteDeathBooks: 13,
  };
  const outlanderInput = {
    outlanderWizard: true, mechanical: true, armorcladReform: true, heatPowerEngine: true,
    temporalEngineering: true, sailing: true, magitekEngineering: true, magitekScience: true,
    militaryDrilling: true, energyBeamWeapons: true, psychoConverter: true, pneumaReactor: true,
    xenopsychology: true, radio: true, xenoveterinary: true, ballisticsTraining: true,
  };
  const cases = [
    ['markIntrinsicLucky', { lucky: true }, abil => read('markIntrinsicLucky')(abil)],
    ['applyLavaSmelterGrant', {
      lavaSmelterWeaponImmunity: true, lavaSmelterMissileImmunity: true,
      lavaSmelterResistElements: true, lavaSmelterElementalArmor: true, lavaSmelterFieryBlade: true,
    }, abil => read('applyLavaSmelterGrant')(abil, WARLORD, 'normal')],
    ['applySanctaBasilicaGrant', { sanctaBasilica: true, clergy: true },
      abil => read('applySanctaBasilicaGrant')(abil, WARLORD, 'normal', 'High Men', 'High Men Crusaders')],
    ['applyPillarOfFaithGrant', { pillarOfFaithLucky: true },
      abil => read('applyPillarOfFaithGrant')(abil, WARLORD)],
    ['applyOutlanderReformGrants', outlanderInput,
      abil => read('applyOutlanderReformGrants')(abil, WARLORD, false, false).abilities],
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
  // The Marionette package's branches are mutually exclusive — strayed against owned, and one
  // primary realm per ascension — so its classified key set is the union over them, not one run.
  const marionetteWritten = new Set();
  const marionetteRuns = [{ ...marionetteInput, channeler: false }];
  for (const primary of ['nature', 'sorcery', 'chaos', 'life', 'death']) {
    marionetteRuns.push({ ...marionetteInput, marionettePrimary: primary });
  }
  for (const input of marionetteRuns) {
    const after = read('deriveMarionettePackage')(identity, input, WARLORD).abilities;
    for (const key of Object.keys(after)) if (after[key] !== input[key]) marionetteWritten.add(key);
  }
  assertSameKeyList([...marionetteWritten].sort(),
    [...TRANSFORM_WRITES.deriveMarionettePackage].sort(),
    'deriveMarionettePackage writes exactly the ability keys the origin table classifies for it, '
    + 'unioned over its strayed, owned and five ascension branches');

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
  const controlKeys = new Set();
  const controlsByKey = new Map();
  for (const def of read('abilityUiDefs')()) {
    const key = def.calcKey;
    controlKeys.add(def.key);
    controlsByKey.set(def.key, key);
    if (!controlVersions.has(key)) controlVersions.set(key, new Set());
    for (const version of versions) if (!gated(def, version)) controlVersions.get(key).add(version);
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
  for (const [key, rows] of Object.entries(table)) {
    const visible = controlVersions.get(key);
    const templateRow = rows.find(row => row.origin === 'template');
    if (templateRow) {
      assert(!!visible, `${key}: a template row belongs to a key some control names`);
      if (visible) {
        assertSameKeyList([...templateRow.versions].sort(), [...visible].sort(),
          `${key}: the template row covers exactly the versions a control offers the key in`);
      }
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
}

module.exports = { runAbilityOriginChecks };
