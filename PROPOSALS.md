<!-- Tier: channel. Agents append; only the user merges, edits or deletes. -->

Document: CLAUDE.md
Section: Architecture
Change: addition
Text:
CP 1.60 and CoM 1's two Specials calls use one shared routine with distinct invocation positions,
arguments and execution/hover trace entries. The execution model must preserve changes between
calls rather than treating the routine as one pass or blindly applying every effect twice.
