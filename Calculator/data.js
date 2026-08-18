// --- Constants ---

const RACE_NAMES = {
  0: 'Barbarian', 1: 'Beastmen', 2: 'Dark Elf', 3: 'Draconian', 4: 'Dwarf',
  5: 'Gnoll', 6: 'Halfling', 7: 'High Elf', 8: 'High Men', 9: 'Klackon',
  10: 'Lizardman', 11: 'Nomad', 12: 'Orc', 13: 'Troll', 14: 'Special',
  15: 'Arcane', 16: 'Nature', 17: 'Sorcery', 18: 'Chaos', 19: 'Life', 20: 'Death',
};

// RangedType ID -> calculator ranged type (used by INI parser)
const RANGED_TYPE_MAP = {
  10: 'boulder', // boulder
  11: 'boulder', // cannon
  20: 'missile',
  21: 'missile', // sling
  30: 'magic_c', // chaos — lightning bolt
  31: 'magic_c', // chaos — fire bolt
  32: 'magic_s', // sorcery — ice bolt
  33: 'magic_c', // chaos — death bolt
  34: 'magic_s', // sorcery (Water Elemental)
  35: 'magic_n', // nature — priest sparkles
  36: 'magic_c', // chaos — drow sparkles
  37: 'magic_n', // nature — sprite shimmer
  38: 'magic_n', // nature — green bolt
  40: 'beam',    // Warlord beam energy
};

// Normalized ranged type from unit DB display strings
const RANGED_TYPE_NORMALIZE = {
  'Missile': 'missile', 'Boulder': 'boulder',
  'Magic(C)': 'magic_c', 'Magic(N)': 'magic_n', 'Magic(S)': 'magic_s',
  'Beam': 'beam',
  'Gaze(Stoning)': 'gaze_stoning', 'Gaze(Multiple)': 'gaze_multiple',
  'Gaze(Death)': 'gaze_death',
};

const RANGED_TYPES = ['missile', 'boulder', 'magic_c', 'magic_n', 'magic_s', 'beam'];
const THROWN_TYPES = ['thrown', 'fire', 'lightning'];
const GAZE_TYPES = ['gaze_stoning', 'gaze_multiple', 'gaze_death'];

// --- Definition layout helpers ---
// ABILITY_DEFS (abilities.js) and ENCHANTMENT_DEFS (enchantments.js) are authored through
// these; see Calculator/CLAUDE.md for the column order each one has to produce.
function twoColumnMajor(items) {
  const leftColumnLength = Math.ceil(items.length / 2);
  const leftColumn = items.slice(0, leftColumnLength);
  const rightColumn = items.slice(leftColumnLength);
  return leftColumn.flatMap((leftItem, index) => {
    const rightItem = rightColumn[index];
    return rightItem ? [leftItem, rightItem] : [leftItem];
  });
}

// Enchantments render in a CSS multi-column layout that flows top-to-bottom then to the next
// column, so they are kept in their natural realm-linear order (no row-first interleaving).
// Identity passthrough — present for symmetry with twoColumnMajor and to document the intent.
function realmLinear(items) {
  return items;
}

// --- Version ids ---
// The canonical id for each supported version. Presets reference these rather than
// repeating the literal, so a version bump is one edit here instead of hundreds.
//
// Use the constant when a preset means "this game", which is almost always. Write the
// literal only to pin a *specific build* — that is what distinguishes a deliberate pin
// from an ordinary reference, so a future bump can tell them apart. Today there are none:
// only one build of each game is supported at a time, and the version-difference pairs in
// TEST_TREE compare different games, never two builds of the same one.
//
// These ids also appear in index.html's <option> list, which is the authoritative set —
// anything not offered there cannot be selected. ui_state.js's normalizeGameVersion() maps
// retired ids forward onto it.
const V_MOM_131 = 'mom_1.31';
const V_MOM_CP  = 'mom_cp_1.60.00';
const V_COM     = 'com_6.08';
const V_COM2    = 'com2_1.05.11';
const V_WARLORD = 'com2_warlord_1.5.12.7';

// --- Version -> Unit Data mapping ---
// Each *_UNITS_DATA const is defined in its own units_<version>.js file
// (units_mom.js, units_com.js, units_com2.js, units_warlord.js).
const VERSION_DATA = {
  [V_MOM_131]: MOM_UNITS_DATA,
  [V_MOM_CP]:  MOM_UNITS_DATA,
  [V_COM]:     COM_UNITS_DATA,
  [V_COM2]:    COM2_UNITS_DATA,
  [V_WARLORD]: WARLORD_UNITS_DATA,
};

// Cross-version unit name aliases (bidirectional, covers MoM/CoM/CoM2 renames)
const UNIT_NAME_ALIASES = {
  // MoM ↔ CoM/CoM2
  'Shamans': 'Shaman',       'Shaman': 'Shamans',
  'Chimeras': 'Chimera',     'Chimera': 'Chimeras',
  'Phantom Warriors': 'Phantom Warrior', 'Phantom Warrior': 'Phantom Warriors',
  'Pegasai': 'Pegasi',       'Pegasi': 'Pegasai',
  'Archangel': 'Arch Angel', 'Arch Angel': 'Archangel',
  'Orc Warrior': 'Orc Archer', 'Orc Archer': 'Orc Warrior',
  // CoM 6.08 ↔ CoM2
  'Dwarven Engineers':  'Dwarf Engineers',  'Dwarf Engineers':  'Dwarven Engineers',
  'Dwarven Halberdiers':'Dwarf Halberdiers','Dwarf Halberdiers':'Dwarven Halberdiers',
  'Dwarven Swordsmen':  'Dwarf Swordsmen',  'Dwarf Swordsmen':  'Dwarven Swordsmen',
  'Carrack': 'Lizardman Carrack', 'Lizardman Carrack': 'Carrack',
  'Horde':   'Orc Horde',         'Orc Horde':         'Horde',
  'Saints':  'Draconian Saints',  'Draconian Saints':  'Saints',
};

const UNIT_DEFAULTS = {
  figs: 1, atk: 0, rtbType: 'none', rtb: 0,
  def: 0, res: 0,
  toHitMod: 0, toHitRtbMod: 0, cityWalls: 'none',
  toBlkMod: 0, hp: 1, dmg: 0, weapon: 'normal', armor: 'normal', level: 'normal', unitType: 'normal', abilities: {},
};
