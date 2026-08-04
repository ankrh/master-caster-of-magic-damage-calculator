"""Check a derivation artifact's rendered Pascal against the extent's semantic flow.

    verify_derivation.py Caster.exe .derivations/R5.1b.claude.md
    verify_derivation.py Caster.exe <doc.md> 0x59A02C 0x5A65B2

A document may own several disjoint assigned extents, each with its own ledger.
With no extent on the command line, the ledgers are split into maximal
contiguous runs and each run is checked as its own extent -- the gap *between*
two routines is a boundary, not a hole. Pass an extent explicitly to check just
one of them; only ledger rows wholly inside it are then considered.

For every semantic conditional jump, semantic call and named-field write in the
binary, ask whether the derivation cites an address that accounts for it.
A branch is accounted for if the derivation cites any address in [cmp, jump] --
the reconstruction anchors on the test, not the jump.

Also parses the artifact's coverage ledger and recomputes each row's innermost
gate from the branches that straddle it, so a block written as top-level while
the binary nests it inside another is reported.

The executable path is an argument, not a constant: `Reference docs/Caster
binary/README.md` is its single home.

Exit status is 1 if any extent reports a gap, a declared-parent mismatch or an
unaccounted element, so the checker can gate a change.

**Known limitation -- read before trusting a clean run.** This checker verifies
that every semantic element is *cited*, not that the derivation attached the
right meaning to it. All five errors found in the R5.1b comparison (2026-08-02)
passed it cleanly: a mis-read branch target, a rider placed outside the gate
that encloses it, and an arithmetic idiom read without its correction all cite
exactly the addresses they should. Zero counts here are necessary, not
sufficient. See DERIVATION-REVIEW-PROTOCOL.md, "Derivation completion gate".

Requires: pip install capstone
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import annotate_caster_disasm as A                       # noqa: E402
from capstone import CS_ARCH_X86, CS_MODE_32, Cs         # noqa: E402

if len(sys.argv) < 3:
    sys.exit(__doc__.strip().split('\n\n')[1])
EXE, DOC = sys.argv[1], sys.argv[2]

_doc = open(DOC, encoding='utf-8').read()

cited = set()
for m in re.finditer(r'\$00([0-9A-Fa-f]{6})', _doc):
    cited.add(int(m.group(1), 16))
# ranges written as $0059ADF4..0059AE41 -> also take the right-hand address
for m in re.finditer(r'\.\.(?:00)?([0-9A-F]{6})', _doc):
    cited.add(int(m.group(1), 16))

# Coverage ledger: | N | `$00XXXXXX` | `$00XXXXXX` | (—|N) | disposition | title |
# The leading row number matters: `Within` refers to a row of the *same* ledger,
# and numbering restarts at 0 in each one, so ledgers must never be merged.
rows = [(int(m.group(2), 16), int(m.group(3), 16),
         None if m.group(4) == '—' else int(m.group(4)), m.group(6),
         int(m.group(1)))
        for m in re.finditer(
            r'^\| (\d+) \| `\$00([0-9A-F]{6})` \| `\$00([0-9A-F]{6})` \| '
            r'(—|\d+) \| ([\w-]+) \| (.+?) \|$', _doc, re.M)]

EXPLICIT = len(sys.argv) >= 5
if EXPLICIT:
    LO, HI = int(sys.argv[3], 16), int(sys.argv[4], 16)
    rows = [r for r in rows if LO <= r[0] and r[1] <= HI]
    if not rows:
        sys.exit(f'no ledger rows inside {LO:06X}..{HI:06X}')
    extents = [(LO, HI, rows)]
elif rows:
    # One group per ledger. A new ledger starts **only** when the row number
    # restarts, because `Within` cites the ledger's own row numbers and merging
    # two ledgers makes the second's parents resolve against the first's rows.
    # That is what distinguishes two adjacent ledgers (R5.2a ends exactly where
    # R5.2b begins) without needing address contiguity as a signal.
    #
    # Address discontinuity must NOT split a ledger. Splitting on it silently
    # reclassifies a coverage hole as two adjacent extents, each contiguous on
    # its own, and the run exits clean -- the gap the protocol forbids becomes
    # invisible. Within one numbering sequence a discontinuity is a gap, and the
    # contiguity check below reports it. (Found 2026-08-04 while building the
    # DOS checker, whose fixture with a deliberate hole passed.)
    extents, run = [], [rows[0]]
    for r in rows[1:]:
        if r[4] > run[-1][4]:
            run.append(r)
        else:
            extents.append((run[0][0], run[-1][1], run))
            run = [r]
    extents.append((run[0][0], run[-1][1], run))
else:
    sys.exit('no coverage ledger found and no extent given on the command line')

c = A.Caster(EXE)
guards = {v[0] for n, v in c.procs.items()
          if 'BoundErr' in n or 'IntOver' in n or 'BoundsCheck' in n}
COND = re.compile(r'^j(?!mp$)\w+$')


def disasm(lo, hi):
    fo = None
    for _n, sva, raw in c.sections:
        if sva + c.imagebase <= lo:
            fo = raw + (lo - c.imagebase - sva)
    return list(Cs(CS_ARCH_X86, CS_MODE_32).disasm(c.d[fo:fo + hi - lo], lo))


def tgt(i):
    m = re.fullmatch(r'0x([0-9a-f]+)', i.op_str)
    return int(m.group(1), 16) if m else None


def check(LO, HI, rows):
  """Verify one assigned extent. Returns True if anything is wrong."""
  ins = disasm(LO, HI)
  miss_j, miss_c, miss_w, n_j, n_c, n_w = [], [], [], 0, 0, 0
  for k, i in enumerate(ins):
      nxt = ins[k + 1] if k + 1 < len(ins) else None
      if i.mnemonic == 'call':
          if tgt(i) in guards:
              continue
          n_c += 1
          if i.address not in cited:
              miss_c.append(i.address)
          continue
      if COND.match(i.mnemonic):
          if nxt and nxt.mnemonic == 'call' and tgt(nxt) in guards:
              continue
          if i.mnemonic == 'jns' and nxt and nxt.mnemonic == 'adc' \
                  and nxt.op_str.endswith(', 0'):
              continue
          n_j += 1
          # accept any citation from 16 bytes before the jump up to the jump
          if not any(a in cited for a in range(i.address - 16, i.address + 1)):
              miss_j.append(i.address)
          continue
      if i.mnemonic in ('mov', 'add', 'sub', 'inc', 'dec', 'or', 'and', 'xor',
                        'imul', 'shl', 'sar'):
          dest = i.op_str.split('],')[0] + ']' if '],' in i.op_str else i.op_str
          if not re.match(r'(dword|word|byte) ptr \[', dest):
              continue
          # Absolute Units/BaseUnits displacement, OR a write through a cached
          # record pointer held in a register (the item pointer, the two
          # AttackFlagsT pointers and the unit-base pointers all work this way).
          # Missing the latter is how an earlier run of this checker undercounted.
          hit = any(A.name_disp(int(mm.group(1), 16), True)
                    for mm in re.finditer(r'0x([0-9a-f]{2,8})', dest))
          if not hit:
              hit = bool(re.match(r'(dword|word|byte) ptr \[e(?!bp|sp)\w\w'
                                  r'(?: [-+] (?:0x)?[0-9a-f]+)?\]$', dest))
          for _ in ([1] if hit else []):
                  n_w += 1
                  # a rendered read-modify-write statement anchors on the first
                  # instruction of the sequence, so accept a nearby citation
                  if not any(a in cited
                             for a in range(i.address - 96, i.address + 1)):
                      miss_w.append(i.address)
                  break

  # ---------------------------------------------------------------- nesting --
  # A conditional branch that starts in row A and jumps past the end of row B
  # (A != B, both inside the ledger) means B executes only under A's gate -- so B
  # is not an independent block and must be rendered inside A. This is the check
  # that would have caught the Heavenly Light tail written as a top-level block.


  # `Within` cites the ledger's own row number, so resolve to that, not to the
  # position in this list.
  def row_of(a):
      for lo, hi, _d, _t, num in rows:
          if lo <= a < hi:
              return num
      return None


  # innermost row that gates each row, computed from straddling branches
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

  gaps = []
  print(f'extent {LO:06X}..{HI:06X}   doc {os.path.basename(DOC)}\n')
  print(f'coverage ledger rows parsed: {len(rows)}')
  if not rows:
      print('  *** ledger not found -- nesting check skipped ***')
  else:
      if rows[0][0] != LO or rows[-1][1] != HI:
          print(f'  *** ledger spans {rows[0][0]:06X}..{rows[-1][1]:06X}, '
                f'extent is {LO:06X}..{HI:06X} ***')
      gaps = [(rows[k][1], rows[k + 1][0]) for k in range(len(rows) - 1)
              if rows[k][1] != rows[k + 1][0]]
      shown = ', '.join(f'{a:06X}..{b:06X}' for a, b in gaps)
      print(f'  contiguous / no gaps      : {"yes" if not gaps else "NO  " + shown}')
      nested = sum(1 for r in rows if r[2] is not None)
      print(f'  rows declaring a parent    : {nested}')
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
              print(f'  {a:06X}')

  return bool(gaps or bad or miss_j or miss_c or miss_w)


problems = False
for _lo, _hi, _rows in extents:
    problems |= check(_lo, _hi, _rows)

if len(extents) > 1:
    print(f'{len(extents)} assigned extents checked separately.')
print('\nNOTE: citation coverage only. A clean run does not mean the derivation '
      'read those\ninstructions correctly -- see the module docstring.')
sys.exit(1 if problems else 0)
