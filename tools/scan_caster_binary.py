"""Read CoM2/Warlord's Caster.exe via its Borland TD32 debug symbols.

Unlike MoM's WIZARDS.EXE (see tools/scan_mom_binary.py), Caster.exe ships a full
symbol table: procedure names, addresses and *named locals*. So there is no need to
hunt for struct offsets — ask for the routine by name and read it.

    scan_caster_binary.py syms   Caster.exe Gaze        # procedures matching a regex
    scan_caster_binary.py locals Caster.exe ApplyAttack # params/locals of a procedure
    scan_caster_binary.py consts Caster.exe AT          # enum/typed-constant members
    scan_caster_binary.py dis    Caster.exe 0x5B1F9F 0x90 [ApplyAttack]

`dis` takes a virtual address; with a procedure name it annotates ebp-relative
operands with that procedure's local names. Requires: pip install capstone
"""
import re
import struct
import sys

# TDS subsection types we use.
SST_MODULE, SST_ALIGNSYM, SST_NAMES = 0x120, 0x125, 0x130
# Symbol record types.
S_BPREL32, S_CONST, S_LPROC32, S_GPROC32 = 0x0200, 0x0027, 0x0204, 0x0205


class Caster:
    def __init__(self, path):
        self.d = open(path, 'rb').read()
        self._pe()
        self._tds()

    def _pe(self):
        d = self.d
        pe = struct.unpack_from('<I', d, 0x3C)[0]
        nsec = struct.unpack_from('<H', d, pe + 6)[0]
        opt = pe + 24
        self.imagebase = struct.unpack_from('<I', d, opt + 28)[0]
        secs = opt + struct.unpack_from('<H', d, pe + 20)[0]
        self.sections = []
        for i in range(nsec):
            b = secs + 40 * i
            name = d[b:b + 8].rstrip(b'\0').decode('latin1')
            va, raw = struct.unpack_from('<I', d, b + 12)[0], struct.unpack_from('<I', d, b + 20)[0]
            self.sections.append((name, va, raw))

    def _tds(self):
        d = self.d
        base = d.find(b'FB09')
        if base < 0:
            sys.exit('no FB09 (TD32) debug section — wrong build?')
        self.base = base
        o = base + struct.unpack_from('<I', d, base + 4)[0]
        cb_hdr, cb_entry, cdir = struct.unpack_from('<HHI', d, o)
        self.dirs = [struct.unpack_from('<HHII', d, o + cb_hdr + cb_entry * i) for i in range(cdir)]
        self._names()
        self._symbols()

    def _names(self):
        d, self.names = self.d, [None]
        for st, _imod, lfo, cb in self.dirs:
            if st != SST_NAMES:
                continue
            o, end = self.base + lfo + 4, self.base + lfo + cb
            # Each entry is a length byte, the characters, then a NUL terminator.
            while o < end:
                n = d[o]
                self.names.append(d[o + 1:o + 1 + n].decode('latin1'))
                o += 2 + n

    def _addr(self, seg, off):
        """(segment, segment-relative offset) -> (virtual address, file offset)."""
        _name, va, raw = self.sections[max(0, seg - 1)]
        return self.imagebase + va + off, raw + off

    def _symbols(self):
        """Walk each module's symbols, attributing locals to the enclosing procedure."""
        d = self.d
        self.procs, self.locals, self.consts = {}, {}, []
        modname = {}
        for st, imod, lfo, _cb in self.dirs:
            if st == SST_MODULE:
                modname[imod] = self.names[struct.unpack_from('<I', d, self.base + lfo + 8)[0]]
        for st, imod, lfo, cb in self.dirs:
            if st != SST_ALIGNSYM:
                continue
            o, end, cur = self.base + lfo + 4, self.base + lfo + cb, None
            while o < end - 3:
                ln, ty = struct.unpack_from('<HH', d, o)
                if ln < 2:
                    break
                if ty in (S_LPROC32, S_GPROC32) and ln >= 0x2E:
                    plen = struct.unpack_from('<I', d, o + 16)[0]
                    off = struct.unpack_from('<I', d, o + 28)[0]
                    seg = struct.unpack_from('<H', d, o + 32)[0]
                    cur = self.names[struct.unpack_from('<I', d, o + 40)[0]]
                    va, fo = self._addr(seg, off)
                    self.procs[cur] = (va, fo, plen, modname.get(imod, '?'))
                    self.locals.setdefault(cur, {})
                elif ty == S_BPREL32 and cur:
                    b = d[o + 4:o + 2 + ln]
                    if len(b) >= 12:
                        self.locals[cur][struct.unpack_from('<i', b, 0)[0]] = \
                            self.names[struct.unpack_from('<I', b, 8)[0]]
                elif ty == S_CONST:
                    b = d[o + 4:o + 2 + ln]
                    if len(b) >= 18:
                        self.consts.append((self.names[struct.unpack_from('<I', b, 6)[0]],
                                            struct.unpack_from('<I', b, 14)[0]))
                o += 2 + ln

    def find(self, pattern):
        rx = re.compile(pattern, re.I)
        return sorted((n, v) for n, v in self.procs.items() if rx.search(n))

    def disasm(self, va, length, annotate=None):
        from capstone import CS_ARCH_X86, CS_MODE_32, Cs
        loc = self.locals.get(annotate, {})
        if annotate and not loc:                       # allow a bare/partial name
            m = self.find(annotate)
            if m:
                loc = self.locals.get(m[0][0], {})
        _va, fo = None, None
        for _name, sva, raw in self.sections:
            if sva + self.imagebase <= va:
                _va, fo = sva, raw + (va - self.imagebase - sva)
        def ann(op):
            def sub(m):
                v = int(m.group(2), 16) * (-1 if m.group(1) == '-' else 1)
                return m.group(0) + (f'{{{loc[v]}}}' if v in loc else '')
            return re.sub(r'ebp ([-+]) 0x([0-9a-f]+)', sub, op)
        for i in Cs(CS_ARCH_X86, CS_MODE_32).disasm(self.d[fo:fo + length], va):
            print(f'{i.address:06X}  {i.bytes.hex():<16} {i.mnemonic:<8} {ann(i.op_str)}')


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    mode, c = sys.argv[1], Caster(sys.argv[2])
    if mode == 'syms':
        pat = sys.argv[3] if len(sys.argv) > 3 else '.'
        for name, (va, fo, plen, mod) in c.find(pat):
            print(f'{mod:<14} VA 0x{va:06X}  file 0x{fo:06X}  len 0x{plen:05X}  {name}')
    elif mode == 'locals':
        for name, _ in c.find(sys.argv[3]):
            print(f'--- {name} ---')
            for off, nm in sorted(c.locals.get(name, {}).items()):
                kind = 'param' if off > 0 else 'local'
                print(f'  [ebp{off:+#07x}] {kind}  {nm}')
    elif mode == 'consts':
        rx = re.compile(sys.argv[3] if len(sys.argv) > 3 else '.', re.I)
        for nm, val in c.consts:
            if rx.search(nm):
                print(f'  {val:<6} {nm}')
    elif mode == 'dis':
        c.disasm(int(sys.argv[3], 0), int(sys.argv[4], 0) if len(sys.argv) > 4 else 0x80,
                 sys.argv[5] if len(sys.argv) > 5 else None)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
