"""Locate and disassemble MoM 1.31 code by BATTLE_UNIT field access.

WIZARDS.EXE is Borland C++ 1991 with VROOMM overlays; there is no symbol table and
no overlay->file-offset map. The way in is that struct field offsets are stable and
rare: find instructions that touch a known displacement, cluster co-occurrences, then
disassemble. Field offsets come from ReMoM's `MoX/src/MOM_DAT.h` (see
`Reference docs/MoM binary analysis.md`).

Usage:
    scan_mom_binary.py find  WIZARDS.EXE 0x04 0x24 0x25   # co-occurrence clusters
    scan_mom_binary.py dis   WIZARDS.EXE 0x99A63 0xD0     # disassemble a range

Requires: pip install capstone
"""
import bisect
import sys

# BATTLE_UNIT is 0x6E bytes; the array base pointer lives at [0x922a] in WIZARDS.EXE.
FIELDS = {
    0x00: 'melee', 0x01: 'ranged', 0x02: 'ranged_type', 0x04: 'tohit',
    0x03: 'ammo', 0x05: 'defense', 0x06: 'resist', 0x0D: 'Cur_Figures',
    0x10: 'hits', 0x15: 'Spec_Att_Attrib',
    0x18: 'Attribs_1', 0x1C: 'Abilities', 0x1E: 'attack_attributes',
    0x22: 'Combat_Effects', 0x24: 'melee_tohit', 0x25: 'ranged_tohit', 0x26: 'toblock',
    0x27: 'Weapon_Plus1', 0x28: 'melee_atk_attrs', 0x2A: 'ranged_atk_attrs',
    0x30: 'unit_idx', 0x35: 'controller_idx', 0x39: 'front_figure_damage',
    0x3A: 'enchantments', 0x3E: 'Suppression', 0x3F: 'mana_max',
    0x40: 'mana', 0x42: 'Poison_Strength',
}

# Byte-operand opcodes with an r/m operand. mod=01 (disp8) with rm>=4 covers the
# [si]/[di]/[bp]/[bx] bases Borland uses for struct pointers.
OPS = {0x8A, 0x88, 0x02, 0x00, 0x3A, 0x38, 0x2A, 0x28, 0xFE}


def accesses(data, disp):
    """Offsets of instructions touching a struct field at `disp`."""
    return [i for i in range(len(data) - 2)
            if data[i] in OPS
            and (data[i + 1] & 0xC0) == 0x40
            and (data[i + 1] & 0x07) >= 4
            and data[i + 2] == disp]


def find(data, disps, window=500):
    """Report regions where every requested field is touched within `window` bytes."""
    hits = {d: accesses(data, d) for d in disps}
    for d in disps:
        print(f"+0x{d:02X} ({FIELDS.get(d, '?')}): {len(hits[d])} accesses")

    anchor, rest = disps[0], [sorted(hits[d]) for d in disps[1:]]
    print(f"\nregions with all of {[hex(d) for d in disps]} within {window} bytes:")
    seen = set()
    for a in hits[anchor]:
        near = []
        for lst in rest:
            lo = bisect.bisect_left(lst, a - window)
            hi = bisect.bisect_right(lst, a + window)
            if lo == hi:
                break
            near.append(lst[lo:hi])
        if len(near) != len(rest):
            continue
        if a // 1024 in seen:
            continue
        seen.add(a // 1024)
        flat = [a] + [x for grp in near for x in grp]
        detail = '  '.join(
            f"+0x{d:02X}={[hex(x) for x in grp]}" for d, grp in zip(disps[1:], near))
        print(f"  0x{min(flat):06X}-0x{max(flat):06X}  anchor@{hex(a)}  {detail}")


def dis(data, start, length):
    from capstone import CS_ARCH_X86, CS_MODE_16, Cs
    md = Cs(CS_ARCH_X86, CS_MODE_16)
    for insn in md.disasm(data[start:start + length], start):
        note, op = '', insn.op_str
        if 'bp' not in op:  # bp displacements are stack locals, not struct fields
            for disp, name in FIELDS.items():
                if f'+ 0x{disp:x}]' in op or f'+ {disp}]' in op:
                    note = f'   ; .{name}'
        print(f"{insn.address:06X}  {insn.bytes.hex():<14} {insn.mnemonic:<7} {op}{note}")


def main():
    if len(sys.argv) < 4:
        sys.exit(__doc__)
    mode, path = sys.argv[1], sys.argv[2]
    data = open(path, 'rb').read()
    if mode == 'find':
        find(data, [int(a, 0) for a in sys.argv[3:]])
    elif mode == 'dis':
        dis(data, int(sys.argv[3], 0), int(sys.argv[4], 0) if len(sys.argv) > 4 else 0x80)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
