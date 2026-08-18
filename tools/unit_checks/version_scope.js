// M9 stage 1: the canonical engine-version scope, its measured stage-2 worklist, and the
// checks that hold both current. The scope table itself lives in Calculator/steps.js.

'use strict';

const fs = require('fs');
const path = require('path');
const { calculatorFiles, readProvenanceComments } = require('../provenance_audit');
const { repoRoot } = require('../calculator_sources');
const {
  evalInContext, assert, assertEqual, baseUnitInput, assertSameKeyList,
} = require('./assertions');

// `Calculator/steps.js` STEP_VERSION_SCOPES is the single home for which engines make a
// derivation write at all. Stage 1 classifies and validates only: nothing filters a sequence
// yet, so every version's arithmetic is unchanged. These checks are what make the
// classification a claim rather than a comment.
//
// Three inventories per version, each asserted for exact equality so it can neither grow
// silently nor rot once stage 2 shrinks it:
//   members        composed into the sequence although this engine has no such write. Stage 2
//                  filters these; in region `c` they are the manifest entries parked behind a
//                  false predicate, and the execution ledger records a `skipped` visit for a
//                  branch the binary does not contain.
//   predicateTrue  the complement assertion's violations: out of scope, yet `when` still says
//                  yes. This is the backlog's "a step excluded for a version must never
//                  evaluate its predicate true there", enumerated rather than enforced,
//                  because enforcing it in stage 1 would not be behavior-neutral.
//   changed        the subset that also writes a field, so stage 2's filter would change a
//                  displayed number for these inputs. Each of the ten is an enchantment whose
//                  own UI control is hidden in that version (enchantments.js `subgroup`), so the state
//                  is not reachable through the UI — but it is reachable programmatically, and
//                  stage 2 has to justify each removal rather than assume it is inert.
const STAGE2_SCOPE_EXCEPTIONS = {
  'mom_1.31': {
    members: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother',
      'base:chance:survivalInstinctToBlock', 'base:dragonMound', 'base:energyCannon',
      'base:identity:zombies:toBlock', 'base:lightningBlade:breath', 'base:ludusAgoge',
      'base:militaryWorkshop', 'base:motherFungus', 'base:naturalSelection:coal',
      'base:naturalSelection:iron', 'base:naturalSelection:nightshade',
      'base:naturalSelection:powerMinerals', 'base:naturalSelection:wildGame',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:badMoon',
      'c:blazingMarch', 'c:blazingMarch:ranged', 'c:chance:heavenlyLight:melee',
      'c:chance:heavenlyLight:rtb', 'c:darkForce', 'c:darkness:coM1', 'c:destiny',
      'c:discipline', 'c:divineBarrierAura:coM1', 'c:endurance',
      'c:eternalNight:enemyResistance', 'c:eternalNight:enemyResistance:coM1', 'c:focusMagic',
      'c:focusMagic:conversion', 'c:goodMoon', 'c:guidingBeaconAura:coM1', 'c:heavenlyLight',
      'c:landLinking:breath', 'c:mysticSurge', 'c:natureConjunction', 'c:orihalcon',
      'c:realmWard', 'c:reinforceMagic:ranged', 'c:soulLinkerAura:coM1', 'c:spellWard',
      'c:supremeLight:coM1', 'e:chance:clamp', 'e:chance:modernClampCommon', 'e:supremeLight',
    ],
    predicateTrue: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother', 'base:dragonMound',
      'base:ludusAgoge', 'base:militaryWorkshop', 'base:motherFungus',
      'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:blazingMarch',
      'c:blazingMarch:ranged', 'c:discipline', 'c:endurance', 'c:landLinking:breath',
      'c:mysticSurge', 'c:orihalcon', 'c:reinforceMagic:ranged',
    ],
    changed: ['c:blazingMarch', 'c:mysticSurge'],
  },
  'mom_cp_1.60.00': {
    members: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother',
      'base:chance:survivalInstinctToBlock', 'base:dragonMound', 'base:energyCannon',
      'base:identity:zombies:toBlock', 'base:lightningBlade:breath', 'base:ludusAgoge',
      'base:militaryWorkshop', 'base:motherFungus', 'base:naturalSelection:coal',
      'base:naturalSelection:iron', 'base:naturalSelection:nightshade',
      'base:naturalSelection:powerMinerals', 'base:naturalSelection:wildGame',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:badMoon',
      'c:blazingMarch', 'c:blazingMarch:ranged', 'c:chance:heavenlyLight:melee',
      'c:chance:heavenlyLight:rtb', 'c:darkForce', 'c:darkness:coM1', 'c:destiny',
      'c:discipline', 'c:divineBarrierAura:coM1', 'c:endurance',
      'c:eternalNight:enemyResistance', 'c:eternalNight:enemyResistance:coM1', 'c:focusMagic',
      'c:focusMagic:conversion', 'c:goodMoon', 'c:guidingBeaconAura:coM1', 'c:heavenlyLight',
      'c:landLinking:breath', 'c:mysticSurge', 'c:natureConjunction', 'c:orihalcon',
      'c:realmWard', 'c:reinforceMagic:ranged', 'c:soulLinkerAura:coM1', 'c:spellWard',
      'c:supremeLight:coM1', 'e:chance:clamp', 'e:chance:modernClampCommon', 'e:supremeLight',
    ],
    predicateTrue: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother', 'base:dragonMound',
      'base:ludusAgoge', 'base:militaryWorkshop', 'base:motherFungus',
      'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:blazingMarch',
      'c:blazingMarch:ranged', 'c:discipline', 'c:endurance', 'c:landLinking:breath',
      'c:mysticSurge', 'c:orihalcon', 'c:reinforceMagic:ranged',
    ],
    changed: ['c:blazingMarch', 'c:mysticSurge'],
  },
  'com_6.08': {
    members: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother',
      'base:chance:survivalInstinctToBlock', 'base:dragonMound', 'base:energyCannon',
      'base:lightningBlade:breath', 'base:ludusAgoge', 'base:militaryWorkshop',
      'base:motherFungus', 'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:naturalSelection:wildGame', 'base:pillarOfFaith', 'base:poolOfRepentance',
      'base:sanctaBasilica', 'c:badMoon', 'c:berserk', 'c:blackChannels',
      'c:chance:heavenlyLight:melee', 'c:chance:heavenlyLight:rtb', 'c:darkForce', 'c:darkness',
      'c:destiny', 'c:discipline', 'c:eternalNight:enemyResistance', 'c:giantStrength',
      'c:giantStrength:thrown', 'c:goodMoon', 'c:heavenlyLight', 'c:metalFires',
      'c:natureConjunction', 'c:reinforceMagic:ranged', 'c:spellWard', 'c:stoneSkin',
      'e:chance:clamp', 'e:chance:modernClampCommon', 'e:supremeLight',
    ],
    predicateTrue: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother', 'base:dragonMound',
      'base:ludusAgoge', 'base:militaryWorkshop', 'base:motherFungus',
      'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:blackChannels',
      'c:discipline', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:reinforceMagic:ranged', 'c:stoneSkin',
    ],
    changed: [
      'c:blackChannels', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:reinforceMagic:ranged', 'c:stoneSkin',
    ],
  },
  'com2_1.05.11': {
    members: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother',
      'base:chance:survivalInstinctToBlock', 'base:dragonMound', 'base:energyCannon',
      'base:identity:zombies:toBlock', 'base:lightningBlade:breath', 'base:ludusAgoge',
      'base:militaryWorkshop', 'base:motherFungus', 'base:naturalSelection:coal',
      'base:naturalSelection:iron', 'base:naturalSelection:nightshade',
      'base:naturalSelection:powerMinerals', 'base:naturalSelection:wildGame',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:berserk',
      'c:blackChannels', 'c:darkness:coM1', 'c:divineBarrierAura:coM1',
      'c:eternalNight:enemyResistance:coM1', 'c:giantStrength', 'c:giantStrength:thrown',
      'c:guidingBeaconAura:coM1', 'c:metalFires', 'c:realmWard', 'c:soulLinkerAura:coM1',
      'c:stoneSkin', 'c:supremeLight:coM1', 'e:chance:legacyClamp',
    ],
    predicateTrue: [
      'base:altarOfTheMoon', 'base:altarOfTheSun:holyMother', 'base:dragonMound',
      'base:ludusAgoge', 'base:militaryWorkshop', 'base:motherFungus',
      'base:naturalSelection:coal', 'base:naturalSelection:iron',
      'base:naturalSelection:nightshade', 'base:naturalSelection:powerMinerals',
      'base:pillarOfFaith', 'base:poolOfRepentance', 'base:sanctaBasilica', 'c:blackChannels',
      'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires', 'c:stoneSkin',
    ],
    changed: [
      'c:blackChannels', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:stoneSkin',
    ],
  },
  'com2_warlord_1.5.12.7': {
    members: [
      'base:identity:zombies:toBlock', 'c:berserk', 'c:blackChannels', 'c:darkness:coM1',
      'c:divineBarrierAura:coM1', 'c:eternalNight:enemyResistance:coM1', 'c:giantStrength',
      'c:giantStrength:thrown', 'c:guidingBeaconAura:coM1', 'c:metalFires', 'c:realmWard',
      'c:soulLinkerAura:coM1', 'c:stoneSkin', 'c:supremeLight:coM1', 'e:chance:legacyClamp',
    ],
    predicateTrue: [
      'c:blackChannels', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:stoneSkin',
    ],
    changed: [
      'c:blackChannels', 'c:giantStrength', 'c:giantStrength:thrown', 'c:metalFires',
      'c:stoneSkin',
    ],
  },
};

// The canonical scope is initialised from PROVENANCE `versions=` and the two are asserted to
// agree, so neither can drift. Where the canonical scope is *wider*, the write demonstrably
// runs in a build whose sources the formula's citations do not cover; that is an evidence gap
// in the citation, not a scope error, and each one is listed here with its reason so a new gap
// cannot appear silently. `tactician` is emitted under a version-chosen id whose PROVENANCE
// lives on the tactician:*Dynamic formulas, so it has no comment of its own.
const SCOPE_PROVENANCE_GAPS = {
  trueLight: ['mom_1.31', 'mom_cp_1.60.00'],
  nodeAura: ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'],
  survivalInstinct: ['com_6.08'],
};
const SCOPE_IDS_WITHOUT_PROVENANCE = ['tactician', 'tactician:coM1'];

// Ability/enchantment values to probe, taken from the definition tables so a new control is
// swept without editing this file. Mutually exclusive effects (Iron Skin supersedes Stone
// Skin, Flame Blade supersedes Metal Fires) are why each key is also probed on its own.
function abilityScopeProbeValues(ctx) {
  const defs = [...evalInContext(ctx, 'ABILITY_DEFS'), ...evalInContext(ctx, 'ENCHANTMENT_DEFS')];
  const values = new Map();
  for (const def of defs) {
    const key = def.calcKey || def.key;
    if (!values.has(key)) values.set(key, new Set());
    const bucket = values.get(key);
    if (def.type === 'bool') bucket.add(true);
    else if (def.type === 'num' || def.type === 'numcheck') bucket.add(3);
    else if (def.type === 'select') {
      for (const option of def.options || []) {
        const value = Array.isArray(option) ? option[0] : option;
        if (value !== 'none') bucket.add(value);
      }
    }
  }
  return [...values].map(([key, set]) => [key, [...set]]);
}

// Every `phase:id` the calculator's sources actually construct a step for. The sweep proves a
// scope row is live by observing the step run; a row the sweep cannot reach has no such proof,
// and listing it as an exception would otherwise exempt it from criterion 9 entirely — a deleted
// step would keep its stale row forever. Scanning the construction sites gives those rows the
// same existence proof by other means. A form this misses fails the assertion loudly rather than
// passing vacuously, because the key it could not find simply is not in the returned set.
function constructibleStepKeys() {
  const keys = new Set();
  const phases = 'base|a|b|c|d|e|attackSpecific';
  for (const file of calculatorFiles) {
    const text = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
    // statStep({ id: 'x', … phase: 'p', … }) — the two fields need not share a line, so the
    // search window has to end at the next construction site. Without that bound a step whose
    // phase is a variable rather than a literal (`makeTrueLightStep`'s `phase,`) would silently
    // adopt the next step's phase and invent a key that no step has.
    for (const match of text.matchAll(/statStep\(\{\s*id:\s*'([^']+)'/g)) {
      const next = text.indexOf('statStep({', match.index + match[0].length);
      const end = Math.min(next === -1 ? text.length : next, match.index + 600);
      const phase = new RegExp(`phase:\\s*'(${phases})'`).exec(text.slice(match.index, end));
      if (phase) keys.add(`${phase[1]}:${match[1]}`);
    }
    // attackSpecificStep(id, …) hard-codes phase 'attackSpecific' in its own body.
    for (const match of text.matchAll(/attackSpecificStep\(\s*'([^']+)'/g)) {
      keys.add(`attackSpecific:${match[1]}`);
    }
    // emit(id, phase, …) and abilityStatStep(id, phase, …) take the phase positionally.
    for (const match of text.matchAll(
      new RegExp(`(?:emit|abilityStatStep)\\(\\s*'([^']+)',\\s*'(${phases})'`, 'g'))) {
      keys.add(`${match[2]}:${match[1]}`);
    }
    // addChanceDelta(id, source, phase, …) — the source object's own strings are never phases.
    for (const match of text.matchAll(/addChanceDelta\(\s*'([^']+)'/g)) {
      const call = text.slice(match.index, match.index + 400);
      const phase = new RegExp(`'(${phases})'`).exec(call.slice(match[0].length));
      if (phase) keys.add(`${phase[1]}:${match[1]}`);
    }
  }
  return keys;
}

function runCanonicalVersionScopeChecks(ctx) {
  const engineVersions = evalInContext(ctx, 'ENGINE_VERSIONS');
  const scopes = evalInContext(ctx, 'STEP_VERSION_SCOPES');
  const resolveScope = evalInContext(ctx, 'resolveStepVersionScope');
  const sequenceViolations = evalInContext(ctx, 'sequenceVersionScopeViolations');
  const assertSequenceScope = evalInContext(ctx, 'assertSequenceVersionScope');
  const phaseRank = evalInContext(ctx, 'STEP_PHASE_RANK');

  assertEqual(engineVersions.length, 5, 'The canonical scope covers exactly five calculator versions');
  for (const version of Object.keys(STAGE2_SCOPE_EXCEPTIONS)) {
    assert(engineVersions.includes(version),
      `Stage-2 exception inventory names a real calculator version (${version})`);
  }
  assertEqual(Object.keys(STAGE2_SCOPE_EXCEPTIONS).length, engineVersions.length,
    'Every calculator version has a stage-2 exception inventory');

  // --- 1. the registry itself ---
  const scopeKeys = Object.keys(scopes);
  assert(scopeKeys.length > 0, 'The canonical version-scope registry is populated');
  for (const key of scopeKeys) {
    const phase = key.slice(0, key.indexOf(':'));
    assert(Object.prototype.hasOwnProperty.call(phaseRank, phase),
      `Version-scope key ${key} names a real step phase`);
    const scope = scopes[key];
    assert(Array.isArray(scope) && scope.length > 0,
      `Version-scope entry ${key} names at least one version`);
    assert(Object.isFrozen(scope), `Version-scope entry ${key} is frozen`);
    assertEqual(new Set(scope).size, scope.length,
      `Version-scope entry ${key} lists no version twice`);
    for (const version of scope) {
      assert(engineVersions.includes(version),
        `Version-scope entry ${key} names a real calculator version (${version})`);
    }
    // A scope is an exact version set: "DOS", "modern" or "all" as a bare label is not one.
    const ordered = engineVersions.filter(version => scope.includes(version));
    assertEqual(scope.join(','), ordered.join(','),
      `Version-scope entry ${key} lists its versions in engine order`);
  }

  // --- 2. the projected To-Hit/To-Block ledger inherits, rather than duplicates, a scope ---
  assertEqual(resolveScope('c', 'chance:lucky'), resolveScope('c', 'lucky'),
    'A projected chance step inherits the scope of the step it projects');
  assertEqual(resolveScope('b', 'chance:trueLightIllusion'), resolveScope('b', 'trueLight'),
    "True Light's Illusion projection inherits the Warlord region-b scope");
  assertEqual(resolveScope('c', 'nope:missing'), null,
    'An unclassified step resolves no scope rather than defaulting to every version');

  // --- 3. the relationship to PROVENANCE versions= ---
  const provenanceVersions = new Map();
  for (const file of calculatorFiles) {
    const lines = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8').split(/\r?\n/);
    for (const comment of readProvenanceComments(file, lines)) {
      const match = /^(?:VERIFIED|UNVERIFIED)\s+versions=([^;]+);/.exec(comment.body);
      if (match) {
        provenanceVersions.set(comment.id,
          match[1].split(',').map(value => value.trim()).filter(Boolean));
      }
    }
  }
  const scopeUnionById = new Map();
  for (const key of scopeKeys) {
    const id = key.slice(key.indexOf(':') + 1);
    if (!scopeUnionById.has(id)) scopeUnionById.set(id, new Set());
    for (const version of scopes[key]) scopeUnionById.get(id).add(version);
  }
  const observedGaps = {};
  const observedMissingProvenance = [];
  for (const [id, union] of scopeUnionById) {
    const provenance = provenanceVersions.get(id);
    if (!provenance) { observedMissingProvenance.push(id); continue; }
    // An id may be written by more than one step object when two engines make the same effect
    // from different regions, so the reviewed versions must fall inside the union.
    for (const version of provenance) {
      assert(union.has(version),
        `PROVENANCE[${id}] claims ${version}, which the canonical scope excludes`);
    }
    const wider = [...union].filter(version => !provenance.includes(version));
    if (wider.length > 0) observedGaps[id] = wider.sort();
  }
  assertSameKeyList(observedMissingProvenance.sort(), [...SCOPE_IDS_WITHOUT_PROVENANCE].sort(),
    'Only the version-chosen tactician ids lack a PROVENANCE comment of their own');
  assertSameKeyList(Object.keys(observedGaps).sort(), Object.keys(SCOPE_PROVENANCE_GAPS).sort(),
    'The recorded evidence-coverage gaps are exactly the formulas whose scope exceeds their citations');
  for (const [id, versions] of Object.entries(observedGaps)) {
    assertEqual(versions.join(','), [...SCOPE_PROVENANCE_GAPS[id]].sort().join(','),
      `Evidence-coverage gap for ${id} covers the recorded versions`);
  }

  // --- 4. scope at the call site, where no per-step predicate can see it ---
  // All six GetEffectiveResistance steps and all nine EffectiveDefense steps are ungated: the
  // lists are CoM2-only because buildResistanceContext / computeDefenseProfile only reach them
  // from their `startsWith('com2')` branch. Checking membership here is the only way to see it.
  const resistanceSteps = evalInContext(ctx, 'EFFECTIVE_RESISTANCE_STEPS');
  const defenseSteps = evalInContext(ctx, 'EFFECTIVE_DEFENSE_STEPS');
  for (const [label, steps] of [['GetEffectiveResistance', resistanceSteps],
    ['EffectiveDefense', defenseSteps]]) {
    for (const version of ['com2_1.05.11', 'com2_warlord_1.5.12.7']) {
      assertEqual(sequenceViolations(steps, version).length, 0,
        `${label} runs entirely inside its version scope in ${version}`);
    }
    for (const version of ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']) {
      assertEqual(sequenceViolations(steps, version).length, steps.length,
        `${label} is out of scope for every step in ${version}`);
      let threw = false;
      try { assertSequenceScope(steps, version, label); } catch (error) { threw = true; }
      assert(threw, `${label} entering a sequence under ${version} is caught at the call site`);
    }
  }
  // The DOS engines must not reach those lists at all. effectiveResistance/effectiveDefense
  // assert their own scope while the step-debug switch is on, which it is for this whole run,
  // so every resolveCombat call in these checks has already exercised that guard.
  const dosTarget = ctx.deriveUnitStats(baseUnitInput({ version: 'mom_1.31', res: 8, def: 4 }));
  assertEqual(ctx.effectiveResistance(dosTarget, 'com2_1.05.11', 'chaos'), 8,
    'GetEffectiveResistance still runs for a modern version with the call-site check active');
  let dosThrew = false;
  try { ctx.effectiveResistance(dosTarget, 'mom_1.31', 'chaos'); } catch (error) { dosThrew = true; }
  assert(dosThrew, 'Calling GetEffectiveResistance with a DOS version is caught by the call-site check');

  // --- 5. the sweep: membership, the complement assertion, and inertness ---
  const probes = abilityScopeProbeValues(ctx);
  const everyAbility = {};
  for (const [key, values] of probes) everyAbility[key] = values[0];
  const unitTypes = ['normal', 'hero', 'fantastic_life', 'fantastic_death', 'fantastic_chaos',
    'fantastic_nature', 'fantastic_sorcery', 'fantastic_arcane'];
  const rtbTypes = ['none', 'ranged', 'thrown', 'fire', 'lightning', 'stoning', 'death', 'doom',
    'boulder', 'magic'];
  const globals = [{}, { trueLight: true }, { darkness: true }, { warpReality: true },
    { enemyEternalNight: true, eternalNight: true }, { hurricane: true },
    { cityWalls: 'normal' }, { nodeAura: 'chaos' }, { chaosSurge: true }, { poxHost: true },
    { rangedCheck: true, rangedDist: 5 }];

  const visitedKeys = new Set();
  for (const version of engineVersions) {
    const members = new Set();
    const predicateTrue = new Set();
    const changed = new Set();
    const record = input => {
      const result = ctx.deriveUnitStats(input);
      // Coverage is a throw rather than a counted assertion: it runs once per visited step per
      // derivation, and counting it would bury every other assertion in the suite.
      const scopeOf = event => {
        const scope = resolveScope(event.phase, event.id);
        if (!scope) {
          throw new Error(`step ${event.phase}:${event.id} has no canonical version scope`);
        }
        return scope;
      };
      for (const event of result.statExecutionTrace) {
        visitedKeys.add(`${event.phase}:${event.id}`);
        if (scopeOf(event).includes(version)) continue;
        const key = `${event.phase}:${event.id}`;
        members.add(key);
        if (event.status === 'applied') predicateTrue.add(key);
      }
      for (const event of [...(result.statTrace || []), ...(result.identityTrace || [])]) {
        visitedKeys.add(`${event.phase}:${event.id}`);
        if (!scopeOf(event).includes(version)) changed.add(`${event.phase}:${event.id}`);
      }
      // deriveUnitStats runs four sequences, not one. The stat sequence's complete ledger is
      // read above; the figure sequence and the To-Hit/To-Block ledger keep their own traces,
      // which the result exposes only as projections. Read those too, so `changed` means "no
      // out-of-scope step writes anything this version displays" rather than "none writes a
      // stat". Both sequences are composed unconditionally, so each does carry out-of-scope
      // members outside its scope — `base:altarOfTheSun:figures` and
      // `base:alumniOfAcademy:figures` (Warlord) in every other version, and the two
      // `attackSpecific:chance:*ProbabilityBound` steps (modern) in the DOS builds. None of
      // them fires there, which is what these lists assert rather than assume.
      const projections = result.modifierTraces || {};
      for (const name of ['figures', 'toHitMelee', 'toHitRanged', 'toBlock']) {
        for (const event of (projections[name] && projections[name].entries) || []) {
          visitedKeys.add(`${event.phase}:${event.id}`);
          if (!scopeOf(event).includes(version)) changed.add(`${event.phase}:${event.id}`);
        }
      }
    };
    for (const globalState of globals) {
      for (const unitType of unitTypes) {
        for (const rtbType of rtbTypes) {
          // `orihalcon` is the armor control's only non-normal value; passing a weapon quality
          // such as `magic` here would name the armor axis without exercising it.
          record(baseUnitInput({ ...globalState, version, abilities: { ...everyAbility },
            unitType, rtbType, level: 'elite', weapon: 'magic', armor: 'orihalcon', dmg: 2 }));
        }
      }
    }
    for (const [key, values] of probes) {
      for (const value of values) {
        record(baseUnitInput({ version, abilities: { [key]: value },
          unitType: 'normal', rtbType: 'ranged', level: 'elite' }));
        record(baseUnitInput({ version, abilities: { [key]: value },
          unitType: 'fantastic_chaos', rtbType: 'thrown', level: 'elite' }));
      }
    }
    const expected = STAGE2_SCOPE_EXCEPTIONS[version];
    assertSameKeyList([...members].sort(), expected.members,
      `${version} composes exactly the recorded out-of-scope steps (stage 2 filters these)`);
    assertSameKeyList([...predicateTrue].sort(), expected.predicateTrue,
      `${version} has exactly the recorded complement-assertion violations`);
    assertSameKeyList([...changed].sort(), expected.changed,
      `${version} has exactly the recorded out-of-scope steps that still write a field`);
    // The partition has to hold in both directions, or the inventories describe nothing.
    for (const key of expected.predicateTrue) {
      assert(expected.members.includes(key),
        `${version} complement violation ${key} is also a recorded sequence member`);
    }
    for (const key of expected.changed) {
      assert(expected.predicateTrue.includes(key),
        `${version} out-of-scope writer ${key} also has a true predicate`);
    }
  }

  // --- 6. no orphan entries: a registry row for a step that no longer exists would rot ---
  // The sweep observes steps through what deriveUnitStats exposes, which is the stat sequence's
  // complete execution ledger plus two sparse traces. Everything it cannot see that way is
  // listed here with the reason, so an entry can never go unexplained.
  const unreachedByTheSweep = [
    // The attack-specific routines run on a scratch copy from resolveCombat, not from
    // deriveUnitStats; section 4 above checks their membership directly instead.
    ...resistanceSteps.map(step => `attackSpecific:${step.id}`),
    ...defenseSteps.map(step => `attackSpecific:${step.id}`),
    // The figure sequence is read through its projection above, but a projection carries only
    // the steps that changed `figs`, and neither Warlord building's race/name prerequisite is
    // built by the swept template-less custom unit.
    'base:altarOfTheSun:figures', 'base:alumniOfAcademy:figures',
    // Identity conversions appear only in the sparse identity trace, so they are invisible
    // here unless they change race/Fantastic for the swept template-less custom unit.
    'a:identity:callToArmsPaladins', 'a:identity:chosen', 'a:identity:constructCatapult',
    'b:identity:marionetteChanneler', 'base:identity:com1ConstructCatapult',
    'base:identity:zombies',
    // Writes behind a prerequisite the sweep does not build: the Outlander armorclad reform,
    // and the Rust ranged half, which is merged into the `rust` ability step's apply().
    'b:battleArmor', 'd:rust:ranged',
  ].sort();
  const orphans = scopeKeys.filter(key => !visitedKeys.has(key)).sort();
  assertSameKeyList(orphans, unreachedByTheSweep,
    'Every canonical scope entry names a step the derivation sweep composes, or a listed exception');
  // Exact equality above already catches a *stale* exception — a listed key the sweep starts
  // reaching drops out of `orphans` and the lists disagree. It cannot catch a *deleted* step:
  // its row stays, stays unobserved, stays listed, and keeps classifying nothing. Give every
  // exempted row the existence proof the sweep gives the other 179.
  const constructible = constructibleStepKeys();
  for (const key of unreachedByTheSweep) {
    assert(constructible.has(key),
      `Scope entry ${key} is exempt from the sweep, so its step must still be constructed in source`);
  }
}

module.exports = { runCanonicalVersionScopeChecks };
