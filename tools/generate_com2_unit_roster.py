"""
Generate a Markdown roster of all CoM2 units with full stats and abilities,
including spell abilities and caster numbers.
"""
import json

COM2_INPUT = "CoM2 units.json"
OUTPUT = "CoM2 unit roster.md"

BREATH_TYPE = {"thrown": "Thrown", "fire": "Fire", "lightning": "Lightning"}

# Ability flag → display label (order matters for display)
ABILITY_FLAGS = [
    ("Flying",             "Flying"),
    ("Noncorporeal",       "Non-Corp"),
    ("LargeShield",        "Large Shield"),
    ("Lucky",              "Lucky"),
    ("LongRange",          "Long Range"),
    ("ArmorPiercing",      "Armor Piercing"),
    ("FirstStrike",        "First Strike"),
    ("NegateFirstStrike",  "Negate FS"),
    ("QuickCasting",       "Quick Casting"),
    ("MissileImmunity",    "Missile Imm"),
    ("MagicImmunity",      "Magic Imm"),
    ("IllusionImmunity",   "Illusion Imm"),
    ("WeaponImmunity",     "Weapon Imm"),
    ("DeathImmunity",      "Death Imm"),
    ("FireImmunity",       "Fire Imm"),
    ("ColdImmunity",       "Cold Imm"),
    ("PoisonImmunity",     "Poison Imm"),
    ("StoningImmunity",    "Stone Imm"),
    ("CounterImmunity",    "Counter Imm"),
    ("LightningResist",    "Lightning Res"),
    ("ResistanceToAll",    "Resist All"),
    ("Poison",             "Poison Touch"),
    ("Illusion",           "Illusion"),
    ("Invisibility",       "Invisible"),
    ("Stealth",            "Stealth"),
    ("Fear",               "Fear"),
    ("LifeSteal",          "Life Steal"),
    ("Regeneration",       "Regen"),
    ("Immolation",         "Immolation"),
    ("DispelEvil",         "Dispel Evil"),
    ("DeathGaze",          "Death Gaze"),
    ("StoningGaze",        "Stone Gaze"),
    ("DoomGaze",           "Doom Gaze"),
    ("GazeRanged",         "Gaze Ranged"),
    ("StoningTouch",       "Stone Touch"),
    ("Doom",               "Doom"),
    ("BloodSucker",        "Blood Sucker"),
    ("WallCrusher",        "Wall Crusher"),
    ("Supernatural",       "Supernatural"),
    ("Fantastic",          "Fantastic"),
    ("HolyBonus",          "Holy Bonus"),
    ("Healer",             "Healer"),
    ("HealingAura",        "Healing Aura"),
    ("Purify",             "Purify"),
    ("Meld",               "Meld"),
    ("PlaneShifting",      "Plane Shifting"),
    # Movement abilities
    ("Forester",           "Forester"),
    ("Mountainwalk",       "Mountainwalk"),
    ("Pathfinding",        "Pathfinding"),
    ("Waterwalking",       "Waterwalking"),
    ("Windwalking",        "Windwalking"),
    ("Sailing",            "Sailing"),
]


def parse_abilities(ability_list):
    """Return dict of {name: value} from ability list like ['Poison=5', 'Flying']."""
    result = {}
    for a in (ability_list or []):
        if "=" in a:
            k, v = a.split("=", 1)
            try:
                result[k] = int(v)
            except ValueError:
                result[k] = v
        else:
            result[a] = True
    return result


def abilities_str(u):
    """Format all abilities including spells and caster level."""
    parts = []
    ab = parse_abilities(u.get("abilities", []))

    for key, label in ABILITY_FLAGS:
        if key in ab:
            v = ab[key]
            if v is True:
                parts.append(label)
            else:
                parts.append(f"{label} {v}")

    # Caster level
    if "Caster" in ab:
        parts.append(f"Caster {ab['Caster']}")

    # Spell abilities (e.g. "Spellcaster=Healingx1" → "Spell: Healing x1")
    if "Spellcaster" in ab:
        raw = ab["Spellcaster"]
        # Parse "Healingx1", "Doom Boltx1", "Summon Demonx3"
        # Find the last 'x' followed by digits
        xi = raw.rfind("x")
        if xi > 0 and raw[xi+1:].isdigit():
            spell_name = raw[:xi]
            charges = raw[xi+1:]
            parts.append(f"Spell: {spell_name} x{charges}")
        else:
            parts.append(f"Spell: {raw}")

    # Non-standard base block chance; calculator rosters store a delta above 30%.
    to_block = u.get("to_block")
    if to_block is not None:
        parts.append(f"Block {30 + to_block}%")

    return ", ".join(parts)


def fmt(val):
    return str(val) if val else "-"


def ranged_str(u):
    """Render the Ranged cell from the record's own token.

    `ranged_type` already holds the display spelling -- `tools/ranged_types.py` writes it for the
    modern rosters and `parse_tweaker_unit_data.py` for the DOS ones -- so this transcribes it
    instead of translating it through a second table here.
    """
    v = u.get("ranged", 0)
    if not v:
        return "-"
    t = u.get("ranged_type")
    if not t:
        raise ValueError(
            f"{u.get('name', u.get('ini_name', '?'))}: ranged={v} with no ranged_type. "
            "A record stating a ranged attack states its projectile class too."
        )
    return f"{v} ({t})"


def ammo_str(u):
    if not u.get("ranged", 0):
        return "-"
    v = u.get("ammo", 0)
    return str(v) if v else "-"


def breath_str(u):
    v = u.get("breath", 0)
    if not v:
        return "-"
    t = BREATH_TYPE.get(u.get("breath_type", ""), "?")
    return f"{v} ({t})"


def tohit_str(u):
    v = u.get("to_hit", 0)
    return f"+{v}%" if v else "-"


HEADER = (
    "| Unit                           | Fig | Mel | Def | Res |  HP | ToHit "
    "| Ranged             | Ammo | Breath/Thrown    | Abilities |"
)
DIVIDER = (
    "|--------------------------------|-----|-----|-----|-----|-----|-------"
    "|--------------------|------|-----------------|-----------|"
)


def unit_row(u):
    name = u.get("name", u.get("ini_name", "?"))
    fig = fmt(u.get("figures", 0))
    mel = fmt(u.get("melee", 0))
    dfn = fmt(u.get("defense", 0))
    res = fmt(u.get("resist", 0))
    hp = fmt(u.get("hp", 0))
    th = tohit_str(u)
    rng = ranged_str(u)
    ammo = ammo_str(u)
    bth = breath_str(u)
    ab = abilities_str(u)

    return (
        f"| {name:<30} "
        f"| {fig:>3} "
        f"| {mel:>3} "
        f"| {dfn:>3} "
        f"| {res:>3} "
        f"| {hp:>3} "
        f"| {th:>5} "
        f"| {rng:<18} "
        f"| {ammo:>4} "
        f"| {bth:<15} "
        f"| {ab} |"
    )


def section(title, units):
    lines = [f"## {title}", "", HEADER, DIVIDER]
    for u in units:
        lines.append(unit_row(u))
    lines.append("")
    return "\n".join(lines)


def sort_key(u):
    if u.get("sort_order") is not None:
        return u["sort_order"]
    return u.get("cost", 0)


def main():
    com2_units_raw = json.load(open(COM2_INPUT, encoding="utf-8"))
    com2_units = list(com2_units_raw.values())

    def get_cat(cat):
        return sorted([u for u in com2_units if u.get("category") == cat], key=sort_key)

    lines = [
        "# CoM2 Unit Roster",
        "",
    ]

    # Heroes
    heroes = get_cat("Heroes")
    if heroes:
        lines.append(section("Heroes - NOTE: Incomplete data", heroes))

    # General (ships, catapult)
    general = get_cat("General")
    if general:
        lines.append(section("General", general))

    # Race categories
    RACE_CATEGORIES = [
        "Barbarian", "Gnoll", "Halfling", "High Elf", "High Men",
        "Klackon", "Lizardman", "Nomad", "Orc",
        "Beastmen", "Dark Elf", "Draconian", "Dwarf", "Troll",
    ]
    for cat in RACE_CATEGORIES:
        units = get_cat(cat)
        if units:
            lines.append(section(cat, units))

    # Summoned creatures
    SUMMON_CATEGORIES = [
        ("Life Creatures",    "Summoned — Life"),
        ("Death Creatures",   "Summoned — Death"),
        ("Chaos Creatures",   "Summoned — Chaos"),
        ("Nature Creatures",  "Summoned — Nature"),
        ("Sorcery Creatures", "Summoned — Sorcery"),
        ("Arcane Creatures",  "Summoned — Arcane"),
    ]
    for cat, title in SUMMON_CATEGORIES:
        units = get_cat(cat)
        if units:
            lines.append(section(title, units))

    out = "\n".join(lines)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
