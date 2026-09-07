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

const { assert, assertEqual, evalInContext } = require('./assertions');

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
}

module.exports = { runCardStateProjectionChecks };
