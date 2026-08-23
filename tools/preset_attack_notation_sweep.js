'use strict';

// Preset attack-notation sweep — the census behind Calculator/BACKLOG.md, F125.
//
// A CoM2/Warlord fixture states its attack channels with `modernAttacks` and nothing else
// (Calculator/CLAUDE.md, *Presets*). This walks every preset,
// resolves the version it actually runs in the way `applyPreset` does — `preset.version` first,
// then the TEST_TREE group's `version` — and reports, per modern unit side, which notation it
// uses and which To Hit fields it sets.
//
// It reads the fixture data only. It never evaluates a preset: that is browser `runTests()`.
//
// Usage:
//   node tools/preset_attack_notation_sweep.js [--json] [--list <class>]
//
// Classes for --list: modernAttacks, dosPair, none, toHitRtbMod, toHitMod, unprojectable,
//                     bothNotations, typedAtZero, sharedSideObject

const { loadPresetContext } = require('./calculator_sources');
const { evalInContext } = require('./unit_checks/assertions');

// `const` declarations in the loaded sources are lexical, so they are reachable by evaluating
// the identifier inside the context rather than as properties of its global object.
const context = loadPresetContext();
const PRESETS = evalInContext(context, 'PRESETS');
const TEST_TREE = evalInContext(context, 'TEST_TREE');
const MODERN_RANGED_TYPES = evalInContext(context, 'MODERN_RANGED_TYPES');

// Same resolution order as applyPreset/ui.js: an explicit `version:` on the preset wins, and a
// preset without one inherits its TEST_TREE group's version.
const groupVersion = {};
const treeKeys = new Set();
for (const group of TEST_TREE) {
  for (const sub of group.subs || []) {
    for (const key of sub.keys || []) {
      treeKeys.add(key);
      if (group.version) groupVersion[key] = group.version;
    }
  }
}

function resolvedVersion(key) {
  const preset = PRESETS[key];
  return preset.version || groupVersion[key] || '';
}

// The seven `rtbType` values the retired DOS-pair projection accepted. `dosPair` is now a
// contract violation rather than a notation — `applyPreset` throws on one (F127) — so the class
// is kept only to report it, and the projectable/unprojectable split with it.
const PROJECTABLE = new Set([...MODERN_RANGED_TYPES, 'thrown', 'fire', 'lightning']);

const classes = {
  modernAttacks: [], dosPair: [], none: [], toHitRtbMod: [], toHitMod: [],
  unprojectable: [], bothNotations: [], typedAtZero: [], sharedSideObject: [],
};

const seenSideObjects = new Map();
let modernSides = 0;
let modernPresets = 0;

for (const key of Object.keys(PRESETS).sort()) {
  const version = resolvedVersion(key);
  if (!version.startsWith('com2')) continue;
  modernPresets++;
  const preset = PRESETS[key];
  for (const prefix of ['a', 'b']) {
    // A roster-selected side takes its channels from its record, not from the fixture.
    if (preset[prefix + 'UnitName']) continue;
    const side = preset[prefix];
    if (!side) continue;
    modernSides++;
    const where = `${key}.${prefix}`;

    if (seenSideObjects.has(side)) {
      classes.sharedSideObject.push(`${where} (also ${seenSideObjects.get(side)})`);
    } else {
      seenSideObjects.set(side, where);
    }

    const hasModern = !!side.modernAttacks;
    const strength = Math.max(0, parseInt(side.rtb, 10) || 0);
    const type = side.rtbType || 'none';
    const hasPair = strength > 0 || (type !== 'none' && type !== undefined);

    if (hasModern && hasPair) classes.bothNotations.push(where);
    if (hasModern) classes.modernAttacks.push(where);
    else if (hasPair) {
      classes.dosPair.push(where);
      if (strength <= 0) classes.typedAtZero.push(`${where} (${type})`);
      else if (!PROJECTABLE.has(type)) classes.unprojectable.push(`${where} (${type})`);
    } else classes.none.push(where);

    if (side.toHitRtbMod !== undefined && side.toHitRtbMod !== 0) classes.toHitRtbMod.push(where);
    if (side.toHitMod !== undefined && side.toHitMod !== 0) classes.toHitMod.push(where);
  }
}

const summary = {
  presetKeys: Object.keys(PRESETS).length,
  presetsInModernVersions: modernPresets,
  modernCustomSides: modernSides,
};
for (const [name, list] of Object.entries(classes)) summary[name] = list.length;

const args = process.argv.slice(2);
if (args.includes('--json')) {
  console.log(JSON.stringify({ summary, classes }, null, 2));
} else {
  const listIndex = args.indexOf('--list');
  if (listIndex >= 0) {
    const which = args[listIndex + 1];
    if (!classes[which]) {
      throw new Error(`--list: unknown class '${which}'. Known: ${Object.keys(classes).join(', ')}`);
    }
    for (const entry of classes[which]) console.log(entry);
  } else {
    for (const [name, value] of Object.entries(summary)) console.log(`${name}: ${value}`);
  }
}
