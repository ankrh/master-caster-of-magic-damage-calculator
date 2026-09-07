// --- Test Presets ---
//
// The numeric preset fixtures live in the presets_*.js files, cut by ability family; this file
// owns the object they merge into. index.html's manifest is the single home for which parts
// exist and in what order, so adding one is an edit there and nowhere else.
//
// The parts are data-scope="page" because the page is their only *shipped* consumer; they are
// plain data and need no DOM, so a Node run loads them too (`tools/calculator_sources.js`). Two
// runners evaluate the corpus — the page's runTests() and `tools/preset_checks.js`, through the
// same translation — and `TESTS.md` is the single home for which of them carries which claim.
const PRESETS = {};

// A key defined twice used to be invisible — the later object-literal entry just won. Across
// files it would be invisible in the same way, and would silently retire a regression, so the
// merge refuses it.
function definePresets(entries) {
  for (const [key, preset] of Object.entries(entries)) {
    if (key in PRESETS) throw new Error(`definePresets: duplicate preset key ${key}`);
    PRESETS[key] = preset;
  }
}

// --- What a fixture's `expected` block states -------------------------------------------------
//
// Two runners compare this corpus — the page's `runTests` (`ui_state.js`) and
// `tools/preset_checks.js` — and F260 spent ten subtasks closing the ways they could drift apart.
// The *comparison* is deliberately restated in each, pinned by literal self-checks; what is shared
// is this reader, because the block's shape is the half a new field can silently change in one
// runner and not the other.
//
// Each side states a pair: the mean of the total damage distribution and its standard deviation.
// The pair is mandatory, not optional. A fixture may state one side or both — 16 shipped fixtures
// state no attacker damage — but a side that states a mean and no standard deviation halts the
// run. That is the whole defence against silent reduction: F260.9's review found that an `expected`
// block with no numbers counted as a passing check, so an `sdDmgToB` that could simply be dropped
// would take its comparison with it and leave a green run behind.
const PRESET_EXPECTATION_SIDES = [
  { side: 'A', mean: 'dmgToA', sd: 'sdDmgToA' },
  { side: 'B', mean: 'dmgToB', sd: 'sdDmgToB' },
];

// --- The per-category and healing quantities (F268.7) ------------------------------------------
//
// Four more pairs per side, over quantities a *total* cannot see: misfile irrecoverable damage as
// normal, or drop a healing amount from its category, and the total damage to each side does not
// move — so neither `dmgToB` nor `sdDmgToB` moves either, and the corpus is silent. These four are
// what breaks that silence. `metric` names the key `resolveCombat` publishes them under
// (`COMBAT_CATEGORY_KEYS`, `Calculator/combat_state.js`), which is also why `regularDamage` is not
// one of them; that file states the reason.
//
// **A zero pair is written as an absence, and an absence is an assertion.** Every one of these
// quantities is zero unless a rider in the exchange writes it, and the corpus is overwhelmingly
// exchanges where none does: 84 of the 9,288 possible pairs are non-zero. Stating the other 9,204
// as literal `0` in the fixture text would be ~18,000 characters of noise that also reads as a
// measurement rather than an absence. So the convention is the other way round: a pair is written
// only where it is non-zero, and where it is not written **both moments are compared against zero
// anyway**. Absence is therefore never "not checked" — a rider that started booking undead damage
// in an exchange that should have none fails in every fixture that exchange appears in, not only
// in the ones someone remembered to annotate. `presetExpectation` refuses a pair stated as two
// zeros, because that would be a third spelling of the same claim.
//
// **Two defaults, because the quantities have two shapes — not two spellings of one claim.** Four of
// the five are booked only by a rider that writes them, so their default is zero. `regularDamage` is
// the bucket everything else falls into, so its default is *that side's own published total*: it
// equals `dmgToA`/`sdDmgToA` (or the B pair) in 2,245 of the corpus's 2,322 sides and differs in 77.
// Giving it the zero default instead would write it out 1,113 times to say what `dmgTo…` already
// says. A side that states no total has no total to default to, so its regular pair falls back to
// zero like the rest. Either way a stated pair that merely restates its own default halts.
const PRESET_CATEGORY_QUANTITIES = [
  { field: 'regDmg', metric: 'regularDamage', default: 'total' },
  { field: 'undDmg', metric: 'undeadDamage', default: 'zero' },
  { field: 'irrDmg', metric: 'irreversibleDamage', default: 'zero' },
  { field: 'bonusHp', metric: 'extraHits', default: 'zero' },
  { field: 'heal', metric: 'healedDamage', default: 'zero' },
];

const PRESET_CATEGORY_FIELDS = PRESET_EXPECTATION_SIDES.flatMap(entry =>
  PRESET_CATEGORY_QUANTITIES.map(quantity => ({
    side: entry.side,
    metric: quantity.metric,
    fallback: quantity.default,
    sideMean: entry.mean,
    sideSd: entry.sd,
    mean: `${quantity.field}To${entry.side}`,
    sd: `sd${quantity.field.charAt(0).toUpperCase()}${quantity.field.slice(1)}To${entry.side}`,
  })));

// What an *unwritten* pair asserts, which is the whole of what the corpus's 9,000-odd absences buy.
// `read` is the partially built expectation, so the two totals are already validated when this runs.
function presetCategoryDefault(entry, read) {
  if (entry.fallback === 'total' && read[entry.sideMean] != null) {
    return { mean: read[entry.sideMean], sd: read[entry.sideSd] };
  }
  return { mean: 0, sd: 0 };
}

const PRESET_EXPECTATION_KEYS = new Set([
  ...PRESET_EXPECTATION_SIDES.flatMap(entry => [entry.mean, entry.sd]),
  ...PRESET_CATEGORY_FIELDS.flatMap(entry => [entry.mean, entry.sd]),
]);

// Returns `{ dmgToA, sdDmgToA, dmgToB, sdDmgToB, comparedA, comparedB, comparisons }`, with a
// `null` for every number the fixture does not state. `comparisons` counts the numbers a runner
// will actually compare, which is what both runners report and what makes a corpus that quietly
// stopped checking anything impossible to mistake for a passing one.
function presetExpectation(name, preset) {
  const expected = (preset && preset.expected) || {};
  for (const key of Object.keys(expected)) {
    if (!PRESET_EXPECTATION_KEYS.has(key)) {
      throw new Error(`presetExpectation: fixture '${name}' states '${key}' in its \`expected\` `
        + `block, and the block carries only ${[...PRESET_EXPECTATION_KEYS].join(', ')}. A `
        + 'misspelled field would otherwise be an expectation nothing compares.');
    }
  }
  const read = { comparisons: 0 };
  for (const entry of PRESET_EXPECTATION_SIDES) {
    const mean = expected[entry.mean];
    const sd = expected[entry.sd];
    const hasMean = mean != null;
    const hasSd = sd != null;
    if (hasMean !== hasSd) {
      throw new Error(`presetExpectation: fixture '${name}' states `
        + `${hasMean ? entry.mean : entry.sd} and not ${hasMean ? entry.sd : entry.mean}. Side `
        + `${entry.side} states a mean and a standard deviation together or states neither — a `
        + 'lone mean is a comparison silently halved, which is what this pairing exists to stop. '
        + '`node tools/generate_preset_stdev.js` writes the missing value.');
    }
    if (hasMean && (typeof mean !== 'number' || !Number.isFinite(mean))) {
      throw new Error(`presetExpectation: fixture '${name}' states ${entry.mean}: `
        + `${String(mean)}, which is not a finite number.`);
    }
    if (hasSd && (typeof sd !== 'number' || !Number.isFinite(sd) || sd < 0)) {
      throw new Error(`presetExpectation: fixture '${name}' states ${entry.sd}: ${String(sd)}, `
        + 'which is not a finite number at or above zero.');
    }
    read[entry.mean] = hasMean ? mean : null;
    read[entry.sd] = hasSd ? sd : null;
    read[`compared${entry.side}`] = hasMean;
    read.comparisons += hasMean ? 2 : 0;
  }
  read.categories = {};
  read.categoryComparisons = 0;
  read.categoryStated = 0;
  read.categoryStatedFields = [];
  for (const entry of PRESET_CATEGORY_FIELDS) {
    const mean = expected[entry.mean];
    const sd = expected[entry.sd];
    const hasMean = mean != null;
    const hasSd = sd != null;
    if (hasMean !== hasSd) {
      throw new Error(`presetExpectation: fixture '${name}' states `
        + `${hasMean ? entry.mean : entry.sd} and not ${hasMean ? entry.sd : entry.mean}. A `
        + 'category quantity states a mean and a standard deviation together or states neither, '
        + 'for the same reason the two sides do: a lone mean is a comparison silently halved. '
        + '`node tools/generate_preset_stdev.js` writes the missing value.');
    }
    for (const [key, value] of [[entry.mean, mean], [entry.sd, sd]]) {
      if (value == null) continue;
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`presetExpectation: fixture '${name}' states ${key}: ${String(value)}, `
          + 'which is not a finite number at or above zero. Damage in a category, healing and '
          + 'bonus HP are all non-negative.');
      }
    }
    const fallback = presetCategoryDefault(entry, read);
    if (hasMean && mean === fallback.mean && sd === fallback.sd) {
      throw new Error(`presetExpectation: fixture '${name}' states ${entry.mean}: ${mean} and `
        + `${entry.sd}: ${sd}, which is exactly what an *unwritten* pair already asserts for this `
        + `field (${fallback.mean} / ${fallback.sd}). A pair is written only where it departs from `
        + 'its default, so this states one claim a second way — and two spellings of one claim are '
        + 'two things a generator and a reader can come to disagree about.');
    }
    // Absence is an expectation of zero, not an absent expectation. Both moments are compared
    // either way, which is what makes the omission a compression of the corpus rather than a
    // hole in it.
    read.categories[entry.mean] = {
      side: entry.side,
      metric: entry.metric,
      meanField: entry.mean,
      sdField: entry.sd,
      stated: hasMean,
      mean: hasMean ? mean : fallback.mean,
      sd: hasSd ? sd : fallback.sd,
    };
    read.categoryComparisons += 2;
    if (hasMean) {
      read.categoryStated += 1;
      read.categoryStatedFields.push(entry.mean);
    }
  }
  return read;
}
