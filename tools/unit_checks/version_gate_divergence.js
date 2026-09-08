'use strict';

// Version gating as state: one gating test, and `applyVersionGating` as the one implementation of
// the clearing the page used to do inline (F260.3).
//
// Two things are asserted here that nothing else can see:
//
//   1. **There is exactly one gating test, and the matrix uses it.** Until F261 the matrix asked a
//      weaker question than the card — subgroup alone, plus a `blur` exception — and admitted six
//      `com2_warlord_1.5.12.9` enchantments the card hides, which was INV-2 in the matrix. The
//      worklist that carried those six is gone with them. What replaces it is the *structural*
//      claim, because that is what a seventh entry would have to get past: no second gating
//      function exists, no registry selects between gates, `applyVersionGating` takes no gate
//      parameter, and the three matrix sites call `abilityVersionGated` and nothing weaker. The
//      six are then re-asserted by name as gated, with their Warlord twins ungated beside them.
//
//   2. **The pure clearing writes what the page wrote.** `applyVersionGating` reproduces the old
//      `applyDisabled` exactly, including what it did *not* do — a `num` input and a `numcheck`
//      pair keep their values. A stricter clear would be a better page and a *worse* F260: the
//      pure path would compute a different unit from the one the page computes, which is the
//      failure this item exists to prevent. The looseness costs nothing today only because
//      `hidden_control_gating.js` shows no gated `calcKey` reaches a derived stat, and the last
//      assertions below re-state that at the projection boundary for the values that *are*
//      cleared.

const fs = require('fs');
const path = require('path');

const { assert, assertEqual, assertSameKeyList, evalInContext } = require('./assertions');

const repoRoot = path.resolve(__dirname, '..', '..');

// The six the matrix used to admit while the card hid them (F261), and the Warlord twin each
// renames. Each pair writes one `calcKey`: the CoM2-named half carries
// `exceptVersions: ['com2_warlord_']` and must be gated under Warlord, the Warlord-named half
// must not. Kept by name rather than re-derived, so re-adding the weaker test — or dropping an
// `exceptVersions` from one of the six — fails here.
const WARLORD_RENAME_PAIRS = [
  ['flameBlade', 'flameBladeWarlord'],
  ['landLinking', 'natureLink'],
  ['discipline', 'disciplineWarlord'],
  ['destiny', 'apotheosis'],
  ['mislead', 'liability'],
  ['blazingEyes', 'chaosEmbrace'],
];

// The matrix's three gating sites, and the file they live in. A fourth site calling something
// weaker is the regression this names. The count is a landmark, not a rule: a deliberate refactor
// that merges or adds a site updates the number here in the same change. It is kept exact anyway
// because `npm test` runs on every task while the behavioural sweep that carries the real claim
// (`tests/version-gating.spec.js`, over every enchantment def in every version) runs only when
// page code changes — and this file is page code, so the two fire together, one cheaply.
const MATRIX_GATE_SITE_FILE = 'Calculator/ui_matrix_properties.js';
const MATRIX_GATE_SITE_COUNT = 3;

// The globals whose availability is version-dependent. Named rather than derived so a global
// silently losing its restriction is visible here.
const GATED_GLOBAL_FIELDS = ['trueLight', 'hurricane', 'poxHost'];

// An active value for each control type, so a gated def has something to be cleared *from*.
function activeValueFor(def) {
  if (def.type === 'bool') return true;
  if (def.type === 'select') {
    const options = def.options || [];
    return options.length > 1 ? options[1][0] : options[0][0];
  }
  return 3;
}

function stateWithEveryControlActive(ctx, prefix) {
  const defs = evalInContext(ctx, 'abilityUiDefs')();
  const uiKeyOf = evalInContext(ctx, 'cardStateAbilityUiKey');
  const abilities = {};
  for (const def of defs) abilities[uiKeyOf(def)] = activeValueFor(def);
  const modernSpecialKeys = evalInContext(ctx, 'MODERN_SPECIAL_FIELDS').map(([key]) => key);
  return {
    prefix,
    abilities,
    modernSpecial: Object.fromEntries(
      modernSpecialKeys.map(key => [key, { on: false, value: 0 }])),
    dosSpecial: { magnitude: 0, flags: {} },
    level: 'normal', weapon: 'normal', armor: 'orihalcon',
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

function globalsWithEveryEnchantmentOn(version) {
  return {
    version,
    nodeAura: 'none', wallOfFire: true, trueLight: true, darkness: true, chaosSurge: 0,
    rangedCheck: false, rangedDist: 1, warpReality: true, chaosConjunction: true,
    hurricane: true, poxHost: true,
    perSide: {
      a: { eternalNight: false, eyeOfHeaven: false },
      b: { eternalNight: false, eyeOfHeaven: false },
    },
  };
}

function threwMessage(run) {
  try { run(); } catch (error) { return error.message; }
  return null;
}

function runVersionGateDivergenceChecks(ctx) {
  const read = expression => evalInContext(ctx, expression);
  const versions = read('ENGINE_VERSIONS');
  const abilityUiDefs = read('abilityUiDefs');
  const abilityVersionGated = read('abilityVersionGated');
  const globalEnchantmentAllowedForVersion = read('globalEnchantmentAllowedForVersion');
  const versionHasArmorQuality = read('versionHasArmorQuality');
  const applyVersionGating = read('applyVersionGating');
  const applyGlobalVersionGating = read('applyGlobalVersionGating');
  const cardStateToDerivationInput = read('cardStateToDerivationInput');
  const uiKeyOf = read('cardStateAbilityUiKey');

  // --- 1. One gating test, and the matrix uses it ---
  //
  // Structural, deliberately: the six-entry worklist F260.3 carried is what F261 emptied, so the
  // regression to catch is no longer "a seventh def diverges" but "a second gate exists to
  // diverge with".
  const gatingSource = fs.readFileSync(
    path.join(repoRoot, 'Calculator/ability_gating.js'), 'utf8');
  for (const retired of ['abilityGatedForCard', 'abilityGatedForMatrix', 'ABILITY_VERSION_GATES']) {
    assert(!new RegExp(String.raw`(function|const)\s+${retired}\b`).test(gatingSource),
      `ability_gating.js defines no ${retired}: F261 left one gating test, `
      + 'and a registry or a second function is how the card and the matrix came to disagree');
  }
  assertEqual(applyVersionGating.length, 2,
    'applyVersionGating takes (state, version) and no gate parameter — there is nothing to '
    + 'select between (F261)');

  const matrixSource = fs.readFileSync(path.join(repoRoot, MATRIX_GATE_SITE_FILE), 'utf8');
  assertEqual((matrixSource.match(/\babilityVersionGated\s*\(/g) || []).length,
    MATRIX_GATE_SITE_COUNT,
    `${MATRIX_GATE_SITE_FILE} gates at its ${MATRIX_GATE_SITE_COUNT} sites through `
    + 'abilityVersionGated (render, value read, row filter)');
  assertEqual((matrixSource.match(/\bsubgroupAllowedForVersion\s*\(/g) || []).length, 0,
    `${MATRIX_GATE_SITE_FILE} never calls subgroupAllowedForVersion directly: the bare subgroup `
    + 'test is the weaker question that admitted six Warlord enchantments (F261)');

  // The six by name, and their twins. The retired worklist said these were admitted; this says
  // they are hidden, which is the same claim from the other side and outlives the worklist.
  const warlord = 'com2_warlord_1.5.12.9';
  const defsByKey = new Map(abilityUiDefs().map(def => [def.key, def]));
  for (const [renamed, warlordTwin] of WARLORD_RENAME_PAIRS) {
    const hidden = defsByKey.get(renamed);
    const offered = defsByKey.get(warlordTwin);
    assert(!!hidden && !!offered,
      `both halves of the Warlord rename ${renamed}/${warlordTwin} are defs`);
    assertEqual(abilityVersionGated(hidden, warlord), true,
      `the CoM2-named half is gated under Warlord (${renamed})`);
    assertEqual(abilityVersionGated(offered, warlord), false,
      `the Warlord-named half is offered under Warlord (${warlordTwin})`);
    assertEqual(hidden.calcKey || hidden.key, offered.calcKey || offered.key,
      `the pair writes one calcKey, which is why the ghost row moved numbers (${renamed})`);
  }

  // --- 2. `applyVersionGating` ---

  assert(threwMessage(() => applyVersionGating({}, 'mom_1.31')) !== null,
    'applyVersionGating halts on a state carrying no abilities');
  assert(threwMessage(() => applyVersionGating(
    stateWithEveryControlActive(ctx, 'a'), null)) !== null,
    'applyVersionGating halts on a missing version');

  for (const version of versions) {
    const state = stateWithEveryControlActive(ctx, 'a');
    const before = JSON.stringify(state);
    const gated = applyVersionGating(state, version);
    assertEqual(JSON.stringify(state), before,
      `applyVersionGating leaves its argument untouched (${version})`);
    assertEqual(JSON.stringify(applyVersionGating(gated, version)),
      JSON.stringify(gated), `applyVersionGating is idempotent (${version})`);

    let clearedBools = 0;
    let clearedSelects = 0;
    let carriedNumerics = 0;
    for (const def of abilityUiDefs()) {
      const uiKey = uiKeyOf(def);
      const value = gated.abilities[uiKey];
      if (!abilityVersionGated(def, version)) {
        assertEqual(value, state.abilities[uiKey],
          `an ungated control keeps its value (${version}|${uiKey})`);
        continue;
      }
      if (def.type === 'bool') {
        assertEqual(value, false, `a gated checkbox clears to false (${version}|${uiKey})`);
        clearedBools += 1;
      } else if (def.type === 'select') {
        assertEqual(value, def.options[0][0],
          `a gated select clears to its first option (${version}|${uiKey})`);
        clearedSelects += 1;
      } else {
        // The looseness F260.3 recorded here is closed (F253.1): a gated number control is cleared
        // like every other, an unticked `numcheck` being `null` and an empty `num` being `0`. It
        // was harmless only while `deriveUnitStats` ignored a key the version cannot carry; the
        // seed halts on one now, and `exorcise` — hidden in both MoM builds and named by no MoM
        // origin row — is the pair that made the carried value reachable from the card.
        assertEqual(value, def.type === 'numcheck' ? null : 0,
          `a gated number control clears to its own off value (${version}|${uiKey})`);
        carriedNumerics += 1;
      }
    }
    assert(clearedBools + clearedSelects > 0,
      `every version has gated controls to clear (${version})`);
    assertEqual(carriedNumerics > 0, !version.startsWith('com2_warlord_'),
      `only Warlord gates no number control (${version})`);

    // The armor reset the card performs in `updateLoadoutLocks`, on the state.
    assertEqual(gated.armor, versionHasArmorQuality(version) ? 'orihalcon' : 'normal',
      `applyVersionGating resets armor exactly where the version has no armor quality (${version})`);

    // INV-2 at the projection boundary: nothing the pass cleared is active in the derivation
    // input, and the projected input still derives.
    const input = cardStateToDerivationInput(gated, globalsWithEveryEnchantmentOn(version));
    for (const def of abilityUiDefs()) {
      if (!abilityVersionGated(def, version)) continue;
      if (def.type !== 'bool' && def.type !== 'select') continue;
      const calcKey = def.calcKey || def.key;
      // A `calcKey` several controls share is only clear when *every* control naming it is gated;
      // an ungated sibling legitimately keeps it active.
      const siblings = abilityUiDefs().filter(other => (other.calcKey || other.key) === calcKey);
      if (!siblings.every(other => abilityVersionGated(other, version))) continue;
      // Since F252.1 the projection states the two halves apart, so a def is looked up in the
      // half its own source writes.
      const half = def.source === 'ability' ? input.innateAbilities : input.markedAbilities;
      const value = half[calcKey];
      assert(value === false || value === undefined || value === null
        || value === (def.type === 'select' ? def.options[0][0] : false),
        `a gated ${def.type} reaches the derivation input inactive (${version}|${calcKey}), `
        + `got ${JSON.stringify(value)}`);
    }
  }

  // --- 2b. Sparse states, and inactive numeric values (GPT review of F260.3) ---
  //
  // Every state above carries every control at an *active* value, and two wrong implementations
  // survive that. The first **adds** an entry for a control the state does not carry: a card state
  // built from a preset states only what the preset sets, and inventing a cleared entry for the
  // rest turns "this control is absent" into "this control is present and off", which for a
  // `numcheck` the engine tests with `!= null` is a different unit. The second turns an inactive
  // `numcheck` (`null`) into `0` — for CoM 1 `exorcise` that is the difference between no rider at
  // all and a rider at strength zero, and it changes combat results. Neither is reachable from the
  // states above, so both are built here.
  //
  // The keys are also asserted to be `uiKey`s. Nothing gated today has a `uiKey` differing from its
  // `key`, so an implementation indexing by `key` would behave identically — which is exactly why
  // it needs stating rather than leaving to luck.
  const sharedKeyDefs = abilityUiDefs().filter(def => uiKeyOf(def) !== def.key);
  assert(sharedKeyDefs.length > 0,
    'some defs carry a uiKey differing from their key, so the uiKey assertions below have subjects');

  for (const version of versions) {
    const defs = abilityUiDefs();
    const gatedOfType = type => defs.find(def => abilityVersionGated(def, version) && def.type === type);
    const ungatedBool = defs.find(def => !abilityVersionGated(def, version) && def.type === 'bool');
    const sparse = { ...stateWithEveryControlActive(ctx, 'a'), abilities: {} };
    const stated = [];
    const put = (def, value) => {
      if (!def) return;
      sparse.abilities[uiKeyOf(def)] = value;
      stated.push(uiKeyOf(def));
    };
    put(gatedOfType('bool'), true);
    put(gatedOfType('select'), activeValueFor(gatedOfType('select')));
    // The two inactive numeric states the page can hold behind a gated control.
    put(gatedOfType('numcheck'), null);
    put(gatedOfType('num'), 0);
    put(ungatedBool, true);
    // Every version states at least the gated bool, the gated select and an ungated bool.
    assert(stated.length >= 3, `the sparse state names controls to probe (${version})`);

    const sparseGated = applyVersionGating(sparse, version);
    assertSameKeyList(Object.keys(sparseGated.abilities).sort(), [...stated].sort(),
      'applyVersionGating states exactly the controls the card state carried — it never invents '
      + `a cleared entry for an absent control (${version})`);
    for (const def of sharedKeyDefs) {
      assert(!(def.key in sparseGated.abilities),
        `applyVersionGating addresses controls by uiKey, not key (${version}|${def.key})`);
    }
    const numcheckDef = gatedOfType('numcheck');
    if (numcheckDef) {
      assertEqual(sparseGated.abilities[uiKeyOf(numcheckDef)], null,
        'an inactive gated numcheck stays absent rather than becoming a strength-zero rider '
        + `(${version}|${uiKeyOf(numcheckDef)})`);
    }
    const numDef = gatedOfType('num');
    if (numDef) {
      assertEqual(sparseGated.abilities[uiKeyOf(numDef)], 0,
        `a zero gated number control is left as it was (${version}|${uiKeyOf(numDef)})`);
    }
    assertEqual(sparseGated.abilities[uiKeyOf(ungatedBool)], true,
      `an ungated control in a sparse state is untouched (${version})`);
  }

  // A state that carries no ability control at all is a state, not an error.
  const empty = { ...stateWithEveryControlActive(ctx, 'a'), abilities: {} };
  assertSameKeyList(Object.keys(applyVersionGating(empty, 'mom_1.31').abilities), [],
    'applyVersionGating on a card state carrying no ability controls stays empty');

  // The six ghost controls, on a state: under Warlord the clearing pass empties every one of them,
  // which is the state-level statement of what the matrix reader now refuses.
  const warlordState = stateWithEveryControlActive(ctx, 'a');
  const warlordGated = applyVersionGating(warlordState, warlord);
  for (const [renamed, warlordTwin] of WARLORD_RENAME_PAIRS) {
    const hidden = defsByKey.get(renamed);
    const offered = defsByKey.get(warlordTwin);
    assertEqual(warlordGated.abilities[uiKeyOf(hidden)],
      hidden.type === 'select' ? hidden.options[0][0] : false,
      `the clearing pass empties the CoM2-named half under Warlord (${renamed})`);
    assertEqual(warlordGated.abilities[uiKeyOf(offered)], warlordState.abilities[uiKeyOf(offered)],
      `the Warlord-named half is untouched (${warlordTwin})`);
  }

  // --- 3. `applyGlobalVersionGating` ---
  for (const version of versions) {
    const globals = globalsWithEveryEnchantmentOn(version);
    const before = JSON.stringify(globals);
    const gated = applyGlobalVersionGating(globals);
    assertEqual(JSON.stringify(globals), before,
      `applyGlobalVersionGating leaves its argument untouched (${version})`);
    for (const field of GATED_GLOBAL_FIELDS) {
      assertEqual(gated[field], globalEnchantmentAllowedForVersion(field, version),
        `a global enchantment survives exactly where the version has it (${version}|${field})`);
    }
    assertEqual(gated.wallOfFire, true,
      `an all-version global enchantment is untouched (${version})`);
    assertEqual(gated.nodeAura, 'none',
      `a non-boolean global the rule allows everywhere is untouched (${version})`);
  }
  assert(threwMessage(() => applyGlobalVersionGating({ nodeAura: 'none' })) !== null,
    'applyGlobalVersionGating halts on globals stating no version');
  const nonBoolean = globalsWithEveryEnchantmentOn('mom_1.31');
  nonBoolean.hurricane = 'yes';
  const nonBooleanMessage = threwMessage(() => applyGlobalVersionGating(nonBoolean));
  assert(nonBooleanMessage !== null && nonBooleanMessage.includes('hurricane'),
    'applyGlobalVersionGating halts naming a disallowed global it cannot clear');
}

module.exports = { runVersionGateDivergenceChecks };
