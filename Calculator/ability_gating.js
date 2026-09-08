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
// `updateTypeVisibility` applies this, `applyVersionGating` clears by it, the matrix reader
// (`ui_matrix_properties.js`) gates its three sites on it since F261, and
// tests/version-gating.spec.js asserts against it — re-deriving the rule in any of those places
// would let them drift, which is exactly how the matrix came to admit six Warlord enchantments the
// card hides.
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

// --- The two ability sources, named ---
//
// A calc key can be written by two different engine moments: the unit is *built* with the
// ability (`ABILITY_DEFS`, the roster's own line) or the card *marks* the enchantment or
// condition (`ENCHANTMENT_DEFS`, a cast). The phase table names both — `template` against
// `immunities`/`buffs`/`debuffs` — so the derivation boundary carries the two halves separately
// and only `mergeAbilitySourceHalves` puts them back together (F252.1).
//
// Nine calc keys are named by both lists: `fear`, `holyBonus`, `immolation`, `invisibility`,
// `magicImmunity`, `missileImmunity`, `resistanceToAll`, `teleporting`, `undead`. Their two
// writes are what the halves keep apart, and F252.2 rules on what the record then holds:
//
// - **Seven of them are booleans** (`fear`, `immolation`, `invisibility`, `magicImmunity`,
//   `missileImmunity`, `teleporting`, `undead`). Each is an OR of the two sources at the grant
//   position, so no fold is needed at input — but the engines reach that OR in three different
//   ways, and the three must not be collapsed into one when F252.3-F252.6 position the writes:
//
//   1. **Same field, set onto the template's bit.** `missileImmunity`, `magicImmunity`,
//      `immolation`, `invisibility`: the cast lives in its own enchantment word and the
//      recalculation derives the ability field from it with a set — `bu->Attribs_1 |=
//      USA_IMMUNITY_MISSILES` (`unitcalc.c`, com1:0x8F51A), `bu->Abilities |= UA_INVISIBILITY`
//      (com1:0x8F32B), `U.missileImmunity := True` (`Units.RecalculateUnits.pas` $0059FD93),
//      `U.magicimmunity := True` ($0059FDED), `U.immolation := True` ($005A00E7). Setting a set
//      bit changes nothing, so two positioned writes need nothing between them. Modern
//      `fear` joins this shape: `if U.EnchantmentFlags[EncCloakofFear] then U.fear := True`
//      ($0059EA8B).
//   2. **Distinct fields, OR'd by the consumer.** DOS `fear`: `BU_CauseFear` tests the innate
//      `Attribs_2 & USA2_CAUSE_FEAR`, the battle enchantment, the item enchantment and the
//      permanent unit enchantment as four separate disjuncts (131:0x9BB63, 0x9BB82, 0x9BBA1,
//      0x9BBCE) and never merges them onto one field. The record keeps them apart; the OR is the
//      *reader's*. Modelling that as one field is a calculator convenience, not the record shape,
//      and F252.4-F252.6 must not read the equivalence the other way.
//   3. **A condition flag that gates a normalisation, not a derived ability bit.** `undead` and
//      `teleporting`. `$0059FBD0` tests `EncUndead` and rewrites race, Fantastic, three
//      immunities, upkeep and healing; it derives no Undead ability field, and the DOS side gates
//      the same normalisation on the `UM_UNDEAD` mutation (`unitcalc.c` com1:0x8F4B4). So the
//      *innate* control here means "the record already carries that flag", which F252.3 has to
//      state as a modelling decision rather than inherit — a Death-race Fantastic identity is not
//      by itself evidence of the flag.
//
//   And the OR is scoped to the grant position, not to the whole sequence: Warlord's Hierophany
//   strip clears `missileImmunity`, `magicImmunity` and `teleporting` later (`regionD` rows in
//   `stats_origins.js`), so those clears must survive the migration. What the fold got wrong is
//   *when*: the two sets happen at different ranks, and a step reading the field between them
//   must see the innate bit alone.
// - **Two are numbers** (`holyBonus`, `resistanceToAll`) and are not one quantity at all: the
//   ability def is what the unit *provides* and the enchantment def what it *receives*. Neither
//   engine folds them on the unit; each keeps a maximum across providers and adds the winner once
//   at the pass that sums it. They are max'ed at that position instead — see
//   `PROVIDED_RECEIVED_CALC_KEYS` below.
//
// The ruling generalises with nothing left over: measured over the 218 defs and 202 calc keys the
// two lists hold, `holyBonus` and `resistanceToAll` are the **only** calc keys any two defs name
// with a numeric type. Every other numeric key is single-def, so the numeric arm of
// `mergeAbilityCalcValue` never contended anything else, and it no longer contends at all.

// The provided/received pair (user ruling, 2026-09-03; implemented F252.2). The innate def states
// what this unit provides to its stack and the marked def what a stackmate provides to it, and the
// engine reads the two as candidates in one maximum rather than as one value:
//
// - DOS: `battlefield_holy_bonus_max[controller]` / `battlefield_resist_prayer_max[controller]`
//   take the largest `Spec_Att_Attrib` over every battlefield unit of the controller carrying the
//   provider bit (`combat.c` 131:0x9AA1C, 131:0x9AA70) — the unit's own value among them — and
//   the recompute then adds that one number to melee/defense/resistance (`unitcalc.c`
//   131:0x900C5, com1:0x900E8).
// - CoM2/Warlord: `BuildAuraTable` adds `BaseUnits[i].HolyBonus` / `BaseUnits[i].ResistToAll` as
//   an aura record ($005976CC), and `AddtoAuraTable` ($005973A4) retains only the higher value
//   where owner, tile and type match; the region-`e` receiving loop ($005A6827..$005A6FDF) then
//   applies the survivor once (`Units.RecalculateUnits.pas`).
//
// So these two keys never merge into the record map. The merged map carries the **provided**
// value — the unit's own record field — and the received value travels to the positioned step,
// which takes the maximum there.
const PROVIDED_RECEIVED_CALC_KEYS = Object.freeze(['holyBonus', 'resistanceToAll']);

// --- What an innate `undead` or `teleporting` control declares (F252.3) ---
//
// F252.2's third shape: these two keys are **condition flags gating a normalisation**, not ability
// bits a recalculation derives. `$0059FBD0` tests `EncUndead` and rewrites race, Fantastic, three
// immunities, upkeep and healing without ever writing an Undead ability field, and the DOS side
// gates the same normalisation on the `UM_UNDEAD` mutation (`unitcalc.c` com1:0x8F4B4). Warlord's
// Planewalking half of `teleporting` is the same shape, and the Hierophany strip clears it at
// `regionD` (`stats_origins.js`).
//
// So there is no ability bit for a `template` write to seed, and the innate control cannot be
// *derived* from anything the roster record states. **This is the declaration, and it is a
// modelling decision rather than a reading of either engine:** ticking the innate Undead or
// Teleporting control declares that the permanent record already carries that condition flag —
// `EncUndead` / the `UM_UNDEAD` mutation, and the permanent Teleporting flag — when combat
// recalculation begins, whatever put it there. It is not inferred from a Death-race Fantastic
// identity, and no supported source makes such an identity evidence of the flag.
//
// The marked control is the other half and states the cast. The two are an OR at the grant
// position like the other five booleans; what is declared here is only what the *innate* side
// means, because the record shape gives it no derivation of its own.
//
// Neither key is a sequence record field (neither is in `SEEDED_NON_STAT_KEYS`,
// `stats_identity.js`), so neither the declaration nor the cast carries a write today, and the
// OR for these two still happens in `mergeAbilitySourceHalves` at the input boundary rather than
// at a grant position on the record. F252.5 left it there: positioning it means giving each key a
// record field and migrating its readers, which that subtask had no ruling for — so this is an
// **open** part of F252's rule, not a settled exemption (F252.5 review, finding 1). Whichever
// subtask gives either key a record field owes it a `buffs:<key>:cast` step in the same change,
// and `runMarkedBuffPhaseChecks` (`tools/unit_checks/ability_origins.js`) fails if it does not. It is stated here, beside
// the ruling that produced it, so a later subtask giving either key a record field inherits the
// meaning rather than re-deciding it. The input rule itself — what ticking the control means — is
// an open `PROPOSALS.md` entry against CLAUDE.md's *Deliberate deviations*, because it cannot be
// re-derived from either binary (F252.3 review, finding 2).
const INNATE_CONDITION_FLAG_KEYS = Object.freeze(['undead', 'teleporting']);

// The def each half of a calc key comes from. A key can have several defs on one side —
// Guardian Wind and Hillfort both write `missileImmunity` — and the fold within that side has
// already contended them by the time the halves meet, so the *last* def is the one whose type
// states how the two halves contend, exactly as it did when one fold ran over both lists. That is
// the seven booleans; the provided/received pair does not contend here at all (F252.2).
let _abilityCalcKeySources = null;
function abilityCalcKeySources() {
  if (!_abilityCalcKeySources) {
    _abilityCalcKeySources = new Map();
    for (const def of abilityUiDefs()) {
      const entry = _abilityCalcKeySources.get(def.calcKey)
        || { innate: null, marked: null };
      entry[def.source === 'ability' ? 'innate' : 'marked'] = def;
      _abilityCalcKeySources.set(def.calcKey, entry);
    }
  }
  return _abilityCalcKeySources;
}

// Put the two halves back together. This is the one place the merged map a step reads is built,
// and the rule it applies is `mergeAbilityCalcValue`'s — the cited engine rule for two sources of
// one effect — applied innate-first, which is the order the single fold ran in
// (`abilityUiDefs()` lists every ability def before every enchantment def).
//
// A marked key no def list names cannot have come from a control, so it halts rather than being
// merged under a guessed type (`CLAUDE.md`, *Architecture*: fail loud).
function mergeAbilitySourceHalves(innateAbilities, markedAbilities, source) {
  const merged = { ...(innateAbilities || {}) };
  for (const [calcKey, value] of Object.entries(markedAbilities || {})) {
    const entry = abilityCalcKeySources().get(calcKey);
    const def = entry && (entry.marked || entry.innate);
    if (!def) {
      throw new Error(`${source || 'mergeAbilitySourceHalves'}: the marked ability half names `
        + `calc key '${calcKey}', which no ability or enchantment definition writes, so there is `
        + 'no rule for how it combines with the innate half.');
    }
    // A control the card does not have is absent from the half and contributes nothing — the same
    // statement `cardStateAbilityCalcValues` makes by skipping it. The key is still checked above,
    // so an unknown key halts whether or not it carries a value.
    if (value === undefined) continue;
    // The provided/received pair is two quantities, not two statements of one, so the marked half
    // does not enter the record map at all: it reaches its step through `receivedAbilityValues`
    // and the maximum is taken there (F252.2).
    if (PROVIDED_RECEIVED_CALC_KEYS.includes(calcKey)) continue;
    merged[calcKey] = mergeAbilityCalcValue(def, merged[calcKey], value);
  }
  return merged;
}

// What the unit *receives* from a stackmate, for the steps that take the maximum at their own
// position. Only the provided/received pair travels this way; every other marked key is a cast and
// belongs in the record map. A key the marked half does not state is absent, which reads as no
// provider rather than as a provider of zero.
function receivedAbilityValues(markedAbilities) {
  const received = {};
  for (const calcKey of PROVIDED_RECEIVED_CALC_KEYS) {
    const value = (markedAbilities || {})[calcKey];
    if (value !== undefined) received[calcKey] = value;
  }
  return received;
}

// The reverse, for a caller that states a control set rather than a card: which half each calc
// key belongs to is read off the def lists. The nine dual-source keys enter **both** halves,
// which is value-preserving under F252.2's ruling — the caller stated one value, the seven
// booleans OR it with itself, and the provided/received pair maxes it against itself. Those
// duplicated values are one statement counted twice, not two independently stated source facts,
// and must not be read as evidence of what the unit was built with. A key no def list names is a
// raw record value the caller supplied directly; it has no cast behind it, so it is innate.
function splitAbilityCalcValuesBySource(abilities) {
  const innateAbilities = {};
  const markedAbilities = {};
  for (const [calcKey, value] of Object.entries(abilities || {})) {
    const entry = abilityCalcKeySources().get(calcKey);
    if (entry && entry.marked) markedAbilities[calcKey] = value;
    if (!entry || entry.innate || !entry.marked) innateAbilities[calcKey] = value;
  }
  return { innateAbilities, markedAbilities };
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

// --- The gating test, named once ---
//
// There is one answer to "is this def unavailable in this version": `abilityVersionGated`, above.
// Until F261 the matrix asked a weaker question — the subgroup restriction alone, plus a
// hand-added `blur` exception — which admitted six `com2_warlord_1.5.12.9` enchantments the card
// hides (`flameBlade`, `landLinking`, `discipline`, `destiny`, `mislead`, `blazingEyes`, each the
// CoM2-named half of a Warlord rename). That was INV-2 in the matrix, and it is gone: the matrix
// reader (`ui_matrix_properties.js`) calls `abilityVersionGated` directly, as the card's
// `updateTypeVisibility` and `applyVersionGating` do. The `blur` exception went with it — it was
// already unreachable, `blur` carrying neither `alsoVersions` nor `exceptVersions`, so the
// disjunct it guarded could never be true.
//
// No registry of gates and no gate parameter survive: a second gating test is what let the two
// views disagree, so there is deliberately nowhere for one to be selected from.
// `tools/unit_checks/version_gate_divergence.js` fails if a second one reappears.

// Armor quality does not exist in the MoM engines: the card hides the row and resets the select
// (`updateLoadoutLocks`), `applyVersionGating` performs the same reset on a card state so a state
// built without controls carries what the page would carry, `deriveUnitStats` gates its armour
// steps on it (`armorExists`, `stats.js`) and the matrix omits the row (`ui_matrix_properties.js`).
// Four readers, one rule: the three copies F260.3 surfaced were repointed here by F260.4.
function versionHasArmorQuality(version) {
  return !String(version).startsWith('mom_');
}
