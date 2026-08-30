<!-- Tier: JOURNAL. Working notes, findings, provenance, handoffs. Written and pruned freely.
     Never authoritative: treat an entry as a lead to re-verify against the code, not as a reason.
     See global CLAUDE.md. -->

# Journal

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
- `combat.warpReality` is version-dead in Warlord, carried by exactly the two fixtures F190 names
  as needing re-aiming or dropping if the Immolation arm goes.
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
