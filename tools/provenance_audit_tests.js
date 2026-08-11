#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  computeVerifiedBinding, discoverFormulaSites, hasImplementationWrite,
  readProvenanceComments, runAudit,
} = require('./provenance_audit');

const sample = [
  "statStep({ id: 'literal-step', apply: u => { u.def += 1; } });",
  "resolutionStep('resolution-step', true, () => {});",
  "emit('ability-step', 'c', { atk: 2 });",
  '// STAT-FORMULA[dynamic-emit]',
  "emit(id, 'c', { def: 1 });",
  "traceBasePreparation('base-prep', 'Base prep', before, after);",
  "addChanceDelta('chance-literal', source, 'c', 1, fields, 10);",
  '// STAT-FORMULA[table-case]',
  "case 'elite': return { atk: 2 };",
  '// STAT-FORMULA[chance-event]',
  'addChanceContribution(`chance:${event.id}`, event.source, event.phase, event.order, deltas);',
  '// STAT-FORMULA[chance-projection]',
  'const chanceSteps = chanceContributions.map(item => statStep({',
  'function clampPct(base, mod) { return base + mod; }',
  'function weaponBonus(type) { return type; }',
  'function getLevelBonuses(level, version) { return { level, version }; }',
  'function realmOfUnitType(unitType) { return unitType; }',
  'function isNormalUnitType(unitType) { return unitType === "normal"; }',
  'function normalizeCombatUnit(unit, version) { return { unit, version }; }',
].join('\n');
assert.deepStrictEqual(
  discoverFormulaSites('synthetic.js', sample).map(site => site.id).sort(),
  [
    'ability-step', 'base-prep', 'chance-event', 'chance-literal', 'chance-projection',
    'clampPct', 'dynamic-emit', 'isNormalUnitType', 'levelBonusDispatch', 'literal-step',
    'normalizeCombatUnit', 'realmOfUnitType',
    'resolution-step', 'table-case', 'weaponBonusFunction',
  ],
  'all supported source-authored formula declarations must be discovered',
);

const comments = readProvenanceComments('synthetic.js', [
  '// PROVENANCE[x]: UNVERIFIED versions=all; gap=missing reconstruction; pointer=Reference docs/Caster binary/x.pas',
]);
assert.strictEqual(comments.length, 1);
assert.strictEqual(comments[0].id, 'x');

assert(hasImplementationWrite('if (active) bu->ranged = 2;'),
  'ordinary reconstructed-C pointer-field assignment must count as a write');
assert(hasImplementationWrite('if active then U.attack = U.attack * 2;'),
  'ordinary reconstructed-C dot-field assignment must count as a write');
assert(hasImplementationWrite('if (level > 0) bu->resist++;'),
  'reconstructed-C pointer-field increments must count as writes');
assert(hasImplementationWrite('if (value > 0) ((int8_t far *)bu)[field]++;'),
  'reconstructed-C computed field increments must count as writes');
assert(hasImplementationWrite('if active then U.resistance--;'),
  'reconstructed-C dot-field decrements must count as writes');
assert(hasImplementationWrite('if (value > 0) ((int8_t far *)bu)[field]--;'),
  'reconstructed-C computed field decrements must count as writes');
assert(!hasImplementationWrite('if (active) return bu->ranged == 2;'),
  'a reconstructed-C equality comparison must not count as a write');
assert(!hasImplementationWrite('if (active) return ((int8_t far *)bu)[field] == 2;'),
  'a computed-field equality comparison must not count as a write');

const result = runAudit();
assert(result.formulas > 0, 'repository audit must find formulas');
assert.strictEqual(result.formulas, result.verified + result.unverified);

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'provenance_verified_anchors.json'), 'utf8'));
const validBinding = computeVerifiedBinding(
  ['com2_1.05.11', 'com2_warlord_1.5.12.7'],
  ['Reference docs/Caster binary/Units.RecalculateUnits.pas:1726-1732'],
);
assert.strictEqual(validBinding, manifest.innerPowerEligibility, 'reviewed formula binding must match');
const unrelatedBinding = computeVerifiedBinding(
  ['com2_1.05.11', 'com2_warlord_1.5.12.7'],
  ['Reference docs/Caster binary/Units.RecalculateUnits.pas:1538-1548'],
);
assert.notStrictEqual(unrelatedBinding, manifest.innerPowerEligibility,
  'wrong-but-code-shaped source range must fail the formula-specific binding');

assert.throws(() => discoverFormulaSites('synthetic.js', "emit(id, 'c', { def: 1 });"),
  /dynamic ability emit needs an adjacent STAT-FORMULA id/);
assert.throws(() => discoverFormulaSites('synthetic.js', "case 'elite': return { atk: 2 };"),
  /stat-table case needs an adjacent STAT-FORMULA id/);

console.log(`Provenance tooling checks passed: 17 assertions; ${result.formulas} repository formulas.`);
