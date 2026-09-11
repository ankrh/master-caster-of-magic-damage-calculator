// --- UI Layer: the stat card ---
// Reads the panel controls into a card state, renders the modern and DOS special-value blocks
// beside them, and writes the derived stats back onto the card. Turning a card state into
// derivation input is `card_state.js`, which is `data-scope="core"` and touches no DOM.


// --- The card's DOM read ---
// Everything below reads controls and nothing else: what the projection then does with the
// values lives in `card_state.js`, which holds no DOM reference and is `data-scope="core"`.

// Read one side's controls into a card state — one entry per control, nothing merged, both
// engine families' fields present. What the controls hold, not what the derivation wants.
function collectCardState(prefix) {
  const el = id => document.getElementById(id);
  // A card stat the derivation always needs: a card missing one is a broken page, not a default.
  const required = suffix => {
    const node = el(prefix + suffix);
    if (!node) {
      throw new Error(`collectCardState: the card for side '${prefix}' has no control `
        + `'${prefix + suffix}'.`);
    }
    return node.value;
  };
  const optional = suffix => (el(prefix + suffix) || {}).value;

  const abilities = {};
  for (const abil of abilityUiDefs()) {
    const val = getAbilityControlValue(prefix, abil);
    if (val === undefined) continue;
    abilities[cardStateAbilityUiKey(abil)] = val;
  }

  // The modern card's nine-value block. `on` is `null` for the entries whose def is not a
  // numcheck: they carry no tick box, so their value always counts.
  const modernSpecial = {};
  for (const [key] of MODERN_SPECIAL_FIELDS) {
    const input = el(prefix + 'Modern_' + key);
    if (!input) continue;
    const chk = el(prefix + 'Modern_' + key + '_on');
    modernSpecial[key] = { on: chk ? chk.checked : null, value: parseInt(input.value, 10) || 0 };
  }

  // The DOS shared special byte and the flags naming which effects read it.
  const magEl = el(prefix + 'DosSpecial');
  const dosFlags = {};
  for (const [key] of DOS_SPECIAL_CONSUMERS) {
    const chk = el(prefix + 'DosFlag_' + key);
    if (chk) dosFlags[key] = chk.checked;
  }

  return {
    prefix,
    abilities,
    modernSpecial,
    dosSpecial: {
      magnitude: magEl ? (parseInt(magEl.value, 10) || 0) : undefined,
      flags: dosFlags,
    },
    level: required('Level'),
    weapon: required('Weapon'),
    armor: required('Armor'),
    figs: required('Figs'),
    atk: required('Atk'),
    rtb: required('Rtb'),
    def: required('Def'),
    res: required('Res'),
    hp: required('HP'),
    dmg: required('Dmg'),
    toBlkMod: required('ToBlkMod'),
    cityWalls: required('CityWalls'),
    // The DOS shared slot's type select. Absent on a card that has none, which is what
    // `cardStateSharedSlotRangedType` treats as no type stated.
    rtbType: optional('RtbType'),
    // The modern card's four channels, raw. The projection nulls the whole record for a DOS
    // version and halts there on a field a modern version needs and the card does not carry.
    modernAttacks: {
      ranged: optional('ModernRanged'),
      rangedType: optional('ModernRangedType'),
      thrown: optional('ModernThrown'),
      fireBreath: optional('ModernFireBreath'),
      lightningBreath: optional('ModernLightningBreath'),
    },
    // Both To-Hit records; the projection states the version's.
    toHitMod: optional('ToHitMod'),
    toHitRtbMod: optional('ToHitRtbMod'),
    hitChance: optional('HitChance'),
    hitMelee: optional('HitMelee'),
    hitRanged: optional('HitRanged'),
    hitThrown: optional('HitThrown'),
    hitBreath: optional('HitBreath'),
    // One identity, already resolved between the roster record and the editable controls
    // (`cardIdentity`, `ui_units.js`). A caller with no controls states the same field through
    // `rosterCardIdentity`, `customCardIdentity` or `presetIdentity` (`card_state.js`).
    identity: cardIdentity(prefix),
    generic: !!(unitBaseStats[prefix] && unitBaseStats[prefix].generic),
  };
}

// The battlefield-wide controls, plus the two per-side enchantments the opposing card reads.
// `overrides` is the ranged-mode pair the ranged matrix and the ranged-check probes supply in
// place of the page's own controls; both are globals, so this is where they land.
function collectGlobals(overrides) {
  const el = id => document.getElementById(id);
  const overrideValues = overrides || {};
  const perSide = { a: {}, b: {} };
  for (const def of crossSideEnchantmentDefs()) {
    for (const side of ['a', 'b']) {
      perSide[side][def.key] = !!getAbilityControlValue(side, def);
    }
  }
  return {
    version: el('gameVersion').value,
    nodeAura: el('nodeAura').value,
    wallOfFire: !!el('wallOfFire').checked,
    trueLight: !!el('trueLight').checked,
    darkness: !!el('darkness').checked,
    chaosSurge: el('chaosSurge').value,
    rangedCheck: overrideValues.rangedCheck !== undefined
      ? overrideValues.rangedCheck : !!el('rangedCheck').checked,
    rangedDist: overrideValues.rangedDist !== undefined
      ? overrideValues.rangedDist : el('rangedDist').value,
    warpReality: !!el('warpReality').checked,
    chaosConjunction: !!el('chaosConjunction').checked,
    hurricane: !!el('hurricane').checked,
    poxHost: !!el('poxHost').checked,
    perSide,
  };
}

// The writer counterpart. A modern-only projectile token has no spelling in the shared-slot
// select, so assigning one left the control holding a value no `<option>` offers — the blank the
// restore boundary now rejects (`ui_state.js`, `assertRestoredValuesAreOffered`). The modern card
// states those through its own selector, which the reader above prefers over this slot anyway. A
// token neither family has is a caller error rather than something to write blank.
//
// Which token the slot ends up holding is `sharedSlotTypeForToken` (`card_state.js`), so this
// writer and the pure roster statement resolve a projectile identically. What stays here is the
// check that the rendered control really offers what the rule produced: the rule reads the
// vocabulary constants `index.html`'s `<option>` list is built from, and a drift between the two
// must be loud rather than leave a select holding a value it does not offer.
function setSharedSlotRangedType(prefix, token, source) {
  const slot = document.getElementById(prefix + 'RtbType');
  const resolved = sharedSlotTypeForToken(
    token, document.getElementById('gameVersion').value, source);
  const offered = Array.from(slot.options).map(opt => opt.value);
  if (!offered.includes(resolved)) {
    throw new Error(
      `${source}: the shared slot resolves attack type '${token}' to '${resolved}', which #${prefix}`
      + `RtbType does not offer (${offered.join(', ')}).`);
  }
  slot.value = resolved;
}

// The control each card-state scalar is held in. The card state's field names and the control ids
// were spelled apart long before there was a card state, so the two vocabularies are related by
// this table and nowhere else — which is what lets the writer below walk the *reader's* field lists
// and halt on a field it has no control for.
const CARD_CONTROL_SUFFIX = {
  level: 'Level', weapon: 'Weapon', armor: 'Armor', figs: 'Figs', atk: 'Atk', rtb: 'Rtb',
  def: 'Def', res: 'Res', hp: 'HP', dmg: 'Dmg', toBlkMod: 'ToBlkMod', cityWalls: 'CityWalls',
  toHitMod: 'ToHitMod', toHitRtbMod: 'ToHitRtbMod', hitChance: 'HitChance', hitMelee: 'HitMelee',
  hitRanged: 'HitRanged', hitThrown: 'HitThrown', hitBreath: 'HitBreath',
};

function cardControlSuffix(field) {
  const suffix = CARD_CONTROL_SUFFIX[field];
  if (!suffix) {
    throw new Error(`cardControlSuffix: the card state field '${field}' names no card control. `
      + 'A field the card state carries is a field the card writes, so either the control is '
      + 'missing from CARD_CONTROL_SUFFIX or the field does not belong on the state.');
  }
  return suffix;
}

// The card's writer: the deliberate inverse of `collectCardState` above. Every control that read
// states one field, and this writes that field back to it — so `collectCardState` after this is a
// fixpoint over any state whose scalars are strings, which is what `applyRosterUnit` and
// `presetToCardState` (`card_state.js`) both produce. Value decisions do not live here; this
// function only moves them onto the page, which is what keeps the DOM path and the pure path from
// computing different units.
//
// The two JS-side facts the reader takes from the page's own maps are written too, because
// otherwise the round trip is lossy on exactly the fields F260.5 put on the state: the identity
// (`unitIdentity`, which carries the template ids and the display name a `<select>` cannot hold)
// and the roster `generic` flag (`unitBaseStats`). Writing the identity record from the state is
// what drops `_preGolemElemArmor`, the page's undo buffer for the Elements control — see the
// note in `card_state.js` at `presetToCardState`; the buffer is a memory of a previous selection
// and a stated card has none.
//
// What does **not** round-trip, and why:
//
//  - **A non-string scalar.** `el.value = 5` reads back `'5'`. The fixpoint is over string-valued
//    states by construction, not over every object shaped like one.
//  - **A special-unit key the selected version disallows.** `setIdentityControls` clamps it to
//    `none`, exactly as the selector does. `customCardIdentity` (`card_state.js`) applies the same
//    clamp when a state is stated, so a state built by either producer is already clamped.
//  - **An ability value whose control this build does not render.** The reader skips a missing
//    control and so does the writer; the state keeps the key and the card never carries it.
//  - **A `num` def holding `true`.** The writer stores `1`, which the reader returns as `1`.
//    `presetAbilityValues` normalises fixture booleans, so no stated card state carries one.
function writeCardStateToControls(prefix, state, source) {
  const version = document.getElementById('gameVersion').value;
  const set = (suffix, value) => {
    const el = document.getElementById(prefix + suffix);
    if (!el) {
      throw new Error(`writeCardStateToControls: the card for side '${prefix}' has no control `
        + `'${prefix + suffix}' (${source}).`);
    }
    el.value = value;
  };
  // A control the card may not carry at all — the reader reads it with `optional`, so the writer
  // skips it rather than halting.
  const setOptional = (suffix, value) => {
    const el = document.getElementById(prefix + suffix);
    if (el) el.value = value;
  };

  // Identity first: the option list the special-unit selector offers is version-scoped and has to
  // exist before the value is written, and the legacy compact token is derived from the record.
  setCardStateIdentityRecord(prefix, state.identity, version);
  // Before any ability row is written, because what it remembers is the Elements value this write
  // is about to replace.
  setCardStateGolemMemory(prefix, state.identity, version);
  populateSpecialUnitOptions(prefix, version, state.identity.specialUnit);
  setIdentityControls(prefix, state.identity);
  syncLegacyUnitTypeControl(prefix, legacyUnitTypeFromIdentity(unitIdentity[prefix]));
  unitBaseStats[prefix] = { generic: !!state.generic };

  // Driven by the reader's own field lists (`card_state.js`) rather than by a second list of the
  // same fields: a field added to `REQUIRED_CARD_STATE_FIELDS` that this writer has no control for
  // halts here, instead of round-tripping to whatever the control happened to hold.
  for (const field of REQUIRED_CARD_STATE_FIELDS) set(cardControlSuffix(field), state[field]);
  for (const field of [...DOS_TO_HIT_FIELDS, ...MODERN_TO_HIT_FIELDS]) {
    setOptional(cardControlSuffix(field), state[field]);
  }

  setSharedSlotRangedType(prefix, state.rtbType, source);
  const attacks = state.modernAttacks || {};
  set('ModernRanged', attacks.ranged);
  set('ModernThrown', attacks.thrown);
  set('ModernFireBreath', attacks.fireBreath);
  set('ModernLightningBreath', attacks.lightningBreath);
  const type = document.getElementById(prefix + 'ModernRangedType');
  const offered = Array.from(type.options).map(opt => opt.value);
  if (!offered.includes(attacks.rangedType)) {
    throw new TypeError(
      `${source}: the modern Ranged channel states projectile type `
      + `${JSON.stringify(attacks.rangedType)}, which names no type #${prefix}ModernRangedType `
      + `offers (${offered.join(', ')}).`);
  }
  type.value = attacks.rangedType;

  // Every ability row the state carries, innate and enchantment alike. `applyRosterUnit` carries
  // the enchantment rows through from the state it was given, so a roster statement writes them
  // back unchanged; a preset states them itself.
  for (const abil of abilityUiDefs()) {
    setAbilityControlValue(prefix, abil, state.abilities[cardStateAbilityUiKey(abil)]);
  }
  // Both blocks are written from the state rather than re-derived off the controls. The modern
  // one is a mirror of the ability rows, but of the rows **before** the DOS write-back: the card
  // performs the mirror between the two DOS steps, so in a DOS version the modern block holds the
  // record's parsed consumer values and not the shared magnitude the ability rows end up with.
  // That is what `applyRosterUnit` states, and the difference is invisible to the derivation
  // because `cardStateModernSpecialValues` reads the block only in the modern versions, where
  // there is no write-back at all.
  writeModernSpecialCard(prefix, state.modernSpecial);
  writeDosSpecialCard(prefix, state.dosSpecial);
}

// The battlefield-wide writer: the inverse of `collectGlobals`, minus the two fields no control of
// its own holds. `version` is the version selector, which a caller writes before anything else
// because the whole page is rebuilt around it; `perSide` is Eternal Night and Eye of Heaven, which
// are ability rows on the owning side's panel and are therefore written by
// `writeCardStateToControls`.
function writeGlobalsToControls(globals) {
  const set = (id, value) => {
    const el = document.getElementById(id);
    if (!el) throw new Error(`writeGlobalsToControls: the page has no control '${id}'.`);
    if (el.type === 'checkbox') el.checked = !!value; else el.value = value;
  };
  // The reader's own list, so a global added to `REQUIRED_GLOBAL_FIELDS` reaches its control
  // without a second list being updated in step. Every id there is the control's id.
  for (const field of REQUIRED_GLOBAL_FIELDS) {
    if (field === 'version') continue;
    set(field, globals[field]);
  }
}

// Read DOM inputs and compute all effective stats for a unit.
// Returns a stat object suitable for both display and resolveCombat.
//
// Two steps with one home each: `collectCardState`/`collectGlobals` read the controls, and
// `cardStateToDerivationInput` (`card_state.js`, `data-scope="core"`) turns what they hold into
// the derivation's input. Production runs that projection, so a caller that builds a card state
// without controls reaches the same one rather than a second translation beside it.
function readUnitStats(prefix, overrides) {
  return deriveUnitStats(
    cardStateToDerivationInput(collectCardState(prefix), collectGlobals(overrides)));
}

// `hasConventionalRangedAttack` moved to `card_state.js` (`data-scope="core"`) with the preset
// applier, which is a fourth asker and may not reach a page symbol.

// The writer for a modern block a caller already decided — the roster path's, computed by
// `applyRosterUnit`. `syncModernSpecialCard` below is the same write with the block taken off the
// ability rows instead.
function writeModernSpecialCard(prefix, block) {
  for (const [key] of MODERN_SPECIAL_FIELDS) {
    const entry = (block || {})[key];
    if (!entry) continue;
    const target = document.getElementById(prefix + 'Modern_' + key);
    if (target) target.value = entry.value;
    const targetChk = document.getElementById(prefix + 'Modern_' + key + '_on');
    if (targetChk && entry.on !== null) targetChk.checked = entry.on;
  }
}

// The ability control stays the stored state (unit rosters, presets and state restore all
// write it), so the two copies mirror each other in both directions.
function syncModernSpecialCard(prefix) {
  for (const [key] of MODERN_SPECIAL_FIELDS) {
    const source = document.getElementById(prefix + 'Abil_' + key);
    const target = document.getElementById(prefix + 'Modern_' + key);
    if (source && target) target.value = source.value || 0;
    const sourceChk = document.getElementById(prefix + 'Abil_' + key + '_on');
    const targetChk = document.getElementById(prefix + 'Modern_' + key + '_on');
    if (sourceChk && targetChk) targetChk.checked = sourceChk.checked;
  }
}

// In CoM2 & Warlord these nine values get their own two-column block on the stat card, so the
// ability-section rows would be a second control for the same number: hide them there. The
// ability controls stay in the DOM and keep holding the state — the card mirrors them.
// `abil-duplicate` is deliberately not `abil-hidden`, which updateAbilityVisibility owns.
function updateModernSpecialDuplicates(modern) {
  const keys = new Set(MODERN_SPECIAL_FIELDS.map(([key]) => key));
  document.querySelectorAll('.abil-item').forEach(item => {
    if (keys.has(item.dataset.abilKey)) item.classList.toggle('abil-duplicate', modern);
  });
}

function syncModernSpecialAbility(prefix, key) {
  const card = document.getElementById(prefix + 'Modern_' + key);
  const abil = document.getElementById(prefix + 'Abil_' + key);
  if (card && abil) abil.value = card.value;
  const cardChk = document.getElementById(prefix + 'Modern_' + key + '_on');
  const abilChk = document.getElementById(prefix + 'Abil_' + key + '_on');
  if (cardChk && abilChk) abilChk.checked = cardChk.checked;
}

function buildModernSpecialCard(prefix) {
  const fields = document.querySelector('#panel' + (prefix === 'a' ? 'A' : 'B') + ' .panel-fields');
  // Two label+input pairs per row (four grid columns) — nine gaze/touch/special values would
  // otherwise cost nine full-width rows in the stat grid.
  const grid = document.createElement('div');
  grid.className = 'modern-special-grid modern-special version-hidden';
  fields.append(grid);
  for (const [key, label] of MODERN_SPECIAL_FIELDS) {
    const id = prefix + 'Modern_' + key;
    const def = abilityDefByKey(key);
    // Column 1 of each pair: the on/off checkbox (numcheck entries only) beside the label,
    // matching the ability row this replaces.
    const cell = document.createElement('span');
    cell.className = 'modern-special-label';
    if (def && def.tooltip) cell.dataset.tooltip = def.tooltip;
    if (def && def.type === 'numcheck') {
      const chk = document.createElement('input');
      chk.type = 'checkbox';
      chk.id = id + '_on';
      chk.addEventListener('change', () => syncModernSpecialAbility(prefix, key));
      cell.appendChild(chk);
    }
    const lbl = document.createElement('label');
    lbl.htmlFor = id;
    lbl.textContent = label;
    cell.appendChild(lbl);
    const input = document.createElement('input');
    input.id = id;
    input.type = 'number'; input.min = '-50'; input.max = '50'; input.value = '0';
    if (def && def.tooltip) input.dataset.tooltip = def.tooltip;
    input.addEventListener('input', () => syncModernSpecialAbility(prefix, key));
    input.addEventListener('change', () => syncModernSpecialAbility(prefix, key));
    grid.append(cell, input);
    const source = document.getElementById(prefix + 'Abil_' + key);
    if (source) source.addEventListener('input', () => syncModernSpecialCard(prefix));
    if (source) source.addEventListener('change', () => syncModernSpecialCard(prefix));
    const sourceChk = document.getElementById(prefix + 'Abil_' + key + '_on');
    if (sourceChk) sourceChk.addEventListener('change', () => syncModernSpecialCard(prefix));
  }
}
// --- DOS shared special-value block ---
// The record model this block renders — which effects consume the shared `Spec_Att_Attrib`
// byte, with what sign, and how `ranged_type` selects the gazes — lives in
// `combat_special_attacks.js` beside the effects it governs, with its citations. This file
// builds the controls and marshals their state into it.

// Card -> ability controls. Each ticked consumer takes the shared magnitude with its own
// sign; an unticked one reverts to the def's absent value, which for a numcheck is null
// rather than 0 because the engine distinguishes the two.
// The rule is `dosSpecialAbilityWriteback` (`card_state.js`); this reads the block off the card's
// own controls and writes the result onto the ability rows.
function syncDosSpecialAbilities(prefix) {
  const block = dosSpecialCardBlock(prefix);
  if (!block) return;
  const values = dosSpecialAbilityWriteback({}, block, `#${prefix}DosSpecial`);
  for (const [key] of DOS_SPECIAL_CONSUMERS) {
    const def = abilityDefByKey(key);
    if (!def || !document.getElementById(prefix + 'DosFlag_' + key)) continue;
    setAbilityControlValue(prefix, def, values[key]);
  }
}

// The DOS block as the card's own controls hold it: the shared magnitude and the consumer flags.
// `null` where the card has no such block at all.
function dosSpecialCardBlock(prefix) {
  const magEl = document.getElementById(prefix + 'DosSpecial');
  if (!magEl) return null;
  const flags = {};
  for (const [key] of DOS_SPECIAL_CONSUMERS) {
    const chk = document.getElementById(prefix + 'DosFlag_' + key);
    if (chk) flags[key] = chk.checked;
  }
  return { magnitude: Math.abs(parseInt(magEl.value, 10) || 0), flags };
}

// The writer for a DOS block a caller already decided — the roster path's, computed by
// `applyRosterUnit`. `syncDosSpecialCard` below is the same write with the block read off the
// ability rows instead.
function writeDosSpecialCard(prefix, block) {
  const magEl = document.getElementById(prefix + 'DosSpecial');
  if (!magEl || !block) return;
  for (const [key] of DOS_SPECIAL_CONSUMERS) {
    const chk = document.getElementById(prefix + 'DosFlag_' + key);
    if (chk && block.flags[key] !== undefined) chk.checked = block.flags[key];
  }
  magEl.value = block.magnitude;
}

// Ability controls -> card, for presets and state restore, which describe the DOS special
// values by ability key and so are the only remaining places a magnitude has to be recovered
// from them. `byte` is the roster path: the record states `Spec_Att_Attrib` directly, so the
// flags come from the tokens but the magnitude never does.
// The rule — which flags are ticked, and where the magnitude comes from when the caller states no
// byte — is `cardStateDosSpecialBlock` (`card_state.js`); this reads the ability rows it works
// from and writes the block it produces.
function syncDosSpecialCard(prefix, byte) {
  if (!document.getElementById(prefix + 'DosSpecial')) return;
  const values = {};
  for (const key of [...DOS_SPECIAL_CONSUMERS.map(([consumer]) => consumer), ...DOS_GAZE_KEYS]) {
    const def = abilityDefByKey(key);
    if (!def) continue;
    const val = getAbilityControlValue(prefix, def);
    if (val !== undefined) values[key] = val;
  }
  writeDosSpecialCard(prefix, cardStateDosSpecialBlock(values, byte));
}

// Mirror of updateModernSpecialDuplicates: in the DOS versions these values are on the card,
// so their ability rows would be a second control for the same state.
function updateDosSpecialDuplicates(dos) {
  const keys = new Set(DOS_SPECIAL_CONSUMERS.map(([key]) => key));
  // The gazes have no control at all in the DOS versions: the slot's type selects them and
  // the special value is their modifier, so an editable row would be a third source.
  for (const key of DOS_GAZE_KEYS) keys.add(key);
  document.querySelectorAll('.abil-item').forEach(item => {
    if (keys.has(item.dataset.abilKey)) item.classList.toggle('abil-duplicate-dos', dos);
  });
}

function buildDosSpecialCard(prefix) {
  const fields = document.querySelector('#panel' + (prefix === 'a' ? 'A' : 'B') + ' .panel-fields');
  const grid = document.createElement('div');
  grid.className = 'dos-special-grid dos-special-attack';
  // Directly under the shared strength/type slot, because the magnitude is that attack's
  // parameter as much as the touch riders' — placing it at the end of the card would hide
  // the connection the record makes.
  const anchor = document.getElementById(prefix + 'RtbMod');
  fields.insertBefore(grid, anchor ? anchor.nextSibling : null);

  const magTip = 'The DOS record\'s single special-value byte.\n'
    + 'Every ticked effect below reads this same number, as do the gazes.\n'
    + 'Touch riders take it as a save modifier, Poison Touch as a repeat count,\n'
    + 'Holy bonus and Res. to all as a magnitude.';
  const magLabelCell = document.createElement('span');
  magLabelCell.className = 'dos-special-label dos-special-magnitude';
  magLabelCell.dataset.tooltip = magTip;
  const magLabel = document.createElement('label');
  magLabel.htmlFor = prefix + 'DosSpecial';
  magLabel.textContent = 'Special value';
  magLabelCell.appendChild(magLabel);
  const magInput = document.createElement('input');
  magInput.id = prefix + 'DosSpecial';
  magInput.type = 'number'; magInput.min = '0'; magInput.max = '50'; magInput.value = '0';
  magInput.className = 'dos-special-magnitude';
  magInput.dataset.tooltip = magTip;
  magInput.addEventListener('input', () => syncDosSpecialAbilities(prefix));
  magInput.addEventListener('change', () => syncDosSpecialAbilities(prefix));
  grid.append(magLabelCell, magInput);

  for (const [key, label] of DOS_SPECIAL_CONSUMERS) {
    grid.append(buildDosFlagCell(prefix, key, label));
  }

  for (const [key] of DOS_SPECIAL_CONSUMERS) {
    const def = abilityDefByKey(key);
    if (!def) continue;
    const id = abilityControlId(prefix, def);
    for (const el of [document.getElementById(id), document.getElementById(id + '_on')]) {
      if (!el) continue;
      el.addEventListener('input', () => syncDosSpecialCard(prefix));
      el.addEventListener('change', () => syncDosSpecialCard(prefix));
    }
  }
}

function buildDosFlagCell(prefix, key, label) {
  const def = abilityDefByKey(key);
  const cell = document.createElement('span');
  cell.className = 'dos-special-label';
  if (def && def.tooltip) cell.dataset.tooltip = def.tooltip;
  const chk = document.createElement('input');
  chk.type = 'checkbox';
  chk.id = prefix + 'DosFlag_' + key;
  chk.addEventListener('change', () => syncDosSpecialAbilities(prefix));
  const lbl = document.createElement('label');
  lbl.htmlFor = chk.id;
  lbl.textContent = label;
  cell.append(chk, lbl);
  return cell;
}

// --- Modified Display ---

// The tooltip controller is initialized after the first calculation. Until then this is a no-op;
// afterwards it keeps a tooltip already open on a calculated output synchronized with that
// output's dynamic trace.
let refreshVisibleTooltipForElement = () => {};

// R7.4's chain presentation. These three sit at module scope because two callers render the
// same ordered chain in the same form: the card's final calculated values here, and the
// per-rider histograms' effective-resistance / effective-defense chains (`renderRiderPanels`,
// `ui.js`). One formatter, so the two cannot drift.
function formatTraceValue(value, trace) {
  if (trace && trace.unit === 'percent') return String(value) + '%';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === '' || value === null || value === undefined) return 'None / unaligned';
  return String(value);
}

function formatTraceSource(entry) {
  const source = entry.source || {};
  const raw = source.label || source.id || entry.id;
  if (source.label && source.label !== source.id) return source.label;
  return String(raw)
    .replace(/:/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTraceTooltip(trace) {
  const lines = ['Editable base: ' + formatTraceValue(trace.base, trace)];
  const callsByRoutine = new Map();
  for (const entry of trace.entries) {
    if (!entry.invocation) continue;
    const { routine, id } = entry.invocation;
    if (!callsByRoutine.has(routine)) callsByRoutine.set(routine, []);
    const calls = callsByRoutine.get(routine);
    if (!calls.includes(id)) calls.push(id);
  }
  let previousCall = null;
  for (const entry of trace.entries) {
    const calls = entry.invocation && callsByRoutine.get(entry.invocation.routine);
    if (calls && calls.length > 1 && entry.invocation.id !== previousCall) {
      lines.push('— ' + entry.invocation.label + ' (call '
        + (calls.indexOf(entry.invocation.id) + 1) + ') —');
    }
    previousCall = entry.invocation ? entry.invocation.id : null;
    // A boundary entry marks a position the engine crosses rather than a write, so it is
    // rendered without values: printing `5 → 5` would read as a transform that did nothing.
    if (entry.boundary) {
      lines.push('— ' + formatTraceSource(entry) + ' (phase ' + entry.phase + ') —');
      continue;
    }
    lines.push(formatTraceSource(entry) + ' (phase ' + entry.phase + '): '
      + formatTraceValue(entry.from, trace) + ' → ' + formatTraceValue(entry.to, trace));
  }
  lines.push('Displayed result: ' + formatTraceValue(trace.result, trace));
  return lines.join('\n');
}

// Show one final calculated value next to each editable base stat. R7.3's projection is
// authoritative for both the displayed result and its explanation: the UI only formats the
// existing ordered chain and never rebuilds modifier mechanics from controls.
function updateModifiedDisplay(prefix, stats) {
  const s = stats || readUnitStats(prefix);
  const traces = s.modifierTraces || {};

  function showTrace(id, trace) {
    const el = document.getElementById(id);
    if (!el) return;
    if (traceHasWrites(trace)) {
      el.textContent = formatTraceValue(trace.result, trace);
      el.dataset.tooltip = formatTraceTooltip(trace);
      el.classList.add('visible');
    } else {
      el.textContent = '';
      delete el.dataset.tooltip;
      el.classList.remove('visible');
    }
    refreshVisibleTooltipForElement(el);
  }

  showTrace(prefix + 'FantasticMod', traces.fantastic);
  showTrace(prefix + 'RaceMod', traces.race);
  showTrace(prefix + 'FigsMod', traces.figures);
  showTrace(prefix + 'AtkMod', traces.melee);
  showTrace(prefix + 'RtbMod', traces.sharedAttack);
  showTrace(prefix + 'DefMod', traces.defense);
  showTrace(prefix + 'ResMod', traces.resistance);
  showTrace(prefix + 'HPMod', traces.hits);

  // The DOS rows project the shared secondary threshold; the modern rows project the record's
  // five To-Hit fields, each channel row resolving the common value plus its own modifier.
  showTrace(prefix + 'ToHitMeleeMod', traces.toHitMelee);
  showTrace(prefix + 'ToHitRtbModDisp', traces.toHitShared);
  showTrace(prefix + 'HitChanceDisp', traces.toHitCommon);
  showTrace(prefix + 'HitMeleeDisp', traces.toHitMelee);
  showTrace(prefix + 'HitRangedDisp', traces.toHitRanged);
  showTrace(prefix + 'HitThrownDisp', traces.toHitThrown);
  showTrace(prefix + 'HitBreathDisp', traces.toHitBreath);
  showTrace(prefix + 'ToBlkModDisp', traces.toBlock);

  const modernTraces = traces.modernAttacks || {};
  const modernOutputs = {
    ranged: 'ModernRangedMod',
    thrown: 'ModernThrownMod',
    fireBreath: 'ModernFireBreathMod',
    lightningBreath: 'ModernLightningBreathMod',
  };
  for (const [key, id] of Object.entries(modernOutputs)) {
    showTrace(prefix + id, modernTraces[key]);
  }
}
