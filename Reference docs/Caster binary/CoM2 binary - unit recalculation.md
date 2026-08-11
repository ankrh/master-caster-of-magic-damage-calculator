# CoM2 / Warlord binary analysis — unit recalculation

The five-region calculated-unit pipeline, its two script hooks, field identities, aura processing, and the calculator transform audit.

Addresses refer to the pinned `Caster.exe` build. See the [analysis index](./CoM2%20binary%20analysis.md) for binary identity, method, and the subsystem map.

## Unit stat recalculation: two script hooks, and a fifth region after them (2026-07-28)

`@Units@RecalculateUnits` (`0x599920`, len `0xE150`) is the whole per-unit stat pipeline. It
calls `@Scripts@RunScript` **exactly twice**, and no other routine in the binary runs a per-unit
stat script. Both call sites are byte-identical in shape: test the enabled flag, set script
variable `U` to the unit index via `@Scripts@SetScriptNumVar`, run.

The script identities are read, not inferred — `@Init@GameInitialize` loads them from
`MODDING.INI [Scripts]`, and each read's default value names the script:

| Handle global | INI key | Default | Hook call site |
|---|---|---|---|
| `0x707FB4` | `UnitRecalculateEarly` | `UnitCalcPre` | `0x59A027` (+0x00707) |
| `0x708F68` | `UnitRecalculate` | `UnitCalc` | `0x5A65D7` (+0x0CCB7) |
| `0x709AF8` | `UnitRecalculateEnabled` | 0, at `0x6355CD` | guards both |

This confirms the phase model in `Calculator/SPEC.md` (*Stat derivation contract*) — and extends
it. The routine has **five** regions, not four:

| Region | Offsets | Bytes | Direct literal unit-field writes | Distinct literal fields |
|---|---|---|---|---|
| `a` | +0x00000 … +0x00707 | 1,799 | 9 | 7 |
| `b` | — `UnitCalcPre` — | | | |
| `c` | +0x00707 … +0x0CCB7 | 50,608 | 492 | 93 |
| `d` | — `UnitCalc` — | | | |
| **`e`** | +0x0CCB7 … +0x0E150 | 5,273 | 10 | 10 |

That last pair of columns is **not a complete write count**. It counts only instructions whose
memory operand still contains a literal displacement in the `0x642xxxx` window. Region `e`
computes a pointer to the current unit record at `+0xD0ED` and performs the whole aura pass
through short operands such as `[edx+0x20]`; none of those writes appears in the table. The
literal scan was enough to show that `e` is not empty, but not enough to identify everything in
it. See *Region e, block by block* below.

### Phase index: which effect is handled where

An index into the per-region sections below, which remain the home for what each effect
actually does. Names are the effect as this document names it elsewhere.

**`(warlord)` marks an effect that exists only in the Warlord mod.** Regions `b` and `d` are
*entirely* Warlord: vanilla CoM2 ships `UnitCalcPre.CAS` and `UnitCalc.CAS` as stubs, so for
base CoM2 both phases are empty and `a → c → e` run back to back. Every `b`/`d` entry is
tagged accordingly. Untagged entries are compiled into `Caster.exe` and apply to both versions.

#### Phase `a` — pre-script setup (`0x599920`, +0x00000…+0x00707)

- *Control / ownership:* Possession, Creature Binding, Confusion (value 2 only).
- *Type and stat grants:* Chaos Channels Breath (+4 Fire Breath, race → Chaos, Fantastic);
  Resist Elements, granted by hard-coded unit-type rule to Golems (`unittype` 81);
  `combatsummoned` → Fantastic.
- *Bookkeeping, not stats:* base-record copy and `prevmaxmoves` save; the 1–100 enchantment
  aggregate merge (`EncMagic` cleared first); Pandora's Box budget refill;
  `DefenderSight`/`AttackerSight` reset.

Nothing else. All level, item, weapon-material and curse work is in `c`.

#### Phase `b` — `UnitCalcPre.CAS`, all `(warlord)`

- *Hero and item:* Marionette (warlord), Ascension (warlord), Dummy Armor (warlord),
  Transmute Equipment (warlord), Rebuild (warlord), legacy/new item-power upgrades (warlord),
  Benefactor (warlord), Famous (warlord), Doom Mastery (warlord), Just Cause (warlord),
  Planewalker (warlord), Elemental Master (warlord), Irresistible Charge (warlord),
  Rampage (warlord), Khan the Conqueror (warlord), Tactician/Khan strategic path (warlord).
- *Enchantment protection and conversion:* Spirit Link (warlord), Vampirism flag guard
  (warlord), Domain of the Enchanter curse copying (warlord), Sanctify realm/type conversion
  (warlord), Great Unbinding (warlord).
- *Outlander tech, pre-magic order:* Xenoveterinary (warlord), Power Engine (warlord),
  Explosive and Upgraded Explosive (warlord), Ballistics (warlord), Xenopsychology (warlord),
  Radio (warlord), Battle Armor (warlord); plus the overland transport/healer effects
  (warlord).
- *Level:* `THEORECTICALLEVEL` from level, Heroism, Warlord and Crusade (warlord).
- *Unit and combat effects:* Fiery Fury (warlord), Insulation (warlord), Discipline (warlord),
  Divine Protection (warlord), Land Link (warlord), Zombie Mastery (warlord), Conjuring Pact
  (warlord), Uphill Battle (warlord), Lucky (warlord), Lucky Star aura (warlord), Eternal
  Night (warlord), Darkness (warlord), Soul Flay (warlord), Blood and Iron (warlord), Mariner
  and Echo of the Deep (warlord), Midget Submarine (warlord), Rage (warlord), Prayer with
  High Prayer extension (warlord), Rousing Speech (warlord), True Light (warlord), Plague
  (warlord), Goblin Pox (warlord), Specialist Mastery (warlord), Guardian/Lord Protector
  (warlord), Gods Play Dices (warlord), Water Elemental terrain bonus (warlord), Inner Power
  (warlord), Eye of Storm (warlord), Revenant (warlord), Mariner Mastery (warlord), Eye of
  Heaven → True Sight (warlord).
- *City defender:* Dishearten Prophecy (warlord), Wall of Fire (warlord), Gospel of
  Evangelism (warlord), Lord Liberator (warlord), siege buildings (warlord).

#### Phase `c` — compiled main body (+0x00707…+0x0CCB7)

- *Experience and level:* Heroism, Crusade, Warlord retort, Destiny, `ApplyLevelBonus`,
  `ApplyHeroBonus`.
- *Items:* the three-slot equipment loop — numeric powers 1–35 and the named powers 36–73
  (Flaming, Insulation, Pandora's Box, Lightning, Doom, Destruction, Fear, Vampiric, Death,
  Wraith Form, Shadow, Necromancy, Bless, Holy Avenger, True Sight, Lionheart, Divine
  Protection, Invulnerability, Water Walking, Pathfinding, Stoning, Resist Elements, Elemental
  Armor, Merging, Regeneration, Guardian Wind, Resist Magic, Flight, Phantasmal, Invisibility,
  Teleporting, Haste, Immolation, Recharge, Egoism, Dark Force, Amplifier, Stealth).
- *Weapons:* Magic / Mithril / Adamantium To Hit, then `ApplyMagicWeapons` for strength.
- *Unit enchantments:* Focus Magic, Hovering, Water Walking, Wind Walking, Invisibility, True
  Sight, Invulnerability, Flight, Cloak of Fear, Wraith Form, Endurance, Discipline, CC
  Flight, CC Armor, Blood Lust, Animated, Guardian Wind, Magic Immunity, Flame Blade
  (Thrown bonus 0 CoM2 / 2 warlord), Immolation, Mystic Surge, Lionheart, Iron Skin, Land
  Link, Holy Armor, Orihalcon, Holy Weapon, Sanctify, Regeneration normalization.
- *Curses and reductions, in this order:* Haste, Vertigo, Weakness, Mind Storm, Warp Attack,
  Warp Defense, Warp Resist, Shatter, Web, Frozen, Black Sleep, Terror, Spell Ward.
- *Global enchantments:* Crusade, Wind Mastery, King of Underworld, Holy Arms, Chaos Surge,
  Survival Instinct, Clairvoyance, Inner Power, Blazing Eyes, Reinforce Magic, Eternal Night,
  Charm of Life.
- *Astronomical events:* Bad Moon, Good Moon, Nature Conjunction.
- *Combat globals:* High Prayer, Prayer, Blazing March (Thrown bonus 0 CoM2 / 3 warlord),
  Breakthrough, Mass Invisibility, Warp Reality, Black Prayer, Darkness, Entangle, Terror,
  Flying Fortress.
- *Retorts and derived:* Lucky, Dark Force, Guardian (settlement defence), Tactician, Guardian
  Spirit node meld, native node aura, Illusion Immunity → side-wide sight, the Chosen
  unit-type Fantastic rule, strategic-combat normalization, movement clamps and minimums.

#### Phase `d` — `UnitCalc.CAS`, all `(warlord)`

- *Repairs and conversions:* Guardian Wind (warlord), Chaos Channels Fire Breath top-up
  (warlord), Invisibility (warlord), Planewalking (warlord), Venom (warlord), Focus Magic and
  its touch conversion (warlord), Sanctify (warlord), Undead spell conversion (warlord),
  Lifted Ship (warlord), heavy-unit Flying → Thrown (warlord).
- *Stack, hero and city:* Goblin/Warboss (warlord), Engineer (warlord), Mechanical Master
  (warlord), the five Chosen-of-realm hero auras (warlord), Angelic Guardians (warlord),
  Tree of Life (warlord), Hive (warlord), Baray (warlord), Cloud of Shadow (warlord),
  siege buildings (warlord), terrain and Tactician bonuses (warlord).
- *Combat effects:* Weakness (warlord), Zeal (warlord), True Sight (warlord), combat-cast
  Flame Blade (warlord), Berserk (warlord), Night Goblin (warlord), Rust (warlord), Bloodlust
  (warlord), Buried (warlord), Aether Flux (warlord), Hurricane (warlord), Temporal Twist
  (warlord), Tangling Roots (warlord), Sacred Ancient (warlord), Ice Age (warlord), Spirit
  Link (warlord), Apotheosis (warlord).
- *Attack rescaling, in this order:* Colossal Strength (warlord) → Vampirism (warlord) →
  Shadow Strike (warlord).
- *Post-magic Outlander tech:* Energy Weaponry (warlord), Psycho Force (warlord), Pneuma Field
  (warlord), Energy Cannon/Destruction (warlord).
- *Late overrides:* Unstoppable Stampede (warlord), State of Rot (warlord), hostile Eye of
  Heaven removing gazes (warlord), Blaze of Glory (warlord), Beat of Swiftness (warlord),
  Midget Submarine (warlord), Hierophany (warlord), Trapped (warlord), Fairy Maze (warlord).
- *Overland only:* Astral Gate (warlord), submarine/lifted-ship (warlord), Time Stop
  (warlord); plus Red Button, Tactical Retreat and Strategic Recall (warlord).

#### Phase `e` — post-script auras and reconciliation (+0x0CCB7…+0x0E150)

- *Stack auras, merged by maximum per tile/owner/type:* Holy Bonus, Guiding Beacon,
  Prayermaster, Resistance to All (feeds the Prayermaster aura type), Divine Barrier, Soul
  Linker, Supply Commander, Logistics, Leadership, Misfortune. Armsmaster is dispatched here
  but is an explicit no-op.
- *Last stat write of the whole pipeline:* Supreme Light, which also materialises
  `EncSupremeLightRegen`.
- *Normalization:* common To Hit clamped to 10–100, then each `common + attack-specific` sum;
  attack strengths and Defense clamped non-negative; unit MP capped; combat movement
  reconciled against `prevmaxmoves`; `DebugInvis`; deferred-damage reconciliation.

#### Not handled in this pipeline

Stasis (combat and overland), Resist Elements, Elemental Armor, Regeneration, Resist Magic,
Spell Lock, Bless, Necromancy, Buried and No Heal. Region `a` grants Golems the Resist Elements
*flag* and region `c` normalizes the Regeneration *value*, but neither effect is applied here.
All ten are consumed at use time — see [Resolution helpers](./CoM2%20binary%20-%20resolution%20helpers.md),
*Resolution-time modifiers*.

### Region `a`, block by block

Region `a` is completely assigned. `@Units@RecalculateUnits(com, tap, tax, tay)` uses
`com` to select combat units and `tap/tax/tay` as plane/X/Y filters. `tax = -1` disables the
whole location filter. The region selects units, resets each current record from its base
record, rebuilds derived enchantment state, applies the few transformations which must be
visible to `UnitCalcPre`, and calls that script.

| VA / offset | Purpose | Confidence |
|---|---|---|
| `0x599920`–`0x599960` / +0x00000–+0x00040 | Procedure setup; clear combat-global `DefenderSight` and `AttackerSight`, the two flags which record whether either side can see Invisible units | exact |
| `0x599960`–`0x599A8D` / +0x00040–+0x0016D | Iterate `1..MaxUnits`; skip dead units; when `com` is true require `incombat`; when `tax != -1` require the requested plane, overland X and overland Y | exact |
| `0x599A8D`–`0x599B30` / +0x0016D–+0x00210 | Save the unit's pre-recalculation `combatmaxmoves` in `prevmaxmoves[i]`, then copy all `0x1E1` dwords (1,924 bytes, one complete `unitT`) from `BaseUnits[i]` to `Units[i]` | exact |
| `0x599B30`–`0x599C2D` / +0x00210–+0x0030D | Clear the current aggregate `EncMagic` marker, then for enchantment IDs 1–100 rebuild the aggregate flag as base OR overland OR combat OR item/derived | exact |
| `0x599C2D`–`0x599D19` / +0x0030D–+0x003F9 | If aggregate `EncPossession` or `EncCreatureBinding` is present, change current owner to `Attacker + Defender - owner`, i.e. the other combat side | exact |
| `0x599D19`–`0x599E31` / +0x003F9–+0x00511 | If `EncConfusion` is absent, clear `confusioneffect`; if its current value is 2 (`controlled by opponent`), change current owner to the other combat side | exact |
| `0x599E31`–`0x599E8C` / +0x00511–+0x0056C | If base `unittype` is `UnitGolem` (81), set current item/derived `EncResistElements` | exact |
| `0x599E8C`–`0x599EE8` / +0x0056C–+0x005C8 | Outside combat, clear `PandoraBoxBudget` — **in `BaseUnits[i]`, not the current record** | exact |
| `0x599EE8`–`0x599FA8` / +0x005C8–+0x00688 | If aggregate `EncCCBreath` is present, add 4 to Fire Breath, set `race` to `RCChaos` (18), and set `Fantastic` | exact |
| `0x599FA8`–`0x59A002` / +0x00688–+0x006E2 | If `combatsummoned` is set, set `Fantastic` | exact |
| `0x59A002`–`0x59A02C` / +0x006E2–+0x0070C | If unit recalculation scripts are enabled, set script variable `U = i` and run `UnitCalcPre` | exact |

The copy is the architectural point of the region:

```
prevmaxmoves[i] := Units[i].combatmaxmoves;
Units[i] := BaseUnits[i];
```

All later calculation therefore starts from the persistent base record rather than accumulating
on the previous calculated result. Region `e` uses `prevmaxmoves` to reconcile remaining combat
movement after every modifier has run.

The enchantment merger operates on the copied current record:

```
EnchantmentFlags[j] :=
    EnchantmentFlags[j]                 ; 0x599BA3, +0x508
    or ItemEnchantmentFlags[j]          ; 0x599BBF, +0x634
    or CombatEnchantmentFlags[j]        ; 0x599BDB, +0x5D0
    or OverlandEnchantmentFlags[j];     ; 0x599BF7, +0x56C
```

The term order is the executable's own, and the chain short-circuits on the first set flag.

**The merge is self-inclusive, and there is no fifth array.** Destination and first source are
both record `+0x508` — `BaseUnitEnchantment`'s layer in `BaseUnits`, `HasUnitEnchantment`'s
aggregate in `Units`. It is one array whose meaning changes with the copy above, so the copied
base layer *is* the aggregate's seed. Modelling `base` as a separate source alongside the other
three both invents storage and makes the `EncMagic` clear look like dead code.

`EncMagic` is cleared in the first term before this merger because region `c` rebuilds the
derived magical-weapon marker (for base heroes, at `0x59ACAF`). The clear is therefore
load-bearing: a unit keeps `EncMagic` only if an item, combat or overland source supplies it, or
if `c` re-derives it. The source-layer flags themselves are not cleared.

The Confusion values 1–4 can be named from their consumers: 1 sets combat moves to zero and
attacks-done to 2 (`stand confused`); 2 changes controller and restores combat movement; 3 calls
`@Combat@UnitMoveRandomly`; 4 has no turn effect. Only value 2 matters to region `a`. Where the
value is assigned is **unverified** — no `0x6B3` displacement operand exists anywhere in the
binary outside ten sites, none of them in `@Combat@CombatEndTurn`, so any assignment there uses
a pre-offset pointer and has not been located.

`PandoraBoxBudget` is the only region-`a` write that targets `BaseUnits[i]` rather than the
current record. That is deliberate, not a slip: the CoM2 and Warlord helptext both say the
Pandora's Box budget "refills after each battle", and the base record is the persistent store,
so clearing it outside combat *is* the refill. The current record keeps the copied value for
this pass. Per-level budgets are `MODDING.INI`'s `PandoraBoxBudget1..9`.

Four calculator-facing results follow directly:

- **Golems intrinsically receive Resist Elements in compiled code.** `UNITS.INI` does not list
  it, although the manual does. A roster-only importer will therefore miss the effect unless it
  adds this hard-coded unit-type rule.
- **Chaos Channels Fire Breath is an addition, not an assignment, in this routine:**
  `firebreath += 4`. This confirms the CoM2 constant from former verification item D12. Whether a particular
  spell-targeting path permits `EncCCBreath` on a unit which already has Fire Breath is a
  separate eligibility question; if the flag is present, recalculation adds four.
- **The same block confirms the type rewrite the calculator already performs.** `EncCCBreath`
  sets `race := RCChaos` *and* `Fantastic`, which is exactly `determineEffectiveUnitType`'s
  `ccFireBreath → 'fantastic_chaos'` (`determineEffectiveUnitType`) — previously carried on a
  "reported recalculation order" comment with no source. It covers **only** the Breath variant:
  `EncCCFlight` (34) and `EncCCArmor` (35) are handled in region `c`, at +0x5A34/+0xB3A4 and
  +0x5BA7, so the calculator's other two `→ fantastic_chaos` rewrites are still unsourced. The
  split also means only the Breath rewrite is visible to `UnitCalcPre`, which is what
  `BASEFANTASTIC(U)` vs `FANTASTIC(U)` distinguishes in the Warlord scripts.
- **A unit summoned during combat counts as Fantastic**, and the calculator has no input for
  that. Probably inert — everything the engine summons into combat is already Fantastic in the
  roster — so this is recorded rather than modelled.

The three named stat helpers all sit in `c`, after the first hook:
`@Units@ApplyLevelBonus` (+0xD16), `@Units@ApplyHeroBonus` (+0x139A), and
`@Units@ApplyMagicWeapons` (+0x4B90). Region `a` itself performs setup, control/type resolution,
and the one hard-coded Golem enchantment grant rather than general stat accumulation.

### Warlord regions `b` and `d`: source order (resolved 2026-07-28)

These two regions need no disassembly. They are the current Warlord
`UnitCalcPre.CAS` and `UnitCalc.CAS`, respectively, and CAS executes their statements in source
order except where an explicit `IF`, `GOTO`, loop or `HALT` changes the path. This section reads
the shipped `Warlord 1.5.12.7` files:

| Region | File | Lines | md5 |
|---|---|---:|---|
| `b` | `UnitCalcPre.CAS` | 1–1904 | `8943c9021713187aaf0df407530da7ce` |
| `d` | `UnitCalc.CAS` | 1–1667 | `b38b5503db3db430b19ed471ae57a873` |

The tables below are an exhaustive map of the scripts' **top-level** order. A row can contain
several mutually exclusive sub-branches, but no unlisted stat-calculation stage is interleaved
between rows. Line numbers refer to those exact files and release.

#### Region `b`: `UnitCalcPre.CAS`

The early hook has a common prefix and then splits at line 979 into combat and overland paths.
Its combat path finishes with `HALT` at line 1844, so the overland tail cannot fall through
during combat.

| Lines | Ordered block |
|---:|---|
| 7–22 | Read owner, city, overland location/terrain and combat-tile stack context |
| 24–79 | Dummy Armor handling; Spirit Link clears current `Fantastic`; protect the Spirit Link, Transmute Equipment, Rebuild and Vampirism flags from recasting/dispelling |
| 80–397 | Hero-only Marionette reconstruction: derived stats, spell/realm abilities, Ascension and stray-Marionette handling |
| 398–570 | Other hero enchantment and hero-ability grants |
| 571–667 | Legacy and new item-power upgrades |
| 668–736 | Transmute Equipment, Rebuild, Benefactor/Famous, Doom Mastery and Just Cause hero effects |
| 737–827 | Planewalker and combat-only hero/item effects |
| 831–894 | Fiery Fury, Insulation, Discipline, Khan the Conqueror, Divine Protection and Land Link |
| 896–976 | Zombie Mastery, then the overland-capable Outlander transport/healer effects |
| 979–1026 | Combat gate and one friendly-stack scan, collecting hero-aura maxima and whether any living friendly unit has Lucky Star |
| 1028–1033 | Build `THEORECTICALLEVEL`: current level, Heroism floor, then Warlord and Crusade |
| 1035–1118 | Pre-magic Outlander effects in exact order: Xenoveterinary; Power Engine; Explosive/Upgraded Explosive; Ballistics; Xenopsychology; Radio; Battle Armor |
| 1120–1149 | Conjuring Pact, Uphill Battle and the enchanted unit's own Lucky grant |
| 1151–1243 | Fiery Fury with Eternal Night/Darkness; Doom Mastery requests all three Warps when any one is present; Domain of the Enchanter copies listed combat curses to base generic flags |
| 1245–1296 | Sanctify's realm/type conversion; Mariner/Echo of the Deep; Midget Submarine immunities and invisibility |
| 1298–1371 | Soul Flay, Blood and Iron, Eternal Night and Great Unbinding |
| 1373–1464 | Friendly hero effects: Elemental Master, Just Cause, Irresistible Charge and Rampage |
| 1466–1480 | Rage |
| 1482–1591 | Prayer-with-High-Prayer extension, Rousing Speech, True Light, Plague, Goblin Pox and Specialist Mastery |
| 1593–1623 | Guardian/Lord Protector, then the Lucky Star aura |
| 1625–1691 | City-defender effects: Dishearten Prophecy, Wall of Fire, Gospel of Evangelism and Lord Liberator |
| 1693–1780 | Tactical-only Gods Play Dices, Water Elemental terrain bonus, Inner Power, Eye of Storm, Revenant and Mariner Mastery |
| 1782–1834 | Strategic-combat alternative: Water Elemental terrain bonus, Tactician/Khan and siege buildings |
| 1836–1844 | Common combat tail: friendly Eye of Heaven grants True Sight, then `HALT` |
| 1848–1904 | Overland-only cleanup and one-time unit repairs, ending in `HALT` |

Several load-bearing consequences follow directly:

- **Every region-`b` stat write precedes all of compiled region `c`, including Warp, Shatter
  and the second script hook.** Conversely every region-`d` write is post-Warp. This is exact
  for Warlord and does not depend on assigning the surrounding binary blocks.
- **The Doom Mastery/Domain setters run before control returns to `c`, but source order alone
  does not prove that the same pass consumes their new flags.** Doom Mastery calls
  `SETCOMBATENCHANTMENTFLAG(..., B=0, ...)`, while Domain calls
  `SETENCHANTMENTFLAG(..., B=1, ...)` (`UnitCalcPre.CAS:1183-1243`). `Scripts.TXT:601-609`
  defines `B=0` as the current unit and `B=1` as the base unit and warns that these setters do
  not themselves trigger recalculation. Region `a` built the current aggregate before `b`, and
  the compiled Warp gates read that aggregate. Immediate consumption would therefore require
  an undocumented setter side effect; otherwise the new source/base flag takes effect on a
  later recalculation. The CAS files settle the call order but not that API implementation
  detail.
- **Eye of Heaven's friendly True Sight grant crosses the hook boundary deliberately.**
  `UnitCalcPre.CAS:1839-1842` grants `EncTrueSight` at the very end of `b`, and
  `UnitCalc.CAS:325-328` consumes it near the front of `d` to add ranged To Hit.
- **Xenoveterinary does not simply read `base+a`.** Its HP read at lines 1040–1045 occurs
  after the entire common prefix, including earlier phase-`b` hero/item HP writes at lines
  596–616 and 650–654, but before later phase-`b` HP additions such as Elemental Master at
  lines 1386–1391. It sees no region-`c` or `d` HP write. A single unordered `b` subtotal
  cannot reproduce both cases when those effects coexist.
- **Upgraded Explosive's Fire Breath doubling is earlier than the remaining combat part of
  `b`.** It runs at lines 1074–1078. It sees the common prefix and earlier pre-magic Outlander
  writes, but Fiery Fury/Darkness and every later `b` addition, all of `c`, all of `d` and
  region `e` escape the doubling.

#### Region `d`: `UnitCalc.CAS`

The late hook also has a common prefix followed by combat and overland paths. Within combat,
line 486 separates tactical from strategic processing; the paths rejoin at line 1223. A second
split at line 1309 sends combat around the overland override to line 1400.

| Lines | Ordered block |
|---:|---|
| 18–31 | Read owner, city, overland location/terrain and combat stack context |
| 34–103 | Common enchantment repairs and additions: Guardian Wind, Chaos Channels Fire Breath top-up, Invisibility/Planewalking/Venom, Focus Magic and Sanctify |
| 105–168 | Post-hardcoded hero ability/MP work, Undead spell conversion and Lifted Ship |
| 171–307 | Combat gate, friendly-stack scans, Goblin/Warboss and Engineer bonuses |
| 309–369 | Weakness; Zeal; True Sight; combat-cast Flame Blade; Berserk; Angelic Guardians; Night Goblin |
| 371–446 | Mechanical Master and the five Chosen-of-realm hero auras |
| 448–482 | City-defender Tree of Life/Hive/Baray effects and attacker-side Cloud of Shadow |
| 484–682 | Tactical-only Rust, Focus Magic touch conversion, Bloodlust/Buried, Aether Flux, Hurricane, Temporal Twist, Tangling Roots, terrain/Tactician bonuses and Sacred Ancient |
| 684–1218 | Tactical first-turn terrain/state work and siege-building effects; strategic combat skips this entire range |
| 1223–1243 | Paths rejoin; Colossal Strength reads and scales the current melee, physical ranged and Thrown totals |
| 1245–1268 | Vampirism, then Shadow Strike |
| 1270–1306 | Apotheosis, heavy-unit Flying-to-Thrown conversion, Ice Age and Spirit Link |
| 1311–1397 | Overland-only Astral Gate, submarine/lifted-ship and Time Stop handling, then `HALT` |
| 1400–1448 | Combat-only post-magic Outlander effects: Energy Weaponry, Psycho Force, Pneuma Field and Energy Cannon/Destruction |
| 1450–1479 | Unstoppable Stampede and State of Rot; strategic combat then `HALT`s |
| 1483–1553 | Tactical late overrides: hostile Eye of Heaven removes gazes; Blaze of Glory; Beat of Swiftness; Midget Submarine |
| 1555–1598 | Hierophany, then Trapped/Fairy Maze |
| 1600–1667 | Red Button, Tactical Retreat and Strategic Recall handling; end of script |

The exact order resolves several interactions that a phase label alone hides:

- **Colossal Strength reads far more than the previously noted Rust/Focus Magic/Weakness
  prefix.** At lines 1230–1240 it sees `base+a+b+c` plus every applicable `d` write through
  line 1218: stack/hero bonuses, combat enchantments, terrain bonuses and city effects
  included. It does not see Vampirism, Shadow Strike, the post-magic Outlander block or the
  late tactical overrides.
- **Vampirism consumes the post-Colossal secondary attacks, then Shadow Strike follows.**
  Vampirism reads current Thrown and both Breaths, adds half their sum to melee, and reduces
  each present source channel to 1 (`UnitCalc.CAS:1245-1258`). Shadow Strike then adds
  `1 + floor(current melee / 3)` to that resulting Thrown value (`:1262-1266`). The heavy-unit
  Flying conversion can add another Thrown point afterward (`:1278-1288`).
- **Late overrides really are late.** Hierophany halves the already modified defense and
  clears the listed immunities/movement abilities at lines 1555–1582. Trapped then sets
  movement to zero and clears Flying at lines 1584–1598. Earlier `d` grants do not survive
  those assignments. Region `e`, however, still follows, so its aura pass and Supreme Light
  additions occur after Hierophany's defense reduction.
- **Psycho Force and Pneuma Field read the resistance current at their own lines
  (1413–1425).** That includes all resistance changes in `b`, compiled `c`, and earlier `d`,
  including the common/combat block and Colossal/Vampirism interval; it excludes region `e`.
- The Rust comment says “loses 1/2”, but executable lines 495–501 subtract a fixed 3 from
  melee and eligible physical ranged and set Thrown to zero. Later `d` additions, especially
  Colossal Strength and Shadow Strike, land after those writes. The executable statements,
  not that comment, define the Warlord result.

### Reading unit fields

Unit records are addressed as `[dword ptr [0x709188] + i * 0x1E1 * 4 + disp]`, where `i` is the
1-based unit index and `disp` lands in the `0x642xxxx` window. The `imul reg, reg, 0x1E1`
immediately before a field access is the reliable signature. Three parallel field arrays exist:
dwords from `0x64268B8`, words from `0x6426F3E`, bytes from `0x6426953`. Scanning the routine for
memory operands with a `0x642xxxx` displacement is what produced the **literal** write counts
above; it does not see later structure-relative operands after a unit-record pointer has been
computed.

The record base is **`0x6426898`**, established by matching the `unitT` layout in
`../Script source/CAS reference/Typedec.pas` (a `str30` name padded to `0x20`, then 4-byte
integers). Three facts confirm the model rather than merely fitting it: laying out `unitT` under
Delphi's default alignment gives exactly 1,924 bytes = `0x1E1` × 4, the stride the code uses;
`BaseUnits` and `Units` are `0x4965100` apart, which is exactly 40000 × 1924, matching
`Maxunitslots = 39999` (so `array[1..40000]`) and the `cmp …, 0x9C3F` bounds checks; and the
loop bound read from `[0x1AC1F18]` sits 4 bytes before `BaseUnits[1]`, which is where `Maxunits`
is declared. Every field identity below follows from `disp - 0x6426898`:

| Off | Field | Off | Field | Off | Field |
|---|---|---|---|---|---|
| +0x20 | `attack` (melee) | +0x38 | `deathgaze` | +0x54 | `hitchancethrown` |
| +0x24 | `ranged` | +0x3C | `stoninggaze` | +0x58 | `hitchancebreath` |
| +0x28 | `rangedtype` | +0x40 | `doomgaze` | +0x5C | `hitchancemelee` |
| +0x2C | `thrown` | +0x44 | `maxammo` | +0x60 | `hitchanceranged` |
| +0x30 | `firebreath` | +0x4C | `hitchance` (common) | +0x64 | `defense` |
| +0x34 | `lightningbreath` | +0x50 | `defendchance` | +0x68 | `resistance` |

`0x6426DA0` (= record +0x508) is the `EnchantmentFlags` byte array used below. The four penalty
display words are +0x6C4 melee, +0x6C6 defense, +0x6C8 resistance, +0x6CA ranged.

**`unitT.savemodifier` has no located consumer.** `Typedec.pas:181` declares it as a plain
`integer` on the unit record, but it has **no `UNITS.INI` key** in either the CoM2 or the Warlord
roster, **no stat ID in `MASTER.CAS`** (so no script can read or write it), and no reference in
any `.CAS` file in either script set. Searched 2026-07-31. Treat it as unused until something
contradicts this; it is deliberately excluded from the calculator's CoM2 card field set
(`Calculator/BACKLOG.md`, R4). Note this is a negative result about *reachability from the data
and script layers* — the compiled engine could still read it through the computed-pointer layer
that the direct-displacement scans do not see.

### The Warp blocks (resolved 2026-07-28)

Each Warp is gated on its own enchantment byte — Attack `0x6426DA6` (6), Defense `0x6426DA7` (7),
Resist `0x6426DA8` (8), and Shatter follows at `0x6426DAB` (11).

**Warp Attack halves five attack channels, not two.** The per-channel shape is: read the stat,
compute the loss as `stat - (stat div 2)`, store the loss to a penalty word, then write the
halved value back through a `lea` + `idiv` + `mov [reg]` sequence.

| Field | Record | Store site | Penalty word |
|---|---|---|---|
| `attack` (melee) | +0x20 | +0xBB2B | +0x6C4 |
| `ranged` | +0x24 | +0xBC0E | +0x6CA |
| `thrown` | +0x2C | +0xBC47 | — |
| `firebreath` | +0x30 | +0xBC80 | — |
| `lightningbreath` | +0x34 | +0xBCB9 | — |

Melee and ranged are read three times each (value, loss, store); thrown and the two breaths once,
because they get no penalty word. **All five stores were read directly.** Each reloads its
divisor immediately beforehand (`mov ecx, 2`), so `/2` holds per channel rather than being
carried over. The *loss* term is divided separately, and compiles to `sar edx,1 / jns / adc edx,0`
(+0xBA85 melee) — Delphi's signed `div 2` truncating toward zero, **not** a bare arithmetic shift.
Loss and store therefore agree at every sign, and Warp Attack carries no internal rounding
inconsistency. Recorded as a negative because the `adc` correction is easy to miss: an earlier pass
read the `sar` alone and inferred a divergence for negative stats that does not exist.
*Verified: Claude 2026-08-02 (0x5A53C1, 0x5A5438), from the binary.* `lightningbreath`'s store at +0xBCB9 is the block's last stat write before the
Warp Defense gate at +0xBCDF, which confirms there is no sixth channel.

**Warp Attack does not reach a gaze.** A complete, uncapped census of every `0x642xxxx` constant
in +0xBA3C–+0xBCDF returns eight values, and none is `deathgaze` (+0x38), `stoninggaze` (+0x3C)
or `doomgaze` (+0x40). Combined with [Combat flow](./CoM2%20binary%20-%20combat%20flow.md),
*Gaze attacks* — the gazes are independent fields and
share no slot with `ranged`; D21's later helper reconstruction completes the gaze-level result.
`rangedtype` (+0x28) is likewise untouched, as expected for a type rather than a strength.

**Warp Defense** is `defense = defense / 3` (`idiv` with `ecx = 3`, +0xBD11–+0xBDD1), loss to the
+0x6C6 penalty word. **Warp Resist** is `xor ecx, ecx / mov [resistance], ecx` at +0xBE99 —
resistance set to **0** — with the full prior value recorded at +0x6C8.

Two notes. CoM2 divides with `idiv` (round toward zero) where MoM used `sar` (round toward −∞);
for non-negative stats the two agree, so this is a code difference and not a behavioural one.
And **Shatter opens by reading the melee penalty word and adding current melee** (+0xBF94–+0xBFC1),
reconstructing the pre-Warp value — which only makes sense if Warp has already run, independently
corroborating the ordering established from the enchantment table.

**All three Warps match the calculator's Warp steps exactly for CoM2/Warlord**: melee `/2`
plus `rtb /2` (the calculator's `rtb` carries ranged, thrown and breath in one slot), defense
`/3`, resistance `= 0`, gaze untouched. The magnitudes need no change. **The position does**;
the downstream consequences are recorded below in *Associating a block with its enchantment* and
*Calculator sequential-transform audit*.

Two practical notes for anyone extending this. **2,634 of the routine's 2,740 direct calls are
Delphi `@System@@BoundErr` / `@System@@IntOver` range-check stubs** — only ~106 are real, so the
`0xE150` extent overstates the work by more than an order of magnitude. And **linear
disassembly desynchronises easily** in this routine; anchor `dis` on an address already known to
be an instruction boundary (a field-write site) rather than on a round number.

### Associating a block with its enchantment

`@Castercore@HasUnitEnchantment(u, e)` (`0x6461EC`) is a one-line accessor that resolves to

```
byte [ dword ptr [0x709188] + u * 0x1E1 * 4 + 0x6426DA0 + e ]        ; e = 1..0x64
```

so **any direct memory operand whose displacement falls in an enchantment array's window names
a specific enchantment**. There are five relevant flag arrays. Four are persistent source
layers in `BaseUnits`; the current `any` array is the calculated aggregate in `Units`. The first
four have public accessors, while `ItemEnchantmentFlags` is identified from the shipped `unitT`
layout and the region-`a` merger:

| Array | Accessor | Base | ID window |
|---|---|---|---|
| any/current aggregate | `@Castercore@HasUnitEnchantment` | `0x6426DA0` | `0x6426DA1`–`0x6426E04` |
| base | `@Castercore@BaseUnitEnchantment` | `0x1AC1CA0` | `0x1AC1CA1`–`0x1AC1D04` |
| overland | `@Castercore@OverlandUnitEnchantment` | `0x1AC1D04` | `0x1AC1D05`–`0x1AC1D68` |
| combat | `@Castercore@CombatUnitEnchantment` | `0x1AC1D68` | `0x1AC1D69`–`0x1AC1DCC` |
| item/derived | — | `0x1AC1DCC` | `0x1AC1DCD`–`0x1AC1E30` |

The bases are deliberately one byte before element 1, so each layer's ID-100 byte shares the
address used as the next layer's element-zero base. IDs currently named in
`SharedConstants.pas` are `Enc*` 1–62, while the storage and merger support 1–100. The four
accessor-visible literal windows yield 72 labelled accesses in `@Units@RecalculateUnits`.

**That 72-access enumeration is exhaustive only for direct operands in those four literal
windows.** A linear disassembly and a raw byte scan agree on all 72, but region `a` accesses the
copied current layers through a computed unit pointer and loop index, and region `e` calls
`@Units@BuildAuraTable`. The merger, the Golem
`ItemEnchantmentFlags[EncResistElements]` write, and the aura helper are therefore additional
enchantment-related work which the original literal enumeration did not count.

**Region `c`, in address order** (`test` = reads the enchantment; the block after it is that
enchantment's effect):

| Offset | Enchantment | Offset | Enchantment |
|---|---|---|---|
| +0x00730 | Heroism | +0x06BAD | Lionheart |
| +0x00A62 | Destiny | +0x07021 | Iron Skin |
| +0x00D3F | Focus Magic | +0x070FF | Land Link |
| +0x04221 | Hovering | +0x07407 | Holy Armor |
| +0x049BC | *(not an enchantment gate — Heavenly Light tail)* | +0x0754F | Orihalcon |
| +0x04DA5 | Water Walking, Wind Walking | +0x077F0 | Holy Weapon |
| +0x04EBA | Invisibility, True Sight | +0x08C0A | Sanctify |
| +0x04F6E | Invulnerability, Flight | +0x0B42F | **Haste** |
| +0x0513D | Cloak of Fear | +0x0B4D6 | **Vertigo** |
| +0x05251 | Wraith Form | +0x0B56A | **Weakness** |
| +0x05307 | Endurance | +0x0B727 | **Mind Storm** |
| +0x0557A | Discipline | +0x0BA3C | **Warp Attack** |
| +0x05A34 | CC Flight, CC Armor | +0x0BCDF | **Warp Defense** |
| +0x05CE0 | Blood Lust | +0x0BDF7 | **Warp Resist** |
| +0x05EDC | Animated *(+0x062D4 shared undead block)* | +0x0BF62 | **Shatter** |
| +0x06497 | Guardian Wind, Magic Immunity | +0x0C2BD | Web |
| +0x0654B | Flame Blade | +0x0C317 | Frozen |
| +0x067EB | Immolation, Mystic Surge | +0x0C371 | Black Sleep |

This establishes the ordering used by D21's later helper reconstruction. CoM2/Warlord run the three Warps late in
`c` with Shatter immediately after — **MoM's shape, not CoM 1's**, which is what the calculator
already assumes for `com2*`. Endurance, Discipline, Lionheart, Holy Armor, Haste, Vertigo,
Weakness and Mind Storm all precede the Warps and so land at full value before the reduction.

### Region `c`, block by block

Region `c` is the main derived-stat body. It begins with the first script hook at
`0x59A027` / +0x00707 and ends at the second hook at `0x5A65D7` / +0x0CCB7. A complete
linear decode contains 50,608 bytes and 12,767 instructions. A conventional leader scan finds
5,325 raw basic blocks, but that number is misleading: 2,356 calls in this region alone are
Delphi `@System@@BoundErr` or `@System@@IntOver` checks. The tables below collapse those
compiler-generated guards and describe the semantic blocks.

The high-level execution spine is:

| Anchor | Purpose | Confidence |
|---|---|---|
| +0x00707 | Run/return from the `UnitCalcPre` script hook | exact |
| +0x00730 | Heroism and effective-`level` normalization | exact |
| +0x008FF | Crusade effective-level contribution | exact |
| +0x00985 | Warlord effective-level contribution | exact |
| +0x00A62 | Destiny permanent transformation | exact |
| +0x00D16 | `@Units@ApplyLevelBonus` | exact |
| +0x00D3F | Focus Magic | exact |
| +0x0138F | Give base heroes the derived `EncMagic` marker | exact |
| +0x0139A | `@Units@ApplyHeroBonus` | exact |
| +0x01473–+0x040F7 | Loop over the three equipment slots and apply item powers | exact structure; most fields named |
| +0x041C2 | Wind Mastery creates or preserves Hovering | exact |
| +0x04221 | Resolve Hovering against terrain and combat state | exact |
| +0x043D2–+0x0449D | Rebuild the current aggregate enchantment array after item/global-derived writes | exact |
| +0x044C7 | Lucky | exact |
| +0x045C6 | Dark Force combat-stat effect | exact |
| +0x0464D–+0x04B8D | **Heavenly Light** — the Guardian Spirit node-meld and settlement-defence package, including the granted-magical-weapon To-Hit tail formerly listed separately at +0x049BC | exact |
| +0x04B90 | `@Units@ApplyMagicWeapons` | exact |
| +0x04BBx–+0x04D7A | Normalize Regeneration contributed by the three non-base enchantment layers | exact |
| +0x04DA5–+0x077F0 | Unit enchantments and transformations, in the order listed above | exact |
| +0x07954–+0x08C0A | Global enchantments | exact gates |
| +0x08C0A | Sanctify | exact |
| +0x08C5F | Flying implies a minimum scouting range of 2 | exact |
| +0x08D51–+0x08E17 | Native node-aura selection and `@Units@applynodeaura` dispatch | exact |
| +0x08E1C | Bad Moon | exact |
| +0x08F3E | Good Moon | exact |
| +0x09296 | Nature Conjunction | exact |
| +0x09666 | Strategic-combat normalization | exact behaviour; controlling global's source name unresolved |
| +0x095EE | **in-combat gate over everything below** — `BaseUnits[i].incombat` false jumps straight to the `UnitCalc` hook | exact |
| +0x09644 | `ownCG` side index: 1 when the owner is the Defender, else 2; scaled by `$190` into the combat-state record at `0x70969C` | exact |
| +0x096F4–+0x0A90F | Combat-global enchantments | exact gates |
| +0x0B092 | Guardian retort while defending a settlement | exact |
| +0x0B1DA | Entangle | exact |
| +0x0B42F–+0x0C371 | Haste and direct unit curses | exact |
| +0x0C3D2 | Terror | exact |
| +0x0C47A–+0x0C77D | Spell Ward realm selection and penalties | exact |
| +0x0C783 | Convert Illusion Immunity into side-wide sight flags | exact |
| +0x0C890 | Tactician | exact |
| +0x0CC92–+0x0CCB7 | Set `U` and enter the `UnitCalc` script hook | exact |

**Not every number below is compiled in.** Several blocks load their magnitude from a global that
`MODDING.INI` initialises, so the value is per-installation and Warlord can and does change it.
Where that is so, the tables name the INI key and give the shipped value in parentheses; a bare
number is a literal in the instruction stream. Vertigo, Weakness, Mind Storm, the Warps, Spell
Ward and the two Prayers are literals; Blazing March, Flame Blade, Breakthrough, Entangle, Terror,
Endurance and Lionheart are configured.

#### Experience, Destiny and the named stat helpers

**This block works on `level` (`+0x4FD`), not `experience` (`+0x4FE`).** Both fields exist and
both are live — Destiny below writes `experience` explicitly — so the distinction is real.
Heroism first raises the calculated `level` byte to 4 when it is 3 or lower. If the persistent
base `level` has already reached 4, the block clears
`BaseUnits[i].OverlandEnchantmentFlags[EncHeroism]`; this is the automatic dispelling promised
by the help text. The no-Heroism path normalizes base-Fantastic units to effective level
1. Fantastic units do not then receive Crusade or Warlord additions, and neither does the
neutral player (`owner = NeutralplayerID`, 15).

For an eligible normal unit, `GlobalEnchantments[GECrusade]` and `Retorts[Warlord]` each add
one to the effective `level` byte. The result is clamped to the configurable maximum
read through the global at `0x709E64` — a *pointer* to the value, dereferenced twice. The
compiled ordering is therefore:

```
Heroism / Fantastic normalization
    -> Crusade
    -> Warlord
    -> configured cap
    -> ApplyLevelBonus
```

Destiny is not a disposable calculated-stat bonus. Its block writes to `BaseUnits`:

- base `race := RCLife` (19), `Fantastic := true`, and `attackflags.supernatural := true`;
- base storage is reset — `experience := 0` and `level := 1`;
- six current attack/HP channels are doubled, in this order: melee, ranged, **HP**, Fire Breath,
  Lightning Breath, **Thrown**;
- current Defense and Resistance each gain 4.

`ApplyLevelBonus` runs after that transformation and before Focus Magic. This is direct
execution-order evidence that ordinary level bonuses belong in phase `c`.

The complete helper reconstruction is [`D21.evidence.md`](./D21.evidence.md). It splits on
**base** `ishero` and performs 21 checked additions into the calculated record. Hero Attack, HP,
Resistance, Defense, Hit and To Defend are unconditional; hero Ranged tests base `rangedtype`,
while hero Thrown and both Breaths test their calculated channel. The normal path instead tests
base Attack, `rangedtype`, Thrown and both Breaths. Missile and magical Ranged select different
tables but both write only conventional `ranged +$24`.

No instruction in `$005981F8..$00598D86` reads or writes Death Gaze `+$38`, Stoning Gaze `+$3C`
or Doom Gaze `+$40`, and the loaded tables have no gaze key. **Modern gazes therefore receive no
level strength in either CoM2 or Warlord.** The final normal To Defend table is also misbound in
the loader: it reads `[Hero]ToDefend`, leaving `[Normal]ToDefend` dead. Current shipped values are
zero in both sections, so that bug is numerically invisible.

Focus Magic then adds 3 to an existing Doom Gaze, Fire Breath and Lightning Breath — three
independent `> 0` tests — and runs **one** of four mutually exclusive ranged branches, in this
compiled order. Every gate reads `BaseUnits[i].ranged`, not the current value, so a ranged
attack granted earlier in the pipeline does not suppress the conversion:

| # | Gate | Effect |
|---|---|---|
| 1 | `thrown > 0` and base `ranged = 0` | move Thrown into `ranged` (and `rangedbonus`), zero `thrown`, `rangedtype := 34`, `maxammo := 4` |
| 2 | base `ranged = 0` | create it: `ranged := 3`, `rangedbonus := 3`, `rangedtype := 34`, `maxammo := 4` |
| 3 | not `Ismagicalranged(base rangedtype)` | `rangedtype := 34` — **type only, no strength added** |
| 4 | otherwise (already magical) | `ranged += 3`, `rangedbonus += 3` |

Branch 3 is the one worth noting: converting a non-magical ranged attack grants the magical type
and **no** +3. Finally, `maxmp += 15` when the unit already has a positive casting pool.

The current-ammunition check is separate: during combat, a unit whose persistent ammunition is
already exhausted has its current ranged type set to `-1`. After Focus Magic, base heroes get
the derived `EncMagic` marker, and `ApplyHeroBonus` runs.

#### Equipment loop

The item block iterates `j = 1..3`. Its power tests are byte reads at `ItemT.powers[ID]`; the
following IDs are recovered directly from the pointer displacements:

| IDs | Compiled effects |
|---|---|
| 1–6 | Attack +1…+6, in **both** weapon arms — melee writes `attack`, ranged writes `ranged`, each with its display bonus. In the melee arm an **Axe** (`it = 3`) additionally adds the same amount to Thrown — a rider *inside* the same power test, further gated on `thrown > 0` |
| 7–12 | Defense +1…+6 |
| 13–15 | Attack-type To-Hit +10/+20/+30, in both arms. In the melee arm an **Axe** additionally adds the same to `hitchancethrown` — again a rider *inside* the power test, but with no `thrown > 0` gate, which is the one asymmetry between the two riders |
| 16–18 | Overland and combat movement +1/+2/+3 movement points (literals 2/4/6 — movement is stored in half-points) |
| 19–24 | Resistance +1…+6 |
| 25–28 | Spell skill / maximum MP +5/+10/+15/+20, each **gated on `maxmp > 0`** — no effect on a unit with no casting pool |
| 33–35 | HP +1/+2/+3 and the corresponding gold-HP display count |

**The two "weapon" arms are compiled range tests on `it`, not an either/or**, and item types 7–10
run *both*:

| `it` | Item type | Melee arm | Ranged arm |
|---|---|---|---|
| 1–3 | Sword, Mace, Axe | ✔ | — |
| 4–6 | Bow, Wand, Staff | — | ✔ |
| 7–10 | Shield, Chain Mail, Plate Mail, Trinket | ✔ | ✔ |
| 11 | Vial | — | — |

So an `IPattack3` Trinket or Shield adds +3 to melee **and** +3 to ranged, where a Bow, Wand or
Staff adds only to ranged and a Sword, Mace or Axe only to melee. A Vial gets neither.

The melee gate is two tests, and the second is easy to misread. `dec eax; sub eax,3; jb <melee>`
admits 1–3; the fall-through then runs `add eax,-3; sub eax,4; jae <skip>`, which is the Pascal
range-check idiom for `7 <= it <= 10` — for `it` 4–6 the running value `it-7` is **negative**, so
the unsigned `sub` does not borrow and `jae` takes the skip. Reading that `jae` as "skip when
`it >= 11`" wrongly admits 4–6 to the melee arm. The ranged gate is the single range
`add eax,-4; sub eax,7; jae <skip>`, i.e. `4 <= it <= 10`.
*Verified: Claude 2026-08-02 (0x59CA2E–0x59CA3A, 0x59D438–0x59D441), from the binary.*

**69 of the 73 declared `IP*` powers are tested**, at 86 sites; the four never read are
`IPSave1..IPSave4` (29–32). That is exhaustive for the `cmp byte ptr [item+disp], 0` form over the
loop body, and a linear decode of the whole routine finds no access at those item offsets — but it
does not establish that they are dead, since combat resolution is a separate routine and is where
a save modifier would more naturally be read.

The remaining tested powers are individually named:

| ID | Power | ID | Power |
|---|---|---|---|
| 36 | Flaming | 55 | Pathfinding |
| 37 | Insulation | 56 | Stoning |
| 38 | Pandora's Box | 57 | Resist Elements |
| 39 | Lightning | 58 | Elemental Armor |
| 40 | Doom | 59 | Merging |
| 41 | Destruction | 60 | Regeneration |
| 42 | Fear | 61 | Guardian Wind |
| 43 | Vampiric | 62 | Resist Magic |
| 44 | Death | 63 | Flight |
| 45 | Wraith Form | 64 | Phantasmal |
| 46 | Shadow | 65 | Invisibility |
| 47 | Necromancy | 66 | Teleporting |
| 48 | Bless | 67 | Haste |
| 49 | Holy Avenger | 68 | Immolation |
| 50 | True Sight | 69 | Recharge |
| 51 | Lionheart | 70 | Egoism |
| 52 | Divine Protection | 71 | Dark Force |
| 53 | Invulnerability | 72 | Amplifier |
| 54 | Water Walking | 73 | Stealth |

The attack flags Lightning, Doom, Phantasmal, Destruction, Vampiric, Death, Stoning and Holy
Avenger are written into the separate melee or ranged `AttackFlagsT` selected by the item's
weapon type. This explains the second series of apparently duplicate power tests near
+0x03B2A–+0x040F7. Recharge adds four maximum shots. Egoism and Dark Force set different
derived bytes: the later +10 To-Hit/+10 To-Block block tests **Dark Force**, not Egoism.

**Two of those names do not match the field they set:** `IPLightning` (39) sets
`AttackFlagsT.armorpiercing` and `IPPhantasmal` (64) sets `AttackFlagsT.illusion`. Neither writes
anything lightning- or phantasm-shaped, and `IPLightning` never touches `lightningbreath`. The
value each flag power writes alongside its boolean is a **save modifier**, and the magnitudes are
compiled literals: `IPVampiric` lifesteal **−2**, `IPDeath` deathtouch **−3**, `IPStoning`
stoningtouch **−1**, `IPHolyAvenger` exorcise **−3**, `IPDestruction` destructionvalue **0**
(written explicitly from a zeroed register). All eight appear in both arms.

Four further per-power details worth having:

- **`IPFlaming` (36) is five channels**, not one: +3 melee unconditionally, then +3 to thrown,
  ranged, fire breath and lightning breath *where each is already positive*. Thrown gets no
  display-bonus write; ranged does.
- **`IPShadow` (46) is the loop's only computed magnitude and its only single-arm power** (melee):
  `thrown += (base attack + current level − 1) div 2`, truncating toward zero.
- **`IPPandora` (38) is the only out-of-combat-only power**, and its destination is `BaseUnits`:
  `PandoraBoxBudget` is a 20-entry table lookup by **current** level through the global at
  `0x709AA8`.
- The spell-charge transfer at the end of the shared chain is **not** a power test: it copies
  `chargeamount` into `maxcharges` and `spellcharge` into `Spellability` whenever
  `spellcharge > 0`, so the last non-empty slot wins.

#### Hovering, aggregate flags, node defense and weapon material

Wind Mastery is `GlobalEnchantments[27]`. **The two halves are an if/else, not a sequence**: the
Wind Mastery arm writes `EncHovering` into the persistent overland layer and then jumps clear of
the terrain resolution, so while the global is up a hovering unit over land keeps the flag and
never reaches the branch below. Only when Wind Mastery is absent does the Hovering block test the
unit's overland tile through `@Map@IsNonlandTile(plane, x, y)`:

- on land, clear Hovering from **all four** arrays — the overland layer and the aggregate, in the
  persistent record and the calculated one, two of the four writes therefore hitting `BaseUnits`;
- over water in combat, grant Water Walking;
- over water outside combat, grant Flying.

This is how units survive dispelling Wind Mastery above water and lose the remnant on reaching
land. After item powers and this derived flag have run, region `c` repeats the 1–100
enchantment merger:

```
current any[j] :=
    current any[j]
    or current overland[j]
    or current combat[j]
    or current item/derived[j];
```

Lucky adds +10 common To Hit, +10 To Block and +1 Resistance. Dark Force adds +10 common To Hit
and +10 To Block.

**Heavenly Light** occupies +0x0464D–+0x04B8D as a single package, and what was previously listed
as a separate weapon-material block at +0x049BC is its tail. The gate is: in combat, the unit is
on the defender side, and *either* there is a settlement on the combat tile with a valid owner
*or* the tile's node has `guardian` set and is owned by the defender. All five gate exits jump to
+0x04B8D, past the tail, so nothing that fails them reaches it.

The package writes +1 Defense and +1 Resistance unconditionally, +1 melee gated on **base** attack
`> 0`, +1 **ranged** gated on current `ranged > 0` — each with its display-bonus word — and then
`EncMagic`. **There is no write to Thrown or either breath**; CoM 1's change log records
*"Heavenly Light now adds +1 to the unit's ranged/thrown/breath attack as well"*, so either CoM2
diverged or that change did not carry over.

The tail then supplies the **+10 To-Hit that magical weapons confer**, to melee (gated on base
attack), non-magical ranged, and Thrown, skipping any unit that would otherwise receive it twice:
one already carrying base `EncMagic`/`EncMithril`/`EncAdamant` gets it from `ApplyMagicWeapons`
instead, and Fantastic units and heroes already strike as magical. `@Units@ApplyMagicWeapons`
follows unconditionally, carries the complementary gate — it runs *only* for units that do hold a
material — and applies `MagicWeaponBonusHit` (10) to the same three channels plus the material's
tiered strength and defense component. **So magic, mithril and adamantium give +10 To Hit and
ordinary weapons do not**; the CoM change log documents the whole package, including the
Fantastic exclusion as a fix (*"Fixed 5.51 bug : Heavenly Light grants the magic weapon bonus to
fantastic units"*).

The Regeneration normalization tests `EncRegeneration` separately at offsets corresponding to
the overland, combat and item/derived layers (+0x582, +0x5E6 and +0x64A within `unitT`) and
raises the calculated regeneration value to that layer's minimum through `@Game@Max`: **2 for the
overland and combat layers, 1 for the item/derived layer**.

#### Unit enchantment effects

The direct enchantment gates above expand to these effects:

| Enchantment | Calculated effect in region `c` |
|---|---|
| Water Walking | Set Water Walking |
| Wind Walking | Set Wind Walking; overland movement is at least 6 |
| Invisibility | Set Invisible |
| True Sight | Set Illusion Immunity |
| Invulnerability | Set Weapon Immunity |
| Flight | Set Flying; overland/combat movement at least 3; scouting at least 2 |
| Cloak of Fear | Set Fear |
| Wraith Form | Weapon Immunity, Noncorporeal and magical weapons |
| Endurance | +1 overland/combat movement; +1 `roadbuilding` when already positive; `max(1, EnduranceHpBonus div figures)` HP per figure (4), written to both `hp` and the gold-HP counter |
| Discipline | +1 Defense; another +1 at Regular; +1 melee (gated on **base** attack) and non-magical ranged at Veteran. The two Elite tiers are **separate blocks testing their own source layer**, not the aggregate: overland-cast at +0x0589C adds 1 overland **and** 1 combat movement, combat-cast at +0x059AC grants Negate First Strike. A unit holding it from both sources gets both |
| CC Flight | Flying; Chaos/Fantastic type; overland/combat movement at least 2 |
| CC Armor | +3 Defense; Chaos/Fantastic type |
| Blood Lust | Seven writes, the first persistent: base `EncUndead`, then current `EncUndead`, `race := RCDeath`, `Fantastic`, `foodupkeep := 0`, `goldupkeep := 0`, `nohealing`. The immunities come later, from the shared undead block |
| Animated | Persistent base `EncUndead`, then `race := RCDeath`, `Fantastic`, current `EncUndead`; +1 to five attack channels under **three different predicates** — melee on **base** attack, fire/lightning breath and thrown on their current values, ranged on `rangedtype > 0`; +1 Defense; +10 **common** To Hit; **Weapon Immunity only**. Illusion, Death and Cold Immunity are *not* Animated's — see the shared undead block below |
| Guardian Wind | Missile Immunity |
| Magic Immunity | Magic Immunity |
| Flame Blade | melee +`FlameBladeAttackBonus` (3), gated on **base** attack; Thrown +`FlameBladeThrownBonus` (**0 CoM2 / 2 Warlord**), gated on **base** thrown and with no display-bonus write; missile ranged (`@Units@Ismissileranged` on the **current** type) +`FlameBladeMissileRangedBonus` (**2**, not 3); magical weapons. With the CoM2 value of 0 the thrown branch executes and adds nothing |
| Immolation | Immolation and Cold Immunity |
| Mystic Surge | Magical weapons, +3 combat movement, +2 Defense, −2 Resistance (booked to the **penalty** word +0x6C8, not the bonus word), `Displayrace := false`, `attackflags.mysticsurge`, and combat `EncNoHeal`. The Mystic/Fantastic conversion is a **separate shared block** keyed on that combat flag |
| Lionheart | +3 melee (gated on **base** attack) and non-magical ranged, +3 Resistance, then `LionheartHpBonus div figures` (8, *"divided evenly between figures"*) and a flat `LionheartoldHPBonus` (0, *"to each figure"*). **No `max(1, ..)` floor** — the block contains one call, `Ismagicalranged`, and none to `@Game@Max`; Endurance does floor its equivalent |
| Iron Skin | +5 Defense |
| Land Link | Forester and Mountaineer; if the **current** `Fantastic` is set — so including units converted earlier in region `c` — additionally +2 Defense, +2 melee (gated on **base** attack), and +2 to **both** fire and lightning breath where each is positive |
| Holy Armor | +10 To Block when Defense is above 5, otherwise +2 Defense |
| Orihalcon | +1 Resistance and +2 magical ranged |
| Holy Weapon | +10 To Hit on melee and Thrown unconditionally, and on ranged only when the attack is **not** already magical; magical weapons |
| Sanctify | Gold upkeep becomes zero |

Blood Lust and Animated both write the base `EncUndead` flag. Together with Destiny, Hovering and
the item loop's Pandora's Box, these are important exceptions to treating region `c` as a pure
recomputation over temporary state.

**Two shared normalization blocks follow the enchantments that feed them, and neither is an
enchantment gate.** The one-row-per-enchantment shape of the table above hides them:

| Offset | Gate | Effect |
|---|---|---|
| +0x062D4 | current aggregate `EncUndead` | `race := RCDeath`, `Fantastic`, **Illusion, Death and Cold Immunity**, `foodupkeep := 0`, `goldupkeep := 0`, `createoutpost := false`, `nohealing` |
| +0x06B24 | current **combat** `EncNoHeal` | `race := RCNoHeal` (21), `Fantastic` |

So a Blood Lust unit picks up the three immunities and loses `createoutpost` even though its own
block writes none of them, and a unit that is undead from its roster gets the whole normalization
with no enchantment at all. The same holds for the no-heal conversion, which Mystic Surge reaches
only by setting the combat flag.

**A standing rule closes the unit-enchantment sequence** at +0x0791B: any unit whose **current**
`Fantastic` is set gets `EncMagic`. It is not gated on an enchantment, and being a live read it
picks up every region-`c` conversion, the Chosen rule included. Counting it, this routine has
seven distinct sources of derived `EncMagic` — Wraith Form, Mystic Surge, Flame Blade, Holy
Weapon, Heavenly Light, `@Units@ApplyMagicWeapons`, and this.

**Base versus live `Fantastic` is used deliberately, in both directions.** Holy Arms tests the
**base** flag (+0x07796), so a unit converted earlier in region `c` still counts as "normal" and
receives Holy Weapon; Land Link three blocks earlier tests the **current** flag (+0x07189) and so
does see those conversions. A model that collapses the two will get one of them wrong.

**A second hard-coded unit-type rule sits between Blood Lust and Animated.** At +0x05E81 the
routine compares base `unittype` (`0x1AC1E46` — the same field the region-`a` Golem rule reads
against `UnitGolem`) with the global at `0x708E0C`, which `@Init@GameInitialize` loads from
`MODDING.INI`'s `ChosenUnitID` (default 34, the Chosen/Torin). On a match it sets `race := RCLife`
(19) **and `Fantastic`**. `UNITS.INI` already gives unit 34 `Race=19`, so only the Fantastic flag
is new information — but it is load-bearing. **It is not, however, load-bearing everywhere.** The
rule writes `Units[i].Fantastic` only; `BaseUnits[i].Fantastic` is untouched, so each downstream
"Fantastic units only" gate has to be checked individually, and they do not agree:

| Gate | Reads | Chosen affected? |
|---|---|---|
| Land Link's extra package (+0x07189) | **live** | yes |
| Survival Instinct (+0x07D68) | **live** | yes |
| Nature Conjunction (+0x092CC) | **base** | **no** |
| Good Moon (+0x08F74) | **base** | **still gains it** |
| Bad Moon (+0x08E84) | **base** | **still suffers it** |

So the Chosen picks up Land Link and Survival Instinct, is *not* helped by Nature Conjunction, and
is *not* exempt from either Moon. The Soul Linker, Leadership and Misfortune gates are in region
`e` and remain unchecked. A roster-only importer will still get this wrong;
`Calculator/units_com2.js` types the Chosen as a plain `hero`.

#### Global enchantments and astronomical events

The global-enchantment flag array is one-byte indexed with an effective element-zero base at
wizard-record displacement `0x89AF3`. The tests in region `c` therefore resolve exactly:

| Offset | ID | Global | Effect represented here |
|---|---:|---|---|
| +0x008FF | 18 | Crusade | +1 effective level |
| +0x041C2, +0x08886 | 27 | Wind Mastery | Hovering persistence; Flying and +1 movement |
| +0x051F7 | 30 | King of Underworld | Grant Wraith Form during combat — the unit **owner's own** copy. It has a second, opposite role in `@Units@ApplyMagicWeapons` (`0x598E8C`), which scans every **other** player and *suppresses* the derived `EncMagic` grant on a hit. Do not merge the two |
| +0x07768 | 20 | Holy Arms | Grant Holy Weapon to normal units — "normal" read from the **base** `Fantastic` flag, so region-`c` conversions do not disqualify a unit |
| +0x0799E | 11 | Chaos Surge | Counts active copies across **all** players into `k`, increments `k` once, then applies it **after** the loop: melee `+k+1` (gated on base attack), ranged `+k` (gated on `rangedtype`), both breaths `+k`, Resistance `+k` ungated. One copy therefore gives +3 melee and +2 elsewhere. No Thrown or Doom Gaze write |
| +0x07DF1 | 24 | Survival Instinct | Fantastic units: +1 Defense, +2 Resistance, +10 To Hit |
| +0x08001 | 26 | Clairvoyance | Forester |
| +0x08112 | 33 | Inner Power | Fire-Immune or Lightning-Resistant units: +3 melee, +3 ranged, Fire Breath and Lightning Breath where each is already positive, +2 Defense, +2 Resistance. No Thrown write |
| +0x08542 | 32 | Blazing Eyes | Same per-player scan as Chaos Surge but the effect is applied **inside** the loop, so each copy fires its own test: the first to find a zero Doom Gaze creates it at 3, every later one adds 1 |
| +0x0866D | 29 | Reinforce Magic | +2 Resistance and +2 magical ranged |
| +0x089A8, +0x0A8A2 | 1 | Eternal Night | The Resistance penalty is applied **in-loop and per copy**, and skips the caster's own — the gate is `Units[i].owner <> j`, so two *enemy* copies cost 2 Resistance and your own costs nothing. Non-Death units only. The second site sets the Darkness magnitude `k` and, on its own, **triggers** the Darkness block |
| +0x08AE5 | 22 | Charm of Life | `hp div 4`, floored at 1, added to both `hp` and the gold-HP counter. The read is of the **calculated** `hp`, so it compounds on the item loop's `IPHP1..3`, Destiny's doubling, Endurance and Lionheart — which is the behaviour calculator defect **F16** requires |

Chaos Surge and Blazing Eyes affect creatures of the matching realm rather than merely the
casting wizard's own units, so their blocks count active copies across wizards. For Chaos
Surge, the first copy contributes +3 melee and +2 to the eligible ranged/breath and Resistance
fields; each later copy contributes +1. CoM2 does not write Thrown or Doom Gaze in this block.

After Sanctify and the generic Flying/scouting normalization, `@Map@NodeAuraType` chooses the
node realm. Nature race 16, Sorcery race 17 and `@Units@IsChaosUnit` dispatch to
`@Units@applynodeaura`; matching creatures receive +2 to each positive melee, ranged, Thrown,
Fire Breath and Lightning Breath field, plus +2 Defense and Resistance.

The three adjacent fixed globals are astronomical events, identifiable from their exact stat
shapes:

| Offset | Event | Binary effect |
|---|---|---|
| +0x08E1C | Bad Moon | In-combat normal units lose 3 Resistance. **The only one of the three with an in-combat gate** |
| +0x08F3E | Good Moon | Normal units gain +1 Defense, +1 positive melee/ranged and +1 movement. Applies overland too |
| +0x09296 | Nature Conjunction | Fantastic units gain +2 Resistance, Defense and positive melee/ranged. Applies overland too |

All three read a flag at a fixed displacement in the runtime **data block** rather than a wizard
record — Nature Conjunction `+0x0AF90AF0`, Good Moon `+0x0AF90B00`, Bad Moon `+0x0AF90B10` —
consistent with being global to the game rather than owned by a wizard. All three test
`BaseUnits[i].Fantastic`, and all three test their attack channels on the **current** values where
most of the ladder tests the base.

**Everything from +0x095EE to the `UnitCalc` hook runs only in combat.** The test at +0x09612
reads `BaseUnits[i].incombat` and the branch at +0x0961A jumps to +0x0CC92, the hook itself. That
is 13,726 bytes — 27% of region `c` — behind one conditional: every combat global, the Guardian
retort, Entangle, Haste, the whole direct-curse tail including the three Warps and Shatter, the
grounded-state curses, Terror, Spell Ward, the sight flags and Tactician. Region `c` is not a
uniform ladder; it has a hard two-part split, and the tables below describe only the in-combat
half.

At +0x09666, strategic combat is queried. Under a separate global mode byte, Flying and
Invisible are cleared before the combat-global stat blocks. The write behaviour and position
are exact; the TD32 source name of that controlling byte remains unresolved.

#### Combat globals, movement normalization and the late curse tail

The combat-global records use four-byte elements with an effective element-zero displacement
of `-0x194`, indexed by `ownCG` with a `$190` stride; the element id is `(disp + 0x194) div 4`.

**Which side's record each one reads is not uniform, and nothing in the table below implies it:**

| Reads | Combat globals |
|---|---|
| the unit's own side | High Prayer, Prayer, Blazing March, Breakthrough, Mass Invisibility |
| the **opposing** side (`3 - ownCG`) | Black Prayer, Entangle, Terror |
| **either** side | Warp Reality, Darkness |

So "Enemy" in the Black Prayer row below means the *caster* is the enemy, not the target; and one
copy of Warp Reality or Darkness affects the whole field regardless of who cast it. Their
region-`c` tests decode as follows:

| Offset | ID | Combat global | Effect represented here |
|---|---:|---|---|
| +0x096F4 | 10 | High Prayer | +2 melee and Defense, +3 Resistance, +10 To Hit and To Block |
| +0x099C2 | 8 | Prayer | +1 Resistance, +10 To Hit and To Block; skipped when High Prayer applies |
| +0x09B01 | 6 | Blazing March | **Only the melee channel is gated on base melee**, not the block — Thrown, both breaths, missile ranged and the magical-weapon grant all fire regardless, so a unit with no melee attack but a bow still benefits. Five channels, four keys: melee +`BlazingMarchAttackBonus` (3), Thrown +`BlazingMarchThrownBonus` (**0 CoM2 / 3 Warlord**), Fire and Lightning Breath both +`BlazingMarchBreathBonus` (0), missile ranged (`@Units@Ismissileranged`) +`BlazingMarchMissileRangedBonus` (3); magical weapons |
| +0x09E6C | 16 | Breakthrough | Three tiers — corporeal permanent, Noncorporeal, combat summon — which are **sequential `if`s, not alternatives**: a noncorporeal combat summon takes both tiers 2 and 3. Only tier 1 is exclusive, barring combat summons and base-Fantastic units. Each +`BreakthroughAttackBonus{,2,3}` melee (1/1/1) and +`BreakthroughDefenseBonus{,2,3}` Defense (0/1/1); the corporeal tier also sets Wall Crusher. `BreakthroughAffectRanged` (1) admits units with a ranged attack — tier 1's ranged exclusion needs **both** a positive `ranged` and positive `ammo`, and is disarmed entirely while that key is set, so it is dormant in both shipped configurations |
| +0x0A4DD | 4 | Mass Invisibility | Invisible |
| +0x0A532, +0x0A567 | 7 | Warp Reality | Non-Chaos units lose 20 To Hit |
| +0x0A5DB | 15 | Black Prayer | Enemy melee/ranged/Thrown/breath −1, Defense −1, Resistance −2. **All ten writes are ungated** — no `> 0` test precedes any of them, so a unit with no Thrown attack ends at `thrown = -1` |
| +0x0A8DA, +0x0A90F | 11 | Darkness | Entered on **either** side's copy **or on Eternal Night alone** — the third arm of the entry test is `k = 2`, so Eternal Night runs this block with no Darkness in play. Life creatures lose 1 from each positive melee, ranged, Thrown, Fire Breath, Lightning Breath, Defense and Resistance, in a single pass. Death creatures gain 1 on the same seven, but the five attack channels **and Defense** sit inside a `for j := 1 to k` loop while **Resistance sits outside it** — so under Eternal Night a Death unit gets +2 attack and +2 Defense but still only +1 Resistance. Gating is asymmetric: the Life branch tests all seven stats `> 0`, the Death branch tests only the five attack channels |
| +0x0B1DA | 2 | Entangle | Corporeal enemies lose `EntangleMovePenalty` half-moves (4 = 2 movement), clamped at zero **inside this block**. The Flight and Chaos Channels Flight minimums that follow at +0x0B2F5 are unconditional and re-impose 6 and 4 half-moves, so a flying unit can get its movement straight back |
| +0x0C3D2 | 13 | Terror | Affected enemies lose `TerrorHitchancePenalty` To Hit (10) |

**Do not merge Darkness, True Light and Eternal Night.** Darkness is the compiled region-`c`
block above; the Eternal Night check at `+0x089A8/+0x0A8A2` supplies its enhanced magnitude and
the enemy non-Death Resistance penalty before that block. Warlord's True Light is instead its
own `UnitCalcPre.CAS:1507-1540` block, after the Prayer/Rally extensions and before Plague.
CoM 1's separate Eternal Night penalty is later still, after Tactician at `0x90B31` (see
*Warp Creature runs early*). They are distinct sequence events even where their additive totals
usually commute.

The owner-validity and location checks immediately before +0x0B092 resolve the small wizard
record displacement `+0x23` as Retort 8, Guardian. When defending one of the wizard's
settlements, it gives +10 To Hit, +10 To Block and +1 Resistance. The retort byte is read from the
**Defender's** wizard record, after the block has already required the unit to be the defender,
and the settlement requirement is a separate gate on the combat-city global — so a melded node
with a Guardian Spirit does *not* trigger it. That is Heavenly Light's job.

After Entangle, movement is clamped non-negative and the minimums required by Flight and
CC Flight are restored. Haste then doubles combat maximum movement — **after** those minimums, so
a flying unit whose movement Entangle had driven to 0 ends at 12 half-moves, not 0. Applying Haste
before the minimums gives the wrong answer. The direct curse tail is:

| Offset | Curse/effect | Exact writes |
|---|---|---|
| +0x0B4D6 | Vertigo | common To Hit −25; To Block −7. Both targets are the *common* fields, which have no bonus/penalty display word — so Vertigo writes no display counterpart at all |
| +0x0B56A | Weakness | melee, ranged and Thrown −3; no breath write |
| +0x0B727 | Mind Storm | melee −3; ranged and Thrown −5; Defense and Resistance −5; no breath write |
| +0x0BA3C | Warp Attack | melee `/2`; ranged/Thrown/breath `/2`; gaze fields and `rangedtype` untouched |
| +0x0BCDF | Warp Defense | Defense `/3` |
| +0x0BDF7 | Warp Resist | Resistance `:= 0` |
| +0x0BF62 | Shatter | reconstruct pre-Warp attack values, then set every positive melee/ranged/Thrown/breath strength to 1 |
| +0x0C2BD | Web | Clear Flying |
| +0x0C317 | Frozen | Clear Flying |
| +0x0C371 | Black Sleep | Clear Flying |

**The three Warps ASSIGN their penalty display word; Shatter accumulates into it.** Warp Attack
(+0x0BAEC melee, +0x0BBCF ranged), Warp Defense (+0x0BD92) and Warp Resist (+0x0BE6B) all store
with a plain `mov`, having never read the existing value — where every other penalty writer in the
region read-modify-writes. So a unit hit by Black Prayer, Weakness or Mind Storm **and** a Warp
loses the accumulated display penalty from the earlier curses; the stat values still stack
correctly, but the displayed modifier does not. Shatter, by contrast, `movsx`es the existing word
first (+0x0BF94 melee, +0x0C09D ranged) and adds `stat - 1`, which is why it reconstructs rather
than clobbers — and its two penalty updates are ungated while its five stat assignments are gated
on `> 0`.

All three Warps and Shatter compute their loss with the same operation the store uses, so no Warp
carries a rounding inconsistency — see *The Warp blocks* above for the `sar / jns / adc` idiom that
makes Warp Attack look otherwise.

The city-enchantment test just before Shatter is Flying Fortress and grants Flying to units
defending the enchanted city — gated on the unit being the **defender**, then on a settlement
being present, then on the city byte at `+0x0ADADDC4` reading `> -1`. Terror follows the three grounded-state curses.

Spell Ward selects the unit's Fantastic realm through the Nature and Sorcery race values plus
`IsChaosUnit` / `IsDeathUnit` and the corresponding Life test. If the defending city's chosen
ward matches, the creature loses 20 To Hit, 3 Defense and 3 Resistance.

The five arms read **consecutive city bytes ordered by realm race value** — `+0x0ADADDC5` Nature,
`+0xC6` Sorcery, `+0xC7` Chaos, `+0xC8` Life, `+0xC9` Death — i.e. `base + (realm - 16)`. Realm
membership is decided three different ways in the one chain: `race` equality for Nature, Sorcery
and Life, but `@Units@IsDeathUnit` and `@Units@IsChaosUnit` for the other two. A unit converted to
Death or Chaos earlier in region `c` is therefore warded, while one converted to Life is matched
only if its `race` field says so.

Finally, any unit with Illusion Immunity sets the appropriate attacker-side or defender-side
sight byte, making detection of Invisible units a side-wide derived property. Those are the two
combat-state bytes at `+0x322`/`+0x323` that this routine's own prologue zeroes at `0x599920`, so
region `c` closes a loop region `a` opened; the defender and attacker tests use *separate* globals
(`0x70A22C` and `0x7092AC`) and both run.

Retort byte `+0x21` is Tactician (ID 6): heroes receive +2 melee, ranged, Defense and Resistance;
non-heroes receive +1 Defense. `ishero` is read from the **calculated** record, melee is gated on
**base** attack and ranged on **current** `ranged`, and **neither Thrown nor either breath is
written** — which is the binary confirmation of the *Calculator-facing discrepancy* note below
that the calculator's unified `+2 rtbMod` over-applies. The region then sets script variable `U`
and calls `UnitCalc`.

#### No single "has a ranged attack" predicate

Blocks that touch the ranged channel do not agree on how to test for one, and each is faithful to
its own site: `Units[i].ranged > 0` (Inner Power, Heavenly Light, Good Moon, Nature Conjunction,
Tactician), `rangedtype > 0` (Chaos Surge, Animated), `BaseUnits[i].ranged = 0` (Focus Magic),
`not Ismagicalranged` (Lionheart, Discipline, Holy Weapon, the non-material To-Hit tail),
`Ismagicalranged` (Orihalcon, Reinforce Magic) and `Ismissileranged` (Flame Blade, Blazing March).
Any model that factors these into one helper will be wrong somewhere; the predicate belongs with
the individual step.

#### Which To Hit field each block writes

`unitT` carries a common To Hit at `+0x4C`, a To Block at `+0x50`, and four attack-specific
modifiers — Thrown `+0x54`, Breath `+0x58`, Melee `+0x5C`, Ranged `+0x60`. Region `e` clamps the
common value to 10–100 *first* and then each `common + specific` sum, so which of the two a bonus
lands in changes the result at the bounds. A byte scan of the whole region for those six
displacements is exhaustive — 33 references, no more:

| Field | Written by |
|---|---|
| common `+0x4C` | Lucky +0x044FC, Dark Force +0x045F7, Animated +0x06278, Survival Instinct +0x07F7E, High Prayer +0x09881, Prayer +0x099F7, Warp Reality +0x0A5A4, Guardian +0x0B0C4, Vertigo +0x0B507, Terror +0x0C40B, Spell Ward +0x0C5FB |
| To Block `+0x50` | Lucky, Dark Force, Holy Armor +0x0746A, High Prayer, Prayer, Guardian, Vertigo |
| Melee/Thrown/Ranged specifics | item To-Hit powers 13–15 (+0x03150–+0x0327C melee-weapon branch, +0x03B57–+0x03BCF ranged-weapon branch), weapon material +0x04AE7–+0x04B81, Holy Weapon +0x07825–+0x078BF |
| Breath `+0x58` | **nothing in region `c`** |

Only those three sources — item To Hit powers, Magic/Mithril/Adamant, and Holy Weapon — can make
the two clamps disagree, and the Breath-specific channel is never written before `UnitCalc`.

#### Calculator-facing discrepancy found during the region-`c` pass

Four calculator-facing differences are now binary-confirmed — the Chosen's Fantastic flag is
recorded with the rule itself in *Unit enchantment effects* above, and these three here:

- **Vertigo:** CoM2 is **−25 To Hit / −7 To Block**. Combat resolution already uses those
  values in `buildVertigoContext`, and the tooltip is correct. The displayed modifier
  calculation in `Calculator/stats.js`, however, selected −30 / −10 for every
  `version.startsWith('com')`, so CoM2/Warlord's red displayed modifiers used CoM 1's values.
  *(Fixed 2026-07-29; the current contract is in `Calculator/SPEC.md`.)*

  **Warlord inherits these values unchanged (resolved 2026-07-29).** `EncVertigo` appears
  exactly twice in the Warlord stat scripts, both at `UnitCalcPre.CAS:1227-1228`, and the pair is
  a flag copy from the combat layer to the unit layer — the same shape applied to Weakness, Mind
  Storm, Web, Black Sleep, Hierophany and Soul Flay in the surrounding block. No magnitude is
  written. The search is exhaustive rather than sampled: all 190 enchantment-flag calls across
  `UnitCalc.CAS` and `UnitCalcPre.CAS` reference their enchantment by `Enc*` constant and none by
  raw ID, so a name-based grep cannot miss one. This closes the Warlord half of verification item **D9**.
- **Mind Storm:** the compiled CoM2 block writes −5 to ranged and Thrown but never writes Fire
  Breath or Lightning Breath. The shipped `UnitCalc.CAS` hook does not add a breath penalty.
  Calculator paths which apply its unified `rtbMod` to breath therefore need correction.
- **Tactician heroes:** the compiled block adds 2 only to melee and the unit's ranged field,
  not to Thrown or breath. The calculator currently expresses this as a unified +2 `rtbMod`,
  and its tooltip says “all attack strengths.”

These are implementation/documentation defects, not unresolved binary questions.

#### Region-`c` residuals

The semantic pass is complete enough to assign every large stat-producing branch, and every
enchantment gate in the address-order table has since been read against its effect block.
Remaining work is narrower:

- recover the TD32 source name of the strategic-combat mode byte tested after
  `@Preparecombat@IsStrategic`.

The two item-loop residuals are closed. The melee/ranged `AttackFlagsT` fields are named from the
shipped `Typedec.pas` layout (`doom` +0, `illusion` +1, `supernatural` +2, `armorpiercing` +3,
`mysticsurge` +4, `lifesteal` +5, `poison` +6, `destruction` +7, `stoningtouch` +8, `deathtouch`
+9, `exorcise` +10, then the six values at +12…+32), and the per-weapon-type ranges are the two
compiled range tests recorded above — melee +0x03120…+0x03B15, ranged +0x03B27…+0x0413A.

**Everything from +0x00707 to +0x07951 has since been reconstructed statement by statement** in
`Units.RecalculateUnits.pas`. Its durable `Units.RecalculateUnits.R5.1b.evidence.md` companion
preserves the contiguous coverage ledger, all six zero counts, every conditional-branch target
and the complete arithmetic idioms. The findings folded into this file above are the union of the
Claude and Codex passes. *Verified: Claude 2026-08-01; Codex 2026-08-01, independent from the
shared thirteen-anchor spine; cross-review and independent address verification completed
2026-08-02 with no surviving disagreement.*

**Neither derivation wins a disagreement by default.** Independent verification on 2026-08-02
found five wrong readings in the Claude artifact — three of which had already been folded into
this file and have since been reverted (the melee arm's item-type range, the Axe
`hitchancethrown` rider, and Warp Attack's claimed rounding inconsistency). Citing an instruction
address establishes that the instruction was seen, not that it was read correctly; four of the
five errors were mis-read branch *targets*, and all five passed the coverage checker cleanly.
Where this file and the merged reconstruction disagree, **re-read the binary** —
`tools/annotate_caster_disasm.py` resolves the site in one command.

### Region `e`, block by block

Region `e` is **not just Supreme Light**. The second script hook returns at `0x5A65DC`; from
there the binary finishes the first per-unit loop, builds and applies stack auras in a second
per-unit loop, applies Supreme Light, then reconciles state which may have become inconsistent
when maximum stats changed.

| VA / offset | Purpose | Confidence |
|---|---|---|
| `0x5A65DC`–`0x5A681C` / +0x0CCBC–+0x0CEFC | Final clamps after `UnitCalc`: common To Hit is kept in 10–100; Ranged, Melee, Thrown and Breath To Hit modifiers are adjusted so common + attack-specific modifier stays in 10–100; defense, melee, ranged, Thrown, Fire Breath and Lightning Breath strengths are clamped to at least 0 | exact |
| `0x5A6822` / +0x0CF02 | `@Units@BuildAuraTable` | exact |
| `0x5A6844`–`0x5A6954` / +0x0CF24–+0x0D034 | Start a second unit loop and repeat the dead-unit, combat-only and optional plane/X/Y filters used by the main recalculation loop | exact except the public parameter names |
| `0x5A6954`–`0x5A6FD9` / +0x0D034–+0x0D6B9 | For every matching aura belonging to the unit's owner and overland tile, dispatch aura types 0–10 and write their effects through a computed unit-record pointer | exact |
| `0x5A6FDF`–`0x5A744B` / +0x0D6BF–+0x0DB2B | Supreme Light eligibility and effects | exact |
| `0x5A744B`–`0x5A74FF` / +0x0DB2B–+0x0DBDF | Clamp current unit MP to maximum unit MP | exact |
| `0x5A74FF`–`0x5A766E` / +0x0DBDF–+0x0DD4E | If recalculation changed maximum combat movement, adjust remaining combat movement proportionally to how much of the unit's action has already been spent; skip Immobile units | high; see residual unknowns |
| `0x5A766E`–`0x5A76D0` / +0x0DD4E–+0x0DDB0 | Debug-only: when the named `DebugInvis` global is set, clear `UnitInvisible` and `UnitStealth` | exact |
| `0x5A76D0`–`0x5A7A57` / +0x0DDB0–+0x0E137 | Reconcile total damage with a changed maximum HP while outside combat, preserving excess damage in a deferred-damage field and never letting recalculation alone kill the unit; **not relevant to the damage calculator** | exact behaviour; deferred field's source name unavailable |
| `0x5A7A57`–`0x5A7A63` / +0x0E137–+0x0E143 | Advance the second unit loop and return | exact |

#### The aura pass

`@Units@AddtoAuraTable(uid, at, val, ow)` (`0x5973A4`) gives the table layout and merge rule.
Each 24-byte record is `{plane, x, y, aura type, value, owner}`. A new source is merged with an
existing record when tile, owner and type match, and only the higher value is retained. This is
the implementation of the helptext's non-cumulative / highest-source-only language. The owner
comparison reads `Units[uid].owner`; the separate `ow` argument is stored only when a new entry
is appended. New-entry coordinates come from `BaseUnits[uid]`.

`@Units@BuildAuraTable` (`0x5976CC`) adds Holy Bonus, Misfortune and Resistance to All directly
from unit fields, then reads hero abilities and calls `@Heroes@HeroBonus` for Divine Barrier,
Guiding Beacon, Soul Linker, Logistics, Prayermaster, Armsmaster and Leadership. Supply Commander
adds its fixed value 2. Holy Bonus and Resist to All are each gated by the calculated field but
contribute the base-record magnitude. `@Heroes@HeroBonus` (`0x5933E8`) applies either
`bonusmul * level div bonusdiv` for ability level 1 or
`bonusmul * 3 * level div (bonusdiv * 2)` for ability level 2, using signed division that
truncates toward zero. The following aura names are inferred semantic aliases for the exact
numeric dispatch values:

| Type | Constant | Region-`e` effect |
|---:|---|---|
| 0 | — | no-op / unused sentinel |
| 1 | `AuraHolyBonus` | Add the aura value to defense and resistance, and to melee/ranged when the corresponding base attack exists; update the four positive-buff display fields |
| 2 | `AuraGuidingBeacon` | Add the value to an existing ranged attack; update its buff display field |
| 3 | `AuraPrayermaster` | Add the value to resistance; update its buff display field. Resistance to All feeds this same aura type, so the two compete by maximum rather than stack |
| 4 | `AuraDivineBarrier` | Add the value to defense; update its buff display field |
| 5 | `AuraSoulLinker` | Fantastic units only: add the value to To Hit and To Defend |
| 6 | `AuraSupplyCommander` | Add the value to maximum ammo when the unit has ammo |
| 7 | `AuraLogistics` | Add the value to maximum combat movement |
| 8 | `AuraArmsmaster` | no stat-recalculation write; Armsmaster's experience grant is handled outside this dispatcher |
| 9 | `AuraLeadership` | Non-fantastic units only: add the full value to existing melee; add integer-truncated value / 2 to existing non-magical ranged; update buff display fields |
| 10 | `AuraMisfortune` | Non-fantastic units only: subtract 1 melee, defense and resistance, and subtract 1 ranged when a base ranged attack exists; update the four penalty display fields |

This places **Holy Bonus, Resistance to All, Prayermaster, Guiding Beacon, Divine Barrier, Soul
Linker, Supply Commander, Logistics, Leadership and Misfortune after `UnitCalc`**, not in `a` or
`c`. The CoM2 manual's changelog independently confirms the important part of this order:
"Supreme Light effect is now applied last, after Resistance To All, Holy Bonus, and
Prayermaster" (`../CoM2 manual.txt:5545`).

The three helpers are reconstructed statement by statement in `Units.RecalculateUnits.pas`;
`Units.RecalculateUnits.R5.1c-c.evidence.md` preserves all 24 semantic conditional targets, 19
calls, state writes, arithmetic idioms, and three contiguous ledgers. *Derived and byte-audited:
Codex 2026-08-02 (`0x5973A4`, `0x5976CC`, `0x5933E8`). Completed 2026-08-02 by user direction;
the independent Claude derivation and formal cross-review were unavailable at completion.*

The earlier direct-displacement scan missed this whole table because at `0x5A6A0D` the routine
forms

```
dword ptr [0x709188] + i * 0x1E1 * 4 + 0x6426898
```

once, saves that pointer, and thereafter uses small structure-relative offsets. The 72-access
result above remains exhaustive **for direct operands in the four accessor-visible literal
windows**; it says nothing about computed-pointer layer accesses or aura-table effects.

The R5.1c-a portion is now reconstructed statement by statement in
`Units.RecalculateUnits.pas`; `Units.RecalculateUnits.R5.1c-a.evidence.md` preserves its four
contiguous ledgers, every branch target, the raw jump table, the complete SmallInt and signed-
division idioms, and the write reconciliation. *Verified: Claude 2026-08-02 and Codex
2026-08-02, independent; cross-review and merge completed 2026-08-02 with no surviving
disagreement (`0x5A65DC`, `0x5A6822`, `0x5D8CA0`, `0x5963F4`).*

#### Supreme Light

The block tests that the unit is in combat and that combat-global enchantment
`CGSupremeLight` (9) is active for its side. That member identity is derived, not assumed — see
`Units.RecalculateUnits.R5.1c-b.evidence.md`, *The Supreme Light gate's combat-global member*,
which resolves it and the ten other members the reconstruction reads from their displacements.
Eligibility is an OR: current or base ranged type
is magical (`@Units@Ismagicalranged`), the effective realm is Life (`RCLife`, `0x13`), or maximum unit MP
is positive. That exactly implements the helptext's "friendly magic users and life creatures."

For an eligible unit it:

- adds `+2` melee if base melee is positive;
- adds `+2` ranged if the **current** ranged strength is positive;
- adds `current resistance div 3` defense, using signed division that truncates toward zero;
- updates the matching positive-buff display fields; and
- writes `EncSupremeLightRegen` (54) to the per-unit enchantment array at `+0xDB23`.

The last write confirms the block's identity. The active-state test is not in the unit-
enchantment arrays because Supreme Light is a global combat enchantment; the per-unit
regeneration marker is only materialised here. Thus Supreme Light runs **after `d`, after Warp
and Shatter, and after the aura pass**. This is the same relative outcome as CoM 1 by the
opposite route: CoM 1 moves Warp early, while CoM2 moves Supreme Light and the native aura pass
late. It also corrects the earlier shorthand that called all three writes `+2`: the third stat
write is defense `+= resistance div 3`. The current/base distinction is also intentional:
the melee rider tests `BaseUnits.attack`, while the ranged rider tests `Units.ranged`, so a
ranged attack created earlier in this recalculation can qualify.

#### Final state reconciliation

The remainder is not unidentified padding:

- The `unitT` layout in `Typedec.pas` identifies common To Hit at `+0x4C` and the
  attack-specific modifiers as Thrown `+0x54`, Breath `+0x58`, Melee `+0x5C` and Ranged
  `+0x60`. Region `e` first clamps common To Hit to 10–100. It then adjusts each modifier so
  `common + melee`, `common + ranged`, `common + thrown` and `common + breath` are each in
  10–100. Fire Breath and Lightning Breath share the Breath To Hit channel. This is
  calculator-relevant final normalization. The calculator collapses the three mutually
  exclusive secondary-attack channels into its one selected ranged/thrown/breath To Hit value
  and does enforce the same 10–100 output bounds. Exact ordering still matters at the bounds,
  however: clamping the combined value once is not generally equivalent to clamping common To
  Hit first and then its sum with the channel modifier. For example, common 0 plus Ranged +20
  becomes 30 in the engine (common first becomes 10), not 20. The calculator's mixed common and
  attack-specific modifiers therefore need a separate ordering audit before this block can be
  called fully equivalent.
- `0x6426F42` is current unit MP and `0x6426F40` maximum unit MP; current is capped to maximum.
- Maximum combat movement is compared with the value saved before recalculation. If it changed,
  remaining combat movement is adjusted by
  `(new maximum - old maximum) * (2 - combatattacksdone) / 2`. Ranged attacks set the byte to 2
  and melee attacks increment it by 1, so the evident purpose is to avoid refunding movement
  already consumed by the unit's action.
- The `DebugInvis` block clears the fields returned by the named `UnitInvisible` and
  `UnitStealth` accessors. This is a debug toggle, not a normal game mechanic:
  `@Init@ClearGameVariables` clears it and `@Castercore@ToggleDebugInvis` is its writer.
- Outside combat, if a maximum-HP reduction would make a living unit's total HP non-positive,
  total damage is capped at `maximum HP - 1` and the overflow is moved into `Overdamage`.
  When maximum HP later rises, as much of that stored overflow as possible is restored to total
  damage while still leaving at least 1 HP. `StreamOfLife` and the relevant full-heal spell clear
  both `Totaldamage` and `Overdamage`. This is
  overland state preservation, not combat-stat derivation, and is **not relevant to the damage
  calculator**.

The R5.1c-b merge closes the remaining semantic and field-name questions in this tail. The
three secondary strengths at offsets `+0x2C`, `+0x30` and `+0x34` are `SThrown`,
`SFireBreath` and `SLightningBreath`; their region-`e` blocks only clamp negative values to
zero. The final calculator clamp is arithmetically equivalent because no later `e` block
modifies those strengths. The movement byte is the shipped `combatattacksdone` field, and the
deferred-damage word is the shipped `Overdamage` field.

- ~~why Armsmaster is retained as aura type 8~~ **closed 2026-07-28.** The dispatcher is a
  jump table at `0x5A6A33`, 11 entries, reached by `jmp dword ptr [eax*4 + 0x5A6A33]` at
  `+0xD10C` after a `cmp eax, 0xA / ja` bounds check. Entry 8 (`AuraArmsmaster`) holds
  `0x5A6FD3` — the *same* target as entry 0, the sentinel, which is the block's exit label. So
  Armsmaster's no-op is explicit in the table rather than untraced, and there is no hidden path.
  The other nine entries land at `+0xD13F`, `+0xD2CC`, `+0xD31B`, `+0xD377`, `+0xD3C6`,
  `+0xD405`, `+0xD42E`, `+0xD46A` and `+0xD5B9`, all inside +0xD034–+0xD6B9.

The merged source and `Units.RecalculateUnits.R5.1c-b.evidence.md` cover all six assigned
extents with contiguous ledgers, 27/27 semantic conditional jumps, 12/12 calls and every state
write. *Verified: Claude and Codex 2026-08-02, independently derived; Codex reviewed Claude
against quoted instruction bytes with no actionable finding; reciprocal Claude review was
unavailable before the user-directed merge. Merged by Codex 2026-08-02 (`0x5A6FDF`,
`0x5951D4`, `0x595354`, `0x5B9C54`, `0x595DB0`, `0x5FCF7C`).*

**Region `a` has no unidentified block.** Its control changes, type conversions, enchantment
merger, Golem rule and script handoff are mapped in *Region a, block by block* above.

**Nine enchantments are not consumed by this stat pipeline**: overland Stasis, Resist Elements,
Elemental Armor, Regeneration, Resist Magic, Spell Lock, Bless, Necromancy and No Heal. They are
resolved elsewhere — Bless and the resistance enchantments during combat rather than during
stat recalculation. Combat Stasis and Buried were previously on this list, but R5.1c-b shows that
the pipeline calls `@Units@Immobile`, which reads both and suppresses movement reconciliation.
The earlier list also included Misfortune; that was wrong. `@Units@BuildAuraTable` reads
`EncMisfortune` (58) and feeds aura type 10 to region `e`, so its access is hidden behind the
helper call that the direct enchantment scan did not include.

**Not established in region `c`.** All 36 gates in the address-order table have been re-read
against the binary and each resolves to the named enchantment and effect, but field identities
outside those blocks — chiefly inside the item loop — remain unassigned. The table is in address
order, and while its monotonic sequence reads as a coherent pipeline, each block's complete
incoming control flow has not been traced. That matters most for
the claim that level and weapon bonuses land in `c` when `Calculator/stats.js` books them to
`a`. Region `e` and the three aura-table helpers have complete source-shaped coverage. R5.1c-c
was completed by user direction on 2026-08-02 with the unavailable independent derivation and
formal cross-review recorded in its provenance.

## Calculator sequential-transform audit (2026-07-30)

This section compares every calculator-relevant write identified above with the ordered lists in
`Calculator/stats.js` and `Calculator/combat.js`. It is a **calculator audit**, not new binary
research: the engine positions and effects remain owned by the per-region sections above. The
audit reached the end of this document, including both resolution-time sequences.

The broad spine is represented correctly:

```
base -> a -> b -> c -> d -> e
                         clamp -> aura pass -> Supreme Light

GetEffectiveResistance / EffectiveDefense: separate per-attack scratch sequences after e
```

The three Warps followed by Shatter, Tactician after them, Colossal Strength before the
post-magic Outlander effects, Blaze of Glory -> Beat of Swiftness -> Hierophany, and the two
resolution-time routines all occupy the right relative positions. The remaining claim in
`Calculator/SPEC.md` that every stat write is represented by one ordered step is not yet true.

### Confirmed list omissions and wrong positions

| Effect | Engine position/effect | Calculator state on 2026-07-30 | Consequence |
|---|---|---|---|
| Destiny, Chaos Channels Breath, Focus Magic conversion, Vampirism, Shadow Strike | `a`/`c`/`d`, at the exact sites above | Strength and type are still mutated in the pre-sequence `calcBase*` chain | The sequence cannot reproduce which transformations see Warp, Colossal Strength or Destiny; tracked together under F12 because the single `rtb` projection is the common blocker |
| Upgraded Explosive | `UnitCalcPre.CAS:1066-1078`, before Ballistics, Xenopsychology, Radio and every later combat-global/city block in `b` | `upgradedExplosive:fireBreath` is the last `b` step | Later Fire Breath additions such as True Light and Lucky Star can be doubled although the script adds them after the doubling |
| Misfortune (the landed result exposed as Mislead) | Aura type 10 in `e`, after `UnitCalc` and the initial clamps | `mislead`/`mislead:ranged` are in `c`, before Holy Armor, Warp and all of `d` | Warp can reduce its penalty, and Blaze of Glory can consume its Defense penalty; neither happens in the engine |
| Holy Armor | `c` +0x07407, after the earlier unit-enchantment blocks but before the global-enchantment and combat-global blocks | Inserted after the whole `abilByPhase.c` spread | Its `Defense > 5` read incorrectly sees later effects including High Prayer, Survival Instinct, Inner Power, Black Prayer and Mind Storm |

**Exact defence writers on each side of Holy Armor's threshold** (the fix criterion for F15). The
branch at +0x07439 reads live `defense`. Already run: the item loop's `IPDefense1..6`, Plate Mail
and Chain Mail, Heavenly Light +1, Discipline +1/+2, CC Armor +3, Animated +1, Mystic Surge +2,
Iron Skin +5, Land Link +2. **Not** yet run: Orihalcon, Holy Weapon, every global enchantment
(Survival Instinct +1), the node aura +2, Bad/Good Moon, Nature Conjunction +2, every combat
global (High Prayer +2, Breakthrough, Black Prayer −1), Entangle, and the whole curse tail
including Warp Defense `div 3`. Any member of the second list placed before Holy Armor flips the
branch; none of them may be.
| Charm of Life | `c` +0x08AE5; add 25% of the HP current there, minimum 1 | Its magnitude is precomputed from `calcBaseHP`; its step precedes the separate Endurance and Lionheart HP writes | It fails to scale level/item/Endurance/Lionheart HP already present at the binary site |
| Warlord Vampirism | `d` `UnitCalc.CAS:1245-1258`, after Colossal Strength: add integer part of `(Thrown/2) + ((Fire Breath + Lightning Breath)/2)`, then reduce each present source channel to 1 | Runs before the sequence and uses `source strength - 1` | Both position and magnitude disagree with the executable script |
| Warlord combat-cast Flame Blade's Fire Breath point | `d` `UnitCalc.CAS:330-333`, before Colossal Strength | Folded into the region-`c` Flame Blade secondary-attack term | Warp can halve the point even though Warlord adds it after Warp |

The `abilByPhase.b`, `.c` and `.d` spreads also do not preserve the mapped source order in
general. Most displaced neighbours are additive and commute today, but the list is not
isomorphic to `UnitCalcPre.CAS`, the region-`c` address map or `UnitCalc.CAS`, and the scaling
cases above prove that this is not only a trace-display concern. Rust is one concrete atomicity
violation: its melee and ranged writes are emitted by separate steps with other work allowed
between them, although `UnitCalc.CAS:492-504` is one effect block.

### To-Hit/To-Block writes remain outside the derivation sequence

The record already carries `toHit` and `toBlk`, but a second calculation after `runStatSteps`
still combines level, weapon, Holy Weapon, Ballistics, Xenoveterinary, Radio, True Sight,
Hurricane, Vertigo, Plague, Great Unbinding and other modifiers. Region `e` therefore cannot
perform its real two-stage normalization over the same ordered record: common To Hit must be
clamped first, then each common-plus-channel sum. This is the broader structural cause behind
backlog F5, not only a final `clampPct` formula.

### Attack-channel overreach

`Caster.exe` has separate conventional ranged, Thrown, Fire Breath, Lightning Breath and gaze
fields. The calculator's shared `rtb` projection still makes some represented effects reach
channels their engine write does not:

- Mind Storm has no Fire- or Lightning-Breath write in CoM2 or Warlord.
- Tactician's hero block writes conventional ranged, not Thrown, Breath or gaze.
- Warlord True Light writes melee and conventional ranged, not every secondary attack or gaze.
- The native node aura writes positive melee/ranged/Thrown/breath fields, not Doom Gaze.
- The Warlord combat-cast Flame Blade point is Fire Breath only and belongs in `d`, as above.

These are output defects, not merely missing trace detail. They are another reason F12's wider
engine-shaped attack record is prerequisite work.

### Calculator-relevant effects with no transform/control

The audit also found binary/script effects capable of changing this calculator's damage output
but absent from its transform inventory: Dark Force; Guardian Spirit/Heavenly Light; Bad Moon;
Good Moon; Nature Conjunction; Spell Ward; and the Guiding Beacon, Prayermaster, Divine Barrier,
Soul Linker and Leadership auras. Golem Resist Elements and the Chosen's Fantastic rule were
already tracked as F3/F4. Item-loop Attack, Defense, Resistance, HP and To-Hit powers are likewise
not represented as distinct transforms; the UI exposes only its coarser weapon/armor loadout.

Effects which only change movement, ammo, healing, regeneration, overland state, ownership or
display labels do not need a damage-stat transform unless their flag is consumed by an
in-scope attack rule. Haste, immunities and gaze dispatch can therefore remain in combat
resolution or normalization when they make no stat write; this audit does not require every
named block in the phase index to become a derivation step.
