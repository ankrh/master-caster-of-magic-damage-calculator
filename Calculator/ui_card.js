// --- UI Layer: the stat card ---
// Reads the panel controls into derivation input, renders the modern and DOS special-value
// blocks beside them, and writes the derived stats back onto the card.


// Read ability checkboxes/inputs from DOM for a given prefix.
// Returns a plain object keyed by ability key.
function readAbilitiesFromDOM(prefix) {
  const result = {};
  for (const abil of abilityUiDefs()) {
    const val = getAbilityControlValue(prefix, abil);
    if (val === undefined) continue;
    const calcKey = abil.calcKey || abil.key;
    result[calcKey] = mergeAbilityCalcValue(abil, result[calcKey], val);
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
    // The card exposes only aggregate starting damage. Category/bonus state starts at
    // zero, remains exact internally during combat, and is reported as output.
    irrecoverableDamage: 0,
    undeadDamage: 0,
    baseBonusHp: 0,
    noHealing: false,
    toHitMod: el(prefix + 'ToHitMod').value,
    toHitRtbMod: el(prefix + 'ToHitRtbMod').value,
    toBlkMod: el(prefix + 'ToBlkMod').value,
    cityWalls: el(prefix + 'CityWalls').value,
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
// The record model this block renders — which effects consume the shared `Spec_Att_Attrib`
// byte, with what sign, and how `ranged_type` selects the gazes — lives in
// `combat_special_attacks.js` beside the effects it governs, with its citations. This file
// builds the controls and marshals their state into it.

function dosSpecialDef(key) {
  return ABILITY_DEFS.find(a => a.key === key);
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

// What the enchantment section supplies for a calc key. The block above is what this unit
// *provides*, this is what it *receives*; which controls count is a UI fact, and how the two
// combine is `mergeAbilityCalcValue`'s cited rule.
function dosReceivedValue(prefix, calcKey) {
  let out;
  for (const def of abilityUiDefs()) {
    if (def.source !== 'enchantment' || def.calcKey !== calcKey) continue;
    out = mergeAbilityCalcValue(def, out, getAbilityControlValue(prefix, def));
  }
  return out;
}

// The DOS read side, marshalled only: control state in, `dosSpecialAbilityValues` decides.
// Consumer values come from the one byte and its flags rather than from the per-effect ability
// controls, so the record's contention holds however the state was reached — roster, preset,
// share link or hand edit. The DOS rosters no longer carry a per-effect magnitude at all; the
// ability controls survive only as the presets' and share links' way of naming these values,
// and the card overwrites them on load.
// `withReceived` is false on the matrix path, where the received side comes from matrix state
// and is overlaid after this, not from the enchantment controls.
// Dispel Evil, CoM 1 Exorcise, and Destruction are deliberately absent from the consumer list:
// their modifiers are literals, so they stay ordinary ability rows that
// `readAbilitiesFromDOM` supplies.
function dosSpecialValues(prefix, withReceived = true) {
  const version = document.getElementById('gameVersion').value;
  if (!dosSpecialIsActive(version)) return {};
  const magEl = document.getElementById(prefix + 'DosSpecial');
  if (!magEl) return {};
  const consumers = [];
  for (const [key, , sign] of DOS_SPECIAL_CONSUMERS) {
    const def = dosSpecialDef(key);
    const chk = document.getElementById(prefix + 'DosFlag_' + key);
    if (!def || !chk) continue;
    consumers.push({
      def,
      sign,
      checked: chk.checked,
      received: withReceived ? dosReceivedValue(prefix, def.calcKey || def.key) : undefined,
    });
  }
  return dosSpecialAbilityValues({
    version,
    magnitude: parseInt(magEl.value, 10) || 0,
    rangedType: (document.getElementById(prefix + 'RtbType') || {}).value,
    consumers,
  });
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

// The tooltip controller is initialized after the first calculation. Until then this is a no-op;
// afterwards it keeps a tooltip already open on a calculated output synchronized with that
// output's dynamic trace.
let refreshVisibleTooltipForElement = () => {};

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
    refreshVisibleTooltipForElement(el);
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
// step in deriveUnitStats (`stats_sequence.js`, statStep 'level'). Guarded on base.atk because a
// custom unit's record may hold only the `generic` flag (see applyFullState), not base stats.
function resetCardToRosterBase(prefix) {
  const unit = document.getElementById(prefix + 'Unit');
  if (!unit || unit.value === 'custom') return;
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

