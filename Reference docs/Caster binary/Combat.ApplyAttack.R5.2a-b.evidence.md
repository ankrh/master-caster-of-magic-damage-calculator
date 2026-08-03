# `@Combat@ApplyAttack` R5.2a–b reconstruction evidence

This is the durable evidence companion for the first two source-shaped slices in
`Combat.ApplyAttack.pas`:

- R5.2a: `$005B1970..$005B213D`
- R5.2b: `$005B213D..$005B2994`

The binary identity remains solely in `README.md`. Provenance: Codex cold-derived both extents
on 2026-08-02. On the user-requested byte-level review, three defects were found and corrected
before integration: the Fear gate reads `BaseUnits[au].deathimmunity`, the Battlemage lookup
indexes `Wizards` with `BaseUnits[au].owner`, and the unsigned attack-type bound also sends
negative `Integer` values to the invalid block. The independent Claude derivation and formal
cross-review were unavailable; the user directed integration on 2026-08-02 with that limitation
retained explicitly in this durable provenance.

## Entry, ABI and enclosing gates

TD32 gives `@Combat@ApplyAttack` as `$005B1970..$005B32BC`. Its named frame has register
parameters `au`, `du`, `at`; stack parameters `[EBP+$0C] simul`, `[EBP+$10] counter`,
`[EBP+$14] figs`; and the hidden record-result pointer at `[EBP+$08]`.

`counter` and `simul` are distinguished by their call sites, not assumed — swapping them would
invert both the counterattack suppression penalty and the flying-eligibility skip while every
coverage count stayed clean. Delphi pushes stack parameters left to right, so the declared order
`(… figs, counter, simul)` lands at `+$14 / +$10 / +$0C`, and `@Combat@PerformMeleeAttack`
confirms it:

```text
$005B3B50 50    push eax   ; figs
$005B3B51 6A00  push 0     ; counter = False   ordinary attacker call
$005B3B53 6A00  push 0     ; simul   = False
$005B3B98 50    push eax   ; figs
$005B3B99 6A01  push 1     ; counter = True    counterattack call
$005B3B9B 6A00  push 0     ; simul   = False
```

`annotate_caster_disasm.py --inbound` reports no gate over the R5.2a procedure entry. R5.2b is
inside the positive-figure gate `$005B19DD 0f8e33180000 jle $005B3216`; the target begins the
result-total/finalization tail. Six case exits from R5.2a land at R5.2b's exact start
`$005B213D`, where the real `@Combat@mergeflags` call begins.

## Recovered bindings and review corrections

Unit offsets are direct displacement-minus-base results (`$06426898` for `Units`, `$01AC1798`
for `BaseUnits`); names and types are from shipped `Typedec.pas`. Both arrays use the exact
`$0784`-byte / `$01E1`-dword stride.

| Finding | Address and bytes | Binding |
|---|---|---|
| Fear's direct immunity gate | `$005B1D16 8b1588917000`; `$005B1D1C 80bc825f18ac0100` | displacement `$01AC185F = BaseUnits + $0C7`, therefore `BaseUnits[au].deathimmunity`, not the calculated record |
| Calculated Death Immunity, for contrast | `$005B2562 8b1588917000`; `$005B2568 80bc825f69420600` | displacement `$0642695F = Units + $0C7`; this is the separate Death-Gaze gate |
| Battlemage owner | `$005B22B0 8b0d88917000`; `$005B22B6 0fbe9491311eac01` | displacement `$01AC1E31 = BaseUnits + $699`, therefore `BaseUnits[au].owner` |
| Invalid attack type | `$005B1A22 83f808`; `$005B1A25 0f8789060000` | unsigned `ja $005B20B4`; signed-negative `at` values take the invalid block as well as values above 8 |
| Invalid target | `$005B20B4 33c0`; `$005B20B6 8945e8` | begin `atk := 0`, followed by the common invalid setup and `Rederror` |

`AttackFlagsT` is copied as exactly `$13` dwords at `$005B1A19`, `$005B1B1B`, `$005B1CAA`,
`$005B1E31`, `$005B1F84`, `$005B200A`, `$005B2099` and `$005B211D`. This is 76 bytes, exactly
the shipped `Typedec.pas` record size.

## Conditional branches

Every semantic conditional below quotes its encoded instruction bytes, target, and the operation
or block beginning at that target. Compiler range/overflow guards are excluded.

### R5.2a — 11

| Test/jump | Target | Target contents |
|---|---:|---|
| `$005B19D2 7405 je` | `$005B19D9` | test `figs > 0` |
| `$005B19DD 0f8e33180000 jle` | `$005B3216` | result-total/finalization tail |
| `$005B1A25 0f8789060000 ja` | `$005B20B4` | invalid-type `atk := 0`; unsigned out-of-range includes negative values |
| `$005B1BA3 7532 jne` | `$005B1BD7` | `islightning` temporary true |
| `$005B1BD1 7404 je` | `$005B1BD7` | same `islightning` true arm |
| `$005B1CF2 0f8497000000 je` | `$005B1D8F` | copy filtered `j` back to `figs` |
| `$005B1D24 7569 jne` | `$005B1D8F` | same `figs := j` target; BaseUnits Death Immunity was present |
| `$005B1D2B 7e62 jle` | `$005B1D8F` | same `figs := j` target; no positive trial count |
| `$005B1D7A 7e0b jle` | `$005B1D87` | increment loop index without decrementing `j` |
| `$005B1D8D 75a8 jne` | `$005B1D37` | next fixed-count Fear resistance iteration |
| `$005B1E37 7537 jne` | `$005B1E70` | fire-breath strength arm |

### R5.2b — 43

| Test/jump | Target | Target contents |
|---|---:|---|
| `$005B2152 7406 je` | `$005B215A` | Blood Lust flag lookup for admitted melee |
| `$005B2158 756a jne` | `$005B21C4` | `simul`/Battlemage gate for non-Thrown type |
| `$005B2186 743c je` | `$005B21C4` | same gate; Blood Lust absent |
| `$005B21B4 750e jne` | `$005B21C4` | same gate; defender Fantastic |
| `$005B21C8 0f857a020000 jne` | `$005B2448` | counterattack To-Hit block; `simul` true |
| `$005B21FA 0f8448020000 je` | `$005B2448` | same block; attacker is not a hero |
| `$005B222D 0f8415020000 je` | `$005B2448` | same block; `maxmp = 0` |
| `$005B2237 7416 je` | `$005B224F` | Battlemage lookup; melee admitted |
| `$005B223D 7410 je` | `$005B224F` | Battlemage lookup; Thrown admitted |
| `$005B2243 740a je` | `$005B224F` | Battlemage lookup; fire breath admitted |
| `$005B2249 0f85f9010000 jne` | `$005B2448` | non-lightning type rejected |
| `$005B23ED 7e59 jle` | `$005B2448` | MP already at or below calculated maximum |
| `$005B244C 7440 je` | `$005B248E` | non-counter flying-eligibility block |
| `$005B2492 7544 jne` | `$005B24D8` | Immolation test; counterattack skips flight rejection |
| `$005B24C0 7416 je` | `$005B24D8` | Immolation test; defender not flying |
| `$005B24CC 750a jne` | `$005B24D8` | Immolation test; attacker can attack fliers |
| `$005B24D2 0f843e0d0000 je` | `$005B3216` | result finalization for an ineligible melee attack |
| `$005B2504 7434 je` | `$005B253A` | Death-Gaze test; no Immolation |
| `$005B250A 752e jne` | `$005B253A` | Death-Gaze test; non-melee attack |
| `$005B253E 0f850a010000 jne` | `$005B264E` | Stoning-Gaze test; wrong type for Death Gaze |
| `$005B2570 0f85d8000000 jne` | `$005B264E` | Stoning-Gaze test; calculated Death Immunity |
| `$005B25A2 0f85a6000000 jne` | `$005B264E` | Stoning-Gaze test; calculated Magic Immunity |
| `$005B25B2 0f8e96000000 jle` | `$005B264E` | Stoning-Gaze test; no living defender figures |
| `$005B262B 7e15 jle` | `$005B2642` | Death-Gaze loop increment without a result write |
| `$005B2648 0f8574ffffff jne` | `$005B25C2` | next Death-Gaze resistance iteration |
| `$005B2652 0f8509010000 jne` | `$005B2761` | Black-Sleep block; wrong type for Stoning Gaze |
| `$005B2684 0f85d7000000 jne` | `$005B2761` | Black-Sleep block; calculated Stoning Immunity |
| `$005B26B6 0f85a5000000 jne` | `$005B2761` | Black-Sleep block; calculated Magic Immunity |
| `$005B26C6 0f8e95000000 jle` | `$005B2761` | Black-Sleep block; no living defender figures |
| `$005B273F 7e14 jle` | `$005B2755` | Stoning-Gaze loop increment without a result write |
| `$005B275B 0f8575ffffff jne` | `$005B26D6` | next Stoning-Gaze resistance iteration |
| `$005B278D 740b je` | `$005B279A` | To-Hit floor; defender is not Black Asleep |
| `$005B279E 7d07 jge` | `$005B27A7` | initialize extra defence; To Hit already at least 10 |
| `$005B27B3 0f8418010000 je` | `$005B28D1` | EffectiveDefense setup; no wall |
| `$005B27C3 0f8408010000 je` | `$005B28D1` | EffectiveDefense setup; defender outside wall |
| `$005B27D3 0f85f8000000 jne` | `$005B28D1` | EffectiveDefense setup; attacker also inside wall |
| `$005B2845 750a jne` | `$005B2851` | begin Teleporting override; wall state is not 2 |
| `$005B287F 7410 je` | `$005B2891` | begin Merging override; Teleporting and `simul` not both true |
| `$005B2885 740a je` | `$005B2891` | begin Merging override; attack is ranged |
| `$005B28BF 7410 je` | `$005B28D1` | EffectiveDefense setup; Merging and `simul` not both true |
| `$005B28C5 740a je` | `$005B28D1` | EffectiveDefense setup; attack is ranged |
| `$005B2967 7411 je` | `$005B297A` | initialize `TotalDamage`; Mystic Surge absent |
| `$005B2984 0f8ee0070000 jle` | `$005B316A` | post-main-loop result-bucket tail |

## Semantic calls

| Address | Bytes | Target | Role |
|---:|---|---|---|
| `$005B199E` | `e8b14bfeff` | `@Units@TopFigureDamage` `$00596554` | snapshot defender top-figure damage |
| `$005B1B23` | `e8d8fcffff` | `@Combat@RangedPenalty` `$005B1800` | ranged To-Hit penalty |
| `$005B1B5D` | `e89248feff` | `@Units@Ismagicalranged` `$005963F4` | ranged classification |
| `$005B1B90` | `e8ab48feff` | `@Units@Ismissileranged` `$00596440` | missile classification |
| `$005B1D73` | `e8743ffeff` | `@Units@ResistanceRoll` `$00595CEC` | one Fear roll |
| `$005B2138` | `e89faf0400` | `@Game@Rederror` `$005FD0DC` | invalid attack-type diagnostic |
| `$005B2149` | `e8e2f4ffff` | `@Combat@mergeflags` `$005B1630` | merge general and type-specific attack flags |
| `$005B2316` | `e8cd10feff` | `@Heroes@HeroBonus` `$005933E8` | Battlemage MP gain |
| `$005B24C5` | `e80e2ffeff` | `@Units@canattackflier` `$005953D8` | flying-defender melee eligibility |
| `$005B2527` | `e8bceb0000` | `@Spells@DamageSpell` `$005C10E8` | Immolation damage record |
| `$005B2535` | `e8eef3ffff` | `@Combat@AddDamage` `$005B1928` | merge Immolation result |
| `$005B25AB` | `e8dc3efeff` | `@Units@LivingFigures` `$0059648C` | Death-Gaze defender trial count |
| `$005B2624` | `e8c336feff` | `@Units@ResistanceRoll` `$00595CEC` | Death-Gaze save |
| `$005B2630` | `e87b37feff` | `@Units@HpPerFigure` `$00595DB0` | one Death-Gaze kill in HP |
| `$005B26BF` | `e8c83dfeff` | `@Units@LivingFigures` `$0059648C` | Stoning-Gaze defender trial count |
| `$005B2738` | `e8af35feff` | `@Units@ResistanceRoll` `$00595CEC` | Stoning-Gaze save |
| `$005B2744` | `e86736feff` | `@Units@HpPerFigure` `$00595DB0` | one Stoning-Gaze kill in HP |
| `$005B27AC` | `e8fb180000` | `@Combat@HasWall` `$005B40AC` | city-wall presence |
| `$005B27BC`, `$005B27CC` | `e843170000`, `e833170000` | `@Combat@Insidewalls` `$005B3F04` | defender/attacker position |
| `$005B282F` | `e8048f0000` | `@Combat@GetWallState` `$005BB738` | intact/broken wall state |
| `$005B292A` | `e8993cfeff` | `@Units@EffectiveDefense` `$005965C8` | final attack-specific defence |

## State writes and arithmetic

The source-shaped body preserves all externally observable writes and the ordered local values
that feed later slices:

| Address(es) | Write |
|---:|---|
| `$005B1989`, `$005B1990`, `$005B1998` | zero `Result.field_00`, `.field_04`, `.field_08` |
| `$005B19D6` | Black Sleep sets caller-supplied `figs := 0` |
| `$005B1A19`, `$005B1B1B`, `$005B1CAA`, `$005B1E31`, `$005B1F84`, `$005B200A`, `$005B2099`, `$005B211D` | exact 76-byte AttackFlags snapshots |
| `$005B1AE2`, `$005B1C71`, `$005B1DF8`, `$005B1F4B` | save ranged, melee, breath and Thrown `tohit` sums before their type-specific adjustments |
| `$005B1D7C`, `$005B1D92` | failed Fear roll decrements `j`; filtered count is written back to `figs` |
| `$005B1E39`, `$005B200C`, `$005B278F`, `$005B2793` | Lightning-Breath armour piercing, Doom-Gaze Doom, and defender-Black-Sleep full-Doom writes |
| `$005B21B6 6b45e802` / `$005B21BA 8945e8` | Blood Lust computes and writes `atk * 2`; the gate admits melee **or Thrown** |
| `$005B2348`, `$005B238C`, `$005B2440` | add Battlemage bonus to persistent `BaseUnits.mp`, then clamp it to calculated `Units.maxmp` |
| `$005B2484` | subtract `BaseUnits[du].suppression * 5` from counterattack To Hit |
| `$005B2638`, `$005B274C` | add one `HpPerFigure(du)` to the Death-/Stoning-Gaze result bucket per failed roll |
| `$005B27A0`, `$005B27A9` | floor To Hit at 10; initialize attack-specific extra defence to zero |
| `$005B283E`, `$005B284E`, `$005B288E`, `$005B28CE` | city-wall extra-defence selection and Teleporting/Merging overrides |
| `$005B292F`, `$005B295D`, `$005B2970` | save `EffectiveDefense`, defender To Defend, and Mystic-Surge-adjusted To Defend |
| `$005B297C`, `$005B298A`, `$005B298D` | initialize `TotalDamage`, main-loop count and `attacks := 1` |

No signed-division or correction idiom occurs in either extent. The only semantic multiply is
Blood Lust's exact factor 2 and suppression's exact factor 5. Range and overflow checks are
compiler guards under the repository convention.

## Coverage ledgers

### R5.2a — `$005B1970..$005B213D`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B1970` | `$005B19D9` | — | reconstructed | prologue, result zeroing, top-figure damage and attacker Black Sleep |
| 1 | `$005B19D9` | `$005B1A1B` | — | reconstructed | positive-figure gate and general attack-flags snapshot |
| 2 | `$005B1A1B` | `$005B1A56` | 1 | reconstructed | full-Doom initialization, unsigned bounds test and jump table |
| 3 | `$005B1A56` | `$005B1BE5` | 2 | reconstructed | ranged setup |
| 4 | `$005B1BE5` | `$005B1CC6` | 2 | reconstructed | melee setup and `j := figs` |
| 5 | `$005B1CC6` | `$005B1CF8` | 2 | reconstructed | defender-Fear gate |
| 6 | `$005B1CF8` | `$005B1D26` | 5 | reconstructed | attacker BaseUnits Death-Immunity gate |
| 7 | `$005B1D26` | `$005B1D2D` | 6 | reconstructed | positive-`j` gate |
| 8 | `$005B1D2D` | `$005B1D8F` | 7 | reconstructed | fixed-count Fear resistance loop |
| 9 | `$005B1D8F` | `$005B1D9A` | 2 | reconstructed | write filtered `figs` and join common continuation |
| 10 | `$005B1D9A` | `$005B1EBF` | 2 | reconstructed | shared fire/lightning-breath setup |
| 11 | `$005B1EBF` | `$005B1F9F` | 2 | reconstructed | Thrown setup |
| 12 | `$005B1F9F` | `$005B2030` | 2 | reconstructed | Doom-Gaze setup |
| 13 | `$005B2030` | `$005B20B4` | 2 | reconstructed | Death-/Stoning-Gaze setup |
| 14 | `$005B20B4` | `$005B213D` | 1 | reconstructed | invalid attack-type setup and diagnostic |

### R5.2b — `$005B213D..$005B2994`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B213D` | `$005B21C4` | — | reconstructed | flag merge and Blood Lust doubling |
| 1 | `$005B21C4` | `$005B2448` | — | reconstructed | hero Battlemage MP gain and max-MP clamp |
| 2 | `$005B2448` | `$005B248E` | — | reconstructed | counterattack suppression penalty |
| 3 | `$005B248E` | `$005B24D8` | — | reconstructed | flying-defender melee eligibility and early exit |
| 4 | `$005B24D8` | `$005B253A` | 3 | reconstructed | melee Immolation damage and result merge |
| 5 | `$005B253A` | `$005B264E` | 3 | reconstructed | Death-Gaze resistance loop |
| 6 | `$005B264E` | `$005B2761` | 3 | reconstructed | Stoning-Gaze resistance loop |
| 7 | `$005B2761` | `$005B27AC` | 3 | reconstructed | defender Black Sleep, To-Hit floor and extra-defence initialization |
| 8 | `$005B27AC` | `$005B28D1` | 3 | reconstructed | city-wall eligibility, state and mobility overrides |
| 9 | `$005B28D1` | `$005B2932` | 3 | reconstructed | complete EffectiveDefense call |
| 10 | `$005B2932` | `$005B297A` | 3 | reconstructed | To Defend and Mystic Surge penalty |
| 11 | `$005B297A` | `$005B2994` | 3 | reconstructed | total-damage and per-figure-loop initialization |

## Completion declarations

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Totals: 54 semantic conditional jumps, 22 semantic calls, 81 named-field/local state writes
reported by the repository verifier across the two extents, all accounted for. The continuation
begins exactly at the separate R5.2c boundary and is not part of either ledger above; it is now
resolved in `Combat.ApplyAttack.R5.2c.evidence.md`.
