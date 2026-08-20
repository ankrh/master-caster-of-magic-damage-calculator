// --- UI Layer: the matrix view ---
// Builds each side's matrix stats, runs the rows through the matrix worker, and renders the
// table, its CSV export and the modal.

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
    dmg: matrixSideSetting(prefix, 'damageTaken'),
    irrecoverableDamage: 0,
    undeadDamage: 0,
    baseBonusHp: 0,
    noHealing: false,
    toHitMod: unit.to_hit || 0,
    toHitRtbMod: unit.to_hit || 0,
    toBlkMod: unit.to_block || 0,
    cityWalls: matrixSideSetting(prefix, 'cityWalls'),
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
    abilities[calcKey] = mergeAbilityCalcValue(abil, abilities[calcKey], val);
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
    dmg: matrixSideSetting(prefix, 'damageTaken'),
    irrecoverableDamage: 0,
    undeadDamage: 0,
    baseBonusHp: 0,
    noHealing: false,
    toHitMod: el(prefix + 'ToHitMod').value,
    toHitRtbMod: el(prefix + 'ToHitRtbMod').value,
    toBlkMod: el(prefix + 'ToBlkMod').value,
    cityWalls: matrixSideSetting(prefix, 'cityWalls'),
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

// The worker imports the sources the page already loaded, read from index.html's data-worker
// tags — the same manifest tools/calculator_sources.js reads from Node. The file list is not
// restated here, nor in the specs that build a worker to check main-thread/worker parity, so
// splitting a source is one edit in index.html.
function matrixWorkerSource() {
  const urls = [...document.querySelectorAll('script[data-worker]')].map(script => script.src);
  if (!urls.length) throw new Error('matrixWorkerSource: no data-worker <script> tags in index.html');
  return `importScripts(${urls.map(url => JSON.stringify(url)).join(', ')});\n${MATRIX_WORKER_HANDLER}`;
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

function matrixCombatOptions(matrixMode) {
  return {
    isRanged: matrixMode === 'ranged',
    version: document.getElementById('gameVersion').value,
    wallOfFire: !!matrixGlobalValue('wallOfFire'),
    chaosConjunction: !!matrixGlobalValue('chaosConjunction'),
  };
}

async function buildMatrixCache(attackerEnchantments, defenderEnchantments, matrixMode) {
  const opts = matrixCombatOptions(matrixMode);
  const { version } = opts;
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
    matrixWorkerBlobUrl = URL.createObjectURL(
      new Blob([matrixWorkerSource()], { type: 'text/javascript' }));
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

    document.getElementById(prefix + 'Dmg').value = matrixSideSetting(prefix, 'damageTaken');

    clearAbilities(prefix, 'enchantment');
    applyAbilities(prefix, matrixAppliedEnchantments(prefix), 'enchantment');
  }

  const isRanged = matrixMode === 'ranged';
  const rangedCheckEl = document.getElementById('rangedCheck');
  if (rangedCheckEl) rangedCheckEl.checked = isRanged;
  const rangedDistEl = document.getElementById('rangedDist');
  if (rangedDistEl) rangedDistEl.value = isRanged ? matrixGlobalValue('rangedDist') : 1;

  document.getElementById('aCityWalls').value = matrixSideSetting('a', 'cityWalls');
  document.getElementById('bCityWalls').value = matrixSideSetting('b', 'cityWalls');
  document.getElementById('nodeAura').value   = matrixGlobalValue('nodeAura')   || 'none';
  document.getElementById('trueLight').checked   = !!matrixGlobalValue('trueLight');
  document.getElementById('darkness').checked    = !!matrixGlobalValue('darkness');
  document.getElementById('wallOfFire').checked  = !!matrixGlobalValue('wallOfFire');
  document.getElementById('warpReality').checked = !!matrixGlobalValue('warpReality');
  document.getElementById('chaosConjunction').checked = !!matrixGlobalValue('chaosConjunction');
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

