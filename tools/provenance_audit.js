#!/usr/bin/env node
'use strict';

// R9's durable stat-formula provenance audit. The calculator uses three constructors for
// source-authored stat transforms: statStep(), getAbilityStatSteps()'s emit(), and
// attackSpecificStep(). Every literal formula ID at those construction sites must have exactly one
// adjacent PROVENANCE comment. Direct formulas which cannot use one of those constructors are
// declared with STAT-FORMULA and are checked by the same machinery.
//
// Reviewed source excerpts may use `path@span:<line-count>:<sha256-prefix>`. The digest locates
// the exact 1-40-line excerpt wherever it currently lives, so unrelated insertions do not move
// the citation while an edit inside the reviewed excerpt still invalidates its manifest binding.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = path.resolve(__dirname, '..');
const verifiedManifestPath = path.join(__dirname, 'provenance_verified_anchors.json');
// The single home for "which calculator sources carry source-authored stat formulas". The
// provenance manifest generator and node_unit_checks.js read it from here rather than repeating
// the list, so splitting a formula-bearing source is one edit. Every other Calculator/*.js must
// be excluded below or matched by the generated-set pattern in runAudit(), which fails loudly on
// an unclassified file.
const calculatorFiles = [
  'Calculator/stats_identity.js',
  'Calculator/stats_sequence.js',
  'Calculator/stats.js',
  'Calculator/combat_abilities.js',
  'Calculator/combat_special_attacks.js',
  'Calculator/combat_fear_and_touch.js',
  'Calculator/combat_effects.js',
  'Calculator/combat_state.js',
  'Calculator/combat_phases.js',
  'Calculator/combat.js',
];
const excludedJavaScript = new Map([
  ['Calculator/data.js', 'declarative UI/version metadata'],
  ['Calculator/abilities.js', 'declarative UI ability metadata'],
  ['Calculator/enchantments.js', 'declarative UI enchantment metadata'],
  // Version gating and the two modern record shapes: which controls a version offers and what
  // shape a modern card produces. It states no stat formula.
  ['Calculator/ability_gating.js', 'ability/enchantment version gating and modern record shapes'],
  ['Calculator/presets.js', 'numeric preset fixtures'],
  ['Calculator/test_tree.js', 'preset browser grouping tree'],
  ['Calculator/engine.js', 'generic probability and damage-distribution math'],
  ['Calculator/lz-string.min.js', 'vendored compression library'],
  ['Calculator/steps.js', 'ordered-step runner and the canonical step version-scope table'],
  ['Calculator/stats_manifests.js', 'per-version execution chains, carrying no stat formula'],
  // The origin table names engine writes, but as mentions: the anchor for each lives on the step
  // that reads the flag or the transform that makes it, which are formula-bearing sources above.
  ['Calculator/stats_origins.js', 'ability-key origin classification, carrying no stat formula'],
  // The projection marshals control state into derivation input. Every rule it applies is cited
  // where it lives — `mergeAbilityCalcValue` and `dosSpecialAbilityValues` in the formula-bearing
  // sources above — and the file itself states no formula. It carried the same content while it
  // was part of `ui_card.js`, excluded below.
  ['Calculator/card_state.js', 'card control state and its projection into derivation input'],
  ['Calculator/ui.js', 'UI rendering, formatting, and page wiring'],
  ['Calculator/ui_abilities.js', 'UI ability controls and version gating'],
  ['Calculator/ui_units.js', 'UI unit selection and identity controls'],
  ['Calculator/ui_card.js', 'UI stat card reading and display'],
  ['Calculator/ui_state.js', 'UI state, presets, and share payloads'],
  ['Calculator/ui_matrix_properties.js', 'UI matrix property drawer state'],
  ['Calculator/ui_matrix.js', 'UI matrix view rendering and export'],
]);
const allowedImplementationRoots = [
  'Reference docs/DOS reconstructed/',
  'Reference docs/Caster binary/',
  'Reference docs/Script source/Warlord 1.5.12.9/',
  'Reference docs/Script source/CoM2 1.05.11 base/',
];
const forbiddenSourceSuffixes = [
  '.md', '.html', '.txt',
];
const provenancePattern = /^\s*\/\/\s*PROVENANCE\[([^\]]+)\]:\s*(.+?)\s*$/;
const directFormulaPattern = /STAT-FORMULA\[([^\]]+)\]/g;
const stableSpanPrefixLength = 24;
const sourceSnapshotCache = new Map();
const directFunctionIds = new Map([
  ['mergeAbilityCalcValue', 'abilityCalcKeyMerge'],
  ['clampPct', 'clampPct'],
  ['woundedTopFigHP', 'woundedTopFigureHp'],
  ['getLevelBonuses', 'levelBonusDispatch'],
  ['supremeLightActiveForUnit', 'supremeLightEligibility'],
  ['survivalInstinctActiveForUnit', 'survivalInstinctEligibility'],
  ['landLinkingActiveForUnit', 'landLinkingEligibility'],
  ['innerPowerActiveForUnit', 'innerPowerEligibility'],
  ['misleadActiveForUnit', 'misleadEligibility'],
  ['destinyActiveForUnit', 'destinyEligibility'],
  ['deriveMarionettePackage', 'marionettePackage'],
  ['curseRefusedByImmunity', 'curseImmunityRefusal'],
  ['supernaturalMinDamageForHits', 'supernaturalMinimumDamage'],
  ['distancePenalty', 'distancePenalty'],
  ['applyRage', 'rageEffectiveAttack'],
  ['rulerOfUnderworldActiveForUnit', 'rulerOfUnderworldEligibility'],
  ['eldritchWeaponActiveForUnit', 'eldritchWeaponEligibility'],
  ['blazingMarchMagicWeaponForUnit', 'blazingMarchMagicWeapon'],
  ['touchAttackFires', 'touchDispatcherAdmission'],
  ['dispelEvilFailProb', 'dispelEvilTouchRider'],
  ['exorciseFailProb', 'exorciseTouchRider'],
  ['dosGazeAbilityValues', 'dosGazeTypeContention'],
  ['dosSpecialAbilityValues', 'dosSharedSpecialByte'],
  ['immolationStr', 'immolationStrength'],
  ['wallOfFireStr', 'wallOfFireStrength'],
  ['applyDamageSpellAmplifier', 'applyDamageSpellAmplifier'],
  ['calcDamageSpellDist', 'damageSpellResolution'],
  ['wallOfFireToHit', 'wallOfFireToHit'],
  ['wallOfFireSingleFigure', 'wallOfFireAreaShape'],
  ['wallOfFireEligible', 'wallOfFireEligibility'],
  ['wallOfFireAmplified', 'wallOfFireAmplifierProjection'],
  ['applyHierophanyAbilityStrip', 'hierophanyAbilityStrip'],
  ['applyUndeadImmunities', 'undeadImmunityDerivation'],
  ['applyAnimatedEffects', 'animatedEffectDerivation'],
  ['applyBlackChannelsEffects', 'blackChannelsEffectDerivation'],
  ['applyRebuildEffects', 'rebuildEffectDerivation'],
  ['applyTacticianWarlordEffects', 'tacticianAbilityDerivation'],
  ['applyFieryFuryEffects', 'fieryFuryAbilityDerivation'],
  ['applyZealEffects', 'zealAbilityDerivation'],
  ['applyTemporalTwistEffects', 'temporalTwistAbilityDerivation'],
  ['applyBloodLustEffects', 'bloodLustAbilityDerivation'],
  ['applyVampirismEffects', 'vampirismAbilityDerivation'],
  ['applyRevenantEffects', 'revenantAbilityDerivation'],
  ['applyAngelicGuardiansEffects', 'angelicGuardiansAbilityDerivation'],
  ['bloodLustMeleeAttack', 'bloodLustMeleeAttack'],
  ['elemResistBonus', 'elemResistBonus'],
  ['computeDefenseProfile', 'dosEffectiveDefenseProfile'],
  ['applyDoomUAHalving', 'doomAttackStrengthModifiers'],
  ['applyPairToHitModifiers', 'pairToHitModifiers'],
  ['buildToBlockContext', 'resolutionToBlockContext'],
]);

function fail(message) {
  throw new Error(`provenance audit: ${message}`);
}

function normalizeRepoPath(value) {
  return value.replace(/\\/g, '/');
}

// The CAS write verbs, documented in `Reference docs/Script source/CAS reference/Scripts.TXT`.
// The paired readers (`GETSTAT`, `GETHEAB`, `GETOLENCHANTMENTFLAG`, ...) are deliberately absent,
// so a span that only reads still resolves as citing no write. The shipped scripts use two
// spellings, `VERB(U,...)` and the argument form `VERB U,...` the reference documents; requiring
// an argument either way keeps a bare mention of the verb's name out.
const casWriteVerbs = [
  'SETSTAT', 'SETENCHANTMENTFLAG', 'SETCOMBATENCHANTMENTFLAG', 'SETOLENCHANTMENTFLAG', 'SETHEAB',
];
const casWriteCall = new RegExp(`\\b(?:${casWriteVerbs.join('|')})\\s*(?:\\(|[A-Za-z_]\\w*\\s*,)`);

// A `.CAS` comment is enclosed between two `:` characters and may sit inside a line of code
// (Scripts.TXT, "Basic Information"), so a comment can carry a call-shaped write that never runs.
function stripCasComments(excerpt) {
  return excerpt.split(':').filter((part, index) => index % 2 === 0).join(' ');
}

function hasImplementationWrite(excerpt) {
  return /:=|\+=|-=|\*=|\/=|<<=|>>=|\|=|&=|\^=|\b[A-Za-z_]\w*\s*=(?!=)|(?:->|\.)[A-Za-z_]\w*\s*(?:=(?!=)|\+\+|--)|\]\s*(?:\+\+|--)|\b(?:Inc|Dec|SetStat|SetUnitStat)\s*\(|\boverlay_0388_0039\s*\(/.test(excerpt)
    || casWriteCall.test(excerpt);
}

function excerptDigest(excerpt) {
  return crypto.createHash('sha256').update(excerpt).digest('hex');
}

function readSourceSnapshot(absolute) {
  const text = fs.readFileSync(absolute, 'utf8');
  const cached = sourceSnapshotCache.get(absolute);
  if (cached && cached.text === text) return cached;
  const snapshot = { text, lines: text.split(/\r?\n/), spanIndexes: new Map() };
  sourceSnapshotCache.set(absolute, snapshot);
  return snapshot;
}

function stableSpanIndex(snapshot, lineCount) {
  if (snapshot.spanIndexes.has(lineCount)) return snapshot.spanIndexes.get(lineCount);
  const index = new Map();
  for (let offset = 0; offset + lineCount <= snapshot.lines.length; offset++) {
    const excerpt = snapshot.lines.slice(offset, offset + lineCount).join('\n');
    const prefix = excerptDigest(excerpt).slice(0, stableSpanPrefixLength);
    if (!index.has(prefix)) index.set(prefix, []);
    index.get(prefix).push({ start: offset + 1, end: offset + lineCount, excerpt });
  }
  snapshot.spanIndexes.set(lineCount, index);
  return index;
}

function parseSourceCitation(citation, root = repoRoot) {
  const trimmed = citation.trim();
  const isTable = trimmed.startsWith('TABLE=');
  const value = isTable ? trimmed.slice('TABLE='.length) : trimmed;
  const stableMatch = /^(.*)@span:(\d+):([0-9a-f]{24})$/.exec(value);
  const lineMatch = /^(.*):(\d+)-(\d+)$/.exec(value);
  if (!stableMatch && !lineMatch) throw new Error(`has malformed citation "${citation}"`);

  const sourcePath = normalizeRepoPath((stableMatch || lineMatch)[1]);
  const absolute = path.join(root, ...sourcePath.split('/'));
  if (!fs.existsSync(absolute)) throw new Error(`source does not exist: ${sourcePath}`);
  const snapshot = readSourceSnapshot(absolute);
  const sourceLines = snapshot.lines;

  if (stableMatch) {
    const lineCount = Number(stableMatch[2]);
    const digestPrefix = stableMatch[3];
    if (lineCount < 1 || lineCount > 40) {
      throw new Error(`stable span must contain 1-40 lines: ${citation}`);
    }
    const matches = stableSpanIndex(snapshot, lineCount).get(digestPrefix) || [];
    if (matches.length === 0) throw new Error(`stable span was not found: ${citation}`);
    if (matches.length > 1) throw new Error(`stable span is ambiguous (${matches.length} matches): ${citation}`);
    return { isTable, sourcePath, ...matches[0] };
  }

  const start = Number(lineMatch[2]);
  const end = Number(lineMatch[3]);
  if (start < 1 || end < start || end - start > 39) {
    throw new Error(`citation must be a valid narrow range (max 40 lines): ${citation}`);
  }
  if (end > sourceLines.length) {
    throw new Error(`source range exceeds ${sourcePath} (${sourceLines.length} lines)`);
  }
  return {
    isTable, sourcePath, start, end,
    excerpt: sourceLines.slice(start - 1, end).join('\n'),
  };
}

function makeStableSpanCitation(citation, root = repoRoot) {
  const resolved = parseSourceCitation(citation, root);
  const prefix = resolved.isTable ? 'TABLE=' : '';
  const absolute = path.join(root, ...resolved.sourcePath.split('/'));
  const snapshot = readSourceSnapshot(absolute);
  let start = resolved.start;
  let end = resolved.end;
  while (end - start < 40) {
    const excerpt = snapshot.lines.slice(start - 1, end).join('\n');
    const lineCount = end - start + 1;
    const digestPrefix = excerptDigest(excerpt).slice(0, stableSpanPrefixLength);
    const matches = stableSpanIndex(snapshot, lineCount).get(digestPrefix) || [];
    if (matches.length === 1) {
      return `${prefix}${resolved.sourcePath}@span:${lineCount}:${digestPrefix}`;
    }
    // Identical one-line assignments occur in some INI tables. Expand equally around the
    // reviewed range until its local section/record context makes the selector unique.
    if (start > 1) start--;
    if (end < snapshot.lines.length && end - start < 39) end++;
    if (start === 1 && end === snapshot.lines.length) break;
  }
  throw new Error(`cannot make a unique stable span (max 40 lines): ${citation}`);
}

function lineNumberAt(text, offset) {
  return text.slice(0, offset).split(/\r?\n/).length;
}

function discoverFormulaSites(file, text) {
  const sites = [];
  const patterns = [
    { kind: 'statStep', regex: /statStep\(\{\s*id:\s*'([^']+)'/g },
    { kind: 'attackSpecificStep', regex: /attackSpecificStep\(\s*'([^']+)'/g },
    { kind: 'base preparation', regex: /traceBasePreparation\(\s*'([^']+)'/g },
    { kind: 'chance delta', regex: /addChanceDelta\(\s*'([^']+)'/g },
  ];
  for (const { kind, regex } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      sites.push({ id: match[1], kind, line: lineNumberAt(text, match.index), file });
    }
  }
  const lines = text.split(/\r?\n/);
  function markerNear(lineIndex) {
    for (let index = Math.max(0, lineIndex - 2); index <= Math.min(lines.length - 1, lineIndex + 1); index++) {
      const match = /STAT-FORMULA\[([^\]]+)\]/.exec(lines[index]);
      if (match) return match[1];
    }
    return null;
  }
  lines.forEach((line, index) => {
    const functionMatch = /^function\s+([A-Za-z_$][\w$]*)\s*\(/.exec(line);
    if (functionMatch && directFunctionIds.has(functionMatch[1])) {
      sites.push({ id: directFunctionIds.get(functionMatch[1]), kind: 'direct function', line: index + 1, file });
    }
    if (/\babilityStep\s*\(/.test(line) && !/const\s+abilityStep\s*=/.test(line)) {
      const literal = /\babilityStep\(\s*'([^']+)'/.exec(line);
      const id = literal ? literal[1] : markerNear(index);
      if (!id) fail(`${file}:${index + 1} dynamic ability step needs an adjacent STAT-FORMULA id`);
      sites.push({ id, kind: 'ability step', line: index + 1, file });
    }
    if (/\bcase\s+'[^']+'\s*:/.test(line)) {
      const id = markerNear(index);
      if (!id) fail(`${file}:${index + 1} independently editable stat-table case needs an adjacent STAT-FORMULA id`);
      sites.push({ id, kind: 'stat table case', line: index + 1, file });
    }
    if (/addChanceContribution\(\s*`chance:\$\{event\.id\}`/.test(line)) {
      const id = markerNear(index);
      if (!id) fail(`${file}:${index + 1} dynamic chance contribution needs an adjacent STAT-FORMULA id`);
      sites.push({ id, kind: 'dynamic chance contribution', line: index + 1, file });
    }
    if (/chanceContributions\.map\(item\s*=>\s*statStep/.test(line)) {
      const id = markerNear(index);
      if (!id) fail(`${file}:${index + 1} dynamic chance projection needs an adjacent STAT-FORMULA id`);
      sites.push({ id, kind: 'dynamic chance projection', line: index + 1, file });
    }
  });

  let match;
  while ((match = directFormulaPattern.exec(text)) !== null) {
    const id = match[1];
    if (!sites.some(site => site.id === id && Math.abs(site.line - lineNumberAt(text, match.index)) <= 3)) {
      fail(`${file}:${lineNumberAt(text, match.index)} orphan STAT-FORMULA[${id}] marker`);
    }
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
  let resolved;
  try {
    resolved = parseSourceCitation(citation);
  } catch (error) {
    fail(`${comment.file}:${comment.line} ${error.message}`);
  }
  const { isTable, sourcePath, excerpt } = resolved;
  if (!allowedImplementationRoots.some(root => sourcePath.startsWith(root))) {
    fail(`${comment.file}:${comment.line} cites non-implementation source ${sourcePath}`);
  }
  if (forbiddenSourceSuffixes.some(suffix => sourcePath.toLowerCase().endsWith(suffix))) {
    fail(`${comment.file}:${comment.line} cites prose instead of implementation: ${sourcePath}`);
  }
  // A strong implementation citation must carry the eligibility/control-flow gate and the
  // resulting write/arithmetic in the cited range. Runtime-table citations are supplemental
  // and are identified explicitly with TABLE=, so they are checked for a concrete assignment.
  if (isTable) {
    if (!/^\s*[^;#\s][^=]*=.+$/m.test(excerpt)) {
      fail(`${comment.file}:${comment.line} runtime-table range lacks an assignment: ${citation}`);
    }
    return;
  }
  // A commented-out call is not the write it looks like, so a script excerpt is read as code only.
  const code = sourcePath.toLowerCase().endsWith('.cas') ? stripCasComments(excerpt) : excerpt;
  const hasGate = /\b(if|case|while|for)\b|\?\s*[^:]+:|\b(and|or)\b/i.test(code);
  const hasWrite = hasImplementationWrite(code);
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
  return { versions, citations };
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

function computeVerifiedBinding(versions, citations, root = repoRoot) {
  const sourceDigests = citations.map(citation => {
    const resolved = parseSourceCitation(citation, root);
    return excerptDigest(resolved.excerpt);
  });
  return crypto.createHash('sha256').update(JSON.stringify({ versions, citations, sourceDigests })).digest('hex');
}

function runAudit() {
  const calculatorDirectory = path.join(repoRoot, 'Calculator');
  for (const entry of fs.readdirSync(calculatorDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const file = `Calculator/${entry.name}`;
    // units_*.js are generated rosters and presets_*.js are numeric fixtures cut by ability
    // family; both are open-ended sets, so they are matched rather than listed one by one.
    if (calculatorFiles.includes(file) || excludedJavaScript.has(file)
        || /^Calculator\/(?:units_(?:mom|com|com2|warlord)|presets_[a-z_]+)\.js$/.test(file)) continue;
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
  const manifest = fs.existsSync(verifiedManifestPath)
    ? JSON.parse(fs.readFileSync(verifiedManifestPath, 'utf8')) : {};
  const seenVerified = new Set();
  for (const [id, comment] of commentsById) {
    if (!sitesById.has(id)) fail(`${comment.file}:${comment.line} PROVENANCE[${id}] has no formula site`);
    if (comment.body.startsWith('VERIFIED ')) {
      const parsed = validateVerifiedComment(comment);
      const expected = manifest[id];
      if (!expected) fail(`${comment.file}:${comment.line} VERIFIED ${id} lacks a formula-specific anchor manifest entry`);
      const binding = computeVerifiedBinding(parsed.versions, parsed.citations);
      if (binding !== expected) {
        fail(`${comment.file}:${comment.line} VERIFIED ${id} metadata/source content differs from its reviewed formula-specific anchor`);
      }
      seenVerified.add(id);
    }
    else if (comment.body.startsWith('UNVERIFIED ')) validateUnverifiedComment(comment);
    else fail(`${comment.file}:${comment.line} must be VERIFIED or UNVERIFIED`);
  }
  for (const id of Object.keys(manifest)) {
    if (!seenVerified.has(id)) fail(`reviewed anchor manifest has stale/non-VERIFIED entry ${id}`);
  }

  const unverified = comments.filter(comment => comment.body.startsWith('UNVERIFIED '));

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

module.exports = {
  calculatorFiles, computeVerifiedBinding, discoverFormulaSites, hasImplementationWrite,
  makeStableSpanCitation, parseSourceCitation, readProvenanceComments, runAudit, stripCasComments,
};
