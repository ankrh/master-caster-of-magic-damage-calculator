# R5.2f — combat damage/healing helpers: executable evidence

This is the evidence companion to `Combat.DamageHandling.pas`. It covers these complete TD32
extents in the pinned `Caster.exe`:

| Symbol | Extent |
|---|---:|
| `@Combat@AddDamage` | `$005B1928..$005B1970` |
| `@Combat@Combatheal` | `$005B1260..$005B15BE` |
| `@Units@LivingFigures` | `$0059648C..$005964F8` |
| `@Units@TopFigureDamage` | `$00596554..$005965C6` |
| `@Combat@Dealdamage` | `$005B41C0..$005B4555` |

## Provenance and review status

Codex produced a cold derivation without reading or searching for a Claude derivation. The
executable matched the README MD5 before disassembly. Whole-routine inbound scans found no outer
branch straddling any assigned extent. The user requested single-agent mode, so Codex performed a
separate raw-byte self-review on 2026-08-02 and integrated the result without a Claude derivation
or formal cross-review. The self-review re-decoded all 23 semantic conditional jumps, all ten
semantic calls, the two complete signed-division sequences, the death-threshold multiply, and
every persistent write; it found no actionable defect.

TD32 supplies all five routine names and these local/parameter names: `Combatheal`'s `u`,
`amount`, `overheal`, `isregen`, `healable`, `normal`, `irrecfigures`, and `i`; and
`Dealdamage`'s `u`, `normal`, `undead`, `overland`, `irrec`, and `normaldamage`. The compiler does
not read `overland` anywhere in `Dealdamage`'s complete extent.

## Bound globals

The following names are not guesses. Each pointer global is read by the same-named CasterCore
accessor, except `CCIrrecoverable`, whose INI loader proves its name.

| Pointer global | Binding evidence |
|---:|---|
| `$00708A54` | `@Castercore@DebugGod`, `$0064C400`; toggle accessor `$0064C44C..$0064C45B` |
| `$00708534` | `@Castercore@CAAttackerunit`, `$0064692C` |
| `$00709588` | `@Castercore@CADefenderunit`, `$00646940` |
| `$00708BEC` | `@Castercore@CAattdamage`, `$00646954` |
| `$007081D0` | `@Castercore@CAdefdamage`, `$00646968` |
| `$00708BF4` | `CCIrrecoverable`, loaded with default 2 at `$00633ED9..$00633EF3` |

## Exact semantic findings

- `AddDamage` adds the three damage categories independently in record order: irrecoverable,
  undead, normal.
- `Combatheal` defines healable damage as total minus irrecoverable. Unless `overheal` is set, it
  caps the requested amount to that value. Natural healing, regeneration, or overheal first
  removes recoverable normal damage and then undead damage.
- With `overheal`, any amount left after those removals becomes
  `amount div LivingFigures(u)` bonus HP per living figure, with base `bonushp` capped at 90.
  Damage for already-dead figures is increased by that per-figure amount so they stay dead;
  when the unit cannot heal naturally, the same adjustment is also irrecoverable.
- The two `ApplyAttack` callers use different Boolean pairs. Life Steal passes
  `overheal=True, isregen=False` (`$005B2D33 6A00`; `$005B2D35 B101`), so it can reach the bonus-HP
  path. Bloodsucker passes `overheal=False, isregen=True` (`$005B3281 6A01`;
  `$005B328B 33C9`), so its configured amount is capped to the attacker's recoverable damage and
  never becomes bonus HP.
- `LivingFigures` is exactly `BaseUnits.figures - Totaldamage div HpPerFigure`; it has no clamp.
  `TopFigureDamage` is exactly `Totaldamage - DeadFigures * HpPerFigure`.
- `Dealdamage` ignores its TD32-named `overland` parameter. Debug God zeroes all three incoming
  buckets for owner 0 and changes only ordinary incoming damage to 100 for other owners.
- Buried always merges all incoming damage into the irrecoverable bucket. Confusion, Possession,
  and Creature Binding do so only when `CCIrrecoverable > 1`; the shipped default is 2.
- For a living unit and a positive combined amount, `Dealdamage` adds the three buckets without
  capping them to remaining HP and increments the matching combat attacker/defender damage
  accumulator. Death occurs when accumulated total damage reaches or exceeds
  `HpPerFigure * figures`.
- On death, the largest accumulated category first selects a category flag. Irrecoverable wins
  a tie; if it does not win, undead wins a tie with normal. A combat-summoned unit then also sets
  `irrecoverable` regardless of category dominance, without clearing `undeaded`; both flags can
  therefore remain true.

## Semantic conditional branches

Compiler range/overflow guards are excluded. Each target description states what begins at the
branch destination, not merely the test's meaning.

### `Combatheal`

| Jump bytes | Target | Target contents |
|---|---:|---|
| `$005B12C1 750E jne` | `$005B12D1` | `8B45FC mov eax,[u]`: call `CanHealNaturally`; `overheal` skips the amount cap |
| `$005B12C9 7D06 jge` | `$005B12D1` | same call; `healable >= amount` keeps the requested amount |
| `$005B12DC 750A jne` | `$005B12E8` | `8B45E0 mov eax,[record]`: begin normal/undead healing |
| `$005B12E2 0F84F2000000 je` | `$005B13DA` | `807DF700 cmp [overheal],0`: skip ordinary healing and test overheal |
| `$005B13DE 0F84D4010000 je` | `$005B15B8` | `8BE5 mov esp,ebp`: return when overheal is false |
| `$005B1472 7E3D jle` | `$005B14B1` | `8B45FC mov eax,[u]`: add the already-in-range bonus HP |
| `$005B1534 7541 jne` | `$005B1577` | `8B45E0 mov eax,[record]`: skip dead-figure irrecoverable adjustment when natural healing is allowed |

### `Dealdamage`

| Jump bytes | Target | Target contents |
|---|---:|---|
| `$005B4205 7446 je` | `$005B424D` | `8B45FC mov eax,[u]`: skip Debug God rewrite and begin Buried/control gates |
| `$005B4233 7511 jne` | `$005B4246` | `C745F864000000 mov [normal],100`: Debug God target is not owner 0 |
| `$005B4279 0F8594000000 jne` | `$005B4313` | `8B450C mov eax,[irrec]`: Buried merges all buckets into irrecoverable |
| `$005B42AB 755C jne` | `$005B4309` | `A1F48B7000 mov eax,[$00708BF4]`: Confusion reaches `CCIrrecoverable` |
| `$005B42D9 752E jne` | `$005B4309` | same `CCIrrecoverable` test for Possession |
| `$005B4307 742E je` | `$005B4337` | `8B45EC mov eax,[record]`: no control enchantment; begin dead/damage gates |
| `$005B4311 7E24 jle` | `$005B4337` | same gates; `CCIrrecoverable <= 1` does not merge controlled-unit damage |
| `$005B4341 0F8508020000 jne` | `$005B454F` | `8BE5 mov esp,ebp`: already-dead unit returns |
| `$005B4360 0F8EE9010000 jle` | `$005B454F` | same return for nonpositive combined damage |
| `$005B4420 752D jne` | `$005B444F` | `A188957000 mov eax,[$00709588]`: skip attacker accumulator and test defender |
| `$005B4459 752D jne` | `$005B4488` | `8B45FC mov eax,[u]`: skip defender accumulator and test death threshold |
| `$005B44AC 0F8F9D000000 jg` | `$005B454F` | return while total HP capacity remains above accumulated damage |
| `$005B4503 7C1B jl` | `$005B4520` | `8B45EC mov eax,[record]`: irrecoverable lost the first dominance comparison |
| `$005B4512 7C0C jl` | `$005B4520` | same undead-vs-normal comparison after irrecoverable lost the second comparison |
| `$005B452D 7C0A jl` | `$005B4539` | `8B45EC mov eax,[record]`: normal dominates undead; test combat-summoned |
| `$005B4543 740A je` | `$005B454F` | return without forcing irrecoverable when not combat-summoned |

`AddDamage`, `LivingFigures`, and `TopFigureDamage` have no semantic conditional branch.

## Complete arithmetic idioms

- `Combatheal` per-living-figure bonus uses signed division:
  `$005B1427 E86050FEFF call LivingFigures; $005B142C 50 push eax;`
  `$005B142D 8B45F8 mov eax,[amount]; $005B1430 5A pop edx;`
  `$005B1431 8BCA mov ecx,edx; $005B1433 99 cdq; $005B1434 F7F9 idiv ecx;`
  `$005B1436 8945E4 mov [i],eax`.
- `LivingFigures` uses the same complete signed-division shape:
  `$005964C6 E8E5F8FFFF call HpPerFigure; $005964CB 50 push eax;`
  `$005964CC 8B45F4 mov eax,[record]; $005964CF 0FBF8000050000 movsx eax,[Totaldamage];`
  `$005964D6 5A pop edx; $005964D7 8BCA mov ecx,edx; $005964D9 99 cdq;`
  `$005964DA F7F9 idiv ecx`.
- The death threshold is a one-operand signed multiply, not a memory write:
  `$005B448B E82019FEFF call HpPerFigure; $005B4490 8B55EC mov edx,[record];`
  `$005B4493 F7AA88000000 imul dword ptr [edx+$88];`
  `$005B44A3 0FBF9200050000 movsx edx,[Totaldamage]; $005B44AA 3BC2 cmp eax,edx`.

## Semantic calls

| Address | Bytes | Target / role |
|---:|---|---|
| `$005B12D4` | `E873B80300` | `@Game@CanHealNaturally` |
| `$005B1307` | `E870BC0400` | first `@Game@Min` |
| `$005B135D` | `E81ABC0400` | second `@Game@Min` |
| `$005B13E7` | `E8A050FEFF` | first `@Units@LivingFigures` |
| `$005B1427` | `E86050FEFF` | second `@Units@LivingFigures` |
| `$005B152D` | `E81AB60300` | second `@Game@CanHealNaturally` |
| `$005964C6` | `E8E5F8FFFF` | `@Units@HpPerFigure` |
| `$0059658F` | `E864FFFFFF` | `@Units@DeadFigures` |
| `$00596599` | `E812F8FFFF` | `@Units@HpPerFigure` |
| `$005B448B` | `E82019FEFF` | `@Units@HpPerFigure` |

`AddDamage` has no semantic call. All other calls within the five extents are compiler guards.

## Persistent writes

| Address | Bytes | Write |
|---:|---|---|
| `$005B1941` | `0110` | `dmg1.irrecoverable += dmg2.irrecoverable` |
| `$005B1950` | `015004` | `dmg1.undead += dmg2.undead` |
| `$005B1960` | `015008` | `dmg1.normal += dmg2.normal` |
| `$005B133C` | `66898200050000` | `BaseUnits[u].Totaldamage -= i` |
| `$005B1392` | `66898200050000` | second `BaseUnits[u].Totaldamage -= i` |
| `$005B13D3` | `66898204050000` | `BaseUnits[u].Undeaddamage -= i` |
| `$005B1522` | `668984913C1EAC01` | `BaseUnits[u].bonushp += i` |
| `$005B1570` | `66898202050000` | `BaseUnits[u].Irrecoverabledamage += i*irrecfigures` |
| `$005B15B1` | `66898200050000` | `BaseUnits[u].Totaldamage += i*irrecfigures` |
| `$005B4393` | `66898202050000` | `BaseUnits[u].Irrecoverabledamage += irrec` |
| `$005B43C7` | `66898204050000` | `BaseUnits[u].Undeaddamage += undead` |
| `$005B440F` | `66898200050000` | `BaseUnits[u].Totaldamage += irrec + undead + normal` |
| `$005B444D` | `8902` | `CAattdamage += irrec + undead + normal` |
| `$005B4486` | `8902` | `CAdefdamage += irrec + undead + normal` |
| `$005B44B5` | `C6809E06000001` | `BaseUnits[u].dead := True` |
| `$005B4517` | `C680A106000001` | dominant irrecoverable damage sets `irrecoverable` |
| `$005B4532` | `C680A006000001` | dominant undead damage sets `undeaded` |
| `$005B4548` | `C680A106000001` | combat-summoned death sets `irrecoverable` |

The verifier reports 11 writes in `Combatheal`: six persistent writes above plus five local
stores at `$005B129A`, `$005B130C`, `$005B1362`, `$005B1436`, and `$005B14AE` that its broad
displacement heuristic misclassifies. It reports ten in `Dealdamage`: the nine persistent writes
above plus the read-only one-operand multiply at `$005B4493`. All reported sites are therefore
classified; neither group hides an omitted state write.

## Coverage ledgers

Each assigned extent is one contiguous reconstructed row. The five inbound scans found no
straddling outer branch.

### `AddDamage`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B1928` | `$005B1970` | — | reconstructed | record copy, three checked additions, epilogue |

### `Combatheal`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B1260` | `$005B15BE` | — | reconstructed | amount cap, normal/undead healing, overheal bonus HP and dead-figure adjustments |

### `LivingFigures`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$0059648C` | `$005964F8` | — | reconstructed | base figures minus complete-figure damage quotient |

### `TopFigureDamage`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$00596554` | `$005965C6` | — | reconstructed | total damage minus dead-figure HP |

### `Dealdamage`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B41C0` | `$005B4555` | — | reconstructed | debug override, category merge, accumulation, trackers, death and death-type routing |

## Completion declaration

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Verifier totals, run separately: `AddDamage` 0 branches, 0 calls, 3/3 writes;
`Combatheal` 7/7 branches, 6/6 calls, 11/11 classified writes; `LivingFigures` 0 branches,
1/1 calls, 0 writes; `TopFigureDamage` 0 branches, 2/2 calls, 0 writes; `Dealdamage` 16/16
branches, 1/1 calls, 10/10 classified writes. All five ledgers are contiguous and all declare
zero parent mismatches.

R5.2i classified the real callees: `Min` and `HpPerFigure` are already reconstructed in R5.1c-b;
`CanHealNaturally` and `DeadFigures` are calculator-relevant and were subsequently reconstructed
in R5.2k's [`Combat.CallClosureHelpers.pas`](./Combat.CallClosureHelpers.pas), with durable proof
in [`Combat.CallClosureHelpers.R5.2k.evidence.md`](./Combat.CallClosureHelpers.R5.2k.evidence.md).
`LivingFigures` is reconstructed here.
