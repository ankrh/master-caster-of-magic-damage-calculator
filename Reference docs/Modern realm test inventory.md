# Modern realm test inventory

Every calculator site that reads a unit's realm in a CoM2 or Warlord chain, read against the block
it models. F224.1. Modern only: the DOS engines have no classifier helper and every DOS realm test
is `bu->race` (`unitcalc.c`), so no DOS spelling is in scope here.

Calculator line numbers are as of this file's writing; `Calculator/stats.js` is under concurrent
edit, so re-locate by the named binding rather than by line if the two disagree.

## The predicate

`Q31.evidence.md`:

```pascal
function IsChaosUnit(u): Boolean;  { $00594FE4 }
  Result := (Units[u].race = RCChaos) or (ChaosChannel(u) and Units[u].EnchantmentFlags[EncUndead]);
function IsDeathUnit(u): Boolean;  { $0059504C }
  Result := (Units[u].race = RCDeath) or (ChaosChannel(u) and Units[u].EnchantmentFlags[EncUndead]);
function ChaosChannel(u): Boolean; { $005950B4 }
  Result := EncCCArmor or EncCCFlight or EncCCBreath;
```

`race` is one scalar the recalculation ladder overwrites; the second arm recovers the `RCChaos` a
later Undead conversion destroyed. The two classifiers are **not** mutually exclusive: a
Chaos-Channelled undead unit answers True to both.

`@Units@IsChaosUnit` and `@Units@IsDeathUnit` have exactly eight call sites between them, all in
`@Units@RecalculateUnits` (`Q31.evidence.md:142-153`). Every other modern realm test — in the
binary, and in every Warlord `.CAS` hook — is a scalar compare. The eight are the whole helper-form
set; nothing outside them can need the recovery clause.

**Script check.** No Warlord `.CAS` hook re-implements or overwrites any of the eight blocks:
`UnitCalcPre.CAS` and `UnitCalc.CAS` contain no Chaos Surge, Blazing Eyes, Node Aura, Warp Reality,
Spell Ward or Darkness-Death block. Warlord's realm-reading blocks are separate additions
(`UnitCalcPre.CAS!NOTUPHILL!+7..+37 ": Effect of Fiery Fury conjunct with Darkness :" "!NOFIERYDARKNESS!", UnitCalcPre.CAS!NOBLOODANDIRON!+2..+14 ": now Eternal night implement poor vision curse directly on non-death creature and would be removed with when nolonger have eternal night :" "!NOETERNALNIGHT!"`, `UnitCalc.CAS!NOANGELICGUARDIAN!+2..+13 ": on the opposite, Night Goblin gain bonus from Darkness or Eternal Night :" "!NOTNIGHTGOBLIN!"`) and all spell the test
`GetStat(U,SRace,0)` or `,1`. So the eight rulings below hold for base CoM2 and Warlord alike.

## Helper form — must carry `ChaosChannel(u) and EncUndead`

| # | Consumer | Calculator site | Binary call | Block | Test |
|---|---|---|---|---|---|
| H1 | Chaos Surge | `Calculator/stats.js:609-611` | `$005A1274` | `$005A1271..$005A1664` | `IsChaosUnit(i)` |
| H2 | Blazing Eyes / Chaos Embrace | `Calculator/stats.js:358-359` | `$005A1E19` | `$005A1E16..$005A1F12` | `IsChaosUnit(i)` |
| H3 | Eternal Night, enemy Resistance | `Calculator/stats.js:650-651` | `$005A22D9` | `$005A228C..$005A238A` | `not IsDeathUnit(i)` |
| H4 | Node Aura, **Chaos arm only** | `Calculator/stats.js:546-550` | `$005A272B` | `$005A25F0..$005A273C` | `case 3: IsChaosUnit(i)` |
| H5 | Warp Reality exemption | `Calculator/stats.js:1165`, consumed at `Calculator/stats_sequence.js:1339` | `$005A3E94` | `$005A3E33..$005A3ED0` | `not IsChaosUnit(i)` |
| H6 | Darkness, **Death arm only** (and the CoM2 Eternal Night doubling) | `Calculator/stats.js:646-651`, `:684-692` | `$005A45EF` | `$005A4183..$005A4938` | `IsDeathUnit(i)` |
| H7 | Spell Ward, **Death arm** | `Calculator/stats.js:586-588` | `$005A5E0F` | `$005A5D36..$005A607F` | `IsDeathUnit(i)` |
| H8 | Spell Ward, **Chaos arm** | `Calculator/stats.js:586-588` | `$005A5E51` | `$005A5D36..$005A607F` | `IsChaosUnit(i)` |

Two of the eight additionally require Fantastic in the calculator, which no block tests: H2 and H5
read `unitTypeAt(u) === 'fantastic_chaos'`, the compact token, which is race **and** Fantastic. That
is the F195 defect in a second place, independent of the recovery clause. H1 already reads the realm
alone and is short only the recovery arm.

H3 is scoped `isCoMVersion` in the calculator, so it also covers CoM 1. CoM 1's block is
`bu->race` (`unitcalc.c`), so only the `com2_*` half takes the helper form; the CoM 1 half keeps the
scalar.

## Scalar form — the block compares `U.race`; these must NOT gain the recovery clause

| # | Consumer | Calculator site | Block / script | Test |
|---|---|---|---|---|
| S1 | Node Aura, Nature arm | `Calculator/stats.js:546-550` | call `$005A26E9`, block `$005A25F0..$005A273C` | `case 1: U.race = 16` |
| S2 | Node Aura, Sorcery arm | `Calculator/stats.js:546-550` | call `$005A2721`, same block | `case 2: U.race = 17` |
| S3 | Darkness, Life arm | `Calculator/stats.js:684-692` | `$005A4183..$005A4938` (`Units.RecalculateUnits.pas:2175`) | `U.race = 19` |
| S4 | Spell Ward, Nature arm | `Calculator/stats.js:586-588` | `cmp race,$10` `$005A5D68` | `U.race = 16` |
| S5 | Spell Ward, Life arm | `Calculator/stats.js:586-588` | `cmp race,$13` `$005A5DCC` | `U.race = 19` |
| S6 | Spell Ward, Sorcery arm | `Calculator/stats.js:586-588` | `cmp race,$11` `$005A5EB0` | `U.race = 17` |
| S7 | Supreme Light | `Calculator/combat_abilities.js:301-305` (modern branch), called at `Calculator/stats.js:1788-1790` | `$005A6FDF..$005A744B` (`Units.RecalculateUnits.pas:2623`) | `U.race = RCLife` |
| S8 | True Light (Warlord) | `Calculator/stats.js:713-717` | `UnitCalcPre.CAS!NOUPLIFTSPEECH!+7 "IF ( (GetStat(U,SRace,0)=RCDeath)", UnitCalcPre.CAS!NOUPLIFTSPEECH!+19 "IF (GetStat(U,SRace,0)=RCLife)"` | `GetStat(U,SRace,0)`, plus its own explicit `EncUndead` term |
| S9 | Eternal Night "Poor Vision" (Warlord) | `Calculator/stats.js:680-682` | `UnitCalcPre.CAS!NOBLOODANDIRON!+7..+9 "%AND (GetStat(U,SRace,0)<>RCDeath)" "THEN {"` | `GetStat(U,SRace,0)<>RCDeath`, plus its own explicit `EncUndead` term |
| S10 | Angelic Guardians (Warlord) | `Calculator/combat_effects.js:332-333` | `UnitCalc.CAS!NOTZEAL!+16..+20 "IF ( (GETSTAT(U,SRace,0)=RCLife) %OR (BASEFANTASTIC(U)=0) ) THEN {" "SETSTAT(U,AFExorcise,0,(GetStat(U,AFExorcise,0,1))-( 2 + (GETSTAT(U,SRace,0)=RCLife) ),1);"` | `GETSTAT(U,SRace,0)=RCLife` |
| S11 | `CanHealNaturally`'s realm arm | `Calculator/engine.js:336,355` (`state.raceNoHeal`) | `$005ECB8B..$005ECBB9` (`Combat.CallClosureHelpers.pas:112`) | `Units[u].race = RCNoHeal` |

S8 and S9 are the instructive pair: where the script author wanted the flag as well as the realm,
the script says so in its own text, and the calculator already carries both terms. That is what the
recovery clause is for in the binary, and it is why a scalar-compare block must not silently acquire
one.

## Third form — the calculator reads a realm the block does not test

| # | Consumer | Calculator site | Block | What the block tests |
|---|---|---|---|---|
| X1 | Exorcise / Dispel Evil, the created-undead extra penalty | `Calculator/combat_special_attacks.js:110-113` (`isCreatedUndeadTarget`), used at `:120,174` | modern: `$005B2A85` (`Combat.ApplyAttack.pas:482-484`); CoM 1: `com1:0x99FB7`; MoM: `131:0x99FA9` | modern `Units[du].EnchantmentFlags[EncUndead]` alone; all three DOS builds `mutations & 0x20` alone |

Neither the modern block nor any DOS block puts a realm term on this clause. The calculator's
`defUnitType === 'fantastic_death'` is an added restriction in every version. Out of scope for
F224.2 — it is not one of the eight, and it needs no recovery clause; recorded so the sweep is not
repeated.

## Findings the sweep turned up that are not part of the collapse

1. **S7 reads the compact token, not the realm.** `supremeLightActiveForUnit` tests
   `unitType === 'fantastic_life' || unitType === 'normal_life'`, but
   `legacyUnitTypeFromLiveIdentity` returns `'hero'` for any non-Fantastic hero regardless of race
   (`Calculator/stats_identity.js:166-174`). A Life-race hero — Torin, a Sanctified hero —
   therefore fails the calculator's gate where `U.race = RCLife` passes. Same shape as the F195
   defect, but in a scalar-form consumer, so F224.2's membership reader does not fix it.
2. **S11 has no producer.** `raceNoHeal` is defaulted at `Calculator/engine.js:336`, propagated at
   `Calculator/combat_phases.js:354` and read at `Calculator/engine.js:355,406`, but nothing in the
   repository assigns it a value: `deriveUnitStats` publishes no such field. `noHealing`
   (`Calculator/stats.js:2650-2653`, `Calculator/combat_phases.js:317-321`) already covers Undead,
   Animate Dead and Mystic Surge, so the one case the dead realm arm loses is **Raise Dead**, whose
   `c:raiseDead` step writes race `No Heal` (`Calculator/stats_identity.js:398-401`) and which no
   `noHealing` term names.
3. **Unmodelled modern realm tests.** Warlord's realm-mastery bonuses
   (`UnitCalcPre.CAS!NOGOBLINPOX!+5..+9 "IF ( (SPELLSTATE(W,SGaiaMastery)=2) %AND (GETSTAT(U,SRace,0)=RCNature) )" "%OR ( (SPELLSTATE(W,SDeathMastery)=2) %AND ( (GETSTAT(U,SRace,0)=RCDeath) %OR (GetEnchantmentFlag(U,EncUndead,0)>0) %OR (GetEnchantmentFlag(U,EncRevenant,0)>0) %OR (GetEnchantmentFlag(U,EncVampirism,0)>0) ) )"`, `UnitCalc.CAS!NOTMECHANICWITHHERO!+2..+54 "IF (GetStat(U,SRace,0)<RCArcane) %OR (GetStat(U,SRace,0)>RCDeath) THEN { GOTO" "IF (GetStat(U,SRace,0)<>RCDeath) THEN { GOTO"`), Ice Age (`UnitCalc.CAS!NOTHEAVY!+4 "IF (GetStat(U,SRace,0)=RCNature) %AND ( HASGLOBAL(W,GEIceAge) > 0 ) THEN {"`), the
   Fiery-Fury-with-Darkness block (`UnitCalcPre.CAS!NOTUPHILL!+7..+36 ": Effect of Fiery Fury conjunct with Darkness :"`, which reads `GetStat(U,SRace,1)`,
   the **base** record) and the late Sanctify race re-write (`UnitCalc.CAS!NOOLFOCUSMAGIC!+2..+7 ": Modify Sanctify :" "IF (GETSTAT(U,SCustomAttribute,1)<>2) THEN { GOTO"`, a region-`d`
   `SETSTAT(U,SRace,0,RCLife)` behind an idempotent race compare) have no calculator consumer.
   Listed so a later sweep does not re-discover them as gaps in this table. The Sanctify one is the
   consequential one: in Warlord it would undo any region-`c` conversion on a Sanctified unit, and
   the calculator models only the region-`b` `b:sanctify` write.
4. **`UnitCalcPre.CAS!NOGOBLINPOX!+8 "%OR ( (SPELLSTATE(W,SChaosMastery)=2) %AND ( (GETSTAT(U,SRace,0)=RCChaos) %OR (GetEnchantmentFlag(U,EncCCBreath,0)>0) %OR (GetEnchantmentFlag(U,EncCCFlight,0)>0) %OR (GetEnchantmentFlag(U,EncCCArmor,0)>0) %OR ( (GetEnchantmentFlag(U,EncFieryFury,0)>0) %AND FANTASTIC(U) ) ) )"` writes its own Chaos-membership clause, and it is a different
   predicate** from `IsChaosUnit`: `RCChaos %OR EncCCBreath %OR EncCCFlight %OR EncCCArmor %OR
   (EncFieryFury %AND FANTASTIC)` — a disjunction with no `EncUndead` conjunct. Do not reuse the
   binary helper's shape for it if the Mastery block is ever modelled.

## Measured reproduction

`com2_1.05.11`, custom unit def 6 / res 9, abilities `ccDefense` + `undead`. The Chaos Channels
armor step writes race Chaos, `c:undead` overwrites it with Death
(`Calculator/stats_identity.js:373-378, 393-396`), so `unitRealmAt` says `death` alone while the
binary's `IsChaosUnit` is True through `ChaosChannel and EncUndead`.

| Configuration | Calculator | Binary |
|---|---|---|
| `spellWard:'chaos'` | inert — def 9, res 9 | ward fires (H8) |
| `spellWard:'death'` | fires — def 6, res 6 | ward fires (H7) |
| `nodeAura:'chaos'` | inert — atk 5, def 9, res 9 | aura applies (H4) |
| `chaosSurge:1` | inert — atk 5, res 9 | surge applies (H1) |

Same unit without `undead` (race stays Chaos): all three fire. The reproduction named in F224
holds, and it is not confined to Spell Ward.

**This card does not discriminate for the Death-side reads** (H3, H6, and Spell Ward's Death arm H7):
`c:undead` has already written Death before those blocks fire, so the scalar already says `death`
and the recovery arm changes nothing. The two differ only after ladder block 8's `RCNoHeal`
overwrite (`$005A0472`), so the discriminating card there is `ccDefense` + `undead` + `raiseDead`
(or `mysticSurge`). Found independently by F224.2b and F224.2c.
