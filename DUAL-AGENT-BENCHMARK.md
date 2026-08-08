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
- Unless AKH explicitly requests another configuration, new implementation runs use GPT-5.6 Sol
  at High for the orchestrating main agent, with independent implementation subagents running
  GPT-5.6 Sol at High and GPT-5.6 Sol at Medium. Historical records preserve their actual
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
| Sol High subagent | GPT-5.6 Sol | High | Initial implementation | `<timestamp>` | `<timestamp>` | `<duration>` | `<commit>` |
| Sol High subagent | GPT-5.6 Sol | High | Reciprocal review | `<timestamp or not recorded>` | `<timestamp>` | `<duration>` | — |
| Sol High subagent | GPT-5.6 Sol | High | Review-driven revision | `<timestamp>` | `<timestamp>` | `<duration>` | `<commit>` |
| Sol High subagent | GPT-5.6 Sol | High | Active total | — | — | `<duration>` | — |
| Sol Medium subagent | GPT-5.6 Sol | Medium | Initial implementation | `<timestamp>` | `<timestamp>` | `<duration>` | `<commit>` |
| Sol Medium subagent | GPT-5.6 Sol | Medium | Reciprocal review | `<timestamp or not recorded>` | `<timestamp>` | `<duration>` | — |
| Sol Medium subagent | GPT-5.6 Sol | Medium | Review-driven revision | `<timestamp>` | `<timestamp>` | `<duration>` | `<commit>` |
| Sol Medium subagent | GPT-5.6 Sol | Medium | Active total | — | — | `<duration>` | — |

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
| Sol High subagent | Initial implementation | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High subagent | Reciprocal review | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High subagent | Review-driven revision | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High subagent | Each verification suite | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol High subagent | Active total | - | - | `<seconds>` | `<seconds>` |
| Sol Medium subagent | Initial implementation | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol Medium subagent | Reciprocal review | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol Medium subagent | Review-driven revision | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol Medium subagent | Each verification suite | `<timestamp>` | `<timestamp>` | `<seconds>` | `<seconds>` |
| Sol Medium subagent | Active total | - | - | `<seconds>` | `<seconds>` |

Also record `primary_port`, `sol_high_port`, `sol_medium_port`, each server PID, server start/stop
times, and the timestamp when each temporary port was confirmed free.
