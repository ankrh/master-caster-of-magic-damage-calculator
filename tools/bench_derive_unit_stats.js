// Benchmark for deriveUnitStats. Run: node tools/bench_derive_unit_stats.js
//
// Why this exists: the R1 step runner allocates and indirects where the phase buckets did
// flat arithmetic, and deriveUnitStats is called once per roster unit per side when the
// matrix view is built — hundreds of calls for one click. Equivalence testing cannot see
// a slowdown, so it is measured here instead. Take a reading before a migration stage and
// after it; the number to watch is ns/call, not the absolute total.
//
// Performance was not a gate on R1 (Calculator/HISTORY.md) — this
// reports, it does not judge.

// The file list and load order come from index.html's <script> tags via the source manifest,
// so a benchmark reading always covers the same sources the page does.
const { loadCalculatorContext } = require('./calculator_sources');

function unitInput(overrides = {}) {
  return {
    prefix: 'a',
    version: 'com2_1.05.11',
    abilities: {},
    level: 'normal',
    weapon: 'normal',
    armor: 'normal',
    rtbType: 'none',
    unitType: 'normal',
    figs: 6,
    atk: 5,
    rtb: 0,
    def: 4,
    res: 6,
    hp: 3,
    dmg: 0,
    toHitMod: 0,
    toHitRtbMod: 0,
    toBlkMod: 0,
    cityWalls: 'none',
    nodeAura: 'none',
    trueLight: false,
    darkness: false,
    enemyEternalNight: false,
    rangedCheck: false,
    rangedDist: 1,
    warpReality: false,
    ...overrides,
  };
}

// A spread rather than one input: branch coverage is most of the cost, and the versions
// differ in how many effects are reachable at all. Warlord is the heavy case.
const CASES = [
  ['MoM plain melee', unitInput({ version: 'mom_1.31' })],
  ['CoM 1 warped, post-Warp tail non-empty', unitInput({
    version: 'com_6.08',
    level: 'elite',
    abilities: { warpAttack: true, warpDefense: true, supremeLight: true, tactician: true },
    unitType: 'fantastic_death',
  })],
  ['CoM2 ranged, levelled and equipped', unitInput({
    // `orihalcon` is the Armor Type control's only non-normal value; this case carried
    // `'mithril'`, a weapon material, so the equipped case measured no armour branch (F117).
    level: 'champion', weapon: 'adamantium', armor: 'orihalcon',
    rtbType: 'missile', rtb: 4, rangedCheck: true, rangedDist: 7,
    modernAttacks: { ranged: { strength: 4, type: 'missile' } },
    abilities: { holyWeapon: true, lionheart: true, prayer: true, holyArmor: true },
  })],
  ['Warlord kitchen sink', unitInput({
    version: 'com2_warlord_1.5.12.7',
    race: 'Orc', name: 'Orc Swordsmen',
    level: 'veteran', weapon: 'magic', armor: 'orihalcon',
    rtbType: 'thrown', rtb: 3,
    modernAttacks: { thrown: { strength: 3, type: 'thrown' } },
    abilities: {
      colossalStrength: true, shadowStrike: true, luckyStar: true, rally: true,
      ludusAgoge: true, plague: true, soulFlay: true, beatOfSwiftness: true,
      fieryFury: true, blazingMarch: true, giantStrength: true, uphillBattle: true,
    },
    poxHost: true, darkness: true,
  })],
  ['Warlord Outlander reforms', unitInput({
    version: 'com2_warlord_1.5.12.7',
    rtbType: 'missile', rtb: 5,
    modernAttacks: { ranged: { strength: 5, type: 'missile' } },
    abilities: {
      outlanderWizard: true, armorcladReform: true, heatPowerEngine: true,
      magitekEngineering: true, temporalEngineering: true, sailing: true,
      energyBeamWeapons: true, psychoConverter: true, pneumaReactor: true,
      ballisticsTraining: true, radio: true, explosive: true, militaryWorkshop: true,
      mechanical: true,
    },
  })],
];

function bench(ctx, iterations) {
  // Warm up so the reading is of optimized code, not of the interpreter.
  for (let i = 0; i < 2000; i++) {
    for (const [, input] of CASES) ctx.deriveUnitStats(input);
  }
  const rows = CASES.map(([label, input]) => {
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) ctx.deriveUnitStats(input);
    const ns = Number(process.hrtime.bigint() - start) / iterations;
    return { case: label, nsPerCall: Math.round(ns), callsPerSecond: Math.round(1e9 / ns) };
  });
  const total = rows.reduce((sum, row) => sum + row.nsPerCall, 0) / rows.length;
  return { iterations, rows, meanNsPerCall: Math.round(total) };
}

const iterations = Number(process.argv[2]) || 20000;
const result = bench(loadCalculatorContext(), iterations);
console.log(`deriveUnitStats — ${result.iterations} iterations per case`);
for (const row of result.rows) {
  console.log(`  ${String(row.nsPerCall).padStart(6)} ns/call  ${String(row.callsPerSecond).padStart(9)}/s  ${row.case}`);
}
console.log(`  mean ${result.meanNsPerCall} ns/call`);
