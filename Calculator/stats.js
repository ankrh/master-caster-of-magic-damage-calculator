// --- Unit Stat Derivation ---
// Depends on data.js and combat.js helper functions. No DOM dependencies.

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
      || (isCoM1 && identity.specialUnit === 'catapult')));
  const isCoM1SummonBranch = isCoM1 && combatSummonedValue
    && [28, 54, 113].includes(sourceTemplateId);
  // Call to Arms is a spell-result conversion, not a display-name conversion. The executable
  // reads the summoned Paladin template (STypeID 113) at the point it assigns the live realm;
  // keep the template ID as source metadata; the explicit spell-result condition itself
  // represents the summon event and remains independent from the generic Combat Summoned flag.
  const isCallToArmsPaladins = !!(isBaseCoM2
    && abilities && abilities.callToArmsPaladins
    && sourceTemplateId === 113);

  const identitySteps = [
    // PROVENANCE[identity:zombies]: UNVERIFIED versions=com_6.08; gap=the checked-in BU_Construct range proves the Zombies gate and generic type-table copy, but the COM1_UT_ZOMBIES type 0xAE/174 ability-row byte extent containing Fantastic is not recorded and requires separate independent reconstruction; pointer=Reference docs/DOS reconstructed/unitcalc.c:1625-1703
    statStep({ id: 'identity:zombies', phase: 'base', writes: ['fantastic'],
      when: () => isCoM1 && identity.specialUnit === 'zombies',
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[identity:com1ConstructCatapult]: UNVERIFIED versions=com_6.08; gap=the CoM1 combat-summon identity tail at 0x75D51-0x75D71 is not reconstructed in the repository; pointer=Reference docs/DOS reconstructed/combat.c
    statStep({ id: 'identity:com1ConstructCatapult', phase: 'base', writes: ['race', 'fantastic'],
      when: () => isCoM1 && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // PROVENANCE[identity:com1SummonBranch]: UNVERIFIED versions=com_6.08; gap=the CoM1 combat-summon identity tail at 0x75D51-0x75D71 is not reconstructed and its template-28 Life rewrite needs separate independent reconstruction; pointer=Reference docs/DOS reconstructed/combat.c
    statStep({ id: 'identity:com1SummonBranch', phase: 'base', writes: ['race', 'fantastic'],
      when: () => isCoM1SummonBranch,
      apply: u => { u.race = sourceTemplateId === 54 ? 'Nature' : 'Life'; u.fantastic = true; } }),
    // PROVENANCE[identity:combatSummoned]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:523-525
    statStep({ id: 'identity:combatSummoned', phase: 'a', writes: ['fantastic'],
      when: () => isModern && combatSummonedValue,
      apply: u => { u.fantastic = true; } }),
    // PROVENANCE[identity:chosen]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1348-1354 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:1134-1134 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:1134-1134
    statStep({ id: 'identity:chosen', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isModern && identity.specialUnit === 'chosen',
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // PROVENANCE[identity:constructCatapult]: UNVERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; gap=R9-G1a owns binding the reconstructed generic CombatSummonUnit identity writes to the applicable base-CoM2 spell row and excluding Warlord's replacement/disabled rows; pointer=Reference docs/Caster binary/Spells.CombatSummonUnit.pas:90-110
    statStep({ id: 'identity:constructCatapult', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isBaseCoM2 && isConstructCatapult,
      apply: u => { u.race = 'Nature'; u.fantastic = true; } }),
    // PROVENANCE[identity:callToArmsPaladins]: UNVERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; gap=R9-G1a owns binding the reconstructed generic CombatSummonUnit identity writes to the applicable base-CoM2 spell row and excluding Warlord's replacement row; pointer=Reference docs/Caster binary/Spells.CombatSummonUnit.pas:90-110
    statStep({ id: 'identity:callToArmsPaladins', phase: 'a', writes: ['race', 'fantastic'],
      when: () => isBaseCoM2 && isCallToArmsPaladins,
      apply: u => { u.race = 'Life'; u.fantastic = true; } }),
    // PROVENANCE[identity:legacyConversions]: UNVERIFIED versions=all; gap=wrapper delegates every write to the still-UNVERIFIED legacyUnitTypeConversions direct helper owned by R9-G1g; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'identity:legacyConversions', phase: 'a', writes: ['race', 'fantastic'],
      apply: u => applyLiveUnitType(u, determineEffectiveUnitType(legacyUnitTypeFromLiveIdentity(u), abilities, version)) }),
    // PROVENANCE[identity:spiritLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:1306-1306
    statStep({ id: 'identity:spiritLink', phase: 'd', writes: ['fantastic'],
      when: () => !!(version && version.startsWith('com2_warlord')) && !!(abilities && abilities.spiritLink),
      apply: u => { u.fantastic = false; } }),
  ];
  runStatSteps(identitySteps, live, { version, base: identity, trace });
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
      // PROVENANCE[lavaSmelter:weaponImmunity]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:473-492 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:446-464 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:464-503 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:523-527
      case 'weaponImmunity': merged.weaponImmunity = true; break;
      // STAT-FORMULA[lavaSmelter:missileImmunity]
      // PROVENANCE[lavaSmelter:missileImmunity]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:473-493 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:446-464 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:464-503 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:523-533
      case 'missileImmunity': merged.missileImmunity = true; break;
      // STAT-FORMULA[lavaSmelter:resistElementsAlias]
      // PROVENANCE[lavaSmelter:resistElementsAlias]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=the independent flag is implemented, but R9-G1a still owns binding all creation/retraining gates and the runtime resolution consumer into one applicable proof; pointer=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:473-495
      case 'resistElements': merged.resistElements = true; break;
      // STAT-FORMULA[lavaSmelter:elementalProtection]
      // PROVENANCE[lavaSmelter:elementalProtection]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=the independent Elemental Armor flag now coexists with Resist Elements, but R9-G1a still owns the combined creation/retraining and resolution proof; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas:193-196
      case 'elementalArmor': merged.elementalArmor = true; break;
      // STAT-FORMULA[lavaSmelter:flameBlade]
      // PROVENANCE[lavaSmelter:flameBlade]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:473-496 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:446-464 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:464-503 | Reference docs/Script source/Warlord 1.5.12.7/OverlandEndTurn.CAS:523-551
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
// Lucky reaches a unit from five sources that fall in different derivation stages
// (SPEC.md, Stat derivation contract). Its stat bonus does not stack, so it is
// counted once, in the earliest stage that grants it — getAbilityStatSteps reads
// these markers to decide which. They record the provenance that would otherwise be
// lost when everything collapses to `lucky`.
//   base — Pillar of Faith (CreateUnit.CAS:591, a 20% chance rolled at creation)
//     and Sancta Basilica's Crusader grant. Both are in the unit before the encounter
//     pipeline starts.
//   phase a — the unit's own intrinsic Lucky ability.
//   phase b — Lucky Star (UnitCalcPre.CAS:1146-1149 for the target, :1611-1623 for
//     other friendly units) and Divine Protection (UnitCalcPre.CAS:881).
// No source is phase c or d.
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

// Outlander controls expose the researched reform/building conditions, not their
// derived labels. Fold permanent unit upgrades and combat-only labels in before
// curse gating so downstream mechanics see a single calculated state.
const DERIVED_OUTLANDER_STATE_KEYS = [
  'armorclad',
  'battleArmor',
  'blackpowder',
  'bombsGrenades',
  'energyCannon',
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

function applyOutlanderReformGrants(abilities, version, baseUnitType, isHero = false) {
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
    ...(outlanderWizard && baseFantastic && fundamentalAbilities.xenoveterinary
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
  const abilities = applyMagicImmunityCurseGating(
    applyOutlanderReformGrants(
    applyFortificationGrant(
    applyInsulationGrant(
    applyPillarOfFaithGrant(
    applyDivineProtectionGrant(
      applySanctaBasilicaGrant(
        applyLavaSmelterGrant(markIntrinsicLucky(suppliedAbilities), version, baseUnitType),
        version, isHero ? 'hero' : baseUnitType, unitRace, unitName),
      version),
    version),
    version),
    version),
    version, baseUnitType, isHero));
  const destinyActive = destinyActiveForUnit(abilities, version);
  const identityConversion = applyOrderedIdentityConversions(identity, abilities, version, {
    isHero,
    name: unitName,
  });
  Object.assign(identity, identityConversion.identity);
  const unitTypeRaw = legacyUnitTypeFromLiveIdentity(identity);
  const unitTypeVal = unitTypeRaw;
  const isFantasticLive = !!identity.fantastic;
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
  const constructCatapult = isCoM1 && identity.specialUnit === 'catapult'
    && !!abilities.combatSummoned;
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
  const gazeType = GAZE_TYPES.includes(rtbTypeRaw) ? rtbTypeRaw : 'none';
  // Rust eliminates thrown attacks (only the 'thrown' type — not fire/lightning breath).
  if (rustActive && thrownType === 'thrown') thrownType = 'none';

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
  const blackpowderEligibleAttack = (parseInt(input.rtb) || 0) > 0
    && (rangedType === 'missile' || rangedType === 'boulder'
      || thrownType === 'thrown' || thrownType === 'fire');
  const blackpowder = blackpowderSource
    && isNormalUnitType(unitTypeVal) && blackpowderEligibleAttack;
  if (blackpowder && rangedType === 'missile') {
    rangedType = 'boulder';
  }
  const blackpowderPhysicalRanged = blackpowder
    && (rangedType === 'missile' || rangedType === 'boulder');

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

  // Chaos Channels (Fire Breath option): version-sensitive strength.
  // MoM: strength 2. (WIZARDS.EXE 0x8F728 in both MoM builds, alongside ranged_type = 101.)
  // CoM/CoM2: strength 4. (CoM 1: 0x8F47C; CoM2/Warlord:
  // RecalculateUnits $00599F3E, `firebreath += 4`.)
  // Fire Breath is not rolled for units that already have a ranged or breath attack.
  // If the unit has Thrown, Fire Breath replaces it.
  // CoM2 exception: Fire Breath can also replace Gaze and Lightning Breath.
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
  // Only the Fire Breath channel takes the grant; without this the shared-slot write would
  // land in whichever channel is being derived and overwrite it.
  const ccOwnsThisPass = !input._modernChannelKey || input._modernChannelKey === 'fireBreath';
  const ccFireBreathStrength = version.startsWith('com') ? 4 : 2;
  const ccFireBreathActive = ccFireBreathAbil && rangedType === 'none'
    && (ccIndependentChannels
      || thrownType === 'none' || thrownType === 'thrown' || thrownType === 'fire');
  if (ccFireBreathActive && ccOwnsThisPass) {
    thrownType = 'fire';
  }

  // Lightning Blade (Warlord): the Altar of Storm writes Lightning Breath = Thrown + 1, then
  // clears Thrown. A melee-only unit therefore gains strength 1, while an innate Thrown attack
  // becomes Lightning Breath one point stronger. The Lightning Breath is innate and gains
  // veterancy level bonuses. (Chaos Channels Fire Breath above takes precedence, so a unit
  // already converted to fire is left as fire.)
  const lightningBladeAbil = version.startsWith('com2_warlord') && !!abilities.lightningBlade
    && isNormalUnitType(unitTypeVal);
  // Strength-1 grant case: applies only when the unit has no ranged/thrown/breath attack at
  // all (i.e. melee-only). Existing ranged/fire-breath attacks are left intact rather than
  // being overwritten — the single-rtb model cannot hold both.
  const lightningBladeGrantsBreath = lightningBladeAbil
    && rangedType === 'none' && thrownType === 'none';
  const lightningBladeConvertsThrown = lightningBladeAbil && thrownType === 'thrown';
  if (lightningBladeConvertsThrown) {
    thrownType = 'lightning';
  } else if (lightningBladeGrantsBreath) {
    thrownType = 'lightning';
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
  if (destinyActive) {
    const before = {
      atk: calcBaseAtk, rtb: calcBaseRtb, def: calcBaseDef,
      res: calcBaseRes, hp: calcBaseHP,
    };
    calcBaseAtk *= 2;
    calcBaseRtb *= 2;
    calcBaseDef += 4;
    calcBaseRes += 4;
    calcBaseHP *= 2;
    // PROVENANCE[destiny]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:588-606
    traceBasePreparation('destiny', 'Destiny', before, {
      atk: calcBaseAtk, rtb: calcBaseRtb, def: calcBaseDef,
      res: calcBaseRes, hp: calcBaseHP,
    });
  }
  // `Caster.exe` $00599F3E is `add 4 to U.firebreath`, not an assignment, and it is the same
  // routine for CoM2 and Warlord — there is no version split to model. The DOS engines still
  // assign, because the value lands in the one shared `.ranged` slot rather than a field of
  // its own, which is the same reason they exclude ranged units from the mutation.
  if (ccFireBreathActive && ccOwnsThisPass) {
    const before = { rtb: calcBaseRtb };
    calcBaseRtb = ccIndependentChannels
      ? calcBaseRtb + ccFireBreathStrength
      : ccFireBreathStrength;
    // PROVENANCE[chaosChannels:fireBreath]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:480-485 | Reference docs/DOS reconstructed/unitcalc.c:623-629 | Reference docs/Caster binary/Units.RecalculateUnits.pas:516-521
    traceBasePreparation('chaosChannels:fireBreath', 'Chaos Channels', before,
      { rtb: calcBaseRtb });
  }
  // Lightning Blade writes `Lightning Breath = Thrown + 1`: this is +1 for both the
  // Thrown-conversion and melee-only creation paths in the represented attack channel.
  if (lightningBladeConvertsThrown || lightningBladeGrantsBreath) {
    const before = { rtb: calcBaseRtb };
    calcBaseRtb += 1;
    // PROVENANCE[lightningBlade:breath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:294-299
    traceBasePreparation('lightningBlade:breath', 'Lightning Blade', before,
      { rtb: calcBaseRtb });
  }
  // Energy Cannon is a permanent overland conversion to projectile type Beam
  // with ranged Doom damage. Its +50% write is added to the base phase below,
  // after the earlier permanent ranged writes it reads have been assembled.
  const energyCannon = isWarlord && !!abilities.energyBeamWeapons
    && !!abilities.powerEngine
    && rangedType !== 'none' && calcBaseRtb > 0;
  if (energyCannon) {
    rangedType = 'beam';
  }
  const baseToHitMod = parseInt(input.toHitMod) || 0;
  const baseToHitRtbMod = parseInt(input.toHitRtbMod) || 0;
  const baseToBlkMod = parseInt(input.toBlkMod) || 0;

  // Warlord moves Focus Magic to UnitCalc.CAS (phase d). Preserve the attack types standing
  // immediately before that conversion for earlier Warlord phase-b/c gates.
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
  const hasMagicRangedForFocus = calcBaseRtb > 0
    && (rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam');
  const hasBreathForFocus = calcBaseRtb > 0 && (thrownType === 'fire' || thrownType === 'lightning');
  const hasDoomGazeForFocus = isCoM2 && baseDoomGazeWithBlazingEyes > 0;
  const focusMagicBuffsExisting = focusMagicActive
    && (hasMagicRangedForFocus || hasBreathForFocus || hasDoomGazeForFocus);
  if (focusMagicActive && !focusMagicBuffsExisting) {
    const before = { rtb: calcBaseRtb };
    const canConvertThrown = calcBaseRtb > 0 && thrownType === 'thrown';
    const canConvertRanged = calcBaseRtb > 0
      && (rangedType === 'missile' || rangedType === 'boulder');
    // CoM 1 raises a converted attack to a minimum of 3. The modern routine preserves a
    // positive Thrown/physical-ranged strength verbatim and uses 3 only when it creates the
    // ranged field from an empty base slot.
    const convertedStrength = (canConvertThrown || canConvertRanged)
      ? (version === 'com_6.08' ? Math.max(calcBaseRtb, 3) : calcBaseRtb)
      : 3;
    rangedType = 'magic_s';
    thrownType = 'none';
    calcBaseRtb = convertedStrength;
    // PROVENANCE[focusMagic:conversion]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:753-772 | Reference docs/Caster binary/Units.RecalculateUnits.pas:613-651
    traceBasePreparation('focusMagic:conversion', 'Focus Magic', before,
      { rtb: calcBaseRtb });
  }

  // Warlord Vampirism: the executing script transfers half of the represented Thrown/Breath
  // strength to melee (truncate toward zero), then leaves that positive source channel at 1.
  // F17 owns aggregating simultaneous modern source channels and moving the write to its exact
  // region-d position. This formula covers the calculator's selected RTB channel only; it never
  // applies to magical/missile ranged.
  const vampirismActive = !!(abilities && abilities.vampirism) && version.startsWith('com2_warlord');
  if (vampirismActive && thrownType !== 'none' && calcBaseRtb > 0) {
    const before = { atk: calcBaseAtk, rtb: calcBaseRtb };
    calcBaseAtk += Math.trunc(calcBaseRtb / 2);
    calcBaseRtb = 1;
    // PROVENANCE[vampirism:transfer]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:1245-1258
    traceBasePreparation('vampirism:transfer', 'Vampirism', before,
      { atk: calcBaseAtk, rtb: calcBaseRtb });
  }

  // Warlord Shadow Strike: adds a Thrown attack at 1 + 1/3 of base melee strength (rounded down).
  // A unit that already has a Thrown attack instead gains 1 + 1/3 of base melee as additional
  // Thrown strength. Calculated from the base attack value, mirroring Colossal Strength's
  // "1 + fraction, resolve at the end of unit calculation" convention — the leading +1 keeps a
  // low-melee unit from being granted a strength-0 thrown. Because Thrown is a separate pre-melee
  // phase, per-hit riders (Poison, Life Steal, Blood Sucker) fire on both the thrown and the
  // melee phase — that double trigger falls out naturally from the granted thrown phase.
  // The single-rtb model can't hold a second attack, so units that already carry a missile,
  // magic ranged, or breath attack keep that attack and gain no thrown here.
  const shadowStrikeActive = !!(abilities && abilities.shadowStrike) && version.startsWith('com2_warlord');
  const shadowStrikeBonus = shadowStrikeActive && calcBaseAtk > 0 ? 1 + Math.floor(calcBaseAtk / 3) : 0;
  // Strength of a freshly granted thrown (melee-only unit). Folded into the reported baseRtb so
  // touch dispatch (touchAttackFires checks baseRtb > 0) treats the granted thrown as a real
  // base thrown and fires Poison / Life Steal / Blood Sucker on its phase. The boost-existing
  // case needs no such bump — that unit already has baseRtb > 0.
  let shadowStrikeGrantedBaseRtb = 0;
  if (shadowStrikeBonus > 0) {
    const before = { rtb: calcBaseRtb };
    if (thrownType === 'thrown') {
      calcBaseRtb += shadowStrikeBonus;
    } else if (thrownType === 'none' && rangedType === 'none') {
      thrownType = 'thrown';
      calcBaseRtb = shadowStrikeBonus;
      shadowStrikeGrantedBaseRtb = shadowStrikeBonus;
    }
    // PROVENANCE[shadowStrike:thrown]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:1262-1266
    traceBasePreparation('shadowStrike:thrown', 'Shadow Strike', before,
      { rtb: calcBaseRtb });
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
  // Evaluated here, after the
  // ranged/thrown type conversions (Chaos Channels, Focus Magic, Vampirism), so they read the
  // final attack type — e.g. a missile converted to magic by Focus Magic no longer qualifies
  // as physical ranged. The missile→boulder projectile upgrade was already applied above.
  const blackpowderHasRangedOrThrown = blackpowder && calcBaseRtb > 0
    && (blackpowderPhysicalRanged || thrownType === 'thrown');
  // Doom attack: Armor Piercing is wasted (Doom ignores armor), so grant strength instead.
  const blackpowderGrantsAP = blackpowderHasRangedOrThrown
    && !abilities.doom && !abilities.armorPiercing;
  const blackpowderRtbMod = blackpowderHasRangedOrThrown
    && (!!abilities.doom || !!abilities.armorPiercing)
    ? (thrownType === 'thrown' ? 4 : 2)
    : 0;
  // Fire Breath: +4 strength.
  const blackpowderFireBreathRtbMod = blackpowder && calcBaseRtb > 0 && thrownType === 'fire' ? 4 : 0;
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

  // City walls bonus (defender only)
  const cwVal = input.cityWalls;
  const cityWallBonus = (prefix === 'b' && cwVal !== 'none') ? parseInt(cwVal) : 0;

  // Node Aura bonus: +2 atk, +2 rtb, +2 def, +2 res for matching Fantastic units.
  // Effective combat type is resolved through the shared precedence helper.
  const supremeLightEligible = supremeLightActiveForUnit(abilities, unitTypeVal, version, {
    liveRangedType: rangedType,
    baseRangedType: rtbTypeRaw,
  });
  const survivalInstinctEligible = survivalInstinctActiveForUnit(abilities, unitTypeVal, version);
  const landLinkingEligible = landLinkingActiveForUnit(abilities, unitTypeVal, version);
  const innerPowerEligible = innerPowerActiveForUnit(abilities, version);
  const misleadEligible = isHero || misleadActiveForUnit(abilities, unitTypeVal, version);
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
  });
  // `cAfterWarp` is a second splice point inside region c, for the effects the engine writes
  // after its Warp Creature block — Tactician in every CoM engine, plus Supreme Light in CoM 1.
  const abilByPhase = { base: [], a: [], b: [], c: [], cAfterWarp: [], d: [], e: [] };
  for (const step of abilSteps) {
    abilByPhase[step.afterWarp ? 'cAfterWarp' : step.phase].push(step);
  }
  const nodeAuraVal = input.nodeAura;
  const unitRealm = realmOfUnitType(unitTypeVal);
  const nodeAuraActive = unitRealm !== null && nodeAuraVal !== 'none' && unitRealm === nodeAuraVal;
  const nodeBonus = nodeAuraActive ? 2 : 0;
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
  const darknessAtkDefMagnitude = hasDarkness ? (hasAnyEternalNight && isCoM2 ? 2 : 1) : 0;
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
  const naturalSelectionNightshadeMod = naturalSelectionEligible && !!(abilities && abilities.nightshade) ? 1 : 0;
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
  // Only the combat-cast Flame Blade adds +1 fire breath; neither boosts boulder.
  // Warlord Fiery Fury: +2 to missile, boulder, and thrown for regular units only;
  // bonuses (except boulder) do not stack with Flame Blade.
  // Flame Blade / Fiery Blade also upgrade the unit's normal weapon to magic (bypasses Weapon Immunity);
  // Fiery Fury does the same for regular units.
  const warlordCombatFlameBlade = isWarlord && !!abilities.flameBladeWarlord;
  const warlordFieryBlade = isWarlord && !!abilities.fieryBlade;
  const hasWarlordBlade = warlordCombatFlameBlade || warlordFieryBlade;
  const nonWarlordFlameBlade = !!abilities.flameBlade && !isWarlord;
  const fbAtkBonus = (nonWarlordFlameBlade || hasWarlordBlade) ? 2 : (abilities.metalFires ? 1 : 0);
  const ffRegularBonus = isWarlord && !!abilities.fieryFury && !isFantasticBase;
  // M4, resolved at R1 stage 9. The two sources fall in different regions — Fiery Fury in
  // `b` (UnitCalcPre.CAS:832-846), the blades in `c` — and do not stack, which the bucket
  // model could only express as a single `Math.max` booked whole to `c`. Two steps carry it
  // now: Fiery Fury writes its own bonus in `b`, and the blade step in `c` adds only the
  // excess, so the total is still the maximum of the two while each lands in its own region.
  // The split changes no number: the one later step that scales `rtb` inside a region,
  // Upgraded Explosive's fire-breath doubling at the end of `b`, is gated on Fire Breath,
  // which Fiery Fury's bonus never covers.
  let fbBladeRtb = 0;
  if (hasWarlordBlade) {
    if (rangedTypeBeforeFocus === 'missile' || thrownTypeBeforeFocus === 'thrown') fbBladeRtb = 2;
    else if (warlordCombatFlameBlade && thrownTypeBeforeFocus === 'fire') fbBladeRtb = 1;
  } else if (fbAtkBonus > 0) {
    // MoM Flame Blade / Metal Fires boost missile and thrown; CoM Flame Blade
    // boosts missile only (the CoM helptext drops the thrown bonus — Warlord, handled
    // above, re-adds it). Metal Fires is MoM-only so the CoM gate only affects Flame Blade.
    const fbThrownEligible = !(nonWarlordFlameBlade && isCoMVersion);
    if (rangedType === 'missile' || (fbThrownEligible && thrownType === 'thrown')) {
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
  const bombsGrenadesRtbMod = bombsGrenades && thrownType === 'thrown'
    ? Math.max(0, Math.floor(8 - baseFigs / 2))
    : 0;
  const colossalStrength = isWarlord && !!(abilities && abilities.colossalStrength);
  const colossalRtbApplies = colossalStrength && (calcBaseRtb > 0 || bombsGrenadesRtbMod > 0)
    && (rangedType === 'missile' || rangedType === 'boulder' || thrownType === 'thrown');
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
  const hasMeleeAttack = calcBaseAtk > 0;
  const rtbStatActive = calcBaseRtb > 0 || bombsGrenadesRtbMod > 0;

  const ludusAgogeHpMod = ludusAgoge ? 1 : 0;

  // Blazing March: +3 to missile only (not boulder, magic ranged, or breath).
  // Warlord also boosts thrown.
  const blazingMarchActive = !!(abilities && abilities.blazingMarch);
  const blazingMarchRangedType = isWarlord ? rangedTypeBeforeFocus : rangedType;
  const blazingMarchThrownType = isWarlord ? thrownTypeBeforeFocus : thrownType;
  const blazingMarchBoostsThrown = isWarlord && blazingMarchThrownType === 'thrown';
  const blazingMarchRtbMod = blazingMarchActive
    && (blazingMarchRangedType === 'missile' || blazingMarchBoostsThrown) ? 3 : 0;

  // Natural Selection — Wild game: +1 ranged attack on physical ranged (missile/boulder)
  // and magic ranged. Thrown and breath are not "ranged attacks" for this bonus.
  const naturalSelectionWildGameRtbMod = naturalSelectionEligible && !!(abilities && abilities.wildGame)
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam') ? 1 : 0;

  // Chaos Surge: affects Chaos creatures only.
  // MoM and CoM 1 both write the shared ranged slot unconditionally on attack type, so
  // the bonus reaches missile, boulder, magic ranged, thrown, breath and gaze alike.
  // Chaos Channels' granted Fire Breath is excluded in MoM only: the constructor runs
  // Chaos Surge *before* BU_Apply_Specials, whose CC block then assigns ranged = 2 over
  // the top. CoM 1 swapped that call order, so there the CC breath keeps the bonus.
  // CoM2/Warlord are a separate engine and keep the narrower helptext scope.
  const chaosSurgeBoostsRtb = isCoM2
    ? (rangedType !== 'none' || thrownType === 'fire' || thrownType === 'lightning')
    : (rangedType !== 'none'
      || (thrownType !== 'none' && !(ccFireBreathActive && version.startsWith('mom'))));
  const chaosSurgeRtbMod = chaosSurgeRtbBonus > 0 && chaosSurgeBoostsRtb ? chaosSurgeRtbBonus : 0;

  const focusMagicRtbMod = focusMagicBuffsExisting
    && (rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam'
      || thrownType === 'fire' || thrownType === 'lightning') ? 3 : 0;

  // Reinforce Magic: +2 to magical ranged attack strength only.
  const reinforceMagicRtbMod = (abilities && abilities.reinforceMagic)
    && (rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam') ? 2 : 0;

  // Mislead/Misfortune: -1 ranged attack only (not thrown or breath) per source helptext.
  // Eligibility (normal/hero) is handled via effectiveAbilities.mislead.
  const misleadRtbMod = (effectiveAbilities && effectiveAbilities.mislead)
    && (rangedType === 'missile' || rangedType === 'boulder'
      || rangedType === 'magic_c' || rangedType === 'magic_n'
      || rangedType === 'magic_s' || rangedType === 'beam') ? -1 : 0;

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

  // Dragon Mound (Warlord): +2 to an existing fire breath attack.
  const dragonMoundRtbMod = dragonMound && thrownType === 'fire' ? 2 : 0;

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
  const effectiveWeapon = (fbAtkBonus > 0 && weapon === 'normal') ? 'magic'
    : (ffRegularBonus && weapon === 'normal') ? 'magic'
    : (weaponUpgradedByHW ? 'magic'
    : (wraithFormBypassesWI ? 'magic'
    : (weaponUpgradedByWoF ? 'magic'
    : weapon)));

  // Ranged/Thrown/Breath strength
  let rtbLvl = 0, rtbWpn = 0;
  if (rangedType !== 'none') {
    rtbLvl = calcBaseRtb > 0 ? lvl.ranged : 0;
    rtbWpn = (calcBaseRtb > 0 && rangedGetsWpn) ? wpn.atk : 0;
  } else if (thrownType !== 'none') {
    rtbLvl = lvl.thrown;
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
  const chaosSurgeGazeMod = isCoM2 ? 0 : chaosSurgeRtbBonus;
  // Level bonus to a gaze's strength, from the same shared `.ranged` slot. MoM's level
  // routine (0x8F881-0x8FB3E) has no `ranged_type` gate at all, so all DOS gaze types take
  // the full ranged ladder. CoM 1 replaced it with a table loop whose `.ranged` step is
  // skipped for `ranged_type >= 100` — thrown, breath and every gaze — on all rows but
  // Veteran (0x8FA9A-0x8FAAB); that is exactly the ladder's `thrown` column. CoM2 and
  // Warlord remain unresolved in `Engine verification evidence.md`, D21.
  const gazeLvlMod = version.startsWith('mom') ? lvl.ranged
    : isCoM1 ? lvl.thrown
    : lvl.ranged;
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
  const statSteps = [
    // --- base: raw stats, and writes made permanently before the encounter ---
    // PROVENANCE[stat:base]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:1273-1296 | Reference docs/DOS reconstructed/unitcalc.c:1676-1713 | Reference docs/Caster binary/Units.RecalculateUnits.pas:435-462
    statStep({ id: 'stat:base', phase: 'base',
      writes: ['res', 'def', 'atk', 'rtb', 'hp', 'gaze', 'doomGaze'],
      apply: u => {
        u.res = calcBaseRes; u.def = calcBaseDef; u.atk = calcBaseAtk; u.rtb = calcBaseRtb;
        u.hp = calcBaseHP; u.gaze = baseGazeRanged; u.doomGaze = baseDoomGaze;
      } }),
    // CoM1's Zombies constructor starts the live To Block field at -1. This is an
    // identity-sourced write, but it belongs on the calculated stat sequence so its
    // effect is attributed to To Block rather than to the Special unit control.
    // PROVENANCE[identity:zombies:toBlock]: VERIFIED versions=com_6.08; sources=Reference docs/DOS reconstructed/unitcalc.c:1617-1629
    statStep({ id: 'identity:zombies:toBlock', phase: 'base', writes: ['toBlk'],
      when: () => isCoM1 && identity.specialUnit === 'zombies',
      // The DOS constructor stores a signed D10 threshold step. The calculator's accumulator
      // is percentage points, so one engine step is ten percentage points.
      apply: u => { u.toBlk -= 10; } }),
    ...abilByPhase.base,
    // PROVENANCE[altarOfTheMoon]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:372-381
    statStep({ id: 'altarOfTheMoon', phase: 'base', writes: ['res', 'rtb'],
      apply: u => { u.res += altarOfTheMoonResMod; u.rtb += altarOfTheMoonRtbMod; } }),
    // PROVENANCE[militaryWorkshop]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=the current strength/AP branch re-tests the post-conversion selected channel instead of the cited permanent SRanged/SThrown/SFireBreath fields; pointer=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS
    statStep({ id: 'militaryWorkshop', phase: 'base', writes: ['rtb'],
      apply: u => { u.rtb += blackpowderRtbMod + blackpowderFireBreathRtbMod; } }),
    // PROVENANCE[naturalSelection:wildGame]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=the current gate reads the post-conversion selected channel instead of the saved RNG field at the cited permanent CreateUnit position; pointer=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS
    statStep({ id: 'naturalSelection:wildGame', phase: 'base', writes: ['rtb'],
      apply: u => { u.rtb += naturalSelectionWildGameRtbMod; } }),
    // The executing script also adds +1 to an existing ranged-strength field, despite
    // that write being omitted from Ludus Agoge's prose description.
    // PROVENANCE[ludusAgoge]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:335-350
    statStep({ id: 'ludusAgoge', phase: 'base', writes: ['res', 'atk', 'rtb', 'hp'],
      apply: u => {
        u.res += ludusAgogeResMod; u.atk += ludusAgogeAtkMod;
        u.rtb += ludusAgogeRtbMod; u.hp += ludusAgogeHpMod;
      } }),
    // PROVENANCE[motherFungus]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:443-455
    statStep({ id: 'motherFungus', phase: 'base', writes: ['atk', 'rtb'],
      apply: u => { u.atk += motherFungusAtkMod; u.rtb += motherFungusRtbMod; } }),
    // PROVENANCE[altarOfTheSun:holyMother]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:355-366
    statStep({ id: 'altarOfTheSun:holyMother', phase: 'base', writes: ['atk'],
      apply: u => { u.atk += altarOfTheSunMeleeMod; } }),
    // PROVENANCE[naturalSelection:coal]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:529-554
    statStep({ id: 'naturalSelection:coal', phase: 'base', writes: ['atk'],
      apply: u => { u.atk += naturalSelectionCoalMod; } }),
    // PROVENANCE[poolOfRepentance]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:311-316
    statStep({ id: 'poolOfRepentance', phase: 'base', writes: ['res', 'def'],
      apply: u => { u.res += poolOfRepentanceResMod; u.def += poolOfRepentanceDefMod; } }),
    // PROVENANCE[sanctaBasilica]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:412-415
    statStep({ id: 'sanctaBasilica', phase: 'base', writes: ['res'],
      apply: u => { u.res += sanctaBasilicaResMod; } }),
    // PROVENANCE[pillarOfFaith]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:572-590
    statStep({ id: 'pillarOfFaith', phase: 'base', writes: ['res'],
      apply: u => { u.res += pillarOfFaithResMod; } }),
    // PROVENANCE[naturalSelection:powerMinerals]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:529-539
    statStep({ id: 'naturalSelection:powerMinerals', phase: 'base', writes: ['res'],
      apply: u => { u.res += naturalSelectionPowerMineralsMod; } }),
    // CreateUnit.CAS snapshots Resistance before either resource write, then processes
    // Nightshade second. When both are present, Nightshade replaces the Power-mineral bonus.
    // PROVENANCE[naturalSelection:nightshade]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=the source adds the full Nightshade count while the current boolean input can represent only one; pointer=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS
    statStep({ id: 'naturalSelection:nightshade', phase: 'base', writes: ['res'],
      apply: u => {
        if (naturalSelectionNightshadeMod) {
          u.res += naturalSelectionNightshadeMod - naturalSelectionPowerMineralsMod;
        }
      } }),
    // PROVENANCE[dragonMound]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=the source unconditionally creates or boosts Fire Breath while the current single-channel model boosts only an existing Fire Breath; pointer=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS
    statStep({ id: 'dragonMound', phase: 'base', writes: ['def', 'rtb'],
      apply: u => { u.def += dragonMoundDefMod; u.rtb += dragonMoundRtbMod; } }),
    // PROVENANCE[naturalSelection:iron]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS:529-558
    statStep({ id: 'naturalSelection:iron', phase: 'base', writes: ['def'],
      apply: u => { u.def += naturalSelectionIronMod; } }),
    // Energy Cannon is the last represented CreateUnit.CAS ranged-strength write, so its
    // +50% reads every earlier permanent ranged contribution in this sequence.
    // PROVENANCE[energyCannon]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=the source gates on SMaxAmmo while the current single-channel model substitutes a positive selected ranged-strength/type test and has no ammo field; pointer=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS
    statStep({ id: 'energyCannon', phase: 'base', writes: ['rtb'],
      when: () => energyCannon,
      apply: u => { u.rtb += Math.floor(Math.max(0, u.rtb) / 2); } }),
    // --- a: precalc, in the binary ---
    // Region `a` writes nine unit fields against region `c`'s 492, and the ones it writes are
    // flags rather than stats. City Walls is not here: ApplyAttack passes it as EffectiveDefense's
    // per-attack `extradef` argument after the finished region-e record is read.
    ...abilByPhase.a,
    // --- b: precalc, in UnitCalcPre.CAS (Warlord only) ---
    // Xenoveterinary's +25% (minimum +1) reads SHP at the head of the early pass
    // (UnitCalcPre.CAS:1038-1049), so it precedes every other phase-b HP write and does not
    // compound Lionheart, Endurance or Charm of Life, which are `c`.
    // PROVENANCE[outlanderXenoveterinary]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1038-1046
    statStep({ id: 'outlanderXenoveterinary', phase: 'b', writes: ['hp'],
      when: () => !!abilities.outlanderXenoveterinary,
      apply: u => { u.hp += Math.max(1, Math.floor(Math.max(0, u.hp) / 4)); } }),
    ...abilByPhase.b,
    // Fiery Fury: melee at UnitCalcPre.CAS:832-846, and the ranged half of what the bucket
    // model merged into one `Math.max` term — see the M4 note at `fbBladeRtb`.
    // PROVENANCE[fieryFury]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:831-845 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1409-1427 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:524-526
    statStep({ id: 'fieryFury', phase: 'b', writes: ['atk', 'rtb'],
      apply: u => { u.atk += ffMeleeBonus; u.rtb += ffRtbMod; } }),
    // PROVENANCE[wallOfFire:garrison]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1635-1649
    statStep({ id: 'wallOfFire:garrison', phase: 'b', writes: ['atk', 'rtb'],
      apply: u => { u.atk += wofDefenderAtkMod; u.rtb += wofDefenderRtbMod; } }),
    // PROVENANCE[eternalNight:poorVision]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1337-1346
    statStep({ id: 'eternalNight:poorVision', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += eternalNightRtbMod; } }),
    // PROVENANCE[bombsGrenades]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1066-1072
    statStep({ id: 'bombsGrenades', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += bombsGrenadesRtbMod; } }),
    // PROVENANCE[upgradedExplosive:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1074-1077
    statStep({ id: 'upgradedExplosive:ranged', phase: 'b', writes: ['rtb'],
      apply: u => { u.rtb += upgradedExplosiveRangedMod; } }),
    // PROVENANCE[soulFlay]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1298-1310
    statStep({ id: 'soulFlay', phase: 'b', writes: ['res', 'def', 'atk'],
      apply: u => {
        u.res += soulFlayResMod; u.def += soulFlayDefMod; u.atk += soulFlayAtkMod;
      } }),
    // PROVENANCE[plague]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1540-1550
    statStep({ id: 'plague', phase: 'b', writes: ['res', 'def', 'atk'],
      apply: u => { u.res += plagueResMod; u.def += plagueDefMod; u.atk += plagueAtkMod; } }),
    // PROVENANCE[goblinPox]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1554-1572
    statStep({ id: 'goblinPox', phase: 'b', writes: ['res', 'def', 'atk'],
      apply: u => {
        u.res += goblinPoxResMod; u.def += goblinPoxDefMod; u.atk += goblinPoxAtkMod;
      } }),
    // PROVENANCE[greatUnbinding]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1352-1368
    statStep({ id: 'greatUnbinding', phase: 'b', writes: ['res'],
      apply: u => { u.res += greatUnbindingResMod; } }),
    // PROVENANCE[natureLink]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:888-892
    statStep({ id: 'natureLink', phase: 'b', writes: ['res'],
      apply: u => { u.res += natureLinkResMod; } }),
    // Warlord True Light is its own UnitCalcPre.CAS block (:1507-1540), after Rally and before
    // Plague. It must not be merged with the binary's Darkness block or Eternal Night's later
    // resistance write. MoM's True Light has no intervening phase, so this early placement is
    // equivalent there.
    // PROVENANCE[trueLight]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1507-1536
    statStep({ id: 'trueLight', phase: 'b',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => hasTrueLight,
      apply: u => {
        u.res += trueLightResBonus; u.def += trueLightDefBonus;
        u.atk += trueLightAtkBonus; u.rtb += trueLightAtkBonus;
        u.gaze += trueLightAtkBonus; u.doomGaze += trueLightAtkBonus;
      } }),
    // PROVENANCE[uphillBattle]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1133-1141
    statStep({ id: 'uphillBattle', phase: 'b', writes: ['res'],
      when: () => uphillBattleActive, apply: u => { u.res += 1; } }),
    // Xenopsychology and Radio are +1 Resistance each; the rest of what they grant is To Hit
    // and To Defend, which are not in the sequence yet.
    // PROVENANCE[godsPlayDices]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1697-1710
    statStep({ id: 'godsPlayDices', phase: 'b', writes: ['res'],
      apply: u => { u.res += godsPlayDicesResMod; } }),
    // PROVENANCE[outlanderXenopsychology]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1090-1092
    statStep({ id: 'outlanderXenopsychology', phase: 'b', writes: ['res'],
      when: () => !!abilities.outlanderXenopsychology, apply: u => { u.res += 1; } }),
    // PROVENANCE[outlanderRadio]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1095-1099
    statStep({ id: 'outlanderRadio', phase: 'b', writes: ['res'],
      when: () => !!abilities.outlanderRadio, apply: u => { u.res += 1; } }),
    // Upgraded Explosive doubles the Fire Breath as it stands in the early pass
    // (UnitCalcPre.CAS:1074-1078), so it is the last step of the region.
    // PROVENANCE[upgradedExplosive:fireBreath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1074-1077
    statStep({ id: 'upgradedExplosive:fireBreath', phase: 'b', writes: ['rtb'],
      when: () => upgradedExplosive && thrownType === 'fire',
      apply: u => { u.rtb += Math.max(0, u.rtb); } }),
    // --- c: magic calc, in the binary ---
    // The level ladder is `@Units@ApplyLevelBonus` at +0x00D16, near the head of the region and
    // right after Destiny's permanent transformation — direct execution-order evidence, which
    // settled the former D25 ordering question. The hero ladder is `@Units@ApplyHeroBonus` at
    // +0x0139A, the same region. MoM and CoM 1 apply theirs from the battle-unit constructor
    // instead, but `b` and `d` are empty for them, so nothing sits between `a` and `c` there
    // and the position is unobservable: one step serves every version.
    // PROVENANCE[level]: UNVERIFIED versions=all; gap=the modern citation proves only the call position and adjacent unrelated writes while R9-G1f still owns the ApplyLevelBonus dispatch and field arithmetic; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'level', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'hp', 'gaze', 'doomGaze'],
      apply: u => {
        u.res += lvl.res; u.def += lvl.def; u.atk += lvl.atk; u.rtb += rtbLvl; u.hp += lvl.hp;
        u.gaze += gazeLvlMod; u.doomGaze += doomGazeLvlMod;
      } }),
    // Focus Magic is +0x00D3F, immediately after the level ladder — so in the binary it is
    // written *before* the Warps and takes the reduction. Warlord moves it into `UnitCalc.CAS`
    // and therefore after them; that is the `focusMagic:warlord` twin in `d`. CoM 1's position
    // is not read directly, but the complete list of what its recompute writes after Warp
    // (MoM analysis, *Warp Creature runs early*) does not contain it, so it is pre-Warp there
    // too.
    // PROVENANCE[focusMagic]: VERIFIED versions=com_6.08,com2_1.05.11; sources=Reference docs/DOS reconstructed/unitcalc.c:753-770 | Reference docs/Caster binary/Units.RecalculateUnits.pas:612-649
    statStep({ id: 'focusMagic', phase: 'c', writes: ['rtb', 'doomGaze'],
      when: () => !isWarlord,
      apply: u => { u.rtb += focusMagicRtbMod; u.doomGaze += focusMagicDoomGazeMod; } }),
    // Weapon material is `@Units@ApplyMagicWeapons` at +0x04B90, after the equipment loop —
    // also D25, also region c.
    // PROVENANCE[weapon]: UNVERIFIED versions=all; gap=the modern citation reaches only the ApplyMagicWeapons call and unrelated writes and the shared step does not preserve the DOS pre-Focus ordering; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'weapon', phase: 'c', writes: ['def', 'atk', 'rtb'],
      apply: u => { u.def += wpn.def; u.atk += wpn.atk; u.rtb += rtbWpn; } }),
    ...abilByPhase.c,
    // PROVENANCE[endurance]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:610-614 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1266-1277 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:528-528 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:528-528
    statStep({ id: 'endurance', phase: 'c', writes: ['def', 'hp'],
      apply: u => { u.def += enduranceDefMod; u.hp += enduranceHpMod; } }),
    // PROVENANCE[discipline]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1279-1298
    statStep({ id: 'discipline', phase: 'c', writes: ['def', 'atk', 'rtb'],
      apply: u => {
        u.def += disciplineDefMod; u.atk += disciplineAtkMod; u.rtb += disciplineRtbMod;
      } }),
    // Each of these carries the type-conditional half of an effect whose flat half is an
    // ability step above — hence the `:<what it writes>` suffix on the shared name.
    // PROVENANCE[flameBlade:ranged]: UNVERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; gap=CoM1 applies Flame Blade before Focus Magic, but the current shared step runs after the pre-applied Focus conversion/minimum and does not preserve low-strength arithmetic; pointer=Reference docs/DOS reconstructed/unitcalc.c
    statStep({ id: 'flameBlade:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += fbRtbMod; } }),
    // PROVENANCE[blazingMarch:ranged]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:2889-2914 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1794-1815 | TABLE=Reference docs/Script source/CoM2 1.05.11 base/MODDING.INI:536-539 | TABLE=Reference docs/Script source/Warlord 1.5.12.7/MODDING.INI:536-539
    statStep({ id: 'blazingMarch:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += blazingMarchRtbMod; } }),
    // PROVENANCE[reinforceMagic:ranged]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:1640-1648
    statStep({ id: 'reinforceMagic:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += reinforceMagicRtbMod; } }),
    // PROVENANCE[mislead:ranged]: UNVERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; gap=the cited aura-pass write is phase e while the current step remains in phase c under F14; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'mislead:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += misleadRtbMod; } }),
    // PROVENANCE[landLinking:breath]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:723-731 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1491-1506
    statStep({ id: 'landLinking:breath', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += landLinkingBreathRtbMod; } }),
    // PROVENANCE[giantStrength:thrown]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:441-450
    statStep({ id: 'giantStrength:thrown', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += gsRtbMod; } }),
    // PROVENANCE[lionheart:rangedHp]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:487-500 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1463-1478
    statStep({ id: 'lionheart:rangedHp', phase: 'c', writes: ['rtb', 'hp'],
      apply: u => { u.rtb += lionheartRtbMod; u.hp += lionheartHpMod; } }),
    // Charm of Life reads live HP after every earlier HP writer, including Lionheart and Endurance.
    // PROVENANCE[charmOfLife]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:1356-1361 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1673-1684
    statStep({ id: 'charmOfLife', phase: 'c', writes: ['hp'],
      when: () => charmOfLifeActive,
      apply: u => { u.hp += Math.max(1, Math.trunc(u.hp / 4)); } }),
    // PROVENANCE[weakness:ranged]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3107-3134 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2012-2019
    statStep({ id: 'weakness:ranged', phase: 'c', writes: ['rtb'],
      apply: u => { u.rtb += weaknessRtbModBinary; } }),
    // Holy Armor writes defence *or* To Block: MoM always +2 defence, CoM/CoM2 +2 defence at
    // 5 armor or less and +10% To Block above it. The threshold reads the defence standing at
    // this position — under the buckets that needed a named subtotal (`defBase`); here it is
    // just the field's current value. +0x07407, so it is ahead of the node aura and of every
    // curse, and its threshold does not see them.
    // PROVENANCE[holyArmor]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:503-506 | Reference docs/DOS reconstructed/unitcalc.c:744-750 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1512-1519
    statStep({ id: 'holyArmor', phase: 'c',
      writes: ['def', 'toBlk'],
      when: () => holyArmorActive,
      apply: u => {
        if (isCoMVersion && u.def > 5) u.toBlk += 10;
        else u.def += 2;
      } }),
    // PROVENANCE[orihalcon]: VERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:773-778 | Reference docs/Caster binary/Units.RecalculateUnits.pas:1522-1531
    statStep({ id: 'orihalcon', phase: 'c', writes: ['res', 'rtb'],
      apply: u => { u.res += orihalconResMod; u.rtb += orihalconRtbMod; } }),
    // PROVENANCE[nodeAura]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'nodeAura', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      apply: u => {
        u.res += nodeBonus; u.def += nodeBonus; u.atk += nodeBonus; u.rtb += nodeBonus;
        u.gaze += nodeBonus; u.doomGaze += nodeBonus;
      } }),
    // PROVENANCE[chaosSurge]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chaosSurge', phase: 'c',
      writes: ['res', 'atk', 'rtb', 'gaze', 'doomGaze'],
      apply: u => {
        u.res += chaosSurgeResBonus; u.atk += chaosSurgeMeleeBonus; u.rtb += chaosSurgeRtbMod;
        u.gaze += chaosSurgeGazeMod; u.doomGaze += chaosSurgeGazeMod;
      } }),
    // Berserk doubles melee and sets defence to 0 absolutely. MoM-only, and MoM's recompute
    // has not been decoded here, so the position is deduced: last thing before the Warps,
    // which is where the pre-R1 model effectively had it.
    // PROVENANCE[berserk]: VERIFIED versions=mom_1.31,mom_cp_1.60.00; sources=Reference docs/DOS reconstructed/unitcalc.c:521-530
    statStep({ id: 'berserk', phase: 'c', writes: ['def', 'atk'], provisional: true,
      when: () => classicBerserk, apply: u => { u.def = 0; u.atk *= 2; } }),

    // CoM2/Warlord's Eternal Night resistance write (+0x089A8/+0x0A8A2) precedes the
    // compiled Darkness block (+0x0A8DA/+0x0A90F). Both are before the Warps. CoM 1 instead
    // writes its Eternal Night penalty after Tactician, below.
    // PROVENANCE[eternalNight:enemyResistance]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'eternalNight:enemyResistance', phase: 'c', writes: ['res'],
      when: () => !isCoM1 && eternalNightEnemyResPenalty !== 0,
      apply: u => { u.res += eternalNightEnemyResPenalty; } }),
    // PROVENANCE[darkness]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'darkness', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => !isCoM1 && hasDarkness,
      apply: u => {
        u.res += darknessResBonus; u.def += darknessDefBonus;
        u.atk += darknessAtkBonus; u.rtb += darknessAtkBonus;
        u.gaze += darknessAtkBonus; u.doomGaze += darknessAtkBonus;
      } }),

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
    // PROVENANCE[warpAttack]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'warpAttack', phase: 'c',
      writes: ['atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => !!(abilities && abilities.warpAttack),
      apply: u => {
        u.atk = Math.floor(u.atk / 2);
        if (isCoMVersion) u.rtb = Math.floor(u.rtb / 2);
        // gazeWarpHalves: CoM 1 only — 0x90764-0x90772 has no ranged_type test, so the
        // halving reaches a gaze. MoM's Warp Attack touches melee only, and CoM2's leaves
        // the gaze fields alone (they are separate fields in `Caster.exe`).
        if (gazeWarpHalves) {
          u.gaze = Math.floor(u.gaze / 2);
          u.doomGaze = Math.floor(u.doomGaze / 2);
        }
      } }),
    // PROVENANCE[warpDefense]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'warpDefense', phase: 'c', writes: ['def'],
      when: () => !!(abilities && abilities.warpDefense),
      apply: u => { u.def = Math.floor(u.def / (isCoMVersion ? 3 : 2)); } }),
    // PROVENANCE[warpResist]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3202-3205 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2061-2065
    statStep({ id: 'warpResist', phase: 'c', writes: ['res'],
      when: () => !!(abilities && abilities.warpResist), apply: u => { u.res = 0; } }),
    // Shatter reduces every attack strength to 1. CoM2: normal units and heroes only;
    // Warlord: any unit.
    // PROVENANCE[shatter]: VERIFIED versions=mom_1.31,mom_cp_1.60.00,com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/DOS reconstructed/unitcalc.c:3217-3239 | Reference docs/Caster binary/Units.RecalculateUnits.pas:2080-2094
    statStep({ id: 'shatter', phase: 'c', writes: ['atk', 'rtb'],
      when: () => !!(abilities && abilities.shatter)
        && (isWarlord || isNormalUnitType(unitTypeVal) || unitTypeVal === 'hero'),
      apply: u => { if (u.atk > 0) u.atk = 1; if (u.rtb > 0) u.rtb = 1; } }),

    // --- c, after the Warp block ---
    // CoM 1 only: Darkness at 0x9084C, then Supreme Light at 0x90992. Both land at full value
    // on the reduced stat. Eternal Night is deliberately not folded in: it is after Tactician.
    // PROVENANCE[darkness:coM1]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'darkness:coM1', phase: 'c',
      writes: ['res', 'def', 'atk', 'rtb', 'gaze', 'doomGaze'],
      when: () => isCoM1 && hasDarkness,
      apply: u => {
        u.res += darknessResBonus;
        u.def += darknessDefBonus;
        if (hasMeleeAttack) u.atk += darknessAtkBonus;
        if (rtbStatActive) u.rtb += darknessAtkBonus;
        if (baseGazeRanged > 0) u.gaze += darknessAtkBonus;
        if (baseDoomGaze > 0) u.doomGaze += darknessAtkBonus;
      } }),
    // Q7, closed: `defense += resistance / 3` is a **live** read of the record, taken where the
    // engine takes it — after Warp Resist and Darkness, before Tactician (0x90992-0x90A53).
    // PROVENANCE[supremeLight:coM1]: UNVERIFIED versions=com_6.08; gap=F52 corrects behavior from R6.1d, but the fixed provenance-domain task still owns the audited source binding; pointer=Reference docs/DOS reconstructed/unitcalc.c:3271-3294
    statStep({ id: 'supremeLight:coM1', phase: 'c', writes: ['def', 'atk', 'rtb'],
      when: () => isCoM1 && supremeLightEligible,
      apply: u => {
        u.def += Math.trunc(u.res / 3);
        u.atk += 2;
        if (u.rtb > 0) u.rtb += 2;
      } }),
    // Tactician, for every CoM engine: CoM 1 at 0x90AB4, CoM2/Warlord at +0x0C890.
    ...abilByPhase.cAfterWarp,
    // CoM 1's Eternal Night resistance penalty is the final stat write before the terminal
    // clamp (0x90B31): after Darkness, Supreme Light's live read, and Tactician.
    // PROVENANCE[eternalNight:enemyResistance:coM1]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'eternalNight:enemyResistance:coM1', phase: 'c', writes: ['res'],
      when: () => isCoM1 && eternalNightEnemyResPenalty !== 0,
      apply: u => { u.res += eternalNightEnemyResPenalty; } }),
    // --- d: magic calc, in UnitCalc.CAS (Warlord only) ---
    ...abilByPhase.d,
    // PROVENANCE[weakness:breath]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:309-313
    statStep({ id: 'weakness:breath', phase: 'd', writes: ['rtb'],
      apply: u => { u.rtb += weaknessRtbModCas; } }),
    // PROVENANCE[rust:ranged]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:492-501
    statStep({ id: 'rust:ranged', phase: 'd', writes: ['rtb'],
      apply: u => { u.rtb += rustRtbMod; } }),
    // Warlord re-implements Focus Magic in `UnitCalc.CAS:83,515`, which puts it *after* the
    // Warps rather than before them — the divergence its twin above records.
    // PROVENANCE[focusMagic:warlord]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'focusMagic:warlord', phase: 'd', writes: ['rtb', 'doomGaze'],
      when: () => isWarlord,
      apply: u => { u.rtb += focusMagicRtbMod; u.doomGaze += focusMagicDoomGazeMod; } }),
    // Colossal Strength scales the attack as it stands at its own position in `d`
    // (UnitCalc.CAS:1227-1243 reads GetStat there), so everything before it in the file
    // scales and everything after does not. Under the buckets its input was a named subtotal;
    // here it is just `u.atk`.
    // PROVENANCE[colossalStrength]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:1227-1240
    statStep({ id: 'colossalStrength', phase: 'd', writes: ['atk', 'rtb'],
      when: () => colossalStrength,
      apply: u => {
        if (hasMeleeAttack) u.atk += colossalScaled(u.atk);
        if (colossalRtbApplies) u.rtb += colossalScaled(u.rtb);
      } }),
    // Psycho Force (UnitCalc.CAS:1413-1417) and Pneuma Field (:1419-1425) both *read*
    // `GETSTAT(U,SResist,0)` — the Resistance standing at their own position in `d`. That is
    // before region `e`, so neither sees the aura pass: a Holy Bonus or Resistance to All aura
    // raises Resistance afterwards and must not feed either effect. Reading the finished record
    // instead — which is what the pre-step code did — over-applied both whenever an aura was
    // present. `%I` is the integer part, so the division truncates toward zero rather than
    // flooring, which is visible only when a curse has driven Resistance negative.
    // PROVENANCE[psychoForce]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:1413-1416
    statStep({ id: 'psychoForce', phase: 'd', writes: ['toHit', 'toBlk'],
      when: () => psychoForceActive,
      apply: u => {
        const psyche = Math.trunc(u.res * levelRank / 2);
        u.toHit += psyche;
        u.toBlk += psyche;
      } }),
    // PROVENANCE[pneumaField]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:1419-1425
    statStep({ id: 'pneumaField', phase: 'd', writes: ['lifeSteal'],
      when: () => pneumaFieldActive,
      apply: u => {
        const drain = Math.trunc(u.res / 2);
        u.lifeSteal = (u.lifeSteal != null && u.lifeSteal <= 0) ? u.lifeSteal - drain : -drain;
      } }),
    // The three effects that close `UnitCalc.CAS`, in its own line order: Blaze of Glory
    // (:1490), Beat of Swiftness (:1509), Hierophany (:1555). All three follow Colossal
    // Strength, and — now that the Warps are in `c` — all three follow those too.
    //
    // Blaze of Glory reads the unit's current Armor, adds that whole value to melee, then
    // subtracts the same value from Defense. The result at this position is exactly zero,
    // including Armor granted by enchantments; later region-e auras can still add Defense.
    // PROVENANCE[blazeOfGlory]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:1490-1501
    statStep({ id: 'blazeOfGlory', phase: 'd', writes: ['def', 'atk'],
      when: () => blazeOfGloryActive,
      apply: u => {
        u.atk += u.def;
        u.def = 0;
      } }),
    // PROVENANCE[beatOfSwiftness]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=current CAS uses %R(defense/10) while calculator uses floor(defense*0.9), so the arithmetic is not established as identical; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS
    statStep({ id: 'beatOfSwiftness', phase: 'd', writes: ['def'],
      when: () => !!(abilities && abilities.beatOfSwiftness),
      apply: u => { u.def = Math.floor(u.def * 0.9); } }),
    // PROVENANCE[hierophany]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalc.CAS:1555-1562
    statStep({ id: 'hierophany', phase: 'd', writes: ['def'],
      when: () => isWarlord && !!(abilities && abilities.hierophany),
      apply: u => { u.def = Math.floor(u.def * 0.5); } }),
    // --- e: the binary's post-hook tail ---
    // The engine clamps here and nowhere else (+0x0CCBC), after `d` and *before* the aura pass
    // and Supreme Light — so those two are not clamped afterwards, and nothing in them can
    // drive a stat negative. It clamps Defense, melee, ranged, Thrown and both breaths to at
    // least 0; it does not clamp Resistance, and neither does MoM's terminal clamp at
    // 0x90B41-0x90B75. The calculator keeps its own non-negative Resistance convention for the
    // resistance rolls, and its own floor of 1 HP.
    //
    // The slot zeroing is the calculator's, not the engine's: a unit with no base melee attack
    // has none, so bonuses that landed on the empty slot are discarded rather than conjuring
    // one. Blaze of Glory is the exception — its armor-to-melee transfer *does* give a
    // melee-less unit a melee attack, so it widens the slot rather than being discarded by it.
    // PROVENANCE[clamp]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
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
    // The aura pass: Holy Bonus (type 1) and Resistance to All (type 3), which are the two
    // aura sources the calculator carries. D23.
    ...abilByPhase.e,
    // Q7, closed: Supreme Light is the last stat write the recompute makes, and its defence
    // component is a **live** read of Resistance — after Warp Resist, after `d`, and after the
    // aura pass, which is why the CoM2 manual's changelog says it is "applied last, after
    // Resistance To All, Holy Bonus, and Prayermaster". The melee and ranged additions are
    // each gated on that base attack existing (D24; CoM2 analysis, *Supreme Light*).
    // PROVENANCE[supremeLight]: VERIFIED versions=com2_1.05.11,com2_warlord_1.5.12.7; sources=Reference docs/Caster binary/Units.RecalculateUnits.pas:2359-2379
    statStep({ id: 'supremeLight', phase: 'e', writes: ['def', 'atk', 'rtb'],
      when: () => !isCoM1 && supremeLightEligible,
      apply: u => {
        u.def += Math.floor(Math.max(0, u.res) / 3);
        if (hasMeleeAttack) u.atk += 2;
        if (rtbStatActive) u.rtb += supremeLightRtbMod;
      } }),
  ];
  // `slots` says which attack slots the unit actually has. A bonus does not conjure one, so
  // an ability step skips a write to a dead slot — which is also the aura pass's own gate,
  // "when the corresponding base attack exists".
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
  const statUnit = runStatSteps(statSteps,
    { res: 0, def: 0, atk: 0, rtb: 0, hp: 0, gaze: 0, doomGaze: 0,
      toHit: 0, toBlk: 0, lifeSteal: existingLifeSteal },
    { version,
      trace: statTrace,
      slots: {
        melee: hasMeleeAttack, rtb: rtbStatActive,
        ranged: rtbStatActive && rangedType !== 'none',
        gaze: baseGazeRanged > 0, doomGaze: baseDoomGaze > 0,
      } });
  const hp = statUnit.hp;
  const effectiveGazeRanged = statUnit.gaze;
  const effectiveDoomGaze = statUnit.doomGaze;
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
  // immunities, Lightning Resist, and Negate First Strike (mobility perks are not combat-
  // damage-relevant here). The half-Defense penalty is applied to finalDef below. The
  // calculator models only the landed outcome, so the strip is unconditional when active.
  if (isWarlord && combatAbilities.hierophany) {
    combatAbilities = {
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
    };
  }

  // To Hit percentage bonuses
  const outlanderToHitBonus = (abilities.outlanderXenoveterinary ? 10 : 0)
    + (abilities.outlanderRadio ? 10 : 0);
  const outlanderRtbToHitBonus = (abilities.outlanderBallisticsTraining ? 20 : 0);
  const outlanderToDefendBonus = abilities.outlanderRadio ? 10 : 0;
  const uphillBattlePct = uphillBattleActive ? 10 : 0;
  // True Sight writes +5 to the shared ranged/thrown/breath To-Hit stat in
  // UnitCalc.CAS:325-328. Eye of Heaven grants True Sight in UnitCalcPre.CAS:1839-1842.
  const trueSightRtbToHitBonus = isWarlord
    && !!(abilities.trueSight || abilities.eyeOfHeaven) ? 5 : 0;
  const meleeToHitBonus = lvl.toHit + wpn.toHit + statUnit.toHit + hwMeleeToHit
    + outlanderToHitBonus + uphillBattlePct;
  const rtbToHitWpn = rangedGetsWpn ? wpn.toHit : 0;

  // Distance penalty (attacker ranged only)
  let rtbDistPenalty = 0;
  if (prefix === 'a' && (rangedType === 'missile' || rangedType === 'boulder') && input.rangedCheck) {
    const dist = Math.max(1, parseInt(input.rangedDist) || 1);
    rtbDistPenalty = distancePenalty(dist, rangedType, !!(abilities && abilities.longRange), version,
      isHero);
  }

  // Pre-clamped To Hit/Block values for combat (decimals 0.1-1.0)
  let toHitMelee = clampPct(30, baseToHitMod + meleeToHitBonus);
  let toHitRtb = clampPct(30, baseToHitRtbMod + lvl.toHit + rtbToHitWpn + rtbDistPenalty
    + statUnit.toHit + hwRtbToHit + outlanderToHitBonus + outlanderRtbToHitBonus
    + uphillBattlePct + trueSightRtbToHitBonus);
  const motherFungusToBlkBonus = motherFungus ? 10 : 0;
  let toBlock = clampPct(30, baseToBlkMod + statUnit.toBlk
    + motherFungusToBlkBonus + survivalInstinctToBlkBonus + outlanderToDefendBonus
    + uphillBattlePct);
  if (energyCannon) {
    // UnitCalc.CAS:1435-1443 reads the unit's To-Hit + Ranged To-Hit
    // stats, capped at 100. Attack-distance and battlefield penalties are
    // applied later and do not change the permanent Destruction modifier.
    const energyCannonToHit = clampPct(
      30,
      baseToHitRtbMod + lvl.toHit + rtbToHitWpn
        + statUnit.toHit + hwRtbToHit
        + outlanderToHitBonus + outlanderRtbToHitBonus + uphillBattlePct
        + trueSightRtbToHitBonus,
    );
    const destructionPenalty = Math.floor((energyCannonToHit * 100) / 15);
    const currentDestruction = combatAbilities.destruction;
    const energyDestruction = currentDestruction != null && currentDestruction <= 0
      ? currentDestruction - destructionPenalty
      : -destructionPenalty;
    combatAbilities = { ...combatAbilities, destruction: energyDestruction };
  }
  // Immolation To Hit: always base 30%, ignoring all modifiers (it's a spell attack)
  let toHitImmolation = 0.3;

  // Warp Reality: -20% To Hit for non-Chaos units. Chaos Channels exempts a unit.
  // Read from global checkbox here so the penalty is reflected in the red display numbers.
  const warpRealityActive = !!input.warpReality;
  const unitIsChaos = unitTypeVal === 'fantastic_chaos';  // Chaos Channels already folds into unitTypeVal
  if (warpRealityActive && !unitIsChaos) {
    toHitMelee      = Math.max(0.1, toHitMelee - 0.2);
    toHitRtb        = Math.max(0.1, toHitRtb - 0.2);
    toHitImmolation = Math.max(0.1, toHitImmolation - 0.2);
  }

  // Hurricane (Warlord Nature rare, global): tropical storm affecting both sides.
  // -20% To Hit for ranged/thrown attacks, -30% To Hit for breath attacks.
  // Breath is identified by thrownType fire/lightning; that is the only case toHitRtb
  // represents a breath attack (ranged attacks are never breath). Melee is unaffected.
  const hurricaneActive = !!input.hurricane;
  const hurricaneRtbPenalty = (thrownType === 'fire' || thrownType === 'lightning') ? 0.3 : 0.2;
  if (hurricaneActive) {
    toHitRtb = Math.max(0.1, toHitRtb - hurricaneRtbPenalty);
  }

  // Warlord True Light: illusion attacks suffer -10% To Hit, for all units
  // regardless of realm (this clause is Warlord-only; not present in MoM).
  if (isWarlord && hasTrueLight && !!(abilities && abilities.illusion)) {
    toHitMelee = Math.max(0.1, toHitMelee - 0.1);
    toHitRtb   = Math.max(0.1, toHitRtb - 0.1);
  }

  let displayToHitMelee = toHitMelee;
  let displayToHitRtb = toHitRtb;
  let displayToBlock = toBlock;

  // Vertigo: reflect the displayed penalty in the red To Hit / To Block numbers.
  // MoM:  -20% To Hit, -1 Defense (the defense die penalty is applied at `displayDef`).
  // CoM 1: -30% To Hit, -10% To Block.
  // CoM2/Warlord: -25% To Hit, -7% To Block — the compiled block reads -25/-7
  // (`Reference docs/Caster binary/CoM2 binary analysis.md`), not CoM 1's -30/-10.
  // These magnitudes mirror `buildVertigoContext` in combat.js; keep the two in step.
  const vertigoActive = !!(abilities && abilities.vertigo)
    && !(abilities && (abilities.illusionImmunity || abilities.magicImmunity));
  const vertigoHitPenalty = isCoM2 ? 0.25 : (isCoMVersion ? 0.3 : 0.2);
  const vertigoBlockPenalty = isCoM2 ? 0.07 : (isCoMVersion ? 0.1 : 0);
  if (vertigoActive) {
    displayToHitMelee = Math.max(0.1, displayToHitMelee - vertigoHitPenalty);
    displayToHitRtb = Math.max(0.1, displayToHitRtb - vertigoHitPenalty);
    displayToBlock = Math.max(0.0, displayToBlock - vertigoBlockPenalty);
  }

  // Every stat total is the step sequence's output; what remains here is the To Hit /
  // To Block work, which is not part of the sequence yet.
  const finalAtk = statUnit.atk;
  const finalDef = statUnit.def;
  const finalRtb = statUnit.rtb;
  const finalRes = statUnit.res;
  if (warlordBerserk) {
    toHitMelee = Math.min(1.0, toHitMelee + 0.15);
    toHitRtb = Math.min(1.0, toHitRtb + 0.15);
    displayToHitMelee = Math.min(1.0, displayToHitMelee + 0.15);
    displayToHitRtb = Math.min(1.0, displayToHitRtb + 0.15);
    toBlock = Math.max(0.0, toBlock - 0.10);
    displayToBlock = Math.max(0.0, displayToBlock - 0.10);
  }

  // Conjuring Pact nausea (Warlord Conjurer retort): a non-fantastic unit struck by
  // Conjuring Pact suffers -10% To Hit and -10% To Defend for the rest of combat.
  // Only the normal-unit debuff is modelled here (the fantastic-creature taming
  // branch is out of scope), so gate to Warlord and to normal units.
  if (isWarlord && abilities && abilities.nausea && isNormalUnitType(unitTypeVal)) {
    toHitMelee = Math.max(0.1, toHitMelee - 0.1);
    toHitRtb = Math.max(0.1, toHitRtb - 0.1);
    displayToHitMelee = Math.max(0.1, displayToHitMelee - 0.1);
    displayToHitRtb = Math.max(0.1, displayToHitRtb - 0.1);
    toBlock = Math.max(0.0, toBlock - 0.1);
    displayToBlock = Math.max(0.0, displayToBlock - 0.1);
  }

  // Plague (Warlord combat curse): −10% To-Hit on the cursed unit (the −3/−3/−6 stat
  // penalties are folded into atk/def/res above). Goblin Pox carries no To-Hit penalty.
  if (plagueActive) {
    toHitMelee = Math.max(0.1, toHitMelee - 0.1);
    toHitRtb = Math.max(0.1, toHitRtb - 0.1);
    displayToHitMelee = Math.max(0.1, displayToHitMelee - 0.1);
    displayToHitRtb = Math.max(0.1, displayToHitRtb - 0.1);
  }

  // Great Unbinding (Warlord Sorcery very rare global): −20% To-Hit and −20% To-Defend
  // on opponent fantastic creatures for the rest of battle (the −2 Resistance is folded
  // into res above). Only fantastic creatures are affected.
  if (greatUnbindingActive) {
    toHitMelee = Math.max(0.1, toHitMelee - 0.2);
    toHitRtb = Math.max(0.1, toHitRtb - 0.2);
    displayToHitMelee = Math.max(0.1, displayToHitMelee - 0.2);
    displayToHitRtb = Math.max(0.1, displayToHitRtb - 0.2);
    toBlock = Math.max(0.0, toBlock - 0.2);
    displayToBlock = Math.max(0.0, displayToBlock - 0.2);
  }

  const displayDef = (vertigoActive && !isCoMVersion) ? Math.max(0, finalDef - 1) : finalDef;

  // R7.3 chance trace.  Strength/identity fields already execute in `statSteps`; To Hit and
  // To Block historically combined their inputs below that sequence.  Run the same inputs
  // through an ordered percentage-point record as the authoritative final projection so
  // every displayed write has a source and a running before/after value.  Common writes are
  // lifted directly from `statTrace`, preserving their binary/CAS positions.
  const chanceTrace = [];
  const chanceFields = {
    melee: ['toHitMelee', 'displayToHitMelee'],
    rtb: ['toHitRtb', 'displayToHitRtb'],
    block: ['toBlock', 'displayToBlock'],
  };
  const chanceContributions = [];
  let chanceSerial = 0;
  const statOrderById = new Map(statSteps.map((step, order) => [step.id, order]));
  const orderOf = (id, fallback) => statOrderById.has(id) ? statOrderById.get(id) : fallback;
  function addChanceContribution(id, source, phase, order, deltas) {
    if (!Object.values(deltas).some(value => value !== 0)) return;
    chanceContributions.push({ id, source, phase, order, deltas, serial: chanceSerial++ });
  }
  function addChanceDelta(id, source, phase, order, fields, value) {
    const deltas = {};
    for (const field of fields) deltas[field] = value;
    addChanceContribution(id, source, phase, order, deltas);
  }

  // PROVENANCE[chance:baseMelee]: UNVERIFIED versions=all; gap=base melee To-Hit initialization lacks exact applicable implementation ranges; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:baseMelee', { id: 'baseToHitMelee', label: 'Base melee To Hit' },
    'base', -30, chanceFields.melee, baseToHitMod);
  // PROVENANCE[chance:baseRtb]: UNVERIFIED versions=all; gap=base ranged/Thrown/Breath To-Hit initialization lacks exact applicable implementation ranges; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:baseRtb', { id: 'baseToHitRtb', label: 'Base ranged/Thrown/Breath To Hit' },
    'base', -29, chanceFields.rtb, baseToHitRtbMod);
  // PROVENANCE[chance:baseBlock]: UNVERIFIED versions=all; gap=base To-Block initialization lacks exact applicable implementation ranges; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:baseBlock', { id: 'baseToBlock', label: 'Base To Block' },
    'base', -28, chanceFields.block, baseToBlkMod);
  for (const event of statTrace) {
    const deltas = {};
    if (event.changes.toHit) {
      for (const field of [...chanceFields.melee, ...chanceFields.rtb]) {
        deltas[field] = event.changes.toHit.delta;
      }
    }
    if (event.changes.toBlk) {
      for (const field of chanceFields.block) deltas[field] = event.changes.toBlk.delta;
    }
    // STAT-FORMULA[chance:statTraceProjection]
    // PROVENANCE[chance:statTraceProjection]: UNVERIFIED versions=all; gap=dynamic projection combines the independently cited source step with percentage fields and lacks one implementation range; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    addChanceContribution(`chance:${event.id}`, event.source, event.phase, event.order, deltas);
  }
  // PROVENANCE[chance:outlanderXenoveterinary]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=To-Hit arithmetic needs its exact current Warlord gate/write range; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS
  addChanceDelta('chance:outlanderXenoveterinary',
    { id: 'outlanderXenoveterinary', label: 'Xenoveterinary' }, 'b',
    orderOf('outlanderXenoveterinary', 0) + 0.1,
    [...chanceFields.melee, ...chanceFields.rtb], abilities.outlanderXenoveterinary ? 10 : 0);
  // PROVENANCE[chance:uphillBattle]: VERIFIED versions=com2_warlord_1.5.12.7; sources=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS:1132-1143
  addChanceDelta('chance:uphillBattle', { id: 'uphillBattle', label: 'Uphill Battle' }, 'b',
    orderOf('uphillBattle', 900) + 0.1,
    [...chanceFields.melee, ...chanceFields.rtb, ...chanceFields.block], uphillBattlePct);
  // PROVENANCE[chance:outlanderRadio:hit]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Radio To-Hit gate/write range has not been matched; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS
  addChanceDelta('chance:outlanderRadio:hit', { id: 'outlanderRadio', label: 'Radio' }, 'b',
    orderOf('outlanderRadio', 920) + 0.1,
    [...chanceFields.melee, ...chanceFields.rtb], abilities.outlanderRadio ? 10 : 0);
  // PROVENANCE[chance:outlanderRadio:block]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Radio To-Defend gate/write range has not been matched; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS
  addChanceDelta('chance:outlanderRadio:block', { id: 'outlanderRadio', label: 'Radio' }, 'b',
    orderOf('outlanderRadio', 920) + 0.2, chanceFields.block, outlanderToDefendBonus);
  // PROVENANCE[chance:outlanderBallisticsTraining]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Ballistics Training ranged To-Hit gate/write range has not been matched; pointer=Reference docs/Script source/Warlord 1.5.12.7/UnitCalcPre.CAS
  addChanceDelta('chance:outlanderBallisticsTraining',
    { id: 'outlanderBallisticsTraining', label: 'Ballistics Training' }, 'b',
    orderOf('outlanderRadio', 920) + 0.3, chanceFields.rtb, outlanderRtbToHitBonus);
  // PROVENANCE[chance:level]: UNVERIFIED versions=all; gap=level To-Hit arithmetic requires per-version implementation and runtime-table citations; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:level', { id: 'level', label: 'Experience level' }, 'c',
    orderOf('level', 0) + 0.1, [...chanceFields.melee, ...chanceFields.rtb], lvl.toHit);
  // PROVENANCE[chance:weapon:melee]: UNVERIFIED versions=all; gap=weapon-material melee To-Hit arithmetic requires per-version implementation/table citations; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:weapon:melee', { id: 'weapon', label: 'Weapon material' }, 'c',
    orderOf('weapon', 10) + 0.1, chanceFields.melee, wpn.toHit);
  // PROVENANCE[chance:weapon:rtb]: UNVERIFIED versions=all; gap=weapon-material ranged To-Hit arithmetic requires per-version implementation/table citations; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:weapon:rtb', { id: 'weapon', label: 'Weapon material' }, 'c',
    orderOf('weapon', 10) + 0.2, chanceFields.rtb, rtbToHitWpn);
  // PROVENANCE[chance:holyWeapon:melee]: UNVERIFIED versions=all; gap=Holy Weapon melee To-Hit gate/write range has not been matched across engines; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:holyWeapon:melee', { id: 'holyWeapon', label: 'Holy Weapon' }, 'c',
    orderOf('weapon', 10) + 0.3, chanceFields.melee, hwMeleeToHit);
  // PROVENANCE[chance:holyWeapon:rtb]: UNVERIFIED versions=all; gap=Holy Weapon ranged To-Hit gate/write range has not been matched across engines; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:holyWeapon:rtb', { id: 'holyWeapon', label: 'Holy Weapon' }, 'c',
    orderOf('weapon', 10) + 0.4, chanceFields.rtb, hwRtbToHit);
  // PROVENANCE[chance:motherFungus]: UNVERIFIED versions=com2_warlord_1.5.12.7; gap=Mother Fungus To-Defend gate/write range has not been matched; pointer=Reference docs/Script source/Warlord 1.5.12.7/CreateUnit.CAS
  addChanceDelta('chance:motherFungus', { id: 'motherFungus', label: 'Mother Fungus' }, 'base',
    orderOf('motherFungus', 10) + 0.1, chanceFields.block, motherFungusToBlkBonus);
  // PROVENANCE[chance:survivalInstinctToBlock]: UNVERIFIED versions=com_6.08,com2_1.05.11,com2_warlord_1.5.12.7; gap=To-Block gate/write requires complete DOS and modern ranges; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:survivalInstinctToBlock',
    { id: 'survivalInstinctToBlock', label: 'Survival Instinct' }, 'c',
    orderOf('survivalInstinct', 100) + 0.1, chanceFields.block, survivalInstinctToBlkBonus);
  // PROVENANCE[chance:trueSight:ranged]: UNVERIFIED versions=all; gap=True Sight ranged To-Hit gate/write range has not been matched across engines; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
  addChanceDelta('chance:trueSight:ranged', { id: 'trueSight', label: 'True Sight' }, 'd',
    -10, chanceFields.rtb, trueSightRtbToHitBonus);
  // PROVENANCE[chance:distancePenalty]: UNVERIFIED versions=all; gap=distance To-Hit penalty requires per-version implementation and runtime-table citations; pointer=Reference docs/Caster binary/Combat.ResolutionHelpers.pas
  addChanceDelta('chance:distancePenalty', { id: 'distancePenalty', label: 'Range distance' },
    'resolution', -100, chanceFields.rtb, rtbDistPenalty);

  chanceContributions.sort((left, right) =>
    STEP_PHASE_RANK[left.phase] - STEP_PHASE_RANK[right.phase]
      || left.order - right.order || left.serial - right.serial);
  // STAT-FORMULA[chance:dynamicProjection]
  // PROVENANCE[chance:dynamicProjection]: UNVERIFIED versions=all; gap=dynamic application writes each collected delta and is not independently established by one implementation range; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
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
    // PROVENANCE[chance:clamp]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:clamp', sourceId: 'statClamp', sourceLabel: 'Stat clamp',
      phase: 'resolution', writes: allChanceFields, apply: u => {
        for (const field of allHitFields) u[field] = Math.max(10, Math.min(100, u[field]));
        for (const field of chanceFields.block) u[field] = Math.max(10, Math.min(100, u[field]));
      } }),
    // PROVENANCE[chance:warpReality]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:warpReality', sourceId: 'warpReality', sourceLabel: 'Warp Reality',
      phase: 'resolution', writes: allHitFields, when: () => warpRealityActive && !unitIsChaos,
      apply: u => { for (const field of allHitFields) u[field] = Math.max(10, u[field] - 20); } }),
    // PROVENANCE[chance:hurricane]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:hurricane', sourceId: 'hurricane', sourceLabel: 'Hurricane',
      phase: 'resolution', writes: chanceFields.rtb, when: () => hurricaneActive,
      apply: u => {
        for (const field of chanceFields.rtb) u[field] = Math.max(10, u[field] - hurricaneRtbPenalty * 100);
      } }),
    // PROVENANCE[chance:trueLightIllusion]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:trueLightIllusion', sourceId: 'trueLight', sourceLabel: 'True Light',
      phase: 'resolution', writes: allHitFields,
      when: () => isWarlord && hasTrueLight && !!abilities.illusion,
      apply: u => { for (const field of allHitFields) u[field] = Math.max(10, u[field] - 10); } }),
    // PROVENANCE[chance:vertigo]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:vertigo', sourceId: 'vertigo', sourceLabel: 'Vertigo',
      phase: 'resolution', writes: ['displayToHitMelee', 'displayToHitRtb', 'displayToBlock'],
      when: () => vertigoActive, apply: u => {
        u.displayToHitMelee = Math.max(10, u.displayToHitMelee - vertigoHitPenalty * 100);
        u.displayToHitRtb = Math.max(10, u.displayToHitRtb - vertigoHitPenalty * 100);
        u.displayToBlock = Math.max(0, u.displayToBlock - vertigoBlockPenalty * 100);
      } }),
    // PROVENANCE[chance:berserkWarlord]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:berserkWarlord', sourceId: 'berserkWarlord', sourceLabel: 'Berserk',
      phase: 'resolution', writes: allChanceFields, when: () => warlordBerserk, apply: u => {
        for (const field of allHitFields) u[field] = Math.min(100, u[field] + 15);
        for (const field of chanceFields.block) u[field] = Math.max(0, u[field] - 10);
      } }),
    // PROVENANCE[chance:nausea]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:nausea', sourceId: 'nausea', sourceLabel: 'Conjuring Pact nausea',
      phase: 'resolution', writes: allChanceFields,
      when: () => isWarlord && !!abilities.nausea && isNormalUnitType(unitTypeVal), apply: u => {
        for (const field of allHitFields) u[field] = Math.max(10, u[field] - 10);
        for (const field of chanceFields.block) u[field] = Math.max(0, u[field] - 10);
      } }),
    // PROVENANCE[chance:plague]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:plague', sourceId: 'plague', sourceLabel: 'Plague',
      phase: 'resolution', writes: allHitFields, when: () => plagueActive,
      apply: u => { for (const field of allHitFields) u[field] = Math.max(10, u[field] - 10); } }),
    // PROVENANCE[chance:greatUnbinding]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'chance:greatUnbinding', sourceId: 'greatUnbinding', sourceLabel: 'Great Unbinding',
      phase: 'resolution', writes: allChanceFields, when: () => greatUnbindingActive, apply: u => {
        for (const field of allHitFields) u[field] = Math.max(10, u[field] - 20);
        for (const field of chanceFields.block) u[field] = Math.max(0, u[field] - 20);
      } }),
  );
  const chanceUnit = runStatSteps(chanceSteps, {
    toHitMelee: 30, toHitRtb: 30, toBlock: 30,
    displayToHitMelee: 30, displayToHitRtb: 30, displayToBlock: 30,
  }, { version, trace: chanceTrace });
  // These assignments make the traced execution path authoritative.  Focused tests assert
  // parity with the existing formulas across the full preset suite.
  toHitMelee = chanceUnit.toHitMelee / 100;
  toHitRtb = chanceUnit.toHitRtb / 100;
  toBlock = chanceUnit.toBlock / 100;
  displayToHitMelee = chanceUnit.displayToHitMelee / 100;
  displayToHitRtb = chanceUnit.displayToHitRtb / 100;
  displayToBlock = chanceUnit.displayToBlock / 100;

  const figureTrace = [];
  const figureUnit = runStatSteps([
    // PROVENANCE[altarOfTheSun:figures]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'altarOfTheSun:figures', sourceId: 'altarOfTheSun',
      sourceLabel: 'Altar of the Sun', phase: 'base', writes: ['figs'],
      when: () => altarOfTheSun, apply: u => { u.figs += 1; } }),
    // PROVENANCE[alumniOfAcademy:figures]: UNVERIFIED versions=all; gap=exact applicable implementation gate/arithmetic ranges not yet matched; pointer=Reference docs/Caster binary/Units.RecalculateUnits.pas
    statStep({ id: 'alumniOfAcademy:figures', sourceId: 'alumniOfAcademy',
      sourceLabel: 'Academy', phase: 'base', writes: ['figs'],
      when: () => alumniOfAcademy, apply: u => { u.figs += 2; } }),
  ], { figs: baseFigs }, { version, trace: figureTrace });

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
    phase: 'resolution', order: 0,
  }, finalDef, displayDef);

  const toHitMeleeHasModifiers = modifierTraces.toHitMelee.entries.length > 0;
  const toHitRtbHasModifiers = modifierTraces.toHitRanged.entries.length > 0;
  const toBlockHasModifiers = modifierTraces.toBlock.entries.length > 0;

  const result = {
    // Base values (for display)
    baseAtk: inputBaseAtk, baseRtb: inputBaseRtb + shadowStrikeGrantedBaseRtb, baseDef: inputBaseDef, baseRes: inputBaseRes, baseHP: inputBaseHP,
    baseToHitMod, baseToHitRtbMod, baseToBlkMod,
    // Bonus breakdown (for display)
    atkBonus: finalAtk - inputBaseAtk,
    rtbBonus: finalRtb - inputBaseRtb - shadowStrikeGrantedBaseRtb,
    defBonus: displayDef - inputBaseDef,
    resBonus: finalRes - inputBaseRes,
    hpBonus: hp - inputBaseHP,
    meleeToHitBonus,
    rtbToHitWpnBonus: rtbToHitWpn,
    rtbToHitLvlBonus: lvl.toHit,
    rtbDistPenalty,
    toHitMeleeHasModifiers,
    toHitRtbHasModifiers,
    toBlockHasModifiers,
    // Effective values (for calculation)
    figs: figureUnit.figs,
    atk: finalAtk, def: finalDef, res: finalRes, hp, rtb: finalRtb, effectiveGazeRanged, effectiveDoomGaze, baseGazeRanged, baseDoomGaze, weapon: effectiveWeapon, unitType: unitTypeVal, isHero, generic: !!input.generic,
    identity,
    identityTrace: identityConversion.trace,
    statTrace,
    modifierTraces,
    dmg: Math.max(0, parseInt(input.dmg) || 0),
    rangedType, thrownType,
    rangedGetsWpn, thrownGetsWpn,
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
  };

  // Modern units have four independent attack fields. Derive each one through the
  // existing ordered sequence in isolation: this preserves every transform's position
  // while the legacy RTB value remains only a pre-R4 card projection.
  // `_modernChannelPass` prevents those child derivations from recursing again.
  if (version.startsWith('com2') && input.modernAttacks && !input._modernChannelPass) {
    const channels = {};
    const modernInputs = { ...input.modernAttacks };
    const hasModernAttack = Object.values(modernInputs)
      .some(attack => attack && attack.strength > 0);
    // These effects can create a field from an otherwise attack-less unit.  Seed that
    // field so its normal source-ordered derivation performs the grant; every other
    // absent field stays absent.
    if (abilities.shadowStrike && !modernInputs.thrown) {
      modernInputs.thrown = { strength: 0, type: 'thrown' };
    }
    if (bombsGrenades && !hasModernAttack && !modernInputs.thrown) {
      modernInputs.thrown = { strength: 0, type: 'thrown' };
    }
    if (focusMagicActive && !hasModernAttack && !modernInputs.ranged) {
      modernInputs.ranged = { strength: 0, type: 'none' };
    }
    // Unconditional: the grant is `firebreath += 4` whatever else the unit carries, so the
    // channel must exist even beside a gaze, a lightning breath or a thrown attack.
    if (ccFireBreathActive && !modernInputs.fireBreath) {
      modernInputs.fireBreath = { strength: 0, type: 'none' };
    }
    if (lightningBladeGrantsBreath && !hasModernAttack && !modernInputs.lightningBreath) {
      modernInputs.lightningBreath = { strength: 0, type: 'none' };
    }
    for (const [key, attack] of Object.entries(modernInputs)) {
      const seeded = (key === 'ranged' && focusMagicActive)
        || (key === 'fireBreath' && ccFireBreathActive)
        || (key === 'lightningBreath' && lightningBladeGrantsBreath);
      if (!attack || (attack.strength <= 0 && key !== 'thrown' && !seeded)) continue;
      const child = deriveUnitStats({
        ...input,
        modernAttacks: null,
        _modernChannelPass: true,
        _modernChannelKey: key,
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
        modifierTrace: child.modifierTraces.sharedAttack,
        toHitTrace: child.modifierTraces.toHitRanged,
      };
      result.modifierTraces.modernAttacks[outputKey] = child.modifierTraces.sharedAttack;
    }
    result.modernAttacks = channels;
  }

  return result;
}
