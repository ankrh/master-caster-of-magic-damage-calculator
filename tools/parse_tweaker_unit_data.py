#!/usr/bin/env python3
"""Parse tweaker unit data TSV files and convert to JSON format."""

import json
import csv
import sys
from collections import Counter
from pathlib import Path

def parse_ranged_type(ranged_type_str: str) -> dict:
    """Parse ranged type string into ranged_type, breath fields, or gaze ability name."""
    result = {}

    if not ranged_type_str or ranged_type_str.strip() == '':
        return result

    ranged_type_str = ranged_type_str.strip()

    # Gaze attacks — not a real ranged attack; value comes from Gaze/Poison column
    if 'Death Gaze' in ranged_type_str:
        result['gaze_ability'] = 'Death Gaze'
        return result
    elif 'Stoning Gaze' in ranged_type_str:
        result['gaze_ability'] = 'Stoning Gaze'
        return result
    elif 'Doom Gaze' in ranged_type_str:
        result['gaze_ability'] = 'Doom Gaze'
        return result
    elif 'Multiple Gaze' in ranged_type_str:
        result['gaze_ability'] = 'Multiple Gaze'
        return result

    # Breath attack types (no magic school prefix)
    if 'Fire Breath' in ranged_type_str:
        result['breath_type'] = 'fire'
        return result
    if 'Lightning Breath' in ranged_type_str:
        result['breath_type'] = 'lightning'
        return result
    # Ranged types — check magic school name first
    if 'Chaos' in ranged_type_str:
        result['ranged_type'] = 'Magic(C)'
    elif 'Nature' in ranged_type_str:
        result['ranged_type'] = 'Magic(N)'
    elif 'Sorcery' in ranged_type_str:
        result['ranged_type'] = 'Magic(S)'
    elif 'Arrow' in ranged_type_str or 'Bullet' in ranged_type_str:
        result['ranged_type'] = 'Missile'
    elif 'Thrown Weapons' in ranged_type_str:
        result['ranged_type'] = 'thrown'
    elif 'Rock' in ranged_type_str:
        result['ranged_type'] = 'Boulder'
    elif 'Illusion' in ranged_type_str:
        result['ranged_type'] = 'Magic(I)'

    return result

def parse_immunities(immunities_str: str) -> list:
    """Parse immunities string into list of ability names."""
    result = []

    if not immunities_str or immunities_str.strip() == '':
        return result

    immunities = [x.strip() for x in immunities_str.split(',') if x.strip()]

    for immunity in immunities:
        if 'Missiles' in immunity:
            result.append('Missile Immunity')
        elif 'Magic' in immunity:
            result.append('Magic Immunity')
        elif 'Death' in immunity:
            result.append('Death Immunity')
        elif 'Poison' in immunity:
            result.append('Poison Immunity')
        elif 'Stoning' in immunity:
            result.append('Stoning Immunity')
        elif 'Weapon' in immunity:
            result.append('Weapon Immunity')

    return result

# Abilities that take their numeric value from the Gaze/Poison column.
# These are emitted as 'AbilityName=<raw gaze_poison value>' in the final list.
# 'Multiple Gaze' is handled separately — it expands into three gaze abilities.
NUMERIC_ABILITIES = {
    'Poison attack':       'Poison Touch',
    'Life Stealing':       'Life Steal',
    'Stoning Touch':       'Stoning Touch',
    'Holy Bonus':          'Holy Bonus',
    'Resistance to All':   'Resistance to All',
    'Death Gaze':          'Death Gaze',
    'Stoning Gaze':        'Stoning Gaze',
    'Doom Gaze':           'Doom Gaze',
    'Regeneration':        'Regeneration',
}

TOKEN_RENAMES = {
    'Cause Fear Spell': 'Cause Fear',
    'Flying': 'Flight',
    'Flyer': 'Flight',
    'Fire Ball Spell': 'Fireball Spell',
    'Summon Demons 1': 'Summon Demons Spell',
    'Weapon Imm': 'Weapon Immunity',
}

TOKEN_DISCARD = {
    'Standard',
    'Summon Demons 2',
    'Simultaneous Damage COMBAT',
}

def parse_attributes(attributes_str: str) -> list:
    """Parse attributes string into list."""
    if not attributes_str or attributes_str.strip() == '':
        return []

    attributes = [x.strip() for x in attributes_str.split(',') if x.strip()]
    return attributes

def parse_abilities(abilities_str: str) -> list:
    """Parse abilities string into list of ability names."""
    if not abilities_str or abilities_str.strip() == '':
        return []

    abilities = [x.strip() for x in abilities_str.split(',') if x.strip()]

    # Normalize ability names
    normalized = []
    for ability in abilities:
        if 'Healer' in ability:
            normalized.append('Healer')
        elif 'Purify' in ability:
            normalized.append('Purify')
        elif 'Invisibility' in ability:
            normalized.append('Invisibility')
        elif 'Wind Walking' in ability:
            normalized.append('Wind Walking')
        elif 'Illusionary' in ability:
            normalized.append('Illusion')
        elif 'Life Stealing' in ability:
            normalized.append('Life Steal')
        elif 'Armor Piercing' in ability:
            normalized.append('Armor Piercing')
        elif 'First Strike' in ability:
            normalized.append('First Strike')
        elif 'Flying' in ability or 'Flyer' in ability:
            normalized.append('Flight')
        elif 'Large Shield' in ability:
            normalized.append('Large Shield')
        elif 'Negate First Strike' in ability:
            normalized.append('Negate First Strike')
        elif 'Create Outpost' in ability:
            normalized.append('Create Outpost')
        elif 'Wall Crusher' in ability:
            normalized.append('Wall Crusher')
        elif 'Fire Ball Spell' in ability:
            normalized.append('Fireball Spell')
        elif 'Cause Fear' in ability:
            normalized.append('Cause Fear')
        elif 'Summoned Unit' in ability:
            normalized.append('Fantastic')
        else:
            normalized.append(ability)

    # Remove duplicates while preserving order
    seen = set()
    result = []
    for ability in normalized:
        if ability not in seen:
            seen.add(ability)
            result.append(ability)

    return result


def parse_int(val, default=0):
    """Safely parse integer from string, handling whitespace and floats."""
    if not val or not val.strip():
        return default
    try:
        # Try parsing as float first (for fields like "2.0"), then convert to int
        float_val = float(val.strip())
        return int(float_val)
    except ValueError:
        return default

def process_unit_file(input_file: Path) -> dict:
    """Process a single unit data file and return parsed units."""
    units = {}
    unit_id = 1
    # In CoM the Dispel Evil spell/ability was renamed to Exorcise (save -1, hits any
    # fantastic creature; created-undead suffer an additional -3). The CoM 6.08 tweaker
    # export still uses the legacy MoM label, so translate it here. MoM files keep
    # "Dispel Evil" untouched.
    is_com = 'CoM' in input_file.name

    with open(input_file, 'r', encoding='utf-8') as f:
        # Read TSV file, skipping the header row
        reader = csv.DictReader(f, delimiter='\t')

        for row in reader:
            # Skip empty rows
            if not any(row.values()):
                continue

            unit = {
                'id': unit_id,
                'name': row.get('UnitName', '').strip(),
                'race': row.get('Race', '').strip(),
                'category': row.get('Race', '').strip(),
'figures': parse_int(row.get('Fig', '1'), 1),
                'defense': parse_int(row.get('Df', '0')),
                'resist': parse_int(row.get('Re', '0')),
                'hp': parse_int(row.get('Hp', '0')),
                'melee': parse_int(row.get('Me', '0')),
                'ranged': parse_int(row.get('Ra', '0')),
                'to_hit': parse_int(row.get('Th', '0')) * 10,
                'moves': parse_int(row.get('Move', '0'), 0),
                'ammo': parse_int(row.get('Shots', '0')),
            }

            # Parse ranged/breath type
            ranged_info = parse_ranged_type(row.get('RangedType', ''))
            gaze_token = None
            gaze_ranged_val = 0
            if 'gaze_ability' in ranged_info:
                # Gaze attacks are abilities, not ranged attacks; save hidden ranged value
                gaze_token = ranged_info['gaze_ability']
                gaze_ranged_val = unit.pop('ranged', 0)
            elif 'ranged_type' in ranged_info:
                if ranged_info['ranged_type'] == 'thrown':
                    unit['thrown_breath_type'] = 'thrown'
                    unit['thrown_breath'] = unit.pop('ranged')
                else:
                    unit['ranged_type'] = ranged_info['ranged_type']
                    if unit['ranged'] == 0:
                        unit.pop('ranged', None)
            elif 'breath_type' in ranged_info:
                unit['thrown_breath_type'] = ranged_info['breath_type']
                unit['thrown_breath'] = unit.pop('ranged')
            else:
                if unit['ranged'] == 0:
                    unit.pop('ranged', None)

            # Remove zero values for these optional fields
            if unit.get('to_hit') == 0:
                unit.pop('to_hit', None)
            if unit.get('moves') == 0:
                unit.pop('moves', None)
            if unit.get('ammo') == 0:
                unit.pop('ammo', None)

            # Collect raw ability tokens from all text columns (+ gaze token from RangedType if present)
            attributes = parse_attributes(row.get('Attributes', ''))
            abilities = parse_abilities(row.get('Abilities', ''))
            immunities = parse_immunities(row.get('Immunities', ''))
            attacks_raw = [x.strip() for x in row.get('Attacks', '').split(',') if x.strip()]
            if gaze_token:
                attacks_raw = [gaze_token] + attacks_raw
                # Hidden gaze ranged attack (physical damage component of the gaze)
                # Not for Doom Gaze or Multiple Gaze (which includes Doom Gaze)
                if gaze_ranged_val > 0 and gaze_token not in ('Doom Gaze', 'Multiple Gaze'):
                    attacks_raw.append(f'Gaze Ranged={gaze_ranged_val}')

            # Read the raw Gaze/Poison value (used only when a numeric ability is found)
            gaze_poison_str = row.get('Gaze/Poison', '').strip()
            gaze_poison_val = None
            if gaze_poison_str:
                try:
                    gaze_poison_val = int(gaze_poison_str)
                except (ValueError, TypeError):
                    pass

            # Build the full flat list, substituting numeric forms where needed.
            # Source order: Attributes, Abilities, Immunities, Attacks
            all_tokens = attributes + abilities + immunities + attacks_raw

            final_abilities = []
            seen = set()
            for token in all_tokens:
                if token in TOKEN_DISCARD:
                    continue

                token = TOKEN_RENAMES.get(token, token)

                # Multiple Gaze expands into three separate gaze abilities
                if 'Multiple Gaze' in token:
                    val = gaze_poison_val
                    for gaze_name, sign in [('Doom Gaze', 1), ('Death Gaze', -1), ('Stoning Gaze', -1)]:
                        entry = f'{gaze_name}={sign * (val if val is not None else 1)}'
                        if entry not in seen:
                            seen.add(entry)
                            final_abilities.append(entry)
                    continue

                # Find if this token matches a numeric ability
                matched_key = None
                for key in NUMERIC_ABILITIES:
                    if key in token:
                        matched_key = key
                        break

                if matched_key is not None:
                    canonical = NUMERIC_ABILITIES[matched_key]
                    entry = f'{canonical}={gaze_poison_val if gaze_poison_val is not None else 1}'
                else:
                    entry = token

                if entry not in seen:
                    seen.add(entry)
                    final_abilities.append(entry)

            if parse_int(row.get('Nr', '-1')) <= 34:
                unit['category'] = 'Heroes'
                if 'Hero' not in final_abilities:
                    final_abilities.insert(0, 'Hero')

            if is_com:
                final_abilities = ['Exorcise=-1' if a == 'Dispel Evil' else a
                                   for a in final_abilities]

            if final_abilities:
                unit['abilities'] = final_abilities

            # Add cost and upkeep if present
            if row.get('Cost'):
                try:
                    cost = int(row.get('Cost'))
                    if cost > 0:
                        unit['cost'] = cost
                except (ValueError, TypeError):
                    pass

            if row.get('Upkeep'):
                try:
                    upkeep = int(row.get('Upkeep'))
                    if upkeep > 0:
                        unit['upkeep'] = upkeep
                except (ValueError, TypeError):
                    pass

            # Only add if unit has a name and is not a Settlers unit
            if unit['name'] and unit['name'] != 'Settlers':
                units[str(unit_id)] = unit
                unit_id += 1

    # Prefix race to name for units with non-unique names
    name_counts = Counter(u['name'] for u in units.values())
    for unit in units.values():
        if name_counts[unit['name']] > 1:
            unit['name'] = f"{unit['race']} {unit['name']}"

    return units

def get_output_filename(input_file: Path) -> str:
    """Generate output filename based on input filename."""
    # Remove .txt and append .json
    base_name = input_file.stem
    return f"{base_name}.json"

def main():
    current_dir = Path('.')

    # Find all unit data txt files
    input_files = [
        Path('CoM 6.08 unit data.txt'),
        Path('MoM 1.31 unit data.txt'),
        Path('MoM 1.60 unit data.txt'),
    ]

    for input_file in input_files:
        if not input_file.exists():
            print(f"Warning: {input_file} not found, skipping")
            continue

        print(f"Processing {input_file}...")

        try:
            units = process_unit_file(input_file)

            output_file = Path(get_output_filename(input_file))

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(units, f, indent=2)

            print(f"  OK: Parsed {len(units)} units")
            print(f"  OK: Output written to {output_file}")
        except Exception as e:
            print(f"  ERROR: processing {input_file}: {e}")
            continue

    print("\nDone!")

if __name__ == '__main__':
    main()
