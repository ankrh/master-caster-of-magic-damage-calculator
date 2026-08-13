# CoM2 / Warlord binary analysis — resolution helpers

Effective Resistance and Defense, combat rolls, distance penalties, and other resolution-time modifiers.

Addresses refer to the pinned `Caster.exe` build. See the [analysis index](./CoM2%20binary%20analysis.md) for binary identity, method, and the subsystem map.

## Resolution-time modifiers (R5.2e executable reconstruction integrated 2026-08-02)

Ten enchantments never appear in `@Units@RecalculateUnits`. They are not a sixth phase — they
are a **different axis**. Phases `a`–`e` run once per unit and produce one stat block; these are
functions of the *incoming attack*, so the same defender has a different effective resistance
against a Nature spell than against a Death spell in the same combat. Two routines carry the
stat-modifying ones:

| Symbol | VA | Signature |
|---|---|---|
| `@Units@GetEffectiveResistance` | `0x595AB8` | `(u, realm, isroll)` |
| `@Units@EffectiveDefense` | `0x5965C8` | `(u, flags, ismagic, extradef, spellid, ismissile, isbreath, islightning, isfire, isranged, ismagic2)` |

Complete source-shaped bodies are in `Combat.ResolutionHelpers.pas`; branch bytes, loader
bindings, calls, ledgers and completion counts are in
`Combat.ResolutionHelpers.R5.2e.evidence.md`. Codex produced the cold derivation and a separate
raw-byte self-review; the user directed integration while Claude was unavailable.

**Both are strictly after `e`, and neither writes back.** Each forms a pointer to `Units[u]` —
the *calculated* record, so its starting value is the finished post-`e` stat (`defense` +0x64,
`resistance` +0x68) — accumulates into a local, and returns it. Nothing here mutates the unit
record, so these modifiers cannot affect a later phase, a later attack, or the displayed stat
block.

Two consequences for the calculator, and they are not the same one:

- **They do not belong in the derivation sequence.** That sequence is per unit and feeds the
  displayed stat block; these are neither per-unit nor displayed.
- **They are still an ordered sequence of transforms, and should be modelled as one.** Both
  routines are decoded in execution order below, and `EffectiveDefense` in particular
  short-circuits, adds, halves the accumulated sum, replaces it outright and then adds again on
  top of the replacement. That is the same non-additive vocabulary as Warp and Shatter in region
  `c`. `Calculator/HISTORY.md` records their completion under R1/R2: the same step mechanism as the
  derivation phases, on a different axis — keyed per *(defender, attacker, attack type)* rather
  than per unit.

`realm` is `1..5` = Nature, Sorcery, Chaos, Life, Death (`SharedConstants.pas:62`); 0 means the
effect has no realm. Magnitudes are `MODDING.INI` globals, shipped values in parentheses.

### `GetEffectiveResistance`, in execution order

| # | Site | Condition | Effect |
|---:|---|---|---|
| 1 | `0x595AEB` | — | `Result := resistance` (post-`e`) |
| 2 | `0x595B23` | `isroll` and `ishero` (+0xE2) and **Charmed** — see below | `Result := 100` |
| 3 | `0x595BF5` | `magicimmunity` (+0xC6) and `realm <> 0` | `Result := 100` |
| 4 | `0x595C36` | `realm = 1` (Nature) and **Resist Elements** | `+= ResistElementsResistBonus` (4) |
| 5 | `0x595C82` | `realm = 3 or 5` (Chaos, Death) and **Bless** | `+= BlessResistBonus` (**5 CoM2 / 4 Warlord**) |
| 6 | `0x595CC7` | `realm <> 0` and **Resist Magic** | `+= ResistMagicBonus` (5) |

**The two `:= 100` assignments precede all three additions**, so a magic-immune unit hit by a
realm-typed spell finishes above 100 when it also has Bless, Resist Magic or Resist Elements.
Resist Elements is Nature-only on this side, which matches `CoM2 helptext.TXT:225` exactly
("+4 resistance against nature magic"). Elemental Armor has **no** resistance component.

### `EffectiveDefense`, in execution order

| # | Site | Condition | Effect |
|---:|---|---|---|
| 1 | `0x596612` | — | `Result := defense + extradef` (post-`e`) |
| 2 | `0x59662B` | attack is Illusion and not `illusionimmunity` (+0xC4) | `Result := 0`, **return immediately** |
| 3 | `0x596651` | `isranged` and `LargeShield` (+0xD0) | `+= LargeShieldBonus` (3) |
| 4 | `0x596671` | (`ismagic2` or `isbreath`) and **Resist Elements** | `+= ResistElementsDefenseBonus` (4) |
| 5 | `0x596696` | (`ismagic2` or `isbreath`) and **Elemental Armor** | `+= ElementalArmorDefenseBonus` (12) |
| 6 | `0x5966BB` | `ismagic2`, **Bless**, `spellid > 0`, and the spell's realm (spell record +0x34) is Chaos or Death | `+= BlessDefenseBonus` (**5 CoM2 / 7 Warlord**) |
| 7 | `0x59670A` | `lightningresist` (+0xDF) and `islightning` cancels the flag first; then armour piercing | `Result := Result div 2` |
| 8 | `0x596730`–`0x596813` | six immunity tests, each an **assignment** | `Result := 100` |
| 9 | `0x59681A` | not `ismagic` and `weaponimmunity` (+0xC9) | `+= WeaponImmunityDefenseBonus` (8) |

**City Walls is `extradef`, not a RecalculateUnits write.** `@Combat@ApplyAttack` starts its
local extra-defense value at zero (`0x5B27A9`), then requires a wall, the defender inside it, and
the attacker outside it (`0x5B27AC`–`0x5B27D3`). It loads `CityWallDefBonus` at `0x5B2837`
(shipped `MODDING.INI`: 3), replaces it with `CityWallBrokenDefBonus` when `GetWallState` returns
2 at `0x5B2841` (shipped value: 1), and passes that value to `EffectiveDefense` at `0x5B28EF`–
`0x5B292A`. Thus walls are inside Armor Piercing's later halving and are discarded by Illusion or
an immunity assignment; they never affect displayed Defense, Warp, Holy Armor, or Blaze of Glory.
`@Spells@DamageSpell` passes zero for the same argument (`0x5C139A`), so spell damage does not
receive the walls bonus.

`ApplyAttack` also pushes zero for **spell ID** at `$005B28ED` before calling
`EffectiveDefense` at `$005B292A`. The positive-ID gate therefore excludes every unit attack
handled by `ApplyAttack` from step 6, even when that call sets `ismagic2`. This closes D6 and
exposes calculator defect F34; a spell caller with a real Chaos/Death spell ID can qualify.

Step 8's six tests, in order: `Fireimmunity` (+0xC1) against a fire *spell* (spell record +0x56);
`Fireimmunity` against `isfire`; `coldimmunity` (+0xC5) against a cold spell (+0x57);
`poisonimmunity` (+0xC8) against a poison spell (+0x55); `magicimmunity` (+0xC6) against
`ismagic2`; `missileImmunity` (+0xC3) against `ismissile`.

Three ordering consequences the calculator has to match:

- **Armour piercing halves the sum, not the base.** Step 7 follows steps 3–6, so Large Shield,
  Resist Elements, Elemental Armor and Bless are all inside the halving.
  `computeDefenseProfile` already does this.
- **The immunity assignments discard everything before them**, including the halving. An
  immunity is worth exactly 100 defense, never 100 plus the accumulated bonuses.
- **Weapon Immunity is added after those assignments**, so it stacks on top of a 100 rather than
  being overwritten by it.
- **Illusion short-circuits.** Step 2 returns, so no later bonus or immunity applies.

### Combat roll and ranged-distance helpers (R5.2e and R5.2k)

R5.2e reconstructed the consumers around those two transforms; R5.2k later reconstructed the
small predicates and distance formula they call:

| Symbol | Exact behavior |
|---|---|
| `@Wizard@HasGlobalEnchantment` `$00590DAC` | Wizard 15 (`NeutralplayerID`) returns true for every global enchantment without indexing the wizard/global arrays. Otherwise return `Wizards[w].GlobalEnchantments[ge]`, with real wizard bounds 0–13 and global-enchantment bounds 1–100. |
| `@Units@ResistanceRoll` `$00595CEC` | `i := GetEffectiveResistance(u, realm, True) + save`; return `max(Random(10)+1-i, 0)`. With `fate`, a nonnegative wizard, Fate Mastery ID 35 and a zero first result, make exactly one new roll and replace the result. A failed resistance roll is never rerolled. |
| `@Units@AttackRoll` `$00595E24` | Floor To Hit at 10, then for each attack die count `Random(100) < hit`. There is no upper clamp. |
| `@Units@DefenseRoll` `$00595E7C` | For each one-based defense die, if its index exceeds `ToDefendCap` and To Defend exceeds `ToDefendCappedValue`, lower To Defend to the capped value before rolling. With shipped 15/30, dice 1–15 use the original chance and dice 16+ use `min(original, 30%)`. This closes Q14 and opens F32. |
| `@Combat@RangedPenalty` `$005B1800` | Start from `CombatDistanceUnit`. A direct calculated `ishero` test sets distance to zero when shipped `HeroNoRangePenalty=0`; no ability is consulted. Magical ranged has a separate equivalent exemption. At/above the threshold, subtract it and return `(excess div Gap) * Growth + Base`; Long Range zeroes only `excess`, capping an applicable penalty at `Base`. This closes D14 and opens F33. |
| `@Combat@CombatDistanceUnit` `$005BB234` | Calls `CombatDistance` with all four coordinates from `BaseUnits`, in `(u.x, u.y, u2.x, u2.y)` order. |
| `@Combat@CombatDistance` `$005BB1CC` | Returns `max(abs(x-x2), abs(y-y2))`, the Chebyshev distance on the combat grid. Both signed subtractions and absolute values retain Delphi overflow checks. |

The R5.2k source-shaped bodies are in
[`Combat.CallClosureHelpers.pas`](./Combat.CallClosureHelpers.pas), with branch, call,
arithmetic and coverage proof in
[`Combat.CallClosureHelpers.R5.2k.evidence.md`](./Combat.CallClosureHelpers.R5.2k.evidence.md).
They came from a Codex-only cold derivation and separate reverse-order raw-byte self-review;
the review found no correction, and no Claude input was read or used during derivation. Claude
reviewed all six extents against the binary on 2026-08-03 (R5.C) and found no semantic
misreading; its one precision entry, attestation of the literal constants, is applied above.

All configuration aliases above were independently checked against their
`@Init@GameInitialize` string loaders. In particular, `ToDefendCap` / `ToDefendCappedValue`
load into pointer globals `$0070A284` / `$007099EC`, and the six ranged-penalty keys load into
the exact globals dereferenced by `RangedPenalty`.

Verified for R5.2e: Codex 2026-08-02, single-agent cold derivation plus raw-byte self-review,
under the user's direction; no Claude derivation was available. Claude reviewed all seven extents
against the binary on 2026-08-03 (R5.C) and found no semantic misreading: the `ToDefendCap`
write-back, the To Hit floor with no ceiling, the inverted-looking `HeroNoRangePenalty` polarity,
Long Range's excess-only zeroing, and the Charmed hero-array indexing all reproduce. Two
documentation defects were fixed — the four undeclared `Enc*` constants (and `HACharmed`) now
carry values and reading sites, and the Fire/Cold/Poison immunity blocks are recorded as lacking
Bless's `spellid > 0` guard, inert with shipped spell record 0, which strengthens F34.
### The other six

Not stat modifiers at all, which is the second reason these ten do not share a phase:

| Effect | Consumed by |
|---|---|
| Spell Lock (26) | `@Spells@DispelMagic` ×2, `@Spells@SpellEffect` ×2, `@Spells@CombatSpellEffect` ×3, `@Spelltargeting@ValidCombatSpellTarget` ×2, `@Combat@ApplyAttack` `0x5B2A09` |
| Stasis combat (9) | `@Units@Immobile` `0x595236`, `@Combat@Combatend`, `@Combat@CombatEndTurn`, `@Spells@CombatSpellEffect` |
| Stasis overland (10) | `@Game@UnitsRefillOverlandmovement` ×2, `@Ai@AIAddAvailableUnits`, `@Ai@AIunitavailable` |
| Buried (60) | `@Units@Immobile`, `@Combat@Dealdamage` `0x5B4274`, `@Combat@Combatend` ×2, `@Combat@CombatEndTurn`, `@Scripts@EvaluateExpression` (exposed to CAS) |
| Necromancy (55) | `@Combat@Combatend` `0x5B581E` — the only site in the binary |
| Regeneration (22) | no gameplay read found; region `c` normalizes the value, and only AI dispel-priority code reads the flag |
| No Heal (62) | `@Spells@InitializeCombatSpellcasting` `0x5CD265` writes the combat-layer flag for Raise Dead; the reconstructed Mystic Surge block `$005A016D..$005A0420` also writes it; the shared consumer `$005A0420..$005A04A9` reads it and derives race 21 plus `Fantastic`. See [`D32.evidence.md`](./D32.evidence.md) |

**Method and its limits.** Three uncapped whole-binary detectors were run: absolute array
addresses; the five `Castercore` accessors (all 32 call sites are in render/UI modules, so
gameplay code reads the arrays directly); and computed-record-pointer reads in the four
displacement bands (+0x508 aggregate, +0x56C overland, +0x5D0 combat, +0x634 item). The last two
rows above are therefore **"not found", not "absent"** — a read whose element index sits in a
register, as in region `a`'s 1–100 merger, evades all three.

The `unitT` boolean run is confirmed rather than assumed: counting from `sound : word` at +0xB8
places `Fireimmunity` +0xC1, `missileImmunity` +0xC3, `illusionimmunity` +0xC4, `coldimmunity`
+0xC5, `magicimmunity` +0xC6, `poisonimmunity` +0xC8, `weaponimmunity` +0xC9, `LargeShield`
+0xD0, `lightningresist` +0xDF and `ishero` +0xE2 — eight of which are independently corroborated
by the condition each guards above.

### Step 2 is the Charmed hero ability (resolved 2026-07-29)

The lookup is solved rather than guessed. `@Castercore@GetHeroAbility(w, ht, ha)` (`0x647D2C`)
is a one-line accessor resolving to

```
dword [ base + w*0x32997*8 + ht*0x19*8 + ha*4 + 0x8A724 ]     ; ht = 1..85, ha = 1..50
```

which is `WizardT.Hero : array[1..MaxMaxherotypes] of array[1..maxmaxheroability] of integer`
(`Typedec.pas:71`) — 85 hero types × 50 abilities × 4 bytes, so the 200-byte element stride *is*
the code's `0x19 × 8`. Step 2 uses the identical base and stride with the literal `0x8A75C`, so

```
0x8A75C - 0x8A724 = 0x38 = ha * 4   ->   ha = 14 = HACharmed
```

(`SharedConstants.pas:911`). `MaxMaxherotypes = 85` also matches the site's own bounds check
exactly, and the unit field it indexes with is `herotype`, a `smallint` at record +0x6B0 —
placed by counting `unitT` and independently corroborated by the two fields just after it that
this document already relies on, `confusioneffect` +0x6B3 and `attackpenal` +0x6C4.

So step 2 reads:

```
isroll and Units[u].ishero and Wizards[BaseUnits[u].owner].Hero[Units[u].herotype][HACharmed] > 0
    -> resistance := 100
```

Four things follow that a stat-sheet reading would miss:

- **It is gated on `isroll`.** Charmed changes roll outcomes only; it never raises the unit's
  displayed resistance, and no other caller of this routine sees it.
- **The 100 is a literal** (`mov dword ptr [Result], 0x64`), not a `MODDING.INI` global, so
  Warlord cannot retune it.
- **It is an assignment, and steps 4–6 still run afterwards**, so a Charmed hero with Bless or
  Resist Magic finishes above 100.
- **`owner` is read from `BaseUnits`, while `ishero` and `herotype` come from the current
  record.** Region `a` rewrites the *current* owner for Possession, Creature Binding and
  Confusion-2, so on this path a mind-controlled Charmed hero is still looked up under its
  original owner's hero table. The read is exact; that this preserves Charmed through possession
  is the evident consequence, but the ownership-transfer path has not been traced end to end.

**This resolves a manual/helptext conflict, in the helptext's favour.** `CoM2 helptext.TXT:2378`
and Warlord's `HELP.TXT:5460` both say "Charmed heroes never fail a resistance roll";
`../CoM2 manual.txt:1409` says "Hero has 50 resistance against all magical effects". The compiled
behaviour is the helptext's — a flat override to 100 on rolls only, with no 50 anywhere in the
block. The manual is wrong for this engine.

The calculator now models this as the second step of its effective-resistance sequence
(`EFFECTIVE_RESISTANCE_STEPS`), gated on a resistance roll and a hero carrying Charmed. The
assignment precedes Magic Immunity and the three conditional additions, matching this routine.
