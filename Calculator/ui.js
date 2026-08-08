// --- UI Layer ---
// All DOM interaction. Depends on data.js, engine.js, combat.js.

// --- Abilities UI ---

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
  if (abil.signed) return nextValue || 0;
  return Math.max(currentValue === undefined ? 0 : currentValue, nextValue || 0);
}

function abilityDisplayLabel(abil) {
  return abil.label;
}

// Card sections are titled by what the engine lets you change, not by def group. The
// `group` string stays the internal key (dataset.abilGroup drives version gating and
// group hiding); only the visible heading differs. "Enchantments" also heads the level,
// weapon and armor selects, which is why its heading names conditions too.
const ABIL_GROUP_HEADINGS = {
  Enchantments: 'Enchantments and conditions',
};

// The def groups that get their own show-all toggle.
const ABIL_TOGGLE_GROUPS = ['Abilities', 'Enchantments'];

// Each group hides its inactive items independently, tracked by a class on the section so
// both panels stay in step. Version-gated items are never revealed by either toggle.
function groupHidingClass(group) {
  return 'hide-inactive-' + group.toLowerCase().replace(/[^a-z]+/g, '-');
}

function isGroupHiding(section, group) {
  return section.classList.contains(groupHidingClass(group));
}

function buildAbilitiesUI(prefix) {
  const container = document.getElementById(prefix + 'Abilities');
  let gridDiv = null;
  // Enchantments render in two stacked blocks: a single-column block for selects/number
  // inputs, then a two-column block for the bool checkboxes (realm-ordered).
  let enchSelectRowDiv = null;
  let enchControlsDiv = null;
  let enchBoolsDiv = null;
  let currentGroup = '';
  let currentGroupClass = '';
  let currentSubgroup = '';
  for (const abil of abilityUiDefs()) {
    if (abil.group && abil.group !== currentGroup) {
      currentGroup = abil.group;
      currentGroupClass = 'group-' + currentGroup.toLowerCase().replace(/[^a-z]+/g, '-');
      currentSubgroup = '';
      gridDiv = null;
      enchSelectRowDiv = null;
      enchControlsDiv = null;
      enchBoolsDiv = null;
      const header = document.createElement('div');
      header.className = 'abil-group-header';
      header.dataset.abilGroup = currentGroup;
      // The heading carries the group's own show-all toggle, so it must render even when the
      // group has nothing visible — otherwise a roster unit with no abilities would offer no
      // way to reveal its greyed-out remainder.
      const title = document.createElement('span');
      title.textContent = ABIL_GROUP_HEADINGS[currentGroup] || currentGroup;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'toggle-abil-btn';
      toggle.dataset.abilGroup = currentGroup;
      toggle.title = 'Show/hide inactive ' + (ABIL_GROUP_HEADINGS[currentGroup] || currentGroup).toLowerCase();
      header.append(title, toggle);
      container.appendChild(header);
      if (currentGroup === 'Enchantments') {
        // Level/weapon/armor are selectable pre-combat conditions, not roster-locked base
        // stats, so they belong under this heading rather than above the ability list.
        const section = container.closest('.abilities-section');
        const loadout = section && section.querySelector('.loadout-fields');
        if (loadout) container.appendChild(loadout);
        // Checkbox block first (two columns), then the controls below it: a three-column row for
        // the Elements/Discipline/Breakthrough dropdowns, then the remaining controls.
        enchBoolsDiv = document.createElement('div');
        enchBoolsDiv.className = 'abil-grid ' + currentGroupClass + ' ench-bools';
        enchBoolsDiv.dataset.abilGroup = currentGroup;
        container.appendChild(enchBoolsDiv);
        enchSelectRowDiv = document.createElement('div');
        enchSelectRowDiv.className = 'abil-grid ' + currentGroupClass + ' ench-select-row';
        enchSelectRowDiv.dataset.abilGroup = currentGroup;
        container.appendChild(enchSelectRowDiv);
        enchControlsDiv = document.createElement('div');
        enchControlsDiv.className = 'abil-grid ' + currentGroupClass + ' ench-controls';
        enchControlsDiv.dataset.abilGroup = currentGroup;
        container.appendChild(enchControlsDiv);
      }
    }
    if (abil.subgroup && abil.subgroup !== currentSubgroup) {
      currentSubgroup = abil.subgroup;
      // Enchantments render as one flat list: the subgroup is retained on each item (it still
      // drives version gating via subgroupAllowed), but we don't split into separate grids or
      // emit "All versions / Warlord only / ..." subgroup headers.
      if (currentGroup !== 'Enchantments') {
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
    }
    if (!gridDiv && currentGroup !== 'Enchantments') {
      gridDiv = document.createElement('div');
      gridDiv.className = 'abil-grid ' + currentGroupClass;
      gridDiv.dataset.abilGroup = currentGroup;
      if (currentSubgroup) gridDiv.dataset.abilSubgroup = currentSubgroup;
      container.appendChild(gridDiv);
    }
    // Most selects/number inputs live in the single-column controls block, but a few simple
    // numeric enchantments read better inline with the checkbox grid (they get realm-sorted
    // alongside it like any other entry).
    const inGridNumKeys = new Set(['resistanceToAll', 'holyBonus', 'pillarOfFaithRes']);
    const selectRowKeys = new Set(['elemArmor', 'discipline', 'disciplineWarlord', 'breakthrough']);
    const inBoolGrid = abil.type === 'bool' || inGridNumKeys.has(abil.key);
    let itemParent;
    if (currentGroup === 'Enchantments') {
      itemParent = selectRowKeys.has(abil.key) ? enchSelectRowDiv
        : inBoolGrid ? enchBoolsDiv
        : enchControlsDiv;
    } else {
      itemParent = gridDiv;
    }
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
      if (abil.alwaysVisible) lbl.dataset.alwaysVisible = 'true';
      if (currentSubgroup) lbl.dataset.abilSubgroup = currentSubgroup;
      if (abil.realm) lbl.dataset.realm = abil.realm;
      if (abil.tooltip) lbl.dataset.tooltip = abil.tooltip;
      lbl.innerHTML = `<input type="checkbox" id="${id}"> ${labelHtml}`;
      itemParent.appendChild(lbl);
    } else if (abil.type === 'select') {
      const row = document.createElement('div');
      row.className = 'abil-num-row abil-item';
      row.dataset.abilKey = abil.uiKey || abil.key;
      row.dataset.calcKey = abil.calcKey || abil.key;
      row.dataset.abilSource = abil.source || '';
      row.dataset.abilGroup = currentGroup;
      if (abil.alwaysVisible) row.dataset.alwaysVisible = 'true';
      if (currentSubgroup) row.dataset.abilSubgroup = currentSubgroup;
      row.dataset.abilDefault = abil.options[0][0];
      if (abil.tooltip) row.dataset.tooltip = abil.tooltip;
      const opts = abil.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
      row.innerHTML = `<label for="${id}">${labelHtml}</label><select id="${id}">${opts}</select>`;
      itemParent.appendChild(row);
    } else if (abil.type === 'numcheck') {
      const row = document.createElement('div');
      row.className = 'abil-num-row abil-item';
      row.dataset.abilKey = abil.uiKey || abil.key;
      row.dataset.calcKey = abil.calcKey || abil.key;
      row.dataset.abilSource = abil.source || '';
      row.dataset.abilGroup = currentGroup;
      if (abil.alwaysVisible) row.dataset.alwaysVisible = 'true';
      if (currentSubgroup) row.dataset.abilSubgroup = currentSubgroup;
      if (abil.tooltip) row.dataset.tooltip = abil.tooltip;
      const min = abil.min != null ? abil.min : -50;
      const max = abil.max != null ? abil.max : 50;
      row.innerHTML = `<input type="checkbox" id="${id}_on"><label for="${id}">${labelHtml}</label><input type="number" id="${id}" value="0" min="${min}" max="${max}" step="1">`;
      itemParent.appendChild(row);
    } else {
      const row = document.createElement('div');
      row.className = 'abil-num-row abil-item';
      row.dataset.abilKey = abil.uiKey || abil.key;
      row.dataset.calcKey = abil.calcKey || abil.key;
      row.dataset.abilSource = abil.source || '';
      row.dataset.abilGroup = currentGroup;
      if (abil.alwaysVisible) row.dataset.alwaysVisible = 'true';
      if (currentSubgroup) row.dataset.abilSubgroup = currentSubgroup;
      if (abil.realm) row.dataset.realm = abil.realm;
      if (abil.tooltip) row.dataset.tooltip = abil.tooltip;
      const min = abil.min != null ? abil.min : -50;
      const max = abil.max != null ? abil.max : 50;
      row.innerHTML = `<label for="${id}">${labelHtml}</label><input type="number" id="${id}" value="0" min="${min}" max="${max}" step="1">`;
      itemParent.appendChild(row);
    }
  }

  // The enchantment grid items come from several version subgroups. Sort the merged list so it
  // reads primarily by realm (non-realm → arcane → life → death → chaos → nature → sorcery) and
  // alphabetically by label within each realm.
  if (enchBoolsDiv) {
    const REALM_RANK = { '': 0, arcane: 1, life: 2, death: 3, chaos: 4, nature: 5, sorcery: 6 };
    // Within the non-realm group, keep the "Received" number controls above the retort
    // checkboxes (num rows sort before checkboxes); other realms keep plain alpha order.
    [...enchBoolsDiv.children]
      .map(el => {
        const rank = REALM_RANK[el.dataset.realm || ''] ?? 0;
        const subRank = rank === 0 && !el.classList.contains('abil-num-row') ? 1 : 0;
        return [el, rank, subRank, el.textContent.trim().toLowerCase()];
      })
      .sort((a, b) => a[1] - b[1] || a[2] - b[2] || a[3].localeCompare(b[3]))
      .forEach(([el]) => enchBoolsDiv.appendChild(el));
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
    const val = abilValues[abil.key];
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
  const enemyEternalNightEl = el(enemyPrefix + 'Abil_eternalNight');
  const enemyEyeOfHeavenEl = el(enemyPrefix + 'Abil_eyeOfHeaven');
  const overrideValues = overrides || {};
  const identity = unitIdentityForDerivation(prefix, el('gameVersion').value);
  return deriveUnitStats({
    prefix,
    version: el('gameVersion').value,
    abilities: { ...readAbilitiesFromDOM(prefix), ...modernSpecialValues(prefix), ...dosSpecialValues(prefix) },
    identity,
    name: (unitIdentity[prefix] || {}).name,
    level: el(prefix + 'Level').value,
    weapon: el(prefix + 'Weapon').value,
    armor: el(prefix + 'Armor').value,
    rtbType: el(prefix + 'RtbType').value,
    figs: el(prefix + 'Figs').value,
    atk: el(prefix + 'Atk').value,
    rtb: el(prefix + 'Rtb').value,
    modernAttacks: modernCardAttacks(prefix),
    def: el(prefix + 'Def').value,
    res: el(prefix + 'Res').value,
    hp: el(prefix + 'HP').value,
    dmg: el(prefix + 'Dmg').value,
    toHitMod: el(prefix + 'ToHitMod').value,
    toHitRtbMod: el(prefix + 'ToHitRtbMod').value,
    toBlkMod: el(prefix + 'ToBlkMod').value,
    cityWalls: el('cityWalls').value,
    nodeAura: el('nodeAura').value,
    wallOfFire: !!el('wallOfFire').checked,
    trueLight: !!el('trueLight').checked,
    darkness: !!el('darkness').checked,
    enemyEternalNight: !!(enemyEternalNightEl && enemyEternalNightEl.checked),
    enemyEyeOfHeaven: !!(enemyEyeOfHeavenEl && enemyEyeOfHeavenEl.checked),
    chaosSurge: el('chaosSurge').value,
    rangedCheck: overrideValues.rangedCheck !== undefined ? overrideValues.rangedCheck : !!el('rangedCheck').checked,
    rangedDist: overrideValues.rangedDist !== undefined ? overrideValues.rangedDist : el('rangedDist').value,
    warpReality: !!el('warpReality').checked,
    hurricane: !!el('hurricane').checked,
    poxHost: !!el('poxHost').checked,
    generic: !!(unitBaseStats[prefix] && unitBaseStats[prefix].generic),
  });
}

const MODERN_SPECIAL_FIELDS = [
  ['stoningGaze', 'Stoning Gaze'], ['deathGaze', 'Death Gaze'], ['doomGaze', 'Doom Gaze'],
  ['stoningTouch', 'Stoning Touch'], ['deathTouch', 'Death Touch'], ['lifeSteal', 'Life Steal'],
  ['poison', 'Poison Touch'], ['exorcise', 'Exorcise'], ['destruction', 'Destruction'],
];

function modernSpecialDef(key) {
  return ABILITY_DEFS.find(a => a.key === key);
}

// null (absent) and 0 (present, save modifier −0) are different states for the numcheck
// entries — the engine tests `!= null` — so an unchecked box must read back as null, not 0.
function modernSpecialValues(prefix) {
  if (!document.getElementById('gameVersion').value.startsWith('com2')) return {};
  return Object.fromEntries(MODERN_SPECIAL_FIELDS.map(([key]) => {
    const chk = document.getElementById(prefix + 'Modern_' + key + '_on');
    if (chk && !chk.checked) return [key, null];
    return [key, parseInt(document.getElementById(prefix + 'Modern_' + key).value, 10) || 0];
  }));
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
    const def = modernSpecialDef(key);
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

// The DOS record carries one `Spec_Att_Attrib` byte (+0x15) and every consumer below reads
// it: the touch riders as a save modifier (the code negates it at the read site), Poison
// Touch as a repeat count, Holy Bonus and Resistance to All as a magnitude. So the block is
// one number plus flags, not a number each. The third element is the sign the consumer's
// existing ability control expects, which is how the rosters have always stored it.
//
// The gazes read the same byte but are selected by `ranged_type` (103/104/105), not by a
// flag, so they get no control here — the shared strength/type slot above already selects
// them. Holy Bonus and Resistance to All are this unit's *provided* value; the received
// side stays in the enchantment section and the two max together in `mergedAbilityValue`.
const DOS_SPECIAL_CONSUMERS = [
  ['stoningTouch', 'Stoning Touch', -1],
  ['deathTouch', 'Death Touch', -1],
  ['lifeSteal', 'Life Steal', -1],
  ['poison', 'Poison Touch', 1],
  ['holyBonus', 'Holy bonus', 1],
  ['resistanceToAll', 'Res. to all', 1],
];

// Dispel Evil and Destruction dispatch alongside the touch riders but their modifiers are
// literals in the DOS code — -4 and 0 — so they never read the byte. They therefore stay
// ordinary ability rows rather than joining the card block, which is reserved for the byte's
// consumers.

// Consumers the shared slot's type selects rather than a flag, so they get no DOS control.
const DOS_GAZE_KEYS = ['stoningGaze', 'deathGaze', 'doomGaze'];

function dosSpecialDef(key) {
  return ABILITY_DEFS.find(a => a.key === key);
}

function dosSpecialIsActive(version) {
  return !version.startsWith('com2');
}

// Card -> ability controls. Each ticked consumer takes the shared magnitude with its own
// sign; an unticked one reverts to the def's absent value, which for a numcheck is null
// rather than 0 because the engine distinguishes the two.
function syncDosSpecialAbilities(prefix) {
  const magEl = document.getElementById(prefix + 'DosSpecial');
  if (!magEl) return;
  const magnitude = Math.abs(parseInt(magEl.value, 10) || 0);
  for (const [key, , sign] of DOS_SPECIAL_CONSUMERS) {
    const def = dosSpecialDef(key);
    const chk = document.getElementById(prefix + 'DosFlag_' + key);
    if (!def || !chk) continue;
    setAbilityControlValue(prefix, def,
      chk.checked ? sign * magnitude : (def.type === 'numcheck' ? null : 0));
  }
}

// Ability controls -> card, for presets and state restore, which describe the DOS special
// values by ability key and so are the only remaining places a magnitude has to be recovered
// from them. `byte` is the roster path: the record states `Spec_Att_Attrib` directly, so the
// flags come from the tokens but the magnitude never does.
function syncDosSpecialCard(prefix, byte) {
  const magEl = document.getElementById(prefix + 'DosSpecial');
  if (!magEl) return;
  let magnitude = byte == null ? null : Math.abs(byte);
  for (const [key] of DOS_SPECIAL_CONSUMERS) {
    const def = dosSpecialDef(key);
    const chk = document.getElementById(prefix + 'DosFlag_' + key);
    if (!def || !chk) continue;
    const val = getAbilityControlValue(prefix, def);
    const active = abilityValueIsActive(def, val);
    chk.checked = active;
    if (active && magnitude === null) magnitude = Math.abs(val || 0);
  }
  // The gazes carry no flag but do carry the byte, so a gaze-only unit — Basilisk, and every
  // gaze preset — must still seed the magnitude from them.
  if (magnitude === null) {
    for (const key of DOS_GAZE_KEYS) {
      const def = dosSpecialDef(key);
      if (!def) continue;
      const val = getAbilityControlValue(prefix, def);
      if (abilityValueIsActive(def, val)) { magnitude = Math.abs(val || 0); break; }
    }
  }
  // Nothing sourced it: reset rather than keep the previous unit's byte. Leaving it would let
  // one roster pick or preset leak a save modifier into the next.
  magEl.value = magnitude === null ? 0 : magnitude;
}

// Highest value the enchantment section supplies for a calc key. Holy Bonus and Resistance to
// All are the two that matter: the block above is what this unit *provides*, this is what it
// *receives*, and the engine takes the winner once rather than stacking them.
function dosReceivedValue(prefix, calcKey) {
  let out;
  for (const def of abilityUiDefs()) {
    if (def.source !== 'enchantment' || def.calcKey !== calcKey) continue;
    out = mergedAbilityValue(def, out, getAbilityControlValue(prefix, def));
  }
  return out;
}

// The DOS read side. Consumer values are derived from the one byte and its flags rather than
// from the per-effect ability controls, so the record's contention holds however the state was
// reached — roster, preset, share link or hand edit. The DOS rosters no longer carry a
// per-effect magnitude at all; the ability controls survive only as the presets' and share
// links' way of naming these values, and the card overwrites them on load.
// `withReceived` is false on the matrix path, where the received side comes from matrix state
// and is overlaid after this, not from the enchantment controls.
function dosSpecialValues(prefix, withReceived = true) {
  if (!dosSpecialIsActive(document.getElementById('gameVersion').value)) return {};
  const magEl = document.getElementById(prefix + 'DosSpecial');
  if (!magEl) return {};
  const magnitude = Math.abs(parseInt(magEl.value, 10) || 0);
  const out = {};
  for (const [key, , sign] of DOS_SPECIAL_CONSUMERS) {
    const def = dosSpecialDef(key);
    const chk = document.getElementById(prefix + 'DosFlag_' + key);
    if (!def || !chk) continue;
    const calcKey = def.calcKey || def.key;
    if (def.type === 'numcheck') {
      out[calcKey] = chk.checked ? sign * magnitude : null;
    } else {
      // Numeric consumers max against whatever the enchantment section grants.
      out[calcKey] = mergedAbilityValue(def,
        withReceived ? dosReceivedValue(prefix, calcKey) : undefined,
        chk.checked ? sign * magnitude : 0);
    }
  }
  // The gazes read the same byte, but the shared slot's type selects them rather than a flag:
  // 103 runs the stoning kill loop, 105 the death loop, and 104 runs both — which is why a
  // unit with two gazes is necessarily 104, and why the two share one modifier. Selecting a
  // non-gaze type therefore removes the gaze outright; the record cannot hold both.
  const gazeType = (document.getElementById(prefix + 'RtbType') || {}).value;
  const stoning = gazeType === 'gaze_stoning' || gazeType === 'gaze_multiple';
  const death = gazeType === 'gaze_death' || gazeType === 'gaze_multiple';
  out.stoningGaze = stoning ? -magnitude : null;
  out.deathGaze = death ? -magnitude : null;
  // Doom damage is the shared *strength* slot, not the byte — `deriveUnitStats` reads it from
  // there for type 104 — so the ability value contributes nothing in the DOS versions.
  out.doomGaze = 0;
  // Dispel Evil and Destruction are deliberately absent: their modifiers are literals, so they
  // stay ordinary ability rows and `readAbilitiesFromDOM` supplies them.
  return out;
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
    const def = dosSpecialDef(key);
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
  const def = dosSpecialDef(key);
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

// Show one final calculated value next to each editable base stat. R7.3's projection is
// authoritative for both the displayed result and its explanation: the UI only formats the
// existing ordered chain and never rebuilds modifier mechanics from controls.
function updateModifiedDisplay(prefix, stats) {
  const s = stats || readUnitStats(prefix);
  const traces = s.modifierTraces || {};

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
    for (const entry of trace.entries) {
      lines.push(formatTraceSource(entry) + ' (phase ' + entry.phase + '): '
        + formatTraceValue(entry.from, trace) + ' → ' + formatTraceValue(entry.to, trace));
    }
    lines.push('Displayed result: ' + formatTraceValue(trace.result, trace));
    return lines.join('\n');
  }

  function showTrace(id, trace) {
    const el = document.getElementById(id);
    if (!el) return;
    if (trace && Array.isArray(trace.entries) && trace.entries.length > 0) {
      el.textContent = formatTraceValue(trace.result, trace);
      el.dataset.tooltip = formatTraceTooltip(trace);
      el.classList.add('visible');
    } else {
      el.textContent = '';
      delete el.dataset.tooltip;
      el.classList.remove('visible');
    }
  }

  showTrace(prefix + 'FantasticMod', traces.fantastic);
  showTrace(prefix + 'RaceMod', traces.race);
  showTrace(prefix + 'FigsMod', traces.figures);
  showTrace(prefix + 'AtkMod', traces.melee);
  showTrace(prefix + 'RtbMod', traces.sharedAttack);
  showTrace(prefix + 'DefMod', traces.defense);
  showTrace(prefix + 'ResMod', traces.resistance);
  showTrace(prefix + 'HPMod', traces.hits);

  showTrace(prefix + 'ToHitMeleeMod', traces.toHitMelee);
  showTrace(prefix + 'ToHitRtbModDisp', traces.toHitRanged);
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

// --- Level Bonuses ---

// Reset the stat fields to the roster unit's base values. Nothing here applies a level
// bonus: the card holds pre-level stats, and the level ladder is an ordinary transform
// step in deriveUnitStats (`stats.js`, statStep 'level'). Guarded on base.atk because a
// custom unit's record may hold only the `generic` flag (see applyFullState), not base stats.
function resetCardToRosterBase(prefix) {
  const base = unitBaseStats[prefix];
  if (!base || base.atk === undefined) return;
  document.getElementById(prefix + 'Atk').value = base.atk;
  document.getElementById(prefix + 'Rtb').value = base.rtb;
  document.getElementById(prefix + 'Def').value = base.def;
  document.getElementById(prefix + 'Res').value = base.res;
  document.getElementById(prefix + 'HP').value = base.hp;
  document.getElementById(prefix + 'ToHitMod').value = base.toHitMod;
  applyModernAttackFields(prefix, base.modernAttacks);
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
  return {
    ranged: ranged ? { strength: ranged, type: document.getElementById(prefix + 'ModernRangedType').value } : null,
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
  // Modern rosters store an absolute To Defend chance; the card stores the
  // calculator's modifier above its 30% base.
  document.getElementById(prefix + 'ToBlkMod').value = (unit.to_block == null ? 30 : unit.to_block) - 30;
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

// --- Swap ---

const DEFAULT_GAME_VERSION = 'mom_1.31';
const GAME_VERSION_STORAGE_KEY = 'gameVersion_v1';

// Version ids that have been renamed. Saved state and shared links outlive a rename, and an
// unknown id fails silently rather than loudly — loadUnitDatabase() returns [] for one, so the
// symptom is an empty unit dropdown. Map retired ids forward instead.
// Only one Warlord build is supported at a time, so every retired Warlord id resolves to the
// current one rather than restoring old behaviour.
const RENAMED_GAME_VERSIONS = {
  'com2_warlord_1.5.12.5': 'com2_warlord_1.5.12.6.2',
  'com2_warlord_1.5.12.6': 'com2_warlord_1.5.12.6.2',
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
  document.getElementById('cityWalls').value = 'none';
  document.getElementById('nodeAura').value = 'none';
  document.getElementById('trueLight').checked = false;
  document.getElementById('darkness').checked = false;
  document.getElementById('chaosSurge').value = 0;
  document.getElementById('wallOfFire').checked = false;
  document.getElementById('warpReality').checked = false;
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

  const aLS = (result.aLifeStealExpected != null)
    ? result.aLifeStealExpected
    : distExpectedValue(result.aLifeStealDist);
  const bLS = (result.bLifeStealExpected != null)
    ? result.bLifeStealExpected
    : distExpectedValue(result.bLifeStealDist);

  if (aLS < 0.001 && bLS < 0.001) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  let html = '';
  if (aLS >= 0.001) {
    html += `<span>Attacker self-heal (life steal / bloodsucker): <strong>${aLS.toFixed(3)}</strong></span>`;
  }
  if (bLS >= 0.001) {
    if (html) html += ' &nbsp;|&nbsp; ';
    html += `<span>Defender self-heal (life steal / bloodsucker): <strong>${bLS.toFixed(3)}</strong></span>`;
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

  const hasRangedAttack = a.modernAttacks
    ? !!(a.modernAttacks.ranged && a.modernAttacks.ranged.strength > 0)
    : a.rangedType !== 'none' && a.rtb > 0;
  const isRanged = document.getElementById('rangedCheck').checked && hasRangedAttack;
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

  // Persist the live page state, unless we're mid-restore (applyState calls recalculate
  // once at the end; saving a half-applied blob would be wrong).
  if (!_restoring) scheduleSaveState();
}

// Backward-compatible alias
function calculate() { recalculate(); }

// --- Visibility ---

// True if an ability/enchantment whose def carries `subgroup` is available in the
// given game-version string. Shared by the main panels and the matrix candidate list
// so both gate enchantments identically.
function subgroupAllowedForVersion(subgroup, version) {
  const isMoM = version === 'mom_1.31' || version === 'mom_cp_1.60.00';
  const isCoMorCoM2 = version === 'com_6.08' || version.startsWith('com2_');
  const isCoM2 = version.startsWith('com2_');
  const isWarlord = version.startsWith('com2_warlord_');
  const sg = (subgroup || '').replace(/^_/, '');
  if (sg === 'MoM only') return isMoM;
  if (sg === 'CoM, CoM2 & Warlord') return isCoMorCoM2;
  if (sg === 'CoM2 & Warlord') return isCoM2;
  if (sg === 'Warlord only') return isWarlord;
  if (sg === 'Warlord') return isWarlord;
  if (sg === 'Renamed in Warlord') return isWarlord;
  return true;
}

// The single home for "does this def exist in this version". Both enchantments and ability tags
// are gated by their subgroup; a def with no subgroup, or a `_`-prefixed presentational one,
// resolves to "allowed everywhere", so only the few that name a version set are restricted.
// `updateTypeVisibility` applies this and tests/version-gating.spec.js asserts against it —
// re-deriving the rule in either place would let the two drift.
function abilityVersionGated(abil, version) {
  const subgroupOk = subgroupAllowedForVersion(abil.subgroup, version);
  const overrideOk = (abil.alsoVersions || []).some(v => version.startsWith(v));
  const exceptOk = !(abil.exceptVersions || []).some(v => version.startsWith(v));
  return !((subgroupOk || overrideOk) && exceptOk);
}

// Global-enchantment controls in the .combat-enchantments frame are hardcoded HTML (not
// driven by ABILITY_DEFS), so they need their own version gating. Each entry maps a control
// element id to the versions in which it's valid. Controls not listed here are valid in every
// version. When a control is hidden it's also reset (unchecked) so a hidden enchantment can't
// silently keep affecting the calculation.
function globalEnchantmentAllowedForVersion(elementId, version) {
  const isMoM = version === 'mom_1.31' || version === 'mom_cp_1.60.00';
  const isWarlord = version.startsWith('com2_warlord_');
  switch (elementId) {
    case 'trueLight': return isMoM || isWarlord; // removed in CoM 1 & 2
    case 'hurricane': return isWarlord;
    case 'poxHost':   return isWarlord;
    default:          return true;
  }
}

// Show/hide (and reset when hidden) the version-restricted controls in the global-enchantment
// frame. Safe to call repeatedly; invoked on version change, reset, and state restore.
function updateGlobalEnchantmentVisibility(version) {
  for (const id of ['trueLight', 'hurricane', 'poxHost']) {
    const el = document.getElementById(id);
    if (!el) continue;
    const wrapper = el.closest('.check-label') || el;
    const allowed = globalEnchantmentAllowedForVersion(id, version);
    wrapper.classList.toggle('version-hidden', !allowed);
    if (!allowed && el.checked) el.checked = false;
  }
}

// Which of the level/weapon/armor selects the engine disregards for the current unit
// (see deriveUnitStats): fantastic units lock all three — except Zombies' weapons and,
// in Warlord, level while Spirit Link is active — heroes lock level+weapon, and armor
// additionally doesn't exist in MoM versions.
function loadoutLockState(prefix) {
  const version = document.getElementById('gameVersion').value;
  const isMoM = version === 'mom_1.31' || version === 'mom_cp_1.60.00';
  const unitSel = document.getElementById(prefix + 'Unit');
  let isHero, isFantastic, isZombies = false;
  if (unitSel.value === 'custom') {
    const identity = readIdentityControls(prefix);
    isHero = identity.isHero;
    isFantastic = identity.baseFantastic;
    isZombies = identity.specialUnit === 'zombies';
  } else {
    const unit = (unitDatabases[version] || []).find(u => u.id === parseInt(unitSel.value));
    const identity = createRosterUnitIdentity(version, unit);
    isHero = identity.isHero;
    isFantastic = identity.baseFantastic;
    isZombies = identity.specialUnit === 'zombies';
  }
  const spiritLinkEl = document.getElementById(prefix + 'Abil_spiritLink');
  const spiritLink = version.startsWith('com2_warlord') && !!(spiritLinkEl && spiritLinkEl.checked);
  return {
    level: isHero || (isFantastic && !spiritLink),
    weapon: (isHero || isFantastic) && !isZombies,
    armor: isHero || isFantastic || isMoM,
    isMoM,
  };
}

// Single owner of the disabled + greyed-label styling for the three loadout selects,
// so all three rows grey out consistently. Values are deliberately NOT reset here
// (selection-time resets live in updateUnitLock / updateCustomLevelState) so state
// restores and presets never get clobbered — except MoM armor, where the control
// doesn't exist and a leftover orihalcon value would still reach the engine.
function updateLoadoutLocks(prefix) {
  const locks = loadoutLockState(prefix);
  for (const [field, locked] of [['Level', locks.level], ['Weapon', locks.weapon], ['Armor', locks.armor]]) {
    const sel = document.getElementById(prefix + field);
    const label = document.querySelector(`label[for="${prefix + field}"]`);
    sel.disabled = locked;
    if (label) label.classList.toggle('disabled-field', locked);
  }
  // Armor quality doesn't exist in MoM: hide the row entirely (and reset the value so
  // a leftover orihalcon never reaches the engine).
  const armorSel = document.getElementById(prefix + 'Armor');
  const armorLabel = document.querySelector(`label[for="${prefix}Armor"]`);
  armorSel.classList.toggle('version-hidden', locks.isMoM);
  if (armorLabel) armorLabel.classList.toggle('version-hidden', locks.isMoM);
  if (locks.isMoM) armorSel.value = 'normal';
}

function updateTypeVisibility() {
  ['aRtbType', 'bRtbType'].forEach(id => {
    const sel = document.getElementById(id);
    const input = sel.nextElementSibling;
    if (input) input.classList.toggle('disabled-field', sel.value === 'none');
  });

  const version = document.getElementById('gameVersion').value;
  const modern = version.startsWith('com2');
  document.querySelectorAll('.dos-special-attack').forEach(el => el.classList.toggle('version-hidden', modern));
  document.querySelectorAll('.modern-attack').forEach(el => el.classList.toggle('version-hidden', !modern));
  document.querySelectorAll('.modern-special').forEach(el => el.classList.toggle('version-hidden', !modern));
  updateModernSpecialDuplicates(modern);
  updateDosSpecialDuplicates(!modern);
  updateLoadoutLocks('a');
  updateLoadoutLocks('b');

  // Version restrictions on enchantments.
  function subgroupAllowed(subgroup) {
    return subgroupAllowedForVersion(subgroup, version);
  }

  function applyDisabled(el, disabled) {
    if (disabled) {
      if (el.tagName === 'SELECT') el.value = el.options[0].value;
      else if (el.type === 'checkbox') el.checked = false;
    }
    el.disabled = disabled;
  }

  for (const prefix of ['a', 'b']) {
    // A roster (non-custom) unit locks its panel: its innate ability controls become
    // read-only. We disable them so they get the same native disabled styling as the
    // version-gated controls below — but unlike version gating we must NOT clear their
    // value, since those checkboxes carry the unit's innate abilities for the calculation.
    const panelLocked = document.getElementById(prefix + 'Abilities').classList.contains('locked');
    for (const abil of abilityUiDefs()) {
      const el = document.getElementById(abilityControlId(prefix, abil));
      if (!el) continue;
      const versionGated = abilityVersionGated(abil, version);
      // Recorded on the item because updateAbilityVisibility must tell "impossible in this
      // version" (never shown) apart from "locked by a roster unit" (shown when the group's
      // toggle is on) — both of which merely set the control's disabled attribute.
      const gatedItem = el.closest('.abil-item');
      if (gatedItem) gatedItem.classList.toggle('abil-version-gated', versionGated);
      if (versionGated) {
        // Effect cannot exist in this version: disable and clear the value.
        applyDisabled(el, true);
      } else if (gatedItem && gatedItem.classList.contains('abil-identity-derived')) {
        // A named special-unit selector owns this derived value; keep it locked even though
        // the underlying enchantment exists in the current version.
        el.disabled = true;
      } else if (abil.source === 'ability') {
        // Innate ability of a roster unit: lock (value preserved). Enchantments stay
        // editable on roster units, so they are intentionally not locked here.
        el.disabled = panelLocked;
      } else {
        el.disabled = false;
      }
      // Keep a numcheck's on/off checkbox in lockstep with its number input (value preserved).
      const onChk = document.getElementById(abilityControlId(prefix, abil) + '_on');
      if (onChk) onChk.disabled = el.disabled;
    }
  }

  // Version restrictions on global combat enchantments. Disable (and clear) toggles
  // whose effect does not exist in the selected version, so they can't be set to a
  // no-op state. The allowed-versions rules live in globalEnchantmentAllowedForVersion.
  for (const id of ['trueLight', 'hurricane', 'poxHost']) {
    const gEl = document.getElementById(id);
    if (!gEl) continue;
    const allowed = globalEnchantmentAllowedForVersion(id, version);
    if (!allowed) gEl.checked = false;
    gEl.disabled = !allowed;
    const gLabel = gEl.closest('.check-label');
    if (gLabel) gLabel.classList.toggle('disabled-field', !allowed);
  }

  const aStats = readUnitStats('a');
  const hasRanged = aStats.modernAttacks
    ? !!(aStats.modernAttacks.ranged && aStats.modernAttacks.ranged.strength > 0)
    : aStats.rangedType !== 'none' && aStats.rtb > 0;
  const rangedCheckLabel = document.getElementById('rangedCheckLabel');
  const rangedCheck = document.getElementById('rangedCheck');
  const rangedDist = document.getElementById('rangedDist');
  rangedCheckLabel.classList.toggle('disabled-field', !hasRanged);
  rangedCheck.disabled = !hasRanged;
  if (!hasRanged) rangedCheck.checked = false;

  document.getElementById('rangedDistLabel').classList.remove('disabled-field');
  rangedDist.classList.remove('disabled-field');
  rangedDist.disabled = false;
}

function refreshAbilityFieldVisibility() {
  updateSpecialUnitDerivedEffects('a');
  updateSpecialUnitDerivedEffects('b');
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

// Restore a blob from collectState(): re-expand the default-diff against the blob version's
// defaults, then apply the full map. Tolerant of full (undiffed) blobs too — legacy
// localStorage and older share links merge cleanly since their ids already cover everything.
function applyState(blob) {
  if (!blob || ![1, PAGE_STATE_VERSION].includes(blob.v)) {
    throw new TypeError('Unsupported page-state version');
  }
  const version = (blob.ids && normalizeGameVersion(blob.ids.gameVersion))
    || loadPersistedGameVersion() || DEFAULT_GAME_VERSION;
  const merged = { ...getDefaultIds(version), ...(blob.ids || {}), gameVersion: version };
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

// An item is disabled when its primary control carries the disabled attribute. For every
// item type the first control in DOM order (bool checkbox, numcheck on-checkbox, select, or
// number input) is the one we set, and numcheck pairs are disabled in lockstep.
function isAbilityDisabled(item) {
  const ctrl = item.querySelector('input, select');
  return !!(ctrl && ctrl.disabled);
}

// Update which abilities are shown based on active state.
// Hides inactive items, group headers, and empty grid containers when in hide-inactive mode.
// An item is on screen only if neither hiding rule applies: abil-hidden (inactive/disabled,
// owned by updateAbilityVisibility) or abil-duplicate (shown on the stat card instead).
function isAbilityItemVisible(item) {
  return !item.classList.contains('abil-hidden') && !item.classList.contains('abil-duplicate');
}

function updateAbilityVisibility() {
  for (const prefix of ['a', 'b']) {
    const section = document.getElementById(prefix + 'Abilities').closest('.abilities-section');
    if (!section) continue;
    const items = section.querySelectorAll('.abil-item');

    items.forEach(item => {
      const active = isAbilityActive(item);
      const focused = item.contains(document.activeElement);
      const alwaysVisible = item.dataset.alwaysVisible === 'true';
      // An effect the selected version cannot have is never shown; neither toggle reveals it.
      // Everything else follows its own group's toggle, so "show all" on Abilities reveals a
      // roster unit's greyed-out, locked remainder as well as its inactive ones.
      const gated = item.classList.contains('abil-version-gated');
      const hiding = isGroupHiding(section, item.dataset.abilGroup || '');
      item.classList.toggle('abil-hidden', gated || (hiding && !active && !focused && !alwaysVisible));
    });

    // Hide subgroup headers when all their children are hidden
    section.querySelectorAll('.abil-subgroup-header').forEach(header => {
      const group = header.dataset.abilGroup;
      const subgroup = header.dataset.abilSubgroup;
      const subgroupItems = section.querySelectorAll(
        `.abil-item[data-abil-group="${group}"][data-abil-subgroup="${subgroup}"]`
      );
      const anyVisible = [...subgroupItems].some(isAbilityItemVisible);
      header.classList.toggle('abil-hidden', !anyVisible);
    });

    // Group headers always render: each carries its group's toggle, and its label text is
    // how the card's two sections are named. An empty group looks no different.
    section.querySelectorAll('.abil-group-header').forEach(header => {
      header.classList.remove('abil-hidden');
      const btn = header.querySelector('.toggle-abil-btn');
      if (btn) btn.textContent = isGroupHiding(section, header.dataset.abilGroup) ? 'Show all' : 'Hide inactive';
    });

    // Hide empty grid containers
    section.querySelectorAll('.abil-grid').forEach(grid => {
      const items = grid.querySelectorAll('.abil-item');
      let anyVisible = false;
      items.forEach(item => {
        if (isAbilityItemVisible(item)) anyVisible = true;
      });
      grid.classList.toggle('abil-hidden', !anyVisible);
    });

  }
}

// Toggle one group's inactive items, in one panel. Each panel keeps its own state per
// group, so the attacker and defender cards can be expanded independently.
function toggleGroupInactive(group, section) {
  if (!section || !group) return;
  section.classList.toggle(groupHidingClass(group));
  updateAbilityVisibility();
}

// --- Matrix property state ---
// Editable lists shown in the matrix view's Attacker, Defender, and Global boxes.
// Each list owns its own state independent of the main calculator panels.

const MATRIX_LEVEL_OPTIONS  = [['normal','Normal'],['regular','Regular'],['veteran','Veteran'],['elite','Elite'],['ultra_elite','Ultra Elite'],['champion','Champion']];
const MATRIX_WEAPON_OPTIONS = [['normal','Normal'],['magic','Magic'],['mithril','Mithril'],['adamantium','Adamantium']];
const MATRIX_ARMOR_OPTIONS  = [['normal','Normal'],['orihalcon','Orihalcon']];

const MATRIX_GLOBAL_DEFS = [
  { key: 'trueLight',   label: 'True Light',    type: 'bool' },
  { key: 'darkness',    label: 'Darkness',      type: 'bool' },
  { key: 'wallOfFire',  label: 'Wall of Fire',  type: 'bool' },
  { key: 'warpReality', label: 'Warp Reality',  type: 'bool' },
  { key: 'hurricane',   label: 'Hurricane',     type: 'bool' },
  { key: 'poxHost',     label: 'Pox host present', type: 'bool' },
  { key: 'chaosSurge',  label: 'Chaos Surge enchantments', type: 'num', min: 0, max: 99 },
  { key: 'cityWalls',   label: 'City walls', type: 'select',
    options: [['none','None'],['1','+1 def'],['3','+3 def']] },
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
    return {
      a: Array.isArray(parsed.a) ? parsed.a : [],
      b: Array.isArray(parsed.b) ? parsed.b : [],
      global: Array.isArray(parsed.global) ? parsed.global : [],
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
  const abil = abilityUiDefs().find(a => a.source === 'enchantment' && a.uiKey === key);
  if (!abil) return null;
  return {
    key: abil.uiKey,
    label: abilityDisplayLabel(abil),
    type: abil.type,
    options: abil.options,
    abil,
  };
}

// All selectable properties for a given box (used by the search dropdown).
function matrixPropertyCandidates(box) {
  if (box === 'global') {
    const isRanged = activeMatrixMode === 'ranged';
    return MATRIX_GLOBAL_DEFS
      .filter(d => !d.rangedOnly || isRanged)
      .map(d => ({ key: d.key, label: d.label }));
  }
  const version = document.getElementById('gameVersion').value;
  const list = [
    { key: 'level',  label: 'Unit level' },
    { key: 'weapon', label: 'Weapon type' },
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
    if (levelEl  && levelEl.value  !== 'normal') rows[prefix].push({ key: 'level',  enabled: true, value: levelEl.value });
    if (weaponEl && weaponEl.value !== 'normal') rows[prefix].push({ key: 'weapon', enabled: true, value: weaponEl.value });
    if (armorEl  && armorEl.value  !== 'normal') rows[prefix].push({ key: 'armor',  enabled: true, value: armorEl.value });
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

// Read the effective value of a per-side level/weapon/armor.
function matrixSideSetting(prefix, key) {
  const row = matrixPropertyRow(prefix, key);
  if (!row || !row.enabled) return 'normal';
  return row.value || 'normal';
}

// Read the effective value of a global property.
function matrixGlobalValue(key) {
  const def = MATRIX_GLOBAL_DEFS.find(d => d.key === key);
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

// Build the same shape as activeNonInnateUnitEnchantments, but driven by matrix state.
function matrixAppliedEnchantments(prefix) {
  const result = {};
  const version = document.getElementById('gameVersion').value;
  for (const abil of abilityUiDefs()) {
    if (abil.source !== 'enchantment') continue;
    if (!subgroupAllowedForVersion(abil.subgroup, version)) continue;
    const row = matrixPropertyRow(prefix, abil.uiKey);
    const calcKey = abil.calcKey || abil.key;
    if (!row || !row.enabled) continue;
    if (abil.type === 'bool' && row.value) {
      result[calcKey] = true;
    } else if (abil.type === 'select') {
      const defaultValue = abil.options && abil.options[0] ? abil.options[0][0] : 'none';
      if (row.value !== defaultValue) result[calcKey] = row.value;
    } else if (abil.type === 'numcheck' && row.value != null) {
      result[calcKey] = row.value;
    } else if (abil.type === 'num' && row.value !== 0) {
      result[calcKey] = row.value;
    }
  }
  return result;
}

// True if the matrix state has the named enchantment row active for the given side.
function matrixHasActiveEnchantment(prefix, enchKey) {
  // enchKey here is the enchantment's `key` (not uiKey).
  const abil = abilityUiDefs().find(a => a.source === 'enchantment' && a.key === enchKey);
  if (!abil) return false;
  const row = matrixPropertyRow(prefix, abil.uiKey);
  if (!row || !row.enabled) return false;
  if (abil.type === 'bool') return !!row.value;
  if (abil.type === 'select') {
    const defaultValue = abil.options && abil.options[0] ? abil.options[0][0] : 'none';
    return row.value !== defaultValue;
  }
  if (abil.type === 'numcheck') return row.value != null;
  return (row.value || 0) !== 0;
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
    if (def.abil && !subgroupAllowedForVersion(def.abil.subgroup, version)) return false;
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
  ensureMatrixPropertyStateLoaded();
  renderAllMatrixPropLists();
  const attackerEnchantments = matrixAppliedEnchantments('a');
  const defenderEnchantments = matrixAppliedEnchantments('b');
  const wrap = document.getElementById('matrixTableWrap');
  matrixLoadingCount += 1;
  if (wrap) wrap.classList.add('is-loading');
  try {
    matrixCache = await buildMatrixCache(attackerEnchantments, defenderEnchantments, activeMatrixMode);
    renderMatrixTable();
  } finally {
    matrixLoadingCount -= 1;
    if (wrap && matrixLoadingCount <= 0) {
      matrixLoadingCount = 0;
      wrap.classList.remove('is-loading');
    }
  }
}

let matrixLoadingCount = 0;

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

// Caster.exe keeps these attacks in separate fields. The visible card still uses its
// legacy RTB projection until R4.1, but carry the lossless records through state now so
// derivation and the later resolver never need to recover a discarded attack.
function predefinedModernAttacks(unit) {
  const parse = value => Math.max(0, parseInt(value, 10) || 0);
  const ranged = parse(unit.ranged);
  const thrown = parse(unit.thrown);
  const fireBreath = parse(unit.fire_breath);
  const lightningBreath = parse(unit.lightning_breath);
  if (!ranged && !thrown && !fireBreath && !lightningBreath) return null;
  return {
    ranged: ranged ? { strength: ranged, type: predefinedUnitRtbType({ ranged_type: unit.ranged_type }) } : null,
    thrown: thrown ? { strength: thrown, type: 'thrown' } : null,
    fireBreath: fireBreath ? { strength: fireBreath, type: 'fire' } : null,
    lightningBreath: lightningBreath ? { strength: lightningBreath, type: 'lightning' } : null,
  };
}

function matrixRealmClassForUnitType(unitType) {
  const realm = String(unitType || '').replace(/^fantastic_/, '');
  return ['life', 'death', 'chaos', 'nature', 'sorcery', 'arcane'].includes(realm) ? `realm-${realm}` : '';
}

function buildMatrixUnitStats(prefix, unit, appliedEnchantments, matrixMode) {
  const version = document.getElementById('gameVersion').value;
  const level  = matrixSideSetting(prefix, 'level');
  const weapon = matrixSideSetting(prefix, 'weapon');
  const armor  = matrixSideSetting(prefix, 'armor');
  const abilities = { ...parseAbilitiesFromUnit(unit), ...appliedEnchantments };
  const enemyPrefix = prefix === 'a' ? 'b' : 'a';
  const rangedMatrixAttacker = matrixMode === 'ranged' && prefix === 'a';
  return deriveUnitStats({
    prefix,
    version,
    abilities,
    identity: createRosterUnitIdentity(version, unit),
    name: unit.name,
    level,
    weapon,
    armor,
    rtbType: predefinedUnitRtbType(unit),
    figs: unit.figures || 1,
    atk: unit.melee,
    rtb: predefinedUnitRtb(unit),
    modernAttacks: predefinedModernAttacks(unit),
    def: unit.defense,
    res: unit.resist,
    hp: unit.hp,
    dmg: 0,
    toHitMod: unit.to_hit || 0,
    toHitRtbMod: unit.to_hit || 0,
    toBlkMod: document.getElementById(prefix + 'ToBlkMod').value,
    cityWalls: matrixGlobalValue('cityWalls'),
    nodeAura: matrixGlobalValue('nodeAura'),
    wallOfFire: !!matrixGlobalValue('wallOfFire'),
    trueLight: !!matrixGlobalValue('trueLight'),
    darkness: !!matrixGlobalValue('darkness'),
    enemyEternalNight: matrixHasActiveEnchantment(enemyPrefix, 'eternalNight'),
    enemyEyeOfHeaven: matrixHasActiveEnchantment(enemyPrefix, 'eyeOfHeaven'),
    chaosSurge: matrixGlobalValue('chaosSurge'),
    rangedCheck: rangedMatrixAttacker,
    rangedDist: rangedMatrixAttacker ? matrixGlobalValue('rangedDist') : 1,
    warpReality: !!matrixGlobalValue('warpReality'),
    hurricane: !!matrixGlobalValue('hurricane'),
    poxHost: !!matrixGlobalValue('poxHost'),
    generic: unit.category === 'Generic',
  });
}

function buildMatrixDefenderStats(unit, appliedEnchantments, matrixMode) {
  return buildMatrixUnitStats('b', unit, appliedEnchantments, matrixMode);
}

function buildMatrixAttackerStats(unit, appliedEnchantments, matrixMode) {
  return buildMatrixUnitStats('a', unit, appliedEnchantments, matrixMode);
}

// Read stats for the user-customized custom unit row in the matrix.
// Innate abilities and base numeric stats come from the main panel; level,
// weapon, armor, enchantments, and global options come from matrix state.
function readMatrixCustomUnitStats(prefix, matrixMode) {
  const el = id => document.getElementById(id);
  const enemyPrefix = prefix === 'a' ? 'b' : 'a';
  const rangedMatrixAttacker = matrixMode === 'ranged' && prefix === 'a';

  // Start with innate (source='ability') values from the DOM.
  const abilities = {};
  for (const abil of abilityUiDefs()) {
    if (abil.source === 'enchantment') continue;
    const val = getAbilityControlValue(prefix, abil);
    if (val === undefined) continue;
    const calcKey = abil.calcKey || abil.key;
    abilities[calcKey] = mergedAbilityValue(abil, abilities[calcKey], val);
  }
  // The DOS block replaces the ability-row values for its consumers, same as on the main path.
  Object.assign(abilities, dosSpecialValues(prefix, false));
  // Merge matrix-state enchantments on top.
  const stateEnch = matrixAppliedEnchantments(prefix);
  for (const k of Object.keys(stateEnch)) {
    abilities[k] = stateEnch[k];
  }

  const version = el('gameVersion').value;
  const identity = unitIdentityForDerivation(prefix, version);
  return deriveUnitStats({
    prefix,
    version,
    abilities,
    identity,
    name: (unitIdentity[prefix] || {}).name,
    level: matrixSideSetting(prefix, 'level'),
    weapon: matrixSideSetting(prefix, 'weapon'),
    armor: matrixSideSetting(prefix, 'armor'),
    rtbType: el(prefix + 'RtbType').value,
    figs: el(prefix + 'Figs').value,
    atk: el(prefix + 'Atk').value,
    rtb: el(prefix + 'Rtb').value,
    modernAttacks: modernCardAttacks(prefix),
    def: el(prefix + 'Def').value,
    res: el(prefix + 'Res').value,
    hp: el(prefix + 'HP').value,
    dmg: el(prefix + 'Dmg').value,
    toHitMod: el(prefix + 'ToHitMod').value,
    toHitRtbMod: el(prefix + 'ToHitRtbMod').value,
    toBlkMod: el(prefix + 'ToBlkMod').value,
    cityWalls: matrixGlobalValue('cityWalls'),
    nodeAura: matrixGlobalValue('nodeAura'),
    wallOfFire: !!matrixGlobalValue('wallOfFire'),
    trueLight: !!matrixGlobalValue('trueLight'),
    darkness: !!matrixGlobalValue('darkness'),
    enemyEternalNight: matrixHasActiveEnchantment(enemyPrefix, 'eternalNight'),
    enemyEyeOfHeaven: matrixHasActiveEnchantment(enemyPrefix, 'eyeOfHeaven'),
    chaosSurge: matrixGlobalValue('chaosSurge'),
    rangedCheck: rangedMatrixAttacker,
    rangedDist: rangedMatrixAttacker ? matrixGlobalValue('rangedDist') : 1,
    warpReality: !!matrixGlobalValue('warpReality'),
    hurricane: !!matrixGlobalValue('hurricane'),
    poxHost: !!matrixGlobalValue('poxHost'),
    generic: !!(unitBaseStats[prefix] && unitBaseStats[prefix].generic),
  });
}

function selectedMatrixUnitRow(prefix, matrixMode) {
  const stats = readMatrixCustomUnitStats(prefix, matrixMode);
  const label = selectedUnitLabel(prefix);
  const classTag = stats.unitType === 'hero' ? 'Hero'
                 : String(stats.unitType || '').startsWith('fantastic_') ? 'Fantastic'
                 : 'Normal';
  return {
    label,
    matchText: [label, classTag].filter(Boolean).join(' '),
    realmClass: matrixRealmClassForUnitType(stats.unitType),
    unitId: null,
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
      const stats = prefix === 'a'
        ? buildMatrixAttackerStats(unit, appliedEnchantments, matrixMode)
        : buildMatrixDefenderStats(unit, appliedEnchantments, matrixMode);
      const classTag = stats.isHero ? 'Hero'
                     : stats.identity.fantastic ? 'Fantastic'
                     : 'Normal';
      return {
        label: unit.name,
        matchText: [unit.name, unit.category, unit.race, classTag].filter(Boolean).join(' '),
        realmClass: matrixRealmClassForUnitType(stats.unitType),
        unitId: String(unit.id),
        stats,
      };
    });
}

let matrixCache = null;
let activeMatrixMode = 'melee';
let matrixWorkerBlobUrl = null;
let closeMatrixModal = null;

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
  if (Number.isFinite(ratio)) return ratio.toPrecision(3);
  return '1e99';
}

function csvEscape(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function hasMatrixRangedAttack(info) {
  if (!info || !info.stats) return false;
  return info.stats.modernAttacks
    ? !!(info.stats.modernAttacks.ranged && info.stats.modernAttacks.ranged.strength > 0)
    : info.stats.rangedType !== 'none' && info.stats.rtb > 0;
}

async function buildMatrixCache(attackerEnchantments, defenderEnchantments, matrixMode) {
  const version = document.getElementById('gameVersion').value;
  const wallOfFire = !!matrixGlobalValue('wallOfFire');
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

  // No attackers (e.g. a ranged matrix where nothing has a ranged attack): with zero
  // workers the completion promise below would never settle, hanging the modal.
  if (!attackers.length) {
    return {
      allAttackerIndexes: [],
      allDefenderIndexes: allDefenders.map((_, i) => i),
      rows: [],
      defenders,
      mode: matrixMode,
    };
  }

  if (!matrixWorkerBlobUrl) {
    const scriptAbsUrl = (name) =>
      [...document.querySelectorAll('script[src]')].find(s => s.src.endsWith(name))?.src;
    const engineUrl = scriptAbsUrl('engine.js');
    const stepsUrl = scriptAbsUrl('steps.js');
    const combatUrl = scriptAbsUrl('combat.js');
    const src = `importScripts(${JSON.stringify(engineUrl)}, ${JSON.stringify(stepsUrl)}, ${JSON.stringify(combatUrl)});\n${MATRIX_WORKER_HANDLER}`;
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
      parts.push(`<td class="matrix-cell" data-atk-idx="${atkRow.attackerIndex}" data-def-idx="${defCol.defenderIndex}" style="background-color:${color.background};color:${color.textColor}">${escHtmlAttr(formatMatrixRatioValue(ratio, matrixCache.mode))}</td>`);
    }
    parts.push('</tr>');
  }
  parts.push('</tbody></table>');
  wrap.innerHTML = parts.join('');

  const tableEl = wrap.querySelector('.matrix-table');
  if (tableEl) {
    tableEl.addEventListener('click', e => {
      const cell = e.target.closest('td.matrix-cell');
      if (!cell) return;
      const atkIdx = parseInt(cell.dataset.atkIdx, 10);
      const defIdx = parseInt(cell.dataset.defIdx, 10);
      if (Number.isNaN(atkIdx) || Number.isNaN(defIdx)) return;
      applyMatrixCellToMain(atkIdx, defIdx);
    });
  }
}

function applyMatrixCellToMain(attackerIndex, defenderIndex) {
  if (!matrixCache) return;
  const attackerInfo = matrixCache.rows[attackerIndex]?.info;
  const defenderInfo = matrixCache.defenders[defenderIndex];
  if (!attackerInfo || !defenderInfo) return;

  const matrixMode = matrixCache.mode;

  for (const [prefix, info] of [['a', attackerInfo], ['b', defenderInfo]]) {
    if (info.unitId != null) {
      const hiddenEl = document.getElementById(prefix + 'Unit');
      hiddenEl.value = info.unitId;
      syncUnitDisplay(prefix);
      updateUnitLock(prefix);
    }
    const level  = matrixSideSetting(prefix, 'level');
    const weapon = matrixSideSetting(prefix, 'weapon');
    const armor  = matrixSideSetting(prefix, 'armor');
    const levelEl  = document.getElementById(prefix + 'Level');
    const weaponEl = document.getElementById(prefix + 'Weapon');
    const armorEl  = document.getElementById(prefix + 'Armor');
    if (levelEl  && !levelEl.disabled)  levelEl.value  = level;
    if (weaponEl) weaponEl.value = weapon;
    if (armorEl)  armorEl.value  = armor;
    if (unitBaseStats[prefix]) resetCardToRosterBase(prefix);

    clearAbilities(prefix, 'enchantment');
    applyAbilities(prefix, matrixAppliedEnchantments(prefix), 'enchantment');
  }

  const isRanged = matrixMode === 'ranged';
  const rangedCheckEl = document.getElementById('rangedCheck');
  if (rangedCheckEl) rangedCheckEl.checked = isRanged;
  const rangedDistEl = document.getElementById('rangedDist');
  if (rangedDistEl) rangedDistEl.value = isRanged ? matrixGlobalValue('rangedDist') : 1;

  document.getElementById('cityWalls').value  = matrixGlobalValue('cityWalls')  || 'none';
  document.getElementById('nodeAura').value   = matrixGlobalValue('nodeAura')   || 'none';
  document.getElementById('trueLight').checked   = !!matrixGlobalValue('trueLight');
  document.getElementById('darkness').checked    = !!matrixGlobalValue('darkness');
  document.getElementById('wallOfFire').checked  = !!matrixGlobalValue('wallOfFire');
  document.getElementById('warpReality').checked = !!matrixGlobalValue('warpReality');
  document.getElementById('hurricane').checked   = !!matrixGlobalValue('hurricane');
  document.getElementById('poxHost').checked     = !!matrixGlobalValue('poxHost');
  document.getElementById('chaosSurge').value    = matrixGlobalValue('chaosSurge') || 0;

  refreshAbilityFieldVisibility();
  updateTypeVisibility();
  updateAbilityVisibility();
  recalculate();

  if (typeof closeMatrixModal === 'function') closeMatrixModal();
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
    saveMatrixFilters();
  }
  swapAttackerDefender();
  const tmpRows = matrixPropertyState.a;
  matrixPropertyState.a = matrixPropertyState.b;
  matrixPropertyState.b = tmpRows;
  saveMatrixPropertyState();
  updateMatrixDrawerBadges();
  await renderMatrixSnapshot();
}

// localStorage key remembering whether the combined Settings & Filters panel
// was last left open. First visit falls back to a screen-size default.
const MATRIX_SIDE_OPEN_KEY = 'matrixSidePanelOpen_v1';

function matrixSideDefaultOpen() {
  try {
    const raw = localStorage.getItem(MATRIX_SIDE_OPEN_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch (e) { /* storage disabled */ }
  // Wide screens have room to keep the panel open beside the matrix.
  return window.innerWidth >= 1000;
}

// Wire the combined left-edge Settings & Filters panel. It pushes the matrix
// (a real flex item) rather than overlaying it, and its open/closed state
// persists across sessions.
function initMatrixSidePanel() {
  const panel = document.getElementById('matrixSidePanel');
  const toggle = document.getElementById('matrixSideToggle');
  if (!panel || !toggle) return;

  const setOpen = (open, persist) => {
    panel.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (persist) {
      try { localStorage.setItem(MATRIX_SIDE_OPEN_KEY, open ? '1' : '0'); } catch (e) { /* ignore */ }
    }
  };

  setOpen(matrixSideDefaultOpen(), false);
  toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open'), true));
}

// Scroll gestures that start on the matrix's sticky header cells (top row or
// name column) move the modal's page scroller vertically instead of the table,
// so the header/footer content stays reachable when the matrix fills the
// screen. Horizontal deltas still pan the table. Listeners are delegated on
// the wrap since the table is re-rendered on every snapshot.
function initMatrixHeaderScrollRouting() {
  const wrap = document.getElementById('matrixTableWrap');
  const scroller = document.querySelector('#matrixModal .modal-scroll');
  if (!wrap || !scroller) return;
  const onHeader = target =>
    target instanceof Element && !!target.closest('.matrix-table thead th, .matrix-table tbody th');

  wrap.addEventListener('wheel', e => {
    if (!onHeader(e.target)) return;
    e.preventDefault();
    scroller.scrollTop += e.deltaY;
    wrap.scrollLeft += e.deltaX;
  }, { passive: false });

  // Touch drags: header cells have touch-action:none, so native panning never
  // starts there and these handlers own the gesture.
  let lastTouch = null;
  wrap.addEventListener('touchstart', e => {
    lastTouch = (e.touches.length === 1 && onHeader(e.target))
      ? { x: e.touches[0].clientX, y: e.touches[0].clientY }
      : null;
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (!lastTouch || e.touches.length !== 1) return;
    e.preventDefault();
    const t = e.touches[0];
    scroller.scrollTop += lastTouch.y - t.clientY;
    wrap.scrollLeft += lastTouch.x - t.clientX;
    lastTouch = { x: t.clientX, y: t.clientY };
  }, { passive: false });
  wrap.addEventListener('touchend', () => { lastTouch = null; });
  wrap.addEventListener('touchcancel', () => { lastTouch = null; });
}

const MATRIX_FILTER_STORAGE_KEY = 'matrixNameFilters_v1';

function loadPersistedMatrixFilters() {
  try {
    const raw = localStorage.getItem(MATRIX_FILTER_STORAGE_KEY);
    if (!raw) return { attacker: '', defender: '' };
    const parsed = JSON.parse(raw);
    return {
      attacker: typeof parsed.attacker === 'string' ? parsed.attacker : '',
      defender: typeof parsed.defender === 'string' ? parsed.defender : '',
    };
  } catch (err) {
    return { attacker: '', defender: '' };
  }
}

function saveMatrixFilters() {
  const attackerEl = document.getElementById('matrixAttackerNameFilter');
  const defenderEl = document.getElementById('matrixDefenderNameFilter');
  try {
    localStorage.setItem(MATRIX_FILTER_STORAGE_KEY, JSON.stringify({
      attacker: attackerEl ? attackerEl.value : '',
      defender: defenderEl ? defenderEl.value : '',
    }));
  } catch (err) { /* ignore */ }
}

function resetMeleeMatrixControls() {
  const persisted = loadPersistedMatrixFilters();
  const initial = { matrixAttackerNameFilter: persisted.attacker, matrixDefenderNameFilter: persisted.defender };
  ['matrixAttackerNameFilter', 'matrixDefenderNameFilter'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = initial[id];
    el.defaultValue = initial[id];
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
        updateMatrixDrawerBadges();
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
  closeMatrixModal = close;

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
    el.addEventListener('input', () => { saveMatrixFilters(); updateMatrixDrawerBadges(); scheduleFilterRender(); });
  });
  initMatrixSidePanel();
  initMatrixHeaderScrollRouting();
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
buildModernSpecialCard('a');
buildModernSpecialCard('b');
buildDosSpecialCard('a');
buildDosSpecialCard('b');
initMatrixModal();
initMatrixPropCombobox('a');
initMatrixPropCombobox('b');
initMatrixPropCombobox('global');

// Independent identity controls -> update the custom source record and loadout availability.
['a', 'b'].forEach(prefix => {
  for (const field of ['BaseHero', 'BaseFantastic', 'BaseRace', 'SpecialUnit']) {
    const control = document.getElementById(prefix + field);
    if (!control) continue;
    control.addEventListener('change', () => {
      const unitSel = document.getElementById(prefix + 'Unit');
      if (unitSel && unitSel.value === 'custom') {
        setCustomUnitIdentity(prefix, document.getElementById('gameVersion').value, null, true);
      }
      updateSpecialUnitDerivedEffects(prefix);
      refreshAbilityFieldVisibility();
      updateCustomLevelState(prefix);
      recalculate();
    });
  }
});

document.getElementById('gameVersion').addEventListener('change', onVersionChange);
document.getElementById('swapBtn').addEventListener('click', swapAttackerDefender);
document.getElementById('resetBtn').addEventListener('click', () => {
  try {
    localStorage.removeItem(PAGE_STATE_KEY);
    localStorage.removeItem(LEGACY_PAGE_STATE_KEY);
    localStorage.removeItem(GAME_VERSION_STORAGE_KEY);
    localStorage.removeItem(MATRIX_FILTER_STORAGE_KEY);
  } catch (err) { /* ignore */ }
  const attackerFilter = document.getElementById('matrixAttackerNameFilter');
  const defenderFilter = document.getElementById('matrixDefenderNameFilter');
  if (attackerFilter) attackerFilter.value = '';
  if (defenderFilter) defenderFilter.value = '';
  resetCalculatorState();
});
document.getElementById('copyLinkBtn').addEventListener('click', () => {
  const btn = document.getElementById('copyLinkBtn');
  // Build the share URL as a string and copy that — we deliberately don't touch
  // location.hash. Leaving our own address bar clean avoids a reload reverting to this
  // snapshot (the URL would otherwise win over the user's later localStorage edits) and
  // keeps the copy action from racing the hashchange importer below.
  // Derive the base from location.href (minus any existing hash) rather than
  // origin + pathname: under file:// the origin is the literal string "null", which
  // would yield a broken "null/C:/...#s=..." link. href is correct for both http:// and
  // file://. Note: a file:// link only reopens on a machine with the same local path.
  const base = location.href.replace(/#.*$/, '');
  const url = base + '#s=' + lzEncode(JSON.stringify(collectState()));
  const original = btn.textContent;
  const flash = msg => {
    btn.textContent = msg;
    setTimeout(() => { btn.textContent = original; }, 1500);
  };
  // Fallback for non-secure contexts (e.g. file://) where navigator.clipboard is absent.
  const fallbackCopy = () => {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => flash('Copied to clipboard!'))
      .catch(() => flash(fallbackCopy() ? 'Copied to clipboard!' : 'Copy failed'));
  } else {
    flash(fallbackCopy() ? 'Copied to clipboard!' : 'Copy failed');
  }
});
// A #s= link pasted into an already-open tab is a same-document navigation: the browser
// doesn't reload, so init never re-runs. Apply it live here instead. The copy button never
// writes location.hash, so every hashchange here is a genuine incoming navigation.
window.addEventListener('hashchange', importHashState);
// Delegated: the group toggles are built by buildAbilitiesUI, after this runs.
document.addEventListener('click', e => {
  const btn = e.target.closest('.toggle-abil-btn');
  if (btn) toggleGroupInactive(btn.dataset.abilGroup, btn.closest('.abilities-section'));
});
document.getElementById('aUnit').addEventListener('change', () => {
  updateUnitLock('a');
  refreshAbilityFieldVisibility();
  recalculate();
});
document.getElementById('bUnit').addEventListener('change', () => {
  updateUnitLock('b');
  refreshAbilityFieldVisibility();
  recalculate();
});
initUnitCombobox('a');
initUnitCombobox('b');

document.getElementById('aLevel').addEventListener('change', () => {
  resetCardToRosterBase('a');
  refreshAbilityFieldVisibility();
  recalculate();
});
document.getElementById('bLevel').addEventListener('change', () => {
  resetCardToRosterBase('b');
  refreshAbilityFieldVisibility();
  recalculate();
});

// Global input/change handler for all fields. Controls with dedicated handlers above
// (which already end in a recalc) and the transient search boxes are excluded so a
// single interaction doesn't recalculate twice (or at all, for the search filters).
const GLOBAL_RECALC_EXCLUDE = new Set([
  'gameVersion', 'aUnit', 'bUnit', 'aLevel', 'bLevel',
  'presetSearch', 'aUnitSearch', 'bUnitSearch',
  'aBaseHero', 'aBaseFantastic', 'aBaseRace', 'aSpecialUnit',
  'bBaseHero', 'bBaseFantastic', 'bBaseRace', 'bSpecialUnit',
]);
document.querySelectorAll('input, select').forEach(el => {
  if (GLOBAL_RECALC_EXCLUDE.has(el.id) || el.id.startsWith('matrix')) return;
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

// Generate preset buttons as a flat, filterable list
(function buildPresetButtons() {
  const container = document.getElementById('presetButtons');
  const searchEl = document.getElementById('presetSearch');

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

  // Map ability key -> human label, for active-ability matching.
  const abilityLabelByKey = {};
  for (const def of ABILITY_DEFS) abilityLabelByKey[def.key] = def.label;

  // Friendly tokens to append to the haystack for a given version id.
  function versionTokens(v) {
    if (!v) return '';
    const tokens = [v];
    if (v.startsWith('mom_')) tokens.push('mom');
    if (v.startsWith('com_')) tokens.push('com', 'com1');
    if (v.startsWith('com2_warlord_')) tokens.push('com2', 'warlord');
    else if (v.startsWith('com2_')) tokens.push('com2');
    if (v.startsWith('mom_cp_')) tokens.push('cp', 'community patch');
    return tokens.join(' ');
  }

  function activeAbilityLabels(abil) {
    if (!abil || typeof abil !== 'object') return '';
    const out = [];
    for (const k of Object.keys(abil)) {
      const v = abil[k];
      if (!v || v === 'none') continue;
      const label = abilityLabelByKey[k];
      if (label) out.push(label);
    }
    return out.join(' ');
  }

  function combatStateTokens(preset) {
    const out = [];
    if (preset.rangedCheck) out.push('ranged');
    if (preset.cityWalls && preset.cityWalls !== 'none') {
      out.push('city walls', preset.cityWalls);
    }
    if (preset.nodeAura && preset.nodeAura !== 'none') {
      out.push('node aura', preset.nodeAura);
    }
    if (preset.trueLight) out.push('true light');
    if (preset.darkness) out.push('darkness');
    return out.join(' ');
  }

  // Flat index of every preset reachable from TEST_TREE.
  const presetIndex = [];

  for (const group of TEST_TREE) {
    for (const sub of group.subs) {
      for (const key of sub.keys) {
        if (group.version) PRESET_VERSIONS[key] = group.version;
        const preset = PRESETS[key];
        if (!preset) continue;
        const btn = makeButton(key);
        if (!btn) continue;
        const resolvedVersion = preset.version || PRESET_VERSIONS[key] || '';
        const haystack = [
          key,
          preset.desc || '',
          group.name,
          sub.name,
          versionTokens(resolvedVersion),
          activeAbilityLabels(preset.a && preset.a.abilities),
          activeAbilityLabels(preset.b && preset.b.abilities),
          combatStateTokens(preset),
        ].join(' ').toLowerCase();
        container.appendChild(btn);
        presetIndex.push({ key, button: btn, haystack });
      }
    }
  }

  function applyFilter() {
    const q = searchEl.value.toLowerCase();
    const tokens = q.split(',').map(t => t.trim()).filter(Boolean);
    for (const { button, haystack } of presetIndex) {
      const visible = tokens.every(t => haystack.includes(t));
      button.style.display = visible ? '' : 'none';
    }
  }

  if (searchEl) searchEl.addEventListener('input', applyFilter);
})();

// Initial load
initStateFromSources();

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
    // Only accept a candidate if nothing else (an overlay, drawer, etc.) is covering it.
    const tooltipEls = Array.from(document.querySelectorAll('[data-tooltip]'));
    for (let i = tooltipEls.length - 1; i >= 0; i--) {
      const candidate = tooltipEls[i];
      const rect = candidate.getBoundingClientRect();
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        // Accept when nothing is on top, or the resolved element is the candidate itself, a
        // descendant of it, or an ancestor of it. The ancestor case covers pointer-events:none
        // items (e.g. a locked unit's innate abilities), where elementFromPoint falls through
        // to the enclosing grid.
        if (!direct || direct === candidate || candidate.contains(direct) || direct.contains(candidate)) return candidate;
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

  // Touch devices emit emulated mouse events after a tap; ignore mouse-driven
  // tooltip tracking briefly after any touch so long-press (below) owns the
  // tooltip there while real mice keep hover behavior on hybrid devices.
  let lastTouchAt = 0;

  document.addEventListener('mousemove', e => {
    if (Date.now() - lastTouchAt < 800) return;
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

  // Touch: long-press (500ms, without moving) on a tooltip-bearing control
  // shows its tooltip anchored to the control; a plain tap keeps its normal
  // meaning (toggle/focus) and dismisses any visible tooltip, as does scrolling.
  function showTipForElement(el) {
    tip.textContent = el.dataset.tooltip;
    tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    let x = Math.min(r.left, window.innerWidth - tip.offsetWidth - 6);
    let y = r.bottom + 8;
    if (y + tip.offsetHeight > window.innerHeight) y = Math.max(6, r.top - tip.offsetHeight - 8);
    tip.style.left = Math.max(6, x) + 'px';
    tip.style.top = y + 'px';
  }

  let pressTimer = null;
  let pressShown = false;
  document.addEventListener('touchstart', e => {
    lastTouchAt = Date.now();
    clearTimeout(pressTimer);
    pressShown = false;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (isComboboxOpen(t.clientX, t.clientY)) { tip.style.display = 'none'; return; }
    const el = tooltipElementAtPoint(t.clientX, t.clientY);
    if (el) {
      pressTimer = setTimeout(() => { pressShown = true; showTipForElement(el); }, 500);
    } else {
      tip.style.display = 'none';
    }
  }, { passive: true });
  document.addEventListener('touchmove', () => {
    lastTouchAt = Date.now();
    clearTimeout(pressTimer);
  }, { passive: true });
  document.addEventListener('touchend', e => {
    lastTouchAt = Date.now();
    clearTimeout(pressTimer);
    // After a long-press, suppress the synthetic click so the control isn't
    // toggled, and leave the tooltip up until the next tap or scroll.
    if (pressShown && e.cancelable) e.preventDefault();
    else if (!pressShown) tip.style.display = 'none';
  }, { passive: false });
  document.addEventListener('touchcancel', () => { clearTimeout(pressTimer); }, { passive: true });
  document.addEventListener('scroll', () => {
    if (Date.now() - lastTouchAt < 1500) tip.style.display = 'none';
  }, true);
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
