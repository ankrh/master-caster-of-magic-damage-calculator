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
];

// Absent and `none` both state "no special unit"; anything else must name a defined key. A key
// this build does not define is out of range and halts (`SPEC.md`, *Out-of-range values stop the
// run*): every consumer is an equality test against one of the four keys, so carrying an unknown
// one derives an ordinary unit and reports nothing — exactly the silent inertness the rule
// forbids. Whether a *defined* key is allowed in the selected version is the separate question of
// version scope, and still clamps (`specialUnitAllowed`, `ui_units.js`).
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

function createUnitIdentity(values = {}) {
  const integerOrNull = value => Number.isInteger(value) ? value : null;
  const version = typeof values.version === 'string' && values.version ? values.version : null;
  return {
    version,
    templateId: integerOrNull(values.templateId),
    heroTypeId: integerOrNull(values.heroTypeId),
    isHero: !!values.isHero,
    baseRace: typeof values.baseRace === 'string' ? values.baseRace : '',
    baseFantastic: !!values.baseFantastic,
    specialUnit: specialUnitDef(values.specialUnit,
      `Unit identity for ${version || 'an unstated version'}`) ? values.specialUnit : 'none',
  };
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
function specialUnitForRoster(version, unit) {
  const templateId = unit && unit.templateId;
  if (version && version.startsWith('com2_')) {
    if (templateId === 81) return 'golem';
    if (templateId === 34) return 'chosen';
  }
  if (version === 'com_6.08') {
    if (templateId === 81) return 'golem';
    if (templateId === 174) return 'zombies';
    if (templateId === 37) return 'catapult';
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
function legacyUnitTypeFromIdentity(identity) {
  if (!identity || !identity.baseFantastic) return identity && identity.isHero ? 'hero' : 'normal';
  const realm = {
    Life: 'life', Death: 'death', Chaos: 'chaos', Nature: 'nature',
    Sorcery: 'sorcery', Arcane: 'arcane', 'No Heal': 'unaligned',
  }[identity.baseRace] || 'arcane';
  return 'fantastic_' + realm;
}

function legacyBaseRace(input) {
  if (typeof input.race === 'string' && input.race) return input.race;
  const match = /^fantastic_(life|death|chaos|nature|sorcery|arcane)$/.exec(input.unitType || '');
  return match ? match[1][0].toUpperCase() + match[1].slice(1) : '';
}

function initializeUnitIdentity(input) {
  const supplied = input.identity;
  const base = supplied
    ? createUnitIdentity({ ...supplied, version: input.version || supplied.version })
    : createCustomUnitIdentity(input.version, {
        // Legacy callers can still provide unitType while the UI migrates to independent
        // identity controls. It is translated only at this boundary.
        isHero: input.unitType === 'hero',
        baseRace: legacyBaseRace(input),
        baseFantastic: String(input.unitType || '').startsWith('fantastic_'),
      });
  return {
    ...base,
    // These are deliberately copied values, not aliases to a base sub-record. Each
    // deriveUnitStats invocation receives a new mutable calculated identity.
    race: base.baseRace,
    fantastic: base.baseFantastic,
  };
}

function legacyUnitTypeFromLiveIdentity(identity) {
  if (!identity) return 'normal';
  if (identity.isHero && !identity.fantastic) return 'hero';
  const realm = {
    Life: 'life', Death: 'death', Chaos: 'chaos', Nature: 'nature',
    Sorcery: 'sorcery', Arcane: 'arcane', 'No Heal': 'unaligned',
  }[identity.race];
  if (!identity.fantastic) return realm ? 'normal_' + realm : 'normal';
  return 'fantastic_' + (realm || 'arcane');   // Fantastic + a mundane race: BACKLOG Q28
}

// Whether this unit is the combat-summoned Construct Catapult, which both `base:constructCatapult`
// and `a:constructCatapult` gate on and which `deriveUnitStats` reads separately for CoM 1's
// weapon-quality patch. One predicate, so the conversion and the patch cannot disagree.
function isConstructCatapultUnit(identity, abilities, version, meta = {}) {
  const sourceTemplateId = identity.templateId;
  const isCoM1 = version === 'com_6.08';
  const isBaseCoM2 = !!(version && version.startsWith('com2_')
    && !version.startsWith('com2_warlord'));
  return !!(!!(abilities && abilities.combatSummoned)
    && !meta.isHero
    && ((isBaseCoM2 && sourceTemplateId === 37)
      || (isCoM1 && (sourceTemplateId === 37 || identity.specialUnit === 'catapult'))));
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
// and no step here writes anything else.** That is what lets `targetingIdentity` below run the
// conversions out without running the stat sequence, which two cast-time targeting predicates
// need (F183, F188). It is the reason five conversions still carry a `:race` qualifier where the
// engine block also writes a stat, and `SPEC.md`, *Deliberate deviations*, records it as such.
// Three of the five are separately gated anyway, so only two are a grouping the evidence would
// merge: `b:fieryFury:race` is the THEN arm of the one `IF (BASEFANTASTIC(U))` whose ELSE arm is
// `b:fieryFury`; the Chaos Channels breath block writes its realm whenever the mutation is
// present while the calculator's strength half additionally asks whether a channel slot is free;
// and `c:mysticSurge:race` is the *separate* No Heal normalization block at $005A0420, gated on
// `U.CombatEnchantmentFlags[EncNoHeal]` rather than on `EncMysticSurge`, which Raise Dead reaches
// too. `c:chaosChannels:armor:race` ($0059F4A3, 0x8F6FE) and `c:blackChannels:race` (0x8F4A1) are
// the two the address map puts inside their stat block, and each is chain-adjacent to it.
function identityConversionSteps(identity, abilities, version, meta = {}) {
  const sourceTemplateId = identity.templateId;
  const isCoM1 = version === 'com_6.08';
  const isModern = version && version.startsWith('com2_');
  const isBaseCoM2 = isModern && !version.startsWith('com2_warlord');
  const combatSummonedValue = !!(abilities && abilities.combatSummoned);
  const isConstructCatapult = isConstructCatapultUnit(identity, abilities, version, meta);
  const isCoM1SummonBranch = isCoM1 && combatSummonedValue && !isConstructCatapult;
  // Call to Arms is the only shipped base-CoM2 combat summon for Paladins. Infer that spell
  // result from the retained Paladins template (STypeID 113) plus Combat Summoned; display names
  // and custom units do not establish the identity. The spell itself is sourced on
  // PROVENANCE[callToArmsPaladins] below, which lies outside this block's anchor window.
  const isCallToArmsPaladins = !!(isBaseCoM2
    && combatSummonedValue
    && sourceTemplateId === 113);
  // Fiery Fury and Sanctify read the permanent record, not the running one: `BASEFANTASTIC(U)`
  // and `ISHERO(U)` are base-record predicates in UnitCalcPre.CAS. `BASEFANTASTIC(U)` is the base
  // unit data "before applying continuous effects such as buffs or curses"
  // (`Reference docs/Script source/CAS reference/Scripts.TXT:286`) — the record the `base` phase
  // leaves, so `base:destiny`'s `B.Fantastic := True` ($0059A390) is in it, and the unit's own
  // training-time flag is not the whole of it (F192).
  const permanentFantastic = !!identity.baseFantastic
    || destinyActiveForUnit(abilities, version);
  const isHero = typeof meta.isHero === 'boolean' ? meta.isHero : !!identity.isHero;
  // One predicate for Spirit Link's two conversions: both blocks gate on the same
  // `GetEnchantmentFlag(U,EncSpiritLink,1)`, and neither tests the unit's realm or Fantastic
  // state, so the pair is a set/clear of one flag rather than two separately conditioned writes.
  const spiritLinkActive = !!(version && version.startsWith('com2_warlord'))
    && !!(abilities && abilities.spiritLink);

  return [
    // Destiny's identity write is a **permanent**-record write, which is why it is a `base` step
    // and not a region-`c` one beside the calculated package `c:destiny` carries. The block at
    // $0059A35E..$0059A633 runs `B.race := 19; B.Fantastic := True;
    // B.attackflags.supernatural := True; B.experience := 0; B.level := 1` and only then the six
    // `U.*` multipliers, so the realm and Fantastic survive into `BaseUnits` and every later
    // recalculation seeds its calculated record from them. The calculator derives the landed
    // steady state (`SPEC.md`, *Deliberate deviations*), so the permanent write stands before the
    // pipeline. That is what retires the separate `destinyActive` term the loadout and level
    // gates used to carry: the record the base phase leaves is exactly what
    // `if B.Fantastic then U.level := 1` ($0059A118) and the weapon block's
    // `not B.Fantastic and not B.ishero` ($0059E2B8) read (F163). It is chained after the
    // `CreateUnit.CAS` training-time base steps, which state the record as the unit was built.
    // Both halves share `PROVENANCE[destiny]`, cited at `c:destiny` (`stats_sequence.js`): one
    // span, $0059A35E..$0059A633, carries the permanent writes and the calculated package alike.
    // `B.attackflags.supernatural := True` at $0059A3EB is the third permanent write of that same
    // block, and it is `base:destiny:supernatural` (`stats_sequence.js`) rather than a field of
    // this step: a conversion that wrote a third field would cost `targetingIdentity` its
    // exactness, which is the deviation *An identity conversion is its own step even where its
    // engine block also writes a stat* already records for Chaos Channels and Black Channels. The
    // two entries are chain-adjacent, so no number can depend on the split (F201).
    statStep({ id: 'destiny', sourceLabel: 'Destiny', phase: 'base',
      writes: ['race', 'fantastic'],
      when: () => destinyActiveForUnit(abilities, version),
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // No `base:zombies` step. CoM 1's Zombies are Fantastic because the unit-type table says so —
    // `COM1_UT_ZOMBIES_ABILITIES` is `UA_FANTASTIC | UA_CREATE_UNDEAD`, raw `0x0081` at file
    // `com1:0x2AED2`, which construction copies wholesale. That is template data, and
    // `units_com.js` already carries it as `baseFantastic` on templateId 174. A step re-asserting
    // it was a no-op for every roster unit, and for a custom unit it let the special-unit selector
    // override the Fantastic control the user had set. The roster owns the fact (F203).
    // PROVENANCE[constructCatapult]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:33:d95c9aa843da2010e42b8f16 | Reference docs/Caster binary/Spells.CombatSummonUnit.pas@span:21:1650fe50059f7cde525a29fd | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:13:22d4847c5bd5843526ea3fc0 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:14:0c00ef951862849e15604add | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:18:0dad2f766ea1e74b0aa62aa1
    statStep({ id: 'constructCatapult', phase: 'base', writes: ['race', 'fantastic'],
      when: () => isCoM1 && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // PROVENANCE[summonBranch]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:33:d95c9aa843da2010e42b8f16
    statStep({ id: 'summonBranch', phase: 'base', writes: ['race', 'fantastic'],
      when: () => isCoM1SummonBranch,
      apply: u => {
        if (sourceTemplateId === 113) u.race = 'Life';
        if (sourceTemplateId === 54) u.race = 'Nature';
        u.fantastic = true;
      } }),
    // PROVENANCE[combatSummoned]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:3:8b5b382b46651d5d1ddfb014
    statStep({ id: 'combatSummoned', phase: 'a', writes: ['fantastic'],
      when: () => isModern && combatSummonedValue,
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[chosen]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:c9d9c1b29c14707318605a05 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:f9fdc8e8e8cb9c94edf0f936 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:f9fdc8e8e8cb9c94edf0f936
    statStep({ id: 'chosen', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isModern && identity.specialUnit === 'chosen',
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    statStep({ id: 'constructCatapult', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isBaseCoM2 && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // PROVENANCE[callToArmsPaladins]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Spells.CombatSummonUnit.pas@span:21:1650fe50059f7cde525a29fd | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:13:fff6a55971377c87264d2e0d | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:13:5f2ec3d006ad08bc02189c7b
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
    // PROVENANCE[chaosChannels:fireBreath:race]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:b9b73d98478711f2be56c0a9 | Reference docs/DOS reconstructed/unitcalc.c@span:7:8ee2be8fe3596d5bdc7acc0a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:c39e26f9ccd713b815403313
    ...['a', 'c'].map(phase => statStep({
      id: 'chaosChannels:fireBreath:race', sourceId: 'chaosChannels:fireBreath',
      sourceLabel: 'Chaos Channels', phase, writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccFireBreath', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } })),
    // Spirit Link's first write, and the head of region `b`: `SETSTAT(U,AFantastic,0,1)` at
    // `UnitCalcPre.CAS:30`, record selector `0` — the calculated record — with no test of the
    // unit's own Fantastic state above it. The region-`d` `spiritLink` step below clears the same
    // field, so the two are a fixed point only at the end of the derivation; every read between
    // them takes a Fantastic unit. Both share `PROVENANCE[spiritLink]`, cited at that step.
    statStep({ id: 'spiritLink', phase: 'b', writes: ['fantastic'],
      when: () => spiritLinkActive,
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[marionetteChanneler]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913
    statStep({ id: 'marionetteChanneler', phase: 'b', writes: ['fantastic'],
      when: () => version === MARIONETTE_VERSION
        && identity.heroTypeId === MARIONETTE_HERO_TYPE_ID
        && !!(abilities && abilities.channeler),
      apply: u => { u.fantastic = true; } }),
    // The THEN arm of Fiery Fury's one `IF (BASEFANTASTIC(U))`; `b:fieryFury` is its ELSE arm.
    // PROVENANCE[fieryFury:race]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:17:e0211f9ae323b4ad5ba16aa7
    statStep({ id: 'fieryFury:race', sourceId: 'fieryFury', sourceLabel: 'Fiery Fury',
      phase: 'b', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'fieryFury') && permanentFantastic,
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // Sanctify writes the Life realm unconditionally; its separate Fantastic write is gated on
    // a non-hero clergy unit. Two writes, not the three-branch compact-token approximation the
    // realm-less `hero` token used to force.
    //
    // The `sanctify` gate is the one grantable-ability read F202 left standing that a positioned
    // grant really can move, and it cannot move under F202 alone. Sancta Basilica's block writes
    // `SETSTAT(U,SResist,1,+3)` and then `SETENCHANTMENTFLAG(U,EncSanctify,ABase,1)` in two of its
    // four `STypeID` branches (`CreateUnit.CAS:414-419`), so unlike the flag-only permanent grants
    // — Lava Smelter's, Heat Power Engine's, Anti-Gravity Drive's, Military Drilling's, each of
    // which earns no step (`SPEC.md`, *Phases*) — this one carries a stat delta and is already
    // `base:sanctaBasilica`. F200 stage 3 widens that step onto these branches, at which point the
    // flag is a positioned write and this gate must read the record. What blocks doing it here is
    // `targetingIdentity` below: it replays the conversion list alone on a scratch record and does
    // not run `base:sanctaBasilica`, so a record read would make the projection disagree with the
    // sequence exactly when the building grants the flag. Seeding the scratch record from the
    // ability set does not close that gap — the sequence's value would be the seed *plus* the
    // positioned write. The choice between widening the projection to replay the `base` grants and
    // keeping the gate pre-sequence belongs to F200 stage 3, which makes the write.
    // PROVENANCE[sanctify]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:e23e1931b3ccaf4ea86bae2e
    statStep({ id: 'sanctify', sourceLabel: 'Sanctify', phase: 'b',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'sanctify'),
      apply: u => {
        u.race = 'Life';
        if (hasAbil(abilities, 'clergy') && !isHero) u.fantastic = true;
      } }),
    // PROVENANCE[chaosChannels:flight]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:2ae7951f1bbf4272fb3fb151 | Reference docs/DOS reconstructed/unitcalc.c@span:6:e09942f2ee9f377d85168241 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:11:81ed5af7fe4aa5e7b8bcf958
    statStep({ id: 'chaosChannels:flight',
      sourceLabel: 'Chaos Channels', phase: 'c', writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccFlight', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // PROVENANCE[chaosChannels:armor:race]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:7:bd2b6b86ac7fbcc85505a039 | Reference docs/DOS reconstructed/unitcalc.c@span:6:2202b972a2c87abe05bad467 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:490bf1c3cfe8b5827cde324a
    statStep({ id: 'chaosChannels:armor:race', sourceId: 'chaosChannels:armor',
      sourceLabel: 'Chaos Channels', phase: 'c', writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccDefense', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // Warlord is out of scope rather than gated: `UnitCalc.CAS` recasts the spell as Frenzy and
    // sets `EncBloodLust` only afterwards, so the compiled region-`c` block never sees the flag.
    // PROVENANCE[bloodLust]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:7:43a34010d4b8c511782d0586 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:13:ef98ab4f1bd2277cbd5fb59a | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:10:22628deef93aef7a52582f1a
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
    // PROVENANCE[undead]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:e9bb34d05b36853748045d37 | Reference docs/DOS reconstructed/unitcalc.c@span:8:204c1ca5e5884733de92e687 | Reference docs/DOS reconstructed/unitcalc.c@span:19:6f6aeaf7cbc23a280cd7996e | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:b7e9d476a7f9ec33bbaca56c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:53a2c4bd769924b58f286c8d
    statStep({ id: 'undead', sourceLabel: 'Undead', phase: 'c', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'undead') || hasAbil(abilities, 'animated'),
      apply: u => { u.race = 'Death'; u.fantastic = true; } }),
    // The No Heal normalization block, $005A0420..$005A04A9 — `if U.CombatEnchantmentFlags`
    // `[EncNoHeal] then U.race := 21; U.Fantastic := True`, immediately after the Mystic Surge
    // block that derives the flag. A separate block with a separate gate, so a separate step.
    // PROVENANCE[mysticSurge:race]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:8:185c85844cf35c344b38d022 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:23:662a6a49c604798625ed7e49
    statStep({ id: 'mysticSurge:race', sourceId: 'mysticSurge', sourceLabel: 'Mystic Surge',
      phase: 'c', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'mysticSurge'),
      apply: u => { u.race = 'No Heal'; u.fantastic = true; } }),
    // PROVENANCE[raiseDead]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:38:1261faf60c16514c7ab3e276 | Reference docs/Caster binary/Spells.InitializeCombatSpellcasting.pas@span:28:deb5b65ff17f3f2812792a90
    statStep({ id: 'raiseDead', sourceLabel: 'Raise Dead', phase: 'c',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'raiseDead'),
      apply: u => { u.race = 'No Heal'; u.fantastic = true; } }),
    // Spirit Link's second write, clearing what `b:spiritLink` asserted.
    // PROVENANCE[spiritLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:344debdbb9d0f10a4e4b26a1 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:1:15d81b9f3b72c934c9219502 | Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS@span:10:33b04c988e4846d5dfe6cfbd
    statStep({ id: 'spiritLink', phase: 'd', writes: ['fantastic'],
      when: () => spiritLinkActive,
      apply: u => { u.fantastic = false; } }),
  ];
}

// The identity this recalculation *leaves*, which is what a **cast-time targeting** predicate is
// evaluated against — not a term of any block, so it has no chain position of its own (F183,
// F188). Spirit Link is the citation and states the mechanism outright: it asserts Fantastic at
// the head of the routine so the unit takes fantastic bonuses (`UnitCalcPre.CAS:25-28`) and
// clears it at the tail so the "enchanted fantastic unit could not be targeted by fantastic-only
// spell" (`UnitCalc.CAS:1305-1306`). The engine manipulates the recalculated flag *in order to*
// change targetability, so the answer is the whole conversion list run out.
//
// This is a projection of the one conversion list, not a second list, and it is exact: no
// conversion's gate reads a stat, so running the conversions alone leaves the same `race` and
// `fantastic` the full sequence does. The calculator has no previous recalculation to read, so
// the record this derivation leaves stands in for the one the cast was made against.
function targetingIdentity(identity, abilities, version, meta = {}) {
  const live = { ...identity, race: identity.baseRace, fantastic: identity.baseFantastic };
  const steps = filterStepsToVersionScope(
    identityConversionSteps(identity, abilities, version, meta), version);
  runStatSteps(orderStatStepsBySource(steps, statChain(version)), live,
    { version, base: identity });
  return live;
}

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
// Two further exclusions closed F202 rather than adding a field (stage 2). A key whose grant is a
// **permanent write carrying no stat delta** earns no step at all (`SPEC.md`, *Phases*), so no
// step can ever move it and a field would restate a constant: that is `fieryBlade`'s Lava Smelter
// grant, `powerEngine`'s, `flying`'s and `discipline`'s, each ruled at its own read in `stats.js`.
// (`fieryBlade` keeps the field it took in stage 1 — `c:metalFires` reads it off the record — but
// nothing writes it and nothing will.) And a key whose only readers are **result** fields, the
// weapon material among them, has nowhere to take a rank: `SPEC.md`, *The step model*, gives the
// finished record to those, and `artificerMagicWeapon` and Metal Fires' upgrade already do.
const POSITIONED_GRANT_FIELDS = [
  'lucky',        // applySanctaBasilicaGrant, applyPillarOfFaithGrant,
                  // deriveMarionettePackage, `b:divineProtection`  ->  `c:lucky`
  'fieryBlade',   // applyLavaSmelterGrant  ->  `c:metalFires`'s non-stacking gate
  'armorclad',    // applyOutlanderReformGrants  ->  `base:armorclad`
  'mechanical',   // `base:rebuild` / `b:rebuild`  ->  `base:artificer`, `d:mechanicalExpert`
  'rebuild',      // deriveMarionettePackage  ->  `base:rebuild` / `b:rebuild`
  'trueSight',    // `b:eyeOfHeaven`  ->  `c:trueSight`, `d:trueSight`
  'fireImmunity',    // `b:insulation`, deriveMarionettePackage  ->  `c:innerPower`
  'lightningResist', // `b:insulation`, deriveMarionettePackage  ->  `c:innerPower`
  'psychoForce',  // applyOutlanderReformGrants  ->  `d:psychoForce`
  'pneumaField',  // applyOutlanderReformGrants  ->  `d:pneumaField`
  'illusion',     // deriveMarionettePackage  ->  the Illusion malus inside `b:trueLight`
];

// The ability keys a **positioned grant step** writes. Each is a record field seeded from the
// pre-grant ability set, written at the rank its own engine block has, and read back into the
// published ability set after the chain — the shape F199 gave the ten curse flags, one layer out
// (F200). `POSITIONED_GRANT_FIELDS` above is the read side of the same move: a key some step
// gates on. A key here is one no hoist writes any more, so the record is its only carrier and the
// post-chain read-back is what hands it to combat resolution.
//
// Five keys are in both lists, because a positioned write of theirs also has a positioned reader:
// `lucky` (`b:divineProtection` writes it, `c:lucky` reads it, and combat resolution reads the
// finished value — `combat_phases.js`, MoM 1.31's enemy melee penalty), `trueSight`
// (`b:eyeOfHeaven` writes it, `c:trueSight` and `d:trueSight` read it), `fireImmunity` and
// `lightningResist` (`b:insulation` writes them, `c:innerPower`'s eligibility test reads them),
// and `mechanical` (`base:rebuild` / `b:rebuild` write it, `base:artificer` and
// `d:mechanicalExpert` read it — and take opposite answers, because the writes are cast-time and
// the retort's read is training-time, F208).
const POSITIONED_GRANT_WRITES = [
  'largeShield',      // `b:magitekEngine`, `d:rust` (clear), `d:fortification`
  'missileImmunity',  // `d:fortification`'s already-shielded arm
  'deathImmunity',    // `b:divineProtection`
  'lucky',            // `b:divineProtection`
  'rage',             // `base:altarOfTheMoon`
  'poisonImmunity',   // `base:altarOfTheMoon`, `d:venom`
  'blackpowder',      // `base:militaryWorkshop`
  'armorPiercing',    // `base:militaryWorkshop`, `d:blazeOfGlory`
  'energyCannon',     // `base:energyCannon`
  'wallCrusher',      // `b:bombsGrenades`
  'firstStrike',      // `d:blazeOfGlory` (clear)
  'mechanical',       // `base:rebuild` / `b:rebuild` — `SETSTAT(…,SCustomAttribute,…,1)`
  'supernatural',     // `base:destiny:supernatural` — `B.attackflags.supernatural := True`
  'trueSight',        // `b:eyeOfHeaven`
  'illusionImmunity', // `c:trueSight`
  'fireImmunity',     // `b:insulation`
  'lightningResist',  // `b:insulation`
  'coldImmunity',     // `b:insulation`
];

// The same move for the two ability fields that carry a **value** rather than a flag. They are
// seeded verbatim instead of through `!!`, and read back on the same rule, so an absent key stays
// absent. `poison` is written by four positioned steps in a row — `base:altarOfTheMoon`'s two
// `STypeID` branches assign it, then `base:militaryWorkshop`, `base:motherFungus` and `d:venom`
// each make the script's `<>100` increment — and the chain is what orders them; the merge that
// used to do this restated their precedence by hand and lost one increment (F201). `lifeSteal` is
// written by `base:altarOfTheMoon`'s Witchdoctor branch and by `d:pneumaField`.
const POSITIONED_GRANT_VALUE_WRITES = ['poison', 'lifeSteal'];

// Lava Smelter (Warlord): five independent flags record the permanent mineral-pair grants already
// carried by the unit. New Dwarf units receive them when trained; Upgrade & Retrain can apply
// them later to any existing non-fantastic unit. Returns the ability set with every grant merged
// in (a new object), or the original set unchanged when it does not apply. The grant is still
// merged up-front because one reader has no position to take it at: `hasWarlordBlade`
// (`stats.js`) turns the Fiery Blade flag into the magic-weapon upgrade and the +2 blade bonus,
// and the upgrade is a **result** field rather than a record field, computed well before the
// sequence is built. `c:metalFires`'s non-stacking gate, the other reader, already takes it off
// the record (`fieryBlade` in `POSITIONED_GRANT_FIELDS` above, F202). The Wall-of-Fire siege
// effect is not modelled here (it has its own global toggle). Each grant is sourced on its own
// PROVENANCE[lavaSmelter:*] anchor further down this function, outside this block's window.
function applyLavaSmelterGrant(abilities, version, unitType) {
  if (!version || !version.startsWith('com2_warlord') || (unitType || '').startsWith('fantastic_')) return abilities;
  // The legacy selector branches keep old presets/share payloads readable; new UI state uses
  // the five independent booleans and can therefore carry every applicable pair simultaneously.
  const legacy = abilities.lavaSmelter || 'none';
  const weaponImmunity = !!abilities.lavaSmelterWeaponImmunity || legacy === 'weaponImmunity';
  const missileImmunity = !!abilities.lavaSmelterMissileImmunity || legacy === 'missileImmunity';
  const resistElements = !!abilities.lavaSmelterResistElements || legacy === 'resistElem';
  const elementalArmor = !!abilities.lavaSmelterElementalArmor || legacy === 'elementalArmor';
  const fieryBlade = !!abilities.lavaSmelterFieryBlade || legacy === 'flameBlade';
  if (!weaponImmunity && !missileImmunity && !resistElements && !elementalArmor && !fieryBlade) {
    return abilities;
  }
  const merged = { ...abilities };
  const grants = [
    weaponImmunity && 'weaponImmunity',
    missileImmunity && 'missileImmunity',
    resistElements && 'resistElements',
    elementalArmor && 'elementalArmor',
    fieryBlade && 'fieryBlade',
  ].filter(Boolean);
  for (const grant of grants) {
    switch (grant) {
      // STAT-FORMULA[lavaSmelter:weaponImmunity]
      // PROVENANCE[lavaSmelter:weaponImmunity]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:20:6b832639e6e0656624d526f2 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:5:19b52f5f80442e39e3d39683
      case 'weaponImmunity': merged.weaponImmunity = true; break;
      // STAT-FORMULA[lavaSmelter:missileImmunity]
      // PROVENANCE[lavaSmelter:missileImmunity]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:21:b4b1a5faba3c07399d273ecc | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:11:d560f73eb0a27ed8c05f0521
      case 'missileImmunity': merged.missileImmunity = true; break;
      // STAT-FORMULA[lavaSmelter:resistElementsAlias]
      // PROVENANCE[lavaSmelter:resistElementsAlias]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:23:d6475291cbd817aedb8be4d2 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:23:02ffaad30254a68cf55740f4 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:c5d736809b27903ec0e40f87 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:69075b87f644f18cbdb1c64a | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:e2dc42fafe0d325d0f39e42c | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:c99051561c61668cea94903d
      case 'resistElements': merged.resistElements = true; break;
      // STAT-FORMULA[lavaSmelter:elementalProtection]
      // PROVENANCE[lavaSmelter:elementalProtection]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:23:d6475291cbd817aedb8be4d2 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:23:02ffaad30254a68cf55740f4 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:95c224910389756ff6f69515 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:473b9eac9397f92d8022c2cd
      case 'elementalArmor': merged.elementalArmor = true; break;
      // STAT-FORMULA[lavaSmelter:flameBlade]
      // PROVENANCE[lavaSmelter:flameBlade]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:24:03c7f203c08a93035f9d5921 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:29:9803f0d614b7957485b50536
      case 'fieryBlade': merged.fieryBlade = true; break;
      // A grant added to the list above without a case here would be dropped in silence.
      default: throw new Error(
        `applyLavaSmelterGrant: '${grant}' is not one of weaponImmunity/missileImmunity/`
        + `resistElements/elementalArmor/fieryBlade.`);
    }
  }
  return merged;
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
// `Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS` lines 412-441 — the block
// PROVENANCE[sanctaBasilica] in stats_sequence.js cites for the +3 Resistance — writes the
// per-type grants in four *mutually exclusive* STypeID branches, each ending in
// `GOTO "ENDOFUNIQUEBUILDING"`: 108 (High Men Monks) and 231 (High Men Inquisitors) get
// Sanctify plus improved Exorcise, 111 (Crusaders) gets Lucky *only*, and 113 (Paladins) gets
// Magic Immunity *only*. Neither Crusaders nor Paladins receives Sanctify from this building.
// The code and this comment both say they do. `DisAbil.CAS` lines 1036-1046 does group all
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

// An immunity strips the curses it blocks. This is an **artificial calculator step**: no engine
// makes this write, because no engine ever has to. The immunity is enforced where the spell
// lands, so an immune unit simply never acquires the flag, and nothing later removes one it does
// carry (`RecalculateUnits` has six flag clears, none a curse and none gated on an immunity).
// The calculator has no cast order, so it assumes the immunity is the pre-existing one — innate,
// cast overland, or cast earlier in combat — which is the common case and the only one a single
// ability set can represent. `SPEC.md`, *Deliberate deviations*, states the assumption; the step
// is `base:immunityCurseGating`, at the head of every chain.
// Magic Immunity's half is the cited mechanism: both engine families make the target's
// resistance unreachable for any spell carrying a realm, so the roll cannot fail. Modern sets
// Result := 100 against a `Random(10) + 1` roll; DOS adds 30 against a d10.
// Illusion Immunity's half is assumed, not cited. Nothing in the reconstructed resolution path
// tests it against a curse — `GetEffectiveResistance` reads `magicimmunity` alone, and the only
// curse-facing Illusion Immunity test anywhere is `A32_ai_shatter_candidate` (`combat.c`, MoM
// 1.31), an AI *targeting* heuristic that declines the target rather than rejecting a cast. We
// assume the real gate lives in the UI's target validation and the AI code, neither of which is
// reconstructed — the Fandom page reports exactly that asymmetry from the player side, since the
// game refuses a Sorcery target that is Illusion-Immune while silently wasting mana on a
// Magic-Immune one. The PROVENANCE below is therefore the Magic Immunity mechanism only.
// Membership follows the engines' own rule, stated by `spells.ini`'s legend (line 620):
// "NonMagic - The spell is not blocked by Magic Immunity. (by default, spells are blocked by
// Magic Immunity)". Every listed curse's record lacks `NonMagic`, so the default blocks it.
// Hierophany carries the flag ([239]) and is excluded; its cast handler agrees — `COSpell.CAS`
// lines 400-413 roll Resistance with no Magic Immunity test — as does the Warlord 1.5.12.7 manual
// changelog, "Spell Hierophany now works properly against magic immunity".
// `nausea` is the one member the flag cannot reach: it is a `UnitCalcPre.CAS` effect with no spell
// record at all (0 occurrences in `spells.ini`), so its membership is inferred from the effect's
// shape rather than read.
// Do **not** reach for `ACCurse`/`ACGlobalEffect` to decide this. That block is AI weighting for
// strategic off-screen combat — "use these values to set the spells strength and type of effect"
// (`spells.ini` lines 244-256) — not a resolution mechanism, and it disagrees with the flag: Mind
// Storm and Temporal Twist carry no `ACCurse` yet are ordinary blocked curses.
// The exclusions are the effects that make no per-unit resistance roll, so nothing ever consults
// the immunity. Black Prayer and Eternal Night's Darkness are **combat globals, not unit
// enchantments**: every engine gates them on a side-indexed global rather than a flag on the unit
// — `inferred_CombatGlobals[3 - ownCG][CGBlackPrayer] > 0` and `inferred_CombatGlobals[...]
// [CGDarkness] > 0` (`Units.RecalculateUnits.pas`), `combat_enchantments[CE_BLACK_PRAYER_*]` and
// `[CE_DARKNESS_*]` (`unitcalc.c`). No flag is ever rolled onto the unit, which is also why their
// spell records carry no `NonMagic`: the flag governs a roll these effects never make. Their
// writes are `PROVENANCE[blackPrayer]` and `PROVENANCE[darkness]`. Mislead/Liability are absent
// for the same reason at one remove — the spell's own roll gates only the targeted unit, and the
// Misfortune/Jinx debuff then spreads to every normal unit in the army with no per-unit check.
const MAGIC_IMMUNITY_GATED_CURSES = [
  'weakness', 'blackSleep', 'shatter', 'vertigo',
  'warpAttack', 'warpDefense', 'warpResist', 'nausea', 'temporalTwist', 'mindStorm',
];
const ILLUSION_IMMUNITY_GATED_CURSES = ['mindStorm', 'vertigo'];
// `version` is read for the Eye of Heaven arm alone: that enchantment is Warlord's, granted by
// `Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS` lines 1839-1841 and named by
// no other supported source, so outside Warlord it must not confer the Illusion Immunity that
// strips Mind Storm and Vertigo here.
// PROVENANCE[immunityCurseGating]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:52d7a21af8d678318152f8fc | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:3:402d57bfe8325957749d4792 | Reference docs/DOS reconstructed/combat.c@span:4:1a301c9fa03a6936a7e8bf35 | Reference docs/DOS reconstructed/combat.c@span:10:e890804f95697a32ae069372
// The ten curse flags are fields of the sequence record, and this is the step that clears them —
// `base:immunityCurseGating`, the head of every chain. It reads the curse flags positionally, like
// any other step, and takes its **immunity** half from `finishedImmunities`, the set the
// recalculation leaves. That split is the ruling F199 implements: the step is artificial, so no
// source fixes its position relative to a grant that writes an immunity, and reading the finished
// set makes its answer independent of where such a grant lands (F164, and F166's stage (ii)).
// `finishedImmunities` is a declared cross-boundary read — the shape F163 gave `targetingIdentity`
// — and `tools/unit_checks/identity_record_choice.js` halts on an occurrence no row there claims.
function immunityCurseGatingStep(version, finishedImmunities) {
  return statStep({ id: 'immunityCurseGating', sourceLabel: 'Immunity', phase: 'base',
    writes: [...MAGIC_IMMUNITY_GATED_CURSES],
    when: u => immunityStrippedCurses(u, version, finishedImmunities).length > 0,
    apply: (u) => {
      for (const key of immunityStrippedCurses(u, version, finishedImmunities)) u[key] = false;
    } });
}

// One predicate for both the gate and the write, so the step cannot fire without stripping or
// strip a key it did not declare. Illusion Immunity reaches only its own two curses.
// `record` supplies the curse flags at the step's own position; `immunities` is the finished set.
function immunityStrippedCurses(record, version, immunities) {
  const eyeOfHeaven = !!(version && version.startsWith('com2_warlord') && immunities.eyeOfHeaven);
  const illusionImmune = !!(immunities.illusionImmunity || immunities.trueSight || eyeOfHeaven);
  const blocked = new Set();
  if (immunities.magicImmunity) for (const key of MAGIC_IMMUNITY_GATED_CURSES) blocked.add(key);
  if (illusionImmune) for (const key of ILLUSION_IMMUNITY_GATED_CURSES) blocked.add(key);
  return [...blocked].filter(key => record[key]);
}

// Divine Protection's grant is `b:divineProtection` (`stats_sequence.js`), a positioned write to
// the record's `deathImmunity` and `lucky` fields (F200).
// Lucky reaches a unit from several sources. These markers retain which stage established
// the flag, but the resulting stat package does not execute there: Caster.exe's compiled
// Lucky block reads the finished flag and writes Resistance/To Hit/To Defend in region c.
function markIntrinsicLucky(abilities) {
  return abilities && abilities.lucky ? { ...abilities, luckyPhaseA: true } : abilities;
}

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

const MARIONETTE_VERSION = 'com2_warlord_1.5.12.7';
const MARIONETTE_HERO_TYPE_ID = 48;
const MARIONETTE_REALMS = ['nature', 'sorcery', 'chaos', 'life', 'death'];
// The projectile retype the owned branch writes, by primary realm: ids 37, 34, 31, 35 and 33
// (`UnitCalcPre.CAS:104`, `:122`, `:140`, `:158`, `:176`). Every one of them is a
// `SETSTAT(U,SRangedType,0,…)` — record selector `0`, the calculated record — so this value is
// what the region-`b` step `b:marionette:rangedType` writes, not part of the permanent record.
// All five ids are `IsMagic=Yes` with nothing else the modern engine reads, so all five are the
// one modern token; the realm the script's arms select is a spell-flavour choice the engine
// attaches to the projectile nowhere (`SPEC.md`, *Deliberate deviations*).
const MARIONETTE_RANGED_TYPES = {
  nature: 'magic', sorcery: 'magic', chaos: 'magic', life: 'magic', death: 'magic',
};
// The ascension block's own second retype, for a Chaos primary alone: `SRangedType = 30`
// (`UnitCalcPre.CAS:272`), beside the Wall Crusher and Armor Piercing grants of the same three
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

// The package carries the branch's grants, its spell and charge metadata, and — for the owned
// branch alone — the realm retype value `b:marionette:rangedType` writes. It carries no permanent
// ranged type: the Wanderer's own is `UNITS.INI [362] RangedType=30`, read from the roster record.
// STAT-FORMULA[marionettePackage]
// PROVENANCE[marionettePackage]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:39:58a1f4eccd319a76072204a6 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:40:278fa1f3acca365b536cf823 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:19:55ebed8c65ed05b617bc2a17 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:37:2a33b53fd826bd83bed71132 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:40:53a8e746ffb95d09d43c6694 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:31:0485f6bca9517d221d1400be | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:31:8e93c3479df43f3aa01d74ab
function deriveMarionettePackage(identity, abilities, version) {
  if (version !== MARIONETTE_VERSION || identity.heroTypeId !== MARIONETTE_HERO_TYPE_ID) {
    return { abilities, package: null };
  }

  // A Wanderer recalculated without a Channeler owner takes the one-time strayed branch.
  // Its persistent, calculator-relevant grants are projected here even though Spell Lock
  // prevents the source from writing the same package again on later recalculations.
  if (!abilities.channeler) {
    const grantedAbilities = [
      'Transmute Equipment', 'Rebuild', 'Sage', 'Mechanical Master',
      'Ritual Master', 'Charmed', 'Arcane Ward', 'Spell Lock',
    ];
    return {
      abilities: {
        ...abilities,
        transmuteEquipment: true,
        rebuild: true,
        sage: 2,
        mechanicalMaster: 2,
        ritualMaster: 2,
        charmed: true,
        arcaneWard: 2,
        spellLock: true,
      },
      // The strayed branch writes no ranged type at all (`UnitCalcPre.CAS:364-392`), so the
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
  const grants = { ...abilities };
  const grantedAbilities = [];
  const grant = (key, label = key, value = true) => {
    grants[key] = value;
    grantedAbilities.push(label);
  };

  if (books.nature > 1) { grant('forester', 'Forester'); grant('mountaineer', 'Mountaineer'); }
  if (books.nature > 2) grant('poisonImmunity', 'Poison Immunity');
  if (books.nature > 4) grant('stoningImmunity', 'Stoning Immunity');
  if (books.sorcery > 1) grant('largeShield', 'Large Shield');
  if (books.sorcery > 2) grant('missileImmunity', 'Missile Immunity');
  if (books.sorcery > 4) grant('resistMagic', 'Resist Magic');
  if (books.chaos > 1) grant('firstStrike', 'First Strike');
  if (books.chaos > 2) grant('fireImmunity', 'Fire Immunity');
  if (books.chaos > 4) grant('lightningResist', 'Lightning Resist');
  if (books.life > 1) grant('healer', 'Healer');
  if (books.life > 2) grant('illusionImmunity', 'Illusion Immunity');
  if (books.life > 4) { grant('lucky', 'Lucky'); grants.luckyPhaseB = true; }
  if (books.death > 1) grant('coldImmunity', 'Cold Immunity');
  if (books.death > 2) grant('deathImmunity', 'Death Immunity');
  if (books.death > 4) grant('weaponImmunity', 'Weapon Immunity');

  if (ascended) {
    if (primary === 'nature') {
      grant('poison', 'Poison 10', 10);
      grant('stoningTouch', 'Stoning Touch -2', -2);
    } else if (primary === 'sorcery') {
      grant('counterImmunity', 'Counter Immunity');
      grant('illusion', 'Illusion');
    } else if (primary === 'chaos') {
      grant('wallCrusher', 'Wall Crusher');
      grant('armorPiercing', 'Armor Piercing');
    } else if (primary === 'life') {
      grant('exorcise', 'Exorcise -4', -4);
      grant('bless', 'Bless');
    } else if (primary === 'death') {
      grant('bloodSucker', 'Blood Sucker');
      grant('createUndead', 'Create Undead');
    }
    if (books.nature > 4) grant('regeneration', 'Regeneration +2', 2);
    if (books.sorcery > 4) grant('invisibility', 'Invisibility');
    if (books.chaos > 4) grant('destruction', 'Destruction 0', 0);
    if (books.life > 4) grant('healingAura', 'Healing Aura');
    if (books.death > 4) grant('lifeSteal', 'Life Steal -1', -1);
  }

  return {
    abilities: grants,
    package: {
      state: 'owned', primary, books, ascended, conjurer, baseSkill,
      attackBonus, defenseBonus,
      rangedType: MARIONETTE_RANGED_TYPES[primary],
      ascensionRangedType: ascended ? (MARIONETTE_ASCENSION_RANGED_TYPES[primary] || null) : null,
      spell, charges, grantedAbilities,
    },
  };
}

// Outlander controls expose the researched reform/building conditions, not their
// derived labels. Fold permanent unit upgrades in before curse gating so downstream
// mechanics see a single calculated state.
const DERIVED_OUTLANDER_STATE_KEYS = [
  'armorclad',
  'blackpowder',
  'bombsGrenades',
  'energyCannon',
  'energyCannonDestruction',
  'energyWeaponry',
  'pneumaField',
  'powerEngine',
  'psychoForce',
  'temporalGravityDrive',
  'upgradedExplosive',
];

// The reform block's eligibility gates, for the versions that have no Outlander reforms at all.
const NO_OUTLANDER_REFORM = Object.freeze({
  sapiensEligible: false, battleArmor: false, magitekEngine: false,
  ballisticsTraining: false, xenopsychology: false, radio: false, xenoveterinary: false,
});

// Returns the granted ability set **and** the block's eligibility record. Six of the states this
// used to derive were ability labels no engine flag stands behind — `EncBattleArmor` and
// `EncMagitek` occur nowhere in the 38 `.CAS` files — and each was only ever the `when` of a step
// the chain already has, so they are `reform` fields read by those predicates instead of keys
// merged into the unit's abilities (F198).
//
// Every `BASEFANTASTIC(U)` here is the **permanent** record: the base unit data "before applying
// continuous effects such as buffs or curses" (`Reference docs/Script source/CAS reference/
// Scripts.TXT:286`), which carries Destiny's `B.Fantastic := True` at $0059A390 (F192). The one
// live-Fantastic gate in the block is Xenoveterinary's `IF FANTASTIC(U)` (`UnitCalcPre.CAS:1040`),
// and that term is not here: it is the positional `when` of `b:outlanderXenoveterinary`.
function applyOutlanderReformGrants(abilities, version, permanentFantastic, isHero = false) {
  if (!version || !version.startsWith('com2_warlord')) {
    return { abilities, reform: NO_OUTLANDER_REFORM };
  }

  // These names are outputs, never accepted inputs. Besides keeping the UI to one
  // source of truth, stripping them here prevents stale saved state or a caller from
  // bypassing the reform/building prerequisites.
  const fundamentalAbilities = { ...abilities };
  for (const key of DERIVED_OUTLANDER_STATE_KEYS) delete fundamentalAbilities[key];

  const baseFantastic = !!permanentFantastic;
  const outlanderWizard = !!fundamentalAbilities.outlanderWizard;
  // All reform spell states are owned by Outlander wizards. Keep their raw controls in
  // the UI state, but remove them from the effective unit state when the owner is not
  // an Outlander so no downstream branch can accidentally consume one ungated.
  if (!outlanderWizard) {
    for (const key of [
      'armorcladReform', 'ballisticsTraining', 'energyBeamWeapons', 'explosive',
      'heatPowerEngine', 'magitekEngineering', 'magitekScience', 'militaryDrilling',
      'pneumaReactor', 'psychoConverter', 'radio', 'rocketry', 'temporalEngineering',
      'xenopsychology', 'xenoveterinary',
    ]) delete fundamentalAbilities[key];
  }
  // Rebuild permanently writes Mechanical for non-heroes. Its hero branch is
  // encounter-only and cannot receive overland Power Engine/Armorclad upgrades. Sourced on
  // PROVENANCE[rebuild] (combat_abilities.js) and PROVENANCE[rebuildEffectDerivation]
  // (combat_effects.js), both out of this block's anchor window.
  const permanentMechanical = !!fundamentalAbilities.mechanical
    || (!!fundamentalAbilities.rebuild && !isHero);
  const armorclad = outlanderWizard && !!fundamentalAbilities.armorcladReform && permanentMechanical;
  // `UnitCalcPre.CAS:1104` closes the whole tail on `BASEFANTASTIC(U)>0`, and the +3 branch at
  // `:1108-1114` restates it beside `EncArmorClad` index 1 and `SCustomAttribute` index 1 — three
  // permanent-record terms in one test.
  const battleArmor = outlanderWizard && !!fundamentalAbilities.armorcladReform
    && !baseFantastic && !permanentMechanical;
  const powerEngine = outlanderWizard && !!fundamentalAbilities.heatPowerEngine && permanentMechanical;
  // `UnitCalc.CAS:1405-1407` evaluates left-to-right: non-fantastic non-mechanical units,
  // heroes, and Armorclad mechanical units pass; fantastic units do not.
  const outlanderSoldier = outlanderWizard && !baseFantastic && (!permanentMechanical || armorclad);
  // The `NOTSAPIENS` gate, `UnitCalcPre.CAS:1062-1064`. `b:bombsGrenades` reads the same one.
  const sapiensEligible = outlanderWizard
    && (!baseFantastic || !!fundamentalAbilities.sapiens);
  const temporalDrive = powerEngine && !!fundamentalAbilities.temporalEngineering;
  const temporalGravityDrive = temporalDrive && !!fundamentalAbilities.sailing;
  // `UnitCalcPre.CAS:1051-1053`: the block's own gate is the *calculated* `EncPowerEngine` flag,
  // which no region-`b` write reaches before this point, so the derived permanent state answers it.
  const magitekEngine = powerEngine && !!fundamentalAbilities.magitekEngineering;
  // `OverlandEndTurn.CAS:446`, the fourth site of the same permanent-record term.
  const militaryDrilling = outlanderWizard && !baseFantastic && !!fundamentalAbilities.militaryDrilling;

  return {
    abilities: {
      ...fundamentalAbilities,
      ...(armorclad ? { armorclad: true } : {}),
      ...(powerEngine ? { powerEngine: true } : {}),
      // Large Shield is no longer granted here. It is the block's fourth write,
      // `SETSTAT(U,ALargeShield,0,1)` at `UnitCalcPre.CAS:1058`, inside the same reviewed span as
      // the To-Defend one, so it is a second field of `b:magitekEngine` and lands at that rank —
      // which is what lets the region-`d` Fortification block see it (F200).
      ...(temporalDrive ? { haste: true } : {}),
      ...(temporalGravityDrive
        ? { temporalGravityDrive: true, flying: true, illusionImmunity: true }
        : {}),
      ...(outlanderSoldier && fundamentalAbilities.energyBeamWeapons
        ? { energyWeaponry: true }
        : {}),
      ...(outlanderSoldier && fundamentalAbilities.psychoConverter
        ? { psychoForce: true }
        : {}),
      ...(outlanderSoldier && fundamentalAbilities.pneumaReactor
        ? { pneumaField: true }
        : {}),
      // Despite both prose sources naming Battle Armor, the executing scripts grant Resist
      // Magic only alongside the permanent EncArmorClad flag (CreateUnit.CAS:704-705 and
      // OverlandEndTurn.CAS:436-442). The transient +3 Battle Armor branch has no such grant.
      ...(outlanderWizard && fundamentalAbilities.magitekScience && armorclad
        ? { resistMagic: true }
        : {}),
      ...(militaryDrilling
        ? { discipline: fundamentalAbilities.discipline === 'combat' ? 'combat' : 'overland' }
        : {}),
    },
    reform: {
      sapiensEligible,
      battleArmor,
      magitekEngine,
      ballisticsTraining: sapiensEligible && !!fundamentalAbilities.ballisticsTraining,
      xenopsychology: sapiensEligible && !!fundamentalAbilities.xenopsychology,
      radio: sapiensEligible && !!fundamentalAbilities.radio,
      // The research state alone. `IF FANTASTIC(U)` (`UnitCalcPre.CAS:1040`) is the calculated
      // record at region `b`, so it is the step's own `when` and not a term here (F198).
      xenoveterinary: outlanderWizard && !!fundamentalAbilities.xenoveterinary,
    },
  };
}

// Hierophany's calculated ability writes run with its Defense write and remove both movement
// flags consumed by FirewallEffect, in addition to the modeled combat immunities.
// STAT-FORMULA[hierophanyAbilityStrip]
// PROVENANCE[hierophanyAbilityStrip]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:23:cffe3872cfdacaf6f0361e5a
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
