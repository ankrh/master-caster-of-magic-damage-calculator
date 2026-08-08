# Damage Calculator — Specification

What the calculator must do and hold true. Working conventions (tooltip style,
`ABILITY_DEFS` ordering, how to run tests) live in [CLAUDE.md](./CLAUDE.md); this file
is the behaviour contract.

## Purpose

Given two units, a game version, and a set of abilities, enchantments and battlefield
conditions, produce the **exact probability distribution** of damage dealt to each side
in one round of combat.

## Scope

**In scope**

- One combat round between one attacker unit and one defender unit.
- Melee (with counter-attack) and ranged (no counter-attack) modes.
- Five game versions, each modelled as a distinct rule set — see *Versions* below.
- Unit stats, experience levels, weapon/armour loadout, unit abilities, unit
  enchantments and curses, global enchantments, city walls, node auras, range.
- Special attacks that resolve alongside a normal attack: touch attacks, gazes,
  Immolation, Wall of Fire, Cause Fear, Life Steal, Doom damage.

**Out of scope — deliberate non-goals**

- **The resistance roll that decides whether a spell lands.** The calculator assumes
  every selected curse or enchantment has already landed, and models its outcome. It
  never rolls to see whether the target resisted the spell in the first place.

  Two adjacent things *are* in scope and must not be confused with this:
  - Resistance **granted or imposed by an effect that has landed** — Resist Elements'
    +4 vs Nature, a curse's −2 Resistance — modifies the unit's Resistance stat and is
    fully modelled.
  - Resistance rolls that are part of an **attack** — Poison Touch, Stoning, Death
    Gaze, Life Steal — are attack mechanics, not spell-landing mechanics, and are
    modelled exactly.
- Multi-round combat, unit positioning, movement, morale, or army-level resolution.
- Overland play: economy, research, diplomacy, AI.
- Healing, regeneration between rounds, or post-combat effects.

## Versions

Five rule sets, selected by `#gameVersion`, are first-class and independently correct:

| Id | Label |
|---|---|
| `mom_1.31` | MoM 1.31 |
| `mom_cp_1.60.00` | MoM CP 1.60 |
| `com_6.08` | CoM 6.08 |
| `com2_1.05.11` | CoM2 1.05.11 |
| `com2_warlord_1.5.12.6.2` | Warlord 1.5.12.6.2 |

Rules:

- **Warlord is its own version, not a flavour of CoM2.** A statement about "CoM2" does
  not automatically hold for Warlord.
- Version differences must be modelled where they exist, including **faithfully
  reproducing original-game bugs** where the version has them (e.g. the v1.31 Blur
  half-block bug in `blurSurvivingDist`, the v1.31 Cause Fear silencing bug).
- A version's roster comes from its own `units_<version>.js`; `mom_1.31` and
  `mom_cp_1.60.00` share `MOM_UNITS_DATA`.
- Abilities and enchantments not present in a version must be **hidden from the UI and
  inert in the result**. A hidden control must never influence a computation.

## Computation model

- **Exact probability, never simulation.** All results come from closed-form binomial
  distributions and convolution. Monte Carlo is prohibited.
- Attack resolution is `Binomial(attackStrength, toHit)` hits against
  `Binomial(defenseStrength, toBlock)` blocks, per attacking figure.
- Excess damage past a figure's HP **rolls over** to the next figure with a fresh
  defence roll (`singleAttackDmgDist`). Area damage does **not** roll over
  (`areaPerFigureDmgDist`) — excess beyond a figure's HP is lost.
- Multi-figure attacks convolve the single-figure distribution using
  exponentiation-by-squaring.
- Probabilities below `1e-15` may be pruned.

### Joint distribution

Melee resolution maintains a **2D joint distribution** `P(cumulative damage to A,
cumulative damage to B)` and walks the phase list, recomputing each side's *living
figure count* per cell before every phase. This is what makes casualties mid-round
correctly reduce subsequent output, and it is why phases cannot be computed
independently and summed.

Simultaneous phases (counter-attack + second strike) read from a frozen snapshot of
the joint so neither observes the other's update.

## Combat resolution contract

`resolveCombat(a, b, opts)` is the single entry point. It returns per-side total damage
distributions, remaining/total HP, live figure counts, Life Steal distributions, and —
for melee — an ordered `phases` breakdown for display.

**Melee phase order (MoM 1.31 / CP 1.60 / CoM 1):**

1. Thrown / breath attack
2. Attacker gaze
3. Defender gaze
4. Wall of Fire
5. Defender Cause Fear
6. First Strike (if the attacker has it and it is not negated)
7. Attacker Cause Fear
8. Counter-attack, and the main melee exchange

Without First Strike, melee and counter resolve **simultaneously**.

**CoM2 / Warlord melee phase order:**

1. Wall of Fire
2. Attacker Stoning Gaze, Death Gaze, Doom Gaze
3. Defender Stoning Gaze, Death Gaze, Doom Gaze
4. Attacker Lightning Breath, Fire Breath, Thrown
5. First Strike, when admitted
6. Main melee, Haste melee, and counter-attack

Each phase in steps 1–4 is dealt before the next phase reads living figures. An admitted First
Strike is also dealt immediately. The main attacker result, optional Haste result and counter
result are then computed from one pre-damage state before being dealt in main, counter, Haste
order. Every melee `ApplyAttack` call performs its own Cause Fear rolls, so the two Hasted melee
strikes use independent fear samples.

**Ranged:** attacker shoots, no counter-attack, no fear phase. An Invisible defender
cannot be targeted at all unless the attacker has Illusions Immunity.

**Distance penalty** (missile and boulder only — magical ranged, thrown, breath and gaze
never pay it). −10% To Hit per full 3 tiles in MoM 1.31 and CP 1.60, per full 4 tiles in
CoM 1; CoM2 and Warlord instead charge −10% at 4 tiles and −3% per tile beyond. Long Range
caps an existing penalty at −10% but never creates one. **CoM 1, CoM2 and Warlord exempt heroes
outright** — the modern engine directly tests the hero flag, not Sharpshooting or another ability.

Vertigo is a direct battle-unit stat debuff. MoM 1.31 and CP 1.60 apply −20% To Hit
and −1 Defense; CoM 1 applies −30% To Hit and −10% To Block; CoM2 and Warlord apply
−25% To Hit and −7% To Block. Its To-Hit penalty reaches melee, ranged, thrown,
breath, and gaze attacks. Its Defense/To-Block penalty reaches every defense roll,
including spell damage from Immolation and Wall of Fire.

Haste repeats the attacker's melee, thrown, breath, and ranged attacks. It also repeats
counter-attacks in MoM 1.31 and CP 1.60, but not in CoM 1, CoM2, or Warlord. In the DOS
MoM builds, a Caster unit's mana-pool magical ranged attack is repeated when enough mana
remains—at least 7 in 1.31 and 6 in CP 1.60—and the extra shot spends 3 mana. Mana and
ammunition are outside this one-round damage model, which assumes the extra shot is available.

**MoM 1.31 exception:** a *hero* with a magical ranged attack gets no repeat. 1.31's gate
recognises only the Caster 20/40 unit flags, so a hero falls through to the ammunition
branch and has none; CP 1.60 added the missing hero test. This models the common case —
the same 1.31 gate reads an unrelated battle-unit slot and can flip either way.

In CoM2 and Warlord, Haste also repeats each of the initiating attacker's Stoning, Death and
Doom Gaze phases. It does not repeat the defender's retaliation gazes.

In CoM2 and Warlord, Blood Lust doubles the selected attack strength for **melee and Thrown**
attacks against a non-Fantastic defender. It does not double ranged or either Breath attack.
CoM 1 retains its melee-only rule.

CoM2 and Warlord Cause Fear have a base/current-record distinction. The direct Death-Immunity
gate reads the feared unit's persistent base record before the −3 Death-realm resistance rolls;
Death Immunity derived only during stat recalculation (for example from Blood Lust, Animated or
Rebuild) does not skip those rolls. Intrinsic/base Death Immunity does. Magic Immunity still
blocks Cause Fear through the resolution-time effective-resistance assignment.

Special riders resolve with whichever phase their version's dispatcher admits. In CoM2 and
Warlord, Exorcise, Stoning Touch, Death Touch, Life Steal, Destruction and Poison run for
physical ranged, magical ranged, both Breath attacks, Thrown and melee, but not for any Gaze attack.
All six sit inside the attacker-figure loop and therefore make one attempt per surviving
attacker figure. A failed Destruction roll assigns 150 damage and destroys the target unit,
but Destruction still makes one resistance roll per attacking figure.

An immunity that stops one of these effects **skips its roll outright** — it is not
modelled as a large resistance bonus, and there is no MoM-vs-CoM magnitude on this side.
Magic Immunity skips Exorcise, Stoning Touch, Death Touch, Life Steal and Destruction, but
not Poison. Exorcise additionally requires a Fantastic target and is skipped by Spell Lock;
Stoning Touch is skipped by Stoning Immunity; Death Touch and Life Steal are skipped by Death
Immunity; Poison is skipped only by Poison Immunity. The only genuine resistance *bonuses*
here are realm-scoped: Righteousness +30 against the Death-realm effects (Death Touch, Death
Gaze, Life Steal), and none at all against Poison, which is dispatched realm-less.

In the DOS builds, Immolation and Wall of Fire both resolve through the Fireball
spell-damage path and therefore share its defence specials. Large Shield applies to both:
+2 defence in MoM 1.31/CP 1.60 and +3 in CoM 1. Elemental Armor / Resist Elements also
apply: +10/+3 in the MoM builds and +12/+4 in CoM 1. The modern Caster engine keeps the
calculator's narrower elemental scope: CoM2 and Warlord apply the +12/+4 defence to
magical ranged and breath attacks, but not to Immolation or Wall of Fire.

CoM2 and Warlord resolve Immolation and Wall of Fire through `DamageSpell`. Magic Immunity
short-circuits a magical spell to zero damage before any roll. Black Sleep is checked later and
turns the spell into Doom damage, bypassing hit, defense and Invulnerability rolls; the earlier
Magic-Immunity exit still wins. Other matching spell immunities replace Defense with 100 rather
than exiting.

For an `Area` spell, the engine attacks once per current living target figure and caps each
subattack at the unit's **full HP per figure**. It deliberately does not use the wounded top
figure's remaining HP for that cap; all subattacks feed one aggregate damage total. CoM2 Wall of
Fire and both versions' Immolation use this path. Warlord Wall of Fire has no `Area` flag: it makes
one ordinary attack and sends its surviving damage through a repeated figure-boundary loop. The
first boundary uses the wounded top figure's remaining HP; every later boundary uses full HP per
figure. At each crossed boundary the remainder receives a fresh Defense roll and another
Invulnerability subtraction, repeating until the remainder fits a figure.

Chaos Conjunction multiplies Immolation's strength by exactly 1.34 and truncates. It does not
modify Wall of Fire. Warp Lightning instead receives +2 strength and makes a descending series
of attacks from that strength through 1.

### Gaze attacks

A gaze is one attack with two independently-bounded parts, and a **single** strength/type
slot in the unit data:

- The **hidden component** — a conventional attack at the DOS unit's shared secondary-attack
  strength, with the shared type set to Stoning, Multiple, or Death Gaze,
  taking the normal to-hit, defence and blur rolls. It is rolled **once per attacking
  figure**.
- The **kill rolls** — stoning and/or death, one resistance roll per **defending** figure,
  resolved once per attack regardless of the attacker's figure count. A figure that fails
  either roll dies once, so the two are combined into a joint per-figure probability.

The gaze's **realm follows its type, not the attacker's**: Stoning Gaze is Nature, Death
Gaze is Death, and a unit carrying both — equivalently, one with Doom Gaze — is Chaos.
Doom Gaze is the same strength number delivered as automatic damage instead of a rolled
attack. It is dealt **once, unscaled by figure count** — correct as modelled for CoM2 and
Warlord, whose engine passes a hard-coded figure count of 1 for it (unlike the stoning and
death gazes beside it). MoM does scale it, but its only Doom Gaze unit has one figure, so
the single model is right for every version's roster. That realm is what the defence
specials key off:

| Defence special | Applies to the hidden component |
|---|---|
| Large Shield | always |
| Magic Immunity | always (defence 50 / 100) |
| Bless | Chaos- and Death-realm gazes |
| Righteousness | Chaos- and Death-realm gazes, **MoM only** |
| Elemental Armor / Resist Elements | Chaos- and Nature-realm gazes, **MoM only** |
| Weapon Immunity | **never** — structurally excluded, not merely unreachable |
| Missile Immunity | never |

**The hidden component is MoM-only, and not merely absent from the later rosters.** MoM packs
a gaze into the single `ranged_type`/`ranged` pair it also uses for ranged, thrown and breath,
which is what gives a gaze an attack strength at all. CoM2 and Warlord restructured this into
three independent stats — `SStoningGaze`/`SDeathGaze` (save modifiers, 100 = no gaze) and
`SDoomGaze` (damage) — with **no attack-strength slot**, and their `RangedType.INI` defines no
ranged type in the 100-105 band. Their gaze therefore has no hidden component to model, and
`gazeAttackFires` accordingly returns true for them without requiring one.

MoM 1.31 preserves its immunity-selection ordering bug: on an eligible normal missile
attack, Weapon Immunity overwrites Missile Immunity, including Weapon Immunity granted by
Invulnerability or Wraith Form. If that attack bypasses Weapon Immunity — for example,
because its weapon is magical or the attacker is one of 1.31's generic hulls — Missile
Immunity remains in force. CP 1.60 and later leave Missile Immunity dominant.

## Stat derivation contract

`deriveUnitStats(input)` is the single place raw inputs become effective combat stats.
Each unit carries a version-scoped source identity (`templateId`, `heroTypeId`) separately from
its editable base identity (`isHero`, `baseRace`, `baseFantastic`). Predefined roster units retain
their source IDs; custom units use null IDs. Every derivation creates a fresh calculated identity
whose live `race` and `fantastic` values start from the corresponding base fields. Template-based
states such as Chosen or Golem are predicates derived when needed, never persisted booleans.
The card exposes `Hero`, `Fantastic`, and `Base race / realm` as independent editable custom-unit
controls; no combined user-facing `unitType` control is authoritative. The legacy compact token
remains only as an internal compatibility projection for existing preset callers. The
version-gated `Special unit` selector exposes named exceptions (`Other / no exception`, `Golem`,
`Chosen / Avatar`, `Zombies`, and `Catapult` where the selected engine has that path) without
exposing numeric template or hero IDs. Predefined roster units populate and lock all identity
controls. A named special-unit effect is shown at its ordinary point of use: for example, a
selected modern Golem owns a locked `Resist Elements` Elements value.
Order is load-bearing:

1. Ability grants from buildings/enchantments fold in first, so every later read sees
   them (Lava Smelter, Sancta Basilica, Divine Protection, Lucky Star, Pillar of Faith,
   Fortification, Insulation).
2. Magic-Immunity and Illusion-Immunity curse gating is applied.
3. Effective unit type is resolved (Chaos Channels, Black Channels, Undead conversions
   can change a unit's realm, which in turn gates other effects).
4. Loadout and experience eligibility are decided — fantastic creatures get neither by
   default; Warlord's Spirit Link widens *level* eligibility only, never loadout.
5. Stat modifiers, level bonuses, weapon/armour bonuses apply.
6. Every stat modification is a **step** in one ordered sequence over one mutable unit
   record. A step names the stats it writes and may read any stat's *current* value; list
   order is execution order. Additive, scaling, replacing and short-circuiting effects are
   all the same shape, because the engine makes them all the same way — a write to a field
   at a point in a sequence. The machinery is `Calculator/steps.js`; the sequence itself is
   built in `deriveUnitStats`.

   Each step carries a **phase**: which region of the engine makes that write. A sequence
   must be authored in non-decreasing phase order (checked under the debug switch).

   | Phase | Where it runs | How a step is assigned to it |
   |---|---|---|
   | **base** | raw unit stats and permanent writes before combat | verifiable: roster data, creation, overland, or cast handler |
   | **a** | precalc, in the binary | decoded block by block |
   | **b** | precalc, in `UnitCalcPre.CAS` | verifiable: grep the file |
   | **c** | magic calc, in the binary | decoded block by block |
   | **d** | magic calc, in `UnitCalc.CAS` | verifiable: grep the file |
   | **e** | the binary's post-hook tail: the clamps, the aura pass, Supreme Light | decoded block by block |

   The hooks are declared in `MODDING.INI [Scripts]`: `UnitRecalculateEarly=UnitCalcPre`,
   `UnitRecalculate=UnitCalc`, `UnitRecalculateEnabled=1`. Base CoM2 sets that last flag to
   `0` and ships `HALT;` stubs, so **base CoM2 and MoM have no b or d at all** — every
   modifier in those versions is a or c.

   The consequence that is easy to get wrong: **b runs before c**. A Warlord CAS effect in
   the early pass lands *before* base-game spells, not after.

   Every phase is an engine region — there is no scaffolding left. **Region `a` is effectively
   empty**: it writes nine unit fields against `c`'s 492, and the ones it writes are flags, not
   stats. Everything the pre-map model had booked there has since been located in `c`.

**Which script file implements an effect decides its phase.** Game-fiction wording ("combat
enchantment", "trained in the city") does not. A modifier is classified by, in order:

1. Read it out of the region maps in `Reference docs/Caster binary/CoM2 binary
   analysis.md`, *Unit stat recalculation*, which decode `a`, `c` and `e` block by block with
   addresses.
2. Grep the identifier across `Reference docs/Script source/Warlord 1.5.12.6.2/*.CAS`. In
   `UnitCalcPre.CAS` → **b**; in `UnitCalc.CAS` → **d**, at that file's line order.
   (`DisAbil.CAS`, `DisInfo.CAS`, `AIRes.CAS` and `EnterGame.CAS` are display and AI only.)
3. A raw unit stat, or a value written permanently into the unit's base before the pipeline
   runs — `CreateUnit.CAS`, `OverlandEndTurn.CAS`, or a cast handler writing index 1 (`ABase`)
   in `OLSpell.CAS` — → **base**.
4. Neither map nor script names it → deduce, and mark the step `provisional`, saying from what.

Steps 1–3 are checkable, which is the point; only step 4 is judgment, and it is now the
exception. MoM's `berserk` is the sole remaining provisional placement. City Walls was once
provisionally in `a`, but `ApplyAttack` proves it is the resolution routine's `extradef` input.

**One sequence, one record — not a list per stat.** The record holds `res`, `def`, `atk`,
`rtb`, `hp` and the two gaze strengths, which share the engine's `.ranged` slot with `rtb`, plus
`toHit`, `toBlk` and `lifeSteal` — every unit field a step writes.
An effect the engine makes as one write to several stats is one step here too: Darkness writes
four, Blaze of Glory reads current Armor and writes both melee and Armor, the aura pass writes
whatever it touches. Shredding such a finding across five per-stat lists on the way in — and
leaving the fact that it was one atomic write to survive only as a comment — is what this
model exists to stop. The binary yields orderings as *effects in address order, each writing
several stats*; the list is isomorphic to that.

**There is no subtotal-read mechanism, and none is needed.** A step reads whatever field it
needs at its own position — `u.res`, not a named subtotal — exactly as the engine does. The
effects that scale rather than add reduce to a plain field read once they stand in the right
place:

- **Xenoveterinary**, +25% HP (minimum +1) — `UnitCalcPre.CAS:1038-1049`, the head of region
  `b`, so it precedes every other phase-b HP write and does not compound the level ladder,
  Lionheart, Endurance or Charm of Life, which are all `c`.
- **Colossal Strength**, +1 + 40% of melee / physical ranged / thrown — `UnitCalc.CAS:1227-1243`
  reads `GetStat` in region `d`, so everything earlier in that file scales and nothing later does.
- **Upgraded Explosive's fire-breath doubling** — `UnitCalcPre.CAS:1074-1078` doubles the
  value standing at the end of region `b`, so it is the last step of that region.
- **Holy Armor's `> 5` threshold** (+0x07407) and **Blaze of Glory's armor transfer**
  (`UnitCalc.CAS:1490`) read the defence standing at their own position.
- **Supreme Light's `defense += resistance / 3`** reads the live record at its own engine
  position — after Warp and Darkness in CoM 1, and in region `e` after the aura pass in
  CoM2/Warlord. CoM 1 uses signed truncate-toward-zero division; the cross-stat read was Q7.
- **Psycho Force** (`UnitCalc.CAS:1413-1417`) and **Pneuma Field** (`:1419-1425`) read the
  resistance standing at their own position in region `d`, which is *before* the aura pass — so a
  Holy Bonus or Resistance to All aura raises resistance afterwards and feeds neither. Pneuma
  Field's `AFLifeSteal` write is why `lifeSteal` is a field of the record.

`getAbilityStatSteps()` emits one step per ability or enchantment that writes a stat, and
`deriveUnitStats` splices those into the sequence region by region. Nothing is bucketed or
summed on the way in, so an ordering finding lands as a step move. An ability whose flat half
sits there and whose attack-type-conditional half sits in `deriveUnitStats` appears as two
steps sharing a name — `lionheart` and `lionheart:rangedHp`, `weakness` and `weakness:ranged`.

A bonus normally never conjures an attack slot the unit does not have, so an ability step skips a write
to a dead slot — which is also the aura pass's own gate, "add the aura value to defense and
resistance, and to melee/ranged **when the corresponding base attack exists**". **Blaze of
Glory's armor-to-melee transfer is the deliberate exception**: it lands on a unit with no melee
attack, so it is not built as an ability step, and it widens the slot for the final clamp.
CoM 1 Supreme Light is another source-backed exception: its `+2 melee` store is unconditional,
while only its shared-ranged write tests that the current value is positive (`0x90A29..0x90A46`).

Two engines reach the secondary-attack slot differently, so a step's delta names which:

- **`rtb`** — the DOS engines' shared `.ranged` slot. One write reaches conventional ranged,
  Thrown, Breath and both gaze strengths alike; that sharing is why CoM 1's Warp Attack halves
  a gaze, and why Chaos Surge reaches everything.
- **`ranged`** — `Caster.exe`'s `unitT.ranged`, which is *only* the conventional ranged attack.
  Thrown, Fire Breath, Lightning Breath and the gazes are separate fields there, so a CoM2
  bonus written to `ranged` never reaches them. The Holy Bonus aura is the case that matters.

No hand-built stat sum survives. Blaze of Glory was the last one: in region `d` it reads
current Defense, adds that whole value to melee, and sets Defense to zero. Region-`e` effects
such as the aura pass still run afterward and may add Defense on top of that zero.

### Resolution-time sequences

CoM2 and Warlord run two further ordered transforms for each incoming attack. They use the
same step type and runner as derivation, but operate on a scratch copy of the finished unit
record and discard it afterwards. They therefore cannot change the displayed Defense or
Resistance, or leak a modifier into a later attack.

`GetEffectiveResistance` is keyed by the attack's realm and runs in this order:

1. copy the finished Resistance;
2. on a resistance roll, set it to 100 for a Charmed hero;
3. set it to 100 for Magic Immunity when the attack has a realm;
4. add Resist Elements against Nature (+4);
5. add Bless against Chaos or Death (+5 CoM2 / +4 Warlord);
6. add Resist Magic against any realm (+5).

The assignments deliberately precede the additions. A Charmed or Magic-Immune unit can
therefore finish above 100; Charmed also reaches realm-less rolls such as Poison, while Magic
Immunity and the three realm bonuses do not. Charmed is roll-only and never changes the
displayed stat.

The DOS engines retain their additive resistance path: in MoM 1.31, CP 1.60, and CoM 1,
Charmed adds 30 to a hero's Resistance for rolls, including realm-less Poison.

`EffectiveDefense` is keyed by the incoming attack flags and runs in this order:

1. copy finished Defense plus attack-specific extra Defense (including City Walls: +3 intact,
   +1 damaged, for an outside attack against a defender inside the walls);
2. an unresisted Illusion sets Defense to zero and halts immediately;
3. add Large Shield;
4. add Resist Elements;
5. add Elemental Armor;
6. add Bless only for a positive-ID Chaos- or Death-realm spell; `ApplyAttack` passes spell ID 0,
   so unit attacks do not receive this defense bonus;
7. halve the accumulated value for Armor Piercing (unless Lightning Resist cancels a
   Lightning attack's piercing);
8. Fire, Cold, Poison, Magic and Missile Immunity assignments replace the accumulated value
   with 100;
9. add Weapon Immunity (+8 CoM2 / +10 Warlord).

Consequently Armor Piercing includes steps 3–6 in the halving, an immunity discards that
halved total, and Weapon Immunity can stack on top of an immunity's 100. Illusion's early
return prevents every later bonus and immunity from applying. Righteousness remains in step
8's replacement slot for compatibility while its CoM2/Warlord classification is still open
under D1/D3.

The subsequent CoM2/Warlord defense roll changes probability after the fifteenth defense die.
Dice 1–15 use the unit's ordinary To Block. Dice 16 onward use the lower of that chance and 30%
(the shipped `ToDefendCap=15` / `ToDefendCappedValue=30` settings). The current calculator does
not yet split those dice; F32 tracks that implementation gap.

### Warp Creature ordering

Warp Creature reduces rather than adds, so unlike an additive modifier its *position* is
observable — and it is the sharpest divergence between the engines. Every one of them runs the
block inside its stat recompute, in the order Attack → Defense → Resist, with Shatter
immediately after; what differs is **what each engine still writes afterwards**:

| Engine | Address | Written after it, at full value |
|---|---|---|
| MoM 1.31 / CP 1.60 | `0x90A23`–`0x90ACE` | Shatter, then the terminal clamp — nothing else |
| CoM 1 | `0x9074C`–`0x90795` | Shatter `0x907DC`, Darkness, Supreme Light, the Tactician retort, Eternal Night |
| CoM2 / Warlord | `+0x0BA3C`–`+0x0BDF7` | Shatter `+0x0BF62`, Tactician `+0x0C890`, then the whole of `d` and the whole of `e` |

So one position in the sequence serves all three — the end of region `c` — and the divergence
is expressed by which steps carry `afterWarp`, the marker for the part of `c` that follows the
block. Nothing else lies between, which is what lets CoM 1's early Warp and MoM's late one
share a position.

An effect an engine orders differently is modelled as **two version-exclusive steps** rather
than one step with a version predicate, which keeps the divergence visible in the list instead
of hidden inside a condition. Darkness has a pre-Warp CoM2/Warlord step and a post-Warp CoM 1
step; Warlord True Light is its own `UnitCalcPre.CAS` step; and Eternal Night's CoM 1 Resistance
penalty is a third, later write after Tactician. Supreme Light, the Tactician retort, and Focus
Magic likewise have version-specific positions. The binary runs Focus Magic at `+0x00D3F`, near
the head of `c` and therefore *before* Warp, while Warlord re-implements it in
`UnitCalc.CAS:515` and therefore after. CoM 1's Focus Magic position is deduced rather than
read: the list of what its recompute writes after Warp is exhaustive and does not contain it.

Shatter precedes CoM 1's post-Warp writes, so a Shattered CoM 1 unit under Supreme Light
attacks at 3, not 1.

**CoM2 and Warlord reach CoM 1's outcome by the opposite route.** CoM 1 moves Warp early;
CoM2 moves Supreme Light and the native aura pass late, into region `e`. The consequence is the
same — those effects land at full value on a reduced stat — but the mechanism is not, and the
things carried past the reduction differ: CoM2 carries the whole of `UnitCalc.CAS` past it,
including Colossal Strength, Blaze of Glory and Hierophany.

Two further consequences of CoM 1's early Warp are CoM 1's alone: it halves a gaze's strength
(the gaze shares the `.ranged` slot there and CoM 1's halving has no attack-type test, while
CoM2's Warp Attack leaves the separate gaze fields untouched), and CoM 1's level ladder gives
every `ranged_type >= 100` attack — Thrown, both Breaths and all three gaze types — only its
step-1 ranged increment, which is the calculator ladder's `thrown` column. MoM's level routine
has no such gate, so those attacks take its full `ranged` column. CoM2's gaze ladder is still
unread — see `Reference docs/Engine verification evidence.md`, D21.

The DOS arithmetic is signed at these sites. CoM 1 Warped Attack uses an arithmetic byte shift,
so negative melee/shared-ranged values round downward; Warped Defense instead uses signed `/3`
and truncates toward zero (`0x90749..0x90795`). This distinction is observable because CoM 1
still writes Darkness, Supreme Light and Tactician before the terminal clamp. F53 tracks the
calculator's current `Math.floor` mismatch.

### CoM 1 late battlefield and side modifiers

CoM 1 Supreme Light's side and active-status gates are followed by five alternative unit gates:
live magical ranged type, Life race, nonzero mana, persistent Focus Magic, or a magical base
ranged type. It then adds 2 melee unconditionally, adds 2 shared ranged only when positive, and
adds signed live `Resistance / 3` to Defense. The current shared eligibility helper is narrower;
F52 owns the correction. Its additional `Move_Flags 0x0100` write remains unidentified under Q20.

Realm Wards map city-enchantment slots 9–13 to Nature/Sorcery/Chaos/Life/Death and subtract
20% To Hit, 3 Defense and 3 Resistance from a matching Fantastic unit. Q19 records the shipped
helptext's conflicting −4/−4 claim, while F51 owns the missing calculator control.

The relocated pre-Heavenly-Light tail consumes three per-side hero maxima. Guiding Beacon adds
to positive conventional ranged (`0 < ranged_type < 100`), Divine Barrier adds Defense without a
unit gate, and Soul Linker gives Fantastic units `ceil(v/2)` To Hit and `floor(v/2)` To Block.
F50 tracks their controls and ordered transforms.

Warlord scoring options that affect a unit are represented as per-unit encounter inputs:

- **Uphill Battle:** checking the option on an AI-controlled unit fighting the human player
  grants that unit +10% To-Hit, +10% To-Defend, and +1 Resistance in phase b.
- **Gods Play Dices:** the per-unit numeric input records the Resistance modifier already
  rolled at combat start, clamped to an integer from −2 to +2. It is fixed for the combat
  calculation and is applied in phase b; it is not folded into the damage distribution.

The DOS unit card retains its shared `rtb` slot, whose type selector includes conventional ranged,
Thrown, Breath, and the three gaze types. There is no separate hidden-gaze input: for a gaze, this
shared value is the conventional gaze strength, and Multiple Gaze also uses it as Doom Gaze damage.
CoM2 and Warlord instead expose and carry independent Ranged, Thrown, Fire Breath, and Lightning
Breath records. The modern resolver consumes those named records, so coexisting roster attacks
are neither projected into one card field nor discarded. Modern cards also expose roster-bound
gaze and touch save modifiers and their To Defend value, each an independent field.

The DOS card instead presents the record's single `Spec_Att_Attrib` byte as one **Special value**
input beneath the shared slot, with a checkbox per consumer: Stoning Touch, Death Touch, Life
Steal, Poison Touch, Holy bonus, and Res. to all. Ticking a consumer gives it that one magnitude —
negated for the save-modifier riders, positive for Poison Touch's repeat count and for the two
bonuses — so the contention the record imposes is visible rather than hidden behind independent
fields. The gazes read the same byte but are selected by the slot's type rather than by a flag, so
they have no control of their own: type 103 makes it a stoning save, 105 a death save, and 104
both at the same modifier. Selecting a non-gaze type removes the gaze outright. Type 104 has no
conventional component — its Automatic Damage delivers the strength rather than rolling it, so the
strength is the Doom damage and is not also rolled as a hidden attack. Holy bonus and Res. to all here are the value this unit *provides*; the
received side stays an enchantment input and the two max together. Dispel Evil and Destruction
dispatch with the touch riders but take literal modifiers (−4 and 0) rather than the byte, so they
stay ordinary ability rows rather than joining the card block. Exorcise is their CoM-onward
counterpart and is hidden in the MoM versions, which have Dispel Evil instead.

Lucky is the one modifier resolved per-unit rather than by name: it reaches a unit from five
sources across base, a and b, and does not stack, so it is counted once in the **earliest**
stage that grants it, via the `luckyPhaseBase`/`luckyPhaseA`/`luckyPhaseB` markers set during
step 1.

Warlord's **Lucky Star** has two separable effects, and the UI carries one control for each.
Its aura gives **every** friendly unit in the combat, the enchanted one included, phase-b
+1 melee/ranged/Armor/Resistance; it does not stack across copies. That is the `luckyStar`
condition, which therefore means *some friendly unit in this combat is enchanted*, not *this
unit is*. The separate grant of **Lucky** reaches only the enchanted unit, so it is expressed
with the ordinary `lucky` ability rather than derived from `luckyStar`. The ranged bonus also
covers Thrown and Breath through the shared `rtb` stat.

(Before the v1.5.12.6.2 hotfix the aura's stack scan tested the unit being recalculated instead
of the scanned friendly unit, confining both effects to the enchanted unit. The calculator
reproduced that bug; it no longer does.)

**True Sight** grants Illusion Immunity in every version. In Warlord it additionally grants
+5% ranged/Thrown/Breath To-Hit in phase d; Eye of Heaven grants True Sight and therefore
the same To-Hit bonus.

Warlord's Halfling-only **Academy** is represented by the per-unit `alumniOfAcademy`
training condition. It permanently adds two figures to either Halfling Rocs (the script's
explicit Fantastic Stable unit) or a non-Mechanical Halfling unit with an innate magical
ranged attack. It is inert for heroes, other races, physical ranged/Thrown/Breath units,
and other Mechanical units.

Callers must not recompute effective stats themselves.

### Warlord Outlander conditions and derived unit states

The UI records fundamental conditions, never a second checkbox for a state those conditions
derive. Intrinsic roster facts — **Mechanical**, **Sapiens**, **Flying**, and **Sailing** — live
under Abilities and are roster-owned when a predefined unit is selected. Research, building,
and reform conditions live under Enchantments and remain editable for predefined units:
**Armorclad reform**, **Military Workshop**, **Rocketry**, **Explosive**, **Heat Power Engine**,
**Magitek Engineering**, **Temporal Engineering**, **Energy Beam Weapons**,
**Psycho Converter**, **Pneuma Reactor**, **Xenopsychology**, **Radio**, **Ballistics Training**,
**Magitek Science**, **Xenoveterinary**, and **Military Drilling**. Every Outlander reform is
inert unless that side also has the **Outlander wizard** owner condition.

`deriveUnitStats` resolves those inputs to the following internal states and effects:

- **Armorclad reform:** permanently Mechanical units derive **Armorclad** and +6 base Armor.
  Other non-fantastic units derive **Battle Armor** and +3 Armor in phase b.
- **Military Workshop or Rocketry:** a normal unit derives **Blackpowder Weapon** only when
  it already has physical ranged, Thrown, or Fire Breath. Missile becomes a heavy physical
  projectile. Physical ranged or Thrown gains Armor Piercing; if it already has Armor
  Piercing or Doom, ranged gains +2 and Thrown gains +4 instead. Fire Breath gains +4.
  Its attacks also gain Poison 1.
- **Explosive:** a non-fantastic or Sapiens unit with melee or Flying derives
  **Bombs&Grenades**, adding `floor(8 − maximum figures / 2)` Thrown strength and Wall
  Crusher. A unit that also derived Blackpowder gets the **Upgraded Explosive** branch:
  +2 physical ranged strength, or Fire Breath doubled at its point in phase b.
- **Heat Power Engine:** permanently Mechanical units derive **Power Engine**.
- **Magitek Engineering:** Power Engine units gain +20% To-Defend and Large Shield.
- **Temporal Engineering:** Power Engine units gain Haste. If also Sailing, they derive
  **Temporal-Gravity Drive**, Flying, and Illusion Immunity.
- **Energy Beam Weapons:** eligible non-fantastic soldiers derive **Energy Weaponry**, so
  melee and counter-attacks deal Doom damage. Power Engine units with an existing ranged
  attack instead also derive **Energy Cannon**: Beam,
  `floor(current permanent ranged / 2)` additional ranged strength, ranged Doom damage, and
  Destruction at −1 resistance per full 15% permanent Ranged To-Hit. Beam is magical ranged,
  but Magic Immunity does not stop its Doom damage.
- **Psycho Converter:** eligible non-fantastic soldiers derive **Psycho Force**; To-Hit and
  To-Defend each gain `floor(current Resistance × level rank / 2)` percentage points.
- **Pneuma Reactor:** eligible non-fantastic soldiers derive **Pneuma Field**, granting
  Life Steal at `−floor(current Resistance / 2)` and stacking with an existing negative
  Life Steal modifier.
- **Xenopsychology / Radio / Ballistics Training:** non-fantastic units and Sapiens
  fantastic units gain, respectively, +1 Resistance; +10% To-Hit, +10% To-Defend and
  +1 Resistance; and +20% Ranged, Breath and Thrown To-Hit. These are phase-b combat effects.
- **Xenoveterinary:** fantastic units gain +10% To-Hit and +25% HP (minimum +1). Its HP
  increase is phase b and reads the base+a HP subtotal.
- **Magitek Science:** derived Armorclad units gain Resist Magic. Both prose sources also
  name Battle Armor, but the executing scripts grant it only alongside the permanent
  `EncArmorClad` flag; the transient Battle Armor branch receives no grant.
- **Military Drilling:** newly trained non-fantastic units have permanent overland
  Discipline; the calculator represents that landed permanent state. Its Mechanical
  below-half-HP healing clause is out of scope.

The shared soldier gate admits non-fantastic non-Mechanical units, heroes, and Armorclad
Mechanical units; it rejects fantastic units. **Sapiens** remains a roster eligibility tag,
generated from Warlord `Custom13=14`.

The Warlord Lava Smelter selector records a permanent mineral-pair grant carried by the
unit. New Dwarf units receive grants when trained; **Upgrade & Retrain** can apply them
later to any existing non-fantastic unit, so the selector does not independently enforce
the unit's race or hero status. Fantastic creatures are ineligible. Its **Fiery Blade**
outcome grants +3 melee, adds +2 Missile/Thrown, bypasses Weapon Immunity, and does not
stack its bonuses with Flame Blade's corresponding bonuses. Fiery Blade is not exposed as
an independent checkbox.

The derived states are not UI inputs:

- **Bombs&Grenades** is the display label for Explosive's grant, not a second grant.
- **Magitek Engine** is not a distinct game-data enchantment; Magitek Engineering is gated
  by derived Power Engine.
- **Power Engine**, **Armorclad**, **Battle Armor**, **Blackpowder**, **Energy Weaponry**,
  **Energy Cannon**, **Psycho Force**, **Pneuma Field**, **Temporal-Gravity Drive**, and
  **Upgraded Explosive** must not be exposed as independent checkboxes.

Movement changes other than Haste, transport behavior, and overland-only effects remain
outside the one-round combat model.

## Data provenance

A version's roster is authoritative only as a faithful derivation of its source in
`Unit rosters/`; the in-app `units_<version>.js` files are build products. Generator
mapping and the no-hand-editing rule are in the root [CLAUDE.md](../CLAUDE.md).

## UI contract

- Two symmetric panels (attacker `a`, defender `b`) with identical stat and ability
  controls; `#swapBtn` exchanges them.
- Result panels show, per side, the damage distribution and the chance the unit is
  destroyed; the melee breakdown grid shows one row per phase in resolution order.
- **Matrix mode** computes attacker-vs-whole-roster ratios in Web Workers. The worker
  must produce results identical to the main-thread `resolveCombat` — it calls the same
  function, and any divergence is a bug.
- Each panel is split into two titled sections. **Base stats and abilities** holds the
  editable stat fields and the unit's abilities. **Enchantments and conditions** holds the
  level, weapon and armour selects and damage already taken, followed by the enchantments.
  The dividing rule is whether the value is roster-owned or chosen per battle — which is
  also exactly the set that stays editable when a predefined unit locks the stat fields.
- The stat fields hold **pre-level** values. Experience level is applied downstream as an
  ordinary transform step, so no code path may write a level bonus into a card field.
  Effective values appear only in the modifier column. That column shows one final modified
  number; it does not reproduce the games' plain/gold or grey/gold presentation tiers.
- Hovering a final modified value shows the complete chain that produced it: the editable base,
  then every applied transform with its source and running value before and after the write, and
  finally the displayed result. The chain follows the applicable binary/CAS execution order, not
  UI grouping or effect name. It must be emitted from the same ordered transform path that computes
  the value rather than reconstructed independently after calculation. The existing touch-device
  tooltip interaction exposes the same information where hover is unavailable.
- Each section heading carries its own **Show all / Hide inactive** toggle, independent of
  the other section's and of the other panel's — four states in all, each defaulting to
  hiding.
  - A section heading always renders, including when the section has nothing on screen —
    otherwise a roster unit with no abilities would offer no way to reveal them.
  - **Show all** on Abilities reveals a predefined unit's greyed-out, roster-locked
    abilities as well as its merely inactive ones.
  - An effect the selected version cannot have is never revealed by either toggle. Version
    gating and roster locking both disable the control, so they are distinguished
    explicitly rather than by disabled state.
- Every ability and enchantment control carries a tooltip describing its modelled effect.
- Selecting a predefined unit locks roster-owned Abilities but not Enchantments. External
  reform, research, building, and spell conditions must therefore be placed under
  Enchantments even when they derive a unit ability during calculation.

### Tooltip content

A tooltip describes what the calculator models — no more, no less.

- **Never state the resistance roll that decides whether a curse lands** (e.g.
  "resistance roll at −3"). That roll is out of scope; see *Non-goals*.
- **Do state resistance the effect grants or imposes once it has landed** (e.g. "+4
  resistance vs Nature", "−2 resistance"). That modifies the unit's Resistance stat,
  is fully modelled, and is load-bearing information for the user.

Authoring style — line breaks, labelled lines, phrasing — is a working convention and
lives in [CLAUDE.md](./CLAUDE.md).

## Persistence and sharing

- Full page state is snapshotted as an id→value map plus unit identity, diffed against
  defaults, LZ-string compressed, and stored in `localStorage`.
- During R8.1 the persisted identity remains the legacy v1 `{race, name}` shape; the richer
  source/base/calculated identity is an internal boundary and is reconstructed on restore.
  R8.2 identity controls are part of that id→value map, so custom Hero/Fantastic/Base race or
  realm and Special unit selections survive reloads and share links. The separate persisted
  identity object remains the legacy v1 shape until the R8.4 schema migration; source/template
  IDs and calculated identity are never serialized there.
- A share link carries the same blob in the URL fragment (`#s=…`) and takes precedence
  over `localStorage` on load.
- Restoring must be order-safe: version first (which repopulates rosters and ability
  panels), then identity, then control values, then visibility.
- A corrupt blob must degrade to a clean default state, never throw on every reload.

## Invariants

These hold for every version, unit pair, and ability combination. The Playwright suite
in `tests/` asserts them:

1. **Valid PMF.** Every rendered distribution has probabilities in [0,1] summing to 1.
   Phases that cannot fire must still fold their mass in at damage 0 rather than
   dropping it.
2. **Monotonicity.** Raising attacker Attack never lowers mean damage dealt; raising
   defender Defense never raises it.
3. **Swap involution.** Two swaps restore the original state; one swap exchanges sides.
4. **Version gating.** A control hidden for the active version cannot affect the result.
5. **Roster soundness.** Every unit in every version's roster selects without error.
6. **No console errors** during normal interaction.

## Known modelling limitations

The descriptions below are canonical. Accepted decisions are summarized in
[HISTORY.md](./HISTORY.md); only limitations with planned implementation work appear in
[BACKLOG.md](./BACKLOG.md), *Modelling work*.

- Life Steal's *displayed* distribution is an approximation (phase count × single-firing
  distribution). Its damage expectation is exact within the calculator's capped-damage model,
  but its displayed self-healing currently undercounts rolls that exceed the target's remaining
  HP and does not reproduce `Combatheal`'s category order and overheal conversion: the engine
  feeds the uncapped resistance-roll result into that routine, which heals recoverable normal
  damage before undead damage and converts any remainder to per-living-figure bonus HP (**F28**).
- Damage is capped at the target's remaining HP; overkill is not tracked. This accepted damage
  limitation does not authorize capping healing amounts that the engine passes independently to
  `Combatheal` (**F27**, **F28**).
- Destruction is currently modelled only for CoM2/Warlord. The MoM/CP/CoM1 touch dispatcher also
  identifies Destruction as a Chaos effect; in MoM/CP, Elemental Armor and Resist Elements
  therefore protect against it. That older-engine Destruction path is not yet implemented.
- Heroes currently use the same five-rank level table and controls as normal units. The DOS
  binaries instead execute an eight-threshold hero ladder, with a different CoM 1 write pattern,
  and then apply level-scaled Agility, Blademaster, Might, Arcane Power, Casting Skill and Lucky
  template abilities. The modern engine has its own nine-step hero table. These hero-specific
  ladders and template abilities are not yet represented (**F41**).
- The Lava Smelter control records one mineral-pair grant at a time. The Warlord scripts
  evaluate all five mineral pairs independently, so a unit can carry several simultaneous
  grants when three or more qualifying minerals are available.
- **Ammunition is not modelled.** Every engine carries a per-unit shot count — MoM's `ammo`
  (battle-unit `+0x03`, the roster's `Shots` column: 8 for archers, 10 for the Catapult) and
  CoM2's `maxammo`/`ammo` (`SMaxAmmo`=55, `SAmmo`=56, `UNITS.INI` key `Ammo`) — and the
  calculator ignores both. A ranged attacker is treated as able to fire in every ranged
  exchange the scenario specifies. Deliberate: the calculator resolves a single engagement
  rather than a multi-turn battle, so a shot budget has nothing to deplete. It is therefore
  omitted from the unit card in every version. The consequence to be aware of is that a
  many-round ranged scenario can overstate an ammo-limited unit's output.
- **Regeneration is not modelled.** Both engines define it per unit — MoM as an `Abilities` flag
  (`0x2000`), CoM2 as a magnitude (`regeneration`, `SRegeneration`=41, `−1` = absent, roster
  values up to 7) — and all four rosters carry the token, but no ability definition matches it,
  so it is dropped at load. Deliberate, for the same reason as ammunition: it is between-turn
  healing, and the calculator resolves a single engagement. Omitted from the unit card in every
  version. The consequence to be aware of is that a regenerating unit's survivability across a
  long battle is not represented.
