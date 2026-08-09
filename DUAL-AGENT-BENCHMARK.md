# Dual-agent implementation benchmark

This file is an append-only ledger for comparing independent implementation agents over
multiple calculator tasks. Keep one task record per benchmarked task and preserve the raw
timestamps, commit hashes, review findings, and verification results so later comparisons do
not depend on memory or prose summaries.

## Measurement conventions

- Timestamps use ISO 8601 with the local offset active when the task ran.
- `Initial duration` covers the agent's independent implementation from its recorded start to
  its initial commit.
- `Review duration` covers the reciprocal review itself. If a review start was not separately
  recorded, say so explicitly and give the measurable interval used instead of inventing a
  timestamp.
- `Revision duration` covers the review-driven revision from review handoff to the revision
  commit.
- `Active total` is initial implementation plus review plus revision. It excludes time spent
  waiting for the other agent or for external tool results.
- Model names and reasoning efforts are recorded exactly as configured for the run.
- Dual-agent implementation is run only when the user requests it or the backlog item records that
  preference. New runs use GPT-5.6 Sol at High for the orchestrating main agent and for both
  independent implementation/review subagents. Historical records preserve their actual
  configurations.
- The orchestrator is not a third implementation competitor. Its coordination, integration and
  final-verification timing is recorded separately from the two subagent implementation totals.
- A task's `initial winner` is a comparison of the two initial implementations only. The
  `integration choice` may differ after reciprocal review.
- Each implementation subagent must supply its own timing block; the main agent must copy both
  subagent blocks and its own coordination block into this ledger.
  Missing events are recorded as `not recorded`, never inferred from commit times.
- Each task record must also include the assigned server ports, server PIDs, server start/stop
  events, and post-test free-port checks. Parallel worktrees must not share a server or opt into
  `PLAYWRIGHT_REUSE_EXISTING=1`.

## Task R8.1 — Internal unit identity records

### Run metadata

| Field | Value |
|---|---|
| Task | R8.1 — internal unit identity records |
| Date | 2026-08-08 |
| Time zone | Europe/Copenhagen (`+02:00`) |
| Frozen base | `110be609ba3eaaba2492feb6da0f5ffd7b866c18` |
| Integration branch | `codex/R8.1-integration` |
| Final integration commit | `6d822154ce35cf8f5087bbe6d6f0d437c010f77f` |
| Final integration commit time | `2026-08-08T16:32:02+02:00` |
| Initial winner | Sol — stronger direct integration base |
| Integration choice | Sol revised core plus Luna-derived focused identity coverage |

### Agent timings and commits

The Luna review start was not separately timestamped. Its review duration below is measured from
the point both initial commits were available (`16:00:48`) to the recorded review completion
marker (`16:02:59.805`). Luna's revision starts at the Sol review handoff timestamp.

| Agent / nickname | Model | Reasoning effort | Stage | Start | End / commit | Duration | Commit |
|---|---|---|---|---|---|---:|---|
| Luna | GPT-5.6 Luna | Max | Initial implementation | `2026-08-08T15:39:49.8566991+02:00` | `2026-08-08T16:00:48+02:00` | ~20m58s | `d466551b0af0d5b19d3e49aa3f564bbda40752e9` |
| Luna | GPT-5.6 Luna | Max | Reciprocal review of Sol | `not separately recorded; measured from 16:00:48` | `2026-08-08T16:02:59.8049821+02:00` | ~2m12s | — |
| Luna | GPT-5.6 Luna | Max | Review-driven revision | `2026-08-08T16:04:12.7092632+02:00` | `2026-08-08T16:17:46+02:00` | ~13m33s | `25553a05828cd0d8795f61012f06b5eaec6864` |
| Luna | GPT-5.6 Luna | Max | Active total | — | — | ~36m43s | — |
| Sol / Parfit | GPT-5.6 Sol | High | Initial implementation | `2026-08-08T15:39:50.379+02:00` | `2026-08-08T15:57:39+02:00` | ~17m49s | `65ea3e29633eebdd85165eccf4a03bfa07432944` |
| Sol / Parfit | GPT-5.6 Sol | High | Reciprocal review of Luna | `2026-08-08T16:01:28.427+02:00` | `2026-08-08T16:04:12.7092632+02:00` | ~2m44s | — |
| Sol / Parfit | GPT-5.6 Sol | High | Review-driven revision | `2026-08-08T16:04:12.7092632+02:00` | `2026-08-08T16:10:40.8721598+02:00` | ~6m28s | `b80a57618b596e02a7be680b48b1aff98f3caa16` |
| Sol / Parfit | GPT-5.6 Sol | High | Active total | — | — | ~27m01s | — |

### Initial implementation comparison

| Dimension | Luna initial | Sol initial | Benchmark conclusion |
|---|---|---|---|
| Identity shape | Nested identity object with source and calculated fields | Flat source fields on roster records plus an explicit versioned internal identity | Sol aligned more directly with existing generated roster records and version-scoped IDs |
| Derivation boundary | Fresh calculated identity per derivation, including modern child derivations | Fresh calculated identity per derivation, including version, source fields, and live fields | Both covered the core boundary; Sol made version provenance more explicit |
| UI and matrix propagation | Strong propagation through roster, card, read, and matrix paths | Strong propagation through roster, card, read, matrix, and custom synchronization paths | Both were materially useful |
| Generator evidence | Generator output carried identity; later revision added stronger source coverage checks | Initial implementation already included source-to-output identity verification | Sol had the stronger initial evidence surface |
| Persistence scope | Initial version changed persistence to a richer identity schema | Kept the existing v1 `{race, name}` boundary | Sol respected the R8.4 migration boundary |
| Focused browser coverage | Added a dedicated identity test | Expanded roster smoke and preset ownership checks | Luna's focused test was retained in adapted form for integration |

Initial winner: Sol. The deciding factors were explicit version provenance, exact source-to-output
generator checks, and keeping persistence migration out of R8.1. Luna's clearer fresh-identity
model and focused test remained valuable integration material.

### Reciprocal review findings and dispositions

#### Sol's review of Luna

1. **P1 — custom Fantastic realm was lost.** Luna's initial custom record always used a null base
   race, even when the existing control selected `fantastic_chaos` or another realm. Luna's
   revision parses the realm from the current control and verifies both base and live identity.
2. **P2 — persistence migration was premature.** Luna's initial implementation serialized rich
   identity fields before R8.4. Luna's revision restored the v1 `{race, name}` boundary and moved
   rich identity migration back to R8.4.
3. **Test gaps.** Sol noted missing recursive child-derivation, exact all-record mapping,
   version-switch, and exhaustive derived-flag assertions. The final integration uses Sol's
   source checks and roster assertions and adds Luna's focused identity test; the remaining
   version-switch/special-unit cases belong to R8.2-R8.4.

This was the most consequential review because it caught both a functional custom-identity defect
and a scope/compatibility violation.

#### Luna's review of Sol

1. **P1 — custom identity could become stale after a combined type change.** Sol added a change
   listener that synchronizes custom Hero, Fantastic, and realm fields.
2. **P2 — preset synthetic identity could overwrite a roster record.** Sol gated synthetic preset
   identity application on the side still being Custom.
3. **P2 — DOS Fantastic detection assumed one source column.** Sol changed the parser to build
   the canonical source-token stream across Attributes, Abilities, Immunities, and Attacks.

All three findings were applied in Sol's revision and covered by focused assertions or generator
checks.

### Revised implementation comparison and integration decision

Sol's revised implementation was the strongest revised core: it resolved all three incoming
findings while retaining explicit version/source identity and the v1 persistence boundary. Luna's
revised implementation correctly resolved both incoming findings and passed its focused suite, but
the final branch kept one identity representation rather than merging Luna's nested model with
Sol's flat source records. Luna's focused browser test was adapted to the final model and added as
`tests/identity.spec.js`.

The integration sequence was:

1. Create `codex/R8.1-integration` from the frozen base.
2. Cherry-pick Sol's initial commit `65ea3e29633eebdd85165eccf4a03bfa07432944`.
3. Cherry-pick Sol's revision `b80a57618b596e02a7be680b48b1aff98f3caa16`.
4. Add the adapted focused identity test and update the specification, backlog, and history.
5. Commit the integration as `6d822154ce35cf8f5087bbe6d6f0d437c010f77f`.

### Verification evidence

- Modern generator regeneration: CoM2 194 units; Warlord 344 units.
- Reviewed DOS generator results: CoM 192 units; MoM 1.31 184 units; MoM CP 1.60 184 units.
- Node identity/derivation checks: `9,474/9,474` passed.
- Browser preset runner: `929/929` passed.
- Full Playwright suite: `35/35` passed.
- JavaScript syntax checks for `Calculator/stats.js` and `Calculator/ui.js`: passed.
- Python syntax checks for the modified generators: passed.
- `git diff --check`: passed.
- Standalone state harness in the original R8.1 run: `33/36` passed. Three existing resilience
  cases remained tied to a malformed `cityWalls` crash precondition that no longer reproduced;
  ordinary localStorage, share-link, roster, preset, and Playwright persistence checks passed.

### Post-run fixture maintenance

On 2026-08-08, the three obsolete resilience fixtures in `tools/state_persistence_check.js` were
replaced with a deterministic malformed v1 state: a Custom Warlord Gnoll whose non-string identity
name reaches the Altar of the Moon unit-name suffix operation. The corrected fixture exercises the
real `applyState` failure, localStorage recovery/discard, and bad-share-link fallback, including a
non-vacuous distinction from the recipient's saved state. The standalone state harness now passes
`36/36`. The original `33/36` result above is retained as the raw R8.1 benchmark measurement; this
maintenance changes test setup only and does not change calculator behavior.

### Cleanup and repository state

- Temporary worktrees removed: `C:\CoM2-damage-calculator-R8.1-luna` and
  `C:\CoM2-damage-calculator-R8.1-sol`.
- Temporary branches removed: `codex/R8.1-luna` and `codex/R8.1-sol`.
- Sol / Parfit agent closed after review and revision.
- Final branch: `codex/R8.1-integration`.
- Final worktree clean.
- Nothing pushed.

## Task R8.2 -- Independent identity controls (retrospective partial record)

This entry was added after the run because the original execution recorded commit endpoints but
did not require each agent to return a timing block. Missing values remain explicit; commit gaps
are not relabeled as active runtime.

### Run metadata

| Field | Value |
|---|---|
| Task | R8.2 -- independent identity controls |
| Date | 2026-08-08 |
| Time zone | Europe/Copenhagen (`+02:00`) |
| Frozen base | `becc9144968302841ef62ad282cd55e3cd8ae113` |
| Integration branch | `codex/R8.1-integration` |
| Final integration commit | `5fdea7ba125ecb5e43d7419a6806e5056a0965fd` |
| Server ports | Both implementation worktrees used the shared default 8080; conflict risk confirmed |
| Initial winner | Not formally recorded |
| Integration choice | Luna revised implementation (`0eec729`) after reciprocal review |

### Available timing evidence

| Agent | Stage | Start | End / commit | Active duration | Waiting duration | Evidence |
|---|---|---|---|---:|---:|---|
| Luna | Initial implementation | `2026-08-08T17:02:35.4848401+02:00` | `2026-08-08T17:25:32+02:00` / `141eaff` | `1376.5s` (~22m56.5s) | Not separated | Recorded dispatch and commit |
| Sol / Kepler | Initial implementation | Not recorded | `2026-08-08T17:24:40+02:00` / `73ab18d` | Not recorded | Not recorded | Commit endpoint only |
| Luna | Reciprocal review | Not recorded | Not recorded | Not recorded | Not recorded | Review artifact was later removed |
| Sol / Kepler | Reciprocal review | Not recorded | Not recorded | Not recorded | Not recorded | Review artifact was later removed |
| Luna | Review-driven revision | Not recorded | `2026-08-08T17:47:58+02:00` / `0eec729` | Not recorded | Not recorded | Measurable cold-commit-to-revision interval: 1346s, not active runtime |
| Sol / Kepler | Review-driven revision | Not recorded | `2026-08-08T17:47:14+02:00` / `989f2e0` | Not recorded | Not recorded | Measurable cold-commit-to-revision interval: 1354s, not active runtime |

The run's retained verification results were: Luna final Playwright 38/38, Sol revised Playwright
39/39, both 929/929 browser preset checks and 9,474/9,474 Node assertions. Sol's revised suite
reported 1m36.1s for Playwright, 15.1s for the browser preset harness, 11.1s for focused identity
tests and 0.18s for Node checks. Luna's exact per-suite durations were not retained.

## Task R8.3 -- Ordered identity conversions

### Run metadata

| Field | Value |
|---|---|
| Task | R8.3 -- ordered identity conversions |
| Date | 2026-08-08 |
| Time zone | Europe/Copenhagen (`+02:00`) |
| Frozen base | `6458808da9030bcefdbc85101ec33176b4c8260b` |
| Integration branch | `codex/R8.1-integration` |
| Final integration commit | `4545b4859252ba792ba241bb330bc5510690a85e` |
| Final integration commit time | `2026-08-08T19:00:11+02:00` |
| Implementation ports | Primary `8080`; Luna `8081`; Sol `8082` |
| Server PIDs | Not recorded |
| Explicit server start/stop events | Not recorded; Playwright-managed server lifecycle was used |
| Post-test free-port checks | Sol port `8082` was confirmed free before and after testing; primary and Luna post-test timestamps not recorded |
| Initial winner | No single formal winner recorded; split result described below |
| Integration choice | Luna-derived integrated implementation, retaining its browser/UI coverage and source-faithful final behavior, with Sol's reciprocal-review corrections incorporated |

### Agent timings and commits

The protocol requires active timing rather than reconstruction from Git commit times. Values marked
as not recorded remain unavailable in the agent's retained timing block. Luna's review completion
below was externally measured because the written review artifact retained a placeholder rather
than a completion timestamp.

| Agent / nickname | Model | Reasoning effort | Stage | Start | End / commit | Duration | Commit |
|---|---|---|---|---|---|---:|---|
| Luna | GPT-5.6 Luna | High | Initial implementation | `2026-08-08T18:26:42.7684244+02:00` | `2026-08-08T18:44:36.5179118+02:00` | `1073.749487s` (~17m54s) | `641c3a08173d125147191f3e06e773a880d70a1b` |
| Luna | GPT-5.6 Luna | High | Reciprocal review of Sol | `2026-08-08T18:45:30.5972373+02:00` | `2026-08-08T18:47:42.4702017+02:00` (external measurement) | ~131.873s | -- |
| Luna | GPT-5.6 Luna | High | Review-driven revision | Not recorded | `2026-08-08T18:55:23+02:00` | Not recorded | `ac2958c2fbeb4fa3a8fa203fc99cd9265c09eccf` |
| Luna | GPT-5.6 Luna | High | Supplementary source/spell-context revision | Not recorded | `2026-08-08T18:57:16.6424154+02:00` | Not recorded | `ed0c250e93514f924e663a80116c4a9f68639dfc` |
| Luna | GPT-5.6 Luna | High | Active total | -- | -- | Not calculable from retained timing blocks | -- |
| Sol / Bernoulli | GPT-5.6 Sol | Low | Initial implementation | Not recorded | `2026-08-08T18:37:45+02:00` | Not recorded | `f0866218a018ec8a912b1161c9ecc725bc9493b4` |
| Sol / Bernoulli | GPT-5.6 Sol | Low | Reciprocal review of Luna | `2026-08-08T18:44:58.8763530+02:00` | `2026-08-08T18:48:00.8119658+02:00` | `181.937835s` | -- |
| Sol / Bernoulli | GPT-5.6 Sol | Low | Review-driven revision | `2026-08-08T18:48:32.8399963+02:00` | `2026-08-08T18:54:59.1532803+02:00` | `386.303511s` | `2e20c192e0b3d08ce0d7d609f326ee009a09b59f` |
| Sol / Bernoulli | GPT-5.6 Sol | Low | Active total | -- | -- | Initial stage not recorded; measured review plus revision `568.241346s` | -- |

Sol's dispatch timestamp was available (`2026-08-08T18:26:35.3389065+02:00`) but is not used
as an implementation start because the protocol prohibits treating dispatch-to-commit time as
active runtime.

### Initial implementation comparison

| Dimension | Luna initial | Sol initial | Comparison |
|---|---|---|---|
| Browser/UI coverage | Dedicated R8.3 browser coverage; initial suite `41/41` | Initial sanctioned suite `38/38`; browser command had a timeout note in the initial run | Luna had the stronger initial browser/UI evidence surface |
| Node/source edge coverage | Initial suite evidence retained as part of the Luna run | `9,489/9,489` Node assertions; stronger coverage of several source-to-output edge cases | Sol had the stronger initial Node/source evidence surface |
| Identity conversion behavior | Ordered identity model and broad UI integration | Correct CoM1 Zombies and Golem behavior in the initial implementation | Split result; both had material gaps caught by reciprocal review |
| Initial winner | -- | -- | No formal single initial winner was recorded |

Sol's initial implementation was stronger on CoM1 Zombies' 20% interpretation, CoM1 Golem
coverage, Chosen's Life/Fantastic result, and avoiding display-name inference for Call to Arms.
Luna's initial implementation was stronger on dedicated browser/UI coverage and the integrated
identity test surface. The final integration choice was not made solely from initial results;
both reciprocal reviews and subsequent revisions were part of the decision.

### Reciprocal review findings and dispositions

#### Sol's review of Luna

1. **P1 -- CoM1 Zombies unit convention.** Luna's initial implementation treated engine
   `toblock = -1` as a one-percentage-point change, yielding 29% instead of the required 20%.
   Fixed as a ten-percentage-point change and pinned with a regression test.
2. **P1 -- Breakthrough trusted UI outcome.** The initial implementation trusted the selected
   `melee`/`meleeDef` result instead of deriving the package from direct identity predicates.
   Fixed by deriving the package from calculated identity and encounter predicates.
3. **P1 -- CoM1 Golem omitted.** Golem -> Resist Elements was initially restricted to modern
   versions. Fixed to cover the evidenced CoM1 path as well.
4. **P1 -- Chosen conversion incomplete and incorrectly ordered.** Chosen wrote Fantastic but
   omitted live Life and ran before Combat Summoned. Fixed with live Life/Fantastic output and
   corrected ordered execution.
5. **P1 -- Call to Arms inferred from display name and weak template gates.** Fixed with an
   explicit modern spell-specific condition and retained Paladins template predicate.

#### Luna's review of Sol

1. **P1 -- Identity conversions ran before the calculated ability pipeline.** Fixed by moving
   identity execution after calculated grants and gates.
2. **P1 -- Breakthrough direct/live gating was incomplete.** Fixed so direct predicates prevent
   the normal package for live-Fantastic units and select the exceptional package for Combat
   Summoned or Non-Corporeal units.
3. **P1 -- Call to Arms Paladins lacked an explicit spell-specific condition.** Fixed with an
   explicit modern condition gated by retained Paladins template ID 113.
4. **P2 -- Source template metadata was read from mutable identity state.** Fixed by capturing
   the source template ID before live identity mutation.
5. **P2 -- Identity trace was not exposed on the calculated output.** Fixed by exposing the
   top-level calculated-output `identityTrace` while retaining compatibility data.
6. **P2 -- CoM1 Zombies unit convention lacked an explicit regression test.** Fixed and pinned
   to -10 percentage points / 20% final To Block.

Both reviews were materially useful and complementary. Sol's review found concrete executable
result defects in Luna's initial implementation; Luna's review found ordering and predicate-boundary
defects in Sol's initial implementation. Neither review was assigned a single overall winner.

### Revision and integration decision

Sol's revised implementation was independently verified with `9,506` focused Node assertions and
`38/38` Playwright tests. Luna's revised implementation was selected as the integration lineage
because it supplied the stronger final browser/UI integration and the source-faithful Breakthrough
stack used by the final branch. Sol's review findings and revision evidence were incorporated into
the final behavior; Sol's revised branch itself was not used as the integration base.

The integration sequence was:

1. Create `codex/R8.1-integration` from the frozen base.
2. Cherry-pick Luna's initial implementation `641c3a08173d125147191f3e06e773a880d70a1b` as
   `ba8e62a`.
3. Cherry-pick Luna's review-driven revision `ac2958c2fbeb4fa3a8fa203fc99cd9265c09eccf` as
   `2c3d1ce`.
4. Cherry-pick Luna's supplementary source/spell-context revision `ed0c250e93514f924e663a80116c4a9f68639dfc`
   as `1ac51ee`.
5. Add final R8.3 identity verification coverage as `9216222`.
6. Document final R8.3 identity gates as `4545b48`.

### Verification evidence

- Sol focused Node checks: `9,506/9,506` passed in `0.242272s`.
- Sol timed Playwright confirmation: `38/38` passed in `111.924868s` on port `8082`.
- Final Node unit checks: `9,494/9,494` passed; exact result was
  `{"allPassed":true,"total":9494,"failures":[]}`.
- Final browser suite: `41/41` passed in `43.9s`.
- Final `git diff --check`: passed.
- Final repository status: clean.
- Final worktree list: primary worktree only.
- Temporary branches `codex/R8.3-luna` and `codex/R8.3-sol`: removed.
- Temporary Luna and Sol worktrees: removed.
- Review artifact files: removed before cleanup.
- Push: none.

### Cleanup and repository state

- Final branch: `codex/R8.1-integration`.
- Final commit: `4545b4859252ba792ba241bb330bc5510690a85e`.
- Final worktree clean.
- Nothing pushed.
- Review artifact files were deleted. The ignored `.reviews` directory itself remains empty because
  directory removal was blocked during cleanup; it contains no review artifacts.

## Append-only entry template

Copy this section for each future dual-agent task and replace the placeholders. Keep the detailed
review findings below the timing table so benchmark metrics remain comparable while qualitative
evidence is not lost.

### Task `<ID>` — `<short title>`

| Field | Value |
|---|---|
| Task | `<ID> — <title>` |
| Date | `<YYYY-MM-DD>` |
| Time zone | `<zone and offset>` |
| Frozen base | `<commit>` |
| Integration branch | `<branch>` |
| Final integration commit | `<commit>` |
| Initial winner | `<agent and reason>` |
| Integration choice | `<agent/material selected and reason>` |

| Agent / nickname | Model | Reasoning effort | Stage | Start | End / commit | Duration | Commit |
|---|---|---|---|---|---|---:|---|
| Orchestrator | GPT-5.6 Sol | High | Coordination/integration | `<timestamp>` | `<timestamp>` | `<duration>` | `<integration commit>` |
| Sol High A subagent | GPT-5.6 Sol | High | Initial implementation | `<timestamp>` | `<timestamp>` | `<duration>` | `<commit>` |
| Sol High A subagent | GPT-5.6 Sol | High | Reciprocal review | `<timestamp or not recorded>` | `<timestamp>` | `<duration>` | — |
| Sol High A subagent | GPT-5.6 Sol | High | Review-driven revision | `<timestamp>` | `<timestamp>` | `<duration>` | `<commit>` |
| Sol High A subagent | GPT-5.6 Sol | High | Active total | — | — | `<duration>` | — |
| Sol High B subagent | GPT-5.6 Sol | High | Initial implementation | `<timestamp>` | `<timestamp>` | `<duration>` | `<commit>` |
| Sol High B subagent | GPT-5.6 Sol | High | Reciprocal review | `<timestamp or not recorded>` | `<timestamp>` | `<duration>` | — |
| Sol High B subagent | GPT-5.6 Sol | High | Review-driven revision | `<timestamp>` | `<timestamp>` | `<duration>` | `<commit>` |
| Sol High B subagent | GPT-5.6 Sol | High | Active total | — | — | `<duration>` | — |

#### Initial comparison

`<Strengths, weaknesses, evidence, and initial winner.>`

#### Reciprocal review and dispositions

`<Finding, severity, evidence, and whether it was applied.>`

#### Integration and verification

`<Integration sequence, selected material, tests, caveats, cleanup, and push status.>`

#### Required timing and server evidence

For the orchestrator and each subagent, add a timing row for every applicable stage with both
wall-clock start/end timestamps and elapsed seconds. Include active seconds and waiting seconds
separately; use `not recorded` rather than inferring a missing start from a commit timestamp. The
orchestrator's coordination timing is not an implementation competitor total. The minimum stage
rows are:

| Agent | Stage | Start | End | Active seconds | Waiting seconds |
|---|---|---|---|---:|---:|
| Orchestrator | Coordination/integration | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High A subagent | Initial implementation | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High A subagent | Reciprocal review | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High A subagent | Review-driven revision | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High A subagent | Each verification suite | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High A subagent | Active total | - | - | `<seconds>` | `<seconds>` |
| Sol High B subagent | Initial implementation | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High B subagent | Reciprocal review | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High B subagent | Review-driven revision | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High B subagent | Each verification suite | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High B subagent | Active total | - | - | `<seconds>` | `<seconds>` |

Also record `primary_port`, `sol_high_a_port`, `sol_high_b_port`, each server PID, server start/stop
times, and the timestamp when each temporary port was confirmed free.

## Task R8.4 -- Identity lifecycle migration

### Run metadata

| Field | Value |
|---|---|
| Task | R8.4 -- persistence, sharing, swap, presets and Matrix identity migration |
| Date | 2026-08-08 |
| Time zone | Europe/Copenhagen (`+02:00`) |
| Frozen base | `b285e0c70e3407c92ea95e74f3e6ef0579506b66` |
| Integration branch | `codex/R8.1-integration` |
| Final integration commit | `349509938ef0dc15fc7d7b84399e2644f9f4f36e` |
| Temporary tips | Sol High `c7e864b85c3618252fe09cac263395449ede30d9`; Sol Medium `2c7b8736c7febbc3fe0f295ea61558a2308c5017` |
| Models | Orchestrator GPT-5.6 Sol High; implementer/reviewer A GPT-5.6 Sol High; implementer/reviewer B GPT-5.6 Sol Medium |
| Ports | Primary 8080; Sol High 8081; Sol Medium 8082; review-only 8083 |
| Initial winner | Sol High: one compatibility defect versus Medium's functional live-identity defect, production-Matrix coverage gap, and stale queue row |
| Most useful review | Sol High's review of Medium, because it found the executable No-Heal/unaligned failure plus the Matrix-production-path coverage omission and queue inconsistency; Medium's raw-share finding was also essential |
| Strongest revised result | Sol High implementation base, combined with Sol Medium's production Matrix parity test |
| Push | None |

### Subagent timing

All monotonic clocks used `Stopwatch.Frequency = 10,000,000`. A phase span is not relabeled as
active work when the agent did not pause its stopwatch around subprocesses. Parallel agent spans
are reported independently and are not added into an end-to-end duration.

| Agent | Stage | Start | End | Measured span | Active / waiting accounting |
|---|---|---|---|---:|---|
| Sol High | Initial implementation | `2026-08-08T19:35:00.7050697+02:00` | `2026-08-08T19:56:40.6296705+02:00` | `1299.919422s` | Exact active time not recorded; user/agent/server-slot waiting `0s`; dependency/focused-process waiting incomplete |
| Sol High | Reciprocal review | `2026-08-08T19:59:05.4479686+02:00` | `2026-08-08T20:05:00.3829378+02:00` | `354.928395s` | Review work excluding measured tests `319.960074s`; measured test waiting `34.968321s`; user/agent/server-slot waiting `0s` |
| Sol High | Review-driven revision | `2026-08-08T20:06:45.9242671+02:00` | `2026-08-08T20:11:23.2114836+02:00` | `277.275283s` | Exact active time not recorded; final-suite waiting `97.250979s`; focused-harness waiting approximately `21.8s`; user/agent/server-slot waiting `0s` |
| Sol High | Measured phase-span total | -- | -- | `1932.123100s` | Not an active-runtime total because the initial and revision spans include subprocess waiting |
| Sol Medium | Initial implementation | `2026-08-08T19:35:13.8085322+02:00` | `2026-08-08T19:50:40.4679549+02:00` | `926.642114s` | Agent-reported active `925.105862s`; `npm ci` waiting `1.536252s` |
| Sol Medium | Reciprocal review | `2026-08-08T19:59:13.6051644+02:00` | `2026-08-08T20:01:07.2667392+02:00` | `113.667452s` | Active review `113.667452s`; waiting `0s`; no executable suite run |
| Sol Medium | Review-driven revision | `2026-08-08T20:06:54.3334805+02:00` | `2026-08-08T20:15:05.5845399+02:00` | `491.253129s` | Exact active time not separable from external tests; user/agent/server-slot waiting `0s` |
| Sol Medium | Measured phase-span total | -- | -- | `1531.562694s` | Not an active-runtime total because the revision span includes subprocess waiting |

### Per-agent verification timing

#### Sol High

| Phase | Suite | Result | Elapsed |
|---|---|---:|---:|
| Initial | Node unit checks | 9,504/9,504 | `0.159029s` |
| Initial | Playwright, port 8081 | 48/48 | `47.325576s` |
| Initial | State persistence | 37/37 | `26.676294s` |
| Initial | Browser smoke | pass | `1.992613s` |
| Initial | `git diff --check` | pass | `0.062828s` |
| Initial diagnostic | Playwright before Golem hidden-state swap fix | 47/48, expected failed diagnostic | `48.465186s` |
| Review | Medium Node checks | 9,494/9,494 | `0.161589s` |
| Review | Medium focused identity Playwright, port 8083 | 11/11 | `8.182983s` |
| Review | Medium state persistence | 36/36 | `26.623749s` |
| Revision | Node unit checks | 9,504/9,504 | `0.167743s` |
| Revision | Playwright, port 8081 | 48/48 | `57.623535s` |
| Revision | State persistence | 39/39 | `37.384358s` |
| Revision | Browser smoke | pass | `2.014615s` |
| Revision | `git diff --check` | pass | `0.060728s` |

#### Sol Medium

| Phase | Suite | Result | Elapsed |
|---|---|---:|---:|
| Initial | Node unit checks | 9,494/9,494 | `0.192000s` |
| Initial | Playwright, port 8082 | 48/48 | `60.423347s` |
| Initial | State persistence | 36/36 | `30.740127s` |
| Initial | Browser smoke | pass | `2.060059s` |
| Initial | `git diff --check` | pass | `0.062404s` |
| Review | Code-path review of High | one actionable finding; no executable suite | `113.667452s` |
| Revision | Node unit checks | 9,497/9,497 | `0.267401s` |
| Revision | Final Playwright, port 8082 | 48/48 | Playwright reported `49.5s`; exact wrapper elapsed not recorded |
| Revision | State persistence | 36/36 | `26.389578s` |
| Revision | Browser smoke | pass | `2.018572s` |
| Revision | `git diff --check` | pass | `0.057532s` |

Medium's revision had two earlier Playwright iterations: the first exposed a fixture confusion
between roster ID 38 and source template ID 37, and the second green run lost its wrapper timing
line. The final 48/48 run above followed both. Their exact elapsed times were not retained.

### Initial comparison

Both initial implementations delivered schema-v2 state, legacy compatibility, identity-aware
swap/presets/version handling, Worker execution, specifications and focused tests. Sol High's
initial implementation was stronger:

- High preserved explicit `No Heal` / `fantastic_unaligned` live identity and added 10 extra Node
  assertions; Medium lost that write and returned a Chosen unit to Life.
- High's initial Playwright run found and fixed the hidden pre-Golem Elements value that must move
  with swap before committing its 48/48 result.
- High used a new `pageState_v2` key with fallback to `pageState_v1`, while Medium retained the old
  key and advanced only the payload version. Both are viable, but High's boundary more clearly
  separates current and legacy writers and its final harness tests corrupt-current/legacy fallback.
- High still missed legacy full plain-JSON share fragments, which Medium's review correctly found.
- Neither initial Matrix parity test fully exercised both production row constructors. High found
  that omission in Medium's branch; the same weakness survived in High's test and was corrected by
  the integrator using Medium's revised production-path test.

### Reciprocal review and dispositions

Sol Medium's review of High produced one high-severity finding: `parseHashState()` always used LZ
decoding and therefore rejected full plain-JSON v1 share fragments. High fixed it with safe single
URL decoding, raw-JSON recognition, preserved malformed-link fallback, and two end-to-end state
harness assertions. The revised state harness increased from 37 to 39 checks.

Sol High's review of Medium produced three findings:

1. `fantastic_unaligned` did not map to an explicit live race, erasing Mystic Surge/No-Heal after
   Chosen/Chaos/Undead ordering. Medium added bidirectional `No Heal` compatibility mapping and
   ordered Node/browser coverage.
2. The Worker parity test manually derived its fixtures and bypassed `predefinedMatrixUnitRows()`
   and `selectedMatrixUnitRow()`. Medium replaced it with a CoM 1 Construct Catapult test that
   traverses predefined and Custom production row builders, main-card derivation and the real
   Worker, with a non-vacuous ordinary-versus-Construct damage delta.
3. The backlog priority table still included completed F3-F4. Medium changed it to F5-F6. High's
   branch already carried the same queue correction.

All findings were accepted and fixed. No review dispute survived integration.

### Integration and final verification

The primary branch remained at the frozen base until both initial commits existed. Integration
then selected High's revised lineage and applied it as:

1. `0376d9d` -- High initial implementation (`5ebb064`);
2. `bd83bd9` -- High raw legacy share revision (`c7e864b`);
3. `3495099` -- replace the hand-derived parity test with Medium's revised production Matrix test.

No mechanical merge of both branches was performed. No Medium implementation code was imported;
its material contribution is the stronger production-path test.

| Final suite | Result | Start | End | Elapsed |
|---|---:|---|---|---:|
| Focused R8.4 Playwright | 7/7 | `2026-08-08T20:18:56.5375732+02:00` | `2026-08-08T20:19:04.5462401+02:00` | `7.993380s` |
| Full Playwright, port 8080 | 48/48 | `2026-08-08T20:19:18.0831987+02:00` | `2026-08-08T20:20:07.9178384+02:00` | `49.831503s` |
| Node unit checks | 9,504/9,504 | `2026-08-08T20:20:24.6089725+02:00` | `2026-08-08T20:20:24.7966246+02:00` | `0.194006s` |
| State persistence / sharing | 39/39; browser PRESETS all-pass | `2026-08-08T20:21:52.1039073+02:00` | `2026-08-08T20:22:28.9513513+02:00` | `36.843604s` |
| Browser smoke | pass, `{"text":"50%","visible":true}` | `2026-08-08T20:22:36.0871409+02:00` | `2026-08-08T20:22:38.1795257+02:00` | `2.092158s` |
| `git diff --check` | pass | `2026-08-08T20:22:48.7420446+02:00` | `2026-08-08T20:22:48.8238925+02:00` | `0.073457s` |

Two earlier final state-harness wrappers completed without returning captured output. The explicit
third run above is the retained 39/39 result; no result is inferred from the silent wrappers.

### Orchestrator timing

- Coordination clock started at `2026-08-08T19:32:59.6564455+02:00`, monotonic tick
  `1767336455468`.
- Integration clock started at `2026-08-08T20:17:59.5391029+02:00`, tick `1794335010025`.
- Cleanup measurement was taken at `2026-08-08T20:24:27.3778947+02:00`, tick
  `1798213372741`.
- Measured coordination wall span: `3087.693443s`.
- Measured integration-through-cleanup wall span: `387.842105s`.
- Exact orchestrator active coordination time and total waiting time were not recorded. The wall
  span includes long waits for independent implementation, review and revision plus external
  verification and must not be interpreted as active runtime or implementation throughput.

### Server and cleanup evidence

- Sol High initial: Python PID 10680, started `19:54:30`, observed `19:54:42`; exact stop not
  recorded; port 8081 free at `19:55:17` and finally `19:57:11`.
- Sol High revision: Python PID 12152, started `20:09:10`, observed `20:09:22`; exact stop not
  recorded; port 8081 free at `20:10:08` and finally `20:11:30`.
- Sol Medium initial: server PID 19360, started `19:48:07`, listener observed `19:48:09`, first
  stop/free observation `19:49:09`, final port-free confirmation `19:50:42`.
- Sol Medium revision: server PID 17872, observed `20:12:52`; exact stop not recorded; port 8082
  free at `20:13:45` and finally `20:15:07`.
- Primary final: Python PID 1800, started `20:19:19`, observed `20:19:35`; exact stop not recorded;
  PID exited and port 8080 was free at `20:20:16`.
- Ports 8080, 8081, 8082 and review port 8083 were all confirmed free at
  `2026-08-08T20:24:27+02:00`.
- Temporary worktrees `C:\CoM2-damage-calculator-R8.4-sol-high` and
  `C:\CoM2-damage-calculator-R8.4-sol-medium` were verified clean at their revised tips and removed.
- Temporary branches `codex/R8.4-sol-high` and `codex/R8.4-sol-medium` were deleted after their
  exact tips were recorded.
- Both resolved review artifacts were cleared; no disagreement survived.
- `git worktree list` contains only the primary checkout. The intended branch was clean at
  integration commit `3495099` before this append-only benchmark entry was written.
- Nothing was pushed.

## Task R7.3 -- Ordered calculated-stat modifier traces

### Run metadata

| Field | Value |
|---|---|
| Task | R7.3 -- complete the ordered trace behind every displayed calculated-stat modifier |
| Date | 2026-08-08 |
| Time zone | Europe/Copenhagen (`+02:00`) |
| Frozen base | `c0e3f0f185e3a8d83c28927e18f13935703eca6e` |
| Integration branch | `codex/R7.3-integration` |
| Final integration commit | `c686e5037c0f4e504d547a093571b4cf9b691c9f` |
| Temporary tips | Sol High `1bd9523acfdab2f035914c6f6de8864f636a7b45`; Sol Medium `7af97f2bf512a2438683a2adf05982569cb66cce` |
| Models | Orchestrator GPT-5.6 Sol High; implementer/reviewer A GPT-5.6 Sol High; implementer/reviewer B GPT-5.6 Sol Medium |
| Ports | Primary 8080; Sol High 8081; Sol Medium 8082 |
| Initial winner | Sol High: one source-attribution defect versus Medium's two valid-input derivation failures and one no-op-trace defect; High also made the trace path authoritative and added browser coverage |
| Most useful review | Sol High's review of Medium, because it supplied three executable reproductions, including the ranged-distance and CoM 1 Zombies failures; Medium's permanent-write attribution finding was also essential |
| Strongest revised result | Sol High implementation base, combined with Sol Medium's 10% initial To Block clamp correction and distance/clamp-floor regressions |
| Push | None |

### Subagent timing

Parallel agent spans are reported independently and are not added into an end-to-end duration.
`Active total` uses the active figures each subagent reported; it does not add separately listed
verification durations a second time. Where an agent did not pause its stopwatch around tests,
the stage span is retained with that limitation stated explicitly.

| Agent | Stage | Start | End | Measured span | Active / waiting accounting |
|---|---|---|---|---:|---|
| Sol High | Initial implementation | `2026-08-08T20:57:12.7837665+02:00` | `2026-08-08T21:14:44.1252712+02:00` | `1046.458s` | Fallback active `985.630s`, after subtracting precisely timed dependency/failure/verification subprocesses; setup waiting `3.793s`; no other waiting |
| Sol High | Reciprocal review | `2026-08-08T21:16:19.9112839+02:00` | `2026-08-08T21:23:10.8798414+02:00` | `410.962s` | Active review `410.962s`; waiting `0s` |
| Sol High | Review-driven revision | `2026-08-08T21:23:45.9474427+02:00` | `2026-08-08T21:30:16.3767599+02:00` | `390.437s` | Agent-reported revision span `390.437s`, including verification; external waiting `0s` |
| Sol High | Active total | -- | -- | `1787.029s` | Initial fallback active + review + revision; reported waiting `3.793s` |
| Sol Medium | Initial implementation | `2026-08-08T20:57:32.8842306+02:00` | `2026-08-08T21:10:56.6924133+02:00` | `803.892s` | Agent-reported active `801.989s`; dependency setup waiting `1.903s`; no other waiting |
| Sol Medium | Reciprocal review | `2026-08-08T21:16:28.2854693+02:00` | `2026-08-08T21:18:28.1225760+02:00` | `119.845s` | Active review `119.845s`; waiting `0s` |
| Sol Medium | Review-driven revision | `2026-08-08T21:23:53.5275725+02:00` | `2026-08-08T21:27:23.9653703+02:00` | `210.428s` | Agent-reported active `210.428s`, including verification; waiting `0s` |
| Sol Medium | Active total | -- | -- | `1132.262s` | Initial active + review + revision; reported waiting `1.903s` |

### Per-agent verification timing

#### Sol High

| Phase | Suite | Result | Start | End | Elapsed |
|---|---|---:|---|---|---:|
| Initial | Focused modifier-trace Playwright, port 8081 | 2/2 | `2026-08-08T21:11:53.4033230+02:00` | `2026-08-08T21:11:58.0685586+02:00` | `4.664s` |
| Initial | Node unit checks | 9,613/9,613 | `2026-08-08T21:13:07.0736709+02:00` | `2026-08-08T21:13:07.3061826+02:00` | `0.235s` |
| Initial | Full Playwright, port 8081 | 50/50 | `2026-08-08T21:13:16.3179894+02:00` | `2026-08-08T21:14:08.4455866+02:00` | `52.136s` |
| Revision | Focused modifier-trace Playwright, port 8081 | 3/3 | `2026-08-08T21:26:55.5234371+02:00` | `2026-08-08T21:27:00.5314218+02:00` | `4.999s` |
| Revision | Full Playwright, port 8081 | 51/51 | `2026-08-08T21:28:22.6517340+02:00` | `2026-08-08T21:29:16.0070128+02:00` | `53.349s` |
| Revision | Node unit checks | 9,671/9,671 | `2026-08-08T21:29:45.6387560+02:00` | `2026-08-08T21:29:45.8428774+02:00` | `0.197s` |

The first focused Playwright launch failed before opening a server because the fresh worktree had
no `node_modules`; `npm ci` took `1.354s`. This dependency/setup failure was retained in the
agent's initial timing account and was not reported as a test result.

#### Sol Medium

| Phase | Suite | Result | Start | End | Elapsed |
|---|---|---:|---|---|---:|
| Initial | Node unit checks | 9,521/9,521 | `2026-08-08T21:09:28.2364271+02:00` | `2026-08-08T21:09:28.5383156+02:00` | `0.290s` |
| Initial | Full Playwright, port 8082 | 48/48 | `2026-08-08T21:09:38.1295385+02:00` | `2026-08-08T21:10:30.3352751+02:00` | `52.199s` |
| Revision | Node unit checks | 9,530/9,530 | `2026-08-08T21:25:37.7727423+02:00` | `2026-08-08T21:25:38.0075576+02:00` | `0.231s` |
| Revision | Full Playwright, port 8082 | 48/48 | `2026-08-08T21:25:46.8560801+02:00` | `2026-08-08T21:26:37.2732752+02:00` | `50.414s` |

Medium's earlier initial Playwright pass exposed a legacy raw-trace shape regression (47/48),
which it fixed before the retained 48/48 result. Its first launch also failed before opening a
server because dependencies were absent; lockfile-pinned `npm install` took `1.903s`.

### Initial comparison

Both initial implementations delivered projected traces for numeric stats, percentage outputs,
live identity and independent modern attacks; both updated the specification, backlog, history
and Node coverage. Sol High's initial implementation was stronger overall:

- High routed displayed To Hit and To Block through the traced ordered step path and used that
  result as authoritative. Medium reconstructed percentage chains after the existing calculation
  and asserted parity, a weaker fit for the SPEC requirement that the trace be emitted from the
  same path which computes the value.
- High added a dedicated Playwright file, finishing with 50 browser tests and 9,613 Node
  assertions. Medium added Node coverage and retained the pre-existing 48 browser tests.
- Medium correctly recorded pre-sequence permanent sources from the outset. High collapsed
  Destiny, Chaos Channels, Lightning Blade, Focus Magic, Vampirism and Shadow Strike into the
  generic `stat:base` seed, its one P1 initial defect.
- Medium's initial percentage projection had two P1 valid-input failures: ordinary ranged
  distance multiplied an already percentage-point-valued penalty by 100, and a legal CoM 1
  Zombies state reached a 0% traced To Block value while production displayed 10%. It also split
  clamped resolution effects into an artificial below-floor write plus a compensating clamp,
  violating no-op omission.

High therefore had the stronger initial result: one completeness defect versus two runtime
derivation failures and one trace-contract defect, plus the stronger authoritative computation
boundary and browser coverage. This judgment is based on executable failures and acceptance
coverage, not model identity or speed.

### Reciprocal review and dispositions

Sol Medium's review of High produced one P1 finding: permanent/base writers were missing or
misattributed, and a Shadow Strike-created modern Thrown channel exposed `baseStrength: 0` beside
a positive trace base with no Shadow Strike entry. High fixed it in `1bd9523` by recording each
permanent write at its application site and added Node/browser fixtures for all six named sources.

Sol High's review of Medium produced three findings:

1. Ranged distance was rescaled by 100 and aborted ordinary CoM2 ranged derivation.
2. Initial To Block used a 0% rather than 10% floor and aborted a valid CoM 1 Zombies state.
3. Resolution effects at the floor emitted an unrestricted write and compensating clamp instead
   of disappearing as actual no-ops.

Medium fixed all three in `7af97f2` with focused Node regressions. No review dispute survived.
High's review was the more useful reciprocal review because it supplied three concrete VM
reproductions, two of which were P1 valid-input failures. Medium's single finding was nonetheless
essential and materially changed the selected branch.

### Integration and final verification

The primary checkout remained on the frozen commit until both initial implementations existed.
Integration selected High's revised lineage and applied it as:

1. `c33fb1f` -- High initial implementation (`9ce4261`);
2. `dc01c72` -- High permanent-source revision (`1bd9523`);
3. `c686e50` -- integrate Medium's 10% initial To Block floor and its ranged-distance,
   CoM 1 Zombies and capped-Plague regression cases.

No mechanical merge of both branches was performed. The selected implementation is High's
authoritative trace pipeline and browser suite; Medium materially supplied the clamp correction
and three focused edge cases. The revised High branch was strongest overall after its review fix,
but the combined result is stronger than either revised branch alone because High still carried
the initial To Block floor defect that Medium's revision had corrected.

| Final suite | Result | Start | End | Elapsed |
|---|---:|---|---|---:|
| Full Playwright, primary port 8080 | 51/51 | `2026-08-08T21:33:20.1779361+02:00` | exact wrapper end not recorded; completion first observed `2026-08-08T21:34:21.8490412+02:00` | Playwright reported `51.7s` |
| Node unit checks | 9,679/9,679 | `2026-08-08T21:35:44.0858626+02:00` | `2026-08-08T21:35:44.2629141+02:00` | `0.184867s` |
| `git diff --check` | pass | `2026-08-08T21:35:44.2786764+02:00` | `2026-08-08T21:35:44.3267760+02:00` | `0.042505s` |

### Orchestrator timing

- Coordination dispatch was recorded at `2026-08-08T20:56:47.1053904+02:00`.
- Integration comparison began after the final revised branch reported ready at approximately
  `2026-08-08T21:30:18.9248760+02:00`.
- Cleanup completed at `2026-08-08T21:35:19.8560754+02:00`.
- Measured dispatch-through-cleanup wall span: `2312.751s`.
- Approximate integration-through-cleanup wall span: `300.931s`.
- Exact orchestrator active coordination time and waiting time were not recorded. The total wall
  span includes waits for two independent implementations, reciprocal reviews, revisions and
  external verification, and is not an implementation-runtime comparison.

### Server and cleanup evidence

- Sol High initial full suite: Python PID 17624, started `21:13:17`, observed listening at
  `21:13:32`; PID exited and port 8081 was free at `21:14:17`, with final free confirmation at
  `21:15:06`.
- Sol High revision full suite: Python PID 18004, started
  `2026-08-08T21:28:23.5270926+02:00`; PID exited and port 8081 was free at
  `2026-08-08T21:29:22.9338621+02:00`, with final confirmation at `21:30:18`.
- Sol Medium initial final suite: Python PID 12400 was observed at `21:09:54`; PID exited and port
  8082 was free at `21:10:44`.
- Sol Medium revision: Python PID 11744 was observed at `21:26:07`; PID exited and port 8082 was
  free at `2026-08-08T21:26:48.0710059+02:00`.
- Primary final: Python PID 11336 started at `2026-08-08T21:33:21.1029468+02:00`, was observed
  listening at `21:33:37`, and had exited with port 8080 free at
  `2026-08-08T21:34:21.8490412+02:00`.
- Ports 8080, 8081 and 8082 were all confirmed free at
  `2026-08-08T21:35:19.3540942+02:00`.
- Temporary worktrees `C:\CoM2-damage-calculator-R7.3-sol-high` and
  `C:\CoM2-damage-calculator-R7.3-sol-medium` were verified clean at the tips recorded above and
  removed. Temporary branches `codex/R7.3-sol-high` and `codex/R7.3-sol-medium` were deleted.
- Both resolved review artifacts were cleared; no disagreement survived. `git worktree list`
  contains only the primary checkout. The intended branch was clean at integration commit
  `c686e50` before this append-only benchmark entry was written. Nothing was pushed.

## Task R7.4 -- Calculated-stat modifier trace tooltips

### Run metadata

| Field | Value |
|---|---|
| Task | R7.4 -- expose R7.3's ordered calculated-stat chains through the existing hover/touch tooltip interaction |
| Date | 2026-08-08 |
| Time zone | Europe/Copenhagen (`+02:00`) |
| Frozen base | `edce777b6a0bfa8e7b459eff22ec6a52530aa471` |
| Integration branch | `codex/R7.3-integration` |
| Final integration commit | `ab3828e9fdae69847d4c31196689adb1ab446dc0` |
| Temporary tips | Sol High `ab7cbba0d15b65955a676831a61f5e77fcab1132`; Sol Medium `e7e98b51c5cbe46eebf662a9b7f062593c2d76e7` |
| Models | Orchestrator GPT-5.6 Sol High; implementer/reviewer A GPT-5.6 Sol High; implementer/reviewer B GPT-5.6 Sol Medium |
| Ports | Primary 8080; Sol High 8081; Sol Medium 8082; isolated review 8083 |
| Initial winner | Sol High: its displayed result came directly from the R7.3 projection which also supplied the chain, while Medium retained a separate effective-value display path; Medium supplied the broader dedicated browser suite |
| Most useful review | Sol High's review of Medium: one P1 stationary-pointer stale-overlay defect, with full-suite, repeated and deterministic reproductions; the same architecture also existed in High and was caught by the integrator |
| Strongest revised result | Sol High implementation base plus Sol Medium's three-test dedicated tooltip suite |
| Push | None |

### Subagent timing

Parallel agent spans are reported independently and are not added into an end-to-end duration.
High's active total uses the figures it reported. Medium did not pause its stopwatch around external
verification in either implementation or revision, so strict active duration and active total are
reported as `not recorded`; its measurable fallback wall intervals are retained without relabelling.

| Agent | Stage | Start | End | Measured span | Active / waiting accounting |
|---|---|---|---|---:|---|
| Sol High | Initial implementation | `2026-08-08T22:00:53.8565001+02:00` | `2026-08-08T22:14:37.0151064+02:00` | `823.152s` | Agent-reported active `821.523s`; dependency wait `1.629s`; no other waiting |
| Sol High | Reciprocal review | `2026-08-08T22:16:15.4398385+02:00` | `2026-08-08T22:26:57.3629769+02:00` | `641.923s` | Active review `641.923s`; waiting/blocked `0s` |
| Sol High | Review-driven revision | `2026-08-08T22:28:43.3802614+02:00` | `2026-08-08T22:34:57.9645032+02:00` | `374.585s` | Active revision `374.585s`; waiting/blocked `0s` |
| Sol High | Active total | -- | -- | `1838.031s` | Initial active + review + revision; reported waiting `1.629s` |
| Sol Medium | Initial implementation | `2026-08-08T22:01:18.9869757+02:00` | `2026-08-08T22:11:15.5346324+02:00` | `596.543s` | Strict active `not recorded`; measurable fallback wall interval `596.543s`; waiting/blocked `0s` |
| Sol Medium | Reciprocal review | `2026-08-08T22:16:19.4230678+02:00` | `2026-08-08T22:17:34.1233636+02:00` | `74.691s` | Active review `74.691s`; waiting/blocked `0s` |
| Sol Medium | Review-driven revision | `2026-08-08T22:28:30.9071428+02:00` | `2026-08-08T22:32:07.6756942+02:00` | `216.755s` | Strict active `not recorded`; measurable fallback wall interval `216.755s`; waiting/blocked `0s` |
| Sol Medium | Active total | -- | -- | `not recorded` | Fallback stage spans total `888.0s`, but this is not labelled active time; reported waiting/blocked `0s` |

### Per-agent verification timing

#### Sol High

| Phase | Suite | Result | Start | End | Elapsed |
|---|---|---:|---|---|---:|
| Initial | Focused modifier trace/touch Playwright, port 8081 | 7/7 | `2026-08-08T22:12:56.7795462+02:00` | `2026-08-08T22:13:05.3887493+02:00` | `8.604s` |
| Initial | Node unit checks | 9,679/9,679 | `2026-08-08T22:13:12.0512581+02:00` | `2026-08-08T22:13:12.2483076+02:00` | `0.203s` |
| Initial | Full Playwright, port 8081 | 53/53 | `2026-08-08T22:13:24.3900206+02:00` | `2026-08-08T22:14:16.7831349+02:00` | `52.395s` |
| Review | Medium focused Playwright, port 8081 | 5/5 | `2026-08-08T22:18:15.0947931+02:00` | `2026-08-08T22:18:29.1272069+02:00` | `14.036s` |
| Review | Medium Node unit checks | 9,679/9,679 | `2026-08-08T22:20:39.6675924+02:00` | `2026-08-08T22:20:45.5305977+02:00` | `5.864s` |
| Review | Medium full Playwright, port 8081 | 1 failed, 53 passed; exposed P1 | `2026-08-08T22:20:52.4165606+02:00` | `2026-08-08T22:21:56.5078966+02:00` | `64.092s` |
| Review | Medium trace spec repeated 10 times | 1 failed, 19 passed; reproduced P1 | `2026-08-08T22:22:53.6600336+02:00` | `2026-08-08T22:23:26.7150687+02:00` | `33.069s` |
| Revision | Deterministic stationary-pointer pre-fix probe | reproduced update and removal defect | `2026-08-08T22:29:24.2214546+02:00` | `2026-08-08T22:29:55.0284239+02:00` | `30.805s` |
| Revision | Focused trace/touch Playwright, port 8081 | 7/7 | `2026-08-08T22:31:46.7929265+02:00` | `2026-08-08T22:32:03.5849410+02:00` | `16.787s` |
| Revision | Stationary-pointer regression repeated | 10/10 | `2026-08-08T22:32:15.5287087+02:00` | `2026-08-08T22:32:44.3352267+02:00` | `28.801s` |
| Revision | Node unit checks | 9,679/9,679 | `2026-08-08T22:32:52.0246186+02:00` | `2026-08-08T22:32:56.7061789+02:00` | `4.685s` |
| Revision | Full Playwright, port 8081 | 53/53 | `2026-08-08T22:33:05.8567473+02:00` | `2026-08-08T22:34:06.1119312+02:00` | `60.260s` |

The fresh High worktree initially lacked dependencies. Its first focused launch failed before
opening a server; lockfile-pinned `npm ci` was recorded as `1.629s` of external setup waiting.

#### Sol Medium

| Phase | Suite | Result | Start | End | Elapsed |
|---|---|---:|---|---|---:|
| Initial | Focused modifier trace/touch Playwright, port 8082 | 5/5 | `2026-08-08T22:08:52.4647414+02:00` | `2026-08-08T22:09:00.7066846+02:00` | `8.237s` |
| Initial | Strengthened trace spec | 2/2 | `2026-08-08T22:11:01.8233262+02:00` | `2026-08-08T22:11:05.9587160+02:00` | `4.131s` |
| Initial | Node unit checks | 9,679/9,679 | `2026-08-08T22:09:08.4909248+02:00` | `2026-08-08T22:09:08.6812191+02:00` | `0.199s` |
| Initial | Full Playwright, port 8082 | 54/54 | `2026-08-08T22:09:20.2401700+02:00` | `2026-08-08T22:10:16.6637800+02:00` | `56.418s` |
| Review | High focused Playwright, port 8083 | 7/7 | `2026-08-08T22:17:07.3733102+02:00` | `2026-08-08T22:17:17.1998424+02:00` | `9.836s` |
| Revision | First stationary-pointer focused attempt | 5 passed, 1 fixture failure | `2026-08-08T22:29:36.4102411+02:00` | `2026-08-08T22:29:45.6063192+02:00` | `9.189s` |
| Revision | Corrected focused trace/touch suite, port 8082 | 6/6 | `2026-08-08T22:30:13.9311105+02:00` | `2026-08-08T22:30:21.9289758+02:00` | `7.995s` |
| Revision | Node unit checks | 9,679/9,679 | `2026-08-08T22:30:36.2259309+02:00` | `2026-08-08T22:30:36.4274747+02:00` | `0.197s` |
| Revision | Full Playwright, port 8082 | 55/55 | `2026-08-08T22:30:47.1196874+02:00` | `2026-08-08T22:31:40.8044852+02:00` | `53.691s` |

Medium's first focused launch also failed before a server opened because the new worktree had no
`node_modules`; dependency installation duration was not recorded by a dedicated stopwatch. Its
subsequent recorded fixture failures were corrected before the retained passing results.

### Initial comparison

Both initial implementations exposed complete source-ordered chains on calculated final outputs,
preserved one final-value column, covered pointer hover and touch long-press, formatted percentage,
identity and modern-channel projections, and closed R7/R7.4 consistently. Both also had the same
stationary-pointer stale-overlay defect: recalculation changed or removed the output's
`data-tooltip` while an already-visible `#tt` retained the old chain until another pointer event.

Sol High's initial implementation was stronger overall because `updateModifiedDisplay` used the
R7.3 projection's `result` as both the displayed final value and the tooltip bookend. Medium kept
the prior effective-value arguments as the display path and used the projection only for trace
presentation. Both can produce the same values today, but High more directly satisfies the SPEC's
requirement that the ordered path be the path which computes the displayed result and reduces
future divergence risk. High also expanded the established R7.3 browser file and touch suite;
Medium's separate file supplied broader explicit symmetry, identity/channel formatting and
negative-control checks. The stale-overlay defect prevents either initial branch from being a
complete result, but does not erase the stronger computation boundary in High.

### Reciprocal review and dispositions

Sol Medium's review of High returned no findings after diff inspection and an isolated 7/7
focused run. High appended the required no-finding disposition and made a fresh revision commit.
The integrator then identified that High's controller had the same stationary-pointer architecture
as Medium's reviewed branch; High reproduced and fixed it separately as an orchestrator finding.

Sol High's review of Medium produced one P1 finding: a tooltip already visible over a calculated
output was not synchronized when recalculation changed or removed that output's trace. It supplied
a full-suite failure, a repeated intermittent reproduction and a deterministic browser probe.
Medium accepted and fixed the finding, recorded the disposition, and added a deterministic
add/update/remove regression. No review dispute survived. High's was the more useful reciprocal
review because it found the only product defect established in review, although its finding also
revealed a blind spot in High's own initial branch which the integrator closed before selection.

### Integration and final verification

Integration selected High's revised lineage and applied it as:

1. `9992b5b` -- High initial implementation (`11b7b34`);
2. `854e8d8` -- High stationary-pointer revision (`ab7cbba`);
3. `ab3828e` -- add Medium's revised dedicated three-test tooltip suite.

No mechanical merge of both branches was performed. High supplied the production implementation,
including the authoritative projection-to-display path and active tooltip synchronization. Medium
materially supplied the dedicated symmetry, formatting, control-boundary, deactivation and
stationary-pointer browser coverage. The revised High implementation was the strongest production
base; the combined result is stronger than either branch alone because it retains both agents'
independently authored R7.4 browser checks.

| Final suite | Result | Start | End | Elapsed |
|---|---:|---|---|---:|
| Combined focused trace/touch Playwright, port 8080 | 10/10 | `2026-08-08T22:37:26.4887574+02:00` | `2026-08-08T22:37:39.4375663+02:00` | `12.946s` |
| Node unit checks | 9,679/9,679 | `2026-08-08T22:37:52.1679841+02:00` | `2026-08-08T22:37:52.3805234+02:00` | `0.208s` |
| Full Playwright, primary port 8080 | 56/56 | `2026-08-08T22:38:09.4214866+02:00` | `2026-08-08T22:39:06.9954073+02:00` | `57.561s` |
| `git diff --check` | pass | `2026-08-08T22:39:18.9303215+02:00` | `2026-08-08T22:39:19.0150700+02:00` | `0.085s` |

### Orchestrator timing

- First dispatch was recorded at `2026-08-08T22:00:21.3153361+02:00`; second dispatch at
  `2026-08-08T22:00:46.4954917+02:00`.
- Reciprocal-review handoff began at `2026-08-08T22:15:46.6233788+02:00`.
- Revision handoff began at `2026-08-08T22:28:11.0148183+02:00`.
- Integration began at `2026-08-08T22:36:26.6726754+02:00`.
- Temporary worktree/branch cleanup completed at `2026-08-08T22:40:09.1595737+02:00`.
- Measured first-dispatch-through-cleanup wall span: `2387.844s`.
- Measured integration-through-cleanup wall span: `222.487s`.
- Exact orchestrator active coordination time and waiting time were not recorded. These wall spans
  include waits for parallel implementations, reviews, revisions and external verification and
  must not be interpreted as implementation throughput.

### Server and cleanup evidence

- Sol High initial/revision Playwright server PIDs were not exposed. Port 8081 was free after the
  initial suite at `2026-08-08T22:14:19+02:00`, after review at `22:25:46`, and after revision at
  `22:34:24`.
- Sol Medium initial full-suite Python PID 17508 started at `22:09:21`, exited, and port 8082 was
  free at `22:10:22`. Its revision PID 8136 started at `22:30:48`, exited, and port 8082 was free
  at `22:31:47`.
- Medium's isolated review checkout passed 7/7 on port 8083; the checkout was removed and the port
  was free at `2026-08-08T22:17:28+02:00`.
- Primary final Python PID 6272 started at `2026-08-08T22:38:10+02:00`, was observed listening at
  `22:38:26`, exited, and port 8080 was free when the suite ended at `22:39:06`.
- Ports 8080, 8081, 8082 and 8083 had no listeners at the final cleanup precheck on
  `2026-08-08T22:39:53.7360550+02:00`.
- Temporary worktrees `C:\CoM2-damage-calculator-R7.4-sol-high` and
  `C:\CoM2-damage-calculator-R7.4-sol-medium` were verified clean at their recorded tips, their
  absolute targets were resolved and checked, and they were removed. Temporary branches
  `codex/R7.4-sol-high` and `codex/R7.4-sol-medium` were deleted.
- Both resolved review artifacts were cleared; no disagreement survived. `git worktree list`
  contains only the primary checkout at integration commit `ab3828e`. Nothing was pushed.

## Task R9 -- Exhaustive stat-formula provenance audit

### Run metadata

| Field | Value |
|---|---|
| Task | R9 -- inventory every source-authored calculator stat formula, attach strongest implementation provenance, enforce coverage and anchor integrity, and retain unresolved evidence as explicit gaps |
| Date | 2026-08-09 |
| Time zone | Europe/Copenhagen (`+02:00`) |
| Frozen base | `1a4c38adfada4c2007d06c2e9c64017cca1f077f` |
| Integration branch | `codex/R7.3-integration` |
| Final integration commit | `96f1d8172f733e29ffd29be0e3a5ea720c7756bf` |
| Temporary tips | Sol High `0adb2d832fd88f7cedd3f484092c08e127c02963`; Sol Medium `7bbcd085bad5436914aa06fa415b3a3e7eeb4e86` |
| Models | Orchestrator GPT-5.6 Sol High; implementer/reviewer A GPT-5.6 Sol High; implementer/reviewer B GPT-5.6 Sol Medium |
| Ports | Primary 8080; Sol High 8081; Sol Medium 8082; isolated review checks 8083/8084 |
| Initial winner | Sol High: broader independently discovered inventory, more readable adjacent evidence, and substantially more defensible VERIFIED anchors; neither initial branch was complete |
| Most useful review | Sol High's review of Medium: six concrete findings, including formula omissions, marker leakage, incomplete version/table coverage, generic false-positive anchors, unreconciled gaps, and a whitespace failure |
| Strongest revised result | Sol High's 242-site revised audit plus the five direct helper formulas independently identified from Sol Medium's inventory |
| Final result | 247 formulas: 77 VERIFIED and 170 explicitly UNVERIFIED; R9-G1 remains live at priority 1 |
| Runtime behavior | Unchanged; edits in calculator JavaScript are provenance comments only |
| Push | None |

### Subagent timing

Parallel agent spans are independent and are not summed into end-to-end wall time. The agents used
slightly different stopwatch accounting: High separated substantive work from named setup/check
intervals, while Medium's reported active spans include its verification except for the separately
identified initial dependency wait. The table preserves each agent's labels rather than pretending
the accounting is identical.

| Agent | Stage | Start | End | Measured span | Active / waiting accounting |
|---|---|---|---|---:|---|
| Sol High | Initial implementation | `2026-08-09T00:58:56.6884080+02:00` | `2026-08-09T01:45:40.6467935+02:00` | `2803.962s` | Agent-reported implementation/audit/report `2305.646s`; setup, named verification and wait `498.316s`; dependency install `3.891s`; blocked `0s` |
| Sol High | Reciprocal review | `2026-08-09T01:50:12.8310215+02:00` | `2026-08-09T01:59:28.2820223+02:00` | `555.451s` | Active review `551.807s`; named checks `3.644s`; waiting/blocked `0s` |
| Sol High | Review-driven revision | `2026-08-09T02:03:06.5988940+02:00` | `2026-08-09T02:28:50.6632332+02:00` | `1544.065s` | Active revision `1486.056s`; named verification/wait `58.009s`; dependency/blocked `0s` |
| Sol High | Substantive active total | -- | -- | `4343.509s` | Sum of the three agent-reported substantive active intervals; named setup/check/wait intervals excluded |
| Sol Medium | Initial implementation | `2026-08-09T00:59:48.4634028+02:00` | `2026-08-09T01:32:36.1165351+02:00` | `1968.423s` | Agent-reported active `1945.171s`; dependency setup/wait `23.252s`; external waiting/blocked `0s` |
| Sol Medium | Reciprocal review | `2026-08-09T01:50:30.3376052+02:00` | `2026-08-09T01:56:55.3712030+02:00` | `385.039s` | Active span `385.039s`, including `55.064s` of named checks; waiting/blocked `0s` |
| Sol Medium | Review-driven revision | `2026-08-09T02:03:29.1874831+02:00` | `2026-08-09T02:21:05.6261926+02:00` | `1056.438s` | Agent-reported active `1056.438s`, including named checks; setup/wait/blocked `0s` |
| Sol Medium | Agent-reported active total | -- | -- | `3386.648s` | Initial active plus review and revision spans; initial dependency setup/wait excluded |

### Per-agent verification timing

#### Sol High

| Phase | Suite | Result | Start | End | Elapsed |
|---|---|---:|---|---|---:|
| Initial | Provenance audit/tooling | 172 total; 83 verified; 89 unverified; pass | recorded within initial verification block | recorded within initial verification block | `2.421s` |
| Initial | Node unit checks | 9,679/9,679 | recorded within initial verification block | recorded within initial verification block | `0.953s` |
| Initial | Full Playwright, port 8081 | 54 passed, 2 unrelated UI-state failures | recorded within initial verification block | recorded within initial verification block | `209.139s` |
| Initial | Failed-test retry | one tooltip race remained | recorded within initial verification block | recorded within initial verification block | `22.791s` |
| Initial | `git diff --check` | pass | recorded within initial verification block | recorded within initial verification block | `0.072s` |
| Review | Medium provenance, Node, diff, and full Playwright on port 8084 | provenance pass; 9,679/9,679; diff pass; 56/56 | `2026-08-09T01:50:30.3376052+02:00` | `2026-08-09T01:56:55.3712030+02:00` | named checks `55.064s` |
| Revision | Provenance audit/tooling | 242 total; 77 verified; 165 unverified; pass | `2026-08-09T02:25:32.2499775+02:00` | `2026-08-09T02:25:33.0057403+02:00` | `0.746s` |
| Revision | Node unit checks | 9,679/9,679 | `2026-08-09T02:26:09.5281119+02:00` | `2026-08-09T02:26:09.7383790+02:00` | `0.205s` |
| Revision | Full Playwright, port 8081 | 56/56 | `2026-08-09T02:26:26.3917141+02:00` | `2026-08-09T02:27:23.3818177+02:00` | `56.986s` |
| Revision | `git diff --check` | pass | `2026-08-09T02:27:32.5300742+02:00` | `2026-08-09T02:27:32.6080048+02:00` | `0.072s` |

The initial browser failures moved between expectations and did not correlate with the
comment/tooling-only implementation. Medium's fresh isolated review run passed 56/56, High's
revision passed 56/56, and the final integrated primary run also passed 56/56; they were therefore
recorded as flaky UI-state evidence rather than hidden or treated as an R9 behavior regression.

#### Sol Medium

| Phase | Suite | Result | Start | End | Elapsed |
|---|---|---:|---|---|---:|
| Initial | Provenance audit/tooling | 176 total; 39 verified; 137 unverified; pass | `2026-08-09T01:23:03.9507946+02:00` | `2026-08-09T01:23:06.5184576+02:00` | `2.556s` |
| Initial | Node unit checks | 9,679/9,679 | `2026-08-09T01:23:35.3222833+02:00` | `2026-08-09T01:23:36.1701742+02:00` | `0.844s` |
| Initial | Full Playwright attempt 1, port 8082 | 56 passed, 1 flaky failure | `2026-08-09T01:23:52.8778762+02:00` | `2026-08-09T01:26:26.0859666+02:00` | `153.185s` |
| Initial | Focused retry | 2 passed, 1 flaky failure at a different expectation | `2026-08-09T01:26:57.0739721+02:00` | `2026-08-09T01:27:09.7618884+02:00` | `12.686s` |
| Initial | Final full Playwright, port 8082 | 57/57 | `2026-08-09T01:28:54.3579880+02:00` | `2026-08-09T01:30:18.3234063+02:00` | `83.958s` |
| Initial | `git diff --check` | pass | `2026-08-09T01:30:35.3405200+02:00` | `2026-08-09T01:30:35.5955495+02:00` | `0.245s` |
| Review | High provenance, Node, diff, and full Playwright | provenance pass as implemented; 9,679/9,679; diff pass; 56/56 | `2026-08-09T01:50:12.8310215+02:00` | `2026-08-09T01:59:28.2820223+02:00` | named checks `3.644s`; review analysis supplied the remaining span |
| Revision | Provenance audit/tooling | 228 total; 14 verified; 214 unverified; pass | `2026-08-09T02:18:47.9592897+02:00` | `2026-08-09T02:18:48.8427479+02:00` | `0.885s` |
| Revision | Node unit checks | 9,679/9,679 | `2026-08-09T02:18:48.8427479+02:00` | `2026-08-09T02:18:49.0298344+02:00` | `0.178s` |
| Revision | Full Playwright, port 8082 | 57/57 | `2026-08-09T02:18:55.1527905+02:00` | `2026-08-09T02:19:53.6831731+02:00` | `58.533s` |
| Revision | `git diff --check` | pass | `2026-08-09T02:20:41.1802493+02:00` | `2026-08-09T02:20:41.2994541+02:00` | `0.117s` |

### Initial comparison

Both agents preserved runtime behavior and built executable provenance audits with adjacent
formula markers, omission detection, stale-anchor checks, explicit UNVERIFIED dispositions, and
documentation/backlog lifecycle updates. Both also made conservative evidence decisions instead
of converting prose or partial implementation matches into VERIFIED claims.

Sol High's initial implementation was stronger overall. It found 172 formulas and verified 83,
while Medium found 176 and verified 39, but raw verification count was not the deciding metric.
High's structured adjacent comments were more readable at each formula site, its reviewed source
bindings were easier to inspect, and its design had the clearer path to formula-specific source
digest enforcement. Medium's initial checker had stronger explicit mutation fixtures in some
areas and its independent inventory exposed formula families High had overlooked. Neither branch
met R9 initially: High missed base-preparation transforms and collapsed independently editable
table/dynamic sites, while Medium missed other direct/dynamic sites and allowed marker ownership
and generic-source false positives.

### Reciprocal review and dispositions

Sol Medium's review of High produced three P1 findings:

1. Discovery was partly circular and omitted six base-preparation transforms while aggregating
   independently editable table and dynamic Tactician formulas.
2. A wrong but code-shaped source range could replace Inner Power with Flame Blade and still pass.
3. VERIFIED metadata undercovered reachable versions and required runtime-table constants.

High fixed all three in `0adb2d8`: independent discovery expanded to 242 formula sites;
formula-specific/version-specific citations were bound to exact source-excerpt SHA-256 digests;
and incomplete claims were downgraded to explicit gaps.

Sol High's review of Medium produced six findings:

1. Formula discovery remained incomplete and did not classify every Calculator JavaScript file.
2. Adjacent marker leakage and reused IDs allowed one marker to cover another formula.
3. Applicable-version metadata and both runtime tables were incomplete.
4. Generic code-shape checks accepted semantically unrelated implementation ranges.
5. The grouped backlog gap was not exactly reconciled to formula-specific evidence gaps.
6. The branch failed the whitespace check at EOF.

Medium fixed all six in `7bbcd08`: 228 independently owned sites, explicit file classification,
version/table-aware semantic bindings, an exact 214-entry gap manifest and digest, negative
fixtures for marker and source mutations, and clean whitespace. No review dispute survived.
High's review was the more useful one because it supplied more independently actionable defects,
including actual marker leakage and the failing diff check. Medium's review was nevertheless
crucial: its three findings drove the selected implementation's exhaustive discovery and exact
source binding.

### Integration and final verification

Integration selected High's revised lineage and applied it as:

1. `ed34c22` -- High initial implementation (`5807988`);
2. `2d9d73d` -- High review-driven hardening (`0adb2d8`);
3. `96f1d81` -- add five direct helper formulas identified by comparing Medium's independent
   inventory: `weaponBonus`, `getLevelBonuses`, `realmOfUnitType`, `isNormalUnitType`, and
   `normalizeCombatUnit`; promote R9-G1 to backlog priority 1 and reconcile counts.

No mechanical merge of both branches was performed. High supplied the selected adjacent audit,
formula-specific digest manifest, independent discovery checker, mutation tests, and readable
source bindings. Medium materially supplied the five missing direct-formula sites and the priority
signal that unresolved implementation reconstruction is R9's immediate successor. Its separate
`STAT-PROVENANCE-GAPS.json` was not imported because the repository contract makes BACKLOG the
sole live calculator-work register and the selected adjacent UNVERIFIED markers already retain the
formula-specific pointers.

The combined result discovers 247 unique formulas: 77 have exact implementation/version/table
evidence and 170 remain explicitly UNVERIFIED in live gap R9-G1. Calculator JavaScript differs
from the frozen base only by comments, so R9 changes auditability rather than combat behavior.

| Final suite | Result | Start | End | Elapsed |
|---|---:|---|---|---:|
| Provenance audit/tooling | 247 total; 77 verified; 170 unverified; 10 tooling assertions | `2026-08-09T02:40:37.0557013+02:00` | `2026-08-09T02:40:37.8385439+02:00` | `0.767s` |
| Node unit checks | 9,679/9,679 | `2026-08-09T02:41:07.8880353+02:00` | `2026-08-09T02:41:08.1149811+02:00` | `0.224s` |
| Full Playwright, primary port 8080 | 56/56 | `2026-08-09T02:41:32.3533011+02:00` | `2026-08-09T02:42:31.8931026+02:00` | `59.522s` |
| `git diff --check` | pass | `2026-08-09T02:42:46.8378259+02:00` | `2026-08-09T02:42:46.9168314+02:00` | `0.075s` |
| Post-commit provenance audit/tooling | 247 total; 77 verified; 170 unverified; pass | after integration commit `96f1d81` | before cleanup at `2026-08-09T02:45:26.0289954+02:00` | separate elapsed not recorded |

`PLAYWRIGHT_REUSE_EXISTING` was absent for the final full suite. No manual server was started;
Playwright owned the server lifecycle and did not expose a PID. Port 8080 was free immediately
before and after the run.

### Orchestrator timing

- First implementation dispatch was recorded at `2026-08-09T00:57:43.5583106+02:00`; the second
  dispatch was recorded at `2026-08-09T00:59:09.7194401+02:00`.
- Reciprocal-review handoff began at `2026-08-09T01:49:42.8619705+02:00`.
- Review-driven revision handoff began at `2026-08-09T02:02:27.7132946+02:00`.
- Integration comparison began at `2026-08-09T02:31:52.8787367+02:00`.
- Temporary worktree/branch cleanup completed at `2026-08-09T02:45:26.0289954+02:00`.
- Measured first-dispatch-through-cleanup wall span: `6462.471s` (`1h47m42.471s`).
- Measured integration-through-cleanup wall span: `813.150s` (`13m33.150s`).
- Exact orchestrator active coordination time and waiting time were not recorded. These wall spans
  include waits for parallel implementations, reciprocal reviews, revisions, verification and
  cleanup and must not be interpreted as single-agent implementation throughput.

### Server and cleanup evidence

- Sol High used port 8081; Sol Medium used port 8082; isolated review checks used 8083/8084.
  Playwright-owned server PIDs were not exposed. Each agent confirmed its assigned port free at
  the end of its stage.
- The primary final suite used port 8080 with no reusable or manual server. Ports 8080, 8081,
  8082, 8083 and 8084 were all confirmed free at the cleanup gate.
- Temporary worktrees `C:\CoM2-damage-calculator-R9-sol-high` and
  `C:\CoM2-damage-calculator-R9-sol-medium` were verified clean at their recorded tips, their
  exact absolute paths were resolved, and they were removed. Temporary branches
  `codex/R9-sol-high` and `codex/R9-sol-medium` were deleted.
- Both resolved R9 review artifacts were cleared after every numbered finding had a final fixed
  disposition. `git worktree list` contains only the primary checkout. The primary branch was
  clean at integration commit `96f1d81` before this append-only benchmark entry was written.
  Nothing was pushed.

## Task R9-G1a -- Existing-evidence identity and creation-grant provenance

### Run metadata

| Field | Value |
|---|---|
| Task | R9-G1a -- close the 13 identity and creation-grant provenance gaps using checked-in implementation evidence only |
| Date | 2026-08-09 |
| Time zone | Europe/Copenhagen (`+02:00`) |
| Frozen base | `09b6783aed0d9642e9993fb45a1792f1bdd5dd08` |
| Integration branch | `codex/R7.3-integration` |
| Final integration commit | `46ab5291d3c15b09256eb86f711772a4fa24f2c8` |
| Temporary tips | Sol High `e12d3839edc6ccad16a76e1105107df42c2012c6`; Sol Xhigh `906f8ff840624bae5e892307f6fc7be82909a49c` |
| Models | Orchestrator GPT-5.6 Sol High; implementer/reviewer A GPT-5.6 Sol High; implementer/reviewer B GPT-5.6 Sol Xhigh |
| Ports | Primary 8080; Sol High 8081; Sol Xhigh 8082 |
| Initial winner | Sol High: it retained every calculator-applicable modern version, cited both Lava Smelter application paths, and registered the Warlord mismatches instead of hiding them by narrowing metadata |
| Most useful review | Sol Xhigh's review of High: it found the omitted Logistic bypass, caught that F54 prescribed behavior from a disabled spell, and separated the legacy wrapper from its R9-G1g-owned dependency |
| Strongest revised result | Sol High, with Sol Xhigh's narrower Chosen table binding and more precise F54/F55 wording integrated |
| Final result | 5 of 13 promoted; 82 VERIFIED and 165 UNVERIFIED overall; R9-G1a remains live with 8 gaps |
| Runtime behavior | Unchanged; calculator JavaScript edits are provenance comments only |
| Raw-binary reconstruction | None integrated; missing extents were surfaced for a separate independent task under the user's mid-run scope correction |
| Push | None |

The original packet allowed new address-backed reconstruction when necessary. During the initial
passes, AKH narrowed the task: any formula requiring a raw-binary extent not already reconstructed
must remain UNVERIFIED and the missing reconstruction must be surfaced. High removed four
uncommitted reconstruction/evidence files immediately; Xhigh made no reconstruction-artifact
change. Both revised branches and the integration obey that boundary.

### Subagent timing

Parallel spans are reported separately and are not summed as end-to-end time. Each agent reported
zero waiting/blocked time; dependency installation occurred inside the initial span, but its exact
duration was not separately recorded.

| Agent | Stage | Start | End | Active elapsed | Waiting / blocked |
|---|---|---|---|---:|---:|
| Sol High | Initial implementation | `2026-08-09T10:03:40.4561398+02:00` | `2026-08-09T10:30:04.5712686+02:00` | `1584.115s` | `0s` |
| Sol High | Reciprocal review | `2026-08-09T10:30:58.1904681+02:00` | `2026-08-09T10:35:17.4446069+02:00` | `259.254s` | `0s` |
| Sol High | Review-driven revision | `2026-08-09T10:36:46.0939084+02:00` | `2026-08-09T10:44:09.3593821+02:00` | `443.265s` | `0s` |
| Sol High | Active total | -- | -- | `2286.634s` | `0s` |
| Sol Xhigh | Initial implementation | `2026-08-09T10:04:02.7016309+02:00` | `2026-08-09T10:29:04.6210000+02:00` | `1501.919s` | `0s` |
| Sol Xhigh | Reciprocal review | `2026-08-09T10:31:11.5526924+02:00` | `2026-08-09T10:35:06.4371166+02:00` | `234.884s` | `0s` |
| Sol Xhigh | Review-driven revision and review responses | `2026-08-09T10:37:02.9405396+02:00` | `2026-08-09T10:47:02.7872064+02:00` | `599.847s` | `0s` |
| Sol Xhigh | Active total | -- | -- | `2336.650s` | `0s` |

### Per-agent verification timing

| Agent / phase | Suite | Result | Start | End | Elapsed |
|---|---|---:|---|---|---:|
| Sol High initial | Provenance audit/tooling | 247 total; 82 verified; 165 unverified; 10 assertions | `2026-08-09T10:26:27.9229464+02:00` | `2026-08-09T10:26:28.6738542+02:00` | `0.751s` |
| Sol High initial | Node unit checks | 9,679/9,679 | `2026-08-09T10:26:42.1909314+02:00` | `2026-08-09T10:26:42.3791753+02:00` | `0.188s` |
| Sol High initial | Full Playwright, port 8081 | 56/56 | `2026-08-09T10:27:21.9772245+02:00` | `2026-08-09T10:28:33.1731101+02:00` | `71.196s` |
| Sol High initial | `git diff --check` | pass | `2026-08-09T10:29:53.0992474+02:00` | `2026-08-09T10:29:53.1598311+02:00` | `0.061s` |
| Sol High revision | Provenance audit/tooling | 247 total; 82 verified; 165 unverified; 10 assertions | `2026-08-09T10:42:32.1678677+02:00` | `2026-08-09T10:42:32.9321400+02:00` | `0.764s` |
| Sol High revision | Node unit checks | 9,679/9,679 | `2026-08-09T10:42:38.5322944+02:00` | `2026-08-09T10:42:38.7323358+02:00` | `0.200s` |
| Sol High revision | Full Playwright, port 8081 | 56/56 | `2026-08-09T10:42:46.3239150+02:00` | `2026-08-09T10:43:43.7593829+02:00` | `57.435s` |
| Sol High revision | `git diff --check` | pass | `2026-08-09T10:44:01.3062666+02:00` | `2026-08-09T10:44:01.3539028+02:00` | `0.048s` |
| Sol Xhigh initial | Provenance audit/tooling | 247 total; 82 verified; 165 unverified; 10 assertions | `2026-08-09T10:25:58.2340000+02:00` | `2026-08-09T10:25:59.0020000+02:00` | `0.768s` |
| Sol Xhigh initial | Node unit checks | 9,679/9,679 | `2026-08-09T10:26:04.7380000+02:00` | `2026-08-09T10:26:04.9930000+02:00` | `0.255s` |
| Sol Xhigh initial | Full Playwright, port 8082 | 56/56 | `2026-08-09T10:26:54.9880000+02:00` | `2026-08-09T10:28:08.3980000+02:00` | `73.411s` |
| Sol Xhigh initial | `git diff --check` | pass | `2026-08-09T10:28:30.5750000+02:00` | `2026-08-09T10:28:30.7280000+02:00` | `0.153s` |
| Sol Xhigh revision | Provenance audit/tooling | 247 total; 82 verified; 165 unverified; 10 assertions | `2026-08-09T10:44:10.0948173+02:00` | `2026-08-09T10:44:10.9463680+02:00` | `0.852s` |
| Sol Xhigh revision | Node unit checks | 9,679/9,679 | `2026-08-09T10:44:20.8452250+02:00` | `2026-08-09T10:44:21.0294825+02:00` | `0.184s` |
| Sol Xhigh revision | Full Playwright, port 8082 | 56/56 | `2026-08-09T10:44:44.6262655+02:00` | `2026-08-09T10:45:45.8718299+02:00` | `61.246s` |
| Sol Xhigh revision | `git diff --check` | pass | `2026-08-09T10:45:59.6578214+02:00` | `2026-08-09T10:45:59.7023438+02:00` | `0.045s` |

Both agents' first Playwright attempt found that the isolated worktree lacked installed Node
dependencies. High ran `npm ci`; Xhigh ran `npm install`; each then completed the official suite
without `PLAYWRIGHT_REUSE_EXISTING`. The aborted pre-server attempts are not test failures.

### Initial comparison

Both agents independently reached the conservative 5/13 result: modern Combat Summoned and
Chosen, plus Warlord Lava Smelter Weapon Immunity, Missile Immunity and Flame Blade were
promotable; eight formulas were not. Both refused to convert partial evidence into VERIFIED
claims after the scope correction.

Sol High's initial result was stronger. It kept Warlord in the applicable-version metadata for
the two modern spell-result formulas, where the calculator still executes the gates, and opened
the Warlord behavior findings instead of masking them. It also attempted to bind both Lava
creation and Upgrade/Retrain paths. Its first tuple was still incomplete because it omitted the
Logistic bypass, and its first F54 wording treated a disabled custom spell as reachable.

Sol Xhigh's initial result had the cleaner M6 disposition and narrower table citations, but its
Lava anchors covered creation only while HISTORY claimed complete applicability, and it narrowed
the two spell-result formulas to base CoM2 even though the calculator still executes them for
Warlord.

### Reciprocal review and dispositions

Sol High's review of Xhigh produced three findings: incomplete Lava applicability evidence;
incorrect Warlord omission and lost behavior findings; and insufficiently concrete reconstruction
handoffs. Xhigh fixed the first two, added every already-known extent for the third, and correctly
disputed deriving the unknown Zombies table-row byte range under the user's scope boundary.

Sol Xhigh's review of High produced four findings: the missing Logistic bypass; F54's use of a
disabled custom spell; insufficient reconstruction boundaries; and duplicate ownership of the
legacy conversion chain. High fixed the Logistic tuple, rewrote F54 around the enabled Water
Elemental replacement and disabled custom entry, added every already-known extent, tied legacy
conversion to R9-G1g, and correctly disputed deriving the unknown Zombies table-row byte range.
It also folded the elemental-state mismatch into existing M6 rather than retaining duplicate F56.

No review disagreement survived except the identical, scope-mandated refusal to derive an unknown
Zombies raw-table bound. That is not a substantive dispute between agents; it is the handoff for
the separately requested independent reconstruction task. Sol Xhigh's review was more useful
overall because it found two integration-critical errors in the otherwise stronger High branch
and clarified task ownership.

### Integration and final verification

Integration selected Sol High's revised lineage (`137d14e`, `e12d383`) because it retained the
stronger all-applicable-version treatment, the checked-in `BU_Construct` span through the generic
type-table ability copy, and the expanded M6 scope. The final integration commit added Xhigh's
narrower one-line `ChosenUnitID` table citations and its more precise F54/F55 wording. No
mechanical merge of both branches occurred.

Five formulas are now VERIFIED and bound in the reviewed-anchor manifest:
`identity:combatSummoned`, `identity:chosen`, `lavaSmelter:weaponImmunity`,
`lavaSmelter:missileImmunity`, and `lavaSmelter:flameBlade`. R9-G1 decreased from 170 to 165
UNVERIFIED formulas; R9-G1a remains live with eight.

The separate reconstruction handoff is:

- CoM1 combat-summon identity tail `0x75D51-0x75D71` for
  `identity:com1ConstructCatapult` and `identity:com1SummonBranch`;
- Caster `@Spells@CombatSummonUnit` identity prefix `0x5CBEE0-0x5CC066` for
  `identity:constructCatapult` and `identity:callToArmsPaladins`; and
- the unrecorded `COM1_UT_ZOMBIES` type `0xAE` ability-row extent for `identity:zombies`, paired
  with the existing checked-in `BU_Construct` reconstruction at `unitcalc.c:1625-1703`.

`identity:legacyConversions` depends on R9-G1g. The two elemental Lava formulas depend on M6.
F54 and F55 record the Warlord spell-result behavior defects. Runtime behavior is unchanged.

| Final suite | Result | Start | End | Elapsed |
|---|---:|---|---|---:|
| Provenance audit/tooling | 247 total; 82 verified; 165 unverified; 10 assertions | `2026-08-09T10:50:05.3730007+02:00` | `2026-08-09T10:50:06.1691039+02:00` | `0.802s` |
| Node unit checks | 9,679/9,679 | `2026-08-09T10:50:06.1791004+02:00` | `2026-08-09T10:50:06.3797097+02:00` | `0.198s` |
| Full Playwright, primary port 8080 | 56/56 | `2026-08-09T10:50:11.4668821+02:00` | process completion observed by `2026-08-09T10:51:18.7654740+02:00` | observed wall interval `67.299s`; runner reported `57.0s` |
| `git diff --check` | pass | `2026-08-09T10:51:21.7050336+02:00` | `2026-08-09T10:51:21.7876319+02:00` | `0.074s` |

`PLAYWRIGHT_REUSE_EXISTING` was absent. The primary server PID 17524 was observed on port 8080 at
`2026-08-09T10:50:28.9770239+02:00`; it exited with the suite, and port 8080 was free at
`2026-08-09T10:51:18.7654740+02:00`.

### Orchestrator timing and cleanup

- Implementation dispatches: Sol High `2026-08-09T10:03:40.4561398+02:00`; Sol Xhigh
  `2026-08-09T10:04:02.7016309+02:00`.
- Reciprocal-review dispatches: Sol High `2026-08-09T10:30:58.1904681+02:00`; Sol Xhigh
  `2026-08-09T10:31:11.5526924+02:00`.
- Review-driven revision dispatches: Sol High `2026-08-09T10:36:46.0939084+02:00`; Sol Xhigh
  `2026-08-09T10:37:02.9405396+02:00`.
- Integration comparison began at `2026-08-09T10:49:09.3604589+02:00`; integration commit
  `46ab529` was ready at `2026-08-09T10:51:28.6856011+02:00`.
- Temporary cleanup completed at `2026-08-09T10:52:32.2635228+02:00`.
- First-dispatch-through-cleanup wall span: `2931.807s` (`48m51.807s`).
- Integration-through-cleanup wall span: `202.903s` (`3m22.903s`).
- Exact orchestrator active coordination and waiting time were not separately recorded. The wall
  spans include waits for parallel agents and verification and are not implementation throughput.

Sol High used Python server PIDs 19260 initially and 884 during revision; Sol Xhigh used PIDs
11692 and 9104. Each exited and its assigned port was confirmed free. At cleanup, ports 8080,
8081 and 8082 were free; both worktrees were clean at their recorded tips; exact targets
`C:\CoM2-r9-g1a-sol-high` and `C:\CoM2-r9-g1a-sol-xhigh` were validated and removed; temporary
branches were deleted; and both resolved review artifacts were cleared. `git worktree list`
contains only the primary checkout. Nothing was pushed.
