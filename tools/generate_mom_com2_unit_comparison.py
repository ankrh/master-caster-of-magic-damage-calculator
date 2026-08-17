"""
Generate a human-readable Markdown overview of unit stats.
Shows CoM2 stats. Where a stat differs from the MoM equivalent, annotates as `MoM → CoM2`.
"""
import json

MOM_INPUT  = "MoM 1.31 unit data.json"
COM2_INPUT = "CoM2 units.json"
OUTPUT     = "MoM CoM2 unit comparison.md"

# --- Type mappings (same format in both files) ---

RANGED_TYPE = {
    "magic_c": "Magic(C)", "magic_n": "Magic(N)", "magic_s": "Magic(S)",
    "missile": "Missile", "rock": "Rock",
}
BREATH_TYPE = {"thrown": "Thrown", "fire": "Fire", "lightning": "Lightning"}

# --- Ability flag mapping: ability string prefix → display label ---

ABILITY_FLAGS = [
    ("Flying",             "Flying"),
    ("Noncorporeal",       "Non-Corp"),
    ("LargeShield",        "Large Shield"),
    ("Lucky",              "Lucky"),
    ("LongRange",          "Long Range"),
    ("ArmorPiercing",      "Armor Piercing"),
    ("FirstStrike",        "First Strike"),
    ("NegateFirstStrike",  "Negate FS"),
    ("MissileImmunity",    "Missile Imm"),
    ("MagicImmunity",      "Magic Imm"),
    ("IllusionImmunity",   "Illusion Imm"),
    ("WeaponImmunity",     "Weapon Imm"),
    ("DeathImmunity",      "Death Imm"),
    ("FireImmunity",       "Fire Imm"),
    ("ColdImmunity",       "Cold Imm"),
    ("PoisonImmunity",     "Poison Imm"),
    ("StoningImmunity",    "Stone Imm"),
    ("Poison",             "Poison Touch"),
    ("Illusion",           "Illusion"),
    ("Invisibility",       "Invisible"),
    ("Stealth",            "Stealth"),
    ("Fear",               "Fear"),
    ("LifeSteal",          "Life Steal"),
    ("Regeneration",       "Regen"),
    ("Immolation",         "Immolation"),
    ("DispelEvil",         "Dispel Evil"),
    ("ResistanceToAll",    "Resist All"),
    ("DeathGaze",          "Death Gaze"),
    ("StoningGaze",        "Stone Gaze"),
    ("DoomGaze",           "Doom Gaze"),
    ("GazeRanged",         "Gaze Ranged"),
    ("StoningTouch",       "Stone Touch"),
    ("Doom",               "Doom"),
    ("BloodSucker",        "Blood Sucker"),
    ("WallCrusher",        "Wall Crusher"),
    ("Supernatural",       "Supernatural"),
    ("HolyBonus",          "Holy Bonus"),
]

UNIT_COLOR_MAP = {
    "Life Creatures":    "Life unit",
    "Death Creatures":   "Death unit",
    "Chaos Creatures":   "Chaos unit",
    "Nature Creatures":  "Nature unit",
    "Sorcery Creatures": "Sorc unit",
    "Arcane Creatures":  "Arcane unit",
}

# MoM unit color is stored as bool fields instead
MOM_COLOR_FIELDS = {
    "life_unit":   "Life unit",
    "death_unit":  "Death unit",
    "chaos_unit":  "Chaos unit",
    "nature_unit": "Nature unit",
    "sorc_unit":   "Sorc unit",
}


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
    """Format abilities for display from a unit dict (works for both MoM and CoM2)."""
    parts = []
    ab = parse_abilities(u.get("abilities", []))

    for key, label in ABILITY_FLAGS:
        if key in ab:
            v = ab[key]
            if v is True:
                parts.append(label)
            else:
                parts.append(f"{label} {v}")

    # Non-standard base block chance (default is 30%); calculator rosters store its delta.
    to_block = u.get("to_block")
    if to_block is not None:
        parts.append(f"Block {30 + to_block}%")

    return ", ".join(parts)


def fmt(val):
    return str(val) if val else "-"


def ranged_str(u):
    v = u.get("ranged", 0)
    if not v:
        return "-"
    t = RANGED_TYPE.get(u.get("ranged_type", ""), "?")
    return f"{v} ({t})"


def breath_str(u):
    v = u.get("breath", 0)
    if not v:
        return "-"
    t = BREATH_TYPE.get(u.get("breath_type", ""), "?")
    return f"{v} ({t})"


def tohit_str(u):
    v = u.get("to_hit", 0)
    return f"+{v}%" if v else "-"


def diff_field(mom_val, com2_val, com2_only=False):
    """Return 'old → new' if values differ, the plain value if unchanged, or '- → new' if CoM2-only."""
    cv = fmt(com2_val)
    if com2_only:
        return f"- → {cv}"
    mv = fmt(mom_val) if mom_val is not None else "-"
    if mom_val is None or mv == cv:
        return cv
    return f"{mv} → {cv}"


def unit_row(com2_u, mom_u=None):
    c = com2_u
    m = mom_u
    new = mom_u is None  # True = CoM2-only unit, prefix all fields with "- →"

    fig_s    = diff_field(m.get("figures")  if m else None, c.get("figures", 0), new)
    mel_s    = diff_field(m.get("melee")    if m else None, c.get("melee", 0),   new)
    def_s    = diff_field(m.get("defense")  if m else None, c.get("defense", 0), new)
    res_s    = diff_field(m.get("resist")   if m else None, c.get("resist", 0),  new)
    hp_s     = diff_field(m.get("hp")       if m else None, c.get("hp", 0),      new)

    # ToHit
    c_tohit = tohit_str(c)
    if new:
        tohit_s = f"- → {c_tohit}" if c_tohit != "-" else "-"
    elif m is not None:
        m_tohit = tohit_str(m)
        tohit_s = c_tohit if m_tohit == c_tohit else f"{m_tohit} → {c_tohit}"
    else:
        tohit_s = c_tohit

    # Ranged
    c_ranged = ranged_str(c)
    if new:
        ranged_s = f"- → {c_ranged}" if c_ranged != "-" else "-"
    elif m is not None:
        m_ranged = ranged_str(m)
        ranged_s = c_ranged if m_ranged == c_ranged else f"{m_ranged} → {c_ranged}"
    else:
        ranged_s = c_ranged

    # Breath
    c_breath = breath_str(c)
    if new:
        breath_s = f"- → {c_breath}" if c_breath != "-" else "-"
    elif m is not None:
        m_breath = breath_str(m)
        breath_s = c_breath if m_breath == c_breath else f"{m_breath} → {c_breath}"
    else:
        breath_s = c_breath

    # Abilities
    c_ab = abilities_str(c)
    if new:
        ab_s = f"- → {c_ab}" if c_ab else ""
    elif m is not None:
        m_ab = abilities_str(m)
        ab_s = c_ab if m_ab == c_ab else f"{m_ab} → {c_ab}"
    else:
        ab_s = c_ab

    ini_name = c.get("ini_name") or c.get("name", "?")
    display_name = c.get("name", ini_name)
    # Prefer the matched MoM unit's actual name (includes race prefix),
    # fall back to NAME_ALIASES for heroes or other edge cases.
    mom_name = (m.get("name") if m else None) or NAME_ALIASES.get(ini_name)
    name = f"{mom_name} → {display_name}" if mom_name and mom_name != display_name else display_name
    return (
        f"| {name:<30} "
        f"| {fig_s:>10} "
        f"| {mel_s:>10} "
        f"| {def_s:>10} "
        f"| {res_s:>10} "
        f"| {hp_s:>10} "
        f"| {tohit_s:>5} "
        f"| {ranged_s:<16} "
        f"| {breath_s:<16} "
        f"| {ab_s} |"
    )


# CoM2 ini_name -> MoM name, for units that were renamed between games
NAME_ALIASES = {
    'Shaman':          'Shamans',
    'Chimera':         'Chimeras',
    'Phantom Warrior': 'Phantom Warriors',
    'Pegasi':          'Pegasai',
    'Arch Angel':      'Archangel',
    'Orc Archer':      'Orc Warrior',
}

HEADER = (
    "| Unit                           |  Fig       | Melee      | Def        | Res        | HP         | ToHit "
    "| Ranged           | Thrown/Breath    | Abilities |"
)
DIVIDER = (
    "|--------------------------------|------------|------------|------------|------------|------------|-------"
    "|------------------|------------------|-----------|"
)


def section(title, com2_units, mom_lookup=None):
    lines = [f"## {title}", "", HEADER, DIVIDER]
    for u in com2_units:
        match = None
        if mom_lookup:
            ini = u.get("ini_name") or u.get("name", "")
            mom_name = NAME_ALIASES.get(ini, ini)
            match = mom_lookup.get(mom_name) or mom_lookup.get(ini)
        lines.append(unit_row(u, match))
    lines.append("")
    return "\n".join(lines)


def build_mom_name_lookup(mom_units, strip_prefix=None):
    """Build {name: unit} lookup for non-hero MoM units.
    If strip_prefix is given (e.g. 'Barbarian'), also indexes by name with that prefix removed.
    """
    result = {}
    for u in mom_units.values():
        name = u.get("name", "")
        result[name] = u
        if strip_prefix:
            # e.g. "Barbarian Shamans" -> "Shamans"
            prefix = strip_prefix + " "
            if name.startswith(prefix):
                result[name[len(prefix):]] = u
    return result


def build_mom_hero_lookup(mom_units):
    """Build {archetype_name: unit} for heroes by stripping the MoM parenthetical."""
    import re
    result = {}
    for u in mom_units.values():
        if u.get("category") == "Heroes":
            stripped = re.sub(r"\s*\(.*?\)", "", u.get("name", "")).strip()
            result[stripped] = u
    return result


def main():
    mom_units_raw  = json.load(open(MOM_INPUT,  encoding="utf-8"))
    com2_units_raw = json.load(open(COM2_INPUT, encoding="utf-8"))

    mom_units  = mom_units_raw   # dict keyed by string id
    com2_units = list(com2_units_raw.values())

    # Build MoM lookups
    mom_name_lookup  = build_mom_name_lookup(mom_units)
    mom_hero_by_id   = build_mom_hero_lookup(mom_units)  # keyed by archetype name

    def get_cat(cat):
        return [u for u in com2_units if u.get("category") == cat]

    lines = [
        "# MoM CoM2 unit comparison",
        "",
        "Where a stat differs, it's shown as `MoM → CoM2`.",
        "",
    ]

    def sort_key(u):
        # Mirrors index.html: sort_order if present, else cost
        if u.get("sort_order") is not None:
            return u["sort_order"]
        return u.get("cost", 0)

    # --- Heroes ---
    heroes = sorted(get_cat("Heroes"), key=sort_key)
    hero_lines = ["## Heroes - NOTE: Incomplete data", "", HEADER, DIVIDER]
    for u in heroes:
        hero_name = u.get("ini_name") or u.get("name", "")
        mom_key = NAME_ALIASES.get(hero_name, hero_name)
        mom_match = mom_hero_by_id.get(mom_key) or mom_hero_by_id.get(hero_name)
        hero_lines.append(unit_row(u, mom_match))
    hero_lines.append("")
    lines.append("\n".join(hero_lines))

    # --- General (ships, catapult) ---
    general = sorted(get_cat("General"), key=sort_key)
    if general:
        lines.append(section("General", general, mom_name_lookup))

    # --- Category order mirrors index.html categoryOrder ---
    RACE_CATEGORIES = [
        "Barbarian", "Gnoll", "Halfling", "High Elf", "High Men",
        "Klackon", "Lizardman", "Nomad", "Orc",
        "Beastmen", "Dark Elf", "Draconian", "Dwarf", "Troll",
    ]

    # MoM race names differ slightly from CoM2 category names in some cases
    MOM_CAT_NAME = {"Lizardman": "Lizardmen"}

    for cat in RACE_CATEGORIES:
        units = sorted(get_cat(cat), key=sort_key)
        if not units:
            continue
        mom_cat = MOM_CAT_NAME.get(cat, cat)
        cat_lookup = build_mom_name_lookup(mom_units, strip_prefix=mom_cat)
        lines.append(section(cat, units, cat_lookup))

    # --- Summoned creatures (order mirrors index.html) ---
    SUMMON_CATEGORIES = [
        ("Life Creatures",    "Summoned — Life"),
        ("Death Creatures",   "Summoned — Death"),
        ("Chaos Creatures",   "Summoned — Chaos"),
        ("Nature Creatures",  "Summoned — Nature"),
        ("Sorcery Creatures", "Summoned — Sorcery"),
        ("Arcane Creatures",  "Summoned — Arcane"),
    ]
    for cat, title in SUMMON_CATEGORIES:
        units = sorted(get_cat(cat), key=sort_key)
        if units:
            lines.append(section(title, units, mom_name_lookup))

    out = "\n".join(lines)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        f.write(out)
    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
