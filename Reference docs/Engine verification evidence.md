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
`com2_warlord_1.5.12.9`. Binary identities, paths, and address-drift notes live in the DOS
analysis and the modern analysis index.

## A. DOS version-branch claims

### A32. Shatter in CP 1.60 and CoM 1

Resolved 2026-08-11. MoM 1.31, CP 1.60, and CoM 1 all restrict Shatter admission to enemy
`race < 0x0F`, which includes normal units and heroes but excludes Fantastic units. CP's changed
recompute bytes correct only the two `Grey_*` accounting writes; CoM's recompute consumer has no
additional unit-kind gate. Existing calculator behavior is correct. Owning evidence:
`DOS reconstructed/A32.evidence.md`.

### A33. Unidentified CoM 1 per-realm debuff

The block at `0x90A87` applies −2 To Hit, −3 Defense, and −3 Resistance to creatures of one
realm. It indexes a global array with `realm − 0x10` for realms `0x10`–`0x14` and skips realm
`0x15`. The calculator does not model it. Identification requires tracing
`[0x9274] + 0x1587 + (realm − 0x10)` to its global enchantment or spell.

## B. DOS/shared-formula claims

### B1. To-Hit floor and ceiling (resolved 2026-08-07)

`CMB_AttackRoll` is byte-identical in MoM 1.31, CP 1.60, and CoM 1. For every attack die it tests
`roll >= 8 - to_hit` (`0x98F7B..0x98F84`) and, if that fails, separately accepts `roll == 10`
(`0x98F86..0x98F8A`). `Random(10)` returns 1–10. A natural 10 therefore guarantees a 10% floor in
all three builds, including under Warp Reality; sufficiently high To Hit makes every possible
roll meet the threshold, establishing the 100% ceiling. The engine implements the lower bound as
a natural-roll clause rather than by clamping the intermediate percentage, but the calculator's
10%–100% result boundary is correct. Full reconstruction and review provenance:
`DOS reconstructed/R6.2d.evidence.md`.

### B4. Damage rollover

Resolved for MoM 1.31, CP 1.60 and CoM 1. Conventional and non-Area spell excess crosses figure
boundaries and receives a fresh Defense roll at every new figure. Area damage instead makes one
capped outer attack per current figure and never enters the rollover loop. Existing calculator
behavior is correct. Owning evidence: `DOS reconstructed/B4_B5_B6.evidence.md`.

### B5. Armor Piercing rounding and Immolation exclusion

Resolved for all three DOS builds. Armor Piercing uses signed division by two with truncation
toward zero. Immolation passes Fireball's own `0x1000` flags, whose Armor Piercing bit is clear,
and receives no initiating-attack flag word. The calculator's reachable results were already
correct; its DOS halving expression now states the exact arithmetic. Owning evidence:
`DOS reconstructed/B4_B5_B6.evidence.md`.

### B6. Invulnerability during rollover

Resolved for all three DOS builds. Every conventional or non-Area spell boundary repeats the
fresh Defense roll and then Invulnerability's −2 subtraction. Automatic/Doom damage bypasses both.
Existing calculator behavior is correct. Owning evidence:
`DOS reconstructed/B4_B5_B6.evidence.md`.

### B7. Touch-effect phase mapping

The reconstructed DOS dispatcher has general, melee and ranged attack-attribute masks, but one
shared special-attack modifier byte. It starts with general flags, selects melee flags for melee,
and selects ranged flags for every DOS non-melee attack mode (conventional ranged, Thrown, Breath
and Gaze). The open work is to compare those routes and shared values against all three DOS
rosters, then correct calculator DOS delivery where necessary. Q4 carries the remaining Chaos
Spawn poison-touch case.

Evidence: `MoM binary analysis.md`, touch/effect-dispatch findings.

### B9. Dispel Evil and `UM_UNDEAD`

Resolved by reconstructing `Create_Unit` in MoM 1.31, CP 1.60 and CoM 1. The constructor zeroes
the dynamic unit instance's `mutations` byte for every unit type, and its complete downstream write
set cannot add `UM_UNDEAD`. Natural Death creatures therefore do not receive the created-undead
extra penalty; the calculator's existing classification is correct. Owning evidence:
`DOS reconstructed/B9.evidence.md`; merged source: `DOS reconstructed/unitcalc.c`.

### C1. Animate Dead's DOS ranged bonus

The modern engine is settled: Animated adds +1 to ordinary ranged whenever current
`rangedtype > 0` (`Caster binary/CoM2 binary - unit recalculation.md`, *Unit enchantment effects*). The
corresponding DOS behavior remains unverified, which is the unresolved half of Q11. The former
invalid-version-id defect in this area is fixed and is not part of this dossier.

## D. Modern-engine partial dossiers

### D2. Weapon Immunity eligibility mapping

Resolved 2026-08-11. `EffectiveDefense` adds the configured bonus when the attack is not magical
and the defender's calculated `weaponimmunity` flag is set (`$0059681A..$00596833`). `ApplyAttack`
supplies magic as calculated `EncMagic or magicranged` (`$005B28ED..$005B292A`). There is no
generic-hull or final-unit-type test in those consumers. The magnitude and additive position are
8 for CoM2 and 10 for Warlord.

The calculator now carries calculated `EncMagic` separately from weapon display state and final
Fantastic identity, and combines it with the attack-local `magicranged` classification at the
modern defense boundary. The audit covered every represented source. Identity coverage
distinguishes natural Fantastic, generic Combat Summoned, Chosen, Construct Catapult, Call to
Arms Paladins, all three Chaos Channels variants, Destiny/Apotheosis, Blood Lust, Undead, Animated,
Mystic Surge, Raise Dead and Sanctify Clergy, including the negative Warlord Blood Lust and
non-Clergy Sanctify branches.
Direct coverage includes weapon material, hero standing, Flame Blade/Fiery Blade/Fiery Fury,
Holy Weapon, Wraith Form, Ruler of Underworld, Blazing March, Wall of Fire's garrison grant and
Artificer. Attack-local coverage distinguishes physical ranged and Thrown from magical
conventional ranged, both Breaths and all three Gazes.

The proxy audit corrected three mismatches. Warlord Spirit Link clears `Fantastic` in region `d` but
does not clear the `EncMagic` already granted by region `c`, so its physical attacks still bypass
Weapon Immunity. Base CoM2 Blazing March grants unit-wide `EncMagic`; its Thrown channel therefore
bypasses Weapon Immunity even though that version adds no Thrown strength. King/Ruler of
Underworld suppresses only the grant made by `ApplyMagicWeapons`; an independent source survives
whether it is earlier, such as Warlord Wall of Fire in region `b`, or later, such as Flame Blade.

Evidence: `Caster binary/CoM2 binary - resolution helpers.md`, *Resolution-time modifiers*;
`Caster binary/CoM2 binary - combat flow.md`, *ApplyAttack riders, damage loop and result routing*;
`CoM2 data tables.md`, *Combat constants*.

### D18. Warlord touch-flag placement

Resolved 2026-08-10. The compiled dispatcher admits attack types 1–5 to the full Exorcise →
Stoning Touch → Death Touch → Life Steal → Destruction → Poison package and skips gaze types 6–8.
It begins with general flags and merges ranged flags for conventional ranged, melee flags for
melee and Thrown, and no channel record for either Breath. Warlord `UNITS.INI` supplies intrinsic
Stoning/Death Touch through the general record; Great Gaia Lord and Gambler prove that this reaches
physical ranged. Nature Marionette's global Stoning Touch plus created magical ranged proves there
is no blanket magical-ranged gate.

The apparent exclusion is source placement. Focus Magic moves existing general Stoning/Death
values to melee and clears general/ranged (`UnitCalc.CAS!NOTRUST!+5..+16 ": Disable ranged touch ability when enchanted unit with focus magic :" "SETSTAT(U,AFDeathTouch,0,DEATHT,2);"`). Revenant clears general/ranged
Death Touch and unconditionally writes melee value 0 (`UnitCalcPre.CAS!NOINNERPOWER!+8..+13 ", gain death touch 0 (melee only), regeneration 1, and permanently become undead :" "SETSTAT(U,AFDeathTouch,0,0,2);"`). Because Thrown
uses melee flags, both spell-specific placements fire on melee and Thrown only. The contradictory
manual/helptext statement is retained in `Source discrepancies.md`.

Evidence: `Touch attack trigger matrix.md`; `Caster binary/CoM2 binary - combat flow.md`,
*ApplyAttack riders, damage loop and result routing*.

### D21. Level bonuses for gazes — resolved 2026-08-10

The complete `$005981F8..$00598D86` reconstruction proves that `ApplyLevelBonus` never reads or
writes Death Gaze, Stoning Gaze or Doom Gaze. Modern gazes therefore receive no level strength in
either CoM2 or Warlord. The helper has 21 checked writes across ten other calculated channels;
its only ranged writes target conventional `ranged +$24`. The loader also fills the normal path's
To Defend pointer from `[Hero]ToDefend`, though current shipped values are zero in both sections.

Evidence: `Caster binary/D21.evidence.md`; `Caster binary/Units.RecalculateUnits.pas`,
`ApplyLevelBonus`; `Caster binary/CoM2 binary - unit recalculation.md`, *Experience, Destiny and
the named stat helpers*. The calculator correction is tracked separately by F56.

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
`stats_sequence.js` — two effects writing the same stat at the same phase may still render differently.
