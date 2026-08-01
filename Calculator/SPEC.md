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

**Melee phase order:**

1. Thrown / breath attack
2. Attacker gaze
3. Defender gaze
4. Wall of Fire
5. Defender Cause Fear
6. First Strike (if the attacker has it and it is not negated)
7. Attacker Cause Fear
8. Counter-attack, and the main melee exchange

With First Strike + Haste, phases 6–8 collapse into a single coupled block so that both
of the attacker's strikes share one fear sample per round. Without First Strike, melee
and counter resolve **simultaneously**.

**Ranged:** attacker shoots, no counter-attack, no fear phase. An Invisible defender
cannot be targeted at all unless the attacker has Illusions Immunity.

**Distance penalty** (missile and boulder only — magical ranged, thrown, breath and gaze
never pay it). −10% To Hit per full 3 tiles in MoM 1.31 and CP 1.60, per full 4 tiles in
CoM 1; CoM2 and Warlord instead charge −10% at 4 tiles and −3% per tile beyond. Long Range
caps an existing penalty at −10% but never creates one. **CoM 1 exempts heroes outright** —
a hero pays no distance penalty at any range.

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

Touch attacks, Life Steal and Immolation ride along with whichever phase fires them
(thrown, gaze, melee, or ranged), gated per version. They scale with the attacker's
surviving figure count — one roll per figure, each kill costing the target one figure.
**Destruction (CoM2 and Warlord) is the sole exception:** one roll for the whole attack
regardless of figure count, and a failed roll destroys the entire target unit.

An immunity that stops one of these effects **skips its roll outright** — it is not
modelled as a large resistance bonus, and there is no MoM-vs-CoM magnitude on this side.
Magic Immunity skips the whole touch/gaze group; each effect additionally skips on its own
specific immunity (Stoning, Death, Poison). The only genuine resistance *bonuses* here are
realm-scoped: Righteousness +30 against the Death-realm effects (Death Touch, Death Gaze,
Life Steal), and none at all against Poison, which is dispatched realm-less and so is
stopped only by Poison Immunity.

In the DOS builds, Immolation and Wall of Fire both resolve through the Fireball
spell-damage path and therefore share its defence specials. Large Shield applies to both:
+2 defence in MoM 1.31/CP 1.60 and +3 in CoM 1. Elemental Armor / Resist Elements also
apply: +10/+3 in the MoM builds and +12/+4 in CoM 1. The modern Caster engine keeps the
calculator's narrower elemental scope: CoM2 and Warlord apply the +12/+4 defence to
magical ranged and breath attacks, but not to Immolation or Wall of Fire.

### Gaze attacks

A gaze is one attack with two independently-bounded parts, and a **single** strength/type
slot in the unit data:

- The **hidden component** — a conventional attack at the unit's Gaze Ranged strength,
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
   | **a** | precalc, in the binary | not inspectable — inferred |
   | **b** | precalc, in `UnitCalcPre.CAS` | verifiable: grep the file |
   | **c** | magic calc, in the binary | not inspectable — inferred |
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
- **Supreme Light's `defense += resistance / 3`** reads the live record in region `e`, after
  the aura pass — the cross-stat read that was Q7.
- **Psycho Force** (`UnitCalc.CAS:1413-1417`) and **Pneuma Field** (`:1419-1425`) read the
  resistance standing at their own position in region `d`, which is *before* the aura pass — so a
  Holy Bonus or Resistance to All aura raises resistance afterwards and feeds neither. Pneuma
  Field's `AFLifeSteal` write is why `lifeSteal` is a field of the record.

`getAbilityStatSteps()` emits one step per ability or enchantment that writes a stat, and
`deriveUnitStats` splices those into the sequence region by region. Nothing is bucketed or
summed on the way in, so an ordering finding lands as a step move. An ability whose flat half
sits there and whose attack-type-conditional half sits in `deriveUnitStats` appears as two
steps sharing a name — `lionheart` and `lionheart:rangedHp`, `weakness` and `weakness:ranged`.

A bonus never conjures an attack slot the unit does not have, so an ability step skips a write
to a dead slot — which is also the aura pass's own gate, "add the aura value to defense and
resistance, and to melee/ranged **when the corresponding base attack exists**". **Blaze of
Glory's armor-to-melee transfer is the deliberate exception**: it lands on a unit with no melee
attack, so it is not built as an ability step, and it widens the slot for the final clamp.

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
6. add Bless;
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

### Warp Creature ordering

Warp Creature reduces rather than adds, so unlike an additive modifier its *position* is
observable — and it is the sharpest divergence between the engines. Every one of them runs the
block inside its stat recompute, in the order Attack → Defense → Resist, with Shatter
immediately after; what differs is **what each engine still writes afterwards**:

| Engine | Address | Written after it, at full value |
|---|---|---|
| MoM 1.31 / CP 1.60 | `0x90A63`–`0x90AC9` | Shatter, then the terminal clamp — nothing else |
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
every `ranged_type >= 100` attack — thrown, breath and both gaze forms — only the Veteran step,
which is the ladder's `thrown` column. MoM's level routine has no such gate, so both gaze forms
take its full `ranged` column there. CoM2's gaze ladder is still unread — see
`Reference docs/MoM CoM binary verification queue.md`, D21.

Warlord scoring options that affect a unit are represented as per-unit encounter inputs:

- **Uphill Battle:** checking the option on an AI-controlled unit fighting the human player
  grants that unit +10% To-Hit, +10% To-Defend, and +1 Resistance in phase b.
- **Gods Play Dices:** the per-unit numeric input records the Resistance modifier already
  rolled at combat start, clamped to an integer from −2 to +2. It is fixed for the combat
  calculation and is applied in phase b; it is not folded into the damage distribution.

Note that `rtb` carries ranged, thrown **and** breath, distinguished by `rangedType`/`thrownType`.
Breath has no stat of its own, so Explosive's fire-breath doubling reads the `rtb` field gated
on the attack type.

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

Tracked as M1–M8 in [BACKLOG.md](./BACKLOG.md), §5, which records for each whether it is accepted
or deferred work. The descriptions below are the canonical ones.

- Life Steal's *displayed* distribution is an approximation (phase count × single-firing
  distribution); the displayed **expected value** is exact.
- Damage is capped at the target's remaining HP; overkill is not tracked.
- Destruction is currently modelled only for CoM2/Warlord. The MoM/CP/CoM1 touch dispatcher also
  identifies Destruction as a Chaos effect; in MoM/CP, Elemental Armor and Resist Elements
  therefore protect against it. That older-engine Destruction path is not yet implemented.
- The calculator has one ranged/thrown/breath slot. Bombs&Grenades can add to an existing
  Thrown attack, but cannot simultaneously display its granted Thrown attack alongside an
  independent ranged or breath attack on the same unit. Faithful for MoM and CoM 1, which share
  one `.ranged` field, but wrong for `Caster.exe`, which holds four separate channels — 29 Warlord
  roster units carry more than one and lose an attack on load. Being replaced by BACKLOG item R3.
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
