# Calculator work history

Closed work, accepted modelling decisions, and notable verification results removed from
`BACKLOG.md`. This file is historical context, not a work register and not a source of truth for
engine behavior. The linked specification, binary analyses, data-table findings, discrepancy
catalogue, reconstructions, and evidence files own the underlying results.

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

## Verification results removed from the live register

Resolved engine findings are deliberately not duplicated here in detail:

- DOS findings live in `Reference docs/MoM binary analysis.md`.
- Modern binary findings live in the subsystem documents indexed by
  `Reference docs/Caster binary/CoM2 binary analysis.md` and in their evidence companions.
- Modern constants live in `Reference docs/CoM2 data tables.md`.
- Only unresolved or partial verification dossiers remain in
  `Reference docs/Engine verification evidence.md`.

The retired verification IDs include A9, A21–A30, B3, B8, D1, D3–D16, D17, D19, D20, D22–D27, S1,
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

## Accepted modelling decisions

The canonical descriptions remain in `SPEC.md`, *Known modelling limitations*.

- M1: Life Steal's displayed distribution is approximate; F28 separately tracks incorrect
  healing semantics.
- M2: target damage is capped at remaining HP and overkill is not displayed; F27/F28 separately
  track healing amounts that must not inherit that cap.
- M7: ammunition is excluded because the calculator resolves one engagement rather than a
  multi-turn shot budget.
- M8: regeneration is excluded because it is between-turn healing outside a single engagement.
