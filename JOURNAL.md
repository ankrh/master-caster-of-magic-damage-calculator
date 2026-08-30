<!-- Tier: JOURNAL. Working notes, findings, provenance, handoffs. Written and pruned freely.
     Never authoritative: treat an entry as a lead to re-verify against the code, not as a reason.
     See global CLAUDE.md. -->

# Journal

## 2026-08-30 — F190: Warp Reality's Immolation To Hit arm goes, and the flat 30% is sourced

`deriveUnitStats` set `toHitImmolation = 0.3` and then re-charged Warp Reality's -20% against it,
two lines under its own comment saying Immolation ignores all modifiers. Verified against the
sources rather than the item text:

- Melee Immolation is delivered by `DamageSpell` — `Combat.ApplyAttack.pas:378-383`, with
  `SImmolation = 99` at `:83`.
- `DamageSpell`'s per-attack roll is
  `dam := AttackRoll(str, SpellTable[sp].hitchance) - DefenseRoll(def, Units[u].defendchance)` at
  `$005C1696..$005C16FF` (`Spells.DamageSpells.pas:197-198`). The attack half reads the *spell
  table*; only the defense half reads a unit field. No unit-side To Hit writer can reach it.
- Spell 99 sets no `HitChance` in either `spells.ini` (base `:1899-1916`, Warlord `:2218-2235`),
  and the file's own key list gives the default: "HitChance - chance to hit, defaults to 30%"
  (base `:332`, Warlord `:614`). Warlord's copy sets `HitChance` on ~20 other spells, so the
  absence on 99 is a choice, not an unused key.

Warp Reality's own write is the unit's hitchance — `Dec(U.hitchance,20)` at
`$005A3E33..$005A3ED0`, `bu->tohit -= 2` at 131:0x9079D and com1:0x90502 (the addresses the item
text and `stats_sequence.js` give, 131:0x9077A and com1:0x904DF, are the *gate*, not the write;
that is what those comments claim, so nothing there is wrong) — and that half is untouched, still
on `PROVENANCE[warpReality]` in `stats_sequence.js`.

**The user ruled** delete the arm and file the DOS half as its own item. Three dead values went
with it: `unitIsChaosAtWarpReality`, the `'c:warpReality'` identity sample (the arm was its only
reader, so `identitySamples` is now `c:chaosSurge` alone), and the F184 `LANDED_CORRECTIONS` row
naming the arm. The identity-projection agreement check moved two lines up, to sit directly under
`const statUnit`; that is only so the cross-boundary scanner attributes it to a symbol that means
something, and the two `modernEncMagic*` bindings it displaced moved below it (they are first read
~400 lines later).

`tools/derivation_equivalence.js`: 1816 of 52440 derivations move, all five versions, and the only
field that changes is `toHitImmolation` 0.1 -> 0.3.

`warpRealityChaosExemptAtBlockImmolationWarlord` was dropped, which is what its own T2 vacuity
declaration said should happen if the arm went. Its positional claim survives in
`warpRealityChaosExemptAtBlockWarlord`, which asserts the *unit* To Hit half. In its place,
`warpRealityDoesNotReachImmolationWarlord` pins the new value: a non-Chaos Warlord attacker with
no melee strength, Warp Reality charged in full, Immolation 10 at 30% -> 3.0 (the arm gave 1.0).
It is ablation-inert on `combat.warpReality` by design and declares that.
`warpRealityDoesNotReachImmolationMoM` pins the DOS half: 1 atk at 30%->10% = 0.1 plus Immolation 4
at an unmoved 30% = 1.2, total 1.3 (the arm gave 0.5). Both of its candidates are ablation-live, so
it needs no declaration. `tools/preset_vacuity_sweep.js --only warpReality` reports 0 findings over
all ten.

**The DOS half turned out to be already answered, and no item was filed.** The item text called
`BU_ProcessAttack`'s Immolation delivery an unreconstructed overlay, and it is not. `combat.c:4080`
calls `overlay_0388_0039(SPELL_FIREBALL, ...)` at `:4355`/`:4364`/`:4382`, and `0388:0039` resolves
to `0x87036`, which `R6.version-differences.md:286` lists as a reconstructed spell-damage builder
and which `combat.c:2596` holds under the name `Apply_Battle_Unit_Damage_From_Spell` — same file,
same signature, declared as an `extern` far stub at `:330` only because the call crosses an overlay
boundary. Its per-attack roll is `CMB_AttackRoll(attack_strength, 0)` at 131:0x87239, marked
identical in CP 1.60 and CoM 1. The to-hit argument is a literal zero; the attacker's `bu->tohit`
is neither passed nor read, and Wall of Fire shares the routine and the literal. So the flat 30% is
sourced in all five versions, not three, and there is nothing left to reconstruct. Codex found this
in the Method A review round, against a premise I had taken from the item text without checking.
The user had pre-approved filing one TASKS row for the DOS question; the row was written, then
withdrawn when the premise failed. `Calculator/stats.js` now carries the DOS citation beside the
modern one.

The Warp Reality tooltip (`index.html:63`) was checked and needed nothing: it promises
"-20% To Hit (melee, ranged, thrown, breath)" and never mentioned Immolation.

## 2026-08-30 — F189: Night Goblins take a special-unit key, and the Poor Vision gate reads it

The Warlord Eternal Night gate at `UnitCalcPre.CAS:1340-1344` has four terms. F186 landed the
realm and Undead-flag terms; the template term `(GetStat(U,STypeID,1)<>356)` at `:1341` was
unimplemented, so Warlord template 356 — Goblin Night Goblins, Missile 5 — took a -2 the block
exempts it from.

Verified against the sources rather than the item text: the span at `UnitCalcPre.CAS:1337-1346` is
the one the step's existing `PROVENANCE[eternalNight:poorVision]` citation already covers, so no
citation moved. `Scripts.TXT:266` fixes the record argument — "if B=0, it checks the current stats
and abilities, if B=1 it checks the base unit" — so the template term is a permanent read while
the realm term beside it is positional. `Calculator/units_warlord.js` confirms 356 is
`Goblin Night Goblins`, 8 figures, Missile strength 5, `to_hit` 5.

**The user ruled** that a template-id exception belongs in `SPECIAL_UNIT_DEFS`
(`Calculator/stats_identity.js`) rather than as a bare `templateId === 356` read at the gate, on
the ground that every template-id exception should live in one table, and accepted that the key
becomes user-visible in the `Special unit` selector. Implemented as `nightGoblins` /
"Night Goblins" / `versions: ['com2_warlord']`, with the roster arm in `specialUnitForRoster`.

The read is permanent by construction, not by position: `identity.specialUnit` is set once at
identity construction and no conversion writes it, so nothing in region `c` can defeat the
exemption — the distinction F175 turned on one gate over.

Presets: `eternalNightNightGoblinsExemptWarlord` (roster attacker, 8 x 5 = 40 dice at 30+5 = 35%
against defense 0 = 14.000) and its control `eternalNightGoblinBowmenNotExemptWarlord` (Goblin
Bowmen, template 348, penalised to strength 1, 8 dice = 2.800). Both defenders carry Poison
Immunity: the Night Goblins record also has `Poison Touch=1`, which added exactly 8 guaranteed
points and confounded the number under test — the first measurement came back 22.000, not 14.000.

**Noted, not fixed.** A comment in `Calculator/stats.js` referred to `identityAtPoorVision`, a
symbol that does not exist; it names the block this change edits, so it was repointed at
`warlordEternalNightActive` in the same pass.

Left open: the table's stated test ("a template earns a key only where the version's *engine*
makes the exception") covers this key, but it is the first whose engine site is a negative term
inside another effect's gate rather than a block of its own. Recorded in the comment above
`specialUnitForRoster`; no contract change proposed.

**Template 356 has four engine sites in Warlord, not one.** `UnitCalcPre.CAS:1341` is F189's.
`UnitCalc.CAS:359-368` is a second, **unmodelled** block: "Night Goblin gain bonus from Darkness or
Eternal Night", `+10` To Hit and `+10` To Defend when `ETERNALNIGHTCOUNT>0` or either Darkness
combat global is up — also a `GetStat(U,STypeID,1)` permanent read. The other two are display only:
`DisAbil.CAS:481` prints the ability line "Night Vision" for the unit, `DisAbil.CAS:1287` mirrors
the Poor Vision gate for its own line, and `DisAbil.CAS:3420` prints the unit name "Night Goblins",
which is where the key's label comes from. So the item's framing — "a roster exemption with no
other engine consequence" — is not what the scripts show, which strengthens rather than weakens the
ruling to give it a key. The unmodelled `+10/+10` block is named in
`eternalNightNightGoblinsExemptWarlord`'s `desc`: it is why that fixture's 14.000 becomes 18.000
once the block lands. Not filed; needs the user's approval to become a TASKS item.

## 2026-08-30 — F175: the two Warlord hero exclusions go

Both gates now carry their block's own test and nothing else.

- `b:nausea` (`Calculator/stats_sequence.js:502`): `isNormalUnitType(unitTypeAt(u))` →
  `!u.fantastic`. The branch is `IF FANTASTIC(U)` at `UnitCalcPre.CAS:1123` and the −10% To Hit /
  −10% To Defend pair is the **ELSE** arm at :1125-1128, read at that block's own position, so it
  reaches every unit not sent to `SETCOMBATENCHANTMENTFLAG(U,EncCreatureBinding,…)`.
- `wofDefenderBonusActive` (`Calculator/stats.js:868`): the `!isHero` term dropped, leaving
  `!permanentFantastic`. The block's only skip is `IF (BASEFANTASTIC(U)>0)` at
  `UnitCalcPre.CAS:1638`.

The two Fantastic tests stay distinct on purpose: `FANTASTIC(U)` is the calculated record and
`BASEFANTASTIC(U)` the permanent one, so Spirit Link clearing live Fantastic still does not confer
the garrison bonus and Raise Dead still does not withdraw it.

`unitTypeAt` fell out of `stats_sequence.js` entirely with the nausea rewrite, so it left that
file's destructure and the ctx object in `stats.js`; it is still read five times inside `stats.js`.

Measured with `tools/derivation_equivalence.js` before/after: **64 of 52440 derivations moved**, all
`com2_warlord_1.5.12.7`, all `id:hero` — 9 solo `nausea` cases, 9 solo `wallOfFireBoost` cases, 46
combination cases. The item recorded 64 of 52575 on 2026-08-25; the moved count is identical and the
case total drifted because the control surface changed since it was filed.

Two presets are the assertion, one per site: `nauseaReachesHeroWarlord`
(`presets_warlord_effects.js`, 0.100 where the old gate gave 0) and
`wallOfFireGarrisonReachesHeroWarlord` (`presets_fire_and_blessings.js`, 6.000 where the old gate
gave 5.000). Each declares `vacuity` for its own `unitType=hero` candidate, because the sweep
ablates hero → normal and *that inertness is the claim*: the blocks are asserted to answer the two
identities alike, so no ablation between them can move a number. Sweep after: 1123 swept, no finding
names either preset, no `stale-declaration`.

The `wallOfFireBoost` tooltip said "Defending regular units" / "Applies to normal units only" and
was rewritten — that wording came from `HELP.TXT:2761`, prose the script outranks. The `nausea`
tooltip already promised only "Does not affect fantastic creatures or units with Magic Immunity",
which the change makes exactly true rather than merely incomplete.

Left open: `TESTS.md`'s *presets* entry still says "101 of 1122 `desc` fields quote a source address
inline". The 1122 was already one behind before this item and is now two; the 101 was not
re-measured, so the whole sentence needs one census rather than a patch.

## 2026-08-30 — `longRangeMidRange` deleted, T2 closed

Settled as **delete** and executed, which was the last of the 389 without a verdict. Removed from
`presets_ranged_and_haste.js`, from the *Ranged* group in `test_tree.js:62`, and named-and-corrected
in `longRangeClose`'s `vacuity` reason. Sweep after: 1121 swept, `baselineMismatches` empty, 0 stale,
10 open findings whose keys are exactly the ten remaining adjudicated `re-aim`/`delete`. `npm test`
green, 129 tests.

**The recorded reason was half wrong and the redundancy was re-derived before deleting.** The
original entry said "the mom_1.31 ladder at distance 5 is already pinned by `rangedMissileBasic`" —
that fixture is at distance **9**. What pins the −10 step is `distPenaltyMoM3` at distance 3;
`floor(3/3)`, `floor(4/3)` and `floor(5/3)` are all 1 and mom_1.31 and mom_cp share the `else` branch
of `distancePenalty` (`combat_abilities.js:427-439`). Mutations worked through before deleting, and
which fixture catches each:

| Mutation of `distancePenalty` | Caught by |
|---|---|
| cap written flat, `if (longRange) penalty = -10` | `longRangeClose` only |
| cap removed, or `longRange` ignored | `longRangeMissile` |
| cap applied unconditionally, or `longRange` always true | `rangedMissileBasic` |
| divisor `/3` → `/2` or `round` | `longRangeClose`, `rangedMissileBasic` |
| divisor `/3` → `/4`, or the com2 branch taken | `rangedMissileBasic` |
| `floor(d/3)` → `floor((d-1)/3)` | `distPenaltyMoM3`, `rangedMissileBasic` |

None is caught only by `longRangeMidRange`. At distance 5 the penalty is exactly −10, so the cap's
guard is false and the fixture sits in the one spot where neither the ladder nor the cap can move it
without a sibling moving first. That is why it was inert under ablation and why it is safe to drop.

The lesson worth keeping is not about this fixture: **a delete verdict whose justification was
"enumerated by hand, not measured" is a lead, not a warrant.** Re-deriving it took ten minutes and
found the cited sibling was the wrong one.

## 2026-08-30 — T2.11–T2.23 adjudicated: 195 of 202 kept, seven verdicts open

Priority rows 1–13, the remaining four preset files. The 23 slices sum to exactly 389, so there was
no balance outside them and the close-out was verification rather than more adjudication. Final
sweep: 1122 swept, `baselineMismatches` empty, **0 stale declarations** across the 258 new keys, 11
findings open — precisely the seven below plus the four from the earlier round. `presets.spec.js`
passes in 36.4 s.

T2 did not close on this run: `longRangeMidRange` was recorded as "re-aim/delete", which is not a
verdict, so one of the 389 was still unsettled. The Method A review caught that; I had called the
item done. Settled as `delete` and closed the same day — see the entry above.

The review also sharpened the completeness test, which is worth keeping because the obvious version
is wrong. `378 + 11 = 389` is not sufficient on its own: the item allows the flagged set to shift, so
a newly flagged preset outside the original slices could replace one that stopped flagging and leave
the sum unchanged. What actually proves it is comparing the sweep's finding **keys** against the
recorded open list, plus the stale-declaration count. Both hold here.

378 fixtures now carry a `vacuity` block. 906 insertions, 0 deletions, and **no file outside the four
preset fixtures was touched** — `test_tree.js` included. The declarations are inert data on a path
that already existed, which is why every expectation still holds.

### The seven verdicts that are not `keep`

Left undeclared on purpose, so the sweep keeps reporting them. Each is a lead to re-verify, not a
ruling.

- **`focusMagicDoomGazeRangedBranchCoM2`** (delete). Its attacker block is identical to
  `focusMagicDoomGazeCoM2`'s; the only defender differences are `def:0`, which is the default
  (`data.js:102-104`), and `res:50`, which nothing on the magic-ranged path reads because the gaze
  phase is `!isRanged && aGazeActiveP` (`combat.js:296`). Both expect 3.000 by the same route.
  **Caveat for whoever acts on it:** it is the CoM2 Focus Magic group's entry (`test_tree.js:516`)
  while its twin sits in the version-difference pair (`:1182`), so deleting it leaves that group
  without the fact unless the twin is also listed there.
- **`spiritLinkBlessNoBonusWarlord`** (re-aim). Its `desc` states a number the engine cannot
  produce: "10.000 vs 3.0 with Bless's +7". Modern Bless needs `magicImmunityEligible && spellId > 0`
  with a chaos/death realm (`combat_effects.js:448`), and every modern unit-attack channel passes
  `spellId: 0` — melee `:652`, ranged `:661`, thrown `:687`, gaze `:699`. Immolation is the one
  modern channel that reaches the gate (`:707-715`), and Spirit Link does not participate there
  either. `blessBreathBonusWarlord` already pins the broader behaviour. Evidence is filed as F211.
- **`missileImmunityArmorPiercing`** (re-aim). Claims an ordering — AP halves first, then MI raises
  to 50 — that the card cannot witness: three shots against either def 50 or def 25 are all blocked,
  so every cell of the 2×2 ablation is 0.000. `fireImmunityAfterArmorPiercing` in the same file has
  the shape that works (large shot strength, deep pool).
- **`lavaSmelterFlameBladeWarlord`** (re-aim, as a rename). The key names `flameBlade`; the fixture
  configures `lavaSmelterFieryBlade`. Not a tokenisation artefact — `flameBlade` and
  `flameBladeWarlord` are separate live ability keys (`enchantments.js:34`, `:163`), so the key names
  a real feature the fixture does not contain. The claim itself is sound and distinct from
  `fieryBladeMeleeWarlord`. The key also appears at `test_tree.js:628`.
- **`supremeLightCasterRangedCoM2`** (re-aim, argued). The shot is type `magic`, so
  `isMagicalRangedType` returns true at `combat_abilities.js:301` and short-circuits before the
  Caster arm at `:304`. The Caster flag decides nothing; the fixture measures the magical-ranged arm,
  which `supremeLightSkipsZeroedRangedCoM2` already depends on.
- **`goodMoonSkipsDestinyPermanentFantasticCoM2`** (re-aim, measured). At base melee 1, Destiny's
  doubling and Good Moon's `if (u.atk > 0) u.atk += 1` (`stats_sequence.js:1260`) both land on 2, so
  the fixture would still pass with its own `destiny` term deleted. Base melee 3 separates them
  (Destiny 6, Destiny-free Good Moon 4) with the same claim.
- **`focusMagicConvertsThrownCoM2`** (re-aim, measured). Every configured feature is inert: without
  Focus Magic the unaltered Thrown 5 still reaches the defender for 5.0, and Missile Immunity is
  gated on `ctx.isMissile` (`combat_effects.js:470`), which the Thrown descriptor (`:684-696`) never
  supplies. `focusMagicConvertsMissileCoM2` is the discriminating shape of the same claim.

### Where the review defects were, and where they were not

27 defects across 11 of the 13 subtasks (T2.14 and T2.20 came back clean). **Not one was in a verdict
or a declaration key** — every single one was prose claiming more than the line it cited proved. That
matters more than the count: the arithmetic was right throughout, and what needed policing was the
justification a later agent inherits as settled.

By shape, largest first: 8 wrong-line (citing the `statStep({...})` / `attackSpecificStep(...)`
opening for the assignment inside it, or the neighbouring arm of a multi-way branch); 8 citation
narrower than the claim; 3 attributing a gate to a `.CAS` script that lacks it; 2 under-scoped
absolutes; 2 false corpus claims; 2 overstated equivalences ("verbatim" where ablation *assigns*
`unitType: 'normal'` and the sibling *omits* the field); 1 incomplete sibling inventory; 1 false
counterfactual.

Three reviewers independently converged on one methodological correction worth keeping: **absence of
`every-feature-inert` proves only that *some* candidate is live, not which one.** It identifies a
specific candidate only when the preset has exactly one candidate, or when every other candidate is
named and reported inert. Every use in the landed work satisfies that, but the unqualified rule is
wrong and had begun to propagate.

### Two traps for the next round

- **A sweep can leave a server on 8080 and make the next test run a silent no-op.**
  `preset_vacuity_sweep.js` starts its own server via `startServer()` and does not always tear it
  down. `npx playwright test` then fails with "port already used" and **exits 0 without running a
  single test**. This happened here and read as green from the exit code alone. Check the output, not
  the status.
- **`tools/siblings.js` does not exist.** The 2026-08-30 T2.01–T2.10 entry cites it as the tool that
  answers "does any sibling differ only in X" — the exact claim that round's review caught three
  agents getting wrong. Nothing in the repo provides it. Every sibling claim in this round was
  enumerated by hand.

### Filed from this run

F211–F216, each found by reading a fixture against the code rather than by the sweep, each verified
against source, none making a test red: the Bless tooltip promising a gate-excluded effect; five
preset `desc` fields stating a wrong number or cause; the Warlord race-building race/hero terms no
script contains; two `CoM2`-named fixtures resolving to `com_6.08`; three effects asserted only by
absence claims in a version; and the degenerate Land Linking version-difference subgroup.

## 2026-08-30 — T2.01–T2.10 adjudicated: 183 of 187 kept, four verdicts open

Priority rows 1–3 of `TASKS.md`: the 78 flagged presets in `presets_ranged_and_haste.js`, the 51
in `presets_curses_and_undead.js`, the 58 in `presets_fire_and_blessings.js`. The re-run before
starting reproduced 389 flagged of 1122 with `baselineMismatches: 0` and the same per-file counts
the task table records, so the slice bounds held and no re-partition was needed.

`looksNegative` is gone. What replaced it is a `vacuity` map on the fixture, keyed by the sweep's
own finding — a preset-level bucket name or an inert candidate's id — with the adjudicator's reason
as the value. The schema and its two fail-loud directions live in the tool's own header comment
(`tools/preset_vacuity_sweep.js`), which is the single home for them; do not restate it elsewhere.
The stale-declaration arm caught two of my own mis-keyed entries before the file was committed,
which is the only evidence I have that it works as intended beyond the deliberate probe.

### Method A review, and the four defects it found

Run 2026-08-30 with `codex exec -s read-only -C <repo> -o <out.md> "<prompt>" </dev/null`
(gpt-5.6-sol, high effort, session 01a051ce-c5c3-7973-b185-0ccd48527d85). Reviewing agent was GPT
because the implementing agent was Claude. All four findings were verified against the code and
applied.

1. `declarationKeyFor` stripped the reason prefix off every candidate-level bucket, so one
   declaration cleared all four. Narrowed: `named-feature-inert` and `version-dead` are still
   cleared by the bare candidate id, `roster-shadowed` and `hp-cap-hides` only in full. Both of
   the latter are empty across all 1122 presets today, so this moved nothing and closes the hole
   before a fixture changes shape.
2. `rangedBoulderBasic` claimed to be the only fixture holding boulder inside the ranged-type gate.
   `longRangeBoulder` does too, and would also catch the arm being dropped.
3. `guidingBeaconExcludesThrownCoM` and 4. `immolationAtkZeroNoFire` each claimed a one-value
   sibling. Neither has one - `siblings.js` reports none for either, and it had been run over both
   during the work. Writing "differs only there" without checking the tool that answers it is the
   failure mode to watch: the claim is a proof, and asserting it without the evidence is worse than
   omitting it, because a `vacuity` reason is inherited as settled.

Not covered by the review: it sampled the 183 declarations rather than sweeping them, so "no
wrongly-cleared presets" is weaker evidence than its line-citation check, which was exhaustive. Its
claim that all 183 maps "loaded successfully" is unverified - it was told not to run the sweep.

### The four verdicts that are not `keep`

Left undeclared on purpose, so the sweep keeps reporting them: a `re-aim` or `delete` verdict has
not cleared anything.

- **`longRangeMidRange`** (**delete — settled and executed 2026-08-30**, see that day's later entry).
  Every mis-implementation of the Long Range cap it catches is also caught by `longRangeMissile` or
  `longRangeClose`. Enumerated by hand against `distancePenalty`, not measured. The other half of
  this reason was wrong: it said "the mom_1.31 ladder at distance 5 is already pinned by
  `rangedMissileBasic`", but that fixture sits at distance **9**, not 5. What actually pins the −10
  step is `distPenaltyMoM3` at distance 3 — `floor(3/3)`, `floor(4/3)` and `floor(5/3)` are all 1,
  and mom_1.31 and mom_cp share the same `else` branch of `distancePenalty`. Conclusion unchanged,
  premise corrected.
- **`hasteMagicRangedDoublesForCaster`** (re-aim). Its named feature is inert because nothing on the
  MoM path reads it: the repeat gate is `momHeroManaRanged` (`Calculator/combat.js:1225`), which
  keys on hero-ness alone, and `caster` is read only by `supremeLightActiveForUnit`
  (`combat_abilities.js:297,304`), which returns early for non-CoM versions. **That modelling is
  declared** — SPEC, *Deliberate deviations*, "MoM 1.31's hero magical-ranged repeat is modelled as
  the common case", because the real gate reads an unrelated battle-unit slot and can flip either
  way. So the verdict is about the fixture, not the model: it asserts a Caster condition the
  calculator deliberately does not test, and passes with `caster` removed. An earlier draft of this
  entry called it an F180-adjacent modelling gap; that was wrong, and the claim was mine rather than
  the sweep's. The only residue is the tooltip (`Calculator/abilities.js:26`), whose MoM line
  describes an effect that is not modelled, against SPEC's rule that a tooltip describes the
  *modelled* effect.
- **`blackSleepIncomingRanged`** (re-aim). Measured, not argued: as authored, ablating Black Sleep
  leaves 9. Drop `toHitRtbMod:70` and it moves 9 → 2.7. The fixture sets the to-hit to 100% and the
  defender's Defense to 0, which are the only two things doom-style exact damage would show
  against, so it demonstrates nothing. `blackSleepIncomingMelee` and `blackSleepIgnoresDef` each
  keep one of the two discriminators and are fine.
- **`weaknessBoulderNotAffected`** (delete). Byte-identical to `weaknessBoulderNotAffectedMoM` once
  `desc` and `version` are stripped, and both resolve to mom_1.31 — the first through the
  "Artificial MoM 1.31 tests" group version, the second through its own `version:`. The
  version-differences copy is the one with a job, against `weaknessBoulderPenaltyCoM`.

### `warpDarknessOrderMoM` cannot do both its jobs, and no verdict fixes that

Declared `keep` — its version claim is live — but the mechanism its `desc` states is unobservable
on this card. Measured at mom_1.31: atk 4 gives 2 with Darkness and 2 without; atk 5 gives 3 and 2.
So Darkness does reach a MoM Death creature and Warp does halve it afterwards. But `floor((n+1)/2)`
and `floor(n/2)` differ only for odd `n`, while the contrast against `warpDarknessOrderCoM`
(`floor(n/2)+1`) exists only for even `n` — at atk 5 both versions measure 3. Pinning the
"Darkness is inside the halving" claim needs a third preset at an odd melee.

### Version coverage gaps the `version-dead` flag surfaced

Each of these is a key whose only presets in that version are absence claims, so the version has no
positive assertion for it at all. Reported by the sweep, confirmed by counting the population:

| Key | Version | Presets configuring it |
|---|---|---|
| `chaosSurge` | mom_cp_1.60.00 | 1, an ordering exclusion |
| `illusion` | mom_cp_1.60.00 | 1 |
| `prayer` | mom_cp_1.60.00 | 1 |
| `weaponImmunity` | com_6.08 | 2, both absence claims |
| `magicImmunity` | com_6.08 | 1 |
| `supremeLight` | com2_warlord_1.5.12.7 | 1 |
| `undead` | com2_1.05.11 | 3, all absence or override claims |

The `undead` row is the one that is probably correct rather than a gap: CoM v5.45 removed the
Poison Immunity grant, and CoM2 undead may confer nothing else the calculator models.

### Two shapes that account for most of the 183 keeps

Neither is a defect, and both were repeated often enough to be worth naming.

1. **The extractor cannot reach the discriminator.** `candidates()` enumerates abilities, seven
   unit fields, four identity fields and the top-level combat toggles. It never reaches `rtbType`,
   `rangedDist`, `rtb`, `atk`/`def`/`res`/`figs`, `modernAttacks`, or anything behind
   `aUnitName`/`bUnitName`. Every `no-ablatable-feature` in these three files was this.
2. **`containsRun` is order-sensitive.** `stoningMultiFig` and
   `hiddenGazeStoningKillsPerDefenderFigure` both name their feature and both report
   `name-binds-nothing`, because the tokeniser looks for `stoning touch` / `stoning gaze` as a
   contiguous run and the keys say `stoning multi fig` / `gaze stoning`.

A third, narrower one worth recording: `combinedStoningDeathGaze` and `doomGazeChaosSpawn` report
`every-feature-inert` because `dosGazeAbilityValues` (`combat_special_attacks.js:210-211`) derives
`stoningGaze` and `deathGaze` from one shared modifier, so the two fixture entries are two views of
one byte and one-at-a-time ablation cannot move either. `--interactions` reports the pair as
non-additive, which is the measurement that separates this from real inertness.

## 2026-08-29 — Preset vacuity: sweep re-run, and why the polarity regex has to go

Context: evaluating the deprecated backlog against the rebuilt `SPEC.md` before migration. The
preset-vacuity programme (backlog F61, F68–F79) turned out to rest on rules with no surviving
home, so the sweep was re-run to get current numbers.

Reproduce with `node tools/preset_vacuity_sweep.js --out report.json`. Takes several minutes and
drives a real browser. The JSON report from this run lived in a session scratchpad and is gone;
everything below is reproducible from that command.

### Sweep run

1122 presets swept, **`baselineMismatches: 0`** — every preset reproduced its expected value
before ablation, so the suite is green underneath and all findings below concern discrimination,
not correctness. **389 presets flagged.**

| Class | Meaning | Total | 1.31 | 1.60 | CoM1 | CoM2 | Warlord |
|---|---|---:|---:|---:|---:|---:|---:|
| A | Positive claim, no named feature moves anything | 36 | 16 | 4 | 6 | 4 | 6 |
| B | Negative claim, nothing moves | 87 | 41 | 1 | 5 | 15 | 25 |
| C | Some named feature inert, another live | 101 | 35 | 2 | 5 | 19 | 40 |
| D | Negative claim, some named features inert | 70 | 40 | 1 | 1 | 12 | 16 |
| E | Key binds no feature the preset configures | 47 | 8 | 1 | 2 | 0 | 36 |
| F | Nothing ablatable at all | 31 | 15 | 4 | 8 | 4 | 0 |
| — | `version-dead` (see below) | 35 | 2 | 7 | 10 | 12 | 4 |

These supersede the per-item counts in `Deprecated BACKLOG.md` F68–F79, which were measured
2026-08-22 to 08-26 against a smaller bucket set. Class A is smaller than recorded there (36, not
43) and class D much larger (70, not 37).

By observed shape, which is how the 389 were extracted for adjudication: 193 `some-named-inert`,
123 `nothing-live`, 42 `key-binds-nothing`, 31 `configures-nothing`.

### The regex that guessed claim polarity was wrong where it mattered

Deleted 2026-08-30; the measurement below is why. Whether an inert preset was a defect or a
legitimate assertion-of-absence was decided by `looksNegative`, which matched key tokens (`no`, `not`,
`never`, `immune`, `skips`, `exempt`, …) and desc patterns (`/\bdoes\s+not\b/`, `/\bno\s+effect\b/`,
…). Nothing on the fixture declares it.

Measured on a 12-preset sample adjudicated against the implementing code: **wrong on 6 of 12, and
inverted on the cases that matter.** It missed every genuine absence claim in the sample —
`poisonImmunity` because the token list has `immune` but not `immunity`; `distPenaltyHeroMoM12` on
the phrasing "(no hero exemption)"; all three `lightningResist` presets state their exclusion in
prose no pattern covers. Its one positive match, `longRangeClose` ("no effect"), is a preset that
should *not* be suppressed — see below.

### Ablation-inert is not the same as worthless

The single most useful finding, and the one that would have caused damage if missed. Two presets
are indistinguishable under ablation and completely different in value.

`distancePenalty` (`Calculator/combat_abilities.js:438`) ends `if (longRange && penalty < -10)
penalty = -10;` — a **cap**, which only acts when the penalty is already worse than −10.

| Preset | MoM ladder gives | real line | if written `if (longRange) penalty = -10` |
|---|---|---|---|
| `longRangeClose` (dist 2) | `-10 × floor(2/3)` = 0 | 0, guard false | **−10**, so 1.0 → 0.9 |
| `longRangeMidRange` (dist 5) | `-10 × floor(5/3)` = −10 | −10, guard false | −10, no change |

Both are inert under ablation, so both look vacuous. But `longRangeClose` is the only fixture that
pins the cap's *conditionality*, while `longRangeMidRange` is inert under that mis-implementation
too and its coverage already sits inside `distPenaltyMoM3`. Judging inertness by "would this notice
if the rule were deleted" alone would file both for deletion and lose real coverage.

### What the ablation extractor cannot see

`candidates()` (`tools/preset_vacuity_sweep.js:207`) enumerates only `unit.abilities`, the seven
`UNIT_FIELD_DEFAULTS` fields, the four `IDENTITY_DEFAULTS` fields, and top-level combat toggles. It
never reaches `rtbType`, `rangedDist`, `atk`/`def`/`hp`/`figs`, or anything resolved through
`aUnitName`/`bUnitName`.

So a preset whose real discriminator is a fixture value or roster data reports as unbindable when
it is only unreachable. **Measured: 14 of the 389 are roster-driven, and only 4 of the 42
`key-binds-nothing`** — so the blindness is broader than the roster, and "these are roster presets"
is not the explanation for class E.

### Sibling pairing is cheap evidence

**203 of the 389** have another preset differing in exactly one fixture value that pins a
*different* `expected`. That pairing is the strongest available evidence that a rule is genuinely
under test, and it is mechanically computable — worth handing to any adjudication pass as an input
rather than making each reader hunt for it.

### Corroborations of open backlog items

- `version-dead` (a named feature inert in *every* preset of its version, so the version does not
  implement it or hides its control) reaches backlog F180's finding from the preset side. Two of
  F180's five keys appear — `destruction` (MoM 1.31) and `supernatural` (CoM 1). `bless`,
  `ccFireBreath` and `immolation` do **not**, meaning some preset in those versions does move them.
  The two sweeps measure different populations, so this is a discrepancy to reconcile when F180
  runs, not proof either is wrong.
- `combat.warpReality` is version-dead in Warlord. F190 has since run: the Immolation arm went, its
  fixture with it, and two replacements arrived — a Warlord absence fixture (still inert, declared)
  and a MoM one that is ablation-live. Re-measure before trusting the version-dead line.
- The one version-difference subgroup whose members share a single expectation is
  `{landLinkingRangedCoM, landLinkingRangedCoM2}` at `0/2` — what F75 recorded.

### A vacuity mode no backlog item covers

`expectationsAtHpCap`: **64 presets** state an expectation at or above the defender's whole
hit-point pool, so they cannot distinguish the true total from any larger one. A preset expecting
20 against a 20-HP pool passes whether the answer is 20 or 200. None of classes A–F sees this and
no F68–F79 item is scoped to it.

`roster-shadowed` and `hp-cap-hides` both returned empty this run.

### Two rules with no home

Both came from the deleted `Calculator/CLAUDE.md` and will stop being re-derivable when
`Deprecated BACKLOG.md` is deleted.

1. **The ablation standard**, surviving only as a quotation in `tools/preset_vacuity_sweep.js:7`:
   "prove the expected result changes when the feature is removed; otherwise the preset is not a
   regression test." It is what makes the `presets` suite an authority rather than a set of numbers
   that happen to hold. Note it is positive-only and says nothing about presets asserting an
   absence. An earlier entry recorded this as filed in `PROPOSALS.md`; checked 2026-08-29,
   it is in neither `PROPOSALS.md` nor any binding document. Not proposed.
2. **The adjacent-defect bound**, reconstructed from its ~10 citation sites across the deprecated
   backlog — a test for when a discovered defect folds into the current item versus gets filed
   separately: (1) is it in code this item touches, (2) does a source cite it, (3) is there a preset
   that fails before and passes after, (4) would the fix move numbers outside the item's declared
   version scope. No home anywhere. Not proposed.

## 2026-08-29 — Backlog-to-SPEC evaluation: rulings made

From evaluating all 46 deprecated-backlog items against the rebuilt `SPEC.md`.

- **F180's `destruction` case is not a gating defect.** Ruled: the control being shown in the DOS
  versions is correct — DOS Destruction exists but is hero-only and therefore unimplemented until
  hero mechanics land, which is M3's blocker. Its tooltip (`Calculator/abilities.js:21`) reads
  "Versions: CoM 2, Warlord", accurate about what is *modelled*. Leaves F180 with four keys.
- **F145, F181, F191 and F131 are settled by SPEC rather than open decisions.** Confirmed:
  F145 by *Architecture* ("Version is a dimension of the model…" plus fail-loud, which together
  give Option A with the halt); F181 and F131's boundary by the fail-loud rule; F191 by the purpose
  section's rule that curses are assumed to have landed, which makes Rust's single control the
  specified behaviour rather than a deviation.
- **The polarity regex is to be replaced by a per-preset declaration**, adjudicated by reading each
  preset against the implementing code. Drafted as TASKS T2, approved, and carried out for
  T2.01-T2.10 on 2026-08-30.

## 2026-08-29 — Where the preset suite's 33 s actually goes; T1 dropped

Measured before deciding T1 (extract `readUnitStats` from the DOM), because its premise was that
headless preset evaluation would be materially faster. Chrome, one page load, all 1122 presets with
`expected`, this 8-core laptop. Two instrumented runs: a wrapped-call profile, and an unwrapped
decomposition of `applyPreset` / `recalculate` / `readUnitStats` / `resolveCombat`. Numbers below
are the unwrapped run except the call counts.

| Segment | Time | Share |
|---|---:|---:|
| `runTests()` end to end | 33.2 s | 100% |
| calculation proper — 2× `readUnitStats` + `resolveCombat` | 7.3 s | 22% |
| rendering the two dist panels | 2.1 s | 6% |
| `refreshAbilityFieldVisibility` | 10.9 s | 33% |
| balance: `onVersionChange`, unit locks, control writes, option repopulation | ~13 s | ~39% |
| Playwright + Chrome + dev server startup | ~3 s | once, not per preset |

Calls per 1122 presets: `refreshAbilityFieldVisibility` 3697, `populateSpecialUnitOptions` 5101,
`clearAbilities` 4500, `recalculate` 1441, `applyAbilities` 2256.

Three consequences.

- **The browser is not the cost.** Startup is ~3 s of a ~36 s single-file run, paid once. A jsdom
  harness would do the same DOM work more slowly than Chrome and come out behind — so "run the
  presets headlessly under a DOM shim" is a speed regression, not a speed fix.
- **~72% of the suite is UI bookkeeping no number depends on.** The axis that costs time is
  *rewriting the full control set 1122 times* versus *handing over a state object* — not
  browser versus Node.
- **A cheaper 20–25% exists and was not taken.** `applyPreset` runs the visibility pass 3.3× per
  preset where once at the end would do. Note `updateTypeVisibility` clears version-gated control
  values (`Calculator/ui_abilities.js:498`), so it is the enforcement point for INV-2 — it can be
  run once, not skipped.

Also found while scoping: the `deriveUnitStats` input record is written out as a literal in four
places — `Calculator/ui_card.js:63`, `Calculator/ui_matrix.js:182`, `Calculator/ui_matrix.js:263`
and `tools/unit_checks/assertions.js:67` — and they have drifted. `baseUnitInput` carries
`unitType` and `chaosChannels`, which no other copy has, and omits `identity`, `hurricane`,
`poxHost`, `generic` and `enemyEyeOfHeaven` from its defaults. Unfiled.

Outcome: T1 dropped on the user's call, the speed gain not being worth the price. Two sentences of
`SPEC.md`, *Architecture* did not survive that: one asserting calculation correctness is tested
headlessly (the `PRESETS` authority runs in Chrome), one calling a browser-only calculation a
structural defect (which would re-file T1). Deletion of both proposed in `PROPOSALS.md`. The two
sentences before them stand — the DOM-free calculation layer is what the matrix worker and
`node_unit_checks.js` both rest on, and nothing lints it.
