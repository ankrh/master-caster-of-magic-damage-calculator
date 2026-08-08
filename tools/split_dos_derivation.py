"""Split a DOS derivation artifact into per-build citation extracts.

    split_dos_derivation.py <doc.md>[,<more>...] <build> <out.md>
    split_dos_derivation.py .derivations/R6.1d.claude.md com1 /tmp/ex_com1.md

`verify_dos_derivation.py` keeps **one** citation set for the whole document, so
wherever two builds share an address a citation written for one silently
satisfies the other and a whole-document run proves nothing about either. CoM 1
is usually rebased far enough for that not to bite, but 1.31 and CP 1.60 share
this executable's addresses everywhere, and CoM 1 overlaps them inside
`BU_Apply_Specials` and the stat recompute.

`verify_dos_derivation.py` imports this module's extractor and scopes citations
before checking them. The CLI remains useful for inspecting or preserving the
exact citation list used for one build.

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

BUILD_KEYS = {'mom131': '131', 'mom160': '160', 'com1': 'com1'}

MARK = re.compile(r'\b(131|160|com1):')
LEDGER = re.compile(r'^\| \d+ \| (\w+) \|')
TABLE = re.compile(r'^\|.*`0x[0-9A-Fa-f]{4,6}`')
HEADING = re.compile(r'^#{2,}\s+(.*)')
ADDRESS = re.compile(r'0x[0-9A-Fa-f]{4,6}')


def _consume(text, pattern, builds, selected):
    """Consume one label shape so a shorter generic label cannot re-match it."""
    rx = re.compile(pattern, re.I)
    if rx.search(text):
        builds.update(selected)
        text = rx.sub(' ', text)
    return text


def named_builds(text):
    """Return build keys explicitly named by a heading or table row."""
    builds = set()
    token = r'(?<![A-Za-z0-9_]){}(?![A-Za-z0-9_])'

    # Consume compound and explicit labels before their generic components.
    text = _consume(text, token.format(r'all\s+MoM'), builds,
                    {'mom131', 'mom160'})
    text = _consume(text, token.format(r'MoM\s+CP\s+1\.60'), builds,
                    {'mom160'})
    text = _consume(text, token.format(r'CP\s+1\.60'), builds, {'mom160'})
    text = _consume(text, token.format(r'MoM\s+1\.31'), builds, {'mom131'})
    text = _consume(text, token.format(r'CoM\s+1'), builds, {'com1'})

    for label, selected in (
            ('mom131', {'mom131'}), ('mom160', {'mom160'}),
            ('com1', {'com1'}), ('all', set(BUILD_KEYS)),
            ('CP', {'mom160'}), ('CoM', {'com1'}),
            ('MoM', {'mom131', 'mom160'})):
        text = _consume(text, token.format(re.escape(label)), builds, selected)
    return builds


def extract_build_lines(text, build):
    """Extract the citation-bearing lines that belong to one DOS build."""
    key = BUILD_KEYS.get(build)
    if key is None:
        raise ValueError(
            f'unknown build {build!r}; expected mom131, mom160 or com1')

    kept, heading = [], ''
    for line in text.splitlines():
        h = HEADING.match(line)
        if h:
            heading = h.group(1)
            continue
        m = LEDGER.match(line)
        if m:
            if m.group(1) == build:
                kept.append(line)
            continue
        if TABLE.match(line) and '---' not in line:
            # The build may be in the row or, for a per-build table, in its heading.
            if build in named_builds(line) or build in named_builds(heading):
                kept.append(line)
            continue
        # Several durable inventories are plain code blocks rather than tables.
        # A build-labelled heading or a leading ``mom131:`` / ``all:`` field is
        # equally explicit and must remain usable by the integrated verifier.
        prefix = re.match(r'^\s*([^:]{1,40}):', line)
        if ADDRESS.search(line) and (
                build in named_builds(heading)
                or (prefix and build in named_builds(prefix.group(1)))):
            kept.append(line)
            continue
        if not MARK.search(line):
            continue
        parts = re.split(r'\b(131|160|com1):', line)
        fields = {}
        for k in range(1, len(parts), 2):
            fields.setdefault(parts[k], []).append(parts[k + 1])
        if key not in fields:
            continue
        selected_text = ' '.join(fields[key])
        if key in ('160', 'com1') and re.match(r'^\s*=', selected_text) \
                and '131' in fields:
            selected_text = ' '.join(fields['131'])
        addrs = ADDRESS.findall(selected_text)
        if addrs:
            kept.append('  '.join(addrs))
    return kept


def extract_build_text(text, build):
    """Return the newline-delimited citation extract used by the verifier."""
    lines = extract_build_lines(text, build)
    return '\n'.join(lines) + ('\n' if lines else '')


def main(argv=None):
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 3:
        sys.exit(__doc__.strip().split('\n\n')[1])
    doc, build, out = argv
    try:
        src = '\n'.join(
            open(p, encoding='utf-8').read() for p in doc.split(','))
        result = extract_build_text(src, build)
    except ValueError as exc:
        sys.exit(str(exc))
    with open(out, 'w', encoding='utf-8') as stream:
        stream.write(result)
    print(f'{build}: {len(result.splitlines())} lines -> {out}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
