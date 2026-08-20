// Compare two derivation_equivalence.js digests. Run:
//   node tools/derivation_equivalence_diff.js <before.json> <after.json> [maxReports]
//
// Exits 0 when every case matches, 1 when any differs. Reports the first differing cases with
// the exact field path, so a divergence names the stat and the case rather than the file.

'use strict';

const fs = require('fs');

const [beforePath, afterPath, maxArg] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('usage: node tools/derivation_equivalence_diff.js <before.json> <after.json> [maxReports]');
  process.exit(2);
}
const maxReports = Number(maxArg || 25);

const before = JSON.parse(fs.readFileSync(beforePath, 'utf8'));
const after = JSON.parse(fs.readFileSync(afterPath, 'utf8'));

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

const beforeKeys = Object.keys(before);
const afterKeys = Object.keys(after);
const missing = beforeKeys.filter(k => !(k in after));
const added = afterKeys.filter(k => !(k in before));

let differing = 0;
let fieldDiffs = 0;
const reports = [];

for (const key of beforeKeys) {
  if (!(key in after)) continue;
  const a = paths(before[key], '', new Map());
  const b = paths(after[key], '', new Map());
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
console.log(`differing cases: ${differing} (${fieldDiffs} field differences)`);
for (const report of reports) console.log(`  ${report}`);
if (differing > reports.length) console.log(`  ... ${differing - reports.length} more differing cases`);

process.exit(differing || missing.length || added.length ? 1 : 0);
