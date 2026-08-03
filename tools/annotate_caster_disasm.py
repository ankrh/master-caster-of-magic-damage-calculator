"""Annotated disassembly of Caster.exe, for reading @Units@RecalculateUnits.

    annotate_caster_disasm.py Caster.exe 0x59A02C 0x200 [--raw]
    annotate_caster_disasm.py Caster.exe 0x59E2DC 0x1D1 --inbound

**Run `--inbound` before reconstructing any block.** It reports every branch in
the *enclosing routine* that lands inside the range, and flags those coming from
outside it. A plain dump shows only the branches within the window, so a block
nested inside an outer gate is indistinguishable from a top-level one.

`tools/scan_caster_binary.py dis` gives raw instructions with TD32 local names.
This adds what makes the big recalculation routine actually readable:

  * absolute displacements resolved to record fields -- `unitT` via the Units
    and BaseUnits array bases, `WizardT` via the wizard stride -- using the
    layout computed by caster_record_layout.py;
  * enchantment, global-enchantment and retort array indices named from
    SharedConstants.pas, so `[... + 0x6426dc8]` reads as
    `U.EnchantmentFlags[40=EncHeroism]`;
  * call targets resolved to TD32 procedure names;
  * Delphi's BoundErr/IntOver guard calls collapsed to a count;
  * the 10-instruction unit-record addressing idiom collapsed to one `.addr`
    line -- it precedes nearly every field access and is pure boilerplate.

Roughly 15x denser than raw output. Pass --raw to disable all collapsing when a
block needs checking instruction by instruction.

Two cautions carried over from CoM2 binary analysis.md: linear disassembly
desynchronises easily in this routine, so anchor on an address already known to
be an instruction boundary; and wizard-record offsets carry the +8 drift
documented in caster_record_layout.py.

Requires: pip install capstone
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from caster_record_layout import (UNITT, WIZARD_DRIFT, WIZARD_SIZE,  # noqa: E402
                                  flatten, wizard_flat)
from scan_caster_binary import Caster                            # noqa: E402

# Established in CoM2 binary analysis.md, "Reading unit fields".
UNITS_BASE, BASEUNITS_BASE, UNIT_SIZE = 0x6426898, 0x1AC1798, 1924
DATA_BLOCK_PTR = 0x709188
WIZARD_STRIDE = WIZARD_SIZE

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARED = os.path.join(REPO, 'Reference docs', 'Script source', 'CAS reference',
                      'SharedConstants.pas')

RETORTS = ['Alchemy', 'SageMaster', 'Specialist', 'Warlord', 'Myrran',
           'Tactician', 'Channeler', 'Guardian', 'Omniscient', 'Archmage',
           'Famous', 'CultLeader', 'Artificer', 'Runemaster', 'Astrologer',
           'Conjurer', 'Charismatic', 'Spellweaver']


def _constants():
    """Constant name -> value, from SharedConstants.pas."""
    txt = open(SHARED, encoding='latin1').read()
    out = {}
    for m in re.finditer(r'([A-Za-z_]\w*)\s*=\s*(\d+)\s*;', txt):
        out.setdefault(m.group(1), int(m.group(2)))
    return out


CONSTS = _constants()
ENC_BY_ID = {v: k for k, v in sorted(CONSTS.items())
             if k.lower().startswith('enc')}
GLOBAL_BY_ID = {v: k for k, v in sorted(CONSTS.items())
                if k.lower().startswith('ge')}
RETORT_BY_ID = dict(enumerate(RETORTS, start=1))

UFLAT = flatten(UNITT)
WFLAT = wizard_flat()


def _lookup(flat, off, idmaps=()):
    for name, base, esize, count in flat:
        if not base <= off < base + esize * count:
            continue
        if count == 1:
            return name if off == base else f'{name}+{off - base}'
        k = (off - base) // esize + 1          # CAS arrays are 1-based
        for suffix, ids in idmaps:
            if name.endswith(suffix) and k in ids:
                return f'{name}[{k}={ids[k]}]'
        return f'{name}[{k}]'
    return None


def name_disp(v, allow_wizard=False):
    """Absolute displacement -> record field name, or None."""
    for base, tag in ((UNITS_BASE, 'U'), (BASEUNITS_BASE, 'BU')):
        d = v - base
        if 0 <= d < UNIT_SIZE:
            f = _lookup(UFLAT, d, (('EnchantmentFlags', ENC_BY_ID),))
            if f:
                # Displacement-only naming is WRONG when the operand also
                # carries a scaled sub-record index: the equipment loop reaches
                # equip[j] as `unit + j*244 + <ItemT offset>`, whose bare
                # displacement lands somewhere in `name`. This routine never
                # reads the unit's name string, so a hit inside it is the
                # signature of exactly that -- flag it instead of asserting it.
                if f.startswith('name'):
                    return f'{tag}.{f}?? indexed access, not a name read'
                return f'{tag}.{f}'
        if -8 <= d < 0:
            # element 0 of a 1-based array is addressed one element low
            return f'{tag}.<base{d}>'
    if allow_wizard and 0x14 <= v < WIZARD_STRIDE:
        w = _lookup(WFLAT, v, (('GlobalEnchantments', GLOBAL_BY_ID),
                               ('Retorts', RETORT_BY_ID)))
        if w:
            return f'W.{w}'
    return None


def _branch_target(insn):
    m = re.fullmatch(r'0x([0-9a-f]+)', insn.op_str)
    return int(m.group(1), 16) if m else None


def disassemble(exe, va, length, raw=False, proc='@Units@RecalculateUnits'):
    from capstone import CS_ARCH_X86, CS_MODE_32, Cs
    c = Caster(exe)
    byva = {v[0]: n for n, v in c.procs.items()}
    guards = {v[0] for n, v in c.procs.items()
              if 'BoundErr' in n or 'IntOver' in n or 'BoundsCheck' in n}
    loc = c.locals.get(proc, {})

    fo = None
    for _n, sva, rawoff in c.sections:
        if sva + c.imagebase <= va:
            fo = rawoff + (va - c.imagebase - sva)
    insns = list(Cs(CS_ARCH_X86, CS_MODE_32).disasm(c.d[fo:fo + length], va))

    targets, srcs = set(), {}
    for i in insns:
        if i.mnemonic.startswith('j') or i.mnemonic == 'loop':
            t = _branch_target(i)
            if t is not None:
                targets.add(t)
                srcs.setdefault(t, set()).add(i.address)

    guardcalls = {i.address for i in insns
                  if i.mnemonic == 'call' and _branch_target(i) in guards}

    def annotate(op):
        def sub_ebp(m):
            v = int(m.group(2), 16) * (-1 if m.group(1) == '-' else 1)
            return m.group(0) + (f'{{{loc[v]}}}' if v in loc else '')

        def sub_mem(m):      # only inside [...]: a bare immediate is not a disp
            mem = m.group(0)
            # EBP-relative values are frame offsets, and are already annotated
            # from TD32 locals above.  Small offsets on arbitrary pointers are
            # likewise not evidence of WizardT: item and unit pointers use the
            # same values extensively.  In this routine wizard fields are
            # addressed with the independently established eight-byte-scaled
            # wizard-stride index, so require that shape before consulting the
            # WizardT map.  Absolute Units/BaseUnits displacements remain safe
            # to resolve regardless of the index expression.
            if re.search(r'\bebp\b', mem):
                return mem
            allow_wizard = bool(re.search(r'\*\s*8\b', mem))

            def sub_abs(mm):
                # A NEGATIVE displacement is never a record-base offset -- the
                # combat-state record is addressed as `[reg + idx*8 - 0x194 +
                # e*4]`, which would otherwise be mistaken for a WizardT field
                # because it carries the same *8 index scale.
                if mem[max(0, mm.start() - 2):mm.start()].strip().endswith('-'):
                    return mm.group(0)
                nm = name_disp(int(mm.group(1), 16), allow_wizard)
                return mm.group(0) + (f'{{{nm}}}' if nm else '')

            return re.sub(r'0x([0-9a-f]{2,8})', sub_abs, mem)

        op = re.sub(r'ebp ([-+]) 0x([0-9a-f]+)', sub_ebp, op)
        return re.sub(r'\[[^\]]*\]', sub_mem, op)

    # The unit-record addressing idiom: bounds-check the 1-based index, scale by
    # the 0x1E1-dword record stride, load the runtime data-block pointer.
    #   mov <r>,[ebp-X] / dec / cmp <r>,0x9c3f / jbe / <guard>
    #   inc / imul <r>,<r>,0x1e1 / jno / <guard> / mov <r2>,[0x709188]
    idiom = [r'mov e\w\w, dword ptr \[ebp ([-+]) 0x([0-9a-f]+)\]', r'dec e\w\w',
             r'cmp e\w\w, 0x9c3f', r'jbe 0x\w+', r'inc e\w\w',
             r'imul e\w\w, e\w\w, 0x1e1', r'jno 0x\w+',
             rf'mov e\w\w, dword ptr \[0x{DATA_BLOCK_PTR:x}\]']

    def idiom_at(k):
        j, idx = k, None
        for n, want in enumerate(idiom):
            while j < len(insns) and insns[j].address in guardcalls:
                j += 1
            if j >= len(insns):
                return None, None
            m = re.fullmatch(want, f'{insns[j].mnemonic} {insns[j].op_str}')
            if not m:
                return None, None
            if n == 0:
                v = int(m.group(2), 16) * (-1 if m.group(1) == '-' else 1)
                idx = loc.get(v, f'ebp{v:+#x}')
            j += 1
        return j, idx

    out, k = [], 0
    while k < len(insns) and not raw:
        end, idx = idiom_at(k)
        # Collapse only if every label inside the span is reached solely from
        # inside it (the two guard-skip jumps), never from outside.
        inside = (insns[k].address, insns[end - 1].address) if end else (0, 0)
        if end and all(all(inside[0] <= s <= inside[1]
                           for s in srcs.get(x.address, ()))
                       for x in insns[k + 1:end] if x.address in targets):
            out.append((None, insns[k].address, idx))
            k = end
        else:
            out.append((insns[k], None, None))
            k += 1
    if raw:
        out = [(i, None, None) for i in insns]

    lines, pending = [], 0
    for insn, addr, idx in out:
        if insn is None:
            if pending:
                lines.append(f'          ... {pending} guard call(s)')
                pending = 0
            lines.append(f' {addr:06X}  .addr    <unit record {idx or "?"}>')
            continue
        if not raw and insn.address in guardcalls:
            pending += 1
            continue
        if pending:
            lines.append(f'          ... {pending} guard call(s)')
            pending = 0
        tgt = ''
        if insn.mnemonic in ('call', 'jmp'):
            t = _branch_target(insn)
            if t in byva:
                tgt = f'   ; {byva[t]}'
        lbl = '>' if insn.address in targets else ' '
        lines.append(f'{lbl}{insn.address:06X}  {insn.mnemonic:<7} '
                     f'{annotate(insn.op_str)}{tgt}')
    if pending:
        lines.append(f'          ... {pending} guard call(s)')
    return lines


def inbound(exe, va, length):
    """Every branch in the ENCLOSING routine that lands inside [va, va+length).

    Run this before reconstructing any block. A dumped range shows only the
    branches inside it, so a block that is actually nested inside an outer gate
    looks top-level -- which is exactly how `+0x049BC` was first misread as a
    weapon-material block rather than the tail of Heavenly Light. A target with
    sources from outside the range means the range is not a standalone block.
    """
    from capstone import CS_ARCH_X86, CS_MODE_32, Cs
    c = Caster(exe)
    host = None
    for n, (pva, _fo, plen, _mod) in c.procs.items():
        if pva <= va < pva + plen and (host is None or plen < host[2]):
            host = (n, pva, plen)
    if host is None:
        return [f'no TD32 routine contains {va:06X}']
    name, pva, plen = host
    fo = None
    for _n, sva, rawoff in c.sections:
        if sva + c.imagebase <= pva:
            fo = rawoff + (pva - c.imagebase - sva)
    ins = list(Cs(CS_ARCH_X86, CS_MODE_32).disasm(c.d[fo:fo + plen], pva))

    hits = {}
    for i in ins:
        if not (i.mnemonic.startswith('j') or i.mnemonic == 'call'):
            continue
        t = _branch_target(i)
        if t is not None and va <= t < va + length:
            hits.setdefault(t, []).append((i.address, i.mnemonic))

    # Branches that STRADDLE the range -- source before it, target at or after
    # its end. Each one is an outer gate deciding whether the range runs at all,
    # so the range is nested inside it and is not a standalone block. This is
    # the check that catches a mis-levelled block; the inbound list below does
    # not, because a shared exit target usually sits just past the range.
    end = va + length
    straddle = {}
    for i in ins:
        if not i.mnemonic.startswith('j'):
            continue
        t = _branch_target(i)
        if t is not None and i.address < va and t >= end:
            straddle.setdefault(t, []).append((i.address, i.mnemonic))

    out = [f'enclosing routine: {name}  ${pva:06X}..${pva + plen:06X}', '',
           f'STRADDLING branches (outer gates over ${va:06X}..${end:06X}):']
    if not straddle:
        out.append('  none -- the range is not nested inside any branch')
    for t in sorted(straddle):                    # innermost enclosure first
        srcs = ', '.join(f'{a:06X} {m}' for a, m in straddle[t])
        out.append(f'  -> ${t:06X}  from {len(straddle[t])}: {srcs}')

    out += ['', f'branches landing inside ${va:06X}..${end:06X}:']
    if not hits:
        out.append('  (none)')
    for t in sorted(hits):
        ext = [f'{a:06X} {m}' for a, m in hits[t] if not va <= a < end]
        ins_ = [f'{a:06X} {m}' for a, m in hits[t] if va <= a < end]
        tag = f'  *** {len(ext)} FROM OUTSIDE: {", ".join(ext)} ***' if ext else ''
        out.append(f'  -> ${t:06X}   {len(ins_)} internal{tag}')
    return out


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    exe, va, length = sys.argv[1], int(sys.argv[2], 0), int(sys.argv[3], 0)
    fn = inbound if '--inbound' in sys.argv else None
    if fn:
        for line in fn(exe, va, length):
            print(line)
        return
    for line in disassemble(exe, va, length, raw='--raw' in sys.argv):
        print(line)


if __name__ == '__main__':
    main()
