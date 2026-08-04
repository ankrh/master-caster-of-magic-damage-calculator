"""Check a DOS derivation artifact's rendered C against the extent's semantic flow.

    verify_dos_derivation.py WIZARDS.EXE .derivations/R6.1a.claude.md mom131
    verify_dos_derivation.py WIZARDS.EXE <doc.md>[,<more>...] <build> [lo hi]
    verify_dos_derivation.py WIZARDS.EXE 'R6.1a.evidence.md,unitcalc.c' com1

The 16-bit Borland C++ counterpart of `verify_derivation.py`, which handles only
the 32-bit Delphi `Caster.exe`. Same contract, three target differences:

* **Addresses are raw file offsets.** `WIZARDS.EXE` is an MZ image with VROOMM
  overlays and no overlay->file map, so `Reference docs/MoM binary analysis.md`
  cites file offsets throughout and `scan_mom_binary.py` disassembles at them
  directly. There is no section table or image base to resolve -- which is why
  this checker needs no loader at all.
* **One artifact, three builds.** An R6 item covers MoM 1.31, MoM CP 1.60 and
  CoM 1 together, and the protocol gives each build its own complete ledger. A
  ledger row therefore carries a build key and `--build` selects one:

      | 3 | mom131 | `0x8F332` | `0x8F35A` | 2 | reconstructed | Holy Bonus |

  Rows for other builds are ignored for that run, so each build's ledger is
  checked for contiguity and nesting on its own terms. Run once per build.
* **Named-field writes are BATTLE_UNIT displacements**, taken from
  `scan_mom_binary.FIELDS`, rather than Delphi's absolute record displacements.

Citations are plain `0x` hex, matching the DOS analysis docs. 1.31 and CP 1.60
share addresses, so a citation may satisfy both; CoM 1 is rebased and its
addresses are distinct numbers, so the shared citation set stays unambiguous.

**Known limitation -- read before trusting a clean run.** Like its Delphi
sibling, this verifies that each semantic element is *cited*, never that the
derivation attached the right meaning to it. A misread branch target, a rider
placed outside its gate or an inverted condition all pass cleanly. It narrows
where to look; it does not confirm a reading.
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capstone import CS_ARCH_X86, CS_MODE_16, Cs            # noqa: E402
from scan_mom_binary import FIELDS                          # noqa: E402

if len(sys.argv) < 4:
    sys.exit(__doc__.strip().split('\n\n')[1])
EXE, DOC, BUILD = sys.argv[1], sys.argv[2], sys.argv[3]

DATA = open(EXE, 'rb').read()
# DOC may be a comma-separated list. During derivation everything lives in one
# `.derivations/<ID>.<agent>.md`; once merged, the ledgers are in the evidence
# markdown while the address annotations are in the reconstruction `.c` beside
# it. Both must be scanned, or the merged artifact would appear to cite nothing.
_doc = '\n'.join(open(p, encoding='utf-8').read() for p in DOC.split(','))

# Citations: bare 0x hex, 4-6 digits. Ranges written 0x8F310..0x8F880 also
# contribute their right-hand address, as in the Delphi checker.
cited = {int(m.group(1), 16)
         for m in re.finditer(r'0x([0-9A-Fa-f]{4,6})\b', _doc)}

# Coverage ledger, one row per build:
# | N | build | `0xXXXXX` | `0xXXXXX` | (—|N) | disposition | title |
rows = [(int(m.group(3), 16), int(m.group(4), 16),
         None if m.group(5) == '—' else int(m.group(5)), m.group(7),
         int(m.group(1)))
        for m in re.finditer(
            r'^\| (\d+) \| (\w+) \| `0x([0-9A-Fa-f]{4,6})` \| '
            r'`0x([0-9A-Fa-f]{4,6})` \| (—|\d+) \| ([\w-]+) \| (.+?) \|$',
            _doc, re.M)
        if m.group(2) == BUILD]

EXPLICIT = len(sys.argv) >= 6
if EXPLICIT:
    LO, HI = int(sys.argv[4], 16), int(sys.argv[5], 16)
    rows = [r for r in rows if LO <= r[0] and r[1] <= HI]
    if not rows:
        sys.exit(f'no {BUILD} ledger rows inside {LO:05X}..{HI:05X}')
    extents = [(LO, HI, rows)]
elif rows:
    # One group per ledger. A new ledger starts **only** when the row number
    # restarts, because `Within` cites the ledger's own row numbers and merging
    # two ledgers makes the second's parents resolve against the first's rows.
    #
    # Address discontinuity must NOT split a ledger. Splitting on it silently
    # reclassifies a coverage hole as two adjacent extents, each contiguous on
    # its own, and the run exits clean -- which is exactly the gap the protocol
    # forbids. Within one numbering sequence a discontinuity is a gap, and the
    # contiguity check below reports it.
    extents, run = [], [rows[0]]
    for r in rows[1:]:
        if r[4] > run[-1][4]:
            run.append(r)
        else:
            extents.append((run[0][0], run[-1][1], run))
            run = [r]
    extents.append((run[0][0], run[-1][1], run))
else:
    sys.exit(f'no {BUILD} coverage ledger found and no extent given')

COND = re.compile(r'^j(?!mp$)\w+$')
# Borland's __far pointers and struct access use these bases; [bp+..] is locals
# and argument frame, so a displacement there is not a BATTLE_UNIT field.
FIELD_BASE = re.compile(r'\[(bx|si|di|bx \+ si|bx \+ di)'
                        r'(?: \+ (?:0x)?([0-9a-f]+))?\]$')


def disasm(lo, hi):
    """Addresses are file offsets, so the slice indexes directly."""
    return list(Cs(CS_ARCH_X86, CS_MODE_16).disasm(DATA[lo:hi], lo))


def tgt(i):
    m = re.fullmatch(r'0x([0-9a-f]+)', i.op_str)
    return int(m.group(1), 16) if m else None


def named_write(i):
    """True if this instruction writes a known BATTLE_UNIT field or a global."""
    if i.mnemonic not in ('mov', 'add', 'sub', 'inc', 'dec', 'or', 'and',
                          'xor', 'imul', 'shl', 'sar'):
        return False
    dest = i.op_str.split('],')[0] + ']' if '],' in i.op_str else i.op_str
    if not dest.rstrip().endswith(']'):
        return False          # register destination
    m = FIELD_BASE.search(dest)
    if m:
        disp = int(m.group(2), 16) if m.group(2) else 0
        return disp in FIELDS
    # absolute [0xXXXX] -- a global write; counted, since the DOS globals
    # (player records, Chaos Surge, Holy Arms) are load-bearing state.
    return bool(re.search(r'\[0x[0-9a-f]{2,4}\]$', dest))


def check(LO, HI, rows):
    """Verify one assigned extent for one build. True if anything is wrong."""
    ins = disasm(LO, HI)
    miss_j, miss_c, miss_w, n_j, n_c, n_w = [], [], [], 0, 0, 0
    for k, i in enumerate(ins):
        nxt = ins[k + 1] if k + 1 < len(ins) else None
        if i.mnemonic in ('call', 'lcall'):
            n_c += 1
            if i.address not in cited:
                miss_c.append(i.address)
            continue
        if COND.match(i.mnemonic):
            # `jns` + `adc reg,0` is the compiler's signed division correction,
            # not a semantic branch. Same idiom in Borland C++ as in Delphi.
            if i.mnemonic == 'jns' and nxt and nxt.mnemonic == 'adc' \
                    and nxt.op_str.endswith(', 0'):
                continue
            n_j += 1
            if not any(a in cited for a in range(i.address - 16, i.address + 1)):
                miss_j.append(i.address)
            continue
        if named_write(i):
            n_w += 1
            # a rendered read-modify-write anchors on the sequence's first
            # instruction, so accept a nearby citation
            if not any(a in cited for a in range(i.address - 96, i.address + 1)):
                miss_w.append(i.address)

    def row_of(a):
        for lo, hi, _d, _t, num in rows:
            if lo <= a < hi:
                return num
        return None

    bad = []
    for lo, hi, declared, title, num in rows:
        gates = set()
        for i in ins:
            if not i.mnemonic.startswith('j') or i.mnemonic == 'jmp':
                continue
            t = tgt(i)
            if t is None or not (i.address < lo and t >= hi):
                continue
            src = row_of(i.address)
            if src is not None and src != num:
                gates.add(src)
        computed = max(gates) if gates else None
        if computed != declared:
            bad.append((num, title, declared, computed))

    print(f'extent {LO:05X}..{HI:05X}   build {BUILD}   '
          f'doc {os.path.basename(DOC)}\n')
    print(f'coverage ledger rows parsed: {len(rows)}')
    if rows[0][0] != LO or rows[-1][1] != HI:
        print(f'  *** ledger spans {rows[0][0]:05X}..{rows[-1][1]:05X}, '
              f'extent is {LO:05X}..{HI:05X} ***')
    gaps = [(rows[k][1], rows[k + 1][0]) for k in range(len(rows) - 1)
            if rows[k][1] != rows[k + 1][0]]
    shown = ', '.join(f'{a:05X}..{b:05X}' for a, b in gaps)
    print(f'  contiguous / no gaps       : {"yes" if not gaps else "NO  " + shown}')
    print(f'  rows declaring a parent    : {sum(1 for r in rows if r[2] is not None)}')
    print(f'  declared parent mismatches : {len(bad)}')
    for k, title, declared, computed in bad:
        d = declared if declared is not None else '-'
        c = computed if computed is not None else '-'
        print(f'    *** row {k} "{title}" declares Within={d}, binary says {c}')
    print()
    print(f'derivation cites {len(cited)} distinct addresses\n')
    print(f'semantic conditional jumps : {n_j:>4}   unaccounted: {len(miss_j)}')
    print(f'semantic calls             : {n_c:>4}   unaccounted: {len(miss_c)}')
    print(f'named-field writes         : {n_w:>4}   unaccounted: {len(miss_w)}')
    for lbl, xs in (('jumps', miss_j), ('calls', miss_c), ('writes', miss_w)):
        if xs:
            print(f'\nunaccounted {lbl} ({len(xs)}):')
            for a in xs:
                print(f'  {a:05X}')
    return bool(gaps or bad or miss_j or miss_c or miss_w)


problems = False
for _lo, _hi, _rows in extents:
    problems |= check(_lo, _hi, _rows)

if len(extents) > 1:
    print(f'{len(extents)} assigned extents checked separately.')
print('\nNOTE: citation coverage only. A clean run does not mean the derivation '
      'read those\ninstructions correctly -- see the module docstring.')
sys.exit(1 if problems else 0)
