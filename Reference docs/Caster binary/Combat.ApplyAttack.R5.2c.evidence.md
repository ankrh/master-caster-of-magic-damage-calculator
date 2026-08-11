# `@Combat@ApplyAttack` R5.2c reconstruction evidence

Durable evidence for `$005B2994..$005B32BC` of the pinned `Caster.exe`. Codex cold-derived the
slice, then performed a byte-level self-review before user-directed integration on 2026-08-02.
The independent Claude derivation and formal cross-review were unavailable. The source-shaped
body below continues the already-established R5.2a–b locals and record bindings.

## Source-shaped reconstruction

```pascal
{ `inferred_loopRemaining := figs` and `attacks := 1` precede this extent. }
repeat
  { The unsigned two-step range idiom admits exactly attack types 6..8 and sends them
    directly to the Doom/ordinary-damage fork. `$005B2994 8B45F4`, `$005B2997 83C0FA`,
    `$005B299A 83E803`, `$005B299D 0F82CC040000 jb $005B2E6F`, whose target tests
    `aflags.doom`. All other attack types execute the six rider blocks in order. }
  if not (at in [ATDoomGaze, ATDeathGaze, ATStoningGaze]) then
  begin
    if aflags.exorcise and
       not Units[du].magicimmunity and
       not Units[du].EnchantmentFlags[EncSpellLock] and
       Units[du].Fantastic then
    begin
      i := aflags.exorcisevalue;
      if Units[du].EnchantmentFlags[EncUndead] then
        Dec(i, 3);
      if ResistanceRoll(du, Life, i, False, Units[au].owner) > 0 then
        Inc(Result.field_00, HpPerFigure(du));
                                                   { `$005B2ABF E82832FEFF`;
                                                     `$005B2ACB E8E032FEFF`;
                                                     write `$005B2AD3 0102` }
    end;

    if aflags.stoningtouch and
       not Units[du].magicimmunity and
       not Units[du].stoningimmunity and
       (ResistanceRoll(du, Nature, aflags.stoningtouchvalue,
          False, Units[au].owner) > 0) then
      Inc(Result.field_00, HpPerFigure(du));       { calls `$005B2B86  E86131FEFF`,
                                                     `$005B2B92 E81932FEFF`;
                                                     write `$005B2B9A 0102` }

    if aflags.deathtouch and
       not Units[du].magicimmunity and
       not Units[du].deathimmunity and
       (ResistanceRoll(du, Death, aflags.deathtouchvalue,
          False, Units[au].owner) > 0) then
      Inc(Result.field_08, HpPerFigure(du));       { calls `$005B2C4D E89A30FEFF`,
                                                     `$005B2C59 E85231FEFF`;
                                                     write `$005B2C61 014208` }

    if aflags.lifesteal and
       not Units[du].magicimmunity and
       not Units[du].deathimmunity then
    begin
      i := ResistanceRoll(du, Death, aflags.lifestealvalue,
             False, Units[au].owner);             { call `$005B2D15 E8D22FFEFF` }
      Inc(Result.field_04, i);                     { write `$005B2D23 015004` }
      if not simul then
        Combatheal(au, i, True, False);            { call `$005B2D3D E81EE5FFFF` }
    end;

    if aflags.destruction and
       not Units[du].magicimmunity and
       (ResistanceRoll(du, Chaos, aflags.destructionvalue,
          False, Units[au].owner) > 0) then
      Result.field_00 := 150;                      { call `$005B2DB6 E8312FFEFF`;
                                                     assignment, not addition,
                                                     `$005B2DC2 C70096000000` }

    if aflags.poison and
       not Units[du].poisonimmunity and
       (aflags.poisonvalue > 0) then
    begin
      inferred_riderLoopRemaining := aflags.poisonvalue;
      i := 1;
      repeat
        if ResistanceRoll(du, 0, inferred_PoisonSavePenalty,
             False, Units[au].owner) > 0 then
          Inc(TotalDamage);                        { call `$005B2E53 E8942EFEFF`;
                                                     write `$005B2E5C 8345CC01` }
        Inc(i);
        Dec(inferred_riderLoopRemaining);
      until inferred_riderLoopRemaining = 0;      { `$005B2E6D 75A8 jne $005B2E17`,
                                                     whose target begins the next save }
    end;
  end;

  if aflags.doom then                              { `$005B2E6F 80BD60FFFFFF00`;
                                                     false target `$005B2EC5` calls AttackRoll }
  begin
    dam2 := 0;
    if not fulldoom then
      Inc(TotalDamage, inferred_DoomDamagePercentage * atk div 100)
                                                   { complete signed division:
                                                     `$005B2E83 A148997000`,
                                                     `$005B2E88 8B00`,
                                                     `$005B2E8A F76DE8`,
                                                     `$005B2E94 B964000000`,
                                                     `$005B2E99 99`,
                                                     `$005B2E9A F7F9`,
                                                     write `$005B2E9C 0145CC` }
    else
      Inc(TotalDamage, atk);                       { target `$005B2EAF`; write
                                                     `$005B2EB2 0145CC` }
  end
  else
  begin
    dam3 := AttackRoll(atk, tohit);                { call `$005B2ECB E8542FFEFF` }
    dam2 := dam3;
    supernaturaldam := Round(
      (dam3 - inferred_SupernaturalStarts) *
      inferred_SupernaturalRatio / 100.0);         { `$005B2ED9..$005B2F1E`;
                                                     `fild` `$005B2EFF DB8504FFFFFF`,
                                                     `fdiv` `$005B2F05 D835B8325B00`,
                                                     `System.Round` call
                                                     `$005B2F0B E8881CE5FF`; the
                                                     Single 100.0 is `$005B32B8 0000C842` }

    redper := 0;
    i := CGADEnemy;                                { call `$005B2F26 E831A30000` }
    if inferred_CombatGlobalBlur[i] > 0 then
      redper := inferred_BlurDamageReduction;      { compiled array access
                                                     `$005B2F2E..$005B2F55`;
                                                     false target `$005B2F61` }
    if Units[du].invisible then
    begin
      if redper = 0 then
        redper := inferred_InvisibilityDamageReduction
                                                   { `$005B2F93 750C jne $005B2FA1`;
                                                     zero arm writes at `$005B2F9C` }
      else
        redper := inferred_BlurInvisibilityTotalReduction;
                                                   { target `$005B2FA1`; write `$005B2FA8` }
    end;

    if (redper > 0) and
       not Units[au].illusionimmunity and
       (dam3 > 0) then
    begin
      inferred_riderLoopRemaining := dam3;
      i := 1;
      repeat
        if Random(100) < redper then               { call `$005B2FF5 E86219E5FF`;
                                                     false target `$005B300A` }
          Dec(dam2);
        Inc(i);
        Dec(inferred_riderLoopRemaining);
      until inferred_riderLoopRemaining = 0;       { `$005B3010 75DE jne $005B2FF0`,
                                                     whose target begins Random(100) }
    end;

    Dec(dam2, DefenseRoll(def, todef));            { call `$005B3018 E85F2EFEFF`;
                                                     write `$005B301D 2945C8` }
    if Units[du].EnchantmentFlags[EncInvulnerability] then
      Dec(dam2, inferred_InvulnerabilityDamageReduction);
                                                   { false target `$005B3066`;
                                                     write `$005B305C 2945C8` }
    if dam2 < 0 then
      dam2 := 0;                                   { false target `$005B3071`;
                                                     write `$005B306E 8945C8` }
    if aflags.supernatural and
       (def < 80) and
       (dam2 < supernaturaldam) then
      dam2 := supernaturaldam;                     { three false exits target
                                                     `$005B308E`, which calls
                                                     `HpPerFigure`; write `$005B308B 8945C8` }
  end;

  enemyhpperfigure := HpPerFigure(du);             { call `$005B3091 E81A2DFEFF` }
  while dam2 + topfdam > enemyhpperfigure do       { `$005B3145 0F8F53FFFFFF jg
                                                     $005B309E`, whose target starts
                                                     the overflow body }
  begin
    TotalDamage := TotalDamage + enemyhpperfigure - topfdam;
                                                   { `$005B309E..$005B30B5` }
    dam2 := dam2 - enemyhpperfigure + topfdam - DefenseRoll(def, todef);
                                                   { call `$005B30BE E8B92DFEFF`;
                                                     write `$005B30E3 8955C8` }
    if Units[du].EnchantmentFlags[EncInvulnerability] then
      Dec(dam2, inferred_InvulnerabilityDamageReduction);
                                                   { false target `$005B3125`;
                                                     write `$005B311B 2945C8` }
    if dam2 < 0 then
      dam2 := 0;                                   { false target `$005B3130`;
                                                     write `$005B312D 8945C8` }
    topfdam := 0;
  end;
  Inc(TotalDamage, dam2);
  topfdam := dam2;
  Inc(attacks);
  Dec(inferred_loopRemaining);
until inferred_loopRemaining = 0;                 { `$005B3164 0F852AF8FFFF jne
                                                     $005B2994`, whose target begins
                                                     the next attacker-figure iteration }

PostAttackLoop_at_005B316A:
if Units[au].createundead and
   not Units[du].magicimmunity and
   not Units[du].deathimmunity then
  Inc(Result.field_04, TotalDamage)                { write `$005B31FA 015004` }
else                                               { target `$005B3206` }
  Inc(Result.field_08, TotalDamage);               { write `$005B320C 015008` }

FinalizeResult_at_005B3216:
if (Result.field_08 + Result.field_04 + Result.field_00 > 0) and
   Units[au].bloodsucker then
begin
  Inc(Result.field_08, inferred_BloodsuckerDamage); { `$005B3216..$005B327B`;
                                                      write `$005B3271 014208` }
  if not simul then
    Combatheal(au, inferred_BloodsuckerHealing, False, True);
                                                    { call `$005B3290 E8CBDFFFFF` }
end;
```

`Combatheal`'s register/stack binding is confirmed by its TD32 frame: `u` in EAX, `amount` in
EDX, `overheal` in CL, and stack parameter `isregen`. Thus Life Steal passes `(True, False)` and
Bloodsucker passes `(False, True)` for the last two booleans.

`CGADEnemy` is not an alias for the defender unit's owner. Its body tests
`CombatAttackersTurn` at `$005BD265 80B8E444000000` and returns combat-global side 1 when true,
side 2 when false; `CGADOwn` returns the opposite mapping. The CAS API defines side 1 as the
combat defender and side 2 as the combat attacker. In `PerformMeleeAttack`, the counterattack
pushes `counter=True` at `$005B3B99 6A01`, loads the original attacker as the new defender at
`$005B3BA6 8B55FC`, loads the original defender as the new attacker at
`$005B3BA9 8B45F8`, and calls `ApplyAttack` at `$005B3BAC E8BFDDFFFF` without changing the
combat-turn flag. Consequently the initiating strike reads the target side's Blur, while the
counterattack reads the counterattacker's own side-wide Blur.

This is a targeted caller trace used only to establish `ApplyAttack`'s side selection. It does
not reconstruct the separately scoped R5.2d `PerformMeleeAttack` extent.

## Byte-level self-review

The post-derivation audit re-read the raw bytes rather than the annotated summary and checked the
failure modes called out by the project protocol:

- The attack-type range was recomputed from the full `$005B2994 8B45F4`, `$005B2997 83C0FA`,
  `$005B299A 83E803`, `$005B299D 0F82CC040000` idiom. For the already-bounded attack type it
  admits exactly 6, 7 and 8; target `$005B2E6F` is the Doom test after all six riders.
- Every rider's immunity exits were followed to their exact next-block target. In particular,
  Destruction writes with `mov` at `$005B2DC2`, so it assigns 150 and can replace field 0's
  earlier Exorcise/Stoning value; it does not add 150.
- Doom's arithmetic was read through `imul`, `cdq` and `idiv` at `$005B2E83..$005B2E9A`; no
  shift-only or missing-correction shorthand was used.
- Supernatural's arithmetic was read through `fild`, `fdiv` and the actual `System.Round` call at
  `$005B2EF9..$005B2F0B`. The prior data-table truncation claim was rejected because the bytes
  call rounding explicitly.
- **That rounding is banker's rounding — ties to even, not half-up.** `@System@@ROUND`
  (`$00404B98 83EC08`, `$00404B9B DF3C24 fistp qword ptr [esp]`) never touches the FPU control
  word, so `fistp` uses the default RC=00, round-to-nearest-ties-to-even. The adjacent `Trunc`
  at `$00404BA2` proves the contrast: it must set RC explicitly
  (`$00404BAF or word ptr [esp+2],$0F00`) to truncate. With the shipped `SupernaturalRatio=34`
  a tie occurs exactly at `hits ≡ 25 (mod 50)`, the unique solution of `34h ≡ 50 (mod 100)`:
  at `hits = 25`, `8.5` rounds to **8**. Any reimplementation using a half-up `round` diverges
  there — see `Calculator/BACKLOG.md` F7.
- `$005B2F11 sar eax,$1F` / `$005B2F14 cmp eax,edx` after the `Round` call is the Int64→Integer
  range check feeding a guard call, not semantic arithmetic.
- Both defence sites were compared. Invulnerability and the zero clamp recur on overflow at
  `$005B3104..$005B312D`, while Blur and the Supernatural floor do not.
- The three result buckets were checked instruction-by-instruction through the final sum. Create
  Undead chooses field 4 versus field 8; Bloodsucker then always adds its bonus to field 8.
- The no-argument `CGADEnemy` call was traced through its helper and the melee counterattack
  caller. It is turn-relative rather than a direct target-side lookup, producing the asymmetric
  counterattack behavior documented above.

No additional reconstruction defect survived that audit. The three apparent branches and four
apparent writes after the procedure's `$005B329A ret` were confirmed as the embedded error string,
padding and Single constant rather than executable code.

## Conditional branches

Every real conditional gives its encoded jump, target, and what begins there. The final three
rows are bytes inside embedded data that linear Capstone misdecodes as branches; they are cited
because the repository verifier scans the whole TD32 extent.

| Jump | Target | Target contents |
|---|---:|---|
| `$005B299D 0F82CC040000 jb` | `$005B2E6F` | Doom-flag test; gaze types skip the six riders |
| `$005B29AA 0F842C010000 je` | `$005B2ADC` | Stoning Touch block; Exorcise absent |
| `$005B29DC 0F85FA000000 jne` | `$005B2ADC` | Stoning Touch block; Magic Immunity present |
| `$005B2A0E 0F85C8000000 jne` | `$005B2ADC` | Stoning Touch block; Spell Lock present |
| `$005B2A40 0F8496000000 je` | `$005B2ADC` | Stoning Touch block; defender non-Fantastic |
| `$005B2A78 740B je` | `$005B2A85` | attacker-owner load; defender not Undead |
| `$005B2AC6 7E14 jle` | `$005B2ADC` | Stoning Touch block; Exorcise save did not fail |
| `$005B2AE3 0F84BA000000 je` | `$005B2BA3` | Death Touch block; Stoning Touch absent |
| `$005B2B15 0F8588000000 jne` | `$005B2BA3` | Death Touch block; Magic Immunity present |
| `$005B2B47 755A jne` | `$005B2BA3` | Death Touch block; Stoning Immunity present |
| `$005B2B8D 7E14 jle` | `$005B2BA3` | Death Touch block; Stoning Touch save did not fail |
| `$005B2BAA 0F84BB000000 je` | `$005B2C6B` | Life Steal block; Death Touch absent |
| `$005B2BDC 0F8589000000 jne` | `$005B2C6B` | Life Steal block; Magic Immunity present |
| `$005B2C0E 755B jne` | `$005B2C6B` | Life Steal block; Death Immunity present |
| `$005B2C54 7E15 jle` | `$005B2C6B` | Life Steal block; Death Touch save did not fail |
| `$005B2C72 0F84CA000000 je` | `$005B2D42` | Destruction block; Life Steal absent |
| `$005B2CA4 0F8598000000 jne` | `$005B2D42` | Destruction block; Magic Immunity present |
| `$005B2CD6 756A jne` | `$005B2D42` | Destruction block; Death Immunity present |
| `$005B2D31 750F jne` | `$005B2D42` | Destruction block; simulated attack skips healing |
| `$005B2D49 747D je` | `$005B2DC8` | Poison block; Destruction absent |
| `$005B2D77 754F jne` | `$005B2DC8` | Poison block; Magic Immunity present |
| `$005B2DBD 7E09 jle` | `$005B2DC8` | Poison block; Destruction save did not fail |
| `$005B2DCF 0F849A000000 je` | `$005B2E6F` | Doom test; Poison absent |
| `$005B2E01 756C jne` | `$005B2E6F` | Doom test; Poison Immunity present |
| `$005B2E0B 7E62 jle` | `$005B2E6F` | Doom test; poison magnitude non-positive |
| `$005B2E5A 7E0B jle` | `$005B2E67` | poison-loop counters; save did not fail |
| `$005B2E6D 75A8 jne` | `$005B2E17` | next poison save |
| `$005B2E76 744D je` | `$005B2EC5` | ordinary AttackRoll path; attack is not Doom |
| `$005B2E81 752C jne` | `$005B2EAF` | full-Doom `TotalDamage += atk` arm |
| `$005B2F55 7E0A jle` | `$005B2F61` | defender Invisibility test; Blur absent |
| `$005B2F8D 741C je` | `$005B2FAB` | reduction application gate; defender visible |
| `$005B2F93 750C jne` | `$005B2FA1` | combined Blur+Invisibility percentage arm |
| `$005B2FAF 7E61 jle` | `$005B3012` | DefenseRoll; reduction percentage non-positive |
| `$005B2FDD 7533 jne` | `$005B3012` | DefenseRoll; attacker has Illusion Immunity |
| `$005B2FE4 7E2C jle` | `$005B3012` | DefenseRoll; AttackRoll produced no hits |
| `$005B2FFD 7D0B jge` | `$005B300A` | reduction-loop counters; random roll survives |
| `$005B3010 75DE jne` | `$005B2FF0` | next per-hit reduction roll |
| `$005B3053 7411 je` | `$005B3066` | non-negative clamp; Invulnerability absent |
| `$005B306A 7D05 jge` | `$005B3071` | Supernatural gate; damage already non-negative |
| `$005B3078 7414 je` | `$005B308E` | HpPerFigure call; Supernatural absent |
| `$005B307E 7D0E jge` | `$005B308E` | HpPerFigure call; effective Defense at least 80 |
| `$005B3086 7D06 jge` | `$005B308E` | HpPerFigure call; damage already at minimum |
| `$005B3112 7411 je` | `$005B3125` | overflow non-negative clamp; Invulnerability absent |
| `$005B3129 7D05 jge` | `$005B3130` | clear `topfdam`; overflow damage non-negative |
| `$005B3145 0F8F53FFFFFF jg` | `$005B309E` | next killed-figure overflow iteration |
| `$005B3164 0F852AF8FFFF jne` | `$005B2994` | next attacker-figure iteration |
| `$005B3196 746E je` | `$005B3206` | ordinary result bucket; Create Undead absent |
| `$005B31C4 7540 jne` | `$005B3206` | ordinary result bucket; Magic Immunity present |
| `$005B31F2 7512 jne` | `$005B3206` | ordinary result bucket; Death Immunity present |
| `$005B3237 7E5C jle` | `$005B3295` | epilogue; result sum non-positive |
| `$005B3265 742E je` | `$005B3295` | epilogue; Bloodsucker absent |
| `$005B327F 7514 jne` | `$005B3295` | epilogue; simulated attack skips healing |
| `$005B32AC 7474`, `$005B32B2 7479`, `$005B32B4 7065` | outside extent | ASCII bytes in `Undefined attack type!`, not instructions |

## Calls

| Address | Bytes | Target / role |
|---:|---|---|
| `$005B2ABF`, `$005B2B86`, `$005B2C4D`, `$005B2D15`, `$005B2DB6`, `$005B2E53` | `E8...` | six `@Units@ResistanceRoll` calls, in rider order |
| `$005B2ACB`, `$005B2B92`, `$005B2C59`, `$005B3091` | `E8...` | three rider-kill and one main-loop `@Units@HpPerFigure` calls |
| `$005B2D3D`, `$005B3290` | `E8...` | Life Steal and Bloodsucker `@Combat@Combatheal` calls |
| `$005B2ECB E8542FFEFF` | `E8542FFEFF` | `@Units@AttackRoll` |
| `$005B2F0B E8881CE5FF` | `E8881CE5FF` | `@System@@ROUND` |
| `$005B2F26 E831A30000` | `E831A30000` | `@Combat@CGADEnemy` |
| `$005B2FF5 E86219E5FF` | `E86219E5FF` | `@System@Random` |
| `$005B3018`, `$005B30BE` | `E8...` | initial and overflow `@Units@DefenseRoll` calls |

## Coverage ledger

| Row | Start | End | Within | Disposition | Body |
|---:|---:|---:|---:|---|---|
| 0 | `$005B2994` | `$005B2ADC` | — | reconstructed | gaze exclusion and Exorcise |
| 1 | `$005B2ADC` | `$005B2BA3` | 0 | reconstructed | Stoning Touch |
| 2 | `$005B2BA3` | `$005B2C6B` | 0 | reconstructed | Death Touch |
| 3 | `$005B2C6B` | `$005B2D42` | 0 | reconstructed | Life Steal damage and healing |
| 4 | `$005B2D42` | `$005B2DC8` | 0 | reconstructed | Destruction |
| 5 | `$005B2DC8` | `$005B2E6F` | 0 | reconstructed | Poison save loop |
| 6 | `$005B2E6F` | `$005B2EC5` | — | reconstructed | partial and full Doom arithmetic |
| 7 | `$005B2EC5` | `$005B2F21` | — | reconstructed | AttackRoll and rounded Supernatural minimum |
| 8 | `$005B2F21` | `$005B2FAB` | — | reconstructed | Blur/Invisibility reduction selection |
| 9 | `$005B2FAB` | `$005B3012` | — | reconstructed | attacker-Illusion-Immunity gate and per-hit reduction loop |
| 10 | `$005B3012` | `$005B308E` | — | reconstructed | DefenseRoll, Invulnerability, clamp and Supernatural floor |
| 11 | `$005B308E` | `$005B3135` | — | reconstructed | defender figure HP and spillover body |
| 12 | `$005B3135` | `$005B3158` | — | reconstructed | spillover condition and final damage accumulation |
| 13 | `$005B3158` | `$005B316A` | — | reconstructed | per-attacker-figure loop advance |
| 14 | `$005B316A` | `$005B3206` | — | reconstructed | Create Undead routing gate and special bucket write |
| 15 | `$005B3206` | `$005B3216` | — | reconstructed | ordinary result-bucket write |
| 16 | `$005B3216` | `$005B3295` | — | reconstructed | result total, Bloodsucker damage and healing |
| 17 | `$005B3295` | `$005B32BC` | — | reconstructed | epilogue, error string, padding and Single constant 100.0 |

## Completion declarations

- unresolved ranges: 0
- synthetic helpers without bodies: 0
- semantic conditional jumps omitted: 0
- semantic calls omitted: 0
- state writes omitted: 0
- declared parent mismatches: 0

The verifier's raw whole-extent totals include three fake conditional jumps and four fake memory
writes decoded from the post-`ret` string/constant pool. Those bytes are explicitly identified
above; they are data, not semantic instructions.
