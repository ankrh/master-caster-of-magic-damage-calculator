// --- Unit Stat Derivation: unit identity and its ordered conversions ---
// Identity construction, the live unit-type projection, and the permanent ability grants
// deriveUnitStats (stats.js) resolves before the stat sequence runs.

// Unit identity has three independent layers. The selected version scopes source
// template/hero ids; the base fields are editable identity; race/fantastic are fresh live
// calculation fields. R8.2 supplies the base fields directly from the UI; ordered conversions
// belong to R8.3. Keeping construction here makes every caller, including Matrix and Node
// checks, enter derivation through the same model.
// The special-unit vocabulary has one home, here, and both scopes read it from this table: the
// identity boundary below validates against it, and the page builds the `Special unit` selector
// and its version scope from the same rows (`populateSpecialUnitOptions` and
// `specialUnitAllowed`, `ui_units.js`). It lives in `data-scope="core"` because the boundary that
// has to reject an undefined key runs without a DOM, and a second list beside that boundary would
// be a copy that drifts.
const SPECIAL_UNIT_DEFS = [
  { key: 'golem', label: 'Golem', versions: ['com_', 'com2_'] },
  { key: 'chosen', label: 'Chosen / Avatar', versions: ['com2_'] },
  { key: 'zombies', label: 'Zombies', versions: ['com_6.08'] },
  { key: 'catapult', label: 'Catapult', versions: ['com_6.08'] },
  { key: 'nightGoblins', label: 'Night Goblins', versions: ['com2_warlord'] },
];

// Absent and `none` both state "no special unit"; anything else must name a defined key. A key
// this build does not define is out of range and halts (`SPEC.md`, *Out-of-range values stop the
// run*): every consumer is an equality test against one of the defined keys, so carrying an unknown
// one derives an ordinary unit and reports nothing — exactly the silent inertness the rule
// forbids. Whether a *defined* key is allowed in the selected version is the separate question of
// version scope, and still clamps (`specialUnitAllowed`, `ui_units.js`).
// --- The version-scoped unit-type id table (F267.3) ---
//
// The engine has no "special unit" token. It stores one integer per unit, `unittype`
// (`Typedec.pas:246`), and every exception is an ordinary compare against it:
// `if BaseUnits[i].unittype = inferred_UnitGolem` (`Units.RecalculateUnits.pas:768`),
// `if B.unittype = ChosenUnitID` (:1611, the id `MODDING.INI` supplies) and
// `BaseUnits[UnitCaster].unittype = inferred_DemonLordUnitType`
// (`Spells.CombatSummonUnit.pas:136`). The DOS side is the same shape with literal ids:
// `unitcalc.c` hardcodes `COM1_UT_CATAPULT` 0x25, `COM1_UT_GOLEM` 0x51 and `COM1_UT_ZOMBIES`
// 0xAE, and Warlord's scripts compare `GetStat(U,STypeID,1)` against 356
// (`UnitCalcPre.CAS!NOBLOODANDIRON!+6 "%AND (GetStat(U,STypeID,1)<>356)"`).
//
// So the id is what the calculator compares, and this table is the one place an id is named. Each
// row is a version *prefix*; a version takes every matching row, more specific rows last, so
// Warlord inherits base CoM2's ids and adds its own. An id absent for the selected version means
// that version has no such unit, and `unittypeIs` below is false for every record — which is how
// the table carries the version scope that used to sit in `specialUnitDef`'s `versions` list.
//
// Ids, and where each is read:
//  - Golem 81 — `inferred_UnitGolem = 81` (`Units.RecalculateUnits.pas:107`), tested at :768 in
//    the block `Caster.exe` $00599E31..$00599E8C that sets `EncResistElements`; CoM 1 does the same
//    on `COM1_UT_GOLEM` 0x51 (`unitcalc.c:183`, tested at com1:0x8EE40).
//  - Chosen 34 — `MODDING.INI:1134` `ChosenUnitID=34`, *compared against* `B.unittype` at
//    `Units.RecalculateUnits.pas:1611` (`if B.unittype = ChosenUnitID then`; what the block goes on
//    to write is `U.race` and `U.Fantastic`, never `B.unittype`). CoM 1 has a template 34 but no
//    Chosen block, so the row is modern-only (see `specialUnitForRoster` below).
//  - Zombies 174 — `COM1_UT_ZOMBIES` 0xAE (`unitcalc.c:184`), CoM 1's constructor patch at
//    com1:0x8EE28.
//  - Catapult 37 — `COM1_UT_CATAPULT` 0x25 (`unitcalc.c:181`) in CoM 1, and `SummonedUnit=37` on
//    Construct Catapult (`spells.ini` `[12]`) in base CoM2 — Warlord's `[12]` is Water Elemental,
//    `SummonedUnit=158`. Base CoM2 carries the id because `isConstructCatapultUnit` compares
//    against it; the
//    `Special unit` selector does not offer `catapult` there, which is `SPECIAL_UNIT_DEFS`'
//    separate question.
//  - Night Goblins 356 — Warlord's Goblin Night Goblins (`Calculator/units_warlord.js`), named by
//    Eternal Night's Poor Vision exemption and by Night Vision.
const UNITTYPE_IDS = [
  { prefix: 'com_6.08', ids: { golem: 81, zombies: 174, catapult: 37 } },
  { prefix: 'com2_', ids: { golem: 81, chosen: 34, catapult: 37 } },
  { prefix: 'com2_warlord', ids: { nightGoblins: 356 } },
];

// The ids the selected version has, as one map. Rows compose in declaration order, so a more
// specific prefix overrides a broader one rather than sitting beside it.
function unittypeIdsForVersion(version) {
  const out = {};
  for (const row of UNITTYPE_IDS) {
    if (!String(version || '').startsWith(row.prefix)) continue;
    Object.assign(out, row.ids);
  }
  return out;
}

// One unit-type id, or `null` where the selected version has no such unit. The key is validated
// against `SPECIAL_UNIT_DEFS` first, so a key this build does not define halts here exactly as it
// halts at the identity boundary rather than silently naming no id.
function unittypeIdFor(version, key, context) {
  specialUnitDef(key, context || `Unit-type id for ${version || 'an unstated version'}`);
  const id = unittypeIdsForVersion(version)[key];
  return id === undefined ? null : id;
}

// The compare itself: `u.unittype = <id>`, with the two absences kept apart. A record that names
// no template carries `unittype: null` (`stats.js`, the record literal), and a version that has no
// such unit yields no id — and `null === null` would make every custom unit every special unit at
// once, so the missing id is tested before the compare.
function unittypeIs(version, unittype, key, context) {
  const id = unittypeIdFor(version, key, context);
  return id !== null && unittype === id;
}

// Which of the defined keys the selected version offers. This is the `Special unit` selector's
// question, not the id table's: base CoM2 has unit type 37 and no `catapult` option.
function specialUnitScopedToVersion(version, def) {
  return !!def && def.versions.some(prefix => String(version || '').startsWith(prefix));
}

function specialUnitDef(key, context) {
  if (!key || key === 'none') return null;
  const def = SPECIAL_UNIT_DEFS.find(item => item.key === key);
  if (!def) {
    throw new TypeError(
      `${context || 'Special unit'} names '${key}', which this build does not define `
      + `(offered: none, ${SPECIAL_UNIT_DEFS.map(item => item.key).join(', ')}). `
      + `Retiring a key obliges the build to state a migration for states that still carry it.`);
  }
  return def;
}

// An id a caller states, or the honest absence. Absent is legitimate — a custom unit has no
// roster template and a non-hero no hero type — but a *present* value that is not an integer is a
// broken caller, and it stops being harmless the moment `unittype` becomes the field every
// type exception compares against (F267.3): a malformed template id would become an absent one,
// and an absent one matches no id, so the exception would silently not apply. That is the shape
// `CLAUDE.md` *Architecture* forbids, so it halts naming the value.
//
// The value is rendered by `describeStatedValue`, not by `JSON.stringify`: that renders `NaN` and
// both infinities as the literal `null`, so the halt would name the one value it then tells the
// caller to supply, and it throws outright on a BigInt (GPT review of F267.3).
function describeStatedValue(value) {
  if (typeof value === 'number') return String(value);          // NaN, Infinity, -Infinity, 1.5
  if (typeof value === 'bigint') return `${value}n`;            // JSON.stringify throws on these
  if (typeof value === 'symbol' || typeof value === 'function') return String(value);
  try {
    const text = JSON.stringify(value);
    return text === undefined ? String(value) : text;
  } catch (err) {
    return Object.prototype.toString.call(value);
  }
}

function statedUnitId(value, field, context) {
  if (value === undefined || value === null || value === '') return null;
  if (!Number.isInteger(value)) {
    throw new TypeError(
      `${context || 'Unit identity'} states ${field} ${describeStatedValue(value)}, which is not `
      + 'an integer. A unit that names no such id states null or nothing at all.');
  }
  return value;
}

// The **input shape**: what a caller states about a unit before anything is derived from it.
// `version` is a parameter of the construction and not a member of the result (F267.6). It was on
// the object only to scope `specialUnit` against the version's defs; F267.3 turned that into the
// version-scoped id lookup `baseUnittypeId` makes, and the resolution happens where the version is
// already in hand — at `deriveUnitStats`'s boundary, whose `input.version` is the only version the
// run has. A stated identity that travelled with a `version` of its own was a second place the
// answer could be given, and `initializeUnitIdentity` had to reconcile the two.
//
// What is left of `version` here is the error context, which is why the parameter stays: a halt
// naming a malformed id says which version's identity stated it.
function createUnitIdentity(values = {}) {
  const version = typeof values.version === 'string' && values.version ? values.version : null;
  const context = `Unit identity for ${version || 'an unstated version'}`;
  const integerOrNull = (value, field) => statedUnitId(value, field, context);
  return {
    templateId: integerOrNull(values.templateId, 'templateId'),
    heroTypeId: integerOrNull(values.heroTypeId, 'heroTypeId'),
    isHero: !!values.isHero,
    baseRace: typeof values.baseRace === 'string' ? values.baseRace : '',
    baseFantastic: !!values.baseFantastic,
    specialUnit: specialUnitDef(values.specialUnit, context) ? values.specialUnit : 'none',
  };
}

// The unit type this identity states, as the integer the engine keeps: the roster template id
// where there is one, and otherwise the id the stated special-unit key names in the selected
// version. That is the whole of what `specialUnit` still does inside the derivation — it is a way
// of stating a `unittype` for a unit with no roster template, and it resolves here, once, at the
// boundary (F267.3). `null` where neither names an id.
function baseUnittypeId(version, identity) {
  if (!identity) return null;
  if (identity.templateId !== null && identity.templateId !== undefined) return identity.templateId;
  return unittypeIdFor(version, identity.specialUnit,
    `Unit identity for ${version || 'an unstated version'}`);
}

// The roster template → special-unit map, and the only reader of that question: the page takes
// both the stored identity and the `Special unit` selector's preselection from here, so no second
// copy can disagree about which roster unit is an exception.
// A template earns a key only where the version's *engine* makes the exception — not merely where
// the version's roster holds that template. CoM 6.08 does have the Chosen at template 34
// (`Unit rosters/CoM 6.08 unit data.txt`, row 34, race Life), but its engine has no Chosen block:
// `Reference docs/DOS reconstructed/unitcalc.c` hardcodes only `COM1_UT_CATAPULT` 0x25,
// `COM1_UT_GOLEM` 0x51 and `COM1_UT_ZOMBIES` 0xAE. The conversion is CoM2's alone — a
// configured-global block at `Units.RecalculateUnits.pas` $0059F747..$0059F7D8 reading
// MODDING.INI `ChosenUnitID=34` — so `chosen` is `com2_` here and in `SPECIAL_UNIT_DEFS`.
//
// `nightGoblins` is Warlord template 356, Goblin Night Goblins, and it earns a key on the same
// test: Warlord's engine names the template. The naming site is Eternal Night's Poor Vision gate,
// `(GetStat(U,STypeID,1)<>356)` at `UnitCalcPre.CAS!NOBLOODANDIRON!+6 "%AND (GetStat(U,STypeID,1)<>356)"` — the second of that gate's four terms —
// so a Night Goblin unit keeps its Ranged strength where every other non-Death, non-Undead unit
// loses 2 (F189). `GetStat(U,S,1)` is the *base* unit — "if B=0, it checks the current stats and
// abilities, if B=1 it checks the base unit" (`Reference docs/Script source/CAS
// reference/Scripts.TXT:266`) — which is the permanent record this key already stands for: a
// conversion mutates only the live `race`/`fantastic` fields and never `specialUnit`, so no live
// conversion can defeat the exemption. The exception is Warlord's alone; base CoM2 has no such
// term, hence `com2_warlord` rather than `com2_` in `SPECIAL_UNIT_DEFS`.
//
// This is the first key whose engine site is a *negative term inside another effect's gate*
// rather than a block of its own. The table's stated test is unchanged — the engine, not the
// roster, makes the exception — but it is the reason the label names the unit and not an effect.
//
// Since F267.3 this is the *reverse* of `UNITTYPE_IDS` rather than a second copy of it: a
// template earns a key when the version's id table names that id and the version's selector
// offers that key. The second half is what keeps base CoM2's template 37 out — the id table
// carries `catapult: 37` there because `isConstructCatapultUnit` compares against it, while
// `SPECIAL_UNIT_DEFS` scopes the `catapult` *option* to CoM 1 alone.
function specialUnitForRoster(version, unit) {
  const templateId = unit && unit.templateId;
  if (!Number.isInteger(templateId)) return 'none';
  const ids = unittypeIdsForVersion(version);
  for (const def of SPECIAL_UNIT_DEFS) {
    if (!specialUnitScopedToVersion(version, def)) continue;
    if (ids[def.key] === templateId) return def.key;
  }
  return 'none';
}

function createRosterUnitIdentity(version, unit) {
  return createUnitIdentity({
    version,
    templateId: unit && unit.templateId,
    heroTypeId: unit && unit.heroTypeId,
    isHero: !!(unit && unit.isHero),
    baseRace: unit && unit.baseRace,
    baseFantastic: !!(unit && unit.baseFantastic),
    specialUnit: specialUnitForRoster(version, unit),
  });
}

function createCustomUnitIdentity(version, values = {}) {
  return createUnitIdentity({
    version,
    // A custom unit can reproduce a special template through R8.2's future selector,
    // but it never acquires a source roster/template or hero-type id.
    templateId: null,
    heroTypeId: null,
    isHero: values.isHero,
    baseRace: values.baseRace,
    baseFantastic: values.baseFantastic,
    specialUnit: values.specialUnit,
  });
}

// The combat code still accepts its historical compact unitType token. Keep that token as a
// derived compatibility boundary rather than allowing it to remain the source of identity.
// A fantastic custom unit with no realm is the unaligned/Arcane case used by the old control.
// The same `|| 'arcane'` also absorbs Fantastic + a mundane base race, a control pair the UI
// allows and `UNITS.INI` cannot express. F113 left it rather than converting a live UI path into
// a crash with no sourced answer to replace it; the question is BACKLOG Q28.
function legacyUnitTypeFor(race, fantastic, isHero) {
  if (!fantastic) return isHero ? 'hero' : 'normal';
  const realm = {
    Life: 'life', Death: 'death', Chaos: 'chaos', Nature: 'nature',
    Sorcery: 'sorcery', Arcane: 'arcane', 'No Heal': 'unaligned',
  }[race] || 'arcane';
  return 'fantastic_' + realm;
}

function legacyUnitTypeFromIdentity(identity) {
  if (!identity) return 'normal';
  return legacyUnitTypeFor(identity.baseRace, identity.baseFantastic, identity.isHero);
}

// The same token read off a **record** rather than off an identity object. `race`, `fantastic`
// and `ishero` are the engine's own member names (`Typedec.pas:203`, and the realm/Fantastic pair
// `Units.RecalculateUnits.pas` writes), so a caller holding `B` or `U` asks this one and nothing
// has to rebuild an identity object to be asked the other (F267.4). Read at `template` rank the
// answer is the permanent unit type, because that is what the record carries there.
//
// No missing-record fallback, deliberately: `legacyUnitTypeFromIdentity` above answers `'normal'`
// for a falsy argument because the page's control readers legitimately have no identity yet, and
// this one has no such caller — its whole contract is that a record has been constructed. A
// fallback here would answer a missing-record boundary error with a plausible token instead of
// halting, which is the shape `CLAUDE.md` *Architecture* forbids (GPT review of F267.4).
function legacyUnitTypeFromRecord(u) {
  if (!u || typeof u !== 'object') {
    throw new TypeError('legacyUnitTypeFromRecord: the unit record is '
      + `${describeStatedValue(u)}, not a record. This reads a constructed record's own `
      + '`race`/`fantastic`/`ishero` members; a caller holding an identity object rather than a '
      + 'record asks legacyUnitTypeFromIdentity.');
  }
  return legacyUnitTypeFor(u.race, u.fantastic, u.ishero);
}

function legacyBaseRace(input) {
  if (typeof input.race === 'string' && input.race) return input.race;
  const match = /^fantastic_(life|death|chaos|nature|sorcery|arcane)$/.exec(input.unitType || '');
  return match ? match[1][0].toUpperCase() + match[1].slice(1) : '';
}

// **The identity half of the boundary record's seed** (F267.6). The engine has no identity object:
// `Typedec.pas` keeps one flat `UnitT`, and the five members below — `race`, `fantastic`
// (`Units.RecalculateUnits.pas`'s own conversion writes), `unittype` (:246), `herotype` (:247) and
// `ishero` (:203) — are ordinary fields of it. The constructors above stay as the declaration of
// what a *caller* states, because that is a real boundary with ~90 call sites; what they no longer
// produce is a live object the derivation keeps beside the record. Their result is folded into the
// record here and does not survive the call.
//
// `initializeUnitIdentity` stood here and returned the stated shape unchanged. Everything that
// read it now reads the record: the five members are seeded from this fragment, the eager scalars
// are reads of the record, and the four predicates that used to take an identity object
// (`isConstructCatapultUnit`, `identityConversionSteps`, `spiritLinkClearsPermanentFantastic`,
// `deriveMarionettePackage`) take the record or the permanent scalar it carries.
//
// The `unittype` resolution is the one place `version` is still needed, and it is applied here
// rather than carried on the object: `input.version` is the version the run has.
function unitIdentityRecordSeed(input) {
  const supplied = input.identity;
  const stated = supplied
    ? createUnitIdentity({ ...supplied, version: input.version })
    : createCustomUnitIdentity(input.version, {
        // Legacy callers can still provide unitType while the UI migrates to independent
        // identity controls. It is translated only at this boundary.
        isHero: input.unitType === 'hero',
        baseRace: legacyBaseRace(input),
        baseFantastic: String(input.unitType || '').startsWith('fantastic_'),
      });
  return {
    race: stated.baseRace,
    fantastic: stated.baseFantastic,
    unittype: baseUnittypeId(input.version, stated),
    herotype: stated.heroTypeId,
    ishero: stated.isHero,
  };
}

// The compact token off the **calculated** record — `u.race`/`u.fantastic` as the conversions
// have left them at the reading step, and `u.ishero`, which no step writes. It is a separate
// projection from `legacyUnitTypeFromRecord` above and the difference is deliberate: the
// permanent reading collapses every non-Fantastic unit to `normal`/`hero`, while this one keeps
// the `normal_<realm>` tag a conversion can produce on a non-Fantastic unit (Sanctify's
// `u.race = 'Life'`), which is the shape `realmOfUnitType`'s callers ask about.
//
// Same fail-loud contract as the permanent reader: a falsy argument is a boundary error here,
// not a unit with no identity yet, because the only caller holds the sequence record.
function legacyUnitTypeFromLiveRecord(u) {
  if (!u || typeof u !== 'object') {
    throw new TypeError('legacyUnitTypeFromLiveRecord: the unit record is '
      + `${describeStatedValue(u)}, not a record. This reads the running record's own `
      + '`race`/`fantastic`/`ishero` members at the position it is called from.');
  }
  if (u.ishero && !u.fantastic) return 'hero';
  const realm = {
    Life: 'life', Death: 'death', Chaos: 'chaos', Nature: 'nature',
    Sorcery: 'sorcery', Arcane: 'arcane', 'No Heal': 'unaligned',
  }[u.race];
  if (!u.fantastic) return realm ? 'normal_' + realm : 'normal';
  return 'fantastic_' + (realm || 'arcane');   // Fantastic + a mundane race: BACKLOG Q28
}

// Whether this unit is the combat-summoned Construct Catapult, which the one
// `a:constructCatapult` conversion gates on and which `deriveUnitStats` reads separately for
// CoM 1's `template:constructCatapult:weapon` patch. One predicate, so the conversion and the
// patch cannot disagree.
//
// The type half is one compare against `unittype` in both engines (F267.3). It used to be a
// disjunction — base CoM2 tested the template id, CoM 1 tested the template id *or* the
// `catapult` token — because a custom CoM 1 Catapult had no template id to test. Resolving the
// token into the record's `unittype` at the boundary collapses the two arms into the compare the
// engines make. The version guard stays: it is the *block*'s scope, not the id's — Warlord
// inherits base CoM2's id 37 and has no such block.
// Since F267.6 the unit half is the **record** — `u.unittype` and `u.ishero`, the two `UnitT`
// members the test reads — rather than an identity object plus a `meta` restating the same two
// values. Both are seeded at the boundary and no step writes either, so reading them off the
// record before the sequence runs is the same answer at every position.
function isConstructCatapultUnit(u, abilities, version) {
  const isCoM1 = version === 'com_6.08';
  const isBaseCoM2 = !!(version && version.startsWith('com2_')
    && !version.startsWith('com2_warlord'));
  return !!(!!(abilities && abilities.combatSummoned)
    && !(u && u.ishero)
    && (isBaseCoM2 || isCoM1)
    && unittypeIs(version, u && u.unittype, 'catapult'));
}

// Spirit Link's cast (Warlord) writes the **permanent** record with selector 1 — `ABase`
// (`MASTER.CAS~"ABase=1"`): the flag, +2 Resistance, and, for a target that is Fantastic in its base
// unit data, `SMultiLabel := 14`, `AFantastic := 0` and `ALevel := 1`
// (`OLSpell.CAS!NOTAIRSUPPORT!+2..+11 "IF (SP<>SSpiritLink) THEN { GOTO" "}"`, the `SSpiritLink`
// block). The Air Support Doctrine grant makes the Fantastic and level pair on a newly created
// unit at two further sites (`COSpell.CAS` and `OLSpell.CAS`, both after the
// `IF (SP<>STAirSupportDoctrine)` branch entrance), and the Mystic
// Surge random-enchantment table makes the whole package at `R=43` (`SpellMysticSurge.CAS`); the
// calculator models one cast, so those are the same write reached another way.
//
// This is the pre-sequence spelling of `buffs:spiritLink:fantastic`, and since F263 it has one
// reader left: `buffs:spiritLink:level` (`stats_sequence.js`), the third write under the same
// `IF BASEFANTASTIC(TU)`, which ranks *behind* the Fantastic clear and so cannot re-read the
// record the clear has already falsified — the engine evaluates the block's gate once, and this
// is that latch. The cast's other write under the same gate, `SETSTAT(TU,SMultiLabel,1,14)`, used
// to travel as the `spiritLinkSentience` argument of `deriveOutlanderReformRecord` and is
// `buffs:spiritLink:sapiens` now, ranked *ahead* of the clear where the script writes it, so it
// reads the record at its own position like any other step (F245, F244.3h, F262, F263).
// The third parameter is the **permanent** Fantastic flag — `isFantasticBase`, the boundary
// record's own `fantastic` field at `template` rank — and not the running record's, which this
// step's own sibling falsifies (F267.6). Handing it the live record would be wrong for exactly the
// reason the latch exists.
function spiritLinkClearsPermanentFantastic(abilities, version, baseFantastic) {
  return !!(version && version.startsWith('com2_warlord'))
    && !!(abilities && abilities.spiritLink)
    && !!baseFantastic;
}

// The identity conversions, as steps of the one derivation sequence. They write the record's
// `race` and `fantastic` fields at their own chain positions, exactly like every other step:
// there is no identity pre-pass and no fixed point, so a gate that reads the calculated identity
// reads whatever stands in the record where that gate runs (F163). The compact `unitType` token
// is projected from those two fields wherever it is needed, so no conversion reads or writes it
// and the permanent predicates stay separately available. The source identity and the editable
// base predicates remain intact; a conversion mutates only the two live fields.
//
// **This list is complete: every write of `race` or `fantastic` the derivation makes is here,
// and no step here writes anything else.** Completeness is what lets a reader name the record it
// wants by naming a position — the permanent record for a targeting gate, the record the run
// left for a combat-time classification — and know that no unlisted write can move it (F246).
// It is the reason five conversions still carry a `:race` qualifier where the
// engine block also writes a stat, and `SPEC.md`, *Deliberate deviations*, records it as such.
// Three of the five are separately gated anyway, so only two are a grouping the evidence would
// merge: `b:fieryFury:race` is the THEN arm of the one `IF (BASEFANTASTIC(U))` whose ELSE arm is
// `b:fieryFury`; the Chaos Channels breath block writes its realm whenever the mutation is
// present while the calculator's strength half additionally asks whether a channel slot is free;
// and the modern `c:noHealConversion` is the *separate* No Heal normalization block at $005A0420,
// gated on `U.CombatEnchantmentFlags[EncNoHeal]` rather than on `EncMysticSurge`, which Raise Dead
// reaches too; CoM 1's `c:mysticSurge:race` is that build's own Mystic Surge realm write.
// `c:chaosChannels:armor:race` ($0059F4A3, 0x8F6FE) and `c:blackChannels:race` (0x8F4A1) are
// the two the address map puts inside their stat block, and each is chain-adjacent to it.
// The unit is the **record** since F267.6, read once here rather than from an identity object
// beside it. Every field this list reads — `unittype`, `ishero`, `herotype` — is seeded at the
// boundary and written by no step, so the eager read is the same answer the record gives at any
// position. The `meta` object this took beside the identity is gone with it: it restated
// `isHero` and `unittype`, which are record members, and a display name no conversion reads.
function identityConversionSteps(u, abilities, version) {
  const sourceUnitType = u.unittype;
  const isCoM1 = version === 'com_6.08';
  const isModern = version && version.startsWith('com2_');
  const isBaseCoM2 = isModern && !version.startsWith('com2_warlord');
  const combatSummonedValue = !!(abilities && abilities.combatSummoned);
  const isConstructCatapult = isConstructCatapultUnit(u, abilities, version);
  const isCoM1SummonBranch = isCoM1 && combatSummonedValue && !isConstructCatapult;
  // Call to Arms is the only shipped base-CoM2 combat summon for Paladins. Infer that spell
  // result from the retained Paladins template (STypeID 113) plus Combat Summoned; display names
  // and custom units do not establish the identity. The spell itself is sourced on
  // PROVENANCE[callToArmsPaladins] below, which lies outside this block's anchor window.
  // The template test is a `unittype` compare like every other type exception (F267.3): for a
  // roster unit the record's `unittype` **is** its template id, and a unit with no template
  // carries whatever id its `Special unit` key names, which is never 113.
  const isCallToArmsPaladins = !!(isBaseCoM2
    && combatSummonedValue
    && sourceUnitType === 113);
  // Fiery Fury and Sanctify read the permanent record, not the running one: `BASEFANTASTIC(U)`
  // and `ISHERO(U)` are base-record predicates in UnitCalcPre.CAS. `BASEFANTASTIC(U)` is the base
  // unit data "before applying continuous effects such as buffs or curses"
  // (`Reference docs/Script source/CAS reference/Scripts.TXT:286`) — the record the permanent-record phases
  // leaves, so `buffs:destiny`'s `B.Fantastic := True` ($0059A390) is in it, and the unit's own
  // training-time flag is not the whole of it (F192).
  // Spirit Link's cast clears the same flag (`buffs:spiritLink:fantastic` below) and Destiny's
  // re-asserts it per pass, so the answer is the record those two `buffs` writes leave — which is
  // what `a:baseCopy` publishes as `ctx.base`, read at `b:fieryFury:race`'s own position rather
  // than restated as a constant here (F244.3h, F245).
  const isHero = !!u.ishero;
  // One predicate for Spirit Link's two conversions: both blocks gate on the same
  // `GetEnchantmentFlag(U,EncSpiritLink,1)`, and neither tests the unit's realm or Fantastic
  // state, so the pair is a set/clear of one flag rather than two separately conditioned writes.
  const spiritLinkActive = !!(version && version.startsWith('com2_warlord'))
    && !!(abilities && abilities.spiritLink);

  return [
    // Spirit Link's cast clears the **permanent** record's Fantastic flag —
    // `IF BASEFANTASTIC(TU) THEN { … SETSTAT(TU,AFantastic,1,0); … }`, selector 1 — so a
    // base-Fantastic target is not Fantastic in the record `a:baseCopy` publishes, and the
    // per-pass region-`b`/`d` pair below is what makes it Fantastic again inside each
    // recalculation. The gate is the block's own `BASEFANTASTIC(TU)`, read off the record at this
    // position: `spiritLinkClearsPermanentFantastic` restates it ahead of the sequence for the
    // gates that still need it there, and the two must agree. It stands ahead of `buffs:destiny`,
    // whose `B.Fantastic := True` is a write the recalculation re-makes on every pass, so a
    // Destiny unit is Fantastic again by the time the record is copied.
    // Its two siblings under the same `IF BASEFANTASTIC(TU)`. `SETSTAT(TU,ALevel,1,1)` is
    // `buffs:spiritLink:level` (`stats_sequence.js`), ranked behind this step and taking the
    // gate latched for that reason. `SETSTAT(TU,SMultiLabel,1,14)` is the **Sapiens** label and
    // is `buffs:spiritLink:sapiens` (`stats_sequence.js`), ranked *ahead* of this step because
    // the script writes it first, so it re-reads the same `BASEFANTASTIC(TU)` off the record
    // before this step falsifies it (F263). Its one modelled reader is the reform's `NOTSAPIENS`
    // entrance at
    // `UnitCalcPre.CAS!NOMAGITEKENGINE!+2..+4 "IF (BASEFANTASTIC(U)>0)" "THEN { GOTO"`, whose
    // test is `BASEFANTASTIC(U)>0 %AND (SMultiLabel<>14)` and which reads both terms off
    // `ctx.base`. It is **not** redundant
    // with this clear, which a first draft claimed: the label survives Destiny's per-pass
    // `B.Fantastic := True`, so a Spirit Link + Destiny unit is permanently Fantastic again and
    // still labelled 14, and the script's conjunction admits it (F245 review, finding 2).
    // `DisAbil.CAS`'s Bombs & Grenades line reads the same pair and is display text.
    // The citation is the `SSpiritLink` block itself, which carries this write and the
    // `IF BASEFANTASTIC(TU)` that gates it. The same pair is written at three further sites — the
    // two Air Support Doctrine grants (`COSpell.CAS` and `OLSpell.CAS`, each after
    // `IF (SP<>STAirSupportDoctrine)`) and the Mystic Surge table's `R=43` arm
    // (`SpellMysticSurge.CAS`) — all reaching the same field on the same record, so the block the
    // control names is the one cited.
    // PROVENANCE[spiritLink:fantastic]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/OLSpell.CAS@span:10:33b04c988e4846d5dfe6cfbd
    statStep({ id: 'spiritLink:fantastic', sourceId: 'spiritLink', sourceLabel: 'Spirit Link',
      phase: 'buffs', writes: ['fantastic'],
      when: u => spiritLinkActive && !!u.fantastic,
      apply: u => { u.fantastic = false; } }),
    // Destiny's identity write is a **permanent**-record write, which is why it is a `buffs` step
    // and not a region-`c` one beside the calculated package `c:destiny` carries. The block at
    // $0059A35E..$0059A633 runs `B.race := 19; B.Fantastic := True;
    // B.attackflags.supernatural := True; B.experience := 0; B.level := 1` and only then the six
    // `U.*` multipliers, so the realm and Fantastic survive into `BaseUnits` and every later
    // recalculation seeds its calculated record from them. The calculator derives the landed
    // steady state (`SPEC.md`, *Deliberate deviations*), so the permanent write stands before the
    // pipeline. That is what retires the separate `destinyActive` term the loadout and level
    // gates used to carry: the record the permanent-record phases leave is exactly what
    // `if B.Fantastic then U.level := 1` ($0059A118) and the weapon block's
    // `not B.Fantastic and not B.ishero` ($0059E2B8) read (F163). It is chained after the
    // `CreateUnit.CAS` `training`-phase steps, which state the record as the unit was built.
    // Both halves share `PROVENANCE[destiny]`, cited at `c:destiny` (`stats_sequence.js`): one
    // span, $0059A35E..$0059A633, carries the permanent writes and the calculated package alike.
    // `B.attackflags.supernatural := True` at $0059A3EB is the third permanent write of that same
    // block, and it is `buffs:destiny:supernatural` (`stats_sequence.js`) rather than a field of
    // this step: a conversion writes `race` and `fantastic` and nothing else, which is the
    // deviation *An identity conversion is its own step even where its
    // engine block also writes a stat* already records for Chaos Channels and Black Channels. The
    // two entries are chain-adjacent, so no number can depend on the split (F201).
    statStep({ id: 'destiny', sourceLabel: 'Destiny', phase: 'buffs',
      writes: ['race', 'fantastic'],
      when: () => destinyActiveForUnit(abilities, version),
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // No `template:zombies` step. CoM 1's Zombies are Fantastic because the unit-type table says so —
    // `COM1_UT_ZOMBIES_ABILITIES` is `UA_FANTASTIC | UA_CREATE_UNDEAD`, raw `0x0081` at file
    // `com1:0x2AED2`, which construction copies wholesale. That is template data, and
    // `units_com.js` already carries it as `baseFantastic` on templateId 174. A step re-asserting
    // it was a no-op for every roster unit, and for a custom unit it let the special-unit selector
    // override the Fantastic control the user had set. The roster owns the fact (F203).
    // No CoM 1 identity conversion in the `template` phase either, since F267.1. The two that
    // used to sit there — the Construct Catapult conversion and the combat-summon branch — write
    // the **calculated** record, so they are region-`a` steps beside their modern counterparts.
    // `BU_UnitLoadToBattle` calls `Load_Battle_Unit` (`combat.c`, com1:0x75C8A), which imports the
    // persistent record and runs the whole unit calculation, and only *after* it returns does the
    // summon path reach `bu->race = RACE_LIFE` (com1:0x75D56), `bu->race = RACE_NATURE`
    // (com1:0x75D65) and `bu->Abilities |= UA_FANTASTIC` (com1:0x75D6C) — all three on the battle
    // unit `bu`, none on `_UNITS[]`. No CoM 1 write makes the *permanent* record Fantastic, which
    // is what lets `u.fantastic` at `template` rank be the permanent flag in all five versions.
    // The one CoM 1 construction patch that is genuinely persistent keeps its `template` rank:
    // `_UNITS[si].mutations = UM_MAGIC_WEAPONS` at com1:0x8EEAF, which is
    // `template:constructCatapult:weapon` (`stats_sequence.js`), written inside `Load_Battle_Unit`
    // ahead of the quality read at com1:0x8F024 that re-reads the record. *Where* in the
    // calculated regions the two conversions then stand is a separate question, and the CoM 1
    // chain entry in `stats_manifests.js` carries it: the rank they were given is a named
    // temporary deviation, not the engine's own position.
    // PROVENANCE[combatSummoned]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:3:8b5b382b46651d5d1ddfb014
    statStep({ id: 'combatSummoned', phase: 'a', writes: ['fantastic'],
      when: () => isModern && combatSummonedValue,
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[chosen]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:c9d9c1b29c14707318605a05 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:f9fdc8e8e8cb9c94edf0f936 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/MODDING.INI@span:1:f9fdc8e8e8cb9c94edf0f936
    statStep({ id: 'chosen', phase: 'a', writes: ['race', 'fantastic'],
      // `B.unittype = ChosenUnitID` (`Units.RecalculateUnits.pas:1611`) is the write this block
      // tests, so the gate is the record's own id compare (F267.3).
      when: u => isModern && unittypeIs(version, u.unittype, 'chosen'),
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // One step for CoM 1 and base CoM2 alike: `isConstructCatapultUnit` is one predicate, both
    // engines write the same two fields on the calculated record, and the shared
    // `PROVENANCE[constructCatapult]` already names all three versions. It used to be two steps
    // only because CoM 1's was misfiled in the `template` phase (F267.1).
    // PROVENANCE[constructCatapult]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/combat.c@span:33:d95c9aa843da2010e42b8f16 | Reference docs/Caster binary/Spells.CombatSummonUnit.pas@span:21:1650fe50059f7cde525a29fd | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:13:22d4847c5bd5843526ea3fc0 | TABLE=Reference docs/Script source/Warlord 1.5.12.9/spells.ini@span:14:0c00ef951862849e15604add | TABLE=Reference docs/Script source/Warlord 1.5.12.9/spells.ini@span:18:0dad2f766ea1e74b0aa62aa1
    statStep({ id: 'constructCatapult', phase: 'a', writes: ['race', 'fantastic'],
      when: () => (isBaseCoM2 || isCoM1) && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // CoM 1's other combat-summon arm. `bu->race = RACE_LIFE` for Paladins (com1:0x75D56) and
    // `RACE_NATURE` for Centaurs and Catapults (com1:0x75D65), then the unconditional
    // `bu->Abilities |= UA_FANTASTIC` at com1:0x75D6C. The Catapult half of that race test is the
    // step above, which is why this one takes the branch the Construct Catapult predicate leaves.
    // PROVENANCE[summonBranch]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:33:d95c9aa843da2010e42b8f16
    statStep({ id: 'summonBranch', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isCoM1SummonBranch,
      apply: u => {
        if (sourceUnitType === 113) u.race = 'Life';
        if (sourceUnitType === 54) u.race = 'Nature';
        u.fantastic = true;
      } }),
    // PROVENANCE[callToArmsPaladins]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Spells.CombatSummonUnit.pas@span:21:1650fe50059f7cde525a29fd | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:13:fff6a55971377c87264d2e0d | TABLE=Reference docs/Script source/Warlord 1.5.12.9/spells.ini@span:13:5f2ec3d006ad08bc02189c7b
    statStep({ id: 'callToArmsPaladins', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isBaseCoM2 && isCallToArmsPaladins,
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // The Chaos Channels breath block writes the realm beside the fire-breath assignment in
    // every engine, but not in the same region. `Caster.exe` makes it at $00599EE8, ahead of
    // the UnitCalcPre hook, so the modern builds keep phase `a`; the DOS builds make it inside
    // `BU_Apply_Specials` at 131:0x8F720 / com1:0x8F474, one block past the demon-wings write
    // the chains already place in region `c`, so their half is `c` at that address (F103).
    // Both MoM builds set the realm alone — a race at or above the first fantastic value is
    // fantastic there whether or not `UA_FANTASTIC` is set (`unitcalc.c`, the
    // `bu->race >= RACE_FIRST_FANTASTIC` test) — so writing both fields here matches all five.
    // PROVENANCE[chaosChannels:fireBreath:race]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:b9b73d98478711f2be56c0a9 | Reference docs/DOS reconstructed/unitcalc.c@span:7:8ee2be8fe3596d5bdc7acc0a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:c39e26f9ccd713b815403313
    ...['a', 'c'].map(phase => statStep({
      id: 'chaosChannels:fireBreath:race', sourceId: 'chaosChannels:fireBreath',
      sourceLabel: 'Chaos Channels', phase, writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccFireBreath', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } })),
    // Spirit Link's first write, and the head of region `b`: `SETSTAT(U,AFantastic,0,1)` at
    // `UnitCalcPre.CAS!NOSPIRITLINK!-11 "SETSTAT(U,AFantastic,0,1);"`, record selector `0` — the calculated record — with no test of the
    // unit's own Fantastic state above it. The region-`d` `spiritLink` step below clears the same
    // field, so the two are a fixed point only at the end of the derivation; every read between
    // them takes a Fantastic unit. Both share `PROVENANCE[spiritLink]`, cited at that step.
    statStep({ id: 'spiritLink', phase: 'b', writes: ['fantastic'],
      when: () => spiritLinkActive,
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[marionetteChanneler]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913
    statStep({ id: 'marionetteChanneler', phase: 'b', writes: ['fantastic'],
      when: () => version === MARIONETTE_VERSION
        && u.herotype === MARIONETTE_HERO_TYPE_ID
        && !!(abilities && abilities.channeler),
      apply: u => { u.fantastic = true; } }),
    // The THEN arm of Fiery Fury's one `IF (BASEFANTASTIC(U))`; `b:fieryFury` is its ELSE arm.
    // PROVENANCE[fieryFury:race]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:17:e0211f9ae323b4ad5ba16aa7
    statStep({ id: 'fieryFury:race', sourceId: 'fieryFury', sourceLabel: 'Fiery Fury',
      phase: 'b', writes: ['race', 'fantastic'],
      when: (u, ctx) => hasAbil(abilities, 'fieryFury') && !!ctx.base.fantastic,
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // Sanctify writes the Life realm unconditionally; its separate Fantastic write is gated on
    // a non-hero clergy unit. Two writes, not the three-branch compact-token approximation the
    // realm-less `hero` token used to force.
    //
    // The `sanctify` gate is the one grantable-ability read F202 left standing that a positioned
    // grant really can move, and it cannot move under F202 alone. Sancta Basilica's block writes
    // `SETSTAT(U,SResist,1,+3)` and then `SETENCHANTMENTFLAG(U,EncSanctify,ABase,1)` in two of its
    // four `STypeID` branches (`CreateUnit.CAS!NOFROSTCLUB!+5..+14 "SETSTAT(U,SResist,1,(GetStat(U,SResist,1)+3));" "SETENCHANTMENTFLAG(U,EncSanctify,ABase,1);"`), and it carries a stat delta rather than a bare
    // flag, so it is already
    // `training:sanctaBasilica`. F200 stage 3 widens that step onto these branches, at which point the
    // flag is a positioned write and this gate must read the record. What used to block doing it
    // here was the identity projection, which replayed the conversion list alone and so could not
    // see `training:sanctaBasilica`; F246 deleted the projection, so nothing stands in the way of
    // the record read any more and F200 stage 3 can simply make it.
    // PROVENANCE[sanctify]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:9:e23e1931b3ccaf4ea86bae2e
    statStep({ id: 'sanctify', sourceLabel: 'Sanctify', phase: 'b',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'sanctify'),
      apply: u => {
        u.race = 'Life';
        if (hasAbil(abilities, 'clergy') && !isHero) u.fantastic = true;
      } }),
    // PROVENANCE[chaosChannels:flight]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:2ae7951f1bbf4272fb3fb151 | Reference docs/DOS reconstructed/unitcalc.c@span:6:e09942f2ee9f377d85168241 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:11:81ed5af7fe4aa5e7b8bcf958
    statStep({ id: 'chaosChannels:flight',
      sourceLabel: 'Chaos Channels', phase: 'c', writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccFlight', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // PROVENANCE[chaosChannels:armor:race]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:7:bd2b6b86ac7fbcc85505a039 | Reference docs/DOS reconstructed/unitcalc.c@span:6:2202b972a2c87abe05bad467 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:490bf1c3cfe8b5827cde324a
    statStep({ id: 'chaosChannels:armor:race', sourceId: 'chaosChannels:armor',
      sourceLabel: 'Chaos Channels', phase: 'c', writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccDefense', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // Warlord is out of scope rather than gated: `UnitCalc.CAS` recasts the spell as Frenzy and
    // sets `EncBloodLust` only afterwards, so the compiled region-`c` block never sees the flag.
    // PROVENANCE[bloodLust]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:7:43a34010d4b8c511782d0586 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:13:ef98ab4f1bd2277cbd5fb59a | Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:10:22628deef93aef7a52582f1a
    statStep({ id: 'bloodLust', sourceLabel: 'Blood Lust', phase: 'c',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'bloodLust'),
      apply: u => { u.race = 'Death'; u.fantastic = true; } }),
    // PROVENANCE[blackChannels:race]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:19:4a92e2a9611b35504558f854
    statStep({ id: 'blackChannels:race', sourceId: 'blackChannels',
      sourceLabel: 'Black Channels', phase: 'c', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'blackChannels'),
      apply: u => { u.race = 'Death'; u.fantastic = true; } }),
    // One conversion for both controls: CoM 1's Animated block writes the Death realm itself,
    // and `Caster.exe`'s Animated block sets `EncUndead` for the aggregate normalization that
    // follows it. `c:animated` carries the same block's stat half.
    // PROVENANCE[undead]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:e9bb34d05b36853748045d37 | Reference docs/DOS reconstructed/unitcalc.c@span:8:204c1ca5e5884733de92e687 | Reference docs/DOS reconstructed/unitcalc.c@span:19:6f6aeaf7cbc23a280cd7996e | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:b7e9d476a7f9ec33bbaca56c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:53a2c4bd769924b58f286c8d
    statStep({ id: 'undead', sourceLabel: 'Undead', phase: 'c', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'undead') || hasAbil(abilities, 'animated'),
      apply: u => { u.race = 'Death'; u.fantastic = true; } }),
    // The No Heal normalization block, $005A0420..$005A04A9 — `if U.CombatEnchantmentFlags`
    // `[EncNoHeal] then U.race := 21; U.Fantastic := True`, immediately after the Mystic Surge
    // block that derives the flag. A separate block with a separate gate, so a separate step.
    // CoM 1 alone. Its block is gated on the Mystic Surge enchantment itself — `if (ench &
    // UE_MYSTIC_SURGE) { bu->race = rt_Fantastic_No_Realm; }` at com1:0x8F79E — not on a No Heal
    // flag, so it is a Mystic Surge write and not the shared conversion the modern builds have.
    // PROVENANCE[mysticSurge:race]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:8:185c85844cf35c344b38d022
    statStep({ id: 'mysticSurge:race', sourceId: 'mysticSurge', sourceLabel: 'Mystic Surge',
      phase: 'c', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'mysticSurge'),
      apply: u => { u.race = 'No Heal'; u.fantastic = true; } }),
    // The modern builds' shared No Heal conversion, `$005A0420..$005A04A9`: `if
    // U.CombatEnchantmentFlags[EncNoHeal] then U.race := 21; U.Fantastic := True`. One block with
    // two flag sources, so one step with a disjunctive gate rather than a step per source. Mystic
    // Surge derives the flag during the recalculation immediately above ($005A016D), and the Raise
    // Dead cast writes it on the permanent record before the recalculation runs
    // (`Spells.InitializeCombatSpellcasting.pas`, `B^.CombatEnchantmentFlags[EncNoHeal] := True`).
    // The flag itself is not a record field here: the conversion is its only reader in either
    // engine family, so modelling the reader's two gates is equivalent and the state the block
    // leaves — the race — is what every consumer asks for.
    // PROVENANCE[noHealConversion]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:23:662a6a49c604798625ed7e49 | Reference docs/Caster binary/Spells.InitializeCombatSpellcasting.pas@span:28:deb5b65ff17f3f2812792a90
    statStep({ id: 'noHealConversion', sourceLabel: 'No Heal', phase: 'c',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'mysticSurge') || hasAbil(abilities, 'raiseDead'),
      apply: u => { u.race = 'No Heal'; u.fantastic = true; } }),
    // CoM 1 alone: the resurrection writes `bu->race = rt_Fantastic_No_Realm` directly at
    // com1:0xAB2B8, with no flag and no recalculation block behind it. Its rank here is deduced —
    // the write is a combat-spell one, made at the unit's creation moment rather than by this
    // routine, and moving it to `training` is its own item.
    // PROVENANCE[raiseDead]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:38:1261faf60c16514c7ab3e276
    statStep({ id: 'raiseDead', sourceLabel: 'Raise Dead', phase: 'c',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'raiseDead'),
      apply: u => { u.race = 'No Heal'; u.fantastic = true; } }),
    // Spirit Link's second write, clearing what `b:spiritLink` asserted.
    // PROVENANCE[spiritLink]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:5:344debdbb9d0f10a4e4b26a1 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:1:15d81b9f3b72c934c9219502 | Reference docs/Script source/Warlord 1.5.12.9/OLSpell.CAS@span:10:33b04c988e4846d5dfe6cfbd
    statStep({ id: 'spiritLink', phase: 'd', writes: ['fantastic'],
      when: () => spiritLinkActive,
      apply: u => { u.fantastic = false; } }),
  ];
}

// F246 deleted `targetingIdentity` from here. It replayed the conversion list on a scratch
// record so that a read wanting the record the recalculation *leaves* could be answered ahead of
// the sequence. Every such read is now classified: a cast-time **targeting** gate reads the
// permanent record `a:baseCopy` publishes, and a **combat-time** classification reads the record
// the run itself left, resolved below the run in `deriveUnitStats`.

// The ability keys a grant hoist can write that some step then reads. Each is a field of
// `statRecord`, seeded from the effective ability set, so the step that reads it asks the record
// at its own position instead of taking the ability as a pre-sequence constant (F202). This is
// what a positioned grant needs: five of the keys below already carry one — `lucky`, `trueSight`,
// `fireImmunity`, `lightningResist` and `mechanical`, listed as such further down — and a reader
// that took any of them as a constant would answer from the wrong rank.
//
// Membership is "granted by a hoist **and** read by a step", not the whole grantable set: a key
// no step reads needs no field, and a read that is itself part of a hoist moves with that hoist.
//
// Two further exclusions closed F202 rather than adding a field (stage 2). The first was that a
// key whose grant is a **permanent write carrying no stat delta** earns no step, so no step could
// ever move it and a field would restate a constant. F244 overturned that half: every modification
// of the record is a positioned write, whether or not it carries a delta. `fieryBlade` was the
// first to move — its grant is `training:lavaSmelter:flameBlade` and the key is now on both lists
// (F244.3c). `powerEngine` and `discipline` were the next two: F244.3d gave each a `training`
// write of its own, which is what re-opened their F209/F202 ruling, and each is now read off the
// record at the position that used to take it as a pre-sequence constant. `flying` was the last
// of the four, and F244.3e settled it the same way: `training:temporalDrive` writes it and
// `b:bombsGrenades`'s qualification gate reads it off the record, so it is on both lists too.
// **All four F209 rulings that stood on the retired criterion have now fallen.** The second
// exclusion still holds: a key whose only readers are **result** fields, the
// weapon material among them, has nowhere to take a rank: `SPEC.md`, *The step model*, gives the
// finished record to those, and `effectiveWeapon` and Metal Fires' upgrade already do.
// `resistMagic` is exactly that shape — its only reader is `effectiveResistance:resistMagic`, an
// attack-specific step over the finished set — so its writes are positioned without it taking a
// read side here. `haste` and `energyWeaponry` joined it in F244.3e: combat resolution reads both
// off the finished map (`combat.js`, the attack-repeat gate and the melee-Doom decision) and no
// step gates on either, so each takes a positioned write and no read row.
const POSITIONED_GRANT_FIELDS = [
  'lucky',        // applySanctaBasilicaGrant, applyPillarOfFaithGrant,
                  // `b:marionette:books:lucky`, `b:divineProtection`  ->  `c:lucky`
  'fieryBlade',   // `training:lavaSmelter:flameBlade`  ->  `c:flameBlade`'s gate and
                  // `c:metalFires`'s non-stacking gate
  'armorclad',    // `training:armorclad`  ->  `training:magitekScience`'s Armorclad gate
  'powerEngine',  // `training:powerEngine`  ->  `training:energyCannon`,
                  // `d:energyCannonThreshold` and the post-chain Destruction write
  'mechanical',   // `buffs:rebuild` (non-hero only, F217.3)  ->  `training:artificer`,
                  // `d:mechanicalExpert`
  'rebuild',      // `buffs:rebuild:cast`, `b:marionette:strayedPackage`
                  //   ->  `buffs:rebuild` / `b:rebuild`
  // The strayed Marionette package's own read side. `UnitCalcPre.CAS` writes the permanent
  // `EncTransmuteEquipment` in the strayed block at line 371 and the hero augmentation 298 lines
  // later opens on `GetEnchantmentFlag(U,EncTransmuteEquipment,1)` — the permanent flag, read at
  // its own rank — so `b:transmuteEquipment:heroAugment`'s gate is a record read and the two ranks
  // are what order it (F244.3f). `rebuild` above is the same shape one block further on. Since
  // F256.2 the flag also arrives from the cast's own control, at `buffs:transmuteEquipment:cast`,
  // so the augmentation is reachable by a hero that is no Marionette at all — which is what
  // retired the step's Marionette-flavoured id.
  'transmuteEquipment', // `b:marionette:strayedPackage`, `buffs:transmuteEquipment:cast`
                        //   ->  `b:transmuteEquipment:heroAugment`
  // The block's own skip: `IF (GETOLENCHANTMENTFLAG(U,EncSpellLock,1)>0) THEN { GOTO
  // "NOLONGERSTRAYEDMARIONETTE" }` refuses the seven writes on a Wanderer that already carries
  // Spell Lock, and `b:marionette:spellLock` is the write that sets it, one rank later. Since
  // F244.3f widened the control to the three CoM-era engines, a Warlord card can state Spell
  // Lock and `buffs:spellLock:cast` puts it on the record ahead of region `b`, so this gate is
  // reachable from an input rather than only from the two steps' order: a Wanderer marked Spell
  // Lock is refused the whole strayed package, which is what the script does.
  'spellLock',    // `b:marionette:spellLock`  ->  `b:marionette:strayedPackage`'s skip
  'trueSight',    // `b:eyeOfHeaven`  ->  `c:trueSight`, `d:trueSight`
  'fireImmunity',    // `b:insulation`, `b:marionette:books:fireImmunity`  ->  `c:innerPower`
  'lightningResist', // `b:insulation`, `b:marionette:books:lightningResist`  ->  `c:innerPower`
  'magicImmunity',   // the template seed and `immunities:magicImmunity:marked`
                     //   ->  the nine `debuffs:*:cast` gates
  'flying',       // `training:temporalDrive`  ->  `b:bombsGrenades`'s qualification gate
  'illusion',     // `b:marionette:ascension:illusion`  ->  the Illusion malus inside `b:trueLight`
  // The Sapiens label, `SMultiLabel = 14` (F263). The `NOTSAPIENS` gate's second term reads it —
  // `GETSTAT(U,SMultiLabel,1)`, selector 1, the permanent record — so the six region-`b` steps
  // `outlanderSapiensAt` gates read it off `ctx.base` beside the `BASEFANTASTIC(U)` term F262
  // positioned. The `sapiens` control seeds it and `buffs:spiritLink:sapiens` is the cast's write.
  'sapiens',      // the template seed and `buffs:spiritLink:sapiens`  ->  `outlanderSapiensAt`
];

// The ability keys a **positioned grant step** writes. Each is a record field seeded from the
// pre-grant ability set, written at the rank its own engine block has, and read back into the
// published ability set after the chain — the shape F199 gave the curse flags, one layer out
// (F200). `POSITIONED_GRANT_FIELDS` above is the read side of the same move: a key some step
// gates on. A key here is one no hoist writes any more, so the record is its only carrier and the
// post-chain read-back is what hands it to combat resolution.
//
// Nine keys are in both lists, because a positioned write of theirs also has a positioned reader:
// `fieryBlade` (`training:lavaSmelter:flameBlade` writes it; `c:flameBlade` and `c:metalFires`
// read it, and the weapon result field reads the finished record — F244.3c),
// `armorclad` and `powerEngine` (`training:armorclad` and `training:powerEngine` write them;
// `training:magitekScience` reads the first and `training:energyCannon` the second — and, since
// F244.3e, `training:temporalDrive` reads the second too — each at the
// position the script's own upgrade route reads its `GETENCHANTMENTFLAG` at — F244.3d),
// `flying` (`training:temporalDrive` writes it and `b:bombsGrenades`'s qualification gate reads it,
// which is the interaction that retired F209's last flag-versus-delta ruling — F244.3e),
// `lucky` (`b:divineProtection` writes it, `c:lucky` reads it, and combat resolution reads the
// finished value — `combat_phases.js`, MoM 1.31's enemy melee penalty), `trueSight`
// (`b:eyeOfHeaven` writes it, `c:trueSight` and `d:trueSight` read it), `fireImmunity` and
// `lightningResist` (`b:insulation` writes them, `c:innerPower`'s eligibility test reads them),
// and `mechanical` (`buffs:rebuild` writes it — the hero-branch `b:rebuild` does not, because its
// script line writes the calculated record and every reader asks for the permanent one, F217.3 —
// while `training:artificer` and `d:mechanicalExpert` read it — and take opposite answers, because the writes are cast-time and
// the retort's read is training-time, F208).
const POSITIONED_GRANT_WRITES = [
  'largeShield',      // `b:magitekEngine`, `d:rust` (clear), `d:fortification`
  'rebuild',          // `buffs:rebuild:cast` — the cast's own flag. On both lists for the
                      // reason the five below are: `buffs:rebuild` and `b:rebuild` read it at
                      // their own rank, and combat resolution reads the finished value
                      // (`applyRebuildEffects`, `combat_effects.js`), so the record has to be
                      // its carrier in both directions (F244.3b review, finding 3).
  'missileImmunity',  // `d:fortification`'s already-shielded arm,
                      // `training:lavaSmelter:missileImmunity`
  // The other four Lava Smelter grants (F244.3c). The three carry the card's own mark two
  // different ways. `weaponImmunity` has one control, a `template` row and no marked row, so its
  // seed carries the mark and the training write adds the mineral pair's. `missileImmunity` is
  // dual-source: since F252.4 its seed carries the **innate** control and its `immunities` row
  // carries Guardian Wind and Hillfort, with the training write adding the pair's on top of
  // whichever of the two stands (F244.3c review, finding 2; F252.4). `resistElements`,
  // `elementalArmor` and `fieryBlade` have no control of their own at all, so the step is their
  // only source in any version.
  'weaponImmunity',   // `training:lavaSmelter:weaponImmunity`
  'resistElements',   // `training:lavaSmelter:resistElementsAlias`
  'elementalArmor',   // `training:lavaSmelter:elementalProtection`
  'fieryBlade',       // `training:lavaSmelter:flameBlade`
  // The Outlander reform's three flag grants (F244.3d). `armorclad` and `powerEngine` have no
  // control of any kind, so their `training` step is the only source in any version;
  // `resistMagic` has an enchantment control in all five, whose mark arrives at
  // `buffs:resistMagic:cast`, and a Marionette book grant that is still a declared seed carry.
  'armorclad',        // `training:armorclad`
  'powerEngine',      // `training:powerEngine`
  'resistMagic',      // `training:magitekScience`, `buffs:resistMagic:cast`
  // The Anti-Gravity Drive block's three permanent writes and the `!COMBATOVERRIDE!` Doom write
  // (F244.3e). `haste` and `illusionImmunity` have a control of their own whose mark reaches the
  // record its own way — Haste is a cast enchantment with no `template` row, so
  // `buffs:haste:cast` carries it, while Illusion Immunity is a template ability and its seed
  // does; `flying` is a Warlord-only template ability, and `energyWeaponry` has no control at all,
  // so the step is its one source.
  'haste',            // `training:temporalDrive`, `buffs:haste:cast`
  'flying',           // `training:temporalDrive`
  'energyWeaponry',   // `d:energyWeaponry`
  'deathImmunity',    // `b:divineProtection`
  'lucky',            // `b:divineProtection`
  'rage',             // `training:altarOfTheMoon`
  'poisonImmunity',   // `training:altarOfTheMoon`, `d:venom`
  'blackpowder',      // `training:militaryWorkshop`
  'armorPiercing',    // `training:militaryWorkshop`, `d:blazeOfGlory`
  'energyCannon',     // `training:energyCannon`
  'wallCrusher',      // `b:bombsGrenades`, `d:blazeOfGlory`
  'firstStrike',      // `d:blazeOfGlory` (clear)
  'mechanical',       // `buffs:rebuild` — `SETSTAT(TU,SCustomAttribute,1,1)`; the hero
                      // branch writes selector 0, which nothing reads (F217.3)
  'supernatural',     // `buffs:destiny:supernatural` — `B.attackflags.supernatural := True`
  'trueSight',        // `b:eyeOfHeaven`
  'illusionImmunity', // `c:trueSight`, `training:temporalDrive`
  'fireImmunity',     // `b:insulation`
  'lightningResist',  // `b:insulation`
  'coldImmunity',     // `b:insulation`
  // The strayed Marionette package's two flag writes and the Spell Lock write that follows it
  // (F244.3f). `transmuteEquipment` has a cast enchantment control in Warlord since F256.2 and no
  // `template` row, so `buffs:transmuteEquipment:cast` carries the card's mark the way
  // `buffs:haste:cast` and `buffs:spellLock:cast` carry theirs, and this region-`b` write adds
  // the strayed branch's on top; `charmed` is a template ability in all five and its seed carries the card's mark,
  // with this write adding the branch's on top; `spellLock` is a cast enchantment in all three
  // CoM-era engines, so its `buffs` origin covers them and this region-`b` write is Warlord's
  // alone — the two can meet, and the cast one wins the package gate. `rebuild` is on the list
  // above already — `buffs:rebuild:cast` writes it too.
  'transmuteEquipment', // `b:marionette:strayedPackage`, `buffs:transmuteEquipment:cast`
  'charmed',            // `b:marionette:strayedPackage`
  'spellLock',          // `b:marionette:spellLock`
  // The owned Marionette branch's flag grants (F244.3g). Eleven keys join here; the fourteen the list
  // already carried — `largeShield`, `missileImmunity`, `weaponImmunity`, `resistMagic`,
  // `deathImmunity`, `lucky`, `poisonImmunity`, `armorPiercing`, `wallCrusher`, `firstStrike`,
  // `illusionImmunity`, `fireImmunity`, `lightningResist` and `coldImmunity` — take the branch's
  // write on top of whatever their own step or seed already put there.
  //
  // Three groups, by how the card's own mark reaches the record. `stoningImmunity`, `illusion`,
  // `invisibility` and `bloodSucker` are template abilities, so their seed carries the mark and the
  // branch's write adds to it — `bloodSucker`'s control is Warlord's alone, which is the only
  // version this branch runs in anyway. `bless` has no `template` row: its only control is a cast
  // enchantment, so `buffs:bless:cast` carries the card's mark, the way `haste` and `spellLock` are
  // carried (`permanentCastFlagSteps`). And `forester`, `mountaineer`, `healer`, `counterImmunity`,
  // `createUndead` and `healingAura` have no control of any kind in any version, so the branch's
  // step is their one source — each stands for a real engine write (`AForester`, `AMountaineer`,
  // `AHealer`, `ACounterImmunity`, `ACreateUndead`, `AHealingAura`) that no modelled reader
  // consumes, so the record carries them and combat resolution reads past them.
  'forester',         // `b:marionette:books:forester`
  'mountaineer',      // `b:marionette:books:mountaineer`
  'stoningImmunity',  // `b:marionette:books:stoningImmunity`
  'healer',           // `b:marionette:books:healer`
  'counterImmunity',  // `b:marionette:ascension:counterImmunity`
  'illusion',         // `b:marionette:ascension:illusion` — also on the read list above
  'bless',            // `b:marionette:ascension:bless`, `buffs:bless:cast`
  'bloodSucker',      // `b:marionette:ascension:bloodSucker`
  'createUndead',     // `b:marionette:ascension:createUndead`
  'invisibility',     // `b:marionette:ascension:invisibility`
  'healingAura',      // `b:marionette:ascension:healingAura`
  // Spirit Link's first write inside `IF BASEFANTASTIC(TU)`, `SETSTAT(TU,SMultiLabel,1,14)`
  // (F263). The key is dual-source in neither direction — its one control is the Warlord
  // `ABILITY_DEFS` `sapiens`, so the seed carries the card's mark and this step adds the cast's
  // on top, the way `charmed` and `flying` take theirs.
  'sapiens',            // `buffs:spiritLink:sapiens`
];

// The same move for the three ability fields that carry a **value** rather than a flag. They are
// seeded verbatim instead of through `!!`, and read back on the same rule, so an absent key stays
// absent. `poison` is written by four positioned steps in a row — `training:altarOfTheMoon`'s two
// `STypeID` branches assign it, then `training:militaryWorkshop`, `training:motherFungus` and `d:venom`
// each make the script's `<>100` increment — and the chain is what orders them; the merge that
// used to do this restated their precedence by hand and lost one increment (F201). `lifeSteal` is
// written by `training:altarOfTheMoon`'s Witchdoctor branch and by `d:pneumaField`.
// `discipline` joined them in F244.3d. Its value is `'overland'` or `'combat'`, the calculator's
// distinction between where the spell was cast, which the engine's single `EncDiscipline` flag
// does not carry; `training:militaryDrilling` writes the overland one and `buffs:discipline:cast`
// overwrites it with whatever the card states, which is the precedence the retired
// `discipline === 'combat' ? 'combat' : 'overland'` merge stated by hand. `c:discipline` reads it
// off the record at its own position, and the finished record answers the Combat-Discipline First
// Strike cancellation.
// The strayed Marionette's four hero-ability grants joined them in F244.3f. Each is a
// `SETHEAB(W,48,HA…,<n>)` — a rank on the wizard's hero record rather than a flag — and the
// script states 2 for Sage, Mechanical Master, Ritual Master and Arcane Ward. None has a control
// or a `template` row in any version, so `b:marionette:strayedPackage` is their one source and an
// absent key stays absent everywhere else.
// The owned Marionette branch's four value grants joined them in F244.3g. `stoningTouch`,
// `exorcise` and `destruction` are numeric card abilities whose seed carries the card's own value
// and whose ascension write overwrites it — the script's `SETSTAT(U,AF…,0,<n>,1)` is an assignment,
// not an increment. `regeneration` is the one increment in the whole branch
// (`SETSTAT(U,SRegeneration,0,GETSTAT(U,SRegeneration,0)+2)`), and it has no control and no
// `template` row in any version, so `b:marionette:ascension:regeneration` is its one source. `poison` and
// `lifeSteal` were already here and take the branch's assignment like any other write at its rank.
const POSITIONED_GRANT_VALUE_WRITES = ['poison', 'lifeSteal', 'discipline',
  'sage', 'mechanicalMaster', 'ritualMaster', 'arcaneWard',
  'stoningTouch', 'exorcise', 'destruction', 'regeneration'];

// Lava Smelter (Warlord): five independent mineral-pair grants, each a permanent write the owning
// city makes and each its own `training` step (F244.3c). A unit receives them when the city builds
// it — `CreateUnit.CAS` 494-498, the five writes inside the `ISBUILT(C,BLavaSmelter)` block that
// runs between `!NOACADEMY!` and `!NOLAVASMELTER!` — and Upgrade & Retrain applies the same five
// later to any existing non-Fantastic unit (`OverlandEndTurn.CAS` 527-551, each behind a
// "does it already have it" skip). The two entrances are one modelled step at the creation
// position, for the reason `training:armorclad` is (`stats_manifests.js`).
//
// Until F244.3c the five were a pre-sequence hoist merged into the ability map, and the reason
// given for keeping the Fiery Blade half there was that `hasWarlordBlade` (`stats.js`) had no rank
// to read it at. It has one now: the two blade consumers that are steps read `fieryBlade` off the
// record at their own position, and the weapon *result* field reads the record the run leaves.
// That is what re-opens F202's ruling — see the F244.3c report.
//
// All five keys are record fields (`POSITIONED_GRANT_WRITES` above), so the record is their only
// carrier and the post-chain read-back is what hands them to combat resolution. The Wall-of-Fire
// siege effect is not modelled here (it has its own global toggle).
//
// Each step id is the reviewed anchor's own name rather than the key's, so moving these five
// citations off the retired transform and onto the steps leaves their
// `provenance_verified_anchors.json` bindings untouched.
//
// `unitType` is the **permanent** unit type the caller resolved, which is the
// block's one gate outside the mineral tests: `OverlandEndTurn.CAS`:446
// `IF (BASEFANTASTIC(U)>0) THEN { GOTO "NOOUTLANDERUPGRADE"; }` stands upstream of the retrain
// entrance, and the creation entrance is unreachable for a summoned Fantastic unit. A `training`
// step runs before `a:baseCopy`, so the gate takes the permanent type as a closure constant rather
// than off `ctx.base` — the rule `ORIGIN_PHASE` states (`stats_origins.js`). There is no race and
// no hero term in either block; the two `preset_vacuity_sweep` declarations on
// `lavaSmelterUpgradeRetrainNonDwarfWarlord` and `lavaSmelterUpgradeRetrainHeroWarlord` are what
// pin that.
//
// `marked` is the ability set the card states. The legacy `lavaSmelter` selector is still read so
// old presets and share payloads keep loading; new UI state uses the five independent booleans and
// can therefore carry every applicable pair at once.
// The version scope is `STEP_VERSION_SCOPES`' (`steps.js`), so these carry no version term.
function lavaSmelterGrantSteps(unitType, marked) {
  const fantasticBase = (unitType || '').startsWith('fantastic_');
  const legacy = marked.lavaSmelter || 'none';
  // The body every one of them has: the mineral pair's own control or the legacy selector's value
  // is the mark, the permanent Fantastic test is the block's shared gate, and the write is the
  // flag. Written once so a grant cannot be added without the gate that admits it.
  const grant = (key, control, legacyValue, label) => ({
    sourceId: control, sourceLabel: label, writes: [key],
    when: () => !fantasticBase && (!!marked[control] || legacy === legacyValue),
    apply: u => { u[key] = true; } });
  return [
    // PROVENANCE[lavaSmelter:weaponImmunity]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS@span:20:6b832639e6e0656624d526f2 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:5:19b52f5f80442e39e3d39683
    statStep({ id: 'lavaSmelter:weaponImmunity', phase: 'training',
      ...grant('weaponImmunity', 'lavaSmelterWeaponImmunity', 'weaponImmunity', 'Lava Smelter: Weapon Imm.') }),
    // PROVENANCE[lavaSmelter:missileImmunity]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS@span:21:b4b1a5faba3c07399d273ecc | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:11:d560f73eb0a27ed8c05f0521
    statStep({ id: 'lavaSmelter:missileImmunity', phase: 'training',
      ...grant('missileImmunity', 'lavaSmelterMissileImmunity', 'missileImmunity', 'Lava Smelter: Missile Imm.') }),
    // What the flag then *does* is not cited here: the Resistance and Defence bonuses are
    // `effectiveResistance:resistElements` and `effectiveDefense:resistElements`
    // (`combat_effects.js`), which own the `Combat.ResolutionHelpers.pas` and `MODDING.INI` spans
    // that prove them. This anchor cites the write alone (F244.3c review, finding 1).
    // PROVENANCE[lavaSmelter:resistElementsAlias]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS@span:23:d6475291cbd817aedb8be4d2 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:23:02ffaad30254a68cf55740f4
    statStep({ id: 'lavaSmelter:resistElementsAlias', phase: 'training',
      ...grant('resistElements', 'lavaSmelterResistElements', 'resistElem', 'Lava Smelter: Resist Elem.') }),
    // The Defence bonus is `effectiveDefense:elementalArmor`'s (`combat_effects.js`), which owns
    // the effect's spans; this anchor cites the write alone (F244.3c review, finding 1).
    // PROVENANCE[lavaSmelter:elementalProtection]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS@span:23:d6475291cbd817aedb8be4d2 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:23:02ffaad30254a68cf55740f4
    statStep({ id: 'lavaSmelter:elementalProtection', phase: 'training',
      ...grant('elementalArmor', 'lavaSmelterElementalArmor', 'elementalArmor', 'Lava Smelter: Elem. Armor') }),
    // PROVENANCE[lavaSmelter:flameBlade]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS@span:24:03c7f203c08a93035f9d5921 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.9/OverlandEndTurn.CAS@span:29:9803f0d614b7957485b50536
    statStep({ id: 'lavaSmelter:flameBlade', phase: 'training',
      ...grant('fieryBlade', 'lavaSmelterFieryBlade', 'flameBlade', 'Lava Smelter: Fiery Blade') }),
  ];
}

// Sancta Basilica (Warlord, High Men building): every High Men unit trained here gains +3
// Resistance (added in deriveUnitStats). Clergy (matched by the Clergy unit tag), Crusaders,
// and Paladins (matched by name) additionally receive Sanctify; Crusaders also gain Lucky and
// Paladins also gain Magic Immunity. Those three grants are folded in here so every downstream
// read sees them — Sanctify drives the Life-realm unit-type conversion, Lucky feeds the ability
// stat modifiers, and Magic Immunity feeds the combat immunity checks. The improved Exorcise
// grant (Clergy) and the True Light city enchantment (defending) are not modelled. Gated on the
// High Men race; heroes gain nothing.
//
// KNOWN DEFECT (T8, see BACKLOG.md Q30): the Sanctify grant above is wider than the source.
// `Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS!NOFROSTCLUB!+2..+31 ": new effect of Sancta Basilica :" "!NOBASILICA!"` — the block
// PROVENANCE[sanctaBasilica] in stats_sequence.js cites for the +3 Resistance — writes the
// per-type grants in four *mutually exclusive* STypeID branches, each ending in
// `GOTO "ENDOFUNIQUEBUILDING"`: 108 (High Men Monks) and 231 (High Men Inquisitors) get
// Sanctify plus improved Exorcise, 111 (Crusaders) gets Lucky *only*, and 113 (Paladins) gets
// Magic Immunity *only*. Neither Crusaders nor Paladins receives Sanctify from this building.
// The code and this comment both say they do. `DisAbil.CAS~": new effect of Sancta Basilica :"+1..+10 "IF (ISBUILT(CF,BBasilica)>0) THEN {" "}"` does group all
// three under one "Sainthood" display line, which is the likely origin of the conflation, but
// it is display only and grants no stat. Not corrected here: this round is comment-only and the
// fix needs a preset plus a full suite run.
function applySanctaBasilicaGrant(abilities, version, unitType, race, name) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.sanctaBasilica
      || race !== 'High Men' || unitType === 'hero') return abilities;
  const isCrusader = (name || '').endsWith('Crusaders');
  const isPaladin = (name || '').endsWith('Paladins');
  const isClergy = !!abilities.clergy;
  if (!isCrusader && !isPaladin && !isClergy) return abilities;
  const result = {
    ...abilities,
    sanctify: true,
    ...(isCrusader ? { lucky: true, luckyPhaseBase: true } : {}),
    ...(isPaladin ? { magicImmunity: true } : {}),
  };
  return result;
}

// An immunity refuses the curses it blocks — at the curse's own cast, not by a later strip. The
// immunity is enforced where the spell lands, so an immune unit simply never acquires the flag,
// and nothing later removes one it does carry (`RecalculateUnits` has six flag clears, none a
// curse and none gated on an immunity). Each curse is therefore a `debuffs:<curse>` write whose
// own `when` reads the immunity fields off the record at its own position, and an immune unit
// never receives the flag rather than receiving it and having it stripped (the user's ruling of
// 2026-09-02; F244.3b retired `immunities:immunityCurseGating`, which was the stand-in).
// The calculator has no cast order, so it assumes the immunity is the pre-existing one — innate,
// cast overland, or cast earlier in combat — which is the common case and the only one a single
// ability set can represent. `SPEC.md`, *Deliberate deviations*, states the assumption; the
// record's `magicImmunity` and `illusionImmunity` are seeded by the template phase, so they stand
// before any `debuffs` write asks.
// Magic Immunity's half is the cited mechanism: both engine families make the target's
// resistance unreachable for any spell carrying a realm, so the roll cannot fail. Modern sets
// Result := 100 against a `Random(10) + 1` roll; DOS adds 30 against a d10.
// F250.3 establishes a DOS class-14 local Sorcery / battle Illusion Immunity refusal;
// named Mind Storm binding and enclosing admission remain conditional. Vertigo remains open.
// The MoM 1.31 A32 Sorcery/Illusion test is AI selection; CP/CoM use that island differently.
// Modern Illusion metadata and partial targeting coverage do not settle this named predicate.
// F250.4.script-reconciliation.md records the searched coverage and exact remaining question.
// The PROVENANCE below remains the Magic Immunity resistance mechanism only.
// F250.1's versioned record census is in
// `Reference docs/Caster binary/F250.1.spell-classification.evidence.md`.
// Both modern INI legends document default Magic Immunity blocking, and all identified
// records omit NonMagic. That paragraph is under damage-spell parameters: omission alone
// does not establish each curse handler's admission, and modern metadata is not DOS evidence.
// The three Warp controls share one candidate record without an EnchantmentID. Nausea has
// no Nausea-named record; F250.4 identifies its Conjuring Pact backing spell below.
// Remaining runtime binding belongs to F250.2/F250.3 and the census owners; F250.4 retains
// the unresolved player Illusion-admission predicate.
// Hierophany carries the flag ([239]) and is excluded; its cast handler agrees — `COSpell.CAS`
// lines 400-413 roll Resistance with no Magic Immunity test — as does the Warlord 1.5.12.7 manual
// changelog, "Spell Hierophany now works properly against magic immunity".
// F250.4 identifies nausea's backing spell as Warlord Conjuring Pact [343], EncConjuringPact=94,
// NonMagic=True. UnitCalcPre reads its base combat flag and directly changes current stats on
// nonfantastic units. This synthetic nausea input's Magic Immunity gate remains unsupported.
// Do **not** reach for `ACCurse`/`ACGlobalEffect` to decide this. That block is AI weighting for
// strategic off-screen combat — "use these values to set the spells strength and type of effect"
// (`spells.ini` lines 244-256) — not a resolution mechanism, and it disagrees with the flag: Mind
// Storm carries no `ACCurse` yet is an ordinary blocked curse.
// The exclusions are the effects that make no per-unit resistance roll, so nothing ever consults
// the immunity. Black Prayer, Eternal Night's Darkness and Temporal Twist are **combat globals,
// not unit enchantments**: every engine gates them on a side-indexed global rather than a flag on the unit
// — `inferred_CombatGlobals[3 - ownCG][CGBlackPrayer] > 0` and `inferred_CombatGlobals[...]
// [CGDarkness] > 0` (`Units.RecalculateUnits.pas`), `combat_enchantments[CE_BLACK_PRAYER_*]` and
// `[CE_DARKNESS_*]` (`unitcalc.c`). No flag is ever rolled onto the unit, which is also why their
// spell records carry no `NonMagic`: the flag governs a roll these effects never make. Their
// writes are `PROVENANCE[blackPrayer]` and `PROVENANCE[darkness]`. Mislead/Liability are absent
// for the same reason at one remove — the spell's own roll gates only the targeted unit, and the
// Misfortune/Jinx debuff then spreads to every normal unit in the army with no per-unit check.
// Temporal Twist is absent for the combat-global reason Black Prayer and Darkness are, and it was
// on this list until 2026-09-03. Warlord's block gates on `HASCOMBATGLOBAL(W,CGTemporalTwist,2)`
// (`UnitCalc.CAS`, the `!NOTEMPORALTWIST!` block) — a side-wide test — and carries no per-unit
// flag and no immunity term of any kind, so there is no roll for Magic Immunity to refuse. The
// spell writes the global (`COSpell.CAS`), a combat can open with it already set
// (`EnterCombat.CAS`), and it expires on a one-in-three roll each turn (`CombatEndTurn.CAS`);
// none of those touches the unit. Its `ACCurse` absence in `spells.ini` is not the evidence — that
// block is AI weighting, as the paragraph above says.
const MAGIC_IMMUNITY_GATED_CURSES = [
  'weakness', 'blackSleep', 'shatter', 'vertigo',
  'warpAttack', 'warpDefense', 'warpResist', 'nausea', 'mindStorm',
];
const ILLUSION_IMMUNITY_GATED_CURSES = ['mindStorm', 'vertigo'];

// Every non-stat field the sequence record carries, in one list. The four lists above say what
// each key is *for* — read at a rank, written at a rank, or a value rather than a flag — and this
// is what the seed iterates.
const SEEDED_NON_STAT_KEYS = Object.freeze([...new Set([
  ...POSITIONED_GRANT_VALUE_WRITES, ...MAGIC_IMMUNITY_GATED_CURSES,
  ...POSITIONED_GRANT_FIELDS, ...POSITIONED_GRANT_WRITES,
])]);

// Whether an ability map's value for a key is a **statement** rather than the control's off
// position (F253.1). The card hands `deriveUnitStats` its whole control surface on every call and
// a version-gated control is reset rather than omitted (`applyVersionGating`, `card_state.js`), so
// the off value has to mean "nothing said" or the seed's halt fires on every card.
//
// **What "off" is belongs to the control, not to a token list.** `abilityValueIsActive`
// (`ability_gating.js`) is the one home for that rule and this asks it rather than restating it:
// an unticked checkbox is `false`, a select's off is its *first option*, an empty `num` is `0` —
// and a `numcheck`'s off is `null` alone, because `0` there is a ticked box stating a zero
// modifier, which the combat consumers read as present. A blanket `value !== 0` swallowed exactly
// that case (review, finding 1): `exorcise: 0` in a MoM build is a stated key the version cannot
// carry and must halt like `exorcise: -1`.
//
// A key with no control at all takes the fallback: anything but absence and `false` is a
// statement, since there is no off position to respect and a caller stating such a key is already
// out of band.
let abilityDefsByCalcKey = null;
function abilityDefsForCalcKey(key) {
  if (!abilityDefsByCalcKey) {
    abilityDefsByCalcKey = new Map();
    for (const def of abilityUiDefs()) {
      const calcKey = def.calcKey || def.key;
      if (!abilityDefsByCalcKey.has(calcKey)) abilityDefsByCalcKey.set(calcKey, []);
      abilityDefsByCalcKey.get(calcKey).push(def);
    }
  }
  return abilityDefsByCalcKey.get(key) || [];
}
function abilityValueStatesGrant(key, value) {
  // Absence first, and not through the def: a select's off test is `value !== options[0][0]`,
  // which reads an *unstated* key as active. The maps here are partial — a card states only the
  // controls it has — so absence has to be answered before the control is asked.
  if (value == null) return false;
  const defs = abilityDefsForCalcKey(key);
  if (defs.length) return defs.some(def => abilityValueIsActive(def, value));
  return value !== false;
}

// The record seed, by origin (F244.3b; F252.3; F252.4). F244's rule is that the record starts as the
// roster template and nothing else, and every modification is a positioned write on top of it, so
// a key is seeded only where `abilityOriginIsTemplate` (`stats_origins.js`) gives it a `template`
// row in this version. Every other origin the key has takes a step at the phase
// `abilityOriginPhases` names — `debuffs:*:cast` for the nine curses, the `buffs:*:cast` writes
// for the beneficial casts the roster template cannot state (`permanentCastFlagSteps` below), and
// the positioned grant steps already in the chain for the rest.
//
// **The seed reads the innate half (F252.3).** `innate` is what the unit was *built* with — the
// `ABILITY_DEFS` controls plus the version's own special-value block — and it is the only source a
// `template` write can have. It used to be the merged map, which meant a card marking an
// enchantment that names a template-capable calc key had its *cast* seeded at `template` rank: the
// engine makes that write at the cast, and a step reading the field between the two ranks saw the
// cast's bit before it existed. `invisibility` was the one key where that actually happened, and
// `buffs:invisibility:cast` below is now its write.
//
// **There is no exception left for the two marked immunities (F252.4).** `magicImmunity` and
// `missileImmunity` were seeded `false` unconditionally while `immunities:*:marked` read the
// *merged* map: the seed had to stand aside or the phase would have restated a bit the template
// row had already hoisted. Both now seed from the innate half like every other `template` row, and
// the two `immunities` steps read the marked half alone, so the record carries the innate bit at
// `template` rank and the cast's bit at `immunities` rank — the OR at the grant position, and
// idempotent because the second write is a set onto the same field (F252.2, shape 1).
//
// The guard is the fail-loud half of the same rule: a template-seeded key the marked half also
// contributes to must have a positioned marked write to land in, or the mark would be dropped in
// silence. `abilityMarkedWriteIsPositioned` (`stats_origins.js`) is what asks, so the answer comes
// off the origin table rather than a hand list here.
//
// **The pre-sequence transforms are the one thing the seed still takes from outside the innate
// half.** `effective` is the ability set after them and `supplied` the set before, so their
// difference is exactly what a transform granted. For a key with no `template` row that difference
// throws — the F244.3g rule, unchanged, and `TRANSFORM_SEED_CARRY` is gone. For a key *with* one,
// the transform's value is carried, which is the status quo neither F252.3 nor F252.4 touches:
// today that is `lucky` (`applySanctaBasilicaGrant`, `applyPillarOfFaithGrant`) and, since F252.4
// stopped forcing its seed to `false`, `magicImmunity` (`applySanctaBasilicaGrant`'s Paladin
// grant). Both origin rows file the grant as `training` with a `transform:` producer, so under
// F244's rule each owes a positioned `training` step it does not have. That is an F244-family
// debt, not an innate/marked one — see the F252.3 and F252.4 reports.
function seedNonStatRecordFields(version, innate, effective, supplied) {
  const seed = {};
  for (const key of SEEDED_NON_STAT_KEYS) {
    const isValueField = POSITIONED_GRANT_VALUE_WRITES.includes(key);
    // Did a pre-sequence transform write this key? The test is a *write*, not truthiness: a
    // transform writing an unseeded value key to `0` read as false under the earlier spelling and
    // was seeded away in silence (F244.3g review, finding 7). The `!= null` term is what keeps a
    // *deletion* legal — `deriveOutlanderReformRecord` strips its derived output names on purpose.
    const transformWrote = effective[key] !== supplied[key] && effective[key] != null;
    if (abilityOriginIsTemplate(key, version)) {
      // Does the marked half change what the seed would carry? For a flag that is a change in
      // truthiness, so an enchantment control the card merely offers and leaves unticked is not a
      // contribution; for a value field any stated difference is.
      const markedContributes = isValueField
        ? (supplied[key] !== innate[key] && supplied[key] != null)
        : (!!supplied[key] !== !!innate[key]);
      if (markedContributes && !abilityMarkedWriteIsPositioned(key, version)) {
        throw new Error(`seedNonStatRecordFields: '${key}' is seeded from the innate half in `
          + `${version}, and the marked half also states it, but no positioned `
          + 'immunities/buffs/debuffs step writes it there. Give the cast its own step '
          + '(Calculator/stats_identity.js) and file it in ABILITY_KEY_ORIGINS — the seed may not '
          + 'carry a cast at template rank (F252.3).');
      }
      seed[key] = isValueField
        ? (transformWrote ? effective[key] : innate[key])
        : !!(transformWrote ? effective[key] : innate[key]);
      continue;
    }
    if (transformWrote) {
      throw new Error(`seedNonStatRecordFields: '${key}' has no template origin in ${version}, `
        + 'yet a pre-sequence transform wrote it. Give the write a positioned step '
        + '(Calculator/stats_sequence.js) — no seed carry is offered any more (F244.3g).');
    }
    // The caller's own statement of a key this version cannot carry anywhere (F253.1). The seed
    // has no template row to put it in and no transform wrote it, so the two arms below erase it;
    // where the key also has **no origin row at all in this version** there is no positioned step
    // waiting for it either, and the erasure is silent and total. That is the opposite of the
    // fail-loud rule (`CLAUDE.md`, *Architecture*), so it halts naming the key, the version and the
    // origins the table does offer.
    //
    // **The rule is "no origin row", not "no template row"** — the wider one would fire on every
    // cursed unit, since 42–43 seeded keys per version lack a template row and the nine curses are
    // among them, each landing in its own `debuffs:<curse>:cast` step which reads the marked half.
    // Those keys are erased from the *seed* on purpose and written at their own rank.
    //
    // The map read is `effective`, the map as the pre-sequence transforms leave it, not `supplied`:
    // a transform **deletion** is a deliberate erasure and must stay legal
    // (`deriveOutlanderReformRecord` strips its derived output names, `blackpowder` among them),
    // and a transform *write* has already halted above.
    //
    // **A control's *off* value states nothing, and that is the opposite reading from the
    // transform guard's** — deliberately, because the baseline differs. There the comparison is
    // against the map before the transform ran, so writing `0` where nothing stood is a write
    // (F244.3g). Here there is no before: the caller hands over the whole control surface every
    // time, version-gated controls reset to their own off value rather than being omitted
    // (`applyVersionGating`, `card_state.js`), so a control at rest says nothing about its key.
    // Reading `!= null` here halts on every MoM card, which all carry `discipline: 'none'` for a
    // select the version hides. Which value is "at rest" is the control's own answer, above.
    if (abilityValueStatesGrant(key, effective[key])) {
      const offered = abilityOriginsInVersion(key, version);
      if (offered.length === 0) {
        throw new Error(`seedNonStatRecordFields: '${key}' is stated as `
          + `${JSON.stringify(effective[key])} in the input for ${version}, `
          + 'but the origin table gives the key no row in that version at all — no template seed '
          + 'and no positioned step — so the record could only drop it in silence. Expected: a key '
          + 'with at least one origin row for this version in Calculator/stats_origins.js. The '
          + `table offers '${key}' only in `
          + `${abilityOriginRows(key).flatMap(row => row.versions).filter(
            (item, index, all) => all.indexOf(item) === index).join(', ') || '(no version)'}. `
          + 'Either the control is being set outside its version scope, or the key needs its row '
          + 'and its positioned write (F253.1).');
      }
      // The other half of the same erasure (F253.2). The key *does* have a row here, so F253.1's
      // test passes — but every write the row names is admitted by a **different input key**, so
      // the caller's own statement gates nothing and the seed drops it just as silently. Warlord
      // `fieryBlade` is the case the item was filed on: `training:lavaSmelter:flameBlade` writes
      // it, and its `when` reads `lavaSmelterFieryBlade`, the mineral pair's control.
      //
      // `abilityKeyAdmitsOwnWrite` (`stats_origins.js`) is what asks, off the table's own
      // `admits` field, so the halt and the table cannot drift. It answers *yes* for a `template`
      // row (the seed carries the statement), for a `nonRecord` or `derived` row (nothing seeds
      // the key, but the input map is read directly and the statement is heard), and for any
      // write row whose gate reads this key — which is the ordinary `debuffs:<curse>:cast` and
      // `buffs:<spell>:cast` shape, and why this fires on no cursed unit.
      if (!abilityKeyAdmitsOwnWrite(key, version)) {
        throw new Error(`seedNonStatRecordFields: '${key}' is stated as `
          + `${JSON.stringify(effective[key])} in the input for ${version}, and the origin table `
          + 'does give the key rows there, but every one of them is admitted by a different input '
          + 'key, so stating this key reaches no write and the record could only drop it in '
          + 'silence. Expected: a key whose statement admits at least one of its own writes. What '
          + `the table has for '${key}' in ${version}: `
          + `${abilityAdmissionSummary(key, version).join('; ')}. Those are the inputs each write `
          + 'is reached through, not a guarantee that stating one lands it. Either state them '
          + 'instead of this key, or give the key a control and a write of its own and record what '
          + 'reaches it on the row (`admits`, Calculator/stats_origins.js) (F253.2).');
      }
    }
    seed[key] = isValueField ? undefined : false;
  }
  return seed;
}
// The display name each cast write carries in the chain; the ids are `<key>:cast`, so the label
// is what a tooltip reader sees beside the flag.
const CURSE_CAST_LABELS = Object.freeze({
  weakness: 'Weakness', blackSleep: 'Black Sleep', shatter: 'Shatter', vertigo: 'Vertigo',
  warpAttack: 'Warp Creature', warpDefense: 'Warp Creature', warpResist: 'Warp Creature',
  nausea: 'Conjuring Pact nausea', mindStorm: 'Mind Storm',
});

// The `immunities` phase: the immunities the card marks, written to the permanent record before
// anything tests them (`CLAUDE.md`, the phase table; the user's ruling of 2026-09-02). Two keys
// take a write here — the two whose calc key more than one control can set, so the record is the
// only place their combined value can stand at a rank. Every other marked immunity has a single
// control and rides the template seed, where its own origin row puts it.
//
// **`marked` is the marked half alone (F252.4)** — the `ENCHANTMENT_DEFS` controls, which for
// these two keys are Magic Immunity, Guardian Wind and Hillfort. It used to be the merged map, and
// the merged map cannot support what these steps claim: a unit *built* with Missile Immunity was
// firing a write that says the card cast one. Both keys are dual-source, so the innate control now
// seeds the record at `template` rank (`seedNonStatRecordFields` above, whose `immunities`
// exception went with this change) and the step below writes the cast's bit at `immunities` rank.
// The two never contend — the write is a set onto the same field, so the OR at the grant position
// is idempotent (F252.2, shape 1) and an innate-only unit simply skips the step.
//
// Both are UNVERIFIED, and the gap is narrower than "nothing writes these onto the record". A
// *building* demonstrably does, in Warlord, at creation time: `CreateUnit.CAS~"SETSTAT(U,AMagicImmunity,1,1)"`
// for Sancta Basilica's Paladins and `CreateUnit.CAS~"SETSTAT(U,AMissileImmunity,ABase,1)"` for
// the Lava Smelter mithril/crysx pair — and both of those
// are already positioned elsewhere, at `training` rank, where their own evidence puts them. What no
// supported source reconstructs is the **marked controls'** writers — the Magic Immunity and
// Guardian Wind casts, and Hillfort — putting the flag on the *permanent* record, so the
// `immunities` rank these two steps take is the calculator's own ordering ruling (`CLAUDE.md`, the
// phase table) rather than a read. The pointer is the compiled read that proves the record carries
// the flag at all.
function markedImmunitySteps(marked) {
  const immunity = (key, label) => ({ sourceId: key, sourceLabel: label, writes: [key],
    when: () => !!marked[key],
    apply: u => { u[key] = true; } });
  return [
    // PROVENANCE[magicImmunity:marked]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=no supported source reconstructs the Magic Immunity cast writing its flag onto the permanent record, so the immunities rank this write takes is the calculator's own ordering ruling — the Warlord building grant that does write it (CreateUnit.CAS~"SETSTAT(U,AMagicImmunity,1,1)") is positioned separately at training rank and is not evidence for this one; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
    statStep({ id: 'magicImmunity:marked', phase: 'immunities', ...immunity('magicImmunity', 'Magic Immunity') }),
    // PROVENANCE[missileImmunity:marked]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=no supported source reconstructs the Guardian Wind cast or Hillfort writing Missile Immunity onto the permanent record, so the immunities rank they share here is the calculator's own ordering ruling — the Warlord Lava Smelter grant that does write it (CreateUnit.CAS~"SETSTAT(U,AMissileImmunity,ABase,1)") is positioned separately at training rank and is not evidence for this one; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'missileImmunity:marked', phase: 'immunities', ...immunity('missileImmunity', 'Missile Immunity') }),
  ];
}

// Whether the immunities standing on the record at this step's own position refuse the curse.
// This predicate is the single audited home of the refusal mechanism: both engine families make
// the target's resistance unreachable for any spell carrying a realm, so the roll cannot fail.
// The nine `debuffs:*:cast` steps below apply it rather than restating its citation, which is why
// each of them is UNVERIFIED for its own write and none of them repeats these spans (F244.3b
// review, findings 4 and 5). Illusion Immunity's half is assumed rather than cited, for the
// reasons the paragraph above `MAGIC_IMMUNITY_GATED_CURSES` gives; the spans below are the Magic
// Immunity mechanism alone.
// `record` is the sequence record — `magicImmunity` and `illusionImmunity` are seeded by the
// template phase and `trueSight` is written by `buffs:trueSight`, all of which rank ahead of every
// `debuffs` step, so the answer is a positioned read rather than a projection of the finished set.
// `eyeOfHeaven` stays a captured nonRecord input in this implementation. Warlord UnitCalcPre
// grants current True Sight at the early recalculation hook, under the owning wizard's combat
// global test (F250.4.script-reconciliation.md). That grant does not establish this pre-cast
// shortcut or the unresolved player-cast Illusion refusal; no other version receives it here.
// STAT-FORMULA[curseImmunityRefusal]
// PROVENANCE[curseImmunityRefusal]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:52d7a21af8d678318152f8fc | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:3:402d57bfe8325957749d4792 | Reference docs/DOS reconstructed/combat.c@span:4:1a301c9fa03a6936a7e8bf35 | Reference docs/DOS reconstructed/combat.c@span:10:e890804f95697a32ae069372
function curseRefusedByImmunity(record, key, version, eyeOfHeaven) {
  const eye = !!(version && version.startsWith('com2_warlord') && eyeOfHeaven);
  const illusionImmune = !!(record.illusionImmunity || record.trueSight || eye);
  if (record.magicImmunity && MAGIC_IMMUNITY_GATED_CURSES.includes(key)) return true;
  return illusionImmune && ILLUSION_IMMUNITY_GATED_CURSES.includes(key);
}

// One `debuffs:<curse>:cast` write per curse flag: the cast puts the flag on the target's
// permanent record, and the target's immunity is what refuses it.
// These permanent-record steps remain UNVERIFIED. A32 already reconstructs a DOS battle
// Combat_Effects store. Modern casts write BaseUnits combat flags, copied and aggregated by
// recalculation; that does not establish equivalence to these undifferentiated flag steps.
// F250.3.reconciliation.md separates known DOS consumers/stores from missing named writers.
// The refusal mechanism has its own VERIFIED anchor; named admission is a separate claim.
//
// **`marked` is the marked half alone (F252.6).** It used to be the merged map after the
// pre-sequence transforms, which is the shape F244.3b could only build: a step claiming "the cast
// put this flag on the record" was reading a map that could not say whether a cast or the roster
// template had stated the key. None of the nine has an `ABILITY_DEFS` control today, so
// `splitAbilityCalcValuesBySource` puts each only in the marked half and the merged map carried
// the same bit — the re-source moved no number. That is a coincidence of which controls exist,
// not a property of the keys: adding an ability control for a curse flag would have made the
// merged read silently claim a cast. What catches that is the innate-only arm of
// `runMarkedDebuffPhaseChecks` (`tools/unit_checks/ability_origins.js`), and only it:
// `seedNonStatRecordFields`'s `abilityMarkedWriteIsPositioned` halt (F252.3) reads the origin
// table's producers, so it can see a missing positioned write but not a positioned write reading
// the wrong map (F252.6 review, finding 3). The two guard different things and are not two
// detectors of this one.
//
// The nine are the `debuffs` phase's record-field half, and the phase has four other keys none of
// which is one. `rust` takes the phase's tenth step, `debuffs:rust:material`, whose own cast term
// F252.6 re-sourced with these (`rustActiveAt`, `stats.js`) but which writes `weaponMaterial`
// rather than a flag of its own; `hierophany`, `mislead` and `soulFlay` carry `cast:` producers
// and no record field at all, so the merged ability map is their only carrier. All four are still
// unfinished, not exempt — see the note on `runMarkedDebuffPhaseChecks`
// (`tools/unit_checks/ability_origins.js`).
function curseCastSteps(version, marked, eyeOfHeaven) {
  const isWarlord = !!(version && version.startsWith('com2_warlord'));
  // The body every one of them has: the mark is the value, and the immunities on the record at
  // this position are the gate. Written once so a step cannot fire without the gate that admits
  // it, the way `immunityStrippedCurses` used to serve the strip's gate and write together.
  const cast = key => ({ sourceId: key, sourceLabel: CURSE_CAST_LABELS[key], writes: [key],
    when: u => !!marked[key] && !curseRefusedByImmunity(u, key, version, eyeOfHeaven),
    apply: u => { u[key] = true; } });
  return [
    // PROVENANCE[weakness:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 establishes modern BaseUnits.CombatEnchantmentFlags stores and existing recalculation copies/aggregates that layer. Runtime binding, named admission and equivalence to this undifferentiated flag step remain open. DOS A32 owns the generic class13/16 battle store, and named binding remains open. See Reference docs/DOS reconstructed/F250.3.reconciliation.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'weakness:cast', phase: 'debuffs', ...cast('weakness') }),
    // PROVENANCE[blackSleep:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 establishes modern BaseUnits.CombatEnchantmentFlags stores and existing recalculation copies/aggregates that layer. Runtime binding, named admission and equivalence to this undifferentiated flag step remain open. DOS A32 owns the generic class13/16 battle store, and named binding remains open. See Reference docs/DOS reconstructed/F250.3.reconciliation.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'blackSleep:cast', phase: 'debuffs', ...cast('blackSleep') }),
    // PROVENANCE[shatter:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 establishes modern BaseUnits.CombatEnchantmentFlags stores and existing recalculation copies/aggregates that layer. Runtime binding, named admission and equivalence to this undifferentiated flag step remain open. DOS A32 already proves Shatter writes battle Combat_Effects, while the permanent-record implementation remains unverified. See Reference docs/DOS reconstructed/F250.3.reconciliation.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'shatter:cast', phase: 'debuffs', ...cast('shatter') }),
    // PROVENANCE[vertigo:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 establishes modern BaseUnits.CombatEnchantmentFlags stores and existing recalculation copies/aggregates that layer. Runtime binding, named admission and equivalence to this undifferentiated flag step remain open. DOS A32 owns the generic class13/16 battle store, and named binding remains open. See Reference docs/DOS reconstructed/F250.3.reconciliation.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'vertigo:cast', phase: 'debuffs', ...cast('vertigo') }),
    // PROVENANCE[warpAttack:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 maps WarpCreatureEffect to BaseUnits.CombatEnchantmentFlags indices 6/7/8. Caller admission, clearing and equivalence to this undifferentiated flag step remain open. DOS consumer reconstruction exists, but the direct named writer remains unlocated in reviewed canonical sources. See Reference docs/DOS reconstructed/F250.3.reconciliation.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'warpAttack:cast', phase: 'debuffs', ...cast('warpAttack') }),
    // PROVENANCE[warpDefense:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 maps WarpCreatureEffect to BaseUnits.CombatEnchantmentFlags indices 6/7/8. Caller admission, clearing and equivalence to this undifferentiated flag step remain open. DOS consumer reconstruction exists, but the direct named writer remains unlocated in reviewed canonical sources. See Reference docs/DOS reconstructed/F250.3.reconciliation.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'warpDefense:cast', phase: 'debuffs', ...cast('warpDefense') }),
    // PROVENANCE[warpResist:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 maps WarpCreatureEffect to BaseUnits.CombatEnchantmentFlags indices 6/7/8. Caller admission, clearing and equivalence to this undifferentiated flag step remain open. DOS consumer reconstruction exists, but the direct named writer remains unlocated in reviewed canonical sources. See Reference docs/DOS reconstructed/F250.3.reconciliation.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'warpResist:cast', phase: 'debuffs', ...cast('warpResist') }),
    // PROVENANCE[mindStorm:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 establishes modern BaseUnits.CombatEnchantmentFlags stores and existing recalculation copies/aggregates that layer. Runtime binding, named admission and equivalence to this undifferentiated flag step remain open. DOS F250.3 mind-truesight subunit reconstructs the battle writer, with named runtime binding and enclosing timing still conditional. See Reference docs/DOS reconstructed/F250.3.mind-truesight.evidence.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'mindStorm:cast', phase: 'debuffs', ...cast('mindStorm') }),
    // The Warlord Conjuring Pact script writes current hit/block stats, not a nausea flag.
    // PROVENANCE[nausea:cast]: UNVERIFIED versions=com2_warlord_1.5.12.9; gap=F250.4 identifies Conjuring Pact [343], EncConjuringPact94 and NonMagic=True. UnitCalcPre reads its base combat flag, tests current Fantastic and writes current hit/block stats for nonfantastic units. This synthetic permanent nausea flag and its Magic Immunity refusal are not those source operations. Complete Conjuring Pact admission remains separate from the known script effect.; pointer=Reference docs/Caster binary/F250.4.script-reconciliation.md
    ...(isWarlord ? [statStep({ id: 'nausea:cast', phase: 'debuffs', ...cast('nausea') })] : []),
  ];
}

// The beneficial cast writes the record carries that no roster template can state: True Sight
// (all five engines), Rebuild (Warlord), and — since F244.3d — Resist Magic (all five) and
// Discipline (CoM2 and Warlord). Each is a `buffs`-origin key with no `template` row
// (`stats_origins.js`), so the seed cannot carry it and the cast's own permanent write is a
// step, at the rank every other `buffs` write takes.
//
// All are **UNVERIFIED**, declared rather than exempted (F244.3b review, finding 4). The write is
// the card's mark and has no eligibility gate to cite, and no supported source in this tree
// reconstructs either cast putting its flag on the permanent record. What each pointer names is
// the strongest thing that *is* reconstructed: for True Sight the compiled read of
// `U.EnchantmentFlags[EncTrueSight]`, which proves the permanent record carries the flag; for
// Rebuild the cast block `PROVENANCE[rebuildEffectDerivation]` (`combat_effects.js`) already cites
// for the package it confers. The audited anchors for the *effects* stay on the steps that read
// the flag — `c:trueSight` / `d:trueSight`, and `buffs:rebuild` / `b:rebuild`.
// F244.3d added two more, for the same reason and with the same shape. Resist Magic and Discipline
// each became a record field when the Outlander reform's training grant of it was positioned
// (`training:magitekScience` and `training:militaryDrilling`, `combat_abilities.js`), and neither
// has a `template` row either — both are cast enchantments — so the card's own mark needs a
// `buffs` write of its own or the seed would drop it. Discipline is the one that carries a value
// rather than a flag: the engine has a single `EncDiscipline`, and overland-versus-combat is the
// calculator's distinction, so the cast writes whichever the card states and thereby overrides the
// `overland` the earlier training grant wrote.
// Bless joined them in F244.3g, when the owned Marionette branch's Life-ascension
// `SETENCHANTMENTFLAG(U,EncBless,1,1)` became `b:marionette:ascension:bless` and made `bless` a
// record field. Its control is a cast enchantment with no `template` row, so the same rule applies.
// **`marked` is the marked half alone, for all eight (F252.5).** A `buffs:<key>:cast` step claims
// *the card's cast* put the flag on the permanent record, and only the `ENCHANTMENT_DEFS` half
// states a cast. The parameter used to be the merged card set, which could not support that claim
// for a dual-source key: `invisibility` was re-sourced in F252.3 and the other seven follow here.
// Seven of the eight — True Sight, Resist Magic, Discipline, Rebuild, Haste, Spell Lock, Bless —
// have no `template` row, so no ability control names them and the merged map *was* the marked
// half for each; re-sourcing them moves no number and makes the claim true by construction rather
// than by coincidence of which controls exist today. Adding an ability control for any of the
// seven would have made the old spelling wrong in silence.
//
// It is also no longer the pre-transform map for a *transform* reason. That distinction was
// F244.3d's: the effective map carried the Marionette book package's grants of `resistMagic` and
// `rebuild`, which are not casts. F244.3g positioned all thirty-nine of those grants as steps, so
// no pre-sequence transform writes any ability key these steps name (`ABILITY_ORIGIN_TRANSFORMS`,
// `stats_origins.js`), and the marked half is pre-transform in any case — it is the card's own
// `ENCHANTMENT_DEFS` reading, which no transform touches.
// **The Discipline cast's target gate** (F254.2), from
// `Reference docs/Caster binary/F254.1 Discipline eligibility.md`.
//
// The exclusion both tooltips used to claim is a spell-*targeting* rule and not an effect rule.
// `Reference docs/Caster binary/Units.RecalculateUnits.pas` applies Discipline's whole stat package
// with no `ishero`, `Fantastic`, `race` or `unittype` term — one compiled routine shared by both
// modern builds — so `c:discipline` is right to be ungated and stays so. Every refusal lives in
// `@Spelltargeting@ValidUnitSpellTarget` (`$0053DB78`, reconstructed for F264.1 in
// `Reference docs/Caster binary/F264.1.evidence.md`) at cast time, which is this step.
//
// Two arms of that routine bear on Discipline, selected by its `spells.ini` row:
//   * `SpellTypeGroup=15` (`SGUnitBuffNormalUnit`) takes the group-15 arm at `$0053DC9A`, which
//     refuses a target whose **permanent** `Fantastic` is set (`SPTMustBeNormal`). Both builds:
//     base CoM2's `[221] Discipline` and Warlord's `[221] Tactical Drill` / `[271] Discipline` all
//     carry group 15.
//   * `NonHero=True` takes the table-driven arm at `$0053DF46`, which refuses a hero on the
//     **permanent** `ishero` (`SPTNoHeroes`). **Base CoM2 only** — neither Warlord Discipline row
//     carries `NonHero`, and Warlord's Discipline demonstrably reaches heroes by other routes
//     (Power of Life, Mystic Surge), so a hero term there would be a defect and not a refinement.
//
// Both reads are positional, not hoisted. `ctx.base` does not exist at this rank — `a:baseCopy`
// (`stats_sequence.js`) publishes it four phases later — and is not what the engine reads anyway:
// `buffs` *is* the permanent-record phase, so the running `u.fantastic` here **is**
// `BaseUnits[u].Fantastic` as of this cast. The precedent is `naturalSelectionEligibleAt`
// (`stats.js`), not F263's `ctx.base` gates. `buffs:destiny` sets the flag and ranks *after* this
// step in both modern manifests (`stats_manifests.js`); `buffs:spiritLink:fantastic` clears it and
// ranks after it in the Warlord manifest, the only one that carries it (`SCOPE_WARLORD`,
// `steps.js`). Under the chain's declared cast order a Discipline cast that precedes
// Apotheosis therefore lands, which is the ruling and not an accident. `u.ishero` is written by no
// step, so its position is immaterial.
//
// `training:militaryDrilling` (`combat_abilities.js`) is deliberately untouched by this: none of
// Warlord's five non-cast routes to the flag tests hero, and its Fantastic term is F245's declared
// hybrid rather than a match for either entrance.
function disciplineCastTargetAdmitted(u, version) {
  const isWarlord = !!(version && version.startsWith('com2_warlord'));
  if (u.fantastic) return false;
  return isWarlord ? true : !u.ishero;
}

function permanentCastFlagSteps(version, marked) {
  const isWarlord = !!(version && version.startsWith('com2_warlord'));
  const isCoM2 = !!(version && version.startsWith('com2'));
  const isCoM1 = version === 'com_6.08';
  const cast = marked || {};
  const flag = (key, label) => ({ sourceId: key, sourceLabel: label, writes: [key],
    when: () => !!cast[key],
    apply: u => { u[key] = true; } });
  const disciplineValue = () => (cast.discipline === 'combat' ? 'combat' : 'overland');
  return [
    // PROVENANCE[trueSight:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=F250.2 establishes the BaseUnits combat-layer store consistent with modern True Sight index 41. Normal overland producer, runtime binding, full admission and flag-layer equivalence remain open. Any further post-store reconstruction needs a specific unanswered claim. DOS F250.3 mind-truesight subunit reconstructs the battle writer, with named runtime binding and enclosing timing still conditional. See Reference docs/DOS reconstructed/F250.3.mind-truesight.evidence.md.; pointer=Reference docs/Caster binary/F250.2.combat.evidence.md
    statStep({ id: 'trueSight:cast', phase: 'buffs', ...flag('trueSight', 'True Sight') }),
    // PROVENANCE[resistMagic:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=Warlord does reconstruct a Resist Magic cast writing the permanent flag, at `OLSpell.CAS!NOPERMENCHANT!-59 "SETENCHANTMENTFLAG(TU,EncResistMagic,1,1)"`, and `Reference docs/Caster binary/Units.RecalculateUnits.pas` reconstructs the modern aggregation the flag is then read through. Neither covers this step's claim. The script write stands behind the Tattoo Magic research gate at `OLSpell.CAS!NOPERMENCHANT!-74 "IF (SPELLSTATE(W,STattooMagic)<>2) THEN { GOTO"` while the step is unconditional, the four other engines have no reconstructed writer at all, and no source makes the card's mark evidence that the cast landed - which is the calculator's own assumption, stated in SPEC.md under Deliberate deviations; pointer=Reference docs/Script source/Warlord 1.5.12.9/OLSpell.CAS
    statStep({ id: 'resistMagic:cast', phase: 'buffs', ...flag('resistMagic', 'Resist Magic') }),
    // PROVENANCE[discipline:cast]: UNVERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.9; gap=Warlord does reconstruct a Tactical Drill cast writing the permanent flag, at `OLSpell.CAS!NOPERMENCHANT!-5 "SETENCHANTMENTFLAG(TU,EncDiscipline,1,1)"`, and `Reference docs/Caster binary/Units.RecalculateUnits.pas` reconstructs the modern aggregation the value is read through. Neither covers this step's claim. The script write stands behind the Tattoo Magic research gate at `OLSpell.CAS!NOPERMENCHANT!-74 "IF (SPELLSTATE(W,STattooMagic)<>2) THEN { GOTO"` while the step is unconditional, base CoM2 has no reconstructed writer of its own, and overland-versus-combat is a calculator distinction the single EncDiscipline flag does not carry, so the card states it. What is *not* left unverified is the step's target gate, `disciplineCastTargetAdmitted` above: the permanent-Fantastic refusal and base CoM2's hero refusal are read off the spell rows' SpellTypeGroup=15 and NonHero=True by `@Spelltargeting@ValidUnitSpellTarget`, stated in `Reference docs/Caster binary/F254.1 Discipline eligibility.md`; pointer=Reference docs/Script source/Warlord 1.5.12.9/OLSpell.CAS
    ...(isCoM2 ? [statStep({ id: 'discipline:cast', phase: 'buffs',
      sourceId: 'discipline', sourceLabel: 'Discipline', writes: ['discipline'],
      when: u => (cast.discipline === 'overland' || cast.discipline === 'combat')
        && disciplineCastTargetAdmitted(u, version),
      apply: u => { u.discipline = disciplineValue(); } })] : []),
    // PROVENANCE[rebuild:cast]: UNVERIFIED versions=com2_warlord_1.5.12.9; gap=F250.4 confirms OLSpell clears target base overland EncRebuild then sets base generic EncRebuild for SRebuild before the nonhero package. The writer and selectors are source-present. This single flag step does not represent the overland clear or establish the enclosing target and cast/recalculation boundary.; pointer=Reference docs/Caster binary/F250.4.script-reconciliation.md
    ...(isWarlord ? [statStep({ id: 'rebuild:cast', phase: 'buffs', ...flag('rebuild', 'Rebuild') })] : []),
    // Transmute Equipment joined them in F256.2. The block is two writes, not one, and they are
    // two steps for that reason: the permanent flag is written for every admitted target, and a
    // second arm behind `IF ((ISHERO(TU))=0)` re-equips a non-hero with the three material flags.
    // The flag is what the hero augmentation `b:transmuteEquipment:heroAugment` reads at its own
    // rank 298 lines later in `UnitCalcPre.CAS`, so a hero takes the stat package and a non-hero
    // takes the materials — the two arms are disjoint by construction, as the script has them.
    //
    // **The target gate is the spell row's, read exactly as F254 read Discipline's.**
    // `spells.ini` `[264] Transmute Equipment` carries `SpellTypeGroup=15`
    // (`SGUnitBuffNormalUnit`), so `@Spelltargeting@ValidUnitSpellTarget`'s group-15 arm refuses a
    // target whose **permanent** `Fantastic` is set, and it carries no `NonHero`, so a hero is
    // admitted — which is the whole point of the augmentation block. `u.fantastic` here is the
    // permanent record at this rank for the reason `disciplineCastTargetAdmitted` above states:
    // `buffs` *is* the permanent-record phase, and `ctx.base` does not exist yet.
    //
    // The cast's other write, `SETOLENCHANTMENTFLAG(TU,EncTransmuteEquipment,1,0)`, clears the
    // **overland** flag the recast/dispel guard at
    // `UnitCalcPre.CAS!NOSPIRITLINK!+3 "IF (GetEnchantmentFlag(U,EncTransmuteEquipment,1)=0) THEN { GOTO"`
    // toggles. The calculator carries no overland flag, so that half is modelled by nothing and
    // the tooltip says so rather than the record pretending to hold it.
    // PROVENANCE[transmuteEquipment:cast]: UNVERIFIED versions=com2_warlord_1.5.12.9; gap=the write itself is reconstructed: `OLSpell.CAS!NOTTRANSMUTEEQUIPMENT!-10..-9 "SETOLENCHANTMENTFLAG(TU,EncTransmuteEquipment,1,0)" "SETENCHANTMENTFLAG(TU,EncTransmuteEquipment,1,1)"` is the Transmute Equipment cast writing the permanent flag, unconditionally and in this step's one version. What is left unverified is the same thing every buffs cast step leaves unverified - that the card's mark is evidence the cast landed - plus the target gate, which is read off the `spells.ini` [264] row's `SpellTypeGroup=15` through `@Spelltargeting@ValidUnitSpellTarget` rather than off any line of the script, and F254.1's evidence file is where that routine is reconstructed and F250 owns the promotion decision; pointer=Reference docs/Script source/Warlord 1.5.12.9/OLSpell.CAS
    ...(isWarlord ? [statStep({ id: 'transmuteEquipment:cast', phase: 'buffs',
      sourceId: 'transmuteEquipment', sourceLabel: 'Transmute Equipment',
      writes: ['transmuteEquipment'],
      when: u => !!cast.transmuteEquipment && !u.fantastic,
      apply: u => { u.transmuteEquipment = true; } })] : []),
    // The non-hero arm. Three material flags in one block —
    // `SETENCHANTMENTFLAG(TU,EncMagic,1,1)`, `EncAdamant`, `EncOrihalcon` — and the calculator's
    // record carries the weapon half as one quality field rather than three flags, so the pair of
    // writes here is what those three flags come to. `Units.RecalculateUnits.pas` reads the
    // weapon quality as separate tests in which `EncAdamant` overrides `EncMithril` and `EncMagic`
    // alone keeps 0 ($00598ED9..$00598F43), so all three flags standing together *is*
    // `weaponMaterial = 'adamantium'`; `EncOrihalcon` is `armorMaterial` outright
    // (`training:armorQuality`, `stats_sequence.js`). Both are assignments rather than the floor
    // `training:artificer` makes of its lone `EncMagic`, because adamantium and orihalcon are the
    // top of their ladders: no material the card can already state survives them.
    // PROVENANCE[transmuteEquipment:materials]: UNVERIFIED versions=com2_warlord_1.5.12.9; gap=the three flag writes are reconstructed at `OLSpell.CAS!NOTTRANSMUTEEQUIPMENT!-8..-5 "IF ((ISHERO(TU))=0) THEN {" "SETENCHANTMENTFLAG(TU,EncOrihalcon,1,1)"`, and the quality ladder they resolve to is reconstructed at `Reference docs/Caster binary/Units.RecalculateUnits.pas` ($00598ED9..$00598F43). What is unverified is the cast-landed assumption and the same group-15 target gate PROVENANCE[transmuteEquipment:cast] names; pointer=Reference docs/Script source/Warlord 1.5.12.9/OLSpell.CAS
    ...(isWarlord ? [statStep({ id: 'transmuteEquipment:materials', phase: 'buffs',
      sourceId: 'transmuteEquipment', sourceLabel: 'Transmute Equipment: re-equip',
      writes: ['weaponMaterial', 'armorMaterial'],
      when: u => !!cast.transmuteEquipment && !u.fantastic && !u.ishero,
      apply: u => { u.weaponMaterial = 'adamantium'; u.armorMaterial = 'orihalcon'; } })] : []),
    // Haste joined them in F244.3e for the same reason Resist Magic and Discipline joined in
    // F244.3d: the Anti-Gravity Drive reform's permanent `EncHaste` write became
    // `training:temporalDrive`, so `haste` is a record field, and its only control is a cast
    // enchantment with no `template` row — without this step the seed would drop the card's mark.
    // PROVENANCE[haste:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=the Haste cast's own write of the permanent flag is reconstructed in no supported source. What the scripts do reconstruct is a *training* write of the same flag - `CreateUnit.CAS!HASEVILPRESENCE!+75 "SETENCHANTMENTFLAG(U,EncHaste,ABase,1)"`, which is training:temporalDrive and not this step - and reads of it on neighbouring units at `UnitCalcPre.CAS!NOZOMBIEMASTERY!+42 "%AND (GETENCHANTMENTFLAG(UNITONTILE(P,OX,OY,N),EncHaste,1)>0)"`, which prove the permanent record carries the flag but not that a cast is what put it there. The corpus's other EncHaste writers are a different record: `COSpell.CAS~"SETCOMBATENCHANTMENTFLAG(TU,EncHaste,1,1)"` (Power of Sorcery) and `SpellMysticSurge.CAS~"SETCOMBATENCHANTMENTFLAG(TU,EncHaste,ABase,1)"` set the *combat* enchantment flag, which is not the permanent one this step writes, and base CoM2's only writer is the same Mystic Surge line. The four non-Warlord engines have no reconstructed permanent writer at all, and no source makes the card's mark evidence that the cast landed - the calculator's own assumption, stated in CLAUDE.md under Damage calculator purpose and non-goals, the paragraph beginning `Generally, the calculator should assume that unit curses have succeeded`; pointer=Reference docs/Script source/Warlord 1.5.12.9/CreateUnit.CAS
    statStep({ id: 'haste:cast', phase: 'buffs', ...flag('haste', 'Haste') }),
    // Spell Lock joined them in F244.3f: `spellLock` became a record field when the strayed
    // Marionette's `SETOLENCHANTMENTFLAG(U,EncSpellLock,1,1)` became `b:marionette:spellLock`,
    // and its control is a cast enchantment with no `template` row, so without this step the
    // seed would drop the card's mark and the target would stop blocking Exorcise
    // (`combat_special_attacks.js`).
    //
    // The scope is the three CoM-era engines, not CoM 1 alone. Spell Lock is `spells.ini` [54]
    // in **both** modern sets as well — Realm 2, casting cost 100, `EnchantmentID=26`, a
    // castable unit enchantment — and the shared modern executable refuses Exorcise on the flag
    // it sets: `if aflags.exorcise and not Units[du].magicimmunity and not
    // Units[du].EnchantmentFlags[EncSpellLock] and Units[du].Fantastic`
    // (`Reference docs/Caster binary/Combat.ApplyAttack.pas`, the rider loop). Until F244.3f the
    // control was gated to CoM 1 and `exorciseReachesRoll` tested the key only there, so a
    // Spell-Locked Fantastic target took Exorcise in base CoM2 and Warlord exactly as an
    // unlocked one did. Warlord's *other* writer is the region-`b` Marionette step, which is not
    // a cast, and the two can meet: a card that states Spell Lock closes that step's gate.
    //
    // The two MoM builds take no step, and the reason is **not** that they lack the spell — they
    // have it. `Reference docs/MoM binary analysis.md` decodes mask `0x00004000` as Spell Lock in
    // the unit-enchantment table read from all three DOS executables. What they lack is a
    // *reader*: MoM's Dispel Evil carries no Spell Lock exclusion (the same file's MoM-versus-CoM
    // comparison records `Extra exclusion: none` for MoM against CoM 1's `[bx+0x19] & 0x40`), and
    // the one reconstructed test, `combat.c`'s `& UE_SPELL_LOCK`, sits at com1 addresses inside
    // the Exorcise arm. So in MoM the flag reaches no modelled number, and whether a control that
    // moves nothing should still be offered there is a decision F244.3f raised and did not take
    // (round-2 review, finding 1).
    // PROVENANCE[spellLock:cast]: UNVERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=no reconstructed source in any of the three CoM-era engines carries a Spell Lock cast writing the permanent flag, and the four things that *are* reconstructed each establish something narrower. (1) The spell records establish that the cast exists - `spells.ini` [54] in the CoM2 1.05.11 base set and the Warlord set alike, Realm 2, casting cost 100, EnchantmentID 26 - which is why the scope is the three CoM-era engines (F244.3f, on the user's ruling). (2) The consumer is `Reference docs/Caster binary/Combat.ApplyAttack.pas`, the Exorcise rider's `not Units[du].EnchantmentFlags[EncSpellLock]` term. That proves Exorcise reads the flag, but **not** which record supplied it - `Reference docs/Caster binary/Units.RecalculateUnits.pas` builds `EnchantmentFlags` by OR-ing the base, item, combat and overland layers, so the reader sees an aggregate and cannot identify the backing store. (3) Five writes of the same flag are reconstructed and none of them is this step - the strayed Marionette package at `UnitCalcPre.CAS!NOLONGERSTRAYEDMARIONETTE!+2 "SETOLENCHANTMENTFLAG(U,EncSpellLock,1,1)"`, which is b:marionette:spellLock - the ascension block's Enchanter branch at `UnitCalcPre.CAS!NOTMARIONETTEASCENSION!-3 "SETOLENCHANTMENTFLAG(U,EncSpellLock,1,1)"`, which F244.3g owns - hero item power 81 at `UnitCalcPre.CAS!NOVAMPIRICWEAPON!+3 "SETOLENCHANTMENTFLAG(U,EncSpellLock,1,1)"`, which is hero equipment and out of scope - the Mystic Surge random grant at `SpellMysticSurge.CAS~"SETCOMBATENCHANTMENTFLAG(TU,EncSpellLock,ABase,1)"`, present in both modern sets - and the Nodeborne Souls Sorcery-node grant at `EnterCombat.CAS!NOTNEUTRALNODEDEFEND!-4 "IF (BUFF=3) THEN { SETCOMBATENCHANTMENTFLAG(U,EncSpellLock,1,1)"`. The last two write the *combat* enchantment record rather than the permanent one. (4) What is left unverified is therefore only the calculator's own assumption that a marked flag means the cast landed, stated in CLAUDE.md under Damage calculator purpose and non-goals, the paragraph beginning `Generally, the calculator should assume that unit curses have succeeded`; pointer=Reference docs/Caster binary/Combat.ApplyAttack.pas
    ...(isCoM1 || isCoM2 ? [statStep({ id: 'spellLock:cast', phase: 'buffs',
      ...flag('spellLock', 'Spell Lock') })] : []),
    // Bless joined them in F244.3g, and for the fifth time the mechanism forced it: the owned
    // Marionette's Life-ascension arm writes `SETENCHANTMENTFLAG(U,EncBless,1,1)`, so `bless`
    // became a record field, and its only control is a cast enchantment with no `template` row —
    // without this step the seed would drop the card's mark and the two Bless riders
    // (`effectiveResistance:bless` and `effectiveDefense:bless`, `combat_effects.js`) would stop
    // firing in all five versions. Scope is every engine, which is where the control is offered.
    // PROVENANCE[bless:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=the Bless *cast's* own write of the permanent flag is reconstructed in no supported source, and the three things that are reconstructed each establish something narrower. (1) The spell record establishes that the cast exists - `spells.ini` [121] Bless in the Warlord set, Realm 4, casting cost 7, EnchantmentID 51, CastingLocation 2 - but says nothing about which record the cast writes. (2) One permanent EncBless write **is** reconstructed and it is not a Bless cast at all: the Consecration city enchantment grants it to units the city produces, at `COSpell.CAS~": New effect of Consecration, Temple/Cathedral enchant unit with Bless (not permanent) :"+5 "SETENCHANTMENTFLAG(NEWU,EncBless,1,1)"`, behind a Tattoo Magic research gate that routes to SETOLENCHANTMENTFLAG instead when the research is absent. That is a training-time writer with no control, not this step. (3) The corpus's other EncBless writer sets the *combat* record rather than the permanent one, and it is not the Bless cast either: `COSpell.CAS~"SETCOMBATENCHANTMENTFLAG(TU,EncBless,1,1)"` is one line of the **Power of Life** package, inside `COSpell.CAS~"IF (SP<>SPowerOfLife) THEN { GOTO"`, which grants eleven Life enchantments at once (F244.3g review, finding 8 - the earlier text called it a generic reapplication block, which misidentified the writer). And every reconstructed reader is spelled GETENCHANTMENTFLAG(U,EncBless,0), selector 0, which `Reference docs/Caster binary/Units.RecalculateUnits.pas` builds by OR-ing the base, item, combat and overland layers, so no reader identifies which record supplied the flag. What is left unverified is therefore the calculator's own assumption that a marked flag means the cast landed, stated in CLAUDE.md under Damage calculator purpose and non-goals, the paragraph beginning `Generally, the calculator should assume that unit curses have succeeded`, plus the narrower question of whether the permanent record is the right home for this key at all; pointer=Reference docs/Script source/Warlord 1.5.12.9/COSpell.CAS
    statStep({ id: 'bless:cast', phase: 'buffs', ...flag('bless', 'Bless') }),
    // Invisibility joined them in F252.3, and it is the first that joined for the *source* reason
    // rather than the record-field one. `invisibility` was already a record field
    // (`b:marionette:ascension:invisibility` writes it), and it is one of the nine dual-source calc
    // keys: an ability control states the unit was built Invisible and an enchantment control
    // states the cast. While the seed read the merged map the cast rode the `template` seed; since
    // the seed reads the innate half alone, the cast needs its own rank, and this is it.
    //
    // The write is a **set**, not a toggle, so seeding the innate bit and setting it again here is
    // idempotent — which is what makes two positioned writes of one dual-source boolean safe
    // (F252.2, shape 1). That the derivation is a set is what the reconstructed reads show; that
    // this is the *rank* the engine makes the cast's write at is the calculator's own ordering
    // ruling (`CLAUDE.md`, the phase table), not something those addresses establish.
    // Scope is every engine, which is where the enchantment control is offered.
    // PROVENANCE[invisibility:cast]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.9; gap=three separate things are unverified here and the reconstructed reads establish none of them. (1) **The writer.** No supported source reconstructs an Invisibility cast writing a permanent flag on the unit. (2) **The backing store.** The reads that do exist are of an *aggregate*: `if U.EnchantmentFlags[EncInvisibility] then U.invisible := True` ($0059E7B6..$0059E810) sits after `Reference docs/Caster binary/Units.RecalculateUnits.pas` has already combined the permanent, item, combat and overland layers into `EnchantmentFlags` ($0059DCF2..$0059DDC3), so the reader cannot say which layer supplied the bit — the DOS side is the same shape, since `if (ench & UE_INVISIBILITY) bu->Abilities |= UA_INVISIBILITY` (`Reference docs/DOS reconstructed/unitcalc.c`, com1:0x8F32B) reads an accumulator built from item powers among others (`IP_INVISIBILITY`, 131:0x8E223). So neither read is evidence that the permanent record is where a cast Invisibility lives. (3) **The rank.** This step writes the permanent record ahead of recalculation, where CLAUDE.md's phase table puts a cast — the recalculation addresses above are a *later* derivation of the ability field from the flag and do not locate the cast's own write. What those addresses do establish, and all this step relies on them for, is that the derivation is a **set** onto the ability field rather than an assignment that could clear a template bit - which is why the innate seed and this write compose. The assumption that a marked flag means the cast landed is the calculator's own, stated in CLAUDE.md under Damage calculator purpose and non-goals, the paragraph beginning `Generally, the calculator should assume that unit curses have succeeded`; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'invisibility:cast', phase: 'buffs',
      ...flag('invisibility', 'Invisibility') }),
  ];
}

// Divine Protection's grant is `b:divineProtection` (`stats_sequence.js`), a positioned write to
// the record's `deathImmunity` and `lucky` fields (F200).

// Pillar of Faith (Warlord, Life rare city enchantment): units trained in the city have a
// 20% chance to gain Lucky. The calculator models the landed outcome, so the pillarOfFaithLucky
// toggle folds Lucky in directly (its +10% To Hit / +10% To Block / +1 Resistance flow through
// the ability stat modifiers). The separate +Resistance per Religious Building is applied to
// res in deriveUnitStats and is sourced on PROVENANCE[pillarOfFaith] in stats_sequence.js.
function applyPillarOfFaithGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.pillarOfFaithLucky) return abilities;
  return { ...abilities, lucky: true, luckyPhaseBase: true };
}

// Fortification's grant is `d:fortification` (`stats_sequence.js`), a positioned write whose
// already-shielded test reads the record at its own rank (F200).

// Insulation's grant is `b:insulation` (`stats_sequence.js`), a positioned write to the record's
// `fireImmunity`, `lightningResist` and `coldImmunity` fields (F200).

const MARIONETTE_VERSION = 'com2_warlord_1.5.12.9';
const MARIONETTE_HERO_TYPE_ID = 48;
const MARIONETTE_REALMS = ['nature', 'sorcery', 'chaos', 'life', 'death'];
// The projectile retype the owned branch writes, by primary realm: ids 37, 34, 31, 35 and 33
// (`UnitCalcPre.CAS!NOVAMPIRISM!+26 "SETSTAT(U,SRangedType,0,37);"`,
// `UnitCalcPre.CAS!NOTNATUREMARIONETTESPELL!+4 "SETSTAT(U,SRangedType,0,34);"`,
// `UnitCalcPre.CAS!NOTSORCERYMARIONETTESPELL!+4 "SETSTAT(U,SRangedType,0,31);"`,
// `UnitCalcPre.CAS!NOTCHAOSMARIONETTESPELL!+4 "SETSTAT(U,SRangedType,0,35);"`,
// `UnitCalcPre.CAS!NOTLIFEMARIONETTESPELL!+4 "SETSTAT(U,SRangedType,0,33);"`). Every one of them is a
// `SETSTAT(U,SRangedType,0,…)` — record selector `0`, the calculated record — so this value is
// what the region-`b` step `b:marionette:rangedType` writes, not part of the permanent record.
// All five ids are `IsMagic=Yes` with nothing else the modern engine reads, so all five are the
// one modern token; the realm the script's arms select is a spell-flavour choice the engine
// attaches to the projectile nowhere (`SPEC.md`, *Deliberate deviations*).
const MARIONETTE_RANGED_TYPES = {
  nature: 'magic', sorcery: 'magic', chaos: 'magic', life: 'magic', death: 'magic',
};
// The ascension block's own second retype, for a Chaos primary alone: `SRangedType = 30`
// (`UnitCalcPre.CAS!ENDOFMARIONETTESPELLSELECT!+80 "SETSTAT(U,SRangedType,0,30);"`), beside the Wall Crusher and Armor Piercing grants of the same three
// lines. Id 30 is the lightning-bolt projectile, a token of its own, so this is a second write
// at a second position — `b:marionette:ascensionRangedType`, after the book grants — and not
// something the primary arm's value already covers.
const MARIONETTE_ASCENSION_RANGED_TYPES = { chaos: 'magic_lightning' };
const MARIONETTE_SPELLS = {
  nature: { base: 'Web', ascended: 'Ice Bolt', conjurer: 'Water Elemental' },
  sorcery: { base: 'AEther Sparks', ascended: 'Psionic Blast', conjurer: 'Phantom Beast' },
  chaos: { base: 'Fire Bolt', ascended: 'Lightning Bolt', conjurer: 'Fire Elemental' },
  life: { base: 'Healing', ascended: 'Exaltation', conjurer: 'Unicorns' },
  death: { base: 'Life Drain', ascended: 'Syphon Life', conjurer: 'Werewolves' },
};

function marionetteBookCount(abilities, realm) {
  const key = `marionette${realm[0].toUpperCase()}${realm.slice(1)}Books`;
  return Math.max(0, Math.trunc(Number(abilities[key]) || 0));
}

// --- The owned branch's thirty-one grants, one entry per engine write (F244.3g) ---
//
// Every write the owned Marionette branch makes, in `UnitCalcPre.CAS` order, as data: the five
// `b:marionette:books:*` and twenty-six `b:marionette:ascension:*` steps read it
// (`stats_sequence.js`), and so does the package's display list, so the thresholds and values have
// one home. Until F244.3g these were `grant(...)` calls inside `deriveMarionettePackage` that merged
// into the ability map before the sequence started; F244's rule is that the record starts as the
// roster template and nothing else, so each is a positioned region-`b` write now.
//
// **One entry per engine write, not per block.** `CLAUDE.md`'s *Architecture* section requires each
// engine write to be its own step with its own citation, and the grouping this subtask first used —
// one step per realm — could not express the order either: `SETSTAT(U,SRangedType,0,30)` sits on the
// third line of the Chaos arm, after Wall Crusher and Armor Piercing and before the Life arm's
// Exorcise, which a single ascension step cannot straddle.
//
// Every one of the thirty-one is in `UnitCalcPre.CAS`, the precalc script hook, which is what makes
// the phase `b`. Twenty-eight are `SETSTAT(U,…,0,…)` — record selector `0`, the calculated record.
// Three are `SETENCHANTMENTFLAG(U,Enc…,1,1)`, selector `1`, the **permanent** record: Resist Magic at
// `UnitCalcPre.CAS!ENDOFMARIONETTESPELLSELECT!+24 "SETENCHANTMENTFLAG(U,EncResistMagic,1,1);"`, Bless at `UnitCalcPre.CAS!ENDOFMARIONETTESPELLSELECT!+84 "SETENCHANTMENTFLAG(U,EncBless,1,1);"` and Invisibility at
// `UnitCalcPre.CAS!ENDOFMARIONETTESPELLSELECT!+96 "SETENCHANTMENTFLAG(U,EncInvisibility,1,1);"`. Permanent storage says what a later recalculation
// reads, not that the write happens earlier than the hook containing it, so all three keep this
// phase — the ruling F244.3f made for the strayed package's eight.
//
// Three gate shapes, and the entry says which. `over` is the script's own comparison,
// `BOOKS(W,<realm>) > n`, kept verbatim rather than restated as `>= n+1`; `primary` is
// `IF (PRIMARY=<realm>)`, the ascension block's five mutually exclusive arms; and `ascension` marks
// the twenty-one writes behind
// `IF (SPELLSTATE(W,SMarionetteAscension)<>2) THEN { GOTO "NOTMARIONETTEASCENSION"; }`.
//
// `delta` marks the one grant that is an increment rather than an assignment:
// `SETSTAT(U,SRegeneration,0,GETSTAT(U,SRegeneration,0)+2)`. Everything else is a `SET`, so a card
// value the record already carries is overwritten, which is what the script does.
const MARIONETTE_OWNED_GRANTS = Object.freeze({
  forester: { realm: 'nature', over: 1, label: 'Forester', value: true },
  mountaineer: { realm: 'nature', over: 1, label: 'Mountaineer', value: true },
  poisonImmunity: { realm: 'nature', over: 2, label: 'Poison Immunity', value: true },
  stoningImmunity: { realm: 'nature', over: 4, label: 'Stoning Immunity', value: true },
  largeShield: { realm: 'sorcery', over: 1, label: 'Large Shield', value: true },
  missileImmunity: { realm: 'sorcery', over: 2, label: 'Missile Immunity', value: true },
  resistMagic: { realm: 'sorcery', over: 4, label: 'Resist Magic', value: true },
  firstStrike: { realm: 'chaos', over: 1, label: 'First Strike', value: true },
  fireImmunity: { realm: 'chaos', over: 2, label: 'Fire Immunity', value: true },
  lightningResist: { realm: 'chaos', over: 4, label: 'Lightning Resist', value: true },
  healer: { realm: 'life', over: 1, label: 'Healer', value: true },
  illusionImmunity: { realm: 'life', over: 2, label: 'Illusion Immunity', value: true },
  lucky: { realm: 'life', over: 4, label: 'Lucky', value: true },
  coldImmunity: { realm: 'death', over: 1, label: 'Cold Immunity', value: true },
  deathImmunity: { realm: 'death', over: 2, label: 'Death Immunity', value: true },
  weaponImmunity: { realm: 'death', over: 4, label: 'Weapon Immunity', value: true },
  poison: { realm: 'nature', primary: true, ascension: true, label: 'Poison 10', value: 10 },
  stoningTouch: { realm: 'nature', primary: true, ascension: true, label: 'Stoning Touch -2', value: -2 },
  counterImmunity: { realm: 'sorcery', primary: true, ascension: true, label: 'Counter Immunity', value: true },
  illusion: { realm: 'sorcery', primary: true, ascension: true, label: 'Illusion', value: true },
  wallCrusher: { realm: 'chaos', primary: true, ascension: true, label: 'Wall Crusher', value: true },
  armorPiercing: { realm: 'chaos', primary: true, ascension: true, label: 'Armor Piercing', value: true },
  exorcise: { realm: 'life', primary: true, ascension: true, label: 'Exorcise -4', value: -4 },
  bless: { realm: 'life', primary: true, ascension: true, label: 'Bless', value: true },
  bloodSucker: { realm: 'death', primary: true, ascension: true, label: 'Blood Sucker', value: true },
  createUndead: { realm: 'death', primary: true, ascension: true, label: 'Create Undead', value: true },
  regeneration: { realm: 'nature', over: 4, ascension: true, label: 'Regeneration +2', value: 2, delta: true },
  invisibility: { realm: 'sorcery', over: 4, ascension: true, label: 'Invisibility', value: true },
  destruction: { realm: 'chaos', over: 4, ascension: true, label: 'Destruction 0', value: 0 },
  healingAura: { realm: 'life', over: 4, ascension: true, label: 'Healing Aura', value: true },
  lifeSteal: { realm: 'death', over: 4, ascension: true, label: 'Life Steal -1', value: -1 },
});

// Does this grant's own test pass, for a package? The branch term is the step's, not this
// function's: a step's `when` is `marionetteOwned && marionetteOwnedGrantFires(...)`.
function marionetteOwnedGrantFires(entry, pkg) {
  if (entry.ascension && !pkg.ascended) return false;
  if (entry.primary) return pkg.primary === entry.realm;
  return pkg.books[entry.realm] > entry.over;
}

// The chain label a reader sees beside the write, built from the entry rather than restated.
function marionetteOwnedGrantSource(entry) {
  const realm = entry.realm[0].toUpperCase() + entry.realm.slice(1);
  if (entry.primary) return `${realm} Ascension`;
  return `${entry.over + 1}+ ${realm} books${entry.ascension ? ', Ascension' : ''}`;
}

// Everything a grant's step is except its id and its citation, so the thirty-one `statStep` calls in
// `stats_sequence.js` state only what is theirs. They are written out one by one rather than mapped,
// because a formula id is discovered by matching the literal step-constructor call that opens with
// it, so an id built at run time would carry no anchor at all.
function marionetteOwnedGrantStep(key, pkg, owned) {
  const entry = MARIONETTE_OWNED_GRANTS[key];
  return {
    sourceId: 'marionetteChanneler',
    sourceLabel: `Marionette (Channeler): ${marionetteOwnedGrantSource(entry)}`,
    phase: 'b',
    writes: [key],
    when: () => owned && marionetteOwnedGrantFires(entry, pkg),
    apply: u => {
      u[key] = entry.delta ? (Number(u[key]) || 0) + entry.value : entry.value;
    },
  };
}

// The display list of what the owned branch confers, in the script's own order. It is a label list
// and a source of nothing — the thirty-one steps make every write — and it reads the same table they
// do, so the two cannot drift.
function marionetteOwnedGrantLabels(pkg) {
  return Object.values(MARIONETTE_OWNED_GRANTS)
    .filter(entry => marionetteOwnedGrantFires(entry, pkg))
    .map(entry => entry.label);
}

// The package carries the branch, the wizard facts its blocks are gated on, its spell and charge
// metadata, and — for the owned branch alone — the realm retype value `b:marionette:rangedType`
// writes. It grants no ability key at all since F244.3f and F244.3g: the strayed branch's eight
// writes and the owned branch's thirty-one are positioned region-`b` steps, so this function is no
// longer one of `ABILITY_ORIGIN_TRANSFORMS` (`stats_origins.js`). It carries no permanent
// ranged type: the Wanderer's own is `UNITS.INI [362] RangedType=30`, read from the roster record.
// The block's entrance is three tests, not two: `IF ( ISHERO(U) = 0 ) THEN { GOTO "NOTHERO"; }`
// at `UnitCalcPre.CAS!NOVAMPIRISM!+3 "IF ( ISHERO(U) = 0 ) THEN { GOTO"` stands ahead of the hero-type test, and the whole Marionette
// region — both branches, the two later augmentation blocks and everything to
// `UnitCalcPre.CAS!NOTHERO!` — lies inside it. The hero flag was missing here until F244.3f: a
// record stating hero type 48 with `isHero` false took the strayed branch and received all eight
// permanent writes the script would have skipped. It is unreachable from the page, because
// `heroTypeId` comes from the roster record and only the Wanderer carries 48, but the checks
// themselves constructed exactly that identity, so the invariant could not be asserted instead.
// **The citations are the branch's own extent, which shrank twice.** They used to run 83-301 and
// 364-394 — every grant of both branches. The strayed span went when F244.3f made those writes
// steps, and the grant spans (194-301) go here for the same reason: each is now cited by the step
// that makes the write, and a formula citing a write it does not make is the defect F244.3f's
// review named. What is left is exactly what this function still decides: the branch entrance with
// the initial `SCHARGE` (first span), the five spell-selection arms and their `SRangedType` writes
// (the next three), the Chaos ascension arm's second retype (the fifth — the value
// `ascensionRangedType` carries, which stays a package constant, so the write it names has to be
// here even though `b:marionette:ascensionRangedType` makes it), and the ascension gate with its
// `SCHARGE` recompute (the last).
//
// **The charge store at `UnitCalcPre.CAS!NOTMARIONETTEASCENSION!+2 "SETSTAT(U,SSpellCharges,1,SCHARGE);"` is named
// and not cited, deliberately.** It is where the engine stores the charge count this function
// computes, and no span can carry it honestly: the write is unconditional in its own region — both
// arms converge on `!NOTMARIONETTEASCENSION!` — so the nearest gate that decides whether it runs is
// the branch entrance 270 lines above, and the audit requires each citation to show a gate beside
// its write. An earlier revision of this entry reached back to line 354 to pick up the Enchanter
// retort's `IF`, which gates nothing here, and said so in a comment. Disclosing that a check is
// being satisfied syntactically does not make the citation true, so the span is gone (F244.3g
// review, finding 3). What the two `SCHARGE` assignments the citations *do* carry establish is the
// value; where the engine puts it is a mention.
// The unit is the **record** since F267.6: `ishero` and `herotype` are the two `UnitT` members
// this gate reads (`Typedec.pas:203`, `:247`), and neither is written by a step.
// STAT-FORMULA[marionettePackage]
// PROVENANCE[marionettePackage]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:13:54bbc38ee124177d63ae69f4 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:39:58a1f4eccd319a76072204a6 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:40:278fa1f3acca365b536cf823 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:19:55ebed8c65ed05b617bc2a17 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:5:7452b4dcbe1df6aa43cdb7a0 | Reference docs/Script source/Warlord 1.5.12.9/UnitCalcPre.CAS@span:5:87ea1b34ea4f73c02d6092e4
function deriveMarionettePackage(u, abilities, version) {
  if (version !== MARIONETTE_VERSION || !(u && u.ishero)
      || u.herotype !== MARIONETTE_HERO_TYPE_ID) {
    return { abilities, package: null };
  }

  // A Wanderer recalculated without a Channeler owner takes the one-time strayed branch.
  // Its eight persistent writes are **not** made here: `UnitCalcPre.CAS!STRAYEDMARIONETTE!` is a
  // region-`b` block like every other in this file, so each takes its rank in the sequence —
  // `b:marionette:strayedPackage` for the seven behind the Spell Lock skip and
  // `b:marionette:spellLock` for the one outside it (`stats_sequence.js`, F244.3f). What the
  // package still carries is the branch itself, which `marionetteStrayed` supplies as those
  // steps' `when` and the ranged-slot selection reads.
  // `grantedAbilities` is the display list of what the branch confers, not a source of any of it.
  if (!abilities.channeler) {
    const grantedAbilities = [
      'Transmute Equipment', 'Rebuild', 'Sage', 'Mechanical Master',
      'Ritual Master', 'Charmed', 'Arcane Ward', 'Spell Lock',
    ];
    return {
      abilities,
      // The strayed branch writes no ranged type at all (`UnitCalcPre.CAS!STRAYEDMARIONETTE!+0..+28 "!STRAYEDMARIONETTE!" "!NOLONGERSTRAYEDMARIONETTE!"`), so the
      // package projects none: the Wanderer's Chaos ranged type 30 at zero strength is its own
      // roster record's (`UNITS.INI [362]`), and Transmute Equipment's later +2 `SRanged` write
      // activates that latent channel wherever the record states it.
      package: { state: 'strayed', spellLock: true, grantedAbilities },
    };
  }

  const primary = MARIONETTE_REALMS.includes(abilities.marionettePrimary)
    ? abilities.marionettePrimary : 'nature';
  const books = Object.fromEntries(MARIONETTE_REALMS.map(realm => [realm, marionetteBookCount(abilities, realm)]));
  const ascended = !!abilities.marionetteAscension;
  const conjurer = !!abilities.marionetteConjurer;
  const baseSkill = Math.max(0, Math.trunc(Number(abilities.marionetteBaseSkill) || 0));
  const attackBonus = Math.trunc(baseSkill / 30);
  const defenseBonus = Math.trunc(baseSkill / 50);
  const primaryBooks = books[primary];
  const charges = ascended
    ? Math.max(1, Math.trunc(primaryBooks / 2))
    : 1 + Math.trunc(primaryBooks / 2);
  const spellSet = MARIONETTE_SPELLS[primary];
  const spell = ascended ? (conjurer ? spellSet.conjurer : spellSet.ascended) : spellSet.base;

  // The owned branch's thirty-one grants are **not** made here either, since F244.3g. Each is its
  // own region-`b` step — `b:marionette:books:<key>` for the sixteen book writes and
  // `b:marionette:ascension:<key>` for the fifteen ascension ones (`stats_sequence.js`), all reading
  // `MARIONETTE_OWNED_GRANTS` above. What the package
  // carries is the block's *inputs* — the primary realm, the five book counts and the ascension
  // flag, all wizard facts the unit record does not hold — plus the three outputs that are not
  // ability keys at all and stay constants: the spell, the charge count and the two ranged types.
  // `luckyPhaseB` went with the grants. It was a write-only derived flag standing for no engine
  // write — the Life-book grant it accompanied is `SETSTAT(U,ALucky,0,1)` and nothing else — so it
  // is retired the way F198 and F244.3e retired theirs rather than given a step.
  return {
    abilities,
    package: {
      state: 'owned', primary, books, ascended, conjurer, baseSkill,
      attackBonus, defenseBonus,
      rangedType: MARIONETTE_RANGED_TYPES[primary],
      ascensionRangedType: ascended ? (MARIONETTE_ASCENSION_RANGED_TYPES[primary] || null) : null,
      spell, charges,
      grantedAbilities: marionetteOwnedGrantLabels({ books, ascended, primary }),
    },
  };
}

// Outlander controls expose the researched reform/building conditions, not their derived labels,
// so these names are outputs and never accepted inputs.
const DERIVED_OUTLANDER_STATE_KEYS = [
  'armorclad',
  'blackpowder',
  'bombsGrenades',
  'energyCannon',
  'energyCannonDestruction',
  'energyWeaponry',
  'powerEngine',
  'upgradedExplosive',
];

// Names that used to be on the list above and are not ability keys of any kind now: each was a
// label for a block gate no engine flag stands behind, and each is a `reform` field since F244.3e,
// the way F198 handled `battleArmor` and `magitekEngine`. They are stripped for the reason the
// list above is — a stale saved state or share link from an older build still carries them, and
// publishing a name the derivation no longer produces would contradict the record — but they are
// **not** in the origin table and must not be, because nothing writes them (F244.3e review,
// finding 1). Two lists rather than one because that difference is the whole point: the keys above
// are outputs this build still makes.
const RETIRED_OUTLANDER_STATE_KEYS = [
  'pneumaField',
  'psychoForce',
  'temporalGravityDrive',
];

// The reform block's eligibility gates, for the versions that have no Outlander reforms at all.
// Every positioned reform write reads its `when` from here — the four F244.3d gave a `training`
// step, the region-`b` steps F198 gave one, and the temporal-drive and `!COMBATOVERRIDE!` writes
// F244.3e positioned — and so do the two research states read outside the block.
const NO_OUTLANDER_REFORM = Object.freeze({
  sapiensOwned: false,
  battleArmorEligible: false, magitekEngine: false,
  ballisticsTraining: false, xenopsychology: false, radio: false, xenoveterinary: false,
  armorclad: false, powerEngine: false, magitekScience: false, militaryDrilling: false,
  energyBeamWeapons: false, rocketry: false,
  temporalEngineering: false, psychoConverter: false, pneumaReactor: false,
  combatSoldierOwned: false,
});

// Returns the ability set with the reform's derived output names stripped, **and** the block's
// eligibility record. It grants nothing any more, which is why it is no longer named for grants
// and no longer one of `ABILITY_ORIGIN_TRANSFORMS`.
//
// Nine of the states it used to derive were ability labels no engine flag stands behind —
// `EncBattleArmor` and `EncMagitek` occur nowhere in the 38 `.CAS` files, and neither do the
// Psycho Force, Pneuma Field and Temporal Gravity Drive names — and each was only ever the `when`
// of a step the chain already has, so they are `reform` fields read by those predicates instead of
// keys merged into the unit's abilities (F198, extended by F244.3e). The states that *do* stand
// for an engine write became positioned steps: Armorclad, Power Engine, Resist Magic and
// Discipline in F244.3d, and Haste, Flying and Illusion Immunity — the Anti-Gravity Drive block's
// three permanent writes — plus Energy Weaponry's calculated-record Doom write in F244.3e.
//
// **The seven keys F244.3e positioned were not region-`b` grants.** The item filed them as such,
// and no `UnitCalcPre.CAS` line makes any of them: the file's one Anti-Gravity block
// (`UnitCalcPre.CAS!NOZOMBIEMASTERY!+5 "IF (SPELLSTATE(W,STMagitekAntiGravityDrive)<>2) THEN { GOTO"`) is an overland stack scan that *reads*
// `EncHaste` and `AIllusionImmunity` on neighbouring transports and writes `AStealth`, a movement
// stat outside the calculator's record (F139). The three real writes are `CreateUnit.CAS`'s
// creation block and `OverlandEndTurn.CAS`'s upgrade pass, both permanent — the `training` phase —
// and the three `!COMBATOVERRIDE!` states are region `d`.
//
// Every `BASEFANTASTIC(U)` in this block is the **permanent** record: the base unit data "before
// applying continuous effects such as buffs or curses" (`Reference docs/Script source/CAS
// reference/Scripts.TXT:286`), which carries Destiny's `B.Fantastic := True` at $0059A390 (F192).
// No such term is computed here any more, because this function runs before the sequence and the
// permanent record is only published at `a:baseCopy`: each of the three states that carried one —
// the `NOTSAPIENS` tail, Battle Armor and the `!COMBATOVERRIDE!` soldier gate — is a predicate
// below, reading `ctx.base.fantastic` at the rank of the step asking. Every step they gate is
// region `b` or later, so the copy has been published (F262). The one live-Fantastic gate in the
// block is Xenoveterinary's `IF FANTASTIC(U)` (`UnitCalcPre.CAS!COMRADENOTSURVIVE!+16 "IF FANTASTIC(U) THEN {"`),
// and that term is not here either: it is the positional `when` of `b:outlanderXenoveterinary`.
function deriveOutlanderReformRecord(abilities, version, isHero = false) {
  if (!version || !version.startsWith('com2_warlord')) {
    return { abilities, reform: NO_OUTLANDER_REFORM };
  }

  // These names are outputs, never accepted inputs. Besides keeping the UI to one
  // source of truth, stripping them here prevents stale saved state or a caller from
  // bypassing the reform/building prerequisites. The retired names go with them: they are
  // outputs of no build at all now, so a raw mark of one must not reach the published map.
  const fundamentalAbilities = { ...abilities };
  for (const key of DERIVED_OUTLANDER_STATE_KEYS) delete fundamentalAbilities[key];
  for (const key of RETIRED_OUTLANDER_STATE_KEYS) delete fundamentalAbilities[key];

  const outlanderWizard = !!fundamentalAbilities.outlanderWizard;
  // All fifteen reform spell states are owned by an Outlander wizard, and that ownership is now an
  // explicit term on every read rather than a deletion from the map (F244.3d). The deletion made
  // the gate invisible at the reading site and made the published ability set depend on which
  // wizard owns the unit, which is not something the engine's unit record carries at all: the
  // research state is `SPELLSTATE(W,ST…)`, a *wizard* field the scripts test beside the unit's
  // (`CreateUnit.CAS`, `OverlandEndTurn.CAS`). `research` below is the one home for the test.
  // Every read inside this function was already spelled `outlanderWizard && …` — directly, or
  // through the Sapiens tail, `powerEngine` or the combat-soldier gate, each of which carries the
  // term — so the deletion changed nothing here. The reads outside it take the gate from the
  // `reform` record's own fields instead.
  const research = key => outlanderWizard && !!fundamentalAbilities[key];
  // Rebuild permanently writes Mechanical for non-heroes. Its hero branch is
  // encounter-only and cannot receive overland Power Engine/Armorclad upgrades. Sourced on
  // PROVENANCE[rebuild] (combat_abilities.js) and PROVENANCE[rebuildEffectDerivation]
  // (combat_effects.js), both out of this block's anchor window.
  const permanentMechanical = !!fundamentalAbilities.mechanical
    || (!!fundamentalAbilities.rebuild && !isHero);
  const armorclad = research('armorcladReform') && permanentMechanical;
  // `UnitCalcPre.CAS!NOTSAPIENS!+2 "IF (BASEFANTASTIC(U)>0) THEN { GOTO"` closes the whole tail on `BASEFANTASTIC(U)>0`, and the +3 branch at
  // `UnitCalcPre.CAS!NOTSAPIENS!+6..+12 "IF (GETENCHANTMENTFLAG(U,EncArmorClad,1)=0)" "}"` restates it beside `EncArmorClad` index 1 and `SCustomAttribute` index 1 — three
  // permanent-record terms in one test.
  // The `BASEFANTASTIC(U)>0` term is not here: `b:battleArmor` reads it off `ctx.base` at its own
  // region-`b` rank through `outlanderBattleArmorAt` (F262). What stays is the rest of the test.
  const battleArmorEligible = research('armorcladReform') && !permanentMechanical;
  const powerEngine = research('heatPowerEngine') && permanentMechanical;
  // The `NOTSAPIENS` gate, `UnitCalcPre.CAS!NOMAGITEKENGINE!+2..+4 "IF (BASEFANTASTIC(U)>0)" "THEN { GOTO"`. `b:bombsGrenades` reads the same one.
  //
  // The full test is `BASEFANTASTIC(U)>0 %AND (GETSTAT(U,SMultiLabel,1)<>14)`, and 14 is the
  // Sapiens label — `DisAbil.CAS` prints "Sapiens" on it. `sapiens` is the control that states
  // it, and Spirit Link's cast is a second writer: its `SETSTAT(TU,SMultiLabel,1,14)` runs under
  // the same `IF BASEFANTASTIC(TU)` as the Fantastic clear, so a Spirit-Linked base-Fantastic
  // unit carries the label. That is not redundant with the clear, because the label survives a
  // later write that makes the unit permanently Fantastic again: Destiny's `B.Fantastic := True`
  // is re-made on every recalculation pass and stands after the clear in the chain, and it does
  // not touch `SMultiLabel`. So a Spirit Link + Destiny unit is Fantastic here and still labelled
  // 14, and the script's conjunction admits it (F245 review, finding 2).
  //
  // **Both halves of the gate are record reads now (F263).** `BASEFANTASTIC(U)>0` is
  // `outlanderSapiensAt`'s `ctx.base.fantastic` read (F262) and `GETSTAT(U,SMultiLabel,1)` is its
  // `ctx.base.sapiens` read: selector 1 is "the base unit"
  // (`Reference docs/Script source/CAS reference/Scripts.TXT:270`), so the label is the permanent
  // record's like the flag beside it, and the record `a:baseCopy` publishes carries both. The
  // `sapiens` control seeds the field at `template` rank and `buffs:spiritLink:sapiens`
  // (`stats_sequence.js`) is the cast's write, which is what retired the `spiritLinkSentience`
  // parameter this function used to take. What is left here is the one term no record field can
  // answer: wizard ownership, exactly as `combatSoldierOwned` below.
  const sapiensOwned = outlanderWizard;
  // `UnitCalcPre.CAS!NOXENOVET!+2..+4 "IF (GETENCHANTMENTFLAG(U,EncPowerEngine,0)=0)" "NOMAGITEKENGINE"`: the block's own gate is the *calculated* `EncPowerEngine` flag,
  // which no region-`b` write reaches before this point, so the derived permanent state answers it.
  const magitekEngine = powerEngine && research('magitekEngineering');
  // Military Drilling's Fantastic term is **not** here, and that is the difference between this
  // state and the four permanent ones above. `training:militaryDrilling` is the one `training`
  // step in the reform whose block carries a `BASEFANTASTIC(U)` test
  // (`OverlandEndTurn.CAS!NOMAGITEKSCI!+2 "IF (BASEFANTASTIC(U)>0) THEN { GOTO"`), and a
  // `training` step ranks ahead of every permanent-record write the pipeline makes, so gating it
  // on the record those writes *leave* would be a gate reading a later phase. It reads
  // `u.fantastic` at its own rank instead, the way `training:temporalDrive` reads `u.powerEngine`
  // and `training:magitekScience` reads `u.armorclad` (F245, on the user's ruling). The four
  // states above keep their `baseFantastic` term because every step they gate is region `b` or
  // later, where the permanent record is the finished one.
  //
  // **Which history this represents, and that the source does not settle it.** The block has two
  // entrances. At creation the unit is being built and no cast has reached it, so
  // `BASEFANTASTIC(U)` is the template flag and the grant lands. At the `OverlandEndTurn.CAS`
  // upgrade pass — which runs every turn, on a unit that may have been Apotheosised or Spirit
  // Linked since — it is the flag those casts left, and the grant is closed. The two genuinely
  // disagree for such a unit, the calculator models one step at the creation position, and this
  // gate is therefore the **creation** history. Nothing in the scripts ranks the two entrances
  // for a given unit; the model picks one, and this comment is the record of which.
  const militaryDrilling = research('militaryDrilling');

  return {
    // Nothing is granted here any more. Every write the reform makes is a positioned step, and
    // this record is what supplies each one's `when`:
    //   `training:armorclad`, `training:powerEngine`, `training:magitekScience`,
    //   `training:militaryDrilling` (F244.3d) — the permanent `CreateUnit.CAS` /
    //   `OverlandEndTurn.CAS` writes of Armorclad, Power Engine, Resist Magic and Discipline;
    //   `training:temporalDrive` (F244.3e) — the Anti-Gravity Drive block's Haste, Flying and
    //   Illusion Immunity, permanent writes at the same two entrances;
    //   `d:energyWeaponry`, `d:psychoForce`, `d:pneumaField` (F244.3e) — the three
    //   `UnitCalc.CAS!COMBATOVERRIDE!` Outlander-soldier effects;
    //   `b:battleArmor`, `b:magitekEngine`, `b:outlanderXenoveterinary`, `b:bombsGrenades`,
    //   `b:outlanderBallisticsTraining`, `b:outlanderXenopsychology`, `b:outlanderRadio` (F198).
    // Large Shield is not granted here either: it is the Magitek Engine block's fourth write,
    // `SETSTAT(U,ALargeShield,0,1)` at `UnitCalcPre.CAS!NOXENOVET!+9 "SETSTAT(U,ALargeShield,0,1);"`, inside the same reviewed span as the
    // To-Defend one, so it is a second field of `b:magitekEngine` and lands at that rank — which
    // is what lets the region-`d` Fortification block see it (F200).
    abilities: fundamentalAbilities,
    reform: {
      // The one term of the `NOTSAPIENS` gate that no record read can supply, for
      // `outlanderSapiensAt` to finish at the asking step's rank (F262, F263). Its two record
      // terms — the permanent Fantastic flag and the Sapiens label — are read off `ctx.base`
      // there.
      sapiensOwned,
      battleArmorEligible,
      magitekEngine,
      // The research state alone: the `NOTSAPIENS` gate the same tail puts in front of these
      // three is `outlanderSapiensAt`, made at each step's own rank rather than folded in here.
      ballisticsTraining: research('ballisticsTraining'),
      xenopsychology: research('xenopsychology'),
      radio: research('radio'),
      // The research state alone. `IF FANTASTIC(U)` (`UnitCalcPre.CAS!COMRADENOTSURVIVE!+16 "IF FANTASTIC(U) THEN {"`) is the calculated
      // record at region `b`, so it is the step's own `when` and not a term here (F198).
      xenoveterinary: research('xenoveterinary'),
      // The `when` of the four positioned training writes (F244.3d). Each is the block's own gate
      // with the record read left out, because the record cannot answer it at the `training`
      // phase: `permanentMechanical` carries Rebuild's permanent `SCustomAttribute` write, which
      // `buffs:rebuild` makes two phases later, and the overland entrance these steps also stand
      // for reaches a unit that was cast on long before. `armorclad` is the exception in the other
      // direction — `training:magitekScience` reads the *flag* off the record, which is what
      // `OverlandEndTurn.CAS`'s own `GETENCHANTMENTFLAG(U,EncArmorClad,1)` gate does — so
      // `magitekScience` here is the research state alone.
      armorclad,
      powerEngine,
      magitekScience: research('magitekScience'),
      militaryDrilling,
      // The two research states read outside this function, gated here so the reading site does
      // not have to restate the ownership test the deleted map mutation used to make implicitly
      // (F244.3d). `energyBeamWeapons` is `training:energyCannon`'s and `d:energyCannonThreshold`'s
      // `SPELLSTATE(W,STMagitekBeamWeapon)=2` — and, since F244.3e, `d:energyWeaponry`'s;
      // `rocketry` is the Blackpowder source's.
      energyBeamWeapons: research('energyBeamWeapons'),
      rocketry: research('rocketry'),
      // The three research states F244.3e's steps take, each the state alone for the reason
      // `xenoveterinary` above is: the rest of every one of those blocks' gates is a record read
      // the step itself makes at its own rank.
      //
      // `temporalEngineering` is `training:temporalDrive`'s `SPELLSTATE(W,STMagitekAntiGravityDrive)=2`
      // (`CreateUnit.CAS!HASEVILPRESENCE!+74 "IF (SPELLSTATE(W,STMagitekAntiGravityDrive)=2) THEN {"`). Its Power Engine term is not here: the overland
      // entrance spells it `IF (GETENCHANTMENTFLAG(U,EncPowerEngine,1)>0)`
      // (`OverlandEndTurn.CAS!NOANTIGRAVITY!-8 "IF (GETENCHANTMENTFLAG(U,EncPowerEngine,1)>0) THEN {"`), a permanent-record read the step makes off
      // `u.powerEngine` — the flag `training:powerEngine` wrote one rank earlier, exactly as
      // `training:magitekScience` reads `u.armorclad` (F244.3d).
      // `psychoConverter` and `pneumaReactor` are `d:psychoForce`'s and `d:pneumaField`'s
      // `SPELLSTATE(W,STMagitekPsycheForceConverter)=2` and `SPELLSTATE(W,STMagitekPneumaReactor)=2`.
      temporalEngineering: research('temporalEngineering'),
      psychoConverter: research('psychoConverter'),
      pneumaReactor: research('pneumaReactor'),
      // The one term of the `!COMBATOVERRIDE!` Outlander-soldier gate that no record field can
      // answer: wizard ownership. The other three are record reads the three region-`d` steps
      // make through `outlanderCombatSoldierAt` below — the permanent Fantastic flag included,
      // since F262.
      combatSoldierOwned: outlanderWizard,
    },
  };
}

// The permanent record, for the reform predicates below. `a:baseCopy` publishes it and every step
// that asks one of them is region `b` or later, so a missing copy is a composition defect rather
// than a rank a caller can legitimately ask from (`CLAUDE.md`, *Architecture*: fail-loud on
// out-of-range values).
function outlanderBaseRecord(runCtx) {
  if (!runCtx || !runCtx.base) {
    throw new Error(
      'deriveOutlanderReformRecord: an Outlander reform gate asked for the permanent record '
      + 'before a:baseCopy published it. Every step these gates serve is region `b` or '
      + 'later; a `training`-phase or earlier caller is a positioning defect.');
  }
  return runCtx.base;
}

function outlanderBaseFantastic(runCtx) {
  return !!outlanderBaseRecord(runCtx).fantastic;
}

// The `NOTSAPIENS` tail's gate, at the rank of the step asking:
// `BASEFANTASTIC(U)>0 %AND (GETSTAT(U,SMultiLabel,1)<>14)` (`UnitCalcPre.CAS!NOMAGITEKENGINE!+2..+4 "IF (BASEFANTASTIC(U)>0)" "THEN { GOTO"`).
// **Both terms are the permanent record at that rank (F263).** Selector 1 is "the base unit"
// (`Reference docs/Script source/CAS reference/Scripts.TXT:270`), so `GETSTAT(U,SMultiLabel,1)`
// reads the same record `BASEFANTASTIC(U)` does; `sapiens` is the record field standing for label
// 14, seeded by the `sapiens` control and written by `buffs:spiritLink:sapiens`. Until F263 the
// label had no record slot and travelled as a pre-sequence `sapiensLabelled` term instead.
// Six region-`b` steps ask: `b:bombsGrenades`, `b:outlanderBallisticsTraining`,
// `b:outlanderXenopsychology`, `b:outlanderRadio`, and — through `explosiveEligibleAt`
// (`stats.js`) — `b:upgradedExplosive:ranged` and `b:upgradedExplosive:fireBreath` (F262).
function outlanderSapiensAt(runCtx, reform) {
  const base = outlanderBaseRecord(runCtx);
  return !!reform.sapiensOwned && (!base.fantastic || !!base.sapiens);
}

// Battle Armor's own gate, at the rank of `b:battleArmor`:
// `UnitCalcPre.CAS!NOTSAPIENS!+2 "IF (BASEFANTASTIC(U)>0) THEN { GOTO"` closes the whole tail on
// `BASEFANTASTIC(U)>0`, read here off the permanent record the copy published (F262); the rest of
// the test is `battleArmorEligible`.
function outlanderBattleArmorAt(runCtx, reform) {
  return !!reform.battleArmorEligible && !outlanderBaseFantastic(runCtx);
}

// The `!COMBATOVERRIDE!` Outlander-soldier gate, at the rank of the step asking:
// `UnitCalc.CAS!COMBATOVERRIDE!+5..+7 "IF (GETENCHANTMENTFLAG(U,EncArmorClad,0)=0)" "NOTOUTLANDERSOLDIER"` evaluates left-to-right, so non-fantastic
// non-mechanical units, heroes, and Armorclad mechanical units pass; fantastic units do not.
// Three of its four terms are record reads — `GETENCHANTMENTFLAG(U,EncArmorClad,0)`,
// `GetStat(U,SCustomAttribute,1)` and `BASEFANTASTIC(U)` — and by region `d` the record carries
// all three: `training:armorclad` wrote the first, `buffs:rebuild` the second and `a:baseCopy`
// published the third, at the ranks their own blocks make them. Until F244.3e the first two were
// pre-sequence constants and until F262 the third was; each move positioned the read without
// moving the answer.
function outlanderCombatSoldierAt(u, runCtx, reform) {
  return !!reform.combatSoldierOwned
    && !outlanderBaseFantastic(runCtx)
    && (!u.mechanical || !!u.armorclad);
}

// Hierophany's calculated ability writes run with its Defense write and remove both movement
// flags consumed by FirewallEffect, in addition to the modeled combat immunities.
// STAT-FORMULA[hierophanyAbilityStrip]
// PROVENANCE[hierophanyAbilityStrip]: VERIFIED versions=com2_warlord_1.5.12.9; sources=Reference docs/Script source/Warlord 1.5.12.9/UnitCalc.CAS@span:23:cffe3872cfdacaf6f0361e5a
function applyHierophanyAbilityStrip(combatAbilities, isWarlord) {
  if (!isWarlord || !combatAbilities.hierophany) return combatAbilities;
  return {
    ...combatAbilities,
    weaponImmunity: false,
    missileImmunity: false,
    magicImmunity: false,
    deathImmunity: false,
    fireImmunity: false,
    coldImmunity: false,
    illusionImmunity: false,
    poisonImmunity: false,
    stoningImmunity: false,
    lightningResist: false,
    negateFirstStrike: false,
    merging: false,
    teleporting: false,
  };
}
