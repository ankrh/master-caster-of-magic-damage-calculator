"""
Generate a JSON file of Warlord mod units from UNITS.INI.

Fields match the MoM/CoM1/CoM2 JSON schema:
  id, name, race, category, figures, hp, melee, defense, resist, moves, cost, upkeep
  ranged, ranged_type, ammo         (omitted when absent)
  thrown_breath, thrown_breath_type (omitted when absent)
  abilities                         (omitted when empty)

Run from the "Unit rosters" directory:
  python ../tools/generate_warlord_units_json.py
"""

import json
import os
import re

RACE_NAMES = {
    0: 'Barbarian', 1: 'Beastmen', 2: 'Dark Elf', 3: 'Draconian', 4: 'Dwarf',
    5: 'Gnoll', 6: 'Halfling', 7: 'High Elf', 8: 'High Men', 9: 'Klackon',
    10: 'Lizardman', 11: 'Nomad', 12: 'Orc', 13: 'Troll', 14: 'Special',
    15: 'Arcane', 16: 'Nature', 17: 'Sorcery', 18: 'Chaos', 19: 'Life', 20: 'Death',
    # Warlord mod new races
    22: 'Xuanyuan', 23: 'Rakhshasa', 24: 'Hawkmen', 25: 'Goblin',
}

RANGED_TYPE_MAP = {
    10: 'Boulder',   # boulder / catapult
    11: 'Boulder',   # cannon
    20: 'Missile',
    21: 'Missile',   # sling
    30: 'Magic(C)',  # chaos — lightning bolt
    31: 'Magic(C)',  # chaos — fire bolt
    32: 'Magic(S)',  # sorcery — ice bolt / illusion ball
    33: 'Magic(C)',  # chaos — death bolt
    34: 'Magic(S)',  # sorcery
    35: 'Magic(N)',  # nature — priest sparkles
    36: 'Magic(C)',  # chaos — drow sparkles
    37: 'Magic(N)',  # nature — sprite shimmer
    38: 'Magic(N)',  # nature — green bolt
    39: 'Magic(C)',  # chaos (misc)
    40: 'Magic(N)',  # nature (misc)
}

REALM_NAMES = {
    15: 'Arcane', 16: 'Nature', 17: 'Sorcery', 18: 'Chaos', 19: 'Life', 20: 'Death',
}

ABILITY_NAME_MAP = {
    'FirstStrike':       'First Strike',
    'NegateFirstStrike': 'Negate First Strike',
    'ArmorPiercing':     'Armor Piercing',
    'MissileImmunity':   'Missile Immunity',
    'MagicImmunity':     'Magic Immunity',
    'IllusionImmunity':  'Illusion Immunity',
    'DeathImmunity':     'Death Immunity',
    'PoisonImmunity':    'Poison Immunity',
    'FireImmunity':      'Fire Immunity',
    'ColdImmunity':      'Cold Immunity',
    'WeaponImmunity':    'Weapon Immunity',
    'Flying':            'Flight',
    'Windwalking':       'Wind Walking',
    'Waterwalking':      'Water Walking',
    'LongRange':         'Long Range',
    'WallCrusher':       'Wall Crusher',
    'HolyBonus':         'Holy Bonus',
    'QuickCasting':      'Quick Casting',
    'Noncorporeal':      'Non-Corporeal',
    'BloodSucker':       'Blood Sucker',
    'HealingAura':       'Healing Aura',
    'LargeShield':       'Large Shield',
    'CreateOutpost':     'Create Outpost',
    'Fear':              'Cause Fear',
    'PlaneShifting':     'Plane Shifting',
    'StoningGaze':       'Stoning Gaze',
    'StoningTouch':      'Stoning Touch',
    'DeathTouch':        'Death Touch',
    'StoningImmunity':   'Stoning Immunity',
    'CounterImmunity':   'Counter Immunity',
    'LightningResist':   'Lightning Resist',
    'Poison':            'Poison Touch',
    'LifeSteal':         'Life Steal',
    'ResistanceToAll':   'Resistance to All',
    'DeathGaze':         'Death Gaze',
    'DoomGaze':          'Doom Gaze',
    'GazeRanged':        'Gaze Ranged',
    'CreateUndead':      'Create Undead',
    'NoHealing':         'No Healing',
}

SPELL_NAMES = {
    5:   "Web",
    96:  "Fireball",
    104: "Doom Bolt",
    125: "Healing",
    137: "Raise Dead",
    191: "Summon Demon",
}


def parse_units_ini(path):
    units = []
    current = None
    with open(path, 'r', encoding='utf-8', errors='replace') as f:
        for raw_line in f:
            line = raw_line.strip()
            if not line or line.startswith(';'):
                continue
            sec_match = re.match(r'^\[(\d+)\]$', line)
            if sec_match:
                if current is not None:
                    units.append(current)
                current = {'index': int(sec_match.group(1))}
                continue
            if current is None:
                continue
            eq_idx = line.find('=')
            if eq_idx < 0:
                continue
            key = line[:eq_idx].strip()
            val = line[eq_idx + 1:].strip()
            current[key] = val
    if current is not None:
        units.append(current)
    return units


def get_category(u):
    idx = u['index']
    if u.get('HeroType'):
        return 'Heroes'
    if 35 <= idx <= 39:
        return 'General'
    race = int(u.get('Race', 0))
    # Check named races first (includes Warlord new races at IDs 22-25)
    if race in RACE_NAMES and race not in REALM_NAMES:
        return RACE_NAMES[race]
    if race >= 15:
        return REALM_NAMES.get(race, 'Fantastic') + ' Creatures'
    return 'Other'


# Heroes that kept their CoM2 name and canonical character name
HERO_NAMES = {
    'Sage':         'Sage (Zaldron)',
    'Dervish':      "Dervish (B'Shan)",
    'Beastmaster':  'Beastmaster (Rakir)',
    'Bard':         'Bard (Valana)',
    'Healer':       'Healer (Serena)',
    'Huntress':     'Huntress (Shuri)',
    'Thief':        'Thief (Theria)',
    'Druid':        'Druid (Greyfairer)',
    'War Monk':     'War Monk (Taki)',
    'Warrior Mage': 'Warrior Mage (Reywind)',
    'Magician':     'Magician (Malleus)',
    'Assassin':     'Assassin (Tumu)',
    'Wind Mage':    'Wind Mage (Jaer)',
    'Ranger':       'Ranger (Marcus)',
    'Draconian':    'Draconian (Fang)',
    'Witch':        'Witch (Morgana)',
    'Ninja':        'Ninja (Shin Bo)',
    'Rogue':        'Rogue (Spyder)',
    'Amazon':       'Amazon (Shalla)',
    'Warlock':      'Warlock (Yramrag)',
    'Unknown':      'Unknown (Mystic X)',
    'Illusionist':  'Illusionist (Aerie)',
    'Swordsman':    'Swordsman (Deth Stryke)',
    'Priestess':    'Priestess (Elana)',
    'Paladin':      'Paladin (Roland)',
    'Black Knight': 'Black Knight (Mortu)',
    'Knight':       'Knight (Sir Harold)',
    'Necromancer':  'Necromancer (Ravashack)',
}


def get_display_name(u):
    name = u.get('Name', 'Unknown')
    if u.get('HeroType'):
        return HERO_NAMES.get(name, name)
    race = int(u.get('Race', 0))
    if u.get('DisplayRace') == 'Yes' and RACE_NAMES.get(race) and RACE_NAMES.get(race) != 'Special':
        return RACE_NAMES[race] + ' ' + name
    return name


def ini_unit_to_record(u):
    idx = u['index']

    race_int = int(u.get('Race', 0))
    record = {
        'id':      idx,
        'name':    get_display_name(u),
        'race':    RACE_NAMES.get(race_int, str(race_int)),
        'figures': int(u.get('Figures', 1)),
        'hp':      int(u.get('HP', 1)),
        'melee':   int(u.get('Attack', 0)),
        'defense': int(u.get('Defense', 0)),
        'resist':  int(u.get('Resistance', 0)),
    }

    to_defend = int(u.get('ToDefend', 30))
    if to_defend != 30:
        record['to_block'] = to_defend

    if u.get('Ranged') and int(u['Ranged']) > 0:
        rt = int(u.get('RangedType', 20))
        record['ranged']      = int(u['Ranged'])
        record['ranged_type'] = RANGED_TYPE_MAP.get(rt, 'Missile')
        record['ammo']        = int(u.get('Ammo', 0))

    if u.get('Thrown') and int(u['Thrown']) > 0:
        record['thrown_breath']      = int(u['Thrown'])
        record['thrown_breath_type'] = 'thrown'
    elif u.get('FireBreath') and int(u['FireBreath']) > 0:
        record['thrown_breath']      = int(u['FireBreath'])
        record['thrown_breath_type'] = 'fire'
    elif u.get('LightningBreath') and int(u['LightningBreath']) > 0:
        record['thrown_breath']      = int(u['LightningBreath'])
        record['thrown_breath_type'] = 'lightning'

    abilities = []
    for ab in [
        'FirstStrike', 'NegateFirstStrike', 'ArmorPiercing', 'MissileImmunity',
        'MagicImmunity', 'IllusionImmunity', 'DeathImmunity', 'PoisonImmunity',
        'FireImmunity', 'ColdImmunity', 'WeaponImmunity', 'Stealth', 'Invisibility',
        'Flying', 'Sailing', 'Forester', 'Mountainwalk', 'Windwalking',
        'Waterwalking', 'LongRange', 'WallCrusher', 'Healer', 'Purify',
        'Regeneration', 'HolyBonus', 'Illusion', 'QuickCasting',
        'Fantastic', 'Noncorporeal', 'BloodSucker', 'HealingAura', 'LargeShield',
        'CreateOutpost', 'Lucky', 'Fear', 'Immolation', 'Meld', 'PlaneShifting',
        'StoningImmunity',
        'CounterImmunity', 'LightningResist', 'Supernatural', 'Doom',
        # Warlord-specific abilities
        'Amplifier', 'CreateUndead', 'DarkForce', 'Egoism', 'Exorcise',
        'Merging', 'NoHealing', 'Teleporting',
    ]:
        val = u.get(ab, '').strip()
        if val.lower() == 'yes':
            abilities.append(ab)
        elif val and val != '0':
            abilities.append(f'{ab}={val}')

    for ab in ['Caster', 'Poison', 'Destruction']:
        val = u.get(ab, '').strip()
        if val and val != '0':
            abilities.append(f'{ab}={val}')

    spell_id = u.get('Spellability', '').strip()
    if spell_id and spell_id != '0':
        spell_id_int = int(spell_id)
        spell_name = SPELL_NAMES.get(spell_id_int, f'Spell#{spell_id}')
        charges = u.get('Spellcharges', '0').strip()
        charges_int = int(charges) if charges else 0
        abilities.append(f'Spellcaster={spell_name}x{charges_int}')

    val = u.get('Life Steal', '').strip()
    if val and val != '0':
        abilities.append(f'LifeSteal={val}')
    val = u.get('Resistance To All', '').strip()
    if val and val != '0':
        abilities.append('ResistanceToAll' if val.lower() == 'yes' else f'ResistanceToAll={val}')

    # DoomGaze's value is attack strength (0 = no effect), so gate on nonzero.
    val = u.get('DoomGaze', '').strip()
    if val and val != '0':
        abilities.append(f'DoomGaze={val}')

    # Death/Stoning Touch/Gaze values are resistance modifiers, not strengths: the
    # defender resists at (resistance + value) or dies, so 0 is a meaningful value
    # (resist at base resistance). Gate on presence, not nonzero — a unit with e.g.
    # StoningTouch=0 has a real ability that must not be dropped.
    for ab in ['DeathGaze', 'DeathTouch', 'StoningGaze', 'StoningTouch']:
        val = u.get(ab, '').strip()
        if val != '':
            abilities.append(f'{ab}={val}')

    if 'Forester' in abilities and 'Mountainwalk' in abilities:
        abilities.remove('Forester')
        abilities.remove('Mountainwalk')
        abilities.append('Pathfinding')

    # Custom17: Rage (Warlord) — +1 Melee (and +1 Ranged, if applicable) per figure lost in combat
    if u.get('Custom17', '').strip() == '1':
        abilities.append('Rage')

    # Custom19: 1 = Mechanical, 2 = Clergy (Warlord unit type tags)
    custom19 = u.get('Custom19', '').strip()
    if custom19 == '1':
        abilities.append('Mechanical')
    elif custom19 == '2':
        abilities.append('Clergy')

    # Clockwork Tinmen: scripted passive on their attack that permanently
    # destroys any Mechanical opponent in a single hit (DESC.INI spell 340).
    if u.get('Name', '').strip() == 'Clockwork Tinmen':
        abilities.append('DestroyMechanical')

    # Race-exclusive building enchantments (Dragon Mound, Lava Smelter, Altar of the
    # Sun, Altar of the Moon, Ludus Agoge) gate on the unit's intrinsic race/name in the
    # calculator engine — no identity ability tags are emitted here. See deriveUnitStats.

    def _rename(ab):
        if '=' in ab:
            key, val = ab.split('=', 1)
            return f'{ABILITY_NAME_MAP.get(key, key)}={val}'
        return ABILITY_NAME_MAP.get(ab, ab)
    abilities = [_rename(ab) for ab in abilities]

    if u.get('HeroType'):
        abilities.insert(0, 'Hero')

    if abilities:
        record['abilities'] = abilities

    record['category'] = get_category(u)
    record['moves']    = int(u.get('Moves', 0)) // 2
    record['cost']     = int(u.get('Cost', 0))
    record['upkeep']   = int(u.get('Upkeep', 0))

    return record


def main():
    # Resolve paths relative to the repo root (parent of the tools/ dir holding this script),
    # so the script works from any cwd.
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ini_path = os.path.join(repo_root, 'Unit rosters', 'Warlord mod unit data', 'UNITS.INI')
    out_path = os.path.join(repo_root, 'Unit rosters', 'Warlord mod units.json')
    js_out_path = os.path.join(repo_root, 'Calculator', 'units_warlord.js')

    SPECIAL_UNIT_NAMES = {'Floating Island'}

    raw_units = parse_units_ini(ini_path)
    records = [ini_unit_to_record(u) for u in raw_units
               if u.get('CreateOutpost', '').lower() != 'yes'
               and u.get('Name') not in SPECIAL_UNIT_NAMES]

    from collections import Counter
    name_counts = Counter(r['name'] for r in records if r['category'] != 'Heroes')
    for r in records:
        if r['category'] == 'Heroes':
            continue
        if name_counts[r['name']] > 1:
            race = r['race']
            if race and race != 'Special' and not r['name'].startswith(race):
                r['name'] = race + ' ' + r['name']

    output = {str(r['id']): r for r in records}

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(records)} units to {out_path}")

    # Also emit JS-loadable version consumed by the calculator
    with open(js_out_path, 'w', encoding='utf-8') as f:
        f.write('const WARLORD_UNITS_DATA = ')
        json.dump(output, f, ensure_ascii=False)
        f.write(';\n')
    print(f"Wrote {js_out_path}")

    from collections import Counter
    cats = Counter(r['category'] for r in records)
    for cat, count in sorted(cats.items()):
        print(f"  {cat}: {count}")


if __name__ == '__main__':
    main()
