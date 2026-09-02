// The reintroduction check for `SPEC.md`, *Architecture*, the fail-loud rule.
//
// Each case hands one converted site a value outside the set that site's sources define, and
// requires the call to throw. Replacing any of those stops with a fallback — a plausible member
// of the target set, an empty list, a zero row — turns the case red, which is the whole point:
// a silent fallback has no other observable consequence, so nothing else in the suite can hold
// it. The message assertions require the error to name the offending value, because an error
// that does not is not the error the rule asks for.
//
// These run in the page so both scopes are reachable: the computation layer (deriveUnitStats,
// getLevelBonuses, weaponBonus, versionChain, normalizeDosCombatHealState) and the page layer
// (loadUnitDatabase, applyPreset, predefinedUnitRtbType, subgroupAllowedForVersion,
// globalEnchantmentAllowedForVersion, recalculate, specialUnitAllowed, applyState).
const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

// Each entry: [label, expression evaluated in the page, substring the message must contain].
// The expression must call the site with an out-of-range value and return nothing useful.
const CASES = [
  ['getLevelBonuses: unknown experience level',
    "getLevelBonuses('legendary', 'com2_1.05.11')", 'legendary'],
  ['weaponBonus: unknown weapon material',
    "weaponBonus('orihalcon')", 'orihalcon'],
  ['deriveUnitStats: unknown experience level',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'legendary',"
    + " weapon: 'normal', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " modernAttacks: {}, def: 0, res: 0, hp: 1 })", 'legendary'],
  // F117: the harnesses spelled this field `none`, `plate` and `mithril` at 37 call sites and
  // got the `normal` row from a positive `=== 'orihalcon'` predicate. `armor` is absent from the
  // other cases here on purpose: an omitted field is the control's own default, and only a
  // stated value outside the set stops the run.
  ['deriveUnitStats: unknown armor quality',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', armor: 'plate', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1,"
    + " rtb: 0, modernAttacks: {}, def: 0, res: 0, hp: 1 })", 'plate'],
  ['deriveUnitStats: unknown city-walls position',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " modernAttacks: {}, def: 0, res: 0, hp: 1, cityWalls: 'stone' })", 'stone'],
  // F150: a CoM2/Warlord record that states no attack is four empty channels, never a missing
  // record, so an absent one stops the run instead of falling back to the DOS shared slot
  // (`SPEC.md`, *Attack channels on the card*).
  ['deriveUnitStats: modern input stating no modernAttacks record',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " def: 0, res: 0, hp: 1 })", 'modernAttacks'],
  // F181: the three slot-type reads in `buildSlotContext` are positive `includes` predicates over
  // `RANGED_TYPES`, `THROWN_TYPES` and `GAZE_TYPES`, so a token no vocabulary defines used to
  // answer `none` to all three and derive a slot with no attack in it. `'stoning_gaze'` is the
  // real typo that shape hid — it inverts `gaze_stoning` — and it passed a negative assertion
  // vacuously for as long as it did. `'none'` is the one token that states no attack, so it is
  // absent from the offending set rather than a fallback the run may reach.
  ['deriveUnitStats: shared-slot attack type no vocabulary defines',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', rtbType: 'stoning_gaze', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " modernAttacks: {}, def: 0, res: 0, hp: 1 })", 'stoning_gaze'],
  // The same boundary reached through a modern channel rather than the shared slot: the channel
  // slots take their type from the `modernAttacks` record, so both call sites of
  // `buildSlotContext` have to stop rather than only the record-level one.
  ['deriveUnitStats: modern channel attack type no vocabulary defines',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " modernAttacks: { ranged: { strength: 4, type: 'magic_i' } },"
    + " def: 0, res: 0, hp: 1 })", 'magic_i'],
  // An empty channel is dropped before `buildSlotContext` sees it, so the type has to be checked
  // where the caller supplies it. `{ strength: 0, type: '' }` used to be filtered out rather than
  // rejected, which is the same silence one layer earlier; `{ strength: 0, type: 'none' }` is the
  // spelling that legitimately states an empty channel and still derives.
  ['deriveUnitStats: supplied empty modern channel with no attack type',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " modernAttacks: { ranged: { strength: 0, type: '' } },"
    + " def: 0, res: 0, hp: 1 })", '""'],
  // The page-layer half. `applyModernAttackFields` assigns the projectile to a `<select>`, so a
  // token the control does not offer left it holding `''` and `modernAttackRecord` read that back
  // as `'none'` — the caller's statement erased one layer before the computation boundary could
  // see it, which is exactly the producer F181 was filed about (a fixture typo in a preset's
  // `modernAttacks`). It leaves the page as it found it: the throw precedes the write.
  ['applyModernAttackFields: modern projectile the control does not offer',
    "(() => { const v = document.getElementById('gameVersion');"
    + " const was = v.value; if (!was.startsWith('com2')) { v.value = 'com2_1.05.11';"
    + " onVersionChange(); }"
    + " try { applyModernAttackFields('a', { ranged: { strength: 4, type: 'magic_i' } },"
    + " 'F113 probe'); }"
    + " finally { if (v.value !== was) { v.value = was; onVersionChange(); } } })()", 'magic_i'],
  // F144: the core half of the F138 boundary. Every consumer of `identity.specialUnit` is an
  // equality test against one of the defined keys, so an undefined one used to derive an
  // ordinary unit and report nothing; `createUnitIdentity` now reads the same
  // `SPECIAL_UNIT_DEFS` the page's selector is built from.
  ['createUnitIdentity: special-unit key no version defines',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " modernAttacks: {}, def: 0, res: 0, hp: 1,"
    + " identity: { specialUnit: 'juggernautF144' } })", 'juggernautF144'],
  ['versionChain: version with no deduced-position list',
    "versionChain('com3_0.0.0', ['template:stat:base'])", 'com3_0.0.0'],
  ['normalizeDosCombatHealState: missing version',
    "normalizeDosCombatHealState({ figures: 4, baseHp: 3, totalDamage: 0 })", 'undefined'],
  ['loadUnitDatabase: version with no roster',
    "loadUnitDatabase('com3_0.0.0')", 'com3_0.0.0'],
  ['applyPreset: key that is not a preset',
    "applyPreset('noSuchPresetKeyF113')", 'noSuchPresetKeyF113'],
  ['predefinedUnitRtbType: roster attack type with no channel',
    "predefinedUnitRtbType({ id: 1, name: 'Probe', ranged_type: 'Magic(I)' })", 'Magic(I)'],
  ['subgroupAllowedForVersion: unknown version restriction',
    "subgroupAllowedForVersion('CoM3 only', 'com2_1.05.11')", 'CoM3 only'],
  ['globalEnchantmentAllowedForVersion: control with no version rule',
    "globalEnchantmentAllowedForVersion('noSuchEnchantmentF113', 'com2_1.05.11')",
    'noSuchEnchantmentF113'],
  // F132: the ranged-mode control is withdrawn by `updateTypeVisibility` in the same interaction
  // as any edit that empties the attacker's ranged attack (`SPEC.md`, UI contract), so a tick that
  // survives into `recalculate` is a state the contract forbids. It used to be absorbed by an
  // `&& hasRangedAttack` term that silently resolved the exchange as melee. The setup below leaves
  // the page as it found it: the guard runs before any result is rendered.
  ['recalculate: ranged mode ticked with no conventional ranged attack',
    "(() => { const c = document.getElementById('rangedCheck');"
    + " if (hasConventionalRangedAttack(readUnitStats('a'))) throw new Error('F113 setup: the"
    + " default attacker carries a conventional ranged attack, so this case cannot reach the"
    + " guard'); c.checked = true;"
    + " try { recalculate(); } finally { c.checked = false; } })()",
    'no conventional ranged attack'],
  // F131: the fixture-side half of the same boundary. The F132 guard above can only fire if the
  // tick survives `updateTypeVisibility`, and for a preset it never does — the withdrawal runs
  // between `applyPreset` writing the control and `recalculate` reading it, so a fixture stating
  // `rangedCheck: true` on a record with no conventional ranged attack quietly measured a melee
  // exchange. Four presets were in that state, one of them vacuous on the axis its name claimed.
  ['applyPreset: rangedCheck the page withdraws, undeclared',
    "(() => { PRESETS.__f131Undeclared = { version: 'com2_1.05.11',"
    + " a: { hitRanged: 70, hitThrown: 70, hitBreath: 70, modernAttacks: {}, hp: 10 },"
    + " b: { hp: 10 }, rangedCheck: true, rangedDist: 1 };"
    + " try { applyPreset('__f131Undeclared'); }"
    + " finally { delete PRESETS.__f131Undeclared; } })()", 'rangedModeWithdrawn'],
  // And in the other direction, so the declaration cannot outlive the withdrawal it describes:
  // this attacker keeps its Ranged attack, so the control is kept and the claim is stale.
  ['applyPreset: rangedModeWithdrawn declared where the control was kept',
    "(() => { PRESETS.__f131Stale = { version: 'com2_1.05.11',"
    + " a: { hitRanged: 70, hitThrown: 70, hitBreath: 70,"
    + " modernAttacks: { ranged: { strength: 1, type: 'missile' } }, hp: 10 },"
    + " b: { hp: 10 }, rangedCheck: true, rangedDist: 1, rangedModeWithdrawn: true };"
    + " try { applyPreset('__f131Stale'); }"
    + " finally { delete PRESETS.__f131Stale; } })()", '__f131Stale'],
  // The exemption the sweep's ablation probes take is the caller's — `applyPreset(name, {origin})`
  // — and not a field of the fixture, so a preset cannot authorise itself past the boundary. This
  // is the same preset as the undeclared case with an invented exemption field added: it must
  // still halt, which it can only do if fixture data grants nothing.
  ['applyPreset: a fixture cannot exempt itself from the ranged-mode assertion',
    "(() => { PRESETS.__f131SelfExempt = { version: 'com2_1.05.11',"
    + " a: { hitRanged: 70, hitThrown: 70, hitBreath: 70, modernAttacks: {}, hp: 10 },"
    + " b: { hp: 10 }, rangedCheck: true, rangedDist: 1, derivedFixture: true,"
    + " origin: 'ablation-probe' };"
    + " try { applyPreset('__f131SelfExempt'); }"
    + " finally { delete PRESETS.__f131SelfExempt; } })()", '__f131SelfExempt'],
  // And the declaration itself is a value in a defined set, not a truthiness test: `'false'` would
  // otherwise read as a live claim and clear the very finding it is supposed to state.
  ['applyPreset: rangedModeWithdrawn holding a value outside its set',
    "(() => { PRESETS.__f131BadFlag = { version: 'com2_1.05.11',"
    + " a: { hitRanged: 70, hitThrown: 70, hitBreath: 70, modernAttacks: {}, hp: 10 },"
    + " b: { hp: 10 }, rangedCheck: true, rangedDist: 1, rangedModeWithdrawn: 'false' };"
    + " try { applyPreset('__f131BadFlag'); }"
    + " finally { delete PRESETS.__f131BadFlag; } })()", '"false"'],
  // The caller context is a set too, so a harness cannot invent one.
  ['applyPreset: caller origin this build does not define',
    "(() => { PRESETS.__f131BadOrigin = { version: 'com2_1.05.11',"
    + " a: { hitRanged: 70, hitThrown: 70, hitBreath: 70, modernAttacks: {}, hp: 10 },"
    + " b: { hp: 10 } };"
    + " try { applyPreset('__f131BadOrigin', { origin: 'whatever' }); }"
    + " finally { delete PRESETS.__f131BadOrigin; } })()", 'whatever'],
  // F138: the two state-boundary reads that used to answer with a plausible substitute. A key no
  // version defines is retirement, not version scope — a *defined* key the selected version
  // disallows still clamps to `none`, which `tests/persistence.spec.js` pins.
  ['specialUnitAllowed: special-unit key no version defines',
    "specialUnitAllowed('com2_1.05.11', 'juggernautF138')", 'juggernautF138'],
  ['applyState: saved version id this build neither offers nor renames',
    "applyState({ v: 2, ids: { gameVersion: 'com2_0.9.0' } })", 'com2_0.9.0'],
];

test('out-of-range values stop the run instead of being replaced', async ({ page }) => {
  const errors = await openCalculator(page);
  const results = await page.evaluate((cases) => cases.map(([label, expression]) => {
    try {
      // eslint-disable-next-line no-eval
      eval(expression);
      return { label, threw: false, message: '' };
    } catch (err) {
      return { label, threw: true, message: String((err && err.message) || err) };
    }
  }), CASES);

  const silent = results.filter(result => !result.threw).map(result => result.label);
  expect(silent, 'every audited site stops on an out-of-range value').toEqual([]);

  for (const [label, , expected] of CASES) {
    const result = results.find(entry => entry.label === label);
    expect(result.message, `${label} names the offending value`).toContain(expected);
  }

  expectNoConsoleErrors(errors);
});

// The generator-side stops have no browser reachable form, so the two Python guards this suite
// cannot run are covered by their own regeneration: `tools/generate_com2_units_json.py`,
// `tools/generate_warlord_units_json.py` and `tools/parse_tweaker_unit_data.py` raise rather
// than defaulting, and re-running them must reproduce the checked-in `Calculator/units_*.js`
// byte for byte.
