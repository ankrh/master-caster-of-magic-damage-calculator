#!/usr/bin/env python3
"""Parse a Master of Magic / Caster of Magic help-text LBX and dump entries to a .txt.

LBX archive header:
    u16 count, u32 sig(0x0000FEAD), u16 type, then (count+1) u32 offsets.
The help text lives in the subfile whose record header (u16 nrec, u16 recsize)
satisfies  4 + nrec*recsize == subfile_length.  Each record:
    [0:]  title, NUL-terminated
    [48:] body, NUL-terminated; byte 0x14 is the line break.
"""
import os
import struct
import sys

REFDIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Reference docs')


def cstr(b):
    z = b.find(b'\x00')
    return (b if z < 0 else b[:z]).decode('latin1')


def parse(path):
    d = open(path, 'rb').read()
    count, sig, typ = struct.unpack('<HIH', d[0:8])
    if sig != 0x0000FEAD:
        raise ValueError(f'not an LBX file (sig={sig:#x})')
    offs = [struct.unpack('<I', d[8 + 4 * i:12 + 4 * i])[0] for i in range(count + 1)]

    # Locate the text subfile: its (nrec, recsize) header must tile the subfile exactly.
    for i in range(count):
        start, end = offs[i], offs[i + 1]
        nrec, recsize = struct.unpack('<HH', d[start:start + 4])
        if recsize and 4 + nrec * recsize == end - start:
            data = start + 4
            entries = []
            for r in range(nrec):
                rec = d[data + r * recsize: data + (r + 1) * recsize]
                title = cstr(rec[0:48]).strip()
                body = cstr(rec[48:]).replace('\x14', '\n')
                if body.strip():
                    entries.append((title, body))
            return entries
    raise ValueError('no help-text subfile found')


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REFDIR, 'CoM helptext.LBX')
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(REFDIR, 'CoM helptext (parsed).txt')
    entries = parse(src)
    with open(dst, 'w', encoding='utf-8') as f:
        for title, body in entries:
            f.write(f'=== {title} ===\n{body}\n\n')
    print(f'{len(entries)} entries -> {dst}')


if __name__ == '__main__':
    main()
