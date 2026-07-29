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
6. Modifiers apply in a **base stage** followed by **four encounter phases**.
   The encounter phases mirror the engine's two stat-calculation hooks and the fact that
   each runs code in two places:

   | Phase | Where it runs | How a modifier is assigned to it |
   |---|---|---|
   | **base** | raw unit stats and permanent writes before combat | verifiable: roster data, creation, overland, or cast handler |
   | **a** | precalc, in the binary | not inspectable — inferred |
   | **b** | precalc, in `UnitCalcPre.CAS` | verifiable: grep the file |
   | **c** | magic calc, in the binary | not inspectable — inferred |
   | **d** | magic calc, in `UnitCalc.CAS` | verifiable: grep the file |

   Plus one tail bucket, **`warpLate`** — the part of `c` that CoM 1's recompute writes after
   Warp Creature. See *Warp Creature ordering* below; empty in every other version.

   The hooks are declared in `MODDING.INI [Scripts]`: `UnitRecalculateEarly=UnitCalcPre`,
   `UnitRecalculate=UnitCalc`, `UnitRecalculateEnabled=1`. Base CoM2 sets that last flag to
   `0` and ships `HALT;` stubs, so **base CoM2 and MoM have no b or d at all** — every
   modifier in those versions is a or c.

   The consequence that is easy to get wrong: **b runs before c**. A Warlord CAS effect in
   the early pass lands *before* base-game spells, not after.

**Which script file implements an effect decides its phase.** Game-fiction wording ("combat
enchantment", "trained in the city") does not. A modifier is classified by, in order:

1. Grep the identifier across `Reference docs/Script source/Warlord 1.5.12.6.2/*.CAS`.
2. In `UnitCalcPre.CAS` → **b**; in `UnitCalc.CAS` → **d**. (`DisAbil.CAS`, `DisInfo.CAS`,
   `AIRes.CAS` and `EnterGame.CAS` are display and AI only — ignore them.)
3. A raw unit stat, or a value written permanently into the unit's base before the pipeline
   runs — `CreateUnit.CAS`, `OverlandEndTurn.CAS`, or a cast handler writing index 1 (`ABase`)
   in `OLSpell.CAS` — → **base**.
4. No CAS implementation → binary: intrinsic ability or retort → **a**; spell, curse,
   enchantment or node aura → **c**.

Only step 4 is judgment; steps 1–3 are checkable, which is the point. `holyBonus`,
`resistanceToAll`, the Guardian retort and Tactician's binary grant rest on step 4 alone and
should be treated as provisional.

Every stat total in `deriveUnitStats` is built as a `{ base, a, b, c, d, warpLate }` object
rather than one flat sum — `atk`, `def`, `res`, `hp`, `rtb` — and `sumPhases()` re-adds them.
(`warpLate` is the tail of `c` described under *Warp Creature ordering* below; it is empty in
every version but CoM 1.) The `base`
bucket contains the raw base plus additive writes that were baked into `ABase`; phase `a`
contains encounter-time binary precalculation such as level and weapon bonuses, city walls,
intrinsic abilities, Guardian, and Tactician. The split is arithmetically inert on its own;
its purpose is to give effects that *scale* a stat a defined input, namely the subtotal visible
at their own point in the pipeline. `getAbilityStatModifiers()` returns the same split as
`abilMods.base/a/b/c/d`, with `abilMods.<stat>Mod` as their sum.

Effects that scale rather than add, and the subtotal each must read:

- **Xenoveterinary**, +25% HP (minimum +1) — phase b (`UnitCalcPre.CAS:1038-1049`), so it
  reads `base+a` and does not compound Lionheart, Endurance or Charm of Life, which are c.
- **Colossal Strength**, +1 + 40% of melee / physical ranged / thrown — phase d
  (`UnitCalc.CAS:1227-1243`) and it reads `GetStat` there, so it scales base+a+b+c plus the
  phase-d terms that precede it in that file (Rust, Focus Magic, Weakness's breath penalty).
- **Upgraded Explosive's fire-breath doubling** — phase b (`UnitCalcPre.CAS:1074-1078`);
  it doubles the `base+a` subtotal plus earlier phase-b additions.
- **Psycho Force** and **Pneuma Field** read *current* resistance and are meant to see every
  earlier modifier, so they must not be hoisted earlier.

### Warp Creature ordering

Warp Creature reduces rather than adds, so unlike an additive modifier its *position* in the
sequence is observable — and the engines disagree about it. MoM applies it last, after every
other write. **CoM 1 applies it near the front of its recompute** and keeps writing stats
afterwards: Darkness, Supreme Light, the Tactician retort and Eternal Night's non-Death
resistance penalty all land at full value on top of the reduced stat. Prayer and High Prayer
are *not* among them — both engines run those ahead of even CoM 1's early Warp.

Phase `c` is one bucket and cannot express "early in c" versus "late in c", so it carries a
tail: **`warpLate`**, the sixth key in `DERIVATION_PHASES`. A modifier is written into exactly
one bucket — `getAbilityStatModifiers` picks `warpLate` instead of its normal phase when the
version is CoM 1 — so nothing is ever added and then subtracted back out; which bucket a term
lands in *is* the ordering. `sumPhases()` with no keys still totals the finished stat;
`sumPhases(phases, ...PRE_WARP_PHASES)` names the subtotal Warp reduces, the same idiom the
scaling effects above use. Outside CoM 1 `warpLate` is empty and the totals are unchanged.

`deriveUnitStats` therefore ends in an explicit sequence, in recompute order: the pre-Warp
subtotal (times Berserk, plus Blaze of Glory) → Warp → Beat of Swiftness and Hierophany →
Shatter's cap → the `warpLate` tail → clamp to ≥ 0. Shatter precedes the tail because CoM 1
writes it at `0x907DC`, ahead of Darkness, Supreme Light and Tactician, so a Shattered CoM 1
unit under Supreme Light attacks at 3, not 1.

CoM2 and Warlord are a different engine and nothing has been read from `Caster.exe` about their
ordering, so they inherit MoM's shape rather than CoM 1's. Same for the two other consequences
of CoM 1's early Warp: that it halves a gaze's strength (the gaze shares the `.ranged` slot and
CoM 1's halving has no attack-type test), and that CoM 1's level ladder gives every
`ranged_type >= 100` attack — thrown, breath and both gaze forms — only the Veteran step, which
is the ladder's `thrown` column. MoM's level routine has no such gate, so both gaze forms take
its full `ranged` column there. See `Reference docs/MoM CoM binary verification queue.md`, D21.

Warlord scoring options that affect a unit are represented as per-unit encounter inputs:

- **Uphill Battle:** checking the option on an AI-controlled unit fighting the human player
  grants that unit +10% To-Hit, +10% To-Defend, and +1 Resistance in phase b.
- **Gods Play Dices:** the per-unit numeric input records the Resistance modifier already
  rolled at combat start, clamped to an integer from −2 to +2. It is fixed for the combat
  calculation and is applied in phase b; it is not folded into the damage distribution.

Note that `rtb` carries ranged, thrown **and** breath, distinguished by `rangedType`/`thrownType`.
Breath has no stat of its own, so Explosive's fire-breath doubling must operate on the `rtb`
phase subtotals gated on the attack type.

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
- **Magitek Science:** derived Armorclad and Battle Armor units gain Resist Magic.
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

Tracked as M1–M6 in [BACKLOG.md](./BACKLOG.md), §5, which records for each whether it is accepted
or deferred work. The descriptions below are the canonical ones.

- Life Steal's *displayed* distribution is an approximation (phase count × single-firing
  distribution); the displayed **expected value** is exact.
- Damage is capped at the target's remaining HP; overkill is not tracked.
- Destruction is currently modelled only for CoM2/Warlord. The MoM/CP/CoM1 touch dispatcher also
  identifies Destruction as a Chaos effect; in MoM/CP, Elemental Armor and Resist Elements
  therefore protect against it. That older-engine Destruction path is not yet implemented.
- **One phase term is not cleanly attributable: `fbRtbMod`.** It merges Flame Blade / Metal
  Fires (binary, phase c), Warlord's permanent Fiery Blade (also binary, phase c), and
  Warlord's Fiery Fury (`UnitCalcPre.CAS:832-846`, phase b) through a non-additive `Math.max`,
  since their shared ranged bonuses supersede rather than sum. It is booked wholly to c, its
  dominant source. Separating them means restructuring how they supersede.
- The calculator has one ranged/thrown/breath slot. Bombs&Grenades can add to an existing
  Thrown attack, but cannot simultaneously display its granted Thrown attack alongside an
  independent ranged or breath attack on the same unit.
- The Lava Smelter control records one mineral-pair grant at a time. The Warlord scripts
  evaluate all five mineral pairs independently, so a unit can carry several simultaneous
  grants when three or more qualifying minerals are available.
