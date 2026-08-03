# R5.2i call-closure audit

R5.2a–R5.2h deliberately reconstructed named target extents rather than recursively following
every call. This audit closes that scope boundary. It classifies every semantic callee named by
the seven byte-backed call inventories and opens address-bounded derivation rows for every
calculator-relevant target that does not yet have a complete source-shaped reconstruction.

This document is a **scope audit, not a derivation**. A classification below does not claim the
body of a newly scoped routine has been reconstructed.

## Inputs and accounting

The pinned executable's MD5 was rechecked as `540c22dbd701fb2caa95bd3ecccd9447` before resolving
the target symbols and extents. The call-site evidence comes from these completed artifacts:

| Tag | R5.2 source | Semantic call sites |
|---|---|---:|
| AB | [`Combat.ApplyAttack.R5.2a-b.evidence.md`](./Combat.ApplyAttack.R5.2a-b.evidence.md), *Semantic calls* | 22 |
| C | [`Combat.ApplyAttack.R5.2c.evidence.md`](./Combat.ApplyAttack.R5.2c.evidence.md), *Calls* | 18 |
| D | [`Combat.PerformAttacks.R5.2d.evidence.md`](./Combat.PerformAttacks.R5.2d.evidence.md), *Semantic calls* | 53 |
| E | [`Combat.ResolutionHelpers.R5.2e.evidence.md`](./Combat.ResolutionHelpers.R5.2e.evidence.md), *Semantic calls* | 9 |
| F | [`Combat.DamageHandling.R5.2f.evidence.md`](./Combat.DamageHandling.R5.2f.evidence.md), *Semantic calls* | 10 |
| G | [`Spells.DamageSpells.R5.2g.evidence.md`](./Spells.DamageSpells.R5.2g.evidence.md), *complete semantic call inventory* | 14 |
| H | [`Combat.AttackAndWallHelpers.R5.2h.evidence.md`](./Combat.AttackAndWallHelpers.R5.2h.evidence.md), *Semantic calls* | 11 |
| **Total** | | **137** |

Repeated calls collapse to **45 unique semantic callees**. The classification below accounts for
all 45 exactly once: 25 reconstructed in R5.2, 5 reconstructed in R5.1, 3 language-runtime
routines, 1 diagnostic routine, 2 calculator-irrelevant state/presentation routines, and 9 newly
scoped calculator-relevant routines.

## Already reconstructed in R5.2

| Callee | Direct-call evidence | Owning reconstruction |
|---|---|---|
| `@Units@TopFigureDamage` | AB, D, G | R5.2f |
| `@Combat@RangedPenalty` | AB | R5.2e |
| `@Units@Ismissileranged` | AB | R5.2h |
| `@Units@ResistanceRoll` | AB, C | R5.2e |
| `@Combat@mergeflags` | AB | R5.2h |
| `@Units@canattackflier` | AB | R5.2h |
| `@Spells@DamageSpell` | AB | R5.2g |
| `@Combat@AddDamage` | AB | R5.2f |
| `@Units@LivingFigures` | AB, D, F, G | R5.2f |
| `@Combat@HasWall` | AB | R5.2h |
| `@Combat@Insidewalls` | AB | R5.2h |
| `@Combat@GetWallState` | AB, H | R5.2h |
| `@Units@EffectiveDefense` | AB, G | R5.2e |
| `@Combat@Combatheal` | C | R5.2f |
| `@Units@AttackRoll` | C, G | R5.2e |
| `@Units@DefenseRoll` | C, G | R5.2e |
| `@Combat@CrushWall` | D | R5.2h |
| `@Combat@destroywall` | D | R5.2h |
| unnamed coordinate overload `$005B3ECC` | D, H | R5.2h |
| `@Combat@HasWallOfFire` | D | R5.2h |
| `@Spells@FirewallEffect` | D | R5.2g |
| `@Combat@ApplyAttack` | D | R5.2a–R5.2c |
| `@Combat@Dealdamage` | D | R5.2f |
| `@Units@GetEffectiveResistance` | E | R5.2e |
| `@Combat@CombatDistanceUnit` | E | R5.2e |

## Already reconstructed in R5.1

| Callee | Direct-call evidence | Owning reconstruction |
|---|---|---|
| `@Units@Ismagicalranged` | AB, E | R5.1c-a |
| `@Heroes@HeroBonus` | AB | R5.1c-c |
| `@Units@HpPerFigure` | AB, C, D, F, G | R5.1c-b |
| `@Units@RecalculateUnits` | D | R5.1a–R5.1c |
| `@Game@Min` | F, H | R5.1c-b |

## Runtime, diagnostic, and calculator-irrelevant calls

| Callee | Evidence | Classification and reason |
|---|---|---|
| `@System@@ROUND` | C | Delphi language runtime. R5.2c quotes the complete floating-point expression and the call site; no game routine is hidden behind it. |
| `@System@Random` | C, E | Delphi language runtime PRNG. The callers preserve each bound, comparison, retry and call order. |
| `@System@@TRUNC` | G | Delphi language runtime. R5.2g quotes the complete extended-real multiply, constant bytes and truncation call. |
| `@Game@Rederror` | AB | Diagnostic only, reached for an invalid attack-type selector. It does not participate in any valid calculator path. |
| `@Combatmovement@CombatGetMoveMatrix` | D | Calculator-irrelevant post-resolution movement refresh. It runs after damage dealing and action-state writes and cannot alter the resolved damage record. |
| `@Map@cityontile` | H | Calculator-irrelevant world-state lookup. The calculator accepts the contextual City Walls/Wall of Fire state directly and does not derive a combat city from plane and world coordinates; no damage arithmetic lies in this lookup. |

`@Combat@ctws` and `@Combat@SetWallState` are **not** put in the last category. Unlike the world
city lookup, they select and mutate the particular combat-wall segment that `GetWallState` reads
before `EffectiveDefense`; they therefore remain inside the calculator-visible wall-resolution
closure and are scoped below.

## Newly scoped calculator-relevant routines

| Callee and extent | Direct-call evidence | Why it remains in the damage closure | New row |
|---|---|---|---|
| `@Spells@ApplyDamageSpell`, `$005C1974..$005C1C45` | G, call `$005C1C9D` | Wraps `DamageSpell`, modifies the returned record, deals it, and performs spell-specific unit-state post-processing. R5.2g expressly left this post-processing open. | R5.2j |
| `@Wizard@HasGlobalEnchantment`, `$00590DAC..$00590E07` | E, call `$00595D5F` | Supplies the Fate Mastery predicate inside `ResistanceRoll`; its result can cause the second resistance roll. | R5.2k — [complete evidence](./Combat.CallClosureHelpers.R5.2k.evidence.md) |
| `@Units@HasTeleMerge`, `$005952DC..$00595352` | G, call `$005C1C52` | Gates Wall of Fire damage before `ApplyDamageSpell`. | R5.2k — [complete evidence](./Combat.CallClosureHelpers.R5.2k.evidence.md) |
| `@Units@DeadFigures`, `$005964F8..$00596553` | F, call `$0059658F` | Feeds `TopFigureDamage`, hence the wounded-figure spill and cap logic. | R5.2k — [complete evidence](./Combat.CallClosureHelpers.R5.2k.evidence.md) |
| `@Combat@CombatDistance`, `$005BB1CC..$005BB232` | E, call `$005BB2EE` | Supplies the distance consumed by `CombatDistanceUnit` and `RangedPenalty`. | R5.2k — [complete evidence](./Combat.CallClosureHelpers.R5.2k.evidence.md) |
| `@Combat@CGADEnemy`, `$005BD25C..$005BD284` | C, call `$005B2F26` | Selects the combat-global side whose Blur state removes hits. R5.2c traced its effect, but its body is not yet in an indexed source-shaped reconstruction with a coverage ledger. | R5.2k — [complete evidence](./Combat.CallClosureHelpers.R5.2k.evidence.md) |
| `@Game@CanHealNaturally`, `$005ECB4C..$005ECBC4` | F, calls `$005B12D4`, `$005B152D` | Controls which damage categories `Combatheal` may remove and how overheal books damage on dead figures. | R5.2k — [complete evidence](./Combat.CallClosureHelpers.R5.2k.evidence.md) |
| `@Combat@ctws`, `$005BB0D0..$005BB1CC` | H, call `$005BB74A` | Maps combat coordinates to the wall-state slot read by `GetWallState` and written by `SetWallState`; that state selects intact versus broken City Walls defense. | R5.2l — [complete evidence](./Combat.WallStateMapping.R5.2l.evidence.md) |
| `@Combat@SetWallState`, `$005BB788..$005BB7CE` | H, call `$005BB7F5` | Applies `destroywall`'s state transition before the attack later queries the wall state for extra Defense. | R5.2l — [complete evidence](./Combat.WallStateMapping.R5.2l.evidence.md) |

The exclusive end addresses above come from the pinned build's TD32 procedure lengths. Alignment
bytes between adjacent TD32 extents are excluded, matching the existing R5 convention.

R5.2k subsequently completed all six predicate/formula rows in
[`Combat.CallClosureHelpers.pas`](./Combat.CallClosureHelpers.pas), with durable proof in
[`Combat.CallClosureHelpers.R5.2k.evidence.md`](./Combat.CallClosureHelpers.R5.2k.evidence.md).
Its six contiguous ledgers account for 7/7 semantic conditionals, 1/1 semantic call and 0/0
verifier-classified writes; a separate reverse-order raw-byte self-review found no correction,
and no Claude derivation, review, or output was read or used.

R5.2l subsequently completed both wall-state rows in
[`Combat.AttackAndWallHelpers.pas`](./Combat.AttackAndWallHelpers.pas). Their new call closure is
self-contained: `ctws` has no semantic callee, and `SetWallState` calls only that reconstructed
mapper plus a compiler-only range-error helper.

## Closure result

R5.2i is complete: every semantic callee in R5.2a–R5.2h has one classification and all nine
calculator-relevant gaps have target-only, address-bounded derivation rows. This closes the scope
audit only. At audit completion, R5.2 remained in progress until R5.2j–R5.2l were derived, their
own semantic callees classified, and the ordinary R5 review gates satisfied.

Verified: Codex 2026-08-02, scope audit over the seven completed byte-backed call inventories;
target identities and exclusive extents rechecked against the pinned executable's TD32 symbols.

### Subsequent closure extension

R5.2j later completed `ApplyDamageSpell` and classified all seven of its semantic calls. Four
targets were already reconstructed, `UnitDies` is post-resolution world-state cleanup on a unit
already marked dead, and `@Combat@AmplifiedDamage` is calculator-relevant because its Boolean
result controls a one-point damage-record adjustment. That helper was scoped target-only as
R5.2m, `$005BEB28..$005BEC6F`, and is now reconstructed in
[`Combat.AmplifiedDamage.pas`](./Combat.AmplifiedDamage.pas), with durable proof in
[`Combat.AmplifiedDamage.R5.2m.evidence.md`](./Combat.AmplifiedDamage.R5.2m.evidence.md).
All rows opened by this audit and its R5.2j extension are now complete. The aggregate R5.2 row
is closed in `Calculator/BACKLOG.md`; parent R5 remains open on its two complete-reconstruction
review rows.
