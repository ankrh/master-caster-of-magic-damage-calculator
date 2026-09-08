'use strict';

// The card-state projection, exercised in the headless core context.
//
// `cardStateToDerivationInput` (`Calculator/card_state.js`) is `data-scope="core"`, but *loading*
// there is not the same as *running* there: until F260.2 the projection reached out to three
// page-scope symbols (`abilityUiDefs`, `MODERN_SPECIAL_FIELDS`, `modernAttackRecord`) and threw a
// bare `ReferenceError` on the modern versions, which no suite noticed because nothing called it
// outside a browser. This does call it — one hand-built card state, every version — so a symbol
// moving back into page scope fails here rather than in F260.9's preset evaluation.
//
// The state is built by hand rather than read from a card on purpose: the point is that the
// projection needs no DOM and no page collector.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { assert, assertEqual, evalInContext } = require('./assertions');
const { calculatorSources, repoRoot } = require('../calculator_sources');

// One state serving all five versions, which is only possible because the state carries no
// version and both engine families' fields are present (F260.1). The projection selects.
//
// `modernSpecialKeys` comes from the context's own `MODERN_SPECIAL_FIELDS` rather than a list
// spelled again here: the projection halts on a state missing an entry, so a hardcoded copy would
// be a second home for the same fact and would fail as a wrong test the day the real list grew.
function handBuiltCardState(prefix, modernSpecialKeys) {
  return {
    prefix,
    abilities: {},
    modernSpecial: Object.fromEntries(
      modernSpecialKeys.map(key => [key, { on: false, value: 0 }])),
    dosSpecial: { magnitude: 0, flags: {} },
    level: 'normal', weapon: 'normal', armor: 'normal',
    figs: 6, atk: 6, rtb: 0, def: 4, res: 6, hp: 4, dmg: 0,
    toBlkMod: 70, cityWalls: 'none', rtbType: 'none',
    modernAttacks: {
      ranged: 0, rangedType: 'none', thrown: 0, fireBreath: 0, lightningBreath: 0,
    },
    toHitMod: 0, toHitRtbMod: 0,
    hitChance: 30, hitMelee: 0, hitRanged: 0, hitThrown: 0, hitBreath: 0,
    identity: {
      templateId: null, heroTypeId: null,
      isHero: false, baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
    },
    generic: false,
  };
}

function handBuiltGlobals(version) {
  return {
    version,
    nodeAura: 'none', wallOfFire: false, trueLight: false, darkness: false, chaosSurge: 0,
    rangedCheck: false, rangedDist: 1, warpReality: false, chaosConjunction: false,
    hurricane: false, poxHost: false,
    perSide: {
      a: { eternalNight: false, eyeOfHeaven: false },
      b: { eternalNight: false, eyeOfHeaven: false },
    },
  };
}

// --- The matrix's roster row is the card's roster statement (F269.2) ---
//
// `buildMatrixUnitStats` (`ui_matrix.js`) used to hand-assemble a third derivation input from the
// roster record and the matrix's own property state. It never applied the DOS shared
// `spec_att_attrib` byte and never gated the innate ability rows, so **53 roster records computed
// a different unit in the matrix than on the card** — MoM 1.31 Wraiths with Life Steal 0 against
// the card's -3, Great Wyrm with Poison Touch 1 against 15, CoM2 ships carrying a Warlord-only
// Sailing row. It now composes `applyRosterUnit` -> the matrix's own settings ->
// `applyVersionGating` -> `cardStateToDerivationInput`, and this is what holds it there.
//
// The claim is matrix-reader-only, so it cannot be a preset fixture: a preset states a card, and
// the card was never the side that was wrong. It runs inside this family rather than in a suite of
// its own because this family already owns the projection.
//
// **What it compares against is not a second copy of the matrix's own composition.**
// `presetToCardState` (`card_state.js`) reaches a roster card by a different route — clear, unit,
// enchantment overlay, loadout reset, identity, gating, ranged-mode withdrawal — and
// `tests/preset-equivalence-gate.spec.js` ties that route to the real page's own finished card: it
// walks the corpus through `presetToCardState` in Node and through the controls in the page and
// requires the two derivation inputs equal. The chain asserted here is therefore
// matrix == preset applier == page card.
//
// It compares the projected **derivation input**, not the derived stats: `deriveUnitStats` is a
// pure function of it, so equal inputs are the stronger statement and cost one derivation rather
// than two. The named records below take the whole `buildMatrixUnitStats` call as well, which is
// what witnesses that the reader wires its own two halves together.

// The stub DOM the two matrix page sources need. They read exactly one element — the version
// select — plus the drawer state, which is set to "no rows" so every side setting and global falls
// to its own default: the matrix a user who has added no property row sees.
function matrixReaderContext() {
  const state = { version: null };
  const context = {
    console,
    document: {
      getElementById: id => (id === 'gameVersion'
        ? { value: state.version, selectedOptions: [{ textContent: state.version }] } : null),
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    localStorage: { getItem: () => null, setItem: () => {} },
  };
  vm.createContext(context);
  const run = file => vm.runInContext(
    fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8'), context, { filename: file });
  for (const file of calculatorSources().core) run(file);
  for (const file of ['Calculator/ui_matrix_properties.js', 'Calculator/ui_matrix.js']) {
    if (!calculatorSources().page.includes(file)) {
      throw new Error(`matrixReaderContext: ${file} is no longer a data-scope="page" source in `
        + 'index.html; the matrix reader this check loads has moved.');
    }
    run(file);
  }
  vm.runInContext('matrixPropertyState = { a: [], b: [], global: [], _seeded: true };', context);
  vm.runInContext("activeMatrixMode = 'melee';", context);
  return { context, state };
}

// The records whose unit the old reader got wrong, one per mechanism, named so a regression says
// which one came back rather than only that a count moved.
const F269_2_WITNESS_RECORDS = [
  ['mom_1.31', 'Wraiths', 'lifeSteal', -3],
  ['mom_1.31', 'Great Wyrm', 'poison', 15],
  ['mom_1.31', 'Cockatrices', 'stoningTouch', -3],
  ['mom_1.31', 'Basilisk', 'stoningGaze', -1],
  ['mom_1.31', 'Arch Angel', 'holyBonus', 2],
  ['mom_1.31', 'Unicorns', 'resistanceToAll', 2],
  ['com_6.08', 'Necromancer', 'lifeSteal', -3],
  ['com_6.08', 'Night Stalker', 'deathGaze', -3],
  ['com2_1.05.11', 'Trireme', 'sailing', false],
];

function firstDifferingFields(a, b) {
  const differing = [];
  const walk = (x, y, prefix) => {
    for (const key of new Set([...Object.keys(x || {}), ...Object.keys(y || {})])) {
      const vx = (x || {})[key];
      const vy = (y || {})[key];
      if (JSON.stringify(vx) === JSON.stringify(vy)) continue;
      if (vx && vy && typeof vx === 'object' && typeof vy === 'object' && !Array.isArray(vx)) {
        walk(vx, vy, `${prefix}${key}.`);
      } else {
        differing.push(`${prefix}${key}: matrix ${JSON.stringify(vx)} vs card ${JSON.stringify(vy)}`);
      }
    }
  };
  walk(a, b, '');
  return differing;
}

// The enchantment overlay's own case. The sweep above runs with an empty drawer, which never
// exercises the shape the rows arrive in — and that shape is exactly where the old reader lost the
// innate half: `enchantment_holyBonus` is a *different control* from the record's own `holyBonus`,
// and a map keyed by `calcKey` would overwrite one with the other instead of letting the two
// contend at the derivation boundary (F252.1). Five rows, chosen for the distinctions that can be
// lost: a plain bool, a numeric enchantment whose `uiKey` differs from its `calcKey` and whose
// calc key a DOS roster record also states, a select, a Warlord-only row, and one half of a
// Warlord rename pair. The gated ones stay in the list on purpose — the matrix reader refuses them
// and `applyVersionGating` clears them, and the two must land in the same place.
//
// The preset side names the def's `key`, which is what a fixture states; the matrix side names its
// `uiKey`, which is what a drawer row states. That they are different strings for the same control
// is the point.
// `elemArmor` is the sixth for a different reason: it is the one enchantment control an *identity*
// owns rather than the user (`specialUnitDerivesResistElements`), and the card rewrites it after
// the abilities are written. A drawer row naming Elemental Armor on a Golem row must therefore lose
// to the identity, exactly as a fixture's does. The GPT review of F269.2 found the matrix keeping
// the row's value here; `deriveUnitStats` corrected it, so no number moved and no fixture could
// have caught it — the input comparison is what does.
const F269_2_ENCHANTMENT_ROWS = [
  { uiKey: 'haste', presetKey: 'haste', value: true },
  { uiKey: 'enchantment_holyBonus', presetKey: 'holyBonus', value: 2 },
  { uiKey: 'realmWard', presetKey: 'realmWard', value: 'death' },
  { uiKey: 'planewalking', presetKey: 'planewalking', value: true },
  { uiKey: 'apotheosis', presetKey: 'apotheosis', value: true },
  { uiKey: 'elemArmor', presetKey: 'elemArmor', value: 'elementalArmor' },
];

// The versions whose Golem identity derives Resist Elements, and the record it belongs to. Named so
// the stride pass cannot silently stop reaching the case: the stride visits every 25th record and
// Golem is not guaranteed to be one of them.
const F269_2_GOLEM_VERSIONS = ['com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.9'];

function runMatrixRosterParityChecks() {
  const { context, state } = matrixReaderContext();
  const read = expression => evalInContext(context, expression);
  const buildMatrixUnitStats = read('buildMatrixUnitStats');
  const matrixInput = read(`(function (prefix, unit, version) {
    return cardStateToDerivationInput(
      matrixRosterCardState(prefix, unit, matrixEnchantmentRows(prefix), version),
      matrixGlobalsForSide(prefix, 'melee', version));
  })`);
  const cardInput = read(`(function (unitName, version) {
    const applied = presetToCardState('the matrix roster parity probe',
      { version, aUnitName: unitName }, {});
    return cardStateToDerivationInput(applied.a, applied.globals);
  })`);
  const versionData = read('VERSION_DATA');

  let compared = 0;
  for (const version of read('ENGINE_VERSIONS')) {
    state.version = version;
    for (const unit of Object.values(versionData[version])) {
      const fromMatrix = matrixInput('a', unit, version);
      const fromCard = cardInput(unit.name, version);
      if (JSON.stringify(fromMatrix) !== JSON.stringify(fromCard)) {
        // Name the differing fields: the input carries ~200 keys and two JSON blobs say nothing a
        // reader can act on.
        throw new Error(`${version} roster record '${unit.name}': the matrix states a different `
          + `unit than the card — ${firstDifferingFields(fromMatrix, fromCard).join('; ')}`);
      }
      compared += 1;
    }
  }
  assert(compared > 1000,
    'every roster record of every version is stated identically by the matrix and by the card '
    + `(${compared} records)`);

  // The enchantment overlay, on a stride through each version's roster. The drawer rows and the
  // fixture's abilities state the same five controls, so the two paths must still agree.
  vm.runInContext('matrixPropertyState = ' + JSON.stringify({
    a: F269_2_ENCHANTMENT_ROWS.map(row => ({ key: row.uiKey, enabled: true, value: row.value })),
    b: [], global: [], _seeded: true,
  }) + ';', context);
  const presetAbilities = Object.fromEntries(
    F269_2_ENCHANTMENT_ROWS.map(row => [row.presetKey, row.value]));
  const cardInputWithEnchantments = read(`(function (unitName, version, abilities) {
    const applied = presetToCardState('the matrix roster parity probe',
      { version, aUnitName: unitName, a: { abilities } }, {});
    return cardStateToDerivationInput(applied.a, applied.globals);
  })`);
  let overlaid = 0;
  for (const version of read('ENGINE_VERSIONS')) {
    state.version = version;
    const records = Object.values(versionData[version]);
    for (let index = 0; index < records.length; index += 25) {
      const unit = records[index];
      const fromMatrix = matrixInput('a', unit, version);
      const fromCard = cardInputWithEnchantments(unit.name, version, presetAbilities);
      if (JSON.stringify(fromMatrix) !== JSON.stringify(fromCard)) {
        throw new Error(`${version} roster record '${unit.name}' under the matrix's enchantment `
          + `rows: the matrix states a different unit than the card — `
          + firstDifferingFields(fromMatrix, fromCard).join('; '));
      }
      overlaid += 1;
    }
  }
  // Golem by name, on top of the stride: the identity-owned `elemArmor` must survive a drawer row
  // that names it, in every version whose Golem derives it.
  for (const version of F269_2_GOLEM_VERSIONS) {
    state.version = version;
    const golem = Object.values(versionData[version])
      .find(record => read('rosterCardIdentity')(record, version).specialUnit === 'golem');
    assert(!!golem, `${version} ships the Golem roster record this check names`);
    const fromMatrix = matrixInput('a', golem, version);
    assertEqual(fromMatrix.markedAbilities.elemArmor, 'resistElements',
      `${version} Golem: the identity's Resist Elements survives a matrix Elemental Armor row`);
    if (JSON.stringify(fromMatrix) !== JSON.stringify(cardInputWithEnchantments(
      golem.name, version, presetAbilities))) {
      throw new Error(`${version} Golem under the matrix's enchantment rows: the matrix states a `
        + `different unit than the card — ` + firstDifferingFields(fromMatrix,
          cardInputWithEnchantments(golem.name, version, presetAbilities)).join('; '));
    }
    overlaid += 1;
  }
  assert(overlaid > 40,
    'the matrix\'s enchantment rows overlay a roster card the way a fixture\'s abilities do '
    + `(${overlaid} records)`);
  vm.runInContext('matrixPropertyState = { a: [], b: [], global: [], _seeded: true };', context);

  // The named witnesses, through `buildMatrixUnitStats` itself rather than through its two halves,
  // and asserted on the value the old reader got wrong.
  for (const [version, name, calcKey, expected] of F269_2_WITNESS_RECORDS) {
    state.version = version;
    const unit = Object.values(versionData[version]).find(record => record.name === name);
    assert(!!unit, `${version} ships the roster record '${name}' this check names`);
    const stats = buildMatrixUnitStats('a', unit, {}, 'melee');
    assertEqual(stats.abilities[calcKey], expected,
      `${version} ${name}: the matrix row carries ${calcKey} from the card's own roster statement`);
  }
}

function runCardStateProjectionChecks(ctx) {
  // `const` declarations in a vm script live in the context's lexical scope, not on the context
  // object, so every symbol below is read by evaluating its name.
  const read = expression => evalInContext(ctx, expression);
  const cardStateToDerivationInput = read('cardStateToDerivationInput');
  const deriveUnitStats = read('deriveUnitStats');

  // The symbols F260.2 moved, named individually so a partial regression says which one.
  for (const symbol of ['abilityUiDefs', 'modernAttackRecord', 'abilityVersionGated',
    'subgroupAllowedForVersion', 'globalEnchantmentAllowedForVersion']) {
    assertEqual(read(`typeof ${symbol}`), 'function',
      `${symbol} is callable in the core context (Calculator/ability_gating.js, data-scope="core")`);
  }
  const modernSpecialFields = read('MODERN_SPECIAL_FIELDS');
  const modernSpecialKeys = modernSpecialFields.map(([key]) => key);
  const cardState = prefix => handBuiltCardState(prefix, modernSpecialKeys);
  assert(Array.isArray(modernSpecialFields) && modernSpecialFields.length === 9,
    'MODERN_SPECIAL_FIELDS is in the core context and names the nine modern special values');

  for (const version of read('ENGINE_VERSIONS')) {
    const modern = version.startsWith('com2');
    const globals = handBuiltGlobals(version);
    const input = cardStateToDerivationInput(cardState('a'), globals);
    assertEqual(input.version, version,
      `cardStateToDerivationInput carries the version through (${version})`);
    assertEqual(input.prefix, 'a',
      `cardStateToDerivationInput carries the side through (${version})`);
    assert(!!input.identity,
      `cardStateToDerivationInput resolves an identity without controls (${version})`);
    assertEqual(input.modernAttacks === null, !modern,
      `cardStateToDerivationInput states a modern attack record exactly for a modern version (${version})`);
    // The projection's output is derivation input, so the only proof it is well formed is that
    // the derivation takes it.
    const stats = deriveUnitStats(input);
    assertEqual(stats.hp, 4, `the projected input derives (${version})`);
  }

  // Content, not just shape. The loop above only proves the projection *runs*; the F260.2 review
  // demonstrated that it still passed with `modernAttackRecord` replaced by a stub fabricating a
  // 9-strength missile attack, which is exactly the "computes a different unit, suite still green"
  // failure F260 exists to prevent. So the values the state states are asserted where they land.
  const armed = cardState('a');
  armed.modernAttacks = {
    ranged: 5, rangedType: 'magic', thrown: 3, fireBreath: 0, lightningBreath: 2,
  };
  armed.modernSpecial.deathGaze = { on: true, value: -2 };
  armed.atk = 9;
  armed.abilities.firstStrike = true;
  const armedInput = cardStateToDerivationInput(armed, handBuiltGlobals('com2_1.05.11'));
  const channels = armedInput.modernAttacks;
  assertEqual(channels.ranged.strength, 5, "the projected Ranged channel carries the state's strength");
  assertEqual(channels.ranged.type, 'magic', "the projected Ranged channel carries the state's type");
  assertEqual(channels.thrown.strength, 3, "the projected Thrown channel carries the state's strength");
  assertEqual(channels.fireBreath, null, 'a zero Fire Breath states no channel');
  assertEqual(channels.lightningBreath.strength, 2,
    "the projected Lightning Breath channel carries the state's strength");
  // The innate half: what the unit was built with. The modern special block and the ability
  // controls are both innate statements, and since F252.1 the projection states them apart from
  // the enchantment half rather than folded into one map.
  assertEqual(armedInput.abilities, undefined,
    'the projection states the two ability halves, not one merged map');
  assertEqual(armedInput.innateAbilities.deathGaze, -2,
    'a ticked modern special value reaches the derivation input at its stated value');
  assertEqual(armedInput.innateAbilities.firstStrike, true,
    'an ability control reaches the derivation input under its calc key');
  assertEqual(armedInput.markedAbilities.firstStrike, undefined,
    'an ability control does not reach the marked half');
  assertEqual(armedInput.atk, 9, 'the projection carries a card scalar through unchanged');
  // `magic` deliberately: the shared-slot type is taken from the Ranged selector only where that
  // selector names a projectile the DOS-shaped slot has no token for. A `missile` Ranged record
  // would leave the shared slot alone, so asserting on it would prove nothing.
  assertEqual(armedInput.rtbType, 'magic',
    'a modern card takes its shared-slot type from the Ranged selector where the vocabularies diverge');
  // The same state under a DOS version: no modern record at all, and the untouched modern
  // selector must not leak into the DOS shared slot.
  const dosInput = cardStateToDerivationInput(armed, handBuiltGlobals('mom_1.31'));
  assertEqual(dosInput.modernAttacks, null, 'a DOS version states no modern attack record');
  assertEqual(dosInput.rtbType, 'none', "a DOS card's shared slot comes from its own select");
  // Not `undefined`: under a DOS version the nine-value block contributes nothing, and what
  // `deathGaze` holds instead comes from the shared special byte, which projects an unticked
  // consumer as `null`. The point of the assertion is that the modern block's -2 did not survive.
  assertEqual(dosInput.innateAbilities.deathGaze, null,
    'the modern special block contributes nothing under a DOS version');
  assertEqual(dosInput.toHitMod, 0, 'a DOS projection carries the DOS To-Hit pair');
  assertEqual(dosInput.hitChance, undefined, 'a DOS projection states no modern hit chance');

  // The enemy side reads the other card's cross-side entry, so both sides must project.
  const globals = handBuiltGlobals('com2_warlord_1.5.12.9');
  const b = cardStateToDerivationInput(cardState('b'), globals);
  assertEqual(b.prefix, 'b', 'cardStateToDerivationInput projects side b as well as side a');

  // Fail-loud: globals missing a required field must name the field rather than derive from
  // `undefined` (`CLAUDE.md`, *Architecture*).
  const broken = handBuiltGlobals('mom_1.31');
  delete broken.nodeAura;
  let threw = null;
  try { cardStateToDerivationInput(cardState('a'), broken); }
  catch (error) { threw = error.message; }
  assert(threw !== null && threw.includes('nodeAura'),
    'cardStateToDerivationInput halts naming the missing global field');

  runMatrixRosterParityChecks();
}

module.exports = { runCardStateProjectionChecks };
