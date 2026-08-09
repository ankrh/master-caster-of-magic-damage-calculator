# CoM2 / Warlord binary analysis — direct spells

Combat summoning, direct spell damage, Wall of Fire, post-processing, Amplified Damage, and
spell-specific routing.

Addresses refer to the pinned `Caster.exe` build. See the [analysis index](./CoM2%20binary%20analysis.md) for binary identity, method, and the subsystem map.

## Combat summoning and script handoff (R9-G1a-R2)

`@Spells@CombatSummonUnit` (`$005CBEE0..$005CC3E3`) is reconstructed completely in
[`Spells.CombatSummonUnit.pas`](./Spells.CombatSummonUnit.pas), with the merged ledger,
inventories and derivation provenance in
[`R9-G1a-R2.evidence.md`](./R9-G1a-R2.evidence.md).

The routine obtains the summoned template through `SpellIDToSummon(sp)`, creates it, sets the
base record's Combat Summoned and Fantastic flags, and assigns race from the spell record's Realm.
There is no hard-coded Construct Catapult or Call to Arms identity gate: CoM2's template-37 and
template-113 outcomes are supplied by those spells' `SPELLS.INI` rows, while Warlord's enabled
slots summon templates 158 and 211 instead. After an initial `RecalculateUnits`, the routine
copies calculated movement, ammunition and combat movement into selected base/current fields and
publishes the new unit through the combat-summoning globals.

Its only caster-specific branch tests nullary `UnitCaster`: a base unit type `$00AD` (Demon Lord)
rewrites the summon as `Lesser Demon`, zeroes current/base movement, enables base Life Steal, and
sets its value to `-2`. Both gate exits converge on `CallCombatSpellEffectScript(sp)`, so the
Warlord hook runs after all compiled creation writes and before the final `RecalculateUnits`.

## Direct spell damage and Wall of Fire (R5.2g)

`@Spells@DamageSpell` (`$005C10E8..$005C1954`) is the modern engine's conventional
direct-damage **record calculator**. `@Spells@ApplyDamageSpell`
(`$005C1974..$005C1C45`) wraps, adjusts and deals that record.
`@Spells@FirewallEffect` (`$005C1C48..$005C1CA5`) is the Wall of Fire entry point.
Complete source-shaped bodies for all three routines are in `Spells.DamageSpells.pas`;
branch bytes, calls, writes, ledgers and completion counts are in
`Spells.DamageSpells.R5.2g.evidence.md` and `Spells.ApplyDamageSpell.R5.2j.evidence.md`.

The routine first takes `stroverride` when nonzero, otherwise `SpellTable[sp].Attack`. An active
**Chaos Conjunction** (runtime-data displacement `$0AF90AE0`) multiplies the strength of exactly
these eleven IDs by the embedded extended-real `1.34`, then calls Delphi `Trunc`:

```
Fairy Dust 7       Ice Bolt 13       AEther Sparks 42   Psionic Blast 50
Fire Bolt 83       Lightning Bolt 91 Fireball 96        Immolation 99
Doom Bolt 104      Star Fires 122    Reaper Slash 177
```

The set lookup has an explicit unsigned `sp <= 183` guard. Warp Lightning (101) is not in the
set; under the same event it instead receives `+2`. Wall of Fire (87) receives neither bonus.
This is the compiled meaning behind the manual's “33% more damage”: the operand is exactly 1.34
and the conversion truncates.

The rest of the flow is:

1. Copy Illusion, Doom, Piercing and Lightning from the spell record. Piercing sets Armor
   Piercing; Lightning then **overwrites** that flag with `not Units[u].lightningresist`, so a
   Lightning spell carrying both tags loses piercing against Lightning Resist.
2. Magic Immunity exits immediately with the already-zero `damageT` unless the spell carries
   `Nonmagic`. This happens before Black Sleep and is stronger than the later defense-100 path.
3. Choose one attack normally, one per current living target figure for `Area`, or `str` attacks
   for Warp Lightning. Warp Lightning lowers `str` by one after every iteration, so its rolls use
   the descending strengths `str, str-1, ... 1`.
4. Call `EffectiveDefense(u, flags, True, 0, sp, False, False, False, False, True,
   not Nonmagic)`. Spell damage therefore gets no City Walls extra defense, is marked ranged and
   magical, and supplies its positive spell ID for realm/tag checks. Cold, Fire, Missile, Poison,
   Death, Stoning and Corporeal tags then separately replace Defense with 100 against the matching
   immunity/non-corporeal state. These assignments are redundant for some tags already handled by
   `EffectiveDefense`, but the order and writes are real.
5. Black Sleep sets the local Doom flag. Doom skips every attack/defense roll and returns
   `str * nofattacks`; Magic Immunity's earlier exit still wins. Ordinary iterations roll
   `AttackRoll(str, hitchance) - DefenseRoll(def, defendchance)`, subtract Invulnerability and
   clamp at zero.
6. `Area` caps each iteration at a **full** `HpPerFigure(u)` and adds it to one aggregate total.
   It reads `TopFigureDamage` earlier but never uses that value in the area branch. A wounded top
   figure therefore does not lower the first subattack cap; when the aggregate is dealt, the
   excess effectively reaches later figures.
7. Non-area damage enters a pre-tested boundary loop at `$005C1850`: while the current remainder
   plus `TopFigureDamage` exceeds HP per figure, the routine books the current figure's remaining
   HP, subtracts that amount from the remainder, rolls fresh Defense and Invulnerability against
   it, clamps it, and repeats through the back edge `$005C1867 -> $005C1785`. The first iteration
   uses the wounded top figure; `$005C184B` then clears `TopFigureDamage`, so every later iteration
   books a full figure. When the remainder fits, `$005C186D..$005C188C` adds it and exits the loop.
8. Route the final total exclusively to `damageT.irrec`, `.undead` or `.normal`, in that priority,
   from the spell's two category flags.

`FirewallEffect` does nothing when `HasTeleMerge(u)` is true or the calculated unit is Flying.
R5.2k proves that `HasTeleMerge` is exactly calculated `Units[u].teleporting` or calculated
`Units[u].merging`, with Teleporting short-circuiting the second read, so either state exits before
`ApplyDamageSpell`. The calculator's `wallOfFireActive` gate currently tests only the global
toggle and melee mode and defines no Merging ability; that discrepancy is F40. Otherwise the
engine calls `ApplyDamageSpell(u, 87, SpellTable[87].Attack)`. CoM2's `Area=True` therefore
uses step 6 once per living figure. Warlord's deliberate removal of `Area` sends Wall of Fire
through step 7 instead; it is not a one-figure area roll.

Five calculator mismatches inside the two scoped R5.2g extents are tracked as F35–F39: the
wounded-top area cap, Warlord Wall of Fire's non-area spill shape, Magic Immunity's direct-spell
short circuit, Black Sleep's Doom conversion for spell damage, and Chaos Conjunction's
Immolation scaling. R5.2j subsequently completed the wrapper post-processing described below.
The additional `HasTeleMerge` caller/callee mismatch is tracked separately as F40.
No calculator implementation was changed by either derivation or by this reconstruction correction.

Verified: Codex 2026-08-02, cold derivation plus separate raw-byte self-review. The user directed
single-agent integration. Claude's 2026-08-03 R5.C review initially found no semantic misreading;
Codex's reciprocal review then found the non-area spill back edge had been cited but flattened.
Claude re-read the cited bytes and confirmed the repeated loop. Codex corrected the source and
downstream descriptions on 2026-08-03; AKH accepted the existing whole-routine coverage ledger
unchanged.

## ApplyDamageSpell post-processing and AmplifiedDamage (R5.2j, R5.2m)

`ApplyDamageSpell(u, sp, ov)` first obtains `dam := DamageSpell(u, sp, ov)`, then calls
`AmplifiedDamage(u, sp)`. R5.2m reconstructs that predicate at `$005BEB28..$005BEC6F` in
[`Combat.AmplifiedDamage.pas`](./Combat.AmplifiedDamage.pas), with bytes and ledger in
[`Combat.AmplifiedDamage.R5.2m.evidence.md`](./Combat.AmplifiedDamage.R5.2m.evidence.md).

`AmplifiedDamage` returns false outside combat. In combat it scans the saved inclusive bound
`i = 1..Maxunits` and returns true exactly when at least one index satisfies all four tests:

```text
not BaseUnits[i].dead
and BaseUnits[i].incombat
and Units[i].amplifier
and Units[i].owner <> Units[u].owner
```

The base/current split is literal: life and combat presence come from `BaseUnits`, while
Amplifier and both owners come from calculated `Units`. The routine does not stop after a match,
but its Boolean is never cleared, so multiple copies do not stack. It receives no caster
argument, and although TD32 names its second argument `sp`, the extent homes that argument and
never reads it. Thus the executable's damage-side meaning of “friendly spell” is solely that the
qualifying Amplifier unit's owner differs from the damaged unit's owner; there is no spell-ID
restriction in this predicate.

When the predicate is true, `ApplyDamageSpell` adds exactly one point to the first positive
category in this priority: `dam.normal`, then `dam.irrec`, then `dam.undead`. The tests are
mutually exclusive and a wholly zero record remains zero. The wrapper passes the result to
`Dealdamage(u, normal, undead, True, irrec)` before any spell-specific state change.

Two spell IDs then have compiled side effects:

- **AEther Sparks (42)** always replaces persistent `BaseUnits[u].mp` with signed `div 2`. It
  also replaces persistent `ammo` with signed `div 2` when either the base ranged type or the
  current calculated ranged type is magical. Testing both is the executable form of the fix that
  lets a spell-granted magical ranged attack qualify.
- **Ice Bolt (13)** sets persistent combat enchantment 61, Frozen, unless the calculated unit has
  Cold Immunity, Noncorporeal or Immolation. There is no damage-positive test. The write happens
  after dealing the spell record, even if that damage has already marked the unit dead.

Finally, when the unit is dead and combat is not active, the wrapper calls
`UnitDies(u, False, Units[u].owner)`. This is post-resolution world-state cleanup: the dead state
already exists, and this routine reads nothing afterward. Wall of Fire (87) triggers neither
spell-specific block; it receives only the general `DamageSpell` → optional amplification →
`Dealdamage` path.

The shipped CoM2 and Warlord spell tables both bind IDs 13 and 42 to Ice Bolt and AEther Sparks.
CoM2 help/manual agree on all three Frozen exclusions and on halving magical ammo/mana. Warlord
help states the same side effects; its manual changes Ice Bolt's strength, hit chance and cost
without contradicting them. No prose discrepancy was found. Mana, ammunition, Frozen's later-turn
action denial and off-combat roster cleanup remain outside the calculator's single-engagement
damage output. Amplifier's direct-damage adjustment is now fully supported by R5.2m evidence;
its calculator implementation remains part of F36 rather than this reconstruction merge.

Verified: Codex 2026-08-02, cold single-agent derivation plus separate raw-byte self-review. The
user directed single-agent integration. Claude reviewed the full R5.2j extent against the binary
on 2026-08-03 (R5.C) and found no semantic misreading. The evidence ledger has seven contiguous rows,
all six zero counts, 13/13 semantic conditionals, 7/7 calls and 3/3 verifier-classified
named-field writes accounted for.

Verified for `AmplifiedDamage`: Codex 2026-08-02, cold derivation plus a separate fresh raw-byte
self-review, under the user's single-agent/no-Claude direction. Claude reviewed the extent against
the binary on 2026-08-03 (R5.C) and found no semantic misreading. The R5.2m evidence has two
contiguous ledger rows, all six zero counts, 7/7 semantic conditionals, 1/1 semantic call and
0/0 verifier-classified named-field writes accounted for.
