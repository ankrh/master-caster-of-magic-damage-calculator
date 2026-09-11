// M15: the engine rules that decide what reaches `deriveUnitStats`' source inputs.
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
// consumer's stored value carries, and whether its flag is ticked. The byte is the *provided*
// side alone — the innate half — since F252.1; what the same calc key receives from an
// enchantment control is the marked half and contends with this at the derivation boundary.
function consumerEntry(ctx, key, checked) {
  const def = evalInContext(ctx, 'ABILITY_DEFS').find(entry => entry.key === key);
  const row = evalInContext(ctx, 'DOS_SPECIAL_CONSUMERS').find(entry => entry[0] === key);
  assert(!!def && !!row, `DOS special consumer ${key} names an ability definition and a sign`);
  return { def, sign: row[2], checked };
}

function dosValues(ctx, options) {
  return ctx.dosSpecialAbilityValues({
    version: 'mom_1.31', magnitude: 0, rangedType: 'none', consumers: [], ...options,
  });
}

// Fold a list of controls from **one source** into one calc key exactly as the page does, so the
// merge rule is what decides the value that reaches derivation. Since F252.1 the page's fold runs
// within a source; two controls from different sources meet at the boundary instead, which is
// what the provided-against-received cases below state.
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
  const derive = innateAbilities => ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', atk: 5, def: 4, res: 6, innateAbilities,
  }));
  // Provided against received, stated as the two halves the boundary now carries (F252.1): the
  // unit was *built* with its own Holy Bonus and the card *marks* the one it receives. The
  // contention is `mergeAbilityCalcValue`'s, applied where the halves meet.
  const contend = (calcKey, provided, received) => ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.31', atk: 5, def: 4, res: 6,
    innateAbilities: { [calcKey]: provided }, markedAbilities: { [calcKey]: received },
  }));
  const higherReceived = contend('holyBonus', 2, 3);
  assertEqual(higherReceived.atk, 8, 'Holy Bonus 2 provided against 3 received adds the winner to melee');
  assertEqual(higherReceived.def, 7, 'Holy Bonus 2 provided against 3 received adds the winner to defense');
  assertEqual(higherReceived.res, 9, 'Holy Bonus 2 provided against 3 received adds the winner to resistance');
  const higherOwn = contend('holyBonus', 4, 1);
  assertEqual(higherOwn.atk, 9, 'Holy Bonus 4 provided against 1 received keeps the larger provider');
  // Resistance to All feeds the same contention on the resistance side.
  assertEqual(contend('resistanceToAll', 2, 5).res, 11,
    'Resistance to All 2 provided against 5 received adds the winner once');
  // The maximum is taken at the step, not at the boundary: the record map the sequence reads
  // carries the *provided* value alone, because what a stackmate provides was never on this
  // unit's record (F252.2). `mergeAbilitySourceHalves` is the boundary, so ask it directly.
  const boundary = ctx.mergeAbilitySourceHalves(
    { holyBonus: 2, resistanceToAll: 2 }, { holyBonus: 3, resistanceToAll: 5 }, 'check');
  assertEqual(boundary.holyBonus, 2, 'the record map keeps the Holy Bonus the unit provides');
  assertEqual(boundary.resistanceToAll, 2,
    'the record map keeps the Resistance to All the unit provides');
  assertEqual(ctx.receivedAbilityValues({ holyBonus: 3, resistanceToAll: 5, bless: true }).holyBonus,
    3, 'the received value travels beside the record map rather than into it');
  // And the fold that used to take that maximum at the boundary is gone: two numbers for one calc
  // key are two engine sources, which neither family combines at input.
  let refolded = null;
  try { ctx.mergeAbilityCalcValue(ownDef, 2, 3); } catch (err) { refolded = String(err.message); }
  assert(refolded !== null && refolded.includes('holyBonus'),
    'folding two numeric values onto one calc key halts and names the key');
  // The candidates are validated rather than repaired: a value outside the domain stops the run
  // instead of being truncated or floored into it (`CLAUDE.md`, *Architecture*: fail loud).
  for (const [bad, what] of [[1.5, 'a fraction'], ['3oops', 'a string'], [NaN, 'NaN'],
    [Infinity, 'Infinity']]) {
    let halted = null;
    try {
      ctx.deriveUnitStats(baseUnitInput({
        version: 'mom_1.31', atk: 5, def: 4, res: 6, innateAbilities: { holyBonus: bad },
        markedAbilities: {},
      }));
    } catch (err) { halted = String(err.message); }
    assert(halted !== null && halted.includes('holyBonus'),
      `Holy Bonus stated as ${what} halts and names the key`);
  }

  // The halves are two statements, not one: a merged map beside them is a caller error.
  let bothShapes = null;
  try {
    ctx.deriveUnitStats(baseUnitInput({
      version: 'mom_1.31', abilities: { holyBonus: 1 }, innateAbilities: { holyBonus: 2 },
    }));
  } catch (err) { bothShapes = String(err.message); }
  assert(bothShapes !== null && bothShapes.includes('both'),
    'stating the merged map and a half together halts rather than picking one');

  // --- 2. either grant of a shared flag reaches the effect ---
  // Warlord renamed Mislead to Liability, so two controls set the one record flag, whose
  // effect is -1 melee/defense/resistance. Each alone must reach it.
  //
  // That the *two together* do not apply it twice has no observable consequence here — every
  // consumer of a boolean is a flag test, so any truthy merge behaves alike. That half of the
  // rule is a citation (`PROVENANCE[abilityCalcKeyMerge]`), not an assertion.
  const misleadDef = defByKey('mislead');
  const liabilityDef = defByKey('liability');
  const deriveWarlord = markedAbilities => ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.9', atk: 5, def: 4, res: 6, markedAbilities,
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
      consumers: consumerKeys.map(key => consumerEntry(ctx, key, true)),
    });
    for (const key of consumerKeys) {
      assertEqual(Math.abs(values[key]), byte,
        `Ticked DOS consumer ${key} takes its magnitude from the shared byte ${byte}`);
    }
  }

  // --- 4. `null` and 0 are distinct states for a flag-gated consumer ---
  // The engine tests the flag, so an unticked consumer is absent rather than a -0 modifier.
  const unticked = dosValues(ctx, { magnitude: 3, consumers: [consumerEntry(ctx, 'deathTouch', false)] });
  const tickedAtZero = dosValues(ctx, { magnitude: 0, consumers: [consumerEntry(ctx, 'deathTouch', true)] });
  assertEqual(unticked.deathTouch, null, 'An unticked Death Touch flag leaves the effect absent');
  assertEqual(tickedAtZero.deathTouch, 0, 'A ticked Death Touch flag at byte 0 is present with modifier 0');

  // --- 5. the byte reaches derivation ---
  const provided = dosValues(ctx, { magnitude: 2, consumers: [consumerEntry(ctx, 'holyBonus', true)] });
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
      consumers: consumerKeys.map(key => consumerEntry(ctx, key, true)),
    });
    assertEqual(Object.keys(values).length, 0,
      `${version} sources no ability value from the DOS shared byte`);
  }
}

module.exports = { runAbilityInputChecks };
