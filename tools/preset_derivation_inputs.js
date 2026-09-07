'use strict';

// The headless half of F260.8's equivalence gate: every preset turned into a `deriveUnitStats`
// input **in Node**, through `presetToCardState` -> `cardStateToDerivationInput` and nothing else.
//
// The browser half is `tests/preset-equivalence-gate-f260.8.spec.js`, which walks the same corpus
// in the same order through `applyPreset` and projects the card the page ends up holding. The two
// are compared field by field. That comparison is the whole point of the item: F260.9 evaluates
// the corpus in Node and F260.10 makes that evaluation the numeric authority, and neither may take
// that authority until the Node path is known to state the same unit the page states.
//
// Why the comparison is not the one `tests/preset-applier-f260.6.spec.js` already makes: that spec
// runs *both* paths inside the page, so it compares the pure applier against itself plus the
// control writer. What it cannot see is anything that differs between the two **realms** — a core
// source that reaches a page-scope symbol (the `modernAttackRecord` ReferenceError F260.1 found is
// exactly this class), the fresh-page state Node has to model rather than read, the TEST_TREE
// version map, and the roster the page reads through its own cache. Those are what this file
// supplies and what the spec measures.
//
// Nothing here evaluates a preset: it builds derivation *inputs*. Equal inputs give equal numbers
// by construction, and equal numbers can hide two wrong inputs that happen to derive the same, so
// the input is what the gate compares.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  loadPresetContext, repoRoot, defaultSelectedVersion,
} = require('./calculator_sources');

// --- The one field walk, shared by both realms ----------------------------------------------
//
// Held as source text so the spec can inject the identical function into the page: a second
// implementation on the browser side could normalise a value differently and turn a real
// divergence into a match. `undefined`, a non-finite number and an empty object each get a
// sentinel, because `JSON.stringify` renders the first two as `undefined` (dropping the field
// entirely) and the third as a value no leaf can otherwise produce.
const FIELD_WALK_SOURCE = `function flattenFields(value, prefix, out) {
  out = out || {};
  prefix = prefix || '';
  if (value === undefined) { out[prefix] = '\\u0000undefined'; return out; }
  if (value === null || typeof value !== 'object') {
    out[prefix] = (typeof value === 'number' && !Number.isFinite(value))
      ? '\\u0000' + String(value)
      : JSON.stringify(value);
    return out;
  }
  if (typeof value === 'function') { out[prefix] = '\\u0000function'; return out; }
  if (Array.isArray(value)) {
    if (!value.length) out[prefix] = '\\u0000[]';
    for (let i = 0; i < value.length; i++) {
      flattenFields(value[i], prefix + '[' + i + ']', out);
    }
    return out;
  }
  const keys = Object.keys(value).sort();
  if (!keys.length) out[prefix] = '\\u0000{}';
  for (const key of keys) {
    flattenFields(value[key], prefix ? prefix + '.' + key : key, out);
  }
  return out;
}`;

const flattenFields = new Function(`${FIELD_WALK_SOURCE}; return flattenFields;`)();

// --- What the page starts from -------------------------------------------------------------

// The `<option>` values a card select offers, read from `index.html` for the same reason. Used
// only by the synthetic fixtures below, which have to state a value the control can hold.
function selectOptions(controlId) {
  const html = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
  const select = new RegExp(`<select[^>]*\\bid="${controlId}"[^>]*>([\\s\\S]*?)</select>`)
    .exec(html);
  if (!select) {
    throw new Error(`selectOptions: index.html has no <select id="${controlId}">, so this build `
      + 'offers no vocabulary for the field it holds.');
  }
  const values = [...select[1].matchAll(/<option value="([^"]*)"/g)].map(m => m[1]);
  if (!values.length) {
    throw new Error(`selectOptions: <select id="${controlId}"> offers no <option value>.`);
  }
  return values;
}

// --- The synthetic fixtures ----------------------------------------------------------------
//
// The lesson this item has already paid for twice: **a suite that takes its values from the
// shipped data compares a default against a default.** `chaosConjunction` was compared `false` to
// `false` 1,161 times (F260.6 probe M9), and `hitMelee` plus sixteen ability keys are moved off
// their default by no roster record and no shipped fixture at all (F260.7's reviewer census). A
// corpus walk cannot speak for a field the corpus never varies, however many fixtures it has.
//
// So the gate does not only walk the corpus. It also states, per version, two fixtures that put
// **every** field a fixture can state at a non-default value, and runs them through both paths
// beside the corpus. `censusUnvariedFields` below is what proves the cover is real: it reports
// every card-state and globals field that holds one single value across everything the gate
// applies, and the spec asserts that set is empty apart from the fields named — and explained —
// in `UNSTATEABLE_FIELDS`.
//
// Values come from the defs and from `index.html`'s own option lists, never from a list written
// here: a vocabulary restated in this file would drift from the control it claims to describe.

// Fields a custom fixture cannot state, with the reason each one is out of reach. Anything else
// the census reports is a hole, not an exemption.
const UNSTATEABLE_FIELDS = {
  // Constant by construction rather than uncovered: `cardStateModernSpecialMirror` sets `on` only
  // for a `numcheck` def, and Doom Gaze and Poison Touch are `num`. There is no value of any
  // control that makes either anything but `null`.
  'a.modernSpecial.doomGaze.on': 'a `num` def has no tick, so the mirror states `on: null`',
  'b.modernSpecial.doomGaze.on': 'a `num` def has no tick, so the mirror states `on: null`',
  'a.modernSpecial.poison.on': 'a `num` def has no tick, so the mirror states `on: null`',
  'b.modernSpecial.poison.on': 'a `num` def has no tick, so the mirror states `on: null`',
};

// The value a saturating fixture states for one ability def. Driven off the def's own `type` and
// `options`, so a def added to `abilities.js`/`enchantments.js` is covered without a line here.
// `phase` is the def's own index plus which fixture and which side is being built, so two defs
// never take the same value in the same case and never the same sequence across cases. Giving
// every boolean `true` at once was not enough: the GPT review of F260.8 showed that a writer
// sending one ability row's value to *another* row survives a gate whose fields all move together,
// because `magitekScience` and `xenopsychology` then hold the same value in all 1,171 cases. Two
// observed values per field is necessary and not sufficient — what the comparison needs is that no
// two fields carry the same vector of values.
const SYNTHETIC_VARIANTS = 9;

const ABILITY_VALUE_SOURCE = `function syntheticAbilityValue(def, index, side, variant) {
  // Each (def, side) pair gets its own binary code, one bit per variant fixture, so that no two
  // ability rows and no two sides ever carry the same **vector of values** across the cases the
  // gate applies. Varying each field is not enough on its own: the GPT review of F260.8 showed
  // that a writer sending one row's value to another row survives a gate where the two always move
  // together, and a version-gated row is only free to move in the version that offers it — with
  // two fixtures per version, the Warlord-only rows collided in pairs.
  //
  // The code is 2 * index + side + 1, which is 1..422 for this build's defs. Never zero, so every
  // row is stated somewhere; always below 511, so every row is also cleared somewhere; and
  // injective in (index, side), so two rows can only share a vector if a *version gate* clears
  // both everywhere they differ. \${SYNTHETIC_VARIANTS} variants is what makes 422 codes fit.
  const code = 2 * index + side + 1;
  const bit = (code >>> variant) & 1;
  if (def.type === 'bool') return bit === 1;
  // Two distinct values is all the vector needs, and the smallest pair is much the cheapest: these
  // fixtures state every rider at once and the page resolves the whole combat for each of them,
  // where a strength of 5 on every numeric ability costs minutes rather than milliseconds.
  if (def.type === 'num') return bit === 1 ? 2 : 1;
  if (def.type === 'numcheck') return bit === 1 ? 1 : null;
  if (def.type === 'select') {
    const options = (def.options || []).map(option => option[0]);
    if (!options.length) {
      throw new Error('syntheticAbilityValue: select def ' + def.key + ' states no options.');
    }
    return options[(bit === 1 ? 1 : 0) % options.length];
  }
  throw new Error('syntheticAbilityValue: def ' + def.key + ' has control type '
    + JSON.stringify(def.type) + ', which this generator has no value for. A new control type '
    + 'needs a non-default value here, or the gate silently stops varying it.');
}`;

// Build the fixtures inside the calculator context, because everything they state comes from the
// build's own defs: the ability list, the DOS shared-slot vocabulary, the modern projectile list
// and the special-unit definitions.
function syntheticFixtures(context) {
  const vocabularies = {
    level: selectOptions('aLevel'),
    weapon: selectOptions('aWeapon'),
    armor: selectOptions('aArmor'),
    cityWalls: selectOptions('aCityWalls'),
    rtbType: selectOptions('aRtbType'),
    modernRangedType: selectOptions('aModernRangedType'),
    nodeAura: selectOptions('nodeAura'),
    baseRace: selectOptions('aBaseRace'),
  };
  return runInContext(context, `((vocabularies, variantCount) => {
    ${ABILITY_VALUE_SOURCE}
    // A value the control offers and an unstated field does not take.
    const other = (values, variant) => values[(1 + variant) % values.length];
    const fixtures = {};
    const variantList = [];
    for (let v = 0; v < variantCount; v++) variantList.push(v);
    const codeCeiling = 2 * abilityUiDefs().length + 1;
    if (codeCeiling >= (1 << variantCount) - 1) {
      throw new Error('syntheticFixtures: ' + abilityUiDefs().length + ' ability defs need more '
        + 'than ' + variantCount + ' variant fixtures per version for every row to carry its own '
        + 'vector of values. Raise SYNTHETIC_VARIANTS.');
    }
    const versions = Object.keys(VERSION_DATA);
    for (const version of versions) {
      const modern = cardStateIsModernVersion(version);
      for (const variant of variantList) {
        const abilitiesFor = side => {
          const values = {};
          abilityUiDefs().forEach((def, index) => {
            values[def.key] = syntheticAbilityValue(def, index, side, variant);
          });
          return values;
        };
        const special = SPECIAL_UNIT_DEFS
          .filter(def => def.key !== 'none' && specialUnitAllowed(version, def.key, 'gate probe'))
          .map(def => def.key);
        const side = index => {
          const v = variant + index;
          // One rotation of the same sequence per field, keyed by a seed the field owns. Fields
          // that shared a constant offset shared a whole vector across the gate — measured, and
          // it is the same hazard as two ability rows moving together: a writer that sends one
          // card field to another control cannot be seen where the two always agree.
          const num = seed => 1 + ((variant * 5 + seed * 3 + index * 7) % 17);
          // The attack sizes are kept small on purpose. These fixtures state every ability at
          // once, and the page applies them through applyPreset, which recalculates: with 8
          // figures, 40 hit points and 17-dice channels the whole synthetic leg does not finish.
          // What the gate reads is the derivation *input*, so the size of the numbers is free —
          // only that each field carries its own sequence of them is not.
          const small = seed => 1 + ((variant * 5 + seed * 3 + index * 7) % 5);
          const record = modern ? {
            hitChance: 20 + num(1), hitMelee: num(2), hitRanged: num(3),
            hitThrown: num(4), hitBreath: num(5),
            modernAttacks: {
              // A conventional ranged attack, so a stated ranged mode survives the withdrawal
              // and the ranged-mode tick is compared as true rather than as the false it
              // withdraws to.
              ranged: { strength: small(6), type: other(vocabularies.modernRangedType, v) },
              thrown: { strength: small(7) },
              fireBreath: { strength: small(8) },
              lightningBreath: { strength: small(9) },
            },
          } : {
            toHitMod: num(10), toHitRtbMod: num(11),
            rtb: small(12),
            rtbType: other(vocabularies.rtbType.filter(t => t !== 'none'), v),
          };
          return Object.assign({
            figs: 1 + ((variant + index) % 2), atk: small(13), def: num(14), res: num(15),
            hp: 4 + ((variant * 3 + index) % 5), dmg: (variant + index) % 3, toBlkMod: num(17),
            weapon: other(vocabularies.weapon, v),
            armor: other(vocabularies.armor, v),
            cityWalls: other(vocabularies.cityWalls, v),
            abilities: abilitiesFor(index),
            identity: {
              isHero: v === 1,
              baseFantastic: v === 0,
              baseRace: other(vocabularies.baseRace.filter(r => r !== ''), v),
              specialUnit: special.length ? special[v % special.length] : 'none',
              name: 'Gate probe ' + version + ' ' + variant + ' ' + index,
            },
          }, record);
        };
        fixtures['__gate_' + version + '_' + variant] = {
          version,
          nodeAura: vocabularies.nodeAura[variant % vocabularies.nodeAura.length],
          wallOfFire: true,
          trueLight: variant % 2 === 0,
          darkness: variant % 3 === 1,
          chaosSurge: 1 + (variant % 4),
          warpReality: true,
          chaosConjunction: true,
          hurricane: true,
          poxHost: true,
          rangedCheck: true,
          rangedDist: 1 + (variant % 5),
          a: side(0),
          b: side(1),
        };
      }
    }
    // Two fixtures naming a roster unit on **side b**. Without them b.generic and
    // b.identity.heroTypeId hold one value across everything the gate applies — no shipped
    // fixture names a roster unit on the defender side — and the GPT review of F260.8 showed both
    // are then uncovered rather than unreachable: a writer that states generic only for side a,
    // or a collector that drops the defender's hero id, changes nothing the gate can see. A
    // Generic record supplies the flag, a hero record supplies the id.
    for (const version of versions) {
      const records = Object.values(VERSION_DATA[version]);
      const generic = records.find(unit => unit.category === 'Generic');
      const hero = records.find(unit => createRosterUnitIdentity(version, unit).isHero);
      for (const [label, unit] of [['generic', generic], ['hero', hero]]) {
        if (!unit) continue;
        fixtures['__gate_rosterb_' + label + '_' + version] = {
          version,
          bUnitName: unit.name,
          a: { figs: 3, atk: 5, def: 2, res: 4, hp: 6, dmg: 0, toBlkMod: 0 },
          b: {},
        };
      }
    }

    // Ranged mode is the one field a fixture cannot simply state: the ranged-mode assert halts
    // if the tick would not survive the page's own withdrawal, and whether it survives depends on
    // what the saturated ability set does to side a's *derived* Ranged strength — which differs by
    // version. So each fixture is applied here and the tick dropped where the withdrawal is what
    // the build does. The outcome is decided once, in Node, and the finished fixture is shipped to
    // the page as data, so both realms state exactly the same thing.
    for (const [name, fixture] of Object.entries(fixtures)) {
      try {
        presetToCardState(name, fixture, { origin: 'authored', version: fixture.version });
      } catch (err) {
        if (!String(err.message || err).includes('carries no conventional ranged attack')) throw err;
        delete fixture.rangedCheck;
        presetToCardState(name, fixture, { origin: 'authored', version: fixture.version });
      }
    }
    return fixtures;
  })(${JSON.stringify(vocabularies)}, ${SYNTHETIC_VARIANTS})`);
}

// --- The walk -------------------------------------------------------------------------------

function runInContext(context, expression) {
  return vm.runInContext(`(${expression})`, context, { filename: 'preset_derivation_inputs' });
}

// One pass over a list of preset names, chained the way the page chains them: a preset is applied
// over the card the previous one left, under the version the previous one selected. That is not a
// detail — `presetToCardState`'s `base` and `options.version` are what carry the version switch's
// loadout reset and the four fields no fixture restates, so a walk that restarted from the default
// state for each fixture would compare a different sequence from the one the browser runs.
//
// Returns, per preset, the two derivation inputs as flattened JSON. Strings rather than objects
// because the whole corpus is held at once and the spec compares chunk by chunk.
// `base` is the card the walk starts from. The caller states it, because Node cannot read it: a
// fresh page does **not** hold `presetDefaultCardState` — `resetCalculatorState` (`ui_state.js`)
// writes those defaults and then immediately runs `selectDefaultUnit`, so both sides start on a
// roster record (`DEFAULT_UNITS`: Hell Hounds and War Bears). `presetDefaultCardState`'s comment
// calling itself "the state a fresh page has" is wrong, and so is `presetToCardState`'s default
// for `base`. Handing the page's own starting card in is what makes the two walks comparable by
// construction rather than by the accident that the first fixture restates everything; whether the
// choice matters at all for the corpus is measured, in the gate's third test.
// `chain: false` applies every preset over the *starting* card instead of over the previous
// preset's finished one. That is the execution model an independent Node evaluator would have
// (F260.9 parallelises across cores), and it is not the model the page has — so the difference
// between the two walks is exactly what such an evaluator would get wrong. The gate measures it.
function presetDerivationInputs({ names, fixtures, base, chain = true } = {}) {
  const context = loadPresetContext();
  if (fixtures) {
    vm.runInContext(`Object.assign(PRESETS, ${JSON.stringify(fixtures)});`, context,
      { filename: 'preset_derivation_inputs fixtures' });
  }
  const order = names || Object.keys(runInContext(context, 'PRESETS'));
  const version = defaultSelectedVersion();
  const walked = runInContext(context, `((order, startVersion, walkSource, startBase, chained) => {
      const flattenFields = new Function(walkSource + '; return flattenFields;')();
      const presetVersions = presetVersionsFromTestTree(TEST_TREE);
      let version = startVersion;
      let base = startBase
        || { a: presetDefaultCardState('a', version), b: presetDefaultCardState('b', version) };
      const cases = {};
      // The finished states themselves, for the caller that writes them onto the page instead of
      // applying the fixture there (pageWriteWalk, in the gate spec).
      const states = {};
      for (const name of order) {
        const preset = PRESETS[name];
        if (!preset) {
          throw new Error('presetDerivationInputs: ' + JSON.stringify(name)
            + ' is not a key of PRESETS.');
        }
        const applied = presetToCardState(name, preset, {
          origin: 'authored', version, presetVersions, base,
        });
        states[name] = {
          version: applied.version,
          a: applied.a,
          b: applied.b,
          globals: applied.globals,
          rosterNames: { a: preset.aUnitName || null, b: preset.bUnitName || null },
        };
        cases[name] = {
          version: applied.version,
          a: JSON.stringify(flattenFields(
            cardStateToDerivationInput(applied.a, applied.globals))),
          b: JSON.stringify(flattenFields(
            cardStateToDerivationInput(applied.b, applied.globals))),
          state: JSON.stringify(flattenFields({
            a: applied.a, b: applied.b, globals: applied.globals })),
        };
        if (chained) {
          version = applied.version;
          base = { a: applied.a, b: applied.b };
        }
      }
      return { cases, states };
    })(${JSON.stringify(order)}, ${JSON.stringify(version)}, ${JSON.stringify(FIELD_WALK_SOURCE)},
      ${JSON.stringify(base || null)}, ${JSON.stringify(!!chain)})`);
  return { order, startVersion: version, cases: walked.cases, states: walked.states };
}

// Every card-state and globals field that holds a single value across everything the gate applies.
// A field in this list is one the comparison cannot speak for: both paths would agree on it while
// one of them never wrote it at all.
function censusUnvariedFields(cases) {
  const seen = new Map();
  for (const name of Object.keys(cases)) {
    const flat = JSON.parse(cases[name].state);
    for (const field of Object.keys(flat)) {
      let values = seen.get(field);
      if (!values) seen.set(field, (values = new Set()));
      if (values.size < 2) values.add(flat[field]);
    }
  }
  const unvaried = [];
  for (const [field, values] of seen) {
    // `prefix` names the side, which is the one field that is *meant* to be constant per side.
    if (field === 'a.prefix' || field === 'b.prefix' || field === 'globals.version') continue;
    if (values.size < 2) unvaried.push({ field, value: [...values][0] });
  }
  return unvaried.sort((x, y) => (x.field < y.field ? -1 : 1));
}

// Fields that move together everywhere the gate looks. Varying each field is not enough: two
// fields carrying the *same vector of values* across every case are indistinguishable, so a writer
// that sends one field's value to the other survives. That is the GPT review of F260.8, finding 2 —
// `magitekScience` and `xenopsychology` held the same value in all 1,171 cases, and aliasing them
// in the writer changed nothing the gate could see.
//
// Returns one entry per group of two or more fields sharing a vector, largest first. Some groups
// are structural — `abilities.X` and the modern block's mirror of it are the same number by
// construction — so the caller states which it accepts.
// A separator no encoded value can contain: every leaf is JSON, and JSON escapes newlines.
const SEPARATOR = String.fromCharCode(10);

function censusIdenticalFieldVectors(cases) {
  const names = Object.keys(cases);
  const columns = new Map();
  names.forEach((name, caseIndex) => {
    const flat = JSON.parse(cases[name].state);
    for (const field of Object.keys(flat)) {
      let column = columns.get(field);
      if (!column) columns.set(field, (column = new Array(names.length).fill('ABSENT')));
      column[caseIndex] = flat[field];
    }
  });
  const groups = new Map();
  for (const [field, column] of columns) {
    const key = column.join(SEPARATOR);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(field);
  }
  return [...groups.values()].filter(fields => fields.length > 1)
    .sort((x, y) => y.length - x.length);
}

// Why a group of fields may legitimately move together: they are the same control seen through
// different projections of the card state. A card state states one value for a control and then
// mirrors it — into the modern nine-value block, into the DOS flag byte, into the globals record
// for the two battlefield enchantments whose control sits on a panel — and a fixture addresses an
// ability and its enchantment twin by the one `key` they share, so those two rows cannot be given
// different values by a fixture at all. Every other group is a hole: two fields the gate can never
// tell apart, and a writer that swaps them survives.
const FIELD_IDENTITY_PATTERNS = [
  /^([ab])\.abilities\.enchantment_(.+)$/,
  /^([ab])\.abilities\.(.+)$/,
  /^([ab])\.modernSpecial\.(.+)\.(?:value|on)$/,
  /^([ab])\.dosSpecial\.flags\.(.+)$/,
  /^globals\.perSide\.([ab])\.(.+)$/,
];

function fieldControlIdentity(field) {
  for (const pattern of FIELD_IDENTITY_PATTERNS) {
    const match = pattern.exec(field);
    if (match) return `${match[1]}:${match[2]}`;
  }
  return null;
}

// `null` when the group is explained, otherwise the reason it is not.
function explainVectorGroup(fields, explainedConstants) {
  if (fields.every(field => explainedConstants[field])) return null;
  const identities = new Set(fields.map(fieldControlIdentity));
  if (identities.size === 1 && !identities.has(null)) return null;
  return 'these fields hold the same value in every case the gate applies, and they are not '
    + 'projections of one control, so nothing here can tell them apart';
}

module.exports = {
  FIELD_WALK_SOURCE, flattenFields, selectOptions,
  syntheticFixtures, presetDerivationInputs, censusUnvariedFields, UNSTATEABLE_FIELDS,
  loadPresetContext, runInPresetContext: runInContext, censusIdenticalFieldVectors,
  explainVectorGroup, fieldControlIdentity,
};
