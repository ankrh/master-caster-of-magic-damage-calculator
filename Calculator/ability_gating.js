// --- Ability and enchantment gating, and the two record shapes the gating reads with ---
//
// The pure half of what the ability panels do: which defs exist, which of them a version
// offers, and the two shapes a modern card produces. It holds no DOM reference and loads
// headlessly (`CLAUDE.md`, *Architecture*), so the card-state projection in `card_state.js`
// — which reads `abilityUiDefs`, `MODERN_SPECIAL_FIELDS` and `modernAttackRecord` — can be
// called without a page. The DOM-bound neighbours (the panel builders, `abilityControlId`,
// `getAbilityControlValue`, `updateTypeVisibility`) stay in `ui_abilities.js`, `ui_card.js`
// and `ui_units.js`; this file is their single source for the rules they apply.

const SHARED_ABILITY_KEYS = new Set(
  ABILITY_DEFS
    .map(abil => abil.key)
    .filter(key => ENCHANTMENT_DEFS.some(ench => ench.key === key))
);

function abilityUiDefs() {
  const abilityDefs = ABILITY_DEFS.map(abil => ({
    ...abil,
    calcKey: abil.calcKey || abil.key,
    uiKey: abil.uiKey || abil.key,
    source: 'ability',
  }));
  const enchantmentDefs = ENCHANTMENT_DEFS.map(abil => ({
    ...abil,
    calcKey: abil.calcKey || abil.key,
    uiKey: abil.uiKey || (SHARED_ABILITY_KEYS.has(abil.key) ? 'enchantment_' + abil.key : abil.key),
    source: 'enchantment',
  }));
  return [...abilityDefs, ...enchantmentDefs];
}

// True if an ability/enchantment whose def carries `subgroup` is available in the
// given game-version string. Shared by the main panels and the matrix candidate list
// so both gate enchantments identically.
function subgroupAllowedForVersion(subgroup, version) {
  const isMoM = version === 'mom_1.31' || version === 'mom_cp_1.60.00';
  const isCoMorCoM2 = version === 'com_6.08' || version.startsWith('com2_');
  const isCoM2 = version.startsWith('com2_');
  const isWarlord = version.startsWith('com2_warlord_');
  const sg = (subgroup || '').replace(/^_/, '');
  if (sg === 'MoM only') return isMoM;
  if (sg === 'CoM only') return version === 'com_6.08';
  if (sg === 'CoM, CoM2 & Warlord') return isCoMorCoM2;
  if (sg === 'CoM2 & Warlord') return isCoM2;
  if (sg === 'Warlord only') return isWarlord;
  if (sg === 'Warlord') return isWarlord;
  if (sg === 'Renamed in Warlord') return isWarlord;
  // The unrestricted labels, named rather than defaulted: a subgroup that is only the `_`
  // marker, and the two headings that mean "every version". A misspelt restriction would
  // otherwise resolve to "allowed everywhere" and show a control in versions whose engine has
  // no such effect (`SPEC.md`, *Out-of-range values stop the run*).
  if (sg === '' || sg === 'All versions' || sg === 'All versions bools') return true;
  throw new Error(
    `subgroupAllowedForVersion: subgroup '${subgroup}' is not a known version restriction. `
    + `Add it here with the versions it names, or use 'All versions'.`);
}

// The single home for "does this def exist in this version". Both enchantments and ability tags
// are gated by their subgroup. A leading `_` only suppresses the rendered heading and is stripped
// before the version test, so `_MoM only` restricts exactly as `MoM only` does. A def with no
// subgroup, or one that is nothing but the marker (`_`), resolves to "allowed everywhere".
// `updateTypeVisibility` applies this and tests/version-gating.spec.js asserts against it —
// re-deriving the rule in either place would let the two drift.
function abilityVersionGated(abil, version) {
  const subgroupOk = subgroupAllowedForVersion(abil.subgroup, version);
  const overrideOk = (abil.alsoVersions || []).some(v => version.startsWith(v));
  const exceptOk = !(abil.exceptVersions || []).some(v => version.startsWith(v));
  return !((subgroupOk || overrideOk) && exceptOk);
}

// Global-enchantment controls in the .combat-enchantments frame are hardcoded HTML (not
// driven by ABILITY_DEFS), so they need their own version gating. Each entry maps a control
// element id to the versions in which it's valid; a control valid everywhere still needs a
// case saying so, because a control this function has never heard of is a wiring mistake, not
// a universal enchantment (`SPEC.md`, *Out-of-range values stop the run*). When a control is
// hidden it's also reset (unchecked) so a hidden enchantment can't silently keep affecting the
// calculation.
// The battlefield-wide enchantments a version can withhold, which is the list both the page's
// visibility pass and `applyGlobalVersionGating` (`card_state.js`) walk. The other globals the
// rule below answers `true` for in every version are deliberately not here: this names the
// controls a version can take away, not every global there is.
const GLOBAL_ENCHANTMENT_CONTROL_IDS = ['trueLight', 'chaosConjunction', 'hurricane', 'poxHost'];

function globalEnchantmentAllowedForVersion(elementId, version) {
  const isMoM = version === 'mom_1.31' || version === 'mom_cp_1.60.00';
  const isWarlord = version.startsWith('com2_warlord_');
  switch (elementId) {
    case 'trueLight': return isMoM || isWarlord; // removed in CoM 1 & 2
    case 'chaosConjunction': return version.startsWith('com2_');
    case 'hurricane': return isWarlord;
    case 'poxHost':   return isWarlord;
    case 'darkness':        return true;
    case 'chaosSurge':      return true;
    case 'wallOfFire':      return true;
    case 'warpReality':     return true;
    case 'rangedCheck':     return true;
    case 'rangedDist':      return true;
    case 'nodeAura':        return true;
    default: throw new Error(
      `globalEnchantmentAllowedForVersion: control '${elementId}' has no version rule.`);
  }
}

// --- Modern card record shapes ---

// Is this control's value a statement, or the absence of one? A `numcheck` distinguishes
// absent (`null`) from present-and-zero because the engine tests `!= null`, which is why this
// is not `!!val`. Moved here from `ui_abilities.js` (F260.4): `cardStateDosSpecialBlock`
// (`card_state.js`) asks the same question of a card state that the panels ask of a control.
function abilityValueIsActive(abil, val) {
  if (abil.type === 'bool') return !!val;
  if (abil.type === 'select') {
    const defaultValue = abil.options && abil.options[0] ? abil.options[0][0] : 'none';
    return val !== defaultValue;
  }
  if (abil.type === 'numcheck') return val != null;
  return (val || 0) !== 0;
}

// The nine CoM2/Warlord special values that get their own two-column block on the stat card.
// The ability control stays the stored state; the card block mirrors it.
const MODERN_SPECIAL_FIELDS = [
  ['stoningGaze', 'Stoning Gaze'], ['deathGaze', 'Death Gaze'], ['doomGaze', 'Doom Gaze'],
  ['stoningTouch', 'Stoning Touch'], ['deathTouch', 'Death Touch'], ['lifeSteal', 'Life Steal'],
  ['poison', 'Poison Touch'], ['exorcise', 'Exorcise'], ['destruction', 'Destruction'],
];

// The one shape every reader of a modern attack record produces. `unitT` holds the four
// strengths as fixed fields — `ranged` +0x24, `thrown` +0x2C, `firebreath` +0x30,
// `lightningbreath` +0x34 (`Reference docs/Caster binary/CoM2 binary - unit recalculation.md`,
// the record layout) — so **every** modern record has all four, and a record that states no
// attack is four empty fields rather than no record. That distinction is the whole of it: a
// reader returning `null` for the empty case tells `deriveUnitStats` the caller supplied no
// modern record at all, and the ungated engine writes that create a channel then have nothing
// to land on. The card reader and the roster reader below both return this, so the card and the
// matrix agree by construction rather than by which units the roster happens to ship (F121).
function modernAttackRecord(fields) {
  const number = value => Math.max(0, parseInt(value, 10) || 0);
  const ranged = number(fields.ranged);
  const thrown = number(fields.thrown);
  const fireBreath = number(fields.fireBreath);
  const lightningBreath = number(fields.lightningBreath);
  // The Ranged record's existence is stated by its projectile type, not by its strength: the
  // record ships with a type and no strength (Warlord [362] Wanderer), and the engine writes
  // that read the permanent type land on it regardless. The Thrown and Breath fields have no
  // type of their own, so for them strength is the only statement of existence
  // (`SPEC.md`, *Attack channels on the card*).
  const rangedType = fields.rangedType || 'none';
  return {
    ranged: (ranged || rangedType !== 'none') ? { strength: ranged, type: rangedType } : null,
    thrown: thrown ? { strength: thrown, type: 'thrown' } : null,
    fireBreath: fireBreath ? { strength: fireBreath, type: 'fire' } : null,
    lightningBreath: lightningBreath ? { strength: lightningBreath, type: 'lightning' } : null,
  };
}

// --- The two gating tests, named ---
//
// "Is this def unavailable in this version" has two answers in the tree today, and this subtask
// (F260.3) carries the divergence explicitly rather than resolving it. Every caller names the one
// it wants; there is no default, so a new caller cannot inherit either silently.

// The card's test: the subgroup restriction, then the def's own `alsoVersions` / `exceptVersions`
// overrides. This is what `updateTypeVisibility` applies to the ability panels and what
// `applyVersionGating` clears by.
function abilityGatedForCard(abil, version) {
  return abilityVersionGated(abil, version);
}

// The matrix's test: the subgroup restriction alone, plus one hand-added exception for `blur`.
// It admits six `com2_warlord_1.5.12.9` enchantments the card hides — `flameBlade`, `landLinking`,
// `discipline`, `destiny`, `mislead`, `blazingEyes`, each the CoM2-named half of a Warlord rename
// — which is INV-2 in the matrix. **F261 deletes this function** and points the matrix at
// `abilityGatedForCard`; numbers move in Warlord matrix runs when it does, which is why F260.3
// preserves the divergence instead of fixing it. `tools/unit_checks/version_gate_divergence.js`
// pins the six as a worklist, so F261 landing empties the list rather than going unnoticed.
function abilityGatedForMatrix(abil, version) {
  if (!subgroupAllowedForVersion(abil.subgroup, version)) return true;
  if (abil.key === 'blur' && abilityVersionGated(abil, version)) return true;
  return false;
}

// Named so a caller passing something else gets a message listing the two, rather than a silent
// `undefined` gate that hides every control or none.
const ABILITY_VERSION_GATES = {
  card: abilityGatedForCard,
  matrix: abilityGatedForMatrix,
};

// Armor quality does not exist in the MoM engines: the card hides the row and resets the select
// (`updateLoadoutLocks`), `applyVersionGating` performs the same reset on a card state so a state
// built without controls carries what the page would carry, `deriveUnitStats` gates its armour
// steps on it (`armorExists`, `stats.js`) and the matrix omits the row (`ui_matrix_properties.js`).
// Four readers, one rule: the three copies F260.3 surfaced were repointed here by F260.4.
function versionHasArmorQuality(version) {
  return !String(version).startsWith('mom_');
}
