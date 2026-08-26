# Damage Calculator — Specification

What the calculator must do and hold true.

**This file does not state what an individual ability, enchantment or effect does.** That is engine
behavior, and its single home is the `PROVENANCE[id]` citation beside the implementing step, which
`npm run provenance` checks against the reconstructions. To change an effect, read the sources that
citation names — routing to them is in the root [CLAUDE.md](../CLAUDE.md). A prose summary here
would be a second, unchecked copy, and the only tiebreaker on drift would be which copy the reader
happened to open.

What lives here instead: the calculator's scope, its computation and derivation architecture, its
input/output contract, the points where it deliberately departs from the engine, and its invariants.

Working conventions — tooltip style, `ABILITY_DEFS` ordering, how a step's phase is classified, how
to run the tests — live in [CLAUDE.md](./CLAUDE.md).

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
  never rolls to see whether the target resisted the spell in the first place. The one
  exception is an immunity that makes the roll unwinnable — see *Deliberate deviations*,
  *An immunity strips the curses it blocks*.

  Two adjacent things *are* in scope and must not be confused with this:
  - Resistance **granted or imposed by an effect that has landed** — a +4 bonus against a realm,
    a curse's −2 Resistance — modifies the unit's Resistance stat and is fully modelled.
  - Resistance rolls that are part of an **attack** — Poison Touch, Stoning, Death
    Gaze, Life Steal — are attack mechanics, not spell-landing mechanics, and are
    modelled exactly.
- **Hero equipment.** The three item slots and the item-power flags they write are not an input.
  This is what puts the DOS engines' two per-channel attack-attribute words out of reach: a
  unit-type record cannot set a bit in either — `Load_Battle_Unit`'s import window closes before
  them and zeroes them — so an equipped item is their only source
  (`Reference docs/DOS reconstructed/R6.1h.evidence.md`). Every DOS attacker the calculator can
  express therefore carries both channel words empty, which is what each consumer of one reads.
- Multi-round combat, unit positioning, movement, morale, or army-level resolution.
- Overland play: economy, research, diplomacy, AI.
- Healing and regeneration between rounds, or post-combat effects. Immediate in-call
  self-healing during attack resolution is in scope.
- Active spellcasting, mana consumption, ammunition consumption, or summon resolution. A derived
  spell name and charge count may be reported as unit metadata when they determine a modelled unit
  package; they do not add an attack phase by themselves.
- Movement changes other than Haste, transport behavior, and overland-only effects.

## Out-of-range values stop the run

**A value outside its expected set must halt the code with an error. It must never be replaced by
a fallback.** This governs every layer — INI and roster parsers, the generators, id-to-class maps,
version dispatch, table lookups, and any read of a field the sources define by enumeration.

The reason is that this calculator's output is a number that looks correct whatever produced it. A
fallback does not degrade gracefully; it manufactures an answer indistinguishable downstream from a
derived one, and the wrongness surfaces only as damage figures nobody can trace. The worked example
is `RangedType`: roster generation classified any unmapped projectile id as `Missile`, so five
Warlord units carrying ids the map had never been given — Stone Giant, Colossus, both Gaia Lords and
the Goblin Midget Submarine — silently became missile attackers. The engine's `Ismissileranged`
reads the table flag directly, so Missile Immunity zeroed attacks the engine lets through, and both
Blazing March and Elven Wind applied where they should not. Nothing failed; the numbers were just
wrong, for as long as the map was incomplete.

An error raised here must name the offending value, the record or file it came from, and what set
was expected, so the reader can go to the source rather than guess.

**A default the sources define is not a fallback.** `Hit=30` is the engine's stated base To Hit, and
reading a missing `Hit` key as 30 is transcription. The distinguishing test is whether a cited
source supplies the value: if it does, it is data; if the code picks something plausible because the
real answer is unknown, it is a guess wearing a default's clothing, and it is forbidden. When a
source genuinely leaves a case undefined, that is a finding for `BACKLOG.md`, not a value to invent.

Widening an enumeration is a deliberate act with evidence behind it. Failing loudly is what forces
that act to happen instead of being skipped.

## Versions

Five rule sets, selected by `#gameVersion`, are first-class and independently correct:

| Id | Label |
|---|---|
| `mom_1.31` | MoM 1.31 |
| `mom_cp_1.60.00` | MoM CP 1.60 |
| `com_6.08` | CoM 6.08 |
| `com2_1.05.11` | CoM2 1.05.11 |
| `com2_warlord_1.5.12.7` | Warlord 1.5.12.7 |

Rules:

- **Warlord is its own version, not a flavour of CoM2.** A statement about "CoM2" does
  not automatically hold for Warlord.
- Version differences must be modelled where they exist, including **faithfully
  reproducing original-game bugs** where the version has them.
- A version's roster comes from its own `units_<version>.js`; `mom_1.31` and
  `mom_cp_1.60.00` share `MOM_UNITS_DATA`.
- Abilities and enchantments not present in a version must be **hidden from the UI and
  inert in the result**. A hidden control must never influence a computation.
  The invariant is about the *effect*, not the read: an expression may evaluate out of scope
  provided nothing it reaches can move a number. Two shapes satisfy it and are settled, so a
  gating census must not re-flag them (the disposition names are the census's,
  [Version gating census.md](../Reference%20docs/Version%20gating%20census.md)):
  - **step** — the read's only consumer is an `abilityStep(...)` whose step id carries a
    `STEP_VERSION_SCOPES` entry. `filterStepsToVersionScope` drops the step before it executes,
    and that entry is the fact's one cited home. A `COMBAT_VERSION_SCOPES` entry restating that
    same write's scope would be a second home for one fact; an entry naming a *different* engine
    write of the same named effect, with its own citation and its own version set, is not
    (`resolution:blazingMarchMagicWeapon` is CoM 1's `Weapon_Plus1` block, beside the
    `c:blazingMarch` attack bonus at `SCOPE_COM_PLUS`).
  - **adjacent** — an exact version test stands in the same expression as the read
    (`!!(abilities && abilities.focusMagic) && version.startsWith('com')`). That is a gate.
    It does not have to become a `COMBAT_VERSION_SCOPES` lookup.

  Which of the two remaining homes a gate takes is decided by **whether an exact version test can
  stand in the same expression as the read**, not by derivation-time versus resolution-time
  (settled by F157). A derivation-time read is lexically inside `deriveUnitStats`, where `version`
  is a local binding, so the adjacent form is always available and is checkable without leaving
  the line — `metalFiresActive` (`stats.js`) and Eye of Heaven (`stats.js:700`) both take it.
  A read inside a helper shared by several engines has no version literal in reach —
  `dosDefenseForAttack` serves all three DOS builds, and its melee arm needs *two* different
  scopes in one expression — so the fact needs a named, cited home. That is what
  `COMBAT_VERSION_SCOPES` is; its `resolution:` prefix does not acquire a `derivation:` sibling.

  A read whose **key** is a variable takes neither shape: one expression stands for every key it
  can receive, so no version test on that line can be right for all of them, and no source scan can
  even say which effect it reads. Such a read needs a **per-key** routing table, mapping each key
  the site can receive either to a `COMBAT_VERSION_SCOPES` id or to a stated `null` meaning no
  engine distinguishes that key's presence. `TOUCH_KEY_SCOPE_IDS` (`combat_effects.js`) is the one
  today, for the seven touch riders; its key list is asserted against `PLACED_TOUCH_KEYS`, so a
  rider cannot be added without stating its scope, and `touchKeyInVersion` throws on a key the
  table does not name rather than assuming every version. The scope and its citation still live in
  `COMBAT_VERSION_SCOPES`; the routing table only says which id a key takes.

## Computation model

- **Exact probability, never simulation.** All results come from closed-form binomial
  distributions and convolution. Monte Carlo is prohibited.
- Attack resolution is `Binomial(attackStrength, toHit)` hits against an exact defense-block
  distribution, per attacking figure. The DOS engines use `Binomial(defenseStrength, toBlock)`.
  CoM2 and Warlord convolve two independent binomials, because their defense roll changes
  probability after a fixed die count: the early dice use ordinary To Block and the later ones the
  lower of that and a capped chance. Both bounds are loaded runtime settings.
- Excess damage past a figure's HP **rolls over** to the next figure with a fresh
  defence roll. Area damage does **not** roll over — excess beyond a figure's HP is lost.
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

Correlated state is never replaced by an expected value. Where an attack heals its source or
alters its remaining-HP capacity, later calls in the same exchange read the exact prior outcome,
and the displayed damage, healing, survivor and destruction distributions are marginals of those
executed paths rather than reconstructions from a static phase count.

## Combat resolution contract

`resolveCombat(a, b, opts)` is the single entry point. It returns per-side total damage
distributions, remaining/total HP, live figure counts, version-appropriate Life Steal
distributions and benefit, and — for melee — an ordered `phases` breakdown for display.

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

Each phase in steps 1–4 is dealt before the next phase reads living figures, as is an admitted
First Strike. The remaining calls run main, Haste, counter before their pending damage is dealt in
main, counter, Haste order. Immediate self-healing follows the call order and is visible to later
calls, while none of them sees another call's still-pending damage.

**Ranged:** attacker shoots, no counter-attack, no fear phase.

**Fear presentation.** The modern phase breakdown exposes one feared-figure PMF for each melee
call, labelled Main or First Strike, Haste, and Counter as applicable, because each call performs
its own rolls. Each PMF uses the exact living-figure state at that call, including immediate
healing from an earlier call but excluding still-pending damage. CP 1.60 and CoM 6.08 retain their
shared Haste sample and combined Cause Fear row; MoM 1.31 retains its silenced-defender/self-fear
bug presentation.

**Gaze structure.** A gaze is one attack with two independently-bounded parts. The *kill rolls*
are one resistance roll per **defending** figure, resolved once per attack regardless of the
attacker's figure count. The *hidden conventional component* is rolled once per **attacking**
figure. Getting those two bounds backwards is the classic error here. The hidden component exists
only in the DOS engines, which pack a gaze into the same strength/type slot they use for ranged,
thrown and breath; CoM2 and Warlord carry independent gaze fields with no attack-strength slot, so
there is no hidden component to model for them. Doom damage takes the **attacking**-figure bound
in the DOS engines, where it is that same slot delivered rather than rolled, and a fixed bound of
one in CoM2 and Warlord, whose Doom Gaze is a field of its own. A gaze's realm follows its type,
not the attacker's, and that realm is what the defence specials key off.

**Combat unit state.** In addition to total Damage Taken, unit state carries Irrecoverable/
Irreversible Damage and Undeath Damage; modern builds also carry Base Bonus HP per figure and No
Healing, where DOS builds use the same numeric slot as temporary Extra Hits. These are exact
internal state, not starting-state inputs — see *Deliberate deviations*. The result panel reports
each side's mean post-combat Irrecoverable/Irreversible Damage, Undeath Damage, and Bonus HP/Extra
Hits per figure from the correlated final-state paths.

**Immunities skip rolls where the engine skips them.** An immunity the engine enforces at the
*consuming* site **skips its roll outright** and is never restated as a large resistance bonus.
An immunity the engine enforces as a bonus inside its resistance transform is a **step of that
transform**, not an addition at the consumer: the same value is both the roll's pass/fail
threshold and the margin a failed roll returns, so a bonus applied only to the test would be
spent as damage. One effect can be both — DOS Magic Immunity skips the touch/gaze group and
bonuses Cause Fear. Genuine resistance *bonuses* against these effects are realm-scoped and are
ordinary modifiers.

**Combat-global state.** Chaos Conjunction is one combat-global state affecting both sides. It is
not owned by either unit or army, so Swap leaves it in place, and it is hidden and inert in the
versions that lack it.

## Stat derivation contract

`deriveUnitStats(input)` is the single place raw inputs become effective combat stats.
Callers must not recompute effective stats themselves, and must not decide values the engine
decides on the way in. The `ui_*.js` layer reads a control, names a calc key and passes a value;
the rules that turn several controls into one input — how sources of one effect combine, and the
DOS record's shared special-value byte — are derivation-layer functions with `PROVENANCE`
citations and Node coverage.

### Identity

Each unit carries a version-scoped **source identity** (`templateId`, `heroTypeId`) separately from
its editable **base identity** (`isHero`, `baseRace`, `baseFantastic`). Predefined roster units
retain their source IDs; custom units use null IDs. Every derivation seeds a **calculated
identity** — the record's `race` and `fantastic` fields — from the corresponding base fields, and
the version-scoped identity conversions rewrite them at their own positions in the one sequence.

Template-based states such as Chosen or Golem are **predicates derived when needed, never persisted
booleans**. Display names are never engine predicates. Identity writes are version/template gated;
a no-op identity write is omitted from the trace like any other, and the rest stand in the one
ordered trace beside the numeric writes, while source and base identity fields remain
controls/metadata.

**Every identity conversion is one atomic step writing `race`/`fantastic`, and the compact
`unitType` token is a read-only compatibility projection.** No conversion reads it, no step writes
it, and nothing downstream rewrites it: a rule that consulted the token would fuse realm and
Fantastic back into one string and lose distinctions the engine keeps — a hero with a realm is the
case the token cannot express.

The card exposes `Hero`, `Fantastic`, and `Base race / realm` as independent editable custom-unit
controls; no combined user-facing `unitType` control is authoritative. The version-gated `Special
unit` selector exposes named exceptions without exposing numeric template or hero IDs. Predefined
roster units populate and lock all identity controls. A named special-unit effect is shown at its
ordinary point of use.

**The special-unit vocabulary is one list in the computation layer, and the identity boundary
halts on a key outside it.** Every consumer is an equality test against a defined key, so an
undefined one would derive an ordinary unit and report nothing (*Out-of-range values stop the
run*); the page builds the selector and its version scope from the same list, so neither scope can
offer or accept a key the other does not know. Version scope keeps its clamp: a defined key the
selected version disallows becomes `none`. Which roster template carries which key is one function
in the same layer, so the stored identity and the selector cannot disagree about it; a template
earns a key in the versions whose engine makes the exception, not in every version whose roster
holds that template.

### Order

Order is load-bearing:

1. Every stat modification is a **step** in one ordered sequence over one mutable unit record.
2. Stat modifiers, level bonuses, weapon/armour bonuses are steps in that sequence like any other.

**A write the engine makes at a position belongs at that position, not hoisted ahead of the
sequence.** No engine has a preparatory phase: Chaos Channels' demon-skin armor increments Defense
and assigns `U.race`/`U.Fantastic` in one block at `$0059F4A3`, `CreateUnit.CAS` writes a
building's stat and its ability grant in one branch, and the weapon-material To-Hit tail tests
`not B.Fantastic and not B.ishero` inside the weapon block at `$0059E2B8`. One thing still runs
before the sequence anyway — the building and enchantment ability grants — and it is a departure
recorded under *Deliberate deviations* and scheduled for removal, **not the intended design**;
nothing new may join it.

**`race` and `fantastic` are ordinary record fields.** The identity conversions are steps of the
one sequence at their own chain positions, so a gate reading the calculated identity reads
whatever stands in the record where that gate runs, exactly as it reads `u.res`. Three named
values carry the identity across the sequence boundary and no others may: the record the
recalculation *leaves*, for combat resolution and for the two cast-time targeting classes; its
compact projection; and a sample taken at a named chain rank, for the two engine facts the
derivation publishes as result fields rather than record fields. Each occurrence is declared, and
an undeclared one halts (`tools/unit_checks/identity_record_choice.js`).
The compact `unitType` value is projected from the live identity fields wherever a reader still
takes the token, so base and live predicates stay separately available to every gate.

### The step model

A step names the stats it writes and may read any stat's *current* value; list order is execution
order. Additive, scaling, replacing and short-circuiting effects are all the same shape, because
the engine makes them all the same way — a write to a field at a point in a sequence. The
machinery is `steps.js`; the sequence itself is `stats_sequence.js`, one function per engine
region, run by `deriveUnitStats`.

**One sequence, one record — not a list per stat.** The record holds every unit field a step
writes. An effect the engine makes as one write to several stats is one step here too. Shredding
such a finding across per-stat lists on the way in is what this model exists to prevent: the
binary yields orderings as effects in address order, each writing several stats, and the list is
isomorphic to that.

**There is no subtotal-read mechanism, and none is needed.** A step reads whatever field it needs
at its own position — `u.res`, not a named subtotal — exactly as the engine does. Effects that
scale rather than add reduce to a plain field read once they stand in the right place.

**The permanent record is the second record a step may read, and it is not a snapshot of
convenience.** The engines keep `BaseUnits` beside the calculated record and each gate chooses per
site which one it tests, so the model keeps both. Every permanent write is a `base`-phase step, so
the record as that phase leaves it *is* the permanent record for everything after it, and a later
region reads it through `ctx.base`. A step that reads it says so; every other read is the live
field at the step's own position. **"Everything after it" is not an intra-pass claim.** A permanent
write persists into `BaseUnits`, and the calculator derives the landed steady state, so a permanent
read takes it even where the engine makes the write later in the same recalculation than the region
doing the reading — Destiny writes `B.Fantastic := True` at `$0059A390`, after the `UnitCalcPre.CAS`
hook at `$0059A002` whose region-`b` blocks read `BASEFANTASTIC(U)`, and every recalculation from
the next one on sees it there (F192).

**Which record a gate reads is read off its own block, never deduced from its region.** Four
things follow, each of which a wrong reading has already cost numbers.
- A block that tests the permanent record takes it however late it stands; a block that tests the
  calculated one takes the record at its own position however early. Both records are live at every
  position, and one block can test both — Breakthrough admits on
  `(not U.combatsummoned) and (not B.Fantastic)` at `$005A376D`, one term per record in one test.
- **A live read can be standing in for a term the block states separately**, so read the whole
  gate rather than the term alone. True Light and Poor Vision both test the Undead **flag** beside
  the realm, and the flag is what gives an Undead unit its arm at a region-`b` position where the
  realm has not been converted yet.
- **A term whose engine counterpart is a cast-time *targeting* restriction has no position, and
  the record it wants is the one the recalculation leaves.** Rust's and Shatter's blocks test their
  enchantment flag alone, so the "regular unit" each helptext names is the spell's target class,
  not a term of any block. Spirit Link is the citation and states the mechanism outright: it
  asserts Fantastic at the head of the routine so the unit takes fantastic bonuses, and clears it
  at the tail so the "enchanted fantastic unit could not be targeted by fantastic-only spell"
  (`UnitCalc.CAS:1305-1306`) — the engine manipulates the recalculated flag *in order to* change
  targetability.
- **A hero test is not an identity read and must not be spelled as one.** Nothing writes the hero
  flag during recalculation, and every block that branches on hero-ness asks for it directly —
  `if U.ishero`, `_UNITS[].Hero_Slot >= 0`, `ISHERO(U)`. Reading it off the compact `unitType`
  token instead lets any Fantastic conversion answer the hero question, because that token carries
  only one of the two facts at a time. Which *units* a gate covers stays a separate question from
  which *record* it reads.

`getAbilityStatSteps()` emits one step per ability or enchantment that writes a stat, and
`deriveUnitStats` splices those into the sequence region by region. Nothing is bucketed or summed
on the way in, so an ordering finding lands as a step move. An effect whose attack-strength half
needs a per-channel modifier that builder never receives is hand-written in `stats_sequence.js`
instead, as one step covering the whole write.

**An id is the effect a player selects, and carries no qualifier the key already states.** The
`phase:id` key places a write and `STEP_VERSION_SCOPES` says which engines make it, so neither the
version nor the region belongs in the id: one enchantment writing in two regions of one engine is
`c:weakness` and `d:weakness`, and one writing in different regions of different engines is
`b:trueLight` and `c:trueLight`. A step's `writes` already names the fields it reaches, so the
field does not belong there either — a melee bonus and the attack-strength bonus of the same
engine write are one step, not two. The one surviving qualifier marks an effect making **two
separately cited engine writes** that `phase:id` cannot otherwise tell apart: two non-adjacent
positions inside one region (`base:zombies` beside `base:zombies:toBlock`, and
`c:chaosChannels:fireBreath:recompute` for MoM 1.31's second `BU_Apply_Specials` call); and the
five `:race` identity conversions, each of which is a separate write of the same effect rather
than the same write seen twice — `c:mysticSurge:race` is the No Heal normalization block at
`$005A0420`, gated on `EncNoHeal` and shared with Raise Dead, where `c:mysticSurge` is the block
at `$005A016D`; `b:fieryFury:race` is the THEN arm of the one `IF (BASEFANTASTIC(U))` whose ELSE
arm is `b:fieryFury`; the Chaos Channels breath block writes its realm whenever the mutation is
present while the calculator's strength half asks additionally whether a channel slot is free; and
`c:chaosChannels:armor:race` and `c:blackChannels:race` are chain-adjacent to their stat siblings
for a reason of the calculator's, recorded under *Deliberate deviations*. **A To-Hit write is
not a second position.** Where one block writes strength and To-Hit it is one step, whatever the
engine's interleaving inside it — the fields are disjoint and the gates order-invariant, so the
grouping is unobservable. Sequence composition, the chains and the
scope table all key on `phase:id` alike, so two writes of one effect stay distinct without a
qualifier.

**A per-field source label is not a reason to keep a split step.** A merged step carries one
label, and that costs nothing a reader can see: each To-Hit and To-Block quantity is projected
into its own trace, so two fields of one step never stand side by side in one tooltip, and a label
naming the field only restates the output it already hangs under. The record's stored per-attack
To-Hit thresholds and its To Block are therefore one step, `base:baseThresholds`, labelled
`Base To Hit / To Block`. What does split a seed is a **narrower citation**: the modern common
`hitchance` field keeps `base:baseHitChance` because a scope row is per `phase:id`, so a field
three of the five engines have no record for cannot ride along inside a five-version step.

A bonus normally never conjures an attack slot the unit does not have, so an ability step skips a
write to a dead slot. Whether the melee slot is live is the **permanent** record's melee field,
read through `ctx.base` — which every compiled melee-presence gate tests and which the `base`
phase, not the card's input, settles. Source-backed exceptions exist; each is marked at its step
rather than folded into the general rule.

**The dead-slot rule is a per-write gate, and no attack strength has a terminal pass behind it.**
The recompute's tail is six floors of one shape — `if U.attack < 0 then U.attack := 0` and its
Defense, Ranged, Thrown, Fire Breath and Lightning Breath neighbours
(`Units.RecalculateUnits.pas:2482-2487`), matched by `if (bu->melee < 0)` / `if (bu->ranged < 0)`
over the DOS engines' melee and shared bytes (131:0x90B1F, 131:0x90B2F) — not a zeroing of a slot
whose permanent record held 0. What a bonus does is settled entirely where it is written. A block
that carries no presence test of its own therefore *creates* the attack: all 53 `SETSTAT(<unit>,SAttack,…)` writes
in the Warlord 1.5.12.7 script source are ungated, and three of them gate their own secondary
channels in the same breath (Rust `UnitCalc.CAS:495`/`:499`, Colossal Strength `:1233`/`:1235`,
Vampirism `:1251`), so the silence on melee is deliberate. Script-sourced melee writes are modelled
ungated for that reason; the compiled blocks that do test `B.attack > 0` keep it, per-site
(F142).

The consequence that is easy to get wrong: **an ungated write is expressed by not asking the
predicate, never by widening it.** One predicate serves every melee gate in a run, so widening it
for a unit un-gates the compiled blocks too — which is measurably wrong, since their gate reads
the permanent record the script write never touched. Which slots a record carries at all is a
separate question, settled where the record is built rather than at the floor (F122, F135).

**A step may name its own block's gate instead of that rule.** The dead-slot rule is an
abstraction over what the engines actually test, and where a block's own test is transcribed the
step names it and the abstraction does not apply. Naming one is the stronger claim and needs the
address; the general rule is what a step falls back to.

Two engines reach the secondary-attack slot differently, so a step's `apply` names which gate it
writes through:

- **`rtb`** — the DOS engines' shared slot under the dead-slot rule. One write reaches conventional
  ranged, Thrown, Breath and both gaze strengths alike.
- **`rangedTyped` / `rangedStrength` / `rangedUngated`** — that same shared slot under one block's
  own transcribed test on it: the `ranged_type` sentinel, the byte's live strength, or no test at
  all. One byte holds the ranged strength and both gaze strengths in the DOS record, so each of
  these writes the strength field and the record's gaze mirrors of it together — one field, one
  gate. Which gaze mirrors a record carries is the same type fact the region-`e` floor asks, not a
  strength test: a gaze template shipping strength 0 still has its gaze.
- **`ranged`** — the modern engines' conventional ranged attack *only*. Thrown, both Breaths and
  the gazes are separate fields there, so a bonus written to `ranged` never reaches them.

The modern engines' independent Doom Gaze field is a view of no attack slot, so it has no gate:
a write reaches it only from a block that names it, and such a block writes it directly (F143).

### Phases

Each step carries a **phase**: which region of the engine makes that write. Phase is a provenance
label — it records where the evidence for the write was found and orders nothing, because the
execution chain below does that. How a step is assigned to a phase is a working convention and
lives in [CLAUDE.md](./CLAUDE.md).

| Phase | Where it runs |
|---|---|
| **base** | raw unit stats and permanent writes before combat |
| **a** | precalc, in the binary |
| **b** | precalc, in the early script hook |
| **c** | magic calc, in the binary |
| **d** | magic calc, in the late script hook |
| **e** | the binary's post-hook tail: the clamps, the aura pass, and the effects after them |

The two script hooks run only where the version enables them, so **base CoM2 and the MoM builds
have no b or d at all** — every modifier in those versions is a or c. The consequence that is easy
to get wrong: **b runs before c**, so a Warlord early-pass effect lands *before* base-game spells,
not after.

**`base` is ordered, and its order is not arbitrary.** The phase holds five kinds of write and the
chain runs them in this order: template initialization; training-time writes (`CreateUnit.CAS`,
one-shot when the city builds the unit); cast-time permanent writes (`OLSpell.CAS` and the other
grant sites, one-shot when the spell landed); per-pass permanent writes; and last the artificial
immunity strip, which has no engine position of its own. The calculator derives the landed steady
state, so a permanent write is modelled as already applied at the head of the chain. Every `base`
chain entry names its kind, so composition enforces this order instead of a comment describing it.

**A permanent step may occupy both the head position and its engine position only if it is
idempotent.** `Units[i] := BaseUnits[i]` ($00599A8D) resets the calculated record every pass while
`BaseUnits` is never reset, so a per-pass permanent write must be idempotent or the base record
drifts without bound — Destiny's five writes are all assignments for that reason. Every accumulating
permanent write is one-shot instead, and a one-shot step that also held an in-chain position would
apply its delta twice. Composition rejects that pair rather than trusting the classification: a
one-shot `base` step and a step of the same id at a non-base position may not write a field in
common. It is the *emitted* pair that decides it, not the chain, because sharing an id is normal —
`b:spiritLink` and `d:spiritLink` stand beside the one-shot `base:spiritLink` but write `fantastic`,
not its permanent `res`, and `base:rebuild` and `b:rebuild` are the same `+2/+2` at the position
each branch makes it, non-hero permanent against hero re-application, so exactly one is ever
emitted.

**One write reached by several guarded routes is one step at one position.** Where an effect has
more than one entrance and each site is guarded on the marker the others set, the delta lands once
however the unit got there: `phase:id` names the write and the citation names every route. Armorclad
writes its `+6` Defense at `CreateUnit.CAS:702-703` when the city builds the unit and at
`OverlandEndTurn.CAS:428-429` for a unit that predates the reform, the second guarded on
`EncArmorClad` at `:425`; Academy's `+2` figures the same way at `CreateUnit.CAS:467-468` and
`OverlandEndTurn.CAS:608-609`, guarded on `SMultiLabel` at `:577`; Spirit Link's `+2` Resistance at
`OLSpell.CAS:185` and the Mystic Surge random grant `SpellMysticSurge.CAS:57`. Every route of
each is pre-combat and no `base` step between them reads the fields it writes, so the record is the
same whichever ran, and the step takes the earliest route's position.

**A training-time write earns a step only when it writes a stat delta.** One that sets a flag or a
level in the base record needs none: the calculator's control *is* that base-record state, and the
per-pass consumer stands at its own engine position reading the permanent record there.
`ApplyMagicWeapons` (`Units.RecalculateUnits.pas` $00598D91, called at $0059E4AD) is the worked
example — it reads `BaseUnits[i].EnchantmentFlags[EncMagic|EncMithril|EncAdamant]`, not the merged
aggregate, which is why the merge's deliberate `Units[i].EnchantmentFlags[EncMagic] := False` at
$00599B30 does not touch the material bonus. A stat delta cannot be stated as an input and therefore
does need a step, which is all 19 Warlord entries. All four training-time writes in base CoM2's own
`CreateUnit.CAS` are the flag-or-level kind, so that version's empty training group is correct
rather than unchecked.

### The execution chain

One ordered chain per engine version, `base` through `e`, is the single mechanism that orders a
derivation — `statChain(version)` in `stats_manifests.js`. There is no second one: array order
decides nothing, and a step whose key the chain does not name fails composition rather than landing
wherever it happened to be authored. Construction must account for every emitted step exactly once;
it may not repair an unordered list with a generic sort or silently discard an unlisted step. Chain
entries a run does not emit are skipped without complaint — a step is version- or
predicate-exclusive — but the reverse is an error.

A chain entry states three things, and a `base` entry a fourth. Its **key** is `phase:id`, the same key the version scope uses,
so position and scope are keyed alike and two engines writing one effect from different regions
stay distinct. Its **phase** is the provenance label above; it orders nothing, but a chain is
authored in non-decreasing phase order, so an entry filed under the wrong region shows up as a
chain out of order. Its **provisional** flag says whether the position is transcribed or inherited:
regions `b`, `c` and `d` come from the compiled address map and the CAS files and are transcribed;
`base`, `a` and `e` are inherited from the order the steps were authored in, and stay provisional
until sourced. Named entries inside a transcribed region can still be deduced — the modern
region-`c` identity conversions head their region by convention rather than at their blocks'
addresses, where the DOS ones sit at the offsets the address map gives them — and each is listed
as such rather than inheriting the region's claim. A `base` entry states a fourth thing, its
**kind** — which of the five kinds of permanent write it is, per *The step model* — and no other
entry may.

Each version's chain is written out in full, including the parts two versions currently share. A
chain is what one engine does, and reading it should not mean assembling it from fragments.

One sequence walks the chain, and an identity conversion is one of its steps, so an identity
write is accounted for exactly once and its rank is comparable with every other write's.

The `attackSpecific` lists stay outside the chain. Each transcribes a separate compiled routine
run on a scratch copy and keyed by an incoming attack, not a write the recalculation makes, and
list order is what orders it.

To-Hit and To-Defend writes use this same ordered record. Where a version keeps one common Hit
field plus per-channel modifiers, region `e` first clamps the common value, then adjusts each
channel modifier so its sum with that already-clamped value is in range. These are two ordered
writes, not one clamp over the pre-clamp sum: a common `−50` with a ranged modifier of `+10`
resolves to 20%, not 10%. Modern To Defend is not clamped in region `e`; its eventual
random-threshold comparison naturally makes values at or below zero a 0% chance and values above
100 a 100% chance. Late aura writes can likewise raise To Hit after its region-`e` clamp.

### Version scope

**Phase says where in an engine a write happens; scope says which engines make it at all.**
`STEP_VERSION_SCOPES` in `steps.js` is the single home for the second fact, keyed by `phase:id` and
covering every phase plus the separate `attackSpecific` lists. Two step objects may share an id
when two engines make the same effect from different regions, which is why the key carries the
phase. A scope always names its exact member versions; a family label such as "DOS" or "modern" is
not a scope.

**`chance:` is the To-Hit/To-Block ledger's namespace and nothing else's.** Every step in that
ledger carries it and no step of a derivation sequence does, so the two id spaces are disjoint and
one `phase:id` key never names both a real write and a projection of that write. The ledger holds
one projection per stat event, plus the three resolution-time writes native to it. A projection is
the same write seen through another output, so it carries the key of the write it projects as
`projectionOf` rather than a second copy of its scope. That marker is stated, never inferred from
the prefix: a ledger step that projects nothing — `attackSpecific:chance:distancePenalty` — has a
scope row of its own, and the id cannot tell the two apart.

Scope is an upper bound on applicability, not a firing condition: inside its scope a step still
asks `when` whether this unit and state fire it, and outside its scope the engine has no such write.
Every sequence is therefore filtered by scope before composition, for every phase alike: a version's
sequence is the writes that version's engine makes, so an out-of-scope step is absent rather than
present behind a false predicate. Two things follow, both checked rather than asserted here. Every
step entering a sequence must resolve a scope — there is no default, so an unclassified step fails
at the filter. And no composed sequence contains an out-of-scope step in any version, which
`tools/unit_checks/version_scope.js` asserts across all four sequences at once.

Scope also hides at call sites, where no per-step predicate can see it: no step in the
attack-specific lists carries a version test. The modern pair is modern-only solely because its
callers reach it from a modern branch alone, and each DOS list is its own engine's transcription
selected by version rather than gated. Those callers therefore assert their own list's scope
against the passed version under the debug switch.

The canonical scope is the authority. The three mechanisms that used to carry the fact between them
keep narrower jobs: a `when` predicate gates firing within scope; a `subgroup` on an ability or
enchantment definition governs *control* visibility and cannot be per-step, because several
controls map to one `calcKey`; and a `PROVENANCE versions=` annotation states which builds' sources
were reviewed for the formula. Every scope entry is initialised from that annotation and the checks
assert the reviewed versions fall inside the scope, so the two cannot drift. Where a scope is
deliberately wider than its citations, the gap is listed explicitly so a new one cannot appear
unnoticed.

### Traces

`deriveUnitStats` retains `statExecutionTrace` as the complete append-only execution ledger: one
applied or predicate-skipped event per visited step, carrying the manifest's `sourceOrder` for
represented `b`/`c`/`d` steps, asserted against the executed list. The public `statTrace` is the
sparse projection: inactive predicates, no-op writes and invalid selections do not create an entry.

An `applied` event means the engine entered that block. A step therefore states the condition the
engine tests as its `when` and writes the engine's constant, rather than adding a modifier that is
zero when the effect is absent. The blocks the engine enters unconditionally — the base seed, the
level ladder, and the terminal clamps — carry no `when` and are the only entries a unit with
nothing selected records.

`modifierTraces` is the per-output projection consumed by the UI: one entry per calculated output
with `{base, entries, result}`, where every entry carries its source, phase and running
`{from, to}` values. Percentage traces use displayed percentage points. A version contributes only
the To-Hit projections its record has, so the key set itself says which record produced them: the
DOS shared secondary threshold, or the modern common field and one projection per **hitchance
field** rather than per output channel. Race and Fantastic use
their editable base identity and calculated live identity; each modern attack channel retains its
own strength projection. Permanent writes that prepare the base record before the scratch-record
sequence are captured at their own application sites, so the later base seed is not presented as
their source, and channel-creating writes still begin at editable zero strength.

### Attack-specific sequences

Every engine runs two further ordered transforms for each incoming attack — one keyed by the
attack's realm, one by the incoming attack flags. They use the same step type and runner as
derivation, but operate on a **scratch copy** of the finished unit record and discard it
afterwards. They therefore cannot change the displayed Defense or Resistance, or leak a modifier
into a later attack. Each engine family transcribes its own routine pair, so the two stages differ
only in which routine they transcribe: CoM2 and Warlord share one list per transform, while the
DOS engines carry **one list per version**, because their three builds do not agree on the order
or the content of every write.

The orderings themselves are the step arrays. What the contract fixes is their consequences:

- **Assignments deliberately precede additions** in the modern resistance transform, so a unit
  whose resistance was assigned a ceiling can finish above it. One of those assignments is
  roll-only and never changes the displayed stat, and it alone reaches realm-less rolls.
- **The DOS resistance transform adds where the modern one assigns.** Every write is an addition,
  so a unit accumulates each applicable bonus and can finish above the value an assignment would
  have capped it at. This is why it is a separate transcription rather than a version variant.
- In the modern defense transform, **an early return on an unresisted Illusion halts the whole
  sequence**, preventing every later bonus and immunity from applying. The DOS transform returns
  at the same point.
- **Armor Piercing halves the bonuses that precede it** and not those that follow; an immunity
  assignment afterwards discards that halved total; and a bonus after the immunities can stack on
  top of an immunity's replacement value.
- **The DOS defense transform carries a marker rather than a number.** Every immunity it
  recognises writes one of two markers, which terminal steps cash in after Armor Piercing: one
  raises or adds the Weapon Immunity amount, the other replaces the total outright. The order in
  which two markers are written therefore decides which survives, and MoM 1.31 writes them in the
  opposite order to CP 1.60 and CoM 1 — which is the whole of the difference between reproducing
  and not reproducing that build's Weapon-Immunity-overwrites-Missile-Immunity bug.
- The DOS City Walls bonus is added *after* the complete defense-special result, so it is neither
  halved by Armor Piercing nor removed by an unresisted Illusion — the reverse of the modern order.

### Warp Creature ordering

Warp Creature reduces rather than adds, so unlike an additive modifier its *position* is
observable — and it is the sharpest divergence between the engines. Every engine runs the block
inside its stat recompute; what differs is **what each engine still writes afterwards**, and the
engines diverge by opposite routes. One moves the reduction early; another moves specific later
effects into region `e`. The consequence is the same — those effects land at full value on a
reduced stat — but the mechanism is not, and the set of writes carried past the reduction differs.

The modelling decision that follows: **one position in the sequence serves all engines** — the end
of region `c` — and the divergence is expressed by which steps carry the `afterWarp` marker for the
part of `c` that follows the block. Nothing else lies between, which is what lets an early Warp and
a late one share a position.

**An effect an engine orders differently is modelled as two version-exclusive steps rather than one
step with a version predicate**, which keeps the divergence visible in the list instead of hidden
inside a condition. This is the general rule, not a Warp-specific one.

Arithmetic at these sites is signed, and the engines differ in whether they shift or divide and in
which way they round. Because later writes can occur before the terminal clamp, those distinctions
are observable rather than cosmetic.

## Deliberate deviations from the engine

These are the places the calculator knowingly departs from, narrows, or declines to reproduce what
the engine does. **No binary states these** — they are decisions about the model, so unlike effect
behavior they have no other home and must be recorded here. Each names what the engine does, what
the calculator does instead, and why.

- **Blur is represented on unit cards although it is army-global.** The modern engine selects the
  Blur source by a fixed turn-relative side. The calculator projects that onto the tactical cards:
  Card A is always the tactical attacker and Card B the tactical defender, every modern attack in
  the displayed exchange reads Card B's army Blur, and Swap exchanges the two values. Card A's
  value is retained but inactive. This avoids exposing strategic combat-side controls for a
  single-exchange model. The DOS engines instead read the current target card's unit-owned Blur.
  The engine's own turn-relative selection is a suspected engine bug — see H1.
- **City Walls is per-unit spatial context, not army membership.** Each card records whether that
  unit is outside or inside at a wall position; the target receives its bonus only when the source
  is outside, and the counter-attack reevaluates the reversed pair. Persistent army membership does
  not participate.
- **Card prefixes never imply army side.** The Attacker and Defender cards describe the roles in
  the current exchange, not the persistent armies. Army-side, garrison, city and node eligibility
  must be carried by explicit context and must never be inferred from the `a`/`b` prefix.
  Card-prefix gates are valid only for genuinely exchange-role behavior.
- **MoM 1.31's hero magical-ranged repeat is modelled as the common case.** 1.31's gate recognises
  only the Caster unit flags, so a hero falls through to the ammunition branch and gets no repeat;
  CP 1.60 added the missing hero test. The real 1.31 gate reads an unrelated battle-unit slot and
  can flip either way, so the modelled outcome is the common one, not the guaranteed one.
- **Chaos Channels' doubled armor bonus is folded into one write.** MoM 1.31 passes the mutations
  byte whole to both `BU_Apply_Specials` calls, so the demon-skin block adds its `+3` twice — once
  at the constructor and again in the recompute, immediately before Warp Creature. The calculator
  makes one `+6` write at the constructor position, because every write between the two calls is an
  addition and the only Defense clamp is terminal, so the folded total is exact in every reachable
  state. The fire-breath block of the same second pass is *not* folded: it assigns the shared
  secondary slot rather than adding to it, so it carries a chain position of its own.
- **A repeated attack is assumed to be available.** Mana and ammunition are outside the one-round
  model, so where the engine gates a repeat on a mana or ammunition reserve, the calculator assumes
  the reserve suffices.
- **Warlord Energy Cannon's source gate is inferred.** The engine admits it by positive persistent
  Max Ammo on an eligible unit. The calculator infers that gate from positive permanent
  conventional Ranged: the two predicates are identical across the shipped Warlord roster, and
  Custom units cannot represent a contradictory ranged/ammunition pair. Ammunition is therefore
  not imported as a calculator input.
- **Roster token names do not select resolver semantics.** Where a version's name→mask table still
  carries an older effect's name for a bit whose branch implements a different mechanic, the
  calculator maps the token to the mechanic the resolver actually runs, and reserves the older
  mechanic for the versions that implement it.
- **Only total Damage Taken is a starting-state input.** Irrecoverable/Irreversible Damage, Undeath
  Damage and Bonus HP/Extra Hits are exact internal state but are not exposed on the card or
  matrix, which start from Regular damage with zero bonus and no explicit override.
- **No Healing is derived, not entered.** The calculator derives it from supported abilities and
  effects rather than exposing a starting-state override, because in the supported recalculation
  path the enchantment also derives the race-level flag — a race-only control would duplicate state
  rather than add an independent input.
- **Lucky is resolved per-unit rather than by name.** It reaches a unit from several sources across
  `base`, `a` and `b` and does not stack, so it is counted once in the **earliest** stage that
  grants it, via per-phase markers set during the ability-grant step.
- **Warlord's Lucky Star is split into two controls**, because its aura and its grant of Lucky have
  different reach: the aura covers every friendly unit in the combat including the enchanted one,
  so its condition means *some friendly unit here is enchanted*, while the Lucky grant reaches only
  the enchanted unit and is therefore expressed with the ordinary Lucky ability.
- **A pre-rolled per-unit modifier is fixed, not distributed.** Where a Warlord scoring option
  records a value already rolled at combat start, the calculator takes it as a fixed clamped input
  and does not fold it into the damage distribution.
- **A landed one-time guard is projected as its persistent result**, not as a user-selectable
  reapplication toggle.
- **Package metadata is returned without resolver effect.** Regeneration, healing, spellcasting,
  post-combat undead creation, and side-wide ally effects have no one-round resolver consequence
  but remain visible in the returned package metadata rather than being dropped.
- **The modern record carries a fifth secondary-attack slot the engine does not have.** `Caster.exe`
  holds Ranged, Thrown, Fire Breath and Lightning Breath as named fields of one unit record, and the
  calculator's modern record carries those four and derives them in one walk. Beside them it keeps
  the DOS engines' shared `.ranged` slot, because the card's shared secondary value still reads it.
  That shared-slot shape is faithful to the DOS engines and stays. **In a modern version it is a
  display projection, and a read that decides behaviour resolves the named field instead.** Which
  slot holds a field is record structure, not a choice: the `ranged` channel is `SRanged`, while the
  shared slot is the Ranged field only while its permanent type is a conventional ranged one. Every
  reader of a modern record states all four channels, so a modern read has no shared slot to fall
  back to. Nothing else is added: Focus Magic's `U.ranged := U.thrown` and Lightning Blade's
  `SLightningBreath := SThrown + 1` are field moves between two of the four, as the engine makes
  them, so the Thrown field they empty is free for Shadow Strike's later grant without a sixth
  accumulator.
- **A conventional Ranged field emptied by Blaze of Glory is retired by clearing its type.** The
  engine retires it with `SETSTAT(U,SAmmo,0,0)` beside the transfer (`UnitCalc.CAS:1502`), and the
  calculator models no ammunition, so the positioned transfer clears the ranged type instead. Two
  things read that cleared type. One is the region-`e` aura pass, where exactly one write would
  otherwise land on a field with no shots left — Holy Bonus, whose `B.ranged > 0` gate reads the
  permanent record and is indifferent to what the calculated one holds — and the cleared type
  retires its result as the spent ammunition would. The other is the resolution-time distance
  penalty, which reads the finished ranged type, so no attack the transfer has put on Thrown is
  charged for a range it no longer has.
- **Projectile classes are assigned at roster-generation time, and the two engine families are
  given different vocabularies.** The modern engine classifies a projectile by id through
  `RangedType.INI`, which carries five keys per entry — `Image`, `StatIcon`, `Sound`, `Ismissile`,
  `Ismagic` (`@Init@LoadRangedIni`, `$00625E28`) — and reads the loaded table only through
  `Ismagicalranged` and `Ismissileranged`. There is no realm attached to a modern projectile. The
  calculator therefore converts each id to a token when the roster is generated
  (`tools/ranged_types.py`) rather than carrying the id and the table into the runtime, and the
  modern vocabulary is `none`/`missile`/`boulder`/`magic`/`magic_lightning`: the two flags, plus
  id 30, the lightning-bolt projectile, kept separate because the engine's lightning behaviour
  keys on it. The DOS builds keep `magic_c`/`magic_n`/`magic_s` instead, because their engine does
  have a realm table — `Battle_Unit_Attack_Magic_Realm`, 21 entries, 131:0x9A7A9 — so the two
  vocabularies diverge on purpose and every read that spans both names both. What the deviation
  costs is runtime modding: an id a shipped `RangedType.INI` does not define halts roster
  generation naming the id, rather than being classified from a table the calculator would have
  had to load.
- **An immunity strips the curses it blocks, as a step no engine makes.** No engine removes a
  curse flag it already carries: `RecalculateUnits` has six flag clears, none a curse and none
  gated on an immunity, and the curse blocks themselves test the flag alone. The immunity is
  enforced where the spell lands instead — modern `GetEffectiveResistance` sets Resistance to 100
  for a Magic-Immune target of any realm spell (`$00595BEF`), and the DOS engines add 30
  (131:0x990AE), against a roll that cannot reach either — so an immune unit never acquires the
  flag. The calculator has no cast order, so it assumes the immunity is the pre-existing one:
  innate, cast overland, or cast earlier in combat. That is the common case, and the only one a
  single ability set can represent. The strip is `base:immunityCurseGating`, an artificial step at
  the head of every chain, so the assumption is a positioned write like any other rather than a
  transform outside the sequence. Two limits are deliberate: Illusion Immunity's half is assumed
  rather than cited — no reconstructed resolution path tests it against a curse, and the real gate
  is presumed to live in the unreconstructed UI target validation and AI code — and the membership
  of the stripped list remains a modelling choice (T8), where the engines' own criterion is that
  the spell carries a realm.
- **Some building and enchantment ability grants still run before the sequence, where the engine
  writes them at position.** Six hoists are left in `deriveUnitStats`: `deriveMarionettePackage`
  and five nested calls — `applyLavaSmelterGrant`, `applySanctaBasilicaGrant`,
  `applyPillarOfFaithGrant`, `applyInsulationGrant` and `applyOutlanderReformGrants`. The
  calculator already gives their sources chain phases: the `CreateUnit.CAS` grants' stat halves
  are `base:` steps (`base:sanctaBasilica` beside Sancta Basilica's ability grants, from the same
  four `STypeID` branches), and Insulation cites `UnitCalcPre.CAS` — region `b`. So one block's
  stat write is a positioned step while its ability write is not, split by field kind rather than
  by evidence. The cause is the calculator's, not the engine's: `deriveUnitStats` computes its
  gates as constants ahead of the sequence, and the hoist is what makes some of those constants
  valid. Scheduled for removal (F200, F201); the option is not that both shapes are acceptable.
  The seventh hoist, the `effectiveAbilities` merge, no longer carries a grant: Divine Protection
  and Fortification took positions with F200, and Altar of the Moon, Military Workshop, Mother
  Fungus, Venom, Energy Cannon, Bombs & Grenades and Blaze of Glory with F201. What is left in
  that merge is the finished-record projection, plus two normalizations no engine block makes —
  the inert-Rust drop and True Sight's implication of Illusion Immunity — which are F201 stage 2.
- **An identity conversion is its own step even where its engine block also writes a stat.** The
  address map puts Chaos Channels' demon-skin realm write inside the block that increments Defense
  (`$0059F4A3`, 0x8F6FE) and Black Channels' at the end of its own block (0x8F4A1), so *One
  sequence, one record* would merge each pair into one step. They stay separate for a reason of the
  calculator's: the derivation has to be able to ask what identity the recalculation **leaves**
  without running the stat sequence, because two cast-time targeting classes and the post-chain
  reads take that record and the earliest of them is settled before the sequence is even built.
  That query is a projection of the one conversion list, and it is exact only while every step in
  that list writes `race` and `fantastic` and nothing else — which is what the two `:race` ids buy.
  `tools/unit_checks/identity.js` asserts the property the projection rests on. Each pair is
  chain-adjacent, so no number can depend on the split; the three other `:race` ids are separately
  gated and are not this deviation.
- **Some positions inside a transcribed region are deduced rather than read.** CoM 1's Focus Magic
  position is inferred from the exhaustive list of what its recompute writes after Warp, which does
  not contain it; CoM 1's Raise Dead is a combat-spell write with nothing to order it against the
  region-`c` blocks — the same is true of its modern counterpart. Each is
  marked `provisional` on the chain, which is what distinguishes a deduced placement from a
  transcribed one.

## Data provenance

A version's roster is authoritative only as a faithful derivation of its source in
`Unit rosters/`; the in-app `units_<version>.js` files are build products. Generator
mapping and the no-hand-editing rule are in the root [CLAUDE.md](../CLAUDE.md).

Every source-authored game formula that derives, writes, replaces, scales, clamps, or gates a
unit/combat stat has an adjacent `PROVENANCE[id]` comment. **This is the single home for what an
effect does and which builds it was verified against**, and therefore the destination for any
question this specification does not answer. `VERIFIED` names applicable versions and narrowly
cites the implementation gate, arithmetic, and any loaded table value; `UNVERIFIED` records the
live gap and strongest pointer without presenting implemented behavior as established source fact.
Loaded runtime constants are cited from the tables that own them rather than restated.

## UI contract

- Two symmetric panels (attacker `a`, defender `b`) with identical stat and ability
  controls; `#swapBtn` exchanges them.
- Result panels show, per side, the damage distribution and the chance the unit is
  destroyed; the melee breakdown grid shows one row per phase in resolution order.
- **The ranged-mode control follows the attacker's derived ranged attack.** It is available only
  while the attacker's *derived* record carries a conventional ranged attack, and any edit that
  leaves the derivation without one clears and disables it in the same interaction, before the
  exchange is resolved — so a ticked control never resolves as melee. This is normalization of a
  card the user is still editing, not a fallback: no value is invented, the withdrawal is visible
  on the control itself, and *Out-of-range values stop the run* therefore does not apply. The
  ranged matrix states the same rule by omitting an attacker that has no ranged attack.
  Resolution checks the guarantee instead of repeating it: a tick that reaches the exchange with no
  ranged attack behind it halts, because the withdrawal has already failed by then and resolving it
  either way — silently as melee, or as a volley from an attack the record does not have —
  manufactures a number (*Out-of-range values stop the run*).
- **Matrix mode** computes attacker-vs-whole-roster ratios in Web Workers. Custom and roster
  rows enter the same identity-aware `deriveUnitStats` boundary as the main card. The main
  thread sends those fully derived, identity-dependent stat records to the workers; workers
  call the same `resolveCombat`, and any divergence is a bug.
- Each panel is split into two titled sections. **Base stats and abilities** holds the
  editable stat fields and the unit's abilities. **Enchantments and conditions** holds the
  level, weapon and armour selects and damage already taken, followed by the enchantments.
  The dividing rule is whether the value is roster-owned or chosen per battle — which is
  also exactly the set that stays editable when a predefined unit locks the stat fields.
- The stat fields hold **pre-level** values. Experience level is applied downstream as an
  ordinary transform step, so no code path may write a level bonus into a card field.
  Changing Level preserves every editable card stat and base-identity control, on a Custom and a
  predefined selection alike; only the downstream effective-stat transform changes.
- **Selecting a predefined unit is the one statement of its roster record on the card**, and
  states all of it: the stat fields, figures, the To Hit and To Block fields, the shared attack
  slot and the modern attack channels. No other path restates part of that record, so a card
  deliberately holding values the record never gave it — what persistence restores, and what the
  matrix's own row is built from — is never half-reverted.
  Effective values appear only in the modifier column. That column shows one final modified
  number; it does not reproduce the games' plain/gold or grey/gold presentation tiers.
- Hovering a final modified value shows the complete chain that produced it: the editable base,
  then every applied transform with its source and running value before and after the write, and
  finally the displayed result. The chain follows the applicable binary/CAS execution order, not
  UI grouping or effect name. It must be emitted from the same ordered transform path that computes
  the value rather than reconstructed independently after calculation — that projection is
  `modifierTraces`. The existing touch-device tooltip interaction exposes the same information
  where hover is unavailable.
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
- Swap exchanges every source/base identity field, selected roster, numeric/card field,
  intrinsic ability and special-unit-derived UI state. It preserves hand-edited values on a
  predefined selection and is an involution for any predefined/Custom pairing.
- Presets may supply the base identity as `{isHero, baseRace, baseFantastic, specialUnit}`.
  Historical preset callers that supply `unitType` are translated once at this boundary. An
  explicit identity wins over that legacy token, while a predefined roster selection always
  keeps the roster's own source/base identity.

### Attack channels on the card

The two engine families expose different attack records, and the card follows each rather than
projecting them into a common shape:

- **The DOS card retains the shared slot**, whose type selector includes conventional ranged,
  Thrown, Breath and the three gaze types. There is no separate hidden-gaze input: for a gaze this
  shared value is the conventional gaze strength, and Multiple Gaze also uses it as Doom damage.
  Selecting a non-gaze type removes the gaze outright.
- **The DOS card presents the record's single special-attack byte as one Special value input**
  beneath the shared slot, with a checkbox per consumer — negated for the save-modifier riders,
  positive for the count and bonus consumers — so the contention the record imposes is visible
  rather than hidden behind independent fields. The gazes read the same byte but are selected by
  the slot's type rather than by a flag, so they have no control of their own. Riders that take a
  literal modifier rather than the byte stay ordinary ability rows rather than joining this block.
  A bonus entered here is the value the unit *provides*; the received side stays an enchantment
  input and the two max together.
- **The modern cards expose independent Ranged, Thrown, Fire Breath and Lightning Breath records**,
  plus roster-bound gaze and touch save modifiers and their To Defend value, each an independent
  field. The modern resolver consumes those named records, so coexisting roster attacks are neither
  projected into one card field nor discarded. The shared slot stays on the modern card but is
  hidden and has no spelling for the modern-only projectile tokens, so `magic` and
  `magic_lightning` are stated by the Ranged selector alone and the card's writers project onto the
  slot rather than leaving it holding a token it cannot offer.
- **The Ranged record exists when its projectile type is set, whatever its strength**, on the card
  and in `deriveUnitStats` input alike: the roster ships a typed record with no strength, and the
  engine writes gated on the permanent type land on it. Thrown and both Breath fields carry no type
  of their own, so for them strength is the only statement of existence. A channel the walk leaves
  at or below zero strength is still absent from the output.
- **A modern record that states no attack is four empty channels, never a missing record.** The
  four strengths are fields of `unitT`, so every modern unit has all four and an ungated engine
  write can create the channel it names. Supplying no record at all is a different statement — the
  unit's version has no such record — and only the DOS versions make it. Every caller of a modern
  record therefore states all four channels, which is what keeps the card and the matrix on one
  boundary rather than agreeing only for the units a roster happens to ship; `deriveUnitStats`
  halts on a modern input that supplies none rather than reading the DOS shared slot instead.
- **Each card carries its version's To Hit record and only that one.** The DOS card keeps one melee
  threshold and one shared secondary threshold, matching a record that stores a threshold per attack
  and nothing above them. The modern card keeps the five fields `Caster.exe` holds — the common
  `hitchance`, plus `hitchancemelee`, `hitchanceranged`, `hitchancethrown` and the single
  `hitchancebreath` that serves both breath strengths — as one common value and four modifiers at
  zero. Naming the other family's field halts the run rather than writing a control nothing reads.
- **Every one of those fields carries a displayed projection, and each modifier row resolves the
  threshold the roll compares against**: the common value plus that row's own modifier, carrying
  the ranged distance penalty and the resolution-time 10..100 bound. One breath row answers for
  Fire and Lightning Breath alike, because one record field does. The common row shows that field
  alone against 30, so a write to it appears there and inside every modifier row.
- Modern roster To Hit and To Block values are percentage-point deltas above the common base shown
  on the card; an omitted field means the default. One `Hit=` per record seeds the common field and
  the four modifiers have no roster source. The DOS rosters have no per-template To Block
  field, so their cards retain the ordinary zero delta.
- Maximum ammunition remains outside the card and the one-round model.

### Conditions and derived states

**The UI records fundamental conditions, never a second checkbox for a state those conditions
derive.** Intrinsic roster facts live under Abilities and are roster-owned when a predefined unit
is selected. Research, building, and reform conditions live under Enchantments and remain editable
for predefined units, since a predefined selection locks Abilities but not Enchantments.

A state that `deriveUnitStats` derives from those conditions must not be exposed as an independent
control, and a display label for a grant is not a second grant. Where a derived state gates another
condition, the gate is the derived state, not a separate data enchantment.

Grants that the engine carries independently are modelled as independent controls rather than a
single-choice selector, so that all applicable grants can coexist.

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

- Full page state uses schema v2: `{v: 2, ids, identity: {a, b}, generic}`. `ids` is the
  default-diffed id→value control map and carries the selected version and roster selection.
  Each side's identity record is exactly the editable base boundary
  `{isHero, baseRace, baseFantastic, specialUnit}`, plus an optional internal display `name`
  used by existing name-gated fixtures. The hidden compatibility `unitType`, calculated/live
  `race` and `fantastic`, per-side `version`, `templateId`, and `heroTypeId` are never written.
- Numeric template and hero-type IDs remain internal. Restore validates the version and roster
  selection, then reconstructs those IDs and the authoritative base identity from that version's
  roster. A Custom selection always reconstructs null source IDs and restores its independent
  v2 base identity. Hand-edited card stats are applied afterwards and are not overwritten by
  rebuilding roster locks.
- The compressed v2 blob is stored under `pageState_v2`. The reader also accepts legacy v1
  compressed/default-diffed blobs and full plain-JSON blobs under `pageState_v1`, including the
  old `{race, name}` identity and hidden `unitType` boundary. Saved single-choice Lava Smelter
  selections are migrated to the corresponding independent grant flags.
- A share link carries the same blob in the URL fragment (`#s=…`) and takes precedence
  over `localStorage` on load.
- Restoring is order-safe: version first (which repopulates rosters and ability panels), then
  roster/source identity, then editable controls, then locking and visibility.
- **An id this build no longer has is ignored; a *value* this build no longer has halts the
  restore** (*Out-of-range values stop the run*), because the assignment would otherwise leave the
  control blank and the page would re-persist the blank. Retiring an option therefore obliges the
  build either to accept that older states stop, or to state a migration for the retired value —
  `RENAMED_GAME_VERSIONS` is the precedent, for version ids. It covers a `<select>` value its
  option list does not offer; a special-unit key no version defines, on both carriers that hold
  one — the control value and the v2 identity record; and a saved `gameVersion` this build
  neither offers nor renames, which halts rather than falling back because the version chooses
  the default set the blob's diff expands against, so substituting one would reinterpret every
  other saved id under a rule set the user never chose. Version scope is not retirement and keeps
  its clamp: an unknown roster selection becomes Custom, and a defined special unit the selected
  version does not allow becomes none. A blob naming no version at all is a legacy v1 payload
  rather than an out-of-range value, and still falls back to the persisted version and then the
  default.
- A corrupt local blob degrades to clean defaults and is discarded so it cannot throw on every
  reload. A corrupt share blob is stripped and falls back to the recipient's local state.

## Invariants

These hold for every version, unit pair, and ability combination, and are asserted by the
automated suites:

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

- Marionette Ascension models Conjurer's spell substitution and every direct realm/book grant;
  its remaining retort-to-hero-template ability rewrites wait for the shared hero progression and
  template-ability model (**F41**).
- Destruction is modelled only for CoM2/Warlord; the older-engine hero path remains absent (**M3**).
- Heroes use normal-unit level controls rather than the DOS eight-threshold and modern nine-step
  hero ladders and their level-scaled template abilities (**F41**).
- Ammunition is omitted because one engagement has no multi-turn shot budget.
- Regeneration is omitted because it is between-turn healing.
