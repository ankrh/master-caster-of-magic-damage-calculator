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
- Healing and regeneration between rounds, or post-combat effects. Immediate in-call
  `Combatheal` from modern Life Steal and Warlord Bloodsucker is part of attack resolution.
- Active spellcasting, mana consumption, ammunition consumption, or summon resolution. Warlord
  Energy Cannon's positive-Max-Ammo source gate is inferred from positive permanent conventional
  Ranged: those predicates are identical across the shipped roster, so ammunition is not imported
  as a calculator input. A derived spell name
  and charge count may be reported as unit metadata when they determine a
  modelled unit package; they do not add an attack phase by themselves.

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
  reproducing original-game bugs** where the version has them (e.g. the v1.31 Blur
  half-block bug in `blurSurvivingDist`, the v1.31 Cause Fear silencing bug).
- A version's roster comes from its own `units_<version>.js`; `mom_1.31` and
  `mom_cp_1.60.00` share `MOM_UNITS_DATA`.
- Abilities and enchantments not present in a version must be **hidden from the UI and
  inert in the result**. A hidden control must never influence a computation.

## Computation model

- The **Attacker** and **Defender** cards describe the roles in the current attack exchange:
  which unit initiates it and which unit receives it. They do not identify the persistent
  attacking and defending armies. Army-side, garrison, city, and node eligibility must be carried
  by explicit per-unit or battlefield context and must never be inferred from the `a`/`b` card
  prefix. Card-prefix gates are valid only for genuinely exchange-role behavior such as a ranged
  attacker's distance penalty or the melee/counter-attack phase direction.
- **City Walls is per-unit spatial context.** Each card records whether that unit is outside or
  inside at a +1 or +3 wall position. For every individual attack, the target receives its
  selected bonus only when the source is outside; both-inside and both-outside attacks receive
  none. The counter-attack reevaluates the reversed source and target. Persistent army membership
  does not participate in this gate.
- **Modern Blur is army-global but represented on unit cards.** Card A is always the tactical
  attacker and Card B the tactical defender. In CoM2 1.05.11 and Warlord 1.5.12.7, each card's
  Blur checkbox records whether that unit's army has Blur; it is not a claim that the spell is
  unit-owned. For the single exchange displayed by the calculator, every modern `ApplyAttack`
  reads Card B's army Blur, including Card B's counterattack, First Strike, retaliation gazes,
  Thrown/Breath phases, and ranged attacks. Card A's Blur is retained but does not affect the
  current exchange; Swap exchanges the two card values, making the former Card A value active
  when that unit becomes Card B. This is the calculator's tactical-card projection of the engine's
  fixed turn-relative `CGADEnemy` side selection, without exposing strategic combat-side controls.
  Invisibility remains target-unit state and combines with Card B's army Blur at the version's 30%
  CoM2 or 40% Warlord cap; the current attacker's Illusion Immunity remains the directional gate.
  MoM 1.31, CP 1.60, and CoM 6.08 instead read the current target card's unit-owned Blur, so a
  counterattack reads Card A's checkbox.
- **Exact probability, never simulation.** All results come from closed-form binomial
  distributions and convolution. Monte Carlo is prohibited.
- Attack resolution is `Binomial(attackStrength, toHit)` hits against an exact defense-block
  distribution, per attacking figure. MoM 1.31, CP 1.60, and CoM 1 use
  `Binomial(defenseStrength, toBlock)`. CoM2 and Warlord convolve two independent binomials:
  dice 1–15 use ordinary To Block, while dice 16 onward use the lower of ordinary To Block and
  30% (the shipped `ToDefendCap=15` / `ToDefendCappedValue=30` settings).
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
distributions, remaining/total HP, live figure counts, version-appropriate Life Steal
distributions and benefit, and —
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
Strike is also dealt immediately. The remaining `ApplyAttack` calls run main, Haste, counter
before their pending damage is dealt in main, counter, Haste order. Immediate self-healing follows
the call order and is visible to later calls, while none of them sees another call's still-pending
damage. Every melee `ApplyAttack` performs its own Cause Fear rolls, so the two Hasted melee strikes
use independent fear samples. The phase breakdown exposes one feared-figure PMF for each modern
melee call, labelled Main or First Strike, Haste, and Counter as applicable. Each PMF uses the exact
living-figure state at that call, including immediate healing from an earlier call but excluding
still-pending damage. A selected modern melee call still samples Fear when an earlier dealt phase
has already killed its target; zero source figures or Black Sleep instead make that call's feared
count zero. CP 1.60 and CoM 6.08 retain their shared Haste sample and combined Cause Fear row;
MoM 1.31 retains its silenced-defender/self-fear bug presentation.

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

Supernatural is imported and displayed on the shipped CoM 1 roster units that carry its `$2000`
attack-attribute bit, but it has no combat effect in that version. The frozen CoM 6.08 resolver's
only `$2000` test is inactive; its live `(hits - 5) >> 1` minimum is a distinct Destruction
`$0020` path. CoM2 and Warlord compute the minimum from pre-defense hits as
`Round((hits - SupernaturalStarts) × SupernaturalRatio / 100)`, with Delphi ties-to-even rounding,
then enforce that floor after defense; both shipped `MODDING.INI` files use `0` and `34`.

CoM2 and Warlord Cause Fear have a base/current-record distinction. The direct Death-Immunity
gate reads the feared unit's persistent base record before the −3 Death-realm resistance rolls;
Death Immunity derived only during stat recalculation (for example from Blood Lust, Animated or
Rebuild) does not skip those rolls. Intrinsic/base Death Immunity does. Magic Immunity still
blocks Cause Fear through the attack-specific effective-resistance assignment.

Special riders resolve with whichever phase their version's dispatcher admits. In the three DOS
builds, `BU_ProcessAttack` starts from the unit's common attack flags, then merges the melee flag
record for a melee call or the ranged flag record for **every non-melee call**: ordinary ranged,
Thrown, Fire Breath, Lightning Breath, Stoning Gaze, Multiple Gaze and Death Gaze. The shipped
roster touch flags are common flags, so a roster carrier fires on every admitted attack call;
notably, Chaos Spawn's common Poison accompanies its Multiple Gaze. Weapon-item powers instead
enter only their eligible melee and/or ranged record. A channel-carried Stoning Touch receives an
additional -1 save modifier and a channel-carried Death Touch an additional -3. MoM 1.31 aborts
the entire selected call, including all riders, when its live attack strength is zero. CP 1.60 and
CoM 1 patch that abort away, so an already-admitted zero-strength call still dispatches its flags.

CoM 6.08 retains common attack-attribute bit `0x0800`. The executable's name→mask table still
calls that bit **Dispel Evil**, and the Tweaker roster therefore labels Angel's token Dispel Evil,
but names do not select resolver semantics. `BU_ProcessAttack` tests the loaded common bit and its
CoM branch implements **Exorcise**: every admitted melee or non-melee call, including Gaze, makes
one attempt per attacking figure against any live Fantastic target. It uses literal −3 rather
than `Spec_Att_Attrib`, applies another −3 to created undead, and skips the attempt for Magic
Immunity or Spell Lock. The calculator consequently maps the CoM roster token to Exorcise while
reserving Dispel Evil's Chaos/Death, −4/−9 mechanic for MoM 1.31 and CP 1.60.

In CoM2 and
Warlord, Exorcise, Stoning Touch, Death Touch, Life Steal, Destruction and Poison are dispatched
for physical ranged, magical ranged, both Breath attacks, Thrown and melee, but not for any Gaze
attack. General flags merge into every admitted attack; channel flags merge only into their own
record. The unit card and roster expose innate Stoning/Death Touch as one general value. Warlord
Focus Magic moves either existing general value to melee, which also feeds Thrown, and clears it
from general/ranged; Revenant replaces Death Touch with 0 in that same melee/Thrown record. There
is no general physical-versus-magical ranged gate. All six riders sit inside the attacker-figure
loop and therefore make one attempt per surviving attacker figure. A failed Destruction roll
assigns 150 damage and destroys the target unit, but Destruction still makes one resistance roll
per attacking figure.

### Immediate Life Steal self-healing

CoM2 1.05.11 and Warlord 1.5.12.7 preserve each eligible Life Steal resistance-roll magnitude
before target overkill clipping. The raw nonnegative magnitude is added to the target's Life
Steal result category and is also passed immediately to `Combatheal(attacker, raw, true, false)`.
The target damage PMF is capped at remaining target HP; the raw-drain PMF and attacker transition
are not. Multiple figures and a repeated Haste `ApplyAttack` retain their joint outcomes rather
than replacing them with an expected value. The same correlated state crosses sequential attack
channels and phases: later Breath, Thrown, gaze, melee, and counter calls read the exact prior
healing/bonus-HP outcome, and their per-cell living-figure counts come from that revised state.
If the target healed earlier in the exchange, a later call uses its revised remaining-HP capacity;
the final damage and destruction distributions are marginalized from that state rather than from
the target's original display cap. The displayed raw-drain PMF is likewise marginalized from those
executed paths, not reconstructed from a static phase count.

MoM 1.31, Community Patch 1.60.00, and CoM 6.08 likewise pass every eligible, nonnegative
Life Steal resistance margin immediately to `Battle_Unit_Heal(attacker, margin, 1)`, before the
target's accumulated damage is dealt. The exact correlated result crosses later eligible calls
and dealt phases: restored figures can attack later, revised front-figure damage changes remaining
HP and destruction, and temporary Extra Hits increase each current figure's Hits after unit
construction and battlefield recalculation. Calls in a simultaneous exchange still read one
frozen pre-exchange snapshot; each call's self-heal is applied to its own source state before the
two pending damage results are combined.

DOS healing subtracts the full amount from Regular damage first and spills any remainder into
Undeath damage; Irreversible damage is not directly healed. The same low-byte amount is subtracted
from front-figure damage. A negative result restores figures one at a time, adding current Hits
per restored figure after sign-extending the stored Hits byte. MoM 1.31 and CoM 6.08 can restore
through raw maximum figures. CP 1.60 uses the wrapped byte
`Max Figures - floor(Irreversible Damage / Hits)` and signed-byte comparisons for its restoration
limit. Remaining overheal is divided into per-figure Extra Hits. MoM 1.31 adds the quotient with
byte wrap and also retains a positive post-restoration remainder for that test. CP divides by its
effective maximum, adds the quotient with byte arithmetic, and adds
`quotient * irreversible figures` to Irreversible damage with the executed signed-word comparison
and 200 low-byte cap behavior. CoM 6.08 divides by raw maximum figures, treats the previous Extra
Hits byte as signed for addition, and caps the result at 90. Later incoming damage caps each stored
DOS damage category at 200 independently while applying its full dealt total to the front-figure
and current-figure fields. Displayed damage, Life Steal, healing, survivor, and destruction
distributions are marginals of these executed paths rather than expected-value reconstructions.

Combat unit state therefore carries, in addition to total Damage Taken, Irrecoverable/Irreversible
Damage and Undeath Damage. Modern builds also carry Base Bonus HP per figure and No Healing; DOS
builds use the same numeric slot as temporary Extra Hits. These remain exact internal state, but
they are not advanced starting-state controls: the card and matrix accept only total Damage Taken,
which starts as Regular damage with zero bonus HP/Extra Hits and no explicit No Healing override.
The result panel reports each side's mean post-combat Irrecoverable/Irreversible Damage, Undeath
Damage, and Bonus HP/Extra Hits per figure from the correlated final-state paths. CoM 6.08 and both
modern builds clamp the per-figure bonus to 0–90; the two MoM builds retain their byte range.

`Combatheal` first computes `healable = total damage − irrecoverable damage`. Non-overheal calls
cap the request to that amount; overheal calls do not. If natural healing is allowed, or `isregen`
or `overheal` is true, ordinary recoverable damage is removed first and undead damage second.
For overheal, the remaining amount becomes `trunc(remainder / living figures)` base bonus HP per
living figure, capped at 90. Already-dead figures receive the matching Total Damage adjustment so
they remain dead; when natural healing is prohibited that adjustment is also irrecoverable.
Natural healing is allowed exactly when No Healing is false and the race is not `RCNoHeal`.
The calculator derives No Healing from supported unit abilities and effects; it does not expose a
separate starting-state override. In the supported recalculation path `EncNoHeal` also derives
`RCNoHeal`, so a race-only control would duplicate state rather than add an independent input.

Warlord Bloodsucker is finalized after every result category and rider has been routed. If the
sum is positive, it triggers once for that `ApplyAttack` call, adds the shipped configured
`BloodsuckerDamage` (2) to result field 8, and—outside simulation—passes the independently shipped
`BloodsuckerHealing` (2) to `Combatheal(attacker, amount, false, true)`. Target display clipping
does not reduce either configured input. This regeneration call heals only recoverable damage,
ordinary before undead, ignores No Healing through `isregen`, and creates no bonus HP. Base CoM2
has no active Bloodsucker effect.

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
apply: +10/+3 in the MoM builds and +12/+4 in CoM 1. The MoM checks are exclusive when
both enchantments are present—Elemental Armor's +10 wins and Resist Elements' +3 is skipped—
while CoM 1 performs two independent checks and therefore stacks +12 and +4. The modern Caster engine keeps the
calculator's narrower elemental scope: CoM2 and Warlord apply the +12/+4 defence to
magical ranged and breath attacks, but not to Immolation or Wall of Fire.

DOS Armor Piercing halves the accumulated Defense with signed truncation toward zero. Defense is
nonnegative at this point, so odd values round down. Immolation cannot inherit Armor Piercing from
its initiating unit: it uses Fireball's own Area-only flag word.

CoM2 and Warlord resolve Immolation and Wall of Fire through `DamageSpell`. Magic Immunity
short-circuits a magical spell to zero damage before any roll. Black Sleep is checked later and
turns the spell into Doom damage, bypassing hit, defense and Invulnerability rolls; the earlier
Magic-Immunity exit still wins. This target-side spell rule does not make a Black-Sleeping tactical
attacker eligible to initiate combat: the calculator returns zero incoming and outgoing damage
before Wall of Fire, retaliation, or counterattack. Other matching spell immunities replace
Defense with 100 rather than exiting.

For an `Area` spell, the engine attacks once per current living target figure and caps each
subattack at the unit's **full HP per figure**. It deliberately does not use the wounded top
figure's remaining HP for that cap; all subattacks feed one aggregate damage total. CoM2 Wall of
Fire and both versions' Immolation use this path. Warlord Wall of Fire has no `Area` flag: it makes
one ordinary attack and sends its surviving damage through a repeated figure-boundary loop. The
first boundary uses the wounded top figure's remaining HP; every later boundary uses full HP per
figure. At each crossed boundary the remainder receives a fresh Defense roll and another
Invulnerability subtraction, repeating until the remainder fits a figure. In Warlord, a present
opposing Amplifier then adds 1 to the first positive damage category; zero stays zero and multiple
Amplifiers do not stack. The resulting damage remains capped by the target's remaining HP.

In CoM2 and Warlord, Wall of Fire does not fire when the tactical attacker's **calculated** record
has Teleporting or Merging. These remain separate card abilities: Teleporting additionally feeds
Warlord Tactician's First Strike grant and is stripped by Temporal Twist, while Merging does
neither. Hierophany strips both before Wall-of-Fire eligibility is tested. Both controls and all
their effects are hidden and inert in MoM 1.31, CP 1.60, and CoM 6.08.

In CoM2 1.05.11 and Warlord 1.5.12.7, **Chaos Conjunction** is one combat-global state affecting
both sides; it is not owned by either unit or army, so Swap leaves it in place. When active, the
shared Immolation spell-ID-99 strength calculation applies Delphi `Trunc(10 * 1.34) = 13` before
damage resolution. Every eligible Immolation firing uses that strength, including either combat
direction and repeated phase/Haste calls. The multiplier does not stack or reapply to an already
scaled firing. It changes no To Hit, Defense, `Area`, immunity, Black Sleep, Amplifier, or damage-
category behavior. Wall of Fire is spell ID 87 and remains unscaled, including Warlord's non-Area
form. MoM 1.31, CP 1.60, and CoM 6.08 hide and ignore the state. The engine also gives active
Chaos Conjunction a separate Warp Lightning bonus, but active spellcasting and Warp Lightning are
outside this one-round calculator's represented attack path.

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
states such as Chosen or Golem are predicates derived when needed, never persisted booleans. The
CoM1 Golem constructor path is retained alongside the modern path and grants `Resist Elements`.
The calculation then applies a version-scoped identity sequence to the fresh live fields. Every
successful CoM 1 combat summon becomes live Fantastic; Paladins become Life, Centaurs and Catapult
become Nature, and all other types retain their loaded race. Modern Chosen/Avatar writes live Life
+ Fantastic and Combat Summoned units become live Fantastic. In base CoM2, a retained Paladins
template (113) marked Combat Summoned is necessarily the result of Call to Arms and additionally
becomes live Life. Base CoM2 Construct Catapult additionally becomes live Nature + Fantastic;
Warlord replaces those enabled spell slots with Spirit of Chivalry and Water Elemental, so its
templates 113 and 37 receive no corresponding race rewrite. Warlord Spirit
Link can later clear only the live
Fantastic predicate while
retaining the base predicate and fantastic-only grants. Casting Spirit Link permanently adds +2
Resistance to the base record before that encounter-time identity sequence. CoM 1 Construct
Catapult also receives Magic Weapons, and Zombies start
with `To Block = -1` (a ten-percentage-point penalty). Display names are not engine predicates;
the base-CoM2 Paladins inference requires both the retained template ID and Combat Summoned.
These writes are version/template
gated and no-op identity writes are omitted from the calculated-stat trace. Identity changes are
seeded into the same ordered trace as the affected calculated outputs, while the source and base
identity fields remain controls/metadata.
Warlord 1.5.12.7 adds one hero-type predicate: Wanderer (`heroTypeId 48`) becomes live Fantastic
in the Channeler-owned Marionette branch during region `b`. This write follows the ordinary
compiled conversions, precedes Xenoveterinary, and does not alter Wanderer's Arcane base race or
base Fantastic predicate. No other version or hero type may consume the Marionette controls.
The card exposes `Hero`, `Fantastic`, and `Base race / realm` as independent editable custom-unit
controls; no combined user-facing `unitType` control is authoritative. The legacy compact token
remains only as an internal compatibility projection for existing preset callers. The
version-gated `Special unit` selector exposes named exceptions (`Other / no exception`, `Golem`,
`Chosen / Avatar`, `Zombies`, and `Catapult` where the selected engine has that path) without
exposing numeric template or hero IDs. Predefined roster units populate and lock all identity
controls. A named special-unit effect is shown at its ordinary point of use: for example, a
selected Golem owns a locked `Resist Elements` Elements value.
Breakthrough is enabled by its combat-global control, but its normal, Combat Summoned, and
Non-Corporeal packages are derived from the direct calculated predicates; exceptional package
labels cannot override those gates. The normal package is +1 melee and +0 Defense; the Combat
Summoned and Non-Corporeal packages are independently +1 melee and +1 Defense, and may stack.

Attack channels remain engine-specific during stat derivation. CoM2/Warlord Animated and Black
Prayer write conventional ranged, Thrown and both Breath fields but not the independent Gaze
fields. Modern Mind Storm subtracts 5 only from conventional Ranged and Thrown, leaving both
Breaths and every Gaze field unchanged. A CoM2 Tactician hero receives +2 melee and +2
conventional ranged only when that live Ranged field is positive at its post-Warp position; it
does not write Thrown, Breath, or Gaze. CoM 1's corresponding write reaches its shared
secondary-attack slot. DOS Metal Fires applies only to a non-Fantastic unit and still does not
stack with Flame Blade.

Warlord True Light runs in phase `b` and writes melee plus conventional Ranged only; both writes
are unconditional, so its Life branch can raise a zero melee field to 1. Its realm package never
reaches Thrown, Breath, or Gaze. The native modern node aura runs later in region
`c`, after global enchantments and before the Moon/combat-global tail. It adds 2 melee when the
persistent/base melee field is positive, even if the live subtotal is not; adds 2 to each positive
live conventional Ranged, Fire Breath, and Lightning Breath field; and adds 2 Defense and
Resistance unconditionally. It never writes Thrown or any Gaze. Warlord combat-cast Flame Blade adds its Fire Breath
point in phase `d`, after the compiled Warp block, creating strength 1 when that field was zero;
Fiery Blade has no such point.

Chaos Channels Fire Breath follows the source unit type's pre-transform attack record. In the DOS
engines, that record is one shared ranged/Thrown/Breath/Gaze slot: the Fire Breath result is
eligible only when its type is None or Thrown and its signed base strength is at most 3 in MoM
1.31 or at most 0 in CP 1.60 and CoM 6.08. An admitted result replaces the shared slot with Fire
Breath 2 in both MoM builds or Fire Breath 4 in CoM 6.08; a rejected result leaves the existing
slot unchanged, so a DOS Gaze never coexists with the Breath. CoM2 and Warlord instead add 4 to
their independent Fire Breath field without suppressing ranged, Thrown, Lightning Breath, or Gaze.

Warlord's script order is also load-bearing for strike flags. Fiery Fury runs in phase `b` and
uses the base-Fantastic predicate for its First Strike grant;
Sanctify runs later in the same phase and always writes live race Life, while its Fantastic write
requires Clergy and excludes heroes. Destiny and the compiled No-Heal conversions run after both,
so their later identity writes win.
Zeal, Temporal Twist, and Tactician then run in that order in phase `d`. Temporal Twist therefore
removes Fiery Fury/Zeal strike grants and Teleporting before Tactician runs. Tactician cannot
restore First Strike from the cleared Teleporting flag, but can restore Negate First Strike from
Non-Corporeal or both strike flags from Favored Terrain. Angelic Guardians grants Exorcise to a
base non-Fantastic unit or a current Life unit when it is absent; its separate existing-Exorcise
branch improves any realm by 2, or Life by 3.

Compatibility code may translate legacy inputs into the live record or project the finished live
record into a legacy shape, but it must not remain an alternate place where engine effects execute.
Any transitional helper that applies or composes multiple ordered identity, ability, attack-channel
or stat rewrites outside the phase-tagged sequence is temporary. As soon as switch-over comparisons
no longer require it, replace its rules with atomic steps at their source-backed positions and
remove the helper. A retained compatibility projection must be pure: it may read the finished
record, but may not contain effect precedence or mutation rules. `determineEffectiveUnitType` and
the corresponding combat-normalization rewrite are the current identity examples of this temporary
pattern.

Order is load-bearing:

1. Ability grants from buildings/enchantments fold in first, so every later read sees
   them (Lava Smelter, Sancta Basilica, Divine Protection, Lucky Star, Pillar of Faith,
   Fortification, Insulation).
2. Magic-Immunity and Illusion-Immunity curse gating is applied.
3. The ordered identity/CAS conversions are applied to live race and Fantastic fields. The
   compact `unitType` value is projected from those live fields only after the sequence, so
   base and live predicates remain available to later gates.
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

   The represented `b`/`c`/`d` steps additionally use the applicable version manifest as an
   explicit source-order sequence. Construction must account for every emitted step exactly once;
   it may not repair an unordered list with a generic sort or silently discard an unlisted step.
   The ordered identity conversions (order item 3) are composed through the same manifests, so an
   identity write in `b` or `d` is accounted for once as well. Ranks are comparable only within one
   sequence: the identity pre-pass runs before the stat sequence, so Spirit Link's live Fantastic
   write executes earlier than its late region-`d` source rank.
   `deriveUnitStats` retains `statExecutionTrace` as the complete append-only execution ledger:
   it has one applied or predicate-skipped event per visited step, carries the manifest's
   `sourceOrder` for represented `b`/`c`/`d` steps, and is asserted against the executed list.
   The public `statTrace` remains the sparse projection: inactive predicates, no-op writes, and
   invalid selections do not create an entry.

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

   To-Hit and To-Defend writes use this same ordered record. In CoM2 and Warlord the record
   keeps one common Hit field plus separate melee, conventional-ranged, Thrown, and Breath
   modifiers. Region `e` first clamps common Hit to 10–100%, then adjusts each channel modifier
   so its sum with that already-clamped common value is 10–100%. These are two ordered writes,
   not one clamp over the pre-clamp sum: common `−50` with a ranged modifier of `+10` resolves
   to 20%, not 10%. Modern To Defend is not clamped in region `e`; its eventual random-threshold
   comparison naturally makes values at or below zero a 0% chance and values above 100 a 100%
   chance. Late aura writes can likewise raise To Hit after its region-`e` clamp; `AttackRoll`'s
   `Random(100)` comparison makes those thresholds a 100% effective chance. The DOS engines retain
   their single effective attack-threshold representation and
   terminal 10–100% clamp.

   Every phase is an engine region — there is no scaffolding left. **Region `a` is narrow**:
   Chaos Channels Fire Breath is its represented attack-strength write; its other represented
   writes are identity/flags. Everything else the pre-map model had booked there has since been
   located in `c`.

**Which script file implements an effect decides its phase.** Game-fiction wording ("combat
enchantment", "trained in the city") does not. A modifier is classified by, in order:

1. Read it out of the region maps in `Reference docs/Caster binary/CoM2 binary
   analysis.md`, *Unit stat recalculation*, which decode `a`, `c` and `e` block by block with
   addresses.
2. Grep the identifier across `Reference docs/Script source/Warlord 1.5.12.7/*.CAS`. In
   `UnitCalcPre.CAS` → **b**; in `UnitCalc.CAS` → **d**, at that file's line order.
   (`DisAbil.CAS`, `DisInfo.CAS`, `AIRes.CAS` and `EnterGame.CAS` are display and AI only.)
3. A raw unit stat, or a value written permanently into the unit's base before the pipeline
   runs — `CreateUnit.CAS`, `OverlandEndTurn.CAS`, or a cast handler writing index 1 (`ABase`)
   in `OLSpell.CAS` — → **base**.
4. Neither map nor script names it → deduce, and mark the step `provisional`, saying from what.

Steps 1–3 are checkable, which is the point; only step 4 is judgment, and it is now the
exception. MoM's `berserk` is the sole remaining provisional placement. City Walls was once
provisionally in `a`, but `ApplyAttack` proves it is the resolution routine's `extradef` input.

**Phase says where in an engine a write happens; scope says which engines make it at all.**
`STEP_VERSION_SCOPES` in `Calculator/steps.js` is the single home for the second fact, keyed by
`phase:id` and covering every phase — `base`, `a`, `b`, `c`, `d`, `e` and the separate
`attackSpecific` lists. Two step objects may share an id when two engines make the same effect
from different regions, which is why the key carries the phase: `b:trueLight` is the Warlord
`UnitCalcPre.CAS` block and `c:trueLight` the DOS region-`c` one. A scope always names its exact
member versions; a family label such as "DOS" or "modern" is not a scope. The To-Hit/To-Block
ledger re-emits stat events as `chance:`-prefixed projections, and a projection inherits the
scope of the step it projects rather than carrying a second copy.

Scope is an upper bound on applicability, not a firing condition: inside its scope a step still
asks `when` whether this unit and state fire it, and outside its scope the engine has no such
write, so the step must never contribute. Two things follow, and both are checked rather than
asserted in prose. Every step entering one of the calculator's sequences must resolve a scope —
there is no default, so an unclassified step fails at composition. And a step that is out of
scope for the selected version must never evaluate its predicate true in it. That complement
does not yet hold everywhere: the region-`c` manifests still park version-exclusive entries in
every version's list, and `base`/`a`/`e` have no filter at all, so a Warlord `CreateUnit.CAS`
write such as Military Workshop is still visited under `mom_1.31` (it writes nothing there,
because its own modifier resolves to zero). Every such case is enumerated per version in
`tools/node_unit_checks.js`, including the steps that would still write a stat, and each list is
asserted for exact equality so it can neither grow silently nor rot as it shrinks.

Scope also hides at call sites, where no per-step predicate can see it: the six
`GetEffectiveResistance` steps and the nine `EffectiveDefense` steps carry no version test and
are CoM2/Warlord-only solely because `buildResistanceContext` and `computeDefenseProfile` reach
them from their modern branch alone. Those two routines therefore assert their own list's scope
against the passed version under the debug switch.

The canonical scope is the authority. The three mechanisms that used to carry the fact between
them keep narrower jobs: a `when` predicate gates firing within scope; a `subgroup` in `data.js`
governs *control* visibility and cannot be per-step, because several controls map to one
`calcKey` (`discipline` and `disciplineWarlord`); and a `PROVENANCE versions=` annotation states
which builds' sources were reviewed for the formula. Every scope entry is initialised from that
annotation and the checks assert the reviewed versions fall inside the scope, so the two cannot
drift. Where the scope is deliberately wider, the write runs in a build the citations do not
cover — `trueLight` under MoM, `nodeAura` under both MoM builds and CoM 1, and `survivalInstinct`
under CoM 1 — and those gaps are listed explicitly so a new one cannot appear unnoticed.

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
- **Charm of Life**, +25% live HP (minimum +1) — the modern compiled block reads `U.hp` after
  Endurance, Lionheart and every earlier HP writer, then adds `max(1, trunc(U.hp / 4))`.
- **Colossal Strength**, +1 + 40% of melee / physical ranged / thrown — `UnitCalc.CAS:1227-1243`
  reads `GetStat` in region `d`, so everything earlier in that file scales and nothing later does.
- **Upgraded Explosive's fire-breath doubling** — `UnitCalcPre.CAS:1074-1078` doubles the
  value standing at its position in region `b`; later phase-`b` writes are not included in that
  doubling. True Light's later block writes conventional Ranged rather than Fire Breath.
- **Holy Armor's `> 5` threshold** (+0x07407) reads Defense after equipment and the earlier
  unit-enchantment blocks, but before global enchantments, combat globals, auras, and curses;
  those later writers cannot flip its +2 Defense / +10% To Defend branch. **Blaze of Glory's
  armor transfer** (`UnitCalc.CAS:1490`) likewise reads the defence standing at its own position.
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

CoM2 **Mislead** and Warlord **Liability** supply Misfortune aura type 10 in region `e`, after
the terminal stat clamps and before Supreme Light. The aura affects the live non-Fantastic unit,
including a hero, and subtracts 1 melee, 1 Defense, and 1 Resistance. It also subtracts 1 from
conventional Ranged when the persistent base record has that slot, but never from Thrown, Breath,
or Gaze. Because the write follows the clamp, an affected zero stat can finish at -1.

Two engines reach the secondary-attack slot differently, so a step's delta names which:

- **`rtb`** — the DOS engines' shared `.ranged` slot. One write reaches conventional ranged,
  Thrown, Breath and both gaze strengths alike; that sharing is why CoM 1's Warp Attack halves
  a gaze, and why DOS Chaos Surge reaches every existing shared-slot attack (except a MoM
  Chaos-Channels Fire Breath that is assigned afterward).
- **`ranged`** — `Caster.exe`'s `unitT.ranged`, which is *only* the conventional ranged attack.
  Thrown, Fire Breath, Lightning Breath and the gazes are separate fields there, so a CoM2
  bonus written to `ranged` never reaches them. The Holy Bonus aura is the case that matters.

Focus Magic follows that engine split when it converts an attack. CoM 1 raises a converted
shared-slot attack to a minimum strength of 3. CoM2 and Warlord preserve any positive Thrown or
physical-ranged strength when moving it to Sorcery magical ranged; only creation from an empty
base ranged slot uses strength 3. The modern ranged branch is independent from its Doom Gaze and
Breath additions: an attack with Breath or Gaze but no base conventional ranged or Thrown gains a
new strength-3 ranged field as well. A calculated phase-`b` conventional-ranged write does not make
the persistent base slot nonempty: Focus's empty-base branch overwrites that calculated field with
strength 3 Sorcery ranged. If Thrown exists and base ranged does not, its live post-level strength
moves to ranged; a later effect may create Thrown again. CoM2 and Warlord both run the
compiled attack-strength package near the head of region `c`, after the level ladder and before
Warp Attack. A newly created ranged field therefore receives no level bonus, while a converted
field keeps the bonus already written to its source channel. Warlord's later phase-`d` script moves
existing Stoning/Death Touch riders from general/ranged to melee/Thrown but makes no ranged,
Breath or Doom Gaze strength write.

Magic, Mithril, and Adamantium weapon material each add 10 percentage points of To Hit to an
eligible melee channel. The DOS builds require positive live melee at the material block; CoM2
and Warlord test positive persistent/base melee. The DOS shared secondary slot receives the same
bonus when its type is Missile, Boulder, or Thrown, except that CoM 1 suppresses this write under
Focus Magic. CoM2 and Warlord instead write non-magical conventional Ranged without a positive-
strength gate and write independent Thrown only when its current strength is positive. Magical
Ranged, both Breaths, and every Gaze receive no material To-Hit bonus. The DOS increment is a
literal 10-percentage-point step; the modern builds read the shipped `MagicWeaponBonusHit=10`
runtime value. DOS applies the material strength/chance package before `BU_Apply_Specials`; in
CoM 1, Flame Blade then adds 2 to the eligible shared ranged slot before Focus Magic converts it
and enforces its minimum of 3. Thus a strength-1 Missile with Flame Blade and Focus Magic ends at
3, not 5. CoM2 and Warlord instead apply Focus Magic near the start of region `c` and
`ApplyMagicWeapons` later in that region, preserving their independent-channel ordering.

The modern opening order is load-bearing: permanent `base` writes → Chaos Channels Fire Breath in
`a` → Warlord `UnitCalcPre` writes in `b` → Destiny → level → Focus Magic in `c`. Destiny doubles
the live melee, conventional ranged, HP, Fire Breath, Lightning Breath and Thrown fields at that
point, then adds 4 Defense and Resistance. It therefore includes earlier permanent, Chaos Channels
and phase-`b` additions, but not level, Focus Magic, Warp or phase-`d` additions. In Warlord region
`d`, Colossal Strength runs before Vampirism. Vampirism adds
`trunc((Thrown + Fire Breath + Lightning Breath) / 2)` to melee, then independently replaces each
positive source field with strength 1; conventional ranged is neither consumed nor reset. Shadow
Strike follows both and adds `1 + trunc(current melee / 3)` to the independent Thrown field,
creating that field from zero even when another attack channel exists.

Warlord Lightning Blade is a permanent creation write that follows Military Workshop/Rocketry.
It assigns Lightning Breath to the current permanent `Thrown + 1` strength and then clears
Thrown. Thus an eligible Workshop Thrown channel keeps its +4 before conversion. When there is
no Thrown channel, Lightning Blade creates or overwrites Lightning Breath at strength 1 even when
conventional Ranged or Fire Breath also exists. The resulting Breath is innate, receives level
bonuses, and is Armor Piercing unless Lightning Resist cancels that piercing at resolution.

The remaining calculator-relevant compiled CoM2/Warlord effects from the sequential-transform
audit are represented at their source positions:

- **Dark Force** adds 10 percentage points to common To Hit and To Block.
- **Heavenly Light / friendly Guardian-node defense** applies to a qualifying unit belonging to
  the defending army, including when that unit initiates the modelled exchange from the Attacker
  card. It adds 1 Defense and Resistance, 1 to an existing base melee channel, and 1 to positive
  current conventional Ranged. It grants the
  calculated magic-weapon flag. A base non-Fantastic, nonhero unit that still has normal material
  weapons also gains 10 percentage points of melee To Hit and of physical conventional-Ranged or
  Thrown To Hit; Breath, magical Ranged, and Gaze do not receive that chance bonus.
- **Bad Moon** subtracts 3 Resistance from a base non-Fantastic unit in combat. **Good Moon** adds
  1 Defense and 1 to positive current melee and conventional Ranged for a base non-Fantastic unit.
  **Nature Conjunction** instead adds 2 Resistance, Defense, positive current melee, and positive
  current conventional Ranged for a base Fantastic unit.
- **Spell Ward** subtracts 20 percentage points of common To Hit, 3 Defense, and 3 Resistance only
  from a currently Fantastic unit whose realm matches the selected city ward.
- The region-`e` numeric controls record the strongest friendly aura value already selected by the
  engine's per-owner/type maximum. **Guiding Beacon** adds that value to positive conventional
  Ranged; **Prayermaster** adds it to Resistance and competes by maximum with Resistance to All;
  **Divine Barrier** adds it to Defense; **Soul Linker** adds it to both To Hit and To Block for a
  current Fantastic unit; and **Leadership** gives a current non-Fantastic unit the full value on
  an existing base melee channel plus `trunc(value / 2)` on positive current non-magical
  conventional Ranged. None of these conventional-Ranged writes reaches Thrown, Breath, or Gaze.

These modern controls and transforms are exact for CoM2 1.05.11 and Warlord 1.5.12.7. MoM 1.31
and CP 1.60 ignore them. CoM 1 uses the distinct Realm Ward and side-maximum formulas described
below; its separate Heavenly Light formula remains planned under F49.

Warlord permanent training writes follow executing `CreateUnit.CAS` even where its prose omits or
summarizes a write, and their gates use the trained unit's base identity before later conversions.
Ludus Agoge adds +1 to an existing ranged-strength field, and Mother
Fungus adds +2. Pillar of Faith adds its full counted building total with no script-side cap.
Natural Selection snapshots Resistance and conventional Ranged before its resource writes.
Nightshade adds the full in-range count to the saved Resistance, so its later write replaces an
earlier Power-mineral Resistance bonus when both are present. Wild Game adds 1 only when the saved
conventional-Ranged field is positive; a later Focus Magic conversion cannot make it eligible.
Dragon Mound unconditionally adds 2 to the independent Fire Breath field and therefore creates a
strength-2 attack when it was empty. The engine admits Energy Cannon by positive persistent Max
Ammo on an eligible Power Engine unit. The calculator deliberately infers that gate from positive
permanent conventional Ranged because the two predicates are identical across the shipped Warlord
roster; Custom units cannot represent a contradictory ranged/ammunition pair.

No hand-built stat sum survives. Blaze of Glory was the last one: in region `d` it reads
current Defense, adds that whole value to melee, and sets Defense to zero. Region-`e` effects
such as the aura pass still run afterward and may add Defense on top of that zero.

### Attack-specific sequences

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
Charmed adds 30 to a hero's Resistance for rolls, including realm-less Poison. Against
Chaos or Nature in the MoM builds, Elemental Armor adds 10 and suppresses the otherwise
applicable Resist Elements +3 when both are present. CoM 1 instead ignores Elemental Armor
on resistance and applies Resist Elements +4 only against Nature.

`EffectiveDefense` is keyed by the incoming attack flags and runs in this order:

1. copy finished Defense plus attack-specific extra Defense (including City Walls: +3 intact,
   +1 damaged, when this attack's target is inside and its source is outside the walls);
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

The DOS City Walls order is different. `BU_Apply_Attack` first obtains the complete
`Battle_Unit_Defense_Special` result, including Illusion, Armor Piercing, and immunities, and then
adds the applicable +1/+3 wall bonus. The addition is therefore not halved by Armor Piercing and
is the only Defense that survives an unresisted Illusion. Immolation and Wall of Fire use the
separate spell-damage path and receive no City Walls bonus.

For unit attacks, Weapon Immunity's modern eligibility input is exactly the attacker's calculated
`EncMagic` flag **or** `ApplyAttack`'s attack-local `magicranged` flag. `magicranged` is true for
magical conventional ranged, both Breaths, and all three Gazes; it is false for melee, Thrown,
and physical conventional ranged. The calculated unit record carries `EncMagic` independently
from final race/Fantastic and weapon-display state. This distinction is observable in Warlord:
Spirit Link asserts Fantastic in region `b`, the compiled region-`c` standing rule therefore
grants `EncMagic`, and region `d` then clears Fantastic without clearing `EncMagic`. The linked
unit no longer counts as Fantastic for targeting but its physical attacks still bypass Weapon
Immunity. King/Ruler of Underworld suppresses only the material-derived grant made by
`ApplyMagicWeapons`. Independent writes survive on either side of that call: Wall of Fire's
garrison write precedes it, while Flame Blade and the standing Fantastic rule follow it.

The subsequent CoM2/Warlord defense roll changes probability after the fifteenth defense die.
Dice 1–15 use the unit's ordinary To Block. Dice 16 onward use the lower of that chance and 30%,
and the calculator combines those independent binomials exactly.

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
penalty is a third, later write after Tactician. Supreme Light and the Tactician retort likewise
have version-specific positions. The modern binary runs Focus Magic at `+0x00D3F`, near the head
of `c` and therefore *before* Warp in both CoM2 and Warlord. CoM 1's Focus Magic position is
deduced rather than read: the list of what its recompute writes after Warp is exhaustive and does
not contain it.

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
has no such gate, so those attacks take its full `ranged` column. CoM2/Warlord instead write no
level strength to Death, Stoning or Doom Gaze: the three independent modern gaze fields are absent
from `ApplyLevelBonus`.

The arithmetic is signed at these sites. CoM 1 Warped Attack uses an arithmetic byte shift, so
negative melee/shared-ranged values round downward; CoM2/Warlord Warp Attack uses signed `/2` and
truncates toward zero. CoM 1 Warped Defense uses signed `/3` and also truncates toward zero
(`0x90749..0x90795`). These distinctions are observable because later writes can occur before the
terminal clamp: a negative pre-Warp CoM 1 Defense can receive Supreme Light and Tactician writes
at full value before that clamp.

Darkness preserves each engine's channel gates. The DOS Death bonus and both modern race branches
modify only positive attack channels; modern Darkness never writes the independent gaze fields.
The modern Life penalty also requires positive Defense and Resistance, while the Death bonuses to
those two stats are ungated. Eternal Night makes the modern Death attack/Defense package run twice,
but the Life penalty remains a single write; Resistance changes once for either race. Modern Chaos
Surge similarly requires a base melee attack, requires a positive Breath strength, omits Thrown and
gazes, and uses the current ranged type as the ordinary ranged gate.

Warlord Beat of Swiftness subtracts `%R(current Defense / 10)` in phase `d`. `%R` is the script
language's nearest-integer operation (Delphi ties-to-even), so Defense 5 loses 0 and Defense 25
loses 2; this is not equivalent to flooring 90% of Defense.

### CoM 1 late battlefield and side modifiers

CoM 1 Supreme Light's side and active-status gates are followed by five alternative unit gates:
live magical ranged type, Life race, nonzero mana, persistent Focus Magic, or a magical base
ranged type. Modern CoM2/Warlord retains those alternatives except the separate persistent Focus
Magic test: its live/base ranged checks already observe the recalculated record. CoM 1 then adds 2
melee unconditionally, adds 2 shared ranged only when positive, and adds signed live
`Resistance / 3` to Defense. Its additional `Move_Flags 0x0100` write remains unidentified under
Q20.

Realm Wards map city-enchantment slots 9–13 to Nature/Sorcery/Chaos/Life/Death and subtract
20% To Hit, 3 Defense and 3 Resistance from a matching Fantastic unit. Q19 records the shipped
helptext's conflicting −4/−4 claim. The per-unit Realm Ward selector records the applicable
defending-city enchantment and exists only in CoM 6.08.

The relocated pre-Heavenly-Light tail consumes three per-side hero maxima. Guiding Beacon adds
to positive conventional ranged (`0 < ranged_type < 100`), Divine Barrier adds Defense without a
unit gate, and Soul Linker gives Fantastic units `ceil(v/2)` To Hit and `floor(v/2)` To Block.
Each unit card records the strongest friendly side value. These writes follow the node/Guardian
package and precede Heavenly Light, the curse/Warp tail, and the terminal clamp. The controls are
hidden and inert in MoM 1.31 and CP 1.60; CoM2/Warlord reuse the same controls for their later,
full-value aura formulas described above.

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
gaze and touch save modifiers and their To Defend value, each an independent field. Maximum
ammunition remains outside the card and one-round model.

Modern roster `to_hit` and `to_block` values are percentage-point deltas above the common 30%
base shown on the card. Selecting a CoM2 or Warlord unit loads both deltas into the card and matrix
derivation paths; an omitted field means the default 30%. The DOS rosters have no per-template
To Block field, so their cards retain the ordinary zero delta.

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
received side stays an enchantment input and the two max together. Dispel Evil, CoM 1 Exorcise,
and Destruction dispatch with the touch riders but take literal modifiers (−4, −3, and 0)
rather than the byte, so they stay ordinary ability rows rather than joining the card block.
CoM2/Warlord Exorcise instead uses its independent entered value. Exorcise is hidden in the MoM
versions, which have Dispel Evil instead, and Dispel Evil is hidden from CoM 1 onward.

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
  Its attacks also gain Poison 1. These gates and writes inspect the independent permanent
  attack channels, so qualifying Ranged, Thrown, and Fire Breath effects coexist; the complete
  package precedes Lightning Blade's later Thrown-to-Lightning assignment.
- **Explosive:** a non-fantastic or Sapiens unit with melee or Flying derives
  **Bombs&Grenades**, adding `floor(8 − maximum figures / 2)` Thrown strength and Wall
  Crusher. A unit that also derived Blackpowder gets the **Upgraded Explosive** branch:
  +2 physical ranged strength, or Fire Breath doubled at its `UnitCalcPre` point in phase b,
  before later phase-b effects.
- **Heat Power Engine:** permanently Mechanical units derive **Power Engine**.
- **Magitek Engineering:** Power Engine units gain +20% To-Defend and Large Shield.
- **Temporal Engineering:** Power Engine units gain Haste. If also Sailing, they derive
  **Temporal-Gravity Drive**, Flying, and Illusion Immunity.
- **Energy Beam Weapons:** eligible non-fantastic soldiers derive **Energy Weaponry**, so
  melee and counter-attacks deal Doom damage. Power Engine units with positive permanent
  conventional Ranged also derive **Energy Cannon**: Beam,
  `floor(current permanent ranged / 2)` additional ranged strength, ranged Doom damage, and
  ranged-record Destruction at −1 resistance per full 15% permanent Ranged To-Hit. Those derived
  riders do not apply to melee, Thrown, Breath, or Gaze attacks. Beam is magical ranged, but Magic
  Immunity does not stop its Doom damage.
- **Psycho Converter:** eligible non-fantastic soldiers derive **Psycho Force**; To-Hit and
  To-Defend each gain `floor(current Resistance × level rank / 2)` percentage points.
- **Pneuma Reactor:** eligible non-fantastic soldiers derive **Pneuma Field**, granting
  Life Steal at `−floor(current Resistance / 2)` and stacking with an existing negative
  Life Steal modifier.
- **Xenopsychology / Radio / Ballistics Training:** non-fantastic units and Sapiens
  fantastic units gain, respectively, +1 Resistance; +10% To-Hit, +10% To-Defend and
  +1 Resistance; and +20% Ranged, Breath and Thrown To-Hit. These are phase-b combat effects.
- **Xenoveterinary:** currently fantastic units gain +10% To-Hit and +25% HP (minimum +1). Its HP
  increase is phase b and reads the base+a HP subtotal. Channeler-owned Wanderer becomes Fantastic
  earlier in the same script pass and therefore qualifies; a strayed Wanderer does not.
- **Magitek Science:** derived Armorclad units gain Resist Magic. Both prose sources also
  name Battle Armor, but the executing scripts grant it only alongside the permanent
  `EncArmorClad` flag; the transient Battle Armor branch receives no grant.
- **Military Drilling:** newly trained non-fantastic units have permanent overland
  Discipline; the calculator represents that landed permanent state. Its Mechanical
  below-half-HP healing clause is out of scope.

The shared soldier gate admits non-fantastic non-Mechanical units, heroes, and Armorclad
Mechanical units; it rejects fantastic units. **Sapiens** remains a roster eligibility tag,
generated from Warlord `Custom13=14`.

### Warlord Marionette package

The Marionette controls exist only in Warlord 1.5.12.7 and are inert unless the selected roster
unit is Wanderer (`heroTypeId 48`). With **Channeler owner** enabled, `deriveUnitStats`:

- makes Wanderer live Fantastic, adds `floor(Base skill / 30)` to melee and conventional ranged,
  and adds `floor(Base skill / 50)` Armor;
- creates or rewrites conventional ranged from the selected primary realm: Nature `magic_n`,
  Sorcery `magic_s`, Chaos `magic_c`, Life `magic_n`, or Death `magic_c`;
- reports the unascended spell Web / AEther Sparks / Fire Bolt / Healing / Life Drain and
  `1 + floor(primary books / 2)` charges; and
- grants book-threshold abilities independently in every realm: at 2/3/5 books, Nature grants
  Forester+Mountaineer / Poison Immunity / Stoning Immunity; Sorcery grants Large Shield /
  Missile Immunity / Resist Magic; Chaos grants First Strike / Fire Immunity / Lightning Resist;
  Life grants Healer / Illusion Immunity / Lucky; Death grants Cold / Death / Weapon Immunity.

**Ascension** changes charges to `max(1, floor(primary books / 2))`. Without Conjurer, the spell
becomes Ice Bolt / Psionic Blast / Lightning Bolt / Exaltation / Syphon Life; with Conjurer it is
Water Elemental / Phantom Beast / Fire Elemental / Unicorns / Werewolves. The primary-realm
combat package is respectively Poison 10 + Stoning Touch −2; Counter Immunity + Illusion; Wall
Crusher + Armor Piercing plus Chaos ranged type 30; Exorcise −4 + Bless; or Blood Sucker + Create
Undead. These attack flags are general flags, so the normal dispatcher supplies them to every
eligible attack phase rather than only the generated ranged attack. At 5+ books, Ascension also
grants Nature Regeneration +2, Sorcery Invisibility, Chaos Destruction 0, Life Healing Aura, and
Death Life Steal −1. Regeneration, healing, spellcasting, and post-combat Create Undead have no
one-round resolver effect, but remain visible in the returned `marionette` package metadata.

Without **Channeler owner**, Wanderer takes the strayed branch and exposes the persistent package
Transmute Equipment, Rebuild, Sage, Mechanical Master, Ritual Master, Charmed, Arcane Ward, and
Spell Lock. Transmute Equipment then adds +2 melee, +2 conventional ranged, +2 Armor, and +1
Resistance before Rebuild adds its own +2 melee/+2 Armor and makes Wanderer Mechanical. The
roster's latent Chaos ranged type 30 turns Transmute Equipment's +2 ranged write into a strength-2
`magic_c` channel. Charmed feeds its existing resistance-roll implementation. Sage, Ritual Master,
Arcane Ward rank 2, and Spell Lock have no one-round damage effect on Wanderer; Mechanical Master
rank 2 is retained as package metadata for its side-wide effect on base-Mechanical allies. Spell
Lock's one-time guard is projected as the already-landed persistent result, not as a user-selectable
reapplication toggle.

The five Warlord Lava Smelter controls record independent permanent mineral-pair grants carried by
the unit. New Dwarf units receive grants when trained; **Upgrade & Retrain** can apply them later
to any existing non-fantastic unit, so the controls do not independently enforce the unit's race
or hero status. Fantastic creatures are ineligible. All applicable grants can coexist. In
particular, Resist Elements and Elemental Armor remain separate flags and both defense bonuses
apply. **Fiery Blade** grants +3 melee, adds +2 Missile/Thrown, bypasses Weapon Immunity, and does
not stack its bonuses with Flame Blade's corresponding bonuses.

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

Every source-authored game formula that derives, writes, replaces, scales, clamps, or gates a
unit/combat stat has an adjacent `PROVENANCE[id]` comment. `VERIFIED` names applicable versions
and narrowly cites the implementation gate, arithmetic, and any loaded table value. `UNVERIFIED`
records the live gap and strongest pointer without presenting implemented behavior as established
source fact. `npm run provenance` enforces classification, source/anchor integrity, version and
table coverage, and reconciliation with the live backlog.

## UI contract

- Two symmetric panels (attacker `a`, defender `b`) with identical stat and ability
  controls; `#swapBtn` exchanges them.
- Result panels show, per side, the damage distribution and the chance the unit is
  destroyed; the melee breakdown grid shows one row per phase in resolution order.
- **Matrix mode** computes attacker-vs-whole-roster ratios in Web Workers. Custom and roster
  rows enter the same R8 identity-aware `deriveUnitStats` boundary as the main card. The main
  thread sends those fully derived, identity-dependent stat records to the workers; workers
  call the same `resolveCombat`, and any divergence is a bug.
- Each panel is split into two titled sections. **Base stats and abilities** holds the
  editable stat fields and the unit's abilities. **Enchantments and conditions** holds the
  level, weapon and armour selects and damage already taken, followed by the enchantments.
  The dividing rule is whether the value is roster-owned or chosen per battle — which is
  also exactly the set that stays editable when a predefined unit locks the stat fields.
- The stat fields hold **pre-level** values. Experience level is applied downstream as an
  ordinary transform step, so no code path may write a level bonus into a card field.
  Changing Level on a Custom unit preserves every editable card stat and base-identity control;
  only the downstream effective-stat transform changes.
  Effective values appear only in the modifier column. That column shows one final modified
  number; it does not reproduce the games' plain/gold or grey/gold presentation tiers.
- Hovering a final modified value shows the complete chain that produced it: the editable base,
  then every applied transform with its source and running value before and after the write, and
  finally the displayed result. The chain follows the applicable binary/CAS execution order, not
  UI grouping or effect name. It must be emitted from the same ordered transform path that computes
  the value rather than reconstructed independently after calculation. The existing touch-device
  tooltip interaction exposes the same information where hover is unavailable.
  `deriveUnitStats` exposes that path as `modifierTraces`: one projection per calculated output
  with `{base, entries, result}`, where every entry carries its source, phase and running
  `{from, to}` values. Percentage traces use displayed percentage points. Race and Fantastic use
  their editable base identity and calculated live identity; modern Ranged, Thrown, Fire Breath
  and Lightning Breath each retain their own strength projection. Inactive predicates, invalid
  selections and writes which leave the output unchanged produce no entry. The shared atomic
  `statTrace` remains available so one engine write which affects several outputs is still one
  event rather than duplicated computation.
  Permanent writes which prepare the base record before the scratch-record sequence are captured
  at their own application sites. The later `stat:base` seed is therefore not presented as their
  source; channel-creating writes such as Shadow Strike still begin at editable zero strength.
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
- Presets may supply the R8 base identity as `{isHero, baseRace, baseFantastic, specialUnit}`.
  Historical preset callers that supply `unitType` are translated once at this boundary. An
  explicit R8 identity wins over that legacy token, while a predefined roster selection always
  keeps the roster's own source/base identity.

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
  selections are migrated to the corresponding independent M6 grant flag.
- A share link carries the same blob in the URL fragment (`#s=…`) and takes precedence
  over `localStorage` on load.
- Restoring is order-safe: version first (which repopulates rosters and ability panels), then
  roster/source identity, then editable controls, then locking and visibility.
- A corrupt local blob degrades to clean defaults and is discarded so it cannot throw on every
  reload. A corrupt share blob is stripped and falls back to the recipient's local state.

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

- Marionette Ascension models Conjurer's spell substitution and every direct realm/book grant;
  its remaining retort-to-hero-template ability rewrites wait for the shared hero progression and
  template-ability model (**F41**).
- Destruction is modelled only for CoM2/Warlord; the older-engine hero path remains absent (**M3**).
- Heroes use normal-unit level controls rather than the DOS eight-threshold and modern nine-step
  hero ladders and their level-scaled template abilities (**F41**).
- Ammunition is omitted because one engagement has no multi-turn shot budget.
- Regeneration is omitted because it is between-turn healing.
