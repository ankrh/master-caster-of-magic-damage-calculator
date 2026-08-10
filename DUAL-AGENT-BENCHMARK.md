# Dual-agent implementation benchmark

Compact comparison ledger for method-2 runs. Raw timestamps, test tables, server PIDs, branch
tips, and review dispositions from runs before 2026-08-10 remain recoverable from git history;
they are deliberately not repeated here.

For new runs, add one table row and at most one short note. Record missing timing as `not recorded`.
Active times exclude waiting and parallel totals are never added together.

| Task | Date | Agents | Initial / revised judgment | Integration and final commit | Active time |
|---|---|---|---|---|---|
| R8.1, internal identity records | 2026-08-08 | Luna Max / Sol High | Sol was the stronger base; Luna supplied focused identity coverage. | Sol core + Luna test, `6d82215` | Luna ~36m43s; Sol ~27m01s |
| R8.2, independent identity controls | 2026-08-08 | Luna / Sol | No formal initial winner; Luna's revised result was selected. | Luna revision, `5fdea7b` | Luna initial ~22m57s; remaining active time not recorded |
| R8.3, ordered identity conversions | 2026-08-08 | Luna High / Sol Low | Split result; Luna supplied the implementation and UI coverage, Sol supplied review corrections. | Luna lineage + Sol corrections, `4545b48` | Luna total not recorded; Sol review+revision 568s |
| R8.4, identity lifecycle migration | 2026-08-08 | Sol High / Sol Medium | High was stronger and found Medium's live-identity and Matrix gaps; Medium found the raw-share defect and supplied Matrix parity coverage. | High base + Medium test, `3495099` | phase spans: High 1,932s; Medium 1,532s |
| R7.3, ordered modifier traces | 2026-08-08 | Sol High / Sol Medium | High was stronger; its review produced three executable failures. Medium supplied clamp and distance regressions. | High base + Medium fixes/tests, `c686e50` | High 1,787s; Medium 1,132s |
| R7.4, modifier trace tooltips | 2026-08-08 | Sol High / Sol Medium | High's authoritative display path won; High's review exposed the stale-overlay defect shared by both designs. | High base + Medium tooltip tests, `ab3828e` | High 1,838s; Medium active total not recorded |
| R9, exhaustive formula provenance | 2026-08-09 | Sol High / Sol Medium | High had broader and more defensible coverage; Medium independently found five missing helper formulas. | High audit + Medium helpers, `96f1d81` | High 4,344s; Medium 3,387s |
| R9-G1a, existing identity evidence | 2026-08-09 | Sol High / Sol Xhigh | High preserved applicable versions and both Lava paths; Xhigh supplied the most useful review and tighter bindings. | High base + Xhigh corrections, `46ab529` | High 2,287s; Xhigh 2,337s |
| F22, Blood Lust Thrown | 2026-08-09 | Sol High / Sol Xhigh | Xhigh narrowly won on deterministic boundary coverage; neither review found a production defect. | Xhigh base + High UI matrix, `4225c9a` | High 798s; Xhigh 1,710s |

## What the runs established

- Independent implementations repeatedly found different valid defects and test gaps; reciprocal
  review materially improved the integrated result.
- The stronger initial implementation was not always the sole source of the final result. Focused
  tests and narrow review findings from the other branch were often retained.
- Exact process telemetry grew much faster than its decision value. Future entries therefore keep
  comparison evidence, final outcome, active time, and cleanup status—not per-command logs.
- Historical runs used configurations and integration branches that are no longer permitted by the
  current protocol. They are records, not precedents.
