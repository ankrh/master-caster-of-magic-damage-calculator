#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  computeVerifiedBinding, discoverFormulaSites, hasImplementationWrite,
  makeStableSpanCitation, parseSourceCitation, readProvenanceComments, runAudit, stripCasComments,
} = require('./provenance_audit');

const sample = [
  "statStep({ id: 'literal-step', apply: u => { u.def += 1; } });",
  "attackSpecificStep('resolution-step', true, () => {});",
  "abilityStep('ability-step', 'c', { writes: ['atk'], apply: u => { u.atk += 2; } });",
  '// STAT-FORMULA[dynamic-emit]',
  "abilityStep(id, 'c', { writes: ['def'], apply: u => { u.def += 1; } });",
  "traceBasePreparation('base-prep', 'Base prep', before, after);",
  "addChanceDelta('chance-literal', source, 'c', 1, fields, 10);",
  '// STAT-FORMULA[table-case]',
  "case 'elite': return { atk: 2 };",
  '// STAT-FORMULA[chance-event]',
  'addChanceContribution(`chance:${event.id}`, event.source, event.phase, event.order, deltas);',
  '// STAT-FORMULA[chance-projection]',
  'const chanceSteps = chanceContributions.map(item => statStep({',
  'function clampPct(base, mod) { return base + mod; }',
  'function getLevelBonuses(level, version) { return { level, version }; }',
].join('\n');
assert.deepStrictEqual(
  discoverFormulaSites('synthetic.js', sample).map(site => site.id).sort(),
  [
    'ability-step', 'base-prep', 'chance-event', 'chance-literal', 'chance-projection',
    'clampPct', 'dynamic-emit', 'levelBonusDispatch', 'literal-step',
    'resolution-step', 'table-case',
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
assert(hasImplementationWrite('if (active) overlay_0388_0039(spell, target, local_damage, strength);'),
  'the DOS spell helper call must count as its documented damage-array out-parameter write');
assert(hasImplementationWrite('if (active) defense_special = DEF_SPECIAL_FULL;'),
  'a reconstructed local result assignment must count as formula arithmetic');
assert(!hasImplementationWrite('if (active) return bu->ranged == 2;'),
  'a reconstructed-C equality comparison must not count as a write');
assert(!hasImplementationWrite('if (active) return ((int8_t far *)bu)[field] == 2;'),
  'a computed-field equality comparison must not count as a write');
assert(hasImplementationWrite('IF (GETHEAB(U,HAArcaneWard)>0) THEN SETHEAB(W,48,HAArcaneWard,2);'),
  'SETHEAB writes the wizard hero-ability record and must count as a write');
assert(hasImplementationWrite('IF (ISHERO(U)>0) THEN SETOLENCHANTMENTFLAG(U,EncSpellLock,1,1);'),
  'SETOLENCHANTMENTFLAG writes the overland enchantment word and must count as a write');
assert(!hasImplementationWrite('IF (GETHEAB(U,HAArcaneWard)>0) THEN RETURNVAL(1);'),
  'GETHEAB reads the hero-ability record and must not count as a write');
assert(!hasImplementationWrite('IF (GETOLENCHANTMENTFLAG(U,EncSpellLock,1)>0) THEN RETURNVAL(1);'),
  'GETOLENCHANTMENTFLAG reads the enchantment word and must not count as a write');
assert(!hasImplementationWrite('IF (ISHERO(U)>0) THEN CALLSCRIPT(UnitCalcPost,U,0,0);'),
  'a gate around a call the recogniser knows no write for must resolve as citing no write');
assert(!hasImplementationWrite('IF (ISHERO(U)>0) THEN GOTO "SETHEAB";'),
  'a bare mention of a write verb with no argument must not count as a write');
// Both spellings of the call are shipped: `SpellMysticSurge.CAS` writes the enchantment word in
// the argument form the reference documents, and `UnitCalcPre.CAS` uses parentheses.
assert(hasImplementationWrite('IF (R>3) THEN { SETOLENCHANTMENTFLAG TU,EncOrihalcon,ABase,1; }'),
  'the documented argument form of a CAS write verb must count as a write');
assert(hasImplementationWrite('IF (R>3) THEN { SETHEAB W,48,HAArcaneWard,2; }'),
  'the documented argument form must be recognised for every CAS write verb');
// A `.CAS` comment sits between two `:` characters and can hold a call-shaped write that never
// runs, so a script excerpt is read as code only.
assert(!hasImplementationWrite(stripCasComments(
  'IF (R>3) THEN { :SETOLENCHANTMENTFLAG TU,EncOrihalcon,ABase,1;: }')),
  'a write commented out in a CAS excerpt must not resolve as a write');
assert(hasImplementationWrite(stripCasComments(
  ':an explanation: SETHEAB(W,48,HAArcaneWard,2); :and another:')),
  'stripping CAS comments must leave the code between them');

// The narrow shipped-script spans F255 was filed on. Each is the smallest window carrying the
// engine's own gate and the write itself, and before F255.1 both resolved as citing nothing.
// The window is located by searching the shipped script rather than by a line number, because a
// `<script>.CAS:<line>` citation is deprecated by `Reference docs/CAS citation grammar.md`.
const shippedScript = fs.readFileSync(
  path.join(__dirname, '..', 'Reference docs', 'Script source', 'Warlord 1.5.12.9',
    'UnitCalcPre.CAS'), 'utf8').split(/\r?\n/);
for (const verb of ['SETHEAB', 'SETOLENCHANTMENTFLAG']) {
  const writeAt = shippedScript.findIndex(line => line.includes(`${verb}(`));
  assert(writeAt >= 0, `the shipped Warlord UnitCalcPre must contain a ${verb} call`);
  let gateAt = -1;
  for (let index = writeAt; index >= 0 && writeAt - index < 40; index--) {
    if (/\bIF\b/i.test(shippedScript[index])) { gateAt = index; break; }
  }
  assert(gateAt >= 0, `the shipped ${verb} call must have a gate within a citable span above it`);
  const window = shippedScript.slice(gateAt, writeAt + 1).join('\n');
  assert(hasImplementationWrite(window),
    `a narrow shipped-script span whose only mutator is ${verb} must resolve as a write`);
  // Swapping the write verb for its documented reader is the whole difference: the same span,
  // same gate, same operands, and it must stop resolving as a write.
  const reader = `GET${verb.slice(3)}`;
  assert(!hasImplementationWrite(window.split(verb).join(reader)),
    `the span must resolve as a write only because of ${verb}, not because of what surrounds it`);
}

const temporaryRoot = fs.mkdtempSync(path.join(require('os').tmpdir(), 'provenance-span-'));
const temporarySource = path.join(temporaryRoot, 'Reference docs', 'Caster binary', 'sample.pas');
fs.mkdirSync(path.dirname(temporarySource), { recursive: true });
const stableBody = [
  'procedure Sample;',
  'if active then',
  '  U.attack := U.attack + 1;',
].join('\n');
fs.writeFileSync(temporarySource, stableBody);
const stableCitation = makeStableSpanCitation(
  'Reference docs/Caster binary/sample.pas:2-3', temporaryRoot);
const stableBinding = computeVerifiedBinding(['com2_1.05.11'], [stableCitation], temporaryRoot);
fs.writeFileSync(temporarySource, `unrelated declaration\n${stableBody}`);
assert.strictEqual(
  computeVerifiedBinding(['com2_1.05.11'], [stableCitation], temporaryRoot), stableBinding,
  'inserting unrelated lines before a stable span must not change its reviewed binding');
assert.deepStrictEqual(
  parseSourceCitation(stableCitation, temporaryRoot).start, 3,
  'a stable span must resolve to its new current line for diagnostics');
fs.writeFileSync(temporarySource, `${stableBody}\n${stableBody}`);
assert.throws(
  () => parseSourceCitation(stableCitation, temporaryRoot),
  /stable span is ambiguous/,
  'duplicating the exact reviewed excerpt must fail instead of selecting one occurrence');
fs.writeFileSync(temporarySource, stableBody.replace('+ 1', '+ 2'));
assert.throws(
  () => computeVerifiedBinding(['com2_1.05.11'], [stableCitation], temporaryRoot),
  /stable span was not found/,
  'changing implementation inside a stable span must invalidate the citation');
fs.rmSync(temporaryRoot, { recursive: true, force: true });

const result = runAudit();
assert(result.formulas > 0, 'repository audit must find formulas');
assert.strictEqual(result.formulas, result.verified + result.unverified);

const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'provenance_verified_anchors.json'), 'utf8'));
const validBinding = computeVerifiedBinding(
  ['com2_1.05.11', 'com2_warlord_1.5.12.9'],
  ['Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:63976f145f718df520e80186'],
);
assert.strictEqual(validBinding, manifest.innerPowerEligibility, 'reviewed formula binding must match');
const unrelatedBinding = computeVerifiedBinding(
  ['com2_1.05.11', 'com2_warlord_1.5.12.9'],
  ['Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:43a163f18b24d003ce1baa22'],
);
assert.notStrictEqual(unrelatedBinding, manifest.innerPowerEligibility,
  'wrong-but-code-shaped source range must fail the formula-specific binding');

assert.throws(() => discoverFormulaSites('synthetic.js', "abilityStep(id, 'c', {});"),
  /dynamic ability step needs an adjacent STAT-FORMULA id/);
assert.throws(() => discoverFormulaSites('synthetic.js', "case 'elite': return { atk: 2 };"),
  /stat-table case needs an adjacent STAT-FORMULA id/);

console.log(`Provenance tooling checks passed: 41 assertions; ${result.formulas} repository formulas.`);
