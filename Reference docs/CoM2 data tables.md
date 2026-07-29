# CoM2 / Warlord data-table findings

Findings read out of the `.INI` data tables that ship with **CoM2** and **Warlord**. Both versions
run the same executable, so the tables are frequently the only thing that distinguishes them —
and where a table states a value, it *is* the implementation: the engine reads these files at
load time rather than compiling the numbers in.

This is the third evidence home for the modern engine, alongside `CoM2 binary analysis.md`
(`Caster.exe`) and `Source discrepancies.md` (Warlord's `.CAS` scripts). Tracking for everything
here lives in `Calculator/BACKLOG.md`.

**Precedence.** For Warlord, a `.CAS` script still outranks a table — a script runs after the
table is read and can overwrite the result. Nothing here has been found in that position, but the
Warlord combat-cast Flame Blade's `+1` fire breath (`UnitCalc.CAS:331-333`) is an example of a
script *adding* an effect the table does not describe.

## The tables

Under `Reference docs/Script source/CoM2 1.5.11 base/` and `.../Warlord 1.5.12.6.2/`.

| File | Owns |
|---|---|
| `MODDING.INI` | tunable combat constants, spell magnitudes, level names, script bindings |
| `Levelbonus.INI` | the level ladders — `[Hero]` (9 steps) and `[Normal]` (6) |
| `SPELLS.INI` | per-spell attack strength, `HitChance`, and the `Area` flag |
| `DESC.INI` | in-game spell descriptions — prose, but it ships with the data and tracks it |

`UNITS.INI` is a data table too, but it is the roster's source and lives with the roster; see the
project `CLAUDE.md`.

Two conventions worth knowing before reading any value:

- **An absent key is not a zero.** It means the engine's own default applies, which the table
  does not state. `HitChance` exists 14 times in Warlord's `SPELLS.INI` and *zero* times in
  CoM2's — so CoM2's spell hit chances are all engine defaults and are not settled here.
- **Percentage keys truncate.** `MODDING.INI`'s own worked example for `SupernaturalRatio`
  computes `7 * 34% = 2`, i.e. `floor`, matching CAS's `%I` integer-part operator.

---

## Level bonuses

**Settles queue D13 outright, both versions.** `Levelbonus.INI` `[Normal]`, diffed against
`getLevelBonuses` (`combat.js`): **all 70 values match**, for CoM2 and Warlord alike, including
the Warlord divergences the function's comment enumerates by hand.

Row 1 is all zeros for every stat, and `MODDING.INI [UI]` names it (`UnitLevelName1=Recruit` …
`UnitLevelName6=Champion`), so the table's level 1 is the calculator's `normal`.

Three structural points the diff also settles:

- `MissileRanged` and `MagicRanged` are **identical** throughout both `[Normal]` sections, so the
  calculator's single `ranged` field loses nothing. They diverge only in `[Hero]`.
- `Breath` and `Thrown` are likewise identical throughout both, so routing breath through
  `lvl.thrown` (`stats.js`) is correct.
- `Todefend1..6=0` everywhere — level grants no To Block, as the calculator has it.

**What it does not settle — the hero ladder (D27).** `getLevelBonuses` takes no unit type, so
heroes receive the 6-step `[Normal]` ladder. `[Hero]` is a 9-step table of a different *shape*:
`MagicRanged` advances at half the `MissileRanged` rate, `Thrown` and `Breath` at half `Attack`,
and Warlord adds to-hit steps at levels 3–4 (+5) and 7–8 (+15) that CoM2 does not have. The two
`[Hero]` sections are otherwise identical between the versions.

## Blur and Invisibility

**Settles the rate half of queue D5, both versions.** `MODDING.INI [Spells]`:

| Key | CoM2 | Warlord |
|---|---|---|
| `BlurDamageReduction` | 20 | 20 |
| `InvisibilitydamageReduction` | 20 | 20 |
| `BlurInvisibilityTotalReduction` | 30 | **40** |

`getBlurChance` (`combat.js`) matches all three. The keys are framed as *damage reduction
percentages*, which is consistent with the calculator's per-hit nullification model but does not
prove it.

**Still open in D5:** whether Blur is a defender ability or a side-wide enchantment, and whose
Illusion Immunity is tested. The table says nothing about either.

## Wall of Fire

**Settles queue D15 outright — all three Warlord claims.** Not in `MODDING.INI`, which has no
Wall of Fire key at all; `SPELLS.INI [87]` owns it:

| Key | CoM2 | Warlord |
|---|---|---|
| `Attack` | 10 | **12** |
| `HitChance` | *(absent)* | **60** |
| `Area` | True | *(absent)* |

The `Area` deletion is the strongest of the three. In CoM2 `Area=True` marks exactly six spells —
Fairy Dust, Wall of Fire, Fireball, Fire Storm, Immolation, Meteor Storm — which is precisely the
known hit-every-figure set, and the modern engine's spelling of the DOS builds' `Att_AREAFLAG`.
Warlord's set is the same **minus Wall of Fire** (plus Dissolution, Warp Lightning and Ice Comet).
So the single-figure rule is a deliberate, isolated removal, not an artefact.

`DESC.INI:176` corroborates independently: CoM2 "10 strength fireball attack" against Warlord
"12 strength Fire attack with **double hit chance**" — 2 × the 30% base.

**One caveat.** CoM2's 30% is *not* confirmed. `HitChance` does not exist anywhere in CoM2's
`SPELLS.INI`, so all CoM2 spell hit chances are engine defaults; the table shows only that
nothing overrides it.

## Combat constants confirmed in passing

Each of these matches the calculator exactly, in both versions unless noted, and closes the
named queue entry or the named half of it.

| Queue | Key(s), `MODDING.INI` | CoM2 / Warlord |
|---|---|---|
| **D4** | `PoisonSavePenalty` | −1 / −1 — Poison's save penalty confirmed |
| **D6** | `BlessDefenseBonus`, `BlessResistBonus` | 5 / 5 · **7 / 4** — both magnitudes and the 7-vs-4 split |
| **D7** | `ResistElementsResistBonus`=4; **no `ElementalArmorResistBonus` key exists** | The inverted-looking claim is right: Resist Elements grants resistance, Elemental Armor does not |
| **D7** | `ResistElementsDefenseBonus`=4, `ElementalArmorDefenseBonus`=12 | matches `computeDefenseProfile` |
| **D2** | `WeaponImmunityDefenseBonus` | 8 / **10** — magnitude *and* the additive shape |
| **D12** | `FlameBladeAttackBonus` / `ThrownBonus` / `MissileRangedBonus` | 3/0/2 · 3/2/2 — including CoM2's dropped thrown bonus |
| **D14** | `RangedPenaltyStarts`=4, `Base`=10, `Gap`=1, `Growth`=3 | `-10 - 3*(d-4)` is the table verbatim |

The D7 row turns on an absence, so to be explicit: the table names a resistance bonus for Resist
Magic, Resist Elements *and* Bless, and pointedly none for Elemental Armor.

Also matching, though never separately queued: `LargeShieldBonus`=3, `MagicWeaponBonusHit`=10,
`CityWallDefBonus`=3 / `CityWallBrokenDefBonus`=1, `MysticSurgeToDefPenalty`=10,
`TerrorHitchancePenalty`=10, `EnduranceHpBonus`=4, and Blazing March's four magnitudes
(attack 3, missile 3, breath **0**, thrown 0 CoM2 / 3 Warlord).

## Supernatural minimum damage — a disagreement

**Settles queue D16, and the calculator is wrong.** `MODDING.INI [Gameplay]`, identical in both
versions:

```
SupernaturalStarts=0
SupernaturalRatio=34
; Example : with default settings, 7 damage is converted to (7-0) *34% = 2 minimal damage.
```

So the engine computes `floor(hits * 34 / 100)`; the worked example is what establishes
truncation rather than rounding. `supernaturalMinDamageForHits` (`combat.js`) uses
`Math.round(hits / 3)`, which is one too high whenever `hits ≡ 2 (mod 3)` — a third of all hit
counts:

| hits | 2 | 5 | 8 | 11 |
|---|---|---|---|---|
| engine | 0 | 1 | 2 | 3 |
| calculator | 1 | 2 | 3 | 4 |

Not fixed; deferred by decision on 2026-07-29 and tracked as **F7** in `Calculator/BACKLOG.md`.
The one inference is truncation-vs-rounding, taken from the table's own arithmetic rather than
from code.

## To Defend cap — a mechanic in no source and no code

`MODDING.INI [Gameplay]`, identical in both versions:

```
; The amount of defense above which To Defend bonus loses effectiveness.
ToDefendCap=15
; The amount of chance to defend after the To Defend cap is exceeded and it has reduced effect.
; (Base chance of defend without any bonus or penality is 30%)
ToDefendCappedValue=30
```

The most natural reading is that defence points beyond 15 roll at a flat 30% rather than at the
unit's boosted To Block, but "loses effectiveness" admits others and nothing here decides between
them. The calculator models no such cap anywhere, so a unit with defence above 15 *and* a To
Block bonus is currently over-modelled — and that state is reachable, since defence is free-form
and several abilities add To Block.

Deferred by decision on 2026-07-29; tracked as **Q14** in `Calculator/BACKLOG.md`. Settling the
semantics needs `Caster.exe`, since no other source mentions the mechanic.

## Chaos Channels and Fire Breath — bears on F6

`MODDING.INI [Spells]`, identical in both versions:

```
; Chaos Channels can add Fire Breath to units that have ranged attacks?
; 0 -No
CCRangedFBAllowed=0
```

F6 asks whether `EncCCBreath` can land on a unit that already has Fire Breath. This is the
adjacent targeting gate rather than that question exactly — it concerns *ranged* attacks — but it
is set identically in both versions, which undercuts the calculator treating CoM2 and Warlord
differently here. It also shows this class of eligibility is table-driven, so F6's own answer may
be a key rather than a code path.

## Ranged penalty — a side-finding for D14

`HeroNoRangePenalty=0` is documented as disabling *"the hardcoded effect **Sharpshooting** on
heroes"* — an ability-gated exemption, not a blanket hero one. The calculator applies a blanket
hero exemption to `com_6.08` alone, so this does not contradict anything today, but it shapes
D14's remaining half: if CoM2's exemption is ability-gated, the CoM 1 rule did not simply carry
over or vanish. `MagicNoRangePenalty=0` separately confirms that magic attacks take no distance
penalty, which the calculator already models by restricting the penalty to missile and boulder.
