// --- UI Layer: matrix property drawer ---
// The editable Attacker, Defender and Global property lists shown in the matrix view, and
// their persisted state. Each list is independent of the main calculator panels.

const MATRIX_LEVEL_OPTIONS  = [['normal','Normal'],['regular','Regular'],['veteran','Veteran'],['elite','Elite'],['ultra_elite','Ultra Elite'],['champion','Champion']];
const MATRIX_WEAPON_OPTIONS = [['normal','Normal'],['magic','Magic'],['mithril','Mithril'],['adamantium','Adamantium']];
const MATRIX_ARMOR_OPTIONS  = [['normal','Normal'],['orihalcon','Orihalcon']];
const MATRIX_CITY_WALL_OPTIONS = [['none','Outside / none'],['1','Inside (+1 def)'],['3','Inside (+3 def)']];

const MATRIX_GLOBAL_DEFS = [
  { key: 'trueLight',   label: 'True Light',    type: 'bool' },
  { key: 'darkness',    label: 'Darkness',      type: 'bool' },
  { key: 'wallOfFire',  label: 'Wall of Fire',  type: 'bool' },
  { key: 'warpReality', label: 'Warp Reality',  type: 'bool' },
  { key: 'chaosConjunction', label: 'Chaos Conjunction', type: 'bool', modernOnly: true },
  { key: 'hurricane',   label: 'Hurricane',     type: 'bool' },
  { key: 'poxHost',     label: 'Pox host present', type: 'bool' },
  { key: 'chaosSurge',  label: 'Chaos Surge enchantments', type: 'num', min: 0, max: 99 },
  { key: 'nodeAura',    label: 'Node aura',  type: 'select',
    options: [['none','None'],['chaos','Chaos'],['nature','Nature'],['sorcery','Sorcery']] },
  { key: 'rangedDist',  label: 'Ranged distance', type: 'num', min: 1, max: 99,
    rangedOnly: true, requiredInRanged: true },
];

let matrixPropertyState = { a: [], b: [], global: [], _seeded: false };
const MATRIX_STATE_KEY = 'matrixPropertyState_v1';

function loadMatrixPropertyStateFromStorage() {
  try {
    const raw = localStorage.getItem(MATRIX_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const a = Array.isArray(parsed.a) ? parsed.a : [];
    const b = Array.isArray(parsed.b) ? parsed.b : [];
    const global = Array.isArray(parsed.global) ? parsed.global : [];
    // City Walls used to be a global property implicitly attached to card B. Preserve that
    // saved meaning once, then expose the migrated row in the Defender settings box.
    const retiredCityWalls = global.find(row => row.key === 'cityWalls');
    if (retiredCityWalls && !b.some(row => row.key === 'cityWalls')) {
      b.push({ ...retiredCityWalls });
    }
    // Migrate F24's retired global army controls to card-owned army context. The old turn
    // selector said which persistent army contained tactical attacker Card A; Card B was
    // necessarily the other army. Only active Blur rows need representation because an
    // absent card row is the false/default value.
    const retiredBlurKeys = new Set([
      'combatTurnSide', 'combatAttackerBlur', 'combatDefenderBlur',
    ]);
    const hasRetiredBlurRows = global.some(row => retiredBlurKeys.has(row.key));
    const globalValue = (key, fallback) => {
      const row = global.find(candidate => candidate.key === key);
      return row && row.enabled ? row.value : fallback;
    };
    const initiatingSide = globalValue('combatTurnSide', 'attacker') === 'defender'
      ? 'defender' : 'attacker';
    const attackerArmyBlur = !!globalValue('combatAttackerBlur', false);
    const defenderArmyBlur = !!globalValue('combatDefenderBlur', false);
    const migratedCardBlur = initiatingSide === 'attacker'
      ? { a: attackerArmyBlur, b: defenderArmyBlur }
      : { a: defenderArmyBlur, b: attackerArmyBlur };
    if (hasRetiredBlurRows) {
      for (const prefix of ['a', 'b']) {
        const rows = prefix === 'a' ? a : b;
        const withoutOldBlur = rows.filter(row => row.key !== 'blur');
        rows.splice(0, rows.length, ...withoutOldBlur);
        if (migratedCardBlur[prefix]) {
          rows.push({ key: 'blur', enabled: true, value: true });
        }
      }
    }
    const retiredStartingState = new Set([
      'irrecoverableDamage', 'undeadDamage', 'baseBonusHp', 'noHealing',
    ]);
    return {
      a: a.filter(row => !retiredStartingState.has(row.key)),
      b: b.filter(row => !retiredStartingState.has(row.key)),
      global: global.filter(row => row.key !== 'cityWalls' && !retiredBlurKeys.has(row.key)),
      _seeded: true,
    };
  } catch (err) {
    return null;
  }
}

function saveMatrixPropertyState() {
  try {
    localStorage.setItem(MATRIX_STATE_KEY, JSON.stringify({
      a: matrixPropertyState.a,
      b: matrixPropertyState.b,
      global: matrixPropertyState.global,
      _seeded: true,
    }));
  } catch (err) {
    // Storage may be full or disabled; ignore.
  }
}

// Returns the descriptor for a property key in a given box.
// Box-side descriptors: 'level', 'weapon', 'armor' (synthetic) or any
// enchantment whose uiKey matches.
function matrixPropertyDef(box, key) {
  if (box === 'global') {
    return MATRIX_GLOBAL_DEFS.find(d => d.key === key) || null;
  }
  if (key === 'level')  return { key: 'level',  label: 'Unit level',  type: 'select', options: MATRIX_LEVEL_OPTIONS };
  if (key === 'weapon') return { key: 'weapon', label: 'Weapon type', type: 'select', options: MATRIX_WEAPON_OPTIONS };
  if (key === 'armor')  return { key: 'armor',  label: 'Armor type',  type: 'select', options: MATRIX_ARMOR_OPTIONS };
  if (key === 'cityWalls') return { key: 'cityWalls', label: 'City walls', type: 'select', options: MATRIX_CITY_WALL_OPTIONS };
  if (key === 'damageTaken') return { key, label: 'Damage taken', type: 'num', min: 0, max: 999 };
  const abil = abilityUiDefs().find(a => a.source === 'enchantment' && a.uiKey === key);
  if (!abil) return null;
  return {
    key: abil.uiKey,
    label: abilityDisplayLabel(abil),
    type: abil.type,
    options: abil.options,
    min: abil.min,
    max: abil.max,
    abil,
  };
}

// All selectable properties for a given box (used by the search dropdown).
function matrixPropertyCandidates(box) {
  if (box === 'global') {
    const isRanged = activeMatrixMode === 'ranged';
    const modern = document.getElementById('gameVersion').value.startsWith('com2');
    return MATRIX_GLOBAL_DEFS
      .filter(d => !d.rangedOnly || isRanged)
      .filter(d => !d.modernOnly || modern)
      .map(d => ({ key: d.key, label: d.label }));
  }
  const version = document.getElementById('gameVersion').value;
  const list = [
    { key: 'level',  label: 'Unit level' },
    { key: 'weapon', label: 'Weapon type' },
    { key: 'cityWalls', label: 'City walls' },
    { key: 'damageTaken', label: 'Damage taken' },
  ];
  // Armor quality doesn't exist in MoM (see armorExists in deriveUnitStats).
  if (!version.startsWith('mom_')) list.push({ key: 'armor', label: 'Armor type' });
  for (const abil of abilityUiDefs()) {
    if (abil.source !== 'enchantment') continue;
    if (!subgroupAllowedForVersion(abil.subgroup, version)) continue;
    list.push({ key: abil.uiKey, label: abilityDisplayLabel(abil) });
  }
  return list;
}

function matrixDefaultValueForType(def) {
  if (def.type === 'bool') return true;
  if (def.type === 'select') {
    const opts = def.options || [];
    return opts.length > 1 ? opts[1][0] : (opts[0] ? opts[0][0] : null);
  }
  if (def.type === 'numcheck') return 1;
  if (def.type === 'num') {
    if (def.key === 'rangedDist') return 1;
    return 1;
  }
  return null;
}

function seedMatrixPropertyStateFromDOM() {
  const rows = { a: [], b: [], global: [] };
  for (const prefix of ['a', 'b']) {
    const levelEl  = document.getElementById(prefix + 'Level');
    const weaponEl = document.getElementById(prefix + 'Weapon');
    const armorEl  = document.getElementById(prefix + 'Armor');
    const cityWallsEl = document.getElementById(prefix + 'CityWalls');
    if (levelEl  && levelEl.value  !== 'normal') rows[prefix].push({ key: 'level',  enabled: true, value: levelEl.value });
    if (weaponEl && weaponEl.value !== 'normal') rows[prefix].push({ key: 'weapon', enabled: true, value: weaponEl.value });
    if (armorEl  && armorEl.value  !== 'normal') rows[prefix].push({ key: 'armor',  enabled: true, value: armorEl.value });
    if (cityWallsEl && cityWallsEl.value !== 'none') rows[prefix].push({ key: 'cityWalls', enabled: true, value: cityWallsEl.value });
    const damageTaken = parseInt(document.getElementById(prefix + 'Dmg').value, 10) || 0;
    if (damageTaken) rows[prefix].push({ key: 'damageTaken', enabled: true, value: damageTaken });
    for (const abil of abilityUiDefs()) {
      if (abil.source !== 'enchantment') continue;
      const val = getAbilityControlValue(prefix, abil);
      if (val === undefined) continue;
      if (!abilityValueIsActive(abil, val)) continue;
      rows[prefix].push({ key: abil.uiKey, enabled: true, value: val });
    }
  }
  for (const def of MATRIX_GLOBAL_DEFS) {
    const el = document.getElementById(def.key);
    if (!el) continue;
    if (def.type === 'bool') {
      if (el.checked) rows.global.push({ key: def.key, enabled: true, value: true });
    } else if (def.type === 'select') {
      if (el.value && el.value !== 'none') rows.global.push({ key: def.key, enabled: true, value: el.value });
    } else if (def.type === 'num') {
      const n = parseInt(el.value, 10) || 0;
      const seedDefault = def.key === 'rangedDist' ? 1 : 0;
      if (n !== seedDefault) rows.global.push({ key: def.key, enabled: true, value: n });
    }
  }
  matrixPropertyState = { ...rows, _seeded: true };
  saveMatrixPropertyState();
}

function ensureMatrixPropertyStateLoaded() {
  if (matrixPropertyState._seeded) return;
  const loaded = loadMatrixPropertyStateFromStorage();
  if (loaded) {
    matrixPropertyState = loaded;
  } else {
    seedMatrixPropertyStateFromDOM();
  }
}

// Find a row in the given box by key.
function matrixPropertyRow(box, key) {
  return (matrixPropertyState[box] || []).find(r => r.key === key) || null;
}

// Read the effective value of a per-side select property.
function matrixSideSetting(prefix, key) {
  const def = matrixPropertyDef(prefix, key);
  const row = matrixPropertyRow(prefix, key);
  const defaultValue = def && def.type === 'select' && def.options && def.options[0]
    ? def.options[0][0] : (def && def.type === 'bool' ? false : 0);
  if (!row || !row.enabled) return defaultValue;
  return row.value ?? defaultValue;
}

// Read the effective value of a global property.
function matrixGlobalValue(key) {
  const def = MATRIX_GLOBAL_DEFS.find(d => d.key === key);
  if (def && def.modernOnly
      && !document.getElementById('gameVersion').value.startsWith('com2')) {
    if (def.type === 'bool') return false;
    if (def.type === 'select') return def.options[0][0];
  }
  const row = matrixPropertyRow('global', key);
  if (!row || !row.enabled) {
    if (!def) return null;
    if (def.type === 'bool') return false;
    if (def.type === 'select') return (def.options && def.options[0] ? def.options[0][0] : 'none');
    if (def.key === 'rangedDist') return 1;
    return 0;
  }
  return row.value;
}

// The one place a matrix enchantment row becomes a derivation value. Both readers below go
// through it, so they cannot disagree about whether a row is active.
//
// The version filter has to live here rather than in the stored state. Switching version hides a
// row but never clears `matrixPropertyState`, so a row enabled under one version survives into
// the next and stays readable. The card needs no such filter because `applyDisabled` clears
// version-hidden controls, and a cleared checkbox reads unchecked; the matrix has no equivalent
// cleaning step, and inheriting the card's assumption without its cleaning is how a Warlord-only
// `enemyEyeOfHeaven` reached DOS matrix runs against INV-2 (F258.1).
//
// `abilityValueIsActive` is the card's own predicate, so routing through it also makes the two
// views agree on what "active" means rather than restating it a third time.
function matrixEnchantmentValue(prefix, abil, version) {
  if (!subgroupAllowedForVersion(abil.subgroup, version)) return undefined;
  const row = matrixPropertyRow(prefix, abil.uiKey);
  if (!row || !row.enabled) return undefined;
  if (!abilityValueIsActive(abil, row.value)) return undefined;
  return abil.type === 'bool' ? true : row.value;
}

// Build the same shape as activeNonInnateUnitEnchantments, but driven by matrix state.
function matrixAppliedEnchantments(prefix) {
  const result = {};
  const version = document.getElementById('gameVersion').value;
  for (const abil of abilityUiDefs()) {
    if (abil.source !== 'enchantment') continue;
    const value = matrixEnchantmentValue(prefix, abil, version);
    if (value === undefined) continue;
    result[abil.calcKey || abil.key] = value;
  }
  return result;
}

// True if the matrix state has the named enchantment row active for the given side.
//
// `enchKey` is the enchantment's own `key`, deliberately not its `calcKey`: nine calcKeys have
// more than one contributing def, so answering through the map above would report a sibling's row
// (asking for `teleporting` would answer for Planewalking). The two callers name one row each.
function matrixHasActiveEnchantment(prefix, enchKey) {
  const abil = abilityUiDefs().find(a => a.source === 'enchantment' && a.key === enchKey);
  if (!abil) return false;
  const version = document.getElementById('gameVersion').value;
  return matrixEnchantmentValue(prefix, abil, version) !== undefined;
}

function ensureRequiredMatrixRows(box) {
  if (box !== 'global') return;
  if (activeMatrixMode !== 'ranged') return;
  const arr = matrixPropertyState.global;
  for (const def of MATRIX_GLOBAL_DEFS) {
    if (!def.requiredInRanged) continue;
    if (!arr.some(r => r.key === def.key)) {
      arr.push({ key: def.key, enabled: true, value: matrixDefaultValueForType(def) });
    }
  }
}

function isMatrixRowRequired(box, def) {
  return box === 'global' && def.requiredInRanged && activeMatrixMode === 'ranged';
}

// Render the editable list for one box.
function renderMatrixPropList(box) {
  ensureRequiredMatrixRows(box);
  const listId = box === 'a' ? 'matrixAttackerSettings'
              : box === 'b' ? 'matrixDefenderSettings'
              : 'matrixGlobalOptions';
  const list = document.getElementById(listId);
  if (!list) return;
  list.textContent = '';
  const version = document.getElementById('gameVersion').value;
  const rows = (matrixPropertyState[box] || []).filter(row => {
    const def = matrixPropertyDef(box, row.key);
    if (!def) return false;
    if (box === 'global' && def.rangedOnly && activeMatrixMode !== 'ranged') return false;
    if (box === 'global' && def.modernOnly && !version.startsWith('com2')) return false;
    if (def.abil && !subgroupAllowedForVersion(def.abil.subgroup, version)) return false;
    if (def.abil && def.abil.key === 'blur' && abilityVersionGated(def.abil, version)) return false;
    if (row.key === 'armor' && version.startsWith('mom_')) return false; // no armor in MoM
    return true;
  });
  if (!rows.length) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'None';
    list.appendChild(empty);
    updateMatrixDrawerBadges();
    return;
  }
  for (const row of rows) {
    const def = matrixPropertyDef(box, row.key);
    if (!def) continue;
    const required = isMatrixRowRequired(box, def);
    if (required) row.enabled = true;
    const li = document.createElement('li');
    li.className = 'matrix-prop-row';

    if (!required) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!row.enabled;
      cb.addEventListener('change', () => {
        row.enabled = cb.checked;
        labelSpan.classList.toggle('disabled', !row.enabled);
        saveMatrixPropertyState();
        void renderMatrixSnapshot();
      });
      li.appendChild(cb);
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'matrix-prop-label';
    labelSpan.textContent = def.label;
    if (!row.enabled) labelSpan.classList.add('disabled');
    li.appendChild(labelSpan);

    if (def.type === 'select') {
      const sel = document.createElement('select');
      for (const [val, lbl] of def.options || []) {
        const opt = document.createElement('option');
        opt.value = val;
        opt.textContent = lbl;
        if (val === row.value) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => {
        row.value = sel.value;
        saveMatrixPropertyState();
        void renderMatrixSnapshot();
      });
      li.appendChild(sel);
    } else if (def.type === 'num' || def.type === 'numcheck') {
      const num = document.createElement('input');
      num.type = 'number';
      num.value = row.value != null ? row.value : 0;
      if (def.min != null) num.min = def.min;
      if (def.max != null) num.max = def.max;
      const commit = () => {
        const parsed = parseInt(num.value, 10);
        row.value = Number.isFinite(parsed) ? parsed : 0;
        saveMatrixPropertyState();
        void renderMatrixSnapshot();
      };
      num.addEventListener('change', commit);
      li.appendChild(num);
    }

    if (!required) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'matrix-prop-del';
      del.title = 'Remove';
      del.textContent = '×';
      del.addEventListener('click', () => {
        const arr = matrixPropertyState[box];
        const idx = arr.indexOf(row);
        if (idx >= 0) arr.splice(idx, 1);
        saveMatrixPropertyState();
        renderMatrixPropList(box);
        void renderMatrixSnapshot();
      });
      li.appendChild(del);
    }

    list.appendChild(li);
  }
  updateMatrixDrawerBadges();
}

// Live active-count badge on the combined Settings & Filters panel tab.
// Counts property rows across the three settings lists plus each non-empty name
// filter textarea (0-2).
function updateMatrixDrawerBadges() {
  const badge = document.getElementById('matrixSideBadge');
  if (!badge) return;
  const settings = ['matrixAttackerSettings', 'matrixDefenderSettings', 'matrixGlobalOptions']
    .reduce((sum, id) => {
      const ul = document.getElementById(id);
      return sum + (ul ? ul.querySelectorAll('li.matrix-prop-row').length : 0);
    }, 0);
  const filters = ['matrixAttackerNameFilter', 'matrixDefenderNameFilter']
    .reduce((sum, id) => {
      const el = document.getElementById(id);
      return sum + (el && el.value.trim() ? 1 : 0);
    }, 0);
  const n = settings + filters;
  badge.textContent = String(n);
  badge.classList.toggle('zero', n === 0);
}

function renderAllMatrixPropLists() {
  renderMatrixPropList('a');
  renderMatrixPropList('b');
  renderMatrixPropList('global');
}

function addMatrixProperty(box, key) {
  const def = matrixPropertyDef(box, key);
  if (!def) return;
  const arr = matrixPropertyState[box];
  if (arr.some(r => r.key === key)) return;
  arr.push({ key, enabled: true, value: matrixDefaultValueForType(def) });
  saveMatrixPropertyState();
  renderMatrixPropList(box);
  void renderMatrixSnapshot();
}

function initMatrixPropCombobox(box) {
  const searchId = box === 'a' ? 'matrixAPropSearch'
                : box === 'b' ? 'matrixBPropSearch'
                : 'matrixGlobalPropSearch';
  const listId = box === 'a' ? 'matrixAPropList'
              : box === 'b' ? 'matrixBPropList'
              : 'matrixGlobalPropList';
  const searchEl = document.getElementById(searchId);
  const listEl = document.getElementById(listId);
  if (!searchEl || !listEl) return;
  let activeIndex = -1;

  function availableOptions(query) {
    const taken = new Set((matrixPropertyState[box] || []).map(r => r.key));
    const q = query.trim().toLowerCase();
    return matrixPropertyCandidates(box)
      .filter(c => !taken.has(c.key))
      .filter(c => !q || c.label.toLowerCase().includes(q));
  }

  function render(query) {
    listEl.innerHTML = '';
    activeIndex = -1;
    const matches = availableOptions(query);
    if (!matches.length) { listEl.style.display = 'none'; return; }
    for (const c of matches) {
      const item = document.createElement('div');
      item.className = 'unit-dropdown-item';
      item.textContent = c.label;
      item.dataset.key = c.key;
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        commit(c.key);
      });
      listEl.appendChild(item);
    }
    listEl.style.display = 'block';
  }

  function commit(key) {
    addMatrixProperty(box, key);
    searchEl.value = '';
    listEl.style.display = 'none';
    activeIndex = -1;
  }

  function updateActive() {
    const items = [...listEl.querySelectorAll('.unit-dropdown-item')];
    items.forEach((item, i) => item.classList.toggle('unit-dropdown-active', i === activeIndex));
    if (activeIndex >= 0 && items[activeIndex]) items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  searchEl.addEventListener('focus', () => render(searchEl.value));
  searchEl.addEventListener('input', () => render(searchEl.value));
  searchEl.addEventListener('blur', () => {
    setTimeout(() => { listEl.style.display = 'none'; activeIndex = -1; }, 150);
  });
  searchEl.addEventListener('keydown', e => {
    const items = [...listEl.querySelectorAll('.unit-dropdown-item')];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(activeIndex + 1, items.length - 1);
      updateActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(activeIndex - 1, -1);
      updateActive();
    } else if (e.key === 'Enter') {
      const target = activeIndex >= 0 ? items[activeIndex] : items[0];
      if (target) {
        commit(target.dataset.key);
        searchEl.blur();
      }
    } else if (e.key === 'Escape') {
      listEl.style.display = 'none';
      searchEl.blur();
    }
  });
}

