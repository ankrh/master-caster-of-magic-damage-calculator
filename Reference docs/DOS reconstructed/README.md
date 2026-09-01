# DOS reconstruction — conventions

Address-backed reconstructions of the three DOS builds, produced by **R6**. This is the DOS
counterpart to `Reference docs/Caster binary/`, and the conventions differ because the target
does: `Caster.exe` is Delphi, `WIZARDS.EXE` is Borland C++ 1991.

Binary paths and md5s live in `Reference docs/MoM binary analysis.md`, *The binaries* — the single
home; verify the hash before trusting any offset. Process (scoping, dual derivation, review,
merge, the completion gate) lives in `DERIVATION-REVIEW-PROTOCOL.md`. Work state lives in
`Calculator/BACKLOG.md`. None of that is restated here.

## Language and layout

Artifacts are **C**, not Pascal. Use ReMoM's `MoX/src/MOM_DAT.h` type and field names
(`BATTLE_UNIT`, `ranged_type`, `Spec_Att_Attrib`) so the two are directly comparable — ReMoM is
the orientation source we most need to check *against*, and divergence is only visible if the
vocabulary matches.

| File | Holds |
|---|---|
| `unitcalc.c` | Overland `Create_Unit`; battle-unit constructor, stat recompute, `BU_Apply_Specials`, and their callees |
| `combat.c` | Combat dispatch, target admission, spell resolution, `BU_AttackTarget`, and `BU_ProcessAttack` |
| `spelldat.c` | Source-shaped `SPELLDAT.LBX` records materialized by dedicated table-reconstruction items |
| `<ID>.evidence.md` | One item's coverage ledgers, counts, findings and any `disputed` rows |
| `R6.version-differences.md` | Merged three-build difference index and overlay-aware call closure |

The `.c` files are shared across items and grow as items land. Reconstruction bodies go in the
`.c`; ledgers and prose go in the evidence markdown.

## Symbolic constants, with raw values retained

The reconstructed expression must use a field-specific symbolic name for every categorical value:
bit flags and masks, enum-like IDs, sentinels, record offsets and fixed global addresses. Do not
leave an unexplained literal such as `0x4000`, `0x14`, `100` or `-1` in executable C merely because
the disassembly used that immediate. The same number can mean unrelated things in different fields,
so names must carry the field or type vocabulary (`USA_IMMUNITY_DEATH`, `ATT_ELDRITCH_WEAPON`,
`rt_Death`, `RAT_THROWN`), not just restate the number (`FLAG_4000`).

Keep the binary evidence visible at the definition site: each symbol is defined from the exact raw
hexadecimal or decimal value found in the executable. At a compound-mask write, retain the aggregate
raw mask in the address comment when it helps direct comparison with the instruction. For example:

```c
#define USA_IMMUNITY_ILLUSION  0x0008
#define USA_IMMUNITY_COLD      0x0010
#define USA_IMMUNITY_DEATH     0x0040
#define USA_IMMUNITY_POISON    0x0080

bu->Attribs_1 |= USA_IMMUNITY_DEATH | USA_IMMUNITY_POISON
               | USA_IMMUNITY_COLD | USA_IMMUNITY_ILLUSION;
                                      /* raw mask 0x00D8; 160:0x8F828 */
```

When builds repurpose the same bit, define semantic aliases with the same raw value and use the
alias appropriate to that build's branch. When a value's meaning is not established, use an
explicit field-scoped `UNKNOWN_<value>` symbol and leave it unresolved; never manufacture a
semantic name. Literal arithmetic quantities such as `+2 defense`, loop bounds derived directly
from data, and the mandatory binary-address annotations are not magic-number violations, although
their purpose must still be apparent locally.

During derivation and reciprocal review, expand each symbolic expression and confirm that it equals
the instruction's immediate operand. The merged source must contain the definitions it relies on;
an absent external header is not an acceptable hidden source of meaning.

## One source, three builds

**Do not write three near-identical files.** All three builds are reconstructed into one body with
explicit version branching, because the version differences *are* the deliverable for A32,
A33, B1 and C1 — a shared body puts each difference at its exact site instead of hiding it in a
diff someone has to think to run.

```c
/* 131:0x8F332  160:=  com1:0x8F33A */
bu->resist += holy_bonus;

#if BUILD == CP160 || BUILD == COM1
/* 131:—  160:0x8F35A  com1:0x8F362 */
bu->melee_tohit -= 1;                 /* the patch's to-hit correction */
#endif
```

**Address annotations are mandatory on every reconstructed statement**, one field per build in the
fixed order `131 / 160 / com1`:

- `0x8F332` — the address in that build. Always written `0x` + 4–6 hex digits; that is the form
  `verify_dos_derivation.py` scans for, so an annotation in any other form is not a citation.
- `=` — same address as 1.31. Common, because CP 1.60 is a same-size in-place patch and shares
  1.31's addresses. CoM 1 is rebased, so it is nearly always a distinct number.
- `—` — the build does not execute this statement.

**Do not rely on CoM 1's addresses being distinct.** They usually are, because CoM 1 is rebased —
but not always: in `BU_Apply_Specials` CoM 1's copy occupies 1.31's exact `0x8F310`–`0x8F881`.
`verify_dos_derivation.py` therefore scopes annotations and inventory rows to the selected build
before constructing its citation set. `split_dos_derivation.py` exposes the same extractor as a
CLI when a reviewer wants to inspect the exact per-build citation list.

**A build difference that is only a name goes in the `#define`, not in the code.** When builds
repurpose one input bit and the executed bytes are identical, a statement-level `#if` would claim
a control-flow divergence the binary does not contain — and the `#if BUILD` directives are the
index a reader greps to find real divergence, so a naming-only entry is a false positive there.
Define each build's semantic alias, select between them once, and leave the statement single:

```c
#define IP_POWER_DRAIN                  0x01000000UL
#define IP_COM1_DIVINE_PROTECTION       IP_POWER_DRAIN    /* raw 0x01000000 */
#if BUILD == COM1
#define IP_ATTACK_SPECIAL_POWER_DRAIN_INPUT IP_COM1_DIVINE_PROTECTION
#else
#define IP_ATTACK_SPECIAL_POWER_DRAIN_INPUT IP_POWER_DRAIN
#endif
```

Name the selector after the quantity that does *not* vary — here the output is `ATT_POWER_DRAIN`
in every build, so only the input bit's name is build-specific. Settled by Q25, 2026-09-01;
`IP_MOVEMENT_PLUS_TWO_INPUT` is the other site following it.

**Do not assume a lineage ordering.** Write explicit build tests (`BUILD == CP160 || BUILD == COM1`)
rather than `BUILD >= CP160`. CoM 1 is built on the same 1991 executable but whether it carries
every CP 1.60 change is an empirical question — R6.3 is what settles it. An ordering comparison
would quietly assert the answer at every site that uses it.

## Coverage ledgers

Each build gets its **own complete ledger**; a shared one cannot express divergence. Rows carry a
build key so the three can sit in one table:

```
| N | build | Start | End | Within | Disposition | Title |
| 0 | mom131 | `0x8F310` | `0x8F332` | — | compiler-only | prologue |
| 1 | mom131 | `0x8F332` | `0x8F35A` | — | reconstructed | Holy Bonus |
```

Build keys are `mom131`, `mom160`, `com1`. Dispositions and the no-gaps rule are the protocol's.
`Within` cites the ledger's **own** row numbers, so numbering restarts at 0 for each build — and
the checker splits ledgers on that restart alone. It is verification metadata for an enclosing
conditional **skip edge**, not a claim that the named row is the child's unique control-flow
parent or dominates every entry. For a child `[lo, hi)`, `verify_dos_derivation.py` finds earlier
conditional jumps whose source is below `lo` and whose taken target is at or beyond `hi`, maps
their sources to ledger rows, and requires `Within` to name the greatest such row number (or `—`
when none exists). An out-of-line island or callable helper can therefore have `Within N` even
when another jump or call enters it. Put those alternate entries in the row title or an adjacent
byte-backed note; do not change `Within` to express exclusive CFG ownership.

Check once per build. While deriving, everything is in one `.derivations/<ID>.<agent>.md`; once
merged, the ledgers are in the evidence markdown and the annotations are in the `.c`, so pass
both — comma-separated, no spaces — or the merged artifact appears to cite nothing:

```bash
python tools/verify_dos_derivation.py "<WIZARDS.EXE>" "<doc.md>" mom131
```
```bash
python tools/verify_dos_derivation.py "<WIZARDS.EXE>" "R6.1a.evidence.md,unitcalc.c" com1
```

An annotation may sit on the statement's first instruction rather than its branch: the checker
accepts a citation up to 16 bytes before a jump and 96 before a write, so annotating the `cmp`
that feeds a test is correct and preferred.

A clean run means every semantic element is *cited*, never that the right meaning was attached to
it — a misread branch target or an inverted condition passes. It narrows where to look; it does
not confirm a reading.
