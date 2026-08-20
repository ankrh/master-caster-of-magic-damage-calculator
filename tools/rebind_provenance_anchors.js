// Recompute tools/provenance_verified_anchors.json from the VERIFIED comments in the sources.
// Run: node tools/rebind_provenance_anchors.js [--write]
//
// An anchor exists to make a change to a reviewed formula's metadata or cited source content
// deliberate rather than silent, so this is NOT a way to make the audit pass: it re-derives every
// entry from what the comments currently say. Use it only when the *identity* of a formula moved
// — a rename, or a merge that regroups already-reviewed spans under one id — and report which
// keys moved. Without --write it prints the difference and changes nothing.

'use strict';

const fs = require('fs');
const path = require('path');
const {
  calculatorFiles, computeVerifiedBinding, readProvenanceComments,
} = require('./provenance_audit');

const repoRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(__dirname, 'provenance_verified_anchors.json');

// The audit's own parser is not exported, so the VERIFIED header is re-read here in the same
// shape it validates: `VERIFIED versions=<csv>; sources=<citation> | <citation> ...`.
function parseVerified(body) {
  const match = /^VERIFIED\s+versions=([^;]+);\s*sources=(.+)$/s.exec(body);
  if (!match) return null;
  return {
    versions: match[1].split(',').map(part => part.trim()).filter(Boolean),
    citations: match[2].split('|').map(part => part.trim()).filter(Boolean),
  };
}

const next = {};
for (const file of calculatorFiles) {
  const absolute = path.join(repoRoot, ...file.split('/'));
  const lines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
  for (const comment of readProvenanceComments(file, lines)) {
    if (!comment.body.startsWith('VERIFIED ')) continue;
    const parsed = parseVerified(comment.body);
    if (!parsed) throw new Error(`${comment.file}:${comment.line} VERIFIED ${comment.id} header did not parse`);
    next[comment.id] = computeVerifiedBinding(parsed.versions, parsed.citations);
  }
}

const current = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

const removed = Object.keys(current).filter(id => !(id in next));
const added = Object.keys(next).filter(id => !(id in current));
const rehashed = Object.keys(next).filter(id => id in current && current[id] !== next[id]);

console.log(`entries: ${Object.keys(current).length} before, ${Object.keys(next).length} after`);
for (const id of removed) console.log(`  - ${id}`);
for (const id of added) console.log(`  + ${id}  ${next[id].slice(0, 12)}`);
for (const id of rehashed) console.log(`  ~ ${id}  ${current[id].slice(0, 12)} -> ${next[id].slice(0, 12)}`);
if (!removed.length && !added.length && !rehashed.length) console.log('  (no change)');

if (process.argv.includes('--write')) {
  fs.writeFileSync(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`wrote ${manifestPath}`);
} else {
  console.log('(dry run; pass --write to apply)');
}
