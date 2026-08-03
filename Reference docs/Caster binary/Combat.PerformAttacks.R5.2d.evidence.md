# R5.2d ranged/melee dispatcher reconstruction evidence

Durable evidence for `@Combat@PerformRangedAttack` (`$005B3338..$005B35A2`) and
`@Combat@PerformMeleeAttack` (`$005B35A4..$005B3ECB`) in the pinned `Caster.exe`. The complete
source-shaped body is in [`Combat.PerformAttacks.pas`](./Combat.PerformAttacks.pas).

Codex derived and byte-level self-reviewed both extents as a single agent on 2026-08-02 at the
user's direction. No Claude derivation or review was read or produced.

## ABI and field evidence

- TD32 names the two procedures and locals: ranged `dam`, `i`, `j`, `au`, `du`; melee `dam`,
  `dam2`, `dam3`, `i`, `j`, `au`, `du`, plus one compiler-generated local at -$14.
- The result-record ABI is established at `Dealdamage`: `$005B41C6 894DF4` stores ECX as TD32
  local `undead`, `$005B41C9 8955F8` stores EDX as `normal`, and stack slot +$0C is parameter
  `irrec`. Every dispatcher call loads result +$04 into ECX, +$08 into EDX and pushes +$00 as
  `irrec`.
- Calculated-unit offset +$517 is `EnchantmentFlags[15]`: the array begins at +$509, so one-based
  element 15 is +$517; TD32 constant `EncHaste` is 15.
- `FirstStrikeCap` is the exact UTF-16 key at `$0063A0D8`; the loader stores its value through
  pointer global `$00708E58` at `$00633444..$0063344A`. Both shipped CoM2 and Warlord
  `MODDING.INI` tables set it to 999.
- Combat-state field +$44E8 is named by `@Castercore@CombatSelectedUnit`: its accessor reads the
  same field at `$0064313D 8B80E8440000` that melee passes to `CombatGetMoveMatrix` at
  `$005B3EB5 8B80E8440000`.

## Dispatcher findings

The exact melee damage phase order is Wall of Fire, attacker Stoning/Death/Doom Gazes, defender
Stoning/Death/Doom Gazes, attacker Lightning Breath, Fire Breath, Thrown, then melee. Wall
crushing occurs between Wall of Fire and the first gaze but is not unit damage.

Haste sets the attacker repeat count to two before every attacker gaze and attacker
breath/Thrown loop. Defender retaliation gazes and the counterattack remain single. Ranged uses
the same two-pass Haste count, but each pass is gated on current base-record ammo.

A qualifying First Strike is resolved and dealt immediately (`$005B3B32`), after which all three
result fields are zeroed (`$005B3B37..$005B3B43`) and `$005B3B46 EB21 jmp $005B3B69` **skips the
ordinary attacker block at `$005B3B48..$005B3B64`**. The two paths therefore differ:

- no admitted First Strike — the main slot holds a real `LivingFigures`/`ApplyAttack` result;
- admitted First Strike — the main slot holds a zero placeholder, its damage already dealt.

The optional Haste result and the counterattack result are computed on both paths, and the tail
deals whatever the three slots hold in the order main, counter, Haste. Each
`ApplyAttack` call performs its own Cause Fear rolls, so Hasted melee strikes do not share one
fear sample.

## Byte-level self-review

- Both required whole-routine inbound scans reported no straddling outer branch over either
  assigned extent.
- Every branch target below was opened and classified by the instructions at the target, not by
  the source-side test alone.
- The First Strike gate was followed through all three exits. `$005B3B00 7F46` rejects only
  `HpPerFigure(du) - TopFigureDamage(du) > FirstStrikeCap`; equality receives First Strike.
- The result-resolution sequence was re-read from `$005B3B48` through `$005B3BEE`. All main,
  Haste and counter `ApplyAttack` calls precede all three tail `Dealdamage` calls.
- The full signed movement arithmetic was retained: `$005B3C7F D1FA`, `$005B3C81 7903`,
  `$005B3C83 83D200` implement signed `div 2`; `$005B3CFE 2501000080`, `$005B3D03 7905`,
  `$005B3D05 48`, `$005B3D06 83C8FE`, `$005B3D09 40` implement signed `mod 2`.
- The raw write sites were compared with the record layout, including the current/base split:
  strengths, Haste and owner tests use `Units`; ammo, movement, attack count, death and
  suppression use `BaseUnits` at their observed sites. The second-attack odd-movement debit is
  the base-record write `$005B3DAC 66898491921CAC01`.

No reconstruction defect survived the raw-byte audit.

## Prose cross-check

The co-equal CoM2 prose sources are consistent with the dispatcher findings. Helptext's First
Strike entry says it acts after breath, Thrown and gaze attacks (`CoM2 helptext.TXT:2101`), while
the manual says Haste makes the unit attack twice each time it attacks and gives the enemy only
one retaliation (`CoM2 manual.txt:3672-3678`). Helptext likewise describes Haste as doubling the
number of attacks (`CoM2 helptext.TXT:758,2321`). None specifies a conflicting order among Wall
of Fire, gazes and breath/Thrown, so there is no prose discrepancy to register.

## Semantic conditional branches

Every row quotes the encoded jump, its target, and what begins at the target.

### `PerformRangedAttack`

| Jump | Target | Target contents |
|---|---:|---|
| `$005B3352 745B je` | `$005B33AF` | initialize attack-repeat count; wall not crushed |
| `$005B33E2 7407 je` | `$005B33EB` | enter repeat-loop setup with count one |
| `$005B33F0 0F8E3F010000 jle` | `$005B3535` | final movement/action-state writes |
| `$005B342C 0F8EF7000000 jle` | `$005B3529` | advance repeat loop; no ammo |
| `$005B34FA 7F2D jg` | `$005B3529` | advance repeat loop; ammo remains and ranged type stays set |
| `$005B352F 0F85CBFEFFFF jne` | `$005B3400` | next ammo-gated pass |

### `PerformMeleeAttack`

| Jump | Target | Target contents |
|---|---:|---|
| `$005B3620 0F84A6000000 je` | `$005B36CC` | wall-crushing block; target tile fails first wall predicate |
| `$005B3683 7547 jne` | `$005B36CC` | wall-crushing block; attacker tile fails crossing condition |
| `$005B368C 743E je` | `$005B36CC` | wall-crushing block; no Wall of Fire |
| `$005B36C2 7408 je` | `$005B36CC` | wall-crushing block; attacker belongs to defender owner |
| `$005B36D6 745B je` | `$005B3733` | cache calculated attacker; no wall destruction |
| `$005B3772 7407 je` | `$005B377B` | attacker Stoning Gaze gate with repeat count one |
| `$005B3782 744E je` | `$005B37D2` | attacker Death Gaze gate; no Stoning Gaze |
| `$005B3789 7E47 jle` | `$005B37D2` | attacker Death Gaze gate; repeat count non-positive |
| `$005B37D0 75C3 jne` | `$005B3795` | next attacker Stoning Gaze pass |
| `$005B37D9 744E je` | `$005B3829` | attacker Doom Gaze gate; no Death Gaze |
| `$005B37E0 7E47 jle` | `$005B3829` | attacker Doom Gaze gate; repeat count non-positive |
| `$005B3827 75C3 jne` | `$005B37EC` | next attacker Death Gaze pass |
| `$005B3830 7E47 jle` | `$005B3879` | defender Stoning Gaze gate; no attacker Doom Gaze |
| `$005B3837 7E40 jle` | `$005B3879` | defender Stoning Gaze gate; repeat count non-positive |
| `$005B3877 75CA jne` | `$005B3843` | next attacker Doom Gaze pass |
| `$005B38A5 7435 je` | `$005B38DC` | defender Death Gaze gate |
| `$005B3908 7435 je` | `$005B393F` | defender Doom Gaze gate |
| `$005B396B 7E2E jle` | `$005B399B` | attacker Lightning Breath gate |
| `$005B39A2 7E4E jle` | `$005B39F2` | attacker Fire Breath gate; Lightning absent |
| `$005B39A9 7E47 jle` | `$005B39F2` | attacker Fire Breath gate; repeat count non-positive |
| `$005B39F0 75C3 jne` | `$005B39B5` | next Lightning Breath pass |
| `$005B39F9 7E4E jle` | `$005B3A49` | attacker Thrown gate; Fire Breath absent |
| `$005B3A00 7E47 jle` | `$005B3A49` | attacker Thrown gate; repeat count non-positive |
| `$005B3A47 75C3 jne` | `$005B3A0C` | next Fire Breath pass |
| `$005B3A50 7E4E jle` | `$005B3AA0` | First Strike gate; Thrown absent |
| `$005B3A57 7E47 jle` | `$005B3AA0` | First Strike gate; repeat count non-positive |
| `$005B3A9E 75C3 jne` | `$005B3A63` | next Thrown pass |
| `$005B3AAA 0F8498000000 je` | `$005B3B48` | unresolved ordinary main strike; First Strike absent |
| `$005B3ADC 756A jne` | `$005B3B48` | unresolved ordinary main strike; defender negates First Strike |
| `$005B3B00 7F46 jg` | `$005B3B48` | unresolved ordinary main strike; top-figure HP exceeds cap |
| `$005B3B6D 7E21 jle` | `$005B3B90` | counterattack result; no Haste melee result |
| `$005B3BDD 7E14 jle` | `$005B3BF3` | action costs; no Haste result to deal |
| `$005B3C81 7903 jns` | `$005B3C86` | subtract corrected signed-division quotient |
| `$005B3D03 7905 jns` | `$005B3D0A` | store non-negative signed remainder in `i` |
| `$005B3D39 7E79 jle` | `$005B3DB4` | movement zero-clamp gate after first attack |
| `$005B3DE1 7D2E jge` | `$005B3E11` | suppression write; remaining movement already non-negative |
| `$005B3E80 7544 jne` | `$005B3EC6` | epilogue; attacker base record is dead |
| `$005B3EAE 7516 jne` | `$005B3EC6` | epilogue; attacker calculated owner is not zero |

The repository verifier excludes `$005B3C81` because it recognizes the `sar/jns/adc` division
idiom as a unit; it counts `$005B3D03`, whose following correction is not `adc`. Both are retained
above because the semantic arithmetic must be reproducible.

## Semantic calls

| Addresses | Target / role |
|---|---|
| `$005B334B`, `$005B36CF` | `@Combat@CrushWall` |
| `$005B33AA`, `$005B372E` | `@Combat@destroywall` |
| `$005B3619`, `$005B367C` | executable routine `unnamed_005B3ECC` (scoped in R5.2h) |
| `$005B3685`, `$005B36C7` | `@Combat@HasWallOfFire`; `@Spells@FirewallEffect` |
| `$005B3435`; `$005B3798`, `$005B37EF`, `$005B38AA`, `$005B390D`, `$005B39B8`, `$005B3A0F`, `$005B3A66`, `$005B3B05`, `$005B3B4B`, `$005B3B72`, `$005B3B93` | all `@Units@LivingFigures` calls |
| `$005B344E`; `$005B37B1`, `$005B3808`, `$005B3858`, `$005B38C3`, `$005B3926`, `$005B3982`, `$005B39D1`, `$005B3A28`, `$005B3A7F`, `$005B3B1E`, `$005B3B64`, `$005B3B8B`, `$005B3BAC` | all `@Combat@ApplyAttack` calls |
| `$005B3462`; `$005B37C5`, `$005B381C`, `$005B386C`, `$005B38D7`, `$005B393A`, `$005B3996`, `$005B39E5`, `$005B3A3C`, `$005B3A93`, `$005B3B32`, `$005B3BC0`, `$005B3BD4`, `$005B3BEE` | all `@Combat@Dealdamage` calls |
| `$005B3AE1`, `$005B3AEB` | `@Units@HpPerFigure`; `@Units@TopFigureDamage` |
| `$005B3599`, `$005B3E4F` | `@Units@RecalculateUnits` |
| `$005B3EC1` | `@Combatmovement@CombatGetMoveMatrix` |

## Coverage ledgers

### `PerformRangedAttack`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B3338` | `$005B33AF` | — | reconstructed | prologue and optional wall crushing |
| 1 | `$005B33AF` | `$005B3535` | — | reconstructed | Haste repeat count, ammo gate, attack/deal and shot consumption |
| 2 | `$005B3535` | `$005B35A2` | — | reconstructed | movement/attack state and recalculation |

### `PerformMeleeAttack`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B35A4` | `$005B3733` | — | reconstructed | damage-counter reset, Wall of Fire crossing and wall crushing |
| 1 | `$005B3733` | `$005B377B` | — | reconstructed | calculated attacker pointer and Haste repeat count |
| 2 | `$005B377B` | `$005B3879` | — | reconstructed | attacker Stoning, Death and Doom Gazes |
| 3 | `$005B3879` | `$005B399B` | — | reconstructed | defender retaliation gazes |
| 4 | `$005B399B` | `$005B3AA0` | — | reconstructed | attacker Lightning Breath, Fire Breath and Thrown phases |
| 5 | `$005B3AA0` | `$005B3BF3` | — | reconstructed | First Strike, main/Haste melee, counterattack and deal order |
| 6 | `$005B3BF3` | `$005B3ECB` | — | reconstructed | action costs, suppression, recalculation and move-matrix refresh |

## Completion declarations

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Verifier totals: ranged 6/6 semantic conditional jumps, 6/6 calls and 5/5 classified writes;
melee 37/37 semantic conditional jumps, 47/47 calls and 10/10 classified writes. The extra
division `jns` is quoted above even though the verifier intentionally treats that full idiom as
one arithmetic operation.
