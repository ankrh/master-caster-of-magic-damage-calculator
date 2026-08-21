"""
Single home for the projectile-id -> calculator-token map used by roster generation.

`RangedType.INI` classifies each id with at most one flag: `IsMagic=Yes`, `IsMissile=Yes`,
or neither. "Neither" is the calculator's `boulder` class -- ids 10 and 11 carry it under
`StatIcon=2`, and Warlord's 12/13/14 are the same shape. The realm split inside the magical
class (`Magic(C)` / `Magic(N)` / `Magic(S)` / `Beam`) is *not* in the INI, which is why this
map exists at all rather than the generators reading the table directly.

The tables are per version and are not the same table: CoM2 1.05.11 base defines 13 usable
ids, Warlord 1.5.12.7 adds 12, 13, 14, 22 and 40. Id 39 is `; This ID can't be used!` in
both and is deliberately absent here.

Nothing in this module falls back. An id the shipped table does not define is a roster or
mod the calculator has never been checked against, and guessing a class for it silently
produces wrong damage -- see `SPEC.md`, *Out-of-range values stop the run*.
"""

# Ids 10-14 carry no flag; 20-22 are IsMissile; 30-38 and 40 are IsMagic, split by realm.
COM2_RANGED_TYPES = {
    10: 'Boulder',   # boulder / catapult
    11: 'Boulder',   # cannon
    20: 'Missile',
    21: 'Missile',   # sling
    30: 'Magic(C)',  # chaos - lightning bolt
    31: 'Magic(C)',  # chaos - fire bolt
    32: 'Magic(S)',  # sorcery - ice bolt / illusion ball
    33: 'Magic(C)',  # chaos - death bolt
    34: 'Magic(S)',  # sorcery
    35: 'Magic(N)',  # nature - priest sparkles
    36: 'Magic(C)',  # chaos - drow sparkles
    37: 'Magic(N)',  # nature - sprite shimmer
    38: 'Magic(N)',  # nature - green bolt
}

WARLORD_RANGED_TYPES = {
    **COM2_RANGED_TYPES,
    12: 'Boulder',   # Stone Giant / Colossus / both Gaia Lords
    13: 'Boulder',   # defined by the table, unused by the shipped roster
    14: 'Boulder',   # Goblin Midget Submarine
    22: 'Missile',
    40: 'Beam',      # Warlord beam energy
}


def ranged_type_token(ranged_type_id, table, unit_label):
    """Classify one `RangedType` id, or raise.

    `RangedType=0` means the record states no projectile type. It is not mapped: reaching
    here with it means the record also has `Ranged > 0`, which no shipped roster does and
    which the table gives no class for.
    """
    try:
        return table[ranged_type_id]
    except KeyError:
        raise ValueError(
            f"{unit_label}: RangedType={ranged_type_id} is not defined by this version's "
            f"RangedType.INI (known ids: {sorted(table)}). Add it to tools/ranged_types.py "
            f"with the class its IsMagic/IsMissile flags give it -- do not guess."
        ) from None
