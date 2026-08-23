# Version-gating census: ability and enchantment reads in the computation layer

Measured 2026-08-23 at `f19f865`. Method and findings; live work state is [F130](../Calculator/BACKLOG.md).

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

**Limitation.** Shapes are hand-written, so "never fires" means "not in these 24 derivation shapes
and 32 exchanges". A branch no shape reaches is invisible. `combat_effects.js:897` is the worked
example: it is an ungated read that no shape exercises, because no shape gives the defender Weapon
Immunity.

## Groups

| Group | Meaning | Sites |
|---|---|---|
| A | version-scoped key, no effective version test — fires in every version where the key does not exist | 38 |
| B | version-scoped key, a test exists but is wider than the control's scope | 4 |
| C | version-scoped key, never fires outside its scope | 143 |
| D | key whose control exists in all five versions | 178 sites / 68 keys |

Of the 42 (A)+(B) sites, **8 move a number**: `combat_special_attacks.js:507` and `stats.js:704`
(`rulerOfUnderworld`), `combat_special_attacks.js:559` (`rage`), `combat_effects.js:311`
(`bloodLust`), `combat_phases.js:442`/`443` (`eldritchWeapon`) and `combat_phases.js:444`/`445`
(`mysticSurge`). The other 34 fire but their value is discarded downstream.

All four (B) sites are **wider**, none narrower. This census cannot detect a narrower test — one
suppressing a key in a version that has it — because it probes out-of-scope pairs only. Finding
those needs the mirror-image sweep, which does not exist.

`combat_effects.js:889` (`spiritLink`) is a **negated** read, `!hasAbil(...)`. A mechanical gate
there inverts the condition instead of making it inert.

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

All 14 are closed. `COMBAT_VERSION_SCOPES` (`Calculator/steps.js`) now carries resolution-time
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

The remaining 34 group-A/B reads are unconverted and stay for later rounds against the same
mechanism.
