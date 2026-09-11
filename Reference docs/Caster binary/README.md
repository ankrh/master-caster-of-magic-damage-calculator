# `Caster.exe`

Everything read out of the modern engine's executable, which covers **both CoM2 and Warlord**
(Warlord bundles the same `Caster.exe` and ships no Warlord-specific engine executable).

| File | Owns |
|---|---|
| [`CoM2 binary analysis.md`](./CoM2%20binary%20analysis.md) and its linked subsystem files | short method/index plus mechanic-level findings and address anchors |
| [`Units.RecalculateUnits.pas`](./Units.RecalculateUnits.pas) and siblings | address-backed, Pascal-like reconstructions of the calculator-relevant flows |
| this file | the binary's identity, and the reconstruction's conventions |

The `.pas` files imitate the executable's control and data flow; they are not a claim to recover
the original source, and are intentionally not compilable — partial record layouts and unresolved
seams stay visible until their executable blocks have been reconstructed. The completed R5.G
reconstruction review is recorded in `.review-of-claude.md`.

## The binary

**This table is the single home for `Caster.exe`'s identity — do not restate it elsewhere.**

| Field | Value |
|---|---|
| Path | `C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic\Master of Magic Caster Windows\Caster.exe` |
| Version | CoM2 **1.05.11** |
| md5 | `540c22dbd701fb2caa95bd3ecccd9447` |
| Size | 10,584,041 bytes |
| Format | PE32, i386, image base `0x400000`, Delphi (Embarcadero) |

The Warlord 1.5.12.9 distribution copy at
`Raw install files/CoM2ModWarlord1.5.12.9/CoMWin1511/Caster.exe` has the same size and MD5, so it
uses this exact engine binary; Warlord's executing `.CAS` scripts remain a separate higher-priority
layer where they overwrite compiled behavior.

Every address in this directory is a virtual address in that exact build. Verify the hash before
using them.

**`1.05.11` is the engine's own spelling.** It occurs twice, as Delphi short strings:

| VA | Length byte | String |
|---|---|---|
| `0x694975` | `0x1B` (27) at `0x694974` | `Version 1.05.11, 2025-12-06` — one string; the version substring starts at `0x69497D` |
| `0x699F11` | `0x07` at `0x699F10` | `Version` — the label only |
| `0x699F19` | `0x13` (19) at `0x699F18` | `1.05.11, 2025-12-06` — the value, a *separate* string from the label above it |

The string `1.5.11` does not occur in the executable at all, and the PE version resource is an
unset `1.0.0.0` placeholder that says nothing. Both the CoM2 and Warlord manuals write `1.5.11`
in prose; where they differ from the binary, the binary is the version name.

## Naming and confidence

- TD32 procedure, parameter and local names are retained verbatim.
- Names beginning `inferred_` are semantic aliases assigned by the reconstruction.
- `field_XXXX` names are record fields known only by byte offset.
- `global_XXXXXXXX` names are globals known only by virtual address.
- Every reconstructed block is tagged `exact`, `inferred`, or `unresolved`.
  - `exact`: branch/call/write structure is read directly from the executable.
  - `inferred`: the structure is exact but at least one semantic name or type is assigned.
  - `unresolved`: intentionally left source-shaped without pretending the body is decoded.
- Record fields carry their byte offset within the record as a comment wherever it is known, so a
  field claim can be checked against a disassembled operand without re-deriving the layout.
- Delphi's compiler-generated range and overflow checks (`cmp …, N; jbe` before an indexed
  access; `jno` after an `imul`) are omitted throughout, since they do not alter ordinary control
  flow. Where a check reveals something the source shape otherwise loses — most importantly an
  array's declared bound — that fact is recorded at the declaration instead.

## Reconstruction completeness

The primary deliverable is the Pascal-like body in the indexed reconstruction file. Narrative
findings, tables, call inventories and execution-order lists may accompany it, but none counts as
a reconstruction of the block it describes.

**Complete means complete semantic instruction coverage, not merely reaching the end address.**
Every semantic conditional branch, loop, call, return, branch-affecting read and state write in
the assigned extent must appear in the Pascal-like body. Preserve branch nesting and mutual
exclusion, loop bounds and order, base-record versus calculated-record access, persistent versus
calculated enchantment layers, exact constants or their exact supplying global addresses, and
the order of writes even when it looks redundant or buggy.

Every address in an assigned extent must be accounted for by a contiguous, non-overlapping
coverage ledger with these dispositions:

| Disposition | Meaning |
|---|---|
| `reconstructed` | The source-shaped body represents the complete semantic control and data flow. |
| `compiler-only` | Range/overflow checks, record-address calculation or routine scaffolding omitted under the convention above. |
| `unresolved` | An explicitly address-bounded block whose semantic body remains to be reconstructed. |

The ledger must begin and end at the assigned extent's exact boundaries and contain no gaps.
Any `unresolved` row means the item remains **in progress**.

Do not introduce a synthetic helper to hide an executable block. A helper is permitted only if
the executable really calls it, or if its complete reconstructed body appears in the same
artifact. Calls such as `inferred_ApplyEffects(...)`, comments such as "combat-global ladder",
and tables listing effects without their predicates and bodies are unresolved placeholders, not
reconstructed source.

`exact` requires the rendered block to include every branch condition, operation, operand,
constant or global source, and destination. If semantic control or data flow is omitted, use
`unresolved`; if the structure is complete but a semantic name or type is assigned, use
`inferred`. Never use `exact` for a summarized block. Before marking an extent complete, record
these six zero counts after its coverage ledger:

- `unresolved ranges: 0`
- `synthetic helpers without bodies: 0`
- `semantic conditional jumps omitted: 0`
- `semantic calls omitted: 0`
- `state writes omitted: 0`
- `declared parent mismatches: 0`

The final test is reproducibility: another agent must be able to reproduce every semantic branch
and write in the extent from the reconstruction without reopening the disassembly.

### Nesting must be declared, not implied

A ledger row lists an address range; it does not say whether that range is a block in its own
right or the tail of an enclosing one. **Every row therefore carries a `Within` column** naming
the row it is nested inside, or `—` for top level. This is the difference between a correct
reconstruction and one that reads a nested block as a sibling — a mistake the other four counts
cannot detect, because a mis-levelled block still cites every branch, call and write it contains.

Two supporting checks, in `tools/` and the durable reconstruction evidence files:

```
annotate_caster_disasm.py Caster.exe <va> <len> --inbound
```

Run **before** reconstructing any block. It reports, over the whole enclosing routine rather than
the dumped window, every branch that lands inside the range and — the part that matters — every
branch that **straddles** it: source before the range, target at or after its end. Each straddling
branch is an outer gate deciding whether the range runs at all. A plain dump cannot show these,
because they originate outside it.

```
verify_derivation.py Caster.exe <doc.md>
```

Parses the ledger, recomputes each row's innermost gate from the straddling branches, and fails on
any row whose `Within` disagrees with the binary. It also checks citation coverage for semantic
branches, calls and named-field writes, and exits non-zero if anything is wrong. Compiler
range/overflow guards immediately followed by their known handler calls are excluded from nesting,
just as they are from semantic-branch coverage; they are scaffolding rather than source-level
gates. A document
owning several extents is split one group per ledger — a new ledger begins wherever the row
number restarts or the addresses stop being contiguous — and each is checked separately, so no
extent argument is needed; pass one only to check a single extent. The row-number rule matters
because `Within` cites a row of its own ledger: R5.2a ends exactly where R5.2b begins, and
merging those two on address contiguity alone resolves every `Within` in the second against the
first one's rows. A clean run proves
coverage, not that the cited instructions were interpreted correctly; the branch-target and
full-arithmetic evidence still requires human review.

Both checks guard against treating a fall-through tail as a top-level sibling.

Mechanic-level analysis is split by subsystem and routed by
[`CoM2 binary analysis.md`](./CoM2%20binary%20analysis.md). Reconstruction and review provenance
remain in the per-item evidence companions below.

## Reconstruction artifact index

This is a navigation and evidence index, not a status register. Live state, priority, cost and
review gates exist only in `Calculator/BACKLOG.md`.

| Item | File | Durable coverage and provenance |
|---|---|---|
| R5.1a | [`Units.RecalculateUnits.pas`](./Units.RecalculateUnits.pas); [`region-a evidence`](./Units.RecalculateUnits.R5.1a.evidence.md); [`late-hook evidence`](./Units.RecalculateUnits.R5.1a-late-hook.evidence.md); [`Castercore wrapper evidence`](./Castercore.RecalculateUnits.evidence.md); [`city-tile wrapper evidence`](./Units.RecalculateunitsonCityTile.evidence.md) | Audit dated 2026-08-02: signature/ABI, region `a`, both script-hook boundaries, an address-indexed seam for regions `c` and `e`, plus the CasterCore and city-tile wrappers; all four extents carry current-gate ledgers, branch/call/write evidence and six zero counts |
| R5.1b | same file, region `c`; [`Units.RecalculateUnits.R5.1b.evidence.md`](./Units.RecalculateUnits.R5.1b.evidence.md) | Merged 2026-08-02 from both derivations; reciprocal review recorded no surviving disagreement |
| D21 | same file, `@Units@ApplyLevelBonus`; [`D21.evidence.md`](./D21.evidence.md) | Complete `$005981F8..$00598D86` helper, current CoM2/Warlord table bindings and values, and exhaustive no-gaze-write result; merged 2026-08-10 from independent Claude/Codex derivations and reciprocal review with no surviving disagreement |
| D29 | same file, `@Units@ApplyMagicWeapons`; [`D29.evidence.md`](./D29.evidence.md) | Locate-and-bound result `$00598D88..$005992CC`, including exact adjacency, two direct callers, reachable exits, shared CoM2/Warlord build proof and the frontier handed to D33 |
| D32 | [`Spells.InitializeCombatSpellcasting.pas`](./Spells.InitializeCombatSpellcasting.pas); [`D32.evidence.md`](./D32.evidence.md) | Locate-and-bound result for Raise Dead case `$005CD1FF..$005CD372`, wrapper `$0064435C..$00644377`, the existing No-Heal recalculation consumer, direct callers, ordinary return, and symbol-owned post-return data |
| D33 | [`Units.RecalculateUnits.pas`](./Units.RecalculateUnits.pas), `@Units@ApplyMagicWeapons`; [`D33.evidence.md`](./D33.evidence.md) | Complete `$00598D88..$005992CC` material gates, rival-global suppression scan, tiered stat/To-Hit writes, runtime INI binding, checked arithmetic and shared-build ledgers; dual Sol High derivation plus Claude Opus 5 High review |
| F18 | [`Units.RecalculateUnits.pas`](./Units.RecalculateUnits.pas), `@Units@applynodeaura`; [`F18.evidence.md`](./F18.evidence.md) | Complete `$0059718C..$005973A3` persistent-melee/current-ranged-and-breath gates, literal `+2` writes, compiler checks, callers and shared CoM2/Warlord ledgers; dual Sol High derivation plus Claude Opus 5 Medium review |
| D36 | [`Spells.InitializeCombatSpellcasting.pas`](./Spells.InitializeCombatSpellcasting.pas); [`D36.evidence.md`](./D36.evidence.md) | Complete shared CoM2/Warlord Raise Dead case and Castercore wrapper: No-Heal/status/location/movement writes, checked half-HP damage, output ID, enclosing context, excluded Animate Dead sibling, and disjoint Warlord recount |
| R5.1c | same file, region `e`; and the named helpers | R5.1c-a–R5.1c-c durable source and evidence artifact group |
| R5.1c-a | same file; [`Units.RecalculateUnits.R5.1c-a.evidence.md`](./Units.RecalculateUnits.R5.1c-a.evidence.md) | Final first-pass clamps, aura-pass preparation/dispatch, `@Map@unitonoverlandtile`, and `@Units@Ismagicalranged`; dual derivation and reciprocal review provenance are recorded in the evidence |
| R5.1c-b | same file; [`Units.RecalculateUnits.R5.1c-b.evidence.md`](./Units.RecalculateUnits.R5.1c-b.evidence.md) | Supreme Light, MP/movement reconciliation, DebugInvis, deferred-damage reconciliation, `@Units@Immobile`, `@Units@TotalHpLeft`, `@Combat@Iscombat`, `@Units@HpPerFigure`, and `@Game@Min`; reciprocal review on 2026-08-03 recorded no semantic misreading and five reproducibility/naming fixes |
| R5.1c-c | same file; [`Units.RecalculateUnits.R5.1c-c.evidence.md`](./Units.RecalculateUnits.R5.1c-c.evidence.md) | `@Units@BuildAuraTable`, `@Units@AddtoAuraTable`, and `@Heroes@HeroBonus`; Codex cold derivation and byte audit, followed by Claude review on 2026-08-03 with no semantic misreading and two documentation fixes |
| R5.2 | [`Combat.ApplyAttack.pas`](./Combat.ApplyAttack.pas) and subsequent combat-flow reconstructions | R5.2a–R5.2m artifact group; derivation, audit and review provenance lives in the per-item evidence below |
| R5.2a | same file; [`Combat.ApplyAttack.R5.2a-b.evidence.md`](./Combat.ApplyAttack.R5.2a-b.evidence.md) | Setup/dispatch slice `$005B1970..$005B213D`; Codex cold derivation and byte-level self-review, with Claude review dated 2026-08-03 |
| R5.2b | same file and evidence companion | Pre-roll slice `$005B213D..$005B2994`; the combined R5.2a–b evidence records its ledgers and completion counts |
| R5.2c | same file; [`Combat.ApplyAttack.R5.2c.evidence.md`](./Combat.ApplyAttack.R5.2c.evidence.md) | Rider, per-figure damage, spillover and result-routing slice `$005B2994..$005B32BC`; ledger/count and review provenance are recorded in the evidence |
| R5.2d | [`Combat.PerformAttacks.pas`](./Combat.PerformAttacks.pas); [`Combat.PerformAttacks.R5.2d.evidence.md`](./Combat.PerformAttacks.R5.2d.evidence.md) | Ranged and melee dispatchers; Codex derivation/self-review and Claude review provenance |
| R5.2e | [`Combat.ResolutionHelpers.pas`](./Combat.ResolutionHelpers.pas); [`Combat.ResolutionHelpers.R5.2e.evidence.md`](./Combat.ResolutionHelpers.R5.2e.evidence.md) | Resistance, attack-roll, defense-roll, effective-defense and ranged-distance helpers; seven ledgers and review provenance |
| R5.2f | [`Combat.DamageHandling.pas`](./Combat.DamageHandling.pas); [`Combat.DamageHandling.R5.2f.evidence.md`](./Combat.DamageHandling.R5.2f.evidence.md) | Damage accumulation, healing, living/top-figure and damage-dealing routines; five ledgers and review provenance |
| R5.2g | [`Spells.DamageSpells.pas`](./Spells.DamageSpells.pas); [`Spells.DamageSpells.R5.2g.evidence.md`](./Spells.DamageSpells.R5.2g.evidence.md) | `DamageSpell` and `FirewallEffect`; reciprocal review corrected the non-area spill to a pre-tested repeated loop, while the whole-routine ledger remained unchanged |
| R5.2h | [`Combat.AttackAndWallHelpers.pas`](./Combat.AttackAndWallHelpers.pas); [`Combat.AttackAndWallHelpers.R5.2h.evidence.md`](./Combat.AttackAndWallHelpers.R5.2h.evidence.md) | Attack-flag, missile-classification, flying-eligibility and wall-helper extents; review provenance includes the corrected `mergeflags` labels |
| R5.2i | [`Combat.CallClosure.R5.2i.audit.md`](./Combat.CallClosure.R5.2i.audit.md) | Classification of all semantic callees behind R5.2a–h and the derivation scope assigned to R5.2j–R5.2l |
| R5.2j | [`Spells.DamageSpells.pas`](./Spells.DamageSpells.pas); [`Spells.ApplyDamageSpell.R5.2j.evidence.md`](./Spells.ApplyDamageSpell.R5.2j.evidence.md) | `ApplyDamageSpell` category adjustment, dealing, spell-specific state flow and off-combat death routing |
| R5.2k | [`Combat.CallClosureHelpers.pas`](./Combat.CallClosureHelpers.pas); [`Combat.CallClosureHelpers.R5.2k.evidence.md`](./Combat.CallClosureHelpers.R5.2k.evidence.md) | Six resistance, spell, damage, distance, Blur-side and healing helpers |
| R5.2l | [`Combat.AttackAndWallHelpers.pas`](./Combat.AttackAndWallHelpers.pas); [`Combat.WallStateMapping.R5.2l.evidence.md`](./Combat.WallStateMapping.R5.2l.evidence.md) | `ctws` 12-slot wall-perimeter mapping and `SetWallState` |
| R5.2m | [`Combat.AmplifiedDamage.pas`](./Combat.AmplifiedDamage.pas); [`Combat.AmplifiedDamage.R5.2m.evidence.md`](./Combat.AmplifiedDamage.R5.2m.evidence.md) | Combat-only, non-stacking opposing-owner Amplifier predicate |
| R9-G1a-R2 | [`Spells.CombatSummonUnit.pas`](./Spells.CombatSummonUnit.pas); [`R9-G1a-R2.evidence.md`](./R9-G1a-R2.evidence.md) | Complete combat-summon creation, identity writes, Demon Lord/Lesser Demon gate and script handoff; merged 2026-08-09 from independent Claude/Codex derivations and reciprocal byte review with no surviving disagreement |
| Q31 | [`Q31.evidence.md`](./Q31.evidence.md) | Complete `@Units@IsChaosUnit`, `@Units@IsDeathUnit` and `@Units@ChaosChannel` (`$00594FE4..$0059511F`): the realm-plus-recovery predicate, one-based flag indexing, calculated-record proof, full caller set, and `BUG-Q31`; merged 2026-08-31 from independent Claude/GPT derivations and reciprocal review, both revising from a defect reading to the recovery reading |

## F250.2 modern cast-store reconciliation

[Evidence](F250.2.combat.evidence.md), [reconstruction](F250.2.combat.reconstruction.md), [raw packet](F250.2.combat.raw.md), [flow](F250.2.combat.flow.svg). Generic combat buffs/curses and Warp write `BaseUnits.CombatEnchantmentFlags`; existing accessor and recalculation evidence distinguishes that persistent object's combat layer from its base enchantment layer. The bounded reconciliation is complete; full admission, runtime installation and migration conditions remain explicit.

The subsequent [37-instruction overland store](F250.2.overland-store.evidence.md) writes
`BaseUnits.OverlandEnchantmentFlags`; it reuses the known converter, record mapping and
recalculation instead of reconstructing them again. Named runtime binding and complete admission
remain conditional. The [loader supplement](F250.2.loader.evidence.md) supplies the key-to-field
assignments and bounded startup branch; reuse it for those claims.

The [True Sight continuations](F250.2.truesight-continuation.evidence.md) connect the combat
route to its known tail and establish overland recalculation before the script/common tail.

## F250.4 player Illusion-refusal links

[Evidence](F250.4.modern.evidence.md), [reconstruction](F250.4.modern.reconstruction.md),
[raw packet](F250.4.modern.raw.md), [flow](F250.4.modern.flow.svg). The Illusion-key writer
and conditional player/animation paths join the existing effect-entry refusal. Earlier
admission, runtime loading and animation scheduling remain external. The
[script reconciliation](F250.4.script-reconciliation.md) routes Warlord grants and DOS evidence.

## P2.1 Holy Weapon admission and animation links

[Evidence](P2.1.evidence.md), [reconstruction](P2.1.reconstruction.md),
[raw packet](P2.1.raw.md), [flow](P2.1.flow.svg). The bounded unit/outer-target continuations
preserve the preceding result for the stated live slot-124/group-15 route. The generic
animation and selected renderer entry connect conditionally to the known effect wrapper;
initializer, custom, runtime and intervening-call conditions remain explicit.
