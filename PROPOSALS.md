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

