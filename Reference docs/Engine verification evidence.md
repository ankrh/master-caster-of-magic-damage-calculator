# Engine verification evidence

Unresolved or partially resolved evidence dossiers for calculator behavior that still rests on
prose, inference, or an incomplete engine read. This file records the claim, the evidence already
in hand, and the missing proof. It is not a backlog: priority, cost, status, blockers, and next
actions live only in `Calculator/BACKLOG.md`.

The IDs are stable historical identifiers. Sections A–C concern the DOS `WIZARDS.EXE` builds
(MoM 1.31, MoM CP 1.60, and CoM 1); section D concerns the modern engine (CoM2 and Warlord).
Resolved findings belong in `MoM binary analysis.md`, the modern subsystem documents indexed by
`Caster binary/CoM2 binary analysis.md`, or `CoM2 data tables.md` and are deliberately not
repeated here.

Calculator version IDs are `mom_1.31`, `mom_cp_1.60.00`, `com_6.08`, `com2_1.05.11`, and
`com2_warlord_1.5.12.6.2`. Binary identities, paths, and address-drift notes live in the DOS
analysis and the modern analysis index.

## A. DOS version-branch claims

### A31. MoM level-bonus magnitudes

`getLevelBonuses` (`Calculator/combat.js`). CoM's complete 5×7 table at `0x8FACA` matches the
calculator. MoM's unrolled chain at `0x8F881`–`0x8FB3E` has the expected shape—To Hit increments
at the Elite, Ultra-Elite, and Champion thresholds, with resistance and HP changes around the
same thresholds—but its six increment sites have not been decoded exhaustively. The calculator's
+10/+20/+30% To Hit ladder, resistance steps up to +5, and HP steps therefore remain unconfirmed.

Evidence: `MoM binary analysis.md`, *Level bonuses*.

### A32. Shatter in CP 1.60 and CoM 1

- CP 1.60 changes the code immediately after both of 1.31's Shatter writes:
  `0x90AE6`–`0x90AF9` after `melee = 1` at `0x90AE5`, and `0x90B08`–`0x90B1B` after
  `ranged = 1` at `0x90B07`. These are two of only five changed regions in the complete
  recompute; their effect has not been decoded.
- CoM 1's Shatter block at `0x907DC`–`0x90827` was read for position, not eligibility. The
  calculator restricts Shatter to normal units and heroes outside Warlord, but no equivalent
  unit-type gate has been established. The binary caps at 1 (`cmp …, 1 / jle`), while the
  calculator sets a positive value to 1; those shapes agree for reachable values.

Evidence: `MoM binary analysis.md`, *Warp Creature runs early*.

### A33. Unidentified CoM 1 per-realm debuff

The block at `0x90A87` applies −2 To Hit, −3 Defense, and −3 Resistance to creatures of one
realm. It indexes a global array with `realm − 0x10` for realms `0x10`–`0x14` and skips realm
`0x15`. The calculator does not model it. Identification requires tracing
`[0x9274] + 0x1587 + (realm − 0x10)` to its global enchantment or spell.

## B. DOS/shared-formula claims

### B1. To-Hit floor and ceiling

`clampPct` and the To-Hit modifier sites in `Calculator/combat.js` model a 10%–100% clamp.
`CMB_AttackRoll` establishes a natural-10 hit floor for MoM 1.31, but that is not necessarily the
same operation as clamping the displayed chance. The 100% ceiling is unestablished, as are both
bounds in CP 1.60 and CoM 1. This is the evidence dossier behind Q3.

### B4. Damage rollover

`singleAttackDmgDist` rolls Defense again for each new figure reached by excess damage;
`areaPerFigureDmgDist` does not roll damage over. These two foundational shapes have not been
verified against the DOS binary. ReMoM names `BU_ApplyDamage` as the likely entry point.

### B5. Armor Piercing rounding and Immolation exclusion

`computeDefenseProfile` halves eligible Defense with floor rounding and never applies Armor
Piercing to Immolation. The rounding direction and the Immolation exclusion are separate
assumptions currently sourced to another calculator rather than the game.

### B6. Invulnerability during rollover

`singleAttackDmgDist` subtracts Invulnerability inside the per-figure rollover loop, so the bonus
reduces every chained Defense roll. That repeated application has not been established from the
engine.

### B7. Touch-effect phase mapping

The MoM 1.31 dispatcher is data-driven: it reads the unit's effect fields without a phase gate,
and CoM 1 has the same shape. The calculator hard-codes phase eligibility per effect. The open
work is to compare those hard-coded routes with the actual DOS rosters; Q4 carries the remaining
Chaos Spawn poison-touch question.

Evidence: `MoM binary analysis.md`, touch/effect-dispatch findings.

### B9. Dispel Evil and `UM_UNDEAD`

MoM 1.31 applies −4, plus another −5 when the target unit type carries `UM_UNDEAD`. The calculator
uses a narrower created-undead test (Undead, Animate Dead, or Revenant state). Whether natural
Death creatures carry the mutation flag has not been checked; if they do, the calculator's
restriction is wrong.

### C1. Animate Dead's DOS ranged bonus

The modern engine is settled: Animated adds +1 to ordinary ranged whenever current
`rangedtype > 0` (`Caster binary/CoM2 binary - unit recalculation.md`, *Unit enchantment effects*). The
corresponding DOS behavior remains unverified, which is the unresolved half of Q11. The former
invalid-version-id defect in this area is fixed and is not part of this dossier.

## D. Modern-engine partial dossiers

### D2. Weapon Immunity eligibility mapping

The engine-side rule is now known. `EffectiveDefense` adds the configured bonus when the attack is
not magical and the defender's calculated `weaponimmunity` flag is set
(`$0059681A..$00596833`). `ApplyAttack` supplies magic as calculated `EncMagic or magicranged`
(`$005B28ED..$005B292A`). There is no generic-hull special case in those consumers.

What remains is a calculator-mapping audit: `weaponImmunityApplies` approximates the engine flag
with attacker weapon, unit type, and a MoM-1.31-only generic exception. Confirm that this proxy is
equivalent for every reachable modern transformation, especially script-derived type or magic
changes. The magnitude and additive position are resolved at 8 for CoM2 and 10 for Warlord.

Evidence: `Caster binary/CoM2 binary - resolution helpers.md`, *Resolution-time modifiers*;
`Caster binary/CoM2 binary - combat flow.md`, *ApplyAttack riders, damage loop and result routing*;
`CoM2 data tables.md`, *Combat constants*.

### D17. Destruction in the older engines

CoM2/Warlord are settled: Destruction is a Chaos-realm resistance roll, uses the stored modifier,
is skipped only by Magic Immunity, and assigns 150 damage on failure once per attacking figure.
Only the claim that the effect is absent from MoM 1.31, CP 1.60, and CoM 1 remains for the R6 DOS
read.

Evidence: `Caster binary/CoM2 binary - combat flow.md`, *ApplyAttack riders, damage loop and
result routing*.

### D18. Warlord touch-flag placement

The compiled dispatcher is settled: attack types 1–5 execute the full Exorcise → Stoning Touch →
Death Touch → Life Steal → Destruction → Poison package; gaze types 6–8 skip it. What remains is
Warlord's source-record placement before that dispatcher. `UnitCalc.CAS:509-520` moves Stoning and
Death Touch flags when Focus Magic creates magical ranged, while the help text says those effects
do not apply to magical ranged. The audit must distinguish that script-driven selection from the
calculator's blanket `warlordRangedTouchBlocked`, which also blocks physical ranged.

Evidence: `Touch attack trigger matrix.md`; `Caster binary/CoM2 binary - combat flow.md`,
*ApplyAttack riders, damage loop and result routing*.

### D21. Level bonuses for gazes

Warp ordering and Warp's lack of gaze writes are resolved. The remaining question is whether
`ApplyLevelBonus` adds any strength to a modern gaze. `Levelbonus.INI` has columns for Attack,
Missile Ranged, Magic Ranged, Thrown, Breath, Defense, Resistance, HP, MP, Hit, and To Defend, but
none for gazes; any surviving gate is therefore in the helper itself. The calculator currently
gives an ordinary CoM2 gaze the ranged column and Doom Gaze no level bonus.

Evidence: `CoM2 data tables.md`, *Level bonuses*;
`Caster binary/CoM2 binary - unit recalculation.md`, *Experience, Destiny and the named stat
helpers*.

### D22. Plain versus gold stat icons on the unit display

CoM2 draws a unit's stat row as icon pips and distinguishes two kinds of bonus: some additions
render as ordinary pips indistinguishable from the roster base, others render gold. The rule
selecting between them is not yet derived, and no calculator-side classification of modifier
sources exists.

Two anchors, both in-game observation (AKH, 2026-08-03), not yet binary-confirmed:
- experience level bonuses render as **ordinary** pips;
- node aura bonuses render as **gold**.

These are consistent with a permanent-property versus temporary-effect split, but do not establish
it: node aura is both temporary and positional, so either property alone explains it. A tier
assignment for every modifier source requires reading the display path in `Caster.exe` rather than
extrapolating from two points.

Note that the tier is a *display* classification and need not follow the transform sequence in
`stats.js` — two effects writing the same stat at the same phase may still render differently.
