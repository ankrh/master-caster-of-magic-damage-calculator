// --- Unit Stat Derivation: unit identity and its ordered conversions ---
// Identity construction, the live unit-type projection, and the permanent ability grants
// deriveUnitStats (stats.js) resolves before the stat sequence runs.

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
// The same `|| 'arcane'` also absorbs Fantastic + a mundane base race, a control pair the UI
// allows and `UNITS.INI` cannot express. F113 left it rather than converting a live UI path into
// a crash with no sourced answer to replace it; the question is BACKLOG Q28.
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
  return 'fantastic_' + (realm || 'arcane');   // Fantastic + a mundane race: BACKLOG Q28
}

// Identity conversions write the live race and Fantastic fields directly. The compact
// `unitType` token is projected from those fields only after the sequence, so no conversion
// reads or writes it and the base predicates stay available to later gates. The source
// identity and editable base predicates remain intact; this sequence mutates only the fresh
// live fields used by later stat gates. The template/name checks here correspond to
// execution-time reads in the modern/DOS constructors and are not persisted UI state.
//
// Six conversions carry a `:race` qualifier because the engine block that writes the realm
// also writes a stat, and the calculator runs identity in a separate pre-pass: `c:mysticSurge`
// and `c:mysticSurge:race` are the two positions one region-`c` block reaches here. This is the
// same surviving qualifier `base:zombies:toBlock` uses, for the same reason.
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
  // and custom units do not establish the identity. The spell itself is sourced on
  // PROVENANCE[callToArmsPaladins] below, which lies outside this block's anchor window.
  const isCallToArmsPaladins = !!(isBaseCoM2
    && combatSummonedValue
    && sourceTemplateId === 113);
  // Fiery Fury and Sanctify read the permanent record, not the running one: `BASEFANTASTIC(U)`
  // and `ISHERO(U)` are base-record predicates in UnitCalcPre.CAS.
  const baseFantastic = !!identity.baseFantastic;
  const isHero = typeof meta.isHero === 'boolean' ? meta.isHero : !!identity.isHero;

  const identitySteps = [
    // PROVENANCE[zombies]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c@span:25:3ed9fd7025a17d7041e72be8
    statStep({ id: 'zombies', phase: 'base', writes: ['fantastic'],
      when: () => isCoM1 && identity.specialUnit === 'zombies',
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[constructCatapult]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:33:d95c9aa843da2010e42b8f16 | Reference docs/Caster binary/Spells.CombatSummonUnit.pas@span:21:1650fe50059f7cde525a29fd | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:13:22d4847c5bd5843526ea3fc0 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:14:0c00ef951862849e15604add | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:18:0dad2f766ea1e74b0aa62aa1
    statStep({ id: 'constructCatapult', phase: 'base', writes: ['race', 'fantastic'],
      when: () => isCoM1 && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // PROVENANCE[summonBranch]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/combat.c@span:33:d95c9aa843da2010e42b8f16
    statStep({ id: 'summonBranch', phase: 'base', writes: ['race', 'fantastic'],
      when: () => isCoM1SummonBranch,
      apply: u => {
        if (sourceTemplateId === 113) u.race = 'Life';
        if (sourceTemplateId === 54) u.race = 'Nature';
        u.fantastic = true;
      } }),
    // PROVENANCE[combatSummoned]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:3:8b5b382b46651d5d1ddfb014
    statStep({ id: 'combatSummoned', phase: 'a', writes: ['fantastic'],
      when: () => isModern && combatSummonedValue,
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[chosen]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:7:c9d9c1b29c14707318605a05 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI@span:1:f9fdc8e8e8cb9c94edf0f936 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI@span:1:f9fdc8e8e8cb9c94edf0f936
    statStep({ id: 'chosen', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isModern && identity.specialUnit === 'chosen',
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    statStep({ id: 'constructCatapult', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isBaseCoM2 && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // PROVENANCE[callToArmsPaladins]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Spells.CombatSummonUnit.pas@span:21:1650fe50059f7cde525a29fd | TABLE=Reference docs/Script source/CoM2 1.05.11 base/spells.ini@span:13:fff6a55971377c87264d2e0d | TABLE=Reference docs/Script source/Warlord 1.5.12.7/spells.ini@span:13:5f2ec3d006ad08bc02189c7b
    statStep({ id: 'callToArmsPaladins', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isBaseCoM2 && isCallToArmsPaladins,
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // The Chaos Channels breath block writes the realm beside the fire-breath assignment in
    // every engine, but not in the same region. `Caster.exe` makes it at $00599EE8, ahead of
    // the UnitCalcPre hook, so the modern builds keep phase `a`; the DOS builds make it inside
    // `BU_Apply_Specials` at 131:0x8F720 / com1:0x8F474, one block past the demon-wings write
    // the chains already place in region `c`, so their half is `c` at that address (F103).
    // Both MoM builds set the realm alone — a race at or above the first fantastic value is
    // fantastic there whether or not `UA_FANTASTIC` is set (`unitcalc.c`, the
    // `bu->race >= RACE_FIRST_FANTASTIC` test) — so writing both fields here matches all five.
    // PROVENANCE[chaosChannels:fireBreath:race]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:6:b9b73d98478711f2be56c0a9 | Reference docs/DOS reconstructed/unitcalc.c@span:7:8ee2be8fe3596d5bdc7acc0a | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:6:c39e26f9ccd713b815403313
    ...['a', 'c'].map(phase => statStep({
      id: 'chaosChannels:fireBreath:race', sourceId: 'chaosChannels:fireBreath',
      sourceLabel: 'Chaos Channels', phase, writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccFireBreath', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } })),
    // PROVENANCE[marionetteChanneler]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:18:7fc6696ac3aab07e8d549913
    statStep({ id: 'marionetteChanneler', phase: 'b', writes: ['fantastic'],
      when: () => version === MARIONETTE_VERSION
        && identity.heroTypeId === MARIONETTE_HERO_TYPE_ID
        && !!(abilities && abilities.channeler),
      apply: u => { u.fantastic = true; } }),
    // The THEN arm of Fiery Fury's one `IF (BASEFANTASTIC(U))`; `b:fieryFury` is its ELSE arm.
    // PROVENANCE[fieryFury:race]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:17:e0211f9ae323b4ad5ba16aa7
    statStep({ id: 'fieryFury:race', sourceId: 'fieryFury', sourceLabel: 'Fiery Fury',
      phase: 'b', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'fieryFury') && baseFantastic,
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // Sanctify writes the Life realm unconditionally; its separate Fantastic write is gated on
    // a non-hero clergy unit. Two writes, not the three-branch compact-token approximation the
    // realm-less `hero` token used to force.
    // PROVENANCE[sanctify]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS@span:9:e23e1931b3ccaf4ea86bae2e
    statStep({ id: 'sanctify', sourceLabel: 'Sanctify', phase: 'b',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'sanctify'),
      apply: u => {
        u.race = 'Life';
        if (hasAbil(abilities, 'clergy') && !isHero) u.fantastic = true;
      } }),
    // PROVENANCE[destiny:race]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas@span:19:e90777a680ce0ccd0df5ea87
    statStep({ id: 'destiny:race', sourceId: 'destiny', sourceLabel: 'Destiny', phase: 'c',
      writes: ['race', 'fantastic'],
      when: () => destinyActiveForUnit(abilities, version),
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // PROVENANCE[chaosChannels:flight]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:2ae7951f1bbf4272fb3fb151 | Reference docs/DOS reconstructed/unitcalc.c@span:6:e09942f2ee9f377d85168241 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:11:81ed5af7fe4aa5e7b8bcf958
    statStep({ id: 'chaosChannels:flight',
      sourceLabel: 'Chaos Channels', phase: 'c', writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccFlight', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // PROVENANCE[chaosChannels:armor:race]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:7:bd2b6b86ac7fbcc85505a039 | Reference docs/DOS reconstructed/unitcalc.c@span:6:2202b972a2c87abe05bad467 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:8:490bf1c3cfe8b5827cde324a
    statStep({ id: 'chaosChannels:armor:race', sourceId: 'chaosChannels:armor',
      sourceLabel: 'Chaos Channels', phase: 'c', writes: ['race', 'fantastic'],
      when: () => !!abilVal(abilities, 'ccDefense', false),
      apply: u => { u.race = 'Chaos'; u.fantastic = true; } }),
    // Warlord is out of scope rather than gated: `UnitCalc.CAS` recasts the spell as Frenzy and
    // sets `EncBloodLust` only afterwards, so the compiled region-`c` block never sees the flag.
    // PROVENANCE[bloodLust]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c@span:7:43a34010d4b8c511782d0586 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:13:ef98ab4f1bd2277cbd5fb59a | Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:10:22628deef93aef7a52582f1a
    statStep({ id: 'bloodLust', sourceLabel: 'Blood Lust', phase: 'c',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'bloodLust'),
      apply: u => { u.race = 'Death'; u.fantastic = true; } }),
    // PROVENANCE[blackChannels:race]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c@span:19:4a92e2a9611b35504558f854
    statStep({ id: 'blackChannels:race', sourceId: 'blackChannels',
      sourceLabel: 'Black Channels', phase: 'c', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'blackChannels'),
      apply: u => { u.race = 'Death'; u.fantastic = true; } }),
    // One conversion for both controls: CoM 1's Animated block writes the Death realm itself,
    // and `Caster.exe`'s Animated block sets `EncUndead` for the aggregate normalization that
    // follows it. `c:animated` carries the same block's stat half.
    // PROVENANCE[undead]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:5:e9bb34d05b36853748045d37 | Reference docs/DOS reconstructed/unitcalc.c@span:8:204c1ca5e5884733de92e687 | Reference docs/DOS reconstructed/unitcalc.c@span:19:6f6aeaf7cbc23a280cd7996e | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:17:b7e9d476a7f9ec33bbaca56c | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:10:53a2c4bd769924b58f286c8d
    statStep({ id: 'undead', sourceLabel: 'Undead', phase: 'c', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'undead') || hasAbil(abilities, 'animated'),
      apply: u => { u.race = 'Death'; u.fantastic = true; } }),
    // PROVENANCE[mysticSurge:race]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c@span:8:185c85844cf35c344b38d022 | Reference docs/Caster binary/Units.RecalculateUnits.pas@span:23:662a6a49c604798625ed7e49
    statStep({ id: 'mysticSurge:race', sourceId: 'mysticSurge', sourceLabel: 'Mystic Surge',
      phase: 'c', writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'mysticSurge'),
      apply: u => { u.race = 'No Heal'; u.fantastic = true; } }),
    // PROVENANCE[raiseDead]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/combat.c@span:38:1261faf60c16514c7ab3e276 | Reference docs/Caster binary/Spells.InitializeCombatSpellcasting.pas@span:28:deb5b65ff17f3f2812792a90
    statStep({ id: 'raiseDead', sourceLabel: 'Raise Dead', phase: 'c',
      writes: ['race', 'fantastic'],
      when: () => hasAbil(abilities, 'raiseDead'),
      apply: u => { u.race = 'No Heal'; u.fantastic = true; } }),
    // PROVENANCE[spiritLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS@span:1:15d81b9f3b72c934c9219502 | Reference docs/Script source/Warlord 1.5.12.7/OLSpell.CAS@span:10:33b04c988e4846d5dfe6cfbd
    statStep({ id: 'spiritLink', phase: 'd', writes: ['fantastic'],
      when: () => !!(version && version.startsWith('com2_warlord')) && !!(abilities && abilities.spiritLink),
      apply: u => { u.fantastic = false; } }),
  ];
  // F20: identity writes in b or d are represented CAS writes like any other, so they go
  // through the same manifest walk. That is what stops one from being added later and never
  // reaching a manifest. The canonical version scope filters this sequence exactly as it
  // filters the stat sequence, so an identity conversion an engine does not make is absent
  // rather than present with a false predicate.
  const applicableIdentitySteps = filterStepsToVersionScope(identitySteps, version);
  runStatSteps(orderStatStepsBySource(applicableIdentitySteps, statChain(version)),
    live, { version, base: identity, trace });
  return { identity: live, trace, isConstructCatapult };
}

// Lava Smelter (Warlord): five independent flags record the permanent mineral-pair grants already
// carried by the unit. New Dwarf units receive them when trained; Upgrade & Retrain can apply
// them later to any existing non-fantastic unit. Returns the ability set with every grant merged
// in (a new object), or the original set unchanged when it does not apply. Merging up-front
// — rather than into effectiveAbilities — lets the Flame Blade grant reach the weapon-upgrade
// and stat-bonus logic, which read the raw ability set. The Wall-of-Fire siege effect is not
// modelled here (it has its own global toggle). Each grant is sourced on its own
// PROVENANCE[lavaSmelter:*] anchor further down this function, outside this block's window.
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
      // A grant added to the list above without a case here would be dropped in silence.
      default: throw new Error(
        `applyLavaSmelterGrant: '${grant}' is not one of weaponImmunity/missileImmunity/`
        + `resistElements/elementalArmor/fieryBlade.`);
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
//
// KNOWN DEFECT (T8, see BACKLOG.md Q30): the Sanctify grant above is wider than the source.
// `Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS` lines 412-441 — the block
// PROVENANCE[sanctaBasilica] in stats_sequence.js cites for the +3 Resistance — writes the
// per-type grants in four *mutually exclusive* STypeID branches, each ending in
// `GOTO "ENDOFUNIQUEBUILDING"`: 108 (High Men Monks) and 231 (High Men Inquisitors) get
// Sanctify plus improved Exorcise, 111 (Crusaders) gets Lucky *only*, and 113 (Paladins) gets
// Magic Immunity *only*. Neither Crusaders nor Paladins receives Sanctify from this building.
// The code and this comment both say they do. `DisAbil.CAS` lines 1036-1046 does group all
// three under one "Sainthood" display line, which is the likely origin of the conflation, but
// it is display only and grants no stat. Not corrected here: this round is comment-only and the
// fix needs a preset plus a full suite run.
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

// Magic Immunity hard-blocks a set of magic-based curses, so the calculator strips them here
// before any downstream read (display stats, effectiveAbilities, and the combatAbilities
// passed to resolveCombat all derive from this object). Mind Storm and Vertigo are
// additionally blocked by Illusion Immunity, including the Illusion Immunity granted by Eye
// of Heaven.
// UNSOURCED (T8): the *membership* of MAGIC_IMMUNITY_GATED_CURSES is not sourced. The MoM
// side is a categorical block on harmful spells — `Magic Immunity.md`, cited below, says a
// Magic-Immune unit is "completely unaffected" by them, and lists the exceptions rather than
// deriving them from a stat — so a per-curse list is a modelling choice, not a transcription,
// and no reconstruction of the CoM2/Warlord curse handlers has been checked against it. An
// earlier revision of this block justified the strip as the immunity granting "such
// overwhelming effective resistance/defense that these curses simply never take hold"; that
// mechanism is nowhere in the cited sources and has been removed rather than reworded.
// Curses that bypass Magic Immunity per the source are NOT gated: Black Prayer, Eternal
// Night's Darkness malus, and Hierophany. Black Prayer and Darkness are both named on the
// bypass list in `Reference docs/MoM source - Fandom site/Magic Immunity.md`, *Immunity to
// Harmful Spells / Exceptions*. Hierophany's cast handler in
// `Reference docs/Script source/Warlord 1.5.12.7/COSpell.CAS` lines 400-413 runs a Resistance
// roll and makes no Magic Immunity test at all, and the Warlord manual v1.5.12.7 changelog
// records "Spell Hierophany now works properly against magic immunity".
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
// the combat immunity checks (Death Gaze/Touch, Life Stealing, Cause Fear). The grant is
// `Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS` lines 874-882, which sets
// ADeathImmunity and, when it is not already set, ALucky.
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
// res in deriveUnitStats and is sourced on PROVENANCE[pillarOfFaith] in stats_sequence.js.
function applyPillarOfFaithGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.pillarOfFaithLucky) return abilities;
  return { ...abilities, lucky: true, luckyPhaseBase: true };
}

// Fortification (Warlord, city building): all defending units inside the city walls gain a
// Large Shield effect. If the unit already has Large Shield, it receives Missile Immunity
// instead. The tactical write is `Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS`
// lines 1069-1075 — gated on `ISBUILT(C,BMoats)`, the defending side, and the city-area
// coordinate box. The manual v1.5.12.7 states the same rule:
// "Friendly units receive bonus equivalent to Large Shield if they stay inside the city wall
// area. If the unit already have Large Shield, unit will receive Missile Immunity instead."
// The +4 Defense variant in `UnitCalcPre.CAS` lines 1822-1826 is *strategic* combat and is
// deliberately not modelled. Folded in here so the largeShield/missileImmunity defense
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
// all see them. The grant is `Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS`
// lines 850-855 — AFireImmunity, ALightningResistance, AColdImmunity, suppressed when item
// power 37 is present.
function applyInsulationGrant(abilities, version) {
  if (!version || !version.startsWith('com2_warlord') || !abilities.insulation) return abilities;
  return { ...abilities, fireImmunity: true, coldImmunity: true, lightningResist: true };
}

const MARIONETTE_VERSION = 'com2_warlord_1.5.12.7';
const MARIONETTE_HERO_TYPE_ID = 48;
const MARIONETTE_REALMS = ['nature', 'sorcery', 'chaos', 'life', 'death'];
// The projectile retype the owned branch writes, by primary realm: ids 37, 34, 31, 35 and 33
// (`UnitCalcPre.CAS:104`, `:122`, `:140`, `:158`, `:176`). Every one of them is a
// `SETSTAT(U,SRangedType,0,…)` — record selector `0`, the calculated record — so this value is
// what the region-`b` step `b:marionette:rangedType` writes, not part of the permanent record.
// All five ids are `IsMagic=Yes` with nothing else the modern engine reads, so all five are the
// one modern token; the realm the script's arms select is a spell-flavour choice the engine
// attaches to the projectile nowhere (`SPEC.md`, *Deliberate deviations*).
const MARIONETTE_RANGED_TYPES = {
  nature: 'magic', sorcery: 'magic', chaos: 'magic', life: 'magic', death: 'magic',
};
// The ascension block's own second retype, for a Chaos primary alone: `SRangedType = 30`
// (`UnitCalcPre.CAS:272`), beside the Wall Crusher and Armor Piercing grants of the same three
// lines. Id 30 is the lightning-bolt projectile, a token of its own, so this is a second write
// at a second position — `b:marionette:ascensionRangedType`, after the book grants — and not
// something the primary arm's value already covers.
const MARIONETTE_ASCENSION_RANGED_TYPES = { chaos: 'magic_lightning' };
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

// The package carries the branch's grants, its spell and charge metadata, and — for the owned
// branch alone — the realm retype value `b:marionette:rangedType` writes. It carries no permanent
// ranged type: the Wanderer's own is `UNITS.INI [362] RangedType=30`, read from the roster record.
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
      // The strayed branch writes no ranged type at all (`UnitCalcPre.CAS:364-392`), so the
      // package projects none: the Wanderer's Chaos ranged type 30 at zero strength is its own
      // roster record's (`UNITS.INI [362]`), and Transmute Equipment's later +2 `SRanged` write
      // activates that latent channel wherever the record states it.
      package: { state: 'strayed', spellLock: true, grantedAbilities },
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
      rangedType: MARIONETTE_RANGED_TYPES[primary],
      ascensionRangedType: ascended ? (MARIONETTE_ASCENSION_RANGED_TYPES[primary] || null) : null,
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
  // encounter-only and cannot receive overland Power Engine/Armorclad upgrades. Sourced on
  // PROVENANCE[rebuild] (combat_abilities.js) and PROVENANCE[rebuildEffectDerivation]
  // (combat_effects.js), both out of this block's anchor window.
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
