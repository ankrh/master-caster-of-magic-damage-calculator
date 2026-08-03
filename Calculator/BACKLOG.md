# Calculator work register

The single list of outstanding calculator work. Every item has an ID, a status and a pointer to
where its **evidence** lives — this file tracks *what is left to do*, never the analysis behind it.
Behaviour is in [SPEC.md](./SPEC.md); working conventions in [CLAUDE.md](./CLAUDE.md).

Nothing here is a source of truth about the engine. When an item names a finding, the finding's
home file wins.

## Evidence homes

| Short name | File | Owns |
|---|---|---|
| **queue** | `Reference docs/MoM CoM binary verification queue.md` | claims resting on prose or inference, per engine (A–C = DOS builds, D = CoM2/Warlord) |
| **MoM analysis** | `Reference docs/MoM binary analysis.md` | findings read out of `WIZARDS.EXE` |
| **CoM2 analysis** | `Reference docs/Caster binary/CoM2 binary analysis.md` | findings read out of `Caster.exe` |
| **Caster reconstruction** | `Reference docs/Caster binary/` | the `.pas` files there: address-backed Pascal-like reconstruction of the unit-enchantment/ability and combat-damage flows in `Caster.exe`. Its `README.md` owns the binary's path, md5 and size |
| **DOS reconstruction** | `Reference docs/DOS reconstructed/` | address-backed C++ reconstruction of the same flows in MoM 1.31, MoM CP 1.60 and CoM 1 |
| **CoM2 tables** | `Reference docs/CoM2 data tables.md` | findings read out of CoM2's and Warlord's `.INI` tables |
| **TODO** | `Reference docs/TODO.md` | open mechanic questions, prose-vs-prose conflicts |
| **discrepancies** | `Reference docs/Source discrepancies.md` | Warlord script-vs-prose conflicts |
| **SPEC** | [SPEC.md](./SPEC.md), *Known modelling limitations* | limitations the calculator deliberately carries |

## Vocabulary

**Status** — `open` · `in progress` · `blocked` (waiting on a person, not on work) ·
`accepted` (a limitation we have decided to live with).
**Cost** — `free` (grep a script or a data table) · `small` · `medium` · `large`.

---

## 1. Priority order

This section is the single home for prioritisation across all outstanding work — the queue no
longer carries its own suggested orders.

| # | Item | Why here |
|---|---|---|
| **1** | **R5** | Reconstruct the relevant `Caster.exe` source flow. Its TD32 procedure/local names make this the highest-leverage way to preserve binary understanding for future agents; completion normally requires Codex and Claude to derive the flow independently — derivation mode, `CLAUDE.md` § *Two agents*. R5.1c-c and R5.2a–R5.2m record user-directed single-agent exceptions while Claude was unavailable; R5.1c-b has two independent derivations but only received its reciprocal Claude review afterwards, on 2026-08-03. Both R5.1c rows have now been formally reviewed by Claude. R5.C's initial 2026-08-03 closure was reopened after the reciprocal review found R5.2g's non-area spill loop had been flattened; Claude confirmed the corrected loop shape from the cited bytes, Codex applied the reconstruction and downstream-document correction, and AKH directed R5.2g and R5.C closed on 2026-08-03. Each R5.2 derivation still rests on one agent, so R5.G remains the independent check and the only open R5 completion gate. |
| **2** | **R6** | Reconstruct the equivalent flows in MoM 1.31, MoM CP 1.60 and CoM 1. This is larger and less symbol-rich than R5, so it is split by build and subsystem; each split is likewise derived independently by both agents. |
| **3** | **R3** | The engine-shaped attack record. It is a *data-correctness* item, not a modelling-purity one: 29 Warlord roster units lose a whole attack today. It also unblocks F12 and is a precondition for F17, F18 and F20. |
| **4** | **R4** | The engine-shaped unit card, right after R3 because it touches the same call sites. Widened 2026-07-31 from gaze representation alone to the whole per-version card field set; the MoM set is settled there, the CoM2 set waits on R3. No known wrong number — the goal is that the inputs, field names and encodings match each engine's own, so findings land without translation. Bears on D21 and Q9; carries M7. |
| 5 | **A31** | The cheapest item left in section A; MoM's six increment sites are all that remain. |
| 6 | **F7** | Deferred by decision on 2026-07-29. It is a known-wrong approximation with the exact rounded formula now read from `ApplyAttack`. Q14 was settled by R5.2e and its implementation defect is F32. |
| 7 | **D1, D3** | The resistance and defence routines are now decoded in execution order (**CoM2 analysis**, *Resolution-time modifiers*). D3 is down to Righteousness alone; D4 closed in R5.2c and D7 in R5.2e. |
| 8 | **D8** | Its write sits in an enchantment-ID-keyed recompute that has to be located first. |
| 9 | **B4, B7, B9** | Foundational damage and rider behaviour on the DOS side. |
| 10 | **D2, D18** | Structural rather than numeric; each changes more than one number. |
| 11 | **F3–F6, F12–F39** | Confirmed calculator defects and the transform-completeness audit. R3 unlocks several of F13–F20; F6 still needs its eligibility trace. F21, F33–F35 and F37–F38 are small, self-contained fixes outside that dependency chain; F32 needs a split defense distribution. F36 is medium; F39 needs a Chaos Conjunction combat-global input. |
| — | Everything else | Opportunistically, as the owning routine comes open. |

*(The **data-table sweep**, formerly item 1, was completed on 2026-07-29. It closed D13, D15 and
D5's rate outright, plus the magnitude halves of D2, D4, D6, D7, D12 and D14 — nine entries or
half-entries for one free read. Findings in **CoM2 tables**. It also opened F7, Q14 and D27, and
produced evidence bearing on F6.)*

**Two notes on estimating.**

*Cost.* The data-table sweep came in far under its billing: entries costed `small` and `medium`
across section D fell to a single `grep` because the value was simply stated in a table. Before
opening `Caster.exe` for any numeric constant, check `MODDING.INI` and `SPELLS.INI` first.

*Independence.* R1 and section D's **ordering** entries are not separate items whose costs add —
they are one pass with a precondition. A large share of R1's `large` tag is work this register
already owns under D21–D26; the refactor mostly determines whether that work can be recorded at
all. Section D's *numeric* and *touch-effect* entries are genuinely independent of R1 and are not
blocked by it.

---

## 2. R1 — restructure stat derivation into a sequence of transforms

**Status: complete (2026-07-29).** The step sequence is the calculator's only stat-derivation
mechanism, every step stands where the region maps put it, and `tail` and `warpLate` — the two
scaffolding phases — are gone. The rationale, staging and the seven settled design decisions
are in [Appendix A](#appendix-a--r1-staging-plan); that appendix is this item's only home.

Closed with it: **D22, D23, D24, D25, Q7 and M4.** Stages 11 and 12 — the two *resolution*
sequences — were always a separate axis and are now the register's item R2, below.

| ID | Stage | Status |
|---|---|---|
| ~~R1.0a–R1.0c~~ | ~~Stage 0: hook sites, granularity, Warlord line-order sweep~~ | **done** |
| ~~R1.1–R1.2~~ | ~~Machinery, equivalence harness, benchmark~~ | **done** — `Calculator/steps.js`; `tools/bench_derive_unit_stats.js` |
| ~~R1.3–R1.7~~ | ~~Migrate `res`, `def`, `atk`, `rtb`, `hp` and the two gaze strengths~~ | **done** |
| ~~R1.8~~ | ~~Delete the buckets, the harness; rewrite SPEC~~ | **done** |
| ~~R1.9~~ | ~~Convert `getAbilityStatModifiers` to emit steps~~ | **done** — `getAbilityStatSteps`; **M4 closed** |
| ~~R1.10~~ | ~~Encode the mapped sequence~~ | **done** — see the table below |

### What stage 10 moved

Every row is a position read out of the region maps, not a magnitude. Nothing here changes what
a modifier is worth; it changes what has already happened when the modifier lands.

| Step | Was | Now | Observable consequence |
|---|---|---|---|
| the three **Warps** and **Shatter** | `tail`, after everything | end of `c` (`+0x0BA3C`–`+0x0BF62`) | **D22.** The whole of `d` and `e` now lands at full value on the reduced stat: Colossal Strength scales the *halved* attack, Tactician and the aura pass are not halved at all |
| **Holy Bonus** | `a` | `e`, aura type 1 | **D23.** Not halved by Warp; and it writes `Caster.exe`'s narrow `ranged` field, so a Thrown or Breath attack takes none of it |
| **Resistance to All** | `a` | `e`, aura type 3 | **D23.** Same position change; the max-merge with Prayermaster is unobservable until a Prayermaster control exists |
| **Supreme Light** | `c` (CoM2) | `e`, after the aura pass | **D24 + Q7.** `defense += resistance / 3` is now a live read, so Warp Resist having zeroed Resistance contributes nothing |
| **level ladder**, **hero ladder**, **weapon material** | `a` | `c` (`+0x00D16`, `+0x0139A`, `+0x04B90`) | **D25.** Xenoveterinary's +25% HP and Upgraded Explosive's fire-breath doubling, both region `b`, no longer compound them |
| **Tactician** | `a` | `c`, after Warp (`+0x0C890`) | D25's other half; the retort is not halved |
| **Focus Magic** | `d` | `c` (`+0x00D3F`) for the binary; `d` for Warlord (`UnitCalc.CAS:515`) | Halved by Warp in CoM 1 and CoM2, not in Warlord |
| **Holy Armor** | `tail` | `c` (`+0x07407`) | Its "armor above 5" test no longer sees the node aura or any curse |
| **Blaze of Glory**, **Beat of Swiftness**, **Hierophany** | `tail` | `d` (`UnitCalc.CAS:1490`, `:1509`, `:1556`) | All three follow Colossal Strength and the Warps |
| **Lucky**, **Guardian retort** | `a` | `c` (`+0x044C7`, `+0x0B092`) | None — nothing between the regions reads Resistance, To Hit or To Defend |
| **the two clamps** | `tail` + `warpLate` | one, at the head of `e` (`+0x0CCBC`) | The aura pass and Supreme Light are *not* clamped after, which is why they can exceed what a clamp would allow |
| **Berserk** | `tail` | `c`, before the Warps | None — same relative position, and MoM's recompute is undecoded, so the step stays `provisional` |

**Tests.** Eight new presets in the `Stat derivation order` group, one per finding plus two
controls; each is built so the *previous* ordering gives a different number, and each names that
number in its `desc`. 919 presets, 205 Node checks, 32 Playwright — all green.

**One placement is deduced rather than read**, and is marked `provisional` in the list: MoM's
`berserk` (MoM's recompute is decoded only from Prayer onwards). City Walls was resolved
2026-07-29 as `EffectiveDefense`'s `extradef` input, not a derivation step. CoM 1's Focus Magic
position is deduced too, but from an exhaustive
list — *MoM analysis* gives the complete set of what CoM 1 writes after Warp, and Focus Magic
is not in it.

**Performance** (`tools/bench_derive_unit_stats.js`, mean over five representative units):
33.3 µs/call before R1, 42.3 after stages 1–8, 40.8 after stage 9, unchanged by stage 10. The
harness is noisy on the current machine — repeated runs of the same build span 41–52 µs — so
treat differences under ~20% as nothing, and note that a function call inside its `vm` context
costs ~107 ns, which over-weights call count by about two orders of magnitude against a browser.

### Scope: 6 + 1 axes, one mechanism

The sequence is **CoM2-shaped by default**; MoM, CoM 1 and Warlord are divergences from it. Base
CoM2 ships `UnitCalcPre.CAS` and `UnitCalc.CAS` as stubs, so regions `b` and `d` are empty there
and `a → c → e` run back to back — the minimal case as well as the best-evidenced one. Warlord
inserts `b` and `d` at two known addresses; MoM and CoM 1 collapse to a single sequence because
`b` and `d` are empty for them too, and differ mainly in where Warp sits.

**Derivation** — `Base`, `a`, `b`, `c`, `d`, `e`. Runs once per unit, produces the stat block, and
is the **sole** source of the UI's displayed modifier numbers. That cut is the engine's own, not a
display convention: the resolution routines accumulate into a local and never write back to the
unit record, so they cannot reach the displayed block.

**Resolution** — same step type, same runner, evaluated per *(defender, attacker, attack type)*
rather than per unit. Two separate sequences, not one, since they are keyed differently:

| Sequence | Steps | Keyed by |
|---|---|---|
| `@Units@GetEffectiveResistance` | 6 | realm (1–5) |
| `@Units@EffectiveDefense` | 9 | ~10 attack-type flags |

These belong in the step model rather than beside it. `EffectiveDefense` is ordered short-circuit
(Illusion returns at step 2), additive (3–6), halving (armour piercing at 7, *after* the
additions), replacing (six immunity assignments at 8, discarding everything prior) and then
additive again on top of the replacement (Weapon Immunity at 9). That is the same non-additive
vocabulary as Warp, Shatter and Berserk, and the reason a second hand-rolled mechanism for it
would reproduce the very problem R1 exists to end. Today it is a chain of conditionals in
`computeDefenseProfile`.

**Out of scope entirely.** The other seven resolution-time enchantments — Spell Lock, Stasis
(combat and overland), Buried, Necromancy, Regeneration, No Heal — are not stat transforms at
all. They are gates and events read by `@Spells@DispelMagic`, `@Units@Immobile` and
`@Combat@Combatend`. Nothing to sequence; they stay where they are.

### Ordering defects R1 absorbed — all closed 2026-07-29

Five findings where `Caster.exe` was known to disagree with the calculator's ordering. Four were
positions and are now encoded; the fifth was never really an ordering question.

| ID | Finding | Outcome |
|---|---|---|
| ~~D22~~ | Warp runs mid-region `c` (+0xBA3C); everything after it is added at full value | **fixed** — the Warps and Shatter are the last steps of `c` |
| ~~D23~~ | The aura pass runs after `d`; sources merge by maximum, and Resistance to All shares aura type 3 with Prayermaster | **fixed** — both are region-`e` steps. The max-merge has no observable consequence until a Prayermaster control exists, and the single numeric input already expresses "highest source only" |
| ~~D24~~ | Supreme Light is post-Warp **and** post-aura-pass, reading resistance after the aura pass | **fixed**, and it closed **Q7**: the read is live |
| ~~D25~~ | Level, hero and weapon bonuses are `c`, not `a` | **fixed.** The execution-order check it was waiting for is in **CoM2 analysis** already: `ApplyLevelBonus` runs between Destiny's transformation and Focus Magic, which is stated there as direct execution-order evidence |
| D26 | The Chosen is forced `RCLife` + `Fantastic` by region `c` | not an ordering item — tracked as **F4**, a wrong output today |

---

## 2b. R2 — the two resolution sequences

**Status: complete (2026-07-29).** Both routines now use the R1 step type and runner on a
discarded scratch copy, with a `resolution` axis marker rather than a sixth derivation phase.
`EffectiveDefense` is evaluated only for attack types that can fire in the current exchange;
`GetEffectiveResistance` is evaluated by realm, including the realm-less Poison path.

| ID | Item | Settles |
|---|---|---|
| ~~R2.1~~ | ~~`@Units@EffectiveDefense` — 9 steps keyed by the incoming attack~~ | **done** — Illusion halts at step 2; Armor Piercing halves steps 3–6; immunity replaces at step 8; Weapon Immunity adds after it at step 9 |
| ~~R2.2~~ | ~~`@Units@GetEffectiveResistance` — 6 steps keyed by realm~~ | **done** — the assignments precede the additions; Charmed is now representable and applies to rolls without changing the displayed stat |

The remaining D1/D3 question about Righteousness and D2's Weapon-Immunity **eligibility**
question stay open; R2 encodes their current classifications in the established sequence
positions without claiming those gates are resolved.

**Tests.** Three browser presets cover Charmed against realm-less Poison, Illusion's early
return with City Walls, and Weapon Immunity stacking after Missile Immunity. Direct Node checks
also assert the exact trace order, values above 100, `halt`, and scratch-copy non-mutation.
923 presets, 215 Node checks, 32 Playwright tests — all green.

---

## 2c. R3 — the engine-shaped attack record (four channels)

**Status: open. Priority 3. Cost: large.**

**What to build.** For CoM2 and Warlord, a unit card carries **four separate attack-strength
inputs** — `ranged` (with its `rangedType`), `thrown`, `fireBreath`, `lightningBreath` — instead of
today's single `rtb` value plus the derived `rangedType`/`thrownType` pair. All four are fields of
the record `runStatSteps` mutates, so every engine write lands on the channel it actually writes
and each is read at its own position. MoM and CoM 1 keep one shared slot: those engines genuinely
have a single `.ranged` field that ranged, Thrown, both Breaths and the gazes all share
(`combat.js:263-266`), so the current model is faithful there and must stay.

**Why the engine's shape is four fields.** `MASTER.CAS` gives them as distinct stats — `SAttack`=12,
`SRanged`=14, `SFireBreath`=36, `SLightningBreath`=37, `SThrown`=40 — and the battle-unit record
lays them out separately at `+0x20` melee, `+0x24` ranged, `+0x28` ranged type, with thrown and the
two breaths at `+0x2C`/`+0x30`/`+0x34`. There is exactly one type field in the whole stat table,
`SRangedType`=27; the calculator's `thrownType` is not engine state at all but a projection of
*which* of three fields is non-zero onto one slot.

**This is losing data today, before any enchantment.**

| Roster | Units carrying >1 of the four | Notes |
|---|---|---|
| CoM2 (201 units) | **0** | the single slot is empirically safe for CoM2 *roster* data |
| Warlord (364 units) | **29** | one of them, Elementalist, carries two breaths *and* a ranged attack |

Two independent losses in the pipeline:

- `tools/generate_warlord_units_json.py:219-226` is an `elif` chain, so only one of Thrown /
  FireBreath / LightningBreath survives generation. The Elementalist's `LightningBreath=8` never
  reaches `units_warlord.js`.
- `predefinedUnitRtb` (`ui.js:2437`) then prefers `ranged` and discards the surviving
  thrown/breath entirely — frequently the larger attack: Musketeers keep Ranged 5 and lose Thrown
  9; Great Aether Lord keeps Ranged 18 and loses LightningBreath 21; Steam Tank keeps Ranged 12 and
  loses FireBreath 14.

**And derived co-occurrence reaches base CoM2, not just Warlord.** Three engine writes add a
channel with no exclusivity gate: Chaos Channels fire breath `firebreath += 4` (region `a`,
`+0x005C8`–`+0x00688`, exact — so a CoM2 Barbarian with `Thrown=5` ends with thrown 5 *and* fire 4,
and `CCRangedFBAllowed=0` gates *ranged* attacks, not thrown); Shadow Strike
`SThrown += 1 + %I(SAttack/3)` with no breath test (`UnitCalc.CAS:1265-1266`); and the heavy-unit
Flying replacement `SThrown += 1` for unit ids 189/260/261/331 (`:1278-1288`), two of which already
carry `Ranged`. Four further sites show the engine assumes multiplicity throughout: Vampirism sums
`Thrown/2 + (Fire + Lightning)/2`, Inner Power writes fire and lightning "where each is already
positive", Darkness adjusts five channels independently, and the region-`e` clamp clamps all five
separately.

**Scope notes.** The four *type* strings collapse to one (`rangedType`); the ~112
`rangedType`/`thrownType` reads in `stats.js` and ~55 in `combat.js` become positional reads on the
record rather than consts computed before the sequence. Reach for the SPEC's *one sequence, one
record* rule when splitting a write: where the engine writes type and strength in one block —
Focus Magic's ranged type 34, Energy Cannon's 40 — that stays **one** step.

**Closes M5.** Unblocks **F12** (Destiny's doubling, whose only blocker this is). **F17** and
**F18** are dependents, and **F20**'s exhaustiveness walk should follow it rather than precede it.

## 2d. R4 — the engine-shaped unit card (gaze representation, and the per-version field sets)

**Status: open. Priority 4. Cost: medium → large (scope widened 2026-07-31).**

**What to revisit.** How a unit is *specified* — the UI inputs, the roster fields and the record
field names — for **MoM and CoM2 alike**, so the calculator speaks each engine's own language
rather than a translation of it. The gaze is the sharpest case and the rest of this section is
written about it; *Per-version card field sets* below generalises it, and is what the card is
actually built from.

**This is an alignment item, not a defect.** The modelled behaviour is already right and is
documented in SPEC, *Gaze attacks*: `stoningGaze` and `deathGaze` are `numcheck` **save
modifiers**, `gazeRanged` is the hidden conventional component, `doomGaze` is doom damage, and SPEC
already states that the hidden component is MoM-only because CoM2 restructured the gaze into three
stats with no attack-strength slot. Nothing here claims a wrong number. What differs is the
*vocabulary*, in ways that make every future gaze finding arrive needing translation first.

**The two engines' own shapes.** MoM packs a gaze into the single `ranged_type`/`ranged` pair it
shares with ranged, thrown and breath — classifier types 103/104/105 — which is what gives a MoM
gaze an attack strength at all. `Caster.exe` holds three independent fields instead: `deathgaze`
`+0x38`, `stoninggaze` `+0x3C`, `doomgaze` `+0x40`, from stats `SDeathGaze`=39,
`SStoningGaze`=38 and `SDoomGaze`=57 (**CoM2 analysis**, *Gaze attacks (resolved 2026-07-27)*).

**Specific mismatches to settle.** Each is a naming or encoding choice, not a behaviour change.
The first two were settled on 2026-07-31 by *Per-version card field sets* below; the rest stand:

- ~~**A "Hidden Gaze Attack" input appears on every version's card**~~ **Settled: the control
  goes.** MoM's gaze strength *is* the shared strength field with the type dropdown set to a
  gaze, so there is nothing left for a separate input to hold, and CoM2 has no such value at all.
- ~~**The "no gaze" sentinel differs.**~~ **Settled: the checkbox is the sentinel.** A `numcheck`
  unchecked expresses the engine's literal `100`; the card keeps the nullable representation and
  the roster boundary owns the translation, in one place. See *Control types* below for why those
  effects need a presence control at all — 0 is a legal save modifier.
- **The record's field names do not match the engine's.** The calculator carries `gaze` and
  `doomGaze`, where `Caster.exe` carries three fields, none of them called `gaze`. Naming them
  after the engine's fields removes the standing ambiguity about what `gaze` denotes in a given
  version.
- **`ABILITY_STEP_RTB_FIELDS = ['rtb', 'gaze', 'doomGaze']`** (`combat.js:272`) is correct for the
  DOS engines, whose one `.ranged` field genuinely reaches the gazes, and the narrow `ranged`
  pseudo-field already exists for `Caster.exe`. Confirm every CoM2-applicable emission uses the
  narrow field; the specific over-applications already found are **F18**'s, not this item's.

**Expected fallout.** Likely settles the CoM2 half of **Q9** (Doom Gaze alongside a ranged attack —
separate fields imply yes) and gives **D21**, the level ladder for a gaze, a field to ask the
question about. Sequence after **R3**: both touch the record's attack channels and the same call
sites, so one pass is cheaper than two.

### Per-version card field sets

The card's primary section shows **the fields that version's roster can actually define** —
everything else (level, weapon, damage taken, enchantments) is applied *to* that record and
belongs below the *Show all* fold. The two engines' rosters differ enough that the card switches
field set with the version selector rather than sharing one layout.

**MoM / CoM 1 — settled 2026-07-31.** The unit-type table record is exactly `0x24` bytes and is
exactly `BATTLE_UNIT[0x00..0x23]`, so the set is closed by construction (**MoM analysis**,
*Known anchors*; record dumps verified against the roster for melee, ranged, ranged type, to-hit,
defence, resistance, hits, max figures, race, ammo and `Spec_Att_Attrib`).

| Card field | Source | Note |
|---|---|---|
| Race (0–14 mortal, 15–20 realm) + hero flag | `+0x0B` + `_UNITS[]` hero slot | MoM has no Fantastic flag; realm numbering matches CoM2's |
| Max figures | `+0x13` | living figures derive from damage |
| Melee | `+0x00` | |
| Ranged/thrown/breath/gaze strength | `+0x01` | one shared slot — faithful here, unlike CoM2 |
| Ranged/thrown/breath/gaze type | `+0x02` | dropdown; 103/104/105 select the gaze consumers |
| Base To Hit | `+0x04` | stored in +10-percentage-point steps |
| Defense | `+0x05` | |
| Resistance | `+0x06` | |
| HP per figure | `+0x10` | |
| Special attribute value | `+0x15` | **one magnitude**, shared by both gazes, Stoning/Death Touch, Life Steal, poison strength, Holy Bonus and Resistance to All; sign is cosmetic (`0:0x2c8` is `abs()`, negated at use) |

Three consequences the card has to carry, not just display:
- **No base To Block.** The DOS engines have no per-unit block chance; it is zeroed at `0x8EB16`
  and again at `0x8EE5B`. This is a real MoM/CoM2 asymmetry — see **F21**.
- **The poison split is a rule.** At `0x8EC27` the engine copies `+0x15` into `Poison_Strength`
  (+0x42, which has no roster column and is initialised to 0 at `0x8EC11`) and then zeroes
  `+0x15` **unless `ranged_type == 104`**. A poison unit that is not a Multi Gaze therefore has
  every other consumer at 0. Chaos Spawn is the only unit in the roster that needs the exemption.
- **No separate gaze-strength or doom-damage input.** With the type dropdown set to a gaze, the
  strength field *is* the gaze strength, and for 104 it is also the doom damage. This is what
  retires `gazeRanged` and `doomGaze` as inputs, and with them the `||` in `gazeAttackFires`.

**Two roster fields are excluded by decision:** ammunition (**M7**) and regeneration (**M8**).
Both engines define both, and both are between-turn state that a single-engagement resolver has
nothing to deplete or accrue.

**CoM2 / Warlord — not yet settled.** Four rows differ: `ToDefend` is genuine per-unit data,
`AttackFlagsT` gives each touch effect its own value, the three gaze stats are independent, and
**R3**'s four attack channels replace the single slot. Settle it after R3 lands. Three `unitT`
fields are already excluded: `maxammo`/`ammo` (**M7**), `regeneration` (**M8**) and
`savemodifier` (**Q15**).

### Where a roster value lives — decided 2026-07-31

**Every value a roster can define belongs in the stat block, in both versions. The abilities grid
keeps flags only.** Today eleven roster-defined numbers are `num`/`numcheck` controls inside the
abilities grid — `stoningGaze`, `deathGaze`, `doomGaze`, `stoningTouch`, `deathTouch`,
`lifeSteal`, `poison`, `destruction`, `exorcise`, `holyBonus`, `resistanceToAll` — which makes a
unit's definition span two places and hides which numbers a roster can actually set. (A twelfth,
`gazeRanged`, retires with this item.)

A control moves **whole** — presence and value together. Splitting a `numcheck` into a checkbox
in the grid and a number in the stat block would put one engine concept in two places, which is
what this item exists to end.

- **CoM2/Warlord: presence rides on the value, so no companion checkbox is needed.**
  `AttackFlagsT` does carry a boolean beside each integer (`stoningtouch` + `stoningtouchvalue`,
  and so on), but the script-visible API treats the value as self-describing — `MASTER.CAS`
  documents `100` as "ability not enabled" for the whole `AF…` block, and the three gaze stats
  use the same convention (`100` for stoning/death, `> 0` for Doom). `ResistToAll` and
  `HolyBonus` are plain `shortint` unit fields with no boolean at all.
- **MoM keeps flags in the grid, because it has one value and many flags.** The single special
  attribute value is a stat-block field; which consumers claim it is decided by the
  `attack_attributes` bits, the `Attribs_2` bits and the ranged-type dropdown — all of which stay
  where they are. This is unavoidable, not a style difference: the byte is a union.

So the rule is the same in both versions — no roster-defined *number* lives in the abilities grid
— while the number of stat-block fields differs, eleven against one.

**Control types (decided 2026-07-31): keep the existing split, relocate only.** Whether a value
needs a presence control is decided by whether **0 is a legal value**, and the rosters settle it:

| Control | CoM2/Warlord fields | Why |
|---|---|---|
| `numcheck` — checkbox + number | Stoning Gaze, Death Gaze, Stoning Touch, Death Touch, Life Steal, Exorcise, Destruction | 0 is a legal save modifier. Proof in every engine: MoM's Necromancer carries the Life Steal flag with `Spec_Att_Attrib` = 0; CoM2's Magician ships `Destruction=0`; Warlord's Sirens ship `Stoning Touch=0` |
| `num` — 0 means absent | Doom Gaze, Poison, Holy Bonus, Resistance to All | Doom Gaze is damage, gated `> 0` rather than `!= 100`; poison is a roll count; the other two are magnitudes |

This is the split `data.js` already has, so no new control kind is introduced.

**It also settles the sentinel question** raised in this item's bullet list above: the checkbox
*is* the engine's `100`, expressed in the UI. Keep the nullable representation on the card and
translate to and from `100` at the roster boundary, with the translation in one place.

**MoM's single field takes no checkbox.** Presence is not a property of the value there — it is
the `attack_attributes` and `Attribs_2` flags, which is exactly how the engine expresses the
Necromancer's Life Steal at modifier 0.

**One shared key, and it is correct for MoM.** `holyBonus` and `resistanceToAll` each have *two*
definitions sharing one `calcKey` — the unit's own roster value in `ABILITY_DEFS` and the
received aura in `ENCHANTMENT_DEFS` (`data.js:67-68`, `:119-120`). `abilityUiDefs` keeps the DOM
ids apart via `SHARED_ABILITY_KEYS`, and `mergedAbilityValue` then combines them with `Math.max`.
That looked like a collision to settle; for the DOS engines it is **right**, and the move must
preserve it rather than split the two controls into independent contributors.

The MoM mechanism is decoded in **MoM analysis**, *Holy Bonus and Resistance to All are
per-player maxima* (2026-07-31), which is its home; in short, the engine takes the maximum over a
side's providers into a per-player array and applies the winner once, so `max(own, received)`
matches for every case constructible on the card. It also means **receiving costs a unit
nothing** — only *providing* contends for the shared value byte, which is why the two never
collide on one unit.

**CoM2/Warlord settled 2026-08-02: the shared key is correct there too.**
`@Units@BuildAuraTable` reads a positive calculated `HolyBonus` or `ResistToAll` field as a
provider gate, contributes the corresponding base-record magnitude to aura type 1 or 3, and the
same-tile/same-owner/type merger keeps only the maximum. The provider itself is on that tile and
receives the merged aura through the same region-`e` dispatcher as its allies; there is no
separate direct application of the unit field. Therefore a unit's own value and a received value
compete by maximum, exactly matching `mergedAbilityValue`. Evidence:
`Units.RecalculateUnits.R5.1c-c.evidence.md` (`$0059774E..$005978BA`, merger
`$005973C7..$005976BF`).

---

## 2e. R5 — reconstruct the scoped `Caster.exe` source flow

**Status: open. Priority 1. Cost: large.**

Produce an address-backed, Pascal-like reconstruction intended to imitate the executable's
control and data flow closely enough that a future agent can understand the relevant mechanics
without re-deriving each routine from disassembly. This is a reconstruction, not a claim to have
recovered the original source.

Keep TD32 procedure, parameter and local names as original names. Give inferred structure fields,
globals and semantic aliases stable names, visibly distinguish those from original symbols, and
mark reconstructed blocks `exact`, `inferred` or `unresolved`. Preserve virtual-address anchors,
routine extents, important call targets and the executable hash so every non-obvious statement
can be checked against the binary. Do not silently simplify odd or apparently buggy control flow.
The indexed reconstruction lives in **Caster reconstruction**; mechanic-level conclusions remain
in **CoM2 analysis**.

| ID | Subtask | Status |
|---|---|---|
| R5.1 | Reconstruct the unit-enchantment and unit-ability calculation flow, including the relevant portions of `@Units@RecalculateUnits`, its named helpers, and the executable-side boundaries around the two script hooks. | **done 2026-08-02** — R5.1a–R5.1c complete with durable source-shaped reconstructions and evidence |
| R5.1a | `@Units@RecalculateUnits` — signature and ABI, region `a`, both script-hook boundaries, and the CasterCore and city-tile wrappers. | **done** |
| R5.1b | `@Units@RecalculateUnits`, `$0059A02C..$005A65B2`. **Derivation mode** — see the note below. | **done 2026-08-02** — both derivations and the cross-review round were merged with no surviving disagreement. The merged Pascal body has full semantic coverage; its companion evidence has 89 contiguous ledger rows, all six zero counts, 401/401 conditional jumps, 37/37 calls and 561/561 named-field writes accounted for. |
| R5.1c | Complete region `e` and its named helpers. | **done 2026-08-02** — R5.1c-a–R5.1c-c complete with durable source-shaped reconstructions and evidence |
| R5.1c-a | `@Units@RecalculateUnits`, `$005A65DC..$005A681C` and `$005A6822..$005A6FDF`; `@Map@unitonoverlandtile`, `$005D8CA0..$005D8D07`; `@Units@Ismagicalranged`, `$005963F4..$00596440`. **Derivation mode.** | **done 2026-08-02** — both derivations and cross-reviews merged with no surviving disagreement. Durable source and evidence cover 49/49 semantic conditional jumps, 3/3 calls, all state writes, four contiguous ledgers and all six zero counts. |
| R5.1c-b | `@Units@RecalculateUnits`, `$005A6FDF..$005A7A70`; `@Units@Immobile`, `$005951D4..$005952DB`; `@Units@TotalHpLeft`, `$00595354..$005953D8`; `@Combat@Iscombat`, `$005B9C54..$005B9C6A`; `@Units@HpPerFigure`, `$00595DB0..$00595E24`; `@Game@Min`, `$005FCF7C..$005FCFA5`. **Derivation mode.** | **done 2026-08-02** — two independent derivations merged with no surviving disagreement. Codex's byte-backed review of Claude found no actionable defect. **Reciprocal Claude review completed 2026-08-03**: all six extents re-read cold, no semantic misreading found; five reproducibility/naming defects raised and fixed (undeclared `inferred_CombatGlobals`, its unrecorded displacement↔`CG*` mapping, the `inferred_RCLife` prefix, undeclared `Wizards`, three unrecorded array bounds). Durable source/evidence cover all six extents with contiguous ledgers, all six zero counts, 27/27 semantic conditional jumps, 12/12 calls and all state writes. |
| R5.1c-c | `@Units@BuildAuraTable`, `$005976CC..$00597F4F`; `@Units@AddtoAuraTable`, `$005973A4..$005976C9`; `@Heroes@HeroBonus`, `$005933E8..$005934DB`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex's cold derivation and subsequent byte-level self-audit were integrated with no actionable defect; the independent Claude derivation was never produced. **Formal Claude review completed 2026-08-03**: all three extents re-read cold, no semantic misreading found; two documentation defects raised and fixed (undeclared `Wizards`, unrecorded array bounds). Still one derivation reviewed, not two independent ones. Durable source/evidence cover three contiguous ledgers, all six zero counts, 24/24 semantic conditional jumps, 19/19 calls, all state writes, and both complete `idiv` formulas. |
| R5.2 | Reconstruct combat damage resolution, beginning with `@Combat@ApplyAttack` and following the in-scope attack, defence, resistance, damage and rider routines needed to represent the complete damage flow. | **done 2026-08-02 by user direction; correction closed 2026-08-03** — R5.2a–R5.2m are integrated. R5.2k–R5.2m were each completed by a separate Sol subagent through a cold derivation, distinct raw-byte self-review and durable merge; no Claude input was read or used. R5.2g's source and downstream documents were corrected on 2026-08-03 after reciprocal review identified its flattened non-area spill loop; Claude confirmed the correct loop shape from the bytes, and AKH directed the corrected row closed. Parent R5 remains open on R5.G alone. |
| R5.2a | `@Combat@ApplyAttack`, `$005B1970..$005B213D`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex cold derivation, byte-level self-review and three reviewed corrections integrated into `Combat.ApplyAttack.pas`; independent Claude derivation/formal review unavailable. Evidence has a contiguous 15-row ledger, all six zero counts, and 11/11 branches, 6/6 calls and 58/58 writes accounted for.  **Claude review 2026-08-03 (R5.C): no semantic misreading;** branch targets, the nine jump-table cases, the `in [6..8]` rider exclusion, the Doom `idiv` and Supernatural `fdiv`/`Round` idioms, and the spillover loop all reproduce. Two documentation defects fixed: the `Round` banker's-rounding mode (see F7) and the missing `counter`/`simul` call-site citation. |
| R5.2b | `@Combat@ApplyAttack`, `$005B213D..$005B2994`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex continuation and byte-level self-review integrated with the corrected BaseUnits owner binding; independent Claude derivation/formal review unavailable. Evidence has a contiguous 12-row ledger, all six zero counts, and 43/43 branches, 16/16 calls and 23/23 writes accounted for.  **Claude review 2026-08-03 (R5.C): no semantic misreading;** branch targets, the nine jump-table cases, the `in [6..8]` rider exclusion, the Doom `idiv` and Supernatural `fdiv`/`Round` idioms, and the spillover loop all reproduce. Two documentation defects fixed: the `Round` banker's-rounding mode (see F7) and the missing `counter`/`simul` call-site citation. |
| R5.2c | `@Combat@ApplyAttack`, `$005B2994..$005B32BC`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex cold derivation and byte-level self-review integrated; independent Claude derivation/formal review unavailable. Durable source/evidence complete the routine with a contiguous 18-row ledger, all six zero counts, 55/55 verifier conditionals (including three documented data decodes), 18/18 calls and 43/43 verifier writes accounted for.  **Claude review 2026-08-03 (R5.C): no semantic misreading;** branch targets, the nine jump-table cases, the `in [6..8]` rider exclusion, the Doom `idiv` and Supernatural `fdiv`/`Round` idioms, and the spillover loop all reproduce. Two documentation defects fixed: the `Round` banker's-rounding mode (see F7) and the missing `counter`/`simul` call-site citation. |
| R5.2d | `@Combat@PerformRangedAttack`, `$005B3338..$005B35A2`; `@Combat@PerformMeleeAttack`, `$005B35A4..$005B3ECB`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex single-agent cold derivation and raw-byte self-review integrated with no surviving defect; no Claude work was read or produced. Durable source/evidence have two contiguous ledgers, all six zero counts, 43/43 verifier conditionals, 53/53 calls and 15/15 classified writes accounted for.  **Claude review 2026-08-03 (R5.C): no semantic misreading;** the melee phase order, the Haste repeat loops and their exclusion of defender gazes and the counterattack, the First Strike gate and its zero placeholder, the counterattack argument swap, and the signed movement `div`/`mod` idioms all reproduce. No change required. |
| R5.2e | `@Units@GetEffectiveResistance`, `$00595AB8..$00595CE9`; `@Units@ResistanceRoll`, `$00595CEC..$00595DAD`; `@Units@AttackRoll`, `$00595E24..$00595E7C`; `@Units@DefenseRoll`, `$00595E7C..$00595EE9`; `@Units@EffectiveDefense`, `$005965C8..$00596848`; `@Combat@RangedPenalty`, `$005B1800..$005B1927`; `@Combat@CombatDistanceUnit`, `$005BB234..$005BB2FE`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex single-agent cold derivation and raw-byte self-review integrated with no actionable defect; no Claude derivation/review was available. Durable source/evidence have seven contiguous ledgers, all six zero counts, 58/58 verifier conditionals, 9/9 calls and 3/3 classified writes accounted for.  **Claude review 2026-08-03 (R5.C): no semantic misreading;** the `ToDefendCap` write-back, the To Hit floor with no ceiling, the inverted-looking `HeroNoRangePenalty` polarity, Long Range's excess-only zeroing, and the Charmed hero-array indexing all reproduce. Two documentation defects fixed: the four undeclared `Enc*` constants now carry values and reading sites (as does `HACharmed`), and the Fire/Cold/Poison immunity blocks are recorded as lacking Bless's `spellid > 0` guard — inert with shipped spell record 0, which strengthens F34. |
| R5.2f | `@Combat@AddDamage`, `$005B1928..$005B1970`; `@Combat@Combatheal`, `$005B1260..$005B15BE`; `@Units@LivingFigures`, `$0059648C..$005964F8`; `@Units@TopFigureDamage`, `$00596554..$005965C6`; `@Combat@Dealdamage`, `$005B41C0..$005B4555`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex single-agent cold derivation and raw-byte self-review integrated with no actionable defect; no Claude work was read or produced. Durable source/evidence have five contiguous ledgers, all six zero counts, 23/23 semantic conditional jumps, 10/10 calls and all 18 persistent writes accounted for.  **Claude review 2026-08-03 (R5.C): no semantic misreading;** the `Combatheal(overheal, isregen)` parameter binding that F27/F28 rest on is confirmed from TD32 rather than inference, and the control-enchantment merge, the `>=` death threshold, the category-dominance chain and the calculated-vs-base `figures` split all reproduce. No change required. |
| R5.2g | `@Spells@DamageSpell`, `$005C10E8..$005C1954`; `@Spells@FirewallEffect`, `$005C1C48..$005C1CA5`. **Derivation mode.** | **done 2026-08-02 by user direction; corrected and closed 2026-08-03 by user direction** — Codex single-agent cold derivation and separate raw-byte self-review integrated after adding the explicit unsigned spell-set guard and full spell-record stride. Durable source/evidence have two contiguous ledgers, all six zero counts, 46/46 semantic conditional jumps, 14/14 calls and 60/60 classified writes accounted for. Claude's initial R5.C review incorrectly reported no semantic misreading. Codex's reciprocal review found the non-area spill at `$005C1785..$005C188C` rendered as a one-shot `else if` when `$005C1867 jl $005C1785` is a back edge. Claude re-read the bytes and confirmed the correct pre-tested `while`: `$005C1750 je $005C1850` enters the condition, the body may run zero times, and `$005C1867 jl $005C1785` repeats it for every crossed figure boundary with a fresh `DefenseRoll` (`$005C17F0`) and Invulnerability subtraction (`$005C1836`). `topfdam` is zeroed at `$005C184B`, so only the first iteration uses the wounded top figure. Codex corrected `Spells.DamageSpells.pas`, its evidence document, **CoM2 analysis**, *Direct spell damage and Wall of Fire*, `Calculator/SPEC.md`, the Caster reconstruction README, the CoM2 tables and F36. The coverage ledger remains unchanged because its DamageSpell row spans the complete `$005C10E8..$005C1954` routine. AKH directed closure after the correction; no disagreement remains open. |
| R5.2h | `@Combat@mergeflags`, `$005B1630..$005B17FE`; `@Units@Ismissileranged`, `$00596440..$0059648C`; `@Units@canattackflier`, `$005953D8..$00595544`; `@Combat@CrushWall`, `$005B32BC..$005B3338`; unnamed routine `$005B3ECC..$005B3F04`; `@Combat@Insidewalls`, `$005B3F04..$005B3F5C`; `@Combat@HasWallOfFire`, `$005B403C..$005B40AC`; `@Combat@HasWall`, `$005B40AC..$005B411C`; `@Combat@GetWallState`, `$005BB738..$005BB785`; `@Combat@destroywall`, `$005BB7D0..$005BB7FE`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex single-agent cold derivation and raw-byte self-review. Durable source/evidence have ten contiguous ledgers, all six zero counts, 38/38 semantic conditional jumps, 11/11 calls and 23/23 classified writes accounted for. **Claude review 2026-08-03 (R5.C): one semantic-label defect corrected, spanning three `mergeflags` rider labels; the other nine extents had no semantic misreading.** |
| R5.2i | Call-closure audit of R5.2a–R5.2h: classify every semantic callee and add target-only, address-bounded derivation rows for every calculator-relevant routine not already reconstructed. This is a scope audit, not a derivation. | **done 2026-08-02** — `Combat.CallClosure.R5.2i.audit.md` classifies all 45 unique semantic callees behind 137 call sites; 25 close in R5.2, 5 in R5.1, 6 as runtime/diagnostic/calculator-irrelevant, and 9 are scoped as R5.2j–R5.2l. |
| R5.2j | `@Spells@ApplyDamageSpell`, `$005C1974..$005C1C45`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex single-agent cold derivation and separate raw-byte self-review integrated with no correction. Durable source/evidence have a contiguous 7-row ledger, all six zero counts, 13/13 semantic conditionals, 7/7 calls and 3/3 verifier-classified writes accounted for. The call-closure pass opened `AmplifiedDamage` as R5.2m. **Claude review 2026-08-03 (R5.C): no semantic misreading.** |
| R5.2k | `@Wizard@HasGlobalEnchantment`, `$00590DAC..$00590E07`; `@Units@HasTeleMerge`, `$005952DC..$00595352`; `@Units@DeadFigures`, `$005964F8..$00596553`; `@Combat@CombatDistance`, `$005BB1CC..$005BB232`; `@Combat@CGADEnemy`, `$005BD25C..$005BD284`; `@Game@CanHealNaturally`, `$005ECB4C..$005ECBC4`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex single-agent cold derivation and separate reverse-order raw-byte self-review integrated with no correction; no Claude derivation, review, or output was read or used. Durable source/evidence have six contiguous ledgers, all six zero counts, 7/7 semantic conditionals, 1/1 semantic call and 0/0 verifier-classified writes accounted for. Opened F40 for the proved Teleporting/Merging Wall-of-Fire exclusion. **Claude review 2026-08-03 (R5.C): no semantic misreading across all six routines;** one precision entry, attestation of the literal constants, was applied. |
| R5.2l | `@Combat@ctws`, `$005BB0D0..$005BB1CC`; `@Combat@SetWallState`, `$005BB788..$005BB7CE`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex single-agent cold derivation and distinct fresh raw-byte self-review integrated; no Claude derivation, review, or output was read or used. The review corrected the lower-bound-biased state-array offset description and removed unsupported screen-direction wording. Durable source/evidence have four contiguous ledger rows, all six zero counts, 25/25 semantic conditionals, 1/1 semantic call and 1/1 verifier-classified write accounted for. **Claude review 2026-08-03 (R5.C): no semantic misreading in either routine.** |
| R5.2m | `@Combat@AmplifiedDamage`, `$005BEB28..$005BEC6F`. **Derivation mode.** | **done 2026-08-02 by user direction** — Codex single-agent cold derivation and separate fresh raw-byte self-review integrated with no correction; no Claude input was read or used. Durable source/evidence have a contiguous 2-row ledger, all six zero counts, 7/7 semantic conditionals, 1/1 semantic call and 0/0 verifier-classified writes accounted for. **Claude review 2026-08-03 (R5.C): no semantic misreading.** |
| R5.G | GPT review of the complete R5 reconstruction, with findings recorded and resolved or explicitly accepted. | **ready** — R5.1 and R5.2 are integrated and R5.C is closed. This is now the only row keeping parent R5 open. |
| R5.C | Claude review of the complete R5 reconstruction, with findings recorded and resolved or explicitly accepted. Run as per-extent rows over R5.2's 19,296 bytes (the only group with no cross-agent review), plus one cross-artifact consistency pass that covers R5.1b rather than re-deriving it. | **closed 2026-08-03 by user direction** — R5.1c-b, R5.1c-c and R5.2a–R5.2m were reviewed on 2026-08-03, followed by the cross-artifact consistency pass. The review fixes and precision entries are integrated. Codex's reciprocal review subsequently found that R5.2g's non-area spill back edge had been cited but flattened; Claude re-read the cited bytes and confirmed the correct pre-tested repeated loop, and Codex applied that shape to the reconstruction and all downstream descriptions. The whole-routine DamageSpell ledger remains valid without subdivision. AKH directed R5.2g and R5.C closed after the correction, resolving the review round with no open disagreement. Q16 remains an independent documentation-structure question and does not block this review. |

R5.2a–R5.2h are deliberately target-only. Their instruction counts come from raw Capstone
disassembly of the pinned build in **Caster reconstruction**'s README; alignment bytes between
TD32 procedure extents are excluded. The three `ApplyAttack` boundaries are instruction-aligned
and partition its complete `$194C`-byte extent without gaps or overlap.

R5.2i closes only when every semantic callee in the reconstructed R5.2 extents is recorded as
one of: reconstructed in R5.2; already reconstructed elsewhere in R5.1; runtime/compiler,
diagnostic or presentation-only; calculator-irrelevant with the reason recorded; or newly scoped
as another address-bounded R5.2 derivation row. R5.2 itself remains incomplete until R5.2a–R5.2h,
R5.2i, and every row opened by R5.2i are done.

**Completion gate.** R5 may be marked complete only after R5.1a–R5.1c and R5.2 are done and both
R5.G and R5.C have completed separate review passes. Any material reconstruction change made
after a review requires that reviewer to re-check the affected portion before the parent can
close.

### R5.1b — derivation mode

The row above is deliberately target-only: routine, extent, and the build identified in
**Caster reconstruction**'s README. Both agents derive that extent independently under
`CLAUDE.md` § *Two agents*; neither reads the other's `.derivations/` file until both exist.

**The slice is not a cold read, and the provenance line must say so.** The committed
`Units.RecalculateUnits.pas` carries an `unresolved` placeholder covering exactly this extent
whose comment lists thirteen address-backed semantic anchors inside it — Heroism normalization,
Crusade, Warlord, Destiny, `@Units@ApplyLevelBonus`, Focus Magic, the derived `EncMagic` marker,
`@Units@ApplyHeroBonus`, `@Units@ApplyMagicWeapons`, the native node-aura dispatch, where Haste
and the direct curses begin, and Tactician. Any agent that opens the file for its conventions
sees them. Control flow, writes, ordering and everything between the anchors are still derived
independently, so the comparison retains its value — but record the result as *independent from
a shared spine*, not as fully independent.

## 2f. R6 — reconstruct the scoped DOS executable source flows

**Status: open. Priority 2. Cost: large.**

Produce address-backed **C++-based** reconstructions intended to imitate the executable control
and data flow for **MoM 1.31**, **MoM CP 1.60** and **CoM 1**, covering the same two mechanic
areas as R5. Use C++ syntax and organization consistent with the executable family's Borland C++
origin; this is reconstructed source, not a claim to recover the original source text. Preserve
build/hash identity, segment and file-offset anchors, recovered control flow, calls, structure
offsets and cross-build differences. Clearly distinguish names supported by the binaries from
names borrowed from ReMoM or assigned during reconstruction, and mark blocks `exact`, `inferred`
or `unresolved`. The indexed reconstructions live in **DOS reconstruction**; mechanic-level
findings remain in **MoM analysis**.

| ID | Build and subsystem | Status |
|---|---|---|
| R6.1 | MoM 1.31 — unit enchantments and abilities | open |
| R6.2 | MoM 1.31 — combat damage resolution | open |
| R6.3 | MoM CP 1.60 — unit enchantments and abilities | open |
| R6.4 | MoM CP 1.60 — combat damage resolution | open |
| R6.5 | CoM 1 — unit enchantments and abilities | open |
| R6.6 | CoM 1 — combat damage resolution | open |
| R6.G | GPT review of the complete R6 reconstruction, including its cross-build differences, with findings recorded and resolved or explicitly accepted. | blocked on R6.1–R6.6 |
| R6.C | Claude review of the complete R6 reconstruction, including its cross-build differences, with findings recorded and resolved or explicitly accepted. | blocked on R6.1–R6.6 |

**Completion gate.** R6 may be marked complete only after R6.1–R6.6 are done and both R6.G and
R6.C have completed separate review passes. Any material reconstruction change made after a
review requires that reviewer to re-check the affected portion before the parent can close.

---

## 3. Defects and suspected defects

Code believed wrong, as opposed to unverified.

*(F1 — Vertigo's display path — and F2 — the duplicated `isCoM2` predicate — were fixed on
2026-07-29. F1's display now derives from the same version ladder as `buildVertigoContext`, so
CoM2 and Warlord show −25% / −7% rather than CoM 1's −30% / −10%; CoM 1 and MoM are unchanged.
IDs are not reused.)*

| ID | Item | Status | Cost | Evidence |
|---|---|---|---|---|
| F3 | **Golem's intrinsic Resist Elements is missing.** The engine writes it before either stat hook, for CoM2 and Warlord alike; neither `UNITS.INI` carries it, so the generated rosters omit it and the defence is never granted. Fix in the generators — see [Appendix B](#f3--golems-intrinsic-resist-elements). | open | small | CoM2 analysis, *Region `a`* |
| F4 | **The Chosen is Fantastic in the engine, a plain hero in the calculator.** `predefinedUnitType` (`ui.js`) types anything in the Heroes category as `hero`, so Nature Conjunction, Survival Instinct, Land Link's extra package, the Soul Linker aura, and exclusion from Good Moon / Bad Moon / Leadership / Misfortune all resolve the wrong way. Needs a hard-coded unit-type rule, same shape as F3. | open | medium | queue D26; CoM2 analysis, *Unit enchantment effects* |
| F5 | **To Hit/To Block writes are still flattened outside the transform sequence, including the two-stage clamp.** The engine retains common and attack-specific channels, clamps common To Hit to 10–100, then adjusts each `common + channel` sum. `deriveUnitStats` instead combines level, weapon, Holy Weapon, Ballistics, Radio, True Sight, Hurricane, Vertigo, Plague, Great Unbinding and other writes after `runStatSteps`. See [Appendix B](#f5--audit-the-two-stage-to-hit-clamp). | open | large | CoM2 analysis, *Region `e`* and *Calculator sequential-transform audit* |
| F6 | **Chaos Channels Fire Breath coexistence is unsettled.** The recalculation arithmetic is `firebreath += 4`, but whether the flag can land on a unit that already has Fire Breath is not established. CoM2 and Warlord are treated differently today, including an artificial CoM2 preset expecting replacement — see [Appendix B](#f6--chaos-channels-fire-breath-coexistence). | open | medium | CoM2 analysis, *Region `a`*; CoM2 tables, *Chaos Channels* |
| F7 | **Supernatural minimum damage uses a hard-coded approximation instead of the engine's moddable rounded formula.** R5.2c shows `Round((hits − SupernaturalStarts) * SupernaturalRatio / 100.0)` at `$005B2ED9..$005B2F1E`; `combat.js` uses `Math.round(hits / 3)`. With the shipped 0/34 values the first divergences are underestimates at hits 28, 31, 34 and 37 (10/11/12/13 engine vs 9/10/11/12 calculator). Affects CoM2 and Warlord. **Deferred by decision 2026-07-29**; revisit later. Fixing it means changing the formula and re-checking every Supernatural preset's expected value. **Trap for the fix (R5.C review, 2026-08-03):** the engine's `Round` is *banker's* rounding (ties to even), so `Math.round` is not a faithful substitute. With `0/34` the ties are exactly `hits ≡ 25 (mod 50)`; at `hits = 25` the engine gives 8 and `Math.round(8.5)` gives 9 — and today's `Math.round(25/3) = 8` happens to be *correct* there, so a naive fix regresses a currently-passing point. | open, deferred | small | CoM2 analysis, *ApplyAttack riders, damage loop and result routing*; CoM2 tables, *Supernatural minimum damage* |
| ~~F8~~ | ~~Blaze of Glory kept enchantment-granted Armor instead of zeroing Defense.~~ `UnitCalc.CAS:1493-1497` reads current Defense, adds it to melee, then subtracts the same value from Defense. The step now writes `u.def = 0`; the last hand-built stat sum and its helper are gone. | **closed 2026-07-29** | small | discrepancies, §13 |
| F9 | **Marionette's Channeler branch is not modelled, including its Xenoveterinary eligibility.** `UnitCalcPre.CAS:82-115` makes hero 48 Fantastic before Xenoveterinary runs, then derives Channeler-skill stat bonuses and a realm-dependent spell package. The calculator has no Marionette/Channeler inputs, so its base-fantastic Xenoveterinary gate cannot express this one live-`FANTASTIC(U)` case. | open | medium | discrepancies, *Script checks with no calculator discrepancy* |
| ~~F11~~ | ~~Psycho Force and Pneuma Field read Resistance after the region-`e` aura pass.~~ Both are region `d` (`UnitCalc.CAS:1413-1417`, `:1419-1425`) and read `GETSTAT(U,SResist,0)` there, but the calculator read the finished record — so a Holy Bonus or Resistance to All aura, moved to `e` by D23, inflated both. They are now steps in `d`; `lifeSteal` joined the record to carry Pneuma Field's `AFLifeSteal` write, and `%I`'s truncation replaced `Math.floor`. | **closed 2026-07-29** | small | discrepancies; `UnitCalc.CAS:1413-1425` |
| F12 | **Destiny's doubling precedes every training-time permanent write.** Destiny is a one-shot permanent transformation cast on an already-trained unit, so the engine doubles a base record that *already* holds Artificer, Armorclad, Ludus Agoge, Energy Cannon's `+50%` and the rest of region `base` (`CreateUnit.CAS` index-1 writes). The calculator doubles the roster base *first*, at `stats.js:476-494`, so every additive `base` write escapes the doubling — Artificer +1 ranged on a base-5 unit gives 11 where the engine gives 12, and Energy Cannon gives 15 against the engine's 14. Blocked on **R3**, the record's single `rtb` slot, not on the position — see [Appendix B](#f12--destinys-position-among-the-permanent-writes). | open, blocked on R3 | medium | CoM2 analysis, *Experience, Destiny and the named stat helpers*; `CreateUnit.CAS:695,703` |
| ~~F10~~ | ~~Darkness, True Light and Eternal Night were merged into one `darkLight` step.~~ Their compiled/script writes have distinct positions; CoM 1 Eternal Night must follow Supreme Light and Tactician. They are now separate atomic spell steps. | **closed 2026-07-29** | small | CoM2 analysis, *Combat globals*; MoM analysis, *Warp Creature runs early* |
| F13 | **Upgraded Explosive's Fire Breath doubling is at the end of region `b`, but the script runs it at lines 1074–1078.** Ballistics, Xenopsychology, Radio, True Light, Plague, Lucky Star and the city tail all follow it. Move both Explosive writes to their exact early-hook position; add a Fire Breath coexistence test where a later `b` bonus must escape the doubling. | open | small | CoM2 analysis, *Warlord regions `b` and `d`* and *Calculator sequential-transform audit* |
| F14 | **Misfortune/Mislead is in `c` instead of aura type 10 in `e`.** The engine applies it after `UnitCalc` and the initial clamps. Move its atomic melee/defense/resistance/conventional-ranged penalty to the aura pass, preserving the non-fantastic and base-ranged gates; test it with Warp and Blaze of Glory. | open | small | CoM2 analysis, *The aura pass* and *Calculator sequential-transform audit* |
| F15 | **Holy Armor's `Defense > 5` read sees later region-`c` effects.** `...abilByPhase.c` currently places High Prayer, Survival Instinct, Inner Power, Black Prayer, Mind Storm and other later blocks before Holy Armor. Rebuild region `c` in address order and add threshold tests where a later +Defense or −Defense effect would switch the branch in the current calculator. | open | medium | CoM2 analysis, *Unit enchantment effects* and *Calculator sequential-transform audit* |
| F16 | **Charm of Life is computed from base HP rather than live HP at +0x08AE5.** Its step must read current `u.hp` after level, item, Endurance and Lionheart HP writes. Cover at least one case where those earlier additions change the 25% result. | open | small | CoM2 analysis, *Global enchantments and astronomical events* and *Calculator sequential-transform audit* |
| F17 | **Warlord Vampirism uses the wrong formula as well as the wrong position.** The script, after Colossal Strength, adds `%I(Thrown/2 + (Fire Breath + Lightning Breath)/2)` to melee and then sets every present source channel to 1. The calculator runs pre-sequence and transfers `strength − 1`. Move it under **R3**'s widened record and use the script arithmetic. | open | medium | `UnitCalc.CAS:1245-1258`; CoM2 analysis, *Warlord regions `b` and `d`* and *Calculator sequential-transform audit* |
| F18 | **The shared `rtb` projection over-applies several effects.** Mind Storm reaches Breath; Tactician reaches Thrown/Breath; Warlord True Light reaches secondary attacks and gazes; node aura reaches Doom Gaze; combat-cast Warlord Flame Blade's Fire Breath point is booked to `c` instead of `d`. Split these writes onto **R3**'s engine-shaped fields and add one channel-exclusion/order test per effect; the Doom Gaze half also touches **R4**. | open | medium | CoM2 analysis, *Calculator-facing discrepancy*, *The aura pass* and *Calculator sequential-transform audit* |
| F19 | **Several calculator-relevant compiled effects have no transform/control.** Inventory Dark Force, Guardian Spirit/Heavenly Light, Bad Moon, Good Moon, Nature Conjunction, Spell Ward, Guiding Beacon, Prayermaster, Divine Barrier, Soul Linker, Leadership and the item-loop numeric stat/To-Hit powers. Decide UI representation, then add each in its mapped position; movement/ammo/healing-only blocks remain out of scope. | open | large | CoM2 analysis, *Calculator sequential-transform audit* |
| F20 | **The `b`/`c`/`d` step lists are not source-order exhaustive and atomic.** After F12–F19, walk every represented calculator-relevant effect against the region maps and CAS line order, eliminate broad phase spreads whose emission order disagrees, and keep one engine block as one step (Rust is the current concrete split-block violation). Add a trace-order assertion covering every represented CoM2/Warlord transform. | open | medium | CoM2 analysis, *Phase index*, *Warlord regions `b` and `d`*, *Region `c`* and *Calculator sequential-transform audit* |
| F21 | **A roster unit's non-default block chance never reaches the card.** Both CoM2 generators emit `to_block` from `UNITS.INI`'s `ToDefend` (`generate_com2_units_json.py:212`, `generate_warlord_units_json.py:203`), but nothing in `Calculator/` reads it — the only consumers are `tools/generate_com2_unit_roster.py` and `tools/generate_mom_com2_unit_comparison.py`. 29 units therefore load at the default 30%: CoM2 Zombies (20), and in Warlord all 15 Goblin units (20), War Monk (Taki), Minotaurs, Golem, Stag Beetle, Dragon Turtle, Colossus, Lesser/Great Gaia Lord, Sea Lord, Arch Demon Lord, Xuanyuan War Monks and Xuanyuan Immortals (40), and Seraph (50). Wire it beside `to_hit` in `applyPredefinedUnit` and `buildMatrixUnitStats`, and settle the encoding in the same change: the schema stores `to_block` as an **absolute** chance where `to_hit` is a **delta above 30**, so the card write needs `to_block − 30` and the two fields should agree on one convention. MoM and CoM 1 are unaffected — the DOS engines have no per-unit block chance at all, the constructor zeroing `toblock` (+0x26) at `0x8EE5B`, which is why their rosters carry no such field. | open | small | generators vs `Calculator/ui.js`; MoM analysis, *Battle-unit constructor* |
| F22 | **CoM2/Warlord Blood Lust doubles Thrown as well as melee.** `@Combat@ApplyAttack` admits `ATmelee` (2) and `ATThrown` (5) before its `EncBloodLust`/non-Fantastic-target gate, then writes `atk := atk * 2` at `$005B21B6`. `combat.js` only derives `aMeleeAtkVsB` / `bMeleeAtkVsA`; the Thrown phase always uses the undoubled `rtb`. Add a Thrown-specific strength at the resolution boundary. R5.2c settles the order: partial Doom later takes `DoomDamagePercentage *` the already doubled `atk`, while full Doom adds the doubled `atk`. CoM 1 remains melee-only. | open | small | CoM2 analysis, *`ApplyAttack` setup and pre-roll flow* and *`ApplyAttack` riders, damage loop and result routing*; `Combat.ApplyAttack.R5.2a-b.evidence.md`; `Combat.ApplyAttack.R5.2c.evidence.md` |
| F23 | **CoM2/Warlord Cause Fear tests base Death Immunity, while the calculator tests the derived ability set.** `$005B1D1C` reads `BaseUnits[au].deathimmunity` at displacement `$01AC185F`; `fearFailProb` sees the post-normalization abilities, so Death Immunity derived from Blood Lust, Animated or Rebuild incorrectly skips every Fear roll. Preserve an intrinsic/base-immunity marker through stat derivation and use it only for the modern-engine direct skip; Magic Immunity continues to block through effective Resistance. Add paired intrinsic-versus-derived immunity presets. | open | small | CoM2 analysis, *`ApplyAttack` setup and pre-roll flow*; `Combat.ApplyAttack.R5.2a-b.evidence.md` |
| F24 | **CoM2/Warlord Blur is side-wide, but the calculator models it as a unit-owned enchantment and always applies the target's copy.** `ApplyAttack` calls `CGADEnemy` at `$005B2F26`; that helper selects the side opposite the side whose combat turn it is, not `Units[du]`'s side. The two coincide for the initiating strike, but `PerformMeleeAttack` swaps `au`/`du` for the counterattack at `$005B3BA6..$005B3BAC` without changing `CombatAttackersTurn`, so the counterattack reads the counterattacker's own side-wide Blur. Replace the unit checkbox with per-side combat-global inputs and reproduce this turn-relative selection; retain attacker Illusion Immunity as the bypass. | open | medium | CoM2 analysis, *`ApplyAttack` riders, damage loop and result routing*; `Combat.ApplyAttack.R5.2c.evidence.md`; `Combat.CallClosureHelpers.R5.2k.evidence.md` |
| F25 | **CoM2/Warlord touch riders incorrectly fire alongside gazes.** `$005B2994..$005B299D` sends attack types 6–8 directly past Exorcise, Stoning Touch, Death Touch, Life Steal, Destruction and Poison; `gazeTouchParams` instead enables all of them for every active gaze. Remove modern-engine gaze delivery for those six riders and add one paired gaze/non-gaze preset. Bloodsucker is separate and remains a post-result trigger. | open | medium | CoM2 analysis, *`ApplyAttack` riders, damage loop and result routing*; `Combat.ApplyAttack.R5.2c.evidence.md` |
| F26 | **CoM2/Warlord Destruction rolls once per attacking figure, not once for the whole phase.** Its `$005B2D42..$005B2DC8` block is inside the `figs` loop whose back edge is `$005B3164 → $005B2994`; every figure gets a Chaos resistance roll until any failure assigns 150 to result field 0. The calculator models one roll regardless of figure count. Scale the phase failure probability by surviving attacking figures and add one- versus multi-figure presets. | open | small | CoM2 analysis, *`ApplyAttack` riders, damage loop and result routing*; `Combat.ApplyAttack.R5.2c.evidence.md` |
| F27 | **Warlord Bloodsucker tests too early and caps healing to non-overkill bonus damage.** The engine totals result fields 8, 4 and 0 at `$005B3219..$005B3237`, after ordinary damage, Immolation and all resistance riders have been merged; any positive sum triggers the configured damage and the separately configured healing amount. `convolveTouchAttacks` instead derives `pTrigger` from the pre-rider base-damage distribution, so a fully blocked weapon hit followed by successful Poison, Life Steal, Stoning/Death Touch, Exorcise, Destruction or Immolation does not trigger. It also reduces healing to `actualBS := min(2, remaining HP - damage)`, although `$005B3281 6A01` passes `isregen=True`, `$005B328B 33C9` passes `overheal=False`, and `$005B3290 E8CBDFFFFF` sends `BloodsuckerHealing` directly to `Combatheal`. The callee therefore caps healing to the attacker's recoverable damage, never to target overkill, and does not convert a remainder to bonus HP. Move the trigger after every result component, pass the configured values through that non-overheal `Combatheal` model, and test rider-only damage plus a one-HP overkill target. | open | medium | CoM2 analysis, *`ApplyAttack` riders, damage loop and result routing* and *Damage accumulation, healing and death routing*; `Combat.ApplyAttack.R5.2c.evidence.md`; `Combat.DamageHandling.R5.2f.evidence.md`; `combat.js:1288-1310` |
| F28 | **CoM2/Warlord Life Steal self-healing is incorrectly capped by the target's remaining HP.** Per attacking figure, `$005B2D15..$005B2D3D` stores the raw `ResistanceRoll` return, adds that same magnitude to result field 4, and passes it unchanged to `Combatheal(..., True, False)` before target damage is applied. `Combatheal` consumes the uncapped amount, removes recoverable normal damage before undead damage, and converts any remainder to capped per-living-figure bonus HP; `calcLifeStealDmgDist(..., cap)` instead caps the distribution first and uses its expected damage as self-healing. `CanHealNaturally` is true exactly when calculated `nohealing` is false and calculated race is not `RCNoHeal` (21); when false, the dead-figure preservation damage created by overheal is also irrecoverable. Preserve a separate uncapped roll distribution and route it through the `Combatheal` model while keeping displayed target damage capped; add low-remaining-HP, low-resistance and full-health-overheal presets. | open | medium | CoM2 analysis, *`ApplyAttack` riders, damage loop and result routing* and *Damage accumulation, healing and death routing*; `Combat.ApplyAttack.R5.2c.evidence.md`; `Combat.DamageHandling.R5.2f.evidence.md`; `Combat.CallClosureHelpers.R5.2k.evidence.md`; `engine.js:260-288`; `combat.js:1330-1337` |
| F29 | **CoM2/Warlord melee phases run in the wrong order.** `PerformMeleeAttack` deals Wall of Fire first, then attacker gazes, defender gazes, Lightning Breath, Fire Breath, Thrown, and finally melee (`$005B35C3..$005B3BEE`). `combat.js` instead runs Thrown/Breath → attacker gaze → defender gaze → Wall of Fire. Because every early phase changes the living-figure count read by the next call, reorder the modern-engine joint pipeline and add casualty-sensitive presets for both directions. | open | large | CoM2 analysis, *Ranged and melee attack dispatch*; `Combat.PerformAttacks.R5.2d.evidence.md`; `combat.js:3708-3795` |
| F30 | **CoM2/Warlord Haste does not repeat attacker gazes in the calculator.** Calculated `EnchantmentFlags[15=EncHaste]` changes caller repeat count `j` from one to two at `$005B3761..$005B377B`; all attacker Stoning, Death and Doom Gaze calls lie inside `j` loops through `$005B3877`. Defender retaliation gazes and the counterattack remain single. The calculator explicitly excludes gazes from Haste and builds each gaze side once. Repeat all three initiating gaze phases for modern versions and add Haste/no-Haste paired presets. | open | medium | CoM2 analysis, *Ranged and melee attack dispatch*; `Combat.PerformAttacks.R5.2d.evidence.md`; `combat.js:3278-3281,3727-3768` |
| F31 | **CoM2/Warlord Hasted melee strikes incorrectly share one Cause Fear sample.** The early First Strike or ordinary main strike (`$005B3B1E` / `$005B3B64`) and the Haste strike (`$005B3B8B`) are separate `ApplyAttack` calls; each independently performs the defender-Fear rolls in `ApplyAttack`. `calcMeleeTouchOutcome` instead conditions both convolved strikes on one `k`, and the First-Strike/Haste path explicitly couples `k_a`. Model independent fear draws per attacker call while preserving the appropriate shared pre-damage snapshot for the non-First-Strike simultaneous block; add both First-Strike and non-First-Strike Haste presets. | open | medium | CoM2 analysis, *Ranged and melee attack dispatch*; `Combat.PerformAttacks.R5.2d.evidence.md`; `combat.js:1341-1394,3854-3862` |
| F32 | **CoM2/Warlord defense dice above 15 ignore boosted To Block above 30%, but the calculator rolls every die at one probability.** `DefenseRoll` checks each die index before rolling: dice through `ToDefendCap` use the original `todef`; on die 16 with shipped `15/30`, a value above 30 is reduced to 30 and stays there. `singleAttackDmgDist` and `areaPerFigureDmgDist` instead use one `binomialPMF(defStr, toBlock)` for the full Defense. Model the block count as the convolution of at most 15 dice at normal To Block and the remaining dice at `min(To Block, 30%)`; add high-Defense presets at 20%, 30% and above 30%. MoM/CP/CoM 1 are unaffected. This closes Q14. | open | medium | CoM2 analysis, *Combat roll and ranged-distance helpers*; `Combat.ResolutionHelpers.R5.2e.evidence.md`; `engine.js:80-82,194-196` |
| F33 | **CoM2/Warlord heroes incorrectly receive ranged distance penalties.** `RangedPenalty` directly tests calculated `Units[au].ishero` at `$005B1843`, and shipped `HeroNoRangePenalty=0` makes that test set distance to zero at `$005B1857`; no Sharpshooting/hero-ability lookup exists. `distancePenalty` exempts heroes only for `com_6.08`. Extend the blanket hero exemption to CoM2 and Warlord, retain the separate magical-ranged exemption, and add a modern hero/nonhero pair at four and five tiles. This closes D14. | open | small | CoM2 analysis, *Combat roll and ranged-distance helpers*; `Combat.ResolutionHelpers.R5.2e.evidence.md`; `combat.js:216-229` |
| F34 | **CoM2/Warlord Bless defense is applied to unit attacks that the engine can never qualify.** `EffectiveDefense` requires Bless, `ismagic2`, a positive spell ID, and a Chaos/Death realm in that spell record (`$005966B8..$00596700`). `ApplyAttack` pushes spell ID zero at `$005B28ED` before calling it at `$005B292A`; therefore ranged, thrown, breath and gaze attacks cannot receive Bless defense through this caller, whatever realm the calculator infers. The current attack profiles set `blessEligible` for ranged, thrown and gazes. Remove that eligibility from `ApplyAttack`-shaped profiles while retaining it for actual positive-ID Chaos/Death spell damage; add paired magical-ranged/gaze versus Immolation coverage. This closes D6's scope half. | open | small | CoM2 analysis, *Resolution-time modifiers* and *Combat roll and ranged-distance helpers*; `Combat.ResolutionHelpers.R5.2e.evidence.md`; `combat.js:1740,1841-1887` |
| F35 | **CoM2/Warlord area spell damage incorrectly caps the wounded top figure at its remaining HP.** `DamageSpell` reads `TopFigureDamage` but the `aoe` branch at `$005C174C..$005C1780` never uses it: every subattack is capped at the full `HpPerFigure`, then all subattacks are applied as one aggregate. `calcAreaDamageDist` instead gives one subattack the wounded top figure's remaining-HP cap. Remove that special cap for modern-engine Immolation and CoM2 Wall of Fire while retaining it where another engine/path proves it; add a wounded multi-figure preset whose first area roll exceeds the top figure's remaining HP. | open | small | CoM2 analysis, *Direct spell damage and Wall of Fire*; `Spells.DamageSpells.R5.2g.evidence.md`; `engine.js:216-239`; `combat.js:2862,2946,3003,3060,3131,3198,4024` |
| F36 | **Warlord Wall of Fire is modelled as one capped area subattack, but the engine sends it through a repeated non-area spill loop.** Warlord removes spell 87's `Area` flag; `FirewallEffect` reaches `DamageSpell` through `ApplyDamageSpell`. `$005C1750 je $005C1850` enters the pre-tested condition, and `$005C1867 jl $005C1785` enters or repeats the spill body while `dam + topfdam > HpPerFigure(u)`. Every crossed figure boundary books that figure's remaining HP and makes a fresh Defense roll (`$005C17F0`) plus Invulnerability subtraction (`$005C1836`) on the remainder. The first iteration uses the wounded top figure; `$005C184B` then clears `topfdam`, so later iterations use full figure HP. `buildWallOfFirePhase` instead sets `targetFigs=1` and calls `calcAreaDamageDist`, discarding all spillover. Add a dedicated modern non-area spell distribution and a low-HP multi-figure Warlord preset; also integrate `ApplyDamageSpell`'s one-point first-positive-category adjustment. R5.2m proves that adjustment fires in combat when any `i` has `BaseUnits[i]` not dead and `incombat`, has calculated `Units[i].amplifier`, and has a calculated owner different from the target's; the spell argument is ignored and multiple copies do not stack. **Cost re-judged after the loop correction: medium remains appropriate** because `singleAttackDmgDist` already implements the same wounded-first/full-HP-later repeated-boundary defense chain, although the spell path still needs its own routing and tests. | open | medium | CoM2 analysis, *Direct spell damage and Wall of Fire* and *ApplyDamageSpell post-processing and AmplifiedDamage*; CoM2 tables, *Wall of Fire*; `Spells.DamageSpells.R5.2g.evidence.md`; `Spells.ApplyDamageSpell.R5.2j.evidence.md`; `Combat.AmplifiedDamage.R5.2m.evidence.md`; `engine.js:80-150`; `combat.js:2801-2815` |
| F37 | **CoM2/Warlord Magic Immunity must short-circuit magical spell damage, not merely supply Defense 100.** `$005C1309..$005C1337` returns the already-zero `damageT` before attack count, Black Sleep or any roll whenever the unit has Magic Immunity and the spell lacks `Nonmagic`. The calculator instead routes Immolation and Wall of Fire through a Defense-100 distribution, which can leak damage at ordinary To Block and becomes especially important once F32 splits capped defense dice. Add an explicit direct-spell immunity gate; retain Defense 100 for the other matching immunities and for non-spell attack profiles. | open | small | CoM2 analysis, *Direct spell damage and Wall of Fire*; `Spells.DamageSpells.R5.2g.evidence.md`; `combat.js:1128-1135,1841-1900,2801-2815` |
| F38 | **CoM2/Warlord Black Sleep does not convert Immolation or Wall of Fire to Doom damage.** After the Magic-Immunity exit and Defense setup, `$005C164D..$005C167C` sets the spell's local Doom flag for `EncBlackSleep` and computes `str * nofattacks` with no attack, defense or Invulnerability rolls. The calculator's `aDoomsB`/`bDoomsA` conversion reaches conventional attacks but every Immolation distribution still calls `calcAreaDamageDist`; apply the conversion to `DamageSpell`-shaped phases while preserving Magic Immunity's earlier exit. Add sleeping-target Immolation coverage. | open | small | CoM2 analysis, *Direct spell damage and Wall of Fire*; `Spells.DamageSpells.R5.2g.evidence.md`; `combat.js:2861-2863,2945-2947,3002-3004,3059-3061,3130-3132,3197-3199,4022-4025` |
| F39 | **Chaos Conjunction's direct-damage transform and combat input are absent.** With the event state positive, `$005C1141..$005C118D` multiplies eleven embedded spell IDs by the exact 80-bit value 1.34 and truncates; the set includes Immolation (99) but not Wall of Fire (87). `$005C1190..$005C11AF` separately gives Warp Lightning +2. The calculator has no Chaos Conjunction condition and leaves modern Immolation at 10. Add the combat-global input and apply `Trunc(str * 1.34)` to Immolation; do not modify Wall of Fire. | open | medium | CoM2 analysis, *Direct spell damage and Wall of Fire*; `Spells.DamageSpells.R5.2g.evidence.md`; `combat.js:1137-1144,3384-3390` |
| F40 | **CoM2/Warlord Wall of Fire incorrectly damages Teleporting or Merging attackers.** `FirewallEffect` calls `HasTeleMerge` before its Flying gate; that helper returns calculated `Units[u].teleporting or Units[u].merging`, so either state exits before `ApplyDamageSpell`. `buildWallOfFirePhase`/`wallOfFireActive` test only the global toggle and melee mode, and the calculator has no Merging ability definition. Add modern-version calculated Teleporting/Merging exclusions, expose and preserve Merging from the roster, and add paired ordinary/Teleporting/Merging melee-entry presets. | open | small | CoM2 analysis, *Direct spell damage and Wall of Fire*; `Combat.CallClosureHelpers.R5.2k.evidence.md`; `Spells.DamageSpells.R5.2g.evidence.md`; `combat.js:2789-2815,3392-3400` |

---

## 4. Engine verification

Claims the calculator implements that rest on prose or inference. IDs are the **queue**'s own —
each row here is a one-line index; the queue holds the reasoning, the code sites and the method.

### DOS builds — MoM 1.31, MoM CP 1.60, CoM 1

| ID | Claim | Cost |
|---|---|---|
| A31 | Level bonus tables — MoM's to-hit ladder. CoM column settled; MoM's six increment sites undecoded. | small |
| A32 | Shatter — what CP 1.60 changed after both writes, and CoM 1's undecoded eligibility gate. | small |
| A33 | The unidentified per-realm global debuff at `0x90A87` (CoM 1), not modelled at all. | medium |
| B1 | The 10%–100% to-hit clamp — the ceiling is unestablished everywhere, the floor outside 1.31. Ties to **Q3**. | small |
| B3 | The Life Steal damage curve — whether Life Steal reads the resistance-check return rather than re-rolling. Ties to **Q8**. | small |
| B4 | Damage rollover with a fresh defence roll per figure. Foundational to every printed number. | medium |
| B5 | Armor Piercing halves defence (floor) and never touches Immolation — cited to another calculator, not the game. | small |
| B6 | Invulnerability subtracts its bonus on *every* chained defence roll. | small |
| B7 | Which attack phases each touch effect rides. MoM proved this **data-driven**; the calculator hard-codes it. Ties to **Q4**, **D18**. | medium |
| B9 | Dispel Evil −4, and −9 against created undead — the binary tests a unit-type mutation flag, the calculator tests *created* undead. | small |

### CoM2 and Warlord — inherited from CoM 1 by prefix-match

The highest-risk group in the file: each is a `version.startsWith('com')` test, so a CoM 1 result
silently governs a different engine.

| ID | Claim | Cost |
|---|---|---|
| D1 | **Righteousness only.** `EffectiveDefense` step 8 confirms the 100-and-replace shape for Fire, Cold, Poison, Magic and Missile Immunity; Righteousness is not among the six the engine tests. Settle alongside D3. | small |
| D2 | Weapon Immunity eligibility, and MoM's generic-hull bypass (a 1991 race-number artefact). **Magnitude resolved** — `WeaponImmunityDefenseBonus` 8 / 10, additive. | medium |
| D3 | **Righteousness only.** Cause Fear's −3 modifier is exact in `ApplyAttack`; `GetEffectiveResistance` confirms Magic Immunity assigns 100 for the Death-realm roll rather than adding 30. Whether Righteousness contributes elsewhere remains open alongside D1. | small |
| ~~D4~~ | ~~Poison being realm-less.~~ **Fully resolved 2026-08-02.** `ApplyAttack` passes realm 0 and `PoisonSavePenalty`, gates only on Poison Immunity, and does not directly test Magic Immunity. | — |
| ~~D5~~ | ~~Blur as ability vs enchantment, and whose Illusion Immunity is tested.~~ **Fully resolved 2026-08-02.** Blur is a combat-global value selected through turn-relative `CGADEnemy`, not directly through the target unit; Invisibility is unit-owned, each hit is tested independently, and attacker Illusion Immunity disables the reduction. On a melee counterattack `CGADEnemy` selects the counterattacker's own side because the combat-turn role does not change. The representation/selection defect is F24. | — |
| ~~D6~~ | ~~Which attack types Bless's defence half covers.~~ **Fully resolved 2026-08-02.** `EffectiveDefense` requires `ismagic2`, Bless, `spellid > 0`, and a Chaos/Death spell realm; `ApplyAttack` always passes spell ID 0, so no unit attack qualifies. The calculator's wide unit-attack scope is F34. Magnitudes remain CoM2 5/5, Warlord 7/4. | — |
| ~~D7~~ | ~~The realm/attack gate on Elemental Armor and Resist Elements.~~ **Fully resolved 2026-08-02.** Resistance: Resist Elements +4 against Nature only; Elemental Armor has no resistance component. Defense: both bonuses apply when `ismagic2 or isbreath`, with `ApplyAttack` supplying `magicranged` and its breath flag. | — |
| D8 | Weakness and Mind Storm magnitudes. Warlord's breath half is script-cited; the CoM2 half sits in an enchantment-ID-keyed recompute that must be located first. | medium |
| ~~D9~~ | ~~Vertigo~~ — **fully resolved 2026-07-29.** CoM2 is −25 To Hit / −7 To Block from the compiled block, F1 brought the display into line, and Warlord inherits it unchanged: `EncVertigo` appears twice in its stat scripts and both are a flag copy, not a magnitude. | — |
| ~~D10~~ | ~~Haste does not double counter-attacks.~~ **Fully resolved 2026-08-02.** `PerformMeleeAttack` makes exactly one counter `ApplyAttack` call at `$005B3BAC`, outside the attacker-Haste loops. Haste does repeat attacker gazes, breath, Thrown and melee; the gaze discrepancy is F30. | — |
| D11 | Invisibility's −10% to-hit malus is MoM-only. | small |
| D12 | Assorted `com*` stat constants: CC fire breath 4, Chaos Surge +resistance, Land Linking breath (**Q13**), Focus Magic, Warp halving ranged, Immolation strength 10. **Flame Blade resolved** at +3 melee / +2 missile / thrown 0 CoM2, 2 Warlord. | small each |

### CoM2- and Warlord-specific claims

*(D13 — level bonus tables — and D15 — Wall of Fire — were resolved on 2026-07-29 from
`Levelbonus.INI` and `SPELLS.INI`; both matched the calculator exactly. D16's inputs were read
that day, and R5.2c corrected its rounding shape on 2026-08-02; the remaining calculator
discrepancy is F7 in §3. IDs are not reused.)*

| ID | Claim | Cost |
|---|---|---|
| ~~D14~~ | ~~Whether CoM 1's hero exemption and Long Range cap survived.~~ **Fully resolved 2026-08-02.** `RangedPenalty` directly tests `Units[au].ishero`, not an ability; shipped zero enables the exemption. Long Range caps an applicable penalty at the configured base 10. The calculator's missing modern hero exemption is F33. | — |
| D17 | **Modern-engine shape resolved:** Destruction is Chaos-realm, takes the stored modifier, is skipped only by Magic Immunity, and assigns 150 to result field 0 on a failed save. The roster still ships `Destruction=0`. Only the “absent from older engines” half remains for R6. | small |
| D18 | **Compiled dispatcher partly resolved.** All six merged riders run for attack types 1–5 and are skipped for gazes 6–8; the calculator's gaze mismatch is F25. What remains is a complete Warlord flag-placement audit, especially its script-driven Stoning/Death Touch exclusion from magical ranged. | small |
| D19 | CoM2-only abilities with no cross-version anchor: Inner Power, Blazing Eyes, Mislead, Destiny, Discipline, Endurance, Eternal Night / Darkness doubling. | medium |
| D20 | Chaos Surge scope. CoM 1 settled and now followed; the narrower CoM2 scope rests on helptext alone, and the magnitudes match CoM 1 exactly — which makes the scope difference the suspicious half. | medium |
| D21 | Level ladder for a gaze. Sub-items 1 (ordering) and 2 (Warp reaching a gaze) **resolved 2026-07-28**; only the ladder remains. The D13 read confirms `Levelbonus.INI` has no column that could express a special-attack distinction, so the gate is in the executable if it survives at all. | medium |
| D27 | **The hero level ladder is not modelled.** `getLevelBonuses` gives heroes the 6-step `[Normal]` ladder; `Levelbonus.INI` `[Hero]` is a 9-step table of a different shape (magic ranged at half the missile rate, thrown/breath at half attack, Warlord-only to-hit steps at levels 3–4 and 7–8). Values are in hand — what needs deciding is UI scope, since one six-entry level list serves every unit. | medium |

### Warlord script checks

| ID | Item | Status | Cost |
|---|---|---|---|
| ~~S1~~ | ~~Check Magitek Science, Xenoveterinary and Corruption radiation against the script.~~ Magitek Science exposed a Battle Armor eligibility defect, now fixed; the other two matched or were out of scope. Evidence in **discrepancies** (§12 and *Script checks with no calculator discrepancy*). | **closed 2026-07-29** | free |
| ~~S2~~ | ~~Magitek Engine — movement.~~ Resolved in favour of the script: +2 overland / +2 combat movement. Movement is out of calculator scope; the combat-stat effects were already correct. Evidence in **discrepancies** (§4). | **closed 2026-07-29** | free |

---

## 5. Modelling gaps

From **SPEC**, *Known modelling limitations* — that section stays the text's home; these rows only
separate what we have decided to live with from what is deferred work.

| ID | Limitation | Status |
|---|---|---|
| M1 | Life Steal's *displayed damage distribution* is an approximation (phase count × single-firing). Its capped damage expectation remains exact, but the self-healing expectation incorrectly inherits the target-damage cap; that separate confirmed defect is F28. | accepted for display shape; healing defect open |
| M2 | Damage is capped at the target's remaining HP; overkill is not tracked. Healing amounts passed independently by the engine must not inherit that cap; F27 and F28 track the two violations. | accepted for damage only |
| M3 | **Destruction is modelled only for CoM2/Warlord.** The MoM/CP/CoM 1 touch dispatcher also identifies Destruction as a Chaos effect, so Elemental Armor and Resist Elements should protect against it there. That path is unimplemented. | open |
| ~~M4~~ | ~~`fbRtbMod` is not cleanly attributable~~ | **closed 2026-07-29 at R1 stage 9** — two steps, Fiery Fury in `b` and the blades' excess in `c`; no number changed |
| M5 | **One ranged/thrown/breath slot.** Bombs&Grenades can add to an existing Thrown attack but cannot display its granted Thrown alongside an independent ranged or breath attack. Now owned by **R3**, which replaces the slot with the engine's four channels; 29 Warlord roster units are affected today. | open, structural — **R3** |
| M6 | **Lava Smelter records one mineral-pair grant at a time.** The scripts evaluate all five pairs independently, so a unit can carry several simultaneous grants. | open |
| M7 | **Ammunition is not modelled, in any version.** Both engines carry a shot count — MoM `ammo` (+0x03, roster `Shots`: 8 for archers, 10 for the Catapult), CoM2 `maxammo`/`ammo` (`SMaxAmmo`=55/`SAmmo`=56, `UNITS.INI` `Ammo`) — and neither reaches the calculator. Decided 2026-07-31 while settling the engine-shaped card field sets (**R4**): the calculator resolves one engagement, not a multi-turn battle, so a shot budget has nothing to deplete. **Ammo is therefore excluded from the unit card in every version.** Known consequence: a many-round ranged scenario can overstate an ammo-limited unit's output. | accepted |
| M8 | **Regeneration is not modelled, in any version.** Both engines define it per unit and shape it differently — MoM as an `Abilities` bit (`0x2000`, boolean; all 8 MoM roster units carry `Regeneration=1`), CoM2 as a magnitude (`regeneration : shortint`, `SRegeneration`=41, `−1` = absent, roster values up to 7). All four rosters carry the token, but no `ABILITY_DEFS` entry matches it, so `abilitiesFromTokens` drops it at load. Confirmed intentional 2026-07-31, on the same ground as **M7**: it is between-turn healing and the calculator resolves a single engagement. Excluded from the card in every version. Known consequence: a regenerating unit's survivability across a long battle is not represented. | accepted |

---

## 6. Open mechanic questions

From **TODO**, which stays their home. `asked` = also on the list put to the maintainer/community.

| ID | Question | Status | Links |
|---|---|---|---|
| Q1 | Troll Shaman 80 vs manual 50, Magician 180 vs 120, and Magician Melee 4 vs 3. Is there an undocumented Troll +1 Melee, or is the manual wrong? | open | — |
| Q2 | Draconian common units carry +1 Resistance over the manual across four unit types — likely an undocumented racial modifier. | open | — |
| Q3 | Warp Reality's page says to-hit can reach 0%; the to-hit page says never below 10%. Which, and does it differ by version? | open, asked | B1 |
| Q4 | Does Chaos Spawn's poison touch trigger on doom gaze, melee, or both (i.e. twice per sequence)? **CoM2/Warlord half resolved:** R5.2c skips every touch rider for attack types 6–8, so Poison rides melee but not Doom Gaze. DOS engines remain open under B7. | open, partially resolved | B7, D18, F25 |
| Q5 | "Weird defense behavior on page 25" — needs the source and page identified before it can be worked. | open, underspecified | — |
| Q6 | CoM's High Prayer text says +3 attack; MoM and CoM2 say +2, and the CoM manual says it did not change it. Assumed +2 everywhere. | open | — |
| ~~Q7~~ | ~~Supreme Light's `defense += resistance/3` reads a **live** resistance~~ | **closed 2026-07-29 at R1 stage 10** — the step reads `u.res` at its own position in each engine | D24 |
| Q8 | Manuals say Wraiths have Life Steal −4; observed behaviour suggests −3. | open | B3 |
| Q9 | With Blazing Eyes, can a unit have Doom Gaze *and* ranged attacks at once? Settled for the DOS engine (one shared slot); CoM2 is a different engine — and its gaze fields are separate from `ranged` (**CoM2 analysis**, *Gaze attacks*), so **R4** is expected to settle the CoM2 half. | open, asked | D19, R4 |
| Q10 | Does Destiny remove the buff from magical / mithril / adamantium weapons? | open, asked | D19 |
| Q11 | Does Animate Dead give +ranged attack? | open | queue C1 |
| Q12 | Does "ranged" include thrown and breath? Answered for MoM 1.31 to-hit (**no**); open for other versions and for non-to-hit effects. | open, asked | — |
| Q13 | CoM2 helptext says Land Linking gives +2 breath; the CoM2 and CoM 1 manuals do not mention breath. | open, asked | D12 |
| Q15 | **Does anything use `unitT.savemodifier`?** Declared at `Typedec.pas:181`, but no `UNITS.INI` key in either roster, no stat ID in `MASTER.CAS`, and no reference in any `.CAS` file in either script set. Recorded as apparently unused and **excluded from R4's CoM2 card field set** on that basis; revisit if a `Caster.exe` read turns up. Negative result about the data and script layers only — a computed-pointer access in the binary would not have shown up. | open | CoM2 analysis, *unitT field identities*; R4 |
| Q16 | **Should the spell-damage reconstructions get their own top-level section in `CoM2 binary analysis.md`?** Unlike the other Q rows this is a documentation-structure question, not a mechanic one; its evidence home is `Caster binary/README.md`. R5.2c, R5.2d, R5.2f, R5.2h and R5.2l each own a `###` section, but R5.2g and R5.2j/R5.2m are `#####` subsections nested under *Resolution-time modifiers (R5.2e …)*, and R5.2k has no section of its own at all. Direct spell damage is not a resolution-time modifier, and the R5.C cross-artifact pass found the review-provenance drift concentrated in exactly these nested rows — the nesting is the likely cause. Restructuring means moving three subsections and re-anchoring every cross-reference to them (F36 and F40 both cite the current headings), so it was deliberately not done inside the consistency pass. | open | R5.C; CoM2 analysis, *Direct spell damage and Wall of Fire*; F36, F40 |
| ~~Q14~~ | ~~What does the To Defend cap do?~~ **Closed 2026-08-02 by R5.2e.** `DefenseRoll` uses the original To Defend for dice 1 through `ToDefendCap`; from the next die onward, a value above `ToDefendCappedValue` is reduced to that value and remains reduced. With shipped 15/30, only dice 16+ lose an above-30% chance. The calculator defect is F32. | closed | CoM2 tables, *To Defend cap*; `Combat.ResolutionHelpers.R5.2e.evidence.md` |

---

## 7. Blocked on a person

Not researchable from the sources we hold.

| ID | Question |
|---|---|
| X1 | Offer the maintainer the compiled list of CoM2-manual-vs-`UNITS.INI` discrepancies. |
| X2 | When CoM2 prose says "+X attack", is that synonymous with "+X melee attack"? |
| X3 | And "+X ranged" — which of missile / boulder / magical / thrown / breath / gaze does it cover? |
| X4 | Are Seravy's new defence formulas ([realmsbeyond post](https://www.realmsbeyond.net/forums/showthread.php?tid=8106&pid=645212#pid645212)) in current CoM or CoM2? |
| X5 | Sky Drake has Negate First Strike in `UNITS.INI` but not in the manual. |
| X6 | Does "regular units" exclude heroes? The Warlord gate at `UnitCalc.CAS:1405-1407` lets heroes through, and `UnitCalcPre.CAS` uses `ISHERO()` in five other places — so the omission looks deliberate, but if the prose means to exclude heroes the code is wrong. (**discrepancies**, *Open questions*) |

---

## Appendix A — R1 staging plan

**Why.** `deriveUnitStats` currently models the engine's pipeline as a *sum of per-phase
numbers*. That works for additive modifiers and cannot express order at all, because addition
commutes. Every non-additive effect therefore needs a second mechanism, and there are two of
them today:

- **Written back into a bucket** — when the effect reduces to an additive delta, computed from a
  named subtotal: Colossal Strength, Xenoveterinary, Upgraded Explosive's fire-breath doubling.
- **Applied to the finished total in an ad-hoc tail** — Berserk `×2`, Blaze of Glory, the three
  Warps, Beat of Swiftness `×0.9`, Hierophany `×0.5`, Shatter `=1` (melee and rtb).

`warpLate` is a third patch on top: a bucket-shaped workaround for CoM 1 writing Darkness,
Supreme Light and Tactician *after* Warp Creature. It buys one verified ordering without a
rewrite, and it does not generalise — a second such finding would need a second bucket.

A fourth class is not addressed by any of the above: effects that read a **different** stat than
they write, each currently its own hand-rolled reconstruction.

| Effect | Reads | Writes | Before R1 | After stages 1–8 |
|---|---|---|---|---|
| Supreme Light | live resistance | defence | rebuilt a partial res sum by hand | one step in region `e`, reading `u.res` |
| Blaze of Glory | current defence | melee, defence | filtered defence contributions into a melee bonus | one step in `d`: `u.atk += u.def`, then `u.def = 0` (**F8 closed**) |
| Holy Armor | `defBase` | defence *or* To Block | applied after a named `defBase` subtotal | one step reading `u.def` at its own position |
| Psycho Force / Pneuma Field | current resistance | damage %, Life Steal | reconstructed "resistance after Warp Resist" by hand | reads the record after the sequence |

Supreme Light is the clearest failure: the engine reads resistance *after* Warp Resist and
Darkness and *before* Tactician, and the hand-built sum has to be extended by hand every time a
resistance modifier is added. Five parallel per-stat lists do not fix this — a def step still
has to reach into the res list at the right position.

**Target.** One mechanism, shaped like the engine: **a single phase-tagged sequence of effect
steps over a mutable stat block**, not five per-stat lists. Each step names the stats it writes
and may read any stat's current value. Darkness becomes one step writing four stats, as it is at
`0x9084C`; Supreme Light one step reading live `res`; Warp one step at the position its engine
writes it. MoM and CoM 1 then differ only in *where the Warp step sits* — no `warpLate`, no
per-modifier version routing, no tail, and no separate mechanism for the table above.

The decisive argument is evidence shape. The binary yields orderings as *effects in address
order, each writing several stats* — see the CoM 1 table at `MoM binary analysis.md:1067`. Five
per-stat lists force every such finding to be shredded across five places on the way in, and the
fact that the writes were one atomic block survives only as a comment. A single list is
isomorphic to the source.

### Where the ordering evidence comes from — **it is already in hand**

| Region | Order lives in | State |
|---|---|---|
| `base` | permanent `ABase` writes before combat | **irrelevant** — additive, commutes |
| `b`, `d` (Warlord) | `UnitCalcPre.CAS` / `UnitCalc.CAS` line order | **mapped** 2026-07-28, md5-pinned, top-level order exhaustive |
| `a`, `c`, `e` (CoM2 / Warlord) | `Caster.exe` `@Units@RecalculateUnits`, VA `0x599920` | **mapped** 2026-07-28, block by block; three narrow naming residuals |
| resolution (CoM2 / Warlord) | `GetEffectiveResistance`, `EffectiveDefense` | **mapped** 2026-07-29, both in execution order |
| `a`, `c` (MoM / CoM 1) | `WIZARDS.EXE` recompute `0x8FF09`–`0x90B8E` | tail decoded; 3,205 bytes, bounded |

All of it in **CoM2 analysis**, *Unit stat recalculation* and *Resolution-time modifiers*.

**MoM's a/c split is inert and does not transfer.** `b` and `d` are empty there, so `a` and `c`
are adjacent with nothing between them — the labels collapse to one sequence. The boundary only
acquires consequences in CoM2/Warlord, where `b` sits between them and contains transforms
(Xenoveterinary, Upgraded Explosive's doubling), so an effect misfiled as `a` when it is `c` gets
wrongly scaled. That was **D25**, closed at stage 10: `ApplyLevelBonus` runs between Destiny's
transformation and Focus Magic, which is execution order rather than layout.

A step position may still be **provisional and marked as such**, the same discipline SPEC.md
applies to phase attribution (*Stat derivation contract*, step 4) — MoM and CoM 1 are not mapped
to this resolution. City Walls was subsequently located in `EffectiveDefense`; only MoM's
`berserk` still rests on that provisional judgment.

**The original sequencing argument is spent.** This appendix used to defer the effect-order sweep
until after stage 10, reasoning that sweeping first would mean holding N results in a document
through a rewrite and encoding them meanwhile into a model that cannot express them — which is
how `warpLate` came to exist. That sweep has since happened anyway. The results are in the
document, and D22–D26 *are* the accumulation that argument warned about. The conclusion inverts:
the sequence is the only thing that can absorb what has already been found, so it is priority 1.

### Staging

Each stage ends with all three suites green: `node tools/node_unit_checks.js` (177),
in-browser `runTests()` (911), `npx playwright test` (32). See [CLAUDE.md](./CLAUDE.md),
*Testing with Playwright* — `runTests()` in the browser is the only sanctioned way to evaluate
presets.

**Stage 0 is complete** — see §2 for what each item returned. Its three design risks are all
retired: there are exactly two CAS hook call sites and no third, the regions decompose into
nameable per-effect blocks, and Warlord's `b`/`d` source order is mapped. Build from here.

1. **Machinery alongside the buckets.** ✅ Step type, the mutable unit object and its
   permanent-base companion, the runner, `halt`, and the optional per-step trace. Nothing
   migrated. *(`ctx.base` is plumbed and tested but unused: the cross-stat reads all turned out
   to be positional — the field simply is the wanted value where the step sits — so nothing has
   needed the permanent record yet.)*
2. **Equivalence harness.** ✅ Compute every stat both ways and throw on mismatch, so the
   911-preset suite proves equivalence rather than spot-checking it. Deleted in stage 8.
   Benchmarked here: see the performance note in §2.
3. **Migrate `res`** ✅ — smallest surface, one transform (Warp Resist).
4. **Migrate `def`** ✅ — adds the Holy Armor `> 5` threshold, Beat of Swiftness, Hierophany and
   the surviving-armor sum. *Does not close Q7* — see §2. Supreme Light still reads the
   hand-built partial resistance sum; it becomes a live read when stage 10 puts it in region `e`.
5. **Migrate `atk`** ✅ — Berserk, Blaze of Glory, Warp, Shatter, Colossal Strength.
6. **Migrate `rtb`** ✅ — Warp, Shatter, Colossal, and Upgraded Explosive's doubling.
7. **Migrate `hp`** ✅ (Xenoveterinary), and the two **gaze strengths**, which are fields of the
   same record: they share the engine's `.ranged` slot with `rtb`.
8. **Delete** ✅ the bucket objects, `warpLate`, `PRE_WARP_PHASES`, `preWarpTerm`/`postWarpTerm`,
   `abilMods.preWarp`, and the equivalence harness; SPEC.md's *Stat derivation contract* and
   *Warp Creature ordering* rewritten around steps. `getAbilityStatModifiers`'s own `warpLate`
   accumulator survives — it is the CoM 1 ordering evidence, and stage 9 owns it.

   One reconstruction initially survived: **Blaze of Glory's surviving Armor**. Placing the
   step at stage 10 exposed that the classification itself was wrong — the script zeroes
   Defense outright. **F8 closed 2026-07-29** by making that direct write and deleting the
   final hand-built stat sum.
9. **Convert `getAbilityStatModifiers`** to emit steps rather than summed buckets. ✅ Done: it is
   `getAbilityStatSteps`, and the flat-total object is gone — the To Hit / To Block totals are
   now record fields the steps write. The remaining flat sums were subsequently eliminated:
   Supreme Light became a live read at stage 10, and Blaze of Glory at F8.
   **M4 closed here.** The Tactician phase question moved to stage 10 rather than closing, since
   the CoM2 evidence for it (region `c`, +0x0C890) is a position, which is what stage 10 encodes.
10. ✅ **Encode the mapped sequence.** Not a re-check of the handful of orderings already tested
    (`warpAttackBeforeSupremeLightCoM`, `warpAttackBeforeTacticianCoM`,
    `warpDefenseBeforeSupremeLightCoM`, `shatterBeforeSupremeLightCoM`,
    `warpDarknessOrderMoM`/`CoM`) — that is the small part. This is where the region maps in
    **CoM2 analysis** became step positions — most of D21–D26's value and the payoff for the
    whole refactor. Each finding landed as a step move plus a preset; §2 has the table of what
    moved. This is where `tail` and `warpLate` were deleted.
11. **Resolution sequence — `EffectiveDefense`.** *(Now register item R2, priority 1.)* Nine steps, keyed by attack type, replacing the
    conditional chain in `computeDefenseProfile`. Evaluated per attack rather than eagerly for
    every attack type as today. Settles the shape half of **D1** and folds in **D2**'s Weapon
    Immunity ordering.
12. **Resolution sequence — `GetEffectiveResistance`.** Six steps, keyed by realm. Note the two
    `:= 100` assignments precede all three additions, so a magic-immune unit with Bless or Resist
    Magic finishes *above* 100 — the calculator does not model that today.

Migration stayed stat-by-stat despite the single list: steps declare which stats they write, so
the runner applied step results for migrated stats and buckets for the rest.

Stages 11–12 follow the derivation migration rather than interleaving with it, so each half lands
green on its own. They are a different axis — per *(defender, attacker, attack type)* rather than
per unit, and never writing back — but the same step type and the same runner. Keeping a second,
hand-rolled mechanism for them would rebuild the exact problem this refactor exists to end: the
sequence is short-circuiting, additive, halving, replacing and then additive again on top of the
replacement, which is the same vocabulary as Warp and Shatter and equally beyond a bucket.

The `0xE150` extent is what the symbol reports, and much of a routine that size is scaffolding
rather than stat work: region `c` alone decodes to 12,767 instructions, of which 2,356 calls are
Delphi `@System@@BoundErr` / `@System@@IntOver` guards. **CoM2 analysis** collapses those and
describes the semantic blocks, so the step list is built from that decomposition, not from the
raw instruction count.

### Design decisions (settled 2026-07-29)

All seven questions that gated stage 1 are answered. The governing principle throughout: **model
what the binary does, and do not carve exceptions out of that for implementation convenience.**

**1. The list covers every region, `base` and `a` included.** No region stays a sum.

**2. Steps mutate a unit object; there is no subtotal-read mechanism.** A step reads whatever
field it needs at its own position, exactly as the engine does — `unit.resistance`, not
`valueBefore(state, 'warp')`. The apparent need for labelled subtotal reads was an artefact of
the bucket model and disappears with it. The four cross-stat effects in the table above all
reduce to a plain field read; Holy Armor's `defBase` and Upgraded Explosive's `base+a+b` look
like subtotals but are **positional** — the field simply *is* that value where those steps sit.

Keep **two records**, as the engine does: the permanent base (`ABase`, copied in region `a`) and
the calculated one the steps mutate. A step wanting the permanent value reads the base record.
That is two field reads, still no labels.

**3. One list, CoM2-shaped, for all versions.** Start on the assumption it covers everything and
split only if forced. Where an effect is ordered differently between versions, prefer modelling
it as **two version-exclusive steps** over one step with a version predicate — it keeps both the
runner and the list trivial, and makes the divergence visible instead of hidden in a condition.

**4. Display stays on finished totals**, with both records available the red number is just
`final − base`. **The runner keeps an optional per-step trace** — which step wrote which field,
and by how much. Not needed for the red numbers; wanted for an ordered "what modified this unit"
breakdown in a tooltip. It was the natural home for **M4**'s `fbRtbMod` attribution, which stage 9 instead resolved by splitting the term into two steps. Fill it
only when asked.

**5. Step order: migrate at today's positions, move them at stage 10.**

- *During stages 1–8, order is not a free choice for any step* — verified or not. Every step is
  declared at the position its bucket gives it today, so the migration is purely structural and
  changes no output. The equivalence harness compares step results against bucket results across
  all 911 presets, so **any** position change registers as a mismatch, including one we believe is
  more correct. That is the harness's whole purpose, and it is why known-wrong placements such as
  D22's Warp stay wrong until the buckets are gone.
- *The harness cannot outlive stage 8*, since it compares against buckets and stage 8 deletes
  them. Stage 9 (`getAbilityStatModifiers`) is also meant to be behaviour-preserving; its net is
  the 911-preset suite itself, which asserts absolute expected values rather than equivalence.
- *At stage 10, positions move*, from the region map in **CoM2 analysis**, each as a step move
  plus a test. Behaviour changes here by intention — this is where D22–D26 land and where the
  bugs get fixed.
- *For an effect the map does not locate*, default it to `base` — by deduction, not observation:
  regions `a`–`e` and the resolution routines are mapped, so a permanent pre-combat write is the
  only remaining place a stat modification can live. Flag such placements as deduced. **Two
  limits:** the mapping is strong but not airtight (`b`/`d` are exhaustive only at top level,
  `c` has three residuals, and *Resolution-time modifiers* records "not found, not absent" for
  two effects); and before defaulting to `base`, check whether the engine models the effect as a
  stat write **at all** — it may be applied in `@Combat@ApplyAttack` / `Dealdamage`, or be a
  flag consumed elsewhere, in which case the calculator's stat modifier is the error and `base`
  would bury it. CoM2/Warlord only: MoM and CoM 1 have just the recompute tail decoded, so the
  "nowhere else left" step does not hold for them.

**6. Performance is not a gate.** A benchmark at stage 2 stays worthwhile as information, but it
does not block: the step runner is expected to beat the current arithmetic, and
`computeDefenseProfile` in particular does eager work per attack type that the resolution
sequence will make lazy.

**7. Resolution steps are ordinary steps.** Same step type, same runner, same unit object — run
on a **scratch copy**, which is discarded afterwards. "Never writes back" then falls out of
copying rather than needing a separate type. This is the faithful reading, not merely the
convenient one: both routines form a pointer to `Units[u]`, the calculated record, and accumulate
into a local, so the engine has the whole struct available and merely happens to touch one field.

Attack context (realm, the ~10 attack-type flags) is passed to the sequence and available to step
predicates, the same way version is.

**One new primitive:** `halt`. `EffectiveDefense` step 2 returns immediately when the attack is
Illusion and the defender lacks Illusion Immunity, so no later bonus or immunity applies. Nothing
in the derivation phases needs it; the resolution sequences do.

### Known orderings to encode

From **MoM analysis**, *Warp Creature runs early*:

| Engine | Order within the recompute |
|---|---|
| MoM 1.31 / CP 1.60 | … → Prayer/High Prayer → Darkness → Warp (`0x90A63`, `0x90AA9`, `0x90AC9`) → Shatter → clamp |
| CoM 1 | … → Prayer/High Prayer → Warp (`0x9074C`) → Shatter (`0x907DC`) → Darkness → Supreme Light → Tactician → Eternal Night → clamp |
| CoM2 / Warlord | … → Haste → Vertigo → Weakness → Mind Storm → Warp (+0x0BA3C, +0x0BCDF, +0x0BDF7) → Shatter (+0x0BF62) → … → *`d`* → **aura pass** → **Supreme Light** (both region `e`) |

CoM2/Warlord follow **MoM's shape for Warp and Shatter**, which is what the calculator already
assumes. What it does not model is region `e` — that is D22–D24 above.

---

## Appendix B — task detail

Detail for items whose evidence lives elsewhere but whose *task* has no other home.

### F3 — Golem's intrinsic Resist Elements

Region `a` tests base unit type 81 (`UnitGolem`) and writes
`ItemEnchantmentFlags[EncResistElements]` before either stat-calculation hook. This applies to
CoM2 and to Warlord, which uses the same executable. The CoM2 manual also lists Resist Elements
on the Golem, but neither version's `UNITS.INI` does, so the generated `units_com2.js` and
`units_warlord.js` records omit it and the calculator does not grant its defence.

Fix this through the generators or another source-level derived-unit rule; do not hand-edit the
generated unit files. Add CoM2 and Warlord presets in which a Golem defends against an attack
that Resist Elements affects, plus a nearby non-Golem control.

### F5 — Audit the two-stage To Hit clamp

At the start of region `e`, the engine first clamps common To Hit to 10–100. It then adjusts
the Melee, Ranged, Thrown and shared Breath channel modifiers so `common + channel` is also in
10–100. A single clamp of a flattened effective value is not generally equivalent: raw common
0 plus Ranged +20 becomes 30 in the engine, while clamping the sum once gives 20.

The 2026-07-30 sequential-transform audit established that the answer is already **no**:
`deriveUnitStats` combines most To-Hit/To-Block writes after `runStatSteps`, so their engine
positions and the first clamp are absent from the record. Extend the record with common To Hit,
To Block and the Melee/Ranged/Thrown/Breath-specific channels; emit level, item/weapon, Holy
Weapon, Ballistics, Xenoveterinary, Radio, True Sight, Hurricane, Vertigo, Plague, Great
Unbinding and every other mapped write at its engine position. Then perform the common clamp and
four sum clamps at the head of `e`.

Cover lower and upper bounds for all four attack channels, including raw common 0 plus Ranged
+20 becoming 30 rather than 20. Fire and Lightning Breath share the Breath channel. The trace
must show the pre-clamp common/channel values and both normalization stages.

### F12 — Destiny's position among the permanent writes

The position is settled: Destiny doubles the accumulated region-`base` total, so its step belongs
at the **end** of `base`, not ahead of it. What blocks the move is the pre-sequence chain in
`stats.js:476-579`, whose writes a doubling step at the end of `base` would take in — some
rightly, some not:

| Pre-sequence write | Position | Doubled by Destiny? |
|---|---|---|
| Chaos Channels fire breath `+= 4` | `a`, `+0x005C8`–`+0x00688`, exact | **yes** — `a` precedes Destiny at `+0x00A62` |
| Lightning Blade `= 1` | **not located** in any `.CAS` | unknown |
| Focus Magic conversion (ranged type 34, strength `max(…, 3)`) | `c` `+0x00D3F`; Warlord `d` `UnitCalc.CAS:515` | no |
| Vampirism | `d` — `UnitCalc.CAS:1248-1258` | no |
| Shadow Strike | `d` — `UnitCalc.CAS:1265-1266` | no |

**The real blocker is the record's single `rtb` slot, not the positions.** `rangedType` and
`thrownType` are not engine state: `MASTER.CAS` gives five separate attack-strength fields
(`SAttack`=12, `SRanged`=14, `SFireBreath`=36, `SLightningBreath`=37, `SThrown`=40 — record
offsets `+0x2C`/`+0x30`/`+0x34` for the last three) and exactly one type field,
`SRangedType`=27. The two type strings are the calculator's projection of which of three fields
is non-zero onto one slot. Vampirism reads all three separately and writes four fields with no
type involved; Shadow Strike is `SThrown += 1 + %I(SAttack/3)`. And where a type write does
exist — Focus Magic's ranged type 34, Energy Cannon's 40 — the engine writes type and strength
in one block, so splitting them across the sequence boundary is the shredding SPEC's *one
sequence, one record* rule exists to prevent.

So F12 is sequenced behind **R3**, which widens the record to the engine's own fields. With those,
Destiny is a one-line end-of-`base` step doubling exactly what *CoM2 analysis* says it doubles, and
the other four become ordinary atomic steps at their positions; only Lightning Blade still needs
locating. The Shadow Strike compromise at `stats.js:547` ("the single-rtb model can't hold a second
attack") dissolves with it.

### F6 — Chaos Channels Fire Breath coexistence

Region `a` establishes the recalculation arithmetic as `firebreath += 4` whenever
`EncCCBreath` is present. It does not establish whether vanilla spell targeting or application
can place that flag on a unit which already has Fire Breath. The calculator currently treats
existing Fire Breath differently in CoM2 and Warlord, including an artificial CoM2 preset that
expects replacement rather than addition.

Trace the CoM2 spell eligibility/application path for the Fire Breath result. If coexistence is
reachable, change CoM2 to additive arithmetic and update the preset; if it is unreachable, make
the calculator state unrepresentable or explicitly treat that preset as an artificial
out-of-engine case. Warlord eligibility must additionally be checked against its scripts, which
can widen or alter the base executable's targeting rules.

**Start from the table.** `MODDING.INI [Spells]` carries `CCRangedFBAllowed=0` — *"Chaos Channels
can add Fire Breath to units that have ranged attacks? 0 - No"* — identically in CoM2 and
Warlord. That is the adjacent gate rather than this question exactly (it concerns *ranged*
attacks, not existing Fire Breath), but two things follow: this class of eligibility is
table-driven, so F6's own answer may be a key rather than a code path; and the two versions are
configured the same here, which undercuts the calculator treating them differently.
