// The reintroduction check for `SPEC.md`, *Out-of-range values stop the run*.
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
// globalEnchantmentAllowedForVersion).
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
    + " def: 0, res: 0, hp: 1 })", 'legendary'],
  // F117: the harnesses spelled this field `none`, `plate` and `mithril` at 37 call sites and
  // got the `normal` row from a positive `=== 'orihalcon'` predicate. `armor` is absent from the
  // other cases here on purpose: an omitted field is the control's own default, and only a
  // stated value outside the set stops the run.
  ['deriveUnitStats: unknown armor quality',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', armor: 'plate', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1,"
    + " rtb: 0, def: 0, res: 0, hp: 1 })", 'plate'],
  ['deriveUnitStats: unknown city-walls position',
    "deriveUnitStats({ prefix: 'a', version: 'com2_1.05.11', abilities: {}, level: 'normal',"
    + " weapon: 'normal', rtbType: 'none', unitType: 'normal', figs: 1, atk: 1, rtb: 0,"
    + " def: 0, res: 0, hp: 1, cityWalls: 'stone' })", 'stone'],
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
