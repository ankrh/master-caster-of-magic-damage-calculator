"""Enumerate the call closure of the R6 reconstructed DOS routines.

R6.3 must confirm that every call made by an assigned R6 root, and every call
made by each first-level callee, has exactly one disposition. This walks that
graph straight out of the three pinned `WIZARDS.EXE` builds rather than out of
the evidence files, so the audit is an independent read.

    audit_dos_call_closure.py <WIZARDS.EXE> <build>            # roots + level 1 + level 2
    audit_dos_call_closure.py <WIZARDS.EXE> <build> extents    # print the extent table

Addresses are raw file offsets, as everywhere else in `Reference docs/DOS
reconstructed/`. Near direct calls (`E8 rel16`) resolve within the caller's
overlay segment; far direct calls (`9A off:seg`) resolve through the VROOMM
tables decoded by `resolve_dos_overlays.py`. Any malformed operand or bare
`INT 3F` site remains explicitly unresolved.

Requires: pip install capstone
"""
import os
import re
import sys

from capstone import CS_ARCH_X86, CS_MODE_16, Cs

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from resolve_dos_overlays import Overlays, describe        # noqa: E402

# ---------------------------------------------------------------------------
# Assigned R6 extents, half-open [lo, hi), per build. Sourced from each item's
# evidence header; kept here so the walk can say "this target is already
# reconstructed" without parsing fourteen markdown files.
# ---------------------------------------------------------------------------
ALL = ('mom131', 'mom160', 'com1')

EXTENTS = [
    # (item, name, lo, hi, builds)
    ('R6.1e', 'BU_Apply_Hero_Items',           0x8DBD0, 0x8E039, ALL),
    ('R6.1b', 'BU_Battle_Unit_Ctor',           0x8EDFD, 0x8F197, ('mom160',)),
    ('R6.1b', 'BU_Battle_Unit_Ctor',           0x8EDFD, 0x8F15C, ('com1',)),
    ('R6.1b', 'BU_Battle_Unit_Ctor',           0x8EDFD, 0x8F310, ('mom131',)),
    ('R6.1b', 'BU_Battle_Unit_Ctor tail',      0x8F26E, 0x8F310, ('mom160',)),
    ('R6.1b', 'BU_Battle_Unit_Ctor tail',      0x8F233, 0x8F310, ('com1',)),
    ('R6.1b', 'com1 near helper',              0x8F379, 0x8F3A7, ('com1',)),
    ('R6.1g', 'BU_Apply_Item_Powers',          0x8E039, 0x8E4C4, ALL),
    ('R6.1h', 'BU_Apply_Item_Attack_Specials', 0x8E4C4, 0x8E668, ALL),
    ('R6.1e', 'BU_HitPoints',                  0x8E668, 0x8E850, ('mom131', 'mom160')),
    ('R6.1e', 'BU_HitPoints',                  0x8E668, 0x8E7AA, ('com1',)),
    ('R6.1g', 'BU_Recompute_HitPoints',        0x8E850, 0x8EAB9, ALL),
    ('R6.1a', 'BU_Apply_Specials',             0x8F310, 0x8F881, ALL),
    ('R6.1a', 'BU_Apply_Specials tail',        0x8F197, 0x8F26E, ('mom160',)),
    ('R6.1a', 'BU_Apply_Specials tail',        0x8F15C, 0x8F233, ('com1',)),
    ('R6.1f', 'BU_Apply_Level_Bonus',          0x8F881, 0x8FB42, ALL),
    ('R6.1f', 'BU_Apply_Hero_Abilities',       0x8FB42, 0x8FF09, ALL),
    ('R6.1c', 'BU_Apply_Battlefield_Effects 1', 0x8FF09, 0x90635, ('mom131', 'mom160')),
    ('R6.1c', 'BU_Apply_Battlefield_Effects 1', 0x8FF09, 0x9064B, ('com1',)),
    ('R6.1d', 'BU_Apply_Battlefield_Effects 2', 0x90635, 0x90B8E, ('mom131', 'mom160')),
    ('R6.1d', 'BU_Apply_Battlefield_Effects 2', 0x9064B, 0x90B8E, ('com1',)),
    ('R6.1d', 'BU_Apply_Battlefield_Effects tail', 0x90B8E, 0x90C00, ('com1',)),

    ('R6.2f', 'Apply_BU_Damage_From_Spell',    0x87036, 0x87389, ALL),
    ('R6.2f', 'BU_ApplyDamage',                0x87389, 0x876C0, ALL),
    ('R6.2f', 'Check_Attack_Ranged',           0x876C0, 0x87823, ALL),
    ('R6.2f', 'Eliminated_Opponent',           0x88470, 0x88515, ALL),
    ('R6.2d', 'CMB_AttackRoll',                0x98F60, 0x98F9D, ALL),
    ('R6.2d', 'CMB_DefenseRoll',               0x98F9D, 0x98FCB, ALL),
    ('R6.2d', 'Combat_Resistance_Check',       0x98FCB, 0x9900D, ALL),
    ('R6.2d', 'Combat_Effective_Resistance',   0x9900D, 0x99150, ALL),
    ('R6.2d', 'Battle_Unit_Attack_Immunities', 0x99150, 0x99292, ALL),
    # CoM 1's `0x99849: jmp 0x998C1` skips the R6.2d island, so BU_AttackTarget's
    # live extent is split around it (R6.2a evidence, *Scope and frame*).
    ('R6.2a', 'BU_AttackTarget',               0x99292, 0x999C9, ('mom131', 'mom160')),
    ('R6.2a', 'BU_AttackTarget',               0x99292, 0x9984B, ('com1',)),
    ('R6.2a', 'BU_AttackTarget',               0x998C1, 0x999C9, ('com1',)),
    ('R6.2b', 'BU_ProcessAttack 1',            0x999C9, 0x99ED7, ALL),
    ('R6.2c', 'BU_ProcessAttack 2',            0x99ED7, 0x9A587, ALL),
    ('R6.2d', 'com1 island helpers',           0x9984B, 0x998C1, ('com1',)),
    ('R6.2e', 'Battle_Unit_Defense_Special',   0x9A587, 0x9A79E, ALL),
    ('R6.2d', 'Battle_Unit_Attack_Magic_Realm', 0x9A79E, 0x9A857, ALL),
    ('R6.2d', 'com1 To Block dice cap',        0x9A8CA, 0x9A8D3, ('com1',)),
    ('R6.2d', 'com1 SpFx melee mana helper',   0x9AC1B, 0x9AC8F, ('com1',)),
    ('R6.2d', 'Range_To_Battle_Unit',          0x9B50C, 0x9B590, ALL),
    ('R6.2d', 'Battle_Unit_Has_Ranged_Attack', 0x9BB03, 0x9BB3E, ALL),
    ('R6.2d', 'BU_CauseFear',                  0x9BB3E, 0x9BC40, ALL),
    ('R6.2e', 'Check_Wall_Of_Fire_Attack',     0x9EDAA, 0x9EE85, ALL),
    ('R6.2e', 'Battle_Unit_In_City_Wall_Box',  0x9EFE3, 0x9F046, ALL),
    ('R6.2f', 'Combat_Grid_Cell_Has_City_Wall', 0x9F046, 0x9F0B2, ALL),
    ('R6.2f', 'Battle_Unit_Is_Summoned_Creature', 0x9F0B2, 0x9F12D, ALL),
    ('R6.1g', 'Battle_Unit_Moves2',            0x9F12D, 0x9F2D4, ('com1',)),
    ('R6.1g', 'Moves2 near helper A',          0x9F2D4, 0x9F2E2, ('com1',)),
    ('R6.1g', 'Moves2 near helper B',          0x9F2E2, 0x9F2F1, ('com1',)),
]

MD = Cs(CS_ARCH_X86, CS_MODE_16)


def extents_for(build):
    return [(i, n, lo, hi) for i, n, lo, hi, b in EXTENTS if build in b]


def owner(build, addr):
    for item, name, lo, hi in extents_for(build):
        if lo <= addr < hi:
            return f'{item} {name}'
    return None


def decode(data, lo, hi):
    return list(MD.disasm(data[lo:hi], lo))


def calls_in(data, lo, hi, ov=None):
    """Every call-like instruction in [lo, hi): (addr, kind, target, text)."""
    out = []
    for i in decode(data, lo, hi):
        if i.mnemonic in ('call', 'lcall'):
            m = re.fullmatch(r'0x([0-9a-f]+)', i.op_str)
            # capstone prints a zero operand bare, without the 0x prefix
            f = re.fullmatch(r'(?:0x)?([0-9a-f]+), (?:0x)?([0-9a-f]+)', i.op_str)
            if i.mnemonic == 'call' and m:
                out.append((i.address, 'near-direct', int(m.group(1), 16), i.op_str))
            elif i.mnemonic == 'lcall' and f and ov is not None:
                seg, off = int(f.group(1), 16), int(f.group(2), 16)
                r = ov.resolve_from(i.address, seg, off)
                text = f'{seg:04X}:{off:04X}  {describe(r)}'
                if r['kind'] == 'overlay':
                    out.append((i.address, 'far-overlay', r['target'], text))
                elif r['kind'] in ('resident', 'resident-direct'):
                    out.append((i.address, 'far-resident', r['target'], text))
                else:
                    out.append((i.address, 'far-unresolved', None, text))
            elif i.mnemonic == 'lcall':
                out.append((i.address, 'far-direct', None, i.op_str))
            else:
                out.append((i.address, 'indirect', None, i.op_str))
        elif i.mnemonic == 'int' and i.op_str == '0x3f':
            out.append((i.address, 'int3f-overlay', None, i.op_str))
    return out


def routine_end(data, entry, limit=0x1200, ceiling=None):
    """Scan forward to the terminal return of a callee entered at `entry`.

    Borland's far procedures end at `retf` (0xCB) and near ones at `ret`
    (0xC3). Take the first return at or past every forward jump target seen so
    far, which keeps a mid-routine `ret` in an early-exit block from truncating
    the extent. `ceiling` is the next known entry point above `entry`: without
    it a routine whose tail jumps backwards can swallow its neighbours.
    """
    if ceiling is not None:
        limit = min(limit, ceiling - entry)
    furthest = entry
    for i in decode(data, entry, entry + limit):
        m = re.fullmatch(r'0x([0-9a-f]+)', i.op_str)
        if i.mnemonic.startswith('j') and m:
            t = int(m.group(1), 16)
            if entry < t < entry + limit:
                furthest = max(furthest, t)
        if i.mnemonic in ('ret', 'retf') and i.address >= furthest:
            return i.address + i.size
    return None


def entry_points(ov):
    """Every address exported through a VROOMM stub.

    Assigned-extent bounds are deliberately *not* included. A later R6 item can
    carve a helper out of space freed inside an earlier routine -- CoM 1's To
    Block dice cap at `0x9A8CA` sits inside the routine entered at `0x9A8AB` --
    and using it as a ceiling would truncate the enclosing routine to nothing.
    """
    pts = set()
    for k in range(ov.segnum):
        if not ov.is_overlaid(k):
            continue
        base, _size = ov.body(k)
        for _slot, o in ov.thunks(k):
            pts.add(base + o)
    return sorted(pts)


def main():
    exe, build = sys.argv[1], sys.argv[2]
    data = open(exe, 'rb').read()
    ov = Overlays(exe)

    if len(sys.argv) > 3 and sys.argv[3] == 'overlays':
        # Which exported entries of the overlays R6 works in are reconstructed.
        want = set()
        for _i, _n, lo, _hi, b in EXTENTS:
            if build in b:
                want.add(lo)
        for k in range(ov.segnum):
            if not ov.is_overlaid(k):
                continue
            base, size = ov.body(k)
            ents = sorted(base + o for _s, o in ov.thunks(k))
            if not any(owner(build, e) for e in ents):
                continue
            print(f'\noverlay seg {k} operand {k * 8:#06x}  '
                  f'body {base:05X}..{base + size:05X}  entries {len(ents)}')
            for e in ents:
                o = owner(build, e)
                print(f'   {e:05X}  ' + (f'reconstructed  {o}' if o
                                         else 'NOT RECONSTRUCTED'))
        return

    if len(sys.argv) > 3 and sys.argv[3] == 'extents':
        for item, name, lo, hi in sorted(extents_for(build), key=lambda r: r[2]):
            print(f'{lo:05X}..{hi:05X}  {hi - lo:>5}  {item:<6} {name}')
        return

    roots = sorted(extents_for(build), key=lambda r: r[2])
    level1 = {}          # target -> [(caller item/name, call site, kind)]
    opaque = []          # call sites with no resolvable target
    print(f'=== build {build}: root call inventory ===')
    total = 0
    for item, name, lo, hi in roots:
        cs = calls_in(data, lo, hi, ov)
        total += len(cs)
        print(f'\n{item} {name}  [{lo:05X},{hi:05X})  calls: {len(cs)}')
        for addr, kind, tgt, text in cs:
            if tgt is not None:
                inside = owner(build, tgt)
                tag = (f'{kind:<13} -> {tgt:05X}  '
                       + (f'[{inside}]' if inside else '[UNSCOPED]'))
                if kind != 'near-direct':
                    tag += f'   {text.split("  ", 1)[0]}'
                level1.setdefault(tgt, []).append((f'{item} {name}', addr, kind))
            else:
                tag = f'{kind}: {text}'
                opaque.append((f'{item} {name}', addr, kind, text))
            print(f'   {addr:05X}  {tag}')

    print(f'\n=== build {build}: {total} root call sites, '
          f'{len(level1)} distinct resolved targets, {len(opaque)} unresolved ===')
    unscoped = []
    for tgt in sorted(level1):
        inside = owner(build, tgt)
        sites = ', '.join(f'{a:05X}' for _c, a, _k in level1[tgt])
        kinds = sorted({k for _c, _a, k in level1[tgt]})
        print(f'{tgt:05X}  {"IN  " + inside if inside else "OUT"}   '
              f'{",".join(kinds)}   from {sites}')
        if not inside:
            unscoped.append(tgt)

    print(f'\n=== build {build}: second level, from the {len(unscoped)} '
          f'unscoped first-level callees ===')
    pts = entry_points(ov)
    for tgt in unscoped:
        nxt = next((p for p in pts if p > tgt), None)
        end = routine_end(data, tgt, ceiling=nxt)
        if end is None:
            print(f'{tgt:05X}  *** no terminal return within scan limit ***')
            continue
        cs = calls_in(data, tgt, end, ov)
        print(f'{tgt:05X}..{end:05X}  ({end - tgt} bytes)  calls: {len(cs)}')
        for addr, kind, t2, text in cs:
            if t2 is not None:
                inside = owner(build, t2)
                print(f'   {addr:05X}  {kind:<13} -> {t2:05X}  '
                      + (f'[{inside}]' if inside else '[UNSCOPED level 2]'))
            else:
                print(f'   {addr:05X}  {kind}: {text}')

    print(f'\n=== build {build}: unresolved root call sites ({len(opaque)}) ===')
    for caller, addr, kind, text in opaque:
        print(f'{addr:05X}  {kind:<15} {text:<28} in {caller}')


if __name__ == '__main__':
    main()
