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
    'Calculator/units_mom.js',
    'Calculator/units_com.js',
    'Calculator/units_com2.js',
    'Calculator/units_warlord.js',
    'Calculator/data.js',
    'Calculator/engine.js',
    'Calculator/steps.js',
    'Calculator/combat.js',
    'Calculator/stats.js',
  ].forEach(file => {
    const filePath = path.join(repoRoot, file);
    vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, { filename: file });
  });
  return context;
}

// `const`/`let` at the top level of a script are global *lexical* bindings, not properties
// of the context object — later scripts see them, but `ctx.NAME` does not. Reach those
// (HALT, STEP_PHASES, …) through the context's own evaluator.
function evalInContext(context, expression) {
  return vm.runInContext(expression, context);
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
  const modernChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    rtbType: 'missile',
    rtb: 7,
    modernAttacks: {
      ranged: { strength: 7, type: 'missile' },
      thrown: { strength: 3, type: 'thrown' },
      fireBreath: { strength: 5, type: 'fire' },
      lightningBreath: { strength: 4, type: 'lightning' },
    },
  }));
  assertEqual(modernChannels.rtb, 7, 'The legacy RTB projection remains unchanged during R3.2');
  assertEqual(modernChannels.modernAttacks.ranged.strength, 7, 'Modern Ranged is derived independently');
  assertEqual(modernChannels.modernAttacks.thrown.strength, 3, 'Modern Thrown is derived independently');
  assertEqual(modernChannels.modernAttacks.fireBreath.strength, 5, 'Modern Fire Breath is derived independently');
  assertEqual(modernChannels.modernAttacks.lightningBreath.strength, 4, 'Modern Lightning Breath is derived independently');

  const modernBlackpowder = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { outlanderWizard: true, rocketry: true, armorPiercing: true },
    rtbType: 'missile',
    rtb: 5,
    modernAttacks: {
      ranged: { strength: 5, type: 'missile' },
      thrown: { strength: 2, type: 'thrown' },
    },
  }));
  assertEqual(modernBlackpowder.modernAttacks.ranged.type, 'boulder',
    'Blackpowder transforms the modern Ranged channel without consuming Thrown');
  assertEqual(modernBlackpowder.modernAttacks.thrown.strength, 6,
    'Blackpowder independently transforms the modern Thrown channel');

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

  // Nature Link (Warlord rename of Land Linking) maps to the landLinking calcKey.
  // Fantastic units get the Land Linking melee/def bonus AND the Warlord +1 resistance.
  const natureLinkFantastic = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { landLinking: true },
    unitType: 'fantastic_nature',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(natureLinkFantastic.atk, 3, 'Nature Link gives fantastic units +2 melee');
  assertEqual(natureLinkFantastic.def, 3, 'Nature Link gives fantastic units +2 defense');
  assertEqual(natureLinkFantastic.res, 2, 'Nature Link gives fantastic units +1 resistance (Warlord)');

  // Normal units get only the +1 resistance, not the fantastic-only melee/def bonus.
  const natureLinkNormal = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { landLinking: true },
    unitType: 'normal',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(natureLinkNormal.atk, 1, 'Nature Link gives normal units no melee bonus');
  assertEqual(natureLinkNormal.def, 1, 'Nature Link gives normal units no defense bonus');
  assertEqual(natureLinkNormal.res, 2, 'Nature Link gives normal units +1 resistance (Warlord)');

  // CoM2 Land Linking grants no resistance bonus, even on fantastic units.
  const landLinkingCoM2 = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    abilities: { landLinking: true },
    unitType: 'fantastic_nature',
    atk: 1, def: 1, res: 1,
  }));
  assertEqual(landLinkingCoM2.atk, 3, 'Land Linking (CoM2) gives fantastic units +2 melee');
  assertEqual(landLinkingCoM2.res, 1, 'Land Linking (CoM2) grants no resistance bonus');

  const luckyStar = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { luckyStar: true },
    rtbType: 'missile',
    atk: 2, rtb: 2, def: 2, res: 2,
  }));
  assertEqual(luckyStar.atk, 3, 'Lucky Star aura gives every friendly unit +1 melee');
  assertEqual(luckyStar.rtb, 3, 'Lucky Star aura gives every friendly unit +1 ranged');
  assertEqual(luckyStar.def, 3, 'Lucky Star aura gives every friendly unit +1 armor');
  assertEqual(luckyStar.res, 3, 'Lucky Star aura gives +1 resistance and no Lucky resistance');
  assertClose(luckyStar.toHitMelee, 0.3, 'Lucky Star aura does not grant Lucky To-Hit');
  assertClose(luckyStar.toBlock, 0.3, 'Lucky Star aura does not grant Lucky To-Block');

  // Only the enchanted unit gains Lucky, expressed with the ordinary `lucky` control.
  const luckyStarTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { luckyStar: true, lucky: true },
    atk: 2, def: 2, res: 2,
  }));
  assertEqual(luckyStarTarget.res, 4, 'Enchanted unit gets the aura resistance plus Lucky resistance');
  assertClose(luckyStarTarget.toHitMelee, 0.4, 'Enchanted unit gets Lucky To-Hit');
  assertClose(luckyStarTarget.toBlock, 0.4, 'Enchanted unit gets Lucky To-Block');

  // Psycho Force (UnitCalc.CAS:1413-1417) and Pneuma Field (:1419-1425) read the Resistance
  // standing at their own position in region `d`. Region `e`'s aura pass raises Resistance
  // afterwards, so a Holy Bonus aura must not feed either effect. Both are Outlander-soldier
  // reforms, so the inputs are the wizard retort plus the reform, never the derived label.
  const psychoForceInput = overrides => baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    level: 'veteran',
    atk: 1, def: 1, res: 4, hp: 1,
    ...overrides,
  });
  const psychoNoAura = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, psychoConverter: true },
  }));
  const psychoWithAura = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, psychoConverter: true, holyBonus: 2 },
  }));
  // res 4 + Xenopsychology-free base = 5 at region d, veteran rank 2 => trunc(5 * 2 / 2) = 5.
  assertEqual(psychoNoAura.res, 5, 'Baseline resistance for the Psycho Force reads');
  assertEqual(psychoWithAura.res, 7, 'The Holy Bonus aura raises the finished resistance to 7');
  assertClose(psychoNoAura.toBlock, 0.35, 'Psycho Force adds resistance x level / 2 To-Defend');
  assertClose(psychoWithAura.toBlock, 0.35,
    'Psycho Force reads resistance at region d, so the region-e aura does not feed it');
  assertClose(psychoWithAura.toHitMelee, 0.35,
    'and the same pre-aura value drives its To-Hit half');

  const pneumaNoAura = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, pneumaReactor: true },
  }));
  const pneumaWithAura = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, pneumaReactor: true, holyBonus: 2 },
  }));
  assertEqual(pneumaNoAura.abilities.lifeSteal, -2, 'Pneuma Field drains trunc(resistance / 2)');
  assertEqual(pneumaWithAura.abilities.lifeSteal, -2,
    'Pneuma Field reads resistance at region d, so the region-e aura does not deepen the drain');
  const pneumaWarped = ctx.deriveUnitStats(psychoForceInput({
    abilities: { outlanderWizard: true, pneumaReactor: true, warpResist: true },
  }));
  assertEqual(pneumaWarped.abilities.lifeSteal, 0,
    'Warp Resist zeroes resistance in region c, so Pneuma Field drains nothing');

  const trueSight = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { trueSight: true },
    rtbType: 'magic_s',
    rtb: 1,
  }));
  assertEqual(trueSight.abilities.illusionImmunity, true, 'True Sight grants Illusion Immunity');
  assertClose(trueSight.toHitMelee, 0.3, 'True Sight does not boost melee To-Hit');
  assertClose(trueSight.toHitRtb, 0.35, 'True Sight gives +5% ranged To-Hit in Warlord');

  const eyeOfHeavenTrueSight = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { eyeOfHeaven: true },
    rtbType: 'fire',
    rtb: 1,
  }));
  assertClose(eyeOfHeavenTrueSight.toHitRtb, 0.35, 'Eye of Heaven grants the True Sight To-Hit bonus');

  const academyMagicRanged = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { alumniOfAcademy: true },
    race: 'Halfling',
    name: 'Halfling Shamans',
    rtbType: 'magic_n',
    rtb: 3,
    figs: 6,
  }));
  assertEqual(academyMagicRanged.figs, 8, 'Academy gives a Halfling magical-ranged unit +2 figures');

  const academyMechanical = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { alumniOfAcademy: true, mechanical: true },
    race: 'Halfling',
    name: 'Mechanical Shamans',
    rtbType: 'magic_n',
    rtb: 3,
    figs: 6,
  }));
  assertEqual(academyMechanical.figs, 6, 'Academy excludes Mechanical magical-ranged units');

  const academyRocs = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { alumniOfAcademy: true },
    race: 'Halfling',
    name: 'Halfling Rocs',
    figs: 2,
  }));
  assertEqual(academyRocs.figs, 4, 'Academy gives Halfling Rocs +2 figures');

  const academyOtherRace = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_warlord_1.5.12.6.2',
    abilities: { alumniOfAcademy: true },
    race: 'High Men',
    name: 'High Men Magicians',
    rtbType: 'magic_c',
    rtb: 3,
    figs: 4,
  }));
  assertEqual(academyOtherRace.figs, 4, 'Academy is inert outside the Halfling race');

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
    version: 'mom_cp_1.60.00',
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
    version: 'mom_cp_1.60.00',
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
    version: 'mom_cp_1.60.00',
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
    version: 'mom_cp_1.60.00',
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
    version: 'mom_cp_1.60.00',
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

function runDerivationStageChecks(ctx) {
  const version = 'com2_warlord_1.5.12.6.2';

  // Phase attribution is a step's declared position, so these assert on the emitted step
  // rather than on a bucket total. `null` means the effect emitted no step at all.
  const stepFor = (abilities, id, ver) => {
    const steps = ctx.getAbilityStatSteps(abilities, ver || version);
    const matches = steps.filter(step => step.id === id);
    assert(matches.length <= 1, `getAbilityStatSteps emits at most one '${id}' step`);
    return matches[0] || null;
  };
  const phaseOf = (abilities, id, ver) => {
    const step = stepFor(abilities, id, ver);
    return step ? step.phase : null;
  };

  assertEqual(phaseOf({ lucky: true, luckyPhaseA: true }, 'lucky'), 'c',
    'Intrinsic Lucky is applied in region c, where +0x044C7 puts it');
  assertEqual(phaseOf({ lucky: true, luckyPhaseBase: true, luckyPhaseA: true }, 'lucky'), 'base',
    'Creation-time Lucky grant uses the base stage, and is not counted again later');
  assertEqual(phaseOf({ lucky: true, luckyPhaseB: true }, 'lucky'), 'b',
    'Lucky Star / Divine Protection grant Lucky in phase b');

  const artificer = stepFor({ artificer: true, mechanical: true }, 'artificer');
  assertEqual(artificer.phase, 'base', 'Artificer ABase writes use the base stage');
  assertEqual(artificer.delta.atk, 1, 'Artificer grants +1 melee');
  // +2, not the +1 the in-game helptext states — CreateUnit.CAS:43 matches manual changelog
  // 1.4.22, which restored the +2 that 1.4.17 had cut. See Source discrepancies.md §6.
  assertEqual(artificer.delta.res, 2, 'Artificer grants +2 resistance, per the script');
  assertEqual(artificer.delta.def, 1, 'Artificer grants +1 armor');
  assertEqual(artificer.delta.rtb, 1, 'Artificer grants +1 ranged');

  assertEqual(phaseOf({ guardian: true }, 'guardian'), 'c',
    'The Guardian retort is region c, where +0x0B092 puts it');
  assertEqual(phaseOf({ rebuild: true, unitType: 'normal' }, 'rebuild'), 'base',
    'Non-hero Rebuild ABase write uses the base stage');
  assertEqual(phaseOf({ rebuild: true, unitType: 'hero' }, 'rebuild'), 'b',
    'Hero Rebuild is reapplied in UnitCalcPre phase b');

  // D23: CoM2/Warlord apply Holy Bonus and Resistance to All as region-`e` stack auras, after
  // `d` and after the Warps. The DOS engines have no aura pass and keep them in `a`.
  const holyBonusCoM2 = stepFor({ holyBonus: 3 }, 'holyBonus:aura');
  assertEqual(holyBonusCoM2.phase, 'e', "CoM2/Warlord run Holy Bonus in region e's aura pass");
  assertEqual(holyBonusCoM2.delta.ranged, 3,
    'The Holy Bonus aura writes the narrow ranged field, not the shared rtb slot');
  assertEqual(holyBonusCoM2.delta.rtb, undefined,
    'so Thrown, Breath and the gazes take no Holy Bonus in CoM2');
  assertEqual(phaseOf({ holyBonus: 3 }, 'holyBonus', 'mom_1.31'), 'a',
    'MoM has no aura pass and keeps Holy Bonus in phase a');
  assertEqual(stepFor({ holyBonus: 3 }, 'holyBonus', 'com_6.08').delta.rtb, 3,
    "CoM 1 writes Holy Bonus to the shared `.ranged` slot, so it reaches Thrown and Breath");
  assertEqual(phaseOf({ resistanceToAll: 2 }, 'resistanceToAll:aura'), 'e',
    'Resistance to All feeds the region-e Prayermaster aura');

  // D24/D25: both engines write Supreme Light and Tactician after their Warp block, and each
  // is emitted as a version-exclusive step rather than as a version predicate.
  assertEqual(phaseOf({ supremeLight: true }, 'supremeLight'), null,
    'Supreme Light is one step in stats.js, not an ability step, outside CoM 1');
  assertEqual(phaseOf({ supremeLight: true }, 'supremeLight:coM1', 'com_6.08'), null,
    "CoM 1's Supreme Light is likewise one step in stats.js");
  const tacticianCoM2 = stepFor({ tactician: true }, 'tactician');
  assertEqual(tacticianCoM2.phase, 'c', 'Tactician is region c (+0x0C890), not a');
  assertEqual(tacticianCoM2.afterWarp, true, 'and it runs after the Warp block');
  const tacticianCoM1 = stepFor({ tactician: true }, 'tactician:coM1', 'com_6.08');
  assertEqual(tacticianCoM1.phase, 'c', "CoM 1's Tactician retort is also region c (0x90AB4)");
  assertEqual(tacticianCoM1.afterWarp, true, 'and also after Warp Creature');

  const mixedAbilities = {
    artificer: true,
    mechanical: true,
    holyBonus: 2,
    prayer: true,
    rust: true,
    favoredTerrain: true,
  };
  const mixed = ctx.getAbilityStatSteps(mixedAbilities, version);
  const phases = ['base', 'a', 'b', 'c', 'd', 'e'];
  const byPhase = {};
  for (const step of mixed) (byPhase[step.phase] = byPhase[step.phase] || []).push(step);
  assert(Object.keys(byPhase).every(phase => phases.includes(phase)),
    'Every emitted step carries a known phase');
  // Emission is in source order, which is *not* phase order — Artificer is `base` and comes
  // last. Partitioning by phase is therefore the caller's job, not something to be assumed.
  assertEqual(mixed.map(step => step.id).join(','),
    'holyBonus:aura,prayer,rust,favoredTerrain,artificer',
    'Steps are emitted in source order, which the caller partitions by phase');
  assertEqual(mixed.map(step => step.phase).join(','), 'e,c,d,d,base',
    'Emission order is not phase order');
}

function runWarlordUnitAbilityChecks(ctx) {
  const version = 'com2_warlord_1.5.12.6.2';
  const warlordUnit = (overrides = {}) => baseUnitInput({
    version,
    ...overrides,
    abilities: { outlanderWizard: true, ...(overrides.abilities || {}) },
  });

  const sapiensCount = vm.runInContext(
    "Object.values(WARLORD_UNITS_DATA).filter(u => (u.abilities || []).includes('Sapiens')).length",
    ctx,
  );
  assertEqual(sapiensCount, 31, 'Warlord roster generator emits all 31 Sapiens units');
  // v1.5.12.6.2 added Custom13=14 to Wraiths [170] and Shadow Demons [171], closing the
  // changelog-vs-roster conflict in Source discrepancies.md §5.
  const lateSapiens = vm.runInContext(
    "['Wraiths', 'Shadow Demons'].every(n => Object.values(WARLORD_UNITS_DATA).filter(u => u.name === n).some(u => (u.abilities || []).includes('Sapiens')))",
    ctx,
  );
  assertEqual(lateSapiens, true, 'Wraiths and Shadow Demons are tagged Sapiens');

  const armorclad = ctx.deriveUnitStats(warlordUnit({
    def: 1,
    abilities: { armorcladReform: true, mechanical: true },
  }));
  assertEqual(armorclad.def, 7, 'Armorclad permanently grants +6 Armor');

  const battleArmor = ctx.deriveUnitStats(warlordUnit({
    def: 1,
    abilities: { armorcladReform: true },
  }));
  assertEqual(battleArmor.def, 4, 'Battle Armor grants +3 Armor in combat');

  const blazeWithIronSkin = ctx.deriveUnitStats(warlordUnit({
    atk: 4,
    def: 5,
    abilities: { blazeOfGlory: true, ironSkin: true },
  }));
  assertEqual(blazeWithIronSkin.atk, 14,
    'Blaze of Glory transfers current Armor, including Iron Skin, to melee');
  assertEqual(blazeWithIronSkin.def, 0,
    'Blaze of Glory zeroes current Armor instead of reconstructing enchantment Armor');

  const noOutlanderArmorclad = ctx.deriveUnitStats(baseUnitInput({
    version,
    def: 1,
    abilities: { mechanical: true, armorcladReform: true },
  }));
  assertEqual(noOutlanderArmorclad.def, 1, 'Outlander reforms are inert without an Outlander wizard owner');

  const sapiensReforms = ctx.deriveUnitStats(warlordUnit({
    unitType: 'fantastic_nature',
    res: 1,
    hp: 4,
    rtbType: 'missile',
    rtb: 1,
    abilities: {
      sapiens: true,
      xenopsychology: true,
      radio: true,
      ballisticsTraining: true,
      xenoveterinary: true,
    },
  }));
  assertEqual(sapiensReforms.res, 3, 'Sapiens summons receive Xenopsychology and Radio resistance');
  assertEqual(sapiensReforms.hp, 5, 'Xenoveterinary adds 25% HP to fantastic Sapiens summons');
  assertClose(sapiensReforms.toHitMelee, 0.5, 'Radio and Xenoveterinary each add 10% To-Hit');
  assertClose(sapiensReforms.toHitRtb, 0.7, 'Ballistics Training adds 20% Ranged To-Hit for Sapiens summons');

  const magitekScience = ctx.deriveUnitStats(warlordUnit({
    abilities: { mechanical: true, armorcladReform: true, magitekScience: true },
  }));
  assertEqual(magitekScience.abilities.resistMagic, true, 'Magitek Science grants Resist Magic to Armorclad units');
  const magitekScienceBattleArmor = ctx.deriveUnitStats(warlordUnit({
    abilities: { armorcladReform: true, magitekScience: true },
  }));
  assertEqual(!!magitekScienceBattleArmor.abilities.resistMagic, false,
    'Magitek Science does not grant Resist Magic to Battle Armor units despite the prose claim');

  const militaryDrilling = ctx.deriveUnitStats(warlordUnit({
    level: 'regular',
    def: 1,
    abilities: { militaryDrilling: true },
  }));
  assertEqual(militaryDrilling.abilities.discipline, 'overland', 'Military Drilling gives new non-fantastic units permanent Discipline');
  assertEqual(militaryDrilling.def, 3, 'Military Drilling Discipline applies its Regular +2 Armor bonus');

  const staleDerivedInputs = ctx.deriveUnitStats(warlordUnit({
    def: 1,
    rtbType: 'missile',
    rtb: 3,
    abilities: {
      mechanical: true,
      armorclad: true,
      battleArmor: true,
      blackpowder: true,
      energyCannon: true,
      energyWeaponry: true,
      pneumaField: true,
      powerEngine: true,
      psychoForce: true,
    },
  }));
  assertEqual(staleDerivedInputs.def, 1, 'Derived Armorclad/Battle Armor inputs are ignored');
  assertEqual(staleDerivedInputs.rangedType, 'missile', 'Derived Blackpowder/Energy Cannon inputs are ignored');
  assertEqual(staleDerivedInputs.abilities.powerEngine || false, false, 'Derived Power Engine input is ignored');
  assertEqual(staleDerivedInputs.abilities.lifeSteal == null, true, 'Derived Pneuma Field input is ignored');

  const blackpowderMissile = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 3,
    abilities: { rocketry: true },
  }));
  assertEqual(blackpowderMissile.rangedType, 'boulder', 'Blackpowder converts missile to heavy projectile');
  assertEqual(blackpowderMissile.rtb, 3, 'Blackpowder AP grant does not also add ranged strength');
  assertEqual(blackpowderMissile.abilities.armorPiercing, true, 'Blackpowder grants Armor Piercing');
  assertEqual(blackpowderMissile.abilities.poison, 1, 'Blackpowder grants Poison 1');

  const blackpowderThrownAP = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'thrown',
    rtb: 3,
    abilities: { rocketry: true, armorPiercing: true },
  }));
  assertEqual(blackpowderThrownAP.rtb, 7, 'Blackpowder gives existing-AP Thrown +4 strength');

  const blackpowderFire = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'fire',
    rtb: 3,
    abilities: { rocketry: true },
  }));
  assertEqual(blackpowderFire.rtb, 7, 'Blackpowder gives Fire Breath +4 strength');

  const bombs = ctx.deriveUnitStats(warlordUnit({
    figs: 4,
    rtbType: 'none',
    rtb: 0,
    abilities: { explosive: true },
  }));
  assertEqual(bombs.thrownType, 'thrown', 'Bombs&Grenades grants a Thrown attack');
  assertEqual(bombs.rtb, 6, 'Bombs&Grenades uses floor(8 - max figures / 2)');
  assertEqual(bombs.abilities.wallCrusher, true, 'Bombs&Grenades grants Wall Crusher');

  const bombsAdditive = ctx.deriveUnitStats(warlordUnit({
    figs: 4,
    rtbType: 'thrown',
    rtb: 2,
    abilities: { explosive: true },
  }));
  assertEqual(bombsAdditive.rtb, 8, 'Bombs&Grenades adds to existing Thrown');

  const upgradedRanged = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 3,
    abilities: { rocketry: true, explosive: true },
  }));
  assertEqual(upgradedRanged.rtb, 5, 'Upgraded Explosive gives ranged +2');

  const upgradedFire = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'fire',
    rtb: 3,
    abilities: { rocketry: true, explosive: true },
  }));
  assertEqual(upgradedFire.rtb, 14, 'Explosive doubles Blackpowder-upgraded Fire Breath');

  const temporalDrive = ctx.deriveUnitStats(warlordUnit({
    def: 4,
    res: 4,
    abilities: {
      mechanical: true,
      sailing: true,
      heatPowerEngine: true,
      temporalEngineering: true,
      mindStorm: true,
    },
  }));
  assertEqual(temporalDrive.abilities.illusionImmunity, true, 'Temporal-Gravity Drive grants Illusion Immunity');
  assertEqual(temporalDrive.def, 4, 'Temporal-Gravity Drive immunity gates Mind Storm defense penalty');
  assertEqual(temporalDrive.res, 4, 'Temporal-Gravity Drive immunity gates Mind Storm resistance penalty');

  const energyCannon = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 5,
    abilities: { mechanical: true, heatPowerEngine: true, energyBeamWeapons: true },
  }));
  assertEqual(energyCannon.rangedType, 'beam', 'Energy Cannon converts ranged projectile to Beam');
  assertEqual(energyCannon.rtb, 7, 'Energy Cannon adds floor(50% base ranged strength)');
  assertEqual(energyCannon.abilities.destruction, -2, 'Energy Cannon derives Destruction from 30% ranged To-Hit');

  const upgradedEnergyCannon = ctx.deriveUnitStats(warlordUnit({
    rtbType: 'missile',
    rtb: 5,
    abilities: {
      heatPowerEngine: true,
      energyBeamWeapons: true,
      rocketry: true,
      armorPiercing: true,
      artificer: true,
      mechanical: true,
    },
  }));
  assertEqual(
    upgradedEnergyCannon.rtb,
    12,
    'Energy Cannon scales earlier permanent Artificer and Blackpowder writes: (5+1+2)+floor(8/2)',
  );

  const psychoForce = ctx.deriveUnitStats(warlordUnit({
    level: 'champion',
    res: 4,
    abilities: { psychoConverter: true },
  }));
  assertEqual(psychoForce.res, 7, 'Psycho Force reads current Resistance after level bonus');
  assertClose(psychoForce.toHitMelee, 0.57, 'Psycho Force adds floor(7 * 5 / 2)=17% To-Hit');
  assertClose(psychoForce.toBlock, 0.47, 'Psycho Force adds floor(7 * 5 / 2)=17% To-Defend');

  const pneumaField = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { pneumaReactor: true },
  }));
  assertEqual(pneumaField.abilities.lifeSteal, -2, 'Pneuma Field grants Life Steal from current Resistance');

  const pneumaStacks = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { pneumaReactor: true, lifeSteal: -3 },
  }));
  assertEqual(pneumaStacks.abilities.lifeSteal, -5, 'Pneuma Field stacks with existing negative Life Steal');

  const powerEngine = ctx.deriveUnitStats(warlordUnit({
    abilities: { mechanical: true, heatPowerEngine: true },
  }));
  assertEqual(powerEngine.abilities.powerEngine, true, 'Heat Power Engine derives the Power Engine unit state');

  const magitekEngine = ctx.deriveUnitStats(warlordUnit({
    abilities: { mechanical: true, heatPowerEngine: true, magitekEngineering: true },
  }));
  assertClose(magitekEngine.toBlock, 0.5, 'Magitek Engineering gives Power Engine units +20% To-Defend');
  assertEqual(magitekEngine.abilities.largeShield, true, 'Magitek Engineering gives Power Engine units Large Shield');

  const temporalEngine = ctx.deriveUnitStats(warlordUnit({
    abilities: { mechanical: true, heatPowerEngine: true, temporalEngineering: true },
  }));
  assertEqual(temporalEngine.abilities.haste, true, 'Temporal Engineering gives Power Engine units Haste');

  const ineligibleRocketry = ctx.deriveUnitStats(warlordUnit({
    atk: 3,
    abilities: { rocketry: true },
  }));
  assertEqual(ineligibleRocketry.abilities.poison || 0, 0, 'Rocketry does not grant Blackpowder to a melee-only unit');

  const uphillBattle = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { uphillBattle: true },
  }));
  assertClose(uphillBattle.toHitMelee, 0.4, 'Uphill Battle gives an AI unit +10% To-Hit');
  assertClose(uphillBattle.toBlock, 0.4, 'Uphill Battle gives an AI unit +10% To-Defend');
  assertEqual(uphillBattle.res, 6, 'Uphill Battle gives an AI unit +1 Resistance');

  const godsPlayDices = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { godsPlayDices: -2 },
  }));
  assertEqual(godsPlayDices.res, 3, 'Gods Play Dices applies the fixed per-unit Resistance roll');

  const godsPlayDicesClamped = ctx.deriveUnitStats(warlordUnit({
    res: 5,
    abilities: { godsPlayDices: 9 },
  }));
  assertEqual(godsPlayDicesClamped.res, 7, 'Gods Play Dices clamps its Resistance roll to +2');

  const scoringOptionsInertOutsideWarlord = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11',
    res: 5,
    abilities: { uphillBattle: true, godsPlayDices: 2 },
  }));
  assertClose(scoringOptionsInertOutsideWarlord.toHitMelee, 0.3, 'Warlord scoring To-Hit is inert outside Warlord');
  assertClose(scoringOptionsInertOutsideWarlord.toBlock, 0.3, 'Warlord scoring To-Defend is inert outside Warlord');
  assertEqual(scoringOptionsInertOutsideWarlord.res, 5, 'Warlord scoring Resistance is inert outside Warlord');
}

function runPhaseChecks(ctx) {
  // R3.3: Caster.exe's independent attack fields must survive the legacy card's single
  // RTB projection. Three deterministic coexisting channels produce three separate attacks.
  const modernChannels = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, rtb: 0, rtbType: 'none', def: 0, hp: 10,
    toHitRtbMod: 70,
    modernAttacks: {
      thrown: { strength: 1, type: 'thrown' },
      fireBreath: { strength: 1, type: 'fire' },
      lightningBreath: { strength: 1, type: 'lightning' },
    },
  }));
  const channelTarget = ctx.deriveUnitStats(baseUnitInput({
    version: 'com2_1.05.11', atk: 1, rtb: 0, rtbType: 'none', def: 0, hp: 10,
  }));
  const channelCombat = ctx.resolveCombat(modernChannels, channelTarget,
    { version: 'com2_1.05.11', isRanged: false, wallOfFire: false });
  assertClose(channelCombat.totalDmgToB[3], 0.7,
    'Modern Thrown, Fire Breath, and Lightning Breath coexist instead of using the RTB projection');
  assertEqual(channelCombat.phases.filter(p => /Breath|Thrown/.test(p.label)).length, 3,
    'Modern coexistence produces one phase per independent channel');

  // R3.4: cover the complete modern roster boundary, not just a hand-authored fixture.
  // Every source channel must make it through derivation; every non-ranged channel must
  // surface as a melee phase, and a conventional ranged channel must remain selectable.
  const typeMap = { Missile: 'missile', Boulder: 'boulder', 'Magic(C)': 'magic_c', 'Magic(N)': 'magic_n', 'Magic(S)': 'magic_s' };
  const warlordRoster = Object.values(evalInContext(ctx, 'WARLORD_UNITS_DATA'));
  const multiChannelRoster = warlordRoster.filter(unit =>
    ['ranged', 'thrown', 'fire_breath', 'lightning_breath'].filter(key => Number(unit[key]) > 0).length > 1);
  assertEqual(multiChannelRoster.length, 29, 'Warlord roster contains the expected multi-channel units');
  for (const unit of multiChannelRoster) {
    const records = {
      ranged: unit.ranged ? { strength: unit.ranged, type: typeMap[unit.ranged_type] } : null,
      thrown: unit.thrown ? { strength: unit.thrown, type: 'thrown' } : null,
      fireBreath: unit.fire_breath ? { strength: unit.fire_breath, type: 'fire' } : null,
      lightningBreath: unit.lightning_breath ? { strength: unit.lightning_breath, type: 'lightning' } : null,
    };
    const projection = records.ranged || records.thrown || records.fireBreath || records.lightningBreath;
    const attacker = ctx.deriveUnitStats(baseUnitInput({
      version: 'com2_warlord_1.5.12.6.2', figs: unit.figures, atk: unit.melee,
      rtb: projection.strength, rtbType: projection.type, def: unit.defense,
      res: unit.resist, hp: unit.hp, toHitRtbMod: 70, modernAttacks: records,
    }));
    const expectedKeys = Object.keys(records).filter(key => records[key]);
    assertEqual(Object.keys(attacker.modernAttacks).length, expectedKeys.length,
      `${unit.name} retains every source attack channel during derivation`);
    const melee = ctx.resolveCombat(attacker, channelTarget,
      { version: 'com2_warlord_1.5.12.6.2', isRanged: false, wallOfFire: false });
    const expectedMeleeChannels = expectedKeys.filter(key => key !== 'ranged').length;
    assertEqual((melee.phases || []).filter(p => /Breath|Thrown/.test(p.label)).length, expectedMeleeChannels,
      `${unit.name} resolves every non-ranged channel`);
    if (records.ranged) {
      const ranged = ctx.resolveCombat(attacker, channelTarget,
        { version: 'com2_warlord_1.5.12.6.2', isRanged: true, wallOfFire: false });
      assert(ranged.totalDmgToB.some((p, damage) => damage > 0 && p > 1e-15),
        `${unit.name} resolves its independent conventional ranged channel`);
    }
  }

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

// The step runner (Calculator/steps.js) — R1's single stat-derivation mechanism.
// Asserted directly rather than only through the stats it will carry, because the
// migration relies on three of its properties: phase order, stable within-phase order,
// and the write check that catches a step writing a field it did not declare.
function runStatStepChecks(ctx) {
  const HALT = evalInContext(ctx, 'HALT');
  const step = (id, phase, writes, apply, extra) =>
    ctx.statStep({ id, phase, writes, apply, ...(extra || {}) });

  // A step reads the field's current value at its own position, so a later halving sees
  // everything the earlier additions wrote — the property the bucket model cannot express.
  const unit = { res: 2 };
  ctx.runStatSteps([
    step('add', 'a', ['res'], u => { u.res += 5; }),
    step('halve', 'c', ['res'], u => { u.res = Math.floor(u.res / 2); }),
  ], unit, { version: 'com2_1.05.11' });
  assertEqual(unit.res, 3, 'A later step reads what earlier steps wrote');

  // List order is execution order; phase only has to be non-decreasing along it.
  let misordered = null;
  try {
    ctx.runStatSteps([
      step('spell', 'c', ['res'], u => { u.res += 1; }),
      step('intrinsic', 'a', ['res'], u => { u.res += 1; }),
    ], { res: 0 }, { validateWrites: true });
  } catch (err) {
    misordered = String(err.message);
  }
  assert(misordered && misordered.includes('is declared after'),
    'A sequence authored out of phase order is rejected');

  const skipped = { res: 0 };
  ctx.runStatSteps([
    step('inactive', 'a', ['res'], u => { u.res += 1; }, { when: () => false }),
    step('active', 'a', ['res'], u => { u.res += 2; }, { when: () => true }),
  ], skipped, {});
  assertEqual(skipped.res, 2, 'A step whose predicate is false does not run');

  const halted = { res: 0, def: 0 };
  ctx.runStatSteps([
    step('bonus', 'a', ['res'], u => { u.res += 1; }),
    step('illusion', 'a', ['def'], () => HALT),
    step('unreached', 'a', ['res'], u => { u.res += 100; }),
  ], halted, {});
  assertEqual(halted.res, 1, 'HALT stops the sequence');

  const base = Object.freeze({ def: 4 });
  const reader = { def: 99 };
  ctx.runStatSteps([
    step('holyArmor', 'c', ['def'], (u, c) => { u.def = c.base.def + 2; }),
  ], reader, { base });
  assertEqual(reader.def, 6, 'A step reads the permanent base record through ctx.base');

  const trace = [];
  ctx.runStatSteps([
    step('silent', 'a', ['res'], () => {}),
    step('warpResist', 'c', ['res'], u => { u.res = 0; }),
  ], { res: 7 }, { trace });
  assertEqual(trace.length, 1, 'Only steps that change a field are traced');
  assertEqual(trace[0].id, 'warpResist', 'Trace names the step');
  assertEqual(trace[0].changes.res.delta, -7, 'Trace records the delta');

  let undeclared = null;
  try {
    ctx.runStatSteps([
      step('sloppy', 'a', ['res'], u => { u.res += 1; u.def += 1; }),
    ], { res: 0, def: 0 }, { validateWrites: true });
  } catch (err) {
    undeclared = String(err.message);
  }
  assert(undeclared && undeclared.includes('undeclared field def'),
    'validateWrites catches a step writing a field it did not declare');

  let rejected = null;
  try {
    ctx.statStep({ id: 'nowhere', phase: 'z', writes: ['res'], apply: () => {} });
  } catch (err) {
    rejected = String(err.message);
  }
  assert(rejected && rejected.includes('unknown phase'), 'statStep rejects an unknown phase');

  // The sequence is assembled from two places, so a colliding id has to fail rather than
  // quietly make the trace ambiguous.
  let collided = null;
  try {
    ctx.runStatSteps([
      step('lionheart', 'c', ['res'], u => { u.res += 1; }),
      step('lionheart', 'c', ['res'], u => { u.res += 1; }),
    ], { res: 0 }, { validateWrites: true });
  } catch (err) {
    collided = String(err.message);
  }
  assert(collided && collided.includes('declared twice'),
    'A sequence with two steps sharing an id is rejected');
}

function runResolutionStepChecks(ctx) {
  const defenseTarget = {
    def: 4,
    unitType: 'normal',
    abilities: {
      largeShield: true,
      elemArmor: 'resistElements',
      bless: true,
      missileImmunity: true,
      weaponImmunity: true,
    },
  };
  const defenseTrace = [];
  const effectiveDef = ctx.effectiveDefense(defenseTarget, 'com2_1.05.11', {
    isRanged: true,
    elementalEligible: true,
    blessEligible: true,
    armorPiercing: true,
    isMissile: true,
    weaponImmunityEligible: true,
  }, defenseTrace);
  // (4 base + 3 shield + 4 Resist Elements + 5 Bless) / 2 = 8;
  // Missile Immunity replaces that with 100, then Weapon Immunity adds 8.
  assertEqual(effectiveDef, 108,
    'EffectiveDefense preserves assignment-before-final-Weapon-Immunity ordering');
  assertEqual(defenseTrace.map(entry => entry.id).join(','),
    [
      'effectiveDefense:base',
      'effectiveDefense:largeShield',
      'effectiveDefense:resistElements',
      'effectiveDefense:bless',
      'effectiveDefense:armorPiercing',
      'effectiveDefense:immunities',
      'effectiveDefense:weaponImmunity',
    ].join(','),
    'EffectiveDefense trace follows the decoded execution order');
  assert(!Object.prototype.hasOwnProperty.call(defenseTarget, 'effectiveDefense'),
    'EffectiveDefense runs on a discarded scratch copy');

  const cityWallTarget = ctx.deriveUnitStats(baseUnitInput({
    prefix: 'b',
    version: 'com2_1.05.11',
    def: 9,
    cityWalls: '3',
  }));
  assertEqual(cityWallTarget.def, 9,
    'City Walls is not included in the finished CoM2 unit Defense stat');
  assertEqual(ctx.effectiveDefense(cityWallTarget, 'com2_1.05.11', {
    extraDefense: cityWallTarget.cityWallBonus,
    armorPiercing: true,
  }), 6,
  'City Walls enters EffectiveDefense before Armor Piercing: floor((9 + 3) / 2)');

  const illusionDef = ctx.effectiveDefense({
    def: 9,
    unitType: 'normal',
    abilities: { missileImmunity: true, weaponImmunity: true },
  }, 'com2_1.05.11', {
    illusion: true,
    isRanged: true,
    isMissile: true,
    weaponImmunityEligible: true,
  });
  assertEqual(illusionDef, 0,
    'Illusion halts EffectiveDefense before later immunities and bonuses');

  const resistanceTarget = {
    res: 3,
    unitType: 'hero',
    abilities: {
      charmed: true,
      magicImmunity: true,
      bless: true,
      resistMagic: true,
    },
  };
  const resistanceTrace = [];
  const effectiveRes = ctx.effectiveResistance(
    resistanceTarget, 'com2_1.05.11', 'death', true, resistanceTrace);
  assertEqual(effectiveRes, 110,
    'Charmed/Magic Immunity assignments precede Bless and Resist Magic additions');
  assertEqual(resistanceTrace.map(entry => entry.id).join(','),
    [
      'effectiveResistance:base',
      'effectiveResistance:charmed',
      'effectiveResistance:bless',
      'effectiveResistance:resistMagic',
    ].join(','),
    'EffectiveResistance trace follows the decoded execution order');
  assertEqual(resistanceTarget.res, 3,
    'EffectiveResistance does not write back to displayed Resistance');
  assertEqual(ctx.effectiveResistance(resistanceTarget, 'com2_1.05.11', null), 100,
    'Charmed applies to realm-less resistance rolls such as Poison');
  assertEqual(ctx.effectiveResistance(resistanceTarget, 'com2_1.05.11', null, false), 3,
    'Charmed is inert when GetEffectiveResistance is not serving a roll');

  const legacyResistance = ctx.buildResistanceContext(
    { res: 0, unitType: 'normal', abilities: {} },
    { res: 0, unitType: 'hero', abilities: { charmed: true } },
    'mom_1.31',
    false);
  assertEqual(legacyResistance.bResPoison, 30,
    'Legacy Charmed adds 30 Resistance to realm-less rolls for heroes');
}

function main() {
  const ctx = loadCalculatorContext();
  // Every deriveUnitStats call below runs the step runner's write check (steps.js).
  ctx.setStatStepDebug(true);
  runStatStepChecks(ctx);
  runResolutionStepChecks(ctx);
  runDeriveUnitStatsChecks(ctx);
  runDerivationStageChecks(ctx);
  runWarlordUnitAbilityChecks(ctx);
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
