// Compare two derivation_equivalence.js digests. Run:
//   node tools/derivation_equivalence_diff.js <before.json> <after.json> [maxReports]
//
// Exits 0 when every case matches, 1 when any differs, 2 when a side cannot support a comparison
// at all. Reports the first differing cases with the exact field path, so a divergence names the
// stat and the case rather than the file.
//
// A zero from here is a zero over a stated population, never over "the derivation" (F259.1): the
// digest carries its own scope under `__scope`, this prints it, and it refuses to report at all
// when either side has collapsed toward a constant — a throwing case digests to its message, which
// compares equal to itself on any tree, and F267.4 read that zero three times. The guard and its
// census come from `derivation_equivalence.js`, so the two sides of this pair cannot disagree
// about what counts as a refusal or where the budget is.

'use strict';

const fs = require('fs');
const {
  formatScope, refusalCensus, isRefusal, assertCorpusCanSpeak, REFUSAL_SHARE_BUDGET,
} = require('./derivation_equivalence');

const [beforePath, afterPath, maxArg] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('usage: node tools/derivation_equivalence_diff.js <before.json> <after.json> [maxReports]');
  process.exit(2);
}
const maxReports = Number(maxArg || 25);

const beforeFile = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const afterFile = JSON.parse(fs.readFileSync(afterPath, 'utf8'));

// `__scope` is the run's own statement of what it varied; every case name carries a '|', so the
// reserved key collides with none of them.
function split(file, path) {
  const { __scope: scope, ...cases } = file;
  if (!scope) {
    console.log(`note: ${path} carries no __scope block, so it predates F259.1 and cannot say `
      + 'which input fields its zero ranges over. The census below is measured from the digest '
      + 'itself, so the guard still applies.');
  }
  return { scope, cases };
}

const before = split(beforeFile, beforePath);
const after = split(afterFile, afterPath);

// Measured from the digest rather than taken from its scope block, so a file written by an older
// tool — or by a tree whose guard was weaker — is guarded on the same terms, per version as well
// as corpus-wide.
for (const [path, side] of [[beforePath, before], [afterPath, after]]) {
  const census = refusalCensus(side.cases);
  const share = census.cases ? census.refusals / census.cases : 1;
  console.log(`${path}: ${census.cases} cases, ${census.comparable} comparable, `
    + `${census.refusals} refusing (${(share * 100).toFixed(1)}%) across `
    + `${census.versions.length} versions`);
  try {
    assertCorpusCanSpeak(census, `derivation_equivalence_diff: ${path}`);
  } catch (err) {
    console.error(String(err.message));
    console.error('A refusing case compares equal to itself on any tree, so this pair cannot '
      + `support a zero (budget ${(REFUSAL_SHARE_BUDGET * 100).toFixed(0)}%). Fix the corpus `
      + 'rather than reading the number this run would have printed.');
    process.exit(2);
  }
}

function paths(value, prefix, out) {
  if (value === null || typeof value !== 'object') {
    out.set(prefix, value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => paths(item, `${prefix}[${i}]`, out));
    return out;
  }
  const keys = Object.keys(value);
  if (!keys.length) out.set(prefix, '{}');
  for (const key of keys) paths(value[key], prefix ? `${prefix}.${key}` : key, out);
  return out;
}

const beforeKeys = Object.keys(before.cases);
const afterKeys = Object.keys(after.cases);
const missing = beforeKeys.filter(k => !(k in after.cases));
const added = afterKeys.filter(k => !(k in before.cases));

let differing = 0;
let fieldDiffs = 0;
let bothRefusing = 0;
const reports = [];

for (const key of beforeKeys) {
  if (!(key in after.cases)) continue;
  const beforeCase = before.cases[key];
  const afterCase = after.cases[key];
  if (isRefusal(beforeCase) && isRefusal(afterCase)) bothRefusing += 1;
  const a = paths(beforeCase, '', new Map());
  const b = paths(afterCase, '', new Map());
  const fields = new Set([...a.keys(), ...b.keys()]);
  const changed = [];
  for (const field of fields) {
    if (a.get(field) !== b.get(field)) {
      changed.push(`${field}: ${JSON.stringify(a.get(field))} -> ${JSON.stringify(b.get(field))}`);
    }
  }
  if (changed.length) {
    differing += 1;
    fieldDiffs += changed.length;
    if (reports.length < maxReports) reports.push(`${key}\n    ${changed.join('\n    ')}`);
  }
}

console.log(`cases: ${beforeKeys.length} before, ${afterKeys.length} after`);
if (missing.length) console.log(`cases only in before: ${missing.length} (e.g. ${missing.slice(0, 3).join(', ')})`);
if (added.length) console.log(`cases only in after: ${added.length} (e.g. ${added.slice(0, 3).join(', ')})`);
const shared = beforeKeys.filter(k => k in after.cases).length;
console.log(`differing cases: ${differing} (${fieldDiffs} field differences), over ${shared} shared `
  + `cases of which ${bothRefusing} refuse on both sides and can only compare their message`);
for (const report of reports) console.log(`  ${report}`);
if (differing > reports.length) console.log(`  ... ${differing - reports.length} more differing cases`);

// The scope the number above ranges over. Printed after it, because the number is what a reader
// came for and the scope is what tells them how far it reaches.
if (after.scope) console.log(formatScope(after.scope));
if (before.scope && after.scope
    && JSON.stringify(before.scope) !== JSON.stringify(after.scope)) {
  console.log('note: the two runs state different scopes, so part of any difference above is a '
    + 'change in what was varied rather than a change in a value.');
}

process.exit(differing || missing.length || added.length ? 1 : 0);
