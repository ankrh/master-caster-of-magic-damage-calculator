// --- Stat transform steps (R1) ---
// The single mechanism for stat derivation: a phase-tagged sequence of steps over a
// mutable unit record. See SPEC.md, *Stat derivation contract*; completion history is in
// Calculator/HISTORY.md.
//
// One step is one engine write, made at the position the engine makes it. Additive,
// scaling, replacing and short-circuiting effects are all the same shape, because the
// engine makes them all the same way. A step may read any field's *current* value —
// that is what its position means — and the permanent base record through `ctx.base`.
//
// No DOM dependencies; loaded before the combat_*.js and stats*.js sources.

// Returned by a step's apply() to stop the sequence. `EffectiveDefense` step 2 needs it
// (Illusion against a defender without Illusion Immunity returns immediately, so no
// later bonus or immunity applies); nothing in the derivation phases does.
const HALT = Object.freeze({ halt: true });

// Sequence-position labels, in execution order. `base` plus the engine's five
// derivation regions, followed by the separate attack-specific axis:
//   base      permanent ABase writes made before combat
//   a         precalc, in the binary
//   b         precalc, in UnitCalcPre.CAS      (Warlord only)
//   c         magic calc, in the binary
//   d         magic calc, in UnitCalc.CAS      (Warlord only)
//   e         the binary's post-hook tail: the final clamps, the aura pass, Supreme Light
//
// `attackSpecific` is not a sixth derivation phase. It tags steps in
// GetEffectiveResistance / EffectiveDefense, which run on a disposable copy after
// derivation and are keyed by an incoming attack. The stage itself exists in every
// engine; only CoM2/Warlord model it as steps today — the DOS engines compute the
// same values as inline arithmetic in buildResistanceContext / computeDefenseProfile.
//
// Every other phase is an engine region. The two scaffolding phases the migration ran on —
// `tail` (a post-total pass over finished stats) and `warpLate` (CoM 1's post-Warp tail) —
// were deleted at R1 stage 10, when each of their steps moved to the region the map gives it.
const STEP_PHASES = ['base', 'a', 'b', 'c', 'd', 'e', 'attackSpecific'];
const STEP_PHASE_RANK = STEP_PHASES.reduce((rank, phase, i) => (rank[phase] = i, rank), {});

// --- Canonical engine-version scope (M9) ---
//
// Phase says *where* in an engine a write happens; scope says *which engines make it at all*.
// `STEP_VERSION_SCOPES` below is the single home for the second fact, for every phase and for
// the separate attackSpecific lists. It is keyed by `phase:id` — the same key the F20 source
// manifests use — because two step objects may share an id when two engines write the same
// effect from different regions (`b:trueLight` is the Warlord CAS block, `c:trueLight` the DOS
// region-c one).
//
// Scope is an upper bound on applicability, not a firing condition. Inside its scope a step
// still asks `when` whether this particular unit/state fires it; outside its scope the engine
// has no such write, so the step must never contribute. That complement is what the checks
// assert (`tools/node_unit_checks.js`, canonical version scope).
//
// Relationship to the three mechanisms that used to carry this fact:
//   `when` predicates       still gate firing *within* scope; a version test inside a
//                           predicate is now a duplicate of the scope entry, not the home.
//   `subgroup`              is a property of a UI *control* (abilities.js, enchantments.js), not
//                           of a step: several controls map to one calcKey
//                           (`discipline`/`disciplineWarlord`), so it can never be per-step. It
//                           stays the authority for control visibility.
//   PROVENANCE `versions=`  states which builds' sources were reviewed for the formula. Every
//                           entry here is initialised from it and the checks assert the two
//                           agree, except for the recorded gaps where the write is evidenced
//                           for fewer builds than it runs in (see the notes below).
//
// Stage 1 only classifies: nothing here filters a sequence yet, so no arithmetic changes.
const ENGINE_VERSIONS = Object.freeze([
  'mom_1.31', 'mom_cp_1.60.00', 'com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.7',
]);

// Named version sets. Every set names its exact members: family labels alone are not a scope.
const SCOPE_ALL = ENGINE_VERSIONS;
const SCOPE_DOS = Object.freeze(['mom_1.31', 'mom_cp_1.60.00', 'com_6.08']);
const SCOPE_MOM = Object.freeze(['mom_1.31', 'mom_cp_1.60.00']);
const SCOPE_MOM_MODERN = Object.freeze([
  'mom_1.31', 'mom_cp_1.60.00', 'com2_1.05.11', 'com2_warlord_1.5.12.7',
]);
const SCOPE_COM1 = Object.freeze(['com_6.08']);
const SCOPE_COM_PLUS = Object.freeze(['com_6.08', 'com2_1.05.11', 'com2_warlord_1.5.12.7']);
const SCOPE_MODERN = Object.freeze(['com2_1.05.11', 'com2_warlord_1.5.12.7']);
const SCOPE_WARLORD = Object.freeze(['com2_warlord_1.5.12.7']);

const STEP_VERSION_SCOPES = Object.freeze({
  // --- base: permanent ABase writes made before the encounter ---
  'base:altarOfTheMoon': SCOPE_WARLORD,
  'base:altarOfTheSun:figures': SCOPE_WARLORD,
  'base:altarOfTheSun:holyMother': SCOPE_WARLORD,
  'base:alumniOfAcademy:figures': SCOPE_WARLORD,
  'base:armorclad': SCOPE_WARLORD,
  'base:artificer': SCOPE_WARLORD,
  'base:chance:baseBlock': SCOPE_ALL,
  'base:chance:baseMelee': SCOPE_ALL,
  'base:chance:baseRtb': SCOPE_ALL,
  'base:chance:survivalInstinctToBlock': SCOPE_WARLORD,
  'base:dragonMound': SCOPE_WARLORD,
  'base:energyCannon': SCOPE_WARLORD,
  'base:identity:com1ConstructCatapult': SCOPE_COM1,
  'base:identity:com1SummonBranch': SCOPE_COM1,
  'base:identity:zombies': SCOPE_COM1,
  'base:identity:zombies:toBlock': SCOPE_COM1,
  'base:lightningBlade:breath': SCOPE_WARLORD,
  'base:ludusAgoge': SCOPE_WARLORD,
  'base:malnourished': SCOPE_WARLORD,
  'base:militaryWorkshop': SCOPE_WARLORD,
  'base:motherFungus': SCOPE_WARLORD,
  'base:naturalSelection:coal': SCOPE_WARLORD,
  'base:naturalSelection:iron': SCOPE_WARLORD,
  'base:naturalSelection:nightshade': SCOPE_WARLORD,
  'base:naturalSelection:powerMinerals': SCOPE_WARLORD,
  'base:naturalSelection:wildGame': SCOPE_WARLORD,
  'base:pillarOfFaith': SCOPE_WARLORD,
  'base:poolOfRepentance': SCOPE_WARLORD,
  'base:rebuild': SCOPE_WARLORD,
  'base:sanctaBasilica': SCOPE_WARLORD,
  'base:spiritLink': SCOPE_WARLORD,
  'base:stat:base': SCOPE_ALL,
  // --- a: precalc, in the binary ---
  'a:chaosChannels:fireBreath': SCOPE_ALL,
  'a:holyBonus': SCOPE_DOS,
  'a:identity:callToArmsPaladins': SCOPE_MODERN,
  'a:identity:chosen': SCOPE_MODERN,
  'a:identity:combatSummoned': SCOPE_MODERN,
  'a:identity:constructCatapult': SCOPE_MODERN,
  'a:identity:legacyConversions': SCOPE_ALL,
  'a:resistanceToAll': SCOPE_DOS,
  // --- b: precalc, in UnitCalcPre.CAS ---
  'b:battleArmor': SCOPE_WARLORD,
  'b:bombsGrenades': SCOPE_WARLORD,
  'b:chance:nausea': SCOPE_WARLORD,
  'b:chance:outlanderBallisticsTraining': SCOPE_WARLORD,
  'b:disheartenProphecy': SCOPE_WARLORD,
  'b:eternalNight:poorVision': SCOPE_WARLORD,
  'b:fieryFury': SCOPE_WARLORD,
  'b:goblinPox': SCOPE_WARLORD,
  'b:godsPlayDices': SCOPE_WARLORD,
  'b:greatUnbinding': SCOPE_WARLORD,
  'b:identity:marionetteChanneler': SCOPE_WARLORD,
  'b:luckyStar': SCOPE_WARLORD,
  'b:magitekEngine': SCOPE_WARLORD,
  'b:marionette:stats': SCOPE_WARLORD,
  'b:marionette:strayedTransmute': SCOPE_WARLORD,
  'b:natureLink': SCOPE_WARLORD,
  'b:outlanderRadio': SCOPE_WARLORD,
  'b:outlanderXenopsychology': SCOPE_WARLORD,
  'b:outlanderXenoveterinary': SCOPE_WARLORD,
  'b:plague': SCOPE_WARLORD,
  'b:prayer:warlordStack': SCOPE_WARLORD,
  'b:rally': SCOPE_WARLORD,
  'b:rebuild': SCOPE_WARLORD,
  'b:soulFlay': SCOPE_WARLORD,
  'b:tactician:warlordClawback': SCOPE_WARLORD,
  'b:trueLight': SCOPE_WARLORD,
  'b:upgradedExplosive:fireBreath': SCOPE_WARLORD,
  'b:upgradedExplosive:ranged': SCOPE_WARLORD,
  'b:uphillBattle': SCOPE_WARLORD,
  'b:wallOfFire:garrison': SCOPE_WARLORD,
  // --- c: magic calc, in the binary ---
  'c:animated': SCOPE_COM_PLUS,
  'c:badMoon': SCOPE_MODERN,
  'c:berserk': SCOPE_MOM,
  'c:blackChannels': SCOPE_MOM,
  'c:blackPrayer': SCOPE_ALL,
  'c:blazingMarch': SCOPE_COM_PLUS,
  'c:blazingMarch:ranged': SCOPE_COM_PLUS,
  'c:breakthrough:combatSummoned': SCOPE_MODERN,
  'c:breakthrough:noncorporeal': SCOPE_MODERN,
  'c:breakthrough:normal': SCOPE_MODERN,
  'c:chance:heavenlyLight:melee': SCOPE_MODERN,
  'c:chance:heavenlyLight:rtb': SCOPE_MODERN,
  'c:chance:holyWeapon:melee': SCOPE_ALL,
  'c:chance:holyWeapon:rtb': SCOPE_ALL,
  'c:chance:vertigo': SCOPE_ALL,
  'c:chance:warpReality': SCOPE_ALL,
  'c:chance:weapon:melee': SCOPE_ALL,
  'c:chance:weapon:rtb': SCOPE_ALL,
  'c:chaosChannels:armor': SCOPE_ALL,
  'c:chaosSurge': SCOPE_ALL,
  'c:charmOfLife': SCOPE_ALL,
  'c:darkForce': SCOPE_MODERN,
  'c:darkness': SCOPE_MOM_MODERN,
  'c:darkness:coM1': SCOPE_COM1,
  'c:destiny': SCOPE_MODERN,
  'c:discipline': SCOPE_MODERN,
  'c:divineBarrierAura:coM1': SCOPE_COM1,
  'c:endurance': SCOPE_COM_PLUS,
  'c:eternalNight:enemyResistance': SCOPE_MODERN,
  'c:eternalNight:enemyResistance:coM1': SCOPE_COM1,
  'c:flameBlade': SCOPE_ALL,
  'c:flameBlade:ranged': SCOPE_ALL,
  'c:focusMagic': SCOPE_COM_PLUS,
  'c:focusMagic:conversion': SCOPE_COM_PLUS,
  'c:giantStrength': SCOPE_MOM,
  'c:giantStrength:thrown': SCOPE_MOM,
  'c:goodMoon': SCOPE_MODERN,
  'c:guardian': SCOPE_COM_PLUS,
  'c:guidingBeaconAura:coM1': SCOPE_COM1,
  'c:heavenlyLight': SCOPE_MODERN,
  'c:highPrayer': SCOPE_ALL,
  'c:holyArmor': SCOPE_ALL,
  'c:innerPower': SCOPE_MODERN,
  'c:ironSkin': SCOPE_ALL,
  'c:landLinking': SCOPE_COM_PLUS,
  'c:landLinking:breath': SCOPE_COM_PLUS,
  'c:level': SCOPE_ALL,
  'c:lionheart': SCOPE_ALL,
  'c:lionheart:rangedHp': SCOPE_ALL,
  'c:lucky': SCOPE_ALL,
  'c:metalFires': SCOPE_MOM,
  'c:mindStorm': SCOPE_ALL,
  'c:mysticSurge': SCOPE_COM_PLUS,
  'c:natureConjunction': SCOPE_MODERN,
  // Wider than PROVENANCE[nodeAura] (Caster.exe only): apply() carries an explicit `!isCoM2`
  // DOS branch for the same +2 package and the node-aura control exists in every version.
  'c:nodeAura': SCOPE_ALL,
  'c:orihalcon': SCOPE_COM_PLUS,
  'c:prayer': SCOPE_ALL,
  'c:realmWard': SCOPE_COM1,
  'c:reinforceMagic': SCOPE_MODERN,
  'c:reinforceMagic:ranged': SCOPE_MODERN,
  'c:shatter': SCOPE_ALL,
  'c:soulLinkerAura:coM1': SCOPE_COM1,
  'c:spellWard': SCOPE_MODERN,
  'c:stoneSkin': SCOPE_MOM,
  'c:supremeLight:coM1': SCOPE_COM1,
  // Wider than PROVENANCE[survivalInstinct] (Caster.exe only): survivalInstinctActiveForUnit
  // gates the effect to CoM+ and PROVENANCE[survivalInstinctEligibility] covers com_6.08.
  'c:survivalInstinct': SCOPE_COM_PLUS,
  // `tactician` is emitted under a version-chosen id; its PROVENANCE lives on
  // tactician:heroDynamic / tactician:nonheroDynamic, which cover com_6.08 as `tactician:coM1`.
  'c:tactician': SCOPE_MODERN,
  'c:tactician:coM1': SCOPE_COM1,
  // The DOS half of True Light. PROVENANCE[trueLight] cites only the Warlord CAS block, which
  // is the separate `b:trueLight` step; the MoM region-c block has no citation yet.
  'c:trueLight': SCOPE_MOM,
  'c:warpAttack': SCOPE_ALL,
  'c:warpDefense': SCOPE_ALL,
  'c:warpResist': SCOPE_ALL,
  'c:weakness': SCOPE_ALL,
  'c:weakness:ranged': SCOPE_ALL,
  'c:weapon': SCOPE_ALL,
  // --- d: magic calc, in UnitCalc.CAS ---
  'd:beatOfSwiftness': SCOPE_WARLORD,
  'd:blazeOfGlory': SCOPE_WARLORD,
  'd:chance:berserkWarlord': SCOPE_WARLORD,
  'd:chance:energyCannonThreshold': SCOPE_WARLORD,
  'd:chance:hurricane': SCOPE_WARLORD,
  'd:chance:trueSight:ranged': SCOPE_WARLORD,
  'd:colossalStrength': SCOPE_WARLORD,
  'd:favoredTerrain': SCOPE_WARLORD,
  'd:flameBlade:fireBreath': SCOPE_WARLORD,
  'd:hierophany': SCOPE_WARLORD,
  'd:identity:spiritLink': SCOPE_WARLORD,
  'd:mechanicalExpert': SCOPE_WARLORD,
  'd:pneumaField': SCOPE_WARLORD,
  'd:psychoForce': SCOPE_WARLORD,
  'd:rust': SCOPE_WARLORD,
  'd:rust:ranged': SCOPE_WARLORD,
  'd:shadowStrike:thrown': SCOPE_WARLORD,
  'd:vampirism:transfer': SCOPE_WARLORD,
  'd:weakness:breath': SCOPE_WARLORD,
  // --- e: the binary's post-hook tail ---
  'e:chance:clamp': SCOPE_MODERN,
  'e:chance:legacyClamp': SCOPE_DOS,
  'e:chance:modernClampCommon': SCOPE_MODERN,
  'e:clamp': SCOPE_ALL,
  'e:divineBarrierAura': SCOPE_MODERN,
  'e:guidingBeaconAura': SCOPE_MODERN,
  'e:holyBonus:aura': SCOPE_MODERN,
  'e:leadershipAura': SCOPE_MODERN,
  'e:mislead': SCOPE_MODERN,
  'e:resistanceToAll:aura': SCOPE_MODERN,
  'e:soulLinkerAura': SCOPE_MODERN,
  'e:supremeLight': SCOPE_MODERN,
  // --- attackSpecific: GetEffectiveResistance / EffectiveDefense, and the resolution-time
  // projections of the To-Hit/To-Block ledger ---
  'attackSpecific:chance:attackRollProbabilityBound': SCOPE_MODERN,
  'attackSpecific:chance:distancePenalty': SCOPE_ALL,
  'attackSpecific:chance:toBlockProbabilityBound': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:armorPiercing': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:base': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:bless': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:elementalArmor': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:illusion': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:immunities': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:largeShield': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:resistElements': SCOPE_MODERN,
  'attackSpecific:effectiveDefense:weaponImmunity': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:base': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:bless': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:charmed': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:magicImmunity': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:resistElements': SCOPE_MODERN,
  'attackSpecific:effectiveResistance:resistMagic': SCOPE_MODERN,
});

// The To-Hit/To-Block ledger re-emits each stat event as a `chance:`-prefixed projection step
// (`chance:${event.id}`, and `chance:trueLightIllusion` for True Light's Illusion malus). A
// projection is the same engine write seen through another output, so it inherits the scope of
// the step it projects rather than getting a second, separately maintained entry.
function stepVersionScopeKey(phase, id) {
  return `${phase}:${id}`;
}

function resolveStepVersionScope(phase, id) {
  const direct = STEP_VERSION_SCOPES[stepVersionScopeKey(phase, id)];
  if (direct) return direct;
  if (typeof id === 'string' && id.startsWith('chance:')) {
    const projected = id === 'chance:trueLightIllusion' ? 'trueLight' : id.slice('chance:'.length);
    const inherited = STEP_VERSION_SCOPES[stepVersionScopeKey(phase, projected)];
    if (inherited) return inherited;
  }
  return null;
}

// The canonical scope of one step. Throws rather than defaulting: a step with no entry has no
// classification, and silently treating it as "every version" is the absence of a home that M9
// exists to remove.
function stepVersionScope(step) {
  if (!step || typeof step.id !== 'string') throw new Error('stepVersionScope: step has no id');
  const scope = resolveStepVersionScope(step.phase, step.id);
  if (!scope) {
    throw new Error(`step ${step.phase}:${step.id} has no canonical version scope`);
  }
  return scope;
}

function stepAppliesToVersion(step, version) {
  return stepVersionScope(step).includes(version);
}

// Coverage, asserted where a real derivation sequence is composed rather than inside
// `statStep`: the constructor is the generic runner's, and its own unit tests build synthetic
// steps that are not engine writes and have no scope. Every step that enters one of the
// calculator's sequences, however, is an engine write and must be classified — a step with no
// entry in STEP_VERSION_SCOPES is precisely the missing home M9 removes, so a default of
// "every version" would silently absorb it.
function assertSequenceVersionScopeCoverage(steps, label) {
  for (const step of steps || []) {
    if (!resolveStepVersionScope(step && step.phase, step && step.id)) {
      throw new Error(`${label || 'sequence'}: step ${step && step.phase}:${step && step.id}`
        + ' has no canonical version scope');
    }
  }
  return steps;
}

// The membership check. Scope also hides at call sites — the six EFFECTIVE_RESISTANCE_STEPS
// carry no predicate and are CoM2-only solely because the `startsWith('com2')` branch of
// buildResistanceContext is the only path that reaches them — so membership has to be checkable
// where steps enter a sequence, not only inside their predicates.
// Returns the steps this version's engine does not contain, in sequence order.
function sequenceVersionScopeViolations(steps, version) {
  const violations = [];
  for (const step of steps || []) {
    if (!stepAppliesToVersion(step, version)) {
      violations.push({ key: stepVersionScopeKey(step.phase, step.id), scope: stepVersionScope(step) });
    }
  }
  return violations;
}

function assertSequenceVersionScope(steps, version, label) {
  const violations = sequenceVersionScopeViolations(steps, version);
  if (violations.length > 0) {
    const named = violations.map(violation => violation.key).join(', ');
    throw new Error(`${label || 'sequence'} runs steps outside their version scope in ${version}: ${named}`);
  }
  return steps;
}

// Development switch for the write check below. Off in normal use — it copies the unit
// record once per step — and turned on by the test suites, which is where a step writing a
// field it did not declare has to be caught. `runStatSteps` also takes it per call, via
// ctx.validateWrites.
let statStepDebug = false;
function setStatStepDebug(on) { statStepDebug = !!on; }
function statStepDebugEnabled() { return statStepDebug; }

// A step:
//   id          stable identifier, unique within a sequence; names the trace entry
//   phase       one of STEP_PHASES — evidence, not decoration: it records which region
//               or resolution axis makes this write
//   writes      the fields the step may write. The trace and the write check read it,
//               so it has to be complete.
//   sourceId / sourceLabel  optional presentation identity for the write's game source;
//               sourceId defaults to the stable step id, so every applied entry is named
//   when(unit, ctx)   optional predicate; a step that never fires costs one call
//   apply(unit, ctx)  mutates `unit`; return HALT to stop the sequence
//   provisional true when the position is not established from the engine but deduced
//               or inherited from the bucket it was migrated out of
// The checks run under the debug switch only. A sequence is rebuilt on every
// deriveUnitStats call — once per roster unit per side when the matrix view is built — so
// in normal use this is the identity function, and the test suites are where a malformed
// step gets caught.
function statStep(step) {
  if (!statStepDebug) return step;
  if (!step || typeof step.apply !== 'function') {
    throw new Error(`statStep: ${step && step.id} has no apply()`);
  }
  if (!Object.prototype.hasOwnProperty.call(STEP_PHASE_RANK, step.phase)) {
    throw new Error(`statStep: ${step.id} has unknown phase ${step.phase}`);
  }
  if (!Array.isArray(step.writes) || step.writes.length === 0) {
    throw new Error(`statStep: ${step.id} declares no writes`);
  }
  return step;
}

// List order *is* execution order — there is no sort. A within-region ordering such as
// Warp-before-Shatter has nowhere else to live, and sorting by phase on every call would
// both cost (deriveUnitStats runs once per roster unit per side when the matrix is built)
// and quietly repair a list authored in the wrong order.
//
// What phase buys instead is a checkable invariant: a sequence must be authored in
// non-decreasing phase order, since a step cannot run in region `b` after one in `c`.
//
// Ids must also be unique, because a sequence is assembled from two places — the list in
// `deriveUnitStats` and the ability steps spliced into it — and a collision would silently
// make the trace ambiguous rather than fail. Both checked under the debug switch only.
function assertStatStepOrder(steps) {
  let rank = -1;
  let previous = null;
  const seen = new Set();
  for (const step of steps) {
    if (!step || typeof step.id !== 'string' || !step.id) {
      throw new Error('stat step has no id');
    }
    if (!Object.prototype.hasOwnProperty.call(STEP_PHASE_RANK, step.phase)) {
      throw new Error(`step ${step.id} has unknown phase ${step.phase}`);
    }
    const stepRank = STEP_PHASE_RANK[step.phase];
    if (stepRank < rank) {
      throw new Error(`step ${step.id} (phase ${step.phase}) is declared after ${previous.id} (phase ${previous.phase})`);
    }
    if (seen.has(step.id)) throw new Error(`step id ${step.id} is declared twice in one sequence`);
    seen.add(step.id);
    rank = stepRank;
    previous = step;
  }
  return steps;
}

// F20's phase manifests are the source-order authority for represented b/c/d writes. The
// composer is deliberately separate from the runner: it walks the manifest explicitly, annotates
// every represented step with its source position, and rejects a missing or duplicated entry.
// There is no generic sort here: a manifest is an authored execution sequence, not a repair for
// an accidentally unordered list, and an unclassified spread must fail loudly.
//
// Both derivation sequences go through this composer — the stat sequence and the ordered
// identity conversions — so a represented b/c/d write cannot reach the trace from a sequence
// that no manifest covers. Their ranks are comparable only within one sequence: the identity
// pre-pass runs entirely before the stat sequence, which is earlier than the source rank one
// of its entries carries (see F20_WARLORD_D_ORDER, `identity:spiritLink`).
function orderStatStepsBySource(steps, manifests, phases = ['b', 'c', 'd']) {
  if (!Array.isArray(steps)) throw new Error('source-order composer received no step list');
  if (!Array.isArray(phases) || phases.length === 0) {
    throw new Error('source-order composer received no phases');
  }
  const phaseSet = new Set(phases);
  if (phaseSet.size !== phases.length) throw new Error('source-order composer received duplicate phases');
  const sourceRanks = new Map();
  const manifestIds = new Set();
  for (const phase of phases) {
    if (!Object.prototype.hasOwnProperty.call(STEP_PHASE_RANK, phase)) {
      throw new Error(`source-order composer received unknown phase ${phase}`);
    }
    const order = manifests && manifests[phase];
    if (!Array.isArray(order)) {
      throw new Error(`source-order manifest for phase ${phase} is missing`);
    }
    for (let rank = 0; rank < order.length; rank++) {
      const id = order[rank];
      if (typeof id !== 'string' || !id) {
        throw new Error(`source-order manifest for phase ${phase} has an invalid id`);
      }
      if (manifestIds.has(id)) throw new Error(`source-order manifest repeats step id ${id}`);
      manifestIds.add(id);
      const key = `${phase}:${id}`;
      if (sourceRanks.has(key)) throw new Error(`source-order manifest repeats ${key}`);
      sourceRanks.set(key, rank);
    }
  }

  const grouped = new Map(STEP_PHASES.map(phase => [phase, []]));
  const represented = new Map();
  for (const step of steps) {
    if (!step || typeof step.id !== 'string' || !step.id) {
      throw new Error('source-order composer received a step without an id');
    }
    if (!grouped.has(step.phase)) {
      throw new Error(`source-order composer received unknown phase ${step.phase}`);
    }
    if (phases.includes(step.phase)) {
      const key = `${step.phase}:${step.id}`;
      if (!sourceRanks.has(key)) {
        throw new Error(`phase ${step.phase} step ${step.id} is missing from its source-order manifest`);
      }
      if (represented.has(key)) {
        throw new Error(`phase ${step.phase} step ${step.id} is represented twice`);
      }
      represented.set(key, step);
    }
    grouped.get(step.phase).push(step);
  }

  const ordered = [];
  for (const phase of STEP_PHASES) {
    if (!phaseSet.has(phase)) {
      ordered.push(...grouped.get(phase));
      continue;
    }
    const manifest = manifests[phase];
    for (let sourceOrder = 0; sourceOrder < manifest.length; sourceOrder++) {
      const key = `${phase}:${manifest[sourceOrder]}`;
      const step = represented.get(key);
      if (!step) continue; // A predicate/version-exclusive step may be absent this run.
      ordered.push({ ...step, sourceOrder });
      represented.delete(key);
    }
  }
  // Every actual represented step must have been consumed by exactly one manifest entry. This
  // is the omission check: inactive manifest entries may be unused, but an emitted step may not.
  for (const [key] of represented) {
    throw new Error(`source-order manifest did not consume represented step ${key}`);
  }
  assertStatStepOrder(ordered);
  // Both derivation sequences are composed here, so this is the one place that sees every
  // phase — `base`/`a`/`e` included, which no manifest covers — and can require each step to
  // carry a canonical engine-version scope.
  if (statStepDebug) assertSequenceVersionScopeCoverage(ordered, 'derivation sequence');
  return ordered;
}

// Run a sequence over `unit`, mutating it in place and returning it.
//
// `ctx` carries everything a step may read besides the unit: `version`, the permanent
// base record as `ctx.base`, and — for the resolution sequences — the attack context.
// Two optional fields are for development only:
//   ctx.trace             an array; each step that changes a declared field appends an entry
//   ctx.executionTrace    an array; every visited step appends an applied/skipped entry
//   ctx.validateWrites    throw if a step writes a field it did not declare
function runStatSteps(steps, unit, ctx) {
  const context = ctx || {};
  const trace = context.trace;
  const executionTrace = context.executionTrace;
  const validate = context.validateWrites || statStepDebug;
  if (validate) assertStatStepOrder(steps);
  for (let order = 0; order < steps.length; order++) {
    const step = steps[order];
    if (step.when && !step.when(unit, context)) {
      if (executionTrace) recordStepExecution(executionTrace, step, order, 'skipped');
      continue;
    }
    const before = (trace || validate) ? { ...unit } : null;
    const result = step.apply(unit, context);
    if (validate) assertStepWrites(step, before, unit);
    if (trace) recordStepTrace(trace, step, before, unit, order);
    if (executionTrace) recordStepExecution(executionTrace, step, order, 'applied');
    if (result === HALT) break;
  }
  if (trace && context.assertTraceOrder) assertStatTraceOrder(trace);
  if (executionTrace && (context.assertTraceOrder || context.assertExecutionTraceOrder)) {
    if (typeof executionTrace.assert === 'function') executionTrace.assert(steps);
    else assertStatTraceOrder(executionTrace, { steps });
  }
  return unit;
}

// A step that writes a field it did not declare is a migration bug: the trace under-reports,
// and — once the sequence carries steps that read each other — so does every later read.
function assertStepWrites(step, before, unit) {
  const declared = new Set(step.writes);
  const fields = new Set([...Object.keys(before), ...Object.keys(unit)]);
  for (const field of fields) {
    if (before[field] === unit[field] || declared.has(field)) continue;
    throw new Error(`step ${step.id} wrote undeclared field ${field} (${before[field]} -> ${unit[field]})`);
  }
}

// One entry per step that changed something, in execution order. Not needed for the red
// display numbers — those are `final - base` — but it is what an ordered "what modified
// this unit" breakdown would read, and where M4's fbRtbMod attribution belongs.
function traceSourceForStep(step) {
  const id = step.sourceId || step.id;
  return {
    id,
    label: step.sourceLabel || id,
  };
}

function collectStepChanges(step, before, unit) {
  const changes = {};
  if (!before) return changes;
  for (const field of step.writes) {
    if (before[field] === unit[field]) continue;
    const from = before[field];
    const to = unit[field];
    changes[field] = (typeof from === 'number' && typeof to === 'number')
      ? { from, to, delta: to - from }
      : { from, to };
  }
  return changes;
}

function recordStepTrace(trace, step, before, unit, order) {
  const changes = collectStepChanges(step, before, unit);
  if (Object.keys(changes).length > 0) {
    const event = {
      id: step.id,
      source: traceSourceForStep(step),
      phase: step.phase,
      order,
      traceOrder: trace.length,
      changes,
    };
    if (Number.isInteger(step.sourceOrder)) event.sourceOrder = step.sourceOrder;
    trace.push(event);
    return event;
  }
  return null;
}

// Complete execution ledger used by F20. It intentionally records no-op and predicate-skipped
// steps as well as writes, so a trace cannot appear complete merely because changed events were
// sorted or because an omitted step happened to be a no-op. The public `trace` remains sparse.
function recordStepExecution(trace, step, order, status) {
  if (typeof trace.record === 'function') {
    trace.record(step, order, status);
    return;
  }
  const event = {
    id: step.id,
    phase: step.phase,
    order,
    traceOrder: trace.length,
    executionOrder: trace.length,
    status,
  };
  if (Number.isInteger(step.sourceOrder)) event.sourceOrder = step.sourceOrder;
  trace.push(event);
}

// Keep the complete execution ledger compact during ordinary derivation. The public array is
// materialized only when a caller reads it, which avoids allocating one event object per visited
// step for matrix rows that only consume the calculated combat payload.
function createStatExecutionTraceLedger() {
  const records = [];
  return {
    record(step, order, status) {
      records.push([step, order, status]);
    },
    assert(steps) {
      if (!Array.isArray(steps)) {
        throw new Error('complete stat trace expected steps is not an array');
      }
      if (records.length !== steps.length) {
        throw new Error(`complete stat trace has ${records.length} events, expected ${steps.length}`);
      }
      let previousSource = null;
      for (let index = 0; index < records.length; index++) {
        const [step, order, status] = records[index];
        if (step !== steps[index] || order !== index) {
          throw new Error(`complete trace event ${step && step.id} does not match step ${steps[index] && steps[index].id}`);
        }
        if (!['applied', 'skipped'].includes(status)) {
          throw new Error(`complete trace event ${step.id} has no execution status`);
        }
        const sourceOrder = Number.isInteger(step.sourceOrder) ? step.sourceOrder : null;
        if (['b', 'c', 'd'].includes(step.phase) && sourceOrder === null) {
          throw new Error(`complete trace event ${step.id} has no source order`);
        }
        const phaseRank = STEP_PHASE_RANK[step.phase];
        if (previousSource && (phaseRank < previousSource.phaseRank
            || (phaseRank === previousSource.phaseRank
              && sourceOrder <= previousSource.sourceOrder))) {
          throw new Error(`trace event ${step.id} is out of source order after ${previousSource.id}`);
        }
        if (sourceOrder !== null) {
          previousSource = { id: step.id, phaseRank, sourceOrder };
        }
      }
    },
    materialize() {
      return records.map(([step, order, status], traceOrder) => ({
        id: step.id,
        phase: step.phase,
        order,
        traceOrder,
        executionOrder: traceOrder,
        status,
        ...(Number.isInteger(step.sourceOrder) ? { sourceOrder: step.sourceOrder } : {}),
      }));
    },
  };
}

// A complete trace is an append-only execution log.  It must never be reconstructed by sorting
// phase/order pairs: identity and permanent preparation events can be emitted by earlier
// sub-sequences, and their local step indexes are intentionally independent.  `traceOrder` is
// therefore the one total order exposed to projections and to the F20 regression.
function assertStatTraceOrder(trace, options = {}) {
  if (!Array.isArray(trace)) throw new Error('stat trace is not an array');
  const seen = new Set();
  let previousSource = null;
  const expectedSteps = options.steps || null;
  if (expectedSteps && !Array.isArray(expectedSteps)) {
    throw new Error('complete stat trace expected steps is not an array');
  }
  if (expectedSteps && !options.allowPrefix && trace.length !== expectedSteps.length) {
    throw new Error(`complete stat trace has ${trace.length} events, expected ${expectedSteps.length}`);
  }
  if (expectedSteps && options.allowPrefix && trace.length > expectedSteps.length) {
    throw new Error(`complete stat trace has ${trace.length} events, expected at most ${expectedSteps.length}`);
  }
  for (let index = 0; index < trace.length; index++) {
    const event = trace[index];
    if (!event || typeof event.id !== 'string' || !event.id) {
      throw new Error(`trace event ${index} has no id`);
    }
    if (seen.has(event.id)) throw new Error(`trace event id ${event.id} is repeated`);
    seen.add(event.id);
    if (event.traceOrder !== index) {
      throw new Error(`trace event ${event.id} has trace order ${event.traceOrder}, expected ${index}`);
    }
    if (!Object.prototype.hasOwnProperty.call(STEP_PHASE_RANK, event.phase)) {
      throw new Error(`trace event ${event.id} has unknown phase ${event.phase}`);
    }
    const complete = !!expectedSteps;
    if (!complete && (!event.changes || Object.keys(event.changes).length === 0)) {
      throw new Error(`trace event ${event.id} records no changes`);
    }
    if (complete) {
      const expected = expectedSteps[index];
      if (!expected || event.id !== expected.id || event.phase !== expected.phase
          || event.order !== index || event.executionOrder !== index) {
        throw new Error(`complete trace event ${event.id} does not match step ${expected && expected.id}`);
      }
      const expectedSourceOrder = Number.isInteger(expected.sourceOrder)
        ? expected.sourceOrder : null;
      const actualSourceOrder = Number.isInteger(event.sourceOrder) ? event.sourceOrder : null;
      if (['b', 'c', 'd'].includes(expected.phase) && expectedSourceOrder === null) {
        throw new Error(`complete trace event ${event.id} has no source order`);
      }
      if (expectedSourceOrder !== actualSourceOrder) {
        throw new Error(`complete trace event ${event.id} has the wrong source order`);
      }
      if (!['applied', 'skipped'].includes(event.status)) {
        throw new Error(`complete trace event ${event.id} has no execution status`);
      }
    }
    const phaseRank = STEP_PHASE_RANK[event.phase];
    if (Number.isInteger(event.sourceOrder)) {
      if (previousSource && (phaseRank < previousSource.phaseRank
          || (phaseRank === previousSource.phaseRank
            && event.sourceOrder <= previousSource.sourceOrder))) {
        throw new Error(`trace event ${event.id} is out of source order after ${previousSource.id}`);
      }
      previousSource = { id: event.id, phaseRank, sourceOrder: event.sourceOrder };
    }
  }
  return trace;
}

// Project the shared ordered event log onto one calculated output.  R7.3 deliberately
// keeps the event log atomic (one engine write can touch several fields), while this
// projection is what a stat's final-value output consumes.  The projection carries its
// editable base and displayed result separately so R7.4 can render those as the first and
// last lines without inventing either value from deltas.
//
// `stat:base` seeds the mutable record from zero. Permanent construction writes are expected
// to appear as their own preceding source events, making that seed a no-op relative to the
// projected running value and therefore invisible. Normalizing the seed's `from` to the running
// value keeps the chain continuous and makes a missed permanent-write attribution testable.
function projectStatTrace(trace, field, base, result, options = {}) {
  const entries = [];
  let running = base;
  const ignoredIds = new Set(options.ignoreIds || []);

  for (const event of trace || []) {
    if (ignoredIds.has(event.id) || !event.changes
        || !Object.prototype.hasOwnProperty.call(event.changes, field)) continue;
    const change = event.changes[field];
    const from = event.id === 'stat:base' ? running : change.from;
    const to = change.to;
    if (from === to) continue;
    entries.push({
      id: event.id,
      source: event.source || { id: event.id, label: event.id },
      phase: event.phase,
      order: event.order,
      ...(Number.isInteger(event.traceOrder) ? { traceOrder: event.traceOrder } : {}),
      from,
      to,
    });
    running = to;
  }

  return {
    field,
    ...(options.unit ? { unit: options.unit } : {}),
    base,
    entries,
    result,
  };
}

// Append a transform which is applied after the main derivation record (for example the
// displayed Vertigo defense penalty).  No-op transforms stay absent, exactly like
// `recordStepTrace` entries.
function appendProjectedTraceEntry(projected, step, from, to) {
  if (!projected || from === to) return projected;
  projected.entries.push({
    id: step.id,
    source: traceSourceForStep(step),
    phase: step.phase,
    order: step.order,
    from,
    to,
  });
  projected.result = to;
  return projected;
}
