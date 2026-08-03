# R5.2e — combat resolution helpers: executable evidence

This is the evidence companion to `Combat.ResolutionHelpers.pas`. It covers these complete
TD32 extents in the pinned `Caster.exe`:

| Symbol | Extent |
|---|---:|
| `@Units@GetEffectiveResistance` | `$00595AB8..$00595CE9` |
| `@Units@ResistanceRoll` | `$00595CEC..$00595DAD` |
| `@Units@AttackRoll` | `$00595E24..$00595E7C` |
| `@Units@DefenseRoll` | `$00595E7C..$00595EE9` |
| `@Units@EffectiveDefense` | `$005965C8..$00596848` |
| `@Combat@RangedPenalty` | `$005B1800..$005B1927` |
| `@Combat@CombatDistanceUnit` | `$005BB234..$005BB2FE` |

## Provenance and review status

Codex produced a cold derivation without reading or searching for a Claude derivation. The
executable matched MD5 `540c22dbd701fb2caa95bd3ecccd9447` before disassembly. Each whole-routine
inbound scan found no outer branch straddling its assigned extent. Claude was unavailable, so the
user directed integration after Codex performed a separate raw-byte self-review on 2026-08-02.
That review re-decoded all 58 semantic jumps and found no actionable defect.

TD32 supplies all seven names and the local names used in the reconstruction. Delphi register
convention places the first three scalar/pointer arguments in EAX, EDX and ECX; later arguments
are on the stack. `EffectiveDefense` copies exactly `$13` dwords from the EDX argument at
`$005965D0..$005965DB`, proving the 76-byte `AttackFlagsT` value.

## MODDING.INI pointer bindings

The dereferences in the reconstruction are exact. These inferred aliases are also bound to their
keys by the string loaders in `@Init@GameInitialize`:

| Pointer global | Key |
|---:|---|
| `$007099E8` | `ResistElementsResistBonus` |
| `$00708F50` | `BlessResistBonus` |
| `$0070A20C` | `ResistMagicBonus` |
| `$0070920C` | `LargeShieldBonus` |
| `$00708BA0` | `ResistElementsDefenseBonus` |
| `$0070A264` | `ElementalArmorDefenseBonus` |
| `$00708148` | `BlessDefenseBonus` |
| `$00708BA4` | `WeaponImmunityDefenseBonus` |
| `$0070A284` | `ToDefendCap` (loader block `$00633EA1..$00633EBB`) |
| `$007099EC` | `ToDefendCappedValue` (loader block `$00633EBD..$00633ED7`) |
| `$00708D50` | `HeroNoRangePenalty` (loader block begins `$00633261`; boolean store `$00633277..$0063327C`) |
| `$00708D4C` | `MagicNoRangePenalty` (loader block begins `$0063327F`; boolean store `$00633295..$0063329A`) |
| `$00708EFC` | `RangedPenaltyStarts` (loader block begins `$006333BD`) |
| `$007095CC` | `RangedPenaltyBase` (loader block begins `$006333D9`) |
| `$00708B6C` | `RangedPenaltyGap` (loader block begins `$006333F5`) |
| `$0070A098` | `RangedPenaltyGrowth` (loader block begins `$00633411`) |

## Constant bindings

Each enchantment/ability constant used in the reconstruction is bound to the byte that reads it.
`EnchantmentFlags` begins at +$509 and is one-based, so element *n* sits at `+$509 + n - 1`; the
values agree with TD32 `consts`.

| Constant | Value | Read at |
|---|---:|---|
| `EncResistElements` | 16 | `$00595C36 80BC82B06D420600` (+$518); `$00596671 80B81805000000` |
| `EncElementalArmor` | 20 | `$00596696 80B81C05000000` (+$51C) |
| `EncResistMagic` | 23 | `$00595CC7 80BC82B76D420600` (+$51F) |
| `EncBless` | 51 | `$00595C82 80BC82D36D420600` (+$53B); `$005966BB 8A803B050000` |
| `HACharmed` | 14 | `$00595BC0 83BCC25CA7080000` — displacement `$0008A75C = $0008A724 + 14*4`, the ability displacement formula established in R5.1c-c |
| `GEFateMastery` | 35 | `$00595D57 BA23000000` |

## Exact semantic findings

- `ResistanceRoll` returns `max(Random(10)+1 - (effective resistance + save), 0)`. Fate Mastery
  rerolls exactly once only when the first result is zero, replacing rather than combining it.
- `AttackRoll` floors To Hit at 10 but has no upper clamp.
- `DefenseRoll` uses the original To Defend for dice through `ToDefendCap`. On the first later die,
  a value above `ToDefendCappedValue` is lowered to that value and stays lowered. It never raises a
  lower value. Shipped `15/30` therefore affects defense dice 16 onward only.
- `EffectiveDefense` works on a local flags copy. Illusion is the sole early return. Armor Piercing
  uses signed `idiv 2` after Large Shield, Resist Elements, Elemental Armor and eligible Bless.
  Six later immunity tests assign 100 sequentially; Weapon Immunity adds after them.
- Bless defense requires calculated Bless, `ismagic2`, `spellid > 0`, and a Chaos- or Death-realm
  spell record. `ApplyAttack` pushes spell ID zero at `$005B28ED` before its call at `$005B292A`,
  so no `ApplyAttack` unit attack can activate the Bless-defense block.
- **Only the Bless block is guarded on `spellid > 0`.** The Fire, Cold and Poison tag blocks read
  the spell record with no positivity test — `$0059673C`, `$0059678A` and `$005967C3` load
  `spellid` straight into the `imul eax,eax,$17` record address, so an `ApplyAttack` unit attack
  tests `SpellTable[0]`'s tag bytes at +$56, +$57 and +$55. As shipped that is inert: `SPELLS.INI`
  record `[0]` is `Name=None` with no `Fire=`, `Cold=` or `Poison=` key. Its `Realm=6` also fails
  the Chaos/Death test, so the Bless conclusion above holds for two independent reasons. A mod that
  tagged record 0 would give the matching immunity Defense 100 against every `ApplyAttack` attack.
- `RangedPenalty` tests calculated `Units[au].ishero` directly. Zero-valued
  `HeroNoRangePenalty` enables the exemption; no hero ability is consulted. Magical ranged has a
  separate, equivalently disable-shaped setting. Long Range zeroes only the excess distance and
  therefore caps an applicable penalty at `RangedPenaltyBase`.
- `CombatDistanceUnit` passes `BaseUnits[u].cox/coy` and `BaseUnits[u2].cox/coy` to
  `CombatDistance`; it does not use calculated-unit coordinates.

## Semantic conditional branches

Compiler range/overflow guards are excluded by the reconstruction convention. Every semantic
branch below quotes its instruction bytes and the contents at its target.

### `GetEffectiveResistance`

| Jump | Target | Target contents |
|---|---:|---|
| `$00595AF9 0F84D2000000 je` | `$00595BD1` | Magic Immunity block; `isroll` is false |
| `$00595B2B 0F84A0000000 je` | `$00595BD1` | Magic Immunity block; unit is not a hero |
| `$00595BC8 7E07 jle` | `$00595BD1` | Magic Immunity block; Charmed level is not positive |
| `$00595BFD 740D je` | `$00595C0C` | Nature/Resist Elements block; no Magic Immunity |
| `$00595C03 7407 je` | `$00595C0C` | Nature/Resist Elements block; realm is zero |
| `$00595C10 753F jne` | `$00595C51` | Chaos/Death selection; realm is not Nature |
| `$00595C3E 7411 je` | `$00595C51` | Chaos/Death selection; no Resist Elements |
| `$00595C57 7405 je` | `$00595C5E` | Bless flag test; realm is Chaos |
| `$00595C5C 753F jne` | `$00595C9D` | Resist Magic gate; realm is neither Chaos nor Death |
| `$00595C8A 7411 je` | `$00595C9D` | Resist Magic gate; no Bless |
| `$00595CA1 743F je` | `$00595CE2` | Return Result; realm is zero |
| `$00595CCF 7411 je` | `$00595CE2` | Return Result; no Resist Magic |

### `ResistanceRoll`

| Jump | Target | Target contents |
|---|---:|---|
| `$00595D32 7F07 jg` | `$00595D3B` | store positive first-roll excess |
| `$00595D55 744D je` | `$00595DA4` | return; fate false or wizard negative |
| `$00595D66 743C je` | `$00595DA4` | return; wizard lacks Fate Mastery |
| `$00595D6C 7F36 jg` | `$00595DA4` | return; first roll already failed resistance |
| `$00595D8B 7F07 jg` | `$00595D94` | store positive reroll excess |

### `AttackRoll`

| Jump | Target | Target contents |
|---|---:|---|
| `$00595E39 7D07 jge` | `$00595E42` | positive-strength test with unchanged hit |
| `$00595E47 7E2C jle` | `$00595E75` | return zero for nonpositive strength |
| `$00595E60 7D0B jge` | `$00595E6D` | advance without incrementing hits |
| `$00595E73 75DE jne` | `$00595E53` | next attack die |

### `DefenseRoll`

| Jump | Target | Target contents |
|---|---:|---|
| `$00595E92 7E4E jle` | `$00595EE2` | return zero for nonpositive defense |
| `$00595EA8 7D16 jge` | `$00595EC0` | roll original To Defend because `i <= cap` |
| `$00595EB4 7D0A jge` | `$00595EC0` | roll unchanged because capped value is not lower |
| `$00595ECD 7D0B jge` | `$00595EDA` | advance without incrementing blocks |
| `$00595EE0 75BC jne` | `$00595E9E` | next defense die and cap check |

### `EffectiveDefense`

| Jump | Target | Target contents |
|---|---:|---|
| `$00596629 7410 je` | `$0059663B` | test copied Illusion flag; attack is not Illusion |
| `$00596635 7404 je` | `$0059663B` | test copied Illusion flag; no Illusion Immunity |
| `$0059663F 740A je` | `$0059664B` | Large Shield block; no surviving Illusion |
| `$0059664F 741D je` | `$0059666E` | Resist Elements block; attack is not ranged |
| `$0059665B 7411 je` | `$0059666E` | Resist Elements block; no Large Shield |
| `$00596678 7419 je` | `$00596693` | Elemental Armor block; no Resist Elements |
| `$00596680 7411 je` | `$00596693` | attack is neither magic2 nor breath |
| `$0059669D 7419 je` | `$005966B8` | Bless block; no Elemental Armor |
| `$005966A5 7411 je` | `$005966B8` | attack is neither magic2 nor breath |
| `$005966C4 7444 je` | `$0059670A` | Lightning Resist block; Bless or magic2 false |
| `$005966CA 7E3E jle` | `$0059670A` | Lightning Resist block; spell ID nonpositive |
| `$005966F2 7405 je` | `$005966F9` | add Bless; realm is Chaos |
| `$005966F7 7511 jne` | `$0059670A` | realm is neither Chaos nor Death |
| `$00596716 7404 je` | `$0059671C` | Armor Piercing test; Lightning Resist did not cancel |
| `$00596720 740E je` | `$00596730` | fire-spell immunity block; no Armor Piercing |
| `$0059673A 742D je` | `$00596769` | fire-flag immunity block; no Fire Immunity |
| `$00596760 7407 je` | `$00596769` | fire-flag block; spell not tagged Fire |
| `$00596775 7407 je` | `$0059677E` | cold-spell block; attack not flagged Fire |
| `$00596788 742D je` | `$005967B7` | poison-spell block; no Cold Immunity |
| `$005967AE 7407 je` | `$005967B7` | poison-spell block; spell not tagged Cold |
| `$005967C1 742D je` | `$005967F0` | Magic Immunity block; no Poison Immunity |
| `$005967E7 7407 je` | `$005967F0` | Magic Immunity block; spell not tagged Poison |
| `$005967FC 7407 je` | `$00596805` | Missile Immunity block; magic condition false |
| `$00596811 7407 je` | `$0059681A` | Weapon Immunity block; missile condition false |
| `$0059681E 751D jne` | `$0059683D` | return; `ismagic` bypasses Weapon Immunity |
| `$0059682A 7411 je` | `$0059683D` | return; no Weapon Immunity |

### `RangedPenalty`

| Jump | Target | Target contents |
|---|---:|---|
| `$005B184B 740F je` | `$005B185C` | magical-ranged block; attacker is not a hero |
| `$005B1855 7505 jne` | `$005B185C` | magical-ranged block; hero exemption disabled |
| `$005B188E 740F je` | `$005B189F` | threshold test; ranged type is not magical |
| `$005B1898 7505 jne` | `$005B189F` | threshold test; magic exemption disabled |
| `$005B18A9 7F75 jg` | `$005B1920` | return zero; distance below start threshold |
| `$005B18E8 7405 je` | `$005B18EF` | arithmetic with unchanged excess; no Long Range |

`CombatDistanceUnit` has no semantic conditional branch; all of its conditional jumps are
compiler range/overflow guards around the four record accesses.

## Semantic calls

| Address | Bytes | Target / role |
|---:|---|---|
| `$00595D03` | `E8B0FDFFFF` | `@Units@GetEffectiveResistance` |
| `$00595D1A` | `E83DECE6FF` | first `@System@Random` |
| `$00595D5F` | `E848B0FFFF` | `@Wizard@HasGlobalEnchantment` |
| `$00595D73` | `E8E4EBE6FF` | Fate-Mastery `@System@Random` |
| `$00595E58` | `E8FFEAE6FF` | attack-die `@System@Random` |
| `$00595EC5` | `E892EAE6FF` | defense-die `@System@Random` |
| `$005B1817` | `E8189A0000` | `@Combat@CombatDistanceUnit` |
| `$005B1887` | `E8684BFEFF` | `@Units@Ismagicalranged` |
| `$005BB2EE` | `E8D9FEFFFF` | `@Combat@CombatDistance` |

`GetEffectiveResistance` and `EffectiveDefense` contain no semantic calls. All unlisted calls
within these extents are compiler range/overflow guards.

## Coverage ledgers

Each assigned extent is one contiguous reconstructed row.

### `GetEffectiveResistance`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$00595AB8` | `$00595CE9` | — | reconstructed | complete effective-resistance transform and epilogue |

### `ResistanceRoll`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$00595CEC` | `$00595DAD` | — | reconstructed | effective resistance, first roll, Fate reroll and epilogue |

### `AttackRoll`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$00595E24` | `$00595E7C` | — | reconstructed | hit floor and complete die loop |

### `DefenseRoll`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$00595E7C` | `$00595EE9` | — | reconstructed | capped To Defend and complete die loop |

### `EffectiveDefense`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005965C8` | `$00596848` | — | reconstructed | complete ordered defense transform and early return |

### `RangedPenalty`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B1800` | `$005B1927` | — | reconstructed | distance, exemptions, threshold, Long Range and formula |

### `CombatDistanceUnit`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005BB234` | `$005BB2FE` | — | reconstructed | four coordinate reads and distance call |

## Completion declaration

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

R5.2i classified `HasGlobalEnchantment` and `CombatDistance` as calculator-relevant. R5.2k
subsequently reconstructed both complete callees in
[`Combat.CallClosureHelpers.pas`](./Combat.CallClosureHelpers.pas), with durable proof in
[`Combat.CallClosureHelpers.R5.2k.evidence.md`](./Combat.CallClosureHelpers.R5.2k.evidence.md).

Verifier totals, run separately: `GetEffectiveResistance` 12/12 branches, 0 calls, 0 writes;
`ResistanceRoll` 5/5, 4/4, 0; `AttackRoll` 4/4, 1/1, 0; `DefenseRoll` 5/5, 1/1, 0;
`EffectiveDefense` 26/26, 0, 2/2; `RangedPenalty` 6/6, 2/2, 1/1;
`CombatDistanceUnit` 0, 1/1, 0. All seven ledgers are contiguous and all seven declare zero
parent mismatches.
