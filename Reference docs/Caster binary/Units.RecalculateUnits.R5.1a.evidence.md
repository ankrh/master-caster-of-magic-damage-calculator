# R5.1a region-a verification evidence

This durable companion supports the canonical source-shaped body in
`Units.RecalculateUnits.pas` for `@Units@RecalculateUnits`,
`$00599920..$0059A02C`. The binary identity is owned by this directory's
`README.md`; its md5 was rechecked before this audit.

Provenance: Codex 2026-08-02, single-agent audit of the existing reconstruction.
This is certification and re-reading of R5.1a, not an independent dual derivation.

The whole-routine inbound scan finds no branch that straddles the assigned
`$00599920..$0059A02C` extent. It does find the outer first-pass back-edge from
`$005A681C` `0f855b31ffff jne 0x59997d` into `$0059997D`; the Pascal `for i := 1
to Maxunits` represents that loop even though its increment and back-edge live
after the later `c`/`d` blocks.

## Conditional-branch targets (23)

Every semantic conditional below quotes its instruction bytes, literal target,
and what begins at that target. Range/overflow guards are compiler-only under the
reconstruction conventions. The stack-probe loop is included because the checker
classifies it as a conditional; it remains routine scaffolding rather than game logic.

- `$00599931` `75f6 jne 0x599929` -> `$00599929`: `81c404f0ffff add esp, 0xfffff004` (subtract `$FFC`), the next stack-probe page; after the probe loop, semantic setup resumes at `$00599948` by loading the combat-state pointer.
- `$0059996D` `0f8eafce0000 jle 0x5a6822` -> `$005A6822`: `e8a50effff call 0x5976cc`, `@Units@BuildAuraTable`; a non-positive unit count skips the entire first pass and begins region `e`'s aura preparation.
- `$005999A9` `0f8567ce0000 jne 0x5a6816` -> `$005A6816`: `ff45f0 inc dword ptr [ebp-$10]`, followed by decrement/test of the saved loop count and the back-edge to `$0059997D`; a dead unit continues the outer first-pass loop.
- `$005999B3` `7432 je 0x5999e7` -> `$005999E7`: `837df4ff cmp dword ptr [ebp-$0C], -1`; `com = False` bypasses the `incombat` test and proceeds to the optional location filter.
- `$005999E1` `0f842fce0000 je 0x5a6816` -> `$005A6816`: the outer-loop increment/back-edge described above; in combat mode, a base unit not marked `incombat` is skipped.
- `$005999EB` `0f849c000000 je 0x599a8d` -> `$00599A8D`: unit-address calculation leading to `$00599AB1 movsx eax, word ptr [U.combatmaxmoves]`; `tax = -1` bypasses all three location comparisons.
- `$00599A1F` `0f85f1cd0000 jne 0x5a6816` -> `$005A6816`: the outer-loop increment/back-edge; a plane mismatch skips the unit.
- `$00599A53` `0f85bdcd0000 jne 0x5a6816` -> `$005A6816`: the outer-loop increment/back-edge; an overland-X mismatch skips the unit.
- `$00599A87` `0f8589cd0000 jne 0x5a6816` -> `$005A6816`: the outer-loop increment/back-edge; an overland-Y mismatch skips the unit.
- `$00599BAB` `7558 jne 0x599c05` -> `$00599C05`: `b001 mov al, 1`, then `$00599C19` stores the true aggregate flag; a set base/aggregate source short-circuits later sources.
- `$00599BC7` `753c jne 0x599c05` -> `$00599C05`: the same true-result/store path; a set item/derived source short-circuits combat and overland sources.
- `$00599BE3` `7520 jne 0x599c05` -> `$00599C05`: the same true-result/store path; a set combat source short-circuits the overland source.
- `$00599BFF` `7504 jne 0x599c05` -> `$00599C05`: the same true-result/store path; a set overland source produces true, while fall-through clears EAX and produces false.
- `$00599C27` `0f8536ffffff jne 0x599b63` -> `$00599B63`: address calculation and source tests for the next enchantment ID; the loop covers IDs 1 through 100.
- `$00599C59` `7532 jne 0x599c8d` -> `$00599C8D`: `a1ac927000 mov eax, [$007092AC]`, beginning `Attacker + Defender - owner`; Possession enters the owner swap without testing Creature Binding.
- `$00599C87` `0f848c000000 je 0x599d19` -> `$00599D19`: address calculation leading to the aggregate `EncConfusion` test at `$00599D3D`; neither ownership enchantment skips the first owner swap.
- `$00599D45` `752c jne 0x599d73` -> `$00599D73`: address calculation leading to the `confusioneffect = 2` test at `$00599D97`; present Confusion preserves the current effect byte.
- `$00599D9F` `0f858c000000 jne 0x599e31` -> `$00599E31`: address calculation leading to the base-unit type comparison at `$00599E55`; any Confusion effect other than 2 skips the second owner swap.
- `$00599E5E` `752c jne 0x599e8c` -> `$00599E8C`: address calculation leading to the base `incombat` test at `$00599EB0`; a non-Golem skips the derived Resist Elements flag.
- `$00599EB8` `752e jne 0x599ee8` -> `$00599EE8`: address calculation leading to the aggregate Chaos Channels Breath test at `$00599F0C`; an in-combat base unit preserves `PandoraBoxBudget`.
- `$00599F14` `0f848e000000 je 0x599fa8` -> `$00599FA8`: address calculation leading to the `combatsummoned` test at `$00599FCC`; absent Chaos Channels Breath skips all three of its writes.
- `$00599FD4` `742c je 0x59a002` -> `$0059A002`: `a1f89a7000 mov eax, [$00709AF8]`, beginning the early-script enabled test; a unit not combat-summoned skips the derived `Fantastic` write.
- `$0059A00A` `7420 je 0x59a02c` -> `$0059A02C`: `8b45f0 mov eax, dword ptr [ebp-$10]`, the first address calculation of region `c`'s Heroism block; disabled recalculation scripts skip both early-hook calls.

## Calls (2)

- `$0059A019` `e8d26cffff call 0x590cf0` -> `@Scripts@SetScriptNumVar`, with EAX=`$005A7A6C` (`U`), EDX=`i`, ECX=`1`.
- `$0059A027` `e8e88bfeff call 0x582c14` -> `@Scripts@RunScript`, with EAX=`[$00707FB4]` (`UnitCalcPre` handle) and DL=`1`.

Compiler range/overflow calls are deliberately excluded. No executable call is
hidden behind a synthetic helper; the two inferred Pascal declarations represent
these two real call targets.

## State writes

The verifier tracks 16 writes in this extent. Three are loop/cache locals rather
than unit fields, but they are listed because they affect subsequent addressing or
control. The complete-record `REP MOVSD` is listed separately because the checker
does not classify that mnemonic as a named-field write.

- `$0059994D` `c6802203000000`: clear combat-state byte `+$322` (`inferred_DefenderSight`).
- `$00599959` `c6802303000000`: clear combat-state byte `+$323` (`inferred_AttackerSight`).
- `$00599973` `8945dc`: save the positive unit count in `[EBP-$24]`, the first-pass loop counter.
- `$00599ACB` `898495b08efdff`: save sign-extended `U.combatmaxmoves` in `prevmaxmoves[i]`.
- `$00599B54` `c68482a16d420600`: clear aggregate `U.EnchantmentFlags[EncMagic]`.
- `$00599B8E` `8945d8`: cache the current unit-record base in `[EBP-$28]` for the flag merger.
- `$00599C19` `88841108050000`: store the merged enchantment flag for ID `j`.
- `$00599D12` `888491316f4206`: store the first ownership swap in `U.owner`.
- `$00599D6B` `c684824b6f420600`: clear `U.confusioneffect` when aggregate Confusion is absent.
- `$00599E2A` `888491316f4206`: store the Confusion-effect ownership swap in `U.owner`.
- `$00599E84` `c68482dc6e420601`: set `U.ItemEnchantmentFlags[EncResistElements]` for a Golem.
- `$00599EDE` `66c78482341eac010000`: clear `BU.PandoraBoxBudget` outside combat.
- `$00599F3E` `838482c868420604`: add 4 to `U.firebreath` for Chaos Channels Breath.
- `$00599F71` `c784821469420612000000`: set `U.race` to 18 (`RCChaos`).
- `$00599FA0` `c684826769420601`: set `U.Fantastic` for Chaos Channels Breath.
- `$00599FFA` `c684826769420601`: set `U.Fantastic` for a combat-summoned unit.
- `$00599B2E` `f3a5 rep movsd`: copy exactly `$01E1` dwords from `BaseUnits[i]` to `Units[i]`, replacing the complete current unit record.

Loop-index initialization/increments and parameter spills are represented by the
Pascal `for` loops and procedure signature. They are routine scaffolding, not
additional game-state writes.

## Arithmetic audit

There is no signed-division, shift-with-correction, or rounding idiom in region
`a`. The two owner swaps preserve the executable expression
`Attacker + Defender - current owner`; their `jno` and signed-byte range checks
are compiler overflow/range guards. `Inc(U.firebreath, 4)` likewise preserves the
only gameplay arithmetic before `UnitCalcPre`.

## Coverage ledger

| Row | Start | End | Within | Disposition | Reconstruction location |
|---:|---|---|---:|---|---|
| 0 | `$00599920` | `$00599960` | — | reconstructed | Procedure setup and both combat sight-byte clears |
| 1 | `$00599960` | `$00599A8D` | — | reconstructed | Unit-count gate, first-pass loop and unit filters |
| 2 | `$00599A8D` | `$00599B30` | 1 | reconstructed | Save movement and replace current record from base record |
| 3 | `$00599B30` | `$00599C2D` | 1 | reconstructed | Clear EncMagic and rebuild aggregate enchantment flags |
| 4 | `$00599C2D` | `$00599D19` | 1 | reconstructed | Possession/Creature Binding owner swap |
| 5 | `$00599D19` | `$00599E31` | 1 | reconstructed | Confusion state and effect-2 owner swap |
| 6 | `$00599E31` | `$00599E8C` | 1 | reconstructed | Golem derived Resist Elements source flag |
| 7 | `$00599E8C` | `$00599EE8` | 1 | reconstructed | Out-of-combat Pandora Box budget reset |
| 8 | `$00599EE8` | `$00599FA8` | 1 | reconstructed | Chaos Channels Breath writes |
| 9 | `$00599FA8` | `$0059A002` | 1 | reconstructed | Combat-summoned Fantastic write |
| 10 | `$0059A002` | `$0059A02C` | 1 | reconstructed | UnitCalcPre enabled gate and both script calls |

Current completion counts:

- `unresolved ranges: 0`
- `synthetic helpers without bodies: 0`
- `semantic conditional jumps omitted: 0`
- `semantic calls omitted: 0`
- `state writes omitted: 0`
- `declared parent mismatches: 0`

**R5.1a region `a` is complete under the current reconstruction gate.**
