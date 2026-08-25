# CoM2 / Warlord binary analysis — combat flow

Attack setup, rider resolution, melee/ranged dispatch, gazes, and phase ordering.

Addresses refer to the pinned `Caster.exe` build. See the [analysis index](./CoM2%20binary%20analysis.md) for binary identity, method, and the subsystem map.

## Gaze attacks (resolved 2026-07-27)

`@Combat@ApplyAttack(au, du, at, figs, counter, simul)` at `0x5B1970` resolves every attack.
`at` is a typed constant:

| Value | Name | Value | Name |
|---|---|---|---|
| 1 | `ATRanged` | 5 | `ATThrown` |
| 2 | `ATmelee` | 6 | `ATDoomGaze` |
| 3 | `ATFirebreath` | 7 | `ATDeathGaze` |
| 4 | `ATLightningbreath` | 8 | `ATStoningGaze` |

A jump table at `0x5B1A32` (indexed by `at`, bounds-checked against 8) sends each type to its
own setup block: `ATDoomGaze` → `0x5B1F9F`, `ATDeathGaze` and `ATStoningGaze` → a shared
`0x5B2030`. All three then converge on `0x5B213D`.

**Three independent stats, no hidden attack strength.** The gaze stats are separate fields, not
MoM's single `ranged_type`/`ranged` pair — there is no ranged-type value in the 100–105 band and
no gaze attack-strength slot anywhere. `@Combat@PerformMeleeAttack` (`0x5B35A4`) gates each gaze
on its own stat, and the gates match `MASTER.CAS`'s documented conventions exactly:

| Gaze | Gate | Meaning |
|---|---|---|
| Stoning | stat `!= 100` | 100 = "unit has no Gaze attack"; otherwise the save modifier |
| Death | stat `!= 100` | same |
| Doom | stat `> 0` | holds damage |

`ATDoomGaze`'s setup reads that damage into `atk`, sets `tohit = 100`, and raises `fulldoom`
and `magicranged`. `ATDeathGaze`/`ATStoningGaze` instead set **`atk = 0`** and repurpose `tohit`
to carry the save modifier — they are pure resist-or-die and deal no attack damage.

**Doom Gaze does not scale with the attacker's figure count.** `figs` becomes `ApplyAttack`'s
per-figure loop bound (`[ebp-0x50]`, body `0x5B2994`, back-edge `dec / jne` at `0x5B3161`), and
the `fulldoom` path accumulates `TotalDamage += atk` once per iteration at `0x5B2EAF`. The three
gazes pass *different* `figs`:

| Gaze | `figs` passed | Attacker's call | Retaliation call |
|---|---|---|---|
| Stoning | `@Units@LivingFigures(au)` | `0x5B37B1` | `0x5B38C3` |
| Death | `@Units@LivingFigures(au)` | `0x5B3808` | `0x5B3926` |
| **Doom** | **literal `1`** | `0x5B3858` | `0x5B3982` |

So a five-figure Great Chaos Lord deals its Doom Gaze damage once, not five times. **This is a
genuine engine difference from MoM**, where the equivalent automatic-damage path sits inside the
per-attacker-figure loop and therefore does scale (`../MoM binary analysis.md`, *Gaze attacks*). It
has no roster consequence in MoM, whose only Doom Gaze unit has one figure.

Each gaze phase is additionally wrapped in a caller-side loop that runs `j` times, where `j` is
1, or 2 when a unit flag at `+0x517` is set. That flag is not yet identified.

**The resist-or-die component does not scale with the attacker's figure count.** It resolves
before the main per-attacker-figure loop begins at `0x5B2994`. Death Gaze snapshots
`LivingFigures(du)` at `0x5B25AB` and loops exactly that many times at
`0x5B25C2..0x5B2648`; Stoning Gaze does the same at `0x5B26BF` and
`0x5B26D6..0x5B275B`. Each positive `ResistanceRoll` result adds one
`HpPerFigure(du)` to its result bucket (`0x5B2630..0x5B2638` / `0x5B2744..0x5B274C`). The
caller-supplied `figs` value is not read by either resistance loop, so passing
`LivingFigures(au)` affects only the separate main-attack portion. The calculator's one roll per
*defender* figure is therefore exact for CoM2/Warlord.

The kill roll is skipped outright on the calculated defender's matching immunity or Magic
Immunity: Death at `0x5B2568` / `0x5B259A`, Stoning at `0x5B267C` / `0x5B26AE`.

Verified: Codex 2026-08-02, cold derivation followed by a byte-level self-review and
user-directed integration. The independent Claude derivation and formal cross-review were not
available.

## `ApplyAttack` setup and pre-roll flow (R5.2a–b, resolved 2026-08-02)

The durable source-shaped reconstruction is `Combat.ApplyAttack.pas`; encoded branch/call/write
evidence and completion ledgers are in `Combat.ApplyAttack.R5.2a-b.evidence.md`. These first two
slices cover `$005B1970..$005B2994`; the completed R5.2c tail is described immediately below.

The attack-type dispatch selects the following calculated-record fields and flags before all
common processing:

| Attack type | Strength | To Hit | Type-specific flags/classification |
|---|---|---|---|
| Ranged | `ranged` | `hitchance + hitchanceranged − RangedPenalty` | `rangedflags`; magical/missile from `rangedtype`; `islightning := armorpiercing or rangedtype=30` |
| Melee | `attack` | `hitchance + hitchancemelee` | `meleeflags`; Cause Fear can reduce the supplied figure count first |
| Fire / Lightning Breath | corresponding breath field | `hitchance + hitchancebreath` | general `attackflags`; Lightning forces Armour Piercing; both are magical and breath |
| Thrown | `thrown` | `hitchance + hitchancethrown` | `meleeflags`; not classified magical, missile or breath |
| Doom Gaze | `doomgaze` | 100 | general flags plus Doom; `fulldoom` and magical |
| Death / Stoning Gaze | 0 | common `hitchance` | general flags and magical; the separate resistance loops do the killing |

The bounds test is unsigned (`0x5B1A22..0x5B1A25`), so value 0, values above 8 and signed-negative
values all reach the invalid setup at `0x5B20B4` and its `Rederror` call.

Four pre-roll mechanics are calculator-relevant:

- **Cause Fear uses a base-record immunity gate.** On melee setup, defender Fear triggers one
  Death-realm resistance roll at −3 per supplied figure of the attacking/feared unit. A positive result removes that
  figure from the later attack. The direct immunity test at `0x5B1D1C` reads displacement
  `0x1AC185F = BaseUnits + 0xC7`, not calculated `Units.deathimmunity`; derived Death Immunity
  created during recalculation therefore does not take this shortcut. Magic Immunity still makes
  the roll harmless through `GetEffectiveResistance`.
- **Blood Lust doubles both melee and Thrown.** `0x5B214E..0x5B21BA` admits attack types 2 and 5,
  requires `EncBloodLust`, rejects a calculated Fantastic defender, and writes `atk := atk * 2`.
  The calculator currently doubles melee only; this discrepancy is registered as F22.
- **Black Sleep has two different sides.** A sleeping attacker has `figs := 0` before dispatch
  (`0x5B19CA..0x5B19D6`). A sleeping defender instead sets `fulldoom` and the merged Doom flag
  (`0x5B277F..0x5B2793`) after gaze resolution.
- **Mystic Surge reduces the defender's To Defend at resolution time.** The merged
  `AttackFlagsT.mysticsurge` byte subtracts `MysticSurgeToDefPenalty` after Effective Defense
  (`0x5B2960..0x5B2970`).

The remaining pre-roll work is either already represented elsewhere or outside the calculator's
one-round state: Blood Lust's target classification uses calculated `Fantastic`; Battlemage adds
`HeroBonus(level, HABattlemage, ability-level)` to persistent MP on non-simulated melee, Thrown
or breath attacks and clamps it to calculated max MP (`0x5B21C4..0x5B2440`); counterattacks lose
five To-Hit points per persistent suppression point (`0x5B2448..0x5B2484`); a non-counter melee
attack that cannot reach a flying defender exits before Immolation (`0x5B248E..0x5B24D2`); and
melee Immolation resolves through `DamageSpell` before either gaze resistance loop
(`0x5B24D8..0x5B2535`).

Verified: Codex 2026-08-02, cold derivation plus byte-level self-review; the three review defects
were corrected before user-directed integration. No independent Claude derivation was available.
Claude reviewed the full extent against the binary on 2026-08-03 (R5.C) and found no semantic
misreading; two documentation defects were fixed — the `Round` banker's-rounding mode (see F7)
and the missing `counter`/`simul` call-site citation.

## `ApplyAttack` riders, damage loop and result routing (R5.2c, resolved 2026-08-02)

The durable source-shaped reconstruction is the tail of `Combat.ApplyAttack.pas`; its encoded
branch/call/write evidence and contiguous ledger are in `Combat.ApplyAttack.R5.2c.evidence.md`.
This slice covers `$005B2994..$005B32BC` and completes the full TD32 extent.

The per-attacker-figure loop first applies six merged `AttackFlagsT` riders in this exact order:
Exorcise, Stoning Touch, Death Touch, Life Steal, Destruction, Poison. The entry idiom at
`$005B2994..$005B299D` skips the entire package only for attack types 6–8 — Doom, Death and
Stoning Gaze. It therefore runs for conventional ranged, melee, both breaths and Thrown; which
weapon-specific flags reach it was already selected by R5.2a. This supplies D18's compiled
dispatcher evidence and corrects the prior all-phases assumption: **no touch rider accompanies any
gaze in `Caster.exe`**.

The individual rider shapes are:

- Exorcise requires a Fantastic defender, is stopped by Magic Immunity or Spell Lock, subtracts
  3 from its save modifier against Undead, and rolls in the Life realm
  (`$005B29A3..$005B2AD3`). A failed save adds one defender `HpPerFigure` to result field 0.
- Stoning Touch is stopped by Magic or Stoning Immunity and rolls in Nature; Death Touch is
  stopped by Magic or Death Immunity and rolls in Death. Each failed save adds one defender
  `HpPerFigure`, to result field 0 or 8 respectively (`$005B2ADC..$005B2C64`).
- Life Steal is stopped by Magic or Death Immunity, rolls in Death, adds the returned magnitude
  to result field 4, and heals the attacker by that same raw magnitude only outside simulation
  (`$005B2C6B..$005B2D3D`). The heal happens before target damage is applied or capped; the
  calculator derives healing from its target-HP-capped damage distribution instead, registered
  as F28.
- Destruction is stopped only by Magic Immunity, rolls in Chaos, and on failure **assigns 150**
  to result field 0 rather than adding it (`$005B2D42..$005B2DC2`). Because this block is inside
  the attacker-figure loop, it rolls once per attacking figure; the calculator's one-roll phase
  model is registered as F26.
- Poison is stopped only by Poison Immunity. It makes `poisonvalue` realm-0 resistance rolls at
  `PoisonSavePenalty`, adding one ordinary-damage point per failed save
  (`$005B2DC8..$005B2E6D`). Realm 0 is outside the 1–5 realm constants, so this closes D4: the
  calculator is right to omit Magic Immunity and realm bonuses from Poison.

The ordinary damage path is also explicit now. Doom damage skips attack and defence rolls:
full Doom adds `atk`; ordinary Doom adds `DoomDamagePercentage * atk div 100`, using complete
signed `idiv` arithmetic at `$005B2E83..$005B2E9C`. Otherwise `AttackRoll(atk,tohit)` produces
`dam3`. Blur is a side-wide combat-global enchantment selected through `CGADEnemy`, while
Invisibility is the defender unit's field. `CGADEnemy` follows `CombatAttackersTurn`, not
`Units[du]`: a true turn-state returns `CGDefender` (1), while false returns `CGAttacker` (2).
The complete helper body and bytes are in `Combat.CallClosureHelpers.pas` and
`Combat.CallClosureHelpers.R5.2k.evidence.md`. Those sides identify the
target side for the initiating strike, but `PerformMeleeAttack` swaps `au` and `du` for its
counterattack at `$005B3BA6..$005B3BAC` without changing the combat-turn role, so the
counterattack reads its attacker's own side-wide Blur. Each original hit gets one `Random(100)`
test; the configured Blur, Invisibility or combined percentage removes it before `DefenseRoll`.
**The immunity gate reads the attacker’s `Units[au].illusionimmunity`** at `$005B2FCF`. This
closes D5: the calculator's immunity side is correct, but its unit-owned Blur checkbox and
always-target-side selection cannot represent the engine behavior (registered as F24).

After hit removal, the engine subtracts `DefenseRoll`, subtracts Invulnerability's configured
flat reduction, clamps at zero, then applies Supernatural minimum damage only when effective
Defense is below 80. The minimum is
`Round((dam3 - SupernaturalStarts) * SupernaturalRatio / 100.0)` — `fild` at `$005B2EFF`,
`fdiv` at `$005B2F05`, and `@System@@ROUND` at `$005B2F0B`. **`@System@@ROUND` is banker's
rounding — ties to even, not half-up**, so `Math.round` is not a faithful substitute; with the
shipped `0`/`34` the ties fall exactly at `dam3 ≡ 25 (mod 50)`. The table's old truncation inference
was wrong: its 7 → 2 example does not distinguish rounding from truncation. F7 remains a real
calculator discrepancy, but the exact defect is use of `Math.round(hits / 3)` instead of the
moddable rounded formula, not the formerly claimed one-third-of-counts overestimate.

Damage that crosses a figure boundary is reduced by a fresh `DefenseRoll` and another
Invulnerability subtraction for each new figure (`$005B309E..$005B3145`). Blur and the
Supernatural floor are not rerun on spillover. The loop uses the existing top-figure damage,
then records the current remainder for the next attacking figure.

Finally, Create Undead routes accumulated ordinary damage to result field 4 only when the
attacker has `createundead` and the defender has neither Magic nor Death Immunity; otherwise it
uses field 8 (`$005B316A..$005B320C`). If the sum of all three result fields is positive,
Bloodsucker adds configured damage to field 8 and, outside simulation, passes the separately
configured healing amount to `Combatheal` with `overheal=False, isregen=True`
(`$005B3216..$005B3290`). The callee caps that amount to the attacker's recoverable damage; target
overkill is irrelevant and no remainder becomes bonus HP. This is one post-result trigger per
`ApplyAttack` call, not one per attacking figure. The calculator currently tests only the
pre-rider base-damage distribution and instead caps healing to non-overkill target damage; both
disagree with the engine (registered together as F27).

Verified: Codex 2026-08-02, cold derivation followed by a byte-level self-review and
user-directed single-agent integration. The independent Claude derivation was unavailable.
Claude reviewed the full extent against the binary on 2026-08-03 (R5.C) and found no semantic
misreading; two documentation defects were fixed — the `Round` banker's-rounding mode (see F7)
and the missing `counter`/`simul` call-site citation.

## Ranged and melee attack dispatch (R5.2d, resolved 2026-08-02)

The durable source-shaped reconstruction is `Combat.PerformAttacks.pas`; encoded branch,
call and write evidence plus the two contiguous ledgers are in
`Combat.PerformAttacks.R5.2d.evidence.md`. They cover `@Combat@PerformRangedAttack`
(`$005B3338..$005B35A2`) and `@Combat@PerformMeleeAttack` (`$005B35A4..$005B3ECB`).

`PerformRangedAttack` first gives the current combat attacker a wall-crushing chance. It then
sets the repeat count to two exactly when calculated `EnchantmentFlags[15=EncHaste]` is set and
runs an ammo-gated loop. Each admitted pass recomputes the attacker's living figures, calls
`ApplyAttack(..., ATRanged, ..., counter=False, simul=False)`, deals all three result buckets,
adds one suppression to the defender, and spends one base-record ammo. Reaching zero ammo clears
the calculated `rangedtype`; finalization clears all remaining movement, sets
`combatattacksdone := 2`, and recalculates units (`$005B33AF..$005B3599`). Ammunition remains a
deliberate calculator non-goal for its single-exchange model.

The exact melee damage phase order is:

1. Wall of Fire, when the two tile predicates describe a crossing and the attacker is not owned
   by the combat defender (`$005B35C3..$005B36C7`);
2. attacker Stoning, Death and Doom Gazes (`$005B377B..$005B3877`);
3. defender Stoning, Death and Doom Gazes (`$005B3879..$005B3996`);
4. attacker Lightning Breath, Fire Breath and Thrown (`$005B399B..$005B3A9E`);
5. First Strike if admitted, then the main/Haste/counter block (`$005B3AA0..$005B3BEE`).

Wall crushing sits after Wall of Fire and before the gazes but is not unit damage. Because every
phase deals damage before the next begins, this order decides later living-figure counts. The
calculator then still ran the DOS-shaped Thrown/Breath → gazes → Wall of Fire opening for these
builds; it was reordered to match under F29 (`Calculator/HISTORY.md`).

The same Haste flag supplies repeat count two to **all three attacker gaze loops** as well as
Lightning Breath, Fire Breath and Thrown. Defender retaliation gazes and the counterattack are
outside those loops and remain single (`$005B3761..$005B3AA0`). This resolves D10: CoM2 and
Warlord do not Haste the counterattack. The calculator then still excluded gazes from Haste
outright; that was corrected under F30 (`Calculator/HISTORY.md`).

First Strike requires the attacker flag, absence of defender `negatefirststrike`, and
`HpPerFigure(du) - TopFigureDamage(du) <= FirstStrikeCap`. The exact INI key is loaded through
`$00708E58`; both shipped CoM2 and Warlord tables set it to 999, deliberately disabling the old
24-damage cap. An admitted First Strike is dealt immediately and its local result is zeroed
(`$005B3AA0..$005B3B46`).

What follows depends on whether that First Strike was admitted. `$005B3B46 EB21 jmp $005B3B69`
skips the ordinary attacker block at `$005B3B48..$005B3B64`, so the main slot holds a real
`ApplyAttack` result only when no First Strike was admitted, and a zero placeholder when one was.
On both paths the optional Haste attacker result and the counterattack result are computed
**before any slot is dealt**; the tail then deals them main, counter, Haste
(`$005B3B48..$005B3BEE`). Each attacker result is a separate
`ApplyAttack` call, and Cause Fear lives inside `ApplyAttack`; the two Hasted melee strikes
therefore make independent Fear samples. The calculator then conditioned both strikes on one
sampled active-figure count, including an explicit First-Strike/Haste coupling path; that was
corrected under F31 (`Calculator/HISTORY.md`).

Finally, melee increments the base attack count, spends half maximum movement using complete
signed `div 2`, spends the signed `mod 2` remainder after the first attack, clamps remaining
movement at zero, adds defender suppression, recalculates units, and refreshes the human-owned
selected unit's move matrix (`$005B3BF3..$005B3EC6`).

Verified: Codex 2026-08-02, single-agent cold derivation followed by a raw-byte self-review and
user-directed integration. No Claude derivation was produced. Claude reviewed the full extent
against the binary on 2026-08-03 (R5.C) and found no semantic misreading: the melee phase order,
the Haste repeat loops and their exclusion of defender gazes and the counterattack, the First
Strike gate and its zero placeholder, the counterattack argument swap, and the signed movement
`div`/`mod` idioms all reproduce. No change was required.
