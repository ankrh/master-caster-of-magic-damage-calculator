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

  // The second moment, carried on the same element as the first and rounded the same way, so the
  // page publishes a spread wherever it publishes a mean. It is not drawn: `data-sd` adds no text
  // and no layout. `runTests` reads it off `panels[i]` — the very element it reads the mean's text
  // from — which is what makes the two numbers provably describe one panel of one render, and
  // `tools/preset_checks.js` computes it from the same `distributionStdDev` (F268.3).
  const stdDev = distributionStdDev(dist);

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
  // opts.showDestroy === false suppresses the line entirely: a rider panel plots one
  // contributor to its phase's total, and "destroyed" is a property of the total, stated once
  // by the phase panel above it.
  let destroyPct = '';
  if (opts && opts.showDestroy === false) {
    destroyPct = '';
  } else if (opts && opts.pDestroy != null) {
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

  let html = `<div class="dist-header">${title}:<br><span class="avg" data-sd="${stdDev.toFixed(3)}">${expected.toFixed(3)}</span>${hpPct}${destroyPct}</div>`;
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
  // A panel that scrolls opens centred on its mean, so bins above and below the window are
  // off-screen. Reachable by wheel or drag, but not by keyboard unless the container itself can
  // take focus (WCAG 2.1.1). Only a container that actually overflows becomes a tab stop, so a
  // panel whose whole distribution fits adds none; the label is the panel's own title, so a
  // screen reader announces which histogram the focus landed in.
  if (scrollEl) {
    const overflows = scrollEl.scrollHeight > scrollEl.clientHeight + 1;
    if (overflows) {
      scrollEl.tabIndex = 0;
      const heading = container.querySelector('.dist-header');
      scrollEl.setAttribute('aria-label',
        (heading ? heading.textContent : title).replace(/\s+/g, ' ').trim());
    } else {
      scrollEl.removeAttribute('tabindex');
      scrollEl.removeAttribute('aria-label');
    }
  }
}

// --- Per-rider histograms ---
// One histogram per rider that contributes damage inside a combat phase, in that phase's row
// (`CLAUDE.md`, *Input/output contract*). The resolver emits `phase.riders` as
// `[{ key, side, quantity, dist }]`; this layer only labels and draws it.
//
// `melee` is deliberately absent from the map: it is the base-roll slot in every phase, so its
// name is the row's own attack and comes from `phase.attackLabels[side]` — "Gaze" in a gaze row,
// "Thrown" in a Thrown row, "Counter-attack" for the counter half of a simultaneous row.
const RIDER_LABELS = Object.freeze({
  immolation: 'Immolation',
  stoningGaze: 'Stoning Gaze',
  exorcise: 'Exorcise',
  dispelEvil: 'Dispel Evil',
  stoningTouch: 'Stoning Touch',
  deathTouch: 'Death Touch',
  lifeSteal: 'Life Steal drain',
  destruction: 'Destruction',
  poison: 'Poison Touch',
  bloodsucker: 'Blood Sucker',
  lifeStealHeal: 'Life Steal healing',
  bloodsuckerHeal: 'Blood Sucker healing',
});

const RIDER_SIDE_NAMES = Object.freeze({ atk: 'attacker', def: 'defender' });

// --- The chain a rider histogram shows on hover (F222.5) ---
//
// The resolver hands each rider the chain records the queries that produced its number built,
// in the order those queries were made (`rowRiderChains`, `combat_phases.js`). This layer only
// heads and formats them, with `formatTraceTooltip` (`ui_card.js`) — the same formatter the
// card's calculated values use, so the two presentations cannot drift.
//
// A resistance chain is headed by the realm its roll named. One target has as many
// simultaneously valid effective resistances inside one attack as its attacker has active
// riders — Life for Dispel Evil / Exorcise, Nature for Stoning Touch, Death for Death Touch and
// Life Steal, Chaos for Destruction, and no realm at all for Poison — so without the realm the
// reader cannot tell which of them a chain answered.
const CHAIN_REALM_NAMES = Object.freeze({
  nature: 'Nature',
  sorcery: 'Sorcery',
  chaos: 'Chaos',
  life: 'Life',
  death: 'Death',
});

function riderChainHeading(record, subject) {
  if (record.quantity === 'defense') return `Effective Defense (${subject})`;
  if (record.quantity !== 'resistance') {
    throw new Error(`renderRiderPanels: chain record names quantity `
      + `${JSON.stringify(record.quantity)}; expected resistance or defense.`);
  }
  // The Poison loop passes realm 0, so no realm-conditional term of the query reaches it. That
  // is a different figure from any of the named realms and says so.
  if (record.realm === null) {
    return `Effective Resistance (${subject}), realm-less roll`;
  }
  const realm = CHAIN_REALM_NAMES[record.realm];
  if (!realm) {
    throw new Error(`renderRiderPanels: chain record names realm `
      + `${JSON.stringify(record.realm)}; expected one of `
      + `${Object.keys(CHAIN_REALM_NAMES).join(', ')}, or null.`);
  }
  return `Effective Resistance (${subject}) vs ${realm}`;
}

// A rider whose roll is made but cannot succeed still draws, with all its mass at 0
// (`CLAUDE.md`, *Input/output contract*), and it shows the same chain any other rider does:
// the chain is what makes the zero readable, since it is the figure the roll had to beat.
function riderChainTooltip(title, chains, subject) {
  const blocks = (chains || []).map(record =>
    riderChainHeading(record, subject) + '\n' + formatTraceTooltip(record.trace));
  if (!blocks.length) {
    // Blood Sucker deals a flat amount after the per-figure loop and a Doom slot is not scored
    // against Defense, so neither has a figure to explain. Stated rather than left blank: an
    // empty hover reads as a defect.
    blocks.push('This slot is scored against neither an effective resistance nor an '
      + 'effective defense.');
  }
  return [title, ...blocks].join('\n\n');
}

// A rider key with no display name, or a `melee` slot in a row that named no attack, is a
// resolver/UI mismatch rather than a value the reader can interpret, so it halts naming the
// offending key (`CLAUDE.md`, *Architecture*, the fail-loud rule).
function riderDisplayName(row, rider) {
  if (rider.key !== 'melee') {
    const label = RIDER_LABELS[rider.key];
    if (!label) {
      throw new Error(`renderRiderPanels: no display name for rider key ${JSON.stringify(rider.key)} `
        + `in row ${JSON.stringify(row.label)}. Expected one of `
        + `${Object.keys(RIDER_LABELS).join(', ')}, or melee.`);
    }
    return label;
  }
  const named = row.attackLabels && row.attackLabels[rider.side];
  if (!named) {
    throw new Error(`renderRiderPanels: row ${JSON.stringify(row.label)} carries a melee base-roll `
      + `slot on side ${JSON.stringify(rider.side)} but its attackLabels names no attack for that `
      + 'side. The resolver states one attack name per side that rolls (Calculator/combat.js).');
  }
  return named;
}

// The lead figure's remaining HP, which is what makes the figure-kill ticks land on the real
// thresholds when the target started the exchange already damaged. `remHP` and `perFig` are the
// row's own numbers; figures killed is read off the HP axis rather than emitted as a second
// quantity (`CLAUDE.md`, *Input/output contract*).
function leadFigureRemainingHp(remHP, perFig, figs) {
  if (!(figs > 0) || !(perFig > 0)) return perFig;
  const lead = remHP - (figs - 1) * perFig;
  return lead > 0 && lead <= perFig ? lead : perFig;
}

// R5, as the reader sees it: a rider whose gate is false for this matchup is not in `riders` and
// draws nothing; a rider that is gated on but cannot land is in `riders` and draws with all its
// mass at 0. Nothing here may hide an all-zero panel — that would make "immune" and "absent"
// indistinguishable.
// A damage histogram belongs under the unit whose HP it is about, the same way the two phase
// panels above it do — the left column is the attacker, the right the defender. `rider.side` is
// already that unit (the phase's target for damage, its source for a healing rider), so the
// band is two columns rather than one wrapping run, and a side with no riders still holds its
// column so the other stays under its own unit.
function renderRiderPanels(container, row, riders) {
  if (!riders || !riders.length) return;

  const band = document.createElement('div');
  band.className = 'breakdown-rider-band';
  container.appendChild(band);

  const caption = document.createElement('div');
  caption.className = 'breakdown-rider-caption';
  caption.textContent = `Riders (${riders.length})`;
  band.appendChild(caption);

  const columns = document.createElement('div');
  columns.className = 'breakdown-rider-columns';
  band.appendChild(columns);

  const sideColumns = {};
  for (const side of ['atk', 'def']) {
    const column = document.createElement('div');
    column.className = 'breakdown-rider-column';
    columns.appendChild(column);
    sideColumns[side] = column;
  }

  const riderChains = [];
  for (const rider of riders) {
    const panel = document.createElement('div');
    panel.className = 'dist-panel rider-panel';
    // F222.5 hangs the effective-resistance / effective-defense hover chain on these three
    // attributes plus the `.rider-name` span in the header renderDistPanel writes.
    panel.dataset.riderKey = rider.key;
    panel.dataset.riderSide = rider.side;
    panel.dataset.riderQuantity = rider.quantity;

    const name = riderDisplayName(row, rider);
    const target = RIDER_SIDE_NAMES[rider.side];
    if (!target) {
      throw new Error(`renderRiderPanels: rider ${JSON.stringify(rider.key)} names side `
        + `${JSON.stringify(rider.side)}; expected atk or def.`);
    }
    sideColumns[rider.side].appendChild(panel);
    const title = `<span class="rider-name">${name}</span> <span class="rider-target">&rarr; ${target}</span>`;
    // Hung on the name span rather than the panel so the hover target is the rider's own label
    // and not the whole histogram, which already scrolls and takes focus.
    // The chain's subject is the unit the rolls were made against, which is not the panel's
    // own column for Life Steal's healing.
    const chainSubject = RIDER_SIDE_NAMES[rider.chainSubject] || target;
    riderChains.push({ panel,
      text: riderChainTooltip(`${name} → ${target}`, rider.chains, chainSubject) });

    if (rider.quantity === 'sourceHp') {
      // Off the shared target-HP axis: this is HP restored on the unit that dealt the rider,
      // not damage, so it carries no figure-kill ticks and no target HP denominator.
      renderDistPanel(panel, title, rider.dist, 0, 0,
        { barColor: '#4fd18b', colHeader: 'Healed' });
      continue;
    }
    if (rider.quantity !== 'targetHp') {
      throw new Error(`renderRiderPanels: rider ${JSON.stringify(rider.key)} names quantity `
        + `${JSON.stringify(rider.quantity)}; expected targetHp or sourceHp.`);
    }
    const perFig = rider.side === 'atk' ? row.atkHPper : row.defHPper;
    const figs = rider.side === 'atk' ? row.atkFigs : row.defFigs;
    const remHP = rider.side === 'atk' ? row.atkHP : row.defHP;
    renderDistPanel(panel, title, rider.dist, perFig, figs, {
      barColor: '#f0c030',
      showSkulls: true,
      showDestroy: false,
      firstFigRem: leadFigureRemainingHp(remHP, perFig, figs),
    });
  }

  // `renderDistPanel` writes the header, so the name span exists only now. A panel whose header
  // was rendered without one is a contract break between the two functions, not a rider with
  // nothing to say, so it halts.
  for (const { panel, text } of riderChains) {
    const nameSpan = panel.querySelector('.dist-header .rider-name');
    if (!nameSpan) {
      throw new Error('renderRiderPanels: a rider panel header carries no .rider-name span to '
        + 'hang its chain on. renderDistPanel is expected to render the supplied title markup.');
    }
    nameSpan.dataset.tooltip = text;
  }
}

function renderBreakdownGrid(phases) {
  const grid = document.getElementById('breakdownGrid');
  grid.innerHTML = '';
  if (!phases) return;
  // A single-phase breakdown used to be suppressed because its two panels repeat the totals
  // above it. That is still true of its two panels, but no longer of the row: a rider histogram
  // has no other home in the page (`CLAUDE.md`, *Input/output contract*), so a lone row that
  // carries one is drawn. `melee` is the base-roll slot every row has, so it is not what makes
  // a row worth drawing on its own.
  const carriesRider = phases.some(
    phase => (phase.riders || []).some(rider => rider.key !== 'melee'));
  if (phases.length <= 1 && !carriesRider) return;

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
      // A feared row removes attacking figures and writes to no damage bucket, so it carries no
      // `riders` key at all; its own two panels are the whole story.
      const fearOpts = { barColor: '#c080ff', colHeader: 'Feared' };
      renderDistPanel(panelA, 'Attacker figs feared', phase.atkDist, 0, 0, fearOpts);
      renderDistPanel(panelB, 'Defender figs feared', phase.defDist, 0, 0, fearOpts);
    } else {
      // The lead figure's remaining HP is what the "% HP" denominator and the figure-kill ticks
      // are measured against, on the phase panels and the rider panels beneath them alike.
      const atkLead = leadFigureRemainingHp(phase.atkHP, phase.atkHPper, phase.atkFigs);
      const defLead = leadFigureRemainingHp(phase.defHP, phase.defHPper, phase.defFigs);
      const atkOpts = { ...breakdownOpts, firstFigRem: atkLead,
        ...(phase.atkDestroyPct != null ? { pDestroy: phase.atkDestroyPct } : {}) };
      const defOpts = { ...breakdownOpts, firstFigRem: defLead,
        ...(phase.defDestroyPct != null ? { pDestroy: phase.defDestroyPct } : {}) };
      renderDistPanel(panelA, 'Mean damage to attacker', phase.atkDist, phase.atkHPper, phase.atkFigs, atkOpts);
      renderDistPanel(panelB, 'Mean damage to defender', phase.defDist, phase.defHPper, phase.defFigs, defOpts);
      renderRiderPanels(row, phase, phase.riders);
    }
  }
}

// The ranged volley resolves without a joint, so it has no phase rows at all (`phases: null`)
// and carries its riders at the top level. They are the only riders in that combat, so they get
// the breakdown grid to themselves rather than a phase row inside it.
function renderRangedRiderGrid(result) {
  const grid = document.getElementById('breakdownGrid');
  if (!result.riders || !result.riders.length) return;

  const heading = document.createElement('div');
  heading.className = 'breakdown-heading';
  heading.textContent = 'Rider breakdown';
  grid.appendChild(heading);

  const row = document.createElement('div');
  row.className = 'breakdown-phase-row first-phase';
  grid.appendChild(row);

  renderRiderPanels(row, {
    label: 'Ranged volley',
    attackLabels: result.attackLabels,
    atkHP: result.aRemHP, atkHPper: result.aHP, atkFigs: result.aAlive,
    defHP: result.bRemHP, defHPper: result.bHP, defFigs: result.bAlive,
  }, result.riders);
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
    || version === 'com2_warlord_1.5.12.9';
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

// What the three damage categories are worth to a reader is their proportions, not their
// magnitudes: `Combatheal` subtracts Irrecoverable damage out of the healable total before it
// heals anything and never decrements it, and removes plain normal damage before undead
// damage (`Combat.DamageHandling.pas:80-95`). So the split says how much of a wound is
// permanent, how much is healed last, and how much is ordinary — which a surviving unit has
// and the raw magnitudes state badly, because the engine's accumulators are uncapped and a
// single Destruction success books 150 against a unit that can hold 40.
//
// The shares are a ratio of means over the accumulated categories, which are what the record
// holds. For a unit that survives they are also a share of the damage the panel above shows,
// because nothing was capped; the two diverge only on overkill.
// Rounded to one decimal independently, three shares of a third each print as 33.3 and the
// column reads 99.9%. The largest share absorbs the residue instead, so the three always show
// as a whole: it is the one least distorted by carrying it.
function combatDamageShares(values) {
  const keys = ['regularDamage', 'undeadDamage', 'irreversibleDamage'];
  const total = keys.reduce((sum, key) => sum + values[key], 0);
  if (total <= 0) return null;
  const rounded = {};
  for (const key of keys) rounded[key] = Math.round((values[key] / total) * 1000) / 10;
  const largest = keys.reduce((best, key) =>
    values[key] > values[best] ? key : best, keys[0]);
  rounded[largest] = Math.round(
    (100 - keys.filter(key => key !== largest)
      .reduce((sum, key) => sum + rounded[key], 0)) * 10) / 10;
  return rounded;
}

// The panel also carries the four category quantities as *numbers*, in data attributes, because
// the preset corpus asserts them (F268.7) and the visible rows state shares rather than magnitudes.
// Same reasoning as F268.3's `data-sd`: the numbers a runner compares come off the element the
// render wrote, so a mean and a spread provably describe one panel of one recalculation rather
// than a value left over from whatever the page last held. Nothing visible changes.
const COMBAT_CATEGORY_PANEL_ATTRIBUTES = [
  { metric: 'regularDamage', mean: 'reg', sd: 'sdReg' },
  { metric: 'undeadDamage', mean: 'und', sd: 'sdUnd' },
  { metric: 'irreversibleDamage', mean: 'irr', sd: 'sdIrr' },
  { metric: 'extraHits', mean: 'bonus', sd: 'sdBonus' },
  { metric: 'healedDamage', mean: 'heal', sd: 'sdHeal' },
];

function writeCombatCategoryAttributes(summary, prefix, dists) {
  if (!dists) {
    throw new Error(`writeCombatCategoryAttributes: the combat result carries no `
      + `\`${prefix}PostCombatCategoryDists\`. Every \`resolveCombat\` return publishes it `
      + '(`Calculator/combat.js`); without it the corpus would compare four category '
      + 'expectations against NaN and pass.');
  }
  for (const attribute of COMBAT_CATEGORY_PANEL_ATTRIBUTES) {
    const dist = dists[attribute.metric];
    summary.dataset[attribute.mean] = expectedDamage(dist).toFixed(3);
    summary.dataset[attribute.sd] = distributionStdDev(dist).toFixed(3);
  }
}

function renderCombatStateSummary(container, prefix, mean, dists, version) {
  const values = { irreversibleDamage: 0, undeadDamage: 0, regularDamage: 0, extraHits: 0,
    ...(mean || {}) };
  const modern = version.startsWith('com2');
  const categoryLabel = modern ? 'Irrecoverable' : 'Irreversible';
  const bonusLabel = modern ? 'Bonus HP / figure' : 'Extra Hits / figure';
  const previous = container.querySelector('#' + prefix + 'CombatStateSummary');
  if (previous) previous.remove();
  const summary = document.createElement('div');
  summary.id = prefix + 'CombatStateSummary';
  summary.className = 'combat-state-summary';
  const shares = combatDamageShares(values);
  const share = key => `<strong data-metric="${key}">`
    + `${shares[key].toFixed(1)}%</strong>`;
  const rows = shares
    ? `
    <div><span>Regular</span>${share('regularDamage')}</div>
    <div><span>Undeath</span>${share('undeadDamage')}</div>
    <div><span>${categoryLabel}</span>${share('irreversibleDamage')}</div>`
    // No damage stands on the record, so there is no composition to state; saying 0% of each
    // would read as a measurement rather than as an absence. It says "remaining" because the
    // record is the state after healing: an exchange can deal damage and then heal all of it
    // away, and "damage taken: none" beside a positive damage figure would contradict it.
    : '<div><span>Damage remaining</span><strong data-metric="none">none</strong></div>';
  summary.innerHTML = `
    <div class="combat-state-heading">Post-combat damage by type</div>${rows}
    <div><span>${bonusLabel}</span><strong data-metric="extraHits">${values.extraHits.toFixed(3)}</strong></div>`;
  writeCombatCategoryAttributes(summary, prefix, dists);
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

  // The ranged-mode control follows the attacker's derived ranged attack: `updateTypeVisibility`
  // withdraws it in the same interaction as any edit that leaves the derivation without one, and
  // every `recalculate()` call site runs it first. A tick surviving to here means that withdrawal
  // regressed, and the exchange is one line from being resolved out of a state the UI contract
  // forbids. Both resolutions manufacture a number: as melee it silently drops what the user
  // asked for, as ranged it fires a volley from an attack the record does not have. So it halts
  // (`SPEC.md`, *Out-of-range values stop the run*) rather than picking one.
  const isRanged = document.getElementById('rangedCheck').checked;
  if (isRanged && !hasConventionalRangedAttack(a)) {
    const carried = a.modernAttacks
      ? `modernAttacks.ranged = ${JSON.stringify(a.modernAttacks.ranged || null)}`
      : `shared slot type ${JSON.stringify(a.rangedType)} strength ${a.rtb}`;
    throw new Error('recalculate: ranged mode is ticked while the attacker\'s derived record '
      + `carries no conventional ranged attack (${carried}). The control is expected to have been `
      + 'cleared and disabled by updateTypeVisibility before this point (SPEC.md, UI contract).');
  }
  const version = document.getElementById('gameVersion').value;
  const wallOfFire = document.getElementById('wallOfFire').checked;
  const chaosConjunction = document.getElementById('chaosConjunction').checked;

  const result = resolveCombat(a, b, {
    isRanged,
    version,
    wallOfFire,
    chaosConjunction,
    // The card draws the rider histograms, so it asks the queries for the chains that produced
    // their numbers. The matrix draws none and does not ask.
    riderChains: true,
  });

  const aFirstFigRem = a.hp > 0 && a.dmg % a.hp !== 0 ? a.hp - (a.dmg % a.hp) : a.hp;
  const bFirstFigRem = b.hp > 0 && b.dmg % b.hp !== 0 ? b.hp - (b.dmg % b.hp) : b.hp;

  renderBreakdownGrid(result.phases);
  if (!result.phases) renderRangedRiderGrid(result);
  renderDistPanel(document.getElementById('distA'), 'Mean damage to attacker', result.totalDmgToA, result.aHP, result.aAlive,
    { showSkulls: true, firstFigRem: aFirstFigRem, pDestroy: result.aDestroyPct });
  renderDistPanel(document.getElementById('distB'), 'Mean damage to defender', result.totalDmgToB, result.bHP, result.bAlive,
    { showSkulls: true, firstFigRem: bFirstFigRem, pDestroy: result.bDestroyPct });
  renderCombatStateSummary(document.getElementById('distA'), 'a', result.aPostCombatStateMean,
    result.aPostCombatCategoryDists, version);
  renderCombatStateSummary(document.getElementById('distB'), 'b', result.bPostCombatStateMean,
    result.bPostCombatCategoryDists, version);
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

  // `presetVersionsFromTestTree` (`card_state.js`) is the rule; folding it in here keeps
  // `PRESET_VERSIONS` the map every caller already reads.
  Object.assign(PRESET_VERSIONS, presetVersionsFromTestTree(TEST_TREE));

  for (const group of TEST_TREE) {
    for (const sub of group.subs) {
      for (const key of sub.keys) {
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

  // What an element has to say, and whether a point is inside a rect. Both the pointer walk and
  // the render path ask the first; the tooltip hit test and the combobox suppression ask the
  // second over different rects. One reader each, so a candidate one path accepts cannot be a
  // candidate the other silently drops.
  function tooltipTextOf(el) {
    return el && el.dataset && el.dataset.tooltip;
  }

  function rectContainsPoint(rect, x, y) {
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  function tooltipElementAtPoint(x, y) {
    const direct = document.elementFromPoint(x, y);
    let el = direct;
    while (el && el !== document.documentElement) {
      if (tooltipTextOf(el)) return el;
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
      if (rectContainsPoint(rect, x, y)) {
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
      if (rectContainsPoint(list.getBoundingClientRect(), x, y)) return true;
    }
    return false;
  }

  // Touch devices emit emulated mouse events after a tap; ignore mouse-driven
  // tooltip tracking briefly after any touch so long-press (below) owns the
  // tooltip there while real mice keep hover behavior on hybrid devices.
  let lastTouchAt = 0;

  // Dismiss: the pointer no longer owns a tooltip-bearing element, so drop the owner too.
  function hideTooltip() {
    tip.style.display = 'none';
    activeTooltip = null;
  }

  // Conceal: the owner is still under the pointer but currently has nothing to say. Keep it,
  // because a calculated output loses its trace transiently whenever the page is rewritten
  // against foreign state and restored (getDefaultIds' default-state snapshot, applyState).
  // Dropping the owner there is permanent: with the pointer stationary no further mousemove
  // arrives, so no later refresh can re-show the overlay.
  function concealTooltip() {
    tip.style.display = 'none';
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
    const text = tooltipTextOf(el);
    if (!text) { concealTooltip(); return; }
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
    const text = tooltipTextOf(el);
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
