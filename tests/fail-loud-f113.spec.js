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
  // F144: the core half of the F138 boundary. Every consumer of `identity.specialUnit` is an
  // equality test against one of the four defined keys, so an undefined one used to derive an
  // ordinary unit and report nothing; `createUnitIdentity` now reads the same
  // `SPECIAL_UNIT_DEFS` the page's selector is built from.
  ['createUnitIdentity: special-unit key no version defines',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " modernAttacks: {}, def: 0, res: 0, hp: 1,"
    + " identity: { specialUnit: 'juggernautF144' } })", 'juggernautF144'],
  ['versionChain: version with no deduced-position list',
    "versionChain('com3_0.0.0', ['base:stat:base'])", 'com3_0.0.0'],
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
