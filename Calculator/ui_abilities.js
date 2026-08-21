// --- UI Layer: ability and enchantment controls ---
// Builds the two ability panels and reads and writes their values, and owns the version
// gating and show-inactive rules deciding which controls a version may display.


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
    el.value = val === true ? 1 : (val || 0);
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
  if (sg === 'CoM only') return version === 'com_6.08';
  if (sg === 'CoM, CoM2 & Warlord') return isCoMorCoM2;
  if (sg === 'CoM2 & Warlord') return isCoM2;
  if (sg === 'Warlord only') return isWarlord;
  if (sg === 'Warlord') return isWarlord;
  if (sg === 'Renamed in Warlord') return isWarlord;
  // The unrestricted labels, named rather than defaulted: a subgroup that is only the `_`
  // marker, and the two headings that mean "every version". A misspelt restriction would
  // otherwise resolve to "allowed everywhere" and show a control in versions whose engine has
  // no such effect (`SPEC.md`, *Out-of-range values stop the run*).
  if (sg === '' || sg === 'All versions' || sg === 'All versions bools') return true;
  throw new Error(
    `subgroupAllowedForVersion: subgroup '${subgroup}' is not a known version restriction. `
    + `Add it here with the versions it names, or use 'All versions'.`);
}

// The single home for "does this def exist in this version". Both enchantments and ability tags
// are gated by their subgroup. A leading `_` only suppresses the rendered heading and is stripped
// before the version test, so `_MoM only` restricts exactly as `MoM only` does. A def with no
// subgroup, or one that is nothing but the marker (`_`), resolves to "allowed everywhere".
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
// element id to the versions in which it's valid; a control valid everywhere still needs a
// case saying so, because a control this function has never heard of is a wiring mistake, not
// a universal enchantment (`SPEC.md`, *Out-of-range values stop the run*). When a control is
// hidden it's also reset (unchecked) so a hidden enchantment can't silently keep affecting the
// calculation.
function globalEnchantmentAllowedForVersion(elementId, version) {
  const isMoM = version === 'mom_1.31' || version === 'mom_cp_1.60.00';
  const isWarlord = version.startsWith('com2_warlord_');
  switch (elementId) {
    case 'trueLight': return isMoM || isWarlord; // removed in CoM 1 & 2
    case 'chaosConjunction': return version.startsWith('com2_');
    case 'hurricane': return isWarlord;
    case 'poxHost':   return isWarlord;
    case 'darkness':        return true;
    case 'chaosSurge':      return true;
    case 'wallOfFire':      return true;
    case 'warpReality':     return true;
    case 'rangedCheck':     return true;
    case 'rangedDist':      return true;
    case 'nodeAura':        return true;
    default: throw new Error(
      `globalEnchantmentAllowedForVersion: control '${elementId}' has no version rule.`);
  }
}

// Show/hide (and reset when hidden) the version-restricted controls in the global-enchantment
// frame. Safe to call repeatedly; invoked on version change, reset, and state restore.
function updateGlobalEnchantmentVisibility(version) {
  for (const id of ['trueLight', 'chaosConjunction', 'hurricane', 'poxHost']) {
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
    if (!allowed) {
      if (gEl.type === 'checkbox') gEl.checked = false;
      else gEl.value = 'attacker';
    }
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

