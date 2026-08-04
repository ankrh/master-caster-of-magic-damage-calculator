# CoM2 / Warlord binary analysis

Ground truth for the *modern* engine, the way `../MoM binary analysis.md` is for the DOS builds.
Warlord ships no executable of its own — it is a script-and-data mod over CoM2's `Caster.exe`,
so this file covers both, and a finding here applies to Warlord unless a Warlord script
overrides it. Where the binary and the `.CAS` scripts both speak, the binary is the
implementation and the scripts are what runs on top of it; neither outranks the other for
mechanics they do not share.

## Modern-engine source of truth

The authoritative implementation record for CoM2 and Warlord consists of the following small,
composable set. It replaces any attempt to derive mechanics from manual/helptext prose.

| Question | Authoritative source | Use it this way |
|---|---|---|
| Compiled CoM2 behavior: branches, order, arithmetic, defaults, and fields | The address-backed Pascal-like reconstruction and its evidence companions in this directory | This is the source for behavior implemented in `Caster.exe`. Follow the subsystem index below; verify an address against the binary identity in `README.md` when extending it. |
| Warlord behavior executed by a script | `../Script source/Warlord 1.5.12.6.2/*.CAS` | The named script is authoritative for the behavior it executes. It can add to or overwrite the compiled layer; identify the exact read/write rather than assuming all Warlord behavior differs. |
| Loaded numeric settings | `MODDING.INI`, `Levelbonus.INI`, and `SPELLS.INI`, catalogued in `../CoM2 data tables.md` | A present key is the runtime value. Absence means use the compiled default, so route back to the reconstruction. The table does not determine the consumer's arithmetic or ordering. |
| Unit roster values | The version's `UNITS.INI` under `Unit rosters/` | This is roster data, not a formula source; generated calculator datasets must derive from it. |

`DESC.INI`, the manuals, and in-game helptext describe the game but do not settle an
implementation question. `CAS reference/` supplies CAS syntax and symbolic IDs; it is not a
formula source. Vanilla CoM2's combat CAS files are mostly stubs, so they do not replace the
compiled reconstruction.

This is a composition rule, not an undifferentiated precedence list. A common case is compiled
code consuming an INI constant; in Warlord a CAS write can then modify that computed value.
For a Warlord mechanic, read the applicable CAS routine and table first, then the reconstruction
for every behavior they leave to `Caster.exe`.

## The binary

`README.md` in this directory is the single home for the executable's path, md5, size and
format. Verify that hash before trusting any address below — every address here is a virtual
address in that exact build.

## Method

**This binary is far easier to read than `WIZARDS.EXE`, and needs none of that file's
struct-offset archaeology.** It ships a ~7 MB Borland TD32 debug section (`FB09` signature)
carrying 10,165 procedure symbols across 137 modules, typed constants, *and named local
variables and parameters*. Ask for a routine by name and read it.

`tools/scan_caster_binary.py` does the parsing:

```
scan_caster_binary.py syms   Caster.exe Gaze          # procedures matching a regex
scan_caster_binary.py locals Caster.exe ApplyAttack   # named params and locals
scan_caster_binary.py consts Caster.exe @Combat@AT    # enum / typed-constant members
scan_caster_binary.py dis    Caster.exe 0x5B1F9F 0x90 @Combat@ApplyAttack
```

`dis` takes a virtual address and, given a procedure name, annotates every `ebp`-relative
operand with that procedure's own local name — which is what makes the disassembly readable.
Symbols are Delphi-mangled as `@Unit@Routine`.

Addresses in this file are virtual (`imagebase + section VA + offset`); `syms` prints the file
offset alongside.

Two further tools make the big recalculation routine readable, where raw `dis` output is not:

```
caster_record_layout.py                                   # self-test the record layouts
annotate_caster_disasm.py Caster.exe 0x59A02C 0x200       # annotated disassembly
```

`caster_record_layout.py` lays out `unitT` and `WizardT` from the declarations in
`../Script source/CAS reference/Typedec.pas` under Delphi's default alignment, producing an
offset → field-name map. `annotate_caster_disasm.py` uses it to name every absolute
displacement — so `[edx + eax*4 + 0x6426dc8]` prints as `U.EnchantmentFlags[40=EncHeroism]` —
and additionally collapses Delphi's guard calls and the ten-instruction record-addressing idiom
that precedes nearly every field access. Roughly 15× denser than raw output; `--raw` disables it.

**The `unitT` layout is validated, `WizardT` is not.** `unitT` computes to exactly 1,924 bytes =
`0x1E1` dwords — the stride the code multiplies by — and reproduces all 39 field offsets read
directly out of the executable, so unit-record field names may be taken from `Typedec.pas`
without further checking. `WizardT` does **not** match: everything from `Retorts` onward sits
**8 bytes later** in the binary than the declaration computes, on three independent anchors
(`Retorts` ids 6 and 8 at `+0x21`/`+0x23`, `GlobalEnchantments` element-0 at `0x89AF3`). The
cause is visible in the reference files themselves — `SharedConstants.pas` declares
`VERSION = '1.05.00'` where the binary is 1.05.11, so the shipped CAS headers are a minor version
behind — and the extra 8 bytes sit ahead of `Retorts`, most plausibly in
`Books : array[1..MaxRealm]`. The tool applies the correction as `WIZARD_DRIFT`; **any wizard-record
offset computed from the shipped declaration without it is wrong by 8.** Unit-record findings are
unaffected.
## Subsystem index

Read only the subsystem relevant to the task. Findings remain address-backed; detailed coverage
and review provenance stay in the reconstruction evidence indexed by `README.md`.

| Subsystem | Contents |
|---|---|
| [Combat flow](./CoM2%20binary%20-%20combat%20flow.md) | Gazes, `ApplyAttack`, riders, ranged/melee dispatch, and phase order |
| [Resolution helpers](./CoM2%20binary%20-%20resolution%20helpers.md) | Effective Resistance and Defense, attack/defense rolls, and ranged-distance penalties |
| [Direct spells](./CoM2%20binary%20-%20direct%20spells.md) | `DamageSpell`, Wall of Fire, `ApplyDamageSpell`, and Amplified Damage |
| [Damage and healing](./CoM2%20binary%20-%20damage%20and%20healing.md) | Damage accumulation, `Combatheal`, figure accounting, and death routing |
| [Unit recalculation](./CoM2%20binary%20-%20unit%20recalculation.md) | Regions `a`–`e`, script hooks, unit fields, enchantments, auras, and the calculator transform audit |
| [Map and city](./CoM2%20binary%20-%20map%20and%20city.md) | Combat-map eligibility, flying/attack flags, walls, and wall-state mapping |
| [Reconstruction artifacts](./README.md#reconstruction-artifact-index) | Source-shaped `.pas` files, evidence companions, coverage, and provenance |

## Useful entry points

| Symbol | VA | Notes |
|---|---|---|
| `@Units@RecalculateUnits` | `0x599920` | the whole stat pipeline; five regions, two script hooks |
| `@Units@AddtoAuraTable` | `0x5973A4` | `(uid, aura type, value, owner)`; merges same tile/owner/type by maximum |
| `@Units@BuildAuraTable` | `0x5976CC` | collects Holy Bonus, Resistance to All, Misfortune and hero auras |
| `@Heroes@HeroBonus` | `0x5933E8` | computes level/super-scaled hero ability values used in the aura table |
| `@Castercore@GetHeroAbility` | `0x647D2C` | `(w, ht, ha)`; one-line accessor — the anchor that names any `Hero[][]` literal |
| `@Units@Ismagicalranged` | `0x5963F4` | used by Leadership and Supreme Light eligibility |
| `@Units@GetEffectiveResistance` | `0x595AB8` | `(u, realm, isroll)`; Resist Elements, Bless, Resist Magic — after `e`, per attack |
| `@Units@EffectiveDefense` | `0x5965C8` | `(u, flags, ismagic, extradef, spellid, …)`; Large Shield, Resist Elements, Elemental Armor, Bless, immunities — after `e`, per attack |
| `@Units@DefenseRoll` | `0x595E7C` | per-defense-die To Block roll; applies `ToDefendCap` / `ToDefendCappedValue` after the cap index |
| `@Combat@RangedPenalty` | `0x5B1800` | direct hero and magical-ranged exemptions, threshold/gap/growth/base formula, Long Range cap |
| `@Combat@CombatDistanceUnit` | `0x5BB234` | BaseUnits-coordinate wrapper around `CombatDistance` |
| `@Scripts@RunScript` | `0x582C14` | `(handle, clearvars)`; 41 call sites engine-wide |
| `@Init@GameInitialize` | `0x63111C` | sole caller of `@Scripts@Loadscript`; maps INI keys to handles |
| `@Combat@ApplyAttack` | `0x5B1970` | the attack resolver; named locals make it readable |
| `@Combat@PerformMeleeAttack` | `0x5B35A4` | phase order, incl. all six gaze calls |
| `@Combat@PerformRangedAttack` | `0x5B3338` | |
| `@Combat@Dealdamage` | `0x5B41C0` | applies a resolved damage total |
| `@Units@LivingFigures` | `0x59648C` | current figure count |
| `@Units@AttackRoll` | `0x595E24` | 10% floor, one `Random(100)` per attack die, no upper clamp |
| `@Units@ResistanceRoll` | `0x595CEC` | d10 effective-resistance check; optional one-shot Fate Mastery reroll of a successful save |
