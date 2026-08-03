# Touch-effect trigger matrix — CoM2 vs Warlord

Which per-hit/touch effects fire on which attack phase, per game version.

Sources: `CoM2 manual.txt`, `CoM2 helptext.TXT`, current
`Warlord manual v1.5.12.6.html`, `Unit rosters/Warlord mod unit data/HELP.TXT`, Warlord
`UnitCalc.CAS:509-520`, and `Caster.exe` `@Combat@ApplyAttack` R5.2c
(`$005B2994..$005B3295`). The executable covers both CoM2 and Warlord; Warlord's scripts can
move flags between the global, melee and ranged `AttackFlagsT` records before that common
dispatcher runs.

Cells are: ✓ = fires when the selected attack-flags record carries the effect; ✗ = the
dispatcher excludes it.

## CoM2 (compiled dispatcher)

The six merged riders run for attack types 1–5: conventional ranged, melee, Fire Breath,
Lightning Breath and Thrown. The gate at `$005B2994..$005B299D` skips the complete package for
attack types 6–8, so none accompanies Doom, Death or Stoning Gaze. Hero-item touches still reach
only the weapon record to which they were written.

| Effect | Melee | Thrown | Breath | Ranged (physical) | Magical Ranged | Gaze |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Poison | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Stoning Touch | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Death Touch | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Life Steal | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Exorcise | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Destruction | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Bloodsucker | — n/a in base CoM2 — |

## Warlord (script plus compiled dispatcher)

The common dispatcher has the same no-gaze rule. Warlord's current helptext says Stoning Touch
and Death Touch do not apply to **Magic Ranged** attacks. The executing Focus Magic block
implements its case by moving both flags from global/ranged to melee (`UnitCalc.CAS:509-520`).
The physical-ranged column remains provisional pending D18's complete flag-placement audit; the
calculator's blanket physical-and-magical block is broader than the current prose and located
script.

| Effect | Melee | Thrown | Breath | Ranged (physical) | Magical Ranged | Gaze |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Poison | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Stoning Touch | ✓ | ✓ | ✓ | ✓* | **✗** | **✗** |
| Death Touch | ✓ | ✓ | ✓ | ✓* | **✗** | **✗** |
| Life Steal | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Exorcise | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Destruction | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Bloodsucker | ✓† | ✓† | ✓† | ✓† | ✓† | ✓† |

`*` Pending the remaining D18 record-placement audit.

`†` Bloodsucker is not one of the six touch riders. It triggers after result routing whenever an
`ApplyAttack` call produced any positive result, so a successful gaze result can trigger it too.
Warlord's shipped settings add 2 damage and heal 2; the executable loads those as separate
moddable values. It triggers once per `ApplyAttack` call, not once per attacking figure.

## Exact compiled rider order and gates

| Rider | Extent | Immunity / eligibility gate | Result |
|---|---:|---|---|
| Exorcise | `$005B29A3..$005B2ADC` | Fantastic; no Magic Immunity or Spell Lock; Undead worsens modifier by 3 | failed Life save adds one `HpPerFigure` to field 0 |
| Stoning Touch | `$005B2ADC..$005B2BA3` | no Magic or Stoning Immunity | failed Nature save adds one `HpPerFigure` to field 0 |
| Death Touch | `$005B2BA3..$005B2C6B` | no Magic or Death Immunity | failed Death save adds one `HpPerFigure` to field 8 |
| Life Steal | `$005B2C6B..$005B2D42` | no Magic or Death Immunity | returned magnitude enters field 4 and heals outside simulation |
| Destruction | `$005B2D42..$005B2DC8` | no Magic Immunity | failed Chaos save assigns 150 to field 0 |
| Poison | `$005B2DC8..$005B2E6F` | no Poison Immunity | `poisonvalue` realm-0 saves, one ordinary damage per failure |

All six rows are inside the attacker-figure loop. Destruction therefore makes one whole-unit
save-or-die roll per attacking figure despite its assignment-style result; this is calculator
defect F26.

## Current calculator discrepancies

1. **Gazes (F25).** `gazeTouchParams` enables all six riders alongside every active gaze, while
   the modern engine skips the whole package for attack types 6–8.
2. **Warlord physical ranged (remaining D18 audit).** `warlordRangedTouchBlocked` blocks Stoning
   and Death Touch for physical and magical ranged alike. Current helptext names Magic Ranged,
   and the located Focus Magic script implements that case; finish the record-placement audit
   before changing this half.
3. **Bloodsucker trigger and healing (F27).** The engine tests the sum of all result buckets only
   after ordinary damage, Immolation and every rider have been merged, then passes the configured
   healing amount independently of target overkill. The calculator tests its pre-rider base
   distribution and caps healing to the bonus damage that fits inside remaining HP.
4. **Destruction roll count (F26).** The calculator resolves one roll for the whole phase; the
   compiled block runs once per attacking figure.

## Source notes

- CoM2 and Warlord helptext describe weapon-granted touches as applying only to attacks performed
  by that weapon type. That is record placement, not a dispatcher branch.
- Warlord Missile Immunity help explicitly says it does not stop Poison, Stoning Touch, Death
  Touch or Life Steal carried by ranged attacks.
- Dispel Evil is the older name; the modern `AttackFlagsT` member is `exorcise`. The compiled
  dispatcher gives Exorcise no melee-only restriction, but it does share the no-gaze gate.
- Immolation is separate from `AttackFlagsT`; R5.2b gates it explicitly on melee at
  `$005B24D8..$005B2535`.
