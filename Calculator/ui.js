// --- UI Layer ---
// All DOM interaction. Depends on data.js, the definition and preset sources, engine.js, and the
// combat_*.js sources.
//
// The page's entry point: result rendering, recalculate, and the bootstrap wiring, which is every
// top-level statement in the UI layer. index.html owns the file list and load order.

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

function renderLifeStealSummary(result, version) {
  const el = document.getElementById('lifeStealSummary');
  if (!el) return;

  const aLS = (result.aLifeStealExpected != null)
    ? result.aLifeStealExpected
    : distExpectedValue(result.aLifeStealDist);
  const bLS = (result.bLifeStealExpected != null)
    ? result.bLifeStealExpected
    : distExpectedValue(result.bLifeStealDist);
  const modernCombatHealing = version === 'com2_1.05.11'
    || version === 'com2_warlord_1.5.12.7';
  const aRaw = result.aLifeStealRawExpected != null
    ? result.aLifeStealRawExpected : distExpectedValue(result.aLifeStealRawDist || result.aLifeStealDist);
  const bRaw = result.bLifeStealRawExpected != null
    ? result.bLifeStealRawExpected : distExpectedValue(result.bLifeStealRawDist || result.bLifeStealDist);

  if (aLS < 0.001 && bLS < 0.001 && aRaw < 0.001 && bRaw < 0.001) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  let html = '';
  const benefitLabel = modernCombatHealing
    ? 'applied self-heal / bonus-HP benefit (including Bloodsucker)'
    : 'applied self-heal / Extra-Hits benefit';
  if (aLS >= 0.001 || aRaw >= 0.001) {
    html += `<span>Attacker raw Life Steal drain: <strong>${aRaw.toFixed(3)}</strong>; ${benefitLabel}: <strong>${aLS.toFixed(3)}</strong></span>`;
  }
  if (bLS >= 0.001 || bRaw >= 0.001) {
    if (html) html += ' &nbsp;|&nbsp; ';
    html += `<span>Defender raw Life Steal drain: <strong>${bRaw.toFixed(3)}</strong>; ${benefitLabel}: <strong>${bLS.toFixed(3)}</strong></span>`;
  }
  el.style.display = '';
  el.innerHTML = html;
}

function renderCombatStateSummary(container, prefix, mean, version) {
  const values = mean || { irreversibleDamage: 0, undeadDamage: 0, extraHits: 0 };
  const modern = version.startsWith('com2');
  const categoryLabel = modern ? 'Irrecoverable damage' : 'Irreversible damage';
  const bonusLabel = modern ? 'Bonus HP / figure' : 'Extra Hits / figure';
  const previous = container.querySelector('#' + prefix + 'CombatStateSummary');
  if (previous) previous.remove();
  const summary = document.createElement('div');
  summary.id = prefix + 'CombatStateSummary';
  summary.className = 'combat-state-summary';
  summary.innerHTML = `
    <div class="combat-state-heading">Mean post-combat state</div>
    <div><span>${categoryLabel}</span><strong data-metric="irreversibleDamage">${values.irreversibleDamage.toFixed(3)}</strong></div>
    <div><span>Undeath damage</span><strong data-metric="undeadDamage">${values.undeadDamage.toFixed(3)}</strong></div>
    <div><span>${bonusLabel}</span><strong data-metric="extraHits">${values.extraHits.toFixed(3)}</strong></div>`;
  container.appendChild(summary);
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
  const chaosConjunction = document.getElementById('chaosConjunction').checked;

  const result = resolveCombat(a, b, {
    isRanged,
    version,
    wallOfFire,
    chaosConjunction,
  });

  const aFirstFigRem = a.hp > 0 && a.dmg % a.hp !== 0 ? a.hp - (a.dmg % a.hp) : a.hp;
  const bFirstFigRem = b.hp > 0 && b.dmg % b.hp !== 0 ? b.hp - (b.dmg % b.hp) : b.hp;

  renderBreakdownGrid(result.phases);
  renderDistPanel(document.getElementById('distA'), 'Mean damage to attacker', result.totalDmgToA, result.aHP, result.aAlive,
    { showSkulls: true, firstFigRem: aFirstFigRem, pDestroy: result.aDestroyPct });
  renderDistPanel(document.getElementById('distB'), 'Mean damage to defender', result.totalDmgToB, result.bHP, result.bAlive,
    { showSkulls: true, firstFigRem: bFirstFigRem, pDestroy: result.bDestroyPct });
  renderCombatStateSummary(document.getElementById('distA'), 'a', result.aPostCombatStateMean, version);
  renderCombatStateSummary(document.getElementById('distB'), 'b', result.bPostCombatStateMean, version);
  renderLifeStealSummary(result, version);

  // Persist the live page state, unless we're mid-restore (applyState calls recalculate
  // once at the end; saving a half-applied blob would be wrong).
  if (!_restoring) scheduleSaveState();
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

// The level ladder is an ordinary transform step in deriveUnitStats, so a level change
// re-states no card field: these handlers only refresh and recalculate (F136).
document.getElementById('aLevel').addEventListener('change', () => {
  refreshAbilityFieldVisibility();
  recalculate();
});
document.getElementById('bLevel').addEventListener('change', () => {
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
    for (const side of ['a', 'b']) {
      const cityWalls = preset[side] && preset[side].cityWalls;
      if (cityWalls && cityWalls !== 'none') out.push(side, 'city walls', cityWalls);
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
  let activeTooltip = null;

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

  function hideTooltip() {
    tip.style.display = 'none';
    activeTooltip = null;
  }

  function positionTooltipAtPointer(x, y) {
    const offX = 14, offY = 14;
    let left = x + offX;
    let top = y + offY;
    if (left + tip.offsetWidth > window.innerWidth) left = x - tip.offsetWidth - 6;
    if (top + tip.offsetHeight > window.innerHeight) top = y - tip.offsetHeight - 6;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
  }

  function positionTooltipAtElement(el) {
    const r = el.getBoundingClientRect();
    let x = Math.min(r.left, window.innerWidth - tip.offsetWidth - 6);
    let y = r.bottom + 8;
    if (y + tip.offsetHeight > window.innerHeight) y = Math.max(6, r.top - tip.offsetHeight - 8);
    tip.style.left = Math.max(6, x) + 'px';
    tip.style.top = y + 'px';
  }

  function renderActiveTooltip() {
    const el = activeTooltip && activeTooltip.el;
    const text = el && el.dataset && el.dataset.tooltip;
    if (!text) { hideTooltip(); return; }
    tip.textContent = text;
    tip.style.display = 'block';
    if (activeTooltip.mode === 'pointer') {
      positionTooltipAtPointer(activeTooltip.x, activeTooltip.y);
    } else {
      positionTooltipAtElement(el);
    }
  }

  refreshVisibleTooltipForElement = el => {
    if (activeTooltip && activeTooltip.el === el) renderActiveTooltip();
  };

  document.addEventListener('mousemove', e => {
    if (Date.now() - lastTouchAt < 800) return;
    if (isComboboxOpen(e.clientX, e.clientY)) { hideTooltip(); return; }
    const el = tooltipElementAtPoint(e.clientX, e.clientY);
    const text = el && el.dataset && el.dataset.tooltip;
    if (text) {
      activeTooltip = { el, mode: 'pointer', x: e.clientX, y: e.clientY };
      renderActiveTooltip();
    } else {
      hideTooltip();
    }
  });
  document.addEventListener('mouseleave', hideTooltip);

  // Touch: long-press (500ms, without moving) on a tooltip-bearing control
  // shows its tooltip anchored to the control; a plain tap keeps its normal
  // meaning (toggle/focus) and dismisses any visible tooltip, as does scrolling.
  function showTipForElement(el) {
    activeTooltip = { el, mode: 'element' };
    renderActiveTooltip();
  }

  let pressTimer = null;
  let pressShown = false;
  document.addEventListener('touchstart', e => {
    lastTouchAt = Date.now();
    clearTimeout(pressTimer);
    pressShown = false;
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    if (isComboboxOpen(t.clientX, t.clientY)) { hideTooltip(); return; }
    const el = tooltipElementAtPoint(t.clientX, t.clientY);
    if (el) {
      pressTimer = setTimeout(() => { pressShown = true; showTipForElement(el); }, 500);
    } else {
      hideTooltip();
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
    else if (!pressShown) hideTooltip();
  }, { passive: false });
  document.addEventListener('touchcancel', () => { clearTimeout(pressTimer); }, { passive: true });
  document.addEventListener('scroll', () => {
    if (Date.now() - lastTouchAt < 1500) hideTooltip();
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
