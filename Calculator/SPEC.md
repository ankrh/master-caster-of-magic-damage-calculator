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
| `com2_warlord_1.5.12.5` | Warlord 1.5.12.5 |

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

Touch attacks, Life Steal and Immolation ride along with whichever phase fires them
(thrown, gaze, melee, or ranged), gated per version.

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

Callers must not recompute effective stats themselves.

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

- Life Steal's *displayed* distribution is an approximation (phase count × single-firing
  distribution); the displayed **expected value** is exact.
- Damage is capped at the target's remaining HP; overkill is not tracked.
