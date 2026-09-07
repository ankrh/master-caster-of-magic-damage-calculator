// --- UI Layer: ability and enchantment controls ---
// Builds the two ability panels and reads and writes their values, and applies the version
// gating and show-inactive rules deciding which controls a version may display. The gating
// rules themselves live in `ability_gating.js` (`data-scope="core"`); this file only applies
// them to the DOM.


function abilityControlId(prefix, abil) {
  return prefix + 'Abil_' + (abil.uiKey || abil.key);
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

// The optional `source` narrowing the bulk apply/clear pair shares: an absent filter admits
// every def, a present one admits only its own source. One rule, so the pair cannot drift into
// applying over a wider set than it clears.
function abilitySourceExcluded(abil, sourceFilter) {
  return !!sourceFilter && abil.source !== sourceFilter;
}

function applyAbilities(prefix, abilValues, sourceFilter) {
  for (const abil of abilityUiDefs()) {
    if (abilitySourceExcluded(abil, sourceFilter)) continue;
    const val = abilValues[abil.key];
    setAbilityControlValue(prefix, abil, val);
  }
}

function clearAbilities(prefix, sourceFilter) {
  for (const abil of abilityUiDefs()) {
    if (abilitySourceExcluded(abil, sourceFilter)) continue;
    const defaultValue = abil.type === 'select' ? abil.options[0][0]
      : abil.type === 'numcheck' ? null
      : abil.type === 'bool' ? false
      : 0;
    setAbilityControlValue(prefix, abil, defaultValue);
  }
}

// --- Visibility ---

// Show/hide (and reset when hidden) the version-restricted controls in the global-enchantment
// frame. Safe to call repeatedly; invoked on version change, reset, and state restore.
// The one DOM home for a battlefield enchantment the selected version does not have: the row is
// hidden, the control is disabled, and its value is cleared. The clearing is not decided here —
// `applyGlobalVersionGating` (`card_state.js`) is its one implementation, and this writes back only
// what that pass changed, exactly as the ability loop in `updateTypeVisibility` does.
//
// Until F260.7 the rule had three statements: this function cleared four ids, a second block in
// `updateTypeVisibility` cleared three of them (never `chaosConjunction`) and also disabled them,
// and `applyGlobalVersionGating` decided the values for a globals object built without the page.
// Nothing had moved, because every path that could set a disallowed global ran one of the two
// blocks — but which of the four ids got which half of the treatment was an accident of the two
// lists, and a fifth enchantment would have had to be added to both. `updateTypeVisibility` now
// calls this instead of restating it (F260.3's close block, question 2).
function updateGlobalEnchantmentVisibility(version) {
  const globals = { ...collectGlobals(), version };
  const gated = applyGlobalVersionGating(globals);
  for (const id of GLOBAL_ENCHANTMENT_CONTROL_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;
    const wrapper = el.closest('.check-label') || el;
    const allowed = globalEnchantmentAllowedForVersion(id, version);
    wrapper.classList.toggle('version-hidden', !allowed);
    wrapper.classList.toggle('disabled-field', !allowed);
    el.disabled = !allowed;
    if (gated[id] !== globals[id]) el.checked = gated[id];
  }
}

// Which of the level/weapon/armor selects the engine disregards for the current unit
// (see deriveUnitStats): fantastic units lock all three — except Zombies' weapons and,
// in Warlord, level while Spirit Link is active — heroes lock level+weapon, and armor
// additionally doesn't exist in MoM versions.
// The rule itself is `cardStateLoadoutLocks` (`card_state.js`, `data-scope="core"`), so the page
// and the preset applier lock the same fields; what stays here is the DOM half — which of the two
// identity sources speaks, and the Spirit Link tick.
function loadoutLockState(prefix) {
  const version = document.getElementById('gameVersion').value;
  const unitSel = document.getElementById(prefix + 'Unit');
  const identity = unitSel.value === 'custom'
    ? readIdentityControls(prefix)
    : createRosterUnitIdentity(version,
      (unitDatabases[version] || []).find(u => u.id === parseInt(unitSel.value)));
  const spiritLinkEl = document.getElementById(prefix + 'Abil_spiritLink');
  return cardStateLoadoutLocks(identity, spiritLinkEl && spiritLinkEl.checked, version);
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
  // `versionHasArmorQuality` (`ability_gating.js`) is the rule's one home, so this reset and the
  // one `applyVersionGating` performs on a card state cannot drift apart.
  const noArmor = !versionHasArmorQuality(document.getElementById('gameVersion').value);
  armorSel.classList.toggle('version-hidden', noArmor);
  if (armorLabel) armorLabel.classList.toggle('version-hidden', noArmor);
  if (noArmor) armorSel.value = 'normal';
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
  // The two engine families keep different To-Hit records: DOS one melee threshold plus one
  // shared secondary threshold, modern one common `hitchance` plus four channel modifiers
  // (Units.RecalculateUnits.pas:203-219). The card shows the record the version has.
  document.querySelectorAll('.dos-chance').forEach(el => el.classList.toggle('version-hidden', modern));
  document.querySelectorAll('.modern-chance').forEach(el => el.classList.toggle('version-hidden', !modern));
  document.querySelectorAll('.modern-special').forEach(el => el.classList.toggle('version-hidden', !modern));
  updateModernSpecialDuplicates(modern);
  updateDosSpecialDuplicates(!modern);
  updateLoadoutLocks('a');
  updateLoadoutLocks('b');

  // Version restrictions on enchantments. The clearing is not done here: `applyVersionGating`
  // (`card_state.js`, `data-scope="core"`) is its one implementation, and the panel writes back
  // the values it decided. Anything the pure pass leaves alone is left alone here too, so the
  // page and a control-free card state are gated by the same code rather than by two rules that
  // agree until they don't (F260.3). What stays here is the DOM half: the classes and the
  // disabled attribute, neither of which is state.
  for (const prefix of ['a', 'b']) {
    // A roster (non-custom) unit locks its panel: its innate ability controls become
    // read-only. We disable them so they get the same native disabled styling as the
    // version-gated controls below — but unlike version gating we must NOT clear their
    // value, since those checkboxes carry the unit's innate abilities for the calculation.
    const panelLocked = document.getElementById(prefix + 'Abilities').classList.contains('locked');
    const cardState = collectCardState(prefix);
    const gatedState = applyVersionGating(cardState, version, ABILITY_VERSION_GATES.card);
    for (const abil of abilityUiDefs()) {
      const el = document.getElementById(abilityControlId(prefix, abil));
      if (!el) continue;
      const versionGated = ABILITY_VERSION_GATES.card(abil, version);
      // Recorded on the item because updateAbilityVisibility must tell "impossible in this
      // version" (never shown) apart from "locked by a roster unit" (shown when the group's
      // toggle is on) — both of which merely set the control's disabled attribute.
      const gatedItem = el.closest('.abil-item');
      if (gatedItem) gatedItem.classList.toggle('abil-version-gated', versionGated);
      if (versionGated) {
        // Effect cannot exist in this version: disable, and write back whatever the gating pass
        // cleared. Only a value it actually changed is written, so a control the pass leaves
        // alone — a `num` input, a `numcheck` pair — keeps the number in its box exactly as the
        // page left it before F260.3.
        const uiKey = cardStateAbilityUiKey(abil);
        if (gatedState.abilities[uiKey] !== cardState.abilities[uiKey]) {
          setAbilityControlValue(prefix, abil, gatedState.abilities[uiKey]);
        }
        el.disabled = true;
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

  // Version restrictions on global combat enchantments, stated once in
  // `updateGlobalEnchantmentVisibility` above.
  updateGlobalEnchantmentVisibility(version);

  const hasRanged = hasConventionalRangedAttack(readUnitStats('a'));
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

