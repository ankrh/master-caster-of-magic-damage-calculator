'use strict';

// The control-path sample: which presets `tests/preset-equivalence-gate.spec.js` drives through the real DOM.
//
// Why a sample is safe here is that two other suites run the whole corpus, and `TESTS.md`, section
// *The preset corpus*, is the single home for that division of labour — it is not restated here.
// What this file owes the reader is the selection rule, below.
//
// The sample is **derived, not listed**. Every fixture contributes a set of tokens naming the
// control-path facts it states — its version, its fixture file, each top-level and per-side field
// it sets, each enumerated (string or boolean) value of those, each ability and modern-attack row
// by name and by the kind of value it holds, and the magnitude bucket of each expected mean. A
// greedy set cover over that vocabulary picks the fixtures. A fixture stating a control nothing
// else states therefore joins the sample by itself, and a token no fixture can cover halts the run
// rather than being dropped — which is the failure mode a hardcoded list has instead.
//
// What the sample cannot speak for, and does not claim to: a wrong number for a fixture outside it,
// and a control-path divergence outside it. Both are why the other two suites run all 1,161 — if
// either stops doing so, this stops being a sample of anything.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const {
  loadCalculatorContext, presetFixtureSources, repoRoot, defaultSelectedVersion,
} = require('./calculator_sources');

// A per-side field whose sub-keys are one control each. The sub-key name is not the interesting
// fact there; the kind of value the row holds is, because that is what the calcKey merge reads.
const ROW_MAPS = new Set(['abilities', 'modernAttacks']);

// Top-level field names carrying no control-path fact of their own.
const IGNORED_TOP = new Set(['desc', 'expected', 'a', 'b']);

// Load the fixture sources one at a time, so each preset key is attributed to the file that
// defined it. `index.html`'s manifest is the single home for that list; this reads it in order
// rather than restating which fixture files exist.
function loadCorpus() {
  const context = loadCalculatorContext();
  const files = presetFixtureSources();
  const fileOf = Object.create(null);
  let seen = new Set();
  for (const file of files) {
    const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
    vm.runInContext(source, context, { filename: file });
    const presets = vm.runInContext('typeof PRESETS === "object" ? PRESETS : null', context);
    if (!presets) continue;
    for (const key of Object.keys(presets)) {
      if (!seen.has(key)) fileOf[key] = file;
    }
    seen = new Set(Object.keys(presets));
  }
  const PRESETS = vm.runInContext('PRESETS', context);
  const TEST_TREE = vm.runInContext('TEST_TREE', context);
  const presetVersions = vm.runInContext('presetVersionsFromTestTree', context)(TEST_TREE);
  const unattributed = Object.keys(PRESETS).filter(name => !fileOf[name]);
  if (unattributed.length) {
    throw new Error('controlPathSample: '
      + `${unattributed.length} preset(s) belong to no fixture source in the index.html manifest `
      + `[${unattributed.slice(0, 8).join(', ')}]. The manifest is the single home for that list, `
      + 'so a fixture it cannot attribute means the loader and the manifest disagree.');
  }
  return { PRESETS, presetVersions, fileOf, files };
}

// How a rendered mean is shaped, which is what the render-and-read-back leg is sensitive to:
// zero, a fraction, an integer, and the widths where `toFixed(3)` and `parseFloat` could part.
function magnitudeBucket(value) {
  if (value == null) return 'unstated';
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`controlPathSample: an expected mean is ${JSON.stringify(value)}, which is `
      + 'not a finite number. A fixture states a number or states nothing.');
  }
  if (value === 0) return 'zero';
  const fractional = Math.abs(value - Math.round(value)) > 1e-9;
  const size = Math.abs(value) >= 100 ? 'ge100' : Math.abs(value) >= 10 ? 'ge10' : 'lt10';
  return `${size}:${fractional ? 'frac' : 'int'}`;
}

function tokensFor(preset, version, file) {
  const tokens = new Set([`${version}|file:${file}`]);
  for (const [key, value] of Object.entries(preset)) {
    if (IGNORED_TOP.has(key)) continue;
    tokens.add(`${version}|top:${key}`);
    if (typeof value === 'string' || typeof value === 'boolean') {
      tokens.add(`${version}|top:${key}=${value}`);
    }
  }
  for (const side of ['a', 'b']) {
    for (const [key, value] of Object.entries(preset[side] || {})) {
      tokens.add(`${version}|${side}:${key}`);
      if (ROW_MAPS.has(key)) {
        // The row *name* is part of the control-path fact, not only the kind of value it holds:
        // `abilities.longRange` and `abilities.lucky` are different controls with different
        // writers, and a vocabulary that saw only `boolean` could not tell them apart (GPT review
        // of F260.10, finding 2 — the two shipped Long Range fixtures were unsampled because of
        // it). Row tokens are **not** version-scoped: what the row means per version is the
        // equivalence gate's subject over all 1,161 fixtures, and scoping these by version put the
        // sample at 531 of 1,161, which is not a sample.
        for (const [rowKey, rowValue] of Object.entries(value || {})) {
          tokens.add(`${version}|${side}:${key}#${typeof rowValue}`);
          tokens.add(`*|row:${key}.${rowKey}#${typeof rowValue}`);
          if (typeof rowValue === 'string' || typeof rowValue === 'boolean') {
            tokens.add(`*|row:${key}.${rowKey}=${rowValue}`);
          } else if (rowValue && typeof rowValue === 'object') {
            for (const [subKey, subValue] of Object.entries(rowValue)) {
              tokens.add(`*|row:${key}.${rowKey}.${subKey}#${typeof subValue}`);
              if (typeof subValue === 'string' || typeof subValue === 'boolean') {
                tokens.add(`*|row:${key}.${rowKey}.${subKey}=${subValue}`);
              }
            }
          }
        }
      } else if (value && typeof value === 'object') {
        for (const sub of Object.keys(value)) tokens.add(`${version}|${side}:${key}.${sub}`);
      } else if (typeof value === 'string' || typeof value === 'boolean') {
        tokens.add(`${version}|${side}:${key}=${value}`);
      }
    }
  }
  const expected = preset.expected || {};
  for (const field of ['dmgToA', 'dmgToB']) {
    tokens.add(`${version}|expected:${field}:${magnitudeBucket(expected[field])}`);
  }
  return tokens;
}

function controlPathSample() {
  const { PRESETS, presetVersions, fileOf } = loadCorpus();
  const startVersion = defaultSelectedVersion();
  // Sorted, so ties in the greedy step below break the same way on every run.
  const names = Object.keys(PRESETS).sort();
  if (!names.length) throw new Error('controlPathSample: the corpus is empty.');

  const tokensByName = new Map();
  const versionOf = Object.create(null);
  for (const name of names) {
    const preset = PRESETS[name];
    if (!preset.expected) continue;         // `runTests` skips these, so they cannot be sampled
    const version = preset.version || presetVersions[name] || startVersion;
    versionOf[name] = version;
    tokensByName.set(name, tokensFor(preset, version, fileOf[name]));
  }
  const sampleable = [...tokensByName.keys()];

  const vocabulary = new Set();
  for (const set of tokensByName.values()) for (const token of set) vocabulary.add(token);

  const remaining = new Set(vocabulary);
  const chosen = new Set();
  while (remaining.size) {
    let best = null;
    let bestGain = 0;
    for (const name of sampleable) {
      if (chosen.has(name)) continue;
      let gain = 0;
      for (const token of tokensByName.get(name)) if (remaining.has(token)) gain += 1;
      if (gain > bestGain) { bestGain = gain; best = name; }
    }
    if (!best) {
      throw new Error('controlPathSample: '
        + `${remaining.size} control-path token(s) are stated by no fixture that can be sampled `
        + `[${[...remaining].slice(0, 8).join(', ')}]. Every token comes from a fixture, so this `
        + 'means the cover and the vocabulary were built from different corpora.');
    }
    chosen.add(best);
    for (const token of tokensByName.get(best)) remaining.delete(token);
  }

  // Nothing checks the checker, so this does: a vocabulary that quietly lost a token family — a
  // collapsed `magnitudeBucket`, a `tokensFor` that stopped walking one side — still produces a
  // green cover over what is left, and a smaller sample. Each kind must be present and must
  // discriminate, which is the property that makes it worth covering at all.
  const kinds = new Map();
  for (const token of vocabulary) {
    const kind = /^[^|]+\|([a-z]+:)/.exec(token);
    if (!kind) throw new Error(`controlPathSample: the token ${token} names no kind.`);
    if (!kinds.has(kind[1])) kinds.set(kind[1], new Set());
    kinds.get(kind[1]).add(token.slice(token.indexOf('|') + 1));
  }
  // An independent walk of the corpus, asking only *which paths ever hold a string or boolean*.
  // It shares no code with `tokensFor`, so deleting `tokensFor`'s enumeration branches leaves this
  // list intact and the mismatch is loud rather than a quietly smaller sample (GPT review of
  // F260.10, finding 3: disabling both branches took the sample from 236/876 to 77/300 with every
  // other guard still green).
  const enumeratedPaths = new Set();
  for (const name of sampleable) {
    const preset = PRESETS[name];
    for (const [key, value] of Object.entries(preset)) {
      if (IGNORED_TOP.has(key)) continue;
      if (typeof value === 'string' || typeof value === 'boolean') {
        enumeratedPaths.add(`top:${key}`);
      }
    }
    for (const side of ['a', 'b']) {
      for (const [key, value] of Object.entries(preset[side] || {})) {
        if (ROW_MAPS.has(key)) {
          for (const [rowKey, rowValue] of Object.entries(value || {})) {
            if (typeof rowValue === 'string' || typeof rowValue === 'boolean') {
              enumeratedPaths.add(`row:${key}.${rowKey}`);
            } else if (rowValue && typeof rowValue === 'object') {
              for (const [subKey, subValue] of Object.entries(rowValue)) {
                if (typeof subValue === 'string' || typeof subValue === 'boolean') {
                  enumeratedPaths.add(`row:${key}.${rowKey}.${subKey}`);
                }
              }
            }
          }
        } else if (typeof value === 'string' || typeof value === 'boolean') {
          enumeratedPaths.add(`${side}:${key}`);
        }
      }
    }
  }
  const valued = new Set();
  for (const token of vocabulary) {
    const match = /\|((?:top|row|a|b):[^=]+)=/.exec(token);
    if (match) valued.add(match[1]);
  }
  const unvalued = [...enumeratedPaths].filter(pathName => !valued.has(pathName));
  if (unvalued.length) {
    throw new Error(`controlPathSample: ${unvalued.length} field path(s) hold an enumerated value `
      + `somewhere in the corpus but contribute no value token [${unvalued.slice(0, 8).join(', ')}]. `
      + 'The cover then cannot tell one option of that control from another.');
  }

  // `expected:` needs the sharper form of the same question. Its two field names alone give the
  // kind two distinct values, so a `magnitudeBucket` that collapsed to a constant would pass the
  // cardinality check below while covering nothing — the render leg is the one thing this sample
  // exists for, so the *bucket labels* are counted, not the tokens carrying them.
  const buckets = new Set();
  for (const token of vocabulary) {
    const match = /\|expected:[^:]+:(.+)$/.exec(token);
    if (match) buckets.add(match[1]);
  }
  if (buckets.size < 3) {
    throw new Error(`controlPathSample: the corpus's expected means fall into ${buckets.size} `
      + `magnitude bucket(s) [${[...buckets].join(', ')}]. Fewer than three means the render leg `
      + 'is being sampled over one shape of number, which is what the buckets exist to prevent.');
  }

  for (const kind of ['file:', 'top:', 'a:', 'b:', 'row:', 'expected:']) {
    const values = kinds.get(kind);
    if (!values || values.size < 2) {
      throw new Error(`controlPathSample: the token kind '${kind}' has `
        + `${values ? values.size : 0} distinct value(s) across the whole corpus, so it cannot `
        + 'discriminate between fixtures. A token family that stopped being emitted shrinks the '
        + 'sample silently.');
    }
  }

  // Everything below reads `names` — the array actually returned — and not the working set, so
  // trimming the result after the guards have run cannot pass (GPT review of F260.10, finding 3:
  // `names: picked.sort().slice(0, 1)` returned one fixture while still reporting five versions,
  // seven files and a 1,161 corpus).
  const sampleNames = [...chosen].sort();

  // The returned names must still cover the whole vocabulary. This is the guard the greedy loop
  // cannot supply for itself: the loop covers what it picks, this checks what is handed back.
  const covered = new Set();
  for (const name of sampleNames) for (const token of tokensByName.get(name)) covered.add(token);
  const dropped = [...vocabulary].filter(token => !covered.has(token));
  if (dropped.length) {
    throw new Error(`controlPathSample: the returned sample covers ${covered.size} of `
      + `${vocabulary.size} control-path tokens — ${dropped.length} are stated by no sampled `
      + `fixture [${dropped.slice(0, 8).join(', ')}].`);
  }

  // Fail loud rather than quietly sampling four of the five rule sets, or six of the seven files.
  const picked = sampleNames;
  const sampledVersions = new Set(picked.map(name => versionOf[name]));
  const sampledFiles = new Set(picked.map(name => fileOf[name]));
  const corpusVersions = new Set(sampleable.map(name => versionOf[name]));
  for (const [what, sampled, whole] of [
    ['game version', sampledVersions, corpusVersions],
    // Only the files that actually define a sampleable fixture; `presets.js` and `test_tree.js`
    // are in the same manifest list and define none.
    ['fixture source', sampledFiles, new Set(sampleable.map(name => fileOf[name]))],
  ]) {
    const missed = [...whole].filter(value => !sampled.has(value));
    if (missed.length) {
      throw new Error(`controlPathSample: the sample covers no fixture from ${missed.length} `
        + `${what}(s) [${missed.join(', ')}], so the control path is unexercised there.`);
    }
  }

  // `meta` is per *returned* name, so a caller can recompute the spread from `names` alone rather
  // than trusting the summary beside it. That is the last guard the selector cannot supply for
  // itself: every check above runs before the return, so trimming `names` at the return escapes
  // all of them (GPT review of F260.10, finding 3; probe R2). `tests/preset-equivalence-gate.spec.js` recomputes.
  const meta = Object.create(null);
  for (const name of sampleNames) meta[name] = { version: versionOf[name], file: fileOf[name] };
  return {
    names: sampleNames,
    meta,
    tokenCount: vocabulary.size,
    corpusSize: names.length,
    sampleableSize: sampleable.length,
    versions: [...sampledVersions].sort(),
    files: [...sampledFiles].sort(),
  };
}

module.exports = { controlPathSample, magnitudeBucket };

if (require.main === module) {
  const sample = controlPathSample();
  console.log(JSON.stringify({
    sample: sample.names.length,
    tokens: sample.tokenCount,
    corpus: sample.corpusSize,
    sampleable: sample.sampleableSize,
    versions: sample.versions,
    files: sample.files,
  }, null, 2));
  console.log(sample.names.join('\n'));
}
