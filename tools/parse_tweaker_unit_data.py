#!/usr/bin/env python3
"""Parse tweaker unit data TSV files and convert to JSON format."""

import json
import csv
import sys
from collections import Counter
from pathlib import Path

def parse_ranged_type(ranged_type_str: str) -> dict:
    """Parse the DOS shared ranged/throw/breath/gaze type."""
    result = {}

    if not ranged_type_str or ranged_type_str.strip() == '':
        return result

    ranged_type_str = ranged_type_str.strip()

    # Gaze attacks — not a real ranged attack. The type alone selects which gaze loops run
    # (103 stoning, 105 death, 104 both), and the strength/`Spec_Att_Attrib` pair supplies
    # their magnitudes, so no ability token is emitted for them.
    if 'Death Gaze' in ranged_type_str:
        result['ranged_type'] = 'Gaze(Death)'
        result['is_gaze'] = True
        return result
    elif 'Stoning Gaze' in ranged_type_str:
        result['ranged_type'] = 'Gaze(Stoning)'
        result['is_gaze'] = True
        return result
    elif 'Doom Gaze' in ranged_type_str or 'Multiple Gaze' in ranged_type_str:
        result['ranged_type'] = 'Gaze(Multiple)'
        result['is_gaze'] = True
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

# Exact mapping of Immunities-column tokens to canonical ability names.
# Matched exactly (not by substring): every distinct token in the source must
# appear here, or it will be reported as unmatched.
IMMUNITY_MAP = {
    'Missiles Imm':  'Missile Immunity',
    'Magic Imm':     'Magic Immunity',
    'Death Imm':     'Death Immunity',
    'Poison Imm':    'Poison Immunity',
    'Stoning Imm':   'Stoning Immunity',
    'Fire Imm':      'Fire Immunity',
    'Cold Imm':      'Cold Immunity',
    'Illusions Imm': 'Illusion Immunity',
}

def parse_immunities(immunities_str: str) -> list:
    """Parse immunities string into list of ability names (exact match)."""
    result = []

    if not immunities_str or immunities_str.strip() == '':
        return result

    immunities = [x.strip() for x in immunities_str.split(',') if x.strip()]

    for immunity in immunities:
        if immunity in IMMUNITY_MAP:
            result.append(IMMUNITY_MAP[immunity])

    return result

# Consumers of the Gaze/Poison column, which is the DOS record's single `Spec_Att_Attrib`
# byte (+0x15). Every entry below reads that same byte, so a unit can carry at most one
# magnitude however many of these it has — Chaos Spawn, the only roster unit with two, is
# why its stoning and death modifiers are always equal.
#
# They are emitted as **bare flag tokens**. The magnitude is written once, to
# `spec_att_attrib`, and each consumer's gate is the flag's presence; emitting the value per
# effect would restate the byte and let the copies disagree. The column is only a
# *presentation* of the byte — the Tweaker pre-negates it for the save-modifier consumers
# and leaves the count/magnitude consumers positive — which is why `spec_att_attrib` stores
# the unsigned magnitude and each consumer applies its own sign.
#
# A blank column with the token present means the flag is set and the byte is 0 — Spearmen
# carry `Regeneration` with no value. It does not mean 1.
#
# The gazes are absent deliberately: `ranged_type` selects them (103/104/105) and the shared
# strength slot carries Doom's damage, so they need no token at all.
NUMERIC_ABILITIES = {
    'Poison attack':       'Poison Touch',
    'Life Stealing':       'Life Steal',
    'Stoning Touch':       'Stoning Touch',
    'Holy Bonus':          'Holy Bonus',
    'Resistance to All':   'Resistance to All',
    'Regeneration':        'Regeneration',
}

TOKEN_RENAMES = {
    'Cause Fear Spell': 'Cause Fear',
    'Flying': 'Flight',
    'Flyer': 'Flight',
    'Fire Ball Spell': 'Fireball Spell',
    'Summon Demons 1': 'Summon Demons Spell',
    'Weapon Imm': 'Weapon Immunity',
    'Automatic Damage': 'Doom',
    # The DOS source spells this out; the modern rosters and the ability def both call it
    # `Illusion`. Kept verbatim it matched nothing, so the Phantoms lost the ability.
    'Illusionary attack': 'Illusion',
}

TOKEN_DISCARD = {
    'Standard',
    'Summon Demons 2',
    'Simultaneous Damage COMBAT',
}

# Relevant tokens that are intentionally passed through verbatim (no rename
# needed). Listed here so they count as "matched" and stay out of the
# unmatched-token report.
EXPLICIT_KEEP = {
    'Caster 20 MP', 'Caster 40 MP', 'Doombolt Spell', 'Healing Spell',
    'Immolation', 'Lucky', 'Web Spell',          # Attributes column
    'Armor Piercing', 'First Strike', 'Dispel Evil',  # Attacks column
}

def parse_attributes(attributes_str: str) -> list:
    """Parse attributes string into list."""
    if not attributes_str or attributes_str.strip() == '':
        return []

    attributes = [x.strip() for x in attributes_str.split(',') if x.strip()]
    return attributes

# Exact mapping of Abilities-column tokens to canonical ability names.
# Most map to themselves; a couple are renamed (e.g. Summoned Unit -> Fantastic).
# Tokens NOT listed here are passed through verbatim AND surfaced in the
# unmatched-token report (see KNOWN_SOURCE_TOKENS).
ABILITY_MAP = {
    'Healer':              'Healer',
    'Purify':              'Purify',
    'Invisibility':        'Invisibility',
    'Wind Walking':        'Wind Walking',
    'Large Shield':        'Large Shield',
    'Long Range':          'Long Range',
    'Meld With Node':      'Meld With Node',
    'Non Corporeal':       'Non Corporeal',
    'Plane Shift':         'Plane Shift',
    'Create Outpost':      'Create Outpost',
    'Create Undead':       'Create Undead',
    'Wall Crusher':        'Wall Crusher',
    'Regeneration':        'Regeneration',
    'Negate First Strike': 'Negate First Strike',
    'Summoned Unit':       'Fantastic',
}

def parse_abilities(abilities_str: str) -> list:
    """Parse abilities string into list of ability names (exact match)."""
    if not abilities_str or abilities_str.strip() == '':
        return []

    abilities = [x.strip() for x in abilities_str.split(',') if x.strip()]

    # Normalize ability names by exact lookup; unknown tokens pass through verbatim.
    normalized = [ABILITY_MAP.get(ability, ability) for ability in abilities]

    # Remove duplicates while preserving order
    seen = set()
    result = []
    for ability in normalized:
        if ability not in seen:
            seen.add(ability)
            result.append(ability)

    return result


# Every source token recognized by some filter. A token from the Immunities /
# Attributes / Abilities / Attacks columns that is NOT in this set is reported
# as unmatched so the roster data can be audited (the report should contain only
# combat-irrelevant tags).
KNOWN_SOURCE_TOKENS = (
    set(IMMUNITY_MAP)
    | set(ABILITY_MAP)
    | set(TOKEN_RENAMES)
    | set(TOKEN_DISCARD)
    | set(NUMERIC_ABILITIES)
    | EXPLICIT_KEEP
)


def collect_unmatched(row, counter):
    """Record raw Immunities/Attributes/Abilities/Attacks tokens that no filter recognizes."""
    for col in ('Immunities', 'Attributes', 'Abilities', 'Attacks'):
        for token in (row.get(col, '') or '').split(','):
            token = token.strip()
            if token and token not in KNOWN_SOURCE_TOKENS:
                counter[token] += 1


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

def process_unit_file(input_file: Path):
    """Process a single unit data file.

    Returns (units, unmatched) where unmatched is a Counter of raw source tokens
    that matched no filter.
    """
    units = {}
    unmatched = Counter()
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

            collect_unmatched(row, unmatched)

            # Nr is the source `_UNITS[]` template index. Picker ids are intentionally
            # independent because excluded rows (Settlers) make the generated sequence
            # diverge from that index. In the DOS roster the first 35 templates are the
            # persistent hero slots, so their source index is also the Hero_Slot value.
            template_id = parse_int(row.get('Nr', ''), -1)
            if template_id < 0:
                raise ValueError(f"Unit {row.get('UnitName', '')!r} has no valid Nr template id")
            is_hero = template_id <= 34
            base_race = row.get('Race', '').strip()
            source_abilities = [
                token.strip() for token in (row.get('Abilities', '') or '').split(',')
                if token.strip()
            ]

            unit = {
                'id': unit_id,
                'templateId': template_id,
                'heroTypeId': template_id if is_hero else None,
                'isHero': is_hero,
                'baseRace': base_race,
                'baseFantastic': 'Summoned Unit' in source_abilities,
                'name': row.get('UnitName', '').strip(),
                'race': base_race,
                'category': base_race,
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
            is_gaze = ranged_info.get('is_gaze', False)
            if is_gaze:
                # The shared DOS strength/type pair on the roster record is the whole gaze:
                # the type selects the loops and the strength carries Doom's damage.
                unit['ranged_type'] = ranged_info['ranged_type']
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
            has_byte_consumer = is_gaze
            for token in all_tokens:
                if token in TOKEN_DISCARD:
                    continue

                token = TOKEN_RENAMES.get(token, token)

                # Byte consumers are emitted as bare flags: the magnitude lives once in
                # `spec_att_attrib` and the calculator's DOS card reads it from there.
                if token in NUMERIC_ABILITIES:
                    has_byte_consumer = True
                    entry = NUMERIC_ABILITIES[token]
                else:
                    entry = token

                if entry not in seen:
                    seen.add(entry)
                    final_abilities.append(entry)

            # The record's own `Spec_Att_Attrib` byte, unsigned. Emitted whenever any consumer
            # is present, including at magnitude 0, since flag-set-at-0 and flag-absent are
            # different states. Consumers negate it themselves where they need a modifier.
            # Gazes count: they carry no flag, but the byte is still their save modifier.
            if has_byte_consumer:
                unit['spec_att_attrib'] = abs(gaze_poison_val) if gaze_poison_val is not None else 0

            if is_hero:
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
                expected_identity = {
                    'templateId': template_id,
                    'heroTypeId': template_id if is_hero else None,
                    'isHero': is_hero,
                    'baseRace': base_race,
                    'baseFantastic': 'Summoned Unit' in source_abilities,
                }
                for field, source_value in expected_identity.items():
                    if unit.get(field) != source_value:
                        raise ValueError(
                            f"Unit {template_id} {unit['name']!r}: {field}="
                            f"{unit.get(field)!r}, expected {source_value!r}"
                        )
                units[str(unit_id)] = unit
                unit_id += 1

    # Prefix race to name for units with non-unique names
    name_counts = Counter(u['name'] for u in units.values())
    for unit in units.values():
        if name_counts[unit['name']] > 1:
            unit['name'] = f"{unit['race']} {unit['name']}"

    return units, unmatched

def get_output_filename(input_file: Path) -> str:
    """Generate output filename based on input filename."""
    # Remove .txt and append .json
    base_name = input_file.stem
    return f"{base_name}.json"

# Source files whose parsed data is also emitted as a JS const consumed by the
# calculator (Calculator/<file>). Maps input filename -> (js filename, const name).
# MoM 1.60 has no entry: the app uses the MoM 1.31 dataset for both MoM versions.
JS_OUTPUTS = {
    'MoM 1.31 unit data.txt': ('units_mom.js', 'MOM_UNITS_DATA'),
    'CoM 6.08 unit data.txt': ('units_com.js', 'COM_UNITS_DATA'),
}


def main():
    current_dir = Path('.')
    # Calculator dir resolved from this script's location so JS output lands
    # correctly regardless of the working directory.
    calculator_dir = Path(__file__).resolve().parent.parent / 'Calculator'

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
            units, unmatched = process_unit_file(input_file)

            output_file = Path(get_output_filename(input_file))

            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(units, f, indent=2)

            print(f"  OK: Parsed {len(units)} units")
            print(f"  OK: Output written to {output_file}")

            js_target = JS_OUTPUTS.get(input_file.name)
            if js_target:
                js_name, const_name = js_target
                js_path = calculator_dir / js_name
                with open(js_path, 'w', encoding='utf-8') as f:
                    f.write(f'const {const_name} = ')
                    json.dump(units, f, ensure_ascii=False)
                    f.write(';\n')
                print(f"  OK: JS written to {js_path}")
            if unmatched:
                print(f"  Unmatched source tags ({len(unmatched)}) "
                      f"— verify these are all combat-irrelevant:")
                for token, count in sorted(unmatched.items()):
                    print(f"      {count:3}x  {token!r}")
            else:
                print("  No unmatched source tags.")
        except Exception as e:
            print(f"  ERROR: processing {input_file}: {e}")
            continue

    print("\nDone!")

if __name__ == '__main__':
    main()
