"""Resolve DOS `WIZARDS.EXE` far calls to file offsets through the VROOMM tables.

The Borland `FBOV` structure at the end of the load module carries an
overlay-to-file-offset map, enough to turn every `9A off:seg` far call in
overlay code into a file offset.

The chain, all of it byte-backed (see `R6.3` evidence for the validation):

* `FBOV` (`46 42 4F 56`) sits at the end of the load module and holds
  `{ dword ovrsize; dword exeinfo; dword segnum; }`.
* `exeinfo` is the **file offset** of a `segnum`-entry table of 8-byte records
  `{ word segment; word maxoff; word flags; word unused; }`. `flags & 2` marks an
  overlaid segment.
* A far call's segment operand is **8 x the index into that table**, not a
  paragraph address. So `9A 43 00 D0 03` means table entry `0x3D0 / 8 = 122`.
* For a resident entry the target is simply `hdr + segment * 16 + off`.
* For an overlaid entry, `segment` is the resident **stub** segment. Its first
  0x20 bytes are an overlay descriptor whose `+4` dword is the overlay body's
  offset from the overlay area (`FBOV + 0x10`) and whose `+8` word is the body's
  size. From `+0x20` on, the stub holds 5-byte `CD 3F <word ovl_off> <byte>`
  thunks, so the call's `off` selects thunk `(off - 0x20) / 5` and the thunk's
  word is the callee's offset inside the overlay body.

Usage:
    resolve_dos_overlays.py <WIZARDS.EXE>                 # overlay map summary
    resolve_dos_overlays.py <WIZARDS.EXE> 0x3d0 0x43      # resolve one far call
"""
import struct
import sys


class Overlays:
    def __init__(self, path):
        self.data = open(path, 'rb').read()
        d = self.data
        self.hdr = struct.unpack_from('<H', d, 0x08)[0] * 16

        pages, last = struct.unpack_from('<H', d, 0x04)[0], struct.unpack_from('<H', d, 0x02)[0]
        self.load_end = (pages - 1) * 512 + (last or 512)

        n = d.count(b'FBOV')
        if n != 1:
            raise ValueError(f'expected exactly one FBOV signature, found {n}')
        self.fbov = d.find(b'FBOV')
        _sig, self.ovrsize, self.exeinfo, self.segnum = struct.unpack_from(
            '<4sIII', d, self.fbov)
        self.area = self.fbov + 0x10
        self.table = [struct.unpack_from('<HHHH', d, self.exeinfo + k * 8)
                      for k in range(self.segnum)]

    # -- one table entry ----------------------------------------------------
    def is_overlaid(self, idx):
        return bool(self.table[idx][2] & 2)

    def stub_file(self, idx):
        return self.hdr + self.table[idx][0] * 16

    def body(self, idx):
        """(file base, code size) of an overlaid segment's body."""
        s = self.stub_file(idx)
        off, size = struct.unpack_from('<IH', self.data, s + 4)
        return self.area + off, size

    def thunks(self, idx):
        """[(stub offset, overlay offset)] for every 5-byte thunk in the stub."""
        s, out, o = self.stub_file(idx), [], 0x20
        while True:
            if self.data[s + o] != 0xCD or self.data[s + o + 1] != 0x3F:
                break
            out.append((o, struct.unpack_from('<H', self.data, s + o + 2)[0]))
            o += 5
        return out

    # -- one far call -------------------------------------------------------
    def resolve_from(self, caller, seg, off):
        """Resolve a far call made *at* `caller`.

        Only overlay code carries the VROOMM index encoding. Inside the load
        module the operand is an ordinary MZ-relocatable segment, so a resident
        caller's `9A off:seg` resolves directly and an index lookup there would
        be nonsense -- `0x4B5` in `Random` is not even a multiple of 8.
        """
        if caller < self.load_end:
            return {'kind': 'resident-direct', 'seg': seg, 'off': off,
                    'target': self.hdr + seg * 16 + off}
        return self.resolve(seg, off)

    def resolve(self, seg, off):
        """Resolve a far-call operand pair. Returns a dict describing the target."""
        if seg % 8:
            return {'kind': 'bad-index', 'seg': seg, 'off': off}
        idx = seg // 8
        if idx >= self.segnum:
            return {'kind': 'out-of-range', 'idx': idx, 'seg': seg, 'off': off}
        segment, maxoff, flags, _ = self.table[idx]
        if not flags & 2:
            return {'kind': 'resident', 'idx': idx, 'flags': flags,
                    'target': self.hdr + segment * 16 + off,
                    'seg': seg, 'off': off}
        slot = off - 0x20
        if slot < 0 or slot % 5:
            return {'kind': 'stub-misaligned', 'idx': idx, 'seg': seg, 'off': off}
        s = self.stub_file(idx)
        if self.data[s + off] != 0xCD or self.data[s + off + 1] != 0x3F:
            return {'kind': 'stub-absent', 'idx': idx, 'seg': seg, 'off': off}
        ovl_off = struct.unpack_from('<H', self.data, s + off + 2)[0]
        base, size = self.body(idx)
        return {'kind': 'overlay', 'idx': idx, 'slot': slot // 5,
                'stub': s + off, 'ovl_off': ovl_off, 'base': base, 'size': size,
                'target': base + ovl_off, 'seg': seg, 'off': off}


def describe(r):
    if r['kind'] == 'overlay':
        return (f"overlay seg {r['idx']} slot {r['slot']} "
                f"(body {r['base']:05X}+{r['ovl_off']:04X}) -> {r['target']:05X}")
    if r['kind'] == 'resident':
        return f"resident seg {r['idx']} flags {r['flags']} -> {r['target']:05X}"
    if r['kind'] == 'resident-direct':
        return f"resident caller, direct -> {r['target']:05X}"
    return r['kind']


def main():
    ov = Overlays(sys.argv[1])
    if len(sys.argv) >= 4:
        r = ov.resolve(int(sys.argv[2], 0), int(sys.argv[3], 0))
        print(describe(r))
        return
    print(f'FBOV {ov.fbov:06X}  exeinfo {ov.exeinfo:06X}  segments {ov.segnum}  '
          f'overlay area {ov.area:06X}  load-module header {ov.hdr:04X}')
    for k in range(ov.segnum):
        if not ov.is_overlaid(k):
            continue
        base, size = ov.body(k)
        t = ov.thunks(k)
        print(f'  seg {k:3d}  operand {k * 8:#06x}  stub {ov.stub_file(k):06X}  '
              f'body {base:06X}..{base + size:06X}  entries {len(t):3d}')


if __name__ == '__main__':
    main()
