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

// One ordered chain per engine version, `template` through `e`, is the single mechanism that orders
// a derivation. There is no second one: array order no longer decides anything, and a step whose
// key is absent from its version's chain fails composition rather than landing wherever it was
// authored. The `attackSpecific` lists stay outside the chain — they are a separate compiled
// routine pair run on a scratch copy, not writes RecalculateUnits makes (see M10).
//
// Every chain opens region `a` with `a:baseCopy`, the recalculation's copy of the permanent
// record into the calculated one ($00599A8D in the modern engines, the constructor pair in the
// DOS ones; `precalcBinaryStatSteps`, stats_sequence.js). It writes nothing and publishes
// `ctx.base`, so it is where each chain stops being the permanent record and starts being the
// recalculation: every entry ahead of it is a permanent-record write, every entry behind it a
// write of one of the five regions.
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
// hooks give `b:spiritLink` at UnitCalcPre.CAS!NOSPIRITLINK!-11 "SETSTAT(U,AFantastic,0,1);", the first represented write of that file,
// `marionetteChanneler` at UnitCalcPre.CAS!NOVAMPIRISM!+16 "SETSTAT(U,AFantastic,0,1);", one line ahead of the `marionette:stats` attack
// writes, `fieryFury:race` at UnitCalcPre.CAS!NOTHERO!+6 "IF (BASEFANTASTIC(U)) THEN {", the THEN arm of the same `IF` whose ELSE arm is
// `b:fieryFury`, `sanctify` at UnitCalcPre.CAS!NODOMAINOFENCHANTER!+6 "SETSTAT(U,SRace,0,RCLife);", and `d:spiritLink` at UnitCalc.CAS!NOTICEAGE!+3 "IF GETENCHANTMENTFLAG(U,EncSpiritLink,1) THEN { SETSTAT(U,AFantastic,0,0); }",
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
// `UnitCalc.CAS` under `Reference docs/Script source/Warlord 1.5.12.9/`. `training` joined them
// in F204: its only entries are Warlord's 22 `CreateUnit.CAS` writes, and that list is now the
// script's own line order rather than the order the steps were authored in. `template`,
// `immunities`, `buffs`, `debuffs`, `a` and `e` are still inherited from authoring order and stay
// provisional until sourced.
const TRANSCRIBED_PHASES = new Set(['b', 'c', 'd', 'training']);

// Individual positions inside a transcribed region that the map does not actually give.
// Only CoM 1's `c:raiseDead` is left. It is a combat-spell write — `bu->race =
// rt_Fantastic_No_Realm` at the resurrection site, com1:0xAB2B8 — not a block of this routine, so
// nothing orders it against the blocks around it. The modern builds no longer have one: their
// Raise Dead race change is the No Heal conversion at `$005A0420`, a transcribed block of this
// routine that the cast reaches through a flag, and it is `c:noHealConversion`.
//
// Every other identity conversion sits at its own block's offset. The DOS builds always did:
// `BU_Apply_Specials` (`Reference docs/DOS reconstructed/unitcalc.c`) addresses each of their
// realm writes. The modern conversions used to head region `c` by convention, because the
// calculator ran them in a pre-pass whose only meaningful order was the conversions' order among
// themselves; with the pre-pass gone (F163) they are ordinary steps and take the addresses
// `Units.RecalculateUnits.pas` gives them — Chaos Channels flight $0059F330, its armor block
// $0059F4A3, Blood Lust $0059F5DC, Animated $0059F7D8, the aggregate Undead normalization
// $0059FBD0, and the No Heal conversion $005A0420 immediately after the Mystic Surge block whose
// flag reaches it. Destiny's identity write is not in region `c` at all: it writes the
// *permanent* record (`B.race`, `B.Fantastic` at $0059A390) and is `buffs:destiny`.
// No build but Warlord has reconstructed training-site code, so their `training` positions for the
// persistent loadout and veterancy fields are deduced even though the phase as a whole is
// transcribed. Warlord's two single-block writes — the ore block's `EncOrihalcon` and the
// veterancy block — do have a line, but `training:weaponQuality` merges five separate
// `CreateUnit.CAS` material writes into one step, four of them behind `training:artificer`, so its
// Warlord rank is the first entrance rather than the one a given unit took and it is deduced there
// as well (F244.2).
const DEDUCED_TRAINING_LOADOUT = ['training:weaponQuality', 'training:veterancy'];
const DEDUCED_POSITIONS = Object.freeze({
  'mom_1.31': DEDUCED_TRAINING_LOADOUT,
  'mom_cp_1.60.00': DEDUCED_TRAINING_LOADOUT,
  // CoM 1's Focus Magic position is inferred from the exhaustive list of what its recompute
  // writes after Warp, which does not contain it. Both halves share that one deduced position.
  'com_6.08': [...DEDUCED_TRAINING_LOADOUT, 'training:armorQuality',
    'c:focusMagic', 'c:raiseDead'],
  // The modern builds have no deduced identity position since the No Heal conversion replaced
  // `c:raiseDead`: `$005A0420` is a transcribed block of this routine, where the spell write it
  // stood for was not.
  'com2_1.05.11': [...DEDUCED_TRAINING_LOADOUT, 'training:armorQuality'],
  'com2_warlord_1.5.12.9': ['training:weaponQuality'],
});

function versionChain(version, entries) {
  // Every version names its own deduced-position list. A version with no entry would silently get
  // an empty set and mark its whole chain transcribed (`SPEC.md`, *Out-of-range values stop the
  // run*).
  if (!Object.prototype.hasOwnProperty.call(DEDUCED_POSITIONS, version)) {
    throw new Error(
      `versionChain: '${version}' has no DEDUCED_POSITIONS entry `
      + `(expected one of ${Object.keys(DEDUCED_POSITIONS).join(', ')}).`);
  }
  const deduced = new Set(DEDUCED_POSITIONS[version]);
  return Object.freeze(entries.map(key => {
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
  // Template initialization, then the permanent-record cast writes. F203: the retired curse
  // strip used to stand ahead of `template:stat:base`, i.e. before the record it read was seeded.
  'template:stat:base', 'template:baseThresholds',
  'training:weaponQuality', 'training:veterancy',
  // The immunities the card marks, ahead of every phase that tests them. Order within the
  // phase is this list's own ruling: the two writes touch disjoint fields.
  'immunities:magicImmunity:marked', 'immunities:missileImmunity:marked',
  // The four beneficial cast flags with no roster row, then the nine curse writes: a curse an
  // immunity refuses is never made, rather than made and stripped (F244.3b). Order within a phase
  // is this list's own ruling — the writes touch disjoint fields, and no source ranks them.
  // Bless joined them in F244.3g, when the owned Marionette's Life-ascension `EncBless` write made
  // `bless` a record field; its control is offered in every engine, so the step is too.
  'buffs:trueSight:cast', 'buffs:resistMagic:cast', 'buffs:haste:cast', 'buffs:bless:cast',
  'debuffs:weakness:cast', 'debuffs:blackSleep:cast', 'debuffs:shatter:cast',
  'debuffs:vertigo:cast', 'debuffs:warpAttack:cast', 'debuffs:warpDefense:cast',
  'debuffs:warpResist:cast', 'debuffs:mindStorm:cast',
  'a:baseCopy',
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
  'template:stat:base', 'template:baseThresholds',
  'training:weaponQuality', 'training:veterancy',
  // The immunities the card marks, ahead of every phase that tests them. Order within the
  // phase is this list's own ruling: the two writes touch disjoint fields.
  'immunities:magicImmunity:marked', 'immunities:missileImmunity:marked',
  // The four beneficial cast flags with no roster row, then the nine curse writes: a curse an
  // immunity refuses is never made, rather than made and stripped (F244.3b). Order within a phase
  // is this list's own ruling — the writes touch disjoint fields, and no source ranks them.
  // Bless joined them in F244.3g, when the owned Marionette's Life-ascension `EncBless` write made
  // `bless` a record field; its control is offered in every engine, so the step is too.
  'buffs:trueSight:cast', 'buffs:resistMagic:cast', 'buffs:haste:cast', 'buffs:bless:cast',
  'debuffs:weakness:cast', 'debuffs:blackSleep:cast', 'debuffs:shatter:cast',
  'debuffs:vertigo:cast', 'debuffs:warpAttack:cast', 'debuffs:warpDefense:cast',
  'debuffs:warpResist:cast', 'debuffs:mindStorm:cast',
  'a:baseCopy',
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
  // Template initialization and the construction patches that ride with it, then the
  // permanent-record cast writes (F203). `template:zombies` is gone: the Fantastic bit is the unit-type table's own
  // `UA_FANTASTIC` at file com1:0x2AED2, which the roster already states.
  'template:stat:base', 'template:baseThresholds', 'template:zombies:toBlock',
  'template:constructCatapult', 'template:constructCatapult:weapon', 'template:summonBranch',
  'training:weaponQuality', 'training:armorQuality', 'training:veterancy',
  // The immunities the card marks, ahead of every phase that tests them. Order within the
  // phase is this list's own ruling: the two writes touch disjoint fields.
  'immunities:magicImmunity:marked', 'immunities:missileImmunity:marked',
  // The five beneficial cast flags with no roster row, then the nine curse writes: a curse an
  // immunity refuses is never made, rather than made and stripped (F244.3b). Order within a phase
  // is this list's own ruling — the writes touch disjoint fields, and no source ranks them.
  'buffs:trueSight:cast', 'buffs:resistMagic:cast', 'buffs:haste:cast', 'buffs:bless:cast',
  // Spell Lock is the three CoM-era engines'; `spellLock` became a record field in F244.3f.
  'buffs:spellLock:cast',
  'debuffs:weakness:cast', 'debuffs:blackSleep:cast', 'debuffs:shatter:cast',
  'debuffs:vertigo:cast', 'debuffs:warpAttack:cast', 'debuffs:warpDefense:cast',
  'debuffs:warpResist:cast', 'debuffs:mindStorm:cast',
  'a:baseCopy',
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
  // F203 ordering: template initialization, then the permanent-record writes.
  // `buffs:destiny` is a permanent write the recalculation re-makes on every pass — idempotent,
  // which is what lets it hold this head position as well as `c:destiny`.
  // `buffs:destiny:supernatural` is the same block's third permanent write, chain-adjacent because
  // the conversion keeps writing `race`/`fantastic` alone.
  'template:stat:base', 'template:baseHitChance', 'template:baseThresholds',
  'training:weaponQuality', 'training:armorQuality', 'training:veterancy',
  // The immunities the card marks, ahead of every phase that tests them. Order within the
  // phase is this list's own ruling: the two writes touch disjoint fields.
  'immunities:magicImmunity:marked', 'immunities:missileImmunity:marked',
  // The beneficial cast writes with no roster row — six here, since base CoM2 offers the
  // Discipline and Spell Lock controls and Rebuild is Warlord's (F244.3b–F244.3g) — then Destiny's three
  // per-pass permanent writes, then the nine curse writes. Order within a phase is this list's own
  // ruling: the writes touch disjoint fields and no source ranks them (F244.3b).
  'buffs:trueSight:cast', 'buffs:resistMagic:cast', 'buffs:discipline:cast',
  'buffs:haste:cast', 'buffs:spellLock:cast', 'buffs:bless:cast',
  'buffs:destiny', 'buffs:destiny:supernatural', 'buffs:destiny:level',
  'debuffs:weakness:cast', 'debuffs:blackSleep:cast', 'debuffs:shatter:cast',
  'debuffs:vertigo:cast', 'debuffs:warpAttack:cast', 'debuffs:warpDefense:cast',
  'debuffs:warpResist:cast', 'debuffs:mindStorm:cast',
  'a:baseCopy',
  'a:combatSummoned', 'a:chosen', 'a:constructCatapult', 'a:callToArmsPaladins',
  'a:chaosChannels:fireBreath:race', 'a:chaosChannels:fireBreath',
  'c:level:fantastic', 'c:destiny', 'c:level', 'c:focusMagic',
  'c:lucky', 'c:darkForce', 'c:heavenlyLight', 'c:weapon',
  // $0059E810, between `ApplyMagicWeapons` ($0059E4AD) and Endurance ($0059EC03).
  'c:trueSight',
  'c:endurance', 'c:discipline', 'c:chaosChannels:flight',
  'c:chaosChannels:armor', 'c:chaosChannels:armor:race',
  'c:bloodLust', 'c:animated', 'c:undead',
  'c:flameBlade', 'c:mysticSurge', 'c:noHealConversion', 'c:lionheart',
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

const CHAIN_COM2_WARLORD_1_5_12_9 = versionChain('com2_warlord_1.5.12.9', [
  // F203 ordering. The phase ranks enforce `template` before `training` before `immunities`
  // before `buffs` before `debuffs`; the order *within* `buffs` — the two one-shot spell writes
  // ahead of Destiny's three per-pass ones — is this list's alone, since F210 folded the former
  // `perPass` write kind into the cast-time one and nothing distinguishes them any more.
  'template:stat:base', 'template:baseHitChance', 'template:baseThresholds',
  // Training-time writes, in `CreateUnit.CAS` line order (F204) — every one cites that script and
  // fires once, when the city built the unit. Every `GOTO` across the represented blocks jumps
  // forward, so their line order is the order one unit's creation runs. (The file's one back edge
  // is the `FOR` loop at its head, which ends before the first represented block.)
  //
  // `armorclad` and `alumniOfAcademy:figures` are each one modelled step with two entrances: the
  // creation write here, and a later `OverlandEndTurn.CAS` upgrade pass for a unit that predates
  // the reform. The guard is one-way — the creation site tests only its own building or spell,
  // while the upgrade site tests the marker creation left (`EncArmorClad` at
  // `OverlandEndTurn.CAS!NOTENGINEADDED!+3 "IF (GETENCHANTMENTFLAG(U,EncArmorClad,1)>0) THEN { GOTO"`, `SMultiLabel` at `OverlandEndTurn.CAS!NOOUTLANDERBARAY!+2 "IF (GETSTAT(U,SMultiLabel,1)>0) THEN { GOTO"`) — which is enough for the write to land
  // once however the unit got there. Hence one position, and it is the creation one: this list is
  // `CreateUnit.CAS`'s order, and the upgrade pass reaches an already-created unit outside it.
  // Armorclad has a third, unmodelled script route as well; `combat_abilities.js` records it.
  //
  // Two groups share a block and take the order of their own writes inside it rather than the
  // block's span. The five `naturalSelection:*` run from
  // `CreateUnit.CAS!NOTSURVIVALTHEFITTEST!-23 "SETSTAT U,SResist,ABase,RESIST+OREPOWER;"` to
  // `CreateUnit.CAS!NOTSURVIVALTHEFITTEST!-4 "SETSTAT(U,SDefense,ABase,DEF+1);"`, and the two
  // `altarOfTheSun:*` are the exclusive arms of one `IF`, the Holy Mother strength write at
  // `CreateUnit.CAS!NOALTAROFTHESUN!-10 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,1)+1));"` ahead of
  // the figure write at `CreateUnit.CAS!NOALTAROFTHESUN!-6 "SETSTAT(U,SFigures,1,(GetStat(U,SFigures,1)+1));"`.
  'training:weaponQuality',
  'training:artificer',
  'training:armorQuality',
  'training:militaryWorkshop', 'training:lightningBlade:breath',
  'training:poolOfRepentance', 'training:dragonMound', 'training:ludusAgoge',
  'training:altarOfTheSun:holyMother', 'training:altarOfTheSun:figures',
  'training:altarOfTheMoon', 'training:sanctaBasilica', 'training:motherFungus',
  'training:alumniOfAcademy:figures',
  // The Lava Smelter block, `CreateUnit.CAS`:494-498 — five writes in one `ISBUILT(C,BLavaSmelter)`
  // block between `!NOACADEMY!` (473) and `!NOLAVASMELTER!` (502), in the file's own order. Like
  // `armorclad` these have a second entrance, `OverlandEndTurn.CAS`:527-551's Upgrade & Retrain
  // pass, and take the creation position for the same reason (F244.3c).
  'training:lavaSmelter:weaponImmunity', 'training:lavaSmelter:missileImmunity',
  'training:lavaSmelter:resistElementsAlias', 'training:lavaSmelter:elementalProtection',
  'training:lavaSmelter:flameBlade',
  'training:survivalInstinctToBlock',
  'training:naturalSelection:powerMinerals', 'training:naturalSelection:nightshade',
  'training:naturalSelection:wildGame', 'training:naturalSelection:coal',
  'training:naturalSelection:iron', 'training:pillarOfFaith',
  'training:malnourished',
  // The Outlander reform's five permanent writes, in `CreateUnit.CAS` line order inside the
  // `!HASEVILPRESENCE!` enchant block: Military Drilling's Discipline flag (659-664), the Heat
  // Power Engine flag (677-681), the Anti-Gravity Drive block nested inside it (686-692), the
  // Beam Weapon conversion after it in the same nest (693-699), and the Armorclad block (702-709)
  // whose Magitek Material Science tail sets Resist Magic. The order is load-bearing three times
  // over: `training:temporalDrive` and `training:energyCannon` both read the Power Engine flag
  // off the record and `training:magitekScience` reads the Armorclad one, each the way this
  // block's `OverlandEndTurn.CAS` entrance spells the same term (F244.3d, F244.3e).
  'training:militaryDrilling', 'training:powerEngine', 'training:temporalDrive',
  'training:energyCannon', 'training:armorclad', 'training:magitekScience',
  'training:veterancy',
  // Beneficial cast-time permanent writes. Rebuild and Spirit Link are one-shot, applied when the
  // spell landed; Spirit Link's +2 Resistance has two entrances too — `OLSpell.CAS!NOTAIRSUPPORT!+6 "SETSTAT(TU,SResist,1,(GetStat(TU,SResist,1)+2));"` and the
  // Mystic Surge random grant at `SpellMysticSurge.CAS~"SETSTAT(TU,SResist,1,(GetStat(TU,SResist,1)+2));"` — and one position for the same
  // reason. Destiny's three are the permanent writes the recalculation re-makes on every pass.
  // The immunities the card marks, ahead of every phase that tests them. Order within the
  // phase is this list's own ruling: the two writes touch disjoint fields.
  'immunities:magicImmunity:marked', 'immunities:missileImmunity:marked',
  // The five cast writes the roster template cannot state come first, each ahead of the stat
  // package it admits: `buffs:rebuild` gates on the flag `buffs:rebuild:cast` writes, and
  // `buffs:discipline:cast` overwrites the `overland` `training:militaryDrilling` left (F244.3d).
  // `buffs:haste:cast` is the card's Haste mark, which no roster row can carry now that
  // `training:temporalDrive` has made `haste` a record field (F244.3e).
  'buffs:rebuild:cast', 'buffs:trueSight:cast', 'buffs:resistMagic:cast',
  'buffs:discipline:cast', 'buffs:haste:cast', 'buffs:spellLock:cast', 'buffs:bless:cast',
  // Spirit Link's three permanent writes, in the `SSpiritLink` block's own order: the +2
  // Resistance, then the `IF BASEFANTASTIC(TU)` pair. The engine evaluates that gate once, so
  // the third step takes it latched rather than re-reading the record the second one just
  // cleared; `stats_sequence.js` says so at `buffs:spiritLink:level` (F245).
  'buffs:rebuild', 'buffs:spiritLink',
  'buffs:spiritLink:fantastic', 'buffs:spiritLink:level',
  'buffs:destiny', 'buffs:destiny:supernatural', 'buffs:destiny:level',
  // Then the detrimental ones. Rust's material clear, the nine curse writes and Destiny's writes
  // touch disjoint fields, so the phase ranks decide this order rather than any source. A curse
  // an immunity refuses is never made, rather than made and stripped (F244.3b).
  'debuffs:rust:material',
  'debuffs:weakness:cast', 'debuffs:blackSleep:cast', 'debuffs:shatter:cast',
  'debuffs:vertigo:cast', 'debuffs:warpAttack:cast', 'debuffs:warpDefense:cast',
  'debuffs:warpResist:cast', 'debuffs:nausea:cast', 'debuffs:mindStorm:cast',
  'a:baseCopy',
  'a:combatSummoned', 'a:chosen',
  'a:constructCatapult', 'a:callToArmsPaladins', 'a:chaosChannels:fireBreath:race',
  'a:chaosChannels:fireBreath', 'b:spiritLink', 'b:marionetteChanneler', 'b:marionette:stats',
  // The owned branch in `UnitCalcPre.CAS` line order, one entry per engine write (F244.3g):
  // the realm retype, the fifteen book blocks, then the ascension block — its five
  // primary-realm arms, with the Chaos arm's projectile retype on that arm's third line
  // between Armor Piercing and the Life arm, and last its own five book tests.
  // `b:marionette:ascensionRangedType` sat beside `b:marionette:rangedType` until then, on
  // the argument that nothing modelled wrote a projectile type between the two; twenty-two
  // steps do now.
  'b:marionette:rangedType',
  'b:marionette:books:forester', 'b:marionette:books:mountaineer', 'b:marionette:books:poisonImmunity',
  'b:marionette:books:stoningImmunity', 'b:marionette:books:largeShield', 'b:marionette:books:missileImmunity',
  'b:marionette:books:resistMagic', 'b:marionette:books:firstStrike', 'b:marionette:books:fireImmunity',
  'b:marionette:books:lightningResist', 'b:marionette:books:healer', 'b:marionette:books:illusionImmunity',
  'b:marionette:books:lucky', 'b:marionette:books:coldImmunity', 'b:marionette:books:deathImmunity',
  'b:marionette:books:weaponImmunity', 'b:marionette:ascension:poison', 'b:marionette:ascension:stoningTouch',
  'b:marionette:ascension:counterImmunity', 'b:marionette:ascension:illusion', 'b:marionette:ascension:wallCrusher',
  'b:marionette:ascension:armorPiercing', 'b:marionette:ascensionRangedType', 'b:marionette:ascension:exorcise',
  'b:marionette:ascension:bless', 'b:marionette:ascension:bloodSucker', 'b:marionette:ascension:createUndead',
  'b:marionette:ascension:regeneration', 'b:marionette:ascension:invisibility', 'b:marionette:ascension:destruction',
  'b:marionette:ascension:healingAura', 'b:marionette:ascension:lifeSteal',
  // The strayed branch's own block follows the owned branch's in the file: the package's seven
  // writes, then the Spell Lock write outside their skip, and only 298 lines later Transmute
  // Equipment's hero augmentation and Rebuild's, each reading the permanent flag the package set.
  'b:marionette:strayedPackage', 'b:marionette:spellLock',
  'b:marionette:strayedTransmute', 'b:rebuild', 'b:tactician', 'b:fieryFury:race',
  'b:fieryFury', 'b:insulation', 'b:divineProtection', 'b:natureLink',
  'b:outlanderXenoveterinary', 'b:magitekEngine', 'b:bombsGrenades',
  'b:upgradedExplosive:ranged', 'b:upgradedExplosive:fireBreath',
  'b:outlanderBallisticsTraining', 'b:outlanderXenopsychology', 'b:outlanderRadio',
  'b:battleArmor', 'b:berserkWarlord', 'b:nausea', 'b:uphillBattle', 'b:soulFlay', 'b:sanctify',
  'b:eternalNight:poorVision',
  'b:greatUnbinding', 'b:prayer', 'b:rally', 'b:trueLight', 'b:plague', 'b:goblinPox',
  'b:luckyStar', 'b:disheartenProphecy', 'b:wallOfFire:garrison', 'b:godsPlayDices',
  // `UnitCalcPre.CAS!ENDOFCOMBAT!+2..+5 ", all friendly units gain True Sight while enemy lose all gaze ability :" "}"`, the last block of region `b`, immediately before the combat
  // `HALT` — the grant the CoM2 region map records as crossing the hook boundary deliberately.
  'b:eyeOfHeaven',
  'c:level:fantastic', 'c:destiny',
  'c:level', 'c:focusMagic', 'c:lucky', 'c:darkForce', 'c:heavenlyLight',
  'c:weapon',
  // $0059E810, between `ApplyMagicWeapons` ($0059E4AD) and Endurance ($0059EC03).
  'c:trueSight',
  'c:endurance', 'c:discipline', 'c:chaosChannels:flight',
  'c:chaosChannels:armor', 'c:chaosChannels:armor:race', 'c:animated', 'c:undead',
  'c:flameBlade', 'c:mysticSurge', 'c:noHealConversion',
  'c:lionheart', 'c:ironSkin', 'c:landLinking', 'c:holyArmor', 'c:orihalcon',
  'c:holyWeapon', 'c:chaosSurge', 'c:survivalInstinct',
  'c:innerPower', 'c:blazingEyes', 'c:reinforceMagic',
  'c:eternalNight:enemyResistance', 'c:charmOfLife',
  'c:nodeAura', 'c:badMoon', 'c:goodMoon', 'c:natureConjunction', 'c:highPrayer', 'c:prayer',
  'c:blazingMarch', 'c:breakthrough:normal', 'c:breakthrough:noncorporeal',
  'c:breakthrough:combatSummoned', 'c:warpReality', 'c:blackPrayer', 'c:darkness', 'c:guardian',
  'c:vertigo', 'c:weakness', 'c:mindStorm', 'c:warpAttack', 'c:warpDefense', 'c:warpResist',
  'c:shatter', 'c:spellWard', 'c:tactician',
  // `UnitCalc.CAS!NOTPLANEWALK!+2..+12 ", +1 poison and gain poison immunity :" "!NOVENOM!"`, ahead of every other represented write of that file.
  'd:venom',
  'd:mechanicalExpert', 'd:weakness',
  // `UnitCalc.CAS!NOANGELICGUARDIAN!+2..+12 ": on the opposite, Night Goblin gain bonus from Darkness or Eternal Night :"`, between combat Flame Blade (`UnitCalc.CAS!NOTZEAL!+8 "IF (GETCOMBATENCHANTMENTFLAG(U,EncFlameBlade,0)>0) THEN {"`) and Rust (`UnitCalc.CAS!NOTCITY!+11 "IF (GETENCHANTMENTFLAG(U,EncRust,0)=0) THEN { GOTO"`).
  'd:trueSight', 'd:flameBlade', 'd:nightGoblinsNightVision', 'd:rust', 'd:hurricane',
  'd:favoredTerrain', 'd:fortification', 'd:colossalStrength', 'd:vampirism:transfer',
  'd:shadowStrike:thrown',
  'd:spiritLink', 'd:energyWeaponry', 'd:psychoForce', 'd:pneumaField',
  'd:energyCannonThreshold',
  // `UnitCalc.CAS!IMMUNETOROT!+8..+11 "IF (HASCOMBATGLOBAL(W,CGEyeOfHeaven,2)>0) THEN {" "SETSTAT(U,SDoomGaze,0,0);"`, the first block past the file's
  // tactical-combat guard and immediately ahead of Blaze of Glory.
  'd:eyeOfHeaven:enemyGaze',
  'd:blazeOfGlory', 'd:beatOfSwiftness', 'd:hierophany', 'e:modernClampCommon', 'e:clamp',
  'e:holyBonus', 'e:guidingBeaconAura', 'e:resistanceToAll', 'e:divineBarrierAura',
  'e:soulLinkerAura', 'e:leadershipAura', 'e:mislead', 'e:supremeLight',
]);

const STAT_CHAINS = Object.freeze({
  'mom_1.31': CHAIN_MOM_1_31,
  'mom_cp_1.60.00': CHAIN_MOM_CP_1_60,
  'com_6.08': CHAIN_COM_6_08,
  'com2_1.05.11': CHAIN_COM2_1_05_11,
  'com2_warlord_1.5.12.9': CHAIN_COM2_WARLORD_1_5_12_9,
});

// The chain of one version, in execution order. Built once at load, so a derivation looks its
// chain up rather than reassembling it. An unknown version is a caller bug, not a version with an
// empty engine, so it throws instead of falling back to some other build's order.
function statChain(version) {
  const chain = STAT_CHAINS[version];
  if (!chain) throw new Error(`no execution chain for version ${version}`);
  return chain;
}
