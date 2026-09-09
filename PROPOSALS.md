<!-- Tier: channel. Agents append; only the user merges, edits or deletes. -->

Document: CLAUDE.md
Section: Architecture
Change: addition
Text:
Compatibility-only code is not kept. A second code path that exists solely so an older call shape,
input map or stored value keeps working is part of the migration that introduced it, and it is
deleted in the change that finishes that migration. Where it cannot be deleted immediately, its
removal is a TASKS item rather than a permanent second path: a shim left in place obliges every
later change to keep re-establishing that it is still safe.

Document: CLAUDE.md
Section: Deliberate deviations
Change: addition
Text:
- **CoM 1's two combat-summon identity conversions are ranked at the head of region `a`, ahead of
  the region-`c` position the engine gives them.** `BU_UnitLoadToBattle` writes `bu->race` and
  `bu->Abilities |= UA_FANTASTIC` (com1:0x75D56/0x75D65/0x75D6C) between two stages that region `c`
  draws from: `Load_Battle_Unit` (which applies Survival Instinct at com1:0x8F277 and returns
  first) and `BU_Apply_Battlefield_Effects` (whose second `BU_Apply_Specials` call at com1:0x90743
  takes `battleEnchantments & ~persistentEnchantments` with the mutations byte zero, and so does
  see the conversion). The faithful rank is that boundary inside region `c`; the rank taken
  reproduces the behaviour the pre-F267.1 `template` misfiling had, so that the reclassification
  moves no number. Splitting region `c` at the routine boundary is the correction, and until it is
  made a CoM 1 combat summon's realm and Fantastic flag are visible to every region-`c` read
  rather than only to those after `Load_Battle_Unit`.

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
Section: Architecture
Change: deletion
Text:
Spell targeting is assumed to read the permanent (base) record.

Document: CLAUDE.md
Section: Architecture, in place of the deleted line
Change: addition
Text:
Spell targeting reads the record its own arm names, and the two are not the same arm to arm.
`SGUnitBuffNormalUnit` (group 15) reads the permanent record and `SGUnitCurseNormalUnit` (group 16)
reads the calculated one, from mirrored blocks that differ only in the array base
(`Reference docs/Caster binary/F264.1.evidence.md`). A targeting gate is read, not assumed; where no
reading exists yet, the gap is named rather than filled by a default.

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
