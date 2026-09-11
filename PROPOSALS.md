<!-- Tier: channel. Agents append; only the user merges, edits or deletes. -->

Document: CLAUDE.md
Section: Architecture
Change: addition
Text:
Represent repeated execution of a unit-stat routine by reusing its implementation, with a
separate position, input arguments and execution/hover trace entry for each call. Each call
uses the state present at that point, including changes made since the previous call.
The call sequence and arguments follow each game version's own engine; sharing an
implementation does not impose one version's sequence on another.

Document: CLAUDE.md
Section: Architecture
Change: addition
Text:
For each effect or spell application, establish the applicable version's engine recalculation
calls and their order, reusing existing reconstruction first. Assess whether replacing that
sequence with a full calculator recalculation pass preserves calculated results, persistent
state changes and subsequent effect eligibility. Prefer the shared full pass where equivalence
is established; otherwise preserve the required sequence and record the specific difference
or unresolved evidence that prevents simplification.
