// M9: the canonical engine-version scope and the checks that hold it current. The scope table
// itself lives in Calculator/steps.js.

'use strict';

const fs = require('fs');
const path = require('path');
const { calculatorFiles, readProvenanceComments } = require('../provenance_audit');
const { repoRoot } = require('../calculator_sources');
const {
  evalInContext, assert, assertEqual, baseUnitInput, assertSameKeyList,
} = require('./assertions');

// `Calculator/steps.js` STEP_VERSION_SCOPES is the single home for which engines make a
// derivation write at all, and `filterStepsToVersionScope` applies it to every sequence before
// composition. These checks are what make that a claim rather than a comment.
//
// Stage 2 turned the measured worklist into an invariant. Where stage 1 enumerated, per
// version, the steps composed outside their scope (48/48/39/32/15 of them), the sweep below
// asserts the list is now empty in all three senses at once: no out-of-scope step is composed,
// none evaluates its predicate true, and none writes a field. An enumeration would only rot;
// zero is the whole statement.

// The canonical scope is initialised from PROVENANCE `versions=` and the two are asserted to
// agree, so neither can drift. Where the canonical scope is *wider*, the write demonstrably
// runs in a build whose sources the formula's citations do not cover; that is an evidence gap
// in the citation, not a scope error, and each one is listed here with its reason so a new gap
// cannot appear silently.
const SCOPE_PROVENANCE_GAPS = {
  trueLight: ['mom_1.31', 'mom_cp_1.60.00'],
  nodeAura: ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'],
  survivalInstinct: ['com_6.08'],
};
// M11 gave `tactician` one id across all three CoM engines, so its own PROVENANCE comment now
// covers it and the exemption this list held is gone. Every scope id carries its own citation.
const SCOPE_IDS_WITHOUT_PROVENANCE = [];

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
    // abilityStep(id, phase, …) takes the phase positionally.
    for (const match of text.matchAll(
      new RegExp(`abilityStep\\(\\s*'([^']+)',\\s*'(${phases})'`, 'g'))) {
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
  assertEqual(resolveScope({ phase: 'c', id: 'chance:lucky', projectionOf: 'c:lucky' }),
    resolveScope({ phase: 'c', id: 'lucky' }),
    'A projected chance step inherits the scope of the step it projects');
  assertEqual(
    resolveScope({ phase: 'b', id: 'chance:trueLightIllusion', projectionOf: 'b:trueLight' }),
    resolveScope({ phase: 'b', id: 'trueLight' }),
    "True Light's Illusion projection inherits the Warlord region-b scope");
  assertEqual(resolveScope({ phase: 'c', id: 'nope:missing' }), null,
    'An unclassified step resolves no scope rather than defaulting to every version');
  // The marker has to be what does the inheriting, not the prefix. A `chance:` step that is not
  // a projection — the three resolution-time writes native to the ledger — has a row of its own,
  // and deriving inheritance from the id would silently hand it the scope of whatever it looked
  // like it projected. Without a `projectionOf`, an unrowed `chance:` id resolves nothing.
  assertEqual(resolveScope({ phase: 'attackSpecific', id: 'chance:distancePenalty' }),
    scopes['attackSpecific:chance:distancePenalty'],
    'A ledger step that projects nothing resolves through its own row');
  assertEqual(resolveScope({ phase: 'c', id: 'chance:weakness' }), null,
    'An unmarked chance id does not inherit the scope of the step it would project');
  // M13: `chance:` is the To-Hit/To-Block ledger's namespace and nothing else's, which is what
  // keeps a projection's key from colliding with the key of the write it projects. Every ledger
  // step lives under `attackSpecific:` (its own three) or is built by buildChanceProjection from
  // a stat event; no *derivation* row may carry the prefix.
  assertSameKeyList(
    scopeKeys.filter(key => !key.startsWith('attackSpecific:')
      && key.slice(key.indexOf(':') + 1).startsWith('chance:')).sort(), [],
    'No derivation write carries the To-Hit/To-Block ledger\'s `chance:` namespace');

  // --- 2b. the filter itself, tested directly rather than only through its effect ---
  // `filterStepsToVersionScope` is what makes the registry decide membership. The sweep below
  // proves the composed sequences are clean; this proves the mechanism that cleans them, so a
  // filter accidentally reduced to the identity function fails here rather than passing there
  // because nothing happened to be out of scope.
  const filterSteps = evalInContext(ctx, 'filterStepsToVersionScope');
  const filterProbe = [
    { id: 'berserk', phase: 'c' },        // SCOPE_MOM
    { id: 'level', phase: 'c' },          // SCOPE_ALL
    { id: 'destiny', phase: 'c' },        // SCOPE_MODERN
    { id: 'chance:lucky', phase: 'c', projectionOf: 'c:lucky' },  // projection, inherits SCOPE_ALL
  ];
  assertEqual(filterSteps(filterProbe, 'mom_1.31').map(step => step.id).join(','),
    'berserk,level,chance:lucky', 'The scope filter keeps exactly the writes MoM 1.31 makes');
  assertEqual(filterSteps(filterProbe, 'com2_1.05.11').map(step => step.id).join(','),
    'level,destiny,chance:lucky', 'The scope filter keeps exactly the writes CoM2 makes');
  assertEqual(filterSteps([], 'mom_1.31').length, 0, 'The scope filter accepts an empty sequence');
  let filterThrew = false;
  try {
    filterSteps([{ id: 'nope:missing', phase: 'c' }], 'mom_1.31');
  } catch (error) { filterThrew = true; }
  assert(filterThrew,
    'An unclassified step reaching the filter throws rather than being silently kept or dropped');

  // --- 2c. the execution chain: one ordering mechanism, and what it claims about each entry ---
  // The chain is the position authority the version scope is keyed against, so it is checked
  // here rather than in a file of its own: the same `phase:id` key has to name a real scope row
  // and a real chain entry, or the two registries describe different things.
  const statChain = evalInContext(ctx, 'statChain');
  // The modern region-`c` identity conversions head their region by convention rather than
  // sitting at the offsets their blocks occupy. The DOS builds take theirs from the addresses
  // `unitcalc.c` gives every realm write in `BU_Apply_Specials`, so only Raise Dead — a
  // combat-spell write from `combat.c` that routine never makes — stays inherited there.
  const deducedIdentityC = [
    'c:destiny:race', 'c:chaosChannels:flight', 'c:chaosChannels:armor:race', 'c:bloodLust',
    'c:blackChannels:race', 'c:undead', 'c:mysticSurge:race', 'c:raiseDead',
  ];
  const deducedInsideTranscribedRegion = {
    'mom_1.31': [],
    'mom_cp_1.60.00': [],
    // CoM 1's Focus Magic position is inferred from what its recompute writes after Warp.
    'com_6.08': ['c:focusMagic', 'c:raiseDead'],
    'com2_1.05.11': deducedIdentityC,
    'com2_warlord_1.5.12.7': deducedIdentityC,
  };
  for (const version of engineVersions) {
    const chain = statChain(version);
    const keys = chain.map(entry => entry.key);
    assertEqual(new Set(keys).size, keys.length, `${version}'s execution chain names no key twice`);
    for (const entry of chain) {
      const scope = scopes[entry.key];
      assert(!!scope, `Chain entry ${entry.key} (${version}) names a step with a canonical scope`);
      assert(scope.includes(version),
        `Chain entry ${entry.key} is in ${version}'s chain and in scope for it`);
    }
    // Every in-scope write has a position. `d:rust:ranged` is the one exception: it is the
    // internal ranged half of Rust's single atomic engine write, constructed as a step object
    // but never composed into a sequence, so it has a scope row and no chain entry.
    const positioned = new Set(keys);
    const needsPosition = Object.keys(scopes).filter(key => scopes[key].includes(version)
      && !key.startsWith('attackSpecific:') && key !== 'd:rust:ranged');
    assertSameKeyList(needsPosition.filter(key => !positioned.has(key)).sort(), [],
      `${version} gives every in-scope derivation write a position in its chain`);
    // `provisional` is a claim about evidence, so it is asserted key by key rather than left as
    // a decoration: the transcribed regions are the compiled region-c map and the Warlord CAS
    // hooks, minus the individually deduced positions inside them.
    const expectedProvisional = keys.filter(key => {
      const phase = key.slice(0, key.indexOf(':'));
      if (['base', 'a', 'e'].includes(phase)) return true;
      return (deducedInsideTranscribedRegion[version] || []).includes(key);
    }).sort();
    const observedProvisional = chain.filter(entry => entry.provisional)
      .map(entry => entry.key).sort();
    assertSameKeyList(observedProvisional, expectedProvisional,
      `${version} marks exactly the inherited and deduced chain positions provisional`);
  }

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
    'Every canonical scope id has a PROVENANCE comment of its own');
  assertSameKeyList(Object.keys(observedGaps).sort(), Object.keys(SCOPE_PROVENANCE_GAPS).sort(),
    'The recorded evidence-coverage gaps are exactly the formulas whose scope exceeds their citations');
  for (const [id, versions] of Object.entries(observedGaps)) {
    assertEqual(versions.join(','), [...SCOPE_PROVENANCE_GAPS[id]].sort().join(','),
      `Evidence-coverage gap for ${id} covers the recorded versions`);
  }

  // --- 4. scope at the call site, where no per-step predicate can see it ---
  // No step in any of the four attack-specific lists carries a version predicate. The Caster.exe
  // pair is CoM2-only because buildResistanceContext / computeDefenseProfile only reach them from
  // their `startsWith('com2')` branch, and the DOS pair is keyed by version rather than gated, so
  // checking membership here is the only way to see either fact.
  const resistanceSteps = evalInContext(ctx, 'EFFECTIVE_RESISTANCE_STEPS');
  const defenseSteps = evalInContext(ctx, 'EFFECTIVE_DEFENSE_STEPS');
  const dosResistanceSteps = evalInContext(ctx, 'DOS_RESISTANCE_STEPS');
  const dosDefenseSteps = evalInContext(ctx, 'DOS_DEFENSE_STEPS');
  const MODERN = ['com2_1.05.11', 'com2_warlord_1.5.12.7'];
  const DOS = ['mom_1.31', 'mom_cp_1.60.00', 'com_6.08'];
  const assertCallSiteScope = (label, steps, inScope, outOfScope) => {
    for (const version of inScope) {
      assertEqual(sequenceViolations(steps, version).length, 0,
        `${label} runs entirely inside its version scope in ${version}`);
    }
    for (const version of outOfScope) {
      assertEqual(sequenceViolations(steps, version).length, steps.length,
        `${label} is out of scope for every step in ${version}`);
      let threw = false;
      try { assertSequenceScope(steps, version, label); } catch (error) { threw = true; }
      assert(threw, `${label} entering a sequence under ${version} is caught at the call site`);
    }
  };
  assertCallSiteScope('GetEffectiveResistance', resistanceSteps, MODERN, DOS);
  assertCallSiteScope('EffectiveDefense', defenseSteps, MODERN, DOS);
  for (const version of DOS) {
    assertCallSiteScope(`Combat_Effective_Resistance(${version})`,
      dosResistanceSteps[version], [version], MODERN);
    assertCallSiteScope(`Battle_Unit_Defense_Special(${version})`,
      dosDefenseSteps[version], [version], MODERN);
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
    // `'3'` is the intact-wall position. The list carried `'normal'` — a weapon/armor
    // spelling that names no City walls option, so the axis produced bonus 0 and was never
    // exercised. F113's fail-loud conversion in `deriveUnitStats` is what surfaced it.
    { cityWalls: '3' }, { nodeAura: 'chaos' }, { chaosSurge: true }, { poxHost: true },
    { rangedCheck: true, rangedDist: 5 }];

  const visitedKeys = new Set();
  // M13's namespace rule, observed rather than declared: every entry of the To-Hit/To-Block
  // ledger is `chance:`-prefixed and no entry of the stat sequence is, so a projected key can
  // never be the key of the write it projects.
  const prefixedStatSteps = new Set();
  const unprefixedLedgerSteps = new Set();
  for (const version of engineVersions) {
    const members = new Set();
    const predicateTrue = new Set();
    const changed = new Set();
    const record = input => {
      const result = ctx.deriveUnitStats(input);
      // Coverage is a throw rather than a counted assertion: it runs once per visited step per
      // derivation, and counting it would bury every other assertion in the suite.
      const scopeOf = event => {
        const scope = resolveScope(event);
        if (!scope) {
          throw new Error(`step ${event.phase}:${event.id} has no canonical version scope`);
        }
        return scope;
      };
      for (const event of result.statExecutionTrace) {
        visitedKeys.add(`${event.phase}:${event.id}`);
        if (event.id.startsWith('chance:')) prefixedStatSteps.add(`${event.phase}:${event.id}`);
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
      // read above; the figure sequence, the identity pre-pass and the To-Hit/To-Block ledger
      // keep their own traces, which the result exposes only as projections. Read those too, so
      // the invariant covers every sequence rather than the largest one — stage 1 measured its
      // worklist from `statExecutionTrace` alone, and the figure and chance sequences carried
      // out-of-scope members it could not see.
      const projections = result.modifierTraces || {};
      for (const name of ['figures', 'toHitMelee', 'toHitRanged', 'toBlock']) {
        for (const event of (projections[name] && projections[name].entries) || []) {
          visitedKeys.add(`${event.phase}:${event.id}`);
          if (name !== 'figures' && !event.id.startsWith('chance:')) {
            unprefixedLedgerSteps.add(`${event.phase}:${event.id}`);
          }
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
    // The stage-2 invariant. `members` is the strongest of the three — an out-of-scope step
    // that is never composed can neither fire nor write — but all three are asserted, because
    // they are read from different traces and a projection could reintroduce one on its own.
    assertSameKeyList([...members].sort(), [],
      `${version} composes no step outside its canonical version scope`);
    assertSameKeyList([...predicateTrue].sort(), [],
      `${version} evaluates no out-of-scope step's predicate`);
    assertSameKeyList([...changed].sort(), [],
      `${version} has no out-of-scope step writing a displayed field`);
  }
  // The sweep has to be the reason those lists are empty, not an empty sweep. Its own coverage
  // is asserted below (section 6) against the whole registry; this is the cheap floor.
  assert(visitedKeys.size > 100,
    'The derivation sweep observed a populated set of steps, so the empty inventories mean something');
  assertSameKeyList([...prefixedStatSteps].sort(), [],
    'No stat-sequence step carries the ledger\'s `chance:` namespace');
  assertSameKeyList([...unprefixedLedgerSteps].sort(), [],
    'Every To-Hit/To-Block ledger entry carries the `chance:` namespace');

  // --- 6. no orphan entries: a registry row for a step that no longer exists would rot ---
  // The sweep observes steps through what deriveUnitStats exposes, which is the stat sequence's
  // complete execution ledger plus two sparse traces. Everything it cannot see that way is
  // listed here with the reason, so an entry can never go unexplained.
  const unreachedByTheSweepEntries = [
    // The attack-specific routines run on a scratch copy from resolveCombat, not from
    // deriveUnitStats; section 4 above checks their membership directly instead.
    ...resistanceSteps.map(step => `attackSpecific:${step.id}`),
    ...defenseSteps.map(step => `attackSpecific:${step.id}`),
    ...DOS.flatMap(version => [...dosResistanceSteps[version], ...dosDefenseSteps[version]]
      .map(step => `attackSpecific:${step.id}`)),
    // The figure sequence is read through its projection above, but a projection carries only
    // the steps that changed `figs`, and neither Warlord building's race/name prerequisite is
    // built by the swept template-less custom unit.
    'base:altarOfTheSun:figures', 'base:alumniOfAcademy:figures',
    // Identity conversions appear only in the sparse identity trace, so they are invisible
    // here unless they change race/Fantastic for the swept template-less custom unit.
    'a:callToArmsPaladins', 'a:chosen', 'a:constructCatapult',
    'b:marionetteChanneler', 'base:constructCatapult',
    'base:zombies',
    // Fiery Fury's realm write fires only on a base-Fantastic unit, and the sweep's only
    // base-Fantastic shapes are already Chaos by the time it runs — either from their own
    // `fantastic_chaos` identity or from the region-`a` Chaos Channels write — so the step
    // applies and changes nothing.
    'b:fieryFury:race',
    // A write behind a prerequisite the sweep does not build: the Outlander armorclad reform.
    'b:battleArmor',
  ];
  const unreachedByTheSweep = [...new Set(unreachedByTheSweepEntries)].sort();
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
