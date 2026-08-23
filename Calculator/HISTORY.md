# Calculator work history

Short index of completed calculator work. Behavior lives in `SPEC.md`; implementation evidence
lives under `Reference docs/`; benchmark comparisons live in `DUAL-AGENT-BENCHMARK.md`. Detailed
pre-2026-08-10 narratives remain recoverable from git history.

## 2026-08-23

- **F130 retired — the two open dispositions were rulings, and they are now in `SPEC.md`.** The
  user ruled that both classes the re-measurement isolated already satisfy *Versions* invariant 4,
  and that neither gets code. A read whose only consumer is an `abilityStep(...)` with a cited
  `STEP_VERSION_SCOPES` entry is inert because `filterStepsToVersionScope` drops the step, and the
  invariant is about the effect, not about whether the expression evaluates; `COMBAT_VERSION_SCOPES`
  is for effects implemented purely in combat resolution, so an entry beside a step scope would be
  a second home for one fact. An exact inline version test in the same expression is a gate and
  need not become a table lookup. Both are written beside invariant 4 under the census's own
  disposition names, `step` and `adjacent`, so a later census round does not re-flag 21 of the 32
  remaining sites; the `consumer` class (7 sites) was already settled by measurement. What was left
  is not the original item, so F130 leaves the backlog and its three residues are filed with their
  evidence: **F157** the three live leaks (Blazing March gate, Spirit Link *delete* — its path is
  unreachable for `com2*` — and Destroy Mechanical, blocked on Q29), **F158** the touch keys'
  missing per-key scope, which is where the Dispel Evil leak actually lives, plus the three
  dynamic-key read sites and the absent mirror-image sweep, and **F159** the 43 unasserted
  all-version keys. Documentation only; no number moves.

- **F155 — the intermittent page-load timeout stayed unreproduced; the harness got a margin fix
  and a diagnosis.** Two of the row's supporting claims were false. With `workers: 1` Playwright
  runs files in path order, so `tests/chaos-conjunction-f39.spec.js:4` is test **4 of 130** —
  immediately after `blur-global.spec.js`, about 10 s in — not the spec following the CPU-bound
  `presets.spec.js`, which is test 86; and "every resource returned 200" excludes nothing, because
  `SimpleHTTPRequestHandler` writes its status line before the body and a connection never
  accepted logs no line at all. **It did not reproduce** in ~344 page loads: two full suites, 14
  fresh `blur-global`+`chaos-conjunction` runs and 30 tests under six busy cores. Three candidates
  are excluded by measurement — CPU starvation (with six cores busy the wait after `page.goto`
  stayed ≤ 347 ms over 35 loads), ephemeral-port exhaustion (TIME_WAIT peaked near 4 000 of the
  16 384-port Windows range) and network stalls on a healthy run (5 879 new connections, connect
  p99 3 ms, max 5 ms). Since `page.goto` resolves on `load` and `collectState` is a top-level
  declaration in a classic blocking script, the symptom can only be a script that never executed.
  **The one marginality found is the dev server's connection model, and the change to it is a
  margin fix, not a proven cause.** `tools/nocache_server.py` ran HTTP/1.0 with no keep-alive —
  one TCP connection per resource, 5 879 per suite run — into a 5-deep accept queue, while Chrome
  opens six connections per host. Lowering the backlog locates the cliff between 3 and 5: at 1,
  connects stall 507–1 007 ms on `ui_state.js`, `ui.js` and `ui_matrix.js`; at 3, 25 of 1 410
  stall over 200 ms; at the shipped 5, none of 5 879 do. A SYN dropped past Windows' retry limit
  fails the fetch outright, which is the missing-script shape — but that never happened at
  backlog 5 under measurement, so the mechanism is capable and thin-margin rather than
  demonstrated. The handler now sets `protocol_version = 'HTTP/1.1'` with `timeout = 5`, taking a
  30-test segment from 1 410 new connections to 147 and from 60 s to 34–37 s; the full suite is
  unchanged at 3.3 m, because page loads are only ~20 s of it. The idle keep-alive close that
  `BaseHTTPRequestHandler` reports through `log_error` is suppressed by name, so the run log keeps
  no false lead. **So a recurrence explains itself**, `openCalculator` now waits 15 s rather than
  the whole test timeout and, on expiry, reports `document.readyState`, `typeof collectState`, the
  response count, every failed request with its `net::` error, the console errors and a
  `requestAnimationFrame` liveness probe. Verified by routing an abort onto `ui_state.js`: the
  report names that file and `net::ERR_FAILED`, `readyState: complete` and `collectState:
  undefined`. Checks: `node tools/node_unit_checks.js` 14385/14385, 0 failures; `npm run
  provenance` 271 formulas, 271 verified, 0 UNVERIFIED; `npm test` 130 passed, 3.3 m — run before
  the log suppression, which moves no test and was re-checked with the 30-test segment, 30 passed
  and no non-200 line in the server log.

- **F130 (round three, partial) — the re-measurement found seven leaks the sweep had scored
  inert, and three are closed.** The row asked for 34 mechanical scope entries. Re-running the
  instrumentation — rebuilt from `tools/js_lexical_scan.js`, reproducing the first pass's 399
  sites and its 178-site/68-key all-version group exactly — found **36**, and 36 again against
  `413b7aa`, so the 34 was a miscount rather than drift. The first pass had never written the
  list down; the [census](../Reference%20docs/Version%20gating%20census.md) now enumerates all
  32 that remain, by file, line and disposition. **The premise that mattered was the other one.**
  "The sweep reports 0 and 0" was being read as "no leaks remain", but the sweep compares six
  numbers over shapes whose defender is never Fantastic Death/Chaos and never carries Weapon
  Immunity, and whose attacker never carries Illusion or a touch attack — so any effect keyed to
  one of those was scored inert by construction. Probing those shapes found **seven** hidden
  controls that move a number. Fixed here: `blackChannels` (MoM-only bit `0x00000010`, granting
  Cold/Illusion/Poison/Death Immunity in all three CoM engines, 24 to 12 against an Illusion
  attacker), `bloodLust` (CoM-plus bit `0x00000004`, making a MoM unit undead and so Death-immune,
  14.39 to 12), both through new `COMBAT_VERSION_SCOPES` entries on their existing
  `PROVENANCE` anchors; and `eyeOfHeaven`, a Warlord combat enchantment granting Illusion
  Immunity in the four other engines and stripping Vertigo there, gated inline at `stats.js` and
  `stats_identity.js` on `UnitCalcPre.CAS` 1839-1841 plus the absence of any `EyeOfHeaven`
  identifier in the CoM2 1.05.11 base script set. `applyMagicImmunityCurseGating` takes a
  `version` for that arm alone. **Left open, with reproductions**, and filed the same day as
  F157 and F158 when F130 retired: `blazingMarch`, `spiritLink` — the negated read the row
  flagged, leaking exactly as predicted and additionally dead in a path `com2*` never reaches —
  `dispelEvil`, whose real leak is the dynamic-key `placedTouchValue` read, and
  `destroyMechanical`, which needs two hidden keys and waits on Q29. The two disposition
  questions this round refused to decide — ten sites already scoped through
  `STEP_VERSION_SCOPES`, eleven carrying an exact inline version test — were rulings for the
  user, and are settled in the entry above.

- **T14 — the shared attack slot is keyed `shared`, not `legacy`.** The DOS engines' one
  `.ranged` field is permanent in all five versions (`SPEC.md`, *Deliberate deviations*), so the
  `legacy` key carried exactly the deprecation implication [T9](#2026-08-22) removed elsewhere;
  `shared` is what the surrounding code already said (`sharedAttack`, `secondaryHitField`).
  Renamed by sense, not by pattern: 39 occurrences across `steps.js` (`STAT_DERIVATION_SLOTS`
  key), `stats.js` (`slotKey`, `projectTraceToSlot`, `LEGACY_HIT_FIELD` → `SHARED_HIT_FIELD`),
  `stats_sequence.js`, `ui_state.js`, `SPEC.md`, the F150 row, both roster generators'
  docstring headers, `tools/unit_checks/{phases,derive_unit_stats}.js` and *Attack-type
  predicate inventory*. The row's stale line numbers were re-located by uncapped search, which
  also found four sites the row did not list (`ui_state.js`, two more `stats.js` comments, the
  inventory's six). Left alone as other senses: `legacyUnitTypeFrom*`, `legacyLightDark`,
  `legacyApply`, the v1 state/preset readers and the clipboard fallback. Naming only: the 1080
  browser presets returned a byte-identical damage fingerprint before and after, and
  regenerating both rosters left `units_com2.js` and `units_warlord.js` unchanged.

- **F148 — the Life Steal benefit metric with the unreachable consuming arm is gone.**
  `collapseTouchOutcomes` (`combat_fear_and_touch.js`) chose between the modern benefit
  (`healedDamage` + `bonusHpBenefit`) and `legacyLifeStealBenefit` on a fourth argument its five call
  sites only ever passed as `statefulCombatHealing` or the literal `true`. Re-measured before acting and
  the premise held: `usesModernCombatHealing` and `usesDosCombatHealing` partition `ENGINE_VERSIONS`
  (`steps.js`), so the predicate is true in all five, and a version outside them cannot reach combat at
  all because `statChain` (`stats_manifests.js`) and `normalizeDosCombatHealState` (`engine.js`) both
  throw on one. Two further confirmations: `sequenceTouchApplyAttacks` builds path objects that carry no
  `legacyLifeStealBenefit` field, so the deleted arm would have read `undefined` there, and the field was
  seeded 0 and incremented by `statefulCombatHealing ? 0 : heal.rawDrain`. Deleted rather than renamed:
  the field, its seed and three accumulation sites, the arm and the now-unused fourth parameter at all
  five call sites. Folded in: an unused `modernCombatHealing` local in `repeatTouchAttack`, dead at `HEAD` before
  this change. **Left in place and filed as [F154](./BACKLOG.md):** the two comments the item proposed
  deleting still describe three surviving `!statefulCombatHealing` arms in the same two functions, so
  removing the prose without the code would have left them unexplained.

  **Checks.** `node tools/node_unit_checks.js` 14374/14374, 0 failures; `npm run provenance` 271
  formulas, 271 verified, 0 UNVERIFIED; browser `runTests()` on the no-cache server 1080 presets,
  `allPassed` true, 0 console errors — every preset asserts exact numbers, so no number moved.
  `npm test` deferred to the round’s single run.

- **F149 — the intermittent persistence-reload failure was the test's wait condition, not a lost
  write.** `tests/persistence.spec.js:24` waited on `!!localStorage.getItem('pageState_v2')`, which
  any earlier debounced write satisfies. Measured directly: with a 400 ms stall injected after the
  `gameVersion` step, the blob at that point holds `{ gameVersion }` alone — the observed failure
  diff exactly — and the existence wait returns on it, so the reload restores it. The same probe
  showed the app writing the complete seven-id blob 250 ms after the last change with no further
  input, so nothing is lost; the reload merely preceded it, and the app side is unchanged. The wait
  now decodes the blob and requires its ids to equal the ones just collected, which still fails on a
  genuinely lost write by timing out. `tests/share-link.spec.js` builds its link synchronously and
  has no wait of this shape; the one in `tests/modifier-trace-tooltips.spec.js` wants any write and
  restores nothing, so both were left alone. Rates measured identically on the deterministic stall
  harness: existence wait 5 of 5 failing, content wait 0 of 5; `tests/persistence.spec.js` under
  `--repeat-each=5 --workers=1` was 0 of 5 before and after, the idle machine not reproducing it.
  Checks: `node tools/node_unit_checks.js` 14374/14374; `npm run provenance` 271 formulas, 271
  verified, 0 UNVERIFIED; `npm test` 130 passed.

- **F152 — `modern-riders.spec.js` F25 re-expected: F141’s model is right, and the assertion it
  broke had never tested the rule it is named for.** Re-read from the sources rather than from
  F141’s summary. `ApplyAttack` leaves early only on `figs <= 0` ($005B19D9, and again at
  $005B297F); its rider loop is gated `if not (at in [ATDoomGaze, ATDeathGaze, ATStoningGaze])`,
  and each of the six blocks tests the attacker’s rider flags and the defender’s immunities alone
  — no strength, base or calculated. `PerformMeleeAttack` then issues `ApplyAttack(au, du,
  ATmelee, LivingFigures(au), ...)` unconditionally, where Thrown and Breath are gated `> 0` and
  Ranged on `ammo > 0`. So a 0-attack gaze attacker still makes a melee call and still runs the
  riders there, which is the direction of the failure: F141’s more permissive gate let the melee
  call carry the riders, the melee phase gained damage, and the old total-damage equality flipped
  true to false. The exclusion F25 is named for lives in the gaze phase, not in
  `touchAttackFires`, and F141 never touched it. Two further defects surfaced. The fixture’s
  `stoningGaze: 9` and `deathGaze: 9` were the wrong sign — these are signed resistance
  modifiers where negative is stronger, and the CoM2 roster carries `Stoning Gaze=-3/-4` and
  `Death Gaze=-3/-4` against the positive-damage `Doom Gaze=4` — so four of the six modern rows
  ran an inert gaze and compared no damage against no damage; that assertion would have passed
  with the gaze rule deleted. And the rule is implemented twice in series, so neither copy is
  individually ablatable: filed as F153. The rows now read the gaze *call* rather than the combat
  total, assert it is unchanged by the riders, and carry both halves of the control the old shape
  lacked — the gaze must resolve something, and the same riders must visibly move the melee call.
  Confirmed by ablation: with both suppression copies lifted the new assertion fails where the old
  one passed. F141’s six re-expected Warlord presets did not move. Verified with
  `node tools/node_unit_checks.js` (14374 assertions), `npm run provenance` (271 formulas), the
  1080-preset browser suite, and `tests/modern-riders.spec.js` 2/2.

- **F134 — the trace overlay keeps its hover owner across a page-wide reset, so a
  stationary-pointer tooltip refreshes instead of staying hidden.** The row’s premise held and
  reproduced exactly, but neither cause it proposed was right. A scratch probe isolated it in two
  runs: with the pointer stationary and a 400 ms gap after the hover the test failed, `#tt` at
  `display:none` carrying the row’s quoted pre-update text; warming the version’s default-state
  cache before the hover, same pointer state and same gap, passed. So no `mousemove` is involved,
  and a programmatic `recalculate()` does preserve the hover owner. The cause is the 250 ms
  debounced `scheduleSaveState`: against a cold cache its `collectState()` calls `getDefaultIds`,
  which resets the page to the version’s defaults — ending in a `recalculate()` that leaves
  `#aAtkMod` with no trace — snapshots, then restores. `showTrace` deletes `data-tooltip` and calls
  `refreshVisibleTooltipForElement`, and `renderActiveTooltip`’s no-text branch ran `hideTooltip()`,
  which also nulls `activeTooltip`. The restore returned the trace but the owner was gone, so no
  later refresh could re-show it. `ui.js` now separates dismissing — the pointer left, hide and drop
  the owner — from concealing — the owner is still under the pointer with nothing to say, hide only
  — and only the refresh path conceals. The test no longer leaves the reset to timing: it waits on
  the debounced write, then requires the overlay to have survived it, so the reset falls inside the
  assertion rather than beside it. Measured with one command both ways, `--repeat-each=5`: 5 of 5
  failed before, 5 of 5 passed after. The structural alternative — deriving a version’s defaults
  without touching the live DOM, which ends the whole class of latched transients rather than this
  one observer — was not taken and is filed as F151. Verified with `node tools/node_unit_checks.js`
  (14374 assertions), `npm run provenance` (271 formulas) and `npm test` (130 tests, 129 passed,
  4.5m); its one failure is `modern-riders.spec.js` F25, which reproduces with this change stashed
  and bisects to F141, filed as F152.

- **F127 - a CoM2/Warlord fixture now states its attack channels with `modernAttacks` alone, and
  the record-level Warlord gates read the record's Ranged field instead of the legacy slot.** The
  row's premise was re-measured first and is substantially falsified: repeating its experiment -
  migrating every pair-side and diffing all 1080 rendered presets - moved **4 presets, not 24 of
  1050**. Cause (a), the melee-initiation guard, no longer exists (F142 retired it); cause (b),
  `breathExists`, is unreachable for CoM2 because `hasThrown` comes from `modernAttackChannels`;
  and the Focus Magic half of cause (c) moves nothing. What did move was cause (c)'s Warlord half:
  `alumniOfAcademy` and `energyCannon` were taken off `recordContext`. Both gates read the
  **permanent record's Ranged field** - Alumni of Academy tests its projectile type
  (`GetStat(U,SRangedType,1) > 29`, `CreateUnit.CAS:462-464`) and Energy Cannon its Max Ammo, which
  `SPEC.md` infers from that same field - and which slot holds that field is record structure: in
  `Caster.exe` it is `SRanged`, the modern `ranged` channel, and in the DOS engines it is the shared
  slot. Both now resolve it per version, `energyCannonThreshold` reads `hitchanceranged`
  (`UnitCalc.CAS:1435-1443`) rather than the legacy `toHitRtb`, and the conversion's +50% strength
  write follows the same slot so it cannot disagree with its Destruction rider. With that in place
  the migration moved **nothing**: all 189 pair-sides became `modernAttacks`, `rtb`/`rtbType` were
  dropped, and the census reports 195 `modernAttacks` sides and 0 pair-sides over 1124 modern custom
  sides. `dosPairAsModernChannels` is retired and `applyPreset`'s reject
  (`assertFixtureMatchesVersionRecord`) now covers the attack record in both directions, so a modern
  fixture naming `rtb`/`rtbType` and a DOS one naming `modernAttacks` both halt. The Lightning Blade
  finding was re-measured too and is real but differently shaped: the write lands on the legacy slot
  as `thrownType: 'lightning'`, not as a conventional ranged volley. That arm and the `combat.js`
  fallbacks behind it survive only for callers that supply no `modernAttacks` at all - over 9000
  such calls from `tools/unit_checks` alone - so they are filed as F150 rather than folded in.
  Verified with `node tools/node_unit_checks.js` (14374 assertions), `npm run provenance` (271
  formulas) and the browser preset suite (1080/1080) before and after.

- **F126 - the DOS per-channel attack-attribute masks need no calculator input, because no unit
  record can set one.** The row's first half is settled without an `LBX` read, and the answer is
  structural rather than statistical. `Load_Battle_Unit` imports `0x24` bytes from
  `&unit_types[type].Melee` into `bu+0x00..bu+0x23`, so the window closes before
  `melee_attack_attributes` (`+0x28`) and `ranged_attack_attributes` (`+0x2A`), and it then zeroes
  both at `131:0x8EB26`/`0x8EB2F`; only the unit-wide mask at `+0x1E` is inside it.
  `BU_Apply_Hero_Items` zeroes the pair again at `131:0x8DBEA`/`0x8DBF3`, after which the only
  writers in any of the three builds are `BU_Apply_Item_Attack_Specials` (equipped hero items,
  `0x8DE54` melee / `0x8E004` ranged) and the `0x4000` Eldritch Weapon / Mystic Surge OR, which is
  none of the four bits. All four consumers are hero-item-only, and hero equipment is not a
  calculator input, so `SPEC.md` gains that non-goal and the consequence rather than the calculator
  gaining a roster column or a card control. Two premise corrections: the row's "no code names it"
  is false - `dosChannelTouchModifier` (`combat_phases.js`) already applies the Stoning Touch
  **-1** and Death Touch **-3** exactly, asserted in `tools/unit_checks/phases.js`, and is merely
  unreachable because `touchFlagRecords` has no DOS producer; and the always-full-strength
  automatic-damage arm is right in **all three** builds for every expressible input, not only in
  CoM 1, because the inner test reads the channel word. Two consumers stay unmodelled with a stated
  reason (CoM 1 Life Steal `-2` on channel Illusionary; the MoM/CP halving), and a fifth the row did
  not name is recorded: `Battle_Unit_Attack_Immunities` grants Illusion from the channel word at
  `131:0x99191`/`0x99282`. Producer-side evidence is in
  [R6.1h.evidence.md](../Reference%20docs/DOS%20reconstructed/R6.1h.evidence.md). Documentation
  only - no calculator source changed, and all five versions are unmoved.

- **F130 (round two) - resolution-time version scope gets a cited home, and the fourteen leaks
  close.** Round one measured; this built the mechanism. `COMBAT_VERSION_SCOPES` (`steps.js`) is
  to combat resolution what `STEP_VERSION_SCOPES` is to the step sequences: the single home for
  which engines have an effect at all, keyed `resolution:<formula id>` and asserted **equal** to
  that formula's `PROVENANCE versions=` — exact equality, not the subset-plus-declared-gaps the
  phase tables allow, because every entry here was authored with its citation. `combatEffectInVersion`
  throws on an unknown id instead of defaulting to "applies everywhere", which is the ungated read
  the table exists to remove. Eight reads now gate through it — `rulerOfUnderworld` in
  `hasWeaponImmunityEffect`, the Weapon-Immunity preserve arm, `hasNonCorporealEffect` and
  `wraithFormBypassesWI`; `rage` in `applyRage`; `bloodLust` in `bloodLustMeleeAttack`; and the
  Eldritch Weapon / Mystic Surge pair in `buildToBlockContext`, whose `version = null` default went
  with them. The sweep reports **0 and 0** where it reported 1 and 14.
  **The scope is not the def table.** A control's `subgroup` states UI visibility, and the DOS
  engines make the difference load-bearing: they repurpose enchantment bits between builds, so
  `0x00200000` is Eldritch Weapon in MoM and Mystic Surge in CoM 1, and `0x00000004` is Berserk in
  MoM and Blood Lust in CoM 1. The reconstruction already recorded it as an alias
  (`unitcalc.c:51`). CoM 1's -10pp To Block is real and reached through Mystic Surge; the Eldritch
  Weapon read firing there was a second name for the same write. Gated rather than aliased: one
  name means one effect in every version, and the shared storage is the citation for why the two
  are distinct. Two anchors were authored for effects that had none —
  `eldritchWeaponEligibility` (`unitcalc.c` 838-846) and `rulerOfUnderworldEligibility`
  (`Units.RecalculateUnits.pas` 1512-1517 and 621-625), digests generated by
  `tools/rebind_provenance_anchors.js`, taking the audit from 269 formulas to 271.
  Folded in: `runToBlockChecks` (`tools/unit_checks/derivation_stages.js`) asserted Eldritch Weapon
  and Mystic Surge on one fixture with no version passed — a combination no engine can produce —
  and is now one arm per engine. **Remaining in F130:** the 34 reads whose out-of-scope value is
  discarded downstream, and the 43 all-version keys whose cross-version identity is asserted
  nowhere. Evidence: [Version gating census.md](../Reference%20docs/Version%20gating%20census.md).

- **F130 (partial) - the version-gating census, and the sweep that was understating it.** The round
  set out to choose between per-site and structural gating; the measurement changed both the scope
  and the source of truth. Instrumenting all 399 ability reads in the computation layer and
  executing them — syntax cannot see gating that is transitive through a caller guard or through
  `filterStepsToVersionScope` — found **38 reads with no version test and 4 wider than their
  control's scope**, of which **8 move a number**, against the four the row named. Two findings
  reshaped the item rather than closing it. First, `tools/hidden_control_leak_sweep.js` set the
  probed key on the **attacker only**, so `rage`, which scales with figures already lost and is
  therefore observable on the counter-attacking defender, moved four versions' numbers unreported;
  the tool now probes both sides and reports **14** resolution leaks where it reported 10. Second,
  the DOS engines **repurpose enchantment bits across versions** — `0x00200000` is Eldritch Weapon
  in MoM and Mystic Surge in CoM 1 (`R6.1a.evidence.md`) — which is why CoM 1's −10pp To Block is
  real and already correct via `mysticSurge`, and why a gate derived from a control's `subgroup`
  would have encoded visibility as though it were implementation. The five all-five-version keys
  whose step scope is narrower (`animated`, `combatSummoned`, `eternalNight`, `raiseDead`,
  `trueSight`) were each checked against sources and **none is a contradiction**: a step is not the
  only place an effect can be implemented. Landed here: the corrected sweep, and the derive tier as
  a standing check (`tools/unit_checks/hidden_control_gating.js`, ~8s) asserting the hidden-control
  leak set against a declared worklist, so a new leak fails the suite and a fixed one must be struck
  from the list. The gating mechanism itself stays in **F130**, which now carries the eight reads,
  the requirement that scope come from a cited computation-layer table rather than the def table,
  and the blocking sub-task of authoring the two missing `PROVENANCE` anchors. Evidence:
  [Version gating census.md](../Reference%20docs/Version%20gating%20census.md).

- **F142 - script-sourced melee writes lose the dead-slot gate, and the calculator's terminal melee
  zeroing retires with it.** The row asked which way to set a per-step flag on two CAS blocks. The
  enumeration it called for settled the evidence — all 53 `SETSTAT(<unit>,SAttack,…)` writes in the
  Warlord 1.5.12.7 script source are ungated, the corpus contains exactly one melee-presence test
  (`UnitCalcPre.CAS:1068`, which gates a *Thrown* grant), and three blocks gate their own secondary
  channels while writing melee unconditionally in the same breath (Rust `UnitCalc.CAS:495`/`:499`,
  Colossal Strength `:1233`/`:1235`, Vampirism `:1251`) — but it also **falsified the row's
  framing**: the behavior did not live in the per-step flag at all. A second, unsourced copy of the
  rule sat in `e:clamp`, zeroing melee for any unit whose permanent melee was 0, where the compiled
  tail is `if U.attack < 0 then U.attack := 0` (`Units.RecalculateUnits.pas:2483`) — a floor. With
  that pass in place the row's own option would have been half inert. The zeroing is gone, melee is
  floored like the engine floors it, and the eight script-sourced melee writes (`b:luckyStar`,
  `b:prayer`, `b:tactician`, `b`/`base:rebuild`, `base:artificer`, `base:malnourished`, `d:rust`,
  `d:colossalStrength`) each cite the script line showing the ungated write. Compiled blocks keep
  `B.attack > 0` per site.
  - **Folded in, by the user's decision rather than filed:** `hasMeleeAttackAt` carried
    `|| marionetteAttackBonus > 0 || trueLightCreatesMelee`, two holes punched to let those ungated
    script writes create melee. One predicate serves every melee gate in a run, so the holes also
    un-gated the compiled blocks. Measured on a permanent-melee-0 Warlord unit: True Light + Holy
    Bonus 3 gave melee **4** where `if B.attack > 0` (`:2530`) forbids the increment and the answer
    is 1; + High Prayer gave 3. Marionette (Wanderer, Base Skill 90, +3) gave **6** and 5 where the
    answer is 3. Both holes come out with the mechanism that needed them; all four cases now give
    the engine's number. It belongs to F142 because it is the same rule and the same lines.
  - **Also required by the retirement:** `c:level`'s melee step was written unconditionally and had
    been relying on the zeroing to suppress it. Both engines do gate it — modern
    `if BaseUnits[i].attack > 0` (`$00598754`, `:543`), DOS `if (bu->melee > 0) bu->melee++` at every
    step of both ladders — so each is now transcribed at the step. Nine presets (the gaze and
    experience ladders) were red on this alone before it was written.
  - Fifteen Warlord presets re-expected, each derived from the engine model before being compared to
    output; two added — `luckyStarCreatesMeleeWarlord` (the rule) and
    `luckyStarCreatedMeleeSkipsCompiledAuraWarlord` (that created melee does *not* open the compiled
    blocks). The secondary slots keep their own terminal zeroing: which slots a record carries is a
    separate question (F122, F135) and stays out of scope.

- **F141 - the modern touch-rider gate no longer reads the card's base channel, because no engine
  reads one.** `touchAttackFires` (`combat_special_attacks.js`) returned `(baseAtk || 0) > 0` for
  `com2_1.05.11` and `com2_warlord_1.5.12.7`; `Caster.exe` makes no such test at any layer.
  `ApplyAttack` leaves early only on `figs <= 0` (`$005B19D9`) and each of its six rider blocks is
  gated on the attack type, the attacker's rider flags and the defender's immunities alone
  (`$005B2994..$005B2E6F`); `PerformMeleeAttack` issues both melee calls unconditionally and gates
  Thrown and Breath on the **calculated** `Units[au].thrown|firebreath|lightningbreath > 0`, while
  `PerformRangedAttack` gates only on `ammo > 0`. Of the row's three candidates the evidence forces
  **`true`**: the calculated-channel test is the phase-admission gate the calculator already
  carries in `modernAttackChannels`, and no per-call strength test exists to replace it with. The
  predicate now takes `(effectiveAtk, version)` - the base parameter is gone, so no caller can
  reintroduce a card read - and it carries `PROVENANCE[touchDispatcherAdmission]`, the anchor the
  row said was missing, citing all five versions from `combat.c`, `Combat.ApplyAttack.pas` and
  `Combat.PerformAttacks.pas`. The three DOS arms are unchanged and were measured unchanged.
  `buildThrown`'s `isCoM2 ||` short-circuit is deleted as redundant.
  **Folded in, because the predicate change forced it:** Immolation's phase table. Its three rules
  lived in three places (`immolationBlocksRanged`, a `!isCoM2` gaze idiom, and the thrown gate's
  reuse of `touchAttackFires`), and the comment on the first was already stale about gaze. They are
  now one `immolationFiresInPhase(version, phase)` carrying the citation. That fixes a live defect:
  `Caster.exe` runs Immolation under a single `at = ATmelee` test (`$005B24D8..$005B253A`), so
  modern Thrown carried it only through the base-channel gate, and flipping that gate to `true`
  would have made it unconditional. The ranged and gaze arms are behaviour-identical.
  **Numbers moved, all Warlord and all within the row's declared scope.** Six existing presets
  encoded the removed gate and were re-expected from the engine model, not from the new output:
  `focusMagicMovesDeathOffBreathWarlord` 0 -> 8.000 (the melee call carries the Focus-Magic-moved
  Death Touch; a Breath that carried it too would give 9.6, so the Breath exclusion is still what
  the number measures), `stoningTouchMultipleModernChannelsWarlord` 16.000 -> 24.000 (three rider
  attempts, not two; melee alone is 8.0), `revenantDeathTouchOnThrownWarlord` 5.000 -> 7.500
  (Thrown and melee both roll Death 0 vs Res 5), `revenantGrantsUndeadImmunityWarlord` `dmgToA`
  0 -> 10.000 and `venomGrantsPoisonImmunityWarlord` `dmgToA` 0 -> 1.000 (each defender's own
  rider now rides its unconditional counterattack at melee 0; both subjects are `dmgToB` 0, which
  is unchanged), and `upgradedExplosiveFireWarlord` 15.000 -> 16.000 (Blackpowder Poison rides the
  melee call as well; its "dropping Explosive" note is re-measured at 9.0).
  **Coverage.** Three new presets, each confirmed red before the change and green after:
  `stoningTouchMeleeAtkZeroCoM2` and `...Warlord` (card `atk 0`, Stoning -7 vs Res 0 -> 10.000
  where the unfixed gate gave 0), and `immolationNotThrownCoM2` (7.000 where the unfixed gate gave
  10.000, the missing 3.0 being the Thrown Immolation volley the engine never fires). A fourth,
  `stoningTouchMeleeAtkZeroMoM`, holds the MoM 1.31 arm at 0.000 - the abort really is an
  exclusion the engine makes - and pairs the three in a new version-difference subgroup.
  `SPEC.md` is unchanged: it specifies no attack-strength gate for touch riders.
  **Checks.** `node tools/node_unit_checks.js` 14336/0 and `npm run provenance` 269 formulas, 0
  UNVERIFIED, both green; the full 1,078-preset browser suite was run headlessly and passed with
  no page errors. The round's single `npm test` is deferred to the end of the ten-package run.

## 2026-08-22

- **T12 — the two dead lookup tables are gone, and the CoM2 roster's Ranged column names its
  projectile again.** `RACE_NAMES` (`Calculator/data.js`) had no reader: an uncapped scan of the
  whole repo including ignored directories returns 14 lines — the definition, the backlog row, and
  the two roster generators' own separate `RACE_NAMES` tables, which are the live home. Nor is it
  reachable indirectly: a top-level `const` is a property of neither `window` nor the Node vm
  context, and the suite's one `eval` (`tests/fail-loud-f113.spec.js`) names none of it.
  `ui_units.js`'s `raceOrder` is the calculator's own live race list and is untouched.
  `RANGED_TYPE` (`tools/generate_com2_unit_roster.py`) is **deleted rather than respelled**: the
  `ranged_type` field already holds the display spelling `tools/ranged_types.py`
  ([F112](#2026-08-21)) and `parse_tweaker_unit_data.py` write, so a second map here could only be
  an identity map. **The row's drift claim was understated and is corrected here:** the table's
  five lowercase keys match *nothing* any of the four roster JSONs carry — `Missile`, `Boulder`,
  `Magic`, `Magic-lightning` for the modern pair, those plus `Magic(C)`/`(N)`/`(S)` and three
  `Gaze(...)` for the DOS pair — and a miss rendered `?`, not the raw token, so **all 78** ranged
  cells in `Unit rosters/CoM2 unit roster.md` read `N (?)`. Regeneration moves exactly those 78
  lines and only their Ranged column, `N (?)` → `N (<token>)` with `N` unchanged: 46 `Magic`,
  23 `Missile`, 6 `Boulder`, 3 `Magic-lightning`, which is the JSON's own histogram. The `?`
  default is now a raise, per `SPEC.md`, *Out-of-range values stop the run*. **One adjacent defect
  was filed, not fixed:** [T15](./BACKLOG.md) — a third `RANGED_TYPE` copy in
  `tools/generate_mom_com2_unit_comparison.py` with the same dead keys, and `breath_str` in both
  Markdown tools reading `breath`/`breath_type`, keys no roster JSON has, which leaves the
  Breath/Thrown column `-` for all 194 CoM2 units. Checks: `node tools/node_unit_checks.js`
  14336/14336; `npm run provenance` 268 formulas, 268 verified, 0 UNVERIFIED; `npm test` **129
  passed, 1 failed** — `tests/persistence.spec.js:24`, filed as [F149](./HISTORY.md) and shown
  independent of this round by reproducing it 3 of 5 times with `Calculator/data.js` restored to
  `HEAD`. **This round did not land green.**

- **T11 — the Chaos Surge fire-breath carve-out is gone; write order produces the exclusion.**
  `c:chaosSurge`'s DOS arm skipped a slot matching `ccFireBreathGranted && ccDosBreathEligible &&
  version.startsWith('mom')`. The engine makes no such test: `unitcalc.c` 131:0x8F142-0x8F165 is
  `if (bu->ranged > 0) bu->ranged += 2` per slot, and the Chaos Channels fire-breath block at
  131:0x8F720 *assigns* `bu->ranged = 2` on the mutation bit alone, after the constructor's Chaos
  Surge at 0x8F113 — so both MoM builds exclude the bonus by order, while CoM 1 calls
  `BU_Apply_Specials` first (com1:0x8F0E8) and keeps it. The arm is now `u[strengthField] > 0`
  alone and that fact lives in the comment beside the step. **Premise held, measured** as zero
  differing cases and zero field differences over 15,480 derivations
  (`tools/derivation_equivalence.js`, `tools/derivation_equivalence_diff.js`) and over a further
  288,000 targeted ones crossing all five versions with the eight slot types, base strengths 0-4,
  the gaze family, three realms, Chaos Surge 0/1/3, two levels, ten slot-writing mixins and Chaos
  Channels on and off. 760 of the targeted cases move the **step trace** only, and toward the
  engine: `c:chaosSurge` now shows the +2 it makes and `c:chaosChannels:fireBreath` the assignment
  that discards it. No derived number moves anywhere, which is why no preset holds this and none
  was invented. Neither flag lost a reader — `ccFireBreathGranted` keeps `stats.js:990`, `:1030`
  and `ccGrantsThisSlot` (`:1249`), `ccDosBreathEligible` keeps `:876` and `:1251` — and no
  document described the carve-out: `SPEC.md` does not name Chaos Surge, and the control tooltip
  states the outcome, which is unchanged.
  **Checks.** `node tools/node_unit_checks.js` 14336/14336; `npm run provenance` 268 formulas,
  268 verified, 0 UNVERIFIED; `npm test` 130 passed, 0 failed.
- **T10 — the three To-Hit/To-Block seeds are one step, and only one of the two named qualifiers
  was one.** **(a) Decision, recorded in [SPEC.md](./SPEC.md), *The step model*: a per-field source
  label is not a reason to keep a split step.** Each To-Hit and To-Block quantity is projected into
  its own `modifierTraces` entry and rendered against its own output element (`ui_card.js`), so two
  fields of one step never stand side by side in one tooltip and the field half of a label only
  restates the output it hangs under. `base:baseMelee`, `base:baseRtb` and `base:baseBlock` are
  therefore one step, `base:baseThresholds`, labelled `Base To Hit / To Block` — the union of the
  three `writes`, the `or` of the three gates, all three halves in one `apply`. `base:baseHitChance`
  stays separate on the opposite ground: a scope row is per `phase:id`, and its citation covers two
  versions where the merged one covers five, so a field the DOS record does not have cannot ride
  along. **(b)** `d:trueSight:ranged` → `d:trueSight`; **`base:survivalInstinctToBlock` keeps its
  name — the row's premise for it is falsified.** `ToBlock` is not a field qualifier the step author
  added: it is the enchantment key itself (`enchantments.js`, `survivalInstinctToBlock`, a Warlord
  numeric control for normal units), which is what SPEC's "an id is the effect a player selects"
  asks for. It also has a sibling the row says it lacks — `c:survivalInstinct`, a separate bool
  control for fantastic creatures with its own citation — so stripping the suffix would assert the
  `c:weakness`/`d:weakness` shape (one effect, two regions) about two different controls.
  Both anchors moved through `node tools/rebind_provenance_anchors.js --write` with hashes
  unchanged (`a9d2d7ce1dec…` for all three merged seeds, `83c4a882bd6e…` for True Sight), so both
  are identity moves and not re-reviews. Two assertions naming the old `sourceId`
  (`tools/unit_checks/step_traces.js`, `tests/modifier-traces.spec.js`) were re-aimed at
  `baseThresholds`; `tests/f20-source-order.spec.js`'s independent Warlord `d` transcription took
  the True Sight rename.
  **Arithmetic is unchanged in all five versions**, measured as zero differing cases and zero field
  differences across 15,480 derivations (`tools/derivation_equivalence.js`,
  `tools/derivation_equivalence_diff.js`). The node check total fell 14,387 → 14,336; the 51 are
  fully attributed to parameterized sweeps losing entities, not to lost coverage — 50 in
  `runCanonicalVersionScopeChecks` (2 scope rows × 10, 10 chain entries × 2, 2 `PROVENANCE` ids × 5)
  and 1 in `runIdentityChecks`, whose `unitType` sweep counts `writes: [...]` literals. Earlier
  entries naming the pre-merge ids ([M13](#2026-08-20), F125 above) record them as they stood then.
  **Checks.** `node tools/node_unit_checks.js` 14336/14336; `npm run provenance` 268 formulas,
  268 verified, 0 UNVERIFIED (270 before: the merge retired two); `npm test` 130 passed, 0 failed.

- **T9 — the "DOS versions" `legacy*` identifiers are `dos*`; six of the row's ten named
  identifiers were a different sense.** Renamed: `legacyThrown` → `dosThrown` and the two gaze
  label maps → `dosAttackerGazeLabels`/`dosDefenderGazeLabels` (`combat.js`); the step, its
  chain entries and its citation `e:legacyClamp`/`PROVENANCE[legacyClamp]` → `e:dosClamp`/
  `PROVENANCE[dosClamp]` (`stats_sequence.js`, `steps.js`, `stats_manifests.js`, trace id
  `chance:dosClamp`); the DOS-sense comments in `combat_state.js` and `combat_phases.js`;
  `charmedPoisonMoM`'s `desc`; `dosResistance`/`highDos`/`lowDos` in `tools/unit_checks/`; and the
  `legacy` locals and report keys naming the three DOS versions in six `tests/*.spec.js` files.
  `dos` was already the repository's term — `SCOPE_DOS`, `usesDosCombatHealing`,
  `dosPairAsModernChannels` — so no new vocabulary was introduced. The anchor moved through
  `node tools/rebind_provenance_anchors.js --write`; its hash is unchanged
  (`e18d529db829…`), so this is an identity move and not a re-review. Earlier entries naming
  `legacyClamp` ([M13](#2026-08-20)) record the id as it stood then.

  **Premise, re-measured and falsified.** The row's census was lexical rather than by sense:
  exhaustively, **288** occurrences in **49 files**, and `[Ll]egacy` is itself not exhaustive —
  it misses the all-caps `LEGACY_HIT_FIELD` and `LEGACY_PAGE_STATE_KEY`, so only a
  case-insensitive sweep counts. Just **4** of the 10 identifiers the row named mean "the DOS
  versions": `legacyUnitTypeFromIdentity`, `legacyBaseRace` and `legacyType` are the
  [M7](#2026-08-20) `unitType` projection the row itself excluded, `legacyLightDark` is the
  superseded `enchLightDark` selector, and `legacyApply` is a step's prior `apply` function. The
  row's `Calculator/`-only footprint was also wrong in both directions: over half the DOS-sense
  work is in `tests/` and `tools/unit_checks/`, and `Calculator/*.md` carries **no** DOS-sense
  occurrence at all — `SPEC.md`'s four are the shared slot, the `unitType` token and the v1 blob.

  **Left alone, by sense, and why.** The shared attack slot key `legacy` is permanent in all five
  versions (`SPEC.md`, *Deliberate deviations*) and is a string key in a designed vocabulary, so
  it carries the same wrong implication but is a separate decision: [T14](#2026-08-23), preferred
  after [F127](#2026-08-23). The `unitType` compatibility projection, the v1 state and
  preset-format readers, the `ui_matrix.js` clipboard fallback and `legacyApply` are not the DOS
  sense and keep their names.

  **One defect found and filed.** `legacyLifeStealBenefit`'s consuming arm in
  `collapseTouchOutcomes` is unreachable in all five versions — [F148](#2026-08-23).

  **Checks.** `node tools/node_unit_checks.js` 14387/14387; `npm run provenance` 270 formulas,
  270 verified, 0 UNVERIFIED; `npm test` 130 passed, 0 failed.

- **T13 — the drift classes are measured, and three of the seven are non-empty.**
  `tools/control_write_census.js` kept reporting 3 split statements; **all three are over-reports
  and 0 are defects.** `setIdentityControlsFromLegacy` and `setIdentityControlsFromUnit` write no
  control of their own, so scoring them asked whether an argument-shaping wrapper states stats;
  `applyUnit` and `setUnit` leave only loadout, battlefield context and the `Unit` selector that
  drove the call, which [F136](#2026-08-22) settled deliberately; and `applyFullState` restores
  every control through `getElementById(<variable>)`, a shape the census could neither resolve nor
  report. The census now looks through pure delegators to the call sites that stand for a
  statement, reports that write shape (**12 unresolved writes, previously 0**), and lists a call
  site holding one as unjudged rather than scoring a floor as a statement.
  **A latent scanner defect fell out of extracting the shared lexer.** `blank()` decided
  regex-vs-division on the preceding character alone, so `return /[",\r\n]/.test(text)` in
  `ui_matrix.js` read as a division and blanked to the next quote: **3,082 characters and 7 named
  functions of `ui_matrix.js` were invisible** to the committed census, and `lexSanity` did not
  catch it because the wipe took the braces with it. `js_lexical_scan.js` now tests the preceding
  *token*. Recovering that region is what let the new sweep reproduce F132 at its full three
  copies, which is the check that it measures the right thing.
  **Non-empty, now filed:** [F145](./BACKLOG.md) 22 duplicate predicates over 611 compound tests,
  [F146](./BACKLOG.md) 7 roster facts with two decoders, [F147](./BACKLOG.md) 6 write-only
  derivation outputs over 51 abilities-map names.
  **Empty by measurement, recorded here so the class is not re-opened by nobody having looked:**
  split statements 0 defects of 3 reported; `deriveUnitStats` argument parity 0 of 43 keys (the 4
  divergent modern channel modifiers default to the 0 the card supplies); dead `<option>` values 0
  of 129; ability and enchantment `calcKey`s unread by a `data-scope="core"` source 0 of 152; call
  sites a comment calls a no-op 0 of 24 comment hits. The one dead-member axis that is not empty —
  4 of 208 flat-vocabulary members — is folded into F147 rather than filed twice.
  Two roster columns nothing reads (`moves`, `upkeep`) were measured and deliberately not filed as
  calculator work — they are generator payload; `ammo` is unread by design (`stats.js:866`) and
  `cost` is read through a computed key (`ui_units.js:99`).
  `tools/js_lexical_scan.js` is the one home for the lexer, `tools/drift_class_sweep.js` the four
  class modes, and the census now takes its file list from `tools/calculator_sources.js` instead of
  a private regex. Both are diagnostics, outside `npm test`, and every mode prints what it could
  not see: these scans are lexical, so a count of 0 is 0 on that axis and never a proof of absence.
  Checks: `node tools/node_unit_checks.js` 14387/14387; `npm run provenance` 270 formulas, 270
  verified, 0 UNVERIFIED. No `Calculator/` source changed, so `npm test` was not run.
- **D41 — the three DOS builds' battle-unit setup routine is fully reconstructed.**
  **The extent premise held; the copy premise did not.** The common far routine is exactly
  `[0x8EAB9,0x8EDFD)`, ending at the `retf` immediately before `BU_Construct`, but it does not
  copy the permanent unit record. `_UNITS[unit_idx].type` only selects the source: `_fmemcpy`
  imports 0x24 bytes beginning at `unit_types[type].Melee`, over-copying the next type record's
  name word into `Combat_Effects` and immediately clearing it. `D41.evidence.md` owns the extent,
  ledgers, byte inventories and build differences; `unitcalc.c` now owns the shared source body.
  The reconstruction also closes the load-bearing Focus Magic gap from F108: CoM 1 floors copied
  ammunition at 4 from the persistent enchantment before the constructor, then applies its two
  raw hero-template ammunition formulas. CP and CoM clamp a depleted record to one surviving
  figure and `hits-1` front damage, while 1.31 leaves the calculated nonpositive figure count;
  CoM additionally initializes `Grey_Hits`, clears the imported Move-Flags high byte, overwrites
  the imported `Attribs_2` high byte from its unchecked nine-entry Level table, and conditionally
  imports current movement for the active battle-unit pointer. Two independent Sol High
  derivations agreed on the bytes; the Opus review found six precision/vocabulary issues in the
  merge, all incorporated, with no semantic disagreement. **No calculator number moves** in
  `mom_1.31`, `mom_cp_1.60.00` or `com_6.08`; this is evidence/source reconstruction only.
  Checks: `verify_dos_derivation.py` over `[0x8EAB9,0x8EDFD)` passed all three builds — 13/14/22
  contiguous rows, 6/7/16 conditional jumps, 3 calls each, 34/36/37 named writes, zero gaps,
  parent mismatches or unaccounted elements; `npm run provenance` 270 formulas, 270 verified,
  0 UNVERIFIED, 23 tooling assertions.
- **F138 — both state-boundary substitutions now halt; version scope keeps its clamp.**
  **The premise held on the behaviour and overstated one caller.** Measured against the unchanged
  code: a saved CoM2 blob whose `ids.gameVersion` read `com2_0.9.0` came back as `mom_1.31`
  carrying the CoM2 state's `aAtk 11`, with nothing on the console — the whole diff expanded
  against another version's defaults. An unrecognised special-unit key restored as `none`, also
  silently. What the row overstated is the preset half: no fixture in any `presets_*.js` supplies
  `specialUnit` at all (exhaustive grep for `specialUnit\s*:` across the repo — every literal is
  `none`, `golem`, `chosen`, `zombies` or `catapult`), so `applyPreset` is a reachable caller of
  the clamp, not a current one. The live gap is elsewhere and larger: `applyFullState` prefers the
  **v2 identity record** for the selector's value, and F123's offered-value check reads only the
  `ids` copy, so the carrier that actually decides the control was unchecked.
  **Decision: halt on both, keep the version clamp.** A version id this build neither offers nor
  renames chooses the default set every other saved id is expanded against, so substituting one is
  the widest silent reinterpretation in the state boundary; a key no version defines can only come
  from a vocabulary the build has since changed. `tryApplyState` already turns both throws into
  clean defaults, a console report and a discarded blob. A key that is defined but disallowed in
  the selected version is version scope, not retirement — the version select really moves a
  `chosen` card to MoM — and still clamps, as does an unknown roster selection. A blob naming no
  version at all is a legacy v1 payload rather than an out-of-range value and keeps its fallback.
  **No derived number moves.** `tools/derivation_equivalence.js`, 15,480 derivations across all
  five versions, is byte-identical with both files at `HEAD` and with the change (24,756,635 bytes
  either way) — expected, since both files are `data-scope="page"` and outside that context; the
  page-level measurement is the full preset suite in `npm test`.
  **Coverage.** Three cases in `tests/persistence.spec.js`, each confirmed red first. Two seed a
  saved blob through the real init path — one naming the unofferable version id, one naming an
  undefined special-unit key **in the identity record only** — and assert the page returns clean
  defaults and the console report names the offending value. The third pins the retained
  boundary: `chosen` under CoM2 stays, `chosen` under MoM clamps to `none`, and an undefined key
  throws from both `populateSpecialUnitOptions` and `setIdentityControls`. Both new stops also
  join the reintroduction registry in `tests/fail-loud-f113.spec.js`, which is red with either
  file at `HEAD`.
  Checks: `node tools/node_unit_checks.js` 14387/14387; `npm run provenance` 270 formulas, 270
  verified, 0 UNVERIFIED; `npm test` 130 passed.
- **F139 — the three modern stat blocks now write exactly the fields their cited sources name.**
  **The premise held on every number and failed on one count.** Re-opened all five cited lines and
  re-measured the three blocks on a unit carrying Ranged 4, Thrown 3, Fire Breath 5, Lightning
  Breath 6 and Doom Gaze 6: Lucky Star moved Thrown 3→4, both Breaths and Doom Gaze 6→7; Inner
  Power moved Thrown 3→6 and Doom Gaze 6→9; Artificer moved Thrown, both Breaths and Doom Gaze
  6→7 — the row's figures exactly, and all three inert in `com2_1.05.11` for Lucky Star and
  Artificer, which are Warlord-scoped. **What was wrong:** the row said the `rtb` gate had
  "exactly three callers left". It has **five** — `animated`'s modern arm and `blackPrayer`'s
  modern arm are the other two, both deliberately cited as reaching every channel and no gaze.
  Three callers is the count that also wrote `doomGazeField`, which is the set the row named.
  **Corrected write sets.** Lucky Star: `SAttack`, `SRanged`, `SDefense`, `SResist` and their four
  bonus mirrors, and nothing else (`UnitCalcPre.CAS:1614-1621`), so its channel write is the
  `rangedField` gate ungated. Artificer: the same four stats plus the four movement fields the
  calculator's record does not carry, all on record selector 1 (`CreateUnit.CAS:38-47`), so the
  same gate. Inner Power: Resistance and Defense unconditionally, melee on the **permanent**
  record's `B.attack > 0`, then `U.ranged`, `U.firebreath` and `U.lightningbreath` each on its own
  live `> 0` (`Units.RecalculateUnits.pas:1866-1885`, whose decode note says in as many words that
  it does not alter Thrown). That third set is a new gate, `rangedOrBreath`, over the existing
  `isModernSecondarySlot` predicate, with the per-field strength test supplied as `whereStrength`.
  No block names `SDoomGaze` (`MASTER.CAS:1047`); `UnitCalc.CAS:1487` remains the only script
  write to it, a zeroing.
  **Measurement.** `tools/derivation_equivalence.js`, 15,480 derivations, current build against
  the pre-F139 `combat_abilities.js`: **0 move in `mom_1.31`, 0 in `mom_cp_1.60.00` and 0 in
  `com_6.08`** (3,096 cases each), 4 in `com2_1.05.11` and 36 in `com2_warlord_1.5.12.7`. Every
  moved value is a removed increment on a Thrown, Breath or Doom Gaze field; nothing rose.
  **Coverage.** Seven presets. Six are the exclusions, each confirmed red against the unfixed
  bodies in one run and green after: `luckyStarAuraSkipsThrownAndBreathWarlord` and
  `artificerSkipsThrownAndBreathWarlord` (8.000 against 10.000),
  `innerPowerBreathNotThrownCoM2` (11.000 against 14.000 — it binds the retained Breath write and
  the dropped Thrown one in one number), and `luckyStarDoomGazeUnchangedWarlord`,
  `artificerDoomGazeUnchangedWarlord` (5.000 against 6.000) and `innerPowerDoomGazeUnchangedCoM2`
  (5.000 against 8.000). The seventh, `luckyStarAuraRangedWarlord`, binds the write the block does
  make — `SRanged` 2 → 3 — and is green in both states; its control is removal of the enchantment
  (2.000), which is what the preset contract asks for. Artificer's and Inner Power's Ranged halves
  were already bound.
  `SPEC.md` is unchanged: what an individual enchantment writes is owned by its `PROVENANCE`
  citation, and the four slot gates SPEC names are unaffected.
  **Nothing was folded in. Filed:** F142 — the two CAS-scripted blocks write `SAttack` with no
  test at all, while the calculator applies the general dead-slot `melee` gate to them, so a
  Warlord unit at base melee 0 takes +1 in the script and 0 here; it is a question about every
  CAS-scripted melee write, not these two. F143 — the `doomGazeField` gate now has no caller.
  Checks: `node tools/node_unit_checks.js` 14387/14387; `npm run provenance` 270 formulas, 270
  verified, 0 UNVERIFIED; `npm test` 127 passed.
- **F137 — the melee-initiation guard is gone; no build gates the exchange on attack strength.**
  **The row's premise held as a measurement and failed as a diagnosis.** The repro reproduced
  exactly: a Warlord custom card at `atk 0` with Natural Selection: Coal derives melee 1 while
  `baseAtk` stays 0, so `resolveCombat` short-circuited to the identity distribution (`dmgToA`/
  `dmgToB` both 0.000) while the same unit as defender counterattacked for 1. But the row asked
  *which record* the guard should read, and the sources answer that no build has the guard at all.
  **Decision: delete it.** `BU_AttackTarget`'s melee entry carries "no strength gate in any build"
  (`MoM binary analysis.md`, *The zero-attack-strength abort, and what it takes down with it*, the
  `BU_AttackTarget` gate table); its sole call site is unconditional and the melee strength it
  reads at `0x9AE4B` only selects ranged-versus-melee mode (`R6.2a.evidence.md`, *Call-site
  admission*); the ordinary melee dispatch (`131:0x99939`) is reached untested and the
  counterattack (`131:0x99823`) is gated only on defender Black Sleep and `Figs > 0`
  (`DOS reconstructed/combat.c`). `PerformMeleeAttack` calls the main melee `ApplyAttack` at
  `$005B3B4B` and the counterattack at `$005B3B93` unconditionally, and `ApplyAttack` exits early
  only on `figs <= 0` at `$005B19D9` (`Combat.PerformAttacks.pas`, `Combat.ApplyAttack.pas`). The
  one real melee-strength test is MoM 1.31's per-call `BU_ProcessAttack` abort at `0x99ED2`, which
  CP 1.60 and CoM 1 patch out (`7F` -> `EB`) and which `touchAttackFires` already carries; being
  per call, it never withholds the counterattack. The same section settles the record question the
  row asked: "There is no 'base' attack strength at combat time" — so neither the permanent record
  nor the card input belonged in a melee gate, and applying F133's answer here would have been
  wrong. The citation is a prose comment at the site rather than a `PROVENANCE` anchor: the audit
  binds anchors to formula sites, the deletion removes the site, and `combat.js` carries no anchors
  for this class of control-flow claim today.
  **The row's declared calculator scope was wrong and is corrected here.** It expected only
  `com2_warlord_1.5.12.7` to move. Deleting the guard moves all five: over a 39,600-input melee
  sweep (five versions x three melee strengths x two secondary strengths x three secondary types
  x eleven attacker ability sets x two defender strengths x five defender ability sets x Wall of
  Fire on/off x two unit types), **756 `mom_1.31`, 870 `mom_cp_1.60.00`, 780 `com_6.08`, 672
  `com2_1.05.11` and 708 `com2_warlord_1.5.12.7` cases change**, with 0 errors. The moved cases are
  the counterattack, defender gaze, defender Immolation and Wall of Fire that the short-circuit was
  suppressing — every one of them gated on the defender's own record, not the attacker's strength.
  **No existing preset moved:** with the guard removed and before the new fixtures were added, the
  1,062-preset browser suite passed unchanged, so nothing had to be re-expected. One preset stopped
  being vacuous: `immolationAtkZeroNoFire` (MoM 1.31, attacker `atk 0`) never reached the melee
  branch before and now genuinely exercises `touchAttackFires`.
  **Coverage.** Five presets, each confirmed red against the unfixed guard (all five measured
  0.000/0.000) and green after: `zeroMeleeAttackerStillCounteredMoM131`, `...MoM160`, `...CoM` and
  `...CoM2` each expect `dmgToA` 3.000 / `dmgToB` 0.000, and `naturalSelectionCoalAttacksWarlord`
  puts F133's Coal unit on the **attacking** card for `dmgToB` 1.000 / `dmgToA` 5.000 (without
  Coal, `dmgToB` 0.000). The four sit beside the Black Sleep initiation fixtures, which are the
  contrast: a declared calculator boundary really does refuse the exchange, attack strength does
  not; the Coal one joins the Natural Selection group.
  **Nothing was folded in. Filed:** F141 — `touchAttackFires`'s modern arm is the same unsourced
  record read one layer down, and `ApplyAttack`'s riders are gated on attack type and immunities
  alone; a Warlord Coal attacker delivers no Stoning Touch (`dmgToB` 1.000 against 20.000). Not
  folded in because settling it needs its own citation for each arm, which fails the
  adjacent-defect bound's second clause. `SPEC.md` is unchanged: it never specified an
  exchange-admission gate.
  Checks: `node tools/node_unit_checks.js` 14387/14387; `npm run provenance` 270 formulas, 270
  verified, 0 UNVERIFIED; `npm test` 127 passed.
- **F136 — the card's roster statement now has one home: `applyUnit`.** `resetCardToRosterBase`
  (`ui_card.js`) is gone; its seven writes (`Atk`, `Rtb`, `Def`, `Res`, `HP`, `ToHitMod`,
  `HitChance`) are an inlined block in `applyUnit` beside the nine it already made, and its three
  other call sites — both level-change handlers in `ui.js` and `applyMatrixCellToMain` in
  `ui_matrix.js` — are deleted, leaving `applyUnit` the only caller. The record's one `Hit=` now
  reaches `ToHitMod`, `ToHitRtbMod` and `HitChance` from the single `base.toHitMod` expression, and
  `applyModernAttackFields` is called once instead of twice with the same argument.
  **The row's three measurements were re-taken against the current tree, after F123, F133 and
  F135 landed. (a) held, with larger counts:** the level-change reset was inert over 1,098 roster
  units and 6,148 level changes across all five versions — every level option of every unit,
  driven through the real `aLevel` handler — changing no control value, with 0 console errors (the
  row's 907/3,943 were stale). **(c) held and was stronger:** on a card restored by `applyFullState`
  holding values its record never gave it, a level change reverted 11 fields and left 7, not the
  row's 9 and 5, in both `mom_1.31` and `com2_warlord_1.5.12.7`. **(b) held, but its stated reason
  is incomplete.** By measurement the matrix's second call diffed nothing, because every rendered
  cell names a roster unit and so has already run the whole statement through
  `updateUnitLock` → `applyUnit`. The `unitId == null` branch, where the reset would have run
  alone and clobbered the card, is unreachable — `buildMatrixCache` appends the selected-unit row
  and column but publishes index lists built before the append, so no cell renders them. That is
  filed as **F140**, not fixed here: it is a design question about what the matrix should show,
  with no cited source to settle it.
  **Nothing derived moved:** `tools/derivation_equivalence.js` is byte-identical across the change
  (15,480 derivations, all five versions, sha256 `eacacec5…`), and the change touches only
  page-scope sources. `tools/control_write_census.js` drops from 6 split-statement findings to 3,
  with every finding naming this pair gone. `SPEC.md`, *UI contract* now states the level rule for
  any selection rather than only for Custom, and says the roster record is stated exactly once.
  Coverage: `tests/roster-statement-f136.spec.js`, whose level-change tests fail against the
  unfixed code with exactly the 11 reverted fields. **One existing assertion encoded the retired
  behavior and was re-aimed, not dropped:** `tests/custom-level-f42.spec.js`'s second test
  asserted that a level change put the roster melee value back over a hand edit on a predefined
  selection. It now asserts the whole card survives — eight fields, not the one it looked at —
  that identity stays locked, and that the level still reaches the derivation; it fails against
  the unfixed code too.

- **F135 — the DOS shared `.ranged` byte now takes one gate per writing block, and the gaze
  strengths follow it instead of carrying a second, static gate of their own.** **The row's
  premise held exactly** against the tree as F133 left it: `com_6.08`, `gaze_stoning` at strength
  0, Focus Magic + Black Prayer still derived `rtb 2` beside `gaze 3`. **Its proposed fix did
  not.** Merging the gaze arm onto the `rtb` arm's `isLiveSlot` would have made the two views
  agree while leaving both wrong, because three of the six DOS blocks test the record's
  **type** sentinel and not its strength — `if (bu->ranged_type != RAT_NONE)` at Black Channels
  (131:0x8F437) and CoM 1's Animated (com1:0x8F4EB), and `> RAT_NONE` at CoM 1's Tactician hero
  grant (com1:0x90AEC) — so a Gorgon shipping `Gaze(Stoning)` at Ranged 0 takes those writes with
  its strength still empty, and `isLiveSlot` says that slot is dead.
  **Decision: per-site gates (option C of three offered).** Each of the six DOS
  `addToSlot(…, 'gaze', …)` sites now names its own block's test on the one byte —
  `rangedTyped` for the three above, `rangedStrength` for CoM 1's Holy Bonus
  (`if (bu->ranged > 0)`, com1:0x900E8), `rangedUngated` for Black Prayer (`bu->ranged--`,
  131:0x907F0, com1:0x9054A) and Mind Storm (`bu->ranged -= 5`, 131:0x9095E, com1:0x906D1), both
  unconditional stores the terminal floor settles. `slots.gaze`/`slots.doomGaze` are retired: what
  survives is `channel.gazeMirrors`, which gaze accumulators are views of that record's byte, and
  that is the same **type** fact the region-`e` floor already asks (F122). A write admitted by one
  of the three gates reaches the strength field and its mirrors together — one field, one gate.
  `SPEC.md`, *The step model* now states that a step may name its block's own gate in place of the
  dead-slot rule. **Merging onto `isLiveSlot` was rejected** for the reason above; **a full
  retirement of `isLiveSlot` was rejected** as out of proportion — it stays the general rule, and
  after this change its `rtb` gate has five callers left, all modern. (F139 above corrects this
  line's original count of three: three was the number that also wrote `doomGazeField`, and taking
  those off the gate left two.)
  **Folded in, at the user's decision rather than under the adjacent-defect bound:** the DOS gaze
  level ladder (`stats_sequence.js`) applied `gazeLvlMod`/`doomGazeLvlMod` ungated while the
  ranged arm beside it was gated. Every ranged step of both MoM ladders is
  `if (bu->ranged > 0) bu->ranged++` — 131:0x8FA8E, 0x8FAD4, 0x8FB21 on the six-step normal ladder
  and 0x8F8FB, 0x8F935, 0x8F961, 0x8F994, 0x8F9C7 on the nine-step hero one — and CoM 1's table
  walk `continue`s the `dx == 1` field when the byte is `<= 0` (com1:0x8FAB2), so a strength-0
  gaze template takes no ladder step. **This corrects a landed F122 expectation.** F122 read the
  absence of a *type* gate as the absence of any gate and recorded
  `hiddenGazeKeepsLevelLadderRaise` (MoM Champion, strength-0 gaze, 3). That preset is now
  `hiddenGazeLevelLadderNeedsStrength` and expects 0; `doomGazeLevelLadderMoM` (`gaze_multiple` at
  strength 4, Champion, 7) is the positive twin and is unmoved. F122's other preset,
  `hiddenGazeKeepsFocusMagicRaiseCoM`, stands: CoM 1's Focus Magic arm 1 genuinely has no strength
  test (com1:0x8F825, +3 at com1:0x8F82D).
  **Measurement.** 83,160 `deriveUnitStats` inputs over five versions × 14 shared-slot types ×
  three strengths × three levels × three unit types × 22 ability environments × two node auras,
  current build against one whose three edited files are reverse-patched to their pre-F135 bodies:
  **3,014 move — 934 `mom_1.31`, 934 `mom_cp_1.60.00`, 1,146 `com_6.08`, and 0 in `com2_1.05.11`
  and 0 in `com2_warlord_1.5.12.7`**, as the row's scope requires. Nothing throws on either build,
  and the only output fields that move are `rtb`, the gaze strength and the Doom Gaze strength.
  Two classes move on records that carry no gaze: the type sentinel correctly denies Black
  Channels a typeless record with strength (`rtbType 'none'`, strength 1: `rtb` 2 → 1, since
  `bu->ranged_type` is the -1 sentinel there), and a DOS card carrying the `doomGaze` **ability**
  with no gaze in its shared slot no longer takes shared-byte writes into a field the engine does
  not have.
  **Coverage.** Five presets, each browser-measured through `applyPreset` and confirmed red
  against the unfixed bodies, one per gate class:
  `hiddenGazeTakesBlackChannelsTypeGate` (`rangedTyped`, 1 against 0),
  `holyBonusNeedsRangedStrengthCoM` (`rangedStrength`, 0 against 2 — the exclusion
  `if (bu->ranged > 0)` makes on a Missile record at strength 0),
  `hiddenGazeTakesBlackPrayerUngatedCoM` (`rangedUngated` and the row's own case, 2 against 3),
  `hiddenGazeMindStormFlooredCoM` (`rangedUngated` past zero, 0 against 3) and
  `hiddenGazeLevelLadderNeedsStrength` (the ladder, 0 against 3).
  **Filed:** F139 — the three modern callers left on the `rtb` gate (Lucky Star, Inner Power,
  Artificer) write attack channels and the independent Doom Gaze field their cited sources never
  name. Not folded in because every number it moves is in a version this row required to be
  verified unchanged.
- **F123 — a restored control value the build no longer offers halts the restore instead of
  blanking the control.** **The premise held, with one clause of it stale.** Measured on the
  current tree: a saved `com2_1.05.11` blob naming `aModernRangedType: 'magic_c'` restored the page
  with that select at `""` (`selectedIndex -1`), no console output, and `collectState()` re-saving
  the `""` — so the blank propagated into the next save and any share link cut from it; the DOS
  half (`aRtbType: 'beam'` in `com_6.08`) behaved identically with `rtb` left at 5. The row's stated
  consequence, a Ranged record typed `''`, is no longer what follows: F133's `modernAttackRecord`
  coerces `'' -> 'none'`, so the record read `{strength: 5, type: 'none'}` — a strength-5 ranged
  attack of no projectile class, silent in the same way.
  **Decision: validate at the restore boundary and fail loud** (`SPEC.md`, *Out-of-range values
  stop the run*, and the new *Persistence and sharing* clause). `assertRestoredValuesAreOffered`
  (`ui_state.js`) checks every `<select>` value in the blob against its control's options before
  `applyFullState` assigns anything, and names each offender with the set that was expected.
  `tryApplyState` already documented this exact case as one that would throw, so the recovery it
  describes — clean defaults, a console report, and discarding the blob — now actually runs. The
  check is general rather than a list of F93's four tokens, so the *next* option removal is loud
  too.
  **The stated migration was rejected on the evidence.** Three of the four retired values have no
  single successor: pre-F93 `magic_c` covered both projectile id 30, today's `magic_lightning`, and
  ids 31/33/36, today's `magic` (`tools/ranged_types.py`, before and after F93), and F124 made
  those two tokens differ in derived damage — so a migration would guess, and could move a number.
  `beam` on the DOS shared-slot select has no successor in any vocabulary, since the DOS engines
  have the real realm table and no beam projectile. Where a successor *is* citable, the guard is
  what forces the migration to be written rather than skipped.
  **Scope.** The `SpecialUnit` pair is checked against the build's whole `SPECIAL_UNIT_DEFS`
  vocabulary rather than the live option list, so a retired key halts while the existing
  version-scoped clamp to `none` is untouched; `gameVersion` and the roster selects keep their own
  handling.
  **Folded in, because the guard is unfounded without it: the page was writing an unofferable
  value itself.** The shared-slot select has no spelling for the modern-only projectile tokens, and
  both writers assigned one blind — `applyPreset` from a fixture's `rtbType` and `applyUnit` from a
  roster record's ranged type (Warlord [362] Wanderer is `magic`). Measured across all 1058
  presets, **42 left `#aRtbType` blank**, and `collectState()` on such a state threw inside
  `getDefaultIds`' restore. Both now go through `setSharedSlotRangedType` (`ui_card.js`), the
  writer counterpart of the existing `sharedSlotRangedType` reader: it writes the token when the
  slot offers it, projects a modern-only token onto `none` — which is what that reader already
  prefers the modern selector for — and throws on a token neither family has.
  **No derived number moves.** Five versions x {shipped defaults, a custom pair driving every
  attack channel the version has, that state through a full save-restore round trip} is
  byte-identical with the guard present and removed; and the full preset sweep, all 1058 presets
  across all five versions, is byte-identical with the writers reverted and with them fixed
  (**42 blank selects before, 0 after**).
  **Coverage.** Three cases in `tests/persistence.spec.js`, each confirmed red against the unfixed
  code. Two, one per engine family, seed a saved blob naming a retired token and assert the
  reloaded page's `collectState()` equals the fresh-page blob and that the console report names the
  control and the value — unfixed, the page restored the saved version with a blank select and
  reported nothing. The third asserts no `#calcMain` select is left with `selectedIndex -1` after a
  `magic`-typed fixture and after the Wanderer roster record, and that `collectState()` does not
  throw.
  **Filed:** F138 — the two substitutions this change deliberately left standing. An unmappable
  version id still falls back to `DEFAULT_GAME_VERSION`, which reinterprets every other id in the
  blob under a different rule set, and `populateSpecialUnitOptions` still clamps an unrecognised
  special-unit key to `none` outside the restore path. Both are documented existing decisions, so
  changing them is a decision with no cited source rather than a transcription — the
  adjacent-defect bound's second clause.
  Checks: `node tools/node_unit_checks.js` 14387/14387; `npm run provenance` 270 formulas, 270
  verified, 0 UNVERIFIED; `npm test` 122 passed.
- **F133 — every melee-presence gate now reads the permanent record through `ctx.base`, not the
  card's `atk` input.** **The row's premise held exactly.** A Warlord custom unit at `atk 0` with
  Natural Selection: Coal traced `base:naturalSelection:coal` writing `atk 0 -> 1` and `e:clamp`
  writing `atk 1 -> 0`; Ludus/Agoge (`1`), Mother Fungus (`2`) and an Altar of the Sun Holy Mother
  (`1`) each traced the same pair, and the same unit with a magic weapon showed `hitchancemelee`
  +10 beside melee 0, which is the symptom F120 exposed.
  **Decision: read the permanent record, which is `ctx.base`.** `CreateUnit.CAS` writes `SAttack`
  at `ABase` ungated on the field's current value (`:346`, `:360`, `:448`, `:552`, and `:616` for
  the Malnourished `-1`), and every compiled melee-presence test reads that record —
  `if BaseUnits[i].attack > 0` at `applynodeaura` (`Units.RecalculateUnits.pas:466`), the level
  ladder (`:543`), `ApplyMagicWeapons` (`:637`) and the Holy Bonus aura (`:2530`). Those writes are
  already `base`-phase steps, so `SPEC.md`, *The step model*, already names `ctx.base` as what a
  later region reads, and `c:weapon`'s `weaponMeleeOpen` already reads it (F120). `hasMeleeAttack`
  became the predicate `hasMeleeAttackAt(runCtx)`, keeping the two live-creation exceptions
  (Marionette, True Light) as terms of their own, and `ctx.slots.melee` became that predicate so
  the aura pass's `addToSlot(u, ctx, 'melee', …)` asks it too. **Naming the four grants in the
  predicate was rejected** — it copies the base sequence's arithmetic into a second place, and
  `SPEC.md` calls the permanent record "not a snapshot of convenience". **Recording the current
  reading as a deliberate deviation was rejected** because the aura and node-aura gates are cited
  `B.attack > 0` transcriptions, so the old reading was wrong there, not a modelling choice.
  **Folded in under the adjacent-defect bound:** `modernNodeBaseMelee` (`stats.js`), the node
  aura's own melee gate, carried the identical defect one variable away — its comment already said
  "persistent BaseUnits.attack" while the code read `calcBaseAtk`. It is cited
  (`Units.RecalculateUnits.pas:466`, whose decode note calls out that this gate alone reads
  `BaseUnits`), it moves nothing outside the item's version scope, and it has its own preset. It is
  now the step's own `runCtx.base.atk > 0` read and the variable is gone.
  **Measurement.** 217,600 `deriveUnitStats` inputs over five versions x 34 ability environments x
  five races x two names x four melee strengths x four unit types x two weapon materials x two node
  auras x two levels, current build against one whose two predicates are substituted back to the
  card's input: **1,520 cases move, all of them in `com2_warlord_1.5.12.7`; `mom_1.31`,
  `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` move 0**, as the row's scope requires. A second
  340,200-input sweep exercising the six realm races, four node auras, five attack-slot types and
  three levels reports the same split — 1,535 moved, again all Warlord. Only the five Warlord
  permanent melee writers reach it, so no other version has a base-phase melee write to read.
  **Coverage.** Four presets, each browser-measured through `applyPreset` and confirmed red against
  the unfixed predicate: `naturalSelectionCoalCreatesMeleeWarlord` (`dmgToA` 1.000 against 0.000),
  `naturalSelectionCoalOpensHolyBonusWarlord` and `naturalSelectionCoalOpensNodeAuraWarlord` (3.000
  against 0.000), and `malnourishedClosesMeleeSlotWarlord` (`dmgToB` 0.000 against 2.000), which
  holds the other direction: a permanent record driven to 0 shuts the slot, and that exclusion is
  the rule under test. The node-aura preset discriminates the folded-in half on its own — with the
  aura gate alone left unfixed it measures 1.000, not 3.000. The three Coal presets put the granted
  unit on the **defending** card because F137 then blocked the attacking one. Two existing presets
  changed number as a consequence and were re-expected: `ludusAgogeResistanceWarlord` and
  `ludusAgogeHpWarlord` both give their Orc defender a permanent melee 1 it did not have, so each
  now counterattacks for `dmgToA` 0.300.
  **Filed:** F137 — `resolveCombat`'s melee-initiation guard (`combat.js`) is the same defect one
  layer out: outside `mom_1.31` it admits the exchange on `a.baseAtk`, the card input, so a Warlord
  attacker whose melee exists only because `CreateUnit.CAS` granted it cannot start a melee
  exchange at all even though its derived melee is now correct. Not folded in because the guard
  carries no `PROVENANCE` citation on either arm, so correcting which record it reads is not a
  transcription — the adjacent-defect bound's second clause.
  Checks: `node tools/node_unit_checks.js` 14387/14387; `npm run provenance` 270 formulas, 270
  verified, 0 UNVERIFIED; `npm test` 119 passed.
- **F122 — the DOS gaze strengths now take the same floor as the shared slot they are views of,
  and the engine keeps no zero test of its own.** The row's premise held exactly against the code
  as F60/F106/F125/F116/F117/F118/F119/F120/F121 left it: on a `com_6.08` `gaze_stoning` template
  at strength 0 with Focus Magic, `c:focusMagic` writes `gaze 0 -> 3` and `rtb 0 -> 3`, then
  `e:clamp` writes `gaze 3 -> 0` and leaves `rtb` at 3, and Night Stalker (`Gaze(Death)`) and
  Gorgons (`Gaze(Stoning)`) both still ship `Ranged 0` on the shipped roster. F60's DOS gaze
  delivery change does not interact: it scales the *hidden component* by attacking figures and
  reads the same strength this floor decides.
  **The row's two candidate rules were both wrong, and reading the delivery path is what settled
  it.** The recompute's terminal floor is one ungated `if (bu->ranged < 0) bu->ranged = 0` over one
  field (`unitcalc.c` 131:0x90B2F 160:= com1:0x90B54), with no base-value test and no
  slot-presence test beside it, and the delivery path reads that same byte —
  `attack_strength = (int8_t)bu->ranged` (`combat.c` 131:0x99B0B 160:= com1:0x99AF1), which the
  automatic-damage arm at `0x9A1E6` hands over whole for type 104 and `CMB_AttackRoll` rolls for
  103 and 105. So the engine keeps no separate zero test. But `isLiveSlot` is not the answer
  either: a gaze's presence in the DOS record is a **type** fact, and MoM's level routine
  increments the byte with no `ranged_type` gate at all, so a strength-0 gaze template at Champion
  reaches `bu->ranged = 3` with `rtb`'s own live predicate still false. The floor now asks the type
  — `hasGazeRangedSlot` / `hasDoomGazeSlot` (`stats.js`) — and floors at 0, which is what the one
  field does. The same predicate replaced `baseDoomGaze > 0` on the DOS Doom-damage projection into
  `combatAbilities`, so a type-104 record no longer lets the raw ability input through when its
  strength is not positive — `dosGazeAbilityValues` already states that the byte contributes
  nothing there.
  **Measurement.** 87,360 `deriveUnitStats` inputs per run over every `rtbType` token x four
  strengths x six levels x thirteen co-ability environments x four battlefield states: 4,376 move,
  1,556 in `mom_1.31`, 1,556 in `mom_cp_1.60.00` and 1,264 in `com_6.08`, and **0 in
  `com2_1.05.11` and `com2_warlord_1.5.12.7`**, as the row's scope requires. Every moved case is a
  gaze type at strength 0 or below; only `gaze`, `doomGaze` and the projected Doom-damage ability
  move. The control-surface digest moves 0 of 15,480 — its shapes carry no zero-strength gaze,
  which is where the defect lived. Two presets hold the two ways the byte gets raised,
  `hiddenGazeKeepsLevelLadderRaise` (MoM Champion, the ladder) and
  `hiddenGazeKeepsFocusMagicRaiseCoM` (CoM 1 Focus Magic arm 1), both confirmed red against the
  unfixed body (0 against an expected 3) and green after; no other preset moved, out of 1,054.
  The ladder half of that reading was wrong and F135 above corrects it: the MoM ladder has no
  *type* gate but does test the byte's strength, so that preset is now
  `hiddenGazeLevelLadderNeedsStrength` and expects 0.
  **Nothing was folded in.** The fix made a second defect observable and it is filed as
  [F135](./BACKLOG.md): `addToSlot`'s gaze arm gates on a static `baseGazeRanged > 0` where the
  `rtb` arm beside it at the same call sites asks `isLiveSlot`, so the same `com_6.08` template
  with Focus Magic and Black Prayer now derives `rtb 2` beside `gaze 3`. Merging those gates needs
  each of the ten call sites' engine blocks read, which fails the adjacent-defect bound.
  [F133](./BACKLOG.md) is the other open `e:clamp` record-read question and wants different lines
  — the melee arm's `hasMeleeAttack`, not the gaze arms — so the two are independent.

- **F121 — the card and the matrix now read a roster unit's modern attack record through one
  reader, and its "unreachable today" premise was false.** The row claimed only heroes reach a
  record that states no attack, and that `populateUnitDropdown`'s `category === 'Heroes'` drop
  therefore hides the divergence. **Measured 2026-08-22 against the code as
  F60/F106/F125/F116/F117/F118/F119/F120 left it: 84 of the 159 CoM2 picker units and 135 of the
  296 Warlord ones state no attack** — every melee-only unit does, Gnoll Spearmen through Minotaurs
  — so the divergence was reachable from any matrix row with a channel-creating enchantment ticked,
  all of which are `source: 'enchantment'` and so reach every roster row. The row's five named
  effects were also short: `flameBlade`, `shadowStrike`, `dragonMound` and the Marionette pair seed
  channels too. Its measurement unit, the Warlord Wanderer, is a hero and was never in the picker.
  **The engine decides which reader is right.** `unitT` holds the four strengths as fixed fields —
  `ranged` +0x24, `thrown` +0x2C, `firebreath` +0x30, `lightningbreath` +0x34 ([CoM2 binary - unit
  recalculation.md](../Reference%20docs/Caster%20binary/CoM2%20binary%20-%20unit%20recalculation.md),
  record layout) — so a record with no attack is four empty fields, not the absence of a record,
  and the card's reading was the faithful one. `modernAttackRecord` (`ui_units.js`) is now the one
  place that shape is decided; `modernCardAttacks` and `predefinedModernAttacks` both return it,
  the latter taking the version so that `null` means only *this version has no modern record* — the
  same answer the card gives off CoM2/Warlord.
  **What moved, measured over every roster unit of all five versions under nine effect states.**
  Melee: 144 of 344 Warlord rows under Flame Blade, which had no legacy-slot arm to hide behind
  (Beastmen Swordsmen 7.151 → 7.119, the card's answer). Ranged: 99 Warlord rows under Lightning
  Blade, where the legacy slot was being delivered as a conventional volley (0.148 → 0). Nothing
  moved in `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` or `com2_1.05.11`. Focus Magic and Chaos
  Channels changed the derived record on both modern versions without moving a number, because
  their writes also landed on the DOS-shaped shared slot — the reads [F127](./BACKLOG.md) owns,
  which this change deliberately does not touch. Verified in the browser: for all 455 modern picker
  units the two readers now return identical records, and on the Beastmen Swordsmen the card and
  the matrix derive the same channel and the same mean under Focus Magic, Flame Blade, Chaos
  Channels and Lightning Blade. `tests/roster-smoke.spec.js` carries the guard.

- **F120 — the material block's melee half now makes each engine's own melee-presence test.**
  Both halves of the row's premise held against the code as F60/F106/F125/F116/F117/F118/F119 left
  it: `unitcalc.c` still wraps `bu->melee += quality - 1`, `Gold_Melee` and `melee_tohit++` in
  `if (bu->melee > 0)` (131:0x8F041, 160:0x8F053, com1:0x8F03A), and `c:weapon` (`stats.js`,
  `weaponStatSteps`) still wrote `u.atk += wpn.atk` unconditionally while its To-Hit half made the
  test. Its third clause — *"a zero-strength melee slot therefore takes a bonus the engine
  withholds"* — is **half falsified**: `e:clamp` already discards the phantom melee for a unit whose
  card melee is 0, so the bonus is invisible in the ordinary case and only escapes where a later
  step reads it. The escapes are what moved.
  **The modern engine does make the same test, on the other record.** `ApplyMagicWeapons` wraps
  `hitchancemelee`, `attack` and `attackbonus` in `if BaseUnits[i].attack > 0`
  (Units.RecalculateUnits.pas:637-642, $00598F43), under that file's own note that all
  material-presence and melee-presence tests there read `BaseUnits`. So the fix is all five
  versions, as one predicate over two records: `weaponMeleeOpen` reads live `u.atk` on the DOS arm
  and the permanent `runCtx.base.atk` on the modern one, and both halves of the block share it —
  which also retired the To-Hit half's `u.atk - wpn.atk > 0` reconstruction of the pre-write value,
  now provably equal to `u.atk > 0` because the strength write only ever adds where that was
  already positive. Defense stays outside the gate in both engines.
  **The permanent-record read is load-bearing, not a refinement.** The To-Hit half previously read
  `inputBaseAtk`, the card field, and the measurement showed that disagrees with the engine in both
  directions on Warlord, where `CreateUnit.CAS` writes melee into `ABase`: Malnourished (−1) leaves
  a card melee of 1 with a permanent 0, and Natural Selection: Coal (+1) the reverse.
  **Measurement.** 1,110,980 derivations before and after — 587,520 solo (5 versions x 8 attack
  shapes x 3 identities x 2 levels x base melee 0/1/4 x 4 materials x each of 203 ability keys
  alone, plus a no-ability baseline), 410,060 ability-pair, and 113,400 over the non-ability
  inputs. **334 + 1204 + 1292 cases move**, every one of them carrying a weapon material, none of
  them above base melee 1 in the sweep that varied it, **through five ability keys and no others:**
  `com_6.08` Supreme Light (the one CoM 1 effect that widens the terminal slot clamp for a
  melee-less unit), and Warlord `blazeOfGlory`, `shadowStrike`, `coal` and `malnourished`.
  `mom_1.31`, `mom_cp_1.60.00` and `com2_1.05.11` do not move at all. No shipped roster template
  reaches it: the moving Warlord keys are all Custom-card enchantments.
  **Coverage.** Two presets, browser-measured through `applyPreset` and confirmed red against the
  unfixed code: `weaponMaterialDosMeleeGateIsLiveRecordCoM1` (2.000 against 4.000) and
  `weaponMaterialMeleeGateReadsPermanentRecordWarlord` (4.000 against 6.000). The second
  discriminates all three candidate readings — no gate and a gate on the card's melee input both
  measure 6.000, checked by evaluating each variant in the page. No Node assertion was added: the
  damage numbers bind the claim and an `atk === 2` check would restate the implementation.
  **Nothing was folded in. Filed:** F133 — `e:clamp`'s `hasMeleeAttack` reads the card's melee
  input too, so a Warlord unit whose melee exists only because `CreateUnit.CAS` granted it derives
  melee 0; F120 makes that visible from the other side, since such a unit now takes the material's
  `hitchancemelee` beside a zeroed melee strength. Not folded because the slot zeroing is the
  calculator's convention with no cited engine source, which fails the adjacent-defect bound's
  second clause. Checks: `node tools/node_unit_checks.js` 14387/14387; `npm run provenance`
  270 formulas, 270 verified, 0 UNVERIFIED; browser `runTests()` 1052/1052; `npm test` 116 passed.
- **F119 — the card cannot hold a ticked Ranged it does not run, so neither a halt nor a new
  notice was warranted.** **The row's premise is falsified.** It reported the fallback in
  `recalculate` (`ui.js:229-232`, still exactly as described) and never looked at
  `updateTypeVisibility` (`ui_abilities.js:546-554`, in place since `07c272a`), which recomputes
  the *same* predicate off the same `readUnitStats('a')` and, when it fails, clears the box,
  disables it and greys its label. All 13 `recalculate()` call sites are preceded by it, and
  nothing between the two reads writes a control value. Measured in the browser over seven removal
  routes — zeroing the DOS strength, retyping the shared slot to `none`/gaze/Thrown, switching to
  either modern version, emptying the modern Ranged channel, selecting a ranged-less roster unit —
  the tick
  never survives: it is withdrawn in the same interaction, visibly, and the damage moves with it
  (3.640 ranged → 2.429 melee on the DOS case). So the row's *"no error and no visible change of
  state"* is wrong on the second half, and its worked example is stale too:
  `weaponMaterialDosMissileHasNoStrengthGateMoM` now resolves **ranged** for 2.000 with the box
  ticked and enabled, because F109 gave it a real Missile 2. **Decision: this is normalization of a
  card the user is still editing, not a fallback**, so *Out-of-range values stop the run* does not
  reach it — nothing is invented, and the withdrawal is on the control itself. That squares with
  F112/F116/F117, which stop where an input the UI cannot produce would otherwise be replaced by an
  invented value, and with F118, which left a control inert rather than halting where the UI
  already prevents the bad state. **Recorded** as a `SPEC.md` UI-contract rule, the only change
  made; the ranged matrix's equivalent (omit an attacker with no ranged attack,
  `ui_matrix.js:441-445`) is stated in the same bullet. No code, preset or test change, so no
  behavior moved.
- **Folded in:** nothing. **Filed:** F131 — the one place the mismatch is reachable is
  `applyPreset`: of 1050 presets, 243 state `rangedCheck: true` and 3 resolve melee, all three with
  provably inert `rangedCheck`/`rangedDist` (removing them, or distance 20, moves neither number),
  which makes `blazeOfGloryThrownTakesNoDistancePenaltyWarlord` vacuous on the distance penalty it
  is named for. F132 — the predicate has three copies and the `ui.js` one is unreachable.
- **F118 — Flame Blade is one derivation input again, whichever control supplies it.** Premise
  re-measured against the code as F60/F106/F125/F116/F117 left it, and it held exactly: a
  `com2_warlord_1.5.12.7` derivation with `flameBlade` set finished melee **8** from a base 5
  while Ranged 4, Thrown 3, Fire Breath 2 and `weapon: normal` all declined; `enchantments.js:34`
  still carried `exceptVersions: ['com2_warlord_']`; and `abilityVersionGated` still hides the
  control there. **Shape chosen: route the Warlord control to the one key**, not an `!isWarlord`
  term on the melee gate. The two controls are one effect — an arcane unit ability in Warlord, the
  wizard spell elsewhere — setting one record flag and running the one block `PROVENANCE[flameBlade]`
  cites for all five builds, and they are disjoint by version, which is exactly the shape
  `disciplineWarlord` → `discipline` already uses beside it. A version term on the step would have
  said Warlord's engine makes no such write, which is false. `flameBladeWarlord` therefore takes
  `calcKey: 'flameBlade'`, `warlordCombatFlameBlade` (`stats.js`) reads the merged key, and the
  step's melee gate reads `nonWarlordFlameBlade` like its strength half. In Warlord the one input
  now yields the ability's own +3 melee, +2 missile/Thrown, +1 Fire Breath and magic weapon.
  **Verified:** `tools/derivation_equivalence.js`, 15,480 derivations, 248 differing cases — and
  every one of them sets a Flame Blade control: 43 per non-Warlord version, all of them cases
  setting `flameBladeWarlord`, a control those four builds do not have, and 76 in Warlord, of which
  33 are the `flameBlade` input's real arithmetic and 43 only rename the echoed key. No reachable
  input moves outside `com2_warlord_1.5.12.7`. **No preset can cover this and none was added** —
  the UI clears a version-gated control, the F111 wall — so the coverage is 11 assertions in
  `tools/unit_checks/derive_unit_stats.js`; 6 fail against the unfixed code. No `SPEC.md` change:
  *Versions* and *Version scope* already state the rule and the several-controls-one-`calcKey`
  mechanism.
- **Folded in:** nothing. **Filed:** F130, with the survey the row's second question asked for.
  `tools/hidden_control_leak_sweep.js` enumerates every (`calcKey`, version) pair whose every
  naming control is version-hidden and measures both tiers: after this change **485** such pairs,
  of which **1** moves a derived stat (`rulerOfUnderworld` in `com_6.08`) and **10** move a
  `resolveCombat` number over four keys (`eldritchWeapon`, `bloodLust`, `mysticSurge`,
  `rulerOfUnderworld`). So the answer to "does every hidden control need the same guard" is:
  four do, three of them only at resolution time where no derivation-layer guard can see them —
  and fixing any moves a number in a version outside this row's scope, which is why they are
  filed rather than folded.

- **F117 — the version-scope sweep now names real projectile tokens, and a stated armor quality
  outside the option set stops the run.** Premise re-measured against the code as F125 left it.
  **(a)** held with one correction: the `rtbTypes` list did carry `ranged`, `stoning`, `death` and
  `doom`, which name nothing in either vocabulary, and did omit the seven `#aRtbType` options the
  row lists plus `magic_lightning` — but **not** `boulder`, which the list already held. Eight
  tokens were missing, not nine. **(b)** the true call-site count is **37**, not ~40: 35 `'none'`,
  one `'plate'` and one `'mithril'`, across 12 `tests/*.spec.js`, `tools/unit_checks/assertions.js`,
  `tools/bench_derive_unit_stats.js` and `tools/derivation_equivalence.js`. **Spelling:** `normal`,
  the option both `#aArmor`/`#bArmor` and `MATRIX_ARMOR_OPTIONS` define as the no-material member,
  and the value the ineligible-unit gate already substitutes. **Stop:** yes. `deriveUnitStats`
  checks the stated value against `ARMOR_MATERIALS` (`combat_abilities.js`, beside
  `WEAPON_MATERIALS`) *before* the MoM/hero/loadout gate rather than after, because that gate
  discards the input in exactly the cases a caller is most likely to have got wrong; an absent
  field stays the control's default, as it is for the City walls position beside it. **The sweep
  list is now derived** from `RANGED_TYPES`/`THROWN_TYPES`/`GAZE_TYPES` rather than transcribed, so
  a widened vocabulary reaches it without an edit — 14 tokens, 4400 → 6160 derivations, and all
  three emptiness inventories stayed empty, so the widening surfaced **no** out-of-scope step.
  Two harnesses that named the armor axis now exercise it: `derivation_equivalence.js`'s `gear`
  env and the bench's equipped CoM2 case take `orihalcon`. **All five versions verified unchanged:**
  with only the spellings and the stop in place, `tools/derivation_equivalence.js` reports 0
  differing cases over 15,480 derivations; flipping `gear` to `orihalcon` afterwards moves 312
  cases, all of them Orihalcon's own +1 Resistance and +2 magic ranged (and the Warlord Life Steal
  modifier that reads Resistance), in `com_6.08`/`com2_1.05.11`/`com2_warlord_1.5.12.7` only — MoM
  has no armor quality and shows none. **The reintroduction check is bindable and bound:**
  `tests/fail-loud-f113.spec.js` gains a twelfth case handing `armor: 'plate'` to
  `deriveUnitStats`, requiring a throw that names the value. No `SPEC.md` change: this applies
  *Out-of-range values stop the run* at one more site.
- **Folded in:** nothing. **Filed:** F129 — the sweep's shared slot is still empty (`rtb: 0`), so
  the corrected token list gains no applied step by itself; a positive strength adds six Warlord
  writes and strength 0 uniquely keeps one, but sweeping both takes the check from ~11s to ~20s,
  which is a cadence decision rather than a defect.

- **F116 — the two Warlord `Special` units reach both pickers, and an unordered bucket now
  throws.** Premise re-measured over all four rosters: `populateUnitDropdown`'s `categoryOrder`
  still dropped an unnamed bucket silently, `Special` was still the only unnamed one, and its two
  members still passed the `CreateOutpost`/`Floating Island` exclusions. **The row's ids were
  wrong** — the records are `[218] Ballista` and `[257] Fire Galley` in `units_warlord.js` and in
  `UNITS.INI`; 36 and 54 name nothing. `Race=14` held. **Placement:** `Special` is race id 14 in
  the engine's own race table, between the named races and the realm ids, and both modern
  generators read it through that table rather than the realm one, so it is a non-race, non-realm
  bucket and sits beside `Other`, after the races and before `Generic` — which is where it renders,
  between Goblin and the Generic block, on the card combobox and on both matrix axes.
  **Fail-loud:** the emit loop now throws on a bucket `categoryOrder` does not name, naming the
  category, its units, the roster version and the expected set, per `SPEC.md`, *Out-of-range values
  stop the run*. This is the only place an unenumerated category is checked at all: the DOS roster's
  category is the source's race column copied verbatim (`tools/parse_tweaker_unit_data.py`), unlike
  the modern generators, which raise on an unmapped `Race=`. Verified in the browser: Warlord's
  pickers go 294 → 296 units on both sides and both matrix axes, the other four rosters stay at
  148/148/156/159 with unchanged category lists, and both units select cleanly onto the card
  (Ballista melee 0, ranged 8 missile, To Hit 50; Fire Galley melee 14, ranged 11, fire breath 8)
  with no console errors. `roster-smoke.spec.js` iterates the picker's own flat list, so it now
  covers both units without an edit. No `SPEC.md` change: the picker's grouping is not specified
  there, and the throw applies an existing rule.
- **Folded in:** nothing. **Filed:** F128 — `categoryOrder`'s `Other` entry, which no roster in any
  of the four can produce and which the new throw therefore makes an unsatisfiable enumeration
  member.

- **F125 — the modern card now carries the record's five To Hit fields, each with its own
  displayed projection.** Premise re-measured first and held: `ui_card.js:434`, `stats.js:1787`,
  `stats_sequence.js:69-77` and `combat_phases.js:366` were all where the row said, and the
  disputed preset-side count re-derived to **187**, not 183 — the committed census is
  `tools/preset_attack_notation_sweep.js` (1086 modern custom sides: 187 DOS pair, 2
  `modernAttacks`, 897 with no secondary attack; both failure classes empty; 196 sides carrying a
  non-zero `toHitRtbMod`, 175 of them beside a pair). **Landed:** `com2*` cards replace the
  `#aToHitMod`/`#aToHitRtbMod` pair with the record's own five — the common `hitchance`
  keeping the `30% +` prefix, plus `hitchancemelee`, `hitchanceranged`, `hitchancethrown` and the
  one `hitchancebreath` that serves both breath strengths — while DOS keeps its pair unchanged.
  Each of the five carries a `.mod-val` projection, and the four modifier rows resolve the
  threshold the roll compares against, carrying the ranged distance penalty and the 10..100
  attack-roll bound; that is one `buildChanceProjection` per hitchance field rather than per
  output channel, so one breath row answers for both breath channels. The worked example the row
  filed is fixed: missile Ranged 5 + Thrown 5 with Holy Weapon now reads 50/50/40 across the
  ranged, thrown and breath rows against the single 40% row it showed before, and retyping Ranged
  to `magic` shows ranged 40% beside thrown 50%. `base:baseHitChance` is a new modern-only seed
  step; `baseRtb`'s `baseToHitRtbMod - baseToHitMod` compensation is gone; `modifierTraces`
  renames the legacy row to `toHitShared` and adds `toHitCommon`/`toHitRanged`/`toHitThrown`/
  `toHitBreath` for modern only. Passing a version's foreign To Hit field now halts
  `deriveUnitStats` and `applyPreset` instead of writing a control nothing reads, and the roster
  `Hit=` seeds the common field. All 378 + 196 modern preset sides were restated in the five
  fields. **Not landed, and refiled as F127:** the row's claim that the attack half was “notation
  debt rather than a live defect” is false. Migrating the 187 pair-sides to `modernAttacks` and
  diffing every preset through browser `runTests()` moved 24 of 1050 presets, 19 to zero damage,
  because the modern melee-initiation guard, `breathExists`, Focus Magic's and Lightning Blade's
  slot lists and the Alumni/Energy Cannon/permanent-ranged reads all consult the DOS-shaped shared
  slot rather than the four channels. That half was reverted; the same before/after diff over all
  1050 presets moves **nothing** for what did land.

- **F106 — MoM 1.31's second `BU_Apply_Specials` call now has a chain position of its own.** The
  premise held on re-measurement: the two callers are still 131:0x8F2A2 and 131:0x90A1D, 1.31 still
  passes `mutations` whole where CP 1.60 and CoM 1 pass 0 (`unitcalc.c`), and the three Chaos
  Channels blocks still sit at one position in `CHAIN_MOM_1_31`. **The work the row asked for
  first, done exhaustively:** of the ten writes the recompute makes to the shared slot ahead of
  0x90A1D, only three can reach a unit the fire-breath block admits — the Chaos node aura
  (0x8FF97), Black Prayer (0x907F0) and Mind Storm (0x9095E). Leadership (0x90075) and Weakness
  (0x90925) are excluded by the race and projectile-class gates, True Light and Darkness
  (0x903F7/0x9048B/0x90542/0x905D5) by their `rt_Life`/`rt_Death` tests, and Metal Fires (0x906FC)
  by its missile-or-Thrown type test — all four because the mutation itself writes `race = rt_Chaos`
  and `ranged_type = RAT_FIRE_BREATH`, and nothing between the two calls writes either field back.
  Prayer, which the row named, writes no attack strength at all. **Decision: model the second
  position**, because the fold is lossy in a state a user can select. Measured on `mom_1.31` before
  the change: a Chaos-node CC breather derived slot 4, Black Prayer 1 and Mind Storm 0, where the
  engine re-assigns 2 in all three; after it, 2 in all three, with `mom_cp_1.60.00` (4) and
  `com_6.08` (6) unmoved. `c:chaosChannels:fireBreath:recompute` is the new `mom_1.31`-only step,
  chained between `c:mindStorm` and `c:warpAttack`; its gate and write are the same block as
  `c:chaosChannels:fireBreath`, stated once. The armor half stays folded as one `+6` and is now
  recorded in `SPEC.md`, *Deliberate deviations*: every write between the two calls is an addition
  and the only Defense clamp is terminal, so the fold is exact — unfolding it would instead expose
  the modelled `c:berserk` `def = 0` shortcut, which stands in for the engine's never-observable
  `−20`. Held by the version-difference pair `ccFireBreathRepeatsAtRecompute131` (5.000, 7.000
  against the unfixed code) and `ccFireBreathRecomputeFixedCP` (7.000), identical but for `version:`.
- **Folded in:** nothing; nothing was filed.
- **F60 — the DOS engines' per-figure Doom Gaze delivery is now modelled, and the deviation is
  retired.** Both open questions resolved against the sources. (1) Reachable: `#aRtbType` offers
  `gaze_multiple` on the DOS card and `#aFigs` accepts 1–9 on a Custom unit, so a multi-figure
  Doom Gaze is one selection away even though Chaos Spawn, the only `Gaze(Multiple)` unit in
  either DOS roster, has one figure. (2) CoM 6.08 does share the delivery: the automatic-damage
  arm and the enclosing per-attacker-figure loop are annotated `com1:=` throughout
  (`combat.c`, `0x9A1E6`–`0x9A204` inside the loop closed at `0x9A576`), and CoM 1 reaches the
  full-strength arm through its own inverted marker test, which the type-104 setup at `0x99B37`
  always sets. `buildGazeDist` therefore takes a `doomFigs` argument — the gazer's living figures
  from the two DOS call sites, 1 in CoM2/Warlord, matching the literal `1` those engines pass at
  `0x5B3858`/`0x5B3982`. Measured: a 3-figure strength-4 gazer deals 12 in `mom_1.31`,
  `mom_cp_1.60.00` and `com_6.08` where it dealt 4, and still 4 in `com2_1.05.11` and
  `com2_warlord_1.5.12.7`; every existing doom preset uses the one-figure default and is
  unmoved. Three presets carry the pair — `doomGazePerAttackerFigureMoM`,
  `doomGazePerAttackerFigureCoM`, `doomGazeOncePerAttackCoM2`. `SPEC.md` loses the deliberate
  deviation and states the third bound beside the other two under *Gaze structure*.

- **F114 retired into [F125](./BACKLOG.md) with no separate work.** Migrating the modern preset
  sides off the DOS-shaped `rtb`/`rtbType` pair cannot be separated from replacing the card's two
  To Hit controls with the record's five: both rewrite the same modern fixture sides, and F114's
  closing question — whether `applyPreset` should reject a DOS-style field on a `com2*` fixture —
  is the same rule for both notations. F125 carries F114's measurements, its cost argument and that
  question in full. The ID is retired, not reused.

## 2026-08-21

- **D37 — reconstructed CoM 6.08's complete post-combat result materialization routine; no
  calculator change.** The CoM-only `[0x9BCE0,0x9D535)` body now lives in
  [combat.c](../Reference%20docs/DOS%20reconstructed/combat.c), with its four-word winner/item-list
  ABI, four BP-sharing helpers, city/lair aftermath, item recovery, fame/experience, UI tail, and
  every material write. The direct drained-unit path admits a non-Supernatural candidate without
  reading skill; a candidate carrying common attack mask `$2000` (Supernatural) instead requires
  the winner's `Nominal_Skill` at player offset `+0x56` to be at least 240. Overflow status 12
  re-enters at `0x9C1DF` after the one-time drained-candidate producer, and CoM's patched
  automatic-raze helper forces razing only for population zero. Durable ABI, edge/call/write
  inventories, the 56-row ledger, and review dispositions are in
  [D37.evidence.md](../Reference%20docs/DOS%20reconstructed/D37.evidence.md); its checker accounts
  for 170 conditional branches, 38 calls, and 99 named writes with none unaccounted. Calculator
  scope is not applicable, so all five calculator versions are unchanged; backlog D37 is closed.

- **D28 — reconstructed `Auto_Move_Unit` and resolved CP's third Wall-of-Fire edge as movement
  parity, with no calculator change.** The complete MoM 1.31/CP 1.60 routine
  `[0x8A90D,0x8B30D)` and the version-specific `0x89448` body now live in
  [combat.c](../Reference%20docs/DOS%20reconstructed/combat.c); byte inventories, the exact
  175-byte nine-run diff, incoming-edge classification, ledgers, and review dispositions live in
  [D28.evidence.md](../Reference%20docs/DOS%20reconstructed/D28.evidence.md). CP's
  `0x8AF6B -> 0x89448 -> 0x9EDAA` chain applies Wall of Fire to an admitted automatic/AI movement
  step crossing into the city box. Both builds already have the interactive movement-phase edge
  at `0x6CF07` and attack-phase edge at `0x99670`; CP adds parity for the second movement
  executor, not a new damage-strength rule. Movement and path history remain outside the
  calculator's one-exchange contract, so `mom_1.31` and `mom_cp_1.60.00` preserve their existing
  single melee Wall phase. Both durable checker runs cover all four assigned extents with zero
  unaccounted semantic branches, calls, or named writes; backlog D28 is closed.

- **F124 — the modern ranged branch now sets `isLightning`, so Lightning Resist clears Armor
  Piercing against a lightning-bolt ranged attack.** `Combat.ApplyAttack.pas:230-231`
  (`$005B1B9C..$005B1BD9`) sets `islightning := aflags2.armorpiercing or (Units[au].rangedtype = 30)`
  on the `ATRanged` path; its sole consumer is `EffectiveDefense`'s
  `if U^.lightningresist and islightning then flags.armorpiercing := False`
  (`Combat.ResolutionHelpers.pas:202-203`, reached from `Combat.ApplyAttack.pas:448`, and
  `aflags.armorpiercing` is read nowhere after it). The modern `ranged` branch of
  `computeCasterDefenseForAttack` set no `isLightning` at all, so the clear never happened.
  **Measured before/after:** attacker with Armor Piercing and a `magic_lightning` ranged attack
  versus a Lightning Resist defender at Defense 5 gave `vsRanged` 2 (5 halved) and now gives 5, in
  both modern versions. This is the consumer [F93](#2026-08-21) said the new `magic_lightning`
  token still lacked.
  **The row's prescribed formula was narrowed, with a source.** `|| aArmorPiercing` was proposed as
  the transcription of `aflags2.armorpiercing`, and it is not reachable here: `aflags2` on the
  ranged path is `rangedflags` (`:225`), and the only write to `rangedflags.armorpiercing` in the
  compiled recalculation is the hero-item `IPLightning` power (`Units.RecalculateUnits.pas:1306`),
  which this calculator does not model. Every Armor Piercing it *can* carry is the **global**
  `attackflags` one, which `islightning` does not read — the roster's single `ArmorPiercing=Yes`
  byte, and all twelve Warlord script grants, which pass flag selector `1`, "Global"
  (`Scripts.TXT:642-643`; `CreateUnit.CAS:261` reads that same global record to ask what the
  template gave). Including it would have let Lightning Resist cancel Armor Piercing for missile,
  boulder and plain magical ranged attacks the engine still halves — measured as +2 defense on
  those three, which the two boundary presets now catch.
  **`isFire` is not a second defect.** The engine's `isfire := False` on the ranged path
  (`:229`) is already what the calculator produces: `effectiveDefense` reads `isFire: !!attack.isFire`,
  so an absent key is `false`. The melee and gaze branches omit it for the same reason. The `thrown`
  branch's real `isFire`/`isLightning` are correct as they stand — that branch covers `ATThrown`,
  `ATFirebreath` and `ATLightningbreath`, and its `thrownType` discriminator reproduces all three.
  **Scope, measured.** A sweep over `computeCasterDefenseForAttack`, `computeDefenseProfile` and
  `resolveCombat` — every projectile token in both vocabularies × Armor Piercing on/off × Lightning
  Resist on/off × six defender immunity profiles × all five versions, the four modern named
  channels, and every one of the 78 CoM2 and 153 Warlord records carrying a `ranged_type` — diffed
  1566 lines against the pre-change tree. **40 lines differ, all `com2_1.05.11` and
  `com2_warlord_1.5.12.7`, all the id-30-plus-Armor-Piercing-plus-Lightning-Resist cell.
  `mom_1.31`, `mom_cp_1.60.00` and `com_6.08`: 0.** The DOS path keeps its own lightning handling
  and was not touched.
  **Roster reach.** Id 30 is `[23]` Warlock, `[33]` Chaos Warrior and `[193]` Storm Giant in CoM2
  (3 of 78 typed records) and `[23]`, `[33]`, `[193]`, `[263]`, `[285]`, `[301]`, `[328]`, `[362]`
  in Warlord (8 of 153). Six of the eleven move; the five that do not are the records without
  Armor Piercing — CoM2 `[23]`, Warlord `[328]` Cloud Elephant — and Warlord `[362]` Wanderer's
  zero-strength record. That is the engine, not a gap: `islightning`'s only action is to clear a
  flag, so with no Armor Piercing present there is nothing to clear, and a roster preset on those
  records would be vacuous.

- **F93 — the modern projectile vocabulary is the classification the modern engine actually has.**
  Decision (b), taken with the third path folded in: the modern tokens collapse to
  `none`/`missile`/`boulder`/`magic`/`magic_lightning`, and the bounded deviation is recorded in
  [SPEC.md](./SPEC.md), *Deliberate deviations*. `RangedType.INI` carries five keys per entry —
  `Image`, `StatIcon`, `Sound`, `Ismissile`, `Ismagic` — and the loaded table is read only through
  `Ismagicalranged`, `Ismissileranged` and three display accessors, so **no realm is attached to a
  modern projectile anywhere**. The `magic_c`/`magic_n`/`magic_s` split was inherited from the DOS
  engines' real 21-entry `Battle_Unit_Attack_Magic_Realm` table (131:0x9A7A9) and projected onto
  modern records; [Q27](#2026-08-21) removed the last modern read that separated the three. Id 30,
  the lightning-bolt projectile, is split off as its own token because the modern engine's
  lightning behaviour keys on it; it behaved identically to `magic` everywhere until
  [F124](#2026-08-21) added its consumer. **The DOS vocabulary is untouched**, because those engines do
  have the table: the two vocabularies now diverge on purpose, and `isMagicalRangedType` names both.
  **The one number this moves is Alumni of Academy's figure gate.** `CreateUnit.CAS:462-464` is
  `GetStat(U,SRangedType,1) > 29` — the whole magical band, Warlord's own id 40 beam energy
  included — and the three realm tokens excluded it: a Halfling 6-figure card typed `beam` derived
  6 figures where the engine gives 8. With one magical class the gate is the band by construction.
  **The row's cost premise held; two of its factual premises did not.** Its *Coverage* paragraph
  described the pre-[F112](#2026-08-21) tree — "Uncovered: Warlord-only 12, 13, 14, 22", "All seven
  fall to the generators' `'Missile'` default" — which F112 had already closed; there is no
  `'Missile'` default. And the coverage route proposed for this change, Energy Cannon feeding the
  Alumni gate, does not exist: Energy Cannon writes `SETSTAT(U,SRangedType,1,40)` at
  `CreateUnit.CAS:694`, **after** the Academy branch at `:462`, and the chain has
  `base:alumniOfAcademy:figures` before `base:energyCannon` for the same reason. The pre-change
  `beam` state is therefore reachable only by selecting Beam on a Warlord card, which this change
  removes, so no post-change input separates fixed from unfixed for id 40 specifically.
  `alumniOfAcademyLightningBoltWarlord` binds what the vocabulary can still state — a magical
  projectile outside the DOS realm triple takes the +2 — at 8.000 against the 6.000 the unfixed
  code gives the same unit, confirmed by temporary revert; `alumniOfAcademyMagicRangedWarlord` is
  red against the unfixed code for the same reason. `tests/marionette.spec.js` gains the ascension
  retype's own case.
  **The Marionette ascension retype is now modelled.** [F107](#2026-08-21) declined it because
  id 30 "lands on the same `Magic(C)` class as the primary arm's id 31"; a separate
  `magic_lightning` token voids that. `UnitCalcPre.CAS:269-273` writes `AWallCrusher`,
  `AFArmorPiercing` **and** `SRangedType = 30` for an ascended Chaos primary, after the twenty
  book-grant blocks that follow the five realm arms at `:104-176`, so it is a second region-`b`
  write: `b:marionette:ascensionRangedType`, adjacent on the chain because nothing modelled writes
  a projectile type between the two.
  **Measured inert everywhere else.** A dedicated sweep of **60,520 cases per run** — a
  derivation grid over every projectile token × three strengths × 39 ability environments × two
  levels × two materials, the same grid again through the modern card's four channels including a
  typed zero-strength Ranged record, every unit of all four rosters at two levels under four
  ability sets, a defence-profile and `resolveCombat` control sweep over twelve defender immunity
  profiles × seven attack types, and the whole Marionette package matrix — run against the
  pre-change tree with each version's own vocabulary and diffed field by field. **56 cases differ:
  16 are the Warlord Alumni/id-40 fix, 40 are the new `marionette.ascensionRangedType` package
  field.** `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11`: **0**.
  `tools/derivation_equivalence.js` agrees on its 9,288 DOS derivations (its `magic_s` shape is
  now resolved per version, which is why its modern half is not a comparison).
  **Regeneration moves 49 CoM2 and 84 Warlord records**, all `ranged_type` lines and nothing else;
  3 CoM2 and 8 Warlord land on `Magic-lightning`. `units_mom.js`, `units_com.js` and all three DOS
  `Unit rosters/` products are byte-identical.
  **The DOS `Beam` select option is removed too.** No DOS engine has a shot type 40 — the 21-entry
  realm table runs 0/10/11/20/21/22/30-38/100-105 — no DOS roster record carries it, and no preset
  or check input names it (0 of 1,041 presets, both notations), so removing it moves no reachable
  number; the only thing it could ever express was a unit the engine cannot represent. That left
  one stranded reference — `dosDefenseForAttack`'s magical set named `beam` beside the realm
  triple — and it is removed with the option that fed it, measured at 0 differences.
  Three preset keys named a realm the modern engine does not have.
  `resistElementsMagicCCoM2` becomes `resistElementsMagicRangedCoM2` and `elemArmorVsMagicSCoM2`
  becomes `elemArmorMagicRangedCoM2`; `resistElementsVsMagicSCoM2` is **removed**, because with one
  magical class it is byte-identical to the first of those — one CoM2 endpoint now serves both MoM
  contrasts, which its `desc` says. 39 modern preset sides move token.
  **Nothing was folded in.** Checks: `node tools/node_unit_checks.js` 14311/14311 (+8: +9 scope,
  chain and PROVENANCE rows for the new step, −1 for the CoM 1 Guiding Beacon loop's dropped
  `beam` iteration); `npm run provenance` 268 formulas (+1, the new step), 268 verified,
  0 UNVERIFIED; `npm test` 116 passed, 0 failed.

- **Q27 — Righteousness does not exist in the modern engine, so its CoM2/Warlord defense branch
  was dead code, not a parked classification.** `Caster.exe` (md5 `540c22dbd701fb2caa95bd3ecccd9447`)
  contains **0** occurrences of `Righteous` in any casing, ASCII or UTF-16LE, across all 10,584,041
  bytes — a scan whose control term `Invulnerability` returns 5 + 2 — and none of the 62 members of
  the `@Sharedconstants@Enc*` enumeration is Righteousness. `EffectiveDefense`
  (`Combat.ResolutionHelpers.pas:173-217`) makes exactly six `Result := 100` assignments,
  `$00596730..$00596813` back to back with the Weapon Immunity tail at `$0059681A`, leaving no gap
  for a seventh; `GetEffectiveResistance` (`:110-131`) has five terms whose Chaos/Death arm is
  `EncBless`, keyed on `SpellTable[spellid].Realm`, and `ApplyAttack` passes `spellid = 0` for
  every physical attack. 0 hits across the 74 CoM2-base script files, both `DESC.INI`, both modern
  `UNITS.INI` and all four `units_*.js`; Warlord's hits are the unrelated hero ability
  **Righteous Ward** (`MASTER.CAS:1234`, `HARighteousWard = 34`) plus one line of Paladin flavour
  prose. The modern immunity test and the four `righteousnessEligible` producers that fed it are
  removed from `combat_effects.js`; the step drops from seven tests to six, matching its own
  `Combat.ResolutionHelpers.pas@span:6` citation exactly. The DOS path is untouched:
  `DOS_DEFENSE_WRITES.righteousness` and `DOS_RESISTANCE_WRITES.righteousness` are cited,
  `SCOPE_MOM`, and stay.
  **The row's premise was wrong about where the code lived.** It pointed at
  `combat_special_attacks.js`, whose nine Righteousness mentions are all comments already saying
  MoM-only; the live modern site was `Calculator/combat_effects.js`.
  **The removal is unobservable, and no preset was written for it.** A forced-reachability probe
  showed the branch would have fabricated total immunity if it could fire — `vsRanged`, `vsThrown`
  and `vsImmolation` 5 → 100 in both modern versions — but nothing can set it: the enchantment's
  `subgroup: 'MoM only'` makes `applyDisabled` clear the checkbox on every version change and on
  `applyFullState`'s `refreshAbilityFieldVisibility()` before `recalculate()`; the matrix filters
  through the same `subgroupAllowedForVersion`; all four rosters and both modern `UNITS.INI` carry
  0 occurrences; no derivation step grants it; and all 15 presets naming it sit in the
  `V_MOM_131` test-tree group or declare `V_MOM_CP`. A preset here would be vacuous by
  construction, which is what `CLAUDE.md`'s *Presets* contract and the F61 vacuity backlog exist
  to prevent. Measured unchanged: `tools/derivation_equivalence.js` identical across all five
  versions. Checks: `node tools/node_unit_checks.js` 14303/14303; `npm run provenance` 267
  formulas, 267 verified, 0 UNVERIFIED; `npm test` 116 passed, 0 failed.

- **F108 — CoM 1 Focus Magic is now the engine's literal three-way branch, and its ammunition gate
  is vacuous rather than unmodelled.** `c:focusMagic`'s CoM 1 body had a pre-loop adding `+3` to a
  live magical-ranged or breath slot under a fabricated `strength > 0` gate, and a second loop with
  three invented predicates. It is now one branch per slot, as `unitcalc.c` com1:0x8F7E6-0x8F84C
  has it: arm 1 tests the **unit type's** ranged type (com1:0x8F804) for `>= 30 and <> 100`, with
  no strength test; arm 2 the live type `> 100`; arm 3 retypes to shot type 34 and **floors** at 3.
  Four defects closed together, all measured on `com_6.08`: the fabricated strength gates (a
  `magic_c 0` template took `magic_s 3` instead of `magic_c 3`, and `fire 0` / `lightning 0` took
  nothing instead of 3); a Thrown template at strength 0 taking nothing instead of arm 3; the
  creation arm assigning `= 3` where the engine floors, cutting a typeless slot at 4 to 3; and arm
  1 reading the live type rather than the permanent one, which is what kept **every gaze** out of
  the block — 103, 104 and 105 are inside arm 1's band, and no gaze token is in `RANGED_TYPES` or
  `THROWN_TYPES`, so a gaze unit fell through to the creation arm and was retyped away.
  **Both of the row's premises were wrong, and correcting them was the work.** The `ammo > 0` gate
  (com1:0x8F7FB) is not a modelling decision at all: the battle-unit setup routine floors
  `bu->ammo` at 4 for any unit carrying the persistent Focus Magic bit (com1:0x8EB87-0x8EB9F, the
  six-byte `test` occurring once in `com1` and never in `mom131` or `cp160`) and only then calls
  the constructor at com1:0x8EC99, with no write to `bu->ammo` in between. So the gate can never be
  closed here, no ammunition input or Energy-Cannon-style inference is needed, and Q17's posed
  alternative — "the constructor seeds it non-zero" — is the answer; its second half resolves to
  arm 3 being reachable for 140 of the 192 shipped CoM 6.08 records. `R6.1a.evidence.md`,
  *FocusMagic's `ammo > 0` gate is vacuous*, owns the decode; the byte evidence is cited there and
  in the step comment rather than written into `unitcalc.c`, because the containing routine lies
  outside every current reconstruction extent and a body for it is binary reconstruction — filed as
  [D41](./BACKLOG.md). And the row's arm attribution was off by one: a permanent type-104 template
  is caught by **arm 1**, not arm 2, though 5.000 is the right number either way.
  **Measurement.** 1,001 `deriveUnitStats` inputs per version over every `rtbType` token × seven
  strengths × eleven co-ability environments: `com_6.08` moves 298, and `mom_1.31`,
  `mom_cp_1.60.00`, `com2_1.05.11` and `com2_warlord_1.5.12.7` move **0**, as `SCOPE_COM_PLUS`
  requires. The control-surface digest moves 0 of 15,480 — its shapes carry no zero-strength typed
  slot and no gaze, which is where the defects lived. Exactly one existing preset moved out of
  1,037: `focusMagicDoomGazeCoM`, 2.000 → 5.000.
  **The version pair was re-aimed rather than restated.** Both engines now reach `+3` on a doom
  gaze, so the pair's old `+3`-presence claim is gone; in ranged mode the surviving difference is
  what else the block does — CoM 1's single branch spends itself on the gaze and creates no attack,
  so the exchange falls back to melee for 5.000, while CoM2's independent gaze and creation tests
  fire the created strength-3 magic_s attack for 3.000. Four new CoM 1 presets hold the four
  defects: `focusMagicStoningGazeCoM` (2 → 5), `focusMagicBreathIgnoresLiveStrengthCoM` (1 → 4),
  `focusMagicConvertsZeroThrownCoM` (0 → 3) and `focusMagicFloorsTypelessSlotCoM` (3 → 4). All five
  were confirmed red against the unfixed body and green after, in the browser through `applyPreset`.
  `baseRangedPresent` lost its only consumer and is gone, with the `slot.baseHasRanged` plumbing
  that fed it; the `slotHas*` helpers keep other callers. **Nothing was folded in.** `e:clamp`
  gates the gaze mirrors on the base value while `rtb` beside them goes through `isLiveSlot`, so
  the corrected `+3` on Night Stalker and Gorgons (both `Ranged 0`) is written and then discarded —
  filed as [F122](./BACKLOG.md), because that step is `SCOPE_ALL`. A CoM 1 prose-vs-binary
  discrepancy (manual "3 ammo" against the binary's 4, and helptext silent on breath and gaze) is
  recorded in the R6.1a evidence rather than in `Source discrepancies.md`, whose stated scope is
  Warlord three-way conflicts only. Checks: `node tools/node_unit_checks.js` 14303/14303;
  `npm run provenance` 267 formulas, 267 verified, 0 UNVERIFIED; `npm test` 116 passed, 0 failed.

- **F107 — the Wanderer's permanent ranged type is a roster fact, and the Marionette realm retype
  is a region-`b` calculated write.** `tools/generate_warlord_units_json.py` emitted `ranged_type`
  only beside a positive `Ranged`, so `UNITS.INI [362]` Wanderer's `RangedType=30` never reached
  `Calculator/units_warlord.js`; the calculator recovered it from `deriveMarionettePackage`'s
  hardcoded `rangedType: 'magic_c'`. Both generators now key `ranged_type` on `RangedType > 0` and
  `ranged`/`ammo` on `Ranged > 0`, and each `verify_attack_channel_coverage` fails if a positive
  `RangedType` does not reach the record. `predefinedModernAttacks` (`ui_matrix.js`) follows
  `SPEC.md`, *Attack channels on the card*: the Ranged record exists when its projectile type is
  set, whatever its strength. The strayed package projects no ranged type — `UnitCalcPre.CAS`'s
  strayed branch (`:364-392`) writes none — and `baseSequenceRangedType` (`stats.js`) is the
  permanent type alone. `SETSTAT(U,SRangedType,0,...)` (`:104`, `:122`, `:140`, `:158`, `:176`,
  `:272`) is record selector `0`, so the owned realm retype is the new `b:marionette:rangedType`,
  positioned after `b:marionette:stats` as the script has it.
  **The row's premises held, with one refinement.** Exhaustive over both shipped rosters: CoM2 201
  records / 78 `RangedType` keys / **0** with `Ranged` absent or zero; Warlord 364 / 156 / **4**, of
  which three (`[297]` War Monks, `[306]` Dragon Horses, `[314]` Weretiger Mages) state
  `RangedType=0`, which names no type. `[362]` Wanderer is the only record whose ranged type *names
  an attack* at zero strength. `RangedType.INI` confirms ids 30, 31, 33, 34, 35 and 37 are all
  `IsMagic=Yes`.
  **Half 2 is genuinely inert, measured**, not assumed: with the retype seeded into the permanent
  record versus written in region `b`, 15,832 roster and Marionette derivations and 15,480
  control-surface derivations are field-identical. Focus Magic never reaches the arm that reads the
  permanent ranged *type*, because the Wanderer's permanent ranged strength is zero.
  **Only entry 362 moved.** All five rosters regenerate; `units_com2.js`, `units_mom.js` and
  `units_com.js` are byte-identical and `units_warlord.js` differs by one line. Over 15,832
  roster/Marionette derivations exactly one roster record moves — Warlord `[362]` — and only
  `modernAttacks.*` and the package's own `rangedType` field move; `mom_1.31`, `mom_cp_1.60.00`,
  `com_6.08` and `com2_1.05.11` are unchanged, as is the 15,480-case control surface.
  **The whole item is arithmetically inert through the UI**, which is why no preset can separate
  before from after: the card path previously reached the same values through the hardcoded
  projection. What it fixes for the card is the *source* of the fact; `predefinedModernAttacks`'s
  divergence — matrix rows carried no Ranged channel for such a record — is real but unreachable,
  because `populateUnitDropdown` excludes Heroes from every matrix row. Coverage is therefore the
  admissible non-preset kind: three source-bound assertions in `tools/unit_checks/warlord_abilities.js`
  (whose Marionette fixture now states the roster record instead of an empty one), the independent
  region-`b` transcription anchor in `tests/f20-source-order.spec.js`, and a browser test binding
  the roster field, the card control and the retype's `magic_c -> magic_n` region-`b` write. Both go
  red against the unfixed code, confirmed by temporary revert. `wandererRosterRangedTypeWarlord` is
  added as the forward regression guard on the new single home: dropping `ranged_type` from entry
  362 alone takes it from 3.0 to 6.5, and it was the only preset that failed.
  **The strayed branch's open sub-question is settled by the sources, not invented.** The script
  writes no ranged type there, and the `magic_c` the package hardcoded was never a projection — it
  was `UNITS.INI [362] RangedType=30` restated in code. With the roster field present the hardcode
  is redundant and is gone; nothing is invented in its place.
  **Filed rather than fixed:** [F121](./BACKLOG.md), the card/matrix roster-record divergence the
  measurement exposed. Nothing was folded in. Checks: `node tools/node_unit_checks.js` 14303/14303
  (+12: 9 from the new step's scope and chain rows, 3 new fixture assertions);
  `npm run provenance` 267 formulas, 267 verified, 0 UNVERIFIED; `npm test` 116 passed.

- **F109 — the DOS material body's secondary gate is the engine's type-only one.** `quality > 0`'s
  secondary group is one gate over three types — `RAT_CLASS(bu->ranged_type) == RAT_CLASS_MISSILE
  || RAT_CLASS_BOULDER || bu->ranged_type == RAT_THROWN` (`unitcalc.c`, 131:0x8F089/0x8F09C/0x8F0A4,
  160:0x8F09B/0x8F0AE/0x8F0B6, com1:0x8F070/0x8F083/0x8F08B) — and its three writes,
  `bu->ranged += quality - 1`, `Gold_Ranged` and `ranged_tohit++` (131:0x8F0BA/0x8F0CD/0x8F0DD),
  make no strength test. `c:weapon` (`stats.js`, `weaponStatSteps`) held both DOS arms behind
  `context.calcBaseRtb > 0`, the slot's *input* strength — the last of the precomputed-modifier
  gates [M14](#2026-08-21) retired elsewhere and the fabrication [F97](#2026-08-21) took off the
  modern arms. Both are gone; the modern arms are untouched, and the now-dead local
  `const calcBaseRtb = recordContext.calcBaseRtb` went with them.
  **The row's premise was wrong in two places.** Its *"164/162/132 over a 22,528-case sweep"* is
  **not reproducible** — that sweep's composition was never recorded, so there is nothing to re-run.
  A 79,160-case weapon-material sweep of this item's own — every ability and enchantment solo, the
  four materials, both levels, all thirteen shared-slot types at three strengths, the eight modern
  channel shapes and the twelve non-ability environment inputs — moves **2427 `mom_1.31`,
  2423 `mom_cp_1.60.00` and 2408 `com_6.08`** cases and **0 in either modern version**. And its
  *"and its `+10` threshold"* is **imprecise**: the To-Hit half already lands at zero input strength
  and is already asserted to, by `R9-G1e DOS material Thrown gate is type-only even at zero
  strength` (`tools/unit_checks/backlog_checks.js`). Only the strength write was gated, and this
  change makes the two halves of one block agree.
  **Measurement.** Only `rtb` and `rtbBonus` move, in 4,098 of 19,800 field-level cases; no To-Hit
  field moves anywhere and nothing decreases. Every moving case has input strength 0, a slot type in
  {missile, boulder, thrown} and a mithril or adamantium weapon — magic is quality 1 and adds
  nothing. **No shipped DOS template can carry that pair**, which answers the row's open question:
  0 of 376 MoM and CoM 1 roster records have a Missile/Boulder/Thrown type at zero Ranged strength,
  so only a Custom card reaches it. Of the 1,032 pre-existing presets, 0 move.
  **Coverage.** Three positive presets and one negative control, all browser-measured through
  `applyPreset` and confirmed red against the unfixed code:
  `weaponMaterialDosThrownHasNoStrengthGateMoM` (7.000 against 5.000),
  `weaponMaterialDosMissileHasNoStrengthGateMoM` (2.000 against 5.000) and
  `weaponMaterialDosThrownHasNoStrengthGateCoM1` (7.000 against 5.000); the control
  `weaponMaterialDosSecondarySkippedByFocusMagicCoM1` holds at 5.000 because CoM 1 wraps the whole
  secondary half in `if (!(ench_lo & UE_FOCUS_MAGIC))` (com1:0x8F095) — measured sensitive by
  forcing that exclusion open, which raises it to 7.000. No Node assertion was added: `rtb === 2`
  would restate the implementation in a second notation, and the damage numbers bind the claim.
  **Nothing was folded in.** The Missile preset exposed a mode flip that is filed rather than fixed:
  `hasRangedAttack` (`ui.js:229-232`) reads the derived record, so a card that newly gains a ranged
  attack switches from a silent melee exchange to a ranged one — [F119](./BACKLOG.md). The
  [predicate inventory](../Reference%20docs/Attack-type%20predicate%20inventory.md) E64 is now a
  match, and E29's post-F95 text was corrected in passing: its `calcBaseRtb > 0` reading is settled
  for the `ApplyLevelBonus` arms it cites, and the gate that survives is on the DOS ladder arm,
  which transcribes `BU_Apply_Level_Bonus` and is outside that row. Checks:
  `node tools/node_unit_checks.js` 14291/14291; `npm run provenance` 266 formulas, 266 verified,
  0 UNVERIFIED; `npm test` 115 passed.

- **F111 — Metal Fires' whole block is one MoM-only step again.** `c:flameBlade:ranged` applied
  `fbAtkBonus` for Metal Fires as well as for the blades, under `SCOPE_ALL` and at Flame Blade's
  chain position, while Metal Fires' own melee write sat much later under `SCOPE_MOM`. The engine
  keeps all three writes in one block — `unitcalc.c` 131:0x9065F, melee 0x906C1, missile/Thrown
  strength 0x906FC, `Weapon_Plus1 = 1` 0x90723, compiled into MoM 1.31 and CP 1.60 alone — so the
  strength write moved onto `c:metalFires` beside the melee one (`combat_abilities.js`), and
  `metalFiresActive` (`stats.js`) took the version test the magic-weapon upgrade needs, since that
  write is not a step and `SCOPE_MOM` cannot reach it. **Arithmetic moved in exactly the three
  versions the row named:** 72 differing cases over 15,480 derivations, all `com_6.08`,
  `com2_1.05.11` and `com2_warlord_1.5.12.7` — 151 field differences, 58 of them a weapon silently
  upgraded to magic, the rest the +1 on the shared slot and the modern Ranged and Thrown channels.
  `mom_1.31` and `mom_cp_1.60.00` are unchanged, which is the row's position claim measured: the
  move from Flame Blade's slot to Metal Fires' own is inert in MoM.
  **The magic-weapon upgrade was folded in rather than filed**, because it is the same block, the
  same citation and the same three versions, and leaving it would have made Metal Fires produce a
  Weapon-Immunity bypass and nothing else outside MoM.
  **No preset can cover this and none was added.** `ui_abilities.js` hides the control outside MoM,
  so `applyPreset` leaves it unchecked — measured in the browser: in `com2_1.05.11` and `com_6.08`
  the checkbox stays false and `readUnitStats('a').abilities.metalFires` is `false`, and two
  candidate presets passed identically against the fixed and unfixed code. `deriveUnitStats` is the
  only path that reaches the input, so the coverage is 14 assertions there
  (`tools/unit_checks/derive_unit_stats.js`): MoM 1.31 as the positive control, then melee, shared
  slot, weapon quality and both modern channels held fixed in the three CoM engines. Eleven of them
  fail against the unfixed code.

- **F92 — M11's deferred `flameBlade` c-pair is merged.** Every engine's Flame Blade is one
  compiled block writing melee and secondary strength together — `unitcalc.c` 131:0x8F56E,
  com1:0x8F55C and `$0059FE47..$005A00E7` — so it is one step, `c:flameBlade`, and
  `c:flameBlade:ranged` is gone from all five chains, from `STEP_VERSION_SCOPES` and from the F20
  and R9-G1c order anchors. **The region-`b` question stayed closed on re-measurement:** the block
  runs after Focus Magic (`$0059A63B..$0059ABF7`) and gates its missile write on the current
  `U.rangedtype`, and `EncFlameBlade` occurs once in `UnitCalcPre.CAS` (`:840`, Fiery Fury's own
  write, carried by `b:fieryFury`) and once in `UnitCalc.CAS` (`:331`, the `d:flameBlade` fire
  breath) — 11 occurrences over the 8 Warlord 1.5.12.7 files that name it, counted uncapped. The
  step keeps region `c`. **Arithmetic is unchanged in all five versions**, measured as 0 differences
  over 15,480 derivations against the post-F111 tree. `PROVENANCE[flameBlade:ranged]` merged into
  `PROVENANCE[flameBlade]`, which moved beside the `c` step and now carries the union of both
  citation sets — the same reviewed spans regrouped, minus one Pascal span that was a subset of
  another; 267 formulas became 266 and the anchor was rebound. `node tools/node_unit_checks.js`
  drops 25 assertions with the retired scope id: 10 in the registry sweep, 2 per chain entry in
  five chains, and 5 `PROVENANCE` version claims.
  **One defect was filed, not fixed:** [F118](./BACKLOG.md) — the merged melee gate still fires on a
  base-game `flameBlade` input in Warlord, where `exceptVersions` hides that control (melee 5 → 8,
  measured), which is F111's class for a different enchantment and outside F92's no-change scope.

- **F113 — the codebase-wide sweep for fallbacks that replace an out-of-range value.** Classified
  every candidate rather than converting on sight, under `SPEC.md`, *Out-of-range values stop the
  run*. **Counts: 24 invented sites converted, 11 kept as transcription, 5 filed as backlog rows.**
  No number moved
  in any of the five versions. Converted, in the generators: `Race`, `Name`, `Figures`, `HP`,
  `Attack`, `Defense`, `Resistance`, `Moves`, `Cost`, `Upkeep` and (with `Ranged > 0`) `Ammo` are
  now required keys rather than defaulted ones — measured present in all 201 CoM2 and all 364
  Warlord records; the race-id and realm-id lookups and the picker category raise instead of
  emitting the raw id, `'Fantastic'` or `'Other'`; `parse_tweaker_unit_data.py` raises on an
  unrecognized `RangedType`, a non-numeric stat, cost, upkeep or `Gaze/Poison` cell, and its
  `main()` no longer swallows every one of those raises into a printed line and writes the roster
  anyway. Its dead `'Illusion' → 'Magic(I)'` branch is gone: `Magic(I)` is a token no consumer
  defines, and all three exports spell that class `Sorcery Illusion`, which the magic-school arm
  takes first. All four `Calculator/units_*.js` and all six roster JSONs regenerate byte-identical.
  In the calculator: `weaponBonus` and `getLevelBonuses` test ladder membership before their
  switches, so `normal` keeps the zero row and a seventh value stops; `deriveUnitStats` stops on an
  unknown level or city-walls position; `versionChain`, `loadUnitDatabase` and
  `normalizeDosCombatHealState` stop on a version they have no entry for instead of returning an
  empty deduced set, an empty roster or MoM 1.31's Extra Hits ceiling; `predefinedUnitRtbType`,
  `subgroupAllowedForVersion`, `globalEnchantmentAllowedForVersion`, the Lava Smelter grant switch
  and `convolveTouchAttacks`' damage category name their sets; and `applyPreset` stops on a key that
  is not a preset and on a fixture naming a roster unit the active version does not ship, which was
  a `console.warn` followed by computing a different unit under the same expectation. **Kept as
  transcription:** `Hit=30` and `ToDefend=30` (the engine's stated bases, absent from 200/201 and
  334/364 records), `Spellcharges=0`, a blank Tweaker cell as that field's zero, the INI convention
  that an absent ability key means the ability is absent, the `HERO_NAMES`/`ABILITY_NAME_MAP`/
  `ABILITY_MAP`/`CAT_NORMALIZE` rename tables whose pass-through is the rule (20 Warlord heroes
  have no canonical-name entry), `SPELL_NAMES` (a miss renders the record's own id, inventing
  nothing — [F115](./BACKLOG.md)), and the localStorage/share-link recovery paths, which log and
  reset to clean defaults rather than manufacturing a value. **Filed:** [F115](./BACKLOG.md),
  [F116](./BACKLOG.md), [F117](./BACKLOG.md), [T12](./BACKLOG.md) and [Q28](./BACKLOG.md).
  **Two check inputs were corrected in passing**, both surfaced by the city-walls stop and both
  producing bonus 0 where they named the axis: `version_scope.js` probed `cityWalls: 'normal'` and
  `derivation_equivalence.js` probed `'stone'`; the corrected sweep adds 7 assertions
  (14,295 → 14,302) and finds no new scope violation. **The reintroduction check is bindable and
  bound:** `tests/fail-loud-f113.spec.js` hands eleven converted sites a value outside their set,
  requires each to throw, and requires the message to name the value — replacing any stop with a
  fallback turns it red, verified by reverting one. Checks: `node tools/node_unit_checks.js`
  14302/14302; `npm run provenance` 267 formulas, 267 verified, 0 UNVERIFIED; `npm test` 115
  passed, 0 failed.

- **The preset boundary's DOS-to-modern projection stops instead of contributing nothing.** First
  application of `SPEC.md`, *Out-of-range values stop the run*, outside the roster generators.
  `dosPairAsModernChannels` (`ui_state.js`) returned `null` for any `rtbType` naming no modern
  channel, so a CoM2/Warlord fixture could state an attack and silently get none. The live case was
  `focusMagicDoomGazeCoM2`, carrying `rtbType:'gaze_multiple', rtb:2`: gaze and touch values are DOS
  shared-slot state and the modern card holds them in their own fields, so the pair contributed
  nothing and the preset was correct only through its `abilities: { doomGaze: 2 }`. The pair is off
  that fixture, its paired `focusMagicDoomGazeCoM` desc now says the two halves state the same unit
  in each engine's own notation rather than sharing a fixture, and the function throws naming the
  type, the strength and the notations that can carry it. No number moved. The remaining modern
  sides still written with the DOS pair are [F125](./BACKLOG.md).

- **F112 — the projectile-id map is complete, versioned, and stops on an id it does not know.**
  `RangedType.INI` classifies by flag: ids 10–14 carry neither `IsMagic` nor `IsMissile` and are
  the calculator's `boulder` class, 20–22 are `IsMissile`, 30–38 and 40 are `IsMagic`. Roster
  generation covered 10, 11, 20, 21 and 30–40 and sent every other id to a `'Missile'` default, so
  five Warlord units on ids 12 and 14 shipped as missile attackers — Stone Giant, Colossus, both
  Gaia Lords and the Goblin Midget Submarine. `Ismissileranged` reads the flag directly
  (`Combat.AttackAndWallHelpers.pas:181`) and `Combat.ApplyAttack.pas:228` feeds it straight into
  `EffectiveDefense`, so Missile Immunity was zeroing attacks the engine lets through, while
  Blazing March's magic-weapon grant and Elven Wind applied where they should not. The three map
  copies — the two generators, which disagreed on id 40, and a dead one in `data.js` with no
  reader — are now one home, `tools/ranged_types.py`, carrying a separate table per version
  because CoM2 1.05.11 base defines neither 12–14 nor 22 nor 40. Reserved id 39 is deliberately
  absent from both. Regeneration moves exactly five `ranged_type` values, all Warlord;
  `units_com2.js` is byte-identical. **This is the worked example behind `SPEC.md`,
  *Out-of-range values stop the run*, added in the same change:** the lookup and the missing-key
  path now raise with the value, the record and the expected set, and the codebase-wide sweep for
  the same shape is [F113](./BACKLOG.md).

- **F110 — a preset can state the modern card's four attack channels directly.** A CoM2/Warlord
  fixture may now carry `modernAttacks: { ranged: { strength, type }, thrown, fireBreath,
  lightningBreath }` on either unit; it is the complete statement of the card's channels, and the
  DOS-shaped `rtb`/`rtbType` pair keeps its one-channel projection where no `modernAttacks` is
  given (`dosPairAsModernChannels`, `ui_state.js`). **Two strength gates had to come off for the
  statement to reach the resolver, and both are the gate [F95](#2026-08-21) removed from the level
  ladder:** `modernCardAttacks` (`ui_units.js`) discarded the Ranged type selector's value unless
  the strength box was positive, and `deriveUnitStats` (`stats.js`) dropped a supplied channel at
  strength 0 unless an internal seed had asked for it. Both now treat a named projectile type as
  the Ranged record's statement of existence, which is what `UNITS.INI` ships (Warlord `[362]`
  Wanderer, `RangedType=30` with `Ranged=0`) and what `BaseUnits[i].rangedtype > 0` reads
  (`Units.RecalculateUnits.pas:548-571`). Thrown and both Breath fields have no type of their own,
  so strength remains their only existence statement, on the card and in the fixture alike.
  **Measurement.** No other preset can reach either relaxed gate: the only writer of the card's
  channels is `applyModernAttackFields`, which sets the type selector to `none` whenever it applies
  no ranged channel, and both channel sources — the DOS pair projection and `predefinedModernAttacks`
  — yield a ranged channel only above strength 0. The three internal zero-strength typed seeds
  (Marionette, Warlord combat Flame Blade, Dragon Mound) were already admitted as seeded. The suite
  confirms it: the whole 1032-preset suite passes, the two named presets included. Checks:
  `node tools/node_unit_checks.js` 14295/14295; `npm run provenance` 267 formulas, 267 verified,
  0 UNVERIFIED; `npm test` 114 passed, 0 failed.

- **F49 — CoM 1 now has its own Heavenly Light block.** `com1:0x905BB` reuses the space MoM
  spends on True Light: gated on the defending side and a non-zero `city_enchantments` byte, it
  adds +1 Defense and Resistance, +1 to a positive melee attack and to a positive shared ranged
  slot, raises `Weapon_Plus1` to 1 where it was 0, and adds a To Hit threshold to melee and to
  Thrown/Missile/Boulder where the persistent record carries no weapon quality
  (`unitcalc.c` com1:0x905BB-0x9064B). **Premise partly falsified.** The row said the effect was
  "absent from `enchantments.js` and `combat_abilities.js`"; the *CoM 1* effect was absent, but
  `heavenlyLight` has been a CoM2/Warlord control and a `c:heavenlyLight`/`c:heavenlyLight:toHit`
  step pair since M11, and neither engine's write lives in `combat_abilities.js`. CoM 1 was
  therefore added by widening the existing control (`subgroup: 'CoM, CoM2 & Warlord'`) and the
  existing step pair to `SCOPE_COM_PLUS` with a CoM 1 branch, as `blazingMarch` and `nodeAura`
  already do, rather than by adding a second control. The chain position is transcribed, not
  deduced: the relocated aura tail returns to `0x905BB`, so the pair sits after `c:soulLinkerAura`
  and before R6.1d resumes at `0x9064B`; `tests/f20-source-order.spec.js` gained the same two
  anchors independently. Two engine facts distinguish the CoM 1 branch from the modern one: its
  attack gates are **live**, not the persistent base attack, and its strength write carries **no
  type test**, so the DOS shared slot takes +1 whatever stands in it — Thrown, Breath and both
  gazes included — while the threshold keeps the narrower Thrown/Missile/Boulder set.
  **Left unmodelled, deliberately:** `com1:0x905E7` forces the weapon-quality byte to Magic Weapons
  for `_UNITS[si].type >= 0x97`, withholding both thresholds from high roster indices. What that
  ceiling selects is [Q18](./BACKLOG.md), open because the index-to-roster-id mapping is unsettled;
  the condition the evidence does determine — no weapon material — is implemented, the ceiling is
  not, and Q18 now records that it decides this block too. **Measurement.** 3,920 `deriveUnitStats`
  inputs over all five versions — the control on and off, crossed with seven ranged-slot shapes,
  four weapon materials, two melee values and seven co-occurring effects — differ in **392** cases,
  **every one `com_6.08` with the control on**. `mom_1.31`, `mom_cp_1.60.00`, `com2_1.05.11` and
  `com2_warlord_1.5.12.7` are identical throughout, as is CoM 1 with the control off. New coverage,
  each browser-confirmed against the number the unfixed code gives: `heavenlyLightMeleeCoM`
  **1.200** (0.600), `heavenlyLightToHitNeedsBareWeaponCoM` **1.600** (1.200, the material
  exclusion), `heavenlyLightMissileCoM` **1.200** (0.600),
  `heavenlyLightBreathStrengthNoToHitCoM` **0.900** (0.600, the strength write with no type test
  beside the threshold that has one), and `heavenlyLightMagicWeaponCoM` **11.000** (2.000, the
  Weapon Immunity bypass). `backlog_checks.js`'s F19 sweep dropped `heavenlyLight` from its CoM 1
  inert list, which the item makes false; the MoM half of that sweep still holds it inert. Nothing
  was folded in. Checks: `node tools/node_unit_checks.js` 14295/14295; `npm run provenance` 267
  formulas, 267 verified, 0 UNVERIFIED.

- **F101 — the Bombs & Grenades grant now lands on the record's Thrown field alone.**
  `SETSTAT(U,SThrown,0,(GETSTAT(U,SThrown,0)+%I(8-(GETSTAT(U,SFigures,1)/2))))`
  (`UnitCalcPre.CAS:1071`) is one write to one field, but `b:bombsGrenades` (`stats_sequence.js`)
  asked only whether the slot stood empty and typeless, so it typed and filled every slot in that
  state. It now asks `isThrownFieldSlot` (`combat_abilities.js`), the same structural question the
  ungated `Dec(U.thrown, …)` writes ask since [F91](#2026-08-20). **Premise held where it counts
  and was falsified in one detail.** Re-measured after today's six changes, the row's headline
  reading stands: a Warlord 1-figure melee-5 unit with Explosive Reform and Blaze of Glory derived
  Thrown **14**, because the grant filled the `SRanged` field the transfer needs standing by and
  `d:blazeOfGlory` then moved that spurious 7 into Thrown. The row's third named victim, the
  Lightning Blade `lightningBreath` seed, **never was one**: the base-phase `lightningBlade:breath`
  step types that field `'lightning'` before region `b` (`CreateUnit.CAS:294-299`), so the old test
  already excluded it. Focus Magic's `ranged` seed did take the grant, but its branch assigns rather than
  adds (`Units.RecalculateUnits.pas:885-891`), so no number moved there — only the modifier trace,
  which no longer shows a `rtbRanged` write the engine does not make. **Measurement.** 235,000
  `deriveUnitStats` inputs over all five versions — 14 seed-carrying and grant-carrying ability
  toggles up to three at a time, crossed with five DOS-shaped slot shapes, five modern channel
  shapes and four figure/melee/Chaos-Channels shapes — differ in **90** cases counting the step
  trace and **45** counting output alone, **every one `com2_warlord_1.5.12.7`**. `mom_1.31`,
  `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` are identical throughout, which is the row's
  declared scope (Bombs & Grenades is Warlord-only). Every moving case is Explosive Reform beside
  Blaze of Glory, and each loses exactly the duplicated grant. New coverage:
  `blazeOfGloryCarriesNoBombsGrenadesGrantWarlord` = **14.000** against the 21.000 the untested
  slot gave, browser-confirmed failing before and passing after against a reverted copy of the
  source. Nothing was folded in. Checks: `node tools/node_unit_checks.js` 14287/14287;
  `npm run provenance` 267 formulas, 267 verified, 0 UNVERIFIED.

- **F100 — Weakness' and Mind Storm's ranged arms now reach a typeless `SRanged`, as their
  ungated `Dec` does.** `Dec(U.ranged, 3)` and `Dec(U.ranged, 5)` sit beside their Thrown siblings
  with no positivity and no type gate (`Units.RecalculateUnits.pas:2273-2295`), so each names a
  field of the record rather than an attack the unit owns. `weaknessBinaryHits` (`stats.js`) asked
  `rangedType !== 'none'` and `slotGateAdmits`'s `rangedOrThrown` arm (`combat_abilities.js`)
  required a live slot; both now ask only which field the slot is — `isRangedFieldSlot ||
  isThrownFieldSlot` and `isModernRangedOrThrownSlot`, whose live-slot conjunct was the whole of
  the difference. **The row's "no number moves today" premise was stale, falsified by
  [F97](#2026-08-21), [F95](#2026-08-21) and [F98](#2026-08-21) earlier the same day**, and this is
  a defect with a fixture, not faithfulness. **Measurement.** 251,940 `deriveUnitStats` inputs over
  all five versions — every ability and enchantment key singly, crossed with five carriers that
  give a typeless `SRanged` an identity or move it, eight modern channel shapes and six DOS-shaped
  slot shapes — move **1,308 cases, every one `com2_warlord_1.5.12.7`**; `mom_1.31`,
  `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` are identical throughout, which is the row's
  declared scope. Every moving case has a Thrown attack beside the typeless Ranged field and
  `d:blazeOfGlory` to carry the penalty into it (`UnitCalc.CAS:1494-1500`); base CoM2 has no Blaze
  of Glory, which is why it cannot reach the difference. Held by
  `blazeOfGloryCarriesWeaknessRangedPenaltyWarlord` (6.000 against 9.000) and
  `blazeOfGloryCarriesMindStormRangedPenaltyWarlord` (8.000 against 13.000), both browser-confirmed
  failing before and passing after against a reverted copy of the two sources. Nothing was folded
  in. Checks: `node tools/node_unit_checks.js` 14287/14287; `npm run provenance` 267 formulas,
  267 verified, 0 UNVERIFIED.

- **F97 — the weapon material's two modern strength gates are the engine's.** `ApplyMagicWeapons`
  writes `Inc(Units[i].ranged, j)`, its display bonus and `hitchanceranged` inside
  `if not Ismagicalranged(Units[i].rangedtype)` with **no** positive-strength gate
  (`Units.RecalculateUnits.pas:648-656`), and writes `hitchancethrown` then `Inc(Units[i].thrown, j)`
  inside `if Units[i].thrown > 0` — the **calculated** Thrown field at that position (`:658-662`),
  which by `c:weapon` has already seen region `b` and `c:focusMagic`. `c:weapon` (`stats.js`,
  `weaponStatSteps`) had it the other way round on both, gating each on `context.calcBaseRtb > 0`,
  the slot's *input* strength. **The row's premise held on the two strength halves and was stale on
  its third claim:** `weaponHitThrown` did carry no strength test, but `weaponHitWrite` applied the
  engine's `U.thrown > 0` one level up, at the To-Hit target, so moving it into the function moves
  no number — the correction is where the test lives, not whether it is made. **Measurement.** A
  22,528-case weapon-material sweep — five versions × four materials × 16 control sets that create,
  move, retype or drain a secondary field × two levels × every DOS shared-slot type at zero and
  positive strength × 22 modern channel shapes — moves **508 cases, 90 `com2_1.05.11` and 418
  `com2_warlord_1.5.12.7`, none in the three DOS versions**; the 15,480-case derivation digest is
  unchanged throughout. Every moving case is a strength field; no To-Hit field moves anywhere, and
  nothing decreases. Two classes: a typeless `SRanged` now takes the material, which
  `d:blazeOfGlory` then moves into Thrown, and a Thrown field Bombs & Grenades created in region `b`
  now takes it too. On `com2_1.05.11` the only reachable class is the DOS-shaped legacy projection
  `result.rtb` at zero input strength, which the modern resolver does not fire, so no CoM2 damage
  number moves. Held by `weaponMaterialRangedHasNoStrengthGateWarlord` (9.000 against 7.000) and
  `weaponMaterialThrownReadsCalculatedFieldWarlord` (44.000 against 36.000), both browser-confirmed
  failing before and passing after. **Nothing was folded in:** the DOS material body has no strength
  test either (`unitcalc.c`, 131:0x8F089), but removing its `calcBaseRtb > 0` moves 164/162/132
  cases in `mom_1.31`/`mom_cp_1.60.00`/`com_6.08` — outside this row's declared scope — so it is
  filed as [F109](#2026-08-21), since landed. Checks: `node tools/node_unit_checks.js` 14287/14287;
  `npm run provenance` 267 formulas, 267 verified, 0 UNVERIFIED; the whole preset suite driven
  through the page's own `applyPreset` in a local browser, 1022 of 1024. **Those two red presets
  were found by this item, not caused by
  it:** `levelRangedGateZeroStrengthCoM2` and `levelRangedGateZeroStrengthWarlord`
  ([F95](#2026-08-21)) both measure 0 against expectations of 3 and 4, identically before and after
  this change — `applyPreset` builds no modern ranged channel from a DOS-shaped `rtb: 0` fixture,
  so the modern resolver has no attack to fire. Filed as [F110](#2026-08-21), since resolved.

- **F98 — Focus Magic now makes the engine's four-way permanent-record branch and its three
  independent strength tests.** `Caster.exe` runs `if U.doomgaze > 0`, `if U.firebreath > 0` and
  `if U.lightningbreath > 0`, each `+3`, and then **exactly one** of four ranged arms, all four
  gated on the permanent record: `(U.thrown > 0) and (B.ranged = 0)`, `B.ranged = 0`,
  `not Ismagicalranged(B.rangedtype)`, and an `else` adding `+3` to `U.ranged`
  (`Units.RecalculateUnits.pas:874-909`). `c:focusMagic` had hoisted that fourth arm out of the
  branch into a pre-loop over every channel gated on the *live* strength and type, and computed the
  conversion arms from `baseRangedPresent` — the raw card input, with a type test the engine's
  strength-only `B.ranged` does not make. The branch now reads `ctx.base`, and the modern and CoM 1
  bodies are separate: CoM 1's block is a three-way branch on the unit *type's* ranged type with a
  minimum of 3 (`unitcalc.c`, com1:0x8F7E6) and keeps `baseRangedPresent`, now its only consumer.
  **The row's premise held on both halves.** The re-measured `doomGaze 0 -> 3` on a CoM2 `magic_c`
  ranged 4 unit was still in the `c:focusMagic` ledger entry, and `e:clamp` still reverted it —
  `focusMagicDoomGazeMod`'s first disjunct is the same predicate the clamp gates on, so the wrong
  write could never reach a total. That half is therefore bound in the ledger rather than in a
  number, by `step_traces.js`. The row's `stats_sequence.js:486-490` pointer had gone stale to
  line 637. **Measurement.** 16,840 `deriveUnitStats` inputs over all five versions, before and
  after: `mom_1.31`, `mom_cp_1.60.00` and `com_6.08` are identical, and the modern diffs are two
  classes. A Warlord unit whose permanently magical ranged attack a region-`b` penalty drove to or
  below zero now takes the fourth arm's `+3` and survives the clamp — held by
  `focusMagicMagicalRangedIgnoresLiveStrengthWarlord` (not yet browser-confirmed) and a
  `deriveUnitStats` check. And the DOS-shaped shared slot, when it carries a Thrown *type* at zero
  strength, now takes the creation arm as the engine does; no preset or roster record reaches it,
  and the modern Ranged channel already held the created attack. Nothing was folded in. Checks:
  `node tools/node_unit_checks.js` 14287/14287; `npm run provenance` 267 formulas, 267 verified,
  0 UNVERIFIED.

- **F95 — the level ladder now makes the engine's four independent secondary writes, each on the
  record its own arm reads.** `ApplyLevelBonus`'s normal arm gates all four on the permanent record
  — `BaseUnits[i].rangedtype > 0` selecting `NormalMagicRanged` or `NormalMissileRanged`,
  `BaseUnits[i].thrown > 0`, and `.firebreath > 0` / `.lightningbreath > 0` sharing `NormalBreath`
  (`Units.RecalculateUnits.pas:548-571`) — while the hero arm keeps the base ranged gate and tests
  the calculated Thrown and both Breaths (`:509-530`). `c:level` had one if/else-if over the live
  record with an extra `calcBaseRtb > 0` on the ranged arm and no positivity test on the other.
  `getLevelBonuses` now carries `missileRanged`, `magicRanged`, `thrown` and `breath` as the four
  arrays `@Init@LoadLevelBonusINI` fills; `ranged`/`thrown` stay for the DOS ladders, which have no
  tables. The split moves no number with the shipped data — both `Levelbonus.INI` files have
  MissileRanged/MagicRanged and Thrown/Breath column-identical — so nothing tests it; the gates do.
  **The row's premise held in both halves.** Warlord Outlander with Explosive Reform, melee 5, one
  figure, no base secondary attack: Thrown 7/8/9 at Recruit/Veteran/Champion before, 7/7/7 after,
  and `UnitCalcPre.CAS:1071` is `SETSTAT(U,SThrown,0,...)`, record selector `0`.
  **The permanent record is now a real read.** Every permanent write is a `base`-phase step, so
  `runStatSteps` maintains the record through that phase and freezes it as `ctx.base` — the
  mechanism `steps.js` already documented and nothing populated. Reading it rather than the raw
  input is what lets Dragon Mound's and Lightning Blade's permanent breath writes meet the gate.
  **Measurement.** 151,200 `deriveUnitStats` inputs across all five versions and 6,588 roster-unit
  derivations, before and after: `mom_1.31`, `mom_cp_1.60.00` and `com_6.08` are byte-identical, and
  the modern diffs are two classes — a record whose ranged *type* names an attack at zero strength
  now takes the ladder, and a Thrown/Breath field created after the permanent record no longer does
  unless the unit is a hero. One shipped roster record is in the first class, Warlord `[362]`
  Wanderer (`RangedType=30`, `Ranged=0`), which also produced [F107](./BACKLOG.md). Held by
  `levelRangedGateZeroStrengthCoM2`, `levelRangedGateZeroStrengthWarlord`,
  `levelThrownGateBaseRecordWarlord` and `levelThrownGateHeroCalculatedWarlord`. Nothing was folded
  in. Checks: `node tools/node_unit_checks.js` 14285/14285; `npm run provenance` 267 formulas, 267
  verified, 0 UNVERIFIED.

- **F104 — the DOS resistance transform makes both +30 writes, and one consumer was spending the
  missing one as damage.** `dosEffectiveResistance:magicImmunity` (131:0x990B6, `SCOPE_DOS`) and
  `dosEffectiveResistance:righteousness` (131:0x990D5, `SCOPE_MOM`) are steps of
  `DOS_RESISTANCE_STEPS`; the duplicate +30s that stood at `fearFailProb`, `deathTouchFailProb`,
  `deathGazeFailProb` and `lifeStealEffective` are gone. **The row's premise was stale in both
  halves.** Neither effect was modelled as a skipped roll: Magic Immunity was a skip at eight
  consumers and a consumer-side +30 at Cause Fear — which is what the engine does, since the two
  gates at 0x99D3F and 0x99F67 jump past the touch/gaze group before any roll — and Righteousness
  was a consumer-side +30 at all four Death-realm consumers and never a skip.
  **Where they disagreed: Life Steal's margin.** `Combat_Resistance_Check` returns `roll −
  resistance`, and Life Steal spends that margin as drain, so a bonus held at the consumer reached
  the pass/fail gate but not the drain. Measured on a MoM unit at Resistance 5 against Life Steal
  −30: 30.500 damage before, 1.500 after, which is the engine's 35 − 30 = 5. Held by
  `righteousnessLifeStealDrain` and `righteousnessLifeStealDrain160`. CoM 1 keeps the address but
  reads Shadow Attack there ([F105](#2026-08-21)), so its list has no Righteousness step;
  `fearMagicImmune` already covers the Magic Immunity write's one visible consumer.
  **Measurement.** 3840 `buildResistanceContext` contexts and 1080 `resolveCombat` results across
  all five versions, before and after: every differing combat row has a Righteousness defender, and
  `com_6.08`, `com2_1.05.11` and `com2_warlord_1.5.12.7` are byte-identical once the Righteousness
  control is restricted to the versions that render it (`subgroup: 'MoM only'`, cleared by
  `applyDisabled`). Only two MoM rows move, both Life Steal. Checks:
  `node tools/node_unit_checks.js` 14285/14285; `npm run provenance` 267 formulas, 267 verified,
  0 UNVERIFIED.
- **F105 — CoM 1 no longer takes the two defence writes its own binary withholds.**
  `Battle_Unit_Defense_Special`'s Righteousness block is an 87-byte NOP field in CoM 1
  (com1:0x9A6DC..0x9A732) where both MoM builds make the write (131:0x9A728, 160:0x9A728), so
  `dosEffectiveDefense:righteousness` is now absent from CoM 1's ordered list rather than gated
  channel by channel — the same shape the elemental block already had. Its scope narrowed to
  `SCOPE_MOM`, which closed the `SCOPE_PROVENANCE_GAPS` entry M10 filed, and the gaze channel's
  now-redundant `!isCoM1` went with it. The spell path is settled with it: CoM 1 gates the Bless
  arm on `ranged_type > 39` (com1:0x9A6D3) and the spell-damage helper passes exactly 39
  (com1:0x871B6, against MoM's 38), so Immolation and Wall of Fire get no CoM 1 Bless bonus.
  `blessImmolationDefMoM`/`blessImmolationDefCoM` hold the pair, and the Bless tooltip stopped
  claiming Immolation for CoM 1.
- **The row's own preset is not writable, and that is the finding.** Righteousness does not exist
  in CoM 1 at all: `UE_RIGHTEOUSNESS` `0x40000000` is Shadow Attack there, both in the
  enchantment-name table (`R6.1a`) and in the item-power helper (`R6.1g`), which is why the block
  was NOPped. The calculator already models that with `subgroup: 'MoM only'`, so the control is
  hidden and cleared under `com_6.08` and no preset can reach the write; the CoM 1 Righteousness
  half is faithfulness, measurable only below the UI. Measured there, `computeDefenseProfile` over
  seven attack types and three defender configurations moves only in `com_6.08` — Righteousness'
  100 disappears from vsRanged, vsThrown and vsImmolation, and Bless' +5 from vsImmolation — with
  all four other versions byte-identical.
- **F103 — the DOS identity conversions now sit where the address map puts them.** The eleven
  ordered conversions ran in the order M7's helper split left behind; `unitcalc.c`'s
  `BU_Apply_Specials` gives every DOS realm write an address, and it runs them the other way round.
  The two MoM chains now carry Undead (131:0x8F3DC), Black Channels' realm write (0x8F4A1),
  demon-skin armor (0x8F6FE), demon wings (0x8F71B) and fire breath (0x8F738) in that order, and
  CoM 1 carries demon wings (com1:0x8F46F), fire breath (0x8F48C), Blood Lust (0x8F49A), Undead
  (0x8F4BC), demon-skin armor (0x8F757) and Mystic Surge (0x8F79E). Consequence: a DOS unit holding
  both a Chaos Channels mutation and a Death conversion finishes fantastic **Chaos**, as the engine
  leaves it, not Death — which moves Land Link, Survival Instinct, the realm gates and every
  realm-keyed aura. The reordered entries left `DEDUCED_POSITIONS`; only CoM 1's Focus Magic and
  Raise Dead stay inherited there, Raise Dead because it is a `combat.c` combat-spell write that
  `BU_Apply_Specials` never makes. The modern chains are untouched:
  `Units.RecalculateUnits.pas` already ordered them, and a probe over both CoM2 builds confirmed no
  number moved.
- **The sub-fork is settled against phase `a`, for both halves of the write.** Chaos Channels fire
  breath is region `a` in `Caster.exe` alone ($00599EE8, ahead of the UnitCalcPre hook at
  $0059A002). The DOS builds make the same effect inside `BU_Apply_Specials`, between the two
  sibling mutation blocks the chains already carried in region `c`, so nothing distinguishes it
  from them and `a:chaosChannels:fireBreath*` is now modern-scoped with `c:` DOS counterparts. Its
  stat half moved with its realm half, because they are one block: the shared-slot **assignment**
  now lands after the level bonus and the enchantment writes ahead of it rather than before them,
  so an elite MoM breather deals 2 and not 2 plus its level bonus. That reproduces a documented
  engine result independently — MoM's constructor runs Chaos Surge before `BU_Apply_Specials` and
  the assignment overwrites its +2, while CoM 1 calls `BU_Apply_Specials` first and keeps it.
- **Folded in:** nothing. Two findings were filed instead. **F106:** MoM 1.31 alone passes the
  mutations byte whole at the recompute's second `BU_Apply_Specials` call (131:0x90A1D), so its
  Chaos Channels blocks run twice; the chain models the constructor position only, which is exact
  for the additive armor bonus and lossy for the breath assignment. **T11:** the `c:chaosSurge`
  carve-out that skipped a MoM fire-breath slot is now inert — the corrected position produces the
  exclusion by itself — but removing it moves no number, so no preset can hold the removal.
- **Premise re-measurement.** Every address the row named was checked against
  `Reference docs/DOS reconstructed/unitcalc.c` and held. The row's headline example held too, and
  turned out to need the phase move it filed as an open question: reordering region `c` alone
  leaves fire breath ahead of Black Channels and the MoM unit still finishing Death.

## 2026-08-20

- **M13 — `chance:` is the To-Hit/To-Block ledger's namespace and nothing else's.** The prefix used
  to mean two things at once: the ledger's projection namespace (`buildChanceProjection` emitted
  `chance:${id}` *unless the id already started with it*) and a qualifier on sixteen real writes.
  That exception was what let a real write and its own projection share one `phase:id` key on all
  sixteen — the key the chains, `STEP_VERSION_SCOPES` and `assertStatStepOrder` all treat as naming
  exactly one step. **Decision: the two id spaces are disjoint.** Every step of the ledger carries
  the prefix — one projection per stat event, plus the three resolution-time writes native to it —
  and no step of a derivation sequence does, so the projected id is now mechanical and the exception
  is gone. `projectionOf` stays the authoritative marker, because an id is presentation and a ledger
  step that projects nothing (`attackSpecific:chance:distancePenalty`) has a scope row of its own.
  Thirteen ids lost the prefix accordingly: the three base seeds, `survivalInstinctToBlock`,
  `outlanderBallisticsTraining`, `energyCannonThreshold`, `trueSight:ranged`, `legacyClamp`,
  `modernClampCommon`, and the `holyWeapon` pair merged by (a). The two that keep a bare sibling
  took the qualifier `SPEC.md` already licenses instead — `c:weapon:toHit` beside `c:weapon`,
  `c:heavenlyLight:toHit` beside `c:heavenlyLight` — because each pair is two separately cited
  engine blocks, not one write split by field, which is what separates them from M11's merges.
  **(a)** `c:chance:holyWeapon:melee` and `c:chance:holyWeapon:rtb` are one step, `c:holyWeapon`,
  built the way M11 built the `heavenlyLight` pair: the union of the two `writes`, the `or` of the
  two gates, both halves in one `apply`. `hitTargetValue` reads only type and strength fields, so
  the melee half cannot change what the secondary half computes. Its merged citation is the `:rtb`
  list, of which the `:melee` list is a subset — the anchor is byte-identical, so no reviewed span
  moved. The ledger's own ids did not move at all: stripping the prefix from a real write makes
  `buildChanceProjection` re-add it, so `modifierTraces` still shows `chance:modernClampCommon`,
  `chance:legacyClamp` and `chance:distancePenalty`, and only `statTrace` ids changed.
  **Premise re-measurement.** Two of the row's three claims held and one did not. The pair is
  chain-adjacent in all five versions (positions 17/18, 27/28, 34/35, 38/39, 93/94), and the prefix
  was on exactly 16 ids, 14 of them without a bare sibling — the row's list of fourteen was exact.
  The row's “6 carry the prefix and 8 do not” was wrong on the second number when it was written,
  not stale: counting effects whose declared `writes` are only To-Hit/To-Block fields gives **11**
  unprefixed, not 8. `b:magitekEngine`, `d:hurricane` and `d:mechanicalExpert` were all present and
  hit-only at `865a648`, and the row's list omits them. The asymmetry the row argued from is
  therefore larger than it claimed, not smaller.
  **New coverage:** two sweep assertions state the namespace rule as an observation — no
  stat-sequence step carries `chance:`, every ledger entry does — plus a registry assertion that no
  derivation scope row does (`tools/unit_checks/version_scope.js`). The two `resolveScope` probes
  that named the pre-M11 `c:chance:vertigo` are re-aimed at the case that still exists, a ledger
  step with no `projectionOf`. **Arithmetic is unchanged in all five versions**, measured as zero
  differing cases and zero field differences across 15,480 derivations
  (`tools/derivation_equivalence.js`, `tools/derivation_equivalence_diff.js`). The seed steps' own
  split and two leftover field qualifiers were left alone and filed as `T10`.
  Checks: `node tools/node_unit_checks.js` 14,255 assertions, none failing; `npm run provenance`
  265 formulas, 265 verified, 0 UNVERIFIED (266 before: the merge retired one); `npm test`
  114 passed.

- **M10 — the DOS attack-specific stage is ordered steps, one list per engine.**
  `Combat_Effective_Resistance` and `Battle_Unit_Defense_Special` are transcribed as
  `DOS_RESISTANCE_STEPS` and `DOS_DEFENSE_STEPS` (`combat_effects.js`), keyed by version and run
  by `dosEffectiveResistance` / `dosEffectiveDefense` over a scratch copy — the same step type,
  runner, authoring syntax, canonical-scope rows and `PROVENANCE` labelling the Caster.exe pair
  already used, so the two stages now differ only in which routine they transcribe. Five
  resistance writes and twelve or thirteen defense writes replace the inline arithmetic in
  `buildResistanceContext` (`combat_phases.js`) and `computeDefenseProfile`, which keep only what
  the engine keeps outside the routines: the per-realm and per-attack classification
  (`dosDefenseForAttack`, the DOS counterpart of `computeCasterDefenseForAttack`) and the City
  Walls addition its caller makes afterwards. `SPEC.md`, *Attack-specific sequences*, *Version
  scope* and *The execution chain* record what moved; the stage is no longer a known limitation.

  **Premise, re-measured.** The named effects held — Charmed +30, Resist Magic +5, Bless +3 (MoM)
  / +5 (CoM 1), the latter two being what `isCoM` selected in a branch Warlord can never enter.
  `PROVENANCE[dosEffectiveDefenseProfile]` did span **seven** `DOS reconstructed/combat.c` ranges,
  and `PROVENANCE[resolutionResistanceContext]` did cover all five versions. Both line references
  had drifted by the earlier uncommitted rounds: `buildResistanceContext` is at
  `combat_phases.js:310` (row: `:313`) and `computeDefenseProfile` at `combat_effects.js:583`
  (row: `:584`).

  **Order, and which positions are provisional.** Every position is transcribed from
  `DOS reconstructed/combat.c`, address by address; none is deduced, so nothing here is marked
  provisional. Resistance runs base, Charmed, elemental, Bless, Resist Magic (131:0x9903C ->
  0x990A6 -> 0x990F5 -> 0x9912A -> 0x99143) — additive throughout, which is why a DOS unit can
  finish above the 100 Caster.exe's assignments cap it at, and why this is a separate
  transcription rather than a variant. Defense runs base, Illusion, Large Shield, the two
  `defense_special` markers, Magic Immunity, Bless, Righteousness, the elemental block, Armor
  Piercing, the Weapon Immunity payout and the blanket replacement. **MoM 1.31 writes the blanket
  marker before the Weapon Immunity one and CP 1.60 and CoM 1 write them the other way round**
  (131:0x9A66E/0x9A68C against 160:0x9A66B/0x9A68C), which is the whole of that build's
  Weapon-Immunity-overwrites-Missile-Immunity bug, now an ordering fact in the list rather than a
  version test in a branch. CoM 1 additionally splits MoM's `else if` elemental pair into two
  independent adds and cashes the Weapon Immunity marker as `+8` where the MoM builds raise to a
  floor of 10, so it has two step ids of its own.

  **Folded in.** The five `*Def` immunity helpers (`weaponImmunityDef`, `missileImmunityDef`,
  `fireImmunityDef`, `righteousnessDef`, `magicImmunityDef`) are deleted: their constants are now
  the ordered steps' own, and keeping them would have left the 50/100 replacement value and the
  Weapon Immunity floor with two homes. `weaponImmunityApplies` survives as the eligibility test
  both engine families call. `buildResistanceContext`'s dead `isCoM` parameter and its three
  unconsumed `bBless`/`aBless`/`blessBonus` return fields go with them, as do the `isCaster` and
  `isWarlord` branches inside `computeDefenseProfile`, which the `com2` early return had made
  unreachable.

  **Filed, not fixed.** Two engine facts the conversion made visible are new backlog rows rather
  than changes, because both would have moved a number in a version M10 scoped `behavior
  unchanged`. **F104:** the DOS resistance routine's `USA_IMMUNITY_MAGIC` and `UE_RIGHTEOUSNESS`
  +30 writes have no step, because the calculator models both as a skipped roll. **F105:** CoM 1
  NOPs the Righteousness defence block out entirely, yet the calculator still admits the write on
  its Chaos magical-ranged, breath and spell-damage channels; that is recorded as an explicit
  `SCOPE_PROVENANCE_GAPS` entry so the checks name it rather than pass over it.

  **Measurement.** A digest over three surfaces, before and after, in all five versions: 2400
  `computeDefenseProfile` profiles, 900 `buildResistanceContext` contexts and 160 full
  `resolveCombat` results per version. Defense and combat outputs are byte-identical; all eight
  resistance values are identical in every case, the only difference being the three dead return
  fields. Checks: `node tools/node_unit_checks.js` 14277/14277; `npm run provenance` 266 formulas,
  266 verified, 0 UNVERIFIED; `npm test` 114 passed.

- **M7 — eleven atomic identity conversions, and `unitType` is only a projection.**
  `determineEffectiveUnitType` is deleted. The single `a:legacyConversions` step it hid behind is
  eleven steps in `applyOrderedIdentityConversions` (`stats_identity.js`), each writing live
  `race`/`fantastic` directly, each with its own position, trace entry, ledger visit, canonical
  scope row and `PROVENANCE` citation. Sanctify loses the compact token's three-branch
  approximation and becomes what `UnitCalcPre.CAS:1246-1252` is: an unconditional Life-realm
  write plus a Fantastic write gated on a non-hero clergy unit — the hero special case existed
  only because a `hero` token has no realm slot. `normalizeCombatUnit` (`combat_phases.js`) no
  longer rewrites `unitType` a second time, and `applyLiveUnitType` — the token round-trip — is
  gone with it. `SPEC.md`, *Identity*, *The step model* and *The execution chain* record the
  three rules that moved.

  **Premise, re-measured.** Both counts held: **eleven** ordered conversions in the helper body,
  and **fifteen** source spans in `PROVENANCE[legacyUnitTypeConversions]` — which was duplicated
  verbatim as `PROVENANCE[legacyConversions]` beside the step. Two of three line references had
  drifted: the step was `stats_identity.js:186-195` (row: `:187-198`) and the helper
  `combat_abilities.js:290-329` (row: `:199-238`, a 91-line drift from the uncommitted M15
  round); `combat_phases.js:195` was exact.

  **Phases and positions.** Region maps first: `CoM2 binary - unit recalculation.md`'s phase
  index puts Chaos Channels Breath's realm write in `a` and CC Flight, CC Armor, Blood Lust,
  Animated, Undead, Mystic Surge and Destiny in `c`; the Warlord script grep puts Fiery Fury
  (`UnitCalcPre.CAS:832`) and Sanctify (`:1246`) in `b`, at those line positions. Nothing needed
  step 4. Scopes come from the same evidence: `SCOPE_ALL` for the three Chaos Channels writes and
  `undead`; `SCOPE_WARLORD` for `fieryFury:race` and `sanctify`; `SCOPE_MODERN` for
  `destiny:race`; `SCOPE_COM_PLUS` for `mysticSurge:race` and `raiseDead`; `SCOPE_MOM` for
  `blackChannels:race`; and a new `SCOPE_COM1_COM2` for `bloodLust`, because Warlord recasts the
  spell as Frenzy and sets `EncBloodLust` only in `UnitCalc.CAS`, after the compiled block that
  would have read it. **Provisional:** the two `b` entries are transcribed at their CAS lines and
  the `a` entry is provisional with its whole region; all eight region-`c` identity entries are
  named in `DEDUCED_POSITIONS` (`stats_manifests.js`) rather than inheriting region `c`'s
  transcribed claim, because they head their region by convention and, in the DOS builds, their
  order among themselves is inherited from the helper rather than from the address map.

  **Six ids carry a `:race` qualifier** — `chaosChannels:fireBreath:race`,
  `chaosChannels:armor:race`, `fieryFury:race`, `destiny:race`, `blackChannels:race`,
  `mysticSurge:race` — because one engine block writes the realm and a stat, and the calculator
  runs identity in a separate pre-pass, so `phase:id` has to separate two positions. This is
  `base:zombies:toBlock`'s exception, not a return of M11's `identity:` prefix.

  **Arithmetic, measured.** Full-digest comparison over **15,480** derivations
  (`tools/derivation_equivalence.js`): **0** differences for deleting the helper and the second
  rewrite. Splitting the merged scope moved **212** cases, every one of them a control the
  calculator's own version gating (`abilityVersionGated`, `ui_abilities.js`) hides in that
  version — Blood Lust and Mystic Surge under the two MoM builds, Black Channels under CoM 1,
  CoM2 and Warlord — which is the inconsistency the merged step hid: the stat halves
  `c:blackChannels` and `c:mysticSurge` already carried those scopes while the realm half ran
  everywhere. Every differing case was checked against the gating table, with **0** unexplained.
  Removing `normalizeCombatUnit`'s rewrite is separately shown inert: over **3,498** reachable
  version × base-identity × up-to-three-control combinations, the derived `unitType` is already a
  fixed point of the deleted helper, with **0** mismatches.

  **The structural regression** (`tools/unit_checks/identity.js`, +465 assertions) is four
  claims: no ordered identity conversion mentions `unitType` at all; every one of them declares
  only `race`/`fantastic`; combat normalization writes no `unitType`; and no step in any
  formula-bearing source declares a `unitType` write. Beside them, the projection is decoded by a
  transcription of the token's grammar — not by re-running the projection — and asserted to agree
  with the live identity across all five versions. Five mutations were run against a scratch copy
  and all five were caught, including "the projection stops tracking the live fields", which the
  decoder catches by name.

  **The audit for remaining merged helpers** found no more of this class. The largest surviving
  merged citations are `level` (13 spans, one `ApplyLevelBonus` block — [F95](./BACKLOG.md)),
  `levelBonusDispatch` (a table dispatch) and `resolutionResistanceContext` /
  `resolutionToBlockContext` (DOS resolution-time arithmetic; the resistance half has since
  become ordered steps under [M10](#2026-08-20)). The two
  remaining ordered compositions outside the phase-tagged records — `deriveUnitStats`'s ability
  grant chain and `normalizeCombatUnit`'s normalization chain — compose ability grants, not stat
  or identity writes, and each member already carries its own citation.

  **Filed, not folded in:** [F103](./BACKLOG.md). The split made the DOS conversion order
  readable, and it is the reverse of the address order — `unitcalc.c` runs Undead and Black
  Channels *before* the Chaos Channels blocks in the MoM builds, and puts CC armor *after*
  Undead in CoM 1, where the calculator has both the other way round. A MoM unit holding Black
  Channels and Chaos Channels Fire Breath finishes fantastic Chaos in the engine and fantastic
  Death here. Correcting it moves numbers in three versions, which is outside a row whose whole
  claim is that arithmetic does not move.

  **Checks:** `node tools/node_unit_checks.js` 14,006/14,006; `npm run provenance` 251 formulas,
  251 verified, 0 UNVERIFIED (239 → 242 → 251 as the merged pair became eleven anchors);
  `npm test` 114 passed.

- **M15 — the engine rules the DOM layer was deciding are cited derivation-layer functions.**
  `mergedAbilityValue` is now `mergeAbilityCalcValue` in `combat_abilities.js`, beside the ability
  accessors it is the write-side counterpart of. The DOS record's shared special-value byte —
  `DOS_SPECIAL_CONSUMERS`, `DOS_GAZE_KEYS`, `dosSpecialIsActive`, `dosSpecialAbilityValues` and
  `dosGazeAbilityValues` — is in `combat_special_attacks.js` beside `gazeRealm`, which already
  read the 103/104/105 contention back out of it. `ui_card.js`'s `dosSpecialValues` and
  `dosReceivedValue` only marshal now: read a control, name a key, pass a value. Three new
  VERIFIED anchors take the audit from 239 formulas to 242 — `abilityCalcKeyMerge` (the DOS
  per-player provider maximum in `combat.c`, `AddtoAuraTable`'s higher-value merge in
  `Units.RecalculateUnits.pas`, and a second grant of a record flag in `unitcalc.c`),
  `dosSharedSpecialByte` (the touch riders' `-abs(Spec_Att_Attrib)` reads plus those maxima) and
  `dosGazeTypeContention` (both kill loops). `tools/unit_checks/ability_inputs.js` adds 71
  assertions to `node tools/node_unit_checks.js`; each was confirmed to fail against a mutated
  rule before being kept. `SPEC.md`, *Stat derivation contract* now states the boundary.

  **Premise, re-measured.** The counts were exact — 0 `PROVENANCE` anchors in `ui_*.js` against
  66 / 30 / 11 / 4 — and `mergedAbilityValue` was exactly `ui_abilities.js:42-51`. Two spans had
  drifted: `dosReceivedValue` was `ui_card.js:254-261` and `dosSpecialValues` `:270-305`, against
  the row's `:254-260` and `:270-300`. Neither changes what the row claimed.

  **Arithmetic unchanged, measured rather than assumed.** `mergeAbilityCalcValue`'s body is the
  old one verbatim; the restructured `dosSpecialValues` was diffed against a transcription of the
  pre-move body over **62,720** marshalled states — five versions × seven byte spellings
  (including empty and non-numeric) × seven ranged types × four received-value sets × all 64 flag
  combinations — with **0** differences.

  **Not asserted, deliberately.** That two grants of one *boolean* do not stack has no observable
  consequence: every consumer of a boolean is a flag test, so any truthy merge behaves alike.
  That half of the rule stays a citation; what the checks assert is that either control alone
  reaches the effect, which is what separates OR from AND.

  **One membership left uncited.** Poison Touch's repeat count is modelled as a seventh consumer
  of the shared byte, but the reconstruction names its loop bound separately (`Poison_Strength`)
  and no evidence document gives that field's offset — only the roster's single `Gaze/Poison`
  column ties them. The gap is stated beside the consumer list rather than folded into the
  citation, which is [T8](./BACKLOG.md)'s class of work.

- **F90 + M14 — the field moves are real and the precomputed pass is gone.** Run as one package,
  which is how the sequencing conflict both rows recorded was settled: M14's position-aware gates
  are what F90 was blocked on, and F90's field moves are what let M14 reduce the pass to identity.
  M14 first, then F90, in one change.

  **M14.** `buildSlotContext` computed every type-dependent modifier and gate once, before the walk,
  from a `rangedType`/`thrownType` pair it advanced by hand through the chain's type writes. That
  pair is gone. Every modifier is now written in the step that consumes it and reads
  `u[c.rangedTypeField]` / `u[c.thrownTypeField]` at that step's own position; the slot gates
  `rtb`, `ranged` and `rangedOrThrown` moved out of the per-slot `slots` object into
  `slotGateAdmits` (`combat_abilities.js`), which resolves them against the record `addToSlot` is
  writing to. The type-list tests the engines make are named once beside it —
  `slotHasPhysicalRanged`, `slotHasMagicalRanged`, `slotHasThrown`, `slotHasBreath`,
  `isNonMagicalRangedFieldSlot`, `isConventionalRangedSlot`, `isModernSecondarySlot`,
  `isThrownFieldSlot`, `isLiveSlot` — so a step states the engine's condition rather than
  re-deriving a type list. `buildSlotContext` went from **457 lines, 111 bindings and 22 `*Mod`
  values to 159 lines, 44 bindings and none**, and returns slot identity plus the permanent-record
  facts the engine's own gates read from `B`. The row's premise held on re-measurement: it said
  461 lines, 112 bindings and 23 `*Mod` values, drift of four, one and one.

  **F90.** `U.ranged := U.thrown; U.thrown := 0` (`Units.RecalculateUnits.pas:885-891`) and
  `SETSTAT(U,SLightningBreath,1,GetStat(U,SThrown,1)+1)` / `SETSTAT(U,SThrown,1,0)`
  (`CreateUnit.CAS:294-299`) are now moves between two fields of the modern record, not retypes in
  place. Both free the Thrown field, so the `shadowThrown` accumulator is gone from
  `STAT_DERIVATION_SLOTS`, and with it `focusOwner`, `skipFocusBranch`, `deferShadowStrike`,
  `blazeOfGloryFillsSlot`, `blazeTransferRetypesSourceSlot` and the precomputed `secondaryHitKind`:
  a modern channel's To Hit modifier is now fixed by which record field it is, because no slot
  changes identity part-way through the walk. `d:shadowStrike:thrown` targets `isThrownFieldSlot`,
  which is that same structural question read at `UnitCalc.CAS:1262`. Acceptance holds:
  `focusMagic`+`shadowStrike` on Warlord melee 9 with `thrown 4` is `ranged 4 magic_s` +
  `thrown 4`.

  **Measured, per version.** The 15,480-case digest moves **12 cases**, in two classes and nothing
  else. Eleven are `modernAttacks.<channel>.baseStrength: 4 -> 0` on the channel that now
  *receives* a move (`com2_1.05.11` and `com2_warlord_1.5.12.7`), which is the move showing up as a
  trace entry from editable zero instead of a type-only change on a slot that already held the
  strength — what `SPEC.md`, *Traces* already requires of a channel-creating write. The twelfth is
  a correction: **CoM 1, missile ranged with Lionheart and Focus Magic, `rtb` 7 → 10.** Lionheart
  is com1:0x8F660 and Focus Magic com1:0x8F7E6 (`DOS reconstructed/unitcalc.c`), so the `+3` reads
  a type that is still Missile; the precomputed pass showed it the converted type and suppressed
  it. `mom_1.31` and `mom_cp_1.60.00` move nothing at all.

  **Folded in, because the live read exposed it:** CoM 1's material block gates its *whole*
  secondary half — strength, display bonus and threshold together — on
  `if (!(ench_lo & UE_FOCUS_MAGIC))` at com1:0x8F095, a test of the enchantment flag rather than of
  a type. The precomputed pass reproduced that by accident, reading the post-conversion type at a
  block the chain places before the conversion; with the read live the gate has to be stated where
  the engine makes it, and `R9-G1e CoM 1 Focus Magic suppresses the material shared-slot To-Hit
  write` is what caught its absence.

  **One thing the shared slot cannot read from the record.** The DOS-shaped `legacy` projection
  keeps one secondary threshold where the modern record keeps three, so it has to know which attack
  it will be carrying: Shadow Strike's grant creates a Thrown attack in region `d` while the ungated
  Thrown thresholds are written back in `c`. That is an input fact, not a prediction of any step's
  arithmetic, and it is the one place `secondaryHitTargets` consults `shadowStrikeActive`.

  **Closed in passing:** [F100](#2026-08-21)(a). Its fixture — Warlord melee 1, `thrown 4`,
  `lightningBlade`+`blazeOfGlory`+`lionheart` — now derives Lightning Breath 5 **and Thrown 3**,
  the number the row said the engine gives, because Lightning Blade's move leaves `SThrown` free
  for the transfer and the region-`e` clamp's slot test is a live read rather than
  `channelKey === 'thrown'`. The row's other half — the ungated ranged arms of Weakness and Mind
  Storm — is untouched and stays. [F101](#2026-08-21)'s premise was re-measured and still held at
  Thrown **14**.

  New coverage: `focusMagicFollowsLionheartCoM` = **5.000** (missile 2 + Lionheart 3, retyped to
  `magic_s` and so unstopped by Missile Immunity; reading the converted type at Lionheart's
  position leaves the branch minimum 3, and without Focus Magic the missile is stopped for 0) and
  `shadowStrikeFillsThrownFocusMagicVacatedWarlord` = **13.000** (melee 9 plus the grant's own
  thrown 4, against 17.000 where the grant lands on an unvacated 4 and 9.000 with no grant).
  `node tools/node_unit_checks.js` 13303/13303, `npm run provenance` 239/239 verified, `npm test`
  114/114 including all 987 preset expectations, and `node tools/preset_vacuity_sweep.js` reports
  neither new preset.

- **F99 — the distance penalty reads the finished ranged type.** `distancePenaltyFor`
  (`stats.js:1801-1808`) decided both whether a ranged distance penalty applies and which curve to
  use from `context.rangedType`, the value the precomputed pass leaves after `c:focusMagic`. It
  feeds a resolution-time projection, so it now reads `statUnit[context.rangedTypeField]`. The one
  write that separates the two is Warlord's `d:blazeOfGlory`: `SThrown := SThrown + SRanged`
  followed by `SRanged := SRanged - SRanged` (`UnitCalc.CAS:1494-1500`) empties the Ranged field,
  and the calculator's stand-in for the `SETSTAT(U,SAmmo,0,0)` beside it (`:1502`) clears the type,
  so the surviving attack is Thrown and has no range to be charged for. This is a projectile-*type*
  read, not the field-identity question `isRangedFieldSlot` answers — missile and boulder select
  different curves, and a typeless Ranged field carries no projectile — so it does not go through
  that helper.

  **The measurement the row asked for, first.** The legacy-slot `toHitRtb` projection did carry the
  penalty into a resolved number, not just a display: a Warlord unit with melee 1 and missile 6 at
  range 6, Blaze of Glory active, derived `toHitRtb` 0.84 with `rtbDistPenalty` −16 while its
  finished types were `ranged none` / `thrown thrown`, and the Thrown phase reads that same
  `toHitRtb` (`combat_phases.js`, `aToHitRtbVert`), giving 6.040 damage where 7.000 is correct. The
  row's two claims both hold as written, with only line numbers stale.

  **Measured, per version.** The 15,480-case digest moves **0 cases in all five versions** — it
  sets `rangedCheck`/`rangedDist` only through its `walls-ranged` environment at distance 3, below
  CoM2's threshold of 4, and never beside Blaze of Glory. A supplementary 33,800-case sweep crossed
  13 attack shapes (the four modern channels singly and together, and each conventional type on the
  DOS-shaped slot) with 26 late-type-write combinations, hero and non-hero, `rangedCheck` off and on
  at nine distances, over all five versions, recording the finished types, `toHitRtb`, the penalty,
  each channel's To Hit and both resolved damage means. **504 cases move, all
  `com2_warlord_1.5.12.7`; `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` are
  unchanged.** Every one is Blaze of Glory on a non-hero missile or boulder attack at distance ≥ 4,
  and every one is a penalty that stops being charged. `blaze+focusMagic` and `blaze+energyCannon`
  move nothing, which is the type read doing its work: those retype the attack to `magic_s` and
  `beam` before Blaze, and neither takes a distance penalty either way.

  192 of the 504 move a resolved damage mean and the other 312 move only the record-level
  `toHitRtb`/`rtbDistPenalty` pair, which for a unit with modern channels is the card's displayed
  To Hit line. Of the 192, 168 are the DOS-shaped shared slot, which no CoM2/Warlord browser input
  produces — every modern unit gets attack channels from `modernCardAttacks` (`ui_units.js`), and
  presets translate their `rtb` pair into one. The 24 a user can reach are the modern-channel case
  where the transfer has nowhere to move to: Lightning Blade has already spent the Thrown field
  (`CreateUnit.CAS:294-299`), so Blaze retypes the Ranged slot in place and that slot's own
  projection was charging a missile penalty to a Thrown attack. Where the Thrown field is free the
  move is real, the emptied Ranged channel disappears from the output, and the surviving channel
  never had a ranged type to be penalised for.

  New coverage: `blazeOfGloryThrownTakesNoDistancePenaltyWarlord` = **8.000** — melee 1, the
  transferred Thrown 6 and Lightning Blade's granted Lightning Breath 1, all at 30+70 = 100% —
  against the **7.040** the pre-sequence type gives by charging the Thrown attack CoM2's
  −10−3×(6−4) = −16%. Without Blaze the same unit's attack is still a missile, fires at range 6 and
  does take the −16% → 5.040. Nothing was folded in. E71's other half is left alone deliberately:
  the output contract's `rangedGetsWpn` is still the pre-sequence const where `thrownGetsWpn` is
  recomputed from `finalThrownType`, but `GetsWpn` occurs on 10 lines of `stats.js` and nowhere else
  in the repository, so neither field is read and no reading of them is observable. Settling that
  pair belongs to [M14](#2026-08-20), which removes the pass they escape from.

- **F96 — the region-`e` aura ranged gates are the strength tests the engine makes, on the record
  it reads.** Five aura-pass writes gate a ranged bonus and only one tests a type: Holy Bonus
  `if B.ranged > 0` (`Units.RecalculateUnits.pas:2535`), Guiding Beacon `if U.ranged > 0` (`:2543`),
  Misfortune `if B.ranged > 0` (`:2599`), Supreme Light `if U.ranged > 0` (`:2632`), and Leadership,
  which pairs `not Ismagicalranged(U.rangedtype)` with `U.ranged > 0` (`:2583`). `U` is `Units[i]`
  and `B` is `BaseUnits[i]` (`:806`). The item's premise holds block for block; its four line
  numbers were each one to four lines off the gate they named and are corrected here and in the
  [predicate inventory](../Reference%20docs/Attack-type%20predicate%20inventory.md).

  `addToSlot`'s `persistentRanged` arm is now `B.ranged > 0` — which record field the slot is, plus
  that field's permanent strength, with no type test on a modern channel — and carries Holy Bonus
  as well as Misfortune. A new `rangedField` arm answers which slot is `U.ranged` **at the writing
  step's own position**, through `isRangedFieldSlot` (`combat_abilities.js`), and carries Guiding
  Beacon, Leadership's strength half and `e:supremeLight`'s `+2`; the six-name `supremeLightRtbMod`
  is deleted. `hasPermanentRangedStat` keeps its own job, the `CreateUnit.CAS` city gates, which do
  read a permanent ranged type. The Blaze of Glory transfer's own "which slot is `SRanged`" test is
  the same helper now, so that rule has one home.

  **Measured.** The 15,480-case digest moves 2 cases, one `com2_1.05.11` and one
  `com2_warlord_1.5.12.7`, both Focus Magic + Holy Bonus at ranged 6 → 3; `mom_1.31`,
  `mom_cp_1.60.00` and `com_6.08` are unchanged. Its combination pass does not pair an aura with a
  late type write, so a supplementary 70,890-case sweep crossed the five gates — singly and all
  together — with 47 type- and strength-writing controls plus 153 pairs of the 18 that can reach a
  ranged field, over 17 attack shapes and all five versions: **640 cases move, 233 `com2_1.05.11`
  and 407 `com2_warlord_1.5.12.7`, none in the three DOS versions.** Every one is a bonus that
  stops being made; no number rises. Misfortune and Leadership alone move nothing, so their
  corrections are faithfulness only.

  Three shapes account for all of it. Holy Bonus no longer reaches a Ranged attack created or
  converted after the permanent record, where `B.ranged = 0`. Supreme Light no longer adds `+2` to
  a Ranged field standing at zero. And neither Guiding Beacon nor Supreme Light reaches the Ranged
  field `d:blazeOfGlory` has emptied — the position half, invisible to a predicate computed before
  region `d`. Holy Bonus does now write that emptied field, as the engine does, and the ranged-type
  clear standing in for `SETSTAT(U,SAmmo,0,0)` retires the result, so no output moves (`SPEC.md`,
  *Deliberate deviations*, which now names it).

  New coverage: `holyBonusSkipsFocusCreatedRangedCoM2` = 1.000 against the 5.000 the slot's type
  test gave, `supremeLightSkipsZeroedRangedCoM2` = 0 against 2.000,
  `guidingBeaconSkipsBlazedRangedWarlord` = 3.000 against 6.000, and
  `supremeLightSkipsBlazedRangedWarlord` = 3.000 against 5.000. One existing node check moved with
  the engine reading rather than against it: `derivation_stages.js` asserted that a Focus-Magic-
  created Ranged channel takes Holy Bonus while refusing Misfortune, to show two gates isolated —
  both read `B.ranged`, so what separates them is Guiding Beacon's calculated `U.ranged`, and the
  created channel is now 5 with neither permanent-record aura in its trace. Nothing was folded in.
  E40's own `Ismagicalranged(U.rangedtype)` eligibility read stays stale deliberately: making it
  live would feed the calculator's Blaze ranged-type stand-in into a gate the engine resolves from
  a record it never clears, which is [M14](#2026-08-20)'s to settle.

- **F102 — the equivalence digest was blind to every enchantment.** `deriveUnitStats` reads
  abilities and enchantments from one `input.abilities` map, because `abilityUiDefs()`
  (`ui_abilities.js`) merges `ABILITY_DEFS` and `ENCHANTMENT_DEFS` into it by `calcKey` — but
  `tools/derivation_equivalence.js` wrote ability specs to `over.abilities` and enchantment specs
  to `over[spec.key]` at the top level of the input, where nothing reads them. Measured: **0 of
  8,370** solo enchantment cases moved a number before the fix, **8,112** after. None of the
  genuinely top-level inputs are in either defs list, so nothing was relying on the old routing;
  the `ENVS` list already covers `trueLight`, `darkness`, `warpReality`, `nodeAura`, `cityWalls`
  and the rest. Both lists now go through one `setControl`, keyed by `calcKey` — which differs
  from the control's own key on eight enchantments (`natureLink` → `landLinking`, `apotheosis`
  → `destiny`, `liability` → `mislead`, `guardianWind` and `hillfort` → `missileImmunity`,
  `disciplineWarlord` → `discipline`, `chaosEmbrace` → `blazingEyes`, `planewalking` →
  `teleporting`) — and a case setting an Outlander reform now sets `outlanderWizard` with it,
  since `applyOutlanderReformGrants` (`stats_identity.js:540-547`) strips all fifteen without it.
  No stored digest survives the change, which is the point of the item. Re-verified with the
  corrected harness across the whole of [M12](#2026-08-20) and [F94](#2026-08-20): **15,480 cases,
  0 differing, all five versions**, against the tree as it stood before both landed. The digest's
  combination pass still does not reach F94's `explosive` + `fieryFury` pair, which is covered by
  `bombsGrenadesAfterFieryFuryWarlord` instead.

- **F94 — the pre-sequence type flips run in chain order, and the base seed is the permanent
  record.** `buildSlotContext` advances one `rangedType`/`thrownType` pair through five writes of
  its own, and advanced it in the order they happened to be authored — Military Workshop, Bombs &
  Grenades, Lightning Blade, Chaos Channels, Energy Cannon — where the Warlord chain orders their
  steps `base:militaryWorkshop`, `base:lightningBlade:breath`, `base:energyCannon`,
  `a:chaosChannels:fireBreath`, `b:bombsGrenades` (`stats_manifests.js`). The pair now advances in
  that order, with each position's predicates evaluated between the flips rather than after all of
  them.

  **The number this moves is Fiery Fury's.** `UnitCalcPre.CAS:832-846` runs before the Bombs &
  Grenades block at `:1066-1080` in the same file, and `b:fieryFury` precedes `b:bombsGrenades` in
  the chain, so Fiery Fury cannot see the Thrown field that block creates — but `ffRtbMod` read the
  pair after the grant and added its `+2` to it. Over a 54,900-case pairwise sweep of 60
  attack- and type-relevant controls across all five versions and six attack shapes, exactly three
  cases move, all `com2_warlord_1.5.12.7` and all Explosive Reform + Fiery Fury: Thrown 9 → 7 at
  one figure and 8 → 6 at four. `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` and `com2_1.05.11` are
  unchanged, as is the 15,480-case `tools/derivation_equivalence.js` digest.

  **`base:stat:base` no longer carries a later step's write.** It is the chain's first entry, yet
  it seeded the type fields from a pair that had already taken both the `base:militaryWorkshop`
  boulder upgrade and the region-`b` Bombs & Grenades grant. Each is now made by its own step —
  `base:militaryWorkshop` declares `rangedTypeFields` and writes `'boulder'`, `b:bombsGrenades`
  declares `thrownTypeFields` and writes `'thrown'` — and the modern Thrown channel that grant
  creates is seeded `type: 'none'` like the Shadow Strike and Blaze of Glory fields beside it,
  because `SETSTAT(U,SThrown,0,…)` (`UnitCalcPre.CAS:1071`) names the calculated record. That is
  what F95 needs: `BaseUnits.thrown` now reads zero where `ApplyLevelBonus` reads it.

  The Chaos Channels / Energy Cannon transposition the item flagged moves no number and cannot:
  `ccFireBreathActive`'s modern arm asks `rangedType === 'none'` while Energy Cannon requires a
  permanent conventional ranged attack, so the pair is never `'none'` where the order could be
  observed — and on the modern record the two write different channel slots. It is corrected
  anyway, because the order is what the invariant claims. The dead `rangedType`/`thrownType`
  locals in `deriveUnitStats` are gone.

  New coverage: `bombsGrenadesAfterFieryFuryWarlord` = 40.000 against the 48.000 the previous
  order gave. **Nothing was folded in; two adjacent defects the measurement exposed were filed
  instead.** F101 — the grant has no slot test, so it lands on every channel field standing empty
  at `b:bombsGrenades`, and Explosive Reform + Blaze of Glory derives Thrown 14 where the engine
  gives 7. F102 — `tools/derivation_equivalence.js` writes enchantment controls to the top level of
  the input where `deriveUnitStats` reads them from `input.abilities`, so ~164 of the 170
  `ENCHANTMENT_DEFS` entries are inert in it and its run reported 0 differences over this change.

- **M12 — an `applied` ledger entry now means a block the engine entered.** A step whose
  enchantment was absent still ran, because its modifier had been precomputed to zero, so it had
  no `when` and the ledger recorded a visit to a branch the engine never took. Thirty-one steps
  now state the condition the engine tests and write the engine's constant: the thirteen
  `CreateUnit.CAS` building and Natural Selection writes, the ten `UnitCalcPre.CAS` curses and
  boosts, Endurance, Discipline, Orihalcon, Chaos Surge, Flame Blade's ranged half, region-`d`
  Weakness, and the weapon-material block — the last on the engines' own outer gate, `if EncMagic
  or EncMithril or EncAdamant` (`Units.RecalculateUnits.pas:603-605`) and `if (quality > 0)` over
  `mutations & 0x03` in all three DOS builds (`unitcalc.c`, `BU_Construct`). On a unit with
  nothing selected the ledger falls from 35 `applied` to 4 under Warlord, 10 to 4 in CoM2, 9 to 4
  in CoM 1 and 7 to 4 in both MoM builds. **The four that remain are correct and stay ungated:**
  the base seed, the level ladder — `ApplyLevelBonus` has no outer gate and always writes defense,
  resistance, HP, To-Hit and To-Defend (`Units.RecalculateUnits.pas:500-585`) — and the two
  terminal clamps. Gods Play Dices keeps a magnitude test because the script's four separate
  `EncDICE` flags (`UnitCalcPre.CAS:1699-1714`) are what the calculator's one signed control
  stands for, and zero is none of them set.

  **The `delta` dialect is retired.** Its 39 emit sites through `abilityStatStep` are ordinary
  `statStep` records with explicit `writes` and `apply` bodies, matching the rest of the sequence.
  Its five channel names were never five fields — `ranged`, `rangedOrThrown` and `nonGazeRtb` all
  wrote the same strength field and differed only in which `ctx.slots` gate they read. The one
  real content, the slot rule, is single-homed as `addToSlot(u, ctx, slot, value, whereStrength)`
  (`combat_abilities.js`), which `mislead` and `leadershipAura` now call as well. The `delta`-shape
  assertions in `tools/unit_checks/derivation_stages.js` are gone. Mutation probes settled which of
  their claims had behavioural cover, correcting the row's own list: the `nonGazeRtb` claims for
  `animated` and `blackPrayer` and both halves of the `positiveRanged` claim for CoM2 `tactician`
  are already covered by numeric consequences in `tools/unit_checks/derive_unit_stats.js`
  (`tacticianReadsLiveRanged` for the live-strength half); the one claim with no cover was CoM 1's
  Holy Bonus reaching Thrown through the shared `.ranged` slot, which is now the preset
  `holyBonusReachesThrownCoM1` 5.000, the mirror of `holyBonusSkipsThrownCoM2`.

  **The collapsed display/effective split is retired.** `chanceFields` is one field per quantity.
  The `display*` twins existed because Vertigo once wrote only the displayed halves while
  `resolveCombat` applied the effective ones itself; that stopped being true when Vertigo's To-Hit
  and To-Block writes moved onto the ordered record, and the split has stated nothing since. The
  surviving real instance of the distinction is `displayDef`, where `resolveCombat` still applies
  the Vertigo Defense die penalty itself. `deriveUnitStats` no longer returns
  `displayToHitMelee`/`displayToHitRtb`/`displayToBlock`; the one outside reference,
  in `tools/unit_checks/step_traces.js`, reads `toBlock`.

  Arithmetic is unchanged in all five versions: 15,480 derivations identical once the three
  removed twins are excluded, plus 600 targeted weapon/armor/attack-type/level cases covering
  `magic` weapons and `orihalcon` armor, which the digest's case list does not reach. The
  scope-key scraper (`tools/unit_checks/version_scope.js`) and the provenance auditor
  (`tools/provenance_audit.js`) key on `abilityStep(` where they keyed on `emit(`.

- **F91 — an ungated write to `SThrown` is a field write, not a type predicate.** `Dec(U.thrown, 3)`,
  `Dec(U.thrown, 5)` (`Units.RecalculateUnits.pas:2273-2295`) and `Inc(U.hitchancethrown, 10)`
  (`:1803-1809`) carry no positivity and no type gate, so what decides them is which record field
  the slot is. `modernThrownField` states that — the `thrown` channel slot, unless an earlier write
  has spent it on `SLightningBreath` or `SRanged` — and replaces the `thrownType === 'thrown' ||
  shadowStrikeFillsSlot` disjuncts F82 left at Weakness, Mind Storm and Holy Weapon's Thrown
  To Hit. Holy Weapon's now matches `heavenlyLightThrownToHit`'s shape exactly: no gate at all,
  because `secondaryHitKind` is what routes a slot to its threshold. The DOS-shaped `legacy` slot
  keeps the type test, which is what routes its shared value's two halves. **(b), settled with (a):**
  where the transfer finds no free Thrown field — Lightning Blade having spent it — `d:blazeOfGlory`
  retypes the source slot in place, and that slot now reads `toHitThrown` too, since the surviving
  attack is `SThrown` whichever slot holds it. Four things move, all
  `com2_warlord_1.5.12.7`: the Blaze-filled Thrown field takes Holy Weapon's +10 (missile 7 under
  Blaze, 30% → 40%); Weakness's and Mind Storm's penalties land on that field as well as on the one
  transferred into it (missile 7 + Weakness → thrown 1, was 4; + Mind Storm → no attack, was 2);
  neither reaches a Lightning Blade breath any more, which the engine leaves untouched (thrown 4 +
  Lightning Blade + Mind Storm → breath 5, was gone); and a transfer that stays in the Ranged slot
  reads the Thrown threshold rather than the Ranged one (magic ranged 6 + thrown 4 + Lightning Blade
  + Blaze + True Sight + Holy Weapon → 40%, was 35%). Measured as 1,495 differing cases out of
  69,540 derivations, every one of them Warlord and every one under Blaze of Glory or Lightning
  Blade; `com2_1.05.11`, `mom_1.31`, `mom_cp_1.60.00` and `com_6.08` are unchanged, measured rather
  than assumed. New cover:
  `blazeOfGloryCarriesWeaknessThrownPenaltyWarlord` 3.000, `blazeOfGloryThrownReadsHolyWeaponToHitWarlord`
  4.800, and six assertions in `tools/unit_checks/warlord_abilities.js`. The measurement also found
  two things left for [F100](#2026-08-21): the region-`e` clamp drops an attack the transfer
  retypes in place when the source slot has no permanent strength, and the ranged siblings
  `Dec(U.ranged, 3)`/`Dec(U.ranged, 5)` are still type-gated.

- **F89 — a ranged-less unit passes the engine's non-magical-ranged gate, and the gates now say
  so.** `Ismagicalranged(rt)` is `False` for `rt < 1` (`Units.RecalculateUnits.pas:2968-2975`), so
  every `not Ismagicalranged(U.rangedtype)` gate also admits a unit whose ranged type is zero:
  `SRanged` is a record field, not an attack the unit has to own. The measurement settled whether
  that matters. It does — `UnitCalc.CAS:1494-1500` reads `GetStat(U,SRanged,0)` with no type or
  strength gate and moves the whole field into `SThrown`, so a Warlord unit with **no ranged
  attack** and Lionheart gains a Thrown 3 attack it did not have: melee 1+3 plus thrown 3 measures
  **7.000** against 4.000 without Blaze of Glory and 1.000 without Lionheart
  (`blazeOfGloryCarriesRangedlessLionheartWarlord`). The six sites the
  [predicate inventory](../Reference%20docs/Attack-type%20predicate%20inventory.md) lists (I3, I5,
  I6, I7, I9, I11) now read `!isMagicalRangedType` on the modern record's `ranged` channel, while
  the DOS-shaped shared slot keeps Missile/Boulder — there `'none'` means the one value is
  carrying a Thrown, Breath or gaze attack instead. Two companion writes were needed for the
  widened gates to have anywhere to land: the `ranged` channel is seeded under Blaze of Glory, as
  the Thrown field already was, and `d:blazeOfGlory` identifies `SRanged` by which record field
  the slot is rather than by its current type. Measured across 19,140 derivations, exactly six
  cases move, all `com2_warlord_1.5.12.7`, all under Blaze of Glory; `com2_1.05.11` has no
  region-`d` reader of `SRanged` and the three DOS versions are untouched. Two gates are widened
  but still inert: Holy Weapon's and Heavenly Light's ranged To-Hit tails land on a field the
  transfer empties, and Discipline is hidden in Warlord by `exceptVersions`. The weapon material's
  ranged *strength* is still held off the typeless field by `rtbWpn`'s `calcBaseRtb > 0` gate,
  which is F97's.

- **F84 — every attack-type predicate read twice.** The audit swept all 96 `rangedType`/
  `thrownType` lines of `stats.js` and all 45 of `stats_sequence.js` — 141 lines, 73 predicate
  entries and 12 sequence rows — and recorded, beside each, the engine position it models and
  whether its breadth matches the gate at that position. The readings, including the map of all
  13 `Ismagicalranged` call sites to their calculator counterparts that F89 consumed, are in
  [`Attack-type predicate inventory.md`](../Reference%20docs/Attack-type%20predicate%20inventory.md).
  **Audit only: nothing was fixed.** The structural finding is that `buildSlotContext` computes
  every type-dependent modifier once from a pair that advances through five of its own writes in
  an order the execution chain does not have, and then stops at `c:focusMagic` — so the three
  later type writes (`d:rust`, `d:shadowStrike:thrown`, `d:blazeOfGlory`) are invisible to every
  precomputed predicate, which is the whole of region `e`. The Weakness case the item named as its
  starting point is already closed by F81/F83; six further right-number/wrong-branch cases replace
  it, one of them measured — Focus Magic writes `doomGaze 0 -> 3` on a magical-ranged unit that has
  no Doom Gaze, and only `e:clamp` hides it. One finding is number-changing and was measured too:
  a Warlord Explosive-Reform unit with no base secondary attack derives Thrown 8 at Veteran and 9
  at Champion where the engine's `BaseUnits.thrown` gate leaves it at 7. Six new items were filed — F94 the flip order and the base seed, F95 the level ladder's four
  base-record gates and three tables, F96 the region-`e` aura gates, F97 the weapon-material
  strength gates, F98 Focus Magic's four-way branch and its Doom Gaze test, F99 the distance
  penalty's stale type — and three additional narrow-gate call sites (Discipline, Lionheart,
  Leadership) were added to F89's scope. F91, F92 and F93 were confirmed in place and
  cross-referenced to the entries that carry their evidence.

- **The CoM2 To-Hit presentation reorder is gone.** The chance projection moved the
  weapon-material contribution ahead of Lucky in CoM2 and Warlord tooltips to preserve the order
  the projection had before F20 corrected the execution sequence. Lucky precedes weapon material in
  all five chains, so the reorder made two identical orderings display differently and left the
  tooltip asserting a sequence the model contradicts. Removed, along with the check that had pinned
  it — whose message claimed the order was "this engine sequence", making it an assertion bound to
  the implementation rather than a source, which [CLAUDE.md](./CLAUDE.md), *What an assertion has to
  be bound to*, exists to forbid. It now asserts the chains' own order. No arithmetic moves; all
  five versions present `lucky` then `weapon`. The related collapsed display/effective field split
  it exposed was folded into M12, above.

- **M11 — one step id per enchantment.** A step id is now the effect a player selects, carrying no
  qualifier the `phase:id` key, the scope table or the step's own `writes` already states.
  Eleven adjacent same-phase groups merged into one step each — `lionheart`, `giantStrength`,
  `landLinking`, `blazingMarch`, `reinforceMagic`, `weakness`, `focusMagic`, `blazeOfGlory`, and
  the `chance:` pairs `weapon`, `heavenlyLight` and `clamp`; `flameBlade`'s c-pair is deferred to
  F92, which merges it once it has settled whether the Warlord half belongs in region `b`, so the
  pair is not merged and then split again. `tactician` lost its version-chosen second id and is one
  `SCOPE_COM_PLUS` step whose CoM 1 and modern chains place it differently, which retired the last
  entry in the version-scope checks' PROVENANCE exemption list: every scope id now carries its own
  citation. Ten `:coM1` / `:aura` / `:warlordStack` suffixes and the `identity:` prefix on all
  eleven identity steps are gone, as is the `chance:` prefix on the five real writes that kept no
  bare sibling. `base:zombies:toBlock` is the one surviving qualifier — the only enchantment
  writing at two non-adjacent positions inside one region. `base:com1ConstructCatapult` folded into
  `constructCatapult` beside the modern step; `com1SummonBranch` did **not**, because it covers
  both the Paladins-to-Life and the Nature branches that the modern engines split into two writes,
  so it kept its own id as `summonBranch` with the engine name dropped.
  **One invariant changed:** `assertStatStepOrder` now keys sequence uniqueness on `phase:id`, the
  key the composer, the chains and `STEP_VERSION_SCOPES` already used; the bare-id check it
  replaced could not express one enchantment writing in two regions of one engine (Warlord's
  `c:weakness` and `d:weakness`). Two F20 assertions and one trace-projection assertion moved to
  the same key for the same reason, and the projection check now states what it always meant — a
  Breath reconstruction drops the *fields* belonging to other channels, not the whole entry, since
  a merged step's melee half belongs to every channel's view.
  Six flat halves left `getAbilityStatSteps` for hand-written steps in `stats_sequence.js`, because
  their attack-strength half reads a per-channel mod that builder never receives; `landLinking`
  needed `landLinkingEligible` plumbed through, since the emit it replaced read the pre-gated
  `effectiveAbilities`. Twenty-one PROVENANCE comments merged and their anchors rebound —
  the same reviewed spans regrouped, no new evidence — leaving 239 formulas. Player-facing
  modifier tooltips lost the raw qualifiers with them ("Identity Chosen" is now "Chosen").
  **Arithmetic is unchanged in all five versions**, measured as zero differences across 15,480
  derivations spanning every ability and enchantment control, eight attack shapes and nine
  environments, against a baseline taken on the pristine tree
  (`tools/derivation_equivalence.js`, `tools/derivation_equivalence_diff.js`).

## 2026-08-19

- **F83 — the pre-Focus type snapshots are gone.** `rangedTypeBeforeFocus` /
  `thrownTypeBeforeFocus` and all six per-site version ternaries reading them are deleted
  (`stats.js`). Each reader now takes the channel identity live at its own step's position: the
  three writes the chain puts ahead of `c:focusMagic:conversion` — `b:fieryFury`,
  `b:bombsGrenades` and `c:level` — are evaluated before the conversion in the pre-sequence
  chain, and `flameBlade:ranged` reads `u[rangedTypeField]`/`u[thrownTypeField]` in its own
  `apply`, which is what lets one gate serve CoM 1 (whose chain puts the step *before* the
  conversion) and CoM2/Warlord (after) with no `isCoM1` test. The M4 excess still subtracts
  `ffRtbMod`, the amount region `b` actually wrote. **Arithmetic moved in one version:** the
  three `isWarlord ?` ternaries were standing in for the pre-sequence Blaze of Glory and Shadow
  Strike flips that F81 and F82 removed, and their pre-Focus side effect made Warlord disagree
  with CoM2 at region-`c` positions the two chains share. On Warlord under Focus Magic only,
  Orihalcon now reaches the converted magical ranged (missile 6 → `magic_s` 8, was 6) while
  Discipline (−1), Blazing March (−3) and the Warlord blade (−2) stop reaching it — each now
  equal to CoM2 1.05.11, which no Warlord script overrides: `UnitCalcPre.CAS` and `UnitCalc.CAS`
  name Discipline and Blazing March only to set flags and Orihalcon not at all. Nothing moves in
  `mom_1.31`, `mom_cp_1.60.00`, `com_6.08` or `com2_1.05.11`, measured by diffing 298,720
  derivations against an inverted-edit baseline. The four assertions that pinned the old Warlord
  values are replaced by the claim that carries them: a Focus-converted attack and a native
  magical one of the same strength must be treated alike by every write after the conversion,
  checked in both modern versions.

- **F82 — Shadow Strike's grant is a positioned region-`d` step.** `SThrown := SThrown + 1 +
  SAttack/3` (`UnitCalc.CAS:1262-1266`) still runs where it always did, after Colossal Strength
  and Vampirism, but the pre-sequence `shadowStrikeApplies` flip that re-aimed a slot's identity
  before any step ran is gone, and the Thrown field it fills is now seeded empty and typeless
  like the Blaze of Glory transfer's: the step supplies the identity, so nothing before
  `UnitCalc.CAS:1262` sees a Thrown attack the grant has not yet made. `shadowStrikeFillsSlot`
  replaces the flip and states only which field the write reaches. Three writers keep reaching
  that field through it, because the binary writes them with no positivity or type gate:
  Weakness's and Mind Storm's `Dec(U.thrown, …)` (`Units.RecalculateUnits.pas:2273-2295`) and
  Holy Weapon's `Inc(U.hitchancethrown, 10)` (`:1803-1809`); F91 generalized all three to the
  record field they write. Five type-gated ones stop reaching it, each toward the engine: Blazing
  March's +3 Thrown, Flame Blade (Warlord) +2, Fiery Fury +2, the Wall of Fire garrison +1, and
  Metal Fires' shared blade bonus. So do the level ladder, gated on `BaseUnits.thrown > 0`
  (`:562-564`), and the magic-weapon strength and To Hit, gated on `Units.thrown > 0` (`:660-663`)
  — both read the field in region `c`, where the grant has not written it. Nothing moves in the
  other four versions. The transitional `shadowThrown` slot stays: the calculator models Focus
  Magic's `U.ranged := U.thrown; U.thrown := 0` as an identity flip in place, so the record's
  Thrown field is not free for the grant, and making that move real needs position-aware slot
  gates — filed as [F90](#2026-08-20), which M12 did not lift. New coverage:
  `shadowStrikeGrantPrecedesNoBlazingMarchWarlord` 17.000, plus the two-channel acceptance case
  (`thrown 10` on F81's fixture) and the level/weapon exclusions in
  `tools/unit_checks/warlord_abilities.js`.

- **F81 — Blaze of Glory's channel transfer is a positioned region-`d` step.** `SThrown :=
  SThrown + SRanged` / `SRanged := SRanged - SRanged` (`UnitCalc.CAS:1490-1501`) is now emitted by
  `d:blazeOfGlory:thrown` at that line's own position instead of by a pre-sequence
  `blazeOfGloryConvertsChannel` flip plus a post-walk merge of two slots, so every earlier
  predicate reads the conventional Ranged identity the engine's earlier writes read. The Thrown
  field is seeded empty and typeless where the unit has none, since the transfer has no existence
  gate; the step supplies the identity, and the region-`e` slot clamp spares that field the way it
  already spares the armor-to-melee transfer. Rust gained the `SETSTAT(U,SThrown,0,0)` strength
  write beside its type clear (`:493-503`) — cosmetic until the transfer had a position, load-bearing
  now. Eight further effects change under Blaze on Warlord, each toward the engine: Rust −3 reaches
  the missile field (`thrown 3`, was 6); Weakness and Mind Storm carry their pre-clamp negative into
  the transfer; Lionheart's +3 lands on missile; Misfortune's `persistentRanged` −1 lands on the
  emptied Ranged field rather than the survivor; Metal Fires and Wall of Fire stop reaching a magic
  ranged attack through the flipped branch; Reinforce Magic reaches it; and the Focus-created Ranged
  is transferred, the old `calcBaseRtb > 0` gate having skipped it. `blazeOfGlory` alone, Colossal
  Strength, Vampirism and Shadow Strike are unchanged. Clearing the emptied field's ranged type is
  this model's stand-in for the `SETSTAT(U,SAmmo,0,0)` beside the transfer, recorded in
  [SPEC.md](./SPEC.md), *Deliberate deviations from the engine*. New coverage:
  `blazeOfGloryFollowsRustWarlord` 3.000, and the two-channel acceptance case in
  `tools/unit_checks/warlord_abilities.js`.

- **F88 — the modern engines derive every attack channel in one walk.** `Caster.exe` holds Ranged,
  Thrown, Fire Breath and Lightning Breath as four named fields of one record
  (`Units.RecalculateUnits.pas:203-219`) and mutates them in place, so the calculator now does too:
  `STAT_DERIVATION_SLOTS` (`steps.js`) declares one **slot** per record strength field, each with
  the type pair the two surviving pre-sequence flips still need beside it, and `deriveUnitStats`
  builds one context per slot and runs the sequence once. The per-channel recursion is gone with
  every ownership gate it needed — `_modernChannelPass`, `_modernChannelKey`,
  `energyCannonOwnsThisPass`, `ccOwnsThisPass`, `marionetteRangedPass`,
  `modernConventionalRangedPass`, `shadowStrikeOwnsThisPass` and the rest are per-slot facts now,
  not per-derivation ones. The channel-seeding rules survive as field creation: an effect with no
  existence gate — Shadow Strike, Bombs & Grenades, Focus Magic, Marionette, Chaos Channels Fire
  Breath, combat Flame Blade, Dragon Mound, Lightning Blade — seeds the field its step then writes.
  Vampirism stops probing: `UnitCalc.CAS:1490`'s combined truncation is now a plain cross-channel
  read of the three source fields at its own region-`d` position, which is the write F80 existed to
  make expressible. The DOS engines keep the shared `.ranged` slot, which the modern record carries
  beside its four as the card's legacy secondary projection — a fifth slot the engine has no field
  for, recorded in [SPEC.md](./SPEC.md), *Deliberate deviations from the engine*. The three To Hit
  writers F87 measured are re-sourced: `chance:weapon:rtb`, `chance:holyWeapon:rtb` and
  `chance:heavenlyLight:rtb` decide `hitchanceranged` from the record's own `rangedtype` and
  `hitchancethrown` from its Thrown field (`Units.RecalculateUnits.pas:639-662`, `:1806-1809`,
  `:1451-1454`), so a Thrown channel can no longer decide the Ranged modifier — latent under the
  recursion, a live defect under one walk. No arithmetic moves in any of the five versions; the
  flips and the Blaze of Glory merge stayed for F81/F82. New coverage: `ccFireBreathSeparatesThrownWarlord`
  4.400, which Hurricane's −20/−30 split makes sensitive to which field the grant lands in, and the
  pair `weaponToHitReadsOwnRangedChannelWarlord` 1.200 / `weaponToHitSkipsMagicRangedChannelWarlord`
  0.900, which read the Ranged modifier off a unit that also carries a Bombs & Grenades Thrown;
  plus per-channel strength and To Hit checks over a four-channel unit in
  `tools/unit_checks/step_traces.js`.

- **F87 — a recorded write now names the attack channel it reached.** `STAT_CHANNEL_FIELDS`
  (`steps.js`) is the single map from record field to channel — `toHitRanged` → Ranged,
  `toHitThrown` → Thrown, `toHitBreath` → both Breaths, since one `hitchancebreath` modifier
  serves two strength fields (`Units.RecalculateUnits.pas:203-219`) — and a step’s `writes:` is
  what resolves it, so nothing gains a second declaration. `recordStepTrace` tags a sparse event
  with the channels its *changed* fields reached; the execution ledger tags every visited step,
  applied or predicate-skipped, with the channels its *declaration* targets, so a step that did
  not fire still says which channel it would have reached. `projectTraceToChannel` rebuilds one
  channel’s view of a walk: channel-agnostic writes survive whole, a shared write keeps only that
  channel’s half, emptied events are dropped and `traceOrder` is renumbered, so the result is a
  trace `assertStatTraceOrder` holds on — that assertion now also requires attribution to be
  present and exact, in both the sparse and the complete form, which reaches the producers that
  build trace events outside the runner. No arithmetic moves in any of the five versions and the
  per-channel recursion stays; the next stage of F80 removes it and registers the four strength
  fields in the same table. Measuring the walk found three To Hit writers whose eligibility still
  reads the pass’s `rangedType`/`thrownType` rather than a per-channel field, recorded at
  `secondaryHitField` (`stats.js`); each pass’s own field is right, the others are latent. New
  coverage: channel-attribution and reconstruction checks in `tools/unit_checks/step_traces.js`,
  plus the enchantment’s first presets — `heavenlyLightRangedCoM2` 1.200 and, for the channel
  boundary, `heavenlyLightNotBreathCoM2` 0.600 against the 0.800 a Breath To Hit leak gives.

- **F86 — The modern secondary To Hit slot became three fields.** `toHitRtb` splits into
  `toHitRanged`, `toHitThrown` and `toHitBreath` for `com2_1.05.11` and `com2_warlord_1.5.12.7`;
  the three DOS engines keep the single slot, which is the shape they store. Fire and Lightning
  Breath are separate strength fields sharing one `hitchancebreath` modifier
  (`Units.RecalculateUnits.pas:203-219`), so three fields and not four — `toHitMelee` was already
  its own. Every writer now names its channels instead of depending on which channel the pass
  derives: Ballistics Training all three (`UnitCalcPre.CAS:1084-1086`); Heavenly Light, Holy Weapon
  and weapon material ranged and thrown but never breath (`Units.RecalculateUnits.pas:1451-1454`,
  `:1806-1809`, `:639-662`); True Sight ranged alone (`UnitCalc.CAS:326-328`), replacing the
  `modernConventionalRangedPass` gate F85 above used; Hurricane −20 ranged, −20 thrown, −30 breath
  (`UnitCalc.CAS:558,569-571`), retiring the `hurricaneRtbPenalty` 0.2/0.3 ternary that existed
  only because two engine fields shared one slot. Region `e` clamps all three against the
  already-clamped common value (`:2456-2480`), and Energy Cannon’s threshold reads the ranged
  field (`UnitCalc.CAS:1435-1443`). `result.toHitRtb` still exposes the deriving channel’s field,
  so the output contract is unchanged. Two values move, both where the shared slot had been
  self-inconsistent: a Lightning-Blade-converted channel is Breath and so no longer takes Heavenly
  Light’s Thrown bonus, and a modern unit with no secondary attack now shows True Sight’s
  unconditional `SToRanged` write. Nothing else moves, in any of the five versions. The
  per-channel recursion stays; collapsing it is the next stage of F80. New coverage reads several
  channels off one unit — Hurricane in `warlord_abilities.js`, Holy Weapon in
  `derive_unit_stats.js` — plus presets `hurricanePenaltySizeRanged` 1.600 and
  `hurricanePenaltySizeBreath` 1.700, because the existing `hurricaneRanged`/`hurricaneBreath` pair
  cannot separate −20 from −30: from a 30% base both floor at 10%.

- **F85 — Warlord True Sight leaked its To Hit bonus onto Thrown and Breath.** `UnitCalc.CAS:326-328`
  writes `SToRanged` alone, but `trueSightRtbToHitBonus` (`stats.js`) carried no channel test, so
  under the per-channel derivation the +5 also landed on the Thrown, Fire Breath and Lightning
  Breath passes. Gated on `modernConventionalRangedPass`, the same fix F67 below used for the
  Goblin Pox and Soul Flay ranged penalties; no ranged-type test, because the script writes the
  modifier whatever the type. Eye of Heaven inherits the bug and the fix through
  `UnitCalcPre.CAS:1840-1842`, which grants `EncTrueSight`. `PROVENANCE[chance:trueSight:ranged]`
  is unchanged and already cited the correct lines. The `derive_unit_stats` Eye of Heaven check
  asserted the leak — it measured `rtbType:'fire'` and expected 0.35 — and is re-aimed onto magical
  ranged, with a second case holding Fire Breath at 0.30. Two new presets,
  `trueSightBreathUnaffectedWarlord` and `trueSightThrownUnaffectedWarlord`, each 0.600 against the
  0.650 the leak produced. Found while checking whether existing evidence settles F80's record
  shape: the modern unit record carries `hitchance` plus four separate modifiers
  (`hitchanceranged`, `hitchancethrown`, `hitchancebreath`, `hitchancemelee`), so Fire and
  Lightning Breath share one To Hit field while remaining separate strength fields
  (`Units.RecalculateUnits.pas:203-219`; `MASTER.CAS:1000-1006`).

- **F67 — Goblin Pox and Soul Flay ranged penalties.** Both curses write `SRanged` in
  `UnitCalcPre.CAS` — Goblin Pox −1 on the Goblin branch and −3 on the non-Goblin branch, Soul
  Flay −FLAY per experience level — and both steps dropped it, the same defect F62 below fixed for
  Plague between them. Added `goblinPoxRtbMod` and `soulFlayRtbMod` (`stats.js`) gated on
  `modernConventionalRangedPass`, so each penalty lands on the conventional ranged channel and
  leaves Warlord’s independent Thrown and Breath fields alone, and extended both steps’ `writes`
  with `rtb`. Neither citation changed: `PROVENANCE[goblinPox]` covers `UnitCalcPre.CAS:1554-1572`
  and `PROVENANCE[soulFlay]` covers `1298-1310`, both including the ranged lines, so these were
  partial readings of correct sources. `goblinPoxNonGoblinArmorWarlord` asserted the opposite —
  its missile attacker was chosen because “Pox Host reduces only melee” — and is re-aimed onto
  Thrown, the channel the script really does leave alone, keeping its 3.000 against 0.000 without
  Pox Host while now also failing at 0.000 if the ranged write leaked to Thrown. Three new presets
  measure the write: `soulFlayRangedRecruitWarlord` 4.000 against 5.000, and
  `goblinPoxNonGoblinRangedWarlord` 5.000 and `goblinPoxGoblinRangedMilderWarlord` 7.000, both
  against 8.000, the Goblin pair also separating −1 from −3. The Soul Flay enchantment tooltip
  and the Pox host control tooltip now list the ranged term.

- **F65 — the `PRESETS`/`TEST_TREE` contract is now checked.** `CLAUDE.md`, *Presets* required
  every preset to appear in `TEST_TREE` with nothing enforcing it, and `immolationNotRangedCoM` had
  fallen out — evaluated by `runTests()` but unreachable from the browser grouping.
  `runPresetGroupingChecks` (`tools/node_unit_checks.js`) now diffs the merged `PRESETS` keys
  against every `keys:` list in `TEST_TREE` in both directions and reports both in one message; the
  reverse direction guards the same defect in an orphaned group key, of which there are none.
  `loadPresetContext` (`tools/calculator_sources.js`) loads the `data-scope="page"` fixture sources
  on top of the core context — they are plain data — selected by the names the *Presets* section
  already fixes, so a new part file needs no second list. Keys only: Node still never evaluates a
  preset. The missing key joined the version-differences `Immolation` group, where it completes a
  three-version scenario with `immolationRangedMoM` and `immolationNotRangedPatched` that is
  identical apart from `version:`.

- **F62 — Warlord Plague's ranged penalty.** The `plague` step applied melee, armor, resistance
  and To Hit but silently dropped `SETSTAT(U,SRanged,0,GetStat(U,SRanged,0)-3)`, which its
  `PROVENANCE[plague]` span already bound. Added `plagueRtbMod` (`stats.js`) gated on
  `modernConventionalRangedPass`, so the penalty lands on the conventional ranged channel only and
  leaves Warlord's independent Thrown and Breath fields alone, as the script does; extended the
  step's `writes` to include `rtb`. The citation and its anchor were unchanged — the span covers
  `UnitCalcPre.CAS:1540-1550` in full, so the defect was a partial reading of a correct source,
  not a mis-scoped one. New preset `plagueRangedWarlord` measures 4.500 with the write and 7.200
  without it, the gap being the 8-strength missile the old code left unreduced. The `plague`
  enchantment tooltip now lists the ranged term.

## 2026-08-18

- **M9 — one canonical version scope, one execution chain.** Stages 2 and 3, closing the item.
  *Stage 2:* `filterStepsToVersionScope` applies `STEP_VERSION_SCOPES` to all four sequences —
  stat, identity, figure and the To-Hit/To-Block ledger — before composition, replacing the
  `phase b/d && isWarlord` filter that was the only one of its kind. A version's sequence is now
  the writes that version's engine makes, so an out-of-scope step is absent rather than present
  behind a false predicate, and the region-`c` lists lost the entries the filter made unreachable
  (68→60 modern, 68→49 CoM 1, 68→37 both MoM builds). The filter is also the coverage check —
  an unclassified step throws there, in every build rather than under the debug switch — so the
  three debug-only coverage assertions are gone. Stage 1's measured worklist of 48/48/39/32/15
  out-of-scope members per version is now an invariant instead of an inventory: no version
  composes an out-of-scope step, evaluates one's predicate, or writes a field from one. The eight
  steps whose removal could have changed a number are each an enchantment whose control the
  version hides, so no UI state reached them.
  *Stage 3:* one ordered chain per version, `base` through `e`, is the single ordering mechanism —
  `statChain` in `stats_manifests.js`. Array order decides nothing, `phase` is a provenance label
  that orders nothing, and a step whose key the chain does not name fails composition instead of
  landing where it was authored. Both derivation sequences and the figure sequence walk it. Each
  entry says whether its position is transcribed or `provisional`: region `c` and the Warlord
  `b`/`d` lists are transcribed, `base`/`a`/`e` are inherited from authoring order, and CoM 1's
  Focus Magic is the one deduced position inside a transcribed region. That flag was set on
  `berserk` alone and consumed by nothing; it is now asserted key by key per version. A projection
  states the write it re-presents as `projectionOf` instead of having it guessed from a `chance:`
  prefix — the guess could not tell a projection from a real `chance:` step, so a real one whose
  scope row went missing silently inherited another step's. Arithmetic is unchanged in all five
  versions: 114 Playwright tests, 983 presets and 13459 node checks green.

- **F59 — the preset reconciliation is closed; the suite is green.** The last three failures were
  not M9's to fix — all three run under `mom_1.31`, where both effects are in scope, so the scope
  filter never touched them. Each was a separate, sourced problem. `berserkDoublesAfterOtherBonuses`
  expected High Prayer before Berserk's doubling; `unitcalc.c` doubles at `131:0x8F860`, the last
  block of the unit-enchantment routine, and adds High Prayer's +2 at `131:0x902CF` in the
  combat-enchantment blocks that follow, so 8 is the engine's answer and 10 was the pre-R1 deduced
  position. Renamed `berserkDoublesBeforeHighPrayer`; the step's `provisional` flag and the "after
  all other bonuses" claim in its comment and tooltip are gone, because the routine is decoded.
  `metalFiresFantasticUnaffected` expected 2.000 against its own description; it expected 1.000
  until `a1d686d` renumbered it, and 1.000 is what the Fantastic gate produces.
  `metalFiresFantasticNoWeaponUpgrade` is retired: a Fantastic unit's `Weapon_Plus1` is already 1
  at `131:0x8F266`, long before Metal Fires' region-`c` block, so its attacks are always magical,
  `Battle_Unit_Attack_Immunities` never sets the Weapon Immunity flag, and the preset's premise
  could not hold. Measured with and without Metal Fires: 2.0 either way. Its claim has no
  observable consequence in the model — [F61](./BACKLOG.md)'s aim-vacuity mode, which it now
  illustrates alongside `upgradedExplosiveBeforeTrueLightWarlord`.

- **Two defects the M9 filter surfaced.** `baseUnitInput` defaulted the node suites to
  `version: 'com2_1.5'`, which is not one of the five: every `startsWith('com2_')` predicate
  accepted it while the exact `version === 'com2_1.05.11'` tests in `combat_fear_and_touch.js`,
  `combat_phases.js` and `ui.js` did not, so those paths were probed as a build that does not
  exist. And the CoM 1 source-order anchors in `tests/f20-source-order.spec.js` named
  `discipline`, `badMoon`, `goodMoon` and `natureConjunction` — `Caster.exe` writes with no CoM 1
  counterpart, which only ever matched skipped visits to steps the binary does not contain.

- **F63 — Blaze of Glory's channel transfer reaches the output, and adds.** The Ranged→Thrown
  conversion was a local mutation that the stepped record could not see, so it had stopped
  reaching the result; it is now `d:blazeOfGlory:thrown`, a step beside `d:blazeOfGlory` under the
  same `UnitCalc.CAS:1490-1501` citation, which covers both transfers of the one script block. The
  script's `SThrown := SThrown + SRanged` is an addition, not a rename, so the modern channel
  assembly in `stats.js` now merges a Blaze-converted Ranged channel onto the Thrown field instead
  of letting the two collide on one output key: `ranged 6 + thrown 2` yields `thrown 8`, the
  script's answer, where the collision previously dropped the converted strength and printed
  `thrown 2`. The Thrown field is the survivor and keeps its own type, To Hit and traces; the
  merge happens after the channel walk so it does not depend on channel order, and it extends the
  surviving modifier trace so `modifierTrace.result` still equals the reported strength. The
  preset fixture format maps a scenario onto a single modern channel, so the two-channel case is
  asserted in `tools/unit_checks/warlord_abilities.js` with its feature-removed control.
  `blazeOfGloryRangedToThrownWarlord` is green; `npm test` is 113 passed with [F59](./BACKLOG.md)'s
  three M9-held preset failures remaining. Implementing it measured a third, distinct defect at the
  same site, filed as [F66](./BACKLOG.md): the local flip re-aims the type predicates of every
  earlier region, so a Blaze unit escapes Rust's missile/boulder penalty. The Giant Strength
  half of that first reading was wrong and is withdrawn in F66 — the ability is MoM-scoped.

- **F64 — the DOS thrown/breath phase no longer requires melee strength.** `combat.js` gated the
  melee-path thrown/breath rider on base melee > 0 for `mom_1.31`, `mom_cp_1.60.00` and
  `com_6.08`, an unsourced predicate added in `563d4d3`. It is gone: `BU_AttackTarget` admits the
  rider on attack type alone (`DOS reconstructed/combat.c:2605`), its melee entry carries no
  strength gate in any build, and the routine's sole call site — one near call at `0x9AF40`,
  identical across the three builds, found by scanning both direct call encodings over each whole
  executable — is unconditional, computing a ranged-versus-melee mode argument rather than
  deciding whether to engage. The call-site evidence is in
  [R6.2a](../Reference%20docs/DOS%20reconstructed/R6.2a.evidence.md), *Call-site admission*;
  the routine at `0x9AD04` remains unreconstructed and no reconstruction was needed. Whether the
  game's UI offers a zero-melee unit a melee attack is a command-layer question the calculator
  deliberately does not model — it computes the exchange it is given, which also sidesteps the
  unresolved base-versus-effective and Confusion cases. `guidingBeaconExcludesThrownCoM` is green;
  `fireImmunityAfterArmorPiercing` keeps its expectation of 0 but now reaches the immunity it
  names. CoM2 and Warlord are unaffected: their thrown/breath channels never used this predicate.

- **T7 — `ui.js` split into readable sources.** The last calculator file no agent could read whole
  (205 KB, 4,772 lines) is now seven, cut along its own responsibilities: `ui_abilities.js` (ability
  controls, version gating, show-inactive visibility), `ui_units.js` (roster comboboxes and identity
  controls), `ui_card.js` (control reading, the modern and DOS special blocks, the derived stat
  card), `ui_state.js` (reset/swap/version switching, presets, and the share, hash and localStorage
  payloads), `ui_matrix_properties.js` (the matrix property drawer) and `ui_matrix.js` (matrix
  stats, worker, table, CSV, modal), with `ui.js` keeping result rendering, `recalculate` and the
  bootstrap wiring. Largest is now `ui_state.js` at 40 KB. The cut is load-order-safe by
  construction: every top-level statement in the UI layer stays in `ui.js` in its original order and
  `ui.js` stays last, so the other six declare only and nothing runs before what it needs — the rule
  is recorded in index.html's manifest comment, which owns load order. No behavior change; every
  moved line moved verbatim. `node tools/node_unit_checks.js` passes 12,750 assertions (12,744 plus
  one manifest existence check per new source), `npm run provenance` is unchanged at 264 formulas,
  and `npm test` is unchanged at 113 passed with [F59](./BACKLOG.md)'s 25 preset failures still red,
  identical in name and error magnitude. The largest calculator source is now `stats.js` at 113 KB.

## 2026-08-17

- **T6 — the provenance-narrative boundary decided, and the duplication it found removed.** The
  boundary: prose stays beside the code when it justifies the step's *position*, records a
  divergence the calculator makes deliberately, or documents the code's own vocabulary; it belongs
  in evidence when it establishes how an engine *value* was arrived at — patch sites, table
  lookups, source-vs-source reconciliation. An address in the prose does not decide it: position
  justification cites addresses too. The audit measured 250 KB of comment text across the twelve
  formula-bearing sources, in 760 blocks of which 92% are four lines or shorter, so there was no
  bulk move available. Of 319 multi-line prose blocks only **92 carry a `PROVENANCE`/`STAT-FORMULA`
  citation**; triaging all 92 against the boundary found seven carrying value-derivation, each with
  an evidence home strictly richer than the code text (Wall of Fire and Immolation to *Immolation
  and Wall of Fire are both Fireball*, Chaos Channels to *`BU_Apply_Specials` runs twice*, undead
  immunities to *Undead immunities are a race gate in MoM*, the ranged divisor to *Ranged distance
  penalty*, Artificer and Lucky Star to `Source discrepancies.md` §6 and §10). Those were replaced
  by section pointers, and the phase-model restatement in `combat_abilities.js` — a third copy of
  what `SPEC.md`, *Phases* and `CLAUDE.md`, *Step authoring* own — was deleted outright. The
  measured saving is **1,461 characters**: the anchored corpus turned out to be almost entirely
  position justification and deliberate-divergence notes, both of which stay, so T6's premise that
  long-form narrative was displaceable in bulk does not hold and it is retired rather than
  continued. The 227 unanchored blocks are the opposite problem and became T8. Comments only —
  `node tools/node_unit_checks.js` passes 12,744 assertions, `npm run provenance` is unchanged at
  264 formulas.

- **`SPEC.md` stopped restating engine behavior, retiring T5.** The spec described what individual
  abilities, enchantments and effects do — magnitudes, gates, arithmetic, channel lists — in prose
  that nothing checked, alongside binary addresses, CAS line numbers and loaded INI constants whose
  owners are the evidence documents. `PROVENANCE[id]` citations carry the same claims and *are*
  checked, by `npm run provenance`, so the spec's copy was an unverified duplicate of a verified
  one, with drift resolved by whichever copy the reader opened. Effect behavior now has one home:
  the citation beside the implementing step. `SPEC.md` keeps scope, computation and derivation
  architecture, the input/output contract, invariants, and a new **Deliberate deviations from the
  engine** section — the 17 places the calculator knowingly departs from, narrows or declines to
  reproduce the engine, which no binary states and which were previously buried mid-paragraph.
  1,281 lines to 619 (92 KB to 40 KB, ~24.8k tokens to ~10.7k), so T5's premise no longer holds and
  it is retired rather than done. The phase-classification procedure moved to `CLAUDE.md` as the
  authoring convention it is; routing in the root `CLAUDE.md` and `Calculator/CLAUDE.md` now sends
  effect questions to the citation rather than the spec. Two orphans surfaced: a dangling `D1/D3`
  reference behind Righteousness' parked classification, re-filed as Q27, and the DOS per-figure
  Doom Gaze divergence, filed as F60. Documentation only — `node tools/node_unit_checks.js` passes
  12,744 assertions and `npm run provenance` is unchanged at 264 formulas.

- **T4 — the three unreadable sources split.** `combat.js` (325 KB) is seven files cut at
  top-level function boundaries, `combat.js` itself keeping `resolveCombat`; `stats.js` (221 KB)
  is four, cut at the phase boundaries M9 works in — `stats_manifests.js`,
  `stats_identity.js`, and `stats_sequence.js`, whose six functions are the engine regions `base`
  through `e` in execution order; and `tools/node_unit_checks.js` (233 KB) is an entry point over
  ten suites in `tools/unit_checks/`, sharing one assertion counter. Largest remaining file of the
  three: `stats.js` at 113 KB. The stat sequence no longer closes over `deriveUnitStats`' locals:
  it takes the 182 values it reads as one context object, so a region states its own inputs, and
  the classification checks proved this behavior-neutral because nothing the sections read is
  reassigned after the sequence is built. Formula-bearing sources also got one home —
  `calculatorFiles` in `provenance_audit.js`, which the manifest generator and the version-scope
  checks now read instead of repeating a list that would otherwise have grown from two names to
  ten in four places. No behavior change: `node tools/node_unit_checks.js` passes 12,744
  assertions (12,735 plus one manifest existence check per new calculator source), `npm run
  provenance` is unchanged at 264 formulas, and `npm test` is unchanged at 113 passed with
  [F59](./BACKLOG.md)'s 25 preset failures still red. T4 named three files; `ui.js` (205 KB) was
  larger than any of them and became T7.

- **T3 — `data.js` split into readable sources.** The repo's largest file (509 KB, ~141k tokens)
  is now twelve, each one an agent can read whole: `data.js` keeps the constants, the version ids
  and the two definition-layout helpers; `abilities.js` and `enchantments.js` take the definition
  lists; and the 979 numeric presets are cut by ability family across seven `presets_*.js` files
  that merge into one `PRESETS` through `definePresets()` (`presets.js`), with `TEST_TREE` in
  `test_tree.js`. Nothing was reordered — the cuts fall on the existing `// --- family ---`
  boundaries, so the presets' relative-position prose still reads true — and `definePresets()`
  rejects a key defined twice, which the single object literal accepted silently. The presets and
  the tree are `data-scope="page"`, which is the manifest stating what `CLAUDE.md` already
  required: `PRESETS` is evaluated only through the page's `runTests()`, and the Node suites now
  load 424 KB less. No behavior change: every global is byte-identical in content and key order
  (all 979 presets), `node tools/node_unit_checks.js` passes 12,735 assertions — 12,724 plus one
  manifest existence check per new file — `npm run provenance` is unchanged at 264 formulas, and
  `npm test` is unchanged at 113 passed with [F59](./BACKLOG.md)'s `25/979` preset failures still
  red. Per-test cost is unchanged: eleven more requests per page load measured +0.09s per load.

- **T2 — one source manifest.** `index.html`'s `<script>` tags are now the single home for the
  calculator's file list and load order, classified `data-scope="core"`/`"page"` with `data-worker`
  marking the matrix worker's subset. `tools/calculator_sources.js` reads them for Node and owns the
  shared headless `loadCalculatorContext()`; `matrixWorkerSource()` in `ui.js` reads the same tags
  from the DOM for the matrix worker and the three specs that build a worker to check parity.
  Adding or splitting a source is one edit instead of five, unblocking T3 and T4. The readers throw
  on an unclassified tag, on `data-worker` outside `core`, and on any `Calculator/*.js` file no tag
  mentions — an unconditional rule, since `Calculator/matrix-worker.js` is deleted. That file was an
  unloaded hand-synced copy of the worker body and the one import list that could not read the
  manifest; it had already drifted, missing `steps.js`. No behavior change: all five versions and
  the loaded file set are identical,
  `node tools/node_unit_checks.js` passes 12,724 assertions and `npm test` is unchanged at 113
  passed with [F59](./BACKLOG.md)'s 25 preset failures still red.

- **Numeric preset suite runs from `npm test`, and the suite runs twice as fast.** `runTests`
  had no caller in the repo, so none of `PRESETS`' 979 expectations were ever evaluated by an
  automated run; `tests/presets.spec.js` now drives them all in one page load. It is red at
  `25/979` and [F59](./BACKLOG.md) owns the reconciliation. The matrix drawer tests, which assert
  panel layout and scroll behavior and never read a cell, now trim the roster before opening the
  matrix instead of resolving ~150x150 combats per test, cutting each from 19–23s to 1.4–2.2s,
  with an overflow assertion so a too-small matrix cannot make the scroll checks pass vacuously.
  That file was 51% of suite runtime. The suite stays serial: parallel workers measured worse
  than their complexity was worth. Absolute suite totals on this laptop drift heavily under
  sustained load — the same serial configuration measured between 146s and 262s — so compare
  per-test durations rather than wall clock.

- **CoM 6.08 Quick Casting relabel.** The Tweaker export still carries MoM's `Land Corruption`
  name for `Abilities` bit `0x0200`, which CoM 1 reassigned to Quick Casting. Illusionist and
  Demon Lord now carry `Quick Casting`, matching the CoM2 and Warlord rosters and the manual's
  own unit entries; the ability stays unmodelled and inert, like the other strategic abilities the
  roster retains. `Destruction` on the CoM 6.08 Magician is now explicitly kept rather than
  reported as an unrecognized tag — it binds to the `destruction` control and M3 still owns the
  older-engine path. The generator's unmatched-token report is clean for all three DOS inputs and
  is now version-aware, so a MoM export growing either token would still be reported. Evidence:
  [R6.1a](../Reference%20docs/DOS%20reconstructed/R6.1a.evidence.md).

- **T1 — newline-delimited generated rosters.** The three roster generators now emit
  `units_mom.js`, `units_com.js`, `units_com2.js`, and `units_warlord.js` at `indent=2`, matching
  the JSON sibling each already wrote, so a content search returns matching lines instead of four
  single-line build products. Every record parses identically and all five calculator versions are
  unchanged; the `Unit rosters/` JSON outputs stay byte-identical. Total roster bytes grow 354 KB to
  454 KB, and a whole-file read is no longer the search's default outcome.

## 2026-08-16

- **F20 — source-order stat-transform closure.** Explicit per-version `b`/`c`/`d` manifests now account for every represented step exactly once in source order, preserve atomic multi-field writes, and expose a complete applied/skipped execution trace with order assertions. Existing arithmetic and sparse public traces remain unchanged across `mom_1.31`, `mom_cp_1.60.00`, `com_6.08`, `com2_1.05.11`, and `com2_warlord_1.5.12.7`; focused structural regressions cover atomicity and malformed manifests. See [the method-3.1 review artifact](../.reviews/F20.review-of-luna.md).

## 2026-08-15

- **R9-G1c — final unit-transform provenance closure.** Bound the last seven formula sites to
  checked-in DOS, modern Caster, and Warlord script/table implementations. Warlord permanent
  creation now uses the saved Wild Game ranged channel, the full Nightshade count, unconditional
  Dragon Mound Fire Breath creation, and Energy Cannon's roster-equivalent permanent-Ranged gate
  and ranged-only riders;
  DOS material and CoM 1 Flame Blade writes now retain their pre-Focus order. The provenance audit
  has no open formulas.

- **R9-G1e — weapon material chance projections.** Bound melee and secondary-channel material
  To-Hit across all five builds to the reconstructed DOS material block, reconstructed modern
  `ApplyMagicWeapons`, and both shipped runtime values. Eligible Thrown attacks now receive the
  material bonus, while a zero-melee unit no longer displays a material melee bonus; magical
  Ranged, Breath, Gaze, and CoM 1 Focus-Magic exclusions are preserved.

- **F50/F51/F53 — CoM 1 side maxima, Realm Ward, and signed Warped Defense.** CoM 6.08 now
  applies Guiding Beacon, Divine Barrier, and Soul Linker at their pre-Heavenly-Light side-tail
  position; exposes the binary-backed Realm Ward −20%/−3/−3 transform; and truncates negative
  Warped Defense toward zero before later Supreme Light and Tactician writes. MoM 1.31, CP 1.60,
  CoM2 1.05.11, and Warlord 1.5.12.7 behavior is unchanged. The owning evidence is
  [R6.1d](../Reference%20docs/DOS%20reconstructed/R6.1d.evidence.md).

- **Combat healing state moved from advanced inputs to result means.** Unit cards and the matrix
  now accept only aggregate starting Damage Taken, treating it as Regular damage. Each side's
  result panel reports mean post-combat Irrecoverable/Irreversible Damage, Undeath Damage, and
  Bonus HP/Extra Hits per figure from the exact correlated final-state paths; retired saved input
  values are ignored.

- **F43 — CoM 6.08 common `0x0800` resolves as Exorcise.** The calculator now
  maps the retained *Dispel Evil* data label to the executable's literal Exorcise consumer and
  applies its CoM-only target, modifier, immunity, and attack-channel behavior. The address-backed
  path is recorded in [the MoM/CoM touch-effect analysis](../Reference%20docs/MoM%20binary%20analysis.md)
  and [D39's reconstructed common-attack flow](../Reference%20docs/DOS%20reconstructed/D39.evidence.md).

- **F57 — immediate DOS Life Steal healing.** MoM 1.31, CP 1.60, and CoM 6.08 now
  apply each eligible Life Steal margin immediately through the exact build-specific
  `Battle_Unit_Heal` transition and carry its correlated attacker state into later calls and
  dealt phases. Regular/Undeath/Irreversible categories, restored figures, temporary Extra Hits,
  signed-byte quirks, incoming category caps, and frozen simultaneous exchanges follow
  [R6.2c](../Reference%20docs/DOS%20reconstructed/R6.2c.evidence.md) and
  [R6.5b](../Reference%20docs/DOS%20reconstructed/R6.5b.evidence.md); modern Combatheal and
  Warlord Bloodsucker behavior remains unchanged.

- **F42 — Custom Level changes preserve editable base stats.** In all five calculator versions,
  changing Level on a Custom unit now leaves its hand-edited pre-level card stats and base identity
  untouched; only the downstream effective-stat transform changes. Predefined roster cards retain
  their roster reset and locking behavior.

- **F39 — combat-global Chaos Conjunction Immolation scaling.** CoM2 1.05.11 and
  Warlord 1.5.12.7 now expose one combat-global state that applies
  `Trunc(10 × 1.34) = 13` to every eligible Immolation firing from either side. Swap leaves the
  global in place, and persistence, share links, and matrix workers carry it. Wall of Fire and
  MoM 1.31, CP 1.60, and CoM 6.08 behavior are unchanged.

- **F36 — Warlord Wall of Fire spill and amplification.** Warlord 1.5.12.7 now
  resolves Wall of Fire as one ordinary non-Area attack whose surviving damage crosses wounded
  and full-figure boundaries with a fresh Defense roll and Invulnerability subtraction at each
  boundary. Its `ApplyDamageSpell` result receives the source-ordered, nonstacking Amplifier
  category adjustment. CoM2 Area Wall of Fire, Immolation, and all DOS versions are unchanged.

- **F40 — modern Wall of Fire Teleporting/Merging eligibility.** CoM2 1.05.11 and
  Warlord 1.5.12.7 now skip Wall of Fire when the attacker's calculated abilities include
  Teleporting or Merging. The abilities remain separate controls because Warlord Temporal Twist
  and Tactician treat Teleporting differently; Hierophany strips both. DOS versions keep both
  controls hidden and inert.

- **F35 — modern Area spell caps.** CoM2 1.05.11 and Warlord 1.5.12.7 Area
  `DamageSpell` iterations now cap at full HP per figure rather than the wounded top figure's
  remaining HP; the aggregate still caps at remaining unit HP. This covers both modern
  Immolations and CoM2 Wall of Fire. DOS behavior and Warlord's non-Area Wall of Fire are unchanged.

- **F37 — modern spell Magic-Immunity exit.** CoM2 1.05.11 and Warlord 1.5.12.7
  magical Immolation and Wall of Fire now return zero before Black Sleep or any attack,
  defense, or Invulnerability roll when the target has calculated Magic Immunity. The explicit
  `Nonmagic` bypass remains represented; DOS behavior is unchanged.

- **F38 — modern Black Sleep spell Doom conversion.** After the earlier immunity exit,
  CoM2 1.05.11 and Warlord 1.5.12.7 Immolation and Wall of Fire now deal deterministic Doom
  spell damage against a sleeping target. A Black-Sleeping tactical attacker cannot initiate the
  represented combat, so all incoming and outgoing damage remains zero. CoM2 keeps Area iteration
  semantics; Warlord Wall of Fire uses exact non-Area Doom strength. DOS behavior is unchanged.

- **F33 — modern hero ranged-distance exemption.** CoM2 1.05.11 and Warlord 1.5.12.7
  heroes now bypass physical missile and boulder distance penalties before range arithmetic.
  Nonheroes retain the modern distance formula and Long Range cap, while magical, thrown,
  breath, and gaze attacks retain their separate zero-penalty rule. MoM 1.31, CP 1.60, and
  CoM 6.08 behavior is unchanged.

- **F56 — modern independent gazes exclude Level.** CoM2 1.05.11 and Warlord 1.5.12.7
  Level processing now writes none of the independent Stoning, Death, or Doom Gaze fields or
  their trace changes. Conventional ranged, Thrown, Fire Breath, and Lightning Breath retain
  their level bonuses; MoM 1.31, CP 1.60, and CoM 6.08 gaze ladders are unchanged.

- **F58 — per-call modern Cause Fear breakdown.** CoM2 1.05.11 and Warlord
  1.5.12.7 now show separate normalized feared-figure distributions for Main or First Strike,
  Haste, and Counter melee calls. Each row follows the call's exact living source state, including
  immediate Life Steal/Bloodsucker healing and calls whose target was already killed, while zero
  source figures and Black Sleep show zero feared. MoM 1.31 retains its no-op/self-fear bug
  presentation; CP 1.60 and CoM 6.08 retain their shared Haste sample and combined row.

- **F32/F34 — modern Defense rolls and Bless Defense gate.** CoM2 1.05.11 and
  Warlord 1.5.12.7 now convolve ordinary To Defend for dice 1–15 with the shipped 30% cap
  for dice 16 onward; thresholds above 100% make the first fifteen dice certain while the capped
  dice remain 30%. Unit `ApplyAttack` channels pass spell ID 0 and receive no Bless Defense.
  Positive-ID Chaos/Death spells retain +5 CoM2 or +7 Warlord Defense before Armor Piercing,
  while Bless Resistance remains +5/+4 respectively. MoM 1.31, CP 1.60, and CoM 6.08 retain
  their ordinary single-binomial Defense rolls.

- **F30/F31 — modern Haste attack calls.** CoM2 1.05.11 and Warlord 1.5.12.7 now repeat
  each initiating Stoning, Death, and Doom Gaze under Haste while retaliation gazes remain
  single, and each Hasted melee `ApplyAttack` samples Cause Fear independently. The main,
  Haste, and counter block preserves its frozen pending-damage snapshot while immediate Life
  Steal and Bloodsucker healing follows call order and conditions later calls. MoM 1.31,
  CP 1.60, and CoM 6.08 retain their legacy Haste and fear behavior.

- **F29 — modern melee opening order.** CoM2 1.05.11 and Warlord 1.5.12.7 now deal
  Wall of Fire, each attacker and defender Stoning/Death/Doom Gaze, Lightning Breath, Fire
  Breath, and Thrown in compiled order before the melee block. Each boundary carries exact
  casualties and healing state forward; MoM 1.31, CP 1.60, and CoM 6.08 retain their legacy order.

- **D40 — modern Blur side review.** Independent raw-byte reviews confirmed that CoM2 1.05.11
  and Warlord 1.5.12.7 keep `CGADEnemy` fixed on the army opposing the active-side initiator
  throughout every displayed exchange. Card B's army Blur therefore affects initiating attacks,
  retaliation gazes, and Card B's own counterattack; Warlord's executing scripts do not override
  that flow. The durable array binding and active-side caller proof are recorded in
  [`Combat.ApplyAttack.R5.2c.evidence.md`](../Reference%20docs/Caster%20binary/Combat.ApplyAttack.R5.2c.evidence.md).

## 2026-08-14

- **F27/F28 — modern immediate drain and Warlord Bloodsucker.** CoM2 1.05.11 and
  Warlord 1.5.12.7 now preserve uncapped per-figure Life Steal rolls separately from
  target-capped damage and apply immediate `Combatheal` results through exact correlated attack
  paths. Warlord Bloodsucker finalizes once per `ApplyAttack` call after all routed result
  categories, using its independent runtime damage and healing values. Explicit modern damage
  categories and bonus-HP state round-trip through UI, saved/share state, swaps, and matrix cells;
  MoM 1.31, CP 1.60, CoM 6.08, and base CoM2 Bloodsucker behavior remain unchanged.

- **F25/F26 — modern ApplyAttack rider dispatch.** CoM2 1.05.11 and Warlord
  1.5.12.7 now exclude Poison, Stoning Touch, Death Touch, Life Steal, Exorcise, and
  Destruction from all three Gaze types. Eligible non-Gaze calls retain their routed riders,
  and Destruction makes one independent resistance attempt per surviving attacker figure with
  any failure destroying the target. MoM 1.31, CP 1.60, and CoM 6.08 remain unchanged.

- **F24 — modern army-global Blur.** CoM2 1.05.11 and Warlord 1.5.12.7 represent
  each army's Blur on its unit card: Card B is the tactical defender and supplies Blur for every
  eligible attack in the displayed exchange, including its counterattack; Card A's stored value
  becomes active after Swap. Retired strategic-side state migrates to the two card controls, and
  matrix workers use the same projection. Target Invisibility and source Illusion Immunity remain
  directional. MoM 1.31, CP 1.60, and CoM 6.08 retain target-unit Blur.

- **F23 — modern Cause Fear base-immunity gate.** CoM2 1.05.11 and Warlord
  1.5.12.7 now preserve intrinsic/base Death Immunity separately for Cause Fear's direct
  skip. Recalculation-only grants from Blood Lust, Animated, Rebuild, and Divine Protection
  still make the −3 roll, while Magic Immunity remains protective through effective Resistance
  100. MoM 1.31, CP 1.60, and CoM 6.08 behavior remains unchanged.

- **F21 — modern roster To Defend.** CoM2 1.05.11 and Warlord 1.5.12.7 roster
  generators now encode both `to_hit` and `to_block` as percentage-point deltas above 30%.
  The main cards and matrix rows load each unit's own value, including all 29 shipped
  non-default 20%, 40%, and 50% records; reporting tools still render absolute percentages.
  MoM 1.31, CP 1.60, and CoM 6.08 roster behavior remains unchanged.

- **City Walls exchange-role correction.** City-wall position now belongs to each unit card.
  Resolution grants its +1/+3 extra Defense only when that attack's target is inside and source
  is outside, including the reversed source/target on a counter-attack; army identity and card
  label are irrelevant. Modern and DOS resolution retain their distinct extra-Defense ordering,
  and DOS spell damage remains wall-independent. Old global saved state migrates to card B.

- **F19 — complete calculator-relevant modern transform inventory.** CoM2 1.05.11 and Warlord
  1.5.12.7 now expose and apply Dark Force, the Heavenly Light/Guardian-node package, all three
  Moon/Conjunction effects, Spell Ward, and the Guiding Beacon, Prayermaster, Divine Barrier,
  Soul Linker, and Leadership auras at their compiled positions. Heavenly Light's per-unit input
  follows defending-army membership independently of which unit initiates the exchange.
  Warlord 1.5.12.7 additionally
  preserves independent Military Workshop/Rocketry channels, gates permanent training on base
  identity, and applies those writes before Lightning Blade creates, overwrites, or converts
  Lightning Breath. Military Workshop is
  now source-bound, leaving 10 live provenance gaps. MoM 1.31, CP 1.60, and CoM 6.08 remain
  unchanged. Durable ordering and gate evidence lives in
  `Reference docs/Caster binary/CoM2 binary - unit recalculation.md`,
  `Units.RecalculateUnits.pas`, and Warlord 1.5.12.7 `CreateUnit.CAS`.
- **F18 — modern node aura reconstruction and correction.** Reconstructed the complete shared
  CoM2 1.05.11/Warlord 1.5.12.7 `@Units@applynodeaura` helper. It gates melee on persistent
  `BaseUnits.attack`, gates current conventional Ranged and both Breath fields independently,
  never writes Thrown or Gaze, and adds 2 Defense/Resistance unconditionally. The calculator now
  preserves both persistent-versus-live melee cases and leaves Thrown unchanged; focused checks
  cover the corrected channels. Method-4 review found no reconstruction error and exposed both
  corrected model mismatches. Durable coverage is in `Reference docs/Caster binary/F18.evidence.md`.
- **F17 — complete Warlord Vampirism channel transfer.** Warlord 1.5.12.7 now reads
  simultaneous Thrown, Fire Breath, and Lightning Breath strengths at Vampirism's exact
  post-Colossal region-`d` position, adds half their combined total to melee with one truncation,
  and independently resets every positive source channel to strength 1 before Shadow Strike.
  Conventional ranged remains unchanged. Focused regressions cover odd combined totals, all three
  resets, and Colossal/Vampirism/Shadow ordering; MoM 1.31, CP 1.60, CoM 6.08, and CoM2 1.05.11
  remain unchanged.
- **F15 — Holy Armor threshold ordering.** CoM2 1.05.11 and Warlord 1.5.12.7 now
  evaluate Holy Armor's `Defense > 5` branch at its exact region-`c` boundary: after the
  earlier item and unit-enchantment Defense writers, but before Orihalcon, Holy Weapon,
  globals, combat globals, auras, and curses. Later positive or negative Defense changes no
  longer flip its +2 Defense / +10% To Defend result; ordered traces and focused regressions
  cover both branch directions and the boundary's split attack-channel writes.
- **F14 — Misfortune aura ordering.** CoM2 1.05.11 Mislead and Warlord 1.5.12.7
  Liability now apply one atomic aura-type-10 write in region `e`, after the terminal clamps and
  before Supreme Light. Live non-Fantastic units lose 1 melee, Defense, and Resistance; only a
  persistent base Ranged slot also loses 1, so Focus Magic-created Ranged and independent Thrown,
  Breath, and Gaze channels remain untouched. An eligible zero stat can finish at −1. MoM 1.31,
  CP 1.60, and CoM 6.08 remain unchanged.
- **F13 — Upgraded Explosive source order.** Warlord 1.5.12.7 now doubles Fire Breath at
  its exact `UnitCalcPre.CAS` position, before later phase-`b` effects. The derived trace keeps
  the doubling attached to the Blackpowder-upgraded subtotal instead of folding later writes
  into it; focused derivation and browser regressions cover the ordering.
  MoM 1.31, CP 1.60, CoM 6.08, and CoM2 1.05.11 remain unchanged.

## 2026-08-13

- **F12 — ordered late unit transforms.** CoM2 1.05.11 and Warlord 1.5.12.7 now apply
  Chaos Channels, Destiny, level bonuses, and Focus Magic in compiled order. Focus uses the
  persistent base-channel gate while converting the live post-level channel, including the
  Marionette and Bombs & Grenades interactions, and retains independent modern attack channels.
  Warlord now applies Colossal Growth, represented Vampirism, and Shadow Strike in region-`d`
  order; MoM 1.31, CP 1.60, and CoM 6.08 behavior remains unchanged.
- **F9 — Warlord Marionette.** Wanderer now derives the Warlord 1.5.12.7 Channeler
  transformation from wizard skill, primary realm, all five book counts, Ascension, and
  Conjurer. The package covers live Fantastic identity, generated magical ranged, ordered stat
  and threshold grants, spell/charge metadata, Ascension attack flags, and the persistent strayed
  package including Transmute Equipment's latent Chaos ranged channel, Rebuild, and Charmed.
  The early Fantastic write now makes an Outlander-owned Wanderer eligible for
  Xenoveterinary. Controls are exact-version gated and round-trip through saved/share state;
  remaining retort-to-hero-template progression stays with F41.
- **F6 — DOS Chaos Channels shared attack slot.** MoM 1.31 now admits the Fire Breath
  result only for a base None/Thrown slot with signed strength at most 3; CP 1.60 and CoM 6.08
  use the patched ceiling of 0. Gaze and existing Breath types reject the result, so DOS no
  longer invents a second attack channel; admitted slots receive the exact 2/2/4 strengths.
  CoM2 1.05.11 and Warlord 1.5.12.7 retain independent channels and add Fire Breath 4 beside
  ranged, Thrown, Lightning Breath, and Gaze. Durable reconstruction evidence is in
  [`F6.evidence.md`](../Reference%20docs/DOS%20reconstructed/F6.evidence.md).
- **F5 — ordered chance transforms and modern two-stage clamp.** CoM2 1.05.11 and Warlord
  1.5.12.7 now carry common/channel To Hit and To Defend writes on the source-ordered unit record.
  Region `e` clamps common To Hit to 10–100 before normalizing each channel against it: a common
  −50 modifier plus a +10 ranged-channel modifier now resolves as 10% melee and 20% ranged, not
  10% for both. Modern signed To Defend remains unclamped in recalculation and is naturally bounded
  by the defense-roll probability; MoM 1.31, CP 1.60 and CoM 6.08 retain their legacy final-threshold
  clamps. Source-position fixes also removed late chance replays and Vertigo duplication and made
  Energy Cannon snapshot its live pre-clamp threshold. The audit now reports 223 `VERIFIED` and 13
  `UNVERIFIED` formulas.
- **R9-G1a — identity and creation-grant provenance.** Closed the five live identity gaps for
  CoM 6.08, CoM2 1.05.11 and Warlord 1.5.12.7 plus both Warlord Lava Smelter elemental-grant
  gaps against the completed constructor/summon reconstructions, shipped spell rows, creation and
  retraining scripts, resolution consumers and runtime constants. Corrected CoM 1's summon branch:
  previously only an unsupported template whitelist became Fantastic, with every entry except
  Centaurs forced to Life; now every successful combat summon becomes Fantastic, only Paladins
  become Life, only Centaurs and Catapult become Nature, and other types retain their loaded race.
  The audit now reports 227
  `VERIFIED` and 15 `UNVERIFIED` formulas.
- **R9-G1g — Supernatural direct helper.** CoM 6.08 now imports and displays the 11 roster
  templates carrying attack-attribute `$2000`, despite its misleading Tweaker-export label, but
  gives Supernatural no combat effect: D39 proves its resolver test is inactive and the live floor
  belongs to Destruction `$0020`. CoM2 1.05.11 and Warlord 1.5.12.7 retain their shipped `0`/`34`
  ties-to-even minimum-damage formula. The provenance audit now reports 220 `VERIFIED` and 22
  `UNVERIFIED` formulas; durable legacy evidence is in
  [`D39.evidence.md`](../Reference%20docs/DOS%20reconstructed/D39.evidence.md).
- **D39 — reconstruct the CoM 6.08 standard attack resolver.** Completed and independently
  reviewed the parent `[0x99292,0x999C9)`, resolver `[0x999C9,0x9A587)`, adjacent defense
  producer `[0x9A587,0x9A79E)`, BP-sharing helpers, all callers, loops, reductions, output routing,
  and required dependencies. Confirmed the only live `(hits - 5) >> 1` first-reduction floor is
  Destruction `$0020`; the Supernatural `$2000` test is dead, and the residual reduction has no
  floor call. Durable findings are in
  [`D39.evidence.md`](../Reference%20docs/DOS%20reconstructed/D39.evidence.md). Calculator behavior
  is unchanged; R9-G1g is now unblocked and owns the separate helper decision.
- **D38 — locate the CoM 6.08 Supernatural minimum-damage consumer.** Proved the frozen
  `WIZARDS.EXE` has no executing binding from binary-named Supernatural `$2000` to the documented
  `(damage-5)/2` floor. The only live formula path is gated by binary-named Destruction `$0020`,
  applies only on the first per-strike reduction below an adjusted defense threshold, and is absent
  from the residual-damage reduction. Bounded the complete standard resolver at
  `[0x999C9,0x9A587)` with all direct callers and exits; D39 owns its fixed-extent reconstruction.
  Durable findings are in
  [`D38.evidence.md`](../Reference%20docs/DOS%20reconstructed/D38.evidence.md). Calculator behavior
  is unchanged; R9-G1g remains blocked by D39.

## 2026-08-12

- **R9-G1g second pass — four direct helpers closed.** Bound Magic, Mithril, and Adamantium
  weapon bonuses plus the legacy identity-conversion helper across their applicable MoM 1.31,
  CP 1.60, CoM 6.08, CoM2 1.05.11, and Warlord 1.5.12.7 sources. Corrected Warlord's
  Fiery Fury/Sanctify/compiled-conversion order and preserved Sanctify's Life-race write for
  heroes. The user's CoM2 1.4.2 changelog pointer, corroborated by CoM 6.08 helptext, required
  retaining the legacy Supernatural floor; D34 disproves only the proposed executable binding,
  so that final helper remains under R9-G1g behind D39. The audit now reports 219 `VERIFIED` and
  23 `UNVERIFIED` formulas.
- **D36 — reconstruct modern Raise Dead.** Reconstructed the shared CoM2/Warlord
  `$005CD1FF..$005CD372` Raise Dead case and complete `$0064435C..$00644377` Castercore
  wrapper. The engine clears revival/status state, sets combat No Heal, restores position and
  movement, recalculates, stores checked half-total-HP damage, publishes the target ID, and
  recalculates again. Warlord's script adds disjoint combat-wide living-unit recounts; D36 does
  not assert the hook's exact order. Durable source and coverage are in
  [`D36.evidence.md`](../Reference%20docs/Caster%20binary/D36.evidence.md). Calculator behavior is
  unchanged; the modern Raise Dead prerequisite for R9-G1g is complete.
- **R9-G1j — derived-package provenance.** Bound all 13 unit/ability-package formulas from
  `undeadImmunityDerivation` through `bloodLustMeleeAttack` to the applicable DOS, shared
  `Caster.exe`, and Warlord-script implementations; the audit now reports 214 `VERIFIED` and
  28 `UNVERIFIED`. Corrected Warlord strike-effect order, Fiery Fury and Angelic Guardians
  base-Fantastic gates, Angelic Guardians' existing-Exorcise branch, and Blood Lust targeting;
  focused regressions and the durable behavior contract are in `data.js` and `SPEC.md`.
- **D35 — reconstruct CoM 6.08 Raise Dead.** Reconstructed the complete
  `[0xAB04D,0xAB474)` routine and `[0x82ED0,0x82EEA)` dispatcher. Raise Dead halves the
  restored figures/front damage, clears combat effects, both combat and persistent enchantment
  dwords, and movement-recalculation flags `$0800|$1000`, then writes the inline unaligned
  Fantastic identity and `Grey_Hits = -1` cache sentinel before rebuilding the battle unit.
  Durable findings and coverage are in
  [`D35.evidence.md`](../Reference%20docs/DOS%20reconstructed/D35.evidence.md). Calculator behavior
  is unchanged; D36 supplies the corresponding modern prerequisite for R9-G1g.
- **D34 — falsify the CoM 6.08 Supernatural damage-floor binding.** Proved common attack mask
  `$2000` is Supernatural and `$0020` is Destruction; the existing signed `(hits - 5) >> 1`
  helper is a branch-specific Destruction floor suppressed by defense-special scores `>=80`.
  The supplied `Attribs_2` anchor instead projects `$4000`, lowers to-block by one, and ensures
  minimum weapon quality. The only direct functional Supernatural consumer found is inside newly
  bounded `[0x9BCE0,0x9D535)`, now owned by D37. Durable findings are in
  [`D34.evidence.md`](../Reference%20docs/DOS%20reconstructed/D34.evidence.md). Calculator behavior
  is unchanged; R9-G1g owns removal or replacement of the unverified CoM formula.
- **D30_D31_D32 — locate Supernatural and Raise Dead prerequisites.** Corrected the two DOS
  rows from non-implementation `MAGIC.EXE` to CoM 6.08 `WIZARDS.EXE`. D30 found an already
  reconstructed minimum-damage candidate but left the Supernatural-to-`$0020` binding unproved;
  D31 bounded the DOS Raise Dead routine and its inline unaligned identity writes; D32 bounded the
  modern Raise Dead case, wrapper, `EncNoHeal` producer, and existing recomputation consumer.
  Durable results are indexed by
  [`D30_D31_D32.evidence.md`](../Reference%20docs/DOS%20reconstructed/D30_D31_D32.evidence.md);
  D34–D36 own the corrected follow-up work. Calculator behavior is unchanged.
- **D33 — reconstruct `ApplyMagicWeapons`.** Reconstructed the complete shared CoM2/Warlord
  `$00598D88..$005992CC` helper: base material gates, other-owner King-of-Underworld suppression,
  Magic/Mithril/Adamantium tiers 0/1/2, channel-specific strength and runtime To-Hit writes,
  checked display-bonus arithmetic, both callers and Warlord composition. Durable source and
  coverage are in [`D33.evidence.md`](../Reference%20docs/Caster%20binary/D33.evidence.md).
  Calculator behavior is unchanged; the result supplies R9-G1g's modern weapon prerequisite.
- **R9-G1g existing-evidence pass.** Bound eight direct formulas across their applicable DOS,
  CoM2 and Warlord builds, and removed the aggregate weapon dispatch plus two calculator-only
  unit-type projections from the source-formula inventory. Corrected modern Supreme Light so
  live or base magical ranged, either Life identity, or nonzero mana independently satisfies its
  compiled eligibility gate. The audit now reports 201 `VERIFIED` and 41 `UNVERIFIED` formulas.
  The five remaining R9-G1g gaps were isolated to four reconstruction domains; D33 now supplies
  the modern material domain, while D34–D36 own the remaining Supernatural and Raise Dead scopes.
- **D29 — locate `ApplyMagicWeapons`.** Corrected the supplied interior anchor to the exact shared
  CoM2/Warlord extent `$00598D88..$005992CC`, proved its two direct callers and sole normal return,
  and moved the now-fixed semantic reconstruction into D33. Durable boundary and dependency
  evidence is in [`D29.evidence.md`](../Reference%20docs/Caster%20binary/D29.evidence.md).

## 2026-08-11

- **R9-G1i — DOS Wall of Fire strength provenance.** Bound the inherited MoM 1.31 and
  CP 1.60 Wall of Fire strength to the zero-override spell path and D22's source-shaped
  Fireball record. Both calculator versions remain at strength 5; behavior is unchanged and
  the audit now reports 193 `VERIFIED` and 52 `UNVERIFIED` formulas.
- **R9-G1k — resolution-stat and combat-context provenance.** Bound seven source-authored
  formulas across all applicable DOS, CoM2 and Warlord versions, and removed the aggregate
  `normalizeCombatUnit` orchestration marker from the formula inventory without performing M7's
  helper retirement. Corrected modern Defense to avoid a second Vertigo subtraction and corrected
  DOS Elemental Armor/Resist Elements overlap rules for Defense and Resistance. Focused
  regressions cover the corrected behavior; the audit now reports 192 `VERIFIED` and 53
  `UNVERIFIED` formulas.
- **D22 — DOS Fireball spell-table record.** Materialized the complete MoM 1.31/CP 1.60
  36-byte Fireball record in `Reference docs/DOS reconstructed/spelldat.c` with byte coverage in
  `D22.evidence.md`. Both builds load unsigned strength 5 from `+0x20`; the sole record difference
  is `AI_Group` at `+0x13`. Calculator behavior is unchanged and R9-G1i is unblocked. Method-4
  review also corrected a CP-only incoming Wall call; [D28](#2026-08-21) later reconstructed its
  out-of-scope movement trigger.
- **R9-G1i existing-evidence pass.** Bound seven of the eight effective-attack, defense and
  damage-constant formulas across their applicable calculator versions, reducing the live audit
  to 61 `UNVERIFIED` formulas without changing calculator behavior. The remaining DOS Wall of
  Fire strength binding needs D22's source-shaped `SPELLDAT.LBX` record before R9-G1i can close.
- **R9-G1h — ability-stat provenance.** Bound all 20 formulas from `holyBonus` through
  `disheartenProphecy` across MoM 1.31, CP 1.60, CoM 6.08, CoM2 1.05.11 and Warlord 1.5.12.7,
  reducing the live audit to 68 `UNVERIFIED` formulas. Corrected modern Animated and Black Prayer
  leaking into independent Gaze fields, modern Tactician hero bonuses leaking into Thrown/Breath/
  Gaze, Breakthrough's normal-package Defense from +1 to the configured 0, and Metal Fires on
  Fantastic units, including its secondary-channel and weapon-upgrade paths. The review also
  restored Spirit Link's permanent +2 Resistance write to the base phase. Focused regressions
  cover every corrected channel and eligibility boundary.
- **R9-G1f — level-dispatch provenance.** Bound the version dispatch and all fifteen normal-unit
  ladder formulas across the five supported builds to the reconstructed DOS gates and HP
  thresholds, reconstructed Caster consumer, and current CoM2/Warlord tables. Existing calculated
  bonuses remain unchanged; the audit now reports 158 `VERIFIED` and 88 `UNVERIFIED` formulas.
- **R9-G1e existing-evidence pass.** Bound 24 of the 27 chance-contribution and projection
  formulas to exact DOS, Caster, Warlord-script and runtime-table sources, with no calculator
  behavior change. Corrected overbroad version metadata for seven Warlord-only formulas. The
  remaining modern material helper was routed to R9-G1g and the two-stage clamp to F5, both now
  closed above; the audit then reported 142 `VERIFIED` and 104 `UNVERIFIED` formulas.
- **R9-G1d — late/global and figure-transform provenance.** Closed ten formulas against their
  strongest implementation sources and retired the erroneous Warlord-only Focus Magic duplicate,
  reducing the live audit to 118 `VERIFIED` and 128 `UNVERIFIED`. Corrected Focus Magic ordering,
  Chaos Surge and Darkness channel gates, Eternal Night's modern Life/Death asymmetry, signed
  modern Warp Attack division, Warlord Beat of Swiftness rounding/gating, and both figure-count
  transforms. Focused regressions and the full calculator suite cover the corrected behavior.
- **A32 — DOS Shatter eligibility.** Reconstructed human admission, AI selection, the generic
  effect setter, and recompute consumer for MoM 1.31, CP 1.60, and CoM 1. All three admit normal
  units and heroes but reject Fantastic units; existing calculator behavior is correct. The
  method-4 proof is `Reference docs/DOS reconstructed/A32.evidence.md`.
- **B4/B5/B6 — DOS rollover and Defense.** Verified one cohesive three-build package:
  conventional and non-Area excess receives fresh Defense and Invulnerability −2 at each figure;
  Area attacks are independently capped per figure; Armor Piercing is signed `/2` truncated toward
  zero; and Immolation uses Fireball's non-AP flags. Existing calculator outcomes were correct;
  DOS halving now expresses the exact arithmetic. The reviewed proof is
  `Reference docs/DOS reconstructed/B4_B5_B6.evidence.md`.
- **B9 — DOS `Create_Unit`.** Reconstructed overlay 121 entry 0 for MoM 1.31, CP 1.60 and CoM 1.
  Every unit instance starts with `mutations = 0`; the complete constructor write set cannot add
  `UM_UNDEAD`, so natural Death creatures do not receive Dispel Evil's created-undead-only extra
  penalty. Existing calculator behavior is correct. Merged source and evidence are in
  `Reference docs/DOS reconstructed/unitcalc.c` and `B9.evidence.md`.
- **D2 — modern Weapon Immunity eligibility.** Replaced the weapon/type proxy with the exact
  calculated `EncMagic or magicranged` rule. Corrected Spirit Link and Blazing March bypasses,
  King/Ruler's material-only suppression, and Wall of Fire ordering; added exhaustive represented
  source and attack-class regressions. Method-3 review found and corrected the ordering defect.

## 2026-08-10

- **D21 — modern level-bonus helper.** Reconstructed `@Units@ApplyLevelBonus` completely and
  bound its CoM2/Warlord runtime tables. The 21 writes omit Death, Stoning and Doom Gaze; the
  loader also feeds the normal To Defend slot from `[Hero]ToDefend`. Independent Claude/Codex
  derivations and reciprocal review left no disagreement. Durable source and coverage are in
  `Reference docs/Caster binary/Units.RecalculateUnits.pas` and `D21.evidence.md`; F56 owns the
  newly confirmed calculator mismatch.
- **B7 — DOS touch record routing.** Verified that common flags reach every admitted call, while
  melee records remain melee-only and one ranged record feeds ordinary ranged, Thrown, both
  Breaths and every Gaze. Corrected all-rider record routing, channel-carried Stoning −1 and Death
  −3 modifiers, and CP/CoM zero-strength dispatch. Cross-version and roster regressions confirm
  Chaos Spawn's common Poison 4 accompanies Multiple Gaze, resolving Q4; modern exclusion remains
  tracked by F25. The reviewed mapping lives in `Reference docs/Touch attack trigger matrix.md`.
- **D18 — Warlord touch-flag placement.** Replaced the blanket ranged exclusion with internal
  general/melee/ranged records: innate/card Stoning and Death Touch are general, Focus Magic moves
  them to melee/Thrown, and Revenant overwrites Death Touch with melee/Thrown value 0. Corrected
  tooltips and regressions, recorded the manual/helptext conflict, and retained B7 for the distinct
  DOS record/roster comparison. Method-3 review fixed created modern-channel touch delivery.
- **R9-G1c evidence/revision pass.** Bound 20 of the 29 formulas from `stat:base` through
  `giantStrength:thrown`; the nine unsupported ordering/channel claims remain live in
  `BACKLOG.md`. Corrected the executing Warlord recruitment writes for Ludus Agoge, Mother
  Fungus, Pillar of Faith and Natural Selection. Charm of Life now reads live HP after
  Endurance, Lionheart and every earlier HP writer, closing F16. Earlier Warlord gates now
  retain base recruitment identity and their pre-Focus attack types. The live audit is 139
  `UNVERIFIED` formulas.
- **R9-G1b — base/permanent-transform provenance.** Bound Destiny, Chaos Channels Fire Breath,
  Lightning Blade, Focus Magic, Vampirism, and Shadow Strike to reviewed implementation excerpts.
  Corrected modern low-strength Focus Magic, Warlord Vampirism transfer, and Lightning Blade's
  `Thrown + 1` write. The live audit fell to 159 `UNVERIFIED` formulas; F12 and F17 retain their
  wider scopes.
- **F7, F22, F52, F54, F55, M6.** Implemented modern Supernatural rounding, modern Blood Lust on
  Thrown, all reconstructed Supreme Light paths, base-CoM2-only spell-result identity rewrites,
  and independent Lava Smelter grants with legacy-state migration. Method-3 review caught the
  migration, a weak Fire Breath regression, and stale provenance wording. Final checks passed.

## 2026-08-09

- **R9-G1a-R3 — CoM 1 Zombies table binding.** Bound the type `0xAE` ability record and constructor
  copy in `Reference docs/DOS reconstructed/unitcalc.c`; merged evidence is
  `R9-G1a-R3.evidence.md`.
- **R9-G1a-R2 — `CombatSummonUnit`.** Reconstructed the full CoM2 routine in
  `Reference docs/Caster binary/Spells.CombatSummonUnit.pas`; merged evidence is
  `R9-G1a-R2.evidence.md`.
- **R9-G1a-R1 — DOS battle-unit load.** Reconstructed all three DOS builds in
  `Reference docs/DOS reconstructed/combat.c`; merged evidence is `R9-G1a-R1.evidence.md`.
- **R9-G1a existing-evidence pass.** Promoted modern Combat Summoned and Chosen identity plus
  three Lava Smelter grants. Eight gaps remained for dedicated reconstruction or other owners.
- **R9 — enforceable formula provenance.** Added adjacent formula classifications, reviewed source
  anchors, runtime-table binding, and automated completeness checks. Initial result: 247 formulas,
  77 `VERIFIED`, 170 explicit gaps; later R9-G1 work updates the live totals.

## 2026-08-08

- **R7.4 — modifier tooltips.** Exposed ordered calculated-stat traces through hover/touch UI and
  fixed stale overlays; see `SPEC.md`, UI contract.
- **R7.3 — ordered calculated-stat traces.** Made the calculation path emit source-labelled running
  values for every displayed output; fixed permanent-write attribution.
- **R8.1–R8.4 — identity lifecycle.** Added version-scoped source identity, independent editable
  base controls, ordered live conversions, and v2 persistence/share/swap/Matrix migration. Roster
  units reconstruct authoritative source IDs; Custom units retain null IDs.
- **Persistence resilience cleanup.** Hardened corrupt and legacy state fixtures.
- **R6.5b–R6.5d — DOS combat reconstruction.** Completed attack preparation, touch/special rider,
  and damage-application extents across MoM 1.31, CP 1.60, and CoM 1. Owning bodies and per-item
  evidence are under `Reference docs/DOS reconstructed/`.

## 2026-08-07

- **R6.2a–R6.2f, R6.3, R6.5a.** Reconstructed the DOS conventional attack, defense specials,
  resistance helpers, combat dispatch, and related natural extents for all three builds.
- **R6.4.** Hardened the DOS derivation checker and reverified the corpus.
- Completed rows left the backlog; address coverage, build differences, and findings remain in the
  corresponding `R6.*.evidence.md` files and C sources.

## 2026-08-05 to 2026-08-06

- **R6.1a–R6.1h.** Reconstructed DOS battle-unit creation and recalculation: enchantments, base
  stats, experience, movement, hero items/templates, item powers, and hit-point writes. The merged
  `unitcalc.c` and item-scoped evidence are authoritative.

## 2026-08-02 to 2026-08-04

- **R5.1, R5.2a–R5.2m, R5.C, R5.G.** Completed and reviewed the modern Caster reconstruction
  corpus. A reciprocal review corrected `DamageSpell`'s repeated spill loop. The artifact index is
  `Reference docs/Caster binary/README.md`.
- **R3/R4.** Split modern binary analysis by subsystem, preserved independent modern attack
  channels, and reshaped the version-specific conventional attack card and derivation paths.
- **R6.0/R9 checker work.** Added DOS verification and fixed the Delphi ledger gap-hiding bug.
- **R8 shared DOS special byte.** Replaced fabricated per-ability magnitudes with the shared
  `Spec_Att_Attrib` value and consumer flags; fixed gaze realm/strength shaping and roster wiring.
- **F44–F48.** Fixed DOS Illusion and Resistance-to-All token wiring, added roster regressions, and
  removed the fabricated modern Chaos Channels overwrite/stacking split.

## 2026-07-26 to 2026-07-29

- Established the ordered stat-derivation and combat-resolution sequences (**R1/R2**) and fixed the
  defects exposed by them. Canonical order is in `SPEC.md`; evidence is in the engine analyses.
- Swept Warlord scripts and CoM2 runtime tables, moved loaded constants to their owning data-table
  document, and separated live work from evidence.
- Early executable verification settled foundational roll, immunity, spill, and sequencing claims
  later absorbed into the reconstruction corpora.

## Closed mechanic questions

| ID | Result | Durable home |
|---|---|---|
| Q7 | Supreme Light reads live Resistance at its engine position. | DOS and modern recalculation analyses |
| Q9 | CoM2/Warlord may carry Doom Gaze and ranged simultaneously. | modern combat-flow and recalculation analyses |
| Q10 | Destiny does not remove later weapon-material bonuses. | modern recalculation analysis |
| Q13 | Modern Land Link adds +2 to each positive breath field for current Fantastic units. | modern recalculation analysis |
| Q14 | Modern Defense dice use capped To Defend. | data tables; `Combat.ResolutionHelpers.R5.2e.evidence.md` |
| Q22 | CoM 1 implements no Inner Fire +1 hero-item attack. | MoM binary analysis; R6.1g evidence |
| Q11 | DOS Animate Dead/Black Channels grants +1 ranged when a ranged type exists. | R6.1a evidence |

## Accepted modelling decisions

Canonical descriptions are in `SPEC.md`, Known modelling limitations.

- **M7:** ammunition is outside the one-engagement model.
- **M8:** between-turn regeneration is outside the one-engagement model.
