# Calculator work history

Short index of completed calculator work. Behavior lives in `SPEC.md`; implementation evidence
lives under `Reference docs/`; benchmark comparisons live in `DUAL-AGENT-BENCHMARK.md`. Detailed
pre-2026-08-10 narratives remain recoverable from git history.

## 2026-08-13

- **F6 — DOS Chaos Channels shared attack slot.** MoM 1.31 now admits the Fire Breath
  result only for a base None/Thrown slot with signed strength at most 3; CP 1.60 and CoM 6.08
  use the patched ceiling of 0. Gaze and existing Breath types reject the result, so DOS no
  longer invents a second attack channel; admitted slots receive the exact 2/2/4 strengths.
  CoM2 1.05.11 and Warlord 1.5.12.7 retain independent channels and add Fire Breath 4 beside
  ranged, Thrown, Lightning Breath, and Gaze. Durable reconstruction evidence is in
  [`F6.evidence.md`](../Reference%20docs/DOS%20reconstructed/F6.evidence.md).
- **F5 — ordered chance transforms and modern two-stage clamp.** CoM2 1.05.11 and Warlord
  1.5.12.7 now carry common/channel To Hit and To Defend writes on the source-ordered unit record.
  Region `e` clamps common To Hit to 10–100 before normalizing each channel against it: a common
  −50 modifier plus a +10 ranged-channel modifier now resolves as 10% melee and 20% ranged, not
  10% for both. Modern signed To Defend remains unclamped in recalculation and is naturally bounded
  by the defense-roll probability; MoM 1.31, CP 1.60 and CoM 6.08 retain their legacy final-threshold
  clamps. Source-position fixes also removed late chance replays and Vertigo duplication and made
  Energy Cannon snapshot its live pre-clamp threshold. The audit now reports 223 `VERIFIED` and 13
  `UNVERIFIED` formulas.
- **R9-G1a — identity and creation-grant provenance.** Closed the five live identity gaps for
  CoM 6.08, CoM2 1.05.11 and Warlord 1.5.12.7 plus both Warlord Lava Smelter elemental-grant
  gaps against the completed constructor/summon reconstructions, shipped spell rows, creation and
  retraining scripts, resolution consumers and runtime constants. Corrected CoM 1's summon branch:
  previously only an unsupported template whitelist became Fantastic, with every entry except
  Centaurs forced to Life; now every successful combat summon becomes Fantastic, only Paladins
  become Life, only Centaurs and Catapult become Nature, and other types retain their loaded race.
  The audit now reports 227
  `VERIFIED` and 15 `UNVERIFIED` formulas.
- **R9-G1g — Supernatural direct helper.** CoM 6.08 now imports and displays the 11 roster
  templates carrying attack-attribute `$2000`, despite its misleading Tweaker-export label, but
  gives Supernatural no combat effect: D39 proves its resolver test is inactive and the live floor
  belongs to Destruction `$0020`. CoM2 1.05.11 and Warlord 1.5.12.7 retain their shipped `0`/`34`
  ties-to-even minimum-damage formula. The provenance audit now reports 220 `VERIFIED` and 22
  `UNVERIFIED` formulas; durable legacy evidence is in
  [`D39.evidence.md`](../Reference%20docs/DOS%20reconstructed/D39.evidence.md).
- **D39 — reconstruct the CoM 6.08 standard attack resolver.** Completed and independently
  reviewed the parent `[0x99292,0x999C9)`, resolver `[0x999C9,0x9A587)`, adjacent defense
  producer `[0x9A587,0x9A79E)`, BP-sharing helpers, all callers, loops, reductions, output routing,
  and required dependencies. Confirmed the only live `(hits - 5) >> 1` first-reduction floor is
  Destruction `$0020`; the Supernatural `$2000` test is dead, and the residual reduction has no
  floor call. Durable findings are in
  [`D39.evidence.md`](../Reference%20docs/DOS%20reconstructed/D39.evidence.md). Calculator behavior
  is unchanged; R9-G1g is now unblocked and owns the separate helper decision.
- **D38 — locate the CoM 6.08 Supernatural minimum-damage consumer.** Proved the frozen
  `WIZARDS.EXE` has no executing binding from binary-named Supernatural `$2000` to the documented
  `(damage-5)/2` floor. The only live formula path is gated by binary-named Destruction `$0020`,
  applies only on the first per-strike reduction below an adjusted defense threshold, and is absent
  from the residual-damage reduction. Bounded the complete standard resolver at
  `[0x999C9,0x9A587)` with all direct callers and exits; D39 owns its fixed-extent reconstruction.
  Durable findings are in
  [`D38.evidence.md`](../Reference%20docs/DOS%20reconstructed/D38.evidence.md). Calculator behavior
  is unchanged; R9-G1g remains blocked by D39.

## 2026-08-12

- **R9-G1g second pass — four direct helpers closed.** Bound Magic, Mithril, and Adamantium
  weapon bonuses plus the legacy identity-conversion helper across their applicable MoM 1.31,
  CP 1.60, CoM 6.08, CoM2 1.05.11, and Warlord 1.5.12.7 sources. Corrected Warlord's
  Fiery Fury/Sanctify/compiled-conversion order and preserved Sanctify's Life-race write for
  heroes. The user's CoM2 1.4.2 changelog pointer, corroborated by CoM 6.08 helptext, required
  retaining the legacy Supernatural floor; D34 disproves only the proposed executable binding,
  so that final helper remains under R9-G1g behind D39. The audit now reports 219 `VERIFIED` and
  23 `UNVERIFIED` formulas.
- **D36 — reconstruct modern Raise Dead.** Reconstructed the shared CoM2/Warlord
  `$005CD1FF..$005CD372` Raise Dead case and complete `$0064435C..$00644377` Castercore
  wrapper. The engine clears revival/status state, sets combat No Heal, restores position and
  movement, recalculates, stores checked half-total-HP damage, publishes the target ID, and
  recalculates again. Warlord's script adds disjoint combat-wide living-unit recounts; D36 does
  not assert the hook's exact order. Durable source and coverage are in
  [`D36.evidence.md`](../Reference%20docs/Caster%20binary/D36.evidence.md). Calculator behavior is
  unchanged; the modern Raise Dead prerequisite for R9-G1g is complete.
- **R9-G1j — derived-package provenance.** Bound all 13 unit/ability-package formulas from
  `undeadImmunityDerivation` through `bloodLustMeleeAttack` to the applicable DOS, shared
  `Caster.exe`, and Warlord-script implementations; the audit now reports 214 `VERIFIED` and
  28 `UNVERIFIED`. Corrected Warlord strike-effect order, Fiery Fury and Angelic Guardians
  base-Fantastic gates, Angelic Guardians' existing-Exorcise branch, and Blood Lust targeting;
  focused regressions and the durable behavior contract are in `data.js` and `SPEC.md`.
- **D35 — reconstruct CoM 6.08 Raise Dead.** Reconstructed the complete
  `[0xAB04D,0xAB474)` routine and `[0x82ED0,0x82EEA)` dispatcher. Raise Dead halves the
  restored figures/front damage, clears combat effects, both combat and persistent enchantment
  dwords, and movement-recalculation flags `$0800|$1000`, then writes the inline unaligned
  Fantastic identity and `Grey_Hits = -1` cache sentinel before rebuilding the battle unit.
  Durable findings and coverage are in
  [`D35.evidence.md`](../Reference%20docs/DOS%20reconstructed/D35.evidence.md). Calculator behavior
  is unchanged; D36 supplies the corresponding modern prerequisite for R9-G1g.
- **D34 — falsify the CoM 6.08 Supernatural damage-floor binding.** Proved common attack mask
  `$2000` is Supernatural and `$0020` is Destruction; the existing signed `(hits - 5) >> 1`
  helper is a branch-specific Destruction floor suppressed by defense-special scores `>=80`.
  The supplied `Attribs_2` anchor instead projects `$4000`, lowers to-block by one, and ensures
  minimum weapon quality. The only direct functional Supernatural consumer found is inside newly
  bounded `[0x9BCE0,0x9D535)`, now owned by D37. Durable findings are in
  [`D34.evidence.md`](../Reference%20docs/DOS%20reconstructed/D34.evidence.md). Calculator behavior
  is unchanged; R9-G1g owns removal or replacement of the unverified CoM formula.
- **D30_D31_D32 — locate Supernatural and Raise Dead prerequisites.** Corrected the two DOS
  rows from non-implementation `MAGIC.EXE` to CoM 6.08 `WIZARDS.EXE`. D30 found an already
  reconstructed minimum-damage candidate but left the Supernatural-to-`$0020` binding unproved;
  D31 bounded the DOS Raise Dead routine and its inline unaligned identity writes; D32 bounded the
  modern Raise Dead case, wrapper, `EncNoHeal` producer, and existing recomputation consumer.
  Durable results are indexed by
  [`D30_D31_D32.evidence.md`](../Reference%20docs/DOS%20reconstructed/D30_D31_D32.evidence.md);
  D34–D36 own the corrected follow-up work. Calculator behavior is unchanged.
- **D33 — reconstruct `ApplyMagicWeapons`.** Reconstructed the complete shared CoM2/Warlord
  `$00598D88..$005992CC` helper: base material gates, other-owner King-of-Underworld suppression,
  Magic/Mithril/Adamantium tiers 0/1/2, channel-specific strength and runtime To-Hit writes,
  checked display-bonus arithmetic, both callers and Warlord composition. Durable source and
  coverage are in [`D33.evidence.md`](../Reference%20docs/Caster%20binary/D33.evidence.md).
  Calculator behavior is unchanged; the result supplies R9-G1g's modern weapon prerequisite.
- **R9-G1g existing-evidence pass.** Bound eight direct formulas across their applicable DOS,
  CoM2 and Warlord builds, and removed the aggregate weapon dispatch plus two calculator-only
  unit-type projections from the source-formula inventory. Corrected modern Supreme Light so
  live or base magical ranged, either Life identity, or nonzero mana independently satisfies its
  compiled eligibility gate. The audit now reports 201 `VERIFIED` and 41 `UNVERIFIED` formulas.
  The five remaining R9-G1g gaps were isolated to four reconstruction domains; D33 now supplies
  the modern material domain, while D34–D36 own the remaining Supernatural and Raise Dead scopes.
- **D29 — locate `ApplyMagicWeapons`.** Corrected the supplied interior anchor to the exact shared
  CoM2/Warlord extent `$00598D88..$005992CC`, proved its two direct callers and sole normal return,
  and moved the now-fixed semantic reconstruction into D33. Durable boundary and dependency
  evidence is in [`D29.evidence.md`](../Reference%20docs/Caster%20binary/D29.evidence.md).

## 2026-08-11

- **R9-G1i — DOS Wall of Fire strength provenance.** Bound the inherited MoM 1.31 and
  CP 1.60 Wall of Fire strength to the zero-override spell path and D22's source-shaped
  Fireball record. Both calculator versions remain at strength 5; behavior is unchanged and
  the audit now reports 193 `VERIFIED` and 52 `UNVERIFIED` formulas.
- **R9-G1k — resolution-stat and combat-context provenance.** Bound seven source-authored
  formulas across all applicable DOS, CoM2 and Warlord versions, and removed the aggregate
  `normalizeCombatUnit` orchestration marker from the formula inventory without performing M7's
  helper retirement. Corrected modern Defense to avoid a second Vertigo subtraction and corrected
  DOS Elemental Armor/Resist Elements overlap rules for Defense and Resistance. Focused
  regressions cover the corrected behavior; the audit now reports 192 `VERIFIED` and 53
  `UNVERIFIED` formulas.
- **D22 — DOS Fireball spell-table record.** Materialized the complete MoM 1.31/CP 1.60
  36-byte Fireball record in `Reference docs/DOS reconstructed/spelldat.c` with byte coverage in
  `D22.evidence.md`. Both builds load unsigned strength 5 from `+0x20`; the sole record difference
  is `AI_Group` at `+0x13`. Calculator behavior is unchanged and R9-G1i is unblocked. Method-4
  review also corrected a CP-only incoming Wall call; D28 owns its out-of-scope trigger semantics.
- **R9-G1i existing-evidence pass.** Bound seven of the eight effective-attack, defense and
  damage-constant formulas across their applicable calculator versions, reducing the live audit
  to 61 `UNVERIFIED` formulas without changing calculator behavior. The remaining DOS Wall of
  Fire strength binding needs D22's source-shaped `SPELLDAT.LBX` record before R9-G1i can close.
- **R9-G1h — ability-stat provenance.** Bound all 20 formulas from `holyBonus` through
  `disheartenProphecy` across MoM 1.31, CP 1.60, CoM 6.08, CoM2 1.05.11 and Warlord 1.5.12.7,
  reducing the live audit to 68 `UNVERIFIED` formulas. Corrected modern Animated and Black Prayer
  leaking into independent Gaze fields, modern Tactician hero bonuses leaking into Thrown/Breath/
  Gaze, Breakthrough's normal-package Defense from +1 to the configured 0, and Metal Fires on
  Fantastic units, including its secondary-channel and weapon-upgrade paths. The review also
  restored Spirit Link's permanent +2 Resistance write to the base phase. Focused regressions
  cover every corrected channel and eligibility boundary.
- **R9-G1f — level-dispatch provenance.** Bound the version dispatch and all fifteen normal-unit
  ladder formulas across the five supported builds to the reconstructed DOS gates and HP
  thresholds, reconstructed Caster consumer, and current CoM2/Warlord tables. Existing calculated
  bonuses remain unchanged; the audit now reports 158 `VERIFIED` and 88 `UNVERIFIED` formulas.
- **R9-G1e existing-evidence pass.** Bound 24 of the 27 chance-contribution and projection
  formulas to exact DOS, Caster, Warlord-script and runtime-table sources, with no calculator
  behavior change. Corrected overbroad version metadata for seven Warlord-only formulas. The
  remaining modern material helper was routed to R9-G1g and the two-stage clamp to F5, both now
  closed above; the audit then reported 142 `VERIFIED` and 104 `UNVERIFIED` formulas.
- **R9-G1d — late/global and figure-transform provenance.** Closed ten formulas against their
  strongest implementation sources and retired the erroneous Warlord-only Focus Magic duplicate,
  reducing the live audit to 118 `VERIFIED` and 128 `UNVERIFIED`. Corrected Focus Magic ordering,
  Chaos Surge and Darkness channel gates, Eternal Night's modern Life/Death asymmetry, signed
  modern Warp Attack division, Warlord Beat of Swiftness rounding/gating, and both figure-count
  transforms. Focused regressions and the full calculator suite cover the corrected behavior.
- **A32 — DOS Shatter eligibility.** Reconstructed human admission, AI selection, the generic
  effect setter, and recompute consumer for MoM 1.31, CP 1.60, and CoM 1. All three admit normal
  units and heroes but reject Fantastic units; existing calculator behavior is correct. The
  method-4 proof is `Reference docs/DOS reconstructed/A32.evidence.md`.
- **B4/B5/B6 — DOS rollover and Defense.** Verified one cohesive three-build package:
  conventional and non-Area excess receives fresh Defense and Invulnerability −2 at each figure;
  Area attacks are independently capped per figure; Armor Piercing is signed `/2` truncated toward
  zero; and Immolation uses Fireball's non-AP flags. Existing calculator outcomes were correct;
  DOS halving now expresses the exact arithmetic. The reviewed proof is
  `Reference docs/DOS reconstructed/B4_B5_B6.evidence.md`.
- **B9 — DOS `Create_Unit`.** Reconstructed overlay 121 entry 0 for MoM 1.31, CP 1.60 and CoM 1.
  Every unit instance starts with `mutations = 0`; the complete constructor write set cannot add
  `UM_UNDEAD`, so natural Death creatures do not receive Dispel Evil's created-undead-only extra
  penalty. Existing calculator behavior is correct. Merged source and evidence are in
  `Reference docs/DOS reconstructed/unitcalc.c` and `B9.evidence.md`.
- **D2 — modern Weapon Immunity eligibility.** Replaced the weapon/type proxy with the exact
  calculated `EncMagic or magicranged` rule. Corrected Spirit Link and Blazing March bypasses,
  King/Ruler's material-only suppression, and Wall of Fire ordering; added exhaustive represented
  source and attack-class regressions. Method-3 review found and corrected the ordering defect.

## 2026-08-10

- **D21 — modern level-bonus helper.** Reconstructed `@Units@ApplyLevelBonus` completely and
  bound its CoM2/Warlord runtime tables. The 21 writes omit Death, Stoning and Doom Gaze; the
  loader also feeds the normal To Defend slot from `[Hero]ToDefend`. Independent Claude/Codex
  derivations and reciprocal review left no disagreement. Durable source and coverage are in
  `Reference docs/Caster binary/Units.RecalculateUnits.pas` and `D21.evidence.md`; F56 owns the
  newly confirmed calculator mismatch.
- **B7 — DOS touch record routing.** Verified that common flags reach every admitted call, while
  melee records remain melee-only and one ranged record feeds ordinary ranged, Thrown, both
  Breaths and every Gaze. Corrected all-rider record routing, channel-carried Stoning −1 and Death
  −3 modifiers, and CP/CoM zero-strength dispatch. Cross-version and roster regressions confirm
  Chaos Spawn's common Poison 4 accompanies Multiple Gaze, resolving Q4; modern exclusion remains
  tracked by F25. The reviewed mapping lives in `Reference docs/Touch attack trigger matrix.md`.
- **D18 — Warlord touch-flag placement.** Replaced the blanket ranged exclusion with internal
  general/melee/ranged records: innate/card Stoning and Death Touch are general, Focus Magic moves
  them to melee/Thrown, and Revenant overwrites Death Touch with melee/Thrown value 0. Corrected
  tooltips and regressions, recorded the manual/helptext conflict, and retained B7 for the distinct
  DOS record/roster comparison. Method-3 review fixed created modern-channel touch delivery.
- **R9-G1c evidence/revision pass.** Bound 20 of the 29 formulas from `stat:base` through
  `giantStrength:thrown`; the nine unsupported ordering/channel claims remain live in
  `BACKLOG.md`. Corrected the executing Warlord recruitment writes for Ludus Agoge, Mother
  Fungus, Pillar of Faith and Natural Selection. Charm of Life now reads live HP after
  Endurance, Lionheart and every earlier HP writer, closing F16. Earlier Warlord gates now
  retain base recruitment identity and their pre-Focus attack types. The live audit is 139
  `UNVERIFIED` formulas.
- **R9-G1b — base/permanent-transform provenance.** Bound Destiny, Chaos Channels Fire Breath,
  Lightning Blade, Focus Magic, Vampirism, and Shadow Strike to reviewed implementation excerpts.
  Corrected modern low-strength Focus Magic, Warlord Vampirism transfer, and Lightning Blade's
  `Thrown + 1` write. The live audit fell to 159 `UNVERIFIED` formulas; F12 and F17 retain their
  wider scopes.
- **F7, F22, F52, F54, F55, M6.** Implemented modern Supernatural rounding, modern Blood Lust on
  Thrown, all reconstructed Supreme Light paths, base-CoM2-only spell-result identity rewrites,
  and independent Lava Smelter grants with legacy-state migration. Method-3 review caught the
  migration, a weak Fire Breath regression, and stale provenance wording. Final checks passed.

## 2026-08-09

- **R9-G1a-R3 — CoM 1 Zombies table binding.** Bound the type `0xAE` ability record and constructor
  copy in `Reference docs/DOS reconstructed/unitcalc.c`; merged evidence is
  `R9-G1a-R3.evidence.md`.
- **R9-G1a-R2 — `CombatSummonUnit`.** Reconstructed the full CoM2 routine in
  `Reference docs/Caster binary/Spells.CombatSummonUnit.pas`; merged evidence is
  `R9-G1a-R2.evidence.md`.
- **R9-G1a-R1 — DOS battle-unit load.** Reconstructed all three DOS builds in
  `Reference docs/DOS reconstructed/combat.c`; merged evidence is `R9-G1a-R1.evidence.md`.
- **R9-G1a existing-evidence pass.** Promoted modern Combat Summoned and Chosen identity plus
  three Lava Smelter grants. Eight gaps remained for dedicated reconstruction or other owners.
- **R9 — enforceable formula provenance.** Added adjacent formula classifications, reviewed source
  anchors, runtime-table binding, and automated completeness checks. Initial result: 247 formulas,
  77 `VERIFIED`, 170 explicit gaps; later R9-G1 work updates the live totals.

## 2026-08-08

- **R7.4 — modifier tooltips.** Exposed ordered calculated-stat traces through hover/touch UI and
  fixed stale overlays; see `SPEC.md`, UI contract.
- **R7.3 — ordered calculated-stat traces.** Made the calculation path emit source-labelled running
  values for every displayed output; fixed permanent-write attribution.
- **R8.1–R8.4 — identity lifecycle.** Added version-scoped source identity, independent editable
  base controls, ordered live conversions, and v2 persistence/share/swap/Matrix migration. Roster
  units reconstruct authoritative source IDs; Custom units retain null IDs.
- **Persistence resilience cleanup.** Hardened corrupt and legacy state fixtures.
- **R6.5b–R6.5d — DOS combat reconstruction.** Completed attack preparation, touch/special rider,
  and damage-application extents across MoM 1.31, CP 1.60, and CoM 1. Owning bodies and per-item
  evidence are under `Reference docs/DOS reconstructed/`.

## 2026-08-07

- **R6.2a–R6.2f, R6.3, R6.5a.** Reconstructed the DOS conventional attack, defense specials,
  resistance helpers, combat dispatch, and related natural extents for all three builds.
- **R6.4.** Hardened the DOS derivation checker and reverified the corpus.
- Completed rows left the backlog; address coverage, build differences, and findings remain in the
  corresponding `R6.*.evidence.md` files and C sources.

## 2026-08-05 to 2026-08-06

- **R6.1a–R6.1h.** Reconstructed DOS battle-unit creation and recalculation: enchantments, base
  stats, experience, movement, hero items/templates, item powers, and hit-point writes. The merged
  `unitcalc.c` and item-scoped evidence are authoritative.

## 2026-08-02 to 2026-08-04

- **R5.1, R5.2a–R5.2m, R5.C, R5.G.** Completed and reviewed the modern Caster reconstruction
  corpus. A reciprocal review corrected `DamageSpell`'s repeated spill loop. The artifact index is
  `Reference docs/Caster binary/README.md`.
- **R3/R4.** Split modern binary analysis by subsystem, preserved independent modern attack
  channels, and reshaped the version-specific conventional attack card and derivation paths.
- **R6.0/R9 checker work.** Added DOS verification and fixed the Delphi ledger gap-hiding bug.
- **R8 shared DOS special byte.** Replaced fabricated per-ability magnitudes with the shared
  `Spec_Att_Attrib` value and consumer flags; fixed gaze realm/strength shaping and roster wiring.
- **F44–F48.** Fixed DOS Illusion and Resistance-to-All token wiring, added roster regressions, and
  removed the fabricated modern Chaos Channels overwrite/stacking split.

## 2026-07-26 to 2026-07-29

- Established the ordered stat-derivation and combat-resolution sequences (**R1/R2**) and fixed the
  defects exposed by them. Canonical order is in `SPEC.md`; evidence is in the engine analyses.
- Swept Warlord scripts and CoM2 runtime tables, moved loaded constants to their owning data-table
  document, and separated live work from evidence.
- Early executable verification settled foundational roll, immunity, spill, and sequencing claims
  later absorbed into the reconstruction corpora.

## Closed mechanic questions

| ID | Result | Durable home |
|---|---|---|
| Q7 | Supreme Light reads live Resistance at its engine position. | `SPEC.md`; DOS and modern recalculation analyses |
| Q9 | CoM2/Warlord may carry Doom Gaze and ranged simultaneously. | modern combat-flow and recalculation analyses |
| Q10 | Destiny does not remove later weapon-material bonuses. | modern recalculation analysis |
| Q13 | Modern Land Link adds +2 to each positive breath field for current Fantastic units. | modern recalculation analysis |
| Q14 | Modern Defense dice use capped To Defend. | data tables; `Combat.ResolutionHelpers.R5.2e.evidence.md` |
| Q22 | CoM 1 implements no Inner Fire +1 hero-item attack. | MoM binary analysis; R6.1g evidence |
| Q11 | DOS Animate Dead/Black Channels grants +1 ranged when a ranged type exists. | R6.1a evidence |

## Accepted modelling decisions

Canonical descriptions are in `SPEC.md`, Known modelling limitations.

- **M1:** Life Steal's displayed distribution is approximate; F28 owns healing semantics.
- **M2:** displayed target damage is capped at remaining HP; F27/F28 own uncapped healing inputs.
- **M7:** ammunition is outside the one-engagement model.
- **M8:** between-turn regeneration is outside the one-engagement model.
