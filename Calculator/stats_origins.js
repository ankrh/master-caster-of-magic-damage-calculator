// --- Where an ability key comes from (F244.3a) ---
// The origin table: for every raw ability key the derivation can see, how the unit comes to carry
// it in the engine. `deriveUnitStats` seeds `statRecord` from `effectiveAbilities` — the ability
// map after seven pre-sequence transforms — so today's seed is the map after the grants, not the
// roster template. F244.3b makes the seed template-only and turns every other seeded key into a
// positioned write; this table is what tells it which key takes which phase, and it is read by
// `tools/unit_checks/ability_origins.js` rather than only by prose.
//
// **Origin is not step phase.** A cast enchantment's origin is `buffs` because the cast writes the
// flag onto the unit's record; the stat package the recalculation then builds from that flag is a
// region-`c` step and stays there. The origin answers which writer put the flag on the unit, which
// is the question the record seed asks.
//
// The tokens. The six the item names, with two of its classes split because the split is what
// `ORIGIN_PHASE` needs:
//   template   a roster/card fact — the unit ships with it (`UNITS.INI`, the DOS unit record)
//   training   a permanent write made when the city built or upgraded the unit
//              (`CreateUnit.CAS`, `OverlandEndTurn.CAS`, a DOS constructor)
//   buffs      a beneficial cast's permanent write
//   debuffs    a curse's permanent write
//   regionA/B/C/D  a recalculation-time grant, by the region that makes it: `a` and `c` in the
//              binary, `b` in `UnitCalcPre.CAS` and `d` in `UnitCalc.CAS`. The item names
//              region-`b`/`d`; `a` (the Golem's Resist Elements) and `c` (True Sight's Illusion
//              Immunity) are the same class at two more ranks, and a row that named them `b` would
//              hand F244.3b the wrong phase
//   nonRecord  the permanent record never carries it: a global or combat enchantment, a wizard
//              retort or research state, a city/terrain/army condition, or a query input
//   derived    a calculator-internal key standing for no engine flag at all
//
// A key with more than one origin carries one row per origin, with the version scope of that
// origin and the producers that make it.
//
// **What the check pins, and what it does not.** `tools/unit_checks/ability_origins.js` re-derives
// two classes of `versions` and halts on a disagreement: a `template` row must cover exactly the
// versions a control offers the key in (`abilityVersionGated`, `ability_gating.js`), and a row whose
// producers are *all* steps must equal the union of their `STEP_VERSION_SCOPES` entries. Every
// other row — `cast:`, `input:`, `grant:`, `transform:`, `postChain:`, and any row mixing a step
// with one of those — carries a scope the check can only test for membership in the engine list
// and for covering the versions a control offers. Those scopes are read off the sources by hand,
// and a wrong one is not mechanically visible. What *is* enforced for every row is the producer
// grammar below: each producer form admits only the origins it can possibly stand for.
//
// Producer strings:
//   `control`                 the card control itself states the fact
//   `control:<key>`           a second control naming the same calc key states it
//   `cast:<text>`             the cast's own write, named where no calculator step makes it
//   `input:<text>`            what the control asks the user for, for a `nonRecord` row
//   `grant:<text>`            an engine grant made at training or recalculation time,
//                             named where no calculator step makes it
//   `step:<id>`               a positioned step that writes the key
//   `transform:<name>`        one of the pre-sequence transforms
//   `postChain:<name>`        a write made after the chain has run
//   `none`                    nothing writes it — see the defect list in `JOURNAL.md`
//
// A `cast:` or `input:` producer is a **mention**, not an audited anchor: the write is named, and
// the anchor for it lives on the step that reads the flag (`PROVENANCE[…]` in `stats_sequence.js`
// and `combat_abilities.js`) or on the transform that makes it (`stats_identity.js`). That is the
// same rule the F244.1 census used for its training rows, and for the same reason — restating the
// anchor here would give it two homes.
//
// Two things this table deliberately does not do. It does not say whether a key is a record field
// today (`POSITIONED_GRANT_FIELDS`, `POSITIONED_GRANT_WRITES`, `POSITIONED_GRANT_VALUE_WRITES` and
// `MAGIC_IMMUNITY_GATED_CURSES` in `stats_identity.js` own that, and the check reconciles the two),
// and it does not rank producers within an origin — the chain does that.

const ABILITY_ORIGINS = Object.freeze([
  'template', 'training', 'immunities', 'buffs', 'debuffs',
  'regionA', 'regionB', 'regionC', 'regionD', 'nonRecord', 'derived',
]);

// The phase a positioned write of a key of this origin takes (F244.3b), and what its `when` may
// read there: a `training` write runs before `a:baseCopy`, so its gate cannot read `ctx.base` at
// all; a `buffs` or `debuffs` write reads the record as the earlier phases left it, which is what
// makes a curse refusable by an immunity the `immunities` phase wrote; a region write reads the
// calculated record at its own rank. `null` is a key that never reaches the record, so it takes no
// step and no seed field.
const ORIGIN_PHASE = Object.freeze({
  template: 'template', training: 'training', immunities: 'immunities',
  buffs: 'buffs', debuffs: 'debuffs',
  regionA: 'a', regionB: 'b', regionC: 'c', regionD: 'd',
  nonRecord: null, derived: null,
});

// **`immunities` is scaffolding, and it is the one origin that does not name an engine writer.**
// The CLAUDE.md phase table says the immunities the card marks are written to the permanent record
// before anything tests them, and the user's ruling of 2026-09-02 puts that write in this phase.
// The calculator cannot say *which* writer put a marked immunity there, because the card's innate
// control and its enchantment control are merged into one calc key before the derivation sees them
// (`mergeAbilityCalcValue`, `combat_abilities.js`), so a row here means "the card marks it, and the
// calculator writes it at the phase the contract names" rather than "a cast wrote it".
//
// It retires when the derivation input can tell the two apart: at that point each key's row goes
// back to `template` for the innate control and `buffs` for the enchantment one, and the step
// splits with it. Until then a key with a row here is **not seeded** — the phase write is its only
// source, which is what makes the write positioned rather than hoisted (F244.3b, Option C).
const MARKED_IMMUNITY_ORIGIN = 'immunities';

// The pre-sequence transforms that still write the ability map (`stats.js`, `stats_identity.js`).
// Named here so a producer cannot invent one. The F244.1 census listed seven; `markIntrinsicLucky`
// was deleted by F244.3b, `applyLavaSmelterGrant` by F244.3c (its five grants are
// `training:lavaSmelter:*` steps now), `applyOutlanderReformGrants` by F244.3e — it grants
// nothing any more and is `deriveOutlanderReformRecord`, which returns the eligibility record the
// reform's positioned steps read their `when` from — and `deriveMarionettePackage` by F244.3g,
// which positioned the owned branch's thirty-one grants after F244.3f positioned the strayed
// branch's eight. Which is why the list is three.
const ABILITY_ORIGIN_TRANSFORMS = Object.freeze([
  'golemShaping', 'applySanctaBasilicaGrant', 'applyPillarOfFaithGrant',
]);

// A `debuffs`-origin key the curse lists do not carry, with why. The rule is deliberately
// asymmetric, because the two lists are subsets selected by immunity behaviour rather than
// exhaustive lists of detrimental casts: **every immunity-gated curse-list key has a `debuffs`
// origin, and every `debuffs` key is either on one of those lists or named here with its reason.**
// Those lists gate on Magic or Illusion Immunity; a curse outside them is one the engine's own
// rule does not block that way, or one whose absence is an open question. `rust` is the open one: its `spells.ini` record ([88])
// carries no `NonMagic`, and the rule the list states ("by default, spells are blocked by Magic
// Immunity") therefore puts it in — see `JOURNAL.md`, 2026-09-02, F244.3a.
const DEBUFFS_OUTSIDE_CURSE_LISTS = Object.freeze({
  hierophany: 'spells.ini [239] carries NonMagic, so Magic Immunity does not block it',
  mislead: 'the spell roll gates the targeted unit; the Misfortune/Jinx debuff then spreads '
    + 'army-wide with no per-unit check',
  soulFlay: 'no immunity term in the block; membership never asserted',
  rust: 'open — the stated membership rule would include it; nothing decides it here',
});

const ABILITY_KEY_ORIGINS = Object.freeze({
  altarOfTheMoon: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held an Altar of the Moon'] },
  ],
  altarOfTheSun: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held an Altar of the Sun'] },
  ],
  alumniOfAcademy: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held the Academy'] },
  ],
  amplifier: [
    { origin: 'template', versions: SCOPE_WARLORD,
      producers: ['control'] },
  ],
  angelicGuardians: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the owner holds the Angelic Guardians global enchantment'] },
  ],
  animated: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Animate Dead writes EncUndead on the permanent record'] },
  ],
  arcaneWard: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:strayedPackage'] },
  ],
  armorPiercing: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:militaryWorkshop'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:armorPiercing'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:blazeOfGlory'] },
  ],
  armorclad: [
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:armorclad'] },
  ],
  armorcladReform: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  artificer: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the owner holds the Artificer retort'] },
  ],
  badMoon: [
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the Bad Moon world state'] },
  ],
  ballisticsTraining: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  beatOfSwiftness: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the CGBeatOfSwiftness combat global'] },
  ],
  berserk: [
    { origin: 'buffs', versions: SCOPE_MOM,
      producers: ['cast:Berserk writes EncBerserk on the unit'] },
  ],
  baseFantastic: [
    // Identity metadata, not an ability. Its home is the identity record
    // (`identity.baseFantastic`); `combat_abilities.js` and `combat_effects.js` read it off the
    // ability map only as a fallback when the identity record is absent. It stands for no engine
    // ability flag, so no positioned write follows from it.
    { origin: 'derived', versions: SCOPE_ALL,
      producers: ['none'] },
  ],
  berserkWarlord: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:the Medicineman Berserk cast writes EncBerserk on the unit'] },
  ],
  blackChannels: [
    { origin: 'buffs', versions: SCOPE_MOM,
      producers: ['cast:Black Channels writes its flag on the unit'] },
  ],
  blackPrayer: [
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:the CGBlackPrayer combat global'] },
  ],
  blackSleep: [
    { origin: 'debuffs', versions: SCOPE_ALL,
      producers: ['step:debuffs:blackSleep:cast'] },
  ],
  blackpowder: [
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:militaryWorkshop'] },
  ],
  blazeOfGlory: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncBlazeOfGlory on the unit'] },
  ],
  blazingEyes: [
    // `Units.RecalculateUnits.pas:1892` `Wizards[j].GlobalEnchantments[GEBlazingEyes]`. Warlord
    // renames the global Chaos Embrace and keeps the same slot.
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the owner holds the Blazing Eyes / Chaos Embrace global enchantment'] },
  ],
  blazingMarch: [
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:the CGBlazingMarch combat global'] },
  ],
  bless: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['step:buffs:bless:cast'] },
    // The owned Marionette's Life-ascension arm, `SETENCHANTMENTFLAG(U,EncBless,1,1)` - a permanent
    // write made inside the region-`b` hook, so the row is `regionB` and the step is (F244.3g).
    // The row was missing until then: the transform granted the key and the table had only the
    // cast row, which no check could catch because a transform row was never required.
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:bless'] },
  ],
  bloodLust: [
    { origin: 'buffs', versions: SCOPE_COM_PLUS,
      producers: ['cast:Blood Lust writes its flag on the unit'] },
  ],
  bloodSucker: [
    { origin: 'template', versions: SCOPE_WARLORD,
      producers: ['control'] },
    // `SETSTAT(U,ABloodsucker,0,1)` in the owned Marionette's Death-ascension arm. Missing from the
    // table until F244.3g for the same reason `bless`'s row was.
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:bloodSucker'] },
  ],
  blur: [
    // Not a unit enchantment in either family. The DOS builds read the side-indexed combat
    // enchantment (`combat.c` BLUR_ATTKR 0x1C / BLUR_DFNDR 0x1D, `combat_enchantments[...]`);
    // the modern builds ask the tactical defender's army.
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:the side the unit fights on carries Blur'] },
  ],
  bombsGrenades: [
    { origin: 'derived', versions: SCOPE_WARLORD,
      producers: ['none'] },
  ],
  breakthrough: [
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the CGBreakthrough combat global'] },
  ],
  caster: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
  ],
  ccDefense: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Chaos Channels writes its permanent flag'] },
  ],
  ccFireBreath: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Chaos Channels writes its permanent flag'] },
  ],
  ccFlight: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Chaos Channels writes its permanent flag'] },
  ],
  channeler: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Wanderer has a Channeler owner'] },
  ],
  charmOfLife: [
    // A player/wizard global in both families: `unitcalc.c:1622` and `:1737`
    // `players[...].Globals[OE_CHARM_OF_LIFE]`, and `Units.RecalculateUnits.pas:1938`
    // `Wizards[U.owner].GlobalEnchantments[GECharmofLife]`.
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:the owner holds the Charm of Life global enchantment'] },
  ],
  charmed: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:strayedPackage'] },
  ],
  clergy: [
    { origin: 'template', versions: SCOPE_WARLORD,
      producers: ['control'] },
  ],
  coal: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:coal near the training city'] },
  ],
  coldImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:insulation', 'step:b:marionette:books:coldImmunity'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  colossalStrength: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncColossalStrength on the unit'] },
  ],
  combatSummoned: [
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:the unit was summoned during this combat'] },
  ],
  counterImmunity: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:counterImmunity'] },
  ],
  createUndead: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:createUndead'] },
  ],
  darkForce: [
    // The item-power loop writes the calculated record: `if item.powers[IPDarkForce] then
    // U.darkforce := True` (`Units.RecalculateUnits.pas:1084-1085`), read back by its own stat
    // package at `:1395`. The loop runs after the UnitCalcPre hook, so the grant is region `c`.
    { origin: 'regionC', versions: SCOPE_MODERN,
      producers: ['grant:the item-power loop sets U.darkforce for an item with the Dark Force power'] },
  ],
  deathGaze: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
  ],
  deathImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:divineProtection', 'step:b:marionette:books:deathImmunity'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  deathTouch: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
  ],
  destiny: [
    { origin: 'buffs', versions: SCOPE_MODERN,
      producers: ['cast:Destiny / Apotheosis writes B.race, B.Fantastic, B.level'] },
  ],
  destruction: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:destruction'] },
  ],
  discipline: [
    { origin: 'buffs', versions: SCOPE_MODERN,
      producers: ['step:buffs:discipline:cast'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:militaryDrilling'] },
  ],
  disheartenProphecy: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Dishearten Prophesy city curse (CITYENCHANT)'] },
  ],
  dispelEvil: [
    { origin: 'template', versions: SCOPE_MOM,
      producers: ['control'] },
  ],
  divineBarrierAura: [
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:the strongest friendly Divine Barrier aura'] },
  ],
  divineProtection: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncDivineProtection on the unit'] },
  ],
  doom: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
  ],
  doomGaze: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
  ],
  dragonMound: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held a Dragon Mound'] },
  ],
  eldritchWeapon: [
    { origin: 'buffs', versions: SCOPE_MOM,
      producers: ['cast:Eldritch Weapon writes its flag on the unit'] },
  ],
  elemArmor: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Resist Elements / Elemental Armor write their flags on the unit'] },
    { origin: 'regionA', versions: SCOPE_COM_PLUS,
      producers: ['transform:golemShaping'] },
  ],
  elementalArmor: [
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:lavaSmelter:elementalProtection'] },
  ],
  endurance: [
    { origin: 'buffs', versions: SCOPE_COM_PLUS,
      producers: ['cast:Endurance writes its flag on the unit'] },
  ],
  energyBeamWeapons: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  energyCannon: [
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:energyCannon'] },
  ],
  energyCannonDestruction: [
    { origin: 'derived', versions: SCOPE_WARLORD,
      producers: ['postChain:deriveUnitStats'] },
  ],
  energyWeaponry: [
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:energyWeaponry'] },
  ],
  eternalNight: [
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:the Eternal Night global enchantment'] },
  ],
  exorcise: [
    { origin: 'template', versions: SCOPE_COM_PLUS,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:exorcise'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyAngelicGuardiansEffects'] },
  ],
  explosive: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  eyeOfHeaven: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the CGEyeOfHeaven combat enchantment'] },
  ],
  favoredTerrain: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the unit stands on its favored combat tile'] },
  ],
  fear: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Cloak of Fear writes its flag on the unit'] },
  ],
  fieryBlade: [
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:lavaSmelter:flameBlade'] },
  ],
  fieryFury: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncFieryFury on the unit'] },
  ],
  fireImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:insulation', 'step:b:marionette:books:fireImmunity'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  firstStrike: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:firstStrike'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:blazeOfGlory'] },
  ],
  flameBlade: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Flame Blade writes its flag on the unit'] },
  ],
  flying: [
    { origin: 'template', versions: SCOPE_WARLORD,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:temporalDrive'] },
  ],
  focusMagic: [
    { origin: 'buffs', versions: SCOPE_COM_PLUS,
      producers: ['cast:Focus Magic writes its flag on the unit'] },
  ],
  forester: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:forester'] },
  ],
  fortification: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the unit defends inside city walls'] },
  ],
  giantStrength: [
    { origin: 'buffs', versions: SCOPE_MOM,
      producers: ['cast:Giant Strength writes its flag on the unit'] },
  ],
  godsPlayDices: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the EncDICE combat-enchantment flags rolled at combat start'] },
  ],
  goodMoon: [
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the Good Moon world state'] },
  ],
  greatUnbinding: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the opponent\'s GEGreatUnbinding global'] },
  ],
  guardian: [
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:the owner holds the Guardian retort'] },
  ],
  guidingBeaconAura: [
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:the strongest friendly Guiding Beacon aura'] },
  ],
  haste: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['step:buffs:haste:cast'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:temporalDrive'] },
  ],
  healer: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:healer'] },
  ],
  healingAura: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:healingAura'] },
  ],
  heatPowerEngine: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  heavenlyLight: [
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:a Heavenly Light city or a friendly Guardian Spirit node'] },
  ],
  hierophany: [
    { origin: 'debuffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncHierophany on the unit'] },
  ],
  highPrayer: [
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:the CGHighPrayer combat global'] },
  ],
  holyArmor: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Holy Armor writes its flag on the unit'] },
  ],
  holyBonus: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:a stackmate provides the bonus'] },
  ],
  holyWeapon: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Holy Weapon writes its flag on the unit'] },
  ],
  illusion: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:illusion'] },
  ],
  illusionImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:temporalDrive'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:illusionImmunity'] },
    { origin: 'regionC', versions: SCOPE_ALL,
      producers: ['step:c:trueSight'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  immolation: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Immolation writes its flag on the unit'] },
  ],
  innerPower: [
    // `Units.RecalculateUnits.pas:1867` `Wizards[U.owner].GlobalEnchantments[GEInnerPower]`.
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the owner holds the Inner Power global enchantment'] },
  ],
  insulation: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncInsulation on the unit'] },
  ],
  invisibility: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Invisibility writes its flag on the unit'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:invisibility'] },
  ],
  invulnerability: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Invulnerability writes its flag on the unit'] },
  ],
  iron: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:iron near the training city'] },
  ],
  ironSkin: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Iron Skin writes its flag on the unit'] },
  ],
  landLinking: [
    { origin: 'buffs', versions: SCOPE_COM_PLUS,
      producers: ['cast:Land Linking / Nature Link writes its flag on the unit'] },
  ],
  largeShield: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:magitekEngine', 'step:b:marionette:books:largeShield'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:fortification', 'step:d:rust'] },
  ],
  lavaSmelter: [
    // The legacy selector `lavaSmelterGrantSteps` still accepts (`marked.lavaSmelter || 'none'`,
    // `stats_identity.js`) so old presets and share payloads keep loading. No current
    // definition exposes it; it names which mineral pair the training city held.
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:legacy selector naming the training city Lava Smelter mineral pair'] },
  ],
  lavaSmelterElementalArmor: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the owner holds the Lava Smelter mineral pair'] },
  ],
  lavaSmelterFieryBlade: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the owner holds the Lava Smelter mineral pair'] },
  ],
  lavaSmelterMissileImmunity: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the owner holds the Lava Smelter mineral pair'] },
  ],
  lavaSmelterResistElements: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the owner holds the Lava Smelter mineral pair'] },
  ],
  lavaSmelterWeaponImmunity: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the owner holds the Lava Smelter mineral pair'] },
  ],
  leadershipAura: [
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the strongest friendly Leadership aura'] },
  ],
  lifeSteal: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:altarOfTheMoon'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:lifeSteal'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:pneumaField'] },
  ],
  lightningBlade: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held an Altar of Storm'] },
  ],
  lightningResist: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:insulation', 'step:b:marionette:books:lightningResist'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  lionheart: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Lionheart writes its flag on the unit'] },
  ],
  longRange: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
  ],
  lucky: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['transform:applySanctaBasilicaGrant', 'transform:applyPillarOfFaithGrant'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:divineProtection', 'step:b:marionette:books:lucky'] },
  ],
  luckyPhaseBase: [
    { origin: 'derived', versions: SCOPE_WARLORD,
      producers: ['transform:applySanctaBasilicaGrant', 'transform:applyPillarOfFaithGrant'] },
  ],
  luckyStar: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:a friendly unit carries Lucky Star'] },
  ],
  ludusAgoge: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held a Ludus Agoge'] },
  ],
  magicImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'immunities', versions: SCOPE_ALL,
      producers: ['step:immunities:magicImmunity:marked'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['transform:applySanctaBasilicaGrant'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  magitekEngineering: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  magitekScience: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  malnourished: [
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:malnourished'] },
  ],
  marionetteAscension: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  marionetteBaseSkill: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  marionetteChaosBooks: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  marionetteConjurer: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  marionetteDeathBooks: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  marionetteLifeBooks: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  marionetteNatureBooks: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  marionettePrimary: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  marionetteSorceryBooks: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the Channeler wizard\'s Marionette state'] },
  ],
  mechanical: [
    { origin: 'template', versions: SCOPE_WARLORD,
      producers: ['control'] },
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['step:buffs:rebuild'] },
  ],
  mechanicalExpert: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the friendly side holds a Mechanical Expert source'] },
  ],
  mechanicalMaster: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:strayedPackage'] },
  ],
  merging: [
    { origin: 'template', versions: SCOPE_MODERN,
      producers: ['control'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  metalFires: [
    { origin: 'nonRecord', versions: SCOPE_MOM,
      producers: ['input:the Metal Fires global enchantment'] },
  ],
  militaryDrilling: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  militaryWorkshop: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held a Military Workshop'] },
  ],
  mindStorm: [
    { origin: 'debuffs', versions: SCOPE_ALL,
      producers: ['step:debuffs:mindStorm:cast'] },
  ],
  mislead: [
    { origin: 'debuffs', versions: SCOPE_MODERN,
      producers: ['cast:Mislead / Liability writes its flag on the unit'] },
  ],
  missileImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'immunities', versions: SCOPE_ALL,
      producers: ['step:immunities:missileImmunity:marked'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:lavaSmelter:missileImmunity'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:missileImmunity', 'control:hillfort'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:fortification', 'postChain:applyHierophanyAbilityStrip', 'control:hillfort'] },
  ],
  motherFungus: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held a Mother Fungus'] },
  ],
  mountaineer: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:mountaineer'] },
  ],
  mysticSurge: [
    { origin: 'buffs', versions: SCOPE_COM_PLUS,
      producers: ['cast:Mystic Surge writes its flag on the unit'] },
  ],
  natureConjunction: [
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the Nature Conjunction world state'] },
  ],
  nausea: [
    { origin: 'debuffs', versions: SCOPE_WARLORD,
      producers: ['step:debuffs:nausea:cast'] },
  ],
  negateFirstStrike: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  nightshade: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:nightshade near the training city'] },
  ],
  nonCorporeal: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
  ],
  outlanderWizard: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the owner is an Outlander wizard'] },
  ],
  pillarOfFaithLucky: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held the Pillar of Faith'] },
  ],
  pillarOfFaithRes: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:religious buildings counted in the training city'] },
  ],
  plague: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the CGPlague combat global'] },
  ],
  pneumaReactor: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  poison: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:altarOfTheMoon', 'step:training:militaryWorkshop', 'step:training:motherFungus'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:poison'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:venom'] },
  ],
  poisonImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:altarOfTheMoon'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:poisonImmunity'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:venom', 'postChain:applyHierophanyAbilityStrip'] },
  ],
  poolOfRepentance: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held a Pool of Repentance'] },
  ],
  powerEngine: [
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:powerEngine'] },
  ],
  powerMinerals: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:power minerals near the training city'] },
  ],
  prayer: [
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:the CGPrayer combat global'] },
  ],
  prayermasterAura: [
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the strongest friendly Prayermaster aura'] },
  ],
  psychoConverter: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  radio: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  rage: [
    { origin: 'template', versions: SCOPE_WARLORD,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:altarOfTheMoon'] },
  ],
  raiseDead: [
    // The calculator key marks "this unit was raised". No engine flag of that name exists: CoM 1's
    // routine sets no enchantment flag, and the modern cast writes a *different* key,
    // `B^.CombatEnchantmentFlags[EncNoHeal]`
    // (`Spells.InitializeCombatSpellcasting.pas:85`), which `c:noHealConversion` already reads.
    // So the key is a query input; ruled 2026-09-03, and reversible — see `JOURNAL.md`.
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:the unit was revived by Raise Dead'] },
  ],
  rally: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the CGRally combat global'] },
  ],
  realmWard: [
    { origin: 'nonRecord', versions: SCOPE_COM1,
      producers: ['input:the defending city holds the ward'] },
  ],
  rebuild: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['step:buffs:rebuild:cast'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:strayedPackage'] },
  ],
  regeneration: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:regeneration'] },
  ],
  reinforceMagic: [
    // `Units.RecalculateUnits.pas:1902` `Wizards[U.owner].GlobalEnchantments[GEReinforceMagic]`.
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the owner holds the Reinforce Magic global enchantment'] },
  ],
  resistElements: [
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:lavaSmelter:resistElementsAlias'] },
  ],
  resistMagic: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['step:buffs:resistMagic:cast'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:magitekScience'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:resistMagic'] },
  ],
  resistanceToAll: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'nonRecord', versions: SCOPE_ALL,
      producers: ['input:a stackmate provides the bonus'] },
  ],
  revenant: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:Revenant writes EncRevenant index 1 on the unit'] },
  ],
  righteousness: [
    { origin: 'buffs', versions: SCOPE_MOM,
      producers: ['cast:Righteousness writes its flag on the unit'] },
  ],
  ritualMaster: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:strayedPackage'] },
  ],
  rocketry: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held a Rocketry works'] },
  ],
  rulerOfUnderworld: [
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the Ruler of Underworld global enchantment'] },
  ],
  rust: [
    { origin: 'debuffs', versions: SCOPE_WARLORD,
      producers: ['cast:Rust writes EncRust on the unit', 'step:debuffs:rust:material'] },
  ],
  sage: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:strayedPackage'] },
  ],
  sailing: [
    { origin: 'template', versions: SCOPE_WARLORD,
      producers: ['control'] },
  ],
  sanctaBasilica: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the training city held a Sancta Basilica'] },
  ],
  sanctify: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncSanctify on the unit'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['transform:applySanctaBasilicaGrant'] },
  ],
  sapiens: [
    { origin: 'template', versions: SCOPE_WARLORD,
      producers: ['control'] },
  ],
  shadowStrike: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncShadowStrike on the unit'] },
  ],
  shatter: [
    { origin: 'debuffs', versions: SCOPE_ALL,
      producers: ['step:debuffs:shatter:cast'] },
  ],
  soulFlay: [
    { origin: 'debuffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncSoulFlay on the unit'] },
  ],
  soulLinkerAura: [
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:the strongest friendly Soul Linker aura'] },
  ],
  spellLock: [
    { origin: 'buffs', versions: SCOPE_COM_PLUS,
      producers: ['step:buffs:spellLock:cast'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:spellLock'] },
  ],
  spellWard: [
    { origin: 'nonRecord', versions: SCOPE_MODERN,
      producers: ['input:the defending city holds the ward'] },
  ],
  spiritLink: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncSpiritLink index 1 on the permanent record'] },
  ],
  stoneSkin: [
    { origin: 'buffs', versions: SCOPE_MOM,
      producers: ['cast:Stone Skin writes its flag on the unit'] },
  ],
  stoningGaze: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
  ],
  stoningImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:stoningImmunity'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  stoningTouch: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:ascension:stoningTouch'] },
  ],
  supernatural: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'buffs', versions: SCOPE_MODERN,
      producers: ['step:buffs:destiny:supernatural'] },
  ],
  supremeLight: [
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:the CGSupremeLight combat global'] },
  ],
  survivalInstinct: [
    // A player/wizard global in both families: `unitcalc.c:2653`
    // `players[bu->controller_idx].survival_instinct`, and
    // `Units.RecalculateUnits.pas:1849` `Wizards[U.owner].GlobalEnchantments[GESurvivalInstinct]`.
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:the owner holds the Survival Instinct global enchantment'] },
  ],
  survivalInstinctToBlock: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:precious-metal veins near the training city'] },
  ],
  tactician: [
    { origin: 'nonRecord', versions: SCOPE_COM_PLUS,
      producers: ['input:the owner holds the Tactician retort'] },
  ],
  teleporting: [
    { origin: 'template', versions: SCOPE_MODERN,
      producers: ['control'] },
    { origin: 'buffs', versions: SCOPE_MODERN,
      producers: ['cast:the Planewalking cast writes Teleporting on the unit'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  temporalEngineering: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  temporalTwist: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the side holds the Temporal Twist combat global; the block tests '
        + 'HASCOMBATGLOBAL(W,CGTemporalTwist,2) and reads no per-unit flag'] },
  ],
  transmuteEquipment: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:strayedPackage'] },
  ],
  trueSight: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['step:buffs:trueSight:cast'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:eyeOfHeaven'] },
  ],
  undead: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:the Undead cast writes EncUndead on the unit'] },
  ],
  upgradedExplosive: [
    { origin: 'derived', versions: SCOPE_WARLORD,
      producers: ['none'] },
  ],
  uphillBattle: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the unit is AI-controlled against the human player'] },
  ],
  vampirism: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncVampirism index 1 on the permanent record'] },
  ],
  venom: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncVenom on the unit'] },
  ],
  vertigo: [
    { origin: 'debuffs', versions: SCOPE_ALL,
      producers: ['step:debuffs:vertigo:cast'] },
  ],
  wallCrusher: [
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:bombsGrenades', 'step:b:marionette:ascension:wallCrusher'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['step:d:blazeOfGlory'] },
  ],
  wallOfFireBoost: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:the defended city holds Wall of Fire'] },
  ],
  warpAttack: [
    { origin: 'debuffs', versions: SCOPE_ALL,
      producers: ['step:debuffs:warpAttack:cast'] },
  ],
  warpDefense: [
    { origin: 'debuffs', versions: SCOPE_ALL,
      producers: ['step:debuffs:warpDefense:cast'] },
  ],
  warpResist: [
    { origin: 'debuffs', versions: SCOPE_ALL,
      producers: ['step:debuffs:warpResist:cast'] },
  ],
  weakness: [
    { origin: 'debuffs', versions: SCOPE_ALL,
      producers: ['step:debuffs:weakness:cast'] },
  ],
  weaponImmunity: [
    { origin: 'template', versions: SCOPE_ALL,
      producers: ['control'] },
    { origin: 'training', versions: SCOPE_WARLORD,
      producers: ['step:training:lavaSmelter:weaponImmunity'] },
    { origin: 'regionB', versions: SCOPE_WARLORD,
      producers: ['step:b:marionette:books:weaponImmunity'] },
    { origin: 'regionD', versions: SCOPE_WARLORD,
      producers: ['postChain:applyHierophanyAbilityStrip'] },
  ],
  wildGame: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:wild game near the training city'] },
  ],
  wraithForm: [
    { origin: 'buffs', versions: SCOPE_ALL,
      producers: ['cast:Wraith Form writes its flag on the unit'] },
  ],
  xenopsychology: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  xenoveterinary: [
    { origin: 'nonRecord', versions: SCOPE_WARLORD,
      producers: ['input:Outlander research state (SPELLSTATE)'] },
  ],
  zeal: [
    { origin: 'buffs', versions: SCOPE_WARLORD,
      producers: ['cast:EncZeal on the unit'] },
  ],
});

// Fail loud on a key no row claims: the checks and F244.3b ask this rather than guessing, and a
// silent `undefined` would let a new control seed the record unclassified.
function abilityOriginRows(key) {
  const rows = ABILITY_KEY_ORIGINS[key];
  if (!rows) {
    throw new Error(`abilityOriginRows: '${key}' has no origin row. Every ability and enchantment `
      + 'key, and every key a pre-sequence transform writes, needs one in '
      + 'Calculator/stats_origins.js.');
  }
  return rows;
}

// The phases a positioned write of this key would take, in chain order, with the never-positioned
// origins dropped. An empty list means the key belongs on no record at any rank.
function abilityOriginPhases(key) {
  const phases = [];
  for (const row of abilityOriginRows(key)) {
    const phase = ORIGIN_PHASE[row.origin];
    if (phase && !phases.includes(phase)) phases.push(phase);
  }
  return phases.sort((a, b) => STEP_PHASE_RANK[a] - STEP_PHASE_RANK[b]);
}

// True where the unit's own roster record can carry the key — the one origin F244.3b leaves in the
// seed.
function abilityOriginIsTemplate(key, version) {
  return abilityOriginRows(key)
    .some(row => row.origin === 'template' && row.versions.includes(version));
}

// True where the key is a marked immunity this version writes in the `immunities` phase. Such a key
// is never seeded, however template-capable it also is: the phase write is its only source, which
// is what the ruling of 2026-09-02 asks for and what keeps the write positioned (F244.3b).
function abilityOriginIsMarkedImmunity(key, version) {
  return abilityOriginRows(key)
    .some(row => row.origin === MARKED_IMMUNITY_ORIGIN && row.versions.includes(version));
}
