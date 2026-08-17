// --- Unit Stat Derivation ---
// Depends on data.js and combat.js helper functions. No DOM dependencies.

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

// Unit identity has three independent layers. The selected version scopes source
// template/hero ids; the base fields are editable identity; race/fantastic are fresh live
// calculation fields. R8.2 supplies the base fields directly from the UI; ordered conversions
// belong to R8.3. Keeping construction here makes every caller, including Matrix and Node
// checks, enter derivation through the same model.
function createUnitIdentity(values = {}) {
  const integerOrNull = value => Number.isInteger(value) ? value : null;
  return {
    version: typeof values.version === 'string' && values.version ? values.version : null,
    templateId: integerOrNull(values.templateId),
    heroTypeId: integerOrNull(values.heroTypeId),
    isHero: !!values.isHero,
    baseRace: typeof values.baseRace === 'string' ? values.baseRace : '',
    baseFantastic: !!values.baseFantastic,
    specialUnit: typeof values.specialUnit === 'string' ? values.specialUnit : 'none',
  };
}

function specialUnitForRosterIdentity(version, unit) {
  const templateId = unit && unit.templateId;
  if (version && version.startsWith('com2_')) {
    if (templateId === 81) return 'golem';
    if (templateId === 34) return 'chosen';
  }
  if (version === 'com_6.08') {
    if (templateId === 81) return 'golem';
    if (templateId === 174) return 'zombies';
    if (templateId === 37) return 'catapult';
  }
  return 'none';
}

function createRosterUnitIdentity(version, unit) {
  return createUnitIdentity({
    version,
    templateId: unit && unit.templateId,
    heroTypeId: unit && unit.heroTypeId,
    isHero: !!(unit && unit.isHero),
    baseRace: unit && unit.baseRace,
    baseFantastic: !!(unit && unit.baseFantastic),
    specialUnit: specialUnitForRosterIdentity(version, unit),
  });
}

function createCustomUnitIdentity(version, values = {}) {
  return createUnitIdentity({
    version,
    // A custom unit can reproduce a special template through R8.2's future selector,
    // but it never acquires a source roster/template or hero-type id.
    templateId: null,
    heroTypeId: null,
    isHero: values.isHero,
    baseRace: values.baseRace,
    baseFantastic: values.baseFantastic,
    specialUnit: values.specialUnit,
  });
}

// The combat code still accepts its historical compact unitType token. Keep that token as a
// derived compatibility boundary rather than allowing it to remain the source of identity.
// A fantastic custom unit with no realm is the unaligned/Arcane case used by the old control.
function legacyUnitTypeFromIdentity(identity) {
  if (!identity || !identity.baseFantastic) return identity && identity.isHero ? 'hero' : 'normal';
  const realm = {
    Life: 'life', Death: 'death', Chaos: 'chaos', Nature: 'nature',
    Sorcery: 'sorcery', Arcane: 'arcane', 'No Heal': 'unaligned',
  }[identity.baseRace] || 'arcane';
  return 'fantastic_' + realm;
}

function legacyBaseRace(input) {
  if (typeof input.race === 'string' && input.race) return input.race;
  const match = /^fantastic_(life|death|chaos|nature|sorcery|arcane)$/.exec(input.unitType || '');
  return match ? match[1][0].toUpperCase() + match[1].slice(1) : '';
}

function initializeUnitIdentity(input) {
  const supplied = input.identity;
  const base = supplied
    ? createUnitIdentity({ ...supplied, version: input.version || supplied.version })
    : createCustomUnitIdentity(input.version, {
        // Legacy callers can still provide unitType while the UI migrates to independent
        // identity controls. It is translated only at this boundary.
        isHero: input.unitType === 'hero',
        baseRace: legacyBaseRace(input),
        baseFantastic: String(input.unitType || '').startsWith('fantastic_'),
      });
  return {
    ...base,
    // These are deliberately copied values, not aliases to a base sub-record. Each
    // deriveUnitStats invocation receives a new mutable calculated identity.
    race: base.baseRace,
    fantastic: base.baseFantastic,
  };
}

function legacyUnitTypeFromLiveIdentity(identity) {
  if (!identity) return 'normal';
  if (identity.isHero && !identity.fantastic) return 'hero';
  const realm = {
    Life: 'life', Death: 'death', Chaos: 'chaos', Nature: 'nature',
    Sorcery: 'sorcery', Arcane: 'arcane', 'No Heal': 'unaligned',
  }[identity.race];
  if (!identity.fantastic) return realm ? 'normal_' + realm : 'normal';
  return 'fantastic_' + (realm || 'arcane');
}

function applyLiveUnitType(identity, unitType) {
  const value = unitType || 'normal';
  const fantastic = value.startsWith('fantastic_');
  const realm = value.startsWith('fantastic_')
    ? value.slice('fantastic_'.length)
    : value.startsWith('normal_') ? value.slice('normal_'.length) : null;
  const race = {
    life: 'Life', death: 'Death', chaos: 'Chaos', nature: 'Nature',
    sorcery: 'Sorcery', arcane: 'Arcane', unaligned: 'No Heal',
  }[realm];
  // `fantastic_arcane` is also the compact compatibility projection for an unaligned
  // custom/special identity. Do not overwrite an otherwise meaningful source race such
  // as Generic, or an intentionally blank custom race, with that fallback label.
  if (race && (realm !== 'arcane' || identity.race === 'Arcane')) identity.race = race;
  identity.fantastic = fantastic;
}

// Identity conversions are deliberately kept separate from the compact unitType compatibility
// token. The source identity and editable base predicates remain intact; this sequence mutates
// only the fresh live fields used by later stat gates. The template/name checks here correspond
// to execution-time reads in the modern/DOS constructors and are not persisted UI state.
function applyOrderedIdentityConversions(identity, abilities, version, meta = {}) {
  const live = { ...identity, race: identity.baseRace, fantastic: identity.baseFantastic };
  const sourceTemplateId = identity.templateId;
  const trace = [];
  const isCoM1 = version === 'com_6.08';
  const isModern = version && version.startsWith('com2_');
  const isBaseCoM2 = isModern && !version.startsWith('com2_warlord');
  const combatSummonedValue = !!(abilities && abilities.combatSummoned);
  const isConstructCatapult = !!(combatSummonedValue
    && !meta.isHero
    && ((isBaseCoM2 && sourceTemplateId === 37)
      || (isCoM1 && (sourceTemplateId === 37 || identity.specialUnit === 'catapult'))));
  const isCoM1SummonBranch = isCoM1 && combatSummonedValue && !isConstructCatapult;
  // Call to Arms is the only shipped base-CoM2 combat summon for Paladins. Infer that spell
  // result from the retained Paladins template (STypeID 113) plus Combat Summoned; display names
  // and custom units do not establish the identity.
  const isCallToArmsPaladins = !!(isBaseCoM2
    && combatSummonedValue
    && sourceTemplateId === 113);

  const identitySteps = [
    // PROVENANCE[identity:zombies]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:25:3ed9fd7025a17d7041e72be8
    statStep({ id: 'identity:zombies', phase: 'base', writes: ['fantastic'],
      when: () => isCoM1 && identity.specialUnit === 'zombies',
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[identity:com1ConstructCatapult]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:33:d95c9aa843da2010e42b8f16
    statStep({ id: 'identity:com1ConstructCatapult', phase: 'base', writes: ['race', 'fantastic'],
      when: () => isCoM1 && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // PROVENANCE[identity:com1SummonBranch]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:33:d95c9aa843da2010e42b8f16
    statStep({ id: 'identity:com1SummonBranch', phase: 'base', writes: ['race', 'fantastic'],
      when: () => isCoM1SummonBranch,
      apply: u => {
        if (sourceTemplateId === 113) u.race = 'Life';
        if (sourceTemplateId === 54) u.race = 'Nature';
        u.fantastic = true;
      } }),
    // PROVENANCE[identity:combatSummoned]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:3:8b5b382b46651d5d1ddfb014
    statStep({ id: 'identity:combatSummoned', phase: 'a', writes: ['fantastic'],
      when: () => isModern && combatSummonedValue,
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[identity:chosen]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:c9d9c1b29c14707318605a05 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:f9fdc8e8e8cb9c94edf0f936 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:f9fdc8e8e8cb9c94edf0f936
    statStep({ id: 'identity:chosen', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isModern && identity.specialUnit === 'chosen',
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // PROVENANCE[identity:constructCatapult]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Spells.CombatSummonUnit.pas@span:21:1650fe50059f7cde525a29fd | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:13:22d4847c5bd5843526ea3fc0 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:14:0c00ef951862849e15604add | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:18:0dad2f766ea1e74b0aa62aa1
    statStep({ id: 'identity:constructCatapult', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isBaseCoM2 && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // PROVENANCE[identity:callToArmsPaladins]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Spells.CombatSummonUnit.pas@span:21:1650fe50059f7cde525a29fd | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:13:fff6a55971377c87264d2e0d | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:13:5f2ec3d006ad08bc02189c7b
    statStep({ id: 'identity:callToArmsPaladins', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isBaseCoM2 && isCallToArmsPaladins,
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // PROVENANCE[identity:legacyConversions]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:30:d4e30893d832cb480ebf32b3 | Reference docs/DOS reconstructed/unitcalc.c@span:24:924a9c7939c2ac5634769450 | Reference docs/DOS reconstructed/unitcalc.c@span:38:e3a2910961158d35a5fab1ec | Reference docs/DOS reconstructed/unitcalc.c@span:19:6f6aeaf7cbc23a280cd7996e | Reference docs/DOS reconstructed/unitcalc.c@span:8:185c85844cf35c344b38d022 | Reference docs/DOS reconstructed/combat.c@span:38:1261faf60c16514c7ab3e276 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:e90777a680ce0ccd0df5ea87 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:39:4e8bdcd399e4740f3cd26f41 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:b7e9d476a7f9ec33bbaca56c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:53a2c4bd769924b58f286c8d | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:23:662a6a49c604798625ed7e49 | Reference docs/Caster binary/Spells.InitializeCombatSpellcasting.pas@span:28:deb5b65ff17f3f2812792a90 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:17:e0211f9ae323b4ad5ba16aa7 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:10:22628deef93aef7a52582f1a | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:e23e1931b3ccaf4ea86bae2e
    statStep({ id: 'identity:legacyConversions', phase: 'a', writes: ['race', 'fantastic'],
      apply: u => {
        const unitType = determineEffectiveUnitType(
          legacyUnitTypeFromLiveIdentity(u), abilities, version, identity);
        applyLiveUnitType(u, unitType);
        // A compact `hero` token has no realm slot. Preserve Sanctify's unconditional
        // Life-race write when no later Fantastic conversion superseded the hero state.
        if (version && version.startsWith('com2_warlord')
            && abilities && abilities.sanctify && unitType === 'hero') u.race = 'Life';
      } }),
    // PROVENANCE[identity:marionetteChanneler]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913
    statStep({ id: 'identity:marionetteChanneler', phase: 'b', writes: ['fantastic'],
      when: () => version === MARIONETTE_VERSION
        && identity.heroTypeId === MARIONETTE_HERO_TYPE_ID
        && !!(abilities && abilities.channeler),
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[identity:spiritLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:1:15d81b9f3b72c934c9219502
    statStep({ id: 'identity:spiritLink', phase: 'd', writes: ['fantastic'],
      when: () => !!(version && version.startsWith('com2_warlord')) && !!(abilities && abilities.spiritLink),
      apply: u => { u.fantastic = false; } }),
  ];
  // F20: identity writes in b or d are represented CAS writes like any other, so they go
  // through the same manifest walk. That is what stops one from being added later and never
  // reaching a manifest. UnitCalcPre/UnitCalc are Warlord-only hooks, so their definitions are
  // dropped for the other versions exactly as the stat sequence drops them.
  const isWarlordHookVersion = !!(version && version.startsWith('com2_warlord'));
  const applicableIdentitySteps = identitySteps.filter(step =>
    (step.phase !== 'b' && step.phase !== 'd') || isWarlordHookVersion);
  runStatSteps(orderStatStepsBySource(applicableIdentitySteps, f20SourceManifests(version)),
    live, { version, base: identity, trace });
  return { identity: live, trace, isConstructCatapult };
}

// Lava Smelter (Warlord): five independent flags record the permanent mineral-pair grants already
// carried by the unit. New Dwarf units receive them when trained; Upgrade & Retrain can apply
// them later to any existing non-fantastic unit. Returns the ability set with every grant merged
// in (a new object), or the original set unchanged when it does not apply. Merging up-front
// — rather than into effectiveAbilities — lets the Flame Blade grant reach the weapon-upgrade
// and stat-bonus logic, which read the raw ability set. The Wall-of-Fire siege effect is not
// modelled here (it has its own global toggle).
function applyLavaSmelterGrant(abilities, version, unitType) {
  if (!version || !version.startsWith('com2_warlord') || (unitType || '').startsWith('fantastic_')) return abilities;
  // The legacy selector branches keep old presets/share payloads readable; new UI state uses
  // the five independent booleans and can therefore carry every applicable pair simultaneously.
  const legacy = abilities.lavaSmelter || 'none';
  const weaponImmunity = !!abilities.lavaSmelterWeaponImmunity || legacy === 'weaponImmunity';
  const missileImmunity = !!abilities.lavaSmelterMissileImmunity || legacy === 'missileImmunity';
  const resistElements = !!abilities.lavaSmelterResistElements || legacy === 'resistElem';
  const elementalArmor = !!abilities.lavaSmelterElementalArmor || legacy === 'elementalArmor';
  const fieryBlade = !!abilities.lavaSmelterFieryBlade || legacy === 'flameBlade';
  if (!weaponImmunity && !missileImmunity && !resistElements && !elementalArmor && !fieryBlade) {
    return abilities;
  }
  const merged = { ...abilities };
  const grants = [
    weaponImmunity && 'weaponImmunity',
    missileImmunity && 'missileImmunity',
    resistElements && 'resistElements',
    elementalArmor && 'elementalArmor',
    fieryBlade && 'fieryBlade',
  ].filter(Boolean);
  for (const grant of grants) {
    switch (grant) {
      // STAT-FORMULA[lavaSmelter:weaponImmunity]
      // PROVENANCE[lavaSmelter:weaponImmunity]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:20:6b832639e6e0656624d526f2 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:5:19b52f5f80442e39e3d39683
      case 'weaponImmunity': merged.weaponImmunity = true; break;
      // STAT-FORMULA[lavaSmelter:missileImmunity]
      // PROVENANCE[lavaSmelter:missileImmunity]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:21:b4b1a5faba3c07399d273ecc | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:11:d560f73eb0a27ed8c05f0521
      case 'missileImmunity': merged.missileImmunity = true; break;
      // STAT-FORMULA[lavaSmelter:resistElementsAlias]
      // PROVENANCE[lavaSmelter:resistElementsAlias]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:23:d6475291cbd817aedb8be4d2 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:23:02ffaad30254a68cf55740f4 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:c5d736809b27903ec0e40f87 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:69075b87f644f18cbdb1c64a | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:e2dc42fafe0d325d0f39e42c | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:c99051561c61668cea94903d
      case 'resistElements': merged.resistElements = true; break;
      // STAT-FORMULA[lavaSmelter:elementalProtection]
      // PROVENANCE[lavaSmelter:elementalProtection]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:23:d6475291cbd817aedb8be4d2 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:23:02ffaad30254a68cf55740f4 | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:2:95c224910389756ff6f69515 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:473b9eac9397f92d8022c2cd
      case 'elementalArmor': merged.elementalArmor = true; break;
      // STAT-FORMULA[lavaSmelter:flameBlade]
      // PROVENANCE[lavaSmelter:flameBlade]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:24:03c7f203c08a93035f9d5921 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:19:60c5b098b00fb24b111ce36e | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:40:6041faab8107a7e9e3594201 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:29:9803f0d614b7957485b50536
      case 'fieryBlade': merged.fieryBlade = true; break;
      default: break;
    }
  }
  return merged;
}

// Sancta Basilica (Warlord, High Men building): every High Men unit trained here gains +3
// Resistance (added in deriveUnitStats). Clergy (matched by the Clergy unit tag), Crusaders,
// and Paladins (matched by name) additionally receive Sanctify; Crusaders also gain Lucky and
// Paladins also gain Magic Immunity. Those three grants are folded in here so every downstream
// read sees them — Sanctify drives the Life-realm unit-type conversion, Lucky feeds the ability
// stat modifiers, and Magic Immunity feeds the combat immunity checks. The improved Exorcise
// grant (Clergy) and the True Light city enchantment (defending) are not modelled. Gated on the
// High Men race; heroes gain nothing.
function applySanctaBasilicaGrant(abilities, version, unitType, race, name) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.sanctaBasilica
      || race !== 'High Men' || unitType === 'hero') return abilities;
  const isCrusader = (name || '').endsWith('Crusaders');
  const isPaladin = (name || '').endsWith('Paladins');
  const isClergy = !!abilities.clergy;
  if (!isCrusader && !isPaladin && !isClergy) return abilities;
  const result = {
    ...abilities,
    sanctify: true,
    ...(isCrusader ? { lucky: true, luckyPhaseBase: true } : {}),
    ...(isPaladin ? { magicImmunity: true } : {}),
  };
  return result;
}

// Magic Immunity hard-blocks a set of magic-based curses: the immunity grants such
// overwhelming effective resistance/defense that these curses simply never take hold,
// so the calculator strips them here before any downstream read (display stats,
// effectiveAbilities, and the combatAbilities passed to resolveCombat all derive from
// this object). Mind Storm and Vertigo are additionally blocked by Illusion Immunity,
// including the Illusion Immunity granted by Eye of Heaven.
// Curses that bypass Magic Immunity per the source are NOT gated: Black Prayer (on the
// MoM bypass list), Hierophany ("Cannot be blocked by … Magic Immunity"), and Eternal
// Night's Darkness malus (Darkness is on the MoM bypass list).
// Mislead/Liability are deliberately absent: the spell's resist roll and Death/Illusion
// "no effect" clause gate only the single targeted unit, but the Misfortune/Jinx debuff
// then spreads to every normal unit in the army with no per-unit immunity check — so a
// unit suffering the debuff is not protected by any immunity.
const MAGIC_IMMUNITY_GATED_CURSES = [
  'weakness', 'blackSleep', 'shatter', 'vertigo',
  'warpAttack', 'warpDefense', 'warpResist', 'nausea', 'temporalTwist', 'mindStorm',
];
const ILLUSION_IMMUNITY_GATED_CURSES = ['mindStorm', 'vertigo'];
function applyMagicImmunityCurseGating(abilities) {
  const magicImmune = !!abilities.magicImmunity;
  const illusionImmune = !!(abilities.illusionImmunity || abilities.trueSight || abilities.eyeOfHeaven);
  const illusionHasCurse = illusionImmune
    && ILLUSION_IMMUNITY_GATED_CURSES.some(k => abilities[k]);
  if (!magicImmune && !illusionHasCurse) return abilities;
  const gated = { ...abilities };
  if (magicImmune) {
    for (const key of MAGIC_IMMUNITY_GATED_CURSES) {
      if (gated[key]) delete gated[key];
    }
  }
  if (illusionImmune) {
    for (const key of ILLUSION_IMMUNITY_GATED_CURSES) {
      if (gated[key]) delete gated[key];
    }
  }
  return gated;
}

// Divine Protection (Warlord, Life unit enchantment): grants Lucky and Death Immunity.
// Folded into effective abilities here so every downstream read sees them — Lucky feeds the
// ability stat modifiers (+10% To Hit, +10% To Block, +1 Resistance) and Death Immunity feeds
// the combat immunity checks (Death Gaze/Touch, Life Stealing, Cause Fear).
// Lucky reaches a unit from several sources. These markers retain which stage established
// the flag, but the resulting stat package does not execute there: Caster.exe's compiled
// Lucky block reads the finished flag and writes Resistance/To Hit/To Defend in region c.
function markIntrinsicLucky(abilities) {
  return abilities && abilities.lucky ? { ...abilities, luckyPhaseA: true } : abilities;
}

function applyDivineProtectionGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities || !abilities.divineProtection) return abilities;
  return { ...abilities, lucky: true, luckyPhaseB: true, deathImmunity: true };
}

// Pillar of Faith (Warlord, Life rare city enchantment): units trained in the city have a
// 20% chance to gain Lucky. The calculator models the landed outcome, so the pillarOfFaithLucky
// toggle folds Lucky in directly (its +10% To Hit / +10% To Block / +1 Resistance flow through
// the ability stat modifiers). The separate +Resistance per Religious Building is applied to
// res in deriveUnitStats.
function applyPillarOfFaithGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.pillarOfFaithLucky) return abilities;
  return { ...abilities, lucky: true, luckyPhaseBase: true };
}

// Fortification (Warlord, city building): all defending units inside the city walls gain a
// Large Shield effect. If the unit already has Large Shield, it receives Missile Immunity
// instead (helptext: "If the friendly unit already has Large Shield ability, the unit receives
// Missile Immunity bonus instead"). Folded in here so the largeShield/missileImmunity defense
// bonuses flow through every downstream combat read.
function applyFortificationGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.fortification) return abilities;
  return abilities.largeShield
    ? { ...abilities, missileImmunity: true }
    : { ...abilities, largeShield: true };
}

// Insulation (Warlord, Chaos unit enchantment): grants Fire Immunity, Cold Immunity, and
// Lightning Resist. Folded into effective abilities here so the combat immunity checks
// (fire breath/immolation/wall of fire defense, cold attacks, and the lightning AP negation)
// all see them.
function applyInsulationGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.insulation) return abilities;
  return { ...abilities, fireImmunity: true, coldImmunity: true, lightningResist: true };
}

const MARIONETTE_VERSION = 'com2_warlord_1.5.12.7';
const MARIONETTE_HERO_TYPE_ID = 48;
const MARIONETTE_REALMS = ['nature', 'sorcery', 'chaos', 'life', 'death'];
const MARIONETTE_RANGED_TYPES = {
  nature: 'magic_n', sorcery: 'magic_s', chaos: 'magic_c', life: 'magic_n', death: 'magic_c',
};
const MARIONETTE_SPELLS = {
  nature: { base: 'Web', ascended: 'Ice Bolt', conjurer: 'Water Elemental' },
  sorcery: { base: 'AEther Sparks', ascended: 'Psionic Blast', conjurer: 'Phantom Beast' },
  chaos: { base: 'Fire Bolt', ascended: 'Lightning Bolt', conjurer: 'Fire Elemental' },
  life: { base: 'Healing', ascended: 'Exaltation', conjurer: 'Unicorns' },
  death: { base: 'Life Drain', ascended: 'Syphon Life', conjurer: 'Werewolves' },
};

function marionetteBookCount(abilities, realm) {
  const key = `marionette${realm[0].toUpperCase()}${realm.slice(1)}Books`;
  return Math.max(0, Math.trunc(Number(abilities[key]) || 0));
}

// STAT-FORMULA[marionettePackage]
// PROVENANCE[marionettePackage]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:39:58a1f4eccd319a76072204a6 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:40:278fa1f3acca365b536cf823 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:19:55ebed8c65ed05b617bc2a17 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:37:2a33b53fd826bd83bed71132 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:40:53a8e746ffb95d09d43c6694 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:31:0485f6bca9517d221d1400be | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:31:8e93c3479df43f3aa01d74ab
function deriveMarionettePackage(identity, abilities, version) {
  if (version !== MARIONETTE_VERSION || identity.heroTypeId !== MARIONETTE_HERO_TYPE_ID) {
    return { abilities, package: null };
  }

  // A Wanderer recalculated without a Channeler owner takes the one-time strayed branch.
  // Its persistent, calculator-relevant grants are projected here even though Spell Lock
  // prevents the source from writing the same package again on later recalculations.
  if (!abilities.channeler) {
    const grantedAbilities = [
      'Transmute Equipment', 'Rebuild', 'Sage', 'Mechanical Master',
      'Ritual Master', 'Charmed', 'Arcane Ward', 'Spell Lock',
    ];
    return {
      abilities: {
        ...abilities,
        transmuteEquipment: true,
        rebuild: true,
        sage: 2,
        mechanicalMaster: 2,
        ritualMaster: 2,
        charmed: true,
        arcaneWard: 2,
        spellLock: true,
      },
      // Wanderer's roster record retains Chaos ranged type 30 at zero strength. Transmute
      // Equipment's later +2 SRanged write therefore activates that latent channel.
      package: { state: 'strayed', spellLock: true, rangedType: 'magic_c', grantedAbilities },
    };
  }

  const primary = MARIONETTE_REALMS.includes(abilities.marionettePrimary)
    ? abilities.marionettePrimary : 'nature';
  const books = Object.fromEntries(MARIONETTE_REALMS.map(realm => [realm, marionetteBookCount(abilities, realm)]));
  const ascended = !!abilities.marionetteAscension;
  const conjurer = !!abilities.marionetteConjurer;
  const baseSkill = Math.max(0, Math.trunc(Number(abilities.marionetteBaseSkill) || 0));
  const attackBonus = Math.trunc(baseSkill / 30);
  const defenseBonus = Math.trunc(baseSkill / 50);
  const primaryBooks = books[primary];
  const charges = ascended
    ? Math.max(1, Math.trunc(primaryBooks / 2))
    : 1 + Math.trunc(primaryBooks / 2);
  const spellSet = MARIONETTE_SPELLS[primary];
  const spell = ascended ? (conjurer ? spellSet.conjurer : spellSet.ascended) : spellSet.base;
  const grants = { ...abilities };
  const grantedAbilities = [];
  const grant = (key, label = key, value = true) => {
    grants[key] = value;
    grantedAbilities.push(label);
  };

  if (books.nature > 1) { grant('forester', 'Forester'); grant('mountaineer', 'Mountaineer'); }
  if (books.nature > 2) grant('poisonImmunity', 'Poison Immunity');
  if (books.nature > 4) grant('stoningImmunity', 'Stoning Immunity');
  if (books.sorcery > 1) grant('largeShield', 'Large Shield');
  if (books.sorcery > 2) grant('missileImmunity', 'Missile Immunity');
  if (books.sorcery > 4) grant('resistMagic', 'Resist Magic');
  if (books.chaos > 1) grant('firstStrike', 'First Strike');
  if (books.chaos > 2) grant('fireImmunity', 'Fire Immunity');
  if (books.chaos > 4) grant('lightningResist', 'Lightning Resist');
  if (books.life > 1) grant('healer', 'Healer');
  if (books.life > 2) grant('illusionImmunity', 'Illusion Immunity');
  if (books.life > 4) { grant('lucky', 'Lucky'); grants.luckyPhaseB = true; }
  if (books.death > 1) grant('coldImmunity', 'Cold Immunity');
  if (books.death > 2) grant('deathImmunity', 'Death Immunity');
  if (books.death > 4) grant('weaponImmunity', 'Weapon Immunity');

  if (ascended) {
    if (primary === 'nature') {
      grant('poison', 'Poison 10', 10);
      grant('stoningTouch', 'Stoning Touch -2', -2);
    } else if (primary === 'sorcery') {
      grant('counterImmunity', 'Counter Immunity');
      grant('illusion', 'Illusion');
    } else if (primary === 'chaos') {
      grant('wallCrusher', 'Wall Crusher');
      grant('armorPiercing', 'Armor Piercing');
    } else if (primary === 'life') {
      grant('exorcise', 'Exorcise -4', -4);
      grant('bless', 'Bless');
    } else if (primary === 'death') {
      grant('bloodSucker', 'Blood Sucker');
      grant('createUndead', 'Create Undead');
    }
    if (books.nature > 4) grant('regeneration', 'Regeneration +2', 2);
    if (books.sorcery > 4) grant('invisibility', 'Invisibility');
    if (books.chaos > 4) grant('destruction', 'Destruction 0', 0);
    if (books.life > 4) grant('healingAura', 'Healing Aura');
    if (books.death > 4) grant('lifeSteal', 'Life Steal -1', -1);
  }

  return {
    abilities: grants,
    package: {
      state: 'owned', primary, books, ascended, conjurer, baseSkill,
      attackBonus, defenseBonus,
      rangedType: ascended && primary === 'chaos' ? 'magic_c' : MARIONETTE_RANGED_TYPES[primary],
      spell, charges, grantedAbilities,
    },
  };
}

// Outlander controls expose the researched reform/building conditions, not their
// derived labels. Fold permanent unit upgrades and combat-only labels in before
// curse gating so downstream mechanics see a single calculated state.
const DERIVED_OUTLANDER_STATE_KEYS = [
  'armorclad',
  'battleArmor',
  'blackpowder',
  'bombsGrenades',
  'energyCannon',
  'energyCannonDestruction',
  'energyWeaponry',
  'magitekEngine',
  'pneumaField',
  'powerEngine',
  'psychoForce',
  'temporalGravityDrive',
  'upgradedExplosive',
  'outlanderBallisticsTraining',
  'outlanderRadio',
  'outlanderXenopsychology',
  'outlanderXenoveterinary',
];

function applyOutlanderReformGrants(abilities, version, baseUnitType, isHero = false,
  channelerMarionette = false) {
  if (!version || !version.startsWith('com2_warlord')) return abilities;

  // These names are outputs, never accepted inputs. Besides keeping the UI to one
  // source of truth, stripping them here prevents stale saved state or a caller from
  // bypassing the reform/building prerequisites.
  const fundamentalAbilities = { ...abilities };
  for (const key of DERIVED_OUTLANDER_STATE_KEYS) delete fundamentalAbilities[key];

  const baseFantastic = String(baseUnitType || '').startsWith('fantastic_');
  const outlanderWizard = !!fundamentalAbilities.outlanderWizard;
  // All reform spell states are owned by Outlander wizards. Keep their raw controls in
  // the UI state, but remove them from the effective unit state when the owner is not
  // an Outlander so no downstream branch can accidentally consume one ungated.
  if (!outlanderWizard) {
    for (const key of [
      'armorcladReform', 'ballisticsTraining', 'energyBeamWeapons', 'explosive',
      'heatPowerEngine', 'magitekEngineering', 'magitekScience', 'militaryDrilling',
      'pneumaReactor', 'psychoConverter', 'radio', 'rocketry', 'temporalEngineering',
      'xenopsychology', 'xenoveterinary',
    ]) delete fundamentalAbilities[key];
  }
  // Rebuild permanently writes Mechanical for non-heroes. Its hero branch is
  // encounter-only and cannot receive overland Power Engine/Armorclad upgrades.
  const permanentMechanical = !!fundamentalAbilities.mechanical
    || (!!fundamentalAbilities.rebuild && !isHero);
  const armorclad = outlanderWizard && !!fundamentalAbilities.armorcladReform && permanentMechanical;
  const battleArmor = outlanderWizard && !!fundamentalAbilities.armorcladReform
    && !baseFantastic && !permanentMechanical;
  const powerEngine = outlanderWizard && !!fundamentalAbilities.heatPowerEngine && permanentMechanical;
  // UnitCalc.CAS evaluates left-to-right: non-fantastic non-mechanical units,
  // heroes, and Armorclad mechanical units pass; fantastic units do not.
  const outlanderSoldier = outlanderWizard && !baseFantastic && (!permanentMechanical || armorclad);
  const firstFourEligible = outlanderWizard && (!baseFantastic || !!fundamentalAbilities.sapiens);
  const temporalDrive = powerEngine && !!fundamentalAbilities.temporalEngineering;
  const temporalGravityDrive = temporalDrive && !!fundamentalAbilities.sailing;
  const magitekEngine = powerEngine && !!fundamentalAbilities.magitekEngineering;
  const militaryDrilling = outlanderWizard && !baseFantastic && !!fundamentalAbilities.militaryDrilling;

  return {
    ...fundamentalAbilities,
    ...(armorclad ? { armorclad: true } : {}),
    ...(battleArmor ? { battleArmor: true } : {}),
    ...(powerEngine ? { powerEngine: true } : {}),
    ...(magitekEngine ? { magitekEngine: true, largeShield: true } : {}),
    ...(temporalDrive ? { haste: true } : {}),
    ...(temporalGravityDrive
      ? { temporalGravityDrive: true, flying: true, illusionImmunity: true }
      : {}),
    ...(outlanderSoldier && fundamentalAbilities.energyBeamWeapons
      ? { energyWeaponry: true }
      : {}),
    ...(outlanderSoldier && fundamentalAbilities.psychoConverter
      ? { psychoForce: true }
      : {}),
    ...(outlanderSoldier && fundamentalAbilities.pneumaReactor
      ? { pneumaField: true }
      : {}),
    ...(firstFourEligible && fundamentalAbilities.ballisticsTraining
      ? { outlanderBallisticsTraining: true }
      : {}),
    ...(firstFourEligible && fundamentalAbilities.xenopsychology
      ? { outlanderXenopsychology: true }
      : {}),
    ...(firstFourEligible && fundamentalAbilities.radio
      ? { outlanderRadio: true }
      : {}),
    ...(outlanderWizard && (baseFantastic || channelerMarionette) && fundamentalAbilities.xenoveterinary
      ? { outlanderXenoveterinary: true }
      : {}),
    // Despite both prose sources naming Battle Armor, the executing scripts grant Resist
    // Magic only alongside the permanent EncArmorClad flag (CreateUnit.CAS:704-705 and
    // OverlandEndTurn.CAS:436-442). The transient +3 Battle Armor branch has no such grant.
    ...(outlanderWizard && fundamentalAbilities.magitekScience && armorclad
      ? { resistMagic: true }
      : {}),
    ...(militaryDrilling
      ? { discipline: fundamentalAbilities.discipline === 'combat' ? 'combat' : 'overland' }
      : {}),
  };
}

// Hierophany's calculated ability writes run with its Defense write and remove both movement
// flags consumed by FirewallEffect, in addition to the modeled combat immunities.
// STAT-FORMULA[hierophanyAbilityStrip]
// PROVENANCE[hierophanyAbilityStrip]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:23:cffe3872cfdacaf6f0361e5a
function applyHierophanyAbilityStrip(combatAbilities, isWarlord) {
  if (!isWarlord || !combatAbilities.hierophany) return combatAbilities;
  return {
    ...combatAbilities,
    weaponImmunity: false,
    missileImmunity: false,
    magicImmunity: false,
    deathImmunity: false,
    fireImmunity: false,
    coldImmunity: false,
    illusionImmunity: false,
    poisonImmunity: false,
    stoningImmunity: false,
    lightningResist: false,
    negateFirstStrike: false,
    merging: false,
    teleporting: false,
  };
}

// Derive all effective stats for a unit from raw UI state.
// Pure stat logic: no DOM reads or rendering side effects.
function deriveUnitStats(input) {
  const prefix = input.prefix;
  const version = input.version;
  const identity = initializeUnitIdentity(input);
  const baseUnitType = legacyUnitTypeFromIdentity(identity);
  const isHero = !!identity.isHero;
  const isFantasticBase = !!identity.baseFantastic;
  const isCoM1 = version === 'com_6.08';
  const suppliedAbilities = { ...(input.abilities || {}) };
  // ApplyAttack's modern Cause Fear setup reads Death Immunity from BaseUnits rather than
  // the recalculated Units record. Preserve the raw/intrinsic bit before buildings, items,
  // enchantments, and unit-state normalization can grant calculated Death Immunity.
  const baseDeathImmunity = !!suppliedAbilities.deathImmunity;
  // Golem's constructor write is intrinsic and must survive direct calculator/Matrix calls,
  // even when the DOM-derived Elements control is not present in the caller's ability map.
  if ((version.startsWith('com2_') || isCoM1) && identity.specialUnit === 'golem') {
    suppliedAbilities.elemArmor = 'resistElements';
  }
  // Abilities are read before stat derivation because Chaos Channels eligibility can depend on gaze attacks.
  // Lava Smelter folds its granted ability in here so every downstream read sees it.
  // Race-exclusive building enchantments gate on the unit's intrinsic race/name, supplied
  // by the caller from the selected roster unit. Custom (hand-entered) units carry neither,
  // so building buffs are inert on them. The display name may be race-prefixed for some
  // units and not others, so name exceptions match with endsWith (always gated by race).
  const unitRace = identity.race;
  const baseUnitRace = identity.baseRace;
  const unitName = input.name || '';
  const marionetteDerivation = deriveMarionettePackage(
    identity, markIntrinsicLucky(suppliedAbilities), version);
  const marionette = marionetteDerivation.package;
  const abilities = applyMagicImmunityCurseGating(
    applyOutlanderReformGrants(
    applyFortificationGrant(
    applyInsulationGrant(
    applyPillarOfFaithGrant(
    applyDivineProtectionGrant(
      applySanctaBasilicaGrant(
        applyLavaSmelterGrant(marionetteDerivation.abilities, version, baseUnitType),
        version, isHero ? 'hero' : baseUnitType, unitRace, unitName),
      version),
    version),
    version),
    version),
    version, baseUnitType, isHero, marionette && marionette.state === 'owned'));
  const destinyActive = destinyActiveForUnit(abilities, version);
  const identityConversion = applyOrderedIdentityConversions(identity, abilities, version, {
    isHero,
    name: unitName,
  });
  Object.assign(identity, identityConversion.identity);
  const unitTypeRaw = legacyUnitTypeFromLiveIdentity(identity);
  const unitTypeVal = unitTypeRaw;
  const isFantasticLive = !!identity.fantastic;
  const marionetteOwned = !!(marionette && marionette.state === 'owned');
  const marionetteStrayed = !!(marionette && marionette.state === 'strayed');
  const marionetteRangedPass = (marionetteOwned || marionetteStrayed)
    && (!input._modernChannelKey || input._modernChannelKey === 'ranged');
  const marionetteOwnsThisRangedPass = marionetteOwned
    && (!input._modernChannelKey || input._modernChannelKey === 'ranged');
  const marionetteAttackBonus = marionetteOwned ? marionette.attackBonus : 0;
  const marionetteDefenseBonus = marionetteOwned ? marionette.defenseBonus : 0;
  // Caster.exe's standing Fantastic -> EncMagic write runs in compiled region c. Warlord
  // Spirit Link first asserts Fantastic in UnitCalcPre (phase b), so the standing rule sees
  // it even for a calculator-reachable custom input that was not fantastic beforehand. The
  // late UnitCalc hook (phase d) then clears Fantastic without clearing the derived flag.
  const fantasticAtModernEncMagicRule = isFantasticLive
    || (version.startsWith('com2_warlord') && !!abilities.spiritLink);
  const loadoutEligible = !isFantasticBase && !destinyActive;
  // Spirit Link (Warlord): grants a fantastic creature sentience so it can earn
  // experience levels. It does NOT grant weapon/armor loadout, so only level
  // eligibility is widened — weapon and armor below stay gated on loadoutEligible.
  const levelEligible = loadoutEligible
    || (version.startsWith('com2_warlord') && !!abilities.spiritLink && !destinyActive);
  const level = levelEligible ? input.level : 'normal';
  const lvl = getLevelBonuses(level, version);
  // Warlord: Rebuild makes the unit Mechanical; Artificer retort then grants
  // Magic Weapons (+10% To Hit, bypass Weapon Immunity) to that unit.
  const isWarlord = version.startsWith('com2_warlord');
  const warlordCombatFlameBlade = isWarlord && !!abilities.flameBladeWarlord;
  const effectiveMechanical = !!abilities.mechanical
    || (isWarlord && !!abilities.rebuild);
  const artificerMagicWeapon = isWarlord
    && !!abilities.artificer && effectiveMechanical;
  // Altar of the Moon (Warlord, Gnoll building): Gnoll units trained here gain Rage and
  // Poison Immunity; ranged units also gain +2 Ranged Attack. The granted abilities are
  // folded into effectiveAbilities below; the ranged bonus is added to the rtb total.
  // Gated on the Gnoll race — non-Gnoll units and heroes gain nothing.
  const altarOfTheMoon = isWarlord && !!abilities.altarOfTheMoon
    && baseUnitRace === 'Gnoll' && !isHero;
  // Unit-specific Altar of the Moon grants: Gnoll Hunters gain Poison 2; Gnoll
  // Witchdoctors gain Life Steal -1 which replaces their Poison. Applied via effectiveAbilities below.
  const altarHunter = altarOfTheMoon && unitRace === 'Gnoll' && unitName.endsWith('Hunters');
  const altarWitchdoctor = altarOfTheMoon && unitRace === 'Gnoll' && unitName.endsWith('Witchdoctors');
  // Altar of the Sun (Warlord, Hawkmen building): Hawkmen units trained here gain +1
  // Figure, except Holy Mother who gains +1 Melee instead. Gated on the Hawkmen race —
  // heroes are excluded and gain nothing. Only these unit bonuses are modelled; the
  // defending-city High Prayer buff is not.
  const altarOfTheSunEligible = isWarlord
    && !!abilities.altarOfTheSun && baseUnitRace === 'Hawkmen' && !isHero;
  const altarOfTheSunHolyMother = altarOfTheSunEligible && unitName.endsWith('Holy Mother');
  const altarOfTheSun = altarOfTheSunEligible && !unitName.endsWith('Holy Mother');
  // Dragon Mound (Warlord, Draconian building): Draconian units trained here gain +1 Armor
  // (folded into def below) and, for units that already have a Fire Breath attack, +2 Fire
  // Breath. Like the Military Workshop breath bonus, it boosts an existing fire breath rather
  // than granting one to melee-only units. Gated on the Draconian race — non-Draconian
  // units and heroes gain nothing, matching the in-game race-exclusive building.
  const dragonMound = isWarlord
    && !!abilities.dragonMound && baseUnitRace === 'Draconian' && !isHero;
  // Ludus Agoge (Warlord, Orc building): Orc units trained here gain +1 Attack (melee, folded
  // into atk below), +1 Resistance, and +1 HP. Legionary units gain +1 Movement instead — not
  // modelled here — so they receive no stat bonus. Gated on the Orc race — non-Orc units,
  // Legionaries, and heroes gain nothing, matching the in-game race-exclusive building.
  const ludusAgoge = isWarlord
    && !!abilities.ludusAgoge && baseUnitRace === 'Orc' && !unitName.endsWith('Legionary') && !isHero;
  // Mother Fungus (Warlord, Goblin building): Goblin units trained here gain +2 Attack (melee,
  // folded into atk below), +10% To Defend (folded into toBlock below), and Poison 1 (boosts an
  // existing poison attack, or grants Poison 1 if it has none). The ×2 Spellcharge bonus is not
  // modelled. Gated on the Goblin race — non-Goblin units and heroes gain nothing, matching the
  // in-game race-exclusive building.
  const motherFungus = isWarlord
    && !!abilities.motherFungus && baseUnitRace === 'Goblin' && !isHero;
  // Pool of Repentance (Warlord, Rakhshasa building): Rakhshasa units trained here gain +1 Armor
  // (folded into defBase below) and +1 Resistance (folded into res below). Gated on the Rakhshasa
  // race — non-Rakhshasa units and heroes gain nothing, matching the in-game race-exclusive building.
  const poolOfRepentance = isWarlord
    && !!abilities.poolOfRepentance && baseUnitRace === 'Rakhshasa' && !isHero;
  // Sancta Basilica (Warlord, High Men building): +3 Resistance for every High Men unit trained
  // here (folded into res below). The unit-specific Sanctify / Lucky / Magic Immunity grants are
  // applied earlier via applySanctaBasilicaGrant. Gated on the High Men race; heroes gain nothing.
  const sanctaBasilica = isWarlord
    && !!abilities.sanctaBasilica && baseUnitRace === 'High Men' && !isHero;
  // Rust (Warlord Chaos common combat curse): permanently strips magic/orihalcon weapons
  // (the unit reverts to regular weapons), −3 melee attack (applied in combat.js), and
  // eliminates thrown attacks and Large Shield for the rest of combat (below).
  // Rust targets an enemy regular (non-fantastic) unit; fantastic creatures are immune.
  const rustActive = version.startsWith('com2_warlord') && !!(abilities && abilities.rust)
    && !isFantasticLive;
  // Zombies are the one fantastic unit affected by weapon quality: a unit raised as
  // Zombies keeps its magic/mithril/adamantium weapons (a known game quirk), so weapon
  // eligibility gets a Zombies exception while armor and level stay fantastic-gated.
  const weaponEligible = loadoutEligible || identity.specialUnit === 'zombies' || unitName === 'Zombies';
  // CoM1's Catapult constructor writes weapon quality 9 only for the combat-summoned
  // Construct Catapult path. That is a direct Magic Weapons write: it gives the Boulder
  // channel +10% To Hit and lets it bypass Weapon Immunity, while an ordinary Catapult
  // remains a normal, non-fantastic siege unit.
  const constructCatapult = isCoM1 && identityConversion.isConstructCatapult;
  const weaponInput = constructCatapult ? 'normal' : (weaponEligible ? input.weapon : 'normal');
  const weaponPreRust = constructCatapult ? 'magic'
    : (artificerMagicWeapon && weaponInput === 'normal') ? 'magic' : weaponInput;
  const weapon = rustActive ? 'normal' : weaponPreRust;
  const wpn = weaponBonus(weapon);
  // Armor quality: CoM/CoM2/Warlord only (doesn't exist in MoM), and unlike
  // weapons, heroes get none either.
  const armorExists = !version.startsWith('mom_');
  const armor = (armorExists && loadoutEligible && !isHero) ? input.armor : 'normal';

  const rtbTypeRaw = input.rtbType;
  let rangedType = RANGED_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
  let thrownType = THROWN_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
  const permanentRangedType = rangedType;
  const permanentThrownType = thrownType;
  const gazeType = GAZE_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
  // Marionette writes the conventional ranged type without clearing any independent
  // Thrown/Breath field. Child passes make that distinction exact for modern records.
  if (marionetteRangedPass) rangedType = marionette.rangedType;
  // Military Workshop (Warlord, XuanYuan building): upgrades any normal unit trained,
  // garrisoned in, or fighting from the city — not race-gated, per the "any defending units
  // of the city" + "base normal units" changelog wording. Heroes and fantastic creatures are
  // excluded. Rocketry is an alternative source of the same Blackpowder upgrade.
  // Combat-relevant effects, checked against the 1.5.12.7 scripts:
  //   - Small Physical Ranged (missile) projectiles upgrade to Heavy Physical Ranged (boulder,
  //     gunpowder), bypassing Missile Immunity — applied here so all downstream logic treats
  //     the attack as a boulder (original 1.5.4.1 effect, still in the helptext).
  //   - Physical ranged or thrown attack gains Armor Piercing, unless the unit has a Doom
  //     attack — Armor Piercing is wasted on Doom (it already ignores armor), so it gets +2
  //     ranged/thrown strength instead (patch 1.5.9.5). Folded in below.
  //   - Fire Breath attack: +4 strength (patch 1.5.7.4, up from the original +2).
  //   - +1 Poison: boosts an existing poison attack, or grants Poison 1 if it has none.
  // Military Workshop and Rocketry are alternative causes of the same permanent
  // Blackpowder upgrade. The source scripts grant it only to normal units that
  // actually have physical ranged, Thrown, or Fire Breath.
  const blackpowderSource = isWarlord
    && (!!abilities.militaryWorkshop || !!abilities.rocketry);
  const modernBaseAttacks = input.modernAttacks && !input._modernChannelPass
    ? input.modernAttacks : null;
  const modernBaseHasBlackpowderChannel = modernBaseAttacks && Object.values(modernBaseAttacks)
    .some(attack => attack && attack.strength > 0
      && ['missile', 'boulder', 'thrown', 'fire'].includes(attack.type));
  const modernBaseHasPhysicalBlackpowderChannel = modernBaseAttacks
    && Object.values(modernBaseAttacks).some(attack => attack && attack.strength > 0
      && ['missile', 'boulder', 'thrown'].includes(attack.type));
  const selectedBaseHasBlackpowderChannel = (parseInt(input.rtb) || 0) > 0
    && (permanentRangedType === 'missile' || permanentRangedType === 'boulder'
      || permanentThrownType === 'thrown' || permanentThrownType === 'fire');
  const selectedBaseHasPhysicalBlackpowderChannel = (parseInt(input.rtb) || 0) > 0
    && (permanentRangedType === 'missile' || permanentRangedType === 'boulder'
      || permanentThrownType === 'thrown');
  const blackpowderEligibleAttack = modernBaseAttacks
    ? modernBaseHasBlackpowderChannel : selectedBaseHasBlackpowderChannel;
  // CreateUnit.CAS makes this permanent training decision before any later combat-time
  // identity conversion. A base-normal unit remains eligible after Chaos Channels/Sanctify,
  // while a base-Fantastic unit does not become eligible merely because Spirit Link clears its
  // live Fantastic flag.
  const baseNormalTrainingUnit = !isHero && !isFantasticBase;
  const blackpowder = blackpowderSource
    && baseNormalTrainingUnit && blackpowderEligibleAttack;
  const blackpowderPhysicalSource = blackpowder && (modernBaseAttacks
    ? modernBaseHasPhysicalBlackpowderChannel : selectedBaseHasPhysicalBlackpowderChannel);
  const blackpowderSelectedPhysicalRanged = blackpowder
    && (permanentRangedType === 'missile' || permanentRangedType === 'boulder');
  const blackpowderSelectedThrown = blackpowder && permanentThrownType === 'thrown';
  const blackpowderSelectedFireBreath = blackpowder && permanentThrownType === 'fire';
  if (blackpowderSelectedPhysicalRanged && permanentRangedType === 'missile') {
    rangedType = 'boulder';
  }

  // Bombs&Grenades can coexist with another ranged/breath attack in the game.
  // The calculator's single RTB slot represents it directly when that slot is
  // empty, and adds it normally when the selected attack is already Thrown.
  const explosiveEligible = isWarlord && !!abilities.explosive
    && (!isFantasticLive || !!abilities.sapiens);
  const bombsGrenades = explosiveEligible
    && ((parseInt(input.atk) || 0) > 0 || !!abilities.flying);
  if (bombsGrenades && rangedType === 'none' && thrownType === 'none') {
    thrownType = 'thrown';
  }

  const baseDoomGazeWithBlazingEyes = blazingEyesDoomGazeForUnit(abilities, unitTypeVal, version);

  // Chaos Channels (Fire Breath option): version-sensitive strength and admission.
  // Apply_Chaos_Channels reads the DOS unit type's signed base ranged value and shared attack
  // type before choosing the mutation. MoM 1.31 admits values <= 3; CP 1.60 and CoM 1 admit
  // only values <= 0. Every DOS build additionally requires type None or Thrown, so Gaze and
  // either Breath type cannot coexist with a Chaos Channels Fire Breath in the shared slot.
  // Once admitted, BU_Apply_Specials assigns strength 2 in both MoM builds and 4 in CoM 1.
  // CoM2/Warlord instead have independent channels and add 4 to Fire Breath.
  const ccFireBreathAbil = !!abilities.ccFireBreath;
  const hasGazeAttack = gazeType !== 'none'
    || abilities.stoningGaze != null
    || abilities.deathGaze != null
    || baseDoomGazeWithBlazingEyes > 0;
  // Chaos Channels *adds* a Fire Breath; it never removes another attack. `Caster.exe`
  // $00599EE8-$00599FA8 writes only `firebreath += 4`, `race := RCChaos` and `Fantastic`,
  // and Warlord's `UnitCalc.CAS:40` touches only `SFireBreath` — neither clears a gaze,
  // thrown or lightning breath. The CoM2 manual says the same in words: it "can still add
  // Fire Breath to units that have Thrown, Gaze or Lightning Breath". So the modern engines,
  // whose attack channels are independent fields, impose no coexistence restriction at all.
  // The DOS engines keep theirs because one shared `.ranged` slot cannot hold two attacks.
  const ccIndependentChannels = version.startsWith('com2');
  const ccDosBaseRanged = Number.parseInt(input.rtb, 10) || 0;
  const ccDosBaseRangedMax = version === 'mom_1.31' ? 3 : 0;
  const ccDosBreathEligible = (rtbTypeRaw === 'none' || rtbTypeRaw === 'thrown')
    && !hasGazeAttack && ccDosBaseRanged <= ccDosBaseRangedMax;
  const ccFireBreathGranted = ccFireBreathAbil
    && (ccIndependentChannels || ccDosBreathEligible);
  // Only the Fire Breath channel takes the grant; without this the shared-slot write would
  // land in whichever channel is being derived and overwrite it.
  const ccOwnsThisPass = !input._modernChannelKey || input._modernChannelKey === 'fireBreath';
  const ccFireBreathStrength = version.startsWith('com') ? 4 : 2;
  const ccFireBreathActive = ccFireBreathGranted
    && (ccIndependentChannels ? rangedType === 'none' : ccDosBreathEligible);

  // Channel types immediately before the Altar of Storm write. Military Workshop has already
  // converted a missile projectile; Lightning Blade remains an explicit later base step.
  const baseSequenceRangedType = rangedType;
  const baseSequenceThrownType = thrownType;

  // Lightning Blade (Warlord): the Altar of Storm writes Lightning Breath = Thrown + 1, then
  // clears Thrown. Without Thrown it assigns strength 1 even beside another independent attack;
  // with Thrown it preserves that channel's earlier permanent bonuses and adds one. The resulting
  // Lightning Breath is innate and gains veterancy level bonuses.
  const lightningBladeAbil = version.startsWith('com2_warlord') && !!abilities.lightningBlade
    && baseNormalTrainingUnit;
  const lightningBladeOwnsThisPass = input._modernChannelPass
    ? input._modernChannelKey === 'thrown' || input._modernChannelKey === 'lightningBreath'
    : !input.modernAttacks && rangedType === 'none';
  // Without a Thrown source the assignment creates strength 1; an existing Lightning Breath is
  // overwritten. Modern parent derivations seed this independent channel beside Ranged/Fire.
  const lightningBladeGrantsBreath = lightningBladeAbil
    && lightningBladeOwnsThisPass && permanentThrownType !== 'thrown';
  const lightningBladeConvertsThrown = lightningBladeAbil
    && lightningBladeOwnsThisPass && permanentThrownType === 'thrown';
  if (lightningBladeConvertsThrown) {
    thrownType = 'lightning';
  } else if (lightningBladeGrantsBreath) {
    thrownType = 'lightning';
  }
  // These are the actual channel types at the permanent-record boundary. Chaos Channels
  // Fire Breath is a later region-a calculated-record write and must not be baked into this
  // seed merely because the UI still projects one secondary attack at a time.
  if (ccFireBreathActive && ccOwnsThisPass) {
    rangedType = 'none';
    thrownType = 'fire';
  }

  // Base values from inputs
  const baseFigs = Math.max(1, parseInt(input.figs) || 1);
  const inputBaseAtk = Math.max(0, parseInt(input.atk) || 0);
  const inputBaseRtb = Math.max(0, parseInt(input.rtb) || 0);
  const inputBaseDef = Math.max(0, parseInt(input.def) || 0);
  const inputBaseRes = Math.max(0, parseInt(input.res) || 0);
  const inputBaseHP  = Math.max(1, parseInt(input.hp) || 1);
  // CreateUnit.CAS city/resource gates read the permanent unit record before later
  // enchantment-driven channel conversions can create or replace an attack.
  const hasPermanentRangedStat = inputBaseRtb > 0 && RANGED_TYPES.includes(rtbTypeRaw);
  // Alumni of Academy is a permanent +2-figure write made when a unit is trained.
  // Academy is Halfling-only, so the UI condition is race-gated. The script admits
  // Halfling Rocs (type 221, their Fantastic Stable unit) unconditionally; its other
  // branch requires an innate magical ranged attack and rejects Mechanical units.
  const alumniOfAcademy = isWarlord && !!abilities.alumniOfAcademy
    && unitRace === 'Halfling' && !isHero
    && (unitName.endsWith('Rocs')
      || (!abilities.mechanical && inputBaseRtb > 0
        && (rtbTypeRaw === 'magic_c' || rtbTypeRaw === 'magic_n' || rtbTypeRaw === 'magic_s')));
  // Some permanent/base-record writes execute before the main scratch-record sequence. Keep
  // them as individual trace events at those execution sites: `stat:base` then becomes only a
  // seed of the prepared record, never a catch-all attribution for the sources which prepared it.
  const basePreparationTrace = [];
  let basePreparationOrder = 0;
  const traceBasePreparation = (id, sourceLabel, before, after) => {
    const changes = {};
    for (const field of Object.keys(after)) {
      if (before[field] === after[field]) continue;
      const from = before[field];
      const to = after[field];
      changes[field] = (typeof from === 'number' && typeof to === 'number')
        ? { from, to, delta: to - from }
        : { from, to };
    }
    if (Object.keys(changes).length === 0) return;
    basePreparationTrace.push({
      id,
      source: { id, label: sourceLabel },
      phase: 'base',
      order: basePreparationOrder++,
      changes,
    });
  };

  let calcBaseAtk = inputBaseAtk;
  let calcBaseRtb = inputBaseRtb;
  let calcBaseDef = inputBaseDef;
  let calcBaseRes = inputBaseRes;
  let calcBaseHP = inputBaseHP;
  // `Caster.exe` $00599F3E is `add 4 to U.firebreath`, not an assignment, and it is the same
  // routine for CoM2 and Warlord — there is no version split to model. The DOS engines still
  // assign, because the value lands in the one shared `.ranged` slot rather than a field of
  // its own, which is the same reason they exclude ranged units from the mutation.
  // Energy Cannon is a permanent overland conversion to projectile type Beam
  // with ranged Doom damage. The script gates it on persistent Max Ammo > 0, but every
  // shipped Warlord conventional-ranged unit has positive Max Ammo and every Mechanical
  // zero-ammo unit lacks conventional Ranged. The one-round calculator therefore infers
  // that gate from the permanent conventional-ranged snapshot and imports no ammo field.
  // Its +50% write is added to the base phase below, after the earlier permanent ranged
  // writes it reads have been assembled.
  const energyCannon = isWarlord && !!abilities.energyBeamWeapons
    && !!abilities.powerEngine && hasPermanentRangedStat;
  const energyCannonOwnsThisPass = !input._modernChannelPass
    || input._modernChannelKey === 'ranged';
  if (energyCannon && energyCannonOwnsThisPass) {
    rangedType = 'beam';
  }
  const baseToHitMod = parseInt(input.toHitMod) || 0;
  const baseToHitRtbMod = parseInt(input.toHitRtbMod) || 0;
  const baseToBlkMod = parseInt(input.toBlkMod) || 0;

  // Preserve the attack types standing immediately before Focus Magic conversion for earlier
  // Warlord permanent and phase-b gates.
  const rangedTypeBeforeFocus = rangedType;
  const thrownTypeBeforeFocus = thrownType;

  // Focus Magic: CoM/CoM2-only. In CoM2, magical ranged, doom gaze, and breath get +3.
  // In CoM, doom gaze is not mentioned, so only magical ranged and breath are boosted.
  // Otherwise, a thrown or physical ranged (missile/boulder) attack is converted
  // into Sorcery magical ranged, with a minimum strength of 3. If nothing qualifies,
  // the unit gains strength-3 Sorcery magical ranged. (All versions convert boulder:
  // CoM1 lists "missile", Warlord lists "Physical Ranged" — boulder is physical ranged.)
  const isCoM2 = version.startsWith('com2');
  // CoM 1 (the DOS build). Kept distinct from `isCoM2` wherever a mechanic is settled for
  // one engine and open for the other — see the Warp Creature block and the gaze ladder.
  const focusMagicActive = !!(abilities && abilities.focusMagic) && version.startsWith('com');
  const focusMagicBaseRangedPresent = input._modernChannelPass
    ? !!input._modernBaseHasRanged
    : inputBaseRtb > 0 && RANGED_TYPES.includes(rtbTypeRaw);
  const focusMagicRangedBranchOwner = input._focusMagicRangedBranchOwner
    || input._modernChannelKey || null;
  const focusMagicOwnsRangedBranch = !input._modernChannelPass
    || (!input._skipFocusRangedBranch
      && input._modernChannelKey === focusMagicRangedBranchOwner);
  const preFocusRtbPositive = calcBaseRtb > 0
    || (ccFireBreathActive && ccOwnsThisPass)
    || marionetteRangedPass;
  const hasMagicRangedForFocus = preFocusRtbPositive
    && (rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam');
  const hasBreathForFocus = preFocusRtbPositive
    && (thrownType === 'fire' || thrownType === 'lightning');
  const hasDoomGazeForFocus = isCoM2 && baseDoomGazeWithBlazingEyes > 0;
  const focusMagicBuffsExisting = focusMagicActive
    && (hasMagicRangedForFocus || hasBreathForFocus || hasDoomGazeForFocus);
  const focusMagicConvertsThrown = focusMagicActive && focusMagicOwnsRangedBranch
    && !focusMagicBaseRangedPresent && (preFocusRtbPositive || bombsGrenades)
    && thrownType === 'thrown';
  const focusMagicConvertsRanged = focusMagicActive && focusMagicOwnsRangedBranch
    && preFocusRtbPositive && (rangedType === 'missile' || rangedType === 'boulder');
  const focusMagicCreatesRanged = focusMagicActive && focusMagicOwnsRangedBranch
    && !focusMagicBaseRangedPresent && !focusMagicConvertsThrown
    && thrownType === 'none';
  if (focusMagicConvertsThrown || focusMagicConvertsRanged || focusMagicCreatesRanged) {
    rangedType = 'magic_s';
    thrownType = 'none';
  }

  // Warlord Vampirism reads all three independent source fields at one region-d position.
  // Probe each modern channel through the preceding ordered transforms, then give every final
  // channel pass the one coordinated melee transfer. This preserves both the script's combined
  // truncation and Shadow Strike's later read of the transferred melee value.
  const vampirismActive = !!(abilities && abilities.vampirism) && version.startsWith('com2_warlord');
  let vampirismAggregateTransfer = Number.isInteger(input._vampirismAggregateTransfer)
    ? input._vampirismAggregateTransfer : null;
  if (vampirismActive && input.modernAttacks && !input._modernChannelPass) {
    const probeInputs = { ...input.modernAttacks };
    const probeBaseHasRanged = !!(probeInputs.ranged && probeInputs.ranged.strength > 0);
    const probeBaseHasThrown = !!(probeInputs.thrown && probeInputs.thrown.strength > 0);
    const probeFocusOwner = probeBaseHasRanged ? 'ranged'
      : (probeBaseHasThrown || bombsGrenades) ? 'thrown' : 'ranged';
    if (bombsGrenades && !probeInputs.thrown) {
      probeInputs.thrown = { strength: 0, type: 'thrown' };
    }
    if (ccFireBreathGranted && !probeInputs.fireBreath) {
      probeInputs.fireBreath = { strength: 0, type: 'none' };
    }
    if (warlordCombatFlameBlade && !probeInputs.fireBreath) {
      probeInputs.fireBreath = { strength: 0, type: 'fire' };
    }
    if (dragonMound && !probeInputs.fireBreath) {
      probeInputs.fireBreath = { strength: 0, type: 'fire' };
    }
    if (lightningBladeAbil) {
      if (probeBaseHasThrown) delete probeInputs.lightningBreath;
      else probeInputs.lightningBreath = { strength: 0, type: 'none' };
    }
    let sourceStrength = 0;
    for (const [key, attack] of Object.entries(probeInputs)) {
      if (!attack || !['thrown', 'fireBreath', 'lightningBreath'].includes(key)) continue;
      const probe = deriveUnitStats({
        ...input,
        modernAttacks: null,
        _modernChannelPass: true,
        _modernChannelKey: key,
        _modernBaseHasRanged: probeBaseHasRanged,
        _focusMagicRangedBranchOwner: probeFocusOwner,
        _vampirismProbe: true,
        _deferShadowStrike: true,
        rtb: attack.strength,
        rtbType: attack.type,
      });
      sourceStrength += probe._vampirismSourceStrength || 0;
    }
    vampirismAggregateTransfer = Math.trunc(sourceStrength / 2);
  }

  // Warlord Shadow Strike: adds a Thrown attack at 1 + 1/3 of live melee strength (truncated).
  // A unit that already has a Thrown attack instead gains the same amount. It executes after
  // Colossal Strength and Vampirism, so both earlier live melee writes feed it; the leading +1
  // creates Thrown even at zero melee. Because Thrown is a separate pre-melee
  // phase, per-hit riders (Poison, Life Steal, Blood Sucker) fire on both the thrown and the
  // melee phase — that double trigger falls out naturally from the granted thrown phase.
  // Modern child passes retain it independently beside conventional ranged and Breath fields.
  const shadowStrikeActive = !!(abilities && abilities.shadowStrike) && version.startsWith('com2_warlord');
  const shadowStrikeOwnsThisPass = !input._modernChannelKey
    || input._modernChannelKey === 'thrown';
  const shadowStrikeApplies = shadowStrikeActive && shadowStrikeOwnsThisPass
    && !input._deferShadowStrike
    && (input._modernChannelPass || thrownType === 'thrown'
      || (thrownType === 'none' && rangedType === 'none'));
  if (shadowStrikeApplies) {
    rangedType = 'none';
    thrownType = 'thrown';
  }

  // Warlord Blaze of Glory: the unit's Ranged attack (missile/boulder/magic) becomes a Thrown
  // attack of the same strength (it loses the Ranged attack and Ammo, neither of which the model
  // tracks separately). Breath and existing thrown attacks are not "Ranged" and are untouched.
  // The Armor→Melee transfer, Armor Piercing grant, and First Strike loss are handled below.
  // Blaze of Glory targets a friendly non-hero unit (normal or fantastic); heroes are exempt.
  const blazeOfGloryActive = !!(abilities && abilities.blazeOfGlory)
    && version.startsWith('com2_warlord') && !isHero;
  if (blazeOfGloryActive && calcBaseRtb > 0
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam')) {
    rangedType = 'none';
    thrownType = 'thrown';
  }

  // Blackpowder-derived bonuses (see the Military Workshop / Rocketry gate above).
  // Its strength/AP predicates read the permanent source fields and survive later channel
  // conversions. The missile-to-boulder projectile upgrade was already applied above.
  const blackpowderHasRangedOrThrown = blackpowder
    && (blackpowderSelectedPhysicalRanged || blackpowderSelectedThrown);
  // Doom attack: Armor Piercing is wasted (Doom ignores armor), so grant strength instead.
  const blackpowderGrantsAP = blackpowderPhysicalSource
    && !abilities.doom && !abilities.armorPiercing;
  const blackpowderRtbMod = blackpowderHasRangedOrThrown
    && (!!abilities.doom || !!abilities.armorPiercing)
    ? (blackpowderSelectedThrown ? 4 : 2)
    : 0;
  // Fire Breath: +4 strength.
  const blackpowderFireBreathRtbMod = blackpowderSelectedFireBreath ? 4 : 0;
  // +1 Poison, applied on top of any existing poison (including the Gnoll Altar grants below).
  const blackpowderBasePoison = altarHunter ? 2 : (altarWitchdoctor ? 0 : (abilities.poison || 0));

  // Warlord Venom enchantment: +1 Poison (boosting any existing/granted poison, or granting
  // Poison 1 if the unit has none) plus Poison Immunity. The base it boosts mirrors the final
  // poison precedence of the spreads below (last-wins: motherFungus > militaryWorkshop > altars).
  const venom = version.startsWith('com2_warlord') && !!(abilities && abilities.venom);
  const venomBasePoison =
      motherFungus ? (abilities.poison || 0) + 1
    : blackpowder ? blackpowderBasePoison + 1
    : altarWitchdoctor ? 0
    : altarHunter ? 2
    : (abilities.poison || 0);

  const rangedGetsWpn = (rangedType === 'missile' || rangedType === 'boulder');
  const thrownGetsWpn = (thrownType === 'thrown');

  // Per-card wall position. Combat resolution admits this bonus only when the incoming
  // attacker is outside; card A/B exchange role and persistent army ownership are irrelevant.
  const cwVal = String(input.cityWalls || 'none');
  const cityWallBonus = cwVal === '3' ? 3 : (cwVal === '1' ? 1 : 0);

  // Node Aura bonus: +2 atk, +2 rtb, +2 def, +2 res for matching Fantastic units.
  // Effective combat type is resolved through the shared precedence helper.
  const supremeLightEligible = supremeLightActiveForUnit(abilities, unitTypeVal, version, {
    liveRangedType: rangedType,
    baseRangedType: rtbTypeRaw,
  });
  const survivalInstinctEligible = survivalInstinctActiveForUnit(abilities, unitTypeVal, version);
  const landLinkingEligible = landLinkingActiveForUnit(abilities, unitTypeVal, version);
  const innerPowerEligible = innerPowerActiveForUnit(abilities, version);
  const misleadEligible = misleadActiveForUnit(abilities, identity.fantastic, version);
  const effectiveAbilities = {
    ...abilities,
    ...(altarOfTheMoon ? { rage: true, poisonImmunity: true } : {}),
    ...(altarHunter ? { poison: 2 } : {}),
    ...(altarWitchdoctor ? { lifeSteal: -1, poison: 0 } : {}),
    ...(blackpowderGrantsAP ? { armorPiercing: true } : {}),
    ...(blazeOfGloryActive ? { armorPiercing: true, firstStrike: false } : {}),
    ...(blackpowder ? { poison: blackpowderBasePoison + 1 } : {}),
    ...(blackpowder ? { blackpowder: true } : {}),
    ...(bombsGrenades ? { wallCrusher: true } : {}),
    ...(energyCannon ? { energyCannon: true } : {}),
    ...(motherFungus ? { poison: (abilities.poison || 0) + 1 } : {}),
    ...(venom ? { poison: venomBasePoison + 1, poisonImmunity: true } : {}),
    // Rust on a fantastic creature is inert: drop it so the -3 melee in combat.js (which
    // can't see unit type) and any downstream reads treat the unit as un-rusted.
    ...((abilities && abilities.rust && !rustActive) ? { rust: false } : {}),
    ...((abilities && (abilities.trueSight || abilities.eyeOfHeaven)) ? { illusionImmunity: true } : {}),
    unitType: unitTypeVal,
    baseRace: identity.baseRace,
    baseFantastic: identity.baseFantastic,
    liveRace: identity.race,
    liveFantastic: identity.fantastic,
    mechanical: effectiveMechanical,
    doomGaze: baseDoomGazeWithBlazingEyes,
    innerPower: innerPowerEligible ? abilities.innerPower : false,
    mislead: misleadEligible ? abilities.mislead : false,
    supernatural: ((abilities && abilities.supernatural) || destinyActive),
    supremeLight: supremeLightEligible ? abilities.supremeLight : false,
    survivalInstinct: survivalInstinctEligible ? abilities.survivalInstinct : false,
    landLinking: landLinkingEligible ? abilities.landLinking : false,
  };
  // One step per ability or enchantment that writes a stat, at the position its engine region
  // gives it (combat.js, getAbilityStatSteps). Partitioned by phase in one pass so each group
  // can be spliced into the sequence below where that region runs.
  const abilSteps = getAbilityStatSteps(effectiveAbilities, version, {
    baseFantastic: identity.baseFantastic,
    liveFantastic: identity.fantastic,
    combatSummoned: !!effectiveAbilities.combatSummoned,
  }).map(step => {
    if (step.id !== 'rust') return step;
    const legacyApply = step.apply;
    return {
      ...step,
      writes: ['atk', 'rtb', 'thrownType'],
      when: () => rustActive,
      apply: (u, context) => {
        legacyApply(u, context);
        rustRangedStep.apply(u, context);
        if (u.thrownType === 'thrown') u.thrownType = 'none';
      },
    };
  });
  // `cAfterWarp` is a second splice point inside region c, for the effects the engine writes
  // after its Warp Creature block — Tactician in every CoM engine, plus Supreme Light in CoM 1.
  const abilByPhase = {
    base: [], a: [], b: [], cBeforeHolyArmor: [], c: [], cAfterWarp: [], d: [], e: [],
  };
  for (const step of abilSteps) {
    const group = step.afterWarp ? 'cAfterWarp'
      : (step.beforeHolyArmor ? 'cBeforeHolyArmor' : step.phase);
    abilByPhase[group].push(step);
  }
  const nodeAuraVal = input.nodeAura;
  const unitRealm = realmOfUnitType(unitTypeVal, identity);
  const nodeAuraActive = unitRealm !== null && nodeAuraVal !== 'none' && unitRealm === nodeAuraVal;
  const modernChannelKey = input._modernChannelKey || null;
  const modernConventionalRangedPass = isCoM2 && (modernChannelKey
    ? modernChannelKey === 'ranged' : rangedType !== 'none');
  const modernRangedOrThrownPass = isCoM2 && (modernChannelKey
    ? modernChannelKey === 'ranged' || modernChannelKey === 'thrown'
    : rangedType !== 'none' || thrownType === 'thrown');
  // `applynodeaura` gates melee on persistent BaseUnits.attack, not on the live subtotal.
  // Its other attack gates read the live conventional Ranged and two Breath fields; Thrown
  // is an independent modern field and is absent from the complete helper body.
  const modernNodeBaseMeleePass = isCoM2 && calcBaseAtk > 0;
  const modernNodeSecondaryPass = isCoM2 && (modernChannelKey
    ? ['ranged', 'fireBreath', 'lightningBreath'].includes(modernChannelKey)
    : rangedType !== 'none' || ['fire', 'lightning'].includes(thrownType));
  const darkForceActive = isCoM2 && !!abilities.darkForce;
  // The compiled city/node package requires membership in the defending army. The card prefix
  // instead records who initiates this particular exchange, so the per-unit control carries the
  // army/location eligibility and must work from either card.
  const heavenlyLightActive = isCoM2 && !!abilities.heavenlyLight;
  const badMoonActive = isCoM2 && !!abilities.badMoon && !isFantasticBase;
  const goodMoonActive = isCoM2 && !!abilities.goodMoon && !isFantasticBase;
  const natureConjunctionActive = isCoM2 && !!abilities.natureConjunction
    && isFantasticBase;
  // Spell Ward is region-c logic. In Warlord it therefore reads the current
  // Fantastic flag before region-d Spirit Link can clear that flag.
  const spellWardActive = isCoM2 && fantasticAtModernEncMagicRule
    && abilities.spellWard && abilities.spellWard !== 'none'
    && abilities.spellWard === unitRealm;
  const realmWardActive = isCoM1 && identity.fantastic
    && abilities.realmWard && abilities.realmWard !== 'none'
    && abilities.realmWard === unitRealm;
  const com1AuraValue = key => isCoM1
    ? Math.max(0, parseInt(abilities[key], 10) || 0) : 0;
  const com1GuidingBeaconAura = com1AuraValue('guidingBeaconAura');
  const com1DivineBarrierAura = com1AuraValue('divineBarrierAura');
  const com1SoulLinkerAura = com1AuraValue('soulLinkerAura');
  const chaosSurgeCount = unitRealm === 'chaos'
    ? Math.max(0, parseInt(input.chaosSurge) || 0)
    : 0;
  const chaosSurgeMeleeBonus = chaosSurgeCount > 0
    ? (version.startsWith('mom') ? 2 : 3 + (chaosSurgeCount - 1))
    : 0;
  const chaosSurgeRtbBonus = chaosSurgeCount > 0
    ? (version.startsWith('mom') ? 2 : 1 + chaosSurgeCount)
    : 0;
  const chaosSurgeResBonus = chaosSurgeCount > 0 && version.startsWith('com') ? 1 + chaosSurgeCount : 0;

  // Darkness / True Light: +/- to atk (non-spell), def, res for Death/Life fantastic units.
  // Darkness: +Death, -Life. True Light: +Life, -Death. Both can be active.
  // True Light was removed in CoM 1 & 2; Darkness still exists in all versions.
  // Eternal Night is side-owned but makes Darkness global. CoM2 only doubles that
  // Darkness atk/def swing; CoM keeps the normal Darkness values.
  // Eternal Night also gives enemy non-Death units -1 resistance in CoM/CoM2.
  const legacyLightDarkVal = input.enchLightDark || 'none';
  const isCoMVersion = version.startsWith('com');
  const ownEternalNight = !!(abilities && abilities.eternalNight) || !!input.eternalNight;
  const enemyEternalNight = !!input.enemyEternalNight;
  const hasAnyEternalNight = ownEternalNight || enemyEternalNight;
  // Enemy Eye of Heaven strips this unit's gaze attacks (the opponent gains True Sight).
  const enemyEyeOfHeaven = !!input.enemyEyeOfHeaven;
  const hasDarkness = !!input.darkness || legacyLightDarkVal === 'darkness' || hasAnyEternalNight;
  // True Light was removed in CoM 1 & 2, but Warlord re-introduces it as a Life
  // common combat enchantment — so enable it for MoM (non-CoM) and Warlord only.
  const hasTrueLight = (!!input.trueLight || legacyLightDarkVal === 'trueLight') && (!isCoMVersion || isWarlord);
  // Modern Eternal Night sets the Death-package loop count to two. The Life branch is
  // outside that loop and still executes exactly once; DOS Darkness is never doubled.
  const darknessAtkDefMagnitude = hasDarkness
    ? (hasAnyEternalNight && isCoM2 && unitRealm === 'death' ? 2 : 1)
    : 0;
  const darknessResMagnitude = hasDarkness ? 1 : 0;
  const eternalNightEnemyResPenalty = enemyEternalNight && isCoMVersion && unitRealm !== 'death' ? -1 : 0;
  // Warlord Eternal Night ("Poor Vision"): enemy non-Death units suffer -2 to ranged
  // attack strength (missile/boulder and magic ranged). Thrown and breath are
  // short-range and not affected. (Per helptext: "-2 Ranged Attack power".)
  const warlordEternalNightActive = enemyEternalNight && isWarlord && unitRealm !== 'death';
  const eternalNightRtbMod = warlordEternalNightActive
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam') ? -2 : 0;
  let darknessAtkBonus = 0;
  let darknessDefBonus = 0;
  let darknessResBonus = 0;
  if (unitRealm === 'death') {
    darknessAtkBonus += darknessAtkDefMagnitude;
    darknessDefBonus += darknessAtkDefMagnitude;
    darknessResBonus += darknessResMagnitude;
  } else if (unitRealm === 'life') {
    darknessAtkBonus -= darknessAtkDefMagnitude;
    darknessDefBonus -= darknessAtkDefMagnitude;
    darknessResBonus -= darknessResMagnitude;
  }
  let trueLightAtkBonus = 0;
  let trueLightDefBonus = 0;
  let trueLightResBonus = 0;
  if (unitRealm === 'death') {
    trueLightAtkBonus = -1; trueLightDefBonus = -1; trueLightResBonus = -1;
  } else if (unitRealm === 'life') {
    trueLightAtkBonus = 1; trueLightDefBonus = 1; trueLightResBonus = 1;
  }

  // Effective values (level + weapon + ability + node aura + darkness/light modifiers)
  // Lionheart: version-dependent HP bonus (+3 in MoM; floor(8/figs) in CoM/CoM2).
  // RTB bonus (+3) applies to non-magical ranged (missile/boulder) in all versions.
  // Thrown gets the bonus only in MoM; CoM/CoM2/Warlord drop the thrown bonus.
  const lionheartActive = !!(abilities && abilities.lionheart);
  const lionheartHpMod = lionheartActive
    ? (version.startsWith('mom') ? 3 : Math.floor(8 / baseFigs))
    : 0;
  const lionheartRtbMod = lionheartActive
    && (rangedType === 'missile' || rangedType === 'boulder'
        || (thrownType === 'thrown' && version.startsWith('mom'))) ? 3 : 0;
  // Endurance: CoM gives +2 defense; CoM2 instead gives +4 total HP split evenly
  // between figures, with a minimum of +1 HP per figure.
  const enduranceActive = !!(abilities && abilities.endurance);
  const enduranceDefMod = enduranceActive && version.startsWith('com_') ? 2 : 0;
  const enduranceHpMod = enduranceActive && version.startsWith('com2')
    ? Math.max(1, Math.floor(4 / baseFigs))
    : 0;

  const charmOfLifeActive = !!(abilities && abilities.charmOfLife);
  const levelRank = ({
    normal: 0,
    regular: 1,
    veteran: 2,
    elite: 3,
    ultra_elite: 4,
    champion: 5,
  })[level] || 0;
  const disciplineVal = version.startsWith('com2') ? ((abilities && abilities.discipline) || 'none') : 'none';
  const disciplineActive = disciplineVal === 'overland' || disciplineVal === 'combat';
  const combatDisciplineNegatesFirstStrike = disciplineVal === 'combat' && levelRank >= 3;
  const disciplineDefMod = disciplineActive ? (levelRank >= 1 ? 2 : 1) : 0;
  const disciplineAtkMod = disciplineActive && levelRank >= 2 ? 1 : 0;
  // Overland Discipline grants +1 movement at Elite+, but movement is not modeled here.
  const disciplineRangedType = isWarlord ? rangedTypeBeforeFocus : rangedType;
  const disciplineRtbMod = disciplineActive && levelRank >= 2
    && (disciplineRangedType === 'missile' || disciplineRangedType === 'boulder') ? 1 : 0;

  // Soul Flay (Warlord, Death rare combat curse): irresistible curse on normal units
  // or heroes. Penalises stats by −1 melee, −2 armor and −2 resistance per experience
  // level of the target. Experience level counts Recruit (the calculator's "normal") as
  // level 1, so the multiplier is levelRank + 1: Recruit −1/−2/−2, Elite −4/−8/−8.
  // Fantastic creatures are not valid targets and take no penalty.
  const soulFlayActive = version.startsWith('com2_warlord')
    && !!(abilities && abilities.soulFlay)
    && !isFantasticBase;
  const soulFlayLevels = soulFlayActive ? levelRank + 1 : 0;
  const soulFlayAtkMod = -1 * soulFlayLevels;
  const soulFlayDefMod = -2 * soulFlayLevels;
  const soulFlayResMod = -2 * soulFlayLevels;

  // Plague (Warlord combat curse): inflicted by the Pestilence city curse on defending
  // garrison units, by the Plague Lord unit ability, and by the Plague Lord artifact power.
  // −3 attack, −3 armor, −6 resistance and −10% To-Hit for the rest of combat, on any
  // affected unit (no fantastic exclusion). The To-Hit penalty is applied below.
  const plagueActive = version.startsWith('com2_warlord') && !!(abilities && abilities.plague);
  const plagueAtkMod = plagueActive ? -3 : 0;
  const plagueDefMod = plagueActive ? -3 : 0;
  const plagueResMod = plagueActive ? -6 : 0;

  // Pox Host (Warlord global combat debuff): a Goblin Poxbearer unit present on the
  // battlefield spreads Goblin Pox to every unit, with the effect varying by race.
  // Goblin units suffer −1 attack, −1 armor (no resistance penalty); non-Goblin units
  // suffer −3 attack, −3 armor, −1 resistance. No To-Hit penalty, unlike Plague. Per the
  // in-game helptext (GOBLIN POX spell and POX HOST UA), which lists no Goblin resistance
  // penalty and only −1 resistance for non-Goblins; the Warlord manual instead gives
  // −1/−3 resistance — a source disagreement resolved in favour of the helptext. Read from
  // the global toggle; the unit's race (empty on custom units) determines which branch applies.
  const poxHostActive = version.startsWith('com2_warlord') && !!input.poxHost;
  const poxHostIsGoblin = unitRace === 'Goblin';
  const goblinPoxAtkMod = poxHostActive ? (poxHostIsGoblin ? -1 : -3) : 0;
  const goblinPoxDefMod = poxHostActive ? (poxHostIsGoblin ? -1 : -3) : 0;
  const goblinPoxResMod = poxHostActive ? (poxHostIsGoblin ? 0 : -1) : 0;

  // Great Unbinding (Warlord Sorcery very rare global): debuffs opponent fantastic
  // creatures in combat with −20% To-Hit, −20% To-Defend and −2 Resistance for the
  // rest of battle. Only fantastic creatures are affected (the Confusion half of the
  // spell is not modelled here). The To-Hit/To-Defend penalties are applied in the
  // toHit/toBlock section below; here we handle the −2 Resistance.
  const greatUnbindingActive = version.startsWith('com2_warlord')
    && !!(abilities && abilities.greatUnbinding)
    && isFantasticBase;
  const greatUnbindingResMod = greatUnbindingActive ? -2 : 0;

  // Natural Selection (Warlord Nature common global): units trained in a city gain
  // bonuses from resources in the city's surroundings. The inputs expose each resource
  // separately on the trained unit:
  //   Coal → +1 melee; Iron → +1 armor; Wild game → +1 ranged attack (+ Forester);
  //   Nightshade → +1 resistance; Power minerals → +N resistance (the numeric input
  //   holds the resistance bonus directly). The Resistance resources are not independent:
  //   Nightshade's later snapshot-based write replaces the Power-mineral bonus.
  // Forester is a terrain/movement perk with no combat effect, so only the +1 ranged
  // attack from Wild game is reflected in the stats.
  const naturalSelectionEligible = isWarlord && !isFantasticBase && !isHero;
  const naturalSelectionCoalMod = naturalSelectionEligible && !!(abilities && abilities.coal) ? 1 : 0;
  const naturalSelectionIronMod = naturalSelectionEligible && !!(abilities && abilities.iron) ? 1 : 0;
  const naturalSelectionNightshadeCount = abilities && abilities.nightshade === true
    ? 1 : Math.max(0, parseInt(abilities && abilities.nightshade) || 0);
  const naturalSelectionNightshadeMod = naturalSelectionEligible
    ? naturalSelectionNightshadeCount : 0;
  // Nature Link (Warlord rename of Land Linking): grants +1 resistance to any unit
  // (normal or fantastic). The fantastic-only +2 melee/def/breath is handled with Land Linking.
  const natureLinkResMod = isWarlord && !!(abilities && abilities.landLinking) ? 1 : 0;
  const naturalSelectionPowerMineralsMod = naturalSelectionEligible
    ? Math.max(0, parseInt(abilities.powerMinerals) || 0)
    : 0;

  // Survival Instinct (Warlord addition): newly trained normal units gain a small
  // +3% to +7% To-Defend from gold-producing resources in the city's surroundings.
  // The numeric input holds that To-Defend percentage; applied to normal units only
  // (the fantastic-creature buff is the separate survivalInstinct checkbox).
  const survivalInstinctToBlkBonus = isWarlord && isNormalUnitType(unitTypeVal)
    ? Math.max(0, parseInt(abilities.survivalInstinctToBlock) || 0)
    : 0;

  // Orihalcon: +1 resistance, +2 magical ranged attack (CoM/CoM2).
  const orihalconActive = armor === 'orihalcon';
  const orihalconResMod = orihalconActive ? 1 : 0;
  const orihalconRangedType = isWarlord ? rangedTypeBeforeFocus : rangedType;
  const orihalconRtbMod = orihalconActive
    && (orihalconRangedType === 'magic_c' || orihalconRangedType === 'magic_n'
      || orihalconRangedType === 'magic_s' || orihalconRangedType === 'beam') ? 2 : 0;

  // Wall of Fire garrison boost (Warlord): the city enchantment grants +1 to all
  // defending normal-unit non-magic attacks, mirroring the original game's Metal
  // Fires. Modelled as a per-unit enchantment so it can apply to whichever side is
  // the garrison; gated to normal units only. Covers melee, physical ranged
  // (missile/boulder), and thrown — but not magic ranged or breath. Like Metal Fires
  // it also upgrades a normal weapon to magic (bypasses Weapon Immunity) — applied to
  // effectiveWeapon below. (The fire-line damage to attackers crossing the wall is the
  // separate global Wall of Fire toggle, handled in combat.js.)
  const wofDefenderBonusActive = isWarlord && !!(abilities && abilities.wallOfFireBoost)
    && isNormalUnitType(unitTypeVal);
  const wofDefenderAtkMod = wofDefenderBonusActive ? 1 : 0;
  const wofDefenderRtbMod = wofDefenderBonusActive
    && (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown') ? 1 : 0;

  // Metal Fires / Flame Blade: +1/+2 to missile and thrown rtb only (not boulder, magic).
  // Warlord Flame Blade / Fiery Blade (per in-game helptext): +2 to missile and thrown.
  // Combat-cast Flame Blade's +1 Fire Breath is a separate region-d script write below;
  // neither blade boosts boulder here.
  // Warlord Fiery Fury: +2 to missile, boulder, and thrown for regular units only;
  // bonuses (except boulder) do not stack with Flame Blade.
  // Flame Blade / Fiery Blade also upgrade the unit's normal weapon to magic (bypasses Weapon Immunity);
  // Fiery Fury does the same for regular units.
  const warlordFieryBlade = isWarlord && !!abilities.fieryBlade;
  const hasWarlordBlade = warlordCombatFlameBlade || warlordFieryBlade;
  const nonWarlordFlameBlade = !!abilities.flameBlade && !isWarlord;
  // Metal Fires checks the live Fantastic flag before applying its entire package: melee,
  // missile/Thrown strength, and the magic-weapon upgrade all share this eligibility gate.
  const metalFiresActive = !!abilities.metalFires && !identity.fantastic;
  const fbAtkBonus = (nonWarlordFlameBlade || hasWarlordBlade) ? 2 : (metalFiresActive ? 1 : 0);
  const ffRegularBonus = isWarlord && !!abilities.fieryFury && !isFantasticBase;
  // M4, resolved at R1 stage 9. The two sources fall in different regions — Fiery Fury in
  // `b` (UnitCalcPre.CAS:832-846), the blades in `c` — and do not stack, which the bucket
  // model could only express as a single `Math.max` booked whole to `c`. Two steps carry it
  // now: Fiery Fury writes its own bonus in `b`, and the blade step in `c` adds only the
  // excess, so the total is still the maximum of the two while each lands in its own region.
  // The split changes no number: the one later step that scales `rtb` inside a region,
  // Upgraded Explosive's fire-breath doubling at its UnitCalcPre position, is gated on
  // Fire Breath, which Fiery Fury's bonus never covers.
  let fbBladeRtb = 0;
  if (hasWarlordBlade) {
    if (rangedTypeBeforeFocus === 'missile' || thrownTypeBeforeFocus === 'thrown') fbBladeRtb = 2;
  } else if (fbAtkBonus > 0) {
    // MoM Flame Blade / Metal Fires boost missile and thrown; CoM Flame Blade
    // boosts missile only (the CoM helptext drops the thrown bonus — Warlord, handled
    // above, re-adds it). Metal Fires is MoM-only so the CoM gate only affects Flame Blade.
    const fbThrownEligible = !(nonWarlordFlameBlade && isCoMVersion);
    const flameBladeGateRangedType = isCoM1 ? rangedTypeBeforeFocus : rangedType;
    const flameBladeGateThrownType = isCoM1 ? thrownTypeBeforeFocus : thrownType;
    if (flameBladeGateRangedType === 'missile'
      || (fbThrownEligible && flameBladeGateThrownType === 'thrown')) {
      fbBladeRtb = fbAtkBonus;
    }
  }
  const ffRtbMod = ffRegularBonus
    && (rangedTypeBeforeFocus === 'missile' || rangedTypeBeforeFocus === 'boulder'
      || thrownTypeBeforeFocus === 'thrown') ? 2 : 0;
  const fbRtbMod = Math.max(0, fbBladeRtb - ffRtbMod);
  // Fiery Fury melee +3 for regular units; non-cumulative with Flame Blade / Fiery Blade
  // (combat.js already adds +3 melee for a Warlord blade effect).
  const ffMeleeBonus = ffRegularBonus && !hasWarlordBlade ? 3 : 0;

  const ludusAgogeAtkMod = ludusAgoge ? 1 : 0;
  const ludusAgogeRtbMod = ludusAgoge && hasPermanentRangedStat ? 1 : 0;
  const motherFungusAtkMod = motherFungus ? 2 : 0;
  const motherFungusRtbMod = motherFungus && hasPermanentRangedStat ? 2 : 0;
  const altarOfTheSunMeleeMod = altarOfTheSunHolyMother ? 1 : 0;
  // Warlord Colossal Strength: +1 + 40% (rounded down) of Melee, Physical Ranged, and
  // Thrown attack strength. Breath and magic ranged are not "physical ranged" and do not
  // qualify.
  //
  // UnitCalc.CAS:1227-1243 computes `1 + %I(GetStat(U,SAttack,0)*4/10)` from the attack as
  // it stands in phase d — not from the base — so the bonus scales everything phases a-c
  // applied, plus the phase-d terms that precede it in the file: Rust (:500-512), Focus
  // Magic (:83, :515) and Weakness's breath penalty (:317-323). Those are every phase-d
  // term the calculator models. As a step it simply reads `u.atk` / `u.rtb` at the end of
  // region `d`, which is that subtotal by construction.
  const bombsGrenadesRtbMod = bombsGrenades && thrownTypeBeforeFocus === 'thrown'
    ? Math.max(0, Math.floor(8 - baseFigs / 2))
    : 0;
  const colossalStrength = isWarlord && !!(abilities && abilities.colossalStrength);
  // Stats are never negative in the engine, so a subtotal driven below zero scales as zero.
  const colossalScaled = (subtotal) => 1 + Math.floor(0.4 * Math.max(0, subtotal));
  const dragonMoundDefMod = dragonMound ? 1 : 0;
  const poolOfRepentanceDefMod = poolOfRepentance ? 1 : 0;
  const holyArmorActive = !!(abilities && abilities.holyArmor);
  // Altar of the Moon: trained units gain +1 Resistance (all units, not just ranged).
  const altarOfTheMoonResMod = altarOfTheMoon ? 1 : 0;
  const ludusAgogeResMod = ludusAgoge ? 1 : 0;
  const poolOfRepentanceResMod = poolOfRepentance ? 1 : 0;
  const sanctaBasilicaResMod = sanctaBasilica ? 3 : 0;
  // Pillar of Faith (Warlord, Life rare city enchantment): +1 Resistance per qualifying
  // building in the training city. The script has no cap; the numeric input holds the count.
  const pillarOfFaithResMod = isWarlord && !isFantasticBase && !isHero
    ? Math.max(0, parseInt(abilities.pillarOfFaithRes) || 0)
    : 0;
  // Warlord scoring options run in UnitCalcPre.CAS (phase b). Uphill Battle is
  // represented per unit so the caller can mark whichever side is AI-controlled.
  // Gods Play Dices records the already-rolled combat modifier rather than rolling
  // or mixing it into the damage distribution.
  const uphillBattleActive = isWarlord && !!(abilities && abilities.uphillBattle);
  const godsPlayDicesResMod = isWarlord
    ? Math.max(-2, Math.min(2, parseInt(abilities.godsPlayDices) || 0))
    : 0;
  // Berserk: two distinct mechanics, modelled as separate abilities.
  // 'berserk' (MoM Death spell, UI-gated to MoM versions): doubles melee attack
  // (applied last, after all other bonuses) and sets defense to 0 absolutely (no
  // other bonus can raise it while Berserk is active). Removed in CoM/CoM2.
  // 'berserkWarlord' (Warlord Troll Medicineman buff, UI-gated to Warlord): +15% To
  // Hit, +1 combat movement (irrelevant here), and -10% To Block. No atk-doubling
  // and no def-zeroing.
  const classicBerserk = !!(abilities && abilities.berserk) && version.startsWith('mom');
  const warlordBerserk = !!(abilities && abilities.berserkWarlord) && isWarlord;
  // A unit whose base melee strength is 0 has no melee attack at all, so melee bonuses are
  // discarded rather than conjuring one. Blaze of Glory is the exception the model has to
  // allow for: its armor-to-melee transfer lands even on such a unit. The ranged slot has
  // the same gate, widened by Bombs&Grenades, which grants a thrown attack outright.
  // Warlord True Light writes SAttack unconditionally. A matching Life unit therefore gains
  // strength-1 melee even when the persistent attack field was zero; unlike an ordinary
  // attack bonus, this source-backed write creates the live attack.
  const trueLightCreatesMelee = isWarlord && hasTrueLight && trueLightAtkBonus > 0;
  const hasMeleeAttack = calcBaseAtk > 0 || marionetteAttackBonus > 0 || trueLightCreatesMelee;
  const rtbStatActive = calcBaseRtb > 0 || bombsGrenadesRtbMod > 0
    || marionetteRangedPass || (ccFireBreathActive && ccOwnsThisPass)
    || focusMagicCreatesRanged || shadowStrikeApplies
    || lightningBladeConvertsThrown || lightningBladeGrantsBreath
    || (warlordCombatFlameBlade && modernChannelKey === 'fireBreath')
    || (dragonMound && modernChannelKey === 'fireBreath');

  const ludusAgogeHpMod = ludusAgoge ? 1 : 0;

  // Blazing March: +3 to missile only (not boulder, magic ranged, or breath).
  // Warlord also boosts thrown.
  const blazingMarchActive = !!(abilities && abilities.blazingMarch);
  const blazingMarchRangedType = isWarlord ? rangedTypeBeforeFocus : rangedType;
  const blazingMarchThrownType = isWarlord ? thrownTypeBeforeFocus : thrownType;
  const blazingMarchBoostsThrown = isWarlord && blazingMarchThrownType === 'thrown';
  const blazingMarchRtbMod = blazingMarchActive
    && (blazingMarchRangedType === 'missile' || blazingMarchBoostsThrown) ? 3 : 0;

  // Natural Selection — Wild game snapshots the permanent conventional-ranged field
  // before any later conversion. Read the value at the source step and keep the channel
  // predicate separate so a converted Thrown field cannot stand in for the saved RNG field.
  const naturalSelectionWildGameRangedPass = input._modernChannelPass
    ? input._modernChannelKey === 'ranged'
    : RANGED_TYPES.includes(rtbTypeRaw);
  const naturalSelectionWildGameActive = naturalSelectionEligible
    && !!(abilities && abilities.wildGame) && naturalSelectionWildGameRangedPass;

  // Chaos Surge: affects Chaos creatures only.
  // MoM and CoM 1 both write the shared ranged slot unconditionally on attack type, so
  // the bonus reaches missile, boulder, magic ranged, thrown, breath and gaze alike.
  // Chaos Channels' granted Fire Breath is excluded in MoM only: the constructor runs
  // Chaos Surge *before* BU_Apply_Specials, whose CC block then assigns ranged = 2 over
  // the top. CoM 1 swapped that call order, so there the CC breath keeps the bonus.
  // CoM2/Warlord are a separate engine and keep the narrower helptext scope.
  // Reinforce Magic: +2 to magical ranged attack strength only.
  const reinforceMagicRtbMod = (abilities && abilities.reinforceMagic)
    && (rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam') ? 2 : 0;

  // Supreme Light: +2 to ranged attack strength (missile/boulder/magic ranged).
  // Source manuals say "+2 melee and ranged attack" — thrown and breath are not affected.
  const supremeLightRtbMod = supremeLightEligible
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam') ? 2 : 0;

  // Altar of the Moon: +2 to ranged attack strength (missile/boulder/magic ranged only;
  // thrown and breath are not affected), matching the "ranged units" wording.
  const altarOfTheMoonRtbMod = altarOfTheMoon && hasPermanentRangedStat ? 2 : 0;

  // CoM/CoM2 Land Linking boosts melee and breath only.
  const landLinkingBreathRtbMod = landLinkingEligible && version.startsWith('com')
    && (thrownType === 'fire' || thrownType === 'lightning') ? 2 : 0;

  // Dragon Mound (Warlord): unconditional +2 to the independent Fire Breath field.
  const dragonMoundRtbMod = dragonMound
    && (modernChannelKey ? modernChannelKey === 'fireBreath' : thrownType === 'fire') ? 2 : 0;

  // Giant Strength: +1 thrown only (not missile/boulder/magic ranged, not breath).
  const gsRtbMod = (abilities.giantStrength && thrownType === 'thrown') ? 1 : 0;

  // Weakness: -2 (MoM) or -3 (CoM/CoM2/Warlord) to ranged and thrown.
  // Which ranged types are hit differs by engine (WIZARDS.EXE 0x908FC / 0x9067F):
  //   MoM  — missile only (`ranged_type / 10 == 2`, i.e. Bow/Sling). Boulder and magic
  //          ranged are exempt, matching the Fandom page's "Other types of Ranged Attacks
  //          are not affected".
  //   CoM+ — every conventional ranged type (`ranged_type / 10 <= 3`: missile, boulder,
  //          magic), matching "melee, thrown and ranged attack strengths" in the CoM 1
  //          and CoM2 helptext.
  // Thrown is a separate test in both engines (`ranged_type == 100`); in MoM 1.31 that
  // test is written `ranged_type / 10 == 100`, which no int8 can satisfy, so thrown is
  // never reduced there. CP 1.60 nops the divide and the penalty starts applying.
  // Breath and gaze (`ranged_type >= 101`) are exempt in every binary; Warlord adds the
  // breath penalty on top in UnitCalc.CAS:309-315.
  // The three branches are mutually exclusive and fall in different phases: ranged and
  // thrown are binary (phase c), while the Warlord breath penalty is phase d. They are
  // kept as separate terms so each lands in the right accumulator; weaknessRtbMod
  // remains their sum for callers that want the total.
  const weaknessActive = !!(abilities && abilities.weakness);
  const weaknessPenalty = weaknessActive ? (isCoMVersion ? 3 : 2) : 0;
  const weaknessHitsRanged = isCoMVersion ? rangedType !== 'none' : rangedType === 'missile';
  const weaknessRtbModBinary = weaknessActive
    ? (weaknessHitsRanged ? -weaknessPenalty
      : (thrownType === 'thrown' && version !== 'mom_1.31' ? -weaknessPenalty : 0))
    : 0;
  const weaknessRtbModCas = weaknessActive && weaknessRtbModBinary === 0
    && (thrownType === 'fire' || thrownType === 'lightning') && version.startsWith('com2_warlord')
    ? -weaknessPenalty : 0;
  const weaknessRtbMod = weaknessRtbModBinary + weaknessRtbModCas;

  // Rust (Warlord Chaos common combat curse): -3 to Physical Ranged Attack (missile/boulder),
  // mirroring the -3 melee penalty applied in combat.js. Magic ranged, fire/lightning breath,
  // and thrown are excluded (thrown is eliminated entirely above).
  const rustRtbMod = (rustActive && (rangedType === 'missile' || rangedType === 'boulder')) ? -3 : 0;
  // The ranged subformula remains an internal part of Rust's one atomic engine write; it is not
  // inserted into the execution list as a second step.
  // PROVENANCE[rust:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:10:98745d26b4fbf74694b1a932
  const rustRangedStep = statStep({ id: 'rust:ranged', phase: 'd', writes: ['rtb'],
    when: () => rustActive, apply: u => { u.rtb += rustRtbMod; } });

  // Holy Weapon: +10% To Hit on melee, missile, and boulder attacks. Also applies to thrown
  // in all versions except MoM 1.31 (bug). Does NOT affect magic ranged, fire/lightning
  // breath, or gaze attacks. Also upgrades normal weapon to magic (bypasses Weapon Immunity).
  const hwActive = !!(abilities && abilities.holyWeapon);
  const hwMeleeToHit = hwActive ? 10 : 0;
  let hwRtbToHit = 0;
  if (hwActive) {
    if (rangedType === 'missile' || rangedType === 'boulder') hwRtbToHit = 10;
    else if (thrownType === 'thrown' && version !== 'mom_1.31') hwRtbToHit = 10;
  }
  // The DOS material body admits Missile, Boulder, and Thrown by type, without a
  // strength test. Caster.exe keeps the same no-strength gate for conventional
  // non-magical ranged, but requires the current independent Thrown field to be
  // positive. Focus Magic has already converted its source channel by this point.
  const rtbToHitWpn = wpn.toHit !== 0 && (rangedGetsWpn || thrownGetsWpn)
    ? wpn.toHit : 0;
  // Rust clears the persistent material flags before recalculation, so Heavenly Light sees the
  // post-Rust base material record rather than the pre-curse UI selection.
  const heavenlyLightMaterialTail = heavenlyLightActive
    && weapon === 'normal' && !isHero && !isFantasticBase;
  const heavenlyLightMeleeToHit = heavenlyLightMaterialTail && inputBaseAtk > 0 ? 10 : 0;
  const heavenlyLightRangedNonmagical = rangedType !== 'none'
    && !['magic_c', 'magic_n', 'magic_s', 'beam'].includes(rangedType);
  const heavenlyLightRtbToHit = heavenlyLightMaterialTail
    && ((modernConventionalRangedPass && heavenlyLightRangedNonmagical)
      || (modernChannelKey ? modernChannelKey === 'thrown' : thrownType === 'thrown')) ? 10 : 0;
  const outlanderToHitBonus = (abilities.outlanderXenoveterinary ? 10 : 0)
    + (abilities.outlanderRadio ? 10 : 0);
  const outlanderRtbToHitBonus = abilities.outlanderBallisticsTraining ? 20 : 0;
  const uphillBattlePct = uphillBattleActive ? 10 : 0;
  // True Sight writes only the conventional-ranged/Thrown/Breath channel modifier.
  const trueSightRtbToHitBonus = isWarlord
    && !!(abilities.trueSight || abilities.eyeOfHeaven) ? 5 : 0;
  const weaponUpgradedByHW = hwActive && weapon === 'normal';
  const wraithFormBypassesWI = weapon === 'normal'
    && version.startsWith('com')
    && !!(abilities && (abilities.wraithForm || abilities.rulerOfUnderworld));
  // Warlord Wall of Fire's defender bonus mirrors Metal Fires, which also upgrades
  // the unit's weapon to magic (bypasses Weapon Immunity) for its non-magic attacks.
  const weaponUpgradedByWoF = wofDefenderBonusActive && weapon === 'normal';
  // Note: Eldritch Weapon also upgrades a normal weapon to magic, but ONLY for the
  // melee attack (per the MoM Eldritch Weapon page). It is therefore NOT folded into
  // this global weapon type — it is applied to the melee Weapon-Immunity check only
  // (see meleeWeaponWI in combat.js). Its ranged/thrown attacks stay non-magical, so
  // Weapon Immunity still raises the target's defense against them.
  const weaponUpgradedByHeavenlyLight = heavenlyLightActive && weapon === 'normal';
  const effectiveWeapon = (fbAtkBonus > 0 && weapon === 'normal') ? 'magic'
    : (ffRegularBonus && weapon === 'normal') ? 'magic'
    : (weaponUpgradedByHW ? 'magic'
    : (wraithFormBypassesWI ? 'magic'
    : (weaponUpgradedByWoF ? 'magic'
    : (weaponUpgradedByHeavenlyLight ? 'magic'
    : weapon))));

  // ApplyAttack passes `EncMagic or magicranged` to EffectiveDefense. Keep EncMagic as
  // calculated state instead of approximating it later from weapon quality and final unit
  // type. Only the material grant made by ApplyMagicWeapons can be suppressed by an enemy
  // King/Ruler of Underworld. Independent EncMagic writes survive whether they occur before
  // that helper (hero standing and Warlord Wall of Fire) or after it.
  const modernEncMagicFromMaterial = version.startsWith('com2_') && weapon !== 'normal';
  const modernEncMagicIndependentOfMaterial = version.startsWith('com2_')
    && (isHero || fantasticAtModernEncMagicRule
      || nonWarlordFlameBlade || hasWarlordBlade || ffRegularBonus || hwActive
      || !!abilities.wraithForm || !!abilities.rulerOfUnderworld
      || !!abilities.blazingMarch || wofDefenderBonusActive || heavenlyLightActive);
  const modernEncMagic = modernEncMagicFromMaterial || modernEncMagicIndependentOfMaterial;

  // Ranged/Thrown/Breath strength
  let rtbLvl = 0, rtbWpn = 0;
  // ApplyLevelBonus runs before Focus Magic, so its channel dispatch must read the type
  // standing at that earlier point rather than the projected post-conversion type.
  if (rangedTypeBeforeFocus !== 'none') {
    rtbLvl = calcBaseRtb > 0 ? lvl.ranged : 0;
  } else if (thrownTypeBeforeFocus !== 'none') {
    rtbLvl = lvl.thrown;
  }
  if (rangedType !== 'none') {
    rtbWpn = (calcBaseRtb > 0 && rangedGetsWpn) ? wpn.atk : 0;
  } else if (thrownType !== 'none') {
    rtbWpn = (calcBaseRtb > 0 && thrownGetsWpn) ? wpn.atk : 0;
  }
  // rtb carries ranged, thrown AND breath (distinguished by rangedType/thrownType), so it is
  // also what Explosive's fire-breath doubling scales — that effect has no stat of its own.
  const upgradedExplosive = explosiveEligible && blackpowder;
  const upgradedExplosiveRangedMod = upgradedExplosive && rangedType !== 'none' ? 2 : 0;
  // CreateUnit.CAS applies Energy Cannon after Artificer, Blackpowder,
  // Altar of the Moon, and Natural Selection. The +50% therefore reads those
  // permanent ranged writes, but not later equipment or combat modifiers.
  // Hidden gaze ranged attack: affected by same modifiers as ranged (level, node aura,
  // darkness/light, ability mods) but NOT weapon bonuses. In v1.31, if reduced to 0 the
  // gaze attack does not fire.
  // Eye of Heaven is the only effect that switches a gaze off: `UnitCalc.CAS:1483` zeroes
  // `SStoningGaze`/`SDeathGaze`/`SDoomGaze` and nothing else in any source does.
  const gazeDisabled = enemyEyeOfHeaven;
  // A gaze's strength lives in the same `.ranged` slot Chaos Surge writes, so MoM and
  // CoM 1 boost all three DOS gaze types. CoM2/Warlord (separate engine) are left unchanged.
  // Level bonus to a gaze's strength, from the same shared `.ranged` slot. MoM's level
  // routine (0x8F881-0x8FB3E) has no `ranged_type` gate at all, so all DOS gaze types take
  // the full ranged ladder. CoM 1 replaced it with a table loop whose `.ranged` step is
  // skipped for `ranged_type >= 100` — thrown, breath and every gaze — on all rows but
  // Veteran (0x8FA9A-0x8FAAB); that is exactly the ladder's `thrown` column. CoM2 and
  // Warlord instead write none of their three independent gaze fields in ApplyLevelBonus.
  const gazeLvlMod = version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : 0;
  const doomGazeLvlMod = version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : 0;
  // CoM 1's Warp Attack halves the `.ranged` slot with no `ranged_type` test at all
  // (0x90764-0x90772), so it reaches a gaze's strength exactly as it reaches conventional
  // ranged, thrown and breath. Darkness lands after the halving, as it does for the ranged
  // stat below. MoM's Warp Attack touches melee only. CoM2/Warlord's separate gaze fields
  // are untouched by all three compiled Warp blocks (CoM2 analysis, *The Warp blocks*).
  const gazeWarpHalves = isCoM1 && !!(abilities && abilities.warpAttack);
  // The two gaze strengths live in the same `.ranged` slot as `rtb`, so they are fields of
  // the same record and are written by the same steps — with the narrower set of modifiers
  // a gaze takes: the ability lump, node aura, Darkness/True Light, Chaos Surge and their
  // own level ladder, but no weapon, no per-attack-type ranged bonus, and no Shatter.
  // Type 104 has no conventional component: Automatic Damage assigns `hits = attack_strength`
  // and jumps past both rolls (0x9A1E6 -> 0x9A204), so the one number is *delivered* rather
  // than rolled. Only 103 and 105 roll it. Counting both would double the gaze.
  const dosGazeStrength = !isCoM2 && gazeType !== 'none' && gazeType !== 'gaze_multiple'
    ? calcBaseRtb : 0;
  const baseGazeRanged = gazeDisabled ? 0 : dosGazeStrength;
  // DOS type 104 uses the shared strength as Doom Gaze damage. The modern engines instead
  // carry an independent Doom Gaze field.
  const baseDoomGaze = gazeDisabled ? 0
    : (!isCoM2 && gazeType === 'gaze_multiple' ? calcBaseRtb : (effectiveAbilities.doomGaze || 0));
  const focusMagicDoomGazeMod = focusMagicBuffsExisting && isCoM2 ? 3 : 0;

  // Psycho Force and Pneuma Field are the two Magitek effects that read Resistance rather than
  // writing it. Both are region `d` — UnitCalc.CAS:1413-1417 and :1419-1425 — so their gates are
  // resolved here and the reads happen at that position in the sequence below.
  const psychoForceActive = isWarlord && !!(abilities && abilities.psychoForce);
  const pneumaFieldActive = isWarlord && !!(abilities && abilities.pneumaField);
  const warpRealityActive = !!input.warpReality;
  const unitIsChaos = unitTypeVal === 'fantastic_chaos';
  const hurricaneActive = !!input.hurricane;
  const hurricaneRtbPenalty = (thrownType === 'fire' || thrownType === 'lightning') ? 0.3 : 0.2;
  const vertigoActive = !!(abilities && abilities.vertigo)
    && !(abilities && (abilities.illusionImmunity || abilities.magicImmunity));
  const vertigoHitPenalty = isCoM2 ? 0.25 : (isCoMVersion ? 0.3 : 0.2);
  const vertigoBlockPenalty = isCoM2 ? 0.07 : (isCoMVersion ? 0.1 : 0);
  const existingLifeSteal = effectiveAbilities.lifeSteal;

  // --- The stat sequence (R1) ---
  // One phase-tagged list over one mutable record — `res`, `def`, `atk`, `rtb`, `hp` and the
  // two gaze strengths, which share the engine's `.ranged` slot with `rtb`. Not a list per
  // stat: an effect the engine makes as a single write to several stats — Darkness, Blaze of
  // Glory, Warp — is one step here too, instead of being shredded across five places and
  // reassembled by a comment. See SPEC.md, *Stat derivation contract*.
  //
  // List order *is* execution order. Phase is the evidence for a step's position: which
  // region of the engine makes that write (steps.js, STEP_PHASES).
  //
  // Positions come from the region maps in *CoM2 analysis*, *Unit stat recalculation* and
  // *Resolution-time modifiers*, and from *MoM analysis*, *Warp Creature runs early*, for the
  // two DOS engines. Where the engines order an effect differently it appears twice, as
  // version-exclusive steps — that keeps both the runner and the list trivial and makes the
  // divergence visible instead of hidden in a condition. A step whose position is deduced
  // rather than read is marked `provisional`, and says from what.
  //
  // Within a region, order only has consequences where a step *reads* — the scaling effects
  // (Xenoveterinary, Upgraded Explosive, Colossal Strength, Energy Cannon, Blaze of Glory,
  // Supreme Light) and the Warps. Those are placed exactly; purely additive neighbours are in
  // the order their evidence lists them.
  // DOS applies material strength and chance before BU_Apply_Specials (and therefore before
  // CoM 1 Focus Magic). Modern Caster calls ApplyMagicWeapons later in region c. Reuse the same
  // atomic steps at those two version-exclusive splice points.
  // PROVENANCE[weapon]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:40:bc81a9f3b6ba3703d596d756 | Reference docs/DOS reconstructed/unitcalc.c@span:15:9b957c6ff1d6ae8d9afca04b | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:40:eae87788c081c49037f75656 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:2cc8f80e45e1482ee9229fd8 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:06ea8c358024e0163de78588 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
  const weaponStatSteps = [
    statStep({ id: 'weapon', phase: 'c', writes: ['def', 'atk', 'rtb'],
      apply: u => {
        u.def += wpn.def; u.atk += wpn.atk; u.rtb += rtbWpn;
      } }),
    // PROVENANCE[chance:weapon:melee]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:c4c0e22bb79483f8e5729dfb | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:40:8365c7617ed27a3bba5164a3 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
    statStep({ id: 'chance:weapon:melee', sourceId: 'weapon', sourceLabel: 'Weapon material',
      phase: 'c', writes: ['toHitMelee'],
      when: u => wpn.toHit !== 0
        && (isCoM2 ? inputBaseAtk > 0 : u.atk - wpn.atk > 0),
      apply: u => { u.toHitMelee += wpn.toHit; } }),
    // PROVENANCE[chance:weapon:rtb]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:34:beda653e161112c68e8cdff3 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:444355c621ef17cc85a05318 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:38:55a524751c4be78ffea17562 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:7171af67ce10b8422e044eff | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:7171af67ce10b8422e044eff
    statStep({ id: 'chance:weapon:rtb', sourceId: 'weapon', sourceLabel: 'Weapon material',
      phase: 'c', writes: ['toHitRtb'],
      when: u => rtbToHitWpn !== 0 && (!isCoM2 || !thrownGetsWpn || u.rtb > 0),
      apply: u => { u.toHitRtb += rtbToHitWpn; } }),
  ];

  // CoM 1's Flame Blade write precedes its later Focus Magic conversion/minimum. The other
  // versions keep the established compiled position after their earlier transforms.
  // PROVENANCE[flameBlade:ranged]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:15:f6e8770f05c1d997df898eec | Reference docs/DOS reconstructed/unitcalc.c@span:13:bf6a11bc7e2e0a1492be8f9a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:98daf6b1cfd836c4a184f151 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:3:a6c1282e7bba499b7b5ef5f3 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:d7cdec7c168e641613b36c19
  const flameBladeRangedStep = statStep({
    id: 'flameBlade:ranged', phase: 'c', writes: ['rtb'],
    apply: u => { u.rtb += fbRtbMod; },
  });

  // Warlord True Light is its own UnitCalcPre.CAS block (:1507-1540), after Rally and before
  // Plague. The DOS builds execute their distinct True Light block after Prayer and before
  // Darkness in region c. Keep both as one atomic multi-field write at their engine phase.
  // PROVENANCE[trueLight]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:30:307377331fcb02be6a7a1275
  const makeTrueLightStep = phase => statStep({
    id: 'trueLight', sourceId: 'trueLight', sourceLabel: 'True Light', phase,
    writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze', 'toHit'],
    when: () => hasTrueLight,
    apply: u => {
      u.res += trueLightResBonus; u.def += trueLightDefBonus;
      u.atk += trueLightAtkBonus;
      if (!isCoM2 || modernConventionalRangedPass) u.rtb += trueLightAtkBonus;
      if (!isCoM2) {
        u.gaze += trueLightAtkBonus; u.doomGaze += trueLightAtkBonus;
      }
      if (isWarlord && !!abilities.illusion) u.toHit -= 10;
    },
  });
  const warlordTrueLightStep = makeTrueLightStep('b');
  const dosTrueLightStep = makeTrueLightStep('c');

  const rawStatSteps = [
    // --- base: raw stats, and writes made permanently before the encounter ---
    // PROVENANCE[stat:base]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:bbaf5fb67bb1734c03725bf1 | Reference docs/DOS reconstructed/unitcalc.c@span:38:e0f87a5a92f98f34754862e7 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:28:37555b7dcbc4b5de6fb91420
    statStep({ id: 'stat:base', phase: 'base',
      writes: ['res', 'def', 'atk', 'rtb', 'hp', 'gaze', 'doomGaze',
        'rangedType', 'thrownType'],
      apply: u => {
        u.res = calcBaseRes; u.def = calcBaseDef; u.atk = calcBaseAtk; u.rtb = calcBaseRtb;
        u.hp = calcBaseHP; u.gaze = baseGazeRanged; u.doomGaze = baseDoomGaze;
        u.rangedType = baseSequenceRangedType; u.thrownType = baseSequenceThrownType;
      } }),
    // PROVENANCE[chance:baseMelee]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:68be766c4016b25fd0a44be4 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:6fe92f163cbb9aea88131c8e
    statStep({ id: 'chance:baseMelee', sourceId: 'baseToHitMelee',
      sourceLabel: 'Base melee To Hit', phase: 'base', writes: ['toHit', 'toHitMelee'],
      when: () => baseToHitMod !== 0,
      apply: u => {
        if (isCoM2) u.toHit += baseToHitMod;
        else u.toHitMelee += baseToHitMod;
      } }),
    // PROVENANCE[chance:baseRtb]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:68be766c4016b25fd0a44be4 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:6fe92f163cbb9aea88131c8e
    statStep({ id: 'chance:baseRtb', sourceId: 'baseToHitRtb',
      sourceLabel: 'Base ranged/Thrown/Breath To Hit', phase: 'base',
      writes: ['toHitRtb'],
      when: () => baseToHitRtbMod !== (isCoM2 ? baseToHitMod : 0),
      apply: u => { u.toHitRtb += baseToHitRtbMod - (isCoM2 ? baseToHitMod : 0); } }),
    // PROVENANCE[chance:baseBlock]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:68be766c4016b25fd0a44be4 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:34:6fe92f163cbb9aea88131c8e
    statStep({ id: 'chance:baseBlock', sourceId: 'baseToBlock',
      sourceLabel: 'Base To Block', phase: 'base', writes: ['toBlk'],
      when: () => baseToBlkMod !== 0,
      apply: u => { u.toBlk += baseToBlkMod; } }),
    // CoM1's Zombies constructor starts the live To Block field at -1. This is an
    // identity-sourced write, but it belongs on the calculated stat sequence so its
    // effect is attributed to To Block rather than to the Special unit control.
    // PROVENANCE[identity:zombies:toBlock]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:4228875943f7a7458e2af96e
    statStep({ id: 'identity:zombies:toBlock', sourceId: 'zombies', sourceLabel: 'Zombies',
      phase: 'base', writes: ['toBlk'],
      when: () => isCoM1 && identity.specialUnit === 'zombies',
      // The DOS constructor stores a signed D10 threshold step. The calculator's accumulator
      // is percentage points, so one engine step is ten percentage points.
      apply: u => { u.toBlk -= 10; } }),
    ...abilByPhase.base,
    // PROVENANCE[altarOfTheMoon]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:10:6f667006e3c7a79f7c8a4862
    statStep({ id: 'altarOfTheMoon', phase: 'base', writes: ['res', 'rtb'],
      apply: u => { u.res += altarOfTheMoonResMod; u.rtb += altarOfTheMoonRtbMod; } }),
    // PROVENANCE[militaryWorkshop]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:24:ab44f1ca0fc9eab7723b232b
    statStep({ id: 'militaryWorkshop', phase: 'base', writes: ['rtb'],
      apply: u => { u.rtb += blackpowderRtbMod + blackpowderFireBreathRtbMod; } }),
    // Lightning Blade follows Military Workshop in CreateUnit.CAS. It assigns rather than adds
    // when no Thrown source exists, so an older Lightning Breath is replaced by strength 1.
    // PROVENANCE[lightningBlade:breath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:6:81632d425b80bc83dc627d23
    statStep({ id: 'lightningBlade:breath', sourceLabel: 'Lightning Blade', phase: 'base',
      writes: ['rtb', 'rangedType', 'thrownType'],
      when: () => lightningBladeConvertsThrown || lightningBladeGrantsBreath,
      apply: u => {
        u.rtb = lightningBladeConvertsThrown ? u.rtb + 1 : 1;
        u.rangedType = 'none';
        u.thrownType = 'lightning';
      } }),
    // PROVENANCE[poolOfRepentance]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:6:3e9df07e383cb9fc3cb6ec88
    statStep({ id: 'poolOfRepentance', phase: 'base', writes: ['res', 'def'],
      apply: u => { u.res += poolOfRepentanceResMod; u.def += poolOfRepentanceDefMod; } }),
    // Dragon Mound follows Pool of Repentance and precedes Agoge in CreateUnit.CAS.
    // PROVENANCE[dragonMound]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:071c420ab03821e688a6e290
    statStep({ id: 'dragonMound', phase: 'base', writes: ['def', 'rtb'],
      apply: u => { u.def += dragonMoundDefMod; u.rtb += dragonMoundRtbMod; } }),
    // The executing script also adds +1 to an existing ranged-strength field, despite
    // that write being omitted from Ludus Agoge's prose description.
    // PROVENANCE[ludusAgoge]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:16:74a31ea6126eaa0915ee33a2
    statStep({ id: 'ludusAgoge', phase: 'base', writes: ['res', 'atk', 'rtb', 'hp'],
      apply: u => {
        u.res += ludusAgogeResMod; u.atk += ludusAgogeAtkMod;
        u.rtb += ludusAgogeRtbMod; u.hp += ludusAgogeHpMod;
      } }),
    // PROVENANCE[motherFungus]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:13:5feb79a87ed503bfc3388e6a
    statStep({ id: 'motherFungus', sourceId: 'motherFungus', sourceLabel: 'Mother Fungus',
      phase: 'base', writes: ['atk', 'rtb', 'toBlk'],
      apply: u => {
        u.atk += motherFungusAtkMod; u.rtb += motherFungusRtbMod;
        u.toBlk += motherFungus ? 10 : 0;
      } }),
    // PROVENANCE[altarOfTheSun:holyMother]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:12:08e36e60187df8bc650c42c7
    statStep({ id: 'altarOfTheSun:holyMother', phase: 'base', writes: ['atk'],
      apply: u => { u.atk += altarOfTheSunMeleeMod; } }),
    // PROVENANCE[sanctaBasilica]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:4:39fc91fc980453890ebc8f7f
    statStep({ id: 'sanctaBasilica', phase: 'base', writes: ['res'],
      apply: u => { u.res += sanctaBasilicaResMod; } }),
    // PROVENANCE[naturalSelection:powerMinerals]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:11:6612cf82e93af571954fbfad
    statStep({ id: 'naturalSelection:powerMinerals', phase: 'base', writes: ['res'],
      apply: u => { u.res += naturalSelectionPowerMineralsMod; } }),
    // CreateUnit.CAS snapshots Resistance before either resource write, then processes
    // Nightshade second. When both are present, Nightshade replaces the Power-mineral bonus.
    // PROVENANCE[naturalSelection:nightshade]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:18:448497300397f81837f9b5ab
    statStep({ id: 'naturalSelection:nightshade', phase: 'base', writes: ['res'],
      apply: u => {
        if (naturalSelectionNightshadeMod) {
          u.res += naturalSelectionNightshadeMod - naturalSelectionPowerMineralsMod;
        }
      } }),
    // Wild Game uses the ranged snapshot taken beside the Resistance snapshot above.
    // PROVENANCE[naturalSelection:wildGame]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:18:448497300397f81837f9b5ab
    statStep({ id: 'naturalSelection:wildGame', phase: 'base', writes: ['rtb'],
      when: () => naturalSelectionWildGameActive && hasPermanentRangedStat,
      apply: u => { u.rtb += 1; } }),
    // PROVENANCE[naturalSelection:coal]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:26:cef191739c3f088137ea1ffc
    statStep({ id: 'naturalSelection:coal', phase: 'base', writes: ['atk'],
      apply: u => { u.atk += naturalSelectionCoalMod; } }),
    // PROVENANCE[naturalSelection:iron]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:30:b83cb1d01140dbc56424aff9
    statStep({ id: 'naturalSelection:iron', phase: 'base', writes: ['def'],
      apply: u => { u.def += naturalSelectionIronMod; } }),
    // PROVENANCE[pillarOfFaith]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:19:80527272b0e3dd1465419cc8
    statStep({ id: 'pillarOfFaith', phase: 'base', writes: ['res'],
      apply: u => { u.res += pillarOfFaithResMod; } }),
    // Energy Cannon is the last represented CreateUnit.CAS ranged-strength write, so its
    // +50% reads every earlier permanent ranged contribution in this sequence.
    // PROVENANCE[energyCannon]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:40a6858a207fd2460b6df58e
    statStep({ id: 'energyCannon', phase: 'base', writes: ['rtb', 'rangedType'],
      when: () => energyCannon && energyCannonOwnsThisPass,
      apply: u => {
        u.rtb += Math.floor(Math.max(0, u.rtb) / 2);
        u.rangedType = 'beam';
      } }),
    // PROVENANCE[chance:survivalInstinctToBlock]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:7:fafe4abfecfd17491cbdbc10
    statStep({ id: 'chance:survivalInstinctToBlock', sourceId: 'survivalInstinctToBlock',
      sourceLabel: 'Survival Instinct', phase: 'base', writes: ['toBlk'],
      when: () => survivalInstinctToBlkBonus !== 0,
      apply: u => { u.toBlk += survivalInstinctToBlkBonus; } }),
    // --- a: precalc, in the binary ---
    // Region `a` is narrow: Chaos Channels Fire Breath is its represented strength write;
    // its other represented writes are identity/flags. City Walls is not here: ApplyAttack
    // passes it as EffectiveDefense's
    // per-attack `extradef` argument after the finished region-e record is read.
    ...abilByPhase.a,
    // `Caster.exe` adds 4 to its independent Fire Breath field. The DOS engines assign their
    // shared secondary slot instead, after checking the version-specific admission gate.
    // PROVENANCE[chaosChannels:fireBreath]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:b9b73d98478711f2be56c0a9 | Reference docs/DOS reconstructed/unitcalc.c@span:7:8ee2be8fe3596d5bdc7acc0a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:c39e26f9ccd713b815403313
    statStep({ id: 'chaosChannels:fireBreath', sourceId: 'chaosChannels:fireBreath',
      sourceLabel: 'Chaos Channels', phase: 'a',
      writes: ['rtb', 'rangedType', 'thrownType'],
      when: () => ccFireBreathActive && ccOwnsThisPass,
      apply: u => {
        u.rtb = ccIndependentChannels ? u.rtb + ccFireBreathStrength : ccFireBreathStrength;
        u.rangedType = 'none'; u.thrownType = 'fire';
      } }),
    // --- b: precalc, in UnitCalcPre.CAS (Warlord only) ---
    // Marionette's stat writes precede the later Outlander research block. This order is
    // observable because its Fantastic write makes Wanderer eligible for Xenoveterinary.
    // PROVENANCE[marionette:stats]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913
    statStep({ id: 'marionette:stats', sourceId: 'marionetteChanneler',
      sourceLabel: 'Marionette (Channeler)', phase: 'b', writes: ['atk', 'rtb', 'def'],
      when: () => marionetteOwned,
      apply: u => {
        u.atk += marionetteAttackBonus;
        if (marionetteOwnsThisRangedPass) u.rtb += marionetteAttackBonus;
        u.def += marionetteDefenseBonus;
      } }),
    // The strayed branch first grants Transmute Equipment; its hero augmentation block later
    // in this same hook runs before Rebuild and the Outlander research block.
    // PROVENANCE[marionette:strayedTransmute]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:e36dada50542233ab9fda915
    statStep({ id: 'marionette:strayedTransmute', sourceId: 'marionetteStrayed',
      sourceLabel: 'Marionette (strayed): Transmute Equipment', phase: 'b',
      writes: ['atk', 'rtb', 'def', 'res'], when: () => marionetteStrayed,
      apply: u => {
        u.atk += 2;
        if (marionetteRangedPass) u.rtb += 2;
        u.def += 2;
        u.res += 1;
      } }),
    // Rebuild's hero block immediately follows Transmute Equipment and precedes
    // Xenoveterinary in UnitCalcPre.CAS.
    ...abilByPhase.b.filter(step => step.id === 'rebuild'),
    // Warlord removes the compiled CoM2 hero package here, at UnitCalcPre.CAS:759-769,
    // before Fiery Fury and the later Outlander/True Light blocks. The compiled grant remains
    // at the end of region c, after Warp and Shatter.
    ...abilByPhase.b.filter(step => step.id === 'tactician:warlordClawback'),
    // Xenoveterinary's +25% (minimum +1) reads SHP at the head of the early pass
    // (UnitCalcPre.CAS:1038-1049), so it precedes every other phase-b HP write and does not
    // compound Lionheart, Endurance or Charm of Life, which are `c`.
    // PROVENANCE[outlanderXenoveterinary]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:8b96540daf4a2128b20b0aeb
    statStep({ id: 'outlanderXenoveterinary', sourceId: 'outlanderXenoveterinary',
      sourceLabel: 'Xenoveterinary', phase: 'b', writes: ['hp', 'toHit'],
      when: () => !!abilities.outlanderXenoveterinary,
      apply: u => {
        u.hp += Math.max(1, Math.floor(Math.max(0, u.hp) / 4));
        u.toHit += 10;
      } }),
    ...abilByPhase.b.filter(step => step.id !== 'rebuild'
      && step.id !== 'tactician:warlordClawback'),
    // The Outlander channel/common writes follow the script's own sequence:
    // Magitek Engine (ability step above), Ballistics, Xenopsychology, then Radio.
    // PROVENANCE[chance:outlanderBallisticsTraining]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:8:ba5b3ebcb89e99e403fbbac4
    statStep({ id: 'chance:outlanderBallisticsTraining',
      sourceId: 'outlanderBallisticsTraining', sourceLabel: 'Ballistics Training',
      phase: 'b', writes: ['toHitRtb'],
      when: () => outlanderRtbToHitBonus !== 0,
      apply: u => { u.toHitRtb += outlanderRtbToHitBonus; } }),
    // PROVENANCE[outlanderXenopsychology]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:3:60edcb4df0146e08c59fd67d
    statStep({ id: 'outlanderXenopsychology', phase: 'b', writes: ['res'],
      when: () => !!abilities.outlanderXenopsychology, apply: u => { u.res += 1; } }),
    // PROVENANCE[outlanderRadio]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:183cd9022f9df0e2b6d9514f
    statStep({ id: 'outlanderRadio', sourceId: 'outlanderRadio', sourceLabel: 'Radio',
      phase: 'b', writes: ['res', 'toHit', 'toBlk'],
      when: () => !!abilities.outlanderRadio, apply: u => {
        u.res += 1; u.toHit += 10; u.toBlk += 10;
      } }),
    // Conjuring Pact and Uphill Battle immediately follow the Outlander block.
    // PROVENANCE[chance:nausea]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:c7ec21b771edb6cb9bd17645
    statStep({ id: 'chance:nausea', sourceId: 'nausea', sourceLabel: 'Conjuring Pact nausea',
      phase: 'b', writes: ['toHit', 'toBlk'],
      when: () => isWarlord && !!abilities.nausea && isNormalUnitType(unitTypeVal),
      apply: u => { u.toHit -= 10; u.toBlk -= 10; } }),
    // PROVENANCE[uphillBattle]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:233a5a25490ae7a59c17106e
    statStep({ id: 'uphillBattle', sourceId: 'uphillBattle', sourceLabel: 'Uphill Battle',
      phase: 'b', writes: ['res', 'toHit', 'toBlk'],
      when: () => uphillBattleActive, apply: u => {
        u.res += 1; u.toHit += 10; u.toBlk += 10;
      } }),
    // Fiery Fury: melee at UnitCalcPre.CAS:832-846, and the ranged half of what the bucket
    // model merged into one `Math.max` term — see the M4 note at `fbBladeRtb`.
    // PROVENANCE[fieryFury]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:15:124bc19c147f5de83f487583 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:551d408ad4d5ae821c5eaf58 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:3:d7cdec7c168e641613b36c19
    statStep({ id: 'fieryFury', phase: 'b', writes: ['atk', 'rtb'],
      apply: u => { u.atk += ffMeleeBonus; u.rtb += ffRtbMod; } }),
    // PROVENANCE[wallOfFire:garrison]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:15:a221a36b384a9457291e5a8a
    statStep({ id: 'wallOfFire:garrison', phase: 'b', writes: ['atk', 'rtb'],
      apply: u => { u.atk += wofDefenderAtkMod; u.rtb += wofDefenderRtbMod; } }),
    // PROVENANCE[eternalNight:poorVision]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:714df04471d1c63eb32e3964
    statStep({ id: 'eternalNight:poorVision', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += eternalNightRtbMod; } }),
    // PROVENANCE[bombsGrenades]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:7:99e85b5dc6de1ad3f95908c1
    statStep({ id: 'bombsGrenades', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += bombsGrenadesRtbMod; } }),
    // PROVENANCE[upgradedExplosive:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:4:716e4812acd6432198553e28
    statStep({ id: 'upgradedExplosive:ranged', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += upgradedExplosiveRangedMod; } }),
    // The Fire Breath write is part of the same UnitCalcPre block as the ranged write.
    // Later phase-b effects such as True Light must see, but must not be included in,
    // this doubled subtotal.
    // PROVENANCE[upgradedExplosive:fireBreath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:4:716e4812acd6432198553e28
    statStep({ id: 'upgradedExplosive:fireBreath', phase: 'b', writes: ['rtb'],
      when: () => upgradedExplosive && thrownType === 'fire',
      apply: u => { u.rtb += Math.max(0, u.rtb); } }),
    // PROVENANCE[soulFlay]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:13:1a0ee111433e436b3c5da065
    statStep({ id: 'soulFlay', phase: 'b', writes: ['res', 'def', 'atk'],
      apply: u => {
        u.res += soulFlayResMod; u.def += soulFlayDefMod; u.atk += soulFlayAtkMod;
      } }),
    // PROVENANCE[goblinPox]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:19:4d062d7899f6c61a2403d4a4
    statStep({ id: 'goblinPox', phase: 'b', writes: ['res', 'def', 'atk'],
      apply: u => {
        u.res += goblinPoxResMod; u.def += goblinPoxDefMod; u.atk += goblinPoxAtkMod;
      } }),
    // PROVENANCE[greatUnbinding]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:17:51f2e6d3d15bd989ebfff7cd
    statStep({ id: 'greatUnbinding', sourceId: 'greatUnbinding', sourceLabel: 'Great Unbinding',
      phase: 'b', writes: ['res', 'toHit', 'toBlk'],
      apply: u => {
        u.res += greatUnbindingResMod;
        if (greatUnbindingActive) { u.toHit -= 20; u.toBlk -= 20; }
      } }),
    // PROVENANCE[natureLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:5:8d549c3c9d2b586869606d77
    statStep({ id: 'natureLink', phase: 'b', writes: ['res'],
      apply: u => { u.res += natureLinkResMod; } }),
    ...(isWarlord ? [warlordTrueLightStep] : []),
    // PROVENANCE[plague]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:11:52017a20d7efd62a9584c02a
    statStep({ id: 'plague', sourceId: 'plague', sourceLabel: 'Plague',
      phase: 'b', writes: ['res', 'def', 'atk', 'toHit'],
      apply: u => {
        u.res += plagueResMod; u.def += plagueDefMod; u.atk += plagueAtkMod;
        if (plagueActive) u.toHit -= 10;
      } }),
    // Xenopsychology and Radio are +1 Resistance each; the rest of what they grant is To Hit
    // and To Defend, which are not in the sequence yet.
    // PROVENANCE[godsPlayDices]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:14:34909b07ee2554c5452c485b
    statStep({ id: 'godsPlayDices', phase: 'b', writes: ['res'],
      apply: u => { u.res += godsPlayDicesResMod; } }),
    // --- c: magic calc, in the binary ---
    // Destiny's persistent identity/storage writes occur here, after UnitCalcPre, and its
    // calculated-record package immediately follows. Every permanent base write plus regions
    // a and b therefore feeds the six multipliers; level and Focus Magic remain later.
    // PROVENANCE[destiny]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:e90777a680ce0ccd0df5ea87
    statStep({ id: 'destiny', sourceLabel: 'Destiny', phase: 'c',
      writes: ['atk', 'rtb', 'def', 'res', 'hp'], when: () => destinyActive,
      apply: u => {
        u.atk *= 2; u.rtb *= 2; u.def += 4; u.res += 4; u.hp *= 2;
      } }),
    // The normal-unit level ladder is `@Units@ApplyLevelBonus` at +0x00D16, near the head of
    // modern region c and right after Destiny's permanent transformation. DOS calls its ladder
    // in the battle-unit constructor before the material block and BU_Apply_Specials. The helper
    // and runtime-table spans below cover every represented gate and cumulative value; separate
    // hero progression remains outside this step's supported scope.
    // PROVENANCE[level]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:11:3ebd099afdc1a9ba314313f2 | Reference docs/DOS reconstructed/unitcalc.c@span:38:c8bc5c66456b29de687f535f | Reference docs/DOS reconstructed/unitcalc.c@span:40:cda85f7ef3216bc02ae3032b | Reference docs/DOS reconstructed/unitcalc.c@span:39:48331d18d44f1fab33f12268 | TABLE=Reference docs/DOS reconstructed/unitcalc.c@span:7:deff2f84492feaf68541f42d | Reference docs/DOS reconstructed/unitcalc.c@span:40:055f8353efb25e678c811dbd | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:ca745a122a23d618ddef5f78 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:32:729bd94fe9ce2cb9428c8f67 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:9bf061ae7a53bd811c325d52 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:37:2f0f9a3f42c55833499bb275 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/Levelbonus.INI@span:30:084e7cb2c790a6a561442fc8 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:37:6b5d3a7845cdf5334f585bbd | TABLE=Reference docs/Script source/Warlord 1.5.12.7/Levelbonus.INI@span:30:13dab7d938ce88eaff0bde1c
    statStep({ id: 'level', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'hp', 'toHit',
        ...(!isCoM2 ? ['gaze', 'doomGaze'] : [])],
      apply: u => {
        u.res += lvl.res; u.def += lvl.def; u.atk += lvl.atk; u.rtb += rtbLvl; u.hp += lvl.hp;
        if (!isCoM2) {
          u.gaze += gazeLvlMod; u.doomGaze += doomGazeLvlMod;
        }
        u.toHit += lvl.toHit;
      } }),
    ...(!isCoM2 ? weaponStatSteps : []),
    ...(isCoM1 ? [flameBladeRangedStep] : []),
    // Focus Magic is +0x00D3F, immediately after the level ladder, so CoM2 and Warlord write its
    // attack-strength package before the Warps. Warlord's later CAS block moves touch riders but
    // makes no attack-strength write. CoM 1 executes Focus Magic in BU_Apply_Specials, after the
    // constructor's material block and after Flame Blade's ranged addition.
    // PROVENANCE[focusMagic]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:18:84c8baeb7a2f577dca38e056 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:38:5036ba273068428523d6008e
    statStep({ id: 'focusMagic', phase: 'c', writes: ['rtb', 'doomGaze'],
      when: () => focusMagicActive,
      apply: u => {
        const magicalRanged = u.rangedType === 'magic_c' || u.rangedType === 'magic_n'
          || u.rangedType === 'magic_s' || u.rangedType === 'beam';
        const breath = u.thrownType === 'fire' || u.thrownType === 'lightning';
        if (u.rtb > 0 && (magicalRanged || breath)) u.rtb += 3;
        u.doomGaze += focusMagicDoomGazeMod;
      } }),
    // The ranged branch follows the independent Doom/Breath additions in the same compiled
    // block. It reads the live post-level strength: physical ranged only changes type, Thrown
    // moves to conventional ranged at its current strength, and an empty ranged record gets 3.
    // PROVENANCE[focusMagic:conversion]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:20:fa0079de675211a02db49173 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:39:afc551599f5229a3bbe362bb
    statStep({ id: 'focusMagic:conversion', sourceId: 'focusMagic:conversion',
      sourceLabel: 'Focus Magic', phase: 'c',
      writes: ['rtb', 'rangedType', 'thrownType'],
      when: () => focusMagicConvertsThrown || focusMagicConvertsRanged
        || focusMagicCreatesRanged,
      apply: u => {
        if (focusMagicCreatesRanged) u.rtb = 3;
        else if (version === 'com_6.08') u.rtb = Math.max(u.rtb, 3);
        u.rangedType = 'magic_s';
        u.thrownType = 'none';
      } }),
    // Weapon material is `@Units@ApplyMagicWeapons` at +0x04B90, after the equipment loop —
    // also D25, also region c.
    // Dark Force precedes the defending-city/node package and ApplyMagicWeapons.
    // PROVENANCE[darkForce]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:b1b6be9c34cd3728a4158aad
    statStep({ id: 'darkForce', phase: 'c', writes: ['toHit', 'toBlk'],
      when: () => darkForceActive,
      apply: u => { u.toHit += 10; u.toBlk += 10; } }),
    // Heavenly Light and the friendly Guardian-node path share one compiled package. The
    // attack gates intentionally differ: persistent/base melee and current conventional Ranged.
    // PROVENANCE[heavenlyLight]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:e405a407e722dce9ad79aea3
    statStep({ id: 'heavenlyLight', phase: 'c', writes: ['def', 'res', 'atk', 'rtb'],
      when: () => heavenlyLightActive,
      apply: u => {
        u.def += 1; u.res += 1;
        if (inputBaseAtk > 0) u.atk += 1;
        if (modernConventionalRangedPass && u.rtb > 0) u.rtb += 1;
      } }),
    // PROVENANCE[chance:heavenlyLight:melee]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:ca247f52483258db47263f1f
    statStep({ id: 'chance:heavenlyLight:melee', sourceId: 'heavenlyLight',
      sourceLabel: 'Heavenly Light / Guardian node', phase: 'c', writes: ['toHitMelee'],
      when: () => heavenlyLightMeleeToHit !== 0,
      apply: u => { u.toHitMelee += heavenlyLightMeleeToHit; } }),
    // PROVENANCE[chance:heavenlyLight:rtb]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:ca247f52483258db47263f1f
    statStep({ id: 'chance:heavenlyLight:rtb', sourceId: 'heavenlyLight',
      sourceLabel: 'Heavenly Light / Guardian node', phase: 'c', writes: ['toHitRtb'],
      when: () => heavenlyLightRtbToHit !== 0,
      apply: u => { u.toHitRtb += heavenlyLightRtbToHit; } }),
    ...(isCoM2 ? weaponStatSteps : []),
    ...abilByPhase.cBeforeHolyArmor,
    // PROVENANCE[endurance]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:f1faba1a3ffce4883dce32c1 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:61c518b9d5be7ff83193cb0c | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:746a48490cec4055321bc210 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:746a48490cec4055321bc210
    statStep({ id: 'endurance', phase: 'c', writes: ['def', 'hp'],
      apply: u => { u.def += enduranceDefMod; u.hp += enduranceHpMod; } }),
    // PROVENANCE[discipline]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:20:445349dde257497d94440bc9
    statStep({ id: 'discipline', phase: 'c', writes: ['def', 'atk', 'rtb'],
      apply: u => {
        u.def += disciplineDefMod; u.atk += disciplineAtkMod; u.rtb += disciplineRtbMod;
      } }),
    // Each of these carries the type-conditional half of an effect whose flat half is an
    // ability step above — hence the `:<what it writes>` suffix on the shared name.
    ...(!isCoM1 ? [flameBladeRangedStep] : []),
    // PROVENANCE[landLinking:breath]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:3fa8c2fabf80e91cf859f9b0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:df8d58cf51472b304559af37
    statStep({ id: 'landLinking:breath', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += landLinkingBreathRtbMod; } }),
    // PROVENANCE[giantStrength:thrown]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:89de343d2e17866257ac560a
    statStep({ id: 'giantStrength:thrown', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += gsRtbMod; } }),
    // PROVENANCE[lionheart:rangedHp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:0e597d1ff73a00332d952e72 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:16:828f58debc909e639ff119f0
    statStep({ id: 'lionheart:rangedHp', phase: 'c', writes: ['rtb', 'hp'],
      apply: u => { u.rtb += lionheartRtbMod; u.hp += lionheartHpMod; } }),
    // Holy Armor writes defence *or* To Block: MoM always +2 defence, CoM/CoM2 +2 defence at
    // 5 armor or less and +10% To Block above it. The threshold reads the defence standing at
    // this position — under the buckets that needed a named subtotal (`defBase`); here it is
    // just the field's current value. +0x07407, so it is ahead of the node aura and of every
    // curse, and its threshold does not see them.
    // PROVENANCE[holyArmor]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:4:6281d5747830e7e40ac6cf0b | Reference docs/DOS reconstructed/unitcalc.c@span:7:b231f176981bd4242bc56846 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:45297c88e316d31043568fb9
    statStep({ id: 'holyArmor', phase: 'c',
      writes: ['def', 'toBlk'],
      when: () => holyArmorActive,
      apply: u => {
        if (isCoMVersion && u.def > 5) u.toBlk += 10;
        else u.def += 2;
      } }),
    // PROVENANCE[orihalcon]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:edcd009b70fbdd75f5a2cbd5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:ceaf7256e4e54cba7caba1c2
    statStep({ id: 'orihalcon', phase: 'c', writes: ['res', 'rtb'],
      apply: u => { u.res += orihalconResMod; u.rtb += orihalconRtbMod; } }),
    // PROVENANCE[chance:holyWeapon:melee]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:f35bf69e3356d00f90e013ed | Reference docs/DOS reconstructed/unitcalc.c@span:14:057c7ba8762bb65c4a011e69 | Reference docs/DOS reconstructed/unitcalc.c@span:12:1acacb263828739ad9aeab50 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:aeee04e431949f9a5f171311
    statStep({ id: 'chance:holyWeapon:melee', sourceId: 'holyWeapon',
      sourceLabel: 'Holy Weapon', phase: 'c', writes: ['toHitMelee'],
      when: () => hwMeleeToHit !== 0,
      apply: u => { u.toHitMelee += hwMeleeToHit; } }),
    // PROVENANCE[chance:holyWeapon:rtb]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:f35bf69e3356d00f90e013ed | Reference docs/DOS reconstructed/unitcalc.c@span:14:057c7ba8762bb65c4a011e69 | Reference docs/DOS reconstructed/unitcalc.c@span:12:1acacb263828739ad9aeab50 | Reference docs/DOS reconstructed/combat.c@span:11:be24e47e7e5719d3e16efdf5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:aeee04e431949f9a5f171311
    statStep({ id: 'chance:holyWeapon:rtb', sourceId: 'holyWeapon',
      sourceLabel: 'Holy Weapon', phase: 'c', writes: ['toHitRtb'],
      when: () => hwRtbToHit !== 0,
      apply: u => { u.toHitRtb += hwRtbToHit; } }),
    // Global enchantments, combat globals, and curses execute after Holy Armor's live
    // Defense test. Their ability steps must not participate in its > 5 branch decision.
    ...abilByPhase.c.filter(step => step.id !== 'mindStorm'),
    ...(!isWarlord && !isCoM2 && !isCoM1 ? [dosTrueLightStep] : []),
    // These explicit halves and live reads are also later region-c sites. Keep their source
    // order at this boundary; F20 owns exhaustive ordering against the remaining ability spread.
    // PROVENANCE[reinforceMagic:ranged]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:9:c46cf0a067fb9eff1afc4064
    statStep({ id: 'reinforceMagic:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += reinforceMagicRtbMod; } }),
    // Charm of Life reads live HP after every earlier HP writer, including Lionheart and Endurance.
    // PROVENANCE[charmOfLife]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:bac4e9b3eab5dcd73146e126 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:12:95fe4413d7ef9ab38400cfb7
    statStep({ id: 'charmOfLife', phase: 'c', writes: ['hp'],
      when: () => charmOfLifeActive,
      apply: u => { u.hp += Math.max(1, Math.trunc(u.hp / 4)); } }),
    // PROVENANCE[blazingMarch:ranged]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:26:19d9b3041c4cba25ac05eebb | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:22:dc7d9d2e0bc077c6e02314a1 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:4:948215fe7c75f15252145bd4 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:4:2e38314c2c8fd875465a75dd
    statStep({ id: 'blazingMarch:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += blazingMarchRtbMod; } }),
    // PROVENANCE[weakness:ranged]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:28:51bb7b42de5195f9edf69a86 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:e4cfc8d10fb6c6beee42bb6f
    statStep({ id: 'weakness:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += weaknessRtbModBinary; } }),
    // PROVENANCE[chaosSurge]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:8aac79f44ffe2fbae619cb5d | Reference docs/DOS reconstructed/unitcalc.c@span:28:ef6419306ce4c0b275103ee1 | Reference docs/DOS reconstructed/unitcalc.c@span:29:0f32c183c37c88a243ddb6cf | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:29:bc81b31ab5f15a3717465711
    statStep({ id: 'chaosSurge', phase: 'c',
      writes: ['res', 'atk', 'rtb', 'gaze', 'doomGaze'],
      apply: u => {
        u.res += chaosSurgeResBonus;
        if ((isCoM2 && hasMeleeAttack) || (!isCoM2 && u.atk > 0))
          u.atk += chaosSurgeMeleeBonus;
        if (isCoM2) {
          if (rangedType !== 'none'
              || ((thrownType === 'fire' || thrownType === 'lightning') && u.rtb > 0))
            u.rtb += chaosSurgeRtbBonus;
        } else if (u.rtb > 0 && !(ccFireBreathActive && version.startsWith('mom'))) {
          u.rtb += chaosSurgeRtbBonus;
        }
        if (!isCoM2) {
          if (u.gaze > 0) u.gaze += chaosSurgeRtbBonus;
          if (u.doomGaze > 0) u.doomGaze += chaosSurgeRtbBonus;
        }
      } }),
    // Berserk doubles melee and sets defence to 0 absolutely. MoM-only, and MoM's recompute
    // has not been decoded here, so the position is deduced: last thing before the Warps,
    // which is where the pre-R1 model effectively had it.
    // PROVENANCE[berserk]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:086abf5cb60f1b58a36ab85f
    statStep({ id: 'berserk', phase: 'c', writes: ['def', 'atk'], provisional: true,
      when: () => classicBerserk, apply: u => { u.def = 0; u.atk *= 2; } }),

    // CoM2/Warlord's Eternal Night resistance write (+0x089A8/+0x0A8A2) precedes the
    // compiled Darkness block (+0x0A8DA/+0x0A90F). Both are before the Warps. CoM 1 instead
    // writes its Eternal Night penalty after Tactician, below.
    // PROVENANCE[eternalNight:enemyResistance]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:3810e1c47b8eb421a7ebb24f
    statStep({ id: 'eternalNight:enemyResistance', phase: 'c', writes: ['res'],
      when: () => !isCoM1 && eternalNightEnemyResPenalty !== 0,
      apply: u => { u.res += eternalNightEnemyResPenalty; } }),
    // The DOS recompute writes the same +2 package near the head of region c. Caster.exe
    // dispatches its native node aura after the global-enchantment block and before the Moon
    // events/combat globals. The melee gate reads persistent BaseUnits.attack; conventional
    // Ranged and both Breath gates read their current fields. Thrown and every Gaze are absent.
    // PROVENANCE[nodeAura]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:31:548c2c98c01394a296fa188a
    statStep({ id: 'nodeAura', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => nodeAuraActive,
      apply: u => {
        u.res += 2; u.def += 2;
        if (!isCoM2) {
          u.atk += 2;
          if (u.rtb > 0) u.rtb += 2;
          if (u.gaze > 0) u.gaze += 2;
          if (u.doomGaze > 0) u.doomGaze += 2;
        } else {
          if (modernNodeBaseMeleePass) u.atk += 2;
          if (modernNodeSecondaryPass && u.rtb > 0) u.rtb += 2;
        }
      } }),
    // CoM 1 jumps to this relocated side-maximum tail after its node/Guardian package and
    // returns before Heavenly Light and the curse/Warp tail. Unlike the modern aura pass, these
    // writes therefore remain visible to later reductions and the terminal clamp.
    // PROVENANCE[guidingBeaconAura:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:438880febda217f547fcb0e5
    statStep({ id: 'guidingBeaconAura:coM1', sourceId: 'guidingBeaconAura',
      sourceLabel: 'Guiding Beacon aura', phase: 'c', writes: ['rtb'],
      when: () => com1GuidingBeaconAura > 0,
      apply: u => {
        if (u.rangedType === 'missile' || u.rangedType === 'boulder'
            || isMagicalRangedType(u.rangedType)) u.rtb += com1GuidingBeaconAura;
      } }),
    // PROVENANCE[divineBarrierAura:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:12:d15683dae66a031390912a26
    statStep({ id: 'divineBarrierAura:coM1', sourceId: 'divineBarrierAura',
      sourceLabel: 'Divine Barrier aura', phase: 'c', writes: ['def'],
      when: () => com1DivineBarrierAura > 0,
      apply: u => { u.def += com1DivineBarrierAura; } }),
    // PROVENANCE[soulLinkerAura:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:ddbd60d42c3858e92689d2e8
    statStep({ id: 'soulLinkerAura:coM1', sourceId: 'soulLinkerAura',
      sourceLabel: 'Soul Linker aura', phase: 'c', writes: ['toHit', 'toBlk'],
      when: () => com1SoulLinkerAura > 0 && identity.fantastic,
      apply: u => {
        u.toHit += Math.ceil(com1SoulLinkerAura / 2);
        u.toBlk += Math.floor(com1SoulLinkerAura / 2);
      } }),
    // The three astronomical events follow the native node aura and read base Fantastic while
    // testing attack channels on their current values.
    // PROVENANCE[badMoon]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:b777912e0cccc18e4cbd7c0a
    statStep({ id: 'badMoon', phase: 'c', writes: ['res'],
      when: () => badMoonActive, apply: u => { u.res -= 3; } }),
    // PROVENANCE[goodMoon]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:f594baaf8096788dd3657cd6
    statStep({ id: 'goodMoon', phase: 'c', writes: ['def', 'atk', 'rtb'],
      when: () => goodMoonActive,
      apply: u => {
        u.def += 1;
        if (u.atk > 0) u.atk += 1;
        if (modernConventionalRangedPass && u.rtb > 0) u.rtb += 1;
      } }),
    // PROVENANCE[natureConjunction]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:4c6f881ef1f956f17e1bd803
    statStep({ id: 'natureConjunction', phase: 'c', writes: ['res', 'def', 'atk', 'rtb'],
      when: () => natureConjunctionActive,
      apply: u => {
        u.res += 2; u.def += 2;
        if (u.atk > 0) u.atk += 2;
        if (modernConventionalRangedPass && u.rtb > 0) u.rtb += 2;
      } }),
    // PROVENANCE[darkness]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:30:a43a4b9b9c796ff5baa3e070 | Reference docs/DOS reconstructed/unitcalc.c@span:30:a6f103fc8632f6d1513712c0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:29:18f99324928d11bffe6f2858 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:e289006c649dcfb1c6e9a280
    statStep({ id: 'darkness', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => !isCoM1 && hasDarkness,
      apply: u => {
        if (isCoM2) {
          if (darknessResBonus > 0 || u.res > 0) u.res += darknessResBonus;
          if (darknessDefBonus > 0 || u.def > 0) u.def += darknessDefBonus;
          if (u.atk > 0) u.atk += darknessAtkBonus;
          if (u.rtb > 0) u.rtb += darknessAtkBonus;
        } else {
          u.res += darknessResBonus;
          u.def += darknessDefBonus;
          if (darknessAtkBonus < 0 || u.atk > 0) u.atk += darknessAtkBonus;
          if (darknessAtkBonus < 0 || u.rtb > 0) u.rtb += darknessAtkBonus;
          if (darknessAtkBonus < 0 || u.gaze > 0) u.gaze += darknessAtkBonus;
          if (darknessAtkBonus < 0 || u.doomGaze > 0) u.doomGaze += darknessAtkBonus;
        }
      } }),

    // Warp Reality and Vertigo are recalculation writes, not resolution-time projections.
    // Their signed common Hit/To Defend values must therefore reach the region-e clamp in order.
    // PROVENANCE[chance:warpReality]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:e5f3d5a32258982e16c67cb1 | Reference docs/DOS reconstructed/unitcalc.c@span:5:b56d82758c8a1388b292e2a1 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:5536c22c25f21fbaeed04a18
    statStep({ id: 'chance:warpReality', sourceId: 'warpReality', sourceLabel: 'Warp Reality',
      phase: 'c', writes: ['toHit'], when: () => warpRealityActive && !unitIsChaos,
      apply: u => { u.toHit -= 20; } }),
    // PROVENANCE[chance:vertigo]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:13:988ef64cd77214c23cb77397 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:a8adaeabe8e52ff5c76f42d2
    statStep({ id: 'chance:vertigo', sourceId: 'vertigo', sourceLabel: 'Vertigo',
      phase: 'c', writes: ['toHit', 'toBlk'], when: () => vertigoActive,
      apply: u => {
        u.toHit -= vertigoHitPenalty * 100;
        u.toBlk -= vertigoBlockPenalty * 100;
      } }),
    // Mind Storm follows Vertigo and Weakness in the direct-curse tail and immediately
    // precedes the three Warp Creature variants. Its modern secondary write is limited to
    // conventional Ranged and Thrown by the source-shaped ability step.
    ...abilByPhase.c.filter(step => step.id === 'mindStorm'),

    // --- The Warp Creature block, and Shatter immediately after it ---
    // D22. Every engine runs these inside the recompute, in the order Attack → Defense →
    // Resist → Shatter, and every engine keeps writing stats afterwards — so what an engine
    // writes *after* them is the whole of the divergence, and one position serves all three:
    //   MoM 1.31 / CP 1.60  0x90A63-0x90AC9, then Shatter, then the terminal clamp
    //   CoM 1               0x9074C-0x90795, then Shatter 0x907DC, then Darkness, Supreme
    //                       Light, Tactician and Eternal Night — the `afterWarp` splice below
    //   CoM2 / Warlord      +0x0BA3C-+0x0BDF7, then Shatter +0x0BF62, then Tactician
    //                       +0x0C890, then the whole of `d` and the whole of `e`
    // Nothing between the previous step and here is one of CoM 1's post-Warp writes, which is
    // what lets its early Warp and MoM's late one share a position.
    // PROVENANCE[warpAttack]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:9:94df6310cdbc37d8f35f6897 | Reference docs/DOS reconstructed/unitcalc.c@span:10:7afd072fad52d77073116162 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:14:feb1881464c0e2f5a90f9f97
    statStep({ id: 'warpAttack', phase: 'c',
      writes: ['atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => !!(abilities && abilities.warpAttack),
      apply: u => {
        u.atk = isCoM2 ? Math.trunc(u.atk / 2) : Math.floor(u.atk / 2);
        if (isCoMVersion)
          u.rtb = isCoM2 ? Math.trunc(u.rtb / 2) : Math.floor(u.rtb / 2);
        // gazeWarpHalves: CoM 1 only — 0x90764-0x90772 has no ranged_type test, so the
        // halving reaches a gaze. MoM's Warp Attack touches melee only, and CoM2's leaves
        // the gaze fields alone (they are separate fields in `Caster.exe`).
        if (gazeWarpHalves) {
          u.gaze = Math.floor(u.gaze / 2);
          u.doomGaze = Math.floor(u.doomGaze / 2);
        }
      } }),
    // PROVENANCE[warpDefense]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:20:4ade353524404839658c2a92 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:5:f4bf3085892f0c76764a91bc
    statStep({ id: 'warpDefense', phase: 'c', writes: ['def'],
      when: () => !!(abilities && abilities.warpDefense),
      apply: u => {
        u.def = isCoM1 ? Math.trunc(u.def / 3)
          : Math.floor(u.def / (isCoMVersion ? 3 : 2));
      } }),
    // PROVENANCE[warpResist]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:4:af84302cc4211baa873b72e0 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:5:a15539b1a7a69de6c7548391
    statStep({ id: 'warpResist', phase: 'c', writes: ['res'],
      when: () => !!(abilities && abilities.warpResist), apply: u => { u.res = 0; } }),
    // Shatter reduces every attack strength to 1. CoM2: normal units and heroes only;
    // Warlord: any unit.
    // PROVENANCE[shatter]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:23:9d5c1cf547d632005ddeebe5 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:15:b34c35cb9bf68bf3402e6d27
    statStep({ id: 'shatter', phase: 'c', writes: ['atk', 'rtb'],
      when: () => !!(abilities && abilities.shatter)
        && (isWarlord || isNormalUnitType(unitTypeVal) || unitTypeVal === 'hero'),
      apply: u => { if (u.atk > 0) u.atk = 1; if (u.rtb > 0) u.rtb = 1; } }),

    // --- c, after the Warp block ---
    // CoM 1 only: Darkness at 0x9084C, then Supreme Light at 0x90992. Both land at full value
    // on the reduced stat. Eternal Night is deliberately not folded in: it is after Tactician.
    // PROVENANCE[darkness:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:8:7e6d93372e0de3d445a9db2b | Reference docs/DOS reconstructed/unitcalc.c@span:12:750dc4f6540b4d84533b2557
    statStep({ id: 'darkness:coM1', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => isCoM1 && hasDarkness,
      apply: u => {
        u.res += darknessResBonus;
        u.def += darknessDefBonus;
        if (darknessAtkBonus < 0 || u.atk > 0) u.atk += darknessAtkBonus;
        if (darknessAtkBonus < 0 || u.rtb > 0) u.rtb += darknessAtkBonus;
        if (darknessAtkBonus < 0 || u.gaze > 0) u.gaze += darknessAtkBonus;
        if (darknessAtkBonus < 0 || u.doomGaze > 0) u.doomGaze += darknessAtkBonus;
      } }),
    // Q7, closed: `defense += resistance / 3` is a **live** read of the record, taken where the
    // engine takes it — after Warp Resist and Darkness, before Tactician (0x90992-0x90A53).
    // PROVENANCE[supremeLight:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:24:b1236fda671c45bc369f8550
    statStep({ id: 'supremeLight:coM1', phase: 'c', writes: ['def', 'atk', 'rtb'],
      when: () => isCoM1 && supremeLightEligible,
      apply: u => {
        u.def += Math.trunc(u.res / 3);
        u.atk += 2;
        if (u.rtb > 0) u.rtb += 2;
      } }),
    // PROVENANCE[realmWard]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:10:5cd2715b00a3b65a8943c24e
    statStep({ id: 'realmWard', phase: 'c', writes: ['toHit', 'def', 'res'],
      when: () => realmWardActive,
      apply: u => { u.toHit -= 20; u.def -= 3; u.res -= 3; } }),
    // Spell Ward follows Terror and the Warp/Shatter tail, before Tactician.
    // PROVENANCE[spellWard]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:23:f2d06ed57305602954b1a140
    statStep({ id: 'spellWard', phase: 'c', writes: ['toHit', 'def', 'res'],
      when: () => spellWardActive,
      apply: u => { u.toHit -= 20; u.def -= 3; u.res -= 3; } }),
    // Tactician, for every CoM engine: CoM 1 at 0x90AB4, CoM2/Warlord at +0x0C890.
    ...abilByPhase.cAfterWarp,
    // CoM 1's Eternal Night resistance penalty is the final stat write before the terminal
    // clamp (0x90B31): after Darkness, Supreme Light's live read, and Tactician.
    // PROVENANCE[eternalNight:enemyResistance:coM1]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:17:72658795c2f8899328df83db
    statStep({ id: 'eternalNight:enemyResistance:coM1', phase: 'c', writes: ['res'],
      when: () => isCoM1 && eternalNightEnemyResPenalty !== 0,
      apply: u => { u.res += eternalNightEnemyResPenalty; } }),
    // --- d: magic calc, in UnitCalc.CAS (Warlord only) ---
    // UnitCalc.CAS line order is load-bearing for the chance record. Mechanical Expert is
    // the first represented phase-d chance writer.
    ...abilByPhase.d.filter(step => step.id === 'mechanicalExpert'),
    // PROVENANCE[weakness:breath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:a64ed4008bd0ec13a817f841
    statStep({ id: 'weakness:breath', phase: 'd', writes: ['rtb'],
      apply: u => { u.rtb += weaknessRtbModCas; } }),
    // PROVENANCE[chance:trueSight:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:4e6f968fae0403b40874b647
    statStep({ id: 'chance:trueSight:ranged', sourceId: 'trueSight', sourceLabel: 'True Sight',
      phase: 'd', writes: ['toHitRtb'], when: () => trueSightRtbToHitBonus !== 0,
      apply: u => { u.toHitRtb += trueSightRtbToHitBonus; } }),
    // Combat-cast Flame Blade's script-only point is Fire Breath, not the selected shared
    // secondary channel. It executes after True Sight and before Berserk, so Warp (region c)
    // cannot halve it and Colossal Strength (later in d) does not scale it.
    // PROVENANCE[flameBlade:fireBreath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:4:549122cfd5e672f77f13100e
    statStep({ id: 'flameBlade:fireBreath', sourceId: 'flameBlade',
      sourceLabel: 'Flame Blade', phase: 'd', writes: ['rtb'],
      when: () => warlordCombatFlameBlade
        && (modernChannelKey ? modernChannelKey === 'fireBreath' : thrownType === 'fire'),
      apply: u => { u.rtb += 1; } }),
    // PROVENANCE[chance:berserkWarlord]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:6:1f86b30d6505c657da0d1205
    statStep({ id: 'chance:berserkWarlord', sourceId: 'berserkWarlord', sourceLabel: 'Berserk',
      phase: 'd', writes: ['toHit', 'toBlk'], when: () => warlordBerserk,
      apply: u => { u.toHit += 15; u.toBlk -= 10; } }),
    ...abilByPhase.d.filter(step => step.id === 'rust'),
    // Hurricane writes the selected modern channel modifier. The card's compatibility pass
    // represents exactly one ranged/Thrown/Breath channel at a time.
    // PROVENANCE[chance:hurricane]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:16:06e78c928483b8a3e5c56c68
    statStep({ id: 'chance:hurricane', sourceId: 'hurricane', sourceLabel: 'Hurricane',
      phase: 'd', writes: ['toHitRtb'], when: () => hurricaneActive,
      apply: u => { u.toHitRtb -= hurricaneRtbPenalty * 100; } }),
    // Favored Terrain is later in the same script, after Hurricane.
    ...abilByPhase.d.filter(step => step.id === 'favoredTerrain'),
    // Colossal Strength scales the attack as it stands at its own position in `d`
    // (UnitCalc.CAS:1227-1243 reads GetStat there), so everything before it in the file
    // scales and everything after does not. Under the buckets its input was a named subtotal;
    // here it is just `u.atk`.
    // PROVENANCE[colossalStrength]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:14:0df535b06a7a126d328bccbb
    statStep({ id: 'colossalStrength', phase: 'd', writes: ['atk', 'rtb'],
      when: () => colossalStrength,
      apply: u => {
        if (hasMeleeAttack) u.atk += colossalScaled(u.atk);
        const physicalSecondary = u.rangedType === 'missile' || u.rangedType === 'boulder'
          || u.thrownType === 'thrown';
        if (u.rtb > 0 && physicalSecondary) u.rtb += colossalScaled(u.rtb);
      } }),
    // The script snapshots Thrown / 2 and (Fire + Lightning) / 2, truncates their combined
    // total once, adds it to melee, then resets each positive source field independently.
    // A probe captures the source value at this exact position without executing the writes.
    // PROVENANCE[vampirism:transfer]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:14:c5d3faadcc9d84865b5f1463
    statStep({ id: 'vampirism:transfer', sourceId: 'vampirism:transfer',
      sourceLabel: 'Vampirism', phase: 'd',
      writes: ['atk', 'rtb', 'vampirismSourceStrength'],
      when: u => vampirismActive && (input._vampirismProbe
        || vampirismAggregateTransfer != null
        || (u.rtb > 0 && ['thrown', 'fire', 'lightning'].includes(u.thrownType))),
      apply: u => {
        const source = u.rtb > 0 && ['thrown', 'fire', 'lightning'].includes(u.thrownType)
          ? u.rtb : 0;
        if (input._vampirismProbe) {
          u.vampirismSourceStrength = source;
          return;
        }
        u.atk += vampirismAggregateTransfer == null
          ? Math.trunc(source / 2) : vampirismAggregateTransfer;
        if (source > 0) u.rtb = 1;
      } }),
    // Shadow Strike follows both Colossal Strength and Vampirism, and therefore reads their
    // live melee result. It writes the independent Thrown field even when another modern
    // attack exists; child passes preserve that channel separation.
    // PROVENANCE[shadowStrike:thrown]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:5:1a3b77e0b9b6ad575bde5d74
    statStep({ id: 'shadowStrike:thrown', sourceId: 'shadowStrike:thrown',
      sourceLabel: 'Shadow Strike', phase: 'd',
      writes: ['rtb', 'rangedType', 'thrownType'], when: () => shadowStrikeApplies,
      apply: u => {
        u.rtb += 1 + Math.trunc(u.atk / 3);
        u.rangedType = 'none';
        u.thrownType = 'thrown';
      } }),
    // Psycho Force (UnitCalc.CAS:1413-1417) and Pneuma Field (:1419-1425) both *read*
    // `GETSTAT(U,SResist,0)` — the Resistance standing at their own position in `d`. That is
    // before region `e`, so neither sees the aura pass: a Holy Bonus or Resistance to All aura
    // raises Resistance afterwards and must not feed either effect. Reading the finished record
    // instead — which is what the pre-step code did — over-applied both whenever an aura was
    // present. `%I` is the integer part, so the division truncates toward zero rather than
    // flooring, which is visible only when a curse has driven Resistance negative.
    // PROVENANCE[psychoForce]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:4:f3235558e9ec7dbd4427844b
    statStep({ id: 'psychoForce', sourceId: 'psychoForce', sourceLabel: 'Psycho Force',
      phase: 'd', writes: ['toHit', 'toBlk'],
      when: () => psychoForceActive,
      apply: u => {
        const psyche = Math.trunc(u.res * levelRank / 2);
        u.toHit += psyche;
        u.toBlk += psyche;
      } }),
    // PROVENANCE[pneumaField]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:7:7f0a838eb82f6cc67584d242
    statStep({ id: 'pneumaField', phase: 'd', writes: ['lifeSteal'],
      when: () => pneumaFieldActive,
      apply: u => {
        const drain = Math.trunc(u.res / 2);
        u.lifeSteal = (u.lifeSteal != null && u.lifeSteal <= 0) ? u.lifeSteal - drain : -drain;
      } }),
    // Energy Cannon reads the live common-plus-ranged threshold here, before region e, and
    // caps only its upper bound. Preserve that snapshot on the same ordered record.
    // PROVENANCE[chance:energyCannonThreshold]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:9:415a610fbab04f989880d02e
    statStep({ id: 'chance:energyCannonThreshold', sourceId: 'energyCannon',
      sourceLabel: 'Energy Cannon', phase: 'd', writes: ['energyCannonToHit'],
      when: () => energyCannon,
      apply: u => { u.energyCannonToHit = Math.min(100, u.toHit + u.toHitRtb); } }),
    // The three effects that close `UnitCalc.CAS`, in its own line order: Blaze of Glory
    // (:1490), Beat of Swiftness (:1509), Hierophany (:1555). All three follow Colossal
    // Strength, and — now that the Warps are in `c` — all three follow those too.
    //
    // Blaze of Glory reads the unit's current Armor, adds that whole value to melee, then
    // subtracts the same value from Defense. The result at this position is exactly zero,
    // including Armor granted by enchantments; later region-e auras can still add Defense.
    // PROVENANCE[blazeOfGlory]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:12:e27e857d1cda6919711e5456
    statStep({ id: 'blazeOfGlory', phase: 'd', writes: ['def', 'atk'],
      when: () => blazeOfGloryActive,
      apply: u => {
        u.atk += u.def;
        u.def = 0;
      } }),
    // PROVENANCE[beatOfSwiftness]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:6:7f8a22e8f9456e94a223b150
    statStep({ id: 'beatOfSwiftness', phase: 'd', writes: ['def'],
      when: () => isWarlord && !!(abilities && abilities.beatOfSwiftness),
      apply: u => { u.def -= roundTiesToEven(u.def / 10); } }),
    // PROVENANCE[hierophany]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:8:d2bbbf57ed3ded3bf92652f9
    statStep({ id: 'hierophany', phase: 'd', writes: ['def'],
      when: () => isWarlord && !!(abilities && abilities.hierophany),
      apply: u => { u.def = Math.floor(u.def * 0.5); } }),
    // --- e: the binary's post-hook tail ---
    // The engine clamps here and nowhere else (+0x0CCBC), after `d` and *before* the aura pass
    // and Supreme Light — so those writes are not clamped afterwards. Misfortune aura type 10
    // can therefore leave melee, Defense, Resistance, or conventional Ranged at -1. The engine
    // clamps Defense, melee, ranged, Thrown and both breaths to at least 0 here; it does not
    // clamp Resistance, and neither does MoM's terminal clamp at
    // 0x90B41-0x90B75. The calculator keeps its own non-negative Resistance convention for the
    // resistance rolls, and its own floor of 1 HP.
    //
    // The slot zeroing is the calculator's, not the engine's: a unit with no base melee attack
    // has none, so bonuses that landed on the empty slot are discarded rather than conjuring
    // one. Blaze of Glory is the exception — its armor-to-melee transfer *does* give a
    // melee-less unit a melee attack, so it widens the slot rather than being discarded by it.
    // Caster.exe clamps the common Hit field first, then clamps each attack-specific
    // modifier against that normalized common value. Keeping these as two steps makes the
    // load-bearing order visible and preserves the channel modifier stored by the engine.
    // PROVENANCE[chance:modernClampCommon]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:7ab1bb7e18b0870f20ec5ada
    statStep({ id: 'chance:modernClampCommon', sourceId: 'statClamp',
      sourceLabel: 'Stat clamp', phase: 'e', writes: ['toHit'],
      when: () => isCoM2,
      apply: u => { u.toHit = Math.max(10, Math.min(100, u.toHit)); } }),
    // PROVENANCE[chance:clamp]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:25:7ab1bb7e18b0870f20ec5ada
    statStep({ id: 'chance:clamp', sourceId: 'statClamp', sourceLabel: 'Stat clamp',
      phase: 'e', writes: ['toHitMelee', 'toHitRtb'], when: () => isCoM2,
      apply: u => {
        u.toHitMelee = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitMelee));
        u.toHitRtb = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitRtb));
      } }),
    // DOS stores one effective threshold per attack and clamps those final thresholds
    // directly. Its To Block floor remains 10%; modern defendchance has no region-e clamp.
    // PROVENANCE[chance:legacyClamp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:20:cb4fa9e7501e8b1aefe9a152 | Reference docs/DOS reconstructed/combat.c@span:21:f6ae6f3564fbf6300c289918
    statStep({ id: 'chance:legacyClamp', sourceId: 'statClamp', sourceLabel: 'Stat clamp',
      phase: 'e', writes: ['toHitMelee', 'toHitRtb', 'toBlk'], when: () => !isCoM2,
      apply: u => {
        u.toHitMelee = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitMelee));
        u.toHitRtb = Math.max(10 - u.toHit, Math.min(100 - u.toHit, u.toHitRtb));
        u.toBlk = Math.max(10, Math.min(100, u.toBlk));
      } }),
    // PROVENANCE[clamp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:21:264ed04fa725139a19a9de7d | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:f42794b5fb78038c35722afa
    statStep({ id: 'clamp', phase: 'e',
      writes: ['res', 'def', 'atk', 'rtb', 'hp', 'gaze', 'doomGaze'],
      apply: u => {
        u.res = Math.max(0, u.res);
        u.def = Math.max(0, u.def);
        u.atk = (hasMeleeAttack || blazeOfGloryActive || (isCoM1 && supremeLightEligible))
          ? Math.max(0, u.atk) : 0;
        u.rtb = rtbStatActive ? Math.max(0, u.rtb) : 0;
        u.hp = Math.max(1, u.hp);
        u.gaze = baseGazeRanged > 0 ? Math.max(0, u.gaze) : 0;
        u.doomGaze = baseDoomGaze > 0 ? Math.max(0, u.doomGaze) : 0;
      } }),
    // The aura pass: Holy Bonus (type 1), Resistance to All (type 3), and Misfortune (type 10).
    ...abilByPhase.e,
    // Q7, closed: Supreme Light is the last stat write the recompute makes, and its defence
    // component is a **live** read of Resistance — after Warp Resist, after `d`, and after the
    // aura pass, which is why the CoM2 manual's changelog says it is "applied last, after
    // Resistance To All, Holy Bonus, and Prayermaster". The melee and ranged additions are
    // each gated on that base attack existing (D24; CoM2 analysis, *Supreme Light*).
    // PROVENANCE[supremeLight]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:21:57c5217db1d984c019548cee
    statStep({ id: 'supremeLight', phase: 'e', writes: ['def', 'atk', 'rtb'],
      when: () => !isCoM1 && supremeLightEligible,
      apply: u => {
        u.def += Math.floor(Math.max(0, u.res) / 3);
        if (hasMeleeAttack) u.atk += 2;
        if (rtbStatActive) u.rtb += supremeLightRtbMod;
      } }),
  ];
  // The raw assembly intentionally keeps the implementation fragments close to their formulas.
  // F20 performs one explicit manifest walk here so the executed list is source ordered, every
  // emitted b/c/d step is covered once, and each returned step carries its source position.
  // UnitCalcPre/UnitCalc are Warlord-only hooks; do not report their definitions as applied
  // no-ops in the DOS or base-CoM2 ledgers, whose checked-in scripts are HALT stubs.
  const applicableRawStatSteps = rawStatSteps.filter(step =>
    (step.phase !== 'b' && step.phase !== 'd') || isWarlord);
  const statSteps = orderStatStepsBySource(applicableRawStatSteps, f20SourceManifests(version));
  // `slots` carries the source-specific attack gates. `melee`, `rtb`, and `ranged` retain the
  // calculated-channel semantics shared by ordinary ability steps. `persistentRanged` is the
  // narrower `BaseUnits.ranged > 0` predicate consumed only by Misfortune's custom aura step.
  //
  // `rtb` is the DOS engines' shared `.ranged` slot; `ranged` is `Caster.exe`'s narrower
  // `unitT.ranged` field, which excludes Thrown, both breaths and the two gazes.
  //
  // `lifeSteal` is on the record because Pneuma Field's `SETSTAT(U,AFLifeSteal,…)` is a write to
  // a unit field at a position, like any other. It is seeded from the effective ability set —
  // the Gnoll Witchdoctor altar grant included — since that is the value standing at region `d`.
  // Identity writes are calculated unit-stat outputs, not UI-control writes. Seed the ordered
  // stat trace with those applied live-field changes so the affected race/fantastic outputs have
  // one trace alongside the numeric stat sequence; no-op identity steps were already omitted by
  // runStatSteps.
  const statTrace = [...identityConversion.trace, ...basePreparationTrace];
  for (let traceOrder = 0; traceOrder < statTrace.length; traceOrder++) {
    statTrace[traceOrder].traceOrder = traceOrder;
  }
  const statExecutionLedger = createStatExecutionTraceLedger();
  const statUnit = runStatSteps(statSteps,
    { res: 0, def: 0, atk: 0, rtb: 0, hp: 0, gaze: 0, doomGaze: 0,
      rangedType: 'none', thrownType: 'none',
      toHit: 30, toHitMelee: 0, toHitRtb: 0, toBlk: 30, energyCannonToHit: null,
      lifeSteal: existingLifeSteal, vampirismSourceStrength: 0 },
    { version,
      trace: statTrace,
      executionTrace: statExecutionLedger,
      assertExecutionTraceOrder: true,
      slots: {
        melee: hasMeleeAttack, rtb: rtbStatActive,
        ranged: rtbStatActive && rangedType !== 'none',
        rangedOrThrown: rtbStatActive && modernRangedOrThrownPass,
        persistentRanged: hasPermanentRangedStat,
        gaze: baseGazeRanged > 0, doomGaze: baseDoomGaze > 0,
      } });
  const hp = statUnit.hp;
  const effectiveGazeRanged = statUnit.gaze;
  const effectiveDoomGaze = statUnit.doomGaze;
  const finalRangedType = statUnit.rangedType;
  const finalThrownType = statUnit.thrownType;
  const appliedRtbToHitWpn = statTrace.some(event => event.id === 'chance:weapon:rtb')
    ? rtbToHitWpn : 0;
  // Psycho Force and Pneuma Field are steps in `d` (see the sequence above), so their reads of
  // Resistance happen where the engine takes them. Warp Resist having zeroed Resistance is
  // supplied by construction, since `warpResist` is a step in `c`.
  const pneumaAbilities = pneumaFieldActive
    ? { ...effectiveAbilities, lifeSteal: statUnit.lifeSteal }
    : effectiveAbilities;
  const combatAbilitiesBase = combatDisciplineNegatesFirstStrike
    ? { ...pneumaAbilities, negateFirstStrike: true }
    : pneumaAbilities;
  const shapedGazeAbilities = !isCoM2 && baseDoomGaze > 0
    ? { ...combatAbilitiesBase, doomGaze: effectiveDoomGaze }
    : combatAbilitiesBase;
  let combatAbilities = gazeDisabled
    ? { ...shapedGazeAbilities, stoningGaze: null, deathGaze: null, doomGaze: 0 }
    : shapedGazeAbilities;
  // Rust eliminates Large Shield for the rest of combat.
  if (rustActive && combatAbilities.largeShield) {
    combatAbilities = { ...combatAbilities, largeShield: false };
  }

  // Hierophany (Warlord Life uncommon combat curse): the landed curse strips the target's
  // immunities, Lightning Resist, Negate First Strike, Merging, and Teleporting. The latter two
  // are combat-damage-relevant because FirewallEffect reads their calculated values. The
  // half-Defense penalty is applied in the ordered record above. The calculator models only the
  // landed outcome, so the strip is unconditional when active.
  combatAbilities = applyHierophanyAbilityStrip(combatAbilities, isWarlord);

  // Compatibility breakdowns retained for the card. The authoritative values now come
  // directly from the ordered record above.
  const meleeToHitBonus = statUnit.toHit + statUnit.toHitMelee - 30 - baseToHitMod;

  // Distance penalty (attacker ranged only)
  let rtbDistPenalty = 0;
  if (prefix === 'a' && (rangedType === 'missile' || rangedType === 'boulder') && input.rangedCheck) {
    const dist = Math.max(1, parseInt(input.rangedDist) || 1);
    rtbDistPenalty = distancePenalty(dist, rangedType, !!(abilities && abilities.longRange), version,
      isHero);
  }

  // Region-e has already normalized modern common/channel Hit fields. Ranged distance is a
  // later per-attack write and remains below in the resolution sequence.
  let toHitMelee = Math.max(0.1, Math.min(1, (statUnit.toHit + statUnit.toHitMelee) / 100));
  let toHitRtb = Math.max(0.1, Math.min(1, (statUnit.toHit + statUnit.toHitRtb) / 100));
  // Caster.exe does not clamp defendchance during recalculation; Random(100) threshold
  // comparison naturally bounds the effective probability to 0..100.
  let toBlock = Math.max(0, Math.min(1, statUnit.toBlk / 100));
  if (energyCannon) {
    // UnitCalc.CAS:1435-1443 reads the unit's To-Hit + Ranged To-Hit
    // stats, capped at 100. Attack-distance and battlefield penalties are
    // applied later and do not change the permanent Destruction modifier.
    const destructionPenalty = Math.trunc(statUnit.energyCannonToHit / 15);
    // UnitCalc.CAS reads and writes AFDestruction record 3 (ranged). Keep that value
    // separate from a unit's general Destruction so melee and Thrown do not inherit the
    // Energy Cannon rider when combat normalization merges phase-specific flag records.
    const currentDestruction = combatAbilities.energyCannonDestruction;
    const energyDestruction = currentDestruction != null && currentDestruction <= 0
      ? currentDestruction - destructionPenalty
      : -destructionPenalty;
    combatAbilities = { ...combatAbilities, energyCannonDestruction: energyDestruction };
  }
  // Immolation To Hit: always base 30%, ignoring all modifiers (it's a spell attack)
  let toHitImmolation = 0.3;

  // Warp Reality also affects Immolation's separate spell-attack chance. Common unit To Hit
  // is already written on the ordered stat record above.
  if (warpRealityActive && !unitIsChaos) {
    toHitImmolation = Math.max(0.1, toHitImmolation - 0.2);
  }

  // Hurricane (Warlord Nature rare, global): tropical storm affecting both sides.
  // -20% To Hit for ranged/thrown attacks, -30% To Hit for breath attacks.
  // Breath is identified by thrownType fire/lightning; that is the only case toHitRtb
  // represents a breath attack (ranged attacks are never breath). Melee is unaffected.
  // The persistent Hurricane channel write is already on the ordered stat record.

  // Warlord True Light: illusion attacks suffer -10% To Hit, for all units
  // regardless of realm (this clause is Warlord-only; not present in MoM).
  // The persistent True Light common write is already on the ordered stat record.

  let displayToHitMelee = toHitMelee;
  let displayToHitRtb = toHitRtb;
  let displayToBlock = toBlock;

  // Vertigo: reflect the displayed penalty in the red To Hit / To Block numbers.
  // MoM:  -20% To Hit, -1 Defense (the defense die penalty is applied at `displayDef`).
  // CoM 1: -30% To Hit, -10% To Block.
  // CoM2/Warlord: -25% To Hit, -7% To Block — the compiled block reads -25/-7
  // (`Reference docs/Caster binary/CoM2 binary analysis.md`), not CoM 1's -30/-10.
  // The persistent Vertigo chance writes are already on the ordered stat record.

  // Every persistent stat and chance total is the ordered record's output. The remaining
  // chance work below is limited to later per-attack resolution modifiers.
  const finalAtk = statUnit.atk;
  const finalDef = statUnit.def;
  const finalRtb = statUnit.rtb;
  const finalRes = statUnit.res;
  // Berserk's persistent chance writes are already on the ordered stat record.

  // Conjuring Pact nausea (Warlord Conjurer retort): a non-fantastic unit struck by
  // Conjuring Pact suffers -10% To Hit and -10% To Defend for the rest of combat.
  // Only the normal-unit debuff is modelled here (the fantastic-creature taming
  // branch is out of scope), so gate to Warlord and to normal units.
  // Nausea's persistent chance writes are already on the ordered stat record.

  // Plague (Warlord combat curse): −10% To-Hit on the cursed unit (the −3/−3/−6 stat
  // penalties are folded into atk/def/res above). Goblin Pox carries no To-Hit penalty.
  // Plague's persistent common chance write is already on the ordered stat record.

  // Great Unbinding (Warlord Sorcery very rare global): −20% To-Hit and −20% To-Defend
  // on opponent fantastic creatures for the rest of battle (the −2 Resistance is folded
  // into res above). Only fantastic creatures are affected.
  // Great Unbinding's persistent common chance writes are already on the ordered record.

  const displayDef = (vertigoActive && !isCoMVersion) ? Math.max(0, finalDef - 1) : finalDef;

  // R7.3 chance trace. To Hit and To Block already execute on the authoritative ordered
  // `statSteps` record. Project those recorded deltas into the separate display/effective
  // resolution trace so every displayed write keeps its source and running before/after value.
  const chanceTrace = [];
  const chanceFields = {
    melee: ['toHitMelee', 'displayToHitMelee'],
    rtb: ['toHitRtb', 'displayToHitRtb'],
    block: ['toBlock', 'displayToBlock'],
  };
  const chanceContributions = [];
  let chanceSerial = 0;
  function addChanceContribution(id, source, phase, order, deltas) {
    if (!Object.values(deltas).some(value => value !== 0)) return;
    chanceContributions.push({ id, source, phase, order, deltas, serial: chanceSerial++ });
  }
  function addChanceDelta(id, source, phase, order, fields, value) {
    const deltas = {};
    for (const field of fields) deltas[field] = value;
    addChanceContribution(id, source, phase, order, deltas);
  }

  for (const event of statTrace) {
    const deltas = {};
    const commonHitDelta = event.changes.toHit ? event.changes.toHit.delta : 0;
    const meleeHitDelta = commonHitDelta
      + (event.changes.toHitMelee ? event.changes.toHitMelee.delta : 0);
    const rtbHitDelta = commonHitDelta
      + (event.changes.toHitRtb ? event.changes.toHitRtb.delta : 0);
    for (const field of chanceFields.melee) deltas[field] = meleeHitDelta;
    for (const field of chanceFields.rtb) deltas[field] = rtbHitDelta;
    if (event.changes.toBlk) {
      for (const field of chanceFields.block) deltas[field] = event.changes.toBlk.delta;
    }
    const projectedId = event.id === 'trueLight' ? 'chance:trueLightIllusion'
      : event.id.startsWith('chance:') ? event.id : `chance:${event.id}`;
    addChanceContribution(projectedId,
      event.source, event.phase, event.order, deltas);
  }
  // PROVENANCE[chance:distancePenalty]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:28:4d6d2024c9551eae456f2bbf | Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:21:b13db6265b2feaabf81fb261 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:6:791acb631b8f903c2812da35 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:6:791acb631b8f903c2812da35
  addChanceDelta('chance:distancePenalty', { id: 'distancePenalty', label: 'Range distance' },
    'attackSpecific', -100, chanceFields.rtb, rtbDistPenalty);

  // The complete stat ledger above follows the compiled source map. Keep the pre-F20 public
  // To-Hit projection's established CoM2 presentation order for the material contribution,
  // which historically appeared before Lucky even though the calculated material-strength
  // write executes after Lucky. This projection does not feed the stat or execution ledger.
  if (isCoM2) {
    const weaponContributions = chanceContributions.filter(item =>
      item.id === 'chance:weapon:melee' || item.id === 'chance:weapon:rtb');
    const luckyIndex = chanceContributions.findIndex(item => item.id === 'chance:lucky');
    if (weaponContributions.length > 0 && luckyIndex >= 0) {
      const withoutWeapon = chanceContributions.filter(item =>
        item.id !== 'chance:weapon:melee' && item.id !== 'chance:weapon:rtb');
      const projectedLuckyIndex = withoutWeapon.findIndex(item => item.id === 'chance:lucky');
      chanceContributions.length = 0;
      chanceContributions.push(
        ...withoutWeapon.slice(0, projectedLuckyIndex),
        ...weaponContributions,
        ...withoutWeapon.slice(projectedLuckyIndex),
      );
    }
  }
  // STAT-FORMULA[chance:dynamicProjection]
  // PROVENANCE[chance:dynamicProjection]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:14:8afd898f274ed76b7474ccfc | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:18:5d84b2c3857f747269473386 | Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:10:013e80fc5cd1dea733651726
  const chanceSteps = chanceContributions.map(item => statStep({
    id: item.id, sourceId: item.source.id, sourceLabel: item.source.label,
    phase: item.phase, writes: Object.keys(item.deltas),
    apply: u => {
      for (const [field, value] of Object.entries(item.deltas)) u[field] += value;
    },
  }));
  const allChanceFields = Object.values(chanceFields).flat();
  const allHitFields = [...chanceFields.melee, ...chanceFields.rtb];
  chanceSteps.push(
    // AttackRoll floors To Hit at 10, then compares Random(100) directly with the supplied
    // threshold. The late aura pass can raise the already-clamped record above 100, and range
    // penalties are applied after recalculation, so project the actual comparison boundary here.
    // PROVENANCE[chance:attackRollProbabilityBound]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:9:a1152c71125049b18e8745a4
    statStep({ id: 'chance:attackRollProbabilityBound', sourceId: 'attackRoll',
      sourceLabel: 'Attack-roll threshold', phase: 'attackSpecific', writes: allHitFields,
      when: () => isCoM2, apply: u => {
        for (const field of allHitFields) u[field] = Math.max(10, Math.min(100, u[field]));
      } }),
    // DefenseRoll compares Random(100), whose output is 0..99, directly against the
    // signed record value. Project that comparison to the calculator's displayed/effective
    // probability without pretending Caster.exe wrote a region-e To-Defend clamp.
    // PROVENANCE[chance:toBlockProbabilityBound]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Combat.ResolutionHelpers.pas@span:12:08b392da258c1aa5831668e7
    statStep({ id: 'chance:toBlockProbabilityBound', sourceId: 'defenseRoll',
      sourceLabel: 'Defense-roll threshold', phase: 'attackSpecific', writes: chanceFields.block,
      when: () => isCoM2, apply: u => {
        for (const field of chanceFields.block) u[field] = Math.max(0, Math.min(100, u[field]));
      } }),
  );
  // Most of this sequence is projected from the stat ledger, so its entries inherit their
  // canonical scope from the step they project (steps.js, resolveStepVersionScope).
  if (statStepDebugEnabled()) {
    assertSequenceVersionScopeCoverage(chanceSteps, 'To-Hit/To-Block ledger');
  }
  const chanceUnit = runStatSteps(chanceSteps, {
    toHitMelee: 30, toHitRtb: 30, toBlock: 30,
    displayToHitMelee: 30, displayToHitRtb: 30, displayToBlock: 30,
  }, { version, trace: chanceTrace });
  // These assignments make the traced execution path authoritative.  Focused tests assert
  // parity with the existing formulas across the full preset suite.
  toHitMelee = chanceUnit.toHitMelee / 100;
  toHitRtb = chanceUnit.toHitRtb / 100;
  toBlock = Math.max(0, Math.min(1, chanceUnit.toBlock / 100));
  displayToHitMelee = chanceUnit.displayToHitMelee / 100;
  displayToHitRtb = chanceUnit.displayToHitRtb / 100;
  displayToBlock = Math.max(0, Math.min(1, chanceUnit.displayToBlock / 100));

  const figureTrace = [];
  const figureSteps = [
    // PROVENANCE[altarOfTheSun:figures]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:12:08e36e60187df8bc650c42c7
    statStep({ id: 'altarOfTheSun:figures', sourceId: 'altarOfTheSun',
      sourceLabel: 'Altar of the Sun', phase: 'base', writes: ['figs'],
      when: () => altarOfTheSun, apply: u => { u.figs += 1; } }),
    // PROVENANCE[alumniOfAcademy:figures]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS@span:10:848b52c34c24d8642625dae6 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS@span:18:55478fbb88ad8926f0ce7c78
    statStep({ id: 'alumniOfAcademy:figures', sourceId: 'alumniOfAcademy',
      sourceLabel: 'Academy', phase: 'base', writes: ['figs'],
      when: () => alumniOfAcademy, apply: u => { u.figs += 2; } }),
  ];
  if (statStepDebugEnabled()) {
    assertSequenceVersionScopeCoverage(figureSteps, 'figure sequence');
  }
  const figureUnit = runStatSteps(figureSteps, { figs: baseFigs },
    { version, trace: figureTrace });

  const modifierTraces = {
    figures: projectStatTrace(figureTrace, 'figs', baseFigs, figureUnit.figs),
    melee: projectStatTrace(statTrace, 'atk', inputBaseAtk, finalAtk),
    sharedAttack: projectStatTrace(statTrace, 'rtb', inputBaseRtb, finalRtb),
    defense: projectStatTrace(statTrace, 'def', inputBaseDef, displayDef),
    resistance: projectStatTrace(statTrace, 'res', inputBaseRes, finalRes),
    hits: projectStatTrace(statTrace, 'hp', inputBaseHP, hp),
    gaze: projectStatTrace(statTrace, 'gaze', baseGazeRanged, effectiveGazeRanged),
    doomGaze: projectStatTrace(statTrace, 'doomGaze', baseDoomGaze, effectiveDoomGaze),
    toHitMelee: projectStatTrace(chanceTrace, 'displayToHitMelee', 30,
      chanceUnit.displayToHitMelee, { unit: 'percent' }),
    toHitRanged: projectStatTrace(chanceTrace, 'displayToHitRtb', 30,
      chanceUnit.displayToHitRtb, { unit: 'percent' }),
    toBlock: projectStatTrace(chanceTrace, 'displayToBlock', 30,
      chanceUnit.displayToBlock, { unit: 'percent' }),
    race: projectStatTrace(identityConversion.trace, 'race', identity.baseRace, identity.race),
    fantastic: projectStatTrace(identityConversion.trace, 'fantastic',
      identity.baseFantastic, identity.fantastic),
    modernAttacks: {},
  };
  appendProjectedTraceEntry(modifierTraces.defense, {
    id: 'displayDefense:vertigo', sourceId: 'vertigo', sourceLabel: 'Vertigo',
    phase: 'attackSpecific', order: 0,
  }, finalDef, displayDef);

  const toHitMeleeHasModifiers = modifierTraces.toHitMelee.entries.length > 0;
  const toHitRtbHasModifiers = modifierTraces.toHitRanged.entries.length > 0;
  const toBlockHasModifiers = modifierTraces.toBlock.entries.length > 0;

  const totalDamage = Math.max(0, parseInt(input.dmg) || 0);
  const carriesHealingState = true;
  const irrecoverableDamage = carriesHealingState
    ? Math.min(totalDamage, Math.max(0, parseInt(input.irrecoverableDamage) || 0)) : 0;
  const undeadDamage = carriesHealingState
    ? Math.min(totalDamage - irrecoverableDamage,
      Math.max(0, parseInt(input.undeadDamage) || 0)) : 0;
  const extraHitsCap = version === 'com_6.08' || version.startsWith('com2_') ? 90 : 255;
  const baseBonusHp = carriesHealingState
    ? Math.min(extraHitsCap, Math.max(0, parseInt(input.baseBonusHp) || 0)) : 0;
  const carriesModernHealingState = version.startsWith('com2_');
  const noHealing = carriesModernHealingState && (!!input.noHealing
    || hasAbil(combatAbilities, 'undead')
    || hasAbil(combatAbilities, 'animated')
    || hasAbil(combatAbilities, 'mysticSurge'));

  const result = {
    // Base values (for display)
    baseAtk: inputBaseAtk, baseRtb: inputBaseRtb, baseDef: inputBaseDef, baseRes: inputBaseRes, baseHP: inputBaseHP,
    baseToHitMod, baseToHitRtbMod, baseToBlkMod,
    // Bonus breakdown (for display)
    atkBonus: finalAtk - inputBaseAtk,
    rtbBonus: finalRtb - inputBaseRtb,
    defBonus: displayDef - inputBaseDef,
    resBonus: finalRes - inputBaseRes,
    hpBonus: hp - inputBaseHP,
    meleeToHitBonus,
    rtbToHitWpnBonus: appliedRtbToHitWpn,
    rtbToHitLvlBonus: lvl.toHit,
    rtbDistPenalty,
    toHitMeleeHasModifiers,
    toHitRtbHasModifiers,
    toBlockHasModifiers,
    // Effective values (for calculation)
    figs: figureUnit.figs,
    atk: finalAtk, def: finalDef, res: finalRes, hp, rtb: finalRtb, effectiveGazeRanged, effectiveDoomGaze, baseGazeRanged, baseDoomGaze, weapon: effectiveWeapon, unitType: unitTypeVal, isHero, generic: !!input.generic,
    encMagic: modernEncMagic,
    encMagicIndependentOfMaterial: modernEncMagicIndependentOfMaterial,
    baseDeathImmunity,
    identity,
    identityTrace: identityConversion.trace,
    statTrace,
    modifierTraces,
    dmg: totalDamage,
    totalDamage,
    irrecoverableDamage,
    undeadDamage,
    baseBonusHp,
    noHealing,
    rangedType: finalRangedType, thrownType: finalThrownType,
    rangedGetsWpn, thrownGetsWpn: finalThrownType === 'thrown',
    cityWallBonus,
    wpn, lvl,
    // Display values (can include modifiers that resolveCombat also applies internally)
    displayDef,
    displayToHitMelee,
    displayToHitRtb,
    displayToBlock,
    // Pre-clamped combat values
    toHitMelee, toHitRtb, toHitImmolation, toBlock,
    // Abilities (for combat flow modifiers)
    abilities: combatAbilities,
    // Informational spell/charge and grant package. Spellcasting itself remains outside
    // the one-round damage resolver, but callers and the UI state can inspect the exact choice.
    marionette,
    ...(input._vampirismProbe
      ? { _vampirismSourceStrength: statUnit.vampirismSourceStrength } : {}),
  };
  // Keep the complete structural ledger available to direct callers and focused diagnostics,
  // but out of the enumerable combat payload. Matrix workers clone many derived records and do
  // not consume trace metadata; cloning the complete ledger there would turn a debug contract
  // into a UI performance cost.
  Object.defineProperty(result, 'statExecutionTrace', {
    enumerable: false,
    get: () => statExecutionLedger.materialize(),
  });

  // Modern units have four independent attack fields. Derive each one through the
  // existing ordered sequence in isolation: this preserves every transform's position
  // while the legacy RTB value remains only a pre-R4 card projection.
  // `_modernChannelPass` prevents those child derivations from recursing again.
  if (version.startsWith('com2') && input.modernAttacks && !input._modernChannelPass) {
    const channels = {};
    const modernInputs = { ...input.modernAttacks };
    const baseModernHasRanged = !!(modernInputs.ranged && modernInputs.ranged.strength > 0);
    const baseModernHasThrown = !!(modernInputs.thrown && modernInputs.thrown.strength > 0);
    // Focus reads the calculated Thrown field but the persistent conventional-ranged field.
    // Bombs & Grenades can therefore create the branch owner in phase b even though the
    // permanent Thrown field was empty.
    const focusMagicRangedOwner = baseModernHasRanged ? 'ranged'
      : (baseModernHasThrown || bombsGrenades) ? 'thrown' : 'ranged';
    const splitConvertedThrownForShadow = shadowStrikeActive && focusMagicActive
      && baseModernHasThrown && !baseModernHasRanged;
    // These effects can create a field from an otherwise attack-less unit.  Seed that
    // field so its normal source-ordered derivation performs the grant; every other
    // absent field stays absent.
    if (abilities.shadowStrike && (!baseModernHasThrown || splitConvertedThrownForShadow)) {
      const shadowKey = splitConvertedThrownForShadow ? 'shadowStrikeThrown' : 'thrown';
      modernInputs[shadowKey] = { strength: 0, type: 'thrown' };
    }
    // Bombs & Grenades writes the independent Thrown field regardless of any conventional
    // ranged or Breath field already present.
    if (bombsGrenades && !modernInputs.thrown) {
      modernInputs.thrown = { strength: 0, type: 'thrown' };
    }
    // Focus Magic always executes its ranged branch. Breath and gaze fields do not prevent
    // creation of ranged 3; only an existing conventional ranged or convertible Thrown does.
    if (focusMagicActive && !baseModernHasRanged && !baseModernHasThrown && !bombsGrenades
      && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: 'none' };
    }
    if ((marionetteOwned || marionetteStrayed) && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: marionette.rangedType };
    }
    // Unconditional: the grant is `firebreath += 4` whatever else the unit carries, so the
    // channel must exist even beside a gaze, a lightning breath or a thrown attack.
    if (ccFireBreathGranted && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'none' };
    }
    // UnitCalc.CAS writes `SFireBreath := SFireBreath + 1` without an existence gate, so
    // combat-cast Flame Blade creates a strength-1 Fire Breath on a unit that had none.
    if (warlordCombatFlameBlade && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'fire' };
    }
    // CreateUnit.CAS adds 2 without an existence gate, so the building creates this channel.
    if (dragonMound && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'fire' };
    }
    if (lightningBladeAbil) {
      if (baseModernHasThrown) delete modernInputs.lightningBreath;
      else modernInputs.lightningBreath = { strength: 0, type: 'none' };
    }
    for (const [key, attack] of Object.entries(modernInputs)) {
      const channelKey = key === 'shadowStrikeThrown' ? 'thrown' : key;
      const seeded = (channelKey === 'ranged' && focusMagicActive)
        || (channelKey === 'ranged' && (marionetteOwned || marionetteStrayed))
        || (channelKey === 'fireBreath' && ccFireBreathGranted)
        || (channelKey === 'fireBreath' && warlordCombatFlameBlade)
        || (channelKey === 'fireBreath' && dragonMound)
        || (channelKey === 'lightningBreath' && lightningBladeAbil)
        || key === 'shadowStrikeThrown';
      if (!attack || (attack.strength <= 0 && channelKey !== 'thrown' && !seeded)) continue;
      const child = deriveUnitStats({
        ...input,
        modernAttacks: null,
        _modernChannelPass: true,
        _modernChannelKey: channelKey,
        _modernBaseHasRanged: baseModernHasRanged,
        _focusMagicRangedBranchOwner: focusMagicRangedOwner,
        _skipFocusRangedBranch: key === 'shadowStrikeThrown',
        _deferShadowStrike: splitConvertedThrownForShadow && key === 'thrown',
        _vampirismAggregateTransfer: vampirismAggregateTransfer,
        rtb: attack.strength,
        rtbType: attack.type,
      });
      if (child.rtb <= 0) continue;
      const outputKey = child.rangedType !== 'none' ? 'ranged'
        : child.thrownType === 'thrown' ? 'thrown'
        : child.thrownType === 'fire' ? 'fireBreath'
        : child.thrownType === 'lightning' ? 'lightningBreath'
        : null;
      // Rust can eliminate an existing Thrown field.  A channel with no resolved
      // attack type must not survive merely because it still has a positive stat value.
      if (!outputKey) continue;
      channels[outputKey] = {
        baseStrength: attack.strength,
        strength: child.rtb,
        type: child.rangedType !== 'none' ? child.rangedType : child.thrownType,
        toHit: child.toHitRtb,
        // Preserve the atomic channel execution log as well as its strength projection.
        // Type-only Focus conversions otherwise disappear from every exposed trace.
        statTrace: child.statTrace,
        modifierTrace: child.modifierTraces.sharedAttack,
        toHitTrace: child.modifierTraces.toHitRanged,
      };
      result.modifierTraces.modernAttacks[outputKey] = child.modifierTraces.sharedAttack;
    }
    result.modernAttacks = channels;
  }

  return result;
}
