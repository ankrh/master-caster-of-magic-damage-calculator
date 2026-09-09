<!-- Tier: channel. Agents append; only the user merges, edits or deletes. -->

Document: CLAUDE.md
Section: Deliberate deviations
Change: addition
Text:
- **An innate Undead or Teleporting control declares the flag, it does not derive it.** Both are
  condition flags that gate a normalisation and derive no ability field, so nothing in either engine
  makes a unit's roster record evidence of the flag. Ticking the innate control declares that the
  permanent record already carries `EncUndead` / the permanent Teleporting flag when combat
  recalculation begins, whatever put it there.

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
Change: addition
Text:
| `worker_boundary` | the matrix worker's source boundary: that the nine `data-worker` sources resolve and run alone, statically and by driving `MATRIX_WORKER_HANDLER` in a realm holding only them |

Document: TESTS.md
Section: 2. node-unit-checks — the "Only it can fail" paragraph
Change: deletion
Text:
It evaluates no preset itself.

Document: TESTS.md
Section: 2. node-unit-checks — the "Only it can fail" paragraph, in place of the deleted sentence
Change: addition
Text:
No suite here compares a preset's numbers: the `worker_boundary` family derives fixtures to obtain
the stats it hands the matrix worker, and checks no value against an `expected` block.

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
Section: Input/output contract — after the first paragraph ("The user specifies the version, …")
Change: addition
Text:
Some of what a side states is a property of its *owning wizard* rather than of the unit: a retort
the wizard holds, its per-realm spell-book counts, its base casting skill, its research state. These
are stated per side on the same enchantment-and-condition channel as everything else, are version
gated the same way, and are gated internally the same way — a wizard-level mark on a unit the
engine's own test refuses moves nothing.
