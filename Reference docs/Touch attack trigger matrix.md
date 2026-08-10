# Touch-effect trigger matrix

Which per-hit/touch effects fire on which attack phase, per game version.

DOS sources: `DOS reconstructed/combat.c`, `R6.2b.evidence.md`, `R6.2c.evidence.md`,
`MoM binary analysis.md`, and the versioned roster exports. Modern sources: `CoM2 manual.txt`,
`CoM2 helptext.TXT`, current
`Warlord manual v1.5.12.7.html`, `Unit rosters/Warlord mod unit data/HELP.TXT`, Warlord
`UnitCalc.CAS:509-520`, and `Caster.exe` `@Combat@ApplyAttack` R5.2c
(`$005B2994..$005B3295`). The executable covers both CoM2 and Warlord; Warlord's scripts can
move flags between the global, melee and ranged `AttackFlagsT` records before that common
dispatcher runs.

Cells are: ✓ = fires when the selected attack-flags record carries the effect; ✗ = the
dispatcher excludes it.

## DOS (MoM 1.31, CP 1.60 and CoM 1)

`BU_ProcessAttack` starts each admitted call with the unit's common attack flags. It then merges
the melee record for a melee call, or the same ranged record for every non-melee call: ordinary
ranged, Thrown, Fire Breath, Lightning Breath, Stoning Gaze, Multiple Gaze and Death Gaze. The
dispatcher has no separate per-rider attack-type gate.

| Stored touch value | Melee | Thrown | Breath | Ranged | Gaze |
|---|:---:|:---:|:---:|:---:|:---:|
| Common / roster | ✓ | ✓ | ✓ | ✓ | ✓ |
| Melee weapon record | ✓ | **✗** | **✗** | **✗** | **✗** |
| Ranged weapon record | **✗** | ✓ | ✓ | ✓ | ✓ |

The shipped touch-bearing roster fields are common flags. Chaos Spawn therefore carries its
common Poison 4 into Multiple Gaze; magical-ranged Life Steal carriers such as Demon Lord and
Necromancer likewise use their common value. Item helpers write a power only to the eligible
weapon record. When Stoning Touch comes from the selected channel record its save modifier gains
−1, and channel-carried Death Touch gains −3, after the common and channel records merge.

MoM 1.31 returns from `BU_ProcessAttack` when the selected call's live attack strength is zero,
discarding its riders as well as ordinary damage. CP 1.60 and CoM 1 patch that conditional abort
away, so a call already admitted by the caller still dispatches merged flags at zero strength.

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

The common dispatcher has the same no-gaze rule and no physical-versus-magical ranged gate.
Innate unit abilities in `UNITS.INI` enter the general flags record, so they merge into every
non-Gaze attack. Great Gaia Lord (`[261]`, physical ranged type 12) and Gambler
(`[273]`, sling/missile) are direct
physical-ranged carriers. Nature Marionette writes Stoning Touch to the general record while also
creating magical ranged (`UnitCalcPre.CAS:104,263`), proving magical ranged is not generically
excluded either.

Two represented spells deliberately change placement. Focus Magic saves each existing general
Stoning/Death value, clears general and ranged, and writes the saved value to melee
(`UnitCalc.CAS:509-520`). Revenant clears general/ranged Death Touch and writes 0 to melee
(`UnitCalcPre.CAS:1757-1762`). `ApplyAttack` selects melee flags for both melee and Thrown, so both
spells' relocated touch fires on those two attacks and not on Breath or conventional ranged.

| Effect | Melee | Thrown | Breath | Ranged (physical) | Magical Ranged | Gaze |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Poison | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Stoning Touch (general/innate) | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Death Touch (general/innate) | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Stoning/Death moved by Focus Magic | ✓ | ✓ | **✗** | **✗** | **✗** | **✗** |
| Death Touch 0 from Revenant | ✓ | ✓ | **✗** | **✗** | **✗** | **✗** |
| Life Steal | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Exorcise | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Destruction | ✓ | ✓ | ✓ | ✓ | ✓ | **✗** |
| Bloodsucker | ✓† | ✓† | ✓† | ✓† | ✓† | ✓† |

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
2. **Bloodsucker trigger and healing (F27).** The engine tests the sum of all result buckets only
   after ordinary damage, Immolation and every rider have been merged, then passes the configured
   healing amount independently of target overkill. The calculator tests its pre-rider base
   distribution and caps healing to the bonus damage that fits inside remaining HP.
3. **Destruction roll count (F26).** The calculator resolves one roll for the whole phase; the
   compiled block runs once per attacking figure.

## Source notes

- CoM2 and Warlord helptext describe weapon-granted touches as applying only to attacks performed
  by that weapon type. That is record placement, not a dispatcher branch.
- Warlord's current Stoning/Death helptext and manual changelog claim a magical-ranged exclusion.
  The executable and executing scripts contradict that as a blanket rule; the conflict is recorded
  in `Source discrepancies.md`.
- Warlord Missile Immunity help explicitly says it does not stop Poison, Stoning Touch, Death
  Touch or Life Steal carried by ranged attacks.
- Dispel Evil is the older name; the modern `AttackFlagsT` member is `exorcise`. The compiled
  dispatcher gives Exorcise no melee-only restriction, but it does share the no-gaze gate.
- Immolation is separate from `AttackFlagsT`; R5.2b gates it explicitly on melee at
  `$005B24D8..$005B2535`.
