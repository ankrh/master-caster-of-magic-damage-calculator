// --- Constants ---

// Normalized ranged type from unit DB display strings.
//
// The two engine families classify a projectile differently, so their rosters speak different
// vocabularies and this map covers both. The DOS engines carry a real realm table —
// `Battle_Unit_Attack_Magic_Realm`, 21 entries, 131:0x9A7A9 — so their records keep
// `Magic(C)`/`Magic(N)`/`Magic(S)`. `Caster.exe` attaches no realm to a projectile at all
// (`SPEC.md`, *Deliberate deviations*), so the modern rosters carry one magical token,
// `Magic`, plus `Magic-lightning` for id 30, the lightning-bolt projectile.
const RANGED_TYPE_NORMALIZE = {
  'Missile': 'missile', 'Boulder': 'boulder',
  'Magic': 'magic', 'Magic-lightning': 'magic_lightning',
  'Magic(C)': 'magic_c', 'Magic(N)': 'magic_n', 'Magic(S)': 'magic_s',
  'Gaze(Stoning)': 'gaze_stoning', 'Gaze(Multiple)': 'gaze_multiple',
  'Gaze(Death)': 'gaze_death',
};

// The projectile tokens each engine family's card offers. `MODERN_RANGED_TYPES` is also the
// `#*ModernRangedType` option list and `DOS_RANGED_TYPES` the conventional-ranged head of the
// `#*RtbType` shared-slot list; a token outside its version's set cannot be selected there.
const MODERN_RANGED_TYPES = ['missile', 'boulder', 'magic', 'magic_lightning'];
const DOS_RANGED_TYPES = ['missile', 'boulder', 'magic_c', 'magic_n', 'magic_s'];

// The union. `stats.js` asks only which record field a slot's token names — Ranged, Thrown or
// gaze — and that question is the same in every version, so it reads this rather than a
// version-scoped list. Reads that decide *behaviour* from the token use a predicate instead:
// `isMagicalRangedType` (`combat_abilities.js`), which spans both vocabularies too.
const RANGED_TYPES = [...MODERN_RANGED_TYPES,
  ...DOS_RANGED_TYPES.filter(type => !MODERN_RANGED_TYPES.includes(type))];
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
  // The DOS pair (`toHitMod` melee, `toHitRtbMod` shared secondary) and the modern record's
  // five fields (`hitChance` common, plus one modifier per To-Hit field) are separate
  // vocabularies; a fixture states the one its version has.
  toHitMod: 0, toHitRtbMod: 0, cityWalls: 'none',
  hitChance: 0, hitMelee: 0, hitRanged: 0, hitThrown: 0, hitBreath: 0,
  toBlkMod: 0, hp: 1, dmg: 0, weapon: 'normal', armor: 'normal', level: 'normal', unitType: 'normal', abilities: {},
};
