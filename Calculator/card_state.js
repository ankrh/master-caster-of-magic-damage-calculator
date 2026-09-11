// --- Card state and its projection into derivation input ---
//
// The card state is a plain object holding **what the controls hold**: one entry per control,
// keyed by the def's `uiKey`, with both engine families' fields present and nothing merged. It is
// deliberately not derivation input. `collectCardState` (`ui_card.js`) is the only place the DOM
// is read; everything in this file is pure and `data-scope="core"`, so one projection turns a card
// state into the object `deriveUnitStats` takes, whether that state came from the page's controls
// or was built without them.
//
// Version is not part of the state. It arrives with `globals`, so the same state projects under
// whichever version is asked for and the gating pass can take it as a parameter.
//
// The file holds three things: the projection, the version-gating pass, and the roster record's
// statement of a card (`applyRosterUnit`) — one per section, all of them state transforms the page
// routes its own writes through rather than restating beside them.
//
// Every symbol this file reads is `data-scope="core"`: `abilityUiDefs`, `MODERN_SPECIAL_FIELDS`
// and `modernAttackRecord` live in `ability_gating.js`, and the rest were already core. The
// projection therefore *loads and runs* in a headless core context, which `node_unit_checks.js`
// asserts by calling it for every version. It touches no DOM API of its own and never will.

// The enchantments whose control sits on one side's panel but whose effect the opposing side
// reads. They are the single place a side's derivation input depends on the other card, so they
// travel in `globals.perSide` — keyed by the side that owns them — rather than in either card's
// state, and the projection picks the enemy's entry.
const CROSS_SIDE_ENCHANTMENT_KEYS = ['eternalNight', 'eyeOfHeaven'];

// The battlefield-wide fields every projection needs. Named here so a globals object built
// without the page (F260.6) fails on the missing field rather than deriving a unit from
// `undefined`.
// `chaosConjunction` is here although `cardStateToDerivationInput` does not read it: it is a
// battlefield enchantment `resolveCombat` takes as an option (`combat.js`, `immolationStr`), and
// it was the one such enchantment this list omitted. The omission was not free — `collectGlobals`
// left it out, so `applyGlobalVersionGating` never gated it and a globals object built without the
// page could not state it at all (F260.6 review, finding 1). The page gated it anyway in
// `updateGlobalEnchantmentVisibility`, so nothing moved; what it cost was the guarantee.
const REQUIRED_GLOBAL_FIELDS = [
  'version', 'nodeAura', 'wallOfFire', 'trueLight', 'darkness', 'chaosSurge',
  'rangedCheck', 'rangedDist', 'warpReality', 'chaosConjunction', 'hurricane', 'poxHost',
];

// The card's own scalar controls, read by both engine families.
const REQUIRED_CARD_STATE_FIELDS = [
  'level', 'weapon', 'armor', 'figs', 'atk', 'rtb', 'def', 'res', 'hp', 'dmg',
  'toBlkMod', 'cityWalls',
];

// The two To-Hit records, one per engine family. The card states its version's and only that one.
const MODERN_TO_HIT_FIELDS = ['hitChance', 'hitMelee', 'hitRanged', 'hitThrown', 'hitBreath'];
const DOS_TO_HIT_FIELDS = ['toHitMod', 'toHitRtbMod'];

// The modern Ranged/Thrown/Breath channel controls, raw as the card holds them.
const MODERN_ATTACK_FIELDS = ['ranged', 'rangedType', 'thrown', 'fireBreath', 'lightningBreath'];

function cardStateIsModernVersion(version) {
  return String(version).startsWith('com2');
}

// The `uiKey` under which a def's control state is stored. One entry per control: an ability and
// its enchantment twin are distinct controls with distinct saved state, and merging them onto a
// shared `calcKey` is the projection's job, not the state's.
function cardStateAbilityUiKey(def) {
  return def.uiKey || def.key;
}

function cardStateSide(state) {
  const prefix = state && state.prefix;
  if (prefix !== 'a' && prefix !== 'b') {
    throw new Error('cardStateToDerivationInput: the card state names side '
      + JSON.stringify(prefix) + ", which is not one of 'a', 'b'.");
  }
  return prefix;
}

function assertCardStateFields(state, fields, what) {
  for (const field of fields) {
    if (state[field] === undefined) {
      throw new Error(`cardStateToDerivationInput: the card state for side '${state.prefix}' `
        + `carries no ${what} field '${field}'.`);
    }
  }
}

// The defs the cross-side enchantments name. Resolved through `abilityUiDefs` rather than by
// spelling the control ids, so the enchantment list stays the single home for what each control
// is called.
function crossSideEnchantmentDefs() {
  const wanted = new Set(CROSS_SIDE_ENCHANTMENT_KEYS);
  const found = abilityUiDefs().filter(def => def.source === 'enchantment' && wanted.has(def.key));
  if (found.length !== CROSS_SIDE_ENCHANTMENT_KEYS.length) {
    throw new Error('crossSideEnchantmentDefs: the enchantment defs name '
      + found.map(def => def.key).join(', ') + ' but the cross-side list names '
      + CROSS_SIDE_ENCHANTMENT_KEYS.join(', ') + '.');
  }
  return found;
}

// The `calcKey` fold, **within one source**. Every control the state carries whose def comes
// from `source` is folded onto its def's calc key by `mergeAbilityCalcValue`, which is where the
// combining rule and its citation live; a control the card does not have is absent from the
// state and contributes nothing, exactly as a missing DOM element did.
//
// The fold no longer crosses the two sources. `'ability'` is what the unit was built with and
// `'enchantment'` is what the card marks — two engine writes at two moments — and the two halves
// reach `deriveUnitStats` separately (F252.1). The uiKey injectivity check below still runs over
// the whole def list, because a collision between an ability and an enchantment is exactly the
// case it exists to catch.
//
// The state addresses controls by `uiKey`, so the whole model rests on `uiKey` being injective
// over `abilityUiDefs()`. It is today — an enchantment sharing a key with an ability is prefixed
// `enchantment_` exactly when both lists carry the key — but nothing enforced it, and a collision
// would not fail: the second def would silently read the first's stored value and be interpreted
// under its own type. That is precisely the failure this item exists to prevent, a path that
// computes a *different unit* without saying so, so it halts instead (F260.1 review, risk 2).
function cardStateAbilityCalcValues(state, source) {
  if (source !== 'ability' && source !== 'enchantment') {
    throw new Error("cardStateAbilityCalcValues: source is " + JSON.stringify(source)
      + ", which is neither 'ability' (what the unit was built with) nor 'enchantment' "
      + '(what the card marks). The fold runs within one source (F252.1).');
  }
  const result = {};
  const seen = new Map();
  for (const abil of abilityUiDefs()) {
    const uiKey = cardStateAbilityUiKey(abil);
    const prior = seen.get(uiKey);
    if (prior) {
      throw new Error(`cardStateAbilityCalcValues: two ability definitions claim the control key `
        + `'${uiKey}' — ${prior.source}:${prior.key} and ${abil.source}:${abil.key}. A card state `
        + 'addresses one control per uiKey, so the second would read the first\'s value.');
    }
    seen.set(uiKey, abil);
    if (abil.source !== source) continue;
    const val = state.abilities[uiKey];
    if (val === undefined) continue;
    const calcKey = abil.calcKey || abil.key;
    result[calcKey] = mergeAbilityCalcValue(abil, result[calcKey], val);
  }
  return result;
}

// The modern card's nine-value block. `null` (absent) and 0 (present, save modifier -0) are
// different states for the numcheck entries — the engine tests `!= null` — so an unticked box
// projects to `null`, not 0. An entry whose def carries no tick box states `on: null` and its
// value always counts.
function cardStateModernSpecialValues(state, version) {
  if (!cardStateIsModernVersion(version)) return {};
  const block = state.modernSpecial || {};
  return Object.fromEntries(MODERN_SPECIAL_FIELDS.map(([key]) => {
    const entry = block[key];
    if (!entry) {
      throw new Error(`cardStateToDerivationInput: the card state for side '${state.prefix}' `
        + `carries no modern special-value entry for '${key}'.`);
    }
    if (entry.on === false) return [key, null];
    if (typeof entry.value !== 'number') {
      throw new Error(`cardStateToDerivationInput: the modern special value '${key}' on side `
        + `'${state.prefix}' is ${JSON.stringify(entry.value)}, which is not a number.`);
    }
    return [key, entry.value];
  }));
}

// The DOS shared special byte, marshalled only: state in, `dosSpecialAbilityValues` decides.
// This is what the unit *provides*, and it is the innate half alone. What it *receives* — the
// enchantment controls naming the same calc key, `Received holy bonus` against `Holy bonus` — is
// the marked half, and the two now contend at the boundary under the same
// `mergeAbilityCalcValue` rule instead of being folded in here (F252.1). That is what retired
// `cardStateDosReceivedValue` and the `withReceived` parameter, which the matrix already passed
// false.
function cardStateDosSpecialValues(state, version) {
  if (!dosSpecialIsActive(version)) return {};
  const block = state.dosSpecial || {};
  if (block.magnitude === undefined) return {};
  if (typeof block.magnitude !== 'number') {
    throw new Error(`cardStateToDerivationInput: the DOS special value on side '${state.prefix}' `
      + `is ${JSON.stringify(block.magnitude)}, which is not a number.`);
  }
  const flags = block.flags || {};
  const consumers = [];
  for (const [key, , sign] of DOS_SPECIAL_CONSUMERS) {
    const def = abilityDefByKey(key);
    const checked = flags[key];
    if (!def || checked === undefined) continue;
    consumers.push({ def, sign, checked });
  }
  return dosSpecialAbilityValues({
    version,
    magnitude: block.magnitude,
    rangedType: cardStateSharedSlotRangedType(state, version),
    consumers,
  });
}

// The DOS-shaped shared slot's type, as the derivation input wants it.
//
// In the DOS versions the shared-slot select *is* that slot and its value is the answer. In the
// modern versions it is not a control at all: it is hidden, and the card's real projectile
// statement is the Ranged record's own selector. Since the two engine families' vocabularies
// diverged (`CLAUDE.md`, *Deliberate deviations*) the shared-slot select cannot even hold the
// modern tokens, so a modern Ranged record typed `magic` or `magic_lightning` would reach the
// derivation as the empty string — and the record-level reads that ask what projectile the unit
// carries, Alumni of Academy among them, would see no type. Where the modern selector names a
// projectile the shared slot cannot, that is the projection; a Thrown or Breath statement, which
// only the shared-slot select carries on a modern card, still comes from it.
function cardStateSharedSlotRangedType(state, version) {
  const dosValue = state.rtbType;
  if (!cardStateIsModernVersion(version)) return dosValue;
  const modernValue = (state.modernAttacks || {}).rangedType;
  return (MODERN_RANGED_TYPES.includes(modernValue) && !DOS_RANGED_TYPES.includes(modernValue))
    ? modernValue : dosValue;
}

// The four modern channels. A DOS version has no modern record at all, which is a different
// statement from a record with four empty channels — see `modernAttackRecord`.
function cardStateModernAttacks(state, version) {
  if (!cardStateIsModernVersion(version)) return null;
  const fields = state.modernAttacks || {};
  for (const field of MODERN_ATTACK_FIELDS) {
    if (fields[field] === undefined) {
      throw new Error(`cardStateToDerivationInput: the card state for side '${state.prefix}' `
        + `carries no modern attack field '${field}'; ${version} needs all of `
        + `${MODERN_ATTACK_FIELDS.join(', ')}.`);
    }
  }
  return modernAttackRecord({
    ranged: fields.ranged,
    rangedType: fields.rangedType,
    thrown: fields.thrown,
    fireBreath: fields.fireBreath,
    lightningBreath: fields.lightningBreath,
  });
}

// Identity, from the state's own `identity` field. The state carries one identity, not two raw
// inputs to a choice: F260.1 had to carry both the stored roster record and the four editable
// controls because the page recovered identity from both, and F260.5 made choosing between them
// part of *stating* the identity rather than part of reading it. A roster statement writes
// `rosterCardIdentity`; a unit stated by its controls writes `customCardIdentity`, whose template
// ids are null; a preset writes `presetIdentity`. `createUnitIdentity`'s own branch on
// `templateId` is unchanged, so a roster identity and a custom one still differ exactly where
// they differed before. The version stays the projection's parameter, so nothing bakes one into
// the state.
//
// What the field carries is what `createUnitIdentity` reads, plus `name`. It deliberately does not
// carry the page's `_preGolemElemArmor` memory: that is the undo buffer for the one control an
// identity *derives* (`specialUnitDerivesResistElements`), not a fact about the unit, and a state
// built from scratch has no previous selection to restore (F260.5 decision).
function cardStateIdentity(state, version) {
  const identity = state.identity;
  // `[object Object]` rather than a prototype comparison, because the Node suites build a card
  // state in one realm and project it inside a `vm` context in another, where `Object.prototype`
  // is a different object. What must be rejected is a `Date`, a `RegExp`, an array or a scalar:
  // spreading one of those yields an identity whose every field is the default, which is a
  // *different unit* stated silently.
  if (Object.prototype.toString.call(identity) !== '[object Object]') {
    throw new TypeError(
      `Card state for side '${state.prefix}' states no identity `
      + `(got ${Object.prototype.toString.call(identity)}). Every card state states one, as a plain `
      + `object: a roster statement writes rosterCardIdentity, a unit stated by its controls `
      + `customCardIdentity, a preset presetIdentity.`);
  }
  return createUnitIdentity({ ...identity, version });
}

// A base race a caller states. Absent is the legitimate "no race" answer a non-Fantastic custom
// unit gives, so it becomes `''`; a value that is *present* and not a string is a broken fixture.
// The DOM path used to write it to the `<select>`, which coerced it — an object arrived as the
// literal string `[object Object]`, was added to the option list by `ensureBaseRaceOption` and
// reached the derivation as a race no version has. Halting names the fixture instead (F260.5,
// found by the GPT review of this subtask).
function statedBaseRace(value, source) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') {
    throw new TypeError(
      `${source || 'Base identity'} states base race ${JSON.stringify(value)}, which is not a `
      + `string. A unit with no base race states '' or nothing at all.`);
  }
  return value;
}

// The identity a caller states with the four editable identity fields and nothing else: no source
// roster, so no template or hero-type id, and the special-unit key clamped to the selected
// version the way the `Special unit` selector clamps it.
//
// The clamp belongs here because the card state is what the controls hold, and the controls hold
// the clamped key: `populateSpecialUnitOptions` and `setIdentityControls` (`ui_units.js`) both run
// `specialUnitAllowed` before writing, so a fixture naming `golem` under a MoM version leaves the
// card holding `none`. The two questions keep their order and their answers — `specialUnitAllowed`
// asks `specialUnitDef` first, so a key this build does not define halts, and only a defined key
// this version disallows clamps.
function customCardIdentity(values, version, source) {
  const stated = values || {};
  return {
    templateId: null,
    heroTypeId: null,
    isHero: !!stated.isHero,
    baseFantastic: !!stated.baseFantastic,
    baseRace: statedBaseRace(stated.baseRace, source),
    specialUnit: specialUnitAllowed(version, stated.specialUnit, source)
      ? (stated.specialUnit || 'none') : 'none',
    ...(typeof stated.name === 'string' && stated.name ? { name: stated.name } : {}),
  };
}

// A preset fixture's identity. R8 fixtures state `identity` directly; historical fixtures state
// the compact `unitType` token beside `race` and `specialUnit`, and this is the one-way
// translation of that token — the same translation `setIdentityControlsFromLegacy`
// (`ui_units.js`) applies to a v1 saved state. The compact token never overwrites an explicit R8
// identity.
//
// It lives here rather than beside the identity constructors in `stats_identity.js` because what
// it produces is a *card state* identity: the clamp `customCardIdentity` applies is this file's
// rule, and applying it here is what makes a fixture resolve without controls exactly as the
// control path resolves it.
//
// The fixture's display name travels with the identity. On the DOM path it did not: `applyPreset`
// wrote it onto `unitIdentity[prefix]` in a separate pass after `setUnit`, so the *end* state
// carried it and the translation did not. Producing it here is what lets F260.6 use this function
// as the whole preset identity rather than merging the name beside it — a second assembly rule
// (GPT review of F260.5). Inert on the DOM path: `setIdentityControls` and
// `populateSpecialUnitOptions` read no `name`.
function presetIdentity(fixture, version, source) {
  const stated = fixture || {};
  const named = block => (typeof block.name === 'string' && block.name)
    ? block.name : stated.name;
  if (stated.identity && typeof stated.identity === 'object') {
    return customCardIdentity({ ...stated.identity, name: named(stated.identity) },
      version, source);
  }
  const legacyType = stated.unitType || UNIT_DEFAULTS.unitType;
  const match = /^fantastic_(life|death|chaos|nature|sorcery|arcane)$/.exec(legacyType);
  return customCardIdentity({
    isHero: legacyType === 'hero',
    baseFantastic: !!match,
    baseRace: stated.race || (match ? match[1][0].toUpperCase() + match[1].slice(1) : ''),
    specialUnit: stated.specialUnit || 'none',
    name: stated.name,
  }, version, source);
}

// --- Version gating: the state half of `updateTypeVisibility` ---
//
// `updateTypeVisibility` (`ui_abilities.js`) does four things: it toggles DOM classes, it sets the
// disabled attribute, it **clears** the controls a version cannot have, and it withdraws the
// ranged-mode control. Only the clearing is state, and this is its one implementation: the page
// routes its own clearing through it, so a card state built without controls (F260.6) is gated by
// the same code rather than by a second rule written beside it.
//
// The gating test is `abilityVersionGated` (`ability_gating.js`), and there is no parameter to
// choose another: F261 deleted the matrix's weaker second test, so the card, the preset path and
// the matrix reader all ask the one question.

// What the page's clearing writes. Every control type has an off value here, and the page follows:
// `updateTypeVisibility` writes back whatever this pass changed (`ui_abilities.js`), so the two
// paths cannot disagree — which is the property F260.3 established and this keeps.
//
// **The numeric pair used to be left alone (F253.1).** `applyDisabled` clears a checkbox and resets
// a select, and touched neither a `num` input nor a `numcheck` pair, so a version-hidden numeric
// control kept its value in the card state; the value reached `deriveUnitStats` and was ignored
// there, which is why it cost nothing. It stopped being free when `seedNonStatRecordFields` began
// halting on a stated key the version's origin table names nowhere: `exorcise` is a `numcheck`
// hidden in both MoM builds and named by no MoM origin row, so setting it in CoM 1 and switching
// to MoM 1.31 handed the derivation a key it had to refuse. Clearing it is also what INV-2 says —
// a control hidden for the active version cannot move a number, and a value left in the state is
// a number waiting to move. An unticked numcheck is `null` and an empty num is `0`
// (`presetAbilityValues` below, and `setAbilityControlValue` in `ui_abilities.js`).
function versionGatedClearedValue(abil) {
  if (abil.type === 'bool') return false;
  if (abil.type === 'select') {
    const options = abil.options || [];
    if (!options.length || !options[0].length) {
      throw new Error(`versionGatedClearedValue: the select def '${abil.key}' states no options, `
        + 'so there is no first option to clear it to.');
    }
    return options[0][0];
  }
  if (abil.type === 'numcheck') return null;
  if (abil.type === 'num') return 0;
  throw new Error(`versionGatedClearedValue: the def '${abil.key}' has control type `
    + `${JSON.stringify(abil.type)}, which is not one of bool/select/numcheck/num.`);
}

// Clear the controls the given version cannot have, on a copy. Also performs the MoM armor reset
// `updateLoadoutLocks` performs on the card, so the two paths agree on the armor field as well.
function applyVersionGating(state, version) {
  if (!state || typeof state !== 'object' || !state.abilities) {
    throw new Error('applyVersionGating: expected a card state carrying `abilities`, got '
      + JSON.stringify(state) + '.');
  }
  if (typeof version !== 'string' || !version) {
    throw new Error('applyVersionGating: version must be a version string, got '
      + JSON.stringify(version) + '.');
  }
  const abilities = { ...state.abilities };
  for (const abil of abilityUiDefs()) {
    const uiKey = cardStateAbilityUiKey(abil);
    if (!(uiKey in abilities)) continue;
    if (!abilityVersionGated(abil, version)) continue;
    abilities[uiKey] = versionGatedClearedValue(abil);
  }
  const gated = { ...state, abilities };
  if (!versionHasArmorQuality(version)) gated.armor = 'normal';
  return gated;
}

// The same for the battlefield-wide controls, whose rule is `globalEnchantmentAllowedForVersion`.
// The page clears a disallowed global enchantment in one place (`updateGlobalEnchantmentVisibility`
// and `updateTypeVisibility`); this is the state twin the preset path needs. Every field the rule
// disallows must be a boolean, because there is no other stated "off" for a global — a non-boolean
// one halts rather than being guessed at.
function applyGlobalVersionGating(globals) {
  if (!globals || typeof globals !== 'object' || typeof globals.version !== 'string') {
    throw new Error('applyGlobalVersionGating: expected a globals object carrying `version`, got '
      + JSON.stringify(globals) + '.');
  }
  const gated = { ...globals };
  for (const field of REQUIRED_GLOBAL_FIELDS) {
    if (field === 'version') continue;
    if (globalEnchantmentAllowedForVersion(field, globals.version)) continue;
    if (typeof gated[field] !== 'boolean') {
      throw new Error(`applyGlobalVersionGating: '${field}' is not available in `
        + `${globals.version} but holds ${JSON.stringify(gated[field])}, which is not a boolean, `
        + 'so there is no stated off value to clear it to.');
    }
    gated[field] = false;
  }
  return gated;
}

// The projection. Pure: one card state, one globals object, out comes exactly the object
// `deriveUnitStats` takes.
function cardStateToDerivationInput(state, globals) {
  const prefix = cardStateSide(state);
  if (!globals || typeof globals !== 'object') {
    throw new Error('cardStateToDerivationInput: globals is '
      + JSON.stringify(globals) + ', which states none of ' + REQUIRED_GLOBAL_FIELDS.join(', ') + '.');
  }
  for (const field of REQUIRED_GLOBAL_FIELDS) {
    if (globals[field] === undefined) {
      throw new Error(`cardStateToDerivationInput: globals carries no '${field}'.`);
    }
  }
  const version = globals.version;
  if (typeof version !== 'string' || !version) {
    throw new Error('cardStateToDerivationInput: globals name game version '
      + JSON.stringify(version) + ', which is not a version string.');
  }
  const modern = cardStateIsModernVersion(version);
  assertCardStateFields(state, REQUIRED_CARD_STATE_FIELDS, 'stat');
  assertCardStateFields(state, modern ? MODERN_TO_HIT_FIELDS : DOS_TO_HIT_FIELDS, 'To-Hit');
  if (!state.abilities || typeof state.abilities !== 'object') {
    throw new Error(`cardStateToDerivationInput: the card state for side '${prefix}' carries no `
      + 'ability control map.');
  }
  const enemyPrefix = prefix === 'a' ? 'b' : 'a';
  const enemy = (globals.perSide || {})[enemyPrefix];
  if (!enemy) {
    throw new Error(`cardStateToDerivationInput: globals.perSide carries no entry for side `
      + `'${enemyPrefix}', which is where side '${prefix}' reads `
      + CROSS_SIDE_ENCHANTMENT_KEYS.join(' and ') + '.');
  }
  return {
    prefix,
    version,
    // The two halves of the ability input, kept apart at the boundary (F252.1). The unit was
    // *built* with the innate half — the ability controls, and the version's own special-value
    // block, which states what this unit provides — and the card *marks* the enchantment half.
    // `deriveUnitStats` preserves their source for the positioned writes in its current sequence.
    innateAbilities: {
      ...cardStateAbilityCalcValues(state, 'ability'),
      ...cardStateModernSpecialValues(state, version),
      ...cardStateDosSpecialValues(state, version),
    },
    markedAbilities: cardStateAbilityCalcValues(state, 'enchantment'),
    identity: cardStateIdentity(state, version),
    name: (state.identity || {}).name,
    level: state.level,
    weapon: state.weapon,
    armor: state.armor,
    rtbType: cardStateSharedSlotRangedType(state, version),
    figs: state.figs,
    atk: state.atk,
    rtb: state.rtb,
    modernAttacks: cardStateModernAttacks(state, version),
    def: state.def,
    res: state.res,
    hp: state.hp,
    dmg: state.dmg,
    // The card exposes only aggregate starting damage. Category/bonus state starts at
    // zero, remains exact internally during combat, and is reported as output.
    irrecoverableDamage: 0,
    undeadDamage: 0,
    baseBonusHp: 0,
    noHealing: false,
    // The card states the To Hit record its version has, and only that one: the DOS melee /
    // shared-secondary pair, or the modern common `hitchance` plus its four channel modifiers.
    ...(modern ? {
      hitChance: state.hitChance,
      hitMelee: state.hitMelee,
      hitRanged: state.hitRanged,
      hitThrown: state.hitThrown,
      hitBreath: state.hitBreath,
    } : {
      toHitMod: state.toHitMod,
      toHitRtbMod: state.toHitRtbMod,
    }),
    toBlkMod: state.toBlkMod,
    cityWalls: state.cityWalls,
    nodeAura: globals.nodeAura,
    wallOfFire: globals.wallOfFire,
    trueLight: globals.trueLight,
    darkness: globals.darkness,
    enemyEternalNight: !!enemy.eternalNight,
    enemyEyeOfHeaven: !!enemy.eyeOfHeaven,
    chaosSurge: globals.chaosSurge,
    rangedCheck: globals.rangedCheck,
    rangedDist: globals.rangedDist,
    warpReality: globals.warpReality,
    hurricane: globals.hurricane,
    poxHost: globals.poxHost,
    generic: !!state.generic,
  };
}

// --- The roster record's statement of a card ---
//
// A roster selection is a card state: one record in, one whole card out. `applyUnit`
// (`ui_units.js`) computes it here and writes the result to the controls, so the page and a
// control-free caller (F260.6) cannot state the same unit differently. Everything from here down
// is pure, and the readers the matrix and the card share moved in with it — `predefinedUnitRtb`,
// `predefinedUnitRtbType` and `predefinedModernAttacks` were page-scope in `ui_matrix.js`,
// `parseAbilitiesFromUnit` in `ui_abilities.js` and `specialUnitAllowed` in `ui_units.js`, none of
// which touched the DOM.
//
// F136's rule is what the shape preserves: the record is stated exactly once, at selection. The
// card holds pre-level stats and the level ladder is a transform step in `deriveUnitStats`
// (`stats_sequence.js`, statStep 'level'), so nothing here applies a level bonus and a level
// change re-states nothing.

function rosterRecordLabel(unit) {
  return `Roster record ${JSON.stringify((unit && (unit.name || unit.id)) || null)}`;
}

function predefinedUnitRtb(unit) {
  return (unit.ranged && parseInt(unit.ranged, 10) > 0) ? parseInt(unit.ranged, 10)
    : (unit.breath && parseInt(unit.breath, 10) > 0) ? parseInt(unit.breath, 10)
    : (unit.thrown_breath && parseInt(unit.thrown_breath, 10) > 0) ? parseInt(unit.thrown_breath, 10) : 0;
}

// The roster writes `ranged_type` in the display spelling `RANGED_TYPE_NORMALIZE` keys, and
// `thrown_breath_type` already in the calculator's own lowercase token. A third spelling is a
// projectile class the card has no field for, and passing it through unrecognized is how it
// would reach the resolver looking derived (`SPEC.md`, *Out-of-range values stop the run*).
function predefinedUnitRtbType(unit) {
  const rawRtb = (unit.ranged_type && unit.ranged_type !== 'none') ? unit.ranged_type
    : (unit.thrown_breath_type && unit.thrown_breath_type !== 'none') ? unit.thrown_breath_type
    : 'none';
  if (rawRtb === 'none' || THROWN_TYPES.includes(rawRtb)) return rawRtb;
  const normalized = RANGED_TYPE_NORMALIZE[rawRtb];
  if (!normalized) {
    throw new Error(
      `predefinedUnitRtbType: roster record ${JSON.stringify(unit.name || unit.id)} carries `
      + `attack type '${rawRtb}', which names no calculator channel type. Expected a display `
      + `spelling from RANGED_TYPE_NORMALIZE (${Object.keys(RANGED_TYPE_NORMALIZE).join(', ')}) `
      + `or one of ${THROWN_TYPES.join('/')}.`);
  }
  return normalized;
}

// Caster.exe keeps these attacks in separate fields, so a roster record states all four. The
// card and the matrix both read a roster unit through here and hand the result to the same
// `deriveUnitStats` boundary (`SPEC.md`, *UI contract*), and `modernAttackRecord` is where the
// shape they share is decided — including the empty case, which is a record with four empty
// fields rather than no record. Off the modern versions there is no such record at all, which
// is the answer `modernCardAttacks` gives for the same version.
function predefinedModernAttacks(unit, version) {
  if (typeof version !== 'string') {
    throw new Error(
      `predefinedModernAttacks: no game version for roster record `
      + `${JSON.stringify(unit && (unit.name || unit.id))}; the modern record exists only in the `
      + `CoM2/Warlord versions, so the caller must say which version it is reading.`);
  }
  if (!version.startsWith('com2')) return null;
  return modernAttackRecord({
    ranged: unit.ranged,
    // `thrown_breath_type` is the shared slot's projection and never names this record, so the
    // type is read from `ranged_type` alone.
    rangedType: predefinedUnitRtbType(
      { id: unit.id, name: unit.name, ranged_type: unit.ranged_type }),
    thrown: unit.thrown,
    fireBreath: unit.fire_breath,
    lightningBreath: unit.lightning_breath,
  });
}

function parseAbilitiesFromUnit(unit) {
  const result = {};
  const abilities = unit.abilities || [];
  // Normalize: strip spaces from ability strings for matching against camelCase match keys
  const normalized = abilities.map(a => a.replace(/ /g, ''));
  for (const abil of ABILITY_DEFS) {
    if (abil.type === 'bool') {
      result[abil.key] = normalized.some(a => a === abil.match || a.startsWith(abil.match + '='));
    } else if (abil.type === 'numcheck') {
      const found = normalized.find(a => a.startsWith(abil.match + '='));
      if (found) {
        result[abil.key] = parseInt(found.split('=')[1]) || 0;
      } else if (normalized.includes(abil.match)) {
        result[abil.key] = 0;
      } else {
        result[abil.key] = null;
      }
    } else {
      const found = normalized.find(a => a.startsWith(abil.match + '='));
      if (found) {
        result[abil.key] = parseInt(found.split('=')[1]) || 0;
      } else if (normalized.includes(abil.match)) {
        result[abil.key] = 1;
      } else {
        result[abil.key] = 0;
      }
    }
  }
  return result;
}

// Two different questions used to share one `false`. A key this build does not define is out of
// range and halts (`SPEC.md`, *Out-of-range values stop the run*): it can only come from a state
// blob, share link or fixture written against a vocabulary this build has since changed, and
// answering `none` restores a unit whose special template the caller did state. That check and
// the vocabulary it reads are `specialUnitDef` and `SPECIAL_UNIT_DEFS` (`stats_identity.js`), so
// the page and the core identity boundary share one list. A key that is defined but not allowed
// in the selected version is version scope, not retirement — the version select really can move a
// `chosen` card to MoM — so that one still clamps, and that question is the page's own.
function specialUnitAllowed(version, key, context) {
  const def = specialUnitDef(key, context);
  // The scope test itself is `specialUnitScopedToVersion` (`stats_identity.js`), beside the table
  // it reads, because `specialUnitForRoster` asks the same question of the same rows (F267.3).
  return def ? specialUnitScopedToVersion(version, def) : true;
}

// The shared slot's token for a projectile a record states. This is the rule the DOM writer
// applied by reading the select's own `<option>` list, stated instead against the vocabulary that
// list is built from: the slot carries the DOS spellings, and where the modern selector names a
// projectile the slot cannot, the slot says `none` and the modern Ranged record carries the
// statement (`cardStateSharedSlotRangedType` reads it back that way). A token neither family has
// is a caller error rather than something to write blank.
function sharedSlotTypeForToken(token, version, source) {
  if (DOS_SLOT_ATTACK_TYPES.includes(token)) return token;
  const modern = cardStateIsModernVersion(version);
  if (modern && MODERN_RANGED_TYPES.includes(token)) return 'none';
  throw new Error(
    `${source}: attack type '${token}' names no type the shared slot offers `
    + `(${DOS_SLOT_ATTACK_TYPES.join(', ')})`
    + (modern ? ` and none the modern selector offers (${MODERN_RANGED_TYPES.join(', ')}).` : '.'));
}

// What a control holds after a value is written to it and read back. The card state is what the
// controls hold, so the pure twin has to state what the DOM round trip states — a `numcheck`
// distinguishes absent (`null`) from present-and-zero, a `bool` holds a boolean, and the number
// inputs hold what `parseInt` recovers. Anything else would make the pure path compute a
// different unit from the page's, which is the failure F260 exists to prevent.
function abilityControlValueRoundTrip(abil, value, source) {
  if (abil.type === 'bool') return !!value;
  if (abil.type === 'select') {
    const options = (abil.options || []).map(option => option[0]);
    if (!options.length) {
      throw new Error(`${source}: the select def '${abil.key}' states no options.`);
    }
    if (!value) return options[0];
    if (!options.includes(value)) {
      throw new Error(`${source}: '${abil.key}' states ${JSON.stringify(value)}, which names none `
        + `of the options the control offers (${options.join(', ')}).`);
    }
    return value;
  }
  if (abil.type === 'numcheck') {
    return value == null ? null : (parseInt(value, 10) || 0);
  }
  if (abil.type === 'num') {
    return parseInt(value === true ? 1 : (value || 0), 10) || 0;
  }
  throw new Error(`${source}: the def '${abil.key}' has control type `
    + `${JSON.stringify(abil.type)}, which is not one of bool/select/numcheck/num.`);
}

// The DOS card's shared byte and the flags naming which effects read it, computed from the
// ability values rather than mirrored off the controls. `byte` is the roster path: the record
// states `Spec_Att_Attrib` directly, so the flags come from the ability tokens but the magnitude
// never does. Without a byte the magnitude is recovered from the first active consumer, and
// failing that from a gaze — the gazes carry no flag but do carry the byte, so a gaze-only unit
// (Basilisk, and every gaze preset) still seeds it. Nothing sourced it means 0 rather than the
// previous unit's byte, which would otherwise leak a save modifier into the next selection.
function cardStateDosSpecialBlock(abilities, byte) {
  let magnitude = byte == null ? null : Math.abs(byte);
  const flags = {};
  for (const [key] of DOS_SPECIAL_CONSUMERS) {
    const def = abilityDefByKey(key);
    if (!def) continue;
    const val = abilities[cardStateAbilityUiKey(def)];
    const active = abilityValueIsActive(def, val);
    flags[key] = active;
    if (active && magnitude === null) magnitude = Math.abs(val || 0);
  }
  if (magnitude === null) {
    for (const key of DOS_GAZE_KEYS) {
      const def = abilityDefByKey(key);
      if (!def) continue;
      const val = abilities[cardStateAbilityUiKey(def)];
      if (abilityValueIsActive(def, val)) { magnitude = Math.abs(val || 0); break; }
    }
  }
  return { magnitude: magnitude === null ? 0 : magnitude, flags };
}

// The other half of the DOS round trip: each ticked consumer takes the shared magnitude with its
// own sign, and an unticked one reverts to the def's absent value — `null` for a numcheck rather
// than 0, because the engine distinguishes the two. On the card this was a write back over the
// ability rows; here it is an ordinary computation over the values the block was read from, which
// is what lets a caller with no controls reach the same result.
//
// The version test is the caller's: a roster selection performs this pass only where the DOS
// block is the live one (`dosSpecialIsActive`), while the card's own magnitude and flag controls
// perform it whenever they change, which is what `syncDosSpecialAbilities` has always done.
function dosSpecialAbilityWriteback(abilities, block, source) {
  const magnitude = Math.abs(block.magnitude || 0);
  const next = { ...abilities };
  for (const [key, , sign] of DOS_SPECIAL_CONSUMERS) {
    const def = abilityDefByKey(key);
    if (!def) continue;
    next[cardStateAbilityUiKey(def)] = abilityControlValueRoundTrip(def,
      block.flags[key] ? sign * magnitude : (def.type === 'numcheck' ? null : 0), source);
  }
  return next;
}

// The identity a roster record implies, in the two shapes the code needs it. Neither restates the
// special-unit answer — `createRosterUnitIdentity` already carries `specialUnitForRoster`'s, and a
// second call was a second map that could, and did, disagree with it (F162).
//
// `rosterStoredIdentity` is the record the page keeps in its `unitIdentity` map, which the
// persistence path still reads. `rosterCardIdentity` is the same identity in the shape the card
// state carries: no `version`, because the projection supplies one, and the special-unit key
// clamped through `customCardIdentity` so that a roster-stated card and a control-stated card are
// clamped by one rule rather than two.
//
// The clamp is inert on the roster — every answer `specialUnitForRoster` gives is guarded by a
// version test at least as narrow as that key's own `versions` entry — and
// `runIdentityChecks` (`tools/unit_checks/identity.js`) asserts that over every record in every
// version, so a future key whose roster map is wider than its version scope fails there rather
// than quietly changing what a roster card derives.
function rosterStoredIdentity(unit, version) {
  return { ...createRosterUnitIdentity(version, unit), name: unit.name };
}

function rosterCardIdentity(unit, version) {
  const stored = rosterStoredIdentity(unit, version);
  return {
    ...customCardIdentity(stored, version, `Base identity from ${rosterRecordLabel(unit)}`),
    templateId: stored.templateId,
    heroTypeId: stored.heroTypeId,
  };
}

// Golem's compiled identity supplies Resist Elements at its normal enchantment point in CoM 1,
// CoM2 and Warlord: the special-unit selector owns the Elements value rather than the user. One
// home for the rule, two appliers — `updateSpecialUnitDerivedEffects` (`ui_units.js`) applies it
// to the control and locks the row, and `applyRosterUnit` states it on the card state, so a caller
// with no controls (F260.6) selecting Golem gets the same unit the page gets. What stays on the
// page is the *memory* of the value Golem replaced (`_preGolemElemArmor` and the hidden
// `IdentityPreGolemElemArmor` field), which exists to restore the user's own value when the
// selection moves off Golem; a state built from scratch has no previous selection to restore
// (F260.5 owns identity, and with it the question of whether that memory becomes card state).
function specialUnitDerivesResistElements(version, specialUnit) {
  return (String(version).startsWith('com2_') || version === 'com_6.08')
    && specialUnit === 'golem';
}

// A stat the record may omit. `to_hit`, `to_block` and `figures` have defaults the card applies
// when the record is silent, and `spec_att_attrib` is absent from every modern record — but a
// field that is *present* and not a number is a broken record, and writing it to a number input
// would leave the control blank rather than say so.
function rosterOptionalNumber(unit, field, value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${rosterRecordLabel(unit)} states ${field} ${JSON.stringify(value)}, which is `
      + 'not a number.');
  }
  return value;
}

// A stat the record must state. The card's number inputs hold strings, so the state holds strings
// too: writing this state to the controls and reading it back is then a fixpoint. A record missing
// one of these is out of range and halts naming the record, rather than reaching the derivation as
// the `"undefined"` an `<input>` assignment would have made of it.
function rosterCardNumber(unit, field, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${rosterRecordLabel(unit)} states ${field} ${JSON.stringify(value)}, which is `
      + 'not a number, so the card cannot be stated from it.');
  }
  return String(value);
}

// The vocabulary checks a roster record must pass before anything states a card from it: the
// shared slot's projectile spelling and, in a modern version, the Ranged channel's. `applyUnit`
// reaches them through `applyRosterUnit`, but the **restore** path does not — `updateUnitLock`
// (`ui_units.js`) with `applyValues` false rebuilds the JS-side records and the lock styling
// without restating the card, and until F260.6 it reached them by accident, because
// `setRosterUnitRecords` happened to call `predefinedModernAttacks` for a stat copy that is now
// deleted. Losing a halt as a side effect of deleting dead state is the kind of silent narrowing
// this rule exists to prevent, so the check is named and called on purpose (F260.6 review,
// finding 6).
function assertRosterRecordStatable(unit, version) {
  predefinedUnitRtbType(unit);
  predefinedModernAttacks(unit, version);
}

// The whole roster statement: one card state in, the state a selection of `unit` produces out —
// the pure twin of `applyUnit`'s card writes. What stays on the page is the DOM half alone: the
// innate-lock classes, the special-unit option list and the visibility refresh, none of which is
// state. Version gating is deliberately *not* applied here, because on the page it runs after the
// selection (`refreshAbilityFieldVisibility` -> `updateTypeVisibility`); a pure caller composes it
// the same way, `applyVersionGating(applyRosterUnit(state, unit, version), version)`.
function applyRosterUnit(state, unit, version) {
  if (!state || typeof state !== 'object' || !state.abilities) {
    throw new Error('applyRosterUnit: expected a card state carrying `abilities`, got '
      + JSON.stringify(state) + '.');
  }
  if (!unit || typeof unit !== 'object') {
    throw new Error('applyRosterUnit: expected a roster record, got ' + JSON.stringify(unit) + '.');
  }
  if (typeof version !== 'string' || !version) {
    throw new Error('applyRosterUnit: version must be a version string, got '
      + JSON.stringify(version) + '.');
  }
  const source = rosterRecordLabel(unit);

  // The ability rows the record states. Enchantment controls are not part of a roster statement
  // and carry through untouched, which is the `source === 'ability'` filter the page's
  // apply/clear pair narrows by.
  const parsed = parseAbilitiesFromUnit(unit);
  const abilities = { ...state.abilities };
  for (const abil of abilityUiDefs()) {
    if (abil.source !== 'ability') continue;
    abilities[cardStateAbilityUiKey(abil)] =
      abilityControlValueRoundTrip(abil, parsed[abil.key], source);
  }

  // The modern nine-value block mirrors the ability rows, in every version — the card holds it
  // whether or not the version shows it. It is taken **before** the DOS write-back below, because
  // that is the order the card performs the two in and the DOS pass does not re-mirror. The mirror
  // itself is `cardStateModernSpecialMirror`, shared with the preset applier.
  const modernSpecial = {
    ...(state.modernSpecial || {}), ...cardStateModernSpecialMirror(abilities),
  };

  const identity = rosterCardIdentity(unit, version);
  // The special-unit selector's derived Elements value. It is the one enchantment control a roster
  // statement writes, because the identity the record carries owns it rather than the user.
  if (specialUnitDerivesResistElements(version, identity.specialUnit)) {
    abilities.elemArmor = 'resistElements';
  }

  const dosSpecial = cardStateDosSpecialBlock(abilities,
    rosterOptionalNumber(unit, 'spec_att_attrib', unit.spec_att_attrib, null));

  const modernAttacks = predefinedModernAttacks(unit, version);
  const channel = name => {
    const value = modernAttacks && modernAttacks[name];
    return String((value && value.strength) || 0);
  };
  const rangedToken = (modernAttacks && modernAttacks.ranged) ? modernAttacks.ranged.type : 'none';
  // The modern selector's own vocabulary, checked here for the reason the writer checks the
  // control's option list (F181): a record or fixture typo in the projectile must halt naming its
  // source rather than leave the channel typeless one layer before `deriveUnitStats` looks.
  if (rangedToken !== 'none' && !MODERN_RANGED_TYPES.includes(rangedToken)) {
    throw new Error(`${source}: the modern Ranged channel states projectile type `
      + `${JSON.stringify(rangedToken)}, which names no type the control offers `
      + `(none, ${MODERN_RANGED_TYPES.join(', ')}). A channel with no projectile states 'none'.`);
  }

  // `UNITS.INI` defines one `Hit=` per record and no per-channel key. That one value seeds the
  // DOS melee threshold, the DOS shared secondary threshold and, in the modern engines, the
  // record's one common `hitchance`; the four modern channel modifiers have no roster source and
  // reset to 0.
  const toHit = String(rosterOptionalNumber(unit, 'to_hit', unit.to_hit, 0) || 0);

  return {
    ...state,
    abilities: dosSpecialIsActive(version)
      ? dosSpecialAbilityWriteback(abilities, dosSpecial, source) : abilities,
    modernSpecial,
    dosSpecial,
    identity,
    generic: unit.category === 'Generic',
    atk: rosterCardNumber(unit, 'melee', unit.melee),
    def: rosterCardNumber(unit, 'defense', unit.defense),
    res: rosterCardNumber(unit, 'resist', unit.resist),
    hp: rosterCardNumber(unit, 'hp', unit.hp),
    figs: String(rosterOptionalNumber(unit, 'figures', unit.figures, 1) || 1),
    rtb: String(predefinedUnitRtb(unit)),
    rtbType: sharedSlotTypeForToken(predefinedUnitRtbType(unit), version, source),
    modernAttacks: {
      ranged: channel('ranged'),
      rangedType: rangedToken,
      thrown: channel('thrown'),
      fireBreath: channel('fireBreath'),
      lightningBreath: channel('lightningBreath'),
    },
    toHitMod: toHit,
    toHitRtbMod: toHit,
    hitChance: toHit,
    hitMelee: '0',
    hitRanged: '0',
    hitThrown: '0',
    hitBreath: '0',
    // Modern roster To Block uses the card's percentage-point delta above 30%.
    toBlkMod: String(rosterOptionalNumber(unit, 'to_block', unit.to_block, 0) || 0),
    dmg: '0',
  };
}

// --- The preset applier ---
//
// `presetToCardState(name, preset, options)` is the whole state a preset produces — both sides'
// card states and the globals object — computed without a single DOM reference. It runs the same
// ordered sequence `applyPreset` (`ui_state.js`) runs, because order is what makes the two paths
// agree: version, clear, unit (roster or custom), the roster-side enchantment overlay, identity,
// the loadout fixups, the globals tail, the Golem derive, version gating, and last the two
// asserts.
//
// What it deliberately does **not** reproduce is `onVersionChange`'s page work. That function
// (`ui_state.js`) does five things, and only the first is state a preset can still be seen to
// carry:
//
// | `onVersionChange` step | Reproduced here |
// |---|---|
// | the version itself | **yes** — every rule below reads the resolved version |
// | roster dropdown repopulation | no — DOM only |
// | roster re-selection of the previously selected unit | **no, and it cannot matter**: each side is restated below, by `applyRosterUnit` or from the fixture |
// | the enchantment save/restore around `updateUnitLock` | **no, and it cannot matter**: `applyPreset` clears both sides immediately afterwards |
// | `updateUnitLock`'s loadout reset **under the new version** | **yes** — it lands on `level`/`weapon`, which a preset does not always restate |
// | matrix state migration (`renderAllMatrixPropLists`) | no — matrix page state, outside the card |
//
// The fifth row was missing when this was first written, and the F260.6 review supplied the
// counter-example: a fantastic side holding `elite` under Warlord with Spirit Link ticked, and a
// CoM2 preset naming an ordinary roster unit. The page resets the level while switching version,
// because CoM2's Spirit Link lifts no lock; the preset then restates neither. Skipping a page step
// is only safe when something downstream restates the field, and `level` is one of the few a
// preset need not.
//
// The remaining residue is the base state: the page applies a preset over whatever the card
// already holds, and the few fields a preset never writes keep their previous values.
// `options.base` is where a caller states that starting point; without one the applier starts from
// the card `resetUnitFields` writes, which is **not** the card a fresh page holds — see
// `presetDefaultCardState`. The fields this can differ on are named there too.
//
// **What `base` cannot carry, and the page still has.** `unitIdentity[prefix]._preGolemElemArmor`
// is the page's undo buffer for the Elements control Golem's identity derives, ruled page-only in
// F260.5 because a state built from scratch has no previous selection to restore. It survives into
// a *later* preset: applying a Golem preset and then a non-Golem one that states `elemArmor`
// explicitly leaves the page holding the remembered pre-Golem value, because
// `updateSpecialUnitDerivedEffects` restores it after the fixture's own abilities were written
// (`ui_units.js`) and the custom path never writes them again. This applier keeps the fixture's
// stated value. **The page is wrong there** — a fixture's explicit statement is being overwritten
// by a stale buffer — so the divergence is not reproduced, it is reported (F260.6 review,
// finding 3). No shipped fixture names a special unit, so no fixture reaches it today.

// The fixture's own vocabulary check for the modern Ranged projectile, stated the way
// `applyModernAttackFields` (`ui_units.js`) states it against the control's option list. The
// option list is built from `MODERN_RANGED_TYPES` plus the empty `none`, so the rule reads those
// rather than a second spelling of them.
function presetModernRangedToken(token, source) {
  const offered = ['none', ...MODERN_RANGED_TYPES];
  if (!offered.includes(token)) {
    throw new TypeError(
      `${source}: the modern Ranged channel states projectile type ${JSON.stringify(token)}, `
      + `which names no type the control offers (${offered.join(', ')}). A channel with no `
      + `projectile states 'none'.`);
  }
  return token;
}

// The modern nine-value block as a mirror of the ability rows — `syncModernSpecialCard`
// (`ui_card.js`) as a state transform, and the block `applyRosterUnit` takes before its DOS
// write-back. `on` is `null` for the entries whose def carries no tick box, which is what the
// card's own reader reports for them.
function cardStateModernSpecialMirror(abilities) {
  const block = {};
  for (const [key] of MODERN_SPECIAL_FIELDS) {
    const def = abilityDefByKey(key);
    if (!def) continue;
    const val = abilities[cardStateAbilityUiKey(def)];
    block[key] = {
      on: def.type === 'numcheck' ? val != null : null,
      value: val == null ? 0 : val,
    };
  }
  return block;
}

// Which of the three loadout selects the engine disregards for a unit — the rule half of
// `loadoutLockState` (`ui_abilities.js`), which keeps the DOM half: reading the identity from the
// roster selection or from the controls, and reading the Spirit Link tick. Stated over an identity
// and that one tick, so the page and a control-free caller lock the same fields.
function cardStateLoadoutLocks(identity, spiritLinkOn, version) {
  const isMoM = !versionHasArmorQuality(version);
  const isHero = !!(identity && identity.isHero);
  const isFantastic = !!(identity && identity.baseFantastic);
  const isZombies = !!identity && identity.specialUnit === 'zombies';
  const spiritLink = String(version).startsWith('com2_warlord') && !!spiritLinkOn;
  return {
    level: isHero || (isFantastic && !spiritLink),
    weapon: (isHero || isFantastic) && !isZombies,
    armor: isHero || isFantastic || isMoM,
  };
}

// Does this derived record carry a conventional ranged attack? One question with four askers —
// the ranged-mode control, the ranged matrix's attacker filter, the guard at resolution
// (`SPEC.md`, UI contract) and `assertPresetRangedMode` below — so it is derived once, here. It
// moved out of `ui_card.js` for the fourth asker: the preset applier is `data-scope="core"` and
// may not reach a page symbol.
//
// The two engine families keep the answer in different fields, and which family a record belongs
// to is readable off the record itself: `deriveUnitStats` halts on a modern input that supplies no
// `modernAttacks`, so a derived record carries the four channels exactly when its version is a
// modern one. Modern reads the Ranged channel; DOS reads the shared slot, which is a conventional
// ranged attack only while its type says so, because the same byte also carries the gazes.
function hasConventionalRangedAttack(stats) {
  return stats.modernAttacks
    ? !!(stats.modernAttacks.ranged && stats.modernAttacks.ranged.strength > 0)
    : stats.rangedType !== 'none' && stats.rtb > 0;
}

// **A fixture states its version's own unit record and only that one.** The two engine families
// keep different attack and To Hit records — the DOS shared `rtb`/`rtbType` slot and its
// melee/shared To Hit pair against the modern record's four named channels and its common
// `hitchance` with four channel modifiers — and naming the other family's field wrote a hidden
// control nothing reads. That silent no-op is what let the modern To-Hit projection gap survive
// unnoticed, so it halts the run instead (`SPEC.md`, *Out-of-range values stop the run*).
//
// The attack channels joined this reject in F127. A modern fixture used to be allowed to state
// one channel through the DOS pair, which `applyPreset` projected onto the card; what that also
// did was fill the modern record's shared slot, and the modern reads that still consulted
// it answered from a field `Caster.exe` does not have. With every fixture stating `modernAttacks`
// the slot stays empty in a modern run, so such a read has nothing to find.
const DOS_ONLY_FIXTURE_FIELDS = ['toHitMod', 'toHitRtbMod', 'rtb', 'rtbType'];
const MODERN_ONLY_FIXTURE_FIELDS = ['hitChance', 'hitMelee', 'hitRanged', 'hitThrown',
  'hitBreath', 'modernAttacks'];

function assertFixtureMatchesVersionRecord(name, prefix, side, version) {
  const modern = cardStateIsModernVersion(version);
  const foreign = (modern ? DOS_ONLY_FIXTURE_FIELDS : MODERN_ONLY_FIXTURE_FIELDS)
    .filter(field => Object.prototype.hasOwnProperty.call(side, field));
  if (foreign.length === 0) return;
  throw new Error(
    `Preset '${name}' side ${prefix}: ${version} carries the ${modern ? 'modern' : 'DOS'} unit `
    + `record, so ${foreign.join(', ')} name${foreign.length === 1 ? 's' : ''} no card field it `
    + `has and nothing would read the value. `
    + `Expected ${(modern ? MODERN_ONLY_FIXTURE_FIELDS : DOS_ONLY_FIXTURE_FIELDS).join(', ')}.`);
}

// Ranged mode is a control the page withdraws on its own: `updateTypeVisibility` clears and
// disables `#rangedCheck` whenever the attacker's *derived* record carries no conventional ranged
// attack, and `recalculate` halts if a tick ever survives that withdrawal (`ui.js`, the F132
// guard). For a live user the withdrawal is the page working — ticking Blaze of Glory empties the
// Ranged field and takes ranged mode with it — so nothing here belongs in the shared path.
//
// A fixture is the other case. It states the controls it wants and then asserts a number, so a
// `rangedCheck: true` the page withdraws means the fixture measured a melee exchange under a
// ranged label and nothing said so: the preset's own statement was normalised away between
// `applyPreset` and `recalculate` (`CLAUDE.md`, *Architecture*, the fail-loud rule). F131 found four
// such fixtures, one of them vacuous on the axis its name claimed.
//
// The withdrawal is nonetheless a real assertion for a fixture whose subject is an attack an
// effect empties or refuses to make live: with the tick in place a regression that leaves the
// Ranged field live keeps ranged mode, fires the volley and moves the number, and without it the
// same regression is invisible (measured: `holyBonusNeedsRangedStrengthCoM` 0 -> 2 with the tick,
// 0 -> 0 without). So the fixture declares it — `rangedModeWithdrawn: true` — rather than dropping
// the tick and the discriminator with it. Undeclared withdrawal halts, and so does a declaration
// the page did not act on, so the claim cannot go stale in either direction.
//
// A harness that mutates a fixture and re-measures it is the one caller this cannot speak for: an
// ablation may itself be what leaves the attacker without a ranged attack, and that delta is the
// measurement. That exemption is the **caller's**, passed as `applyPreset(name, { origin })`, and
// deliberately not a field of the fixture: a preset that could name its own exemption would be a
// fixture authorising itself past the boundary this exists to hold
// (`tools/preset_vacuity_sweep.js` is the one caller that passes it). The authored preset an
// ablation was derived from still takes the assertion on its own baseline pass.
//
// The withdrawal reads side a's *derived* record, which is why this assert is the last step of
// both appliers rather than part of the gating pass: the card states are finished, the globals are
// gated, side a is projected and derived, and only then is the tick's survival decided. `held` is
// that decision — on the page the checkbox as `updateTypeVisibility` left it, in the pure applier
// `declared && hasConventionalRangedAttack(sideA)`, which is the same thing because the tail wrote
// the fixture's own value immediately before the withdrawal ran. `describeSideA` is a thunk,
// called only on the failing branch, so naming the record that lost the control costs no
// derivation on a passing one.
const PRESET_ORIGINS = ['authored', 'ablation-probe'];

function assertPresetRangedMode(name, preset, origin, { held, describeSideA }) {
  if (!PRESET_ORIGINS.includes(origin)) {
    throw new Error(
      `applyPreset('${name}'): origin ${JSON.stringify(origin)} names no caller context this `
      + `build defines (offered: ${PRESET_ORIGINS.join(', ')}).`);
  }
  if (origin === 'ablation-probe') return;
  // `true` or absent, and nothing else. A truthy-coerced declaration would let `'false'` clear the
  // finding it is supposed to state, which is the same silence the halt below exists to break.
  if (Object.prototype.hasOwnProperty.call(preset, 'rangedModeWithdrawn')
      && preset.rangedModeWithdrawn !== true) {
    throw new Error(
      `Preset '${name}': rangedModeWithdrawn is `
      + `${JSON.stringify(preset.rangedModeWithdrawn)}, and the only value it takes is true. `
      + `A fixture that does not assert the withdrawal omits the field.`);
  }
  const declared = !!preset.rangedCheck;
  const withdrawalClaimed = preset.rangedModeWithdrawn === true;
  if (declared && !held && !withdrawalClaimed) {
    // Name the record that lost the control, the way the F132 guard in `ui.js` does: the
    // fixture's stated Ranged field is often not the one standing here, because an effect the
    // fixture configures is what emptied it.
    const a = describeSideA();
    const carried = a.modernAttacks
      ? `modernAttacks.ranged = ${JSON.stringify(a.modernAttacks.ranged || null)}`
      : `shared slot type ${JSON.stringify(a.rangedType)} strength ${a.rtb}`;
    throw new Error(
      `Preset '${name}': rangedCheck: true, but side a's derived record carries no conventional `
      + `ranged attack (${carried}), so updateTypeVisibility withdrew the control and the fixture `
      + `resolved a melee exchange under a ranged label. A valid configuration leaves side a a `
      + `finished Ranged strength above 0, or drops rangedCheck, or states `
      + `rangedModeWithdrawn: true where the withdrawal is what the fixture asserts.`);
  }
  if (withdrawalClaimed && (held || !declared)) {
    throw new Error(
      `Preset '${name}': rangedModeWithdrawn: true, but ${declared
        ? 'the attacker\'s derived record still carries a conventional ranged attack and the '
          + 'control was kept'
        : 'the fixture states no rangedCheck: true for it to be withdrawn'}. `
      + `The declaration asserts that a stated rangedCheck: true is withdrawn; drop it, or state `
      + `the rangedCheck: true it is about.`);
  }
}

// Every ability control at the value the def's own "off" is — `clearAbilities` and
// `applyAbilities` (`ui_abilities.js`) as one transform, because on the page they are one pass:
// `applyAbilities` writes every def whether or not the fixture names it, and a def the fixture
// does not name is written the same `undefined` `clearAbilities` writes. Values are stated the way
// a control round-trips them, so the state is what the controls would hold.
//
// The fixture addresses defs by `key`, not `uiKey`. That is not a slip to be normalised: an
// enchantment sharing a key with an ability is a *second* control, and a fixture naming the key
// sets both, exactly as `applyAbilities` does.
function presetAbilityValues(abilities, values, source) {
  const stated = values || {};
  const next = { ...abilities };
  for (const abil of abilityUiDefs()) {
    next[cardStateAbilityUiKey(abil)] =
      abilityControlValueRoundTrip(abil, stated[abil.key], source);
  }
  return next;
}

// The roster side's overlay, and the one place the narrowing matters: only `source === 'enchantment'`
// defs, and only the keys the fixture actually names. A roster selection has just restated every
// innate ability row from the record, and those stay roster-owned — the panel locks them — so an
// overlay wide enough to reach them would let a fixture edit the record it named. `hasOwnProperty`
// rather than a truthiness test, because an enchantment a fixture explicitly states as off is a
// statement too.
function applyPresetEnchantmentOverlay(abilities, values, source) {
  const stated = values || {};
  if (!values) return { ...abilities };
  const next = { ...abilities };
  for (const abil of abilityUiDefs()) {
    if (abil.source !== 'enchantment'
        || !Object.prototype.hasOwnProperty.call(stated, abil.key)) continue;
    next[cardStateAbilityUiKey(abil)] = abilityControlValueRoundTrip(abil, stated[abil.key], source);
  }
  return next;
}

// The card a preset is applied over when the caller states no base. `resetUnitFields`
// (`ui_state.js`) writes exactly this: `UNIT_DEFAULTS` for the scalars, an empty modern attack
// record, no abilities and a custom identity.
//
// It is **not** the state a fresh page has, though this comment said so until F260.9.
// `resetCalculatorState` writes these defaults and then runs `selectDefaultUnit`, so a fresh load
// and the Reset button both finish with `DEFAULT_UNITS` selected — Hell Hounds and War Bears
// (`ui_state.js`). Every page caller passes its own `base`, so nothing on the page reaches this;
// what does reach it is a control-free caller that states none, and `tools/preset_checks.js` is
// one. That the corpus is insensitive to which of the two cards it starts from is measured rather
// than assumed, and by a comparison that contrasts exactly those two cards:
// `node tools/preset_checks.js --compare-base` walks the corpus from this card and then from the
// page's own (Hell Hounds and War Bears), and reports any fixture whose two damage averages
// differ. 0 of 1,161 do. (`tests/preset-equivalence-gate-f260.8.spec.js` test 2 does *not* settle
// this: it hands the page's card to both of its walks and varies the chaining instead.)
//
// A preset restates every field of both cards except four, so this is the whole surface on which
// `options.base` can change the answer:
//
//  - `modernAttacks`, on a **custom** side under a **DOS** version. `applyPreset` writes the modern
//    channels solely in a modern run, so there a DOS preset inherits whatever the previous unit
//    left. Nothing reads it — `cardStateToDerivationInput` nulls the whole record off the modern
//    versions — so it moves no number, but it is a real state difference. A roster side is not
//    affected: `applyRosterUnit` states all four channels in every version.
//  - `level`, `weapon` and `armor`, on a **roster** side whose fixture names none of them and
//    whose loadout the identity does not lock. `applyRosterUnit` does not state the three, and the
//    only writes over them are the lock reset and the fixture's own. A custom side is not
//    affected: `presetCustomCardState` restates all three from `UNIT_DEFAULTS`.
//
// Everything else — every stat, every ability row, both special blocks, the identity, `cityWalls`,
// `dmg`, `generic` and all of `globals` — is written unconditionally by the sequence below.
//
// Measured, those four differ on **no** shipped fixture: `tests/preset-applier-f260.6.spec.js`
// compares the page's finished card against this applier's for the whole corpus, base included,
// with no exemption for them. They are named here as the surface a caller's `base` can reach, not
// as a known disagreement.
function presetDefaultCardState(prefix, version) {
  const s = UNIT_DEFAULTS;
  const source = `Default card state for side ${prefix}`;
  const abilities = presetAbilityValues({}, {}, source);
  return {
    prefix,
    abilities,
    modernSpecial: cardStateModernSpecialMirror(abilities),
    dosSpecial: cardStateDosSpecialBlock(abilities, null),
    level: String(s.level),
    weapon: String(s.weapon),
    armor: String(s.armor),
    figs: String(s.figs),
    atk: String(s.atk),
    rtb: String(s.rtb),
    def: String(s.def),
    res: String(s.res),
    hp: String(s.hp),
    dmg: String(s.dmg),
    toBlkMod: String(s.toBlkMod),
    cityWalls: String(s.cityWalls),
    rtbType: String(s.rtbType),
    modernAttacks: {
      ranged: '0', rangedType: 'none', thrown: '0', fireBreath: '0', lightningBreath: '0',
    },
    toHitMod: String(s.toHitMod),
    toHitRtbMod: String(s.toHitRtbMod),
    hitChance: String(s.hitChance),
    hitMelee: String(s.hitMelee),
    hitRanged: String(s.hitRanged),
    hitThrown: String(s.hitThrown),
    hitBreath: String(s.hitBreath),
    identity: customCardIdentity({}, version, source),
    generic: false,
  };
}

// One side's card state as the fixture's own stat block states it — the state half of `setUnit`
// (`ui_state.js`), in the order `setUnit` writes it. The card's number inputs hold strings, so
// every scalar is stringified: writing this state to the controls and reading it back is then a
// fixpoint.
function presetCustomCardState(state, name, prefix, fixture, version) {
  const source = `Preset '${name}' side ${prefix}`;
  assertFixtureMatchesVersionRecord(name, prefix, fixture, version);
  const s = { ...UNIT_DEFAULTS, ...fixture };
  const identity = presetIdentity(s, version, source);
  // A CoM2/Warlord fixture states the card's four named channels through `modernAttacks`, and that
  // statement is complete: an unnamed channel is empty. Off the modern versions the page writes
  // nothing here at all, so the base state's channels stand — see `presetDefaultCardState`.
  const channels = s.modernAttacks || {};
  const strength = key => String((channels[key] && channels[key].strength) || 0);
  const modernAttacks = cardStateIsModernVersion(version) ? {
    ranged: strength('ranged'),
    rangedType: presetModernRangedToken(
      channels.ranged ? channels.ranged.type : 'none', source),
    thrown: strength('thrown'),
    fireBreath: strength('fireBreath'),
    lightningBreath: strength('lightningBreath'),
  } : { ...state.modernAttacks };
  // `clearAbilities` then `applyAbilities`, which is one pass over every def.
  const abilities = presetAbilityValues(state.abilities, s.abilities, source);
  return {
    ...state,
    abilities,
    // Both special blocks are mirrored off the fixture's ability rows, in the order the card
    // performs them: the modern nine-value block first, then the DOS shared byte. `setUnit`
    // performs no DOS write-back, so the ability rows keep the fixture's own values.
    modernSpecial: { ...(state.modernSpecial || {}), ...cardStateModernSpecialMirror(abilities) },
    dosSpecial: cardStateDosSpecialBlock(abilities, null),
    identity,
    // A custom side has no roster record behind it, so `updateUnitLock` drops the record the
    // `generic` flag comes from.
    generic: false,
    figs: String(s.figs),
    atk: String(s.atk),
    rtbType: sharedSlotTypeForToken(s.rtbType, version, source),
    rtb: String(s.rtb),
    modernAttacks,
    def: String(s.def),
    res: String(s.res),
    toHitMod: String(s.toHitMod),
    toHitRtbMod: String(s.toHitRtbMod),
    hitChance: String(s.hitChance),
    hitMelee: String(s.hitMelee),
    hitRanged: String(s.hitRanged),
    hitThrown: String(s.hitThrown),
    hitBreath: String(s.hitBreath),
    toBlkMod: String(s.toBlkMod),
    hp: String(s.hp),
    cityWalls: String(s.cityWalls),
    dmg: String(s.dmg),
    weapon: String(s.weapon),
    armor: String(s.armor || 'normal'),
    level: String(s.level),
  };
}

// The battlefield-wide statement, `applyPreset`'s globals tail as one object. The card's controls
// hold strings, so the three that are selects or number inputs are stringified and the rest are
// the booleans their checkboxes hold.
//
// `perSide` is not read from the preset: Eternal Night and Eye of Heaven are ability controls on
// an owner's panel (`CROSS_SIDE_ENCHANTMENT_KEYS`), so the finished card states are what state
// them, and `preset.eternalNight` has already been written into the owning side's abilities by the
// caller below.
function presetGlobals(preset, version, states) {
  const perSide = { a: {}, b: {} };
  for (const def of crossSideEnchantmentDefs()) {
    for (const side of ['a', 'b']) {
      perSide[side][def.key] = !!states[side].abilities[cardStateAbilityUiKey(def)];
    }
  }
  // The historical single-select spelling of the two battlefield light enchantments. It never
  // clears an explicit `trueLight`/`darkness`, only adds to it, which is the `||` the page writes.
  const legacyLightDark = preset.enchLightDark || 'none';
  return {
    version,
    nodeAura: String(preset.nodeAura || 'none'),
    wallOfFire: !!preset.wallOfFire,
    trueLight: !!preset.trueLight || legacyLightDark === 'trueLight',
    darkness: !!preset.darkness || legacyLightDark === 'darkness',
    chaosSurge: String(preset.chaosSurge || 0),
    rangedCheck: !!preset.rangedCheck,
    rangedDist: String(preset.rangedDist || 1),
    warpReality: !!preset.warpReality,
    chaosConjunction: !!preset.chaosConjunction,
    hurricane: !!preset.hurricane,
    poxHost: !!preset.poxHost,
    perSide,
  };
}

// The side an `eternalNight` fixture names. The page reads the token as a two-valued one — the
// string `defender` and everything else — and a fixture naming a third thing silently got side a,
// which is a different battlefield stated without a word.
const PRESET_ETERNAL_NIGHT_SIDES = { attacker: 'a', defender: 'b' };

function presetEternalNightSide(name, token) {
  const side = PRESET_ETERNAL_NIGHT_SIDES[token];
  if (!side) {
    throw new Error(
      `Preset '${name}': eternalNight names side ${JSON.stringify(token)}, which is neither `
      + `${Object.keys(PRESET_ETERNAL_NIGHT_SIDES).join(' nor ')}.`);
  }
  return side;
}

// The roster records a version ships, which is the one question the preset applier had to ask the
// page. Passing `loadUnitDatabase` in as a callback was the first shape, and the F260.6 review
// showed why it was the wrong one: a callback receives the version but nothing checks that it
// *read* it, so a provider ignoring its argument applies the MoM Hell Hounds record under CoM2
// rules — a different unit, stated silently, which is the failure F260 exists to prevent. The
// records are core data (`VERSION_DATA`, `data.js`), so the applier reads them itself and
// `loadUnitDatabase` (`ui_units.js`) is the page's caching caller rather than the source.
function rosterRecordsForVersion(version) {
  const data = VERSION_DATA[version];
  if (!data) {
    throw new Error(
      `rosterRecordsForVersion: no roster for game version '${version}' `
      + `(expected one of ${Object.keys(VERSION_DATA).join(', ')}).`);
  }
  return Object.values(data);
}

// A fixture that names no `version` of its own takes its TEST_TREE group's. The tree is page data
// and its render loop is where the map used to be built, which made the rule unreadable to anything
// but the page — including the checks that must resolve a fixture the way the buttons do. It is a
// pure fold over the tree, so it is stated here and the renderer folds it in.
function presetVersionsFromTestTree(tree) {
  const versions = {};
  for (const group of tree || []) {
    if (!group.version) continue;
    for (const sub of group.subs || []) {
      for (const key of sub.keys || []) versions[key] = group.version;
    }
  }
  return versions;
}

// The whole applier. Options:
//
//  - `origin`     — the caller's own context, `assertPresetRangedMode`'s exemption (`PRESET_ORIGINS`).
//  - `version`    — the version *selected when the preset is applied*. It is the fallback for a
//                   fixture naming none, and it is also how the applier knows whether the version
//                   changed, which decides the loadout reset above. `applyPreset` reads the version
//                   select for both; a control-free caller states it.
//  - `presetVersions` — the TEST_TREE group-version map (`PRESET_VERSIONS`, `ui_state.js`), whose
//                   entry stands for a fixture that names no `version` of its own. Optional,
//                   because a caller reading the corpus directly has no tree to read it from.
//  - `base`       — `{ a, b }` card states the preset is applied over. Defaults to the card
//                   `resetUnitFields` writes, which is not the one a fresh page holds; see
//                   `presetDefaultCardState` for that and for the four fields `base` can change.
function presetToCardState(name, preset, options = {}) {
  if (typeof name !== 'string' || !name) {
    throw new Error('presetToCardState: the preset name is '
      + JSON.stringify(name) + ', which is not a name.');
  }
  if (!preset || typeof preset !== 'object' || Array.isArray(preset)) {
    throw new Error(`presetToCardState('${name}'): the fixture is `
      + JSON.stringify(preset) + ', which is not a preset object.');
  }
  const { origin = 'authored', presetVersions, base } = options;
  const version = preset.version || (presetVersions || {})[name] || options.version;
  if (typeof version !== 'string' || !VERSION_DATA[version]) {
    throw new Error(`presetToCardState('${name}'): the fixture resolves to game version `
      + `${JSON.stringify(version)}, which names none of `
      + `${Object.keys(VERSION_DATA).join(', ')}. A fixture states its own \`version\`, or the `
      + 'caller states the selected one.');
  }

  // `clearAbilities('a')` and `clearAbilities('b')`, before either side is stated. It is what
  // makes the roster path's narrow overlay meaningful: the enchantment rows are empty when
  // `applyRosterUnit` restates the innate ones, so only the fixture's own enchantments survive.
  const states = {};
  for (const prefix of ['a', 'b']) {
    const start = (base && base[prefix]) || presetDefaultCardState(prefix, version);
    states[prefix] = {
      ...start,
      prefix,
      abilities: presetAbilityValues(start.abilities, {}, `Preset '${name}' side ${prefix}`),
    };
    // The one state-bearing effect of the version switch. `applyPreset` runs `onVersionChange`
    // before it states either side, and that runs `updateUnitLock` -> `updateCustomLevelState`,
    // which resets a locked Level or Weapon **under the new version** — over the card as it
    // stands, before the preset has touched it. It shows on a field the preset then does not
    // restate, which is exactly the `level`/`weapon` residue named at `presetDefaultCardState`:
    // a fantastic side carrying `elite` under Warlord with Spirit Link ticked loses the level
    // when the preset switches to CoM2, where Spirit Link lifts no lock (F260.6 review,
    // finding 2). The abilities are read from `start`, not from the cleared copy above, because
    // on the page the clear has not happened yet at this point.
    if (options.version && options.version !== version) {
      const locks = cardStateLoadoutLocks(start.identity, start.abilities.spiritLink, version);
      if (locks.level) states[prefix].level = 'normal';
      if (locks.weapon) states[prefix].weapon = 'normal';
    }
  }

  // Each side's unit, roster or custom, in `applyPreset`'s order. A fixture naming a roster unit is
  // asserting a number about *that record*, so a name the version's roster does not carry halts
  // rather than falling back to the fixture's stat block.
  for (const prefix of ['a', 'b']) {
    const fixture = preset[prefix] || {};
    const unitName = preset[prefix + 'UnitName'];
    if (unitName) {
      const match = rosterRecordsForVersion(version).find(u => u.name === unitName);
      if (!match) {
        throw new Error(
          `Preset '${name}': roster unit '${unitName}' is not in the ${version} roster.`);
      }
      states[prefix] = applyRosterUnit(states[prefix], match, version);
    } else {
      states[prefix] = presetCustomCardState(states[prefix], name, prefix, fixture, version);
    }
    // `updateUnitLock`'s selection-time loadout reset, which runs for both paths: a unit whose
    // identity locks Level or Weapon is put back to `normal` before the fixture's own level and
    // weapon are re-applied below. `updateLoadoutLocks` resets Armor too, and so does the gating
    // pass at the end.
    const locks = cardStateLoadoutLocks(states[prefix].identity,
      states[prefix].abilities.spiritLink, version);
    if (locks.level) states[prefix].level = 'normal';
    if (locks.weapon) states[prefix].weapon = 'normal';
  }

  // The roster side's enchantment overlay, after both sides are stated.
  for (const prefix of ['a', 'b']) {
    if (!preset[prefix + 'UnitName']) continue;
    states[prefix].abilities = applyPresetEnchantmentOverlay(states[prefix].abilities,
      preset[prefix] && preset[prefix].abilities, `Preset '${name}' side ${prefix}`);
  }

  // The identity block. A custom side already carries `presetIdentity`'s answer — the whole one,
  // the fixture's display name included (F260.5) — which is what the page rebuilds here from the
  // controls it wrote. A roster side keeps the record's identity, which is why the page's loop
  // skips it.

  // The fixture's own level and weapon, after the loadout reset above and therefore able to
  // survive it. `applyPreset` writes them for both paths, so a roster fixture can state a level.
  for (const prefix of ['a', 'b']) {
    const fixture = preset[prefix];
    if (fixture && fixture.level) states[prefix].level = String(fixture.level);
    if (fixture && fixture.weapon) states[prefix].weapon = String(fixture.weapon);
  }

  // City walls are a card field, not a global, and side b's falls back to the fixture-level
  // `cityWalls` the older fixtures state.
  states.a.cityWalls = String((preset.a && preset.a.cityWalls) || 'none');
  states.b.cityWalls = String((preset.b && preset.b.cityWalls) || preset.cityWalls || 'none');

  // Eternal Night is a battlefield enchantment whose control sits on one side's panel, so the
  // fixture's side token writes that side's ability row. The page only ever sets it, never clears
  // it, which is the same thing here because both sides were cleared above.
  if (preset.eternalNight) {
    const side = presetEternalNightSide(name, preset.eternalNight);
    states[side].abilities.eternalNight = true;
  }

  // The special-unit selector's derived Elements value, which `refreshAbilityFieldVisibility` runs
  // for both sides before the gating pass. `applyRosterUnit` has already stated it for a roster
  // side; restating it is idempotent and is what covers a custom side naming Golem.
  for (const prefix of ['a', 'b']) {
    if (specialUnitDerivesResistElements(version, states[prefix].identity.specialUnit)) {
      states[prefix].abilities.elemArmor = 'resistElements';
    }
  }

  // Version gating, last, exactly as `refreshAbilityFieldVisibility` runs it last, through
  // `abilityVersionGated` (`ability_gating.js`) — the one gating test there is (F261).
  const gated = {
    a: applyVersionGating(states.a, version),
    b: applyVersionGating(states.b, version),
  };
  const globals = applyGlobalVersionGating(presetGlobals(preset, version, gated));

  // The ranged-mode withdrawal and the two asserts. Side a is derived under the globals as the
  // fixture stated them — which is the record `updateTypeVisibility` asks — and the tick survives
  // only if that record carries a conventional ranged attack.
  const sideA = deriveUnitStats(cardStateToDerivationInput(gated.a, globals));
  const held = globals.rangedCheck && hasConventionalRangedAttack(sideA);
  globals.rangedCheck = held;
  assertPresetRangedMode(name, preset, origin, {
    held,
    describeSideA: () => deriveUnitStats(cardStateToDerivationInput(gated.a, globals)),
  });

  return { version, a: gated.a, b: gated.b, globals };
}
