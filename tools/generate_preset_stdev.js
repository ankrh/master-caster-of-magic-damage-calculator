'use strict';

// Writes the `sdDmgToA` / `sdDmgToB` fields into the preset fixture files.
// Run: `node tools/generate_preset_stdev.js`  (add `--check` to compare without writing).
//
// ## What this tool is, and what it is not
//
// A generated standard deviation is a **snapshot, not an oracle**. The corpus's means were authored
// against the binaries: a `dmgToB: 3.000` states arithmetic a citation implies, so a run that
// disagrees with it says the implementation is wrong. A value this tool writes says nothing of the
// kind. It is read off the current implementation, so all it can ever detect is that the
// implementation *moved* - never that it was right in the first place. That is legitimate for
// regression detection, which is what the corpus is for, and it is recorded in `TESTS.md` beside
// the corpus's other claims so that no later agent cites a spread as evidence of faithfulness.
//
// ## Why it must not touch a mean
//
// Regenerating the means from the implementation would convert 1,161 authored assertions into 1,161
// snapshots of whatever the code currently does, which is the corpus destroying itself. So this
// tool **halts** rather than writes if an evaluated mean disagrees with the stated one: a corpus
// that has already moved is a finding, and the fix is not to rebase it.
//
// ## How the rewrite is safe
//
// The fixture files are ~10,000 lines of hand-authored `desc` and `vacuity` prose. The rewrite is
// textual and touches exactly one line per fixture - the single-line `expected: { ... },` - and the
// mean's own *text* is carried across verbatim, so `3.000` stays `3.000` and never becomes `3`.
// Every other byte of the file is untouched. Three guards stand behind that: the fixture names read
// out of the text must be exactly the keys of `PRESETS`, the number of `expected` lines rewritten
// must equal the number of fixtures that state one, and no fixture may be declared twice.
//
// It is idempotent by construction - a block that already carries its spreads is rebuilt to the
// same text - which is what makes `--check` a determinism test rather than a diff of two runs.

const fs = require('fs');
const path = require('path');
const {
  defaultSelectedVersion, presetFixtureSources, repoRoot, loadPresetContext,
} = require('./calculator_sources');
const { ORIGIN, prepareRealm, evaluatePreset } = require('./preset_evaluation');

// The `expected: { ... },` line, which every fixture in the corpus states on one line. A fixture
// that ever states it across several would not match, and the "one rewrite per fixture" guard below
// is what turns that into a halt rather than a silent skip.
const EXPECTED_LINE = /^(\s*)expected: \{(.*)\},\s*$/;
// A fixture's own key: two spaces of indent inside `definePresets({ ... })`. Nested objects (`a:`,
// `b:`, `vacuity:`) are indented further, so they cannot be mistaken for one.
const FIXTURE_KEY = /^ {2}([A-Za-z0-9_$]+): \{\s*$/;
// Anything that *looks* like the start of an expectation, whether or not it is one this tool can
// rewrite. A line-oriented rewrite is blind to comments and template literals: a commented-out
// `expected: { dmgToB: 123.000 },` sitting above a real multi-line block is matched by
// `EXPECTED_LINE` while the real block is not, so the tool rewrites the comment, counts it, and
// leaves the expectation the runners actually read untouched (GPT review of F268.3, finding 4).
// Requiring exactly one loose match per fixture, and requiring it to be the strict one, is what
// makes that construct a halt instead of a silent miss. The corpus's `vacuity` prose says
// "version-dead is expected:" mid-sentence, which this does not match because it is anchored.
const LOOSE_EXPECTED = /^\s*expected\s*:/;

const SIDES = [
  { mean: 'dmgToA', sd: 'sdDmgToA', evaluated: 'sdToA' },
  { mean: 'dmgToB', sd: 'sdDmgToB', evaluated: 'sdToB' },
];

// The per-category and healing pairs (F268.7). Same shape, same generator, same caveat — a
// generated moment detects change and never correctness — and one rule of its own: **a pair whose
// two moments are both 0.000 is written as an absence**, because the readers compare an absent pair
// against zero anyway (`presetExpectation`, `Calculator/presets.js`, which halts on a pair stated as
// two zeros so that the two spellings cannot both exist). 84 of the corpus's 9,288 pairs survive
// that rule, which is what this row actually bought and is reported as such.
//
// The field names are duplicated from `presets.js` on purpose: this tool rewrites fixture *text*
// and never loads a fixture to decide what to write, so it cannot import the reader's list without
// the list ceasing to be an independent statement of the same names. `verifyWritten` below reloads
// the written files and compares what the reader sees against what this tool computed, which is
// where the two lists are checked against each other.
const CATEGORIES = [
  { field: 'regDmg', sd: 'sdRegDmg', metric: 'regularDamage', fallback: 'total' },
  { field: 'undDmg', sd: 'sdUndDmg', metric: 'undeadDamage', fallback: 'zero' },
  { field: 'irrDmg', sd: 'sdIrrDmg', metric: 'irreversibleDamage', fallback: 'zero' },
  { field: 'bonusHp', sd: 'sdBonusHp', metric: 'extraHits', fallback: 'zero' },
  { field: 'heal', sd: 'sdHeal', metric: 'healedDamage', fallback: 'zero' },
];
const CATEGORY_FIELDS = ['A', 'B'].flatMap(side => CATEGORIES.map(category => ({
  side,
  metric: category.metric,
  fallback: category.fallback,
  sideMean: `dmgTo${side}`,
  evaluatedMean: `dmgTo${side}`,
  evaluatedSd: side === 'A' ? 'sdToA' : 'sdToB',
  mean: `${category.field}To${side}`,
  sd: `${category.sd}To${side}`,
})));

const EXPECTED_KEYS = new Set([
  ...SIDES.flatMap(side => [side.mean, side.sd]),
  ...CATEGORY_FIELDS.flatMap(entry => [entry.mean, entry.sd]),
]);

// The pair a fixture should state for one category field, or `null` where it equals that field's
// default and is therefore written as an absence. Four of the five default to zero; `regularDamage`
// defaults to its own side's published total, and falls back to zero on a side stating no total.
// `presets.js` owns the rule and states why; this restates it because the tool rewrites fixture
// *text* and never loads a fixture to decide what to write. `verifyWritten` reloads the files and
// compares what the reader sees against what was computed, which is where the two are checked
// against each other.
function categoryDefault(evaluated, entry, statedMeanText) {
  const unstated = statedMeanText === undefined || statedMeanText === 'null'
    || statedMeanText === 'undefined';
  if (entry.fallback === 'total' && !unstated) {
    return {
      mean: parseFloat(evaluated[entry.evaluatedMean].toFixed(3)),
      sd: parseFloat(evaluated[entry.evaluatedSd].toFixed(3)),
    };
  }
  return { mean: 0, sd: 0 };
}

function categoryPair(evaluated, entry, statedMeanText) {
  const moments = evaluated.categories[entry.side][entry.metric];
  const mean = parseFloat(moments.mean.toFixed(3));
  const sd = parseFloat(moments.sd.toFixed(3));
  const fallback = categoryDefault(evaluated, entry, statedMeanText);
  if (mean === fallback.mean && sd === fallback.sd) return null;
  return { mean, sd };
}

// `runTests`' tolerance, the band a stated mean is checked against before anything is written.
const TOLERANCE = 0.002;

// The fixture files themselves, which is the manifest's fixture list without `test_tree.js`.
function fixtureFiles() {
  const files = presetFixtureSources().filter(file => /\/presets/.test(file));
  if (files.length < 2) {
    throw new Error(`generate_preset_stdev: the manifest lists ${files.length} preset fixture `
      + 'file(s), and the corpus is spread over seven. index.html is the single source for the '
      + 'file list, so a file dropped from it is a file this tool would silently not write.');
  }
  return files;
}

// Every fixture, evaluated once, independently, in the order the corpus states them. Independent
// application is `tools/preset_checks.js`' default model, so the numbers written here are the
// numbers that runner compares.
function evaluateCorpus() {
  const startVersion = defaultSelectedVersion();
  const { realm, presetVersions } = prepareRealm(startVersion);
  const moments = new Map();
  let withExpectation = 0;
  for (const name of Object.keys(realm.PRESETS)) {
    const preset = realm.PRESETS[name];
    const evaluated = evaluatePreset(realm, name, preset, {
      origin: ORIGIN, version: startVersion, presetVersions,
    });
    moments.set(name, evaluated);
    if (preset.expected) withExpectation += 1;
    // The mean is authored, not generated. A disagreement here means the corpus and the
    // implementation have already parted company, and writing a spread over that would bake the
    // disagreement in as if it had been expected all along.
    for (const side of SIDES) {
      const stated = (preset.expected || {})[side.mean];
      if (stated == null) continue;
      const error = Math.abs(evaluated[side.mean] - stated);
      if (!(error < TOLERANCE)) {
        throw new Error(`generate_preset_stdev: fixture '${name}' states ${side.mean}: ${stated} `
          + `and the implementation gives ${evaluated[side.mean]} (err ${error.toFixed(4)}). The `
          + 'means are authored against the binaries and this tool does not rebase them - a corpus '
          + 'that has already moved is a finding. Nothing was written.');
      }
    }
  }
  return { moments, corpusKeys: Object.keys(realm.PRESETS), withExpectation };
}

// Rebuild one `expected: { ... }` line. The stated means come across as the *text* they were
// written as; only the spreads are generated.
function rewriteExpected(name, indent, inner, evaluated) {
  const fields = new Map();
  for (const chunk of inner.split(',')) {
    const text = chunk.trim();
    if (!text) continue;
    const colon = text.indexOf(':');
    if (colon < 0) {
      throw new Error(`generate_preset_stdev: fixture '${name}' has an \`expected\` entry `
        + `'${text}' with no value.`);
    }
    fields.set(text.slice(0, colon).trim(), text.slice(colon + 1).trim());
  }
  for (const key of fields.keys()) {
    if (!EXPECTED_KEYS.has(key)) {
      throw new Error(`generate_preset_stdev: fixture '${name}' states '${key}' in its `
        + `\`expected\` block, and the block carries only ${[...EXPECTED_KEYS].join(', ')}.`);
    }
  }
  const parts = [];
  for (const side of SIDES) {
    if (!fields.has(side.mean)) {
      // A block that states a spread and no mean is the pairing broken the other way round.
      if (fields.has(side.sd)) {
        throw new Error(`generate_preset_stdev: fixture '${name}' states ${side.sd} and no `
          + `${side.mean}, so there is no mean for the spread to belong to.`);
      }
      continue;
    }
    const meanText = fields.get(side.mean);
    parts.push(`${side.mean}: ${meanText}`);
    // `presetExpectation` reads a side as *stated* by value, not by key presence, so a
    // `dmgToA: null` is an unstated side to both runners. Writing a real spread beside it would
    // create the exact pairing the readers halt on (GPT review of F268.3, finding 5): the two
    // definitions of "stated" have to agree, and the reader's is the one that counts.
    const unstated = meanText === 'null' || meanText === 'undefined';
    parts.push(`${side.sd}: ${unstated ? meanText : evaluated[side.evaluated].toFixed(3)}`);
  }
  // The category pairs follow the two sides, in one fixed order, and are regenerated outright
  // rather than carried across as text: unlike a mean, every one of them is this tool's own
  // output. A stale pair a fixture happens to carry is therefore dropped when the quantity
  // becomes zero, which is the same edit as writing it when it becomes non-zero.
  for (const entry of CATEGORY_FIELDS) {
    const pair = categoryPair(evaluated, entry, fields.get(entry.sideMean));
    if (!pair) continue;
    parts.push(`${entry.mean}: ${pair.mean.toFixed(3)}`);
    parts.push(`${entry.sd}: ${pair.sd.toFixed(3)}`);
  }
  if (parts.length === 0) return `${indent}expected: {},`;
  return `${indent}expected: { ${parts.join(', ')} },`;
}

function main() {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg !== '--check') {
      throw new Error(`generate_preset_stdev: '${arg}' is not one of --check.`);
    }
  }
  const checkOnly = args.includes('--check');

  const { moments, corpusKeys, withExpectation } = evaluateCorpus();

  const seen = new Set();
  const changedFiles = [];
  const pending = [];
  let rewritten = 0;
  let differing = 0;

  for (const file of fixtureFiles()) {
    const absolute = path.join(repoRoot, ...file.split('/'));
    const original = fs.readFileSync(absolute, 'utf8');
    const lines = original.split('\n');
    let current = null;
    let changed = false;
    // Two passes over the fixture's own lines rather than one over the file: the ambiguity guard
    // has to see *every* candidate inside a fixture before rewriting any of them, which a
    // rewrite-as-you-go walk cannot (it has already written by the time the second candidate
    // appears).
    let candidates = [];
    const closeFixture = () => {
      if (!current) { candidates = []; return; }
      if (candidates.length !== 1) {
        throw new Error(`generate_preset_stdev: fixture '${current}' (${file}) has `
          + `${candidates.length} line(s) that look like an \`expected\` block, at `
          + `${candidates.map(c => c.line).join(', ') || 'no line'}. Exactly one is expected, and `
          + 'this tool rewrites text: a commented-out or quoted expectation beside the real one '
          + 'would be rewritten in its place, and a block spanning several lines would be missed '
          + 'entirely. Neither is silently guessed at.');
      }
      const only = candidates[0];
      const match = EXPECTED_LINE.exec(only.text);
      if (!match) {
        throw new Error(`generate_preset_stdev: fixture '${current}' states its \`expected\` `
          + `block at ${file}:${only.line} in a form this tool does not rewrite `
          + `(${only.text.trim()}). It must be one line, opened and closed, ending in \`},\`.`);
      }
      const evaluated = moments.get(current);
      if (!evaluated) {
        throw new Error(`generate_preset_stdev: '${current}' was read out of ${file}:${only.line} `
          + 'and is not a key of PRESETS. The fixture text and the loaded corpus disagree.');
      }
      const replacement = rewriteExpected(current, match[1], match[2], evaluated);
      rewritten += 1;
      if (replacement !== lines[only.index]) {
        differing += 1;
        lines[only.index] = replacement;
        changed = true;
      }
      candidates = [];
    };
    for (let i = 0; i < lines.length; i++) {
      const key = FIXTURE_KEY.exec(lines[i]);
      if (key) {
        if (current && candidates.length) closeFixture();
        if (seen.has(key[1])) {
          throw new Error(`generate_preset_stdev: '${key[1]}' is declared twice in the fixture `
            + `sources (${file}:${i + 1}).`);
        }
        seen.add(key[1]);
        current = key[1];
        candidates = [];
        continue;
      }
      if (!LOOSE_EXPECTED.test(lines[i])) continue;
      if (!current) {
        throw new Error(`generate_preset_stdev: ${file}:${i + 1} states an \`expected\` block `
          + 'that follows no fixture key, so the line cannot be attributed to a fixture.');
      }
      candidates.push({ index: i, line: i + 1, text: lines[i] });
    }
    if (current && candidates.length) closeFixture();
    current = null;
    if (changed) {
      changedFiles.push(file);
      pending.push({ absolute, text: lines.join('\n') });
    }
  }

  // The text and the loaded corpus must name the same fixtures. A fixture file dropped from the
  // manifest, or a key the regex failed to read, would otherwise leave part of the corpus without
  // a spread and report a tidy number for the rest.
  const missing = corpusKeys.filter(name => !seen.has(name));
  const extra = [...seen].filter(name => !moments.has(name));
  if (missing.length || extra.length) {
    throw new Error(`generate_preset_stdev: the fixture text names ${seen.size} fixtures and `
      + `PRESETS holds ${corpusKeys.length} - ${missing.length} in PRESETS and not in the text `
      + `[${missing.slice(0, 8).join(', ')}], ${extra.length} in the text and not in PRESETS `
      + `[${extra.slice(0, 8).join(', ')}].`);
  }
  if (rewritten !== withExpectation) {
    throw new Error(`generate_preset_stdev: ${rewritten} \`expected\` line(s) were rebuilt and `
      + `${withExpectation} fixture(s) state an \`expected\` block. A fixture whose block spans `
      + 'more than one line would be skipped exactly like this.');
  }

  const summary = {
    mode: checkOnly ? 'check' : 'write',
    fixtures: corpusKeys.length,
    expectedBlocks: rewritten,
    [checkOnly ? 'linesThatWouldChange' : 'linesChanged']: differing,
    files: changedFiles,
  };
  if (checkOnly) {
    console.log(JSON.stringify(summary));
    if (differing > 0) {
      console.error(`generate_preset_stdev --check: ${differing} \`expected\` line(s) differ from `
        + 'what this implementation produces. Either a fixture is stale or the implementation '
        + 'moved; `node tools/generate_preset_stdev.js` writes the current values.');
      process.exitCode = 1;
    }
    return;
  }
  for (const write of pending) fs.writeFileSync(write.absolute, write.text);
  const verified = verifyWritten(moments);
  summary.verified = verified.moments;
  summary.verifiedCategoryPairs = verified.categoryPairs;
  console.log(JSON.stringify(summary));
}

// The catch-all behind every textual guard above: reload the fixture *files* into a fresh context
// and check that the corpus the runners will read now carries the generated values. A rewrite that
// landed on a comment, on a string, or on the wrong fixture passes every count and every regex and
// fails here, because here the question is not "did a line change" but "does the object the
// runners read state what this tool computed" (GPT review of F268.3, finding 4).
function verifyWritten(moments) {
  const context = loadPresetContext();
  const written = require('vm').runInContext('PRESETS', context);
  const names = Object.keys(written);
  if (names.length !== moments.size) {
    throw new Error(`generate_preset_stdev: the files just written load ${names.length} fixtures `
      + `and ${moments.size} were evaluated.`);
  }
  let checked = 0;
  let checkedCategories = 0;
  for (const name of names) {
    const expected = written[name].expected || {};
    const evaluated = moments.get(name);
    if (!evaluated) {
      throw new Error(`generate_preset_stdev: the files just written carry '${name}', which was `
        + 'not evaluated.');
    }
    for (const side of SIDES) {
      if (expected[side.mean] == null) {
        if (expected[side.sd] != null) {
          throw new Error(`generate_preset_stdev: after writing, fixture '${name}' states `
            + `${side.sd} with no ${side.mean}.`);
        }
        continue;
      }
      const want = parseFloat(evaluated[side.evaluated].toFixed(3));
      if (expected[side.sd] !== want) {
        throw new Error(`generate_preset_stdev: after writing, fixture '${name}' states `
          + `${side.sd}: ${expected[side.sd]} and this run computed ${want}. The rewrite did not `
          + 'reach the expectation the runners read - a commented-out or quoted `expected` line '
          + 'beside the real one does exactly this.');
      }
      checked += 1;
    }
    // The category pairs, verified the same way and with the absences verified too: a pair this
    // tool decided to omit must be *absent* from the object the runners load, because an absence
    // is what makes them compare it against zero. A rewrite that dropped a non-zero pair, or that
    // left a stale zero pair standing, fails here.
    for (const entry of CATEGORY_FIELDS) {
      const statedMeanText = expected[entry.sideMean] == null
        ? 'null' : String(expected[entry.sideMean]);
      const pair = categoryPair(evaluated, entry, statedMeanText);
      if (!pair) {
        if (expected[entry.mean] != null || expected[entry.sd] != null) {
          throw new Error(`generate_preset_stdev: after writing, fixture '${name}' still states `
            + `${entry.mean}/${entry.sd} and this run computed a zero pair, which is written as `
            + 'an absence.');
        }
        continue;
      }
      if (expected[entry.mean] !== pair.mean || expected[entry.sd] !== pair.sd) {
        throw new Error(`generate_preset_stdev: after writing, fixture '${name}' states `
          + `${entry.mean}: ${expected[entry.mean]}, ${entry.sd}: ${expected[entry.sd]} and this `
          + `run computed ${pair.mean} / ${pair.sd}. The rewrite did not reach the expectation the `
          + 'runners read.');
      }
      checkedCategories += 1;
    }
  }
  if (checkedCategories === 0) {
    throw new Error('generate_preset_stdev: the verification pass compared no category pair, so '
      + 'the fields F268.7 added are not in the object the runners read at all.');
  }
  if (checked === 0) {
    throw new Error('generate_preset_stdev: the verification pass compared no spread, so it '
      + 'proves nothing about what was written.');
  }
  return { moments: checked, categoryPairs: checkedCategories };
}

main();
