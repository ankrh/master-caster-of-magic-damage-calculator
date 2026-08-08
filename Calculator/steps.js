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
// No DOM dependencies; loaded before combat.js and stats.js.

// Returned by a step's apply() to stop the sequence. `EffectiveDefense` step 2 needs it
// (Illusion against a defender without Illusion Immunity returns immediately, so no
// later bonus or immunity applies); nothing in the derivation phases does.
const HALT = Object.freeze({ halt: true });

// Sequence-position labels, in execution order. `base` plus the engine's five
// derivation regions, followed by the separate resolution axis:
//   base      permanent ABase writes made before combat
//   a         precalc, in the binary
//   b         precalc, in UnitCalcPre.CAS      (Warlord only)
//   c         magic calc, in the binary
//   d         magic calc, in UnitCalc.CAS      (Warlord only)
//   e         the binary's post-hook tail: the final clamps, the aura pass, Supreme Light
//
// `resolution` is not a sixth derivation phase. It tags steps in
// GetEffectiveResistance / EffectiveDefense, which run on a disposable copy after
// derivation and are keyed by an incoming attack.
//
// Every other phase is an engine region. The two scaffolding phases the migration ran on —
// `tail` (a post-total pass over finished stats) and `warpLate` (CoM 1's post-Warp tail) —
// were deleted at R1 stage 10, when each of their steps moved to the region the map gives it.
const STEP_PHASES = ['base', 'a', 'b', 'c', 'd', 'e', 'resolution'];
const STEP_PHASE_RANK = STEP_PHASES.reduce((rank, phase, i) => (rank[phase] = i, rank), {});

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
  if (!(step.phase in STEP_PHASE_RANK)) {
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

// Run a sequence over `unit`, mutating it in place and returning it.
//
// `ctx` carries everything a step may read besides the unit: `version`, the permanent
// base record as `ctx.base`, and — for the resolution sequences — the attack context.
// Two optional fields are for development only:
//   ctx.trace          an array; each step that changes a declared field appends an entry
//   ctx.validateWrites throw if a step writes a field it did not declare
function runStatSteps(steps, unit, ctx) {
  const context = ctx || {};
  const trace = context.trace;
  const validate = context.validateWrites || statStepDebug;
  if (validate) assertStatStepOrder(steps);
  for (let order = 0; order < steps.length; order++) {
    const step = steps[order];
    if (step.when && !step.when(unit, context)) continue;
    const before = (trace || validate) ? { ...unit } : null;
    const result = step.apply(unit, context);
    if (validate) assertStepWrites(step, before, unit);
    if (trace) recordStepTrace(trace, step, before, unit, order);
    if (result === HALT) break;
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

function recordStepTrace(trace, step, before, unit, order) {
  const changes = {};
  let changed = false;
  for (const field of step.writes) {
    if (before[field] === unit[field]) continue;
    changed = true;
    const from = before[field];
    const to = unit[field];
    changes[field] = (typeof from === 'number' && typeof to === 'number')
      ? { from, to, delta: to - from }
      : { from, to };
  }
  if (changed) trace.push({
    id: step.id,
    source: traceSourceForStep(step),
    phase: step.phase,
    order,
    changes,
  });
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
