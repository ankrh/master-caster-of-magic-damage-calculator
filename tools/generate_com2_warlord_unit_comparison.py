"""
Generate a Markdown comparison of the CoM2 and Warlord unit rosters.

Reads the two generated roster JSONs under `Unit rosters/` and writes
`Unit rosters/CoM2 Warlord unit comparison.md`. Both inputs are build products of
`tools/generate_com2_units_json.py` / `tools/generate_warlord_units_json.py`, which read the
version's own `UNITS.INI`; this tool adds no engine knowledge of its own and never falls back
to a plausible value for something a record does not state.

Units are joined on `templateId` -- the engine's own `UNITS.INI` section index, which is the
only identity stable across a rename. Every CoM2 templateId exists in the Warlord roster, so
the join has no CoM2-only side; a future roster that breaks that raises rather than dropping
the unit silently.

Run from any working directory:
  python tools/generate_com2_warlord_unit_comparison.py
"""

import json
from pathlib import Path

# Category display order, mirroring `categoryOrder` in `Calculator/ui_units.js` so the
# document and the app's unit dropdown list the same buckets in the same sequence. The names
# here are the roster's own spellings; `ui_units.js` normalizes some of them for display
# ('Dwarf' -> 'Dwarven', 'General' -> 'Generic', '... Creatures' -> the bare realm).
CATEGORY_ORDER = [
    'Heroes',
    'Barbarian', 'Gnoll', 'Halfling', 'High Elf', 'High Men', 'Klackon',
    'Lizardman', 'Nomad', 'Orc',
    'Beastmen', 'Dark Elf', 'Draconian', 'Dwarf', 'Troll',
    'Xuanyuan', 'Rakhshasa', 'Hawkmen', 'Goblin',
    'Special', 'General',
    'Life Creatures', 'Death Creatures', 'Chaos Creatures',
    'Nature Creatures', 'Sorcery Creatures', 'Arcane Creatures',
]

# The 'Hero' tag is carried by every record in the Heroes section and by no other, so the
# section heading already states it. Nothing else is suppressed.
SUPPRESSED_ABILITIES = {'Hero'}

ABSENT = '-'


# --- Field rendering -------------------------------------------------------------------

def plural(count, singular, plural_form):
    """`1 is identical` / `4 are identical` -- the count reads as prose in the summary."""
    return f"{count} {singular if count == 1 else plural_form}"


def fmt_int(value):
    return ABSENT if value is None else str(value)


def fmt_signed_pct(value):
    """`to_hit` / `to_block` are percentage-point deltas above the engine's 30% base."""
    if not value:
        return ABSENT
    return f"{value:+d}%"


def fmt_ranged(unit):
    """Ranged strength with its projectile class.

    A record may state a projectile class with no strength (`RangedType` > 0, `Ranged` 0);
    the generators keep those apart and so does this, rather than reporting one as the other.
    """
    strength = unit.get('ranged')
    kind = unit.get('ranged_type')
    if strength is None and kind is None:
        return ABSENT
    if strength is None:
        return f"0 ({kind})"
    return f"{strength} ({kind})" if kind else str(strength)


def fmt_special_attacks(unit):
    """The three independent special-attack channels the engine stores per unit.

    `thrown_breath`/`thrown_breath_type` in the roster JSON is the pre-R3.2 single-slot
    projection of these and is deliberately not read here: it collapses the Elementalist's
    two channels into one.
    """
    parts = []
    for key, label in (('thrown', 'Thrown'), ('fire_breath', 'Fire'),
                       ('lightning_breath', 'Lightning')):
        if unit.get(key):
            parts.append(f"{label} {unit[key]}")
    return ', '.join(parts) if parts else ABSENT


def parse_abilities(unit):
    """Split the roster's ability strings into {key: value}, value True for a bare flag.

    The roster spellings are already display text ('Cold Immunity', 'Negate First Strike'),
    so there is no label table here to fall out of sync with them.
    """
    result = {}
    for entry in unit.get('abilities', []):
        if '=' in entry:
            key, value = entry.split('=', 1)
            result[key] = value
        else:
            result[entry] = True
    return result


def fmt_ability(key, value):
    return key if value is True else f"{key}={value}"


# --- Diffing ---------------------------------------------------------------------------

def diff(com2_text, warlord_text):
    return com2_text if com2_text == warlord_text else f"{com2_text} → {warlord_text}"


def diff_abilities(com2_unit, warlord_unit):
    """Per-ability diff: unchanged plain, changed as `Key=a → b`, dropped `−`, added `+`.

    A whole-list `old → new` would restate every shared ability on both sides of the arrow,
    which for the Warlord heroes is most of the cell.
    """
    a = {k: v for k, v in parse_abilities(com2_unit).items() if k not in SUPPRESSED_ABILITIES}
    b = {k: v for k, v in parse_abilities(warlord_unit).items() if k not in SUPPRESSED_ABILITIES}
    parts = []
    for key in sorted(set(a) | set(b)):
        if key in a and key in b:
            parts.append(fmt_ability(key, a[key]) if a[key] == b[key]
                         else f"{fmt_ability(key, a[key])} → {fmt_ability(key, b[key])}")
        elif key in a:
            parts.append(f"−{fmt_ability(key, a[key])}")
        else:
            parts.append(f"+{fmt_ability(key, b[key])}")
    return ', '.join(parts)


def plain_abilities(unit):
    ab = {k: v for k, v in parse_abilities(unit).items() if k not in SUPPRESSED_ABILITIES}
    return ', '.join(fmt_ability(k, ab[k]) for k in sorted(ab))


COLUMNS = ['Unit', 'Fig', 'Mel', 'Def', 'Res', 'HP', 'ToHit', 'ToBlk',
           'Ranged', 'Ammo', 'Thrown/Breath', 'Mv', 'Cost', 'Upk']


def header_rows():
    return [
        '| ' + ' | '.join(COLUMNS + ['Abilities']) + ' |',
        '|' + '|'.join(['---'] * (len(COLUMNS) + 1)) + '|',
    ]


def render_cells(unit):
    """One rendered cell per `COLUMNS` entry, in that order. Abilities are handled apart:
    they diff per tag rather than as one string."""
    cells = [
        unit['name'],
        fmt_int(unit['figures']),
        fmt_int(unit['melee']),
        fmt_int(unit['defense']),
        fmt_int(unit['resist']),
        fmt_int(unit['hp']),
        fmt_signed_pct(unit.get('to_hit')),
        fmt_signed_pct(unit.get('to_block')),
        fmt_ranged(unit),
        fmt_int(unit.get('ammo')),
        fmt_special_attacks(unit),
        fmt_int(unit['moves']),
        fmt_int(unit['cost']),
        fmt_int(unit['upkeep']),
    ]
    if len(cells) != len(COLUMNS):
        raise ValueError(
            f"render_cells emits {len(cells)} cells for {len(COLUMNS)} columns; the row and "
            f"its header would disagree."
        )
    return cells


def compare_row(com2_unit, warlord_unit):
    cells = [diff(a, b) for a, b in zip(render_cells(com2_unit), render_cells(warlord_unit))]
    cells.append(diff_abilities(com2_unit, warlord_unit))
    return '| ' + ' | '.join(cells) + ' |'


def new_unit_row(unit):
    return '| ' + ' | '.join(render_cells(unit) + [plain_abilities(unit)]) + ' |'


def unit_changed(com2_unit, warlord_unit):
    """A stat, price or ability differs. Compared on the rendered cells and the ability tags
    themselves -- reading the joined row back for an arrow would miss `+`/`−`-marked
    abilities, which are how an added or dropped tag is written."""
    if render_cells(com2_unit) != render_cells(warlord_unit):
        return True
    return parse_abilities(com2_unit) != parse_abilities(warlord_unit)


# --- Document ---------------------------------------------------------------------------

def check_categories(units, label):
    """Every roster category must be named by `CATEGORY_ORDER`, or its units vanish silently.

    `Calculator/ui_units.js` raises on the same condition for the same reason.
    """
    unknown = sorted({u['category'] for u in units} - set(CATEGORY_ORDER))
    if unknown:
        raise ValueError(
            f"{label}: categories {unknown} are named by no CATEGORY_ORDER entry, so their "
            f"units would be omitted from the document. Add them in the order "
            f"`Calculator/ui_units.js` gives them."
        )


def build(com2_by_tid, warlord_by_tid):
    orphans = sorted(set(com2_by_tid) - set(warlord_by_tid))
    if orphans:
        raise ValueError(
            f"CoM2 templateIds {orphans} have no Warlord counterpart. The join assumes the "
            f"Warlord roster is a superset of the CoM2 slot table; a roster where that no "
            f"longer holds needs a CoM2-only section rather than a silent drop."
        )

    shared_tids = sorted(com2_by_tid)
    new_tids = sorted(set(warlord_by_tid) - set(com2_by_tid))
    changed = sum(1 for t in shared_tids if unit_changed(com2_by_tid[t], warlord_by_tid[t]))
    renamed = [t for t in shared_tids if com2_by_tid[t]['name'] != warlord_by_tid[t]['name']]
    moved_cat = [t for t in shared_tids
                 if com2_by_tid[t]['category'] != warlord_by_tid[t]['category']]
    moved_race = [t for t in shared_tids
                  if com2_by_tid[t]['race'] != warlord_by_tid[t]['race']]

    com2_keys = {k for t in shared_tids for k in parse_abilities(com2_by_tid[t])}
    warlord_keys = {k for u in warlord_by_tid.values() for k in parse_abilities(u)}

    lines = [
        '# CoM2 / Warlord unit comparison',
        '',
        'Every unit of the CoM2 1.05.11 roster beside its Warlord 1.5.12.7 counterpart, plus the ',
        'units Warlord adds. Generated by `tools/generate_com2_warlord_unit_comparison.py` from ',
        '`CoM2 units.json` and `Warlord mod units.json`, which the roster generators derive from ',
        "each version's own `UNITS.INI`. Do not hand-edit.",
        '',
        '## Reading the tables',
        '',
        'Units are matched by `templateId`, the `UNITS.INI` section index, so a renamed unit still ',
        'lines up with the slot it came from. A cell that reads `a → b` changed; a plain cell is ',
        'the same in both. In the Abilities column, `−X` was dropped in Warlord, `+X` was added, ',
        'and `X=a → X=b` changed value. The `Hero` tag is omitted — every unit in the Heroes ',
        'section carries it and no other unit does.',
        '',
        '`ToHit` and `ToBlk` are percentage-point deltas above the engine\'s 30% base, matching the ',
        'roster schema; `-` means the record states the base. `Thrown/Breath` lists the three ',
        'independent special-attack channels (`Thrown`, `Fire`, `Lightning`) rather than the ',
        "roster's single-slot compatibility projection, so a unit with two of them shows both. ",
        '`Mv` is movement points. Abilities carry the roster spelling; a `=value` is the ability\'s ',
        'own parameter, whose meaning differs per ability (strength, resistance modifier, charges).',
        '',
        '## Summary',
        '',
        '| | CoM2 1.05.11 | Warlord 1.5.12.7 |',
        '|---|---|---|',
        f'| Units | {len(com2_by_tid)} | {len(warlord_by_tid)} |',
        f'| Heroes | {sum(1 for u in com2_by_tid.values() if u["isHero"])} '
        f'| {sum(1 for u in warlord_by_tid.values() if u["isHero"])} |',
        f'| Distinct ability tags | {len(com2_keys)} | {len(warlord_keys)} |',
        '',
        f'Warlord keeps all {len(shared_tids)} CoM2 slots and adds {len(new_tids)}. Of the shared '
        f'slots, {changed} differ in at least one stat, ability or price; '
        f'{plural(len(shared_tids) - changed, "is", "are")} identical. '
        f'{len(renamed)} of them are renamed.',
        '',
    ]

    if moved_cat:
        lines += [
            '### Units listed under a different category',
            '',
            'These appear below under their **Warlord** category, not their CoM2 one.',
            '',
            '| Unit | CoM2 | Warlord |',
            '|---|---|---|',
        ]
        for t in moved_cat:
            c, w = com2_by_tid[t], warlord_by_tid[t]
            lines.append(f'| {diff(c["name"], w["name"])} | {c["category"]} | {w["category"]} |')
        lines.append('')

    if moved_race:
        lines += [
            '### Units whose base race changed',
            '',
            '| Unit | CoM2 | Warlord |',
            '|---|---|---|',
        ]
        for t in moved_race:
            c, w = com2_by_tid[t], warlord_by_tid[t]
            lines.append(f'| {diff(c["name"], w["name"])} | {c["race"]} | {w["race"]} |')
        lines.append('')

    added_keys = sorted(warlord_keys - com2_keys)
    dropped_keys = sorted(com2_keys - warlord_keys)
    lines += ['### Ability tags Warlord introduces', '']
    lines.append(', '.join(f'`{k}`' for k in added_keys) if added_keys
                 else 'None — Warlord uses no ability tag absent from the CoM2 roster.')
    lines.append('')
    if dropped_keys:
        lines += ['### Ability tags no Warlord unit carries', '',
                  ', '.join(f'`{k}`' for k in dropped_keys), '']

    # --- Per-category sections ---
    for category in CATEGORY_ORDER:
        cat_shared = [t for t in shared_tids if warlord_by_tid[t]['category'] == category]
        cat_new = [t for t in new_tids if warlord_by_tid[t]['category'] == category]
        if not cat_shared and not cat_new:
            continue
        lines += [f'## {category}', '']
        if cat_shared:
            lines += header_rows()
            lines += [compare_row(com2_by_tid[t], warlord_by_tid[t]) for t in cat_shared]
            lines.append('')
        if cat_new:
            # A category the CoM2 roster never populated needs no "new in Warlord" subheading
            # to separate it from anything -- the whole section is new.
            if cat_shared:
                lines += [f'### {category} — new in Warlord', '']
            else:
                lines += ['Every unit in this category is new in Warlord.', '']
            lines += header_rows()
            lines += [new_unit_row(warlord_by_tid[t]) for t in cat_new]
            lines.append('')

    return '\n'.join(lines) + '\n'


def main():
    repo_root = Path(__file__).resolve().parent.parent
    roster_dir = repo_root / 'Unit rosters'
    com2_path = roster_dir / 'CoM2 units.json'
    warlord_path = roster_dir / 'Warlord mod units.json'
    out_path = roster_dir / 'CoM2 Warlord unit comparison.md'

    com2 = json.load(open(com2_path, encoding='utf-8'))
    warlord = json.load(open(warlord_path, encoding='utf-8'))
    check_categories(com2.values(), com2_path.name)
    check_categories(warlord.values(), warlord_path.name)

    com2_by_tid = {u['templateId']: u for u in com2.values()}
    warlord_by_tid = {u['templateId']: u for u in warlord.values()}
    if len(com2_by_tid) != len(com2) or len(warlord_by_tid) != len(warlord):
        raise ValueError('templateId is not unique within a roster; the join key is invalid.')

    out_path.write_text(build(com2_by_tid, warlord_by_tid), encoding='utf-8')
    print(f"Wrote {len(warlord_by_tid)} Warlord units "
          f"({len(com2_by_tid)} compared, {len(warlord_by_tid) - len(com2_by_tid)} new) "
          f"to {out_path}")


if __name__ == '__main__':
    main()
