# MoM 1.31 binary analysis

Ground truth for the DOS-era mechanics: the shipped executables. Use this when prose sources
disagree, or when ReMoM's C is incomplete — the binary outranks both. Primarily MoM 1.31; MoM
CP 1.60 and CoM 1 are covered where they have been read, since all three are patched builds of
the same executable.

## The binaries

The single home for these paths and hashes — nothing else in the repo restates them. All three
ship in the Steam *Master of Magic Classic* depot, which on this machine is installed at
`C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic`. Verify the hash before
trusting any offset below.

| Version | Path | md5 | Size |
|---|---|---|---|
| MoM 1.31 | `C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic\Master of Magic Official Release\WIZARDS.EXE` | `4123a5e17b7829dcb4457bd3c83cce3d` | 1,001,232 |
| MoM CP 1.60 | `C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic\Master of Magic Community Patch\WIZARDS.EXE` | `7700b989590cd71f0535d62c5079e230` | 1,001,232 |
| CoM 1 | `C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic\Master of Magic Caster of Magic DLC\WIZARDS.EXE` | `d92830af2c18fd57e82f26d6c690af82` | 1,006,232 |
| MoM 1.31 spell table | `C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic\Master of Magic Official Release\SPELLDAT.LBX` | `16e1e3ded5074a67578ab2d6b0935725` | 8,288 |
| MoM CP 1.60 spell table | `C:\Program Files (x86)\Steam\steamapps\common\Master of Magic Classic\Master of Magic Community Patch\SPELLDAT.LBX` | `e1e051f736efb62c8b469a85770cfa83` | 8,288 |

All three are patched builds of the same 1991 Borland executable, but they differ in how far
they drift from 1.31's addresses:

- **CP 1.60 is a same-size, in-place patch.** Identical file length, and `BU_ProcessAttack`
  begins at the same `0x999C9` with the same `sub sp,0x2E` frame. 103,208 bytes differ across
  the whole file in 1,342 clusters, but **only 192 of `BU_ProcessAttack`'s 3,006 bytes**. So
  every 1.31 offset below re-reads at the same address in CP 1.60, and diffing the two localises
  what the community patch actually changed: a "1.31 does X, 1.60 fixed it" claim is false if the
  region implementing X is byte-identical.
- **CoM 1 keeps the layout but not the offsets.** Same `BATTLE_UNIT` offsets and
  `BU_ProcessAttack` still at `0x999C9`, but a larger frame (`sub sp,0x34` vs `0x2E`) and
  internals shifted by tens of bytes. Patched regions are recognisable by `nop` padding.
  Re-locate rather than assuming MoM's addresses.

CoM2 and Warlord are a different engine entirely (`Caster.exe`) and none of this applies to them.

Borland C++ 1991 with VROOMM overlays (`INT 3Fh` thunks). Not packed. 218 KB load module,
772 KB of overlay data after it. There is no symbol table. The executable's `FBOV` record,
segment table, resident stub descriptors and five-byte `CD 3F` thunks do provide a complete
overlay→file-offset map; `tools/resolve_dos_overlays.py` decodes it, and
`Reference docs/DOS reconstructed/R6.version-differences.md`, *VROOMM overlay resolution*, owns
the byte-chain evidence and validation. ReMoM's `WZD o###p##` tags remain overlay/proc identifiers
with no published mapping to these raw offsets, and its `doc/__TODO-ProjectOverview.md` table lists
*Combat.c line ranges*, not file offsets.

## Method

Struct field offsets are stable and rare enough to serve as search anchors. `tools/scan_mom_binary.py`
implements this:

```
scan_mom_binary.py find WIZARDS.EXE 0x04 0x24 0x25   # regions touching all three fields
scan_mom_binary.py dis  WIZARDS.EXE 0x99A63 0xD0     # disassemble (capstone, 16-bit)
```

`find` matches byte-operand instructions with mod=01 and rm≥4 — the `[si]/[di]/[bp]/[bx]`
bases Borland uses for struct pointers — then clusters co-occurrences. Requiring two or three
fields within one window cuts hundreds of hits to a handful. Field offsets come from ReMoM's
`MoX/src/MOM_DAT.h`; the tool carries a copy of the common ones.

For a known far-call operand, resolve the VROOMM target directly:

```
resolve_dos_overlays.py WIZARDS.EXE 0x3d0 0x43   # -> file 0x9A587
```

`tools/audit_dos_call_closure.py` combines that resolver with the assigned R6 extents to enumerate
near and far calls through the second level.

Disassembly starting mid-instruction produces a line or two of garbage before resyncing —
start a little early and ignore the first lines. **Bound the function before making any claim
about what it does or does not contain**: decode forward from the `55 8B EC 83 EC xx` prologue
to the `5F 5E 8B E5 5D CB` (`pop di/si / mov sp,bp / pop bp / retf`) epilogue. A hand-picked
window is not a function.

### Naming a flag bit

Do not infer a bit's identity from ReMoM's enum order. The executable carries its own
name→mask tables: 8-byte records of `name_ptr, mask, ...`. Recover the data base from one known
string (`Armor Piercing` at file `0x2D6CE`, `name_ptr` `0x422E` in the first record at
`0x2D0B0` ⇒ base `0x294A0`), then walk the table.

**`attack_attributes` (+0x1E / +0x28 / +0x2A)** — table at `0x2D0B0`. Records past
`Dispel Evil` decode as garbage, so the format changes there; this covers `0x0001`–`0x0800` only.

| Mask | Name in table | Mask | Name in table |
|---|---|---|---|
| `0x0001` | Armor Piercing | `0x0040` | Illusion |
| `0x0002` | First Strike | `0x0080` | Stoning Touch |
| `0x0004` | Poison | `0x0200` | Death Touch |
| `0x0008` | Life Steal | `0x0400` | Power Drain |
| `0x0010` | Automatic Damage (ReMoM's `DoomDmg`) | `0x0800` | Dispel Evil |
| `0x0020` | Destruction | | |

**`Attribs_1` (+0x18)** — table at `0x2D020` (dseg `0x3B80`), same 8-byte record shape but
`name_ptr` points at the string directly. All ten records decode cleanly.

| Mask | Name in table | Mask | Name in table |
|---|---|---|---|
| `0x0001` | Fire Immunity | `0x0020` | Magic Immunity |
| `0x0002` | Stoning Immunity | `0x0040` | Death Immunity |
| `0x0004` | Missiles Immunity | `0x0080` | Poison Immunity |
| `0x0008` | Illusions Immunity | `0x0100` | Weapon Immunity |
| `0x0010` | Cold Immunity | `0x0400` | Lucky |

**Unit enchantments (`_UNITS[].enchantments` +0x18, battle-unit `+0x3A`)** — table at
**`0x2D13E`**, **10-byte** records of `name_ptr, u32 mask, spell_id, ?`. The dword is stored low
word first, so code testing the high bits reads `+0x3C` (battle unit) or the second local word.
All 32 records decode cleanly:

| Mask | Name | Mask | Name |
|---|---|---|---|
| `0x00000001` | Immolation | `0x00010000` | Wind Walking |
| `0x00000002` | Guardian Wind | `0x00020000` | Flight |
| `0x00000004` | Berserk | `0x00040000` | Resist Magic |
| `0x00000008` | Cloak Of Fear | `0x00080000` | Magic Immunity |
| `0x00000010` | Black Channels | `0x00100000` | Flame Blade |
| `0x00000020` | Wraith Form | `0x00200000` | Eldritch Weapon |
| `0x00000040` | Regenerate | `0x00400000` | True Sight |
| `0x00000080` | Path Finding | `0x00800000` | Holy Weapon |
| `0x00000100` | Water Walking | `0x01000000` | Heroism |
| `0x00000200` | Resist Elements | `0x02000000` | Bless |
| `0x00000400` | Elemental Armor | `0x04000000` | Lion Heart |
| `0x00000800` | Stone Skin | `0x08000000` | Giant Strength |
| `0x00001000` | Iron Skin | `0x10000000` | Planar Travel |
| `0x00002000` | Endurance | `0x20000000` | Holy Armor |
| `0x00004000` | Spell Lock | `0x40000000` | Righteousness |
| `0x00008000` | Invisibility | `0x80000000` | Invulnerability |

Two independent cross-checks that the alignment is right: `BU_Apply_Specials` maps
`0x00400000` (True Sight) to `Attribs_1 |= 0x0008` (Illusions Immunity) at `0x8F348`, and
`0x80000000` (Invulnerability) to `Attribs_1 |= 0x0100` (Weapon Immunity) at `0x8F369`.

Borland compiles a test of one of these as the triple `and dx,<hi> / and ax,<lo> / or dx,ax`,
which is what makes a mask greppable: Holy Weapon's is `81e28000` (`and dx,0x0080`).

**Unit mutations (`_UNITS[].mutations`, +0x17)** — a byte, not a battle-unit field, passed into
`BU_Apply_Specials` as its third argument. From ReMoM's `MUT_FLAGS`, confirmed by the blocks each
bit drives (see *`BU_Apply_Specials`* below): `0x01`–`0x03` weapon quality (Magic / Mithril /
Adamantium), `0x04` Chaos Channels Demon-Skin Armor, `0x08` Chaos Channels Demon Wings, `0x10`
Chaos Channels fire breath, `0x20` Undead, `0x40`/`0x80` Stasis.

**`Combat_Effects` (+0x22)** — a second table in the same 10-byte format runs straight on from
the unit-enchantment one, at `0x2D27E`: `0x0001` Vertigo, `0x0002` Confusion, `0x0004`
Whirlwind, `0x0008` Mind Storm, `0x0010` Shatter, `0x0020` Weakness, `0x0040` Black Sleep,
`0x0080`/`0x0100`/`0x0200` Warp Creature (attack/defence/resist), `0x0400` **Mind Twist**,
`0x0800` Haste, `0x1000` Web, `0x2000` Creature Binding, `0x4000` Possession. This agrees with
ReMoM's `USW_Combat_FX` (`MoM/src/UnitView.c`) on every bit except `0x0400`, which ReMoM calls
Mana Leak. The stat writes each mask drives (*Combat-effect stat writes* below) corroborate the
rest.

### Ranged attack types (`ranged_type`, +0x02)

Several gates test `ranged_type / 10`, so the decades matter as much as the values. From
ReMoM's `MoM/src/UNITTYPE.h`, confirmed by the branches that consume them:

| Value(s) | Meaning |
|---|---|
| `0` | none |
| `10`–`19` | Rock, Cannon ("boulder") |
| `20`–`29` | Bow, Sling ("missile") |
| `30`–`39` | magic ranged |
| `100` | Thrown |
| `101`, `102` | Fire Breath, Lightning Breath |
| `103`, `104`, `105` | Stoning Gaze, Multi Gaze, Death Gaze |

`0x99B46`–`0x99B63` corroborates the top end: type `102` ORs Armor Piercing into
`attack_attributes` (Lightning Breath) and type `104` ORs Automatic Damage (Doom Gaze).

### Known anchors

| Thing | Value |
|---|---|
| `BATTLE_UNIT` size | `0x6E` |
| `battle_units[]` base pointer | `[0x922a]` (far ptr, loaded via `les`) |
| Array index idiom | `mov ax,<idx> / mov dx,0x6E / imul dx / les bx,[0x922a] / add bx,ax` |
| `BU_ProcessAttack` | `0x999C9`–`0x9A586` (prologue to `retf`) |
| `BU_AttackTarget` (its caller) | `0x99292`–`0x999C8` |
| Battle-unit stat recompute (far `BATTLE_UNIT*` in `[bp+6]`) | `0x8FF09`–`0x90B8D`; fully reconstructed in `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1c.evidence.md` and `R6.1d.evidence.md`. CoM 1 additionally executes a same-frame relocated block at `0x90B8E`–`0x90BFF`, returning to `0x905BB` |
| `BU_Apply_Specials(bu*, enchantments u32, mutations u8)` | `0x8F310`–`0x8F880` — same entry in all three builds, but **1.31 alone ends there**. CP 1.60 and CoM 1 replace the epilogue with a `jmp` at `0x8F87E` to a relocated tail carrying that build's only `retf`: `0x8F197`–`0x8F26E` (CP 1.60) and `0x8F15C`–`0x8F233` (CoM 1). Full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1a.evidence.md` |
| `Load_Battle_Unit` — unit-type import and battle-record setup | `0x8EAB9`–`0x8EDFC` in all three builds; full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/D41.evidence.md` |
| Battle-unit constructor (its other caller) | `0x8EDFD`–`0x8F30F`; full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1b.evidence.md` |
| Constructor hero-item callee | `0x8DBD0`–`0x8E038` in all three builds; full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1e.evidence.md` |
| Item-power helper | `0x8E039`–`0x8E4C3` in all three builds; full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1g.evidence.md` |
| Item attack-special helper | `0x8E4C4`–`0x8E667` in all three builds; full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1h.evidence.md` |
| Constructor hit-point callee | `0x8E668`–`0x8E84F` in MoM 1.31/CP 1.60 and `0x8E668`–`0x8E7A9` in CoM 1; full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1e.evidence.md` |
| Recompute hit-point callee | `0x8E850`–`0x8EAB8` in all three builds; full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1g.evidence.md` |
| `Unit_Moves2` — overland maximum movement | `0x98494`–`0x986BC` in all three builds; MoM/CP call through `0x03C8:0x0043`, while CoM replaces the constructor path. Full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.5c.evidence.md` |
| `Calc_Battlefield_Bonuses` — side maxima and combat-enchantment import | `0x9A8AB`–`0x9AD03` in all three builds; exported as `03D0:004D`, with CoM jumping to a relocated continuation at `0x99874`. Full reconstruction: `DOS reconstructed/combat.c`, evidence `DOS reconstructed/R6.5d.evidence.md` |
| `BU_UnitLoadToBattle` — persistent-unit load, picture-slot selection and CoM identity tail | `0x75C69`–`0x75D93` in all three builds; full reconstruction: `DOS reconstructed/combat.c`, evidence `DOS reconstructed/R9-G1a-R1.evidence.md` |
| CoM 1 `Battle_Unit_Moves2` | `0x9F12D`–`0x9F2D3`, with private near helpers through `0x9F2F0`; called through far `0x03E0:0x003E` at `0x90BE9`. Full reconstruction: `DOS reconstructed/unitcalc.c`, evidence `DOS reconstructed/R6.1g.evidence.md` |
| `Distance(bu_a, bu_b)` — Chebyshev, over `+0x44`/`+0x46` | `0x9B50C`–`0x9B58F`; reconstructed in `DOS reconstructed/combat.c`, evidence `DOS reconstructed/R6.2d.evidence.md` |
| `Has_Ranged_Attack(bu_idx)` — `0 < ranged_type < 100` | `0x9BB03`–`0x9BB3D`; reconstructed in `DOS reconstructed/combat.c`, evidence `DOS reconstructed/R6.2d.evidence.md` |
| `Check_Wall_Of_Fire_Attack` | ends `retf` at `0x9EE84` |
| `Target_Unit_Value` (AI estimator, *not* a combat path) | `0x9B590`–`0x9BB02` |
| Weapon-quality stat block | `0x8F060`–`0x8F0FF` |
| Name→mask tables | `0x2D0B0` (`attack_attributes`), `0x2D020` (`Attribs_1`), `0x2CFA8` (`Abilities`), `0x2D13E` (unit enchantments), `0x2D27E` (`Combat_Effects`); data base `0x294A0` |
| Unit-type table | full records at `0x2963C` (dseg `0x19C`), stride `0x24`, indexed by `_UNITS[].+0x05`; record +0 name pointer, +2 melee, +3 ranged, +4 `ranged_type`, +5 ammo. The older `0x2963E` / dseg `0x19E` anchor is the first-stat payload base |
| Player record stride / global-enchantment bytes | stride `0x4C8`; Chaos Surge at `[0xA356]`, Holy Arms at `[0xA35F]`, CoM 1 Survival Instinct at `[0xA363]` for player 0 |

The unit-type table's first four stat columns are confirmed by decoding all 35 hero records and
matching them row-for-row against `Calculator/units_mom.js` (roster id = record index + 1).
R9-G1a-R3 additionally binds the CoM 1 Zombies (`0xAE`) record by its name pointer and locates its
`Abilities` word at record `+0x1E`, raw `0x2AED2`; no other ability row is established by that
item, so read flags only where a dedicated binding exists.

## Verified findings

### CoM 1 Zombies type-table binding (resolved 2026-08-09)

R9-G1a-R3 locates the full CoM 1 `unit_types` record base at `DS:0x019C` / raw `0x2963C`, with a
word name pointer at record `+0x00` and stride `0x24`; the earlier `DS:0x019E` figure is the
first-stat payload base. The Zombies row is type `0xAE`, starts at raw `0x2AEB4`, and carries
`Abilities = 0x0081` at record `+0x1E` / raw `0x2AED2`. `BU_Construct` loads the full word at
`0x8EEC3` and copies it to `bu->Abilities` at `0x8EF02` (`26 89 47 1C`). The merged source is in
`DOS reconstructed/unitcalc.c`; ledgers, counts, findings, review provenance and the disputed
evidence-scope readings are in `DOS reconstructed/R9-G1a-R3.evidence.md`.

Verified: Claude 2026-08-09; Codex 2026-08-09, independent. The executable result is undisputed;
Q26 records only whether the extended raw-data corroboration belongs inside this narrow item.

### Combat-loaded identity and picture slots (resolved 2026-08-09)

R9-G1a-R1 reconstructed `BU_UnitLoadToBattle` across all three DOS builds. The merged body is in
`DOS reconstructed/combat.c`; gapless ledgers, inventories, counts, findings, and dual-review
provenance are in `DOS reconstructed/R9-G1a-R1.evidence.md`.

CoM 1 changes Paladins to Life and Centaurs or Catapults to Nature, then marks every successful
load Fantastic. The failed low-index Demon random path alone skips those identity writes and
returns `-1`; the grant path adds its save, immunity, touch, and mana package. In all three builds
the return from `Combat_Figure_Load`, not merely the selected slot, is stored as `bufpi`. CP and
CoM replace 1.31's separate picture-slot opener with a bottom-tested in-line occupancy scan whose
occupancy indexing and free-slot search have no upper-bound check.

### Combat-resolution helper closure (resolved 2026-08-07)

R6.2d reconstructed twelve helper extents in all three builds. The shared C is in
`DOS reconstructed/combat.c`; complete inventories, ledgers, counts, merged findings, and
dual-review provenance are in `DOS reconstructed/R6.2d.evidence.md`.

The closure confirms that the natural-10 To Hit floor exists in all three builds, CoM applies To
Block only to the first fifteen defense dice, CP/CoM repair 1.31's unreachable Thrown Weapon
Immunity arm, and CoM reclassifies Ice Bolt from Nature to Sorcery. It also bounds CoM's two
damage-floor helpers, its bottom-tested relocated battle-unit tail, and the `SpFx`-gated hero-mana
helper at `0x9AC1B..0x9AC8E`. No agent disagreement survived review.

### Battle-unit constructor across the DOS builds (resolved 2026-08-05)

R6.1b reconstructed the constructor instruction by instruction in all three builds; the shared C
is in `DOS reconstructed/unitcalc.c` and its complete ledgers, counts, findings and dual-review
provenance are in `DOS reconstructed/R6.1b.evidence.md`.

The constructor confirms and extends the findings below:

- CoM 1 initializes Zombies with `toblock = -1`, grants Golems Resist Elements, and changes a
  Catapult with `wp == 9` to mutation quality 1 (`0x8EE28`–`0x8EEAF`). The Catapult's fresh
  quality read sees the new value, while `BU_Apply_Specials` receives the older snapshot.
- CoM 1's near helper at `0x8F379` reads raw table bytes `B1 18 3E 0E C3 23`, overriding
  `mana_max` to 24 for Angel, 14 for Apprentices, and 35 for Djinn.
- The CoM-only player byte at `DS:0xA363` is Survival Instinct: for the controller's fantastic
  units it grants +1 Defense, +2 Resistance and +1 To Hit (`0x8F277`–`0x8F29E`), exactly matching
  both `CoM helptext.txt:194` and `CoM1manual.HTML:6803`–`:6814`.
- CP 1.60 jumps over 1.31's Flight movement floor; CoM 1 removes the floor and has no
  `movement_points` write in this constructor at all.
- All three builds clear accumulator bytes through `Grey_Resist` (`+0x6C`) but deliberately skip
  `Grey_Hits` (`+0x6D`). Only CP 1.60 and CoM 1 later copy the hit-point routine's `DL` result to
  `Gold_Hits`.

### Constructor hero-item and hit-point callees (resolved 2026-08-06)

R6.1e reconstructed both constructor callees instruction by instruction in all three builds. The
shared C is in `DOS reconstructed/unitcalc.c`; complete ledgers, counts, findings and dual-review
provenance are in `DOS reconstructed/R6.1e.evidence.md`.

- CoM 1 reuses the old Endurance, Giant Strength and Power Drain item bits for the powers its
  manual calls Teleportation, Inner Fire and Divine Protection. The executed writes match the
  manual's replacement effects: Teleportation adds the teleport movement bit; Inner Fire grants
  Fire and Cold immunity plus Immolation; Divine Protection grants Death immunity plus Lucky.
  Shipped helptext instead retains the old names and descriptions, so the prose conflict remains
  open as Q21.
- CoM 1 NOP-fills both blocks that formerly added Giant Strength's +1 melee attack (and the
  ranged twin). No write in this item's assigned extent implements the manual's promised Inner
  Fire +1 attack. R6.1g subsequently proved that the adjacent item-power helper at `0x8E039`
  never tests Inner Fire's raw `0x08000000` bit either, closing Q22 as a negative binary finding.
- Item attack bonuses are type-gated. Sword, Mace, Axe and Misc items can add melee. Bow items
  require missile ranged in both MoM builds; CoM 1 widens that signed ranged-class test to every
  class `<= 3`. Staff and Wand still require magical ranged, Axe requires raw Thrown, and Misc
  admits every ranged type.
- CP 1.60 and CoM 1 return a second hit value in `DX`; the constructor stores its low byte in
  `Gold_Hits`. Their routine also scans equipped items for Lion Heart and applies the Black
  Channels/Lion Heart hit floor, while CoM 1 delegates the per-figure base to its live
  eight-divided-by-figures helper.
- CoM 1 replaces the MoM hero/nonhero level ladders with its own increment tables. Charm of Life
  still contributes one hit before the terminal floor, but unlike MoM 1.31 it can reduce an
  already-negative intermediate value because CoM 1 omits the positive-value gate. A CP 1.60
  table-shaped block after the routine's return is unreachable residue; CoM 1 makes its homolog
  live.

### Item powers, recompute hit points, and CoM movement (resolved 2026-08-06)

R6.1g reconstructed the item-power helper and recompute hit-point routine in all three builds,
plus CoM 1's far `Battle_Unit_Moves2` target and both private near helpers. The shared C is in
`DOS reconstructed/unitcalc.c`; complete ledgers, inventories, counts, findings and dual-review
provenance are in `DOS reconstructed/R6.1g.evidence.md`.

- The item helper tests twenty power masks. CoM 1 turns Path Finding into Land Link, repurposes
  old Magic Immunity as a movement flag, and turns old Righteousness into Shadow's conditional
  Thrown attack. Holy Avenger uniquely tests `0x00200000` but grants Bless `0x02000000`.
- The helper never tests Inner Fire's raw `0x08000000` bit. Combined with R6.1e's NOP-filled old
  Giant Strength attack blocks, the complete hero-item path contains no +1 attack implementation.
- Recomputed hits merge persistent, runtime and item enchantments. 1.31 alone keeps Crusade's
  extra non-Fantastic level. CP removes Black Channels' Gold-Hits increment; CoM removes the
  whole Black Channels block and changes Lion Heart from flat +3 to unsigned
  `8 / Max_Figures`, retaining CP's runtime-only Gold-Hits gate.
- CoM `Battle_Unit_Moves2` uses signed base `Move_Halves` but unsigned unit-type/controller
  indices. It combines Mystic Surge, hero items, Logistics, Flight, Chaos Channels wings,
  Endurance, Haste and Entangle, then reconciles current movement through a cached prior maximum
  stored in the otherwise skipped `Grey_Hits` byte.
- The routine identifies `DS:0x3AC8` as the consumed per-controller Logistics maximum, but does
  not expose the level-to-table scaling. CoM helptext says +0.5 movement per two levels while the
  manual says +0.5 per level; that prose discrepancy remains Q23.

### Overland `Unit_Moves2` across DOS builds (resolved 2026-08-08)

R6.5c identifies exported `03C8:0043` as the overland `Unit_Moves2` routine at
`0x98494..0x986BD`. Its 553 bytes are identical in MoM 1.31 and CP 1.60; CoM retains a homolog at
the same address with exactly 17 differing bytes. The MoM/CP constructor calls it and stores the
returned movement byte. CoM replaces that constructor path with the R6.1g battle-unit movement
routine, but does not remove this old body.

The common body scans three hero items, loads signed base `Move_Halves`, combines item powers and
unit enchantments, applies Flight and Chaos Channels wings floors, adds the raw `0x00002000`
movement bonus and signed item movement, and then enters a Transport-only Wind Mastery block.
MoM/CP score every positive Wind Mastery holder relative to the signed unit owner: positive
balance applies signed low-word `3/2` movement and negative balance applies signed `1/2`, both
toward zero. CoM changes `0x98669` to an unconditional next-player jump, so its balance remains
zero; the retained owner/balance writes and patched double/no-op scaling arms are unreachable.
The routine makes no calls and writes no external state.

Verified: Codex-A 2026-08-08, independent; Codex-B 2026-08-08, independent; followed by
reciprocal review. Every review entry was resolved from quoted bytes; no disagreement survived.
Full evidence: `DOS reconstructed/R6.5c.evidence.md`.

### Item attack-special helper (resolved 2026-08-07)

R6.1h reconstructed `BU_Apply_Item_Attack_Specials` over `[0x8E4C4,0x8E668)` in all three
builds. The shared C is in `DOS reconstructed/unitcalc.c`; complete ledgers, branch/write
inventories, counts, merge findings and dual-derivation provenance are in
`DOS reconstructed/R6.1h.evidence.md`.

- All three builds execute the same 420 bytes at the same offsets. The helper maps nine item
  powers to attack-attribute flags: Vampiric→Life Steal, Lightning→Armor Piercing,
  Destruction→Destruction, Chaos→Automatic Damage, Death→Death Touch, raw `0x01000000`→Power
  Drain, Holy Avenger→Dispel Evil, Phantasmal→Illusionary, and Stoning→Stoning Touch
  (`0x8E4E6`–`0x8E65D`).
- Its callers select melee attack attributes at `0x8DE54` and ranged attack attributes at
  `0x8E004`; the helper writes the selected word once at `0x8E662` and touches no other state.
- CoM 1 repurposes item-power input `0x01000000` as Divine Protection in the preceding item
  application path, but this byte-identical helper still turns that raw input into attack flag
  `0x0400`, named Power Drain by the executable's table. A qualifying Divine Protection item
  therefore retains the old attack-special side effect in addition to its CoM defensive effects.

Verified: Claude 2026-08-07; Codex 2026-08-07, independent. The only surviving review
disagreement is how to render the build-specific input name in shared C; Q25 records it and does
not affect the byte or mechanic findings.

### Battle-unit stat recompute, first half (resolved 2026-08-06)

R6.1c reconstructed `0x8FF09`–`0x90634` in MoM 1.31/CP 1.60 and `0x8FF09`–`0x9064A`
in CoM 1 instruction by instruction. The shared C is in `DOS reconstructed/unitcalc.c`; complete
ledgers, counts, findings and dual-review provenance are in `DOS reconstructed/R6.1c.evidence.md`.

- MoM 1.31 and CP 1.60 are byte-identical throughout this half. Node aura grants +2 to the four
  combat stats for the matching Fantastic realm; its melee write is ungated while ranged requires
  a positive stat. Leadership reaches only non-Fantastic units, and its ranged value is the signed
  side-wide maximum divided by two (`0x8FF20`–`0x900C5`).
- Holy Bonus reaches melee and Defense in both MoM builds; CoM 1 additionally applies it to
  positive ranged attack (`0x900E8`–`0x900F7`). Resistance to All is a side-wide Resistance add.
  Both are consumed from the per-player maxima already identified at `[0xC89E]` and `[0xC89A]`.
- High Prayer supersedes rather than stacks with Prayer. The binary gives +2 melee, +2 Defense,
  +3 Resistance, +10% To Hit and +10% To Block; it never writes ranged attack
  (`0x9024E`–`0x903A1`).
- CoM 1 replaces MoM's early True Light/Darkness region with event and enchantment blocks. Three
  patched branches make Metal Fires ignore its old Fantastic and Flame Blade exclusions while
  excluding Thrown from its ranged +3 (`0x903C4`–`0x90490`). The same region carries Mass
  Invisibility, Warp Reality, Black Prayer and an unidentified `Move_Flags & 0x0400` To-Hit rider.
- CoM 1 wizard byte `+0x6A` is Guardian after the retort-block renumbering: in city combat it adds
  +1 To Hit, To Block and Resistance to defenders (`0x90589`–`0x905B4`). Battlefield raw
  `+0x1593` is Heavenly Light and grants its defender stat/weapon package
  (`0x905BB`–`0x9064A`).
- `0x905B8` leaves the first-half extent for the R6.1d same-frame relocated block at
  `0x90B8E`–`0x90BFF`; `0x90BFD` returns to the live Heavenly Light block at `0x905BB`.

### Battle-unit stat recompute, second half (resolved 2026-08-06)

R6.1d reconstructed `0x90635`–`0x90B8D` in MoM 1.31/CP 1.60, `0x9064B`–`0x90B8D`
in CoM 1, and CoM 1's same-frame tail `0x90B8E`–`0x90BFF`. The shared C is in
`DOS reconstructed/unitcalc.c`; complete ledgers, counts, findings and dual-review provenance
are in `DOS reconstructed/R6.1d.evidence.md`.

- CP 1.60 fixes Weakness's dead Thrown arm and Shatter's two `Grey_*` accounting writes. Its
  candidate player-byte `+0x6A` bonus block remains unreachable behind unconditional jumps.
- MoM 1.31's unknown `Combat_Effects 0x0400` block subtracts To Hit and Resistance but credits
  `Gold_Resist`, not `Grey_Resist` (`0x90860`–`0x90894`).
- MoM Warp Creature halves melee and Defense; CoM 1 also halves the shared ranged slot and
  divides Defense by three. CoM 1 performs Shatter, Darkness, Supreme Light, Tactician and
  Eternal Night after those reductions, so each later write lands at full value.
- CoM 1 Supreme Light has five eligibility paths: live magical ranged, Life race, mana,
  persistent Focus Magic, or magical base ranged. It adds melee unconditionally, gates only its
  ranged write on a positive stat, reads live signed `Resistance / 3`, and sets unidentified
  `Move_Flags 0x0100` (`0x90992`–`0x90A5B`).
- CoM 1 Realm Wards execute −2 To Hit, −3 Defense and −3 Resistance, conflicting with shipped
  helptext's −2/−4/−4. Tactician then grants +1 Defense to all controlled units and a total
  +2 Defense plus +2 melee/ranged/Resistance to heroes (`0x90A5C`–`0x90AFF`).
- The constructor-called near helper at `0x90B11` applies one cumulative Eternal Night
  Resistance penalty per other owner. Its loop is bottom-tested.
- The relocated tail consumes Guiding Beacon, Divine Barrier and Soul Linker side maxima before
  Heavenly Light, then calls still-unidentified far routine `0x03E0:0x003E` (`0x90B8E`–`0x90BFF`).

### To-hit assembly (resolved 2026-07-26)

`BU_ProcessAttack` builds `attack_tohit` in local `[bp-0x1a]`:

```
0x99A63  attack_tohit = tohit                    ; innate + experience level + hero abilities
0x99ACA  cmp attack_mode,0 ; jg → ranged path, else → melee path
MELEE  0x99C3F  attack_tohit += (melee_tohit - defender.toblock) ; 1.31
       0x99C3F  attack_tohit += melee_tohit                       ; CP 1.60
       0x99C11  attack_tohit += melee_tohit                       ; CoM 1
RANGED 0x99B64  cmp attack_mode,2 ; jne → skip to 0x99BE6
       0x99B82  attack_tohit += ranged_tohit
       0x99BDC  attack_tohit -= Range_Penalty
       0x99BE1  attack_strength = 0              ; only when Has_Ranged_Attack() is false
```

1. **Both branches use `+=`.** The base `tohit` is never discarded, so experience level,
   Blademaster and innate to-hit apply to every attack.
2. **Thrown and breath (`attack_mode == 1`) read the base `tohit` only.** They fail the
   `am_Ranged` test and never entered the melee branch, so neither `melee_tohit` nor
   `ranged_tohit` reaches them. Any bonus routed through an item or weapon-quality field is
   therefore invisible to thrown/breath in 1.31. **This is 1.31-only** — CP 1.60 and CoM 1
   hoist the `+= ranged_tohit` out of the `mode == 2` gate; see *Holy Weapon* below.
3. **Thrown keeps its attack strength.** The `attack_strength = 0` store is reached only from
   the `Has_Ranged_Attack` failure, not from the mode test. (`[bp-0x12]` is *also* zeroed at
   `0x99A4C` on entry, before the phase load — the point is that mode 1 keeps the strength it
   loads from `+0x01` at `0x99B0B`, not that no other zeroing exists.)

The base at `+0x04` really does carry the level and hero contributions: construction at
`0x8EE44` seeds it from the unit-type record while explicitly zeroing `+0x24`/`+0x25`/`+0x26`,
and the level routine at `0x8F881` increments `+0x04` per threshold (`0x8F927`, `0x8F9B9`,
`0x8FA52`, `0x8FAC6`, `0x8FAF9`, `0x8FB13`), as does hero-ability code at `0x8FC82`, `0x8FCD6`
and `0x8FEC8`.

This confirms `To Hit.md` in `MoM source - Fandom site/` and disproves `Thrown Attack.md:56`
("bonuses such as those received from Axes certainly do apply… improve the accuracy").

**The axe bonus is computed and then discarded, not absent.** Item application at `0x8DF1B`
adds the item's attack strength to `+0x01` and at `0x8DF4B` adds its to-hit to `+0x25`
(`ranged_tohit`), and the eligibility test at `0x8DEDF` explicitly admits item type 2 with
ranged type `0x64` — the Axe/Thrown case. So thrown gets the axe's *attack strength* (read from
`+0x01`) but never its to-hit, because mode 1 skips the only read of `+0x25`. A whole-function
scan finds exactly one read of `+0x24` (`0x99C21`) and one of `+0x25` (`0x99B82`).

### Ranged distance penalty (resolved 2026-07-27)

This closes former verification item **A24**. The whole mechanism is `0x99B97`–`0x99BDF`, at the same addresses
in all three builds:

```
0x99B97  ax = attacker.ranged_type (+0x02) / 10
0x99BA2  cmp ax,3 ; je 0x99BDF          ; magical ranged (30–39) pays nothing
0x99BAB  ax = Distance(defender, attacker)
0x99BB0  steps = ax / <divisor>
0x99BC6  if (.Abilities & 0x100 /*Long Range*/ && steps > 0) steps = 1
0x99BDC  attack_tohit -= steps          ; one step = −10 percentage points
```

**The version difference is the single divisor byte at `0x99BB0`:** `bb0300` (`mov bx,3`) in
MoM 1.31 and CP 1.60, `bb0400` (`mov bx,4`) in CoM 1.

- `0x9B50C`–`0x9B58F` is Chebyshev distance, `max(|Δx|, |Δy|)` over battle-unit `+0x44`/`+0x46`
  with `abs` via the `0:0x2c8` helper — so "tiles" is king-move distance.
- Long Range is `0x100` in `.Abilities` (+0x1C), from the binary's own table at `0x2CFA8`. The
  clamp fires only when `steps > 0`, so it caps a penalty at −10% and never creates one.
- Only `attack_mode == 2` reaches the block, so thrown, breath and gaze never pay it either.

**CoM 1 alone exempts heroes.** In the 19 `nop`s left by hoisting the `ranged_tohit` add it
inserts, at `0x99B64`:

```
bx = _UNITS[attacker.unit_idx]            ; [0x9EC2], stride 0x20
cmp byte [bx+6], 0xFF ; jg 0x99BE6        ; Hero_Slot >= 0 → skip the whole block
```

Same `Hero_Slot` idiom as `0x9B027`; note `scan_mom_binary.py` mislabels `+6` as `.resist`,
because `bx` points into `_UNITS[]` rather than a battle unit. Independently stated by
`CoM manual.txt:14251` — "Hero units are now unaffected by range penalties on their bow
attacks." The skip also bypasses `Has_Ranged_Attack` (`0x9BB03`, `0 < ranged_type < 100`) and
its `attack_strength = 0`, which is inert: anything in the ranged phase already passes it.

### Holy Weapon, and the to-hit normalisation that carries it to thrown (resolved 2026-07-27)

This closes former verification item **A26**. Holy Weapon is unit-enchantment mask `0x00800000`, and its block is
version-identical in substance (`0x8F1C0` in 1.31, `0x8F1C5` in CP 1.60, `0x8F192` in CoM 1) —
but **not in which routine it sits, and therefore not in how often it runs**. In 1.31 it is inlined
in the battle-unit constructor, reading that frame's locals, and runs once per unit. CP 1.60 and
CoM 1 moved it into `BU_Apply_Specials`, which has two callers, so it runs at construction *and*
at every stat recompute; the Holy Arms grant and the to-hit normalisation below moved with it. See
`DOS reconstructed/R6.1a.evidence.md`, *CP 1.60 and CoM 1 moved Holy Weapon out of the constructor*.

```
if (!(enchantments & HOLY_WEAPON)) skip
melee_tohit (+0x24)++                                  ; +10 percentage points
if (ranged_type == 100 || ranged_type / 10 <= 2) ranged_tohit (+0x25)++
if (Weapon_Plus1 == 0) Weapon_Plus1 = 1                ; the magic-weapon upgrade
```

So the write side **does** cover thrown: `cmp byte [bx+2], 0x64` is a plain compare against 100,
not the unsatisfiable `/10 == 100` bug seen in Weakness and Weapon Immunity. Magical ranged
(30–39), breath (101–102) and gaze (103–105) are excluded in every build.

**The 1.31 thrown exemption is therefore entirely on the read side**, and it is not specific to
Holy Weapon: 1.31 keeps `attack_tohit += ranged_tohit` inside the `attack_mode == 2` gate
(add at `0x99B82`, gate at `0x99B64`), while CP 1.60 and CoM 1 hoist the add above the gate
(add at `0x99B71` / `0x99B4E`, gate at `0x99B79`). Any `+0x25` contributor — Holy Weapon, an
item's to-hit, weapon quality — is invisible to thrown and breath in 1.31 and visible in both
later builds.

CP 1.60 and CoM 1 add a **second**, independent route to the same result, at `0x8F23A` /
`0x8F1FF`, which 1.31 has no counterpart for:

```
al = min(melee_tohit, ranged_tohit)        ; melee_tohit alone if ranged_type == -1
if (al > 0) { ranged_tohit -= al; melee_tohit -= al; tohit (+0x04) += al; }
```

It moves whatever the two phase-specific to-hit fields have in common into the base `tohit`,
which every attack mode reads. For a thrown unit under Holy Weapon both fields are 1, so the
bonus lands in `+0x04` and reaches the thrown attack. For a breath unit only `melee_tohit` is
raised, the minimum is 0, and nothing moves — breath stays excluded, as the Fandom
`Holy Weapon.md` says it should.

### Invisibility's To-Hit penalty (resolved 2026-07-27)

After assembling `attack_tohit`, MoM 1.31 tests all four sources of defender Invisibility:
the combined base-unit, battle-unit, and item enchantment word at `[bp-0x2C]:[bp-0x2A]`
for `UE_INVISIBILITY` (`0x8000`), and the battle unit's `.Abilities` (+0x1C) for
`UA_INVISIBILITY` (`0x0040`).
If either is present, it tests the attacker's `.Attribs_1` (+0x18) for Illusions Immunity
(`0x0008`). Without that immunity, `0x99CC4` decrements `attack_tohit` (`[bp-0x1A]`) by one,
which is exactly −10 percentage points.

The block sits after the mode-specific To-Hit assembly and before the attack roll, so it reaches
melee, ranged, thrown, breath, and the hidden conventional component of a gaze. Ranged targeting
is a separate earlier eligibility check; the penalty still exists in this shared damage routine
even when a ranged attack would normally have been rejected before reaching it.

CP 1.60 is byte-identical through the whole `0x99C89`–`0x99CC4` block. CoM 1 replaces
`0x99C89`–`0x99CC6` with 62 `nop` bytes and resumes at the unchanged counter-attack Suppression
code at `0x99CC7`. Therefore MoM 1.31 and CP 1.60 impose the −10% penalty, while CoM 1 does not.

### `BU_ProcessAttack` first-half control gates (resolved 2026-08-07)

The merged three-build reconstruction closes `[0x999C9,0x99ED7)`. A counterattack subtracts
signed `Suppression / 2` from To Hit at `0x99CC7`–`0x99CE4`, with the compiler's signed division
idiom truncating toward zero. The subsequent flying gate rejects a nonflying unit's own melee
attack against a flying defender unless the attacker is itself flying, the call is a
counterattack, or `ranged_type >= 100` (`0x99CE7`–`0x99D2F`; compact end `0x99D22` in CP/CoM).

At the extent's end, MoM 1.31 returns when `attack_strength <= 0`: `7F 03` at `0x99ED2` branches
over the abort only for a positive strength. CP 1.60 and CoM 1 patch those bytes to `EB 03`, so
the comparison survives but execution always continues into the second half. Complete ledgers,
calls, writes, arithmetic bytes, and the CoM unreachable spell-7 arm are in
`DOS reconstructed/R6.2b.evidence.md`.

### Cause Fear direction and resistance modifier (resolved 2026-07-26)

`BU_CauseFear` is the complete function at `0x9BB3E`–`0x9BC3F` in all three builds. Its
arguments are unambiguous: `si = [bp+0x06]` is the **fear source**, and `di = [bp+0x08]` is
the **resisting target**.

The source gate at `0x9BB51`–`0x9BBCE` accepts Cause Fear from the intrinsic
`Attribs_2 & 0x20`, the unit or combat-instance Cloak of Fear enchantment, or an item's Cloak
of Fear. The target is then rejected for **Death Immunity** (`Attribs_1 & 0x40`) at
`0x9BBD0`–`0x9BBE3`.

**`BU_CauseFear` never tests Magic Immunity.** `0x9BBDD` is the function's only read of the
target's `Attribs_1`, and `0x20` appears nowhere in it. (The other `+0x18` read, at `0x9BBC2`,
is on the *unit-type* record via `[0x9EC2]` with stride 32 — that is the 32-bit unit-enchantment
word being checked for Cloak of Fear, not `Attribs_1`. `scan_mom_binary.py` labels any `+0x18`
as `Attribs_1`, which misleads here.) Magic Immunity still nullifies fear, but through
`Combat_Effective_Resistance`'s **+30** at `0x990B6` for realm ≥ 0 — the call passes realm 4, so
the save cannot fail. Bonus, not skip; the two mechanisms are not interchangeable once another
modifier is in play.

The loop then:

- copies the target's `BATTLE_UNIT` into the resistance-check argument at
  `0x9BBF3`–`0x9BC0D`;
- calls `Combat_Resistance_Check` once per **target** figure, using the target's
  `Cur_Figures` (`+0x0D`) as the bound at `0x9BC1E`–`0x9BC33`;
- increments the return count once for each failed target save at `0x9BC14`–`0x9BC18`.

Thus the helper itself is conventional: source has Fear, target supplies both Resistance and
figure count, and the returned number is how many target figures are feared. The 1.31 bug is
entirely in its caller's argument order and use of that return value.

`BU_AttackTarget` is bounded at `0x99292`–`0x999C8`; its prologue places the attacker in `di`
from `[bp+0x06]`, while `[bp+0x08]` is the defender. There are exactly three calls to
`BU_CauseFear` in the function; a whole-executable scan finds exactly these three direct calls
to the helper's entry:

1. Before a First Strike, call instruction `0x996C9`.
2. Before the defender's counter-attack, call instruction `0x997FA`.
3. Before the attacker's ordinary melee attack, call instruction `0x998D5`.

The counter-attack call is correct in every build: it passes source=attacker and
target=defender, then subtracts the returned failures from the defender's counter-attacking
figure count at `0x99800`.

In **MoM 1.31**, the other two calls pass the same source=attacker, target=defender order.
Their return values are nevertheless subtracted from the **attacker's** figure count
(`0x99723` before First Strike and `0x99932` before ordinary melee). This proves both reported
bugs:

- the defender is never passed as the fear source, so a defending unit's Cause Fear never
  fires;
- the attacker's Cause Fear makes the defender roll, then suppresses that many attacker
  figures as well as operating normally against the counter-attack.

Because the helper checks immunity only on its target argument—the defender in these bad
calls—the self-fear side effect never checks the attacker's immunity. It is instead suppressed
if the **defender** is immune, exactly like the defender's normal fear result.

**CP 1.60 fixes both bad calls by swapping their two pushes.** In the argument setup at
`0x996C4` and `0x998D0` it passes source=defender and target=attacker; the return count is then
correctly subtracted from the attacker's figures. The already-correct counter-attack call is
unchanged. CoM 1 carries the same fixed ordering (its first setup begins one byte later, at
`0x996C5`, because of the adjacent First Strike patch).

The resistance modifier is a one-instruction version difference inside `BU_CauseFear`:

| Build | Save-modifier push | Effective modifier |
|---|---|---|
| MoM 1.31 | `xor ax,ax; push ax` at `0x9BBF0`–`0x9BBF2` | 0 |
| MoM CP 1.60 | identical to 1.31 | 0 |
| CoM 1 | `push 0xFFFD` at `0x9BBF0` | −3 |

All three push realm 4 (Death) immediately before it at `0x9BBEC`–`0x9BBEF`. This confirms
both calculator branches: the two 1.31 direction bugs are confined to 1.31, and Cause Fear
uses no save modifier in either MoM build but −3 in CoM 1.

### First Strike's 24-HP cutoff and Haste repeats (resolved 2026-07-27)

All three behaviors are in `BU_AttackTarget`, `0x99292`–`0x999C8`. The routine takes the
attacker at `[bp+6]`, the defender at `[bp+8]`, and `ranged_attack_flag` at `[bp+0xE]`.
`BATTLE_UNIT.Combat_Effects` is `+0x22`; Haste is bit `0x0800`.

**CoM 1 suppresses First Strike when the defender's top figure has at least 25 HP
remaining.** The patch at `0x9969C`–`0x996BC` computes:

```
remaining_top_hp = defender.hits - defender.front_figure_damage
if remaining_top_hp >= 25: skip First Strike
if defender.Abilities & UA_NEGATEFIRSTSTRIKE: skip First Strike
```

The compare is `cmp al,0x19 / jge` at `0x996B0`–`0x996B2`, so First Strike applies at
24 HP and below. MoM 1.31 and CP 1.60 have no HP test.

The timing is load-bearing: the patch reads `hits` (`+0x10`) and `front_figure_damage`
(`+0x39`) directly from the defender's battle-unit record. Damage already generated by the
attacker's thrown or breath phase is still pending in the routine's output arrays; the only
access to `front_figure_damage` inside `BU_ProcessAttack` is a read at `0x999E4`. Therefore
pending same-exchange damage cannot push a 25+-HP top figure below the cutoff. The calculator
previously tested the post-thrown remaining-HP cell and was corrected to use the top figure's
HP at the start of the exchange.

**Haste repeats counter-attacks in both MoM builds, but not in CoM 1.** After the defender's
ordinary counter-attack returns at `0x99823`, MoM 1.31 and CP 1.60 test
`defender.Combat_Effects & 0x0800` at `0x99857`. If set, they call `BU_ProcessAttack` again
at `0x99876` with the same defender figure count and counter flag. CoM 1 replaces that block
with an unconditional jump at `0x99849` to `0x998C1`, bypassing the repeat. The attacker's
own Haste repeat remains at `0x9996C` in all three builds.

**Caster does not suppress Haste's ranged repeat in MoM; it selects the mana-payment path.**
After the first ranged attack, Haste is tested at `0x9935C`. The code then decides whether
the second shot spends ammunition or mana:

```
use_mana = (battle_units[3].ranged_type / 10 == 3)
           || (attacker.Attribs_1 & (USA_CASTER_20 | USA_CASTER_40))

if use_mana:
    if attacker.mana > 6:
        attacker.mana -= 3
        attack again
else:
    if attacker.ammo > 1:
        attacker.ammo -= 1
        attack again
```

The Caster masks are `0x2000 | 0x4000`, tested at `0x99396`; mana is read and written at
`+0x40` (`0x993AB`–`0x993D4`). **The masks are named from the binary, not from ReMoM's enum
order**: the battle-unit constructor sets `mana_max = 40` from `0x4000` and `= 20` from
`0x2000` (`0x8EF3A`–`0x8EF58`) — Caster 40 and Caster 20 — and `mana` is seeded from
`mana_max` immediately after the constructor returns (`0x8EC5F`–`0x8EC66`), so anything
without those flags or the hero formula has 0 mana.

**This gate is not the one that charges the first shot, and the difference decides heroes.**
The routine that pays for the initial magical ranged attack (`0x9B027`–`0x9B0FF`) uses a
*wider* test — `(_UNITS[unit_idx].Hero_Slot >= 0 || Attribs_1 & 0x6000) && ranged_type / 10 == 3`
→ mana, else ammo. So 1.31 itself treats "hero" and "Caster-flagged unit" as two different
conditions, and the Haste repeat carries only the second. A magical-ranged hero therefore
falls through to the ammunition branch, where it has nothing to spend: **every magical-ranged
hero in the roster has ammo 0** (unit-type table, see *Known anchors*; missile heroes have 8),
so `cmp ammo,1 / jle` bails and no second shot fires.

| 1.31 attacker | Haste ranged repeat |
|---|---|
| Efreet, Djinn — Caster 20/40 units | repeats, −3 mana, needs mana ≥ 7 |
| the 14 magical-ranged heroes | **no repeat** — fails `0x6000`, ammo branch, ammo 0 |
| conventional missile / boulder units | repeats, −1 ammo, needs ammo ≥ 2 |

This is what the Fandom `Haste.md` describes as "this doubling effect does not apply when the
unit is using a Ranged Magical Attack that uses the attacker's own Mana pool". The wiki states
it as one rule; it is really the hero row only, and is wrong for Efreet and Djinn.

**The stale `si` makes 1.31 non-deterministic from the attacker's own stats.** `si` is 3 on
exit from the preceding three-element damage-array loop (`0x9932F`–`0x9934A`) and is never
reinitialised, so `0x9936C`'s `mov ax, si` indexes **battle-unit slot 3** — the fourth entry in
the shared 36-slot array (≤18 occupied, both sides in one array) — instead of the attacker.
The `je` at `0x99387` then jumps *past* the `Attribs_1` test, so whenever slot 3 happens to
carry a 30–39 ranged type, the mana branch is taken for **every** hasted ranged attacker in
that battle. Both directions are reachable:

- a magical-ranged hero with mana ≥ 7 gains the repeat it otherwise cannot have;
- a hasted **missile** unit — Longbowmen, ammo 8 — is charged against its *mana*, which is 0,
  so `cmp mana,6 / jbe` bails and its doubled volley silently does not happen, with no ammo
  spent either.

The second is the more damaging: one magical-ranged unit sitting in slot 3 cancels Haste's
ranged doubling for every conventional archer on the field. CP 1.60's rewrite removes it.
Which side fills slots 0–8 has not been traced, so slot 3 cannot be predicted from the
matchup.

**CP 1.60 fixes both faults and changes the threshold.** Its replacement block at
`0x99380`–`0x993AB` reads the **attacker's** own `ranged_type` (`[bx+2]`, off the pointer
already loaded for the Haste test), requires 30–39, and then applies the same
`Hero_Slot >= 0 || Attribs_1 & 0x6000` disjunct the first-shot routine uses. At `0x993AB` it
uses `cmp mana,6 / jb`, so 6 mana is sufficient; the extra shot still subtracts 3. **Heroes
repeat in CP 1.60 and not in 1.31** — that is the whole of the version difference.

The CP replacement also changes the first-shot result transfer to a downward loop with a
register-only running total. An apparent defender-alive loop immediately afterward,
`0x99367`–`0x9937F`, is unreachable: the Haste edge at `0x99362` jumps to `0x99380`, while the
no-Haste path at `0x99364` jumps out of the ranged branch. It is preserved in the reconstruction
as dead binary behavior, not treated as a live extra-shot gate.

**CoM 1 deleted the mana-pool ranged attack outright.** In the repeat it nops 1.31's
conditional branch at `0x99387` and makes `0x9939C` an unconditional jump to the ammo path,
leaving the mana block unreachable. More than that, it replaces the entire first-shot mana
routine — `0x9AFDA`–`0x9B0ED`, 276 bytes of `nop` — and falls straight through to the ammo
decrement. So in CoM 1 a magical ranged attack is an ordinary ammunition attack and Haste
doubles it like any other, with no hero or Caster special case anywhere.

The dead CoM repeat-mana arm is still informative as patch residue: it compares unsigned mana
against 10 and would subtract 5. The reachable arm always uses ammunition. Independently, a
refused ranged attack does not merely return empty output: `0x99473`–`0x99487` adds `-5` to each
of the three defender damage buckets in every build.

The same reconstruction settled two figure-count details. MoM 1.31's first-strike path sums three
separately truncated damage-category quotients and omits attacker front-figure damage; CP 1.60 and
CoM 1 replace that loop with one quotient over the accumulated damage plus front damage
(`0x996D2`–`0x9972A`). Later attacker melee calls do not incorporate the defender's newly produced
melee-counter buckets when choosing their figure count, preserving simultaneous/frozen attacker
figures within this routine. The full three-build body, ledgers, branch/call/write inventories, and
review provenance are in `DOS reconstructed/combat.c` and `DOS reconstructed/R6.2a.evidence.md`.
Verified independently by Claude and Codex on 2026-08-06; merged after reciprocal review on
2026-08-07, with no surviving disagreement.

### Resistance rolls and effective resistance (resolved 2026-07-26)

Every resistable combat effect routes through two functions, both bounded prologue-to-`retf`:
`Combat_Resistance_Check` at `0x98FCB`–`0x9900C` and `Combat_Effective_Resistance` at
`0x9900D`–`0x9914F`. `BU_CauseFear` is one caller; the touch-effect dispatcher is another.

```
Combat_Resistance_Check(BATTLE_UNIT bu /*by value, 0x6E bytes*/, int16 modifier, int16 realm):
  0x98FE2  di = Combat_Effective_Resistance(bu, realm)
  0x98FE8  di += modifier
  0x98FED  si = Random(10)
  0x98FF9  cmp si,di ; jle → return 0        ; resisted
  0x98FFD  return si - di                    ; failed, by this margin
```

A save succeeds iff `Random(10) <= effective_res + modifier`. With `Random` returning 1..10 the
failure probability is exactly `(10 − effective_res)/10` — the calculator's convention, with no
off-by-one. The non-zero return is the **margin**, which is what the Life Steal damage curve
consumes. Callers that only need pass/fail test it with `or ax,ax / jle`.

`Combat_Effective_Resistance` starts from `resist` (+0x06) and adds, in this order:

| Site | Condition | Bonus |
|---|---|---|
| `0x990A6` | hero ability **Charmed**, any realm | +30 |
| `0x990B6` | `Attribs_1 & 0x20` (Magic Immunity), realm ≥ 0 | +30 |
| `0x990D5` | `UE_RIGHTEOUSNESS`, realm Chaos (2) or Death (4) | +30 |
| `0x990F5` | `UE_ELEMENTAL_ARMOR`, realm Chaos (2) or Nature (0) | +10 |
| `0x9910B` | `UE_RESIST_ELEMENTS`, same realms, only if Elemental Armor absent | +3 |
| `0x9912A` | `UE_BLESS`, realm Chaos or Death | +3 |
| `0x99143` | `UE_RESIST_MAGIC`, realm ≥ 0 | +5 |

The enchantment word it tests is `_UNITS[unit_idx].enchantments` OR'd with the battle unit's own
`+0x3A` and `+0x2C` sets, so spell- and item-granted enchantments are all visible.

The Charmed lookup is hero-only: gated on `_UNITS[].Hero_Slot` (+0x06) `>= 0` at `0x99055`, it
indexes a per-player far-pointer table by `owner_idx` (+0x03), then a 12-byte `s_HERO` record by
`type` (+0x05), and tests bit `0x10` of record byte `0x05` — Charmed in the hero-ability bitmask.

**MoM has no `+50` anywhere in its resistance path.** The two "effectively infinite" bonuses are
`+30`, and the specific immunities are implemented as outright skips at the *consuming* site
(`BU_CauseFear` returns 0 on Death Immunity without rolling at all) rather than as a resistance
bonus. Neither changes an answer — every combination still lands at or above 10. The calculator
now models every one of these as a skip; see *Touch-effect immunities are skips* below.

Confirmed as a side effect: MoM Bless is +3 on the resistance half, and MoM Elemental Armor /
Resist Elements are +10 / +3 on theirs.

**CoM 1 rewrote three rows of this table**, keeping every realm gate and every site in place:

| Row | 1.31 / CP 1.60 | CoM 1 |
|---|---|---|
| `UE_ELEMENTAL_ARMOR` | +10, realm Chaos or Nature | **nothing** — `0x990F3`'s `je` became an unconditional `jmp`, so the `add di,0xa` is unreachable |
| `UE_RESIST_ELEMENTS` | +3, same realms, only if Elemental Armor absent | **+4** (`0x9910B`), and unconditional — `0x990F8`'s skip-jump is nopped |
| realm gate on both | Chaos **or** Nature | **Nature only** — the `je` acting on the Chaos test is nopped at `0x990DC` |
| `UE_BLESS` | +3, realm Chaos or Death | **+5**, same realms (`0x9912A`) |

Righteousness (+30) and Resist Magic (+5) are unchanged. This settles verification item **D7**'s CoM 1
half: `elemResistBonus`'s CoM branch — +4 for Resist Elements, nothing for Elemental Armor — is
right, and the inversion against MoM is real rather than a transcription error. Note the realm
narrowing that comes with it: CoM 1's Resist Elements no longer answers Chaos-realm effects at
all on the resistance side, while on the *defence* side it still covers both realms (see
*Defence specials*).

### Defence specials — the 50/100 constant (resolved 2026-07-26)

`Battle_Unit_Defense_Special` is `0x9A587`–`0x9A79D` (ReMoM's `o122p08`). It is the *other*
mechanism, and it does not share anything with `Combat_Effective_Resistance` above: where
resistance bonuses are additive, this one **replaces** the computed defence outright.

```
0x9A769  attack_attributes & 1 (Armor Piercing) → si = si / 2   ; cwd/sub/sar, signed truncation toward zero
0x9A779  Immunity_Type == 1 && si < 10 → si = 10                ; Weapon Immunity floor
0x9A787  Immunity_Type == 2 → return 50                         ; mov ax,0x32 at 0x9A78D
0x9A793  return si
```

CoM 1 differs in exactly one byte here — `0x9A78E`: `32` → `64`, i.e. **100**. So the
calculator's terminal `dosEffectiveDefense:defenseSpecial` step is correct in both value and
shape: it replaces the running defence with the constant rather than adding to it.

The Fandom `Righteousness.md` states both halves correctly — "either Defense **50** or a bonus
of **+30 Resistance**" — which is the clearest prose confirmation that the two numbers belong to
two different mechanisms.

Also read off this function: Elemental Armor **+10** /
Resist Elements **+3** on defence in MoM (`0x9A750`, `0x9A766`), against realm Chaos or Nature
and non-melee only; CoM 1 raises them to **+12** / **+4** and drops the `else`, so both can
apply. CoM 1 also replaces the Weapon Immunity floor with `add si, 8` at `0x9A780` — the
calculator's `dosEffectiveDefense:weaponImmunityBonus`, against the MoM builds'
`dosEffectiveDefense:weaponImmunityFloor`. CP 1.60's only change in the function is a
*reordering* of the two `Immunity_Type` assignments at `0x9A663`–`0x9A68F`, which is the
mechanism behind A9 and, in the calculator, the difference between the `mom_1.31` and
`mom_cp_1.60.00` entries of `DOS_DEFENSE_STEPS`.

The completed R6.2e derivation supplies the bounded control-flow details. Illusionary defense
returns zero unless the defender's Illusions Immunity first clears the attack's Illusionary bit
(`0x9A613`–`0x9A633`). The accumulated enchantment mask includes the permanent unit, live battle
unit, and item enchantments, but MoM 1.31's Righteousness arm separately checks only permanent
and live sources. CP tests the combined mask, so item-granted Righteousness starts counting there;
CoM replaces the entire Righteousness arm with 87 NOPs (`0x9A6DC`–`0x9A732`). Both Bless and
Righteousness remain inside the Chaos/Death realm gate. Armor Piercing runs after the additive
bonuses and uses signed division by two, truncating toward zero (`0x9A770`–`0x9A778`). Verified:
Claude 2026-08-07; Codex 2026-08-07, independent. Full evidence:
`DOS reconstructed/R6.2e.evidence.md`.

### Large Shield and elemental defence against spell damage (resolved 2026-07-27)

This closes former verification item **A22**. The bounded
`Apply_Battle_Unit_Damage_From_Spell` routine is `0x87036`–`0x87388` in all three builds. At
`0x871AA`–`0x871C0` it passes the spell's realm and attributes to
`Battle_Unit_Defense_Special`, together with a hard-coded ranged type:

| Build | Site | Ranged type passed |
|---|---|---|
| MoM 1.31 / CP 1.60 | `0x871B6` | 38 |
| CoM 1 | `0x871B6` | 39 |

Both Immolation and Wall of Fire call this helper with spell id 96, Fireball, whose realm is
Chaos (2). The type is non-zero in every build, so Large Shield's gate at `0x9A649` admits both
effects: **+2** in MoM/CP and **+3** in CoM 1 (`add si,2` / `add si,3` at `0x9A64F`).

The elemental bonuses also apply. MoM/CP require a non-melee Chaos- or Nature-realm attack, so
Fireball receives Elemental Armor **+10** or Resist Elements **+3**. CoM 1 replaced that realm
gate with `ranged_type != 100 && ranged_type >= 30` at `0x9A733`–`0x9A73D`; its hard-coded type
39 passes, giving Elemental Armor **+12** or Resist Elements **+4** at `0x9A750` /
`0x9A766`. The calculator previously suppressed the elemental bonus for all `com*` versions;
it now includes CoM 1 while leaving the separate CoM2/Warlord engine unchanged.

### Magic Immunity against breath (resolved 2026-07-27)

This closes former verification item **A23**. In MoM 1.31 and CP 1.60, the direct Magic Immunity test at
`0x9A69E` requires a non-negative realm and a non-zero ranged type. The attack classifier maps
Fire Breath (101) and Lightning Breath (102) to Chaos, so both reach the assignment at
`0x9A78D` and replace defence with **50**.

CoM 1 adds explicit comparisons for ranged types 102 and 101 at `0x9A6A5` and `0x9A6AB`.
Either match jumps past the Magic Immunity assignment, so neither breath receives its defence
override. This confirms the calculator's MoM/CP versus CoM 1 split. The calculator currently
extends the CoM 1 branch to CoM2/Warlord; that is a separate engine-scope assumption, not evidence
from these DOS binaries.

### Bless — magnitudes, and what "Chaos/Death attack" actually means (resolved 2026-07-27)

This closes former verification item **A21**. Both halves read `UE_BLESS` (low-word bit `0x200`) and both gate on
realm ∈ {Chaos (2), Death (4)} in every build:

| Half | Site | 1.31 / CP 1.60 | CoM 1 |
|---|---|---|---|
| resistance (`Combat_Effective_Resistance`) | `0x9912A` | `add di, 3` | `add di, 5` |
| defence (`Battle_Unit_Defense_Special`) | `0x9A6D3` | `add si, 3` | `cmp [bp+8], 0x27 / jle` then `add si, 5` |

CoM 1 **adds** its `ranged_type > 39` test to the realm gate rather than replacing it — the
`cmp [bp+0xe],2 / cmp [bp+0xe],4` pair at `0x9A6B7` is byte-identical in all three builds. So on
defence CoM 1 keeps only breath (101, 102) and the Chaos/Death gazes (104, 105): melee passes 0,
conventional ranged is 10–39, and Thrown (100) clears the type test but fails the realm test.

**The realm argument is a pure function of `ranged_type`, and that is the load-bearing part.**
`Battle_Unit_Defense_Special`'s `[bp+0xe]` comes from the classifier decoded under *Gaze attacks*,
and its `[bp+8]` from `[bp-0xe]`, which is written in exactly two places in the bounded
`BU_ProcessAttack` — `0x99B1B` (`mov al, es:[bx+2]`, the attacker's own `ranged_type`) and
`0x99C66` (`mov word [bp-0xe], 0`, melee) — and read in exactly one, the push at `0x99EE0`. Only
`ranged_type == 0` consults the attacker's race. Therefore, **in every build**:

- **Boulder and missile (10–29) and Thrown (100) are realm-less.** A Chaos or Death creature's
  arrows, rocks and thrown weapons never inherit its realm, so Bless — and Righteousness, and the
  elemental bonuses, and defence-side Magic Immunity, all of which need `realm >= 0` — do nothing
  against them. MoM's Fire Giant (Chaos, Boulder 10) is the roster-reachable case.
- **Fire and lightning breath are Chaos regardless of who breathes them**, and the gazes carry
  their own realms (103 Nature, 104 Chaos, 105 Death).
- **Melee is the only phase that reads the attacker.** Race < 15 → realm −1, race 15 → 5,
  otherwise race − 16; Chaos Channels' `race = 0x12` is what makes a channelled unit's *melee*
  count as Chaos.

The Fandom `Bless.md` says the same thing in prose and was simply not believed: "for Ranged
Attacks and Special Attacks … the color of the attacking unit is completely irrelevant. Instead,
the attacks themselves have preset Realm associations." Its table of Bless-affected attacks lists
Chaos/Death melee, fire and lightning breath, Immolation, Death Gaze, and four *magical* ranged
projectiles — no physical ranged, no Thrown.

The calculator's Bless scope was corrected against this on 2026-07-27. CoM2 and Warlord are
`Caster.exe` and keep the wider scope pending **D6**.

### Touch-effect immunities are skips, not resistance bonuses (resolved 2026-07-27)

Two gates jump past whole groups of effects before any resistance roll happens. Both test the
**defender's** `Attribs_1 & 0x20` (Magic Immunity):

| Gate | Jumps to | Skips |
|---|---|---|
| `0x99D3F` (1.31) / `0x99D32` (CP 1.60, CoM 1) | `0x99EB0` | Immolation, stoning gaze, death gaze |
| `0x99F67` — byte-identical in all three builds | `0x9A1E6` | Dispel Evil, Stoning Touch, Death Touch, Life Steal, Destruction |

The second sits at the head of the per-attacking-figure loop (body `0x99F5A`, back-edge
`0x9A576`, also byte-identical across builds).

Each effect then has its own specific-immunity skip. Every row below is byte-identical in all
three builds; the modifier is `-Spec_Att_Attrib` (+0x15) via the helper at `0:0x2c8` unless
stated:

| Effect | Site | Specific immunity | Realm |
|---|---|---|---|
| Stoning gaze | `0x99D8F` | Stoning (`0x02`) | 0 Nature |
| Death gaze | `0x99E2D` | Death (`0x40`) | 4 Death |
| Stoning Touch | `0x9A010` | Stoning (`0x02`) | 0 Nature |
| Death Touch | `0x9A094` | Death (`0x40`) | 4 Death |
| Life Steal | `0x9A11D` | Death (`0x40`) | 4 Death |
| Destruction | `0x9A19E` | none | 2 Chaos, modifier 0 |
| Dispel Evil | `0x99F72` | none of its own | 3 Life, modifier -4 |
| Poison | `0x9A2FD` | Poison (`0x80`) | **-1** |

So there is no 50-vs-100 split on the resistance side at all — that constant belongs only to
`Battle_Unit_Defense_Special` (see *Defence specials*).

**Poison is realm-less, and that is load-bearing.** It pushes realm `-1` at `0x9A30F`, and
`Combat_Effective_Resistance` gates Magic Immunity's +30 on `realm >= 0` (`0x990B0`:
`cmp [bp+0x74],0 / jl`). The same gate excludes Righteousness, Elemental Armor, Resist Elements,
Bless and Resist Magic. Only Poison Immunity (the skip) and the hero **Charmed** ability, which
is the one bonus applied at any realm, stop poison.

**CoM 1 gives poison a -1 save modifier.** 1.31's `xor ax,ax` at `0x9A313` is nopped, so the
modifier push reuses `ax = 0xFFFF` left over from the realm push. Confirms the calculator's
CoM-only poison penalty.

Also read off these blocks: **Life Steal consumes `Combat_Resistance_Check`'s return value**
(stored `0x9A17F`, accumulated `0x9A185`) rather than re-rolling — which closes verification item
B3. And CoM 1's Destruction adds a flat **100** to the kill accumulator
(`0x9A1E1`, `mov al,0x64`) where 1.31 adds the defender's per-figure `hits`.

The completed R6.2c dual derivation adds the version details around those blocks. MoM's Dispel
Evil accepts Chaos/Death races with modifiers −4 and another −5 for Undead; CoM 1 accepts every
signed race at or above `0x0F`, uses −3/−3, exempts Spell Lock, and retains a dead `race == 0x14`
compare (`0x99F96`–`0x99FC8`). Stoning and Death channel flags add −1 and −3 respectively.
CoM 1's Life Steal channel correction tests raw attack bit `0x0040` (Illusionary), not Life
Steal, and subtracts two in live AX (`0x9A154`–`0x9A15B`). Destruction is inside the
per-attacking-figure loop in every build (`0x9A19E`–`0x9A1E5`). Verified: Claude 2026-08-07;
Codex 2026-08-07, independent. Full evidence: `DOS reconstructed/R6.2c.evidence.md`.

### Life Steal's healing and temporary-Hits target (resolved 2026-08-08)

The exported `0370:002A` target called at `0x9A196` is `Battle_Unit_Heal`, reconstructed across
all three builds at `0x7FCBA..0x7FF43`. Life Steal passes the already sampled resistance-failure
margin and mode 1. Mode 0 caps healing at Regular plus Undeath damage, while nonzero mode permits
over-heal. The common body reduces Regular then Undeath damage, never reduces Irreversible damage
on that channel-spill path, restores figures from a negative front-damage remainder, and converts
a remaining negative over-heal to per-figure `Extra_Hits` (`0x7FCF7..0x7FEE2`). It then calls the
battle-unit constructor and stat recompute and restores the saved movement byte
(`0x7FEE2..0x7FF3D`).

CP 1.60 alone reduces the restorable/effective figure maximum by unsigned
`floor(damage[2] / hits)` and, after adding Extra Hits, adds
`extra * floor(damage[2] / hits)` back to Irreversible damage with a byte-store cap of 200
(`0x7FCE0..0x7FCEF`, `0x7FE89..0x7FEC6`). CP and CoM clear the positive post-restoration local's
low byte before the Extra-Hits test, where 1.31 retains it. CoM uses raw Max Figures, zero-extends
that divisor, and caps the signed new `Extra_Hits` sum at 90 (`0x7FE52..0x7FE68`,
`0x7FE89..0x7FECE`). Verified: Codex Agent A 2026-08-08, independent; Codex Agent B 2026-08-08,
independent; followed by reciprocal review. Full evidence: `DOS reconstructed/R6.5b.evidence.md`.

### Weapon Immunity: eligibility, ordering, and magnitude (resolved 2026-07-27)

Two functions decide it. The **immunity-mask builder** at `0x99150`–`0x99291` (prologue to
`retf`; `[bp+6]` = attacker battle-unit index, `[bp+8]` = `attack_mode`) returns the set of
`Attribs_1` bits this attack is subject to. `Battle_Unit_Defense_Special` consumes that mask as
its `[bp+0xa]` argument, pushed at `0x99EDD`.

The Weapon Immunity bit (`0x100`) enters the mask only when `Weapon_Plus1` (+0x27) is 0, and:

| Path | Eligibility test |
|---|---|
| melee (`mode <= 0`, `0x99254`) | unconditional |
| ranged (`0x9921A`) | `ranged_type / 10 < 3` **\|\|** `ranged_type / 10 == 100` |

The second disjunct is unsatisfiable for an `int8` — the same divide bug as Weakness. **CP 1.60
and CoM 1 both nop the identical six bytes** `bb0a0099f7fb` (`mov bx,10 / cwd / idiv bx`) at
`0x9922C`, turning it into `ranged_type == 100`. That is the whole of the documented "1.31
thrown ignores Weapon Immunity" bug, and its fix.

The same test settles every other phase: boulder (10–19) and missile (20–29) pass `/10 < 3`;
magic ranged (30–39) fails; breath (101–102) and gaze (103–105) fail. So Weapon Immunity never
reaches gaze or breath in any build, structurally — independent of gaze attackers happening to
be fantastic.

**The generic-hull bypass is real, and it is a race cutoff.** Neither function tests unit type;
the bypass is upstream, where `Weapon_Plus1` is seeded:

| Build | Site | Rule |
|---|---|---|
| MoM 1.31 | `0x8F251` / `0x8F25C` | `(Abilities & 0x0001) \|\| race(+0x0B) > 13` → `Weapon_Plus1 = 1` |
| MoM CP 1.60 | `0x8F216` / `0x8F221` | same, cutoff **> 14** |
| CoM 1 | `0x8F1DB` / `0x8F1E6` | same, cutoff **> 14** |

`Abilities` bit `0x0001` is `UA_FANTASTIC`: the binary's own Abilities name→mask table at
`0x2CFA8` matches ReMoM's `UA_*` enum on all fifteen named bits `0x0002`–`0x8000`, and `0x0001`
is the only one with no display string. Race 14 is Generic — corroborated by CoM 1's Exorcise
target test `race >= 0x0F` being "any fantastic unit" per its own helptext, which puts Generic
just under the fantastic cutoff. So races 14–20 bypass Weapon Immunity in 1.31 but only 15–20
from CP 1.60 on, and the generic hulls are exactly the difference.

`Weapon_Plus1` is also set for heroes (`0x8EFC3`, gated on `_UNITS[].Hero_Slot >= 0`), by weapon
quality (`0x8F10F`, `= quality + 1`), and at `0x8F249`, `0x8F270`, `0x8F5EF`, `0x8F6D1`,
`0x90726` — five enchantment sites not yet identified, each a potential Weapon Immunity bypass.

**Ordering: 1.31 lets Weapon Immunity overwrite Missile Immunity.** In
`Battle_Unit_Defense_Special` the two `Immunity_Type` assignments are sequential and
unconditional, with Weapon Immunity second:

```
0x9A662  test Attribs_1, mask         ; && non-melee → Immunity_Type = 2   (0x9A66E)
0x9A683  and ax, Attribs_1 ; test ax,0x100 → Immunity_Type = 1             (0x9A68C)
```

The tail then does `type 1 → max(si,10)`, `type 2 → return 50`, so the defender gets the floor
instead of the 50. **CP 1.60's 47-byte diff at `0x9A663`–`0x9A68F` is exactly a swap of those
two blocks**, and it narrows the generic test from `test word es:[bx+0x18], ax` to
`test byte es:[bx+0x18], al`, which structurally cannot see the `0x100` bit. CoM 1 carries the
same swap. Missile Immunity is dominant from CP 1.60 on.

**Magnitude.** MoM floors, CoM adds — structurally different operations, as expected:

| Build | Site | Code |
|---|---|---|
| MoM 1.31 / CP 1.60 | `0x9A779` | `cmp [bp-6],1 / jne / cmp si,0xA / jge / mov si,0xA` |
| CoM 1 | `0x9A77F` | `add si, 8`, then `jmp` over the now-dead `mov si,0xA` |

CP 1.60's other change in this function (`0x9A6D7`) replaces 1.31's Righteousness lookup — which
read the unit-type word and the battle unit's `+0x3C` but missed `+0x2E` — with a single test of
the already-OR'd local, so item-granted Righteousness now counts on defence.

**CoM 1 repurposed the function's second argument.** 1.31 passes `ranged_type` on the ranged
path and literal 0 on melee (`[bp-0xe]`, set at `0x99B43` / `0x99C66`) but only ever tests it
`!= 0`. CoM 1 compares it against 30, 39, 100, 101 and 102 — which is how it excludes breath
from Magic Immunity (`0x9A6A5`) and thrown from Elemental Armor (`0x9A733`).

### Touch-effect dispatch is data-driven (resolved 2026-07-26)

`attack_attributes` (local `[bp-0x14]`) is seeded from the unit's *common* attributes (+0x1E) at
`0x99AA1`, then OR'd with `melee_atk_attrs` (+0x28) at `0x99BF9` on the melee path, or
`ranged_atk_attrs` (+0x2A) at `0x99AE3` on the ranged/thrown path. Touch effects then test that
local with no further phase check, so **which phases a touch fires on is a property of the
unit's data, not a per-effect rule.** The effect dispatcher's tests are all against that one
local: `0x99EEF` (0x4000), `0x99F72` (0x800), `0x9A010` (0x80), `0x9A094` (0x200), `0x9A11D`
(0x8), `0x9A19E` (0x20), `0x9A1E6` (0x10).

Dispel Evil (0x800 — from the binary's own name→mask table, see *Naming a flag bit*) at
`0x99F72`: requires defender race `rt_Chaos` (0x12) or `rt_Death` (0x14) at +0x0B, save at -4, a
further -5 if `_UNITS[].mutations & UM_UNDEAD`, then a `sbr_Life` resistance check. **No
`attack_mode` gate.** The function contains exactly four references to `attack_mode`
(`[bp+0xc]`): the argument push at `0x99ABD`, the branch select at `0x99ACA`, the mode-2 test at
`0x99B64`, and the flying-defender early return at `0x99CFB` — three `cmp`s plus one push.
Because no reference copies the mode into a register or local, it cannot be tested indirectly
anywhere in the function; none of the four gates a touch effect. (The push at `0x99ABD` passes
the mode to the helper at `0x99150`, whose return lands in `[bp-0x18]` and is only forwarded as
an argument, never compared.)

**B9 resolves what can set that mutation bit during unit creation.** `Create_Unit` at
`0x97B30..0x9801A` first writes `_UNITS[].mutations = 0` for every type. Its only later sources are
weapon quality `0..3`, Magic Weapons `0x01`, and Chaos Channels `0x04/0x08/0x10`; non-city
creation bypasses those writes entirely. It never reads the type record's race or realm when
setting mutations. Natural Death creatures therefore lack `UM_UNDEAD`; the extra -5 is provenance
state for explicitly converted/created undead, not a roster property. Full three-build proof and
the roster-versus-instance distinction: `DOS reconstructed/B9.evidence.md`; reconstruction:
`DOS reconstructed/unitcalc.c`.

This disproves the MoM Fandom wiki's `Dispel Evil (Ability).md`, which calls it a melee-only
touch attack. No calculator impact — the Angel, the only MoM unit with it, has no non-melee
attack — but the wiki cannot be cited as justification for a melee-only restriction.

**CoM 1 behaves identically.** Same flag `0x800` tested at the same `0x99F72`, still with no
phase gate. CP 1.60 and CoM 1 each add one `attack_mode` test that 1.31 lacks, at `0x99D3D`
and `0x99D43` respectively; both branches reconverge at `0x99D73`, so no *touch effect* is
gated by it. What it does gate is the block between the two — see *Immolation* below. In no
binary is `attack_mode` ever copied to another local — every reference is one argument push
plus the `cmp`s — so the "no phase gate" claim rests on an exhaustive reference list, not a
text scan.

CoM 1's Exorcise parameters differ from MoM's, and every one matches CoM 1's own helptext:

| | MoM 1.31 | CoM 1 | CoM 1 helptext |
|---|---|---|---|
| Target | race == 0x12 or 0x14 | race >= 0x0F or == 0x14 | "any fantastic unit" |
| Save | -4 (`0xfffc`) | -3 (`0xfffd`) | "resist at -3" |
| Undead extra | -5 | -3 | "additional -3 penalty" |
| Extra exclusion | none | `[bx+0x19] & 0x40` → skip | Spell Lock "protects fantastic units from … Exorcism" |
| Realm | 3 (Life) | 3 (Life) | — |

### The zero-attack-strength abort, and what it takes down with it (resolved 2026-07-26)

`BU_ProcessAttack` loads `attack_strength` into `[bp-0x12]` from the battle unit's `.melee`
(+0x00, at `0x99C55`) on the melee path or `.ranged` (+0x01, at `0x99B10`) on the
ranged/thrown/breath/gaze path, and never modifies it afterwards. Then:

```
0x99ECE  cmp  word [bp-0x12], 0
0x99ED2  jg   0x99ED7          ; 1.31: 7F 03      CP 1.60 / CoM 1: EB 03
0x99ED4  jmp  0x9A581          ; the function's own epilogue — immediate return
```

The `7F` → `EB` at `0x99ED2` is one of the 192 changed bytes; **CP 1.60 and CoM 1 both patch
the gate to an unconditional jump**, leaving the `cmp` as dead residue. Neither re-points it at
another field, so in those builds there is no attack-strength test here at all.

Everything the 1.31 abort discards sits after it: `Battle_Unit_Defense_Special` (`0x99EE6`),
the Eldritch Weapon toblock decrement (`0x99EEF`), the whole touch dispatcher, poison
(`0x9A37D`), `CMB_AttackRoll`, blur, `CMB_DefenseRoll` and damage.

**It discards the gaze result too, even though the gaze is rolled earlier.** The stoning and
death gaze loops accumulate into a *local* three-word array — stoning adds to `[bp-0x24]` at
`0x99DF4`, death gaze to `[bp-0x28]` at `0x99E93`, and the array is zeroed at `0x99C6B`. That
array only reaches the caller's damage array (`[bp+0x0e]`) at `0x9A544`–`0x9A56B`, inside the
per-attacking-figure loop that begins at `0x99F5A`. Reading the gaze blocks alone suggests they
are ungated; tracing where their result goes shows the 1.31 return at `0x99ED4` throws it away.
This is what the Fandom `Gaze Attack.md` describes as the hidden Attack Strength disabling the
resist-or-die component when it reaches 0.

**There is no "base" attack strength at combat time.** `.melee`/`.ranged` hold the live,
already-debuffed values — see *Combat-effect stat writes* below. The version difference is
gate-present versus gate-removed, not effective-versus-base.

The phase gates in the caller are a separate question, and only one of them moved:

| Gate in `BU_AttackTarget` | 1.31 | CP 1.60 | CoM 1 |
|---|---|---|---|
| ranged phase entry (`0x992EF`) | `.ranged > 0` | `.ranged_type > 0` | `.ranged_type > 0` |
| thrown/breath/gaze rider in melee (`0x99499`) | `.ranged_type >= 100` | same | same |
| hasted repeat of that rider (`0x99512`) | `.ranged_type < 103` | same | same |
| defender's retaliation gaze (`0x9958D`) | `.ranged_type >= 103` | same | same |
| melee entry | no strength gate in any build | | |

So even the ranged-phase change is 1.31's *effective strength* giving way to a static roster
property, not to a stored base value.

### Combat-effect stat writes (resolved 2026-07-26)

This closes former verification item **A25** (Weakness) and the Mind Storm half of **A27**. The
modern D8 half was subsequently resolved by the complete `Caster.exe` stat-pipeline reconstruction.

The battle-unit stat recompute at `0x8FF09`–`0x90B8D` applies `Combat_Effects` (+0x22) by
writing **directly into the stat fields**, which is why the gate above reads debuffed values.

| Effect | MoM 1.31 / CP 1.60 | CoM 1 |
|---|---|---|
| Vertigo (`0x0001`) | `tohit -2`, `defense -1` (`0x9089B`) | `tohit -3`, `toblock -1` (`0x90651`) |
| Weakness (`0x0020`) | `melee -2`; `ranged -2` if type-gated (below) | `melee -3`; `ranged -3` if type-gated |
| Mind Storm (`0x0008`) | `melee`, `ranged`, `defense`, `resist` each `-5` (`0x90945`) | `melee -3`; `ranged`, `defense`, `resist` each `-5` (`0x906C5`) |

Vertigo's defensive half is a live-stat write, not a conventional-attack modifier.
`Apply_Battle_Unit_Damage_From_Spell` copies `.toblock` directly, and
`Battle_Unit_Defense_Special` starts from `.defense`, so the reduced stat also reaches
Immolation and Wall of Fire defense rolls. The calculator's shared spell-defense profile and
Wall of Fire To-Block path now preserve that behavior.

Mind Storm's ranged write is **unconditional on `ranged_type`**, so it reaches thrown, breath
and gaze alike. Weakness's is gated, and the gate is where the builds diverge:

| Build | Ranged condition | Second condition | Net |
|---|---|---|---|
| MoM 1.31 | `ranged_type / 10 == 2` | `ranged_type / 10 == 100` — unsatisfiable for an `int8` | missile only |
| MoM CP 1.60 | `ranged_type / 10 == 2` | `ranged_type == 100` (the `idiv` at `0x90917` is nopped) | missile + thrown |
| CoM 1 | `ranged_type / 10 <= 3` (`0x9068D`) | `ranged_type == 100` | any conventional ranged + thrown |

The unsatisfiable second test is the mechanism behind the documented 1.31 "thrown is exempt from
Weakness" bug, and CP 1.60 fixes it by deleting the divide rather than the comparison. Breath
and gaze (`ranged_type >= 101`) are exempt in every build. This matches the Fandom
`Weakness.md` exactly — "-2 Ranged Missile Attack … Other types of Ranged Attacks are not
affected", thrown "does not [apply] in the official game" — and CoM 1's widening matches its own
helptext, "melee, thrown and ranged attack strengths".

### Immolation stops riding non-melee attacks after 1.31 (resolved 2026-07-26)

`BU_ProcessAttack` runs the attacker's Immolation block — `Attribs_2 & 8` at `0x99D57`, then an
area-damage call at `0x99D6B` — between the Magic Immunity gaze skip and the gaze blocks
themselves. In 1.31 it is reached on every `attack_mode`. CP 1.60 inserts
`cmp [bp+0x0c], 0 / jg 0x99D73` at `0x99D3D` and CoM 1 the same at `0x99D43`, jumping the block
whenever the mode is non-melee. Both land on `0x99D73`, so the gaze and touch paths downstream
are untouched — this test exists only to keep Immolation off ranged, thrown and breath.

### Immolation and Wall of Fire are both Fireball (resolved 2026-07-27)

Neither has a damage routine of its own. Both call
`Apply_Battle_Unit_Damage_From_Spell(spell_id, bu_idx, &dmg[3], strength_override)` at far
`0x388:0x39`, and both pass **spell id `0x60` = 96 = Fireball**. The helper takes the override when
it is `> 0` and otherwise reads `spell_data_table[96].strength`, which is data, not code — it lives
in `SPELLDAT.LBX` beside each build's `WIZARDS.EXE`, as 0x24-byte records with the name in the
first 19.

| | Site | Override | Effective strength |
|---|---|---|---|
| **Immolation** — 1.31 | `0x99D5E` `mov ax,4` | 4 | **4** |
| Immolation — CP 1.60 | byte-identical | 4 | **4** |
| Immolation — CoM 1 | `0x99D50` `push 0xA` | 10 | **10** |
| **Wall of Fire** — 1.31 | `0x9EE60` `xor ax,ax` | 0 | Fireball's own = **5** |
| Wall of Fire — CP 1.60 | byte-identical | 0 | **5** |
| Wall of Fire — CoM 1 | `0x9EE60` `push 0xA` | 10 | **10** |

Fireball's own strength is **5** in both MoM builds and **12** in CoM 1, so CoM 1's Wall of Fire is
10 only because the patch replaced the "no override" with an explicit `push 10`. Left as 0 it would
have been 12. (Record alignment cross-checks four ways on the 0x24 stride: Wall of Fire@87,
Fireball@96, Immolation@99, Flame Strike@109.)

Fireball's `attributes` word is `0x1000` = `Att_AREAFLAG` in all three, which makes the helper set
`attack_count = defender.Cur_Figures` — the attack lands on every figure. The Immolation *spell*
record is a unit enchantment (`type` 1) and its own strength byte is unused by combat.

`Check_Wall_Of_Fire_Attack` itself is byte-identical between 1.31 and CP 1.60. It first requires
`battlefield.wall_of_fire > 0`, then skips Flying, Teleporting, and Merging units. Damage occurs
only when the unit's current square is outside and its destination is inside the inclusive
`cgx 5..8`, `cgy 10..13` city-wall box; the byte-identical helper at
`[0x9EFE3,0x9F046)` performs the current-square test. CoM folds the movement tests into raw mask
`0x98`, skips defender-controlled units, and performs the destination test before the same
current-square helper. The local three-word damage array is not initialized before the Fireball
helper fills it. The spell call remains at `0x9EE6C`, followed by `BU_ApplyDamage` at `0x9EE79`.

CoM also hides a separately called near helper in the wall routine's jumped-over bytes
`[0x9EDD2,0x9EE21)`. It scans 30 `s_NODE` records and, when a Guardian node belongs to the combat
defender and matches the current overland action coordinates, writes `owner_idx + 1` to
`battlefield.city_enchantments[Heavenly Light]` at raw `+0x1593`. Its sole direct predecessor is
`0x9E96F`; the wall routine jumps over it at `0x9EDD0`. Verified: Claude 2026-08-07; Codex
2026-08-07, independent. Full evidence: `DOS reconstructed/R6.2e.evidence.md`.

### Spell damage application, death classification and ranged visibility (resolved 2026-08-07)

The completed R6.2f closure confirms the full path behind the Fireball-derived effects above.
`Apply_Battle_Unit_Damage_From_Spell` returns before rolling against Magic Immunity, or against
Righteousness when the spell realm is Chaos/Death (`0x870C6..0x87117`). Area spells attack once per
current figure with Damage Limit, Warp Lightning attacks once per starting strength while reducing
strength each pass, and Black Sleep converts the spell to automatic damage
(`0x871C6..0x8721C`, `0x8733E..0x87345`). Invulnerability subtracts two after each defense roll.

The B4/B5/B6 closure follows both damage paths through every figure boundary. Conventional and
non-Area spell excess repeats Defense and Invulnerability −2; Area attacks bypass rollover and cap
each outer per-figure attack. Armor Piercing's signed `/2` truncates toward zero, while Immolation
loads Fireball's Area-only flags and cannot inherit the initiator's Armor Piercing. Full reviewed
proof: `DOS reconstructed/B4_B5_B6.evidence.md`.

`BU_ApplyDamage` returns before all state changes when the input-bucket sum is nonpositive or the
unit is not Active (`0x873B1..0x873CE`), caps each persistent damage bucket at 200, and uses signed
division for figures lost and the front-figure remainder (`0x873D1..0x87500`). Its terminal status
priority is irreversible (wins ties), then undeath (strictly above irreversible, at least regular),
then regular (strictly above both), at `0x87560..0x876B0`. MoM 1.31 and CP 1.60 additionally mark
recognized combat summons with persistent `wp = 9`; CoM 1 discards that predicate result and calls
`Calc_Battlefield_Bonuses` (`03D0:004D`, raw `0x9A8AB`) with the combat-structure word at
`[0xC520]` instead (`0x87536..0x8755F`). The callee's mode-1 comparison and city-defense branch
establish the argument's role. Full evidence: `DOS reconstructed/R6.5d.evidence.md`.

After assigning a zero-figure unit's terminal status, the shared `0348:003E` call at `0x876B5`
refreshes two side-wide Illusion-sight words. Its byte-identical
`Update_Sees_Illusions` body at `0x7BDA0..0x7BE3B` first clears attacker DS:`0xC420` and
defender DS:`0xC41E`, then scans active battle units. An active unit sets its controller side's
word when `Attribs_1 & USA_IMMUNITY_ILLUSION` is nonzero (`0x7BDC0..0x7BE29`). Units belonging
to neither combat-side controller are ignored. Verified: Codex Agent A 2026-08-07, independent;
Codex Agent B 2026-08-07, independent; followed by reciprocal review. Full evidence:
`DOS reconstructed/R6.5a.evidence.md`.

`Check_Attack_Ranged` combines permanent, live battle and item enchantments for both combatants.
The Wall of Darkness exemption checks True Sight in 1.31 but byte-wide Illusions Immunity in CP
1.60 and CoM 1 (`0x877EC..0x877FC`). The same closure establishes Confusion-aware side counting in
`Eliminated_Opponent`, the walled-city cell predicate's excluded inner two-by-two, and the exact
combat-summon type list. Verified: Claude 2026-08-07, independent; Codex 2026-08-07, independent.
Full evidence: `DOS reconstructed/R6.2f.evidence.md`.

### `BU_Apply_Specials` runs twice, and only 1.31 lets mutations apply twice (resolved 2026-07-27)

`BU_Apply_Specials` is called once from the battle-unit constructor (`0x8F2A2`; CoM 1 `0x8F0E8`)
and once from the stat recompute (`0x90A1D`; CoM 1 `0x90743`). These are the only two callers —
an exhaustive near-call scan of `0x80000`–`0xA0000` finds no others.

The second call is meant to pick up enchantments added *during* combat: its enchantment argument is
`(unit_ench XOR bu_ench) AND bu_ench` (`0x909F3`–`0x90A09`), i.e. only what the battle unit carries
that the unit record does not. Enchantments are therefore never double-applied. **The mutations byte
is not filtered the same way** — 1.31 passes `_UNITS[].mutations` whole at both sites, so every
Chaos Channels mutation fires twice.

| Build | Mutations argument at the second call |
|---|---|
| MoM 1.31 | `8A46F9` — `mov al,[bp-7]`, the full mutations byte |
| MoM CP 1.60 | `90 33C0` — `nop; xor ax,ax` → 0 |
| CoM 1 | `90 33C0` → 0 |

**Demon-Skin Armor is `+3` per application in every build** — `0x8F6E2 add al,3` in 1.31 and
CP 1.60, `0x8F741 add al,3` in CoM 1. So 1.31 yields `3 + 3 = 6` and the two later builds yield
`3`. This settles the Fandom `Chaos Channels.md`
self-inconsistency: its "the defense bonus is applied twice in combat" is the correct mechanism,
and its "documented +2" is the wrong base — the code adds 3, not 2. ReMoM renders the same
`defense += 3` here, independently of the disassembly.

The sibling mutations read off the same block. Demon Wings (`0x08`) sets `Move_Flags |= 8`. Fire
breath (`0x10`) sets `ranged_type = 0x65` (101) with `ranged = 2` in both MoM builds (`0x8F728`)
but **`ranged = 4` in CoM 1** (`0x8F47C`). All three also set `race = 0x12`.

Holy Armor (`UE_HOLY_ARMOR`, `0x8F7F0`) is `+2` defence in both MoM builds, and Iron Skin `+5`
(CoM 1 `0x8F72B`). **CoM 1 made Holy Armor conditional**: at `0x8F7C1` it is `+2` defence only when
the *running* `defense` is `<= 5`, and `+1 toblock` otherwise.

**CoM 1 swapped the constructor's call order**, and that has consequences beyond this section.
The constructor calls `BU_Apply_Specials` at `0x8F2A2` in both MoM builds and at `0x8F0E8` in
CoM 1 — in MoM the call comes *after* the constructor's own Chaos Surge block, in CoM 1 *before*
it. See *Chaos Surge* below for what that changes.

### Berserk (resolved 2026-07-28)

This closes former verification item **A29**. Unit enchantment `0x00000004` — named from the binary's own table, not
inferred. The block is the **last** one in `BU_Apply_Specials`, `0x8F832`–`0x8F87D`:

```
if (!(ench & BERSERK)) skip
if (melee > 0) { +0x64 += melee; melee <<= 1 }   ; the doubling
+0x6B = defense                                   ; old value saved
defense = 0xEC                                    ; -20
```

**The doubling really is applied after everything else.** Being the function's final block, it
doubles every melee contribution the constructor and `BU_Apply_Specials` have already made. Only
two writes follow it anywhere: the recompute's Warp Creature halving (`0x90A2E`) and Shatter's
`melee = 1` (`0x90AD9`), both reductions. This confirms the Fandom `Berserk.md`.

**Defence lands on exactly 0, but `-20` is not an override.** The recompute ends with
`if (defense < 0) defense = 0` at `0x90B41`, and an exhaustive read of `0x90A20`–`0x90B8D` finds
only two `.defense` writes after the call returns: Warp Creature's halving (`0x90AA9`, a
reduction) and that clamp. So nothing can lift the stat back above 0 — because there is nothing
there to lift it, not because the write is protected. The `-20` is never observable.

The wiki's "no effect can raise its Defense above 0" is true of the *stat* only.
`Battle_Unit_Defense_Special` starts from the clamped 0 and still layers its own per-attack terms
on top, so a Berserk unit with Large Shield defends at 2 and one with Magic Immunity at 50.

**CoM 1 moved the live melee doubling into `BU_ProcessAttack`; it did not remove Berserk.** Its
stat construction/recompute code has no counterpart to MoM's doubling-and-Defense-zero block,
but combat resolution tests both the battle-unit and persistent-unit Berserk bits at
`0x99C28`–`0x99C41` and doubles the loaded melee strength at `0x99C55` when the defender's race
is below 15. Thus CoM's Berserk doubling is target-dependent and excludes Fantastic defenders;
it also does not force the displayed Defense to zero. CP 1.60 keeps 1.31's construction behavior
verbatim (the block is relocated, ending `jmp 0x8F197`, and stores `-20` at `0x8F876`).

Marginal: `shl al,1` is a byte operation and the later clamp is signed, so a melee strength of 64
or more would double into a negative byte and be clamped to **0**. Nothing in the roster reaches
that without heavy hero stacking.

### Warp Creature runs early in CoM 1's recompute (resolved 2026-07-28)

This closes former verification item **A30**. The magnitudes were never in doubt; the *ordering* was, and the two
DOS engines disagree about it.

**MoM 1.31 applies Warp last**, at `0x90A2E`–`0x90A63` (melee `sar`), `0x90AA9` (defence) and
`0x90AC9` (resist), with only Shatter's `melee = 1` and the terminal clamp after it —
established under *Berserk* above.

**CP 1.60 is identical here.** Diffing the recompute `0x8FF09`–`0x90B8E` gives 186 of 3,205
bytes changed, in five regions: `0x90864`–`0x908FE` and `0x90917`–`0x9091C` (the Vertigo and
Weakness changes already recorded under *Combat-effect stat writes*), `0x90A0C`–`0x90A0E`, and
`0x90AE6`–`0x90AF9` / `0x90B08`–`0x90B1B`. **None of them touches Warp Creature, and none
touches Prayer or High Prayer** (`0x9025C`–`0x9039D`). The level routine `0x8F881`–`0x8FB40` is
byte-identical. So every result in this section and in *Level bonuses* holds for CP 1.60 without
a second read.

The two changed regions sit immediately after each of 1.31's Shatter writes (`0x90AE5` melee,
`0x90B07` ranged). CP 1.60 changes only the `Grey_Melee` / `Grey_Ranged` accounting order; final
melee and ranged still become 1, and eligibility is unchanged. The complete target-admission,
effect-setter, and recompute proof is in `DOS reconstructed/A32.evidence.md`.

**CoM 1 moved the whole block to `0x9074C`–`0x907AA`**, near the front of the same
`0x8FF09`–`0x90B8D` recompute:

```
0x9074C  Combat_Effects & 0x0080 → melee = melee >> 1
0x90764                          → ranged = ranged >> 1   ; no ranged_type test
0x90776  Combat_Effects & 0x0100 → defense = defense / 3   ; idiv cl=3
0x90795  Combat_Effects & 0x0200 → resist = 0
```

Every stat write between `0x907AA` and the epilogue therefore lands **after** the reduction,
at full value. The complete list, in execution order:

| Addr | Effect | Writes |
|---|---|---|
| `0x907F0`, `0x90812` | Shatter | `melee = 1`, `ranged = 1` |
| `0x9084C`–`0x908E9` | Darkness, realm `0x13` (Life) | −1 melee / ranged / defence / resist |
| `0x908ED`–`0x90989` | Darkness, realm `0x14` (Death) | +1 each |
| `0x90992`–`0x90A53` | Supreme Light | +2 melee, +2 ranged, `defense += resist/3` |
| `0x90A87` | per-realm global debuff, indexed `realm − 0x10` | −2 tohit, −3 defence, −3 resist |
| `0x90AB4`–`0x90AF6` | **Tactician** retort | +1 defence; heroes only, a further +1 defence, +2 melee, +2 ranged, +2 resist |
| `0x90B31` | Eternal Night, non-Death | −1 resist |
| `0x90B41`–`0x90B75` | terminal clamp | melee, ranged, defence to ≥ 0 — **resist is not clamped** |

Two identifications worth recording because everything else keys off them. Supreme Light is
named from its `defense += resist/3` shape plus its eligibility gate — `ranged_type` 31–99,
realm `0x13`, or `mana_max != 0` — which is the calculator's "Life creature or Caster". Realm
`0x13` = Life and `0x14` = Death follow from Darkness's sign and are confirmed independently by
`0x90B2A`, where Eternal Night's −1 resist skips realm `0x14`.

**`0x90AB4` is Tactician, not Prayer**, despite the shape suggesting the latter. Its guard is
`byte [player*0x4C8 − 0x60CF]`, and `−0x60CF` is a *retort* field, not a global enchantment:
CoM 1 reads Chaos Surge at `−0x5CAA` (`0x8F0F9`), 0x425 bytes away, while the Guardian retort is
three bytes later at `−0x60CC` (`0x90589`). The hero test is `_UNITS[].Hero_Slot >= 0`
(`0x90ACB`, stride 32, `Hero_Slot` at +6 per ReMoM's `MOM_DAT.h`), and the ranged half is gated
on `ranged_type > −1` (`0x90AE5`). The magnitudes match `getAbilityStatSteps`'s Tactician
exactly — non-heroes +1 defence, heroes +2 defence / +2 resistance / +2 to every attack
strength, the hero's second defence point coming from re-entering the same `inc`.

Two consequences. Tactician participates in the ordering above, so CoM 1 adds it *after*
halving. And the write lives in the recompute, not the precalc, which argues its phase is **c**
rather than the **a** the calculator assigns it — left alone because re-attributing it would
change what Upgraded Explosive's fire-breath doubling reads, and that is a Warlord question with
no evidence yet.

### Prayer and High Prayer are identical in MoM and CoM 1, and both run before Warp (resolved 2026-07-28)

| Build | Prayer | High Prayer |
|---|---|---|
| MoM 1.31 | `0x9032F`–`0x9039D` | `0x9025C`–`0x9032D` |
| CoM 1 | `0x9033A`–`0x90374` | `0x9028x`–`0x90304` |

Both builds emit the same thing: Prayer is +1 tohit, +1 toblock, +1 resist; High Prayer is those
three plus, gated on `melee > 0`, `melee += 2`, `resist += 2`, `defense += 2`. So High Prayer
totals **+2 melee, +2 defence, +3 resistance, +10% to hit, +10% to block** — exactly what
`getAbilityStatSteps` already carries.

Two structural details fall out of the same read. High Prayer's block ends in a `jmp` past
Prayer's (`0x9032D` in MoM, `0x90304` in CoM 1), which is the mechanism behind
"High Prayer supersedes Prayer, not cumulative". And **neither build writes `.ranged`** — no
prayer boosts ranged, thrown, breath or gaze in either DOS engine.

Both blocks sit ahead of even CoM 1's early Warp Creature (`0x9074C`), so they take no part in
the ordering above.

### Level bonuses and hero-template abilities (resolved 2026-08-06)

This closes former verification item **A31**. R6.1f exhaustively reconstructed both contiguous
far routines in all three builds: `BU_Apply_Level_Bonus` at `0x8F881..0x8FB42` and
`BU_Apply_Hero_Abilities` at `0x8FB42..0x8FF09`. MoM 1.31 and CP 1.60 are byte-identical
throughout. The merged source is in `DOS reconstructed/unitcalc.c`; complete ledgers and review
provenance are in `R6.1f.evidence.md`.

**Heroism changes stored state only in CoM 1.** MoM floors the routine-local level at three after
testing Heroism on both the unit and battle-unit records (`0x8F89C..0x8F8D7`). CoM's floor is
`3 + Warlord + Crusade` for unsigned unit types below `0x97`; it writes the result back to
`_UNITS[].Level` at `0x8F8EE`. The player record base `DS:0x9ECA` resolves
`DS:0x9F2F` as Warlord at retort offset `+0x65`, and `DS:0xA35D` as
`Globals[0x11]`, Crusade. Without Heroism, types at or above `0x97` are persistently reset to
zero; lower types skip the write.

**The complete MoM normal ladder** is the five-step unrolled chain at
`0x8FA80..0x8FB3E`. Melee and ranged increments are gated only on the current strength being
positive; there is no `ranged_type` test:

| Step | Increment |
|---:|---|
| 0 | melee, ranged, Resistance |
| 1 | Defense, Resistance |
| 2 | melee, ranged, Resistance, To Hit |
| 3 | Defense, Resistance, To Hit |
| 4 | melee, ranged, Resistance, To Hit |

**CoM 1 replaces that chain with a 5×7 table** at `0x8FACA..0x8FAED`, indexed as battle-unit
byte fields 0–6:

| Step | Raw row | Increment |
|---:|---|---|
| 0 | `01 01 00 00 00 00 01` | melee, ranged, Resistance |
| 1 | `01 01 00 00 00 01 00` | melee, ranged, Defense |
| 2 | `00 00 00 00 00 01 01` | Defense, Resistance |
| 3 | `01 01 00 00 00 01 00` | melee, ranged, Defense |
| 4 | `00 00 00 00 01 00 00` | To Hit |

The gate at `0x8FA9A..0x8FAA9` skips the ranged column when
`ranged_type >= 100 && step != 1`. Thrown (100), Fire Breath (101), Lightning Breath (102),
Stoning Gaze (103), Multiple Gaze (104), and Death Gaze (105) therefore gain one point, at step 1
only. The loop has no local upper-bound test against its five rows: it tests only
`step < level`. Columns 2 and 3 are zero throughout, so its computed write can never alter
`ranged_type` or ammo.

**Heroes use a separate eight-threshold ladder.** CoM keeps the threshold count but substitutes
the following writes; melee/ranged increments remain positive-strength-gated:

| Step | MoM 1.31 / CP 1.60 | CoM 1 |
|---:|---|---|
| 0 | melee, ranged, Defense, Resistance | melee, ranged, Resistance |
| 1 | melee, ranged, Resistance, To Hit | melee, Defense |
| 2 | melee, ranged, Defense, Resistance | melee, ranged, Resistance |
| 3 | melee, ranged, Resistance | melee, To Hit |
| 4 | melee, ranged, Defense, Resistance, To Hit | melee, ranged, Resistance |
| 5 | melee, ranged, Resistance | melee, Defense |
| 6 | melee, ranged, Defense, Resistance | melee, ranged, Resistance |
| 7 | melee, ranged, Resistance, To Hit | melee, To Hit |

The adjacent hero-template helper supplies exact formulas:

| Ability | Effect |
|---|---|
| Noble or owner's Famous retort | upkeep = 0 |
| Agility / Super Agility | Defense += unsigned-byte `Level+1` / signed `((Level+1)*3)/2` |
| Blademaster | MoM/CP signed `(Level+1)/2`; CoM unsigned full-AX `(Level+1)/3` |
| Super Blademaster | signed `((Level+1)*3)/4`; CoM changes divisor 4 to 6 |
| Might / Super Might | melee += unsigned-byte `Level+1` / signed `((Level+1)*3)/2` |
| Arcane Power / Super Arcane Power | the same unsigned/signed formulas to ranged, gated on signed `ranged_type/10 == 3` |

CoM Blademaster's `div cl` consumes the full 16-bit AX. A Level below −1 therefore produces an
AL quotient overflow and a divide-error interrupt rather than a wrapped byte result.

**Casting Skill and Lucky are also rewritten.** Positive Casting Skill gives MoM/CP
`(skill+1)*(level+1)*5/2`, with signed truncation toward zero. CoM gives
`skill*(level+2) + table[type]`, using the 35-byte table embedded at
`0x8FB0A..0x8FB2D`. The load is word-sized at a byte index, but only AL is stored, so the
effective addend is one byte. MoM template Lucky directly adds one To Hit, To Block, Resistance
and Gold Resistance. CoM instead idempotently sets `USA_LUCKY`; because its constructor calls
the hero helper before the generic Lucky block, those four increments occur there exactly once.
### Lionheart (resolved 2026-07-28)

This closes former verification item **A28**. Unit enchantment `0x04000000`, in `BU_Apply_Specials` at `0x8F740`
(1.31, CP 1.60) and `0x8F660` (CoM 1):

```
if (!(ench & LION_HEART)) skip
if (melee > 0) { melee += 3; +0x64 += 3 }
if (ranged_type/10 == 2 || ranged_type/10 == 1 || ranged_type == 100)
                 { ranged += 3; +0x65 += 3 }      ; note: no `ranged > 0` gate
resist += 3; +0x67 += 3
```

Missile (20–29), boulder (10–19) and Thrown (100) qualify; magical ranged, breath and gaze never
do, in any build.

**CoM 1 drops the thrown bonus with a one-byte patch.** At the third test the MoM builds have
`cmp [bx+2],0x64 / jne` (`7520`); CoM 1 has `cmp [bx+2],0x64 / jmp` (`EB20`), jumping past the
ranged bonus unconditionally and leaving the `cmp` as dead residue. Missile and boulder still
arrive through the two earlier `je`s.

The HP bonus is in the hit-point routine instead, where `di` accumulates per-figure hits:

| Build | Site | Code | Effect |
|---|---|---|---|
| MoM 1.31 | `0x8E950` | `add di, 3` | +3 |
| MoM CP 1.60 | `0x8E950` | `add di, 3` | +3 — only the `+0x68` display accumulator was re-gated |
| CoM 1 | `0x8E943` | `ax = 8; div byte es:[bx+0x13]; xor ah,ah; add di,ax` | `floor(8 / Max_Figures)` |

`+0x13` is `Max_Figures` (ReMoM `MOM_DAT.h:1943`); `div` leaves the quotient in `AL` and `xor
ah,ah` keeps it, so the CoM 1 result floors. All of this matches the Fandom `Lionheart.md`.

### Chaos Surge (resolved 2026-07-28)

This closes former verification item **A27**. Not in `BU_Apply_Specials` at all — it is in the **battle-unit
constructor**, so it applies exactly once per unit. MoM 1.31, `0x8F113`–`0x8F18F`:

```
flag = 0
for di in 0 .. num_players-1:
    if (byte [0xA356] > 0) flag = 1      ; ← no `di` term
if (!flag || bu.race != 0x12 /*rt_Chaos*/) skip
if (ranged > 0) { ranged += 2; +0x65 += 2 }
if (melee  > 0) { melee  += 2; +0x64 += 2 }
```

- **+2 flat, and copies do not stack** — it is a boolean, so N wizards still yield +2.
- **No resistance bonus in either MoM build.**
- The `.ranged` write is unconditional on `ranged_type`, so it reaches missile, boulder, magical
  ranged, thrown, breath **and gaze** — all of which share `+0x01`. The Fandom `Chaos Surge.md`
  says the same, Doom Gaze included.
- **1.31 only ever tests player 0.** The loop counter never enters the address. CP 1.60 relocates
  the body to `0x8F177` and CoM 1 has it at `0x8F0F9`; both compute `bx = di * 0x4C8` and read
  `[bx-0x5CAA]`, which is the same byte at `di = 0`. The wiki's Known Bugs section describes
  exactly this and credits Unofficial Patch 1.50 with the fix, which CP 1.60 carries.

**The Chaos Channels exclusion is an ordering artefact, and it reverses in CoM 1.** In MoM the
constructor runs Chaos Surge *before* its `BU_Apply_Specials` call, and that function's CC block
then does `mov byte es:[bx+1], 2` — a plain assignment that overwrites the +2. CoM 1 calls
`BU_Apply_Specials` first (`0x8F0E8`) and runs Chaos Surge after (`0x8F0EE`), so there the CC
breath is already in place at strength 4 and does keep the bonus. Nothing re-runs the CC block
later: CoM 1 passes mutations = 0 at the recompute's call.

**CoM 1 stacks, and adds resistance** (`0x8F0EE`–`0x8F141`). `cx` counts the players holding the
enchantment, then `cx++`:

| Stat | MoM 1.31 / CP 1.60 | CoM 1 |
|---|---|---|
| melee | +2 | +count+2 (`add cl` then `inc`) |
| ranged slot | +2 | +count+1 |
| resistance | — | +count+1, ungated |

CP 1.60 keeps 1.31's +2/+2/no-resist shape; the player indexing is its only change here.

### Undead immunities are a race gate in MoM, a mutation gate in CoM 1 (resolved 2026-07-27)

MoM does not hang these off the mutation flag at all. `BU_Apply_Specials`'s undead block
(`0x8F3DC`, `test cl,0x20`) writes only `race = 0x14` (rt_Death) and `Abilities |= UA_FANTASTIC`.
The immunities come later in the same function, from a **race** test:

```
0x8F81A  cmp byte es:[bx+0x0b], 0x14     ; race == Death
0x8F828  or  ax, <mask>                   ; Attribs_1 |= mask
```

| Build | Mask | Bits granted |
|---|---|---|
| MoM 1.31 | `0x0040` | Death only |
| MoM CP 1.60 | `0x00D8` | Death + Poison + Cold + Illusion |
| CoM 1 | gate deleted | — |

CoM 1 moved the grant into the mutation block itself: `0x8F4B4 test cl,0x20` → race Death,
`Abilities |= UA_FANTASTIC`, `0x8F4C6  or byte es:[bx+0x18], 0x58` = Death | Cold | Illusion —
**no Poison (`0x80`)** — and `and Abilities, 0xDF`, clearing `UA_CREATEOUTPOST`.

This is exhaustive, not sampled: every immediate-OR into `+0x18` was enumerated across all three
files in both encodings Borland emits (`grp1 [r+0x18], imm` and the load/or/store triple). The
sites above are the only undead-related ones.

Two consequences of the gate being on *race*:

- **Black Channels inherits it.** Its own write is `or ax, 0x98` (Illusion | Cold | Poison) at
  `0x8F4BA`, and it sets `race = 0x14`, so the race gate then supplies Death — all four in both MoM
  builds. CoM 1's Black Channels block instead ORs the same `0x58` at `0x8F515`, so it too loses
  Poison.
- Any natural Death-race battle unit picks up the same bits in MoM regardless of how it got there.

CoM 1's undead *conversion* is visible next door: `0x8F491`, `test dx,4`, writes `UM_UNDEAD` into
the persistent `_UNITS[].mutations` (`0x8F4AC`) and ORs `0x20` into `cl` so the undead block runs
in the same pass. **That block is Blood Lust, not Animate Dead** — CoM 1's own name→mask table at
`0x2D13E` calls `0x00000004` "BloodL." and `0x00000010` "Animated", and `CoM helptext.txt:1247`
gives Blood Lust as "the target unit turns into undead and has double melee attack power against
normal units". The Animate Dead *spell* (`:1357`) grants the `0x10` Animated enchantment, whose
block is at `0x8F4D0`. Nine CoM 1 slots are renamed in total; see
`DOS reconstructed/R6.1a.evidence.md`, *CoM 1 renamed nine enchantment slots*.

### CP 1.60 and CoM 1 removed the melee to-hit penalty from defender To Block

MoM 1.31 reads `toblock` (+0x26) **twice** in `BU_ProcessAttack`: at `0x99AB5` for the defense
roll, and again at `0x99C34`, where it is subtracted from the attacker's melee to-hit
(`attack_tohit += melee_tohit - toblock`). ReMoM annotates the second use as a bug — the
defender's blocking already reduces damage via the defense roll, so it is applied twice.

**Both later builds fix it.** CP 1.60 nops the subtraction itself (`0x99C3A`: `2B D0`
→ `90 90`), so `dx` reaches the add still holding `melee_tohit` alone. CoM 1 drops the whole
second read, leaving `push ax / pop dx / add [bp-0x1a], dx` as patch residue. Either way only
MoM 1.31 melee attackers take a to-hit penalty of 10% per point of defender To Block.

**The `toblock` field holds the bonus, not the absolute 30%** — base is 0, since
`CMB_DefenseRoll` succeeds on `die >= 8 - to_block`. So the penalty only appears when
something raises it, and in 1.31 exactly two things do: **Lucky** and **Prayer / High Prayer**
(+1 each, stacking to −20%). This is why the effect is documented on the Fandom wiki as a
Lucky/Prayer quirk rather than as a general To Block rule.

**Eldritch Weapon does not interact with it.** At `0x99EEF` it tests `Att_EldrWeap` (0x4000)
and at `0x99EF6` decrements the *local* `[bp-0x1e]` copy of `defender_toblock` — loaded at
`0x99ABA` and consumed only by the two `CMB_DefenseRoll` calls (`0x9A2AA`, `0x9A4A0`). The
melee to-hit penalty re-reads the struct field instead, so Eldritch Weapon affects the defense
roll only.

The calculator models this correctly, as a flat −10% per carrier in
`applyPairToHitModifiers` (`combat_phases.js`) gated to `mom_1.31`, floored at 10%. The floor is right:
`CMB_AttackRoll`'s `|| die_roll == 10` clause guarantees a 10% hit chance regardless of how
negative the to-hit goes. Note the implementation encodes the *symptom* per named ability
rather than the *mechanism*; that is equivalent only because Lucky and Prayer are the sole
To Block sources in 1.31, so adding any new one would need this revisited.

### Blur (resolved 2026-07-26)

The Blur filter sits between the attack roll and the defense roll — `CMB_AttackRoll` at
`0x9A20E`, blur block, `CMB_DefenseRoll` at `0x9A2B1` — so it removes hits before defence is
subtracted, in all three builds. Automatic/Doom damage (`attack_attributes & 0x10`, tested at
`0x9A1E6`) jumps straight to `0x9A2D8`, skipping blur, the defense roll and Invulnerability.

Blur is a **side-wide combat enchantment**, not a unit ability: the gate is the defender's
`controller_idx` (+0x35) against the attacker/defender player globals `[0xC586]`/`[0xC584]`,
selecting `combat_enchantments[0x1C]` (`BLUR_ATTKR`) or `[0x1D]` (`BLUR_DFNDR`) off the base
pointer at `[0x922e]`. Throughout the block `si` is the defender's battle-unit index and `di`
the attacker's.

**MoM 1.31 — both documented bugs are real.** Blur block `0x9A216`–`0x9A2A8`:

```
0x9A246  test es:[bx+0x18], 8   ; USA_IMMUNITY_ILLUSION, on si — the DEFENDER
0x9A286  i = 0
0x9A28D  ax = Random(10)
0x9A297  cmp ax, 0xA / jne 0x9A29F
0x9A29C  dec hits
0x9A29F  inc i                  ; reached on both the success and failure paths
0x9A2A2  loop while i < hits    ; re-reads the decremented bound
```

Rate is `Random(10) == 10`, i.e. 10%. Because a success decrements the bound *and* still
advances the counter, each negation costs two units of budget: with `h` hits the maximum
negated is `ceil(h/2)`, so reduction is capped just above 50% and tends to it. Both immunity
tests (the `BLUR_ATTKR` and `BLUR_DFNDR` branches) read the defender's `Attribs_1`, not the
attacker's.

**MoM CP 1.60 fixes both, in 10 bytes.** Of the 192 bytes that differ across
`BU_ProcessAttack`, three clusters land here:

| Offset | 1.31 | CP 1.60 |
|---|---|---|
| `0x9A23A` | `8B C6` (`mov ax,si`) | `8B C7` (`mov ax,di`) |
| `0x9A272` | `8B C6` | `8B C7` |
| `0x9A297`–`0x9A29E` | `cmp ax,0xA / jne / dec hits / inc i` | `dec ax / jne / dec hits / jmp / inc i` |

The loop fix works by *skipping* `inc i` on a success, so each of the original `h` hits gets
exactly one roll and negations become Binomial(h, 0.1) with no ceiling. The rate is unchanged —
still `Random(10)`, the success sentinel merely moved from `==10` to `==1`.

**CoM 1 rewrites the block** (`0x9A216`–`0x9A292`, helper at `0x9A256`, `nop` padding to
`0x9A2A9`) and carries the fixed semantics plus a rate table:

```
0x9A21D  test [bp-0x2C], 0x8000        ; UE_INVISIBILITY on the defender
0x9A224  test es:[bx+0x1C], 0x40       ; UA_INVISIBILITY (innate) on the defender
0x9A22B  cx += 0x14                    ; 20
0x9A24D  blur present: cx ? cx = 0x1E : cx += 0x14   ; 30 if stacked with invisibility, else 20
0x9A265  ax = di → test es:[bx+0x18], 8 ; illusion immunity, on the ATTACKER
0x9A27E  ax = Random(100); cmp ax,cx; jg → skip; else dec hits
0x9A28F  dec di / jne                  ; counts down the ORIGINAL hit count
```

So CoM 1's rate is 20%, Invisibility alone grants the same 20%, the two together cap at 30%
(`mov cx, 0x1E`), and no equivalent invisibility branch exists in either MoM build.

The calculator matches all of this: `getBlurChance` (`combat_effects.js`) and `blurSurvivingDist`
(`engine.js`, whose DP is exactly the 1.31 loop's distribution). Its one simplification is
modelling Blur as a defender ability rather than a side-wide enchantment.

The entire block and its surrounding attack/defence ordering were independently reconstructed
and cross-reviewed in R6.2c. Verified: Claude 2026-08-07; Codex 2026-08-07, independent. Full
evidence: `DOS reconstructed/R6.2c.evidence.md`.

ReMoM renders this block correctly, including both `BUG:` annotations — unlike its to-hit
assembly.

### Gaze attacks: one slot, two figure bounds, and a realm (resolved 2026-07-27)

**One data slot, settling former verification item B8.** A gaze's strength is `.ranged` (+0x01) and its type is
`.ranged_type` (+0x02) — the same two fields ranged, thrown and breath use. There is no second
slot, so a unit can never carry a gaze *and* a conventional ranged attack. `ranged_type == 104`
ORs Automatic Damage into `attack_attributes` at `0x99B55`, and that flag makes the per-figure
body assign `hits = attack_strength` and jump past both rolls (`0x9A1E6` → `0x9A204`). "Hidden
gaze strength" and "doom gaze strength" are therefore the same number, rolled for 103/105 and
delivered automatically for 104.

Because that assignment sits inside the per-figure loop, **MoM's doom damage scales with the
attacker's figure count.** No roster consequence — Chaos Spawn, its only Doom Gaze unit, has one
figure. CoM2 and Warlord deliberately do not scale it; see
`Caster binary/CoM2 binary - combat flow.md`, *Gaze attacks*.

**Dispatch.** `BU_AttackTarget` fires gaze from two sites — melee rider (`0x99499`,
`ranged_type >= 100`) and defender retaliation (`0x9958D`, `ranged_type >= 103`). Both push
`attack_mode = 1` (`0x994AD`, `0x99628`) and the gazer's current figure count. Both call sites,
and the per-figure loop tail, are byte-identical in all three builds. Because mode 1 fails the
`cmp attack_mode,2`, **the range penalty never reaches a gaze in any build.** In 1.31 the same
gate also withholds `ranged_tohit` (+0x25), so a gaze's to-hit is the base `tohit` (+0x04) alone;
CP 1.60 and CoM 1 hoist the `+0x25` add above the gate (see *Holy Weapon*), though nothing that
writes `+0x25` admits a gaze `ranged_type` anyway.

**Two different figure bounds.** This is the part that is easy to get backwards:

| Part | Code | Bound |
|---|---|---|
| Stoning kill rolls | `0x99D82`–`0x99E0F`, skip on `Attribs_1 & 0x02` | **defender** figures (`0x99E0C`) |
| Death kill rolls | `0x99E20`–`0x99EAE`, skip on `Attribs_1 & 0x40` | **defender** figures (`0x99EAB`) |
| Hidden conventional damage | inside the per-figure loop (body `0x99F5A`, back-edge `0x9A576`) | **attacker** figures (`0x9A579`) |

Both kill loops sit *before* the per-figure loop, so they resolve once per attack however many
figures the gazer has. Each failed save adds the defender's per-figure `hits` (+0x10). Type 104
runs both loops (stoning gate `103||104`, death gate `104||105`), which is why a unit with both
gazes is necessarily 104. Both read the same save modifier — `di.Spec_Att_Attrib` (+0x15) through
the same extractor at `0:0x2c8`, negated — so there is one modifier byte, not two.

**Realm.** The classifier at `0x9A79E`–`0x9A856` maps `ranged_type` to a realm via a 21-entry
switch whose case table is at `0x9A857` and target table at `0x9A881` (code segment base
`0x98F60`). Its result is `Battle_Unit_Defense_Special`'s `[bp+0xe]` argument, pushed at
`0x99ED7`. Full decode: `0` → attacker race (+0x0B) − 16, with race < 15 → −1 and race 15 → 5;
10–22 → −1; 30,31,33,36 → Chaos; 32 → Sorcery; 34,35,37,38 → Nature; 100 → −1; 101,102 → Chaos;
**103 → Nature, 104 → Chaos, 105 → Death**. Identical in CP 1.60; CoM 1's single byte of
difference in this function moves type 34 (Icebolt) from Nature to Sorcery, leaving the gaze rows
untouched.

**Defence specials for a gaze.** The immunity-mask builder (`0x99150`–`0x99291`, complete) can
put only the Illusion bit into a gaze's mask: Missile Immunity needs `ranged_type / 10 == 2`,
Magic Immunity needs `== 3`, and Weapon Immunity needs `< 3` or the unsatisfiable `== 100`. So
**Weapon Immunity can never reach a gaze in any build** — structural, and independent of gaze
attackers happening to be fantastic. Magic Immunity still applies, but through the direct test at
`0x9A69E` (`realm >= 0 && ranged_type != 0`), not the mask. The rest, in `Battle_Unit_Defense_Special`
order:

| Effect | Site | Gate | Stoning (Nature) | Doom (Chaos) | Death (Death) |
|---|---|---|---|---|---|
| base | `0x9A5FF` | — | defender `.defense` | ← | ← |
| Large Shield +2 | `0x9A64F` | `ranged_type != 0` | ✓ | ✓ | ✓ |
| Magic Immunity → 50 | `0x9A69E` | realm ≥ 0, non-melee | ✓ | ✓ | ✓ |
| Bless +3 | `0x9A6D3` | realm ∈ {Chaos, Death} | — | ✓ | ✓ |
| Righteousness → 50 | `0x9A728` | realm ∈ {Chaos, Death}, non-melee | — | ✓ | ✓ |
| Elem. Armor +10 / Resist Elem. +3 | `0x9A750` / `0x9A766` | realm ∈ {Chaos, Nature}, non-melee | ✓ | ✓ | — |
| Armor Piercing | `0x9A770` | `attack_attributes & 1` | halves the total | ← | ← |

The return value is stored at `0x99EEC` and passed straight to `CMB_DefenseRoll` (`0x98F9D`) at
`0x9A2B1`, so defence genuinely applies; `CMB_AttackRoll` (`0x98F60`) at `0x9A207` takes
`(attack_strength, attack_tohit)`. **No `ranged_type` reference exists anywhere between `0x99EE0`
and the function's end at `0x9A586`** — an exhaustive scan of the bounded function — so nothing
in the damage pipeline is gaze-specific.

**CoM 1 rewrote this function's realm handling** (220 bytes differ, against CP 1.60's 47):

- **Righteousness is gone entirely** — `0x9A6DC`–`0x9A732` is a solid run of `nop`.
- **Bless is +5 and picks up a `ranged_type > 39` test on top of its realm gate** (`0x9A6D3`),
  leaving breath and the Chaos/Death gazes — see *Bless*.
- **The elemental bonus lost its realm gate**, replaced by `ranged_type != 100 && >= 30`
  (`0x9A733`), which admits all gazes.

CP 1.60 keeps 1.31's realm gates; its only change here is the documented Righteousness lookup
replacement at `0x9A6D9`.

### Holy Bonus and Resistance to All are per-player maxima (resolved 2026-07-31)

Both are `Attribs_2` (+0x1A) flags whose **magnitude is the unit's `Spec_Att_Attrib`** (+0x15) —
`0x80` Holy Bonus, `0x40` Resistance to All. This is where those two abilities read the shared
value byte; see *Touch-effect immunities* for its other five consumers.

Three stages:

1. **Provider.** The magnitude lives in the provider's own `+0x15`. Roster confirmation: Paladins
   1, Angel 1, Arch Angel 2 (`0x80`); Unicorns 2, Guardian Spirit 1 (`0x40`) — matching the
   `Gaze/Poison` column exactly, and none of these units carries any other `+0x15` consumer.
2. **Aggregation.** A side-wide scan at `0x9A9E0` walks the battle units, taking
   `di = controller_idx` (+0x35), and for each flag keeps the **maximum** provider value into a
   per-player word array: `[0xC89E]` Holy Bonus, `[0xC89A]` Resistance to All, indexed
   `controller_idx * 2`. Neither array is a unit field.
3. **Consumption.** The stat recompute reads them back — Holy Bonus at `0x900D8`, `0x900F9`,
   `0x90162`, `0x90185`; Resistance to All at `0x9011C`, `0x9013F` — and adds to the receiving
   unit's melee, defense and resistance. This is why an exhaustive `+0x15` scan of the recompute
   (`0x8FF09`–`0x90B8D`) finds nothing: the recompute reads the player array, never the byte.

R6.5d now supplies the complete aggregation routine around that middle stage. Before scanning
units, it imports Cloud of Shadow into defender Darkness in all three builds
(`0x9A8B3..0x9A8C7`) and imports Heavenly Light into defender True Light only in MoM 1.31 and CP
1.60 (`0x9A8C8..0x9A8DC`). Its Eternal Night player scan marks attacker Darkness, defender
Darkness, or both when the holder belongs to neither combat side (`0x9A8DD..0x9A936`).

The same routine aggregates hero Prayer and Leadership. MoM 1.31 treats the four hero bits
separately with signed `n`, `3n/2`, `n/3`, and `n/2` formulas for `n = Level+1`
(`0x9AAF6..0x9ACCC`). CP 1.60 explicitly zero-extends Level and combines each two-bit family:
Prayer alone uses `n`, any other nonzero Prayer mask uses `n+n/2`; Leadership alone uses `n/3`,
any other nonzero Leadership mask uses logical `n/2` (`0x9AADA..0x9AB5D`). CoM 1 returns to a
signed Level load, uses low-byte-only shifts for both Prayer formulas, and also maximizes five
still-unnamed seven-byte groups at dseg `0x3AAC..0x3ACE` (`0x9AABA..0x9ABF8`).

The city-defense prepass also differs. MoM 1.31 adds 3 Defense to defender-controlled units when
the routine argument is city mode (`0x9A98F..0x9A9CF`). CP and CoM require either `walled` or
`wall_of_fire` and add 2 (`0x9A98F..0x9A9CF` CP; `0x9A98F..0x9A9CA` CoM). CP/CoM clear two
prayer-source bytes and mark defender slot 0 or other slot 1 whenever Resistance or Prayer raises
the shared maximum. The terminal Holy-Bonus fold uses `num_players` in 1.31 but seven fixed slots
in CP/CoM (`0x9ACD9..0x9ACFC`). Verified: Codex Agent A 2026-08-08, independent; Codex Agent B
2026-08-08, independent; followed by reciprocal review. Full evidence:
`DOS reconstructed/R6.5d.evidence.md`.

Two consequences. **The engine maxes over providers and applies the winner once**, so copies do
not stack — which is what `mergeAbilityCalcValue`'s `max(own, received)` already yields.
And **receiving costs a unit nothing**: a Death Gaze −2 unit has `+0x15 = 2` and `Attribs_2 = 0`,
and takes a stackmate's Holy Bonus with no interaction. Only *providing* contends for the byte,
which is why no unit in the roster both provides one of these and carries a gaze or touch effect.

The `Attribs_2` bitmask decodes cleanly across all 198 unit-type records: `0x01` Healing Spell,
`0x02` Fire Ball Spell, `0x04` Doombolt Spell, `0x08` Immolation, `0x10` Web Spell, `0x20` Cause
Fear Spell, `0x40` Resistance to All, `0x80` Holy Bonus. ReMoM leaves this field unnamed.

### ReMoM discrepancies found

ReMoM's `BU_ProcessAttack__WIP` renders all three of the above incorrectly — `=` for `+=`, and
an `else` that merges the mode test with the `Has_Ranged_Attack` failure. Treat `__WIP` and
`__NOOP` functions as structurally unreliable, not merely unfinished. Its *sibling*
`Target_Unit_Value` (an AI estimator) happens to render the `+=` correctly; where two ReMoM
functions disagree, check the binary rather than picking one.

`scan_mom_binary.py find` surfaces `Target_Unit_Value` (`0x9B590`–`0x9BB02`) alongside the real
resolver, because an estimator reads the same fields. It is not a second combat path: three
arguments rather than seven, no caller-supplied damage array, no figure loop and no attack roll;
it seeds a score at −100 and returns −200 for an unreachable flying target. Rule candidates out
by bounding and reading them, not by their field signature.

`MOM_DAT.h` is a host-side reconstruction — its `SAMB_ptr` and the union at `+0x0E` will not
reproduce the DOS layout under modern `sizeof`. Its offset *comments* are the useful part; treat
them as search hints and confirm each field against the binary's stride and consumers.
