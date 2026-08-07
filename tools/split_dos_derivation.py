"""Split a DOS derivation artifact into per-build citation extracts.

    split_dos_derivation.py <doc.md>[,<more>...] <build> <out.md>
    split_dos_derivation.py .derivations/R6.1d.claude.md com1 /tmp/ex_com1.md

`verify_dos_derivation.py` keeps **one** citation set for the whole document, so
wherever two builds share an address a citation written for one silently
satisfies the other and a whole-document run proves nothing about either. CoM 1
is usually rebased far enough for that not to bite, but 1.31 and CP 1.60 share
this executable's addresses everywhere, and CoM 1 overlaps them inside
`BU_Apply_Specials` and the stat recompute.

`Reference docs/DOS reconstructed/README.md` prescribes the workaround: extract
the build's own section and check that. This automates it, so a reviewer can
reproduce the run. **R6.4 supersedes it** by scoping the checker itself; delete
this once `--build` exists.

What is kept for build K:

* coverage-ledger rows whose build key is K;
* branch/call-table rows that name K. A row names K either in its own cells
  (`MoM`/`all` for both MoM builds, `CP` for `mom160`, `com1` for CoM 1) or
  through the nearest preceding heading, since an artifact may put the build in
  a section heading and leave the rows carrying only addresses and bytes;
* the addresses in the `K:` field of every address annotation. Fields run from
  their `131:` / `160:` / `com1:` marker to the next marker **on the same
  line**, so an annotation that wraps must repeat its marker on the
  continuation line or the continuation is dropped.
* `160:=` and `com1:=` ("same address as 1.31") resolve to the `131:` field of
  that line.

Everything else -- prose, notes, the reconstruction's own C -- is discarded, so
the extract is a citation list, not a readable artifact.

**A wrapped annotation must repeat its marker.** A continuation line carrying no
`131:` / `160:` / `com1:` marker is dropped, and the checker then reports
unaccounted branches that the same document passes cleanly on an unsplit run --
so a non-zero count here is a question about the artifact's annotation style
before it is a question about its coverage. `unitcalc.c` predates this tool and
wraps that way: splitting it reports 29 unaccounted `com1` jumps in R6.1c's
extent where the documented unsplit command reports none.
"""
import re
import sys

if len(sys.argv) != 4:
    sys.exit(__doc__.strip().split('\n\n')[1])
DOC, BUILD, OUT = sys.argv[1], sys.argv[2], sys.argv[3]

KEY = {'mom131': '131', 'mom160': '160', 'com1': 'com1'}.get(BUILD)
if KEY is None:
    sys.exit(f'unknown build {BUILD!r}; expected mom131, mom160 or com1')

src = '\n'.join(open(p, encoding='utf-8').read() for p in DOC.split(',')).split('\n')

MARK = re.compile(r'\b(131|160|com1):')
LEDGER = re.compile(r'^\| \d+ \| (\w+) \|')
TABLE = re.compile(r'^\|.*`0x[0-9A-Fa-f]{4,6}`')
HEADING = re.compile(r'^#{2,}\s+(.*)')


def names_build(text):
    """True if this prose names the build under check."""
    if BUILD in ('mom131', 'mom160'):
        if 'MoM' in text or 'all' in text or BUILD in text:
            return True
        return 'CP' in text and BUILD == 'mom160'
    return 'com1' in text or 'CoM 1' in text or 'CoM' in text


kept, heading = [], ''
for line in src:
    h = HEADING.match(line)
    if h:
        heading = h.group(1)
        continue
    m = LEDGER.match(line)
    if m:
        if m.group(1) == BUILD:
            kept.append(line)
        continue
    if TABLE.match(line) and '---' not in line:
        # The build may be in the row or, for a per-build table, in its heading.
        if names_build(line) or names_build(heading):
            kept.append(line)
        continue
    if not MARK.search(line):
        continue
    parts = re.split(r'\b(131|160|com1):', line)
    fields = {}
    for k in range(1, len(parts), 2):
        fields.setdefault(parts[k], []).append(parts[k + 1])
    if KEY not in fields:
        continue
    text = ' '.join(fields[KEY])
    if KEY in ('160', 'com1') and re.match(r'^\s*=', text) and '131' in fields:
        text = ' '.join(fields['131'])
    addrs = re.findall(r'0x[0-9A-Fa-f]{4,6}', text)
    if addrs:
        kept.append('  '.join(addrs))

open(OUT, 'w', encoding='utf-8').write('\n'.join(kept) + '\n')
print(f'{BUILD}: {len(kept)} lines -> {OUT}')
