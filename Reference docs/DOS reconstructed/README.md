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
| `unitcalc.c` | Battle-unit constructor, stat recompute, `BU_Apply_Specials`, their callees |
| `combat.c` | `BU_AttackTarget`, `BU_ProcessAttack`, resolution helpers |
| `<ID>.evidence.md` | One item's coverage ledgers, counts, findings and any `disputed` rows |

The `.c` files are shared across items and grow as items land. Reconstruction bodies go in the
`.c`; ledgers and prose go in the evidence markdown.

## One source, three builds

**Do not write three near-identical files.** All three builds are reconstructed into one body with
explicit version branching, because the version differences *are* the deliverable for A31, A32,
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

Because CoM 1's addresses are distinct numbers, one shared citation set stays unambiguous across
builds; the checker relies on that.

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
the checker splits ledgers on that restart alone.

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
