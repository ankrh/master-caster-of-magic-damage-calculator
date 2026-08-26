"""
Generate a JSON file of Warlord mod units from UNITS.INI.

Fields match the MoM/CoM1/CoM2 JSON schema:
  id, name, race, category, figures, hp, melee, defense, resist, moves, cost, upkeep
  templateId, heroTypeId, isHero, baseRace, baseFantastic
  ranged, ranged_type, ammo         (shared projection; omitted when absent)
  thrown_breath, thrown_breath_type (shared projection; omitted when absent)
  thrown, fire_breath, lightning_breath (modern independent channels; omitted when absent)
  to_hit, to_block                  (percentage-point deltas above the 30% base)
  abilities                         (omitted when empty)

Run from any working directory:
  python tools/generate_warlord_units_json.py
"""

import json
import re
from pathlib import Path

from ranged_types import WARLORD_RANGED_TYPES, ranged_type_token

RACE_NAMES = {
    0: 'Barbarian', 1: 'Beastmen', 2: 'Dark Elf', 3: 'Draconian', 4: 'Dwarf',
    5: 'Gnoll', 6: 'Halfling', 7: 'High Elf', 8: 'High Men', 9: 'Klackon',
    10: 'Lizardman', 11: 'Nomad', 12: 'Orc', 13: 'Troll', 14: 'Special',
    15: 'Arcane', 16: 'Nature', 17: 'Sorcery', 18: 'Chaos', 19: 'Life', 20: 'Death',
    # Warlord mod new races
    22: 'Xuanyuan', 23: 'Rakhshasa', 24: 'Hawkmen', 25: 'Goblin',
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


def unit_label(u):
    return f"[{u['index']}] {u.get('Name', '<no Name key>')}"


def ini_value(u, key):
    """Read a key every shipped UNITS.INI record defines, or raise.

    All 364 `[n]` sections carry Race, Name, Figures, HP, Attack, Defense, Resistance, Hit,
    Moves, Cost and Upkeep, so a missing one means the roster is not the file this generator
    was written against. Substituting a plausible stat would ship a unit whose numbers no
    source produced -- `Calculator/SPEC.md`, *Out-of-range values stop the run*.
    """
    if key not in u:
        raise ValueError(
            f"{unit_label(u)}: UNITS.INI record has no '{key}' key. Every record in the "
            f"shipped roster defines it; fix the source record rather than defaulting."
        )
    return u[key]


def race_name(race_int, label):
    """Name one `Race` id, or raise. The id set is closed per version."""
    try:
        return RACE_NAMES[race_int]
    except KeyError:
        raise ValueError(
            f"{label}: Race={race_int} is not defined by this version's race table "
            f"(known ids: {sorted(RACE_NAMES)}). Add it to RACE_NAMES with the name its "
            f"UNITS.INI/manual gives it -- do not fall back to the raw id."
        ) from None


def get_category(u):
    idx = u['index']
    if u.get('HeroType'):
        return 'Heroes'
    if 35 <= idx <= 39:
        return 'General'
    race = int(ini_value(u, 'Race'))
    # Check named races first (includes Warlord new races at IDs 22-25)
    if race in RACE_NAMES and race not in REALM_NAMES:
        return RACE_NAMES[race]
    if race in REALM_NAMES:
        return REALM_NAMES[race] + ' Creatures'
    raise ValueError(
        f"{unit_label(u)}: Race={race} is in neither the race table "
        f"(known ids: {sorted(RACE_NAMES)}) nor the realm table "
        f"(known ids: {sorted(REALM_NAMES)}), so it names no picker category."
    )


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
    """`HERO_NAMES` is a decoration table, not an enumeration: it adds the canonical character
    name to the heroes that have one, and the 20 Warlord heroes with no entry keep their own
    name. That pass-through is the rule, not a miss-path."""
    name = ini_value(u, 'Name')
    if u.get('HeroType'):
        return HERO_NAMES.get(name, name)
    race = race_name(int(ini_value(u, 'Race')), unit_label(u))
    if u.get('DisplayRace') == 'Yes' and race != 'Special':
        return race + ' ' + name
    return name


def ini_unit_to_record(u):
    idx = u['index']

    race_int = int(ini_value(u, 'Race'))
    base_race = race_name(race_int, unit_label(u))
    hero_type_id = int(u['HeroType']) if u.get('HeroType') else None
    record = {
        'id':      idx,
        # Roster identity is version-scoped by the selected dataset. Keep the source
        # template and hero IDs separate from the picker ID and editable identity.
        'templateId': idx,
        'heroTypeId': hero_type_id,
        'isHero': hero_type_id is not None,
        'baseRace': base_race,
        'baseFantastic': u.get('Fantastic', '').strip().lower() == 'yes',
        'name':    get_display_name(u),
        'race':    base_race,
        'figures': int(ini_value(u, 'Figures')),
        'hp':      int(ini_value(u, 'HP')),
        'melee':   int(ini_value(u, 'Attack')),
        'defense': int(ini_value(u, 'Defense')),
        'resist':  int(ini_value(u, 'Resistance')),
    }

    # Match `to_hit`: the roster schema stores the percentage-point delta above 30%,
    # while UNITS.INI stores the absolute To Defend chance. `ToDefend` is absent from 334 of
    # the 364 records and 30 is the engine's stated base To Block chance (`statRecord.toBlk`
    # in `Calculator/stats.js`), so reading a missing key as 30 is transcription.
    to_defend = int(u.get('ToDefend', 30)) - 30
    if to_defend != 0:
        record['to_block'] = to_defend

    # Innate To Hit bonus. The INI stores the absolute To Hit chance (default 30%);
    # the app schema stores the modifier above the 30% base, matching the MoM/CoM
    # convention (e.g. Hit=40 -> to_hit 10 = +10%). `Hit=30` is the engine's stated base To
    # Hit, so reading a missing key as 30 is transcription -- `SPEC.md`, *Out-of-range values
    # stop the run*, names this case.
    to_hit = int(u.get('Hit', 30)) - 30
    if to_hit != 0:
        record['to_hit'] = to_hit

    # The Ranged record's existence is stated by its projectile type, not by its strength:
    # `[362]` Wanderer ships `RangedType=30` with `Ranged=0`, and the engine writes that read
    # the permanent type land on it regardless -- `ApplyLevelBonus`'s ranged arm is
    # `BaseUnits[i].rangedtype > 0` with no strength test. `RangedType=0` states no type and is
    # not a class the table maps. The three assignments stay in this order because the emitted
    # key order is the record's.
    label = unit_label(u)
    ranged_strength = int(u.get('Ranged') or 0)
    ranged_type_id = int(u.get('RangedType') or 0)
    if ranged_strength > 0 and ranged_type_id <= 0:
        raise ValueError(
            f"{label}: Ranged={ranged_strength} with RangedType={u.get('RangedType', '<absent>')}. "
            f"The projectile class cannot be derived from strength alone."
        )
    if ranged_strength > 0:
        record['ranged']      = ranged_strength
    if ranged_type_id > 0:
        record['ranged_type'] = ranged_type_token(ranged_type_id, WARLORD_RANGED_TYPES, label)
    if ranged_strength > 0:
        # Every record with Ranged > 0 states its Ammo; an absent key is not "unlimited".
        record['ammo']        = int(ini_value(u, 'Ammo'))

    # Caster.exe stores four independently usable attack channels. Keep the existing
    # fields for the current UI/resolver, but emit the three channels that its former
    # thrown_breath projection could erase so the next migration can be lossless.
    for ini_key, output_key in [
        ('Thrown', 'thrown'),
        ('FireBreath', 'fire_breath'),
        ('LightningBreath', 'lightning_breath'),
    ]:
        if u.get(ini_key) and int(u[ini_key]) > 0:
            record[output_key] = int(u[ini_key])

    # Compatibility projection for the pre-R3.2 single special-attack slot.
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

    for ab in ['Caster', 'Poison']:
        val = u.get(ab, '').strip()
        if val and val != '0':
            abilities.append(f'{ab}={val}')

    # Destruction's value is a resistance modifier (negative = penalty), not a strength,
    # so 0 is meaningful — an unmodified resistance roll — where Caster=0/Poison=0 above
    # mean the ability is absent. The rosters ship the Magician with Destruction=0, which
    # a `!= '0'` guard would silently drop.
    val = u.get('Destruction', '').strip()
    if val:
        abilities.append(f'Destruction={val}')

    spell_id = u.get('Spellability', '').strip()
    if spell_id and spell_id != '0':
        spell_id_int = int(spell_id)
        # `SPELL_NAMES` is a display-name table over the record's own numeric id. A miss
        # renders the id verbatim rather than substituting another spell, so nothing is
        # invented: `Spell#260` states exactly what the record states. 44 of the 50 ids the
        # Warlord roster uses currently render that way; transcribing their names from
        # `MASTER.CAS`/`DESC.INI` is BACKLOG F115. No calculator code reads this value --
        # only `tools/generate_com2_unit_roster.py` displays it.
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

    # Custom13=14: Sapiens. This is a permanent roster tag used by Outlander
    # reforms to admit selected fantastic creatures through the regular-unit gate.
    if u.get('Custom13', '').strip() == '14':
        abilities.append('Sapiens')

    # Custom19: 1 = Mechanical, 2 = Clergy (Warlord unit type tags)
    custom19 = u.get('Custom19', '').strip()
    if custom19 == '1':
        abilities.append('Mechanical')
    elif custom19 == '2':
        abilities.append('Clergy')

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
    record['moves']    = int(ini_value(u, 'Moves')) // 2
    record['cost']     = int(ini_value(u, 'Cost'))
    record['upkeep']   = int(ini_value(u, 'Upkeep'))

    return record


def verify_attack_channel_coverage(raw_units, records):
    """Fail generation if a positive UNITS.INI attack channel was lost or changed."""
    records_by_id = {record['id']: record for record in records}
    channels = {
        'Ranged': 'ranged',
        'Thrown': 'thrown',
        'FireBreath': 'fire_breath',
        'LightningBreath': 'lightning_breath',
    }
    for unit in raw_units:
        record = records_by_id.get(unit['index'])
        if record is None:
            continue
        for ini_key, output_key in channels.items():
            source_value = int(unit.get(ini_key, 0) or 0)
            output_value = record.get(output_key)
            if source_value > 0 and output_value != source_value:
                raise ValueError(
                    f"Unit {unit['index']} {unit.get('Name', '')!r}: "
                    f"{ini_key}={source_value} did not reach {output_key}"
                )
            if source_value <= 0 and output_value is not None:
                raise ValueError(
                    f"Unit {unit['index']} {unit.get('Name', '')!r}: "
                    f"unexpected {output_key}={output_value} without {ini_key}"
                )
        # The projectile type is a channel fact of its own, carried whether or not the record
        # states a strength for it.
        source_type = int(unit.get('RangedType', 0) or 0)
        if source_type > 0 and record.get('ranged_type') is None:
            raise ValueError(
                f"Unit {unit['index']} {unit.get('Name', '')!r}: "
                f"RangedType={source_type} did not reach ranged_type"
            )
        if source_type <= 0 and record.get('ranged_type') is not None:
            raise ValueError(
                f"Unit {unit['index']} {unit.get('Name', '')!r}: "
                f"unexpected ranged_type={record['ranged_type']!r} without RangedType"
            )


def verify_identity_coverage(raw_units, records):
    """Fail generation if source roster identity was inferred, lost, or changed."""
    records_by_template = {record['templateId']: record for record in records}
    for unit in raw_units:
        record = records_by_template.get(unit['index'])
        if record is None:
            continue
        race_int = int(ini_value(unit, 'Race'))
        expected = {
            'templateId': unit['index'],
            'heroTypeId': int(unit['HeroType']) if unit.get('HeroType') else None,
            'isHero': bool(unit.get('HeroType')),
            'baseRace': race_name(race_int, unit_label(unit)),
            'baseFantastic': unit.get('Fantastic', '').strip().lower() == 'yes',
        }
        for field, source_value in expected.items():
            if record.get(field) != source_value:
                raise ValueError(
                    f"Unit {unit['index']} {unit.get('Name', '')!r}: "
                    f"{field}={record.get(field)!r}, expected {source_value!r}"
                )


def main():
    # Resolve every path from the script location so input and both generated
    # outputs are independent of the caller's working directory.
    repo_root = Path(__file__).resolve().parent.parent
    roster_dir = repo_root / 'Unit rosters'
    ini_path = roster_dir / 'Warlord mod unit data' / 'UNITS.INI'
    out_path = roster_dir / 'Warlord mod units.json'
    js_out_path = repo_root / 'Calculator' / 'units_warlord.js'

    SPECIAL_UNIT_NAMES = {'Floating Island'}

    raw_units = parse_units_ini(ini_path)
    records = [ini_unit_to_record(u) for u in raw_units
               if u.get('CreateOutpost', '').lower() != 'yes'
               and u.get('Name') not in SPECIAL_UNIT_NAMES]
    verify_attack_channel_coverage(raw_units, records)
    verify_identity_coverage(raw_units, records)

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

    # Also emit JS-loadable version consumed by the calculator. Indented like the
    # JSON sibling above so a content search returns matching lines instead of the
    # whole build product.
    with open(js_out_path, 'w', encoding='utf-8') as f:
        f.write('const WARLORD_UNITS_DATA = ')
        json.dump(output, f, indent=2, ensure_ascii=False)
        f.write(';\n')
    print(f"Wrote {js_out_path}")

    from collections import Counter
    cats = Counter(r['category'] for r in records)
    for cat, count in sorted(cats.items()):
        print(f"  {cat}: {count}")


if __name__ == '__main__':
    main()
