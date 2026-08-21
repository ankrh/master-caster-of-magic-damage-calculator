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
function loadUnitDatabase(version) {
  if (unitDatabases[version]) return unitDatabases[version];
  const data = VERSION_DATA[version];
  if (!data) {
    throw new Error(
      `loadUnitDatabase: no roster for game version '${version}' `
      + `(expected one of ${Object.keys(VERSION_DATA).join(', ')}).`);
  }
  unitDatabases[version] = Object.values(data);
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
  const categoryOrder = [
    'Heroes',
    ...raceOrder,
    'Other',
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
  unitBaseStats[prefix] = {
    atk: unit.melee, def: unit.defense, res: unit.resist, hp: unit.hp,
    rtb: predefinedUnitRtb(unit),
    modernAttacks: predefinedModernAttacks(unit),
    toHitMod: unit.to_hit || 0,
    generic: unit.category === 'Generic',
  };
  unitIdentity[prefix] = {
    ...createRosterUnitIdentity(version, unit),
    name: unit.name,
    specialUnit: specialUnitForRoster(version, unit),
  };
}

function customBaseRaceForUnitType(unitType) {
  const match = /^fantastic_(life|death|chaos|nature|sorcery|arcane)$/.exec(unitType || '');
  return match ? match[1][0].toUpperCase() + match[1].slice(1) : '';
}

const SPECIAL_UNIT_DEFS = [
  { key: 'golem', label: 'Golem', versions: ['com_', 'com2_'] },
  { key: 'chosen', label: 'Chosen / Avatar', versions: ['com2_'] },
  { key: 'zombies', label: 'Zombies', versions: ['com_6.08'] },
  { key: 'catapult', label: 'Catapult', versions: ['com_6.08'] },
];

function specialUnitAllowed(version, key) {
  if (!key || key === 'none') return true;
  const def = SPECIAL_UNIT_DEFS.find(item => item.key === key);
  return !!def && def.versions.some(prefix => version.startsWith(prefix));
}

function specialUnitForRoster(version, unit) {
  if (!unit) return 'none';
  const templateId = Number.isInteger(unit.templateId) ? unit.templateId : null;
  if (version.startsWith('com2_') || version === 'com_6.08') {
    if (templateId === 81) return 'golem';
    if (templateId === 34) return 'chosen';
  }
  if (version === 'com_6.08') {
    if (templateId === 174) return 'zombies';
    if (templateId === 37) return 'catapult';
  }
  return 'none';
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
    const wanted = specialUnitAllowed(document.getElementById('gameVersion').value, values.specialUnit)
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

function setIdentityControlsFromUnit(prefix, unit, version) {
  setIdentityControls(prefix, {
    isHero: !!(unit && unit.isHero),
    baseFantastic: !!(unit && unit.baseFantastic),
    baseRace: unit && unit.baseRace,
    specialUnit: specialUnitForRoster(version, unit),
  });
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
  select.value = specialUnitAllowed(version, current) ? current : 'none';
}

// Golem's compiled identity supplies Resist Elements at its normal enchantment point in CoM1,
// CoM2, and Warlord. The
// selector owns the derived value, so the user sees the effect in the existing Elements row
// and cannot accidentally edit it while Golem is selected.
function updateSpecialUnitDerivedEffects(prefix) {
  const version = document.getElementById('gameVersion').value;
  const select = identityControl(prefix, 'SpecialUnit');
  const elem = document.getElementById(prefix + 'Abil_elemArmor');
  if (!select || !elem) return;
  const preGolem = document.getElementById(prefix + 'IdentityPreGolemElemArmor');
  const item = elem.closest('.abil-item');
  const isGolem = (version.startsWith('com2_') || version === 'com_6.08') && select.value === 'golem';
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

function unitIdentityForDerivation(prefix, version) {
  const stored = unitIdentity[prefix] || {};
  if (Number.isInteger(stored.templateId)) {
    return createUnitIdentity({ ...stored, version });
  }
  const controls = readIdentityControls(prefix);
  return createCustomUnitIdentity(version, {
    isHero: controls.isHero,
    baseRace: controls.baseRace,
    baseFantastic: controls.baseFantastic,
    specialUnit: controls.specialUnit,
  });
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
  const number = suffix => Math.max(0, parseInt(document.getElementById(prefix + suffix).value, 10) || 0);
  const ranged = number('ModernRanged');
  const thrown = number('ModernThrown');
  const fireBreath = number('ModernFireBreath');
  const lightningBreath = number('ModernLightningBreath');
  // The Ranged record's existence is stated by its type selector, not by its strength: the
  // record ships with a projectile type and no strength (Warlord [362] Wanderer), and the
  // engine writes that read the permanent type land on it regardless. The Thrown and Breath
  // fields have no type of their own, so for them strength is the only statement of existence.
  const rangedType = document.getElementById(prefix + 'ModernRangedType').value;
  return {
    ranged: (ranged || rangedType !== 'none') ? { strength: ranged, type: rangedType } : null,
    thrown: thrown ? { strength: thrown, type: 'thrown' } : null,
    fireBreath: fireBreath ? { strength: fireBreath, type: 'fire' } : null,
    lightningBreath: lightningBreath ? { strength: lightningBreath, type: 'lightning' } : null,
  };
}

function applyModernAttackFields(prefix, attacks) {
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
  if (type) type.value = channels.ranged ? channels.ranged.type : 'none';
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

  setRosterUnitRecords(prefix, unit, version);
  setIdentityControlsFromUnit(prefix, unit, version);
  populateSpecialUnitOptions(prefix, version, specialUnitForRoster(version, unit));

  document.getElementById(prefix + 'Figs').value = unit.figures || 1;
  document.getElementById(prefix + 'ToHitRtbMod').value = unit.to_hit || 0;
  // Both modern roster chance fields use the card's percentage-point delta above 30%.
  document.getElementById(prefix + 'ToBlkMod').value = unit.to_block || 0;
  document.getElementById(prefix + 'Dmg').value = 0;
  document.getElementById(prefix + 'RtbType').value = predefinedUnitRtbType(unit);
  applyModernAttackFields(prefix, unitBaseStats[prefix].modernAttacks);

  syncLegacyUnitTypeControl(prefix, legacyUnitTypeFromIdentity(unitIdentity[prefix]));

  clearUnitInnateLocks(prefix);
  const abilValues = parseAbilitiesFromUnit(unit);
  clearAbilities(prefix, 'ability');
  applyAbilities(prefix, abilValues, 'ability');
  syncModernSpecialCard(prefix);
  // The DOS rosters carry bare consumer flags plus the one `spec_att_attrib` byte, so the
  // card takes its magnitude from the record and then writes it back over the ability rows,
  // which parsed the flag-only tokens as 0/1.
  syncDosSpecialCard(prefix, unit.spec_att_attrib);
  if (dosSpecialIsActive(version)) syncDosSpecialAbilities(prefix);
  resetCardToRosterBase(prefix);
  markUnitInnateLocks(prefix, abilValues);
  updateSpecialUnitDerivedEffects(prefix);

  refreshAbilityFieldVisibility();
}

// applyValues=false is the state-restore path: rebuild the JS-side unit records and all
// lock styling for the current selection WITHOUT writing any field values, which on
// restore may be hand-edited (applyUnit/resetCardToRosterBase would clobber them).
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
      clearUnitInnateLocks(prefix);
      markUnitInnateLocks(prefix, parseAbilitiesFromUnit(unit));
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
    clearUnitInnateLocks(prefix);
    updateCustomLevelState(prefix);
  }
  updateSpecialUnitDerivedEffects(prefix);
  syncLegacyUnitTypeControl(prefix);
  updateLoadoutLocks(prefix);
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

