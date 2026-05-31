// Scope: asserts on deriveUnitStats and engine/combat HELPERS in isolation
// (stat derivation, buildToBlockContext, phase builders). Run: node tools/node_unit_checks.js
//
// This is NOT a way to evaluate PRESETS. Never reconstruct the applyPreset →
// readUnitStats → resolveCombat path here or in any Node script — that skips the
// DOM/calcKey layer and yields false failures. Evaluate PRESETS only via runTests()
// in the browser (see CLAUDE.md → Testing with Playwright).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
let assertionCount = 0;

function loadCalculatorContext() {
  const context = { console };
  vm.createContext(context);
  [
    'Calculator/units.js',
    'Calculator/units_warlord.js',
    'Calculator/data.js',
    'Calculator/engine.js',
    'Calculator/combat.js',
    'Calculator/stats.js',
  ].forEach(file => {
    const filePath = path.join(repoRoot, file);
    vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: file });
  });
  return context;
}

function assert(condition, message) {
  assertionCount += 1;
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  assertionCount += 1;
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertClose(actual, expected, message, epsilon = 1e-12) {
  assertionCount += 1;
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertDistSumsToOne(dist, message) {
  assert(Array.isArray(dist), `${message}: result is not an array`);
  const sum = dist.reduce((acc, p) => acc + p, 0);
  assertClose(sum, 1, `${message}: probability sum`);
}

function baseUnitInput(overrides = {}) {
  return {
    prefix: 'a',
    version: 'com2_1.5',
    abilities: {},
    level: 'normal',
    weapon: 'normal',
    armor: 'none',
    rtbType: 'none',
    unitType: 'normal',
    figs: 1,
    atk: 1,
    rtb: 0,
    def: 1,
    res: 1,
    hp: 1,
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
    chaosChannels: 'none',
    ...overrides,
  };
}

function runDeriveUnitStatsChecks(ctx) {
  const destiny = ctx.deriveUnitStats(baseUnitInput({
    abilities: { destiny: true },
    level: 'champion',
    rtbType: 'missile',
    figs: 2,
    atk: 3,
    rtb: 2,
    def: 1,
    res: 4,
    hp: 2,
  }));
  assertEqual(destiny.atk, 6, 'Destiny doubles base melee attack and strips level bonuses');
  assertEqual(destiny.rtb, 4, 'Destiny doubles base ranged attack and strips level bonuses');
  assertEqual(destiny.def, 5, 'Destiny adds 4 defense');
  assertEqual(destiny.res, 8, 'Destiny adds 4 resistance');
  assertEqual(destiny.hp, 4, 'Destiny doubles hit points');
  assertEqual(destiny.unitType, 'fantastic_life', 'Destiny changes unit type to fantastic Life');
  assertEqual(destiny.abilities.supernatural, true, 'Destiny grants Supernatural for combat');

  const innerPower = ctx.deriveUnitStats(baseUnitInput({
    abilities: { innerPower: true, fireImmunity: true },
    rtbType: 'fire',
    rtb: 1,
  }));
  assertEqual(innerPower.atk, 4, 'Inner Power eligible unit gains melee attack');
  assertEqual(innerPower.rtb, 4, 'Inner Power eligible unit gains breath attack');
  assertEqual(innerPower.def, 3, 'Inner Power eligible unit gains defense');
  assertEqual(innerPower.res, 3, 'Inner Power eligible unit gains resistance');
  assertEqual(innerPower.abilities.innerPower, true, 'Inner Power remains active when eligible');

  const ineligibleInnerPower = ctx.deriveUnitStats(baseUnitInput({
    abilities: { innerPower: true },
    rtbType: 'fire',
    rtb: 1,
  }));
  assertEqual(ineligibleInnerPower.atk, 1, 'Inner Power ineligible unit does not gain melee attack');
  assertEqual(ineligibleInnerPower.abilities.innerPower, false, 'Inner Power is disabled for ineligible units');

  const holyWeaponThrown = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.60',
    abilities: { holyWeapon: true },
    rtbType: 'thrown',
    rtb: 2,
  }));
  assertEqual(holyWeaponThrown.rtbToHitWpnBonus, 0, 'Holy Weapon thrown to-hit bonus is tracked separately from weapon bonus');
  assertClose(holyWeaponThrown.toHitRtb, 0.4, 'Holy Weapon boosts thrown to-hit outside MoM 1.31');

  const darknessDeath = ctx.deriveUnitStats(baseUnitInput({
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    darkness: true,
  }));
  assertEqual(darknessDeath.atk, 5, 'Darkness gives Death units +1 melee attack');
  assertEqual(darknessDeath.rtb, 3, 'Darkness gives Death units +1 ranged attack');
  assertEqual(darknessDeath.def, 4, 'Darkness gives Death units +1 defense');
  assertEqual(darknessDeath.res, 6, 'Darkness gives Death units +1 resistance');

  const trueLightDeath = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.60',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    trueLight: true,
  }));
  assertEqual(trueLightDeath.atk, 3, 'True Light gives Death units -1 melee attack in MoM');
  assertEqual(trueLightDeath.rtb, 1, 'True Light gives Death units -1 ranged attack in MoM');
  assertEqual(trueLightDeath.def, 2, 'True Light gives Death units -1 defense in MoM');
  assertEqual(trueLightDeath.res, 4, 'True Light gives Death units -1 resistance in MoM');

  const bothLightDark = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.60',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    trueLight: true,
    darkness: true,
  }));
  assertEqual(bothLightDark.atk, 4, 'True Light and Darkness cancel Death melee attack modifiers');
  assertEqual(bothLightDark.rtb, 2, 'True Light and Darkness cancel Death ranged attack modifiers');
  assertEqual(bothLightDark.def, 3, 'True Light and Darkness cancel Death defense modifiers');
  assertEqual(bothLightDark.res, 5, 'True Light and Darkness cancel Death resistance modifiers');

  const eternalNightDeathMoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.60',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    abilities: { eternalNight: true },
  }));
  assertEqual(eternalNightDeathMoM.atk, 5, 'Eternal Night uses normal Darkness melee attack in MoM');
  assertEqual(eternalNightDeathMoM.rtb, 3, 'Eternal Night uses normal Darkness ranged attack in MoM');
  assertEqual(eternalNightDeathMoM.def, 4, 'Eternal Night uses normal Darkness defense in MoM');
  assertEqual(eternalNightDeathMoM.res, 6, 'Eternal Night uses normal Darkness resistance in MoM');

  const enemyEternalNightNormalMoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'mom_1.60',
    unitType: 'normal',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightNormalMoM.res, 5, 'Enemy Eternal Night has no extra non-Death resistance penalty in MoM');

  const eternalNightDeath = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    eternalNight: true,
  }));
  assertEqual(eternalNightDeath.atk, 6, 'Eternal Night gives Death units +2 melee attack in CoM2');
  assertEqual(eternalNightDeath.rtb, 4, 'Eternal Night gives Death units +2 ranged attack in CoM2');
  assertEqual(eternalNightDeath.def, 5, 'Eternal Night gives Death units +2 defense in CoM2');
  assertEqual(eternalNightDeath.res, 6, 'Eternal Night gives Death units the normal +1 Darkness resistance in CoM2');

  const eternalNightDeathCoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08',
    unitType: 'fantastic_death',
    atk: 4,
    rtbType: 'missile',
    rtb: 2,
    def: 3,
    res: 5,
    abilities: { eternalNight: true },
  }));
  assertEqual(eternalNightDeathCoM.atk, 5, 'Eternal Night uses normal Darkness melee attack in CoM');
  assertEqual(eternalNightDeathCoM.rtb, 3, 'Eternal Night uses normal Darkness ranged attack in CoM');
  assertEqual(eternalNightDeathCoM.def, 4, 'Eternal Night uses normal Darkness defense in CoM');
  assertEqual(eternalNightDeathCoM.res, 6, 'Eternal Night uses normal Darkness resistance in CoM');

  const enemyEternalNightNormalCoM = ctx.deriveUnitStats(baseUnitInput({
    version: 'com_6.08',
    unitType: 'normal',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightNormalCoM.res, 4, 'Enemy Eternal Night gives non-Death normal units -1 resistance in CoM');

  const enemyEternalNightLifeCoM2 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_life',
    atk: 4,
    def: 3,
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightLifeCoM2.atk, 2, 'Enemy Eternal Night applies doubled Darkness attack penalty to Life units in CoM2');
  assertEqual(enemyEternalNightLifeCoM2.def, 1, 'Enemy Eternal Night applies doubled Darkness defense penalty to Life units in CoM2');
  assertEqual(enemyEternalNightLifeCoM2.res, 3, 'Enemy Eternal Night applies Darkness resistance plus enemy resistance penalty to Life units in CoM2');

  const enemyEternalNightDeathCoM2 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    unitType: 'fantastic_death',
    res: 5,
    enemyEternalNight: true,
  }));
  assertEqual(enemyEternalNightDeathCoM2.res, 6, 'Enemy Eternal Night does not apply the extra resistance penalty to Death units');
}

function runToBlockChecks(ctx) {
  const a = {
    toBlock: 0.4,
    abilities: { eldritchWeapon: true, mysticSurge: true },
    thrownType: 'thrown',
    rangedType: 'missile',
  };
  const b = {
    toBlock: 0.5,
    abilities: { eldritchWeapon: true, mysticSurge: true },
    thrownType: 'none',
    rangedType: 'none',
  };
  const result = ctx.buildToBlockContext(a, b, 0.05, 0.07);
  assertClose(result.bToBlockConventional, 0.43, 'Defender conventional block applies Vertigo');
  assertClose(result.bToBlockVsAAll, 0.33, 'Mystic Surge lowers defender block against all conventional attacks');
  assertClose(result.bToBlockVsAMelee, 0.23, 'Eldritch Weapon lowers defender melee block');
  assertClose(result.bToBlockVsAThrEW, 0.23, 'Eldritch Weapon lowers defender thrown block');
  assertClose(result.bToBlockVsARangedEW, 0.23, 'Eldritch Weapon lowers defender missile block');
  assertClose(result.aToBlockConventional, 0.35, 'Attacker conventional block applies Vertigo');
  assertClose(result.aToBlockVsBAll, 0.25, 'Opponent Mystic Surge lowers attacker block');
  assertClose(result.aToBlockVsBMelee, 0.15, 'Opponent Eldritch Weapon lowers attacker melee block');
}

function runPhaseChecks(ctx) {
  assertEqual(ctx.buildWallOfFirePhase(false, {}), null, 'Inactive Wall of Fire phase is null');
  const wallOfFire = ctx.buildWallOfFirePhase(true, {
    wofStr: 1,
    wofToHit: 1,
    aDefForImm: 0,
    aToBlock: 0,
    aHP: 1,
    aInvulnBonus: null,
  });
  const wofResult = wallOfFire.compute(0, 2, 2);
  assertDistSumsToOne(wofResult.dist, 'Wall of Fire distribution');
  assertEqual(wofResult.dist[2], 1, 'Wall of Fire deterministic smoke damage');
  assertEqual(wofResult.lifeStealEV, 0, 'Wall of Fire has no life steal');

  assertEqual(ctx.buildThrownPhase(false, {}), null, 'Inactive thrown phase is null');
  const thrown = ctx.buildThrownPhase(true, {
    a: { rtb: 2, hp: 1, toHitImmolation: 0.3 },
    b: { hp: 3 },
    aDoomsB: true,
    aBlackSleep: false,
    aToHitRtbVert: 0.3,
    bDefForThrown: 0,
    bToBlockVsAThrEW: 0,
    bInvulnBonus: null,
    bBlurChance: 0,
    blurBuggy: false,
    isCoM2: false,
    aMinDamageFromHits: null,
    aImmWithThrown: false,
    immStr: 0,
    bDefForImm: 0,
    bToBlockVsAAll: 0,
    aPoisonStrT: 0,
    aPoisonFailT: 0,
    aStoningFailT: 0,
    aLifeStealModT: null,
    bResDeath: 0,
    aHaste: false,
  });
  const thrownResult = thrown.compute(2, 2, 5);
  assertDistSumsToOne(thrownResult.dist, 'Thrown doom distribution');
  assertEqual(thrownResult.dist[4], 1, 'Thrown doom smoke damage');
  assertEqual(thrownResult.lifeStealEV, 0, 'Thrown doom without touch attacks has no life steal');

  const hastedThrown = ctx.buildThrownPhase(true, {
    a: { rtb: 1, hp: 1, toHitImmolation: 0.3 },
    b: { hp: 3 },
    aDoomsB: true,
    aBlackSleep: false,
    aToHitRtbVert: 0.3,
    bDefForThrown: 0,
    bToBlockVsAThrEW: 0,
    bInvulnBonus: null,
    bBlurChance: 0,
    blurBuggy: false,
    isCoM2: false,
    aMinDamageFromHits: null,
    aImmWithThrown: false,
    immStr: 0,
    bDefForImm: 0,
    bToBlockVsAAll: 0,
    aPoisonStrT: 0,
    aPoisonFailT: 0,
    aStoningFailT: 0,
    aLifeStealModT: null,
    bResDeath: 0,
    aHaste: true,
  });
  const hastedThrownResult = hastedThrown.compute(2, 2, 5);
  assertDistSumsToOne(hastedThrownResult.dist, 'Hasted thrown doom distribution');
  assertEqual(hastedThrownResult.dist[4], 1, 'Hasted thrown self-convolves damage');
}

function main() {
  const ctx = loadCalculatorContext();
  runDeriveUnitStatsChecks(ctx);
  runToBlockChecks(ctx);
  runPhaseChecks(ctx);
  console.log(JSON.stringify({ allPassed: true, total: assertionCount, failures: [] }));
}

try {
  main();
} catch (err) {
  console.error(err.stack || String(err));
  process.exit(1);
}
