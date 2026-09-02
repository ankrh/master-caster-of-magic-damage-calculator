# Source discrepancies — manual vs helptext vs script

Where the three Warlord sources disagree about a mechanic. Each entry quotes all three so the
conflict can be judged without re-deriving it.

**Scope is Warlord only.** A three-way comparison is impossible for MoM, CoM and CoM2, because
those versions ship their combat scripts as empty stubs and resolve mechanics inside
`Caster.exe` (see the root `CLAUDE.md`). Two-way conflicts in those versions and unresolved
mechanic questions are tracked as Q/X rows in `Calculator/BACKLOG.md`, *Open questions* and
*Blocked on people*; this file is
specifically the evidence register for *script-vs-prose* conflicts.

Sources cited:
- **Manual** — `Warlord manual v1.5.12.9.html`, by PDF-page anchor; verify visual details
  against `Warlord_Manual v1.5.12.9.pdf`.
- **Helptext** — `Unit rosters/Warlord mod unit data/HELP.TXT`, by entry (`#Spell X` / `#UA X`).
- **Script** — `Script source/Warlord 1.5.12.9/`, by `file:line`.

**The script wins on contested behaviour** — it is what executes. Two caveats:
`MASTER.CAS`'s trailing `:comments:` are *not* script, and have been wrong every time they were
checked here; and a script grant can still be overridden by engine-side behaviour that no `.CAS`
file shows.

| # | Mechanic | Outlier | Status |
|---|---|---|---|
| 1 | Explosive / Bombs&Grenades — Thrown strength | helptext `#UA BOMBS&GRENADES` | **closed in v1.5.12.6.2** (helptext corrected) |
| 2 | Explosive — grants Wall Crusher | manual *and* helptext both silent | **closed in v1.5.12.6.2** (helptext corrected) |
| 3 | Xenopsychology / Radio — scope | manual *and* helptext both understate | **closed in v1.5.12.6.2** (helptext corrected) |
| 4 | Magitek Engine — movement | helptext `#UA MAGITEK ENGINE` | resolved (script) |
| 5 | Wraiths — Sapiens | manual changelog | **closed in v1.5.12.6.2** (roster corrected) |
| 6 | Artificer retort — Resistance grant | helptext (stale by two revisions) | **closed in v1.5.12.6.2** (helptext corrected) |
| 7 | Flame Blade — boulder and thrown bonuses | manual's boulder wording | resolved (script/config) |
| 8 | Armorclad — +6 Armor | earlier script audit missed the base-stat writes | resolved (script) |
| 9 | Pneuma Reactor — permanent Undead Bloodlust | executable branch was reversed and misplaced | **closed in v1.5.12.6.2** (script fixed) |
| 10 | Lucky Star — friendly-unit aura | executable used the wrong loop variable | **closed in v1.5.12.6.2** (script fixed) |
| 11 | Alumni of Academy — Mechanical exclusion | helptext omits the restriction | resolved (script) |
| 12 | Magitek Science — Battle Armor eligibility | manual and helptext include Battle Armor | resolved (script) |
| 13 | Blaze of Glory — enchantment Armor survival | helptext says non-base Armor remains | resolved (script) |
| 14 | Stoning/Death Touch — magical-ranged delivery | manual and helptext state a blanket exclusion | resolved (script/dispatcher record placement) |
| 15 | Clockwork Tinmen — destroying mechanical units | manual, helptext *and* the calculator; the roster and the spell table disagree with all three | resolved (roster/spell table) |
| 16 | Ballistics Training — Ranged To-Hit amount | manual (stale since v1.5.12.8) | resolved (script/helptext) |

The table's `Status` column records the durable **source-resolution outcome**, not project work
state. Any calculator or documentation follow-up is tracked only in `Calculator/BACKLOG.md`.

Seven entries were closed by the **v1.5.12.6.2 hotfix**, which the maintainer released in response
to this register. The calculator needed no correction for §1, §2, §3, §6 or §9 — it had followed
the script throughout, and the prose caught up. §5 and §10 did change behaviour. Each entry below
keeps its original evidence and records the fix at the end. The pre-hotfix files are no longer
vendored — only the current Warlord build is kept — so recover them from git history if a
pre-hotfix line has to be re-read.

---

## 1. Explosive / Bombs&Grenades — Thrown strength

- **Manual** p64: *"gain Thrown ability at strength equal to 8 - (maximum figures/2) round down"*
- **Helptext** `#Spell EXPLOSIVE`: *"at strength equal to 8-(maximum figures/2) round down"*
- **Helptext** `#UA BOMBS&GRENADES`: *"Thrown strength equal to 11 subtracts by number of figures
  of unit at full health"*
- **Script** `UnitCalcPre.CAS!NOMAGITEKENGINE!+11 "SETSTAT(U,SThrown,0,( GETSTAT(U,SThrown,0)+%I( 8 - (GETSTAT(U,SFigures,1)/2) ) );"`:
  `SETSTAT(U,SThrown,0,( GETSTAT(U,SThrown,0)+%I( 8 - (GETSTAT(U,SFigures,1)/2) ) );`
- **`MASTER.CAS~"STExplosive = 386;"` comment**: *"get Thrown equal 10-max figure"* — a third number.

**Closed in v1.5.12.6.2:** the maintainer confirmed the manual is correct, the script agrees
with it, and the hotfix rewrote `#UA BOMBS&GRENADES` to `"Thrown strength equal to
8-(maximum figures/2) round down"`. The `MASTER.CAS` comment is still wrong. The two formulas
coincide only at 6 figures (both 5) and diverge elsewhere (4 figures: 6 vs 7; 1 figure: 7 vs 10).

Bombs&Grenades has no code of its own — `DisAbil.CAS!NOTCOUNTGOBLIN!+122..+127 "IF (SPELLSTATE(W,STExplosive)=2) THEN {" "}"` only *displays* the label when
Explosive is researched. It is the same grant, not a second one.

**Additionally, and stated by no prose source:** the grant is **additive** (`SThrown + …`), so a
unit that already has Thrown stacks it rather than replacing it. `SFigures` is confirmed maximum,
not current, by `MASTER.CAS~"SFigures=88;"`: *"The number of maximal - not current - figures in the unit"*.

## 2. Explosive — grants Wall Crusher

- **Manual** p64, full Explosive entry: no mention of Wall Crusher.
- **Helptext** `#Spell EXPLOSIVE`: no mention.
- **Script** `UnitCalcPre.CAS!NOMAGITEKENGINE!+12 "SETSTAT(U,AWallCrusher,0,1);"`: `SETSTAT(U,AWallCrusher,0,1);` — in the same branch as the
  Thrown grant, so every unit that gains Thrown also gains Wall Crusher.
- **`MASTER.CAS~"STExplosive = 386;"` comment**: *"and wall crasher"* — the only prose trace anywhere.

The omission was specific to this reform: the manual documents Wall Crusher grants elsewhere
(p122 Blaze of Glory, p78 Breakthrough), so it read as a documentation gap rather than a
deliberate silence.

**Closed in v1.5.12.6.2:** both `#Spell EXPLOSIVE` and `#UA BOMBS&GRENADES` now name Wall
Crusher. The manual remains silent through v1.5.12.9.

## 3. Xenopsychology / Radio — scope excludes Sapiens summons in prose only

- **Manual** p63 Xenopsychology: *"In combat, all regular units own by the outlander gain
  +1 Resistance."*
- **Helptext** `#Spell XENOPSYCHOLOGY`: identical wording.
- **Manual** p63 Radio: *"In combat, all regular units under the outlander's control gain
  +10% To-Hit, +10% To-Defend, +1 Resistance."*
- **Helptext** `#Spell RADIO`: identical wording.
- **Script** `UnitCalcPre.CAS!NOMAGITEKENGINE!+2..+42 "IF (BASEFANTASTIC(U)>0)" "!NOTSAPIENS!"`: both effects sit inside a single gate

  ```
  IF (BASEFANTASTIC(U)>0)
   %AND (GETSTAT(U,SMultiLabel,1)<>14)
  THEN { GOTO "NOTSAPIENS"; }
  ```

  A fantastic unit tagged Sapiens (`Custom13=14`) passes, so Sapiens summons receive both.

**What made this more than a wording slip:** Explosive, Ballistics Training, Xenopsychology and
Radio all live inside that *one* gate — yet Ballistics Training was documented as covering Sapiens
summons in **both** manual (p64: *"all Regular units and Sapiens summons"*) and helptext, while
Xenopsychology and Radio were not. One gate, four reforms, inconsistent documentation of the same
condition. The code cannot treat them differently.

**Closed in v1.5.12.6.2:** both helptext entries now read *"all regular units and Sapiens
summons"*, matching Ballistics Training and the gate. The v1.5.12.9 manual still
uses the narrower regular-unit wording.

## 4. Magitek Engine — movement, and an ability that has no enchantment

- **Helptext** `#UA MAGITEK ENGINE`: *"+1 Overland Movement Speed and +3 Combat Movement Speed."*
- **Helptext** `#Spell MAGITEK ENGINEERING`: *"unit with Power Engine upgrade get additional
  +2 Movement Speed, +20% To-Defend, and Large Shield."*
- **`MASTER.CAS~"STMagitekPowerEngine = 395;"` comment**: *"power engine units movement increased by 2"*
- **Script** `UnitCalcPre.CAS`, `STMagitekPowerEngine` branch: `SOLMaxMoves +4`,
  `SCombatMaxMoves +4`, `SToDefend +20`, `ALargeShield = 1`.

`+4` raw is **+2 movement**, not +4: `MASTER.CAS~"SOLMaxMoves=21;"` states *"Movement is stored in units of
1/2"*, and Power Engine — helptext *"+1 Movement Speed"* — is implemented as `+2` to both
movement stats at `CreateUnit.CAS!HASEVILPRESENCE!+70 "SETSTAT(U,SOLMaxMoves,1,(GetStat(U,SOLMaxMoves,1)+2));"` and `CreateUnit.CAS!HASEVILPRESENCE!+72 "SETSTAT(U,SCombatMaxMoves,1,(GetStat(U,SCombatMaxMoves,1)+2));"`. So the reform gives **+2 overland / +2 combat**.

The `#UA MAGITEK ENGINE` figures match neither the script nor the reform's own helptext entry.

**Resolved in favour of the script:** Magitek Engineering adds +2 overland and +2 combat
movement to a Power Engine unit, plus +20% To-Defend and Large Shield. Movement is outside the
calculator's one-round damage model; its two combat-stat effects were already modelled.

**Separately:** no `EncMagitekEngine` identifier exists — `MASTER.CAS` contains only `ST*` reform
IDs for Magitek, no `Enc*`. The effect is keyed entirely on `EncPowerEngine`, so "Magitek Engine"
is a helptext entry for an ability that is not a distinct enchantment in the code.

## 5. Wraiths — Sapiens

- **Manual** p100 changelog: *"Wraiths gain Sapiens perk."* (one of 30 units named)
- **Helptext**, Wraiths entry: does not list Sapiens.
- **Roster** `UNITS.INI`: no `Custom13` on Wraiths `[170]`; 29 units carry `Custom13=14`.
- **Script**: `SMultiLabel` is written in 20 places with subIDs 1–13 and **never** 14, so Sapiens
  can only originate from `UNITS.INI`. No mechanism could grant it to Wraiths.

**Closed in v1.5.12.6.2:** the maintainer had confirmed Wraiths did not yet have Sapiens and
might gain it in a later release; the hotfix added `Custom13=14` to `[170]` Wraiths and, beyond
the changelog line, to `[171]` Shadow Demons. The roster now carries **31** Sapiens units and the
changelog is correct. `SMultiLabel` is still never written with 14, so `UNITS.INI` remains the
only source of the tag.

---

## 6. Artificer retort — Resistance grant to mechanical units

The **helptext is stale by two changelog revisions**; the script matches the manual exactly.
Reading the changelog partially inverts this entry, so the whole sequence is recorded.

The changelog is ordered newest-first. In chronological order:

| Version | Entry | Resistance |
|---|---|---|
| 1.4.16 | *"Artificer allows all mechanical units be recruited with magic weapons (without alchemist guild), +2 resistance…"* | +2 |
| 1.4.17 | *"Artificer's mechanical unit trait involves +1 resistance (from +2)"* | +1 |
| 1.4.22 | *"…all mechanical units also gain +1 attack, +1 armor and **+2 resistance**. (from +2,+0,+1)"* | **+2** |

So 1.4.17 reduced it and **1.4.22 restored it**, in the same entry that set attack to +1 (from
+2) and armor to +1 (from +0).

- **Script** `CreateUnit.CAS!NOLOGISTIC!+10..+13 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1));" "SETSTAT(U,SResist,1,(GetStat(U,SResist,1)+2));"`: `SAttack +1`, `SRanged +1`, `SDefense +1`, `SResist +2`.
  All four match 1.4.22 exactly.
- **Helptext** `#Retort Artificer`: *"All mechanical units trained by the wizard gain +1
  Melee/Range Attack, +1 Armor, **+1 Resistance**, +1 Movement Point, and magic weapons."*
  Attack, armor and movement were updated for 1.4.22; resistance was not. The v1.5.12.5
  helptext has the same error.
- **Script** `CreateUnit.CAS!NOLOGISTIC!+7 ": new effect of Artificer retort, mechanical units gain magic weapon, +1 resistance, and land mechanical units get +1 movement :"` — the block's own comment also still says *"+1 resistance"*,
  stale in the same way. As always, a comment is not script.

**Closed in v1.5.12.6.2 in favour of the script, with the manual agreeing.** Resistance is
**+2**, and the hotfix corrected both `#Retort Artificer` and `#UA ARTIFICER UPGRADE` to say so.
`CreateUnit.CAS!NOLOGISTIC!+7 ": new effect of Artificer retort, mechanical units gain magic weapon, +1 resistance, and land mechanical units get +1 movement :"`'s own comment is still stale. The write
is at index 1 (`ABase`), so it is baked into the unit's base permanently rather than recomputed.
`CreateUnit.CAS!NOLOGISTIC!+8 "IF RETORT(W,Artificer) %AND (GetStat(U,SCustomAttribute,1)=1) THEN {"` is the mod's only Artificer stat grant and no other `SCustomAttribute=1`
gate adjusts resistance, so nothing compensates elsewhere.

**Calculator:** applied. [combat_abilities.js](../Calculator/combat_abilities.js) `getAbilityStatSteps` grants
+2, and the `artificerMechanicalResistanceWarlord` preset pins the magnitude by damage
(`node_unit_checks.js` only pins Artificer's stage). The shipped helptext now agrees
(`#Retort Artificer` and `#UA ARTIFICER UPGRADE` both say +2), so the `artificer` tooltip states
the effect without noting a divergence.

### A separate oddity in the same block

`CreateUnit.CAS!NOLOGISTIC!+10 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1));"` reads index 0 and writes index 1, where the other lines read and write
index 1 throughout:

```
SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1));
```

Per `CAS reference/Scripts.TXT:266-271` and `:636-639`, index 0 is the unit's **current** stats
and index 1 its **base** — and `Typedec.pas:336` shows why they are independent:
`BaseUnits, Units : array[1..maxunitslots+1] of UnitT`, two parallel arrays of the same record,
so every unit carries a full base record and a full current record. Nothing guarantees they
agree at an arbitrary moment.

Here they should: `CreateUnit.CAS!NOLOGISTIC!+10 "SETSTAT(U,SAttack,1,(GetStat(U,SAttack,0)+1));"` is the first `SAttack` write in the file and no `SETSTAT` precedes it,
so current still holds the pristine roster value. The failure mode would also be loud — a wrong
base melee on every Artificer mechanical unit. Harmless as written, but fragile: any future
index-0 attack write inserted above it would silently bake itself into the unit's base.

---

## 7. Flame Blade — boulder and thrown bonuses

- **Manual** (Combat Engineer / Flame Blade change text): calls the ranged bonus *"+2 physical
  range/thrown"*, which would include boulder.
- **Helptext** `#Spell FLAME BLADE` and `#UA FLAME BLADE`: both specify **Missile** ranged and
  Thrown, not boulder. `#Spell FIERY FURY` separately names Rock Ranged Attack.
- **Script/config** `UnitCalc.CAS!NOTZEAL!+7..+10 ": Combat cast Flame Blade now nolonger buff rock type range attack but give fire breath+1 :" "}"`: the Warlord combat-cast branch states that Flame
  Blade no longer buffs rock ranged attacks and adds only `SFireBreath +1`. The engine-side
  bonuses exposed in `MODDING.INI:523-526` are `FlameBladeAttackBonus=3`,
  `FlameBladeThrownBonus=2`, and `FlameBladeMissileRangedBonus=2`; there is no boulder bonus.
  The only +2 write covering the rock band is Fiery Fury's `UnitCalcPre.CAS!NOTHERO!+12..+15 "IF (GetStat(U,SRangedType,0)>9) %AND (GetStat(U,SRangedType,0)<20) THEN {" "}"`.

**Resolved in favour of the script/config:** Warlord Flame Blade grants **+3 melee, +2 missile,
+2 thrown, and +1 fire breath; it does not grant boulder**. The manual's broad "physical range"
wording has conflated Flame Blade with Fiery Fury's separate boulder addition. The exposed
configuration also resolves the formerly missing thrown implementation: it is `2` in Warlord,
whereas base CoM2's `MODDING.INI:525` is `FlameBladeThrownBonus=0`.

**Calculator:** already matches this result. The Warlord Flame Blade and Fiery Blade presets pin
the no-boulder / thrown behavior, while Fiery Fury separately pins +2 boulder.

## 8. Armorclad — +6 Armor

- **Helptext** `#UA ARMORCLAD`: +6 Armor.
- **Script** `CreateUnit.CAS!HASEVILPRESENCE!+92..+93 "SETENCHANTMENTFLAG(U,EncArmorClad,ABase,1);" "SETSTAT(U,SDefense,1,(GetStat(U,SDefense,1)+6));"`: grants `EncArmorClad` and permanently writes
  `SDefense ABase +6` to newly created mechanical units.
- **Script** `OverlandEndTurn.CAS!NOPNEUMA!+7..+8 "SETENCHANTMENTFLAG(U,EncArmorClad,1,1);" "SETSTAT(U,SDefense,1,(GetStat(U,SDefense,1)+6));"` and `OverlandEndTurn.CAS!NOTENGINEADDED!+6..+7 "SETENCHANTMENTFLAG(U,EncArmorClad,1,1);" "SETSTAT(U,SDefense,1,(GetStat(U,SDefense,1)+6));"`: both upgrade paths make the same
  permanent +6 write when applying Armorclad to an existing unit.
- **`MASTER.CAS~"STArmorClad = 391;"` comment** additionally claims +6 Resistance, but no executable write
  supports that comment.

**Resolved in favour of the executable script and helptext:** Armorclad grants +6 base Armor
and no Resistance. The earlier audit found the enchantment flag but missed the adjacent stat write.

## 9. Pneuma Reactor — permanent Bloodlust branch did not execute for the reform

- **Manual** p64: *"All Undead units gain permanent Bloodlust at the end of Overland turn."*
- **Helptext** `#Spell PNEUMA REACTOR`: states the same.
- **Script** `OverlandEndTurn.CAS!SKIPCHAOSEMBRACE!+8..+17 "IF (SPELLSTATE(W,STObsolescenceRearmament)<>2) THEN { GOTO" "!NOPNEUMA!"`: the branch is nested after a guard that proceeds
  only when Obsolescence Rearmament is researched. Inside it, `OverlandEndTurn.CAS!SKIPCHAOSEMBRACE!+10 "IF (SPELLSTATE(W,STMagitekPneumaReactor)"` jumps to `NOPNEUMA`
  when Pneuma Reactor **is** researched:

  ```
  IF (SPELLSTATE(W,STMagitekPneumaReactor)=2) THEN { GOTO "NOPNEUMA"; }
  ```

As written, the grant could run only when Obsolescence Rearmament was active and Pneuma Reactor
was inactive — the reverse of both prose sources. The combat Pneuma Field branch in
`UnitCalc.CAS!COMBATOVERRIDE!+19..+25 "IF (SPELLSTATE(W,STMagitekPneumaReactor)=2) THEN {" "SETSTAT(U,AFLifeSteal,0,PNEUMA,1);"` is independent and always did execute when Pneuma Reactor is researched.

**Closed in v1.5.12.6.2:** the guard is now `<>2`, so the branch runs when the reform *is*
researched, as both prose sources describe. It remains nested under the Obsolescence Rearmament
guard, so Bloodlust still requires both reforms.

**Calculator:** unchanged, and still correct. The Pneuma Reactor condition derives Pneuma Field
but not Bloodlust — the grant is an overland end-of-turn effect, outside the one-round combat
model, and Bloodlust remains available through its ordinary enchantment control.

## 10. Lucky Star — intended friendly-unit aura only buffed the enchanted unit

- **Manual** p60: Lucky Star grants Lucky to its target and, while present, gives *"all
  friendly units"* +1 Attack, Armor, and Resistance; multiple copies do not stack.
- **Helptext** `#Spell LUCKY STAR`: states the same all-friendly-unit aura.
- **Script** `UnitCalcPre.CAS!NOOUTLANDER!+17..+50 ":COUNT UNIT STACK:" "NEXT N;", UnitCalcPre.CAS!NOTGUARDIAN!+2..+14 ": Effect of Lucky Star on other friendly units :" "!NOLUCKYSTAR!"` (pre-hotfix): the stack scan stored each
  candidate in `UOT`, but the test now at `UnitCalcPre.CAS!NOTOURHERO!+2 "EncLuckyStar,0)>0) THEN { LUCKYSTAR=LUCKYSTAR+1; }"` read `GETENCHANTMENTFLAG(U,EncLuckyStar,0)` instead. `U` is
  the unit currently being recalculated, not the scanned friendly unit:

  ```
  UOT=UNITONTILE(...,N);
  ...
  IF (GETENCHANTMENTFLAG(U,EncLuckyStar,0)>0) THEN {
   LUCKYSTAR=LUCKYSTAR+1;
  }
  ```

If the current unit had Lucky Star, every living friendly unit encountered in the loop
incremented `LUCKYSTAR`, after which the current unit received the +1 stats. If the current unit
did not have Lucky Star, `LUCKYSTAR` stayed zero even when another friendly unit was enchanted.
Multiple increments still collapse to the same boolean gate.

**Closed in v1.5.12.6.2:** `UnitCalcPre.CAS!NOTOURHERO!+2 "IF (GETENCHANTMENTFLAG(UOT,EncLuckyStar,0)>0) THEN { LUCKYSTAR=LUCKYSTAR+1; }"` now reads `GETENCHANTMENTFLAG(UOT,…)`, so the aura works as
both prose sources describe. The two effects are now cleanly separable, and this is the one
hotfix change that altered calculator behaviour:

- **Aura** (`UnitCalcPre.CAS!NOTGUARDIAN!+2..+14 ": Effect of Lucky Star on other friendly units :" "!NOLUCKYSTAR!"`) — +1 melee/ranged/Armor/Resistance to *every* friendly
  unit in the combat, the enchanted one included, non-stacking. The ranged stat is shared by
  ranged, thrown, and breath attacks.
- **Lucky** (`UnitCalcPre.CAS!NOTUPHILL!+3 "IF GETENCHANTMENTFLAG(U,EncLuckyStar,0) THEN {"`) — tested on `U`, so still only the enchanted unit.

**Calculator:** the `luckyStar` control is now the *aura* — set it when any friendly unit in the
combat is enchanted — and no longer implies Lucky. The enchanted unit gets Lucky from the
ordinary `lucky` ability control.

## 11. Alumni of Academy — Mechanical exclusion omitted from helptext

- **Manual** p100 changelog: the effect changes to +2 figures for *"non-mechanical Magic
  ranged units and Fantastic Stable units."*
- **Helptext** `#UA ALUMNI OF ACADEMY`: says magical-ranged or Fantastic Stable units gain
  +2 figures, without the Mechanical restriction.
- **Script** `CreateUnit.CAS!NOMOTHERFUNGUS!+2..+11 ": new effect of academy, non-mechanical Magical ranged attack units and fantastic stable get +2 figures :" "}"`: grants +2 figures to unit type 221 (Halfling Rocs), or
  to a unit with ranged strength, a magical ranged type, and `SCustomAttribute <> 1`.
  `MASTER.CAS~"SCustomAttribute=118;"` defines custom attribute 1 as Mechanical.

**Resolved in favour of the script, with the manual agreeing:** Academy grants +2 figures to
Halfling Rocs and to non-Mechanical Halfling magical-ranged units. Rocs are the explicit
Fantastic Stable branch; the building is Halfling-only.

## Resolved implementation note — shared Outlander soldier gate

`CAS reference/Scripts.TXT:54` states that operators have no priority and expressions are
evaluated left to right. The unparenthesized condition at `UnitCalc.CAS!COMBATOVERRIDE!+5..+7 "IF (GETENCHANTMENTFLAG(U,EncArmorClad,0)=0)" "NOTOUTLANDERSOLDIER"` therefore
rejects a unit when:

```
((EncArmorClad = 0) AND Mechanical) OR BaseFantastic
```

Energy Beam Weapons, Psycho Converter, and Pneuma Reactor consequently admit non-fantastic
non-Mechanical units, heroes, and Armorclad Mechanical units, while rejecting fantastic
units. The calculator uses that predicate for all three reform controls.

## Open questions, not yet discrepancies

- **Does "regular units" exclude heroes?** The gate in §3 rejects only base-fantastic units
  without Sapiens, so heroes pass and receive the reform bonuses. `UnitCalcPre.CAS` uses
  `ISHERO()` in five other places, so omitting it here looks deliberate — but if "regular units"
  is meant to exclude heroes, the code is wrong. Needs the maintainer.

## 12. Magitek Science — Battle Armor does not receive Resist Magic

- **Manual** p75 and **helptext** `#Spell MAGITEK SCIENCE`: Armorclad *or Battle Armor* units
  gain Resist Magic.
- **Script, newly created Armorclad:** `CreateUnit.CAS!HASEVILPRESENCE!+90..+96 ": effect of Armorclad, give armorclad unit enchantment :" "}"` writes `EncArmorClad`, +6
  Defense, and then `EncResistMagic` when Magitek Science is researched.
- **Script, existing Armorclad:** `OverlandEndTurn.CAS!NOMECHANICALUPGRADE!+2..+8 "IF (GETENCHANTMENTFLAG(U,EncArmorClad,1)=0) THEN { GOTO" "}"` requires `EncArmorClad` before
  writing `EncResistMagic`.
- **Script, Battle Armor:** `UnitCalcPre.CAS!NOTSAPIENS!+2..+14 "IF (BASEFANTASTIC(U)>0) THEN { GOTO" "!NOARMORCLAD!"` grants only +3 Defense. It neither
  checks Magitek Science nor writes Resist Magic, and these are the only script occurrences
  that implement the unit-side Magitek Science grant.

**Resolved in favour of the script:** only Armorclad gains Resist Magic. The calculator
previously followed the prose and granted it to Battle Armor too; that gate and its tooltip
have been corrected.

## 13. Blaze of Glory — all current Armor is transferred

- **Helptext** `#Spell BLAZE OF GLORY` says the unit loses all *base* Armor.
- **Helptext** `#UA BLAZE OF GLORY` is more explicit: Armor from other enchantments remains.
- **Script** `UnitCalc.CAS!IMMUNETOROT!+17..+21 "BLAZEMELEE=GetStat(U,SDefense,0);" "SETSTAT(U,SDefense,0,((GetStat(U,SDefense,0))-BLAZEMELEE));"` stores current Defense as `BLAZEMELEE`, adds that value
  to melee, then subtracts the same value from Defense. The result at that point is zero
  regardless of where the Armor came from.

**Resolved in favour of the script:** Blaze of Glory transfers all current Armor, including
enchantment-granted Armor, and then sets Defense to zero. Later region-`e` effects still run
and may add Defense afterward. The calculator's surviving-Armor reconstruction was removed
under **F8**.

## 14. Stoning/Death Touch — no blanket magical-ranged exclusion

- **Manual** v1.4.7 changelog: *"Death Touch and Stone Touch nolonger apply to magic range
  attack"*.
- **Helptext** `#UA STONING TOUCH` and `#UA DEATH TOUCH`: each says the ability does not apply
  to Magic Ranged attacks.
- **Script, Focus Magic** `UnitCalc.CAS!NOTRUST!+5..+16 ": Disable ranged touch ability when enchanted unit with focus magic :" "SETSTAT(U,AFDeathTouch,0,DEATHT,2);"`: saves an existing general Stoning/Death
  value, clears general and ranged, and writes the saved value to melee. This creates a
  spell-specific exclusion by record placement, not by attack type.
- **Script, Nature Marionette** `UnitCalcPre.CAS!NOVAMPIRISM!+26 "SETSTAT(U,SRangedType,0,37);", UnitCalcPre.CAS!ENDOFMARIONETTESPELLSELECT!+71 "SETSTAT(U,AFStoningTouch,0,-2,1);"`: creates magical ranged and writes
  Stoning Touch −2 to the general record. `UNITS.INI` likewise stores intrinsic touch carriers
  in the general record, including the physically ranged Great Gaia Lord (`[261]`) and Gambler
  (`[273]`).
- **Compiled dispatcher** `Caster.exe` `@Combat@ApplyAttack`: attack types 1–5 all run the
  Stoning/Death riders after merging general with the selected channel record; there is no
  physical-versus-magical ranged test.

**Resolved in favour of the executing script and dispatcher:** an innate/general touch reaches
both physical and magical ranged. Focus Magic moves an existing touch to melee/Thrown only.
Revenant independently writes Death Touch 0 to that same melee/Thrown record. The manual and
helptext overgeneralize the Focus Magic-style placement into a blanket magical-ranged rule.

## 15. Clockwork Tinmen — the destroy-mechanical ability is a disabled spell they do not carry

- **Manual** p. entry for the 1.5.12.0 summon: the unit *"ables to destroy any mechanical unit
  in single hit with its special ability"*.
- **Helptext** `#UA Clockwork Tinmen`: they carry *"mechanical critters that could be using for
  sabotage enemy's mechanical unit effectively in combat"*. `#Spell SABOTAGE` states the
  mechanic itself: *"Unit Ability - Instant Combat, Target: enemy unit … If the target unit is
  mechanical, the target is irrecoverably destroyed."*
- **Script** `COSpell.CAS!NOTFORDISRUPT!+6..+12 "IF (SP<>SDisruption) THEN { GOTO"`: the only implementation is a **combat-spell cast handler**.
  `IF (SP<>SDisruption) THEN { GOTO "NOTSABOTAGE"; }`, then
  `IF (GETSTAT(TU,SCustomAttribute,1)=1) THEN { DEALCOMBATDAMAGE (TU,0,0,999); }`. `SP` is the
  spell cast and `TU` is `SpellTargetUnit`; `MASTER.CAS~"SDisruption = 340;"` fixes `SDisruption = 340`, and
  `MASTER.CAS~"SCustomAttribute=118;"` defines custom attribute `1` as Mechanical. The single predicate is the
  target's Mechanical tag — there is no attack, no melee test, no attack-strength test and no
  counter-attack path. Its non-mechanical fallback is a strength-10, 60%-to-hit attack roll.
- **Spell table** `spells.ini[340]`: `Name=Sabotage`, `Category=5`, `NonMagic=True`,
  **`Disabled=True`**.
- **Roster** `Unit rosters/Warlord mod unit data/UNITS.INI[363]` (Clockwork Tinmen):
  `Spellability=341`, which `spells.ini[341]` names **Lucky Star**. `Spellability=340` appears on
  no unit in the roster. The index carries no offset — Master Engineer 260 = Construct Catapult,
  Druid 2 = Resist Elements, Doom Wheels 294 = Big Red Button.

**Resolved in favour of the roster and the spell table, against all three prose sources.** Two
independent facts each defeat the described ability: the Tinmen are given Lucky Star rather than
Sabotage, and Sabotage is disabled in the shipped spell table, so no unit in Warlord 1.5.12.9 can
destroy a mechanical unit this way. The mechanic that *is* written down is an active spell cast
against a chosen target, which `Calculator/SPEC.md`, *Scope*, excludes along with all charge
consumption; it is not an attack rider under any reading.

The calculator was the fourth source in this disagreement and the only one that executed: it
modelled a melee-attack rider with three invented restrictions (melee only, attacker
`atk > 0`, and firing on the counter-attack), and its Warlord roster hardcoded a
`DestroyMechanical` tag onto the Tinmen against `Spellability=341`. Both were deleted
(`Calculator/HISTORY.md`, F157). The structural confirmation is independent of the scripts:
`Caster binary/CoM2 binary - combat flow.md` enumerates `ApplyAttack`'s riders exhaustively over
`$005B2994..$005B32BC` and finds **six** — Exorcise, Stoning Touch, Death Touch, Life Steal,
Destruction, Poison — with no instant-kill seventh.

## 16. Ballistics Training — Ranged To-Hit amount

- **Manual** *"In combat, all Regular units and Sapiens summons get +20% Range/Breath/Thrown
  To-Hit."*
- **Manual changelog**, v1.5.12.8: *"Ballistics Training is now given +10% Range To-Hit instead of
  +20% Range To-Hit."*
- **Helptext** `#Spell BALLISTICS TRAINING`: *"+10% Range To-Hit and + 20% Breath/Thrown To-Hit"*
- **Script** `UnitCalcPre.CAS!NOEXPLOSIVE!+2..+8 "IF (SPELLSTATE(W,STBallisticsTraining)<>2) THEN { GOTO" "!NOBALLISTICS!"`: `SToRanged` `+10`, `SToBreath` `+20`, `SToThrown` `+20`.

The manual's effect text was not updated when v1.5.12.8 split the three channels; its own change
log contradicts it two hundred pages later. Helptext and script agree with each other and with the
change log, so this is the manual alone.

**Resolved (script).** The calculator writes 10 on Ranged and 20 on the other two
(`b:outlanderBallisticsTraining`).

## 17. Bless — defense against breath and gaze

- **CoM 2 helptext** `Reference docs/CoM2 helptext.TXT:1072` (repeated `:2261`): promises the
  defense bonus against breath, gaze and touch as well as Chaos/Death damage spells.
- **Warlord helptext** `Unit rosters/Warlord mod unit data/HELP.TXT:3133`, `:5328`: splits the
  sentence, keeping a byte-accurate resistance clause but softening the defense line to "all fire
  or lightning damage types and any damage-dealing spells from Chaos and Death realms".
- **Binary** `Caster.exe` 1.05.11: the `EncBless` defense term at `0x5966B8`-`0x596703` requires
  `ismagic2`, `spellid > 0`, and a Chaos or Death realm. It reads no breath, fire or lightning
  flag. Resist Elements (`0x59667D`) and Elemental Armor (`0x5966A2`), two instructions away, each
  do `ismagic2 OR isbreath`.

All four callers of `@Units@EffectiveDefense` (`0x5965C8`) were enumerated by scanning every rel32
`E8` in `.text`: two in `@Aicombat@CombatAttackPriority` (literal 0, AI scoring only),
`@Combat@ApplyAttack` at `0x5B292A` (literal 0, verified in the `spellid` slot by decoding the
eight pushes), and `@Spells@DamageSpell` at `0x5C13A4` (a real `sp`). There is no second
damage-resolving caller and no `spellid` write on the breath or gaze paths. Base CoM 2
`MASTER.CAS` has `EncBless = 51` and no combat-defense reader; Warlord's `EncBless -> ARMOR+7`
lines are all inside scripted damage spells that mirror the `DamageSpell` path.

The *resistance* half of the helptext claim is true and is the likely origin of the error:
`GetEffectiveResistance` takes `realm` directly, and `ApplyAttack` passes Death for Cause Fear,
Death Gaze, Death Touch and Life Steal, and Chaos for Destruction. Warlord's `:3133` names exactly
that set. The CoM 2 helptext welds that true clause to a false defense clause.

**Resolved (binary).** Bless gives no defense against breath or gaze. The calculator's gate is
already correct and F211's tooltip stands; nothing moved. Whether the missing `or isbreath` is an
engine bug rather than a design choice is **H2**.

## Script checks with no calculator discrepancy

**Xenoveterinary.** `UnitCalcPre.CAS!COMRADENOTSURVIVE!+14..+25 "IF (SPELLSTATE(W,STMagitekXenoveterinary)<>2) THEN { GOTO" "!NOXENOVET!"` gates on the Outlander owner and researched
reform, then gives a currently Fantastic unit +10% To-Hit and
`max(1, floor(current HP / 4))` HP. The read occurs at the head of the Outlander phase-b
block. This matches the calculator's magnitude, rounding, and sequence position, and its gate
for every represented unit state. The adjacent Marionette interaction is now resolved: the
Channeler branch makes Wanderer Fantastic before this block, so Xenoveterinary applies there too.

**Corruption radiation.** `CombatEndTurn.CAS!NOTTRAPTILE!+3..+27 "IF (GETTERRAIN(COMBATX(),COMBATY(),COMBATP()+4)=0) THEN { GOTO" "!NOCORRUPTIONCOMBAT!"` runs once per combat end turn on a
corrupted rock, desert, or swamp tile, but not on a node. Poison Immunity, Magic Immunity,
and the Clergy custom attribute are exempt. Otherwise the unit takes exactly 1 damage when
its Resistance is no greater than a 1–10 roll. This agrees with the manual changelog's
one-damage and node-exclusion claims. It is an end-turn event, so it is outside the
calculator's one-round attack-phase scope and has no calculator control to correct.

True Sight was checked without finding a discrepancy: helptext `#Spell TRUE SIGHT`, manual
p86, and `UnitCalc.CAS!NOTZEAL!+2..+5 ": new effect of True Sight, grant +5% range to-hit in combat :" "}"` all grant +5% ranged To-Hit. Eye of Heaven's True Sight grant
at `UnitCalcPre.CAS!ENDOFCOMBAT!+2..+5 ", all friendly units gain True Sight while enemy lose all gaze ability :" "}"` feeds the same effect.
