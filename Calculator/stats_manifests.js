// --- Unit Stat Derivation: the per-version execution chain ---
// No DOM dependencies. Read by deriveUnitStats (stats.js) and applyOrderedIdentityConversions
// (stats_identity.js) through statChain().
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
// Both derivation sequences walk the same chain — the stat sequence and the ordered identity
// conversions — so an identity write is accounted for exactly once too, and cannot reach the
// trace from a sequence no chain covers. Their ranks are comparable only within one sequence:
// the identity pre-pass runs entirely before the stat sequence, which is earlier than the chain
// rank one of its entries carries (`d:spiritLink`).
//
// An identity conversion runs in the pre-pass, before any stat write, so its rank relative to the
// stat writes beside it decides nothing — only its rank against the other conversions does. In the
// modern chains that leaves the region-`c` conversions heading their region by convention, and
// each is listed as a deduced position below. The DOS chains and the CAS hooks are transcribed
// instead, because both give real positions: `unitcalc.c` addresses every DOS realm write inside
// `BU_Apply_Specials`, so each of those entries sits at its own block's offset; and
// `marionetteChanneler` at UnitCalcPre.CAS:94, one line ahead of the
// `marionette:stats` attack writes; `fieryFury:race` at UnitCalcPre.CAS:834, the THEN arm of the
// same `IF` whose ELSE arm is `b:fieryFury`; `sanctify` at UnitCalcPre.CAS:1249; and
// `spiritLink` at UnitCalc.CAS:1306, between Shadow Strike and Psycho Force. Spirit Link is the
// one place where the calculator's execution position and its source rank disagree: it runs in
// the pre-pass, because live Fantastic gates the whole derivation, while the engine writes it
// late in region d.
//
// One engine block can reach both sequences — Mystic Surge writes Defense, Resistance and the
// realm in one region-`c` block — so six identity conversions carry a `:race` qualifier to keep
// `phase:id` unique across the two (`c:mysticSurge` and `c:mysticSurge:race`).

// Which positions the evidence fixes, stated once rather than per chain. Regions `b`, `c` and `d`
// are transcribed — the compiled region-`c` address map in `Reference docs/Caster binary/CoM2
// binary - unit recalculation.md`, and the top-level order of `UnitCalcPre.CAS` and
// `UnitCalc.CAS` under `Reference docs/Script source/Warlord 1.5.12.7/`. `base`, `a` and `e` are
// inherited from the order the steps happen to be authored in and stay provisional until sourced.
const TRANSCRIBED_PHASES = new Set(['b', 'c', 'd']);

// Individual positions inside a transcribed region that the map does not actually give.
// The modern region-`c` identity conversions are all here: `Units.RecalculateUnits.pas` puts
// their blocks in the order the chains carry, but the conversions head the region by the
// convention above rather than sitting at those blocks' offsets.
//
// The DOS builds no longer share that list. `BU_Apply_Specials` (`Reference docs/DOS
// reconstructed/unitcalc.c`) gives every one of their realm writes an address, so each sits at
// the offset of its own block and is transcribed, not deduced. Only `c:raiseDead` stays
// inherited there: it is a combat-spell write from `combat.c`, not a block of this routine, and
// nothing orders it against them.
const DEDUCED_IDENTITY_C_POSITIONS = [
  'c:destiny:race', 'c:chaosChannels:flight', 'c:chaosChannels:armor:race', 'c:bloodLust',
  'c:blackChannels:race', 'c:undead', 'c:mysticSurge:race', 'c:raiseDead',
];
const DEDUCED_POSITIONS = Object.freeze({
  'mom_1.31': [],
  'mom_cp_1.60.00': [],
  // CoM 1's Focus Magic position is inferred from the exhaustive list of what its recompute
  // writes after Warp, which does not contain it. Both halves share that one deduced position.
  'com_6.08': ['c:focusMagic', 'c:raiseDead'],
  'com2_1.05.11': DEDUCED_IDENTITY_C_POSITIONS,
  'com2_warlord_1.5.12.7': DEDUCED_IDENTITY_C_POSITIONS,
});

function versionChain(version, keys) {
  // Every version names its own deduced-position list, including the two MoM builds whose
  // list is empty. A version with no entry would silently get an empty set and mark its whole
  // chain transcribed (`SPEC.md`, *Out-of-range values stop the run*).
  if (!Object.prototype.hasOwnProperty.call(DEDUCED_POSITIONS, version)) {
    throw new Error(
      `versionChain: '${version}' has no DEDUCED_POSITIONS entry `
      + `(expected one of ${Object.keys(DEDUCED_POSITIONS).join(', ')}).`);
  }
  const deduced = new Set(DEDUCED_POSITIONS[version]);
  return Object.freeze(keys.map(key => {
    const cut = key.indexOf(':');
    const phase = key.slice(0, cut);
    return Object.freeze({
      key,
      phase,
      id: key.slice(cut + 1),
      provisional: !TRANSCRIBED_PHASES.has(phase) || deduced.has(key),
    });
  }));
}

// The identity conversions of the two MoM builds sit at the offsets `BU_Apply_Specials` gives
// them: Undead 0x8F3DC, Black Channels' realm write 0x8F4A1 at the end of its own block,
// demon-skin armor 0x8F6FE, demon wings 0x8F71B and fire breath 0x8F738. A unit holding both
// Black Channels and a Chaos Channels mutation therefore finishes Chaos, not Death.
const CHAIN_MOM_1_31 = versionChain('mom_1.31', [
  'base:immunityCurseGating', 'base:stat:base', 'base:baseThresholds',
  'a:holyBonus', 'a:resistanceToAll',
  'c:level', 'c:lucky', 'c:weapon', 'c:chaosSurge',
  'c:holyWeapon', 'c:undead', 'c:blackChannels', 'c:blackChannels:race', 'c:ironSkin',
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
  'base:immunityCurseGating', 'base:stat:base', 'base:baseThresholds',
  'a:holyBonus', 'a:resistanceToAll',
  'c:level', 'c:lucky', 'c:weapon', 'c:chaosSurge',
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
  'base:immunityCurseGating', 'base:zombies', 'base:constructCatapult', 'base:summonBranch',
  'base:stat:base',
  'base:baseThresholds', 'base:zombies:toBlock', 'a:holyBonus', 'a:resistanceToAll',
  'c:level', 'c:lucky', 'c:weapon',
  // CoM 1 reorders `BU_Apply_Specials` around its own repurposed enchantment slots: Endurance
  // 0x8F439, demon wings 0x8F46F, fire breath 0x8F48C, Blood Lust 0x8F49A, Undead 0x8F4BC and
  // the Animated block 0x8F4D0, whose own realm write at 0x8F50B is the second half of
  // `c:undead`. Demon-skin armor lands far later, at 0x8F757 — after Undead, not before it.
  'c:endurance', 'c:chaosChannels:flight', 'c:chaosChannels:fireBreath',
  'c:chaosChannels:fireBreath:race', 'c:bloodLust', 'c:undead',
  'c:animated', 'c:flameBlade', 'c:lionheart',
  'c:ironSkin', 'c:chaosChannels:armor', 'c:chaosChannels:armor:race', 'c:landLinking',
  'c:mysticSurge:race', 'c:mysticSurge', 'c:raiseDead', 'c:holyArmor',
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
  'base:immunityCurseGating', 'base:stat:base', 'base:baseHitChance', 'base:baseThresholds',
  'a:combatSummoned', 'a:chosen', 'a:constructCatapult', 'a:callToArmsPaladins',
  'a:chaosChannels:fireBreath:race', 'a:chaosChannels:fireBreath', 'c:destiny:race',
  'c:chaosChannels:flight', 'c:chaosChannels:armor:race', 'c:bloodLust', 'c:undead',
  'c:mysticSurge:race', 'c:raiseDead',
  'c:destiny', 'c:level', 'c:focusMagic',
  'c:lucky', 'c:darkForce', 'c:heavenlyLight', 'c:weapon',
  'c:endurance', 'c:discipline', 'c:chaosChannels:armor', 'c:animated',
  'c:flameBlade', 'c:mysticSurge', 'c:lionheart', 'c:ironSkin',
  'c:landLinking', 'c:holyArmor', 'c:orihalcon', 'c:holyWeapon', 'c:chaosSurge',
  'c:survivalInstinct', 'c:innerPower', 'c:reinforceMagic',
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
  'base:immunityCurseGating', 'base:stat:base', 'base:baseHitChance', 'base:baseThresholds',
  'base:armorclad', 'base:artificer', 'base:rebuild', 'base:malnourished', 'base:spiritLink',
  'base:altarOfTheMoon', 'base:militaryWorkshop', 'base:lightningBlade:breath',
  'base:poolOfRepentance', 'base:dragonMound', 'base:ludusAgoge', 'base:motherFungus',
  'base:altarOfTheSun:holyMother', 'base:altarOfTheSun:figures', 'base:alumniOfAcademy:figures',
  'base:sanctaBasilica', 'base:naturalSelection:powerMinerals',
  'base:naturalSelection:nightshade', 'base:naturalSelection:wildGame',
  'base:naturalSelection:coal', 'base:naturalSelection:iron', 'base:pillarOfFaith',
  'base:energyCannon', 'base:survivalInstinctToBlock', 'a:combatSummoned', 'a:chosen',
  'a:constructCatapult', 'a:callToArmsPaladins', 'a:chaosChannels:fireBreath:race',
  'a:chaosChannels:fireBreath', 'b:marionetteChanneler', 'b:marionette:stats',
  'b:marionette:rangedType', 'b:marionette:ascensionRangedType',
  'b:marionette:strayedTransmute', 'b:rebuild', 'b:tactician', 'b:fieryFury:race',
  'b:fieryFury', 'b:natureLink',
  'b:outlanderXenoveterinary', 'b:magitekEngine', 'b:bombsGrenades',
  'b:upgradedExplosive:ranged', 'b:upgradedExplosive:fireBreath',
  'b:outlanderBallisticsTraining', 'b:outlanderXenopsychology', 'b:outlanderRadio',
  'b:battleArmor', 'b:nausea', 'b:uphillBattle', 'b:soulFlay', 'b:sanctify',
  'b:eternalNight:poorVision',
  'b:greatUnbinding', 'b:prayer', 'b:rally', 'b:trueLight', 'b:plague', 'b:goblinPox',
  'b:luckyStar', 'b:disheartenProphecy', 'b:wallOfFire:garrison', 'b:godsPlayDices',
  'c:destiny:race', 'c:chaosChannels:flight', 'c:chaosChannels:armor:race', 'c:undead',
  'c:mysticSurge:race', 'c:raiseDead', 'c:destiny',
  'c:level', 'c:focusMagic', 'c:lucky', 'c:darkForce', 'c:heavenlyLight',
  'c:weapon', 'c:endurance', 'c:discipline',
  'c:chaosChannels:armor', 'c:animated', 'c:flameBlade', 'c:mysticSurge',
  'c:lionheart', 'c:ironSkin', 'c:landLinking', 'c:holyArmor', 'c:orihalcon',
  'c:holyWeapon', 'c:chaosSurge', 'c:survivalInstinct',
  'c:innerPower', 'c:reinforceMagic', 'c:eternalNight:enemyResistance', 'c:charmOfLife',
  'c:nodeAura', 'c:badMoon', 'c:goodMoon', 'c:natureConjunction', 'c:highPrayer', 'c:prayer',
  'c:blazingMarch', 'c:breakthrough:normal', 'c:breakthrough:noncorporeal',
  'c:breakthrough:combatSummoned', 'c:warpReality', 'c:blackPrayer', 'c:darkness', 'c:guardian',
  'c:vertigo', 'c:weakness', 'c:mindStorm', 'c:warpAttack', 'c:warpDefense', 'c:warpResist',
  'c:shatter', 'c:spellWard', 'c:tactician', 'd:mechanicalExpert', 'd:weakness',
  'd:trueSight', 'd:flameBlade', 'd:berserkWarlord', 'd:rust', 'd:hurricane',
  'd:favoredTerrain', 'd:colossalStrength', 'd:vampirism:transfer', 'd:shadowStrike:thrown',
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
