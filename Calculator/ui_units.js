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
  unitBaseStats[prefix] = {
    atk: unit.melee, def: unit.defense, res: unit.resist, hp: unit.hp,
    rtb: predefinedUnitRtb(unit),
    modernAttacks: predefinedModernAttacks(unit, version),
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

// Two different questions used to share one `false`. A key this build does not define is out of
// range and halts (`SPEC.md`, *Out-of-range values stop the run*): it can only come from a state
// blob, share link or fixture written against a vocabulary this build has since changed, and
// answering `none` restores a unit whose special template the caller did state. A key that is
// defined but not allowed in the selected version is version scope, not retirement — the version
// select really can move a `chosen` card to MoM — so that one still clamps.
function specialUnitAllowed(version, key, context) {
  if (!key || key === 'none') return true;
  const def = SPECIAL_UNIT_DEFS.find(item => item.key === key);
  if (!def) {
    throw new TypeError(
      `${context || 'Special unit'} names '${key}', which this build does not define `
      + `(offered: none, ${SPECIAL_UNIT_DEFS.map(item => item.key).join(', ')}). `
      + `Retiring a key obliges the build to state a migration for states that still carry it.`);
  }
  return def.versions.some(prefix => version.startsWith(prefix));
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
  select.value = specialUnitAllowed(version, current, `#${prefix}SpecialUnit`) ? current : 'none';
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

  // The card's whole roster statement, in one block. Nothing here applies a level bonus: the
  // card holds pre-level stats and the level ladder is an ordinary transform step in
  // deriveUnitStats (`stats_sequence.js`, statStep 'level'), so a level change re-states
  // nothing (F136).
  const base = unitBaseStats[prefix];
  document.getElementById(prefix + 'Atk').value = base.atk;
  document.getElementById(prefix + 'Rtb').value = base.rtb;
  document.getElementById(prefix + 'Def').value = base.def;
  document.getElementById(prefix + 'Res').value = base.res;
  document.getElementById(prefix + 'HP').value = base.hp;
  document.getElementById(prefix + 'Figs').value = unit.figures || 1;
  // `UNITS.INI` defines one `Hit=` per record and no per-channel key. That one value seeds the
  // DOS melee threshold, the DOS shared secondary threshold and, in the modern engines, the
  // record's one common `hitchance`; the four modern channel modifiers have no roster source
  // and reset to 0.
  document.getElementById(prefix + 'ToHitMod').value = base.toHitMod;
  document.getElementById(prefix + 'ToHitRtbMod').value = base.toHitMod;
  document.getElementById(prefix + 'HitChance').value = base.toHitMod;
  for (const field of ['HitMelee', 'HitRanged', 'HitThrown', 'HitBreath']) {
    document.getElementById(prefix + field).value = 0;
  }
  // Modern roster To Block uses the card's percentage-point delta above 30%.
  document.getElementById(prefix + 'ToBlkMod').value = unit.to_block || 0;
  document.getElementById(prefix + 'Dmg').value = 0;
  setSharedSlotRangedType(prefix, predefinedUnitRtbType(unit),
    `Roster record ${JSON.stringify(unit.name || unit.id)}`);
  applyModernAttackFields(prefix, base.modernAttacks);

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
  markUnitInnateLocks(prefix, abilValues);
  updateSpecialUnitDerivedEffects(prefix);

  refreshAbilityFieldVisibility();
}

// applyValues=false is the state-restore path: rebuild the JS-side unit records and all
// lock styling for the current selection WITHOUT writing any field values, which on
// restore may be hand-edited (applyUnit would clobber them).
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

