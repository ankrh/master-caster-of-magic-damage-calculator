// --- Unit Stat Derivation: the per-version execution chain ---
// No DOM dependencies. Read by deriveUnitStats (stats.js) and resolveIdentityConversions
// (stats_identity.js) through statChain().

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
// rank one of its entries carries (`d:identity:spiritLink`).
//
// Within a chain, the identity conversions head their phase: they run in the pre-pass, before any
// stat write, and no address map places them among the writes beside them.
// `identity:marionetteChanneler` is the exception the CAS gives a real position — the AFantastic
// write at UnitCalcPre.CAS:94, one line ahead of the `marionette:stats` attack writes — as is
// `identity:spiritLink` at UnitCalc.CAS:1306, between Shadow Strike and Psycho Force. Spirit Link
// is the one place where the calculator's execution position and its source rank disagree: it
// runs in the pre-pass, because live Fantastic gates the whole derivation, while the engine
// writes it late in region d.

// Which positions the evidence fixes, stated once rather than per chain. Regions `b`, `c` and `d`
// are transcribed — the compiled region-c address map, and the top-level order of UnitCalcPre.CAS
// and UnitCalc.CAS. `base`, `a` and `e` are inherited from the order the steps happen to be
// authored in and stay provisional until sourced.
const TRANSCRIBED_PHASES = new Set(['b', 'c', 'd']);

// Individual positions inside a transcribed region that the map does not actually give.
const DEDUCED_POSITIONS = Object.freeze({
  // CoM 1's Focus Magic position is inferred from the exhaustive list of what its recompute
  // writes after Warp, which does not contain it. Both halves share that one deduced position.
  'com_6.08': ['c:focusMagic'],
});

function versionChain(version, keys) {
  const deduced = new Set(DEDUCED_POSITIONS[version] || []);
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

const CHAIN_MOM_1_31 = versionChain('mom_1.31', [
  'base:stat:base', 'base:chance:baseMelee', 'base:chance:baseRtb', 'base:chance:baseBlock',
  'a:legacyConversions', 'a:holyBonus', 'a:resistanceToAll', 'a:chaosChannels:fireBreath',
  'c:level', 'c:lucky', 'c:weapon', 'c:chance:weapon', 'c:chaosSurge',
  'c:chance:holyWeapon:melee', 'c:chance:holyWeapon:rtb', 'c:blackChannels', 'c:ironSkin',
  'c:stoneSkin', 'c:flameBlade', 'c:flameBlade:ranged', 'c:giantStrength',
  'c:chaosChannels:armor', 'c:lionheart', 'c:holyArmor', 'c:berserk', 'c:nodeAura',
  'c:highPrayer', 'c:prayer', 'c:trueLight', 'c:darkness', 'c:metalFires', 'c:warpReality',
  'c:blackPrayer', 'c:vertigo', 'c:weakness', 'c:mindStorm', 'c:warpAttack', 'c:warpDefense',
  'c:warpResist', 'c:shatter', 'c:charmOfLife', 'e:chance:legacyClamp', 'e:clamp',
]);

const CHAIN_MOM_CP_1_60 = versionChain('mom_cp_1.60.00', [
  'base:stat:base', 'base:chance:baseMelee', 'base:chance:baseRtb', 'base:chance:baseBlock',
  'a:legacyConversions', 'a:holyBonus', 'a:resistanceToAll', 'a:chaosChannels:fireBreath',
  'c:level', 'c:lucky', 'c:weapon', 'c:chance:weapon', 'c:chaosSurge', 'c:blackChannels',
  'c:ironSkin', 'c:stoneSkin', 'c:flameBlade', 'c:flameBlade:ranged', 'c:giantStrength',
  'c:chaosChannels:armor', 'c:lionheart', 'c:holyArmor', 'c:berserk',
  'c:chance:holyWeapon:melee', 'c:chance:holyWeapon:rtb', 'c:nodeAura', 'c:highPrayer',
  'c:prayer', 'c:trueLight', 'c:darkness', 'c:metalFires', 'c:warpReality', 'c:blackPrayer',
  'c:vertigo', 'c:weakness', 'c:mindStorm', 'c:warpAttack', 'c:warpDefense', 'c:warpResist',
  'c:shatter', 'c:charmOfLife', 'e:chance:legacyClamp', 'e:clamp',
]);

const CHAIN_COM_6_08 = versionChain('com_6.08', [
  'base:zombies', 'base:constructCatapult', 'base:summonBranch', 'base:stat:base',
  'base:chance:baseMelee', 'base:chance:baseRtb', 'base:chance:baseBlock',
  'base:zombies:toBlock', 'a:legacyConversions', 'a:holyBonus', 'a:resistanceToAll',
  'a:chaosChannels:fireBreath', 'c:level', 'c:lucky', 'c:weapon', 'c:chance:weapon',
  'c:endurance', 'c:animated', 'c:flameBlade', 'c:flameBlade:ranged', 'c:lionheart',
  'c:ironSkin', 'c:chaosChannels:armor', 'c:landLinking', 'c:mysticSurge', 'c:holyArmor',
  'c:focusMagic', 'c:orihalcon', 'c:chance:holyWeapon:melee', 'c:chance:holyWeapon:rtb',
  'c:chaosSurge', 'c:survivalInstinct', 'c:nodeAura', 'c:highPrayer', 'c:prayer',
  'c:blazingMarch', 'c:warpReality', 'c:blackPrayer', 'c:guardian', 'c:guidingBeaconAura',
  'c:divineBarrierAura', 'c:soulLinkerAura', 'c:vertigo', 'c:weakness', 'c:mindStorm',
  'c:warpAttack', 'c:warpDefense', 'c:warpResist', 'c:shatter', 'c:darkness', 'c:supremeLight',
  'c:realmWard', 'c:tactician', 'c:eternalNight:enemyResistance', 'c:charmOfLife',
  'e:chance:legacyClamp', 'e:clamp',
]);

const CHAIN_COM2_1_05_11 = versionChain('com2_1.05.11', [
  'base:stat:base', 'base:chance:baseMelee', 'base:chance:baseRtb', 'base:chance:baseBlock',
  'a:combatSummoned', 'a:chosen', 'a:constructCatapult', 'a:callToArmsPaladins',
  'a:legacyConversions', 'a:chaosChannels:fireBreath', 'c:destiny', 'c:level', 'c:focusMagic',
  'c:lucky', 'c:darkForce', 'c:heavenlyLight', 'c:chance:heavenlyLight', 'c:weapon',
  'c:chance:weapon', 'c:endurance', 'c:discipline', 'c:chaosChannels:armor', 'c:animated',
  'c:flameBlade', 'c:flameBlade:ranged', 'c:mysticSurge', 'c:lionheart', 'c:ironSkin',
  'c:landLinking', 'c:holyArmor', 'c:orihalcon', 'c:chance:holyWeapon:melee',
  'c:chance:holyWeapon:rtb', 'c:chaosSurge', 'c:survivalInstinct', 'c:innerPower',
  'c:reinforceMagic', 'c:eternalNight:enemyResistance', 'c:charmOfLife', 'c:nodeAura',
  'c:badMoon', 'c:goodMoon', 'c:natureConjunction', 'c:highPrayer', 'c:prayer', 'c:blazingMarch',
  'c:breakthrough:normal', 'c:breakthrough:noncorporeal', 'c:breakthrough:combatSummoned',
  'c:warpReality', 'c:blackPrayer', 'c:darkness', 'c:guardian', 'c:vertigo', 'c:weakness',
  'c:mindStorm', 'c:warpAttack', 'c:warpDefense', 'c:warpResist', 'c:shatter', 'c:spellWard',
  'c:tactician', 'e:chance:modernClampCommon', 'e:clamp', 'e:holyBonus', 'e:guidingBeaconAura',
  'e:resistanceToAll', 'e:divineBarrierAura', 'e:soulLinkerAura', 'e:leadershipAura',
  'e:mislead', 'e:supremeLight',
]);

const CHAIN_COM2_WARLORD_1_5_12_7 = versionChain('com2_warlord_1.5.12.7', [
  'base:stat:base', 'base:chance:baseMelee', 'base:chance:baseRtb', 'base:chance:baseBlock',
  'base:armorclad', 'base:artificer', 'base:rebuild', 'base:malnourished', 'base:spiritLink',
  'base:altarOfTheMoon', 'base:militaryWorkshop', 'base:lightningBlade:breath',
  'base:poolOfRepentance', 'base:dragonMound', 'base:ludusAgoge', 'base:motherFungus',
  'base:altarOfTheSun:holyMother', 'base:altarOfTheSun:figures', 'base:alumniOfAcademy:figures',
  'base:sanctaBasilica', 'base:naturalSelection:powerMinerals',
  'base:naturalSelection:nightshade', 'base:naturalSelection:wildGame',
  'base:naturalSelection:coal', 'base:naturalSelection:iron', 'base:pillarOfFaith',
  'base:energyCannon', 'base:chance:survivalInstinctToBlock', 'a:combatSummoned', 'a:chosen',
  'a:constructCatapult', 'a:callToArmsPaladins', 'a:legacyConversions',
  'a:chaosChannels:fireBreath', 'b:marionetteChanneler', 'b:marionette:stats',
  'b:marionette:strayedTransmute', 'b:rebuild', 'b:tactician', 'b:fieryFury', 'b:natureLink',
  'b:outlanderXenoveterinary', 'b:magitekEngine', 'b:bombsGrenades',
  'b:upgradedExplosive:ranged', 'b:upgradedExplosive:fireBreath',
  'b:chance:outlanderBallisticsTraining', 'b:outlanderXenopsychology', 'b:outlanderRadio',
  'b:battleArmor', 'b:nausea', 'b:uphillBattle', 'b:soulFlay', 'b:eternalNight:poorVision',
  'b:greatUnbinding', 'b:prayer', 'b:rally', 'b:trueLight', 'b:plague', 'b:goblinPox',
  'b:luckyStar', 'b:disheartenProphecy', 'b:wallOfFire:garrison', 'b:godsPlayDices', 'c:destiny',
  'c:level', 'c:focusMagic', 'c:lucky', 'c:darkForce', 'c:heavenlyLight',
  'c:chance:heavenlyLight', 'c:weapon', 'c:chance:weapon', 'c:endurance', 'c:discipline',
  'c:chaosChannels:armor', 'c:animated', 'c:flameBlade', 'c:flameBlade:ranged', 'c:mysticSurge',
  'c:lionheart', 'c:ironSkin', 'c:landLinking', 'c:holyArmor', 'c:orihalcon',
  'c:chance:holyWeapon:melee', 'c:chance:holyWeapon:rtb', 'c:chaosSurge', 'c:survivalInstinct',
  'c:innerPower', 'c:reinforceMagic', 'c:eternalNight:enemyResistance', 'c:charmOfLife',
  'c:nodeAura', 'c:badMoon', 'c:goodMoon', 'c:natureConjunction', 'c:highPrayer', 'c:prayer',
  'c:blazingMarch', 'c:breakthrough:normal', 'c:breakthrough:noncorporeal',
  'c:breakthrough:combatSummoned', 'c:warpReality', 'c:blackPrayer', 'c:darkness', 'c:guardian',
  'c:vertigo', 'c:weakness', 'c:mindStorm', 'c:warpAttack', 'c:warpDefense', 'c:warpResist',
  'c:shatter', 'c:spellWard', 'c:tactician', 'd:mechanicalExpert', 'd:weakness',
  'd:chance:trueSight:ranged', 'd:flameBlade', 'd:berserkWarlord', 'd:rust', 'd:hurricane',
  'd:favoredTerrain', 'd:colossalStrength', 'd:vampirism:transfer', 'd:shadowStrike:thrown',
  'd:spiritLink', 'd:psychoForce', 'd:pneumaField', 'd:chance:energyCannonThreshold',
  'd:blazeOfGlory', 'd:beatOfSwiftness', 'd:hierophany', 'e:chance:modernClampCommon', 'e:clamp',
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
