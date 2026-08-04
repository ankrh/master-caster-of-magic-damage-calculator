# CoM2 / Warlord binary analysis — map and city

Combat-map eligibility, flying and attack flags, wall helpers, and wall-state mapping.

Addresses refer to the pinned `Caster.exe` build. See the [analysis index](./CoM2%20binary%20analysis.md) for binary identity, method, and the subsystem map.

Map-, node-, and city-dependent stat writes that execute inside `RecalculateUnits` remain with
their owning pipeline in [unit recalculation](./CoM2%20binary%20-%20unit%20recalculation.md),
especially *Region a*, *Hovering, aggregate flags, node defense and weapon material*, and *The
aura pass*.

## Attack flags, flying eligibility and wall helpers (R5.2h, resolved 2026-08-02)

The durable source-shaped reconstruction is `Combat.AttackAndWallHelpers.pas`; encoded branch,
call and write evidence plus ten contiguous ledgers are in
`Combat.AttackAndWallHelpers.R5.2h.evidence.md`.

`@Combat@mergeflags` merges the five Boolean-only flags first — Doom, Illusion, Supernatural,
Armor Piercing and Mystic Surge — then the valued riders in the executable's own order: Life
Steal, Death Touch, Poison, Destruction, Stoning Touch and Exorcise. A new rider copies its
value. When both sources carry the rider, Life Steal, Death Touch, Destruction, Stoning Touch and
Exorcise keep `Min(existing, incoming)`, while **Poison adds the two values**
(`$005B168A..$005B17FA`). This is the exact combination rule behind the merged `AttackFlagsT`
snapshot consumed by `ApplyAttack`.

`@Units@Ismissileranged` is table-driven. Nonpositive IDs return false; a positive ID reads the
`IsMissile` byte at `+$0C` of the 16-byte `RangedType.INI` entry through `$0070A144`, subject to
the compiled 1..100 bound (`$00596440..$0059648C`). The adjacent magical classifier reads
`+$0D`, confirming the two field identities. Shipped CoM2 marks IDs 20 and 21; Warlord also marks
22, so no hard-coded bow/sling ID predicate is faithful to both data sets.

`@Units@canattackflier` returns true for positive Thrown, Fire Breath or Lightning Breath;
Flying; present Stoning or Death Gaze; or nonzero Doom Gaze, in that short-circuit order
(`$005953D8..$00595544`). Stoning and Death Gaze use 100 as the absent sentinel. It deliberately
does not test ordinary ranged: `ApplyAttack` calls this helper only from the flying-defender
melee gate, after ranged has already been dispatched separately.

The wall helpers resolve four separate questions:

- `CrushWall(u)` requires calculated `wallcrusher` and rejects a unit whose calculated owner is
  the combat defender owner (`$005B32BC..$005B3338`).
- The unnamed coordinate overload returns true exactly for `x in 6..9` and `y in 10..13`,
  inclusive; `Insidewalls(u)` passes **base-record** combat coordinates
  (`$005B3ECC..$005B3F5C`).
- `HasWallOfFire` and `HasWall` find the city at the combat plane/x/y and test, respectively,
  `City.Enchantments[CEWallOfFire] >= 0` and `City.Buildings[BCityWalls] >= 1`
  (`$005B403C..$005B411C`).
- `GetWallState` maps coordinates to one of twelve combat wall slots through `ctws`, returning
  zero for no slot. `destroywall` changes only intact state 1 to broken state 2; it leaves every
  other state unchanged (`$005BB738..$005BB785`, `$005BB7D0..$005BB7FE`).

The CoM2 helptext and manual agree with the externally visible wall results: Wall of Fire fires
on units moving or attacking through it, and destroyed City Walls reduce the Defense bonus from
+3 to +1. Neither prose source specifies the exact rectangle, record layer, city-array sentinel,
or state transition, so no prose discrepancy is opened.

Verified: Codex 2026-08-02, single-agent cold derivation followed by a raw-byte self-review and
user-directed integration. Claude reviewed the full extent against the binary on 2026-08-03;
Codex then corrected the one semantic-label defect it identified, which spanned three `mergeflags`
rider labels. The other nine extents required no change.

## Combat wall slot mapping and mutation (R5.2l, resolved 2026-08-02)

The complete source-shaped `@Combat@ctws` and `@Combat@SetWallState` bodies are integrated in
`Combat.AttackAndWallHelpers.pas`; encoded branch, call, write and checked-index evidence plus
their two contiguous ledgers are in `Combat.WallStateMapping.R5.2l.evidence.md`.

`ctws` maps exactly the twelve perimeter coordinates of the inclusive `x=6..9`, `y=10..13`
wall rectangle to slots 1 through 12 and returns zero for every other coordinate
(`$005BB0D0..$005BB1CC`). The executable order is `(9,13)..(9,10)`, then
`(8,10)..(6,10)`, then `(6,11)..(6,13)`, then `(7,13)..(8,13)`. The tests are twelve
independent `if` blocks, although their unique coordinate pairs make the result equivalent to a
single lookup.

`SetWallState` calls that mapper once and writes its `ws` argument only when the returned slot is
positive (`$005BB788..$005BB7CE`); it neither validates nor translates the state value. The
1-based `1..12` range check restores `w` before `[state + w*4 + $44EC]`, so the encoded
`+$44EC` is lower-bound-biased: physical elements span `+$44F0..+$451C`. `GetWallState`
uses the identical expression, closing the lookup/write symmetry behind `destroywall`'s state
1-to-2 transition. This internal mapping does not create a calculator defect or a source
discrepancy: the calculator accepts the contextual wall bonus directly, and neither prose source
specifies the slot numbering.

Verified: Codex 2026-08-02, user-directed single-agent cold derivation followed by a distinct
fresh-byte self-review. The review corrected the array-offset description and removed unsupported
screen-direction wording; no Claude input was read or used during derivation. Claude reviewed both
extents against the binary on 2026-08-03 (R5.C) and found no semantic misreading.
