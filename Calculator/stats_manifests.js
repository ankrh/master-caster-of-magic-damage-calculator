// --- Unit Stat Derivation: the per-version execution chain ---
// No DOM dependencies. Read by deriveUnitStats (stats.js) and by the targeting projection in
// stats_identity.js through statChain().
//
// Every bare address in this file is a position, and its home is one of three documents, named
// once here rather than beside each chain: `Reference docs/DOS reconstructed/unitcalc.c` and the
// evidence files its README routes to for the `0x8F…`/`0x90…` offsets, `Reference docs/Caster
// binary/CoM2 binary - unit recalculation.md` for the modern region maps, and the Warlord script
// source for the two CAS files' top-level order. What positions those sources fix, and what is
// inherited from authoring order instead, is `TRANSCRIBED_PHASES` and `DEDUCED_POSITIONS` below.

// One ordered chain per engine version, `base` through `e`, is the single mechanism that orders
// a derivation. There is no second one: array order no longer decides anything, and a step whose
// key is absent from its version's chain fails composition rather than landing wherever it was
// authored. The `attackSpecific` lists stay outside the chain — they are a separate compiled
// routine pair run on a scratch copy, not writes RecalculateUnits makes (see M10).
//
// Each version's chain is one full list, written out even where two versions currently agree.
// The duplication is deliberate: a chain is what one engine does, and reading it should not mean
// assembling it from shared fragments. CoM2 and Warlord share their whole region-c order today,
// and the two MoM builds differ only in where Holy Weapon sits — spelling both out keeps the
// question "what does this engine do, in order" answerable in one place.
//
// An entry key is `phase:id`, the same key STEP_VERSION_SCOPES uses, so position and scope are
// keyed alike and two engines writing one effect from different regions (`b:trueLight`,
// `c:trueLight`) stay distinct. The phase in it is a provenance label: it records which region or
// script file the write was found in and orders nothing, but a chain is authored in
// non-decreasing phase order, so an entry filed under the wrong region shows up as a chain that
// is out of order.
//
// One sequence walks the chain, and an identity conversion is one of its steps, so an identity
// write is accounted for exactly once and its rank is comparable with every other write's.
// Every conversion sits at its own block's address: `unitcalc.c` addresses every DOS realm write
// inside `BU_Apply_Specials`; `Units.RecalculateUnits.pas` addresses the modern ones; and the CAS
// hooks give `b:spiritLink` at UnitCalcPre.CAS:30, the first represented write of that file,
// `marionetteChanneler` at UnitCalcPre.CAS:94, one line ahead of the `marionette:stats` attack
// writes, `fieryFury:race` at UnitCalcPre.CAS:834, the THEN arm of the same `IF` whose ELSE arm is
// `b:fieryFury`, `sanctify` at UnitCalcPre.CAS:1249, and `d:spiritLink` at UnitCalc.CAS:1306,
// between Shadow Strike and Psycho Force. Spirit Link writes Fantastic twice, asserting it in b
// and clearing it in d, so the two entries bracket every conversion between them and every gate
// that reads the running record there takes a Fantastic unit.
//
// Five identity conversions carry a `:race` qualifier. Three are separately gated writes of one
// effect and would need the qualifier under any shape; two — `c:chaosChannels:armor:race` and
// `c:blackChannels:race` — sit chain-adjacent to the stat step of the same block and are split for
// a reason of the calculator's, recorded in `SPEC.md`, *Deliberate deviations*.

// Which positions the evidence fixes, stated once rather than per chain. Regions `b`, `c` and `d`
// are transcribed — the compiled region-`c` address map in `Reference docs/Caster binary/CoM2
// binary - unit recalculation.md`, and the top-level order of `UnitCalcPre.CAS` and
// `UnitCalc.CAS` under `Reference docs/Script source/Warlord 1.5.12.7/`. `base`, `a` and `e` are
// inherited from the order the steps happen to be authored in and stay provisional until sourced.
const TRANSCRIBED_PHASES = new Set(['b', 'c', 'd']);

// Individual positions inside a transcribed region that the map does not actually give.
// Only `c:raiseDead` is left, in every version that has it: it is a combat-spell write — from
// `combat.c` in the DOS builds and `Spells.InitializeCombatSpellcasting.pas` in the modern ones —
// not a block of this routine, so nothing orders it against the blocks around it.
//
// Every other identity conversion now sits at its own block's offset. The DOS builds always did:
// `BU_Apply_Specials` (`Reference docs/DOS reconstructed/unitcalc.c`) addresses each of their
// realm writes. The modern conversions used to head region `c` by convention, because the
// calculator ran them in a pre-pass whose only meaningful order was the conversions' order among
// themselves; with the pre-pass gone (F163) they are ordinary steps and take the addresses
// `Units.RecalculateUnits.pas` gives them — Chaos Channels flight $0059F330, its armor block
// $0059F4A3, Blood Lust $0059F5DC, Animated $0059F7D8, the aggregate Undead normalization
// $0059FBD0, and the No Heal conversion $005A0420 immediately after the Mystic Surge block whose
// flag reaches it. Destiny's identity write is not in region `c` at all: it writes the
// *permanent* record (`B.race`, `B.Fantastic` at $0059A390) and is `base:destiny`.
const DEDUCED_IDENTITY_C_POSITIONS = ['c:raiseDead'];
const DEDUCED_POSITIONS = Object.freeze({
  'mom_1.31': [],
  'mom_cp_1.60.00': [],
  // CoM 1's Focus Magic position is inferred from the exhaustive list of what its recompute
  // writes after Warp, which does not contain it. Both halves share that one deduced position.
  'com_6.08': ['c:focusMagic', 'c:raiseDead'],
  'com2_1.05.11': DEDUCED_IDENTITY_C_POSITIONS,
  'com2_warlord_1.5.12.7': DEDUCED_IDENTITY_C_POSITIONS,
});

// The `base` phase holds five kinds of write (`BASE_WRITE_KINDS`, `steps.js`), and a chain runs
// them in that order. Each chain states the kind beside the keys rather than in a second table, so
// there is nothing to keep in sync: `baseWrites` tags them, `versionChain` refuses an untagged
// `base:` key, and `assertStatChain` enforces the order and the one-shot rule.
function baseWrites(kind, ids) {
  if (!Object.prototype.hasOwnProperty.call(BASE_WRITE_KIND_RANK, kind)) {
    throw new Error(
      `baseWrites: unknown base write kind '${kind}' `
      + `(expected one of ${BASE_WRITE_KINDS.join(', ')}).`);
  }
  return ids.map(id => ({ key: `base:${id}`, baseKind: kind }));
}

function versionChain(version, entries) {
  // Every version names its own deduced-position list, including the two MoM builds whose
  // list is empty. A version with no entry would silently get an empty set and mark its whole
  // chain transcribed (`SPEC.md`, *Out-of-range values stop the run*).
  if (!Object.prototype.hasOwnProperty.call(DEDUCED_POSITIONS, version)) {
    throw new Error(
      `versionChain: '${version}' has no DEDUCED_POSITIONS entry `
      + `(expected one of ${Object.keys(DEDUCED_POSITIONS).join(', ')}).`);
  }
  const deduced = new Set(DEDUCED_POSITIONS[version]);
  return Object.freeze(entries.map(entry => {
    const tagged = typeof entry !== 'string';
    const key = tagged ? entry.key : entry;
    const cut = key.indexOf(':');
    const phase = key.slice(0, cut);
    if (tagged !== (phase === 'base')) {
      throw new Error(`versionChain: ${version} entry '${key}' must name its base write kind `
        + 'through baseWrites(), and only a base entry may');
    }
    return Object.freeze({
      key,
      phase,
      id: key.slice(cut + 1),
      provisional: !TRANSCRIBED_PHASES.has(phase) || deduced.has(key),
      ...(phase === 'base' ? { baseKind: entry.baseKind } : {}),
    });
  }));
}

// The identity conversions of the two MoM builds sit at the offsets `BU_Apply_Specials` gives
// them: Undead 0x8F3DC, Black Channels' realm write 0x8F4A1 at the end of its own block,
// demon-skin armor 0x8F6FE, demon wings 0x8F71B and fire breath 0x8F738. A unit holding both
// Black Channels and a Chaos Channels mutation therefore finishes Chaos, not Death.
const CHAIN_MOM_1_31 = versionChain('mom_1.31', [
  // Template initialization, then the artificial strip. F203: the strip used to stand ahead of
  // `base:stat:base`, i.e. before the record it reads was seeded.
  ...baseWrites('template', ['stat:base', 'baseThresholds']),
  ...baseWrites('artificial', ['immunityCurseGating']),
  'a:holyBonus', 'a:resistanceToAll',
  'c:level', 'c:lucky', 'c:weapon', 'c:chaosSurge',
  // `BU_Apply_Specials` opens with Water Walking 0x8F31D and True Sight 0x8F338; Chaos Surge
  // (0x8F113) and 1.31's inline Holy Weapon (0x8F1A8) are both ahead of the 0x8F2A2 call.
  'c:holyWeapon', 'c:trueSight',
  'c:undead', 'c:blackChannels', 'c:blackChannels:race', 'c:ironSkin',
  'c:stoneSkin', 'c:flameBlade', 'c:giantStrength',
  'c:chaosChannels:armor', 'c:chaosChannels:armor:race', 'c:chaosChannels:flight',
  'c:chaosChannels:fireBreath', 'c:chaosChannels:fireBreath:race',
  'c:lionheart', 'c:holyArmor', 'c:berserk', 'c:nodeAura',
  'c:highPrayer', 'c:prayer', 'c:trueLight', 'c:darkness', 'c:metalFires', 'c:warpReality',
  'c:blackPrayer', 'c:vertigo', 'c:weakness', 'c:mindStorm',
  // The recompute's second `BU_Apply_Specials` call, 131:0x90A1D, immediately before Warp
  // Creature at 0x90A2E. 1.31 alone passes the mutations byte there, so its fire-breath block
  // assigns the shared slot a second time, after the node aura, Black Prayer and Mind Storm.
  'c:chaosChannels:fireBreath:recompute',
  'c:warpAttack', 'c:warpDefense',
  'c:warpResist', 'c:shatter', 'c:charmOfLife', 'e:dosClamp', 'e:clamp',
]);

const CHAIN_MOM_CP_1_60 = versionChain('mom_cp_1.60.00', [
  ...baseWrites('template', ['stat:base', 'baseThresholds']),
  ...baseWrites('artificial', ['immunityCurseGating']),
  'a:holyBonus', 'a:resistanceToAll',
  'c:level', 'c:lucky', 'c:weapon', 'c:chaosSurge',
  // CP moved Holy Weapon into `BU_Apply_Specials`' relocated tail, so it lands late; True Sight
  // stays at the routine's head, 0x8F338.
  'c:trueSight',
  'c:undead', 'c:blackChannels', 'c:blackChannels:race',
  'c:ironSkin', 'c:stoneSkin', 'c:flameBlade', 'c:giantStrength',
  'c:chaosChannels:armor', 'c:chaosChannels:armor:race', 'c:chaosChannels:flight',
  'c:chaosChannels:fireBreath', 'c:chaosChannels:fireBreath:race',
  'c:lionheart', 'c:holyArmor', 'c:berserk',
  'c:holyWeapon', 'c:nodeAura', 'c:highPrayer',
  'c:prayer', 'c:trueLight', 'c:darkness', 'c:metalFires', 'c:warpReality', 'c:blackPrayer',
  'c:vertigo', 'c:weakness', 'c:mindStorm', 'c:warpAttack', 'c:warpDefense', 'c:warpResist',
  'c:shatter', 'c:charmOfLife', 'e:dosClamp', 'e:clamp',
]);

const CHAIN_COM_6_08 = versionChain('com_6.08', [
  // Template initialization and the construction patches that ride with it, then the artificial
  // strip (F203). `base:zombies` is gone: the Fantastic bit is the unit-type table's own
  // `UA_FANTASTIC` at file com1:0x2AED2, which the roster already states.
  ...baseWrites('template', ['stat:base', 'baseThresholds', 'zombies:toBlock',
    'constructCatapult', 'summonBranch']),
  ...baseWrites('artificial', ['immunityCurseGating']),
  'a:holyBonus', 'a:resistanceToAll',
  'c:level', 'c:lucky', 'c:weapon',
  // CoM 1 calls `BU_Apply_Specials` at 0x8F0E8, before Chaos Surge, and True Sight is its third
  // block (com1:0x8F335) — ahead of everything below.
  'c:trueSight',
  // CoM 1 reorders `BU_Apply_Specials` around its own repurposed enchantment slots: Endurance
  // 0x8F439, demon wings 0x8F46F, fire breath 0x8F48C, Blood Lust 0x8F49A, Undead 0x8F4BC and
  // the Animated block 0x8F4D0, whose own realm write at 0x8F50B is the second half of
  // `c:undead`. Demon-skin armor lands far later, at 0x8F757 — after Undead, not before it.
  'c:endurance', 'c:chaosChannels:flight', 'c:chaosChannels:fireBreath',
  'c:chaosChannels:fireBreath:race', 'c:bloodLust', 'c:undead',
  'c:animated', 'c:flameBlade', 'c:lionheart',
  'c:ironSkin', 'c:chaosChannels:armor', 'c:chaosChannels:armor:race', 'c:landLinking',
  'c:mysticSurge', 'c:mysticSurge:race', 'c:raiseDead', 'c:holyArmor',
  'c:focusMagic', 'c:orihalcon', 'c:holyWeapon',
  'c:chaosSurge', 'c:survivalInstinct', 'c:nodeAura', 'c:highPrayer', 'c:prayer',
  'c:blazingMarch', 'c:warpReality', 'c:blackPrayer', 'c:guardian', 'c:guidingBeaconAura',
  // The relocated tail returns to 0x905BB, so Heavenly Light lands after the three aura writes
  // and before R6.1d resumes at 0x9064B.
  'c:divineBarrierAura', 'c:soulLinkerAura', 'c:heavenlyLight',
  'c:vertigo', 'c:weakness', 'c:mindStorm',
  'c:warpAttack', 'c:warpDefense', 'c:warpResist', 'c:shatter', 'c:darkness', 'c:supremeLight',
  'c:realmWard', 'c:tactician', 'c:eternalNight:enemyResistance', 'c:charmOfLife',
  'e:dosClamp', 'e:clamp',
]);

const CHAIN_COM2_1_05_11 = versionChain('com2_1.05.11', [
  // F203 ordering: template initialization, then the permanent writes, then the artificial strip.
  // `base:destiny` is the per-pass permanent write — idempotent, which is what lets it hold this
  // head position as well as `c:destiny`. `base:destiny:supernatural` is the same block's third
  // permanent write, chain-adjacent because the conversion keeps writing `race`/`fantastic` alone.
  ...baseWrites('template', ['stat:base', 'baseHitChance', 'baseThresholds']),
  ...baseWrites('perPass', ['destiny', 'destiny:supernatural']),
  ...baseWrites('artificial', ['immunityCurseGating']),
  'a:combatSummoned', 'a:chosen', 'a:constructCatapult', 'a:callToArmsPaladins',
  'a:chaosChannels:fireBreath:race', 'a:chaosChannels:fireBreath',
  'c:destiny', 'c:level', 'c:focusMagic',
  'c:lucky', 'c:darkForce', 'c:heavenlyLight', 'c:weapon',
  // $0059E810, between `ApplyMagicWeapons` ($0059E4AD) and Endurance ($0059EC03).
  'c:trueSight',
  'c:endurance', 'c:discipline', 'c:chaosChannels:flight',
  'c:chaosChannels:armor', 'c:chaosChannels:armor:race',
  'c:bloodLust', 'c:animated', 'c:undead',
  'c:flameBlade', 'c:mysticSurge', 'c:mysticSurge:race', 'c:raiseDead', 'c:lionheart',
  'c:ironSkin',
  'c:landLinking', 'c:holyArmor', 'c:orihalcon', 'c:holyWeapon', 'c:chaosSurge',
  'c:survivalInstinct', 'c:innerPower', 'c:blazingEyes', 'c:reinforceMagic',
  'c:eternalNight:enemyResistance', 'c:charmOfLife', 'c:nodeAura',
  'c:badMoon', 'c:goodMoon', 'c:natureConjunction', 'c:highPrayer', 'c:prayer', 'c:blazingMarch',
  'c:breakthrough:normal', 'c:breakthrough:noncorporeal', 'c:breakthrough:combatSummoned',
  'c:warpReality', 'c:blackPrayer', 'c:darkness', 'c:guardian', 'c:vertigo', 'c:weakness',
  'c:mindStorm', 'c:warpAttack', 'c:warpDefense', 'c:warpResist', 'c:shatter', 'c:spellWard',
  'c:tactician', 'e:modernClampCommon', 'e:clamp', 'e:holyBonus', 'e:guidingBeaconAura',
  'e:resistanceToAll', 'e:divineBarrierAura', 'e:soulLinkerAura', 'e:leadershipAura',
  'e:mislead', 'e:supremeLight',
]);

const CHAIN_COM2_WARLORD_1_5_12_7 = versionChain('com2_warlord_1.5.12.7', [
  // F203 ordering, enforced by the kinds rather than described by this comment.
  ...baseWrites('template', ['stat:base', 'baseHitChance', 'baseThresholds']),
  // Training-time writes: every one cites `CreateUnit.CAS` and fires once, when the city built
  // the unit. `armorclad` and `alumniOfAcademy:figures` are reached by a second route as well —
  // the `OverlandEndTurn.CAS` upgrade protocol, whose site each script guards on the marker the
  // other route sets (`EncArmorClad` at :425, `SMultiLabel` at :577). One write, two entrances,
  // so one position: the training-time one the unit takes when it is built (F203).
  ...baseWrites('training', ['artificer', 'malnourished', 'armorclad',
    'altarOfTheMoon', 'militaryWorkshop', 'lightningBlade:breath',
    'poolOfRepentance', 'dragonMound', 'ludusAgoge', 'motherFungus',
    'altarOfTheSun:holyMother', 'altarOfTheSun:figures', 'alumniOfAcademy:figures',
    'sanctaBasilica', 'naturalSelection:powerMinerals',
    'naturalSelection:nightshade', 'naturalSelection:wildGame',
    'naturalSelection:coal', 'naturalSelection:iron', 'pillarOfFaith',
    'energyCannon', 'survivalInstinctToBlock']),
  // Cast-time permanent writes: one-shot, applied when the spell landed. Spirit Link's +2
  // Resistance has two entrances too — `OLSpell.CAS:185` and the Mystic Surge random grant at
  // `SpellMysticSurge.CAS:57` — and one position for the same reason.
  ...baseWrites('cast', ['rebuild', 'spiritLink']),
  // The per-pass permanent writes, idempotent, and then the artificial strip.
  ...baseWrites('perPass', ['destiny', 'destiny:supernatural']),
  ...baseWrites('artificial', ['immunityCurseGating']),
  'a:combatSummoned', 'a:chosen',
  'a:constructCatapult', 'a:callToArmsPaladins', 'a:chaosChannels:fireBreath:race',
  'a:chaosChannels:fireBreath', 'b:spiritLink', 'b:marionetteChanneler', 'b:marionette:stats',
  'b:marionette:rangedType', 'b:marionette:ascensionRangedType',
  'b:marionette:strayedTransmute', 'b:rebuild', 'b:tactician', 'b:fieryFury:race',
  'b:fieryFury', 'b:divineProtection', 'b:natureLink',
  'b:outlanderXenoveterinary', 'b:magitekEngine', 'b:bombsGrenades',
  'b:upgradedExplosive:ranged', 'b:upgradedExplosive:fireBreath',
  'b:outlanderBallisticsTraining', 'b:outlanderXenopsychology', 'b:outlanderRadio',
  'b:battleArmor', 'b:nausea', 'b:uphillBattle', 'b:soulFlay', 'b:sanctify',
  'b:eternalNight:poorVision',
  'b:greatUnbinding', 'b:prayer', 'b:rally', 'b:trueLight', 'b:plague', 'b:goblinPox',
  'b:luckyStar', 'b:disheartenProphecy', 'b:wallOfFire:garrison', 'b:godsPlayDices',
  // `UnitCalcPre.CAS:1839-1842`, the last block of region `b`, immediately before the combat
  // `HALT` — the grant the CoM2 region map records as crossing the hook boundary deliberately.
  'b:eyeOfHeaven',
  'c:destiny',
  'c:level', 'c:focusMagic', 'c:lucky', 'c:darkForce', 'c:heavenlyLight',
  'c:weapon',
  // $0059E810, between `ApplyMagicWeapons` ($0059E4AD) and Endurance ($0059EC03).
  'c:trueSight',
  'c:endurance', 'c:discipline', 'c:chaosChannels:flight',
  'c:chaosChannels:armor', 'c:chaosChannels:armor:race', 'c:animated', 'c:undead',
  'c:flameBlade', 'c:mysticSurge', 'c:mysticSurge:race', 'c:raiseDead',
  'c:lionheart', 'c:ironSkin', 'c:landLinking', 'c:holyArmor', 'c:orihalcon',
  'c:holyWeapon', 'c:chaosSurge', 'c:survivalInstinct',
  'c:innerPower', 'c:blazingEyes', 'c:reinforceMagic',
  'c:eternalNight:enemyResistance', 'c:charmOfLife',
  'c:nodeAura', 'c:badMoon', 'c:goodMoon', 'c:natureConjunction', 'c:highPrayer', 'c:prayer',
  'c:blazingMarch', 'c:breakthrough:normal', 'c:breakthrough:noncorporeal',
  'c:breakthrough:combatSummoned', 'c:warpReality', 'c:blackPrayer', 'c:darkness', 'c:guardian',
  'c:vertigo', 'c:weakness', 'c:mindStorm', 'c:warpAttack', 'c:warpDefense', 'c:warpResist',
  'c:shatter', 'c:spellWard', 'c:tactician',
  // `UnitCalc.CAS:60-70`, ahead of every other represented write of that file.
  'd:venom',
  'd:mechanicalExpert', 'd:weakness',
  'd:trueSight', 'd:flameBlade', 'd:berserkWarlord', 'd:rust', 'd:hurricane',
  'd:favoredTerrain', 'd:fortification', 'd:colossalStrength', 'd:vampirism:transfer',
  'd:shadowStrike:thrown',
  'd:spiritLink', 'd:psychoForce', 'd:pneumaField', 'd:energyCannonThreshold',
  'd:blazeOfGlory', 'd:beatOfSwiftness', 'd:hierophany', 'e:modernClampCommon', 'e:clamp',
  'e:holyBonus', 'e:guidingBeaconAura', 'e:resistanceToAll', 'e:divineBarrierAura',
  'e:soulLinkerAura', 'e:leadershipAura', 'e:mislead', 'e:supremeLight',
]);

const STAT_CHAINS = Object.freeze({
  'mom_1.31': CHAIN_MOM_1_31,
  'mom_cp_1.60.00': CHAIN_MOM_CP_1_60,
  'com_6.08': CHAIN_COM_6_08,
  'com2_1.05.11': CHAIN_COM2_1_05_11,
  'com2_warlord_1.5.12.7': CHAIN_COM2_WARLORD_1_5_12_7,
});

// The chain of one version, in execution order. Built once at load, so a derivation looks its
// chain up rather than reassembling it. An unknown version is a caller bug, not a version with an
// empty engine, so it throws instead of falling back to some other build's order.
function statChain(version) {
  const chain = STAT_CHAINS[version];
  if (!chain) throw new Error(`no execution chain for version ${version}`);
  return chain;
}
