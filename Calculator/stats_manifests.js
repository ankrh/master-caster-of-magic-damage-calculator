// --- Unit Stat Derivation: F20 source-order manifests ---
// No DOM dependencies. Read by deriveUnitStats (stats.js) through f20SourceManifests().

// F20 source-order manifests.  The b/d lists are the represented Warlord CAS writes in the
// exact top-level order of UnitCalcPre.CAS and UnitCalc.CAS.  The c list follows the compiled
// address map; DOS has a separate material/Flame Blade/Focus splice, so it is selected below.
// Entries that are version-exclusive may be absent from a particular derived list, but every
// actual b/c/d step must be present in the selected manifest or construction fails.
//
// The ordered identity conversions are composed through these same lists, so an identity write
// that lands in b or d is accounted for exactly once too. `identity:marionetteChanneler` is the
// AFantastic write at UnitCalcPre.CAS:94, one line ahead of the `marionette:stats` attack
// writes; `identity:spiritLink` is UnitCalc.CAS:1306, between Shadow Strike and Psycho Force.
// Spirit Link is the one place where the calculator's execution position and its source rank
// disagree: it runs in the identity pre-pass, because live Fantastic gates the whole
// derivation, while the engine writes it late in region d.
const F20_WARLORD_B_ORDER = Object.freeze([
  'identity:marionetteChanneler',
  'marionette:stats', 'marionette:strayedTransmute', 'rebuild',
  'tactician:warlordClawback', 'fieryFury', 'natureLink',
  'outlanderXenoveterinary', 'magitekEngine', 'bombsGrenades',
  'upgradedExplosive:ranged', 'upgradedExplosive:fireBreath',
  'chance:outlanderBallisticsTraining', 'outlanderXenopsychology', 'outlanderRadio',
  'battleArmor', 'chance:nausea', 'uphillBattle', 'soulFlay', 'eternalNight:poorVision',
  'greatUnbinding', 'prayer:warlordStack', 'rally', 'trueLight', 'plague', 'goblinPox',
  'luckyStar', 'disheartenProphecy', 'wallOfFire:garrison',
  'godsPlayDices',
]);

const F20_WARLORD_D_ORDER = Object.freeze([
  'mechanicalExpert', 'weakness:breath', 'chance:trueSight:ranged',
  'flameBlade:fireBreath', 'chance:berserkWarlord', 'rust', 'chance:hurricane',
  'favoredTerrain', 'colossalStrength', 'vampirism:transfer', 'shadowStrike:thrown',
  'identity:spiritLink',
  'psychoForce', 'pneumaField', 'chance:energyCannonThreshold', 'blazeOfGlory',
  'beatOfSwiftness', 'hierophany',
]);

// The region-C map is an execution-order authority, not a list to sort after assembly. These
// arrays include version-exclusive step definitions that remain in the shared sequence with
// false predicates, so the complete execution ledger can prove that those visits were skipped.
const F20_C_MODERN_ORDER = Object.freeze([
  'destiny', 'level', 'focusMagic', 'focusMagic:conversion', 'lucky', 'darkForce',
  'heavenlyLight', 'chance:heavenlyLight:melee', 'chance:heavenlyLight:rtb', 'weapon',
  'chance:weapon:melee', 'chance:weapon:rtb',
  'endurance', 'discipline', 'chaosChannels:armor', 'animated', 'flameBlade',
  'flameBlade:ranged', 'mysticSurge', 'lionheart', 'lionheart:rangedHp', 'ironSkin',
  'stoneSkin', 'landLinking', 'landLinking:breath', 'holyArmor', 'orihalcon',
  'chance:holyWeapon:melee', 'chance:holyWeapon:rtb', 'giantStrength',
  'giantStrength:thrown', 'metalFires', 'blackChannels',
  'chaosSurge', 'survivalInstinct', 'innerPower', 'reinforceMagic', 'reinforceMagic:ranged',
  'eternalNight:enemyResistance', 'charmOfLife', 'nodeAura',
  'badMoon', 'goodMoon', 'natureConjunction',
  'highPrayer', 'prayer', 'blazingMarch', 'blazingMarch:ranged',
  'breakthrough:normal', 'breakthrough:noncorporeal', 'breakthrough:combatSummoned',
  'chance:warpReality', 'blackPrayer', 'darkness', 'guardian', 'chance:vertigo',
  'weakness', 'weakness:ranged', 'mindStorm', 'warpAttack', 'warpDefense', 'warpResist',
  'shatter', 'spellWard', 'tactician', 'berserk',
  'guidingBeaconAura:coM1', 'divineBarrierAura:coM1', 'soulLinkerAura:coM1',
  'darkness:coM1', 'supremeLight:coM1', 'realmWard', 'tactician:coM1',
  'eternalNight:enemyResistance:coM1',
]);

// CoM 1 relaid out BU_Apply_Specials, so its intra-routine order is not CoM2's. The
// stat-writing half of Mystic Surge is com1:0x8F795, after Lionheart (0x8F660), Iron Skin
// (0x8F71F), the Chaos Channels armor mutation (0x8F735) and Land Link (0x8F75C) — the
// earlier com1:0x8F5FF half writes only attack attributes. Holy Weapon then runs at the end
// of the routine through its relocated tail, and Chaos Surge follows the call site.
const F20_C_COM1_ORDER = Object.freeze([
  'destiny', 'level', 'lucky',
  'weapon', 'chance:weapon:melee', 'chance:weapon:rtb',
  'endurance', 'discipline', 'animated', 'blackChannels', 'flameBlade', 'flameBlade:ranged',
  'lionheart', 'lionheart:rangedHp', 'ironSkin', 'stoneSkin',
  'chaosChannels:armor', 'landLinking', 'landLinking:breath', 'mysticSurge', 'holyArmor',
  'focusMagic', 'focusMagic:conversion', 'giantStrength', 'giantStrength:thrown',
  'orihalcon', 'chance:holyWeapon:melee', 'chance:holyWeapon:rtb', 'chaosSurge',
  'survivalInstinct', 'nodeAura', 'highPrayer', 'prayer', 'badMoon', 'goodMoon',
  'natureConjunction', 'metalFires', 'blazingMarch', 'blazingMarch:ranged',
  'chance:warpReality', 'blackPrayer', 'guardian',
  'guidingBeaconAura:coM1', 'divineBarrierAura:coM1', 'soulLinkerAura:coM1',
  'chance:vertigo', 'weakness', 'weakness:ranged', 'mindStorm', 'darkness',
  'warpAttack', 'warpDefense', 'warpResist', 'shatter', 'darkness:coM1',
  'supremeLight:coM1', 'realmWard', 'tactician:coM1',
  'eternalNight:enemyResistance:coM1',
  'darkForce', 'heavenlyLight', 'chance:heavenlyLight:melee', 'chance:heavenlyLight:rtb',
  'reinforceMagic', 'innerPower', 'reinforceMagic:ranged', 'charmOfLife',
  'eternalNight:enemyResistance', 'berserk', 'spellWard', 'tactician',
]);

const F20_C_MOM131_ORDER = Object.freeze([
  'destiny', 'level', 'lucky', 'weapon', 'chance:weapon:melee', 'chance:weapon:rtb',
  'chaosSurge', 'chance:holyWeapon:melee', 'chance:holyWeapon:rtb',
  'blackChannels', 'ironSkin', 'stoneSkin', 'flameBlade', 'flameBlade:ranged',
  'giantStrength', 'giantStrength:thrown', 'chaosChannels:armor',
  'lionheart', 'lionheart:rangedHp', 'landLinking', 'landLinking:breath', 'mysticSurge',
  'holyArmor', 'orihalcon', 'berserk', 'nodeAura',
  'highPrayer', 'prayer', 'trueLight', 'darkness',
  'metalFires', 'chance:warpReality', 'blackPrayer', 'chance:vertigo',
  'weakness', 'weakness:ranged', 'mindStorm', 'warpAttack', 'warpDefense',
  'warpResist', 'shatter',
  'endurance', 'discipline', 'reinforceMagic', 'innerPower', 'reinforceMagic:ranged',
  'charmOfLife', 'blazingMarch', 'blazingMarch:ranged', 'survivalInstinct', 'guardian',
  'badMoon', 'goodMoon', 'natureConjunction', 'spellWard', 'tactician',
  'darkForce', 'heavenlyLight', 'chance:heavenlyLight:melee', 'chance:heavenlyLight:rtb',
  'focusMagic', 'focusMagic:conversion', 'guidingBeaconAura:coM1',
  'divineBarrierAura:coM1', 'soulLinkerAura:coM1', 'darkness:coM1', 'supremeLight:coM1',
  'realmWard', 'tactician:coM1', 'eternalNight:enemyResistance',
  'eternalNight:enemyResistance:coM1',
]);

const F20_C_CP160_ORDER = Object.freeze([
  'destiny', 'level', 'lucky', 'weapon', 'chance:weapon:melee', 'chance:weapon:rtb',
  'chaosSurge', 'blackChannels', 'ironSkin', 'stoneSkin', 'flameBlade',
  'flameBlade:ranged', 'giantStrength', 'giantStrength:thrown', 'chaosChannels:armor',
  'lionheart', 'lionheart:rangedHp', 'landLinking', 'landLinking:breath', 'mysticSurge',
  'holyArmor', 'orihalcon', 'berserk', 'chance:holyWeapon:melee',
  'chance:holyWeapon:rtb', 'nodeAura',
  'highPrayer', 'prayer', 'trueLight', 'darkness',
  'metalFires', 'chance:warpReality', 'blackPrayer', 'chance:vertigo',
  'weakness', 'weakness:ranged', 'mindStorm', 'warpAttack', 'warpDefense',
  'warpResist', 'shatter',
  'endurance', 'discipline', 'reinforceMagic', 'innerPower', 'reinforceMagic:ranged',
  'charmOfLife', 'blazingMarch', 'blazingMarch:ranged', 'survivalInstinct', 'guardian',
  'badMoon', 'goodMoon', 'natureConjunction', 'spellWard', 'tactician',
  'darkForce', 'heavenlyLight', 'chance:heavenlyLight:melee', 'chance:heavenlyLight:rtb',
  'focusMagic', 'focusMagic:conversion', 'guidingBeaconAura:coM1',
  'divineBarrierAura:coM1', 'soulLinkerAura:coM1', 'darkness:coM1', 'supremeLight:coM1',
  'realmWard', 'tactician:coM1', 'eternalNight:enemyResistance',
  'eternalNight:enemyResistance:coM1',
]);

function f20SourceManifests(version) {
  const isModern = !!(version && version.startsWith('com2_'));
  const isCoM1 = version === 'com_6.08';
  const isWarlord = version === 'com2_warlord_1.5.12.7';
  return {
    b: isWarlord ? F20_WARLORD_B_ORDER : Object.freeze([]),
    c: isModern ? F20_C_MODERN_ORDER : (isCoM1 ? F20_C_COM1_ORDER
      : (version === 'mom_cp_1.60.00' ? F20_C_CP160_ORDER : F20_C_MOM131_ORDER)),
    d: isWarlord ? F20_WARLORD_D_ORDER : Object.freeze([]),
  };
}
