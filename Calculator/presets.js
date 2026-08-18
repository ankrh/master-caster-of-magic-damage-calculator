// --- Test Presets ---
//
// The numeric preset fixtures live in the presets_*.js files, cut by ability family; this file
// owns the object they merge into. index.html's manifest is the single home for which parts
// exist and in what order, so adding one is an edit there and nowhere else.
//
// PRESETS is the authority for calculation correctness (Calculator/CLAUDE.md) and is evaluated
// only through the page's runTests(), which is why the parts are data-scope="page".
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
