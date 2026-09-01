// M15: the engine rules that decide what reaches `deriveUnitStats`' `abilities` object.
//
// Two of them used to live in `ui_*.js` and so could only be exercised through Playwright:
// how several controls naming one `calcKey` combine (`mergeAbilityCalcValue`), and the DOS
// record's single shared special-value byte with its `ranged_type` gaze selection
// (`dosSpecialAbilityValues` / `dosGazeAbilityValues`). Both now sit in the derivation layer
// with their citations, which is what makes these checks possible without a DOM.
//
// Expectations below come from the cited sources, not from the code: the DOS builds keep a
// per-player *maximum* of each provider's byte and apply the winner once, and 103 runs the
// stoning kill loop, 105 the death loop and 104 both.

'use strict';

const { assert, assertEqual, baseUnitInput, evalInContext } = require('./assertions');

// Card state as the page marshals it: which ability definition the byte feeds, the sign that
// consumer's stored value carries, whether its flag is ticked, and what the same calc key
// receives from elsewhere.
function consumerEntry(ctx, key, checked, received) {
  const def = evalInContext(ctx, 'ABILITY_DEFS').find(entry => entry.key === key);
  const row = evalInContext(ctx, 'DOS_SPECIAL_CONSUMERS').find(entry => entry[0] === key);
  assert(!!def && !!row, `DOS special consumer ${key} names an ability definition and a sign`);
  return { def, sign: row[2], checked, received };
}

function dosValues(ctx, options) {
  return ctx.dosSpecialAbilityValues({
    version: 'mom_1.31', magnitude: 0, rangedType: 'none', consumers: [], ...options,
  });
}

// Fold a list of controls into one calc key exactly as the page does, so the merge rule is
// what decides the value that reaches derivation.
function mergedValue(ctx, defs, values) {
  let out;
  defs.forEach((def, index) => { out = ctx.mergeAbilityCalcValue(def, out, values[index]); });
  return out;
}

function runAbilityInputChecks(ctx) {
  const abilityDefs = evalInContext(ctx, 'ABILITY_DEFS');
  const enchantmentDefs = evalInContext(ctx, 'ENCHANTMENT_DEFS');
  const defByKey = key => abilityDefs.find(def => def.key === key)
    || enchantmentDefs.find(def => def.key === key);

  // --- 1. two numeric providers of one effect contend by maximum ---
  // A DOS unit providing Holy Bonus 2 while standing in a stackmate's Holy Bonus 3 takes 3,
  // not 5: the aggregation keeps the higher provider and the recompute adds it once.
  const ownDef = defByKey('holyBonus');
  const receivedDef = enchantmentDefs.find(def => (def.calcKey || def.key) === 'holyBonus');
  assert(!!ownDef && !!receivedDef && ownDef !== receivedDef,
    'Holy Bonus is provided by an ability control and received through a separate enchantment control');
  const derive = abilities => ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', atk: 5, def: 4, res: 6, abilities,
  }));
  const higherReceived = derive({ holyBonus: mergedValue(ctx, [ownDef, receivedDef], [2, 3]) });
  assertEqual(higherReceived.atk, 8, 'Holy Bonus 2 provided against 3 received adds the winner to melee');
  assertEqual(higherReceived.def, 7, 'Holy Bonus 2 provided against 3 received adds the winner to defense');
  assertEqual(higherReceived.res, 9, 'Holy Bonus 2 provided against 3 received adds the winner to resistance');
  const higherOwn = derive({ holyBonus: mergedValue(ctx, [ownDef, receivedDef], [4, 1]) });
  assertEqual(higherOwn.atk, 9, 'Holy Bonus 4 provided against 1 received keeps the larger provider');
  // Resistance to All feeds the same contention on the resistance side.
  const resAllOwn = defByKey('resistanceToAll');
  const resAllReceived = enchantmentDefs.find(def => (def.calcKey || def.key) === 'resistanceToAll');
  const resAll = derive({ resistanceToAll: mergedValue(ctx, [resAllOwn, resAllReceived], [2, 5]) });
  assertEqual(resAll.res, 11, 'Resistance to All 2 provided against 5 received adds the winner once');

  // --- 2. either grant of a shared flag reaches the effect ---
  // Warlord renamed Mislead to Liability, so two controls set the one record flag, whose
  // effect is -1 melee/defense/resistance. Each alone must reach it.
  //
  // That the *two together* do not apply it twice has no observable consequence here — every
  // consumer of a boolean is a flag test, so any truthy merge behaves alike. That half of the
  // rule is a citation (`PROVENANCE[abilityCalcKeyMerge]`), not an assertion.
  const misleadDef = defByKey('mislead');
  const liabilityDef = defByKey('liability');
  const deriveWarlord = abilities => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 5, def: 4, res: 6, abilities,
  }));
  const neitherGrant = deriveWarlord({ mislead: mergedValue(ctx, [misleadDef, liabilityDef], [false, false]) });
  const ownGrant = deriveWarlord({ mislead: mergedValue(ctx, [misleadDef, liabilityDef], [true, false]) });
  const aliasGrant = deriveWarlord({ mislead: mergedValue(ctx, [misleadDef, liabilityDef], [false, true]) });
  assertEqual(neitherGrant.atk, 5, 'Neither Mislead control set leaves melee alone');
  assertEqual(ownGrant.atk, 4, 'The Mislead control alone costs 1 melee');
  assertEqual(aliasGrant.atk, 4, 'The Liability control alone costs the same 1 melee');
  assertEqual(aliasGrant.res, ownGrant.res, 'Either grant of the flag reaches resistance the same way');

  // --- 3. the DOS record holds one shared value byte, not a number per effect ---
  const consumerKeys = evalInContext(ctx, 'DOS_SPECIAL_CONSUMERS').map(([key]) => key);
  for (const byte of [3, 5]) {
    const values = dosValues(ctx, {
      magnitude: byte,
      consumers: consumerKeys.map(key => consumerEntry(ctx, key, true, undefined)),
    });
    for (const key of consumerKeys) {
      assertEqual(Math.abs(values[key]), byte,
        `Ticked DOS consumer ${key} takes its magnitude from the shared byte ${byte}`);
    }
  }

  // --- 4. `null` and 0 are distinct states for a flag-gated consumer ---
  // The engine tests the flag, so an unticked consumer is absent rather than a -0 modifier.
  const unticked = dosValues(ctx, { magnitude: 3, consumers: [consumerEntry(ctx, 'deathTouch', false, undefined)] });
  const tickedAtZero = dosValues(ctx, { magnitude: 0, consumers: [consumerEntry(ctx, 'deathTouch', true, undefined)] });
  assertEqual(unticked.deathTouch, null, 'An unticked Death Touch flag leaves the effect absent');
  assertEqual(tickedAtZero.deathTouch, 0, 'A ticked Death Touch flag at byte 0 is present with modifier 0');

  // --- 5. the byte reaches derivation ---
  const provided = dosValues(ctx, { magnitude: 2, consumers: [consumerEntry(ctx, 'holyBonus', true, undefined)] });
  assertEqual(derive(provided).def, 6, 'A DOS unit providing Holy Bonus from the shared byte gains it');

  // --- 6. the gazes are selected by the shared ranged type, and share the one modifier ---
  const gazeCases = [
    ['gaze_stoning', -4, null, 'nature'],
    ['gaze_death', null, -4, 'death'],
    ['gaze_multiple', -4, -4, 'chaos'],
    ['missile', null, null, null],
  ];
  for (const [rangedType, stoning, death, realm] of gazeCases) {
    const values = ctx.dosGazeAbilityValues(rangedType, 4);
    assertEqual(values.stoningGaze, stoning, `Ranged type ${rangedType} sets the stoning kill modifier`);
    assertEqual(values.deathGaze, death, `Ranged type ${rangedType} sets the death kill modifier`);
    assertEqual(values.doomGaze, 0, `Ranged type ${rangedType} takes no Doom damage from the byte`);
    assertEqual(ctx.gazeRealm(values), realm, `Ranged type ${rangedType} resolves to its engine realm`);
  }
  // The record cannot hold a gaze the type does not name: a unit with both gazes is type 104,
  // and switching the shared slot to a non-gaze type removes them outright.
  assertEqual(ctx.dosGazeAbilityValues('gaze_multiple', 4).stoningGaze,
    ctx.dosGazeAbilityValues('gaze_multiple', 4).deathGaze,
    'Type 104 gives both kill loops the same modifier, because there is only one byte');

  // --- 7. CoM2 and Warlord replaced the byte with per-effect fields ---
  for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.9']) {
    const values = dosValues(ctx, {
      version, magnitude: 3, rangedType: 'gaze_multiple',
      consumers: consumerKeys.map(key => consumerEntry(ctx, key, true, undefined)),
    });
    assertEqual(Object.keys(values).length, 0,
      `${version} sources no ability value from the DOS shared byte`);
  }
}

module.exports = { runAbilityInputChecks };
