#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { discoverFormulaSites, readProvenanceComments, runAudit } = require('./provenance_audit');

const sample = [
  "statStep({ id: 'literal-step', apply: u => { u.def += 1; } });",
  "resolutionStep('resolution-step', true, () => {});",
  "emit('ability-step', 'c', { atk: 2 });",
  '// STAT-FORMULA[direct-step]',
].join('\n');
assert.deepStrictEqual(
  discoverFormulaSites('synthetic.js', sample).map(site => site.id).sort(),
  ['ability-step', 'direct-step', 'literal-step', 'resolution-step'],
  'all supported source-authored formula declarations must be discovered',
);

const comments = readProvenanceComments('synthetic.js', [
  '// PROVENANCE[x]: UNVERIFIED versions=all; gap=missing reconstruction; pointer=Reference docs/Caster binary/x.pas',
]);
assert.strictEqual(comments.length, 1);
assert.strictEqual(comments[0].id, 'x');

const result = runAudit();
assert(result.formulas > 0, 'repository audit must find formulas');
assert.strictEqual(result.formulas, result.verified + result.unverified);
console.log(`Provenance tooling checks passed: 6 assertions; ${result.formulas} repository formulas.`);
