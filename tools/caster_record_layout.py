"""Delphi-aligned byte layouts for Caster.exe's records, from the CAS headers.

Reconstructs the in-memory layout of `unitT` and `WizardT` by laying out the
declarations in `Reference docs/Script source/CAS reference/Typedec.pas` under
Delphi's default alignment, giving an offset -> field-name map that
`annotate_caster_disasm.py` uses to name memory operands.

Run with no arguments to self-test against the offsets already read out of the
executable:

    caster_record_layout.py

`unitT` is trustworthy: it computes to exactly 1,924 bytes = 0x1E1 dwords -- the
record stride the code multiplies by -- and reproduces all 39 field offsets read
directly from the binary.

`WizardT` is NOT, without correction. Everything from `Retorts` onward sits
**8 bytes later** in the binary than the declaration computes, on two
independent anchors (Retorts ids 6/8 at +0x21/+0x23; GlobalEnchantments
element-0 at 0x89AF3). The shipped headers are a minor version behind the
binary -- SharedConstants.pas declares VERSION '1.05.00' where the executable is
1.05.11 -- and something ahead of `Retorts`, most plausibly
`Books : array[1..MaxRealm]`, is two integers longer than declared. Consumers
must apply WIZARD_DRIFT; see annotate_caster_disasm.py.
"""

# (name, kind, count) -- kind drives size/alignment
B, W, D = 1, 2, 4
WIZARD_SIZE = 0x32997 * 8

ITEMT = [
    ('name', 'str30', 1), ('spellcharge', D, 1), ('chargeamount', D, 1),
    ('it', D, 1), ('icon', D, 1), ('named', B, 1),
    ('powers', B, 150), ('PLACEHOLDER', B, 44),
]

ATTACKFLAGS = [
    ('doom', B, 1), ('illusion', B, 1), ('supernatural', B, 1),
    ('armorpiercing', B, 1), ('mysticsurge', B, 1),
    ('lifesteal', B, 1), ('poison', B, 1), ('destruction', B, 1),
    ('stoningtouch', B, 1), ('deathtouch', B, 1), ('exorcise', B, 1),
    ('lifestealvalue', D, 1), ('poisonvalue', D, 1), ('destructionvalue', D, 1),
    ('stoningtouchvalue', D, 1), ('deathtouchvalue', D, 1), ('exorcisevalue', D, 1),
    ('placeholder', D, 10),
]

UNITT = [
    ('name', 'str30', 1),
    ('attack', D, 1), ('ranged', D, 1), ('rangedtype', D, 1), ('thrown', D, 1),
    ('firebreath', D, 1), ('lightningbreath', D, 1),
    ('deathgaze', D, 1), ('stoninggaze', D, 1), ('doomgaze', D, 1),
    ('maxammo', D, 1), ('ammo', D, 1),
    ('hitchance', D, 1), ('defendchance', D, 1),
    ('hitchancethrown', D, 1), ('hitchancebreath', D, 1),
    ('hitchancemelee', D, 1), ('hitchanceranged', D, 1),
    ('defense', D, 1), ('resistance', D, 1),
    ('expvalue', D, 1), ('goldupkeep', D, 1), ('manaupkeep', D, 1),
    ('foodupkeep', D, 1), ('race', D, 1), ('hp', D, 1), ('scouting', D, 1),
    ('figures', D, 1), ('roadbuilding', D, 1), ('savemodifier', D, 1),
    ('rqbuilding', D, 3), ('famerequirement', D, 1), ('laircost', D, 1),
    ('productioncost', D, 1),
    ('aigroupingpriority', D, 1), ('aiproductionpriority', D, 1),
    ('aigarrisonpriority', D, 1), ('sound', W, 1),
    ('Sailing', B, 1), ('Waterwalking', B, 1), ('flying', B, 1),
    ('teleporting', B, 1), ('forester', B, 1), ('mountaineer', B, 1),
    ('merging', B, 1),
    ('Fireimmunity', B, 1), ('stoningimmunity', B, 1), ('missileImmunity', B, 1),
    ('illusionimmunity', B, 1), ('coldimmunity', B, 1), ('magicimmunity', B, 1),
    ('deathimmunity', B, 1), ('poisonimmunity', B, 1), ('weaponimmunity', B, 1),
    ('transport', B, 1), ('Lucky', B, 1),
    ('Displayrace', B, 1), ('immolation', B, 1), ('fear', B, 1),
    ('Fantastic', B, 1), ('LargeShield', B, 1), ('Planeshifting', B, 1),
    ('wallcrusher', B, 1), ('healer', B, 1), ('createoutpost', B, 1),
    ('invisible', B, 1), ('createundead', B, 1),
    ('longrange', B, 1), ('quickcasting', B, 1), ('meld', B, 1),
    ('noncorporeal', B, 1), ('windwalking', B, 1), ('purify', B, 1),
    ('negatefirststrike', B, 1),
    ('firststrike', B, 1), ('lightningresist', B, 1), ('healingaura', B, 1),
    ('bloodsucker', B, 1),
    ('ishero', B, 1),
    ('equip', 'ItemT', 3),
    ('Spellability', W, 1), ('maxcharges', B, 1), ('chargesleft', B, 1),
    ('ResistToAll', B, 1), ('HolyBonus', B, 1), ('regeneration', B, 1),
    ('attackflags', 'AttackFlagsT', 1), ('meleeflags', 'AttackFlagsT', 1),
    ('rangedflags', 'AttackFlagsT', 1),
    ('overlandx', D, 1), ('overlandy', D, 1),
    ('otherplanex', D, 1), ('otherplaney', D, 1),
    ('overlandtox', D, 1), ('overlandtoy', D, 1),
    ('combattox', D, 1), ('combattoy', D, 1),
    ('disembarktox', D, 1), ('disembarktoy', D, 1),
    ('settlertox', D, 1), ('settlertoy', D, 1),
    ('plane', D, 1),
    ('overlandmaxmoves', D, 1), ('overlandmovesleft', D, 1),
    ('cox', D, 1), ('coy', D, 1), ('unused1', D, 1),
    ('unused2', B, 1), ('unused3', B, 1), ('unused4', B, 1), ('unused5', B, 1),
    ('combatmaxmoves', W, 1), ('combatmovesleft', W, 1),
    ('overlandcommand', B, 1), ('level', B, 1), ('experience', W, 1),
    ('Totaldamage', W, 1), ('Irrecoverabledamage', W, 1),
    ('Undeaddamage', W, 1), ('Overdamage', W, 1),
    ('foughtalready', B, 1),
    ('EnchantmentFlags', B, 100), ('OverlandEnchantmentFlags', B, 100),
    ('CombatEnchantmentFlags', B, 100), ('ItemEnchantmentFlags', B, 100),
    ('owner', B, 1), ('combatattacksdone', B, 1), ('PandoraBoxBudget', W, 1),
    ('dead', B, 1), ('fleeing', B, 1), ('undeaded', B, 1),
    ('irrecoverable', B, 1), ('incombat', B, 1),
    ('bonushp', W, 1), ('goldhp', W, 1), ('maxmp', W, 1), ('mp', W, 1),
    ('suppression', W, 1), ('unittype', W, 1), ('herotype', W, 1),
    ('webleft', B, 1), ('confusioneffect', B, 1),
    ('combatsummoned', B, 1), ('laircontent', B, 1), ('stasisnextturn', B, 1),
    ('ainotdone', B, 1), ('AIstayBehindWalls', B, 1), ('Aicombatwaiting', B, 1),
    ('Neutrallock', B, 1),
    ('attackbonus', W, 1), ('defensebonus', W, 1), ('resistancebonus', W, 1),
    ('rangedbonus', W, 1),
    ('attackpenal', W, 1), ('defensepenal', W, 1), ('resistancepenal', W, 1),
    ('rangedpenal', W, 1),
    ('stopmove', B, 1),
    ('egoism', B, 1), ('darkforce', B, 1), ('amplifier', B, 1), ('stealth', B, 1),
    ('custom', D, 20),
    ('ignorepact', B, 1), ('multihead', B, 1), ('createpower', B, 1),
    ('lairinvalid', B, 1), ('rampageinvalid', B, 1),
    ('counterimmunity', B, 1), ('nohealing', B, 1),
    ('eotheal', B, 1), ('eothealperc', B, 1),
    ('PLACEHOLDER', B, 86),
]

SUB = {'ItemT': ITEMT, 'AttackFlagsT': ATTACKFLAGS}


def measure(fields):
    """-> (size, align, [(path, offset, elemsize, count)]) for one record."""
    off, maxalign, flat = 0, 1, []
    for name, kind, count in fields:
        if kind == 'str30':
            esize, ealign, inner = 31, 1, None
        elif kind in SUB:
            esize, ealign, inner = measure(SUB[kind])[:2] + (SUB[kind],)
        else:
            esize = ealign = kind
            inner = None
        maxalign = max(maxalign, ealign)
        off += (-off) % ealign
        flat.append((name, off, esize, count, inner))
        off += esize * count
    off += (-off) % maxalign
    return off, maxalign, flat


def flatten(fields, prefix='', base=0, out=None):
    out = [] if out is None else out
    _size, _al, flat = measure(fields)
    for name, off, esize, count, inner in flat:
        a = base + off
        if inner is not None:
            for k in range(count):
                flatten(inner, f'{prefix}{name}[{k+1}].' if count > 1 else f'{prefix}{name}.',
                        a + k * esize, out)
        else:
            out.append((f'{prefix}{name}', a, esize, count))
    return out


def _selftest():
    size, align, _ = measure(UNITT)
    print(f'unitT size = {size} (0x{size:X}) bytes, align {align}; '
          f'expected 1924 = 0x1E1 dwords -> {"OK" if size == 1924 else "MISMATCH"}')
    fl = flatten(UNITT)
    by = {n: (o, s, c) for n, o, s, c in fl}
    # Offsets already read out of the executable, from CoM2 binary analysis.md
    # and Units.RecalculateUnits.pas.
    expect = {
        'attack': 0x20, 'ranged': 0x24, 'rangedtype': 0x28, 'thrown': 0x2C,
        'firebreath': 0x30, 'lightningbreath': 0x34, 'deathgaze': 0x38,
        'stoninggaze': 0x3C, 'doomgaze': 0x40, 'maxammo': 0x44,
        'hitchance': 0x4C, 'defendchance': 0x50, 'hitchancethrown': 0x54,
        'hitchancebreath': 0x58, 'hitchancemelee': 0x5C, 'hitchanceranged': 0x60,
        'defense': 0x64, 'resistance': 0x68, 'race': 0x7C, 'Fantastic': 0xCF,
        'overlandx': 0x4AC, 'overlandy': 0x4B0, 'plane': 0x4DC,
        'combatmaxmoves': 0x4F8, 'EnchantmentFlags': 0x509,
        'OverlandEnchantmentFlags': 0x56D, 'CombatEnchantmentFlags': 0x5D1,
        'ItemEnchantmentFlags': 0x635, 'owner': 0x699, 'PandoraBoxBudget': 0x69C,
        'dead': 0x69E, 'incombat': 0x6A2, 'unittype': 0x6AE,
        'confusioneffect': 0x6B3, 'combatsummoned': 0x6B4,
        # The analysis doc calls these "the four penalty display words"; in
        # Typedec order that is the *penal* group, not the *bonus* group.
        'attackpenal': 0x6C4, 'defensepenal': 0x6C6, 'resistancepenal': 0x6C8,
        'rangedpenal': 0x6CA,
    }
    bad = 0
    for n, want in sorted(expect.items(), key=lambda kv: kv[1]):
        got = by.get(n, (None,))[0]
        if not got == want:
            bad += 1
            print(f'  MISMATCH {n}: computed 0x{got:X}, executable 0x{want:X}')
    print(f'unitT: {len(expect) - bad}/{len(expect)} executable-read offsets '
          f'reproduced')

    wsize, walign, _ = measure(WIZARDT)
    print(f'\nWizardT size = {wsize} (0x{wsize:X}) bytes, align {walign}; '
          f'expected {WIZARD_SIZE} = 0x32997 * 8 -> '
          f'{"OK" if wsize == WIZARD_SIZE else "MISMATCH"}')
    wl = {n: o for n, o, s, c in flatten(WIZARDT)}
    print(f'\nWizardT drift check (expect a constant +{WIZARD_DRIFT}):')
    for label, computed, read in (
            ('Retorts[6] Tactician', wl['Retorts'] + 5, 0x21),
            ('Retorts[8] Guardian', wl['Retorts'] + 7, 0x23),
            ('GlobalEnchantments[0]', wl['GlobalEnchantments'] - 1, 0x89AF3)):
        d = read - computed
        flag = 'OK' if d == WIZARD_DRIFT else f'UNEXPECTED (+{d})'
        print(f'  {label:<22} computed 0x{computed:X}, executable 0x{read:X}  {flag}')
    corrected = wizard_flat()
    corrected_end = max(o + s * c for _n, o, s, c in corrected)
    print(f'  corrected binary extent 0x{corrected_end:X}; '
          f'expected 0x{WIZARD_SIZE:X}  '
          f'{"OK" if corrected_end == WIZARD_SIZE else "MISMATCH"}')


# ---------------------------------------------------------------- WizardT ---
DIPLOMACY = [
    ('Hostility', D, 1), ('HostilityTimer', D, 1), ('StartingRelation', D, 1),
    ('Relation', D, 1), ('HiddenRelation', D, 1),
    ('HistiRelation', D, 10001),
    ('PeaceCounter', D, 1), ('TreatyCounter', D, 1), ('NoComplainCounter', D, 1),
    ('Treaty', D, 1), ('Contact', B, 1), ('Greeting', B, 1),
    ('TreatyInt', D, 1), ('PeaceInt', D, 1), ('TradeInt', D, 1),
    ('ReactionStrength', D, 1), ('ReactionType', D, 1),
    ('ReactionParam1', D, 1), ('ReactionParam2', D, 1),
    ('LastBrokenTreaty', D, 1), ('RejectOfferType', D, 1),
    ('RejectOfferParam1', D, 1), ('RejectOfferParam2', D, 1),
    ('LastSpellTributed', D, 1), ('WarningCounter', D, 1),
    ('Escalatedwarning', B, 1), ('SpellTradeList', D, 4), ('PactWarnings', D, 1),
    ('LootedSpell', B, 1), ('Extortedspell', B, 1), ('WarStarted', B, 1),
    ('EscalationBrokenTreaty', B, 1), ('PLACEHOLDER', B, 148),
]

WIZARDT = [
    ('Books', D, 5), ('Retorts', B, 18), ('Name', 'str30', 1),
    ('Portrait', D, 1), ('Personality', D, 1), ('Objective', D, 1),
    ('PrimaryRealm', D, 1), ('FortressCity', D, 1), ('CircleCity', D, 1),
    ('banished', B, 1), ('defeated', B, 1), ('Treecast', B, 1),
    ('StartingRace', D, 1), ('Flagcolor', D, 1),
    ('SP', D, 1), ('Mana', D, 1), ('Gold', D, 1), ('Fame', D, 1),
    ('TaxRate', D, 1), ('PDMana', D, 1), ('PDRes', D, 1), ('PDSkill', D, 1),
    ('Diplomacy', 'DiplomacyT', 14),
    ('GlobalEnchantments', B, 100),
    ('SomCost', D, 1), ('Spells', D, 400), ('RPSpent', D, 400),
    ('PowerLinkGain', D, 1),
    ('MPtoget', D, 1), ('sptoget', D, 1), ('rptoget', D, 1), ('goldtoget', D, 1),
    ('Hero', D, 85 * 50), ('HeroState', D, 85), ('HeroName', 'str30', 85),
    ('Vault', 'ItemT', 8), ('CreatingItem', 'ItemT', 1),
    ('HistorianPop', D, 10001), ('HistorianMili', D, 10001),
    ('HistorianPower', D, 10001), ('HistorianSpell', D, 10001),
    ('HistorianTotal', D, 10001),
    ('HistorianPopRate', D, 10001), ('HistorianMiliRate', D, 10001),
    ('HistorianPowerRate', D, 10001), ('HistorianSpellRate', D, 10001),
    ('HistorianTotalRate', D, 10001),
    ('Combatskill', D, 1), ('Overlandskill', D, 1),
    ('CurrentResearch', D, 1), ('CurrentCasting', D, 1),
    ('OverlandSlider', D, 1), ('CombatSlider', D, 1),
    ('OverlandSpellEffectiveCost', D, 1),
    ('ResearchDone', D, 1), ('CastingDone', D, 1),
    ('SpellBindingCooldown', D, 1), ('SpellBindingUses', D, 1),
    ('PowerDistributionTimer', D, 1), ('PDStrategy', D, 1),
    ('MainActionContinent', D, 2),
    ('Notargetoncontinentreevaluatetimer', D, 2 * 10000),
    ('WantToLeave', D, 2 * 10000),
    ('AISoMCounter', D, 1), ('Frontiercity', D, 1),
    ('AISummoncycle', D, 1), ('AINofshippoints', D, 2),
    ('AIShippointX', D, 2 * 500), ('AIShippointY', D, 2 * 500),
    ('MonsterTimer', D, 1), ('EliminationTurns', D, 1),
    ('GRares', D, 20), ('Custom', D, 100),
    ('PLACEHOLDER', B, 499988),
]

SUB['DiplomacyT'] = DIPLOMACY

# Everything from `Retorts` onward sits this many bytes later in the 1.05.11
# binary than the shipped 1.05.00 declaration computes. See the module
# docstring; anchored on three executable reads, checked by _selftest().
WIZARD_DRIFT = 8


def wizard_flat():
    """WizardT offset map with the binary's drift applied.

    The declared record already has the executable's total stride, so the
    eight bytes inserted before Retorts must be recovered from the trailing
    reserved area.  Shorten that area by the same amount to keep the corrected
    map inside one wizard record.
    """
    out = []
    for n, o, s, c in flatten(WIZARDT):
        if o >= 0x14:
            o += WIZARD_DRIFT
        if n == 'PLACEHOLDER':
            c -= WIZARD_DRIFT
        out.append((n, o, s, c))
    return out


if __name__ == '__main__':
    _selftest()
