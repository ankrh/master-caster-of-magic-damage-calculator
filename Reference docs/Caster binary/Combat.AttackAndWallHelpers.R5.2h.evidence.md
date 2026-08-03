# R5.2h attack-flag, flight and wall-helper reconstruction evidence

Durable evidence for the ten R5.2h extents in the pinned `Caster.exe`. The complete source-shaped
bodies are in [`Combat.AttackAndWallHelpers.pas`](./Combat.AttackAndWallHelpers.pas).

Codex cold-derived and byte-level self-reviewed all ten extents as a single agent on 2026-08-02
at the user's direction. No Claude derivation or review was read or produced during that pass.
Claude reviewed all ten extents against the binary on 2026-08-03. The review found one semantic-
name defect in `mergeflags`: three equivalent `Min` blocks were attached to the wrong rider
names. Codex re-read the cited bytes and corrected the source and evidence on 2026-08-03; no
control-flow or arithmetic change was required. The other nine extents survived unchanged.

## ABI and data-layout evidence

- TD32 gives exact locals for every named routine. `mergeflags` receives `f` in EAX and `f2` in
  EDX; all other two-argument routines use EAX then EDX. The unnamed routine has the same
  two-register shape and returns its Boolean in AL.
- `AttackFlagsT` is copied as `$13` dwords elsewhere in `ApplyAttack`, and its field order is the
  exact `Typedec.pas` declaration. This routine's byte offsets `$00..$0A` and dword offsets
  `$0C..$20` match it without padding.
- `Ismissileranged` checks the 1-based range `1..100`, multiplies the ID to a 16-byte stride, and
  reads byte `+$0C` through pointer global `$0070A144` (`$00596455..$00596474`). The adjacent
  `Ismagicalranged` routine reads `+$0D`; shipped `RangedType.INI` calls these fields `IsMissile`
  and `IsMagic`.
- The unit record stride is `$0784` bytes. The executable's scaled addressing resolves the fields
  used by `canattackflier`, `CrushWall`, and `Insidewalls` to the offsets shown in the source;
  `Insidewalls` deliberately reads the base record's combat coordinates.
- `CityT` has 100 one-byte `Buildings` followed by one-byte `Enchantments`. With exact constants
  `BCityWalls=37` and `CEWallOfFire=1`, the two reads are 64 bytes apart, exactly matching
  `$0ADADD7C` and `$0ADADDBC`. A city enchantment uses `-1` as absent, hence `>= 0`; a building
  uses a positive value, hence `>= 1`.
- `GetWallState` and `SetWallState` use the same 12-dword combat-state array through global
  pointer `$0070969C`. Their indexed operand's `+$44EC` is lower-bound-biased: with restored
  1-based index `w`, element 1 is physically at `+$44F0` and element 12 at `+$451C`.
  `destroywall` proves the state transition `1 -> 2`; other states are unchanged. R5.2l's
  durable evidence records the complete mapping and the offset correction.
- The unnamed `$005B3ECC` routine is the coordinate form of `Insidewalls`: the public CAS API
  independently declares `Insidewalls(u)` and `Insidewalls(x,y)` overloads, and the named unit
  overload calls it with `BaseUnits[u].cox/coy`.

## Findings

`mergeflags` merges flags in this exact order: Doom, Illusion, Supernatural, Armor Piercing,
Mystic Surge, Life Steal, Death Touch, Poison, Destruction, Stoning Touch, Exorcise. A true
source Boolean sets a false destination Boolean. When both copies already carry a valued rider,
Life Steal, Death Touch, Destruction, Stoning Touch and Exorcise keep the lower value with `Min`;
Poison instead adds the two values. A false source leaves the destination untouched.

`Ismissileranged` is table-driven, not a hard-coded ID range: nonpositive IDs return false,
while positive IDs return `RangedType[rt].IsMissile` (with the compiled 1..100 bound). In the
shipped CoM2 table IDs 20 and 21 are marked; Warlord also marks ID 22.

`canattackflier` returns true, in short-circuit order, for positive Thrown, Fire Breath or
Lightning Breath; Flying; present Stoning or Death Gaze; or nonzero Doom Gaze. The first two gaze
fields use 100 as their absent sentinel. Ordinary ranged is not part of this helper because its
`ApplyAttack` use is the flying-defender melee-eligibility gate.

`CrushWall(u)` requires the calculated unit's Wall Crusher flag and rejects a unit whose current
owner equals the combat defender owner. `Insidewalls(u)` uses the base record's combat
coordinates; a tile is inside exactly when `x in 6..9` and `y in 10..13`, inclusive.

`HasWallOfFire` and `HasWall` first locate the combat city from the combat plane/x/y globals. A
nonpositive city ID returns false. Otherwise they test `City.Enchantments[CEWallOfFire] >= 0` and
`City.Buildings[BCityWalls] >= 1`, respectively.

`GetWallState` maps coordinates to one of 12 wall slots with `ctws`; a nonpositive slot returns
zero. `destroywall` changes only intact state 1 to broken state 2 through `SetWallState`.

## Raw-byte self-review

- All ten required inbound scans were rerun over their whole assigned extents. The nine named
  TD32 routines report no straddling outer gate; the unnamed `$005B3ECC` routine lies between
  TD32 extents and has no containing symbol, while its callers enter exactly at `$005B3ECC` and
  its semantic `ret` is followed only by the three-byte alignment instruction at `$005B3F01`.
- The `mergeflags` destination/source binding was rechecked from the prologue bytes
  `$005B1636 8955F8` (`f2 := EDX`) and `$005B1639 8945FC` (`f := EAX`). The five repeated rider
  paths all call `@Game@Min`; Poison alone uses `$005B1721 014210 add [edx+$10],eax`. Its
  overflow sequence `$005B1724 711A` / `$005B1726 E8BD57E5FF` is compiler-only and does not
  change ordinary addition semantics.
- The ranged-type stride was rechecked in both adjacent classifier routines. Missile reads
  `$00596474 807CC2FC` (`rt * $10 - 4`, field `+$0C`), while Magic reads
  `$00596428 807CC2FD` (field `+$0D`). This rules out a hard-coded `20..21` interpretation.
- Every `canattackflier` short-circuit target was opened. All seven successful arms land at
  `$00595539 C645FB01`, and the only false write is `$00595533 C645FB00`. The two `cmp ...,64`
  instructions are inequality tests against the exact absent sentinel 100, not positive-value
  tests.
- The unnamed coordinate predicate was reread as signed inclusive bounds: `x < 6`, `x > 9`,
  `y < 10`, and `y > 13` each branch to `$005B3EF6 C645F700`; only the fall-through writes True
  at `$005B3EF0 C645F701`. `Insidewalls(u)` reads `BaseUnits[u]+$4EC` into EDX and `+$4E8` into
  EAX before calling it.
- The city-array field identities were recalculated from the exact `CityT` order and constants,
  not inferred from names. One-byte `Buildings[37]` to one-byte `Enchantments[1]` is 64 bytes,
  matching `$0ADADD7C -> $0ADADDBC`. The signed comparisons encode `Enchantments[1] >= 0` and
  `Buildings[37] >= 1` exactly.
- Wall-state reads and writes use the same `ctws` result and combat-state array. The decisive
  bytes are `$005BB7E7 48 dec eax`, `$005BB7E8 7510 jne $005BB7FA`, followed on equality by
  `$005BB7EA B902000000 mov ecx,2` and the `SetWallState` call: only state 1 becomes state 2.

The later Claude review found the three-block rider-label defect described in the provenance
note above; the correction does not change any branch, call, write, or arithmetic operation.

## Prose and table cross-check

- CoM2 helptext says Wall Crusher destroys a wall section a unit moves through or attacks into
  (`CoM2 helptext.TXT:1978-1981`). The manual lists Wall Crusher on qualifying units but does not
  define its trigger. The binary adds the defending-owner exclusion used by `CrushWall`.
- CoM2 helptext says Wall of Fire hits each enemy non-flying figure moving or attacking through
  the wall (`CoM2 helptext.TXT:834-840`); the manual gives the same moving-or-attacking rule and
  strength 10 fire damage (`CoM2 manual.txt:4312-4318`). R5.2h only establishes detection of the
  city enchantment; R5.2d/g own delivery and damage.
- Both prose sources agree that intact City Walls grant +3 Defense and a destroyed segment grants
  +1 (`CoM2 helptext.TXT:2795-2798`; `CoM2 manual.txt:840-845`). This agrees with state 1 changing
  to state 2 here and the reconstructed `ApplyAttack` selection of intact/broken bonuses.
- Helptext defines Missile Immunity as protection from sling and bow ranged attacks
  (`CoM2 helptext.TXT:2054-2057`). The manual repeatedly distinguishes missile from magical
  ranged attacks but does not enumerate the table classifier. The executable delegates it to
  moddable `RangedType.INI`.
- The manual's safe-flee rule refers broadly to whether the enemy has any way to damage a flying
  unit (`CoM2 manual.txt:277`); neither prose source supplies `canattackflier`'s exact seven-arm
  channel list. No prose conflict was found.

## Semantic conditional branches

Every row quotes the encoded jump, target, and what begins at the target.

### `mergeflags`

| Jump | Target | Target contents |
|---|---:|---|
| `$005B1642 7406 je` | `$005B164A` | begin Illusion merge |
| `$005B1651 7407 je` | `$005B165A` | begin Supernatural merge |
| `$005B1661 7407 je` | `$005B166A` | begin Armor Piercing merge |
| `$005B1671 7407 je` | `$005B167A` | begin Mystic Surge merge |
| `$005B1681 7407 je` | `$005B168A` | begin Life Steal merge |
| `$005B1691 7435 je` | `$005B16C8` | begin Death Touch merge |
| `$005B169A 7419 je` | `$005B16B5` | copy first Life Steal flag/value |
| `$005B16CF 7435 je` | `$005B1706` | begin Poison merge |
| `$005B16D8 7419 je` | `$005B16F3` | copy first Death Touch flag/value |
| `$005B170D 7431 je` | `$005B1740` | begin Destruction merge |
| `$005B1716 7415 je` | `$005B172D` | copy first Poison flag/value |
| `$005B1747 7435 je` | `$005B177E` | begin Stoning Touch merge |
| `$005B1750 7419 je` | `$005B176B` | copy first Destruction flag/value |
| `$005B1785 7435 je` | `$005B17BC` | begin Exorcise merge |
| `$005B178E 7419 je` | `$005B17A9` | copy first Stoning Touch flag/value |
| `$005B17C3 7435 je` | `$005B17FA` | routine epilogue |
| `$005B17CC 7419 je` | `$005B17E7` | copy first Exorcise flag/value |

### Remaining routines

| Jump | Target | Target contents |
|---|---:|---|
| `$0059644D 7D06 jge` | `$00596455` | valid-positive ranged-type table access |
| `$00596479 7406 je` | `$00596481` | return False for an unset `IsMissile` byte |
| `$0059540D 0F8F26010000 jg` | `$00595539` | return True: positive Thrown |
| `$0059543F 0F8FF4000000 jg` | `$00595539` | return True: positive Fire Breath |
| `$00595471 0F8FC2000000 jg` | `$00595539` | return True: positive Lightning Breath |
| `$005954A3 0F8590000000 jne` | `$00595539` | return True: Flying |
| `$005954D5 7562 jne` | `$00595539` | return True: Stoning Gaze differs from absent sentinel 100 |
| `$00595503 7534 jne` | `$00595539` | return True: Death Gaze differs from absent sentinel 100 |
| `$00595531 7506 jne` | `$00595539` | return True: Doom Gaze is nonzero |
| `$005B32F5 743A je` | `$005B3331` | return False: no Wall Crusher |
| `$005B332B 7404 je` | `$005B3331` | return False: unit belongs to defending owner |
| `$005B3EDC 7C18 jl` | `$005B3EF6` | return False: `x < 6` |
| `$005B3EE2 7F12 jg` | `$005B3EF6` | return False: `x > 9` |
| `$005B3EE8 7C0C jl` | `$005B3EF6` | return False: `y < 10` |
| `$005B3EEE 7F06 jg` | `$005B3EF6` | return False: `y > 13` |
| `$005B4065 7F06 jg` | `$005B406D` | positive city ID; access city enchantments |
| `$005B4099 7C06 jl` | `$005B40A1` | return False: Wall of Fire slot is negative/absent |
| `$005B40D5 7F06 jg` | `$005B40DD` | positive city ID; access city buildings |
| `$005B4109 7C06 jl` | `$005B4111` | return False: City Walls value is below one |
| `$005BB756 7E21 jle` | `$005BB779` | return wall state zero for no wall slot |
| `$005BB7E8 7510 jne` | `$005BB7FA` | epilogue; wall state is not intact state 1 |

`Insidewalls(u)` has no conditional branch; it delegates directly to the reconstructed coordinate
overload.

## Semantic calls

| Addresses | Target / role |
|---|---|
| `$005B16A8`, `$005B16E6`, `$005B175E`, `$005B179C`, `$005B17DA` | `@Game@Min` for repeated Life Steal, Death Touch, Destruction, Stoning Touch, and Exorcise values |
| `$005B3F4D` | unnamed coordinate overload reconstructed in the source companion |
| `$005B4059`, `$005B40C9` | `@Map@cityontile(CombatPlane, CombatX, CombatY)` |
| `$005BB74A` | `@Combat@ctws(cx, cy)` wall-slot lookup |
| `$005BB7E2` | `@Combat@GetWallState(cx, cy)` |
| `$005BB7F5` | `@Combat@SetWallState(cx, cy, 2)` |

The integer-overflow call after Poison addition and all range/overflow guard calls are
compiler-only. They do not replace or hide semantic callees.

## Coverage ledgers

### `mergeflags`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B1630` | `$005B17FA` | — | reconstructed | complete ordered flag/value merge |
| 1 | `$005B17FA` | `$005B17FE` | — | compiler-only | epilogue |

### `Ismissileranged`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$00596440` | `$00596485` | — | reconstructed | positive-ID gate and table classification |
| 1 | `$00596485` | `$0059648C` | — | compiler-only | return load and epilogue |

### `canattackflier`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005953D8` | `$0059553D` | — | reconstructed | complete short-circuit attack-channel predicate |
| 1 | `$0059553D` | `$00595544` | — | compiler-only | return load and epilogue |

### `CrushWall`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B32BC` | `$005B3331` | — | reconstructed | Wall Crusher and defending-owner predicate |
| 1 | `$005B3331` | `$005B3338` | — | compiler-only | return load and epilogue |

### unnamed coordinate overload

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B3ECC` | `$005B3F01` | — | reconstructed | inclusive inside-wall rectangle predicate |
| 1 | `$005B3F01` | `$005B3F04` | — | compiler-only | alignment instruction |

### `Insidewalls`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B3F04` | `$005B3F55` | — | reconstructed | base-coordinate read and coordinate-overload call |
| 1 | `$005B3F55` | `$005B3F5C` | — | compiler-only | return load and epilogue |

### `HasWallOfFire`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B403C` | `$005B40A5` | — | reconstructed | combat-city lookup and Wall of Fire slot test |
| 1 | `$005B40A5` | `$005B40AC` | — | compiler-only | return load and epilogue |

### `HasWall`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B40AC` | `$005B4115` | — | reconstructed | combat-city lookup and City Walls building test |
| 1 | `$005B4115` | `$005B411C` | — | compiler-only | return load and epilogue |

### `GetWallState`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005BB738` | `$005BB77E` | — | reconstructed | wall-slot lookup and state read/default |
| 1 | `$005BB77E` | `$005BB785` | — | compiler-only | return load and epilogue |

### `destroywall`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005BB7D0` | `$005BB7FA` | — | reconstructed | intact-state test and transition to broken state |
| 1 | `$005BB7FA` | `$005BB7FE` | — | compiler-only | epilogue |

## Completion declarations

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Verifier totals across all ten extents: 38/38 semantic conditional jumps, 11/11 semantic calls,
23/23 classified writes, 20 contiguous ledger rows, and 0 declared parent mismatches.
