<!-- Tier: channel. Agents append; only the user merges, edits or deletes. -->

Document: TESTS.md
Section: 2. node-unit-checks — the family table
Change: deletion
Text:
| `version_gate_divergence` | `applyVersionGating` as the one implementation of the clearing |

Document: TESTS.md
Section: 2. node-unit-checks — the family table, in place of the deleted row
Change: addition
Text:
| `version_gating` | `abilityVersionGated` as the one gating test, and `applyVersionGating` as the one implementation of the clearing |

Document: CLAUDE.md
Section: Input/output contract, first paragraph
Change: deletion
Text:
The user specifies the version, a roster unit or a custom unit both for the attacker and defender, and a set of enchantments and conditions for the attacker and defender.

Document: CLAUDE.md
Section: Input/output contract, first paragraph, in place of the deleted sentence
Change: addition
Text:
The user specifies the version, a roster unit or a custom unit both for the attacker and defender, and a set of enchantments and conditions for the attacker and defender. A condition includes what the side’s owning wizard supplies — a retort it holds, its spell-book counts, its casting skill — stated per side on the same channel as any other condition.

Document: CLAUDE.md
Section: Architecture, appended to the paragraph introducing the phase table
Change: addition
Text:
The two groups of phases are named for different reasons. `a` to `e` are bins of the binary's own
code regions: which region a write sits in is evidence, but the boundaries between them are the
engine's code layout rather than anything the game does, and a bin may be split where a reading
shows one region is really two execution passes. **`immunities`, `buffs` and `debuffs` are one
moment — cast time — divided into three bins by the calculator's ruling about the most likely order
the casts happened in.** Their effect-kind names are that ruling: an immunity is assumed cast before
a beneficial enchantment, which is assumed cast before a curse. That is why a marked write's bin is
decided by what kind of effect it is, while a recalculation write's bin is decided by where the code
is.
