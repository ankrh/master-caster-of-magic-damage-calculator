# CoM2 / Warlord data-table findings

Findings read out of the `.INI` data tables that ship with **CoM2** and **Warlord**. Both versions
run the same executable, so the tables are frequently the only thing that distinguishes them —
and where a table states a value, it *is* the implementation: the engine reads these files at
load time rather than compiling the numbers in.

This is the runtime-values evidence home for the modern engine, alongside the compiled
reconstruction indexed by `Caster binary/CoM2 binary analysis.md` and the executing Warlord
scripts in `Script source/Warlord 1.5.12.9/`. The modern-engine source-of-truth routing table
lives in that binary-analysis index. Tracking for everything here lives in
`Calculator/BACKLOG.md`.

**Precedence.** For Warlord, a `.CAS` script still outranks a table — a script runs after the
table is read and can overwrite the result. Nothing here has been found in that position, but the
Warlord combat-cast Flame Blade's `+1` fire breath (`UnitCalc.CAS!NOTZEAL!+8..+10 "IF (GETCOMBATENCHANTMENTFLAG(U,EncFlameBlade,0)>0) THEN {" "}"`) is an example of a
script *adding* an effect the table does not describe.

## The tables

Under `Reference docs/Script source/CoM2 1.05.11 base/` and `.../Warlord 1.5.12.9/`.

| File | Owns |
|---|---|
| `MODDING.INI` | tunable combat constants, spell magnitudes, level names, script bindings |
| `Levelbonus.INI` | the level ladders — `[Hero]` (9 steps) and `[Normal]` (6) |
| `SPELLS.INI` | per-spell identity and mechanics, including `Realm`, `SummonedUnit`, attack strength, `HitChance`, and the `Area` flag |
| `DESC.INI` | in-game spell descriptions — prose, but it ships with the data and tracks it |

`UNITS.INI` is a data table too, but it is the roster's source and lives with the roster; see the
project `CLAUDE.md`.

Two conventions worth knowing before reading any value:

- **An absent key is not a zero.** It means the engine's own default applies, which the table
  does not state. `HitChance` exists 14 times in Warlord's `SPELLS.INI` and *zero* times in
  CoM2's — so CoM2's spell hit chances are all engine defaults and are not settled here.
- **A percentage key does not itself determine rounding.** CAS's `%I` operator truncates where
  a script uses it, but compiled consumers choose their own arithmetic. `MODDING.INI`'s worked
  `SupernaturalRatio` example (`7 * 34% = 2`) is compatible with both truncation and rounding;
  R5.2c later found that this particular compiled consumer calls Delphi `Round`.

---

## Combat-summon spell bindings

The complete `@Spells@CombatSummonUnit` reconstruction shows that combat-summon identity comes
from the loaded spell record: `SpellIDToSummon(sp)` supplies its `SummonedUnit`, and the same
record's `Realm` supplies the new base race through `RealmtoRace`. The executable has no
template-37 or template-113 identity gate. See
`Caster binary/Spells.CombatSummonUnit.pas` and `Caster binary/R9-G1a-R2.evidence.md`.

The shipped `SPELLS.INI` rows therefore distinguish the two modern versions:

| Slot / row | CoM2 1.05.11 | Warlord 1.5.12.9 |
|---|---|---|
| 12 | Construct Catapult; `Realm=1`; `SummonedUnit=37` (`SPELLS.INI:614-628`) | Water Elemental; `Realm=1`; `SummonedUnit=158` (`SPELLS.INI:901-915`) |
| 153 | Call to Arms; `Realm=4`; `SummonedUnit=113` (`SPELLS.INI:2689-2702`) | Spirit of Chivalry; `Realm=4`; `SummonedUnit=211` (`SPELLS.INI:3024-3035`) |
| 260 | *(no corresponding base row)* | Construct Catapult; `Realm=6`; `SummonedUnit=37`; `Custom=True`; `Disabled=True` (`SPELLS.INI:4666-4683`) |

Thus Warlord's enabled spell substitutions, not an executable version gate, prevent the
base-CoM2 Construct Catapult and Call to Arms identity outcomes from applying there.

---

## Level bonuses

**Settles verification item D13 outright, both versions.** `Levelbonus.INI` `[Normal]`, diffed against
`getLevelBonuses` (`combat_abilities.js`): **all 70 values match**, for CoM2 and Warlord alike, including
the Warlord divergences the function's comment enumerates by hand.

Row 1 is all zeros for every stat, and `MODDING.INI [UI]` names it (`UnitLevelName1=Recruit` …
`UnitLevelName6=Champion`), so the table's level 1 is the calculator's `normal`.

Three structural points the diff also settles:

- `MissileRanged` and `MagicRanged` are **identical** throughout both `[Normal]` sections, so the
  calculator's single `ranged` field loses nothing. They diverge only in `[Hero]`.
- `Breath` and `Thrown` are likewise identical throughout both, so routing breath through
  `lvl.thrown` (`stats_sequence.js`) is correct.
- `Todefend1..6=0` everywhere — level grants no To Block, as the calculator has it.

**What it does not settle — the hero ladder (D27).** `getLevelBonuses` takes no unit type, so
heroes receive the 6-step `[Normal]` ladder. `[Hero]` is a 9-step table of a different *shape*:
`MagicRanged` advances at half the `MissileRanged` rate, `Thrown` and `Breath` at half `Attack`,
and Warlord adds to-hit steps at levels 3–4 (+5) and 7–8 (+15) that CoM2 does not have. The two
`[Hero]` sections are otherwise identical between the versions.

## Blur and Invisibility

**Initially settled the rate half of verification item D5, both versions.** `MODDING.INI [Spells]`:

| Key | CoM2 | Warlord |
|---|---|---|
| `BlurDamageReduction` | 20 | 20 |
| `InvisibilitydamageReduction` | 20 | 20 |
| `BlurInvisibilityTotalReduction` | 30 | **40** |

`getBlurChance` (`combat_effects.js`) matches all three. R5.2c subsequently settled the shape from
`Caster.exe`: Blur is a side-wide combat global selected by `CGADEnemy`, each hit is independently
removed at the configured percentage before defence, and the attacker's Illusion Immunity
disables it. `CGADEnemy` selects the side opposite the current combat-turn side, so this is the
target side for the initiating strike but the counterattacker's own side after
`PerformMeleeAttack` swaps the units without flipping that turn flag. See `Caster binary/CoM2
binary analysis.md`, *ApplyAttack riders, damage loop and result routing*.

## Wall of Fire

**Settles verification item D15 outright — all three Warlord claims.** Not in `MODDING.INI`, which has no
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

R5.2g subsequently confirmed the table fields' exact consumers. `FirewallEffect` passes spell
87's `Attack` to `ApplyDamageSpell`, which calls `DamageSpell`; the latter reads the same record's
`HitChance` and `Area`. R5.2j subsequently reconstructed `ApplyDamageSpell`'s additional
post-processing, so R5.2g establishes the base damage-record shape and R5.2j completes the applied
result. CoM2's `Area=True` makes one independently rolled attack per current
living figure, each capped at full HP per figure. Warlord's missing `Area` is not implemented as
a one-figure area attack: it selects the ordinary spill path. That path uses the wounded top
figure for the first boundary, then full HP for later boundaries, and repeats a fresh Defense and
Invulnerability reduction at every crossed boundary until the remainder fits. The calculator's
different Warlord base distribution is tracked as F36.

## Combat constants confirmed in passing

Each of these matches the calculator exactly, in both versions unless noted, and closes the
named verification item or the named half of it.

| ID | Key(s) / source | CoM2 / Warlord |
|---|---|---|
| **D4** | `PoisonSavePenalty` | −1 / −1 — Poison's save penalty confirmed |
| **D6** | `BlessDefenseBonus`, `BlessResistBonus` | 5 / 5 · **7 / 4** — both magnitudes and the 7-vs-4 split |
| **D7** | `ResistElementsResistBonus`=4; **no `ElementalArmorResistBonus` key exists** | The inverted-looking claim is right: Resist Elements grants resistance, Elemental Armor does not |
| **D7** | `ResistElementsDefenseBonus`=4, `ElementalArmorDefenseBonus`=12 | matches `computeDefenseProfile` |
| **D2** | `WeaponImmunityDefenseBonus` | 8 / **10** — magnitude *and* the additive shape |
| **D12** | `FlameBladeAttackBonus` / `ThrownBonus` / `MissileRangedBonus` | 3/0/2 · 3/2/2 — including CoM2's dropped thrown bonus |
| **D12** | `SPELLS.INI [99] Attack` | 10 / 10 — Immolation strength |
| **D14** | `RangedPenaltyStarts`=4, `Base`=10, `Gap`=1, `Growth`=3 | `-10 - 3*(d-4)` is the table verbatim |

The D7 row turns on an absence, so to be explicit: the table names a resistance bonus for Resist
Magic, Resist Elements *and* Bless, and pointedly none for Elemental Armor.

Also matching, though never separately queued: `LargeShieldBonus`=3, `MagicWeaponBonusHit`=10,
`CityWallDefBonus`=3 / `CityWallBrokenDefBonus`=1, `MysticSurgeToDefPenalty`=10,
`TerrorHitchancePenalty`=10, `EnduranceHpBonus`=4, and Blazing March's four magnitudes
(attack 3, missile 3, breath **0**, thrown 0 CoM2 / 3 Warlord).

`FirstStrikeCap` is 999 in both shipped tables. R5.2d confirms the compiled consumer compares
the defender's current top-figure remaining HP with that value at `$005B3AF9..$005B3B00`, so
the old 24-damage cap is disabled by default exactly as the CoM2 manual's change log states.

## Supernatural minimum damage — binary correction

`MODDING.INI [Gameplay]` supplies the same values in both versions:

```
SupernaturalStarts=0
SupernaturalRatio=34
; Example : with default settings, 7 damage is converted to (7-0) *34% = 2 minimal damage.
```

The table settles the inputs, but its worked example does not settle rounding: both floor and
nearest-integer rounding turn 2.38 into 2. R5.2c read the compiled consumer at
`$005B2ED9..$005B2F1E`: it computes
`Round((hits - SupernaturalStarts) * SupernaturalRatio / 100.0)`, with an explicit `fild`,
`fdiv`, and `@System@@ROUND` call.

**The rounding is banker's — ties to even.** `@System@@ROUND` is `fistp` with no control-word
change, so it uses the FPU default RC=00; the adjacent `Trunc` has to set RC explicitly to
truncate. With the shipped `0/34` values, ties fall exactly at `hits ≡ 25 (mod 50)`, so
`hits = 25` gives `8.5 -> 8`, not 9. A half-up `round` is therefore not a faithful substitute.

The historical `Math.round(hits / 3)` approximation underestimated the exact formula at higher hit
counts; its first divergences from the shipped 0/34 inputs were:

| hits | 28 | 31 | 34 | 37 |
|---|---|---|---|---|
| engine | 10 | 11 | 12 | 13 |
| historical approximation | 9 | 10 | 11 | 12 |

The exact rounding shape is executable-backed rather than inferred from table prose.

## To Defend cap — executable consumer resolved

`MODDING.INI [Gameplay]`, identical in both versions:

```
; The amount of defense above which To Defend bonus loses effectiveness.
ToDefendCap=15
; The amount of chance to defend after the To Defend cap is exceeded and it has reduced effect.
; (Base chance of defend without any bonus or penality is 30%)
ToDefendCappedValue=30
```

R5.2e found the exact consumer in `@Units@DefenseRoll`, `$00595E7C..$00595EE9`. Before each
defense die is rolled, `$00595E9E..$00595EBD` checks whether the one-based die index exceeds
`ToDefendCap` and whether the current To Defend exceeds `ToDefendCappedValue`. Only then does it
replace To Defend with the capped value. Thus dice 1–15 use the original chance; dice 16 onward
use `min(original chance, 30%)`. A chance below 30% is never raised.

This closes **Q14** and confirms the calculator mismatch as **F32**: its damage engine currently
rolls every defense die from a single binomial distribution at the original To Block chance.
The exact routine, loader bindings, branch bytes and ledger are in
`Caster binary/Combat.ResolutionHelpers.R5.2e.evidence.md`.

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

## Ranged penalty — executable consumer resolved for D14

The table comment's word **Sharpshooting** is misleading about the compiled gate. R5.2e's
`@Combat@RangedPenalty`, `$005B1800..$005B1927`, directly tests calculated
`Units[au].ishero`; there is no ability lookup. Zero is disable-shaped for the penalty: with the
shipped `HeroNoRangePenalty=0`, every hero has distance set to zero. `MagicNoRangePenalty=0`
separately does the same for magical ranged attacks.

The routine also confirms the four-key formula and Long Range shape. It subtracts the start
distance, lets Long Range zero only that excess, then computes
`(excess div Gap) * Growth + Base`. With shipped values, distance 4 costs 10%, each further tile
adds 3%, and Long Range caps an applicable penalty at 10%. D14 is closed; the calculator's
missing CoM2/Warlord hero exemption is **F33**.
