#!/usr/bin/env node
'use strict';

// R9's durable stat-formula provenance audit. The calculator uses three constructors for
// source-authored stat transforms: statStep(), getAbilityStatSteps()'s emit(), and
// resolutionStep(). Every literal formula ID at those construction sites must have exactly one
// adjacent PROVENANCE comment. Direct formulas which cannot use one of those constructors are
// declared with STAT-FORMULA and are checked by the same machinery.

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const calculatorFiles = ['Calculator/stats.js', 'Calculator/combat.js'];
const excludedJavaScript = new Map([
  ['Calculator/data.js', 'declarative UI/version metadata'],
  ['Calculator/engine.js', 'generic probability and damage-distribution math'],
  ['Calculator/lz-string.min.js', 'vendored compression library'],
  ['Calculator/matrix-worker.js', 'matrix orchestration over calculator results'],
  ['Calculator/steps.js', 'generic ordered-step runner'],
  ['Calculator/ui.js', 'UI state, rendering, and formatting'],
]);
const allowedImplementationRoots = [
  'Reference docs/DOS reconstructed/',
  'Reference docs/Caster binary/',
  'Reference docs/Script source/Warlord 1.5.12.6.2/',
  'Reference docs/Script source/CoM2 1.05.11 base/',
];
const forbiddenSourceSuffixes = [
  '.md', '.html', '.txt',
];
const provenancePattern = /^\s*\/\/\s*PROVENANCE\[([^\]]+)\]:\s*(.+?)\s*$/;
const directFormulaPattern = /STAT-FORMULA\[([^\]]+)\]/g;

function fail(message) {
  throw new Error(`provenance audit: ${message}`);
}

function normalizeRepoPath(value) {
  return value.replace(/\\/g, '/');
}

function lineNumberAt(text, offset) {
  return text.slice(0, offset).split(/\r?\n/).length;
}

function discoverFormulaSites(file, text) {
  const sites = [];
  const patterns = [
    { kind: 'statStep', regex: /statStep\(\{\s*id:\s*'([^']+)'/g },
    { kind: 'resolutionStep', regex: /resolutionStep\(\s*'([^']+)'/g },
    { kind: 'ability emit', regex: /\bemit\(\s*'([^']+)'/g },
  ];
  for (const { kind, regex } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      sites.push({ id: match[1], kind, line: lineNumberAt(text, match.index), file });
    }
  }
  let match;
  while ((match = directFormulaPattern.exec(text)) !== null) {
    sites.push({ id: match[1], kind: 'direct formula', line: lineNumberAt(text, match.index), file });
  }
  return sites;
}

function readProvenanceComments(file, lines) {
  const comments = [];
  lines.forEach((line, index) => {
    const match = provenancePattern.exec(line);
    if (match) comments.push({ id: match[1], body: match[2], line: index + 1, file });
  });
  return comments;
}

function validateSourceCitation(comment, citation) {
  const trimmed = citation.trim();
  const isTable = trimmed.startsWith('TABLE=');
  const value = isTable ? trimmed.slice('TABLE='.length) : trimmed;
  const match = /^([^:]+(?:\/[^:]+)*):(\d+)-(\d+)$/.exec(value);
  if (!match) fail(`${comment.file}:${comment.line} has malformed citation "${citation}"`);
  const sourcePath = normalizeRepoPath(match[1]);
  const start = Number(match[2]);
  const end = Number(match[3]);
  if (!allowedImplementationRoots.some(root => sourcePath.startsWith(root))) {
    fail(`${comment.file}:${comment.line} cites non-implementation source ${sourcePath}`);
  }
  if (forbiddenSourceSuffixes.some(suffix => sourcePath.toLowerCase().endsWith(suffix))) {
    fail(`${comment.file}:${comment.line} cites prose instead of implementation: ${sourcePath}`);
  }
  if (start < 1 || end < start || end - start > 39) {
    fail(`${comment.file}:${comment.line} citation must be a valid narrow range (max 40 lines): ${citation}`);
  }
  const absolute = path.join(repoRoot, ...sourcePath.split('/'));
  if (!fs.existsSync(absolute)) fail(`${comment.file}:${comment.line} source does not exist: ${sourcePath}`);
  const sourceLines = fs.readFileSync(absolute, 'utf8').split(/\r?\n/);
  if (end > sourceLines.length) {
    fail(`${comment.file}:${comment.line} source range exceeds ${sourcePath} (${sourceLines.length} lines)`);
  }
  const excerpt = sourceLines.slice(start - 1, end).join('\n');
  // A strong implementation citation must carry the eligibility/control-flow gate and the
  // resulting write/arithmetic in the cited range. Runtime-table citations are supplemental
  // and are identified explicitly with TABLE=, so they are checked for a concrete assignment.
  if (isTable) {
    if (!/^\s*[^;#\s][^=]*=.+$/m.test(excerpt)) {
      fail(`${comment.file}:${comment.line} runtime-table range lacks an assignment: ${citation}`);
    }
    return;
  }
  const hasGate = /\b(if|case|while|for)\b|\?\s*[^:]+:|\b(and|or)\b/i.test(excerpt);
  const hasWrite = /:=|\+=|-=|\*=|\/=|\b(?:Inc|Dec|SETSTAT|SetStat|SetUnitStat)\s*\(/.test(excerpt);
  if (!hasGate || !hasWrite) {
    fail(`${comment.file}:${comment.line} source range lacks ${!hasGate ? 'an eligibility gate' : 'a stat write/arithmetic'}: ${citation}`);
  }
}

function validateVerifiedComment(comment) {
  const match = /^VERIFIED\s+versions=([^;]+);\s*sources=(.+)$/.exec(comment.body);
  if (!match) fail(`${comment.file}:${comment.line} has malformed VERIFIED comment`);
  const versions = match[1].split(',').map(value => value.trim()).filter(Boolean);
  if (versions.length === 0) fail(`${comment.file}:${comment.line} VERIFIED entry has no versions`);
  const citations = match[2].split('|').map(value => value.trim()).filter(Boolean);
  if (citations.length === 0) fail(`${comment.file}:${comment.line} VERIFIED entry has no citations`);
  citations.forEach(citation => validateSourceCitation(comment, citation));
}

function validateUnverifiedComment(comment) {
  const match = /^UNVERIFIED\s+versions=([^;]+);\s*gap=([^;]+);\s*pointer=(.+)$/.exec(comment.body);
  if (!match) fail(`${comment.file}:${comment.line} has malformed UNVERIFIED comment`);
  if (!match[1].trim() || !match[2].trim() || !match[3].trim()) {
    fail(`${comment.file}:${comment.line} UNVERIFIED entry needs versions, gap, and strongest pointer`);
  }
  const pointer = normalizeRepoPath(match[3].trim());
  if (/^(Calculator|Manual)\//.test(pointer)) {
    fail(`${comment.file}:${comment.line} UNVERIFIED pointer cannot point back to calculator/manual prose`);
  }
}

function runAudit() {
  const calculatorDirectory = path.join(repoRoot, 'Calculator');
  for (const entry of fs.readdirSync(calculatorDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const file = `Calculator/${entry.name}`;
    if (calculatorFiles.includes(file) || excludedJavaScript.has(file)
        || /^Calculator\/units_(?:mom|com|com2|warlord)\.js$/.test(file)) continue;
    fail(`${file} is not classified as formula-bearing, generated roster, or explicitly excluded`);
  }
  const sites = [];
  const comments = [];
  for (const file of calculatorFiles) {
    const absolute = path.join(repoRoot, ...file.split('/'));
    const text = fs.readFileSync(absolute, 'utf8');
    const lines = text.split(/\r?\n/);
    sites.push(...discoverFormulaSites(file, text));
    comments.push(...readProvenanceComments(file, lines));
  }

  const sitesById = new Map();
  for (const site of sites) {
    if (!sitesById.has(site.id)) sitesById.set(site.id, []);
    sitesById.get(site.id).push(site);
  }
  const commentsById = new Map();
  for (const comment of comments) {
    if (commentsById.has(comment.id)) fail(`duplicate PROVENANCE[${comment.id}] comments`);
    commentsById.set(comment.id, comment);
  }

  for (const [id, formulaSites] of sitesById) {
    const comment = commentsById.get(id);
    if (!comment) {
      const first = formulaSites[0];
      fail(`${first.file}:${first.line} ${first.kind} formula ${id} has no PROVENANCE comment`);
    }
    if (!formulaSites.some(site => site.file === comment.file && Math.abs(site.line - comment.line) <= 14)) {
      fail(`${comment.file}:${comment.line} PROVENANCE[${id}] is not adjacent (within 14 lines) to its formula`);
    }
  }
  for (const [id, comment] of commentsById) {
    if (!sitesById.has(id)) fail(`${comment.file}:${comment.line} PROVENANCE[${id}] has no formula site`);
    if (comment.body.startsWith('VERIFIED ')) validateVerifiedComment(comment);
    else if (comment.body.startsWith('UNVERIFIED ')) validateUnverifiedComment(comment);
    else fail(`${comment.file}:${comment.line} must be VERIFIED or UNVERIFIED`);
  }

  const unverified = comments.filter(comment => comment.body.startsWith('UNVERIFIED '));
  const backlog = fs.readFileSync(path.join(repoRoot, 'Calculator', 'BACKLOG.md'), 'utf8');
  const backlogMatch = /\| R9-G1 \|[^\n]*`(\d+)` UNVERIFIED formulas/.exec(backlog);
  if (!backlogMatch) fail('Calculator/BACKLOG.md lacks the live R9-G1 UNVERIFIED count');
  if (Number(backlogMatch[1]) !== unverified.length) {
    fail(`BACKLOG R9-G1 says ${backlogMatch[1]} UNVERIFIED formulas; audit found ${unverified.length}`);
  }

  return { formulas: sitesById.size, verified: comments.length - unverified.length, unverified: unverified.length };
}

if (require.main === module) {
  try {
    const result = runAudit();
    console.log(`Provenance audit passed: ${result.formulas} formulas (${result.verified} verified, ${result.unverified} UNVERIFIED).`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { discoverFormulaSites, readProvenanceComments, runAudit };
