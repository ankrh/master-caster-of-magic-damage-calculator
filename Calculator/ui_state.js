// --- UI Layer: calculator state ---
// Reset, swap and version switching; preset application; and the full page-state payload
// behind the share link, the URL hash and localStorage. `runTests` runs the PRESETS suite.


const DEFAULT_GAME_VERSION = 'mom_1.31';
const GAME_VERSION_STORAGE_KEY = 'gameVersion_v1';

// Version ids that have been renamed. Saved state and shared links outlive a rename, and an
// unknown id fails silently rather than loudly — loadUnitDatabase() returns [] for one, so the
// symptom is an empty unit dropdown. Map retired ids forward instead.
// Only one Warlord build is supported at a time, so every retired Warlord id resolves to the
// current one rather than restoring old behaviour.
const RENAMED_GAME_VERSIONS = {
  'com2_warlord_1.5.12.5': 'com2_warlord_1.5.12.7',
  'com2_warlord_1.5.12.6': 'com2_warlord_1.5.12.7',
  'com2_warlord_1.5.12.6.2': 'com2_warlord_1.5.12.7',
};

// Map a version id from persisted or shared state onto one this build actually offers.
// Returns null when it cannot, so callers apply their own fallback.
function normalizeGameVersion(version) {
  if (typeof version !== 'string' || !version) return null;
  const mapped = RENAMED_GAME_VERSIONS[version] || version;
  const sel = document.getElementById('gameVersion');
  if (!sel) return null;
  return Array.from(sel.options).some(opt => opt.value === mapped) ? mapped : null;
}

function loadPersistedGameVersion() {
  try {
    return normalizeGameVersion(localStorage.getItem(GAME_VERSION_STORAGE_KEY));
  } catch (err) {
    return null;
  }
}
const DEFAULT_UNITS = {
  a: 'Hell Hounds',
  b: 'War Bears',
};

function resetUnitFields(prefix) {
  const s = UNIT_DEFAULTS;
  document.getElementById(prefix + 'Unit').value = 'custom';
  syncUnitDisplay(prefix);
  document.getElementById(prefix + 'Figs').value = s.figs;
  document.getElementById(prefix + 'Atk').value = s.atk;
  document.getElementById(prefix + 'RtbType').value = s.rtbType;
  document.getElementById(prefix + 'Rtb').value = s.rtb;
  applyModernAttackFields(prefix, null);
  document.getElementById(prefix + 'Def').value = s.def;
  document.getElementById(prefix + 'Res').value = s.res;
  document.getElementById(prefix + 'ToHitMod').value = s.toHitMod;
  document.getElementById(prefix + 'ToHitRtbMod').value = s.toHitRtbMod;
  document.getElementById(prefix + 'ToBlkMod').value = s.toBlkMod;
  document.getElementById(prefix + 'HP').value = s.hp;
  document.getElementById(prefix + 'CityWalls').value = s.cityWalls;
  document.getElementById(prefix + 'Dmg').value = s.dmg;
  document.getElementById(prefix + 'Weapon').value = s.weapon;
  document.getElementById(prefix + 'Armor').value = s.armor;
  document.getElementById(prefix + 'Level').value = s.level;
  setIdentityControlsFromLegacy(prefix, s.unitType, '');
  populateSpecialUnitOptions(prefix, document.getElementById('gameVersion').value, 'none');
  syncLegacyUnitTypeControl(prefix, s.unitType);
  clearAbilities(prefix);
  delete unitBaseStats[prefix];
  delete unitIdentity[prefix];

  clearUnitInnateLocks(prefix);
  updateUnitLock(prefix);
}

function resetGlobalOptions() {
  document.getElementById('rangedCheck').checked = true;
  document.getElementById('rangedDist').value = 1;
  document.getElementById('nodeAura').value = 'none';
  document.getElementById('trueLight').checked = false;
  document.getElementById('darkness').checked = false;
  document.getElementById('chaosSurge').value = 0;
  document.getElementById('wallOfFire').checked = false;
  document.getElementById('warpReality').checked = false;
  document.getElementById('chaosConjunction').checked = false;
  document.getElementById('hurricane').checked = false;
  document.getElementById('poxHost').checked = false;
}

function resetAbilityPanelVisibility() {
  document.querySelectorAll('.abilities-section').forEach(section => {
    ABIL_TOGGLE_GROUPS.forEach(group => section.classList.add(groupHidingClass(group)));
  });
  updateAbilityVisibility();
}

function selectDefaultUnit(prefix, units) {
  const match = units.find(u => u.name === DEFAULT_UNITS[prefix]);
  if (!match) return;
  document.getElementById(prefix + 'Unit').value = String(match.id);
  syncUnitDisplay(prefix);
  updateUnitLock(prefix);
}

function resetCalculatorState(version) {
  // Explicit version is used by getDefaultIds to snapshot a specific version's defaults; the
  // no-arg call (init, Reset button) keeps the original persisted-or-default behavior.
  const initialVersion = version || loadPersistedGameVersion() || DEFAULT_GAME_VERSION;
  document.getElementById('gameVersion').value = initialVersion;
  _activeVersion = initialVersion;
  const units = loadUnitDatabase(initialVersion);
  populateUnitDropdown('aUnit', units);
  populateUnitDropdown('bUnit', units);
  resetGlobalOptions();
  resetAbilityPanelVisibility();
  resetUnitFields('a');
  resetUnitFields('b');
  selectDefaultUnit('a', units);
  selectDefaultUnit('b', units);
  updateTypeVisibility();
  updateAbilityVisibility();
  updateGlobalEnchantmentVisibility(initialVersion);
  recalculate();
}

function swapAttackerDefender() {
  const aUnitSel = document.getElementById('aUnit');
  const bUnitSel = document.getElementById('bUnit');
  let tmp = aUnitSel.value;
  aUnitSel.value = bUnitSel.value;
  bUnitSel.value = tmp;

  const simpleFields = ['Figs', 'Atk', 'RtbType', 'Rtb', 'ModernRangedType', 'ModernRanged', 'ModernThrown', 'ModernFireBreath', 'ModernLightningBreath', 'ToHitMod', 'ToHitRtbMod', 'ToBlkMod', 'Def', 'Res', 'HP', 'Dmg', 'Level', 'Weapon', 'Armor'];
  for (const f of simpleFields) {
    const aEl = document.getElementById('a' + f);
    const bEl = document.getElementById('b' + f);
    if (!aEl || !bEl) continue;
    tmp = aEl.value;
    aEl.value = bEl.value;
    bEl.value = tmp;
  }

  for (const abil of abilityUiDefs()) {
    // unitType is a derived compatibility projection, not side-owned state.
    if (abil.key === 'unitType') continue;
    const aEl = document.getElementById(abilityControlId('a', abil));
    const bEl = document.getElementById(abilityControlId('b', abil));
    if (!aEl || !bEl) continue;
    if (abil.type === 'bool') {
      const tmpC = aEl.checked;
      aEl.checked = bEl.checked;
      bEl.checked = tmpC;
    } else if (abil.type === 'numcheck') {
      const aChk = document.getElementById(abilityControlId('a', abil) + '_on');
      const bChk = document.getElementById(abilityControlId('b', abil) + '_on');
      if (aChk && bChk) {
        const tmpC = aChk.checked;
        aChk.checked = bChk.checked;
        bChk.checked = tmpC;
      }
      tmp = aEl.value;
      aEl.value = bEl.value;
      bEl.value = tmp;
    } else {
      tmp = aEl.value;
      aEl.value = bEl.value;
      bEl.value = tmp;
    }
  }

  for (const field of ['BaseHero', 'BaseFantastic', 'BaseRace', 'SpecialUnit',
    'IdentityPreGolemElemArmor']) {
    const aEl = document.getElementById('a' + field);
    const bEl = document.getElementById('b' + field);
    if (!aEl || !bEl) continue;
    if (aEl.type === 'checkbox') {
      const checked = aEl.checked;
      aEl.checked = bEl.checked;
      bEl.checked = checked;
    } else {
      tmp = aEl.value;
      aEl.value = bEl.value;
      bEl.value = tmp;
    }
  }

  tmp = unitBaseStats['a'];
  unitBaseStats['a'] = unitBaseStats['b'];
  unitBaseStats['b'] = tmp;

  tmp = unitIdentity['a'];
  unitIdentity['a'] = unitIdentity['b'];
  unitIdentity['b'] = tmp;

  syncUnitDisplay('a');
  syncUnitDisplay('b');
  // Rebuild roster source IDs and lock styling without re-applying roster values. A swap
  // exchanges hand-edited fields too; applying the selection here would clobber them.
  updateUnitLock('a', false);
  updateUnitLock('b', false);
  syncLegacyUnitTypeControl('a');
  syncLegacyUnitTypeControl('b');
  syncModernSpecialCard('a');
  syncModernSpecialCard('b');
  syncDosSpecialCard('a');
  syncDosSpecialCard('b');
  updateTypeVisibility();
  updateAbilityVisibility();
  recalculate();
}

// --- Version Change ---

function findMatchingUnit(units, oldUnit) {
  if (!oldUnit) return null;
  const nonHeroes = units.filter(u => u.category !== 'Heroes');
  const oldName = oldUnit.name;
  let match = nonHeroes.find(u => u.name === oldName);
  if (match) return match;
  const aliased = UNIT_NAME_ALIASES[oldName];
  if (aliased) {
    match = nonHeroes.find(u => u.name === aliased);
    if (match) return match;
  }
  return null;
}

function onVersionChange() {
  const version = document.getElementById('gameVersion').value;
  // Version is persisted as part of the full page-state blob (pageState_v2) via the
  // recalculate save hook; no separate gameVersion_v1 write here.
  const aUnitSel = document.getElementById('aUnit');
  const bUnitSel = document.getElementById('bUnit');
  const oldAId = aUnitSel.value;
  const oldBId = bUnitSel.value;
  const prevDb = (_activeVersion && unitDatabases[_activeVersion]) || [];
  const oldAUnit = oldAId !== 'custom' ? (prevDb.find(u => String(u.id) === oldAId) || null) : null;
  const oldBUnit = oldBId !== 'custom' ? (prevDb.find(u => String(u.id) === oldBId) || null) : null;

  const units = loadUnitDatabase(version);
  populateUnitDropdown('aUnit', units);
  populateUnitDropdown('bUnit', units);

  for (const [prefix, oldUnit, sel] of [['a', oldAUnit, aUnitSel], ['b', oldBUnit, bUnitSel]]) {
    if (!oldUnit) continue;
    const matched = findMatchingUnit(units, oldUnit);
    sel.value = matched ? String(matched.id) : 'custom';
    syncUnitDisplay(prefix);
  }

  // Save user enchantments — updateUnitLock calls applyUnit which resets all abilities
  const savedEnch = {};
  for (const prefix of ['a', 'b']) {
    savedEnch[prefix] = {};
    for (const abil of abilityUiDefs()) {
      if (abil.source !== 'enchantment') continue;
      const val = getAbilityControlValue(prefix, abil);
      if (val !== undefined) savedEnch[prefix][abil.uiKey || abil.key] = val;
    }
  }

  _activeVersion = version;
  updateUnitLock('a');
  updateUnitLock('b');

  // Restore user enchantments; updateTypeVisibility will still disable/uncheck version-incompatible ones
  for (const prefix of ['a', 'b']) {
    for (const abil of abilityUiDefs()) {
      if (abil.source !== 'enchantment') continue;
      const val = savedEnch[prefix][abil.uiKey || abil.key];
      if (val === undefined) continue;
      setAbilityControlValue(prefix, abil, val);
    }
  }

  refreshAbilityFieldVisibility();
  // Re-seed the DOS block from the ability state this switch produced. It belongs here rather
  // than in updateTypeVisibility, which runs on every input — re-deriving the magnitude on each
  // keystroke would overwrite whatever was just typed into it.
  if (!version.startsWith('com2')) { syncDosSpecialCard('a'); syncDosSpecialCard('b'); }
  updateGlobalEnchantmentVisibility(version);
  renderAllMatrixPropLists();
  recalculate();
}

// --- Presets ---

const PRESET_VERSIONS = {};

function applyPreset(name) {
  const preset = PRESETS[name];
  if (!preset) return;
  const targetVersion = preset.version || PRESET_VERSIONS[name];
  if (targetVersion) {
    const versionSel = document.getElementById('gameVersion');
    if (versionSel.value !== targetVersion) {
      versionSel.value = targetVersion;
      onVersionChange();
    }
  }
  clearAbilities('a');
  clearAbilities('b');
  // R8 callers describe independent base identity directly. Historical presets remain
  // compatible through a one-way translation of unitType at this boundary; the compact
  // token never overwrites an explicit R8 identity.
  function presetIdentity(s) {
    if (s.identity && typeof s.identity === 'object') {
      return {
        isHero: !!s.identity.isHero,
        baseFantastic: !!s.identity.baseFantastic,
        baseRace: typeof s.identity.baseRace === 'string' ? s.identity.baseRace : '',
        specialUnit: typeof s.identity.specialUnit === 'string' ? s.identity.specialUnit : 'none',
      };
    }
    const legacyType = s.unitType || UNIT_DEFAULTS.unitType;
    const match = /^fantastic_(life|death|chaos|nature|sorcery|arcane)$/.exec(legacyType);
    return {
      isHero: legacyType === 'hero',
      baseFantastic: !!match,
      baseRace: s.race || (match ? match[1][0].toUpperCase() + match[1].slice(1) : ''),
      specialUnit: s.specialUnit || 'none',
    };
  }
  function setUnit(prefix, u) {
    const s = { ...UNIT_DEFAULTS, ...u };
    const identity = presetIdentity(s);
    document.getElementById(prefix + 'Figs').value = s.figs;
    document.getElementById(prefix + 'Atk').value = s.atk;
    document.getElementById(prefix + 'RtbType').value = s.rtbType;
    document.getElementById(prefix + 'Rtb').value = s.rtb;
    // Older presets use the DOS-shaped `rtb` pair.  Translate that fixture format into
    // the modern card's named ranged channel when a CoM2/Warlord custom unit is applied;
    // ordinary UI reads never consult the hidden DOS controls in modern versions.
    if (document.getElementById('gameVersion').value.startsWith('com2')) {
      applyModernAttackFields(prefix, null);
      if (s.rtb > 0 && RANGED_TYPES.includes(s.rtbType)) {
        applyModernAttackFields(prefix, { ranged: { strength: s.rtb, type: s.rtbType } });
      } else if (s.rtb > 0 && s.rtbType === 'thrown') {
        applyModernAttackFields(prefix, { thrown: { strength: s.rtb, type: 'thrown' } });
      } else if (s.rtb > 0 && s.rtbType === 'fire') {
        applyModernAttackFields(prefix, { fireBreath: { strength: s.rtb, type: 'fire' } });
      } else if (s.rtb > 0 && s.rtbType === 'lightning') {
        applyModernAttackFields(prefix, { lightningBreath: { strength: s.rtb, type: 'lightning' } });
      }
    }
    document.getElementById(prefix + 'Def').value = s.def;
    document.getElementById(prefix + 'Res').value = s.res;
    document.getElementById(prefix + 'ToHitMod').value = s.toHitMod;
    document.getElementById(prefix + 'ToHitRtbMod').value = s.toHitRtbMod;
    document.getElementById(prefix + 'ToBlkMod').value = s.toBlkMod;
    document.getElementById(prefix + 'HP').value = s.hp;
    document.getElementById(prefix + 'CityWalls').value = s.cityWalls;
    document.getElementById(prefix + 'Dmg').value = s.dmg;
    document.getElementById(prefix + 'Weapon').value = s.weapon;
    document.getElementById(prefix + 'Armor').value = s.armor || 'normal';
    document.getElementById(prefix + 'Level').value = s.level;
    populateSpecialUnitOptions(prefix, document.getElementById('gameVersion').value,
      identity.specialUnit);
    setIdentityControls(prefix, identity);
    syncLegacyUnitTypeControl(prefix);
    clearAbilities(prefix);
    applyAbilities(prefix, s.abilities);
    // Special values are card-owned in every version. Presets still describe them by
    // ability key, so mirror the just-applied fixture values before the calculation
    // reads the card.
    syncModernSpecialCard(prefix);
    syncDosSpecialCard(prefix);
    refreshAbilityFieldVisibility();
  }
  const activeVersion = document.getElementById('gameVersion').value;
  const unitsDb = unitDatabases[activeVersion] || [];
  function selectPredefined(prefix, unitName) {
    const match = unitsDb.find(u => u.name === unitName);
    if (!match) {
      console.warn(`Preset "${name}": predefined unit "${unitName}" not found in ${activeVersion}`);
      document.getElementById(prefix + 'Unit').value = 'custom';
      syncUnitDisplay(prefix);
      return false;
    }
    document.getElementById(prefix + 'Unit').value = String(match.id);
    syncUnitDisplay(prefix);
    return true;
  }
  if (preset.aUnitName) {
    if (!selectPredefined('a', preset.aUnitName)) setUnit('a', preset.a || {});
  } else {
    setUnit('a', preset.a || {});
    document.getElementById('aUnit').value = 'custom';
    syncUnitDisplay('a');
  }
  if (preset.bUnitName) {
    if (!selectPredefined('b', preset.bUnitName)) setUnit('b', preset.b || {});
  } else {
    setUnit('b', preset.b || {});
    document.getElementById('bUnit').value = 'custom';
    syncUnitDisplay('b');
  }
  updateUnitLock('a');
  updateUnitLock('b');
  // Roster selection restores intrinsic abilities and clears the panel, but a
  // preset may intentionally combine that predefined unit with user-selectable
  // enchantment/building/reform conditions. Reapply only the enchantment-source
  // values; intrinsic ability controls remain roster-owned and locked.
  function applyPresetEnchantments(prefix, config) {
    const values = config && config.abilities;
    if (!values) return;
    for (const abil of abilityUiDefs()) {
      if (abil.source !== 'enchantment'
          || !Object.prototype.hasOwnProperty.call(values, abil.key)) continue;
      setAbilityControlValue(prefix, abil, values[abil.key]);
    }
  }
  if (preset.aUnitName) applyPresetEnchantments('a', preset.a);
  if (preset.bUnitName) applyPresetEnchantments('b', preset.b);
  // Synthetic custom test units can declare base identity/name to exercise identity-gated
  // paths (roster-selected presets already got authoritative identity from applyUnit).
  const presetVersion = document.getElementById('gameVersion').value;
  for (const [prefix, config] of [['a', preset.a], ['b', preset.b]]) {
    if (document.getElementById(prefix + 'Unit').value !== 'custom') continue;
    const controls = readIdentityControls(prefix);
    unitIdentity[prefix] = {
      ...createCustomUnitIdentity(presetVersion, controls),
      ...(config && typeof config.name === 'string' ? { name: config.name } : {}),
    };
  }
  if (preset.a && preset.a.level) document.getElementById('aLevel').value = preset.a.level;
  if (preset.a && preset.a.weapon) document.getElementById('aWeapon').value = preset.a.weapon;
  if (preset.b && preset.b.level) document.getElementById('bLevel').value = preset.b.level;
  if (preset.b && preset.b.weapon) document.getElementById('bWeapon').value = preset.b.weapon;
  document.getElementById('rangedCheck').checked = preset.rangedCheck || false;
  document.getElementById('rangedDist').value = preset.rangedDist || 1;
  document.getElementById('aCityWalls').value = (preset.a && preset.a.cityWalls) || 'none';
  document.getElementById('bCityWalls').value = (preset.b && preset.b.cityWalls)
    || preset.cityWalls || 'none';
  document.getElementById('nodeAura').value = preset.nodeAura || 'none';
  const legacyLightDark = preset.enchLightDark || 'none';
  document.getElementById('trueLight').checked = !!preset.trueLight || legacyLightDark === 'trueLight';
  document.getElementById('darkness').checked = !!preset.darkness || legacyLightDark === 'darkness';
  if (preset.eternalNight) {
    const side = preset.eternalNight === 'defender' ? 'b' : 'a';
    const el = document.getElementById(side + 'Abil_eternalNight');
    if (el) el.checked = true;
  }
  document.getElementById('chaosSurge').value = preset.chaosSurge || 0;
  document.getElementById('wallOfFire').checked = preset.wallOfFire || false;
  document.getElementById('warpReality').checked = preset.warpReality || false;
  document.getElementById('chaosConjunction').checked = preset.chaosConjunction || false;
  document.getElementById('hurricane').checked = preset.hurricane || false;
  document.getElementById('poxHost').checked = preset.poxHost || false;
  refreshAbilityFieldVisibility();
  recalculate();
}

// --- Full page-state persistence (collect / apply) ---

// Ids that look like state but aren't: combobox search fields and the preset filter
// (transient UI), plus any matrix* id (defensive — those live outside #calcMain anyway).
const STATE_EXCLUDE = new Set([
  'aUnitSearch', 'bUnitSearch', 'presetSearch',
  // R8 identity is persisted below. The hidden compact token is only a compatibility
  // projection for old preset callers and legacy v1 restore.
  'aAbil_unitType', 'bAbil_unitType',
]);

const PAGE_STATE_VERSION = 2;

function persistedIdentity(prefix) {
  const controls = readIdentityControls(prefix);
  const stored = unitIdentity[prefix] || {};
  return {
    isHero: controls.isHero,
    baseRace: controls.baseRace,
    baseFantastic: controls.baseFantastic,
    specialUnit: controls.specialUnit,
    ...(typeof stored.name === 'string' && stored.name ? { name: stored.name } : {}),
  };
}

function validatePersistedIdentity(blob) {
  if (!blob.identity) return;
  for (const prefix of ['a', 'b']) {
    const value = blob.identity[prefix];
    if (value == null) continue;
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new TypeError(`Invalid ${prefix} identity record`);
    }
    if (blob.v === 1) {
      if (value.race != null && typeof value.race !== 'string') throw new TypeError('Invalid legacy race');
      if (value.name != null && typeof value.name !== 'string') throw new TypeError('Invalid legacy name');
      continue;
    }
    if (typeof value.isHero !== 'boolean'
        || typeof value.baseFantastic !== 'boolean'
        || typeof value.baseRace !== 'string'
        || typeof value.specialUnit !== 'string'
        || (value.name != null && typeof value.name !== 'string')) {
      throw new TypeError(`Invalid R8 ${prefix} identity record`);
    }
    // Calculated/live identity and numeric source IDs never cross the persistence boundary.
    for (const forbidden of ['race', 'fantastic', 'templateId', 'heroTypeId', 'version']) {
      if (Object.prototype.hasOwnProperty.call(value, forbidden)) {
        throw new TypeError(`Persisted identity contains calculated/internal field ${forbidden}`);
      }
    }
  }
}

// Snapshot every calculator control as a full id->value map (the lossless representation).
// gameVersion lives in .version-bar, outside #calcMain, so it's appended explicitly.
// collectState() derives a smaller default-diffed blob from this for storage/sharing.
function collectFullState() {
  const ids = {};
  const els = Array.from(document.querySelectorAll('#calcMain input, #calcMain select'));
  const gv = document.getElementById('gameVersion');
  if (gv) els.push(gv);
  for (const el of els) {
    const id = el.id;
    if (!id || STATE_EXCLUDE.has(id) || id.startsWith('matrix')) continue;
    ids[id] = (el.type === 'checkbox') ? el.checked : el.value;
  }
  return {
    v: PAGE_STATE_VERSION,
    ids,
    identity: { a: persistedIdentity('a'), b: persistedIdentity('b') },
    generic: {
      a: !!(unitBaseStats['a'] && unitBaseStats['a'].generic),
      b: !!(unitBaseStats['b'] && unitBaseStats['b'].generic),
    },
  };
}

// Apply a full id->value map. Order is load-bearing (same lesson as applyPreset): version
// first (repopulates dropdowns + ability panels), then JS-side identity, then every control
// value (skip-missing for forward-compat), then visibility.
function applyFullState(blob) {
  if (!blob || ![1, PAGE_STATE_VERSION].includes(blob.v)) {
    throw new TypeError('Unsupported page-state version');
  }
  validatePersistedIdentity(blob);
  const prevRestoring = _restoring; // preserve an outer guard (getDefaultIds' dance)
  _restoring = true;
  try {
    const versionSel = document.getElementById('gameVersion');
    const blobVersion = blob.ids && normalizeGameVersion(blob.ids.gameVersion);
    if (versionSel && blobVersion) {
      if (versionSel.value !== blobVersion) {
        versionSel.value = blobVersion;
      }
      onVersionChange();
    }
    // Restore the version-scoped roster/source selection before any editable controls.
    // Unknown selections deliberately become Custom rather than leaking a stale source ID.
    for (const prefix of ['a', 'b']) {
      const selection = blob.ids && blob.ids[prefix + 'Unit'];
      const select = document.getElementById(prefix + 'Unit');
      const units = unitDatabases[versionSel.value] || [];
      const selectedUnit = selection !== 'custom'
        ? units.find(unit => String(unit.id) === String(selection)) : null;
      select.value = selectedUnit ? String(selectedUnit.id) : 'custom';
      if (selectedUnit) {
        setRosterUnitRecords(prefix, selectedUnit, versionSel.value);
      } else {
        const savedIdentity = blob.identity && blob.identity[prefix];
        const legacy = blob.v === 1;
        unitIdentity[prefix] = {
          ...createCustomUnitIdentity(versionSel.value, legacy ? {
            baseRace: savedIdentity && savedIdentity.race,
          } : (savedIdentity || {})),
          ...(savedIdentity && typeof savedIdentity.name === 'string'
            ? { name: savedIdentity.name } : {}),
        };
      }
      const wantGeneric = !!(blob.generic && blob.generic[prefix]);
      unitBaseStats[prefix] = { ...(unitBaseStats[prefix] || {}), generic: wantGeneric };
    }
    if (blob.ids) {
      for (const [id, val] of Object.entries(blob.ids)) {
        if (id === 'gameVersion' || id === 'aUnit' || id === 'bUnit') continue;
        const el = document.getElementById(id);
        if (!el) continue; // forward-compat: ignore ids this build no longer has
        if (el.type === 'checkbox') el.checked = !!val;
        else if ((id === 'aAbil_nightshade' || id === 'bAbil_nightshade')
          && typeof val === 'boolean') el.value = val ? 1 : 0;
        else el.value = val;
      }
    }
    // Populate version-valid options and restore Custom base controls. Predefined controls
    // are reconstructed authoritatively from the selected roster in updateUnitLock below.
    for (const prefix of ['a', 'b']) {
      const isCustom = document.getElementById(prefix + 'Unit').value === 'custom';
      const savedIdentity = blob.identity && blob.identity[prefix];
      const preferredSpecial = blob.v === PAGE_STATE_VERSION && savedIdentity
        ? savedIdentity.specialUnit : document.getElementById(prefix + 'SpecialUnit').value;
      populateSpecialUnitOptions(prefix, versionSel.value, preferredSpecial);
      if (isCustom && blob.v === PAGE_STATE_VERSION && savedIdentity) {
        setIdentityControls(prefix, savedIdentity);
      } else if (isCustom && !(blob.identityControlsPresent
          ? blob.identityControlsPresent[prefix]
          : blob.ids && Object.prototype.hasOwnProperty.call(blob.ids, prefix + 'BaseHero'))) {
        const legacy = document.getElementById(prefix + 'Abil_unitType');
        setIdentityControlsFromLegacy(prefix, legacy && legacy.value,
          savedIdentity && savedIdentity.race);
      }
    }
    // Reflect aUnit/bUnit selections in the combobox search fields, then rebuild the
    // JS-side unit records (unitBaseStats) and lock styling for the restored selection
    // via the value-preserving path — a plain updateUnitLock would re-run applyUnit and
    // overwrite the restored, possibly hand-edited, fields.
    syncUnitDisplay('a');
    syncUnitDisplay('b');
    updateUnitLock('a', false);
    updateUnitLock('b', false);
    refreshAbilityFieldVisibility();
    updateGlobalEnchantmentVisibility(versionSel ? versionSel.value : document.getElementById('gameVersion').value);
  } finally {
    _restoring = prevRestoring;
  }
  recalculate();
}

// Per-version cache of the default id->value map (what a fresh load of that version yields).
// Computed lazily by snapshotting the live state, resetting to the version's defaults,
// capturing them, then restoring — so it never disturbs what the user sees. The dance runs
// at most once per version; thereafter it's a map lookup. Underpins the default-diff in
// collectState/applyState. Reset to defaults is version-correct (per-version controls and
// default units differ), so the diff is always lossless.
const _defaultIdsCache = {};
function getDefaultIds(version) {
  if (_defaultIdsCache[version]) return _defaultIdsCache[version];
  const prevRestoring = _restoring;
  _restoring = true;                 // suppress the recalc save hook during the dance
  const saved = collectFullState();  // exact live state, restored below
  try {
    resetCalculatorState(version);   // mutate the DOM to this version's clean defaults
    _defaultIdsCache[version] = collectFullState().ids;
  } finally {
    applyFullState(saved);           // put the user's state back, untouched
    _restoring = prevRestoring;
  }
  return _defaultIdsCache[version];
}

// Public snapshot for storage/sharing: a default-diffed blob. Only ids differing from the
// current version's defaults are kept (gameVersion always kept, so applyState knows which
// default set to expand against). This shrinks the ~400-control map to the handful the user
// actually changed — small enough that the compressed share URL stays short.
function collectState() {
  const full = collectFullState();
  const defaults = getDefaultIds(full.ids.gameVersion);
  const ids = {};
  for (const [id, val] of Object.entries(full.ids)) {
    if (id === 'gameVersion' || defaults[id] !== val) ids[id] = val;
  }
  return { v: full.v, ids, identity: full.identity, generic: full.generic };
}

// M6 replaced the one-choice Lava Smelter selector with five independent flags. Saved states and
// share links from before that change still carry `<side>Abil_lavaSmelter`; translate its selected
// grant unless a newer payload explicitly supplies the corresponding replacement checkbox.
function migrateRetiredControlIds(ids, fallbackVersion = '') {
  const migrated = { ...(ids || {}) };
  // Starting healing-category state is no longer a UI concept. Older local state and
  // share links may contain these controls; discard them instead of silently restoring
  // an invisible combat condition.
  for (const prefix of ['a', 'b']) {
    for (const suffix of ['IrrecoverableDamage', 'UndeadDamage', 'BaseBonusHp', 'NoHealing']) {
      delete migrated[prefix + suffix];
    }
  }
  // The retired global selector always affected card B. Carry old saved states and share
  // links forward without guessing that card A was inside the walls.
  if (Object.prototype.hasOwnProperty.call(migrated, 'cityWalls')
      && !Object.prototype.hasOwnProperty.call(migrated, 'bCityWalls')) {
    migrated.bCityWalls = migrated.cityWalls;
  }
  delete migrated.cityWalls;
  // F24 briefly stored modern army Blur in three global controls. Card A is always the
  // tactical attacker and Card B the tactical defender now, so translate the persistent
  // army flags through the old initiating-side mapping. The retired representation wins
  // when present because the modern card checkboxes were disabled and always false in F24,
  // including in a full (undiffed) state blob.
  const version = normalizeGameVersion(migrated.gameVersion)
    || normalizeGameVersion(fallbackVersion) || '';
  const hasRetiredBlur = ['combatTurnSide', 'combatAttackerBlur', 'combatDefenderBlur']
    .some(key => Object.prototype.hasOwnProperty.call(migrated, key));
  if (version.startsWith('com2') && hasRetiredBlur) {
    const initiatingSide = migrated.combatTurnSide === 'defender' ? 'defender' : 'attacker';
    const attackerArmyBlur = !!migrated.combatAttackerBlur;
    const defenderArmyBlur = !!migrated.combatDefenderBlur;
    migrated.aAbil_blur = initiatingSide === 'attacker' ? attackerArmyBlur : defenderArmyBlur;
    migrated.bAbil_blur = initiatingSide === 'attacker' ? defenderArmyBlur : attackerArmyBlur;
  }
  delete migrated.combatTurnSide;
  delete migrated.combatAttackerBlur;
  delete migrated.combatDefenderBlur;
  const lavaSmelterKeys = {
    weaponImmunity: 'lavaSmelterWeaponImmunity',
    missileImmunity: 'lavaSmelterMissileImmunity',
    resistElem: 'lavaSmelterResistElements',
    elementalArmor: 'lavaSmelterElementalArmor',
    flameBlade: 'lavaSmelterFieryBlade',
  };
  for (const prefix of ['a', 'b']) {
    const oldId = prefix + 'Abil_lavaSmelter';
    if (!Object.prototype.hasOwnProperty.call(migrated, oldId)) continue;
    const replacementKey = lavaSmelterKeys[migrated[oldId]];
    if (!replacementKey) continue;
    const replacementId = prefix + 'Abil_' + replacementKey;
    if (!Object.prototype.hasOwnProperty.call(migrated, replacementId)) {
      migrated[replacementId] = true;
    }
  }
  return migrated;
}

// Restore a blob from collectState(): re-expand the default-diff against the blob version's
// defaults, then apply the full map. Tolerant of full (undiffed) blobs too — legacy
// localStorage and older share links merge cleanly since their ids already cover everything.
function applyState(blob) {
  if (!blob || ![1, PAGE_STATE_VERSION].includes(blob.v)) {
    throw new TypeError('Unsupported page-state version');
  }
  const version = (blob.ids && normalizeGameVersion(blob.ids.gameVersion))
    || loadPersistedGameVersion() || DEFAULT_GAME_VERSION;
  const migratedIds = migrateRetiredControlIds(blob.ids, version);
  const merged = { ...getDefaultIds(version), ...migratedIds, gameVersion: version };
  applyFullState({
    v: blob.v,
    ids: merged,
    identity: blob.identity,
    generic: blob.generic,
    identityControlsPresent: {
      a: !!(blob.ids && Object.prototype.hasOwnProperty.call(blob.ids, 'aBaseHero')),
      b: !!(blob.ids && Object.prototype.hasOwnProperty.call(blob.ids, 'bBaseHero')),
    },
  });
}

// localStorage key for the persisted page-state blob. Supersedes the legacy gameVersion_v1
// (version now travels inside the blob); gameVersion_v1 is read only for a one-time seed.
const PAGE_STATE_KEY = 'pageState_v2';
const LEGACY_PAGE_STATE_KEY = 'pageState_v1';
let _saveTimer = null;

// LZ-string (URL-safe variant) for the share-link payload and the localStorage blob. The
// default-diffed JSON is small and very repetitive, so it compresses to a fraction of its
// size; the encoded form is safe in both a URL fragment and localStorage.
function lzEncode(str) { return LZString.compressToEncodedURIComponent(str); }
function lzDecode(s) { return LZString.decompressFromEncodedURIComponent(s); }

// Debounced persist of the current page state. Coalesces rapid edits (~250ms) into one
// write; wrapped in try/catch so a full/disabled storage never breaks recalc.
function scheduleSaveState() {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try {
      localStorage.setItem(PAGE_STATE_KEY, lzEncode(JSON.stringify(collectState())));
    } catch (err) { /* ignore quota/availability errors */ }
  }, 250);
}

// Read the persisted page-state blob, or null if absent/corrupt. Accepts both the compressed
// form and a legacy plain-JSON blob (which starts with '{') from before compression landed.
function readLocalState() {
  for (const key of [PAGE_STATE_KEY, LEGACY_PAGE_STATE_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const blob = JSON.parse(raw.charAt(0) === '{' ? raw : lzDecode(raw));
      if (blob && [1, PAGE_STATE_VERSION].includes(blob.v)) return { blob, key };
    } catch (err) {
      // A corrupt current blob must not prevent a valid legacy state from being imported.
    }
  }
  return null;
}

// Parse a shared-state blob out of the URL hash (#s=<payload>), or null if absent/bad.
// Current links use URL-safe LZ tokens. Pre-compression v1 links carried either literal JSON or
// encodeURIComponent(JSON), so decode the fragment once and recognize that legacy spelling
// before attempting LZ expansion. A malformed percent escape or invalid LZ/JSON stays a clean
// null so importHashState can strip the bad link and fall back to recipient localStorage.
function parseHashState() {
  try {
    const m = /^#s=(.+)$/.exec(location.hash);
    if (!m) return null;
    let payload = m[1];
    try { payload = decodeURIComponent(payload); } catch (err) { /* try the raw spelling */ }
    const json = payload.trimStart().startsWith('{') ? payload : lzDecode(payload);
    if (!json) return null;
    const blob = JSON.parse(json);
    return (blob && [1, PAGE_STATE_VERSION].includes(blob.v)) ? blob : null;
  } catch (err) {
    return null;
  }
}

// Remove the #s=... hash silently (no reload, no history entry; replaceState fires no
// hashchange) after a one-shot import, so subsequent edits save to the recipient's own
// localStorage rather than the shared link.
function stripHash() {
  history.replaceState(null, '', location.pathname + location.search);
}

// True when the URL fragment is one of our share links (#s=...), valid or not. Foreign
// fragments (e.g. a future in-page #anchor) don't match, so we never touch them.
function isShareHash() {
  return /^#s=/.test(location.hash);
}

// Apply a state blob during init/import, recovering instead of crashing the page. applyState
// ends in recalculate(); a blob that is well-formed (passes the v===1 guard) but carries a
// value this build can't compute — corrupt storage, a <select> option removed in a later
// version, a hand-crafted link — would throw there, leaving the page half-initialised. Worse,
// a bad localStorage blob would re-throw on every reload. On failure we log, fall back to
// clean defaults (resetCalculatorState recalculates), and return false so the caller can
// discard the offending source.
function tryApplyState(blob) {
  try {
    applyState(blob);
    return true;
  } catch (err) {
    console.error('Failed to apply persisted/shared state; falling back to defaults.', err);
    resetCalculatorState();
    return false;
  }
}

// Consume a share-link hash if present: a valid blob is imported and the hash stripped; a
// malformed #s=... is our own broken link, so strip it too (leaving foreign fragments).
// Returns true iff a valid state was imported (false on a blob that failed to apply, so the
// caller falls back to the recipient's own localStorage). Shared by the init path and the
// live hashchange handler so both stay in step.
function importHashState() {
  const fromUrl = parseHashState();
  if (fromUrl) {
    stripHash();                 // one-shot import: drop the hash even if applying it fails
    return tryApplyState(fromUrl);
  }
  if (isShareHash()) stripHash();
  return false;
}

// Single init funnel. Tasks B and C plug their sources into the two hook lines so neither
// has to edit the init path directly.
function initStateFromSources() {
  resetCalculatorState();                 // baseline defaults (existing behavior)
  if (importHashState()) return;
  const fromLs = readLocalState();
  if (fromLs && !tryApplyState(fromLs.blob)) {
    // A persisted blob that throws would re-crash on every reload; discard it.
    try { localStorage.removeItem(fromLs.key); } catch (e) {}
  }
}

// --- Test Runner ---

function runTests(tolerance) {
  tolerance = tolerance || 0.002;
  const results = [];
  let allPassed = true;
  // Run the whole suite with the step runner's write check on: a step that writes a stat
  // it did not declare is a migration bug the damage numbers may not reveal (steps.js).
  setStatStepDebug(true);
  try {
    for (const [name, preset] of Object.entries(PRESETS)) {
      if (!preset.expected) continue;
      applyPreset(name);
      const panels = document.querySelectorAll('.dist-header .avg');
      const dmgToA = parseFloat(panels[0].textContent);
      const dmgToB = parseFloat(panels[1].textContent);
      const expA = preset.expected.dmgToA;
      const expB = preset.expected.dmgToB;
      const errA = expA != null ? Math.abs(dmgToA - expA) : 0;
      const errB = expB != null ? Math.abs(dmgToB - expB) : 0;
      const pass = errA < tolerance && errB < tolerance;
      if (!pass) allPassed = false;
      results.push({
        name, pass,
        dmgToA, expectedA: expA, errA: +errA.toFixed(4),
        dmgToB, expectedB: expB, errB: +errB.toFixed(4),
      });
    }
  } finally {
    setStatStepDebug(false);
  }
  const failures = results.filter(r => !r.pass);
  if (allPassed) {
    console.log(`All ${results.length} tests passed.`);
  } else {
    console.error(`${failures.length}/${results.length} tests FAILED:`);
    failures.forEach(f => console.error(`  ${f.name}: A=${f.dmgToA} (exp ${f.expectedA}, err ${f.errA}), B=${f.dmgToB} (exp ${f.expectedB}, err ${f.errB})`));
  }
  return { allPassed, total: results.length, failures };
}

