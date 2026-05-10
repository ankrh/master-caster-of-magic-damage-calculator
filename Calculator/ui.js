// --- UI Layer ---
// All DOM interaction. Depends on data.js, engine.js, combat.js.

// --- Abilities UI ---

const ENCHANTMENT_TYPE_SUFFIXES = {
  flameBlade: 'N,H',
  metalFires: 'N,H',
  chaosChannels: 'N,H',
  blackChannels: 'N,H',
  holyArmor: 'N,H',
  holyWeapon: 'N,H',
  eldritchWeapon: 'N,H',
  shatter: 'N,H',
  mislead: 'N,H',
  discipline: 'N',
  destiny: 'N',
  landLinking: 'F',
  survivalInstinct: 'F',
  blazingEyes: 'F',
};

const FULL_ROW_ABILITY_KEYS = new Set(['chaosChannels']);
const SHARED_ABILITY_KEYS = new Set(
  ABILITY_DEFS
    .map(abil => abil.key)
    .filter(key => ENCHANTMENT_DEFS.some(ench => ench.key === key))
);

function abilityUiDefs() {
  const abilityDefs = ABILITY_DEFS.map(abil => ({
    ...abil,
    calcKey: abil.calcKey || abil.key,
    uiKey: abil.uiKey || abil.key,
    source: 'ability',
  }));
  const enchantmentDefs = ENCHANTMENT_DEFS.map(abil => ({
    ...abil,
    calcKey: abil.calcKey || abil.key,
    uiKey: abil.uiKey || (SHARED_ABILITY_KEYS.has(abil.key) ? 'enchantment_' + abil.key : abil.key),
    source: 'enchantment',
  }));
  return [...abilityDefs, ...enchantmentDefs];
}

function abilityControlId(prefix, abil) {
  return prefix + 'Abil_' + (abil.uiKey || abil.key);
}

function abilityValueIsActive(abil, val) {
  if (abil.type === 'bool') return !!val;
  if (abil.type === 'select') {
    const defaultValue = abil.options && abil.options[0] ? abil.options[0][0] : 'none';
    return val !== defaultValue;
  }
  if (abil.type === 'numcheck') return val != null;
  return (val || 0) !== 0;
}

function mergedAbilityValue(abil, currentValue, nextValue) {
  if (abil.type === 'bool') return !!currentValue || !!nextValue;
  if (abil.type === 'select') {
    const defaultValue = abil.options && abil.options[0] ? abil.options[0][0] : 'none';
    return nextValue !== defaultValue ? nextValue : (currentValue === undefined ? defaultValue : currentValue);
  }
  if (abil.type === 'numcheck') return nextValue != null ? nextValue : (currentValue === undefined ? null : currentValue);
  return Math.max(currentValue === undefined ? 0 : currentValue, nextValue || 0);
}

function abilityDisplayLabel(abil) {
  const suffix = ENCHANTMENT_TYPE_SUFFIXES[abil.key];
  return suffix ? `${abil.label} (${suffix})` : abil.label;
}

function buildAbilitiesUI(prefix) {
  const container = document.getElementById(prefix + 'Abilities');
  let gridDiv = null;
  let currentGroup = '';
  let currentGroupClass = '';
  let currentSubgroup = '';
  for (const abil of abilityUiDefs()) {
    if (abil.group && abil.group !== currentGroup) {
      currentGroup = abil.group;
      currentGroupClass = 'group-' + currentGroup.toLowerCase().replace(/[^a-z]+/g, '-');
      currentSubgroup = '';
      gridDiv = null;
      const header = document.createElement('div');
      header.className = 'abil-group-header';
      header.dataset.abilGroup = currentGroup;
      header.textContent = currentGroup;
      container.appendChild(header);
    }
    if (abil.subgroup && abil.subgroup !== currentSubgroup) {
      currentSubgroup = abil.subgroup;
      gridDiv = null;
      if (!abil.subgroup.startsWith('_')) {
        const subheader = document.createElement('div');
        subheader.className = 'abil-subgroup-header';
        subheader.dataset.abilGroup = currentGroup;
        subheader.dataset.abilSubgroup = currentSubgroup;
        subheader.textContent = currentSubgroup;
        container.appendChild(subheader);
      }
    }
    const isFullRow = FULL_ROW_ABILITY_KEYS.has(abil.key);
    if (!gridDiv && !isFullRow) {
      gridDiv = document.createElement('div');
      gridDiv.className = 'abil-grid ' + currentGroupClass;
      gridDiv.dataset.abilGroup = currentGroup;
      if (currentSubgroup) gridDiv.dataset.abilSubgroup = currentSubgroup;
      container.appendChild(gridDiv);
    }
    const itemParent = isFullRow ? container : gridDiv;
    const id = abilityControlId(prefix, abil);
    const realmCls = abil.realm ? 'realm-' + abil.realm : '';
    const displayLabel = abilityDisplayLabel(abil);
    // Color only spell-name text: for dual-name ability/spell labels, wrap the spell part after '/'
    let labelHtml;
    if (realmCls && displayLabel.includes('/')) {
      const slashIdx = displayLabel.indexOf('/');
      labelHtml = displayLabel.slice(0, slashIdx + 1) + `<span class="${realmCls}">${displayLabel.slice(slashIdx + 1)}</span>`;
    } else if (realmCls) {
      labelHtml = `<span class="${realmCls}">${displayLabel}</span>`;
    } else {
      labelHtml = displayLabel;
    }
    if (abil.type === 'bool') {
      const lbl = document.createElement('label');
      lbl.className = 'abil-check abil-item';
      lbl.dataset.abilKey = abil.uiKey || abil.key;
      lbl.dataset.calcKey = abil.calcKey || abil.key;
      lbl.dataset.abilSource = abil.source || '';
      lbl.dataset.abilGroup = currentGroup;
      if (currentSubgroup) lbl.dataset.abilSubgroup = currentSubgroup;
      if (abil.tooltip) lbl.dataset.tooltip = abil.tooltip;
      lbl.innerHTML = `<input type="checkbox" id="${id}"> ${labelHtml}`;
      if (isFullRow) lbl.classList.add('abil-full-row');
      itemParent.appendChild(lbl);
    } else if (abil.type === 'select') {
      const row = document.createElement('div');
      row.className = 'abil-num-row abil-item';
      row.dataset.abilKey = abil.uiKey || abil.key;
      row.dataset.calcKey = abil.calcKey || abil.key;
      row.dataset.abilSource = abil.source || '';
      row.dataset.abilGroup = currentGroup;
      if (currentSubgroup) row.dataset.abilSubgroup = currentSubgroup;
      row.dataset.abilDefault = abil.options[0][0];
      if (abil.tooltip) row.dataset.tooltip = abil.tooltip;
      const opts = abil.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
      row.innerHTML = `<label for="${id}">${labelHtml}</label><select id="${id}">${opts}</select>`;
      if (isFullRow) row.classList.add('abil-full-row');
      itemParent.appendChild(row);
    } else if (abil.type === 'numcheck') {
      const row = document.createElement('div');
      row.className = 'abil-num-row abil-item';
      row.dataset.abilKey = abil.uiKey || abil.key;
      row.dataset.calcKey = abil.calcKey || abil.key;
      row.dataset.abilSource = abil.source || '';
      row.dataset.abilGroup = currentGroup;
      if (currentSubgroup) row.dataset.abilSubgroup = currentSubgroup;
      if (abil.tooltip) row.dataset.tooltip = abil.tooltip;
      row.innerHTML = `<input type="checkbox" id="${id}_on"><label for="${id}">${labelHtml}</label><input type="number" id="${id}" value="0" min="-50" max="50">`;
      if (isFullRow) row.classList.add('abil-full-row');
      itemParent.appendChild(row);
    } else {
      const row = document.createElement('div');
      row.className = 'abil-num-row abil-item';
      row.dataset.abilKey = abil.uiKey || abil.key;
      row.dataset.calcKey = abil.calcKey || abil.key;
      row.dataset.abilSource = abil.source || '';
      row.dataset.abilGroup = currentGroup;
      if (currentSubgroup) row.dataset.abilSubgroup = currentSubgroup;
      if (abil.tooltip) row.dataset.tooltip = abil.tooltip;
      row.innerHTML = `<label for="${id}">${labelHtml}</label><input type="number" id="${id}" value="0" min="-50" max="50">`;
      if (isFullRow) row.classList.add('abil-full-row');
      itemParent.appendChild(row);
    }
  }
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

function setAbilityControlValue(prefix, abil, val) {
  const el = document.getElementById(abilityControlId(prefix, abil));
  if (!el) return;
  if (abil.type === 'bool') {
    el.checked = !!val;
  } else if (abil.type === 'select') {
    el.value = val || abil.options[0][0];
  } else if (abil.type === 'numcheck') {
    const chk = document.getElementById(abilityControlId(prefix, abil) + '_on');
    if (chk) chk.checked = val != null;
    el.value = val != null ? val : 0;
  } else {
    el.value = val || 0;
  }
}

function getAbilityControlValue(prefix, abil) {
  const el = document.getElementById(abilityControlId(prefix, abil));
  if (!el) return undefined;
  if (abil.type === 'bool') return el.checked;
  if (abil.type === 'select') return el.value;
  if (abil.type === 'numcheck') {
    const chk = document.getElementById(abilityControlId(prefix, abil) + '_on');
    return chk && chk.checked ? (parseInt(el.value) || 0) : null;
  }
  return parseInt(el.value) || 0;
}

function applyAbilities(prefix, abilValues, sourceFilter) {
  for (const abil of abilityUiDefs()) {
    if (sourceFilter && abil.source !== sourceFilter) continue;
    const val = abilValues[abil.calcKey || abil.key];
    setAbilityControlValue(prefix, abil, val);
  }
}

function clearAbilities(prefix, sourceFilter) {
  for (const abil of abilityUiDefs()) {
    if (sourceFilter && abil.source !== sourceFilter) continue;
    const defaultValue = abil.type === 'select' ? abil.options[0][0]
      : abil.type === 'numcheck' ? null
      : abil.type === 'bool' ? false
      : 0;
    setAbilityControlValue(prefix, abil, defaultValue);
  }
}

// --- Unit Database ---

const unitDatabases = {};
const unitBaseStats = {};
let _activeVersion = null;

function loadUnitDatabase(version) {
  if (unitDatabases[version]) return unitDatabases[version];
  const data = VERSION_DATA[version];
  if (!data) { unitDatabases[version] = []; return []; }
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

// --- Stat Reading ---

// Read ability checkboxes/inputs from DOM for a given prefix.
// Returns a plain object keyed by ability key.
function readAbilitiesFromDOM(prefix) {
  const result = {};
  for (const abil of abilityUiDefs()) {
    const val = getAbilityControlValue(prefix, abil);
    if (val === undefined) continue;
    const calcKey = abil.calcKey || abil.key;
    result[calcKey] = mergedAbilityValue(abil, result[calcKey], val);
  }
  return result;
}

// Read DOM inputs and compute all effective stats for a unit.
// Returns a stat object suitable for both display and resolveCombat.
function readUnitStats(prefix, overrides) {
  const el = id => document.getElementById(id);
  const enemyPrefix = prefix === 'a' ? 'b' : 'a';
  const chaosChannelsEl = el(prefix + 'Abil_chaosChannels');
  const enemyEternalNightEl = el(enemyPrefix + 'Abil_eternalNight');
  const overrideValues = overrides || {};
  return deriveUnitStats({
    prefix,
    version: el('gameVersion').value,
    abilities: readAbilitiesFromDOM(prefix),
    level: el(prefix + 'Level').value,
    weapon: el(prefix + 'Weapon').value,
    armor: el(prefix + 'Armor').value,
    rtbType: el(prefix + 'RtbType').value,
    unitType: el(prefix + 'Abil_unitType').value,
    chaosChannels: chaosChannelsEl ? chaosChannelsEl.value : 'none',
    figs: el(prefix + 'Figs').value,
    atk: el(prefix + 'Atk').value,
    rtb: el(prefix + 'Rtb').value,
    def: el(prefix + 'Def').value,
    res: el(prefix + 'Res').value,
    hp: el(prefix + 'HP').value,
    dmg: el(prefix + 'Dmg').value,
    toHitMod: el(prefix + 'ToHitMod').value,
    toHitRtbMod: el(prefix + 'ToHitRtbMod').value,
    toBlkMod: el(prefix + 'ToBlkMod').value,
    cityWalls: el('cityWalls').value,
    nodeAura: el('nodeAura').value,
    trueLight: !!el('trueLight').checked,
    darkness: !!el('darkness').checked,
    enemyEternalNight: !!(enemyEternalNightEl && enemyEternalNightEl.checked),
    chaosSurge: el('chaosSurge').value,
    rangedCheck: overrideValues.rangedCheck !== undefined ? overrideValues.rangedCheck : !!el('rangedCheck').checked,
    rangedDist: overrideValues.rangedDist !== undefined ? overrideValues.rangedDist : el('rangedDist').value,
    warpReality: !!el('warpReality').checked,
    generic: !!(unitBaseStats[prefix] && unitBaseStats[prefix].generic),
  });
}
// --- Modified Display ---

// Show modified (final) stat values next to base stat fields.
// Takes a pre-computed stat object to avoid redundant readUnitStats calls.
function updateModifiedDisplay(prefix, stats) {
  const s = stats || readUnitStats(prefix);

  function showMod(id, effective, base) {
    const el = document.getElementById(id);
    if (!el) return;
    if (effective !== base) {
      el.textContent = String(effective);
      el.classList.add('visible');
    } else {
      el.textContent = '';
      el.classList.remove('visible');
    }
  }

  // Show the total percentage whenever it differs from the default 30%.
  function showModPct(id, effective, forceShow) {
    const el = document.getElementById(id);
    if (!el) return;
    const pct = Math.round(effective * 100);
    if (pct !== 30 || forceShow) {
      el.textContent = pct + '%';
      el.classList.add('visible');
    } else {
      el.textContent = '';
      el.classList.remove('visible');
    }
  }

  showMod(prefix + 'AtkMod', s.atk, s.baseAtk);
  showMod(prefix + 'RtbMod', s.rtb, s.baseRtb);
  showMod(prefix + 'DefMod', s.displayDef ?? s.def, s.baseDef);
  showMod(prefix + 'ResMod', s.res, s.baseRes);
  showMod(prefix + 'HPMod', s.hp, s.baseHP);

  showModPct(prefix + 'ToHitMeleeMod', s.displayToHitMelee ?? s.toHitMelee, s.toHitMeleeHasModifiers);
  showModPct(prefix + 'ToHitRtbModDisp', s.displayToHitRtb ?? s.toHitRtb, s.toHitRtbHasModifiers);
  showModPct(prefix + 'ToBlkModDisp', s.displayToBlock ?? s.toBlock, s.toBlockHasModifiers);
}

// --- Level Bonuses ---

function applyLevelBonuses(prefix) {
  const base = unitBaseStats[prefix];
  if (!base) return;
  const version = document.getElementById('gameVersion').value;
  const b = getLevelBonuses(document.getElementById(prefix + 'Level').value, version);
  document.getElementById(prefix + 'Atk').value = base.atk;
  document.getElementById(prefix + 'Rtb').value = base.rtb;
  document.getElementById(prefix + 'Def').value = base.def;
  document.getElementById(prefix + 'Res').value = base.res;
  document.getElementById(prefix + 'HP').value = base.hp;
  document.getElementById(prefix + 'ToHitMod').value = base.toHitMod;
}

// --- Unit Application ---

function applyUnit(prefix, unitIndex) {
  const version = document.getElementById('gameVersion').value;
  const units = unitDatabases[version] || [];
  const unit = units.find(u => u.id === unitIndex);
  if (!unit) return;

  const unitRtb = (unit.ranged && parseInt(unit.ranged) > 0) ? parseInt(unit.ranged)
                : (unit.breath && parseInt(unit.breath) > 0) ? parseInt(unit.breath)
                : (unit.thrown_breath && parseInt(unit.thrown_breath) > 0) ? parseInt(unit.thrown_breath) : 0;
  unitBaseStats[prefix] = {
    atk: unit.melee, def: unit.defense, res: unit.resist, hp: unit.hp,
    rtb: unitRtb,
    toHitMod: unit.to_hit || 0,
    generic: unit.category === 'Generic',
  };

  document.getElementById(prefix + 'Figs').value = unit.figures || 1;
  document.getElementById(prefix + 'ToHitRtbMod').value = 0;
  document.getElementById(prefix + 'ToBlkMod').value = 0;
  document.getElementById(prefix + 'Dmg').value = 0;

  const rawRtb = (unit.ranged_type && unit.ranged_type !== 'none') ? unit.ranged_type
               : (unit.thrown_breath_type && unit.thrown_breath_type !== 'none') ? unit.thrown_breath_type
               : 'none';
  const rtbType = RANGED_TYPE_NORMALIZE[rawRtb] || rawRtb;
  document.getElementById(prefix + 'RtbType').value = rtbType;

  const unitTypeSel = document.getElementById(prefix + 'Abil_unitType');
  if (unitTypeSel) {
    const cat = unit.category || '';
    const hasFantasticAbility = (unit.abilities || []).some(a => a === 'Fantastic' || a === 'Fantastic=1');
    const isFantastic = cat.endsWith(' Creatures') || hasFantasticAbility;
    if (cat === 'Heroes') {
      unitTypeSel.value = 'hero';
    } else if (isFantastic) {
      const realmMap = { 'Nature': 'nature', 'Sorcery': 'sorcery', 'Chaos': 'chaos',
                         'Life': 'life', 'Death': 'death', 'Arcane': 'arcane',
                         'Nature Creatures': 'nature', 'Sorcery Creatures': 'sorcery', 'Chaos Creatures': 'chaos',
                         'Life Creatures': 'life', 'Death Creatures': 'death', 'Arcane Creatures': 'arcane' };
      const realm = realmMap[cat] || 'arcane';
      unitTypeSel.value = 'fantastic_' + realm;
    } else {
      unitTypeSel.value = 'normal';
    }
  }

  // Clear any previous unit-innate locks before re-applying
  const abilCont = document.getElementById(prefix + 'Abilities');
  abilCont.querySelectorAll('.abil-unit-locked').forEach(item => {
    item.classList.remove('abil-unit-locked');
    item.querySelectorAll('input, select').forEach(inp => { inp.disabled = false; });
  });

  const abilValues = parseAbilitiesFromUnit(unit);
  clearAbilities(prefix, 'ability');
  applyAbilities(prefix, abilValues, 'ability');
  applyLevelBonuses(prefix);

  // Mark active unit-ability items that are innate to this predefined unit.
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

  refreshAbilityFieldVisibility();
}

function updateUnitLock(prefix) {
  const sel = document.getElementById(prefix + 'Unit');
  const fields = sel.closest('.panel').querySelector('.panel-fields');
  const abilContent = document.getElementById(prefix + 'Abilities');
  const isCustom = sel.value === 'custom';
  fields.classList.toggle('locked', !isCustom);
  abilContent.classList.toggle('locked', !isCustom);

  const unitTypeSel = document.getElementById(prefix + 'Abil_unitType');
  if (unitTypeSel) unitTypeSel.disabled = !isCustom;

  const levelSel = document.getElementById(prefix + 'Level');
  const weaponSel = document.getElementById(prefix + 'Weapon');
  if (!isCustom) {
    const version = document.getElementById('gameVersion').value;
    const units = unitDatabases[version] || [];
    const unit = units.find(u => u.id === parseInt(sel.value));
    const isHero = unit && unit.category === 'Heroes';
    const isZombies = unit && unit.name === 'Zombies';
    if (isHero) {
      levelSel.value = 'normal';
      if (!isZombies) weaponSel.value = 'normal';
    }
    applyUnit(prefix, parseInt(sel.value));
    levelSel.disabled = isHero;
    weaponSel.classList.toggle('weapon-locked', isHero && !isZombies);
  } else {
    delete unitBaseStats[prefix];
    weaponSel.classList.remove('weapon-locked');
    // Clear unit-innate locks when switching to custom
    const abilContCustom = document.getElementById(prefix + 'Abilities');
    abilContCustom.querySelectorAll('.abil-unit-locked').forEach(item => {
      item.classList.remove('abil-unit-locked');
      item.querySelectorAll('input, select').forEach(inp => { inp.disabled = false; });
    });
    updateCustomLevelState(prefix);
  }
}

function updateCustomLevelState(prefix) {
  const sel = document.getElementById(prefix + 'Unit');
  if (sel.value !== 'custom') return;
  const levelSel = document.getElementById(prefix + 'Level');
  const weaponSel = document.getElementById(prefix + 'Weapon');
  const unitTypeSel = document.getElementById(prefix + 'Abil_unitType');
  const isHero = unitTypeSel && unitTypeSel.value === 'hero';
  levelSel.disabled = isHero;
  if (isHero) levelSel.value = 'normal';
  weaponSel.classList.toggle('weapon-locked', isHero);
  if (isHero) weaponSel.value = 'normal';
}

// --- Swap ---

const DEFAULT_GAME_VERSION = 'com2_1.05.11';
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
  document.getElementById(prefix + 'Def').value = s.def;
  document.getElementById(prefix + 'Res').value = s.res;
  document.getElementById(prefix + 'ToHitMod').value = s.toHitMod;
  document.getElementById(prefix + 'ToHitRtbMod').value = s.toHitRtbMod;
  document.getElementById(prefix + 'ToBlkMod').value = s.toBlkMod;
  document.getElementById(prefix + 'HP').value = s.hp;
  document.getElementById(prefix + 'Dmg').value = s.dmg;
  document.getElementById(prefix + 'Weapon').value = s.weapon;
  document.getElementById(prefix + 'Armor').value = s.armor;
  document.getElementById(prefix + 'Level').value = s.level;
  document.getElementById(prefix + 'Abil_unitType').value = s.unitType;
  clearAbilities(prefix);
  delete unitBaseStats[prefix];

  const abilCont = document.getElementById(prefix + 'Abilities');
  abilCont.querySelectorAll('.abil-unit-locked').forEach(item => {
    item.classList.remove('abil-unit-locked');
    item.querySelectorAll('input, select').forEach(inp => { inp.disabled = false; });
  });
  updateUnitLock(prefix);
}

function resetGlobalOptions() {
  document.getElementById('rangedCheck').checked = true;
  document.getElementById('rangedDist').value = 1;
  document.getElementById('cityWalls').value = 'none';
  document.getElementById('nodeAura').value = 'none';
  document.getElementById('trueLight').checked = false;
  document.getElementById('darkness').checked = false;
  document.getElementById('chaosSurge').value = 0;
  document.getElementById('wallOfFire').checked = false;
  document.getElementById('warpReality').checked = false;
}

function resetAbilityPanelVisibility() {
  document.querySelectorAll('.abilities-section').forEach(section => {
    section.classList.add('hide-inactive');
  });
  document.querySelectorAll('.toggle-abil-btn').forEach(btn => {
    btn.textContent = 'Show all abilities';
  });
}

function selectDefaultUnit(prefix, units) {
  const match = units.find(u => u.name === DEFAULT_UNITS[prefix]);
  if (!match) return;
  document.getElementById(prefix + 'Unit').value = String(match.id);
  syncUnitDisplay(prefix);
  updateUnitLock(prefix);
}

function resetCalculatorState() {
  document.getElementById('gameVersion').value = DEFAULT_GAME_VERSION;
  _activeVersion = DEFAULT_GAME_VERSION;
  const units = loadUnitDatabase(DEFAULT_GAME_VERSION);
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

  const simpleFields = ['Figs', 'Atk', 'RtbType', 'Rtb', 'ToHitMod', 'ToHitRtbMod', 'ToBlkMod', 'Def', 'Res', 'HP', 'Dmg', 'Level', 'Weapon', 'Armor'];
  for (const f of simpleFields) {
    const aEl = document.getElementById('a' + f);
    const bEl = document.getElementById('b' + f);
    if (!aEl || !bEl) continue;
    tmp = aEl.value;
    aEl.value = bEl.value;
    bEl.value = tmp;
  }

  for (const abil of abilityUiDefs()) {
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

  const aTypeSel = document.getElementById('aAbil_unitType');
  const bTypeSel = document.getElementById('bAbil_unitType');
  if (aTypeSel && bTypeSel) {
    tmp = aTypeSel.value;
    aTypeSel.value = bTypeSel.value;
    bTypeSel.value = tmp;
  }

  tmp = unitBaseStats['a'];
  unitBaseStats['a'] = unitBaseStats['b'];
  unitBaseStats['b'] = tmp;

  syncUnitDisplay('a');
  syncUnitDisplay('b');
  updateUnitLock('a');
  updateUnitLock('b');
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

  updateTypeVisibility();
  recalculate();
}

// --- Rendering ---

function formatPct(p) {
  return (p * 100).toFixed(1) + '%';
}

function renderDistPanel(container, title, dist, hp, numFigs, opts) {
  const showSkulls = opts && opts.showSkulls;
  const colHeader = (opts && opts.colHeader) || 'Damage';
  // firstFigRem: HP remaining on the lead figure (accounts for pre-existing damage)
  const firstFigRem = (opts && opts.firstFigRem) || hp;

  let maxD = dist.length - 1;
  while (maxD > 0 && dist[maxD] < 1e-10) maxD--;

  let expected = 0;
  for (let d = 0; d < dist.length; d++) expected += d * dist[d];

  let peakProb = 0;
  for (let d = 0; d <= maxD; d++) {
    if ((dist[d] || 0) > peakProb) peakProb = dist[d];
  }

  // Precompute figure-kill thresholds
  const killThresholds = new Set();
  if (showSkulls && numFigs > 0 && hp > 0) {
    for (let i = 0; i < numFigs; i++) {
      const thresh = i === 0 ? firstFigRem : firstFigRem + i * hp;
      killThresholds.add(thresh);
    }
  }

  // Compute destruction chance (damage >= total remaining HP).
  // opts.pDestroy overrides with a pre-computed cumulative value (used by phase panels).
  let destroyPct = '';
  if (opts && opts.pDestroy != null) {
    destroyPct = `<br>${formatPct(opts.pDestroy)} destroyed`;
  } else if (numFigs > 0 && hp > 0) {
    const totalRemHP = firstFigRem + (numFigs - 1) * hp;
    let pDestroy = 0;
    for (let d = totalRemHP; d < dist.length; d++) pDestroy += dist[d] || 0;
    destroyPct = `<br>${formatPct(pDestroy)} destroyed`;
  }

  const barColor = (opts && opts.barColor) || '#ff4d6a';

  let hpPct = '';
  if (numFigs > 0 && hp > 0) {
    const totalRemHP = firstFigRem + (numFigs - 1) * hp;
    hpPct = ` <span class="hp-pct">(${(expected / totalRemHP * 100).toFixed(1)}% HP)</span>`;
  }

  let html = `<div class="dist-header">${title}:<br><span class="avg">${expected.toFixed(3)}</span>${hpPct}${destroyPct}</div>`;
  html += '<div class="dist-scroll"><table class="dist-table">';
  html += `<thead><tr><th>${colHeader}</th><th style="text-align:right">Chance</th></tr></thead><tbody>`;

  for (let d = 0; d <= maxD; d++) {
    const p = dist[d] || 0;
    const barWidth = peakProb > 0 ? (p / peakProb) * 100 : 0;
    const isPeak = peakProb > 0 && Math.abs(p - peakProb) < 1e-15;

    let dmgLabel = '' + d;
    if (showSkulls && killThresholds.has(d)) {
      dmgLabel += ' ☠';
    }

    html += `<tr class="${isPeak ? 'peak' : ''}">`;
    html += `<td class="dmg-cell">${dmgLabel}</td>`;
    html += `<td class="chance-cell">`;
    html += `<span class="chance-bar" style="width:${barWidth}%;background:${barColor}"></span>`;
    html += `<span class="chance-text">${formatPct(p)}</span>`;
    html += `</td></tr>`;
  }

  html += '</tbody></table></div>';
  container.innerHTML = html;

  // Scroll so the mean damage row is vertically centred in the visible scroll area.
  const scrollEl = container.querySelector('.dist-scroll');
  const rows = scrollEl ? scrollEl.querySelectorAll('tbody tr') : [];
  const meanRow = rows[Math.round(expected)];
  if (scrollEl && meanRow) {
    const scrollRect = scrollEl.getBoundingClientRect();
    const rowRect = meanRow.getBoundingClientRect();
    scrollEl.scrollTop += rowRect.top - scrollRect.top - scrollEl.clientHeight / 2 + meanRow.offsetHeight / 2;
  }
}

function renderBreakdownGrid(phases) {
  const grid = document.getElementById('breakdownGrid');
  grid.innerHTML = '';
  if (!phases || phases.length <= 1) return;

  const breakdownOpts = { barColor: '#f0c030' };

  const heading = document.createElement('div');
  heading.className = 'breakdown-heading';
  heading.textContent = 'Phase breakdown';
  grid.appendChild(heading);

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];

    const row = document.createElement('div');
    row.className = 'breakdown-phase-row' + (i === 0 ? ' first-phase' : '');
    grid.appendChild(row);

    const label = document.createElement('div');
    label.className = 'breakdown-phase-label';
    label.textContent = phase.label;
    row.appendChild(label);

    const panels = document.createElement('div');
    panels.className = 'breakdown-phase-panels';
    row.appendChild(panels);

    const panelA = document.createElement('div');
    panelA.className = 'dist-panel';
    panels.appendChild(panelA);

    const panelB = document.createElement('div');
    panelB.className = 'dist-panel';
    panels.appendChild(panelB);

    if (phase.mode === 'feared') {
      const fearOpts = { barColor: '#c080ff', colHeader: 'Feared' };
      renderDistPanel(panelA, 'Attacker figs feared', phase.atkDist, 0, 0, fearOpts);
      renderDistPanel(panelB, 'Defender figs feared', phase.defDist, 0, 0, fearOpts);
    } else {
      const atkOpts = phase.atkDestroyPct != null ? { ...breakdownOpts, pDestroy: phase.atkDestroyPct } : breakdownOpts;
      const defOpts = phase.defDestroyPct != null ? { ...breakdownOpts, pDestroy: phase.defDestroyPct } : breakdownOpts;
      renderDistPanel(panelA, 'Mean damage to attacker', phase.atkDist, phase.atkHPper, phase.atkFigs, atkOpts);
      renderDistPanel(panelB, 'Mean damage to defender', phase.defDist, phase.defHPper, phase.defFigs, defOpts);
    }
  }
}

// --- Life Steal Summary ---

function renderLifeStealSummary(result) {
  const el = document.getElementById('lifeStealSummary');
  if (!el) return;

  function expectedValue(dist) {
    if (!dist) return 0;
    let ev = 0;
    for (let d = 0; d < dist.length; d++) ev += d * dist[d];
    return ev;
  }

  const aLS = (result.aLifeStealExpected != null)
    ? result.aLifeStealExpected
    : (result.aLifeStealDist ? expectedValue(result.aLifeStealDist) : 0);
  const bLS = (result.bLifeStealExpected != null)
    ? result.bLifeStealExpected
    : (result.bLifeStealDist ? expectedValue(result.bLifeStealDist) : 0);

  if (aLS < 0.001 && bLS < 0.001) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  let html = '';
  if (aLS >= 0.001) {
    html += `<span>Attacker life steal damage: <strong>${aLS.toFixed(3)}</strong></span>`;
  }
  if (bLS >= 0.001) {
    if (html) html += ' &nbsp;|&nbsp; ';
    html += `<span>Defender life steal damage: <strong>${bLS.toFixed(3)}</strong></span>`;
  }
  el.style.display = '';
  el.innerHTML = html;
}

// --- Main Calculate ---
// Reads stats once, updates displays, resolves combat, renders results.

const REALM_PANEL_CLASSES = ['panel-realm-life','panel-realm-nature','panel-realm-sorcery','panel-realm-chaos','panel-realm-death','panel-realm-arcane','panel-realm-normal'];

function applyPanelRealmClass(panelId, unitType) {
  const el = document.getElementById(panelId);
  if (!el || !unitType) return;
  el.classList.remove(...REALM_PANEL_CLASSES);
  let realm = unitType.startsWith('fantastic_') ? unitType.slice('fantastic_'.length) : 'normal';
  if (realm === 'unaligned') realm = 'arcane';
  if (!REALM_PANEL_CLASSES.includes('panel-realm-' + realm)) realm = 'normal';
  el.classList.add('panel-realm-' + realm);
}

function recalculate() {
  const a = readUnitStats('a');
  const b = readUnitStats('b');

  applyPanelRealmClass('panelA', a.unitType);
  applyPanelRealmClass('panelB', b.unitType);

  // Update modified displays using the already-computed stats (no redundant reads)
  updateModifiedDisplay('a', a);
  updateModifiedDisplay('b', b);

  const isRanged = document.getElementById('rangedCheck').checked && a.rangedType !== 'none' && a.rtb > 0;
  const version = document.getElementById('gameVersion').value;
  const wallOfFire = document.getElementById('wallOfFire').checked;

  const result = resolveCombat(a, b, { isRanged, version, wallOfFire });

  const aFirstFigRem = a.hp > 0 && a.dmg % a.hp !== 0 ? a.hp - (a.dmg % a.hp) : a.hp;
  const bFirstFigRem = b.hp > 0 && b.dmg % b.hp !== 0 ? b.hp - (b.dmg % b.hp) : b.hp;

  renderBreakdownGrid(result.phases);
  renderDistPanel(document.getElementById('distA'), 'Mean damage to attacker', result.totalDmgToA, result.aHP, result.aAlive,
    { showSkulls: true, firstFigRem: aFirstFigRem });
  renderDistPanel(document.getElementById('distB'), 'Mean damage to defender', result.totalDmgToB, result.bHP, result.bAlive,
    { showSkulls: true, firstFigRem: bFirstFigRem });
  renderLifeStealSummary(result);
}

// Backward-compatible alias
function calculate() { recalculate(); }

// --- Visibility ---

function updateTypeVisibility() {
  ['aRtbType', 'bRtbType'].forEach(id => {
    const sel = document.getElementById(id);
    const input = sel.nextElementSibling;
    if (input) input.classList.toggle('disabled-field', sel.value === 'none');
  });

  // Armor type is CoM/CoM2-only; grey it out for MoM versions.
  const version = document.getElementById('gameVersion').value;
  const isMoM = version === 'mom_1.31' || version === 'mom_cp_1.60.00';
  ['aArmor', 'bArmor'].forEach(id => {
    const el = document.getElementById(id);
    const label = document.querySelector(`label[for="${id}"]`);
    el.classList.toggle('disabled-field', isMoM);
    if (label) label.classList.toggle('disabled-field', isMoM);
    el.disabled = isMoM;
    if (isMoM) el.value = 'normal';
  });

  // Version restrictions on enchantments.
  const isCoMorCoM2 = version === 'com_6.08' || version.startsWith('com2_');
  const isCoM2 = version.startsWith('com2_');

  function subgroupAllowed(subgroup) {
    const sg = (subgroup || '').replace(/^_/, '');
    if (sg === 'MoM only') return isMoM;
    if (sg === 'CoM & CoM2') return isCoMorCoM2;
    if (sg === 'CoM2 only') return isCoM2;
    return true;
  }

  function applyDisabled(el, disabled) {
    if (disabled) {
      if (el.tagName === 'SELECT') el.value = el.options[0].value;
      else if (el.type === 'checkbox') el.checked = false;
    }
    el.disabled = disabled;
  }

  for (const prefix of ['a', 'b']) {
    // Unit type restrictions are informational only. Keep controls usable so users can model
    // transformed or otherwise exceptional states manually.
    for (const abil of abilityUiDefs()) {
      if (abil.source !== 'enchantment') continue;
      const el = document.getElementById(abilityControlId(prefix, abil));
      if (!el) continue;
      applyDisabled(el, !subgroupAllowed(abil.subgroup));
    }
  }

  const aStats = readUnitStats('a');
  const hasRanged = aStats.rangedType !== 'none' && aStats.rtb > 0;
  const rangedCheckLabel = document.getElementById('rangedCheckLabel');
  const rangedCheck = document.getElementById('rangedCheck');
  const rangedDist = document.getElementById('rangedDist');
  rangedCheckLabel.classList.toggle('disabled-field', !hasRanged);
  rangedCheck.disabled = !hasRanged;
  if (!hasRanged) rangedCheck.checked = false;

  document.getElementById('rangedDistLabel').classList.remove('disabled-field');
  rangedDist.classList.remove('disabled-field');
  rangedDist.disabled = false;

  for (const prefix of ['a', 'b']) {
    const armorSel = document.getElementById(prefix + 'Armor');
    if (!armorSel) continue;
    if (isMoM) {
      armorSel.value = 'normal';
      armorSel.disabled = true;
    } else {
      armorSel.disabled = false;
    }
  }
}

function refreshAbilityFieldVisibility() {
  updateTypeVisibility();
  updateAbilityVisibility();
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
  function setUnit(prefix, u) {
    const s = { ...UNIT_DEFAULTS, ...u };
    document.getElementById(prefix + 'Figs').value = s.figs;
    document.getElementById(prefix + 'Atk').value = s.atk;
    document.getElementById(prefix + 'RtbType').value = s.rtbType;
    document.getElementById(prefix + 'Rtb').value = s.rtb;
    document.getElementById(prefix + 'Def').value = s.def;
    document.getElementById(prefix + 'Res').value = s.res;
    document.getElementById(prefix + 'ToHitMod').value = s.toHitMod;
    document.getElementById(prefix + 'ToHitRtbMod').value = s.toHitRtbMod;
    document.getElementById(prefix + 'ToBlkMod').value = s.toBlkMod;
    document.getElementById(prefix + 'HP').value = s.hp;
    document.getElementById(prefix + 'Dmg').value = s.dmg;
    document.getElementById(prefix + 'Weapon').value = s.weapon;
    document.getElementById(prefix + 'Armor').value = s.armor || 'normal';
    document.getElementById(prefix + 'Level').value = s.level;
    document.getElementById(prefix + 'Abil_unitType').value = s.unitType;
    clearAbilities(prefix);
    applyAbilities(prefix, s.abilities);
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
  if (preset.a && preset.a.level) document.getElementById('aLevel').value = preset.a.level;
  if (preset.a && preset.a.weapon) document.getElementById('aWeapon').value = preset.a.weapon;
  if (preset.b && preset.b.level) document.getElementById('bLevel').value = preset.b.level;
  if (preset.b && preset.b.weapon) document.getElementById('bWeapon').value = preset.b.weapon;
  document.getElementById('rangedCheck').checked = preset.rangedCheck || false;
  document.getElementById('rangedDist').value = preset.rangedDist || 1;
  document.getElementById('cityWalls').value = preset.cityWalls || 'none';
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
  refreshAbilityFieldVisibility();
  recalculate();
}

// --- Test Runner ---

function runTests(tolerance) {
  tolerance = tolerance || 0.002;
  const results = [];
  let allPassed = true;
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
  const failures = results.filter(r => !r.pass);
  if (allPassed) {
    console.log(`All ${results.length} tests passed.`);
  } else {
    console.error(`${failures.length}/${results.length} tests FAILED:`);
    failures.forEach(f => console.error(`  ${f.name}: A=${f.dmgToA} (exp ${f.expectedA}, err ${f.errA}), B=${f.dmgToB} (exp ${f.expectedB}, err ${f.errB})`));
  }
  return { allPassed, total: results.length, failures };
}

// --- Ability Visibility ---

// Check if a single ability item is "active" (non-default value)
function isAbilityActive(item) {
  const key = item.dataset.abilKey;
  if (!key) return false;
  const chk = item.querySelector('input[type="checkbox"]');
  const numInput = item.querySelector('input[type="number"]');
  const sel = item.querySelector('select');

  // numcheck: has a _on checkbox and a number input
  if (chk && numInput) return chk.checked;
  // bool: just a checkbox
  if (chk) return chk.checked;
  // select: non-default value
  if (sel) return sel.value !== (item.dataset.abilDefault || sel.options[0].value);
  // num: non-zero
  if (numInput) return parseInt(numInput.value) !== 0;
  return false;
}

// Update which abilities are shown based on active state.
// Hides inactive items, group headers, and empty grid containers when in hide-inactive mode.
function updateAbilityVisibility() {
  for (const prefix of ['a', 'b']) {
    const section = document.getElementById(prefix + 'Abilities').closest('.abilities-section');
    if (!section) continue;
    const content = document.getElementById(prefix + 'Abilities');
    const hiding = section.classList.contains('hide-inactive');
    const items = section.querySelectorAll('.abil-item');

    items.forEach(item => {
      if (!hiding) {
        item.classList.remove('abil-hidden');
      } else {
        const active = isAbilityActive(item);
        const focused = item.contains(document.activeElement);
        item.classList.toggle('abil-hidden', !active && !focused);
      }
    });

    // Hide subgroup headers when all their children are hidden
    section.querySelectorAll('.abil-subgroup-header').forEach(header => {
      const group = header.dataset.abilGroup;
      const subgroup = header.dataset.abilSubgroup;
      const subgroupItems = section.querySelectorAll(
        `.abil-item[data-abil-group="${group}"][data-abil-subgroup="${subgroup}"]`
      );
      const anyVisible = [...subgroupItems].some(item => !item.classList.contains('abil-hidden'));
      header.classList.toggle('abil-hidden', hiding && !anyVisible);
    });

    // Hide group headers and grid containers when all their children are hidden
    section.querySelectorAll('.abil-group-header').forEach(header => {
      const group = header.dataset.abilGroup;
      const groupItems = section.querySelectorAll(`.abil-item[data-abil-group="${group}"]`);
      const anyVisible = [...groupItems].some(item => !item.classList.contains('abil-hidden'));
      header.classList.toggle('abil-hidden', hiding && !anyVisible);
    });

    // Hide empty grid containers
    section.querySelectorAll('.abil-grid').forEach(grid => {
      const items = grid.querySelectorAll('.abil-item');
      let anyVisible = false;
      items.forEach(item => {
        if (!item.classList.contains('abil-hidden')) anyVisible = true;
      });
      grid.classList.toggle('abil-hidden', hiding && !anyVisible);
    });

    const hasVisibleAbility = [...content.querySelectorAll('.abil-item')]
      .some(item => !item.classList.contains('abil-hidden'));
    section.classList.toggle('abilities-empty', hiding && !hasVisibleAbility);
  }
}

// Toggle show/hide all abilities for both panels
function toggleAllAbilities() {
  const sections = document.querySelectorAll('.abilities-section');
  const btns = document.querySelectorAll('.toggle-abil-btn');
  const isCurrentlyHiding = sections[0] && sections[0].classList.contains('hide-inactive');

  sections.forEach(s => s.classList.toggle('hide-inactive', !isCurrentlyHiding));
  btns.forEach(b => b.textContent = isCurrentlyHiding ? 'Hide inactive' : 'Show all abilities');
  updateAbilityVisibility();
}

function selectedEnchantmentRows(prefix, selectedOverride) {
  const rows = [];
  for (const abil of abilityUiDefs()) {
    if (abil.source !== 'enchantment') continue;
    const id = abilityControlId(prefix, abil);
    const label = abilityDisplayLabel(abil);
    const val = selectedOverride ? selectedOverride[abil.calcKey || abil.key] : getAbilityControlValue(prefix, abil);
    if (val === undefined) continue;

    if (abil.type === 'bool') {
      if (val) rows.push(label);
    } else if (abil.type === 'select') {
      const el = document.getElementById(id);
      const defaultValue = abil.options && abil.options[0] ? abil.options[0][0] : (el ? el.options[0].value : 'none');
      if (val !== defaultValue) {
        const option = abil.options ? abil.options.find(([value]) => value === val) : null;
        rows.push(`${label}: ${option ? option[1] : (el ? el.selectedOptions[0].textContent : val)}`);
      }
    } else if (abil.type === 'numcheck') {
      if (val != null) rows.push(`${label}: ${val}`);
    } else if (abil.type === 'num') {
      if (parseInt(val, 10) !== 0) rows.push(`${label}: ${val}`);
    }
  }
  return rows;
}

function renderEnchantmentSnapshotList(listId, rows) {
  const list = document.getElementById(listId);
  if (!list) return;
  list.textContent = '';
  const entries = rows.length ? rows : ['None'];
  for (const text of entries) {
    const item = document.createElement('li');
    item.textContent = text;
    if (!rows.length) item.className = 'empty';
    list.appendChild(item);
  }
}

function selectedGlobalOptionRows(matrixMode) {
  const rows = [];
  if (matrixMode === 'ranged') {
    const rangedDist = document.getElementById('rangedDist');
    rows.push(`Attack mode: Ranged${rangedDist ? `, distance ${rangedDist.value || 1}` : ''}`);
  }
  const checkboxOptions = [
    ['trueLight', 'True Light'],
    ['darkness', 'Darkness'],
    ['wallOfFire', 'Wall of Fire'],
    ['warpReality', 'Warp Reality'],
  ];
  for (const [id, label] of checkboxOptions) {
    const el = document.getElementById(id);
    if (el && el.checked) rows.push(label);
  }

  const chaosSurge = document.getElementById('chaosSurge');
  if (chaosSurge && parseInt(chaosSurge.value, 10) !== 0) {
    rows.push(`Chaos Surge enchantments: ${chaosSurge.value}`);
  }

  const cityWalls = document.getElementById('cityWalls');
  if (cityWalls && cityWalls.value !== 'none') {
    rows.push(`City walls: ${cityWalls.selectedOptions[0].textContent}`);
  }

  const nodeAura = document.getElementById('nodeAura');
  if (nodeAura && nodeAura.value !== 'none') {
    rows.push(`Node aura: ${nodeAura.selectedOptions[0].textContent}`);
  }

  return rows;
}

function selectedMatrixSettingRows(prefix) {
  const rowDefs = [
    [prefix + 'Level', 'Unit level'],
    [prefix + 'Weapon', 'Weapon type'],
    [prefix + 'Armor', 'Armor type'],
  ];
  return rowDefs.flatMap(([id, label]) => {
    const control = document.getElementById(id);
    if (!control || control.value === 'normal') return [];
    const value = control && control.selectedOptions && control.selectedOptions[0]
      ? control.selectedOptions[0].textContent
      : '';
    return value ? [`${label}: ${value}`] : [];
  });
}

async function renderMatrixSnapshot() {
  const titleEl = document.getElementById('matrixTitle');
  const noteEl = document.querySelector('.matrix-modal-note');
  const versionEl = document.getElementById('matrixVersion');
  const gameVersion = document.getElementById('gameVersion');
  const isRangedMatrix = activeMatrixMode === 'ranged';
  if (titleEl) {
    titleEl.textContent = isRangedMatrix ? 'Ranged Matrix' : 'Melee Matrix';
  }
  if (noteEl) {
    noteEl.textContent = isRangedMatrix
      ? 'Value shown is the % HP damage done to the defender.'
      : 'Value shown is the % HP damage done to the defender divided by % HP damage done to the attacker.';
  }
  if (versionEl && gameVersion) {
    versionEl.textContent = `Game version: ${gameVersion.selectedOptions[0].textContent}`;
  }
  const attackerEnchantments = activeNonInnateUnitEnchantments('a');
  const defenderEnchantments = activeNonInnateUnitEnchantments('b');
  renderEnchantmentSnapshotList(
    'matrixAttackerSettings',
    selectedMatrixSettingRows('a').concat(selectedEnchantmentRows('a', attackerEnchantments))
  );
  renderEnchantmentSnapshotList(
    'matrixDefenderSettings',
    selectedMatrixSettingRows('b').concat(selectedEnchantmentRows('b', defenderEnchantments))
  );
  renderEnchantmentSnapshotList('matrixGlobalOptions', selectedGlobalOptionRows(activeMatrixMode));
  matrixCache = await buildMatrixCache(attackerEnchantments, defenderEnchantments, activeMatrixMode);
  renderMatrixTable();
}

function selectedUnitLabel(prefix) {
  const searchEl = document.getElementById(prefix + 'UnitSearch');
  const name = searchEl ? searchEl.value.trim() : '';
  return name || (prefix === 'a' ? 'Custom attacker' : 'Custom defender');
}

function distExpectedValue(dist) {
  if (!dist) return 0;
  let ev = 0;
  for (let d = 0; d < dist.length; d++) ev += d * dist[d];
  return ev;
}

function formatMeleeMatrixRatio(result) {
  const pctToDefender = result.bRemHP > 0 ? distExpectedValue(result.totalDmgToB) / result.bRemHP : 0;
  const pctToAttacker = result.aRemHP > 0 ? distExpectedValue(result.totalDmgToA) / result.aRemHP : 0;

  if (pctToAttacker <= 1e-12) {
    if (pctToDefender <= 1e-12) return '0.00';
    return '∞';
  }
  return (pctToDefender / pctToAttacker).toFixed(2);
}

function meleeMatrixRatioValue(result) {
  const pctToDefender = result.bRemHP > 0 ? distExpectedValue(result.totalDmgToB) / result.bRemHP : 0;
  const pctToAttacker = result.aRemHP > 0 ? distExpectedValue(result.totalDmgToA) / result.aRemHP : 0;

  if (pctToAttacker <= 1e-12) {
    if (pctToDefender <= 1e-12) return 0;
    return Infinity;
  }
  return pctToDefender / pctToAttacker;
}

function rangedMatrixDamageValue(result) {
  return result.bRemHP > 0 ? distExpectedValue(result.totalDmgToB) / result.bRemHP : 0;
}

function formatMatrixRatioValue(value, matrixMode) {
  if (matrixMode === 'ranged') {
    const percent = value * 100;
    if (percent > 999) return '>999%';
    return `${Math.round(percent)}%`;
  }
  if (!Number.isFinite(value)) return '>99';
  if (value > 99) return '>99';
  if (value < 0.01) return '<0.01';
  return value.toPrecision(2);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function meleeMatrixCellColor(ratio) {
  const logValue = ratio > 0 ? Math.log10(ratio) : -Infinity;
  const scaled = clamp(logValue, -1, 1);
  const red = [214, 72, 72];
  const white = [255, 255, 255];
  const green = [66, 157, 92];
  const rgb = scaled < 0
    ? mixRgb(red, white, scaled + 1)
    : mixRgb(white, green, scaled);
  const textColor = Math.abs(scaled) > 0.68 ? '#fff' : '#1d2438';
  return {
    background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    textColor,
  };
}

function rangedMatrixCellColor(value) {
  const red = [214, 72, 72];
  const white = [255, 255, 255];
  const green = [66, 157, 92];
  const percent = value * 100;
  const rgb = percent <= 10
    ? mixRgb(red, white, clamp(percent / 10, 0, 1))
    : mixRgb(white, green, clamp((percent - 10) / 40, 0, 1));
  const textColor = percent <= 2 || percent >= 42 ? '#fff' : '#1d2438';
  return {
    background: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    textColor,
  };
}

function predefinedUnitRtb(unit) {
  return (unit.ranged && parseInt(unit.ranged, 10) > 0) ? parseInt(unit.ranged, 10)
    : (unit.breath && parseInt(unit.breath, 10) > 0) ? parseInt(unit.breath, 10)
    : (unit.thrown_breath && parseInt(unit.thrown_breath, 10) > 0) ? parseInt(unit.thrown_breath, 10) : 0;
}

function predefinedUnitRtbType(unit) {
  const rawRtb = (unit.ranged_type && unit.ranged_type !== 'none') ? unit.ranged_type
    : (unit.thrown_breath_type && unit.thrown_breath_type !== 'none') ? unit.thrown_breath_type
    : 'none';
  return RANGED_TYPE_NORMALIZE[rawRtb] || rawRtb;
}

function predefinedUnitType(unit) {
  const cat = unit.category || '';
  const hasFantasticAbility = (unit.abilities || []).some(a => a === 'Fantastic' || a === 'Fantastic=1');
  const isFantastic = cat.endsWith(' Creatures') || hasFantasticAbility;
  if (cat === 'Heroes') return 'hero';
  if (!isFantastic) return 'normal';

  const realmMap = {
    'Nature': 'nature',
    'Sorcery': 'sorcery',
    'Chaos': 'chaos',
    'Life': 'life',
    'Death': 'death',
    'Arcane': 'arcane',
    'Nature Creatures': 'nature',
    'Sorcery Creatures': 'sorcery',
    'Chaos Creatures': 'chaos',
    'Life Creatures': 'life',
    'Death Creatures': 'death',
    'Arcane Creatures': 'arcane',
  };
  return 'fantastic_' + (realmMap[cat] || 'arcane');
}

function matrixRealmClassForUnitType(unitType) {
  const realm = String(unitType || '').replace(/^fantastic_/, '');
  return ['life', 'death', 'chaos', 'nature', 'sorcery', 'arcane'].includes(realm) ? `realm-${realm}` : '';
}

function activeNonInnateUnitEnchantments(prefix) {
  const result = {};
  for (const abil of abilityUiDefs()) {
    if (abil.source !== 'enchantment') continue;
    const val = getAbilityControlValue(prefix, abil);
    const calcKey = abil.calcKey || abil.key;
    if (abil.type === 'bool' && val) {
      result[calcKey] = true;
    } else if (abil.type === 'select') {
      const defaultValue = abil.options && abil.options[0] ? abil.options[0][0] : 'none';
      if (val !== defaultValue) result[calcKey] = val;
    } else if (abil.type === 'numcheck' && val != null) {
      result[calcKey] = val;
    } else if (abil.type === 'num' && val !== 0) {
      result[calcKey] = val;
    }
  }
  return result;
}

function buildMatrixUnitStats(prefix, unit, appliedEnchantments, matrixMode) {
  const version = document.getElementById('gameVersion').value;
  const unitType = predefinedUnitType(unit);
  const level = document.getElementById(prefix + 'Level').value;
  const weapon = document.getElementById(prefix + 'Weapon').value;
  const abilities = { ...parseAbilitiesFromUnit(unit), ...appliedEnchantments };
  const enemyPrefix = prefix === 'a' ? 'b' : 'a';
  const rangedMatrixAttacker = matrixMode === 'ranged' && prefix === 'a';
  return deriveUnitStats({
    prefix,
    version,
    abilities,
    level,
    weapon,
    armor: document.getElementById(prefix + 'Armor').value,
    rtbType: predefinedUnitRtbType(unit),
    unitType,
    chaosChannels: abilities.chaosChannels || 'none',
    figs: unit.figures || 1,
    atk: unit.melee,
    rtb: predefinedUnitRtb(unit),
    def: unit.defense,
    res: unit.resist,
    hp: unit.hp,
    dmg: 0,
    toHitMod: unit.to_hit || 0,
    toHitRtbMod: 0,
    toBlkMod: document.getElementById(prefix + 'ToBlkMod').value,
    cityWalls: document.getElementById('cityWalls').value,
    nodeAura: document.getElementById('nodeAura').value,
    trueLight: !!document.getElementById('trueLight').checked,
    darkness: !!document.getElementById('darkness').checked,
    enemyEternalNight: !!document.getElementById(enemyPrefix + 'Abil_eternalNight').checked,
    chaosSurge: document.getElementById('chaosSurge').value,
    rangedCheck: rangedMatrixAttacker,
    rangedDist: rangedMatrixAttacker ? document.getElementById('rangedDist').value : 1,
    warpReality: !!document.getElementById('warpReality').checked,
    generic: unit.category === 'Generic',
  });
}

function buildMatrixDefenderStats(unit, appliedEnchantments, matrixMode) {
  return buildMatrixUnitStats('b', unit, appliedEnchantments, matrixMode);
}

function buildMatrixAttackerStats(unit, appliedEnchantments, matrixMode) {
  return buildMatrixUnitStats('a', unit, appliedEnchantments, matrixMode);
}

function selectedMatrixUnitRow(prefix, matrixMode) {
  const stats = readUnitStats(prefix, matrixMode === 'ranged' && prefix === 'a'
    ? { rangedCheck: true, rangedDist: document.getElementById('rangedDist').value }
    : null);
  const label = selectedUnitLabel(prefix);
  return {
    label,
    matchText: label,
    realmClass: matrixRealmClassForUnitType(stats.unitType),
    stats,
  };
}

function predefinedMatrixUnitRows(prefix, appliedEnchantments, matrixMode) {
  const version = document.getElementById('gameVersion').value;
  const unitsById = new Map((unitDatabases[version] || []).map(unit => [String(unit.id), unit]));
  return (unitComboboxData[prefix] || [])
    .map(entry => unitsById.get(entry.id))
    .filter(Boolean)
    .map(unit => {
      const unitType = predefinedUnitType(unit);
      return {
        label: unit.name,
        matchText: [unit.name, unit.category, unit.race].filter(Boolean).join(' '),
        realmClass: matrixRealmClassForUnitType(unitType),
        stats: prefix === 'a'
          ? buildMatrixAttackerStats(unit, appliedEnchantments, matrixMode)
          : buildMatrixDefenderStats(unit, appliedEnchantments, matrixMode),
      };
    });
}

let matrixCache = null;
let activeMatrixMode = 'melee';
let matrixWorkerBlobUrl = null;

const MATRIX_WORKER_HANDLER = `
function distExpectedValue(dist) {
  if (!dist) return 0;
  let ev = 0;
  for (let d = 0; d < dist.length; d++) ev += d * dist[d];
  return ev;
}
self.onmessage = function(e) {
  const { attackerStats, allDefenderStats, opts, rowIndex } = e.data;
  const isRanged = opts.isRanged;
  const ratios = allDefenderStats.map(defenderStats => {
    const result = resolveCombat(attackerStats, defenderStats, opts);
    if (isRanged) {
      return result.bRemHP > 0 ? distExpectedValue(result.totalDmgToB) / result.bRemHP : 0;
    }
    const pctToDefender = result.bRemHP > 0 ? distExpectedValue(result.totalDmgToB) / result.bRemHP : 0;
    const pctToAttacker = result.aRemHP > 0 ? distExpectedValue(result.totalDmgToA) / result.aRemHP : 0;
    if (pctToAttacker === 0) return pctToDefender > 0 ? Infinity : 1;
    return pctToDefender / pctToAttacker;
  });
  self.postMessage({ rowIndex, ratios });
};
`;

function meleeMatrixFractionalWinCount(values) {
  if (values.length === 1) return values[0];

  let greaterCount = 0;
  let highestBelow = -Infinity;
  let lowestAbove = Infinity;
  let hasExactTie = false;

  for (const value of values) {
    if (value > 1) {
      greaterCount += 1;
      lowestAbove = Math.min(lowestAbove, value);
    } else if (value < 1) {
      highestBelow = Math.max(highestBelow, value);
    } else {
      hasExactTie = true;
    }
  }

  if (greaterCount === values.length) return values.length;
  if (greaterCount === 0 || hasExactTie || highestBelow === -Infinity || lowestAbove === Infinity) {
    return greaterCount;
  }

  const thresholdFraction = (1 - highestBelow) / (lowestAbove - highestBelow);
  return greaterCount + (1 - thresholdFraction);
}

function meleeMatrixAttackerWinCount(cells, defenderIndexes) {
  return meleeMatrixFractionalWinCount(defenderIndexes.map(defenderIndex => cells[defenderIndex].ratio));
}

function meleeMatrixDefenderWinCount(rows, defenderIndex) {
  return meleeMatrixFractionalWinCount(rows.map(row => {
    const attackerRatio = row.cells[defenderIndex].ratio;
    return attackerRatio > 0 ? 1 / attackerRatio : Infinity;
  }));
}

function cappedLog10Ratio(value) {
  if (value <= 0) return -2;
  if (!Number.isFinite(value)) return 2;
  return clamp(Math.log10(value), -2, 2);
}

function meleeMatrixSortKey(values) {
  if (!values.length) return { wins: 0, meanLog: -1 };
  const wins = values.filter(value => value > 1).length;
  const meanLog = values.reduce((sum, value) => sum + cappedLog10Ratio(value), 0) / values.length;
  return { wins, meanLog };
}

function meleeMatrixAttackerSortKey(cells, defenderIndexes) {
  return meleeMatrixSortKey(defenderIndexes.map(defenderIndex => cells[defenderIndex].ratio));
}

function meleeMatrixDefenderSortKey(rows, defenderIndex) {
  return meleeMatrixSortKey(rows.map(row => {
    const attackerRatio = row.cells[defenderIndex].ratio;
    return attackerRatio > 0 ? 1 / attackerRatio : Infinity;
  }));
}

function meanMatrixCellValue(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function rangedMatrixAttackerMeanDamage(cells, defenderIndexes) {
  return meanMatrixCellValue(defenderIndexes.map(defenderIndex => cells[defenderIndex].ratio));
}

function rangedMatrixDefenderMeanDamage(rows, defenderIndex) {
  return meanMatrixCellValue(rows.map(row => row.cells[defenderIndex].ratio));
}

function compareMeleeMatrixSortKeys(a, b) {
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (a.wins !== b.wins) return a.wins < b.wins ? -1 : 1;
    if (a.meanLog !== b.meanLog) return a.meanLog < b.meanLog ? -1 : 1;
    return 0;
  }
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function numericMeleeMatrixCsvValue(ratio) {
  if (Number.isFinite(ratio)) return String(Number(ratio.toPrecision(15)));
  return '1e99';
}

function csvEscape(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function hasMatrixRangedAttack(info) {
  return info && info.stats && info.stats.rangedType !== 'none' && info.stats.rtb > 0;
}

async function buildMatrixCache(attackerEnchantments, defenderEnchantments, matrixMode) {
  const version = document.getElementById('gameVersion').value;
  const wallOfFire = document.getElementById('wallOfFire').checked;
  const isRangedMatrix = matrixMode === 'ranged';
  const allAttackers = predefinedMatrixUnitRows('a', attackerEnchantments, matrixMode)
    .filter(info => !isRangedMatrix || hasMatrixRangedAttack(info));
  const allDefenders = predefinedMatrixUnitRows('b', defenderEnchantments, matrixMode);
  const selectedAttacker = selectedMatrixUnitRow('a', matrixMode);
  const selectedDefender = selectedMatrixUnitRow('b', matrixMode);
  const attackers = (!isRangedMatrix || hasMatrixRangedAttack(selectedAttacker))
    ? [...allAttackers, selectedAttacker]
    : [...allAttackers];
  const defenders = [...allDefenders, selectedDefender];

  const opts = { isRanged: isRangedMatrix, version, wallOfFire };
  const allDefenderStats = defenders.map(d => d.stats);
  const rowRatios = new Array(attackers.length);

  if (!matrixWorkerBlobUrl) {
    const scriptAbsUrl = (name) =>
      [...document.querySelectorAll('script[src]')].find(s => s.src.endsWith(name))?.src;
    const engineUrl = scriptAbsUrl('engine.js');
    const combatUrl = scriptAbsUrl('combat.js');
    const src = `importScripts(${JSON.stringify(engineUrl)}, ${JSON.stringify(combatUrl)});\n${MATRIX_WORKER_HANDLER}`;
    matrixWorkerBlobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
  }

  await new Promise((resolve, reject) => {
    const numWorkers = Math.min(navigator.hardwareConcurrency || 4, attackers.length);
    let nextRow = 0;
    let completedRows = 0;
    const workers = [];

    function dispatchNext(worker) {
      if (nextRow >= attackers.length) return false;
      const rowIndex = nextRow++;
      worker.postMessage({ attackerStats: attackers[rowIndex].stats, allDefenderStats, opts, rowIndex });
      return true;
    }

    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(matrixWorkerBlobUrl);
      workers.push(worker);
      worker.onmessage = (e) => {
        rowRatios[e.data.rowIndex] = e.data.ratios;
        if (++completedRows === attackers.length) {
          workers.forEach(w => w.terminate());
          resolve();
        } else {
          dispatchNext(worker);
        }
      };
      worker.onerror = (err) => {
        console.error('Matrix worker error:', err);
        workers.forEach(w => w.terminate());
        reject(err);
      };
      dispatchNext(worker);
    }
  });

  const rows = attackers.map((attackerInfo, attackerIndex) => ({
    attackerIndex,
    info: attackerInfo,
    cells: defenders.map((_, defenderIndex) => ({ defenderIndex, ratio: rowRatios[attackerIndex][defenderIndex] })),
  }));

  return {
    allAttackerIndexes: allAttackers.map((_, i) => i),
    allDefenderIndexes: allDefenders.map((_, i) => i),
    rows,
    defenders,
    mode: matrixMode,
  };
}

function matrixNameFilterTerms(id) {
  const text = document.getElementById(id)?.value || '';
  return text
    .split(/\r?\n/)
    .map(term => term.trim().toLowerCase())
    .filter(Boolean);
}

function filterMeleeMatrixIndexes(indexes, infos, terms) {
  if (!terms.length) return indexes;
  return indexes.filter(index => {
    const matchText = String(infos[index]?.matchText || infos[index]?.label || '').toLowerCase();
    return terms.some(term => matchText.includes(term));
  });
}

function escHtmlAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderMatrixTable() {
  const wrap = document.getElementById('matrixTableWrap');
  if (!wrap) return;
  if (!matrixCache) return;

  const { matrixRows, matrixCols } = currentMatrixView();
  if (!matrixRows || !matrixCols) return;

  const isRanged = matrixCache.mode === 'ranged';
  const cellColorFn = isRanged ? rangedMatrixCellColor : meleeMatrixCellColor;

  const parts = [
    '<table class="matrix-table"><thead><tr>',
    '<th class="matrix-corner-header"><span class="matrix-corner-attacker">Attacker</span><span class="matrix-corner-defender">Defender</span></th>',
  ];
  for (const defCol of matrixCols) {
    const rc = defCol.info.realmClass ? ` ${escHtmlAttr(defCol.info.realmClass)}` : '';
    parts.push(`<th scope="col" class="matrix-col-header"><span class="matrix-col-label${rc}">${escHtmlAttr(defCol.info.label)}</span></th>`);
  }
  parts.push('</tr></thead><tbody>');
  for (const atkRow of matrixRows) {
    const rc = atkRow.info.realmClass ? ` class="${escHtmlAttr(atkRow.info.realmClass)}"` : '';
    parts.push(`<tr><th scope="row"><span${rc}>${escHtmlAttr(atkRow.info.label)}</span></th>`);
    for (const defCol of matrixCols) {
      const ratio = atkRow.cells[defCol.defenderIndex].ratio;
      const color = cellColorFn(ratio);
      parts.push(`<td style="background-color:${color.background};color:${color.textColor}">${escHtmlAttr(formatMatrixRatioValue(ratio, matrixCache.mode))}</td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</tbody></table>');
  wrap.innerHTML = parts.join('');
}

function currentMatrixView() {
  if (!matrixCache) return {};

  const isRangedMatrix = matrixCache.mode === 'ranged';
  const sortDefenders = !!document.getElementById('matrixSortDefenders')?.checked;
  const sortAttackers = !!document.getElementById('matrixSortAttackers')?.checked;
  const attackerFilterTerms = matrixNameFilterTerms('matrixAttackerNameFilter');
  const defenderFilterTerms = matrixNameFilterTerms('matrixDefenderNameFilter');

  const attackerIndexes = filterMeleeMatrixIndexes(
    matrixCache.allAttackerIndexes,
    matrixCache.rows.map(row => row.info),
    attackerFilterTerms
  );
  const defenderIndexes = filterMeleeMatrixIndexes(
    matrixCache.allDefenderIndexes,
    matrixCache.defenders,
    defenderFilterTerms
  );
  const matrixRows = attackerIndexes.map((attackerIndex, viewIndex) => {
    const cachedRow = matrixCache.rows[attackerIndex];
    return {
      attackerIndex,
      viewIndex,
      info: cachedRow.info,
      cells: cachedRow.cells,
      sortKey: isRangedMatrix
        ? rangedMatrixAttackerMeanDamage(cachedRow.cells, defenderIndexes)
        : meleeMatrixAttackerSortKey(cachedRow.cells, defenderIndexes),
    };
  });
  const matrixCols = defenderIndexes.map((defenderIndex, viewIndex) => ({
    defenderIndex,
    viewIndex,
    info: matrixCache.defenders[defenderIndex],
    sortKey: isRangedMatrix
      ? rangedMatrixDefenderMeanDamage(matrixRows, defenderIndex)
      : meleeMatrixDefenderSortKey(matrixRows, defenderIndex),
  }));
  if (sortAttackers) {
    matrixRows.sort((a, b) => compareMeleeMatrixSortKeys(b.sortKey, a.sortKey) || (a.viewIndex - b.viewIndex));
  }
  if (sortDefenders) {
    matrixCols.sort((a, b) => {
      const sortResult = isRangedMatrix
        ? compareMeleeMatrixSortKeys(a.sortKey, b.sortKey)
        : compareMeleeMatrixSortKeys(b.sortKey, a.sortKey);
      return sortResult || (a.viewIndex - b.viewIndex);
    });
  }

  return { matrixRows, matrixCols };
}

function buildMatrixCsv() {
  const { matrixRows, matrixCols } = currentMatrixView();
  if (!matrixRows || !matrixCols) return '';

  const lines = [
    ['Attacker / Defender', ...matrixCols.map(col => col.info.label)].map(csvEscape).join(','),
  ];
  for (const attackerRow of matrixRows) {
    const row = [csvEscape(attackerRow.info.label)];
    for (const defenderCol of matrixCols) {
      const ratio = attackerRow.cells[defenderCol.defenderIndex].ratio;
      row.push(numericMeleeMatrixCsvValue(ratio));
    }
    lines.push(row.join(','));
  }
  return lines.join('\r\n');
}

async function writeTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      // Fall through to the legacy copy path if browser policy blocks the API.
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    if (!document.execCommand('copy')) throw new Error('Copy command failed');
  } catch (err) {
    throw err;
  } finally {
    document.body.removeChild(textarea);
  }
}

async function exportMatrixCsvToClipboard(button) {
  if (!matrixCache) await renderMatrixSnapshot();
  const csv = buildMatrixCsv();
  if (!csv) return;

  const originalText = button ? button.textContent : '';
  try {
    await writeTextToClipboard(csv);
    if (button) button.textContent = 'Copied';
  } catch (err) {
    if (button) button.textContent = 'Copy failed';
  } finally {
    if (button) {
      window.setTimeout(() => {
        button.textContent = originalText || 'Export csv to clipboard';
      }, 1400);
    }
  }
}

async function swapMatrixSides() {
  const attackerFilter = document.getElementById('matrixAttackerNameFilter');
  const defenderFilter = document.getElementById('matrixDefenderNameFilter');
  if (attackerFilter && defenderFilter) {
    const tmp = attackerFilter.value;
    attackerFilter.value = defenderFilter.value;
    defenderFilter.value = tmp;
  }
  swapAttackerDefender();
  await renderMatrixSnapshot();
}

function resetMeleeMatrixControls() {
  ['matrixAttackerNameFilter', 'matrixDefenderNameFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = '';
    el.defaultValue = '';
  });
  ['matrixSortDefenders', 'matrixSortAttackers'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = true;
    el.defaultChecked = true;
  });
}

function initMatrixModal() {
  const openBtn = document.getElementById('meleeMatrixBtn');
  const rangedOpenBtn = document.getElementById('rangedMatrixBtn');
  const modal = document.getElementById('matrixModal');
  const closeBtn = document.getElementById('matrixClose');
  const exportBtn = document.getElementById('matrixExportCsv');
  const swapSidesBtn = document.getElementById('matrixSwapSides');
  const attackerFilter = document.getElementById('matrixAttackerNameFilter');
  const defenderFilter = document.getElementById('matrixDefenderNameFilter');
  const sortDefenders = document.getElementById('matrixSortDefenders');
  const sortAttackers = document.getElementById('matrixSortAttackers');
  if (!openBtn || !modal || !closeBtn) return;
  [openBtn, rangedOpenBtn].forEach(btn => {
    if (!btn) return;
    btn.style.width = '190px';
    btn.style.height = '55px';
  });
  resetMeleeMatrixControls();

  let pendingFilterRender = 0;
  const renderOpenMatrixTable = () => {
    if (modal.classList.contains('is-open')) renderMatrixTable();
  };
  const scheduleFilterRender = () => {
    clearTimeout(pendingFilterRender);
    pendingFilterRender = setTimeout(() => {
      pendingFilterRender = 0;
      renderOpenMatrixTable();
    }, 150);
  };

  const open = (matrixMode) => {
    const btn = matrixMode === 'ranged' && rangedOpenBtn ? rangedOpenBtn : openBtn;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = 'Calculating...';
    btn.disabled = true;
    requestAnimationFrame(() => requestAnimationFrame(async () => {
      try {
        activeMatrixMode = matrixMode;
        await renderMatrixSnapshot();
        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
        const tip = document.getElementById('tt');
        if (tip) tip.style.display = 'none';
        closeBtn.focus();
      } catch (err) {
        console.error('Matrix calculation failed:', err);
      } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
      }
    }));
  };
  const close = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    (activeMatrixMode === 'ranged' && rangedOpenBtn ? rangedOpenBtn : openBtn).focus();
  };

  openBtn.addEventListener('click', () => open('melee'));
  if (rangedOpenBtn) rangedOpenBtn.addEventListener('click', () => open('ranged'));
  closeBtn.addEventListener('click', close);
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      void exportMatrixCsvToClipboard(exportBtn);
    });
  }
  if (swapSidesBtn) {
    swapSidesBtn.addEventListener('click', async () => {
      swapSidesBtn.disabled = true;
      try {
        await swapMatrixSides();
      } finally {
        swapSidesBtn.disabled = false;
        swapSidesBtn.focus();
      }
    });
  }
  [sortDefenders, sortAttackers].forEach(el => {
    if (!el) return;
    el.addEventListener('change', renderOpenMatrixTable);
  });
  [attackerFilter, defenderFilter].forEach(el => {
    if (!el) return;
    el.addEventListener('input', scheduleFilterRender);
  });
  modal.addEventListener('click', e => {
    if (e.target === modal) close();
  });
  modal.addEventListener('wheel', e => {
    e.stopPropagation();
  }, { passive: true });
  modal.addEventListener('touchmove', e => {
    e.stopPropagation();
  }, { passive: true });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) close();
  });
}

// --- Event Wiring ---

// Build ability UI
buildAbilitiesUI('a');
buildAbilitiesUI('b');
initMatrixModal();

// Unit type change -> update level availability
['a', 'b'].forEach(prefix => {
  const unitTypeSel = document.getElementById(prefix + 'Abil_unitType');
  if (unitTypeSel) {
    unitTypeSel.addEventListener('change', () => {
      updateCustomLevelState(prefix);
      recalculate();
    });
  }
});

document.getElementById('gameVersion').addEventListener('change', onVersionChange);
document.getElementById('swapBtn').addEventListener('click', swapAttackerDefender);
document.getElementById('resetBtn').addEventListener('click', resetCalculatorState);
document.querySelectorAll('.toggle-abil-btn').forEach(btn => {
  btn.addEventListener('click', toggleAllAbilities);
});
document.getElementById('aUnit').addEventListener('change', () => {
  updateUnitLock('a');
  updateTypeVisibility();
  recalculate();
});
document.getElementById('bUnit').addEventListener('change', () => {
  updateUnitLock('b');
  updateTypeVisibility();
  recalculate();
});
initUnitCombobox('a');
initUnitCombobox('b');

document.getElementById('aLevel').addEventListener('change', () => {
  applyLevelBonuses('a');
  recalculate();
});
document.getElementById('bLevel').addEventListener('change', () => {
  applyLevelBonuses('b');
  recalculate();
});

// Global input/change handler for all fields
document.querySelectorAll('input, select').forEach(el => {
  el.addEventListener('input', () => { updateTypeVisibility(); updateAbilityVisibility(); recalculate(); });
  el.addEventListener('change', () => { updateTypeVisibility(); updateAbilityVisibility(); recalculate(); });
});

// Focus/blur on ability items: keep focused items visible, re-hide on blur
document.querySelectorAll('.abil-item').forEach(item => {
  item.addEventListener('focusin', () => {
    item.classList.remove('abil-hidden');
  });
  item.addEventListener('focusout', () => {
    // Delay to allow click on another element within the same item
    setTimeout(() => updateAbilityVisibility(), 100);
  });
});

// Generate preset buttons as a collapsible tree
(function buildPresetButtons() {
  const container = document.getElementById('presetButtons');

  function makeButton(name) {
    const preset = PRESETS[name];
    if (!preset) return null;
    const parts = preset.desc.split(/:\s*(.+)/);
    const title = parts[0];
    const sub = parts[1] || '';
    const exp = preset.expected;
    const expLine = exp ? `${exp.dmgToA != null ? `E[A]=${exp.dmgToA.toFixed(3)}` : ''}${exp.dmgToA != null && exp.dmgToB != null ? ' ' : ''}${exp.dmgToB != null ? `E[B]=${exp.dmgToB.toFixed(3)}` : ''}` : '';
    const btn = document.createElement('button');
    btn.onclick = () => { applyPreset(name); };
    btn.innerHTML = `${title}<br><small>${sub}</small>` +
      (expLine ? `<br><small style="color:var(--accent)">${expLine}</small>` : '');
    return btn;
  }

  for (const group of TEST_TREE) {
    const groupDetails = document.createElement('details');
    groupDetails.className = 'preset-group';
    groupDetails.open = true;
    const groupSummary = document.createElement('summary');
    groupSummary.textContent = group.name;
    groupDetails.appendChild(groupSummary);

    for (const sub of group.subs) {
      const subDetails = document.createElement('details');
      subDetails.className = 'preset-subgroup';
      subDetails.open = false;
      const subSummary = document.createElement('summary');
      subSummary.textContent = sub.name;
      subDetails.appendChild(subSummary);

      for (const key of sub.keys) {
        if (group.version) PRESET_VERSIONS[key] = group.version;
        const btn = makeButton(key);
        if (btn) subDetails.appendChild(btn);
      }
      groupDetails.appendChild(subDetails);
    }
    container.appendChild(groupDetails);
  }
})();

// Initial load
resetCalculatorState();

// --- Cursor-following tooltip ---
(function initTooltip() {
  const tip = document.getElementById('tt');

  // Propagate data-tooltip from each label to the input/select siblings that follow it
  // in the same panel-fields grid, until the next label resets the current tooltip.
  document.querySelectorAll('.panel-fields').forEach(grid => {
    let cur = null;
    for (const child of grid.children) {
      if (child.tagName === 'LABEL') {
        cur = child.dataset.tooltip || null;
      } else if (cur && (child.tagName === 'INPUT' || child.tagName === 'SELECT')) {
        if (!child.dataset.tooltip) child.dataset.tooltip = cur;
      }
    }
  });

  function tooltipElementAtPoint(x, y) {
    const direct = document.elementFromPoint(x, y);
    let el = direct;
    while (el && el !== document.documentElement) {
      if (el.dataset && el.dataset.tooltip) return el;
      el = el.parentElement;
    }
    if (direct && direct.closest && direct.closest('.modal-overlay.is-open')) return null;

    // Disabled or pointer-locked form controls may not become the event target.
    // Fall back to geometry so their tooltips still work while they remain locked.
    const tooltipEls = Array.from(document.querySelectorAll('[data-tooltip]'));
    for (let i = tooltipEls.length - 1; i >= 0; i--) {
      const candidate = tooltipEls[i];
      const rect = candidate.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return candidate;
      }
    }
    return null;
  }

  // Suppress the tooltip while a unit-combobox dropdown list is open. The list is
  // an absolutely-positioned <div> overlaying other tooltip-bearing controls, so
  // without this the tooltip would keep tracking whatever sits beneath the list.
  function isComboboxOpen(x, y) {
    const lists = document.querySelectorAll('.unit-dropdown-list');
    for (const list of lists) {
      if (list.style.display === 'none' || !list.offsetParent) continue;
      if (x === undefined) return true;
      const r = list.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
    return false;
  }

  document.addEventListener('mousemove', e => {
    if (isComboboxOpen(e.clientX, e.clientY)) { tip.style.display = 'none'; return; }
    const el = tooltipElementAtPoint(e.clientX, e.clientY);
    const text = el && el.dataset && el.dataset.tooltip;
    if (text) {
      tip.textContent = text;
      tip.style.display = 'block';
      const offX = 14, offY = 14;
      let x = e.clientX + offX;
      let y = e.clientY + offY;
      if (x + tip.offsetWidth > window.innerWidth)  x = e.clientX - tip.offsetWidth - 6;
      if (y + tip.offsetHeight > window.innerHeight) y = e.clientY - tip.offsetHeight - 6;
      tip.style.left = x + 'px';
      tip.style.top  = y + 'px';
    } else {
      tip.style.display = 'none';
    }
  });
  document.addEventListener('mouseleave', () => { tip.style.display = 'none'; });
})();

// --- Presets Drawer ---
(function() {
  const drawer = document.getElementById('presetsDrawer');
  const toggle = document.getElementById('presetsToggle');
  const overlay = document.getElementById('presetsOverlay');

  function open() {
    drawer.classList.add('open');
    overlay.classList.add('active');
    toggle.setAttribute('aria-expanded', 'true');
  }
  function close() {
    drawer.classList.remove('open');
    overlay.classList.remove('active');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    drawer.classList.contains('open') ? close() : open();
  });
  overlay.addEventListener('click', close);
})();

