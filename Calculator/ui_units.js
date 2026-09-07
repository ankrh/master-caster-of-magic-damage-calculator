// --- UI Layer: unit selection and identity ---
// The per-version roster databases behind both unit comboboxes, and the identity controls —
// unit type, base race, special unit — that decide what a custom unit is.


const unitDatabases = {};
const unitBaseStats = {};
// Base identity of the selected unit per side. Predefined records include their active
// version-scoped source IDs; custom records are materialized at each derivation with null IDs.
// Display name remains alongside the identity because a few existing Warlord building gates
// still use it pending the template-based R8.3 conversion.
const unitIdentity = {};
let _activeVersion = null;
// True while applyState() is rewriting controls, so the recalc-triggered save hook
// (Task B) doesn't persist a half-applied blob. Declared here in Task A because
// applyState() needs it; Task B's save logic reads it.
let _restoring = false;

// Version dispatch for the roster. `VERSION_DATA` names all five engine versions, and
// `normalizeGameVersion` is what maps a retired or foreign id forward before anything reaches
// here. Returning an empty roster for an unmapped id used to leave the symptom as an empty
// unit dropdown with every other control still computing — `SPEC.md`, *Out-of-range values
// stop the run*.
// The records themselves are `rosterRecordsForVersion` (`card_state.js`, `data-scope="core"`), so
// the page and a caller with no controls read one roster for a version; this is the page's cache
// over it.
function loadUnitDatabase(version) {
  if (unitDatabases[version]) return unitDatabases[version];
  unitDatabases[version] = rosterRecordsForVersion(version);
  return unitDatabases[version];
}

const unitComboboxData = {};

function populateUnitDropdown(selectId, units) {
  const prefix = selectId[0];
  const hiddenEl = document.getElementById(selectId);
  const oldVal = hiddenEl.value;

  const CAT_NORMALIZE = {
    'General': 'Generic', 'Dwarf': 'Dwarven',
    'Life Creatures': 'Life', 'Death Creatures': 'Death', 'Chaos Creatures': 'Chaos',
    'Nature Creatures': 'Nature', 'Sorcery Creatures': 'Sorcery', 'Arcane Creatures': 'Arcane',
  };
  const raceOrder = [
    'Barbarian', 'Gnoll', 'Halfling', 'High Elf', 'High Men', 'Klackon',
    'Lizardman', 'Nomad', 'Orc',
    'Beastmen', 'Dark Elf', 'Draconian', 'Dwarven', 'Troll',
    'Xuanyuan', 'Rakhshasa', 'Hawkmen', 'Goblin',
  ];
  // `Special` is race id 14 in the engine's own race table (`UNITS.INI`, `Race=`), sitting
  // between the named races and the realm ids the realm categories come from, and both roster
  // generators read it through that table rather than through the realm one. It is therefore a
  // non-race, non-realm bucket and belongs beside `Other`, after the races and before `Generic`.
  const categoryOrder = [
    'Heroes',
    ...raceOrder,
    'Other',
    'Special',
    'Generic',
    'Life', 'Death', 'Chaos',
    'Nature', 'Sorcery', 'Arcane',
  ];

  const groups = {};
  for (const u of units) {
    if (u.abilities && u.abilities.includes('CreateOutpost')) continue;
    if (u.name === 'Floating Island') continue;
    if (u.category === 'Heroes') continue;
    const cat = CAT_NORMALIZE[u.category] || u.category;
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(u);
  }

  // A bucket `categoryOrder` does not name used to be skipped by the emit loop below, which
  // removed its units from this combobox and from the matrix rows built off the same flat list,
  // with nothing raised — `SPEC.md`, *Out-of-range values stop the run*. The DOS roster's
  // category is the source's race column copied verbatim (`tools/parse_tweaker_unit_data.py`),
  // so this is the only place an unenumerated category is checked at all.
  const unordered = Object.keys(groups).filter(cat => !categoryOrder.includes(cat));
  if (unordered.length) {
    const version = document.getElementById('gameVersion').value;
    const detail = unordered
      .map(cat => `'${cat}' (${groups[cat].map(u => `[${u.id}] ${u.name}`).join(', ')})`)
      .join('; ');
    throw new Error(
      `populateUnitDropdown: roster category ${detail} of the '${version}' roster is named by no `
      + `entry in categoryOrder, so #${selectId} would omit those units silently `
      + `(expected one of ${categoryOrder.join(', ')}).`);
  }

  const flatList = [];
  for (const cat of categoryOrder) {
    if (!groups[cat]) continue;
    for (const u of groups[cat].slice().sort((a, b) => {
      const k = a.sort_order !== undefined ? 'sort_order' : 'cost';
      return (a[k] || 0) - (b[k] || 0);
    })) {
      flatList.push({ id: String(u.id), name: u.name, cat });
    }
  }
  unitComboboxData[prefix] = flatList;

  hiddenEl.value = flatList.some(u => u.id === oldVal) ? oldVal : 'custom';
  syncUnitDisplay(prefix);
}

function syncUnitDisplay(prefix) {
  const hiddenEl = document.getElementById(prefix + 'Unit');
  const searchEl = document.getElementById(prefix + 'UnitSearch');
  if (!searchEl) return;
  if (hiddenEl.value === 'custom') {
    searchEl.value = '';
  } else {
    const u = (unitComboboxData[prefix] || []).find(u => u.id === hiddenEl.value);
    searchEl.value = u ? u.name : '';
  }
}

function initUnitCombobox(prefix) {
  const searchEl = document.getElementById(prefix + 'UnitSearch');
  const listEl = document.getElementById(prefix + 'UnitList');
  const hiddenEl = document.getElementById(prefix + 'Unit');
  let activeIndex = -1;

  function renderDropdown(query) {
    const allUnits = unitComboboxData[prefix] || [];
    const q = query.trim().toLowerCase();
    const showCustom = q === '' || 'custom'.includes(q);
    const matches = q === '' ? allUnits : allUnits.filter(u => u.name.toLowerCase().includes(q) || u.cat.toLowerCase().includes(q));

    listEl.innerHTML = '';
    activeIndex = -1;

    if (!showCustom && matches.length === 0) { listEl.style.display = 'none'; return; }

    if (showCustom) {
      const item = document.createElement('div');
      item.className = 'unit-dropdown-item';
      item.textContent = 'Custom';
      item.dataset.id = 'custom';
      item.addEventListener('mousedown', e => { e.preventDefault(); commitUnit('custom'); });
      listEl.appendChild(item);
    }

    let lastCat = null;
    for (const u of matches) {
      if (u.cat !== lastCat) {
        const header = document.createElement('div');
        header.className = 'unit-dropdown-cat';
        header.textContent = u.cat;
        listEl.appendChild(header);
        lastCat = u.cat;
      }
      const item = document.createElement('div');
      item.className = 'unit-dropdown-item';
      item.textContent = u.name;
      item.dataset.id = u.id;
      item.addEventListener('mousedown', e => { e.preventDefault(); commitUnit(u.id); });
      listEl.appendChild(item);
    }
    listEl.style.display = 'block';
  }

  function commitUnit(id) {
    hiddenEl.value = id;
    listEl.style.display = 'none';
    activeIndex = -1;
    syncUnitDisplay(prefix);
    hiddenEl.dispatchEvent(new Event('change'));
  }

  function updateActiveItem() {
    const items = [...listEl.querySelectorAll('.unit-dropdown-item')];
    items.forEach((item, i) => item.classList.toggle('unit-dropdown-active', i === activeIndex));
    if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function selectSearchText() {
    if (searchEl.value) searchEl.select();
  }

  searchEl.addEventListener('focus', () => {
    renderDropdown(searchEl.value);
    selectSearchText();
  });
  searchEl.addEventListener('click', selectSearchText);
  searchEl.addEventListener('input', () => renderDropdown(searchEl.value));
  searchEl.addEventListener('blur', () => {
    setTimeout(() => {
      listEl.style.display = 'none';
      activeIndex = -1;
      syncUnitDisplay(prefix);
    }, 150);
  });
  searchEl.addEventListener('keydown', e => {
    const items = [...listEl.querySelectorAll('.unit-dropdown-item')];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActiveItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      updateActiveItem();
    } else if (e.key === 'Enter') {
      const target = activeIndex >= 0 ? items[activeIndex] : items[0];
      if (target) {
        commitUnit(target.dataset.id);
        searchEl.blur();
      }
    } else if (e.key === 'Escape') {
      listEl.style.display = 'none';
      syncUnitDisplay(prefix);
      searchEl.blur();
    }
  });
}

// --- Unit Application ---

// JS-side records for a roster unit (base stats + intrinsic identity). Shared by
// applyUnit and updateUnitLock's value-preserving restore path.
function setRosterUnitRecords(prefix, unit, version) {
  // `generic` is the whole record now. The stat fields beside it were a second copy of the roster
  // statement, and since `applyRosterUnit` (`card_state.js`) became that statement's one home
  // nothing read them: a copy that no longer answers any question is a copy that can only drift
  // (F260.4 found them dead, F260.6 removed them).
  assertRosterRecordStatable(unit, version);
  unitBaseStats[prefix] = { generic: unit.category === 'Generic' };
  // `rosterStoredIdentity` (`card_state.js`) is the one statement of what a record's stored
  // identity is, and `rosterCardIdentity` — the `identity` `applyRosterUnit` puts on the card
  // state — is built from it, so the map and the state cannot disagree about a record.
  unitIdentity[prefix] = rosterStoredIdentity(unit, version);
}

function customBaseRaceForUnitType(unitType) {
  const match = /^fantastic_(life|death|chaos|nature|sorcery|arcane)$/.exec(unitType || '');
  return match ? match[1][0].toUpperCase() + match[1].slice(1) : '';
}

function identityControl(prefix, name) {
  return document.getElementById(prefix + name);
}

function readIdentityControls(prefix) {
  const hero = identityControl(prefix, 'BaseHero');
  const fantastic = identityControl(prefix, 'BaseFantastic');
  const race = identityControl(prefix, 'BaseRace');
  const special = identityControl(prefix, 'SpecialUnit');
  return {
    isHero: !!(hero && hero.checked),
    baseFantastic: !!(fantastic && fantastic.checked),
    baseRace: race ? race.value : '',
    specialUnit: special ? special.value : 'none',
  };
}

function ensureBaseRaceOption(prefix, value) {
  const select = identityControl(prefix, 'BaseRace');
  if (!select || !value || Array.from(select.options).some(opt => opt.value === value)) return;
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  select.appendChild(option);
}

function setIdentityControls(prefix, values = {}) {
  const hero = identityControl(prefix, 'BaseHero');
  const fantastic = identityControl(prefix, 'BaseFantastic');
  const race = identityControl(prefix, 'BaseRace');
  if (hero) hero.checked = !!values.isHero;
  if (fantastic) fantastic.checked = !!values.baseFantastic;
  if (race) {
    ensureBaseRaceOption(prefix, values.baseRace || '');
    race.value = values.baseRace || '';
  }
  const special = identityControl(prefix, 'SpecialUnit');
  if (special) {
    const wanted = specialUnitAllowed(document.getElementById('gameVersion').value,
      values.specialUnit, `Base identity for side ${prefix}`)
      ? (values.specialUnit || 'none') : 'none';
    special.value = wanted;
  }
}

function setIdentityControlsFromLegacy(prefix, unitType, race, specialUnit) {
  const match = /^fantastic_(life|death|chaos|nature|sorcery|arcane)$/.exec(unitType || '');
  setIdentityControls(prefix, {
    isHero: unitType === 'hero',
    baseFantastic: !!match,
    baseRace: race || (match ? match[1][0].toUpperCase() + match[1].slice(1) : ''),
    specialUnit: specialUnit || 'none',
  });
}

// The DOM writer for the identity a record implies. What that identity *is* is
// `rosterCardIdentity` (`card_state.js`), which is also the `identity` `applyRosterUnit` puts on
// the card state, so the controls and a control-free state state the same one.
function setIdentityControlsFromUnit(prefix, unit, version) {
  setIdentityControls(prefix, rosterCardIdentity(unit, version));
}

function setIdentityControlsDisabled(prefix, disabled) {
  for (const field of ['BaseHero', 'BaseFantastic', 'BaseRace', 'SpecialUnit']) {
    const control = identityControl(prefix, field);
    if (control) control.disabled = !!disabled;
  }
}

function unitTypeFromIdentityControls(prefix) {
  return legacyUnitTypeFromIdentity(readIdentityControls(prefix));
}

function syncLegacyUnitTypeControl(prefix, unitType) {
  const legacy = identityControl(prefix, 'Abil_unitType');
  if (legacy) legacy.value = unitType || unitTypeFromIdentityControls(prefix);
}

function populateSpecialUnitOptions(prefix, version, preferred) {
  const select = identityControl(prefix, 'SpecialUnit');
  if (!select) return;
  const current = preferred || select.value || 'none';
  select.innerHTML = '';
  const other = document.createElement('option');
  other.value = 'none';
  other.textContent = 'Other / no exception';
  select.appendChild(other);
  for (const def of SPECIAL_UNIT_DEFS) {
    if (!specialUnitAllowed(version, def.key)) continue;
    const option = document.createElement('option');
    option.value = def.key;
    option.textContent = def.label;
    select.appendChild(option);
  }
  select.value = specialUnitAllowed(version, current, `#${prefix}SpecialUnit`) ? current : 'none';
}

// Golem's compiled identity supplies Resist Elements at its normal enchantment point in CoM1,
// CoM2, and Warlord. The
// selector owns the derived value, so the user sees the effect in the existing Elements row
// and cannot accidentally edit it while Golem is selected.
//
// The rule is `specialUnitDerivesResistElements` (`card_state.js`), which `applyRosterUnit` also
// applies, so a roster Golem is the same unit on the page and on the pure path. This function
// keeps the DOM half — the lock, the styling, and the memory of the value Golem replaced.
function updateSpecialUnitDerivedEffects(prefix) {
  const version = document.getElementById('gameVersion').value;
  const select = identityControl(prefix, 'SpecialUnit');
  const elem = document.getElementById(prefix + 'Abil_elemArmor');
  if (!select || !elem) return;
  const preGolem = document.getElementById(prefix + 'IdentityPreGolemElemArmor');
  const item = elem.closest('.abil-item');
  const isGolem = specialUnitDerivesResistElements(version, select.value);
  const stored = unitIdentity[prefix] || (unitIdentity[prefix] = {});
  if (isGolem) {
    if (!stored._preGolemElemArmor) {
      stored._preGolemElemArmor = (preGolem && preGolem.value !== '' ? preGolem.value : null)
        || elem.value || 'none';
    }
    if (preGolem) preGolem.value = stored._preGolemElemArmor;
    elem.value = 'resistElements';
    elem.disabled = true;
  } else {
    if (stored._preGolemElemArmor) {
      elem.value = stored._preGolemElemArmor;
      delete stored._preGolemElemArmor;
      if (preGolem) preGolem.value = '';
    }
    elem.disabled = false;
  }
  if (item) item.classList.toggle('abil-identity-derived', isGolem);
}

// The card's identity, read from the page into the one field the card state carries. Which of
// the two sources speaks is decided here rather than at derivation time: a stored record naming a
// template is a roster pick and is authoritative, and without one the unit is custom and the four
// editable controls state it. That choice is the DOM half of `rosterCardIdentity` and
// `customCardIdentity` (`card_state.js`), which is what a caller with no controls writes instead.
//
// No clamp and no version here, deliberately. The controls cannot hold a key the selected version
// disallows — `populateSpecialUnitOptions` rebuilds the option set per version and
// `setIdentityControls` clamps before writing — so re-asking would only bake a version into a card
// state F260.1 keeps version-free.
//
// The page's `_preGolemElemArmor` memory is not copied across: it is the undo buffer for the
// Elements control Golem's identity derives, not part of the identity (F260.5).
function cardIdentity(prefix) {
  const stored = unitIdentity[prefix] || {};
  const named = typeof stored.name === 'string' && stored.name ? { name: stored.name } : {};
  if (Number.isInteger(stored.templateId)) {
    return {
      templateId: stored.templateId,
      heroTypeId: Number.isInteger(stored.heroTypeId) ? stored.heroTypeId : null,
      isHero: !!stored.isHero,
      baseFantastic: !!stored.baseFantastic,
      baseRace: typeof stored.baseRace === 'string' ? stored.baseRace : '',
      specialUnit: stored.specialUnit || 'none',
      ...named,
    };
  }
  return { templateId: null, heroTypeId: null, ...readIdentityControls(prefix), ...named };
}

function unitIdentityForDerivation(prefix, version) {
  return cardStateIdentity({ prefix, identity: cardIdentity(prefix) }, version);
}

// The JS-side half of `writeCardStateToControls` (`ui_card.js`): the `unitIdentity` record
// `cardIdentity` above reads back. It is a replacement rather than a merge, because the card
// state's identity is the whole statement — a custom side following a roster one must not keep
// the roster record's template ids, and a stated card has no `_preGolemElemArmor` memory to carry
// (F260.5 ruled that buffer page-only; `updateSpecialUnitDerivedEffects` re-establishes it from
// the controls while a Golem is still selected).
//
// The record is **rebuilt** through `createUnitIdentity` rather than copied from the card state,
// because the map is not the card state: `rosterStoredIdentity` and `setCustomUnitIdentity` both
// install a record carrying the selected `version`, and that field is read back by the identity
// specs and by anything asking which version's rules stated this unit. Writing the card state's
// trimmed identity straight in dropped it — caught by `tests/identity.spec.js` and
// `tests/identity-r8.4.spec.js`. What `createUnitIdentity` produces from the card identity plus
// the version is exactly what those two producers produce, so this writes the same record they do
// and `cardIdentity` reads its own answer back unchanged.
// The page's undo buffer for the Elements value an identity *derives*, restated whenever a whole
// card is written. It has two halves — the `_preGolemElemArmor` property on the identity record and
// the hidden `IdentityPreGolemElemArmor` control that survives a reload — and a writer that
// replaces one without the other leaves them disagreeing. Both are restated here, from the card
// about to be overwritten:
//
//  - **The new identity derives Resist Elements.** The buffer is the value the derived one is about
//    to replace, which is what the control still holds at this point, because the writer has not
//    yet reached the ability rows. `updateSpecialUnitDerivedEffects` runs after the write and finds
//    the buffer already set, so it captures nothing and simply locks the row.
//
//    This is what the roster path used to get for free: `writeRosterCardState` skipped the
//    enchantment rows, so the user's own Elements value was still in the control when the capture
//    ran. The writer that replaced it writes `resistElements` first — `applyRosterUnit` states that
//    value on the card — so the capture would have remembered `resistElements` and selecting a
//    Golem roster unit would have destroyed the value it is supposed to restore (GPT review of
//    F260.7, finding 1).
//
//  - **The new identity does not derive it.** There is nothing to remember, so both halves are
//    cleared. Without this the hidden control kept a value belonging to an identity the card no
//    longer has, and the *next* Golem selection preferred that stale value over the user's current
//    one — `updateSpecialUnitDerivedEffects` reads the hidden control first and only clears it on
//    the branch where the property it just deleted was present (finding 2).
//
// The buffer stays page state: it is a memory of a previous selection, and a card state built from
// scratch has none (F260.5). What this function says is that a *whole-card write* is such a
// previous selection, and therefore has to state the memory too.
function setCardStateGolemMemory(prefix, identity, version) {
  const stored = unitIdentity[prefix] || (unitIdentity[prefix] = {});
  const preGolem = document.getElementById(prefix + 'IdentityPreGolemElemArmor');
  const elem = document.getElementById(prefix + 'Abil_elemArmor');
  if (specialUnitDerivesResistElements(version, identity.specialUnit)) {
    const remembered = (elem && elem.value) || 'none';
    stored._preGolemElemArmor = remembered;
    if (preGolem) preGolem.value = remembered;
  } else {
    delete stored._preGolemElemArmor;
    if (preGolem) preGolem.value = '';
  }
}

function setCardStateIdentityRecord(prefix, identity, version) {
  if (Object.prototype.toString.call(identity) !== '[object Object]') {
    throw new TypeError(
      `setCardStateIdentityRecord: side '${prefix}' states no identity `
      + `(got ${Object.prototype.toString.call(identity)}).`);
  }
  unitIdentity[prefix] = {
    ...createUnitIdentity({ ...identity, version }),
    ...(typeof identity.name === 'string' && identity.name ? { name: identity.name } : {}),
  };
}

function setCustomUnitIdentity(prefix, version, unitType, preserveEditableIdentity) {
  const previous = unitIdentity[prefix] || {};
  const stored = preserveEditableIdentity ? previous : {};
  const controls = readIdentityControls(prefix);
  unitIdentity[prefix] = {
    ...createCustomUnitIdentity(version, {
      isHero: controls.isHero,
      baseRace: controls.baseRace,
      baseFantastic: controls.baseFantastic,
      specialUnit: controls.specialUnit,
    }),
    specialUnit: controls.specialUnit || 'none',
    ...(previous._preGolemElemArmor ? { _preGolemElemArmor: previous._preGolemElemArmor } : {}),
    ...(stored.name ? { name: stored.name } : {}),
  };
  syncLegacyUnitTypeControl(prefix, unitType || unitTypeFromIdentityControls(prefix));
  updateSpecialUnitDerivedEffects(prefix);
}

// CoM2/Warlord keep four conventional attack channels.  The card owns the editable
// boundary: a roster selection writes its source values here, while a custom modern
// unit reads the same named fields.  The old RTB pair remains exclusively for the
// DOS engines' shared special-value field.
function modernCardAttacks(prefix) {
  const version = document.getElementById('gameVersion').value;
  if (!version.startsWith('com2')) return null;
  const value = suffix => document.getElementById(prefix + suffix).value;
  return modernAttackRecord({
    ranged: value('ModernRanged'),
    rangedType: value('ModernRangedType'),
    thrown: value('ModernThrown'),
    fireBreath: value('ModernFireBreath'),
    lightningBreath: value('ModernLightningBreath'),
  });
}

// The writer counterpart to `modernCardAttacks`, and the modern card's half of the boundary
// `setSharedSlotRangedType` (`ui_card.js`) already holds for the DOS shared slot. The projectile
// is assigned to a `<select>`, so a token the control does not offer left it holding `''` and
// `modernAttackRecord` read that back as `'none'` — the caller's statement erased, one layer
// before `deriveUnitStats`'s own vocabulary boundary could see it. That put the halt F181 added
// out of reach of the producer the item was filed about: a fixture typo in a preset's
// `modernAttacks`. So the token is checked here, against the control's own option list, with the
// caller's source named (F181).
function applyModernAttackFields(prefix, attacks, source) {
  const channels = attacks || {};
  const set = (suffix, channel) => {
    const el = document.getElementById(prefix + suffix);
    if (el) el.value = channel && channel.strength || 0;
  };
  set('ModernRanged', channels.ranged);
  set('ModernThrown', channels.thrown);
  set('ModernFireBreath', channels.fireBreath);
  set('ModernLightningBreath', channels.lightningBreath);
  const type = document.getElementById(prefix + 'ModernRangedType');
  if (!type) return;
  const token = channels.ranged ? channels.ranged.type : 'none';
  const offered = Array.from(type.options).map(opt => opt.value);
  if (!offered.includes(token)) {
    throw new TypeError(
      `${source || 'applyModernAttackFields'}: the modern Ranged channel states projectile type `
      + `${JSON.stringify(token)}, which names no type the control offers `
      + `(${offered.join(', ')}). A channel with no projectile states 'none'.`);
  }
  type.value = token;
}

function clearUnitInnateLocks(prefix) {
  const abilCont = document.getElementById(prefix + 'Abilities');
  abilCont.querySelectorAll('.abil-unit-locked').forEach(item => {
    item.classList.remove('abil-unit-locked');
    item.querySelectorAll('input, select').forEach(inp => { inp.disabled = false; });
  });
}

// Mark active unit-ability items that are innate to a predefined unit.
function markUnitInnateLocks(prefix, abilValues) {
  for (const abil of abilityUiDefs()) {
    if (abil.source !== 'ability') continue;
    const val = abilValues[abil.key];
    if (!abilityValueIsActive(abil, val)) continue;
    const el = document.getElementById(abilityControlId(prefix, abil));
    if (!el) continue;
    const item = el.closest('.abil-item');
    if (!item) continue;
    item.classList.add('abil-unit-locked');
  }
}

function applyUnit(prefix, unitIndex) {
  const version = document.getElementById('gameVersion').value;
  const units = unitDatabases[version] || [];
  const unit = units.find(u => u.id === unitIndex);
  if (!unit) return;

  // The card's whole roster statement, computed before anything is written: `applyRosterUnit`
  // (`card_state.js`, `data-scope="core"`) is the pure twin of these writes, so the page and a
  // caller with no controls (F260.6) cannot state the same record differently. The DOS round trip
  // the card used to perform — take the magnitude from the record, then write it back over the
  // ability rows, which parsed the flag-only tokens as 0/1 — is an ordinary computation inside it
  // rather than two mirrored DOM writes.
  const state = applyRosterUnit(collectCardState(prefix), unit, version);

  setRosterUnitRecords(prefix, unit, version);
  // One writer for both statements a card can carry. `applyRosterUnit` spreads the state it was
  // given, so the fields a roster selection does not decide — the loadout, city walls and the
  // enchantment rows — are written back at the values the card already held, which is why the
  // narrower `writeRosterCardState` this replaced could skip them without disagreeing.
  writeCardStateToControls(prefix, state, rosterRecordLabel(unit));

  clearUnitInnateLocks(prefix);
  markUnitInnateLocks(prefix, parseAbilitiesFromUnit(unit));
  updateSpecialUnitDerivedEffects(prefix);

  refreshAbilityFieldVisibility();
}

// applyValues=false is the state-restore path: rebuild the JS-side unit records and all
// lock styling for the current selection WITHOUT writing any field values, which on
// restore may be hand-edited (applyUnit would clobber them).
// Everything `updateUnitLock` does that writes no field value: the lock styling, the innate-ability
// marks the current selection implies, the Golem-derived Elements lock, the legacy compact token
// and the loadout lock row. A caller that has already stated the whole card
// (`writeCardStateToControls`, `ui_card.js`) needs this half and must not have the other one, whose
// custom branch resets a locked Level or Weapon — a reset that on the preset path has already been
// applied, before the fixture's own level and weapon were written over it.
function refreshUnitLockDom(prefix) {
  const sel = document.getElementById(prefix + 'Unit');
  const isCustom = sel.value === 'custom';
  const version = document.getElementById('gameVersion').value;
  sel.closest('.panel').querySelector('.panel-fields').classList.toggle('locked', !isCustom);
  document.getElementById(prefix + 'Abilities').classList.toggle('locked', !isCustom);
  setIdentityControlsDisabled(prefix, !isCustom);
  clearUnitInnateLocks(prefix);
  if (!isCustom) {
    const unit = (unitDatabases[version] || []).find(u => u.id === parseInt(sel.value));
    if (unit) markUnitInnateLocks(prefix, parseAbilitiesFromUnit(unit));
  }
  updateSpecialUnitDerivedEffects(prefix);
  syncLegacyUnitTypeControl(prefix);
  updateLoadoutLocks(prefix);
}

function updateUnitLock(prefix, applyValues = true) {
  const sel = document.getElementById(prefix + 'Unit');
  const fields = sel.closest('.panel').querySelector('.panel-fields');
  const abilContent = document.getElementById(prefix + 'Abilities');
  const isCustom = sel.value === 'custom';
  const version = document.getElementById('gameVersion').value;
  fields.classList.toggle('locked', !isCustom);
  abilContent.classList.toggle('locked', !isCustom);
  setIdentityControlsDisabled(prefix, !isCustom);

  if (!isCustom) {
    const units = unitDatabases[version] || [];
    const unit = units.find(u => u.id === parseInt(sel.value));
    if (applyValues) {
      const locks = loadoutLockState(prefix);
      if (locks.level) document.getElementById(prefix + 'Level').value = 'normal';
      if (locks.weapon) document.getElementById(prefix + 'Weapon').value = 'normal';
      applyUnit(prefix, parseInt(sel.value));
    } else if (unit) {
      setRosterUnitRecords(prefix, unit, version);
      setIdentityControlsFromUnit(prefix, unit, version);
      populateSpecialUnitOptions(prefix, version, specialUnitForRoster(version, unit));
    }
  } else {
    if (applyValues) {
      delete unitBaseStats[prefix];
    }
    // On restore, keep the identity/generic records applyFullState installed from the
    // blob (synthetic test units rely on them).
    populateSpecialUnitOptions(prefix, version);
    const preserveCustomIdentity = !applyValues;
    setCustomUnitIdentity(prefix, version, null, preserveCustomIdentity);
    updateCustomLevelState(prefix);
  }
  refreshUnitLockDom(prefix);
}

// Selection-time value resets for a custom unit whose type disallows a loadout
// (values a preset sets afterwards are re-applied by applyPreset, so they survive).
function updateCustomLevelState(prefix) {
  const sel = document.getElementById(prefix + 'Unit');
  if (sel.value !== 'custom') return;
  const locks = loadoutLockState(prefix);
  if (locks.level) document.getElementById(prefix + 'Level').value = 'normal';
  if (locks.weapon) document.getElementById(prefix + 'Weapon').value = 'normal';
  updateLoadoutLocks(prefix);
}

