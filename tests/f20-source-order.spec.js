const { test, expect } = require('@playwright/test');
const { openCalculator, expectNoConsoleErrors } = require('./helpers');

const F20_VERSIONS = [
  'mom_1.31',
  'mom_cp_1.60.00',
  'com_6.08',
  'com2_1.05.11',
  'com2_warlord_1.5.12.7',
];

const F20_PROBE_ABILITIES = {
  lucky: true, darkForce: true, heavenlyLight: true, endurance: true, discipline: true,
  animated: true, flameBlade: true, mysticSurge: true, lionheart: true, ironSkin: true,
  stoneSkin: true, landLinking: true, ccDefense: true, blackChannels: true,
  giantStrength: true, holyArmor: true, orihalcon: true, highPrayer: true, prayer: true,
  trueLight: true, blackPrayer: true, darkness: true, warpReality: true, vertigo: true,
  weakness: true, mindStorm: true, warpAttack: true, warpDefense: true, warpResist: true,
  shatter: true, guardian: true, survivalInstinct: true, reinforceMagic: true,
  innerPower: true, blazingEyes: true, blazingMarch: true, charmOfLife: true,
  badMoon: true, goodMoon: true,
  natureConjunction: true, tactician: true, spellWard: 'life', metalFires: true,
  rebuild: true, fieryFury: true, outlanderXenoveterinary: true,
  outlanderXenopsychology: true, outlanderRadio: true,
  outlanderBallisticsTraining: true, nausea: true, uphillBattle: true, soulFlay: true,
  eternalNight: true, greatUnbinding: true, plague: true, goblinPox: true, luckyStar: true,
  disheartenProphecy: true, wallOfFireGarrison: true, godsPlayDices: true,
  mechanical: true, mechanicalExpert: true, trueSight: true,
  berserkWarlord: true, rust: true, hurricane: true, favoredTerrain: true,
  colossalStrength: true, vampirism: true, shadowStrike: true, psychoForce: true,
  pneumaField: true, energyBeamWeapons: true, blazeOfGlory: true, beatOfSwiftness: true,
  hierophany: true, channeler: true, militaryWorkshop: true, rocketry: true,
};

// Independent source-order anchors from the checked-in DOS ledgers and CoM2 region map.
// These deliberately do not come from statChain(), so a copied or misordered chain cannot make
// this regression pass by agreeing with itself.
//
// An anchor is a write the named build makes. The CoM 1 list used to carry `discipline`,
// `badMoon`, `goodMoon` and `natureConjunction`, which are Caster.exe writes with no CoM 1
// counterpart (PROVENANCE cites com2_1.05.11/com2_warlord only; their controls are the
// `CoM2 & Warlord` subgroup). They anchored nothing in the CoM 1 ledger and only appeared in
// its trace as skipped visits to steps the binary does not contain — which M9's canonical
// version scope now filters out before composition.
const F20_SOURCE_ANCHORS = {
  'mom_1.31': {
    c: ['level', 'lucky', 'weapon', 'chaosSurge', 'holyWeapon',
      'blackChannels', 'ironSkin', 'flameBlade', 'giantStrength',
      'chaosChannels:armor', 'lionheart', 'holyArmor',
      'berserk', 'nodeAura', 'highPrayer', 'trueLight', 'darkness',
      'warpReality', 'blackPrayer', 'vertigo', 'weakness',
      'warpAttack', 'warpDefense', 'warpResist', 'shatter'],
  },
  'mom_cp_1.60.00': {
    c: ['level', 'lucky', 'weapon', 'chaosSurge', 'blackChannels', 'ironSkin',
      'flameBlade', 'giantStrength',
      'chaosChannels:armor', 'lionheart', 'holyArmor',
      'berserk', 'holyWeapon', 'nodeAura',
      'highPrayer', 'trueLight', 'darkness', 'warpReality',
      'blackPrayer', 'vertigo', 'weakness', 'warpAttack',
      'warpDefense', 'warpResist', 'shatter'],
  },
  'com_6.08': {
    // CoM 1's BU_Apply_Specials layout: Lionheart com1:0x8F660, Iron Skin 0x8F71F, the
    // Chaos Channels armor mutation 0x8F735, Land Link 0x8F75C, then Mystic Surge's
    // stat-writing half 0x8F795, then Holy Armor 0x8F7C1.
    c: ['level', 'lucky', 'weapon', 'endurance', 'animated',
      'flameBlade', 'lionheart',
      'ironSkin', 'chaosChannels:armor',
      'landLinking', 'mysticSurge',
      'holyArmor', 'focusMagic',
      'orihalcon', 'holyWeapon', 'chaosSurge',
      'survivalInstinct', 'nodeAura', 'highPrayer',
      'blazingMarch',
      'warpReality', 'blackPrayer', 'guardian',
      'heavenlyLight',
      'vertigo', 'weakness',
      'warpAttack', 'warpDefense', 'warpResist', 'shatter',
      'darkness', 'supremeLight', 'realmWard', 'tactician',
      'eternalNight:enemyResistance'],
  },
  'com2_1.05.11': {
    c: ['level', 'focusMagic', 'lucky', 'darkForce',
      'heavenlyLight',
      'weapon', 'endurance', 'discipline',
      'chaosChannels:armor', 'animated', 'flameBlade',
      'mysticSurge', 'lionheart', 'ironSkin', 'landLinking',
      'holyArmor', 'orihalcon', 'holyWeapon',
      'chaosSurge', 'survivalInstinct', 'blazingEyes', 'reinforceMagic',
      'eternalNight:enemyResistance', 'charmOfLife',
      'nodeAura', 'badMoon', 'goodMoon', 'natureConjunction', 'highPrayer',
      'blazingMarch', 'warpReality', 'blackPrayer',
      'darkness', 'guardian', 'vertigo', 'weakness',
      'warpAttack', 'warpDefense', 'warpResist', 'shatter', 'spellWard', 'tactician'],
  },
  'com2_warlord_1.5.12.7': {
    b: ['marionette:stats', 'marionette:rangedType',
      'fieryFury', 'natureLink', 'outlanderXenoveterinary',
      'bombsGrenades', 'upgradedExplosive:ranged', 'upgradedExplosive:fireBreath',
      'outlanderBallisticsTraining', 'outlanderXenopsychology', 'outlanderRadio',
      'nausea', 'uphillBattle', 'soulFlay', 'eternalNight:poorVision',
      'greatUnbinding', 'prayer', 'trueLight', 'plague', 'goblinPox',
      'luckyStar', 'disheartenProphecy', 'wallOfFire:garrison', 'godsPlayDices'],
    c: ['level', 'focusMagic', 'lucky', 'darkForce',
      'heavenlyLight',
      'weapon', 'endurance', 'discipline', 'chaosChannels:armor', 'animated',
      'flameBlade', 'mysticSurge', 'lionheart',
      'ironSkin', 'landLinking',
      'holyArmor', 'orihalcon', 'holyWeapon',
      'chaosSurge', 'survivalInstinct', 'blazingEyes', 'reinforceMagic',
      'eternalNight:enemyResistance', 'charmOfLife', 'nodeAura', 'badMoon', 'goodMoon',
      'natureConjunction', 'highPrayer', 'blazingMarch',
      'warpReality', 'blackPrayer', 'darkness', 'guardian', 'vertigo',
      'weakness', 'warpAttack', 'warpDefense', 'warpResist',
      'shatter', 'spellWard', 'tactician'],
    d: ['mechanicalExpert', 'weakness', 'trueSight',
      'flameBlade', 'berserkWarlord', 'rust', 'hurricane',
      'favoredTerrain', 'colossalStrength', 'vampirism:transfer', 'shadowStrike:thrown',
      'psychoForce', 'pneumaField', 'energyCannonThreshold', 'blazeOfGlory',
      'beatOfSwiftness', 'hierophany'],
  },
};

const F20_WARLORD_NORMAL_ANCHORS = {
  ...F20_SOURCE_ANCHORS['com2_warlord_1.5.12.7'],
  b: F20_SOURCE_ANCHORS['com2_warlord_1.5.12.7'].b
    .filter(id => id !== 'marionette:stats' && id !== 'marionette:rangedType'),
  d: F20_SOURCE_ANCHORS['com2_warlord_1.5.12.7'].d
    .filter(id => id !== 'rust'),
};

const F20_WARLORD_MARIONETTE_ANCHORS = {
  ...F20_SOURCE_ANCHORS['com2_warlord_1.5.12.7'],
  d: F20_SOURCE_ANCHORS['com2_warlord_1.5.12.7'].d
    .filter(id => id !== 'rust'),
};

function f20Anchors(version, scenario) {
  if (version !== 'com2_warlord_1.5.12.7') return F20_SOURCE_ANCHORS[version];
  return scenario === 'marionette'
    ? F20_WARLORD_MARIONETTE_ANCHORS
    : F20_WARLORD_NORMAL_ANCHORS;
}

function expectSubsequence(actual, expected, label) {
  let next = 0;
  for (const id of actual) {
    if (id === expected[next]) next += 1;
  }
  expect(next, label).toBe(expected.length);
}

test('F20 covers every represented b/c/d step in source order for all five versions', async ({ page }) => {
  const errors = await openCalculator(page);
  const reports = await page.evaluate(({ versions, probeAbilities }) => {
    const makeInput = (version, scenario) => ({
      prefix: 'a', version,
      identity: version === 'com2_warlord_1.5.12.7' && scenario === 'marionette'
        ? createUnitIdentity({
            version, heroTypeId: 48, isHero: true, baseRace: 'High Men',
            baseFantastic: false, specialUnit: 'none',
          })
        : createCustomUnitIdentity(version, {
            baseRace: 'High Men', baseFantastic: false, specialUnit: 'chosen',
          }),
      figs: 1, atk: 5, rtb: 4, rtbType: 'missile', def: 6, res: 8, hp: 7,
      // A CoM2/Warlord record states the attack on its own channel; the DOS versions state the
      // same attack on the shared slot (`SPEC.md`, *Attack channels on the card*).
      ...(version.startsWith('com2')
        ? { modernAttacks: { ranged: { strength: 4, type: 'missile' } } } : {}),
      level: 'normal', weapon: 'normal', armor: 'normal',
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
      cityWalls: 'none', nodeAura: 'life', chaosSurge: 1,
      guidingBeaconAura: 2, divineBarrierAura: 2, soulLinkerAura: 2,
      realmWard: 'life', abilities: { ...probeAbilities },
    });
    return Object.fromEntries(versions.map(version => {
      const scenarios = version === 'com2_warlord_1.5.12.7'
        ? ['normal', 'marionette'] : ['default'];
      return [version, Object.fromEntries(scenarios.map(scenario => {
        const report = deriveUnitStats(makeInput(version, scenario));
        const chain = statChain(version).map(entry => ({ ...entry }));
        return [scenario, {
          chain,
          statTrace: report.statTrace,
          executionTrace: report.statExecutionTrace,
          enumerableExecutionTrace: Object.keys(report).includes('statExecutionTrace'),
          hasExecutionTrace: Object.prototype.hasOwnProperty.call(report, 'statExecutionTrace'),
        }];
      }))];
    }));
  }, { versions: F20_VERSIONS, probeAbilities: F20_PROBE_ABILITIES });

  expect(Object.keys(reports).sort()).toEqual([...F20_VERSIONS].sort());
  for (const version of F20_VERSIONS) {
    for (const [scenario, report] of Object.entries(reports[version])) {
      const label = scenario === 'default' ? version : `${version}/${scenario}`;
      const { chain, statTrace, executionTrace } = report;
      const chainKeys = chain.map(entry => entry.key);
      const chainIds = phase => chain.filter(entry => entry.phase === phase)
        .map(entry => entry.id);
      expect(Array.isArray(executionTrace), label).toBe(true);
      expect(executionTrace.length, label).toBeGreaterThan(0);
      expect(report.hasExecutionTrace, label).toBe(true);
      expect(report.enumerableExecutionTrace, label).toBe(false);
      expect(statTrace.every((event, index) => event.traceOrder === index), label).toBe(true);
      expect(executionTrace.every((event, index) => event.traceOrder === index
        && event.executionOrder === index
        && ['applied', 'skipped'].includes(event.status)), `${label} complete trace`).toBe(true);

      // The chain covers every phase now, so the whole executed sequence is checked against
      // it, not only the three regions a manifest used to cover.
      const executedKeys = executionTrace.map(event => `${event.phase}:${event.id}`);
      expect(executedKeys.every(key => chainKeys.includes(key)), `${label} chain coverage`).toBe(true);
      expect(new Set(executedKeys).size, `${label} duplicate executed keys`).toBe(executedKeys.length);
      expect(executionTrace.every(event => Number.isInteger(event.sourceOrder)),
        `${label} chain annotations`).toBe(true);
      expect(executionTrace.every(event =>
        event.sourceOrder === chainKeys.indexOf(`${event.phase}:${event.id}`)),
      `${label} chain ranks`).toBe(true);
      expect(executionTrace.every((event, index) => index === 0
        || event.sourceOrder > executionTrace[index - 1].sourceOrder),
      `${label} increasing chain ranks`).toBe(true);

      const represented = executionTrace.filter(event => ['b', 'c', 'd'].includes(event.phase));
      // Keyed by `phase:id` like every other comparison here: one enchantment may write in two
      // regions of one engine (Warlord's `b:tactician` clawback and `c:tactician` grant), so a
      // bare id would let a write represented in one region claim a place in the other's order.
      const representedKeys = represented.map(event => `${event.phase}:${event.id}`);
      for (const phase of ['b', 'c', 'd']) {
        const actual = represented.filter(event => event.phase === phase);
        const expected = chainIds(phase)
          .filter(id => representedKeys.includes(`${phase}:${id}`));
        expect(actual.map(event => event.id), `${label} ${phase} source order`).toEqual(expected);
        expectSubsequence(actual.map(event => event.id),
          (f20Anchors(version, scenario)[phase]) || [],
          `${label} ${phase} independent source anchors`);
      }

      // Also `phase:id`: Warlord skips the `b:tactician` clawback on a non-hero while applying
      // the `c:tactician` grant, and those are two writes of one enchantment, not one write.
      const skippedKeys = new Set(executionTrace
        .filter(event => event.status === 'skipped').map(event => `${event.phase}:${event.id}`));
      expect(statTrace.some(event => skippedKeys.has(`${event.phase}:${event.id}`)),
        `${label} sparse skipped projection`).toBe(false);

      // The public trace carries the identity conversions beside every other write, so it is the
      // place a represented b/c/d write could escape a manifest by living in another sequence.
      const tracedRepresented = statTrace.filter(event => ['b', 'c', 'd'].includes(event.phase));
      expect(tracedRepresented.every(event => chainKeys.includes(`${event.phase}:${event.id}`)),
        `${label} public trace chain coverage`).toBe(true);
      expect(tracedRepresented.every(event => Number.isInteger(event.sourceOrder)),
        `${label} public trace source annotations`).toBe(true);

      if (version !== 'com2_warlord_1.5.12.7') {
        expect(represented.some(event => event.phase === 'b' || event.phase === 'd'), label).toBe(false);
        expect(tracedRepresented.some(event => event.phase === 'b' || event.phase === 'd'),
          `${label} public trace has no Warlord-hook write`).toBe(false);
      }
    }
  }
  expectNoConsoleErrors(errors);
});

test('F20 keeps multi-field writes atomic while the public trace stays sparse', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const input = {
      prefix: 'a', version: 'com2_1.05.11',
      identity: createCustomUnitIdentity('com2_1.05.11', {
        baseRace: 'High Men', baseFantastic: false, specialUnit: 'chosen',
      }),
      figs: 1, atk: 5, rtb: 4, rtbType: 'missile', def: 6, res: 8, hp: 7,
      modernAttacks: { ranged: { strength: 4, type: 'missile' } },
      level: 'normal', weapon: 'normal', armor: 'normal',
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
      cityWalls: 'none', nodeAura: 'none', abilities: { destiny: true },
    };
    const destinyReport = deriveUnitStats(input);
    const rustReport = deriveUnitStats({
      ...input,
      version: 'com2_warlord_1.5.12.7',
      identity: createCustomUnitIdentity('com2_warlord_1.5.12.7', {
        baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
      }),
      rtbType: 'thrown',
      modernAttacks: { thrown: { strength: 4, type: 'thrown' } },
      abilities: { rust: true },
    });
    return {
      destiny: {
        statExecutionTrace: destinyReport.statExecutionTrace,
        statTrace: destinyReport.statTrace,
        enumerable: Object.keys(destinyReport).includes('statExecutionTrace'),
      },
      rust: {
        statExecutionTrace: rustReport.statExecutionTrace,
        statTrace: rustReport.statTrace,
        rustChainRank: statChain('com2_warlord_1.5.12.7')
          .findIndex(entry => entry.key === 'd:rust'),
      },
    };
  });

  // Destiny makes two writes at two positions and `phase:id` is what separates them: the
  // permanent `B.race`/`B.Fantastic` transformation at $0059A390 is `base:destiny`, and the
  // calculated-record package at $0059A471..$0059A633 — the atomic multi-field write these
  // assertions are about — is `c:destiny`.
  const destinyEvents = report.destiny.statExecutionTrace
    .filter(event => event.id === 'destiny' && event.phase === 'c');
  expect(destinyEvents).toHaveLength(1);
  expect(destinyEvents[0].status).toBe('applied');
  const destinyTrace = report.destiny.statTrace
    .filter(event => event.id === 'destiny' && event.phase === 'c');
  expect(destinyTrace).toHaveLength(1);
  // The modern record carries the Ranged channel's own strength field beside the card's shared
  // projection, so Destiny's one atomic write covers both (`SPEC.md`, *Attack channels on the
  // card*).
  expect(Object.keys(destinyTrace[0].changes).sort())
    .toEqual(['atk', 'def', 'hp', 'res', 'rtb', 'rtbRanged']);
  expect(report.destiny.statExecutionTrace.length).toBeGreaterThan(report.destiny.statTrace.length);
  expect(report.destiny.enumerable).toBe(false);

  const rustEvents = report.rust.statExecutionTrace.filter(event => event.id === 'rust');
  expect(rustEvents).toHaveLength(1);
  expect(rustEvents[0].status).toBe('applied');
  expect(rustEvents[0].sourceOrder).toBe(report.rust.rustChainRank);
  const rustTrace = report.rust.statTrace.filter(event => event.id === 'rust');
  expect(rustTrace).toHaveLength(1);
  // `SETSTAT(U,SAttack,…)` and `SETSTAT(U,SThrown,0,0)` are two writes of one Rust block
  // (`UnitCalc.CAS:493-503`); the type clear beside the emptied Thrown strength is the model's
  // stand-in for Warlord storing no Thrown type. One trace entry carries all of it — the modern
  // record's Thrown channel fields as well as the card's shared projection of them.
  expect(Object.keys(rustTrace[0].changes))
    .toEqual(['atk', 'rtb', 'rtbThrown', 'thrownType', 'thrownTypeThrown']);

  const inactive = await page.evaluate(() => {
    const report = deriveUnitStats({
      prefix: 'a', version: 'com2_1.05.11',
      identity: createCustomUnitIdentity('com2_1.05.11', {
        baseRace: 'High Men', baseFantastic: false, specialUnit: 'chosen',
      }),
      figs: 1, atk: 5, rtb: 4, rtbType: 'missile', def: 6, res: 8, hp: 7,
      modernAttacks: { ranged: { strength: 4, type: 'missile' } },
      level: 'normal', weapon: 'normal', armor: 'normal',
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0,
      cityWalls: 'none', nodeAura: 'none', abilities: {},
    });
    return { statExecutionTrace: report.statExecutionTrace, statTrace: report.statTrace };
  });
  expect(inactive.statExecutionTrace.find(event => event.id === 'destiny').status).toBe('skipped');
  expect(inactive.statTrace.some(event => event.id === 'destiny')).toBe(false);
  expectNoConsoleErrors(errors);
});

test('F20 accounts for the Warlord identity writes that land in b and d', async ({ page }) => {
  const errors = await openCalculator(page);
  const report = await page.evaluate(() => {
    const version = 'com2_warlord_1.5.12.7';
    const base = {
      prefix: 'a', version, figs: 1, atk: 5, rtb: 4, rtbType: 'missile',
      modernAttacks: { ranged: { strength: 4, type: 'missile' } },
      def: 6, res: 8, hp: 7, level: 'normal', weapon: 'normal', armor: 'normal',
      toHitMod: 0, toHitRtbMod: 0, toBlkMod: 0, cityWalls: 'none', nodeAura: 'none',
    };
    const channeler = deriveUnitStats({
      ...base,
      identity: createUnitIdentity({
        version, heroTypeId: 48, isHero: true, baseRace: 'High Men',
        baseFantastic: false, specialUnit: 'none',
      }),
      abilities: { channeler: true },
    });
    const spiritLink = deriveUnitStats({
      ...base,
      identity: createCustomUnitIdentity(version, {
        baseRace: 'Chaos', baseFantastic: true, specialUnit: 'none',
      }),
      abilities: { spiritLink: true },
    });
    // A unit that is not fantastic to begin with records both Spirit Link writes: the region-b
    // assert has something to change, where the fantastic fixture above makes it a traceless no-op.
    const spiritLinkNormal = deriveUnitStats({
      ...base,
      identity: createCustomUnitIdentity(version, {
        baseRace: 'High Men', baseFantastic: false, specialUnit: 'none',
      }),
      abilities: { spiritLink: true },
    });
    const pick = (unit, id) => unit.statTrace.find(event => event.id === id) || null;
    return {
      chain: statChain(version).map(entry => ({ ...entry })),
      baseChain: statChain('com2_1.05.11').map(entry => ({ ...entry })),
      channelerEvent: pick(channeler, 'marionetteChanneler'),
      channelerLedgerIds: channeler.statExecutionTrace.map(event => event.id),
      // Three steps carry the id `spiritLink` — the Warlord `base:` stat write and the two
      // identity writes — so this names the phase as well.
      spiritLinkEvent: spiritLink.statTrace
        .find(event => event.id === 'spiritLink' && event.phase === 'd') || null,
      spiritLinkNormalEvents: spiritLinkNormal.statTrace
        .filter(event => event.id === 'spiritLink' && 'fantastic' in event.changes)
        .map(event => ({ phase: event.phase, changes: event.changes })),
      otherStatPhaseD: spiritLink.statTrace
        .filter(event => event.phase === 'd' && event.id !== 'spiritLink')
        .map(event => ({ traceOrder: event.traceOrder, sourceOrder: event.sourceOrder })),
    };
  });

  const phaseIds = (chain, phase) => chain.filter(entry => entry.phase === phase)
    .map(entry => entry.id);
  const b = phaseIds(report.chain, 'b');
  const d = phaseIds(report.chain, 'd');
  expect(b.filter(id => id === 'marionetteChanneler')).toHaveLength(1);
  expect(b.indexOf('marionetteChanneler')).toBe(b.indexOf('marionette:stats') - 1);
  // UnitCalcPre.CAS writes Fantastic for Spirit Link at :30 and for a Channeler's Marionette at
  // :94, so Spirit Link heads the region.
  expect(b.filter(id => id === 'spiritLink')).toHaveLength(1);
  expect(b.indexOf('spiritLink')).toBe(0);
  expect(b.indexOf('spiritLink')).toBeLessThan(b.indexOf('marionetteChanneler'));
  expect(d.filter(id => id === 'spiritLink')).toHaveLength(1);
  expect(d.indexOf('spiritLink')).toBeGreaterThan(d.indexOf('shadowStrike:thrown'));
  expect(d.indexOf('spiritLink')).toBeLessThan(d.indexOf('psychoForce'));
  // Base CoM2 ships HALT stubs for both hooks, so neither region may appear there.
  expect(phaseIds(report.baseChain, 'b')).toEqual([]);
  expect(phaseIds(report.baseChain, 'd')).toEqual([]);
  // The chain also says which positions are transcribed and which are inherited.
  const allProvisional = phase => report.chain.filter(entry => entry.phase === phase)
    .every(entry => entry.provisional);
  expect(['b', 'c', 'd'].every(phase => !allProvisional(phase)),
    'the transcribed regions are not marked provisional').toBe(true);
  expect(['base', 'a', 'e'].every(phase => allProvisional(phase)),
    'the inherited regions are marked provisional').toBe(true);

  expect(report.channelerEvent).not.toBeNull();
  expect(report.channelerEvent.phase).toBe('b');
  expect(report.channelerEvent.sourceOrder)
    .toBe(report.chain.findIndex(entry => entry.key === 'b:marionetteChanneler'));
  expect(report.channelerEvent.changes.fantastic).toEqual({ from: false, to: true });
  // The complete stat ledger stays one-to-one with the stat sequence, and an identity
  // conversion is a step of that sequence like any other, so it is in the ledger (F163).
  expect(report.channelerLedgerIds).toContain('marionetteChanneler');

  // Both of Spirit Link's writes reach the trace, in the region order the two CAS files give
  // them: assert at UnitCalcPre.CAS:30, clear at UnitCalc.CAS:1306.
  expect(report.spiritLinkNormalEvents).toEqual([
    { phase: 'b', changes: { fantastic: { from: false, to: true } } },
    { phase: 'd', changes: { fantastic: { from: true, to: false } } },
  ]);

  expect(report.spiritLinkEvent).not.toBeNull();
  expect(report.spiritLinkEvent.phase).toBe('d');
  expect(report.spiritLinkEvent.sourceOrder)
    .toBe(report.chain.findIndex(entry => entry.key === 'd:spiritLink'));
  expect(report.spiritLinkEvent.changes.fantastic).toEqual({ from: true, to: false });
  // The clearing write executes where UnitCalc.CAS:1306 puts it: after every region-d write
  // the chain ranks ahead of it, and before every one it ranks behind. The divergence this
  // used to record — the pre-pass running it ahead of all of them — is gone with the pre-pass.
  const spiritLinkRank = report.chain.findIndex(entry => entry.key === 'd:spiritLink');
  expect(report.otherStatPhaseD.every(event =>
    (event.sourceOrder < spiritLinkRank) === (event.traceOrder < report.spiritLinkEvent.traceOrder)))
    .toBe(true);
  expectNoConsoleErrors(errors);
});

test('F20 rejects missing, duplicate, and malformed structural trace entries', async ({ page }) => {
  const errors = await openCalculator(page);
  const failures = await page.evaluate(() => {
    const step = id => ({ id, phase: 'c', writes: ['res'], apply: unit => { unit.res += 1; } });
    const shouldThrow = callback => {
      try { callback(); return false; } catch (error) { return !!error; }
    };
    const malformedTrace = [{
      id: 'a', source: { id: 'a', label: 'a' }, phase: 'c', order: 0,
      traceOrder: 1, changes: { res: { from: 1, to: 2, delta: 1 } }, sourceOrder: 0,
    }];
    const completeStep = { id: 'complete', phase: 'c', sourceOrder: 0 };
    const completeEvent = {
      id: 'complete', phase: 'c', order: 0, traceOrder: 0, executionOrder: 0, status: 'skipped',
    };
    const changedEvent = (id, sourceOrder, traceOrder) => ({
      id, phase: 'c', order: traceOrder, traceOrder, changes: { res: { from: 1, to: 2, delta: 1 } },
      sourceOrder,
    });
    const chain = (...entries) => entries.map(([phase, id, provisional = false]) =>
      ({ key: `${phase}:${id}`, phase, id, provisional }));
    return {
      missingChainEntry: shouldThrow(() => orderStatStepsBySource(
        [step('unlisted')], chain(['c', 'listed']))),
      duplicateStep: shouldThrow(() => orderStatStepsBySource(
        [step('same'), step('same')], chain(['c', 'same']))),
      duplicateChainEntry: shouldThrow(() => orderStatStepsBySource(
        [step('same')], chain(['c', 'same'], ['c', 'same']))),
      malformedPhase: shouldThrow(() => orderStatStepsBySource(
        [{ ...step('badPhase'), phase: 'toString' }], chain(['toString', 'badPhase']))),
      chainOutOfPhaseOrder: shouldThrow(() => orderStatStepsBySource(
        [], chain(['c', 'first'], ['b', 'second']))),
      chainEntryWithoutProvisional: shouldThrow(() => orderStatStepsBySource(
        [], [{ key: 'c:x', phase: 'c', id: 'x' }])),
      chainKeyDisagreeingWithPhase: shouldThrow(() => orderStatStepsBySource(
        [], [{ key: 'b:x', phase: 'c', id: 'x', provisional: false }])),
      badTraceOrder: shouldThrow(() => assertStatTraceOrder(malformedTrace)),
      missingSourceOrder: shouldThrow(() => assertStatTraceOrder(
        [completeEvent], { steps: [{ ...completeStep, sourceOrder: undefined }] })),
      wrongSourceOrder: shouldThrow(() => assertStatTraceOrder([
        changedEvent('first', 1, 0), changedEvent('second', 0, 1),
      ])),
      wrongExecutionOrder: shouldThrow(() => assertStatTraceOrder([
        { ...completeEvent, executionOrder: 1 },
      ], { steps: [completeStep] })),
    };
  });

  expect(failures).toEqual({
    missingChainEntry: true,
    duplicateStep: true,
    duplicateChainEntry: true,
    malformedPhase: true,
    chainOutOfPhaseOrder: true,
    chainEntryWithoutProvisional: true,
    chainKeyDisagreeingWithPhase: true,
    badTraceOrder: true,
    missingSourceOrder: true,
    wrongSourceOrder: true,
    wrongExecutionOrder: true,
  });
  expectNoConsoleErrors(errors);
});
