# `@Units@RecalculateUnits` R5.1c-b completion evidence

This is the durable evidence companion for the merged R5.1c-b source-shaped reconstruction in
`Units.RecalculateUnits.pas`. It covers these assigned half-open extents:

- `@Units@RecalculateUnits`: `$005A6FDF..$005A7A70`
- `@Units@Immobile`: `$005951D4..$005952DB`
- `@Units@TotalHpLeft`: `$00595354..$005953D8`
- `@Combat@Iscombat`: `$005B9C54..$005B9C6A`
- `@Units@HpPerFigure`: `$00595DB0..$00595E24`
- `@Game@Min`: `$005FCF7C..$005FCFA5`

The binary identity remains solely in `README.md`. Provenance: Claude and Codex independently
derived all six extents on 2026-08-02. Codex then reviewed Claude's derivation against quoted
instruction bytes and found no actionable defect. Claude's reciprocal review of Codex was not
available before the user-directed merge. The two derivations have no surviving disagreement;
merged by Codex 2026-08-02 from their union. The missing reciprocal review was completed
afterwards: Claude 2026-08-03, all six extents re-read cold from the binary, no semantic
misreading found; the five reproducibility and naming defects it raised are fixed here and in
`Units.RecalculateUnits.pas`.

Verified: Codex 2026-08-02, independent (derivation) + reviewed; Claude 2026-08-02, independent
(derivation); Claude 2026-08-03, reviewed ($005A7057, $005A7076, $005A7114, $005A78A5,
$005A761B).

## Entry and enclosing gates

`annotate_caster_disasm.py --inbound` found no branch straddling any whole assigned extent.
`$005A695D 0f8e7c060000 jle $005A6FDF` enters the main extent after an empty aura pass. Five
earlier second-loop `Continue` branches land at `$005A7A57`, and `$005A6834
0f8e29120000 jle $005A7A63` skips the whole loop when `Maxunits <= 0`.

## Field and global bindings first completed here

Offsets are direct displacement-minus-base results (`$06426898` for Units, `$01AC1798` for
BaseUnits); field names and types are from shipped `Typedec.pas`:

| Field | Offset | Type | Anchor |
|---|---:|---|---:|
| `hp` | `+$080` | Integer | `$00595DDD` |
| `figures` | `+$088` | Integer | `$0059538A` |
| `invisible` | `+$0D5` | Boolean | `$005A769C` |
| `combatmovesleft` | `+$4FA` | SmallInt | `$005A75CD` |
| `Totaldamage` | `+$500` | SmallInt | `$005953BD` |
| `Overdamage` | `+$506` | SmallInt | `$005A7789` |
| `combatattacksdone` | `+$69A` | ShortInt | `$005A75FA` |
| `bonushp` | `+$6A4` | SmallInt | `$00595E09` |
| `maxmp` / `mp` | `+$6A8` / `+$6AA` | SmallInt | `$005A7142` / `$005A746F` |
| `webleft` | `+$6B2` | ShortInt | `$00595201` |
| `stealth` | `+$6D0` | Boolean | `$005A76C8` |

`$00709BD8` is the pointer behind TD32-named `@Castercore@DebugInvis` and
`@Castercore@ToggleDebugInvis`; `@Init@ClearGameVariables` clears it. `$00708324` is the pointer
behind `@Castercore@CombatPlane`; its value `-1` means no combat.

### The Supreme Light gate's combat-global member

The gate is the only conditional in this extent that reads outside the unit records, so its
binding is given in full:

```text
$005A7057 8b45e0            mov  eax,[ebp-$20]      ; ownCG
$005A705B 83f801 7605 …     dec / cmp eax,1 / jbe   ; declared bound 1..2
$005A7066 6bc032            imul eax,eax,$32
$005A7070 8b159c967000      mov  edx,[$0070969C]    ; global_CombatStatePtr
$005A7076 83bcc290feffff00  cmp  dword [edx+eax*8-$170],0
```

The side stride is `$32 * 8 = $190` bytes, which is exactly
`Maxmaxcombatenchantments * 4` (`SharedConstants.pas:31`), so each side holds a 100-element
`Integer` array and the element index behind a displacement `-$N` is `(($190 - $N) div 4) + 1`.
For `-$170` that is **9**, and `Warlord 1.5.12.6.2/MASTER.CAS:941` declares `CGSupremeLight = 9`.
The same formula resolves every other member the reconstruction reads, with none left over:
`-$18C` → 2 `CGEntangle`, `-$184` → 4 `CGMassInvisibility`, `-$17C` → 6 `CGBlazingMarch`,
`-$178` → 7 `CGWarpReality`, `-$174` → 8 `CGPrayer`, `-$16C` → 10 `CGHighPrayer`,
`-$168` → 11 `CGDarkness`, `-$160` → 13 `CGTerror`, `-$158` → 15 `CGBlackPrayer`,
`-$154` → 16 `CGBreakthrough`. The identifications are therefore exact, not inferred.

## Conditional-branch targets

Every semantic conditional is listed with encoded bytes, literal target, and what begins there.
Range/overflow guards are compiler-only. The signed-division correction branch is preserved in
the arithmetic section.

### `@Units@RecalculateUnits` — 21

- `$005A7003 80bc823a1eac0100` / `$005A700B 0f843a040000 je $005A744B` -> MP clamp; skips Supreme Light when `B.incombat = 0`.
- `$005A7043 3b02` / `$005A7045 7509 jne $005A7050` -> `$005A7050 c745e002000000`, `ownCG := 2`; equality stores 1.
- `$005A7076 83bcc290feffff00` / `$005A707E 0f8ec7030000 jle $005A744B` -> MP clamp; Supreme Light inactive.
- `$005A70B4 84c0` / `$005A70B6 0f8595000000 jne $005A7151` -> Supreme Light body; current ranged is magical.
- `$005A70EC 84c0` / `$005A70EE 7561 jne $005A7151` -> same body; base ranged is magical.
- `$005A7114 83bc821469420613` / `$005A711C 7433 je $005A7151` -> same body; current race is `RCLife` ($13), the shipped constant at `SharedConstants.pas:958`. Race doubles as the magic realm for summoned units.
- `$005A7142 6683bc82406f420600` / `$005A714B 0f8efa020000 jle $005A744B` -> MP clamp; no positive max MP and no earlier eligibility arm.
- `$005A7175 83bc82b817ac0100` / `$005A717D 0f8eac000000 jle $005A722F` -> current-ranged gate; base melee is non-positive.
- `$005A7253 83bc82bc68420600` / `$005A725B 0f8eac000000 jle $005A730D` -> resistance/Defense writes; current ranged is non-positive.
- `$005A749C 663b8491406f4206` / `$005A74A4 7e59 jle $005A74FF` -> movement reconciliation; current MP already at/below maximum.
- `$005A753D 3b8495b08efdff` / `$005A7544 0f8424010000 je $005A766E` -> DebugInvis gate; maximum movement unchanged.
- `$005A7552 84c0` / `$005A7554 0f8514010000 jne $005A766E` -> DebugInvis gate; `Immobile(i)` is true.
- `$005A7673 803800` / `$005A7676 7458 je $005A76D0` -> first `TotalHpLeft` call; DebugInvis is false.
- `$005A76D8 85c0` / `$005A76DA 0f8fbd010000 jg $005A789D` -> deferred-damage restore gate; HP remains positive.
- `$005A7704 80bc82361eac0100` / `$005A770C 0f858b010000 jne $005A789D` -> restore gate; base unit is already dead.
- `$005A7717 84c0` / `$005A7719 0f857e010000 jne $005A789D` -> restore gate; combat is active.
- `$005A78A5 48` / `$005A78A6 0f8eab010000 jle $005A7A57` -> second-loop tail; HP is at most one.
- `$005A78D0 80bc82361eac0100` / `$005A78D8 0f8579010000 jne $005A7A57` -> loop tail; base unit is dead.
- `$005A78E3 84c0` / `$005A78E5 0f856c010000 jne $005A7A57` -> loop tail; combat is active.
- `$005A790F 6683bc829e1cac0100` / `$005A7918 0f8e39010000 jle $005A7A57` -> loop tail; no positive Overdamage.
- `$005A7A5A ff4ddc` / `$005A7A5D 0f85e1edffff jne $005A6844` -> second-loop head for the next unit.

### `@Units@Immobile` — 5

All true branches land on `$005952CF b001 mov al,1`; the all-false path is `$005952CB 33c0 xor eax,eax`:

- `$00595201 80bc824a6f420600` / `$00595209 0f8fc0000000 jg $005952CF` — positive `webleft`.
- `$00595233 80bc82a96d420600` / `$0059523B 0f858e000000 jne $005952CF` — Stasis Combat (9).
- `$00595265 80bc82ce6d420600` / `$0059526D 7560 jne $005952CF` — Black Sleep (46).
- `$00595293 80bc82dc6d420600` / `$0059529B 7532 jne $005952CF` — Buried (60).
- `$005952C1 80bc82dd6d420600` / `$005952C9 7504 jne $005952CF` — Frozen (61).

### `@Game@Min` — 1

- `$005FCF8B 3b45f8` / `$005FCF8E 7d08 jge $005FCF98` -> `$005FCF98 8b45f8`, return the second argument; fall-through returns the first.

`TotalHpLeft`, `Iscombat`, and `HpPerFigure` have no semantic conditional jumps.

## Semantic calls

| Address | Bytes | Target | Arguments/result use |
|---:|---|---|---|
| `$005A70AF` | `e840f3feff` | `@Units@Ismagicalranged` `$005963F4` | `U.rangedtype` |
| `$005A70E7` | `e808f3feff` | `@Units@Ismagicalranged` `$005963F4` | `B.rangedtype` |
| `$005A754D` | `e882dcfeff` | `@Units@Immobile` `$005951D4` | `i` |
| `$005A76D3` | `e87cdcfeff` | `@Units@TotalHpLeft` `$00595354` | first cap gate |
| `$005A7712` | `e83d250100` | `@Combat@Iscombat` `$005B9C54` | first cap gate |
| `$005A7722` | `e889e6feff` | `@Units@HpPerFigure` `$00595DB0` | Overdamage write |
| `$005A7818` | `e893e5feff` | `@Units@HpPerFigure` `$00595DB0` | Totaldamage write |
| `$005A78A0` | `e8afdafeff` | `@Units@TotalHpLeft` `$00595354` | restore gate |
| `$005A78DE` | `e871230100` | `@Combat@Iscombat` `$005B9C54` | restore gate |
| `$005A7921` | `e82edafeff` | `@Units@TotalHpLeft` `$00595354` | `Min` first argument minus one |
| `$005A795D` | `e81a560500` | `@Game@Min` `$005FCF7C` | cap transfer by Overdamage |
| `$00595360` | `e84b0a0000` | `@Units@HpPerFigure` `$00595DB0` | `TotalHpLeft` helper |

## Arithmetic and write evidence

Supreme Light re-reads `U.resistance` and performs signed `div 3` twice:

```text
$005A7331 8b848200694206  mov eax,[U.resistance]
$005A7338 b903000000      mov ecx,3
$005A733D 99              cdq
$005A733E f7f9            idiv ecx
```

The sequence repeats at `$005A7397..$005A73A4`. It truncates toward zero, not toward negative
infinity. Movement uses the complete signed `div 2` idiom:

```text
$005A75FA 0fbe9491321eac01  movsx edx,byte [B.combatattacksdone]
$005A7602 b902000000        mov ecx,2
$005A7607 2bca              sub ecx,edx
$005A7610 0faf4dec          imul ecx,[j]
$005A761B d1f9              sar ecx,1
$005A761D 7903              jns $005A7622   ; target: add to combatmovesleft
$005A761F 83d100            adc ecx,0       ; negative correction toward zero
```

Fifteen semantic record writes occur in the main extent, in this order:

| Address | Write |
|---:|---|
| `$005A71A7` | `U.attack += 2` |
| `$005A7227` | `U.attackbonus += 2` |
| `$005A7285` | `U.ranged += 2` |
| `$005A7305` | `U.rangedbonus += 2` |
| `$005A7365` | `U.defense += U.resistance div 3` |
| `$005A7417` | `U.defensebonus += U.resistance div 3` |
| `$005A7443` | set `EncSupremeLightRegen` (54) |
| `$005A74F7` | `U.mp := U.maxmp` |
| `$005A7666` | reconcile `B.combatmovesleft` |
| `$005A769C` | clear `U.invisible` |
| `$005A76C8` | clear `U.stealth` |
| `$005A780D` | write `B.Overdamage` from its old value and old `B.Totaldamage` |
| `$005A7895` | cap `B.Totaldamage` at maximum HP minus one |
| `$005A79D6` | add restored deferred damage to `B.Totaldamage` |
| `$005A7A4F` | subtract the restored amount from `B.Overdamage` |

Local writes are `$005A7047`/`$005A7050` (`ownCG`), `$005A75A6` (`j`), `$005A7962` (`k`),
and the loop tail `$005A7A57`/`$005A7A5A`. The checker reports 20 writes because its broad
heuristic also admits three of those stack writes and the one-operand `imul` reads of
`U.figures` at `$005A774C` and `$005A7842`; the reconstruction accounts for all of them.

`TotalHpLeft` is exactly `HpPerFigure(u) * Units[u].figures - BaseUnits[u].Totaldamage`, anchored
at `$0059538A`, `$005953BD`, and `$005953C5`. `HpPerFigure` adds current `hp` and sign-extended
`bonushp` at `$00595DDD`, `$00595E09`, `$00595E11`. `Iscombat` compares the combat-plane value
with `-1` and uses `setne` at `$005B9C58..$005B9C60`.

## Coverage ledgers

### `@Units@RecalculateUnits`

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005A6FDF` | `$005A7003` | — | compiler-only | checked unit-record address |
| 1 | `$005A7003` | `$005A7011` | — | reconstructed | `B.incombat` gate |
| 2 | `$005A7011` | `$005A7076` | 1 | reconstructed | `ownCG` selection |
| 3 | `$005A7076` | `$005A7084` | 1 | reconstructed | Supreme Light global gate |
| 4 | `$005A7084` | `$005A7151` | 3 | reconstructed | four-way eligibility OR |
| 5 | `$005A7151` | `$005A7183` | 4 | reconstructed | base-melee gate |
| 6 | `$005A7183` | `$005A722F` | 5 | reconstructed | melee and attackbonus writes |
| 7 | `$005A722F` | `$005A7261` | 4 | reconstructed | current-ranged gate |
| 8 | `$005A7261` | `$005A730D` | 7 | reconstructed | ranged and rangedbonus writes |
| 9 | `$005A730D` | `$005A741F` | 4 | reconstructed | Defense and defensebonus division/writes |
| 10 | `$005A741F` | `$005A744B` | 4 | reconstructed | regeneration marker |
| 11 | `$005A744B` | `$005A74A6` | — | reconstructed | MP cap gate |
| 12 | `$005A74A6` | `$005A74FF` | 11 | reconstructed | MP cap write |
| 13 | `$005A74FF` | `$005A755A` | — | reconstructed | changed-movement and Immobile gates |
| 14 | `$005A755A` | `$005A766E` | 13 | reconstructed | movement reconciliation |
| 15 | `$005A766E` | `$005A7678` | — | reconstructed | DebugInvis gate |
| 16 | `$005A7678` | `$005A76D0` | 15 | reconstructed | invisibility/stealth clears |
| 17 | `$005A76D0` | `$005A771F` | — | reconstructed | lethal-recalculation gates |
| 18 | `$005A771F` | `$005A789D` | 17 | reconstructed | deferred-damage carry and cap |
| 19 | `$005A789D` | `$005A791E` | — | reconstructed | restore gates |
| 20 | `$005A791E` | `$005A7A57` | 19 | reconstructed | bounded deferred-damage restore |
| 21 | `$005A7A57` | `$005A7A63` | — | reconstructed | second-loop tail |
| 22 | `$005A7A63` | `$005A7A6C` | — | compiler-only | epilogue and `ret 4` |
| 23 | `$005A7A6C` | `$005A7A70` | — | compiler-only | inline short string `'U'` |

### Helpers

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005951D4` | `$005951DD` | — | compiler-only | Immobile prologue/spill |
| 1 | `$005951DD` | `$005952D4` | — | reconstructed | five short-circuit tests and Result store |
| 2 | `$005952D4` | `$005952DB` | — | compiler-only | Immobile epilogue |
| 0 | `$00595354` | `$0059535D` | — | compiler-only | TotalHpLeft prologue/spill |
| 1 | `$0059535D` | `$005953D1` | — | reconstructed | HP arithmetic and Result store |
| 2 | `$005953D1` | `$005953D8` | — | compiler-only | TotalHpLeft epilogue |
| 0 | `$005B9C54` | `$005B9C58` | — | compiler-only | Iscombat prologue |
| 1 | `$005B9C58` | `$005B9C64` | — | reconstructed | compare with -1 and `setne` |
| 2 | `$005B9C64` | `$005B9C6A` | — | compiler-only | Iscombat epilogue |
| 0 | `$00595DB0` | `$00595DB9` | — | compiler-only | HpPerFigure prologue/spill |
| 1 | `$00595DB9` | `$00595E1D` | — | reconstructed | hp + bonushp and Result store |
| 2 | `$00595E1D` | `$00595E24` | — | compiler-only | HpPerFigure epilogue |
| 0 | `$005FCF7C` | `$005FCF88` | — | compiler-only | Min prologue/argument spills |
| 1 | `$005FCF88` | `$005FCF9E` | — | reconstructed | signed comparison and both Result stores |
| 2 | `$005FCF9E` | `$005FCFA5` | — | compiler-only | Min epilogue |

## Completion declarations

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

Totals: 27 semantic conditional jumps, 12 semantic calls, 15 semantic record writes, six local
writes, and six helper Result stores. No statement differs between the two independent derivations.
