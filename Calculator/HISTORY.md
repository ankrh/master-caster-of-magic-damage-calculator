# Calculator work history

Closed work, accepted modelling decisions, and notable verification results removed from
`BACKLOG.md`. This file is historical context, not a work register and not a source of truth for
engine behavior. The linked specification, binary analyses, data-table findings, discrepancy
catalogue, reconstructions, and evidence files own the underlying results.

## 2026-08-08 — R8.1 internal unit identity records

R8.1 is complete. The calculator now keeps a version-scoped roster identity (`templateId` and
`heroTypeId`), independent source fields (`isHero`, `baseRace`, `baseFantastic`), and fresh live
`race`/`fantastic` values for every derivation. Custom records keep both source IDs null, while
Chosen/Golem-style derived predicates remain computed rather than stored. Modern, DOS, and
Warlord roster generators now carry and verify the source identity fields; the UI, matrix path,
and all roster selections preserve them. Until R8.4, persistence deliberately remains at the
legacy v1 `{race, name}` boundary, with the richer identity reconstructed from version and
selection state.

The work followed the dual-implementation protocol with GPT-5.6 Luna Max and GPT-5.6 Sol High:
both initial implementations were committed, reciprocally reviewed, revised, and integrated.
Verification passed 9,474 Node identity/derivation assertions, 929 browser presets, and 35/35
Playwright tests. The R8.1 benchmark run recorded the standalone state harness at 33/36 checks;
its three existing resilience fixture checks failed because the malformed `cityWalls` precondition
no longer crashed. This was outside R8.1; the normal persistence and share-link Playwright tests
passed.

## 2026-08-08 — Persistence resilience fixture cleanup

Replaced the three obsolete resilience assertions in `tools/state_persistence_check.js` with a
deterministic malformed v1 fixture: a Custom Warlord Gnoll carrying a non-string identity name
through the Altar of the Moon unit-name suffix path. The fixture now genuinely exercises the
`applyState` failure, localStorage recovery and discard, and bad-share-link fallback without a
vacuous pass. The standalone state harness now passes 36/36 checks. No calculator implementation
or persisted-schema behavior changed; the original 33/36 R8.1 measurement remains recorded above.

## 2026-08-08 — R7 display goal simplified

R7 no longer imitates the games' plain/gold or grey/gold stat tiers. The calculator keeps one
numeric final modified value beside each editable base stat because the games' visual distinction
does not help users understand the calculator result. The remaining R7 work instead exposes the
ordered stat-transform trace on hover: base value, each source's before/after write in the
applicable binary or CAS execution order, then the final value. Q16 was removed from the live work
register because classifying the games' display tiers is no longer a calculator requirement.

## 2026-08-08 — DOS reconstruction R6.5d

Completed the three-build reconstruction of exported overlay target `03D0:004D` at
`0x9A8AB..0x9AD04`. Codex Agent A and Codex Agent B independently derived the 1,113-byte routine
and reciprocally reviewed both artifacts. All six byte-backed review entries were resolved and no
disagreement survived, so no Q row was needed.

The merged `Calc_Battlefield_Bonuses` body is in
`Reference docs/DOS reconstructed/combat.c`; exact binary identities and extent hashes, external
helper-entry contracts, arithmetic-width evidence, complete branch/write/call inventories,
per-build ledgers, findings, counts, and provenance are in `R6.5d.evidence.md`. The routine imports
combat-side city/global enchantments, computes controller-wide Holy Bonus, Resist/Prayer, and
Leadership maxima, applies the build-specific city-defense rule, and folds Holy Bonus into the
shared Resist/Prayer array. CP changes hero arithmetic and retains an unreachable superseded tail;
CoM adds five field-scoped maxima, two externally entered helper islands, and a relocated exit.

Strict build-scoped verification passes all three pinned binaries: 25 / 33 / 50 conditional
branches, zero calls, 16 / 21 / 21 recognized named writes, contiguous 7 / 7 / 8-row ledgers, and
zero unaccounted semantic elements, gaps, or parent mismatches. R6.5a–d now close all four code
targets exposed by the R6.3 overlay-aware call audit.

## 2026-08-08 — DOS reconstruction R6.5c

Completed the three-build reconstruction of overland movement routine `Unit_Moves2`, exported as
`03C8:0043` at `0x98494..0x986BD`. Codex-A and Codex-B independently derived the 553-byte routine
and reciprocally reviewed both artifacts; every byte-backed review entry was resolved and no
disagreement survived. Strict build-scoped verification passes all three pinned binaries with
213 / 213 / 220 decoded instructions, 20 / 20 / 19 conditional branches, zero calls, 14
stack-local memory writes, one far return, contiguous ledgers, and no omitted semantic elements.

The merged `Unit_Moves2` body is in `Reference docs/DOS reconstructed/unitcalc.c`; complete
branch, read, write, call, arithmetic, entry-routing, and per-build coverage evidence is in
`R6.5c.evidence.md`. MoM 1.31 and CP 1.60 are byte-identical and use the routine in battle-unit
construction. CoM retains a 17-byte-different homolog but replaces that constructor path. Its
unconditional Wind Mastery loop edge keeps the balance at zero, leaving the retained owner/balance
block and patched double/no-op movement transforms unreachable.

## 2026-08-08 — DOS reconstruction R6.5b

Completed the three-build reconstruction of exported Life-Steal-path routine `0370:002A` at
`0x7FCBA..0x7FF43`. Two Codex agent instances derived the 649-byte routine independently and
reciprocally reviewed both artifacts; all six byte-backed review entries were resolved and no
disagreement survived.
Strict build-scoped verification passes all three pinned binaries with 12 / 14 / 13 conditional
branches, three calls per build, 6 / 7 / 6 recognized named writes, four contiguous ledger rows,
and no omitted semantic elements.

The merged `Battle_Unit_Heal` body is in
`Reference docs/DOS reconstructed/combat.c`; complete byte-backed branch, read, call, write, and
arithmetic inventories, per-build ledgers, findings, hashes, counts, and provenance are in
`R6.5b.evidence.md`. Normal healing is capped to reversible damage only when temporary Hits are
disabled; the common spill path assigns regular, undeath, and irreversible low bytes before
restoring figures from excess healing. CP 1.60 additionally converts restored figures' apportioned
damage into irreversible damage, while CoM 1 preserves the signed raw-Max threshold/divisor split
and caps Extra Hits at 90. Both later builds clear the saved positive remainder before the shared
tail, unlike MoM 1.31. The routine preserves movement around battle-unit construction and
battlefield-effect recomputation.

AKH explicitly requested two Codex agents rather than the protocol's usual Claude–Codex pairing.

## 2026-08-07 — DOS reconstruction R6.5a

Completed the three-build reconstruction of exported target `0348:003E` at
`0x7BDA0..0x7BE3B`. Two Codex agent instances derived the 155-byte routine independently and
reciprocally reviewed both artifacts; both reviews were clean and no disagreement survived.
Strict build-scoped verification passes all three pinned binaries with six conditional branches,
zero calls, four global writes, contiguous ledgers, and no omitted semantic elements.

The merged `Update_Sees_Illusions` body is in
`Reference docs/DOS reconstructed/combat.c`; complete byte-backed inventories, per-build ledgers,
counts, findings, and provenance are in `R6.5a.evidence.md`. The routine clears both side-wide
Illusion-sight words and sets each side's word when an active unit controlled by that side has
Illusions Immunity. `BU_ApplyDamage` calls it after assigning a zero-figure unit's terminal status.

AKH explicitly requested two Codex agents rather than the protocol's usual Claude–Codex pairing.

## 2026-08-07 — DOS checker hardening R6.4

Completed R6.4 under the dual-derivation and reciprocal-review protocol. The checker now extracts
citations for the selected build before testing coverage, so same-offset annotations from MoM
1.31, CP 1.60 and CoM 1 cannot satisfy one another. The shared extractor recognizes explicit
version labels before generic `MoM`, treats `all MoM` as the two MoM builds, and no longer mistakes
the `all` substring inside headings such as `Call inventory` for a build label.

`named_write` now inspects only the destination operand, eliminating the R6.1h load overcount, and
`scan_mom_binary.FIELDS` covers every battle-unit and persistent-unit displacement written by the
landed reconstruction, including status/damage bytes and the gold/grey accumulators. Seven focused
regressions cover citation isolation, label parsing, load/store direction and the complete field
set. All fourteen R6.1a–h/R6.2a–f artifacts pass against all three pinned binaries: 42/42 runs,
zero unaccounted jumps, calls, writes, ledger gaps or parent mismatches. The stricter sweep exposed
and repaired build-local citation metadata in R6.1c/R6.1d; no reconstructed code or mechanic
finding changed.

Verified: two independent Codex agent instances on 2026-08-07, followed by reciprocal review.
This did not provide the protocol's specified Claude–Codex cross-model pairing; AKH explicitly
waived that mismatch and directed R6.4 to be marked done on 2026-08-07. No disagreement survived.

## 2026-08-07 — DOS reconstruction R6.3

Completed the cross-build reconciliation and first-/second-level call-closure audit for all
fourteen R6.1a–h and R6.2a–f artifacts. The durable
`Reference docs/DOS reconstructed/R6.version-differences.md` indexes every material
MoM 1.31 → CP 1.60 → CoM 1 split back to its owning evidence section, includes measured
whole-region byte differences and an explicit CP-to-CoM carry-forward audit, and records the
complete call disposition.

Claude and Codex produced independent R6.3 derivations. At AKH's explicit direction, the
reciprocal-review round was waived and the two artifacts were merged directly. Their mechanic
inventories contained no incompatible binary reading. Claude's pass decoded the executable's
VROOMM `FBOV` structures, resolving every previously opaque far operand to a file offset; the
reusable implementations are `tools/resolve_dos_overlays.py` and
`tools/audit_dos_call_closure.py`.

The overlay-aware walk found 83 / 83 / 109 call sites and 33 / 33 / 47 distinct first-level
targets in MoM 1.31 / CP 1.60 / CoM 1, with zero unresolved calls, unclassified targets, or
out-of-scope control transfers. Three external targets are resident runtime/library routines.
Four resolved code callees are now separately scoped as R6.5a–d rather than silently absorbed:
`0x7BDA0..0x7BE3B`, `0x7FCBA..0x7FF43`, `0x98494..0x986BD`, and
`0x9A8AB..0x9AD04`. No agent disagreement survived the direct merge, so no Q row was needed.

R6.3 closes the originally assigned R6 constructor/recompute/combat surface. R6.4 remains the
checker-hardening follow-up, and R6.5a–d own the newly resolved external routines.

## 2026-08-07 — DOS reconstruction R6.2f

Completed the three-build reconstruction of the six-routine spell-damage/application closure:
`Apply_Battle_Unit_Damage_From_Spell`, `BU_ApplyDamage`, `Check_Attack_Ranged`,
`Eliminated_Opponent`, `Combat_Grid_Cell_Has_City_Wall`, and
`Battle_Unit_Is_Summoned_Creature`. Claude and Codex derived the extents independently and
reciprocally reviewed them. Every byte-backed correction was accepted and no binary-reading
disagreement survived.

The merged source is `Reference docs/DOS reconstructed/combat.c`; the complete source-shaped
evidence, inventories, ledgers, counts, findings, and provenance are in
`Reference docs/DOS reconstructed/R6.2f.evidence.md`. Whole-document and per-build-extract
verification pass all three pinned binaries with zero unaccounted conditional branches, calls,
writes, gaps, or nesting mismatches.

The merge fixes the exact spell-damage gates and figure rollover, the early-return and terminal
status rules in `BU_ApplyDamage`, the CP/CoM Wall of Darkness sight-test change, Confusion-aware
elimination, the city-wall cell geometry, and the combat-summon type predicate. Durable behavior is
summarized in `Reference docs/MoM binary analysis.md`. R6.3 is now prepared and ready: all fourteen
R6 evidence artifacts and both reconstructed C files are present for the cross-build index and
first-/second-level call-closure audit.

## 2026-08-07 — DOS reconstruction R6.1h

Completed the three-build reconstruction of `BU_Apply_Item_Attack_Specials` over
`[0x8E4C4,0x8E668)`. Claude and Codex derived the helper independently and reciprocally reviewed
the artifacts. The merged source is `Reference docs/DOS reconstructed/unitcalc.c`; complete
ledgers, branch/write inventories, counts, findings and provenance are in
`R6.1h.evidence.md`. Strict build-scoped verification passes with 27 conditional jumps, zero
calls, and zero unaccounted elements in each build.

The helper is byte-identical across MoM 1.31, CP 1.60, and CoM 1. It maps nine item-power bits to
the corresponding attack-attribute flags and can write either melee or ranged attributes through
its two caller paths. CoM 1's repurposed Divine Protection input bit still sets the old Power
Drain attack flag in addition to its defensive effects.

Q24 was resolved during the review round: both revised artifacts agree that `unitcalc.c`, as a
separate translation unit, must carry the attack-attribute definitions used by the landed body.
The narrower statement-versus-alias rendering disagreement survives as Q25 and is marked
`disputed` in the evidence file; it does not affect any byte or mechanic finding. R6.2f, the
remaining six-routine damage/application overlay closure, is the prepared next item; R6.3 waits
for it.

## 2026-08-07 — DOS reconstruction R6.2e

Completed the three-build reconstruction of `Battle_Unit_Defense_Special`,
`Check_Wall_Of_Fire_Attack`, and the wall-box helper, including CoM's skipped Guardian-node
island. Claude and Codex derived the assigned extents independently and reciprocally reviewed
them. Every byte-backed correction was accepted and no disagreement survived.

The merged source is `Reference docs/DOS reconstructed/combat.c`; complete inventories, ledgers,
counts, arithmetic checks, reachability, findings, and provenance are in
`Reference docs/DOS reconstructed/R6.2e.evidence.md`. Strict verification passes all three
builds with zero unaccounted conditional branches, calls, writes, gaps, or nesting mismatches.

The merge confirms the defense-selector ordering and magnitudes, realm-gated Bless and
Righteousness differences, CoM's stacking elemental-defense bonuses, Wall of Fire's
outside-to-inside city-box test and strength override, and CoM's Guardian-node write to Heavenly
Light. The durable behavioral summary is in `Reference docs/MoM binary analysis.md`.

## 2026-08-07 — DOS reconstruction R6.2d

Completed the three-build reconstruction of the combat-resolution helper closure: nine shared
helpers plus CoM's three island/frame-sharing regions. Claude and Codex derived the ranges
independently, reciprocally reviewed them, and accepted every byte-backed correction; no
disagreement survived.

The merged source is `Reference docs/DOS reconstructed/combat.c`; complete inventories, ledgers,
counts, arithmetic checks, findings, and provenance are in
`Reference docs/DOS reconstructed/R6.2d.evidence.md`. Strict per-build verification passes all
9 / 9 / 12 extents with zero unaccounted conditional branches, calls, writes, gaps, or nesting
mismatches.

This also closes B1 and Q3: `CMB_AttackRoll` is byte-identical in all three builds and accepts a
natural 10 after the ordinary threshold test, so Warp Reality cannot reduce To Hit below 10% in
any DOS version; sufficiently high To Hit reaches 100%. The durable finding is in
`Reference docs/Engine verification evidence.md`, *B1. To-Hit floor and ceiling*.

## 2026-08-07 — DOS reconstruction R6.2c

Completed the three-build reconstruction of `BU_ProcessAttack`'s second half over
`[0x99ED7,0x9A587)`. Claude and Codex derived the extent independently and reciprocally reviewed
it. All byte readings converged. The only review dispute concerned the undefined meaning of the
ledger's `Within` column; `Reference docs/DOS reconstructed/README.md` now defines it as the
checker's enclosing conditional-skip relation, while titles record alternate island/helper
entries.

The merged body is in `Reference docs/DOS reconstructed/combat.c`; complete ledgers,
branch/call/write inventories, counts, findings, and provenance are in
`Reference docs/DOS reconstructed/R6.2c.evidence.md`. The merged pair passes the build-scoped DOS
checker with 56/24/39, 60/24/39, and 65/28/37 conditional-jump/call/named-write counts and zero
unaccounted elements for MoM 1.31, CP 1.60, and CoM 1 respectively. Durable behavioral findings
are summarized in `Reference docs/MoM binary analysis.md`.

## 2026-08-07 — DOS reconstruction R6.2b

Completed the three-build reconstruction of `BU_ProcessAttack`'s first half over
`[0x999C9,0x99ED7)`. Claude and Codex derived the extent independently, reciprocally reviewed
the results, and applied all accepted corrections. Claude withdrew its sole remaining objection
after confirming that the resistance-realm constants use `e_SPELL_BOOK_REALM`; no disagreement
survived the merge.

The merged body is in `Reference docs/DOS reconstructed/combat.c`; complete ledgers,
branch/call/write inventories, arithmetic bytes, counts, findings, and provenance are in
`Reference docs/DOS reconstructed/R6.2b.evidence.md`. The merge also corrected R6.2d's helper
scope by distinguishing `Has_Ranged_Attack` at `[0x9BB03,0x9BB3E)` from the helper beginning at
`0x9BB3E`, and by adding CoM's frame-sharing helper `[0x9AC1B,0x9AC8F)`. The durable behavioral
summary is in `Reference docs/MoM binary analysis.md`.
The merged source/evidence pair passes `verify_dos_derivation.py` for `mom131`, `mom160`, and
`com1` with every semantic conditional jump, call, and named-field write accounted.

## 2026-08-07 — DOS reconstruction R6.2a

Completed the three-build reconstruction of `BU_AttackTarget`: MoM 1.31 and CP 1.60 over
`[0x99292,0x999C9)`, and CoM 1 over its two live extents `[0x99292,0x9984B)` and
`[0x998C1,0x999C9)`. Claude and Codex derived it independently and reciprocally reviewed the
results; every review correction was accepted and no disagreement survived the merge.

The combined-build C body is `Reference docs/DOS reconstructed/combat.c`. Complete coverage
ledgers, branch/call/write inventories, arithmetic bytes, version differences, merge findings,
counts, and provenance are in `Reference docs/DOS reconstructed/R6.2a.evidence.md`. The durable
behavioral summary is in `Reference docs/MoM binary analysis.md`, *First Strike's 24-HP cutoff and
Haste repeats*. The merged pair passes the DOS derivation checker for all three builds.

## 2026-07-26 to 2026-07-28 — early executable verification

The first DOS-binary pass replaced several inherited or approximate calculator behaviours with
findings read directly from the three `WIZARDS.EXE` builds:

| Result | Durable home |
|---|---|
| CoM 1 First Strike now tests the top figure's HP at the start of the exchange; pending Thrown or Breath damage cannot move a 25+-HP figure below the cutoff. | `MoM binary analysis.md`, *First Strike's 24-HP cutoff and Haste repeats* |
| CoM 1 Immolation and Wall of Fire now receive the applicable Elemental Armor or Resist Elements defense bonus instead of inheriting the earlier blanket `com*` suppression. | `MoM binary analysis.md`, *Large Shield and elemental defence against spell damage* |
| DOS Bless scope now follows the attack's classified realm and type rather than the attacking unit's realm for non-melee attacks. | `MoM binary analysis.md`, *Bless — magnitudes, and what “Chaos/Death attack” actually means* |

The verification-catalogue pass also fixed two invalid MoM CP version literals: Animate Dead's
Weapon Immunity gate in `applyAnimatedEffects` and five `node_unit_checks.js` cases now use
`mom_cp_1.60.00` rather than the nonexistent `mom_1.60`. The post-fix checks were 164/164 Node
unit checks, 870/870 browser presets, and 32/32 Playwright tests. The implementation history is
the durable home for those code-only corrections.

## 2026-07-29 — stat and resolution sequences

### R1: stat derivation sequence

Completed the replacement of hand-built stat buckets with one ordered, phase-tagged transform
sequence over a mutable calculated-unit record. The migration covered Resistance, Defense,
melee, the shared ranged/thrown/breath projection, HP, and both legacy gaze strengths; then
`getAbilityStatModifiers` became step emission and the temporary equivalence harness and bucket
scaffolding were removed.

The source-backed ordering pass moved:

- Warp and Shatter to their engine positions, with later Warlord/CoM2 regions escaping the
  reduction;
- Holy Bonus and Resistance to All to the region-`e` aura pass;
- Supreme Light after that aura pass, reading live Resistance;
- level, hero, weapon-material, Focus Magic, Holy Armor, Tactician, Lucky, Guardian, and the
  Warlord tail effects to their mapped positions;
- the two modern stat clamps to the head of region `e`.

This closed D22–D25, Q7, and M4. MoM Berserk remains explicitly provisional because its earlier
recompute position has not been decoded. The architecture and current contract live in
`SPEC.md`, *Stat derivation contract*; engine ordering lives in the DOS analysis and modern
unit-recalculation analysis.

The informational benchmark averaged 33.3 µs/call before R1, 42.3 after stages 1–8, and 40.8
after stage 9; repeated runs spanned roughly 41–52 µs, so performance was not a completion gate.

### R2: resolution sequences

Completed `EffectiveDefense` and `GetEffectiveResistance` as ordinary transform sequences run on
discarded scratch records. The former preserves Illusion's early halt, additions, Armor Piercing,
the six immunity assignments, and the final Weapon Immunity addition. The latter preserves the
engine's assignment-before-addition order and realm-less Poison path. D2's remaining task is only
to audit the calculator's modern Weapon-Immunity eligibility proxy.

### Defects closed with the sequence work

| ID | Result | Durable home |
|---|---|---|
| F1 | CoM2/Warlord Vertigo display now uses −25 To Hit / −7 To Block. | `CoM2 binary - unit recalculation.md`, compiled stat blocks |
| F2 | Removed the duplicate `isCoM2` predicate. | Git history |
| F8 | Blaze of Glory now transfers live Defense to melee and sets Defense to zero. | `Source discrepancies.md`, §13 |
| F10 | Darkness, True Light, and Eternal Night are separate ordered steps. | DOS analysis; modern unit-recalculation analysis |
| F11 | Psycho Force and Pneuma Field now read Resistance in Warlord region `d`. | `Source discrepancies.md`; Warlord scripts |

## 2026-07-29 — table and script sweep

The CoM2/Warlord data-table pass settled D13 and D15 completely and the numeric portions of D2,
D4–D7, D12, and D14. Findings live in `Reference docs/CoM2 data tables.md`. The Warlord script
checks S1 and S2 also closed; their results and any script/prose disagreements live in
`Reference docs/Source discrepancies.md`.

The Warlord v1.5.12.6.2 hotfix then closed seven discrepancies found by the sweep. Most only
made prose agree with behavior the calculator already followed. The calculator-facing changes
were:

| Result | Durable home |
|---|---|
| Wraiths and Shadow Demons gained the roster-owned Sapiens tag; the generated roster followed the corrected `UNITS.INI`. | `Source discrepancies.md`, §5 |
| Lucky Star became the friendly-unit aura implemented by the corrected script and stopped implicitly granting the separate Lucky effect. | `Source discrepancies.md`, §10 |
| Magitek Science stopped granting Resist Magic to Battle Armor; only Armorclad qualifies. | `Source discrepancies.md`, §12 |
| Blaze of Glory transfers all live Defense to melee, sets Defense to zero, and allows only later effects to rebuild it. | `Source discrepancies.md`, §13; F8 |

## 2026-08-02 to 2026-08-03 — Caster reconstruction

R5.1 and R5.2a–R5.2m were integrated as address-backed Pascal-like reconstructions with durable
per-extent evidence. R5.C's Claude review closed after its findings were applied. A reciprocal
review found that R5.2g had flattened `DamageSpell`'s non-area spill back edge; the source,
evidence, analysis, specification, README, data-table notes, and F36 task were corrected to the
pre-tested repeated spill loop before AKH directed R5.2g and R5.C closed.

The full artifact/provenance index is `Reference docs/Caster binary/README.md`; individual
coverage ledgers and review notes live beside each reconstruction. At this point R5.G was the
sole live R5 completion gate and therefore remained in `BACKLOG.md`.

R5.G closed on 2026-08-03 after Codex independently reviewed all 20 durable R5 evidence
companions against the hash-matched Caster executable and re-read the previously error-prone
spill-loop and signed-division paths. It found no actionable byte-backed discrepancy; its durable
review record is `.review-of-claude.md`.

### Reconstruction-review lessons

Two failures produced the safeguards now stated tersely in the agent instructions and
reconstruction README:

- R5.1b was scoped at roughly 12,750 instructions. Its coverage counts passed, but five semantic
  errors survived: four misread branch targets and one incomplete signed-division idiom. This led
  to the 300–1000-instruction scope guideline, mandatory branch-target descriptions, and the rule
  that arithmetic idioms include their correction instructions.
- The region-`c` block at `+0x049BC` was initially reconstructed as a top-level weapon-material
  To-Hit block even though it is the fall-through tail of Heavenly Light. Citation counts still
  passed. Reconstruction ledgers consequently gained explicit `Within` parents, and the inbound
  branch scan plus `verify_derivation.py` now check structural nesting.

These incidents are project history. The current rules remain in
`DERIVATION-REVIEW-PROTOCOL.md`; the corrected mechanics, addresses, and verification provenance
remain in the Caster reconstruction evidence.

## 2026-08-03 — modern binary analysis split

Closed Q16 by replacing the monolithic modern analysis with a short method/index and six
subsystem documents: combat flow, resolution helpers, direct spells, damage/healing, unit
recalculation, and map/city. Existing findings and address evidence were moved without semantic
rewriting; dependent references were re-anchored to the owning subsystem.

### R3.1: lossless modern roster attack channels

The CoM2 and Warlord roster generators and generated datasets now preserve `ranged`, `thrown`,
`fire_breath`, and `lightning_breath` independently. The pre-existing `thrown_breath` projection
remains as compatibility data until R3.2 migrates card and derivation state, so this slice does
not change UI or combat resolution. Each generator validates every positive `UNITS.INI` attack
channel against its generated record; the Warlord dataset retains all 29 roster units with more
than one attack channel.

### R3.2: modern channel derivation

CoM2 and Warlord roster selection now carries separate modern attack records through card state.
`deriveUnitStats` derives each record through the ordered transform sequence independently; the
modern resolver consumes those records while the legacy `rtb` value remains only a pre-R4 card
projection. This keeps the DOS shared-slot path unchanged and retains multiple modern attacks
after every currently modelled transform.

### R4.1: version-shaped conventional attack card

The unit card and roster boundary now follow the engine record shape. MoM/CP/CoM retain their
single shared Ranged/Thrown/Breath card field; CoM2/Warlord display independent Ranged, Thrown,
Fire Breath, and Lightning Breath fields. Roster selection, custom-unit state, swapping, matrix
custom rows, and persistence all carry the named modern records. This slice intentionally does
not add gaze or touch controls; those remain R4.2/R4.3 work.

## 2026-08-03 — sequence, card and roster reshaping

R3 closed with R3.3 and R3.4: modern combat resolution now selects and consumes the independent
attack channels, including coexisting attacks, and the lossy single-`rtb` projection is gone.
Migration and regression coverage confirm multi-channel roster units load and resolve without
dropping an attack. The DOS shared slot is unchanged. This closed M5 and unblocked F12, F17, F18,
F20 and R4. Evidence: `CoM2 binary - unit recalculation.md` (record layout, sequential-transform
audit) and `CoM2 binary - combat flow.md`.

R4 closed with R4.2 and R4.3: the modern card gained binary-shaped gaze save modifiers, touch
values and To Defend fields with version gating and roster binding; the synthetic hidden-gaze
input was then removed and DOS gazes moved onto their shared strength/type slot. Version gating,
presets and UI regression coverage were finalised for the shaped cards. D21 still informs gaze
level presentation.

R7.1 and R7.2 landed ahead of the rest of R7: `applyLevelBonuses` became `resetCardToRosterBase`
with the pre-level invariant verified in-browser, and the card was regrouped into "Base stats and
abilities" and "Enchantments and conditions" with Level, Weapon and Armor in the lower group
(`ABILITY_GROUP_HEADINGS`, loadout relocated in `buildAbilitiesUI`). Both are recorded in the
SPEC UI contract. R7.3 and R7.4 remain open on Q16.

## 2026-08-04 — DOS checker, shared special byte, and Chaos Channels

### R6.0 and R9: derivation checking

R6.0 made the derivation checker work on the DOS builds (`tools/verify_dos_derivation.py`;
artifact conventions in `Reference docs/DOS reconstructed/README.md`). No overlay mapping was
needed, since the DOS docs cite raw file offsets. It was verified against `Has_Ranged_Attack`
with four fixtures — full citation, none, one withheld, and a ledger hole — and exposed R9.

R9 fixed the Delphi checker's gap-hiding bug (`tools/verify_derivation.py:85`): a ledger now
splits on row-number restart only, so an address discontinuity inside one ledger is reported as
the gap it is rather than reclassified as two adjacent extents. All 19 R5 artifacts were
re-checked clean — 894 conditional jumps, 224 calls and 910 named-field writes accounted, no gaps,
no parent mismatches — and the grouping is byte-identical under both rules, so the bug was latent
on this corpus and no R5 finding is affected. Regeneration was therefore unnecessary: the ledgers
live in the merged evidence docs and `.derivations/` is ephemeral scratch by design.

### R8: the DOS `Spec_Att_Attrib` byte

R8 replaced eleven independent DOS ability numbers with one shared card value plus per-consumer
flags, extending the gaze-only shaping R4.3 stopped at. The roster generator now emits the
record's `spec_att_attrib` byte and the fabricated magnitude-1 fallback is gone (R8.1); the DOS
card carries one magnitude input plus consumer checkboxes in `buildDosSpecialCard`, with Dispel
Evil and Destruction set apart because their modifiers are literals (R8.2); each consumer's read
is gated on its own flag, preserving provided-versus-received Holy Bonus / Resistance to All
maxing (R8.3); DOS gaze realm and Doom Gaze strength now derive from `ranged_type` rather than
ability flags, which also fixed a type-104 double-count introduced by R4.3 and re-shaped 22 gaze
presets to representable units (R8.4); and the per-effect `Name=value` ability entries were
retired, with `applyUnit` seeding the card magnitude from the record (R8.5). 927/927 presets pass.
R8 left modern untouched: `Caster.exe` carries independent fields, which is why Warlord's Chaos
Spawn drops Stoning Gaze while keeping Death Gaze. R8.5 exposed F45. Durable home:
`MoM binary analysis.md`, *Touch-effect immunities* and *Holy Bonus and Resistance to All are
per-player maxima*.

### Roster token defects

| ID | Result | Durable home |
|---|---|---|
| F45 | `Resistance to All` had never matched its ability def in any version — normalization strips spaces without folding case, so the roster token was `ResistancetoAll` against a `ResistanceToAll` match. Both defs corrected to the exact normalized token rather than folding case. An exhaustive sweep of all four rosters against every def confirms no case-only mismatch remains. Exposed F46 and corrected `predefChaosSpawnVsUnicorns`. | `data.js:70,126` |
| F46 | The DOS rosters' `Illusionary attack` token had never had a match: the modern generators emit `Illusion` but the DOS generator kept the source spelling, so MoM and CoM Phantom Warriors, Phantom Beast and the Illusionist silently lacked the ability. Renamed to `Illusion` in `TOKEN_RENAMES` and dropped from `EXPLICIT_KEEP`, which had been suppressing it from the generator's own unmatched-token report. | `tools/parse_tweaker_unit_data.py` |
| F47 | Added roster-wiring coverage for the DOS Illusion units, which nothing tested — the mechanic worked and only the token was broken, so a custom-stat preset would have passed either way. `predefPhantomWarriorsVsPaladins` and `predefPhantomWarriorsVsGreatDrakeCoM` sit under a new *Roster ability wiring* subgroup. Illusion zeroes the defender's defense, so the means are exactly figures × melee × to-hit (5.400 and 6.300), independent of defender stats; reinjecting the F46 bug fails both, and only both, at 1.129 and 0.321. | `data.js` |

### F48 and F44: the fabricated Chaos Channels overwrite

F48 removed it. No source has CC removing any attack: `Caster.exe` `$00599EE8`–`$00599FA8` writes
only `firebreath += 4`, `race := RCChaos` and `Fantastic`; Warlord's `UnitCalc.CAS:40` touches only
`SFireBreath`; the CoM2 manual says CC "can still **add** Fire Breath to units that have Thrown,
Gaze or Lightning Breath"; and `MODDING.INI`'s `CCRangedFBAllowed` is worded "can add" and gates
ranged only. `ccCanOverwriteSpecial` and `gazeOverwrittenByCC` were deleted, the grant got its own
channel so it stops overwriting whichever channel is being derived, and the tooltip was corrected.
The invented CoM2-replaces / Warlord-stacks split also went: `$00599F3E` is one `add` routine
serving both, so `ccFireBreathStacksWarlord` is gone and both versions add. Overwriting and
assignment are DOS shared-slot artifacts, so the DOS gates are unchanged. (`stats.js:429-448,480,1112,1859`; `data.js:149`.)

F44 re-verified the two modern-gaze preset expectations R4.3/R4.2 had moved without a recorded
reason. `spiritLinkResistanceWarlord` 6.120 → 6.000 was correct — effRes 5+2−3 = 4, pFail 0.6, one
10 HP figure → 6.000, and the old extra 0.12 was a hidden gaze component SPEC scopes to MoM only;
the derivation is now recorded in the preset and the vestigial DOS `rtbType`/`rtb` were dropped.
`ccFireBreathReplacesGazeCoM2` 5.000 → 1.000 was not — but neither was the 5.000, both encoding the
rule F48 removed. It was replaced by `ccFireBreathCoexistsWithGazeCoM2` at 5.000 (melee 1 + breath
4, gaze intact) and `ccFireBreathReplacesLightningCoM2` re-derived to
`ccFireBreathCoexistsWithLightningCoM2` at 10.000 (melee 1 + lightning 5 + fire 4). Durable home:
`SPEC.md`, *Gaze attacks*.

F6's modern half is settled by F48 — CC adds, never removes, and CoM2 and Warlord behave
identically — so what remains of F6 is the DOS case.

## 2026-08-05 — R6.1a, the first DOS reconstruction

`BU_Apply_Specials` reconstructed across all three DOS builds in dual-derivation mode, merged into
`Reference docs/DOS reconstructed/unitcalc.c` with ledgers, counts and findings in
`R6.1a.evidence.md` beside it. Both agents derived independently, reviewed each other, and every
entry on both sides was confirmed against the quoted bytes and fixed; no reading remained disputed
at merge.

| Result | Durable home |
|---|---|
| The assigned extent is the whole routine only in 1.31. CP 1.60 and CoM 1 relocate the tail — and each build's only `retf` — into space freed inside the constructor's address range. | `MoM binary analysis.md`, *Known anchors*; R6.1a evidence, *Extent* |
| Holy Weapon, the Holy Arms grant and the to-hit normalisation moved out of the constructor in both later builds, so they now run at both call sites instead of once. | `MoM binary analysis.md`, *Holy Weapon…*; R6.1a evidence |
| The `Gold_*`/`Grey_*` accumulators at `+0x64`–`+0x6D` are the engine's own stat-tier record: every bonus writes a gold twin, every reduction a grey one. Bears on Q16 and R7.3. | R6.1a evidence, *The `Gold_*` / `Grey_*` accumulators* |
| CoM 1 renamed nine enchantment slots; `0x00000004` is Blood Lust, not Animate Dead as previously recorded. Three of its blocks (Endurance, Land Link, FocusMagic) have no MoM counterpart. | `MoM binary analysis.md`, *Undead immunities…*; R6.1a evidence |
| CoM 1's Holy Armor is conditional on the running `defense <= 5` — the DOS ancestor of the modern `Defense > 5` ordering hazard tracked as F15. | `MoM binary analysis.md`, *`BU_Apply_Specials` runs twice*; R6.1a evidence |
| The to-hit normalisation has an unguarded entry path: `ranged_type == -1` folds `melee_tohit` into base `tohit` even when negative. Both derivations initially got this wrong; review caught it. | R6.1a evidence, *The to-hit normalisation has an unguarded entry path* |

Two process results came out of the round. Findings were moved out of derivation artifacts and
made a merge product (`DERIVATION-REVIEW-PROTOCOL.md`, *Findings are a merge product*), on the
grounds that a finding is an interpretation and interpretation is what the second independent
reconstruction exists to test. And the DOS checker was found to prove less than assumed where two
builds share offsets, which is why `DOS reconstructed/README.md` now requires per-build extraction
and R6.4 tracks the fix.

## 2026-08-05 — R6.1b, the DOS battle-unit constructor

The constructor was reconstructed across all three DOS builds in dual-derivation mode and merged
into `Reference docs/DOS reconstructed/unitcalc.c`; complete ledgers, findings and provenance are
in `R6.1b.evidence.md`. Both reciprocal reviews were resolved against quoted bytes, with no
disputed reading at merge.

| Result | Durable home |
|---|---|
| CoM 1 special-cases Zombies (`toblock = -1`), Golems (Resist Elements), and Catapults with `wp == 9` (persistent mutation quality 1). The Catapult's fresh quality read sees the new value while `BU_Apply_Specials` receives the older snapshot. | R6.1b evidence, *CoM 1 has three unit-type constructor patches* |
| CoM 1's near helper decodes `cs:0x17D7` as three mana overrides: Angel 24, Apprentices 14, Djinn 35. | `unitcalc.c`; R6.1b evidence, *CoM 1 adds a three-entry mana override table* |
| The CoM-only player byte `DS:0xA363` is Survival Instinct, granting the controller's fantastic units +1 Defense, +2 Resistance and +1 To Hit. | `MoM binary analysis.md`, *Battle-unit constructor across the DOS builds*; R6.1b evidence |
| CoM 1 swaps the Lucky/hero order and runs `BU_Apply_Specials` before Chaos Surge. CP 1.60 jumps over 1.31's Flight movement floor; CoM removes it and performs no constructor `movement_points` write. | R6.1b evidence, *Constructor ordering differs* and *Flight movement floor* |
| Every build clears accumulator bytes only through `Grey_Resist`; `Grey_Hits` is skipped. CP 1.60 and CoM 1 alone later store the hit-point routine's `DL` result to `Gold_Hits`. | R6.1b evidence, *Grey_Hits is deliberately outside the constructor's zeroing run* |

## 2026-08-06 — R6.1c, stat recompute first half

The first half of `BU_Apply_Battlefield_Effects` was reconstructed across all three DOS builds in
dual-derivation mode and merged into `Reference docs/DOS reconstructed/unitcalc.c`; complete
ledgers, findings and provenance are in `R6.1c.evidence.md`. Reciprocal review resolved every
entry. The temporary `+0x6A` wizard-field disagreement closed as Guardian after CoM 1's retort
renumbering and the executed city-defense tuple were checked together.

| Result | Durable home |
|---|---|
| MoM 1.31 and CP 1.60 are byte-identical in this half. Node aura's melee write is ungated; Leadership is non-Fantastic-only and halves ranged. | R6.1c evidence, *Node aura and Leadership have asymmetric gates* |
| CoM 1 extends Holy Bonus to ranged. Prayer and High Prayer do not stack; High Prayer uses +2 melee and never writes ranged. | `MoM binary analysis.md`, *Battle-unit stat recompute, first half*; R6.1c evidence |
| CoM 1's Metal Fires patch removes the Fantastic and Flame Blade exclusions but also patches Thrown out of its ranged +3. | R6.1c evidence, *CoM 1 patched three Metal Fires exclusions out of execution* |
| CoM 1's city-defense blocks are Guardian and Heavenly Light. Guardian adds To Hit, To Block and Resistance; Heavenly Light carries the defender stat and weapon package. | `MoM binary analysis.md`; R6.1c evidence, *The CoM 1 city-defense bytes* |
| CoM 1 jumps from `0x905B8` through a same-frame tail at `0x90B8E..0x90C00` and returns to live code at `0x905BB`; R6.1d was extended to own the disconnected tail. | R6.1c evidence, *CoM 1's relocated tail fell between the original scoped halves* |

## 2026-08-06 — R6.1d, stat recompute second half

The remainder of `BU_Apply_Battlefield_Effects`, including CoM 1's relocated same-frame tail,
was reconstructed across all three DOS builds in dual-derivation mode and merged into
`Reference docs/DOS reconstructed/unitcalc.c`; complete ledgers, findings and provenance are in
`R6.1d.evidence.md`. Both reciprocal reviews closed against quoted bytes with no disputed reading.

| Result | Durable home |
|---|---|
| CP 1.60 restores Weakness's Thrown arm and fixes Shatter's two `Grey_*` loss accumulators; its candidate player-byte `+0x6A` bonus body is unreachable. | R6.1d evidence, *CP 1.60 makes three surgical corrections* |
| MoM 1.31's unknown `Combat_Effects 0x0400` reduction credits `Gold_Resist`, the only reduction in the reconstructed routine to write a gold accumulator. | R6.1d evidence, *MoM 1.31's unknown `0x0400` reduction* |
| CoM 1 Warp Creature halves the shared ranged slot and divides Defense by three before Shatter, Darkness, Supreme Light, Tactician and Eternal Night. | `MoM binary analysis.md`, *Battle-unit stat recompute, second half*; R6.1d evidence |
| CoM 1 Supreme Light has five eligibility paths, an unconditional melee write, a signed live-Resistance division, and an unidentified `Move_Flags 0x0100` write. | R6.1d evidence; F52; Q20 |
| CoM 1 Realm Wards execute −2 To Hit/−3 Defense/−3 Resistance despite helptext saying −2/−4/−4. | R6.1d evidence; F51; Q19 |
| The relocated tail applies Guiding Beacon, Divine Barrier and Soul Linker side maxima before Heavenly Light. | R6.1d evidence; F50 |

## 2026-08-06 — R6.1e, hero items and constructor hit points

The constructor's hero-item and hit-point callees were reconstructed across all three DOS builds
in dual-derivation mode and merged into `Reference docs/DOS reconstructed/unitcalc.c`; complete
ledgers, findings and provenance are in `R6.1e.evidence.md`. Both reciprocal reviews were resolved
against quoted bytes, with no disputed reading at merge.

| Result | Durable home |
|---|---|
| CoM 1 repurposes the Endurance, Giant Strength and Power Drain bits for the manual's Teleportation, Inner Fire and Divine Protection. The executed effects match the manual, while shipped helptext retains the old powers. | `MoM binary analysis.md`, *Constructor hero-item and hit-point callees*; R6.1e evidence; Q21 |
| CoM 1 NOP-fills both old Giant Strength attack-write blocks. R6.1g later proved that the adjacent item-power helper also never tests Inner Fire's bit, closing Q22 as a negative binary finding. | R6.1e/R6.1g evidence; `MoM binary analysis.md` |
| Item attack bonuses are weapon- and attack-class-specific. CoM 1 widens Bow eligibility from MoM's missile-only test to every signed ranged class `<= 3`. | R6.1e evidence, *Item eligibility is weapon- and attack-class-specific* |
| CP 1.60 and CoM 1 return Gold Hits in `DX`, scan equipped items for Lion Heart, and store the low byte in `Gold_Hits`; CoM 1 also replaces the MoM level ladders and delegates its per-figure base to the live eight-divided-by-figures helper. | `unitcalc.c`; R6.1e evidence, *CP and CoM add a second hit-point return and item Lion Heart scan* and *CoM replaces MoM's level ladder for heroes* |
| Charm of Life can reduce a negative intermediate hit value in CoM 1 because its positive-value gate is gone. CP 1.60's table-shaped post-return block is unreachable residue, while CoM 1 executes its homolog. | R6.1e evidence, *Charm of Life differs on negative intermediate values* and *Two non-code ranges remain load-bearing evidence* |

## 2026-08-06 — R6.1f, level bonuses and hero-template abilities

The contiguous level and hero-template helpers were reconstructed across all three DOS builds in
dual-derivation mode and merged into `Reference docs/DOS reconstructed/unitcalc.c`; complete
ledgers, findings and provenance are in `R6.1f.evidence.md`. Seven reciprocal-review entries were
resolved against quoted bytes, with no disputed reading at merge. This closed A31.

| Result | Durable home |
|---|---|
| CoM Heroism persistently floors eligible units at `3 + Warlord + Crusade`, while MoM/CP floor only the routine-local level at three. CoM also persistently zeroes non-Heroism types at or above `0x97`. | `MoM binary analysis.md`, *Level bonuses and hero-template abilities*; R6.1f evidence |
| MoM's five-step normal ladder is now exhaustively decoded. CoM replaces it with a 5×7 table and gives every `ranged_type >= 100` attack only the step-1 ranged increment; the table loop has no local upper-bound check. | `unitcalc.c`; R6.1f evidence, *The normal and hero ladders are separate* |
| Every DOS build has a separate eight-threshold hero ladder. CoM substitutes a different write pattern, so the calculator's shared five-rank normal ladder is not exact for heroes; F41 now owns all engine-specific hero progression. | `Calculator/SPEC.md`, *Known modelling limitations*; R6.1f evidence; F41 |
| The hero-template helper fixes the Agility, Blademaster, Might and Arcane Power formulas. CoM changes Blademaster's divisors, replaces the mana formula with a 35-byte type table, and turns template Lucky into the ordinary Lucky bit consumed later by the constructor. | `MoM binary analysis.md`, *Level bonuses and hero-template abilities*; R6.1f evidence |

## 2026-08-06 — R6.1g, item powers, recompute hits and CoM movement

The item-power helper and recompute hit-point routine were reconstructed across all three DOS
builds, together with CoM 1's far `Battle_Unit_Moves2` routine and its two private near helpers.
The merged C is in `Reference docs/DOS reconstructed/unitcalc.c`; complete ledgers, inventories,
counts, findings and dual-review provenance are in `R6.1g.evidence.md`. Nine reciprocal-review
entries were resolved against the bytes, with no disputed reading at merge.

| Result | Durable home |
|---|---|
| CoM repurposes three item-power blocks: Path Finding becomes Land Link, old Magic Immunity writes `Move_Flags 0x0200`, and old Righteousness becomes Shadow's conditional Thrown attack. | `MoM binary analysis.md`, *Item powers, recompute hit points, and CoM movement*; R6.1g evidence |
| The complete CoM hero-item path never tests Inner Fire's raw `0x08000000` bit for attack, so the manual-promised +1 attack is absent and Q22 is closed without a calculator implementation. | R6.1g evidence, *Item powers and Q22* |
| Recomputed hit points expose the Crusade, Black Channels and Lion Heart build differences; CoM uses unsigned `8 / Max_Figures` for Lion Heart. | `unitcalc.c`; R6.1g evidence, *Recompute hit points* |
| CoM `Battle_Unit_Moves2` combines the movement sources and Entangle penalty, then uses `Grey_Hits` as a previous-maximum cache. Equal maxima return without rewriting the cache. | `unitcalc.c`; R6.1g evidence, *CoM `Battle_Unit_Moves2`* |
| The routine identifies the consumed Logistics table, but the manual/helptext scaling conflict remains open as Q23. | `MoM binary analysis.md`; R6.1g evidence; Q23 |

## Verification results removed from the live register

Resolved engine findings are deliberately not duplicated here in detail:

- DOS findings live in `Reference docs/MoM binary analysis.md`.
- Modern binary findings live in the subsystem documents indexed by
  `Reference docs/Caster binary/CoM2 binary analysis.md` and in their evidence companions.
- Modern constants live in `Reference docs/CoM2 data tables.md`.
- Only unresolved or partial verification dossiers remain in
  `Reference docs/Engine verification evidence.md`.

The retired verification IDs include A9, A21–A31, B3, B8, D1, D3–D16, D17, D19, D20, D22–D27, S1,
and S2. IDs are not reused.

D17 asked whether Destruction was *absent* from the DOS engines and was answered the other way:
it is present in all three builds, hero-only, which is why the calculator had not modelled it.
`Reference docs/MoM binary analysis.md` owns the finding; implementing it remains M3.

## Closed mechanic questions

| ID | Result | Durable home |
|---|---|---|
| Q7 | Supreme Light reads live Resistance at its own engine position. | `SPEC.md`; DOS analysis; modern unit-recalculation analysis |
| Q9 | CoM2/Warlord can carry Doom Gaze and ranged simultaneously; the fields are independent. | `CoM2 binary - combat flow.md`, *Gaze attacks*; `CoM2 binary - unit recalculation.md`, global-enchantment findings |
| Q10 | Destiny does not remove weapon-material bonuses; item/weapon processing follows it. | `CoM2 binary - unit recalculation.md`, *Experience, Destiny and the named stat helpers* |
| Q13 | Modern Land Link adds +2 to each positive breath field for current Fantastic units. | `CoM2 binary - unit recalculation.md`, unit-enchantment findings |
| Q14 | Modern Defense dice after the configured cap use the capped To Defend value. | `CoM2 data tables.md`; `Combat.ResolutionHelpers.R5.2e.evidence.md` |
| Q22 | CoM's hero-item path contains no implementation of Inner Fire's manual-promised +1 attack. | `MoM binary analysis.md`; R6.1g evidence |
| Q11 | DOS Animate Dead does grant +ranged. Its enchantment is CoM 1's `0x00000010` "Animated", whose block adds `+1 ranged` gated on `ranged_type != -1`; the MoM builds' Black Channels occupies the same slot and adds `+1`. | `DOS reconstructed/R6.1a.evidence.md`, *CoM 1 renamed nine enchantment slots* and *Black Channels' ranged gate* |

## Accepted modelling decisions

The canonical descriptions remain in `SPEC.md`, *Known modelling limitations*.

- M1: Life Steal's displayed distribution is approximate; F28 separately tracks incorrect
  healing semantics.
- M2: target damage is capped at remaining HP and overkill is not displayed; F27/F28 separately
  track healing amounts that must not inherit that cap.
- M7: ammunition is excluded because the calculator resolves one engagement rather than a
  multi-turn shot budget.
- M8: regeneration is excluded because it is between-turn healing outside a single engagement.
