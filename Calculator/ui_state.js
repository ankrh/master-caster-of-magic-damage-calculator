// --- UI Layer: calculator state ---
// Reset, swap and version switching; preset application; and the full page-state payload
// behind the share link, the URL hash and localStorage. `runTests` runs the PRESETS suite.


const DEFAULT_GAME_VERSION = 'mom_1.31';
const GAME_VERSION_STORAGE_KEY = 'gameVersion_v1';

// Version ids that have been renamed. Saved state and shared links outlive a rename, so map
// retired ids forward here; `normalizeGameVersion` rejects anything this build does not offer
// and `loadUnitDatabase` throws on an id that reaches it unmapped.
// Only one Warlord build is supported at a time, so every retired Warlord id resolves to the
// current one rather than restoring old behaviour.
const RENAMED_GAME_VERSIONS = {
  'com2_warlord_1.5.12.5': 'com2_warlord_1.5.12.9',
  'com2_warlord_1.5.12.6': 'com2_warlord_1.5.12.9',
  'com2_warlord_1.5.12.6.2': 'com2_warlord_1.5.12.9',
  'com2_warlord_1.5.12.7': 'com2_warlord_1.5.12.9',
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
  applyModernAttackFields(prefix, null, 'Default card state');
  document.getElementById(prefix + 'Def').value = s.def;
  document.getElementById(prefix + 'Res').value = s.res;
  document.getElementById(prefix + 'ToHitMod').value = s.toHitMod;
  document.getElementById(prefix + 'ToHitRtbMod').value = s.toHitRtbMod;
  document.getElementById(prefix + 'HitChance').value = s.hitChance;
  document.getElementById(prefix + 'HitMelee').value = s.hitMelee;
  document.getElementById(prefix + 'HitRanged').value = s.hitRanged;
  document.getElementById(prefix + 'HitThrown').value = s.hitThrown;
  document.getElementById(prefix + 'HitBreath').value = s.hitBreath;
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
  recalculate();
}

function swapAttackerDefender() {
  const aUnitSel = document.getElementById('aUnit');
  const bUnitSel = document.getElementById('bUnit');
  let tmp = aUnitSel.value;
  aUnitSel.value = bUnitSel.value;
  bUnitSel.value = tmp;

  const simpleFields = ['Figs', 'Atk', 'RtbType', 'Rtb', 'ModernRangedType', 'ModernRanged', 'ModernThrown', 'ModernFireBreath', 'ModernLightningBreath', 'ToHitMod', 'ToHitRtbMod', 'HitChance', 'HitMelee', 'HitRanged', 'HitThrown', 'HitBreath', 'ToBlkMod', 'Def', 'Res', 'HP', 'Dmg', 'Level', 'Weapon', 'Armor'];
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
  renderAllMatrixPropLists();
  recalculate();
}

// --- Presets ---

const PRESET_VERSIONS = {};

// The two asserts a preset takes — that the fixture states its own version's unit record, and
// that a stated ranged mode survived the page's own withdrawal — are `card_state.js`
// (`data-scope="core"`), beside the pure applier that must halt on exactly the same fixtures.
// `assertPresetRangedMode` takes the withdrawal's outcome rather than reading the control, so the
// two appliers decide it the same way: the tick survives only where side a's derived record
// carries a conventional ranged attack.

// `origin` is the caller's own statement of what it is applying: `authored` for a key of the
// merged `PRESETS` corpus — the TEST_TREE buttons, `runTests`, and the specs that install a
// synthetic fixture to drive one path — and `ablation-probe` for a harness variant derived from
// one of those. It reaches `assertPresetRangedMode` and nothing else.
function applyPreset(name, { origin = 'authored' } = {}) {
  const preset = PRESETS[name];
  // Every caller names a key that is in `PRESETS` when the call is made, whether `definePresets`
  // merged it or a harness installed it. Returning silently left the button inert and the suite
  // one assertion short with nothing reporting it (`CLAUDE.md`, *Architecture*, the fail-loud rule).
  if (!preset) {
    throw new Error(`applyPreset: '${name}' is not a key of PRESETS.`);
  }
  const versionSel = document.getElementById('gameVersion');
  // The whole preset, decided before a single control is written. What a fixture states is
  // `presetToCardState` (`card_state.js`, `data-scope="core"`) and nothing else — the version, both
  // card states and the globals object, version gating and the two fail-loud asserts included — so
  // the Test Cases drawer and a caller with no DOM cannot state the same fixture differently.
  // `base` is the card as the user left it, because a preset is applied *over* the page: the few
  // fields no fixture restates keep their values, and the version switch's loadout reset runs over
  // them (`presetDefaultCardState` names the four).
  const applied = presetToCardState(name, preset, {
    origin,
    version: versionSel.value,
    presetVersions: PRESET_VERSIONS,
    base: { a: collectCardState('a'), b: collectCardState('b') },
  });

  // The version switch's *page* work: repopulating the roster dropdowns and rebuilding the ability
  // panels and the version-scoped option lists. Its one state effect is already in `applied`, and
  // every control it disturbs is written below.
  if (versionSel.value !== applied.version) {
    versionSel.value = applied.version;
    onVersionChange();
  }

  for (const prefix of ['a', 'b']) {
    const unitName = preset[prefix + 'UnitName'];
    const select = document.getElementById(prefix + 'Unit');
    if (unitName) {
      // `presetToCardState` has already halted if the version's roster does not carry the name, so
      // the lookup here cannot miss; it is the same roster, read through the page's cache.
      // No `setRosterUnitRecords` beside it, deliberately: everything it would install is restated
      // one line later. The identity and the `generic` flag come off the card state, and the
      // record-vocabulary halts it wraps (`assertRosterRecordStatable`) have already fired inside
      // `applyRosterUnit`, which reads `predefinedUnitRtbType` and `predefinedModernAttacks`
      // itself. Measured: removing the call left the whole suite green (F260.7 probe M15), which
      // is what a dead call looks like rather than an uncovered one.
      select.value = String(loadUnitDatabase(applied.version).find(u => u.name === unitName).id);
    } else {
      select.value = 'custom';
    }
    writeCardStateToControls(prefix, applied[prefix], `Preset '${name}' side ${prefix}`);
    // The DOM half, after the state and never before it: the lock styling, the innate marks the
    // selection implies, the Golem row lock, the legacy token and the loadout lock row.
    // `updateUnitLock` is deliberately not called — its custom branch would reset a locked Level or
    // Weapon *after* the fixture's own, which the pure applier applies before.
    refreshUnitLockDom(prefix);
    syncUnitDisplay(prefix);
  }

  writeGlobalsToControls(applied.globals);
  // The visibility pass, last, as it was: it clears nothing the gating in `applied` has not already
  // cleared, and the ranged-mode withdrawal it performs is the `held` the applier already decided.
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

// A restored value its control no longer offers halts the restore. `el.value = x` with no
// matching `<option>` clears the selection instead of failing, so the page came back with a
// blank control the user never chose and re-persisted the blank on the next save; readers keyed
// on the control carried on with it — `modernCardAttacks` (`ui_units.js`) asks the ranged select
// whether the Ranged record exists at all. Halting is the contract (`SPEC.md`, *Out-of-range
// values stop the run*), and `tryApplyState` already turns a throw here into clean defaults, a
// console report and discarding the offending blob. F93 retired four projectile tokens and any
// later option removal makes more, so the check is general rather than a list of them: a build
// that wants a retired value carried forward states the migration, as `RENAMED_GAME_VERSIONS`
// does for version ids.
//
// `gameVersion` (`applyState`) and `aUnit`/`bUnit` (roster selection) are restored by their own
// code above. The `SpecialUnit` pair's option set is version-scoped and rebuilt after the
// assignment loop, so its keys are checked against this build's whole vocabulary: a key the
// build retired halts, while one this version simply disallows keeps its existing clamp. The v2
// identity record carries the same key on its own and is checked where it is read
// (`specialUnitAllowed`, `ui_units.js`), so neither carrier can smuggle one past the other.
// The three controls the generic id loop must not touch: the version and the two roster
// selectors are restored by the version/roster path above, which rebuilds every other control's
// option set. The check and the loop skip exactly the same three, so one list states it.
const IDS_RESTORED_BEFORE_THE_ID_LOOP = ['gameVersion', 'aUnit', 'bUnit'];

function restoredBeforeTheIdLoop(id) {
  return IDS_RESTORED_BEFORE_THE_ID_LOOP.includes(id);
}

function assertRestoredValuesAreOffered(ids) {
  const offenders = [];
  for (const [id, val] of Object.entries(ids || {})) {
    if (restoredBeforeTheIdLoop(id)) continue;
    const el = document.getElementById(id);
    if (!el || el.tagName !== 'SELECT') continue;
    const value = String(val);
    const offered = (id === 'aSpecialUnit' || id === 'bSpecialUnit')
      ? ['none', ...SPECIAL_UNIT_DEFS.map(def => def.key)]
      : Array.from(el.options).map(opt => opt.value);
    if (offered.includes(value)) continue;
    offenders.push(`#${id}='${value}' (offered: ${offered.join(', ')})`);
  }
  if (offenders.length) {
    throw new TypeError(
      `Saved page state names ${offenders.length} control value${offenders.length === 1 ? '' : 's'} `
      + `this build no longer offers: ${offenders.join('; ')}. `
      + `The option was removed without a migration for states that still carry it.`);
  }
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
      assertRestoredValuesAreOffered(blob.ids);
      for (const [id, val] of Object.entries(blob.ids)) {
        if (restoredBeforeTheIdLoop(id)) continue;
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
  // A saved id this build neither offers nor renames halts, for the same reason an unofferable
  // control value does (`SPEC.md`, *Out-of-range values stop the run*) and more so: the version
  // selects which default set the blob's diff expands against, so substituting one reinterprets
  // every other id in the state under a rule set the user never chose. Carrying an id forward is
  // `RENAMED_GAME_VERSIONS`' job. A blob that names no version at all is a different case — a
  // legacy v1 payload with nothing to be out of range — and keeps the fallback below.
  const savedVersion = blob.ids && blob.ids.gameVersion;
  if (savedVersion && !normalizeGameVersion(savedVersion)) {
    throw new TypeError(
      `Saved page state names gameVersion='${savedVersion}', which this build neither offers `
      + `(${Array.from(document.getElementById('gameVersion').options).map(o => o.value).join(', ')}) `
      + `nor renames. Restoring it under another version would reinterpret every other saved value.`);
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

// Which presets a `runTests` call will evaluate. Its own function because it is the whole of what
// the optional `names` argument does, and a suite can then check the unfiltered selection without
// paying for a 1,161-fixture evaluation to observe it (GPT review of F260.10, finding 4: with the
// selection inlined, a fallback returning `[]` instead of the corpus made the Test Cases drawer
// evaluate nothing while every named run stayed green).
//
// `names` absent is the drawer's call and selects the whole corpus. Present, it selects those
// presets **in corpus order**, not in the caller's: each `applyPreset` writes over the card the
// previous one left, so the order is part of what is being run and is not the caller's to vary.
function presetNamesToRun(names) {
  const stated = name => Object.prototype.hasOwnProperty.call(PRESETS, name)
    && Boolean(PRESETS[name].expected);
  if (names == null) return Object.keys(PRESETS).filter(stated);
  const requested = [...names];
  // `in` would accept `toString` and every other inherited name (same review, finding 5).
  const absent = requested.filter(
    name => !Object.prototype.hasOwnProperty.call(PRESETS, name));
  if (absent.length) {
    throw new Error(`runTests: ${absent.length} requested preset(s) are in no fixture file `
      + `[${absent.slice(0, 8).join(', ')}]. A caller naming a preset this build does not have `
      + 'would otherwise run a shorter suite and still report green.');
  }
  const wanted = new Set(requested);
  return Object.keys(PRESETS).filter(name => wanted.has(name) && stated(name));
}

// `names` is optional and is what the Test Cases drawer never passes: with it absent the whole
// corpus runs, which is the drawer's behaviour and has not changed. `tests/preset-equivalence-gate.spec.js` passes
// a derived control-path sample instead (`tools/preset_control_path_sample.js`); `TESTS.md` states
// which suite carries which claim over the corpus.
function runTests(tolerance, names) {
  tolerance = tolerance || 0.002;
  const results = [];
  let allPassed = true;
  // Numbers actually compared, not expectation blocks present. `expected: {}` is truthy and used
  // to reach the end of a run having compared nothing (F260.9 review, finding 2); the count is
  // returned so a caller can see the difference, and a run that compares nothing halts below.
  let comparisons = 0;
  // The category quantities are counted apart from the two totals and never folded into them
  // (F268.7). Sixteen of the two counts' numbers are compared per fixture and all but 168 of
  // them across the whole corpus are `0 == 0`, so adding them to `comparisons` would take one
  // honest figure and turn it into a much larger misleading one. `categoryStated` is the count
  // that says what the category claims actually pin: the pairs a fixture writes out because
  // they are not zero.
  let categoryComparisons = 0;
  let categoryStated = 0;
  // Run the whole suite with the step runner's write check on: a step that writes a stat
  // it did not declare is a migration bug the damage numbers may not reveal (steps.js).
  setStatStepDebug(true);
  try {
    for (const name of presetNamesToRun(names)) {
      const preset = PRESETS[name];
      applyPreset(name);
      const panels = document.querySelectorAll('.dist-header .avg');
      const dmgToA = parseFloat(panels[0].textContent);
      const dmgToB = parseFloat(panels[1].textContent);
      // The spread is read off the same two elements the means are read off, so the four numbers
      // provably describe one panel of one render rather than a mean from this recalculation and a
      // spread from whatever the page last held (F268.3). `renderDistPanel` writes it.
      const sdToA = parseFloat(panels[0].dataset.sd);
      const sdToB = parseFloat(panels[1].dataset.sd);
      if (!Number.isFinite(sdToA) || !Number.isFinite(sdToB)) {
        throw new Error(`runTests: the damage panels for '${name}' carry no \`data-sd\`, so the `
          + 'standard deviation half of every expectation would be compared against NaN and pass. '
          + '`renderDistPanel` (`ui.js`) is what writes it.');
      }
      // The four category quantities per side, off the panel `renderCombatStateSummary` wrote
      // for the same recalculation (F268.7). A panel with no attributes is a halt for the same
      // reason a missing `data-sd` is: sixteen expectations would otherwise be compared against
      // NaN and every one of them would pass.
      const categoryPanels = {
        A: document.getElementById('aCombatStateSummary'),
        B: document.getElementById('bCombatStateSummary'),
      };
      const observedCategories = {};
      for (const [side, panel] of Object.entries(categoryPanels)) {
        if (!panel) {
          throw new Error(`runTests: '${name}' rendered no #${side.toLowerCase()}`
            + 'CombatStateSummary panel, so its four category expectations would be compared '
            + 'against nothing. `renderCombatStateSummary` (`ui.js`) is what writes it.');
        }
        observedCategories[side] = {};
        for (const attribute of COMBAT_CATEGORY_PANEL_ATTRIBUTES) {
          const mean = parseFloat(panel.dataset[attribute.mean]);
          const sd = parseFloat(panel.dataset[attribute.sd]);
          if (!Number.isFinite(mean) || !Number.isFinite(sd)) {
            throw new Error(`runTests: the post-combat panel for '${name}' side ${side} carries `
              + `no \`data-${attribute.mean}\`/\`data-${attribute.sd}\` pair for `
              + `${attribute.metric}, so that expectation would be compared against NaN and pass.`);
          }
          observedCategories[side][attribute.metric] = { mean, sd };
        }
      }
      const expected = presetExpectation(name, preset);
      comparisons += expected.comparisons;
      categoryComparisons += expected.categoryComparisons;
      categoryStated += expected.categoryStated;
      const categoryFailures = [];
      for (const claim of Object.values(expected.categories)) {
        const observed = observedCategories[claim.side][claim.metric];
        const errMean = Math.abs(observed.mean - claim.mean);
        const errSd = Math.abs(observed.sd - claim.sd);
        if (!(errMean < tolerance) || !(errSd < tolerance)) {
          categoryFailures.push(`${claim.meanField}=${observed.mean} (exp ${claim.mean}), `
            + `${claim.sdField}=${observed.sd} (exp ${claim.sd})`);
        }
      }
      const errA = expected.comparedA ? Math.abs(dmgToA - expected.dmgToA) : 0;
      const errB = expected.comparedB ? Math.abs(dmgToB - expected.dmgToB) : 0;
      const errSdA = expected.comparedA ? Math.abs(sdToA - expected.sdDmgToA) : 0;
      const errSdB = expected.comparedB ? Math.abs(sdToB - expected.sdDmgToB) : 0;
      const pass = errA < tolerance && errB < tolerance
        && errSdA < tolerance && errSdB < tolerance && categoryFailures.length === 0;
      if (!pass) allPassed = false;
      results.push({
        name, pass,
        dmgToA, expectedA: expected.dmgToA, errA: +errA.toFixed(4),
        dmgToB, expectedB: expected.dmgToB, errB: +errB.toFixed(4),
        sdToA, expectedSdA: expected.sdDmgToA, errSdA: +errSdA.toFixed(4),
        sdToB, expectedSdB: expected.sdDmgToB, errSdB: +errSdB.toFixed(4),
        categoryFailures,
      });
    }
  } finally {
    setStatStepDebug(false);
  }
  const failures = results.filter(r => !r.pass);
  if (results.length > 0 && comparisons === 0) {
    throw new Error(`runTests: ${results.length} preset(s) ran and 0 numbers were compared, so `
      + 'this run reported a pass while checking nothing.');
  }
  if (allPassed) {
    console.log(`All ${results.length} tests passed (${comparisons} numbers compared, plus `
      + `${categoryComparisons} category numbers of which ${categoryStated} pairs are stated).`);
  } else {
    console.error(`${failures.length}/${results.length} tests FAILED:`);
    failures.forEach(f => console.error(`  ${f.name}: A=${f.dmgToA} (exp ${f.expectedA}, err ${f.errA}), B=${f.dmgToB} (exp ${f.expectedB}, err ${f.errB}), sdA=${f.sdToA} (exp ${f.expectedSdA}, err ${f.errSdA}), sdB=${f.sdToB} (exp ${f.expectedSdB}, err ${f.errSdB})${f.categoryFailures.length ? '; ' + f.categoryFailures.join('; ') : ''}`));
  }
  return { allPassed, total: results.length, comparisons, categoryComparisons, categoryStated,
    failures };
}

