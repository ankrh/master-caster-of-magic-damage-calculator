# Version-gating census: ability and enchantment reads in the computation layer

First measured 2026-08-23 at `f19f865`; re-measured 2026-08-23 after the gating mechanism landed.
Method and findings; live work state is [F130](../Calculator/BACKLOG.md).

`SPEC.md`, *Versions*, invariant 4 requires an effect a version lacks to be inert in the result.
`tests/version-gating.spec.js` asserts the UI half. This census measures the computation half.

## Method

Syntax cannot answer the question: most gating here is **transitive** — an early-return guard at the
top of the enclosing function, a caller that only runs on one engine path, or
`filterStepsToVersionScope` dropping the step before it executes. So the census is executed, not read.

Every ability/enchantment read in `combat*.js`, `stats.js`, `stats_identity.js` and
`stats_sequence.js` was rewritten to `__REC(idx, <expression>)` — 399 sites, covering `hasAbil`,
`abilVal`, `abilDefined`, `X.abilities.key` and bare `abilities.key`, with comments and strings
masked. Each of the 485 (calcKey, version) pairs whose every naming control is hidden was then
derived and resolved over the sweep's shapes, recording which sites fire. Each firing site was then
suppressed individually to separate "executes out of scope" from "changes a number".

**Limitation, and it is the load-bearing one.** Shapes are hand-written, so "never fires" means
"not in these 24 derivation shapes and 32 exchanges", and — more consequentially — "does not move
a number" means "moves none of the six numbers these shapes produce". A branch no shape reaches is
invisible. The re-measurement below found **seven** effects the sweep called inert that move a
number under a shape it does not build; the shapes' defender is never Fantastic Death/Chaos, never
carries Weapon Immunity, and the attacker never carries Illusion or a touch attack, so every
effect keyed to one of those was scored inert by construction.

**Second limitation: three sites read their key dynamically** and so cannot be attributed to a
key at all — `combat_abilities.js:720` (`abilVal(abilities, key, 0)`, the aura values),
`combat_effects.js:242` (`PLACED_TOUCH_KEYS`) and `combat_phases.js:15` (`placedTouchValue`).
They are counted in the 399 but appear in no group, and at least one of them leaks: see
Dispel Evil below.

## Groups

| Group | Meaning | Sites |
|---|---|---|
| A | version-scoped key, no effective version test — fires in every version where the key does not exist | 38 |
| B | version-scoped key, a test exists but is wider than the control's scope | 4 |
| C | version-scoped key, never fires outside its scope | 143 |
| D | key whose control exists in all five versions | 178 sites / 68 keys |

Of the 42 (A)+(B) sites, **8 moved one of the numbers these shapes produce**:
`combat_special_attacks.js:507` and `stats.js:704` (`rulerOfUnderworld`),
`combat_special_attacks.js:559` (`rage`), `combat_effects.js:311` (`bloodLust`),
`combat_phases.js:442`/`443` (`eldritchWeapon`) and `combat_phases.js:444`/`445` (`mysticSurge`).
The first pass recorded that the other 34 "fire but their value is discarded downstream"; the
re-measurement below shows that is **wrong for at least four of them**, and that the group is 36
sites rather than 34.

All four (B) sites are **wider**, none narrower. This census cannot detect a narrower test — one
suppressing a key in a version that has it — because it probes out-of-scope pairs only. Finding
those needs the mirror-image sweep, which does not exist.

`combat_effects.js:904` (`spiritLink`) is a **negated** read, `!hasAbil(...)`. A mechanical gate
there inverts the condition instead of making it inert — and it is the one site the re-measurement
found leaking in the way that warning predicted.

## The DOS engines repurpose enchantment bits across versions

`DOS reconstructed/R6.1a.evidence.md` compares the MoM and CoM 1 enchantment dispatch tables. The
same bit carries a different enchantment per engine:

| Bit | MoM | CoM 1 |
|---|---|---|
| `0x00200000` | Eldritch Weapon (`0x8F675`) | Mystic Surge (`0x8F5FF`, `0x8F795`) |
| `0x00000004` | Berserk (`0x8F832`) | Blood Lust (`0x8F491`) |
| `0x00000010` | Black Channels (`0x8F3FA`) | Animated (`0x8F4D0`) |
| `0x00000800` | Stone Skin (`0x8F4FB`) | Focus Magic (`0x8F7E6`) |
| `0x08000000` | Giant Strength (`0x8F5F4`) | Orihalcon (`0x8F853`) |

This explains the shape of group (A): the pairs appearing there — `eldritchWeapon`/`mysticSurge`,
`berserk`/`bloodLust`, `blackChannels`/`animated`, `stoneSkin`/`focusMagic` — are exactly the
repurposed bits. The calculator models one shared bit as two differently-named controls, each
visible in the versions that use that name, and each read reaching the effect under its own name.

It also resolves an apparent contradiction. `R6.2c.evidence.md` lists an "Eldritch Weapon To Block
reduction" at `0x99EEF` in **com1** as well as both MoM builds, which looks like evidence that CoM 1
has Eldritch Weapon. It does not: the label is inherited from the MoM reconstruction of the same
address, and in CoM 1 that code reads the bit that now means Mystic Surge. CoM 1's −10pp To Block is
real and the calculator already produces it through `mysticSurge`; `eldritchWeapon` firing there is
a duplicate path.

**Consequence for gating.** Gating each read to the versions in which *its control* names that bit
reproduces the engine, and the citation for such a gate is the bit map above — not the control's
`subgroup`, which states visibility only (`steps.js:41`).

## Keys whose control exists in all five versions but whose step scope is narrower

Five keys where `STEP_VERSION_SCOPES` is narrower than the control's five-version visibility. All
five were checked against sources; **none is a contradiction**. A step is not the only place an
effect can be implemented, so "no step in version X" does not mean "absent in version X".

| Key | Step scope | Resolution |
|---|---|---|
| `animated` | `c:animated` CoM+ | Correct. The CoM+ stat write is a step; MoM's Animate Dead is the undead conversion and its immunities, applied in resolution (`combat_effects.js:57`, `:79`). The def tooltip states the MoM 1.31 and 1.60 behavior explicitly. |
| `combatSummoned` | `a:combatSummoned` modern | Correct. It is an encounter condition, not an enchantment. CoM 1's summon branch is `stats_identity.js:138`, outside a step. |
| `eternalNight` | Warlord + CoM+ steps | Correct. In MoM and CoM 1 it acts as Darkness, read at `stats.js:397` into the darkness path; the steps cover the Warlord poor-vision and CoM+ resistance writes. |
| `raiseDead` | `c:raiseDead` CoM+ | Correct, and the cleanest case: the enchantment exists in MoM but has no effect on combat stats there, so no version-scoped write exists to record. |
| `trueSight` | `d:trueSight` Warlord | Correct. True Sight grants Illusion Immunity in all five versions (`stats_identity.js:377`, `stats.js:1118`, both ungated); the step is only Warlord's +5% ranged To Hit, already gated at `stats.js:699`. |

Of the remaining 63 all-five keys, 20 have a `STEP_VERSION_SCOPES` entry covering all five versions.
**43 have no entry at all**, so nothing in the repo states that their implementation is identical
across engines. Several demonstrably are not identical in their numbers even though their presence
is cross-version — `weaponImmunity`'s bonus is per engine right at `combat_special_attacks.js:526`
(MoM raises to 10, CoM 1 +8, CoM2 +8, Warlord +10), and `lifeSteal`, `bless`, `blur`, `haste`,
`immolation` and `fear` are in the same position.

## The sweep understated, and was corrected

`tools/hidden_control_leak_sweep.js` set the probed key on the **attacker only**. `rage` scales with
figures already lost, and in these shapes the counter-attacking defender loses figures first, so a
Warlord-only control moved four versions' numbers without being reported. The tool now probes both
sides one at a time. Re-run 2026-08-23:

```
hidden (calcKey, version) pairs: 485
pairs moving a derived stat: 1        (com_6.08 rulerOfUnderworld)
exchanges compared: 17120             (was 8560)
pairs moving a resolveCombat number: 14   (was 10)
```

The four added are `rage` in `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11`. Nothing
else appeared, so the corrected tool and the instrumentation agree exactly.

## Outcome

All 14 that the sweep can see are closed, and it still reports 0 and 0 after this round's three
further gates. That is not "no leaks remain" — see the limitation above and the seven below.
`COMBAT_VERSION_SCOPES` (`Calculator/steps.js`) now carries resolution-time
scope the way `STEP_VERSION_SCOPES` carries step scope, keyed `resolution:<formula id>` and
asserted against each formula's `PROVENANCE versions=` by `tools/unit_checks/version_scope.js`.
The eight reads are gated through `combatEffectInVersion`. Re-run after the gates:

```
pairs moving a derived stat: 0
pairs moving a resolveCombat number: 0
```

Two anchors were authored for it, because neither effect had one:

| Formula | Versions | Cited span | Claim |
|---|---|---|---|
| `eldritchWeaponEligibility` | `mom_1.31`, `mom_cp_1.60.00` | `DOS reconstructed/unitcalc.c` 838-846 | The MoM `UE_ELDRITCH_WEAPON` block: gate on bit `0x00200000`, melee and conditional ranged attribute writes, `Weapon_Plus1` floor. CoM 1's block for the same bit is Mystic Surge's, at `unitcalc.c:1067`. |
| `rulerOfUnderworldEligibility` | `com2_1.05.11`, `com2_warlord_1.5.12.7` | `Caster binary/Units.RecalculateUnits.pas` 1512-1517 and 621-625 | King of Underworld derives the aggregate Wraith Form flag during combat for a valid owner (`$0059EA93..$0059EB4D`), and a rival's copy suppresses only the calculated-layer `EncMagic` assignment (`$00598EA7..$00598ED9`). |

## Re-measurement, and the enumeration the first pass never wrote down

The instrumentation was rebuilt and re-run against the post-mechanism tree. It reproduces the
first pass exactly where the first pass is checkable — **399 sites**, and **178 sites over 68
keys** whose control exists in all five versions — so the site definition is the same one. It
finds **36** sites firing outside their key's scope where the first pass recorded 34; running it
against `413b7aa`, the commit the 34 describes, also gives 36, so the two extra are a counting
difference in the first pass, not later drift. The first pass listed none of them by file and
line, which is why this section exists.

Three were closed by gates in this round, leaving **32**:

| Site | Key | Versions it fires in out of scope | What happens to the value |
|---|---|---|---|
| `combat_abilities.js:887` | `innerPower` | CoM 1, both MoM | step |
| `combat_abilities.js:902` | `mislead` | CoM 1, both MoM | step |
| `combat_abilities.js:923` | `stoneSkin` | CoM 1, CoM2, Warlord | step |
| `combat_abilities.js:943` | `metalFires` | CoM 1, CoM2, Warlord | step |
| `combat_abilities.js:1035` | `blackChannels` | CoM 1, CoM2, Warlord | step |
| `combat_abilities.js:1095` | `survivalInstinct` | both MoM | step |
| `combat_abilities.js:1107` | `guardian` | both MoM | step |
| `combat_abilities.js:1137` | `tactician` | both MoM | step |
| `combat_abilities.js:1173` | `favoredTerrain` | CoM 1, CoM2, both MoM | step |
| `combat_abilities.js:1189` | `mysticSurge` | both MoM | step |
| `stats.js:315` | `focusMagic` | both MoM | adjacent |
| `stats.js:319` | `vampirism` | CoM 1, CoM2, both MoM | adjacent |
| `stats.js:326` | `shadowStrike` | CoM 1, CoM2, both MoM | adjacent |
| `stats.js:332` | `blazeOfGlory` | CoM 1, CoM2, both MoM | adjacent |
| `stats.js:448` | `endurance` | both MoM | adjacent |
| `stats.js:533`, `:534` | `nightshade` | CoM 1, CoM2, both MoM | adjacent |
| `stats.js:584` | `metalFires` | CoM 1, CoM2, Warlord | adjacent |
| `stats.js:627` | `berserk` | CoM 1, CoM2, Warlord | adjacent |
| `stats.js:628` | `berserkWarlord` | CoM 1, CoM2, both MoM | adjacent |
| `stats.js:1148` | `rust` | CoM 1, CoM2, both MoM | adjacent |
| `stats.js:89` | `mechanical` | CoM 1, CoM2, both MoM | consumer |
| `combat_phases.js:572`, `:668`, `:739`; `combat.js:678` (two), `:1169` | `bloodSucker` | CoM 1, CoM2, both MoM | consumer |
| `combat_effects.js:904` | `spiritLink` | CoM 1, both MoM | **leak** |
| `combat_effects.js:911` | `blazingMarch` | both MoM | **leak** |
| `combat_phases.js:327` | `dispelEvil` | CoM2, Warlord | **leak** |
| `combat_phases.js:592` | `destroyMechanical` | CoM 1, CoM2, both MoM | **leak**, two keys |

Four dispositions, and only one of them is the per-site scope entry the first pass assumed:

- **step** (10 sites). The read guards an `abilityStep(...)`; the step id already carries a cited
  `STEP_VERSION_SCOPES` entry (`c:stoneSkin` `SCOPE_MOM`, `d:favoredTerrain` `SCOPE_WARLORD`, and
  so on) and `filterStepsToVersionScope` drops the step before it executes. The version fact has
  a cited home already, so a `COMBAT_VERSION_SCOPES` entry beside it would be a second copy.
- **adjacent** (11 sites). An exact version test stands in the same expression, to the right of
  the read: `!!(abilities && abilities.focusMagic) && version.startsWith('com')`. The read
  "fires" only because JavaScript evaluates the left operand first. Nothing is ungated; what is
  open is whether that test should read the cited table instead of a `startsWith` string.
- **consumer** (7 sites). The value is carried to a consumer that makes the version test.
  Measured inert: probing `bloodSucker` on a wounded attacker and `mechanical` on the defender
  moves no number in any version whose control is hidden.
- **leak** (4 sites). The value is *not* discarded, and the first pass's blanket "their value is
  discarded downstream" is wrong for these.

## Seven leaks the sweep scored inert

Each was reproduced by setting the single hidden control and reading `resolveCombat`, in a shape
the sweep does not build. Three were fixed in this round; four remain.

| Effect | Hidden in | Shape that exposes it | Effect on damage | State |
|---|---|---|---|---|
| `blackChannels` | CoM 1, CoM2, Warlord | attacker with Illusion, or with Death Touch | 24 to 12, 14.39 to 12 | fixed |
| `bloodLust` | both MoM | attacker with Death Touch | 14.39 to 12 | fixed |
| `eyeOfHeaven` | CoM 1, CoM2, both MoM | attacker with Illusion; defender under Vertigo | 24 to 12; Vertigo stripped | fixed |
| `blazingMarch` | both MoM | defender with Weapon Immunity | 0 to 12 | open |
| `dispelEvil` | CoM 1, CoM2, Warlord | defender Fantastic Death | 12 to 23.99 | open |
| `spiritLink` | both MoM | attacker Fantastic Death, defender Blessed | 0 to 12 | open |
| `destroyMechanical` | CoM 1, CoM2, both MoM | defender also carrying hidden `mechanical` | 12 to 24 | open |

Notes on the four that remain:

- `spiritLink` is the negated read the first pass flagged as a watch item, and it behaves exactly
  as feared: `!hasAbil(attacker.abilities, 'spiritLink')` is *not* inert when the key is set — it
  suppresses the defender's Bless bonus. It is also **dead within its own path**:
  `dosDefenseForAttack` is reached only when the version does not start with `com2`
  (`computeDefenseProfile`), and Spirit Link is Warlord's (`PROVENANCE[spiritLink]
  versions=com2_warlord_1.5.12.7`, `stats_identity.js`). Warlord's real behavior comes from the
  `d:spiritLink` step clearing `fantastic`, which `spiritLinkBlessNoBonusWarlord` covers. So the
  term should be deleted, not gated.
- `dispelEvil` is a MoM-only control, and `combat_phases.js:327` reads it inside the
  `startsWith('com2')` branch — likewise dead where it stands. Its CoM 1 leak enters elsewhere,
  through the dynamic-key read `placedTouchValue` (`combat_phases.js:15`), which applies every
  `PLACED_TOUCH_KEYS` entry in every version with no per-key scope.
- `blazingMarch` needs a real gate: the control is CoM 1, CoM2 and Warlord, and
  `dosDefenseForAttack` serves both MoM builds as well as CoM 1.
- `destroyMechanical` needs two hidden keys at once, so the sweep's one-key-at-a-time rule cannot
  see it by design. Its behavior is an unsourced inference (`BACKLOG.md` Q29), so no scope entry
  can be cited for it until Q29 resolves.

## What this round changed

Three effects gained a cited gate:

| Home | Scope | Citation |
|---|---|---|
| `COMBAT_VERSION_SCOPES['resolution:blackChannelsEffectDerivation']` | `SCOPE_MOM` | `PROVENANCE[blackChannelsEffectDerivation]`, `unitcalc.c` — bit `0x00000010` is Black Channels in MoM and Animated in CoM 1 |
| `COMBAT_VERSION_SCOPES['resolution:bloodLustAbilityDerivation']` | `SCOPE_COM_PLUS` | `PROVENANCE[bloodLustAbilityDerivation]`, `unitcalc.c` / `Units.RecalculateUnits.pas` / `UnitCalc.CAS` — bit `0x00000004` is Berserk in MoM |
| `eyeOfHeaven` reads in `stats.js` and `stats_identity.js` | Warlord | `Script source/Warlord 1.5.12.7/UnitCalcPre.CAS` 1839-1841 sets `EncTrueSight` under `CGEyeOfHeaven`; no `EyeOfHeaven` identifier exists anywhere in the CoM2 1.05.11 base script set |

Eye of Heaven is a derivation-time read, not a resolution-time one, so it takes the inline
Warlord test its sibling at `stats.js:700` already carries rather than a `resolution:` key.
Whether the table should grow a namespace for derivation-time non-step reads is open.
