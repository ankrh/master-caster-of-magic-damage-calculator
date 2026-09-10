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
