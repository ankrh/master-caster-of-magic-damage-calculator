# Touch-effect trigger matrix — CoM2 vs Warlord

Which per-hit / touch effects fire on which attack phase, per game version.

Sources: `CoM2 manual.txt`, `CoM2 spells helptext.txt`, `Warlord manual.txt`
(Venom @ 2326, Shadow Strike @ 3046, Cockatrices @ 2338, Focus Magic @ 2492,
Revenant @ 3060, Rakhshasa @ 1260, Vampirism @ 3113).

Cells are: ✓ = fires, ✗ = does not fire.

## CoM2 (per the manuals)

In CoM2 and earlier, touch attacks are generic per-hit riders and fire on every
attack phase the unit performs. (Hero-item touch attacks have phase-specific
rules — bow/wand/staff touches fire on ranged only — but those aren't modeled
in this calculator.)

| Effect | Melee | Thrown | Breath | Ranged (physical) | Magical Ranged | Gaze |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Poison        | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Stoning Touch | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Death Touch   | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Life Steal    | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dispel Evil   | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bloodsucker   | — n/a in CoM2 — |

## Warlord (per the manuals)

Same as CoM2 except **Stoning Touch and Death Touch no longer fire on any
ranged attack** (physical or magical). This is the only primary-source-attested
CoM2→Warlord change to touch-dispatch behavior, per the Cockatrices entry
(@ 2338) and Focus Magic entry (@ 2496: "Stoning (and death) touch also no
longer can apply in ranged attacks").

| Effect | Melee | Thrown | Breath | Ranged (physical) | Magical Ranged | Gaze |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Poison        | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Stoning Touch | ✓ | ✓ | ✓ | **✗** | **✗** | ✓ |
| Death Touch   | ✓ | ✓ | ✓ | **✗** | **✗** | ✓ |
| Life Steal    | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Dispel Evil   | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bloodsucker   | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

**Bloodsucker mechanics** (Rakhshasa intro @ 1261, Manticore @ 1303, patch
note @ 4956): on each attack that deals damage, target takes **+2 extra
damage** and attacker **heals 2**. **Max 1 trigger per attack phase regardless
of attacker figure count.** A unit with both melee and thrown gets two
separate triggers (one per phase, each capped at 1). Carriers: Rakhshasa
Wildhunter / Jaguar Warriors / Blood Priests / Weretiger Mages / Rishi /
Ogre Lord / Manticore, Vampire Lord, and units enchanted with Vampirism.
Gaze-phase activation is unattested in primary sources but assumed by
analogy with the other touch effects.

Separate Warlord realm-theme change (not a touch-dispatch change):
**Death realm no longer associated with poison damage** (Warlord manual
@ 3001, @ 3023, @ 3070). Ghouls lose their poison; Reaper Slash reworked
from poison to cold. This changes which units carry Poison in the unit data,
not how Poison fires.

Source notes for CoM2:
- The CoM2 helptext entries for Poison, Stoning Touch, Death Touch, Life Steal,
  and the Thrown/Breath phases are delivery-mode agnostic — they describe
  touches as per-figure resistance rolls without restricting them to melee.
- The "all phases" reading is also the design intent per the project owner: in
  CoM2 and earlier, touch attacks are generic per-hit riders.
- Hero-item touch effects (Bow/Wand/Staff) are an exception — those are
  explicitly "ranged only" per the helptext at lines 3231-3241 — but the
  calculator does not model item-granted touches.
- Dispel Evil is a special case in the MoM Fandom write-up
  ([Dispel Evil (Ability).md:29](MoM source - Fandom site/Dispel Evil (Ability).md#L29)),
  which describes it as "Melee Touch Attack" that does not fire on thrown,
  breath, gaze, or first-strike. CoM2 inherits this in principle, but the only
  unit with Dispel Evil (the Angel) has no thrown/breath/ranged/gaze attack,
  so the distinction never comes up in practice in CoM2.

## Current calculator implementation (`combat.js`)

No version gating exists in the touch dispatch — these fire identically in
CoM2 and Warlord:

| Effect | Melee | Thrown / Breath | Ranged | Gaze |
|---|:---:|:---:|:---:|:---:|
| Poison        | ✓ | ✓ | ✓ | ✓ |
| Stoning Touch | ✓ | ✓ | ✓ | ✓ |
| Life Steal    | ✓ | ✓ | ✓ | ✓ |
| Dispel Evil   | ✓ | ✗ | ✗ | ✗ |
| Bloodsucker   | — not modeled — |
| Death Touch   | — not modeled as a distinct effect — |

## Divergences worth investigating

1. **Warlord ranged**: calculator fires Stoning Touch on ranged; Warlord manual explicitly removed this (Focus Magic + Cockatrices combo deliberately eliminated). Confirmed divergence.
2. **Bloodsucker**: not implemented at all (Rakhshasa racial / Vampire Lord / Vampirism enchantment, Warlord-only). Needs +2 damage / +2 heal per attack phase with damage, capped at 1 trigger per phase regardless of attacker figure count.
3. **Death Touch**: no distinct ability key — currently subsumed into Life Steal / Stoning Touch handling.
4. **Dispel Evil on non-melee phases**: calculator restricts Dispel Evil to melee, which matches the strict MoM Fandom definition. CoM2's "all phases" rule for touch attacks would arguably extend Dispel Evil to all phases too, but the only CoM2 unit with Dispel Evil (Angel) has no non-melee attacks, so this is academic.
