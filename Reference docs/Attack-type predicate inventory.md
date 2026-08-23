# Attack-type predicate inventory

Every `rangedType`/`thrownType` test the calculator's stat derivation makes, read twice: the
**position** in the engine each one models, and whether its **breadth** matches the gate the
engine applies at that position. Recorded 2026-08-20 from the F84 sweep.

This is an evidence document. It records what was found and what it was checked against; it
carries no priority, status, blocker or next action — those live only in `Calculator/BACKLOG.md`.

## What this was checked against

| Corpus | Use |
|---|---|
| [`Caster binary/Units.RecalculateUnits.pas`](./Caster%20binary/Units.RecalculateUnits.pas) | CoM2 1.05.11 / Warlord 1.5.12.7 compiled control flow, including all 13 `Ismagicalranged` call sites and the `@Units@ApplyLevelBonus`, `@Units@ApplyMagicWeapons` and aura-pass bodies |
| [`Script source/Warlord 1.5.12.7/`](./Script%20source/Warlord%201.5.12.7/) | `CreateUnit.CAS`, `UnitCalcPre.CAS`, `UnitCalc.CAS`, `Levelbonus.INI`, `RangedType.INI` |
| [`Script source/CoM2 1.05.11 base/`](./Script%20source/CoM2%201.05.11%20base/) | `Levelbonus.INI`, `RangedType.INI` |
| [`DOS reconstructed/unitcalc.c`](./DOS%20reconstructed/unitcalc.c) | MoM 1.31 / CP 1.60 / CoM 1, for the shared-slot rows |
| `Calculator/stats.js`, `Calculator/stats_sequence.js`, `Calculator/stats_manifests.js`, `Calculator/combat_abilities.js` | the predicates and the chains that position them |

## Method, and why the sweep is exhaustive

`rangedType` and `thrownType` appear on **96 lines of `Calculator/stats.js`** and **45 lines of
`Calculator/stats_sequence.js`** (`grep -c`, uncapped; both listings were read in full, in two
halves each, so no result was truncated). Adding the base-record spellings `rtbTypeRaw`,
`gazeType`, `RANGED_TYPES`, `THROWN_TYPES` and `GAZE_TYPES` takes `stats.js` to 108 lines. Those
141 lines collapse into **73 numbered `E` entries plus 12 `S` rows** below: E1–E22 read the
permanent record, E23–E66 read the running pair inside `buildSlotContext`, E67–E73 sit outside it
in `stats.js`, and S1–S12 are the type-reading or type-writing steps of `stats_sequence.js`.
Multi-line tests are one entry; pure plumbing (field-name maps, destructuring, record seeding to
`'none'`) is not an entry and is listed under *Not predicates* at the end so the 141 lines are
accounted for.

The item's own estimate was "23 named predicate consts plus the inline tests across `:857-1107`".
The named-const count is right if `focusMagicBaseRangedPresent`, `preFocusRtbPositive` and the
`marionette`/`blackpowder` helpers are excluded; the line range is not — the tests run from
`stats.js:741` to `:1947`, and four of the sharpest findings below (E1–E3, E59, E62, E63) are
outside `:857-1107`.

**The sweep is exhaustive over recalculation, not over resolution.** Every entry below reads a
projectile type during `deriveUnitStats`, against `Units.RecalculateUnits.pas`. The engine reads
the same field again at attack time, in `Combat.ApplyAttack`'s per-attack-type block — `magicranged`,
`missileranged`, `isbreath`, `isfire` and `islightning` (`Combat.ApplyAttack.pas:221-338`) — whose
calculator counterpart is `computeCasterDefenseForAttack` in `combat_effects.js`. Those five were
never in scope here, and one of them was missing: the modern ranged branch set no `isLightning`,
so `islightning := … or (Units[au].rangedtype = 30)` had no counterpart and Lightning Resist did
not clear Armor Piercing against a lightning-bolt ranged attack. Fixed by
[F124](../Calculator/HISTORY.md); the other four match.

### Reading key

**Position** — does the predicate read the record at the point in the chain where its consuming
step executes?

- `permanent` — reads the base/permanent record, and the engine does too.
- `live` — reads the calculated record at the consuming step's own position.
- `stale` — precomputed before a type write the consuming step executes after.
- `early` — computed before a type write that the chain places earlier than it.
- `wrong-record` — reads the calculated record where the engine reads `BaseUnits`, or the reverse.

**Breadth** — does the set of types it admits match the engine's gate at that position?

- `match`, `narrow`, `wide`, `wrong-shape` (a type test standing in for a strength test, or the
  reverse).

## The structural fact the whole inventory turns on

`buildSlotContext` computes every type-dependent modifier **once**, from a
`rangedType`/`thrownType` pair that it advances through five writes of its own — Military
Workshop's missile-to-boulder upgrade, Lightning Blade, Energy Cannon, Chaos Channels Fire Breath
and Bombs & Grenades' Thrown grant — then Focus Magic's conversion. The comment above them states
the intended invariant: "each predicate below is written where its own step sits in the execution
chain, so it reads the identity the record carries at that point."

Two things broke that invariant, and between them they account for most of what follows.

1. **The five pre-Focus writes were applied in an order the chain does not have.** ~~The code order
   was Military Workshop, Bombs & Grenades, Lightning Blade, Chaos Channels, Energy Cannon,
   against the Warlord chain's `base:militaryWorkshop`, `base:lightningBlade:breath`,
   `base:energyCannon`, `a:chaosChannels:fireBreath`, `b:bombsGrenades`
   (`stats_manifests.js`); Bombs & Grenades ran four positions too early, Energy Cannon and Chaos
   Channels were transposed, and `baseSequenceRangedType`/`baseSequenceThrownType` — which
   `base:stat:base` uses to seed the record — were snapshotted *after* the Bombs & Grenades
   grant, so a region-`b` type write was baked into the base seed.~~ **Closed by
   [F94](../Calculator/HISTORY.md):** the pair advances in chain order, the seed carries the
   permanent record alone, and `base:militaryWorkshop` and `b:bombsGrenades` write their own
   types. Its only arithmetic consequence was Fiery Fury's `+2` reaching a Thrown field
   `b:bombsGrenades` had not yet created.

2. ~~**The pair stops advancing at `c:focusMagic`.** Three later steps write types on the live
   record and no precomputed predicate sees them: `d:rust`, `d:shadowStrike:thrown` and
   `d:blazeOfGlory`. Every precomputed predicate consumed at or after `d:rust` in the Warlord
   chain is therefore reading a pair that is up to three writes out of date. That is the whole of
   region `e`.~~ **Closed by [M14](../Calculator/HISTORY.md):** the pair is gone. Every
   type-dependent modifier and gate is now read from the record at its own consuming step, and
   `buildSlotContext` returns slot identity and permanent-record facts alone. Measured across
   15,480 derivations in all five versions, one number moved — see the CoM 1 ordering row added to
   the *Ismagicalranged* map below.

**Section B's rows record the pass as it stood on 2026-08-20, with the line numbers it had then.**
They are kept as the reading that produced the items, not as a description of the current code: a
row's `stale`/`early` verdict is answered wholesale by M14, and its `narrow`/`wide`/`wrong-shape`
breadth verdict is what the remaining items still turn on.

The Weakness case F84 names as its starting point is no longer live: `c:weakness` sits well
before `d:blazeOfGlory` in the Warlord chain, so `weaknessHitsRanged` (E57) reads the pair the
engine has at that position. `F81` and `F83` closed it. What the sweep found instead are five
further cases of the same shape — a correct number reached through a branch the engine does not
take — recorded as E24, E29, E30, E40 and E58 below, plus a sixth (E67 at
`e:guidingBeaconAura`, closed by [F96](../Calculator/HISTORY.md) along with the four aura
strength gates; E40 remains).

## `Ismagicalranged` call-site map

`Ismagicalranged(rt)` is `False` for `rt < 1` and otherwise the moddable `RangedType.INI` entry's
`Ismagic` byte (`Units.RecalculateUnits.pas:2968-2975`). **A unit with no ranged attack passes
`not Ismagicalranged(...)`.** All 13 call sites, and the calculator symbol that stands for each:

| # | Site | Routine / effect | Argument record | Gate | Calculator counterpart | Verdict |
|---|---|---|---|---|---|---|
| I1 | `:513` | `ApplyLevelBonus`, hero arm — selects `HeroLvToRanged`'s magical flag | `BaseUnits[i].rangedtype` | selector, not a gate | none — heroes use the normal ladder (`F41`) | not modelled |
| I2 | `:549` | `ApplyLevelBonus`, normal arm — chooses `NormalMagicRanged` vs `NormalMissileRanged` | `BaseUnits[i].rangedtype` | selector, not a gate | `rtbLvl` (`stats.js:864-869`) | **diverges** — one `lvl.ranged` for both tables, and the live pair, not `BaseUnits` |
| I3 | `:651` | `ApplyMagicWeapons` — ranged strength, display bonus, `hitchanceranged` | `Units[i].rangedtype` | `not Ismagicalranged` | `rangedGetsWpn` (`stats.js:943`) | **diverges** — `missile\|\|boulder` is narrower ([F89](../Calculator/HISTORY.md)) |
| I4 | `:902` | Focus Magic, fourth branch of the ranged if/else | `B.rangedtype` | `not Ismagicalranged` | `focusMagicConvertsRanged` (`stats.js:891-892`) | **diverges** — narrower, and reads the calculated record |
| I5 | `:1452` | Heavenly Light / Guardian-node material tail — `hitchanceranged` | `U.rangedtype` | `not Ismagicalranged` | `heavenlyLightRangedNonmagical` (`stats.js:1074-1075`) | **diverges** — excludes `'none'` ([F89](../Calculator/HISTORY.md)) |
| I6 | `:1554` | Discipline, level 3+ — ranged strength and display bonus | `U.rangedtype` | `not Ismagicalranged` | `disciplineRtbMod` (`stats.js:988-989`) | **diverges** — `missile\|\|boulder` is narrower; **not previously enumerated** |
| I7 | `:1730` | Lionheart — ranged strength and display bonus | `U.rangedtype` | `not Ismagicalranged` | `lionheartRtbMod` (`stats.js:985-987`) | **diverges** — `missile\|\|boulder` is narrower; **not previously enumerated** |
| I8 | `:1786` | Orihalcon — ranged strength and display bonus | `U.rangedtype` | `Ismagicalranged` | `orihalconRtbMod` (`stats.js:1000-1002`) | matches `isMagicalRangedType`; table breadth settled by [F93](../Calculator/HISTORY.md) |
| I9 | `:1808` | Holy Weapon — `hitchanceranged` | `U.rangedtype` | `not Ismagicalranged` | `hwRangedToHit` (`stats.js:1059-1060`) | **diverges** — narrower ([F89](../Calculator/HISTORY.md)) |
| I10 | `:1906` | Reinforce Magic — ranged strength and display bonus | `U.rangedtype` | `Ismagicalranged` | `reinforceMagicRtbMod` (`stats.js:1020-1022`) | matches; table breadth settled by [F93](../Calculator/HISTORY.md) |
| I11 | `:2583` | Leadership aura (kind 8) — `Inc(U.ranged, A.value div 2)` | `U.rangedtype` | `not Ismagicalranged` **and** `U.ranged > 0` | `leadershipAura` step (`combat_abilities.js:537-563`) | matches, after [F89](../Calculator/HISTORY.md) widened the type half and [F96](../Calculator/HISTORY.md) removed the extra `slots.ranged` test. Reads the live type, which is right. |
| I12 | `:2621` | Supreme Light combat global — eligibility, first disjunct | `U.rangedtype` | `Ismagicalranged` | `supremeLightActiveForUnit`'s `liveRangedType` (`combat_abilities.js:145`, fed from `stats.js:946`) | right answer, `stale` mechanism — see E45 |
| I13 | `:2622` | Supreme Light combat global — eligibility, second disjunct | `B.rangedtype` | `Ismagicalranged` | the same helper's `baseRangedType` (fed from `stats.js:947`) | matches |

Three sites — I6, I7, I11 — are additional instances of exactly the narrow-predicate question
[F89](../Calculator/HISTORY.md) owned, and were not in its list of three. F89 took its call-site
inventory from this sweep; this table is that inventory, and F89 settled all six sites from it.

## The inventory

### A. Tests that read the permanent record (E1-E22)

The engine reads `BaseUnits` at these points too, so `position` is `permanent` unless noted.

| # | Symbol | Line | Consumed by | Engine position and source | Position | Breadth |
|---|---|---|---|---|---|---|
| E1 | `rangedType` seed | `stats.js:741` | the whole block | the record's `rangedtype` field; `RangedType.INI` supplies the entry | permanent | match, settled by [F93](../Calculator/HISTORY.md) — the modern vocabulary is now `missile`/`boulder`/`magic`/`magic_lightning`, the two classifications `Ismagic`/`Ismissile` really carry plus the id-30 split; the DOS half keeps its realm names because `Battle_Unit_Attack_Magic_Realm` is a real table. Modded ids halt roster generation naming the id ([F112](../Calculator/HISTORY.md)) |
| E2 | `thrownType` seed | `:742` | the whole block | the record's Thrown/Fire/Lightning fields, which `Caster.exe` keeps separately | permanent | `wrong-shape` — one type token stands for three independent record fields; harmless while each modern slot carries one channel |
| E3 | `gazeType` seed | `:745` | `dosGazeStrength`, `baseDoomGaze` | DOS shared slot only; CoM2/Warlord carry independent gaze fields | permanent | match |
| E4 | `modernBaseHasBlackpowderChannel` | `:755-757` | Military Workshop gate | `CreateUnit.CAS` blackpowder eligibility | permanent | match |
| E5 | `modernBaseHasPhysicalBlackpowderChannel` | `:758-760` | Military Workshop AP grant | same | permanent | match |
| E6 | `selectedBaseHasBlackpowderChannel` | `:761-763` | same, shared slot | same | permanent | match |
| E7 | `selectedBaseHasPhysicalBlackpowderChannel` | `:764-766` | same, shared slot | same | permanent | match |
| E8 | `blackpowderSelectedPhysicalRanged` | `:773-774` | `base:militaryWorkshop` | same | permanent | match |
| E9 | `blackpowderSelectedThrown` | `:775` | `base:militaryWorkshop` | same | permanent | match |
| E10 | `blackpowderSelectedFireBreath` | `:776` | `base:militaryWorkshop` | same | permanent | match |
| E11 | missile-to-boulder upgrade | `:777-779` | writes the pair | `base:militaryWorkshop` | permanent | match |
| E12 | `hasGazeAttack` | `:784-787` | `ccDosBreathEligible` | DOS Chaos Channels admission | permanent | match |
| E13 | `ccDosBreathEligible` | `:789-790` | `a:chaosChannels:fireBreath` | `unitcalc.c` DOS admission gate | permanent | match |
| E14 | `lightningBladeGrantsBreath` | `:809-810` | `base:lightningBlade:breath` | `CreateUnit.CAS` Lightning Blade | permanent | match |
| E15 | `lightningBladeConvertsThrown` | `:811-812` | `base:lightningBlade:breath` | same | permanent | match |
| E16 | `hasPermanentRangedStat` | `:767` | `base:energyCannon`, `base:ludusAgoge`, `base:motherFungus`, `base:altarOfTheMoon`; and, for the DOS-shaped shared slot only, `slots.persistentRanged` | `CreateUnit.CAS` city gates, which do read a permanent ranged type | permanent | match — the Misfortune consumer is gone with [F96](../Calculator/HISTORY.md); on the shared slot the permanent type is what says the one value is the Ranged field |
| E17 | `alumniOfAcademy` magical-ranged arm | `:832-836` | `base:alumniOfAcademy:figures` | `CreateUnit.CAS:462-464` Academy branch | permanent | match since [F93](../Calculator/HISTORY.md); it was **`narrow`** when this was written. The engine's gate is `GetStat(U,SRangedType,1) > 29`, the whole magical band, and the three realm tokens excluded Warlord's own id 40. Measured 2026-08-21: a Halfling 6-figure card typed `beam` derived 6 figures where the engine gives 8 |
| E18 | `focusMagicBaseRangedPresent` | `:871-873` | `c:focusMagic` conversion arms | `B.ranged = 0` at `:892`/`:900` | permanent | `narrow` — the engine tests base *strength*; this is strength **and** type |
| E19 | `supremeLightActiveForUnit`'s `baseRangedType` | `:947` | `e:supremeLight` | `Ismagicalranged(B.rangedtype)` at `:2622` | permanent | match |
| E20 | `naturalSelectionWildGameRangedSlot`, shared arm | `:1015-1017` | `base:naturalSelection:wildGame` | `CreateUnit.CAS` Wild Game snapshot | permanent | match |
| E21 | `dosGazeStrength` | `:1098-1099` | `base:stat:base` gaze seed | DOS shared slot; no modern counterpart | permanent | match |
| E22 | `baseDoomGaze` gaze arm | `:1367-1368` | `base:stat:base` | same | permanent | match |

### B. Tests that read the running pair inside `buildSlotContext` (E23-E66)

| # | Symbol | Line | Consuming step (chain key) | Engine position and source | Position | Breadth |
|---|---|---|---|---|---|---|
| E23 | Bombs & Grenades Thrown grant | `stats.js`, `bombsGrenadesGrantsThrown` | `b:bombsGrenades` | `UnitCalcPre.CAS:1071` bombs block | live since [F94](../Calculator/HISTORY.md) — applied at its own chain position, and written to the record by its own step rather than by the `base:stat:base` seed | match since [F101](../Calculator/HISTORY.md) — the slot breadth this row first called `match` was not: the grant carried no slot test and fired on every channel field standing empty at `b:bombsGrenades`, where the engine writes `SThrown` alone. It now asks `isThrownFieldSlot` |
| E24 | `ccFireBreathActive`, modern arm | `stats.js`, after the Energy Cannon flip | `a:chaosChannels:fireBreath` | `Units.RecalculateUnits.pas` Chaos Channels breath | live since [F94](../Calculator/HISTORY.md) — the Energy Cannon flip now precedes it, as the chain does. The transposition moved no number: Energy Cannon requires a permanent conventional ranged attack, so `rangedType === 'none'` fails either way, and on the modern record the two write different channel slots | match |
| E25 | `lightningBladeOwnsThisSlot`, shared arm | `:804-806` | `base:lightningBlade:breath` | `CreateUnit.CAS` | live | match |
| E26 | Energy Cannon beam write | `:847-849` | `base:energyCannon` | `CreateUnit.CAS` Energy Cannon | live | match |
| E27 | `ffRtbMod` | `:856-858` | `b:fieryFury` | `UnitCalcPre.CAS:832-846` | live | match |
| E28 | `bombsGrenadesRtbMod` | `:859-861` | `b:bombsGrenades` | `UnitCalcPre.CAS` bombs block | live | match |
| E29 | `rtbLvl` | `:864-869` | `c:level` | `ApplyLevelBonus` normal arm `:547-571`, hero arm `:507-527` | **`wrong-record`**, settled by [F95](../Calculator/HISTORY.md) — the engine's four gates read `BaseUnits.rangedtype`, `.thrown`, `.firebreath`, `.lightningbreath`; this read the live pair. **Measured:** a Warlord Outlander unit with Explosive Reform, melee 5, one figure and no base secondary attack derives Thrown 7 at Recruit, **8** at Veteran and **9** at Champion; the `+1`/`+2` is `lvl.thrown` at `c:level`. `UnitCalcPre.CAS:1071` writes `SETSTAT(U,SThrown,0,…)` — record selector `0`, the calculated record — so `BaseUnits[i].thrown` is still zero at `ApplyLevelBonus` and the engine adds nothing. | **`wrong-shape`**, settled by F95 — an if/else where the engine makes four independent writes; one `lvl.ranged` for two tables; `lvl.thrown` for Thrown *and* both Breaths; an extra `calcBaseRtb > 0` on the ranged arm; no positivity gate on the Thrown/Breath arm. The `calcBaseRtb > 0` still in `stats_sequence.js` is on the DOS ladder arm, which transcribes `BU_Apply_Level_Bonus` rather than the `ApplyLevelBonus` this row cites, and is outside this reading |
| E30 | `hasMagicRangedForFocus` | `:880-882` | `c:focusMagic` | the `else` arm at `:906-909`, gated on `B.ranged<>0` and `Ismagicalranged(B.rangedtype)` | **`wrong-record`** | matches for the ranged `+3` itself, but it also feeds `focusMagicDoomGazeMod` (`:1369`) through `focusMagicBuffsExisting` (`:886-887`), where the engine's gate is `U.doomgaze > 0` alone (`:875-876`). **Measured:** a CoM2 unit with `magic_c` ranged 4, Focus Magic and no Doom Gaze records `doomGaze 0 -> 3` in the `c:focusMagic` trace entry; `e:clamp` discards it because `baseDoomGaze` is zero. Right number, branch the engine never enters. |
| E31 | `hasBreathForFocus` | `:883-884` | `c:focusMagic` | `U.firebreath > 0` / `U.lightningbreath > 0` at `:879-882` | live | `wrong-shape` — the engine tests strength on two named fields; this tests type |
| E32 | `focusMagicConvertsThrown` | `:888-890` | `c:focusMagic` | `(U.thrown > 0) and (B.ranged = 0)` at `:887` | live type / permanent ranged | `wrong-shape` — `thrownType === 'thrown'` for `U.thrown > 0` |
| E33 | `focusMagicConvertsRanged` | `:891-892` | `c:focusMagic` | `not Ismagicalranged(B.rangedtype)` at `:902` (I4) | **`wrong-record`** | `narrow` |
| E34 | `focusMagicCreatesRanged` | `:893-895` | `c:focusMagic` | `else if B.ranged = 0` at `:900` | permanent | match |
| E35 | Focus Magic type write | `:896-899` | `c:focusMagic` | `U.rangedtype := 34` at `:891`/`:899`/`:904` | live | match. Since [F93](../Calculator/HISTORY.md) the modern arms write `magic`, id 34 being `IsMagic=Yes` and nothing else there; CoM 1's own arm keeps `magic_s` for the same id, which its realm table really makes Sorcery (com1:0x8F840) |
| E36 | `shadowStrikeFillsSlot` | `:906-909` | `d:shadowStrike:thrown` | `UnitCalc.CAS:1262` | live | match — deliberately field-identity, not a live type test |
| E37 | `blackpowderHasRangedOrThrown` | `:919-920` | `base:militaryWorkshop` | `CreateUnit.CAS` | permanent | match |
| E38 | `rangedGetsWpn` | `:943` | `c:weapon`, `c:weapon:toHit` | `not Ismagicalranged(Units[i].rangedtype)` at `:651` (I3) | live | **`narrow`** ([F89](../Calculator/HISTORY.md)) |
| E39 | the material block's Thrown gate (`stats.js`, `weaponStatSteps` and `weaponHitThrown`) | — | `c:weapon`, `c:weapon:toHit` | `if Units[i].thrown > 0` at `:658` | live since [F97](../Calculator/HISTORY.md) | match since F97 — the modern arms of both writes now test the calculated Thrown strength at their own position; the slot's type test remains only to say which record field the DOS-shaped shared slot is |
| E40 | `supremeLightEligible`'s `liveRangedType` | `:975-978` | `c:supremeLight` (CoM 1), `e:supremeLight` | `Ismagicalranged(U.rangedtype)` at `:2621` (I12) | **`stale`** for `e:supremeLight` — three region-`d` type writes lie between | match |
| E41 | `modernConventionalRangedChannel` | `:950-951` | `c:heavenlyLight`, `c:goodMoon`, `c:natureConjunction`, `b:trueLight`/`c:trueLight`, `b:soulFlay`, `b:plague`, `b:goblinPox` | `if U.ranged > 0` at `:1546` and the matching blocks | live for channel slots (identity test); **`stale`/`early`** for the shared slot, which uses the post-Focus type at region-`b` positions | `wrong-shape` on the shared slot only |
| E42 | `modernRangedOrThrownChannel` | `:956-958` | `c:mindStorm` (`rangedOrThrown` slot) | Mind Storm's `Ismagicalranged`-free field writes | live for channel slots | match |
| E43 | `modernNodeSecondaryChannel` | `:959-961` | `c:nodeAura` | `@Units@applynodeaura` current-ranged/breath gates (F18 evidence) | live for channel slots | match |
| E44 | `blazeOfGloryFillsSlot` | `:975` | `e:clamp`, `secondaryHitKind` | record structure, not a type gate | n/a | match |
| E45 | `secondaryHitKind` | `:976-979` | every secondary To-Hit writer | `hitchanceranged`/`hitchancethrown`/`hitchancebreath` field selection (`:213-218`) | precomputed, but a field-identity map rather than a live predicate | match — this is the one place a precomputed type test is the right shape |
| E46 | `eternalNightRtbMod` | `:981-984` | `b:eternalNight:poorVision` | `UnitCalcPre.CAS` poor vision | live | match |
| E47 | `lionheartRtbMod` | `:985-987` | `c:lionheart` | `not Ismagicalranged(U.rangedtype)` at `:1730` (I7) | live | **`narrow`** — new site for [F89](../Calculator/HISTORY.md) |
| E48 | `disciplineRtbMod` | `:988-989` | `c:discipline` | `not Ismagicalranged(U.rangedtype)` at `:1554` (I6) | live | **`narrow`** — new site for [F89](../Calculator/HISTORY.md). The `levelRank >= 2` half is correct: `levelRank` is zero-based where `U.level` is one-based, so it is the engine's `U.level >= 3`. |
| E49 | `orihalconRtbMod` | `:1000-1002` | `c:orihalcon` | `Ismagicalranged(U.rangedtype)` at `:1786` (I8) | live | match; the token set behind it is settled by [F93](../Calculator/HISTORY.md) |
| E50 | `wofDefenderRtbMod` | `:1003-1004` | `b:wallOfFire:garrison` | `UnitCalcPre.CAS` garrison block | live | match |
| E51 | `blazingMarchBoostsThrown` / `blazingMarchRtbMod` | `:1009-1011` | `c:blazingMarch` | `Units.RecalculateUnits.pas` Blazing March; Warlord's script adds the Thrown arm | live | match |
| E52 | `reinforceMagicRtbMod` | `:1020-1022` | `c:reinforceMagic` | `Ismagicalranged(U.rangedtype)` at `:1906` (I10) | live | match; the token set behind it is settled by [F93](../Calculator/HISTORY.md) |
| E53 | ~~`supremeLightRtbMod`~~ | removed | `e:supremeLight` | `if U.ranged > 0 then Inc(U.ranged, 2)` at `:2632-2635` | live | match — [F96](../Calculator/HISTORY.md) replaced the six-name type test with the engine's live strength test on the record's Ranged field (`isRangedFieldSlot`, `stats_sequence.js:1258`) |
| E54 | `landLinkingBreathRtbMod` | `:1033-1034` | `c:landLinking` | `unitcalc.c` / `:1758` Land Link breath arm | live | match |
| E55 | `dragonMoundRtbMod` | `:1036-1037` | `base:dragonMound` | `CreateUnit.CAS` Dragon Mound | permanent | match |
| E56 | `gsRtbMod` | `:1039` | `c:giantStrength` | `unitcalc.c` Giant Strength (MoM only) | live | match |
| E57 | `weaknessHitsRanged` / `weaknessRtbModBinary` | `:1040`, `:1045-1049` | `c:weakness` | `unitcalc.c` Weakness; `Units.RecalculateUnits.pas` Weakness | live — `c:weakness` precedes `d:blazeOfGlory`, so the F84 starting-point defect is closed by [F81](../Calculator/HISTORY.md)/[F83](../Calculator/HISTORY.md) | the Thrown arm's ungated `Dec(U.thrown, 3)` reads `thrownFieldSlot` since [F91](../Calculator/HISTORY.md); the ranged arm reads `rangedFieldSlot` since [F100](../Calculator/HISTORY.md), `Dec(U.ranged, 3)` having no gate either |
| E58 | `weaknessRtbModCas` | `:1050-1052` | `d:weakness` | `UnitCalc.CAS` Weakness breath arm | **`stale`** in principle (`d:weakness` precedes `d:rust`, so inert today) | match |

Continued. E59–E66 are still inside `buildSlotContext`; E67–E73 sit outside it in `stats.js`.

| # | Symbol | Line | Consuming step | Engine position and source | Position | Breadth |
|---|---|---|---|---|---|---|
| E59 | `rustRtbMod` | `stats.js:1056` | `d:rust` | `UnitCalc.CAS:493` Rust | live | match |
| E60 | `hwRangedToHit` | `:1059-1060` | `c:holyWeapon` | `not Ismagicalranged(U.rangedtype)` at `:1808` (I9) | live | **`narrow`** ([F89](../Calculator/HISTORY.md)) |
| E61 | `hwThrownToHit` | `:1065-1066` | `c:holyWeapon` | `Inc(U.hitchancethrown, 10)` at `:1806`, unconditional | live | match since [F91](../Calculator/HISTORY.md) — the constant carries no gate, as `heavenlyLightThrownToHit` already did, and `secondaryHitKind` routes each slot to its threshold, the DOS shared slot included |
| E62 | `weaponHitRanged` / `weaponHitThrown` / `weaponHitWrite` | `stats.js` | `c:weapon:toHit` | `:648-662` — ranged To-Hit ungated on strength, Thrown To-Hit inside `if Units[i].thrown > 0` | live | match since [F97](../Calculator/HISTORY.md), and the reading was half stale when written: the engine's `U.thrown > 0` was already made, by `weaponHitWrite` at the To-Hit target rather than inside `weaponHitThrown`, so F97 moved where the test lives and no number with it |
| E63 | `heavenlyLightRangedNonmagical` / `heavenlyLightRangedToHit` | `:1074-1079` | `c:heavenlyLight:toHit` | `not Ismagicalranged(U.rangedtype)` at `:1452` (I5) | live | **`narrow`** ([F89](../Calculator/HISTORY.md)) |
| E64 | the material block's strength writes (`stats.js`, `weaponStatSteps`) | — | `c:weapon` | `Inc(Units[i].ranged, j)` at `:653` (no strength gate) and `Inc(Units[i].thrown, j)` at `:661` (`Units[i].thrown > 0`); the DOS body's one type-only gate at `unitcalc.c` 131:0x8F089/0x8F09C/0x8F0A4 over the writes at 131:0x8F0BA/0x8F0CD/0x8F0DD | live since [F97](../Calculator/HISTORY.md) | match since F97 on the modern arms and [F109](../Calculator/HISTORY.md) on the DOS one: the modern ranged write makes no strength test and the modern Thrown write reads the calculated field, and the DOS body admits Missile, Boulder and Thrown by type alone with no strength test in any of its three writes |
| E65 | `upgradedExplosiveRangedMod` | `:1091` | `b:upgradedExplosive:ranged` | `UnitCalcPre.CAS` explosive block | live | match |
| E66 | `warlordCombatFlameBladeOwnsThis` | `:1106-1107` | `d:flameBlade` | `UnitCalc.CAS` combat Flame Blade | live | match |
| E67 | `slots.ranged` | `:1645` | `b:tactician` and `c:tactician` alone | the Tactician grants | **`early`** for `b:tactician` | n/a for the auras — [F96](../Calculator/HISTORY.md) moved `e:holyBonus` onto `slots.persistentRanged` (`B.ranged > 0`, `:2535`) and `e:guidingBeaconAura` onto the new `rangedField` gate (`U.ranged > 0`, `:2543`), and took the same gate out of Leadership (`:2583`), where the engine makes no such test |
| E68 | `slots.rangedOrThrown` | `:1574` | `c:mindStorm` | Mind Storm's paired field writes | live | match |
| E69 | `slots.persistentRanged` | `:1651` | `e:mislead` (Misfortune aura), `e:holyBonus` | `if B.ranged > 0` at `:2599` and `:2535` | permanent | match — [F96](../Calculator/HISTORY.md) made it the permanent record's Ranged **field** carrying strength: which field the slot is, with no type test on a modern channel |
| E70 | `distancePenaltyFor` | `:1801-1808` | resolution-time projection | the finished record's ranged attack | **live** since [F99](../Calculator/HISTORY.md) — both the applicability test and the curve read `statUnit[context.rangedTypeField]`, so `d:blazeOfGlory` emptying the Ranged field retires the penalty with the attack | match. This is a projectile-*type* read, not the field-identity question `isRangedFieldSlot` answers: missile and boulder select different curves, and a typeless Ranged field carries no projectile |
| E71 | output `rangedGetsWpn` / `thrownGetsWpn` | `:1993` | output contract | n/a | the two halves still disagree: `thrownGetsWpn` is recomputed from `finalThrownType`, `rangedGetsWpn` is `recordContext.rangedGetsWpn`, the pre-sequence const | n/a — and **no number turns on it**: `GetsWpn` occurs on 10 lines of `Calculator/stats.js` and nowhere else in the repository (uncapped `grep -rn`, 16 hits over 3 files, the other two being prose), so both output fields are read by nothing. [F99](../Calculator/HISTORY.md) measured this and left them alone rather than change an unobservable; settling them belonged to [M14](../Calculator/HISTORY.md), which removed the precomputed pass they escape from and both fields with it |
| E72 | `flameBladeStep`'s live type read | `:1376-1399` | `c:flameBlade` | `Units.RecalculateUnits.pas:1669-1686` (`$0059FE47`) on the modern engines, `unitcalc.c` 131:0x8F56E on the DOS ones — the same compiled block in all five | **live**, correctly, and the position is the engine's | match. The region-`b` doubt is closed: `UnitCalcPre.CAS:840-845` is Fiery Fury's own write, carried by `b:fieryFury`, and `EncFlameBlade` appears nowhere else in `UnitCalcPre.CAS`, so Warlord makes no blade ranged-strength write of its own. The compiled block runs after Focus Magic (`$0059A63B`) and reads the current `U.rangedtype`, which the conversion has set to 34 — so the blade's +2 is genuinely lost under Focus Magic, and region `c` is where the read belongs. Measured at region `b` for contrast: a 4-strength Warlord missile finishes 6 rather than 4. The [M11](../Calculator/HISTORY.md) c-pair merge landed under [F92](../Calculator/HISTORY.md): one compiled block is one step writing melee and secondary strength together, measured at 0 differences over 15,480 derivations in all five versions. The Metal Fires branch this step also carried left it first under [F111](../Calculator/HISTORY.md), for the block `unitcalc.c` 131:0x9065F holds it in |
| E73 | `trueLight`'s `modernConventionalRangedChannel` use | `:1483-1487` | `b:trueLight`, `c:trueLight` | `UnitCalcPre.CAS:1507-1540`; DOS True Light | see E41 | see E41 |

### C. Type-reading and type-writing steps in `stats_sequence.js`

| # | Step (chain key) | Line | What it does with the type pair | Verdict |
|---|---|---|---|---|
| S1 | `base:stat:base` | `:56-57` | seeds each slot from `baseSequenceRangedType`/`baseSequenceThrownType` | correct since [F94](../Calculator/HISTORY.md) — those are now the permanent record's types, taken before any of the five flips |
| S13 | `base:militaryWorkshop` | `:112` | writes `'boulder'` where the Blackpowder upgrade converts a missile projectile | correct position, added by [F94](../Calculator/HISTORY.md); the write was previously folded into the S1 seed |
| S2 | `base:lightningBlade:breath` | `:125-126` | writes `'none'` / `'lightning'` | correct position |
| S3 | `base:energyCannon` | `:206` | writes `'beam'` | correct position; the precompute applies it before Chaos Channels too since [F94](../Calculator/HISTORY.md) |
| S4 | `a:chaosChannels:fireBreath` | `:241-242` | writes `'none'` / `'fire'` | correct position |
| S14 | `b:bombsGrenades` | `:373` | writes `'thrown'` on the field the grant fills | correct position, added by [F94](../Calculator/HISTORY.md); the write was previously folded into the S1 seed. The slot it fills is the record's Thrown field alone since [F101](../Calculator/HISTORY.md) |
| S5 | `b:upgradedExplosive:fireBreath` | `:361-364` | reads the **precomputed** `c.thrownType` | `stale` in principle; no later type write precedes `b` today |
| S6 | `c:focusMagic` | `:487-488`, `:497-498` | reads the **live** pair, writes `'magic_s'` / `'none'` | reads live, which is right; the +3 pre-loop is the engine's fourth `else` arm hoisted out of its branch and re-gated on the calculated record (E30) |
| S7 | `c:chaosSurge` | `:654-655` | reads the **precomputed** `c.rangedType`/`c.thrownType` | `stale` in principle; no type write lies between `c:focusMagic` and `c:chaosSurge` |
| S8 | `c:guidingBeaconAura` | `:719-720` | reads the **live** pair (CoM 1 path) | correct |
| S9 | `d:vampirism:transfer` | `:926` | reads the **live** thrown type | correct |
| S10 | `d:colossalStrength` | `:987-988` | reads the **live** pair | correct |
| S11 | `d:shadowStrike:thrown` | `:1029-1030` | writes `'none'` / `'thrown'` | correct; invisible to every precomputed predicate |
| S12 | `d:blazeOfGlory` | `:1095-1116` | reads and writes the **live** pair | reads live, which is right, and is invisible to every precomputed predicate. The ranged-type clear is the recorded `SETSTAT(U,SAmmo,0,0)` stand-in (`SPEC.md`, *Deliberate deviations*). This sweep called the row correct and missed one thing [F89](../Calculator/HISTORY.md) then measured: the transfer *selected its source* by ranged type, where `GetStat(U,SRanged,0)` (`UnitCalc.CAS:1494`) names the field with no gate at all, so a typeless `SRanged` was dropped instead of moved. [F91](../Calculator/HISTORY.md) added the transfer's other end: the surviving attack is `SThrown` whichever slot holds it, so a source retyped in place reads `hitchancethrown` too. Two things at this row were left to [F100](../Calculator/HISTORY.md) — the region-`e` clamp's Blaze exception is `channelKey === 'thrown'`, which zeroes a retyped-in-place source with no permanent strength, and Lightning Blade's `SThrown` → `SLightningBreath` move is the slot reuse that created that shape, made a real field move by [F90](../Calculator/HISTORY.md) — which closed the clamp half with it; [F100](../Calculator/HISTORY.md) then closed the ungated ranged writes, and both arms now ask only which field the slot is |

### Not predicates

Accounted for so the 141 matching lines are complete: field-name maps and destructuring
(`stats.js:1112-1117`, `:1245-1246`, `:1372-1373`, `:1508-1509`; `stats_sequence.js:44-45`,
`:51`, `:111`, `:188`, `:209`, `:222`, `:423-424`, `:483`, `:917-918`, `:1023`, `:1089`), record
seeding to `'none'` (`stats.js:1589-1590`), `writes:` lists, final-value reads
(`stats.js:1605-1606`, `:1912`, `:1946-1947`), the Marionette type assignments (`:752`, `:1194`),
and the Rust thrown clear (`:1341-1342`, itself the live write behind S-row `d:rust`).

The Marionette type assignments were listed here **without asking which record they sit on**, and
that was the miss: `SETSTAT(U,SRangedType,0,...)` (`UnitCalcPre.CAS:104`, `:122`, `:140`, `:158`,
`:176`, `:272`) is record selector `0`, a region-`b` write on the *calculated* record, while
`baseSequenceRangedType` seeded it into the permanent record that `base`, `a` and `c:level` read.
The permanent fact the seed was standing in for is the roster's own — `UNITS.INI [362]` Wanderer,
`RangedType=30` with `Ranged=0`, the one shipped record of that shape. Settled by
[F107](../Calculator/HISTORY.md): the roster generator keeps `ranged_type` when `Ranged` is zero,
and the primary retype is `b:marionette:rangedType` at its own position.

`:272` is a **second** write, not a duplicate of the primary arm's. It is the ascension block's
own `SRangedType = 30` for a Chaos primary, beside the Wall Crusher and Armor Piercing grants of
the same three lines, and it sits after the twenty book-grant blocks that follow `:104-176`. F107
left it unmodelled on the grounds that id 30 landed on the same `Magic(C)` class as the primary
arm's id 31; [F93](../Calculator/HISTORY.md) voided that, because id 30 is the lightning-bolt
projectile and now a token of its own. It is `b:marionette:ascensionRangedType`, adjacent on the
chain because nothing modelled writes a projectile type between the two.

`stats.js` declared `rangedType` and `thrownType` locals from `recordContext` that nothing read
afterwards — every later use goes through `context.rangedType`. They were dead and are removed by
[F94](../Calculator/HISTORY.md).

## What the two readings found

Nine divergences, of which five change no number today. Each is filed as its own backlog item;
none was fixed here.

| Finding | Entries | Filed as |
|---|---|---|
| Narrow non-magical-ranged predicate, at three call sites beyond the three already listed | I6, I7, I11 / E47, E48, and the Leadership step | settled by [F89](../Calculator/HISTORY.md) |
| Pre-sequence flip order does not match the chain, and the base seed carries a region-`b` write | E23, E24, S1, S3 | settled by [F94](../Calculator/HISTORY.md) |
| `rtbLvl` collapses four base-record gates and three tables into one live if/else | E29, I2 | settled by [F95](../Calculator/HISTORY.md), which held the row's measurement in both halves and found `UNITS.INI [362]` Wanderer the one shipped record the ranged gate moves — filed as [F107](../Calculator/HISTORY.md), which gave that record a roster home |
| Region-`e` aura gates are type tests where the engine tests a strength field, and are precomputed before the region-`d` type writes | E16, E40, E53, E67, E69 | settled by [F96](../Calculator/HISTORY.md) for the four strength gates; E40's own eligibility read settled by [M14](../Calculator/HISTORY.md), which made `supremeLightActiveForUnit`'s live-type argument a read at `e:supremeLight`'s own position |
| Weapon-material strength gates read the wrong record and add a gate the engine lacks | E39, E62, E64 | settled by [F97](../Calculator/HISTORY.md) for the modern arms, which measured 508 moving cases in `com2_1.05.11` and `com2_warlord_1.5.12.7` and none in the DOS versions, and found E62's To-Hit half already made one level up; settled for the DOS arm by [F109](../Calculator/HISTORY.md), which measured the three DOS versions moving and both modern ones unchanged |
| Focus Magic's Doom Gaze `+3` fires on the wrong disjunct; its ranged `+3` reads the calculated record | E18, E30, E31, E32, E33 | settled by [F98](../Calculator/HISTORY.md), which re-confirmed E30's `doomGaze 0 -> 3` ledger entry and restored the four-way branch on `ctx.base`; the one number it moved is a Warlord magical ranged attack a region-`b` penalty had driven to or below zero, which the fourth arm's `+3` now reaches |
| Distance penalty reads the pre-sequence ranged type | E70, E71 | settled by [F99](../Calculator/HISTORY.md) for E70, which measured the penalty reaching resolved damage under `d:blazeOfGlory`; E71's output pair was read by nothing and [M14](../Calculator/HISTORY.md) removed both fields with the pass they escaped from |
| Ungated field writes expressed as type predicates | E57, E61 | settled by [F91](../Calculator/HISTORY.md) and, for the ranged siblings and the transfer's clamped-away target, [F100](../Calculator/HISTORY.md) |
| CoM 1 gates the material block's whole secondary half on the Focus Magic **flag**, not on a type | I3 / E38, E62 | recorded by [M14](../Calculator/HISTORY.md): `if (!(ench_lo & UE_FOCUS_MAGIC))` at com1:0x8F095 wraps the strength, display-bonus and threshold writes together (`DOS reconstructed/unitcalc.c`). The precomputed pass reproduced it by accident, reading the post-conversion type at a block the chain places before the conversion; the gate is now stated where the engine makes it |
| CoM 1 orders Lionheart before Focus Magic, and Lionheart's own `+3` has no such flag gate | E47, I7 | measured by [M14](../Calculator/HISTORY.md): Lionheart is com1:0x8F660 and Focus Magic com1:0x8F7E6, so `RAT_CLASS(bu->ranged_type) == MISSILE` is still true when the `+3` lands. Reading the converted type there suppressed it; the live read restores it, and `focusMagicFollowsLionheartCoM` pins the number |
| Warlord flame blade positioned in `c` where its script write is `b` | E72 | **not a defect.** The `b` write is Fiery Fury's, carried by `b:fieryFury`; `EncFlameBlade` appears nowhere else in `UnitCalcPre.CAS`, and the blade's +2 is the compiled block at `$0059FE47`, which Warlord runs after Focus Magic. Region `b` was measured for contrast and does move numbers (a 4-strength Warlord missile finishes 6 rather than 4 under Focus Magic), so the shipped `c` position is the load-bearing one. Closed by [F92](../Calculator/HISTORY.md), which merged the [M11](../Calculator/HISTORY.md) c-pair at that position |
| Six fixed type names against a moddable table | E1, E49, E52 | settled by [F93](../Calculator/HISTORY.md): the modern vocabulary collapses to the two classifications `RangedType.INI` carries, the DOS vocabulary keeps the realm its own table has, and the Alumni gate's `> 29` band is correct by construction |

The six that change no number with the shipped data, and are recorded because F84 requires it:
the `MissileRanged`/`MagicRanged` and `Thrown`/`Breath` table conflations in E29 (both column
pairs are identical in both shipped `Levelbonus.INI` files); the Focus Magic Doom Gaze branch in
E30, whose `+3` is discarded by `e:clamp` because `baseDoomGaze` is zero but is visible in the
execution ledger and in `modifierTraces`; the Chaos
Channels/Energy Cannon transposition in E24, which no shipped combination reaches because Energy
Cannon requires a permanent conventional ranged attack and Chaos Channels Fire Breath requires
none; the `d:weakness` staleness in E58; the `slots.ranged` staleness at `e:guidingBeaconAura`
in E67, where `d:blazeOfGlory` has already zeroed the strength the step's own `> 0` test reads;
and the output-contract disagreement in E71, whose two fields no consumer reads.
