# Warlord v1.5.12.6 scripts — superseded by the v1.5.12.6.2 hotfix

Only the five files the hotfix changed are kept; every other script is byte-identical to
`../Warlord 1.5.12.6.2/`. Nothing here is a source for current behaviour — do not read these
when verifying a mechanic.

**What v1.5.12.6.2 changed:**

| File | Change |
|---|---|
| `UnitCalcPre.CAS:1020` | Lucky Star stack scan tests `UOT` (the scanned friendly unit) instead of `U`. Fixes the aura. |
| `OverlandEndTurn.CAS:391` | Pneuma Reactor guard inverted to `<>2`, so the permanent-Bloodlust branch runs when the reform *is* researched. |
| `UnitCalc.CAS` | Apotheosis' No Healing removal moved after Shadow Strike, extended to item power 82, and written to index 0; the State-of-Rot branch no longer re-applies No Healing to an Apotheosis unit. |
| `EndofCombat.CAS` | The same rot / No Healing fix, hoisted above the survivor gate so it also runs for units that died. |
| `DisAbil.CAS:794` | Guardian Wind ability line points at help index 404 instead of 115. Display only. |

See `Reference docs/Source discrepancies.md` §9 and §10 for the two that closed register entries.
