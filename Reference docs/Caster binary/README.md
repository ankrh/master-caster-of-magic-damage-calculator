# `Caster.exe`

Everything read out of the modern engine's executable, which covers **both CoM2 and Warlord**
(Warlord ships no executable of its own).

| File | Owns |
|---|---|
| [`CoM2 binary analysis.md`](./CoM2%20binary%20analysis.md) | mechanic-level findings, the method for getting more, and the address anchors behind each |
| [`Units.RecalculateUnits.pas`](./Units.RecalculateUnits.pas) and siblings | address-backed, Pascal-like reconstructions of the calculator-relevant flows |
| this file | the binary's identity, and the reconstruction's conventions |

The `.pas` files imitate the executable's control and data flow; they are not a claim to recover
the original source, and are intentionally not compilable — partial record layouts and unresolved
seams stay visible until their executable blocks have been reconstructed. Tracking for the
reconstruction effort (IDs, status, completion gate) lives in `Calculator/BACKLOG.md`, §2e.

## The binary

**This table is the single home for `Caster.exe`'s identity — do not restate it elsewhere.**

| Field | Value |
|---|---|
| Path | `C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic\Master of Magic Caster Windows\Caster.exe` |
| Version | CoM2 **1.05.11** |
| md5 | `540c22dbd701fb2caa95bd3ecccd9447` |
| Size | 10,584,041 bytes |
| Format | PE32, i386, image base `0x400000`, Delphi (Embarcadero) |

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
branches, calls and named-field writes, and exits non-zero if anything is wrong. A document
owning several extents is split one group per ledger — a new ledger begins wherever the row
number restarts or the addresses stop being contiguous — and each is checked separately, so no
extent argument is needed; pass one only to check a single extent. The row-number rule matters
because `Within` cites a row of its own ledger: R5.2a ends exactly where R5.2b begins, and
merging those two on address contiguity alone resolves every `Within` in the second against the
first one's rows. A clean run proves
coverage, not that the cited instructions were interpreted correctly; the branch-target and
full-arithmetic evidence still requires human review.

*Both checks exist because `+0x049BC` was first reconstructed as a top-level "weapon material
To-Hit" block when it is the tail of Heavenly Light, reachable only by fall-through from that
package's bonus writes. Every citation-based count passed while it was wrong.*

**Open structural question.** `CoM2 binary analysis.md` gives R5.2c, R5.2d, R5.2f, R5.2h and
R5.2l a `###` section each, while R5.2g and R5.2j/R5.2m are `#####` subsections under
*Resolution-time modifiers (R5.2e …)* and R5.2k has none of its own. Tracked as **Q16**.

## Reconstruction index

| R5 item | File | Current coverage |
|---|---|---|
| R5.1a | [`Units.RecalculateUnits.pas`](./Units.RecalculateUnits.pas); [`region-a evidence`](./Units.RecalculateUnits.R5.1a.evidence.md); [`late-hook evidence`](./Units.RecalculateUnits.R5.1a-late-hook.evidence.md); [`Castercore wrapper evidence`](./Castercore.RecalculateUnits.evidence.md); [`city-tile wrapper evidence`](./Units.RecalculateunitsonCityTile.evidence.md) | **re-audited 2026-08-02** — signature/ABI, complete region `a`, both script-hook boundaries, an address-indexed seam for regions `c` and `e`, plus its CasterCore and city-tile wrappers; all four reconstructed extents now carry current-gate ledgers, branch/call/write evidence and six zero counts |
| R5.1b | same file, region `c`; [`Units.RecalculateUnits.R5.1b.evidence.md`](./Units.RecalculateUnits.R5.1b.evidence.md) | **done 2026-08-02** — complete semantic reconstruction merged from both derivations; review closed with no surviving disagreement |
| R5.1c | same file, region `e`; and the named helpers | **done 2026-08-02** — R5.1c-a–R5.1c-c complete with durable source and evidence |
| R5.1c-a | same file; [`Units.RecalculateUnits.R5.1c-a.evidence.md`](./Units.RecalculateUnits.R5.1c-a.evidence.md) | **done 2026-08-02** — final first-pass clamps, aura-pass preparation/dispatch, `@Map@unitonoverlandtile`, and `@Units@Ismagicalranged`; dual derivation and cross-review merged with no surviving disagreement |
| R5.1c-b | same file; [`Units.RecalculateUnits.R5.1c-b.evidence.md`](./Units.RecalculateUnits.R5.1c-b.evidence.md) | **done 2026-08-02** — Supreme Light, MP/movement reconciliation, DebugInvis, deferred-damage reconciliation, `@Units@Immobile`, `@Units@TotalHpLeft`, `@Combat@Iscombat`, `@Units@HpPerFigure`, and `@Game@Min`; two independent derivations, Codex review of Claude clean; the reciprocal Claude review was completed 2026-08-03 and found no semantic misreading — its five reproducibility/naming fixes are integrated |
| R5.1c-c | same file; [`Units.RecalculateUnits.R5.1c-c.evidence.md`](./Units.RecalculateUnits.R5.1c-c.evidence.md) | **done 2026-08-02 by user direction** — `@Units@BuildAuraTable`, `@Units@AddtoAuraTable`, and `@Heroes@HeroBonus` fully reconstructed from Codex's cold derivation and byte-level self-audit; the independent Claude derivation was never produced, but the formal Claude review was completed 2026-08-03 and found no semantic misreading (two documentation fixes integrated) |
| R5.2 | [`Combat.ApplyAttack.pas`](./Combat.ApplyAttack.pas) and subsequent combat-flow reconstructions | **done 2026-08-02 by user direction; R5.2g correction closed 2026-08-03** — R5.2a–R5.2m integrated; the final three rows were independently assigned to separate Sol subagents for cold derivation, distinct raw-byte self-review and durable merge without Claude input. Claude confirmed the corrected R5.2g loop shape from the cited bytes, Codex applied it, and AKH directed R5.2g and R5.C closed. Parent R5 remains open on R5.G alone. |
| R5.2a | same file; [`Combat.ApplyAttack.R5.2a-b.evidence.md`](./Combat.ApplyAttack.R5.2a-b.evidence.md) | **done 2026-08-02 by user direction** — complete setup/dispatch slice `$005B1970..$005B213D`; Codex cold derivation and byte-level self-review integrated after correcting the BaseUnits Fear-immunity binding and unsigned invalid-type description; independent Claude derivation/formal review unavailable  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading.** |
| R5.2b | same file and evidence companion | **done 2026-08-02 by user direction** — complete pre-roll slice `$005B213D..$005B2994`; corrected BaseUnits Battlemage-owner binding; two completed ledgers together account for all 54 semantic conditionals, 22 calls and 81 named-field/local writes  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading.** |
| R5.2c | same file; [`Combat.ApplyAttack.R5.2c.evidence.md`](./Combat.ApplyAttack.R5.2c.evidence.md) | **done 2026-08-02 by user direction** — complete rider, per-figure damage, spillover and result-routing slice `$005B2994..$005B32BC`; Codex cold derivation and byte-level self-review integrated while Claude was unavailable; contiguous 18-row ledger, all six zero counts, 55/55 verifier conditionals, 18/18 calls and 43/43 verifier writes  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading.** |
| R5.2d | [`Combat.PerformAttacks.pas`](./Combat.PerformAttacks.pas); [`Combat.PerformAttacks.R5.2d.evidence.md`](./Combat.PerformAttacks.R5.2d.evidence.md) | **done 2026-08-02 by user direction** — complete ranged and melee dispatchers from a Codex-only cold derivation and raw-byte self-review; no Claude work was read or produced; two contiguous ledgers, all six zero counts, 43/43 verifier conditionals, 53/53 calls and 15/15 classified writes  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading.** |
| R5.2e | [`Combat.ResolutionHelpers.pas`](./Combat.ResolutionHelpers.pas); [`Combat.ResolutionHelpers.R5.2e.evidence.md`](./Combat.ResolutionHelpers.R5.2e.evidence.md) | **done 2026-08-02 by user direction** — seven complete resistance, attack-roll, defense-roll, effective-defense and ranged-distance helpers from a Codex-only cold derivation and raw-byte self-review; no Claude derivation/review was available; seven contiguous ledgers, all six zero counts, 58/58 verifier conditionals, 9/9 calls and 3/3 classified writes  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading; two documentation defects fixed.** |
| R5.2f | [`Combat.DamageHandling.pas`](./Combat.DamageHandling.pas); [`Combat.DamageHandling.R5.2f.evidence.md`](./Combat.DamageHandling.R5.2f.evidence.md) | **done 2026-08-02 by user direction** — five complete damage accumulation, healing, living/top-figure and damage-dealing routines from a Codex-only cold derivation and raw-byte self-review; no Claude work was read or produced; five contiguous ledgers, all six zero counts, 23/23 verifier conditionals, 10/10 calls and all 18 persistent writes accounted for  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading.** |
| R5.2g | [`Spells.DamageSpells.pas`](./Spells.DamageSpells.pas); [`Spells.DamageSpells.R5.2g.evidence.md`](./Spells.DamageSpells.R5.2g.evidence.md) | **corrected and closed 2026-08-03 by user direction** — the complete `DamageSpell` and `FirewallEffect` extents retain two whole-routine ledgers, all six zero counts, 46/46 verifier conditionals, 14/14 calls and 60/60 classified writes. Codex's reciprocal review found that `$005C1867 -> $005C1785` had been cited but flattened into a one-shot spill; Claude confirmed the correct pre-tested repeated loop from the bytes, and Codex corrected the source and downstream descriptions. The whole-routine ledger required no alteration. |
| R5.2h | [`Combat.AttackAndWallHelpers.pas`](./Combat.AttackAndWallHelpers.pas); [`Combat.AttackAndWallHelpers.R5.2h.evidence.md`](./Combat.AttackAndWallHelpers.R5.2h.evidence.md) | **done 2026-08-02 by user direction** — ten complete attack-flag, missile-classification, flying-eligibility and wall-helper extents from a Codex-only cold derivation and raw-byte self-review; twenty contiguous ledger rows, all six zero counts, 38/38 semantic conditionals, 11/11 calls and 23/23 classified writes accounted for. **Claude-reviewed 2026-08-03 (R5.C): one semantic-label defect corrected, spanning three `mergeflags` rider labels; the other nine extents had no semantic misreading.** |
| R5.2i | [`Combat.CallClosure.R5.2i.audit.md`](./Combat.CallClosure.R5.2i.audit.md) | **done 2026-08-02** — scope audit classifies all 45 unique semantic callees behind the 137 R5.2a–h call sites and opens nine calculator-relevant gaps as R5.2j–R5.2l |
| R5.2j | [`Spells.DamageSpells.pas`](./Spells.DamageSpells.pas); [`Spells.ApplyDamageSpell.R5.2j.evidence.md`](./Spells.ApplyDamageSpell.R5.2j.evidence.md) | **done 2026-08-02 by user direction** — complete post-`DamageSpell` category adjustment, dealing, AEther Sparks/Ice Bolt state flow and off-combat death routing from a Codex-only cold derivation and separate raw-byte self-review; contiguous 7-row ledger, all six zero counts, 13/13 conditionals, 7/7 calls and 3/3 verifier-classified writes accounted for. **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading.** |
| R5.2k | [`Combat.CallClosureHelpers.pas`](./Combat.CallClosureHelpers.pas); [`Combat.CallClosureHelpers.R5.2k.evidence.md`](./Combat.CallClosureHelpers.R5.2k.evidence.md) | **done 2026-08-02 by user direction** — six complete resistance, spell, damage, distance, Blur-side and healing helpers from a Codex-only cold derivation and separate reverse-order raw-byte self-review, which found no correction; no Claude input was read or used; six contiguous ledgers, all six zero counts, 7/7 conditionals, 1/1 call and 0/0 verifier-classified writes accounted for  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading; one precision entry (constant attestation) applied.** |
| R5.2l | [`Combat.AttackAndWallHelpers.pas`](./Combat.AttackAndWallHelpers.pas); [`Combat.WallStateMapping.R5.2l.evidence.md`](./Combat.WallStateMapping.R5.2l.evidence.md) | **done 2026-08-02 by user direction** — complete 12-slot wall-perimeter mapping and positive-slot state setter from a Codex-only cold derivation and separate raw-byte self-review; no Claude input was read or used; four contiguous ledger rows, all six zero counts, 25/25 conditionals, 1/1 call and 1/1 classified write accounted for  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading.** |
| R5.2m | [`Combat.AmplifiedDamage.pas`](./Combat.AmplifiedDamage.pas); [`Combat.AmplifiedDamage.R5.2m.evidence.md`](./Combat.AmplifiedDamage.R5.2m.evidence.md) | **done 2026-08-02 by user direction** — complete combat-only, non-stacking opposing-owner Amplifier predicate from a Codex-only cold derivation and separate raw-byte self-review; no Claude input was read or used; contiguous 2-row ledger, all six zero counts, 7/7 conditionals, 1/1 call and 0/0 verifier-classified writes  **Claude-reviewed 2026-08-03 (R5.C): no semantic misreading.** |
