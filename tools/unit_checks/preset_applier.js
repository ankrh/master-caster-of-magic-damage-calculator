'use strict';

// The pure preset applier, exercised headlessly over the shipped fixture corpus.
//
// `presetToCardState` (`Calculator/card_state.js`, `data-scope="core"`) is the control-free twin of
// `applyPreset` (`ui_state.js`). The browser side of the comparison — that the two produce the
// *same* card states and globals, field for field — is `tests/preset-applier-f260.6.spec.js`,
// which needs a page. What this suite adds is the half a page cannot show cheaply:
//
//  1. every fixture in the corpus resolves, projects and derives with no DOM at all;
//  2. the two fail-loud asserts halt on exactly the fixtures they halt on today, which is **none**
//     of them, and are nonetheless *live* on the corpus rather than vacuous: a fixture that
//     declares the ranged-mode withdrawal halts when the declaration is taken away, and one that
//     does not declare it halts when the declaration is added;
//  3. every halt the applier states is reachable, with the message it states.
//
// (2) is the assertion with teeth. `assertPresetRangedMode` reads side a's *derived* record, so it
// is the one rule in the applier that can only be checked after a full projection — and an applier
// that ordered its steps wrongly would still run, still derive, and simply stop noticing.

const { assert, assertEqual, evalInContext } = require('./assertions');
const { loadPresetContext, defaultSelectedVersion } = require('../calculator_sources');

// The version a fixture that names none is applied under. `applyPreset` reads the version select
// for it, whose initial value is the page's default — read from `index.html` rather than restated
// here, so this family and the gate cannot disagree about where the corpus starts (F260.10).

// Run one expression in the preset context and report whether it threw, and with what.
function halts(context, expression) {
  try {
    evalInContext(context, expression);
    return null;
  } catch (err) {
    return String(err.message || err);
  }
}

function runPresetApplierChecks() {
  const context = loadPresetContext();
  // The two page inputs `applyPreset` reads off the page and the applier takes as options: the
  // selected version, and the TEST_TREE group-version map. The roster is not among them — the
  // applier reads `VERSION_DATA` itself through `rosterRecordsForVersion`, so there is no provider
  // for a caller to get wrong (F260.6 review, finding 5).
  evalInContext(context, `
    var __presetVersions = presetVersionsFromTestTree(TEST_TREE);
    var __apply = (name, preset, extra) => presetToCardState(name, preset, Object.assign({
      version: ${JSON.stringify(defaultSelectedVersion())},
      presetVersions: __presetVersions,
    }, extra || {}));
  `);

  const names = Object.keys(evalInContext(context, 'PRESETS'));
  assert(names.length > 1000,
    `The preset corpus is ${names.length} fixtures, which is too few to be the shipped one`);

  // (1) Every fixture, applied and both sides derived, with no DOM.
  const summary = evalInContext(context, `(() => {
    const report = { applied: 0, failures: [], versions: {}, roster: 0, withdrawn: [], ticked: [] };
    for (const [name, preset] of Object.entries(PRESETS)) {
      try {
        const state = __apply(name, preset);
        for (const side of ['a', 'b']) {
          deriveUnitStats(cardStateToDerivationInput(state[side], state.globals));
        }
        // The globals gating pass really ran: nothing the version disallows is left on.
        for (const field of Object.keys(state.globals)) {
          if (field === 'version' || field === 'perSide') continue;
          if (globalEnchantmentAllowedForVersion(field, state.version)) continue;
          if (state.globals[field] !== false) {
            report.failures.push(name + ': global ' + field + ' survived the gating pass');
          }
        }
        // The ability gating pass really ran, on both sides.
        for (const side of ['a', 'b']) {
          for (const abil of abilityUiDefs()) {
            if (!abilityVersionGated(abil, state.version)) continue;
            const cleared = versionGatedClearedValue(abil);
            if (cleared === undefined) continue;
            const held = state[side].abilities[abil.uiKey || abil.key];
            if (held !== cleared) {
              report.failures.push(name + ' side ' + side + ': gated ' + abil.key
                + ' holds ' + JSON.stringify(held));
            }
          }
        }
        // Ranged mode never survives a record with no conventional ranged attack.
        const sideA = deriveUnitStats(cardStateToDerivationInput(state.a, state.globals));
        if (state.globals.rangedCheck && !hasConventionalRangedAttack(sideA)) {
          report.failures.push(name + ': ranged mode survived the withdrawal');
        }
        // And it is on exactly where the fixture asked for it and the record allows it.
        if (state.globals.rangedCheck !== (!!preset.rangedCheck && hasConventionalRangedAttack(sideA))) {
          report.failures.push(name + ': ranged mode disagrees with the fixture and the record');
        }
        report.versions[state.version] = (report.versions[state.version] || 0) + 1;
        if (preset.aUnitName || preset.bUnitName) report.roster++;
        if (preset.rangedModeWithdrawn === true) report.withdrawn.push(name);
        else if (preset.rangedCheck) report.ticked.push(name);
        report.applied++;
      } catch (err) {
        report.failures.push(name + ': ' + String(err.message || err));
      }
    }
    return report;
  })()`);

  assertEqual(summary.failures.length, 0,
    `Every shipped fixture applies, projects and derives headlessly: ${summary.failures.slice(0, 5).join(' | ')}`);
  assertEqual(summary.applied, names.length,
    'Every fixture in the corpus was applied');
  assert(summary.roster > 0, 'The corpus exercises the roster-unit path');
  assert(Object.keys(summary.versions).length === 5,
    `The corpus exercises all five versions, not ${Object.keys(summary.versions).join(', ')}`);

  // (2) The ranged-mode assert is live on the corpus, in both directions.
  assert(summary.withdrawn.length > 0,
    'Some fixture declares rangedModeWithdrawn, or this direction proves nothing');
  assert(summary.ticked.length > 0,
    'Some fixture states rangedCheck without the withdrawal, or this direction proves nothing');
  for (const name of summary.withdrawn) {
    const message = halts(context,
      `(() => { const p = Object.assign({}, PRESETS[${JSON.stringify(name)}]);
        delete p.rangedModeWithdrawn; return __apply(${JSON.stringify(name)}, p); })()`);
    assert(message !== null && message.includes('carries no conventional ranged attack'),
      `'${name}' declares the withdrawal, so dropping the declaration must halt (got ${message})`);
  }
  for (const name of summary.ticked) {
    const message = halts(context,
      `__apply(${JSON.stringify(name)}, Object.assign({}, PRESETS[${JSON.stringify(name)}],
        { rangedModeWithdrawn: true }))`);
    assert(message !== null && message.includes('rangedModeWithdrawn: true, but'),
      `'${name}' keeps ranged mode, so claiming the withdrawal must halt (got ${message})`);
  }

  // The declared-but-not-true form, and the caller's own exemption.
  assert((halts(context,
    `__apply('probe', { rangedCheck: true, rangedModeWithdrawn: 'false' })`) || '')
    .includes('and the only value it takes is true'),
    'A rangedModeWithdrawn that is not `true` halts rather than being coerced');
  assertEqual(halts(context,
    `__apply('probe', { rangedCheck: true }, { origin: 'ablation-probe' })`), null,
    'An ablation probe is exempt from the ranged-mode assert');
  assert((halts(context, `__apply('probe', {}, { origin: 'harness' })`) || '')
    .includes('names no caller context this build defines'),
    'An origin this build does not define halts');

  // (3) Every other halt the applier states, each reached once.
  const reachable = [
    ['names no fixture', `presetToCardState('probe', null, {})`,
      'which is not a preset object'],
    ['names no preset name', `presetToCardState('', {}, {})`, 'which is not a name'],
    ['resolves no version', `presetToCardState('probe', {}, { version: 'mom_9.99' })`,
      'which names none of'],
    ['states a foreign DOS field under a modern version',
      `__apply('probe', { version: 'com2_1.05.11', a: { rtb: 4, rtbType: 'missile' } })`,
      'carries the modern unit record'],
    ['states a foreign modern field under a DOS version',
      `__apply('probe', { a: { hitChance: 30 } })`, 'carries the DOS unit record'],
    ['names a roster unit no version carries',
      `__apply('probe', { aUnitName: 'Nonesuch' })`, 'is not in the mom_1.31 roster'],
    ['states a projectile the modern control does not offer',
      `__apply('probe', { version: 'com2_1.05.11',
        a: { modernAttacks: { ranged: { strength: 4, type: 'trebuchet' } } } })`,
      'names no type the control offers'],
    ['states a shared-slot type neither family has',
      `__apply('probe', { a: { rtbType: 'trebuchet' } })`, 'names no type the shared slot offers'],
    ['names a side Eternal Night cannot be on',
      `__apply('probe', { eternalNight: 'both' })`, 'which is neither attacker nor defender'],
    ['states a base race that is not a string',
      `__apply('probe', { a: { identity: { baseRace: { name: 'High Men' } } } })`,
      'which is not a string'],
    ['states a special unit this build does not define',
      `__apply('probe', { a: { identity: { specialUnit: 'chimera' } } })`,
      'chimera'],
  ];
  for (const [what, expression, fragment] of reachable) {
    const message = halts(context, expression);
    assert(message !== null && message.includes(fragment),
      `A preset that ${what} halts naming it (got ${JSON.stringify(message)})`);
  }

  // Three branches of `applyPreset`'s globals tail no shipped fixture reaches: the legacy
  // `enchLightDark` single-select, the fixture-level `cityWalls` that side b falls back to, and
  // the `eternalNight` side token. Measured over the corpus, all three are dead — so the
  // browser comparison spec cannot speak for them at all, and a wrong translation would ship
  // silently until the first fixture used one. They are exercised here instead.
  const light = evalInContext(context,
    `__apply('probe', { enchLightDark: 'trueLight' }).globals`);
  assertEqual(light.trueLight, true, 'The legacy enchLightDark token still lights the battlefield');
  assertEqual(light.darkness, false, 'and does not also bring darkness');
  assertEqual(evalInContext(context,
    `__apply('probe', { enchLightDark: 'darkness' }).globals.darkness`), true,
    'The legacy enchLightDark token still darkens the battlefield');
  assertEqual(evalInContext(context,
    `__apply('probe', { trueLight: true, enchLightDark: 'darkness' }).globals.trueLight`), true,
    'and never clears an explicit trueLight beside it');

  const walls = evalInContext(context, `__apply('probe', { cityWalls: '3' })`);
  assertEqual(walls.b.cityWalls, '3', 'A fixture-level cityWalls is the defender\'s');
  assertEqual(walls.a.cityWalls, 'none', 'and never the attacker\'s');
  assertEqual(evalInContext(context,
    `__apply('probe', { cityWalls: '3', b: { cityWalls: '1' } }).b.cityWalls`), '1',
    'and side b\'s own statement outranks it');

  // Eternal Night's control sits on one side's panel, so the token picks a card, not a global.
  // `mom_1.31` is used because the ability gate admits the control in every version.
  for (const [token, owner, other] of [['attacker', 'a', 'b'], ['defender', 'b', 'a']]) {
    const night = evalInContext(context,
      `__apply('probe', { eternalNight: ${JSON.stringify(token)} })`);
    assertEqual(night[owner].abilities.eternalNight, true,
      `eternalNight: '${token}' ticks side ${owner}`);
    assertEqual(night[other].abilities.eternalNight, false,
      `eternalNight: '${token}' leaves side ${other} alone`);
    // The projection reads the *enemy's* entry, so the globals record must agree with the card.
    assertEqual(night.globals.perSide[owner].eternalNight, true,
      `and the globals record carries it on side ${owner}`);
  }

  // The roster path's overlay is narrow on purpose: only `source === 'enchantment'` defs, because
  // a roster selection has just restated every innate ability row from the record and those stay
  // roster-owned. No shipped fixture names an innate key beside a roster unit, so the corpus
  // cannot speak for the narrowing — a fixture that could edit the record it named would ship
  // silently. Both directions are asserted: the innate row keeps the record's value, the
  // enchantment row takes the fixture's.
  //
  // A **shared** key is used for it — one of `SHARED_ABILITY_KEYS`, where an ability and an
  // enchantment carry the same `key` and the enchantment's control is `enchantment_<key>`. That is
  // the case the fixture's addressing decides: the fixture names `key`, so the overlay must reach
  // the enchantment control through the def rather than by looking the fixture up under the
  // control's own `uiKey`. Written the other way round the overlay finds nothing and the
  // enchantment stays off, which the F260.6 review found neither suite could tell apart while a
  // non-shared key was used here.
  const overlay = evalInContext(context, `(() => {
    const version = 'mom_1.31';
    const unit = Object.values(VERSION_DATA[version]).find(u => u.name === 'Hell Hounds');
    const parsed = parseAbilitiesFromUnit(unit);
    const shared = [...SHARED_ABILITY_KEYS];
    const pick = source => abilityUiDefs().find(def => def.source === source && def.type === 'bool'
      && shared.includes(def.key)
      && !abilityVersionGated(def, version) && !parsed[def.key]);
    const innate = pick('ability');
    const ench = pick('enchantment');
    if (!innate || !ench || innate.key !== ench.key) {
      throw new Error('preset_applier: no shared ability/enchantment key pair to test the '
        + 'overlay with (ability ' + (innate && innate.key) + ', enchantment '
        + (ench && ench.key) + ')');
    }
    const state = __apply('probe', { version, aUnitName: unit.name,
      a: { abilities: { [ench.key]: true } } });
    return {
      key: ench.key, enchUiKey: ench.uiKey || ench.key,
      innateHeld: state.a.abilities[innate.uiKey || innate.key],
      enchHeld: state.a.abilities[ench.uiKey || ench.key],
    };
  })()`);
  assert(overlay.enchUiKey !== overlay.key,
    `The overlay is tested on a shared key, whose enchantment control is a separate one `
    + `(got '${overlay.enchUiKey}' for key '${overlay.key}')`);
  assertEqual(overlay.innateHeld, false,
    `A roster fixture naming '${overlay.key}' does not overwrite the record's innate ability`);
  assertEqual(overlay.enchHeld, true,
    `but does land the enchantment control '${overlay.enchUiKey}' the same key names`);

  // Golem's identity derives Resist Elements, and no shipped fixture names a special unit at all
  // (F260.5), so this is the only place the applier's copy of that rule is exercised.
  const golem = evalInContext(context,
    `__apply('probe', { version: 'com2_1.05.11', a: { identity: { specialUnit: 'golem' } } })`);
  assertEqual(golem.a.identity.specialUnit, 'golem', 'A modern fixture may name Golem');
  assertEqual(golem.a.abilities.elemArmor, 'resistElements',
    'and Golem derives Resist Elements on the card the fixture states');
  assertEqual(golem.b.abilities.elemArmor, 'none',
    'while the side that did not name it keeps its own Elements value');

  // `updateUnitLock`'s loadout reset. It shows only on the roster path — a custom side's
  // `level`/`weapon` are restated from the fixture, so the reset has nothing to undo there — and
  // only for a fixture naming no level of its own, since the fixture's level is applied after it.
  const locks = evalInContext(context, `(() => {
    const version = 'com2_warlord_1.5.12.9';
    const records = Object.values(VERSION_DATA[version]);
    const identity = u => createRosterUnitIdentity(version, u);
    const fantastic = records.find(u => identity(u).baseFantastic && !identity(u).isHero);
    const normal = records.find(u => !identity(u).baseFantastic && !identity(u).isHero);
    const base = () => ({
      a: Object.assign(presetDefaultCardState('a', version), { level: 'elite' }),
      b: presetDefaultCardState('b', version),
    });
    const run = unit => __apply('probe',
      { version, aUnitName: unit.name, a: {} }, { base: base() }).a.level;
    return {
      fantastic: fantastic.name, normal: normal.name,
      fantasticLevel: run(fantastic), normalLevel: run(normal),
    };
  })()`);
  assertEqual(locks.fantasticLevel, 'normal',
    `A fantastic roster unit (${locks.fantastic}) has its level reset by the loadout lock`);
  assertEqual(locks.normalLevel, 'elite',
    `while a normal one (${locks.normal}) keeps the level the base state carried`);

  // The lock rule itself, which `loadoutLockState` (`ui_abilities.js`) now shares. The preset
  // applier cannot reach the Spirit Link branch — the enchantment overlay runs *after*
  // `updateUnitLock`, on the page as here, so a preset always computes its locks with the tick
  // cleared — but the page reaches it on every recalculation, so the rule is asserted directly.
  const rule = evalInContext(context, `(() => {
    const fantastic = { isHero: false, baseFantastic: true, specialUnit: 'none' };
    const plain = { isHero: false, baseFantastic: false, specialUnit: 'none' };
    return {
      warlordLinked: cardStateLoadoutLocks(fantastic, true, 'com2_warlord_1.5.12.9'),
      warlordPlain: cardStateLoadoutLocks(fantastic, false, 'com2_warlord_1.5.12.9'),
      com2Linked: cardStateLoadoutLocks(fantastic, true, 'com2_1.05.11'),
      zombies: cardStateLoadoutLocks(
        { isHero: false, baseFantastic: true, specialUnit: 'zombies' }, false, 'com2_1.05.11'),
      hero: cardStateLoadoutLocks(
        { isHero: true, baseFantastic: false, specialUnit: 'none' }, false, 'com2_1.05.11'),
      momPlain: cardStateLoadoutLocks(plain, false, 'mom_1.31'),
      com2Plain: cardStateLoadoutLocks(plain, false, 'com2_1.05.11'),
    };
  })()`);
  assertEqual(rule.warlordPlain.level, true, 'A fantastic creature has its level locked');
  assertEqual(rule.warlordLinked.level, false, 'and Spirit Link lifts that lock in Warlord');
  assertEqual(rule.com2Linked.level, true, 'but only in Warlord — CoM2 keeps the lock');
  assertEqual(rule.zombies.weapon, false, "Zombies' weapon slot stays unlocked");
  assertEqual(rule.warlordPlain.weapon, true, 'while another fantastic creature\'s is locked');
  assertEqual(rule.hero.level, true, 'A hero has level locked');
  assertEqual(rule.hero.weapon, true, 'and weapon locked');
  assertEqual(rule.momPlain.armor, true, 'Armor quality does not exist in MoM');
  assertEqual(rule.com2Plain.armor, false, 'and is free for an ordinary modern unit');
  assertEqual(rule.momPlain.level, false, 'A normal MoM unit still takes the experience ladder');

  // `chaosConjunction` is a globals field the derivation does not read — `resolveCombat` takes it
  // as an option — and it was missing from the globals model altogether until F260.6, so neither
  // the page's own producer nor the pure one stated it and nothing noticed (F260.6 review,
  // finding 1). It is asserted here in both directions, including the version gating a globals
  // field only gets by being on the required list.
  assertEqual(evalInContext(context,
    `__apply('probe', { version: 'com2_1.05.11', chaosConjunction: true })
      .globals.chaosConjunction`), true,
    'A modern fixture states Chaos Conjunction');
  assertEqual(evalInContext(context,
    `__apply('probe', { version: 'com2_1.05.11' }).globals.chaosConjunction`), false,
    'and a fixture that does not state it gets it off');
  assertEqual(evalInContext(context,
    `__apply('probe', { chaosConjunction: true }).globals.chaosConjunction`), false,
    'while a MoM fixture has it cleared by the globals gating pass');

  // The version switch's own loadout reset, which lands on the base state before the preset states
  // either side. The counter-example is the review's: a fantastic side holding `elite` under
  // Warlord with Spirit Link ticked, and a CoM2 preset naming an ordinary roster unit that
  // restates neither level nor weapon.
  const switched = evalInContext(context, `(() => {
    const from = 'com2_warlord_1.5.12.9';
    const to = 'com2_1.05.11';
    const base = () => ({
      a: Object.assign(presetDefaultCardState('a', from), {
        level: 'elite',
        identity: customCardIdentity({ baseFantastic: true }, from, 'probe'),
        abilities: Object.assign(presetDefaultCardState('a', from).abilities, { spiritLink: true }),
      }),
      b: presetDefaultCardState('b', from),
    });
    const unit = Object.values(VERSION_DATA[to]).find(u =>
      !createRosterUnitIdentity(to, u).baseFantastic && !createRosterUnitIdentity(to, u).isHero);
    const run = target => __apply('probe', { version: target, aUnitName: unit.name, a: {} },
      { version: from, base: base() }).a.level;
    return { unit: unit.name, crossed: run(to), same: run(from) };
  })()`);
  assertEqual(switched.crossed, 'normal',
    `Switching to a version where Spirit Link lifts no lock resets the inherited level `
    + `(${switched.unit})`);
  assertEqual(switched.same, 'elite',
    'while staying on Warlord leaves it standing, because no version switch runs');

  // A fixture naming a version-disallowed special unit does **not** halt: it clamps to `none`, the
  // way the page's own selector leaves it (F260.5). The two questions must keep their order.
  const clamped = evalInContext(context,
    `__apply('probe', { a: { identity: { specialUnit: 'golem' } } }).a.identity.specialUnit`);
  assertEqual(clamped, 'none',
    'A fixture naming a special unit the version disallows clamps rather than halting');
}

module.exports = { runPresetApplierChecks };
